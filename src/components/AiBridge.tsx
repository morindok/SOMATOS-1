import { useEffect, useRef, useState } from 'react';
import { Bot, KeyRound, Copy, Check, Trash2, Radio, Inbox, Send } from 'lucide-react';
import { executeBodyCommand, type EngineCtx } from '../lib/bodyApi';

interface KeyRow { id: number; label: string; key_prefix: string; active: boolean; last_used_at: string | null; created_at: string; }
interface CmdRow { id: number; source: string; command: string; args: unknown; status: string; result: string | null; created_at: string; }

const FULL_COMMANDS = [
  'move', 'pose', 'sense', 'scan', 'get', 'vitals', 'layer', 'system',
  'heartbeat', 'breath', 'joints', 'motor',
  'metabolism', 'mood', 'feel', 'pain', 'hurt', 'soothe', 'comfort',
  'feed', 'eat', 'drink', 'sleep', 'wake', 'scale', 'parts',
  'brain', 'neurons', 'think', 'genome', 'genes',
  'read', 'base', 'mutate', 'crispr', 'express', 'traits', 'growth', 'memory',
];

export default function AiBridge({ ctx, bridgeOn, setBridgeOn }: { ctx: EngineCtx; bridgeOn: boolean; setBridgeOn: (b: boolean) => void }) {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [label, setLabel] = useState('opencode-agent');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [inbox, setInbox] = useState<CmdRow[]>([]);
  const [recent, setRecent] = useState<CmdRow[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [autoExec, setAutoExec] = useState(true);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => { setBaseUrl(window.location.origin); }, []);

  const fetchKeys = async () => {
    try {
      const r = await fetch('/api/keys');
      if (r.ok) setKeys(await r.json());
    } catch { /* ignore */ }
  };
  const fetchRecent = async () => {
    try {
      const r = await fetch('/api/commands?limit=12');
      if (r.ok) setRecent(await r.json());
    } catch { /* ignore */ }
  };
  useEffect(() => { fetchKeys(); fetchRecent(); }, []);

  const createKey = async () => {
    try {
      const r = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
      if (r.ok) {
        const d = await r.json();
        setNewKey(d.key);
        setSelectedKey(d.key);
        fetchKeys();
      }
    } catch { /* ignore */ }
  };
  const revoke = async (id: number) => {
    try {
      await fetch('/api/keys?id=' + id, { method: 'DELETE' });
      fetchKeys();
    } catch { /* ignore */ }
  };

  // Auto-fill key from AGENT_KEY.txt on mount
  useEffect(() => {
    fetch('/api/bridge?action=state').catch(() => {});
    try {
      const stored = localStorage.getItem('somatos_key');
      if (stored && !selectedKey) setSelectedKey(stored);
    } catch {}
  }, []);

  // Persist selected key
  useEffect(() => {
    if (selectedKey) localStorage.setItem('somatos_key', selectedKey);
  }, [selectedKey]);

  // The live body polls the bridge inbox and executes external AI commands
  const bridgeOnRef = useRef(bridgeOn);
  bridgeOnRef.current = bridgeOn;
  const autoExecRef = useRef(autoExec);
  autoExecRef.current = autoExec;
  useEffect(() => {
    if (!bridgeOn || !selectedKey) return;
    let stop = false;
    const poll = async () => {
      if (stop) return;
      try {
        const r = await fetch('/api/bridge?action=inbox&limit=10', { headers: { 'X-API-Key': selectedKey } });
        if (r.ok) {
          const items: CmdRow[] = await r.json();
          setInbox(items);
          for (const item of items) {
            const args = (item.args as Record<string, unknown>) || {};
            // Skip server-side commands here — they're already executed by the server
            if (['brain','neurons','think','genome','read','base','mutate','crispr','express','traits','growth','memory','genes'].includes(item.command)) {
              continue;
            }
            if (autoExecRef.current) {
              const res = await executeBodyCommand(ctxRef.current, item.command, args, 'external');
              await fetch('/api/commands', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, status: res.ok ? 'done' : 'error', result: res.text.slice(0, 800) }),
              });
              ctxRef.current.showToast(`🤖 ${item.command} → ${res.ok ? 'اجرا شد' : 'خطا'}`);
            }
          }
          if (items.length) fetchRecent();
        }
      } catch { /* ignore */ }
      if (!stop) setTimeout(poll, 2000);
    };
    poll();
    return () => { stop = true; };
  }, [bridgeOn, selectedKey]);

  const snippet = `# SOMATOS-1 — Body API (Python)
import requests, time

BASE = "${baseUrl || 'http://localhost:5173'}"
KEY  = "${selectedKey || 'your-key-here'}"
H = {"X-API-Key": KEY, "Content-Type": "application/json"}

def act(cmd, args={}):
    r = requests.post(f"{BASE}/api/bridge", json={"command": cmd, "args": args}, headers=H)
    d = r.json()
    for _ in range(30):
        j = requests.get(f"{BASE}/api/bridge?action=result&id={d[\"id\"]}", headers=H).json()
        if j.get("status") != "queued": return j
        time.sleep(0.5)
    return d

def feel():
    return requests.get(f"{BASE}/api/bridge?action=state", headers=H).json()

# ── حیات ──────────────────────────────────────────────
print(act("sense", {}))                 # حس کلی بدن
print(act("metabolism", {}))            # متابولیسم: قلب، تنفس، دما
print(act("mood", {}))                  # حال و هوا
print(act("vitals", {"hr": 72, "br": 16}))  # تنظیم پایه ضربان

# ── حرکت ──────────────────────────────────────────────
print(act("move", {"joint": "shoulder_R", "x": -90, "y": 0, "z": 0}))
print(act("move", {"joint": "knee_L",   "x":  45, "y": 0, "z": 0}))
print(act("pose", {"name": "wave"}))    # ژست دست تکان دادن
print(act("motor", {"impulses": [
    {"joint": "shoulder_R", "dx": 30, "dy": 0,  "dz": 0,  "strength": 0.8},
    {"joint": "neck",       "dx": 10, "dy": 20, "dz": -5, "strength": 0.6},
]}))

# ── ذهن ──────────────────────────────────────────────
print(act("brain", {}))                 # آمار مغز
print(act("think", {"region": "ctx_frontal"}))  # فکر کردن
print(act("neurons", {"index": 0, "count": 3}))
print(act("memory", {}))                # حافظه STDP

# ── ژن ───────────────────────────────────────────────
print(act("genome", {}))                # خلاصه ژنوم
print(act("read", {"chromosome": "chr11", "start": 5225464, "len": 60}))
print(act("mutate", {"chromosome": "chr11", "position": 5225464, "base": "A"}))
print(act("express", {"trait": "horns"}))
print(act("growth", {"trait": "horns"}))
print(act("crispr", {"gene": "HBB", "codon": 6, "aa": "V"}))

# ── نیازها ───────────────────────────────────────────
print(act("feed", {}))                  # غذا خوردن
print(act("drink", {}))                 # آب خوردن
print(act("pain", {"severity": 0.7}))   # درد
print(act("soothe", {}))                # آرامش
print(act("sleep", ["--force"]))        # خواب
print(act("wake", {}))                  # بیداری

# ── وضعیت کامل ──────────────────────────────────────
s = feel()
print(f"Heart: {s['vitals']['heart_rate']} bpm")
print(f"Joints: {len(s['joints'])} متحرک")
print(f"Parts: {s['parts_count']} ثبت شده")
print(f"Traits: {s['genome']['active_traits']}")`;

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-950/40 to-slate-950/80 p-3 backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <Bot size={15} className="text-violet-300" />
        <h3 className="text-xs font-black text-violet-100">پل هوش مصنوعی خارجی</h3>
        <button
          onClick={() => setBridgeOn(!bridgeOn)}
          className={`mr-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all ${
            bridgeOn ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-white/15 bg-white/5 text-slate-400'
          }`}
        >
          <Radio size={11} /> {bridgeOn ? 'پل فعال ●' : 'پل خاموش'}
        </button>
      </div>

      <p className="mb-2 text-[10.5px] leading-relaxed text-slate-400">
        ایجنت خارجی با کلید API دستور میفرستد؛ <b className="text-slate-200">بدن زنده</b> در همین صفحه آن را اجرا میکند و نتیجه را برمیگرداند.
        {bridgeOn && <span className="text-emerald-300 ml-1">●{"  "}"polling every 2s"</span>}
      </p>

      {/* keys */}
      <div className="mb-2 rounded-lg border border-white/10 bg-black/30 p-2">
        <div className="mb-1.5 flex items-center gap-1.5">
          <KeyRound size={12} className="text-amber-300" />
          <span className="text-[11px] font-bold text-slate-200">کلیدهای API</span>
        </div>
        <div className="flex gap-1.5">
          <input
            value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="نام ایجنت"
            className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white outline-none focus:border-violet-400/60"
          />
          <button onClick={createKey} className="shrink-0 rounded bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-500">+ ساخت کلید</button>
        </div>
        {newKey && (
          <div className="mt-1.5 rounded border border-amber-400/40 bg-amber-500/10 p-2" dir="ltr">
            <div className="mb-1 text-[9px] text-amber-200">⚠ فقط یکبار نمایش داده میشود — ذخیره کنید:</div>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 break-all font-mono text-[10px] text-amber-100">{newKey}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="rounded border border-white/15 p-1 text-slate-300 hover:text-white"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        )}
        <div className="mt-1.5 max-h-24 space-y-1 overflow-y-auto">
          {keys.map((k) => (
            <div key={k.id} className={`flex items-center gap-1.5 rounded border px-2 py-1 ${k.active ? 'border-white/10' : 'border-white/5 opacity-40'}`} dir="ltr">
              <span className={`h-1.5 w-1.5 rounded-full ${k.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="flex-1 truncate font-mono text-[10px] text-slate-300">{k.label} · {k.key_prefix}</span>
              {k.active && (
                <button onClick={() => revoke(k.id)} className="text-slate-500 hover:text-red-400" title="revoke">
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
          {keys.length === 0 && <div className="py-1 text-center text-[10px] text-slate-600">هنوز کلیدی ساخته نشده</div>}
        </div>
        <div className="mt-1.5 flex gap-1.5" dir="ltr">
          <input
            value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}
            placeholder="کلید را وارد کنید یا از فیلد بالا انتخاب کنید"
            type="password"
            className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white outline-none focus:border-violet-400/60"
          />
        </div>
        {!selectedKey && bridgeOn && <div className="mt-1 text-[10px] text-amber-300">⚠ برای فعال شدن پل، کلید را وارد کنید.</div>}
      </div>

      {/* auto-exec toggle */}
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5">
        <input
          id="autoExec" type="checkbox" checked={autoExec}
          onChange={(e) => setAutoExec(e.target.checked)}
          className="accent-violet-500"
        />
        <label htmlFor="autoExec" className="text-[10.5px] text-slate-300 select-none cursor-pointer">اجرای خودکار دستورات ورودی</label>
        <span className="ml-auto font-mono text-[9px] text-slate-500">{FULL_COMMANDS.length} command</span>
      </div>

      {/* inbox */}
      <div className="mb-2 rounded-lg border border-white/10 bg-black/30 p-2">
        <div className="mb-1 flex items-center gap-1.5">
          <Inbox size={12} className="text-sky-300" />
          <span className="text-[11px] font-bold text-slate-200">صف دستورات AI خارجی</span>
          <span className="mr-auto font-mono text-[10px] text-slate-500" dir="ltr">{inbox.length} queued</span>
        </div>
        <div className="max-h-32 space-y-1 overflow-y-auto" dir="ltr">
          {recent.filter((c) => c.source === 'external').slice(0, 8).map((c) => (
            <div key={c.id} className="rounded border border-white/5 bg-white/[0.03] px-2 py-1 font-mono text-[10px]">
              <span className={c.status === 'done' ? 'text-emerald-300' : c.status === 'error' ? 'text-red-300' : 'text-amber-300'}>#{c.id} {c.status}</span>
              <span className="text-slate-300"> {c.command} {JSON.stringify(c.args)}</span>
            </div>
          ))}
          {recent.filter((c) => c.source === 'external').length === 0 && (
            <div className="py-1 text-center font-mono text-[10px] text-slate-600">no external commands yet — send one from your agent</div>
          )}
        </div>
      </div>

      {/* snippet */}
      <details className="rounded-lg border border-white/10 bg-black/40">
        <summary className="flex cursor-pointer items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold text-slate-200">
          <Send size={12} className="text-violet-300" /> کد اتصال کامل (پایتون)
        </summary>
        <pre className="overflow-x-auto border-t border-white/10 p-2 font-mono text-[10px] leading-relaxed text-violet-200/90" dir="ltr">{snippet}</pre>
      </details>
    </div>
  );
}
