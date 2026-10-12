// ============================================================================
// CARS - what the garage sells. Add an entry to put another car in it (its lot grows to hold them all).
//   price      in tip money; 0 = owned from the start. Buying a car buys both liveries.
//   color      body colour when playing Good
//   evilColor  body colour when playing Evil
//   fixedLivery true = the car only ever comes in those two colours: traffic of the same kind
//              wears them too (color for a good driver, evilColor for an evil one)
//   maxSpeed   m/s (turbo and TANK RAGE have their own top speeds in CONFIG)
//   accel      m/s^2 while accelerate is held
//   agility    how much faster than normal it moves sideways (default 1)
//   health     how much damage it takes before it is wrecked
//   crossing   how well it takes a railway track: 1 = over it at full speed, 0 = it crawls
//              over (see CONFIG.railCrossing; default CONFIG.railCrossing.usual)
//   hw, hl     hitbox half width / half length (m); height is the body height
//   model      an animated model of its own, by name (see src/render/models.js); without
//              one it is drawn as the standard box car, sized from hw / hl / height
//   tank       true = it is a tank: in TANK RAGE from the start of every level
//   corner     true = parked in the far corner bay of the garage
//   tier       which tier of the garage it is in (1-5): its star rating, shown with its name
//   trait      a perk of its own, by name: 'slim' (the Mini: a scrape down another car's side costs it nothing: see
//              Collision), 'mud' (the Rally Car: mud neither slows it nor dulls its steering: see Player), 'rocks' (the 6x6: a fallen rock
//              is smashed aside at no cost: see Collision). perk: the words for it, shown in the garage.
//              SHELVED: 'tow' (the Tow Truck clearing landed wreckage: see Wreckage, CONFIG.wreckage towAfter/towKept
//              and the 'towed' message). No car has it now; give one trait: 'tow' and a perk to bring it back
//   blue       true = a Blue Star car (the second season): better than a car of its tier with gold
//              stars, but not as good as one a tier up; priced like a car two tiers up
//   amphibious true = it floats: it drives down a slipway into a water stage (a level's "water") and on across
//              it as a boat, slower and softer to steer (see CONFIG.water and water.js). The amphibious cars are a
//              section of the garage of their own (see amphibiousCars and the garage), with sea-green stars, one at
//              each star level, open from the start; an amphibious level (its "amphibious") is only driven in one
//   draft      m of an amphibious car that is under the water when it is afloat (default CONFIG.water.draft)
//   mass       how heavy it is in a shove (default 1): heavier knocks others aside and is knocked less
//   delivery   (optional) its package efficacy, a share (default 1): a Good gift's standing gain and an Evil flaming
//              package's damage are multiplied by it (packages.js)
//   composure       (optional) its shoulder fuse, a share of CONFIG.dangerTime (default 1: Social.dangerTime)
//   (maxSpeed, accel, health, agility, crossing, delivery and composure are the car's figures at its MAXED ECU: a lower ECU's
//   are in ecus.json, lower; mass is the same at every ECU, as `weight` there. See ecu.js, carStats)
//   shotBack   (optional) how much further back the studio camera (?cine=car) stands for its picture, for
//              a vehicle whose wings reach past its hit box
// ============================================================================
import { Progress } from './progress.js';
import { CONFIG } from './config.js';
import { IDEA_CARS } from './ideas.js';
import { applyNames } from './words.js';

// The car ideas (ideas.js IDEA_CARS: thirty placeholders, tierless and free) are driven as garage cars are,
// but kept out of CARS, which traffic, Car Swap, "Unlock everything", the garage's lot and its filters, the
// start screen's bars and the balance checks all go by: only the lookups of the car in use (find, below)
// look in both. Progress.owns() says yes to every one, so none is ever in a save's list of cars
Progress.freeCars = IDEA_CARS;

// a car's star rating, by its tier (none for a car out of the tiers)
export const TIERS = 5;
// The Blue Star rule: a Blue Star car's top speed, acceleration and health are each strictly below the best of
// the gold tier above its own (so it never outdoes a car a tier up at what that tier does best). The top tier
// has none above it yet, so its Blue Stars are held under this: the room kept for a six-star gold tier, which
// would top out here. The Classic GT (48 m/s) is the fastest car in the garage, and stays so until then: a
// six-star tier would run from 49 to 52 m/s, still well short of the level cars (the UFO's 58, a GT racer's 62).
// (No longer enforced: the owner, 12-Oct, CHECKLIST item 115, dropped the rule with the ECUs; scripts/.balance-check.mjs
// had its tier ceilings removed. Kept as a figure for reference)
export const NEXT_TIER_CAPS = { maxSpeed: 52, accel: 24, health: 450 };
export const stars = (car) => car.tier ? '★'.repeat(car.tier) : ''; // (only the stars it has: no empty ones; a Key car has none, as an event car never had) // (only the stars it has: no empty ones)
// (a 6-star car, earned rather than bought, has magenta stars: see EARNED_CARS)
// (and an amphibious car's are sea green: a section of the garage of its own, see amphibiousCars)
export const STAR_COLOURS = { gold: '#ffd23f', blue: '#4fa8ff', earned: '#ff5fd2', amphibious: '#35d6b4' };
// (the Blueprint cars (evergreen) and the Key cars (Bespoke, event) have magenta stars like the earned ones: the owner, 12-Oct)
export const isMagentaCar = (car) => !!car && (car.earned || car.evergreen || car.bespoke || car.event);
export const starColour = (car) => isMagentaCar(car) ? STAR_COLOURS.earned : car.amphibious ? STAR_COLOURS.amphibious : car.blue ? STAR_COLOURS.blue : STAR_COLOURS.gold;
// the Blue Star cars are in the garage once level CONFIG.blueStarsAfter is delivered (which opens the next)
export const blueStarsOpen = () => tierHooks.blueOpen?.() ?? Progress.data.unlocked > CONFIG.blueStarsAfter;
// ---- the level tiers (tiers.js): which tier a car is in, and the car rule on a level not yet beaten ----
// a car's tier number: 1 to 5 for the gold-star cars, 6 to 10 for the Blue Star ones (Blue 1 is 6); null for a car
// outside the tiers (earned, amphibious, tierless, secret, a level's own vehicle)
export const carTier = (car) => car && car.tier >= 1 && car.tier <= TIERS && !car.earned && !car.amphibious && !car.super && (CARS.includes(car) || FILLER_CARS.includes(car)) ? car.tier + (car.blue ? 5 : 0) : null; // (an evergreen blueprint car too)
// hooks tiers.js sets when it loads: rule() the car rule on the level picked (null: any car; see carRule below),
// blueOpen() whether the Blue Star cars are in the garage (null: the old rule)
const tierHooks = {};
export const setTierHooks = (hooks) => Object.assign(tierHooks, hooks);
// (evil: the side to ask for; left out, the side the garage is looking at while it is open, else the side being played)
let viewSide = null;
export const setViewSide = (evil) => { viewSide = evil === null || evil === undefined ? null : !!evil; };
// ---- the car rule: what may be driven on the level picked ----
// null: any car. { tier, key, label }: only a car of that tier (tiers.js: a medal not yet earned). { list: true, test,
// key, label }: only the cars a level's own "allowedCars" names (see listRule). Either way the car must be owned, and the
// level's own vehicle ("car": a car lock) comes ahead of both. `label` says what is allowed, with {tier:n} tokens
export const carRule = (evil) => tierHooks.rule?.(evil ?? viewSide) ?? null;
export const restrictedTier = (evil) => carRule(evil)?.tier ?? null; // (the tier of a tier rule; null for none or a list)
const tierRules = {};
export const tierRule = (tier) => tierRules[tier] ||= { tier, key: String(tier), label: '{tier:' + tier + '} cars' };
export const ruleAllows = (rule, car) => !rule || (!!car && (rule.tier ? carTier(car) === rule.tier : rule.test(car)));
// may this car be driven on the level picked, on that side (or the garage's side)? A car in no tier, an earned or idea
// car, is not allowed where a tier is wanted; the null car is never allowed
export const carAllowedOn = (car, evil) => !!car && !car.silhouette && ruleAllows(carRule(evil), car);
// A level's own list (levelSchema.js "allowedCars"): { cars: [ids], tiers: [n], maxSpeed: m/s }. A car is allowed if it
// is one of `cars` or of one of `tiers` (neither given: any car), and no faster than maxSpeed if that is given. Always
// in force on that level, medal or none, in place of the tier rule. (One rule object a level, so it can be compared)
const listRules = new WeakMap();
export const listRule = (level) => {
  if (!level?.allowedCars) return null;
  if (listRules.has(level)) return listRules.get(level);
  const a = level.allowedCars, ids = new Set(a.cars || []), tiers = new Set(a.tiers || []), max = Number(a.maxSpeed) || 0;
  const test = (car) => (!ids.size && !tiers.size || ids.has(car.id) || tiers.has(carTier(car))) && (!max || car.maxSpeed <= max);
  const names = [...ids].map(id => carById(id)?.name || id);
  const label = [names.length ? names.join(', ') : '', [...tiers].map(t => '{tier:' + t + '}').join(' '), max ? 'no faster than ' + Math.round(max * 3.6) + ' km/h' : '']
    .filter(Boolean).join(names.length && tiers.size ? ' or ' : ', ') || 'any car';
  const rule = { list: true, test, key: level.id, label: label + (names.length && !tiers.size && !max ? '' : ' cars') };
  listRules.set(level, rule);
  return rule;
};
// the cars a rule can be met with: the garage's, the earned and the event ones (an idea only where a list names it)
const ruleCars = (rule) => [...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...FILLER_CARS, ...(rule.list ? IDEA_CARS : [])].filter(car => ruleAllows(rule, car));
// the silhouette shown where the player has no car the level allows: the cheapest car it allows, drawn dark
// (silhouette: true; id 'null-car'), never owned and never driven (Game.canStart is false while it is in use)
const nullCars = {};
export const nullCarFor = (rule) => (typeof rule === 'number' ? nullCarFor(tierRule(rule)) : nullCars[rule.key + (rule.list ? ':list' : '')] ||= (() => {
  const like = ruleCars(rule).filter(car => CARS.includes(car)).sort((a, b) => a.price - b.price)[0] || ruleCars(rule)[0] || CARS[0];
  return { ...like, id: 'null-car', name: 'No car for this level', silhouette: true, tierNeeded: rule.tier ?? null, ruleLabel: rule.label, price: 0 };
})()); // (a tier number will do for a tier's rule)
// the car the level's rule puts the player in: their pick if it is allowed; else the car they last chose for that
// rule (Progress.data.tierCars, by the rule's key: its tier, or the level's id) or the best they own of it; else the
// null car. The pick itself is not touched
const forcedCar = (pick, rule) => {
  if (!rule || ruleAllows(rule, pick)) return pick;
  const owned = ruleCars(rule).filter(car => Progress.owns(car.id));
  const chosen = owned.find(car => car.id === Progress.data.tierCars?.[rule.key]);
  return chosen || owned.sort((a, b) => b.price - a.price)[0] || nullCarFor(rule);
};
// the cars the garage shows now (an earned car only once it is earned: see EARNED_CARS)
// With the tiers on (tiers.js carPreview): a car of a tier beyond the next is not in the garage, a car of the next tier is
// there as a black silhouette ('teaser': stars shown, no name, stats or price, and it cannot be bought or picked), and
// an owned car, or one in no tier, is always there. With the tiers off: the old Blue Star rule.
export const carPreview = (car) => tierHooks.preview?.(car) ?? null; // 'show' | 'teaser' | 'hide' | null (the tiers are off)
export const isTeaser = (car) => carPreview(car) === 'teaser';
// On a level with a list of its own (listRule) every car it allows is parked too, owned or not, drawn in full: one the
// player could buy anyway is for sale; the rest (a car of a tier not open, an earned car, an event's) are not (forSale)
export const garageCars = () => {
  const rule = carRule();
  return [...new Set([...CARS.filter(car => { const p = carPreview(car); return p ? p !== 'hide' : (!car.blue || blueStarsOpen()); }),
    ...EARNED_CARS.filter(car => Progress.owns(car.id)), ...EVENT_CARS.filter(car => Progress.owns(car.id)), ...BESPOKE_CARS.filter(car => Progress.owns(car.id)), // (an earned car once earned, or given by an event; an event's car once given)
    ...FILLER_CARS.filter(car => Progress.owns(car.id)), // (a blueprint car once unlocked: ecu.js)
    ...(rule?.list ? ruleCars(rule).filter(car => !IDEA_CARS.includes(car) && (!FILLER_CARS.includes(car) || Progress.owns(car.id))) : [])])]; // (the ideas have a lot of their own; a locked blueprint car is not parked)
};
// can it be bought in the garage now? A garage car (not an earned car, an event's or an idea) whose tier is open
// (tiers.js buyable: a level's list parks a car of a later tier, drawn, but never sells it)
export const forSale = (car) => CARS.includes(car) && (tierHooks.buyable?.(car) ?? true);
// The amphibious cars (a car's "amphibious"): the garage's Amphibious section, there from the start, so an
// amphibious level can be played as soon as it is open (the cheapest costs about a level's tip)
const AMPHIBIOUS_PERK = 'Amphibious: it drives into the water and floats across';
export const amphibiousCars = () => CARS.filter(car => car.amphibious);
// the amphibious car to drive an amphibious level in: the one in use if it is one, or else the best the
// player owns (the highest tier); null: the player owns none
export const ownedAmphibious = () => {
  const owned = amphibiousCars().filter(car => Progress.owns(car.id));
  return owned.find(car => car.id === Progress.data.car) || owned.sort((a, b) => b.tier - a.tier)[0] || null;
};

