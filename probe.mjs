// Diagnostic probe: mimics the browser (HMR websocket + API polling) and
// reports every vite HMR message for 60s. Run: node probe.mjs
import WebSocket from 'ws';

const BASE = 'http://localhost:5173';
const fs = await import('node:fs');
const KEY = fs.readFileSync('data/AGENT_KEY.txt', 'utf8').trim();

const html = await (await fetch(BASE + '/')).text();
const client = await (await fetch(BASE + '/@vite/client')).text();
const m = client.match(/wsToken\s*=\s*"([^"]+)"/);
const token = m ? m[1] : '';
console.log('[probe] hmr token found:', !!token);

const ws = new WebSocket(`ws://localhost:5173/?token=${token}`, 'vite-hmr');
const t0 = Date.now();
let reloads = 0;
ws.on('open', () => console.log('[probe] WS connected'));
ws.on('message', (d) => {
  try {
    const msg = JSON.parse(d.toString());
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    if (msg.type === 'update') {
      for (const u of msg.updates || []) console.log(`[${dt}s] update: ${u.type} ${u.path || ''}`);
    } else if (msg.type === 'full-reload') {
      reloads++;
      console.log(`[${dt}s] *** FULL-RELOAD #${reloads} ***`);
    } else if (msg.type === 'error') {
      console.log(`[${dt}s] *** HMR ERROR: ${JSON.stringify(msg).slice(0, 200)}`);
    } else if (msg.type !== 'ping' && msg.type !== 'pong') {
      console.log(`[${dt}s] ${msg.type}`);
    }
  } catch { /* ignore */ }
});
ws.on('close', (c) => console.log('[probe] WS closed', c));
ws.on('error', (e) => console.log('[probe] WS error:', e.message));

// browser-like polling
const timers = [];
timers.push(setInterval(async () => {
  try { await fetch(BASE + '/api/bridge?action=inbox&limit=5', { headers: { 'X-API-Key': KEY } }); } catch (e) { console.log('[probe] inbox poll fail:', e.message); }
}, 2500));
timers.push(setInterval(async () => {
  try { await fetch(BASE + '/api/genome?action=traits'); } catch (e) { console.log('[probe] traits poll fail:', e.message); }
}, 4000));
timers.push(setInterval(async () => {
  try {
    await fetch(BASE + '/api/vitals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heart_rate: 72, breath_rate: 16, temp_c: 37, spo2: 98, systolic: 120, diastolic: 80 }) });
    await fetch(BASE + '/api/brain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firing_rate_hz: 3.1, bands: { alpha: 0.01, beta: 0.02, gamma: 0.03 } }) });
  } catch (e) { console.log('[probe] vitals/brain post fail:', e.message); }
}, 20000));

setTimeout(() => {
  console.log(`[probe] DONE. full-reloads observed: ${reloads}`);
  ws.close();
  timers.forEach(clearInterval);
  process.exit(0);
}, 60000);
