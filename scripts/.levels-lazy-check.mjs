// A check of the lazy levels (levels.js, levels/manifest.json; profile item 6, 14-Oct): the page has only each level's manifest entry
// until the level is needed, and the level then is exactly what its file says. Headless; the checks elsewhere read the levels
// eagerly (Node), so THIS is the one that runs the page's path (DELIVERY_LAZY_LEVELS=1):
//  - the manifest says what the files say (scripts/level-manifest.mjs), and holds nothing the menu does not read;
//  - before a load a level is its manifest entry (no road), keeps its identity through loadLevel(), and is then the file's own, key
//    for key (JSON.stringify the same), and loadAllLevels() does that for every level, the hidden ones and the screensaver's too;
//  - an event stage (events.js) is its map's copy, made again when the map loads, the same as made from the file in the first place;
//  - a race class chosen before the load is on the race after it (setRaceClass), a stage's copy never has it;
//  - a replay's level fingerprint (replay.js) is taken as the level loads, and is the same as when every level is read at once;
//  - Game.start() on a level not loaded waits for it and then starts; a run on a lazily loaded level is the run on an eagerly
//    loaded one, step for step (the same seeds: the same state after 20 s, level by level).
//   node scripts/.levels-lazy-check.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { build as buildManifest, KEYS } from './level-manifest.mjs';

const DIGEST = process.argv.includes('--digest');
if (!DIGEST) process.env.DELIVERY_LAZY_LEVELS = '1';
const IDS = ['expressway', 'farm', 'ufo', 'monza', 'passage-du-gois', 'iceroad', 'toys', 'gimmick-road-3'];

if (DIGEST) { // (a child: the state of a few runs, from the levels as this process reads them)
  const { boot } = await import('./delivery-headless.mjs');
  const g = await boot({ ownAll: true });
  const out = {};
  for (const id of IDS) {
    const level = g.select(id);
    await g.levels.loadLevel(level);
    g.Game.evil = false;
    g.Game.nextSeed = 1234; g.Game.nextLoadSeed = 5678;
    g.Game.start();
    g.drive(1, 0);
    g.run(20);
    const n = [g.Game.time, g.Game.state, g.Player.s, g.Player.lat, g.Player.speed, g.Player.health, g.Game.cash, g.Game.busts];
    for (const c of g.Traffic.cars) if (c.active) n.push(c.kind, c.s, c.lat);
    for (const o of g.Collision.obstacles) if (!o.gone) n.push(o.s, o.lat);
    out[id] = n.map(x => typeof x === 'number' ? Math.round(x * 1000) / 1000 : x).join(' ');
  }
  await g.close();
  console.log(JSON.stringify(out));
  process.exit(0);
}

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const dir = new URL('../src/delivery/levels/', import.meta.url);
const file = (slug) => JSON.parse(readFileSync(new URL(slug + '.json', dir), 'utf8'));
const slugs = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'manifest.json').map(f => f.slice(0, -5));

check(readFileSync(new URL('manifest.json', dir), 'utf8') === buildManifest(), 'levels/manifest.json matches the level files (node scripts/level-manifest.mjs writes it)');
const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));
check(Object.keys(manifest).length === slugs.length && slugs.every(s => manifest[s]?.id === file(s).id), 'one manifest entry per level file (' + slugs.length + ')');
check(Object.values(manifest).every(m => Object.keys(m).every(k => KEYS.includes(k))), 'an entry holds only the listed fields');
check(Object.values(manifest).every(m => !('segments' in m) && !('pickups' in m) && !('obstacles' in m)), 'no road, pickups or obstacles in the manifest');

