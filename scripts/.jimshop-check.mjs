// A check of Crazey Jim's blueprint stall (src/delivery/jimshop.js; CHECKLIST item 249), headless: the day's rotation is the same
// for a date (and differs between dates), has the offers it should (distinct cars, a quantity and stock by rarity, one hot deal),
// offers exactly the Standard pack's blueprint pool (the owner, 14-Oct: the ordinary evergreen cars and the key cars whose blueprints it
// drops, derived from the packs), and NEVER any other key car, an earned / super car, the Tank, an off car or a noPacks car (400 days); key cars: dearer
// (keyMult), at most keyCap blueprints a day each, never the hot deal, rare; the price rises with each bundle bought, the hot deal is cheaper, a bundle is
// cut to what a car still needs and a maxed car is not for sale, the daily stock and the daily cap, the affordable check,
// buying takes the money and gives the blueprints and counts it, the rotation every 6 LOCAL hours (00:00 06:00 12:00 18:00; a slot's stock and price rises, the day's caps; a clock set back; the days of a clock change), the save (cleaned, a code from before has none, the cookie's size).
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
  const groups = pool(), everyone = Object.values(groups).flat();
  const evergreen = Object.values(P.pools().evergreen).flat();
  check(evergreen.every(c => groups[P.rarityOf(c)].includes(c)) && groups.common.length + groups.uncommon.length + groups.epic.length + groups.legendary.length === evergreen.length, 'the pool holds all ' + evergreen.length + ' ordinary evergreen cars of the packs (' + groups.legendary.length + ' of them Legendary)');
  // the pool IS the Standard pack's blueprint pool (the owner, 14-Oct): derived here from the packs, so a change to them is followed
  const std = Object.entries(P.poolOf(P.Packs.data.packs.standard)).filter(([r]) => r !== 'bespoke').flatMap(([, l]) => l);
  const stdKeys = std.filter(c => c.bespoke);
  check(stdKeys.length >= 1 && stdKeys.length === groups.key.length && stdKeys.every(c => groups.key.includes(c)), 'the key cars are those whose blueprints the Standard pack drops: ' + groups.key.map(c => c.id).join(', '));
  check(std.length === everyone.length && std.every(c => everyone.includes(c)), 'the whole pool is the Standard pack\'s blueprint pool (' + everyone.length + ' cars: ' + (everyone.length - groups.key.length) + ' ordinary, ' + groups.key.length + ' key cars)');
  const outKeys = [...new Set([...Cars.BESPOKE_CARS, ...Cars.EVENT_CARS.filter(c => c.bespoke)])].filter(c => !stdKeys.includes(c));
  check(outKeys.length >= 8 && outKeys.every(c => !everyone.includes(c)), 'every other key car is out (' + outKeys.length + ': ' + outKeys.map(c => c.id).join(', ') + ')');
  const barredOut = [...Cars.EARNED_CARS, ...Cars.CARS.filter(c => c.tank), ...Cars.CARS.filter(c => c.noPacks), ...Cars.FILLER_CARS.filter(c => c.noPacks)];
  check(barredOut.length > 8 && barredOut.every(c => !everyone.includes(c) && barred(c)), 'out (' + barredOut.length + ' checked): earned cars, the Tank, every noPacks car (' + Cars.FILLER_CARS.filter(c => c.noPacks).map(c => c.id).join(', ') + ')');
  check(everyone.every(c => J.unitPrice(c) >= 1 && Number.isInteger(J.unitPrice(c)) && JIM.weight[P.rarityOf(c)]), 'every pool car has a rarity Jim prices and a whole-dollar unit price');
  const key0 = groups.key[0], ord0 = groups.legendary[0];
  check(J.unitPrice(key0) === Math.round(J.basisOf(key0) * JIM.k[P.rarityOf(key0)] * JIM.keyMult) && J.unitPrice(key0) > J.unitPrice(ord0), 'a key car costs keyMult (x' + JIM.keyMult + ') more: ' + key0.id + ' $' + J.unitPrice(key0) + ' a blueprint, ' + ord0.id + ' $' + J.unitPrice(ord0));

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
    for (const o of r) if (barred(o.car) || barredOut.includes(o.car) || o.cap !== JIM.capPerRefresh[J.capKey(o.car)] || !JIM.qty[J.capKey(o.car)].includes(o.qty) || o.qty > o.cap || o.stock * o.qty > o.cap || o.stock * o.qty < o.cap - o.qty + 1 || (o.key && o.hot) || o.first < 1) bad++;
  }
  check(bad === 0, 'in 400 days: no barred car, bundles fit the cap per refresh (common 5, uncommon 5, epic 2, legendary 1, key 1) and the stock is cap / bundle, every price at least $1');
  check(size === 0 && dup === 0 && hots === 0 && legendHot === 0, 'in 400 days: ' + JIM.slots + ' distinct cars, exactly one hot deal, never a legendary');
  check(sets.size > 380, 'the days differ (' + sets.size + ' different sets in 400 days)');
  const seen = new Set(); for (let d = 0; d < 400; d++) rotation(day(d)).forEach(o => seen.add(o.id));
  check(seen.size >= everyone.length * 0.9, 'over 400 days Jim shows ' + seen.size + ' of the ' + everyone.length + ' pool cars');
  check(rotation(day(0), { cars: [] }).length === 0 && Jim.offers({ cars: [] }).length === 0, 'an empty pool: no offers, no crash');
  check(rotation(day(0), { cars: Cars.CARS.slice(0, 2) }).length <= 2, 'a pool of two: at most two offers');
  const hot = a.find(o => o.hot);
  check(bundlePrice(hot, hot.qty, 0) < Math.ceil(hot.unit * hot.qty) && Math.abs(bundlePrice(hot, hot.qty, 0) / Math.ceil(hot.unit * hot.qty) - (1 - JIM.hotOff)) < 0.05, 'the hot deal is ' + Math.round(JIM.hotOff * 100) + '% off');

  // ---- the key cars ----
  let keyDays = 0, keyOffers = 0;
  for (let d = 0; d < 1000; d++) { const k = rotation(day(d)).filter(o => o.key).length; if (k) keyDays++; keyOffers += k; }
  check(keyDays > 50 && keyDays < 500, 'key cars are rare: on ' + keyDays + ' of 1000 days at least one is on the stall (' + keyOffers + ' offers; weight ' + JIM.weight.key + ' of ' + Object.values(JIM.weight).reduce((n, w) => n + w, 0) + ')');
  const kOffer = rotation(day(0), { force: ['rocketfin', 'swancar'] }).filter(o => o.key);
  check(kOffer.length === 2 && kOffer.every(o => !o.hot && o.cap === 1 && o.qty === 1 && o.stock === 1 && o.unit === J.unitPrice(o.car)), 'a key car can be put on the stall (force): never the hot deal, a cap of 1 per refresh');
  const k1 = kOffer[0];
  check(needed(k1.car, 0) === 20, 'a key car needs 20 blueprints for max ECU');
  check(JIM.capPerRefresh.common === 5 && JIM.capPerRefresh.uncommon === 5 && JIM.capPerRefresh.epic === 2 && JIM.capPerRefresh.legendary === 1 && JIM.capPerRefresh.bespoke === 1, 'the caps per refresh are the owner\'s: 5, 5, 2, 1, 1');
  check(!('dayCap' in JIM) && !('keyCap' in JIM) && !('stock' in JIM), 'the old daily caps and bundle stock are gone from the JIM table');

  // ---- prices ----
  const plain = a.find(o => !o.hot);
  const p0 = bundlePrice(plain, plain.qty, 0), p1 = bundlePrice(plain, plain.qty, 1), p2 = bundlePrice(plain, plain.qty, 2);
  check(p0 === Math.ceil(plain.unit * plain.qty) && p1 > p0 && p2 > p1 && Math.abs(p1 / p0 - (1 + JIM.rise)) < 0.02, 'the price rises with each bundle bought today (' + p0 + ', ' + p1 + ', ' + p2 + ')');
  const d0 = day(0);
  const state = (n, d = d0, slot = 0, ref = 0, r = 0) => ({ day: d, slot, ref, r, n });
  fresh();
  const money = 100000;
  const view = (o, st, m = money, blueprints) => viewOf(o, { day: d0, state: st, money: m, blueprints });
  check(a.every(o => view(o, {}).why === null), 'a fresh day and a full bank: every offer can be bought');
  check(view(plain, {}, p0 - 1).why === 'short' && view(plain, {}, p0 - 1).need === 1 && view(plain, {}, p0).why === null, 'one dollar short: "short" by exactly $1; the exact price is enough');
  check(view(plain, {}, 0).why === 'short', 'an empty bank: short');
  check(view(plain, state({ [plain.id]: plain.stock })).why === 'sold' && view(plain, state({ [plain.id]: plain.stock - 1 })).why === null, 'the stock: sold out when its bundles have all gone, not before');
  check(view(plain, state({ [plain.id]: 1 })).price === p1, 'the price shown after one purchase is the risen one');
  check(view(plain, state({ [plain.id]: 3 }, day(-1))).why === null && view(plain, state({ [plain.id]: 3 }, day(-1))).price === p0, 'the counts of another day are void (price back to the first)');
  const x = Ecu.x(plain.car), max = Ecu.max(plain.car), full = (Ecu.isBlueprint(plain.car) ? max : max - 1) * x;
  check(needed(plain.car, 0) === full && needed(plain.car, full) === 0 && needed(plain.car, full + 3) === 0, 'blueprints needed to max: ' + full + ' for ' + plain.car.name);
  check(view(plain, {}, money, full).why === 'maxed', 'a car at its max ECU is "maxed", not for sale');
  const cut = view(plain, {}, money, full - 1);
  check(cut.qty === 1 && cut.cut === (plain.qty > 1 ? 'need' : null) && cut.price === bundlePrice(plain, 1, 0), 'a bundle is cut to what the car needs (1 left: x1 at the price of one)');

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
  check(Ecu.blueprints(first.id) === had + first.qty && Progress.data.jimBuys.day === today && Progress.data.jimBuys.n[first.id] === 1, 'and gives ' + first.qty + ' blueprints and counts them in the save');
  check(done.after.bp === done.before.bp + first.qty, 'it reports where the blueprints stood before and after');
  const again = Jim.offers().find(o => o.id === first.id);
  check(again.bought === 1 && again.left === first.stock - 1 && again.price === bundlePrice(first, first.qty, 1), 'the offer remembers it: one fewer in stock, a dearer price');
  // sell the offer out
  Progress.data.money = 100000;
  while (Jim.offers().find(o => o.id === first.id).why === null) { if (!Jim.buy(first.id).ok) break; }
  const out = Jim.offers().find(o => o.id === first.id);
  check(out.why === 'sold' || out.why === 'maxed', 'it sells out (' + out.why + ') and then refuses: ' + Jim.buy(first.id).why);
  // a whole stall bought out: each offer sells at most its cap per refresh
  fresh(); Progress.data.money = 1e7;
  const sold = {};
  for (const o of Jim.offers()) { while (Jim.offers().find(v => v.id === o.id).why === null) { const r = Jim.buy(o.id); sold[o.id] = (sold[o.id] || 0) + r.qty; } }
  check(Jim.offers().every(o => sold[o.id] <= o.cap && (o.why === 'sold' || o.why === 'maxed')), 'buying everything sells at most the cap of each car (' + Jim.offers().map(o => (sold[o.id] || 0) + '/' + o.cap).join(' ') + ')');
  // the rotation: every 6 local hours (00:00, 06:00, 12:00, 18:00)
  const L = (y, mo, d, h, mi = 0) => new Date(y, mo, d, h, mi).getTime();
  Events.now = () => L(2026, 9, 14, 10, 30);
  const next = Jim.nextAt();
  check(next === L(2026, 9, 14, 12), 'at 10:30 the next stock is at 12:00 (in ' + Math.round((next - Events.now()) / 60e3) + ' min)');
  Events.now = () => L(2026, 9, 14, 20);
  check(Jim.nextAt() === L(2026, 9, 15, 0), 'at 20:00 the next stock is at the next midnight');
  const at = (t) => { Events.now = () => t; return Jim.offers(); };
  const ids = (o) => o.map(x => x.id).join();
  const s10 = at(L(2026, 9, 14, 6, 0)), s10b = at(L(2026, 9, 14, 11, 59)), s12 = at(L(2026, 9, 14, 12, 0)), s18 = at(L(2026, 9, 14, 18, 0)), s00 = at(L(2026, 9, 15, 0, 0));
  check(ids(s10) === ids(s10b) && ids(s10) !== ids(s12) && ids(s12) !== ids(s18) && ids(s18) !== ids(s00), 'the offers hold from 06:00 to 11:59 and change at 12:00, 18:00 and midnight');
  check(new Set([ids(at(L(2026, 9, 14, 0))), ids(s10), ids(s12), ids(s18)]).size === 4, 'four different sets in a local day');
  // a purchase: its stock and price rise are the slot's
  fresh(); Progress.data.money = 1e6;
  const a0 = at(L(2026, 9, 14, 6, 5)), o0 = a0.find(o => !o.key && !o.why);
  Jim.buy(o0.id);
  check(Jim.offers().find(o => o.id === o0.id).bought === 1 && Progress.data.jimBuys.slot === 1, 'a purchase is counted in its slot (slot 1)');
  const a1 = at(L(2026, 9, 14, 12, 5));
  check(a1.every(o => o.bought === 0 && o.left === o.stock), 'the next slot: full stock, first prices');

  // ---- REFRESH (Crazey Cash): a fresh draw, stock back, a flat cost, a daily limit ----
  fresh(); Progress.data.money = 1e6; Progress.data.shopCash = 12;
  at(L(2026, 9, 14, 7, 0));
  const r0 = Jim.offers(), info0 = Jim.refreshInfo();
  check(info0.cost === JIM.refreshCost && info0.ok && info0.left === JIM.refreshCap && JIM.refreshCap === 999 && JIM.refreshCost === 5, 'a refresh costs ' + JIM.refreshCost + ' Crazey Cash, and ' + JIM.refreshCap + ' a day are allowed');
  Jim.buy(r0.find(o => !o.why).id);
  const done1 = Jim.refresh(), r1 = Jim.offers();
  check(done1.ok && Progress.data.shopCash === 12 - JIM.refreshCost && ids(r1) !== ids(r0), 'a refresh takes ' + JIM.refreshCost + ' Crazey Cash and draws other offers');
  check(r1.every(o => o.bought === 0 && o.left === o.stock) && Progress.data.jimBuys.ref === 1 && Progress.data.jimBuys.r === 1, 'the refresh gives full stock and first prices back, and counts itself (slot 1, today 1)');
  check(ids(Jim.offers()) === ids(r1) && JSON.stringify(Jim.offers().map(o => [o.id, o.qty, o.hot, o.price])) === JSON.stringify(r1.map(o => [o.id, o.qty, o.hot, o.price])), 'the same offers on a reload (a fresh draw is seeded by date + slot + refresh count)');
  check(JSON.stringify(rotation('2026-10-14', { slot: 1, ref: 1 }).map(o => o.id)) === JSON.stringify(rotation('2026-10-14', { slot: 1, ref: 1 }).map(o => o.id)) && ids(rotation('2026-10-14', { slot: 1, ref: 1 })) !== ids(rotation('2026-10-14', { slot: 1, ref: 2 })) && ids(rotation('2026-10-14', { slot: 1, ref: 0 })) === ids(rotation('2026-10-14', { slot: 1 })), 'the seed: ref 1 is always the same, ref 2 another, ref 0 the slot\'s own draw');
  Progress.data.shopCash = 12; Jim.refresh(); Jim.refresh();
  const short = Jim.refreshInfo(), kept = Progress.data.shopCash;
  check(Progress.data.shopCash === 2 && short.why === 'short' && short.need === JIM.refreshCost - 2 && !Jim.refresh().ok && Progress.data.shopCash === kept, 'with too little Crazey Cash: "short" by exactly what is missing, nothing taken');
  Progress.data.shopCash = 1e6; Progress.data.jimBuys = { day: Jim.day(), slot: 1, ref: 5, r: JIM.refreshCap, n: {} };
  check(Jim.refreshInfo().why === 'limit' && !Jim.refresh().ok && Progress.data.shopCash === 1e6 && Jim.refreshInfo().left === 0, 'at the daily limit (' + JIM.refreshCap + '): refused, nothing taken');
  Progress.data.jimBuys = { day: Jim.day(), slot: 1, ref: 3, r: 7, n: {} };
  const reload = JSON.parse(JSON.stringify(Progress.data.jimBuys)); Progress.data.jimBuys = reload;
  check(Jim.refreshInfo().done === 7 && Jim.refreshInfo().left === JIM.refreshCap - 7, 'the count of refreshes today is kept (7)');
  const before6 = ids(Jim.offers()); at(L(2026, 9, 14, 12, 5));
  check(Jim.refreshInfo().done === 7 && ids(Jim.offers()) === ids(rotation('2026-10-14', { slot: 2 })) && ids(Jim.offers()) !== before6, 'at the next 6-hour slot the refresh seed starts over (the slot\'s own draw), the day\'s refresh count stays');
  at(L(2026, 9, 15, 0, 5));
  check(Jim.refreshInfo().done === 0, 'at the next local day the count of refreshes is 0');
  // the exploit, in numbers: Crazey Cash per blueprint if everything on every refresh were bought
  let capSum = 0; for (let d = 0; d < 300; d++) capSum += rotation(day(d), { ref: 1 }).reduce((n, o) => n + o.cap, 0);
  console.log('  info  a refresh offers ' + (capSum / 300).toFixed(1) + ' blueprints on average (the caps summed): ' + (JIM.refreshCost / (capSum / 300)).toFixed(2) + ' Crazey Cash a blueprint, prices back to the first each time');
  // a clock set backwards: the earlier slot's offers again (the counts of the later slot are void)
  fresh(); Progress.data.money = 1e6;
  const late = at(L(2026, 9, 14, 19, 0)), lateIds = ids(late);
  Jim.buy(late.find(o => !o.why).id);
  const early = at(L(2026, 9, 14, 7, 0));
  check(ids(early) !== lateIds && early.every(o => o.bought === 0), 'a clock set back to 07:00: that slot\'s offers, no counts of the later slot');
  check(ids(at(L(2026, 9, 14, 19, 0))) === lateIds, 'and forward again: the 18:00 slot\'s offers, the same as before');
  // a day with a clock change (the boundaries stay at the local 00:00, 06:00, 12:00, 18:00)
  const tzOk = (() => { try { process.env.TZ = 'America/New_York'; return new Date(2026, 2, 8, 12).getTimezoneOffset() === 240 && new Date(2026, 2, 7, 12).getTimezoneOffset() === 300; } catch { return false; } })();
  if (tzOk) {
    check(J.nextSlot(L(2026, 2, 8, 1, 59)) === L(2026, 2, 8, 6) && (L(2026, 2, 8, 6) - L(2026, 2, 8, 0)) === 5 * 3600e3, 'spring-forward day (New York): the 06:00 stock comes 5 real hours after midnight');
    check(J.nextSlot(L(2026, 10, 1, 1, 30)) === L(2026, 10, 1, 6) && (L(2026, 10, 1, 6) - L(2026, 10, 1, 0)) === 7 * 3600e3, 'fall-back day: the 06:00 stock comes 7 real hours after midnight');
    let walk = L(2026, 2, 8, 0), seenSlots = [];
    for (let i = 0; i < 4; i++) { seenSlots.push(J.slotOf(walk).slot); walk = J.nextSlot(walk); }
    check(seenSlots.join() === '0,1,2,3' && J.slotOf(walk).day === '2026-03-09' && J.slotOf(walk).slot === 0, 'on the spring-forward day the four slots follow in order, then the next day\'s slot 0');
    let strictly = true, t = L(2026, 2, 7, 0);
    for (let i = 0; i < 12; i++) { const n2 = J.nextSlot(t); if (!(n2 > t)) strictly = false; t = n2; }
    check(strictly, 'the next stock is always later than now, across the clock change');
  } else console.log('  skip  (no time zone switch here: the clock-change days)');
  process.env.TZ = '';
  // ---- the save ----
  const codeOf = (extra) => 'DR1.' + Buffer.from(JSON.stringify({ unlocked: 3, cars: ['commuter'], ...extra })).toString('base64');
  check(Progress.importCode(codeOf({ jimBuys: { day: d0, slot: 2, ref: 4, r: 11, n: { sleeper: 2, bad: 'x', 'X Y': 1, huge: 500 }, bp: 4, k: { sixteen: 2 } } })) && JSON.stringify(Progress.data.jimBuys) === JSON.stringify({ day: d0, slot: 2, ref: 4, r: 11, n: { sleeper: 2 } }),
    'a save code: junk counts are dropped (only the whole, sensible ones kept)');
  check(Progress.importCode(codeOf({})) && JSON.stringify(Progress.data.jimBuys) === '{}', 'a code from before (no jimBuys): none, no crash');
  check(Progress.importCode(codeOf({ jimBuys: { day: 'yesterday', n: { sleeper: 1 } } })) && JSON.stringify(Progress.data.jimBuys) === '{}' && Progress.importCode(codeOf({ jimBuys: [1, 2] })) && JSON.stringify(Progress.data.jimBuys) === '{}', 'a bad day or a bad shape: none');
  Progress.noSave = true;
  fresh(); Progress.data.jimBuys = { day: d0, slot: 3, ref: 999, r: 999, n: { sleeper: 2, hothatch: 1, mini: 3, towtruck: 1, goddess: 1, wedge: 2 } };
  const bytes = encodeURIComponent(JSON.stringify(Progress.data.jimBuys)).length;
  check(bytes < 260, 'a full day of purchases is ' + bytes + ' bytes in the cookie (six cars; the cookie keeps ' + 3600 + ')');
  console.log('  info  jimBuys in the cookie: empty ' + encodeURIComponent(JSON.stringify({})).length + ' B, a full day ' + bytes + ' B');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
