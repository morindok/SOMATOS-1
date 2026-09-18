import store from './store.js';
import { BRAIN_TOTAL, BRAIN_REGIONS, regionSummary, neuronAt, think, brainStatsFromDb } from './core/brainCore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();
  try {
    if (req.method === 'GET') {
      const { action, region, index, count } = req.query;
      if (action === 'memory') {
        const snaps = store.list('brain_memory').sort((a, b) => b.id - a.id).slice(0, 3);
        return res.status(200).json({ snapshots: snaps.length, latest: snaps[0] || null });
      }
      if (action === 'neuron') {
        return res.status(200).json(neuronAt(index || 0));
      }
      if (action === 'neurons') {
        const n = Math.min(parseInt(count || 8, 10), 24);
        const start = parseInt(index || 0, 10) || 0;
        const out = [];
        for (let i = 0; i < n; i++) out.push(neuronAt(start + i * 997_003_137));
        return res.status(200).json(out);
      }
      if (action === 'think') {
        const r = think(region || 'ctx_frontal');
        if (r.error) return res.status(400).json(r);
        return res.status(200).json(r);
      }
      const activity = store.list('brain_activity').sort((a, b) => b.id - a.id).slice(0, 20);
      return res.status(200).json({
        ...brainStatsFromDb(activity),
        region_table: regionSummary(),
        wiring_regions: BRAIN_REGIONS.map((r) => r.id),
      });
    }
    if (req.method === 'POST') {
      const { firing_rate_hz, bands, active_regions, stimulated, note, weights_b64, stats } = req.body || {};
      if (weights_b64) {
        // learning snapshot: keep only the 3 most recent
        const row = store.insert('brain_memory', {
          weights_b64, stats: stats || null, created_at: new Date().toISOString(),
        });
        const all = store.list('brain_memory').sort((a, b) => b.id - a.id);
        for (const old of all.slice(3)) {
          const idx = store.table('brain_memory').indexOf(old);
          if (idx >= 0) store.table('brain_memory').splice(idx, 1);
        }
        store.scheduleFlush();
        return res.status(201).json({ saved: true, id: row.id, stats: row.stats });
      }
      const row = store.insert('brain_activity', {
        total_neurons: BRAIN_TOTAL,
        firing_rate_hz: typeof firing_rate_hz === 'number' ? firing_rate_hz : null,
        bands: bands || null,
        active_regions: active_regions || null,
        stimulated: stimulated || null,
        note: note || null,
        created_at: new Date().toISOString(),
      });
      return res.status(201).json(row);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API brain error:', err);
    return res.status(500).json({ error: err.message });
  }
}
