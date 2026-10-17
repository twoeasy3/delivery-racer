// The Options screen's "Unlock everything" button has two modes (the owner, 14-Oct), kept in Progress.data.unlockMode:
//   'all' (the default; absent in an older save): exactly Progress.complete() as it always was
//   'abs' ABSOLUTELY everything: that, plus every car in the game owned, the unavailable (`off`) earned cars and every Bespoke
//         and concept key car included (an owned car is its key), every blueprint car and every car at its max ECU, every
//         event's stages done, a big bank and Crazey Cash, and EVERY COSMETIC (cosmetics.js: each key of the registry, free ones too,
//         into cosmetics.js's own localStorage list, outside progress.js and so outside the replay fingerprint, never the cookie). Mode 'all' grants no cosmetic. Since cosmetics are earned and one is used a car (CHECKLIST 433), 'abs' gives 999 of each.
// Not a rule of a run, so not in the replay fingerprint (vite.config.js NOT_RULES). Skipped: the packs queue (an unopened
// pack deals random cards, so none is given), claimed rewards, the milestone counters and the Tank Rage pieces.
import { CARS, EARNED_CARS, EVENT_CARS, BESPOKE_CARS, FILLER_CARS, SECRET_CARS } from './cars.js';
import { LEVELS } from './levels.js';
import { CONFIG } from './config.js';
import { SPECIALS } from './events.js';
import { Progress } from './progress.js';
import { cosmeticKeys, grantAll } from './render/cosmetics.js';
import './render/platecosmetic.js'; // (registers the number plate designs, slot 'plate')
import './render/propdress.js'; // (registers the roof / cargo / wing props, slots 'roof' 'cargo' 'wing')
import './render/killfx.js'; // (registers the kill effects, slot 'kill')
import './render/underglow.js'; // (registers the underglow looks, slot 'underglow')
import './render/decalcosmetic.js'; // (registers the decal designs, slot 'decal')
import './render/trailcosmetic.js'; // (registers the turbo trails, slot 'trail': CHECKLIST 466)
import './render/wheelcosmetic.js'; // (registers the wheel sets; a later cosmetic slot's module is imported here too, so that 'abs' sees its items)
import { Ecu } from './ecu.js';

export const MODES = { all: 'Everything', abs: 'Absolutely everything' };
export const ABS_BANK = 9999999;       // $: well inside what the cookie holds (the bank is a short number in it)
export const ABS_CASH = 9999999;       // Crazey Cash (the Shop's balance)
export const unlockMode = () => (Progress.data.unlockMode === 'abs' ? 'abs' : 'all');
export const setUnlockMode = (mode) => { Progress.data.unlockMode = mode === 'abs' ? 'abs' : 'all'; Progress.save(); };
// every car id in the game that a save can own (key cars, off cars and the secrets included)
export const everyCarId = () => [...new Set([...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...Object.values(SECRET_CARS)].map(c => c.id))];

export const unlockEverything = (mode = unlockMode()) => {
  Progress.complete({ levels: LEVELS.length, cars: CARS.map(car => car.id), money: CONFIG.completeBank }); // (as ever)
  // (and every car at its max PURCHASED ECU, ecu.js: the garage's cars are in data.maxed, which holds a car at its max; a blueprint
  // car or any other that blueprints reached is bought up to what they reached, so no upgrade is left to pay for)
  Ecu.migrate();
  const bought = (Progress.data.ecuBought ||= {});
  for (const car of [...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...FILLER_CARS]) {
    if (!Ecu.kind(car)) continue;
    const top = Ecu.maxed(car) ? 0 : Ecu.reached(car);
    if (top > Ecu.purchased(car)) bought[car.id] = top;
  }
  if (mode !== 'abs') { Progress.save(); return; }
  const d = Progress.data, ids = everyCarId();
  for (const id of ids) if (!d.cars.includes(id)) d.cars.push(id);
  d.maxed = [...new Set([...(d.maxed || []), ...ids, ...FILLER_CARS.map(c => c.id)])]; // (max ECU for all, blueprint cars included)
  d.events = { ...(d.events || {}) };
  for (const e of SPECIALS) d.events[e.id] = Math.max(d.events[e.id] || 0, e.stages.length);
  grantAll(cosmeticKeys()); // (earned cosmetics, CHECKLIST 433: 999 of every item, a real stock, as 999 cards of each)
  d.money = Math.max(d.money, ABS_BANK);
  d.shopCash = Math.max(Math.floor(Number(d.shopCash) || 0), ABS_CASH);
  Progress.save();
};
