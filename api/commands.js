import store from './store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();
  try {
    if (req.method === 'GET') {
      const { source, status, limit } = req.query;
      let rows = store.list('ai_commands').sort((a, b) => b.id - a.id);
      if (source) rows = rows.filter((r) => r.source === source);
      if (status) rows = rows.filter((r) => r.status === status);
      return res.status(200).json(rows.slice(0, limit ? parseInt(limit, 10) : 50));
    }
    if (req.method === 'POST') {
      const { source, command, args, status, result, latency_ms } = req.body || {};
      if (!command) return res.status(400).json({ error: 'command is required' });
      const row = store.insert('ai_commands', {
        source: source || 'console', command, args: args || null, status: status || 'done',
        result: result || null, latency_ms: typeof latency_ms === 'number' ? latency_ms : null,
        created_at: new Date().toISOString(),
      });
      return res.status(201).json(row);
    }
    if (req.method === 'PUT') {
      const { id, status, result } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const patch = {};
      if (status) patch.status = status;
      if (result !== undefined) patch.result = result;
      const row = store.update('ai_commands', id, patch);
      if (!row) return res.status(404).json({ error: 'command not found' });
      return res.status(200).json(row);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API commands error:', err);
    return res.status(500).json({ error: err.message });
  }
}
