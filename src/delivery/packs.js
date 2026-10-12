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
//   - BESPOKE cards are keys: a garage (key) car the player does not own yet. Only in the packs whose pool is 'all'.
//   - Kinds: career (evergreen only), special (a career pack with the featured cards: each slot but the last may
//     upgrade, and when it does each featured card rolls its own chance; one card a slot, a hit is picked from those
//     that came up; a slot that upgrades and hits none becomes a filler card of a higher rarity; the LAST slot is
//     always a featured card and is the pack's Epic-or-better), standard (5 cards) and ten (10, one Epic or better).
// A pack is not part of a run: it is drawn with Math.random (or the dice a check hands in), never the run's seeded
// dice, and what an opened pack held is written into the save at once (its cards given, and a log of it).
// Where packs come from: Packs.grant(kind). The first delivery of some Career levels (packs.json career), a special
// event's stages and its grand prize (packs.json events; events.json `featured` names an event's featured cars, else
// its prize car), the Shop (shop.js, a placeholder currency). A pack given is OPENED AT ONCE: Packs.revealNow asks the
// reveal screen (render/packs.js) to open it; until it has, it is held in the save, and opened at the next menu.
// ============================================================================
import packData from './packs.json';
import eventData from './events.json';
import tierData from './tiers.json';
import * as Cars from './cars.js';
import { LEVELS, isRace } from './levels.js';
import { Progress } from './progress.js';
import { Ecu } from './ecu.js';

export const RARITIES = Object.keys(packData.rarities); // (lowest first)
export const KINDS = Object.keys(packData.kinds);
const rank = (rarity) => RARITIES.indexOf(rarity);
const higher = (a, b) => (rank(a) >= rank(b) ? a : b);
export const rarityName = (rarity) => packData.rarities[rarity]?.name || rarity;
export const rarityColour = (rarity) => packData.rarities[rarity]?.colour || '#ffffff';
export const kindName = (kind) => packData.kinds[kind]?.name || kind;

// the cars that can be on a card: the roster now (a car added to it is in the pool from then on)
// (the evergreen blueprint cars are cars.js FILLER_CARS: read as EVERGREEN_CARS alone, a name cars.js never had, they
// were left out of every pack until the contents sheet listed the pool, 12-Oct)
export const roster = () => [...new Set([...(Cars.CARS || []), ...(Cars.FILLER_CARS || []), ...(Cars.EVERGREEN_CARS || [])])];
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

// the pools: { evergreen: { rarity: [car...] }, keys: [car...] } (cars: a list in place of the roster, for a check;
// owned: whether a car is owned, for the keys)
export const pools = ({ cars = roster(), owned = (id) => Progress.owns(id) } = {}) => {
  const evergreen = Object.fromEntries(RARITIES.filter(r => r !== 'bespoke').map(r => [r, []]));
  for (const car of cars) { const r = rarityOf(car); if (r && evergreen[r]) evergreen[r].push(car); }
  const keys = cars.filter(car => isKeyCar(car) && car.price > 0 && !owned(car.id));
  return { evergreen, keys };
};

// a featured card's rarity: its car's own, else packs.json featuredRarity; never below Epic (it is the pack's Epic-or-better)
const featuredRarity = (car) => higher(car.rarity && rank(car.rarity) >= 0 ? car.rarity : packData.featuredRarity || 'legendary', 'epic');

// A pack drawn: its cards, nothing given. { rarity, car (its id), key (a Bespoke key card), featured, upgraded }.
// random: the dice (0 <= n < 1); featured: the special pack's featured cars (car objects)
export const draw = (kind, { random = Math.random, cars, owned, featured = [], spec = packData.kinds[kind] } = {}) => {
  if (!spec) throw new Error('no such pack: ' + kind);
  const { evergreen, keys } = pools({ cars, owned });
  const byRarity = { ...evergreen, ...(spec.pool === 'all' ? { bespoke: [...keys] } : {}) };
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
  const locked = new Set();
  const feats = [...new Set(featured.filter(Boolean))];
  const featuredCard = (car) => ({ rarity: featuredRarity(car), car: car.id, key: false, featured: true, upgraded: true });
  // special: the last slot is a featured card (no featured cars: an Epic-or-better filler)
  if (spec.featured) { slots[size - 1] = feats.length ? featuredCard(pick(feats)) : card(roll('epic')); locked.add(size - 1); }
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
  // special: each slot but the last may upgrade; a featured card each rolls its own chance; none hit: a higher filler
  if (spec.featured) {
    const { upgradeChance = 0.25, featuredChance = 0.2 } = spec.featured;
    for (let i = 0; i < size - 1; i++) {
      if (!(random() < upgradeChance)) continue;
      const hits = feats.filter(() => random() < featuredChance);
      if (hits.length) { slots[i] = featuredCard(pick(hits)); continue; }
      const above = have().find(r => rank(r) > rank(slots[i].rarity) && r !== 'bespoke');
      slots[i] = { ...card(above || slots[i].rarity), upgraded: true };
    }
  }
  return slots;
};

