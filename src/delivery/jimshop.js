// ============================================================================
// CRAZEY JIM'S BLUEPRINT STALL - the rules (CHECKLIST item 249; the section of the Shop is render/jimshop.js). Jim, who runs the
// car lot, sells BLUEPRINTS for tip money (the bank, whole dollars): 6 OFFERS drawn from a POOL, the same for a whole SLOT and
// on every reload, new every 6 HOURS (the owner, 14-Oct): four slots a local day, starting at the local clock's 00:00, 06:00,
// 12:00 and 18:00, seeded by the local date + the slot (no server). A SLOT's stock and price rises reset with its new offers;
// the daily blueprint cap (DAY_CAP) and each key car's daily cap stay per LOCAL DAY (jimBuys: n by slot, bp and k by day).
// THE POOL (the owner, 14-Oct: first "all Evergreen blueprints, including the ones for Key Cars", then "remove all the key car blueprints
// except the ones already available in standard packs"): exactly the blueprints the STANDARD pack can drop (packs.js poolOf of
// packs.json standard): the 56 ordinary evergreen cars and the 5 key cars whose blueprints it holds (rocketfin, swancar, solarracer,
// moonrover, monowheel). Jim sells BLUEPRINTS only, never a key. Out: every key car not in the Standard pack's pool (silvercomet, snocat,
// hotdog, horseshoe and the six concept cars: noPacks), earned and super cars, the Tank, `off` cars, and the noPacks cars that are not
// key cars (the Blower, Coach, City EV, Coupe Cross).
// KEY CARS are dear and rare (the economy warning: a concept car's key needs max ECU = 20 blueprints): JIM.keyMult on the price,
// JIM.keyCap blueprints a day of each, JIM.weight.key for how often one is drawn. check: scripts/.jimshop-check.mjs.
// THE OFFER: a car, a quantity (1, 3 or 5, by rarity), a stock (bundles a day: 3 / 2 / 1 by quantity), a unit price
// (basis x k(rarity)), and one HOT DEAL a day (30% off). The price rises with each bundle of THE SAME OFFER bought today:
// price = qty x unit x (hot ? 0.7 : 1) x (1 + RISE x bought). Jim also sells at most DAY_CAP blueprints a day in all.
// A bundle is cut to what the car still needs to reach its max ECU (and priced for that), and a car at its max is not for sale.
// THE SAVE: Progress.data.jimBuys = { day, slot, n: { car id: bundles bought this slot }, bp: blueprints bought today, k: { key
// car id: its blueprints bought today } } (progress.js cleanJim); another slot's n and another day's bp / k are void. This file is NOT in the replay rules fingerprint (vite.config.js NOT_RULES):
// a run never reads it. The pure functions take what they need as arguments; Jim.* reads the save and the clock.
// ============================================================================
import { Progress } from './progress.js';
import { Ecu } from './ecu.js';
import { Events } from './events.js';
import { Packs, poolOf, rarityOf } from './packs.js';
import { localDay } from './shop.js';

export const JIM = {
  // how likely each rarity is to be drawn for a slot (of those with cars left)
  weight: { common: 45, uncommon: 33, epic: 18, legendary: 4, key: 5 }, // (key: all the key cars together: about 5% a slot, so most days show none or one)
  // the price of one blueprint, as a share of the car's BASIS price (below)
  k: { common: 0.17, uncommon: 0.20, epic: 0.24, legendary: 0.32 },
  // KEY CARS (the Bespoke / concept cars): the basis price by their card rarity (they have no price), the price x keyMult on top
  // of the share above, the blueprints a day of each (keyCap: also its stock), and the bundle sizes
  keyBasis: { epic: 1000, legendary: 1300 }, keyMult: 2, keyCap: 2, keyQty: [1, 2],
  // the bundle sizes a rarity may be sold in (the rarer, the smaller), and how many bundles of each Jim has a day
  qty: { common: [1, 3, 5], uncommon: [1, 3, 5], epic: [1, 3], legendary: [1] },
  stock: { 1: 3, 3: 2, 5: 1 },
  slots: 6,        // offers at a time
  slotHours: 6,    // a rotation every this many local hours (the clock's 00:00, 06:00, 12:00, 18:00)
  hotOff: 0.3,     // the hot deal's discount
  rise: 0.5,       // each bundle bought today raises that offer's price by this share of its first price
  dayCap: 10,      // blueprints Jim sells in a day, in all
  confirmAt: 250,  // a bundle costing this much (or half the bank) asks first
  // the BASIS price of a car: its car lot price; a blueprint car (no price) the average of the lot cars of its stars
  basis: { g1: 100, g2: 200, g3: 320, g4: 470, g5: 730, b1: 300, b2: 460, b3: 730, b4: 1000, b5: 1300 },
};

export const isKey = (car) => !!car && !!car.bespoke;
export const basisOf = (car) => isKey(car) ? JIM.keyBasis[rarityOf(car)] || JIM.keyBasis.legendary : car.price > 0 ? car.price : JIM.basis[(car.blue ? 'b' : 'g') + Math.min(5, Math.max(1, car.tier || 1))];
export const unitPrice = (car, rarity = rarityOf(car)) => Math.max(1, Math.round(basisOf(car) * JIM.k[rarity] * (isKey(car) ? JIM.keyMult : 1)));

