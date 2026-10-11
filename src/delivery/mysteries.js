// ============================================================================
// MYSTERIES - the mystery pickup's second batch of effects, each in one place (Player.startMystery /
// endMystery only call start / end here, Game.update calls update; render/mysteries.js draws them):
//   earthquake    the road ripples for a while: the camera and every vehicle bob on a travelling wave
//                 (heave(s): the height of the road at s just now, 0 when there is no quake), the
//                 ground rumbles, and every car is bounced into the lane beside it, now and then
//   rewind        ten seconds back, obstacles and all (a ring buffer of snapshots, kept all run long):
//                 the clock goes back too, so the player gains the ten seconds. Over at once
//   giant         the car is twice its size: it crushes any traffic it touches unharmed (Player.giant:
//                 see Collision.resolve), and being two lanes wide, it no longer fits a lane
//   swapSides     the player is on the other side for a while: Good turns Evil, Evil turns Good
//                 (Player.evil flipped: packages, the drivers' attitudes and the social standing go by it)
//   magnet        every pickup ahead within reach drifts toward the car
//   blackout      every light off, the headlights only (drawn: see render/mysteries.js)
//   trafficFreeze everything but the player stops dead: traffic, obstacles and hazards (Traffic.frozen,
//                 which Traffic.update, Collision.updateObstacles and Hazards.update honour)
// ("souped up", the eighth, is a car swap: see Player.startMystery and cars.js superOf.)
// Tuning: CONFIG.mystery.<name>; a lasting one with a `time` of its own lasts that long.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { Pickups } from './pickups.js';
import { Game } from './game.js';
import { Message } from './messages.js';
import { sfx } from './physics.js';

const M = () => CONFIG.mystery;

// ---- the earthquake
const quake = { on: false, t: 0, next: 0 };
// the height of the road at s just now: a wave travelling up the road (0 when the ground is still)
const heave = (s) => {
  if (!quake.on) return 0;
  const Q = M().earthquake;
  const fade = Math.min(1, quake.t / 0.5, Math.max(0, Player.mysteryTime) / 1); // (in over half a second, out over the last)
  return Q.amp * fade * Math.sin(s / Q.wavelength * Math.PI * 2 - quake.t * Q.speed);
};
// every car on the road is bounced into the lane beside it (either side, whichever is there and open)
const bounceTraffic = () => {
  const Q = M().earthquake;
  for (const car of Traffic.cars) {
    if (!car.active || car.junction || car.parked || car.arrest >= 0 || car.racer || car.toad) continue;
    const [first, last] = Track.laneRange(car.dir, car.s);
    const beside = [car.lane - 1, car.lane + 1].filter(l => l >= first && l <= last && Track.openLane(l, car.s) === l);
    if (!beside.length) continue;
    const lane = beside[Math.floor(Math.random() * beside.length)];
    car.latVel += Math.sign(lane - car.lane) * Q.kick;
    car.lane = lane;
    car.pendingLane = null;
    car.signal = 0;
    car.stun = Math.max(car.stun, CONFIG.stunTime);
  }
  sfx('rumble');
  Game.shake = Math.max(Game.shake, 1);
};

// ---- the rewind: a snapshot of everything that moves, every `every` s, kept `seconds` s
const history = [];
let sinceSnap = 0;
const CAR_KEYS = ['s', 'lat', 'vs', 'lane', 'health', 'latVel', 'yaw'];
const snapshot = () => ({
  time: Game.time,
  player: { s: Player.s, lat: Player.lat, speed: Player.speed, health: Player.health, yaw: Player.yaw, latVel: Player.latVel },
  // (a car is only put back if it is still the same car on the same errand: the pool is recycled as the player goes)
  cars: Traffic.cars.map(c => c.active && !c.junction ? [c.kind, c.dir, ...CAR_KEYS.map(k => c[k])] : null),
  obstacles: Collision.obstacles.map(o => [o.s, o.lat, o.gone, o.h]),
  pickups: Pickups.items.map(p => [p.taken, p.s, p.lat]),
});
const rewind = () => {
  const snap = history[0]; // (the oldest: ten seconds ago, or as far back as this run goes)
  if (!snap) return;
  Game.time = snap.time;
  Object.assign(Player, snap.player, { stun: 0, yawVel: 0 });
  Traffic.cars.forEach((c, i) => {
    const was = snap.cars[i];
    if (!was || !c.active || c.junction || c.kind !== was[0] || c.dir !== was[1]) return;
    CAR_KEYS.forEach((k, n) => { c[k] = was[n + 2]; });
    Object.assign(c, { stun: 0, yawVel: 0, spin: 0, pendingLane: null });
  });
  Collision.obstacles.forEach((o, i) => { const was = snap.obstacles[i]; if (was) [o.s, o.lat, o.gone, o.h] = was; });
  // (the pickups come back too, but not a mystery already taken: the one that did this stays taken)
  Pickups.items.forEach((p, i) => { const was = snap.pickups[i]; if (was && !(p.type === 'mystery' && p.taken)) [p.taken, p.s, p.lat] = was; });
  history.length = 0;
  sinceSnap = 0;
  flash = M().rewind.flash; // (the screen flashes: see render/mysteries.js)
  sfx('throw');
};
let flash = 0; // s of the rewind's screen flash left

