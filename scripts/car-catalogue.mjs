// A WARNING script (always exit code 0; run by hand; in no test group): checks CARS-CATALOGUE.md against the game.
//   node scripts/car-catalogue.mjs           the report: ids in the game missing from the file, ids in the file that no
//                                            longer exist, names that differ, and possible NEAR-DUPLICATES
//   node scripts/car-catalogue.mjs --rows    also prints ready-to-paste rows (id | name | ? | ?) for the missing ids
//   node scripts/car-catalogue.mjs --table   prints the id / name / group columns of every car in the game (regenerated)
// The file's tables are each preceded by `<!-- group:NAME -->` (CARS FILLER BESPOKE EVENT EARNED SECRET LEVEL TRAFFIC IDEA
// PLANNED). Only data is loaded (cars.js, ideas.js, config.js) through Vite, no renderer. It is not a hard check: new cars land
// on parallel branches, and a failing check would conflict; the orchestrator runs it after a merge.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const element = () => ({ classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false }) };
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: '' };
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

// ---- the game, by group
const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'error', root,
  server: { middlewareMode: true, ws: false, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  cacheDir: join(tmpdir(), 'delivery-vite-' + process.pid + '-' + Date.now().toString(36)),
});
const game = {}; // group -> Map(id -> name)
try {
  const cars = await server.ssrLoadModule('/src/delivery/cars.js');
  const ideas = await server.ssrLoadModule('/src/delivery/ideas.js');
  const config = await server.ssrLoadModule('/src/delivery/config.js');
  const put = (group, list) => { const m = game[group] ||= new Map(); for (const c of list) if (c) m.set(c.id, c.name); };
  put('CARS', cars.CARS); put('FILLER', cars.FILLER_CARS); put('BESPOKE', cars.BESPOKE_CARS); put('EVENT', cars.EVENT_CARS);
  put('EARNED', cars.EARNED_CARS); put('SECRET', Object.values(cars.SECRET_CARS));
  put('LEVEL', [...Object.values(cars.LEVEL_CARS), cars.AMPHIBIOUS_TANK]); put('IDEA', ideas.IDEA_CARS);
  put('TRAFFIC', Object.keys(config.CONFIG.vehicles).map(k => ({ id: k, name: k })));
} finally { await server.close(); }

if (args.includes('--table')) {
  console.log('| group | id | name |\n|---|---|---|');
  for (const [g, m] of Object.entries(game)) for (const [id, name] of m) console.log(`| ${g} | ${id} | ${name} |`);
}

