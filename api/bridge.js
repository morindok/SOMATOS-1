import store from './store.js';
import { regionSummary, neuronAt, think, BRAIN_TOTAL } from './core/brainCore.js';
import { genomeSummary, readBasesEffective, baseAt, GENES, activeTraits, chromosomeList, computeGrowth } from './core/genomeCore.js';

// External AI embodiment bridge (e.g. opencode.ai agent).
// Async queue: agent POSTs a command -> {id, queued}. The live 3D frontend
// (the body) polls ?action=inbox, executes on the body, writes the result back.
// Agent polls ?action=result&id=N to feel the outcome.
//
// SERVER_SIDE commands (brain/genome) execute immediately inside this
// function — no browser needed — and are still logged for the console.

const BROWSER_COMMANDS = ['move', 'pose', 'sense', 'scan', 'get', 'vitals', 'layer', 'system', 'heartbeat', 'breath', 'joints', 'motor', 'metabolism', 'mood', 'feel', 'pain', 'hurt', 'soothe', 'comfort', 'feed', 'eat', 'drink', 'sleep', 'wake', 'scale', 'parts', 'vision', 'speak', 'circadian'];
const SERVER_COMMANDS = ['brain', 'neurons', 'think', 'genome', 'read', 'base', 'mutate', 'crispr', 'express', 'traits', 'growth', 'memory', 'genes'];
const ALLOWED = [...BROWSER_COMMANDS, ...SERVER_COMMANDS];

function fa(n) { return n.toLocaleString('fa-IR'); }

