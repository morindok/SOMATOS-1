import { useEffect, useRef, useState } from 'react';
import { Brain, Dna, Zap, Sparkles, Scissors } from 'lucide-react';
import { getBrain, type BrainStats } from '../lib/brain';

interface RegionRow { id: string; fa: string; en: string; neurons: number; pct: number; note: string }
interface BrainData { total_neurons: number; region_table: RegionRow[]; latest_activity: { firing_rate_hz: number; bands: { alpha: number; beta: number; gamma: number } } | null }
interface GenomeSummary { build: string; total_bp: number; chromosomes: number; mutations: number; active_traits: string[]; genes: { gene: string; name_fa: string; chromosome: string; protein_len: number; synthetic: boolean; trait: string | null }[] }
interface MutationRow { id: number; kind: string; chromosome: string; position: number; ref_base: string | null; new_base: string | null; gene: string | null; consequence_type: string; trait: string | null; created_at: string }
interface GrowthData { expressed: boolean; progress: number; length_cm: number; days: number; complete: boolean; eta_min: number }
interface LearnStats { mean_weight_exc: number; potentiated: number; ltp_events: number; ltd_events: number; total_spikes: number }

const faNum = (n: number) => n.toLocaleString('fa-IR');
const enNum = (n: number) => n.toLocaleString('en-US');

