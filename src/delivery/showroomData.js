// ---- the showroom's cards, as data (no drawing here: render/showroom.js draws them; scripts/.showroom-check.mjs reads them)
// The SHOWROOM is where a car is picked (BLUEPRINTS-NOTES.md, CHECKLIST 115): every car the player has or could have,
// one card each: its name, stars, rarity, its ECU (a pip per ECU up to its maximum, filled up to the ECU it is at),
// its blueprints toward the next ECU, and whether it can be driven, and if not, why. Buying stays in the car lot,
// Crazey Jim's Used Cars (render/garage.js). The ECU figures are ecu.js's (Ecu); anything it does not say about a
// car (a secret one, an earned one it has no table for) falls back to the car's own figures, so a card never throws.
import { CONFIG } from './config.js';
import { CARS, EARNED_CARS, EVENT_CARS, BESPOKE_CARS, FILLER_CARS, SECRET_CARS, stars, starColour, STAR_COLOURS, carTier, carPreview, forSale, carRule, carFocus, carLent, carPicked, ruleAllows, selectCar, carInUse } from './cars.js';
import { Progress } from './progress.js';
import { Game } from './game.js';
import { Tiers } from './tiers.js';
import { LEVELS } from './levels.js';
import { levelName } from './levelText.js';
import { Ecu } from './ecu.js';
import { packName } from './packs.js';
import { liveEventFor, huntEventFor } from './carsources.js';

// the words players see on a car that cannot be driven (the owner's, 12-Oct)
export const LOCKED_WORDS = {
  key: 'You need the key to drive this car',
  lot: 'Purchase this car from the car lot',
  earn: 'Earn this car on its level', // (an earned / special car: no key about it: the owner, 12-Oct)
};
export const CAR_LOT = 'Crazey Jim\'s Used Cars'; // (the car lot's name, as players see it: render/garage.js)

// the rarity of a car's blueprint card, and so the colour of its card's frame (the ladder by star tier, BLUEPRINTS-NOTES.md)
export const RARITIES = {
  common: { name: 'Common', colour: '#9fb0c4' },
  uncommon: { name: 'Uncommon', colour: '#3ccf72' },
  epic: { name: 'Epic', colour: '#b46bff' },
  legendary: { name: 'Legendary', colour: '#ffa320' },
  bespoke: { name: 'Bespoke', colour: '#ff4f7b' },
  special: { name: 'Special', colour: '#ff5fd2' }, // (the 6-star earned cars, the secret bus: outside the ladder)
};
const EPIC_EVERGREEN = ['jetcar', 'slingshot', 'flyingcar']; // (a guess at the ids; a car's own `rarity` wins)
const tierOf = (car) => carTier(car) ?? (car.tier >= 1 && car.tier <= 5 && !car.earned ? car.tier + (car.blue ? 5 : 0) : null); // (an amphibious car keeps its stars' tier)
export const rarityOf = (car) => {
  const told = car.rarity || safe(() => Ecu.rarity?.(car));
  if (told && RARITIES[told]) return told;
  if (car.earned || Object.values(SECRET_CARS).includes(car)) return 'special';
  if (EVENT_CARS.includes(car)) return 'legendary';
  if (EPIC_EVERGREEN.includes(car.id)) return 'epic';
  const t = tierOf(car);
  return !t || t <= 4 ? 'common' : t <= 8 ? 'uncommon' : 'epic';
};

function safe(fn, fallback) { try { const v = fn(); return v === undefined || v === null || Number.isNaN(v) ? fallback : v; } catch { return fallback; } }
const blueprintCar = (car) => safe(() => Ecu.isBlueprint(car), !!car.evergreen);
const perEcu = (car) => safe(() => Ecu.x?.(car) ?? Ecu.perEcu?.(car), 5);
const figures = (car) => ({ maxSpeed: car.maxSpeed, accel: car.accel, health: car.health, respawn: CONFIG.respawnTime,
  agility: car.agility ?? 1, delivery: car.delivery ?? 1, composure: car.composure ?? 1, crossing: car.crossing ?? CONFIG.railCrossing.usual, weight: car.mass ?? 1 });
