// SOMATOS-1 emergent metabolism — vitals are CONSEQUENCES of motion, not typed numbers.
// Motion (real joint angular velocity) raises metabolic load; the heart, breath,
// SpO2 and blood pressure follow with realistic first-order dynamics:
//   - heart ramps up fast (sympathetic, tau≈2.5s), recovers slow (vagal, tau≈9s)
//   - breath tracks cardiac output + deepens under load
//   - SpO2 dips slightly under heavy load, recovers after
//   - thermoregulation: muscle heat warms the core; skin vasodilation flushes
//     heat out (visible blushing); sweat evaporates; shivering generates heat
//   - whole-body muscle fatigue accumulates with effort, recovers at rest
//   - respiratory sinus arrhythmia: the heart speeds slightly on each inhale

export interface MetabolicState {
  hr: number;
  br: number;
  spo2: number;
  sys: number;
  dia: number;
  load: number;      // 0..1 smoothed metabolic load
  breathAmp: number;
  breathPhase: number; // 0..1 continuous CPG phase
  coreTemp: number;    // °C
  skinTemp: number;    // °C
  flush: number;       // 0..1 skin vasodilation -> visible blushing
  sweat: number;       // 0..1 skin moisture -> sheen
  shiver: number;      // 0..1 shivering -> heat + micro motion
  fatigue: number;     // 0..1 whole-body muscle fatigue
}

export interface LimbicDrive {
  adrenaline: number;
  cortisol: number;
  pain: number;
  asleep: boolean;
}

export class Metabolism {
  basalHr = 72;   // set from the slider (autonomic tone / fitness)
  basalBr = 16;

  private loadSmooth = 0;
  private hr = 72;
  private br = 16;
  private spo2 = 98;
  private sys = 120;
  private dia = 80;
  private core = 36.98;
  private skin = 33.0;
  private sweatL = 0;
  private shiverL = 0;
  private fatigueL = 0;
  private vasodil = 0.3; // steady-state skin blood flow
  private phase = 0;     // breath CPG phase 0..1

