// SOMATOS-1 Genome Core — real human reference genome (GRCh38) addressing
// + sparse mutation engine + expression traits.
//
// The full ~3.1 Gbp sequence is *virtually addressable*: every base of every
// chromosome is computed deterministically from a per-chromosome seed, so the
// whole genome exists without storing 3 GB. Real genes are embedded as
// protein-authentic CDS records (back-translated via the standard codon
// table). Mutations are stored as sparse edits on top of the reference.

export const GENOME_BUILD = 'GRCh38 (virtual addressing, protein-authentic genes)';

// GRCh38 primary assembly lengths (bp)
export const CHROMOSOMES = [
  { name: 'chr1',  length: 248956422 },
  { name: 'chr2',  length: 242193529 },
  { name: 'chr3',  length: 198295559 },
  { name: 'chr4',  length: 190214555 },
  { name: 'chr5',  length: 181538259 },
  { name: 'chr6',  length: 170805979 },
  { name: 'chr7',  length: 159345973 },
  { name: 'chr8',  length: 145138636 },
  { name: 'chr9',  length: 138394717 },
  { name: 'chr10', length: 133797422 },
  { name: 'chr11', length: 135086622 },
  { name: 'chr12', length: 133275309 },
  { name: 'chr13', length: 114364328 },
  { name: 'chr14', length: 107043718 },
  { name: 'chr15', length: 101991189 },
  { name: 'chr16', length: 90338345 },
  { name: 'chr17', length: 83257441 },
  { name: 'chr18', length: 80373285 },
  { name: 'chr19', length: 58617616 },
  { name: 'chr20', length: 64444167 },
  { name: 'chr21', length: 46709983 },
  { name: 'chr22', length: 50818468 },
  { name: 'chrX',  length: 156040895 },
  { name: 'chrY',  length: 57227415 },
  { name: 'chrM',  length: 16569 },
];

// Synthetic contig for engineered traits (horn keratin cluster)
export const SYNTHETIC = [
  { name: 'chrUn_HORN', length: 48210, synthetic: true, note: 'engineered horn-keratin locus (KRTHORN1/2 + promoter)' },
];

export const TOTAL_BP = CHROMOSOMES.reduce((s, c) => s + c.length, 0) + SYNTHETIC.reduce((s, c) => s + c.length, 0);

