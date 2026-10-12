// ============================================================================
// PACKS - card packs (the owner's design, 12-Oct: BLUEPRINTS-NOTES.md "Card packs", CHECKLIST item 115). A pack holds
// cards; a card is one blueprint of one car (ecu.js counts them and turns them into ECU levels), or, at the top, a
// car's KEY (a Bespoke card: the car is the player's to drive). Every number is in packs.json, the owner's to tune.
//   - Rarities, lowest to highest: common, uncommon, epic, legendary, bespoke.
//   - Which card is which rarity (rarityOf): a car's own `rarity` field first (the cars promoted from the idea lot:
//     epic, or legendary); else the garage ladder by star tier (packs.json ladder: 1 gold none, the starters; 2-4 gold
//     common; 5 gold and 1-3 blue uncommon; 4-5 blue epic); a 1-gold BLUEPRINT car is common (it must be obtainable).
//   - EVERGREEN cards are the ones always in the pool: every car of the roster with a card (the garage's own cars by
//     the ladder, the evergreen blueprint cars by their rarity), in every rarity but Bespoke. The roster is read when a
//     pack is drawn (cars.js CARS, and EVERGREEN_CARS should cars.js keep them apart), so a car added there is in the
//     pool with no edit here. Event cars (cars.js EVENT_CARS) are never evergreen: they come as FEATURED cards.
//   - BESPOKE cards are keys: the key of a BESPOKE KEY CAR (a car flagged `bespoke: true`: cars.js BESPOKE_CARS, and the
//     Silver Comet of EVENT_CARS) the player does not own yet. Only in the packs whose pool is 'all'. (Until 12-Oct the
//     Bespoke pool was every garage car with a price: the car lot's cars are no longer key cards, the owner.) A Bespoke
//     key car's BLUEPRINTS are cards of its own `rarity` (Legendary): never evergreen (a career pack has none); in the
//     packs whose kind says `bespokeBlueprints: true` (packs.json), and as a special pack's featured card.
//   - PACKS (one definition each, packs.json `packs`, by id: the owner, 12-Oct, PACK-DEFINITIONS-DRAFT.md): career
//     (evergreen only), daily (the free daily pack: evergreen, claimed once a day in the Shop), standard (5 cards), ten
//     (10, one Epic or better), and the special ones, each its own pack with its own event and featured cards (today
//     comet-special: a career-like pack with the featured mechanic: each slot but the last may upgrade, and when it does
//     each featured entry rolls its own chance; one card a slot, a hit picked from those that came up BY WEIGHT; a slot
//     that upgrades and hits none becomes a filler card of a higher rarity; the LAST slot is always a featured card,
//     picked BY WEIGHT: a guaranteed featured card of its TRUE rarity).
//   - FEATURED WEIGHTS (the owner, 12-Oct: "declare featured weights and display them on the What's Inside"): a featured
//     list holds car ids (weight 1) or { car, weight, key }: see featuredEntries below. In the FEATURED mechanic only, an
//     entry the player has EXHAUSTED (a blueprint car at its max ECU: "Car Maxed"; a key owned: "Key obtained") is out of
//     the draw and the others' weights are shifted (renormalised); the regular slots may still give a maxed car's
//     blueprint as a duplicate. A key never drops twice: an owned key nowhere, and at most once a pack.
// A pack is not part of a run: it is drawn with Math.random (or the dice a check hands in), never the run's seeded
// dice, and what an opened pack held is written into the save at once (its cards given, and a log of it).
// Where packs come from: Packs.grant(id). Each pack's own `givenBy` says what gives it free: `career` (the first delivery
// of some Career levels), `event` (a special event's stages and its grand prize); its `shop` block is its Shop offer
// (shop.js: a placeholder currency, with optional purchase limits). A pack given is OPENED AT ONCE: Packs.revealNow asks
// the reveal screen (render/packs.js) to open it; until it has, it is held in the save, and opened at the next menu.
// The Shop's one-line words for a pack are GENERATED from its rules (describePack: never stale); a `blurb` overrides.
// ============================================================================
import packData from './packs.json';
import eventData from './events.json';
import tierData from './tiers.json';
import * as Cars from './cars.js';
import { LEVELS, isRace } from './levels.js';
import { Progress } from './progress.js';
import { Ecu } from './ecu.js';
import { packIdOf, migrateHeld } from './packid.js';

export const RARITIES = Object.keys(packData.rarities); // (lowest first)
export const PACKS = packData.packs;
export const PACK_IDS = Object.keys(PACKS);
export const BUNDLES = packData.bundles || {};
// a pack's definition by id (an old key, 'special' or 'special:<event>', turned into today's id: packid.js); null: none
export const packOf = (id, from = null) => PACKS[packIdOf(id, from)] || null;
export { packIdOf };
const rank = (rarity) => RARITIES.indexOf(rarity);
// EVERY chance on the "What's inside" sheet, as words (the owner, 12-Oct): at most two decimals, trailing zeros dropped
// ("0.41%", "33.33%", "100%"), a chance above 0 that rounds below 0.01% "<0.01%", exactly 0 "0%". p: a share, 0..1
export const percent = (p) => {
  const v = Number(p) * 100;
  if (!(v > 0)) return '0%';
  if (v < 0.005) return '<0.01%';
  return Number(v.toFixed(2)) + '%';
};
export const rarityName = (rarity) => packData.rarities[rarity]?.name || rarity;
export const rarityColour = (rarity) => packData.rarities[rarity]?.colour || '#ffffff';
export const packName = (id) => packOf(id)?.name || id;

// the cars that can be on a card: the roster now (a car added to it is in the pool from then on)
// (the evergreen blueprint cars are cars.js FILLER_CARS: read as EVERGREEN_CARS alone, a name cars.js never had, they
// were left out of every pack until the contents sheet listed the pool, 12-Oct)
// (and the Bespoke key cars: the cards of their keys and their Legendary blueprints)
export const isBespokeCar = (car) => !!car && !!car.bespoke && !car.off;
export const roster = () => [...new Set([...(Cars.CARS || []), ...(Cars.FILLER_CARS || []), ...(Cars.EVERGREEN_CARS || []),
  ...(Cars.EVENT_CARS || []).filter(isBespokeCar), ...(Cars.BESPOKE_CARS || [])])];
// the rarity of a car's blueprint card, or null: it has none (a 1-gold starter, a car out of the tiers, the Tank)
export const rarityOf = (car) => {
  if (!car || car.earned || car.super || car.tank || car.off) return null;
  if (car.rarity && rank(car.rarity) >= 0 && car.rarity !== 'bespoke') return car.rarity;
  if (!(car.tier >= 1 && car.tier <= 5)) return null;
  if (car.evergreen && !car.blue && car.tier === 1) return packData.goldOneBlueprint || 'common';
  return packData.ladder[car.blue ? 'blue' : 'gold']?.[car.tier - 1] || null;
};
// a key car: one the garage sells (or a level gives); its key is what lets it be driven. A blueprint car (evergreen:
// true) has no key: its first blueprints unlock it (ecu.js)
export const isKeyCar = (car) => !!car && !car.evergreen && !car.tank && !car.earned && !car.super && car.tier >= 1;

