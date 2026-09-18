// SOMATOS-1 Brain Core — 86,000,000,000 neurons
//
// Strategy: the full 86-billion population exists as *virtual neurons*.
// Every index in [0, 86e9) deterministically maps to a real neuroanatomical
// region (Herculano-Houzel 2009 isotropic-fractionator numbers) and to
// stable per-neuron properties (type, layer, 3D position) via hashing.
// A live Izhikevich microcosm (in the browser, src/lib/brain.ts) simulates
// 86,000 neurons at 1:1,000,000 scale and streams population statistics,
// which are logged to the store by the frontend.

export const BRAIN_TOTAL = 86_000_000_000;

// Region neuron counts. Cerebral cortex 16.3B split across lobes,
// cerebellum 69B (granule-cell dominated), remainder 0.7B subcortical.
export const BRAIN_REGIONS = [
  { id: 'cerebellum',        fa: 'مخچه',              en: 'Cerebellum',             neurons: 69_000_000_000, mass_g: 150, note: 'granule-cell dominated; timing & motor coordination' },
  { id: 'ctx_frontal',       fa: 'قشر پیش‌پیشانی',     en: 'Frontal cortex',         neurons: 5_300_000_000,  mass_g: 200, note: 'planning, working memory, decision' },
  { id: 'ctx_parietal',      fa: 'قشر آهیانه‌ای',      en: 'Parietal cortex',        neurons: 3_600_000_000,  mass_g: 160, note: 'somatosensory integration, space' },
  { id: 'ctx_temporal',      fa: 'قشر گیجگاهی',        en: 'Temporal cortex',        neurons: 3_100_000_000,  mass_g: 150, note: 'auditory, memory, semantics' },
  { id: 'ctx_occipital',     fa: 'قشر پس‌سری',         en: 'Occipital cortex',       neurons: 2_400_000_000,  mass_g: 90,  note: 'primary + associative visual' },
  { id: 'ctx_limbic',        fa: 'قشر لیمبیک/-insula', en: 'Limbic & insular cortex',neurons: 1_900_000_000,  mass_g: 70,  note: 'emotion, interoception, cingulate' },
  { id: 'striatum',          fa: 'جسم مخطط',          en: 'Striatum',               neurons: 100_000_000,    mass_g: 25,  note: 'action selection, habit' },
  { id: 'thalamus',          fa: 'تالاموس',           en: 'Thalamus',               neurons: 60_000_000,     mass_g: 7,   note: 'relay & gating to cortex' },
  { id: 'brainstem_retic',   fa: 'تقویت‌کننده شبکه‌ای', en: 'Reticular formation',    neurons: 220_000_000,    mass_g: 60,  note: 'arousal, autonomic reflexes' },
  { id: 'colliculi',         fa: 'کولیکول‌ها',         en: 'Superior/Inferior colliculi', neurons: 30_000_000, mass_g: 3,  note: 'saccades, auditory orienting' },
  { id: 'hypothalamus',      fa: 'هیپوتالاموس',        en: 'Hypothalamus',           neurons: 8_000_000,      mass_g: 4,   note: 'homeostasis, hormones' },
  { id: 'amygdala',          fa: 'آمیگدال',           en: 'Amygdala',               neurons: 13_000_000,     mass_g: 3,   note: 'threat & salience' },
  { id: 'hippocampus',       fa: 'هیپوکامپ',          en: 'Hippocampus',            neurons: 32_000_000,     mass_g: 9,   note: 'episodic memory, place cells' },
  { id: 'substantia_nigra',  fa: 'جسم سیاه',          en: 'Substantia nigra + VTA', neurons: 1_200_000,      mass_g: 1,   note: 'dopamine, reward prediction' },
  { id: 'olfactory_bulb',    fa: 'پیاز بویایی',        en: 'Olfactory bulb',         neurons: 12_000_000,     mass_g: 1,   note: 'odor coding' },
  { id: 'brainstem_motor',   fa: 'هسته‌های حرکتی ساقه', en: 'Brainstem motor nuclei', neurons: 110_000_000,    mass_g: 20,  note: 'cranial motor control' },
  { id: 'red_nucleus_etc',   fa: 'هسته سرخ و همتایان', en: 'Red nucleus & midbrain motor', neurons: 15_000_000, mass_g: 2, note: 'limb motor modulation' },
  { id: 'pons_nuclei',       fa: 'هسته‌های پل',        en: 'Pontine nuclei',         neurons: 98_800_000,     mass_g: 18,  note: 'cortex→cerebellum bridge' },
];

