// Writes src/delivery/ecus.json: every car's figures at each of its ECUs (ecu.js; BLUEPRINTS-NOTES.md "Stats"), derived by
// EQUAL STEPS from its maxed (current, cars.js) figures: ECU k of N = max * (1 - f * (N - k)), f = Ecu STEPS (0.03 per ECU
// for a car lot car, 0.06 for a blueprint car or an event car), for maxSpeed (to 0.1 m/s), accel (to 0.1) and health (whole);
// respawn 5.5 s at ECU1 and 0.5 s less for each ECU above it. N = the ladder's max ECU (Ecu.ladder). x = blueprints per
// ECU step (Ecu X_DEFAULT). The cars: the garage's (CARS, the amphibious ones and the Tank too), the evergreen blueprint
// cars (FILLER_CARS), the event cars, the Bespoke key cars (BESPOKE_CARS) and the earned (special) cars (ECU1 only). Once written THE FILE IS THE TRUTH: edit
// it by hand; this only writes it again when told.
//   node scripts/ecu-tables.mjs             what it would write, against the file (nothing written)
//   node scripts/ecu-tables.mjs --missing   add only the cars the file has no entry for (hand edits kept)
//   node scripts/ecu-tables.mjs --write     write every entry anew (hand edits LOST)
import { writeFileSync, readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const FILE = new URL('../src/delivery/ecus.json', import.meta.url);
const g = await boot();
try {
  const { Ecu, STEPS, RESPAWN, X_DEFAULT } = await g.load('ecu.js');
  const { CARS, FILLER_CARS, EVENT_CARS, BESPOKE_CARS = [], EARNED_CARS } = g.cars;
  const round = (v, step) => Math.round(v / step) * step;
  const fix = (v, step) => Number(round(v, step).toFixed(step < 1 ? 1 : 0));
  const entryFor = (car) => {
    const n = Ecu.ladder(car), f = CARS.includes(car) ? STEPS.lot : STEPS.blueprint;
    const ecus = [];
    for (let k = 1; k <= n; k++) {
      const m = 1 - f * (n - k);
      ecus.push({ maxSpeed: fix(car.maxSpeed * m, 0.1), accel: fix(car.accel * m, 0.1), health: fix(car.health * m, 1), respawn: RESPAWN.first - RESPAWN.step * (k - 1) });
    }
    return { x: X_DEFAULT, ecus };
  };
  const cars = [...CARS, ...FILLER_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...EARNED_CARS];
  const fresh = Object.fromEntries(cars.map(car => [car.id, entryFor(car)]));
  const now = JSON.parse(readFileSync(FILE, 'utf8'));
  const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--missing') ? 'missing' : 'dry';
  const out = mode === 'write' ? fresh : { ...now, ...Object.fromEntries(Object.entries(fresh).filter(([id]) => !now[id])) };
  const differ = Object.keys(fresh).filter(id => JSON.stringify(now[id]) !== JSON.stringify(fresh[id]));
  console.log(cars.length + ' cars; ' + Object.keys(now).length + ' in the file; ' + differ.length + ' differ from the equal steps (or are missing): ' + (differ.join(', ') || 'none'));
  for (const car of cars) console.log('  ' + car.id.padEnd(14) + ' ' + Ecu.kind(car).padEnd(9) + ' max ECU ' + fresh[car.id].ecus.length + '  ' +
    fresh[car.id].ecus.map((e, i) => 'ECU' + (i + 1) + ' ' + e.maxSpeed + '/' + e.accel + '/' + e.health + '/' + e.respawn + 's').join('  '));
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
