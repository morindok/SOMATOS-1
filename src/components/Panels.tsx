import { useState } from 'react';
import { Layers, Bone, Brain, HeartPulse, PersonStanding, Dna, Atom, Boxes, CircleDot, Scan } from 'lucide-react';
import { LAYERS, SYSTEMS } from '../data/anatomy';

const LAYER_ICONS = [Atom, Dna, CircleDot, Boxes, HeartPulse, Brain, PersonStanding];

export function LayerRail({ layer, setLayer }: { layer: string; setLayer: (l: string) => void }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2 backdrop-blur">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <Layers size={13} className="text-teal-300" />
        <h3 className="text-xs font-bold text-slate-100">مقیاس: از اتم تا بدن</h3>
      </div>
      <div className="flex gap-1" dir="ltr">
        {LAYERS.map((l, i) => {
          const Icon = LAYER_ICONS[i] || Scan;
          const active = layer === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setLayer(l.id)}
              title={`${l.fa} (${l.en}) — ${l.scaleFa}`}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 transition-all ${
                active
                  ? 'border-teal-400/70 bg-teal-500/15 text-teal-100 shadow-[0_0_12px_rgba(45,212,191,0.35)]'
                  : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <Icon size={15} />
              <span className="text-[10px] font-bold leading-none">{l.fa}</span>
              <span className="font-mono text-[7.5px] leading-none opacity-70" dir="ltr">{l.scale}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-slate-400">
        {LAYERS.find((l) => l.id === layer)?.descFa}
      </p>
    </div>
  );
}

export function SystemToggles({ systems, setSystems, counts }: {
  systems: Set<string>;
  setSystems: (s: Set<string>) => void;
  counts: Record<string, number>;
}) {
  const toggle = (id: string) => {
    const n = new Set(systems);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSystems(n);
  };
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2 backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Bone size={13} className="text-teal-300" />
          <h3 className="text-xs font-bold text-slate-100">دستگاه‌های بدن</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setSystems(new Set(SYSTEMS.map((s) => s.id)))} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-teal-400/50">همه</button>
          <button onClick={() => setSystems(new Set(['skeletal']))} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-teal-400/50">فقط اسکلت</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {SYSTEMS.map((s) => {
          const on = systems.has(s.id);
          const hex = '#' + s.color.toString(16).padStart(6, '0');
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-right transition-all ${
                on ? 'border-white/20 bg-white/[0.05]' : 'border-white/5 bg-transparent opacity-40'
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: hex, boxShadow: on ? `0 0 8px ${hex}` : 'none' }} />
              <span className="flex-1 text-[11px] font-bold text-slate-200">{s.fa}</span>
              <span className="font-mono text-[9px] text-slate-500" dir="ltr">{counts[s.id] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DetailPanel({ part, onClose, onFocus }: {
  part: { part_id: string; name_fa: string; name_en: string; latin: string; system: string; layer: string; movable: boolean; description_fa: string } | null;
  onClose: () => void;
  onFocus: () => void;
}) {
  const [tab, setTab] = useState<'info' | 'api'>('info');
  if (!part) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-4 text-center backdrop-blur">
        <Scan size={18} className="mx-auto mb-1 text-slate-500" />
        <p className="text-[11px] text-slate-400">روی هر جزء بدن در صحنه سه‌بعدی کلیک کنید تا شناسنامه علمی آن نمایش داده شود</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-teal-500/30 bg-slate-950/80 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 bg-teal-500/10 px-3 py-2">
        <div>
          <h3 className="text-sm font-black text-teal-100">{part.name_fa}</h3>
          <p className="font-mono text-[10px] text-teal-300/80" dir="ltr">{part.name_en} · {part.latin}</p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white">✕</button>
      </div>
      <div className="flex gap-1 px-3 pt-2">
        <button onClick={() => setTab('info')} className={`rounded-t px-2 py-1 text-[11px] font-bold ${tab === 'info' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>شناسنامه</button>
        <button onClick={() => setTab('api')} className={`rounded-t px-2 py-1 font-mono text-[11px] ${tab === 'api' ? 'bg-white/10 text-teal-200' : 'text-slate-400'}`} dir="ltr">API</button>
      </div>
      {tab === 'info' ? (
        <div className="space-y-1.5 p-3 text-[11.5px] leading-relaxed">
          <p className="text-slate-300">{part.description_fa}</p>
          <div className="grid grid-cols-3 gap-1 pt-1 text-center">
            <div className="rounded border border-white/10 bg-black/30 p-1"><div className="text-[9px] text-slate-500">دستگاه</div><div className="font-mono text-[10px] text-slate-200" dir="ltr">{part.system}</div></div>
            <div className="rounded border border-white/10 bg-black/30 p-1"><div className="text-[9px] text-slate-500">لایه</div><div className="font-mono text-[10px] text-slate-200" dir="ltr">{part.layer}</div></div>
            <div className="rounded border border-white/10 bg-black/30 p-1"><div className="text-[9px] text-slate-500">متحرک</div><div className="text-[10px] text-slate-200">{part.movable ? 'بله' : 'خیر'}</div></div>
          </div>
          <button onClick={onFocus} className="mt-1 w-full rounded-lg border border-teal-400/40 bg-teal-500/10 py-1.5 text-[11px] font-bold text-teal-200 hover:bg-teal-500/20">🎯 فوکوس دوربین روی این جزء</button>
        </div>
      ) : (
        <div className="space-y-1 p-3 font-mono text-[10.5px]" dir="ltr">
          <div className="rounded bg-black/50 p-2 text-emerald-300">body.get({part.part_id})</div>
          <div className="rounded bg-black/50 p-2 text-slate-300">{`GET /api/body-parts?q=${encodeURIComponent(part.part_id)}`}</div>
          <div className="rounded bg-black/50 p-2 text-slate-400">{`{ "part_id": "${part.part_id}", "system": "${part.system}" }`}</div>
        </div>
      )}
    </div>
  );
}
