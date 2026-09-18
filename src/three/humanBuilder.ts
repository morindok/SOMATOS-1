import * as THREE from 'three';
import { JOINTS } from '../data/anatomy';
import type { LimbicState } from '../lib/limbic';

// ============================================================
// SOMATOS-1 — Scientifically-proportioned articulated human body
// Height 1.70 m, anatomical position, facing +Z.
// Anatomical LEFT = +X (subject faces the viewer, like a patient).
// Every mesh: name = part_id, userData.system = body system key.
// ============================================================

export interface BodyRefs {
  group: THREE.Group;
  joints: Map<string, THREE.Group>;
  targets: Record<string, [number, number, number]>;
  heart: THREE.Object3D | null;
  lungs: THREE.Object3D[];
  chest: THREE.Object3D[];
  thorax: THREE.Mesh | null;
  abdomen: THREE.Mesh | null;
  diaphragm: THREE.Object3D | null;
  aorta: THREE.Object3D | null;
  eyes: THREE.Object3D[];
  micro: THREE.Group;
  microModels: Record<string, THREE.Group>;
  microLabel: THREE.Sprite | null;
  selected: THREE.Object3D | null;
  skinMeshes: THREE.Mesh[];
  skinBase: { c: THREE.Color; r: number }[];
  horns: THREE.Object3D[];
  motorOffsets: Record<string, [number, number, number]>;
  // per-joint muscle state: a = activation 0..1, f = local fatigue 0..0.7,
  // hy = hypertrophy 0..1 (long-term adaptation), v = angular velocity (rad/s)
  muscle: Record<string, { a: number; f: number; hy: number; vx: number; vy: number; vz: number }>;
}

const M = (color: number, o: { e?: number; ei?: number; r?: number; m?: number; o?: number; t?: boolean; flat?: boolean } = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: o.r ?? 0.55,
    metalness: o.m ?? 0.08,
    emissive: o.e ?? 0x000000,
    emissiveIntensity: o.ei ?? 1,
    transparent: o.t ?? false,
    opacity: o.o ?? 1,
    flatShading: o.flat ?? false,
  });

// living-skin tint targets (flushed with blood / pale when cold)
const FLUSH_COLOR = new THREE.Color(0xd96a4e);
const PALE_COLOR = new THREE.Color(0xc9c2bd);

const MAT = {
  bone: () => M(0xe9e4d6, { r: 0.5 }),
  cartilage: () => M(0xbcd3dd, { r: 0.35 }),
  muscle: () => M(0xa8322b, { r: 0.6 }),
  muscleDark: () => M(0x7e231f, { r: 0.65 }),
  skin: () => M(0xd9a07e, { r: 0.55 }),
  brain: () => M(0xe5b39b, { r: 0.5 }),
  nerve: () => M(0xf2c230, { e: 0x8a6a00, ei: 0.9, r: 0.4 }),
  heart: () => M(0xc81e35, { r: 0.4 }),
  blood: () => M(0x8f1226, { r: 0.35 }),
  lung: () => M(0x86b9cc, { r: 0.5 }),
  airway: () => M(0xcfd8dc, { r: 0.5 }),
  liver: () => M(0x7d2a35, { r: 0.45 }),
  stomach: () => M(0xd9985f, { r: 0.5 }),
  gut: () => M(0xcf8a52, { r: 0.55 }),
  kidney: () => M(0x6e1f2c, { r: 0.45 }),
  bladder: () => M(0xc9b458, { r: 0.5 }),
  thyroid: () => M(0x9b59b6, { r: 0.5 }),
  pituitary: () => M(0xb06ab3, { r: 0.5 }),
  adrenal: () => M(0xd9a441, { r: 0.5 }),
  spleen: () => M(0x4e7d5b, { r: 0.5 }),
  pancreas: () => M(0xdcc08a, { r: 0.55 }),
  eye: () => M(0xf5f2ea, { r: 0.25 }),
  pupil: () => M(0x14100c, { r: 0.2 }),
  diaphragm: () => M(0xb0503f, { r: 0.6 }),
};

function mesh(
  parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material,
  x: number, y: number, z: number, partId: string, system: string,
  cast = true,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.name = partId;
  m.userData.system = system;
  m.castShadow = cast;
  m.receiveShadow = false;
  parent.add(m);
  return m;
}

const cap = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 14);
const cyl = (rt: number, rb: number, h: number, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s);
const sph = (r: number, w = 20, h = 16) => new THREE.SphereGeometry(r, w, h);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

function joint(parent: THREE.Object3D, id: string, x: number, y: number, z: number, refs: BodyRefs): THREE.Group {
  const g = new THREE.Group();
  g.name = 'joint_' + id;
  g.position.set(x, y, z);
  parent.add(g);
  refs.joints.set(id, g);
  refs.targets[id] = [0, 0, 0];
  return g;
}

// ---------- text sprite for micro-stage labels ----------
function makeLabel(text: string, sub: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 150;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(8,14,18,0.88)';
  ctx.beginPath();
  ctx.roundRect(6, 6, 628, 138, 22);
  ctx.fill();
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#5eead4';
  ctx.font = 'bold 44px Vazirmatn, Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 320, 62);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '30px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText(sub, 320, 112);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(1.05, 0.25, 1);
  return sp;
}

// ---------- face sculpting: carve features + align the face texture ----------
// The head skin is a deformed sphere. Features (nose, sockets, brows, lips,
// chin, cheeks) are pushed radially in local space. UVs are custom: the face
// maps planarly onto the face texture with its feature rows (eyes/mouth/chin)
// anchored to the matching sculpted landmarks, while the back of the head
// slides onto the texture's skin-tone edge columns.
function sculptHeadFace(geo: THREE.SphereGeometry, r: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const g2 = (v: number, s: number) => Math.exp(-(v * v) / (2 * s * s));
  // v-map stops: local y <-> face-texture rows (eyes v.70, mouth v.40, chin v.05)
  const stops: [number, number][] = [
    [-0.106, 0.02], [-0.095, 0.05], [-0.056, 0.4], [-0.0234, 0.7], [0.106, 1.0],
  ];
  const vMap = (y: number) => {
    if (y <= stops[0][0]) return 0;
    for (let i = 1; i < stops.length; i++) {
      if (y <= stops[i][0]) {
        const [y0, v0] = stops[i - 1];
        const [y1, v1] = stops[i];
        return v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
      }
    }
    return 1;
  };
  const socketL = new THREE.Vector3(0.0427, -0.0258, 0.0935).normalize();
  const socketR = new THREE.Vector3(-0.0427, -0.0258, 0.0935).normalize();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.copy(p).normalize();
    const y = p.y;
    const front = Math.max(0, n.z);
    let d = 0;
    // nose bridge + tip
    d += 0.021 * Math.max(0, 1 - Math.abs((y + 0.03) / 0.055)) * g2(p.x, 0.013) * front * front;
    // eye sockets
    d -= 0.010 * g2(1 - Math.max(n.dot(socketL), n.dot(socketR)), 0.012);
    // brow ridge above the sockets
    d += 0.005 * Math.max(0, 1 - Math.abs((y + 0.005) / 0.02)) * g2(p.x, 0.04) * front;
    // lips
    d += 0.007 * g2(y + 0.056, 0.011) * g2(p.x, 0.021) * front * front;
    // chin
    d += 0.009 * g2(y + 0.095, 0.014) * g2(p.x, 0.019) * front * front;
    // cheeks
    d += 0.004 * g2(y + 0.035, 0.03) * g2(Math.abs(p.x) - 0.052, 0.016) * front;
    p.multiplyScalar(1 + d / r);
    pos.setXYZ(i, p.x, p.y, p.z);
    const back = Math.max(0, -n.z);
    const u = THREE.MathUtils.clamp(0.5 + (p.x / 0.31) * (1 + 3 * back), 0.02, 0.98);
    uv.setXY(i, u, vMap(y));
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeVertexNormals();
}