// the pools: { evergreen: { rarity: [car...] }, bespoke: { rarity: [car...] } (the Bespoke key cars' blueprints, by
// their rarity: Legendary), keys: [car...] (the Bespoke key cars not owned) } (cars: a list in place of the roster, for
// a check; owned: whether a car is owned, for the keys). An event car that is not Bespoke is in none (featured only)
export const pools = ({ cars = roster(), owned = ownsNow } = {}) => {
  const evergreen = Object.fromEntries(RARITIES.filter(r => r !== 'bespoke').map(r => [r, []]));
  const bespoke = Object.fromEntries(RARITIES.filter(r => r !== 'bespoke').map(r => [r, []]));
  for (const car of cars) {
    const r = rarityOf(car);
    if (!r || !evergreen[r]) continue;
    if (isBespokeCar(car)) bespoke[r].push(car);
    else if (!(Cars.EVENT_CARS || []).includes(car)) evergreen[r].push(car);
  }
  const keys = cars.filter(car => isBespokeCar(car) && !owned(car.id));
  return { evergreen, bespoke, keys };
};
// a pack kind's cards by rarity, as draw() picks from them: the evergreen cards; with the kind's `bespokeBlueprints`
// the Bespoke key cars' blueprints too (each in its rarity); with pool 'all' the keys (the Bespoke rarity)
export const poolOf = (spec, { cars, owned } = {}) => {
  const { evergreen, bespoke, keys } = pools({ cars, owned });
  const out = Object.fromEntries(Object.entries(evergreen).map(([r, list]) => [r, [...list, ...(spec?.bespokeBlueprints ? bespoke[r] : [])]]));
  if (spec?.pool === 'all') out.bespoke = [...keys];
  return out;
};

// a featured blueprint card's rarity: its TRUE rarity (the owner, 12-Oct: "we should not promise 'Epic or better' in a
// featured card pack, just 'Guaranteed feature card'"): the car's card rarity (its own `rarity`, else the ladder: rarityOf),
// else packs.json featuredRarity (an event car with neither). A featured KEY card is Bespoke
export const featuredRarity = (car) => (car.rarity && rank(car.rarity) >= 0 && car.rarity !== 'bespoke' ? car.rarity : rarityOf(car) || packData.featuredRarity || 'legendary');

// ---- the save, as the featured mechanic reads it: a key owned, a car at its max ECU. The debug marks (?owned=, ?maxed=:
// Packs.markOwned / markMaxed, for a visit, never saved) count as well
export const ownsNow = (id) => !!Packs.markOwned?.has(id) || Progress.owns(id);
export const maxedNow = (car) => !!car && (!!Packs.markMaxed?.has(car.id) || (Ecu.max(car) > 0 && Ecu.reached(car) >= Ecu.max(car)));

