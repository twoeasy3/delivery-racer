// ============================================================================
// CRAZEY JIM'S BLUEPRINT STALL - the rules (CHECKLIST item 243; the screen is render/jimshop.js). Jim, who runs the car
// lot, sells BLUEPRINTS for tip money (the bank, whole dollars): a few OFFERS a day, drawn from a POOL, the same all day
// and on every reload (seeded by the player's LOCAL date: no server), new at local midnight.
// THE POOL: exactly the ordinary cars a Standard pack can drop as a blueprint (packs.js pools().evergreen: a rarity from
// the tiers, not noPacks, not Bespoke, not an event car, not earned / super / the Tank). NEVER sold, whatever else changes:
// the Bespoke key cars' (concept) blueprints (a concept car's key needs max ECU = 20 of them: that economy is the packs'),
// event cars, noPacks cars. check: scripts/.jimshop-check.mjs.
// THE OFFER: a car, a quantity (1, 3 or 5, by rarity), a stock (bundles a day: 3 / 2 / 1 by quantity), a unit price
// (basis x k(rarity)), and one HOT DEAL a day (30% off). The price rises with each bundle of THE SAME OFFER bought today:
// price = qty x unit x (hot ? 0.7 : 1) x (1 + RISE x bought). Jim also sells at most DAY_CAP blueprints a day in all.
// A bundle is cut to what the car still needs to reach its max ECU (and priced for that), and a car at its max is not for sale.
// THE SAVE: Progress.data.jimBuys = { day, n: { car id: bundles bought today }, bp: blueprints bought today } (progress.js
// cleanJim); another day's counts are void. This file is NOT in the replay rules fingerprint (vite.config.js NOT_RULES):
// a run never reads it. The pure functions take what they need as arguments; Jim.* reads the save and the clock.
// ============================================================================
import { Progress } from './progress.js';
import { Ecu } from './ecu.js';
import { Events } from './events.js';
import { pools, rarityOf } from './packs.js';
import { localDay, nextMidnight } from './shop.js';

export const JIM = {
  // how likely each rarity is to be drawn for a slot (of those with cars left)
  weight: { common: 45, uncommon: 33, epic: 18, legendary: 4 },
  // the price of one blueprint, as a share of the car's BASIS price (below)
  k: { common: 0.17, uncommon: 0.20, epic: 0.24, legendary: 0.32 },
  // the bundle sizes a rarity may be sold in (the rarer, the smaller), and how many bundles of each Jim has a day
  qty: { common: [1, 3, 5], uncommon: [1, 3, 5], epic: [1, 3], legendary: [1] },
  stock: { 1: 3, 3: 2, 5: 1 },
  slots: 6,        // offers a day
  hotOff: 0.3,     // the hot deal's discount
  rise: 0.5,       // each bundle bought today raises that offer's price by this share of its first price
  dayCap: 10,      // blueprints Jim sells in a day, in all
  confirmAt: 250,  // a bundle costing this much (or half the bank) asks first
  // the BASIS price of a car: its car lot price; a blueprint car (no price) the average of the lot cars of its stars
  basis: { g1: 100, g2: 200, g3: 320, g4: 470, g5: 730, b1: 300, b2: 460, b3: 730, b4: 1000, b5: 1300 },
};

export const basisOf = (car) => car.price > 0 ? car.price : JIM.basis[(car.blue ? 'b' : 'g') + Math.min(5, Math.max(1, car.tier || 1))];
export const unitPrice = (car, rarity = rarityOf(car)) => Math.max(1, Math.round(basisOf(car) * JIM.k[rarity]));

// a car Jim may NEVER sell (belt and braces: pools() already leaves these out)
export const barred = (car) => !car || !!(car.bespoke || car.event || car.noPacks || car.earned || car.super || car.tank || car.off || car.keyAvailable === false);

// ---- the rotation: a seeded draw, the same for a given day -------------------------------------------------------
const hash = (text) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// the cars Jim may sell, by rarity: { common: [car], ... } (cars: a list for a check, in place of the roster)
export const pool = ({ cars } = {}) => {
  const { evergreen } = pools(cars ? { cars } : {});
  return Object.fromEntries(Object.keys(JIM.weight).map(r => [r, (evergreen[r] || []).filter(car => !barred(car))]));
};