// ============================================================
export function buildBody(scene: THREE.Scene): BodyRefs {
  const refs: BodyRefs = {
    group: new THREE.Group(), joints: new Map(), targets: {},
    heart: null, lungs: [], chest: [], thorax: null, abdomen: null, diaphragm: null, aorta: null, eyes: [],
    micro: new THREE.Group(), microModels: {}, microLabel: null, selected: null, skinMeshes: [], skinBase: [],
    horns: [], motorOffsets: {}, muscle: {},
  };
  const g = refs.group;
  g.name = 'soma_body';
  g.position.y = 0.06; // standing on the dais
  scene.add(g);

  const skin = (parent: THREE.Object3D, geo: THREE.BufferGeometry, x: number, y: number, z: number, id: string) => {
    const m = mesh(parent, geo, MAT.skin(), x, y, z, id, 'integumentary');
    refs.skinMeshes.push(m);
    refs.skinBase.push({ c: (m.material as THREE.MeshStandardMaterial).color.clone(), r: (m.material as THREE.MeshStandardMaterial).roughness });
    refs.chest.push(m);
    return m;
  };

  // realistic dermis/face textures (patch assets) — applied async so the
  // scene never blocks; flush/sweat tinting keeps working on top (map × color)
  // guarded for headless/test environments (no DOM -> keep solid shading)
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
            // lighten the tint base so map × color keeps natural dermis tone
            refs.skinBase[i].c.lerp(new THREE.Color(0xffffff), 0.72);
            refs.skinBase[i].r = 0.46; // keep flush/sweat roughness dynamics coherent
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
    // realistic irises on the eyeballs (rotate so the iris faces +Z)
    texLoader.load(
      'textures/eye.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        for (const e of refs.eyes) {
          const em = e as THREE.Mesh;
          const mat = em.material as THREE.MeshStandardMaterial;
          mat.map = tex;
          em.rotation.y = -Math.PI / 2; // sphere UV seam: iris center -> +Z (front)
          mat.needsUpdate = true;
        }
      },
      undefined,
      () => { /* offline-safe */ },
    );
  }

  // ---------------- PELVIS (root) ----------------
  const pelvis = joint(g, 'pelvis_root', 0, 0.98, 0, refs);
  mesh(pelvis, sph(0.075), MAT.bone(), 0.085, 0.01, 0, 'bone_pelvis_L', 'skeletal').scale.set(0.7, 1.15, 0.9);
  mesh(pelvis, sph(0.075), MAT.bone(), -0.085, 0.01, 0, 'bone_pelvis_R', 'skeletal').scale.set(0.7, 1.15, 0.9);
  mesh(pelvis, box(0.07, 0.12, 0.05), MAT.bone(), 0, 0.0, -0.055, 'bone_vert_24', 'skeletal'); // sacrum
  mesh(pelvis, sph(0.062), MAT.muscle(), 0.075, -0.01, -0.075, 'muscle_gluteus_maximus_L', 'muscular').scale.set(1, 1.25, 0.8);
  mesh(pelvis, sph(0.062), MAT.muscle(), -0.075, -0.01, -0.075, 'muscle_gluteus_maximus_R', 'muscular').scale.set(1, 1.25, 0.8);
  mesh(pelvis, sph(0.045), MAT.bladder(), 0, -0.03, 0.03, 'organ_bladder', 'urinary').scale.set(1, 1.2, 0.9);
  skin(pelvis, cap(0.125, 0.10), 0, 0.0, 0, 'skin_pelvis').scale.set(1.14, 1, 1.02);
  // femoral nerves hint
  mesh(pelvis, cyl(0.006, 0.006, 0.1), MAT.nerve(), 0.06, -0.06, -0.02, 'nerve_femoral_L', 'nervous', false);
  mesh(pelvis, cyl(0.006, 0.006, 0.1), MAT.nerve(), -0.06, -0.06, -0.02, 'nerve_femoral_R', 'nervous', false);

  // ---------------- LUMBAR SPINE ----------------
  const spineL = joint(pelvis, 'spine_L', 0, 0.10, 0, refs);
  for (let i = 0; i < 5; i++) {
    const v = mesh(spineL, cyl(0.026, 0.028, 0.026), MAT.bone(), 0, 0.0 + i * 0.031, -0.045, `bone_vert_${19 + i}`, 'skeletal');
    v.scale.set(1, 1, 1);
    if (i < 4) mesh(spineL, cyl(0.024, 0.024, 0.008), MAT.cartilage(), 0, 0.017 + i * 0.031, -0.045, `disc_L${i + 1}${i + 2}`, 'skeletal', false);
  }
  mesh(spineL, cyl(0.008, 0.008, 0.17), MAT.nerve(), 0, 0.07, -0.045, 'organ_spinal_cord_lumbar', 'nervous', false);
  // abdomen skin + muscles
  const abdomenSkin = skin(spineL, cyl(0.148, 0.132, 0.24, 22), 0, 0.05, 0, 'skin_abdomen');
  refs.abdomen = abdomenSkin;
  for (let i = 0; i < 4; i++) {
    mesh(spineL, box(0.055, 0.042, 0.03), MAT.muscle(), 0.033, -0.03 + i * 0.048, 0.125, 'muscle_rectus_abdominis_seg' + i, 'muscular');
    mesh(spineL, box(0.055, 0.042, 0.03), MAT.muscle(), -0.033, -0.03 + i * 0.048, 0.125, 'muscle_rectus_abdominis_segR' + i, 'muscular');
  }
  const oblL = mesh(spineL, cap(0.045, 0.16), MAT.muscleDark(), 0.125, 0.05, 0.02, 'muscle_external_oblique_L', 'muscular');
  oblL.rotation.z = 0.25;
  const oblR = mesh(spineL, cap(0.045, 0.16), MAT.muscleDark(), -0.125, 0.05, 0.02, 'muscle_external_oblique_R', 'muscular');
  oblR.rotation.z = -0.25;
  // kidneys (retroperitoneal, T12–L3 → world ~1.14)
  const kL = mesh(spineL, sph(0.032), MAT.kidney(), 0.075, 0.055, -0.075, 'organ_kidney_L', 'urinary');
  kL.scale.set(0.75, 1.25, 0.7);
  const kR = mesh(spineL, sph(0.032), MAT.kidney(), -0.075, 0.05, -0.075, 'organ_kidney_R', 'urinary');
  kR.scale.set(0.75, 1.25, 0.7);
  mesh(spineL, sph(0.016), MAT.adrenal(), 0.075, 0.105, -0.075, 'organ_adrenal_L', 'endocrine').scale.set(1, 0.6, 0.7);
  mesh(spineL, sph(0.016), MAT.adrenal(), -0.075, 0.10, -0.075, 'organ_adrenal_R', 'endocrine').scale.set(1, 0.6, 0.7);
  // liver (right hypochondrium), stomach (left), spleen, pancreas
  const liver = mesh(spineL, sph(0.075), MAT.liver(), -0.045, 0.115, 0.01, 'organ_liver', 'digestive');
  liver.scale.set(1.25, 0.62, 0.95);
  const stom = mesh(spineL, sph(0.042), MAT.stomach(), 0.055, 0.085, 0.045, 'organ_stomach', 'digestive');
  stom.scale.set(0.85, 1.25, 0.8);
  stom.rotation.z = 0.5;
  mesh(spineL, sph(0.028), MAT.spleen(), 0.105, 0.10, -0.03, 'organ_spleen', 'immune').scale.set(0.7, 1.2, 0.6);
  const panc = mesh(spineL, cap(0.016, 0.09), MAT.pancreas(), 0.0, 0.055, 0.02, 'organ_pancreas', 'digestive');
  panc.rotation.z = Math.PI / 2 - 0.15;
  // small intestine coils
  for (let i = 0; i < 4; i++) {
    const coil = mesh(spineL, new THREE.TorusGeometry(0.055 - i * 0.004, 0.016, 10, 22), MAT.gut(), 0, -0.045 + i * 0.036, 0.03, 'organ_intestine_small_coil' + i, 'digestive');
    coil.rotation.x = Math.PI / 2;
    coil.rotation.z = i * 0.5;
  }
  const colon = mesh(spineL, new THREE.TorusGeometry(0.095, 0.02, 10, 26, Math.PI * 1.55), MAT.gut(), 0, -0.02, 0.03, 'organ_intestine_large', 'digestive');
  colon.rotation.set(Math.PI / 2, 0, Math.PI * 0.72);
  // abdominal aorta + IVC
  mesh(spineL, cyl(0.011, 0.013, 0.24), MAT.blood(), -0.015, 0.05, -0.055, 'vessel_aorta_abdominal', 'circulatory', false);

  // ---------------- THORACIC SPINE / CHEST ----------------
  const spineT = joint(spineL, 'spine_T', 0, 0.17, 0, refs);
  for (let i = 0; i < 12; i++) {
    mesh(spineT, cyl(0.022, 0.023, 0.02), MAT.bone(), 0, 0.005 + i * 0.0145, -0.052, `bone_vert_${7 + i}`, 'skeletal');
  }
  mesh(spineT, cyl(0.007, 0.007, 0.19), MAT.nerve(), 0, 0.09, -0.052, 'organ_spinal_cord_thoracic', 'nervous', false);
  // ribs — 12 pairs, true→false→floating (pulled inside the chest skin)
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const r = 0.105 + Math.sin(t * Math.PI) * 0.03;
    const y = 0.165 - i * 0.0135;
    for (const s of [1, -1]) {
      const rib = mesh(spineT, new THREE.TorusGeometry(r, 0.0062, 8, 26, Math.PI * (0.95 - t * 0.25)), MAT.bone(),
        0, y, 0.01, `bone_rib_${i + 1}_${s === 1 ? 'L' : 'R'}`, 'skeletal');
      rib.rotation.set(Math.PI / 2 + 0.12, 0, s === 1 ? Math.PI * 0.52 : -Math.PI * 0.35);
      rib.scale.set(1, 0.82, 1);
    }
  }
  mesh(spineT, box(0.035, 0.15, 0.014), MAT.bone(), 0, 0.085, 0.118, 'bone_sternum', 'skeletal');
  // clavicles + scapulae
  for (const s of [1, -1]) {
    const cl = mesh(spineT, cyl(0.008, 0.008, 0.15), MAT.bone(), s * 0.10, 0.175, 0.10, `bone_clavicle_${s === 1 ? 'L' : 'R'}`, 'skeletal');
    cl.rotation.z = Math.PI / 2 - s * 0.12;
    cl.rotation.y = s * 0.25;
    const sc = mesh(spineT, box(0.09, 0.11, 0.012), MAT.bone(), s * 0.10, 0.10, -0.115, `bone_scapula_${s === 1 ? 'L' : 'R'}`, 'skeletal');
    sc.rotation.y = -s * 0.25;
    sc.rotation.z = s * 0.1;
  }
  // chest skin + pectorals + lats
  const chestSkin = skin(spineT, cyl(0.155, 0.145, 0.24, 24), 0, 0.09, 0.005, 'skin_chest');
  chestSkin.scale.set(1.06, 1, 0.86);
  refs.thorax = chestSkin;
  for (const s of [1, -1]) {
    const pec = mesh(spineT, sph(0.062), MAT.muscle(), s * 0.068, 0.135, 0.09, `muscle_pectoralis_major_${s === 1 ? 'L' : 'R'}`, 'muscular');
    pec.scale.set(1.15, 0.85, 0.42);
    const lat = mesh(spineT, sph(0.07), MAT.muscleDark(), s * 0.115, 0.03, -0.075, `muscle_latissimus_dorsi_${s === 1 ? 'L' : 'R'}`, 'muscular');
    lat.scale.set(0.55, 1.15, 0.7);
    const trap = mesh(spineT, box(0.09, 0.16, 0.03), MAT.muscle(), s * 0.055, 0.175, -0.085, `muscle_trapezius_${s === 1 ? 'L' : 'R'}`, 'muscular');
    trap.rotation.z = s * -0.35;
  }
  // diaphragm dome
  const dia = mesh(spineT, new THREE.SphereGeometry(0.125, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), MAT.diaphragm(), 0, -0.015, 0.005, 'muscle_diaphragm', 'respiratory');
  dia.scale.set(1.05, 0.75, 0.85);
  refs.diaphragm = dia;
  // trachea + bronchi
  mesh(spineT, cyl(0.011, 0.011, 0.09), MAT.airway(), 0, 0.175, 0.03, 'organ_trachea_lower', 'respiratory', false);
  for (const s of [1, -1]) {
    const br = mesh(spineT, cyl(0.007, 0.007, 0.05), MAT.airway(), s * 0.03, 0.135, 0.03, `organ_bronchus_${s === 1 ? 'L' : 'R'}`, 'respiratory', false);
    br.rotation.z = s * -0.7;
  }
  // lungs
  for (const s of [1, -1]) {
    const lung = mesh(spineT, sph(0.062, 22, 18), MAT.lung(), s * 0.082, 0.075, 0.01, `organ_lung_${s === 1 ? 'L' : 'R'}`, 'respiratory');
    lung.scale.set(0.95, 1.45, 0.95);
    refs.lungs.push(lung);
  }
  // heart (2/3 left of midline)
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
  // aorta (arch + descending)
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

  // ---------------- NECK ----------------
  const neck = joint(spineT, 'neck', 0, 0.215, 0.005, refs);
  for (let i = 0; i < 7; i++) {
    mesh(neck, cyl(0.016, 0.017, 0.014), MAT.bone(), 0, 0.005 + i * 0.012, -0.012, `bone_vert_${i}`, 'skeletal');
  }
  mesh(neck, cyl(0.006, 0.006, 0.1), MAT.nerve(), 0, 0.045, -0.012, 'organ_spinal_cord_cervical', 'nervous', false);
  mesh(neck, cyl(0.010, 0.010, 0.09), MAT.airway(), 0, 0.04, 0.032, 'organ_trachea_upper', 'respiratory', false);
  mesh(neck, box(0.034, 0.028, 0.014), MAT.thyroid(), 0, 0.015, 0.038, 'organ_thyroid', 'endocrine');
  mesh(neck, cyl(0.008, 0.008, 0.03), MAT.bone(), 0, 0.045, 0.035, 'bone_hyoid', 'skeletal');
  for (const s of [1, -1]) {
    const scm = mesh(neck, cap(0.014, 0.07), MAT.muscle(), s * 0.032, 0.04, 0.015, `muscle_sternocleidomastoid_${s === 1 ? 'L' : 'R'}`, 'muscular');
    scm.rotation.z = s * 0.18;
    scm.rotation.x = 0.1;
  }
  skin(neck, cyl(0.052, 0.058, 0.11, 18), 0, 0.045, 0.005, 'skin_neck');

  // ---------------- HEAD ----------------
  const head = joint(neck, 'head', 0, 0.105, 0.005, refs);
  const cranium = mesh(head, sph(0.102, 28, 22), MAT.bone(), 0, 0.035, -0.005, 'bone_cranium', 'skeletal');
  cranium.scale.set(0.92, 1.05, 1.0);
  mesh(head, box(0.075, 0.07, 0.045), MAT.bone(), 0, -0.035, 0.055, 'bone_face', 'skeletal');
  mesh(head, box(0.03, 0.02, 0.03), MAT.bone(), 0, 0.0, 0.085, 'bone_nasal', 'skeletal');
  const brainM = mesh(head, sph(0.082, 26, 20), MAT.brain(), 0, 0.045, -0.008, 'organ_brain', 'nervous');
  brainM.scale.set(0.9, 0.95, 1.0);
  mesh(head, sph(0.028), MAT.brain(), 0, -0.005, -0.075, 'organ_cerebellum', 'nervous').scale.set(1.1, 0.8, 0.7);
  mesh(head, cyl(0.014, 0.018, 0.05), MAT.brain(), 0, -0.03, -0.045, 'organ_brainstem', 'nervous').rotation.x = 0.3;
  mesh(head, sph(0.007), MAT.pituitary(), 0, -0.005, 0.01, 'organ_pituitary', 'endocrine', false);
  for (const s of [1, -1]) {
    const eye = mesh(head, sph(0.017, 16, 12), MAT.eye(), s * 0.036, 0.005, 0.086, `organ_eye_${s === 1 ? 'L' : 'R'}`, 'nervous');
    refs.eyes.push(eye);
    mesh(head, sph(0.007, 12, 10), MAT.pupil(), s * 0.036, 0.005, 0.098, `organ_pupil_${s === 1 ? 'L' : 'R'}`, 'nervous', false);
    const ear = mesh(head, sph(0.02, 12, 10), MAT.cartilage(), s * 0.104, 0.01, -0.005, `organ_ear_${s === 1 ? 'L' : 'R'}`, 'nervous', false);
    ear.scale.set(0.45, 1.0, 0.7);
    const mass = mesh(head, box(0.025, 0.05, 0.03), MAT.muscle(), s * 0.052, -0.05, 0.045, `muscle_masseter_${s === 1 ? 'L' : 'R'}`, 'muscular');
    mass.rotation.z = s * 0.15;
  }
  mesh(head, box(0.095, 0.03, 0.02), MAT.muscle(), 0, 0.075, 0.075, 'muscle_frontalis', 'muscular');
  const jaw = joint(head, 'jaw', 0, -0.055, 0.03, refs);
  mesh(jaw, box(0.085, 0.035, 0.05), MAT.bone(), 0, -0.01, 0.03, 'bone_mandible', 'skeletal');
  mesh(jaw, box(0.016, 0.045, 0.03), MAT.bone(), 0.045, 0.015, 0.005, 'bone_mandible_ramus_L', 'skeletal');
  mesh(jaw, box(0.016, 0.045, 0.03), MAT.bone(), -0.045, 0.015, 0.005, 'bone_mandible_ramus_R', 'skeletal');
  const headGeo = sph(0.106, 48, 36);
  sculptHeadFace(headGeo, 0.106);
  const headSkin = skin(head, headGeo, 0, 0.03, 0.008, 'skin_head');
  headSkin.scale.set(0.93, 1.07, 0.99);

  // ---------------- ARMS ----------------
  for (const s of [1, -1]) {
    const S = s === 1 ? 'L' : 'R';
    const sh = joint(spineT, `shoulder_${S}`, s * 0.205, 0.165, 0, refs);
    mesh(sh, sph(0.058), MAT.muscle(), 0, -0.01, 0, `muscle_deltoid_${S}`, 'muscular').scale.set(1, 1.15, 1);
    mesh(sh, cyl(0.013, 0.015, 0.26), MAT.bone(), 0, -0.155, 0, `bone_humerus_${S}`, 'skeletal');
    mesh(sh, sph(0.024), MAT.bone(), 0, -0.285, 0, `bone_humerus_condyle_${S}`, 'skeletal');
    const bi = mesh(sh, cap(0.032, 0.15), MAT.muscle(), 0, -0.15, 0.022, `muscle_biceps_brachii_${S}`, 'muscular');
    bi.scale.set(1, 1, 1);
    mesh(sh, cap(0.034, 0.16), MAT.muscleDark(), 0, -0.15, -0.02, `muscle_triceps_brachii_${S}`, 'muscular');
    mesh(sh, cyl(0.005, 0.005, 0.26), MAT.nerve(), 0, -0.15, 0.005, `nerve_median_${S}`, 'nervous', false);
    skin(sh, sph(0.068, 18, 14), 0, -0.01, 0, `skin_shoulder_${S}`).scale.set(1, 1.12, 1);
    skin(sh, cap(0.060, 0.20), 0, -0.15, 0, `skin_arm_upper_${S}`);

    const el = joint(sh, `elbow_${S}`, 0, -0.30, 0, refs);
    mesh(el, cyl(0.010, 0.012, 0.23), MAT.bone(), s * 0.012, -0.125, 0.004, `bone_radius_${S}`, 'skeletal');
    mesh(el, cyl(0.011, 0.009, 0.23), MAT.bone(), -s * 0.012, -0.125, -0.004, `bone_ulna_${S}`, 'skeletal');
    mesh(el, cap(0.030, 0.14), MAT.muscle(), 0, -0.10, 0.008, `muscle_forearm_flexors_${S}`, 'muscular');
    mesh(el, cap(0.026, 0.13), MAT.muscleDark(), 0, -0.11, -0.018, `muscle_forearm_extensors_${S}`, 'muscular');
    skin(el, cap(0.047, 0.22), 0, -0.13, 0, `skin_forearm_${S}`);

    const wr = joint(el, `wrist_${S}`, 0, -0.27, 0, refs);
    for (let c = 0; c < 8; c++) {
      mesh(wr, box(0.014, 0.012, 0.014), MAT.bone(), (c % 4 - 1.5) * 0.016, -0.012 - Math.floor(c / 4) * 0.014, 0, `bone_carpal_${c}_${S}`, 'skeletal');
    }
    for (let mc = 0; mc < 5; mc++) {
      mesh(wr, box(0.011, 0.062, 0.011), MAT.bone(), (mc - 2) * 0.017, -0.06, 0, `bone_metacarpal_${mc + 1}_${S}`, 'skeletal');
    }
    skin(wr, box(0.075, 0.16, 0.032), 0, -0.085, 0, `skin_hand_${S}`);
    // fingers (thumb + 4)
    const fingerX = [0.045, 0.026, 0.009, -0.009, -0.026];
    fingerX.forEach((fx, fi) => {
      const isThumb = fi === 0;
      const fg = new THREE.Group();
      fg.name = `finger_${S}_${fi}`;
      fg.position.set(s === 1 ? fx : -fx, isThumb ? -0.10 : -0.16, isThumb ? 0.008 : 0);
      if (isThumb) { fg.rotation.z = s * -0.7; fg.rotation.y = s * 0.3; }
      wr.add(fg);
      const segs = isThumb ? 2 : 3;
      for (let p = 0; p < segs; p++) {
        const len = isThumb ? 0.028 : 0.026 - p * 0.004;
        mesh(fg, cyl(0.006, 0.0055, len), MAT.bone(), 0, -0.012 - p * (len + 0.004), 0, `bone_phalanx_hand_${fi}_${p + 1}_${S}`, 'skeletal', false);
        mesh(fg, cap(0.0085, len), MAT.skin(), 0, -0.012 - p * (len + 0.004), 0, `skin_finger_${S}_${fi}_${p}`, 'integumentary', false);
      }
    });
  }

  // ---------------- LEGS ----------------
  for (const s of [1, -1]) {
    const S = s === 1 ? 'L' : 'R';
    const hip = joint(pelvis, `hip_${S}`, s * 0.095, -0.03, 0, refs);
    mesh(hip, cyl(0.016, 0.019, 0.40), MAT.bone(), 0, -0.225, 0, `bone_femur_${S}`, 'skeletal');
    mesh(hip, sph(0.024), MAT.bone(), 0, -0.015, 0, `bone_femur_head_${S}`, 'skeletal');
    mesh(hip, cap(0.048, 0.26), MAT.muscle(), 0, -0.21, 0.028, `muscle_quadriceps_femoris_${S}`, 'muscular');
    mesh(hip, cap(0.046, 0.25), MAT.muscleDark(), 0, -0.21, -0.028, `muscle_hamstrings_${S}`, 'muscular');
    mesh(hip, cyl(0.007, 0.007, 0.38), MAT.nerve(), 0, -0.21, -0.045, `nerve_sciatic_${S}`, 'nervous', false);
    skin(hip, cap(0.078, 0.30), 0, -0.215, 0, `skin_thigh_${S}`);

    const knee = joint(hip, `knee_${S}`, 0, -0.45, 0, refs);
    mesh(knee, sph(0.022), MAT.bone(), 0, -0.005, 0.048, `bone_patella_${S}`, 'skeletal').scale.set(1, 1.2, 0.6);
    mesh(knee, cyl(0.017, 0.014, 0.37), MAT.bone(), s * 0.008, -0.205, 0.008, `bone_tibia_${S}`, 'skeletal');
    mesh(knee, cyl(0.008, 0.007, 0.36), MAT.bone(), -s * 0.032, -0.20, -0.004, `bone_fibula_${S}`, 'skeletal');
    mesh(knee, cap(0.040, 0.17), MAT.muscle(), 0, -0.12, -0.024, `muscle_gastrocnemius_${S}`, 'muscular');
    mesh(knee, cap(0.034, 0.20), MAT.muscleDark(), 0, -0.18, -0.026, `muscle_soleus_${S}`, 'muscular');
    skin(knee, cap(0.066, 0.30), 0, -0.20, 0, `skin_leg_${S}`);

    const ank = joint(knee, `ankle_${S}`, 0, -0.40, 0, refs);
    mesh(ank, box(0.05, 0.05, 0.06), MAT.bone(), 0, -0.015, -0.01, `bone_tarsal_0_${S}`, 'skeletal');
    mesh(ank, box(0.045, 0.045, 0.07), MAT.bone(), 0, -0.045, -0.040, `bone_tarsal_1_${S}`, 'skeletal');
    for (let mt = 0; mt < 5; mt++) {
      mesh(ank, box(0.012, 0.014, 0.075), MAT.bone(), (mt - 2) * 0.017, -0.055, 0.055, `bone_metatarsal_${mt + 1}_${S}`, 'skeletal');
      mesh(ank, box(0.013, 0.012, 0.022), MAT.bone(), (mt - 2) * 0.017, -0.058, 0.105, `bone_phalanx_foot_${mt}_1_${S}`, 'skeletal', false);
    }
    skin(ank, box(0.088, 0.07, 0.24), 0, -0.055, 0.042, `skin_foot_${S}`);
  }

  // ---------------- MICRO STAGE (side examination platform) ----------------
  const micro = refs.micro;
  micro.position.set(-2.05, 0, -0.7);
  scene.add(micro);
  const ped = new THREE.Mesh(cyl(0.28, 0.34, 1.0, 24), M(0x20262f, { m: 0.7, r: 0.4 }));
  ped.position.y = 0.5;
  ped.castShadow = true;
  micro.add(ped);
  const plat = new THREE.Mesh(cyl(0.5, 0.5, 0.05, 32), M(0x0d2b33, { m: 0.6, r: 0.4, e: 0x0a3a44, ei: 0.8 }));
  plat.position.y = 1.02;
  micro.add(plat);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.75, 32, 1, true), M(0x2dd4bf, { t: true, o: 0.07, e: 0x2dd4bf, ei: 0.4 }));
  beam.position.y = 1.42;
  micro.add(beam);

  // ATOM — oxygen
  const atom = new THREE.Group();
  atom.position.y = 1.42;
  const nuc = new THREE.Mesh(sph(0.09, 24, 18), M(0xef4444, { e: 0x7f1d1d, ei: 0.8, r: 0.35 }));
  nuc.name = 'atom_oxygen';
  atom.add(nuc);
  for (let sh = 0; sh < 2; sh++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17 + sh * 0.1, 0.004, 8, 48), M(0x67e8f9, { e: 0x0e7490, ei: 1 }));
    ring.rotation.x = Math.PI / 2 + sh * 0.5;
    ring.rotation.y = sh * 0.4;
    atom.add(ring);
  }
  const electrons = new THREE.Group();
  for (let e = 0; e < 8; e++) {
    const el = new THREE.Mesh(sph(0.016, 12, 10), M(0x67e8f9, { e: 0x22d3ee, ei: 2 }));
    const shell = e < 2 ? 0.17 : 0.27;
    const a = (e / 8) * Math.PI * 2;
    el.position.set(Math.cos(a) * shell, e < 2 ? 0 : Math.sin(e * 2.3) * 0.08, Math.sin(a) * shell);
    electrons.add(el);
  }
  atom.add(electrons);
  atom.userData.spin = electrons;
  micro.add(atom);
  refs.microModels.atom = atom;

  // MOLECULE — H2O + DNA segment
  const mol = new THREE.Group();
  mol.position.y = 1.42;
  const oAt = new THREE.Mesh(sph(0.085, 22, 16), M(0xef4444, { r: 0.35 }));
  oAt.name = 'mol_water';
  mol.add(oAt);
  for (const sx of [1, -1]) {
    const h = new THREE.Mesh(sph(0.045, 16, 12), M(0xf8fafc, { r: 0.35 }));
    h.position.set(sx * 0.105, -0.075, 0);
    mol.add(h);
    const bond = new THREE.Mesh(cyl(0.014, 0.014, 0.12), M(0x94a3b8));
    bond.position.set(sx * 0.055, -0.038, 0);
    bond.rotation.z = sx * 0.95;
    mol.add(bond);
  }
  // DNA double helix beside it
  const dna = new THREE.Group();
  dna.position.set(0.32, -0.16, 0);
  for (const off of [0, Math.PI]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push(new THREE.Vector3(Math.cos(t * Math.PI * 4 + off) * 0.055, t * 0.34, Math.sin(t * Math.PI * 4 + off) * 0.055));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.009, 8), M(off === 0 ? 0x2dd4bf : 0xf2c230, { e: 0x134e4a, ei: 0.7 }));
    dna.add(tube);
  }
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const rung = new THREE.Mesh(cyl(0.006, 0.006, 0.11), M(0xe2e8f0, { r: 0.4 }));
    rung.position.set(0, t * 0.34, 0);
    rung.rotation.z = Math.PI / 2;
    rung.rotation.y = t * Math.PI * 4;
    dna.add(rung);
  }
  mol.add(dna);
  micro.add(mol);
  refs.microModels.molecule = mol;

  // CELL — animal cell with organelles
  const cell = new THREE.Group();
  cell.position.y = 1.42;
  const membrane = new THREE.Mesh(sph(0.26, 32, 24), M(0x7dd3fc, { t: true, o: 0.22, e: 0x0369a1, ei: 0.5, r: 0.2 }));
  membrane.name = 'cell_generic';
  cell.add(membrane);
  const nucleus = new THREE.Mesh(sph(0.095, 22, 16), M(0xa855f7, { e: 0x581c87, ei: 0.7, r: 0.4 }));
  nucleus.name = 'cell_nucleus';
  nucleus.position.set(-0.05, 0.03, 0.03);
  cell.add(nucleus);
  const nucleolus = new THREE.Mesh(sph(0.035, 14, 10), M(0xf0abfc, { e: 0xa21caf, ei: 0.8 }));
  nucleolus.position.copy(nucleus.position);
  cell.add(nucleolus);
  for (let i = 0; i < 5; i++) {
    const mito = new THREE.Mesh(cap(0.022, 0.05), M(0xfb923c, { e: 0x7c2d12, ei: 0.6 }));
    const a = (i / 5) * Math.PI * 2;
    mito.position.set(Math.cos(a) * 0.15, Math.sin(i * 2.1) * 0.1, Math.sin(a) * 0.15);
    mito.rotation.set(a, i, 0);
    cell.add(mito);
  }
  for (let i = 0; i < 3; i++) {
    const er = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 20, Math.PI * 1.4), M(0x4ade80, { e: 0x14532d, ei: 0.6 }));
    er.position.set(0.09, -0.06 + i * 0.03, -0.05);
    er.rotation.set(0.4, i * 0.7, 0.2);
    cell.add(er);
  }
  micro.add(cell);
  refs.microModels.cell = cell;

  // TISSUE — epithelial sheet + collagen
  const tissue = new THREE.Group();
  tissue.position.y = 1.42;
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 4; iz++) {
    const c = new THREE.Mesh(box(0.085, 0.07, 0.085), M(0xf9a8d4, { r: 0.5 }));
    c.position.set((ix - 1.5) * 0.095, 0, (iz - 1.5) * 0.095);
    tissue.add(c);
    const n = new THREE.Mesh(sph(0.02, 10, 8), M(0x9d174d));
    n.position.set((ix - 1.5) * 0.095, 0, (iz - 1.5) * 0.095);
    tissue.add(n);
  }
  for (let i = 0; i < 6; i++) {
    const fib = new THREE.Mesh(cyl(0.008, 0.008, 0.5), M(0xfde68a, { e: 0x92400e, ei: 0.4 }));
    fib.position.set(-0.2 + i * 0.08, -0.12, 0);
    fib.rotation.z = Math.PI / 2 + (i % 2) * 0.12;
    tissue.add(fib);
  }
  const muscleFibers = new THREE.Group();
  muscleFibers.position.y = 0.22;
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(cap(0.028, 0.34), M(0xef4444, { r: 0.55 }));
    f.position.set((i - 2) * 0.07, 0, 0);
    f.rotation.z = Math.PI / 2;
    muscleFibers.add(f);
  }
  tissue.add(muscleFibers);
  micro.add(tissue);
  refs.microModels.tissue = tissue;

  for (const k of Object.keys(refs.microModels)) refs.microModels[k].visible = false;

  return refs;
}

