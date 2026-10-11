// ============================================================================
// RADIATION - radiated areas and infected cars (a level's "radiation" and "infectedTraffic": see levels.js and
// CONFIG.radiation). What each does is here; render/radiation.js draws it.
//   A radiated area is a fixed stretch of some lanes (or of the whole road). While the middle of the player's
//   car is in one, its health ticks down slowly and the radiation METER rises; out of it the ticking stops and
//   the meter falls back, slowly. A FULL meter infects the player for the rest of the run: from then on the
//   health ticks down everywhere.
//   An infected car is a traffic vehicle that carries the same thing about with it: within `radius` m of it the
//   player is dosed exactly as in an area, and TOUCHING it infects the player at once, whatever the meter reads.
//   A traffic vehicle is dealt out infected (a share of them), or catches it, by chance, while it drives in an
//   area. An infected car is not harmed by it, nor by another, and drives as it always did.
//   The shield (the Armour pickup; and anything else that keeps all harm out: the moment after a helicopter drop,
//   the SuperCar mystery, a ghost, a tank) keeps all of it out: no dose, no rise of the meter, no infection by
//   area, ring or touch. For a player already infected the ticking stops while it lasts and goes on after: it
//   does not cure.
// Like Hazards and Gambles, this runs after the player's own update (Game.update) and puts its hand on the car
// there: Player itself knows nothing of it.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { Message } from './messages.js';
import { sfx } from './physics.js';

const STICKY = 'events.infected'; // (the message that stays as an icon: see CONFIG.messageTimes.sticky)