// ---- FEATURED ENTRIES (the owner, 12-Oct: "declare featured weights and display them on the What's Inside. If the
// featured is Epic Legend Legend I would want them to be 1:1:1 so the Epics don't flood the packs. If the featured is
// Legend Legend Legend Bespoke I would want to tune the key chances"). A featured list (events.json special[].featured,
// packs.json events.featured, shop.json offers[].featured) holds, per entry, a car id (weight 1) or
// { "car": id, "weight": n, "key": true }: weight a positive number, RELATIVE (1:1:1 is equal; 3:3:3:1 gives the
// fourth a tenth); key: true makes the entry that car's Bespoke KEY card (a Bespoke key car only: cars.js `bespoke`),
// so a list can mix blueprint cards and a key. Normalised to { car (object), weight, key }; an entry that is not
// sound (no such car, a weight not > 0, a key of a car that is not Bespoke) is left out (events.js problems() says
// so), and an entry listed twice counts once (its first). A car object (older callers) is weight 1.
const entryOf = (x) => {
  if (x === null || x === undefined) return null;
  if (typeof x === 'string' || typeof x === 'number') { const car = Cars.carById(String(x)); return car ? { car, weight: 1, key: false } : null; }
  if (typeof x !== 'object') return null;
  if (!('car' in x) && x.id) return { car: x, weight: 1, key: false }; // (a car object)
  const car = x.car && typeof x.car === 'object' ? x.car : Cars.carById(String(x.car));
  const weight = x.weight === undefined ? 1 : Number(x.weight);
  if (!car || !(weight > 0) || !Number.isFinite(weight)) return null;
  if (x.key && !isBespokeCar(car)) return null;
  if (!x.key && x.amount !== undefined && !amountSound(x.amount)) return null;
  return { car, weight, key: !!x.key, ...(!x.key && x.amount !== undefined ? { amount: x.amount } : {}) };
};
// an entry's amount: a whole number >= 1, or [min, max] of them (as a pack kind's `amount`)
const amountSound = (v) => (Number.isInteger(v) && v >= 1) || (Array.isArray(v) && v.length === 2 && v.every(n => Number.isInteger(n) && n >= 1) && v[0] <= v[1]);
// an entry's own name: the car, "key" for a key, its amount when it has one ("Silver Comet x3")
export const entryName = (f) => f.car.name + (f.key ? ' key' : f.amount !== undefined ? ' x' + (Array.isArray(f.amount) ? f.amount.join('-') : f.amount) : '');
// one entry from another: a key by its car; a blueprint entry by its car and amount (the owner, 12-Oct: "multiple slots
// for featured cards of the same car, but with different amounts": the same car may be several entries)
const entryId = (f) => (f.key ? 'key:' + f.car.id : f.car.id + (f.amount !== undefined ? ':' + JSON.stringify(f.amount) : ''));
export const featuredEntries = (list) => {
  const out = [], seen = new Set();
  for (const x of Array.isArray(list) ? list : []) {
    const f = entryOf(x);
    if (!f) continue;
    const id = entryId(f);
    if (seen.has(id)) continue;
    seen.add(id); out.push(f);
  }
  return out;
};
// what is wrong with a featured list, as lines (none: sound). events.js problems() asks it
export const featuredProblems = (list) => {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return ['"featured" is not a list'];
  const out = [], seen = new Set();
  list.forEach((x, i) => {
    const at = 'featured entry ' + (i + 1) + ': ';
    const obj = !!x && typeof x === 'object';
    const id = obj ? x.car : x;
    const car = (typeof id === 'string' || typeof id === 'number') ? Cars.carById(String(id)) : null;
    if (!car) { out.push(at + JSON.stringify(x) + ' is not a car'); return; }
    if (obj) {
      const w = x.weight === undefined ? 1 : x.weight;
      if (typeof w !== 'number' || !Number.isFinite(w) || !(w > 0)) out.push(at + car.id + ': its weight ' + JSON.stringify(x.weight) + ' is not a number above 0');
      if (x.key !== undefined && typeof x.key !== 'boolean') out.push(at + car.id + ': "key" is not true or false');
      if (x.key && !isBespokeCar(car)) out.push(at + car.id + ' is not a Bespoke key car: it has no key card');
      if (x.amount !== undefined && !amountSound(x.amount)) out.push(at + car.id + ': its amount ' + JSON.stringify(x.amount) + ' is not a whole number of 1 or more, nor [min, max] of them');
      if (x.key && x.amount !== undefined && x.amount !== 1) out.push(at + car.id + ': a key is always one (its amount is not used)');
      const extra = Object.keys(x).filter(k => !['car', 'weight', 'key', 'amount'].includes(k));
      if (extra.length) out.push(at + car.id + ': unknown field(s) ' + extra.join(', '));
    }
    const k = obj && x.key ? 'key:' + car.id : car.id + (obj && x.amount !== undefined ? ':' + JSON.stringify(x.amount) : '');
    if (seen.has(k)) out.push(at + k + ' is listed twice (its first counts)');
    seen.add(k);
  });
  return out;
};
// the debug list (?featured=silvercomet:9x3,silvercomet:1x15,rocketfin:1,rocketfin!key:2: id[!key][:weight[xamount]])
// as entries; null: none
export const debugFeatured = (params) => {
  const raw = params?.get?.('featured');
  if (!raw) return null;
  const list = raw.split(',').map(x => x.trim()).filter(Boolean).map((x) => {
    const [head, tail = ''] = x.split(':'), key = /!key$/i.test(head);
    const [w, a] = tail.split(/x/i);
    return { car: head.replace(/!key$/i, ''), weight: w === undefined || w === '' ? 1 : Number(w), ...(key ? { key: true } : {}),
      ...(!key && a !== undefined && a !== '' ? { amount: Math.floor(Number(a)) } : {}) };
  });
  const out = featuredEntries(list);
  return out.length ? out : null;
};
// the debug marks (?maxed=silvercomet,swancar&owned=rocketfin): car ids counted as at their max ECU / their key owned,
// for a visit (Packs.markMaxed / markOwned), never saved. Sets the marks; true when any was asked
export const debugMarks = (params) => {
  const ids = (name) => (params?.get?.(name) || '').split(',').map(x => x.trim()).filter(Boolean);
  const maxed = ids('maxed'), owned = ids('owned');
  Packs.markMaxed = maxed.length ? new Set(maxed) : null;
  Packs.markOwned = owned.length ? new Set(owned) : null;
  return !!(maxed.length || owned.length);
};
// the debug doubling (&double=0.5&base=2): the chance to double and the base amount put over every kind's, for a visit
export const debugDouble = (params) => {
  const d = parseFloat(params?.get?.('double')), b = Math.floor(Number(params?.get?.('base')));
  Packs.doubleOverride = d >= 0 && d <= 1 ? d : null;
  Packs.baseOverride = b >= 1 ? Math.min(b, 99) : null;
  return Packs.doubleOverride !== null || Packs.baseOverride !== null;
};
// the declared weights as a tidy ratio: whole numbers divided by their common factor (2:2:2 -> 1:1:1); else as declared
export const weightRatio = (weights) => {
  const ws = weights.map(Number);
  if (!ws.length || !ws.every(w => Number.isInteger(w) && w > 0)) return ws;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const d = ws.reduce(gcd);
  return ws.map(w => w / d);
};
// is a featured entry EXHAUSTED for the player (the owner, 12-Oct: "ONLY in the featured slot, if a player has one of
// the cars maxed / key obtained ... the weights are shifted")? 'owned' (a key entry, its key had), 'maxed' (a blueprint
// entry, its car at its max ECU), or null
export const exhaustedOf = (f, { owned = ownsNow, maxed = maxedNow } = {}) => (f.key ? (owned(f.car.id) ? 'owned' : null) : (maxed(f.car) ? 'maxed' : null));
// the entries in play: those not exhausted, at their declared weights (so the shares renormalise: 1:1:1 with one maxed
// is 1:1). Every one exhausted: the blueprint entries come back at their declared weights (duplicates; a key never);
// none left (all keys, all owned): none, and the last slot is a filler. { live, reverted }
export const featuredLive = (declared, marks = {}) => {
  const live = declared.filter(f => !exhaustedOf(f, marks));
  if (live.length || !declared.length) return { live, reverted: false };
  const back = declared.filter(f => !f.key);
  return { live: back, reverted: back.length > 0 };
};
// an upgraded slot: each featured entry hit at featuredChance (its own roll), one picked from the hits BY WEIGHT. The
// chance the slot becomes each entry, worked out exactly (every subset S of the others' hits:
// c * sum over S of P(S) * w / (w + w(S))); past MAX_EXACT entries, the weighted share of "any hit" (an approximation)
const MAX_EXACT = 12;
export const slotShares = (list, c) => {
  const F = list.length;
  if (!F) return [];
  if (F > MAX_EXACT) { const W = list.reduce((n, f) => n + f.weight, 0), any = 1 - (1 - c) ** F; return list.map(f => any * f.weight / W); }
  return list.map((f, j) => {
    const others = list.filter((_, k) => k !== j);
    let e = 0;
    for (let mask = 0; mask < 1 << others.length; mask++) {
      let p = 1, w = f.weight;
      for (let k = 0; k < others.length; k++) { if ((mask >> k) & 1) { p *= c; w += others[k].weight; } else p *= 1 - c; }
      e += p * f.weight / w;
    }
    return c * e;
  });
};
// each live entry's chance to be in a pack (and its car's: any of its entries), EXACTLY as draw() deals them: the last slot first (by weight), then each
// other slot (upgradeChance, then the hits), a KEY dealt once and out of the later slots. With no key entry this is
// 1 - (1 - w/W)(1 - q)^(size - 1), q = upgradeChance * slotShares; with one, the slots after the key is dealt differ, so
// it is worked through every "which keys are out" state. [{ lastSlot (w/W), slot (q, before any key is out), chance }]
export const featuredChances = (live, { size, upgradeChance = 0.25, featuredChance = 0.2 } = {}) => {
  const W = live.reduce((n, f) => n + f.weight, 0);
  const memo = new Map(); // (by the keys out: the entries still in and each one's chance an upgradeable slot becomes it)
  const keyOf = (out) => [...out].sort().join();
  const sharesFor = (out) => {
    const k = keyOf(out);
    if (!memo.has(k)) { const can = live.filter(f => !(f.key && out.has(f.car.id))); memo.set(k, { can, q: slotShares(can, featuredChance).map(x => x * upgradeChance) }); }
    return memo.get(k);
  };
  const first = sharesFor(new Set());
  // the chance a pack holds ANY of the entries `hit` says (one entry; or every entry of one car: its x3 and its x15)
  const anyOf = (hit) => {
    let states = new Map(); // keys out -> { out, p: the chance of that and the target not dealt yet }
    const add = (map, out, p) => { const k = keyOf(out), s = map.get(k); if (s) s.p += p; else map.set(k, { out, p }); };
    for (const f of live) if (!hit(f)) add(states, f.key ? new Set([f.car.id]) : new Set(), f.weight / W);
    for (let slot = 0; slot < size - 1; slot++) {
      const next = new Map();
      for (const { out, p } of states.values()) {
        const { can, q } = sharesFor(out);
        let rest = 1;
        can.forEach((f, j) => {
          rest -= q[j];
          if (!hit(f)) add(next, f.key ? new Set([...out, f.car.id]) : out, p * q[j]);
        });
        add(next, out, p * rest);
      }
      states = next;
    }
    return 1 - [...states.values()].reduce((n, s) => n + s.p, 0);
  };
  // (carChance: any entry of the same car and kind, blueprint or key: "Where to get it" asks it)
  return live.map(target => ({ lastSlot: W > 0 ? target.weight / W : 0, slot: first.q[first.can.indexOf(target)] || 0, chance: anyOf(f => f === target),
    carChance: anyOf(f => f.car === target.car && f.key === target.key) }));
};

