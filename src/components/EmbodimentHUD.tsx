import { useEffect, useRef, useState } from 'react';
import { getBrain } from '../lib/brain';
import { getMetabolism } from '../lib/metabolism';
import { getCircadianPhase, getCircadianIllum } from '../lib/limbic';
import { getJointCurrent, type BodyRefs, type VitalParams } from '../three/humanBuilder';
import { JOINTS } from '../data/anatomy';

interface Props {
  bodyRef: React.MutableRefObject<BodyRefs | null>;
  vitalsRef: React.MutableRefObject<VitalParams>;
  audioRef: React.MutableRefObject<{ ctx: AudioContext | null; analyser: AnalyserNode | null }>;
}

export default function EmbodimentHUD({ bodyRef, vitalsRef, audioRef }: Props) {
  // All live values read synchronously from refs inside a rAF-driven interval — no stale state
  const [live, setLive] = useState({
    hr: 72, br: 16, temp: 37, spo2: 98, bp: '120/80',
    mood: 'آرام', pain: 0, hunger: 0, thirst: 0, sleepP: 0, asleep: false, valence: 0,
    alpha: 0, beta: 0, gamma: 0, delta: 0, firingHz: 0,
    circLabel: 'روز', circIllum: 1, load: 0,
    audio: 0, micActive: false,
    joints: {} as Record<string, [number, number, number]>,
  });

  useEffect(() => {
    let raf = 0;
    let lastBrain = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      // fast values every frame (cheap reads from refs)
      const v = vitalsRef.current;
      const b = bodyRef.current;
      const l = v.limbic;
      const joints: Record<string, [number, number, number]> = {};
      if (b) for (const jd of JOINTS) joints[jd.joint_id] = getJointCurrent(b, jd.joint_id);

      // audio level from analyser
      let audio = 0;
      let micActive = false;
      if (audioRef.current.analyser) {
        micActive = true;
        const data = new Uint8Array(audioRef.current.analyser.frequencyBinCount);
        audioRef.current.analyser.getByteFrequencyData(data);
        audio = data.reduce((a, c) => a + c, 0) / data.length / 255;
      }

      // brain stats (expensive — refresh 5x/sec)
      let bands: { alpha: number; beta: number; gamma: number; delta: number } | null = null;
      let hz = live.firingHz;
      if (now - lastBrain > 200) {
        lastBrain = now;
        const st = getBrain().stats();
        hz = st.firing_rate_hz;
        bands = st.bands;
      }
      const cs = getMetabolism().state();
      const p = getCircadianPhase();
      const setLive2 = setLive;
      setLive2(prev => ({
        hr: Math.round(v.heartRate),
        br: Math.round(v.breathRate),
        temp: v.coreTemp ?? 37,
        spo2: v.spo2 ?? 98,
        bp: v.bp ?? '120/80',
        mood: l?.moodFa || 'آرام',
        pain: l?.pain ?? 0,
        hunger: l?.hunger ?? 0,
        thirst: l?.thirst ?? 0,
        sleepP: l?.sleepPressure ?? 0,
        asleep: l?.asleep ?? false,
        valence: l?.valence ?? 0,
        alpha: bands ? bands.alpha : prev.alpha,
        beta: bands ? bands.beta : prev.beta,
        gamma: bands ? bands.gamma : prev.gamma,
        delta: bands ? bands.delta : prev.delta,
        firingHz: hz,
        circLabel: p < 0.2 ? 'شب' : p < 0.35 ? 'سحر' : p < 0.7 ? 'روز' : p < 0.85 ? 'غروب' : 'شب',
        circIllum: getCircadianIllum(),
        load: cs.load,
        audio,
        micActive,
        joints,
      }));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const micToggle = async () => {
    if (live.micActive) {
      await audioRef.current.ctx?.close();
      audioRef.current = { ctx: null, analyser: null };
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      audioRef.current = { ctx, analyser };
    } catch { /* no mic */ }
  };

  const band = (val: number, color: string, label: string) => (
    <div className="flex items-center gap-1" dir="ltr">
      <span className="font-mono text-[8px] w-6 text-slate-400">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, val * 220)}%`, background: color }} />
      </div>
      <span className="font-mono text-[8px] w-10 text-right" style={{ color }}>{val.toFixed(2)}</span>
    </div>
  );

  const activeJoints = Object.entries(live.joints).filter(([, v]) => v.some(x => Math.abs(x) > 1));

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/50 to-slate-950/90 p-2.5 backdrop-blur text-[10px]" dir="rtl">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: '.15s' }} />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: '.3s' }} />
        </div>
        <span className="text-xs font-black tracking-wider text-emerald-100">🧬 EMBODIMENT HUD</span>
        <span className="mr-auto font-mono text-[9px] text-emerald-300" dir="ltr">● LIVE</span>
      </div>

      {/* Vitals */}
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        <div className="rounded-lg border border-red-500/20 bg-red-950/40 p-1.5 text-center">
          <div className="text-[8px] text-red-300">قلب</div>
          <div className="font-mono text-lg font-black text-red-200" dir="ltr">{live.hr}</div>
          <div className="text-[8px] text-red-400/70">bpm</div>
        </div>
        <div className="rounded-lg border border-teal-500/20 bg-teal-950/40 p-1.5 text-center">
          <div className="text-[8px] text-teal-300">تنفس</div>
          <div className="font-mono text-lg font-black text-teal-200" dir="ltr">{live.br}</div>
          <div className="text-[8px] text-teal-400/70">/min</div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/40 p-1.5 text-center">
          <div className="text-[8px] text-amber-300">دما</div>
          <div className="font-mono text-lg font-black text-amber-200" dir="ltr">{live.temp.toFixed(1)}°</div>
          <div className="text-[8px] text-amber-400/70">hust</div>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-sky-950/40 p-1.5 text-center">
          <div className="text-[8px] text-sky-300">SpO₂ / BP</div>
          <div className="font-mono text-sm font-black text-sky-200" dir="ltr">{live.spo2}%</div>
          <div className="font-mono text-[8px] text-sky-400/70" dir="ltr">{live.bp}</div>
        </div>
      </div>

      {/* Mood + needs */}
      <div className="mb-2 rounded-lg border border-violet-500/20 bg-violet-950/30 p-1.5">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-bold text-violet-200">حال: <span className="font-mono">{live.mood}</span></span>
          {live.asleep && <span className="text-indigo-300">😴</span>}
          {live.pain > 0.05 && <span className="font-mono text-[9px] text-rose-300" dir="ltr">pain {(live.pain*100).toFixed(0)}%</span>}
          <span className="mr-auto font-mono text-[8px] text-slate-400" dir="ltr">valence {(live.valence>=0?'+':'') + live.valence.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-center font-mono text-[8px]" dir="ltr">
          <div><div className="text-orange-300">{(live.hunger*100).toFixed(0)}%</div><div className="text-slate-500">hunger</div></div>
          <div><div className="text-blue-300">{(live.thirst*100).toFixed(0)}%</div><div className="text-slate-500">thirst</div></div>
          <div><div className="text-indigo-300">{(live.sleepP*100).toFixed(0)}%</div><div className="text-slate-500">sleep</div></div>
          <div><div className="text-slate-300">{(live.load*100).toFixed(0)}%</div><div className="text-slate-500">load</div></div>
        </div>
      </div>

      {/* EEG */}
      <div className="mb-2 space-y-1 rounded-lg border border-white/10 bg-slate-950/60 p-1.5">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold text-slate-300">🧠 EEG</span>
          <span className="mr-auto font-mono text-[8px] text-slate-500" dir="ltr">{live.firingHz.toFixed(2)} Hz</span>
        </div>
        {band(live.alpha, '#f59e0b', 'α 10Hz')}
        {band(live.beta, '#60a5fa', 'β 22Hz')}
        {band(live.gamma, '#c084fc', 'γ 40Hz')}
        {band(live.delta, '#34d399', 'δ 3Hz')}
      </div>

      {/* Circadian */}
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 p-1.5">
        <span className="text-[11px]">🕐</span>
        <span className="font-mono text-[9px] text-slate-300" dir="ltr">{live.circLabel} · {Math.round(live.circIllum*100)}%</span>
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full transition-all" style={{ width: `${live.circIllum*100}%`, background: `linear-gradient(90deg,#1e3a5f,${live.circIllum>0.5?'#fbbf24':'#6366f1'})` }} />
        </div>
      </div>

      {/* Audio */}
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 p-1.5">
        <button onClick={micToggle} className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${live.micActive ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
          {live.micActive ? '🎤 LIVE' : '🎤 MIC'}
        </button>
        <span className="font-mono text-[9px] text-slate-400" dir="ltr">{Math.round(live.audio*100)}%</span>
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${live.audio*100}%` }} />
        </div>
      </div>

      {/* Joints */}
      <div className="rounded-lg border border-white/10 bg-slate-950/60 p-1.5">
        <div className="mb-1 flex items-center gap-1">
          <span className="text-[9px] font-bold text-slate-300">🦴 مفاصل</span>
          <span className="mr-auto font-mono text-[8px] text-slate-500" dir="ltr">{activeJoints.length}/16 active</span>
        </div>
        <div className="grid max-h-24 grid-cols-2 gap-x-3 gap-y-0.5 overflow-y-auto" dir="ltr">
          {JOINTS.map(j => {
            const cur = live.joints[j.joint_id] ?? [0,0,0];
            const moved = cur.some(x => Math.abs(x) > 1);
            return (
              <div key={j.joint_id} className={`flex items-center justify-between font-mono text-[8px] ${moved ? 'text-teal-300' : 'text-slate-600'}`}>
                <span>{j.joint_id}</span>
                <span>[{cur.map(c => c.toFixed(0)).join(', ')}]</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Keys hint */}
      <div className="mt-1.5 rounded-lg border border-white/5 bg-black/40 p-1.5">
        <div className="font-mono text-[8px] leading-relaxed text-slate-500" dir="ltr">
          WASD/←→:neck · Q/E:shoulder tilt · T/G:shoulder up · Y/H:elbow · U/J:wrist · R/F:spine · I/K:hip · O/L:knee · P/;:ankle
        </div>
      </div>
    </div>
  );
}
