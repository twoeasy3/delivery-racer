// ============================================================================
// ECU - a car's upgrade level (BLUEPRINTS-NOTES.md, the spec; CHECKLIST item 115, the owner's answers). ECU0 = locked,
// not driveable. Two kinds of car:
//   KEY car        starts at ECU1 once its key is had (a car lot car: bought; an earned car: earned; an event's: given),
//                  and climbs one ECU per X blueprints; blueprints collected before the key count (it then plays at the ECU
//                  reached). Unselectable until the key. The garage's cars (CARS), the earned (special) cars, the event cars, the Bespoke key cars (BESPOKE_CARS).
//   BLUEPRINT car  starts at ECU0, locked; its first X blueprints unlock it (ECU1), each X more raise it one ECU. The
//                  evergreen filler cars (cars.js FILLER_CARS).
// A car's max ECU follows the star ladder (LADDER below); the special (earned) cars and the 1-gold cars stop at ECU1. Each
// ECU's figures are SAVED, one entry per ECU, in ecus.json (by car id: { x, ecus: [{ maxSpeed, accel, health, respawn,
// agility, delivery, composure, crossing, weight }] }, ECU1 first), written by scripts/ecu-tables.mjs from the budget below
// (STEPS, TOP_SPEED_CAP, FLOORS) and the truth from then on (a hand edit is lost to --write: see the script's header). The second set (the owner, 12-Oct, CHECKLIST item 126; NEW_STATS below): agility (cars.js
// `agility`, steering), delivery (package efficacy: a Good gift's standing gain and an Evil flaming package's damage are
// multiplied by it: packages.js; each car's own, DELIVERY below), composure (the shoulder meter's fuse: Social.dangerTime is multiplied by it, held to
// CONFIG.composureFloor), crossing (cars.js `crossing`: rails, fords, mud, the tide) scale with the ECU like the first set;
// weight (cars.js `mass`) is the same at every ECU. A car with no entry
// (a car idea, the City Bus, a level's own vehicle, a Super car) has no ECU and drives on its own figures.
// RACES are a separate game: none of this applies there (drive(): own figures, CONFIG.respawnTime).
// Saved: Progress.data.blueprints = { [carId]: count } and Progress.data.maxed = [carId]: the cars held at their MAX ECU
// whatever their blueprints (the starter car; every car an old save owned, so nobody lost power; "Unlock everything").
// ecus.json is imported here, so it is in the replay `logic` hash (vite.config.js): an edit to it refuses old replays.
// ============================================================================
import ECUS from './ecus.json';
import { CONFIG } from './config.js';
import { Progress } from './progress.js';
import { LEVEL, isRace } from './levels.js';
import { CARS, EARNED_CARS, EVENT_CARS, BESPOKE_CARS, FILLER_CARS, setEcuHooks } from './cars.js';

