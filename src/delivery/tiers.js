// ============================================================================
// TIERS - the level progression rework (owner's spec, 10-Oct and 11-Oct; the checklist's R1 to R8 and Q45).
// The levels are in tiers of five (tiers.json, one id once: edit it by hand or with scripts/tiers.mjs). Tiers 1 to 5
// are the gold-star tiers, 6 to 10 the Blue Star ones (Blue 1 is tier 6). Each level has two medals,
// Good's and Evil's: a medal is earned by delivering the level on time on that side (a level with no side to choose,
// the Battlefield or an "always Good" level, gives both at once). Nothing is saved for a medal: it IS the best
// time on that side (Progress.bestTime), so an old save's best times are its medals, and no save is lost.
//   - a tier opens when the one before is cleared (its last level delivered on either side). Tier 1 is open.
//     Blue 1 is tier 6: it opens when level 5 of the five-star tier is beaten.
//   - inside a tier: levels 1 and 2 are open with it; 3 needs 2 medals, in this tier; 4 needs 4 medals; 5 needs level 4 beaten (a level further on needs the one before it)
//   - a medal not yet earned can only be played in a car of EXACTLY that tier (the same stars and colour of
//     stars; none of the cars outside the tiers). Earned, the level can be replayed on that side in any car
//   - a level the owner has listed "outside" the tiers has no medal rule and no car rule. They open one after
//     another in the order listed, the first once the last tier is cleared (the old rule, at the end of the game);
//     the amphibious ones by amphibiousOpens below; races are always open
//   - a save that had levels open before the rework keeps them (Progress.data.tierBase: see legacy())
// CONFIG.progression.tiers switches all of it off: the old rule, as it was (the stage and the garage read `on()`).
// (5c, for the later rebalance, NOT built: traffic will be made of the cars in the tier of its level)
// ============================================================================
import tierData from './tiers.json';
import { CONFIG } from './config.js';
import { LEVELS, LEVEL, AMPHIBIOUS_LEVELS, isRace, levelName as levelNameOf } from './levels.js';
import { Progress } from './progress.js';
import { CARS, carTier, setTierHooks } from './cars.js';

const byId = new Map(LEVELS.map(level => [level.id, level]));
const idsOf = (list) => (Array.isArray(list) ? list : []).map(String);
const TIER_NUMBERS = Object.keys(tierData.tiers || {}).map(Number).filter(n => n >= 1).sort((a, b) => a - b);
// the tiers: [ [level...] ] by tier number - 1; ids that name no level are dropped here (the check says so)
const TIERS = TIER_NUMBERS.map(n => idsOf(tierData.tiers[n]).map(id => byId.get(id)).filter(Boolean));
const OUTSIDE = idsOf(tierData.outside).map(id => byId.get(id)).filter(Boolean);
const placeOf = new Map();
TIERS.forEach((list, t) => list.forEach((level, p) => placeOf.set(level, { tier: TIER_NUMBERS[t], index: t, pos: p + 1 })));
// outside levels that open in a chain (not races, which are always open; not amphibious, which have a rule of their own)
const CHAIN = OUTSIDE.filter(level => !isRace(level) && !level.amphibious && !AMPHIBIOUS_LEVELS.includes(level));
// the delivery levels in the order the menu shows them: the tiers, then the others
const ORDER = [...TIERS.flat(), ...OUTSIDE.filter(level => !isRace(level))];

const switched = (() => {
  try { const v = new URLSearchParams(location.search).get('tiers'); return v === '1' ? true : v === '0' ? false : null; } catch { return null; }
})();
const oneSided = (level) => !!(level.battle || level.alwaysGood);

// the tier as a span of star glyphs in its colour (gold or blue), labelled for a screen reader
export const tierStarsNode = (n) => {
  const span = document.createElement('span');
  span.className = 'tierstars ' + (n > 5 ? 'blue' : 'gold');
  span.textContent = '\u2605'.repeat(((n - 1) % 5) + 1);
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', Tiers.spoken(n));
  return span;
};
// text with {tier:n} tokens as nodes: words and star spans
export const richTiers = (text) => String(text).split(/(\{tier:\d+\})/).filter(Boolean).map(part => {
  const m = part.match(/^\{tier:(\d+)\}$/);
  return m ? tierStarsNode(Number(m[1])) : part;
});

