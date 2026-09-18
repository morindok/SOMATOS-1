import { useEffect, useRef, useState } from 'react';
import { Terminal, ChevronRight, Trash2, BookOpen } from 'lucide-react';
import { parseCommand, executeBodyCommand, type EngineCtx } from '../lib/bodyApi';

interface Line {
  kind: 'in' | 'out' | 'err' | 'sys';
  text: string;
}

const EXAMPLES = [
  'body.help()',
  'body.sense()',
  'body.move(shoulder_R, 0, 0, 150)',
  'body.pose(wave)',
  'body.get(heart)',
  'body.scan(skeletal)',
  'body.layer(cell)',
  'body.system(skeletal+circulatory)',
  'body.vitals(88, 18)',
  'body.joints()',
];

export default function ApiConsole({ ctx }: { ctx: EngineCtx }) {
  const [lines, setLines] = useState<Line[]>([
    { kind: 'sys', text: 'کنسول بدن SOMATOS-1 — برای راهنما body.help() را اجرا کنید. ↑/↓ تاریخچه · Tab تکمیل' },
  ]);
  const [input, setInput] = useState('');
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [lines]);

  const push = (l: Line | Line[]) => setLines((p) => [...p, ...(Array.isArray(l) ? l : [l])]);

  const run = async (raw: string) => {
    const code = raw.trim();
    if (!code || busy) return;
    setBusy(true);
    push({ kind: 'in', text: '› ' + code });
    setHist((h) => [code, ...h].slice(0, 60));
    setHi(-1);
    setInput('');
    const t0 = performance.now();
    try {
      const parsed = parseCommand(code);
      if ('error' in parsed) {
        push({ kind: 'err', text: 'خطای تجزیه — نمونه درست: body.move(elbow_L, -60, 0, 0)' });
      } else {
        const res = await executeBodyCommand(ctxRef.current, parsed.cmd, parsed.args, 'console');
        push({ kind: res.ok ? 'out' : 'err', text: res.text });
        const ms = Math.round(performance.now() - t0);
        try {
          await fetch('/api/commands', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'console', command: parsed.cmd, args: parsed.args, status: res.ok ? 'done' : 'error', result: res.text.slice(0, 500), latency_ms: ms }),
          });
        } catch { /* offline-safe */ }
      }
    } catch (e) {
      push({ kind: 'err', text: 'خطا: ' + (e as Error).message });
    } finally {
      setBusy(false);
      inRef.current?.focus();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-teal-500/25 bg-[#060b0e]/95" dir="ltr">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-teal-300" />
          <span className="font-mono text-xs font-bold tracking-wider text-teal-200">BODY API CONSOLE</span>
          <button
            onClick={() => setShowHelp((s) => !s)}
            className="flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 hover:border-teal-400/50 hover:text-teal-200"
          >
            <BookOpen size={11} /> examples
          </button>
        </div>
        <button onClick={() => setLines([])} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" title="clear">
          <Trash2 size={13} />
        </button>
      </div>
      {showHelp && (
        <div className="grid grid-cols-1 gap-1 border-b border-white/10 bg-slate-950/60 p-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => run(e)}
              className="rounded px-2 py-1 text-left font-mono text-[11px] text-teal-300/90 hover:bg-teal-500/10 hover:text-teal-100"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div ref={boxRef} className="flex-1 space-y-1.5 overflow-y-auto p-3 font-mono text-[11.5px] leading-relaxed">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.kind === 'in' ? 'text-amber-200' :
              l.kind === 'err' ? 'whitespace-pre-wrap text-red-300' :
              l.kind === 'sys' ? 'text-slate-400' : 'whitespace-pre-wrap text-emerald-200/95'
            }
            dir={l.kind === 'in' ? 'ltr' : 'auto'}
          >
            {l.text}
          </div>
        ))}
        {busy && <div className="animate-pulse text-teal-400">executing…</div>}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); run(input); }}
        className="flex items-center gap-1.5 border-t border-white/10 bg-black/40 px-3 py-2"
      >
        <ChevronRight size={15} className="shrink-0 text-teal-400" />
        <input
          ref={inRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); if (hist.length) { const n = Math.min(hi + 1, hist.length - 1); setHi(n); setInput(hist[n]); } }
            if (e.key === 'ArrowDown') { e.preventDefault(); if (hi > 0) { setHi(hi - 1); setInput(hist[hi - 1]); } else { setHi(-1); setInput(''); } }
            if (e.key === 'Tab') {
              e.preventDefault();
              const cands = ['body.move(', 'body.pose(', 'body.sense(', 'body.scan(', 'body.get(', 'body.layer(', 'body.system(', 'body.vitals(', 'body.joints(', 'body.help('];
              const hit = cands.find((c) => c.startsWith(input) && c !== input);
              if (hit) setInput(hit);
            }
          }}
          placeholder="body.move(elbow_L, -60, 0, 0)"
          className="w-full bg-transparent font-mono text-[12px] text-teal-100 outline-none placeholder:text-slate-600"
          spellCheck={false}
          autoComplete="off"
        />
        <kbd className="hidden shrink-0 rounded border border-white/10 px-1 font-mono text-[9px] text-slate-500 sm:block">⏎</kbd>
      </form>
    </div>
  );
}
