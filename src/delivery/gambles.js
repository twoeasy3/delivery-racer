// ============================================================================
// GAMBLES - Gimmick Road 3's gimmicks (see levels.js and CONFIG, each under its own name): things the
// road does that the player can take a risk on, or not. None stops the car and none busts it: each has a
// fast line that pays when it is driven right and costs when it is not, and a slow line that always works.
//   crosswinds   a wind across an exposed stretch: tall cars are pushed harder, a tall vehicle gives shelter
//   crests       (no field: the road's own profile, a segment's grade and ease) a crest sharp enough that a fast
//                car leaves the ground over it: no steering in the air, and it lands on whatever is over the top
//   jamRamps     a car transporter with its ramps down at the back of a queue: fast enough, the car flies the queue
//   lowBridges   a height bar over the player's side, the exit before it the tall vehicles' way round: under the
//                bar a car that fits goes straight on; a taller one takes the knock
//   fords        the road runs through a river, so deep, between an exit and its merge (the side road is the bridge):
//                a car that wades that deep is only slowed; one that does not crawls through, and is damaged
//   cushions     rows of speed cushions, one in the middle of each lane: on a lane line the car goes between two and
//                feels nothing; over one at speed it is thrown up and knocked
//   shade        black ice, which cannot be seen, lies only in the shadow of what stands beside the road: the shaded
//                lanes are empty and icy, the sunny one has the traffic
//   ruts         deep ruts in mud, one down each lane: in a rut the car runs fast and is held to it; getting out is a
//                jolt, and between the ruts it is slow going
//   tarmac       a coned-off lane of fresh tar beside a roadworks queue: empty, and sticky: the longer on it the
//                slower the car, and for a while after
//   spray        a wet stretch where every tall vehicle drags a cloud of spray: in it the player sees next to nothing
//   lowSun       a stretch straight into a low sun: the picture washes out, except in the shadow of a tall vehicle
//                just ahead, a bridge, a tunnel or a row of trees
//   dust         a dry dirt stretch where every vehicle throws a plume that the wind carries to one side: blind in
//                it, clear a lane upwind of it
//   washboards   corrugated dirt: at any speed the wheels hop, the steering shakes and the car is slowed (the faster, the worse)
// What each does is here; render/gambles.js draws it. Like Hazards, this runs after the player's own update
// (Game.update) and puts its hand on the car there: Player itself knows nothing of it.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { CAR } from './cars.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Message } from './messages.js';
import { hurt, sfx } from './physics.js';
import { Game } from './game.js';
import { Hazards } from './hazards.js';
import { Water } from './water.js';
import { Input } from './input.js';

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const spot = {}; // (a point in the world, for Track.toWorld)
const FLAT = { y: 0, slope: 0 };