// What a pack can give, every card of it (the Shop's "What's inside" sheet, render/packcontents.js): read from the same
// pools draw() picks from, at call time, so a car added to the roster is listed with no edit. For a PLAIN slot (one no
// rule has rolled again): the share of each rarity the pool has cards of (packs.json odds among those), split evenly
// over its cards, so a rarity's cards add up to its share. A special pack's FEATURED cards come first, each with its
// chance to be in a pack (the last slot is always one of them; each other slot upgrades at upgradeChance, and then each
// featured card is hit at featuredChance, one picked from those hit): 1 - (1 - 1/F)(1 - q)^(size-1), where
// q = upgradeChance * (1 - (1 - featuredChance)^F) / F is a slot's chance to become that card.
// { kind, name, size, total (cards listed), odds: [{ rarity, share }], groups: [{ rarity, share, cards: [{ car, chance,
// key }] }], featured: [{ car, rarity, chance, lastSlot }], atLeast }
export const contents = (kind, { featured = [], cars, owned, spec = packData.kinds[kind] } = {}) => {
  if (!spec) return null;
  const { evergreen, keys } = pools({ cars, owned });
  const byRarity = { ...evergreen, ...(spec.pool === 'all' ? { bespoke: [...keys] } : {}) };
  const present = RARITIES.filter(r => byRarity[r]?.length);
  const weight = present.reduce((sum, r) => sum + (packData.odds[r] || 0), 0);
  const odds = present.map(r => ({ rarity: r, share: weight > 0 ? (packData.odds[r] || 0) / weight : 1 / present.length }));
  const groups = odds.map(({ rarity, share }) => ({ rarity, share,
    cards: byRarity[rarity].map(car => ({ car, chance: share / byRarity[rarity].length, key: rarity === 'bespoke' })) }));
  const size = Math.max(1, Math.floor(spec.size || 5));
  const feats = spec.featured ? [...new Set(featured.filter(Boolean))] : [];
  const F = feats.length, { upgradeChance = 0.25, featuredChance = 0.2 } = spec.featured || {};
  const q = F ? upgradeChance * (1 - (1 - featuredChance) ** F) / F : 0;
  const featuredList = feats.map(car => ({ car, rarity: featuredRarity(car), lastSlot: 1 / F, chance: 1 - (1 - 1 / F) * (1 - q) ** (size - 1) }));
  const total = new Set([...groups.flatMap(g => g.cards.map(c => (c.key ? 'key:' : '') + c.car.id)), ...feats.map(c => c.id)]).size;
  return { kind, name: kindName(kind), size, total, odds, groups, featured: featuredList, atLeast: { ...(spec.atLeast || {}) } };
};

// ---- the save: packs held (Progress.data.packs: a count by pack, 'kind' or 'kind:<event id>'), and the log ----
const packKey = (kind, from) => kind + (from ? ':' + from : '');
const splitKey = (key) => { const [kind, from = null] = String(key).split(':'); return { kind, from }; };
const eventEntry = (id) => (Array.isArray(eventData.special) ? eventData.special : []).find(e => String(e.id) === String(id)) || null;
// the featured cars of a special pack: its event's (events.json featured, else its prize car); a pack from no event:
// every event car
export const featuredFor = (from) => {
  const e = from ? eventEntry(from) : null;
  const ids = e ? (Array.isArray(e.featured) && e.featured.length ? e.featured : e.prize?.car ? [e.prize.car] : []) : (Cars.EVENT_CARS || []).map(c => c.id);
  return ids.map(id => Cars.carById(id)).filter(Boolean);
};

// the first delivery of these levels gives a career pack: every nth of the main list (the tiers in order, then the
// levels outside them, no races and no events), and those packs.json names
export const careerLevels = () => {
  const byId = new Map(LEVELS.map(l => [l.id, l]));
  const tiers = Object.keys(tierData.tiers || {}).map(Number).sort((a, b) => a - b).flatMap(n => tierData.tiers[n]);
  const main = [...tiers, ...(tierData.outside || [])].map(id => byId.get(id)).filter(l => l && !isRace(l));
  const every = Math.floor(packData.career?.every || 0);
  return [...new Set([...(every > 0 ? main.filter((_, i) => (i + 1) % every === 0).map(l => l.id) : []), ...(packData.career?.levels || [])])];
};

