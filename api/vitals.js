import store from './store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  await store.init();
  try {
    if (req.method === 'GET') {
      const { limit } = req.query;
      const rows = store.list('vital_signs').sort((a, b) => b.id - a.id).slice(0, limit ? parseInt(limit, 10) : 60);
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { heart_rate, breath_rate, temp_c, spo2, systolic, diastolic } = req.body || {};
      const row = store.insert('vital_signs', {
        heart_rate, breath_rate, temp_c, spo2, systolic, diastolic, created_at: new Date().toISOString(),
      });
      return res.status(201).json(row);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API vitals error:', err);
    return res.status(500).json({ error: err.message });
  }
}
