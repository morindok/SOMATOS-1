import store, { now } from './store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();
  try {
    if (req.method === 'GET') {
      const { system, layer, q, limit } = req.query;
      let rows = store.list('body_parts');
      if (system) rows = rows.filter((p) => p.system === system);
      if (layer) rows = rows.filter((p) => p.layer === layer);
      if (q) {
        const s = String(q).toLowerCase();
        rows = rows.filter((p) =>
          (p.name_fa || '').includes(q) ||
          (p.name_en || '').toLowerCase().includes(s) ||
          (p.latin || '').toLowerCase().includes(s) ||
          (p.part_id || '').toLowerCase().includes(s));
      }
      rows = rows.slice(0, limit ? parseInt(limit, 10) : 300);
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [body];
      const created = [];
      for (const it of items) {
        if (!it.part_id) continue;
        const existing = store.find('body_parts', (p) => p.part_id === it.part_id);
        if (existing) { Object.assign(existing, it); created.push(existing); continue; }
        created.push(store.insert('body_parts', {
          part_id: it.part_id, name_fa: it.name_fa, name_en: it.name_en, latin: it.latin,
          system: it.system, layer: it.layer, parent_id: it.parent_id || null,
          movable: !!it.movable, description_fa: it.description_fa, description_en: it.description_en,
          facts: it.facts || null, created_at: now(),
        }));
      }
      return res.status(201).json(created);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API body-parts error:', err);
    return res.status(500).json({ error: err.message });
  }
}