export const CARS = [
  // In tiers, cheapest first: each tier a little faster and a little tougher than the one
  // before, and within one the quick, fragile cars and the slow, tough ones trade speed for
  // health. (The ids of the oldest cars are the original cars', kept so saved progress still finds
  // them; the Commuter and Darkvan were 'hatch' and 'coupe': see Progress)
  // ---- tier 1
  { id: 'commuter', tier: 1, name: 'Commuter', price: 0, color: 0xff7a1a, evilColor: 0x151515, fixedLivery: true, model: 'commuter',
    maxSpeed: 24, accel: 10, crossing: 0.6, health: 85, hw: 0.85, hl: 1.85, height: 1.45 },
  { id: 'junker', tier: 1, name: 'Junker', price: 30, color: 0x6b7343, evilColor: 0x8a4a2a, fixedLivery: true, model: 'junker',
    maxSpeed: 25, accel: 9.5, crossing: 0.7, health: 100, hw: 1.0, hl: 2.5, height: 1.95 },
  { id: 'darkvan', tier: 1, name: 'Darkvan', price: 80, color: 0x9be37a, evilColor: 0x161616, fixedLivery: true, model: 'darkvan',
    maxSpeed: 24, accel: 8.5, crossing: 0.65, health: 150, hw: 1.05, hl: 2.45, height: 2.4 },
  // ---- tier 1, Blue Stars
  { id: 'postvan', tier: 1, blue: true, name: 'Post Van', price: 270, color: 0xd8262b, evilColor: 0xe0a81c, fixedLivery: true, model: 'postvan',
    maxSpeed: 24.5, accel: 9, crossing: 0.65, health: 160, hw: 0.9, hl: 2.1, height: 1.85 },
  { id: 'keitruck', tier: 1, blue: true, name: 'Kei Truck', price: 290, color: 0xf2f2ee, evilColor: 0x6cb4d8, fixedLivery: true, model: 'keitruck',
    maxSpeed: 24.5, accel: 10, agility: 1.3, crossing: 0.75, health: 120, hw: 0.74, hl: 1.7, height: 1.75 },
  { id: 'mini', tier: 1, blue: true, name: 'Mini', price: 320, color: 0xc0212b, evilColor: 0xe8731c, fixedLivery: true, model: 'mini',
    maxSpeed: 25.5, accel: 12, agility: 1.4, crossing: 0.4, health: 95, hw: 0.74, hl: 1.5, height: 1.35,
    trait: 'slim', perk: 'Slips through gaps: scraping down the side of another car costs it nothing' },
  // ---- tier 2
  { id: 'lovebus', tier: 2, name: 'Love Bus', price: 130, color: 0x3fae4a, evilColor: 0xd8262b, fixedLivery: true, model: 'lovebus',
    maxSpeed: 24, accel: 7, crossing: 0.55, health: 165, hw: 1.0, hl: 2.3, height: 2.1 },
  { id: 'wagon', tier: 2, name: 'Family Wagon', price: 160, color: 0x8cc8f0, evilColor: 0xf28cc0, fixedLivery: true, model: 'wagon',
    maxSpeed: 26, accel: 9, crossing: 0.6, health: 140, hw: 1.05, hl: 2.4, height: 1.9 },
  { id: 'sport', tier: 2, name: 'Sportscompact', price: 190, color: 0x39ff14, evilColor: 0x151515, fixedLivery: true, model: 'sport',
    maxSpeed: 31, accel: 13, crossing: 0.35, health: 80, hw: 0.85, hl: 1.9, height: 1.1 },
  { id: 'lowrider', tier: 2, name: 'Lowrider', price: 220, color: 0xb026ff, evilColor: 0x2fd6c6, fixedLivery: true, model: 'lowrider',
    maxSpeed: 27, accel: 9, crossing: 0.15, health: 120, hw: 1.0, hl: 2.5, height: 1.1 },
  // ---- tier 2, Blue Stars
  { id: 'hothatch', tier: 2, blue: true, name: 'Hot Hatch', price: 420, color: 0xf2f2f2, evilColor: 0xf2c418, fixedLivery: true, model: 'hothatch',
    maxSpeed: 32, accel: 14, agility: 1.3, crossing: 0.4, health: 105, hw: 0.86, hl: 2.0, height: 1.42 },
  { id: 'ute', tier: 2, blue: true, name: 'Ute', price: 440, color: 0x1f4f9a, evilColor: 0x8fd13a, fixedLivery: true, model: 'ute',
    maxSpeed: 31.5, accel: 11, crossing: 0.8, health: 175, mass: 1.3, hw: 0.95, hl: 2.45, height: 1.45 },
  { id: 'buggy', tier: 2, blue: true, name: 'Beach Buggy', price: 460, color: 0x1fb5c9, evilColor: 0x7a2fb8, fixedLivery: true, model: 'buggy',
    maxSpeed: 31.5, accel: 13, agility: 1.35, crossing: 0.95, health: 100, hw: 0.85, hl: 1.75, height: 1.3 },
  { id: 'liftedtruck', tier: 2, blue: true, name: 'Lifted Truck', price: 490, color: 0x1d5bbf, evilColor: 0xc9a66b, fixedLivery: true, model: 'liftedtruck',
    maxSpeed: 30.5, accel: 10, crossing: 0.95, health: 190, mass: 1.6, hw: 1.12, hl: 2.75, height: 2.65 },
  // ---- tier 3
  { id: 'hearse', tier: 3, name: 'Hearse', price: 260, color: 0x151515, evilColor: 0xf2f2f2, fixedLivery: true, model: 'hearse',
    maxSpeed: 33, accel: 10, crossing: 0.4, health: 170, hw: 1.0, hl: 2.8, height: 1.65 },
  { id: 'minivan', tier: 3, name: 'Minivan', price: 290, color: 0xd8c8a0, evilColor: 0x3a4a5e, fixedLivery: true, model: 'minivan',
    maxSpeed: 32, accel: 9, crossing: 0.6, health: 200, hw: 1.05, hl: 2.45, height: 2.0 },
  { id: 'pickup', tier: 3, name: 'Pick-Up', price: 320, color: 0xbf5a1c, evilColor: 0x2f5a2a, fixedLivery: true, model: 'pickup',
    maxSpeed: 34, accel: 11, crossing: 0.95, health: 215, hw: 1.05, hl: 2.6, height: 2.1 },
  { id: 'hotrod', tier: 3, name: 'Hot Rod', price: 360, color: 0x6a2bb3, evilColor: 0x4b5320, fixedLivery: true, model: 'hotrod',
    maxSpeed: 38, accel: 15, crossing: 0.4, health: 110, hw: 0.9, hl: 2.1, height: 1.2 },
  // ---- tier 3, Blue Stars
  { id: 'sleeper', tier: 3, blue: true, name: 'Sleeper Wagon', price: 680, color: 0x5a1f2a, evilColor: 0xc9c3b4, fixedLivery: true, model: 'sleeper',
    maxSpeed: 38.5, accel: 14, crossing: 0.6, health: 180, hw: 0.92, hl: 2.5, height: 1.45 },
  { id: 'rally', tier: 3, blue: true, name: 'Rally Car', price: 720, color: 0x1d3f9e, evilColor: 0xe24a8c, fixedLivery: true, model: 'rally',
    maxSpeed: 39, accel: 14.5, agility: 1.35, crossing: 0.95, health: 130, hw: 0.9, hl: 2.2, height: 1.45,
    trait: 'mud', perk: 'Ignores mud: no slower in it, and it steers as well as ever' },
  { id: 'towtruck', tier: 3, blue: true, name: 'Tow Truck', price: 750, color: 0xeeeeee, evilColor: 0x2a6fb8, fixedLivery: true, model: 'towtruck',
    maxSpeed: 36, accel: 10, crossing: 0.8, health: 220, mass: 2.0, hw: 1.05, hl: 2.85, height: 2.1,
    // (the 'tow' trait, which cleared landed wreckage, is shelved: see the note on trait above)
  },
  { id: 'rotary', tier: 3, blue: true, name: 'Rotary Coupe', price: 780, color: 0xf2c218, evilColor: 0x1f8a5c, fixedLivery: true, model: 'rotary',
    maxSpeed: 40, accel: 14.8, agility: 1.45, crossing: 0.3, health: 120, hw: 0.88, hl: 2.15, height: 1.2 },
  // ---- tier 4
  { id: 'taxi', tier: 4, name: 'Taxi', price: 400, color: 0xffc81a, evilColor: 0x6b7a2e, fixedLivery: true, model: 'taxi',
    maxSpeed: 38, accel: 12, crossing: 0.6, health: 210, hw: 1.0, hl: 2.55, height: 1.6 },
  { id: 'suv', tier: 4, name: 'SUV', price: 450, color: 0x1f3f8f, evilColor: 0xf2f2f2, fixedLivery: true, model: 'suv',
    maxSpeed: 37, accel: 11, crossing: 0.9, health: 300, hw: 1.0, hl: 2.25, height: 1.8 },
  { id: 'miata', tier: 4, name: 'Sportscar', price: 500, color: 0xd8262b, evilColor: 0xffd21f, fixedLivery: true, model: 'miata',
    maxSpeed: 42, accel: 15, crossing: 0.25, health: 135, hw: 0.85, hl: 1.95, height: 1.1 },
  // ---- tier 4, Blue Stars: four that were car ideas (ideas.js; their models are still built in
  // render/ideaModels.js, and are in MODELS by the same names: see the end of render/models.js). Each sits
  // between the Blue Stars of tier 3 (36 to 40 m/s, 10 to 14.8, 120 to 220) and of tier 5 (46.5 to 48, 13 to 18,
  // 190 to 420), and under tier 5's gold cars at each of top speed, acceleration and health (46 / 22 / 360)
  // (the sturdy one: bare steel. Slowest of the four off the line, and the most health)
  // (the Evil liveries of the Blue Stars and the amphibious cars: darker than their Good ones, as every Evil livery
  // is, but each a colour of its own, not black: blued steel, aubergine, blood red, deep teal)
  { id: 'gullwing', tier: 4, blue: true, name: 'Stainless Gullwing', price: 920, color: 0xb7bcc2, evilColor: 0x2f3d5c, fixedLivery: true, model: 'gullwing',
    maxSpeed: 42.5, accel: 12, crossing: 0.35, health: 330, mass: 1.4, hw: 0.93, hl: 2.13, height: 1.14 },
  // (the all-rounder: quick, good grip, no weakness)
  { id: 'rearengine', tier: 4, blue: true, name: 'Rear-Engine Coupe', price: 960, color: 0xd8dadf, evilColor: 0x3b1f4f, fixedLivery: true, model: 'rearengine',
    maxSpeed: 44.5, accel: 15.5, agility: 1.4, crossing: 0.4, health: 175, hw: 0.86, hl: 2.15, height: 1.32 },
  // (fast and fragile: the best acceleration of the four, and the least health)
  { id: 'snake', tier: 4, blue: true, name: 'Snake Roadster', price: 1000, color: 0x1d3f96, evilColor: 0x7a1220, fixedLivery: true, model: 'snake',
    maxSpeed: 45, accel: 17, agility: 1.25, crossing: 0.25, health: 140, hw: 0.87, hl: 1.98, height: 1.2 },
  // (the heavy one: tall and wide, strong in a straight line, good over rough ground and through water, and the
  // slowest of any garage car to change lane)
  { id: 'polytruck', tier: 4, blue: true, name: 'Polygon Truck', price: 1060, color: 0xb4b8bd, evilColor: 0x1c4f4a, fixedLivery: true, model: 'polytruck',
    maxSpeed: 44, accel: 14, agility: 0.9, crossing: 0.9, health: 290, mass: 2.3, hw: 1.02, hl: 2.84, height: 1.8 },
  // ---- tier 5
  // (a modern American muscle car: long, low and wide, heavy, a bonnet bulge and twin stripes)
  { id: 'muscle', tier: 5, name: 'Muscle Car', price: 650, color: 0xc81e1e, evilColor: 0x161616, fixedLivery: true, model: 'muscle',
    maxSpeed: 46, accel: 15, crossing: 0.45, health: 240, mass: 1.8, hw: 1.0, hl: 2.5, height: 1.35 },
  // (a late-90s full-size SUV: a long tall box on a truck frame, chrome grille, silver lower body)
  { id: 'fullsize', tier: 5, name: 'Full-Size', price: 700, color: 0x2f5a3a, evilColor: 0x5a1f22, fixedLivery: true, model: 'fullsize',
    maxSpeed: 43, accel: 12, crossing: 0.9, health: 360, mass: 2.2, hw: 1.05, hl: 2.75, height: 1.95 },
  // (an electric luxury saloon: smooth and low, a glass roof, light bars front and back; very quick off the line)
  { id: 'evsaloon', tier: 5, name: 'EV Saloon', price: 800, color: 0xe8e4dc, evilColor: 0x2b3440, fixedLivery: true, model: 'evsaloon',
    maxSpeed: 45, accel: 22, crossing: 0.35, health: 150, hw: 0.98, hl: 2.5, height: 1.4 },
  // ---- and the tank, in a class of its own
  // ---- tier 5, Blue Stars
  { id: 'superlowrider', tier: 5, blue: true, name: 'Super Lowrider', price: 1200, color: 0x1a3cff, evilColor: 0x5a0a2a, fixedLivery: true, model: 'superlowrider',
    maxSpeed: 47, accel: 16, crossing: 0.15, health: 260, hw: 1.0, hl: 2.5, height: 1.1 },
  { id: 'classicgt', tier: 5, blue: true, name: 'Classic GT', price: 1250, color: 0x1f4d36, evilColor: 0xb0121c, fixedLivery: true, model: 'classicgt',
    maxSpeed: 48, accel: 18, agility: 1.4, crossing: 0.35, health: 190, hw: 0.9, hl: 2.3, height: 1.25 },
  { id: 'sixbysix', tier: 5, blue: true, name: '6x6', price: 1350, color: 0xe2dccc, evilColor: 0x4b5320, fixedLivery: true, model: 'sixbysix',
    maxSpeed: 46.5, accel: 13, crossing: 1, health: 420, mass: 2.4, hw: 1.15, hl: 3.0, height: 2.45,
    trait: 'rocks', perk: 'Ignores rockfall: it smashes fallen rocks aside without a scratch' },
  // ---- the amphibious cars: one at each star level, each with its tier's stats and price (a little under its
  // tier's best on the road: what it gives up for floating), and the only cars an amphibious level is driven in.
  // In the garage from the start, in a section of their own (see the garage). Their perk is the water
  // (the ids are short: each is in a full save's cookie. See progress.js)
  // (May's Herald: a little sixties convertible under sail. Light, slow, and it turns on a sixpence)
  { id: 'herald', tier: 1, amphibious: true, name: 'Sailing Herald', price: 60, color: 0xd9c9a8, evilColor: 0x6b2a1a, fixedLivery: true, model: 'herald',
    maxSpeed: 23, accel: 9, agility: 1.2, crossing: 0.5, health: 90, hw: 0.8, hl: 1.95, height: 1.0, draft: 0.5, shotBack: 1.5, perk: AMPHIBIOUS_PERK },
  // (the Transporter: a square-nosed van lashed between two yellow floats. Wide, steady, tough for its tier)
  { id: 'floatvan', tier: 2, amphibious: true, name: 'Float Van', price: 180, color: 0x2f7fc4, evilColor: 0x7a4a10, fixedLivery: true, model: 'transporter',
    maxSpeed: 26, accel: 8, crossing: 0.6, health: 160, mass: 1.3, hw: 1.3, hl: 2.3, height: 2.0, draft: 0.85, perk: AMPHIBIOUS_PERK },
  // (the Toybota: a pickup with an outboard where its tailgate was. The all-rounder)
  { id: 'toybota', tier: 3, amphibious: true, name: 'Toybota', price: 310, color: 0xc8322b, evilColor: 0x1f5a4a, fixedLivery: true, model: 'toybota',
    maxSpeed: 34, accel: 11, crossing: 0.9, health: 190, hw: 1.0, hl: 2.5, height: 1.6, perk: AMPHIBIOUS_PERK },
  // (the Dampervan: a high-top camper built into a boat's hull. Slow off the line, and very hard to sink)
  { id: 'dampervan', tier: 4, amphibious: true, name: 'Dampervan', price: 470, color: 0x1f4d36, evilColor: 0x5c2d78, fixedLivery: true, model: 'dampervan',
    maxSpeed: 37, accel: 10, crossing: 0.7, health: 290, mass: 1.6, hw: 1.0, hl: 2.3, height: 2.7, draft: 0.72, perk: AMPHIBIOUS_PERK },
  // (the Nissank: a pickup on two great pontoons with twin outboards. The quick one, and heavy with it)
  { id: 'nissank', tier: 5, amphibious: true, name: 'Nissank', price: 750, color: 0x2a55b8, evilColor: 0x8a6a14, fixedLivery: true, model: 'nissank',
    maxSpeed: 44, accel: 14, crossing: 0.9, health: 310, mass: 2, hw: 1.35, hl: 2.6, height: 1.7, draft: 0.85, perk: AMPHIBIOUS_PERK },
  { id: 'tank', name: 'Tank', price: 5000, color: 0x4b5a2a, evilColor: 0x2a2d33, tank: true, corner: true,
    maxSpeed: 46, accel: 8, crossing: 1, health: 100, hw: 1.25, hl: 2.3, height: 1.9 }, // (TANK RAGE's top speed: CONFIG.tankMaxSpeed)
];