// ---------- joint control (degrees, clamped to anatomical ROM) ----------
const clampMap = new Map(JOINTS.map((j) => [j.joint_id, j]));

export function setJointTarget(refs: BodyRefs, id: string, x: number, y: number, z: number): [number, number, number] {
  const def = clampMap.get(id);
  let cx = x, cy = y, cz = z;
  if (def) {
    cx = Math.min(def.max[0], Math.max(def.min[0], x));
    cy = Math.min(def.max[1], Math.max(def.min[1], y));
    cz = Math.min(def.max[2], Math.max(def.min[2], z));
  }
  refs.targets[id] = [cx, cy, cz];
  return [cx, cy, cz];
}

export function getJointCurrent(refs: BodyRefs, id: string): [number, number, number] {
  const j = refs.joints.get(id);
  if (!j) return [0, 0, 0];
  return [THREE.MathUtils.radToDeg(j.rotation.x), THREE.MathUtils.radToDeg(j.rotation.y), THREE.MathUtils.radToDeg(j.rotation.z)];
}

export function applyPoseTargets(refs: BodyRefs, joints: Record<string, [number, number, number]>) {
  for (const id of Object.keys(refs.targets)) {
    if (id === 'pelvis_root' || id === 'head') continue;
    refs.targets[id] = [0, 0, 0];
  }
  for (const [id, v] of Object.entries(joints)) setJointTarget(refs, id, v[0], v[1], v[2]);
}