const statsAt = (car, level) => {
  const s = safe(() => Ecu.stats(car, level), null);
  return s ? { ...figures(car), ...s } : figures(car);
};

// every car on the showroom's floor, in its order (the earned cars that are OFF too, with the "Not available" overlay; a secret one owned, the City Bus, last)
// the floor's order (the owner, 12-Oct: "the tier sort ... should just mix all"): by the number of STARS, whatever their colour (gold,
// blue, sea green and magenta cars sit together, 1 star to 6), the cars with no stars (the Key cars) after them, a secret one last
const rank = (car) => Object.values(SECRET_CARS).includes(car) ? 90 : car.tier >= 1 ? car.tier : 7;
export const showroomCars = () => [...CARS, ...(FILLER_CARS || []), ...EVENT_CARS, ...BESPOKE_CARS, ...EARNED_CARS,
  ...Object.values(SECRET_CARS).filter(car => Progress.owns(car.id))]
  .sort((a, b) => rank(a) - rank(b) || (a.price || 0) - (b.price || 0) || a.name.localeCompare(b.name));

// how the tiers stand toward a car of a tier not open yet (render/garage.js's silhouette words)
const tierWhy = (car) => {
  const t = carTier(car), first = t && Tiers.tiers[Tiers.tiers.length ? Math.min(t, Tiers.tiers.length) - 1 : 0]?.[0];
  return first ? Tiers.lockedBecause(first) : '';
};

