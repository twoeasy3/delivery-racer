// ---- THE DELIVERY: a level delivered, the cargo is set down at the kerb before the results ------
// Game.finish has already fixed the run (its time, outcome, tip and records) and the state is
// 'finished'; this only holds the results screen back for a few seconds while, by the clock here:
//   park     the car brakes to a stop at the kerb on its own side (a ghost: nothing ploughs into it),
//   unload   the cargo comes out of it and is set down on the kerbside,
//   moment   it has a moment of its own (an Evil one in whatever state it had got to),
//   and after a beat the results come up (Delivery.done calls back to Game).
// A key, tap or click skips straight to the results (skip()): the car is then put at the kerb and the
// cargo beside it, where they would have ended up. Either way they stay there behind the results
// (`delivered`) until the next run. The times and distances are CONFIG.consignment.ending. Rendering
// only draws it (render/cargo.js), from the fields here.
// It only happens where something can show it: `staged` is set by the rendering when it loads, so a
// headless run goes straight to the results as it always did. Not on a level that carries nothing
// (a race, the Battlefield: see cargo.js) nor in a vehicle with no kerb to pull in at
// (CONFIG.consignment.noEnding), nor after any ending but a delivery, on time or late.
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp } from './util.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { sfx, updateYaw } from './physics.js';
import { cargoFor, cargoState } from './cargo.js';

export const Delivery = {
  staged: false,   // something is there to show it (render/cargo.js says so)
  active: false,   // it is going on: the results are held back
  delivered: false, // it is over (or was skipped): car and cargo stay at the kerb behind the results
  get on() { return this.active || this.delivered; }, // (either: the car is this module's to move)
  t: 0,            // s since the car crossed the line
  phase: '',       // park | unload | moment | beat
  u: 0,            // how far through that phase, 0 .. 1
  cargo: null,     // what is delivered: { id, name } (cargo.js)
  state: 0,        // an Evil item's state as the line was crossed: 0 calm, 1 agitated, 2 furious
  from: { s: 0, lat: 0 }, // where the car was at the line...
  to: { s: 0, lat: 0 },   // ...where it stops, at the kerb...
  spot: { s: 0, lat: 0 }, // ...and where the cargo is set down, beside it
  roll: 0,         // m/s it is taken to be doing at the line (so that it stops just at `to`)
  landed: false,   // the cargo has been set down
  done: null,      // called when it is over (Game shows the results)

  // whether this ending gets one
  wanted(outcome) {
    return this.staged && (outcome === 'delivered' || outcome === 'late') && Player.active &&
      !!cargoFor(LEVEL, Player.evil) && !CONFIG.consignment.noEnding.includes(LEVEL.car);
  },
  // from Game.finish: starts it, or says no (false: the results come up at once)
  begin(outcome, remaining, allowed, done) {
    this.reset();
    if (!this.wanted(outcome)) return false;
    const E = CONFIG.consignment.ending;
    this.cargo = cargoFor(LEVEL, Player.evil);
    this.state = Player.evil ? cargoState(remaining, allowed) : 0;
    // braking evenly, it covers half of what it would have at the speed it crossed the line
    const reach = clamp(Player.speed * E.park / 2, E.least, Math.min(E.reach, Track.end - 30 - Player.s));
    this.roll = 2 * reach / E.park;
    this.from.s = Player.s;
    this.from.lat = Player.lat;
    this.to.s = this.spot.s = Player.s + reach;
    // the cargo goes just inside the road's edge on the car's own side, the car beside it
    this.spot.lat = Track.hi(this.to.s) - E.inset;
    this.to.lat = this.spot.lat - E.beside - Player.hw;
    this.done = done;
    this.active = true;
    this.phase = 'park';
    return true;
  },
  // a key, a tap, a click: straight to the results (not in the first moment: the key held over the line)
  skip() {
    if (!this.active || this.t < CONFIG.consignment.ending.skipAfter) return false;
    this.finish();
    return true;
  },
  finish() {
    const done = this.done;
    this.active = false;
    this.delivered = this.landed = true;
    this.phase = '';
    this.done = null;
    this.hold();
    if (done) done();
  },
  // the car stopped at the kerb (still a ghost: the traffic drives through it)
  hold() {
    Player.s = this.to.s;
    Player.lat = this.to.lat;
    Player.speed = Player.latVel = Player.yaw = Player.yawVel = 0;
    Player.ghost = Math.max(Player.ghost, 0.3);
  },
  // (a new run, or back to the menu: nothing left over)
  reset() {
    this.active = this.delivered = false;
    this.t = this.u = 0;
    this.phase = '';
    this.landed = false;
    this.done = null;
  },
  // every step while it goes on (and after, behind the results), in place of the player's own update:
  // the car is driven from here
  update(dt) {
    if (this.delivered) { this.hold(); return; }
    if (!this.active) return;
    const E = CONFIG.consignment.ending;
    this.t += dt;
    const u = Math.min(1, this.t / E.park), ease = u * u * (3 - 2 * u), lat = this.from.lat + (this.to.lat - this.from.lat) * ease;
    Player.s = this.from.s + (this.to.s - this.from.s) * (2 * u - u * u);
    Player.latVel = dt > 0 ? (lat - Player.lat) / dt : 0;
    Player.lat = lat;
    Player.speed = this.roll * (1 - u);
    Player.ghost = Math.max(Player.ghost, 0.3); // (the traffic drives through it)
    updateYaw(Player, dt);
    if (u >= 1) Player.latVel = 0;
    let t = this.t;
    for (const [phase, length] of [['park', E.park], ['unload', E.unload], ['moment', E.moment], ['beat', E.beat]]) {
      if (t < length) { this.phase = phase; this.u = t / length; break; }
      t -= length;
      this.phase = '';
    }
    if (!this.landed && this.t >= E.park + E.unload) { // set down
      this.landed = true;
      sfx(this.state === 2 ? 'burst' : 'drop', 0.6);
    }
    if (!this.phase) this.finish();
  },
};
