// ============================================================================
// THE BETTER RIDE, AS DATA (render/ridenudge.js shows it; a prototype behind ?nudge: NEW-PLAYER-IDEAS.md). No DOM here, so a
// check can load it headless (scripts/.ridenudge-check.mjs). Render-side only: no rule of a run reads it.
// ============================================================================
import { Tiers } from '../tiers.js';
import { Progress } from '../progress.js';
import { CAR, carById, carStats } from '../cars.js';
import { Game } from '../game.js';

// the next level's id: the ride for it, and the cars it betters (a player already in something else is left alone)
export const RIDES = {
  'back-roads': { car: 'junker', over: ['commuter'] },
  farm: { car: 'darkvan', over: ['commuter', 'junker'] },
};
export const KEY = 'delivery.nudge';
export const nudgeOn = (search = typeof location !== 'undefined' ? location.search : '') => {
  const v = new URLSearchParams(search).get('nudge');
  try {
    if (v === 'on') localStorage.setItem(KEY, '1');
    if (v === 'off') localStorage.removeItem(KEY);
  } catch { /* (no storage: the visit's switch alone) */ }
  if (v === 'off') return false;
  if (v !== null) return true;
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

// the stats the ride does better, as bars: [{ label, from, to, unit }] (top speed first: the game's first stat)
export const STATS = [['maxSpeed', 'Top speed', 3.6, 'km/h'], ['health', 'Health', 1, ''], ['accel', 'Acceleration', 1, '']];
export const betterStats = (from, to) => {
  const a = carStats(from), b = carStats(to);
  return STATS.filter(([k]) => (b[k] ?? 0) > (a[k] ?? 0)).slice(0, 2).map(([k, label, x, unit]) => ({ label, from: Math.round(a[k] * x), to: Math.round(b[k] * x), unit }));
};
// the nudge for a level and the car in use: { level, ride, offer: 'use' | 'buy' | 'short', short } or null
export const nudgeFor = (level, car = CAR) => {
  const r = level && RIDES[level.id], ride = r && carById(r.car);
  if (!ride || !car || !r.over.includes(car.id)) return null;
  if (Tiers.on() && Tiers.restriction(level, Game.evil) !== null && Tiers.restriction(level, Game.evil) !== ride.tier) return null; // (a rule it would not be allowed under)
  const owns = Progress.owns(ride.id), bank = Progress.data.money;
  return { level, ride, offer: owns ? 'use' : bank >= ride.price ? 'buy' : 'short', short: Math.max(0, Math.ceil(ride.price - bank)) };
};

