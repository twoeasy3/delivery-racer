import { CONFIG } from './config.js';
import { clamp, damp } from './util.js';
import { Track } from './track.js';
import { LEVEL } from './levels.js';

// ============================================================================
// PHYSICS - helpers shared by every vehicle (player and traffic), all in track space (s, lat)
// ============================================================================
const MAX_YAW = Math.min(CONFIG.maxYawDeg, 45) * Math.PI / 180;

// the angle a car's nose is turned by, given how fast it is moving sideways and forwards
export const yawFor = (lateralSpeed, forwardSpeed) => clamp(
  Math.atan2(lateralSpeed, Math.max(Math.abs(forwardSpeed), CONFIG.yawMinSpeed)) * CONFIG.yawGain, -MAX_YAW, MAX_YAW);

// Game logic -> rendering. Entries are either visual effects ({ type: 'explode' | 'burst' | 'gift', s, lat, ... }) or
// requests for a sound ({ type: 'sound', name, volume, s }); see sfx() below.
export const FxQueue = [];
export const sfx = (name, volume = 1) => FxQueue.push({ type: 'sound', name, volume });
// a sound from a spot on the road (s), quieter the further it is from the player
export const sfxAt = (name, s, volume = 1) => FxQueue.push({ type: 'sound', name, volume, s });

// every vehicle (player and traffic) shares these fields so collision can treat them alike:
// s, lat, vs (signed speed along the track), latVel, yaw, yawVel, stun, dir, mass, hw, hl, health
export const updateYaw = (v, dt) => {
  v.yaw += v.yawVel * dt;
  v.yawVel -= v.yawVel * damp(3, dt);
  const settle = CONFIG.yawSmoothing * (v.stun > 0 ? 0.15 : 1);
  v.yaw += (yawFor(v.latVel, v.vs) * v.dir - v.yaw) * damp(settle, dt);
  v.yaw = clamp(v.yaw, -MAX_YAW, MAX_YAW);
};

export const keepOnRoad = (v, bounce) => {
  const lo = Track.lo(v.s) + v.hw, hi = Track.hi(v.s) - v.hw;
  if (v.lat > hi || v.lat < lo) {
    // where walls hurt ("wallDamage"), going into one sideways hurts, the harder the more (once as it
    // hits: scraping along it after that, nothing more)
    const R = CONFIG.race, into = (v.lat > hi ? 1 : -1) * (v.latVel + (v.slideVel || 0));
    if (LEVEL.wallDamage && !v.onWall && into > R.wallFrom && v.health > 0 && !(v.shield > 0) && !(v.ghost > 0)) {
      hurt(v, into * R.wallDamage);
      sfx('sideswipe', Math.min(1, into / 8));
      if (!v.isPlayer) v.slideVel = 0;
    }
    // well past the limit on the bridge means the player arrived on the shoulder and
    // drove into the end of the structure (it can't be reached by steering or by a shove)
    const over = v.lat > hi ? v.lat - hi : lo - v.lat;
    if (Track.onBridge(v.s) && v.isPlayer && v.shield <= 0 && over > 0.5) v.health = 0;
    v.lat = v.lat > hi ? Math.max(lo, hi) : lo;
    v.latVel *= -bounce;
    v.onWall = true;
  } else v.onWall = false;
  // where the two ways have parted (a level's "splits": see Track.apart) there is no crossing the centre: each
  // keeps to the side it is on
  const gap = Track.apart(v.s);
  if (gap > 0) {
    const centre = -Track.medianHalf, margin = Math.min(v.hw + 0.05, gap / 2);
    if (v.lat < centre ? v.lat > centre - margin : v.lat < centre + margin) {
      const side = v.lat < centre ? -1 : 1;
      v.lat = centre + side * margin;
      if (v.latVel * side < 0) v.latVel *= -bounce;
    }
  }
};

// the top speed in the bend at s (see CONFIG.cornering) of a car that weighs `weight` (1 = the
// Commuter) and is `agility` agile: Infinity on the straight
export const cornerSpeed = (s, weight = 1, agility = 1) => {
  const c = Math.abs(Track.bend(s));
  return c > 1e-4 ? Math.sqrt(CONFIG.cornering.grip * agility / (weight * c)) : Infinity;
};
// a traffic vehicle's weight, the same way as the player's (see Player.weight)
export const weightOf = (v) => (v.mass || 1) * Math.sqrt(v.hw * v.hl * v.height / CONFIG.ice.weightRef);

// emotion follows mood; taking damage sours it
export const emotionOf = (mood) => mood > 1 / 3 ? 'happy' : mood < -1 / 3 ? 'angry' : 'neutral';
// a damaged traffic car may spin out: the more of its health is gone, the likelier
// (crit: how much likelier than usual a critical hit is)
export const maybeSpinOut = (v, amount, scale = 1, crit = 1) => {
  if (v.isPlayer || v.unspinnable || v.spin > 0 || v.health <= 0) return; // (a rival courier never spins, nor takes a critical hit)
  const lost = 1 - v.health / v.maxHealth;
  // (its kind's own odds: "crit" and "spin" scale the chances of each, 0 = never; see CONFIG.vehicles)
  const type = CONFIG.vehicles[v.kind];
  const chance = scale * CONFIG.spinPerDamage * (amount / v.maxHealth) * (1 + CONFIG.spinRamp * lost * lost) * (type?.spin ?? 1);
  // a critical hit: the car wobbles for a moment, then spins out whatever state it was in
  if (!(v.wobble > 0) && Math.random() < CONFIG.critChance * scale * crit * (type?.crit ?? 1)) v.wobble = CONFIG.critWobbleTime;
  if (Math.random() < chance && !type?.noSpin) spinOut(v); // (an 18-wheeler never spins)
};
// the car loses all control: it arcs away, turning a full circle, and then blows up
export const spinOut = (v) => {
  if (v.unspinnable) return;
  sfxAt('screech', v.s);
  v.spinIce = false; // (one that skidded on ice says so itself: see Traffic)
  v.wobble = 0;
  v.spin = CONFIG.spinTime;
  v.spinTurn = Math.random() < 0.5 ? -1 : 1; // which way the body rotates
  // its path will arc one way or the other from whatever its momentum is now
  v.spinRate = (Math.random() < 0.5 ? -1 : 1) *
    (CONFIG.spinTurnMin + Math.random() * (CONFIG.spinTurnMax - CONFIG.spinTurnMin));
};
// one traffic car taking against another (see Traffic.update for what it then does)
export const startRivalry = (car, other) => {
  if (car.isPlayer || other.isPlayer || LEVEL.battle) return; // (the Battlefield's armies have a war to fight)
  if (car.racer && !car.evil) return; // (a good racer races clean, whatever is done to it)
  if (car.courier || other.courier) return; // (a rival courier has no time for feuds, and is in too much of a hurry to be picked on)
  car.rival = other;
  car.rivalTime = CONFIG.rivalryTime;
  car.mood = Math.max(-1, car.mood - 0.3);
  car.showMood = true;
};
export const hurt = (v, amount, crit = 1) => {
  v.health -= amount * (v.damageScale ?? 1); // (the player's car: see Player.damageScale)
  maybeSpinOut(v, amount, 1, crit);
  if (!v.isPlayer) v.mood = Math.max(-1, v.mood - amount * CONFIG.moodPerDamage);
};