// how many of a card a slot gives BEFORE any doubling (the owner, 12-Oct: "don't hardcode it: packs that drop other
// amounts per slot"; then "a BASE AMOUNT per pack kind: 1 for the normal packs, 2 for the LIMITED packs"): a kind's
// `amounts` by rarity (an optional override), else its `baseAmount`, else its older `amount`, else 1; a number, or
// [min, max] (a whole number in it by the dice). A key card is one key, always. A featured entry's own amount is handed
// in as { amount } (never doubled)
export const amountFor = (spec, rarity, random = Math.random) => {
  const v = spec?.amounts?.[rarity] ?? spec?.baseAmount ?? spec?.amount ?? 1;
  if (Array.isArray(v)) { const lo = Math.max(1, Math.floor(v[0] ?? 1)), hi = Math.max(lo, Math.floor(v[1] ?? lo)); return lo + Math.floor(random() * (hi - lo + 1)); }
  return Math.max(1, Math.floor(Number(v) || 1));
};
// a pack kind's chance to DOUBLE a non-featured card's stack: the kind's `doubleChance`, else packs.json's, else 0 (over: a debug value)
export const doubleOf = (spec, over) => Math.max(0, Math.min(1, Number(over ?? spec?.doubleChance ?? packData.doubleChance ?? 0) || 0));
// a kind's base amount for a rarity, as words for the sheet (a number, or "2-4")
const baseWords = (spec, rarity, over) => { const v = over ?? spec?.amounts?.[rarity] ?? spec?.baseAmount ?? spec?.amount ?? 1; return Array.isArray(v) ? v : Math.max(1, Math.floor(Number(v) || 1)); };
// A pack drawn: its cards, nothing given. { rarity, car (its id), key (a Bespoke key card), featured, upgraded }.
// random: the dice (0 <= n < 1); featured: the special pack's featured list (entries, car ids or car objects:
// featuredEntries); owned / maxed: the save's (a check hands its own). The featured mechanic deals from the entries in
// play (featuredLive: the exhausted ones out, the weights shifted), a SNAPSHOT of the save read ONCE here, before any
// card is dealt or given (the owner, 12-Oct: a card of this pack that maxes the car does not take it out of the last
// slot; the duplicate is kept as the count); a key is dealt at most once a pack, and never one owned at the start
// double / base: the doubling chance and the base amount put over the kind's (the debug &double= / &base=: Packs.doubleOverride,
// baseOverride, for a visit)
export const draw = (kind, { random = Math.random, cars, owned, maxed, featured = [], spec = packOf(kind), double = Packs.doubleOverride ?? undefined, base = Packs.baseOverride ?? undefined } = {}) => {
  if (!spec) throw new Error('no such pack: ' + kind);
  const marks = { owned: owned || ownsNow, maxed: maxed || maxedNow };
  const byRarity = poolOf(spec, { cars, owned: marks.owned });
  const entries = spec.featured ? featuredLive(featuredEntries(featured), marks).live : [];
  const featuredKeys = new Set(entries.filter(f => f.key).map(f => f.car.id));
  if (byRarity.bespoke && featuredKeys.size) byRarity.bespoke = byRarity.bespoke.filter(c => !featuredKeys.has(c.id)); // (a featured key comes only as the featured card: never twice)
  const have = () => RARITIES.filter(r => byRarity[r]?.length);
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  // a rarity by the odds, among those the pool has cards of, at least `min` (none so high: the highest there is)
  const roll = (min = RARITIES[0]) => {
    const can = have().filter(r => rank(r) >= rank(min));
    if (!can.length) return have().at(-1) || null;
    const total = can.reduce((sum, r) => sum + (packData.odds[r] || 0), 0);
    if (!(total > 0)) return can[0];
    let n = random() * total;
    for (const r of can) { n -= packData.odds[r] || 0; if (n < 0) return r; }
    return can.at(-1);
  };
  const card = (rarity) => {
    if (!rarity) return null;
    const car = pick(byRarity[rarity]);
    if (rarity === 'bespoke') byRarity.bespoke = byRarity.bespoke.filter(c => c !== car); // (a key once a pack)
    return { rarity, car: car.id, key: rarity === 'bespoke', featured: false, upgraded: false };
  };
  const size = Math.max(1, Math.floor(spec.size || 5));
  const slots = Array.from({ length: size }, () => card(roll()));
  if (slots.some(c => !c)) return []; // (an empty pool: no cards at all)
  const locked = new Set(), keysOut = new Set();
  const byWeight = (list) => {
    const total = list.reduce((n, f) => n + f.weight, 0);
    let n = random() * total;
    for (const f of list) { n -= f.weight; if (n < 0) return f; }
    return list.at(-1);
  };
  const featuredCard = (f) => {
    if (f.key) keysOut.add(f.car.id); // (a key once a pack)
    return { rarity: f.key ? 'bespoke' : featuredRarity(f.car), car: f.car.id, key: f.key, featured: true, upgraded: true, ...(f.amount !== undefined ? { amount: f.amount } : {}) };
  };
  // special: the last slot is a featured card, picked by weight (nothing to feature: an Epic-or-better filler)
  if (spec.featured) { slots[size - 1] = entries.length ? featuredCard(byWeight(entries)) : card(roll('epic')); locked.add(size - 1); }
  // special: each slot but the last may upgrade; each featured entry in play rolls its own chance, one picked from the
  // hits by weight (a key already dealt is out); none hit: a higher filler. Done BEFORE the at-least rule (12-Oct: a
  // featured card keeps its true rarity now, so the rule counts it; a featured slot is locked, never rolled away)
  if (spec.featured) {
    const { upgradeChance = 0.25, featuredChance = 0.2 } = spec.featured;
    for (let i = 0; i < size - 1; i++) {
      if (!(random() < upgradeChance)) continue;
      const hits = entries.filter(f => !(f.key && keysOut.has(f.car.id))).filter(() => random() < featuredChance);
      if (hits.length) { slots[i] = featuredCard(byWeight(hits)); locked.add(i); continue; }
      const above = have().find(r => rank(r) > rank(slots[i].rarity) && r !== 'bespoke');
      slots[i] = { ...card(above || slots[i].rarity), upgraded: true };
    }
  }
  // at least n cards of a rarity or better: the last slots not already counted are rolled again, highest rule first
  for (const [min, n] of Object.entries(spec.atLeast || {}).sort((a, b) => rank(b[0]) - rank(a[0]))) {
    let count = slots.filter(c => rank(c.rarity) >= rank(min)).length;
    for (let i = size - 1; i >= 0 && count < n; i--) {
      if (locked.has(i) || rank(slots[i].rarity) >= rank(min)) continue;
      const better = card(roll(min));
      if (rank(better.rarity) < rank(min)) break; // (the pool has nothing so high)
      slots[i] = better; locked.add(i); count++;
    }
  }
  // how many of it: a featured entry's own amount (never doubled); a key one (never doubled); every other card the kind's
  // base (packs.json baseAmount, a rarity's `amounts` over it), DOUBLED at the pack's doubleChance (the owner, 12-Oct:
  // "each non-featured card that drops has a chance to DOUBLE its stack": n = base x 2), one roll of the dice a slot
  const twice = doubleOf(spec, double), baseSpec = base !== undefined ? { ...spec, amounts: undefined, baseAmount: base } : spec;
  return slots.map(({ amount, ...c }) => {
    if (c.key) return { ...c, n: 1 };
    if (c.featured && amount !== undefined) return { ...c, n: amountFor({ amount }, c.rarity, random) };
    if (c.featured) return { ...c, n: amountFor(baseSpec, c.rarity, random) }; // (a featured entry with no amount of its own: the base, never doubled)
    const n = amountFor(baseSpec, c.rarity, random), doubled = random() < twice;
    return { ...c, n: doubled ? n * 2 : n, ...(doubled ? { doubled: true } : {}) };
  });
};