function runServerCommand(command, args) {
  const A = args || {};
  switch (command) {
    case 'brain': {
      const activity = store.list('brain_activity').sort((a, b) => b.id - a.id)[0] || null;
      const top = regionSummary().sort((a, b) => b.neurons - a.neurons).slice(0, 5);
      return { ok: true, text: `🧠 مغز SOMATOS-1: ${fa(BRAIN_TOTAL)} نورون در ۱۸ ناحیه آناتومیک واقعی\n  بزرگ‌ترین‌ها: ${top.map((r) => `${r.fa} ${fa(r.neurons)}`).join(' · ')}\n  ${activity ? `آخرین فعالیت زنده: ${activity.firing_rate_hz}Hz · نوارها: ${JSON.stringify(activity.bands || {})}` : 'هنوز فعالیت زنده ثبت نشده (مرورگر روشن نیست)'}`, data: { total: BRAIN_TOTAL, latest: activity } };
    }
    case 'neurons': {
      const start = Number(A.index || 0);
      const count = Math.min(Number(A.count || 5), 12);
      const out = [];
      for (let i = 0; i < count; i++) out.push(neuronAt(start + i * 1_000_000_007));
      const lines = out.map((n) => `  #${n.index.toLocaleString('en-US')} → ${n.region_fa} · ${n.type} (${n.neurotransmitter}) · لایه ${n.layer} · (${n.position.x}, ${n.position.y}, ${n.position.z})`);
      return { ok: true, text: `نورون‌های مجازی (آدرس‌دهی کامل ۸۶ میلیاردی):\n${lines.join('\n')}`, data: out };
    }
    case 'think': {
      const r = think(A.region || 'ctx_frontal');
      if (r.error) return { ok: false, text: `ناحیه ناشناخته: ${A.region}` };
      // motor cascade -> queue a motor program down the "spinal cord" (bridge queue)
      const motorish = r.cascade_path.filter((id) => ['ctx_frontal', 'striatum', 'cerebellum', 'brainstem_retic', 'brainstem_motor'].includes(id));
      let motorNote = '';
      if (motorish.length) {
        const pools = ['shoulder_L', 'shoulder_R', 'elbow_L', 'elbow_R', 'neck', 'spine_T', 'wrist_L', 'wrist_R'];
        const impulses = [];
        for (let i = 0; i < 5; i++) {
          impulses.push({
            joint: pools[(i * 3 + r.neurons_engaged) % pools.length],
            dx: Math.round((Math.sin(i * 2.3 + r.neurons_engaged) * 35)),
            dy: Math.round((Math.cos(i * 1.7) * 15)),
            dz: Math.round((Math.sin(i * 1.1) * 25)),
            strength: 0.7,
          });
        }
        const motorCmd = store.insert('ai_commands', {
          source: 'external', command: 'motor', args: { impulses }, status: 'queued', result: null,
          latency_ms: null, created_at: new Date().toISOString(),
        });
        motorNote = `\n  📡 دستور حرکتی #${motorCmd.id} به نخاع ارسال شد (${impulses.length} تکانه) — وقتی بدن زنده باشد می‌جنبد`;
      }
      return { ok: true, text: `⚡ تفکر از «${A.region || 'ctx_frontal'}»: مسیر آبشاری ${r.cascade_path.join(' → ')}\n  نورون‌های درگیر: ~${fa(r.neurons_engaged)}${motorNote}`, data: r };
    }
    case 'genome': {
      const s = genomeSummary(store.list('genome_mutations'));
      return { ok: true, text: `🧬 ژنوم: ${s.build}\n  ${fa(s.total_bp)} جفت‌باز در ${s.chromosomes} کروموزوم · ${s.genes.length} ژن ثبت‌شده · ${s.mutations} جهش\n  صفات فعال: ${s.active_traits.length ? s.active_traits.join(', ') : 'هیچ'}`, data: s };
    }
    case 'read': {
      const chrom = A.chromosome || A.chrom || 'chr11';
      const start = parseInt(A.start || 0, 10) || 0;
      const len = Math.min(parseInt(A.len || 60, 10), 200);
      const r = readBasesEffective(store.list('genome_mutations'), chrom, start, len);
      if (r.error) return { ok: false, text: `خطا: ${r.error}` };
      return { ok: true, text: `🧬 ${chrom}:${start}-${start + r.length - 1} (${r.length}bp${r.edits_applied ? ` · ${r.edits_applied} جهش اعمال‌شده` : ''}):\n  ${r.sequence}`, data: r };
    }
    case 'base': {
      const r = baseAt(A.chromosome || A.chrom || 'chr11', parseInt(A.position || 0, 10) || 0);
      if (r.error) return { ok: false, text: `خطا: ${r.error}` };
      return { ok: true, text: `🧬 ${r.chromosome}:${r.position} = ${r.base}`, data: r };
    }
    case 'mutate': {
      const { chromosome, position, base } = A;
      const c = chromosomeList().find((x) => x.name === (chromosome || ''));
      if (!c) return { ok: false, text: `کروموزوم نامعتبر — گزینه‌ها: ${chromosomeList().map((x) => x.name).join(', ')}` };
      const pos = parseInt(position, 10);
      const nb = String(base || '').toUpperCase();
      if (!Number.isInteger(pos) || pos < 0 || pos >= c.length) return { ok: false, text: 'موقعیت نامعتبر' };
      if (!'ACGT'.includes(nb)) return { ok: false, text: 'باز باید A، C، G یا T باشد' };
      const g = GENES.find((x) => x.chromosome === chromosome && pos >= x.start && pos <= x.end);
      let consequence = { type: 'intergenic', note: 'outside annotated CDS' };
      let aaFrom = null, aaTo = null, codonPos = null;
      if (g) {
        const offset = pos - g.start;
        codonPos = Math.floor(offset / 3) + 1;
        const frame = offset % 3;
        const wtCodon = g.cds.slice((codonPos - 1) * 3, (codonPos - 1) * 3 + 3);
        const mutCodon = wtCodon.split('');
        mutCodon[frame] = nb;
        aaFrom = translateCodon(wtCodon);
        aaTo = translateCodon(mutCodon.join(''));
        consequence = { type: aaFrom === aaTo ? 'synonymous' : (aaTo === '*' ? 'nonsense' : 'missense'), gene: g.gene, codon: codonPos, aa_change: `${aaFrom}${codonPos}${aaTo}` };
      }
      const row = store.insert('genome_mutations', {
        kind: 'substitution', chromosome, position: pos,
        ref_base: readBasesEffective([], chromosome, pos, 1).sequence, new_base: nb,
        gene: g ? g.gene : null, codon: codonPos, aa_from: aaFrom, aa_to: aaTo,
        consequence_type: consequence.type, consequence, trait: null, created_at: new Date().toISOString(),
      });
      return { ok: true, text: `✓ جهش ثبت شد: ${chromosome}:${pos} ${row.ref_base}→${nb}${g ? ` · ${consequence.type} در ${g.gene} (کدون ${codonPos}, ${consequence.aa_change})` : ' · بین‌ژنی'}`, data: row };
    }
    case 'crispr': {
      const g = GENES.find((x) => x.gene.toLowerCase() === String(A.gene || '').toLowerCase());
      if (!g) return { ok: false, text: `ژن ناشناخته — گزینه‌ها: ${GENES.map((x) => x.gene).join(', ')}` };
      const codonIdx = parseInt(A.codon, 10);
      if (!Number.isInteger(codonIdx) || codonIdx < 1 || codonIdx * 3 > g.cds.length) return { ok: false, text: `کدون نامعتبر (پروتئین ${g.protein.length} اسیدآمینه)` };
      const target = String(A.aa || '').toUpperCase();
      if (target.length !== 1) return { ok: false, text: 'اسیدآمینه هدف باید یک حرف باشد' };
      const offset = (codonIdx - 1) * 3;
      const wtCodon = g.cds.slice(offset, offset + 3);
      const newCodon = codonForAA(target);
      const edits = [];
      for (let i = 0; i < 3; i++) {
        if (wtCodon[i] !== newCodon[i]) {
          edits.push(store.insert('genome_mutations', {
            kind: 'crispr', chromosome: g.chromosome, position: g.start + offset + i,
            ref_base: wtCodon[i], new_base: newCodon[i],
            gene: g.gene, codon: codonIdx, aa_from: g.protein[codonIdx - 1], aa_to: target,
            consequence_type: g.protein[codonIdx - 1] === target ? 'revert' : 'missense',
            consequence: { type: 'crispr_edit', gene: g.gene, codon: codonIdx, aa_change: `${g.protein[codonIdx - 1]}${codonIdx}${target}` },
            trait: null, created_at: new Date().toISOString(),
          }));
        }
      }
      return { ok: true, text: `✓ CRISPR روی ${g.gene} کدون ${codonIdx}: ${wtCodon}→${newCodon} (${g.protein[codonIdx - 1]}→${target}) · ${edits.length} ویرایش`, data: { gene: g.gene, edits } };
    }
    case 'express': {
      const trait = String(A.trait || 'horns').toLowerCase();
      if (trait !== 'horns') return { ok: false, text: 'صفات موجود: horns' };
      const dup = store.list('genome_mutations').find((m) => m.kind === 'expression' && m.trait === trait && !m.reverted);
      if (dup) return { ok: true, text: 'صفه «شاخ» از قبل فعال است — KRTHORN1/2 در حال بیان‌اند', data: dup };
      const row = store.insert('genome_mutations', {
        kind: 'expression', chromosome: 'chrUn_HORN', position: 800, ref_base: null, new_base: null,
        gene: 'KRTHORN1/2', codon: null, aa_from: null, aa_to: null,
        consequence_type: 'gain-of-expression',
        consequence: { type: 'expression', note: 'horns expressed from engineered keratin locus' },
        trait, created_at: new Date().toISOString(),
      });
      return { ok: true, text: '✓ بیان ژن‌های KRTHORN1/2 فعال شد — شاخ‌ها در حال رشد روی جمجمه! 🐂', data: row };
    }
    case 'traits': {
      const muts = store.list('genome_mutations');
      const t = activeTraits(muts);
      return { ok: true, text: `صفات فعال ژنومی: ${t.length ? t.join(', ') : 'هیچ'} · کل جهش‌ها: ${muts.length}`, data: { traits: t, mutations: muts.length } };
    }
    case 'growth': {
      const trait = String(A.trait || 'horns').toLowerCase();
      const expr = store.list('genome_mutations').find((m) => m.kind === 'expression' && m.trait === trait && !m.reverted);
      if (!expr) return { ok: false, text: `صفه «${trait}» بیان نشده — اول express را صدا بزن.` };
      const g = computeGrowth(trait, expr.created_at, Date.now());
      const pct = Math.round(g.progress * 100);
      return { ok: true, text: `🌱 رشد ${trait}: ${pct}٪ · طول ${g.length_cm}cm · روز شبیه‌سازی ${g.days}${g.complete ? ' · کامل' : ` · ETA ${g.eta_min} دقیقه`}`, data: g };
    }
    case 'memory': {
      const snaps = store.list('brain_memory').sort((a, b) => b.id - a.id);
      const latest = snaps[0] || null;
      return { ok: true, text: latest
        ? `🧠 حافظهی مغز: ${snaps.length} اسنپشات ذخیرهشده · آخرین: ${latest.created_at}\n  LTP=${latest.stats?.ltp_events?.toLocaleString('en-US')} · LTD=${latest.stats?.ltd_events?.toLocaleString('en-US')} · وزن میانگین=${latest.stats?.mean_weight_exc} · اسپایک=${latest.stats?.total_spikes?.toLocaleString('en-US')}`
        : '🧠 هنوز حافظهای ذخیره نشده (مرورگر روشن نیست تا شبیهساز اسنپشات بدهد)', data: latest };
    }
    case 'genes': {
      const list = GENES.map((g) => ({
        gene: g.gene, name_fa: g.name_fa || g.gene, chromosome: g.chromosome,
        start: g.start, end: g.end, cds_len: g.cds?.length || 0,
        protein_len: g.protein?.length || 0, synthetic: !!g.synthetic, trait: g.trait || null,
      }));
      const out = list.map((g) => `  ${g.gene} — ${g.name_fa} · ${g.chromosome}:${g.start}–${g.end} · ${g.protein_len}aa${g.synthetic ? ' ⚡ مصنوعی' : ''}${g.trait ? ` → صفت: ${g.trait}` : ''}`);
      return { ok: true, text: `ژنها (${list.length} ثبتشده):\n${out.join('\n')}`, data: list };
    }
    default:
      return null;
  }
}