const BASES = ['A', 'C', 'G', 'T'];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chromSeed(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const blockCache = new Map(); // key: name:blockIdx -> string
const BLOCK_LEN = 4096;

// Deterministic base generation for the reference background.
function refBlock(name, blockIdx) {
  const rand = mulberry32((chromSeed(name) ^ Math.imul(blockIdx, 0x9E3779B9)) >>> 0);
  let s = '';
  for (let i = 0; i < BLOCK_LEN; i++) s += BASES[(rand() * 4) | 0];
  return s;
}

// Standard genetic code (DNA codons -> amino acid)
const CODON_TABLE = (() => {
  const table = {};
  const bases = ['T', 'C', 'A', 'G'];
  const aas = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  let k = 0;
  for (const b1 of bases) for (const b2 of bases) for (const b3 of bases) {
    table[b1 + b2 + b3] = aas[k++];
  }
  return table;
})();

const AA3 = {
  A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', Q: 'Gln', E: 'Glu', G: 'Gly',
  H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser',
  T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val', '*': 'Stop',
};

// Back-translate a protein into a DNA CDS using a fixed codon choice
// (first codon in table order for each amino acid) — protein-authentic.
const REV_CODON = {};
for (const b1 of ['T', 'C', 'A', 'G']) for (const b2 of ['T', 'C', 'A', 'G']) for (const b3 of ['T', 'C', 'A', 'G']) {
  const aa = CODON_TABLE[b1 + b2 + b3];
  if (aa !== '*' && !REV_CODON[aa]) REV_CODON[aa] = b1 + b2 + b3;
}
REV_CODON['*'] = 'TAA';

export function backTranslate(protein) {
  let dna = 'ATG';
  for (let i = 1; i < protein.length; i++) dna += REV_CODON[protein[i]] || 'AAA';
  return dna;
}

export function translateDna(dna) {
  let out = '';
  for (let i = 0; i + 2 < dna.length; i += 3) {
    const aa = CODON_TABLE[dna.slice(i, i + 3)];
    if (aa === undefined || aa === '*') break;
    out += aa;
  }
  return out;
}

// ---- Real genes (protein sequences I can state with confidence; nucleotide
// sequence is a deterministic back-translation, marked as such). ----
const HBB_PROT = 'MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH';
const INS_PROT = 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN';
const ACTB_PROT = 'MDDDIAALVVVDNGSGMCKAGFAGDDAPRAVFPSIVGRPRHQGVMVGMGQKDSYVGDEAQSKRGILTLKYPIEHGIVTNWDDMEKIWHHTFYNELRVAPEEHPVLLTEAPLNPKANREKMTQIMFETFNTPAMYVAIQAVLSLYASGRTTGIVMDSGDGVTHTVPIYEGYALPHAILRLDLAGRDLTDYLMKILTERGYSFTTTAEREIVRDIKEKLCYVALDFEQEMATAASSSSLEKSYELPDGQVITIGNERFRCPEALFQPSFLGMESCGIHETTFNSIMKCDVDIRKDLYANTVLSGGTTMYPGIADRMQKEITALAPSTMKIKIIAPPERKYSVWIGGSILASLSTFQQMWISKQEYDESGPSIVHRKCF';
const TP53_N = 'MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKTCPVQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHERCSDSD';

export const GENES = [
  {
    gene: 'HBB', name_fa: 'هموگلوبین بتا', en: 'beta-globin', chromosome: 'chr11',
    start: 5225464, end: 5227072, strand: '+',
    cds: backTranslate(HBB_PROT), protein: HBB_PROT,
    authenticity: 'protein-authentic (nucleotide back-translated)',
    note_fa: 'زنجیره بتای هموگلوبین؛ جهش c.20A>T (Glu6Val شماره‌گذاری رسیده) همان بیماری سلول داسی است.',
    landmark: { codon: 7, wt: 'E', mutant: 'V', change: 'GAA>GTT (c.20A>T)', label: 'sickle-cell (Glu6Val mature)', cds_offset: 19 },
  },
  {
    gene: 'INS', name_fa: 'انسولین', en: 'insulin', chromosome: 'chr11',
    start: 2181028, end: 2181394,
    cds: backTranslate(INS_PROT), protein: INS_PROT,
    authenticity: 'protein-authentic (nucleotide back-translated)',
    note_fa: 'پیش‌ساز انسولین: زنجیره سیگنال + B + C + A.',
  },
  {
    gene: 'ACTB', name_fa: 'بتا-اکتین', en: 'beta-actin', chromosome: 'chr7',
    start: 5560709, end: 5563874,
    cds: backTranslate(ACTB_PROT), protein: ACTB_PROT,
    authenticity: 'protein-authentic (nucleotide back-translated)',
    note_fa: 'اسکلت سلولی؛ خانه‌ژ مرجع در آزمایشگاه‌ها.',
  },
  {
    gene: 'TP53', name_fa: 'p53 (نگهبان ژنوم)', en: 'tumor protein p53 (N-terminal domain)', chromosome: 'chr17',
    start: 7687377, end: 7687718,
    cds: backTranslate(TP53_N), protein: TP53_N,
    authenticity: 'protein-authentic fragment (nucleotide back-translated)',
    note_fa: 'ترانس‌اکتیواسیون، توقف چرخه سلولی و آپوپتوز — قطعه N-ترمینال.',
  },
  {
    gene: 'KRTHORN1', name_fa: 'کراتین شاخ ۱ (مهندسی‌شده)', en: 'horn keratin 1 (engineered)', chromosome: 'chrUn_HORN',
    start: 1200, end: 1200 + backTranslate(KRTHORN_PROT()).length - 1,
    cds: null, protein: KRTHORN_PROT(),
    authenticity: 'synthetic (keratin-heptad inspired)',
    note_fa: 'ژن مصنوعی ساخت ما؛ پروتئین کراتین‌مانند با تکرارهای هپتادی برای هسته شاخ.',
    synthetic: true, trait: 'horns',
  },
  {
    gene: 'KRTHORN2', name_fa: 'کراتین شاخ ۲ (مهندسی‌شده)', en: 'horn keratin 2 (engineered)', chromosome: 'chrUn_HORN',
    start: 9500, end: 9500 + backTranslate(KRTHORN_PROT()).length - 1,
    cds: null, protein: KRTHORN_PROT(),
    authenticity: 'synthetic (keratin-heptad inspired)',
    note_fa: 'همتای دوم برای استحکام دیواره شاخ.',
    synthetic: true, trait: 'horns',
  },
];

function KRTHORN_PROT() {
  // synthetic keratin-like: heptad repeat (a-g) with hydrophobic a/d positions
  const heptad = 'M K L L D K N T L Q E E L D K A R L E E E I A L K Q E E L Q A L S E K S E L E A E L Q A L S D K N E E L Q A L';
  return heptad.replace(/ /g, '') + 'YSGGGLGGYGGLGGYGGLGSGGG';
}
for (const g of GENES) { if (!g.cds) g.cds = backTranslate(g.protein); g.end = g.start + g.cds.length - 1; }

// Gene CDS overlay index: real genes override the random background.
const GENE_INDEX = (() => {
  const byChrom = new Map();
  for (const g of GENES) {
    if (!byChrom.has(g.chromosome)) byChrom.set(g.chromosome, []);
    byChrom.get(g.chromosome).push(g);
  }
  return byChrom;
})();

function refBase(name, pos) {
  const genes = GENE_INDEX.get(name);
  if (genes) {
    for (const g of genes) {
      if (pos >= g.start && pos <= g.end) return g.cds[pos - g.start];
    }
  }
  const blockIdx = Math.floor(pos / BLOCK_LEN);
  const key = name + ':' + blockIdx;
  let block = blockCache.get(key);
  if (!block) {
    block = refBlock(name, blockIdx);
    if (blockCache.size > 512) blockCache.clear();
    blockCache.set(key, block);
  }
  return block[pos % BLOCK_LEN];
}

export function chromosomeList() {
  return [...CHROMOSOMES, ...SYNTHETIC].map((c) => ({ ...c }));
}

export function totalBp() { return TOTAL_BP; }

export function readBases(chrom, start, len) {
  const c = [...CHROMOSOMES, ...SYNTHETIC].find((x) => x.name === chrom);
  if (!c) return { error: 'unknown chromosome' };
  const s = Math.max(0, Math.min(start, c.length - 1));
  const n = Math.min(len || 60, 5000);
  let out = '';
  for (let i = 0; i < n; i++) {
    const p = s + i;
    if (p >= c.length) break;
    out += refBase(chrom, p);
  }
  return { chromosome: chrom, start: s, length: out.length, sequence: out };
}

export function baseAt(chrom, pos) {
  const c = [...CHROMOSOMES, ...SYNTHETIC].find((x) => x.name === chrom);
  if (!c) return { error: 'unknown chromosome' };
  if (pos < 0 || pos >= c.length) return { error: 'position out of range' };
  return { chromosome: chrom, position: pos, base: refBase(chrom, pos) };
}

// Mutations are sparse edits stored in the store (genome_mutations table);
// readBasesEffective overlays them on the deterministic reference.
export function readBasesEffective(mutRows, chrom, start, len) {
  const edits = new Map();
  for (const m of mutRows || []) {
    if (m.chromosome === chrom && m.kind === 'substitution') edits.set(m.position, m.new_base);
  }
  const c = [...CHROMOSOMES, ...SYNTHETIC].find((x) => x.name === chrom);
  if (!c) return { error: 'unknown chromosome' };
  const s = Math.max(0, Math.min(start, c.length - 1));
  const n = Math.min(len || 60, 5000);
  let out = '';
  for (let i = 0; i < n; i++) {
    const p = s + i;
    if (p >= c.length) break;
    out += edits.get(p) || refBase(chrom, p);
  }
  return { chromosome: chrom, start: s, length: out.length, sequence: out, edits_applied: edits.size };
}

export function classifyMutation(gene, aaFrom, aaTo) {
  if (!gene) return 'intergenic';
  if (aaTo === '*') return 'nonsense';
  if (aaFrom === aaTo) return 'synonymous';
  return 'missense';
}

// ---- trait expression ----
export function activeTraits(mutRows) {
  const traits = new Set();
  for (const m of mutRows || []) {
    if (m.kind === 'expression' && m.trait) traits.add(m.trait);
    if (m.kind === 'crispr' && m.trait) traits.add(m.trait);
  }
  return [...traits];
}

// ---- gradual development (morphogenesis) ----
// Horns grow from the expression timestamp: full 12 cm over 90 real minutes
// (1 simulated day per 30 min). Growth is eased (slow start, slow finish).
export const GROWTH = {
  horns: { full_length_cm: 12, duration_min: 90, day_length_min: 30 },
};

export function computeGrowth(trait, startedAtIso, nowMs) {
  const cfg = GROWTH[trait];
  if (!cfg || !startedAtIso) return { trait, expressed: false, progress: 0, length_cm: 0, days: 0 };
  const start = new Date(startedAtIso).getTime();
  const elapsedMin = Math.max(0, (nowMs - start) / 60000);
  const x = Math.min(1, elapsedMin / cfg.duration_min);
  const eased = x <= 0 ? 0 : x >= 1 ? 1 : (x * x * (3 - 2 * x)); // smoothstep
  return {
    trait,
    expressed: true,
    started_at: startedAtIso,
    progress: +eased.toFixed(4),
    length_cm: +(cfg.full_length_cm * eased).toFixed(2),
    days: +(elapsedMin / cfg.day_length_min).toFixed(2),
    complete: x >= 1,
    eta_min: x >= 1 ? 0 : +(cfg.duration_min - elapsedMin).toFixed(1),
  };
}

export function genomeSummary(mutRows) {
  return {
    build: GENOME_BUILD,
    total_bp: TOTAL_BP,
    chromosomes: [...CHROMOSOMES, ...SYNTHETIC].length,
    genes: GENES.map((g) => ({ gene: g.gene, chromosome: g.chromosome, start: g.start, end: g.end, protein_len: g.protein.length, authenticity: g.authenticity, synthetic: !!g.synthetic, trait: g.trait || null })),
    mutations: (mutRows || []).length,
    active_traits: activeTraits(mutRows),
  };
}