// ---------- visibility ----------
export function setSystemsVisible(refs: BodyRefs, systems: Set<string>) {
  refs.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if ((m as THREE.Mesh).isMesh) {
      const sys = (m.userData.system as string) || 'skeletal';
      m.visible = systems.has(sys);
    }
  });
}

export function setSkinOpacity(refs: BodyRefs, opacity: number) {
  for (const m of refs.skinMeshes) {
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.transparent = opacity < 1;
    mat.opacity = opacity;
    mat.needsUpdate = true;
  }
}

export function setMicroLayer(refs: BodyRefs, layer: string | null) {
  for (const k of Object.keys(refs.microModels)) refs.microModels[k].visible = k === layer;
  if (refs.microLabel) {
    refs.micro.remove(refs.microLabel);
    refs.microLabel = null;
  }
  if (layer && refs.microModels[layer]) {
    const labels: Record<string, [string, string]> = {
      atom: ['اتم اکسیژن — ۸ الکترون', 'O · ~10⁻¹⁰ m · مدل بور'],
      molecule: ['مولکول آب + قطعه DNA', 'H₂O · 104.5° · مارپیچ دوگانه'],
      cell: ['سلول جانوری', 'هسته، میتوکندری، شبکه آندوپلاسمی'],
      tissue: ['بافت پوششی + عضلانی', 'اپیتلیوم · فیبر کلاژن · تار عضلانی'],
    };
    const [fa, en] = labels[layer] || [layer, ''];
    const sp = makeLabel(fa, en);
    sp.position.set(0, 2.05, 0);
    refs.micro.add(sp);
    refs.microLabel = sp;
  }
}

