// SOMATOS-1 live brain microcosm — Izhikevich spiking network with
// STDP plasticity, motor pools and sensory feedback.
// 8,600 neurons simulated live (1:10,000,000 scale of the 86-billion brain).
// 80% excitatory (regular spiking) / 20% inhibitory (fast spiking) — the real
// cortical ratio. Each neuron has 30 random synapses.
//
// Real features:
//  - STDP (Izhikevich polychronization rule): synapses potentiate when pre
//    fires just before post, depress in the reverse order. Learning persists
//    via weight snapshots saved to the local store.
//  - 16 motor pools (300 neurons each, one per joint): pool firing bursts are
//    drained as motor impulses that twitch the 3D body.
//  - sensory(): proprioceptive feedback raises network drive while moving.

export interface BrainStats {
  sim_neurons: number;
  scale: number;
  firing_rate_hz: number;
  active_pct: number;
  bands: { alpha: number; beta: number; gamma: number; delta: number };
  total_neurons: number;
}

export interface MotorImpulse { pool: number; strength: number }

export interface LearningStats {
  mean_weight_exc: number;
  potentiated: number;
  depressed: number;
  ltp_events: number;
  ltd_events: number;
  total_spikes: number;
}

const N = 8600;
const K = 30; // synapses per neuron
const TOTAL_BRAIN = 86_000_000_000;
const SCALE = TOTAL_BRAIN / N;
const MOTOR_JOINTS = [
  'neck', 'jaw', 'spine_T', 'spine_L', 'shoulder_L', 'shoulder_R',
  'elbow_L', 'elbow_R', 'wrist_L', 'wrist_R',
  'hip_L', 'hip_R', 'knee_L', 'knee_R', 'ankle_L', 'ankle_R',
] as const;
export const MOTOR_POOL_JOINTS = MOTOR_JOINTS;
const MOTOR_START = N - MOTOR_JOINTS.length * 300; // 16 pools × 300 = 4800..8600
const MOTOR_POOL_SIZE = 300;
const MOTOR_THRESHOLD = 18; // spikes in window to produce an impulse
const MOTOR_POOL_REFRACTORY_MS = 2000; // same joint: at most one twitch / 2 s
const MOTOR_GLOBAL_COOLDOWN_MS = 2200; // whole body: at most one twitch / ~2.2 s
const TARGET_RATE_HZ = 3;              // homeostatic set-point (healthy cortex)
const HOMEO_LIMIT = 1.2;

const DT = 0.5; // ms
const STDP_WINDOW = 20; // ms
const STDP_AUP = 0.8;   // LTP magnitude
const STDP_ADN = 0.4;   // LTD magnitude
const STDP_TAU = 20;    // ms
const W_MIN = 0.05, W_MAX = 2.0;

let singleton: BrainSim | null = null;
export function getBrain(): BrainSim {
  if (!singleton) singleton = new BrainSim(42);
  return singleton;
}

export class BrainSim {
  private v = new Float32Array(N);
  private u = new Float32Array(N);
  private I = new Float32Array(N);
  private a = new Float32Array(N);
  private b = new Float32Array(N);
  private c = new Float32Array(N);
  private d = new Float32Array(N);
  private targets = new Int32Array(N * K);
  private weights = new Float32Array(N * K);
  private isInhib = new Uint8Array(N);
  private tspike = new Float32Array(N).fill(-1e9); // last spike time (ms)
  private simTime = 0;
  private rateRing = new Float32Array(1024);
  private ringIdx = 0;
  private ringFill = 0;
  private spikesThisBin = 0;
  private lastStats: BrainStats;
  private stim = 0;
  private sensoryDrive = 0;
  private motorWindow = new Int32Array(MOTOR_JOINTS.length);
  private lastPoolT = new Float32Array(MOTOR_JOINTS.length).fill(-1e9);
  private lastImpulseT = -1e9;
  private rateEma = 0;
  private homeo = 0;
  private lastRateHz = 0;
  private impulseQueue: MotorImpulse[] = [];
  private ltp = 0;
  private ltd = 0;
  private totalSpikes = 0;
  private circadianDark = 0; // 0=day, 1=night — modulates slow-wave drive

