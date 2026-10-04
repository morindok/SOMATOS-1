import * as THREE from 'three';
import {
  M, MAT, mesh, joint, cap, cyl, sph, box,
  sculptHeadFace, buildMicroStage, type BodyRefs,
} from './humanBuilder';

// ============================================================
// NORA — feminine variant of the SOMATOS-1 body.
// Same joints, same organs, same refs contract as buildBody, so
// animateBody / keyboard control / API keep working unchanged.
// Differences: feminine proportions (narrower waist & shoulders,
// wider hips, gentle mannequin-smooth breast forms), paler skin,
// delicate softened face, long silver hair, golden crescent-moon
// crown, subtly pointed ears. Classical-sculpture read:
// smooth, simplified, tasteful — no explicit anatomy.
// Height 1.70 m, anatomical position, facing +Z.
// Anatomical LEFT = +X (subject faces the viewer, like a patient).
// ============================================================

const NORA_SKIN = 0xecc7a8; // fair, pale, cool
const NORA_HAIR = 0xe8e8f0; // silver-white
const NORA_GOLD = 0xd4af37;
const NORA_GEM = 0x8b5cf6; // violet

const noraSkinMat = () => M(NORA_SKIN, { r: 0.5 });
const hairMat = () => M(NORA_HAIR, { r: 0.32, e: 0x555566, ei: 0.35 });
const goldMat = () => M(NORA_GOLD, { m: 0.9, r: 0.32 });
const gemMat = () => M(NORA_GEM, { e: 0x6d28d9, ei: 0.9, r: 0.25 });

// ---------- feminine face: sculptHeadFace, then soften ----------
// Narrower jaw/chin (gentle V), smaller nose, softer brow,
// subtly fuller lips. UVs from sculptHeadFace are preserved.
function sculptNoraFace(geo: THREE.SphereGeometry, r: number) {
  sculptHeadFace(geo, r);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const g2 = (v: number, s: number) => Math.exp(-(v * v) / (2 * s * s));
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.copy(p).normalize();
    const front = Math.max(0, n.z);
    // narrower, softer jaw → gentle V-shape
    const jawZone = Math.max(0, 1 - Math.abs((p.y + 0.075) / 0.04));
    p.x *= 1 - 0.12 * jawZone * front;
    // smaller, softer nose
    const noseZone = Math.max(0, 1 - Math.abs((p.y + 0.03) / 0.05)) * g2(p.x, 0.016);
    p.z -= 0.007 * noseZone * front;
    // softer brow ridge
    const browZone = Math.max(0, 1 - Math.abs((p.y + 0.005) / 0.025)) * g2(p.x, 0.045);
    p.z -= 0.0025 * browZone * front;
    // subtly fuller lips
    const lipZone = g2(p.y + 0.056, 0.012) * g2(p.x, 0.022);
    p.z += 0.002 * lipZone * front;
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ---------- silver hair strand ----------
function hairStrand(
  parent: THREE.Object3D, pts: THREE.Vector3[], radius: number, id: string,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 8, false), hairMat());
  m.name = id;
  m.userData.system = 'integumentary';
  m.castShadow = true;
  parent.add(m);
  return m;
}

