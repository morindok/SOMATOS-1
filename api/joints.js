import store, { now } from './store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();
  try {
    if (req.method === 'GET') {
      return res.status(200).json(store.list('joint_states').sort((a, b) => a.joint_id.localeCompare(b.joint_id)));
    }
    if (req.method === 'PUT') {
      const body = req.body || {};
      const updates = Array.isArray(body.updates) ? body.updates : [body];
      const results = [];
      for (const u of updates) {
        if (!u.joint_id) continue;
        const patch = { updated_at: now() };
        if (typeof u.rx === 'number') patch.rx = u.rx;
        if (typeof u.ry === 'number') patch.ry = u.ry;
        if (typeof u.rz === 'number') patch.rz = u.rz;
        let row = store.find('joint_states', (r) => r.joint_id === u.joint_id);
        if (row) {
          Object.assign(row, patch);
          store.scheduleFlush();
        } else {
          row = store.insert('joint_states', { joint_id: u.joint_id, rx: 0, ry: 0, rz: 0, ...patch });
        }
        results.push(row);
      }
      return res.status(200).json(results);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API joints error:', err);
    return res.status(500).json({ error: err.message });
  }
}