// What a pack can give, every card of it (the Shop's "What's inside" sheet, render/packcontents.js): read from the same
// pools draw() picks from, at call time, so a car added to the roster is listed with no edit. For a PLAIN slot (one no
// rule has rolled again): the share of each rarity the pool has cards of (packs.json odds among those), split evenly
// over its cards, so a rarity's cards add up to its share. A key the player OWNS is listed too, exhausted ('owned',
// chance 0: "Key obtained"), and the other keys' shares are as the pool really is (without it). A special pack's
// FEATURED entries come first, each with its declared WEIGHT, its share of the last slot (its weight / the weights in
// play) and its chance to be in a pack (featuredChances: worked out EXACTLY, 1 - (1 - w/W)(1 - q)^(size-1) with q the
// slot's exact chance for it, through the keys-out states when a key is featured). An EXHAUSTED entry (a key owned, a
// car maxed) is listed with exhausted set and chance 0; the others' shares are shifted.
// { kind, name, size, total (cards a pack can give), odds: [{ rarity, share }], groups: [{ rarity, share, cards: [{ car,
// chance, key, exhausted, stacks: [{ n, chance (TOTAL: the card's chance split by doubleChance), doubled }] }] }], featured: [{ car, rarity, key, weight, exhausted, chance, lastSlot, slot }], weights (the
// declared ratio, tidied: weightRatio), shifted (the entries out of the pool, while others are in), reverted (every one
// exhausted: the blueprint entries back at their declared weights), doubleChance, baseAmount, limited, atLeast }
export const contents = (kind, { featured = [], cars, owned, maxed, spec = packOf(kind), double = Packs.doubleOverride ?? undefined, base = Packs.baseOverride ?? undefined } = {}) => {
  if (!spec) return null;
  const marks = { owned: owned || ownsNow, maxed: maxed || maxedNow };
  const byRarity = poolOf(spec, { cars, owned: marks.owned });
  const declared = spec.featured ? featuredEntries(featured) : [];
  const { live, reverted } = featuredLive(declared, marks);
  const featuredKeys = new Set(live.filter(f => f.key).map(f => f.car.id));
  if (byRarity.bespoke && featuredKeys.size) byRarity.bespoke = byRarity.bespoke.filter(c => !featuredKeys.has(c.id)); // (as draw: the featured card only)
  // a card's STACKS (the owner, 12-Oct): [{ n, chance }], the TOTAL chance of each: its base x (1 - doubleChance), its
  // doubled stack x doubleChance, so they add up to the card's chance; a key one stack of 1
  const twice = doubleOf(spec, double);
  const stacksOf = (key, rarity, chance) => {
    if (key) return [{ n: 1, chance }];
    const b = baseWords(spec, rarity, base);
    const dbl = Array.isArray(b) ? b.map(x => x * 2) : b * 2;
    return twice > 0 ? [{ n: b, chance: chance * (1 - twice) }, { n: dbl, chance: chance * twice, doubled: true }] : [{ n: b, chance }];
  };
  const present = RARITIES.filter(r => byRarity[r]?.length);
  const weight = present.reduce((sum, r) => sum + (packData.odds[r] || 0), 0);
  const odds = present.map(r => ({ rarity: r, share: weight > 0 ? (packData.odds[r] || 0) / weight : 1 / present.length }));
  const groups = odds.map(({ rarity, share }) => ({ rarity, share,
    cards: byRarity[rarity].map((car) => {
      const chance = share / byRarity[rarity].length, key = rarity === 'bespoke';
      return { car, chance, key, exhausted: null, stacks: stacksOf(key, rarity, chance) };
    }) }));
  // the keys owned: listed, exhausted (the owner, 12-Oct: "Keys in the regular packs should also carry this overlay")
  if (spec.pool === 'all') {
    const ownedKeys = (cars || roster()).filter(c => isBespokeCar(c) && marks.owned(c.id)).map(car => ({ car, chance: 0, key: true, exhausted: 'owned', stacks: [{ n: 1, chance: 0 }] }));
    if (ownedKeys.length) {
      const g = groups.find(x => x.rarity === 'bespoke');
      if (g) g.cards.push(...ownedKeys); else groups.push({ rarity: 'bespoke', share: 0, cards: ownedKeys });
    }
  }
  const size = Math.max(1, Math.floor(spec.size || 5));
  const { upgradeChance = 0.25, featuredChance = 0.2 } = spec.featured || {};
  const chances = featuredChances(live, { size, upgradeChance, featuredChance });
  const featuredList = declared.map((f) => {
    const i = live.indexOf(f), o = chances[i];
    return { car: f.car, key: f.key, weight: f.weight, ...(f.amount !== undefined ? { amount: f.amount } : {}), rarity: f.key ? 'bespoke' : featuredRarity(f.car), exhausted: exhaustedOf(f, marks),
      inPlay: i >= 0, lastSlot: o ? o.lastSlot : 0, slot: o ? o.slot : 0, chance: o ? o.chance : 0, carChance: o ? o.carChance : 0 };
  });
  const shifted = reverted ? [] : featuredList.filter(f => f.exhausted);
  const total = new Set([...groups.flatMap(g => g.cards.filter(c => !c.exhausted).map(c => (c.key ? 'key:' : '') + c.car.id)), ...live.map(f => (f.key ? 'key:' : '') + f.car.id)]).size;
  return { kind, name: spec.name || packName(kind), size, total, odds, groups, featured: featuredList, weights: weightRatio(declared.map(f => f.weight)), shifted, reverted,
    doubleChance: twice, baseAmount: base ?? spec.baseAmount ?? 1, limited: !!spec.limited,
    atLeast: { ...(spec.atLeast || {}) } };
};

// ---- the featured entries of a pack ({ car, weight, key, amount }: featuredEntries, every one declared, exhausted or
// not): its own `featured.entries`, else its event's prize car at weight 1, else every event car at weight 1. The debug
// ?featured= (Packs.featuredOverride, for a visit, never saved) is put over any of them. id: a pack id (an old
// 'special:<event>' key is turned into its pack). [] for a pack with no featured mechanic
const eventEntry = (id) => (Array.isArray(eventData.special) ? eventData.special : []).find(e => String(e.id) === String(id)) || null;
export const featuredOf = (id) => {
  const spec = packOf(id);
  if (!spec?.featured) return [];
  if (Packs.featuredOverride) return Packs.featuredOverride;
  const own = Array.isArray(spec.featured.entries) && spec.featured.entries.length ? spec.featured.entries : null;
  const prize = eventEntry(spec.event)?.prize?.car;
  return featuredEntries(own || (prize ? [prize] : (Cars.EVENT_CARS || []).map(c => c.id)));
};
// the special event a pack belongs to (its `event`: on sale and listed only while it is on), as events.json has it; null
export const eventOf = (id) => (packOf(id)?.event ? eventEntry(packOf(id).event) : null);
// the packs a special event gives (its stages, its grand prize): those whose givenBy.event names it (by its id, else the
// pack's own event). [{ id, stage, prize }]
export const eventPacks = (eventId) => PACK_IDS.map(id => ({ id, g: PACKS[id].givenBy?.event })).filter(({ id, g }) => g && String(g.id ?? PACKS[id].event) === String(eventId))
  .map(({ id, g }) => ({ id, stage: !!g.stage, prize: !!g.prize }));
// the pack the Career levels give (the first with givenBy.career); null: none
export const careerPack = () => PACK_IDS.find(id => PACKS[id].givenBy?.career) || null;

// the first delivery of these levels gives a career pack: every nth of the main list (the tiers in order, then the
// levels outside them, no races and no events), and those the pack's givenBy.career names
export const careerLevels = () => {
  const rule = PACKS[careerPack()]?.givenBy?.career;
  if (!rule) return [];
  const byId = new Map(LEVELS.map(l => [l.id, l]));
  const tiers = Object.keys(tierData.tiers || {}).map(Number).sort((a, b) => a - b).flatMap(n => tierData.tiers[n]);
  const main = [...tiers, ...(tierData.outside || [])].map(id => byId.get(id)).filter(l => l && !isRace(l));
  const every = Math.floor(rule.every || 0);
  return [...new Set([...(every > 0 ? main.filter((_, i) => (i + 1) % every === 0).map(l => l.id) : []), ...(rule.levels || [])])];
};