function hash32(x, salt) {
  let h = (x ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function unit(h) { return h / 4294967296; }

let cum = null;
function cumulative() {
  if (!cum) {
    cum = [];
    let s = 0;
    for (const r of BRAIN_REGIONS) { s += r.neurons; cum.push({ region: r, start: s - r.neurons, end: s }); }
    cum.total = s;
  }
  return cum;
}

export function regionSummary() {
  return BRAIN_REGIONS.map((r) => ({ ...r, pct: +(100 * r.neurons / BRAIN_TOTAL).toFixed(3) }));
}

// Deterministic virtual neuron: any index in [0, 86e9) resolves to a stable identity.
export function neuronAt(index) {
  const c = cumulative();
  let i = Math.floor(Number(index));
  if (!Number.isFinite(i)) i = 0;
  i = ((i % BRAIN_TOTAL) + BRAIN_TOTAL) % BRAIN_TOTAL;
  let lo = 0, hi = c.length - 1, region = c[0].region, regionStart = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (i >= c[mid].start && i < c[mid].end) { region = c[mid].region; regionStart = c[mid].start; break; }
    if (i < c[mid].start) hi = mid - 1; else lo = mid + 1;
  }
  const local = i - regionStart;
  const h1 = hash32local(i, 0x9e3779b9);
  const h2 = hash32local(i, 0x85ebca6b);
  const h3 = hash32local(i, 0xc2b2ae35);
  const inhibitory = (h1 % 5) === 0; // ~20% inhibitory (real cortical ratio)
  const layer = region.id.startsWith('ctx')
    ? ['L2/3', 'L4', 'L5', 'L6'][(h2 >>> 3) % 4]
    : 'core';
  const g = 0.014; // normalized head radius for position sampling
  const theta = 2 * Math.PI * unit(h2);
  const phi = Math.acos(2 * unit(h3) - 1);
  const rr = 0.9 * Math.cbrt(unit(h1));
  return {
    index: i,
    region: region.id,
    region_fa: region.fa,
    type: inhibitory ? 'inhibitory' : 'excitatory',
    neurotransmitter: inhibitory ? 'GABA' : (region.id === 'substantia_nigra' ? 'dopamine' : 'glutamate'),
    layer,
    position: {
      x: +(rr * Math.sin(phi) * Math.cos(theta)).toFixed(4),
      y: +(rr * Math.cos(phi)).toFixed(4),
      z: +(rr * Math.sin(phi) * Math.sin(theta)).toFixed(4),
    },
    morphClass: inhibitory ? 'interneuron' : (region.id === 'cerebellum' ? 'granule' : 'pyramidal/spiny'),
  };
}

function hash32local(x, salt) {
  let h = (x >>> 0) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}


// Deterministic "thought" trajectory: stimulate a region -> sequence of
// downstream regions via a fixed wiring map (simplified connectome).
const WIRING = {
  ctx_frontal: ['striatum', 'thalamus', 'ctx_parietal'],
  ctx_parietal: ['ctx_frontal', 'thalamus', 'cerebellum'],
  ctx_temporal: ['hippocampus', 'ctx_frontal', 'amygdala'],
  ctx_occipital: ['ctx_parietal', 'ctx_temporal', 'colliculi'],
  ctx_limbic: ['hypothalamus', 'amygdala', 'thalamus'],
  hippocampus: ['ctx_temporal', 'hypothalamus'],
  amygdala: ['hypothalamus', 'brainstem_retic', 'ctx_frontal'],
  striatum: ['substantia_nigra', 'thalamus'],
  thalamus: ['ctx_frontal', 'ctx_parietal', 'ctx_occipital'],
  cerebellum: ['brainstem_retic', 'ctx_frontal'],
  hypothalamus: ['pituitary_axis', 'brainstem_retic'],
  substantia_nigra: ['striatum'],
  colliculi: ['thalamus'],
  brainstem_retic: ['cerebellum', 'brainstem_motor_drive'],
  olfactory_bulb: ['ctx_temporal', 'amygdala'],
  brainstem_motor: ['cerebellum', 'spinal_out'],
  red_nucleus: ['spinal_out'],
  pons_nuclei: ['cerebellum'],
  pituitary_axis: ['endocrine_out'],
  spinal_out: [],
  endocrine_out: [],
  brainstem_motor_drive: [],
};

export function think(regionId, depth = 6) {
  const valid = BRAIN_REGIONS.some((r) => r.id === regionId);
  if (!valid) return { error: 'unknown region', regions: BRAIN_REGIONS.map((r) => r.id) };
  const path = [regionId];
  let cur = regionId;
  for (let d = 0; d < depth; d++) {
    const next = WIRING[cur];
    if (!next || next.length === 0) break;
    const pick = next[hash32local(hash32local(d, 7) + regionId.length, 13) % next.length];
    if (!BRAIN_REGIONS.some((x) => x.id === pick)) break; // terminal output node
    if (path.includes(pick)) break;
    path.push(pick);
    cur = pick;
  }
  let engaged = 0;
  for (const id of path) {
    const r = BRAIN_REGIONS.find((x) => x.id === id);
    engaged += Math.min(r.neurons * 0.02, 900_000_000);
  }
  return { seed_region: regionId, cascade_path: path, neurons_engaged: Math.round(engaged) };
}

export function brainStatsFromDb(activityRows) {
  const latest = activityRows && activityRows.length ? activityRows[0] : null;
  return {
    total_neurons: BRAIN_TOTAL,
    regions: BRAIN_REGIONS.length,
    latest_activity: latest || null,
    scale_note: 'all 86e9 neurons virtually addressable; live spiking microcosm 86,000 @ 1:1,000,000',
  };
}
