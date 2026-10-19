// A check that a HIDDEN LEVEL (?hidden=<id>, levels.js HIDDEN_LEVELS) drives the car the player last picked in the garage, as a normal level does
// (the owner, 19-Oct: "The hidden level rarely respects the player's car choice now"). Cause: a pick made while a level with a car rule is
// selected (a tier's) is kept in Progress.data.tierCars, apart from data.car (cars.js selectCar), and a hidden level has no rule so it drove the
// older data.car. Fixed outside the rules files: render/lastpick.js (recorded by the garage and the better-ride card, applied by main.js's hidden start).
// For every hidden level that is not a test track: pick a car as the garage does (selectCar under a tier-3 level, and under an unrestricted one),
// record it, apply it as main.js does (driveLastPick), start the level, and assert the spawned car (CAR.id) is the pick. Only a level whose JSON
// forces a car (`car`: grand-prix f1, gimmick-road miata) may differ, and must show that car. An unowned car is never driven (the old car stays).
//   node scripts/.hidden-car-check.mjs
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot({ ownAll: true });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const L = g.levels, C = g.cars, P = g.progress;
  const { recordPick, lastPick, driveLastPick } = await g.load('render/lastpick.js');
  const { Tiers } = await g.load('tiers.js');
  const ids = Object.keys(L.HIDDEN_LEVELS).filter(id => !L.TEST_LEVELS.includes(id));
  const forced = ids.filter(id => L.HIDDEN_LEVELS[id].car);
  console.log(`        ${ids.length} hidden levels; a car forced by their JSON: ${forced.map(id => id + '=' + L.HIDDEN_LEVELS[id].car).join(', ')}`);
  check(['fjord-road', 'neon-grid', 'castle-town', 'apron-run', 'oil-patch', 'metro-run'].every(id => ids.includes(id)), 'the new hidden levels are among them');
  const tier = (n) => C.CARS.filter(c => C.carTier(c) === n);
  const tierLevel = L.LEVELS.find(l => Tiers.restriction(l, false) === 3);
  check(!!tierLevel, 'a tier-3 menu level to pick under: ' + tierLevel?.id);
  const bespoke = C.BESPOKE_CARS[0].id, legend = C.EARNED_CARS.find(c => c.legend).id, filler = C.FILLER_CARS[0].id;
  const scenarios = [ // [where the garage is open, the pick]
    [tierLevel.id, tier(3)[1].id], [tierLevel.id, tier(3)[0].id],
    ['testbed', tier(5)[0].id], ['testbed', 'motorhome'], ['testbed', bespoke], ['testbed', legend], ['testbed', filler], ['testbed', 'commuter'],
  ];
  const own = () => { P.data.cars = [...new Set([...C.CARS.map(c => c.id), bespoke, legend, filler])]; P.data.tierCars = {}; P.data.car = 'commuter'; };
  for (const [where, pick] of scenarios) {
    own(); g.select(where);
    if (!C.carAllowedOn(C.carById(pick), false)) { console.log(`        (${pick} is not pickable under ${where}: skipped)`); continue; }
    C.selectCar(pick); recordPick(pick);
    const wrong = [];
    for (const id of ids) {
      driveLastPick(P);
      g.select(id); g.Game.evil = false; g.Game.start();
      const want = L.HIDDEN_LEVELS[id].car || pick;
      if (C.CAR.id !== want) wrong.push(`${id}: ${C.CAR.id} (wanted ${want})`);
      try { g.Game.toMenu(); } catch { /* (already out) */ }
      g.select(where); own2(where, pick);
    }
    check(wrong.length === 0, `picked ${pick} under ${where}: every hidden level drives it${wrong.length ? ' -- ' + wrong.slice(0, 4).join('; ') : ''}`);
  }
  function own2(where, pick) { C.selectCar(pick); }
  // an unowned pick (a stale record, a reset save) is never driven
  own(); recordPick(legend); P.data.cars = P.data.cars.filter(id => id !== legend); P.data.car = 'commuter';
  const before = P.data.car; driveLastPick(P); g.select('fjord-road'); g.Game.start();
  check(P.owns(legend) === false && C.CAR.id === before, 'a last pick no longer owned is not driven (the old car stays)');
  // the pieces are wired: the garage records the pick, the better-ride card too, the hidden start applies it, and it is render-only
  const src = (p) => readFileSync(new URL('../src/delivery/' + p, import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  check(/recordPick\(car\.id\)/.test(src('render/garage.js')), 'render/garage.js records the car taken');
  check(/recordPick\(n\.ride\.id\)/.test(src('render/ridenudge.js')), 'render/ridenudge.js records the better ride taken');
  check(/else if \(hidden\) \{[\s\S]{0,400}driveLastPick\(Progress\)/.test(src('main.js')), 'main.js: a hidden start drives the last pick (after ?car, which wins)');
  check(!/import[^;]*Progress/.test(src('render/lastpick.js')) && !/saveData|Progress\.save/.test(src('render/lastpick.js')), 'lastpick.js writes no save (the fingerprint and the cookie are untouched)');
  check(lastPick() === legend, 'lastPick reads back what recordPick wrote');
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
await g.close();
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
