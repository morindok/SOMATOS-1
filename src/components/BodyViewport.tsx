import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoom, ROOM } from '../three/roomBuilder';
import { buildBody, animateBody, queueMotorImpulse, setJointTarget, getJointCurrent, type BodyRefs, type VitalParams, BODY_FOCUS, MICRO_FOCUS } from '../three/humanBuilder';
import { getBrain, MOTOR_POOL_JOINTS } from '../lib/brain';
import { getMetabolism } from '../lib/metabolism';
import { getLimbic, setCircadianState } from '../lib/limbic';
import { SYSTEMS } from '../data/anatomy';

export interface CameraCmd {
  focus: 'body' | 'micro' | 'part';
  point?: THREE.Vector3;
  dist?: number;
}

export default function BodyViewport({
  bodyRefOut,
  vitalsRef,
  cameraCmd,
  systems,
  skinOpacity,
  paused,
  onPick,
  onFps,
  audioRef,
}: {
  bodyRefOut: (b: BodyRefs | null) => void;
  vitalsRef: React.MutableRefObject<VitalParams>;
  cameraCmd: CameraCmd | null;
  systems: Set<string>;
  skinOpacity: number;
  paused: boolean;
  onPick: (partId: string, system: string, point: THREE.Vector3) => void;
  onFps: (fps: number) => void;
  audioRef: React.MutableRefObject<{ ctx: AudioContext | null; analyser: AnalyserNode | null }>;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef<{ body: BodyRefs | null; camera: THREE.PerspectiveCamera | null; controls: OrbitControls | null; desired: THREE.Vector3; desiredT: THREE.Vector3; save: (() => void) | null }>({
    body: null, camera: null, controls: null,
    desired: new THREE.Vector3(0, 1.35, 3.6), desiredT: BODY_FOCUS.clone(), save: null,
  });
  const picks = useRef(onPick);
  const fpsCb = useRef(onFps);
  const pausedRef = useRef(paused);
  const sysRef = useRef(systems);
  const skinRef = useRef(skinOpacity);
  const keysRef = useRef(new Set<string>());
  useEffect(() => {
    picks.current = onPick;
    fpsCb.current = onFps;
    pausedRef.current = paused;
    sysRef.current = systems;
    skinRef.current = skinOpacity;
  });

  // Keyboard controller: direct joint manipulation at 60fps
  useEffect(() => {
    const KEY_MAP: Record<string, { joint: string; axis: 0 | 1 | 2; dir: number }> = {
      w: { joint: 'neck', axis: 0, dir: 1 }, s: { joint: 'neck', axis: 0, dir: -1 },
      a: { joint: 'neck', axis: 2, dir: -1 }, d: { joint: 'neck', axis: 2, dir: 1 },
      ArrowUp: { joint: 'neck', axis: 1, dir: -1 }, ArrowDown: { joint: 'neck', axis: 1, dir: 1 },
      ArrowLeft: { joint: 'neck', axis: 1, dir: -1 }, ArrowRight: { joint: 'neck', axis: 1, dir: 1 },
      q: { joint: 'shoulder_L', axis: 2, dir: -1 }, e: { joint: 'shoulder_R', axis: 2, dir: 1 },
      r: { joint: 'spine_T', axis: 0, dir: 1 }, f: { joint: 'spine_T', axis: 0, dir: -1 },
      t: { joint: 'shoulder_L', axis: 0, dir: -1 }, g: { joint: 'shoulder_R', axis: 0, dir: -1 },
      y: { joint: 'elbow_L', axis: 0, dir: -1 }, h: { joint: 'elbow_R', axis: 0, dir: -1 },
      u: { joint: 'wrist_L', axis: 1, dir: 1 }, j: { joint: 'wrist_R', axis: 1, dir: 1 },
      i: { joint: 'hip_L', axis: 0, dir: -1 }, k: { joint: 'hip_R', axis: 0, dir: -1 },
      o: { joint: 'knee_L', axis: 0, dir: 1 }, l: { joint: 'knee_R', axis: 0, dir: 1 },
      p: { joint: 'ankle_L', axis: 0, dir: 1 }, ';': { joint: 'ankle_R', axis: 0, dir: 1 },
    };
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in KEY_MAP) { e.preventDefault(); keysRef.current.add(k); }
    };
    const onUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Rebuild visibility when systems/skin change
  useEffect(() => {
    const b = state.current.body;
    if (!b) return;
    b.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const sys = (m.userData.system as string) || 'skeletal';
        m.visible = systems.has(sys);
      }
    });
    for (const m of b.skinMeshes) {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.transparent = skinOpacity < 1;
      mat.opacity = skinOpacity;
      mat.needsUpdate = true;
    }
  }, [systems, skinOpacity]);

  // camera fly commands
  useEffect(() => {
    if (!cameraCmd) return;
    const s = state.current;
    if (cameraCmd.focus === 'micro') {
      s.desired.set(MICRO_FOCUS.x + 0.9, 1.7, MICRO_FOCUS.z + 1.1);
      s.desiredT.copy(MICRO_FOCUS);
    } else if (cameraCmd.focus === 'body') {
      s.desired.set(0, 1.35, 3.6);
      s.desiredT.copy(BODY_FOCUS);
    } else if (cameraCmd.focus === 'part' && cameraCmd.point) {
      const dir = cameraCmd.point.clone().sub(BODY_FOCUS);
      dir.y = 0;
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
      dir.normalize();
      const d = cameraCmd.dist ?? 1.1;
      s.desired.copy(cameraCmd.point).addScaledVector(dir, d).add(new THREE.Vector3(0, 0.18, 0));
      s.desiredT.copy(cameraCmd.point);
    }
  }, [cameraCmd]);

  useEffect(() => {
    const el = mount.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090c);
    scene.fog = new THREE.Fog(0x07090c, 9, 16);

    const camera = new THREE.PerspectiveCamera(46, el.clientWidth / el.clientHeight, 0.05, 60);
    camera.position.set(0, 1.5, 4.4);
    state.current.camera = camera;

    // Clamp camera INSIDE the sealed room — no way out
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(BODY_FOCUS);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.25;
    controls.maxDistance = 4.0;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.minPolarAngle = Math.PI * 0.08;
    state.current.controls = controls;

    // lights
    scene.add(new THREE.AmbientLight(0x9fb4c7, 0.55));
    const hemi = new THREE.HemisphereLight(0xbfd9e8, 0x1a1410, 0.5);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.2, 3.9, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x66e0ff, 1.1);
    rim.position.set(-2.4, 2.4, -2.2);
    scene.add(rim);
    const warm = new THREE.PointLight(0xffd9b0, 6, 8);
    warm.position.set(0, 3.4, 1.2);
    scene.add(warm);
    const microSpot = new THREE.SpotLight(0x2dd4bf, 30, 6, 0.5, 0.5);
    microSpot.position.set(-2.05, 3.8, -0.7);
    microSpot.target.position.set(-2.05, 1.4, -0.7);
    scene.add(microSpot, microSpot.target);

    buildRoom(scene);
    const body = buildBody(scene);
    state.current.body = body;
    bodyRefOut(body);

    // circadian reference — updated each frame, passed to brain/limbic
    const roomGroup = scene.children.find((c) => (c as THREE.Group).name === 'isolation_chamber') as THREE.Group | undefined;
    const circ = (roomGroup as any)?.__circadian as { t: number; phase: number; illumination: number; isDay: boolean; status: () => string; update: (dt: number) => void } | undefined;

    // raycast picking
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let downAt = 0;
    const onDown = () => { downAt = performance.now(); };
    const onUp = (e: PointerEvent) => {
      if (performance.now() - downAt > 250) return; // was a drag
      const r = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects([body.group, body.micro], true);
      const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh && h.object.visible !== false && h.object.name);
      if (hit) {
        const o = hit.object;
        picks.current(o.name, (o.userData.system as string) || 'skeletal', hit.point.clone());
        // touch is FELT: afferent volley + a small startle flinch
        getBrain().sensory(0.35);
        getMetabolism().effort(0.004);
        queueMotorImpulse(body, MOTOR_POOL_JOINTS[0], 0.9, 0.3, 0.5);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    // apply initial systems + skin
    body.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const sys = (m.userData.system as string) || 'skeletal';
        m.visible = sysRef.current.has(sys);
      }
    });

    const clock = new THREE.Clock();
    let raf = 0;
    let frames = 0;
    let lastFps = performance.now();
    let brainAcc = 0;
    const tmpV = new THREE.Vector3();
    const brain = getBrain();
    const metab = getMetabolism();
    const limbic = getLimbic();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // --- keyboard → direct joint targets (zero-latency embodiment) ---
      if (body) {
        const STEP = 1.6; // degrees per frame
        for (const k of keysRef.current) {
          const cfg = (
            k === 'w' ? { j: 'neck', a: 0, d: 1 } :
            k === 's' ? { j: 'neck', a: 0, d: -1 } :
            k === 'a' ? { j: 'neck', a: 2, d: -1 } :
            k === 'd' ? { j: 'neck', a: 2, d: 1 } :
            k === 'arrowup' ? { j: 'neck', a: 1, d: -1 } :
            k === 'arrowdown' ? { j: 'neck', a: 1, d: 1 } :
            k === 'q' ? { j: 'shoulder_L', a: 2, d: -1 } :
            k === 'e' ? { j: 'shoulder_R', a: 2, d: 1 } :
            k === 'r' ? { j: 'spine_T', a: 0, d: 1 } :
            k === 'f' ? { j: 'spine_T', a: 0, d: -1 } :
            k === 't' ? { j: 'shoulder_L', a: 0, d: -1 } :
            k === 'g' ? { j: 'shoulder_R', a: 0, d: -1 } :
            k === 'y' ? { j: 'elbow_L', a: 0, d: -1 } :
            k === 'h' ? { j: 'elbow_R', a: 0, d: -1 } :
            k === 'u' ? { j: 'wrist_L', a: 1, d: 1 } :
            k === 'j' ? { j: 'wrist_R', a: 1, d: 1 } :
            k === 'i' ? { j: 'hip_L', a: 0, d: -1 } :
            k === 'k' ? { j: 'hip_R', a: 0, d: -1 } :
            k === 'o' ? { j: 'knee_L', a: 0, d: 1 } :
            k === 'l' ? { j: 'knee_R', a: 0, d: 1 } :
            k === 'p' ? { j: 'ankle_L', a: 0, d: 1 } :
            k === ';' ? { j: 'ankle_R', a: 0, d: 1 } : null
          );
          if (!cfg) continue;
          const cur = getJointCurrent(body, cfg.j);
          const clamped = setJointTarget(body, cfg.j, cur[0] + (cfg.a === 0 ? cfg.d * STEP : 0), cur[1] + (cfg.a === 1 ? cfg.d * STEP : 0), cur[2] + (cfg.a === 2 ? cfg.d * STEP : 0));
          if (clamped[0] !== cur[0] || clamped[1] !== cur[1] || clamped[2] !== cur[2]) {
            brain.sensory(0.05);
            metab.effort(0.01);
          }
        }
      }

      // --- audio sensing → brain arousal ---
      const au = audioRef.current;
      if (au.analyser) {
        const data = new Uint8Array(au.analyser.frequencyBinCount);
        au.analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        brain.audioSensory(avg);
      }

      // --- live brain: advance the microcosm on the render clock ---
      brainAcc += dt * 1000;
      const brainMs = Math.min(brainAcc, 40);
      brain.advance(brainMs);
      brainAcc = 0;

      // --- circadian cycle ---
      if (circ) {
        circ.update(dt);
        // drive brain waves: more delta during dark phases
        const darkFactor = 1 - circ.illumination;
        brain.setCircadian(darkFactor);
        setCircadianState(circ.phase, circ.illumination);
      }

      // --- neural motor output: pools firing -> occasional gentle twitches ---
      for (const imp of brain.drainMotorImpulses()) {
        const joint = MOTOR_POOL_JOINTS[imp.pool];
        const s = imp.strength;
        queueMotorImpulse(body, joint, (Math.sin(t * 3 + imp.pool * 1.7) * 8) * s, (Math.cos(t * 2.1 + imp.pool) * 4) * s, (Math.sin(t * 1.3 + imp.pool * 2.3) * 6) * s);
      }

      // --- measure real motion (joint angular velocity) ---
      let motion = 0;
      for (const [, j] of body.joints) {
        const tg = body.targets[j.name.replace('joint_', '')];
        if (!tg) continue;
        const dx = Math.abs(j.rotation.x - THREE.MathUtils.degToRad(tg[0]));
        const dy = Math.abs(j.rotation.y - THREE.MathUtils.degToRad(tg[1]));
        const dz = Math.abs(j.rotation.z - THREE.MathUtils.degToRad(tg[2]));
        motion += dx + dy + dz;
      }
      motion = motion / (body.joints.size * 0.5);

      // --- proprioception: real movement feeds the brain back (weak, so the
      // loop can't self-excite into non-stop twitching) ---
      if (motion > 0.05) brain.sensory(motion * 0.15);

      // --- limbic system: needs grow, mood forms, pain decays ---
      const limb = limbic.update(dt, motion);
      if (limb.pain > 0.3) brain.sensory(0.08); // noxious signal reaches the cortex

      // --- emergent metabolism drives the vitals the engine renders ---
      const mstate = metab.update(dt, motion, limb);
      vitalsRef.current.heartRate = mstate.hr;
      vitalsRef.current.breathRate = mstate.br;
      vitalsRef.current.breathAmp = mstate.breathAmp;
      vitalsRef.current.breathPhase = mstate.breathPhase;
      vitalsRef.current.flush = mstate.flush;
      vitalsRef.current.sweat = mstate.sweat;
      vitalsRef.current.shiver = mstate.shiver;
      vitalsRef.current.fatigue = mstate.fatigue;
      vitalsRef.current.coreTemp = mstate.coreTemp;
      vitalsRef.current.skinTemp = mstate.skinTemp;
      vitalsRef.current.spo2 = mstate.spo2;
      vitalsRef.current.bp = `${mstate.sys}/${mstate.dia}`;
      vitalsRef.current.limbic = limb;

      if (!pausedRef.current) animateBody(body, t, dt, vitalsRef.current);

      // camera fly-to
      const s = state.current;
      const cf = 1 - Math.exp(-dt * 3.2);
      camera.position.lerp(s.desired, cf);
      controls.target.lerp(s.desiredT, cf);
      // hard clamp inside room
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -ROOM.W / 2 + 0.3, ROOM.W / 2 - 0.3);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.2, ROOM.H - 0.25);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -ROOM.D / 2 + 0.3, ROOM.D / 2 - 0.3);
      tmpV.copy(controls.target);
      tmpV.x = THREE.MathUtils.clamp(tmpV.x, -ROOM.W / 2, ROOM.W / 2);
      tmpV.y = THREE.MathUtils.clamp(tmpV.y, 0, ROOM.H);
      tmpV.z = THREE.MathUtils.clamp(tmpV.z, -ROOM.D / 2, ROOM.D / 2);
      controls.target.copy(tmpV);
      controls.update();
      renderer.render(scene, camera);

      frames++;
      const now = performance.now();
      if (now - lastFps > 1000) {
        fpsCb.current(Math.round((frames * 1000) / (now - lastFps)));
        frames = 0;
        lastFps = now;
      }
    };
    loop();

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      bodyRefOut(null);
      state.current.body = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mount} className="h-full w-full cursor-crosshair" />
      {/* HUD overlay */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5" dir="ltr">
        <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-950/60 px-2.5 py-1 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="font-mono text-[10px] tracking-widest text-red-200">SEALED · ایزوله · NO I/O</span>
        </div>
        <div className="rounded-md border border-teal-500/30 bg-slate-950/60 px-2.5 py-1 backdrop-blur">
          <span className="font-mono text-[10px] tracking-widest text-teal-200">SOMATOS-1 · 1.70 m · 206 BONES</span>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/10 bg-slate-950/60 px-2.5 py-1 backdrop-blur" dir="ltr">
        <span className="font-mono text-[10px] text-slate-300">drag: orbit · wheel: zoom · click part: inspect</span>
      </div>
    </div>
  );
}

export { SYSTEMS };