// One card: everything the showroom shows of a car. evil: the side picked (a level's car rule is a side's)
export const carCard = (car, evil = false) => {
  const max = Math.max(1, safe(() => Ecu.max(car), 1)), ecu = Math.max(0, Math.min(max, safe(() => Ecu.reached?.(car) ?? Ecu.level(car), 1))); // (reached: a locked key car shows the ECU its blueprints have got it to)
  const bp = safe(() => Ecu.blueprints(car.id), 0), x = Math.max(1, perEcu(car)), blueprint = blueprintCar(car);
  // blueprints toward the next ECU: a blueprint car's ECU k needs k*X; a key car's ECU k (k > 1) needs (k - 1)*X
  const told = safe(() => Ecu.progress?.(car), null);
  const nextAt = blueprint ? (ecu + 1) * x : ecu * x;
  const toNext = told?.need ?? x, have = told?.have ?? Math.max(0, Math.min(toNext, bp - (nextAt - x)));
  const maxed = ecu >= max;
  const upgradable = max > 1 || blueprint; // (a starter, a special car: never upgraded, no blueprints)
  const owned = Progress.owns(car.id);
  const unlocked = safe(() => Ecu.unlocked(car), owned);
  const preview = carPreview(car); // (the tiers: 'show' | 'teaser' | 'hide' | null)
  // (a blueprint car in no regular pack that an event's pack features, the Car Hunt's Blower Tourer: obtainable from the
  // event, whatever tiers are open: shown in full with its blueprint overlay, never dark nor a tier teaser)
  const hunt = (blueprint || car.concept) && car.noPacks ? huntEventFor(car) : null; // (and a concept key car: the Concept Strike's, CHECKLIST 211)
  const hidden = !hunt && !unlocked && !owned && bp === 0 && (preview === 'teaser' || preview === 'hide');
  // blacked out: a tier not open yet, or a car that cannot be had at the moment (a key car whose key is not to be had, an earned car that is off) with none owned and no blueprint
  const dark = hidden || (!unlocked && !owned && bp === 0 && ((car.keyAvailable === false && !blueprint) || !!(car.earned && car.off) || !!(blueprint && car.noPacks && !hunt)));
  // why it cannot be driven
  let reason = '', hint = '';
  if (!unlocked) {
    if (blueprint) {
      reason = 'Collect ' + Math.max(0, x - bp) + ' more blueprint' + (x - bp === 1 ? '' : 's') + ' to unlock this car';
      hint = hunt ? 'Blueprints come in the ' + packName(hunt.pack) + ': one for every ' + hunt.event.name + ' run' + (hunt.live ? '' : ' (back ' + new Date(hunt.next).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ')')
        : 'Blueprints come in card packs';
    } else if (CARS.includes(car) && !car.evergreen) {
      reason = LOCKED_WORDS.lot;
      hint = forSale(car) ? 'At ' + CAR_LOT + ' for $' + car.price.toFixed(2) : tierWhy(car) ? 'Not for sale yet: ' + tierWhy(car) : 'Not for sale yet';
    } else {
      reason = car.earned ? LOCKED_WORDS.earn : LOCKED_WORDS.key;
      if (car.earned) {
        const level = LEVELS.find(l => l.id === car.earned.level);
        hint = 'Beat the par on ' + (level ? levelName(level) : car.earned.level);
      } else if (EVENT_CARS.includes(car)) hint = 'The key: an event\'s grand prize' + (car.bespoke && !car.noPacks ? ', or a Bespoke card in packs' : '');
      else if (car.concept && hunt) hint = 'The key: deliver it at its max ECU on its ' + hunt.event.name + ' day' + (hunt.live ? ' (today: a free try)' : ' (back ' + new Date(hunt.next).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ')') + '. Blueprints: its ' + packName(hunt.pack);
      else if (car.bespoke) hint = car.keyAvailable === false || car.noPacks ? 'No key to be had at the moment' : 'The key: a Bespoke card, in card packs';
    }
  }
  // a car that can be driven, but not on the level picked (its car rule, on the side picked)
  const rule = carRule(evil), barred = unlocked && !!rule && !ruleAllows(rule, car), allowed = !rule || ruleAllows(rule, car);
  const focus = !!carFocus()?.test(car); // (a rotating event's day points the showroom at it: a view, not a rule)
  // LENT by the level picked (a rotating event's free try of its day's car, not owned: the owner, 13-Oct "players ECU up the
  // car they don't own, and only get the key when they max it out"): drivable, at the ECU its blueprints reach (ECU1 with none)
  const loan = !unlocked ? carLent(car) : null, lent = loan ? { ecu: loan.ecu, max: loan.max } : null;
  return {
    car, id: car.id,
    name: dark ? 'Locked car' : car.name,
    stars: stars(car), starColour: starColour(car), tier: tierOf(car),
    rarity: rarityOf(car), hidden, dark, hunt,
    ecu, max, maxed, upgradable, blueprint, key: !blueprint,
    blueprints: bp, perEcu: x, have: maxed ? toNext : have, toNext,
    owned, unlocked, barred, allowed, focus, lent,
    state: lent ? 'ready' : !unlocked ? 'locked' : barred ? 'barred' : 'ready',
    reason, hint,
    rule: barred ? rule : null,
    stats: statsAt(car, Math.max(1, ecu)), maxStats: statsAt(car, max),
    perk: car.perk || '',
    forSale: !owned && forSale(car),
  };
};