// a car Jim may NEVER sell: not a blueprint car at all (earned, super, the Tank, off), or in no regular pack (noPacks)
export const barred = (car) => !car || !!(car.earned || car.super || car.tank || car.off || car.noPacks || !rarityOf(car));

// ---- the rotation: a seeded draw, the same for a given day -------------------------------------------------------
const hash = (text) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// the cars Jim may sell, by group: { common, uncommon, epic, legendary: the ordinary evergreen cars, key: the key cars } (cars: a list for a
// check, in place of the roster). It is the STANDARD PACK's own blueprint pool (packs.js poolOf, the owner, 14-Oct: "only the ones already
// available in standard packs"), so it follows the packs by itself: the ordinary evergreen cars, and the key cars whose blueprints the
// Standard pack can drop (its `bespokeBlueprints`: today the five Bespoke key cars with a Legendary card). Never its keys (the Bespoke rarity).
export const pool = ({ cars } = {}) => {
  const standard = poolOf(Packs.data.packs.standard, cars ? { cars } : {});
  const out = { common: [], uncommon: [], epic: [], legendary: [], key: [] };
  for (const [rarity, list] of Object.entries(standard)) {
    if (rarity === 'bespoke') continue; // (the keys themselves: never sold)
    for (const car of list) if (!barred(car)) out[isKey(car) ? 'key' : rarity].push(car);
  }
  return out;
};

// the day's offers: [{ id (the car's), car, rarity, qty, stock, unit (one blueprint), hot, first (the bundle's first price) }]
const offerOf = (car, rand) => {
  const key = isKey(car), rarity = rarityOf(car);
  const sizes = key ? JIM.keyQty.filter(n => n <= JIM.keyCap) : JIM.qty[rarity], qty = sizes[Math.floor(rand() * sizes.length)] || 1;
  return { id: car.id, car, rarity, qty, key, stock: key ? Math.max(1, Math.floor(JIM.keyCap / qty)) : JIM.stock[qty], unit: unitPrice(car, rarity), hot: false };
};
export const rotation = (day, { cars, force = [], slot = 0 } = {}) => {
  const left = Object.fromEntries(Object.entries(pool({ cars })).map(([r, list]) => [r, [...list]]));
  const rand = mulberry(hash('crazey-jim|' + day + '|' + slot));
  const out = [];
  for (let slot = 0; slot < JIM.slots; slot++) {
    const rarities = Object.keys(JIM.weight).filter(r => left[r].length);
    if (!rarities.length) break;
    let roll = rand() * rarities.reduce((n, r) => n + JIM.weight[r], 0), rarity = rarities[rarities.length - 1];
    for (const r of rarities) { roll -= JIM.weight[r]; if (roll < 0) { rarity = r; break; } }
    const car = left[rarity].splice(Math.floor(rand() * left[rarity].length), 1)[0];
    out.push(offerOf(car, rand));
  }
  // (a check or a demo may ask for cars to be on the stall: each takes the place of the second slot on)
  const all = Object.values(pool({ cars })).flat();
  force.forEach((id) => {
    const car = all.find(c => c.id === id);
    if (!car || out.some(o => o.id === id)) return;
    let at = force.length < out.length ? 1 : 0; // (the first slot stays the draw's, unless every slot is asked for)
    while (at < out.length - 1 && force.includes(out[at].id)) at++; // (never over a car asked for)
    out[Math.min(at, out.length - 1)] = offerOf(car, rand);
  });
  if (out.length) { // one hot deal, never a legendary (they are dear enough), and a bundle of more than one
    const plain = out.filter(o => o.rarity !== 'legendary' && !o.key), many = plain.filter(o => o.qty > 1);
    const fit = many.length ? many : plain.length ? plain : out, hot = fit[Math.floor(rand() * fit.length)];
    hot.hot = true;
  }
  for (const o of out) o.first = bundlePrice(o, o.qty, 0);
  return out;
};

// the price of a bundle of `qty` of an offer's blueprints when `bought` bundles of it have gone today
export const bundlePrice = (offer, qty, bought) => Math.max(1, Math.ceil(offer.unit * qty * (offer.hot ? 1 - JIM.hotOff : 1) * (1 + JIM.rise * bought)));
// the same without the hot deal's discount (the old price, struck through)
export const wasPrice = (offer, qty, bought) => Math.ceil(offer.unit * qty * (1 + JIM.rise * bought));

// the blueprints a car still needs to reach its max ECU (0: it is there)
export const needed = (car, have = Ecu.blueprints(car.id)) => {
  if (Ecu.maxed(car)) return 0;
  const max = Ecu.max(car), x = Ecu.x(car), full = (Ecu.isBlueprint(car) ? max : max - 1) * x;
  return Math.max(0, full - have);
};