// ---- GENERATED WORDS (no hand-typed blurb: the owner, 12-Oct, PACK-DEFINITIONS-DRAFT.md "Generated blurbs"): a pack's
// one line, built from its rules, so it can never be stale. A pack's (or a bundle's) `blurb` overrides it.
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const countWord = (n) => NUMBER_WORDS[n] || String(n);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// an events.json time ("2026-11-01": midnight on the device; else a time with its zone) as "1 Nov" (as events.js when())
const dayWords = (v) => {
  const day = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(v ?? ''));
  const t = day ? new Date(+day[1], +day[2] - 1, +day[3]) : new Date(Date.parse(String(v)));
  return Number.isFinite(t.getTime()) ? t.getDate() + ' ' + MONTHS[t.getMonth()] : null;
};
// the at-least rules a pack promises, highest first, without those a higher one already makes true (at least one Epic
// or better is at least one Uncommon or better): [[rarity, n]]
export const guarantees = (spec) => {
  const rules = Object.entries(spec?.atLeast || {}).filter(([r, n]) => rank(r) >= 0 && n > 0).sort((a, b) => rank(b[0]) - rank(a[0]));
  return rules.filter(([, n], i) => !rules.slice(0, i).some(([, m]) => m >= n));
};
// a pack's line: its size (and its base amount above 1), its pool, every guarantee, a featured card, the keys, and an
// event's end ("5 cards from every car with blueprints. At least one Uncommon or better. A key, now and then")
export const describePack = (id) => {
  const spec = packOf(id);
  if (!spec) return '';
  if (typeof spec.blurb === 'string' && spec.blurb.trim()) return spec.blurb.trim();
  const size = Math.max(1, Math.floor(spec.size || 5)), base = Math.max(1, Math.floor(Number(Array.isArray(spec.baseAmount) ? spec.baseAmount[0] : spec.baseAmount) || 1));
  const parts = [(spec.pool === 'all' ? size + ' cards from every car with blueprints' : size + ' evergreen cards') + (base > 1 ? ', x' + base + ' each' : '')];
  for (const [r, n] of guarantees(spec)) parts.push('At least ' + countWord(n) + ' ' + rarityName(r) + ' or better');
  if (spec.featured) parts.push('Guaranteed featured card');
  if (spec.pool === 'all' && (packData.odds?.bespoke || 0) > 0) parts.push('A key, now and then');
  const e = eventOf(id), end = e ? dayWords(e.to) : null;
  if (end) parts.push('Limited: ends ' + end);
  return parts.join('. ');
};
// a bundle's line: the packs and the cards in all, and each pack's guarantees ("3 packs, 30 cards. At least one Epic or
// better in each")
export const describeBundle = (bundle) => {
  if (typeof bundle?.blurb === 'string' && bundle.blurb.trim()) return bundle.blurb.trim();
  const spec = packOf(bundle?.pack);
  if (!spec) return '';
  const count = Math.max(1, Math.floor(bundle.count || 1)), size = Math.max(1, Math.floor(spec.size || 5));
  const parts = [count + ' packs, ' + count * size + ' cards'];
  for (const [r, n] of guarantees(spec)) parts.push('At least ' + countWord(n) + ' ' + rarityName(r) + ' or better in each');
  if (spec.featured) parts.push('A featured card in each');
  return parts.join('. ');
};
// a bundle's name: its own, else "3 Standard packs" / "3 10-packs"
export const bundleName = (bundle) => bundle?.name || (Math.max(1, Math.floor(bundle?.count || 1)) + ' ' + packName(bundle?.pack) + 's');

// what is wrong with packs.json, as lines (none: sound): every pack's featured list, its event, what gives it, its Shop
// offer (a price; its section; its limits), every bundle's pack, count and price. events.js problems() reports them too
export const packProblems = (data = packData) => {
  const out = [], packs = data.packs || {}, events = new Set((Array.isArray(eventData.special) ? eventData.special : []).map(e => String(e.id)));
  const sections = new Set((data.sections || []).map(s => s.id));
  const whole = (v, least) => Number.isInteger(v) && v >= least;
  if (data.kinds) out.push('packs.json: "kinds" is the old shape (before one definition per pack): its packs belong in "packs"');
  for (const [id, p] of Object.entries(packs)) {
    const say = (what) => out.push('pack ' + id + ': ' + what);
    if (!/^[a-z0-9-]{1,40}$/.test(id)) say('its id is not lower-case letters, digits and dashes');
    if (!p || typeof p !== 'object') { say('not an object'); continue; }
    if (!p.name) say('it has no name');
    if (!whole(p.size, 1)) say('its size is not a whole number of 1 or more');
    if (!['all', 'evergreen'].includes(p.pool)) say('its pool is not "all" or "evergreen"');
    for (const r of Object.keys(p.atLeast || {})) if (rank(r) < 0) say('atLeast names no rarity "' + r + '"');
    if (p.event !== undefined && !events.has(String(p.event))) say('its event "' + p.event + '" is not a special event (events.json special)');
    if (p.featured !== undefined) {
      if (!p.featured || typeof p.featured !== 'object' || Array.isArray(p.featured)) say('"featured" is not { upgradeChance, featuredChance, entries }');
      else for (const line of featuredProblems(p.featured.entries)) say(line + ' (a car id, or { "car", "weight" > 0, "key": true for a Bespoke key car, "amount" })');
    }
    const g = p.givenBy;
    if (g !== undefined) {
      const extra = Object.keys(g || {}).filter(k => !['career', 'event'].includes(k));
      if (extra.length) say('givenBy: unknown ' + extra.join(', '));
      if (g?.career && !(g.career.every === undefined || whole(g.career.every, 0))) say('givenBy.career.every is not a whole number');
      for (const l of g?.career?.levels || []) if (!LEVELS.some(x => x.id === l)) say('givenBy.career names no level "' + l + '"');
      if (g?.event) {
        const ev = g.event.id ?? p.event;
        if (ev === undefined) say('givenBy.event: no event (its own "event", or givenBy.event.id)');
        else if (!events.has(String(ev))) say('givenBy.event: "' + ev + '" is not a special event');
      }
    }
    if (p.shop !== undefined) {
      const s = p.shop || {};
      if (!whole(s.price, 0)) say('its shop block has no price (a whole number, 0 for free)');
      if (s.was !== undefined && s.was !== null && !(s.was > s.price)) say('its old price ("was") is not above its price');
      if (s.ribbon === 'sale' && !(s.was > s.price)) say('a sale with no old price');
      if (!sections.has(s.section)) say('its shop section "' + s.section + '" is not a section');
      if (s.limits !== undefined) {
        const L = s.limits || {}, extra = Object.keys(L).filter(k => !['total', 'daily'].includes(k));
        if (extra.length) say('limits: unknown ' + extra.join(', '));
        for (const k of ['total', 'daily']) if (L[k] !== undefined && !whole(L[k], 1)) say('limits.' + k + ' is not a whole number of 1 or more');
      }
    }
  }
  for (const [id, b] of Object.entries(data.bundles || {})) {
    const say = (what) => out.push('bundle ' + id + ': ' + what);
    if (Object.hasOwn(packs, id)) say('its id is a pack\'s too');
    if (!Object.hasOwn(packs, String(b?.pack))) { say('its pack "' + b?.pack + '" is not a pack'); continue; }
    if (!whole(b.count, 2)) say('its count is not a whole number of 2 or more');
    if (!whole(b.price, 0)) say('it has no price');
    if (b.was !== undefined && b.was !== null && !(b.was > b.price)) say('its old price ("was") is not above its price');
    if (b.ribbon === 'sale' && !(b.was > b.price)) say('a sale with no old price');
    if (!sections.has(b.section ?? 'bundles')) say('its section "' + (b.section ?? 'bundles') + '" is not a section');
    if (!packs[b.pack].shop) say('its pack ' + b.pack + ' is not sold on its own (no shop block)');
  }
  return out;
};