function translateCodon(codon) {
  const T = { TTT: 'F', TTC: 'F', TTA: 'L', TTG: 'L', TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S', TAT: 'Y', TAC: 'Y', TAA: '*', TAG: '*', TGT: 'C', TGC: 'C', TGA: '*', TGG: 'W', CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L', CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P', CAT: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q', CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R', ATT: 'I', ATC: 'I', ATA: 'I', ATG: 'M', ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T', AAT: 'N', AAC: 'N', AAA: 'K', AAG: 'K', AGT: 'S', AGC: 'S', AGA: 'R', AGG: 'R', GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V', GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A', GAT: 'D', GAC: 'D', GAA: 'E', GAG: 'E', GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G' };
  return T[codon] || '?';
}

function codonForAA(aa) {
  for (const [codon, a] of Object.entries({
    TTT: 'F', TTC: 'F', TTA: 'L', TTG: 'L', TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S', TAT: 'Y', TAC: 'Y', TGT: 'C', TGC: 'C', TGG: 'W',
    CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L', CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P', CAT: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q', CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
    ATT: 'I', ATC: 'I', ATA: 'I', ATG: 'M', ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T', AAT: 'N', AAC: 'N', AAA: 'K', AAG: 'K', AGT: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
    GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V', GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A', GAT: 'D', GAC: 'D', GAA: 'E', GAG: 'E', GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
  })) if (a === aa) return codon;
  return 'AAA';
}

function hashKey(k) { return store.hashKey(k); }

async function verify(req) {
  const raw = req.headers['x-api-key'] || req.query.key || (req.body && req.body.key);
  return store.verifyKey(raw);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();

  try {
    const key = await verify(req);
    if (!key) return res.status(401).json({ error: 'Unauthorized: missing or invalid X-API-Key', hint: 'Create a key in the AI Bridge panel and send it as X-API-Key header.' });

    if (req.method === 'GET') {
      const action = req.query.action || 'help';
      if (action === 'help') {
        return res.status(200).json({
          name: 'SOMATOS-1 embodiment bridge',
          auth: 'X-API-Key header',
          flow: 'POST command -> {id, queued} -> browser body executes (or server executes brain/genome) -> GET result&id=',
          endpoints: {
            'GET ?action=inbox&limit=10': 'pending queued commands (used by the live body)',
            'GET ?action=result&id=N': 'fetch execution result of command N',
            'GET ?action=state': 'latest vitals + joints + inventory + brain + traits snapshot',
            'POST {command, args}': 'queue a command. commands: ' + ALLOWED.join(', '),
          },
          server_side: SERVER_COMMANDS,
        });
      }
      if (action === 'inbox') {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const data = store.list('ai_commands', (r) => r.source === 'external' && r.status === 'queued' && BROWSER_COMMANDS.includes(r.command))
          .sort((a, b) => a.id - b.id)
          .slice(0, limit);
        return res.status(200).json(data);
      }
      if (action === 'result') {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'id is required' });
        const row = store.get('ai_commands', id);
        if (!row) return res.status(404).json({ error: 'command not found' });
        return res.status(200).json(row);
      }
      if (action === 'state') {
        const vitals = store.list('vital_signs').sort((a, b) => b.id - a.id)[0] || null;
        const joints = store.list('joint_states').sort((a, b) => a.joint_id.localeCompare(b.joint_id));
        const parts = store.list('body_parts').slice(0, 500);
        const senses = store.list('sense_logs').sort((a, b) => b.id - a.id).slice(0, 10);
        const muts = store.list('genome_mutations');
        const brainActivity = store.list('brain_activity').sort((a, b) => b.id - a.id)[0] || null;
        return res.status(200).json({
          time: new Date().toISOString(),
          vitals,
          joints,
          parts_count: store.count('body_parts'),
          parts,
          recent_senses: senses,
          brain: { total_neurons: BRAIN_TOTAL, latest_activity: brainActivity },
          genome: { active_traits: activeTraits(muts), mutations: muts.length },
        });
      }
      return res.status(400).json({ error: 'Unknown action', allowed: ['help', 'inbox', 'result', 'state'] });
    }

    if (req.method === 'POST') {
      const { command, args } = req.body || {};
      if (!command) return res.status(400).json({ error: 'command is required' });
      if (!ALLOWED.includes(command)) return res.status(400).json({ error: 'Unknown command: ' + command, allowed: ALLOWED });

      // server-side commands execute immediately
      if (SERVER_COMMANDS.includes(command)) {
        const started = Date.now();
        const r = runServerCommand(command, args);
        const latency = Date.now() - started;
        const row = store.insert('ai_commands', {
          source: 'external', command, args: args || {},
          status: r && r.ok ? 'done' : 'error',
          result: r ? String(r.text).slice(0, 800) : 'unknown server command',
          latency_ms: latency, created_at: new Date().toISOString(),
        });
        return res.status(201).json({ id: row.id, status: row.status, command, args: args || {}, result: row.result, latency_ms: latency, poll: '/api/bridge?action=result&id=' + row.id });
      }

      // browser-side commands queue for the live body
      const row = store.insert('ai_commands', {
        source: 'external', command, args: args || {}, status: 'queued', result: null,
        latency_ms: null, created_at: new Date().toISOString(),
      });
      return res.status(201).json({ id: row.id, status: 'queued', command, args: args || {}, poll: '/api/bridge?action=result&id=' + row.id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API bridge error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Direct execution endpoint — skips queue, runs server-side commands immediately.
// Used by the live embodiment HUD for instant feedback.
export async function directHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();

  try {
    const key = await verify(req);
    if (!key) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const action = req.query.action || 'state';
      // GET ?action=state → full live snapshot
      if (action === 'state') {
        const vitals = store.list('vital_signs').sort((a, b) => b.id - a.id)[0] || null;
        const joints = store.list('joint_states').sort((a, b) => a.joint_id.localeCompare(b.joint_id));
        const brainActivity = store.list('brain_activity').sort((a, b) => b.id - a.id)[0] || null;
        const muts = store.list('genome_mutations');
        return res.status(200).json({
          time: new Date().toISOString(),
          vitals, joints,
          parts_count: store.count('body_parts'),
          brain: { total_neurons: BRAIN_TOTAL, latest_activity: brainActivity },
          genome: { active_traits: activeTraits(muts), mutations: muts.length },
        });
      }
      if (action === 'help') {
        return res.status(200).json({
          name: 'SOMATOS-1 direct',
          desc: 'Execute server-side commands instantly, no queue. For real-time embodiment.',
          endpoint: 'POST /api/bridge/direct {command, args}',
          server_commands: SERVER_COMMANDS.join(', '),
        });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      const { command, args } = req.body || {};
      if (!command) return res.status(400).json({ error: 'command required' });
      if (!ALLOWED.includes(command)) return res.status(400).json({ error: 'Unknown command: ' + command, allowed: ALLOWED });

      const started = Date.now();
      let result;

      if (SERVER_COMMANDS.includes(command)) {
        result = runServerCommand(command, args);
      } else {
        // Browser-side commands: queue but execute immediately via callback
        const row = store.insert('ai_commands', {
          source: 'direct', command, args: args || {}, status: 'done',
          result: null, latency_ms: 0, created_at: new Date().toISOString(),
        });
        return res.status(200).json({
          id: row.id, status: 'queued-browser', command,
          note: 'Browser-side command queued. Execute via browser body or use server-side commands for instant results.',
        });
      }

      const latency = Date.now() - started;
      const text = result && result.ok ? String(result.text).slice(0, 800) : (result ? 'error' : 'unknown');
      const row = store.insert('ai_commands', {
        source: 'direct', command, args: args || {},
        status: result && result.ok ? 'done' : 'error',
        result: text, latency_ms: latency, created_at: new Date().toISOString(),
      });
      return res.status(200).json({
        id: row.id, status: result && result.ok ? 'done' : 'error',
        command, result: text, latency_ms: latency,
      });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Direct handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