// ---- the counts ----------------------------------------------------------------------------------------------------------------
// the SLOT of a moment: the local day, and which quarter of it (0..3). nextSlot: when the next begins (the local clock's next 6 hours: a
// day with a clock change has slots of 5 or 7 real hours, the boundaries stay at the local 00:00 / 06:00 / 12:00 / 18:00)
export const slotOf = (t) => { const d = new Date(t); return { day: localDay(t), slot: Math.floor(d.getHours() / JIM.slotHours) }; };
export const nextSlot = (t) => {
  const d = new Date(t), next = (Math.floor(d.getHours() / JIM.slotHours) + 1) * JIM.slotHours;
  let at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), next, 0, 0, 0).getTime();
  while (at <= t) at += 36e5; // (a nonexistent local hour jumps forward: never a boundary in the past)
  return at;
};
// state: Progress.data.jimBuys. n is of this slot only; bp and k are of this day only. Anything else is nothing.
export const todays = (state, day, slot = 0) => {
  const sameDay = !!state && state.day === day;
  return { n: sameDay && state.slot === slot ? state.n || {} : {}, bp: sameDay ? state.bp || 0 : 0, k: sameDay ? state.k || {} : {} };
};

// one offer as THIS player sees it today: { ...offer, bought, left (bundles), qty (cut to what the car needs), price, was,
// hot, why (null: can buy; else 'maxed' | 'sold' | 'cap' | 'short'), need (dollars short), have (blueprints), progress }
export const viewOf = (offer, { day, slot = 0, state, money, blueprints = Ecu.blueprints(offer.id), maxed = needed(offer.car, blueprints) === 0 }) => {
  const t = todays(state, day, slot), bought = t.n[offer.id] || 0, left = Math.max(0, offer.stock - bought);
  const room = Math.max(0, JIM.dayCap - t.bp), need = needed(offer.car, blueprints);
  const keyRoom = offer.key ? Math.max(0, JIM.keyCap - (t.k[offer.id] || 0)) : Infinity; // (a key car: so many of its blueprints a day)
  const qty = Math.max(0, Math.min(offer.qty, need, room, keyRoom));
  const price = bundlePrice(offer, qty || offer.qty, bought);
  const was = offer.hot ? wasPrice(offer, qty || offer.qty, bought) : null;
  let why = null;
  if (maxed || need === 0) why = 'maxed';
  else if (left === 0) why = 'sold';
  else if (room === 0 || keyRoom === 0) why = 'cap';
  else if (money < price) why = 'short';
  return { ...offer, bought, left, qty: qty || offer.qty, cut: qty > 0 && qty < offer.qty ? (qty === need ? 'need' : 'cap') : null, price, was, why, need: Math.max(0, price - money), have: blueprints, room };
};

// where a car's blueprints stand (with `add` more): { bp, ecu, max, toNext (per ECU), have (toward the next), unlocked }, as packs.js revealProgress
export const stand = (car, add = 0) => {
  const x = Math.max(1, Ecu.x(car) || 1), max = Math.max(1, Ecu.max(car) || 1), blueprint = Ecu.isBlueprint(car);
  const n = Ecu.blueprints(car.id) + add, steps = Math.floor(n / x);
  const ecu = Ecu.maxed(car) ? max : Math.min(max, blueprint ? steps : 1 + steps);
  return { bp: n, ecu, max, toNext: x, have: ecu >= max ? x : n % x, unlocked: blueprint ? ecu >= 1 || Progress.data.cars.includes(car.id) : Progress.owns(car.id) };
};

export const Jim = {
  day: () => localDay(Events.now()),
  slot: () => slotOf(Events.now()).slot,
  // when the next stock arrives (the next 00:00, 06:00, 12:00 or 18:00 local)
  nextAt: () => nextSlot(Events.now()),
  force: [], // (car ids put on the stall: ?demo=keycar, a check)
  // the offers as this player sees it: [view]
  offers({ cars } = {}) {
    const { day, slot } = slotOf(Events.now());
    return rotation(day, { cars, force: this.force, slot }).map(o => viewOf(o, { day, slot, state: Progress.data.jimBuys, money: Math.floor(Progress.data.money) }));
  },
  today() { const { day, slot } = slotOf(Events.now()); return todays(Progress.data.jimBuys, day, slot); },
  // buy an offer's bundle: { ok, why, qty, price, before, after } (nothing is taken unless ok)
  buy(id, { cars } = {}) {
    const view = this.offers({ cars }).find(o => o.id === id);
    if (!view) return { ok: false, why: 'gone' };
    if (view.why) return { ok: false, why: view.why, view };
    const before = stand(view.car), { day, slot } = slotOf(Events.now());
    const t = todays(Progress.data.jimBuys, day, slot), n = { ...t.n, [view.id]: (t.n[view.id] || 0) + 1 };
    const k = view.key ? { ...t.k, [view.id]: (t.k[view.id] || 0) + view.qty } : t.k;
    Progress.data.money = Math.max(0, Progress.data.money - view.price);
    Progress.data.jimBuys = { day, slot, n, bp: t.bp + view.qty, k };
    Ecu.addBlueprints(view.id, view.qty); // (saves: the money and the counts with it)
    const after = stand(view.car);
    window.dispatchEvent(new Event('progresschange'));
    return { ok: true, qty: view.qty, price: view.price, view, before, after };
  },
};
