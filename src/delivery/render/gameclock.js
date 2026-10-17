// THE PARENT GAME CLOCK (CHECKLIST 442, the owner: "Smoke and boost (and all other trails) should continue to be calculated by
// their parent's actual game speed when paused"). Render-only: the one place the trails, smoke, sprays, wakes, exhausts and the
// particle pools (render/effects.js, items.js, water.js, machinery.js, packages.js, killfx.js...) read their time and their
// parents' speed from.
//   GameClock.dt     s of GAME time this frame: the logic steps main.js really took (CONFIG.maxStep each). 0 while paused or in
//                    photo mode (the car is frozen, so its trail is), twice the wall time in a replay at 2x, half at 0.5x
//   GameClock.wall   s of wall time this frame (what the camera, the HUD and the menus run on)
//   GameClock.frozen no game time passed this frame: the game pools take no new particle (render/effects.js)
// Until main.js ticks it (a headless check that drives the render modules itself), dt is a 60 Hz frame and nothing is frozen:
// every check that calls a sync with its own dt behaves as before.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';

export const GameClock = { dt: 1 / 60, wall: 1 / 60, scale: 1, frozen: false, steps: 0 };

// main.js's frame: the logic stepped in whole steps of CONFIG.maxStep (the replay's rule: REPLAY-NOTES.md), the wall time times
// `scale` added to what is carried over (scale: a replay's 2x / 4x; 0.5 a slow motion), none while paused. `update(step)` is
// Game.update (returning false: no step was taken, a playback held at its end). Returns the game time stepped, and sets GameClock. (Moved here from main.js unchanged, so a check can drive it.)
let carry = 0;
export const stepGame = (wall, { paused = false, scale = 1, update } = {}) => {
  let steps = 0;
  if (paused) carry = 0;
  else {
    carry = Math.min(carry + wall * scale, 0.1 * Math.max(1, scale));
    while (carry > CONFIG.maxStep * 0.98) { if (update(CONFIG.maxStep) !== false) steps++; carry -= CONFIG.maxStep; }
    carry = Math.max(0, carry);
  }
  return tickGameClock(wall, steps * CONFIG.maxStep, paused ? 0 : scale, steps);
};
// (or set straight: a frame of `wall` s in which `dt` s of game time passed)
export const tickGameClock = (wall, dt, scale = wall > 0 ? dt / wall : 1, steps = Math.round(dt / CONFIG.maxStep)) => {
  GameClock.wall = wall; GameClock.dt = dt; GameClock.scale = scale; GameClock.frozen = !(dt > 0); GameClock.steps = steps;
  return dt;
};
export const resetGameClock = () => { carry = 0; tickGameClock(1 / 60, 1 / 60, 1); };

// a chance that was `p` a 60 Hz frame, for this frame's game time (none while paused; twice as likely in a 2x replay's frame)
export const chance = (p) => Math.random() < p * GameClock.dt * 60;
// how many of something emitted `rate` times a second of GAME time come out this frame (render/effects.js perSecond, on the clock)
export const gameCount = (rate) => Math.floor(rate * GameClock.dt + Math.random());

// THE PARENT'S VELOCITY in the world, m/s of game time: where a body (the player, a traffic car: s, lat, vs or speed, latVel) is
// going along the road AND across it (a lane change bends its trail), up the road's grade too. What it leaves behind is given a
// share of this, so a trail is consistent with the car it comes from (out = { x, y, z }; returns out)
const A = new THREE.Vector3(), B = new THREE.Vector3(), E = 0.05;
export const parentVelocity = (v, out, s = v.s, lat = v.lat) => {
  const vs = v.vs ?? v.speed ?? 0, vl = v.latVel || 0;
  const k = Track.pathScale ? Track.pathScale(s, lat) : 1;
  Track.toWorld(s, lat, A);
  Track.toWorld(s + vs * k * E, lat + vl * E, B);
  out.x = (B.x - A.x) / E; out.y = (B.y - A.y) / E; out.z = (B.z - A.z) / E;
  return out;
};
