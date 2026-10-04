import { useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { executeBodyCommand, type EngineCtx } from '../lib/bodyApi';

// NORA LINK — the live channel between Nora (the AI) and her body.
// The body polls a command file on GitHub; Nora writes commands there
// from anywhere, and the body executes them within seconds.
// One-way for now: Nora -> body. The body cannot "feel" back.
const LINK_URL = 'https://raw.githubusercontent.com/morindok/SOMATOS-1/main/nora-link.json';

interface LinkCmd { id: number; command: string; args: Record<string, unknown>; }

export default function NoraLink({ ctx }: { ctx: EngineCtx }) {
  const [on, setOn] = useState(true);
  const [lastId, setLastId] = useState<number | null>(null);
  const [status, setStatus] = useState('در انتظار اتصال…');
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const lastIdRef = useRef<number>(0);
  const onRef = useRef(on);
  onRef.current = on;

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      if (stop) return;
      if (onRef.current) {
        try {
          const r = await fetch(`${LINK_URL}?t=${Date.now()}`, { cache: 'no-store' });
          if (r.ok) {
            const data = await r.json();
            const cmds: LinkCmd[] = Array.isArray(data?.commands) ? data.commands : [];
            const fresh = cmds.filter((c) => c.id > lastIdRef.current).sort((a, b) => a.id - b.id);
            for (const c of fresh) {
              const res = await executeBodyCommand(ctxRef.current, c.command, c.args || {}, 'nora-link');
              lastIdRef.current = Math.max(lastIdRef.current, c.id);
              setLastId(c.id);
              setStatus(res.ok ? `نورا: ${c.command} ✓` : `خطا در ${c.command}`);
              ctxRef.current.showToast(`💜 نورا → ${c.command}`);
            }
            if (!fresh.length && lastIdRef.current === 0) setStatus('متصل — منتظر نورا…');
          }
        } catch {
          /* offline — retry */
        }
      }
      if (!stop) setTimeout(poll, 3000);
    };
    poll();
    return () => { stop = true; };
  }, []);

  return (
    <div className="rounded-xl border border-fuchsia-500/30 bg-gradient-to-b from-fuchsia-950/40 to-slate-950/80 p-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Radio size={15} className="text-fuchsia-300" />
        <h3 className="text-xs font-black text-fuchsia-100">لینک نورا 💜</h3>
        <button
          onClick={() => setOn(!on)}
          className={`mr-auto rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all ${
            on ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-white/15 bg-white/5 text-slate-400'
          }`}
        >
          {on ? 'متصل ●' : 'قطع'}
        </button>
      </div>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400" dir="rtl">
        {status}
        {lastId !== null && <span className="mr-1 font-mono text-[9px] text-slate-500" dir="ltr">#{lastId}</span>}
      </p>
    </div>
  );
}