// ---- the LOCKED-CARD OVERLAY: what a card that cannot be driven wears over its picture (the owner, 12-Oct, after an
// Asphalt 9 locked card, "don't copy the text nor the colours"): a tint, a round badge with a thin ring and an icon, and a
// short caption. Every locked card has exactly one kind; a card that can be driven (ready, or barred on this level) none.
//   tier       a car of a tier not open yet (the silhouette, "Locked car"; or a car lot car its tier keeps off sale): a padlock
//   blueprint  a blueprint car still at ECU0: its blueprints toward unlocking, with a bar
//   unpurchased  a car lot car not bought, on sale: its price at Crazey Jim's
//   key        a Key car (Bespoke, event) without its key: the key badge (it really needs its key: the owner, 12-Oct)
//   earned     a special 6-star car not yet earned: a trophy, the level it is earned on. NEVER the word key (the owner)
// The full reason stays in the full view's panel and the card's tooltip; these words are the card's, short.
// Gives { kind, title, line, price?, have?, need? } or null. title / line may hold {tier:n} tokens (richTiers).
export const OVERLAY_KINDS = ['key', 'earned', 'unpurchased', 'tier', 'blueprint', 'unavailable'];
const priceWords = (price) => '$' + (Number.isInteger(price) ? String(price) : price.toFixed(2));
// unavailable: genuinely unobtainable (the owner, 12-Oct): "Not available at the moment": an earned car that is OFF (the Courier Special:
// no way to earn it for now). A Key car whose key can't be had now keeps the KEY overlay (the owner: they "should use the key overlay")
export const overlayOf = (card) => {
  if (!card || card.unlocked || card.lent) return null; // (a free try is drivable: its card says so with a badge, render/showroom.js)
  const car = card.car;
  if (car.earned && car.off) return { kind: 'unavailable', title: 'Not available', line: 'at the moment' };
  if (card.blueprint && car.noPacks && card.blueprints === 0 && !card.hunt) return { kind: 'unavailable', title: 'Not available', line: 'at the moment' }; // (a blueprint car in no pack for now: nothing to collect)
  if (card.hidden) return { kind: 'tier', title: 'Tier locked', line: card.tier ? 'Opens with the {tier:' + card.tier + '} tier' : 'Opens with a later tier' };
  if (card.blueprint) {
    const need = card.perEcu, have = Math.max(0, Math.min(need, card.blueprints));
    return { kind: 'blueprint', title: have + '/' + need + ' blueprints', line: card.hunt ? (card.hunt.live ? 'Win it in the ' : 'From the ') + card.hunt.event.name : 'From card packs', have, need }; // (the Car Hunt's car: its event, by name)
  }
  if (CARS.includes(car) && !car.evergreen) {
    if (card.forSale) return { kind: 'unpurchased', title: priceWords(car.price), line: 'At Crazey Jim’s', price: car.price };
    return { kind: 'tier', title: 'Tier locked', line: card.tier ? 'Opens with the {tier:' + card.tier + '} tier' : 'Not for sale yet' };
  }
  if (car.earned || Object.values(SECRET_CARS).includes(car)) {
    const level = car.earned && LEVELS.find(l => l.id === car.earned.level);
    return { kind: 'earned', title: 'Earn it', line: level ? 'Beat par on ' + levelName(level) : 'Earn it on its level' };
  }
  if (car.concept && card.hunt) return { kind: 'key', title: 'Needs its key', line: (card.hunt.live ? 'Win it in the ' : 'From the ') + card.hunt.event.name }; // (a concept car: CHECKLIST 211)
  return { kind: 'key', title: 'Needs its key', line: EVENT_CARS.includes(car) ? (liveEventFor(car) ? 'Win it in ' + liveEventFor(car) : 'Win it at events') : car.keyAvailable === false ? 'Not available at the moment' : 'Find it in Bespoke packs' };
  // (an event car: the live event by name; else the general line; the other Bespoke cars have no event: packs only)
};
// a lent card's words (a rotating event's free try): the badge's, and the full view's line
export const lentWords = (card) => card?.lent ? 'Free try · ECU ' + card.lent.ecu + '/' + card.lent.max : '';
// the card's tooltip: the spec's words (LOCKED_WORDS), but an earned car's never speaks of a key (the owner, 12-Oct)
export const cardTip = (card) => {
  const ov = overlayOf(card);
  if (ov?.kind === 'earned') return ov.title + ': ' + ov.line;
  return card.reason;
};