// ---------- selection highlight ----------
export function flashPart(refs: BodyRefs, partId: string, color = 0x2dd4bf): THREE.Vector3 | null {
  let found: THREE.Mesh | null = null;
  refs.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.name === partId && !found) found = m;
  });
  refs.micro.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.name === partId || m.name.startsWith(partId)) && !found) found = m;
  });
  if (!found) return null;
  const f = found as THREE.Mesh;
  const orig = f.material as THREE.MeshStandardMaterial;
  const mat = orig.clone();
  mat.userData.origEmissive = orig.emissive ? orig.emissive.getHex() : 0x000000;
  mat.userData.origEmissiveIntensity = orig.emissiveIntensity ?? 1;
  mat.emissive = new THREE.Color(color);
  mat.emissiveIntensity = 1.4;
  f.material = mat;
  const wp = new THREE.Vector3();
  f.getWorldPosition(wp);
  if (refs.selected && refs.selected !== f) clearFlash(refs);
  refs.selected = f;
  setTimeout(() => { if (refs.selected === f) { /* keep until next selection */ } }, 0);
  return wp;
}

export function clearFlash(refs: BodyRefs) {
  // restore by rebuilding material color only (emissive off)
  if (refs.selected) {
    const m = refs.selected as THREE.Mesh;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat && 'emissive' in mat) {
      mat.emissive = new THREE.Color(mat.userData.origEmissive ?? 0x000000);
      mat.emissiveIntensity = mat.userData.origEmissiveIntensity ?? 1;
    }
    refs.selected = null;
  }
}

