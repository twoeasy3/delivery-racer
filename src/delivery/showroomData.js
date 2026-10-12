// ---- the showroom's cards, as data (no drawing here: render/showroom.js draws them; scripts/.showroom-check.mjs reads them)
// The SHOWROOM is where a car is picked (BLUEPRINTS-NOTES.md, CHECKLIST 115): every car the player has or could have,
// one card each: its name, stars, rarity, its ECU (a pip per ECU up to its maximum, filled up to the ECU it is at),
// its blueprints toward the next ECU, and whether it can be driven, and if not, why. Buying stays in the car lot,
// Crazey Jim's Used Cars (render/garage.js). The ECU figures are ecu.js's (Ecu); anything it does not say about a
// car (a secret one, an earned one it has no table for) falls back to the car's own figures, so a card never throws.
import { CONFIG } from './config.js';
import { CARS, EARNED_CARS, EVENT_CARS, FILLER_CARS, SECRET_CARS, stars, starColour, carTier, carPreview, forSale, carRule, ruleAllows, selectCar, carInUse } from './cars.js';
import { Progress } from './progress.js';
import { Game } from './game.js';
import { Tiers } from './tiers.js';
import { LEVELS } from './levels.js';
import { levelName } from './levelText.js';
import { Ecu } from './ecu.js';

// the words players see on a car that cannot be driven (the owner's, 12-Oct)
export const LOCKED_WORDS = {
  key: 'You need the key to drive this car',
  lot: 'Purchase this car from the car lot',
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
const figures = (car) => ({ maxSpeed: car.maxSpeed, accel: car.accel, health: car.health, respawn: CONFIG.respawnTime });
const statsAt = (car, level) => {
  const s = safe(() => Ecu.stats(car, level), null);
  return s ? { ...figures(car), ...s } : figures(car);
};

// every car on the showroom's floor, in its order: the tiers (each tier's gold cars, then its Blue Star ones, cheapest
// first; a filler car in its tier), the amphibious ones, the event cars, the earned 6-star ones (not those off), and a
// secret one owned (the City Bus)
const rank = (car) => car.earned ? 80 : EVENT_CARS.includes(car) ? 70 : Object.values(SECRET_CARS).includes(car) ? 90
  : car.amphibious ? 50 + car.tier : (car.tier || 40) + (car.blue ? 5 : 0);
export const showroomCars = () => [...CARS, ...(FILLER_CARS || []), ...EVENT_CARS, ...EARNED_CARS.filter(car => !car.off),
  ...Object.values(SECRET_CARS).filter(car => Progress.owns(car.id))]
  .sort((a, b) => rank(a) - rank(b) || (a.price || 0) - (b.price || 0));

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
  const hidden = !unlocked && !owned && bp === 0 && (preview === 'teaser' || preview === 'hide');
  // why it cannot be driven
  let reason = '', hint = '';
  if (!unlocked) {
    if (blueprint) {
      reason = 'Collect ' + Math.max(0, x - bp) + ' more blueprint' + (x - bp === 1 ? '' : 's') + ' to unlock this car';
      hint = 'Blueprints come in card packs';
    } else if (CARS.includes(car) && !car.evergreen) {
      reason = LOCKED_WORDS.lot;
      hint = forSale(car) ? 'At ' + CAR_LOT + ' for $' + car.price.toFixed(2) : tierWhy(car) ? 'Not for sale yet: ' + tierWhy(car) : 'Not for sale yet';
    } else {
      reason = LOCKED_WORDS.key;
      if (car.earned) {
        const level = LEVELS.find(l => l.id === car.earned.level);
        hint = 'The key: beat the par on ' + (level ? levelName(level) : car.earned.level);
      } else if (EVENT_CARS.includes(car)) hint = 'The key: an event\'s grand prize';
    }
  }
  // a car that can be driven, but not on the level picked (its car rule, on the side picked)
  const rule = carRule(evil), barred = unlocked && !!rule && !ruleAllows(rule, car);
  return {
    car, id: car.id,
    name: hidden ? 'Locked car' : car.name,
    stars: stars(car), starColour: starColour(car), tier: tierOf(car),
    rarity: rarityOf(car), hidden,
    ecu, max, maxed, upgradable, blueprint, key: !blueprint,
    blueprints: bp, perEcu: x, have: maxed ? toNext : have, toNext,
    owned, unlocked, barred,
    state: !unlocked ? 'locked' : barred ? 'barred' : 'ready',
    reason, hint,
    rule: barred ? rule : null,
    stats: statsAt(car, Math.max(1, ecu)), maxStats: statsAt(car, max),
    perk: car.perk || '',
    forSale: !owned && forSale(car),
  };
};

// the best figures on the floor, for the stat bars (by a car's MAXED figures, as the cars stand now)
export const floorBest = () => {
  const cards = showroomCars().map(car => statsAt(car, safe(() => Ecu.max(car), 1)));
  return { maxSpeed: Math.max(...cards.map(s => s.maxSpeed)), accel: Math.max(...cards.map(s => s.accel)), health: Math.max(...cards.map(s => s.health)),
    respawnBest: Math.min(...cards.map(s => s.respawn)), respawnWorst: Math.max(...cards.map(s => s.respawn)) };
};

// ---- the side: Good or Evil, picked in the showroom (its header and its detail share the one choice) ---------------
// It is the livery the cars are shown in, the side whose car rule marks the cards ("Not on this level"), and the side
// DRIVE drives as (as the car lot's "Drive it as Evil": render/garage.js takeSide). It starts on the side being played.
export const sideName = (evil) => evil ? 'Evil' : 'Good';
// the words on the detail's big button, for a card made for that side (carCard(car, evil))
export const driveWords = (card, evil) => card.state === 'ready' ? 'Drive as ' + sideName(evil)
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
  if (card.id !== carInUse().id) selectCar(card.id);
  return true;
};