// the best figures on the floor, for the stat bars (by a car's MAXED figures, as the cars stand now)
export const floorBest = () => {
  // (the 6-star special cars (EARNED_CARS: the Road F1, the Road 8x8...) are left out, the owner, 12-Oct: "don't scale the bars to the highest 6 star cars": they would squash every other car's bar; theirs run to the end of the bar)
  const cards = showroomCars().filter(car => !EARNED_CARS.includes(car) && !car.earned).map(car => statsAt(car, safe(() => Ecu.max(car), 1)));
  const most = (key) => Math.max(...cards.map(s => s[key] ?? 0));
  return { maxSpeed: most('maxSpeed'), accel: most('accel'), health: most('health'),
    respawnBest: Math.min(...cards.map(s => s.respawn)), respawnWorst: Math.max(...cards.map(s => s.respawn)) };
};
// the ratio stats (Agility, Delivery, Composure, Crossing, Weight: CHECKLIST item 126) are SHOWN as whole numbers on a 0-100
// scale, never as 0.X / 1.X (the owner, 12-Oct): shown = round(ratio x STAT_SCALE), held to 0..100, so 1.0 (today's
// usual car) shows as 50. Change STAT_SCALE for another baseline. Only the showing: the game keeps the ratios
export const STAT_SCALE = 50;
export const statShown = (ratio) => Math.max(0, Math.min(100, Math.round((ratio ?? 0) * STAT_SCALE)));

// ---- the side: Good or Evil, picked in the showroom (its header and its detail share the one choice) ---------------
// It is the livery the cars are shown in, the side whose car rule marks the cards ("Not on this level"), and the side
// DRIVE drives as (as the car lot's "Drive it as Evil": render/garage.js takeSide). It starts on the side being played.
export const sideName = (evil) => evil ? 'Evil' : 'Good';
// a click on a half of a Good / Evil switch (the owner, 12-Oct, every such switch in the game): the other half picks
// that side, and the half already on flips it too. The side it leaves on
export const sideClick = (current, clicked) => !!clicked === !!current ? !current : !!clicked;
// the words on the detail's big button, for a card made for that side (carCard(car, evil))
export const driveWords = (card, evil) => card.state === 'ready' ? 'Drive as ' + sideName(evil) + (card.lent ? ' · Free try' : '')
  : card.state === 'barred' ? 'Not on this level as ' + sideName(evil)
    : card.forSale ? 'Buy at Crazey Jim’s' : 'Locked'; // (the car lot's sign: CAR_LOT)
// why a barred card is barred on that side, in parts: a string, { tier: n } (a tier's stars) or { rich: s } (words with
// {tier:n} tokens); render/showroom.js makes them nodes
export const barredWhy = (card, evil) => {
  const as = 'As ' + sideName(evil) + ', ';
  return card.rule?.tier ? [as + 'the level picked needs a ', { tier: card.rule.tier }, ' car (until its medal is earned)']
    : card.rule?.label ? [as + 'the level picked allows only ', { rich: card.rule.label }]
      : [as + 'this car is not allowed on the level picked'];
};
// DRIVE: the car AND the side (remembered, as the menu's own Good / Evil button is: render/menustage.js pickSide).
// The side first, so the car is picked under that side's car rule. False: the card cannot be driven on that side
export const driveAs = (card, evil) => {
  if (!card || card.state !== 'ready') return false;
  evil = !!evil;
  if (Game.evil !== evil) { Game.evil = evil; Progress.data.evil = evil; }
  // (a blueprint car unlocked by its blueprints is the player's: so the save says, where ecu.js has not written it)
  if (card.unlocked && !Progress.owns(card.id)) Progress.data.cars.push(card.id);
  Progress.save();
  if (!card.lent && card.id !== carInUse().id) selectCar(card.id); // (a free try is lent, never the player's pick: nothing saved)
  carPicked(card.id); // (a rotating event's stage: its free try on for the day's car, off for another, so Start drives the pick)
  return true;
};