// ---- the levels as the page has them -----------------------------------------------------------------------------
const { logicServer } = await import('./delivery-headless.mjs');
const element = () => ({ classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = globalThis.window || { addEventListener() {}, dispatchEvent() {} };
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: '' };
const kept = new Map();
globalThis.localStorage = { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => { kept.set(k, String(v)); }, removeItem: (k) => { kept.delete(k); } };
const server = await logicServer();
const eagerOf = async () => { // (the same modules read eagerly, as in Node otherwise: a second server, the flag off while it loads)
  delete process.env.DELIVERY_LAZY_LEVELS;
  const other = await logicServer();
  try { const levels = await other.ssrLoadModule('/src/delivery/levels.js'), events = await other.ssrLoadModule('/src/delivery/events.js');
    return { json: Object.fromEntries([...levels.LEVELS, ...Object.values(levels.HIDDEN_LEVELS), ...events.STAGE_LEVELS].map(l => [l.id, JSON.stringify(l)])), lists: Object.fromEntries(['LEVELS', 'RACE_LEVELS', 'DELIVERY_LEVELS'].map(k => [k, levels[k].map(l => l.id)])) };
  } finally { process.env.DELIVERY_LAZY_LEVELS = '1'; await other.close(); }
};
const levels = await server.ssrLoadModule('/src/delivery/levels.js');
const events = await server.ssrLoadModule('/src/delivery/events.js');
const cargo = await server.ssrLoadModule('/src/delivery/cargo.js');
const { LEVELS, HIDDEN_LEVELS, SCREENSAVER_LEVEL, loadLevel, levelLoaded, loadAllLevels, setRaceClass } = levels;
const builtin = [...LEVELS, ...Object.values(HIDDEN_LEVELS), SCREENSAVER_LEVEL];
const stages = events.STAGE_LEVELS;
check(builtin.length === slugs.length, 'the lists hold every level file once (' + builtin.length + ')');

check(builtin.every(l => !levelLoaded(l)), 'nothing is loaded at the start');
const idsOf = (l) => Object.keys(l);
check(builtin.every(l => !('segments' in l) && idsOf(l).every(k => KEYS.includes(k))), 'a level not loaded is its manifest entry: no road');
check(LEVELS.filter(l => l.laps).length === 6 && levels.RACE_LEVELS.length === 6, 'the races are known (laps) before any load: ' + levels.RACE_LEVELS.map(l => l.id).join(', '));
check(stages.length > 0 && stages.every(l => !levelLoaded(l) && l.stage && !('segments' in l)), 'the event stages (' + stages.length + ') are the manifest\'s copies and not loaded either');

const firstCargo = Object.fromEntries(LEVELS.map(l => [l.id, [cargo.cargoFor(l, false)?.id, cargo.cargoFor(l, true)?.id]]));

// a race class chosen before the load
setRaceClass('gt');
const circuit = LEVELS.find(l => l.id === 'monza');
check(circuit.car === 'gt' && circuit.grid.kind === 'gt', 'setRaceClass reaches a race not loaded yet');

// one level, by its identity
const pick = LEVELS.find(l => l.id === 'farm'), same = pick;
const p = loadLevel(pick);
check(p instanceof Promise && !levelLoaded(pick), 'loadLevel is asked: not here yet');
check((await p) === same && levelLoaded(pick) && pick === same, 'loadLevel gives the same object back, loaded');
check(JSON.stringify(pick) === JSON.stringify(file('farm')), 'a loaded level is its file, key for key (farm)');
check(LEVELS.filter(l => levelLoaded(l)).length === 1, 'and no other level was loaded by it');
check((await loadLevel(pick)) === pick, 'asking again gives the level again');
await loadLevel(circuit);
check(circuit.car === 'gt' && circuit.grid.kind === 'gt' && circuit.grid.count === file('monza').grid.count && circuit.laps === 3, 'the race class is on the race after it loads (Monza: gt, its grid kept)');
setRaceClass('f1');
check(circuit.car === 'f1' && circuit.grid.kind === 'f1', 'and setRaceClass changes a loaded one');
const stageOfMonza = stages.find(l => l.stage.map === 'monza');
if (stageOfMonza) check(levelLoaded(stageOfMonza) && stageOfMonza.car !== 'gt', 'a stage made on a race has the file\'s own car, not the class\'s');

// a stage waits for its map, and is made again with it
const stage = stages.find(l => !levelLoaded(l) && l.stage.map !== 'monza');
const mapOf = (s) => LEVELS.find(l => l.id === s.stage.map) || Object.values(HIDDEN_LEVELS).find(l => l.id === s.stage.map);
check(!!stage && !levelLoaded(mapOf(stage)), 'a stage whose map is not loaded: ' + stage?.id + ' on ' + stage?.stage.map);
await loadLevel(stage);
check(levelLoaded(stage) && levelLoaded(mapOf(stage)) && Array.isArray(stage.segments) && stage.stage.map === mapOf(stage).id, 'loadLevel(stage) loads the map and the stage has its road');

// a level that is not a built-in's is whole already
const custom = { id: 'custom', segments: [{ length: 100, curve: 0 }] };
check(levelLoaded(custom) && (await loadLevel(custom)) === custom, 'a level that is no built-in\'s (the editor\'s, a copy) is loaded already');

// everything
await loadAllLevels();
check(builtin.every(l => levelLoaded(l)) && stages.every(l => levelLoaded(l)), 'loadAllLevels loads every level, the hidden ones and the stages too');
setRaceClass('f1');
const eager = await eagerOf();
const diff = [];
for (const l of [...builtin.filter(l => l !== SCREENSAVER_LEVEL), ...stages]) if (eager.json[l.id] !== undefined && JSON.stringify(l) !== eager.json[l.id]) diff.push(l.id);
check(!diff.length, 'every level and stage, once loaded, is the object the eager reading gives, byte for byte' + (diff.length ? ': ' + diff.join(' ') : ''));
check(JSON.stringify(LEVELS.map(l => l.id)) === JSON.stringify(eager.lists.LEVELS) && JSON.stringify(levels.RACE_LEVELS.map(l => l.id)) === JSON.stringify(eager.lists.RACE_LEVELS), 'the lists are in the same order');
check(JSON.stringify(Object.fromEntries(LEVELS.map(l => [l.id, [cargo.cargoFor(l, false)?.id, cargo.cargoFor(l, true)?.id]]))) === JSON.stringify(firstCargo), 'cargo is dealt the same before and after loading');

await server.close();

// the replay's fingerprints (replay.js): taken as a level loads; a replay of a level not loaded yet is told to wait, not that the level is gone
{
  const fresh = await logicServer();
  const L = await fresh.ssrLoadModule('/src/delivery/levels.js'), R = await fresh.ssrLoadModule('/src/delivery/replay.js'), V = await fresh.ssrLoadModule('/src/delivery/version.js');
  const rec = (id) => ({ format: 1, header: { logic: V.BUILD.logic, level: id, levelPrint: 'x' } });
  check(/still loading/.test(R.Replay.check(rec('farm')).why), 'a replay of a level not loaded yet: "still loading" (and its load is begun)');
  check(/no longer in the game/.test(R.Replay.check(rec('no-such-level')).why), 'a replay of no level: "no longer in the game"');
  await L.loadLevel(L.LEVELS.find(l => l.id === 'farm'));
  check(/has changed/.test(R.Replay.check(rec('farm')).why), 'once the level is here its fingerprint is known (a wrong one: "has changed")');
  await fresh.close();
}

// ---- a start on a level not loaded; then runs, lazy and eager, step for step -------------------------------------------
{
  const { boot } = await import('./delivery-headless.mjs');
  const g = await boot({ ownAll: true });
  const level = g.select('suburbs');
  check(!g.levels.levelLoaded(level), 'a fresh page: suburbs is not loaded');
  g.Game.start();
  check(g.Game.state !== 'playing', 'Game.start() on a level not loaded does not start yet');
  await g.levels.loadLevel(level);
  await new Promise(r => setTimeout(r, 20));
  check(g.Game.state === 'playing' && g.Game.loaded === level && g.track.Track.length > 1000, 'it starts once the level is here (the road is ' + Math.round(g.track.Track.length) + ' m)');
  g.select('expressway'); g.Game.start(); const other = g.levels.LEVEL;
  g.select('back-roads'); // (the pick moved on while it loaded: that start is not made)
  await g.levels.loadLevel(other); await new Promise(r => setTimeout(r, 20));
  check(g.levels.LEVEL.id === 'back-roads', 'a start for a pick that was changed meanwhile is not made for the new one without its own ask');
  await g.close();
}
const run = (lazy) => {
  const env = { ...process.env }; if (lazy) env.DELIVERY_LAZY_LEVELS = '1'; else delete env.DELIVERY_LAZY_LEVELS;
  const r = spawnSync(process.execPath, [new URL(import.meta.url).pathname, '--digest'], { env, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.log(r.stdout, r.stderr); return null; }
  return JSON.parse(r.stdout.trim().split('\n').pop());
};
const a = run(false), b = run(true);
for (const id of IDS) check(a && b && a[id] === b[id] && a[id].length > 40, 'a 20 s run on ' + id + ' is the same lazy and eager (' + (a?.[id] || '').split(' ').length + ' numbers)');

console.log(failures ? failures + ' FAILED' : 'all lazy-level checks passed');
process.exit(failures ? 1 : 0);