// the day's offers: [{ id (the car's), car, rarity, qty, stock, unit (one blueprint), hot, first (the bundle's first price) }]
export const rotation = (day, { cars } = {}) => {
  const left = Object.fromEntries(Object.entries(pool({ cars })).map(([r, list]) => [r, [...list]]));
  const rand = mulberry(hash('crazey-jim|' + day));
  const out = [];
  for (let slot = 0; slot < JIM.slots; slot++) {
    const rarities = Object.keys(JIM.weight).filter(r => left[r].length);
    if (!rarities.length) break;
    let roll = rand() * rarities.reduce((n, r) => n + JIM.weight[r], 0), rarity = rarities[rarities.length - 1];
    for (const r of rarities) { roll -= JIM.weight[r]; if (roll < 0) { rarity = r; break; } }
    const car = left[rarity].splice(Math.floor(rand() * left[rarity].length), 1)[0];
    const sizes = JIM.qty[rarity], qty = sizes[Math.floor(rand() * sizes.length)];
    out.push({ id: car.id, car, rarity, qty, stock: JIM.stock[qty], unit: unitPrice(car, rarity), hot: false });
  }
  if (out.length) { // one hot deal, never a legendary (they are dear enough), and a bundle of more than one
    const plain = out.filter(o => o.rarity !== 'legendary'), many = plain.filter(o => o.qty > 1);
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

// ---- the day's counts ----------------------------------------------------------------------------------------------
// state: Progress.data.jimBuys. A count of another day is nothing.
export const todays = (state, day) => (state && state.day === day ? { n: state.n || {}, bp: state.bp || 0 } : { n: {}, bp: 0 });

// one offer as THIS player sees it today: { ...offer, bought, left (bundles), qty (cut to what the car needs), price, was,
// hot, why (null: can buy; else 'maxed' | 'sold' | 'cap' | 'short'), need (dollars short), have (blueprints), progress }
export const viewOf = (offer, { day, state, money, blueprints = Ecu.blueprints(offer.id), maxed = needed(offer.car, blueprints) === 0 }) => {
  const t = todays(state, day), bought = t.n[offer.id] || 0, left = Math.max(0, offer.stock - bought);
  const room = Math.max(0, JIM.dayCap - t.bp), need = needed(offer.car, blueprints);
  const qty = Math.max(0, Math.min(offer.qty, need, room));
  const price = bundlePrice(offer, qty || offer.qty, bought);
  const was = offer.hot ? wasPrice(offer, qty || offer.qty, bought) : null;
  let why = null;
  if (maxed || need === 0) why = 'maxed';
  else if (left === 0) why = 'sold';
  else if (room === 0) why = 'cap';
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
  // when the next stock arrives (local midnight)
  nextAt: () => nextMidnight(Events.now()),
  // the offers as this player sees them: [view]
  offers({ cars } = {}) {
    const day = this.day();
    return rotation(day, { cars }).map(o => viewOf(o, { day, state: Progress.data.jimBuys, money: Math.floor(Progress.data.money) }));
  },
  today() { return todays(Progress.data.jimBuys, this.day()); },
  // buy an offer's bundle: { ok, why, qty, price, before, after } (nothing is taken unless ok)
  buy(id, { cars } = {}) {
    const view = this.offers({ cars }).find(o => o.id === id);
    if (!view) return { ok: false, why: 'gone' };
    if (view.why) return { ok: false, why: view.why, view };
    const before = stand(view.car), day = this.day();
    const t = todays(Progress.data.jimBuys, day), n = { ...t.n, [view.id]: (t.n[view.id] || 0) + 1 };
    Progress.data.money = Math.max(0, Progress.data.money - view.price);
    Progress.data.jimBuys = { day, n, bp: t.bp + view.qty };
    Ecu.addBlueprints(view.id, view.qty); // (saves: the money and the counts with it)
    const after = stand(view.car);
    window.dispatchEvent(new Event('progresschange'));
    return { ok: true, qty: view.qty, price: view.price, view, before, after };
  },
};
