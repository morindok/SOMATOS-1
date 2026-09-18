import store from './store.js';
import {
  GENOME_BUILD, GENES, chromosomeList, totalBp,
  readBases, readBasesEffective, baseAt,
  translateDna, backTranslate, activeTraits, genomeSummary, computeGrowth,
} from './core/genomeCore.js';

function findGene(q) {
  const s = String(q).toLowerCase();
  return GENES.find((g) => g.gene.toLowerCase() === s) ||
    GENES.find((g) => g.gene.toLowerCase().includes(s)) ||
    GENES.find((g) => (g.en || '').toLowerCase().includes(s));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();
  try {
    const mutRows = () => store.list('genome_mutations').sort((a, b) => b.id - a.id);

    if (req.method === 'GET') {
      const { action, chromosome, gene, start, len, position } = req.query;
      const muts = mutRows();
      if (action === 'summary' || !action) {
        return res.status(200).json(genomeSummary(muts));
      }
      if (action === 'chromosomes') {
        return res.status(200).json({ build: GENOME_BUILD, total_bp: totalBp(), chromosomes: chromosomeList() });
      }
      if (action === 'read') {
        if (!chromosome) return res.status(400).json({ error: 'chromosome is required' });
        const r = readBasesEffective(muts, chromosome, parseInt(start || 0, 10), parseInt(len || 60, 10));
        if (r.error) return res.status(400).json(r);
        return res.status(200).json(r);
      }
      if (action === 'base') {
        if (!chromosome) return res.status(400).json({ error: 'chromosome is required' });
        const r = baseAt(chromosome, parseInt(position || 0, 10));
        if (r.error) return res.status(400).json(r);
        return res.status(200).json(r);
      }
      if (action === 'genes') {
        return res.status(200).json(GENES.map((g) => ({
          gene: g.gene, name_fa: g.name_fa, en: g.en, chromosome: g.chromosome,
          start: g.start, end: g.end, protein_len: g.protein.length,
          cds_len: g.cds.length, authenticity: g.authenticity, note_fa: g.note_fa,
          synthetic: !!g.synthetic, trait: g.trait || null, landmark: g.landmark || null,
        })));
      }
      if (action === 'gene') {
        const g = findGene(gene || '');
        if (!g) return res.status(404).json({ error: 'gene not found', available: GENES.map((x) => x.gene) });
        const protein = translateDna(g.cds);
        return res.status(200).json({ ...g, translate_check: protein === g.protein ? 'verified' : 'mismatch', protein, mutations_on_gene: muts.filter((m) => m.gene === g.gene) });
      }
      if (action === 'mutations') {
        return res.status(200).json(muts);
      }
      if (action === 'traits') {
        return res.status(200).json({ build: GENOME_BUILD, active_traits: activeTraits(muts), mutations: muts.length });
      }
      if (action === 'growth') {
        const trait = (req.query.trait || 'horns').toLowerCase();
        const expr = muts.find((m) => m.kind === 'expression' && m.trait === trait && !m.reverted);
        if (!expr) return res.status(200).json({ trait, expressed: false, progress: 0, length_cm: 0, days: 0 });
        const g = computeGrowth(trait, expr.created_at, Date.now());
        return res.status(200).json(g);
      }
      return res.status(400).json({ error: 'Unknown action', allowed: ['summary', 'chromosomes', 'read', 'base', 'genes', 'gene', 'mutations', 'traits', 'growth'] });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action;
      const muts = mutRows();

      if (action === 'mutate') {
        const { chromosome, position, base } = body;
        const c = chromosomeList().find((x) => x.name === chromosome);
        if (!c) return res.status(400).json({ error: 'unknown chromosome', available: chromosomeList().map((x) => x.name) });
        const pos = parseInt(position, 10);
        const nb = String(base || '').toUpperCase();
        if (!Number.isInteger(pos) || pos < 0 || pos >= c.length) return res.status(400).json({ error: 'position out of range' });
        if (!'ACGT'.includes(nb)) return res.status(400).json({ error: 'base must be A, C, G or T' });
        // find overlapping gene + codon consequence
        const g = GENES.find((x) => x.chromosome === chromosome && pos >= x.start && pos <= x.end);
        let consequence = { type: 'intergenic', note: 'outside annotated CDS' };
        let aa_from = null, aa_to = null, codon_pos = null;
        if (g) {
          const offset = pos - g.start;
          codon_pos = Math.floor(offset / 3);
          const frame = offset % 3;
          const codonStart = codon_pos * 3;
          const wtCodon = g.cds.slice(codonStart, codonStart + 3);
          const mutCodon = wtCodon.split('');
          mutCodon[frame] = nb;
          const aaFrom = translateDna(wtCodon);
          const aaTo = translateDna(mutCodon.join(''));
          aa_from = aaFrom; aa_to = aaTo;
          const type = aaTo === aaFrom ? 'synonymous' : (aaTo === '' ? 'nonsense' : 'missense');
          consequence = { type, gene: g.gene, codon: codon_pos + 1, aa_change: aaFrom === aaTo ? null : `${aaFrom}${codon_pos + 1}${aaTo}` };
        }
        const row = store.insert('genome_mutations', {
          kind: 'substitution', chromosome, position: pos, ref_base: readBases(chromosome, pos, 1).sequence, new_base: nb,
          gene: g ? g.gene : null, codon: codon_pos !== null ? codon_pos + 1 : null,
          aa_from, aa_to, consequence_type: consequence.type, consequence: consequence,
          trait: null, created_at: new Date().toISOString(),
        });
        return res.status(201).json({ mutation: row, note: 'substitution recorded on virtual reference' });
      }

      if (action === 'crispr') {
        const { gene: geneName, codon, aa } = body;
        const g = findGene(geneName || '');
        if (!g) return res.status(404).json({ error: 'gene not found', available: GENES.map((x) => x.gene) });
        const codonIdx = parseInt(codon, 10);
        if (!Number.isInteger(codonIdx) || codonIdx < 1 || codonIdx * 3 > g.cds.length) {
          return res.status(400).json({ error: 'codon out of range', protein_len: g.protein.length });
        }
        const targetAA = String(aa || '').toUpperCase();
        if (targetAA.length !== 1) return res.status(400).json({ error: 'aa must be a single amino-acid letter' });
        const offset = (codonIdx - 1) * 3;
        const wtCodon = g.cds.slice(offset, offset + 3);
        // find a codon encoding targetAA
        const codonFor = backTranslate('M' + targetAA).slice(3, 6);
        const absStart = g.start + offset;
        const edits = [];
        for (let i = 0; i < 3; i++) {
          if (wtCodon[i] !== codonFor[i]) {
            edits.push({ chromosome: g.chromosome, position: absStart + i, ref_base: wtCodon[i], new_base: codonFor[i] });
          }
        }
        const created = [];
        for (const e of edits) {
          created.push(store.insert('genome_mutations', {
            kind: 'crispr', chromosome: e.chromosome, position: e.position,
            ref_base: e.ref_base, new_base: e.new_base,
            gene: g.gene, codon: codonIdx, aa_from: g.protein[codonIdx - 1], aa_to: targetAA,
            consequence_type: g.protein[codonIdx - 1] === targetAA ? 'revert' : 'missense',
            consequence: { type: 'crispr_edit', gene: g.gene, codon: codonIdx, aa_change: `${g.protein[codonIdx - 1]}${codonIdx}${targetAA}` },
            trait: null, created_at: new Date().toISOString(),
          }));
        }
        return res.status(201).json({ gene: g.gene, codon: codonIdx, wt_codon: wtCodon, new_codon: codonFor, edits: created });
      }

      if (action === 'express') {
        const { trait } = body;
        const known = { horns: 'شاخ‌ها — از ژن‌های KRTHORN1/2 روی chrUn_HORN بیان می‌شوند' };
        if (!trait || !known[trait]) return res.status(400).json({ error: 'unknown trait', available: Object.keys(known) });
        const already = muts.find((m) => m.kind === 'expression' && m.trait === trait);
        if (already) return res.status(200).json({ trait, already_active: true, mutation: already });
        const row = store.insert('genome_mutations', {
          kind: 'expression', chromosome: 'chrUn_HORN', position: 800, ref_base: null, new_base: null,
          gene: 'KRTHORN1/2', codon: null, aa_from: null, aa_to: null,
          consequence_type: 'gain-of-expression',
          consequence: { type: 'expression', note: known[trait] },
          trait, created_at: new Date().toISOString(),
        });
        return res.status(201).json({ trait, expressed: true, mutation: row, note: known[trait] });
      }

      if (action === 'revert') {
        const id = parseInt(body.id, 10);
        const row = store.get('genome_mutations', id);
        if (!row) return res.status(404).json({ error: 'mutation not found' });
        store.update('genome_mutations', id, { reverted: true, reverted_at: new Date().toISOString() });
        return res.status(200).json({ reverted: id, active_traits: activeTraits(mutRows()) });
      }

      return res.status(400).json({ error: 'Unknown action', allowed: ['mutate', 'crispr', 'express', 'revert'] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API genome error:', err);
    return res.status(500).json({ error: err.message });
  }
}
