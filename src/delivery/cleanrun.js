// ============================================================================
// CLEAN RUN - a level's clock worked out (its "clock": { good, evil }; see CONFIG.clock): the level picked is
// driven from the start line to the drop by a ghost in the reference car, flat out, nothing in its way,
// and the clock is that run's time times CONFIG.clock.good or .evil, to the nearest `round` s, less
// `timePlus` s for each time plus on the level. A level driven in a car of its own is timed in that; an
// amphibious level in the amphibious reference car, holding its lane against the current.
// Used by scripts/level-clocks.mjs and by the level editor's "Work out the clock" (main.js, ?edited&clock).
// It takes the controls for good (Input's throttle and steer): not for a page that is to be played after.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Game } from './game.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { FxQueue } from './physics.js';
import { selectCar } from './cars.js';

const LONGEST = 900; // s of driving before the run is given up
// The dice for the run: the same every time for a given level (seeded from its id), so its clock is the same
// every time it is worked out. A race's grid and the traffic are dealt by the dice, and left to Math.random a
// circuit's clean run came out a second or two either way, enough to land on either side of a rounding step
const seeded = (text) => {
  let state = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 0x01000193) >>> 0; // (FNV-1a)
  return () => { // (mulberry32, as the checks use)
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
// the level already picked (selectLevel / selectSpecial): { delivered, time, outcome, car, pluses, clock }
// (seed: text added to the level's id for other dice, scripts/level-clocks.mjs --seed=)
export const cleanRun = (seed = '') => {
  const dice = Math.random;
  Math.random = seeded(String(LEVEL.id || '') + seed);
  try { return driven(); } finally { Math.random = dice; }
};
const driven = () => {
  const level = LEVEL, C = CONFIG.clock, round = (t) => Math.max(C.round, Math.round(t / C.round) * C.round);
  const holdLane = !!level.water;
  Object.defineProperty(Input, 'throttle', { get: () => 1, configurable: true });
  // (on a level with water stages the run holds its lane, as a driver does against a current: left to drift it
  // lands on the shoulder and is busted, which is no clean run)
  Object.defineProperty(Input, 'steer', { configurable: true, get: () => {
    if (!holdLane) return 0;
    const [first] = Track.laneRange(1, Player.s);
    return Math.max(-1, Math.min(1, (Track.laneOffset(first, Player.s) - Player.lat) * 0.6)) * (Track.mirrored ? -1 : 1);
  } });
  const car = level.amphibious ? C.amphibious : C.car;
  selectCar(car); // (a level with a car of its own takes that when the run starts)
  Game.evil = false;
  Game.loaded = null; // (the level built afresh, from these dice: what it builds would otherwise be whatever was there)
  Game.start();
  let t = 0;
  while (Game.state === 'playing' && t < LONGEST) {
    Object.assign(Player, { ghost: 99, health: Player.maxHealth });
    Game.busts = 0;
    Game.time = 0; // (the clock held: the run is timed here)
    Game.update(1 / 60);
    FxQueue.length = 0;
    t += 1 / 60;
  }
  const delivered = Game.outcome === 'delivered';
  const pluses = (level.pickups || []).filter(p => p.type === 'timePlus').length, back = pluses * C.timePlus;
  return { delivered, time: t, outcome: Game.outcome || 'still driving', car: level.car || car, pluses,
    clock: delivered ? { good: round(t * C.good) - back, evil: round(t * C.evil) - back } : null };
};