// ---- the FILTERS and the SORT of the showroom's cards (the owner, 12-Oct: "filters beyond All / Ready / Locked") -----
// Pure: render/showroom.js draws the chips and remembers the choice; scripts/.showroom-check.mjs checks the cars each
// gives. A filter is { stars: [], colour: [], rarity: [], kind: [], state: [], sort }: within a group the chips picked are OR'd
// (3 stars OR 4), the groups AND'd (3 stars AND gold AND epic AND ready); an empty group lets every card by.
// The groups, their chips in order, and the words on them (a tier chip's stars are coloured by render/showroom.js)
export const FILTER_GROUPS = [
  // the stars a car has (1 to 6: a car outside the tiers, a Key car or a special one, has six), and, a separate choice that adds
  // to it, the colour of those stars (gold, blue, magenta, sea green)
  { id: 'stars', name: 'Stars', chips: [['1', '★1'], ['2', '★2'], ['3', '★3'], ['4', '★4'], ['5', '★5'], ['6', '★6']] },
  { id: 'colour', name: 'Star colour', chips: [['gold', 'Gold'], ['blue', 'Blue'], ['magenta', 'Magenta'], ['green', 'Sea green']] },
  { id: 'rarity', name: 'Rarity', chips: [['common', 'Common'], ['uncommon', 'Uncommon'], ['epic', 'Epic'], ['legendary', 'Legendary']] },
  { id: 'kind', name: 'Kind', chips: [['garage', 'Garage'], ['blueprint', 'Blueprint'], ['key', 'Key'], ['special', 'Special']] },
  { id: 'state', name: 'State', chips: [['ready', 'Ready'], ['locked', 'Locked'], ['upgradable', 'Upgradable'], ['maxed', 'Maxed'], ['inuse', 'In use'], ['barred', 'Not on this level'], ['allowed', 'Allowed on this level'], ['event', 'For today\u2019s event']] },
];
export const SORTS = [['tier', 'Tier'], ['rarity', 'Rarity'], ['ecu', 'ECU'], ['name', 'Name'], ['speed', 'Top speed']];
export const RARITY_ORDER = ['common', 'uncommon', 'epic', 'legendary', 'bespoke', 'special'];
export const noFilter = () => ({ stars: [], colour: [], rarity: [], kind: [], state: [], sort: 'tier' });
// a filter read from anywhere (the remembered one, an address): only chips and sorts that exist
export const cleanFilter = (f) => {
  const out = noFilter();
  for (const group of FILTER_GROUPS) {
    const told = Array.isArray(f?.[group.id]) ? f[group.id] : [];
    out[group.id] = group.chips.map(([id]) => id).filter(id => told.includes(id));
  }
  if (SORTS.some(([id]) => id === f?.sort)) out.sort = f.sort;
  return out;
};
// "stars:3,4;colour:gold;rarity:epic;state:ready;sort:speed" (the address's &filter=)
export const parseFilter = (text) => {
  const f = noFilter();
  for (const part of String(text || '').split(/[;|]/)) {
    const [key, value = ''] = part.split(':');
    if (key === 'sort') f.sort = value;
    else if (Array.isArray(f[key])) f[key] = value.split(',').filter(Boolean);
  }
  return cleanFilter(f);
};
export const filterCount = (f) => FILTER_GROUPS.reduce((n, group) => n + (f[group.id]?.length || 0), 0);
// a card's chip in each group
const secret = (car) => Object.values(SECRET_CARS).includes(car);
// the stars a card shows: the car's tier (an earned car's is 6); a Key car has none (the owner, 12-Oct: they need not have six)
export const starCountOf = (card) => (card.car.tier >= 1 ? card.car.tier : 0);
// the colour of those stars (cars.js starColour: magenta for the earned, Blueprint and Key cars)
const COLOUR_IDS = { [STAR_COLOURS.gold]: 'gold', [STAR_COLOURS.blue]: 'blue', [STAR_COLOURS.earned]: 'magenta', [STAR_COLOURS.amphibious]: 'green' };
export const colourOf = (card) => COLOUR_IDS[starColour(card.car)] || 'gold';
// the kinds of car (the owner, 12-Oct): Garage (the car lot's own), Blueprint (only ever got from blueprints), Key (a Bespoke key car:
// the Silver Comet and the like) and Special (the earned cars)
export const kindOf = (card) => card.car.bespoke || EVENT_CARS.includes(card.car) ? 'key'
  : card.car.earned || secret(card.car) ? 'special'
    : card.blueprint ? 'blueprint' : 'garage';
