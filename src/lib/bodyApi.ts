import * as THREE from 'three';
import { JOINTS, POSES, type AnatomicalPart } from '../data/anatomy';
import {
  setJointTarget, getJointCurrent, applyPoseTargets, flashPart, queueMotorImpulse,
  type BodyRefs, type VitalParams, BODY_FOCUS,
} from '../three/humanBuilder';
import { getBrain } from './brain';
import { getMetabolism } from './metabolism';
import { getLimbic } from './limbic';

export interface EngineCtx {
  body: () => BodyRefs | null;
  vitals: () => VitalParams;
  parts: () => AnatomicalPart[];
  setLayer: (layer: string) => void;
  setSystems: (systems: string[] | 'all') => void;
  focusCamera: (point: THREE.Vector3, dist?: number) => void;
  showToast: (msg: string) => void;
}

export interface CmdResult {
  ok: boolean;
  text: string;
  data?: unknown;
}

const JOINT_IDS = new Set(JOINTS.map((j) => j.joint_id));

function findPart(parts: AnatomicalPart[], q: string): AnatomicalPart | undefined {
  const s = q.toLowerCase();
  return (
    parts.find((p) => p.part_id.toLowerCase() === s) ||
    parts.find((p) => p.part_id.toLowerCase().includes(s)) ||
    parts.find((p) => p.name_en.toLowerCase().includes(s)) ||
    parts.find((p) => p.name_fa.includes(q))
  );
}

function senseSnapshot(ctx: EngineCtx) {
  const b = ctx.body();
  const v = ctx.vitals();
  const joints: Record<string, [number, number, number]> = {};
  if (b) for (const id of JOINT_IDS) joints[id] = getJointCurrent(b, id);
  return {
    time: new Date().toISOString(),
    proprioception: joints,
    vitals: {
      heart_rate_bpm: v.heartRate,
      breath_rate_per_min: v.breathRate,
      breath_amplitude: v.breathAmp,
      temp_c: v.coreTemp ?? 37.0,
      skin_temp_c: v.skinTemp ?? 33.0,
      spo2_pct: v.spo2 ?? 98,
      blood_pressure: v.bp ?? '120/80',
      sweat: v.sweat ?? 0,
      fatigue: v.fatigue ?? 0,
      shiver: v.shiver ?? 0,
      flush: v.flush ?? 0,
      mood_fa: v.limbic?.moodFa ?? 'آرام',
      pain: v.limbic?.pain ?? 0,
      valence: v.limbic?.valence ?? 0,
      arousal: v.limbic?.arousal ?? 0,
      hunger: v.limbic?.hunger ?? 0,
      thirst: v.limbic?.thirst ?? 0,
      sleep_pressure: v.limbic?.sleepPressure ?? 0,
      asleep: v.limbic?.asleep ?? false,
    },
    embodiment: 'SOMATOS-1 · sealed chamber · 0 external I/O',
  };
}

