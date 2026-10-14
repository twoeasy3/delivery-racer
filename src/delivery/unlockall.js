// The Options screen's "Unlock everything" button has two modes (the owner, 14-Oct), kept in Progress.data.unlockMode:
//   'all' (the default; absent in an older save): exactly Progress.complete() as it always was
//   'abs' ABSOLUTELY everything: that, plus every car in the game owned, the unavailable (`off`) earned cars and every Bespoke
//         and concept key car included (an owned car is its key), every blueprint car and every car at its max ECU, every
//         event's stages done, a big bank and Crazey Cash, and EVERY COSMETIC (cosmetics.js: each key of the registry, free ones too,
//         into Progress.data.cosmetics, which is local storage only, never the cookie). Mode 'all' grants no cosmetic.
// Not a rule of a run, so not in the replay fingerprint (vite.config.js NOT_RULES). Skipped: the packs queue (an unopened
// pack deals random cards, so none is given), claimed rewards, the milestone counters and the Tank Rage pieces.
import { CARS, EARNED_CARS, EVENT_CARS, BESPOKE_CARS, FILLER_CARS, SECRET_CARS } from './cars.js';
import { LEVELS } from './levels.js';
import { CONFIG } from './config.js';
import { SPECIALS } from './events.js';
import { Progress } from './progress.js';
import { cosmeticKeys } from './cosmetics.js';
import './render/wheelcosmetic.js'; // (registers the wheel sets; a later cosmetic slot's module is imported here too, so that 'abs' sees its items)

export const MODES = { all: 'Everything', abs: 'Absolutely everything' };
export const ABS_BANK = 9999999;       // $: well inside what the cookie holds (the bank is a short number in it)
export const ABS_CASH = 9999999;       // Crazey Cash (the Shop's balance)
export const unlockMode = () => (Progress.data.unlockMode === 'abs' ? 'abs' : 'all');
export const setUnlockMode = (mode) => { Progress.data.unlockMode = mode === 'abs' ? 'abs' : 'all'; Progress.save(); };
// every car id in the game that a save can own (key cars, off cars and the secrets included)
export const everyCarId = () => [...new Set([...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...Object.values(SECRET_CARS)].map(c => c.id))];

export const unlockEverything = (mode = unlockMode()) => {
  Progress.complete({ levels: LEVELS.length, cars: CARS.map(car => car.id), money: CONFIG.completeBank }); // (as ever)
  if (mode !== 'abs') return;
  const d = Progress.data, ids = everyCarId();
  for (const id of ids) if (!d.cars.includes(id)) d.cars.push(id);
  d.maxed = [...new Set([...(d.maxed || []), ...ids, ...FILLER_CARS.map(c => c.id)])]; // (max ECU for all, blueprint cars included)
  d.events = { ...(d.events || {}) };
  for (const e of SPECIALS) d.events[e.id] = Math.max(d.events[e.id] || 0, e.stages.length);
  Progress.grantCosmetics(cosmeticKeys());
  d.money = Math.max(d.money, ABS_BANK);
  d.shopCash = Math.max(Math.floor(Number(d.shopCash) || 0), ABS_CASH);
  Progress.save();
};