// ---- the file
const file = readFileSync(join(root, 'CARS-CATALOGUE.md'), 'utf8');
const rows = []; // { group, id, name, text, src, line }
let group = null;
file.split('\n').forEach((line, i) => {
  const g = line.match(/^<!--\s*group:(\w+)\s*-->/);
  if (g) { group = g[1]; return; }
  if (!line.startsWith('|') || !group) return;
  if (/^\|\s*(id|---)/.test(line)) return;
  const cells = line.split('|').slice(1, -1).map(s => s.trim());
  const id = (cells[0].match(/^`([^`]+)`$/) || [])[1] || null;
  rows.push({ group, id, name: cells[1], text: cells[2] || '', src: cells[3] || '', line: i + 1 });
});
for (const g of Object.keys(game)) if (!rows.some(r => r.group === g)) console.log(`WARNING: no table tagged group:${g} in CARS-CATALOGUE.md`);

let problems = 0;
const warn = (s) => { problems++; console.log('  ' + s); };
console.log('Missing from CARS-CATALOGUE.md (in the game):');
const missing = [];
for (const [g, m] of Object.entries(game)) for (const [id, name] of m) if (!rows.some(r => r.group === g && r.id === id)) { missing.push({ g, id, name }); warn(`${g}: ${id} (${name})`); }
if (!missing.length) console.log('  none');
console.log('In CARS-CATALOGUE.md but no longer in the game:');
let gone = 0;
for (const r of rows) if (r.id && game[r.group] && !game[r.group].has(r.id)) { gone++; warn(`${r.group}: ${r.id} (line ${r.line})`); }
if (!gone) console.log('  none');
console.log('Listed more than once in a group, or in two groups:');
let dup = 0;
const seen = new Map();
for (const r of rows) if (r.id && r.group !== 'TRAFFIC') { const k = r.id; if (seen.has(k) && !(seen.get(k).group === 'EARNED' && r.group === 'LEVEL')) { dup++; warn(`${r.id}: lines ${seen.get(k).line} and ${r.line}`); } else seen.set(k, r); }
if (!dup) console.log('  none');
console.log('Names that differ from the game:');
let diff = 0;
for (const r of rows) if (r.id && game[r.group]?.has(r.id) && r.group !== 'TRAFFIC' && game[r.group].get(r.id) !== r.name) { diff++; warn(`${r.id}: file "${r.name}", game "${game[r.group].get(r.id)}"`); }
if (!diff) console.log('  none');
const inferred = rows.filter(r => /^inferred/.test(r.src)).length;
console.log(`Rows: ${rows.length} (${inferred} inferred). By group: ` + [...new Set(rows.map(r => r.group))].map(g => `${g} ${rows.filter(r => r.group === g).length}`).join(', '));

// ---- near-duplicates: rows sharing a real-world inspiration keyword. The keywords are the words of the part of the
// "inspired by" cell before " - " (the real vehicle), less the generic words below. Traffic kinds and earned rows
// (a level vehicle or a garage car in another livery) are skipped; a group of rows is reported once, under its first keyword.
const STOP = new Set(('the with from that this have into like only more less than also what real vehicle type model class series early late ' +
  'modern classic generic small large tiny long short high lorry truck van wagon estate saloon coupe coupé hatch hatchback car cars ' +
  'cab pickup racer bus coach boat sports sport road concept show roadster convertible hardtop saloon unnamed named make makes ' +
  'inferred looks look laurel livery garage level earned name century american british japanese swedish german french italian aussie ' +
  'gear land trim full style yellow flying formula eight electric cruiser compact amphibious mans mans prototype').split(' '));
const words = (r) => {
  const head = r.text.split(' - ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\([^)]*no (make|model)[^)]*\)/g, ' ');
  return new Set(head.split(/[^a-z0-9]+/).filter(w => (w.length >= 4 || /^\d{3}$/.test(w)) && !STOP.has(w) && !/^(19|20)\d\ds?$/.test(w)));
};
const cand = rows.filter(r => r.group !== 'TRAFFIC' && r.group !== 'EARNED' && !/laurel livery/.test(r.text));
const index = new Map();
for (const r of cand) for (const w of words(r)) (index.get(w) || index.set(w, []).get(w)).push(r);
console.log('Possible NEAR-DUPLICATES (rows sharing a real-world inspiration keyword; check by eye, many are harmless):');
const pairs = new Set();
let n = 0;
for (const [w, list] of [...index].sort((a, b) => a[0].localeCompare(b[0]))) {
  const uniq = [...new Map(list.map(r => [r.group + r.name, r])).values()];
  if (uniq.length < 2 || uniq.length > 6) continue;
  const key = uniq.map(r => r.name).sort().join('|');
  if (pairs.has(key)) { continue; } pairs.add(key);
  n++;
  console.log(`  "${w}": ` + uniq.map(r => `${r.name} [${r.id || 'in progress'}]`).join('  ~  '));
}
if (!n) console.log('  none');
if (args.includes('--rows') && missing.length) {
  console.log('\nRows to paste (fill in the inspiration and the source; the group tag says which table):');
  for (const m of missing) console.log(`<!-- group:${m.g} --> | \`${m.id}\` | ${m.name} | ? - ? | ? |`);
}
console.log(problems ? `\n${problems} warning(s). (Exit code is 0 anyway: this is not a check.)` : '\nThe file and the game agree.');
process.exit(0);
