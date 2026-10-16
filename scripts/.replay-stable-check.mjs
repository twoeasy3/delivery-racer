// A check that ADDING A CAR OR A LEVEL REFUSES NO REPLAY, and that a change to what a replay used still does (the owner,
// 12-Oct, CHECKLIST 167; scripts/logic-hash.mjs, src/delivery/replay.js "The fingerprints"). Two halves:
//   THE BUILD'S FINGERPRINT (scripts/logic-hash.mjs, as vite.config.js takes it), on the rules files as they are with an
//   edit made in memory (nothing on disk is touched): a car added (to the blueprint cars, as a key car, as an idea:
//   its row, its ECU table, its tables by id), a level added (its file imported, filed as hidden, put in a menu list)
//   and a comment changed keep it; a change to CONFIG, to the traffic kinds, to code in cars.js / ecu.js / levels.js,
//   or to a table there that is not one car's, moves it. The fingerprint as it was taken until v1.1.149 (`legacy`)
//   moves for every one of them (what the owner saw).
//   THE REPLAY'S OWN PRINTS (replay.js), on a run recorded headless: a car added to the game's lists at run time (a
//   blueprint car, an idea, its ECU table and delivery figure) and another car or level changed keep it playable; the
//   car it used changed (its top speed, its ECU table's row, its delivery figure), the level it used changed, or a car
//   added to the garage's own list (traffic drives those, Car Swap lends one) refuse it. A replay recorded before the
//   prints (no `prints`) plays while the rules are byte for byte the same (legacy), is given the prints once as the
//   kept replays are read, and is refused under other rules.
//   node scripts/.replay-stable-check.mjs
import { readFileSync } from 'node:fs';
import { logicFiles, rulesHash, legacyHash, LOGIC_DIR } from './logic-hash.mjs';
import { boot } from './delivery-headless.mjs';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };

