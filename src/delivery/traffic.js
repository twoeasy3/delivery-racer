import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp, damp } from './util.js';
import { Track } from './track.js';
import { updateYaw, keepOnRoad, emotionOf, startRivalry, spinOut, sfxAt, cornerSpeed, weightOf } from './physics.js';
import { Player } from './player.js';
import { Packages } from './packages.js';
import { CARS, LEVEL_CARS, CAR } from './cars.js';
import { Message } from './messages.js';
import { Tide } from './tide.js';
import { Wreckage } from './wreckage.js';
import { Game, sayRival } from './game.js';
import { Social } from './social.js';
import { Collision } from './collision.js';
import { Pickups } from './pickups.js';
import { Gunfire } from './gunfire.js';
import { Crossings } from './crossing.js';
import { StopGo } from './stopgo.js';
import { Water } from './water.js';
import { Hazards } from './hazards.js';
import { Gambles } from './gambles.js';
import { Radiation } from './radiation.js';

// ---- traffic ---------------------------------------------------------------
// One pool of cars recycled ahead of the player: some northbound (the player's way), the
// rest southbound (oncoming), or all one way on a level with a "flow". Set when a run starts.
// Cars hold a lane with a spring, so they can be shoved around and then recover.
// Morality is fixed per car: evil cars throw packages at the road, good cars never do.
// Emotion changes with what happens to the car: angry cars drift into the player's lane
// and won't brake for the player, happy ones clear the lane, neutral ones ignore the player.
export const Traffic = (() => {
  const cars = [];
  for (let i = 0; i < CONFIG.trafficPool; i++) {
    // bound: 'north' is the way the player is going, 'south' is oncoming. It never changes
    // during a run (reset() deals the directions out again for the level being started, and
    // marks the cars beyond the level's counts unused).
    const north = i < CONFIG.trafficCount;
    cars.push({ active: false, unused: false, dir: north ? 1 : -1, bound: north ? 'north' : 'south', mass: 1,
      s: 0, lat: 0, vs: 0, latVel: 0, yaw: 0, yawVel: 0, stun: 0,
      lane: 0, baseSpeed: 0, kind: 'commuter', evil: false, emotion: 'neutral', mood: 0, paint: 0, think: 0, honkWait: 0,
      health: 1, maxHealth: 1, smoke: 0, hw: 1, hl: 2.1, height: 1.4,
      braking: false, signal: 0, hazards: false, pendingLane: null, hesitant: false, fromBehind: false });
  }
  // A slot dealt out again is a new vehicle, and a new run starts with new slots. Dozens of things are set on a
  // vehicle as they are first used, here and in other files (hunt, shoulderRun, oncoming, boosts, spinIce, hitBy,
  // a pursuit's aimLat...), and a list of them kept by hand in outfit() was always one behind: a car dealt out of
  // a wrecked hunter's slot started out hunting, and two runs from one seed differed. So blank() puts back
  // EVERYTHING a slot carries, whoever set it: to what a new slot has, or to nothing (as on a new slot, where it
  // was never set). Only what the dealer sets before outfit() is kept: where it is and which way it goes.
  const DEALT = ['active', 'unused', 'dir', 'bound', 's', 'rush'];
  const BLANK = Object.fromEntries(Object.entries({ ...cars[0], respawnIn: 0, fixed: false }).filter(([key]) => !DEALT.includes(key)));
  const blank = (car) => { for (const key in car) if (!DEALT.includes(key)) car[key] = BLANK[key]; };

  // ramps: the expressway's shoulder is the exit / merge lane there, lane index -1 on the
  // left and laneCount on the right. Returns the lane this car should be heading for.
  const rampLane = (car) => {
    if (!Track.isMain(car.s)) return car.lane;
    const zone = CONFIG.ramps.laneZone, last = Track.laneCount - 1;
    let leaving = false;
    if (car.viaSide) {
      for (const x of Track.exits) {
        if (car.dir > 0 ? car.s > x.exitAt - zone && car.s < x.exitAt
          : x.flyovers && car.s > x.flyoverAt && car.s < x.flyoverAt + zone) leaving = true;
      }
    }
    if (car.dir > 0) {
      if (car.lane === last && leaving) return last + 1;   // out onto the exit lane
      if (car.lane === last + 1 && !leaving) return last;  // in from the merge lane
    } else {
      if (car.lane === 0 && leaving) return -1;            // out toward the flyover
      if (car.lane === -1 && !leaving) return 0;           // in from the flyover
    }
    return car.lane;
  };

  // the level's "traffic" list: which kinds of vehicle turn up, and how often relative to
  // each other. An empty list means no traffic.
  // (at s, as its "trafficZones" there have it: each sets the weights of the kinds it names over the
  // level's own, a weight of 0 taking that kind away, a later one over an earlier)
  const weightsAt = (s) => {
    const weights = { ...(LEVEL.traffic || {}) };
    if (s !== undefined) for (const z of LEVEL.trafficZones || []) if (s >= z.from && s < z.to) Object.assign(weights, z.traffic);
    return weights;
  };
  // (and on a level with water stages, only the kinds that can be at s, going way dir: see Water.allows)
  const mix = (s, dir) => Object.entries(weightsAt(s)).filter(([kind, rate]) => CONFIG.vehicles[kind] && rate > 0 && Water.allows(kind, s, dir));
  // police only where its traffic zones put them (none in the level's own list)? Then one that comes to
  // the edge of such a stretch stays there, on station (see update)
  const policeOnStation = () => !(LEVEL.traffic?.police > 0) && (LEVEL.trafficZones || []).some(z => z.traffic.police > 0);
  const pickKind = (s, dir) => {
    const kinds = mix(s, dir);
    let r = Math.random() * kinds.reduce((sum, [, rate]) => sum + rate, 0);
    for (const [kind, rate] of kinds) {
      r -= rate;
      if (r < 0) return kind;
    }
    return kinds[0][0];
  };
  // is a police car close enough to see what the player is doing?
  // (margin: m further out than the police see, for a warning of them: see the HUD's glow)
  const policeNear = (margin = 0) => cars.some(c => c.active && !c.junction && c.kind === 'police' && !c.toad && c.stun <= 0 &&
    Math.abs(c.s - Player.s) < Social.policeSight * (1 - (1 - CONFIG.fog.policeSight) * Track.foggy(Player.s)) + margin && // (as far as the player's standing lets it, and less in fog)
    Math.abs(c.lat - Player.lat) < 25);

  const MOOD_START = { happy: 0.7, neutral: 0, angry: -0.7 };
  // evil cars are more likely to start out angry (a level's "drivers" can set the chances
  // for every driver, and the share of evil ones)
  const drivers = () => LEVEL.drivers || {};
  const pickEmotion = (evil) => {
    const d = drivers(), r = Math.random(), own = d[evil ? 'evilMood' : 'goodMood']; // (a side's own, if the level says)
    const chance = own ? { happy: own.happy || 0, angry: own.angry || 0 } : d.happy !== undefined || d.angry !== undefined
      ? { happy: d.happy || 0, angry: d.angry || 0 } : CONFIG.startMood[evil ? 'evil' : 'good'];
    return r < chance.happy ? 'happy' : r < chance.happy + chance.angry ? 'angry' : 'neutral';
  };
  const speeds = () => LEVEL.trafficSpeed || { min: CONFIG.trafficMinSpeed, max: CONFIG.trafficMaxSpeed };

  const laneClear = (car, lane, gap) => cars.every(o =>
    o === car || !o.active || o.junction || o.lane !== lane || Math.abs(o.s - car.s) > gap);

  const playerInWay = (car, lane) => Player.active &&
    Math.abs(Player.lat - Track.laneOffset(lane, car.s)) < CONFIG.laneWidth * 0.9 &&
    Player.s > car.s - 30 && Player.s < car.s + 12;

  const H = CONFIG.hesitation;
  const between = (range) => range.min + Math.random() * (range.max - range.min);
  const hesitation = () => LEVEL.hesitation !== false;

  // puts the car on the road `distance` metres from the player (negative: behind), in a lane of
  // its own direction with room around it; false if there is no room there
  const placeAt = (car, distance) => {
    car.s = Track.spawnAt(Player.s, distance, car.dir);
    if (Number.isNaN(car.s) || !Track.inBounds(car.s)) return false;
    if (Water.on && !mix(car.s, car.dir).length) return false; // (nothing of the level's can be there: a boat on the road, a car on the water)
    const [first, all] = Track.laneRange(car.dir, car.s), kind = pickKind(car.s, car.dir);
    const last = car.dir > 0 ? Math.max(first, Math.min(all, Tide.dryLane(car.s))) : all; // (none turns up in the tide's water)
    // (a vehicle that keeps to the kerb starts out there)
    const lane = CONFIG.vehicles[kind].kerb ? Track.openLane(kerbLane(car.dir, car.s), car.s)
      : Track.openLane(first + Math.floor(Math.random() * (last - first + 1)), car.s);
    if (!laneClear(car, lane, 25) || Wreckage.blocked(lane, car.s)) return false;
    outfit(car, kind, lane);
    Radiation.deal(car); // (a share of a radiated level's traffic comes infected: car.infected, which blank() puts back)
    return true;
  };
  // the lane by the kerb for traffic going way dir: its outside lane
  const kerbLane = (dir, s) => Track.laneRange(dir, s)[dir > 0 ? 1 : 0];

  // puts the car on the road somewhere between minAhead and maxAhead metres in front of the
  // player. One going the player's way too fast for the player ever to catch hesitates (see CONFIG.hesitation).
  const spawn = (car, minAhead, maxAhead) => {
    car.active = false;
    for (let tries = 0; tries < 5; tries++) {
      if (!placeAt(car, minAhead + Math.random() * (maxAhead - minAhead))) continue;
      if (hesitation() && car.dir === Player.dir && car.baseSpeed > H.above && !CONFIG.vehicles[car.kind].cruise) {
        car.hesitant = true;
        car.baseSpeed = between(H.pace);
        car.vs = car.dir * car.baseSpeed;
        car.tapWait = between(H.tapEvery);
      }
      return;
    }
  };
  // ...and while a hesitant car is ahead of the player, a car going the player's way may come
  // up from behind instead, near full speed. False if there was no room.
  const hesitantAhead = () => cars.some(c => c.active && !c.junction && c.hesitant && c.dir === Player.dir && Track.along(c.s) > Track.along(Player.s));
  const spawnBehind = (car) => {
    car.active = false;
    for (let tries = 0; tries < 5; tries++) {
      if (!placeAt(car, -between(H.behind))) continue;
      const own = GARAGE_TOP[car.kind];
      const type = CONFIG.vehicles[car.kind];
      car.baseSpeed = LEVEL.battle ? Math.max(car.baseSpeed, Player.speed + between(CONFIG.battle.goodArmy.overtake)) // (green reinforcements, coming by)
        : type.cruise ? between(type.cruise) : (own || type.speed * speeds().max) * between(H.behindPace);
      car.vs = car.dir * car.baseSpeed;
      car.fromBehind = true;
      return true;
    }
    car.active = false;
    return false;
  };

  // TOAD RAGE (a mystery): while it lasts, every vehicle is a toad (new ones too). A toad goes
  // straight on at one slow speed: no moods, no lane changes, no braking, and 1 health, so it
  // bursts on touching anything (see Collision). Afterwards each turns back into what it was.
  let toads = false;
  const makeToad = (car) => {
    if (car.toad || car.emergency || car.parked || car.junction || car.driver) return; // (an ambulance stays an ambulance, and a parked car parked; nor one driven from elsewhere: see car.driver)
    const T = CONFIG.mystery.toad;
    car.toad = { health: car.health, maxHealth: car.maxHealth, hw: car.hw, hl: car.hl, height: car.height, mass: car.mass };
    Object.assign(car, T, { health: 1, maxHealth: 1, spin: 0, wobble: 0, rival: null, stun: 0 });
  };
  const toadify = (on) => {
    toads = on;
    for (const car of cars) {
      if (on) makeToad(car);
      else if (car.toad) {
        Object.assign(car, car.toad);
        car.toad = null;
      }
    }
  };

  // RUSH HOUR (a mystery): rushHour times the traffic each way, as far as the pool goes (keeping
  // two spare for the level's emergencies and specials). The extra cars turn up at once, over the
  // road ahead as at the start of a run; once it is over, each that goes is not replaced
  const rushHour = (on) => {
    if (!on) {
      for (const car of cars) if (car.rush) { car.rush = false; car.unused = true; }
      return;
    }
    if (!mix().length) return; // (a level with no traffic stays empty)
    const spare = cars.filter(c => !c.active && c.unused);
    const extra = (dir) => Math.round(cars.filter(c => !c.unused && c.dir === dir && !c.fixed).length * (CONFIG.mystery.rushHour - 1));
    const wanted = [...Array(extra(1)).fill(1), ...Array(extra(-1)).fill(-1)];
    for (const car of spare.slice(0, Math.max(0, spare.length - 2))) {
      const dir = wanted.shift();
      if (!dir) break;
      Object.assign(car, { dir, bound: dir > 0 ? 'north' : 'south', unused: false, rush: true, fixed: false, junction: null, parked: false, stalled: false,
        halted: 0, racer: false, slideVel: 0, emergency: false, hesitant: false, pulledOver: false, pulledFor: null, rival: null, toad: null });
      spawn(car, 60, CONFIG.spawnMax);
      if (toads && car.active) makeToad(car); // (in TOAD RAGE, they come as toads)
    }
  };
  // MOOD SWING (a mystery): every driver that can be evil swaps sides (not a special vehicle, nor a
  // racer or a rival courier), new ones too, and back again afterwards
  let swinging = false;
  const swing = (car) => {
    const type = CONFIG.vehicles[car.kind];
    if (car.swung || car.racer || car.courier || car.procession || type.special || type.evilOnly) return;
    car.evil = !car.evil;
    car.swung = true;
  };
  const moodSwing = (on) => {
    swinging = on;
    for (const car of cars) {
      if (on && car.active) swing(car);
      else if (!on && car.swung) {
        car.evil = !car.evil;
        car.swung = false;
      }
    }
  };

  // the top speed of each of the garage's cars, by id (which is also its kind of traffic)
  const GARAGE_TOP = Object.fromEntries(CARS.map(c => [c.id, c.maxSpeed]));
  const CARS_BY_ID = LEVEL_CARS;

  // makes the car a vehicle of that kind, in that lane at car.s, fresh off the line
  const outfit = (car, kind, lane) => {
    blank(car);
    car.fixed = false;
    car.viaSide = Math.random() < CONFIG.ramps.trafficShare; // will take a ramp / flyover if it meets one
    car.kind = kind;
    const type = CONFIG.vehicles[car.kind];
    car.hw = type.hw;
    car.hl = type.hl;
    car.height = type.height;
    car.mass = type.mass;
    car.maxHealth = car.health = type.health;
    car.unspinnable = car.courier = false; // (only a rival courier: see addRacer)
    car.blockedFor = 0; car.blockedBy = null; car.clearThrow = 0;
    car.punctured = car.stationed = car.escaping = car.wrongWay = car.wrongWarned = false; car.driveBy = car.stationEdge = null; // (a flat tyre: see Gunfire; a drive-by's business: see driveBy)
    car.rivalName = car.colors = car.markColor = null; car.counted = false;
    car.parade = car.roadblock = car.icecream = car.convoy = car.reversible = null; // (a float in a parade, a car in a roadblock, an ice-cream van at its stop, a convoy's member, an oncoming car down a reversed lane: see placeFixed, startConvoy, reversed)
    car.shedSaid = false; car.shedWait = undefined; // (a shedding truck: see shed)
    car.patience = 0; // (an evil driver's, in a jam: see rubbernecking)
    // (timers and tallies that are only set as they are first used: seekTow, the overtakes in update, mayBlock,
    // Packages. Each is put back here, or a car picked up again would carry on from its last use, and two runs
    // from one seed would differ: see REPLAY-NOTES.md and scripts/.replay-check.mjs)
    car.seek = car.overtake = car.feint = car.attack = car.passFor = car.dodge = car.slingLeft = 0;
    car.blockWait = car.yieldWait = car.quietWait = car.aheadGap = car.peltWait = car.pelts = car.shield = car.laps = 0;
    car.passing = null; car.sling = 0; car.tow = 0;
    car.smoke = 0;
    car.lane = lane;
    car.lat = Track.laneOffset(lane, car.s);
    car.latVel = 0;
    car.yaw = 0;
    car.yawVel = 0;
    car.stun = 0;
    const { min, max } = speeds();
    // (one of the garage's cars cruises near its own top speed, unless it has a speed of its own;
    // anything else at the level's pace)
    const own = type.speed ? 0 : GARAGE_TOP[kind], P = CONFIG.garagePace;
    car.baseSpeed = type.cruise ? type.cruise.min + Math.random() * (type.cruise.max - type.cruise.min)
      : own ? own * (P.min + Math.random() * (P.max - P.min)) : type.speed * (min + Math.random() * (max - min));
    car.vs = car.dir * car.baseSpeed;
    const evilShare = drivers().evil !== undefined ? drivers().evil : CONFIG.evilShare;
    car.evil = !!type.evilOnly || (!type.special && Math.random() < Social.evilShare(evilShare)); // fixed for this car's life (fewer, the higher the player's standing)
    car.swung = false;
    if (swinging) swing(car); // (in a Mood Swing, a new driver turns up on the other side too)
    car.defiant = car.evil && Math.random() < CONFIG.emergency.defiance; // won't give way to an ambulance
    // (and the higher the player's standing, the happier every driver starts out)
    car.mood = clamp(MOOD_START[pickEmotion(car.evil)] + Social.moodLift, -1, 1);
    car.emotion = emotionOf(car.mood);
    car.paint = Math.floor(Math.random() * 1000);
    car.showMood = false;
    if (LEVEL.battle) { // (the Battlefield: its side is its army's, by the way it is going; in its army's colours)
      const B = CONFIG.battle;
      car.evil = car.dir < 0;
      car.defiant = false;
      const shade = (car.evil ? B.colors.evil : B.colors.good)[kind] ?? (car.evil ? B.colors.evil : B.colors.good).apc;
      car.colors = [shade, shade];
      car.mood = 0;
      car.emotion = 'neutral';
      car.turret = 0;     // the way its gun is turned, from straight ahead (rad, + = to its right)
      car.gunWait = between(B.guns[kind]?.every || B.throwEvery);
      car.foe = null;     // the enemy it is after (see battle)
      car.dodging = null; // the hunter it has decided about getting out of the way of...
      car.dodges = false; // ...and whether it does
      car.laneWait = 0;   // s before a tank may change lanes again (see battle)
      // (the green army keeps up with the player: see CONFIG.battle.goodArmy; the red comes on slowly)
      car.baseSpeed = car.evil ? car.baseSpeed * B.evilPace : between(B.goodArmy.pace) * (kind === 'tank' ? B.goodArmy.tankPace : 1);
      car.vs = car.dir * car.baseSpeed;
    }
    car.wobble = 0;     // s left of wobbling after a critical hit, before it spins out
    car.spin = 0;       // s left of an uncontrolled spin, which ends in an explosion
    car.rival = null;   // another traffic car this one is bullying
    car.rivalTime = 0;
    car.grudge = 0; // s left of its grudge against the player (see CONFIG.grudgeTime)
    car.blockedPlayer = false; // it has moved over in front of the player once (see mayBlock)
    car.quietRoll = null; // the quiet stretch it has been thinned out of, or let into (see quietZones)
    car.wreckedByPlayer = false; // set once one of the player's packages has doomed it (see Packages)
    car.spite = false;           // an evil driver given a gift by the player: it throws at the player now and then...
    car.offended = 0;            // ...after this many s of throwing only at the player (see CONFIG.giftOffence)
    car.ufoBurning = false; // burning up after a UFO air strike (see UfoStrike)
    car.toad = null;        // in TOAD RAGE: what it was before it became a toad (see toadify)
    car.pulledOver = false; // on the shoulder, out of the way of the player's siren
    car.arrest = -1;        // s into being carried off by the police (see arrest); -1 = not
    car.braking = false;    // its brake lights are on
    car.signal = 0;         // indicating: +1 towards the next lane up (lat increasing), -1 the next down
    car.hazards = false;    // hazard lights: pulled over onto the shoulder for a siren
    car.pendingLane = null; // the lane it is signalling for, until it moves over (see signalTo)
    car.pendingForced = false; // ...because its lane ends or it is taking a ramp
    car.signalTime = 0;     // s of signalling left before it moves over
    car.hesitant = !!type.learner; // hesitating (see CONFIG.hesitation; a learner driver, all the time)...
    car.binWait = type.stops ? between(type.stops.every) * Math.random() : 0; // a bin lorry: s to its next stop...
    car.binStop = 0;        // ...and s left of the one it is making
    car.jingleWait = Math.random() * 2; // an ice cream van: s to the next bar of its tune
    car.tap = 0;            // ...s left of a touch of the brakes...
    car.tapWait = 0;        // ...s to the next
    car.wander = Math.random() * 6; // (where it is in its drift about the lane)
    car.fromBehind = false; // came up from behind the player
    car.onIce = false;      // on an ice patch (see CONFIG.ice)
    car.racer = false;      // one of a race's grid (see placeFixed)
    car.slideVel = 0;       // m/s it is sliding wide in a bend (a level with "understeer")
    car.stalled = false;    // stalled in the tide's water, hazards on (see Tide)
    car.tracksBroken = false; // a tank's track broken by a blast: halted for good (see CONFIG.brokenTracks)
    car.halted = 0;         // pulled over for good (to the shoulder on this side: -1 | 1), its lane blocked ahead (see Wreckage)
    car.junction = null;    // leaving the road at a junction: on its way off, in the world (see leaveAtJunction)
    car.junctionSeen = -1;  // the s of the last junction it came to (and chose a way at)
    car.jam = false;        // stopped in the queue at a ramp over the jam (see placeFixed, Gambles)
    car.parked = false;     // parked on a shoulder, hazards on (see placeFixed)...
    car.parkSide = 1;       // ...on this side (-1 left, 1 right)
    car.pulledFor = null;   // the siren it is pulled over for: Player, or an emergency vehicle
    car.emergency = false;  // an emergency vehicle (see startEmergency)...
    car.blocker = null;     // ...the vehicle in its way, if any...
    car.blockTime = 0;      // ...for how long (s) it has been close behind it...
    car.sparePlayer = false; // ...and done waiting for a player nobody could bust
    car.procession = 0;     // the funeral procession it is in (see startProcession), 0 = none
    car.stopGoFor = null;   // the stop / go works it has decided whether to run the STOP at (see StopGo)
    car.passingPack = null; // where it is steering by a peloton, out past it (see passPeloton)
    car.driver = null;      // driven by another module (a police pursuit's cars: see pursuit.js): a function (car, dt) called from update in place of all a driver does...
    car.sirenOn = false;    // ...its siren going: traffic gives way to it as to an ambulance (see sirenFor)
    if (toads) makeToad(car);
    car.throwTimer = CONFIG.enemyThrowMin + Math.random() * (CONFIG.enemyThrowMax - CONFIG.enemyThrowMin);
    car.think = Math.random() * 2;
    car.active = true;
  };

  // where a parked car stands: on the outer half of its shoulder, leaving passing traffic room
  const parkedLat = (side, s) => Track.shoulderOffset(side, s) + side * 0.5;
  // Vehicles the level puts in a fixed place (its tractors): each takes a car from the pool,
  // waits where it was put until the player comes within range, and is never recycled.
  const placeFixed = () => {
    for (const t of LEVEL.tractors || []) {
      const s = Track.place(t);
      const dir = t.road === 'side' ? (t.lane === 0 && Track.sideOncoming(s) ? -1 : 1) // (a side road's lane 0, where it is oncoming)
        : Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1
        : t.lane < Track.leftLanes ? -1 : 1; // (the left side of a two-way road is oncoming)
      const car = cars.find(c => !c.active && !c.unused && c.dir === dir);
      if (!car) continue;
      car.s = s;
      outfit(car, 'tractor', t.lane);
      car.fixed = true;
      car.viaSide = false;
      car.baseSpeed = CONFIG.tractorSpeed;
      car.vs = 0; // parked until the player is near
    }
    // ...and a race's grid (a level's "grid"): `count` cars of its kind, two by two, staggered, ahead
    // of the player, all the player's way; half of them evil (see addRacer)
    if (LEVEL.grid) {
      // (two by two in the middle lanes; on a two-lane road, in both)
      const G = LEVEL.grid, [first, last] = Track.laneRange(1, 0), lanes = last - first >= 2 ? [first + 1, first + 2] : [first, last];
      for (let k = 0; k < G.count; k++) {
        if (!addRacer((G.from ?? 14) + (G.count - 1 - k) * G.gap, G.rival ? lanes[(k + 1) % 2] : lanes[k % 2], G.rival ? G.evil : k % 2 === 1, G.rivals?.[k])) break;
      }
      sortGrid();
    }
    // ...and its parked cars, on the shoulders with their hazards on: a car of one of the
    // level's ordinary kinds, facing the way that side's traffic goes, that never moves off
    const ordinary = mix().filter(([kind]) => !CONFIG.vehicles[kind].special);
    for (const p of LEVEL.parked || []) {
      const side = p.side === 'left' ? -1 : 1;
      const dir = Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1 : side;
      const car = cars.find(c => !c.active && c.unused) || cars.find(c => !c.active && !c.unused && c.dir === dir);
      if (!car) continue;
      car.dir = dir;
      car.bound = dir > 0 ? 'north' : 'south';
      car.s = Track.place(p);
      let r = Math.random() * ordinary.reduce((sum, [, rate]) => sum + rate, 0), kind = 'commuter';
      for (const [k, rate] of ordinary) if ((r -= rate) < 0) { kind = k; break; }
      outfit(car, kind, side > 0 ? Track.laneCount - 1 : 0);
      Object.assign(car, { fixed: true, parked: true, parkSide: side, viaSide: false, evil: false, defiant: false,
        baseSpeed: 0, vs: 0, lat: parkedLat(side, car.s), hazards: true });
    }
    // a car from the pool for something the level puts out going the player's way: a spare, or one of the
    // player's way's own
    const spareNorth = () => cars.find(c => !c.active && c.unused) || cars.find(c => !c.active && !c.unused && c.dir > 0);
    // ...and a street parade's floats (a level's "parades": see CONFIG.parade): one in every lane of the
    // player's side at s, abreast, waiting to step off as the player comes near (the band behind them, and
    // the drum: see Collision's marchers, and update)
    (LEVEL.parades || []).forEach((p, id) => {
      const s = Track.place(p), [first, last] = Track.laneRange(1, s), shared = { beat: 0, said: false };
      for (let lane = first; lane <= last; lane++) {
        const car = spareNorth();
        if (!car) break;
        car.dir = 1;
        car.bound = 'north';
        car.s = s;
        outfit(car, 'float', lane);
        Object.assign(car, { fixed: true, parade: { id, lead: lane === first, shared }, viaSide: false, evil: false, defiant: false, hesitant: false,
          baseSpeed: p.speed || CONFIG.parade.speed, vs: 0, paint: id * 7 + lane, showMood: false });
      }
    });
    // ...and the ice-cream vans at their stops (a level's "iceCreamStops": see CONFIG.iceCream): each stopped in
    // its lane at s, hazards on, until a while after the player comes near
    for (const st of LEVEL.iceCreamStops || []) {
      const car = spareNorth();
      if (!car) break;
      car.dir = 1;
      car.bound = 'north';
      car.s = Track.place(st);
      outfit(car, 'icecream', st.lane);
      Object.assign(car, { fixed: true, icecream: { pace: car.baseSpeed, wait: st.wait ?? CONFIG.iceCream.wait, timer: null, jingle: 0, said: false },
        viaSide: false, evil: false, defiant: false, hesitant: false, baseSpeed: 0, vs: 0, hazards: true, showMood: false });
    }
    // ...and the queue at a ramp over the jam (a level's "jamRamps": see Gambles and CONFIG.jamRamp): stopped cars,
    // brake lights on, that never move off
    for (const ramp of Gambles.ramps) {
      // (cars and vans only, the same ones every run: nothing in it too long or too tall to be flown over)
      const small = ordinary.map(([kind]) => kind).filter((kind) => CONFIG.vehicles[kind].hl <= CONFIG.jamRamp.longest && CONFIG.vehicles[kind].height <= CONFIG.jamRamp.tallest);
      Gambles.queueSpots(ramp).forEach((spot, k) => {
        const car = spareNorth();
        if (!car) return;
        car.dir = 1;
        car.bound = 'north';
        car.s = spot.s;
        outfit(car, small.length ? small[(k * 7 + spot.lane) % small.length] : 'commuter', spot.lane);
        Object.assign(car, { fixed: true, jam: true, jamPace: car.baseSpeed, viaSide: false, evil: false, defiant: false, hesitant: false, baseSpeed: 0, vs: 0, showMood: false }); // (jamPace: what it drives off at, if the jam is cleared: see Gambles)
      });
    }
    // ...and a police roadblock's cars (a level's "roadblocks": see CONFIG.roadblock): one across every lane of
    // the player's side at s but the gap (the roadblock's own, or one at random each run), lights going
    for (const r of LEVEL.roadblocks || []) {
      const s = Track.place(r), [first, last] = Track.laneRange(1, s), shared = { said: false, waved: false };
      const gap = r.gap !== undefined ? r.gap : first + Math.floor(Math.random() * (last - first + 1));
      for (let lane = first; lane <= last; lane++) {
        if (lane === gap) continue;
        const car = spareNorth();
        if (!car) break;
        car.dir = 1;
        car.bound = 'north';
        car.s = s;
        outfit(car, 'police', lane);
        Object.assign(car, { fixed: true, roadblock: { side: lane - first < (last - first) / 2 ? -1 : 1, shared }, viaSide: false, evil: false, defiant: false, hesitant: false,
          baseSpeed: 0, vs: 0, yaw: Math.PI / 2, showMood: false });
      }
    }
  };
  // ---- convoys (a level's "convoys": see CONFIG.convoy) -------------------------------------------------
  // Three or four vehicles of a kind nose to tail in one lane, turning up where new traffic does, going
  // the player's way ahead of it or coming the other way; each follower keeps right on the one ahead (see
  // update). They take cars from the pool that the level leaves unused. False if there was no room
  let nextConvoy = Infinity, convoys = 0;
  const startConvoy = (dir) => {
    const C = CONFIG.convoy, L = LEVEL.convoys, size = L.size || C.size;
    const spare = cars.filter(c => !c.active && c.unused);
    if (spare.length < size + 1 || !Player.active || !Track.isMain(Player.s) || !mix().length) return false;
    const kind = L.kind && CONFIG.vehicles[L.kind] ? L.kind : pickKind(Player.s);
    const type = CONFIG.vehicles[kind];
    for (let tries = 0; tries < 4; tries++) {
      const s0 = Track.spawnAt(Player.s, 150 + Math.random() * 150, dir);
      if (Number.isNaN(s0) || !Track.inBounds(s0)) continue;
      const [first, last] = Track.laneRange(dir, s0), lane = first + Math.floor(Math.random() * (last - first + 1));
      const spots = [];
      for (let k = 0; k < size; k++) spots.push(s0 - dir * k * (2 * type.hl + C.gap));
      if (!spots.every(s => Track.inBounds(s) && cars.every(o => !o.active || o.junction || o.lane !== lane || Math.abs(o.s - s) > 22))) continue;
      const id = ++convoys;
      let ahead = null;
      spots.forEach((s, k) => {
        const car = spare[k];
        car.dir = dir;
        car.bound = dir > 0 ? 'north' : 'south';
        car.s = s;
        outfit(car, kind, lane);
        Object.assign(car, { convoy: { id, ahead }, viaSide: false, hesitant: false, showMood: false });
        if (ahead) { car.baseSpeed = ahead.baseSpeed; car.vs = ahead.vs; } // (all at the leader's pace)
        ahead = car;
      });
      return true;
    }
    return false;
  };

  // ---- reversible lanes (a level's "reversible": see CONFIG.reversible) ----------------------------------
  // Each stretch flips as the player comes near: its lane is oncoming from then on. The traffic in it going
  // the player's way moves out (see update), and oncoming cars come down it the wrong way, one every so
  // often, appearing ahead of the player (see reversed)
  let reversibles = [];
  const reversed = (r, dt) => {
    const R = CONFIG.reversible;
    if (!r.flipped) {
      if (Player.active && Player.s > r.from - (r.flipAt ?? R.flipAt) && Player.s < r.to) {
        r.flipped = true;
        r.next = 0.5;
        Message.say('events', 'reversible');
      }
      return;
    }
    if (Player.s > r.to || !Player.active || (r.next -= dt) > 0) return;
    r.next = between(R.every);
    const s = Player.s + between(R.ahead);
    if (s > r.to - 10 || s < r.from) return; // (none from beyond the stretch)
    const car = cars.find(c => !c.active && c.unused) || cars.find(c => !c.active && !c.unused && c.dir < 0);
    if (!car || !cars.every(o => !o.active || o.lane !== r.lane || Math.abs(o.s - s) > 25)) return;
    car.dir = -1;
    car.bound = 'south';
    car.s = s;
    outfit(car, pickKind(s), r.lane);
    Object.assign(car, { reversible: r, wrongWay: true, viaSide: false, hesitant: false, evil: false, showMood: false });
  };

  // ---- rubbernecking (see CONFIG.rubberneck) -------------------------------------------------------------
  // A wreck is worth a look: for a while after a car blows up, the traffic coming up to the spot slows right
  // down to see, and the jam forms behind. Collision tells of each (noteWreck)
  const wrecks = []; // { s, lat, t (s left) }
  const noteWreck = (v) => {
    if (v.isPlayer || v.toad || v.racer || !Track.isMain(v.s)) return;
    wrecks.push({ s: v.s, lat: v.lat, t: CONFIG.rubberneck.linger });
  };
  // ...and an evil driver that has sat in the jam long enough goes up the shoulder, if it is clear, and is
  // arrested for it if a police car is near enough to see (as the player would be busted)
  const rubberneck = (car, target, dt) => {
    const R = CONFIG.rubberneck;
    let slow = false;
    for (const w of wrecks) {
      const ahead = (w.s - car.s) * car.dir;
      if (ahead > -(car.hl + 6) && ahead < R.range) slow = true;
    }
    if (slow && !car.shoulderRun) target = Math.min(target, car.baseSpeed * R.pace);
    if (car.evil && !car.racer && !car.parade && !car.convoy && !CONFIG.vehicles[car.kind].kerb) {
      if (!car.shoulderRun && Math.abs(car.vs) < car.baseSpeed * R.slowBelow && Math.abs(car.s - Player.s) < CONFIG.spawnMax) car.patience += dt;
      else car.patience = Math.max(0, car.patience - dt);
      if (car.patience > R.patience && !car.shoulderRun && !car.oncoming && shoulderClear(car, 60)) {
        const [first, last] = Track.laneRange(car.dir, car.s);
        car.lane = car.dir > 0 ? last : first;
        car.shoulderRun = { for: 0, past: null, impatient: true };
        car.signal = kerbSide(car);
        car.pendingLane = null;
        car.patience = 0;
      }
      if (car.shoulderRun?.impatient) {
        target = Math.max(target, car.baseSpeed); // (no holding back, up the shoulder)
        if (car.shoulderRun.for > R.longest) { car.shoulderRun = null; car.signal = -kerbSide(car); }
        else if (cars.some(o => o.active && o.kind === 'police' && !o.roadblock && Math.abs(o.s - car.s) < R.policeSight) && arrestNow(car)) {
          if (Math.abs(car.s - Player.s) < 150) Message.say('events', 'shoulderBusted');
        }
      }
    }
    return target;
  };

  // a shedding truck (a kind with sheds: true, see CONFIG.cargo): while it is ahead of the player and near,
  // now and then a load off the back, anywhere across its lane and a little either side, which slides on
  // down the road and stops: one of the level's pool of loads (see Collision), the first out of play or
  // left well behind
  const shed = (car, dt) => {
    const C = CONFIG.cargo, ahead = car.s - Player.s;
    if (ahead < 0 || ahead > C.near) return;
    if (!car.shedSaid) { car.shedSaid = true; Message.say('events', 'cargo'); }
    if ((car.shedWait = (car.shedWait ?? between(C.every)) - dt) > 0) return;
    car.shedWait = between(C.every);
    const load = Collision.obstacles.find(o => o.cargo && (o.gone || o.s < Player.s - 300));
    if (!load) return;
    Object.assign(load, { gone: false, s: car.s - car.hl - 1, lat: car.lat + (Math.random() - 0.5) * 2 * (car.hw + 0.6), slide: Math.max(0, Math.abs(car.vs) - 4), face: 0, h: 0 });
    sfxAt('cargoDrop', car.s, 0.7);
  };

  // a racer on the grid (a level's "grid") at s, in that lane: false if the pool has no car spare.
  // It never stops racing (however far ahead or behind), throws nothing, and goes as fast as its pace
  // allows, a share of the player's car's top speed. (A rival courier, on a delivery level: the
  // player's own kind of car, and an evil one has it in for the player, and throws at it)
  const addRacer = (s, lane, evil, who) => {
    const car = cars.find(c => !c.active && c.unused);
    if (!car) return false;
    const G = LEVEL.grid, top = CARS_BY_ID[LEVEL.car]?.maxSpeed ?? CAR.maxSpeed;
    car.dir = 1;
    car.bound = 'north';
    car.s = s;
    outfit(car, G.kind || who?.car || (CONFIG.vehicles[CAR.id] ? CAR.id : 'sport'), lane);
    // (a rival courier: its name, and colours of its own: its body, its stripes, its marker)
    const hex = (c) => typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c;
    car.rivalName = who?.name || null;
    car.colors = who?.colors ? who.colors.map(hex) : null;
    car.markColor = who?.mark ? hex(who.mark) : car.colors ? car.colors[1] : null;
    Object.assign(car, { fixed: true, racer: true, evil, defiant: false, viaSide: false, hesitant: false,
      vs: 0, baseSpeed: top * between(G.pace), throwTimer: Infinity, paint: Math.floor(Math.random() * 1000), laps: 0,
      nerve: between(CONFIG.race.nerve), attack: 0, sling: 0, slingLeft: 0, slingTotal: 0 });
    car.emotion = pickEmotion(car.evil);
    car.mood = MOOD_START[car.emotion];
    car.place = undefined; // (its place in the running order: see raceMood)
    car.done = false; // (over the finish, on a delivery level: see update)
    car.oncoming = null; // (out in the oncoming lane, passing: see passOncoming)
    car.shoulderRun = null; // (up the shoulder, passing: see passShoulder)
    car.boosts = null; // (a rival's turbo, armour and the like: see rivalPace)
    car.lastObstacle = null;
    car.damageScale = 1;
    car.courier = !!G.rival; // (a rival courier: see CONFIG.rival)
    car.unspinnable = !!G.rival; // (a rival takes some stopping: it never spins out nor takes a critical hit,
    if (G.rival) car.maxHealth = car.health = CONFIG.rival.health; // and it has a great deal of health)
    if (G.rival && evil) {
      car.grudge = Infinity; // (an evil rival courier's never wears off: it is out to beat the player)
      car.throwTimer = CONFIG.rival.firstThrow * (1 + Math.random());
    }
    return true;
  };
  // the grid put in order: the slowest driver on pole, the fastest at the back (so the race is one
  // of coming through the field). A driver's pace: its top speed, and its speed through the bends
  // (which goes with the square root of its nerve)
  const sortGrid = () => {
    const field = cars.filter(c => c.active && c.racer);
    const slots = field.map(c => ({ s: c.s, lane: c.lane })).sort((a, b) => b.s - a.s);
    const pace = (c) => c.baseSpeed * Math.sqrt(c.nerve || 1);
    field.sort((a, b) => pace(a) - pace(b)).forEach((c, i) => {
      c.s = slots[i].s;
      c.lane = slots[i].lane;
      c.lat = Track.laneOffset(c.lane, c.s);
    });
  };
  // how a traffic driver treats the player (see CONFIG.attitude): by its side, its mood and the
  // player's side. null: it pays the player no special attention. (Not racers, who have race rules
  // of their own; nor the police, ambulances, nor trucks and tractors, which keep to themselves)
  const minds = (car) => Player.active && !LEVEL.battle && !car.racer && !car.procession && !car.parade && car.kind !== 'police' && !car.emergency && car.kind !== 'tractor' &&
    !CONFIG.vehicles[car.kind].kerb && car.dir === Player.dir;
  const attitude = (car) => {
    if (!minds(car)) return null;
    const mood = car.emotion;
    if (!car.evil) {
      if (mood === 'happy') return Player.evil ? 'wary' : 'friendly';
      if (mood === 'angry') return Player.evil ? 'vigilante' : 'sulky';
      return Player.evil ? 'distant' : null;
    }
    if (mood === 'happy') return Player.evil ? 'wingman' : 'smug';
    if (mood === 'angry') return Player.evil ? 'turf' : car.spite ? null : 'rage'; // (angry at a gift: no road rage, see Packages)
    return null;
  };
  // the turf war (CONFIG.attitude.hunt): a driver starts hunting the player
  const startHunt = (car) => {
    car.hunt = CONFIG.attitude.hunt.time;
    car.grudge = CONFIG.grudgeTime;
  };
  // a car wrecked by the player: an evil player wins the respect of the evil drivers about
  const wreckedByPlayer = (wreck) => {
    const W = CONFIG.attitude.wreckCheer;
    if (!Player.evil) return;
    for (const o of cars) {
      if (o === wreck || !o.active || !o.evil || o.racer || o.hunt > 0 || Math.abs(o.s - wreck.s) > W.range) continue;
      o.mood = Math.min(1, o.mood + W.mood);
      o.showMood = true;
    }
  };
  // the hunters' roles, worked out once a frame: with two or more on the player, the nearest ahead
  // blocks, the nearest behind tails, and the rest flank (alone: it just goes for the player)
  const huntRoles = () => {
    const hunters = cars.filter(c => c.active && c.hunt > 0);
    for (const c of hunters) c.huntRole = 'solo';
    if (hunters.length < 2) return;
    const ahead = hunters.filter(c => c.s > Player.s).sort((a, b) => a.s - b.s);
    const behind = hunters.filter(c => c.s <= Player.s).sort((a, b) => b.s - a.s);
    for (const c of ahead) c.huntRole = 'drop';
    if (ahead[0]) ahead[0].huntRole = 'block';
    for (const c of behind) c.huntRole = 'flank';
    if (behind[0]) behind[0].huntRole = 'tail';
  };
  // is the car far enough ahead of `target` to move over in front of it, and not so far that it is no block?
  // (CONFIG.blocking: the gap it needs grows with the target's speed)
  const roomToBlock = (car, target) => {
    const B = LEVEL.laps ? CONFIG.race.blocking : CONFIG.blocking, speed = target.isPlayer ? target.speed : Math.abs(target.vs); // (racing round a circuit, closer)
    const gap = (car.s - target.s) * car.dir - car.hl - target.hl, need = Math.max(B.min, speed * B.headway);
    return gap >= need && gap <= need + B.window;
  };
  // may it move over in front of the player again? Once, for any car; after that, only while it holds a
  // grudge: shadowing the player's every lane change is for one the player has upset
  const mayBlock = (car) => !car.blockedPlayer || car.grudge > 0;
  // could the car move over into that lane right now?
  const canMove = (car, lane, ignorePlayer) => {
    const [first, last] = Track.laneRange(car.dir, car.s);
    if (lane < first || lane > last) return false;
    if (Track.openLane(lane, car.s) !== lane || Track.openLane(lane, car.s + car.dir * 70) !== lane) {
      return false; // that lane isn't there, or ends just ahead
    }
    if (!laneClear(car, lane, car.courier || car.escaping ? CONFIG.rival.laneGap : CONFIG.laneChangeGap)) return false; // (a rival courier takes a tighter gap)
    if (!ignorePlayer && playerInWay(car, lane)) return false;
    if (car.dir > 0 && lane > car.lane && lane > Tide.dryLane(car.s + 70)) return false; // (nobody moves over into the tide's water)
    return true;
  };
  // A calm (happy or neutral), good driver decides early and signals: it moves over
  // CONFIG.signalTime later, if the lane is still free then (see update). Evil and angry drivers just go.
  const courteous = (car) => !car.evil && car.emotion !== 'angry';
  const signalTo = (car, lane, forced) => {
    car.pendingLane = lane;
    car.pendingForced = forced; // (its lane ends, or it is taking a ramp: it waits for room, however long)
    car.signal = Math.sign(lane - car.lane);
    car.signalTime = CONFIG.signalTime;
  };
  const tryMove = (car, dir, ignorePlayer) => {
    const lane = car.lane + dir;
    if (!canMove(car, lane, ignorePlayer)) return false;
    if (courteous(car)) signalTo(car, lane, false);
    else car.lane = lane;
    return true;
  };

  // a hard touch of the brakes, every so often, in front of the player (see CONFIG.attitude)
  const brakeCheck = (car, dt) => {
    const A = CONFIG.attitude, ds = car.s - Player.s;
    if ((car.checkWait = (car.checkWait ?? between(A.brakeCheckEvery)) - dt) > 0 || ds <= 0 || ds > A.brakeCheckRange + car.hl + Player.hl) return;
    car.checkWait = between(A.brakeCheckEvery);
    car.tap = CONFIG.hesitation.tapTime;
  };
  // an evil racer that is angry: in a fury, faster all round (see CONFIG.race.fury)
  const furious = (car) => car.racer && car.evil && car.emotion === 'angry';
  // how hard an evil racer left behind is chasing down the car in front of it: 0 .. 1 (see CONFIG.race.chase)
  const chasing = (car) => {
    const C = CONFIG.race.chase;
    return car.racer && car.evil ? clamp(((car.aheadGap || 0) - C.from) / (C.full - C.from), 0, 1) : 0;
  };
  // how fast a racer may go for the bends ahead of it (see CONFIG.race): as fast as its nerve allows
  // (on the attack, it brakes later: see CONFIG.race.diveLookout)
  const racingLine = (car, attacking = car.attack > 0) => {
    const lookout = CONFIG.race.aiLookout * (attacking ? CONFIG.race.diveLookout : 1);
    const R = CONFIG.race, type = CONFIG.vehicles[car.kind];
    let sharpest = 0;
    for (let d = 0; d <= lookout; d += 5) sharpest = Math.max(sharpest, Math.abs(Track.bend(car.s + car.dir * d)));
    const nerve = (car.nerve || 1) * (attacking ? R.attackNerve : 1) * (furious(car) ? R.fury.nerve : 1) *
      (1 + (R.chase.nerve - 1) * chasing(car)); // (its own, and more on the attack, in a fury, or chasing down the car in front)
    return sharpest > 1e-4 ? Math.sqrt(CONFIG.ice.grip * R.aiTyres * R.aiGrip * nerve * (type.agility || 1) / (weightOf(car) * sharpest)) : Infinity;
  };
  // the slipstream (a race: see CONFIG.race): how deep in the tow of a car ahead a car at s, lat
  // (so wide) is, from 0 (none) to 1 (on its gearbox). Any racer ahead gives a tow, and so does the player
  // (on a rival stage, a road car's tow: much shorter, and weaker: see CONFIG.rival.tow)
  const tow = (self, s, lat, hw) => {
    if (!LEVEL.grid) return 0;
    const R = CONFIG.race, road = LEVEL.grid.rival ? CONFIG.rival.tow : null, reach = road ? road.reach : R.towReach;
    let best = 0;
    const behind = (os, olat, ohw) => {
      let gap = os - s;
      if (Track.loop && gap < -Track.length / 2) gap += Track.length; // (just over the line)
      if (gap > 0 && gap < reach && Math.abs(olat - lat) < (ohw + hw) * 0.8) best = Math.max(best, 1 - gap / reach);
    };
    for (const o of cars) if (o !== self && o.active && o.racer) behind(o.s, o.lat, o.hw);
    if (self !== Player && Player.active) behind(Player.s, Player.lat, Player.hw);
    return best * (road ? road.share : 1);
  };
  // would a racer held up behind `ahead` get by it in that lane? Only with the lane clear past it (or
  // with whatever is in it going faster), going faster once out of the tow than it does (the
  // slingshot carrying it on, and, into a bend, its nerve on the attack: see CONFIG.race)
  const worthPassing = (car, ahead, lane) => {
    const R = CONFIG.race, gap = (ahead.s - car.s) * car.dir;
    for (const o of cars) {
      if (o === car || !o.active || o.lane !== lane) continue;
      const ds = (o.s - car.s) * car.dir;
      if (ds > -(o.hl + car.hl) && ds < gap + ahead.hl + (car.courier ? CONFIG.rival.passRoom : 30) && Math.abs(o.vs) < Math.abs(ahead.vs) + 1) return false;
    }
    // (a good racer races the player clean: it passes on the straights, never diving up the inside into a bend)
    if (ahead.isPlayer && !car.evil && racingLine(car) < Math.abs(car.vs)) return false;
    const out = car.baseSpeed * (1 + (R.draft + R.slingKick) * (car.tow >= R.slingFrom ? car.tow : 0) * 0.5);
    return Math.min(out, racingLine(car, true)) > Math.abs(ahead.vs) * 1.01;
  };
  // is there room for a racer to squeeze by the player on that lane's side of it (the player
  // astride the lanes, or not): the road beyond the player as wide as the racer, and a little more?
  const sideOf = (car, lane) => Math.sign(Track.laneOffset(lane, car.s) - Player.lat) || 1;
  const roomBy = (car, lane, side = sideOf(car, lane)) => {
    const room = side > 0 ? Track.hi(car.s) - (Player.lat + Player.hw) : (Player.lat - Player.hw) - Track.lo(car.s);
    return room >= 2 * car.hw + 0.4;
  };
  // ---- a drive-by car (see CONFIG.driveBy): cruising, then picking someone (the player, or a car near
  // it), pulling up alongside it in the lane beside, firing out of the window, and making off
  const driveBy = (car, target, dt) => {
    const D = CONFIG.driveBy, st = car.driveBy || (car.driveBy = { state: 'cruise', wait: between(D.every), victim: null, t: 0, shots: 0, gap: 0 });
    const v = st.victim, alive = v && (v.isPlayer ? Player.active : v.active && !v.punctured);
    const speedOf = (o) => o.isPlayer ? Player.speed : Math.abs(o.vs);
    if (st.state === 'cruise') {
      if ((st.wait -= dt) <= 0 && Math.abs(car.s - Player.s) < D.range) {
        const near = cars.filter(o => o !== car && o.active && o.dir === car.dir && o.kind !== 'police' && o.kind !== 'driveby' && !o.courier && !o.parked && !o.punctured &&
          Math.abs(o.s - car.s) < D.range);
        const pool = Player.active && Player.dir === car.dir ? [Player, Player, ...near] : near; // (the player more often than not)
        if (pool.length) Object.assign(st, { state: 'stalk', victim: pool[Math.floor(Math.random() * pool.length)], t: 0 });
        else st.wait = between(D.every);
      }
      return target;
    }
    if (st.state === 'flee') { // (and for good: off out of it, pushing its way through, until it is gone from the road)
      car.escaping = true;
      return car.baseSpeed * D.fleePace;
    }
    if (!alive || (st.t += dt) > D.giveUp) { Object.assign(st, { state: 'flee' }); return target; }
    // the lane beside the victim's (the nearer, if there are two), then level with it
    const [first, last] = Track.laneRange(car.dir, car.s), vLane = v.isPlayer ? Track.nearestLane(v.lat, v.s) : v.lane;
    const beside = [vLane - 1, vLane + 1].filter(l => l >= first && l <= last).sort((a, b) => Math.abs(a - car.lane) - Math.abs(b - car.lane))[0];
    if (beside !== undefined && car.lane !== beside && laneClear(car, beside, 6)) car.lane = beside;
    const ds = (v.s - car.s) * car.dir;
    target = Math.max(0, speedOf(v) + clamp(ds * 0.8, -6, 12));
    if (st.state === 'stalk' && Math.abs(ds) < D.alongside && car.lane === beside) {
      Object.assign(st, { state: 'fire', shots: D.shots, gap: 0 });
      if (v.isPlayer) Message.say('events', 'driveBy');
    }
    if (st.state === 'fire' && (st.gap -= dt) <= 0) {
      st.gap = D.shotGap;
      Gunfire.shoot({ s: car.s, lat: car.lat + Math.sign(v.lat - car.lat) * car.hw, y: 1.2 }, v, car);
      if (--st.shots <= 0) Object.assign(st, { state: 'flee' });
    }
    return target;
  };
  // ---- a rival courier (a level's "rival": see Game.start and CONFIG.rival) ----
  // what it has picked up, running down, and its pace: faster the further it has fallen behind the player
  const rivalPace = (car, target, dt) => {
    const R = CONFIG.rival, b = car.boosts || (car.boosts = { turbo: 0, armour: 0, slow: 0, slowBy: 1 });
    for (const k of ['turbo', 'armour', 'slow']) b[k] = Math.max(0, b[k] - dt);
    car.damageScale = b.armour > 0 ? CONFIG.armour.damage : 1;
    const C = R.catchUp, behind = (Player.s - car.s) * car.dir;
    if (Player.active && !car.done) target *= 1 + (C.pace - 1) * clamp((behind - C.from) / (C.full - C.from), 0, 1);
    if (b.turbo > 0) target += CONFIG.turboBoost;
    if (b.slow > 0) target *= b.slowBy;
    return target;
  };
  // a pickup it drives through: it has the good of it (or the bad), and the pickup stays where it is,
  // for the player (each only once for the rival)
  const rivalPickups = (car) => {
    for (const p of Pickups.items) {
      if (p.taken && p.washed || p.rivalHad || Math.abs(p.s - car.s) > car.hl + 1 || Math.abs(p.lat - car.lat) > car.hw + 1) continue;
      p.rivalHad = true;
      const b = car.boosts || (car.boosts = { turbo: 0, armour: 0, slow: 0, slowBy: 1 });
      let type = p.type;
      if (type === 'mystery') type = ['turbo', 'wrench', 'armour'][Math.floor(Math.random() * 3)];
      if (type === 'turbo') b.turbo = CONFIG.turboTime;
      else if (type === 'wrench') car.health = Math.min(car.maxHealth, car.health + car.maxHealth * CONFIG.wrenchRepair);
      else if (type === 'armour') b.armour = CONFIG.armour.time;
      else if (type === 'bigSplash' && car.evil && Player.active) Packages.throwAtGround(car);
      else if (type === 'badGas' || type === 'heavyMass') { b.slow = CONFIG[type].time; b.slowBy = CONFIG[type].topSpeed; }
      else continue;
      if (Math.abs(car.s - Player.s) < CONFIG.rival.heard) sayRival('rivalPickup', car, type);
    }
  };
  // would it do it good to have that pickup? (a wrench only if it is hurt; a Big Splash only if it is evil, to throw)
  const rivalWants = (car, type) => type === 'turbo' || type === 'armour' || type === 'mystery' ||
    (type === 'wrench' && car.health < car.maxHealth * 0.9) || (type === 'bigSplash' && car.evil);
  const rivalShuns = (type) => type === 'badGas' || type === 'heavyMass';
  // an obstacle (or a pickup that would do it harm) ahead of it in that lane, within reach m (it
  // can't go through obstacles: see rivalObstacles)
  const blockedAhead = (car, lane, reach) => Collision.obstacles.some(o => {
    const ahead = (o.s - car.s) * car.dir;
    return !o.gone && ahead > -(o.hl + car.hl) && ahead < reach && !(o.h > car.height) &&
      Math.abs(o.lat - Track.laneOffset(lane, o.s)) < o.hw + car.hw + CONFIG.rival.obstacleRoom;
  }) || Pickups.items.some(p => {
    const ahead = (p.s - car.s) * car.dir;
    return !p.rivalHad && !(p.taken && p.washed) && rivalShuns(p.type) && ahead > 0 && ahead < reach &&
      Math.abs(p.lat - Track.laneOffset(lane, p.s)) < car.hw + 1;
  });
  // the nearest pickup ahead it would like, within reach m, in one of its own lanes that it can
  // get into and that is clear of obstacles on the way: that lane (or null)
  const laneForPickup = (car, reach) => {
    const [first, last] = Track.laneRange(car.dir, car.s);
    let best = null, nearest = reach;
    for (const p of Pickups.items) {
      const ahead = (p.s - car.s) * car.dir;
      if (p.rivalHad || (p.taken && p.washed) || ahead < 8 || ahead > nearest || !rivalWants(car, p.type)) continue;
      const lane = Track.nearestLane(p.lat, p.s);
      if (lane < first || lane > last || Track.openLane(lane, p.s) !== lane || blockedAhead(car, lane, ahead + 4)) continue;
      if (lane !== car.lane && (Math.abs(lane - car.lane) > 1 || !canMove(car, lane, false))) continue; // (a lane at a time)
      nearest = ahead;
      best = lane;
    }
    return best;
  };
  // obstacles: it steers round any in its way (into a clear lane beside, or out into the oncoming
  // lane if that is clear), and one it does run into slows it, as it would the player, but stays
  // where it is: the rival never clears the way for the player
  const rivalObstacles = (car, dt) => {
    const R = CONFIG.rival;
    if ((car.dodge = (car.dodge || 0) - dt) <= 0) {
      car.dodge = 0.15;
      const reach = R.lookAhead + Math.abs(car.vs) * R.lookTime;
      if (blockedAhead(car, car.lane, reach)) {
        const [first, last] = Track.laneRange(car.dir, car.s), opposite = oppositeLane(car);
        let what = null, nearest = Infinity; // (the obstacle in the way: it stays out until it is by it)
        for (const o of Collision.obstacles) {
          const ahead = (o.s - car.s) * car.dir;
          if (!o.gone && ahead > 0 && ahead < nearest && Math.abs(o.lat - car.lat) < o.hw + car.hw + CONFIG.rival.obstacleRoom) { nearest = ahead; what = o; }
        }
        const options = [car.lane + 1, car.lane - 1].filter(l => l >= first && l <= last && canMove(car, l, false));
        if (opposite !== null && !options.length && !car.oncoming && !policeWatching(car) && Track.openLane(opposite, car.s) === opposite &&
            cars.every(o => o === car || !o.active || o.lane !== opposite || Math.abs(o.s - car.s) > reach + Math.abs(o.vs) * 2 + 20)) options.push(opposite);
        const lane = options.find(l => !blockedAhead(car, l, reach));
        if (lane === undefined && !car.oncoming && !car.shoulderRun && !policeWatching(car) && shoulderClear(car, reach)) { // (no lane: the shoulder)
          const [f2, l2] = Track.laneRange(car.dir, car.s);
          car.lane = car.dir > 0 ? l2 : f2;
          car.shoulderRun = { for: 0, past: what };
          car.signal = kerbSide(car);
        } else if (lane !== undefined) {
          if (lane === opposite) { car.oncoming = { home: car.lane, for: 0, past: what }; car.attack = CONFIG.race.attackTime; }
          car.signal = lane - car.lane;
          car.lane = lane;
          car.pendingLane = null;
        }
      } else if (!car.oncoming) { // (the way clear: a pickup that would do it good, it goes for)
        const lane = laneForPickup(car, R.pickupReach + Math.abs(car.vs) * R.lookTime);
        if (lane !== null && lane !== car.lane) {
          car.signal = lane - car.lane;
          car.lane = lane;
          car.pendingLane = null;
        }
      }
    }
    for (const o of Collision.obstacles) {
      if (o.gone || o === car.lastObstacle || Math.abs(o.s - car.s) > o.hl + car.hl + 1 || o.h > car.height || !Collision.overlap(car, o)) continue;
      car.lastObstacle = o; // (once for each, however long it is in contact)
      car.vs *= CONFIG.obstacleKinds[o.kind]?.speedKept ?? 0.6;
    }
  };
  // A racer stuck behind something slow with no lane of its own to pass in (a narrow two-way road,
  // a tractor and its queue ahead) overtakes on the wrong side of the road: if it is quick enough
  // to get by the whole queue, and nothing coming the other way could get to it before it has
  // (see CONFIG.race.oncoming). It pulls back in at the first gap; and with something coming
  // after all, it pulls back in at once, wherever it is
  const oppositeLane = (car) => {
    if (Track.flow !== 'both') return null; // (a one-way road, or the Battlefield's: no oncoming lane)
    if (Track.apart(car.s) > 0 || Track.apart(car.s + car.dir * 250) > 0) return null; // (nor where the two ways have parted, or are about to)
    const [first, last] = Track.laneRange(car.dir, car.s), lane = car.dir > 0 ? first - 1 : last + 1;
    const [ofirst, olast] = Track.laneRange(-car.dir, car.s);
    return lane >= ofirst && lane <= olast ? lane : null;
  };
  const passOncoming = (car, blocker) => {
    const O = CONFIG.race.oncoming, lane = oppositeLane(car);
    if (policeWatching(car)) return; // (a rival courier with the police about)
    if (lane === null || Track.openLane(lane, car.s) !== lane || Track.openLane(lane, car.s + car.dir * 150) !== lane) return;
    if (racingLine(car) < car.baseSpeed * 0.9) return; // (not into a bend)
    // the queue: the slow car and everything close behind it, up to its front
    let front = (blocker.s - car.s) * car.dir;
    for (let more = true; more;) {
      more = false;
      for (const o of cars) {
        if (o === car || !o.active || o.lane !== car.lane || o.dir !== car.dir) continue;
        const gap = (o.s - car.s) * car.dir;
        if (gap > front && gap < front + O.queueGap) { front = gap; more = true; }
      }
    }
    const slow = Math.abs(blocker.vs), edge = car.baseSpeed - slow;
    if (edge < (LEVEL.grid?.rival || car.escaping ? CONFIG.rival.oncomingEdge : O.edge)) return;
    const length = front + O.margin, time = length / edge; // (m to get by them all, and s it takes)
    for (const o of cars) {
      if (o === car || !o.active || o.lane !== lane) continue;
      const gap = (o.s - car.s) * car.dir;
      if (gap > -(o.hl + car.hl + 4) && gap < length + time * (Math.abs(o.vs) + slow) + O.spare) return; // (it would meet it)
    }
    if (Player.active && Player.dir !== car.dir && Math.abs(Player.lat - Track.laneOffset(lane, car.s)) < CONFIG.laneWidth &&
        (Player.s - car.s) * car.dir > -10 && (Player.s - car.s) * car.dir < length + time * (Player.speed + slow) + O.spare) return;
    car.oncoming = { home: car.lane, for: 0, past: blocker.isPlayer ? Player : blocker };
    car.lane = lane;
    car.signal = lane - car.oncoming.home;
    car.pendingLane = null;
    car.attack = CONFIG.race.attackTime;
    car.passing = null;
  };
  const backFromOncoming = (car) => {
    const O = CONFIG.race.oncoming, home = car.oncoming.home;
    const [first, last] = Track.laneRange(car.dir, car.s), own = clamp(home, first, last);
    car.oncoming.for += CONFIG.maxStep;
    // (the first gap in its own lane: nothing there from just behind it to a little ahead)
    // (and, for a rival courier, no obstacle in it just ahead: see rivalObstacles)
    const gap = cars.every(o => o === car || !o.active || o.lane !== own ||
      (o.s - car.s) * car.dir < -(o.hl + car.hl + O.cutIn) || (o.s - car.s) * car.dir > o.hl + car.hl + 6) &&
      !(LEVEL.grid?.rival && blockedAhead(car, own, CONFIG.rival.lookAhead));
    // (or something coming at it, close: back in, now)
    const danger = cars.some(o => o !== car && o.active && o.lane === car.lane && o.dir !== car.dir &&
      (o.s - car.s) * car.dir > 0 && (o.s - car.s) * car.dir < (Math.abs(car.vs) + Math.abs(o.vs)) * O.panic);
    // (back in at the first gap once it is by the car it pulled out for, or with the police about)
    if (gap && (pastIt(car, car.oncoming.past) || policeWatching(car)) || danger || car.oncoming.for > O.longest || Track.openLane(car.lane, car.s + car.dir * 40) !== car.lane) {
      car.lane = own;
      car.signal = own - car.lane;
      car.oncoming = null;
    }
  };
  // a police car near a rival courier: it can't be busted, but it keeps to the rules while one can see it
  const policeWatching = (car) => LEVEL.grid?.rival && cars.some(o => o.active && o.kind === 'police' && Math.abs(o.s - car.s) < CONFIG.rival.policeRange);
  // past what it pulled out to pass (or it was nothing in particular)? Then it may pull back in
  // (a car, or an obstacle it went round)
  const pastIt = (car, past) => !past || past.gone || past.active === false || (past.s - car.s) * car.dir < -(past.hl + car.hl + CONFIG.race.oncoming.cutIn);
  // A rival courier, boxed in, goes up the shoulder on its kerb side (see CONFIG.rival): if it is wide
  // enough, nothing stands on it for the length of the queue and a little more, and it is quicker than
  // what holds it up. Back into the outer lane at the first gap, or at once if the shoulder is blocked
  const kerbSide = (car) => car.dir > 0 ? 1 : -1;
  const shoulderClear = (car, reach) => {
    const side = kerbSide(car), lat = Track.shoulderOffset(side, car.s);
    if (Track.shoulder < 2 * car.hw + CONFIG.rival.shoulderRoom || Track.onBridge(car.s) || Track.onBridge(car.s + car.dir * reach)) return false;
    const near = (s, l, w) => { const ahead = (s - car.s) * car.dir; return ahead > -(car.hl + 4) && ahead < reach && Math.abs(l - Track.shoulderOffset(side, s)) < w + car.hw + 0.3; };
    return !cars.some(o => o !== car && o.active && near(o.s, o.lat, o.hw)) &&
      !Collision.obstacles.some(o => !o.gone && !(o.h > car.height) && near(o.s, o.lat, o.hw)) &&
      !Pickups.items.some(p => !p.rivalHad && rivalShuns(p.type) && near(p.s, p.lat, 1)) &&
      !(Player.active && near(Player.s, Player.lat, Player.hw)) && Number.isFinite(lat);
  };
  const passShoulder = (car, blocker) => {
    if (!(car.courier || car.escaping) || car.shoulderRun || car.oncoming || policeWatching(car)) return;
    if (racingLine(car) < car.baseSpeed * 0.9 || car.baseSpeed - Math.abs(blocker.vs) < CONFIG.rival.oncomingEdge) return;
    const [first, last] = Track.laneRange(car.dir, car.s), outer = car.dir > 0 ? last : first;
    if (car.lane !== outer && !canMove(car, outer, false)) return; // (from the outer lane: the shoulder is beside it)
    if (!shoulderClear(car, (blocker.s - car.s) * car.dir + blocker.hl + 40)) return;
    car.lane = outer;
    car.shoulderRun = { for: 0, past: blocker.isPlayer ? Player : blocker };
    car.signal = kerbSide(car);
    car.pendingLane = null;
    car.attack = CONFIG.race.attackTime;
    car.passing = null;
  };
  const backFromShoulder = (car, dt) => {
    const [first, last] = Track.laneRange(car.dir, car.s), outer = car.dir > 0 ? last : first;
    car.lane = outer;
    car.shoulderRun.for += dt;
    const gap = cars.every(o => o === car || !o.active || o.lane !== outer ||
      (o.s - car.s) * car.dir < -(o.hl + car.hl + CONFIG.race.oncoming.cutIn) || (o.s - car.s) * car.dir > o.hl + car.hl + 6) &&
      !blockedAhead(car, outer, CONFIG.rival.lookAhead);
    // (back in at the first gap once it is by, or with the police about; and at once with the shoulder blocked)
    if (gap && (pastIt(car, car.shoulderRun.past) || policeWatching(car)) || car.shoulderRun.for > CONFIG.race.oncoming.longest ||
        !shoulderClear(car, CONFIG.rival.lookAhead + Math.abs(car.vs) * 1.2)) {
      car.shoulderRun = null;
      car.signal = -kerbSide(car);
    }
  };
  // a racer on a straight, out of any tow, looks for one: a car not far ahead in the lane beside, and
  // moves over in behind it (then, closing on it, it is held up and pulls out to pass: see update)
  const seekTow = (car, dt) => {
    const R = CONFIG.race;
    if (car.tow > 0.2 || car.pendingLane !== null || (car.seek = (car.seek || 0) - dt) > 0) return;
    car.seek = R.seekEvery * (0.6 + Math.random() * 0.8);
    if (racingLine(car) < car.baseSpeed * 1.05) return; // (a bend coming: no time for it)
    let best = null, nearest = Infinity;
    for (const o of cars) {
      if (o === car || !o.active || !o.racer || o.lane === car.lane || Math.abs(o.lane - car.lane) > 1) continue;
      const gap = o.s - car.s;
      if (gap > o.hl + car.hl + 3 && gap < R.seekReach && gap < nearest) { nearest = gap; best = o; } // (anywhere it is not alongside)
    }
    if (best && canMove(car, best.lane, false)) {
      car.signal = best.lane - car.lane;
      car.lane = best.lane;
    }
  };
  // a race's moods (see CONFIG.race): the running order (the racers and the player, furthest round
  // first), and each racer's place in it against the last: places gained cheer it up, places lost get
  // it down, the more so up front; and up front, it cheers up as the race goes on, unless there is
  // someone right behind it. And an evil racer that wrecks another is delighted
  const raceMood = (dt) => {
    const R = CONFIG.race, field = cars.filter(c => c.racer).map(c => ({ c, at: (c.laps || 0) * Track.length + c.s }));
    if (Player.active) field.push({ c: Player, at: Game.lap * Track.length + Player.s });
    field.sort((a, b) => b.at - a.at);
    field.forEach(({ c, at }, place) => {
      if (c === Player) return;
      if (c.wasRacing && !c.active) { // (wrecked just now: another racer's doing, if it hit it just now)
        const by = c.hitBy;
        if (by && by.racer && by !== c && by.evil && Game.time - c.hitAt < R.killWindow) by.mood = Math.min(1, by.mood + R.killMood);
      }
      c.wasRacing = c.active;
      const front = Math.max(0, 1 - 2 * place / field.length); // (1 for the leader, down to 0 halfway back)
      if (c.active && c.place !== undefined && place !== c.place) {
        const swing = 1 + (R.frontSwing - 1) * front;
        c.mood += (place < c.place ? (c.place - place) * R.passMood : -(place - c.place) * R.passedMood) * swing;
      }
      const chased = field[place + 1] && at - field[place + 1].at < R.pressure;
      if (c.active) c.mood += (chased ? -R.pressureMood * front : R.leadMood) * front * dt;
      c.mood = clamp(c.mood, -1, 1);
      c.place = place;
      c.aheadGap = place > 0 ? field[place - 1].at - at : 0; // (to the car in front in the running order: see chasing)
    });
  };
  // a horn to suit the vehicle (police cars have sirens instead), only near the player. (Nobody at war
  // or in a race honks: an army's vehicles, a race's grid)
  const noHorn = (car) => LEVEL.battle || car.racer || car.parade || car.procession;
  const HORNS = { commuter: 'hornSmall', sport: 'hornSmall', darkvan: 'hornBig', van: 'hornBig', tractor: 'hornBig', bus: 'hornBus' };
  const honk = (car) => {
    if (car.kind === 'police' || noHorn(car) || car.honkWait > 0 || Math.abs(car.s - Player.s) > CONFIG.hornRange) return;
    car.honkWait = CONFIG.hornWait;
    sfxAt(HORNS[car.kind] || 'horn', car.s);
  };
  // the player's horn (horn.js, CONFIG.horn): traffic ahead going its way within range reacts. A calm good
  // driver in the player's lane moves over if it can (either way); an angry or evil one honks back
  const hornedAt = () => {
    const H = CONFIG.horn, lane = Track.nearestLane(Player.lat, Player.s);
    for (const car of cars) {
      if (!car.active || car.junction || car.toad || car.arrest >= 0 || car.dir < 0 || car.racer || car.emergency || car.procession || car.kind === 'police') continue;
      const gap = car.s - Player.s;
      if (gap <= 0 || gap > H.range) continue;
      if (car.evil || car.emotion === 'angry') { car.honkWait = 0; honk(car); continue; }
      if (car.pendingLane !== null || car.pulledOver || Track.openLane(car.lane, car.s) !== lane) continue;
      if (!tryMove(car, 1, true)) tryMove(car, -1, true);
    }
  };

  // A car that hurts the player while the player's siren sounds is arrested: a police
  // helicopter comes down and carries it off (render/helicopter.js). Until it is gone it
  // touches nothing, and nothing touches it.
  // (with the player's standing high enough, an evil car that assaults it with a police car about
  // is arrested too: see Social)
  // (and the driver has something to say about it: messages.json, reactions)
  const arrest = (car) => {
    if (Player.damageScale <= 0) return;
    const siren = Player.siren > 0;
    if ((siren || (Social.protected && car && car.evil && policeNear())) && arrestNow(car)) {
      Message.say('reactions', !siren ? 'arrestedStanding' : car.evil ? 'arrestedSirenEvil' : 'arrestedSirenGood');
    }
  };
  // (also what happens to a car that won't get out of an ambulance's way)
  // (true: it is arrested now)
  const arrestNow = (car) => {
    if (!car || car.isPlayer || !car.active || car.toad || car.arrest >= 0) return false;
    car.arrest = 0;
    car.rival = null;
    return true;
  };

  // in range of the player's siren: ahead of the player (coming its way, or going it)
  const underSiren = (car) => Player.siren > 0 && Player.active &&
    car.s - Player.s > 0 && car.s - Player.s < CONFIG.sirenPickup.range;
  // the siren a car gives way to, if any: the player's, or an emergency vehicle's coming up behind
  // it in its lane (unless it is one of the few evil drivers who won't give way to that)
  const E = CONFIG.emergency;
  const sirenFor = (car) => {
    if (underSiren(car)) return Player;
    if (car.emergency || car.defiant) return null;
    for (const a of cars) {
      if (!a.active || !(a.emergency || a.sirenOn) || a.dir !== car.dir) continue; // (sirenOn: a pursuit's interceptor)
      const gap = (car.s - a.s) * a.dir;
      if (gap > 0 && gap < E.range && Track.openLane(car.lane, car.s) === Track.openLane(a.lane, car.s)) return a;
    }
    return null;
  };
  // the lane that siren wants cleared, where the car is
  const sirenLane = (siren, car) => siren.isPlayer ? Track.nearestLane(Player.lat, Player.s) : Track.openLane(siren.lane, car.s);
  // a car stays pulled over while the player's siren sounds, or until the emergency vehicle is by
  const stillPulledOver = (car) => {
    const siren = car.pulledFor;
    if (siren === Player) return Player.siren > 0;
    return !!siren && siren.active && (siren.emergency || siren.sirenOn) && (car.s - siren.s) * siren.dir > -(car.hl + siren.hl + 10);
  };

  const think = (car) => {
    if (car.punctured || car.stationed || car.procession || car.parade || car.convoy || car.icecream) return; // (pulled over with a flat, a police car on station, in a funeral procession, a parade's float, a convoy, an ice-cream van)
    // (queued behind an ice-cream van at its stop: nobody pulls out round it, see CONFIG.iceCream)
    if (car.dir > 0 && cars.some(v => v.active && v.icecream && v.baseSpeed === 0 && v.s - car.s > -5 && v.s - car.s < CONFIG.iceCream.queue)) return;
    if (car.kind === 'tractor' || CONFIG.vehicles[car.kind].kerb) return; // a tractor just trundles along its lane, and a truck keeps to the kerb
    if (car.pendingLane !== null) return; // (already signalling for a move)
    if (sirenFor(car)) return; // (no lane changes of its own with a siren behind it)
    if (LEVEL.battle && car.kind === 'tank') return; // (a tank changes lanes only to hunt or dodge: see battle)
    // angry evil drivers pick on whoever is nearest (a good one only fights back, when it is hit)
    if (car.emotion === 'angry' && car.evil && !car.rival && !LEVEL.battle && Math.random() < CONFIG.rivalryPickChance) {
      let best = null, bestGap = CONFIG.rivalryRange;
      for (const o of cars) {
        if (o === car || !o.active || o.junction || o.dir !== car.dir) continue;
        const gap = Math.abs(o.s - car.s);
        if (gap < bestGap) { best = o; bestGap = gap; }
      }
      if (best) startRivalry(car, best);
    }
    // its attitude to the player (see CONFIG.attitude), with the player coming up behind it (or,
    // for a wary one, anywhere near)
    const ahead = car.s - Player.s; // how far this car is ahead of the player
    const playerLane = Track.nearestLane(Player.lat, Player.s);
    const inRange = Player.active && car.dir > 0 && ahead > 8 && ahead < CONFIG.attitudeRange;
    const near = Player.active && car.dir > 0 && Math.abs(ahead) < CONFIG.attitudeRange;
    const att = attitude(car), aside = () => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      tryMove(car, dir) || tryMove(car, -dir);
    };
    if (att === 'turf' && car.hunt > 0) return; // (hunting: see update)
    // (into the player's lane, in its way: only with room enough ahead of the player for its speed, see roomToBlock)
    if ((att === 'smug' || att === 'rage' || att === 'vigilante') && Player.active && car.dir > 0 && roomToBlock(car, Player) && mayBlock(car)) {
      const dir = Math.sign(playerLane - car.lane);
      if (dir && tryMove(car, dir, true)) car.blockedPlayer = true; // (its move at the player: that was its block, whether or not the player is still there)
    } else if ((att === 'friendly' || att === 'wingman') && inRange && playerLane === car.lane) aside();
    else if (att === 'wary' && near && playerLane === car.lane) aside();
    else if (att === 'sulky' && inRange) { /* it holds its lane */ } else if (!car.racer && Math.random() < CONFIG.laneChangeChance) { // (a racer picks its lane to race: see seekTow, and the overtakes in update)
      const dir = Math.random() < 0.5 ? 1 : -1;
      // (one out to block the player that has had its go, with no grudge, never wanders back into its way)
      const blocker = (att === 'smug' || att === 'rage' || att === 'vigilante') && !mayBlock(car) && ahead > 0 && ahead < CONFIG.attitudeRange + 70;
      if (!(blocker && Math.sign(playerLane - car.lane) === dir)) tryMove(car, dir);
    }
  };

  // ---- emergency vehicles (see CONFIG.emergency) ------------------------------------------------
  let nextEmergency = Infinity; // s to the next one, on a level with "emergencies"
  // sets one off, going the player's way (dir 1: from behind the player, in the player's lane if
  // the player is in one going that way) or coming the other way (from up the road), never a way
  // the level's traffic doesn't go (see update). It takes a car from the pool that the level
  // leaves unused (so a level needs one spare). Returns it, or null if there was no room.
  const startEmergency = (dir) => {
    const car = cars.find(c => !c.active && c.unused);
    if (!car || !Player.active || !Track.isMain(Player.s)) return null;
    const s = Player.s + (dir > 0 ? -E.behind : CONFIG.spawnMin + Math.random() * (CONFIG.spawnMax - CONFIG.spawnMin));
    if (!Track.inBounds(s)) return null;
    car.dir = dir;
    car.bound = dir > 0 ? 'north' : 'south';
    car.s = s;
    const [first, last] = Track.laneRange(dir, s), mine = Track.nearestLane(Player.lat, Player.s);
    const lane = dir > 0 && mine >= first && mine <= last ? mine : first + Math.floor(Math.random() * (last - first + 1));
    outfit(car, 'ambulance', Track.openLane(lane, s));
    if (car.toad) { // (set off in TOAD RAGE: an ambulance stays an ambulance)
      Object.assign(car, car.toad);
      car.toad = null;
    }
    Object.assign(car, { emergency: true, evil: false, defiant: false, viaSide: false, emotion: 'neutral', mood: 0, baseSpeed: E.speed, vs: dir * E.speed });
    if (dir > 0) Message.say('events', 'emergency'); // (only one coming up behind the player says so)
    return car;
  };
  // ---- funeral processions (see CONFIG.procession) ---------------------------------------------
  // A hearse and its cars, all in black, nose to tail in one lane at a crawl, turning up where new
  // traffic does (going the player's way, ahead of it; or coming the other way). They take cars from
  // the pool that the level leaves unused (keeping one spare for an ambulance). False if there was
  // no room for it just now.
  let nextProcession = Infinity, processions = 0;
  const startProcession = (dir) => {
    const P = CONFIG.procession;
    const spare = cars.filter(c => !c.active && c.unused);
    if (spare.length < P.cars + 2 || !Player.active || !Track.isMain(Player.s) || !mix().length) return false;
    // its cars, end to end from the hearse at s0, up the road behind it (the way it has come)
    const kinds = ['hearse', ...Array.from({ length: P.cars }, () => P.kinds[Math.floor(Math.random() * P.kinds.length)])];
    const spots = (s0) => {
      const at = [s0];
      for (let k = 1; k < kinds.length; k++) at.push(at[k - 1] - dir * (CONFIG.vehicles[kinds[k - 1]].hl + CONFIG.vehicles[kinds[k]].hl + P.gap));
      return at;
    };
    for (let tries = 0; tries < 4; tries++) {
      const s0 = Player.s + CONFIG.spawnMin + Math.random() * (CONFIG.spawnMax - CONFIG.spawnMin);
      const [first, last] = Track.laneRange(dir, s0);
      const lane = Track.openLane(first + Math.floor(Math.random() * (last - first + 1)), s0);
      const at = spots(s0);
      // (room for all of it, clear of the traffic in that lane)
      if (!at.every(s => Track.inBounds(s) && cars.every(o => !o.active || o.junction || o.lane !== lane || Math.abs(o.s - s) > 20))) continue;
      const id = ++processions;
      kinds.forEach((kind, k) => {
        const car = spare[k];
        car.dir = dir;
        car.bound = dir > 0 ? 'north' : 'south';
        car.s = at[k];
        outfit(car, kind, lane);
        Object.assign(car, { procession: id, evil: false, defiant: false, viaSide: false, hesitant: false, emotion: 'neutral', mood: 0,
          baseSpeed: P.speed, vs: dir * P.speed, colors: k ? [P.paint, P.paint] : null, showMood: false });
      });
      if (dir > 0) Message.say('events', 'procession');
      return true;
    }
    return false;
  };

  // the player crashed into a procession: every car of it is furious
  const mourn = (id) => {
    let said = false;
    for (const car of cars) {
      if (!car.active || car.procession !== id) continue;
      if (car.emotion !== 'angry') said = true;
      car.mood = -1;
      car.emotion = 'angry';
      car.showMood = true;
    }
    Player.startJerk(CONFIG.procession.jerkTime); // (and everyone on the road thinks the player a jerk for a while)
    if (said) Message.say('events', 'mourners');
  };

  // ---- the Battlefield (a level's "battle": see CONFIG.battle) ------------------------------------
  // Every army vehicle goes after the other army's: its gun (an 8x8's, a tank's) turns to the nearest enemy
  // ahead within reach and fires on it, a jeep lobs packages at it; and it steers for a head-on with an
  // enemy it beats (rank), coming at it. One coming at a vehicle that it can't beat, it gets out of the way
  // of: always, unless the other is out to get it, when only `dodge` of the time (decided once).
  const rankOf = (v) => v.isPlayer ? CAR.rank || 0 : CONFIG.vehicles[v.kind]?.rank || 0;
  // does a beat b head-on? (a tank an 8x8, an 8x8 a jeep: see Collision)
  const beats = (a, b) => rankOf(a) === rankOf(b) + 1;
  const enemies = (car) => {
    const list = cars.filter(o => o.active && !o.junction && o.dir !== car.dir && o.health > 0);
    if (car.dir < 0 && Player.active && Player.ghost <= 0) list.push(Player); // (the player is in the green army)
    return list;
  };
  // is lane free for car to move into: nobody of its own side close by in it, and nobody coming at it in it
  // that it would come off worse against (or both wrecked)
  const laneFree = (car, lane, foes) => {
    const [first, last] = Track.laneRange(car.dir, car.s);
    if (lane < first || lane > last) return false;
    const lat = Track.laneOffset(lane, car.s), B = CONFIG.battle;
    return cars.every(o => !o.active || o === car || o.dir !== car.dir || Math.abs(o.s - car.s) > o.hl + car.hl + 4 || Math.abs(o.lat - lat) > o.hw + car.hw) &&
      foes.every(o => beats(car, o) || (o.s - car.s) * car.dir < 0 || (o.s - car.s) * car.dir > B.look ||
        // (where it is, and where it is moving over to: two dodging the same way would only meet again)
        (Math.abs(o.lat - lat) > o.hw + car.hw + 0.3 && (o.isPlayer || Math.abs(Track.laneOffset(o.lane, o.s) - lat) > o.hw + car.hw + 0.3)));
  };
  const battle = (car, dt) => {
    const B = CONFIG.battle, foes = enemies(car), G = B.goodFire;
    const ahead = (o) => (o.s - car.s) * car.dir;
    // the nearest enemy ahead within its gun's reach: its gun turns to it. (The green army's override,
    // goodFire: any red within its reach, ahead or a little behind, and its turret snaps straight to it)
    const good = car.dir > 0 && !!G;
    let foe = null, best = good ? G.reach : B.reach;
    for (const o of foes) {
      const d = ahead(o);
      if (d < (good ? -G.behind : 0) || Math.abs(d) > best) continue;
      best = Math.abs(d);
      foe = o;
    }
    car.foe = foe;
    const want = foe ? Math.atan2((foe.lat - car.lat) * car.dir, good ? ahead(foe) : Math.max(1, ahead(foe))) : 0;
    car.turret = good && foe ? want : car.turret + clamp(want - car.turret, -B.turn * dt, B.turn * dt);
    const gun = B.guns[car.kind];
    if ((car.gunWait -= dt) <= 0 && foe && Math.hypot(foe.s - car.s, foe.lat - car.lat) > B.near && Math.abs(want - car.turret) < 0.1) {
      if (gun) Packages.fireShell(car, foe, gun);
      else if (best < CONFIG.enemyThrowCarRange) Packages.throwAtGround(car, foe); // (a jeep: a package at it)
      car.gunWait = between(gun?.every || B.throwEvery) * (good ? G.rate : 1);
    }
    if (car.stun > 0 || car.spin > 0 || car.tracksBroken) return;
    // (a tank lumbers: a lane change of its own only every laneWait)
    const tank = car.kind === 'tank';
    if (tank && (car.laneWait -= dt) > 0) return;
    const moved = () => { if (tank) car.laneWait = between(B.tank.laneWait); };
    // coming at it in its lane: an enemy it beats (it stays put: let it come), or one it doesn't
    const lat = Track.laneOffset(car.lane, car.s);
    let threat = null, near = B.look;
    for (const o of foes) {
      const d = ahead(o);
      if (d < 0 || d > near || Math.abs(o.lat - lat) > o.hw + car.hw + 0.3 || beats(car, o)) continue;
      near = d;
      threat = o;
    }
    if (threat) {
      // (out to get it, a hunter: only dodge of the time, decided once; anything else, always)
      if (car.dodging !== threat) {
        car.dodging = threat;
        car.dodges = !beats(threat, car) || Math.random() < B.dodge;
      }
      if (car.dodges) {
        for (const d of Math.random() < 0.5 ? [1, -1] : [-1, 1]) {
          if (!laneFree(car, car.lane + d, foes)) continue;
          car.lane += d;
          car.pendingLane = null;
          moved();
          break;
        }
      }
      return;
    }
    // a hunter: steering for a head-on with an enemy it beats, coming at it
    let prey = null;
    near = tank ? B.tank.hunt : B.hunt;
    for (const o of foes) {
      const d = ahead(o);
      if (d < 8 || d > near || !beats(car, o)) continue;
      near = d;
      prey = o;
    }
    if (prey) {
      const lane = clamp(Track.nearestLane(prey.lat, car.s), ...Track.laneRange(car.dir, car.s));
      const step = Math.sign(lane - car.lane);
      if (step && laneFree(car, car.lane + step, foes)) {
        car.lane += step;
        car.pendingLane = null;
        moved();
      }
    }
  };

  // ---- cyclists (a level's "pelotons": see CONFIG.peloton) ----------------------------------------
  // A good driver coming up behind a peloton riding its way in its lane (either way: cars coming the
  // other way pass one riding towards the player just the same) gives it room: it eases out past it, over
  // towards the centre line, as far as clears the cyclists with room to spare. If anything else is in
  // the way of that (a car coming the other way too wide to pass, a car alongside), it hangs back behind
  // the bunch at its pace until there is room. Once out past them it carries on by. (An evil one
  // ploughs straight through, as everything else does.) Returns { hold: the speed it may go, lat: where
  // to steer, or null }
  const NONE = { hold: Infinity, lat: null };
  const passPeloton = (car) => {
    const P = CONFIG.peloton;
    if (car.evil || car.racer || car.emergency || car.toad || car.junction || car.pulledOver || car.shoulderRun) return NONE;
    // (all measured its way, d: ahead is along its travel, and "out" is towards the centre line: lower
    // lat for a car going the player's way, higher for one coming the other way)
    const d = car.dir < 0 ? -1 : 1, own = Track.laneOffset(car.lane, car.s);
    // the cyclists ahead of it (or alongside), riding its way, that are in its way
    let inner = Infinity, back = Infinity, front = -Infinity, pace = 0;
    for (const o of Collision.obstacles) {
      if (!o.ride || o.gone || o.ride.dir !== d) continue;
      const ahead = (o.s - car.s) * d;
      if (ahead < -(car.hl + o.hl + P.passRoom) || ahead > P.lookout) continue;
      if (Math.abs(o.lat - (car.passingPack ?? own)) > car.hw + o.hw + P.room + 1) continue;
      inner = Math.min(inner, d * o.lat - o.hw);                                        // (its nearest edge to the centre, d-wise)
      back = Math.min(back, ahead - o.hl);
      front = Math.max(front, ahead + o.hl);
      pace = o.ride.on ? o.ride.speed : 0;
    }
    if (inner === Infinity) { car.passingPack = null; return NONE; }
    const far = d > 0 ? Track.lo(car.s) + car.hw : -(Track.hi(car.s) - car.hw);      // (the furthest out it can go, d-wise)
    const lat = d * Math.max(far, inner - P.room - car.hw);                           // (clear of them by `room`)
    if (d * (lat - own) > -0.05 && car.passingPack == null) return NONE;              // (there is room in its own lane already)
    // committed (alongside them already): carry on by
    if (car.passingPack != null) return { hold: Infinity, lat: car.passingPack };
    // room to go out there? Nothing within reach whose sides would meet it as it passes
    const reach = front + P.passRoom;
    const blocked = (o) => {
      if (o === car || !o.active || o.junction) return false;
      const ds = (o.s - car.s) * d;
      // (one coming the other way: all the way to where it would meet it, as it closes)
      const span = o.dir !== car.dir ? reach + (Math.abs(o.vs) + Math.abs(car.vs)) * reach / Math.max(5, Math.abs(car.vs) - pace) : reach;
      if (ds < -(o.hl + car.hl + 3) || ds > span) return false;
      return Math.abs(o.lat - lat) < o.hw + car.hw + P.room;
    };
    if (!cars.some(blocked) && !(Player.active && Player.ghost <= 0 && blocked(Player))) {
      car.passingPack = lat;
      return { hold: Infinity, lat };
    }
    // no room: hang back behind the bunch, at its pace
    const gap = back - car.hl - P.room - 1;
    return { hold: Math.max(0, pace + Math.max(0, gap) * 0.6), lat: null };
  };

  // where its lane is at s
  const pathLat = (car, s) => Track.laneOffset(Track.openLane(car.lane, s), s);
  const driveEmergency = (car, dt) => {
    // the nearest thing ahead in its lane, not yet fully out of it (cars being carried off, which
    // touch nothing, and toads, which it bursts, don't count)
    let blocker = null, gap = Infinity;
    const consider = (v) => {
      const d = (v.s - car.s) * car.dir - v.hl - car.hl;
      if (d < -1 || d > E.range || d >= gap) return;
      if (Math.abs(v.lat - pathLat(car, v.s)) >= v.hw + car.hw) return;
      blocker = v;
      gap = d;
    };
    for (const o of cars) if (o !== car && o.active && o.arrest < 0 && !o.toad && !o.emergency && !o.junction) consider(o);
    if (Player.active && Player.ghost <= 0) consider(Player);
    // close behind it: it has giveWay s to get out of the way, or it is arrested (the player busted;
    // a player who is busted already, or can't be, it just waits behind)
    if (blocker !== car.blocker || gap > E.reach) car.blockTime = 0;
    car.blocker = blocker;
    const caught = blocker && blocker.isPlayer && (Player.busted || car.sparePlayer);
    if (blocker && !caught && gap <= E.reach && (car.blockTime += dt) >= E.giveWay) {
      if (blocker.isPlayer) {
        Player.bust('emergency');
        if (!Player.busted) car.sparePlayer = true; // (a radar detector, or a tank)
      } else arrestNow(blocker);
      car.blocker = null;
      car.blockTime = 0;
    }
    // full speed, or as fast as lets it stop in time behind what is in its way
    // (an ambulance on a call takes the bends flat out)
    let target = car.baseSpeed;
    if (car.blocker) {
      const theirs = Math.max(0, car.blocker.vs * car.dir);
      target = Math.min(target, theirs + Math.sqrt(2 * E.brake * Math.max(0, gap - E.followGap)));
    }
    car.braking = Math.abs(car.vs) > target + 0.8;
    car.vs += (car.dir * target - car.vs) * damp(car.braking ? 8 : 1.5, dt);
    car.s += car.vs * dt;
    if (car.blocker) { // (and it never runs into it)
      const room = (car.blocker.s - car.s) * car.dir - car.blocker.hl - car.hl;
      if (room < 1) {
        car.s = car.blocker.s - car.dir * (car.blocker.hl + car.hl + 1);
        car.vs = car.dir * Math.max(0, car.blocker.vs * car.dir);
      }
    }
    Track.transfer(car);
    // held to its lane
    car.latVel = (pathLat(car, car.s) - car.lat) * 4;
    car.lat += car.latVel * dt;
    car.signal = 0;
    car.hazards = false;
    keepOnRoad(car, 0.3);
    updateYaw(car, dt);
  };

  // ---- junctions (see CONFIG.junction and Track.junctions) ------------------------------------
  // A car leaving the road at a junction leaves its s and lat behind for a path in the world:
  // car.junction = { j (which junction), path: [pieces], u (m along it), length, into / outOf (u at
  // the box's edges) }. A piece is a straight { start, dir, length } or a quarter turn
  // { start, dir, radius, turn (1 right, -1 left), length }. At the end of its path it is gone. It
  // touches nothing on the way (see Collision); car.wx / wy / wz / wh are where it is and which
  // way it faces, for drawing.
  const J = CONFIG.junction;
  const rightOf = (d) => ({ x: -d.z, z: d.x });
  const along = (p, d, u) => ({ x: p.x + d.x * u, z: p.z + d.z * u });
  // where a piece puts a car `l` m along it, and which way it faces
  const onPiece = (piece, l) => {
    if (!piece.radius) return { at: along(piece.start, piece.dir, l), dir: piece.dir };
    const r = rightOf(piece.dir), t = piece.turn, a = l / piece.radius, R = piece.radius;
    const side = { x: r.x * t, z: r.z * t }; // (towards the middle of the turn)
    return {
      at: { x: piece.start.x + side.x * R * (1 - Math.cos(a)) + piece.dir.x * R * Math.sin(a),
            z: piece.start.z + side.z * R * (1 - Math.cos(a)) + piece.dir.z * R * Math.sin(a) },
      dir: { x: piece.dir.x * Math.cos(a) + side.x * Math.sin(a), z: piece.dir.z * Math.cos(a) + side.z * Math.sin(a) },
    };
  };
  const placeOnJunction = (car) => {
    const g = car.junction;
    let u = g.u;
    for (const piece of g.path) {
      if (u > piece.length && piece !== g.path[g.path.length - 1]) { u -= piece.length; continue; }
      const { at, dir } = onPiece(piece, Math.min(u, piece.length));
      car.wx = at.x;
      car.wz = at.z;
      car.wh = Math.atan2(dir.x, dir.z);
      break;
    }
    car.wy = Track.junctions[g.j].centre.y;
  };
  // a car going the player's way, just at a junction: does it leave the road here? At a turn, carrying
  // straight on (from any lane); straight on, turning off down the arm on its side (from the outside lane)
  const leaveAtJunction = (car) => {
    if (car.dir < 0 || !Track.isMain(car.s) || car.parked || car.emergency || car.toad || car.fixed ||
        car.spin > 0 || car.stun > 0 || car.wobble > 0 || car.arrest >= 0 || car.pulledOver) return false;
    const i = Track.junctions.findIndex(jn => car.s >= jn.s && car.s < jn.s + 4);
    if (i < 0 || car.junctionSeen === Track.junctions[i].s) return false;
    const jn = Track.junctions[i];
    car.junctionSeen = jn.s;
    const start = {};
    Track.toWorld(jn.s, car.lat, start);
    let path;
    if (jn.way) {
      // (not across an oncoming car that is in the box, or about to be: then it follows the road)
      // (or will be, in the time this car takes to get across: `crossing` s)
      const J = CONFIG.junction, pace = Math.max(5, Math.abs(car.vs));
      const oncoming = cars.some(c => c.active && !c.junction && c.dir < 0 && c.s > jn.s - 2 &&
        c.s < jn.end + 12 + Math.abs(c.vs) * (jn.radius + jn.half + 5) / pace);
      // (nor across anything beside it on the outside of the bend, going its way: that follows the road round,
      // across the way straight on. Beside it, or about to be: one catching it up from further back, or one
      // ahead that it is catching up. From the outside lane there is never anything to cross)
      const beside = (v) => {
        if (v === car || (v.lat - car.lat) * jn.way >= -1) return false;
        const gain = ((v.isPlayer ? v.speed : v.vs) - pace) * J.crossing; // (m it gains on this car, getting across)
        return v.s > car.s - J.clearBehind - Math.max(0, gain) && v.s < car.s + J.clearAhead + Math.max(0, -gain);
      };
      const across = cars.some(c => c.active && !c.junction && c.dir > 0 && beside(c)) || (Player.active && beside(Player));
      if (oncoming || across || Math.random() >= jn.forward) return false;
      path = [{ start, dir: jn.f0, length: jn.radius + jn.arms[0].length }];
    } else {
      const [, last] = Track.laneRange(1, car.s);
      if (Track.openLane(car.lane, car.s) !== last || Math.random() >= jn.turnOff) return false;
      // a quarter turn to its side, into that arm's lane going away (as far out as it is now), then on down it
      const radius = Math.max(3, jn.half - Math.abs(car.lat)), arm = jn.arms[0];
      const turn = { start, dir: jn.f0, radius, turn: 1, length: radius * Math.PI / 2 };
      const end = onPiece(turn, turn.length);
      path = [turn, { start: end.at, dir: arm.dir, length: arm.length - jn.half }];
    }
    car.junction = { j: i, path, u: 0, length: path.reduce((sum, piece) => sum + piece.length, 0),
      into: 0, outOf: jn.way ? jn.radius + jn.half : path[0].length + 2 };
    car.vs = Math.abs(car.vs);
    car.pendingLane = null;
    car.signal = 0;
    placeOnJunction(car);
    return true;
  };
  const driveJunction = (car, dt) => {
    const g = car.junction;
    car.braking = false;
    car.signal = 0;
    car.hazards = false;
    g.u += car.vs * dt;
    if (g.u >= g.length) { car.active = false; return; } // (gone, off down the arm)
    placeOnJunction(car);
  };
  // is a car leaving across each junction's box just now? (traffic coming the other way gives way)
  const junctionState = () => {
    Track.junctions.forEach((jn, i) => {
      jn.busy = cars.some(c => c.active && c.junction && c.junction.j === i && c.junction.u < c.junction.outOf + 1);
    });
  };
  // how fast a car on the road may go, giving way at a box that a car is leaving across: it waits
  // at the box's edge (coming the other way, at its far edge) until the box is clear again
  const giveWay = (car) => {
    for (const jn of Track.junctions) {
      const d = car.dir > 0 ? jn.s - 3 - car.s : car.s - (jn.end + 3);
      if (d > 0 && d < 30 && jn.busy) return Math.sqrt(2 * J.stopping * Math.max(0, d - 1));
    }
    return Infinity;
  };

  const reset = () => {
    Water.reset(); // (before any vehicle is dealt out: see Water.allows)
    // how many are about, each way: the level's counts, or the usual ones
    const count = LEVEL.trafficCount !== undefined ? LEVEL.trafficCount : CONFIG.trafficCount;
    const oncoming = LEVEL.oncomingCount !== undefined ? LEVEL.oncomingCount : CONFIG.oncomingCount;
    // (a one-way road with a side road that has oncoming traffic: a few more, coming the other way, for that alone)
    const sideOnly = Track.flow === 'north' && Track.exits.some(x => x.oncoming) ? CONFIG.ramps.sideOncoming : 0;
    cars.forEach((car, i) => {
      const north = Track.flow === 'north' ? i < count + oncoming || i >= count + oncoming + sideOnly : Track.flow !== 'south' && i < count;
      car.dir = north ? 1 : -1;
      car.bound = north ? 'north' : 'south';
      car.active = false;
      car.unused = i >= count + oncoming + sideOnly; // (never spawned on this level)
      car.fixed = false;
      // (and nothing left over from the last run, on a car that may not be dealt out again for a while)
      blank(car);
      Object.assign(car, { junction: null, parked: false, stalled: false, halted: 0, racer: false, slideVel: 0, respawnIn: 0, shield: 0, emergency: false, hesitant: false, pulledOver: false, pulledFor: null, rival: null, toad: null, rush: false, swung: false });
    });
    placeFixed();
    nextEmergency = LEVEL.emergencies ? between(LEVEL.emergencies.every) : Infinity;
    nextProcession = LEVEL.processions ? between(LEVEL.processions.every) : Infinity;
    nextConvoy = LEVEL.convoys ? between(LEVEL.convoys.every) : Infinity;
    wrecks.length = 0;
    reversibles = (LEVEL.reversible || []).map(r => ({ ...r, flipped: false, next: 0 }));
    if (!mix().length) return; // otherwise an empty road
    // (when everything is oncoming, the first of it starts further off)
    // (the Battlefield's green army never starts out ahead: it all comes up from behind the player, see update)
    for (const car of cars) if (!car.active && !car.unused && !(LEVEL.battle && car.dir > 0)) spawn(car, Track.flow === 'south' ? 200 : 60, CONFIG.spawnMax);
  };

  const update = (dt) => {
    if (Traffic.frozen) return; // (TRAFFIC FREEZE, a mystery: every car stands where it is, solid; see mysteries.js)
    Water.marshal(cars); // (a level's water stages: who is to wait at the water's edge, and where)
    // now and then an emergency vehicle, either way (one at a time; if there is no room for it
    // just now, it tries again a second later)
    if (LEVEL.emergencies && !cars.some(c => c.active && c.emergency) && (nextEmergency -= dt) <= 0) {
      const dir = Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1 : Math.random() < 0.5 ? 1 : -1;
      nextEmergency = startEmergency(dir) ? between(LEVEL.emergencies.every) : 1;
    }
    // now and then a funeral procession, either way (one at a time; with no room for it just now,
    // it tries again a little later)
    if (LEVEL.processions && !cars.some(c => c.active && c.procession) && (nextProcession -= dt) <= 0) {
      const dir = Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1 : Math.random() < 0.6 ? 1 : -1;
      nextProcession = startProcession(dir) ? between(LEVEL.processions.every) : 2;
    }
    // now and then a convoy, either way (one at a time; with no room for it just now, it tries again a little later)
    if (LEVEL.convoys && !cars.some(c => c.active && c.convoy) && (nextConvoy -= dt) <= 0) {
      const dir = Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1 : Math.random() < 0.65 ? 1 : -1;
      nextConvoy = startConvoy(dir) ? between(LEVEL.convoys.every) : 2;
    }
    for (const w of wrecks) w.t -= dt; // (a wreck is worth a look for a while)
    for (let i = wrecks.length - 1; i >= 0; i--) if (wrecks[i].t <= 0) wrecks.splice(i, 1);
    for (const r of reversibles) reversed(r, dt);
    if (Track.junctions.length) junctionState();
    if (LEVEL.grid) raceMood(dt);
    huntRoles();
    for (const car of cars) {
      if (car.active && car.junction) { // leaving the road at a junction
        driveJunction(car, dt);
        continue;
      }
      if (!car.active && car.racer) { // a racer wrecked: back in the race where it was wrecked, a moment later
        if ((car.respawnIn = (car.respawnIn || CONFIG.race.respawnTime) - dt) <= 0) {
          const [first, last] = Track.laneRange(1, car.s), lane = clamp(Track.nearestLane(car.lat, car.s), first, last);
          Object.assign(car, { active: true, respawnIn: 0, health: car.maxHealth, smoke: 0, vs: 0, lane, lat: Track.laneOffset(lane, car.s),
            latVel: 0, slideVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, rival: null, pendingLane: null, signal: 0,
            shield: CONFIG.race.respawnShield, wreckedByPlayer: false });
        }
        continue;
      }
      if (car.racer) car.shield = Math.max(0, (car.shield || 0) - dt); // (untouchable, just set down)
      if (!car.active) {
        // (a fixed vehicle that has gone stays gone: its slot is not reused this run)
        // (on, or coming up to, a quiet stretch, a level's "quietZones": everything turning up now the player
        // meets on it, so only its density's share do; the rest wait a while, then try again)
        const quiet = (LEVEL.quietZones || []).find(z => Player.s > z.from - CONFIG.spawnMax && Player.s < z.to);
        if (quiet && (car.quietWait = (car.quietWait || 0) - dt) > 0) continue;
        if (quiet && Math.random() >= quiet.density) { car.quietWait = CONFIG.quietRetry; continue; }
        if (!car.fixed && !car.unused && mix().length) {
          // (the Battlefield's green army: only ever from behind the player, coming by; with no room there yet, later)
          if (LEVEL.battle && car.dir > 0) { spawnBehind(car); continue; }
          const behind = hesitation() && car.dir === Player.dir && Math.random() < H.behindChance && hesitantAhead();
          if (!(behind && spawnBehind(car))) spawn(car, CONFIG.spawnMin, CONFIG.spawnMax);
        }
        continue;
      }
      if (car.racer && Track.loop && car.s >= Track.length) { // (a racer over the line: a lap done, round again)
        car.s -= Track.length;
        car.laps++;
      }
      const ahead = Track.along(car.s) - Track.along(Player.s); // along the course, whichever road
      if (car.fixed && !car.racer && ahead > CONFIG.spawnMax) continue; // still waiting where the level put it
      // (a red one gone by goes up, by no one's hand: see CONFIG.battle.evilBehind)
      if (LEVEL.battle && car.evil && car.health > 0 && ahead < -CONFIG.battle.evilBehind) Object.assign(car, { health: 0, wreckedByPlayer: false, hitBy: null });
      // (an emergency vehicle going the player's way starts out behind the player, and is gone
      // once it is well ahead; one coming the other way once it is behind)
      let gone = !car.emergency ? ahead < -CONFIG.despawnBehind || ahead > CONFIG.spawnMax + 150
        : car.dir > 0 ? ahead < -E.behind - 100 || ahead > CONFIG.spawnMax + 150
        : ahead < -CONFIG.despawnBehind || ahead > CONFIG.spawnMax + 300;
      // (and coming into a quiet stretch, a level's "quietZones", only its density's share go on into it: the rest
      // are taken off while still far enough from the player not to be seen to go, and turn up elsewhere)
      const quiet = (LEVEL.quietZones || []).find(z => car.s >= z.from && car.s < z.to);
      if (quiet && car.quietRoll !== quiet && !car.fixed && !car.racer && !car.emergency && !car.procession && Math.abs(ahead) > CONFIG.quietCull) {
        car.quietRoll = quiet;
        if (Math.random() >= quiet.density) gone = true;
      }
      if ((gone && !car.racer && !(car.hunt > 0) && !car.driver) || !Track.inBounds(car.s)) { // (a racer races on, wherever it is; so does a hunter; one driven from elsewhere is taken off by whatever drives it)
        car.active = false;
        continue;
      }

      car.honkWait = Math.max(0, car.honkWait - dt);
      if (car.arrest >= 0) { // being carried off by the police: it brakes to a stop, and is gone at the end
        car.arrest += dt;
        car.braking = true;
        car.signal = 0;
        car.hazards = false;
        car.vs -= car.vs * Math.min(1, dt * 1.5);
        car.latVel = 0;
        car.s += car.vs * dt;
        Track.transfer(car);
        if (car.arrest >= CONFIG.sirenPickup.arrestTime) car.active = false;
        continue;
      }
      // an angel or a jerk (mysteries): everyone thinks the world of the player, or hates them
      if (Player.mystery === 'angel') car.mood = 1;
      else if (Player.mystery === 'jerk') car.mood = -1;
      if (car.toad) { // TOAD RAGE: straight on at a toad's pace, whatever is in the way
        car.vs = car.dir * CONFIG.mystery.toadSpeed;
        car.latVel = 0;
        car.yaw = car.yawVel = 0;
        car.s += car.vs * dt;
        Track.transfer(car);
        keepOnRoad(car, 0);
        continue;
      }
      if (car.roadblock) { // a roadblock's car: parked across its lane, lights going; a siren has it pull aside
        const R = CONFIG.roadblock, rb = car.roadblock, sh = rb.shared;
        car.vs = car.latVel = car.yawVel = 0;
        car.yaw = Math.PI / 2;
        car.braking = car.hazards = false;
        if (!sh.said && Player.active && car.s - Player.s > 0 && car.s - Player.s < R.warn) { sh.said = true; Message.say('events', 'roadblock'); }
        if (!sh.waved && Player.siren > 0 && Player.active && car.s - Player.s > 0 && car.s - Player.s < R.wave) { sh.waved = true; Message.say('events', 'roadblockWaved'); }
        if (sh.waved) { // over to the shoulder on its side, and clear of the lanes
          const want = Track.shoulderOffset(rb.side, car.s) + rb.side * 1.2;
          car.lat += Math.sign(want - car.lat) * Math.min(Math.abs(want - car.lat), R.aside * dt);
        }
        continue;
      }
      if (car.parade) { // a float: the parade's lead float keeps the band's drum going, and says the parade is coming
        const P = CONFIG.parade, sh = car.parade.shared;
        if (car.parade.lead && Player.active && Math.abs(car.s - Player.s) < P.heard) {
          if ((sh.beat -= dt) <= 0) { sh.beat = P.drumEvery; sfxAt('drum', car.s, 0.8); }
          if (!sh.said && car.s > Player.s) { sh.said = true; Message.say('events', 'parade'); }
        }
      }
      if (car.icecream) { // an ice-cream van at its stop: its jingle going; a while after the player comes near, off it goes
        const I = CONFIG.iceCream, ic = car.icecream;
        if (ic.timer === null && Player.active && Player.s > car.s - I.trigger) {
          ic.timer = ic.wait;
          Message.say('events', 'iceCream');
        }
        if (car.baseSpeed === 0 && Player.active && Math.abs(car.s - Player.s) < I.heard && (ic.jingle -= dt) <= 0) {
          ic.jingle = I.jingleEvery;
          sfxAt('jingle', car.s, 0.6);
        }
        if (ic.timer !== null && car.baseSpeed === 0 && (ic.timer -= dt) <= 0) { // off it goes
          car.baseSpeed = ic.pace;
          car.hazards = false;
        }
      }
      // a reversed lane (see reversed): a car going the player's way in it moves out, or stops short of it
      for (const r of reversibles) {
        if (!r.flipped || car.dir < 0 || car.lane !== r.lane || car.s < r.from - 120 || car.s > r.to) continue;
        const [first, last] = Track.laneRange(car.dir, car.s);
        const lane = [r.lane - 1, r.lane + 1].find(l => l >= first && l <= last && l !== r.lane && laneClear(car, l, 14));
        if (lane !== undefined) { car.lane = lane; car.pendingLane = null; car.signal = lane - r.lane; }
        else if (car.s < r.from) car.vs *= Math.max(0, 1 - dt * 1.5); // (no room yet: braking before the stretch)
      }
      if (car.reversible && (car.s < car.reversible.from - 20 || !car.reversible.flipped)) { car.active = false; continue; } // (out at the near end of its stretch)
      if (CONFIG.vehicles[car.kind].sheds && car.dir === Player.dir && Player.active) shed(car, dt);
      // ice: a car hitting a patch may spin out (and blow up), the likelier the faster it is going
      // (not one that is parked, nor an ambulance)
      const icy = !!Track.icy(car.s, car.lat);
      if (icy && !car.onIce && !car.parked && !car.emergency && !(car.spin > 0) && !CONFIG.vehicles[car.kind].noSpin &&
          Math.random() < CONFIG.ice.spinPerSpeed * Math.abs(car.vs) * (CONFIG.vehicles[car.kind].spin ?? 1)) {
        spinOut(car);
        car.spinIce = true; // (it skidded: it isn't damaged, so it doesn't smoke for it)
      }
      car.onIce = icy;
      // the tide (going the player's way): a car a wave catches in deep water stalls there
      // (not one that is parked, nor an ambulance)
      const depth = car.dir > 0 ? Tide.depth(car.s, car.lat) : 0;
      if (depth >= CONFIG.tide.deep && !car.stalled && !car.parked && !car.emergency && !car.fixed && !car.driver && !(car.spin > 0) && Tide.surging(car.s)) {
        car.stalled = true;
        car.pendingLane = null;
      }
      // wreckage: a car whose lane is blocked ahead pulls over onto the nearer shoulder, and stops there
      if (!car.halted && !car.emergency && !car.parked && !car.fixed && !car.driver && !(car.spin > 0) && Wreckage.ahead(car)) {
        car.halted = car.lat < (Track.laneLo(car.s) + Track.laneHi(car.s)) / 2 ? -1 : 1;
        car.pendingLane = null;
      }
      if (car.spin > 0 || car.stun > 0) { // (out of control: no signalling, no brakes)
        car.braking = car.hazards = false;
        car.signal = 0;
        car.pendingLane = null;
      }
      if (car.spin > 0) {
        // spun out: no control at all. Its momentum swings round in an arc while the body
        // slowly turns a full circle; it can still hit, and be hit by, anything in its way
        // (a head-on included). When the time is up it blows.
        // (the turn goes into yaw, which is what the hitbox and the model are both drawn from,
        // so the two keep turning together)
        car.spin -= dt;
        car.yaw -= car.spinTurn * dt * 2 * Math.PI / CONFIG.spinTime;
        const speed = Math.hypot(car.vs, car.latVel) * (1 - CONFIG.spinDrag * dt);
        const angle = Math.atan2(car.latVel, car.vs) + car.spinRate * dt;
        car.vs = Math.cos(angle) * speed;
        car.latVel = Math.sin(angle) * speed;
        car.s += car.vs * dt;
        Track.transfer(car);
        car.lat += car.latVel * dt; // (nothing keeps it on the road: it can spin off onto the grass)
        if (car.spin <= 0) car.health = 0;
        continue;
      }

      if (car.wobble > 0) {
        // a critical hit: it shakes from side to side for a moment, then goes
        car.wobble -= dt;
        car.yawVel = Math.sin(car.wobble * 24) * 4;
        // (then it spins out; an 18-wheeler, which never spins, blows up there and then)
        if (car.wobble <= 0) {
          if (CONFIG.vehicles[car.kind].noSpin) car.health = 0;
          else spinOut(car);
        }
      }

      if (car.jam) { // in the queue at a ramp over the jam (see Gambles): stopped in its lane for good; a shove moves it along
        car.vs -= car.vs * Math.min(1, dt * 3);
        car.s += car.vs * dt;
        car.latVel = 0;
        car.braking = true;
        car.signal = 0;
        updateYaw(car, dt);
        continue;
      }
      if (car.parked) { // parked, hazards on: it goes nowhere, but a shove moves it along the shoulder
        car.vs -= car.vs * Math.min(1, dt * 3);
        car.s += car.vs * dt;
        car.latVel = 0;
        car.lat = parkedLat(car.parkSide, car.s);
        car.braking = false;
        car.signal = 0;
        car.hazards = true;
        updateYaw(car, dt);
        continue;
      }
      if (car.stalled) { // stalled in the water, hazards on: it goes nowhere, but can still be shoved about
        car.vs -= car.vs * Math.min(1, dt * 2);
        car.latVel -= car.latVel * Math.min(1, dt * 3);
        car.s += car.vs * dt;
        Track.transfer(car);
        car.lat += car.latVel * dt;
        keepOnRoad(car, 0.3);
        car.braking = false;
        car.signal = 0;
        car.hazards = true;
        updateYaw(car, dt);
        continue;
      }
      if (car.tracksBroken) { // a broken track: it grinds to a halt where it is and goes nowhere after (its gun still works)
        car.vs -= Math.sign(car.vs) * Math.min(Math.abs(car.vs), CONFIG.brokenTracks.stopping * dt);
        car.latVel -= car.latVel * Math.min(1, dt * 6);
        car.s += car.vs * dt;
        Track.transfer(car);
        car.lat += car.latVel * dt;
        keepOnRoad(car, 0.3);
        car.braking = Math.abs(car.vs) > 0.5;
        car.signal = 0;
        car.pendingLane = null;
        if (LEVEL.battle) battle(car, dt);
        updateYaw(car, dt);
        continue;
      }
      if (car.halted) { // pulling over, signalling, then stopped on the shoulder with its hazards on
        const aim = Track.shoulderOffset(car.halted, car.s) + car.halted * 0.4;
        car.vs -= car.vs * Math.min(1, dt * 1.5);
        car.latVel = clamp((aim - car.lat) * 2, -4, 4);
        car.s += car.vs * dt;
        Track.transfer(car);
        car.lat += car.latVel * dt;
        keepOnRoad(car, 0.3);
        const there = Math.abs(aim - car.lat) < 0.5;
        car.braking = Math.abs(car.vs) > 0.5;
        car.signal = there ? 0 : car.halted;
        car.hazards = there;
        updateYaw(car, dt);
        continue;
      }
      if (car.driver) { // driven from elsewhere (a police pursuit: see pursuit.js)
        car.driver(car, dt);
        continue;
      }
      // at a junction, some leave the road down an arm the player can't take (see leaveAtJunction)
      if (leaveAtJunction(car)) continue;
      if (car.emergency) { // an ambulance on its way: see driveEmergency
        driveEmergency(car, dt);
        continue;
      }

      if (car.grudge > 0) car.grudge = Math.max(0, car.grudge - dt); // (it wears off: CONFIG.grudgeTime)
      const emotion = emotionOf(car.mood);
      if (emotion === 'angry' && car.emotion !== 'angry') honk(car); // fed up
      car.emotion = emotion;

      if (car.stun > 0) {
        // knocked out of control: coast, scrub off sideways speed, no lane keeping
        car.stun = Math.max(0, car.stun - dt * (car.courier ? CONFIG.rival.recovery : 1)); // (a rival courier shakes it off quicker)
        car.vs -= car.vs * CONFIG.stunDrag * dt;
        car.latVel -= car.latVel * damp(CONFIG.stunGrip, dt);
        const [first, last] = Track.laneRange(car.dir, car.s);
        car.lane = clamp(Track.nearestLane(car.lat, car.s), first, last);
      } else {
        // evil cars lob packages at other traffic; ones the player has upset aim near the player.
        // In road rage (at a good player) they throw more often; in a turf war (at an evil one) more
        // often still; a wingman throws only at the cars about the player
        if (car.offended > 0) car.offended -= dt;
        const att = attitude(car);
        if (car.evil && Player.active && !LEVEL.noPackages && !LEVEL.battle &&
            Math.abs(car.s - Player.s) < CONFIG.enemyThrowRange) {
          const A = CONFIG.attitude;
          car.throwTimer -= dt * (att === 'turf' ? A.turfThrowRate : att === 'rage' ? A.rageThrowRate : 1);
          if (car.throwTimer <= 0) {
            car.throwTimer = CONFIG.enemyThrowMin + Math.random() * (CONFIG.enemyThrowMax - CONFIG.enemyThrowMin);
            Packages.throwAtGround(car, att === 'wingman' ? 'escort' : null);
          }
        }

        // a rival nearby: this car chases it, crowds it and won't brake for it
        let rival = car.rival;
        if (rival) {
          car.rivalTime -= dt;
          if (car.rivalTime <= 0 || !rival.active || rival.dir !== car.dir ||
              Math.abs(rival.s - car.s) > CONFIG.rivalryRange * 1.5) rival = car.rival = null;
        }
        if (CONFIG.vehicles[car.kind].kerb) rival = car.rival = null; // (a truck keeps out of feuds)
        // a jerk (a mystery): every driver going the player's way and near enough goes after the
        // player as if the player were its rival, and an evil one throws at the player. (Not the
        // police, whose swerving into the player would be a bust, nor oncoming traffic: a head-on.)
        if (Player.mystery === 'jerk' && Player.active && car.kind !== 'police' && !car.procession && !CONFIG.vehicles[car.kind].kerb && car.dir === Player.dir &&
            Math.abs(Player.s - car.s) < CONFIG.rivalryRange) {
          rival = Player;
          car.grudge = CONFIG.grudgeTime;
        }
        // a turf war (an angry evil driver, an evil player): it starts hunting the player once near,
        // and goes after it as its rival until it gives up (see CONFIG.attitude.hunt)
        if (att === 'turf' && !(car.hunt > 0) && Math.abs(Player.s - car.s) < CONFIG.attitudeRange) startHunt(car);
        if (car.hunt > 0) {
          car.hunt -= dt;
          if (att === null || Player.s - car.s > CONFIG.attitude.hunt.lost) car.hunt = 0;
          if (car.hunt <= 0) { // (it gives up, and cools off)
            car.hunt = 0;
            car.mood = Math.max(car.mood, -0.2);
          } else rival = Player;
        }

        // a siren (the player's, a pickup, or an emergency vehicle's): a car ahead in the lane it
        // wants cleared moves over to its own right: a lane over if that one is clear, or else
        // (from its outside lane, or with the next lane taken) onto the shoulder, the only time
        // traffic uses one; never towards the oncoming lanes. It stays pulled over, slowed, for as
        // long as the player's siren sounds, or until the emergency vehicle is by.
        const siren = sirenFor(car);
        if (car.pulledOver && !stillPulledOver(car)) {
          car.pulledOver = false;
          car.pulledFor = null;
        }
        // (lanes are compared where they lead here: where the road narrows, a car's lane may have
        // merged into the siren's, and there may be no lane to move over into, only the shoulder)
        if (siren && !car.pulledOver && Track.openLane(car.lane, car.s) === sirenLane(siren, car)) {
          const [first, last] = Track.laneRange(car.dir, car.s);
          const here = Track.openLane(car.lane, car.s), next = here + (car.dir > 0 ? 1 : -1);
          if (next >= first && next <= last && Track.openLane(next, car.s) === next && laneClear(car, next, 10)) car.lane = next;
          else {
            car.pulledOver = true;
            car.pulledFor = siren;
          }
          // (signalling to its right as it goes, whatever its manners: see the hazards below)
          car.pendingLane = null;
          car.signal = car.dir;
        }
        // (with a siren behind it, a car drops any feud it has, so its rival can't drag it back
        // into the siren's way; the feud may start up again once the siren has passed)
        if (siren) rival = null;

        // heading for a ramp, or the lane ends ahead: change lane, or ease off until there is room.
        // (a courteous driver sees it coming that much sooner, and signals first)
        const ramp = rampLane(car);
        // (a vehicle that keeps to the kerb heads back to it once it can, after a narrowing)
        const home = CONFIG.vehicles[car.kind].kerb ? kerbLane(car.dir, car.s) : car.lane;
        // (and going the player's way, a good driver moves out of the way of the tide's water as it
        // comes in, and of a wave as soon as it is warned of; an evil one ploughs on through)
        const dry = (s) => car.dir > 0 && !car.evil ? Tide.dryLane(s) : Infinity;
        const lead = (reach) => ramp !== car.lane ? ramp : Math.min(Track.openLane(home, car.s + car.dir * reach), dry(car.s + car.dir * reach));
        const open = lead(70);
        let squeezed = false;
        if (courteous(car)) {
          const soon = lead(70 + Math.abs(car.vs) * CONFIG.signalTime);
          if (soon !== car.lane && car.pendingLane !== soon) signalTo(car, soon, true);
          squeezed = open !== car.lane; // (until it has moved over)
        } else if (open !== car.lane) {
          if (laneClear(car, open, 12)) car.lane = open;
          else squeezed = true;
        }
        // signalled long enough: move over if there is room (a move it has to make waits for it)
        if (car.pendingLane !== null && (car.signalTime -= dt) <= 0) {
          const lane = car.pendingLane;
          if (car.pendingForced ? laneClear(car, lane, 12) : canMove(car, lane, false)) {
            car.lane = lane;
            car.pendingLane = null;
          } else if (!car.pendingForced) {
            car.pendingLane = null;
            car.signal = 0;
          }
        }

        car.think -= dt;
        if (car.think <= 0 && !car.wrongWay) { // (a wrong-way driver makes no plans: it keeps on down its lane)
          car.think = 1 + Math.random() * 2;
          think(car);
        }
        if (LEVEL.battle) battle(car, dt); // (at war: see battle)

        // hold back behind anything directly ahead (in this car's direction of travel)
        // (a racer in another's slipstream can go that much faster: see CONFIG.race)
        // (and one on the attack, just out of a tow, is carried on by it a while: its slingshot)
        car.tow = car.racer ? tow(car, car.s, car.lat, car.hw) : 0;
        if (car.racer) {
          // (on the attack until it is by the car it is passing, or has dropped back, up to passMax s)
          const v = car.passing;
          if (v && car.attack > 0) {
            const ds = (v.s - car.s) * car.dir;
            car.passFor = (car.passFor || 0) + dt;
            if (ds > -(v.hl + car.hl) && ds < 40 && car.passFor < CONFIG.race.passMax && (v === Player || v.active)) car.attack = Math.max(car.attack, 0.3);
            else car.passing = null;
          }
          car.attack = Math.max(0, (car.attack || 0) - dt);
          car.slingLeft = Math.max(0, (car.slingLeft || 0) - dt);
        }
        const sling = car.slingLeft > 0 ? car.sling * car.slingLeft / car.slingTotal : 0;
        let target = (squeezed ? car.baseSpeed * 0.6 : car.baseSpeed) * (1 + CONFIG.race.draft * Math.max(car.tow, sling) + CONFIG.race.slingKick * sling) *
          (furious(car) ? CONFIG.race.fury.pace : 1) * (1 + (CONFIG.race.chase.pace - 1) * chasing(car));
        if (car.racer && LEVEL.grid?.rival) target = rivalPace(car, target, dt); // (a rival courier: see rivalPace)
        if (car.pulledOver) target = car.baseSpeed * CONFIG.sirenPickup.pulledOverPace;
        // in a convoy: right on the one ahead, and shutting the gap in the player's face (see CONFIG.convoy)
        if (car.convoy?.ahead) {
          const a = car.convoy.ahead, G = CONFIG.convoy;
          if (!a.active) car.convoy.ahead = null; // (the one ahead gone: this one leads now)
          else {
            if (a.lane !== car.lane) { car.lane = a.lane; car.pendingLane = null; } // (it follows the one ahead into any lane it takes)
            const gap = (a.s - car.s) * car.dir - a.hl - car.hl, mid = a.s - car.dir * (a.hl + gap / 2);
            target = Math.max(0, Math.abs(a.vs) + (gap - G.gap) * G.close);
            const merging = Player.active && Math.abs(Player.s - mid) < gap / 2 + Player.hl && Math.abs(Player.lat - car.lat) < CONFIG.laneWidth * 1.3 &&
              Math.abs(Player.lat - car.lat) > car.hw + Player.hw - 0.3 && Player.latVel * Math.sign(car.lat - Player.lat) > 0.3;
            if (merging) target += G.shut;
          }
        }
        if (!car.racer && !car.emergency && !car.parade && !car.roadblock && !car.icecream && !car.procession && !LEVEL.battle) target = rubberneck(car, target, dt);
        if (car.kind === 'driveby' && !car.punctured) target = driveBy(car, target, dt); // (out for trouble)
        // (on a level whose police are only in some stretches, its traffic zones', a police car that comes
        // to the edge of its stretch stays there, parked on the shoulder with its lights going: beyond it,
        // as in The Hood's gang turf, there are no police at all)
        if (car.kind === 'police' && !car.stationed && policeOnStation()) {
          const reach = 15 + Math.abs(car.vs) * 2.5; // (far enough ahead to slow and pull over before the edge)
          if (!(weightsAt(car.s).police > 0) || !(weightsAt(car.s + car.dir * reach).police > 0)) {
            car.stationed = true;
            // where its stretch ends: the first point ahead with no police, to stop short of
            let edge = car.s;
            for (let d = 0; d <= reach && weightsAt(edge).police > 0; d += 2) edge = car.s + car.dir * d;
            car.stationEdge = edge;
          }
        }
        if (car.stationed) {
          target = Math.abs(car.lat - Track.shoulderOffset(car.dir > 0 ? 1 : -1, car.s)) < 0.8 ? 0 : car.baseSpeed * 0.35;
          // and never past the edge of its stretch, however long it takes to get over: slow enough to stop
          // CONFIG.stationShort m short of it (braking at CONFIG.stationBrake m/s^2)
          const left = (car.stationEdge - car.s) * car.dir - CONFIG.stationShort, most = Math.sqrt(2 * CONFIG.stationBrake * Math.max(0, left));
          target = Math.min(target, most);
          if (Math.abs(car.vs) > most) car.vs = car.dir * most; // (braking, not easing off: easing off would roll it over)
        }
        // (a flat tyre: over onto the shoulder on its side, slowing, and stopped once there)
        if (car.punctured) target = Math.abs(car.lat - Track.shoulderOffset(car.dir > 0 ? 1 : -1, car.s)) < 0.8 ? 0 : car.baseSpeed * 0.35;
        if (car.shoulderRun && car.attack < 0.5) car.attack = 0.5; // (on the attack all the way up the shoulder)
        if (rival) {
          // get into its lane, then catch it up or drop back onto it
          // (in a race, a rival behind is only blocked: see CONFIG.race.blockEvery; and one alongside
          // is kept pace with, not dropped back on)
          car.pendingLane = null;
          car.signal = 0;
          const [first, last] = Track.laneRange(car.dir, car.s);
          const lane = clamp(rival.isPlayer ? Track.nearestLane(rival.lat, rival.s) : rival.lane, first, last);
          let gap = (rival.s - car.s) * car.dir;
          if (Track.loop) gap = ((gap % Track.length) + Track.length * 1.5) % Track.length - Track.length / 2; // (either side of the line)
          car.blockWait = Math.max(0, (car.blockWait || 0) - dt);
          if (!car.racer) {
            car.lane = lane;
            target = car.baseSpeed * (gap > 0 ? 1.35 : 0.7);
          } else if (gap < -(rival.hl + car.hl)) { // (behind it: a block)
            if (lane !== car.lane && car.blockWait <= 0 && laneClear(car, lane, 6) && roomToBlock(car, rival)) {
              car.lane = lane;
              car.blockWait = CONFIG.race.blockEvery;
            }
          } else {
            car.lane = lane;
            target = gap > 0 ? car.baseSpeed * 1.35 : Math.max(target, Math.abs(rival.vs));
          }
        }
        // (the hunters: see CONFIG.attitude.hunt)
        if (car.hunt > 0 && rival === Player) {
          const H2 = CONFIG.attitude.hunt, [first, last] = Track.laneRange(car.dir, car.s);
          const playerLane = clamp(Track.nearestLane(Player.lat, Player.s), first, last);
          if (car.huntRole === 'block') { // ahead of it in its lane, slowing it, braking hard now and then
            if (car.lane !== playerLane && roomToBlock(car, Player) && mayBlock(car)) { // (moving over only with room, see roomToBlock; and again only with a grudge, see mayBlock)
              car.lane = playerLane;
              car.blockedPlayer = true;
            }
            target = Player.speed * H2.blockPace;
            brakeCheck(car, dt);
          } else if (car.huntRole === 'flank') { // in the lane beside it, coming up alongside to lean on it
            const side = playerLane + 1 <= last ? playerLane + 1 : playerLane - 1;
            if (side >= first) car.lane = side;
            target = Player.s - car.s > car.hl + Player.hl ? Player.speed + H2.catchUp : Player.speed;
          } else if (car.huntRole === 'drop') { // one too many ahead of it: dropping back, to come at it from behind
            target = Math.max(0, Player.speed - H2.catchUp);
          } else if (Player.s > car.s) { // behind it: closing in, never falling away
            target = Math.max(target, Player.speed + H2.catchUp);
          }
        }
        // (the other attitudes to the player that show in how fast it goes)
        if (att && att !== 'turf') {
          const A = CONFIG.attitude, dl = Math.abs(Track.nearestLane(Player.lat, Player.s) - car.lane);
          const ds = Player.s - car.s; // (how far the player is ahead of it)
          const besideIt = dl === 1 && Math.abs(ds) < car.hl + Player.hl + 4;
          if (att === 'friendly' && besideIt) target *= A.letIn; // (easing off: in you come)
          if ((att === 'sulky' || att === 'vigilante') && besideIt && ds > 0) target = Math.max(target, Math.min(Player.speed, car.baseSpeed * 1.2)); // (keeping level: no you don't)
          if (att === 'distant' && ds > 0 && ds < A.distance) target *= A.distantPace;
          if (att === 'smug' && ds < 0 && -ds < A.brakeCheckRange + 10 && dl === 0) { // (in the way, dawdling, braking hard now and then)
            target *= A.dawdle;
            brakeCheck(car, dt);
          }
        }
        let held = null;
        // (a racer's rival ahead: it closes right up on it, and gives it a shove: see CONFIG.race.nudge)
        const nudging = car.racer && rival && !rival.isPlayer;
        for (const o of cars) {
          if (o === car || !o.active || (o === rival && !nudging) || o.junction) continue;
          if (LEVEL.battle && o.dir !== car.dir) continue; // (on the Battlefield an enemy coming at it is no car to follow)
          const gap = (o.s - car.s) * car.dir;
          if (o === rival) {
            if (gap > 0 && gap < o.hl + car.hl + 6 && Math.abs(o.lat - car.lat) < o.hw + car.hw) target = Math.min(target, Math.abs(o.vs) + CONFIG.race.nudge);
            continue;
          }
          // (a racer, at racing speed, holds back further the faster it is closing; but sitting on the
          // grid it keeps close behind, and gets away with the rest)
          // (and a racer pulling out past it, still overlapping it on the way across, only keeps off
          // its gearbox: it doesn't run into it, half a second off)
          const pushy = car.racer || car.escaping; // (a racer, or a car making its getaway: see driveBy)
          const passing = pushy && o.lane !== car.lane, closing = Math.max(0, Math.abs(car.vs) - Math.abs(o.vs));
          const inSameProcession = car.procession && o.procession === car.procession;
          const room = o.hl + car.hl + (inSameProcession ? 2 : passing ? 1 + closing * 0.5 : pushy ? 2 + closing * 1.5 : 8);
          if (gap > 0 && gap < room && Math.abs(o.lat - car.lat) < o.hw + car.hw) {
            // (a racer sits in its tow, on its pace, ready to pull out; only too close does it back off)
            target = Math.min(target, Math.abs(o.vs) * (inSameProcession ? 1 : car.racer && gap > o.hl + car.hl + 3 ? 0.99 : 0.9));
            held = o;
          }
        }
        // a car coming at it in its lane, the wrong way (off a side road: see Track.transfer): looking well
        // ahead, as they close fast, it moves over a lane if it can, and stops if it can't. The wrong-way
        // driver itself keeps to its lane, swerving over only for one stopped or slowing in front of it
        if (!LEVEL.battle && Track.isMain(car.s)) {
          const W = CONFIG.wrongWay;
          let head = null, near = Infinity;
          for (const o of [...cars, Player]) {
            if (o === car || !o.active || o.junction || (o.isPlayer && Player.ghost > 0)) continue;
            const odir = o.isPlayer ? 1 : o.dir;
            if (odir === car.dir || !(car.wrongWay || o.wrongWay)) continue;
            const gap = (o.s - car.s) * car.dir, closing = Math.abs(car.vs) + Math.abs(o.isPlayer ? Player.speed : o.vs);
            if (gap > 0 && gap < W.look + closing * W.lookTime && gap < near && Math.abs(o.lat - car.lat) < o.hw + car.hw + 0.3) { near = gap; head = o; }
          }
          if (head) {
            const tries = car.wrongWay ? [car.dir > 0 ? 1 : -1, car.dir > 0 ? -1 : 1] : [1, -1]; // (the wrong-way one: over towards the middle first)
            const first = 0, last = Track.laneCount - 1;
            const free = tries.map(d => car.lane + d).find(l => l >= first && l <= last && Track.openLane(l, car.s) === l &&
              (car.wrongWay ? laneClear(car, l, W.room) : canMove(car, l, false)));
            if (free !== undefined && (!car.wrongWay || near < W.swerve)) { car.lane = free; car.pendingLane = null; }
            else if (!car.wrongWay || near < W.swerve) target = Math.min(target, Math.max(0, (near - W.stopShort) * 0.5)); // (no way round: stopping)
          }
          if (car.wrongWay) {
            car.pendingLane = null;
            // coming up on the player: a warning as it comes within `warn` m, and it leans on its horn
            // every `horn` s from there on until it is by (its lights flash: see render/cars.js)
            const ahead = car.s - Player.s;
            if (Player.active && ahead > 0 && ahead < W.warn) {
              if (!car.wrongWarned) { car.wrongWarned = true; Message.say('events', 'wrongWay'); car.wrongHorn = 0; }
              if ((car.wrongHorn -= dt) <= 0) { car.wrongHorn = W.horn; sfxAt(HORNS[car.kind] || 'horn', car.s, 1.5); }
            }
          }
        }
        // one alongside on the attack, with a bend coming: it is given the corner (see CONFIG.race.cede)
        let ceding = 1;
        if (car.racer && racingLine(car) < Math.abs(car.vs)) {
          for (const o of cars) {
            if (o === car || !o.active || !o.racer || !(o.attack > 0) || o.lane === car.lane) continue;
            const ds = (o.s - car.s) * car.dir;
            if (ds > -(car.hl + 1) && ds < o.hl + car.hl && Math.abs(o.lat - car.lat) < o.hw + car.hw + CONFIG.laneWidth) {
              ceding = car.evil ? CONFIG.race.evilCede : CONFIG.race.cede;
              break;
            }
          }
        }
        // a rival courier stuck behind ordinary traffic with no way by loses patience: it rams it out of its
        // way (and an evil one throws at it as well). Not the police, nor another racer (see CONFIG.rival.ram)
        if (car.courier || car.escaping) { // (and a drive-by making its getaway)
          const R = CONFIG.rival.ram, blocking = held && !held.racer && !held.isPlayer && held.kind !== 'police' && !car.oncoming && !car.shoulderRun ? held : null;
          // (its patience runs out while anything ordinary holds it up, and comes back slowly once clear)
          car.blockedFor = blocking ? (car.blockedFor || 0) + dt : Math.max(0, (car.blockedFor || 0) - dt * 0.5);
          car.blockedBy = blocking;
          if (blocking && car.blockedFor > R.after) {
            target = Math.max(target, Math.abs(blocking.vs) + R.closing); // (no holding back: into the back of it)
            if (car.evil && Player.active && !LEVEL.noPackages && (car.clearThrow = (car.clearThrow ?? 0) - dt) <= 0) {
              car.clearThrow = R.throwEvery;
              Packages.throwAtGround(car, blocking);
            }
          }
        }
        // good and evil racers close together: the evil one bullies, the good one, racing clean, gives way
        car.squeeze = 0;
        if (car.racer) {
          const B = CONFIG.race.bully;
          car.yieldWait = Math.max(0, (car.yieldWait || 0) - dt);
          let lifted = false;
          for (const o of cars) {
            if (o === car || !o.active || !o.racer || o.evil === car.evil || o.shield > 0) continue;
            let ds = o.s - car.s;
            if (Track.loop) ds = ((ds % Track.length) + Track.length * 1.5) % Track.length - Track.length / 2; // (either side of the line)
            const alongside = Math.abs(ds) < o.hl + car.hl + 1 && Math.abs(o.lat - car.lat) < o.hw + car.hw + B.room;
            if (car.evil) { // leaning on it (once right alongside it, not clipping it from behind)
              if (alongside && Math.abs(ds) < o.hl + car.hl - 1) car.squeeze = Math.sign(o.lat - car.lat) || 1;
              continue;
            }
            if (alongside && !lifted && !(car.attack > 0)) { // lifting, to keep out of trouble (unless it is the one passing: it commits)
              target *= B.lift;
              lifted = true;
            }
            // one on its gearbox: it moves over and lets it by
            if (ds < 0 && ds > -(o.hl + car.hl + B.behind) && Math.abs(o.lat - car.lat) < o.hw + car.hw && car.yieldWait <= 0) {
              car.yieldWait = B.yieldEvery;
              for (const d of [1, -1]) {
                if (!canMove(car, car.lane + d, false)) continue;
                car.lane += d;
                car.signal = d;
                car.pendingLane = null;
                break;
              }
            }
            if (alongside || ds < 0 && ds > -(o.hl + car.hl + B.behind)) { // (and sours at being pushed about, as the bully cheers up)
              car.mood = Math.max(-1, car.mood - B.mood * dt);
              o.mood = Math.min(1, o.mood + B.mood * dt);
            }
          }
        }
        // (and an evil racer bullies the player as it does a good racer: it leans on the player alongside,
        // and just ahead of the player, it moves across into the player's lane)
        if (car.racer && car.evil && Player.active) {
          const B = CONFIG.race.bully, ds = car.s - Player.s;
          // (going by, it waits till it is half past to lean across on you: a chop)
          const leanFrom = car.passing === Player && car.attack > 0 ? 0 : -(Player.hl + car.hl - 1);
          if (ds > leanFrom && ds < Player.hl + car.hl - 1 && Math.abs(Player.lat - car.lat) < Player.hw + car.hw + B.room) car.squeeze = Math.sign(Player.lat - car.lat) || 1;
          const lane = Track.nearestLane(Player.lat, Player.s);
          if (ds > car.hl + Player.hl && ds < car.hl + Player.hl + 12 && lane !== car.lane && car.blockWait <= 0 && laneClear(car, lane, 6)) {
            car.lane = lane;
            car.blockWait = CONFIG.race.blockEvery;
          }
        }
        // a racer out on its own goes looking for a tow (not one that has just pulled out to pass)
        // (a rival courier doesn't: on an ordinary road, a tow lines it up behind the others, and stuck with them)
        if (car.racer && !car.courier && !held && !rival && !(car.attack > 0)) seekTow(car, dt);
        // a racer held up behind a slower car (or catching it in its tow) pulls out to pass it, into
        // whichever lane beside is clear; and the player, in a race, is passed like any other car
        const pg = Player.s - car.s;
        const behindPlayer = car.racer && !held && Player.active && Player.ghost <= 0 && car.dir > 0 && pg > 0 &&
          pg < Player.hl + car.hl + 8 + Math.max(0, Math.abs(car.vs) - Player.speed) * 1.5 && Math.abs(Player.lat - car.lat) < Player.hw + car.hw;
        const blocker = held || (behindPlayer ? { s: Player.s, hl: Player.hl, vs: Player.speed, isPlayer: true } : null);
        // (passing the player, and the player moves over to shut the door: it dummies, and goes for the other side, if that is open)
        car.feint = Math.max(0, (car.feint || 0) - dt);
        if (car.racer && car.passing === Player && car.attack > 0 && car.feint <= 0 && pg > car.hl && !roomBy(car, car.lane, car.passSide) && roomBy(car, car.lane, -car.passSide)) {
          const [first, last] = Track.laneRange(car.dir, car.s);
          car.passSide = -car.passSide;
          car.lane = clamp(Track.nearestLane(Player.lat + car.passSide * (Player.hw + car.hw + 0.3), car.s), first, last);
          car.signal = car.passSide;
          car.feint = CONFIG.race.feintEvery;
        }
        // (once out to pass, it is committed: it doesn't think again until it is by, or has given up)
        // (unless it is something else holding it up now, in the lane it went out into)
        const committed = car.passing && car.attack > 0 && (blocker === car.passing || (blocker?.isPlayer && car.passing === Player));
        if ((car.racer || car.escaping) && blocker && !rival && !committed && (car.overtake = (car.overtake || 0) - dt) <= 0) {
          car.overtake = 0.6;
          for (const d of Math.random() < 0.5 ? [1, -1] : [-1, 1]) {
            const lane = car.lane + d, free = blocker.isPlayer ? canMove(car, lane, true) && roomBy(car, lane) : canMove(car, lane, false);
            if (!free || !worthPassing(car, blocker, lane)) continue;
            car.lane += d;
            car.signal = d;
            car.pendingLane = null;
            car.attack = CONFIG.race.attackTime; // (on the attack: see CONFIG.race)
            car.passing = blocker.isPlayer ? Player : blocker;
            car.passFor = 0;
            car.passSide = blocker.isPlayer ? sideOf(car, lane) : 0; // (the side of the player it is going by on)
            car.feint = CONFIG.race.feintEvery;
            // (out of a tow: the slingshot, the longer the more the tow had it going: see CONFIG.race)
            const R = CONFIG.race, gain = Math.max(0, Math.abs(car.vs) - car.baseSpeed);
            car.sling = car.tow >= R.slingFrom && gain * R.slingPerGain > 0.2 ? car.tow : 0;
            car.slingLeft = car.slingTotal = car.sling ? Math.min(R.slingMax, gain * R.slingPerGain) : 0;
            car.vs += car.dir * car.baseSpeed * R.slingKick * car.sling; // (its kick)
            break;
          }
          if (!(car.attack > 0) && !car.oncoming) passOncoming(car, blocker);
          if (!(car.attack > 0) && !car.oncoming) passShoulder(car, blocker); // (a rival courier: up the shoulder)
        }
        if (car.oncoming) backFromOncoming(car);
        if (car.shoulderRun) backFromShoulder(car, dt);
        if (car.racer && LEVEL.grid?.rival) { rivalObstacles(car, dt); rivalPickups(car); }
        // held up behind a slow player: mood sours; angry evil drivers don't brake for you (they ram
        // you), angry good ones sit right on your bumper; an evil racer gives you a nudge
        const gap = Player.s - car.s, tailgater = att === 'sulky' || att === 'vigilante' || !!CONFIG.vehicles[car.kind].tailgates; // (or a boy racer)
        const passingPlayer = car.passing === Player && car.attack > 0 && gap > Player.hl + car.hl + 1 + Math.max(0, Math.abs(car.vs) - Player.speed) * 0.5;
        if (Player.active && Player.shield <= 0 && Player.ghost <= 0 && car.dir > 0 && gap > 0 && gap < Player.hl + car.hl + (tailgater ? CONFIG.attitude.tailgate : 8) && !passingPlayer &&
            Math.abs(Player.lat - car.lat) < Player.hw + car.hw && Player.speed < car.baseSpeed) {
          car.mood = Math.max(-1, car.mood - CONFIG.moodHoldUp * dt);
          car.grudge = CONFIG.grudgeTime;
          honk(car);
          if (car.racer && car.evil) target = Math.min(target, Player.speed + CONFIG.race.nudge);
          else if (!(car.evil && car.emotion === 'angry' && !car.spite) || car.racer) target = Math.min(target, Player.speed * (tailgater ? 0.98 : 0.9));
        }
        // giving way at a junction while a car is leaving across it; and no faster than the bends ahead allow
        // (on ice, and on a level where cars understeer, they don't slow for a bend: they slide wide instead;
        // though a racer, knowing the track, slows for the bends ahead as much as lets it slide a little)
        target = Math.min(target, giveWay(car), car.onIce || LEVEL.understeer ? Infinity : cornerSpeed(car.s, weightOf(car)));
        const hold = Math.min(Crossings.holdFor(car), StopGo.holdFor(car), Hazards.holdFor(car), Water.holdFor(car)); // (waiting at a level crossing, or a STOP; or one of Hazards'; or at the water's edge)
        const cyclists = passPeloton(car); // (giving cyclists room, or waiting behind them for it)
        // quirks of its kind (see CONFIG.vehicles): a bin lorry pulling up where it is, every so often
        const quirk = CONFIG.vehicles[car.kind];
        if (quirk.stops && !car.pulledOver) {
          if (car.binStop > 0) { car.binStop -= dt; target = 0; }
          else if ((car.binWait -= dt) <= 0) { car.binWait = between(quirk.stops.every); car.binStop = between(quirk.stops.time); }
        }
        // (and an ice cream van's tune, near the player; one at a stop has that tune's own timing: see CONFIG.iceCream)
        if (quirk.jingle && !car.icecream && Math.abs(car.s - Player.s) < CONFIG.hornRange * 2 && (car.jingleWait -= dt) <= 0) { car.jingleWait = quirk.jingle; sfxAt('jingle', car.s, 0.8); }
        target = Math.min(target, hold, cyclists.hold);
        if (Player.mystery === 'sundayDrivers' && !car.racer && !car.emergency) target *= CONFIG.mystery.sundayPace; // (Sunday Drivers, a mystery: pottering along)
        if (car.racer) target = Math.min(target, racingLine(car) * ceding);
        if (car.racer && !Track.loop && Track.finished(car.s)) { car.done = true; target = 0; } // (a rival courier, delivered: it pulls up past the line)
        if (Track.muddy(car.s)) target *= CONFIG.mud.trafficPace; // (in mud)
        car.inGravel = Track.gravels.length > 0 && Track.gravelAt(car.s, car.lat); // (in a gravel trap: slowed hard; see CONFIG.gravel)
        if (car.inGravel) { // (and it steers back out, towards the road)
          target *= CONFIG.gravel.trafficPace;
          car.lat -= Math.sign(car.lat - (Track.laneLo(car.s) + Track.laneHi(car.s)) / 2) * CONFIG.gravel.trafficOut * dt;
        }
        target *= Water.pace(car); // (an amphibious car afloat on a water stage)
        // wading through the tide's water: slowed, the more so in deep water
        if (depth > CONFIG.tide.wet) target *= depth >= CONFIG.tide.deep ? CONFIG.tide.trafficPace : 0.8;
        // hesitating: every so often a touch of the brakes, sharply
        if (car.hesitant && (car.tapWait -= dt) <= 0) {
          car.tap = H.tapTime;
          car.tapWait = between(H.tapEvery);
        }
        if (car.tap > 0) {
          car.tap -= dt;
          target *= H.tapPace;
        }
        car.braking = car.tap > 0 || Math.abs(car.vs) > target + 0.8;
        if (Math.min(hold, cyclists.hold) < Math.abs(car.vs)) { // (pulling up at a stop line, or behind cyclists: braking firmly, so as to stop at it, not past it)
          car.vs -= car.dir * Math.min(Math.abs(car.vs) - target, 1.5 * CONFIG.junction.stopping * dt);
        } else car.vs += (car.dir * target - car.vs) * damp(car.tap > 0 || (car.racer && car.braking) ? 3 : car.racer ? 1.2 * CONFIG.race.aiPickup : 1.2, dt);

        // spring back to the lane centre
        // (alongside its rival it steers straight at it, but never over into the oncoming lanes after it)
        const beside = rival && car.waterWait == null && Math.abs(rival.s - car.s) < rival.hl + car.hl + 2; // (not one waiting at the water's edge: it stays in its queue)
        const ownSide = (lat) => {
          const [first, last] = Track.laneRange(car.dir, car.s), a = Track.laneOffset(first, car.s), b = Track.laneOffset(last, car.s);
          return clamp(lat, Math.min(a, b), Math.max(a, b));
        };
        let aimLat = beside ? ownSide(rival.lat)
          : car.pulledOver || car.shoulderRun || car.punctured || car.stationed || car.waterWait != null ? Track.shoulderOffset(car.dir > 0 ? 1 : -1, car.s) // (the shoulder on its right; waterWait: in the queue at the water's edge, see Water)
          : StopGo.detour(car) ?? cyclists.lat ?? Track.laneOffset(car.lane, car.s); // (through stop / go works, coming the other way: in the lane left open)
        if (car.passing === Player && car.attack > 0 && !beside && Math.abs(Player.s - car.s) < Player.hl + car.hl + 10) {
          // (going by the player, it keeps as far from it as the road allows: squeezing by, if the player is astride the lanes)
          const side = car.passSide || Math.sign(aimLat - Player.lat) || 1, clear = Player.lat + side * (Player.hw + car.hw + 0.3);
          aimLat = clamp(side > 0 ? Math.max(aimLat, clear) : Math.min(aimLat, clear), Track.lo(car.s) + car.hw, Track.hi(car.s) - car.hw);
        }
        // the indicator goes off once the car is in its new lane (or on the shoulder), and a car
        // pulled over onto the shoulder puts its hazards on
        const settled = Math.abs(aimLat - car.lat) < 0.3;
        if (settled && car.pendingLane === null) car.signal = 0;
        car.hazards = ((car.pulledOver || car.punctured) && (car.hazards || settled)) || car.binStop > 0; // (or a bin lorry at a stop)
        const drift = car.hesitant && !beside && !car.pulledOver ? Math.sin(car.wander += dt * 1.3) * H.wander
          : quirk.sway && !car.pulledOver ? Math.sin(car.wander += dt * 1.7) * quirk.sway * Math.min(1, Math.abs(car.vs) / 12) : 0; // (a caravan, swaying)
        // (and nothing is ever steered into a median: not even after a rival who has gone in there)
        let aim = aimLat + drift + (beside ? 0 : car.squeeze * CONFIG.race.bully.squeeze); // (an evil racer leaning on a good one)
        if (Track.medianHalf) aim = car.dir > 0 ? Math.max(aim, Track.medianHalf + car.hw) : Math.min(aim, -Track.medianHalf - car.hw);
        const sharp = car.racer && car.attack > 0 && !car.squeeze ? CONFIG.race.passSharp : 1; // (a racer going for a gap moves across sharply)
        const wantVel = clamp((aim - car.lat) * CONFIG.trafficLaneChangeRate * sharp, -6 * sharp, 6 * sharp);
        car.latVel += (wantVel - car.latVel) * damp(6 * sharp, dt);
      }

      // an oncoming car passing close by may lean on its horn as it goes
      if (car.dir < 0 && !noHorn(car) && Player.active && car.s > Player.s && car.s + car.vs * dt <= Player.s &&
          Math.abs(car.lat - Player.lat) < CONFIG.passByRange && Math.random() < CONFIG.passByChance) sfxAt('passBy', car.s);
      // understeer (a level with "understeer"): in a bend, what it asks of the tyres beyond the ice's
      // grip slides it to the outside, the more so the faster and heavier it is (as the player on ice)
      if (LEVEL.understeer && !(car.spin > 0)) {
        const bend = Track.bend(car.s), type = CONFIG.vehicles[car.kind];
        const grip = CONFIG.ice.grip * (car.racer ? CONFIG.race.aiTyres : 1); // (a racer's tyres hold on longer)
        const slide = Math.max(0, car.vs * car.vs * Math.abs(bend) * weightOf(car) / (type.agility || 1) - grip) * CONFIG.ice.understeer *
          (car.onIce ? 1 : CONFIG.race.understeer);
        car.slideVel = (car.slideVel - Math.sign(bend) * car.dir * slide * dt) * (1 - Math.min(1, dt * 2)); // (gripping again as it eases)
        car.vs -= Math.sign(car.vs) * Math.min(Math.abs(car.vs), slide * CONFIG.race.scrub * dt); // (scrubbing off speed as it slides)
      } else car.slideVel = 0;
      car.s += car.vs * dt;
      Track.transfer(car); // onto the side road, a flyover or back, where the roads join
      car.lat += (car.latVel + car.slideVel) * dt;
      keepOnRoad(car, 0.3);
      updateYaw(car, dt);
    }
  };

  // the screensaver going round again: everything on the expressway is moved back a lap
  // (the road's s runs from 0 again), and the level's fixed vehicles are put out afresh
  const lap = (length) => {
    for (const car of cars) {
      if (car.active && car.fixed) car.active = false;
      else if (car.active && Track.isMain(car.s)) car.s -= length;
    }
    placeFixed();
  };

  return { cars, reset, update, lap, policeNear, toadify, rushHour, moodSwing, startProcession, mourn, arrest, startEmergency, addRacer, sortGrid, tow, wreckedByPlayer,
    noteWreck, hornedAt, get reversibles() { return reversibles; },
    outfit, spare: () => cars.find(c => !c.active && c.unused) || null, // (for a police pursuit: see pursuit.js)
    frozen: false }; // (TRAFFIC FREEZE: set by Mysteries; update, Collision.updateObstacles and Hazards.update stand still while it is)
})();