// ---- a pack's cards as the reveal shows them (render/packs.js) ----
// every card its own (the owner, 12-Oct: identical cards are NOT stacked): { ...the card, n }. n is the slot's amount
// (packs.json), the count the card's xN badge counts up to as its copies flick on
export const revealCards = (cards) => (cards || []).map(c => ({ ...c, n: c.n ?? 1, featured: !!c.featured })); // (n: the slot's amount, packs.json: 1 today)
// ---- a slot that gives n copies (the owner, 12-Oct: "when the card is flipped over, the extra cards need to animate and
// flick onto the pile. Each card that flicks on, increases the badge by 1"). The card turns showing x1; then the n - 1
// extra copies are thrown in one after another from the side and tucked onto the pile behind it, the badge going up one
// on each landing. flickPlan(n) is the schedule (ms from the first throw; render/packs.js starts it as the card's face
// settles): each copy's launch and landing, the badge after it lands (2 .. n), where it is thrown from and the pose it
// settles in on the pile (a layer index: at most FLICK.layers drawn, a later copy lands on an existing layer). The gaps
// start at FLICK.gap and shrink by FLICK.speedUp each copy down to FLICK.minGap (so a big amount speeds up), and the whole
// is squeezed to fit FLICK.most. reduced (reduced motion): no throws, every copy at 0. seed: the slot's own scatter.
export const FLICK = { flight: 160, gap: 125, minGap: 85, speedUp: 0.95, most: 1500, settle: 140, layers: 7, slowGap: 340, slowFlight: 340 }; // (slowGap / slowFlight: a SMALL stack (x3) is thrown slower, easing to the fast pace by about x10: the owner, 12-Oct)
export const flickPlan = (n, { reduced = false, seed = 1 } = {}) => {
  const extra = Math.max(0, Math.floor(Number(n) || 1) - 1);
  let s = (seed | 0) || 1;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const slow = Math.max(0, Math.min(1, (10 - extra) / 8)); // (1 for a stack of 3 or fewer, 0 from about 10 up)
  const gap0 = FLICK.gap + (FLICK.slowGap - FLICK.gap) * slow, flight0 = FLICK.flight + (FLICK.slowFlight - FLICK.flight) * slow;
  const gaps = Array.from({ length: Math.max(0, extra - 1) }, (_, j) => Math.max(FLICK.minGap, gap0 * FLICK.speedUp ** j));
  const sum = gaps.reduce((a, b) => a + b, 0), room = FLICK.most - FLICK.flight;
  const squeeze = sum > room ? room / sum : 1; // (a huge amount: the gaps shrink to fit...)
  const flight = Math.min(Math.round(flight0), Math.floor(2 * Math.min(Infinity, ...gaps, flight0) * squeeze)); // (...and each throw too: never more than two in the air)
  const copies = [];
  let launch = 0;
  for (let j = 0; j < extra; j++) {
    const layer = Math.min(j, FLICK.layers - 1), side = 1; // (always thrown in from the RIGHT: the owner, 12-Oct; the pile peeks out on that side only)
    const deep = layer + 1;
    copies.push({
      copy: j + 2, badge: j + 2, layer: j < FLICK.layers ? layer : Math.floor(rnd() * FLICK.layers), fresh: j < FLICK.layers,
      launch: reduced ? 0 : Math.round(launch), land: reduced ? 0 : Math.round(launch) + flight,
      from: { x: side * (95 + rnd() * 30), y: -(18 + rnd() * 22), r: side * (14 + rnd() * 14) }, // (% of the card, deg: off to the side, a little above)
      to: { x: side * (0.6 + deep * 0.55 + rnd() * 0.6), y: -(0.8 + deep * 0.6 + rnd() * 0.5), r: side * (1.2 + deep * 0.75 + rnd() * 0.8) }, // (the pile peeks out to the right and above, never below: the progress bar under the card stays clear)
    });
    launch += (gaps[j] || 0) * squeeze;
  }
  for (const c of copies) if (!c.fresh) c.to = copies[c.layer].to; // (the pile is full: it lands square on a layer already there)
  const lastLand = copies.length ? copies.at(-1).land : 0;
  return { n: extra + 1, reduced, copies, lastLand, total: copies.length && !reduced ? lastLand + FLICK.settle : 0 };
};
// where a plan stands t ms after the first throw (Infinity: a tap, all landed): the copies landed, the badge, those in the air
export const flickState = (plan, t) => {
  const landed = plan.copies.filter(c => c.land <= t);
  return { landed: landed.length, badge: 1 + landed.length, flying: plan.copies.filter(c => c.launch <= t && c.land > t) };
};
// the debug amounts (?pack=ten&amount=3, &amount=15, &amounts=3,15 alternating by slot, &amounts=common:3,epic:15 by
// rarity): a function (card, slot index) -> n, or null (none asked). For a visit only: render/packs.js sets it on Packs
export const debugAmounts = (params) => {
  const one = (v) => { const n = Math.floor(Number(v)); return n >= 1 ? Math.min(n, 99) : null; };
  const amount = one(params.get('amount'));
  const list = (params.get('amounts') || '').split(',').map(x => x.trim()).filter(Boolean);
  if (list.length && list.every(x => x.includes(':'))) {
    const by = Object.fromEntries(list.map(x => x.split(':')).map(([r, v]) => [r.trim(), one(v)]).filter(([, v]) => v));
    return (card) => by[card.rarity] ?? amount;
  }
  const seq = list.map(one).filter(Boolean);
  if (seq.length) return (card, i) => seq[i % seq.length];
  return amount ? () => amount : null;
};

// the order they are turned in: as drawn, but the BEST card last (the owner, 12-Oct: "the featured card at the end of the
// pack always, unless upgraded"): the highest rarity goes last; among equals a featured card; among those the later. So
// a special pack's featured card (its guaranteed last slot) is last unless a slot upgraded to a HIGHER rarity than it
export const revealOrder = (cards) => {
  const list = [...(cards || [])];
  if (list.length < 2) return list;
  let best = 0;
  list.forEach((c, i) => {
    const b = list[best], d = rank(c.rarity) - rank(b.rarity);
    if (d > 0 || (d === 0 && (!!c.featured > !!b.featured || !!c.featured === !!b.featured))) best = i;
  });
  list.push(list.splice(best, 1)[0]);
  return list;
};

// each card's progress bar, before it and after it, in the order the cards are TURNED (the owner, 12-Oct: "Under each
// card obtained, it should show the player's progress bar. It should glow if Unlocking it or ECU Up"). The pack's
// blueprints are already given (open()), so where each car stood before the pack is worked back (its blueprints now,
// less this pack's cards of it), and the cards are then laid on one at a time: a later card of the same car starts where
// the earlier one left it. Per card: { before, after, unlocks (the car became driveable: a blueprint car's first ECU, a
// key car's key), ecuUp (an ECU more reached), maxed (at its top after) }, before/after = { bp, ecu, max, have, toNext,
// unlocked } (have/toNext: the blueprints toward the next ECU)
export const revealProgress = (cards, { owned = (id) => Progress.owns(id) } = {}) => {
  const start = {}, keysNew = new Set();
  for (const c of cards || []) {
    if (c.key) { if (c.isNew) keysNew.add(c.car); continue; }
    start[c.car] = (start[c.car] ?? Ecu.blueprints(c.car) ?? 0) - (c.n ?? 1);
  }
  const bp = { ...start }, hasKey = {};
  const at = (car, n, key) => {
    const max = Math.max(1, Ecu.max(car) || 1), x = Math.max(1, Ecu.x(car) || 1), blueprint = Ecu.isBlueprint(car);
    const steps = Math.floor(Math.max(0, n) / x);
    const ecu = Ecu.maxed(car) ? max : Math.min(max, blueprint ? steps : 1 + steps);
    const unlocked = blueprint ? ecu >= 1 || Progress.data.cars.includes(car.id) : key;
    return { bp: n, ecu, max, toNext: x, have: ecu >= max ? x : Math.max(0, n) % x, unlocked };
  };
  return (cards || []).map((c) => {
    const car = Cars.carById(c.car);
    if (!car) return { before: null, after: null, unlocks: false, ecuUp: false, maxed: false };
    const id = car.id, key0 = hasKey[id] ?? (owned(id) && !keysNew.has(id));
    const n0 = bp[id] ?? Ecu.blueprints(id);
    const before = at(car, n0, key0);
    let n1 = n0, key1 = key0;
    if (c.key) key1 = true; else n1 = n0 + (c.n ?? 1);
    bp[id] = n1; hasKey[id] = key1;
    const after = at(car, n1, key1);
    const steps = c.key ? [after] : Array.from({ length: n1 - n0 }, (_, j) => at(car, n0 + j + 1, key1)); // (after each copy: the bar fills copy by copy as they flick on)
    return { before, after, steps, unlocks: !before.unlocked && after.unlocked, ecuUp: after.ecu > before.ecu, maxed: after.ecu >= after.max };
  });
};