// ---- the build's fingerprint ----
const disk = (file) => readFileSync(LOGIC_DIR + file, 'utf8');
const files = logicFiles();
const base = { rules: rulesHash(files, disk), legacy: legacyHash(files, disk) };
// the fingerprints with some files edited: { 'cars.js': (text) => text', ... } (each edit must change its file)
const edited = (edits) => {
  for (const [file, edit] of Object.entries(edits)) if (edit(disk(file)) === disk(file)) throw new Error('the edit of ' + file + ' changed nothing');
  const read = (file) => edits[file] ? edits[file](disk(file)) : disk(file);
  return { rules: rulesHash(files, read), legacy: legacyHash(files, read) };
};
const after = (text, mark, add) => { if (!text.includes(mark)) throw new Error('not found: ' + mark); return text.replace(mark, mark + add); };
const swap = (text, from, to) => { if (!text.includes(from)) throw new Error('not found: ' + from); return text.replace(from, to); };
const keeps = (what, edits) => {
  const h = edited(edits);
  check(h.rules === base.rules && h.legacy !== base.legacy, what + ': the fingerprint stays ' + h.rules + ' (as it was taken until v1.1.149, whole text: ' + base.legacy + ' -> ' + h.legacy + ')');
};
const moves = (what, edits) => {
  const h = edited(edits);
  check(h.rules !== base.rules, what + ': the fingerprint moves, ' + base.rules + ' -> ' + h.rules);
};
console.log('the build\'s fingerprint (' + files.length + ' rules files): ' + base.rules + ' (as taken until v1.1.149: ' + base.legacy + ')');
try {
  const ecuRow = '{"maxSpeed":30,"accel":10,"health":120,"respawn":5.5,"agility":1,"delivery":1,"composure":1.15,"crossing":0.5,"weight":1}';
  const ecus = (text, id) => swap(text, '\n}', ',\n  "' + id + '": { "x": 5, "ecus": [' + ecuRow + '] }\n}');
  keeps('a blueprint car added (its row, its ECU table, its delivery figure and composure bump)', {
    'cars.js': (t) => after(t, 'export const FILLER_CARS = [', "\n  filler(2, { id: 'zzdummy', name: 'Dummy', basedOn: 'nothing', model: 'woody', color: 0x123456, evilColor: 0x654321,\n    hw: 0.9, hl: 2.4, height: 1.6, maxSpeed: 30, accel: 10, agility: 1, crossing: 0.5, health: 120, mass: 1, sound: 'wagon' }),"),
    'ecus.json': (t) => ecus(t, 'zzdummy'),
    'ecu.js': (t) => after(after(t, 'export const DELIVERY = {', " zzdummy: 1.1,"), '  bump: {', '\n    zzdummy: 0.1,'),
  });
  keeps('a key car added (a Bespoke row by its helper, its key model and star rating)', {
    'cars.js': (t) => after(after(after(t, 'export const BESPOKE_CARS = [', "\n  bespoke({ id: 'zzkey', name: 'Key Dummy', model: 'sport', color: 0x111111, evilColor: 0x222222, hw: 1, hl: 2.2, height: 1.2, maxSpeed: 44, accel: 17, health: 180 }),"),
      'const KEY_STYLE = {', " zzkey: 'wheel',"), 'const KEY_RATING = {', ' zzkey: 4,'),
    'ecus.json': (t) => ecus(t, 'zzkey'),
  });
  keeps('a car idea added', { 'ideas.js': (t) => after(t, 'export const IDEA_CARS = [', "\n  { id: 'zzidea', name: 'Idea Dummy', basedOn: 'nothing', model: 'bug', color: 0x333333, evilColor: 0x444444, hw: 0.8, hl: 2, height: 1.5, maxSpeed: 28, accel: 9, health: 100 },") });
  keeps('a car added to the garage\'s list (the build keeps it; the replay\'s roster print below refuses)', {
    'cars.js': (t) => after(t, 'export const CARS = [', "\n  { id: 'zzgarage', tier: 1, name: 'Garage Dummy', price: 10, color: 0x101010, evilColor: 0x202020, model: 'commuter', maxSpeed: 24, accel: 10, crossing: 0.6, health: 85, hw: 0.85, hl: 1.85, height: 1.45 },"),
  });
  keeps('the top speed of a car changed (the build keeps it; the replays of THAT car are refused by their car print below)', { 'cars.js': (t) => swap(t, "{ id: 'junker', tier: 1, name: 'Junker', price: 30, color: 0x6b7343, evilColor: 0x6f6c66, fixedLivery: true, model: 'junker',\n    maxSpeed: 25,", "{ id: 'junker', tier: 1, name: 'Junker', price: 30, color: 0x6b7343, evilColor: 0x6f6c66, fixedLivery: true, model: 'junker',\n    maxSpeed: 26,") });
  keeps('a hidden level added (its file imported, filed in HIDDEN_LEVELS)', {
    'levels.js': (t) => after(t, "HIDDEN_LEVELS['metro-run'] = metroRun;", "\nimport zzLevel from './levels/zz-level.json';\nHIDDEN_LEVELS['zz-level'] = zzLevel;\nObject.assign(HIDDEN_LEVELS, { 'zz-level-2': zzLevel });"),
  });
  keeps('a menu level added (imported, put at the end of THEME_LEVELS)', { 'levels.js': (t) => after(after(t, "import monsoon from './levels/monsoon.json';", "\nimport zzMenu from './levels/zz-menu.json';"), '  monsoon, ', '\n  zzMenu,') });
  keeps('a comment changed in config.js and the layout of a line in traffic.js', {
    'config.js': (t) => after(t, '\n', '// (a comment added: comments never count)\n'),
    'traffic.js': (t) => swap(t, 'const GARAGE_TOP = Object.fromEntries(', 'const   GARAGE_TOP   =   Object.fromEntries(\n'),
  });
  moves('CONFIG changed (the garage cars\' pace in traffic)', { 'config.js': (t) => swap(t, 'garagePace: { min: 0.75, max: 0.95 }', 'garagePace: { min: 0.75, max: 0.96 }') });
  moves('a traffic kind added to CONFIG.vehicles', { 'config.js': (t) => after(t, '  vehicles: {', "\n    zztruck: { speed: 0.5, hw: 1, hl: 3, height: 2.5 },") });
  moves('the code of cars.js changed (carStats)', { 'cars.js': (t) => swap(t, 'export const carStats = (car = CAR) => ecuHooks.drive?.(car, lent !== null) ?? car;', 'export const carStats = (car = CAR) => ecuHooks.drive?.(car, lent === null) ?? car;') });
  moves('a table of ecu.js that is no car\'s own changed (the respawn ladder)', { 'ecu.js': (t) => swap(t, 'export const RESPAWN = { first: 5.5, step: 0.5 };', 'export const RESPAWN = { first: 5.5, step: 0.4 };') });
  moves('the composure base by stars changed (a table by tier, not by car)', { 'ecu.js': (t) => swap(t, 'base: { 1: 1.3, 2: 1.15 }', 'base: { 1: 1.3, 2: 1.2 }') });
  moves('the code of levels.js changed (setRaceClass)', { 'levels.js': (t) => swap(t, 'if (!level.grid || level.grid.rival) continue;', 'if (!level.grid) continue;') });
  moves('a rule elsewhere changed (player.js: Car Swap\'s pick)', { 'player.js': (t) => swap(t, 'others[Math.floor(random() * others.length)]', 'others[Math.floor(random() * others.length * 0.99)]') });
  moves('the list of tiers changed (tiers.json, JSON: by its data, not its layout)', { 'tiers.json': (t) => swap(t, '"1": ["expressway","back-roads"', '"1": ["back-roads","expressway"') });
  keeps('tiers.json\'s layout changed only', { 'tiers.json': (t) => swap(t, '"1": ["expressway","back-roads"', '"1": [ "expressway", "back-roads"') });
} catch (error) {
  failures++;
  console.log(error.stack);
}

