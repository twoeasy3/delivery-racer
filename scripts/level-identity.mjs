// What every level IS once loaded, as one fingerprint each, to prove a change to how levels load changes no level.
//   node scripts/level-identity.mjs [--root=<a checkout of the game>] [--lazy] [--out=<file>]
// Loads src/delivery/levels.js and events.js of that checkout (default: this one) headlessly and prints a sha256 of
// JSON.stringify of: every level of every list (LEVELS, HIDDEN_LEVELS, the screensaver's), every event stage's level, their
// cargo for both sides, their labels, and the order of the lists. --lazy: levels.js's lazy path (DELIVERY_LAZY_LEVELS=1),
// then loadAllLevels(); a checkout from before the lazy levels has no such path and is read as it is. Two runs that print the
// same lines loaded the same levels. Diff them: `node scripts/level-identity.mjs --root=<old> > a; node scripts/level-identity.mjs --lazy > b; diff a b`
import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (name) => process.argv.find(a => a.startsWith('--' + name + '='))?.slice(name.length + 3);
const root = resolve(arg('root') || '.');
if (process.argv.includes('--lazy')) process.env.DELIVERY_LAZY_LEVELS = '1';
const sha = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex').slice(0, 16);
const element = () => ({ classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {}, dispatchEvent() {}, location: { search: '' } };
const stored = new Map();
globalThis.localStorage = { getItem: (k) => (stored.has(k) ? stored.get(k) : null), setItem: (k, v) => { stored.set(k, String(v)); }, removeItem: (k) => { stored.delete(k); } };
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: '' };
const server = await createServer({ root, configFile: false, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, ws: false, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, cacheDir: join(tmpdir(), 'level-identity-' + process.pid) });
const out = {};
try {
  const L = await server.ssrLoadModule('/src/delivery/levels.js');
  const E = await server.ssrLoadModule('/src/delivery/events.js');
  const C = await server.ssrLoadModule('/src/delivery/cargo.js');
  if (L.loadAllLevels) await L.loadAllLevels();
  const lists = ['LEVELS', 'MAIN_LEVELS', 'SPECIAL_LEVELS', 'AMPHIBIOUS_LEVELS', 'CIRCUIT_LEVELS', 'THEME_LEVELS', 'RACE_LEVELS', 'DELIVERY_LEVELS'];
  for (const name of lists) out['list ' + name] = sha(L[name].map(l => l.id));
  const print = (level) => sha(JSON.stringify(level, (k, v) => (k === 'car' || k === 'grid' ? undefined : v)));
  const all = [...L.LEVELS.map((l, i) => ['menu ' + i + ' ' + l.id, l]), ...Object.entries(L.HIDDEN_LEVELS).map(([id, l]) => ['hidden ' + id, l]),
    ['screensaver', L.SCREENSAVER_LEVEL], ...E.STAGE_LEVELS.map(l => ['stage ' + l.id, l])];
  for (const [name, level] of all) {
    out[name] = sha(level);
    out[name + ' print'] = print(level);
    out[name + ' cargo'] = sha([C.cargoFor(level, false)?.id, C.cargoFor(level, true)?.id]);
    out[name + ' keys'] = sha(Object.keys(level));
  }
  out.labels = sha(L.LEVELS.map((l, i) => L.levelLabel(i)));
  out.events = sha(E.SPECIALS.map(e => [e.id, e.stages.map(s => [s.map, s.level?.id]), (e.days || []).map(d => [d.map, d.level?.id])]));
} finally { await server.close(); }
const text = Object.entries(out).map(([k, v]) => k + '\t' + v).join('\n') + '\n';
if (arg('out')) writeFileSync(arg('out'), text); else process.stdout.write(text);