// The Amphibious Tank: what TANK RAGE is in on an amphibious level (a level's "amphibious"), on its land and on
// its water alike, and nowhere else: every other level's TANK RAGE is the Tank's, as ever. It is not one of the
// garage's cars (not in CARS: no bay, no price, nothing in saved progress): it is only ever met in a rage, pieced
// together from the same five targets. A tracked amphibious assault vehicle (render/tankModels.js): it floats
// (amphibious; its own draft, deep in the water), is as fast as the Tank on land (maxSpeed) and slower afloat
// (afloat: the share of its top speed it keeps, where an amphibious car keeps CONFIG.water.topSpeed: still no
// slower on the water than the quickest amphibious car, so a rage is never a step down),
// and throws a big bow wave (bowWave: times a car's). It fires as the Tank does. Player.rageTank is this while
// such a rage is on (see Player.startTank)
export const AMPHIBIOUS_TANK = { id: 'amphibioustank', name: 'Amphibious Tank', color: 0x5f7a5a, evilColor: 0x2c3138, tank: true, amphibious: true,
  maxSpeed: 46, afloat: 0.72, draft: 1.0, bowWave: 2.2, height: 2.2 };
// the tank a level's TANK RAGE is in: null = the Tank, as ever
export const rageTankFor = (level) => level && level.amphibious ? AMPHIBIOUS_TANK : null;