// the ladder (decided, 12-Oct): max ECU by star tier, gold and blue, and the rarity of a key car's blueprint card
export const LADDER = {
  gold: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
  blue: { 1: 3, 2: 4, 3: 5, 4: 5, 5: 5 },
};
export const RARITY = {
  gold: { 1: null, 2: 'common', 3: 'common', 4: 'common', 5: 'uncommon' }, // (1 gold: no cards, the starters)
  blue: { 1: 'uncommon', 2: 'uncommon', 3: 'uncommon', 4: 'epic', 5: 'epic' },
};
// THE ECU BUDGET: the rule scripts/ecu-tables.mjs writes ecus.json by (the owner, 12-Oct: "the stat difference between
// an ECU1 and ECU5 is too small"; "Keep the 25% limit for Top Speed only"; CHECKLIST item 171). From each car's MAXED
// figures (its own, never moved), by EQUAL STEPS PER STAT: ECU1 = max x (1 - f x (N - 1)), held to the stat's FLOOR,
// then ECU k of N = ECU1 + (max - ECU1) x (k - 1) / (N - 1) (unfloored, that is the old max x (1 - f (N - k))). f is per
// ECU step, by the car's kind (lot: the car lot's cars, CARS; blueprint: the evergreen fillers, the event cars, the
// Bespoke key cars) and by stat: top speed steps small (a 5-ECU car's ECU1 at 82% of its max, under the cap below), the
// stats that are felt (accel, health, delivery, composure, crossing) big (ECU1 at 60% of max), agility a little less
// (68%: it scales the lane change straight, the cornering by its square root). The car lot's cars gain about half
// (the owner: lot cars gain less per ECU). Weight does not scale. Respawn: RESPAWN below.
export const STEPS = {
  lot: { maxSpeed: 0.03, accel: 0.05, health: 0.05, agility: 0.04, delivery: 0.05, composure: 0.05, crossing: 0.05 },
  blueprint: { maxSpeed: 0.045, accel: 0.1, health: 0.1, agility: 0.08, delivery: 0.1, composure: 0.1, crossing: 0.1 },
};
// the TOP SPEED CAP (the owner, 12-Oct): a car's max top speed is at most this many times its ECU1's (ECU1 >= max / 1.25)
export const TOP_SPEED_CAP = 1.25;
// the FLOORS: no ECU1 below these (a floor above a car's max: its max, flat). share: of the car's max; min: absolute.
// Health 80 and accel 7 are the lowest maxed figures of any car lot car (the Sportscompact, the Love Bus), so a fresh
// car is never feebler than the weakest car one can buy; composure stops at CONFIG.composureFloor (below it the
// shoulder meter would not change, so a step would be lost); agility 0.5 (half the usual lane change)
export const FLOORS = {
  maxSpeed: { share: 1 / TOP_SPEED_CAP }, accel: { min: 7 }, health: { min: 80 }, agility: { min: 0.5 },
  composure: { min: CONFIG.composureFloor },
};
export const RESPAWN = { first: 5.5, step: 0.5 };
export const X_DEFAULT = 5;
// the second set of stats (CHECKLIST item 126): what each is at the MAXED ECU (a car's own field, else today's default),
// and whether it scales with the ECU (weight does not). The multipliers are rounded to 0.001 so each ECU stays above
// the last even for a small figure (a crossing of 0.15)
// DELIVERY at a car's MAXED ECU (the owner, 12-Oct: "cook up new stats for Delivery"): package efficacy, a share of
// today's (1 = a gift's standing and a flaming package's damage as they always were). THIS TABLE IS WHERE TO EDIT THEM
// (a car's own `delivery` field in cars.js wins over it; a car in neither: 1), then run
// `node scripts/ecu-tables.mjs --delivery` to write each ECU's figure into ecus.json by the equal steps.
export const DELIVERY = {
  // mail, courier and delivery vehicles: built to hand things over (the best)
  postvan: 1.6, courier: 1.6, milkfloat: 1.55, keitruck: 1.5, floatvan: 1.5, 'earned-apc': 1.45, dampervan: 1.4,
  // vans and people carriers: a big side door, room to reach the parcels
  darkvan: 1.35, minivan: 1.35, lovebus: 1.3, tuktuk: 1.3,
  // trucks, utes and working machines: a load bed and a crew
  ute: 1.3, pickup: 1.3, sixbysix: 1.3, fireengine: 1.3, towtruck: 1.25, polytruck: 1.25, taxi: 1.25, liftedtruck: 1.2,
  moonrover: 1.2, monster: 1.1, fieldscout: 1.1, toybota: 1.15, nissank: 1.1,
  // estates, SUVs and big saloons: a boot and a passenger to throw
  wagon: 1.2, woody: 1.2, suv: 1.2, sleeper: 1.15, fullsize: 1.15, hearse: 1.1, stately: 1.0, swancar: 1.0,
  // big comfortable saloons with a boot to lose a parcel in
  goddess: 1.1, hardtop: 1.1,
  // everyday small cars: as today, or a little under
  commuter: 1.0, evsaloon: 1.0, teardrop: 0.95, mini: 0.9, hothatch: 0.9, pandacoupe: 0.9, herald: 0.9, tank: 0.9,
  showdown: 0.9, 'earned-ufo': 0.9,
  // style over space: low, loud, two seats or a cramped cockpit
  rally: 0.85, lowrider: 0.85, gullwing: 0.85, pony: 0.85, muscle: 0.85, superlowrider: 0.8, classicgt: 0.8, buggy: 0.8,
  midnight: 0.8, splitwindow: 0.8, flyingcar: 0.8, rocketfin: 0.8, hellrod: 0.8, 'earned-jetboat': 0.8,
  // a wreck that drops things, and pure sports cars: no room, no aim at speed
  junker: 0.75, sport: 0.75, rotary: 0.75, rearengine: 0.75, silvercomet: 0.75, hotrod: 0.7, miata: 0.7, 'earned-gt': 0.7,
  snake: 0.65, keiroadster: 0.65, wedge: 0.65,
  // tiny novelties, record cars and racers: nowhere to keep a parcel (the worst)
  snocat: 1.1, hotdog: 1.4, bubble: 0.6, jetcar: 0.6, dragster: 0.6, solarracer: 0.6, monowheel: 0.6, 'earned-f1': 0.6, 'earned-lmp': 0.6,
};
// COMPOSURE at a car's MAXED ECU is its own `composure` field in cars.js (default 1 = CONFIG.dangerTime, 3 s). The slow
// cars have more (CHECKLIST item 171: they take longer to get past traffic on the shoulder): every 1-star car 1.3,
// every 2-star car 1.15, of any star colour (gold, blue, sea green), car lot or blueprint; 3 stars and up 1.0.
export const NEW_STATS = {
  agility: { of: (car) => car.agility ?? 1, scales: true },
  delivery: { of: (car) => car.delivery ?? DELIVERY[car.id] ?? 1, scales: true },
  composure: { of: (car) => car.composure ?? 1, scales: true },
  crossing: { of: (car) => car.crossing ?? CONFIG.railCrossing.usual, scales: true },
  weight: { of: (car) => car.mass ?? 1, scales: false },
};