export const statesOf = (card, inUseId) => {
  const states = [card.state]; // ready | locked | barred
  if (card.upgradable && !card.maxed) states.push('upgradable');
  if (card.maxed && card.ecu >= 1) states.push('maxed');
  if (card.id === inUseId) states.push('inuse');
  if (card.allowed) states.push('allowed'); // (the level picked lets it be driven: its car rule, owned or not)
  if (card.focus) states.push('event'); // (the level picked points at it: a rotating event's day, cars.js carFocus)
  return states;
};
export const cardMatches = (card, f, inUseId) =>
  (!f.stars.length || f.stars.includes(String(starCountOf(card))))
  && (!f.colour.length || f.colour.includes(colourOf(card)))
  && (!f.rarity.length || f.rarity.includes(card.rarity))
  && (!f.kind.length || f.kind.includes(kindOf(card)))
  && (!f.state.length || statesOf(card, inUseId).some(s => f.state.includes(s)));
// the cards a filter lets by, in its sort (the cards come in the floor's order, showroomCars, which 'tier' keeps; a
// tie keeps it too). Rarity, ECU and speed: the most first; name: A to Z. A car of a tier not open yet (hidden) goes by
// what its card shows: "Locked car", and no figures (so last by speed)
const SORTERS = {
  tier: () => 0,
  rarity: (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
  ecu: (a, b) => b.ecu - a.ecu || b.max - a.max,
  name: (a, b) => a.name.localeCompare(b.name),
  speed: (a, b) => (b.hidden ? -1 : b.stats.maxSpeed) - (a.hidden ? -1 : a.stats.maxSpeed),
};
export const filterCards = (cards, f, inUseId) => {
  const sorter = SORTERS[f.sort] || SORTERS.tier;
  return cards.map((card, i) => [card, i]).filter(([card]) => cardMatches(card, f, inUseId))
    .sort(([a, i], [b, j]) => sorter(a, b) || i - j).map(([card]) => card);
};
// the filter a level's own car rule IMPOSES on the showroom when it is opened with that level picked (the owner, 13-Oct:
// "For events with filtered car requirements, impose that requirement on the showroom filter when clicking in"): for a
// level's own list (allowedCars: an event stage's, the Car Hunt's 3-star cars), the stars and star colours of the cars it
// allows when those let by EXACTLY those cars (the Car Hunt: stars 3, gold and magenta); else, added to them, the state
// chip 'allowed' ("Allowed on this level"), which always is exact. null: no such rule (a tier's medal rule is not imposed).
// cards: the floor's cards (carCard, on the side picked). For the visit only: render/showroom.js never remembers it.
// A rotating event's day (the Concept Strike, the owner 13-Oct: "filter the showroom to the stars requirement AND the free
// try car"; cars.js carFocus, no rule: every car still drivable) is imposed the same way: rule { list: true, test } and
// chip 'event' ("For today's event", card.focus) in place of 'allowed'
export const imposedFilter = (rule, cards, chip = 'allowed') => {
  if (!rule?.list) return null;
  const ok = cards.filter(card => ruleAllows(rule, card.car)), want = new Set(ok.map(c => c.id));
  const exact = (f) => { const got = filterCards(cards, f, null); return got.length === want.size && got.every(c => want.has(c.id)); };
  const f = cleanFilter({ stars: ok.map(c => String(starCountOf(c))), colour: ok.map(colourOf) });
  if (ok.length && exact(f)) return f;
  const g = { ...f, state: [chip] };
  return exact(g) ? g : { ...noFilter(), state: [chip] };
};
// the card before or after this one in a list (the full view's arrows): round from the last to the first
export const stepIn = (list, id, dir) => {
  if (!list.length) return null;
  const i = list.findIndex(card => card.id === id);
  return list[((i < 0 ? 0 : i + dir) % list.length + list.length) % list.length];
};