// ---- the giant: the car twice its size, treading heavily
let giantOn = false, stepAt = 0;
const resize = (k) => {
  Player.hw *= k;
  Player.hl *= k;
  Player.height *= k;
};

// ---- swapped sides
let swapped = false;

// ---- the magnet: pickups pulled toward the car
const pull = (dt) => {
  const G = M().magnet;
  for (const p of Pickups.items) {
    if (p.taken) continue;
    const ds = p.s - Player.s;
    if (ds < -2 || ds > G.range) continue;
    if (p.homeS === undefined) { p.homeS = p.s; p.homeLat = p.lat; } // (put back for the next run: see reset)
    p.pulled = true; // (drawn where it is now: see render/items.js)
    const dl = Player.lat - p.lat, step = G.speed * dt;
    p.s -= Math.sign(ds) * Math.min(Math.abs(ds), step);
    p.lat += Math.sign(dl) * Math.min(Math.abs(dl), step * 0.5);
  }
};

// ---- the traffic freeze
const freeze = (on) => {
  Traffic.frozen = on;
  for (const car of Traffic.cars) {
    if (on) { car.frozenVs = car.vs; car.vs = 0; car.latVel = 0; car.yawVel = 0; }
    else if (car.frozenVs !== undefined) { if (car.active) car.vs = car.frozenVs; delete car.frozenVs; }
  }
};

export const Mysteries = {
  get quake() { return quake.on; },
  get blackout() { return Player.mystery === 'blackout'; },
  get flash() { return flash; },
  heave,
  // whether an effect can be had on this level at all (Player.startMystery gives another in its place):
  // no swapping sides where the side is fixed, and no going back in time in a race or on a lapped level
  fits(effect) {
    if (effect === 'swapSides') return !LEVEL.battle && !LEVEL.alwaysGood;
    if (effect === 'rewind') return !LEVEL.grid && !LEVEL.laps;
    return true;
  },
  // a new run: nothing running, the history empty, every pulled pickup back where the level put it
  reset() {
    quake.on = false;
    giantOn = false;
    swapped = false;
    Player.giant = false;
    history.length = 0;
    sinceSnap = 0;
    flash = 0;
    if (Traffic.frozen) freeze(false);
    for (const p of Pickups.items) if (p.homeS !== undefined) { p.s = p.homeS; p.lat = p.homeLat; } // (still `pulled`: its mesh is put back by following it)
  },
  start(effect) {
    if (effect === 'earthquake') {
      Object.assign(quake, { on: true, t: 0, next: M().earthquake.every });
      bounceTraffic();
    } else if (effect === 'rewind') rewind();
    else if (effect === 'giant') {
      if (!giantOn) resize(M().giant.scale);
      giantOn = Player.giant = true;
      stepAt = Player.s;
      sfx('heavy');
    } else if (effect === 'swapSides') {
      Player.evil = !Player.evil;
      swapped = true;
      // (the message says which side: its ${side} filled in)
      const line = Message.lines.find(l => l.text && l.text.includes('${side}'));
      if (line) line.text = line.text.replace('${side}', Player.evil ? 'EVIL' : 'GOOD');
    } else if (effect === 'magnet') pull(0);
    else if (effect === 'trafficFreeze') freeze(true);
  },
  end(effect) {
    if (effect === 'earthquake') quake.on = false;
    else if (effect === 'giant' && giantOn) {
      resize(1 / M().giant.scale);
      giantOn = Player.giant = false;
    } else if (effect === 'swapSides' && swapped) {
      Player.evil = !Player.evil;
      swapped = false;
    } else if (effect === 'trafficFreeze') freeze(false);
  },
  update(dt) {
    flash = Math.max(0, flash - dt);
    // (the history, for a rewind: a snapshot every so often, the oldest dropped once it is old enough)
    const R = M().rewind;
    if (this.fits('rewind')) { // (not kept at all where there is no going back)
      if ((sinceSnap += dt) >= R.every || !history.length) {
        sinceSnap = 0;
        history.push(snapshot());
        while (history.length > Math.ceil(R.seconds / R.every) + 1) history.shift();
      }
    }
    if (quake.on) {
      quake.t += dt;
      Game.shake = Math.max(Game.shake, M().earthquake.shake);
      if ((quake.next -= dt) <= 0) {
        quake.next = M().earthquake.every;
        bounceTraffic();
      }
    }
    if (giantOn && Player.active) { // (heavy footsteps as it goes)
      if (Math.abs(Player.s - stepAt) >= M().giant.step) {
        stepAt = Player.s;
        if (Player.speed > 1) { sfx('heavy', 0.4); Game.shake = Math.max(Game.shake, 0.3); }
      }
    }
    if (Player.mystery === 'magnet') pull(dt);
    if (Traffic.frozen) for (const car of Traffic.cars) { car.vs = 0; car.latVel = 0; car.yawVel = 0; } // (statues, whatever shoves them)
  },
};