// Vehicles that belong to a level, not to the garage (a level's "car" field).
export const LEVEL_CARS = {
  ufo: { id: 'ufo', name: 'UFO', price: 0, color: 0xc9d2dc, evilColor: 0x4a3a66, ufo: true, noWheels: true,
    maxSpeed: 58, accel: 30, crossing: 1, agility: 2.8, health: 100, hw: 1.3, hl: 1.3, height: 1.2 },
  // a Formula 1 car: very fast, quick off the line, nimble, low, and no good over a kerb
  f1: { id: 'f1', name: 'F1 Car', price: 0, color: 0xd8262b, evilColor: 0x151515, model: 'f1', shotBack: 1.2,
    maxSpeed: 75, accel: 20, crossing: 0.2, agility: 1.5, health: 160, hw: 0.95, hl: 2.6, height: 1.0 },
  // a GT road car, raced: slower than an F1 car down the straights and slower off the line, but
  // tougher, heavier in the bends, and happier over a kerb
  gt: { id: 'gt', name: 'GT Car', price: 0, color: 0xc8102e, evilColor: 0x151515, model: 'gt',
    maxSpeed: 62, accel: 14, crossing: 0.5, agility: 1.25, health: 240, hw: 1.0, hl: 2.3, height: 1.25 },
  // a Le Mans prototype: an F1 car's pace, grip and getaway under a closed body built to last a day and a
  // night: a good deal tougher (and a little better over a kerb)
  lmp: { id: 'lmp', name: 'LMP Prototype', price: 0, color: 0x1f4fa8, evilColor: 0x151515, model: 'lmp',
    maxSpeed: 75, accel: 20, crossing: 0.3, agility: 1.5, health: 280, hw: 1.0, hl: 2.35, height: 1.05 },
  // a jetboat: a sleek little cruiser with a captain's cabin, quick and nimble on the water, bobbing on the swell
  jetboat: { id: 'jetboat', name: 'Jetboat', price: 0, color: 0xe8432e, evilColor: 0x1b1d22, model: 'jetboat', wake: true, noWheels: true,
    maxSpeed: 34, accel: 13, crossing: 1, agility: 1.4, health: 120, hw: 1.0, hl: 2.7, height: 1.6 },
  // the Battlefield's 8x8: an armoured car on eight wheels, slow to get going and heavy, with a small gun
  // that fires dead ahead (cannon: see CONFIG.battle.guns; its rank: see CONFIG.vehicles.apc), and nothing
  // a bullet does to its tyres stops it
  apc: { id: 'apc', name: '8x8', price: 0, color: 0x3f7a2e, evilColor: 0x3f7a2e, model: 'apc', rank: 2, runFlat: true,
    cannon: { range: 72, cooldown: 1.1, direct: 2.6, splash: 7, damage: 40, scale: 0.8 },
    maxSpeed: 32, accel: 9, crossing: 1, agility: 0.9, health: 240, mass: 3, hw: 1.35, hl: 3.4, height: 2.5 },
};
// the garage's cars and the levels' own vehicles take their names (and a perk line) from carText.json, the table's
// own being the fallback (words.js); the spreads below (EARNED_CARS) then carry them
applyNames('car', CARS);
applyNames('car', Object.values(LEVEL_CARS));

