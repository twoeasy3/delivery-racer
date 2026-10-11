// ============================================================================
// POLICE PURSUIT (a level's "pursuits": { every: { min, max } }; see CONFIG.pursuit) - a traffic event, as an
// ambulance is: now and then a chase already under way comes through the level from behind the player, a
// getaway car flat out, weaving through the traffic, and behind it an interceptor (a car seen nowhere else),
// siren going, the traffic in its lane pulling aside for it as for an ambulance. The two drive on through and
// away up the road, and that is all: there is nothing in it for the player, and nothing against. Never on a
// race or the Battlefield.
//
// Both cars are the traffic's own (taken from the cars the level leaves unused), so they hit and are hit like
// any other; but each is driven from here (car.driver: see Traffic.update), not by a traffic driver's habits.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp, damp } from './util.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Message } from './messages.js';
import { CAR } from './cars.js';
import { updateYaw, keepOnRoad } from './physics.js';

const P = CONFIG.pursuit, D = P.driving;
const between = (r) => r.min + Math.random() * (r.max - r.min);

// everything that can be in a car's way: the traffic on the road, and the player
const inTheWay = (o) => o.isPlayer ? Player.active && !(Player.ghost > 0) && !(Player.shield > 0) && !Player.testGhost
  : o.active && !o.junction && !(o.arrest >= 0);
// m of clear road ahead of the car were it driving at `lat` (as far as it looks; under 1: something is beside
// it there), and what ends it: { o, d }. `partner` (the other car of the two) is never in its way
const roadAhead = (car, lat, partner, margin) => {
  let found = { o: null, d: Math.abs(car.vs) * D.look + 40 };
  for (const o of [Player, ...Traffic.cars]) {
    if (o === car || o === partner || !inTheWay(o) || Math.abs(o.lat - lat) >= o.hw + car.hw + margin) continue;
    const d = (o.s - car.s) - o.hl - car.hl;
    if (d > -2 * (o.hl + car.hl) && d < found.d) found = { o, d };
  }
  return found;
};
// One step of driving: `want` m/s, in whichever lane going its way is clear furthest ahead (near `prefer`,
// across the road), braking for what is in its way as hard as its brakes allow, which may not be enough
const drive = (car, dt, want, prefer, partner) => {
  if (car.stun > 0) { // (knocked about: it coasts, as any car does)
    car.stun = Math.max(0, car.stun - dt);
    car.vs -= car.vs * CONFIG.stunDrag * dt;
    car.latVel -= car.latVel * damp(CONFIG.stunGrip, dt);
  } else {
    if ((car.rethink -= dt) <= 0) {
      car.rethink = D.rethink;
      const [first, last] = Track.laneRange(1, car.s);
      let top = -Infinity;
      for (let l = first; l <= last; l++) {
        if (Track.openLane(l, car.s) !== l || Track.openLane(l, car.s + 80) !== l) continue;
        const lat = Track.laneOffset(l, car.s);
        const score = roadAhead(car, lat, partner, D.margin).d - Math.abs(lat - prefer) * D.drift + (Math.abs(lat - car.aimLat) < 0.5 ? D.stick : 0);
        if (score > top) { top = score; car.aimLat = lat; }
      }
    }
    const wantVel = clamp((car.aimLat - car.lat) * 3, -D.swerve, D.swerve);
    car.latVel += (wantVel - car.latVel) * damp(8, dt);
  }
  const block = roadAhead(car, car.lat, partner, 0.15);
  const target = !block.o || block.d < -1 ? want : Math.min(want, Math.max(0, block.o.vs) + Math.sqrt(2 * D.brake * Math.max(0, block.d - D.followGap)));
  car.braking = car.vs > target + 0.8;
  if (!(car.stun > 0)) car.vs += clamp(target - car.vs, -D.brake * dt, D.accel * dt);
  car.s += car.vs * dt;
  car.lat += car.latVel * dt;
  keepOnRoad(car, 0.3);
  updateYaw(car, dt);
  car.lane = Track.nearestLane(car.lat, car.s);
  car.signal = 0;
};

