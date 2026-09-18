import { readFileSync } from 'node:fs';

// parse .env (no logging of values)
const env = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const { ANATOMY_PARTS, JOINTS } = await import('/tmp/anatomy.mjs');
console.log('parts:', ANATOMY_PARTS.length, 'joints:', JOINTS.length);

async function post(table, rows) {
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  console.log(`inserted ${rows.length} -> ${table}`);
}

// body_parts in batches of 100
for (let i = 0; i < ANATOMY_PARTS.length; i += 100) {
  await post('body_parts', ANATOMY_PARTS.slice(i, i + 100));
}
await post('joint_states', JOINTS.map((j) => ({ joint_id: j.joint_id, rx: 0, ry: 0, rz: 0 })));
await post('vital_signs', [{ heart_rate: 72, breath_rate: 16, temp_c: 37.0, spo2: 98, systolic: 120, diastolic: 80 }]);
await post('sense_logs', [
  { channel: 'init', value: 1, unit: 'state', detail: { msg: 'SOMATOS-1 embodiment online — sealed chamber' } },
]);
await post('ai_commands', [
  { source: 'system', command: 'boot', args: { parts: ANATOMY_PARTS.length }, status: 'done', result: 'Body inventory loaded', latency_ms: 0 },
]);
console.log('SEED DONE');