// Secret vehicles: never parked in the garage or for sale, but once owned they are driven
// like any other car, and the garage can swap back to a normal car. The way into each:
//   bus   type B U S on the start screen (see render/menu.js), or ?autostart&car=bus
//         (kind: 'bus' makes it the traffic bus's tall, boxy shape)
export const SECRET_CARS = {
  bus: { id: 'bus', name: 'City Bus', price: 0, color: 0xf2a33a, evilColor: 0x2e2a33, kind: 'bus', model: 'citybus',
    maxSpeed: 25, accel: 5, crossing: 0.7, health: 220, hw: 1.3, hl: 5.5, height: 3.1 },
};

// ---- tier 6: earned, not bought ------------------------------------------------------------
// One car for each special level: that level's own kind of vehicle brought into the garage (or a car in
// its spirit), to drive on ANY level. It is earned by beating the level's par (earned.par: seconds to
// spare, by side; a level played on one side only asks for that side) on every side it names, and is
// never for sale (price 0, no bay until it is earned: see garageCars). Nothing more is saved for it:
// Progress.earned(car) reads the best times, and Progress.owns() says yes to one that is earned, so it
// is picked and driven like any other. Par: about a quarter of the Good clock, a fifth of the Evil one
// (levels/*.json "clock"). They are kept out of CARS (which traffic, Car Swap and "Unlock everything"
// go by), and a level's vehicle here has an id of its own ('earned-f1') and its `base` (whose engine
// and horn it has). Its six magenta stars are a mark, not a tier: these cars are outside the tiers, fun
// extras, and each drives by the stats written for it here (a level's vehicle: as it does on its own
// level, unless a figure is given), held to no cap.
const earnedCar = (level, par, car, base) => ({ ...car, ...(base ? { id: 'earned-' + base.id, base } : {}), tier: 6, price: 0, earned: { level, par } });
// The three built on a garage car's model are that car's SUPER version to look at (superKit: the body kit of
// render/carExtras.js addSuperKit, with its stripe in each side's second colour, as the Super car it stands in
// for has), since each garage car has a Super version in play (superOf): the Hell Rod is a Super Hot Rod, the
// Courier Special a Super Sleeper Wagon, the Showdown Muscle a Super Muscle Car. The six that are a level's own
// vehicle (the saucer, the race cars, the jetboat, the 8x8) have no Super version, and stay as they are.
export const EARNED_CARS = [
  earnedCar('all-heck', { good: 39 }, { id: 'hellrod', name: 'Hell Rod', color: 0xff5a00, evilColor: 0x1a0608, model: 'hotrod',
    superKit: true, stripe: 0x151515, evilStripe: 0xff5a00, // flame orange with black / soot with a flame stripe
    maxSpeed: 50, accel: 18, crossing: 0.4, health: 200, hw: 0.9, hl: 2.1, height: 1.2, perk: 'Straight out of All Heck' }),
  earnedCar('ufo', { good: 36, evil: 20 }, { ...LEVEL_CARS.ufo, name: 'Saucer', color: 0x9fe0c8, evilColor: 0x33184a }, LEVEL_CARS.ufo),
  // (the three race cars are a little tamer on the road than on their circuits: about a tenth off the speed and the getaway)
  earnedCar('marina-bay', { good: 99, evil: 56 }, { ...LEVEL_CARS.gt, name: 'GT Racer', maxSpeed: 57, accel: 13, color: 0x6fb7d8, evilColor: 0x5a6b7a }, LEVEL_CARS.gt),
  earnedCar('oh-mine', { good: 66, evil: 37 }, { ...LEVEL_CARS.jetboat, name: 'Land Jetboat', color: 0xf2f2f2, evilColor: 0x2a4a3a, perk: 'It drives on land too, somehow' }, LEVEL_CARS.jetboat),
  earnedCar('montreal', { good: 87, evil: 49 }, { ...LEVEL_CARS.f1, name: 'Road F1', maxSpeed: 68, accel: 18, health: 80, color: 0x1d3f9c, evilColor: 0x7a1fa8 }, LEVEL_CARS.f1),
  earnedCar('bathurst', { good: 90, evil: 51 }, { ...LEVEL_CARS.lmp, name: 'Road Prototype', maxSpeed: 68, accel: 18, health: 160, color: 0x18a35a, evilColor: 0x8a1a2a }, LEVEL_CARS.lmp),
  // (off: not to be had for now, the owner 11-Oct: Rival Run is an ordinary level of tier 7, not a special one. Nobody
  // has it, a player who had earned it included; take `off` away and it is back, by the best times, for all who earned it)
  earnedCar('rival-run', { good: 75, evil: 57 }, { id: 'courier', name: 'Courier Special', off: true, color: 0xffb400, evilColor: 0x2b1a3a, model: 'sleeper',
    superKit: true, stripe: 0x151515, evilStripe: 0xffb400, // courier yellow with black / midnight with a yellow stripe
    maxSpeed: 50, accel: 19, agility: 1.5, crossing: 0.6, health: 220, hw: 0.92, hl: 2.5, height: 1.45 }),
  earnedCar('showdown', { good: 50, evil: 38 }, { id: 'showdown', name: 'Showdown Muscle', color: 0x8a1030, evilColor: 0x1a1f3a, model: 'muscle',
    superKit: true, stripe: 0xf4f4f4, evilStripe: 0x8a1030, // claret with white / navy with a claret stripe
    maxSpeed: 52, accel: 17, crossing: 0.45, health: 300, mass: 2, hw: 1.0, hl: 2.5, height: 1.35 }),
  // (the toughest car there is)
  earnedCar('battlefield', { good: 78 }, { ...LEVEL_CARS.apc, name: 'Road 8x8', health: 450, color: 0x6b6f5a, evilColor: 0x4a4e3a, perk: 'Its gun fires in place of packages' }, LEVEL_CARS.apc),
];
Progress.earnedCars = EARNED_CARS;
// Cars only an event gives (tiers.json events, a "reward": { "car": id }): defined here, not with the event, so a car
// given stays in the garage once the event is over and gone from the list. Any other car can be an event's reward too
// (a garage car, an earned one). Owned once given (Progress.data.cars). A car here: as a garage car's entry, with an
// id of its own and price 0; it is outside the tiers.
export const EVENT_CARS = [
  // the first special event's grand prize (events.json comet-hunt): on the Centre-Seat Hypercar idea's model, but a car
  // of its own (its id, name, livery and figures); `idea` only says it is drawn by its idea model (render/ideaModels.js)
  (() => {
    const base = IDEA_CARS.find(car => car.id === 'centreseat');
    return { ...base, id: 'silvercomet', name: 'Silver Comet', basedOn: undefined, placeholder: false, idea: true, event: true, price: 0,
      color: 0xc9d2dc, evilColor: 0x1d2433, maxSpeed: 46, accel: 19, health: 150, perk: 'The Comet Hunt\'s prize',
      bespoke: true, rarity: 'legendary', keyModel: 'fob' }; // (the first BESPOKE key car: see BESPOKE_CARS below; keyModel: its key's style, always the same one)
  })(),
];
// ---- the BESPOKE key cars (the owner, 12-Oct): one-of-a-kind showpieces --------------------------------------------
// A car flagged `bespoke: true` is a Bespoke key car: its KEY is a Bespoke card (the top rarity: the keys themselves),
// dropped by the packs whose pool has keys (packs.js), and its BLUEPRINTS are Legendary cards (`rarity`). It is a KEY
// car (ecu.js): driveable once its key is had, and on the event cars' ladder (no tier: max ECU 5, the 0.06 step of
// scripts/ecu-tables.mjs). The Silver Comet (EVENT_CARS, the Comet Hunt's prize too) was the first; these five were car
// ideas (ideas.js), moved out of the ideas lot into the roster as the fillers were: their models are still built by
// render/ideaModels*.js (put in MODELS by the same names, render/models.js). Kept out of CARS: never for sale, never
// lent by Car Swap, never dealt by "Unlock everything"; no price, no tier. Their only source is a Bespoke key card (no
// event gives them). Figures: nudged from the idea's placeholders into the top of the range (`placeholder: true`: not
// balanced), each a different way to drive, and are their MAXED ECU (ecus.json has the lower ones):
// each has ONE key style for good (the owner, 12-Oct: the key is always the same for a car, never drifting like the blueprint poses):
// the three of render/keyModels.js are all in use. Modern flagship: fob (the Silver Comet); the old coachbuilt and the
// 1930s: classic; the space-age and the solar: smart
const KEY_STYLE = { rocketfin: 'smart', swancar: 'classic', solarracer: 'smart', moonrover: 'smart', monowheel: 'classic' };
const bespoke = (car) => ({ ...car, bespoke: true, rarity: 'legendary', placeholder: true, price: 0, keyModel: KEY_STYLE[car.id] || 'fob' });
export const BESPOKE_CARS = [
  // the all-rounder: quick, solid, a grand tourer
  bespoke({ id: 'rocketfin', name: 'Rocket Fin Coupe', basedOn: 'Lincoln Futura (1955 concept car)', model: 'rocketfin', color: 0xa8e0e4, evilColor: 0x4a1a5e,
    hw: 0.98, hl: 2.75, height: 1.35, note: 'A jet-age dream car: twin bubble canopies, two cones for a nose, tail fins and a jet nozzle at the back.',
    maxSpeed: 47, accel: 17, agility: 1.15, crossing: 0.3, health: 220, mass: 1.6, sound: 'muscle' }),
  // the heavyweight: slow to get going, shrugs off a crash and shoves traffic aside
  bespoke({ id: 'swancar', name: 'Swan Car', basedOn: 'Brooke Swan Car (1910)', model: 'swancar', color: 0xf2efe6, evilColor: 0x4a4562,
    hw: 0.9, hl: 2.6, height: 2.22, note: 'A tourer carved as a swan, its neck over the bonnet and its eyes lit. The beak sprayed water.',
    maxSpeed: 42, accel: 13, agility: 1, crossing: 0.5, health: 380, mass: 2.4, sound: 'classicgt' }),
  // the glass cannon: the highest top speed, slow off the line, made of nothing
  bespoke({ id: 'solarracer', name: 'Solar Racer', basedOn: 'World Solar Challenge car (Nuna)', model: 'solarracer', color: 0x2ab0d8, evilColor: 0xd0341f,
    hw: 0.9, hl: 2.5, height: 0.8, note: 'A wafer covered in solar cells with a bubble for the driver on one side. Lower than anything.',
    maxSpeed: 50, accel: 14, agility: 1.25, crossing: 0.15, health: 90, mass: 1, sound: 'miata' }),
  // the off-roader: takes rails and rough at full tilt, nimble, light
  bespoke({ id: 'moonrover', name: 'Moon Rover', basedOn: 'Apollo Lunar Roving Vehicle', model: 'moonrover', color: 0xd9c89a, evilColor: 0x3a3a44,
    hw: 0.95, hl: 1.6, height: 1.65, note: 'An open frame on wire wheels with two bucket seats, a T-handle to steer by and a dish on a mast.',
    maxSpeed: 41, accel: 18, agility: 1.6, crossing: 1, health: 150, mass: 1, sound: 'mini' }),
  // the weaver: narrower than anything, the quickest getaway and the quickest sideways, fragile
  bespoke({ id: 'monowheel', name: 'Monowheel', basedOn: 'Dynasphere monowheel (1932)', model: 'monowheel', color: 0xe8a317, evilColor: 0x6a3a8a,
    hw: 0.5, hl: 1.0, height: 2.0, note: 'One wheel taller than its rider, who sits inside it. It rolls; he does not.',
    maxSpeed: 44, accel: 21, agility: 1.8, crossing: 0.5, health: 100, mass: 1, sound: 'junker' }),
];
applyNames('car', BESPOKE_CARS);
// is it a Bespoke key car? (its key a Bespoke card, its blueprints Legendary; packs.js, carsources.js)
export const isBespoke = (car) => !!car && !!car.bespoke && !car.off;
// ---- the evergreen (filler) cars: BLUEPRINT cars (BLUEPRINTS-NOTES.md, CHECKLIST item 115) --------------------------
// Eighteen that were car ideas (ideas.js), promoted to the roster as the packs' filler. Each is a BLUEPRINT car: it starts
// at ECU0, locked (not driveable), and its first X blueprints unlock it at ECU1 (ecu.js, ecus.json). Kept out of CARS
// (which the garage's lot and its prices, traffic, Car Swap, "Unlock everything" and the balance checks go by): they are
// never for sale, never lent by Car Swap and never dealt as owned by "Unlock everything" (only blueprints open them, or
// the address bar's test switches). The lookups of the car in use (find, carById) and a level's list (ruleCars) look
// here too, and an unlocked one is parked in the garage (garageCars). Their tier is a star rating as a garage car's
// (carTier counts them), and gives their max ECU (ecu.js ladder); `rarity` is the rarity of their blueprint card (the
// owner, 12-Oct: Epic, Legendary for the three named). Their models are still built by render/ideaModels*.js, registered
// in MODELS by the same names (the end of render/models.js). Their figures are the idea's placeholders nudged into the
// gold range of their tier (`placeholder: true`: not balanced), and are their MAXED ECU (ecus.json has the lower ones)
const filler = (tier, car, rarity = 'epic') => ({ ...car, tier, evergreen: true, rarity, placeholder: true, price: 0 });
export const FILLER_CARS = [
  // ---- tier 1 (24 to 25 m/s, 8.5 to 10, 85 to 150 health)
  filler(1, { id: 'bubble', name: 'Bubble Car', basedOn: 'BMW Isetta', model: 'bubble', color: 0x8fc9dd, evilColor: 0x8a1f2b,
    hw: 0.69, hl: 1.15, height: 1.34, note: 'The whole front is the door. The smallest thing on the road.',
    maxSpeed: 24, accel: 8.5, agility: 1.4, crossing: 0.4, health: 85, mass: 1, sound: 'mini' }),
  filler(1, { id: 'milkfloat', name: 'Milk Float', basedOn: "Smith's / Wales & Edwards electric milk float", model: 'milkfloat', color: 0x2f67b1, evilColor: 0x7d1d1d,
    hw: 0.8, hl: 1.85, height: 2.05, note: 'Electric, open-sided and stacked with crates. Slow, and it rattles.',
    maxSpeed: 24, accel: 8.5, agility: 1, crossing: 0.5, health: 120, mass: 1.2, sound: 'keitruck' }),
  filler(1, { id: 'tuktuk', name: 'Tuk-Tuk', basedOn: 'Bajaj RE auto-rickshaw', model: 'tuktuk', color: 0xf0c020, evilColor: 0x2b2b30,
    hw: 0.7, hl: 1.5, height: 1.9, note: 'One wheel up front, a bench under a canvas roof, and the driver leaning on the bars.',
    maxSpeed: 24.5, accel: 9, agility: 1.35, crossing: 0.3, health: 85, mass: 1, sound: 'mini' }),
  // ---- tier 2 (24 to 31 m/s, 7 to 13, 80 to 165)
  filler(2, { id: 'woody', name: 'Woody Wagon', basedOn: '1949 Ford "Woody" wagon', model: 'woody', color: 0x7a2432, evilColor: 0x1f3a2e,
    hw: 0.91, hl: 2.6, height: 1.68, note: 'Timber down its sides and a surfboard on the roof.',
    maxSpeed: 26, accel: 8, agility: 1, crossing: 0.55, health: 150, mass: 1.3, sound: 'wagon' }),
  filler(2, { id: 'pandacoupe', name: 'Panda Coupe', basedOn: 'Toyota Sprinter Trueno AE86', model: 'pandacoupe', color: 0xf2f2ee, evilColor: 0xb81f24,
    hw: 0.82, hl: 2.1, height: 1.33, note: 'White over black, lamps that pop up, and a cup of water on the dashboard.',
    maxSpeed: 31, accel: 12, agility: 1.45, crossing: 0.4, health: 110, mass: 1, sound: 'hothatch' }),
  filler(2, { id: 'keiroadster', name: 'Kei Roadster', basedOn: 'Honda Beat', model: 'keiroadster', color: 0xf2d21f, evilColor: 0x181820,
    hw: 0.66, hl: 1.65, height: 1.15, note: 'A mid-engined two-seater that is barely wider than a door, with no roof to speak of.',
    maxSpeed: 30.5, accel: 13, agility: 1.45, crossing: 0.3, health: 80, mass: 1, sound: 'miata' }),
  // ---- tier 3 (32 to 38 m/s, 9 to 15, 110 to 215)
  filler(3, { id: 'fireengine', name: 'Fire Engine', basedOn: 'American LaFrance pumper', model: 'fireengine', color: 0xc8161d, evilColor: 0x25252b,
    hw: 1.25, hl: 4.5, height: 2.9, note: 'Red, with a ladder on top, hose reels, a pump panel and its lights going.',
    maxSpeed: 32, accel: 9, agility: 0.9, crossing: 0.8, health: 215, mass: 3, sound: 'bus' }),
  filler(3, { id: 'fieldscout', name: 'Field Scout', basedOn: 'Willys MB jeep', model: 'jeep', color: 0x5b6b3a, evilColor: 0x2a2a2e,
    hw: 0.95, hl: 2.0, height: 1.8, note: 'The army jeep of the Battlefield: open top, a roll bar, a gun post and a spare on the tail.',
    maxSpeed: 33, accel: 10, agility: 1.15, crossing: 1, health: 140, mass: 1.2, sound: 'suv' }),
  // (really 3.1 m wide, 5.5 m long and 3.2 m high: too wide for a lane, so it is driven, and shown, at 0.87 of that)
  filler(3, { id: 'monster', name: 'Monster Truck', basedOn: 'Bigfoot (Ford F-250)', model: 'monster', color: 0x1f58c2, evilColor: 0x1c1c20,
    real: { hw: 1.55, hl: 2.75, height: 3.2 }, scale: 0.87,
    hw: 1.35, hl: 2.39, height: 2.78, note: 'A pickup on tyres taller than a car. It parks on top of things.',
    maxSpeed: 32, accel: 9, agility: 1, crossing: 1, health: 215, mass: 3, sound: 'sixbysix' }),
  // ---- tier 4 (37 to 42 m/s, 11 to 15, 135 to 300)
  filler(4, { id: 'stately', name: 'Stately Saloon', basedOn: 'Rolls-Royce Silver Shadow', model: 'stately', color: 0x24365e, evilColor: 0x4a1622,
    hw: 0.9, hl: 2.58, height: 1.52, note: 'A temple of a grille with a mascot on top, and two shades of paint.',
    maxSpeed: 37, accel: 11, agility: 1, crossing: 0.45, health: 220, mass: 1.7, sound: 'hearse' }),
  filler(4, { id: 'teardrop', name: 'Teardrop Streamliner', basedOn: 'Tatra 87', model: 'teardrop', color: 0x9aa8b4, evilColor: 0x5a1a22,
    hw: 0.84, hl: 2.47, height: 1.52, note: 'Three headlamps, a roof that runs down into a teardrop tail, and a fin standing along it.',
    maxSpeed: 38, accel: 11, agility: 1, crossing: 0.4, health: 180, mass: 1.5, sound: 'wagon' }),
  filler(4, { id: 'pony', name: 'Pony Car', basedOn: '1965 Ford Mustang fastback', model: 'pony', color: 0x3f74b8, evilColor: 0x1f3d2a,
    hw: 0.87, hl: 2.3, height: 1.3, note: 'A long bonnet, a short deck and a fastback roof.',
    maxSpeed: 40, accel: 14, agility: 1.1, crossing: 0.4, health: 170, mass: 1.5, sound: 'muscle' }),
  // ---- tier 5 (43 to 46 m/s, 12 to 22, 150 to 360)
  filler(5, { id: 'midnight', name: 'Midnight Coupe', basedOn: 'Nissan Skyline GT-R (R34)', model: 'midnight', color: 0x1f4fb4, evilColor: 0x3a1f5c,
    hw: 0.9, hl: 2.3, height: 1.36, note: 'Square shoulders, four round tail lamps and a wing as tall as its roof.',
    maxSpeed: 46, accel: 18, agility: 1.35, crossing: 0.4, health: 180, mass: 1.4, sound: 'rotary' }),
  filler(5, { id: 'splitwindow', name: 'Split-Window Coupe', basedOn: '1963 Chevrolet Corvette Sting Ray', model: 'splitwindow', color: 0xb9c2cc, evilColor: 0x7a1218,
    hw: 0.88, hl: 2.22, height: 1.26, note: 'A pointed nose, lamps that pop up, and a spine through its rear window.',
    maxSpeed: 43, accel: 15, agility: 1.2, crossing: 0.3, health: 150, mass: 1.3, sound: 'classicgt' }),
  filler(5, { id: 'wedge', name: 'Wedge Supercar', basedOn: 'Lamborghini Countach', model: 'wedge', color: 0xd21f1f, evilColor: 0x131316,
    hw: 1.0, hl: 2.07, height: 1.07, note: 'The poster on the bedroom wall: a flat wedge, doors that go up and a huge wing.',
    maxSpeed: 46, accel: 17, agility: 1.3, crossing: 0.15, health: 150, mass: 1.2, sound: 'miata' }),
  // ---- the three Legendary ones (the spec's "Epic evergreen", made Legendary by the owner, 12-Oct): five stars
  filler(5, { id: 'jetcar', name: 'Jet Land-Speed Car', basedOn: 'ThrustSSC', model: 'jetcar', color: 0x1f5fbf, evilColor: 0x8a1c24,
    hw: 1.0, hl: 3.9, height: 1.7, note: 'Two jet engines as big as cars, a needle between them and a fin. Its record is faster than sound.',
    maxSpeed: 46, accel: 19, agility: 0.9, crossing: 0.15, health: 150, mass: 1.6, sound: 'miata' }, 'legendary'),
  filler(5, { id: 'dragster', name: 'Slingshot Dragster', basedOn: 'front-engined top-fuel dragster', model: 'dragster', color: 0xd21f1f, evilColor: 0x131316,
    hw: 0.95, hl: 3.6, height: 1.6, note: 'A rail with a blown engine, skinny wheels in front, huge slicks and a wing behind the driver.',
    maxSpeed: 46, accel: 20, agility: 0.9, crossing: 0.15, health: 150, mass: 1.1, sound: 'muscle' }, 'legendary'),
  filler(5, { id: 'flyingcar', name: 'Flying Car', basedOn: 'Terrafugia Transition', model: 'flyingcar', color: 0x2a5aa8, evilColor: 0x7a2a30,
    hw: 1.0, hl: 2.95, height: 2.05, note: 'An aeroplane that drives home with its wings folded up, the propeller idling behind.',
    maxSpeed: 43, accel: 12, agility: 1, crossing: 0.3, health: 150, mass: 1.2, sound: 'sport' }, 'legendary'),
];
applyNames('car', FILLER_CARS);
// is a blueprint car unlocked (its first X blueprints, ecu.js)? Set by ecu.js when it loads (null: none is, but one in
// the save's list of cars, put there by a test switch)
const ecuHooks = {};
export const setEcuHooks = (hooks) => Object.assign(ecuHooks, hooks);
// the figures a car is driven with: its ECU's (ecu.js Ecu.drive: maxSpeed, accel, health, respawn), or, before ecu.js
// is loaded or for a car with no ECU table, its own
export const carStats = (car = CAR) => ecuHooks.drive?.(car, lent !== null) ?? car;
// the car a special level earns (undefined for a level with none)
export const earnedFor = (levelId) => EARNED_CARS.find(car => car.earned.level === levelId && !car.off);