// ============================================================
export function buildNoraBody(scene: THREE.Scene): BodyRefs {
  const refs: BodyRefs = {
    group: new THREE.Group(), joints: new Map(), targets: {},
    heart: null, lungs: [], chest: [], thorax: null, abdomen: null, diaphragm: null, aorta: null, eyes: [],
    micro: new THREE.Group(), microModels: {}, microLabel: null, selected: null, skinMeshes: [], skinBase: [],
    horns: [], motorOffsets: {}, muscle: {},
  };
  const g = refs.group;
  g.name = 'nora_body';
  g.position.y = 0.06; // standing on the dais
  scene.add(g);

  const skin = (parent: THREE.Object3D, geo: THREE.BufferGeometry, x: number, y: number, z: number, id: string) => {
    const m = mesh(parent, geo, noraSkinMat(), x, y, z, id, 'integumentary');
    refs.skinMeshes.push(m);
    refs.skinBase.push({ c: (m.material as THREE.MeshStandardMaterial).color.clone(), r: (m.material as THREE.MeshStandardMaterial).roughness });
    refs.chest.push(m);
    return m;
  };

  // dermis/face textures + iris texture (same patch assets as the base body)
  if (typeof document !== 'undefined') {
    const texLoader = new THREE.TextureLoader();
    const applySkinTexture = (url: string, isFace: boolean) => {
      texLoader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          for (let i = 0; i < refs.skinMeshes.length; i++) {
            const m = refs.skinMeshes[i];
            const isHeadSkin = m.name === 'skin_head';
            if (isFace !== isHeadSkin) continue;
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.map = tex;
            refs.skinBase[i].c.lerp(new THREE.Color(0xffffff), 0.72);
            refs.skinBase[i].r = 0.46;
            mat.color.copy(refs.skinBase[i].c);
            mat.roughness = refs.skinBase[i].r;
            mat.needsUpdate = true;
          }
        },
        undefined,
        () => { /* offline-safe: keep solid shading */ },
      );
    };
    applySkinTexture('textures/face.jpg', true);
    applySkinTexture('textures/skin.jpg', false);
    texLoader.load(
      'textures/eye.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        for (const e of refs.eyes) {
          const em = e as THREE.Mesh;
          const mat = em.material as THREE.MeshStandardMaterial;
          mat.map = tex;
          em.rotation.y = -Math.PI / 2;
          mat.needsUpdate = true;
        }
      },
      undefined,
      () => { /* offline-safe */ },
    );
  }

  // ---------------- PELVIS (root) — wider, feminine ----------------
  const pelvis = joint(g, 'pelvis_root', 0, 0.98, 0, refs);
  mesh(pelvis, sph(0.075), MAT.bone(), 0.095, 0.01, 0, 'bone_pelvis_L', 'skeletal').scale.set(0.7, 1.15, 0.9);
  mesh(pelvis, sph(0.075), MAT.bone(), -0.095, 0.01, 0, 'bone_pelvis_R', 'skeletal').scale.set(0.7, 1.15, 0.9);
  mesh(pelvis, box(0.07, 0.12, 0.05), MAT.bone(), 0, 0.0, -0.055, 'bone_vert_24', 'skeletal'); // sacrum
  mesh(pelvis, sph(0.062), MAT.muscle(), 0.085, -0.01, -0.075, 'muscle_gluteus_maximus_L', 'muscular').scale.set(1, 1.3, 0.85);
  mesh(pelvis, sph(0.062), MAT.muscle(), -0.085, -0.01, -0.075, 'muscle_gluteus_maximus_R', 'muscular').scale.set(1, 1.3, 0.85);
  mesh(pelvis, sph(0.045), MAT.bladder(), 0, -0.03, 0.03, 'organ_bladder', 'urinary').scale.set(1, 1.2, 0.9);
  // smooth, simplified pelvic skin — classical-sculpture read, no detail
  skin(pelvis, cap(0.125, 0.10), 0, 0.0, 0, 'skin_pelvis').scale.set(1.24, 1.02, 1.0);
  mesh(pelvis, cyl(0.006, 0.006, 0.1), MAT.nerve(), 0.06, -0.06, -0.02, 'nerve_femoral_L', 'nervous', false);
  mesh(pelvis, cyl(0.006, 0.006, 0.1), MAT.nerve(), -0.06, -0.06, -0.02, 'nerve_femoral_R', 'nervous', false);

  // ---------------- LUMBAR SPINE — narrower waist ----------------
  const spineL = joint(pelvis, 'spine_L', 0, 0.10, 0, refs);
  for (let i = 0; i < 5; i++) {
    const v = mesh(spineL, cyl(0.026, 0.028, 0.026), MAT.bone(), 0, 0.0 + i * 0.031, -0.045, `bone_vert_${19 + i}`, 'skeletal');
    v.scale.set(1, 1, 1);
    if (i < 4) mesh(spineL, cyl(0.024, 0.024, 0.008), MAT.cartilage(), 0, 0.017 + i * 0.031, -0.045, `disc_L${i + 1}${i + 2}`, 'skeletal', false);
  }
  mesh(spineL, cyl(0.008, 0.008, 0.17), MAT.nerve(), 0, 0.07, -0.045, 'organ_spinal_cord_lumbar', 'nervous', false);
  const abdomenSkin = skin(spineL, cyl(0.132, 0.116, 0.24, 22), 0, 0.05, 0, 'skin_abdomen');
  refs.abdomen = abdomenSkin;
  for (let i = 0; i < 4; i++) {
    mesh(spineL, box(0.055, 0.042, 0.03), MAT.muscle(), 0.033, -0.03 + i * 0.048, 0.125, 'muscle_rectus_abdominis_seg' + i, 'muscular');
    mesh(spineL, box(0.055, 0.042, 0.03), MAT.muscle(), -0.033, -0.03 + i * 0.048, 0.125, 'muscle_rectus_abdominis_segR' + i, 'muscular');
  }
  const oblL = mesh(spineL, cap(0.045, 0.16), MAT.muscleDark(), 0.115, 0.05, 0.02, 'muscle_external_oblique_L', 'muscular');
  oblL.rotation.z = 0.25;
  const oblR = mesh(spineL, cap(0.045, 0.16), MAT.muscleDark(), -0.115, 0.05, 0.02, 'muscle_external_oblique_R', 'muscular');
  oblR.rotation.z = -0.25;
  const kL = mesh(spineL, sph(0.032), MAT.kidney(), 0.075, 0.055, -0.075, 'organ_kidney_L', 'urinary');
  kL.scale.set(0.75, 1.25, 0.7);
  const kR = mesh(spineL, sph(0.032), MAT.kidney(), -0.075, 0.05, -0.075, 'organ_kidney_R', 'urinary');
  kR.scale.set(0.75, 1.25, 0.7);
  mesh(spineL, sph(0.016), MAT.adrenal(), 0.075, 0.105, -0.075, 'organ_adrenal_L', 'endocrine').scale.set(1, 0.6, 0.7);
  mesh(spineL, sph(0.016), MAT.adrenal(), -0.075, 0.10, -0.075, 'organ_adrenal_R', 'endocrine').scale.set(1, 0.6, 0.7);
  const liver = mesh(spineL, sph(0.075), MAT.liver(), -0.045, 0.115, 0.01, 'organ_liver', 'digestive');
  liver.scale.set(1.25, 0.62, 0.95);
  const stom = mesh(spineL, sph(0.042), MAT.stomach(), 0.055, 0.085, 0.045, 'organ_stomach', 'digestive');
  stom.scale.set(0.85, 1.25, 0.8);
  stom.rotation.z = 0.5;
  mesh(spineL, sph(0.028), MAT.spleen(), 0.105, 0.10, -0.03, 'organ_spleen', 'immune').scale.set(0.7, 1.2, 0.6);
  const panc = mesh(spineL, cap(0.016, 0.09), MAT.pancreas(), 0.0, 0.055, 0.02, 'organ_pancreas', 'digestive');
  panc.rotation.z = Math.PI / 2 - 0.15;
  for (let i = 0; i < 4; i++) {
    const coil = mesh(spineL, new THREE.TorusGeometry(0.055 - i * 0.004, 0.016, 10, 22), MAT.gut(), 0, -0.045 + i * 0.036, 0.03, 'organ_intestine_small_coil' + i, 'digestive');
    coil.rotation.x = Math.PI / 2;
    coil.rotation.z = i * 0.5;
  }
  const colon = mesh(spineL, new THREE.TorusGeometry(0.095, 0.02, 10, 26, Math.PI * 1.55), MAT.gut(), 0, -0.02, 0.03, 'organ_intestine_large', 'digestive');
  colon.rotation.set(Math.PI / 2, 0, Math.PI * 0.72);
  mesh(spineL, cyl(0.011, 0.013, 0.24), MAT.blood(), -0.015, 0.05, -0.055, 'vessel_aorta_abdominal', 'circulatory', false);

  // ---------------- THORACIC SPINE / CHEST — slimmer + gentle breast forms ----------------
  const spineT = joint(spineL, 'spine_T', 0, 0.17, 0, refs);
  for (let i = 0; i < 12; i++) {
    mesh(spineT, cyl(0.022, 0.023, 0.02), MAT.bone(), 0, 0.005 + i * 0.0145, -0.052, `bone_vert_${7 + i}`, 'skeletal');
  }
  mesh(spineT, cyl(0.007, 0.007, 0.19), MAT.nerve(), 0, 0.09, -0.052, 'organ_spinal_cord_thoracic', 'nervous', false);
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const r = 0.100 + Math.sin(t * Math.PI) * 0.028;
    const y = 0.165 - i * 0.0135;
    for (const s of [1, -1]) {
      const rib = mesh(spineT, new THREE.TorusGeometry(r, 0.0062, 8, 26, Math.PI * (0.95 - t * 0.25)), MAT.bone(),
        0, y, 0.01, `bone_rib_${i + 1}_${s === 1 ? 'L' : 'R'}`, 'skeletal');
      rib.rotation.set(Math.PI / 2 + 0.12, 0, s === 1 ? Math.PI * 0.52 : -Math.PI * 0.35);
      rib.scale.set(1, 0.82, 1);
    }
  }
  mesh(spineT, box(0.035, 0.15, 0.014), MAT.bone(), 0, 0.085, 0.112, 'bone_sternum', 'skeletal');
  for (const s of [1, -1]) {
    const cl = mesh(spineT, cyl(0.008, 0.008, 0.15), MAT.bone(), s * 0.095, 0.175, 0.10, `bone_clavicle_${s === 1 ? 'L' : 'R'}`, 'skeletal');
    cl.rotation.z = Math.PI / 2 - s * 0.12;
    cl.rotation.y = s * 0.25;
    const sc = mesh(spineT, box(0.09, 0.11, 0.012), MAT.bone(), s * 0.095, 0.10, -0.115, `bone_scapula_${s === 1 ? 'L' : 'R'}`, 'skeletal');
    sc.rotation.y = -s * 0.25;
    sc.rotation.z = s * 0.1;
  }
  const chestSkin = skin(spineT, cyl(0.142, 0.130, 0.24, 24), 0, 0.09, 0.005, 'skin_chest');
  chestSkin.scale.set(1.05, 1, 0.88);
  refs.thorax = chestSkin;
  // gentle, mannequin-smooth breast forms (no detail — classical sculpture)
  for (const s of [1, -1]) {
    const S = s === 1 ? 'L' : 'R';
    const br = skin(spineT, sph(0.060, 24, 18), s * 0.075, 0.118, 0.112, `skin_breast_${S}`);
    br.scale.set(1.05, 0.95, 0.78);
  }
  for (const s of [1, -1]) {
    const pec = mesh(spineT, sph(0.058), MAT.muscle(), s * 0.062, 0.135, 0.085, `muscle_pectoralis_major_${s === 1 ? 'L' : 'R'}`, 'muscular');
    pec.scale.set(1.0, 0.7, 0.35);
    const lat = mesh(spineT, sph(0.07), MAT.muscleDark(), s * 0.108, 0.03, -0.075, `muscle_latissimus_dorsi_${s === 1 ? 'L' : 'R'}`, 'muscular');
    lat.scale.set(0.55, 1.15, 0.7);
    const trap = mesh(spineT, box(0.09, 0.16, 0.03), MAT.muscle(), s * 0.052, 0.175, -0.085, `muscle_trapezius_${s === 1 ? 'L' : 'R'}`, 'muscular');
    trap.rotation.z = s * -0.35;
  }
  const dia = mesh(spineT, new THREE.SphereGeometry(0.125, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), MAT.diaphragm(), 0, -0.015, 0.005, 'muscle_diaphragm', 'respiratory');
  dia.scale.set(1.05, 0.75, 0.85);
  refs.diaphragm = dia;
  mesh(spineT, cyl(0.011, 0.011, 0.09), MAT.airway(), 0, 0.175, 0.03, 'organ_trachea_lower', 'respiratory', false);
  for (const s of [1, -1]) {
    const br = mesh(spineT, cyl(0.007, 0.007, 0.05), MAT.airway(), s * 0.03, 0.135, 0.03, `organ_bronchus_${s === 1 ? 'L' : 'R'}`, 'respiratory', false);
    br.rotation.z = s * -0.7;
  }
  for (const s of [1, -1]) {
    const lung = mesh(spineT, sph(0.062, 22, 18), MAT.lung(), s * 0.082, 0.075, 0.01, `organ_lung_${s === 1 ? 'L' : 'R'}`, 'respiratory');
    lung.scale.set(0.95, 1.45, 0.95);
    refs.lungs.push(lung);
  }
  const heart = new THREE.Group();
  heart.name = 'organ_heart';
  heart.position.set(0.035, 0.065, 0.055);
  heart.rotation.set(0.35, 0, -0.35);
  const hv = new THREE.Mesh(sph(0.048, 22, 18), MAT.heart());
  hv.name = 'organ_heart';
  hv.userData.system = 'circulatory';
  hv.castShadow = true;
  hv.scale.set(0.9, 1.25, 0.9);
  heart.add(hv);
  spineT.add(heart);
  refs.heart = heart;
  const aortaG = new THREE.Group();
  aortaG.name = 'organ_aorta';
  const asc = new THREE.Mesh(cyl(0.013, 0.013, 0.09), MAT.blood());
  asc.name = 'organ_aorta'; asc.userData.system = 'circulatory';
  asc.position.set(0.012, 0.10, 0.045);
  aortaG.add(asc);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.012, 10, 18, Math.PI), MAT.blood());
  arch.name = 'organ_aorta'; arch.userData.system = 'circulatory';
  arch.position.set(0.012, 0.145, 0.045);
  arch.rotation.y = Math.PI / 2;
  aortaG.add(arch);
  const desc = new THREE.Mesh(cyl(0.012, 0.011, 0.16), MAT.blood());
  desc.name = 'organ_aorta'; desc.userData.system = 'circulatory';
  desc.position.set(-0.016, 0.06, -0.01);
  aortaG.add(desc);
  spineT.add(aortaG);
  refs.aorta = aortaG;

  // ---------------- NECK — slimmer ----------------
  const neck = joint(spineT, 'neck', 0, 0.215, 0.005, refs);
  for (let i = 0; i < 7; i++) {
    mesh(neck, cyl(0.016, 0.017, 0.014), MAT.bone(), 0, 0.005 + i * 0.012, -0.012, `bone_vert_${i}`, 'skeletal');
  }
  mesh(neck, cyl(0.006, 0.006, 0.1), MAT.nerve(), 0, 0.045, -0.012, 'organ_spinal_cord_cervical', 'nervous', false);
  mesh(neck, cyl(0.010, 0.010, 0.09), MAT.airway(), 0, 0.04, 0.032, 'organ_trachea_upper', 'respiratory', false);
  mesh(neck, box(0.034, 0.028, 0.014), MAT.thyroid(), 0, 0.015, 0.038, 'organ_thyroid', 'endocrine');
  mesh(neck, cyl(0.008, 0.008, 0.03), MAT.bone(), 0, 0.045, 0.035, 'bone_hyoid', 'skeletal');
  for (const s of [1, -1]) {
    const scm = mesh(neck, cap(0.013, 0.07), MAT.muscle(), s * 0.030, 0.04, 0.015, `muscle_sternocleidomastoid_${s === 1 ? 'L' : 'R'}`, 'muscular');
    scm.rotation.z = s * 0.18;
    scm.rotation.x = 0.1;
  }
  skin(neck, cyl(0.048, 0.054, 0.11, 18), 0, 0.045, 0.005, 'skin_neck');

  // ---------------- HEAD — delicate, feminine ----------------
  const head = joint(neck, 'head', 0, 0.105, 0.005, refs);
  const cranium = mesh(head, sph(0.098, 28, 22), MAT.bone(), 0, 0.035, -0.005, 'bone_cranium', 'skeletal');
  cranium.scale.set(0.90, 1.04, 0.98);
  mesh(head, box(0.070, 0.065, 0.042), MAT.bone(), 0, -0.035, 0.055, 'bone_face', 'skeletal');
  mesh(head, box(0.028, 0.018, 0.028), MAT.bone(), 0, 0.0, 0.085, 'bone_nasal', 'skeletal');
  const brainM = mesh(head, sph(0.080, 26, 20), MAT.brain(), 0, 0.045, -0.008, 'organ_brain', 'nervous');
  brainM.scale.set(0.9, 0.95, 1.0);
  mesh(head, sph(0.028), MAT.brain(), 0, -0.005, -0.075, 'organ_cerebellum', 'nervous').scale.set(1.1, 0.8, 0.7);
  mesh(head, cyl(0.014, 0.018, 0.05), MAT.brain(), 0, -0.03, -0.045, 'organ_brainstem', 'nervous').rotation.x = 0.3;
  mesh(head, sph(0.007), MAT.pituitary(), 0, -0.005, 0.01, 'organ_pituitary', 'endocrine', false);
  for (const s of [1, -1]) {
    const S = s === 1 ? 'L' : 'R';
    // violet eyes, slightly larger — Nora's gaze
    const eye = mesh(head, sph(0.017, 16, 12), M(0x8b5cf6, { r: 0.25 }), s * 0.038, 0.005, 0.082, `organ_eye_${S}`, 'nervous');
    eye.scale.set(1.25, 1.25, 1.0);
    refs.eyes.push(eye);
    // flattened pupil disc: sits flush on the eyeball front, not swallowed
    const pupil = mesh(head, sph(0.007, 12, 10), MAT.pupil(), s * 0.038, 0.005, 0.0975, `organ_pupil_${S}`, 'nervous', false);
    pupil.scale.set(1, 1, 0.35);
    // upper eyelid: skin shell covering the top ~35% of the eyeball
    const lid = mesh(head, new THREE.SphereGeometry(0.020, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
      noraSkinMat(), s * 0.038, 0.010, 0.080, `nora_eyelid_${S}`, 'integumentary', false);
    lid.scale.set(1.2, 0.9, 1.0);
    // lash-line hint along the lid's lower edge
    const lash = mesh(head, new THREE.TorusGeometry(0.021, 0.0018, 8, 24, Math.PI * 0.7),
      M(0x2a1a2a, { r: 0.4 }), s * 0.038, 0.013, 0.080, `nora_lashline_${S}`, 'integumentary', false);
    lash.rotation.set(Math.PI / 2, 0, Math.PI * 0.15); // arc centered on +Z, hugging the lid edge
    lash.scale.set(1.12, 1, 0.95); // match the lid edge's elliptical footprint
    // subtly pointed ears (elven), tipped outward
    const ear = mesh(head, sph(0.02, 12, 10), MAT.cartilage(), s * 0.104, 0.035, -0.005, `organ_ear_${S}`, 'nervous', false);
    ear.scale.set(0.32, 1.25, 0.45);
    ear.rotation.z = s * -0.5;
    const mass = mesh(head, box(0.025, 0.05, 0.03), MAT.muscle(), s * 0.050, -0.05, 0.045, `muscle_masseter_${S}`, 'muscular');
    mass.rotation.z = s * 0.15;
  }
  mesh(head, box(0.090, 0.028, 0.02), MAT.muscle(), 0, 0.075, 0.075, 'muscle_frontalis', 'muscular');
  const jaw = joint(head, 'jaw', 0, -0.055, 0.03, refs);
  mesh(jaw, box(0.080, 0.032, 0.048), MAT.bone(), 0, -0.01, 0.03, 'bone_mandible', 'skeletal');
  mesh(jaw, box(0.016, 0.045, 0.03), MAT.bone(), 0.042, 0.015, 0.005, 'bone_mandible_ramus_L', 'skeletal');
  mesh(jaw, box(0.016, 0.045, 0.03), MAT.bone(), -0.042, 0.015, 0.005, 'bone_mandible_ramus_R', 'skeletal');
  const headGeo = sph(0.102, 48, 36);
  sculptNoraFace(headGeo, 0.102);
  const headSkin = skin(head, headGeo, 0, 0.03, 0.008, 'skin_head');
  headSkin.scale.set(0.90, 1.08, 0.97);

  // ---------------- SILVER HAIR — long, flowing ----------------
  // back mass: frames the head, leaves the face clear
  const hairBack = new THREE.Mesh(sph(0.118, 32, 24), hairMat());
  hairBack.name = 'nora_hair_mass';
  hairBack.userData.system = 'integumentary';
  hairBack.position.set(0, 0.05, -0.028);
  hairBack.scale.set(1.02, 1.3, 1.0);
  hairBack.castShadow = true;
  head.add(hairBack);
  // top cap: covers crown of head, biased toward the back
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat());
  hairCap.name = 'nora_hair_cap';
  hairCap.userData.system = 'integumentary';
  hairCap.position.set(0, 0.045, -0.015);
  hairCap.rotation.x = -0.45;
  hairCap.castShadow = true;
  head.add(hairCap);
  // flowing back strands — mirrored L/R for perfect symmetry
  for (const s of [1, -1]) {
    const S = s === 1 ? 'L' : 'R';
    for (let k = 0; k < 5; k++) {
      hairStrand(head, [
        new THREE.Vector3(s * (0.012 + k * 0.020), 0.115 - k * 0.006, -0.015 - k * 0.004),
        new THREE.Vector3(s * (0.045 + k * 0.024), 0.03, -0.105),
        new THREE.Vector3(s * (0.052 + k * 0.027), -0.14, -0.120),
        new THREE.Vector3(s * (0.048 + k * 0.030), -0.30 - (k % 2) * 0.05, -0.095 + (k % 3) * 0.012),
      ], 0.0085, `nora_hair_back_${S}_${k}`);
    }
    // front locks framing the face, falling past the shoulders
    for (let k = 0; k < 2; k++) {
      hairStrand(head, [
        new THREE.Vector3(s * (0.075 + k * 0.014), 0.075, 0.035),
        new THREE.Vector3(s * (0.088 + k * 0.010), -0.06, 0.062),
        new THREE.Vector3(s * (0.080 + k * 0.012), -0.20 - k * 0.04, 0.055),
      ], 0.0075, `nora_hair_lock_${S}_${k}`);
    }
  }

  // ---------------- GOLDEN CRESCENT-MOON CROWN ----------------
  const crown = new THREE.Group();
  crown.name = 'nora_crown';
  crown.position.set(0, 0.125, 0.005);
  crown.rotation.x = -0.28;
  head.add(crown);
  const addCrownMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, id: string) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = id;
    m.userData.system = 'integumentary';
    m.castShadow = true;
    crown.add(m);
    return m;
  };
  const circlet = addCrownMesh(new THREE.TorusGeometry(0.108, 0.0055, 10, 48), goldMat(), 'nora_crown_circlet');
  circlet.rotation.x = Math.PI / 2;
  // radiating star-spikes, fanned symmetrically
  for (let i = 0; i < 7; i++) {
    const a = (-63 + i * 21) * Math.PI / 180;
    const spike = addCrownMesh(new THREE.ConeGeometry(0.005, 0.055, 8), goldMat(), `nora_crown_spike_${i}`);
    spike.position.set(Math.sin(a) * 0.108, 0.026, Math.cos(a) * 0.108);
    spike.rotation.z = -a * 0.55;
  }
  // the crescent moon, horns up, front-top of the crown
  const crescent = addCrownMesh(new THREE.TorusGeometry(0.038, 0.007, 12, 40, Math.PI * 1.3), goldMat(), 'nora_crown_crescent');
  crescent.position.set(0, 0.048, 0.098);
  crescent.rotation.z = -0.15 * Math.PI;
  // violet gems: one center, two mirrored sides
  const gemDefs: Array<[number, number, number, number]> = [
    [0, 0.008, 0.108, 0.011],
    [0.078, 0.006, 0.074, 0.009],
    [-0.078, 0.006, 0.074, 0.009],
  ];
  gemDefs.forEach(([gx, gy, gz, gr], i) => {
    const gem = addCrownMesh(new THREE.SphereGeometry(gr, 16, 12), gemMat(), `nora_crown_gem_${i}`);
    gem.position.set(gx, gy, gz);
  });

  // ---------------- ARMS — narrower shoulders, slimmer ----------------
  for (const s of [1, -1]) {
    const S = s === 1 ? 'L' : 'R';
    const sh = joint(spineT, `shoulder_${S}`, s * 0.19, 0.165, 0, refs);
    mesh(sh, sph(0.052), MAT.muscle(), 0, -0.01, 0, `muscle_deltoid_${S}`, 'muscular').scale.set(1, 1.15, 1);
    mesh(sh, cyl(0.013, 0.015, 0.26), MAT.bone(), 0, -0.155, 0, `bone_humerus_${S}`, 'skeletal');
    mesh(sh, sph(0.024), MAT.bone(), 0, -0.285, 0, `bone_humerus_condyle_${S}`, 'skeletal');
    mesh(sh, cap(0.030, 0.15), MAT.muscle(), 0, -0.15, 0.022, `muscle_biceps_brachii_${S}`, 'muscular');
    mesh(sh, cap(0.032, 0.16), MAT.muscleDark(), 0, -0.15, -0.02, `muscle_triceps_brachii_${S}`, 'muscular');
    mesh(sh, cyl(0.005, 0.005, 0.26), MAT.nerve(), 0, -0.15, 0.005, `nerve_median_${S}`, 'nervous', false);
    skin(sh, sph(0.062, 18, 14), 0, -0.01, 0, `skin_shoulder_${S}`).scale.set(1, 1.12, 1);
    skin(sh, cap(0.054, 0.20), 0, -0.15, 0, `skin_arm_upper_${S}`);

    const el = joint(sh, `elbow_${S}`, 0, -0.30, 0, refs);
    mesh(el, cyl(0.010, 0.012, 0.23), MAT.bone(), s * 0.012, -0.125, 0.004, `bone_radius_${S}`, 'skeletal');
    mesh(el, cyl(0.011, 0.009, 0.23), MAT.bone(), -s * 0.012, -0.125, -0.004, `bone_ulna_${S}`, 'skeletal');
    mesh(el, cap(0.028, 0.14), MAT.muscle(), 0, -0.10, 0.008, `muscle_forearm_flexors_${S}`, 'muscular');
    mesh(el, cap(0.024, 0.13), MAT.muscleDark(), 0, -0.11, -0.018, `muscle_forearm_extensors_${S}`, 'muscular');
    skin(el, cap(0.042, 0.22), 0, -0.13, 0, `skin_forearm_${S}`);

    const wr = joint(el, `wrist_${S}`, 0, -0.27, 0, refs);
    for (let c = 0; c < 8; c++) {
      mesh(wr, box(0.014, 0.012, 0.014), MAT.bone(), (c % 4 - 1.5) * 0.016, -0.012 - Math.floor(c / 4) * 0.014, 0, `bone_carpal_${c}_${S}`, 'skeletal');
    }
    for (let mc = 0; mc < 5; mc++) {
      mesh(wr, box(0.011, 0.062, 0.011), MAT.bone(), (mc - 2) * 0.017, -0.06, 0, `bone_metacarpal_${mc + 1}_${S}`, 'skeletal');
    }
    skin(wr, box(0.072, 0.155, 0.030), 0, -0.085, 0, `skin_hand_${S}`);
    const fingerX = [0.042, 0.024, 0.008, -0.008, -0.024];
    fingerX.forEach((fx, fi) => {
      const isThumb = fi === 0;
      const fg = new THREE.Group();
      fg.name = `finger_${S}_${fi}`;
      fg.position.set(s === 1 ? fx : -fx, isThumb ? -0.10 : -0.155, isThumb ? 0.008 : 0);
      if (isThumb) { fg.rotation.z = s * -0.7; fg.rotation.y = s * 0.3; }
      wr.add(fg);
      const segs = isThumb ? 2 : 3;
      for (let p = 0; p < segs; p++) {
        const len = isThumb ? 0.026 : 0.024 - p * 0.004;
        mesh(fg, cyl(0.006, 0.0055, len), MAT.bone(), 0, -0.012 - p * (len + 0.004), 0, `bone_phalanx_hand_${fi}_${p + 1}_${S}`, 'skeletal', false);
        mesh(fg, cap(0.008, len), noraSkinMat(), 0, -0.012 - p * (len + 0.004), 0, `skin_finger_${S}_${fi}_${p}`, 'integumentary', false);
      }
    });
  }

  // ---------------- LEGS — wider hips, graceful ----------------
  for (const s of [1, -1]) {
    const S = s === 1 ? 'L' : 'R';
    const hip = joint(pelvis, `hip_${S}`, s * 0.105, -0.03, 0, refs);
    mesh(hip, cyl(0.016, 0.019, 0.40), MAT.bone(), 0, -0.225, 0, `bone_femur_${S}`, 'skeletal');
    mesh(hip, sph(0.024), MAT.bone(), 0, -0.015, 0, `bone_femur_head_${S}`, 'skeletal');
    mesh(hip, cap(0.046, 0.26), MAT.muscle(), 0, -0.21, 0.028, `muscle_quadriceps_femoris_${S}`, 'muscular');
    mesh(hip, cap(0.044, 0.25), MAT.muscleDark(), 0, -0.21, -0.028, `muscle_hamstrings_${S}`, 'muscular');
    mesh(hip, cyl(0.007, 0.007, 0.38), MAT.nerve(), 0, -0.21, -0.045, `nerve_sciatic_${S}`, 'nervous', false);
    skin(hip, cap(0.074, 0.30), 0, -0.215, 0, `skin_thigh_${S}`);

    const knee = joint(hip, `knee_${S}`, 0, -0.45, 0, refs);
    mesh(knee, sph(0.022), MAT.bone(), 0, -0.005, 0.048, `bone_patella_${S}`, 'skeletal').scale.set(1, 1.2, 0.6);
    mesh(knee, cyl(0.017, 0.014, 0.37), MAT.bone(), s * 0.008, -0.205, 0.008, `bone_tibia_${S}`, 'skeletal');
    mesh(knee, cyl(0.008, 0.007, 0.36), MAT.bone(), -s * 0.032, -0.20, -0.004, `bone_fibula_${S}`, 'skeletal');
    mesh(knee, cap(0.038, 0.17), MAT.muscle(), 0, -0.12, -0.024, `muscle_gastrocnemius_${S}`, 'muscular');
    mesh(knee, cap(0.032, 0.20), MAT.muscleDark(), 0, -0.18, -0.026, `muscle_soleus_${S}`, 'muscular');
    skin(knee, cap(0.060, 0.30), 0, -0.20, 0, `skin_leg_${S}`);

    const ank = joint(knee, `ankle_${S}`, 0, -0.40, 0, refs);
    mesh(ank, box(0.05, 0.05, 0.06), MAT.bone(), 0, -0.015, -0.01, `bone_tarsal_0_${S}`, 'skeletal');
    mesh(ank, box(0.045, 0.045, 0.07), MAT.bone(), 0, -0.045, -0.040, `bone_tarsal_1_${S}`, 'skeletal');
    for (let mt = 0; mt < 5; mt++) {
      mesh(ank, box(0.012, 0.014, 0.075), MAT.bone(), (mt - 2) * 0.017, -0.055, 0.055, `bone_metatarsal_${mt + 1}_${S}`, 'skeletal');
      mesh(ank, box(0.013, 0.012, 0.022), MAT.bone(), (mt - 2) * 0.017, -0.058, 0.105, `bone_phalanx_foot_${mt}_1_${S}`, 'skeletal', false);
    }
    skin(ank, box(0.084, 0.066, 0.23), 0, -0.055, 0.042, `skin_foot_${S}`);
  }

  // ---------------- MICRO STAGE (shared with the base body) ----------------
  buildMicroStage(scene, refs);

  return refs;
}
