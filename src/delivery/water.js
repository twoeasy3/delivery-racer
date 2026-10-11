// ============================================================================
// WATER STAGES - a level's "water": [{ from, to, current? }] (see levels.js and CONFIG.water). Over each
// stretch the road IS water: the pavement runs down a slipway into a channel as wide as the road and comes
// back up a slipway at the far end, and its lanes carry on as lanes. Track.water(s) is how deep it is there.
// What it does:
//   - a car that floats (a car's "amphibious"; a boat, a saucer and a tank do too) drives in at speed and
//     carries on as a boat: a lower top speed, less acceleration and braking, softer steering (feel). Nothing
//     stops it at the water's edge. A car that doesn't float crawls and is damaged (it is never meant to be
//     there: an amphibious level is only started in an amphibious car, see Game.start);
//   - a current (a stage's "current") carries a car afloat sideways, and a boat's wake shoves it off the
//     boat's line (push): both are steered against, neither stops anything;
//   - traffic that can't float pulls onto its own shoulder short of the slipway and waits there nose to tail
//     (marshal, holdFor): the queue is on the shoulder, so every lane stays open. Amphibious traffic drives in
//     and out, slower afloat (pace). Boats (a vehicle's "boat") turn up on the water only (allows) and tie up
//     at the bank, the channel's shoulder, short of the slipway at the end of their water.
// A level with no water has none of this: its boats (Oh Mine!'s) go where its traffic does.
// This is what the water does; render/water.js draws it.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';

const W = () => CONFIG.water;
const DRY = { depth: 0, afloat: false, top: 1, accel: 1, brake: 1, steer: 1, grip: 1, damage: 0 };
const feel = { ...DRY }; // (the one object, filled in afresh by feel())
// what a vehicle is to the water, by its kind of traffic: 'boat', 'amphibious' or 'land'
const classOf = (kind) => { const type = CONFIG.vehicles[kind] || {}; return type.boat ? 'boat' : type.amphibious ? 'amphibious' : 'land'; };

