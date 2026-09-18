import store from './store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();
  try {
    if (req.method === 'GET') {
      const { channel, limit } = req.query;
      let rows = store.list('sense_logs').sort((a, b) => b.id - a.id);
      if (channel) rows = rows.filter((r) => r.channel === channel);
      return res.status(200).json(rows.slice(0, limit ? parseInt(limit, 10) : 40));
    }
    if (req.method === 'POST') {
      const { channel, value, unit, detail } = req.body || {};
      if (!channel) return res.status(400).json({ error: 'channel is required' });
      const row = store.insert('sense_logs', {
        channel, value: typeof value === 'number' ? value : null, unit: unit || null, detail: detail || null,
        created_at: new Date().toISOString(),
      });
      return res.status(201).json(row);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API sense error:', err);
    return res.status(500).json({ error: err.message });
  }
}