// The car in use. It is a live binding: every module that imports CAR sees the new car as
// soon as selectCar() changes it, so swapping cars needs no reload.
// (a car idea too: ideas.js. They come last, so an idea can never stand in for a car of the same id)
const find = () => [...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...FILLER_CARS, ...Object.values(SECRET_CARS), ...IDEA_CARS]
  .find(car => car.id === Progress.data.car && Progress.owns(car.id)) || CARS[0];
export let CAR = find();
// the car in use as the save has it, whatever the level picked has put the player in (the garage's ring and words)
export const carInUse = () => forcedCar(find(), carRule());
// can a run be started in what the level's rule puts the player in? (false: no car it allows is owned)
export const carAllowed = () => forcedCar(find(), carRule()).id !== 'null-car';

// A level with a vehicle of its own puts the player in that; any other level gives back
// the car picked in the garage. Called when a level is picked and when a run starts.
// (amphibious: the level is an amphibious one, its "amphibious": the car in use if it floats, or else the best
// amphibious car the player owns. With none owned the car in use stays, and Game.start won't start the level)
// a replay's car (replay.js): every run is in it, whatever the save and the level's rules say, until unpinned (null)
let pinned = null;
export const carById = (id) => LEVEL_CARS[id] || [...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...FILLER_CARS, ...Object.values(SECRET_CARS), ...IDEA_CARS].find(car => car.id === id) || null;
export const pinCar = (id) => { pinned = id ? carById(id) : null; };
export const useLevelCar = (id, amphibious) => {
  if (pinned) { CAR = pinned; lent = null; return; }
  CAR = (id && carById(id)) || forcedCar(find(), amphibious ? null : carRule()); // (the level's car lock: any car, owned or not; or what the level's car rule allows)
  if (amphibious && !id && !CAR.amphibious) CAR = ownedAmphibious() || CAR;
  lent = null;
};