  // motion: 0..1 normalized total joint angular velocity this frame
  update(dt: number, motion: number, limb?: LimbicDrive): MetabolicState {
    const m = Math.min(1, motion * 6);
    this.loadSmooth += (m - this.loadSmooth) * (1 - Math.exp(-dt / 1.2));

    // limbic modulation: adrenaline and pain push, sleep pulls
    const limbHr = limb ? limb.adrenaline * 26 + limb.pain * 18 + limb.cortisol * 6 - (limb.asleep ? 14 : 0) : 0;
    const limbBr = limb ? limb.adrenaline * 3 + limb.pain * 2.5 - (limb.asleep ? 3.5 : 0) : 0;

    const targetHr = Math.max(30, this.basalHr + this.loadSmooth * 85 + this.fatigueL * 6 + this.shiverL * 8 + limbHr);
    const tau = targetHr > this.hr ? 2.5 : 9.0; // fast up, slow recovery
    this.hr += (targetHr - this.hr) * (1 - Math.exp(-dt / tau));

    // breath CPG phase advances with rate (rate itself tracks the heart)
    const targetBr = Math.max(5, this.basalBr + (this.hr - this.basalHr) * 0.22 + this.loadSmooth * 4 + limbBr);
    this.br += (targetBr - this.br) * (1 - Math.exp(-dt / 3.0));
    this.phase = (this.phase + dt * this.br / 60) % 1;

    // respiratory sinus arrhythmia: heart beats a touch faster on inhale
    const rsa = Math.sin(this.phase * Math.PI * 2) * (1.6 + this.loadSmooth * 1.4);
    const hrOut = Math.max(28, this.hr + rsa);

    const targetSpo2 = 98 - this.loadSmooth * 3.2;
    this.spo2 += (targetSpo2 - this.spo2) * (1 - Math.exp(-dt / 5.0));

    const targetSys = 120 + (this.hr - 72) * 0.35;
    const targetDia = 80 + (this.hr - 72) * 0.15;
    this.sys += (targetSys - this.sys) * (1 - Math.exp(-dt / 6.0));
    this.dia += (targetDia - this.dia) * (1 - Math.exp(-dt / 6.0));

    // ---- thermoregulation ----
    // core temperature follows a load-dependent set-point (exercise heat,
    // vasomotor tone) — bounded by construction, no thermal runaway
    const targetCore = 36.85 + this.loadSmooth * 0.9;
    const tauCore = targetCore > this.core ? 80 : 200; // heats faster than it cools
    this.core += (targetCore - this.core) * (1 - Math.exp(-dt / tauCore));
    this.core += this.shiverL * 0.02 * dt; // shivering adds heat directly

    // skin perfusion: vasodilate when hot/loaded, vasoconstrict when cold
    const targetVaso = Math.min(1, Math.max(0.06,
      0.25 + (this.core - 36.9) * 1.2 + this.loadSmooth * 0.3));
    this.vasodil += (targetVaso - this.vasodil) * (1 - Math.exp(-dt / 4.0));
    const targetSkin = 31 + (this.core - 36) * 0.9 + this.vasodil * 1.5 - this.sweatL * 1.0;
    this.skin += (targetSkin - this.skin) * (1 - Math.exp(-dt / 6.0));

    // sweat glands: secrete with core heat + load, dry out slowly after
    const targetSweat = Math.min(1, Math.max(0, (this.core - 37.05) * 2.0 + this.loadSmooth * 0.35));
    this.sweatL += (targetSweat - this.sweatL) * (1 - Math.exp(-dt / (targetSweat > this.sweatL ? 2.5 : 10.0)));

    // shivering: involuntary heat when the core cools (adds tiny motion)
    const targetShiver = Math.min(1, Math.max(0, (36.7 - this.core) * 6.0));
    this.shiverL += (targetShiver - this.shiverL) * (1 - Math.exp(-dt / 1.5));

    // ---- whole-body fatigue: grows under sustained hard effort, recovers at rest ----
    const eff = Math.max(0, this.loadSmooth - 0.6) / 0.4;
    this.fatigueL = Math.min(1, Math.max(0, this.fatigueL + (eff * eff * 0.02 - 0.002) * dt));

    return {
      hr: Math.round(hrOut),
      br: +(this.br).toFixed(1),
      spo2: Math.round(this.spo2),
      sys: Math.round(this.sys),
      dia: Math.round(this.dia),
      load: +this.loadSmooth.toFixed(3),
      breathAmp: 1 + this.loadSmooth * 1.1,
      breathPhase: +this.phase.toFixed(4),
      coreTemp: +this.core.toFixed(2),
      skinTemp: +this.skin.toFixed(2),
      flush: +Math.min(1, this.vasodil).toFixed(3),
      sweat: +this.sweatL.toFixed(3),
      shiver: +this.shiverL.toFixed(3),
      fatigue: +this.fatigueL.toFixed(3),
    };
  }

  state(): MetabolicState {
    return {
      hr: Math.round(this.hr), br: +this.br.toFixed(1), spo2: Math.round(this.spo2),
      sys: Math.round(this.sys), dia: Math.round(this.dia),
      load: +this.loadSmooth.toFixed(3), breathAmp: 1 + this.loadSmooth * 1.1,
      breathPhase: +this.phase.toFixed(4),
      coreTemp: +this.core.toFixed(2), skinTemp: +this.skin.toFixed(2),
      flush: +Math.min(1, this.vasodil).toFixed(3),
      sweat: +this.sweatL.toFixed(3), shiver: +this.shiverL.toFixed(3),
      fatigue: +this.fatigueL.toFixed(3),
    };
  }

  // injected effort (e.g. motor impulses, poses) without actual motion
  effort(amount = 0.3) {
    this.loadSmooth = Math.min(1, this.loadSmooth + amount);
    this.fatigueL = Math.min(1, this.fatigueL + amount * 0.08);
  }
}

let singleton: Metabolism | null = null;
export function getMetabolism(): Metabolism {
  if (!singleton) singleton = new Metabolism();
  return singleton;
}
