import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Dev middleware: mounts the Vercel-style /api handlers inside the Vite dev
// server so `npm run dev` works fully offline (no Supabase, no vercel dev).
// Handlers are plain (req, res) functions; we adapt Node's ServerResponse
// with res.status(...).json(...) and parse JSON bodies for them.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function adapt(handler) {
  return async (req, res, next) => {
    if (!req.url.startsWith('/api/')) return next();
    try {
      const u = new URL(req.url, 'http://localhost');
      req.query = Object.fromEntries(u.searchParams);
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        req.body = await readBody(req);
      } else {
        req.body = {};
      }
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (obj) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(obj));
        return res;
      };
      await handler(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

const handlers = {};
const handlerCache = {};
function load(name) {
  if (handlers[name]) return handlers[name];
  const file = path.join(__dirname, 'api', name + '.js');
  if (!fs.existsSync(file)) return null;
  // fresh import per process is fine; store.js is a singleton module
  handlers[name] = handlerCache[file] || (handlerCache[file] = import(pathToFileURL(file).href).then((m) => m.default));
  return handlers[name];
}

export function somatosApiDev() {
  return {
    name: 'somatos-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        const u = new URL(req.url, 'http://localhost');
        // Special route: /api/bridge/direct — instant server-side execution
        if (u.pathname === '/api/bridge/direct') {
          const { directHandler } = await import('./api/bridge.js');
          return adapt(directHandler)(req, res, next);
        }
        const name = u.pathname.replace(/^\/api\//, '').replace(/\.js$/, '');
        const h = await load(name);
        if (!h) { res.statusCode = 404; res.end(JSON.stringify({ error: 'no such api: ' + name })); return; }
        adapt(h)(req, res, next);
      });
      // announce the agent key once so the external AI can self-authenticate
      setTimeout(async () => {
        try {
          const store = await import('./api/store.js');
          await store.default.init();
          const keyFile = path.join(__dirname, 'data', 'AGENT_KEY.txt');
          if (fs.existsSync(keyFile)) {
            console.log('[somatos] agent API key available at data/AGENT_KEY.txt');
          }
        } catch { /* ignore */ }
      }, 100);
    },
  };
}