export const Packs = {
  data: packData,
  // the packs held, by pack id (an old save's 'special:<event>' keys turned into ids: packid.js migrateHeld; Progress
  // restores a save so, and a check may write the old keys straight in)
  heldMap() {
    const raw = Progress.data.packs || {};
    if (Object.keys(raw).some(k => !Object.hasOwn(PACKS, k))) Progress.data.packs = migrateHeld(raw);
    return Progress.data.packs || {};
  },
  // how many of a pack are held (id: a pack id; an old kind and event are turned into it)
  count(id, from) { return this.heldMap()[packIdOf(id, from ?? null)] || 0; },
  // the packs held: [{ key, id, kind (the id), from (its event, if any), count, name }], in packs.json's order
  held() {
    return Object.entries(this.heldMap()).filter(([, c]) => c > 0).map(([id, count]) => ({ key: id, id, kind: id, from: PACKS[id]?.event ?? null, count, name: packName(id) }))
      .sort((a, b) => PACK_IDS.indexOf(a.id) - PACK_IDS.indexOf(b.id));
  },
  total() { return Object.values(this.heldMap()).reduce((n, c) => n + (c > 0 ? c : 0), 0); },
  // an unopened pack given. id: a pack id (an old 'special' with { from: event } is turned into its pack). Its name, or
  // '' (no such pack)
  grant(kind, { from = null, n = 1 } = {}) {
    const id = packIdOf(kind, from);
    if (!id) return '';
    const held = this.heldMap();
    held[id] = (held[id] || 0) + n;
    Progress.data.packs = held;
    Progress.save();
    window.dispatchEvent?.(new Event('packschange'));
    return packName(id);
  },
  // ---- opened at once (the owner, 12-Oct: "when a pack is bought or earned it just opens immediately") ----
  // revealer: the screen's (render/packs.js), set when it loads: asked to show the packs held now, at once or as soon
  // as it can (a run's results up, the menu back). Until it does they are held in the save (Progress.data.packs: a page
  // closed in between keeps them, and they open at the next menu). None set (a check, a build with no screen): held.
  revealer: null,
  revealNow() { try { this.revealer?.(); } catch (error) { console.error(error); } },
  // the next pack held, opened (the first of held()): what open() gives, or null (none held)
  next(options = {}) {
    const first = this.held()[0];
    return first ? this.open(first.id, options) : null;
  },
  // KEY HOOK: a Bespoke card's key given. Ecu.grantKey if ecu.js has one; else a key is what owning a garage car is
  // today (Progress.data.cars: bought or won), so the car is put in the cars owned
  grantKey(carId) {
    if (typeof Ecu.grantKey === 'function') return Ecu.grantKey(carId);
    if (!Progress.data.cars.includes(carId)) Progress.data.cars.push(carId);
  },
  // A pack opened: drawn, and every card given (a blueprint each through Ecu.addBlueprints; a key through grantKey).
  // free: true opens one not held (the debug route). { kind (the pack's id), id, from (its event, for the reveal's
  // kicker), cards } (each card with isNew, count, maxed), or null (none held)
  // amountOf: (card, slot index) -> n or null, an amount put over the pack's (the debug ?amount=: debugAmounts), else
  // Packs.amountOverride (set for a visit by the debug route; never saved)
  amountOverride: null,
  featuredOverride: null, // (the debug ?featured=: debugFeatured, for a visit; never saved)
  doubleOverride: null, baseOverride: null, // (the debug &double=0.5&base=2: debugDouble, for a visit; never saved)
  markMaxed: null, markOwned: null, // (the debug ?maxed= / ?owned=: debugMarks, for a visit; never saved)
  // every featured entry of a pack exhausted (the owner, 12-Oct: "If a player has every featured card in a pack greyed
  // out, don't allow them to purchase it")? false for a pack with no featured list. list: the entries (else featuredOf)
  featuredExhausted(id = null, list = featuredOf(id), marks = {}) {
    const declared = featuredEntries(list);
    return declared.length > 0 && declared.every(f => exhaustedOf(f, marks));
  },
  open(kind, { from = null, free = false, random = Math.random, amountOf = this.amountOverride } = {}) {
    const id = packIdOf(kind, from);
    if (!id) return null;
    if (!free) {
      const held = this.heldMap();
      if (!(held[id] > 0)) return null;
      if (--held[id] <= 0) delete held[id];
    }
    const spec = PACKS[id];
    const cards = draw(id, { random, featured: spec.featured ? featuredOf(id) : [] });
    if (amountOf) cards.forEach((c, i) => { const n = c.key ? null : amountOf(c, i); if (n >= 1) c.n = Math.floor(n); }); // (a key is always one)
    for (const c of cards) {
      const car = Cars.carById(c.car);
      if (c.key) {
        c.isNew = !Progress.owns(c.car);
        this.grantKey(c.car);
        continue;
      }
      const before = Ecu.blueprints(c.car) || 0;
      c.maxed = !!car && Ecu.max(car) > 0 && Ecu.level(car) >= Ecu.max(car); // (already at its top: kept as a count, no further effect)
      c.isNew = before === 0 && !Progress.owns(c.car);
      Ecu.addBlueprints(c.car, c.n ?? 1); // (the slot's amount)
      c.count = Ecu.blueprints(c.car);
    }
    const log = (Progress.data.packLog ||= []);
    log.unshift({ kind: id, cards: cards.map(c => ({ car: c.car, rarity: c.rarity, ...(c.key ? { key: true } : {}), ...(c.featured ? { featured: true } : {}) })) });
    log.length = Math.min(log.length, Math.max(0, packData.log ?? 20));
    Progress.save();
    window.dispatchEvent?.(new Event('packschange'));
    return { kind: id, id, from: spec.event ?? null, cards };
  },
  // a Career level delivered (Game.finish). firstTime: never delivered before, on either side. The pack's name, or ''
  // (the pack: the one whose givenBy.career lists the level: careerPack)
  levelDone(level, firstTime) {
    const id = careerPack();
    if (!id || !level || !firstTime || !careerLevels().includes(level.id)) return '';
    const claim = 'pack-' + level.id;
    if ((Progress.data.claimed ||= []).includes(claim)) return '';
    Progress.data.claimed.push(claim);
    const name = this.grant(id);
    this.revealNow();
    return name;
  },
  // a special event's stage done (events.js delivered): the packs whose givenBy.event names the event, one for a stage
  // done the first time (stage: true), one with the grand prize (prize: true). The names given, as a list
  eventDone(eventId, firstTime, prize) {
    const out = [];
    for (const p of eventPacks(eventId)) {
      if (firstTime && p.stage) out.push(this.grant(p.id));
      if (prize && p.prize) out.push(this.grant(p.id));
    }
    if (out.some(Boolean)) this.revealNow();
    return out.filter(Boolean);
  },
};
