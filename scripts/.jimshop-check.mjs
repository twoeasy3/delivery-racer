// A check of Crazey Jim's blueprint stall (src/delivery/jimshop.js; CHECKLIST item 243), headless: the day's rotation is the same
// for a date (and differs between dates), has the offers it should (distinct cars, a quantity and stock by rarity, one hot deal),
// NEVER offers a Bespoke key car's blueprints, an event car, a noPacks car, an earned / super car or the Tank (400 days, and
// the pool is exactly the packs' evergreen pool), the price rises with each bundle bought, the hot deal is cheaper, a bundle is
// cut to what a car still needs and a maxed car is not for sale, the daily stock and the daily cap, the affordable check,
// buying takes the money and gives the blueprints and counts it, the rotation boundary at LOCAL midnight (the counts of the
// day before are void), the save (cleaned, a code from before has none, the cookie's size).
//   node scripts/.jimshop-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const J = await g.load('jimshop.js');
  const { Jim, JIM, rotation, pool, viewOf, bundlePrice, needed, barred } = J;
  const { Progress } = await g.load('progress.js');
  const { Events } = await g.load('events.js');
  const { Ecu } = await g.load('ecu.js');
  const Cars = await g.load('cars.js');
  const P = await g.load('packs.js');
  const fresh = () => { Progress.reset(); Progress.noSave = true; };
  const day = (n) => new Date(Date.UTC(2026, 9, 1 + n, 12)).toISOString().slice(0, 10);

  // ---- the pool ----
  const everyone = Object.values(pool()).flat();
  const evergreen = Object.values(P.pools().evergreen).flat();
  check(everyone.length === evergreen.length && everyone.every(c => evergreen.includes(c)), 'the pool is the packs\' evergreen pool (' + everyone.length + ' cars)');
  const never = [...Cars.BESPOKE_CARS, ...Cars.EVENT_CARS, ...Cars.CARS.filter(c => c.noPacks), ...Cars.EARNED_CARS];
  check(never.length > 5 && never.every(c => !everyone.includes(c)), 'no Bespoke key car, event car, noPacks car or earned car is in the pool (' + never.length + ' checked)');
  check(everyone.every(c => !barred(c) && JIM.weight[P.rarityOf(c)]), 'every pool car has a rarity Jim prices and is not barred');
  check(['sixteen', 'silvercomet', 'rocketfin', 'swancar', 'solarracer', 'moonrover', 'monowheel', 'quadturbo', 'knifeedge', 'windsong', 'midsummer', 'hotdog', 'snocat', 'horseshoe'].every(id => !everyone.some(c => c.id === id)), 'the concept and key cars are not in the pool');
  check(everyone.every(c => J.unitPrice(c) >= 1 && Number.isInteger(J.unitPrice(c))), 'every pool car has a whole-dollar unit price');

  // ---- the rotation ----
  const a = rotation(day(0)), b = rotation(day(0)), c = rotation(day(1));
  check(JSON.stringify(a.map(o => [o.id, o.qty, o.hot, o.first])) === JSON.stringify(b.map(o => [o.id, o.qty, o.hot, o.first])), 'the same date gives the same offers, prices and hot deal');
  check(a.map(o => o.id).join() !== c.map(o => o.id).join(), 'the next date gives other offers');
  let bad = 0, hots = 0, dup = 0, legendHot = 0, sets = new Set(), size = 0;
  for (let d = 0; d < 400; d++) {
    const r = rotation(day(d));
    sets.add(r.map(o => o.id).join());
    if (r.length !== JIM.slots) size++;
    if (new Set(r.map(o => o.id)).size !== r.length) dup++;
    if (r.filter(o => o.hot).length !== 1) hots++;
    if (r.some(o => o.hot && o.rarity === 'legendary')) legendHot++;
    for (const o of r) if (barred(o.car) || never.includes(o.car) || !JIM.qty[o.rarity].includes(o.qty) || o.stock !== JIM.stock[o.qty] || o.first < 1) bad++;
  }
  check(bad === 0, 'in 400 days: no barred car, every quantity and stock as its rarity allows, every price at least $1');
  check(size === 0 && dup === 0 && hots === 0 && legendHot === 0, 'in 400 days: ' + JIM.slots + ' distinct cars, exactly one hot deal, never a legendary');
  check(sets.size > 380, 'the days differ (' + sets.size + ' different sets in 400 days)');
  const seen = new Set(); for (let d = 0; d < 400; d++) rotation(day(d)).forEach(o => seen.add(o.id));
  check(seen.size >= everyone.length * 0.9, 'over 400 days Jim shows ' + seen.size + ' of the ' + everyone.length + ' pool cars');
  check(rotation(day(0), { cars: [] }).length === 0 && Jim.offers({ cars: [] }).length === 0, 'an empty pool: no offers, no crash');
  check(rotation(day(0), { cars: Cars.CARS.slice(0, 2) }).length <= 2, 'a pool of two: at most two offers');
  const hot = a.find(o => o.hot);
  check(bundlePrice(hot, hot.qty, 0) < Math.ceil(hot.unit * hot.qty) && Math.abs(bundlePrice(hot, hot.qty, 0) / Math.ceil(hot.unit * hot.qty) - (1 - JIM.hotOff)) < 0.05, 'the hot deal is ' + Math.round(JIM.hotOff * 100) + '% off');

  // ---- prices ----
  const plain = a.find(o => !o.hot);
  const p0 = bundlePrice(plain, plain.qty, 0), p1 = bundlePrice(plain, plain.qty, 1), p2 = bundlePrice(plain, plain.qty, 2);
  check(p0 === Math.ceil(plain.unit * plain.qty) && p1 > p0 && p2 > p1 && Math.abs(p1 / p0 - (1 + JIM.rise)) < 0.02, 'the price rises with each bundle bought today (' + p0 + ', ' + p1 + ', ' + p2 + ')');
  const d0 = day(0);
  const state = (n, bp = 0, d = d0) => ({ day: d, n, bp });
  fresh();
  const money = 100000;
  const view = (o, st, m = money, blueprints) => viewOf(o, { day: d0, state: st, money: m, blueprints });
  check(a.every(o => view(o, {}).why === null), 'a fresh day and a full bank: every offer can be bought');
  check(view(plain, {}, p0 - 1).why === 'short' && view(plain, {}, p0 - 1).need === 1 && view(plain, {}, p0).why === null, 'one dollar short: "short" by exactly $1; the exact price is enough');
  check(view(plain, {}, 0).why === 'short', 'an empty bank: short');
  check(view(plain, state({ [plain.id]: plain.stock })).why === 'sold' && view(plain, state({ [plain.id]: plain.stock - 1 })).why === null, 'the stock: sold out when its bundles have all gone, not before');
  check(view(plain, state({ [plain.id]: 1 })).price === p1, 'the price shown after one purchase is the risen one');
  check(view(plain, state({}, JIM.dayCap)).why === 'cap' && view(plain, state({}, JIM.dayCap - 1)).qty === Math.min(plain.qty, 1), 'the daily cap of ' + JIM.dayCap + ': none more at the cap; the last blueprint cuts a bundle to one');
  check(view(plain, state({ [plain.id]: 3 }, 9, day(-1))).why === null && view(plain, state({ [plain.id]: 3 }, 9, day(-1))).price === p0, 'the counts of another day are void (price back to the first)');
  const x = Ecu.x(plain.car), max = Ecu.max(plain.car), full = (Ecu.isBlueprint(plain.car) ? max : max - 1) * x;
  check(needed(plain.car, 0) === full && needed(plain.car, full) === 0 && needed(plain.car, full + 3) === 0, 'blueprints needed to max: ' + full + ' for ' + plain.car.name);
  check(view(plain, {}, money, full).why === 'maxed', 'a car at its max ECU is "maxed", not for sale');
  const cut = view(plain, {}, money, full - 1);
  check(cut.qty === 1 && cut.cut === (plain.qty > 1) && cut.price === bundlePrice(plain, 1, 0), 'a bundle is cut to what the car needs (1 left: x1 at the price of one)');

  // ---- buying ----
  fresh();
  Events.now = () => Date.UTC(2026, 9, 14, 10, 30); // (a moment of that local day: the rotation of its date)
  const today = Jim.day();
  const offers = Jim.offers(), first = offers.find(o => !o.hot) || offers[0];
  Progress.data.money = first.price - 1;
  const refused = Jim.buy(first.id);
  check(!refused.ok && refused.why === 'short' && Progress.data.money === first.price - 1 && Ecu.blueprints(first.id) === 0, 'too little money: nothing taken, nothing given');
  Progress.data.money = 5000;
  const had = Ecu.blueprints(first.id), price1 = first.price;
  const done = Jim.buy(first.id);
  check(done.ok && done.qty === first.qty && done.price === price1 && Progress.data.money === 5000 - price1, 'a purchase takes the price (' + price1 + ')');
  check(Ecu.blueprints(first.id) === had + first.qty && Progress.data.jimBuys.day === today && Progress.data.jimBuys.n[first.id] === 1 && Progress.data.jimBuys.bp === first.qty, 'and gives ' + first.qty + ' blueprints and counts them in the save');
  check(done.after.bp === done.before.bp + first.qty, 'it reports where the blueprints stood before and after');
  const again = Jim.offers().find(o => o.id === first.id);
  check(again.bought === 1 && again.left === first.stock - 1 && again.price === bundlePrice(first, first.qty, 1), 'the offer remembers it: one fewer in stock, a dearer price');
  // sell the offer out
  Progress.data.money = 100000;
  while (Jim.offers().find(o => o.id === first.id).why === null) { if (!Jim.buy(first.id).ok) break; }
  const out = Jim.offers().find(o => o.id === first.id);
  check(out.why === 'sold' || out.why === 'cap' || out.why === 'maxed', 'it sells out (' + out.why + ') and then refuses: ' + Jim.buy(first.id).why);
  // the day cap over the whole stall
  fresh(); Progress.data.money = 1e6;
  for (const o of Jim.offers()) { while (Jim.offers().find(v => v.id === o.id).why === null) Jim.buy(o.id); }
  check(Progress.data.jimBuys.bp <= JIM.dayCap, 'buying everything sells at most ' + JIM.dayCap + ' blueprints in a day (sold ' + Progress.data.jimBuys.bp + ')');
  // the rotation boundary
  const before = Jim.offers().map(o => o.id).join();
  const midnight = Jim.nextAt();
  check(midnight > Events.now() && midnight - Events.now() <= 25 * 3600e3, 'the next stock is at the next local midnight (in ' + Math.round((midnight - Events.now()) / 60e3) + ' min)');
  Events.now = () => midnight - 1000;
  check(Jim.offers().map(o => o.id).join() === before, 'a second before midnight: the same offers');
  Events.now = () => midnight + 1000;
  const after = Jim.offers();
  check(after.map(o => o.id).join() !== before && after.every(o => o.bought === 0 && o.left === o.stock), 'a second after: new offers, the old counts void, full stock');
  // ---- the save ----
  const codeOf = (extra) => 'DR1.' + Buffer.from(JSON.stringify({ unlocked: 3, cars: ['commuter'], ...extra })).toString('base64');
  check(Progress.importCode(codeOf({ jimBuys: { day: d0, n: { sleeper: 2, bad: 'x', 'X Y': 1, huge: 500 }, bp: 4 } })) && JSON.stringify(Progress.data.jimBuys) === JSON.stringify({ day: d0, n: { sleeper: 2 }, bp: 4 }),
    'a save code: junk counts are dropped (only the whole, sensible ones kept)');
  check(Progress.importCode(codeOf({})) && JSON.stringify(Progress.data.jimBuys) === '{}', 'a code from before (no jimBuys): none, no crash');
  check(Progress.importCode(codeOf({ jimBuys: { day: 'yesterday', n: { sleeper: 1 } } })) && JSON.stringify(Progress.data.jimBuys) === '{}' && Progress.importCode(codeOf({ jimBuys: [1, 2] })) && JSON.stringify(Progress.data.jimBuys) === '{}', 'a bad day or a bad shape: none');
  Progress.noSave = true;
  fresh(); Progress.data.jimBuys = { day: d0, n: { sleeper: 2, hothatch: 1, mini: 3, towtruck: 1, goddess: 1, wedge: 2 }, bp: 8 };
  const bytes = encodeURIComponent(JSON.stringify(Progress.data.jimBuys)).length;
  check(bytes < 260, 'a full day of purchases is ' + bytes + ' bytes in the cookie (six cars; the cookie keeps ' + 3600 + ')');
  console.log('  info  jimBuys in the cookie: empty ' + encodeURIComponent(JSON.stringify({})).length + ' B, a day of six offers ' + bytes + ' B');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
