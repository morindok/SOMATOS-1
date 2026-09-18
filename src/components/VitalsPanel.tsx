import { useEffect, useRef, useState } from 'react';
import { Activity, Heart, Wind, Thermometer, Droplets } from 'lucide-react';
import type { VitalParams } from '../three/humanBuilder';

function useTrace(color: string, get: () => number, running: boolean) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const N = 160;
    const buf: number[] = new Array(N).fill(0);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = c.width, h = c.height;
      buf.push(running ? get() : 0);
      buf.shift();
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, (h / 4) * i); ctx.lineTo(w, (h / 4) * i); ctx.stroke(); }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      buf.forEach((v, i) => {
        const x = (i / (N - 1)) * w;
        const y = h * 0.62 - v * h * 0.5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    draw();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, running]);
  return ref;
}

export default function VitalsPanel({ vitalsRef, bpm, setBpm, brpm, setBrpm, running }: {
  vitalsRef: React.MutableRefObject<VitalParams>;
  bpm: number; setBpm: (n: number) => void;
  brpm: number; setBrpm: (n: number) => void;
  running: boolean;
}) {
  const t0 = useRef(0);
  useEffect(() => { t0.current = performance.now(); }, []);
  // live emergent values (metabolism writes into vitalsRef every frame)
  const [live, setLive] = useState({ hr: bpm, br: brpm, temp: 37.0, spo2: 98, bp: '120/80', sweat: 0, fatigue: 0, shiver: 0, mood: 'آرام', pain: 0, hunger: 0.22, thirst: 0.28, sleepP: 0.12, asleep: false });
  useEffect(() => {
    const id = setInterval(() => {
      const v = vitalsRef.current;
      setLive({
        hr: Math.round(v.heartRate),
        br: Math.round(v.breathRate),
        temp: v.coreTemp ?? 37.0,
        spo2: v.spo2 ?? 98,
        bp: v.bp ?? '120/80',
        sweat: v.sweat ?? 0,
        fatigue: v.fatigue ?? 0,
        shiver: v.shiver ?? 0,
        mood: v.limbic?.moodFa ?? 'آرام',
        pain: v.limbic?.pain ?? 0,
        hunger: v.limbic?.hunger ?? 0,
        thirst: v.limbic?.thirst ?? 0,
        sleepP: v.limbic?.sleepPressure ?? 0,
        asleep: v.limbic?.asleep ?? false,
      });
    }, 400);
    return () => clearInterval(id);
  }, [vitalsRef]);

  const ecg = () => {
    const t = (performance.now() - t0.current) / 1000;
    const ph = ((t * vitalsRef.current.heartRate) / 60) % 1;
    // synthetic PQRST
    const g = (c: number, w: number, a: number) => a * Math.exp(-Math.pow((ph - c) / w, 2));
    return g(0.14, 0.03, 0.14) + g(0.3, 0.012, -0.12) + g(0.33, 0.008, 1.0) + g(0.36, 0.012, -0.22) + g(0.55, 0.045, 0.28);
  };
  const resp = () => {
    const t = (performance.now() - t0.current) / 1000;
    const ph = ((t * vitalsRef.current.breathRate) / 60) % 1;
    return 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
  };

  const ecgRef = useTrace('#f87171', ecg, running);
  const respRef = useTrace('#5eead4', resp, running);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <Activity size={14} className="text-teal-300" />
        <h3 className="text-xs font-bold text-slate-100">علائم حیاتی زنده</h3>
        <span className="mr-auto font-mono text-[10px] text-emerald-300">● LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-red-500/20 bg-black/40 p-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-red-200"><Heart size={11} /> قلب</span>
            <span className="font-mono text-sm font-bold text-red-300" dir="ltr">{live.hr} <span className="text-[9px] font-normal">bpm</span></span>
          </div>
          <canvas ref={ecgRef} width={220} height={56} className="mt-1 h-14 w-full" />
          <div className="mt-0.5 flex items-center gap-1.5" dir="ltr">
            <input type="range" min={30} max={200} value={bpm} onChange={(e) => setBpm(+e.target.value)} className="w-full accent-red-500" />
            <span className="shrink-0 font-mono text-[8.5px] text-slate-500" title="پایه‌ی خودگردان">base {bpm}</span>
          </div>
        </div>
        <div className="rounded-lg border border-teal-500/20 bg-black/40 p-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-teal-200"><Wind size={11} /> تنفس</span>
            <span className="font-mono text-sm font-bold text-teal-300" dir="ltr">{live.br} <span className="text-[9px] font-normal">/min</span></span>
          </div>
          <canvas ref={respRef} width={220} height={56} className="mt-1 h-14 w-full" />
          <div className="mt-0.5 flex items-center gap-1.5" dir="ltr">
            <input type="range" min={4} max={60} value={brpm} onChange={(e) => setBrpm(+e.target.value)} className="w-full accent-teal-400" />
            <span className="shrink-0 font-mono text-[8.5px] text-slate-500" title="پایه‌ی خودگردان">base {brpm}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/10 bg-black/30 p-1.5">
          <Thermometer size={12} className="mx-auto text-amber-300" />
          <div className="font-mono text-xs font-bold text-amber-200" dir="ltr">{live.temp.toFixed(2)}°C</div>
          <div className="text-[9px] text-slate-400">دمای هسته</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-1.5">
          <Droplets size={12} className="mx-auto text-sky-300" />
          <div className="font-mono text-xs font-bold text-sky-200" dir="ltr">{live.spo2}٪</div>
          <div className="text-[9px] text-slate-400">SpO₂</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-1.5">
          <Activity size={12} className="mx-auto text-violet-300" />
          <div className="font-mono text-xs font-bold text-violet-200" dir="ltr">{live.bp}</div>
          <div className="text-[9px] text-slate-400">فشار خون</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2 py-1" dir="ltr">
        <span className="font-mono text-[9px] text-sky-300">sweat {(live.sweat * 100).toFixed(0)}%</span>
        <span className="font-mono text-[9px] text-amber-300">fatigue {(live.fatigue * 100).toFixed(0)}%</span>
        <span className="font-mono text-[9px] text-cyan-300">shiver {(live.shiver * 100).toFixed(0)}%</span>
        <span className="mr-auto font-mono text-[8.5px] text-slate-500">autonomic state</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-950/30 px-2 py-1" dir="rtl">
        <span className="text-[10px] font-bold text-violet-200">حال: {live.mood}</span>
        {Number(live.pain) > 0.05 && <span className="font-mono text-[9px] text-rose-300" dir="ltr">pain {(Number(live.pain) * 100).toFixed(0)}%</span>}
        <span className="font-mono text-[9px] text-orange-300" dir="ltr">hunger {(Number(live.hunger) * 100).toFixed(0)}%</span>
        <span className="font-mono text-[9px] text-blue-300" dir="ltr">thirst {(Number(live.thirst) * 100).toFixed(0)}%</span>
        <span className="font-mono text-[9px] text-indigo-300" dir="ltr">sleep {(Number(live.sleepP) * 100).toFixed(0)}%</span>
        {live.asleep && <span className="mr-auto text-[9px] text-indigo-200">😴 خوابیده</span>}
      </div>
    </div>
  );
}