export const Radiation = {
  areas: [],       // { from, to, lanes: [first, last] | null (the whole road), side: -1 | 0 | 1 (the shoulder it reaches out over), entered (said this run) }
  on: false,       // the level has radiation at all (an area, or infected traffic): the HUD shows the meter
  share: 0,        // the share of its traffic dealt out infected
  meter: 0,        // 0 (clean) .. 1 (full: infected)
  infected: false, // the player, for the rest of the run
  source: null,    // what is dosing the player's car this step: 'area' | 'car' | null
  area: null,      // ...the area it is in (null: none), and the infected car whose ring it is in (null: none)
  near: null,
  kept: false,     // the shield kept a dose out this step (for the drawing)
  said: {},        // what has been said this run, once each
  click: 0,        // s until the counter's next click

  // the level's lists (as a level loads, for the drawing, and again as each run starts)
  build() {
    const R = CONFIG.radiation;
    this.areas = (LEVEL.radiation || []).map(a => ({ from: a.from, to: a.to, lanes: a.lanes || null, side: a.side === 'left' ? -1 : a.side === 'right' ? 1 : 0, entered: false }));
    this.share = LEVEL.infectedTraffic ?? (this.areas.length ? R.share : 0);
    this.on = this.areas.length > 0 || this.share > 0;
  },
  reset() {
    this.build();
    Object.assign(this, { meter: 0, infected: false, source: null, area: null, near: null, kept: false, said: {}, click: 0 });
    // (every car's own flag is put back by Traffic's blank(), as a run starts and as a slot is dealt out again)
  },

  // what an area covers across the road at s: [lo, hi] (lat). Its lanes; out to the road's edge on the side it
  // reaches over; with no lanes named, the whole road, shoulders and all
  span(a, s) {
    if (!a.lanes) return [Track.lo(s), Track.hi(s)];
    const half = CONFIG.laneWidth / 2;
    return [a.side < 0 ? Track.lo(s) : Track.laneOffset(a.lanes[0], s) - half, a.side > 0 ? Track.hi(s) : Track.laneOffset(a.lanes[1], s) + half];
  },
  // the area (s, lat) is in (null: none). It is the middle of a car that counts: the lane beside an area is clean
  at(s, lat) {
    for (const a of this.areas) {
      if (s < a.from || s > a.to) continue;
      const [lo, hi] = this.span(a, s);
      if (lat >= lo && lat <= hi) return a;
    }
    return null;
  },
  // can this traffic vehicle be infected at all? Ordinary traffic only: never the police, an ambulance, a
  // pursuit's cars, a racer or a rival courier, a tank, nor anything a level sets out by hand or in a formation
  can(car) {
    return !car.fixed && !car.emergency && !car.driver && !car.racer && !car.courier && !car.procession && !car.parade && !car.roadblock && !car.convoy &&
      !car.parked && !car.toad && !CONFIG.radiation.immune.includes(car.kind) && !CONFIG.vehicles[car.kind]?.boat;
  },
  // how many are about, infected
  count() {
    let n = 0;
    for (const car of Traffic.cars) if (car.active && car.infected) n++;
    return n;
  },
  // a vehicle just dealt out (Traffic's placeAt): its share come infected, no more than `most` about at once
  // (it is always put down well ahead of the player, or behind: never on top of it)
  deal(car) {
    if (!(this.share > 0) || !this.can(car)) return;
    if (Math.random() < this.share && this.count() < CONFIG.radiation.most) car.infected = true;
  },
  // does anything keep radiation out of the player's car just now?
  shielded() {
    const P = Player;
    return P.armour > 0 || P.shield > 0 || P.ghost > 0 || P.tank > 0 || P.mystery === 'invincible';
  },
  infect() {
    if (this.infected) return;
    this.infected = true;
    this.meter = 1;
    Message.say('events', 'infected');
    sfx('infected');
  },

  update(dt) {
    if (!this.on) return;
    const R = CONFIG.radiation, P = Player;
    // ---- the traffic: a clean vehicle in an area may catch it
    if (!Traffic.frozen && this.areas.length) {
      let n = -1;
      for (const car of Traffic.cars) {
        if (!car.active || car.infected || car.junction || !this.at(car.s, car.lat) || !this.can(car)) continue;
        if (Math.random() >= R.catch * dt) continue;
        if (n < 0) n = this.count();
        if (n++ < R.most) car.infected = true;
      }
    }
    // ---- the player's car
    this.source = this.area = this.near = null;
    this.kept = false;
    if (!P.active) return;
    const area = this.at(P.s, P.lat);
    let near = null, touched = false;
    for (const car of Traffic.cars) {
      if (!car.active || !car.infected || car.junction || Math.abs(car.s - P.s) > R.radius + 1) continue;
      if (!near && Math.hypot(car.s - P.s, car.lat - P.lat) <= R.radius) near = car;
      if (!(car.arrest >= 0) && !(P.air > car.height) && Collision.overlap(P, car)) touched = true;
    }
    this.area = area;
    this.near = near;
    const dosed = !!(area || near);
    if (this.shielded()) {
      this.kept = dosed || touched || this.infected;
      if ((dosed || touched) && P.armour > 0 && !this.said.shield) { this.said.shield = true; Message.say('events', 'radiationShield'); }
      if (!this.infected) this.meter = Math.max(0, this.meter - dt / R.meterFall);
      return;
    }
    if (touched) this.infect();
    if (dosed) {
      this.source = area ? 'area' : 'car';
      if (area && !area.entered) { area.entered = true; Message.say('events', 'radiation'); }
      else if (!area && !this.said.car) { this.said.car = true; Message.say('events', 'infectedCar'); }
      const was = this.meter;
      this.meter = Math.min(1, this.meter + dt / R.meterTime);
      if (was < R.high && this.meter >= R.high && !this.infected) Message.say('events', 'radiationHigh');
      if (this.meter >= 1) this.infect();
      // (the counter: a click, the faster the fuller the meter)
      if ((this.click -= dt) <= 0) { this.click = R.click.slow + (R.click.fast - R.click.slow) * this.meter; sfx('geiger', R.click.volume); }
    } else if (!this.infected) this.meter = Math.max(0, this.meter - dt / R.meterFall);
    // the health: a share of the car's full health a second, in a dose or infected (the greater of the two, not both)
    const tick = Math.max(dosed ? R.tick : 0, this.infected ? R.infectedTick : 0);
    if (tick > 0 && P.health > 0) P.health -= tick * P.maxHealth * dt;
    // (the icon by the gauges goes with a wreck or a bust, as every one does: the infection does not, unless
    // CONFIG says a wreck cures it; said again as the car is set down)
    if (this.infected && !P.busted && CONFIG.messageTimes.sticky[STICKY] && !Message.sticky.some(held => held.path === STICKY)) Message.say('events', 'infected');
  },
  // the car is wrecked (Game.updateRespawn): a new car is as infected as the last, unless CONFIG says otherwise
  wrecked() {
    if (CONFIG.radiation.wreckCures) { this.infected = false; this.meter = 0; }
  },
};

Object.assign(Message.conditions, {
  infected: { on: () => Radiation.infected },
});