export const Water = {
  cars: [],    // the traffic, as last marshalled (for the wakes: see push)
  queues: {},  // how many are waiting at each edge, by stageKey
  get on() { return !!Track && Track.waters.length > 0; },
  // a new run: nobody is waiting anywhere yet. (The queues were kept from the last step of the run before, and
  // allows() reads them as the traffic is first dealt out, so a second run began with other vehicles than a first)
  reset() { this.cars = []; this.queues = {}; },
  depth: (s) => Track.water(s),
  // the stage s is in (with `margin` m either end), if any
  at(s, margin = 0) { return Track.isMain(s) ? Track.waters.find(w => s > w.from - margin && s < w.to + margin) || null : null; },
  // does a car (one of cars.js's) float?
  floats: (car) => !!(car.amphibious || car.wake || car.ufo || car.tank),
  // what the water at s does to a car, floating or not: the shares it keeps of its top speed, acceleration,
  // braking, sideways speed and steering response, and the damage a second it takes. (The same object each
  // time: read it at once)
  feel(s, floats) {
    const depth = Track.water(s);
    if (depth <= 0) return DRY;
    const C = W(), k = Math.min(1, depth / C.afloat), mix = (to) => 1 + (to - 1) * k; // (all a boat by the time it is afloat)
    feel.depth = depth;
    feel.afloat = depth >= C.afloat;
    feel.top = mix(floats ? C.topSpeed : C.sunkSpeed);
    feel.accel = floats ? mix(C.accel) : 1;
    feel.brake = floats ? mix(C.brake) : 1;
    feel.steer = floats ? mix(C.steer) : 1;
    feel.grip = mix(C.steerGrip);
    feel.damage = !floats && feel.afloat ? C.sunkDamage : 0;
    return feel;
  },
  // m/s^2 sideways on a car afloat at (s, lat) going way dir: the stage's current, and the wake of any boat
  // just ahead of it (off the boat's line, the harder the closer astern)
  push(v) {
    const stage = this.at(v.s);
    if (!stage || Track.water(v.s) < W().afloat) return 0;
    let push = LEVEL.water[Track.waters.indexOf(stage)].current || 0;
    const K = W().wake;
    for (const boat of this.cars) {
      if (!boat.active || boat === v || !CONFIG.vehicles[boat.kind]?.boat || Math.abs(boat.vs) < K.from) continue;
      const astern = (boat.s - v.s) * boat.dir - boat.hl; // m astern of it the car is
      if (astern < 0 || astern > K.length) continue;
      const off = v.lat - boat.lat, reach = boat.hw + K.width;
      if (Math.abs(off) > reach) continue;
      push += (off < 0 ? -1 : 1) * K.shove * (1 - astern / K.length) * (1 - Math.abs(off) / reach * 0.5);
    }
    return push;
  },

  // ---- traffic ---------------------------------------------------------------------------------
  // the edge of the water a vehicle going way dir from s would come to, if it can't go on: for a boat, the end
  // of the stage it is on; for a land vehicle, the start of the next stage ahead. { key, line (the s it stops
  // short of), from (m short of it that it starts making for the side) }, or null
  edgeFor(cls, s, dir) {
    const C = W(), list = Track.waters;
    if (cls === 'boat') {
      const w = this.at(s);
      if (!w) return null;
      const i = list.indexOf(w);
      return { key: 'b' + i + dir, line: dir > 0 ? w.to - C.slipway - C.moor.edge : w.from + C.slipway + C.moor.edge, rule: C.moor };
    }
    if (cls !== 'land' || this.at(s)) return null;
    let best = null;
    list.forEach((w, i) => {
      const line = dir > 0 ? w.from - C.queue.edge : w.to + C.queue.edge;
      if ((line - s) * dir >= 0 && (!best || (line - s) * dir < (best.line - s) * dir)) best = { key: 'l' + i + dir, line, rule: C.queue };
    });
    return best;
  },
  // may a vehicle of this kind turn up at s, going way dir? A boat only out on the water, clear of the
  // slipways; nothing that can't float on the water, nor right on top of the water's edge, nor heading for a
  // queue that is full. (With no s: is it a kind that turns up on the road at all? Not a boat)
  allows(kind, s, dir = 1) {
    if (!this.on) return true;
    const cls = classOf(kind), C = W();
    if (s === undefined) return cls !== 'boat';
    if (cls === 'amphibious') return true;
    if (cls === 'boat') {
      const w = this.at(s);
      if (!w || s < w.from + C.slipway + C.moor.from * 0.5 || s > w.to - C.slipway - C.moor.from * 0.5) return false;
    } else if (this.at(s, C.queue.edge)) return false;
    const edge = this.edgeFor(cls, s, dir);
    if (!edge) return true;
    return (edge.line - s) * dir > edge.rule.clear && (this.queues[edge.key] || 0) < edge.rule.most;
  },
  // Once a step, before the traffic drives (see Traffic.update): which vehicles are coming up to water they
  // can't go on over, and where each is to stop. car.waterWait: the s it stops at (it makes for its shoulder
  // meanwhile: see Traffic), or null. Each queue is nose to tail, the nearest the edge first
  marshal(cars) {
    this.cars = cars;
    this.queues = {};
    if (!this.on) return;
    const lines = {};
    for (const car of cars) {
      car.waterWait = null;
      if (!car.active || car.junction || car.parked || car.roadblock || car.parade || car.toad || car.spin > 0 || !Track.isMain(car.s)) continue;
      const cls = classOf(car.kind);
      if (cls === 'amphibious') continue;
      const edge = this.edgeFor(cls, car.s, car.dir);
      if (!edge || (edge.line - car.s) * car.dir > edge.rule.from + edge.rule.reach) continue;
      (lines[edge.key] = lines[edge.key] || { edge, cars: [] }).cars.push(car);
    }
    for (const { edge, cars: coming } of Object.values(lines)) {
      const dir = coming[0].dir;
      coming.sort((a, b) => (edge.line - a.s) * dir - (edge.line - b.s) * dir);
      let at = edge.line, waiting = 0;
      for (const car of coming) {
        const stop = at - dir * car.hl;
        at = stop - dir * (car.hl + edge.rule.gap);
        // (it makes for the side `from` m short of its own place in the queue, however long the queue has grown)
        if ((stop - car.s) * dir > edge.rule.from) continue;
        car.waterWait = stop;
        waiting++;
      }
      this.queues[edge.key] = waiting;
    }
  },
  // how fast a traffic car may go, coming up to where it is to wait (Infinity: it isn't)
  holdFor(car) {
    if (car.waterWait === null || car.waterWait === undefined) return Infinity;
    const d = (car.waterWait - car.s) * car.dir;
    return Math.sqrt(2 * CONFIG.junction.stopping * Math.max(0, d - 0.3));
  },
  // the share of its cruising speed a traffic car keeps at s: an amphibious one slows as it floats
  pace(car) {
    if (!this.on || classOf(car.kind) !== 'amphibious') return 1;
    return 1 + (W().trafficPace - 1) * Math.min(1, Track.water(car.s) / W().afloat);
  },
};