// Parse: body.move(elbow_L, -60, 0, 0) | body.move elbow_L -60 0 0 | move(...)
export function parseCommand(raw: string): { cmd: string; args: string[] } | { error: string } {
  const s = raw.trim().replace(/^body\./i, '').trim();
  if (!s) return { error: 'empty' };
  const m = s.match(/^([a-zA-Z_]+)\s*(\((.*)\))?\s*(.*)$/);
  if (!m) return { error: 'cannot parse' };
  const cmd = m[1].toLowerCase();
  let args: string[] = [];
  if (m[3] !== undefined) {
    // inside parens: split by comma
    args = m[3].split(',').map((a) => a.trim()).filter(Boolean).map((a) => a.replace(/^['"]|['"]$/g, ''));
  } else if (m[4]) {
    args = m[4].split(/\s+/).filter(Boolean);
  }
  return { cmd, args };
}

export async function executeBodyCommand(
  ctx: EngineCtx, command: string, rawArgs: Record<string, unknown> | string[] | undefined, source: string,
): Promise<CmdResult> {
  void source; // reserved for per-origin command gating
  const cmd = command.toLowerCase();
  const parts = ctx.parts();
  const b = ctx.body();
  const A = (Array.isArray(rawArgs) ? rawArgs : []) as string[];
  const O = (!Array.isArray(rawArgs) ? (rawArgs as Record<string, unknown>) || {} : {}) as Record<string, unknown>;
  const arg = (i: number, key: string, dflt = ''): string => {
    if (O[key] !== undefined) return String(O[key]);
    return A[i] !== undefined ? String(A[i]) : dflt;
  };
  const num = (i: number, key: string, dflt = 0): number => {
    const v = arg(i, key, '');
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : dflt;
  };

  switch (cmd) {
    case 'help': {
      return {
        ok: true,
        text: [
          'دستورات بدن (Body API):',
          '  body.move(joint, x, y, z)   حرکت مفصل به درجه — مثلاً body.move(elbow_L, -60, 0, 0)',
          '  body.pose(name)             اجرای ژست: anatomical, wave, bow, tpose, sit, nod, shake, arms_up',
          '  body.sense(channel?)        حس بدن: all | joints | vitals | heart | breath',
          '  body.scan(system?)          شمارش اجزا: skeletal, muscular, nervous, circulatory, ...',
          '  body.get(part)              جزئیات یک جزء + فوکوس دوربین — مثلاً body.get(heart)',
          '  body.layer(name)            لایه مقیاس: atom, molecule, cell, tissue, organ, system, body',
          '  body.system(names|all)      نمایش دستگاه‌ها — مثلاً body.system(skeletal+circulatory)',
          '  body.vitals(hr, br)         تنظیم ضربان قلب و تنفس — مثلاً body.vitals(90, 20)',
          '  body.joints()               فهرست ۱۶ مفصل متحرک با دامنه حرکتی',
          '  body.parts(system?)         فهرست اجزا (۲۰ تای اول)',
          '  body.brain()                مغز: ۸۶ میلیارد نورون، نواحی و فعالیت زنده',
          '  body.neurons(index)         آدرس‌دهی نورون‌های مجازی از ۸۶ میلیارد',
          '  body.think(region)          تحریک ناحیه مغزی و دیدن آبشار عصبی',
          '  body.genome()               خلاصه ژنوم (GRCh38 مجازی + ژن‌های واقعی)',
          '  body.genes()                فهرست ژن‌ها',
          '  body.read(chr, start, len)  خواندن توالی DNA',
          '  body.mutate(chr, pos, base) جهش نقطه‌ای',
          '  body.crispr(gene, codon, aa) ویرایش ژنی CRISPR',
          '  body.express(trait)         بیان صفت (horns!)',
          '  body.traits()               صفات فعال ژنومی',
          '  body.growth()               رشد تدریجی صفات (مورفوژنز)',
          '  body.memory()               حافظه‌ی مغز: پلاستیسیته STDP',
          '  body.metabolism()           متابولیسم زنده: بار حرکتی → قلب/تنفس',
          '  body.mood()                 دنیای درونی: حال، درد، گرسنگی، تشنگی، خواب',
          '  body.pain(severity)         تحریک گیرنده‌های درد (۰ تا ۱)',
          '  body.soothe()               تسکین: تماس آرام‌بخش — درد و غم کم می‌شود',
          '  body.feed() / body.drink()  سیر کردن گرسنگی و تشنگی',
          '  body.sleep() / body.wake()  خواب (فشار خواب کم می‌شود) و بیدار شدن',
        ].join('\n'),
      };
    }
    case 'move': {
      if (!b) return { ok: false, text: 'بدن هنوز بارگذاری نشده است.' };
      const joint = arg(0, 'joint');
      if (!JOINT_IDS.has(joint)) return { ok: false, text: `مفصل ناشناخته: ${joint} — از body.joints() فهرست را ببینید.` };
      const x = num(1, 'x'), y = num(2, 'y'), z = num(3, 'z');
      const clamped = setJointTarget(b, joint, x, y, z);
      try {
        await fetch('/api/joints', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ joint_id: joint, rx: clamped[0], ry: clamped[1], rz: clamped[2] }) });
      } catch { /* offline-safe */ }
      // effort is felt: proprioception feeds the brain, load feeds metabolism
      const brain = getBrain();
      brain.sensory(0.15 + 0.15 * Math.abs(x + y + z) / 90);
      getMetabolism().effort(0.06);
      const note = (clamped[0] !== x || clamped[1] !== y || clamped[2] !== z) ? ' (محدود به دامنه آناتومیک شد)' : '';
      return { ok: true, text: `✓ ${joint} → [${clamped.map((n) => n.toFixed(1)).join(', ')}]°${note}`, data: { joint, rotation: clamped } };
    }
    case 'pose': {
      if (!b) return { ok: false, text: 'بدن هنوز بارگذاری نشده است.' };
      const name = arg(0, 'name', 'anatomical');
      const pose = POSES[name];
      if (!pose) return { ok: false, text: `ژست ناشناخته: ${name} — گزینه‌ها: ${Object.keys(POSES).join(', ')}` };
      applyPoseTargets(b, pose.joints);
      const updates = Object.entries(b.targets).filter(([id]) => id !== 'pelvis_root' && id !== 'head').map(([joint_id, [rx, ry, rz]]) => ({ joint_id, rx, ry, rz }));
      try {
        await fetch('/api/joints', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
      } catch { /* offline-safe */ }
      return { ok: true, text: `✓ ژست «${pose.fa}» اجرا شد (${Object.keys(pose.joints).length} مفصل)`, data: { pose: name } };
    }
    case 'sense': {
      const ch = arg(0, 'channel', 'all').toLowerCase();
      const snap = senseSnapshot(ctx);
      if (ch === 'vitals' || ch === 'heart' || ch === 'breath') {
        const v = snap.vitals;
        return { ok: true, text: `قلب ${v.heart_rate_bpm} bpm · تنفس ${v.breath_rate_per_min}/min · دما ${v.temp_c}°C · SpO₂ ${v.spo2_pct}٪`, data: v };
      }
      if (ch === 'joints') {
        const lines = Object.entries(snap.proprioception).map(([k, r]) => `  ${k}: [${(r as number[]).map((n) => n.toFixed(1)).join(', ')}]°`);
        return { ok: true, text: 'حس عمقی مفاصل (درجه):\n' + lines.join('\n'), data: snap.proprioception };
      }
      const v = snap.vitals;
      const nj = Object.keys(snap.proprioception).length;
      return { ok: true, text: `SOMATOS-1 زنده است · ${nj} مفصل · قلب ${v.heart_rate_bpm} bpm · تنفس ${v.breath_rate_per_min}/min · ${parts.length} جزء ثبت‌شده`, data: snap };
    }
    case 'scan': {
      const sys = arg(0, 'system', '').toLowerCase();
      const list = sys ? parts.filter((p) => p.system === sys) : parts;
      if (sys && list.length === 0) return { ok: false, text: `دستگاهی با نام ${sys} یافت نشد.` };
      const bySys: Record<string, number> = {};
      for (const p of parts) bySys[p.system] = (bySys[p.system] || 0) + 1;
      const summary = Object.entries(bySys).map(([k, n]) => `${k}:${n}`).join(' · ');
      const sample = list.slice(0, 12).map((p) => `  ${p.part_id} — ${p.name_fa}`).join('\n');
      return { ok: true, text: `${list.length} جزء${sys ? ` در ${sys}` : ''} · کل: ${summary}\n${sample}${list.length > 12 ? `\n  ... و ${list.length - 12} جزء دیگر` : ''}`, data: { count: list.length, sample: list.slice(0, 12) } };
    }
    case 'get': {
      const q = arg(0, 'part') || arg(0, 'q');
      if (!q) return { ok: false, text: 'نام جزء را بدهید — مثلاً body.get(heart)' };
      const p = findPart(parts, q);
      if (!p) return { ok: false, text: `جزئی با نام «${q}» یافت نشد. از body.scan() جستجو کنید.` };
      if (b) {
        const wp = flashPart(b, p.part_id);
        if (wp) ctx.focusCamera(wp, 0.9);
      }
      return { ok: true, text: `◉ ${p.name_fa} (${p.name_en}) · ${p.latin}\n  دستگاه: ${p.system} · لایه: ${p.layer} · متحرک: ${p.movable ? 'بله' : 'خیر'}\n  ${p.description_fa}`, data: p };
    }
    case 'layer': {
      const name = arg(0, 'name', '').toLowerCase();
      const valid = ['atom', 'molecule', 'cell', 'tissue', 'organ', 'system', 'body'];
      if (!valid.includes(name)) return { ok: false, text: `لایه ناشناخته: ${name} — گزینه‌ها: ${valid.join(', ')}` };
      ctx.setLayer(name);
      return { ok: true, text: `✓ لایه مقیاس: ${name}`, data: { layer: name } };
    }
    case 'system': {
      const raw = arg(0, 'names', 'all');
      if (raw.toLowerCase() === 'all') {
        ctx.setSystems('all');
        return { ok: true, text: '✓ همه دستگاه‌ها نمایان شدند.' };
      }
      const names = raw.split('+').map((s) => s.trim().toLowerCase()).filter(Boolean);
      ctx.setSystems(names);
      return { ok: true, text: `✓ نمایش: ${names.join(' + ')}`, data: { systems: names } };
    }
    case 'vitals': {
      const v = ctx.vitals();
      const hr = num(0, 'hr', v.heartRate);
      const br = num(1, 'br', v.breathRate);
      // sliders/command set the AUTONOMIC BASELINE; metabolism still adds load on top
      const m = getMetabolism();
      m.basalHr = Math.min(200, Math.max(30, hr));
      m.basalBr = Math.min(60, Math.max(4, br));
      v.heartRate = m.basalHr;
      v.breathRate = m.basalBr;
      try {
        const [sys, dia] = (v.bp ?? '120/80').split('/').map(Number);
        await fetch('/api/vitals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heart_rate: Math.round(v.heartRate), breath_rate: Math.round(v.breathRate), temp_c: v.coreTemp ?? 37.0, spo2: v.spo2 ?? 98, systolic: sys || 120, diastolic: dia || 80 }) });
      } catch { /* offline-safe */ }
      return { ok: true, text: `✓ پایه‌ی خودگردان: قلب ${m.basalHr} bpm · تنفس ${m.basalBr}/min (بار حرکتی روی آن سوار می‌شود)`, data: { heartRate: v.heartRate, breathRate: v.breathRate } };
    }
    case 'heartbeat':
    case 'breath': {
      const v = senseSnapshot(ctx).vitals;
      return { ok: true, text: cmd === 'heartbeat' ? `قلب: ${v.heart_rate_bpm} bpm (ریتم سینوسی منظم)` : `تنفس: ${v.breath_rate_per_min}/min ـ عمق طبیعی، دیافراگم فعال`, data: v };
    }
    case 'joints': {
      const lines = JOINTS.map((j) => {
        const cur = b ? getJointCurrent(b, j.joint_id) : [0, 0, 0];
        return `  ${j.joint_id} — ${j.fa} · اکنون [${cur.map((n) => n.toFixed(0)).join(', ')}]° · دامنه X[${j.min[0]}..${j.max[0]}] Y[${j.min[1]}..${j.max[1]}] Z[${j.min[2]}..${j.max[2]}]`;
      });
      return { ok: true, text: '۱۶ مفصل متحرک:\n' + lines.join('\n'), data: JOINTS };
    }
    case 'parts': {
      const sys = arg(0, 'system', '').toLowerCase();
      const list = sys ? parts.filter((p) => p.system === sys) : parts;
      const lines = list.slice(0, 20).map((p) => `  ${p.part_id} — ${p.name_fa} (${p.system})`);
      return { ok: true, text: `${lines.join('\n')}\n... مجموع ${list.length} جزء`, data: { count: list.length } };
    }
    case 'scale': {
      return { ok: true, text: 'مقیاس بدن ثابت علمی است: قد ۱٫۷۰ متر. تغییر مقیاس غیرفعال است (دقت آناتومیک).', data: { height_m: 1.7 } };
    }
    case 'brain': {
      try {
        const r = await fetch('/api/brain');
        if (r.ok) {
          const d = await r.json();
          const top = d.region_table.sort((a: { neurons: number }, b: { neurons: number }) => b.neurons - a.neurons).slice(0, 5);
          const latest = d.latest_activity;
          return { ok: true, text: `🧠 مغز SOMATOS-1: ${d.total_neurons.toLocaleString('en-US')} نورون در ${d.region_table.length} ناحیه واقعی\n  بزرگ‌ترین‌ها: ${top.map((x: { fa: string; neurons: number }) => `${x.fa} ${x.neurons.toLocaleString('en-US')}`).join(' · ')}\n  ${latest ? `آخرین فعالیت زنده: ${latest.firing_rate_hz}Hz · آلفا/بتا/گاما: ${latest.bands?.alpha ?? 0}/${latest.bands?.beta ?? 0}/${latest.bands?.gamma ?? 0}` : 'فعالیت زنده هنوز ثبت نشده'}`, data: d };
        }
      } catch { /* offline-safe */ }
      return { ok: false, text: 'دسترسی به سرور مغز ممکن نشد.' };
    }
    case 'neurons': {
      const idx = num(0, 'index', 0);
      try {
        const r = await fetch('/api/brain?action=neurons&index=' + idx + '&count=5');
        if (r.ok) {
          const list = await r.json();
          const lines = list.map((n: { index: number; region_fa: string; type: string; neurotransmitter: string; layer: string }) => `  #${n.index.toLocaleString('en-US')} → ${n.region_fa} · ${n.type} (${n.neurotransmitter}) · ${n.layer}`);
          return { ok: true, text: 'نورون‌های مجازی (کل ۸۶ میلیارد آدرس‌پذیر):\n' + lines.join('\n'), data: list };
        }
      } catch { /* offline-safe */ }
      return { ok: false, text: 'دسترسی به سرور مغز ممکن نشد.' };
    }
    case 'think': {
      const region = arg(0, 'region', 'ctx_frontal');
      try {
        const r = await fetch('/api/brain?action=think&region=' + encodeURIComponent(region));
        const d = await r.json();
        if (!r.ok) return { ok: false, text: `ناحیه ناشناخته: ${region} — از body.brain() فهرست را ببینید.` };
        // the thought is FELT: stimulate the live microcosm; motor cascade -> twitch
        getBrain().stimulate(1.3);
        const motorish = ['ctx_frontal', 'striatum', 'cerebellum', 'brainstem_retic'].filter((x) => (d.cascade_path || []).includes(x));
        if (motorish.length && b) {
          const pools = ['shoulder_L', 'shoulder_R', 'elbow_L', 'elbow_R', 'neck', 'spine_T'];
          for (let i = 0; i < 4; i++) {
            const j = pools[Math.floor(Math.random() * pools.length)];
            queueMotorImpulse(b, j, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 30);
          }
          getMetabolism().effort(0.12);
        }
        const tail = motorish.length ? `\n  مسیر حرکتی فعال شد (${motorish.join(' → ')}) — بدن می‌جنبد` : '';
        return { ok: true, text: `⚡ تفکر از «${region}»: ${d.cascade_path.join(' → ')}\n  نورون‌های درگیر: ~${d.neurons_engaged.toLocaleString('en-US')}${tail}`, data: d };
      } catch { return { ok: false, text: 'دسترسی به سرور مغز ممکن نشد.' }; }
    }
    case 'genome': {
      try {
        const r = await fetch('/api/genome?action=summary');
        if (r.ok) {
          const d = await r.json();
          return { ok: true, text: `🧬 ژنوم: ${d.build}\n  ${d.total_bp.toLocaleString('en-US')} جفت‌باز · ${d.chromosomes} کروموزوم · ${d.genes.length} ژن · ${d.mutations} جهش\n  صفات فعال: ${d.active_traits.length ? d.active_traits.join(', ') : 'هیچ'}`, data: d };
        }
      } catch { /* offline-safe */ }
      return { ok: false, text: 'دسترسی به ژنوم ممکن نشد.' };
    }
    case 'genes': {
      try {
        const r = await fetch('/api/genome?action=genes');
        if (r.ok) {
          const list = await r.json();
          const lines = list.map((g: { gene: string; name_fa: string; chromosome: string; protein_len: number; synthetic: boolean }) => `  ${g.gene} — ${g.name_fa} · ${g.chromosome} · ${g.protein_len}aa${g.synthetic ? ' · مصنوعی' : ''}`);
          return { ok: true, text: 'ژن‌های ثبت‌شده:\n' + lines.join('\n'), data: list };
        }
      } catch { /* offline-safe */ }
      return { ok: false, text: 'دسترسی به ژنوم ممکن نشد.' };
    }
    case 'read': {
      const chrom = arg(0, 'chromosome', 'chr11');
      const start = num(1, 'start', 0);
      const len = Math.min(num(2, 'len', 60), 200);
      try {
        const r = await fetch(`/api/genome?action=read&chromosome=${encodeURIComponent(chrom)}&start=${start}&len=${len}`);
        const d = await r.json();
        if (!r.ok) return { ok: false, text: `خطا: ${d.error}` };
        return { ok: true, text: `🧬 ${chrom}:${start}-${start + d.length - 1}${d.edits_applied ? ` (${d.edits_applied} جهش اعمال‌شده)` : ''}:\n  ${d.sequence}`, data: d };
      } catch { return { ok: false, text: 'دسترسی به ژنوم ممکن نشد.' }; }
    }
    case 'mutate': {
      const chrom = arg(0, 'chromosome', 'chr11');
      const pos = num(1, 'position', 0);
      const base = arg(2, 'base', 'A').toUpperCase();
      try {
        const r = await fetch('/api/genome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mutate', chromosome: chrom, position: pos, base }) });
        const d = await r.json();
        if (!r.ok) return { ok: false, text: `خطا: ${d.error}` };
        const m = d.mutation;
        return { ok: true, text: `✓ جهش ثبت شد: ${m.chromosome}:${m.position} ${m.ref_base}→${m.new_base}${m.gene ? ` · ${m.consequence_type} در ${m.gene} (کدون ${m.codon})` : ' · بین‌ژنی'}`, data: d };
      } catch { return { ok: false, text: 'دسترسی به ژنوم ممکن نشد.' }; }
    }
    case 'crispr': {
      const gene = arg(0, 'gene', 'HBB');
      const codon = num(1, 'codon', 6);
      const aa = arg(2, 'aa', 'V').toUpperCase();
      try {
        const r = await fetch('/api/genome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'crispr', gene, codon, aa }) });
        const d = await r.json();
        if (!r.ok) return { ok: false, text: `خطا: ${d.error}` };
        return { ok: true, text: `✓ CRISPR روی ${d.gene} کدون ${d.codon}: ${d.wt_codon}→${d.new_codon} · ${d.edits.length} ویرایش ثبت شد`, data: d };
      } catch { return { ok: false, text: 'دسترسی به ژنوم ممکن نشد.' }; }
    }
    case 'express': {
      const trait = arg(0, 'trait', 'horns');
      try {
        const r = await fetch('/api/genome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'express', trait }) });
        const d = await r.json();
        if (!r.ok) return { ok: false, text: `خطا: ${d.error}` };
        return { ok: true, text: d.already_active ? `صفه «${trait}» از قبل فعال است` : `✓ بیان «${trait}» فعال شد — ژن‌ها روشن!`, data: d };
      } catch { return { ok: false, text: 'دسترسی به ژنوم ممکن نشد.' }; }
    }
    case 'traits': {
      try {
        const r = await fetch('/api/genome?action=traits');
        if (r.ok) {
          const d = await r.json();
          return { ok: true, text: `صفات فعال ژنومی: ${d.active_traits.length ? d.active_traits.join(', ') : 'هیچ'} · کل جهش‌ها: ${d.mutations}`, data: d };
        }
      } catch { /* offline-safe */ }
      return { ok: false, text: 'دسترسی به ژنوم ممکن نشد.' };
    }
    case 'growth': {
      const trait = arg(0, 'trait', 'horns');
      try {
        const r = await fetch('/api/genome?action=growth&trait=' + encodeURIComponent(trait));
        if (r.ok) {
          const d = await r.json();
          if (!d.expressed) return { ok: true, text: `صفه «${trait}» بیان نشده — اول body.express(${trait})`, data: d };
          const pct = Math.round(d.progress * 100);
          return { ok: true, text: `🌱 رشد ${trait}: ${pct}٪ · طول ${d.length_cm} سانتی‌متر · روز شبیه‌سازی ${d.days}${d.complete ? ' · کامل شد' : ` · ${d.eta_min} دقیقه تا تکمیل`}`, data: d };
        }
      } catch { /* offline-safe */ }
      return { ok: false, text: 'دسترسی به رشد ممکن نشد.' };
    }
    case 'memory': {
      const brain = getBrain();
      const s = brain.learningStats();
      try {
        const r = await fetch('/api/brain?action=memory');
        const d = r.ok ? await r.json() : { snapshots: 0 };
        return { ok: true, text: `🧠 حافظه (STDP): وزن میانگین ${s.mean_weight_exc} · سیناپس تقویت‌شده ${s.potentiated.toLocaleString('en-US')} · تضعیف‌شده ${s.depressed.toLocaleString('en-US')}\n  رویدادهای LTP/LTD: ${s.ltp_events.toLocaleString('en-US')}/${s.ltd_events.toLocaleString('en-US')} · کل اسپایک‌ها: ${s.total_spikes.toLocaleString('en-US')}\n  اسنپ‌شات‌های ذخیره‌شده در دیتابیس: ${d.snapshots ?? 0}`, data: { ...s, snapshots: d.snapshots } };
      } catch {
        return { ok: true, text: `🧠 حافظه (STDP): وزن میانگین ${s.mean_weight_exc} · LTP/LTD: ${s.ltp_events}/${s.ltd_events} (آفلاین)`, data: s };
      }
    }
    case 'metabolism': {
      const m = getMetabolism().state();
      return { ok: true, text: `🫀 متابولیسم: بار ${Math.round(m.load * 100)}٪ · قلب ${m.hr} bpm · تنفس ${m.br}/min · SpO₂ ${m.spo2}٪ · فشار ${m.sys}/${m.dia}\n  دمای هسته ${m.coreTemp.toFixed(2)}°C (پوست ${m.skinTemp.toFixed(1)}°) · عرق ${Math.round(m.sweat * 100)}٪ · خستگی ${Math.round(m.fatigue * 100)}٪ · لرز ${Math.round(m.shiver * 100)}٪\n  علائم حیاتی برخیزان‌اند: حرکت → گرما و مصرف → تعریق/واسکولار → هموستاز`, data: m };
    }
    case 'mood':
    case 'feel': {
      const l = getLimbic().state();
      return {
        ok: true,
        text: `🫀 حال و هوا: «${l.moodFa}»\n  سرشت لحظه‌ای: نشانه ${l.valence >= 0 ? '+' : ''}${l.valence.toFixed(2)} (خوشی/غم) · برانگیختگی ${(l.arousal * 100).toFixed(0)}٪\n  درد ${(l.pain * 100).toFixed(0)}٪ · آدرنالین ${(l.adrenaline * 100).toFixed(0)}٪ · کورتیزول ${(l.cortisol * 100).toFixed(0)}٪\n  نیازها: گرسنگی ${(l.hunger * 100).toFixed(0)}٪ · تشنگی ${(l.thirst * 100).toFixed(0)}٪ · فشار خواب ${(l.sleepPressure * 100).toFixed(0)}٪${l.asleep ? ' · خوابیده' : ''}`,
        data: l,
      };
    }
    case 'pain':
    case 'hurt': {
      const sev = Math.min(1, Math.max(0, num(0, 'severity', 0.5)));
      const l = getLimbic();
      l.pain(sev);
      getMetabolism().effort(0.12 * sev);
      getBrain().sensory(0.35 * sev);
      if (b) queueMotorImpulse(b, 'spine_T', (Math.random() - 0.5) * 8 * sev, 0, (Math.random() - 0.5) * 6 * sev);
      return { ok: true, text: `⚡ نوسان ناقل درد (شدت ${(sev * 100).toFixed(0)}٪) — فیبرهای C به نخاع رسید؛ بدن ${sev > 0.6 ? 'به‌شدت' : ''} به خودش لرزید`, data: { severity: sev } };
    }
    case 'soothe':
    case 'comfort': {
      const l = getLimbic();
      l.soothe();
      const s = l.state();
      return { ok: true, text: `🤲 تماس آرام‌بخش — ملاتونین درد و کورتیزول فروکش کرد. حالا «${s.moodFa}» است`, data: s };
    }
    case 'feed':
    case 'eat': {
      const l = getLimbic();
      l.feed();
      getMetabolism().effort(0.05); // digestion costs energy
      const s = l.state();
      return { ok: true, text: `🍚 تغذیه — گرسنگی به ${(s.hunger * 100).toFixed(0)}٪ رسید؛ گوارش متابولیسم را کمی گرم کرد`, data: s };
    }
    case 'drink': {
      const l = getLimbic();
      l.drink();
      const s = l.state();
      return { ok: true, text: `💧 آب — تشنگی به ${(s.thirst * 100).toFixed(0)}٪ رسید`, data: s };
    }
    case 'sleep': {
      const force = A.includes('--force');
      const r = getLimbic().sleep(force);
      return r.ok
        ? { ok: true, text: '😴 چشم‌ها بسته شد؛ تنفس آرام و عمیق، قلب کند — فشار خواب تخلیه می‌شود (با body.wake() یا درد بیدار می‌شود)' }
        : { ok: false, text: `خوابش نمی‌برد — ${r.why}` };
    }
    case 'wake': {
      getLimbic().wake();
      return { ok: true, text: '🌅 بیدار شد — پلک می‌زند و به اتاق نگاه می‌کند' };
    }
    case 'motor': {
      // queued from the bridge (server cognition) — apply neural impulses
      if (!b) return { ok: false, text: 'بدن هنوز بارگذاری نشده است.' };
      const impulses = Array.isArray(O.impulses) ? O.impulses as Array<{ joint?: string; dx?: number; dy?: number; dz?: number; strength?: number }> : [];
      let n = 0;
      const joints: string[] = [];
      for (const im of impulses) {
        const j = String(im.joint || '');
        if (!JOINT_IDS.has(j)) continue;
        const s = typeof im.strength === 'number' ? im.strength : 0.6;
        if (queueMotorImpulse(b, j, (im.dx ?? 0) * s, (im.dy ?? 0) * s, (im.dz ?? 0) * s)) { n++; joints.push(j); }
      }
      getBrain().sensory(0.5);
      getMetabolism().effort(0.15);
      return n > 0
        ? { ok: true, text: `⚡ برق عصبی به ${n} مفصل رسید: ${joints.join(', ')} — پرش عضلانی!`, data: { applied: n } }
        : { ok: false, text: 'هیچ تکانه‌ی حرکتی معتبری در دستور نبود.' };
    }

    case 'vision': {
      if (!b) return { ok: false, text: 'بدن هنوز بارگذاری نشده است.' };
      const neckJ = b.joints.get('neck');
      const neckRotY = neckJ ? THREE.MathUtils.radToDeg(neckJ.rotation.y) : 0;
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(neckRotY));
      const origin = new THREE.Vector3(0, 1.6, 0);
      const ray = new THREE.Raycaster(origin, fwd, 0, 4);
      const candidates = [];
      b.group.traverse((o) => { if (o.isMesh) candidates.push(o); });
      const hits = ray.intersectObjects(candidates, false);
      if (hits.length > 0) {
        const h = hits[0].point;
        const rel = h.clone().sub(origin);
        const dist = rel.length().toFixed(2);
        let desc = 'چیزی جلوی چشم';
        if (Math.abs(rel.x) > Math.abs(rel.z)) desc = rel.x > 0 ? 'سمت راست' : 'سمت چپ';
        else if (rel.y > 0.3) desc = 'بالای سر';
        else if (rel.y < -0.3) desc = 'کف اتاق';
        return { ok: true, text: `👁️ ${desc} — دور ${dist}m · گردن [${neckRotY.toFixed(1)}°]`, data: { distance_m: parseFloat(dist), direction: desc } };
      }
      return { ok: true, text: `👁️ هیچ چیزی در میدان دید (۴ متر) نیافتم · گردن ${neckRotY.toFixed(1)}°`, data: { distance_m: null, direction: 'خالی' } };
    }
    case 'speak': {
      const text = String(O.text || O.msg || O.speech || '');
      if (!text) return { ok: false, text: 'متن را بدهید — مثلاً body.speak({text: "سلام"})' };
      try {
        if (typeof speechSynthesis !== "undefined") {
          const utt = new SpeechSynthesisUtterance(text);
          utt.lang = "fa-IR";
          utt.rate = 0.95;
          speechSynthesis.speak(utt);
          return { ok: true, text: `🗣️ "${text.slice(0, 60)}" → تلفظ شد`, data: { text } };
        }
      } catch { /* ignore */ }
      return { ok: true, text: `🗣️ "${text.slice(0, 60)}" (تلفظ در دسترس نیست)`, data: { text } };
    }
    case 'circadian': {
      const info = getLimbic().circadianStatus();
      return { ok: true, text: `🕐 ${info}`, data: info };
    }

    default: {
      // tolerate source prefix like "external:move"
      return { ok: false, text: `دستور ناشناخته: ${command} — body.help() را ببینید.` };
    }
  }
}

export { BODY_FOCUS };
export type { BodyRefs };
