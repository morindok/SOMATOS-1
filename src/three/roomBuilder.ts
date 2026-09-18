import * as THREE from 'three';

// Isolation chamber: a sealed room-like space with NO doors, windows,
// openings, inputs or outputs. Six solid surfaces, scientific grid floor,
// soft clinical lighting rig and a sealed-hatch relief (decorative, closed).

export interface RoomRefs {
  group: THREE.Group;
  hatchLight: THREE.PointLight;
  ringMat: THREE.MeshBasicMaterial;
  circadian?: { t: number; phase: number; illumination: number; isDay: boolean; status: () => string; update: (dt: number) => void };
}

const ROOM_W = 7;
const ROOM_H = 4.2;
const ROOM_D = 7;

export function buildRoom(scene: THREE.Scene): RoomRefs {
  const group = new THREE.Group();
  group.name = 'isolation_chamber';

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.85, metalness: 0.35 });
  // realistic brushed-metal chamber wall texture (patch asset), tinted dark
  if (typeof document !== 'undefined') {
    new THREE.TextureLoader().load(
      'textures/wall.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3, 1.6);
        tex.anisotropy = 4;
        wallMat.map = tex;
        wallMat.color.set(0x6a7684); // tint down to clinical dark
        wallMat.needsUpdate = true;
      },
      undefined,
      () => { /* offline-safe: keep solid shading */ },
    );
  }
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1b2029, roughness: 0.7, metalness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0d2b33, roughness: 0.5, metalness: 0.6, emissive: 0x0a3a44, emissiveIntensity: 0.7 });

  const mkBox = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Six sealed surfaces (no openings at all)
  const T = 0.25; // wall thickness
  mkBox(ROOM_W + T * 2, T, ROOM_D + T * 2, 0, -T / 2, 0, wallMat); // floor slab
  mkBox(ROOM_W + T * 2, T, ROOM_D + T * 2, 0, ROOM_H + T / 2, 0, wallMat); // ceiling
  mkBox(T, ROOM_H, ROOM_D + T * 2, -ROOM_W / 2 - T / 2, ROOM_H / 2, 0, wallMat);
  mkBox(T, ROOM_H, ROOM_D + T * 2, ROOM_W / 2 + T / 2, ROOM_H / 2, 0, wallMat);
  mkBox(ROOM_W, ROOM_H, T, 0, ROOM_H / 2, -ROOM_D / 2 - T / 2, wallMat);
  mkBox(ROOM_W, ROOM_H, T, 0, ROOM_H / 2, ROOM_D / 2 + T / 2, wallMat);

  // Wall panel reliefs (pure decoration — sealed)
  for (let i = -2; i <= 2; i++) {
    mkBox(0.06, ROOM_H * 0.55, 0.5, -ROOM_W / 2 + 0.05, ROOM_H * 0.45, i * 1.2, panelMat);
    mkBox(0.06, ROOM_H * 0.55, 0.5, ROOM_W / 2 - 0.05, ROOM_H * 0.45, i * 1.2, panelMat);
    mkBox(0.5, ROOM_H * 0.55, 0.06, i * 1.2, ROOM_H * 0.45, -ROOM_D / 2 + 0.05, panelMat);
    mkBox(0.5, ROOM_H * 0.55, 0.06, i * 1.2, ROOM_H * 0.45, ROOM_D / 2 - 0.05, panelMat);
  }

  // Glowing seams where walls meet (seal lines)
  const seamGeoH = new THREE.BoxGeometry(ROOM_W, 0.02, 0.02);
  const seamGeoV = new THREE.BoxGeometry(0.02, ROOM_H, 0.02);
  const seam = (geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, accentMat);
    m.position.set(x, y, z);
    group.add(m);
  };
  seam(seamGeoH, 0, 0.02, -ROOM_D / 2 + 0.02);
  seam(seamGeoH, 0, 0.02, ROOM_D / 2 - 0.02);
  seam(seamGeoH, 0, ROOM_H - 0.02, -ROOM_D / 2 + 0.02);
  seam(seamGeoH, 0, ROOM_H - 0.02, ROOM_D / 2 - 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) seam(seamGeoV, (sx * ROOM_W) / 2 - sx * 0.02, ROOM_H / 2, (sz * ROOM_D) / 2 - sz * 0.02);

  // Scientific measurement grid floor (1 m majors, 10 cm minors feel)
  const grid = new THREE.GridHelper(ROOM_W, 14, 0x2dd4bf, 0x223038);
  grid.position.y = 0.005;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.5;
  group.add(grid);

  // Center dais ring — the subject platform
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.68, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.008;
  group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.915, 64), new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.008;
  group.add(ring2);

  const dais = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.66, 0.06, 48),
    new THREE.MeshStandardMaterial({ color: 0x20262f, roughness: 0.4, metalness: 0.8 })
  );
  dais.position.y = 0.03;
  dais.receiveShadow = true;
  group.add(dais);

  // Sealed hatch relief on the back wall — clearly closed / welded (no opening)
  const hatch = new THREE.Group();
  const hatchBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 6), panelMat);
  hatchBase.rotation.x = Math.PI / 2;
  hatch.add(hatchBase);
  const hatchInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a313c, roughness: 0.35, metalness: 0.85 })
  );
  hatchInner.rotation.x = Math.PI / 2;
  hatch.add(hatchInner);
  for (let i = 0; i < 6; i++) {
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), accentMat);
    const a = (i / 6) * Math.PI * 2;
    bolt.position.set(Math.cos(a) * 0.47, Math.sin(a) * 0.47, 0.06);
    hatch.add(bolt);
  }
  // Cross weld bars (sealed shut)
  const barMat = new THREE.MeshStandardMaterial({ color: 0x39424f, roughness: 0.4, metalness: 0.9 });
  for (const rz of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.09, 0.06), barMat);
    bar.rotation.z = rz;
    bar.position.z = 0.08;
    hatch.add(bar);
  }
  hatch.position.set(0, 2.1, -ROOM_D / 2 + 0.12);
  group.add(hatch);

  // Status light above hatch (red = SEALED)
  const hatchLight = new THREE.PointLight(0xff3b30, 2, 4);
  hatchLight.position.set(0, 2.9, -ROOM_D / 2 + 0.5);
  group.add(hatchLight);
  const lampMesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  lampMesh.position.copy(hatchLight.position);
  group.add(lampMesh);

  // Ceiling light panels
  const panelLightMats: THREE.MeshBasicMaterial[] = [];
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6], [0, 0]] as [number, number][]) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xd8f4ff });
    panelLightMats.push(mat);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), mat);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, ROOM_H - 0.01, z);
    group.add(p);
  }

  // Ambient overhead light (drives circadian illumination)
  const ambientLight = new THREE.PointLight(0xd8f4ff, 1.5, ROOM_W * 2);
  ambientLight.position.set(0, ROOM_H - 0.5, 0);
  group.add(ambientLight);

  // Circadian state object returned so the viewport can drive it each frame
  const circadian = {
    t: 0,           // seconds elapsed since boot
    cycleDay: 600,  // 10 min per full cycle in dev (1 day = 10 min)
    get phase() { return (this.t % this.cycleDay) / this.cycleDay; }, // 0..1
    get isDay() { const p = this.phase; return p > 0.2 && p < 0.7; },
    get illumination() {
      const p = this.phase;
      // smooth sine: dark at p=0, max at p=0.5, dark at p=1
      return 0.12 + 0.88 * Math.max(0, Math.sin(p * Math.PI));
    },
    update(dt: number) {
      this.t += dt;
      const i = this.illumination;
      ambientLight.intensity = i * 2.0;
      ambientLight.color.setHSL(0.6 - i * 0.08, 0.3 + i * 0.3, 0.3 + i * 0.5);
      for (const mat of panelLightMats) {
        mat.color.setHSL(0.58, 0.2, 0.15 + i * 0.7);
      }
    },
    // Expose for bridge commands
    status() {
      const p = this.phase;
      const label = p < 0.2 ? 'شب' : p < 0.35 ? 'سحر' : p < 0.7 ? 'روز' : p < 0.85 ? 'غروب' : 'شب';
      const minsLeft = Math.round((p < 0.5 ? 0.5 - p : 1.5 - p) * this.cycleDay / 60);
      const i = this.illumination;
      return `چرخه شب/روز: ${label} · دقیقه ${Math.round(this.t / 60)} · روشنایی ${Math.round(i * 100)}٪`;
    },
  };
  // Store on the group for retrieval
  (group as any).__circadian = circadian;

  scene.add(group);
  return { group, hatchLight, ringMat, circadian };
}

export const ROOM = { W: ROOM_W, H: ROOM_H, D: ROOM_D };
