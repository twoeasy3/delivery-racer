// The garage's figures by tier, said (src/delivery/cars.js). There was a rule here, the Blue Star rule: each Blue Star car's
// top speed, acceleration and health strictly below the best of the gold tier above its own (or, in the top tier, below
// NEXT_TIER_CAPS). The owner (12-Oct, CHECKLIST item 115) decided there is NO such rule any more with the ECUs: the tier
// ceilings were removed, not rewritten. What is left only lists each tier's cars (their maxed ECU's figures), and fails
// on nothing but a figure that is not a number. Each car's ECU1 figures (ecus.json, the ECU budget: CHECKLIST item 171) are
// listed after its maxed ones, to read a fresh car against the tiers (the budget's own rules: scripts/.ecu-check.mjs).
//   node scripts/.balance-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const { CARS, TIERS } = g.cars, STATS = ['maxSpeed', 'accel', 'health'];
const { Ecu } = await g.load('ecu.js');
for (let tier = 1; tier <= TIERS; tier++) {
  console.log(`tier ${tier}:`);
  for (const car of CARS.filter(c => c.tier === tier && !c.amphibious)) {
    const bad = STATS.filter(k => typeof car[k] !== 'number' || !isFinite(car[k]));
    if (bad.length) failures++;
    console.log((bad.length ? '  FAIL  ' : '  ok    ') + car.name + (car.blue ? ' (Blue Star)' : '') + `: ${STATS.map(k => car[k]).join(' / ')}` + `  (ECU1 of ${Ecu.max(car)}: ${STATS.map(k => Ecu.stats(car, 1)[k]).join(' / ')})` + (bad.length ? '  not a number: ' + bad.join(', ') : ''));
  }
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