// switch to a car the player owns (saved to their progress)
export const selectCar = (id) => {
  const rule = carRule(), car = carById(id);
  if (rule && car && ruleAllows(rule, car) && Progress.owns(id)) { // (picked for a level that restricts the car: kept apart from the player's own pick)
    (Progress.data.tierCars ||= {})[rule.key] = id;
    // (a pick the rule allows is what it puts the player in, ahead of tierCars: so it follows, or nothing changes)
    if (ruleAllows(rule, find())) Progress.data.car = id;
    Progress.save();
    CAR = forcedCar(find(), rule);
    lent = null;
    return;
  }
  Progress.useCar(id);
  CAR = find();
  lent = null;
};

// Car Swap (a mystery): the player is lent another car for a while (nothing saved), and
// returnCar gives back the one it had. (Picking a car or a level forgets the loan.)
let lent = null; // the car lent out, while one is
export const lendCar = (car) => {
  lent = lent || CAR;
  CAR = car;
};
export const returnCar = () => {
  if (lent) CAR = lent;
  lent = null;
};

// ---- the Super cars ------------------------------------------------------------------------
// Every garage car in the tiers (but the Lowrider, whose Super version is a car of its own) has a
// "Super" version: the same car souped up by two tiers' worth (CONFIG.superCar), in a livery of its
// own with a racing stripe (and a body kit: render/carExtras.js addSuperKit). Never in the garage:
// it is lent for a while by the "souped up" mystery (see Player.startMystery), or ?car=super-<id>.
// SUPER_LIVERIES: by car id, good: [body, stripe], evil: [body, stripe]; kit: parts of the kit turned
// off ({ wing: false }), or on (lights: true, a roof rack of lamps; bullbar: true, a bull bar with spot lamps;
// snorkel: true: for the vans and the off-roaders, on top of the wing). A car without an
// entry gets a metallic version of its own colours (see superLivery).
export const SUPER_LIVERIES = {
  commuter: { good: [0xe3b522, 0x151515], evil: [0x101010, 0xe3b522] },                 // gold with black / black with gold
  junker: { good: [0x1c1c1c, 0xc81e1e], evil: [0x7a2a16, 0xe8dcc0] },                   // matte black, a red stripe / rust with bone
  darkvan: { good: [0xc9ccd2, 0x151515], evil: [0x2a2d33, 0xd0101c], kit: { lights: true, snorkel: true } }, // chrome silver / gunmetal with red (it has a bull bar of its own)
  postvan: { good: [0xb3121c, 0xf0c030], evil: [0xd99a10, 0x151515], kit: { lights: true, bullbar: true } }, // crimson with gold / gold with black
  keitruck: { good: [0xf7f7f2, 0xd8262b], evil: [0x4a9ad0, 0xf2f2f2] },                 // pearl with rising-sun red / ice blue with white
  mini: { good: [0x1f5a3a, 0xf2f2f2], evil: [0xf0701a, 0x151515] },                     // racing green, white stripes / orange with black
  lovebus: { good: [0x8fd14a, 0xe03aa0], evil: [0x9a1420, 0x151515], kit: { lights: true, bullbar: true } }, // lime with magenta / deep red with black
  wagon: { good: [0x62a8e8, 0xf4f4f4], evil: [0xf25aa8, 0x151515] },                    // sky metallic with white / hot pink with black
  sport: { good: [0x4dff2a, 0x151515], evil: [0x151515, 0x4dff2a] },                    // neon green with black / black with neon green
  hothatch: { good: [0xf7f7f2, 0xd8262b], evil: [0xf2c418, 0x151515] },                 // pearl with red / yellow with black
  ute: { good: [0x1a4fb0, 0xf4f4f4], evil: [0x9ae03a, 0x151515] },                      // deep blue with white / lime with black
  buggy: { good: [0x22c8d8, 0xf2862a], evil: [0x8a35d0, 0xb6ff3a] },                    // teal with orange / purple with lime
  liftedtruck: { good: [0x1d5bbf, 0xd0d4da], evil: [0xd2b07a, 0x151515], kit: { lights: true, bullbar: true, snorkel: true } }, // royal blue with silver / desert tan with black
  hearse: { good: [0x101010, 0xd4a52a], evil: [0xf2f2f2, 0x6a2bb3] },                   // black with gold / white with purple
  minivan: { good: [0xe0cfa0, 0x6b4a2a], evil: [0x3a4a5e, 0xf08a2a], kit: { lights: true, bullbar: true } }, // champagne with brown / slate with orange
  pickup: { good: [0xd0621c, 0xf4e8c8], evil: [0x2f5a2a, 0xc8a86a], kit: { bullbar: true, snorkel: true } }, // burnt orange with cream / forest with tan
  hotrod: { good: [0x7a2fd0, 0xff8a1a], evil: [0x4b5320, 0xc81e1e] },                   // purple with flame orange / olive drab with red
  sleeper: { good: [0x6a2030, 0x8a8a8a], evil: [0xd2cab8, 0x151515] },                  // maroon with grey / beige with black (still a sleeper)
  rally: { good: [0x1d3f9e, 0xf2d21f], evil: [0xe24a8c, 0xf4f4f4] },                    // blue with yellow / pink with white
  towtruck: { good: [0xf4f4f4, 0xd8262b], evil: [0x2a6fb8, 0xf2c418] },                 // white with red / blue with yellow
  rotary: { good: [0xf2c218, 0x151515], evil: [0x1f8a5c, 0xf4f4f4] },                   // yellow with black / green with white
  taxi: { good: [0xffc81a, 0x151515], evil: [0x6b7a2e, 0xffc81a] },                     // yellow with black / olive with yellow
  suv: { good: [0x1f3f8f, 0xd0d4da], evil: [0xf2f2f2, 0x1f3f8f], kit: { lights: true, bullbar: true, snorkel: true } }, // navy with silver / white with navy
  miata: { good: [0xd8262b, 0xf4f4f4], evil: [0xffd21f, 0x151515] },                    // red with white / yellow with black
  gullwing: { good: [0xd9dde2, 0xf07c1c], evil: [0x33363c, 0x40e8ff] },                 // polished steel with orange / dark steel with cyan
  rearengine: { good: [0xf4f4f4, 0xd8262b], evil: [0x151515, 0xe3b522], kit: { wing: false } }, // white with red / black with gold (it has a whale tail of its own)
  snake: { good: [0x1d3f96, 0xf4f4f4], evil: [0x101010, 0xd8262b] },                    // blue with white stripes / black with red
  polytruck: { good: [0xc9ccd2, 0x2a8cff], evil: [0x1a1c20, 0xf08a2a], kit: { wing: false, lights: true, bullbar: true } }, // steel with electric blue / black with orange
  muscle: { good: [0xc81e1e, 0xf4f4f4], evil: [0x101010, 0xc81e1e] },                  // red with white / black with red
  fullsize: { good: [0x2f5a3a, 0xd4a52a], evil: [0x5a1f22, 0xf4e8c8] },                 // deep green with gold / wine with cream
  evsaloon: { good: [0xe8e4dc, 0x2a8cff], evil: [0x2b3440, 0x40e8ff] },                 // pearl with electric blue / slate with cyan
  superlowrider: { good: [0x1a3cff, 0xf0c030], evil: [0x5a0a2a, 0xd8d8d8] },            // blue with gold / wine with chrome
  classicgt: { good: [0x1f4d36, 0xd8b040], evil: [0xb0121c, 0xf4f4f4] },                // racing green with gold / red with white
  sixbysix: { good: [0xe2dccc, 0x151515], evil: [0x4b5320, 0xf08a2a], kit: { lights: true, bullbar: true, snorkel: true } }, // sand with black / olive with orange
  // (the amphibious cars: boat colours)
  herald: { good: [0xf4f1e6, 0x1d4f9c], evil: [0x1a2a3a, 0xe8c040] },                   // sail white with navy / midnight with brass
  floatvan: { good: [0xf2862a, 0xf4f4f4], evil: [0x2a2d33, 0x22c8d8], kit: { lights: true } }, // lifeboat orange with white / gunmetal with teal
  toybota: { good: [0xd8262b, 0xf4f4f4], evil: [0x151515, 0xd8262b], kit: { lights: true, bullbar: true, snorkel: true } }, // rescue red with white / black with red
  dampervan: { good: [0x22a8a0, 0xf4e8c8], evil: [0x5a1f6a, 0xb6ff3a] },                // sea green with cream / plum with lime
  nissank: { good: [0x1d5bbf, 0xf2c418], evil: [0x8a1030, 0xd0d4da] },                  // powerboat blue with yellow / wine with silver
};
// a colour's metallic version (lighter, more saturated) and its deep version, for a car with no entry
const shade = (hex, lift, sat) => {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255], mean = (c[0] + c[1] + c[2]) / 3;
  return c.map(v => Math.max(0, Math.min(255, Math.round((mean + (v - mean) * sat) * lift)))).reduce((acc, v) => (acc << 8) | v, 0);
};
const superLivery = (car) => SUPER_LIVERIES[car.id] ||
  { good: [shade(car.color, 1.25, 1.4), shade(car.evilColor, 0.7, 1.2)], evil: [shade(car.evilColor, 0.6, 1.3), shade(car.color, 1.25, 1.4)] };
