// Writes src/delivery/ecus.json: every car's figures at each of its ECUs (ecu.js; BLUEPRINTS-NOTES.md "Stats"), derived
// from its MAXED (current, cars.js) figures by THE ECU BUDGET, whose knobs are all in src/delivery/ecu.js (edit them there,
// then run this with --write):
//   STEPS          f per ECU step, by kind (lot: the car lot's cars, CARS; blueprint: the evergreen blueprint cars, the
//                  event cars, the Bespoke key cars) and by stat (maxSpeed, accel, health, agility, delivery, composure,
//                  crossing). ECU1 = max x (1 - f x (N - 1)); today: lot 0.03 top speed, 0.04 agility, 0.05 the rest;
//                  blueprint/key 0.045 top speed, 0.08 agility, 0.10 the rest (a 5-ECU car's ECU1 at 82% / 68% / 60%
//                  of its max; a lot car's at 88% / 84% / 80%)
//   TOP_SPEED_CAP  max top speed / ECU1 top speed is never above it (1.25: ECU1 >= 80% of max), a floor of its own
//   FLOORS         ECU1 never below { share } of the max or { min } absolute (health 80, accel 7, agility 0.5, composure
//                  CONFIG.composureFloor); a floor above the max: the max at every ECU
//   then EQUAL STEPS from ECU1 to the max: ECU k = ECU1 + (max - ECU1) x (k - 1) / (N - 1), maxSpeed to 0.1 m/s, accel to
//   0.1, health whole, the ratio stats to 0.001 (so each ECU stays at or above the last)
//   RESPAWN        5.5 s at ECU1, 0.5 s less for each ECU above it (unchanged)
//   weight         (the car's `mass`) the same at every ECU
// N = the ladder's max ECU (Ecu.ladder). x = blueprints per ECU step (Ecu X_DEFAULT). The cars: the garage's (CARS, the
// amphibious ones and the Tank too), the evergreen blueprint cars (FILLER_CARS), the event cars, the Bespoke key cars
// (BESPOKE_CARS) and the earned (special) cars (ECU1 only). Once written THE FILE IS THE TRUTH (the game reads only it).
// A HAND EDIT (an exception for one car) is LOST to --write unless that car is named in --keep: keep the list of
// exceptions in the command you run (and say it in CHECKLIST), e.g. `--write --keep swancar,snocat`.
//   node scripts/ecu-tables.mjs             what it would write, against the file (nothing written)
//   node scripts/ecu-tables.mjs --missing   add only the cars the file has no entry for (hand edits kept)
//   node scripts/ecu-tables.mjs --stats     add the second set's fields (agility, delivery, composure, crossing, weight) to
//                                           every ECU of every car already in the file that lacks them, N being the
//                                           file's own ECU count; fields already there are kept (hand edits kept)
//   node scripts/ecu-tables.mjs --delivery  write every ECU's `delivery` anew from ecu.js DELIVERY (the maxed figure) by
//                                           the budget (only that field: the rest kept)
//   node scripts/ecu-tables.mjs --write     write every entry anew by the budget (hand edits LOST, but for --keep's cars)
//   node scripts/ecu-tables.mjs --write --keep a,b   ...keeping the file's entries of cars a and b as they are
// --missing, --stats and --delivery may be given together (after a merge that adds cars: --missing --stats).
import { writeFileSync, readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const FILE = new URL('../src/delivery/ecus.json', import.meta.url);
const g = await boot();
try {
  const { Ecu, STEPS, FLOORS, RESPAWN, X_DEFAULT, NEW_STATS } = await g.load('ecu.js');
  const { CARS, FILLER_CARS, EVENT_CARS, BESPOKE_CARS = [], EARNED_CARS } = g.cars;
  const PRECISION = { maxSpeed: 0.1, accel: 0.1, health: 1 }; // (the ratio stats: 0.001)
  const fix = (v, key) => { const step = PRECISION[key]; return step ? Number((Math.round(v / step) * step).toFixed(step < 1 ? 1 : 0)) : Number(v.toFixed(3)); };
  const stepsOf = (car) => (CARS.includes(car) ? STEPS.lot : STEPS.blueprint);
  // a stat's figure at ECU k of N, from its max (the budget: ecu.js STEPS, FLOORS)
  const at = (car, key, max, k, n) => {
    if (n <= 1 || k >= n) return max;
    const floor = FLOORS[key] || {};
    const first = Math.min(max, Math.max(max * (1 - stepsOf(car)[key] * (n - 1)), floor.min ?? -Infinity, max * (floor.share ?? 0)));
    return fix(first + (max - first) * (k - 1) / (n - 1), key);
  };
  // the second set at ECU k of N (weight flat; the rest by the budget)
  const newStats = (car, k, n) => Object.fromEntries(Object.entries(NEW_STATS).map(([key, d]) => [key, d.scales ? at(car, key, d.of(car), k, n) : d.of(car)]));
  const entryFor = (car) => {
    const n = Ecu.ladder(car);
    const ecus = [];
    for (let k = 1; k <= n; k++) {
      ecus.push({ maxSpeed: at(car, 'maxSpeed', car.maxSpeed, k, n), accel: at(car, 'accel', car.accel, k, n), health: at(car, 'health', car.health, k, n),
        respawn: RESPAWN.first - RESPAWN.step * (k - 1), ...newStats(car, k, n) });
    }
    return { x: X_DEFAULT, ecus };
  };
  const cars = [...CARS, ...FILLER_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...EARNED_CARS];
  const fresh = Object.fromEntries(cars.map(car => [car.id, entryFor(car)]));
  const now = JSON.parse(readFileSync(FILE, 'utf8'));
  const has = (flag) => process.argv.includes(flag);
  const mode = has('--write') ? 'write' : [has('--missing') && 'missing', has('--stats') && 'stats', has('--delivery') && 'delivery'].filter(Boolean).join(' + ') || 'dry';
  const keep = (process.argv[process.argv.indexOf('--keep') + 1] || '').split(',').filter(id => has('--keep') && id);
  let out = mode === 'write' ? { ...fresh, ...Object.fromEntries(keep.filter(id => now[id]).map(id => [id, now[id]])) } : has('--missing') ? { ...now, ...Object.fromEntries(Object.entries(fresh).filter(([id]) => !now[id])) } : { ...now };
  if (has('--stats') && mode !== 'write') {
    // (each ECU of each car in the file: the second set's fields it lacks, by the file's own ECU count; kept if there)
    let added = 0;
    out = Object.fromEntries(Object.entries(out).map(([id, e]) => {
      const car = cars.find(c => c.id === id);
      if (!car) return [id, e]; // (an entry for a car not in the roster: left alone)
      const n = e.ecus.length;
      return [id, { ...e, ecus: e.ecus.map((s, i) => {
        const want = newStats(car, i + 1, n), more = Object.fromEntries(Object.entries(want).filter(([k]) => !(k in s)));
        added += Object.keys(more).length;
        return { ...s, ...more };
      }) }];
    }));
    console.log('--stats: ' + added + ' fields added');
  }
  if (has('--delivery') && mode !== 'write') {
    let changed = 0;
    out = Object.fromEntries(Object.entries(out).map(([id, e]) => {
      const car = cars.find(c => c.id === id);
      if (!car) return [id, e];
      return [id, { ...e, ecus: e.ecus.map((s, i) => {
        const delivery = newStats(car, i + 1, e.ecus.length).delivery;
        if (s.delivery !== delivery) changed++;
        return { ...s, delivery };
      }) }];
    }));
    console.log('--delivery: ' + changed + ' ECUs changed');
  }
  const differ = Object.keys(fresh).filter(id => JSON.stringify(now[id]) !== JSON.stringify(fresh[id]));
  console.log(cars.length + ' cars; ' + Object.keys(now).length + ' in the file; ' + differ.length + ' differ from the equal steps (or are missing): ' + (differ.join(', ') || 'none'));
  for (const car of cars) console.log('  ' + car.id.padEnd(14) + ' ' + Ecu.kind(car).padEnd(9) + ' max ECU ' + fresh[car.id].ecus.length + '  ' +
    fresh[car.id].ecus.map((e, i) => 'ECU' + (i + 1) + ' ' + e.maxSpeed + '/' + e.accel + '/' + e.health + '/' + e.respawn + 's' +
      ' ag ' + e.agility + ' dl ' + e.delivery + ' composure ' + e.composure + ' x ' + e.crossing + ' wt ' + e.weight).join('  '));
  if (mode !== 'dry') {
    // (one car a line, its ECUs inside it: easy to edit by hand)
    const text = '{\n' + Object.entries(out).map(([id, e]) => '  ' + JSON.stringify(id) + ': { "x": ' + e.x + ', "ecus": [' +
      e.ecus.map(s => JSON.stringify(s)).join(', ') + '] }').join(',\n') + '\n}\n';
    writeFileSync(FILE, text);
    console.log('written: src/delivery/ecus.json (' + Object.keys(out).length + ' cars, ' + mode + ')');
  }
} finally {
  await g.close();
}
