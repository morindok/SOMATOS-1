import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Dna, Pause, Play, RotateCcw, Search, Maximize2, Minimize2, Eye, EyeOff, Mic, MicOff } from 'lucide-react';
import BodyViewport, { type CameraCmd } from './components/BodyViewport';
import ApiConsole from './components/ApiConsole';
import VitalsPanel from './components/VitalsPanel';
import BrainPanel from './components/BrainPanel';
import EmbodimentHUD from './components/EmbodimentHUD';
import { LayerRail, SystemToggles, DetailPanel } from './components/Panels';
import AiBridge from './components/AiBridge';
import { SYSTEMS, LAYERS, ANATOMY_PARTS, type AnatomicalPart } from './data/anatomy';
import {
  setMicroLayer, flashPart, clearFlash, setHornGrowth, BODY_FOCUS,
  type BodyRefs, type VitalParams,
} from './three/humanBuilder';
import { getBrain } from './lib/brain';
import type { EngineCtx } from './lib/bodyApi';

interface DbPart extends AnatomicalPart { id?: number; facts?: unknown }

export default function App() {
  const [body, setBody] = useState<BodyRefs | null>(null);
  const bodyRef = useRef<BodyRefs | null>(null);
  const vitalsRef = useRef<VitalParams>({ heartRate: 72, breathRate: 16, breathAmp: 1 });
  const [bpm, setBpm] = useState(72);
  const [brpm, setBrpm] = useState(16);
  const [running, setRunning] = useState(true);
  const [layer, setLayerState] = useState('body');
  const [systems, setSystems] = useState<Set<string>>(() => new Set(SYSTEMS.map((s) => s.id)));
  const [skinOpacity, setSkinOpacity] = useState(1);
  const [showSkin, setShowSkin] = useState(true);
  const [parts, setParts] = useState<DbPart[]>([]);
  const [partsLoaded, setPartsLoaded] = useState(false);
  const [selected, setSelected] = useState<DbPart | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<THREE.Vector3 | null>(null);
  const [cameraCmd, setCameraCmd] = useState<CameraCmd | null>(null);
  const [query, setQuery] = useState('');
  const [searchRes, setSearchRes] = useState<DbPart[]>([]);
  const [searching, setSearching] = useState(false);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [fps, setFps] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const audioRef = useRef<{ ctx: AudioContext | null; analyser: AnalyserNode | null }>({ ctx: null, analyser: null });

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const handleBody = (b: BodyRefs | null) => {
    bodyRef.current = b;
    setBody(b);
  };

  // ---- load anatomy inventory (+ self-seed the local DB on first boot) ----
  useEffect(() => {
    (async () => {
      try {
        let r = await fetch('/api/body-parts?limit=600');
        if (r.ok) {
          let data: DbPart[] = await r.json();
          if (data.length === 0) {
            // introduce the body to its own database
            for (let i = 0; i < ANATOMY_PARTS.length; i += 100) {
              await fetch('/api/body-parts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: ANATOMY_PARTS.slice(i, i + 100) }),
              }).catch(() => {});
            }
            r = await fetch('/api/body-parts?limit=600');
            data = r.ok ? await r.json() : [];
          }
          setParts(data);
          const c: Record<string, number> = {};
          for (const p of data) c[p.system] = (c[p.system] || 0) + 1;
          setCounts(c);
        }
      } catch { /* ignore */ }
      setPartsLoaded(true);
    })();
  }, []);

  // ---- load saved joint pose ----
  useEffect(() => {
    if (!body) return;
    (async () => {
      try {
        const r = await fetch('/api/joints');
        if (!r.ok) return;
        const rows: { joint_id: string; rx: number; ry: number; rz: number }[] = await r.json();
        for (const row of rows) {
          const j = body.joints.get(row.joint_id);
          if (j) {
            const rad = THREE.MathUtils.degToRad;
            j.rotation.set(rad(row.rx || 0), rad(row.ry || 0), rad(row.rz || 0));
            body.targets[row.joint_id] = [row.rx || 0, row.ry || 0, row.rz || 0];
          }
        }
      } catch { /* ignore */ }
    })();
  }, [body]);

  // ---- vitals -> engine + periodic DB snapshot ----
  useEffect(() => {
    vitalsRef.current.heartRate = bpm;
    vitalsRef.current.breathRate = brpm;
  }, [bpm, brpm]);
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/vitals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heart_rate: Math.round(vitalsRef.current.heartRate), breath_rate: Math.round(vitalsRef.current.breathRate), temp_c: 37.0, spo2: 98, systolic: 120, diastolic: 80 }),
      }).catch(() => {});
      fetch('/api/sense', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'heartbeat', value: Math.round(vitalsRef.current.heartRate), unit: 'bpm', detail: { breath: Math.round(vitalsRef.current.breathRate) } }),
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, []);

  // ---- genome traits -> 3D (horns) + gradual morphogenesis ----
  const traitsRef = useRef<string>('');
  useEffect(() => {
    const apply = (traits: string[]) => {
      const key = traits.join(',');
      if (key === traitsRef.current) return;
      traitsRef.current = key;
      if (traits.includes('horns') && key !== '') showToast('🐂 صفه ژنومی «شاخ» فعال شد — در حال رشد تدریجی');
    };
    const poll = async () => {
      try {
        const r = await fetch('/api/genome?action=traits');
        if (r.ok) { const d = await r.json(); apply(d.active_traits || []); }
        // morphogenesis: horns length follows expression age (growth is time-based)
        if (traitsRef.current.includes('horns')) {
          const g = await fetch('/api/genome?action=growth&trait=horns');
          if (g.ok) {
            const gd = await g.json();
            const b = bodyRef.current;
            if (b && gd.expressed) setHornGrowth(b, gd.progress);
          }
        }
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, []);

  // ---- brain memory: restore on boot, autosave every 2 minutes ----
  useEffect(() => {
    let restored = false;
    const restore = async () => {
      try {
        const r = await fetch('/api/brain?action=memory');
        if (!r.ok) return;
        const d = await r.json();
        if (d.latest?.weights_b64) {
          restored = getBrain().restore(d.latest.weights_b64);
          if (restored) showToast('🧠 حافظه‌ی قبلی مغز بازیابی شد (پلاستیسیته ماندگار)');
        }
      } catch { /* ignore */ }
    };
    restore();
    const id = setInterval(async () => {
      try {
        const { weights_b64, stats } = getBrain().snapshot();
        await fetch('/api/brain', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weights_b64, stats }),
        });
      } catch { /* ignore */ }
    }, 120000);
    return () => clearInterval(id);
  }, []);

  // ---- layer -> micro stage + camera + systems preset ----
  const setLayer = (l: string) => {
    setLayerState(l);
    const b = bodyRef.current;
    if (b) setMicroLayer(b, ['atom', 'molecule', 'cell', 'tissue'].includes(l) ? l : null);
    if (['atom', 'molecule', 'cell', 'tissue'].includes(l)) {
      setCameraCmd({ focus: 'micro' });
    } else if (l === 'body') {
      setSystems(new Set(SYSTEMS.map((s) => s.id)));
      setSkinOpacity(showSkin ? 1 : 0.25);
      setCameraCmd({ focus: 'body' });
    } else if (l === 'organ') {
      setSystems(new Set(['circulatory', 'respiratory', 'digestive', 'urinary', 'endocrine', 'immune', 'nervous']));
      setSkinOpacity(0.15);
      setCameraCmd({ focus: 'body' });
    } else if (l === 'system') {
      setSystems(new Set(['skeletal', 'muscular', 'nervous', 'circulatory']));
      setSkinOpacity(0.12);
      setCameraCmd({ focus: 'body' });
    }
    showToast(`لایه مقیاس: ${LAYERS.find((x) => x.id === l)?.fa}`);
  };

  const setSystemsByName = (names: string[] | 'all') => {
    if (names === 'all') {
      setSystems(new Set(SYSTEMS.map((s) => s.id)));
      setSkinOpacity(showSkin ? 1 : 0.25);
    } else {
      setSystems(new Set(names));
      setSkinOpacity(names.includes('integumentary') ? (showSkin ? 1 : 0.25) : 0.12);
    }
  };

  // ---- picking ----
  const onPick = (partId: string, system: string, point: THREE.Vector3) => {
    const b = bodyRef.current;
    if (b) { clearFlash(b); flashPart(b, partId); }
    setSelectedPoint(point.clone());
    const p = parts.find((x) => x.part_id === partId);
    if (p) {
      setSelected(p);
    } else {
      // fallback card for generated sub-meshes
      setSelected({
        part_id: partId, name_fa: partId, name_en: partId, latin: '—',
        system, layer: 'organ', parent_id: null, movable: false,
        description_fa: 'جزء سه‌بعدی بدن — شناسنامه تفصیلی این زیربخش به‌زودی به پایگاه آناتومی افزوده می‌شود.',
        description_en: '',
      });
    }
  };

  // ---- search ----
  useEffect(() => {
    if (!query.trim()) { setSearchRes([]); return; }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch('/api/body-parts?q=' + encodeURIComponent(query.trim()) + '&limit=12');
        if (r.ok) setSearchRes(await r.json());
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const pickFromSearch = (p: DbPart) => {
    const b = bodyRef.current;
    setSelected(p);
    setQuery('');
    setSearchRes([]);
    if (b) {
      clearFlash(b);
      const wp = flashPart(b, p.part_id);
      if (wp) {
        setSelectedPoint(wp.clone());
        setCameraCmd({ focus: 'part', point: wp.clone(), dist: 0.9 });
      } else {
        showToast('این جزء در مقیاس میکرو/نامرئی است — شناسنامه نمایش داده شد');
      }
    }
  };

  // ---- engine ctx for console + AI bridge ----
  const ctx: EngineCtx = useMemo(() => ({
    body: () => bodyRef.current,
    vitals: () => vitalsRef.current,
    parts: () => parts,
    setLayer,
    setSystems: setSystemsByName,
    focusCamera: (point: THREE.Vector3, dist = 1.1) => setCameraCmd({ focus: 'part', point: point.clone(), dist }),
    showToast,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [parts, showSkin]);

  const resetCamera = () => setCameraCmd({ focus: 'body' });

  return (
    <div dir="rtl" className="flex h-screen w-screen flex-col overflow-hidden bg-[#05080b] text-slate-100" style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}>
      {/* header */}
      <header className="z-20 flex items-center gap-3 border-b border-teal-500/20 bg-slate-950/90 px-3 py-2 backdrop-blur md:px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 shadow-[0_0_18px_rgba(45,212,191,0.5)]">
          <Dna size={20} className="text-slate-950" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-black leading-tight md:text-base">
            سوماتوس-۱ <span className="font-mono font-normal text-teal-300" dir="ltr">SOMATOS-1</span>
          </h1>
          <p className="truncate text-[10px] text-slate-400 md:text-[11px]">
            بدن انسان در اتاق ایزوله · از اتم تا ارگانیسم · {partsLoaded ? `${parts.length} جزء ثبت‌شده` : 'در حال بارگذاری آناتومی…'}
          </p>
        </div>
        <div className="mr-auto flex items-center gap-1.5" dir="ltr">
          <span className="hidden rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-400 md:block">{fps} fps</span>
          <button onClick={resetCamera} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:border-teal-400/50 hover:text-teal-200" title="بازنشانی دوربین">
            <RotateCcw size={15} />
          </button>
          <button
            onClick={() => { setShowSkin(!showSkin); setSkinOpacity(!showSkin ? 1 : 0.18); }}
            className="rounded-lg border border-white/10 p-2 text-slate-300 hover:border-teal-400/50 hover:text-teal-200"
            title="نمایش/پنهان پوست"
          >
            {showSkin ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button
            onClick={() => setRunning(!running)}
            className={`rounded-lg border p-2 ${running ? 'border-teal-400/50 text-teal-200' : 'border-amber-400/50 text-amber-200'}`}
            title={running ? 'توقف شبیه‌سازی' : 'ادامه شبیه‌سازی'}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button onClick={() => setFull(!full)} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:border-teal-400/50" title="تمام‌صفحه سه‌بعدی">
            {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={async () => {
              if (audioRef.current.analyser) {
                await audioRef.current.ctx?.close();
                audioRef.current = { ctx: null, analyser: null };
              } else {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  const ctx = new AudioContext();
                  const src = ctx.createMediaStreamSource(stream);
                  const analyser = ctx.createAnalyser();
                  analyser.fftSize = 256;
                  src.connect(analyser);
                  audioRef.current = { ctx, analyser };
                } catch { /* mic denied */ }
              }
            }}
            className={`rounded-lg border p-2 ${audioRef.current.analyser ? 'border-rose-400/60 bg-rose-500/15 text-rose-200' : 'border-white/10 text-slate-300 hover:border-rose-400/50 hover:text-rose-200'}`}
            title={audioRef.current.analyser ? 'قطع حس شنوایی' : 'فعال‌سازی حس شنوایی (میکروفون)'}
          >
            {audioRef.current.analyser ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        </div>
      </header>

      {/* main */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row">
        {/* 3D viewport */}
        <div className={`relative min-h-[46vh] overflow-hidden rounded-xl border border-teal-500/20 bg-black lg:min-h-0 ${full ? 'flex-1' : 'lg:flex-[1.5]'}`}>
          <BodyViewport
            bodyRefOut={handleBody}
            vitalsRef={vitalsRef}
            cameraCmd={cameraCmd}
            systems={systems}
            skinOpacity={skinOpacity}
            paused={!running}
            onPick={onPick}
            onFps={setFps}
            audioRef={audioRef}
          />
          {toast && (
            <div className="absolute bottom-3 right-3 max-w-[70%] rounded-lg border border-teal-400/40 bg-slate-950/90 px-3 py-1.5 text-[11px] text-teal-100 shadow-lg backdrop-blur">
              {toast}
            </div>
          )}
        </div>

        {!full && (
          <>
            {/* side panel */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto lg:max-w-[340px]">
              {/* search */}
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 backdrop-blur">
                  <Search size={14} className="shrink-0 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="جستجوی جزء بدن… (قلب، femur، neuron)"
                    className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-600"
                  />
                  {searching && <span className="animate-pulse text-[10px] text-teal-400">…</span>}
                </div>
                {searchRes.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full space-y-0.5 overflow-y-auto rounded-xl border border-white/15 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur">
                    {searchRes.map((p) => (
                      <button
                        key={p.part_id}
                        onClick={() => pickFromSearch(p)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right hover:bg-teal-500/10"
                      >
                        <span className="flex-1 text-[11.5px] font-bold text-slate-100">{p.name_fa}</span>
                        <span className="font-mono text-[9px] text-slate-500" dir="ltr">{p.part_id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <LayerRail layer={layer} setLayer={setLayer} />
              <DetailPanel
                part={selected}
                onClose={() => { setSelected(null); if (bodyRef.current) clearFlash(bodyRef.current); }}
                onFocus={() => { if (selectedPoint) setCameraCmd({ focus: 'part', point: selectedPoint.clone(), dist: 0.7 }); }}
              />
              <SystemToggles systems={systems} setSystems={setSystems} counts={counts} />
              <VitalsPanel vitalsRef={vitalsRef} bpm={bpm} setBpm={setBpm} brpm={brpm} setBrpm={setBrpm} running={running} />
              <BrainPanel />
              <AiBridge ctx={ctx} bridgeOn={bridgeOn} setBridgeOn={setBridgeOn} />
              <EmbodimentHUD bodyRef={bodyRef} vitalsRef={vitalsRef} audioRef={audioRef} />
            </div>

            {/* console */}
            <div className="flex min-h-[38vh] flex-1 flex-col lg:min-h-0 lg:max-w-[380px]">
              <ApiConsole ctx={ctx} />
              <div className="mt-1.5 rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-500">
                اتاق کاملاً ایزوله است: بدون در، پنجره، ورودی یا خروجی. تنها راه ارتباط بدن، همین کنسول و پل API است.
                <span className="font-mono" dir="ltr"> · chamber {BODY_FOCUS ? '7×4.2×7 m' : ''} · sealed</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