// ---- the replay's own prints ----
const g = await boot({ ownAll: true });
const { Replay } = await g.load('replay.js');
const { ReplayStore } = await g.load('replaystore.js');
const { BUILD } = await g.load('version.js');
const ecuMod = await g.load('ecu.js');
const ideas = await g.load('ideas.js');
const { Game, Input } = g;
const { CARS, FILLER_CARS, carById } = g.cars;
const { levelPrint, rosterPrint, PRINTS } = Replay.prints;
try {
  // a run of a few seconds on Expressway in the Junker (a garage car, at its max ECU: ownAll), recorded
  Input.fed = null;
  g.select('expressway');
  g.cars.selectCar('junker');
  Game.evil = false;
  Game.nextSeed = 7; Game.nextLoadSeed = 7;
  Game.start();
  g.drive(1, 0);
  for (let i = 0; i < 120 * 8 && Game.state === 'playing'; i++) { Game.update(1 / 120); g.FxQueue.length = 0; }
  Game.toMenu();
  const rec = Replay.last, h = rec?.header || {};
  check(h.prints === PRINTS && h.car === 'junker' && !!h.figures && !!h.roster && h.logic === BUILD.logic, 'a run recorded with the prints: ' + JSON.stringify({ prints: h.prints, logic: h.logic, car: h.car, ecu: h.ecu, carPrint: h.carPrint, figures: h.figures, roster: h.roster, levelPrint: h.levelPrint }));
  const ok = () => Replay.check(rec);
  const plays = (what) => { const c = ok(); check(c.ok, what + ': it plays'); };
  const refused = (what, re) => { const c = ok(); check(!c.ok && re.test(c.why), what + ': refused, "' + c.why + '"'); };
  plays('as recorded');
  const junker = carById('junker'), table = ecuMod.Ecu.table;
  // a car added: a blueprint car, with its ECU table and its delivery figure; an idea
  const dummy = { id: 'zzdummy', name: 'Dummy', tier: 2, evergreen: true, rarity: 'epic', price: 0, model: 'woody', maxSpeed: 30, accel: 10, health: 120 };
  FILLER_CARS.push(dummy);
  table.zzdummy = { x: 5, ecus: [{ maxSpeed: 30, accel: 10, health: 120, respawn: 5.5, agility: 1, delivery: 1, composure: 1.15, crossing: 0.5, weight: 1 }] };
  ecuMod.DELIVERY.zzdummy = 1.1;
  ideas.IDEA_CARS.push({ id: 'zzidea', name: 'Idea Dummy', idea: true, model: 'bug', maxSpeed: 28, accel: 9, health: 100 });
  plays('with a blueprint car (its ECU table, its delivery figure) and a car idea added');
  check(Replay.watch(rec).ok && Game.state === 'playing' && Replay.playing?.rec === rec, '...and starts playing back');
  Game.toMenu();
  // another car changed
  const other = FILLER_CARS.find(c => c.id !== 'zzdummy');
  other.maxSpeed += 1;
  plays('with another car (' + other.id + ', a blueprint car) faster');
  other.maxSpeed -= 1;
  // another level changed: its print is its own
  const tokyo = g.levels.LEVELS.find(l => l.id === 'tokyo'), was = levelPrint(g.levels.LEVELS.find(l => l.id === 'expressway'));
  tokyo.clock = (tokyo.clock || 0) + 1;
  check(levelPrint(g.levels.LEVELS.find(l => l.id === 'expressway')) === was && ok().ok, 'with another level (tokyo) changed: the level\'s own print stays, it plays');
  tokyo.clock -= 1;
  // the car it used changed
  junker.maxSpeed += 1;
  refused('the Junker faster (its row)', /car has changed/);
  junker.maxSpeed -= 1;
  const row = table.junker.ecus[table.junker.ecus.length - 1];
  row.maxSpeed += 1;
  refused('the Junker\'s ECU table faster at the ECU it was driven at (ecus.json)', /car has changed/);
  row.maxSpeed -= 1;
  const delivery = ecuMod.DELIVERY.junker;
  ecuMod.DELIVERY.junker = delivery + 0.1;
  refused('the Junker\'s delivery figure changed (ecu.js DELIVERY)', /car has changed/);
  ecuMod.DELIVERY.junker = delivery;
  plays('all put back');
  // a car added to the garage's own list: traffic drives those, Car Swap lends one
  CARS.push({ id: 'zzgarage', tier: 1, name: 'Garage Dummy', price: 10, model: 'commuter', maxSpeed: 24, accel: 10, health: 85 });
  refused('a car added to the garage\'s list (CARS)', /cars in the garage/);
  CARS.pop();
  const sport = CARS.find(c => c.id === 'sport');
  sport.maxSpeed += 1;
  refused('another garage car faster (it cruises in traffic at its own top speed)', /cars in the garage/);
  sport.maxSpeed -= 1;
  plays('put back');
  // the level it used changed
  const expressway = g.levels.LEVELS.find(l => l.id === 'expressway'), changed = { ...JSON.parse(JSON.stringify(expressway)), clock: (expressway.clock || 0) + 1 };
  const moved = JSON.parse(JSON.stringify(rec));
  check(levelPrint(changed) !== h.levelPrint, 'the level it used, changed (its clock): its print moves');
  moved.header.levelPrint = levelPrint(changed);
  check(/level has changed/.test(Replay.check(moved).why || ''), '...and a replay whose level print is not the level\'s is refused: "' + Replay.check(moved).why + '"');
  // other rules
  const other2 = JSON.parse(JSON.stringify(rec));
  other2.header.logic = 'other';
  check(/updated/.test(Replay.check(other2).why || ''), 'under other rules: refused, "' + Replay.check(other2).why + '"');
  // a replay recorded before the prints: plays while the rules are byte for byte the same (legacy), given the prints as it is read
  const old = JSON.parse(JSON.stringify(rec));
  for (const key of ['prints', 'figures', 'roster']) delete old.header[key];
  old.header.logic = BUILD.legacy;
  check(Replay.check(old).ok, 'one recorded before the prints, its rules the same (legacy ' + BUILD.legacy + '): it plays');
  const older = JSON.parse(JSON.stringify(old));
  older.header.logic = 'old';
  check(/updated/.test(Replay.check(older).why || '') && !Replay.upgrade(older), 'one recorded before the prints under other rules: refused, and not brought up');
  const stored = { v: 1, last: { 'expressway:good': old }, best: {}, saved: [JSON.parse(JSON.stringify(old)), older] };
  g.progress.noSave = false;
  localStorage.setItem('delivery_replays', JSON.stringify(stored));
  ReplayStore.forget();
  const listed = ReplayStore.list('expressway');
  const back = JSON.parse(localStorage.getItem('delivery_replays'));
  const up = (r) => r.header.prints === PRINTS && r.header.logic === BUILD.logic && r.header.figures === h.figures && r.header.roster === h.roster;
  check(listed.length === 3 && up(back.last['expressway:good']) && up(back.saved[0]) && !back.saved[1].header.prints && back.saved[1].header.logic === 'old',
    'the kept replays read: the two that still play given the prints (as the run recorded now has them) and written back; the other left as it was');
  FILLER_CARS.push({ id: 'zzdummy2', name: 'Dummy 2', tier: 3, evergreen: true, maxSpeed: 33, accel: 11, health: 130 });
  check(Replay.check(back.last['expressway:good']).ok, '...and once given them, a car added later refuses it no more');
  check(rosterPrint() === h.roster, 'the garage\'s print as recorded, the blueprint cars and ideas added left out of it');
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
