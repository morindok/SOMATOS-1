import store from './store.js';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();
  try {
    if (req.method === 'GET') {
      const rows = store.list('api_keys')
        .map(({ key_hash, ...rest }) => rest)
        .sort((a, b) => b.id - a.id);
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { label } = req.body || {};
      const raw = 'som_' + crypto.randomBytes(24).toString('hex');
      const row = store.insert('api_keys', {
        label: label || 'opencode-agent',
        key_prefix: raw.slice(0, 12) + '...',
        key_hash: store.hashKey(raw),
        active: true, last_used_at: null, created_at: new Date().toISOString(),
      });
      const { key_hash, ...safe } = row;
      return res.status(201).json({ ...safe, key: raw, note: 'This key is shown only once. Store it in your AI agent.' });
    }
    if (req.method === 'DELETE') {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'id is required' });
      const row = store.update('api_keys', id, { active: false });
      if (!row) return res.status(404).json({ error: 'key not found' });
      return res.status(200).json({ id: row.id, active: row.active });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API keys error:', err);
    return res.status(500).json({ error: err.message });
  }
}