// ---------- per-frame animator ----------
export interface VitalParams {
  heartRate: number;
  breathRate: number;
  breathAmp: number;
  // emergent physiology (metabolism) — optional for backward compatibility
  breathPhase?: number; // 0..1 CPG phase
  flush?: number;       // 0..1 skin vasodilation (blushing)
  sweat?: number;       // 0..1 skin moisture (sheen)
  shiver?: number;      // 0..1 shivering tremor
  fatigue?: number;     // 0..1 whole-body fatigue (posture sags)
  coreTemp?: number;    // °C core body temperature
  skinTemp?: number;    // °C peripheral skin temperature
  spo2?: number;        // % oxygen saturation
  bp?: string;          // "systolic/diastolic" mmHg
  limbic?: LimbicState; // pain, mood, needs — the body's inner life
}

// gravity droop (deg) — how far each joint family sags when muscles relax
const DROOP: Record<string, [number, number, number]> = {
  neck: [1.1, 0, 0], jaw: [0.7, 0, 0],
  spine_T: [0.6, 0, 0], spine_L: [0.4, 0, 0],
  shoulder_L: [0, 0, -1.1], shoulder_R: [0, 0, 1.1],
  elbow_L: [0, 0, -0.8], elbow_R: [0, 0, 0.8],
  wrist_L: [0, 0, -0.5], wrist_R: [0, 0, 0.5],
};

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

