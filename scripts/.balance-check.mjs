// A check of the Blue Star rule (src/delivery/cars.js): each Blue Star car's top speed, acceleration and health
// strictly below the best of the gold tier above its own (or, in the top tier, below NEXT_TIER_CAPS).
//   node scripts/.balance-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const { CARS, TIERS, NEXT_TIER_CAPS } = g.cars, STATS = ['maxSpeed', 'accel', 'health'];
for (let tier = 1; tier <= TIERS; tier++) {
  const above = CARS.filter(c => c.tier === tier + 1 && !c.blue);
  const cap = Object.fromEntries(STATS.map(k => [k, above.length ? Math.max(...above.map(c => c[k])) : NEXT_TIER_CAPS[k]]));
  const gold = CARS.filter(c => c.tier === tier && !c.blue);
  console.log(`tier ${tier}: Blue Stars must stay under ${STATS.map(k => k + ' ' + cap[k]).join(', ')}` + (above.length ? '' : ' (the room kept for a six-star tier)'));
  for (const car of CARS.filter(c => c.tier === tier && c.blue)) {
    const over = STATS.filter(k => car[k] >= cap[k]);
    const better = STATS.some(k => car[k] > Math.max(...gold.map(c => c[k]))) || (car.agility || 1) > 1 || (car.mass || 1) > 1 || car.trait;
    if (over.length) failures++;
    console.log((over.length ? '  FAIL  ' : '  ok    ') + car.name + `: ${STATS.map(k => car[k]).join(' / ')}` + (over.length ? '  over on ' + over.join(', ') : '') +
      (better ? '' : '  (note: no better than its own tier\'s gold cars at anything)'));
  }
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