// ---- a pack's cards as the reveal shows them (render/packs.js) ----
// every card its own (the owner, 12-Oct: identical cards are NOT stacked; each shows x1 on its tab for now): { ...the
// card, n: 1 }. n is the count the card's xN badge shows, kept so stacking can come back later
export const revealCards = (cards) => (cards || []).map(c => ({ ...c, n: 1, featured: !!c.featured }));
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
    start[c.car] = (start[c.car] ?? Ecu.blueprints(c.car) ?? 0) - 1;
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
    if (c.key) key1 = true; else n1 = n0 + 1;
    bp[id] = n1; hasKey[id] = key1;
    const after = at(car, n1, key1);
    return { before, after, unlocks: !before.unlocked && after.unlocked, ecuUp: after.ecu > before.ecu, maxed: after.ecu >= after.max };
  });
};

export const Packs = {
  data: packData,
  // how many of a pack are held (kind alone: every pack of that kind, whatever event it is from)
  count(kind, from) {
    const held = Progress.data.packs || {};
    if (from !== undefined) return held[packKey(kind, from)] || 0;
    return Object.entries(held).filter(([k]) => splitKey(k).kind === kind).reduce((n, [, c]) => n + c, 0);
  },
  // the packs held: [{ key, kind, from, count, name }]
  held() {
    return Object.entries(Progress.data.packs || {}).filter(([, c]) => c > 0).map(([key, count]) => {
      const { kind, from } = splitKey(key), e = from ? eventEntry(from) : null;
      return { key, kind, from, count, name: kindName(kind) + (e ? ': ' + (e.short || e.name || e.id) : '') };
    }).sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
  },
  total() { return Object.values(Progress.data.packs || {}).reduce((n, c) => n + (c > 0 ? c : 0), 0); },
  // an unopened pack given (from: the event a special pack is from). Its name, or '' (no such kind)
  grant(kind, { from = null, n = 1 } = {}) {
    if (!packData.kinds[kind]) return '';
    const held = (Progress.data.packs ||= {}), key = packKey(kind, from);
    held[key] = (held[key] || 0) + n;
    Progress.save();
    window.dispatchEvent?.(new Event('packschange'));
    return kindName(kind);
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
    return first ? this.open(first.kind, { from: first.from, ...options }) : null;
  },
  // KEY HOOK: a Bespoke card's key given. Ecu.grantKey if ecu.js has one; else a key is what owning a garage car is
  // today (Progress.data.cars: bought or won), so the car is put in the cars owned
  grantKey(carId) {
    if (typeof Ecu.grantKey === 'function') return Ecu.grantKey(carId);
    if (!Progress.data.cars.includes(carId)) Progress.data.cars.push(carId);
  },
  // A pack opened: drawn, and every card given (a blueprint each through Ecu.addBlueprints; a key through grantKey).
  // free: true opens one not held (the debug route). { kind, from, cards } (each card with isNew, count, maxed), or
  // null (none held)
  open(kind, { from = null, free = false, random = Math.random } = {}) {
    if (!packData.kinds[kind]) return null;
    const held = (Progress.data.packs ||= {}), key = packKey(kind, from);
    if (!free) {
      if (!(held[key] > 0)) return null;
      if (--held[key] <= 0) delete held[key];
    }
    const cards = draw(kind, { random, featured: kind === 'special' || packData.kinds[kind].featured ? featuredFor(from) : [] });
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
      Ecu.addBlueprints(c.car, 1);
      c.count = Ecu.blueprints(c.car);
    }
    const log = (Progress.data.packLog ||= []);
    log.unshift({ kind, ...(from ? { from } : {}), cards: cards.map(c => ({ car: c.car, rarity: c.rarity, ...(c.key ? { key: true } : {}), ...(c.featured ? { featured: true } : {}) })) });
    log.length = Math.min(log.length, Math.max(0, packData.log ?? 20));
    Progress.save();
    window.dispatchEvent?.(new Event('packschange'));
    return { kind, from, cards };
  },
  // a Career level delivered (Game.finish). firstTime: never delivered before, on either side. The pack's name, or ''
  levelDone(level, firstTime) {
    if (!level || !firstTime || !careerLevels().includes(level.id)) return '';
    const claim = 'pack-' + level.id;
    if ((Progress.data.claimed ||= []).includes(claim)) return '';
    Progress.data.claimed.push(claim);
    const name = this.grant('career');
    this.revealNow();
    return name;
  },
  // a special event's stage done (events.js delivered): a pack for a stage done the first time, and one with the
  // grand prize (packs.json events). The names given, as a list
  eventDone(eventId, firstTime, prize) {
    const out = [], { stage, prize: forPrize } = packData.events || {};
    if (firstTime && stage) out.push(this.grant(stage, stage === 'special' ? { from: eventId } : {}));
    if (prize && forPrize) out.push(this.grant(forPrize, forPrize === 'special' ? { from: eventId } : {}));
    if (out.some(Boolean)) this.revealNow();
    return out.filter(Boolean);
  },
};