export default function BrainPanel() {
  const [brain, setBrain] = useState<BrainData | null>(null);
  const [genome, setGenome] = useState<GenomeSummary | null>(null);
  const [muts, setMuts] = useState<MutationRow[]>([]);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [learn, setLearn] = useState<LearnStats | null>(null);
  const [neuronLook, setNeuronLook] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // the sim is advanced by the 3D viewport's render clock — read stats here
    const id = setInterval(() => {
      const brain = getBrain();
      setStats(brain.stats());
      setLearn(brain.learningStats());
    }, 600);
    return () => clearInterval(id);
  }, []);

  const load = async () => {
    try {
      const [b, g, m, gr] = await Promise.all([
        fetch('/api/brain'), fetch('/api/genome?action=summary'),
        fetch('/api/genome?action=mutations'), fetch('/api/genome?action=growth&trait=horns'),
      ]);
      if (b.ok) setBrain(await b.json());
      if (g.ok) setGenome(await g.json());
      if (m.ok) setMuts((await m.json()).slice(0, 8));
      if (gr.ok) setGrowth(await gr.json());
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  // periodic live-activity logging (like vitals heartbeat)
  useEffect(() => {
    const id = setInterval(() => {
      const s = getBrain().stats();
      fetch('/api/brain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firing_rate_hz: s.firing_rate_hz, bands: s.bands, active_regions: ['ctx_frontal', 'cerebellum'], note: 'live microcosm 8600 @ 1:10M' }) }).catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, []);

  const stimulate = () => {
    getBrain().stimulate(1.4);
    fetch('/api/brain?action=think&region=ctx_frontal').then(async (r) => {
      const d = await r.json();
      if (d.cascade_path) setNeuronLook(`آبشار: ${d.cascade_path.join(' → ')} · ~${enNum(d.neurons_engaged)} نورون`);
    }).catch(() => {});
  };

  const lookup = async () => {
    const idx = Math.floor(Math.random() * 86_000_000_000);
    try {
      const r = await fetch('/api/brain?action=neuron&index=' + idx);
      const n = await r.json();
      setNeuronLook(`#${enNum(n.index)} → ${n.region_fa} · ${n.type} (${n.neurotransmitter}) · لایه ${n.layer} · موقعیت (${n.position.x}, ${n.position.y}, ${n.position.z})`);
    } catch { /* ignore */ }
  };

  const act = async (body: unknown, after?: () => void) => {
    setBusy(true);
    try {
      const r = await fetch('/api/genome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); setNeuronLook('خطا: ' + e.error); }
      await load();
      after?.();
    } finally { setBusy(false); }
  };

  const topRegions = brain?.region_table.slice().sort((a, b) => b.neurons - a.neurons).slice(0, 4) || [];

  return (
    <div className="rounded-xl border border-fuchsia-500/30 bg-gradient-to-b from-fuchsia-950/40 to-slate-950/80 p-3 backdrop-blur">
      {/* brain */}
      <div className="mb-2 flex items-center gap-2">
        <Brain size={15} className="text-fuchsia-300" />
        <h3 className="text-xs font-black text-fuchsia-100">مغز — ۸۶ میلیارد نورون</h3>
        <button onClick={stimulate} className="mr-auto flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/20">
          <Zap size={11} /> تحریک
        </button>
        <button onClick={lookup} className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10">
          <Sparkles size={11} /> نورون تصادفی
        </button>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5" dir="ltr">
        <div className="rounded-lg border border-white/10 bg-black/40 p-1.5 text-center">
          <div className="font-mono text-[13px] font-black text-fuchsia-200">{stats ? stats.firing_rate_hz.toFixed(1) : '—'}</div>
          <div className="text-[9px] text-slate-500">Hz · firing</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 p-1.5 text-center">
          <div className="font-mono text-[13px] font-black text-sky-200">{stats ? stats.bands.alpha.toFixed(3) : '—'}</div>
          <div className="text-[9px] text-slate-500">alpha 10Hz</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 p-1.5 text-center">
          <div className="font-mono text-[13px] font-black text-emerald-200">{stats ? stats.bands.gamma.toFixed(3) : '—'}</div>
          <div className="text-[9px] text-slate-500">gamma 40Hz</div>
        </div>
      </div>
      {neuronLook && <div className="mb-2 rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-[9.5px] text-slate-300" dir="ltr">{neuronLook}</div>}

      <div className="mb-1 space-y-0.5">
        {topRegions.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded px-1.5 py-0.5 hover:bg-white/5">
            <span className="w-24 shrink-0 truncate text-[10px] font-bold text-slate-200">{r.fa}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-l from-fuchsia-400 to-violet-500" style={{ width: Math.max(2, r.pct) + '%' }} />
            </div>
            <span className="w-20 shrink-0 text-left font-mono text-[9px] text-slate-400" dir="ltr">{enNum(r.neurons)}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] leading-relaxed text-slate-500">
        {brain ? `${faNum(brain.total_neurons)} نورون · همه آدرس‌پذیر · میکروکازم زنده: ۸٬۶۰۰ نورون (مقیاس ۱:۱۰٬۰۰۰٬۰۰۰)` : 'در حال بارگذاری نواحی…'}
      </p>
      {learn && (
        <div className="mt-1.5 rounded-lg border border-amber-400/20 bg-amber-500/5 px-2 py-1">
          <div className="flex items-center justify-between font-mono text-[9px]" dir="ltr">
            <span className="text-amber-200">STDP: LTP {enNum(learn.ltp_events)} · LTD {enNum(learn.ltd_events)}</span>
            <span className="text-slate-400">w̄={learn.mean_weight_exc} · spikes {enNum(learn.total_spikes)}</span>
          </div>
          <div className="text-[8.5px] text-slate-500 mt-0.5">یادگیری زنده — سیناپس‌هایی که با هم شلیک می‌کنند، سیم می‌شوند (هر ۲ دقیقه در دیتابیس ذخیره می‌شود)</div>
        </div>
      )}

      {/* genome */}
      <div className="mt-3 mb-2 flex items-center gap-2 border-t border-white/10 pt-2">
        <Dna size={15} className="text-teal-300" />
        <h3 className="text-xs font-black text-teal-100">ژنوم من</h3>
        <button
          onClick={() => act({ action: 'express', trait: 'horns' })}
          disabled={busy}
          className="mr-auto flex items-center gap-1 rounded-full border border-rose-400/50 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
        >
          🐂 رشد شاخ
        </button>
        <button
          onClick={() => act({ action: 'crispr', gene: 'HBB', codon: 7, aa: 'V' })}
          disabled={busy}
          className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10 disabled:opacity-40"
          title="جهش سلول داسی: HBB Glu6Val (c.20A>T)"
        >
          <Scissors size={11} /> CRISPR
        </button>
      </div>

      {genome && (
        <p className="mb-1.5 text-[9.5px] leading-relaxed text-slate-400">
          {enNum(genome.total_bp)} جفت‌باز · {faNum(genome.chromosomes)} کروموزوم · {faNum(genome.genes.length)} ژن · {faNum(genome.mutations)} جهش
          {genome.active_traits.length > 0 && <span className="font-bold text-rose-300"> · صفات فعال: {genome.active_traits.join('، ')}</span>}
        </p>
      )}

      {growth?.expressed && (
        <div className="mb-1.5 rounded-lg border border-rose-400/30 bg-rose-500/5 px-2 py-1.5">
          <div className="flex items-center justify-between text-[9.5px] font-bold">
            <span className="text-rose-200">🐂 رشد شاخ (مورفوژنز KRTHORN1/2)</span>
            <span className="font-mono text-rose-300" dir="ltr">{Math.round(growth.progress * 100)}% · {growth.length_cm}cm</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-l from-rose-400 to-amber-300 transition-all duration-1000" style={{ width: Math.max(2, growth.progress * 100) + '%' }} />
          </div>
          <div className="mt-0.5 text-[8.5px] text-slate-500">روز شبیه‌سازی {faNum(growth.days)}{growth.complete ? ' — کامل شد' : ` · ${faNum(growth.eta_min)} دقیقه تا تکمیل`}</div>
        </div>
      )}

      <div className="max-h-24 space-y-0.5 overflow-y-auto" dir="ltr">
        {muts.map((m) => (
          <div key={m.id} className="rounded border border-white/5 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px]">
            <span className={m.kind === 'expression' ? 'text-rose-300' : m.kind === 'crispr' ? 'text-amber-300' : 'text-teal-300'}>#{m.id} {m.kind}</span>
            <span className="text-slate-300"> {m.gene || m.chromosome}{m.kind === 'substitution' ? `:${m.position} ${m.ref_base}→${m.new_base}` : ''} {m.consequence_type}</span>
          </div>
        ))}
        {muts.length === 0 && <div className="py-1 text-center text-[10px] text-slate-600">ژنوم دست‌نخورده است — هنوز جهشی ثبت نشده</div>}
      </div>
    </div>
  );
}