export const Pursuit = (() => {
  let next = Infinity; // s to the next one
  let st = null;       // the one going on: { getaway, cop, cruise }

  const allowed = () => (!!LEVEL.pursuits || !!Pursuit.force?.anywhere) && !LEVEL.laps && !LEVEL.battle && !(LEVEL.grid && !LEVEL.grid.rival) &&
    Track.flow !== 'south' && Track.flow !== 'mixed';

  // a car of the traffic's, taken from those the level leaves unused, to be driven from here
  const take = (kind, s, lane, driver) => {
    const car = Traffic.spare();
    if (!car) return null;
    car.dir = 1;
    car.bound = 'north';
    car.s = s;
    Traffic.outfit(car, kind, lane);
    if (car.toad) { Object.assign(car, car.toad); car.toad = null; } // (set off in TOAD RAGE: it stays what it is)
    Object.assign(car, { evil: false, defiant: false, viaSide: false, hesitant: false, emotion: 'neutral', mood: 0, showMood: false,
      throwTimer: Infinity, aimLat: car.lat, rethink: 0, driver });
    return car;
  };
  const release = (car) => { car.active = false; car.driver = null; car.sirenOn = false; };

  // flat out (and faster still while it is far from the player: it comes, and it goes)
  const pace = (car) => st.cruise + P.rush * clamp((Math.abs(car.s - Player.s) - P.near) / P.near, 0, 1);
  // the getaway car: by whichever lane is clear
  const flee = (car, dt) => drive(car, dt, pace(car), car.lat, st.cop);
  // the interceptor: after it, `gap` m behind, by the lane it is in if that is clear (and on up the road, if it is wrecked)
  const chase = (car, dt) => {
    const g = st.getaway;
    if (!g.driver) { drive(car, dt, pace(car), car.lat, null); return; }
    const gap = g.s - car.s - g.hl - car.hl;
    drive(car, dt, clamp(g.vs + (gap - P.gap) * P.closing, 0, st.cruise + 2 * P.rush), g.lat, g);
  };

  // sets one off: the getaway car `behind` m behind the player and the interceptor `gap` m behind that. False
  // if there is no room for it just now
  const start = () => {
    if (st || !allowed() || !Player.active || !Track.isMain(Player.s)) return false;
    const s0 = Player.s - (Pursuit.force?.behind ?? P.behind);
    if (!Track.inBounds(s0 - P.gap - 20) || Player.s > Track.length - P.clearOfEnd) return false;
    const [first, last] = Track.laneRange(1, s0), lanes = [];
    for (let l = first; l <= last; l++) {
      if (Track.openLane(l, s0) === l && Traffic.cars.every(o => !o.active || o.lane !== l || o.s < s0 - P.gap - 30 || o.s > s0 + 30)) lanes.push(l);
    }
    if (!lanes.length) return false;
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const getaway = take('getaway', s0, lane, flee), cop = getaway && take('interceptor', s0 - P.gap, lane, chase);
    if (!cop) { if (getaway) release(getaway); return false; }
    st = { getaway, cop, cruise: clamp(CAR.maxSpeed * P.pace, P.speed.min, P.speed.max) };
    getaway.vs = cop.vs = st.cruise + P.rush;
    cop.sirenOn = true;
    Message.say('events', 'pursuit');
    return true;
  };

  const reset = () => {
    for (const car of Traffic.cars) { car.driver = null; car.sirenOn = false; }
    st = null;
    next = !allowed() ? Infinity : Pursuit.force ? Pursuit.force.at : between(LEVEL.pursuits.every);
  };
  const update = (dt) => {
    if (!st) {
      if (allowed() && Player.active && (next -= dt) <= 0) next = !start() ? P.retry : LEVEL.pursuits ? between(LEVEL.pursuits.every) : Infinity;
      return;
    }
    // each is taken off once it is out of sight up the road (or wrecked, or left a long way behind)
    for (const car of [st.getaway, st.cop]) {
      if (car.driver && (!car.active || car.s - Player.s > CONFIG.spawnMax + 150 || Player.s - car.s > P.leftBehind || !Track.inBounds(car.s + 20))) release(car);
    }
    if (!st.getaway.driver && !st.cop.driver) st = null;
  };

  return { reset, update,
    get cars() { return st ? [st.getaway, st.cop] : []; }, // (the two of one going on: for the checks)
    get next() { return next; },
    // { at, behind?, anywhere? }: one set off `at` s into every run, from that far behind, on a level with no
    // pursuits of its own too (for a picture, or a check: see render/pursuit.js)
    force: null,
  };
})();