export function animateBody(refs: BodyRefs, t: number, dt: number, v: VitalParams) {
  const flush = v.flush ?? 0;
  const sweat = v.sweat ?? 0;
  const shiver = v.shiver ?? 0;
  const fatigue = v.fatigue ?? 0;
  const limb = v.limbic;
  const pain = limb?.pain ?? 0;
  const arousal = limb?.arousal ?? 0;
  const asleep = limb?.asleep ?? false;
  const sad = asleep ? 0.6 : Math.max(0, -(limb?.valence ?? 0)); // distress sags the frame
  const decay = Math.exp(-dt / 0.15); // motor twitch offset decay

  // ---- muscle-driven joint dynamics (2nd order) ----
  // muscles are springs with activation-dependent stiffness: effort raises
  // stiffness, fatigue softens it, gravity droop and postural sway bias the
  // target — the body settles like flesh, not like a keyframed rig.
  for (const [id, j] of refs.joints) {
    const tg = refs.targets[id];
    if (!tg) continue;
    const ms = refs.muscle[id] || (refs.muscle[id] = { a: 0, f: 0, hy: 0, vx: 0, vy: 0, vz: 0 });
    const mo = refs.motorOffsets[id];
    const ph = hash01(id) * Math.PI * 2;
    // idle postural sway (legs sway less — they must hold the stance)
    const legW = id.includes('hip') || id.includes('knee') || id.includes('ankle') ? 0.4 : 1;
    const swayX = (Math.sin(t * 0.31 + ph) * 0.26 + Math.sin(t * 0.53 + ph * 2) * 0.11) * legW;
    const swayZ = (Math.cos(t * 0.27 + ph) * 0.22 + Math.sin(t * 0.41 + ph) * 0.09) * legW;
    // shivering tremor: fast out-of-phase micro motion, feeds back as heat
    let tremor = shiver > 0.01 ? (Math.sin(t * 47 + ph * 7) + Math.sin(t * 61 + ph * 3)) * 0.38 * shiver : 0;
    // pain tremor: the hurt body shakes
    if (pain > 0.05) tremor += Math.sin(t * 53 + ph * 5) * 1.3 * pain;
    // gravity droop: always present, worsens with fatigue and sadness
    const dr = DROOP[id];
    let droopW = 0.35 + fatigue * 0.75 + sad * 0.5;
    if (asleep && (id === 'jaw' || id === 'neck')) droopW += 0.5; // slack jaw, heavy head in sleep
    const dx = tg[0] + (mo ? mo[0] : 0) + swayX * (asleep ? 0.3 : 1) + tremor + (dr ? dr[0] * droopW : 0);
    const dy = tg[1] + (mo ? mo[1] : 0) + (dr ? dr[1] * droopW : 0);
    const dz = tg[2] + (mo ? mo[2] : 0) + swayZ + tremor + (dr ? dr[2] * droopW : 0);
    const tx = THREE.MathUtils.degToRad(dx);
    const ty = THREE.MathUtils.degToRad(dy);
    const tz = THREE.MathUtils.degToRad(dz);

    // activation: ramps fast toward needed effort, relaxes slower
    const err = Math.max(Math.abs(tx - j.rotation.x), Math.abs(ty - j.rotation.y), Math.abs(tz - j.rotation.z));
    const need = Math.min(1, err * 9 + Math.abs(ms.vx + ms.vy + ms.vz) * 0.4);
    const ka = need > ms.a ? 1 - Math.exp(-dt / 0.08) : 1 - Math.exp(-dt / 0.4);
    ms.a += (need - ms.a) * ka;
    // local fatigue: sustained high effort tires the muscle, rest restores it
    ms.f = Math.min(0.7, Math.max(0, ms.f + (ms.a > 0.55 ? (ms.a - 0.55) * 0.012 : -0.007) * dt));
    // long-term adaptation (Wolff): sustained work hypertrophies the muscle,
    // idleness atrophies it — the body slowly becomes what it does
    ms.hy = Math.min(1, Math.max(0, ms.hy + (ms.a > 0.45 ? (ms.a - 0.45) * 0.003 : -0.0002) * dt));

    // spring-damper per axis: tired flesh softens, arousal (fear/pain) stiffens,
    // trained muscle (hypertrophy) is stronger and stiffer at the same effort
    const K = 55 * (1 - 0.4 * fatigue) * (1 - 0.5 * ms.f) * (0.3 + 0.7 * ms.a) * (1 + 0.25 * arousal) * (1 + 0.3 * ms.hy);
    const D = 2 * Math.sqrt(K) * 0.85;
    const corrX = (tx - j.rotation.x) * K - ms.vx * D;
    const corrY = (ty - j.rotation.y) * K - ms.vy * D;
    const corrZ = (tz - j.rotation.z) * K - ms.vz * D;
    ms.vx += corrX * dt; ms.vy += corrY * dt; ms.vz += corrZ * dt;
    j.rotation.x += ms.vx * dt; j.rotation.y += ms.vy * dt; j.rotation.z += ms.vz * dt;

    if (mo) {
      mo[0] *= decay; mo[1] *= decay; mo[2] *= decay;
      if (Math.abs(mo[0]) < 0.05 && Math.abs(mo[1]) < 0.05 && Math.abs(mo[2]) < 0.05) delete refs.motorOffsets[id];
    }
  }
  // heartbeat — lub-dub waveform
  const hb = (t * v.heartRate) / 60;
  const ph = hb % 1;
  const pulse = Math.pow(Math.max(0, Math.sin(ph * Math.PI * 2)), 6) + 0.55 * Math.pow(Math.max(0, Math.sin((ph - 0.18) * Math.PI * 2)), 8);
  if (refs.heart) {
    const s = 1 + pulse * 0.13;
    refs.heart.scale.set(s, s, s);
  }
  if (refs.aorta) {
    const s = 1 + pulse * 0.06;
    refs.aorta.scale.set(s, 1, s);
  }
  // breathing — CPG waveform from the metabolic phase (asymmetric: quicker
  // inspiration, slower expiration with an end-expiratory pause)
  const p = v.breathPhase ?? ((t * v.breathRate) / 60) % 1;
  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.min(1, Math.max(0, x)) * Math.PI);
  const inhale = p < 0.45
    ? ease(p / 0.45)
    : ease(1 - (p - 0.45) / 0.55) * (p > 0.88 ? 0.55 + 0.45 * (1 - p) / 0.1 : 1);
  const amp = v.breathAmp;
  for (const l of refs.lungs) {
    const s = 1 + (inhale - 0.35) * 0.16 * amp;
    l.scale.set(0.95 * s, 1.45 * (1 + (inhale - 0.35) * 0.10 * amp), 0.95 * s);
  }
  if (refs.diaphragm) refs.diaphragm.position.y = -0.015 - inhale * 0.018 * amp;
  // real chest mechanics: thorax expands (ribs lift), abdomen yields
  if (refs.thorax) refs.thorax.scale.set(1.06 * (1 + 0.05 * inhale * amp), 1, 0.86 * (1 + 0.07 * inhale * amp));
  if (refs.abdomen) refs.abdomen.scale.set(1 - 0.025 * inhale * amp, 1, 1 - 0.025 * inhale * amp);
  refs.group.position.y = 0.06 + inhale * 0.004 * amp;
  refs.group.rotation.y = Math.sin(t * 0.25) * 0.008;
  // ---- living skin: vasodilation flush, pallor when cold, sweat sheen ----
  const flushC = FLUSH_COLOR;
  const paleC = PALE_COLOR;
  for (let i = 0; i < refs.skinMeshes.length; i++) {
    const m = refs.skinMeshes[i] as THREE.Mesh;
    const mat = m.material as THREE.MeshStandardMaterial;
    const base = refs.skinBase[i];
    if (!base) continue;
    mat.color.copy(base.c).lerp(flushC, flush * 0.5).lerp(paleC, shiver * 0.35);
    mat.roughness = base.r - sweat * 0.2 + shiver * 0.06;
  }
  // eye blink — or closed lids while asleep
  const blink = asleep ? 0.06 : (t % 4.2) < 0.14 ? 0.12 : 1;
  for (const e of refs.eyes) e.scale.set(1, blink, 1);
  // micro models: gentle rotation + electron orbit
  for (const m of Object.values(refs.microModels)) {
    if (m.visible) m.rotation.y += dt * 0.4;
  }
  const atomSpin = refs.microModels.atom?.userData.spin as THREE.Group | undefined;
  if (atomSpin && refs.microModels.atom.visible) atomSpin.rotation.y += dt * 2.2;
}

