// A headless check of the level schema (src/delivery/levelSchema.js), in seconds:
//   - every field used by every level in src/delivery/levels/ is in the schema;
//   - every field documented at the top of levels.js is in the schema (and the schema has none that is not);
//   - every level's values pass the schema (shapes, types, ranges, choices) and keep its rules;
//   - every level goes through the editor's load and save (loadLevel, saveLevel) and comes out as it went in,
//     and every setting of every entry read and written back, as the editor's forms do, changes nothing;
//   - a new entry of every placed field (what a place-button makes) passes the schema;
//   - the schema's own lists agree with the game's (the pickup types with render/pickupModels.js).
//   node scripts/.schema-check.mjs [--list]      (--list: every field, its shape and its settings)
import { readFileSync, readdirSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failed = 0;
const fail = (text) => { failed++; console.log('FAIL ' + text); };
try {
  const S = await g.load('levelSchema.js');
  const { FIELDS } = S;
  const dir = 'src/delivery/levels/';
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  // (each as the level editor opens it: with its name and description in it, which for most are kept in
  // levelText.json and not in the level's file: withWords. So "name" is still a field every level needs)
  const { withWords } = await g.load('levelText.js');
  const levels = files.map(f => [f, withWords(JSON.parse(readFileSync(dir + f, 'utf8')))]);

  // ---- every field used is in the schema ----
  const used = new Map();
  for (const [f, level] of levels) for (const k of Object.keys(level)) used.set(k, [...(used.get(k) || []), f]);
  for (const [k, where] of used) if (!FIELDS[k]) fail('"' + k + '" (used by ' + where.slice(0, 4).join(', ') + ') is not in the schema');

  // ---- every field documented in levels.js is in the schema ----
  const head = readFileSync('src/delivery/levels.js', 'utf8').split(/\r?\n/);
  const documented = new Set();
  for (const line of head) {
    if (/^import /.test(line)) break;
    const m = /^\/\/ {3}([A-Za-z]+)((?:, [A-Za-z]+)*) /.exec(line);
    if (m) for (const name of [m[1], ...m[2].split(', ').filter(Boolean)]) documented.add(name);
  }
  for (const k of documented) if (!FIELDS[k]) fail('"' + k + '" is documented in levels.js but not in the schema');
  for (const k of Object.keys(FIELDS)) if (!documented.has(k)) fail('"' + k + '" is in the schema but not documented in levels.js');
  for (const gone of ['tolls', 'averageCameras']) if (FIELDS[gone]) fail('"' + gone + '" is no longer in the game');

  // ---- every level passes the schema ----
  let entries = 0, settings = 0;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const [f, level] of levels) {
    for (const p of S.checkLevel(level)) fail(f + ': ' + p.text);
    // ---- ...and comes through the editor's load and save as it went in ----
    const back = S.saveLevel(S.loadLevel(level));
    if (!same(back, level)) fail(f + ': changed by loading and saving it');
    // (and with its forms: each setting read and written back)
    const work = S.loadLevel(level);
    for (const [key, def] of Object.entries(FIELDS)) {
      if (work[key] === undefined || !def.settings) continue;
      const list = S.isList(def) ? work[key] : [work[key]];
      for (const e of list) {
        if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
        entries++;
        for (const [k, T] of Object.entries(def.settings)) { settings++; S.writeSetting(e, k, T, S.readSetting(e, k)); }
      }
    }
    if (!same(S.saveLevel(work), level)) fail(f + ': changed by reading and writing its settings');
  }

  // ---- a new entry of every placed field passes the schema ----
  const base = { id: 'x', name: 'x', clock: { good: 100, evil: 80 }, traffic: {}, lanes: 4, segments: [{ length: 3000, curve: 0 }], amphibious: true };
  let made = 0;
  for (const [key, def] of Object.entries(FIELDS)) {
    if (!S.isPlaced(def)) {
      const v = S.makeValue(key);
      for (const p of S.checkLevel({ ...base, [key]: v }, { rules: false })) fail('a new "' + key + '" (' + JSON.stringify(v) + '): ' + p.text);
      continue;
    }
    const subs = def.sub ? def.settings[def.sub].choices.map(S.choiceValue) : [undefined];
    for (const sub of subs) {
      const e = S.makeEntry(key, { s: 1000, x: 50, z: 1000 }, { laneNumber: 2, lane: 2, sub, length: 3000 });
      made++;
      for (const p of S.checkLevel({ ...base, [key]: S.isList(def) ? [e] : e }, { rules: false })) fail('a new ' + key + (sub ? ' (' + sub + ')' : '') + ' ' + JSON.stringify(e) + ': ' + p.text);
      if (!S.placeOf(def, e)) fail('a new ' + key + ' has no place: ' + JSON.stringify(e));
    }
  }

  // ---- the schema's own lists against the game's ----
  const colours = /export const PICKUP_COLOR = \{([\s\S]*?)\};/.exec(readFileSync('src/delivery/render/pickupModels.js', 'utf8'));
  const drawn = colours ? [...colours[1].matchAll(/([A-Za-z0-9]+):/g)].map(m => m[1]) : [];
  for (const t of drawn) if (!S.PICKUP_TYPES.includes(t)) fail('pickup "' + t + '" (render/pickupModels.js) is not in the schema\'s PICKUP_TYPES');
  for (const t of S.PICKUP_TYPES) if (!drawn.includes(t)) fail('pickup "' + t + '" (PICKUP_TYPES) has no colour in render/pickupModels.js');
  for (const [key, def] of Object.entries(FIELDS)) {
    if (!S.GROUPS[def.group]) fail(key + ': no group called "' + def.group + '"');
    for (const r of def.rules || []) if (!S.RULES[r]) fail(key + ': no rule called "' + r + '"');
    if (!def.help || !def.label) fail(key + ': needs a label and a line of help');
  }

  const shapes = {};
  for (const def of Object.values(FIELDS)) shapes[def.shape] = (shapes[def.shape] || 0) + 1;
  const count = (list) => Object.values(FIELDS).reduce((n, def) => n + Object.keys(def.settings || {}).length, 0);
  console.log(`${Object.keys(FIELDS).length} fields in the schema (${Object.entries(shapes).map(([k, n]) => n + ' ' + k).join(', ')}), ${count()} settings; ` +
    `${used.size} fields used by ${levels.length} levels, ${documented.size} documented in levels.js`);
  console.log(`${levels.length} levels checked and round-tripped (${entries} entries, ${settings} settings read and written back); ${made} new entries made and checked`);
  if (process.argv.includes('--list')) {
    for (const [key, def] of Object.entries(FIELDS)) {
      console.log(`  ${key.padEnd(16)} ${(def.shape + (def.single ? ' (one)' : '')).padEnd(14)} ${S.GROUPS[def.group].padEnd(32)} ${def.road === 'both' ? 'side ok ' : '        '}${Object.keys(def.settings || {}).join(', ')}${(def.rules || []).length ? '   [' + def.rules.join(', ') + ']' : ''}`);
    }
  }
} catch (e) {
  fail('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'schema check passed');
process.exit(failed ? 1 : 0);