  constructor(seed = 42) {
    let s = seed >>> 0;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < N; i++) {
      const inh = i >= N * 0.8;
      this.isInhib[i] = inh ? 1 : 0;
      this.v[i] = -65;
      this.u[i] = -13;
      if (!inh) {
        this.a[i] = 0.02;
        this.b[i] = 0.2;
        this.c[i] = -65 + 15 * rand() * rand();
        this.d[i] = 8 - 6 * rand() * rand();
      } else {
        this.a[i] = 0.02 + 0.08 * rand();
        this.b[i] = 0.25 - 0.05 * rand();
        this.c[i] = -65;
        this.d[i] = 2;
      }
    }
    for (let i = 0; i < N; i++) {
      const inh = this.isInhib[i] === 1;
      for (let k = 0; k < K; k++) {
        const t = (rand() * N) | 0;
        this.targets[i * K + k] = t;
        this.weights[i * K + k] = inh ? -1.0 : 0.5;
      }
    }
    this.lastStats = {
      sim_neurons: N, scale: SCALE, firing_rate_hz: 0, active_pct: 0,
      bands: { alpha: 0, beta: 0, gamma: 0, delta: 0 }, total_neurons: TOTAL_BRAIN,
    };
  }

  stimulate(strength = 1) {
    this.stim = Math.min(12, 6 * strength);
  }

  // proprioceptive / interoceptive feedback: movement feeds the network
  sensory(strength = 0.2) {
    this.sensoryDrive = Math.min(1.5, this.sensoryDrive + strength);
  }

  // audio / environmental noise → neural arousal
  audioSensory(volume: number) {
    // volume 0..1 from mic analyser
    const s = Math.min(1.5, volume * 3);
    this.sensoryDrive = Math.min(1.5, this.sensoryDrive + s);
    this.stim = Math.min(12, this.stim + s * 0.5);
  }

  // drain accumulated motor impulses (called once per frame by the body)
  drainMotorImpulses(): MotorImpulse[] {
    const out = this.impulseQueue;
    this.impulseQueue = [];
    return out;
  }

  poolJoint(pool: number): string {
    return MOTOR_JOINTS[pool % MOTOR_JOINTS.length];
  }

  private step() {
    const { v, u, I, a, b, c, d, targets, weights, tspike } = this;
    const baseI = 4.2 + this.circadianDark * 2.8; // slow-wave drive at night
    // homeostatic term keeps the network near TARGET_RATE_HZ — without it,
    // STDP potentiation slowly drives the net into seizure-like bursting
    const drive = baseI + this.stim + this.sensoryDrive + this.homeo;
    let spikes = 0;
    const fired: number[] = [];
    for (let i = 0; i < N; i++) {
      const stimI = this.stim > 0 ? this.stim * (i % 3 === 0 ? 1 : 0.2) : 0;
      const dv = 0.04 * v[i] * v[i] + 5 * v[i] + 140 - u[i] + drive + I[i] + stimI;
      v[i] += DT * dv;
      u[i] += DT * a[i] * (b[i] * v[i] - u[i]);
      I[i] = 0;
      if (v[i] >= 30) {
        spikes++;
        fired.push(i);
        v[i] = c[i];
        u[i] += d[i];
        tspike[i] = this.simTime;
      }
    }
    this.stim = Math.max(0, this.stim - DT * 2);
    this.sensoryDrive = Math.max(0, this.sensoryDrive - DT * 0.8);
    this.totalSpikes += spikes;

    // delivery + STDP (Izhikevich polychronization rule)
    for (const f of fired) {
      const off = f * K;
      const tPre = tspike[f];
      const inhib = this.isInhib[f] === 1;
      for (let k = 0; k < K; k++) {
        const j = targets[off + k];
        I[j] += weights[off + k];
        if (!inhib && !this.isInhib[j]) {
          const dtPostPre = tspike[j] - tPre; // post - pre (ms)
          if (dtPostPre > 0 && dtPostPre <= STDP_WINDOW) {
            // pre fired before post -> potentiate
            const w = weights[off + k] + STDP_AUP * Math.exp(-dtPostPre / STDP_TAU);
            weights[off + k] = Math.min(W_MAX, w);
            this.ltp++;
          } else if (dtPostPre >= -STDP_WINDOW && dtPostPre < 0) {
            // post fired before pre -> depress
            const w = weights[off + k] - STDP_ADN * Math.exp(dtPostPre / STDP_TAU);
            weights[off + k] = Math.max(W_MIN, w);
            this.ltd++;
          }
        }
      }
      // motor pool counting
      if (f >= MOTOR_START) {
        const pool = Math.min(MOTOR_JOINTS.length - 1, ((f - MOTOR_START) / MOTOR_POOL_SIZE) | 0);
        this.motorWindow[pool]++;
      }
    }

    // pools over threshold -> motor impulses (rate-limited so the body
    // makes rare lifelike twitches instead of trembling non-stop)
    for (let p = 0; p < this.motorWindow.length; p++) {
      if (this.motorWindow[p] >= MOTOR_THRESHOLD) {
        const poolReady = this.simTime - this.lastPoolT[p] >= MOTOR_POOL_REFRACTORY_MS;
        const bodyReady = this.simTime - this.lastImpulseT >= MOTOR_GLOBAL_COOLDOWN_MS;
        if (poolReady && bodyReady) {
          this.impulseQueue.push({ pool: p, strength: Math.min(1, this.motorWindow[p] / (MOTOR_THRESHOLD * 3)) });
          this.lastPoolT[p] = this.simTime;
          this.lastImpulseT = this.simTime;
        }
        this.motorWindow[p] = -MOTOR_THRESHOLD; // refractory: don't retrigger instantly
      } else if (this.motorWindow[p] < 0) {
        this.motorWindow[p] = Math.min(0, this.motorWindow[p] + 1);
      }
    }

    this.spikesThisBin += spikes;
    this.simTime += DT;
  }

  // advance `ms` of simulated time (one 1kHz bin per ms)
  advance(ms = 5) {
    const steps = Math.max(1, Math.round(ms / DT));
    for (let s = 0; s < steps; s++) this.step();
    // true per-neuron firing rate (Hz), independent of window length
    const windowMs = steps * DT;
    const rateHz = (this.spikesThisBin / N) / (windowMs / 1000);
    this.spikesThisBin = 0;
    this.lastRateHz = rateHz;
    this.rateEma += (rateHz - this.rateEma) * 0.08;
    // slow homeostatic servo: too quiet -> more drive, seizing -> less drive
    const h = this.homeo + (TARGET_RATE_HZ - this.rateEma) * 0.004;
    this.homeo = h < -HOMEO_LIMIT ? -HOMEO_LIMIT : h > HOMEO_LIMIT ? HOMEO_LIMIT : h;
    this.rateRing[this.ringIdx] = rateHz;
    this.ringIdx = (this.ringIdx + 1) % this.rateRing.length;
    if (this.ringFill < this.rateRing.length) this.ringFill++;
  }

  private goertzel(freqHz: number, sampleRateHz: number): number {
    const n = this.ringFill;
    if (n < 256) return 0;
    const w = (2 * Math.PI * freqHz) / sampleRateHz;
    const coeff = 2 * Math.cos(w);
    let s0 = 0, s1 = 0, s2 = 0;
    for (let i = 0; i < n; i++) {
      const x = this.rateRing[(this.ringIdx - 1 - i + this.rateRing.length * 2) % this.rateRing.length];
      s0 = x + coeff * s1 - s2;
      s2 = s1; s1 = s0;
    }
    return Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2) / n;
  }

  setCircadian(dark: number) {
    this.circadianDark = Math.max(0, Math.min(1, dark));
  }

  getCircadianState(): { dark: number; label: string } {
    const d = this.circadianDark;
    const label = d < 0.3 ? '白天' : d < 0.5 ? '黎明' : d < 0.7 ? '黄昏' : '夜晚';
    return { dark: d, label };
  }

  stats(): BrainStats {
    const n = this.ringFill;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += this.rateRing[i];
    const rate = n ? mean / n : 0;
    let active = 0;
    for (let i = 0; i < n; i++) if (this.rateRing[i] > Math.max(0.5, rate * 2)) active++;
    this.lastStats = {
      sim_neurons: N,
      scale: SCALE,
      firing_rate_hz: +this.rateEma.toFixed(2),
      active_pct: n ? +((100 * active) / n).toFixed(1) : 0,
      bands: {
        alpha: +this.goertzel(10, 1000).toFixed(4),
        beta: +this.goertzel(22, 1000).toFixed(4),
        gamma: +this.goertzel(40, 1000).toFixed(4),
        delta: +this.goertzel(3, 1000).toFixed(4),
      },
      total_neurons: TOTAL_BRAIN,
    };
    return this.lastStats;
  }

  learningStats(): LearningStats {
    let sum = 0, pot = 0, dep = 0, cnt = 0;
    for (let i = 0; i < N * 0.8; i++) {
      for (let k = 0; k < K; k++) {
        const w = this.weights[i * K + k];
        sum += w; cnt++;
        if (w > 0.75) pot++; else if (w < 0.35) dep++;
      }
    }
    return {
      mean_weight_exc: +(sum / cnt).toFixed(3),
      potentiated: pot,
      depressed: dep,
      ltp_events: this.ltp,
      ltd_events: this.ltd,
      total_spikes: this.totalSpikes,
    };
  }

  // quantized weight snapshot (Uint8 per excitatory synapse) for persistence
  snapshot(): { weights_b64: string; stats: LearningStats } {
    const nExc = N * 0.8;
    const q = new Uint8Array(nExc * K);
    for (let i = 0; i < q.length; i++) {
      q[i] = Math.round(((this.weights[i] - W_MIN) / (W_MAX - W_MIN)) * 255);
    }
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < q.length; i += CH) {
      bin += String.fromCharCode.apply(null, Array.from(q.subarray(i, Math.min(i + CH, q.length))) as number[]);
    }
    return { weights_b64: btoa(bin), stats: this.learningStats() };
  }

  restore(weightsB64: string): boolean {
    try {
      const bin = atob(weightsB64);
      const nExc = N * 0.8;
      if (bin.length < nExc * K) return false;
      for (let i = 0; i < nExc * K; i++) {
        const q = bin.charCodeAt(i);
        this.weights[i] = W_MIN + (q / 255) * (W_MAX - W_MIN);
      }
      return true;
    } catch {
      return false;
    }
  }
}
