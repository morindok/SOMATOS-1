import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// SOMATOS-1 self-contained data store.
// Replaces the external Supabase dependency with an embedded store:
//  - persists to a JSON file when the filesystem is writable (local dev / vercel dev)
//  - falls back to in-memory (read-only FS, e.g. production serverless)
// Tables: body_parts, joint_states, vital_signs, sense_logs, ai_commands,
//         api_keys, brain_activity, genome_mutations, genome_traits

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.SOMATOS_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const KEY_FILE = path.join(DATA_DIR, 'AGENT_KEY.txt');

const SEED_JOINTS = [
  'neck', 'jaw', 'spine_T', 'spine_L', 'shoulder_L', 'shoulder_R',
  'elbow_L', 'elbow_R', 'wrist_L', 'wrist_R',
  'hip_L', 'hip_R', 'knee_L', 'knee_R', 'ankle_L', 'ankle_R',
];

const now = () => new Date().toISOString();

class Store {
  constructor() {
    this.tables = {};
    this.sequences = {};
    this.dirty = false;
    this.fsOk = true;
    this.agentKey = null;
    this._loaded = false;
    this._loadPromise = null;
  }

  async init() {
    if (this._loaded) return;
    if (!this._loadPromise) this._loadPromise = this._load();
    await this._loadPromise;
  }

  async _load() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      this.fsOk = false;
    }
    if (this.fsOk) {
      try {
        if (fs.existsSync(DB_FILE)) {
          const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
          this.tables = raw.tables || {};
          this.sequences = raw.sequences || {};
        }
      } catch {
        this.fsOk = false;
      }
    }
    this._seed();
    this._loaded = true;
    if (this.dirty) this._flush();
  }

  _nextId(table) {
    this.sequences[table] = (this.sequences[table] || 0) + 1;
    return this.sequences[table];
  }

  _seed() {
    if (!this.tables.api_keys || this.tables.api_keys.length === 0) {
      const raw = 'som_' + crypto.randomBytes(24).toString('hex');
      this.agentKey = raw;
      this.tables.api_keys = [{
        id: this._nextId('api_keys'),
        label: 'opencode-agent (primary)',
        key_prefix: raw.slice(0, 12) + '...',
        key_hash: crypto.createHash('sha256').update(raw).digest('hex'),
        active: true,
        last_used_at: null,
        created_at: now(),
      }];
      this.dirty = true;
      if (this.fsOk) {
        try {
          fs.writeFileSync(KEY_FILE, raw + '\n', 'utf8');
        } catch { /* read-only fs */ }
      }
    }
    if (!this.tables.joint_states || this.tables.joint_states.length === 0) {
      this.tables.joint_states = SEED_JOINTS.map((joint_id) => ({
        id: this._nextId('joint_states'), joint_id, rx: 0, ry: 0, rz: 0, updated_at: now(),
      }));
      this.dirty = true;
    }
    if (!this.tables.vital_signs || this.tables.vital_signs.length === 0) {
      this.tables.vital_signs = [{
        id: this._nextId('vital_signs'),
        heart_rate: 72, breath_rate: 16, temp_c: 37.0, spo2: 98, systolic: 120, diastolic: 80,
        created_at: now(),
      }];
      this.dirty = true;
    }
    if (!this.tables.ai_commands || this.tables.ai_commands.length === 0) {
      this.tables.ai_commands = [{
        id: this._nextId('ai_commands'),
        source: 'system', command: 'boot', args: { parts: 288 },
        status: 'done', result: 'Body inventory loaded (self-contained store)', latency_ms: 0,
        created_at: now(),
      }];
      this.dirty = true;
    }
    if (!this.tables.sense_logs || this.tables.sense_logs.length === 0) {
      this.tables.sense_logs = [{
        id: this._nextId('sense_logs'),
        channel: 'init', value: 1, unit: 'state',
        detail: { msg: 'SOMATOS-1 embodiment online — sealed chamber, local store' },
        created_at: now(),
      }];
      this.dirty = true;
    }
    for (const t of ['body_parts', 'brain_activity', 'genome_mutations', 'genome_traits']) {
      if (!this.tables[t]) this.tables[t] = [];
    }
  }

  _flush() {
    if (!this.fsOk || !this.dirty) return;
    try {
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ tables: this.tables, sequences: this.sequences }));
      fs.renameSync(tmp, DB_FILE);
      this.dirty = false;
    } catch {
      this.fsOk = false;
    }
  }

  scheduleFlush() {
    this.dirty = true;
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this._flush();
    }, 250);
  }

  table(name) {
    if (!this.tables[name]) this.tables[name] = [];
    return this.tables[name];
  }

  list(name, filterFn) {
    const rows = this.table(name);
    return filterFn ? rows.filter(filterFn) : rows.slice();
  }

  get(name, id) {
    return this.table(name).find((r) => r.id === Number(id)) || null;
  }

  find(name, filterFn) {
    return this.table(name).find(filterFn) || null;
  }

  insert(name, row) {
    const r = { id: this._nextId(name), ...row };
    this.table(name).push(r);
    this.scheduleFlush();
    return r;
  }

  update(name, id, patch) {
    const r = this.get(name, id);
    if (!r) return null;
    Object.assign(r, patch);
    this.scheduleFlush();
    return r;
  }

  updateWhere(name, filterFn, patch) {
    const out = [];
    for (const r of this.table(name)) {
      if (filterFn(r)) { Object.assign(r, patch); out.push(r); }
    }
    if (out.length) this.scheduleFlush();
    return out;
  }

  count(name) {
    return this.table(name).length;
  }

  hashKey(k) {
    return crypto.createHash('sha256').update(String(k)).digest('hex');
  }

  verifyKey(raw) {
    if (!raw) return null;
    const h = this.hashKey(raw);
    const row = this.find('api_keys', (r) => r.key_hash === h && r.active);
    if (row) {
      // throttle last_used_at writes: don't churn the store on hot polling
      const nowMs = Date.now();
      if (!row._lastUsedMs || nowMs - row._lastUsedMs > 60000) {
        row._lastUsedMs = nowMs;
        row.last_used_at = now();
        this.scheduleFlush();
      }
    }
    return row;
  }
}

const store = new Store();
export default store;
export { now };
