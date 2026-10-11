// Tip money against the cost of cars, on a RUSHED playthrough of the level tiers (src/delivery/tiers.json): the
// least number of levels a player must play, taking the best tips a rushed run can earn, to afford the cheapest
// car of each tier before playing it (the car rule: a medal not yet earned needs a car of EXACTLY that tier).
// It rebalances nothing: it only counts. Prints a table.
//   node scripts/tier-money.mjs [--cash=0]     (--cash: the average cash pickups a level adds, $; default none)
//
// THE TIP FORMULA is the game's own (game.js, Game.tip): the level's `tip`, whole until the clock hits zero, then
// draining to nothing over CONFIG.tipCountdown seconds; a delivery on time (the only kind that counts) pays all of
// it, plus the cash pickups collected, less fines (Progress.levelDone gets tip + cash - fines). Every delivery
// pays, a replay too. The tip is the same on Good and Evil.
// ASSUMPTIONS (change them here):
//  - every delivery is on time with no fines and no cash pickups (--cash adds a flat amount a level), so the tip is
//    the level's full tip: the best a rushed run can earn from it (a rush of the clock is not a rush of cash)
//  - the player buys, at each tier, only that tier's CHEAPEST car (Gold 1's is the free Commuter), before its first
//    level; nothing else is bought; no mystery or powerup money; cars from the earned/amphibious sets are not needed
//  - the rules of tiers.js: levels 1 and 2 open with the tier, 3 needs 2 medals in the tier, 4 needs 4, 5 needs
//    level 4 beaten, beating 5 opens the next tier. So a tier takes at least SIX plays: four medals (from
//    levels 1 to 3, the best four tips: a level's halves are two plays, one a side) then level 4 and level 5
//  - when the bank is short of the next tier's cheapest car the player replays (in any car: the medal is earned)
//    the best-tipping level they have already beaten, one play a time, until it is not
import { boot } from './delivery-headless.mjs';

const cash = Number((process.argv.find(a => a.startsWith('--cash=')) || '--cash=0').slice(7)) || 0;
const g = await boot();
const { LEVELS } = g.levels, { CARS } = g.cars;
const fs = await import('node:fs');
const data = JSON.parse(fs.readFileSync(new URL('../src/delivery/tiers.json', import.meta.url), 'utf8'));
const byId = new Map(LEVELS.map(l => [l.id, l]));
const tipOf = (l) => l.tip + cash;
const tierCars = (n) => CARS.filter(c => !c.amphibious && !c.earned && c.tier === ((n - 1) % 5) + 1 && !!c.blue === (n > 5)).sort((a, b) => a.price - b.price);
const money = (x) => '$' + Math.round(x);
const names = Object.keys(data.tiers).sort((a, b) => a - b);

// the four best medal plays out of levels 1 to 3 (each level's halves: two plays, one a side; level 3 needs two
// halves from levels 1 and 2 before it opens), by trying every choice
const bestFour = (l1, l2, l3) => {
  let best = null;
  for (let a = 0; a <= 2; a++) for (let b = 0; b <= 2; b++) for (let c = 0; c <= 2; c++) {
    if (a + b + c !== 4 || (c > 0 && a + b < 2)) continue;
    const sum = a * tipOf(l1) + b * tipOf(l2) + c * tipOf(l3);
    if (!best || sum > best.sum) best = { a, b, c, sum };
  }
  return best;
};

let bank = 0, plays = 0;
const earnedTips = []; // the tips of every level beaten so far, for the farming replays
const rows = [];
for (const n of names) {
  const levels = data.tiers[n].map(id => byId.get(id));
  const [l1, l2, l3, l4, l5] = levels;
  const cars = tierCars(Number(n)), cheapest = cars[0];
  // the cheapest car of this tier must be bought before its first level: farm if the bank is short
  let farm = 0;
  const farmTip = earnedTips.length ? Math.max(...earnedTips) : 0;
  while (bank < cheapest.price) {
    if (!farmTip) throw new Error('no money and nothing to replay for ' + cheapest.name);
    bank += farmTip; farm++; plays++;
  }
  bank -= cheapest.price;
  const four = bestFour(l1, l2, l3);
  const mandatory = four.sum + tipOf(l4) + tipOf(l5);
  bank += mandatory;
  plays += 6;
  earnedTips.push(tipOf(l1), tipOf(l2), tipOf(l3), tipOf(l4), tipOf(l5));
  rows.push({ n: Number(n), cheapest, farm, mandatory, bank, plays, plan: `L1x${four.a} L2x${four.b} L3x${four.c} L4 L5`, levels });
}
console.log('Tip money on a rushed run of the tiers (tiers.json; full on-time tips' + (cash ? ' + $' + cash + ' cash a level' : ', no cash pickups') + ')\n');
console.log('tier       cheapest car (price)            replays to afford it   plays in tier (tips earned)        bank after   plays so far');
for (const r of rows) {
  const t = r.n <= 5 ? 'Gold ' + r.n : 'Blue ' + (r.n - 5);
  console.log(`${t.padEnd(10)} ${(r.cheapest.name + ' (' + money(r.cheapest.price) + ')').padEnd(31)} ${String(r.farm).padStart(6)}                 6 (${money(r.mandatory)}; ${r.plan})`.padEnd(112) + ` ${money(r.bank).padStart(6)}   ${String(r.plays).padStart(4)}`);
}
console.log('\nPlays of the cheapest path if nothing had to be replayed: ' + names.length * 6 + '; with the replays the bank needs: ' + rows[rows.length - 1].plays + ' (' + (rows[rows.length - 1].plays - names.length * 6) + ' replays).');
console.log('Cars of each tier (cheapest first):');
for (const n of names) console.log('  tier ' + n + ': ' + tierCars(Number(n)).map(c => c.name + ' ' + money(c.price)).join(', '));
// the first car of the NEXT tier, against the bank at the end of this one: what is left before buying it
console.log('\nBank at the end of each tier against the next tier\'s cheapest car:');
rows.forEach((r, i) => { const nxt = rows[i + 1]; if (nxt) console.log(`  after tier ${r.n}: bank ${money(r.bank)} (before replays) vs ${nxt.cheapest.name} ${money(nxt.cheapest.price)}: ${r.bank >= nxt.cheapest.price ? 'covered' : 'short by ' + money(nxt.cheapest.price - r.bank)}`); });
await g.close();
process.exit(0);