export const Gambles = {
  winds: [],      // { from, to, dir (-1: it blows to the left, 1: to the right), strength, every, length }
  lee: null,      // the vehicle the player is sheltered by, in a crosswind (null: none)
  windNow: 0,     // m/s^2 the wind is pushing the player's car sideways just now (signed; 0 out of the wind): for the drawing
  said: {},       // what has been said this run, once each
  crests: [],     // { s (its top), from, to (where the road falls away fastest), speed (m/s: faster than this, a car leaves the ground) }
  fly: null,      // the player's car in the air: { vy (m/s up), vx (along the road), latVel, t (s so far), top (m: the highest it got off the ground) }
  alt: 0,         // ...and how high it is, in the world (m)
  ground: null,   // the height of what was under the car last step (null: not known: just set down, or off the expressway)
  slope: 0,       // ...and its slope (rise per m), and where the car was
  lastS: 0,
  flights: 0,     // how many times the car has left the ground this run (for a check)
  ramps: [],      // { s (the foot of its ramps), lane, lat, run, top (m: its lip), queue, lanes: [first, last], last (s of the last car of its queue), clear (s the car must land beyond), speed (m/s that does) }
  onRamp: null,   // the ramp the car is on
  up: 0,          // m the car is above the road, by this file's doing (on a ramp, in the air)
  bars: [],       // low bridges: { s, clearance (m), lo, hi (lat: what it spans), exit (the Track.exits entry that goes round it), hits (times the player's car has hit it this run) }
  fords: [],      // { from, to, depth (m), exit (the Track.exits entry that is its bridge) }
  inFord: null,   // the ford the player's car is in (null: none)
  rows: [],       // speed cushions: { s (a row of them across the lanes), from, to (the stretch it is one of) }
  cushionHits: 0, // how many the player's car has gone over at speed this run (for a check)
  shades: [],     // black ice in the shade: { from, to, side (-1 left, 1 right), first, last (the player's lanes in shadow), lo, hi (lat: the shadow, which is the ice), slick (its entry in Track.slicks) }
  ruts: [],       // { from, to }
  rut: null,      // the rut the player's car is in: { lane, push (s it has been steered against) } (null: in none)
  rutJolts: 0,    // how many times it has climbed out of one this run (for a check)
  tars: [],       // fresh tarmac: { from, to, lane, lo, hi (lat: the lane) }
  tar: 0,         // how much of it is on the player's tyres (0 clean .. 1 as much as they hold)
  wets: [],       // truck spray: { from, to }
  suns: [],       // the low sun: { from, to }
  dusts: [],      // dust trails: { from, to, dir (-1: the wind carries it to the left, 1: to the right) }
  shadow: null,   // the vehicle whose shadow the player is in, in the low sun (null: none; true: a bridge's, a tunnel's, the trees')
  veil: 0,        // how much of the view is gone just now (0 clear .. 1), eased; and what took it: 'spray' | 'sun' | 'dust' | null
  veilOf: null,
  boards: [],     // washboards: { from, to }
  rough: 0,       // how rough the washboard under the player's car is just now (0 .. 1: by its speed; 0 off one)

  // the level's lists (as a level loads, for the drawing, and again as each run starts)
  build() {
    const W = CONFIG.crosswind;
    this.winds = (LEVEL.crosswinds || []).map(w => ({ from: w.from, to: w.to, dir: w.dir === 'left' ? -1 : 1,
      strength: w.strength ?? W.strength, every: w.every ?? W.every, length: w.length ?? W.length }));
    this.buildCrests();
    this.boards = (LEVEL.washboards || []).map(b => ({ from: b.from, to: b.to }));
    // (a low bridge is two bars over the player's side, one over each half of it, the second CONFIG.lowBridge.stagger m on from
    // the first, so the way through is a slalom: the half that is left clear at each. `first: 'right'` puts the right half first)
    this.bars = (LEVEL.lowBridges || []).flatMap((b) => {
      const LB = CONFIG.lowBridge, [first, last] = Track.laneRange(1, b.s), clearance = b.clearance ?? LB.clearance;
      const lo = Track.laneOffset(first, b.s) - CONFIG.laneWidth / 2, mid = (lo + Track.laneOffset(last, b.s) + CONFIG.laneWidth / 2) / 2;
      const exit = Track.exits.find(x => x.exitAt < b.s && x.mergeAt > b.s) || null;
      const halves = [{ lo, hi: mid }, { lo: mid, hi: Track.hi(b.s) }];
      if (b.first === 'right') halves.reverse();
      return halves.map((h, k) => ({ s: b.s + k * LB.stagger, entry: b.s, clearance, lo: h.lo, hi: h.hi, exit, hits: 0 }));
    });
    // (a ford that `fills` is a flooded underpass: its depth is `depth` as the run starts and rises to fills.to over fills.over s)
    this.fords = (LEVEL.fords || []).map((f) => ({ from: f.from, to: f.to, depth: f.depth ?? CONFIG.ford.depth, dry: f.depth ?? CONFIG.ford.depth, fills: f.fills || null, underpass: !!f.underpass, exit: Track.exits.find(x => x.exitAt < f.from && x.mergeAt > f.to) || null }));
    this.rows = [];
    for (const c of LEVEL.cushions || []) for (let s = c.from; s <= c.to; s += c.every ?? CONFIG.cushion.every) this.rows.push({ s, from: c.from, to: c.to });
    this.shades = (LEVEL.shade || []).map((z) => {
      const mid = (z.from + z.to) / 2, [first, last] = Track.laneRange(1, mid), side = z.side === 'left' ? -1 : 1, n = Math.min(last - first + 1, z.lanes ?? CONFIG.shade.lanes), LW = CONFIG.laneWidth;
      const a = side > 0 ? last - n + 1 : first, b = side > 0 ? last : first + n - 1;
      const lo = side > 0 ? Track.laneOffset(a, mid) - LW / 2 : Track.lo(mid), hi = side > 0 ? Track.hi(mid) : Track.laneOffset(b, mid) + LW / 2;
      return { from: z.from, to: z.to, side, first: a, last: b, lo, hi, slick: { from: z.from, to: z.to, lat: (lo + hi) / 2, half: (hi - lo) / 2, shade: true } };
    });
    this.ruts = (LEVEL.ruts || []).map(r => ({ from: r.from, to: r.to }));
    this.tars = (LEVEL.tarmac || []).map((z) => { const c = Track.laneOffset(z.lane, (z.from + z.to) / 2); return { from: z.from, to: z.to, lane: z.lane, lo: c - CONFIG.laneWidth / 2, hi: c + CONFIG.laneWidth / 2 }; });
    this.wets = (LEVEL.spray || []).map(z => ({ from: z.from, to: z.to }));
    this.suns = (LEVEL.lowSun || []).map(z => ({ from: z.from, to: z.to }));
    this.dusts = (LEVEL.dust || []).map(z => ({ from: z.from, to: z.to, dir: z.wind === 'left' ? -1 : 1 }));
    this.ramps = (LEVEL.jamRamps || []).map((r) => {
      const R = CONFIG.jamRamp, [first, last] = Track.laneRange(1, r.s), queue = r.queue ?? R.queue;
      const ramp = { s: r.s, lane: r.lane, lat: Track.laneOffset(r.lane, r.s), run: R.run, top: R.run * Math.tan(R.angle), queue, lanes: r.lanes || [first, last] };
      ramp.last = r.s + R.run + R.gap + (queue - 1) * R.spacing;
      ramp.clear = ramp.last + R.margin;
      ramp.speed = this.rampSpeed(ramp);
      return ramp;
    });
  },
  // where a ramp's queue stands: [{ s, lane }], the last of each lane first (Traffic puts a stopped car at each)
  queueSpots(ramp) {
    const R = CONFIG.jamRamp, spots = [];
    for (let lane = ramp.lanes[0]; lane <= ramp.lanes[1]; lane++) {
      const from = lane === ramp.lane ? ramp.s + R.run + R.gap - 1 : ramp.s;
      for (let s = ramp.last; s >= from; s -= R.spacing) spots.push({ s, lane });
    }
    return spots;
  },
  // the speed (m/s) at the foot of a ramp that, hands off, lands the car beyond its queue
  rampSpeed(ramp) {
    const R = CONFIG.jamRamp, g = CONFIG.crest.gravity, sin = Math.sin(R.angle), dt = 1 / 120;
    for (let v0 = 8; v0 < 90; v0 += 0.25) {
      let v = v0, x = 0;
      while (x < ramp.run && v > 0) { v -= g * sin * dt; x += v * dt; }
      if (v <= 0) continue;
      const vy = v * Math.tan(R.angle), t = (vy + Math.sqrt(vy * vy + 2 * g * ramp.top)) / g;
      if (ramp.s + ramp.run + v * t >= ramp.clear) return v0;
    }
    return 90;
  },
  reset() {
    this.build();
    this.lee = null;
    this.windNow = 0;
    this.said = {};
    this.fly = null;
    Player.rampAhead = false;
    Player.shaken = Player.corrugated = this.rough = 0;
    this.barS = this.rowS = Player.s;
    this.rut = null;
    this.rutJolts = 0;
    this.tar = 0;
    this.veil = 0;
    this.veilOf = null;
    this.shadow = null;
    this.cushionHits = 0;
    this.inFord = null;
    this.up = 0;
    this.onRamp = null;
    this.ground = null;
    this.flights = 0;
    this.lastS = Player.s;
  },
  // An event's vehicles (a police pursuit's two cars, driven from pursuit.js; an ambulance or any other emergency
  // vehicle) are none of a gimmick's business: nothing here slows them, moves them over, takes them off the road
  // or leaves them stuck. They get through or round every one, as the player can
  event(car) { return !!car.driver || !!car.emergency; },
  // traffic is held to `pace` m/s through from..to on the expressway, coming down to it over the CONFIG
  // .gambleApproach m before (whichever way it is going): its speed is capped outright, after its own update
  crawl(car, pace, from, to) {
    if (!car.active || car.junction || this.event(car) || !Track.isMain(car.s)) return;
    const A = CONFIG.gambleApproach, before = car.dir > 0 ? from - car.s : car.s - to;
    if (before > A.reach || (car.dir > 0 ? car.s > to : car.s < from)) return;
    const cap = pace + A.perMetre * Math.max(0, before);
    if (Math.abs(car.vs) > cap) car.vs = Math.sign(car.vs) * cap;
  },
  once(key, ...more) {
    if (this.said[key]) return;
    this.said[key] = true;
    Message.say('events', key, ...more);
  },

  // ---- crosswinds -------------------------------------------------------------------------------------
  // the crosswind over s, if any (on the expressway only)
  wind(s) { return Track.isMain(s) ? this.winds.find(w => s >= w.from && s <= w.to) || null : null; },
  // how hard it is blowing just now, as a share of its strength: `lull` between gusts, 1 in one
  gust(w, t = Game.time) {
    const W = CONFIG.crosswind, u = ((t % w.every) + w.every) % w.every;
    const g = u < w.length ? clamp01(Math.min(u, w.length - u) / W.rise) : 0;
    return W.lull + (1 - W.lull) * g;
  },
  // the push on a vehicle `height` m tall in it, out in the open (m/s^2, signed: + = to the right)
  windPush(w, height, t) {
    const W = CONFIG.crosswind;
    return w.dir * w.strength * this.gust(w, t) * Math.pow(height / W.heightRef, W.heightPower);
  },
  // the vehicle sheltering v from the wind w: a tall one alongside it, close by on the windward side
  shelter(w, v) {
    const W = CONFIG.crosswind;
    for (const car of Traffic.cars) {
      if (!car.active || car === v || car.junction || !Track.isMain(car.s)) continue;
      if (car.height < W.leeHeight || car.height < v.height) continue;
      if (Math.abs(car.s - v.s) > car.hl + v.hl * 0.5) continue;
      const across = (car.lat - v.lat) * -w.dir; // (m it is to windward)
      if (across > 0 && across < W.leeReach) return car;
    }
    return null;
  },
  updateWinds(dt) {
    const W = CONFIG.crosswind, P = Player;
    const w = P.active ? this.wind(P.s) : null;
    this.windNow = 0;
    if (w) {
      this.once('crosswind');
      const lee = this.shelter(w, P), open = this.windPush(w, P.height);
      // (out of a tall vehicle's lee: the wind is back all at once, with a shove)
      if (this.lee && !lee && !P.busted) { P.latVel += w.dir * W.shove * this.gust(w) * Math.pow(P.height / W.heightRef, W.heightPower); sfx('wave', 0.25); }
      this.lee = lee;
      this.windNow = open * (lee ? W.lee : 1);
      if (!P.busted && P.ghost <= 0 && !(P.tank > 0)) P.latVel += this.windNow * dt; // (a ghost, and a tank, feel nothing)
    } else this.lee = null;
    // the traffic in it drifts a little in its lanes (and leans: render/gambles.js)
    if (!this.winds.length) return;
    for (const car of Traffic.cars) {
      if (!car.active || car.junction || car.parked || car.spin > 0) continue;
      const cw = this.wind(car.s);
      if (cw) car.latVel += this.windPush(cw, car.height) * W.traffic * dt;
    }
  },

  // ---- leaving the ground: crests (and whatever else stands on the road to be driven up) ---------------------
  // The car follows the ground until the ground falls away under it faster than gravity can pull the car down
  // after it: then it flies, on the arc it left on (CONFIG.crest.gravity, the game's own, as the drawbridge's),
  // with no throttle, brake or steering, and comes down on whatever is there. All of it from the road's own
  // profile (Track's heights: a level's segments, their grade and ease), so a crest needs nothing placed on it.
  // the road's height at s (m, in the world), and its slope there (rise per m, over the 4 m about s)
  roadY(s) { Track.toWorld(s, 0, spot); return spot.y; },
  roadSlope(s) { return (this.roadY(s + 2) - this.roadY(s - 2)) / 4; },
  // what stands on the road at (s, lat) to be driven up: { y: m above the road, slope }: the ramp the car is on
  extra(s) {
    const r = this.onRamp;
    return r && s >= r.s && s < r.s + r.run ? { y: (s - r.s) * r.top / r.run, slope: r.top / r.run } : FLAT;
  },
  // a transporter's ramps: on at their foot, in line with them; off the lip at the top, or off the side. Beside
  // it, the car is kept out of its trailer (pushed aside: no damage)
  rideRamps() {
    const P = Player, R = CONFIG.jamRamp;
    if (this.onRamp && (P.s < this.onRamp.s || P.s >= this.onRamp.s + this.onRamp.run || Math.abs(P.lat - this.onRamp.lat) > R.half + 0.4)) this.onRamp = null;
    P.rampAhead = !!this.onRamp || !!this.fly;
    for (const r of this.ramps) {
      if (P.active && P.s > r.s - R.sign * 1.6 && P.s < r.s) this.once('jamAhead');
      if (P.s > r.s - R.commit && P.s < r.s + R.foot && Math.abs(P.lat - r.lat) <= R.half) P.rampAhead = true;
      if (P.s < r.s || P.s > r.s + r.run + R.cab || this.onRamp === r) continue;
      const across = P.lat - r.lat;
      if (!this.fly && P.s < r.s + R.foot && Math.abs(across) <= R.half) { this.onRamp = r; this.once('jamRamp'); }
      else if (this.up < 0.6 && Math.abs(across) < R.half + P.hw) { P.lat = r.lat + (across < 0 ? -1 : 1) * (R.half + P.hw); P.latVel = 0; }
    }
    // a siren coming up behind clears the jam: with a pursuit's cars or an emergency vehicle within `release` m of
    // its back, the queue drives off as ordinary traffic (the transporter stays where it is). So nothing with a
    // siren is ever left standing behind it
    for (const r of this.ramps) {
      if (r.released || !Traffic.cars.some(car => car.active && car.dir > 0 && this.event(car) && Track.isMain(car.s) && car.s > r.s - R.release && car.s < r.last)) continue;
      r.released = true;
      for (const car of Traffic.cars) {
        if (!car.active || !car.jam || car.s < r.s - 5 || car.s > r.last + 20) continue;
        Object.assign(car, { jam: false, fixed: false, baseSpeed: car.jamPace || CONFIG.trafficMinSpeed + 4 });
      }
      if (P.active && Math.abs(P.s - r.s) < 500) this.once('jamCleared');
    }
    // (nothing queues behind it: traffic coming up its lane moves over well before, so its ramps stay clear)
    for (const r of this.ramps) {
      if (Math.abs(r.s - P.s) > 700) continue;
      for (const car of Traffic.cars) {
        if (!car.active || car.dir < 0 || car.s > r.s + r.run + R.cab || car.s < r.s - R.keepClear || !Track.isMain(car.s)) continue;
        if (car.driver) { // (a pursuit's car picks its own lane, by what it sees ahead, and the transporter is no car: it is steered off its lane, and kept out of it)
          const side = car.lat < r.lat ? -1 : 1, clear = R.half + car.hw + 0.3;
          if (Math.abs((car.aimLat ?? car.lat) - r.lat) < clear) car.aimLat = r.lat + side * CONFIG.laneWidth;
          if (car.s > r.s - 3 && Math.abs(car.lat - r.lat) < R.half + car.hw) { car.lat = r.lat + side * (R.half + car.hw); car.latVel = 0; }
          continue;
        }
        if (car.fixed || car.lane !== r.lane || car.s > r.s + r.run) continue;
        const [first, last] = Track.laneRange(1, car.s), other = r.lane > first ? r.lane - 1 : r.lane + 1;
        if (other > last) continue;
        car.lane = other;
        car.pendingLane = null;
        car.signal = other - r.lane;
      }
    }
  },
  // the crests of the loaded level: every place where the road falls away fast enough that a car at
  // CONFIG.crest.fastest or less would leave the ground, with the speed that does it
  buildCrests() {
    const C = CONFIG.crest, need = C.gravity / (C.fastest * C.fastest);
    this.crests = [];
    if (!Track || !Track.hilly) return;
    let run = null;
    for (let s = 4; s < Track.length - 4; s += 2) {
      const bend = -(this.roadSlope(s + 2) - this.roadSlope(s - 2)) / 4; // (how fast the slope is falling, per m)
      if (bend > need) {
        if (!run) run = { from: s, to: s, most: 0 };
        run.to = s;
        run.most = Math.max(run.most, bend);
      } else if (run) { this.crests.push({ s: (run.from + run.to) / 2, from: run.from, to: run.to, speed: Math.sqrt(C.gravity / run.most) }); run = null; }
    }
  },
  // how blind the road ahead of s is: 0 .. 1, coming up to a crest a garage car can fly (the camera comes
  // down behind the car, so the far side stays hidden until the car is over the top: render/scene.js)
  blind(s) {
    const C = CONFIG.crest;
    let most = 0;
    if (!this.crests.length || !Track.isMain(s)) return 0;
    for (const c of this.crests) {
      if (c.speed > C.signUnder) continue;
      most = Math.max(most, smooth((s - (c.from - C.camFrom)) / C.camEase) * (1 - smooth((s - c.s) / C.camEase)));
    }
    return most;
  },
  updateFlight(dt) {
    const P = Player, C = CONFIG.crest;
    if (Hazards.jump) { this.fly = null; this.ground = null; return; } // (off a drawbridge's leaf: Hazards has it)
    if (!P.active || CAR.noWheels || !Track.isMain(P.s) || Math.abs(P.s - this.lastS) > 30) { // (no car, one with no wheels (the UFO, the boat), a side road, or set down somewhere else)
      this.fly = null;
      this.ground = null;
      this.lastS = P.s;
      return;
    }
    if (this.fly) { // (in the air there is nothing to push against, brake on or steer with)
      const F = this.fly;
      P.s -= (P.speed - F.vx) * dt;
      P.speed = F.vx;
      P.lat = Math.max(Track.lo(P.s) + P.hw, Math.min(Track.hi(P.s) - P.hw, P.lat + (F.latVel - P.latVel) * dt));
      P.latVel = F.latVel;
    }
    const wasOn = this.onRamp;
    this.rideRamps();
    if (wasOn && !this.onRamp) this.up = 9; // (off its lip, or its side, this step: up in the air until the flight below says otherwise)
    const road = this.roadY(P.s), ex = this.extra(P.s, P.lat), slope = this.roadSlope(P.s) + ex.slope, ground = road + ex.y;
    const live = P.shield <= 0 && P.ghost <= 0 && P.tank <= 0;
    // off the ground: where the slope has dropped away since the last step by more than gravity makes up for
    if (!this.fly && this.ground !== null && P.speed * (this.slope - slope) - C.gravity * dt > C.slack) {
      this.fly = { vy: P.speed * this.slope, vx: P.speed, latVel: P.latVel, t: 0, top: 0 };
      this.alt = Math.max(ground, this.ground + this.fly.vy * dt);
    }
    this.lastS = P.s;
    if (this.fly) {
      const F = this.fly;
      F.vy -= C.gravity * dt;
      this.alt += F.vy * dt;
      F.t += dt;
      if (this.alt > ground) {
        P.air = this.up = this.alt - road;
        P.pitch = Math.atan2(F.vy, Math.max(P.speed, 6)) - Math.atan(Track.grade(P.s)); // (its nose the way it is flying: main.js adds the road's own slope)
        if (F.top <= C.hop && this.alt - ground > C.hop) this.flights++;
        F.top = Math.max(F.top, this.alt - ground);
        if (F.t > C.sayAfter && F.top > C.hop) this.once('airborne');
        return;
      }
      // down: hard, if it came down into the ground faster than landSoft
      const into = P.speed * slope - F.vy;
      if (F.top > C.hop) {
        if (live && into > C.landSoft) hurt(P, (into - C.landSoft) * C.landDamage);
        Game.shake = Math.max(Game.shake, Math.min(1, into / 14));
        sfx('drop', Math.min(1, into / 10));
      }
      this.fly = null;
    }
    this.ground = ground;
    this.slope = slope;
    this.up = ex.y;
    if (ex.y || ex.slope) { // (up a ramp: the climb takes some of its speed)
      P.air = ex.y;
      P.pitch = Math.atan(ex.slope);
      P.speed = Math.max(CONFIG.jamRamp.crawl, P.speed - C.gravity * Math.sin(P.pitch) * dt); // (never to a stand on it: the slowest car still crawls off its lip)
    }
  },

  // ---- washboard dirt ------------------------------------------------------------------------------------
  // Corrugations right across the road. On them the wheels hop, at any speed and the faster the worse: the steering
  // takes less (Player.shaken: see Player's steering), the car wanders, in a bend it is carried to the outside; and
  // the car is slowed (Player.corrugated: Player's updateSpeed holds it to CONFIG.washboard.most and drags a faster
  // one down to that). Never stopped. The gamble: straight across costs speed and some say over the line, a lane or
  // shoulder it does not reach (or the way round) costs the time
  board(s) { return Track.isMain(s) ? this.boards.find(b => s >= b.from && s <= b.to) || null : null; },
  // how rough a washboard is at v m/s: 0 (standing still) .. 1 (at CONFIG.washboard.full or more)
  roughness(v) {
    const B = CONFIG.washboard;
    return v <= 0 ? 0 : Math.min(1, v / B.full) ** B.shape;
  },
  updateBoards(dt) {
    const B = CONFIG.washboard, P = Player;
    const b = P.active && !this.fly && !CAR.noWheels && P.ghost <= 0 && !(P.tank > 0) ? this.board(P.s) : null;
    if (P.active && this.board(P.s)) this.once('washboard');
    this.rough = b ? this.roughness(P.speed) : 0;
    P.corrugated = b ? 1 : 0;
    P.shaken = B.steerLoss * this.rough;
    if (!this.rough || P.busted) return;
    const t = Game.time, r = this.rough;
    P.latVel += B.wander * r * (Math.sin(t * 2.3) + Math.sin(t * 3.9 + 1.7)) * dt; // (hopping about)
    P.latVel -= Math.sign(Track.bend(P.s)) * Math.min(B.slideMost, Math.abs(Track.bend(P.s)) * P.speed * P.speed * B.slide) * r * dt; // (and wide in a bend)
    Game.shake = Math.max(Game.shake, B.shake * r);
    if ((this.boardSound = (this.boardSound || 0) - dt) <= 0) { this.boardSound = B.soundEvery; sfx('gravel', 0.5 * r); }
  },

  // ---- low bridges ---------------------------------------------------------------------------------------
  // (A bridge is two bars, each over a half of that side, the second further on: see build.) A height bar over the player's side of the road (and its shoulder), `clearance` m off it, between an exit
  // and its merge: the side road is the tall vehicles' way round, and tall traffic takes it. A car no taller
  // than the bar goes under; a taller one that goes at it anyway takes the knock (health, by how much too tall,
  // and most of its speed) and is through: it is never stopped. The oncoming side is not barred
  fits(bar, height = Player.height) { return height <= bar.clearance; },
  updateBars() {
    const L = CONFIG.lowBridge, P = Player, was = this.barS ?? P.s;
    this.barS = P.s;
    for (const bar of this.bars) {
      const from = (bar.exit ? bar.exit.exitAt : bar.s) - L.warn;
      if (P.active && Track.isMain(P.s) && P.s > from && P.s < bar.entry && !this.said['bar' + bar.entry]) {
        this.said['bar' + bar.entry] = true;
        const line = Message.say('events', this.fits(bar) ? 'lowBridgeFits' : 'lowBridgeTall');
        if (line) line.text += ' (' + P.height.toFixed(1) + ' m under ' + bar.clearance.toFixed(1) + ' m)';
      }
      // (tall traffic is not troubled by a bar, and troubles nobody: it goes straight through, whatever lane it is in)
      if (!P.active || !Track.isMain(P.s) || !(was < bar.s && P.s >= bar.s) || P.s - was > 30) continue;
      if (P.lat + P.hw < bar.lo || P.lat - P.hw > bar.hi || this.fits(bar, P.height + P.air) || P.ghost > 0) continue;
      bar.hits++;
      if (P.tank > 0) { sfx('crash', 0.6); continue; } // (a tank takes the bar with it)
      if (P.shield <= 0) hurt(P, L.damage + L.perMetre * (P.height + P.air - bar.clearance));
      P.speed *= L.keep;
      Game.shake = 1;
      sfx('crash', 1);
      Message.say('events', 'lowBridgeHit');
    }
  },

  // ---- fords ---------------------------------------------------------------------------------------------
  // The road runs through a river, `depth` m deep, between an exit and its merge: the side road is the bridge.
  // What a car wades is its `crossing` (cars.js): CONFIG.ford.shallow m for the worst, .deepest m for the best.
  // In water no deeper than that it is only slowed, the less the shallower (to `fast` m/s in next to none, `slow`
  // at its limit); in deeper it crawls (`crawl` m/s: never stopped) and is damaged for as long as it is in. A car
  // that floats, a ghost and a tank are not troubled
  wades(crossing = Player.crossing) { const F = CONFIG.ford; return F.shallow + (F.deepest - F.shallow) * crossing; },
  ford(s) { return Track.isMain(s) ? this.fords.find(f => s >= f.from && s <= f.to) || null : null; },
  // the fastest a car that wades `limit` m goes through water `depth` m deep (m/s)
  fordPace(depth, limit) { const F = CONFIG.ford; return depth > limit ? F.crawl : F.fast + (F.slow - F.fast) * depth / limit; },
  // how deep a ford is `time` s into the run: its own depth, or, filling, on its way up to fills.to
  fordDepth(f, time = Game.time) { return f.fills ? f.dry + (f.fills.to - f.dry) * clamp01(time / f.fills.over) : f.dry; },
  updateFords(dt) {
    const F = CONFIG.ford, P = Player;
    for (const f of this.fords) {
      f.depth = this.fordDepth(f);
      const from = (f.exit ? f.exit.exitAt : f.from) - F.warn;
      if (P.active && Track.isMain(P.s) && P.s > from && P.s < f.from && !this.said['ford' + f.from]) {
        this.said['ford' + f.from] = true;
        const line = Message.say('events', (f.fills ? 'flood' : 'ford') + (f.depth <= this.wades() ? 'Fits' : 'Deep'));
        if (line) line.text += ' (' + f.depth.toFixed(1) + ' m deep' + (f.fills && f.depth < f.fills.to ? ' and rising' : '') + ': this car wades ' + this.wades().toFixed(1) + ' m)';
      }
    }
    for (const car of Traffic.cars) { // (the traffic wades through slowly)
      for (const f of this.fords) this.crawl(car, F.traffic, f.from, f.to);
    }
    const f = P.active && !this.fly && !CAR.noWheels && !Water.floats(CAR) && P.ghost <= 0 && !(P.tank > 0) ? this.ford(P.s) : null;
    if (f && !this.inFord) { sfx('waveCrash', Math.min(1, P.speed / 25)); Game.shake = Math.max(Game.shake, 0.5); }
    this.inFord = f;
    if (!f) return;
    const limit = this.wades(), pace = this.fordPace(f.depth, limit);
    if (P.speed > pace) P.speed = Math.max(pace, P.speed - F.bite * dt);
    if (f.depth > limit) {
      if (P.shield <= 0) P.health -= F.damage * (f.depth - limit) * P.damageScale * dt;
      Game.shake = Math.max(Game.shake, 0.2);
      this.once('fordStuck');
    }
  },

  // ---- speed cushions --------------------------------------------------------------------------------------
  // A row across the road every so often, a cushion in the middle of each lane and a gap on each lane line (the
  // shoulders have none: their own rules apply). A car whose middle is within its `line` of a lane line goes
  // through a gap and feels nothing (a wider car has less room: see cushionRoom). Over a cushion at CONFIG
  // .cushion.soft m/s or less it is a bump; faster, the car is thrown up (no steering until it is down: the
  // flight above) and knocked, by how much faster. Traffic takes the stretch at a crawl
  // how far (m) the car's middle may be from a lane line and still go between two cushions
  cushionRoom(hw = Player.hw) { const K = CONFIG.cushion; return Math.max(K.least, K.line - (hw - K.hwRef)); },
  // whether a car at lat, crossing a row at s, goes over a cushion (in a lane, not within its room of a lane line)
  onCushion(s, lat, hw = Player.hw) {
    if (lat < Track.laneLo(s) || lat > Track.laneHi(s)) return false; // (on a shoulder)
    const centre = Track.laneOffset(Track.nearestLane(lat, s), s);
    return CONFIG.laneWidth / 2 - Math.abs(lat - centre) > this.cushionRoom(hw);
  },
  updateCushions(dt) {
    const K = CONFIG.cushion, P = Player, was = this.rowS ?? P.s;
    this.rowS = P.s;
    if (!this.rows.length) return;
    for (const car of Traffic.cars) { // (the traffic takes them slowly)
      for (const c of LEVEL.cushions || []) this.crawl(car, K.traffic, c.from, c.to);
    }
    if (!P.active || !Track.isMain(P.s) || P.s - was > 30) return;
    if (this.rows.some(r => P.s > r.from - K.sign && P.s < r.from)) this.once('cushions');
    if (this.fly || CAR.noWheels || P.ghost > 0) return;
    for (const row of this.rows) {
      if (!(was < row.s && P.s >= row.s) || !this.onCushion(row.s, P.lat)) continue;
      const over = P.speed - K.soft;
      Game.shake = Math.max(Game.shake, over > 0 ? 0.8 : 0.25);
      sfx('drop', over > 0 ? 0.9 : 0.3);
      if (over <= 0 || P.tank > 0) continue;
      this.cushionHits++;
      if (P.shield <= 0) hurt(P, K.damage + K.perSpeed * over);
      P.speed *= K.keep;
      this.fly = { vy: Math.min(K.throwMost, K.throw * over), vx: P.speed, latVel: P.latVel, t: 0, top: 0 }; // (thrown up: no steering until it is down)
      this.alt = this.roadY(P.s) + 0.01;
      this.once('cushionHit');
    }
  },

  // ---- black ice in the shade -----------------------------------------------------------------------------
  // Where something tall beside the road shades it, the lanes in its shadow are black ice: nothing of the ice
  // is drawn, only the shadow, and it is ice in every way (see CONFIG.ice and Track.icy: its patch is one of
  // Track.slicks). Traffic knows, and moves out of the shaded lanes into the sun before it where it can: the
  // shade is empty, the sunny lane is where the queue is
  shadeAt(s, lat) { return Track.isMain(s) ? this.shades.find(z => s >= z.from && s <= z.to && lat >= z.lo && lat <= z.hi) || null : null; },
  updateShade() {
    const Z = CONFIG.shade, P = Player;
    for (const z of this.shades) {
      if (!Track.slicks.includes(z.slick)) Track.slicks.push(z.slick); // (Game.start clears that list as a run starts)
      if (P.active && Track.isMain(P.s) && P.s > z.from - Z.warn && P.s < z.from) this.once('blackIce');
      if (P.onIce && this.shadeAt(P.s, P.lat) === z) P.shaken = Math.max(P.shaken, Z.steerLoss); // (black ice: less to steer with even than on ice that shows)
      if (Math.abs(z.from - P.s) > 700) continue;
      const [first, last] = Track.laneRange(1, (z.from + z.to) / 2), sunny = z.side > 0 ? z.first - 1 : z.last + 1;
      if (sunny < first || sunny > last) continue; // (every lane is in the shade)
      for (const car of Traffic.cars) {
        if (!car.active || car.fixed || this.event(car) || car.dir < 0 || car.lane < z.first || car.lane > z.last || car.s > z.to || car.s < z.from - Z.keepClear || !Track.isMain(car.s)) continue;
        car.signal = sunny - car.lane;
        car.lane = sunny;
        car.pendingLane = null;
      }
    }
  },

  // ---- ruts -----------------------------------------------------------------------------------------------
  // A stretch of deep mud with a rut down the middle of every lane. In a rut (within CONFIG.rut.half m of a
  // lane's middle) the going is firm: the car runs at its own pace and is held to the rut, hands off or steered.
  // To get out it has to be steered against for `climb` s; then it comes out with a jolt (health, some speed, a
  // lurch to that side) into the mud between, where it is slowed (the less, the better it crosses rough ground)
  // until it drops into the next rut, which costs nothing. Before the stretch any lane can be picked freely
  rutted(s) { return Track.isMain(s) ? this.ruts.find(r => s >= r.from && s <= r.to) || null : null; },
  updateRuts(dt) {
    const R = CONFIG.rut, P = Player;
    if (!this.ruts.length) return;
    for (const car of Traffic.cars) { // (the traffic keeps to its ruts, at a tractor's pace)
      if (!car.active || car.junction || this.event(car) || !this.rutted(car.s)) continue;
      for (const r of this.ruts) this.crawl(car, R.traffic, r.from, r.to);
      car.pendingLane = null;
    }
    if (P.active && Track.isMain(P.s) && this.ruts.some(r => P.s > r.from - R.sign && P.s < r.from)) this.once('ruts');
    const z = P.active && !this.fly && !CAR.noWheels && P.ghost <= 0 && !(P.tank > 0) && !P.busted ? this.rutted(P.s) : null;
    if (!z || P.lat < Track.laneLo(P.s) || P.lat > Track.laneHi(P.s)) { this.rut = null; return; }
    const lane = Track.nearestLane(P.lat, P.s), centre = Track.laneOffset(lane, P.s), off = P.lat - centre;
    if (!this.rut && Math.abs(off) <= R.half) { // (down into one)
      this.rut = { lane, push: 0 };
      Game.shake = Math.max(Game.shake, 0.3);
      sfx('drop', 0.3);
    }
    if (this.rut && this.rut.lane !== lane) this.rut = null;
    if (!this.rut) { // in the mud between two: slow going
      if (CAR.trait === 'mud') return; // (the Rally Car is at home in it)
      const pace = R.mud + (R.mudBest - R.mud) * P.crossing;
      if (P.speed > pace) P.speed = Math.max(pace, P.speed - R.bite * dt);
      Game.shake = Math.max(Game.shake, 0.15);
      return;
    }
    const steer = Input.steer;
    this.rut.push = steer ? this.rut.push + dt : 0;
    if (steer && this.rut.push >= R.climb) { // out of it, with a jolt
      const side = Math.sign(steer);
      this.rut = null;
      this.rutJolts++;
      P.lat = centre + side * (R.half + 0.15);
      P.latVel = side * R.lurch;
      P.yawVel += side * R.yaw;
      P.speed *= R.keep;
      if (P.shield <= 0) hurt(P, R.damage);
      Game.shake = Math.max(Game.shake, 0.7);
      sfx('drop', 0.8);
      this.once('rutOut');
      return;
    }
    // held to it: back to its middle, whatever the steering asks
    P.lat = centre + off * Math.max(0, 1 - R.hold * dt);
    P.latVel = 0;
  },

  // ---- fresh tarmac ---------------------------------------------------------------------------------------
  // Roadworks: one lane of the player's side is new tar, coned off, and the traffic queues past it in the others
  // at a crawl. Nothing is on the tar and nothing stops a car driving on it, but it sticks: tar builds up on the
  // tyres for as long as the car is on it (all they hold in CONFIG.tarmac.fill s) and wears off again only off
  // it (`clean` s from full), and the car's top speed is down by `slow` of itself with the tyres full: slower
  // than the queue. So it pays in short hops, and costs for a while after a long one
  onTar(s, lat) { return Track.isMain(s) ? this.tars.find(z => s >= z.from && s <= z.to && lat >= z.lo && lat <= z.hi) || null : null; },
  tarPace(tar = this.tar) { return CAR.maxSpeed * (1 - CONFIG.tarmac.slow * tar); },
  updateTar(dt) {
    const T = CONFIG.tarmac, P = Player;
    if (!this.tars.length) return;
    for (const z of this.tars) {
      if (Math.abs(z.from - P.s) > 800 && Math.abs(z.to - P.s) > 800) continue;
      const [first, last] = Track.laneRange(1, (z.from + z.to) / 2), other = z.lane > first ? z.lane - 1 : z.lane + 1;
      for (const car of Traffic.cars) { // (the traffic keeps off it, and crawls past it)
        if (!car.active || car.dir < 0 || car.junction || this.event(car) || !Track.isMain(car.s) || car.s > z.to || car.s < z.from - T.keepClear) continue;
        if (car.lane === z.lane && !car.fixed && other <= last) { car.signal = other - car.lane; car.lane = other; car.pendingLane = null; }
        this.crawl(car, T.queue, z.from, z.to);
      }
      if (P.active && Track.isMain(P.s) && P.s > z.from - T.sign && P.s < z.from) this.once('tarAhead');
    }
    const on = P.active && !this.fly && !CAR.noWheels && P.ghost <= 0 && !(P.tank > 0) ? this.onTar(P.s, P.lat) : null;
    this.tar = Math.max(0, Math.min(1, this.tar + (on ? dt / T.fill : -dt / T.clean)));
    if (on) { this.once('tarOn'); Game.shake = Math.max(Game.shake, 0.08 + 0.1 * this.tar); }
    if (this.tar <= 0 || P.ghost > 0 || P.tank > 0) return;
    const pace = this.tarPace();
    if (P.speed > pace) P.speed = Math.max(pace, P.speed - T.bite * dt);
  },

  // ---- what cannot be seen through: truck spray -------------------------------------------------------------
  // Nothing here touches the car: only what the player can see of the road (render/gambles.js lays a veil over
  // the picture, all but the car and the few metres before it, by Gambles.veil).
  // how deep the point (s, lat) is in the cloud a vehicle drags behind it: 0 (out of it) .. 1 (at its tail).
  // The cloud is `length` m long and `half` m either side of the vehicle's line, a little wider further back
  // (`drift`: m it is carried sideways by its far end)
  cloud(car, s, lat, length, half, drift = 0) {
    const d = car.dir > 0 ? car.s - car.hl - s : s - car.s - car.hl; // (m behind its tail)
    if (d < 0 || d > length) return 0;
    const u = d / length;
    return Math.abs(lat - car.lat - drift * u) <= half + u ? 1 - u : 0;
  },
  // what shades the player's car from a low sun dead ahead: a vehicle CONFIG.lowSun.height m tall or more just ahead
  // in its line (its shadow reaches back `shadow` m for each m of its height), a bridge or a tunnel over the road,
  // or the trees of a shade (see above). The vehicle, or true; null in the open
  shaded() {
    const L = CONFIG.lowSun, P = Player;
    if (Track.tunnel(P.s) || Track.onBridge(P.s) || this.shadeAt(P.s, P.lat)) return true;
    for (const car of Traffic.cars) {
      if (!car.active || car.junction || car.height < L.height || !Track.isMain(car.s)) continue;
      const d = car.s - car.hl - P.s - P.hl;
      if (d > -2 && d < L.shadow * car.height && Math.abs(car.lat - P.lat) < car.hw + L.beside) return car;
    }
    return null;
  },
  // a dusty stretch: every moving vehicle, whatever its size and whichever way it is going, throws a plume
  // CONFIG.dust.length m long at speed, which the wind carries `drift` m to its side by its far end
  dusty(s) { return Track.isMain(s) ? this.dusts.find(z => s >= z.from && s <= z.to) || null : null; },
  plumes(car) { return car.active && !car.junction && !car.noWheels && Math.abs(car.vs) > CONFIG.dust.slowest ? this.dusty(car.s) : null; },
  plumeLength(car) { return CONFIG.dust.length * Math.min(1, Math.abs(car.vs) / CONFIG.dust.fullAt); },
  wet(s) { return Track.isMain(s) ? this.wets.find(z => s >= z.from && s <= z.to) || null : null; },
  // a wet stretch: every vehicle CONFIG.spray.height m tall or more that is moving drags a cloud of spray, as
  // long as CONFIG.spray.length m at speed. In it the view is gone, the nearer its tail the more
  sprays(car) { return car.active && !car.junction && car.height >= CONFIG.spray.height && Math.abs(car.vs) > CONFIG.spray.slowest && !!this.wet(car.s); },
  sprayLength(car) { return CONFIG.spray.length * Math.min(1, Math.abs(car.vs) / CONFIG.spray.fullAt); },
  updateVeil(dt) {
    const V = CONFIG.veil, S = CONFIG.spray, P = Player;
    let want = 0, of = null;
    if (P.active && Track.isMain(P.s)) {
      if (this.wets.some(z => P.s > z.from - S.sign && P.s < z.to)) this.once('spray');
      if (this.wets.length && this.wet(P.s)) {
        for (const car of Traffic.cars) {
          if (!this.sprays(car)) continue;
          const deep = this.cloud(car, P.s, P.lat, this.sprayLength(car), car.hw + S.spread) * S.most;
          if (deep > want) { want = deep; of = 'spray'; }
        }
      }
      // the low sun: dead ahead over the stretch (easing in and out over its ends), unless something shades the car
      const sun = this.suns.find(z => P.s >= z.from && P.s <= z.to);
      if (this.suns.some(z => P.s > z.from - CONFIG.lowSun.sign && P.s < z.to)) this.once('lowSun');
      this.shadow = sun ? this.shaded() : null;
      if (sun && !this.shadow) {
        const L = CONFIG.lowSun, glare = L.most * Math.min(1, (P.s - sun.from) / L.edge, (sun.to - P.s) / L.edge);
        if (glare > want) { want = glare; of = 'sun'; }
      }
      // dust: in the plume of anything ahead (or of anything that has just gone by the other way)
      if (this.dusts.some(z => P.s > z.from - CONFIG.dust.sign && P.s < z.to)) this.once('dust');
      if (this.dusts.length && this.dusty(P.s)) {
        const D = CONFIG.dust;
        for (const car of Traffic.cars) {
          const z = this.plumes(car);
          if (!z) continue;
          const deep = this.cloud(car, P.s, P.lat, this.plumeLength(car), car.hw + D.spread, z.dir * D.drift) * D.most;
          if (deep > want) { want = deep; of = 'dust'; }
        }
      }
    } else this.shadow = null;
    if (want > 0) this.veilOf = of;
    this.veil += (want - this.veil) * Math.min(1, dt * (want > this.veil ? V.close : V.clear));
    if (this.veil < 0.004 && !want) { this.veil = 0; this.veilOf = null; }
  },

  update(dt) {
    if (Traffic.frozen) return; // (TRAFFIC FREEZE, a mystery: everything here stands still too)
    this.updateFlight(dt);
    this.updateCushions(dt);
    this.updateFords(dt);
    this.updateBars();
    this.updateBoards(dt);
    this.updateShade(); // (after the washboard's: both have a say in Player.shaken)
    this.updateRuts(dt);
    this.updateTar(dt);
    this.updateVeil(dt);
    this.updateWinds(dt);
  },
};