const supers = {}; // the Super versions built so far, by the base car's id
// the Super version of a garage car (null for a car that has none: one out of the tiers (the Tank, a car idea),
// a level's vehicle, an earned car, or a Super car itself): built once and kept. `base` is the car it is made from.
// The Lowrider's is the garage's own Super Lowrider, as it stands there: its model, colours and figures, no kit
const NO_KIT = { wing: false, scoop: false, exhausts: false, skirts: false, glow: false, stripe: false };
export const superOf = (car) => {
  if (!car || !car.tier || car.earned || car.super || car.evergreen) return null; // (an evergreen blueprint car has none: as an idea had none)
  if (!supers[car.id] && car.id === 'lowrider') {
    const own = CARS.find(c => c.id === 'superlowrider');
    supers[car.id] = { ...own, id: 'super-' + car.id, super: true, base: car, price: 0, kit: NO_KIT, stripe: own.color, evilStripe: own.evilColor };
  }
  if (!supers[car.id]) {
    const S = CONFIG.superCar, livery = superLivery(car);
    supers[car.id] = { ...car, id: 'super-' + car.id, name: 'Super ' + car.name, super: true, base: car, price: 0, kit: livery.kit || {},
      color: livery.good[0], stripe: livery.good[1], evilColor: livery.evil[0], evilStripe: livery.evil[1],
      maxSpeed: car.maxSpeed + S.maxSpeed, accel: car.accel + S.accel, health: Math.round(car.health * S.health),
      agility: (car.agility || 1) + S.agility, crossing: Math.min(1, (car.crossing ?? CONFIG.railCrossing.usual) + S.crossing) };
  }
  return supers[car.id];
};