export const MICRO_FOCUS = new THREE.Vector3(-2.05, 1.45, -0.7);
export const BODY_FOCUS = new THREE.Vector3(0, 1.05, 0);

// ---------- engineered trait: horns (KRTHORN1/2 expression) ----------
export function setHorns(refs: BodyRefs, visible: boolean): boolean {
  const head = refs.joints.get('head');
  if (!head) return false;
  if (refs.horns.length === 0) {
    const keratin = M(0xcbb08a, { r: 0.35, e: 0x2a1c08, ei: 0.35 });
    for (const s of [1, -1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.17, 14), keratin);
      horn.position.set(s * 0.062, 0.125, -0.005);
      horn.rotation.z = s * -0.42;
      horn.name = s === 1 ? 'horn_L' : 'horn_R';
      horn.userData.system = 'skeletal';
      horn.userData.synthetic = true;
      horn.castShadow = true;
      horn.visible = false;
      head.add(horn);
      refs.horns.push(horn);
    }
  }
  for (const h of refs.horns) h.visible = visible;
  return true;
}

// gradual development: progress 0..1 -> horn length 0..12cm (anchored at skull)
export function setHornGrowth(refs: BodyRefs, progress: number): boolean {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  setHorns(refs, p > 0.01);
  if (refs.horns.length === 0) return false;
  for (const h of refs.horns) {
    h.scale.set(0.45 + 0.55 * p, Math.max(0.02, p), 0.45 + 0.55 * p);
    h.position.y = 0.04 + 0.085 * p;
  }
  return true;
}

// ---------- motor system: neural impulses -> joint twitches ----------
const MOTOR_LIMITS: Record<string, number> = {
  neck: 25, jaw: 15, spine_T: 18, spine_L: 14,
  shoulder_L: 45, shoulder_R: 45, elbow_L: 35, elbow_R: 35,
  wrist_L: 25, wrist_R: 25, hip_L: 30, hip_R: 30,
  knee_L: 35, knee_R: 35, ankle_L: 20, ankle_R: 20,
};

export function queueMotorImpulse(refs: BodyRefs, joint: string, dx: number, dy: number, dz: number): boolean {
  if (!refs.joints.has(joint)) return false;
  const lim = MOTOR_LIMITS[joint] ?? 20;
  const cl = (v: number) => THREE.MathUtils.clamp(v, -lim, lim);
  const mo = refs.motorOffsets[joint] || [0, 0, 0];
  refs.motorOffsets[joint] = [cl(mo[0] + dx), cl(mo[1] + dy), cl(mo[2] + dz)];
  return true;
}