export const Tiers = {
  tiers: TIERS,                       // [[level]] by tier (tier number = index + 1 while the file counts from 1)
  outside: OUTSIDE,
  order: ORDER,
  on() { return switched ?? !!CONFIG.progression?.tiers; },
  // which side is being played (the menu's pick): set by game.js, which owns it
  sideIsEvil: () => false,
  // { tier } while a run (or its results screen) is on: the car rule as it stood when the run started; null otherwise
  hold: null,

  // what is wrong with tiers.json, as lines (none: it is sound): an id that names no level, a level twice or in
  // neither place, a tier that is not five levels, a tier number that skips
  problems() {
    const out = [], seen = new Map(), known = new Set(LEVELS.map(level => level.id));
    const note = (id, where) => { if (!known.has(id)) out.push('"' + id + '" in ' + where + ' is not a level'); else if (seen.has(id)) out.push(id + ' is in both ' + seen.get(id) + ' and ' + where); else seen.set(id, where); };
    const nums = Object.keys(tierData.tiers || {}).map(Number);
    nums.forEach((n, i) => { if (n !== i + 1) out.push('tiers are numbered ' + nums.join(', ') + ': they must run 1, 2, 3...'); });
    for (const [n, list] of Object.entries(tierData.tiers || {})) {
      idsOf(list).forEach(id => note(id, 'tier ' + n));
      if (idsOf(list).length !== 5) out.push('tier ' + n + ' has ' + idsOf(list).length + ' levels, not 5 (it works, but the rules assume five)');
    }
    idsOf(tierData.outside).forEach(id => note(id, 'outside'));
    for (const level of LEVELS) if (!seen.has(level.id)) out.push(level.id + ' is in no tier and not listed outside');
    return out;
  },

  // where a level is: { tier, pos } (pos from 1), or null for a level outside the tiers
  place(level) { return placeOf.get(level) || null; },
  // a tier's name as the menu shows it: 'Gold 3', 'Blue 2'; its stars and their colour
  // a tier in text is the token {tier:n}: the menu draws it as a row of stars in the tier's colour (tierStarsNode), and
  // plain() makes it star glyphs for a title; there is no word for a tier (the owner: "just render the stars")
  tierName(n) { return '{tier:' + n + '}'; },
  plain(text) { return String(text).replace(/\{tier:(\d+)\}/g, (m, n) => '\u2605'.repeat(this.tierStars(Number(n)))); },
  // for a screen reader: '2 stars gold', '3 stars blue'
  spoken(n) { const s = this.tierStars(n); return s + (s === 1 ? ' star ' : ' stars ') + (n > 5 ? 'blue' : 'gold'); },
  tierStars(n) { return ((n - 1) % 5) + 1; },
  tierIsBlue(n) { return n > 5; },

  // ---- medals: the best times, read as medals (one a side delivered) ----
  medalEarned(level, evil) { return oneSided(level) ? this.medals(level) === 2 : Progress.bestTime(level.id, !!evil) !== undefined; },
  // medals earned on a level (0 to 2; a level with no side to choose gives both at once)
  medals(level) {
    const good = Progress.bestTime(level.id, false) !== undefined, evil = Progress.bestTime(level.id, true) !== undefined;
    return oneSided(level) ? (good || evil ? 2 : 0) : (good ? 1 : 0) + (evil ? 1 : 0);
  },
  beaten(level) { return this.medals(level) > 0; },
  // medals earned across a tier
  tierMedals(n) { return (TIERS[TIER_NUMBERS.indexOf(n)] || []).reduce((sum, level) => sum + this.medals(level), 0); },

  // ---- what is open ----
  // Levels open before the rework stay open: the count of levels the save had open (by position in LEVELS), taken
  // the first time the tiers are looked at. (`unlocked` goes on being kept by the old rule, so switching the tiers
  // off gives the old game back, as it would be.)
  legacy() {
    const data = Progress.data;
    if (typeof data.tierBase !== 'number') data.tierBase = Math.max(1, data.unlocked);
    return data.tierBase;
  },
  tierCleared(n) {
    const list = TIERS[TIER_NUMBERS.indexOf(n)] || [];
    return list.length > 0 && this.beaten(list[list.length - 1]);
  },
  tierOpen(n) {
    const i = TIER_NUMBERS.indexOf(n);
    if (i <= 0) return true;
    return this.tierCleared(TIER_NUMBERS[i - 1]) || (TIERS[i] || []).some(level => LEVELS.indexOf(level) < this.legacy());
  },
  // What opens an amphibious level (the owner, 11-Oct, question 12): "It unlocks after earning at least half a
  // ribbon on every stage in its corresponding blue star tier" (now: a medal on every level of it). A_n goes with the tier of n blue stars (tier 5 + n).
  // (The level still needs an amphibious car to start: Game.canStart.) The ONE place to change that rule.
  amphibiousOpens(level) {
    const n = AMPHIBIOUS_LEVELS.indexOf(level) + 1, list = TIERS[TIER_NUMBERS.indexOf(5 + n)] || [];
    return n > 0 && list.every(stage => this.beaten(stage));
  },
  // The count of medals level `pos` of a tier needs from the stages before it, or a level to be beaten
  // first: { medals } | { level } | null (open with the tier)
  need(level) {
    const place = placeOf.get(level);
    if (!place) return null;
    const list = TIERS[place.index];
    if (place.pos <= 2) return null;
    if (place.pos === 3) return { medals: 2 };
    if (place.pos === 4) return { medals: 4 };
    return { level: list[place.pos - 2] }; // (the one before it)
  },
  isOpen(level) {
    if (isRace(level)) return true;
    if (LEVELS.indexOf(level) < this.legacy()) return true; // (open before the rework)
    const place = placeOf.get(level);
    if (place) {
      if (!this.tierOpen(place.tier)) return false;
      const need = this.need(level);
      if (!need) return true;
      return need.medals ? this.tierMedals(place.tier) >= need.medals : this.beaten(need.level);
    }
    if (level.amphibious || AMPHIBIOUS_LEVELS.includes(level)) return this.amphibiousOpens(level);
    const k = CHAIN.indexOf(level);
    if (k < 0) return true; // (a level neither listed nor in a tier: the check says so; it is not locked away)
    if (k === 0) return TIERS.length === 0 || this.tierCleared(TIER_NUMBERS[TIER_NUMBERS.length - 1]);
    return this.beaten(CHAIN[k - 1]);
  },
  // why a level is locked, in words for the menu (a tier is the token {tier:n}: star glyphs; and no word "ribbon")
  lockedBecause(level) {
    const place = placeOf.get(level);
    if (place) {
      if (!this.tierOpen(place.tier)) {
        const before = TIERS[TIER_NUMBERS.indexOf(place.tier) - 1] || [];
        return before.length ? 'Earn a medal on level ' + before.length + ' of ' + this.tierName(place.tier - 1) + ' to open this tier' : 'Locked';
      }
      const need = this.need(level);
      if (need && need.medals) {
        const more = need.medals - this.tierMedals(place.tier);
        return 'Earn ' + more + ' more medal' + (more === 1 ? '' : 's') + ' in ' + this.tierName(place.tier) + ' (one for each side a level is delivered on)';
      }
      if (need && need.level) return 'Earn a medal on level ' + (place.pos - 1);
      return 'Locked';
    }
    if (level.amphibious || AMPHIBIOUS_LEVELS.includes(level)) {
      const n = AMPHIBIOUS_LEVELS.indexOf(level) + 1, t = 5 + n, left = (TIERS[TIER_NUMBERS.indexOf(t)] || []).filter(stage => !this.beaten(stage)).length;
      return 'Earn a medal on every level of ' + this.tierName(t) + ' (' + left + ' to go)';
    }
    const k = CHAIN.indexOf(level);
    if (k > 0) return 'Earn a medal on ' + levelNameOf(CHAIN[k - 1]);
    const last = TIER_NUMBERS[TIER_NUMBERS.length - 1] || 10;
    return 'Earn a medal on level ' + ((TIERS[TIER_NUMBERS.indexOf(last)] || []).length || 5) + ' of ' + this.tierName(last);
  },
  // the delivery level after this one in the menu's order (tiers, then the rest), or null
  next(level) {
    if (isRace(level)) return null;
    const k = ORDER.indexOf(level);
    return k >= 0 && k + 1 < ORDER.length ? ORDER[k + 1] : null;
  },

  // ---- the car rule ----
  // the tier a car must be from to start the level on the side: null = any car (the tiers are off, the level is
  // outside them, it brings its own vehicle, it is amphibious, or the side's half is already earned)
  restriction(level, evil) {
    if (!this.on() || !level || level.car || level.amphibious || isRace(level)) return null;
    const place = placeOf.get(level);
    if (!place) return null;
    return this.medalEarned(level, !!evil && !oneSided(level)) ? null : place.tier;
  },
  carsOfTier(n) { return CARS.filter(car => carTier(car) === n); },
  ownedOfTier(n) { return this.carsOfTier(n).filter(car => Progress.owns(car.id)); },
};
// (the Blue Star cars are in the garage once Blue 1 is open; and the garage and the car in use ask the rule)
setTierHooks({
  // (held for the whole of a run and its results: delivering a level earns its medal and ends the rule, which
  // must not change the car the run's finish animation draws mid-way: Game.start sets `hold`, Game.toMenu clears it)
  restricted: (evil) => { try { return Tiers.hold ? Tiers.hold.tier : Tiers.on() ? Tiers.restriction(currentLevel(), evil ?? Tiers.sideIsEvil()) : null; } catch { return null; } },
  blueOpen: () => Tiers.on() ? Tiers.tierOpen(6) || Tiers.legacy() > CONFIG.blueStarsAfter : null,
});
const currentLevel = () => LEVEL; // (the live binding: the level picked)