const tierOf = (car) => (car.tier >= 1 && car.tier <= 5 ? car.tier : null);
const listed = (list, car) => list.some(c => c.id === car.id);
const cache = new Map(); // stats objects, by id|ecu
let pinned = null; // a replay's: { car: id, ecu } while it plays back (null: none)

export const Ecu = {
  table: ECUS,
  // ---- what a car is ----
  // 'blueprint' (an evergreen filler car), 'key' (a garage, earned or event car) or null (no ECU: an idea, the bus...)
  kind(car) {
    if (!car) return null;
    if (car.evergreen || listed(FILLER_CARS, car)) return 'blueprint';
    if (car.bespoke || listed(CARS, car) || listed(EARNED_CARS, car) || listed(EVENT_CARS, car)) return 'key'; // (a Bespoke key car too: BESPOKE_CARS)
    return null;
  },
  isBlueprint(car) { return this.kind(car) === 'blueprint'; },
  isKey(car) { return this.kind(car) === 'key'; },
  // special: today's magenta 6-star cars (EARNED_CARS): ECU1 only, no blueprints
  isSpecial(car) { return !!car && (!!car.earned || listed(EARNED_CARS, car)); },
  // the ladder's max for a car (what ecus.json was written with): special cars, tierless cars and the 1-gold cars 1;
  // an event car or a Bespoke key car (no tier of its own) sits at the top (5); every other by its stars
  ladder(car) {
    if (!this.kind(car) || this.isSpecial(car)) return 1;
    const t = tierOf(car);
    if (!t) return listed(EVENT_CARS, car) || car.bespoke ? 5 : 1;
    return LADDER[car.blue ? 'blue' : 'gold'][t];
  },
  // the max ECU: as ecus.json has it (the truth), else the ladder's
  max(car) {
    const entry = car && ECUS[car.id];
    return entry ? entry.ecus.length : this.ladder(car);
  },
  // blueprints per ECU step
  x(car) { return (car && ECUS[car.id]?.x) || X_DEFAULT; },
  // the rarity of its blueprint card: the car's own `rarity` if it has one (the evergreen cars; a Bespoke key car's,
  // 'legendary': cars.js), else the tier table;
  // null: it has no cards (a 1-gold key car, a special car, a car with no ECU). A 1-gold blueprint car is common
  rarity(car) {
    if (!this.kind(car) || this.isSpecial(car)) return null;
    if (car.rarity) return car.rarity;
    const t = tierOf(car);
    if (!t) return listed(EVENT_CARS, car) ? 'epic' : null;
    return RARITY[car.blue ? 'blue' : 'gold'][t] ?? (this.isBlueprint(car) ? 'common' : null);
  },

  // ---- the save ----
  blueprints(carId) { return Progress.data.blueprints?.[carId] || 0; },
  // n blueprints of a car added (saved). Returns the ECU the car has now reached (reached: a key car without its key
  // has reached it all the same, and plays at it once the key is had; a blueprint car short of X: 0)
  addBlueprints(carId, n = 1) {
    const data = Progress.data;
    data.blueprints ||= {};
    data.blueprints[carId] = Math.max(0, (data.blueprints[carId] || 0) + Math.floor(n));
    Progress.save();
    const car = byId(carId);
    return car ? this.reached(car) : 0;
  },
  maxed(car) { return !!car && (Progress.data.maxed || []).includes(car.id); },
  // has the player got its key? (a key car: bought, earned, given; Progress.owns)
  hasKey(car) { return !!car && Progress.owns(car.id); },
  // the ECU its blueprints (or a maxed grant) have reached, key or no key: a key car at least 1, a blueprint car 0
  // until X. Capped at its max. A car with no ECU: 1
  reached(car) {
    const kind = this.kind(car);
    if (!kind) return 1;
    const max = this.max(car);
    if (this.maxed(car)) return max;
    const steps = Math.floor(this.blueprints(car.id) / this.x(car));
    return Math.min(max, kind === 'key' ? 1 + steps : steps);
  },
  // may it be driven? A key car: its key. A blueprint car: X blueprints (or put in the save's list of cars by a test switch)
  unlocked(car) {
    if (!car) return false;
    if (this.kind(car) === 'blueprint') return this.reached(car) >= 1 || Progress.data.cars.includes(car.id);
    return Progress.owns(car.id);
  },
  // the ECU it plays at: 0 = locked (not driveable), else its reached ECU (at least 1)
  level(car) { return this.unlocked(car) ? Math.max(1, this.reached(car)) : 0; },
  // why it cannot be driven (the words of the spec), or null if it can
  lockedWords(car) {
    if (!car || this.unlocked(car)) return null;
    if (this.kind(car) === 'blueprint') return 'Collect ' + this.x(car) + ' blueprints to unlock this car';
    if (car.earned) return 'Earn this car on its level';
    return listed(CARS, car) && !car.tank ? 'Purchase this car from the car lot' : 'You need the key to drive this car';
  },

  // ---- the figures ----
  // an ECU's figures: { maxSpeed, accel, health, respawn, agility, delivery, composure, crossing, weight, ecu } (ecu: the level
  // given, held to 1..max; 0 is shown as 1, what it would play at). A car with no table: its own figures,
  // CONFIG.respawnTime, ecu null. (An entry written before the second set: those fields from the car's own, maxed)
  stats(car, level = this.level(car)) {
    const entry = car && ECUS[car.id];
    if (!entry) return own(car);
    const ecu = Math.max(1, Math.min(entry.ecus.length, Math.round(level) || 1));
    const key = car.id + '|' + ecu;
    if (!cache.has(key)) cache.set(key, Object.freeze({ ...ownNew(car), ...entry.ecus[ecu - 1], ecu }));
    return cache.get(key);
  },
  respawnTime(car, level) { return this.stats(car, level).respawn; },
  // the figures a run drives the car with (cars.js carStats, on every use):
  //   a race (a separate game), or a car with no table: its own figures and CONFIG.respawnTime
  //   a car lent by Car Swap, a level's own vehicle (its car lock), a Super car: MAXED, as they always drove
  //   a replay playing back: the ECU its header recorded (an old one, with none: maxed)
  //   else: the car's ECU (a car driven at ECU0, which only a test switch can do: ECU1)
  drive(car, lent = false) {
    if (!car) return car;
    if (!ECUS[car.id] || (LEVEL && isRace(LEVEL))) return own(car);
    const max = this.max(car);
    if (lent || (LEVEL && LEVEL.car === car.id)) return this.stats(car, max);
    if (pinned) return this.stats(car, pinned.car === car.id && pinned.ecu ? pinned.ecu : max);
    return this.stats(car, Math.max(1, this.level(car)));
  },
  // a replay's ECU, while it plays back (replay.js): { car, ecu } (ecu null: maxed), or null when it is over
  pin(value) { pinned = value && value.car ? { car: value.car, ecu: Number(value.ecu) || null } : null; },
  get pinned() { return pinned; },
};
// (a car's own figures, as stats: read afresh each time, as a check may change a car's figures)
const ownNew = (car) => Object.fromEntries(Object.entries(NEW_STATS).map(([k, d]) => [k, d.of(car)]));
const own = (car) => (car ? { maxSpeed: car.maxSpeed, accel: car.accel, health: car.health, respawn: CONFIG.respawnTime, ...ownNew(car), ecu: null } : car);
const byId = (id) => [...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...FILLER_CARS].find(car => car.id === id) || null;

// the hooks: cars.js asks for a run's figures; progress.js asks whether a blueprint car is owned (unlocked)
setEcuHooks({ drive: (car, lent) => Ecu.drive(car, lent) });
Progress.blueprintOwns = (carId) => { const car = FILLER_CARS.find(c => c.id === carId); return !!car && Ecu.reached(car) >= 1; };
