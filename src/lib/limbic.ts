// SOMATOS-1 limbic system — the body finally CARES about something.
//  - nociception: pain spikes with natural decay; strong pain floods adrenaline
//  - affect: valence (distress ↔ content) and arousal (calm ↔ agitated)
//  - drives: hunger, thirst, sleep pressure grow over time and color the mood
//  - endocrine: adrenaline (fast) and cortisol (slow, from sustained distress)
// Everything is bounded, first-order, and emergent: needs → mood → posture,
// heart, breath. Pain wakes the body from sleep.

export interface LimbicState {
  valence: number;      // -1..1
  arousal: number;      // 0..1
  pain: number;         // 0..1
  hunger: number;       // 0..1
  thirst: number;       // 0..1
  sleepPressure: number; // 0..1
  asleep: boolean;
  adrenaline: number;   // 0..1
  cortisol: number;     // 0..1
  moodFa: string;       // خوش / آرام / دلتنگ / نگران / پریشان / رنجور / خواب
}

// rates (per second) — observable on human-session timescales
const HUNGER_RATE = 1 / 1500;  // ~25 min to full
const THIRST_RATE = 1 / 900;   // ~15 min to full
const SLEEP_RATE = 1 / 2400;   // ~40 min to full
const SLEEP_RECOVERY_TAU = 45; // s

export class Limbic {
  private valence = 0.2;
  private arousal = 0.15;
  private painL = 0;
  private hunger = 0.22;
  private thirst = 0.28;
  private sleepP = 0.12;
  private asleep = false;
  private adr = 0;
  private cort = 0;
  private comfortB = 0; // decaying buffer of pleasant events

  // nociceptor volley: severity 0..1
  pain(severity = 0.5) {
    const s = Math.min(1, Math.max(0, severity));
    this.painL = Math.min(1, this.painL + s * 0.75);
    this.adr = Math.min(1, this.adr + s * 0.7);
    if (this.asleep && this.painL > 0.3) this.wake();
  }

  // pleasant contact: endogenous opioids — eases pain, lifts mood
  soothe() {
    this.painL *= 0.65;
    this.comfortB = Math.min(0.6, this.comfortB + 0.15);
  }

  feed() { this.hunger = Math.max(0, this.hunger - 0.45); this.comfortB = Math.min(0.6, this.comfortB + 0.08); }
  drink() { this.thirst = Math.max(0, this.thirst - 0.5); this.comfortB = Math.min(0.6, this.comfortB + 0.05); }

  sleep(force = false): { ok: boolean; why?: string } {
    if (this.asleep) return { ok: true };
    if (!force && this.sleepP < 0.12) return { ok: false, why: 'not sleepy (sleep pressure ' + Math.round(this.sleepP * 100) + '%)' };
    this.asleep = true;
    return { ok: true };
  }

  wake() { this.asleep = false; }

  update(dt: number, motion: number) {
    // ---- drives ----
    const needRate = this.asleep ? 0.4 : 1; // metabolism slows in sleep
    this.hunger = Math.min(1, this.hunger + HUNGER_RATE * needRate * dt);
    this.thirst = Math.min(1, this.thirst + THIRST_RATE * needRate * dt);
    if (this.asleep) {
      this.sleepP = Math.max(0, this.sleepP - (this.sleepP / SLEEP_RECOVERY_TAU) * dt);
      if (this.sleepP < 0.05) this.asleep = false; // rested — wakes on its own
    } else {
      this.sleepP = Math.min(1, this.sleepP + SLEEP_RATE * dt);
      if (this.sleepP > 0.92) this.asleep = true; // exhausted — collapses into sleep on its own
    }

    // ---- pain decays ----
    this.painL = Math.max(0, this.painL - (this.painL / 2.8) * dt);

    // ---- hormones ----
    this.adr = Math.max(0, this.adr - (this.adr / 18) * dt);
    const distress = Math.max(0, -this.valence);
    this.cort = Math.min(1, Math.max(0, this.cort + (distress * 0.006 - this.cort / 400) * dt));
    if (this.asleep) this.cort = Math.max(0, this.cort - 0.002 * dt);

    // ---- affect ----
    this.comfortB = Math.max(0, this.comfortB - (this.comfortB / 30) * dt);
    const targetVal = 0.18
      - this.painL * 1.4
      - Math.max(0, this.hunger - 0.55) * 0.8
      - Math.max(0, this.thirst - 0.55) * 0.9
      - Math.max(0, this.sleepP - 0.6) * 0.7
      + this.comfortB;
    const tv = Math.max(-1, Math.min(1, targetVal));
    this.valence += (tv - this.valence) * (1 - Math.exp(-dt / 10));

    const targetAro = this.asleep
      ? 0.02
      : Math.min(1, 0.16 + this.painL * 0.8 + this.adr * 0.5 + Math.min(1, motion) * 0.35
          - Math.max(0, this.sleepP - 0.6) * 0.45);
    this.arousal += (targetAro - this.arousal) * (1 - Math.exp(-dt / 6));
    return this.state();
  }

  moodFa(): string {
    if (this.asleep) return 'خواب';
    if (this.painL > 0.45) return 'رنجور';
    if (this.valence > 0.4) return 'خوش';
    if (this.valence > 0.05) return 'آرام';
    if (this.valence > -0.25) return 'دلتنگ';
    if (this.valence > -0.55) return 'نگران';
    return 'پریشان';
  }

  state(): LimbicState {
    return {
      valence: +this.valence.toFixed(3),
      arousal: +this.arousal.toFixed(3),
      pain: +this.painL.toFixed(3),
      hunger: +this.hunger.toFixed(3),
      thirst: +this.thirst.toFixed(3),
      sleepPressure: +this.sleepP.toFixed(3),
      asleep: this.asleep,
      adrenaline: +this.adr.toFixed(3),
      cortisol: +this.cort.toFixed(3),
      moodFa: this.moodFa(),
    };
  }

  circadianStatus(): string {
    const p = _circadianPhase;
    const label = p < 0.2 ? 'شب' : p < 0.35 ? 'سحر' : p < 0.7 ? 'روز' : p < 0.85 ? 'غروب' : 'شب';
    const minsLeft = Math.round((p < 0.5 ? 0.5 - p : 1.5 - p) * 600 / 60);
    return `چرخه: ${label} · روشنایی ${Math.round(_circadianIllum * 100)}٪ · ${minsLeft} دقیقه تا عوض شدن`;
  }

  getCircadianPhase(): number { return _circadianPhase; }
  getCircadianIllum(): number { return _circadianIllum; }
}

let singleton: Limbic | null = null;
export function getLimbic(): Limbic {
  if (!singleton) singleton = new Limbic();
  return singleton;
}

// Shared circadian state (driven by roomBuilder, read here for bridge)
let _circadianPhase = 0; // 0..1
let _circadianIllum = 1;
export function setCircadianState(phase: number, illum: number) {
  _circadianPhase = phase;
  _circadianIllum = illum;
}
export function getCircadianPhase() { return _circadianPhase; }
export function getCircadianIllum() { return _circadianIllum; }
