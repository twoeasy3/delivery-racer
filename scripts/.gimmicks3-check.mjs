// A check of Gimmick Road 3's gimmicks (src/delivery/gambles.js), one at a time, headless: for each, both sides
// of its gamble (the risky line pays when it is driven right and costs when it is not), that the safe line
// always works, that nothing forces a stop, and at the end that a run still finishes.
// Seeded, so a run repeats: Math.random starts afresh for every section and for every scenario in it (each start()),
// from the seed, the section's name and the scenario's number, so a section run alone is the same as in a full run,
// and each section builds the level afresh. A failure prints its seed, section and scenario.
//   node scripts/.gimmicks3-check.mjs [name ...] [--seed=n] [--seeds=k]
//     names: only those sections (wind crest ramp washboard bridge ford cushions shade ruts tarmac spray sun dust finish)
//     --seed=n: other dice (2026 if not given); --seeds=k: k seeds from there on, one after another, only the
//     failures printed, and at the end how often each line failed
import { boot } from './delivery-headless.mjs';

const ONLY = process.argv.slice(2).filter(a => !a.startsWith('--'));
const opt = (name, fallback) => Number((process.argv.find(a => a.startsWith('--' + name + '=')) || '').slice(name.length + 3) || fallback);
const SEED = opt('seed', 2026) >>> 0, SEEDS = Math.max(1, opt('seeds', 1));
// Math.random, seeded (mulberry32, as scripts/delivery-smoke.mjs)
let state = SEED, seedNow = SEED, sectionNow = '', scenario = 0;
Math.random = () => {
  state = (state + 0x6D2B79F5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// the dice for scenario n of a section under a seed: the same whatever ran before it
const reseed = () => { let h = 2166136261 ^ seedNow; for (const ch of sectionNow + ':' + scenario) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); state = h >>> 0; };
const g = await boot({ cars: ['commuter', 'sport', 'darkvan', 'lowrider', 'liftedtruck', 'pickup', 'buggy', 'miata', 'floatvan'] });
let failures = 0;
const QUIET = SEEDS > 1, tally = new Map(); // (over several seeds: each failing line, its numbers left out, and the seeds it failed on)
const say = (line) => { if (!QUIET) console.log(line); };
const check = (ok, what) => {
  if (ok) return say('  ok    ' + what);
  failures++;
  const key = what.replace(/-?\d[\d.]*/g, '#').slice(0, 90);
  tally.set(key, [...(tally.get(key) || []), seedNow]);
  console.log('  FAIL  ' + what + '   [--seed=' + seedNow + ', section ' + (sectionNow || 'load') + ', scenario ' + scenario + ']');
};
let rebuild = () => {};
const section = (name, run) => { if (!ONLY.length || ONLY.includes(name)) { say('---- ' + name); sectionNow = name; scenario = 0; reseed(); rebuild(); return run(); } };
try {
  const { Gambles } = await g.load('gambles.js');
  const { Hazards } = await g.load('hazards.js');
  const { SpeedCameras } = await g.load('cameras.js');
  const { Progress } = await g.load('progress.js');
  const P = g.Player, G = g.Game, C = g.CONFIG;
  const T = () => g.track.Track;
  const level = g.select('gimmick-road-3');
  const lane = (n, s) => T().laneOffset(n, s);
  // the traffic taken off the road, and kept off: a slot only made inactive is dealt out again at the next step
  // (Traffic.update), 60 to some hundreds of metres ahead of the player, and is on the road for that one step: enough
  // for a vehicle a scenario is watching up there to brake or change lane for it. So each is pinned (cleared: a
  // vehicle that has gone and is `fixed` stays gone), until the next start() deals the slots out afresh
  const quiet = () => { for (const car of g.Traffic.cars) if (!car.fixed || car.cleared) Object.assign(car, { active: false, fixed: true, cleared: true }); };
  const said = (text) => g.said.some(line => line.includes(text));
  // a fresh run in `car`, set down at s in lane n doing v, no traffic to get in the way (the level's own
  // fixed vehicles stay)
  const start = (s, n, v, { car = 'sport', ghost = false, keep = false } = {}) => {
    Progress.data.car = car;
    P.testGhost = false;
    G.evil = false;
    g.said.length = 0;
    scenario++; reseed(); // (the dice afresh for every scenario)
    G.start();
    if (!keep) quiet();
    Object.assign(P, { s, lat: lane(n, s), speed: v, launching: false, shield: 0 });
    Hazards.lastS = SpeedCameras.lastS = s;
    P.testGhost = ghost;
    g.drive(1, 0);
  };
  // a traffic vehicle of a kind put at (s, lat) doing v the player's way, for a check
  // (dealt out by the game itself, Traffic.outfit, which blanks the slot first: a slot only written over kept whatever
  // its last vehicle was, a hesitant driver's brake taps and wandering among them; and then an ordinary driver of
  // its kind: not hesitant, not evil, with no exit in mind)
  const put = (kind, s, lat, v) => {
    const car = g.Traffic.cars.find(c => !c.active && c.dir > 0 && !c.jam && !c.parked);
    car.s = s;
    g.Traffic.outfit(car, kind, T().nearestLane(lat, s));
    Object.assign(car, { active: true, fixed: true, cleared: false, s, lat, vs: v, baseSpeed: v, latVel: 0, yaw: 0, spin: 0, stun: 0, junction: null, parked: false, viaSide: false,
      evil: false, defiant: false, hesitant: false, tap: 0, tapWait: 0, emotion: 'neutral', mood: 0 });
    return car;
  };
  // each real level that has `field`: loaded and started (it must load without problems), then back to Gimmick Road 3
  const real = (field, each) => {
    const found = g.levels.LEVELS.filter(l => Array.isArray(l[field]) ? l[field].length : l[field]);
    check(found.length >= 2, field + ': on ' + found.length + ' real levels (' + found.map(l => l.id).join(', ') + ')');
    for (const l of found) {
      g.select(l); Progress.data.car = l.amphibious ? 'floatvan' : 'sport'; G.start();
      check(!T().problems.length, l.id + ': loads without problems' + (T().problems.length ? ': ' + T().problems.join(' | ') : ''));
      each(l);
    }
    g.select('gimmick-road-3');
    G.start();
  };
  rebuild = () => { g.select('gimmick-road-3'); G.loaded = null; G.start(); }; // (the level built afresh from the section's dice, and loaded: a section may read its gambles before its first start())
  for (let n = 0; n < SEEDS; n++) {
  seedNow = (SEED + n) >>> 0; sectionNow = ''; scenario = 0; reseed(); rebuild();
  start(100, 3, 20);
  say('Level problems: ' + (T().problems.join(' | ') || 'none'));
  check(!T().problems.length, 'the level loads without problems');

  // ---- crosswind (300 - 900, blowing to the left: towards the oncoming lanes)
  await section('wind', async () => {
    const W = C.crosswind, w = () => Gambles.winds[0];
    // hands off through the whole stretch at a steady 25 m/s: how far the car is carried
    const drift = (car, opts = {}) => {
      start(280, 4, 25, { car });
      let most = 0, stopped = false;
      const lat0 = P.lat;
      g.run(40, (t) => {
        quiet();
        if (opts.each) opts.each();
        P.speed = 25;
        if (P.s > 300 && P.s < 900) most = Math.max(most, lat0 - P.lat);
        if (P.speed < 1) stopped = true;
        return P.s > 900;
      });
      return { most, stopped, busted: P.busted, wrecks: G.wrecks };
    };
    const low = drift('lowrider'), tall = drift('liftedtruck');
    check(said('Crosswind'), 'crosswind: it is announced');
    check(tall.most > low.most * 2 && low.most > 0.3, 'crosswind: hands off, a tall car is carried further than a low one (Lifted Truck ' + tall.most.toFixed(1) + ' m, Lowrider ' + low.most.toFixed(1) + ' m)');
    check(tall.most > C.laneWidth, 'crosswind, the cost: the tall car, hands off, is carried out of its lane (' + tall.most.toFixed(1) + ' m: a lane is ' + C.laneWidth + ' m)');
    // steering against it: taps hold the lane (the risky, fast line done right), flat out
    start(280, 4, 25, { car: 'liftedtruck' });
    let worst = 0, slowest = 99;
    const lat0 = P.lat;
    g.run(40, () => { quiet(); g.drive(1, P.lat < lat0 - 0.25 ? 1 : 0); if (P.s > 300) { worst = Math.max(worst, Math.abs(P.lat - lat0)); slowest = Math.min(slowest, P.speed); } return P.s > 900; });
    check(worst < 1 && slowest > 20 && !P.busted && G.wrecks === 0, 'crosswind, done right: the tall car, flat out, steered against it in taps, never leaves its lane (' + worst.toFixed(2) + ' m off its line at most, never under ' + Math.round(slowest * 3.6) + ' km/h)');
    // the push is no more than the steering can answer, for the tallest garage car in the hardest gust
    const tallest = Math.max(...g.cars.CARS.map(c => c.height));
    const hardest = Math.abs(Gambles.windPush({ ...w(), every: 1, length: 1 }, tallest, 0.5)) / C.steerResponse;
    check(hardest < C.steerSpeed * 0.5, 'crosswind: the hardest gust on the tallest garage car (' + tallest + ' m) is a drift of ' + hardest.toFixed(1) + ' m/s, well under the ' + C.steerSpeed + ' m/s the steering gives');
    // the gusts: a rhythm, the same every run
    const levels = [];
    for (let t = 0; t < w().every; t += 0.1) levels.push(Gambles.gust(w(), t));
    check(Math.max(...levels) === 1 && Math.abs(Math.min(...levels) - W.lull) < 1e-9 && Gambles.gust(w(), 1.3) === Gambles.gust(w(), 1.3 + w().every),
      'crosswind: it gusts in a fixed rhythm, from ' + W.lull + ' of its strength to all of it every ' + w().every + ' s');
    // shelter: a bus alongside on the windward side (the right: it blows to the left), keeping pace
    start(280, 4, 25, { car: 'liftedtruck' });
    let bus = null, sheltered = 0, mostIn = 0, kicked = 0;
    const latA = P.lat;
    g.run(12, () => {
      quiet();
      P.speed = 25;
      if (!bus) bus = put('bus', P.s, lane(5, P.s), 25);
      bus.s = P.s; bus.lat = lane(5, P.s); bus.vs = 25; bus.active = true;
      if (P.s > 320) { if (Gambles.lee === bus) sheltered++; mostIn = Math.max(mostIn, latA - P.lat); }
      return P.s > 560;
    });
    check(sheltered > 100 && mostIn < tall.most * 0.25, 'crosswind: in the lee of a bus alongside, the tall car is hardly moved (' + mostIn.toFixed(2) + ' m over 240 m)');
    // ...and clearing it: the bus drops back, and the wind is back with a shove
    const before = P.latVel;
    bus.active = false;
    g.run(0.05, () => { kicked = Math.min(kicked, P.latVel - before); });
    check(kicked < -1 && !Gambles.lee, 'crosswind: clearing the bus, the wind is back at once with a shove (' + kicked.toFixed(1) + ' m/s sideways)');
    // a low vehicle gives none
    start(280, 4, 25, { car: 'liftedtruck' });
    let taxi = null, lee = 0;
    g.run(6, () => { quiet(); if (!taxi) taxi = put('taxi', P.s, lane(5, P.s), 25); taxi.s = P.s; taxi.lat = lane(5, P.s); taxi.active = true; if (Gambles.lee) lee++; return P.s > 420; });
    check(lee === 0, 'crosswind: a vehicle lower than the car gives no shelter');
    // traffic drifts in its lane, and no more
    start(100, 3, 0, { car: 'sport' });
    g.drive(-1, 0);
    const semi = put('semi', 320, lane(5, 320), 20);
    semi.fixed = false;
    let off = 0;
    g.run(20, () => { for (const c of g.Traffic.cars) if (c !== semi && !c.fixed) c.active = false; P.speed = 0; if (!semi.active) return true; if (semi.s > 340 && semi.s < 880) off = Math.max(off, lane(5, semi.s) - semi.lat); return semi.s > 880; });
    check(off > 0.2 && off < 1.2, 'crosswind: a semi in it drifts ' + off.toFixed(2) + ' m downwind in its lane, and stays in it');
    // the safe line: a low car in the right-hand lane (the windward one: the most room), its driver only correcting
    // once it is a metre off its line, never leaves that lane; and hands off for a whole gust it moves less than half a lane
    start(280, 5, 25, { car: 'lowrider' });
    let lazy = 0, slow = 99;
    const latL = P.lat;
    g.run(40, () => { quiet(); g.drive(1, P.lat < latL - 1 ? 1 : 0); if (P.s > 300) { lazy = Math.max(lazy, Math.abs(P.lat - latL)); slow = Math.min(slow, P.speed); } return P.s > 900; });
    const perGust = Math.abs(Gambles.windPush({ ...w(), every: 1, length: 1 }, g.cars.CARS.find(c => c.id === 'lowrider').height, 0.5)) / C.steerResponse * w().length;
    check(lazy < C.laneWidth / 2 && slow > 20 && !P.busted && G.wrecks === 0 && perGust < C.laneWidth / 2,
      'crosswind, the safe line: a low car in the windward lane, corrected only when a metre off its line, stays in its lane (' + lazy.toFixed(2) + ' m off at most; a whole gust hands off moves it ' + perGust.toFixed(1) + ' m), never slowed, no bust');
  });

  // ---- crest jumps (two crests, their tops at 1190 and 1490; a barrier over the first in lane 4, over the
  // second in lanes 3 and 5)
  await section('crest', async () => {
    const K = C.crest, crests = () => Gambles.crests;
    start(1000, 3, 20);
    check(crests().length === 2 && crests().every(c => c.speed < K.signUnder), 'crests: the level has two, found from its profile alone (flying from ' + crests().map(c => Math.round(c.speed * 3.6) + ' km/h').join(', ') + ')');
    const need = crests()[0].speed;
    // over the first crest at a held speed, in a lane: what happened
    const over = (v, n, { steer = null, car = 'sport', to = 1300, from = 1060 } = {}) => {
      start(from, n, v, { car });
      let top = 0, steered = 0, slowest = 99;
      const lat0 = P.lat, health = P.health;
      const t = g.run(30, () => {
        quiet();
        P.speed = Math.min(P.speed, v);
        if (steer) g.drive(1, steer());
        if (Gambles.fly) { top = Math.max(top, Gambles.fly.top); steered = Math.max(steered, Math.abs(P.latVel)); }
        slowest = Math.min(slowest, P.speed);
        return P.s > to || G.wrecks > 0;
      });
      return { t, top, lost: health - P.health, flights: Gambles.flights, wrecks: G.wrecks, steered, slowest, lat: P.lat - lat0 };
    };
    // the risky line, done right: flat out in a clear lane
    const fast = over(31, 3);
    check(fast.flights === 1 && fast.top > 0.5 && fast.lost === 0 && fast.wrecks === 0, 'crest, the risk taken and right: at ' + Math.round(31 * 3.6) + ' km/h in a clear lane the car flies (' + fast.top.toFixed(1) + ' m up) and lands unhurt');
    check(said('Airborne'), 'crest: being in the air is said');
    // ...done wrong: flat out in the lane with the barrier over the top
    const wrong = over(31, 4);
    check(wrong.flights === 1 && (wrong.lost > 10 || wrong.wrecks > 0), 'crest, the risk taken and wrong: flying in the lane the barrier is in, it lands in it (' + (wrong.wrecks ? 'wrecked' : wrong.lost.toFixed(0) + ' health lost') + ')');
    // no steering in the air: full lock held all the way over moves it no faster across than it left the ground with
    start(1060, 3, 31);
    let turned = 0, air = 0, atOff = null;
    g.run(10, () => { quiet(); P.speed = 31; g.drive(1, P.s > 1150 ? 1 : 0); if (Gambles.fly) { if (atOff === null) atOff = P.latVel; air++; turned = Math.max(turned, Math.abs(P.latVel - atOff)); } return P.s > 1300; });
    check(air > 20 && turned < 1e-6, 'crest: in the air the steering does nothing (' + air + ' steps in the air at full lock, sideways speed unchanged)');
    // the safe line: under the crest's speed the car stays on the ground, sees the barrier from the top and steers round it
    const slow = over(need - 3, 4, { steer: () => (P.s > 1185 && P.s < 1225 && P.lat < lane(5, P.s) - 0.2 ? 1 : 0) });
    check(slow.flights === 0 && slow.lost === 0 && slow.wrecks === 0 && slow.slowest > 15, 'crest, the safe line: at ' + Math.round((need - 3) * 3.6) + ' km/h it stays on the ground, and steers round the barrier from the top (no damage, never under ' + Math.round(slow.slowest * 3.6) + ' km/h)');
    check(fast.t < slow.t - 0.4, 'crest: flying is the faster way over (' + fast.t.toFixed(1) + ' s against ' + slow.t.toFixed(1) + ' s from 1060 to 1300 m)');
    // a slow car never leaves the ground at all, flat out
    const commuter = over(g.cars.CARS[0].maxSpeed, 3, { car: 'commuter' });
    check(commuter.flights === 0, 'crest: the Commuter, flat out (' + Math.round(g.cars.CARS[0].maxSpeed * 3.6) + ' km/h), never leaves the ground');
    // a hard landing costs: a fast car flies further and comes down harder
    const hard = over(42, 3, { car: 'miata' });
    check(hard.flights === 1 && hard.top > 2 && hard.lost > 0 && hard.lost < 40 && hard.wrecks === 0, 'crest: at ' + Math.round(42 * 3.6) + ' km/h it flies ' + hard.top.toFixed(1) + ' m up and the landing costs ' + hard.lost.toFixed(0) + ' health');
    // the camera: coming up to the top it is down behind the car; over it, back up
    check(Gambles.blind(1000) === 0 && Gambles.blind(1170) > 0.9 && Gambles.blind(1260) === 0, 'crest: the camera comes down behind the car on the way up (' + Gambles.blind(1170).toFixed(2) + ' at 1170 m) and is back over the top');
    // no other level has a crest by accident
    const others = [];
    for (const l of [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)]) {
      if (l.id === 'gimmick-road-3' || l.segments.some(seg => seg.ease)) continue;
      g.select(l); G.start();
      if (Gambles.crests.length && !g.cars.CAR.noWheels) others.push(l.id + ' (' + Gambles.crests.map(c => Math.round(c.speed * 3.6)).join(', ') + ' km/h)');
    }
    g.select('gimmick-road-3');
    check(!others.length, 'crest: no level without an "ease" of its own has a crest a car could fly' + (others.length ? ': ' + others.join('; ') : ''));
  });

  // ---- ramp over the jam (the foot of its ramps at 2400, lane 4; a queue of 4 beyond it, and in lanes 3 and 5;
  // barriers close the right shoulder: the way round is the oncoming side)
  await section('ramp', async () => {
    const J = C.jamRamp, r = () => Gambles.ramps[0];
    start(2200, 4, 20);
    const queue = () => g.Traffic.cars.filter(c => c.active && c.jam);
    const need = r().speed;
    check(queue().length === Gambles.queueSpots(r()).length && queue().every(c => Math.abs(c.vs) < 0.01), 'ramp: its queue is real traffic, stopped (' + queue().length + ' cars in lanes ' + r().lanes.join(' to ') + ', the last at ' + r().last + ' m)');
    check(need > g.cars.CARS[0].maxSpeed && need < 40, 'ramp: clearing the queue takes ' + Math.round(need * 3.6) + ' km/h at its foot (more than the Commuter has: ' + Math.round(g.cars.CARS[0].maxSpeed * 3.6) + ')');
    // at it at a speed, in a lane (held to that speed up to its foot, hands off from there)
    const at = (v, n, { car = 'sport', steer = null } = {}) => {
      start(2250, n, v, { car, keep: false });
      let top = 0, on = false, slowest = 99, slowestOn = 99;
      const health = P.health;
      const t = g.run(40, () => {
        for (const c of g.Traffic.cars) if (!c.fixed) c.active = false;
        if (P.s < 2400) P.speed = v; else if (!steer) g.drive(0, 0);
        if (steer) g.drive(1, steer());
        if (Gambles.onRamp) { on = true; slowestOn = Math.min(slowestOn, P.speed); }
        if (Gambles.fly) top = Math.max(top, P.air);
        slowest = Math.min(slowest, P.speed);
        return P.s > 2560 || G.wrecks > 0 || P.busted;
      });
      return { t, top, on, lost: health - P.health, wrecks: G.wrecks, slowest, slowestOn, busted: P.busted, s: P.s, hit: queue().filter(c => c.health < c.maxHealth).length };
    };
    const over = at(Math.ceil(need * 3.6 / 5) * 5 / 3.6, 4);
    check(over.on && over.top > r().top && over.wrecks === 0 && over.hit === 0 && over.s > 2560, 'ramp, the risk taken and right: at the speed on its board (' + Math.round(Math.ceil(need * 3.6 / 5) * 5) + ' km/h), hands off, the car goes up it (' + over.top.toFixed(1) + ' m up), over the whole queue, and lands (' + over.lost.toFixed(0) + ' health for the landing)');
    const short = at(need - 8, 4);
    check(short.on && (short.wrecks > 0 || short.lost > 25) && short.hit > 0, 'ramp, the risk taken and wrong: ' + Math.round((need - 8) * 3.6) + ' km/h is too slow: it comes down in the queue (' + (short.wrecks ? 'wrecked' : short.lost.toFixed(0) + ' health lost') + ', ' + short.hit + ' of the queue hit)');
    // the way round: the oncoming side, with nothing coming (the level's barriers close the shoulder)
    const round = at(22, 3, { steer: () => { const want = P.s > 2330 && P.s < 2470 ? lane(2, P.s) : lane(3, P.s); return Math.abs(want - P.lat) < 0.2 ? 0 : Math.sign(want - P.lat); } });
    check(round.wrecks === 0 && round.lost === 0 && !round.busted && round.slowest > 15 && round.s > 2560, 'ramp, the safe line: round the queue by the lane beyond the centre line, nothing coming: no damage, no bust, never under ' + Math.round(round.slowest * 3.6) + ' km/h');
    // beside the transporter, the car is kept out of it; and traffic coming up its lane moves over
    // (with the queue beside it taken away, to try the trailer alone)
    start(2380, 4, 15);
    for (const c of queue()) c.active = false;
    Object.assign(P, { s: 2405, lat: r().lat + 3, speed: 6 });
    let inside = false;
    g.run(1.2, () => { g.drive(0, -1); P.speed = 6; if (!Gambles.onRamp && Math.abs(P.lat - r().lat) < J.half + P.hw - 0.01) inside = true; });
    check(!inside && !Gambles.onRamp && P.health === P.maxHealth, 'ramp: steered at from beside it, the car is kept out of the trailer, at no cost');
    start(2000, 3, 0);
    g.drive(-1, 0);
    const van = put('van', 2200, lane(4, 2200), 18);
    van.fixed = false;
    let wentUp = false;
    g.run(14, () => { P.speed = 0; P.s = 2000; if (van.active && van.s > 2400 && van.s < 2415 && Math.abs(van.lat - r().lat) < 1) wentUp = true; return !van.active; });
    check(!wentUp && van.lane !== 4, 'ramp: a van coming up its lane moved over (to lane ' + van.lane + ') and never reached its ramps (it stopped at ' + Math.round(van.s) + ' m, doing ' + Math.abs(van.vs).toFixed(1) + ' m/s)');
    // the slowest car, crawling onto it, never comes to a stand on it: it goes off the lip into the queue
    const crawl = at(6, 4, { car: 'commuter' });
    check(crawl.on && crawl.slowestOn >= J.crawl - 0.01 && crawl.s > 2415, 'ramp: the Commuter at ' + Math.round(6 * 3.6) + ' km/h is never brought to a stand on it (slowest ' + crawl.slowestOn.toFixed(1) + ' m/s; it got to ' + Math.round(crawl.s) + ' m)');
    // a siren coming up behind clears the jam, and is not left standing behind it (an ambulance, in the queue's lane)
    start(1900, 3, 0);
    const amb = put('ambulance', 2150, lane(3, 2150), 26);
    Object.assign(amb, { fixed: false, emergency: true });
    const jammed = queue().length;
    let slowestAmb = 99, past = false;
    g.run(40, () => { for (const c of g.Traffic.cars) if (c !== amb && !c.fixed && !c.jamPace) c.active = false; P.speed = 0; P.s = 1900; if (amb.active && amb.s > 2380) slowestAmb = Math.min(slowestAmb, amb.vs); if (amb.s > 2470) past = true; return past || !amb.active; });
    check(jammed > 0 && queue().length === 0 && Gambles.ramps[0].released && past && slowestAmb > 3, 'ramp: a siren coming up behind clears the jam (' + jammed + ' cars drive off) and gets through it, never stopped (' + slowestAmb.toFixed(1) + ' m/s at its slowest past the transporter)');
    // on the real levels
    real('jamRamps', (l) => {
      const rr = Gambles.ramps[0], q = g.Traffic.cars.filter(c => c.active && c.jam).length, [first, last] = T().laneRange(1, rr.s);
      check(q === Gambles.ramps.reduce((n, r) => n + Gambles.queueSpots(r).length, 0) && Gambles.ramps.every(r => r.speed < 34), l.id + ': the ramp at ' + rr.s + ' m, lane ' + rr.lane + ' of ' + first + ' to ' + last + ': its whole queue is out (' + q + ' cars), clearing it takes ' + Math.round(rr.speed * 3.6) + ' km/h');
    });
  });

  // ---- washboard dirt (2950 - 3450, through the two gentle bends; barriers to be steered round at 3120 (lane 4),
  // 3200 (lanes 3 and 5) and 3330 (lane 4): the line through is lane 3, lane 4, lane 3)
  await section('washboard', async () => {
    const B = C.washboard, b = () => Gambles.boards[0];
    // through it, in at v and never driven faster than that (the dirt may slow it), steering for the line through
    // the barriers as a player would (at the stick's full throw towards the lane wanted, let go within 0.3 m of it)
    const through = (v, car = 'sport') => {
      start(2900, 3, v, { car });
      const health = P.health;
      let off = 0, rough = 0, least = 1, slowest = 99, at40 = null;
      const t = g.run(120, () => {
        quiet();
        P.speed = Math.min(P.speed, v);
        const want = lane(P.s > 3140 && P.s < 3270 ? 4 : 3, P.s), d = want - P.lat;
        g.drive(1, Math.abs(d) < 0.3 ? 0 : Math.sign(d));
        if (P.s > 2960 && P.s < 3440) { off = Math.max(off, Math.abs(d)); rough = Math.max(rough, Gambles.rough); least = Math.min(least, Gambles.rough); slowest = Math.min(slowest, P.speed); }
        if (at40 === null && P.s >= b().from + 40) at40 = P.speed;
        return P.s > 3460 || G.wrecks > 0;
      });
      return { t, off, rough, least, slowest, at40, lost: health - P.health, wrecks: G.wrecks, busted: P.busted };
    };
    check(Gambles.roughness(0) === 0 && Gambles.roughness(B.full / 2) > 0.3 && Gambles.roughness(B.full / 2) < 1 && Gambles.roughness(B.full) === 1 && Gambles.roughness(40) === 1, 'washboard: rough at any speed, the faster the worse, all of it at ' + Math.round(B.full * 3.6) + ' km/h or more');
    // fast: in at 25 m/s (90 km/h), slowed to its `most` and no further, shaken off the line, through and never stopped
    const fast = through(25);
    const lost40 = 25 - fast.at40;
    check(fast.at40 !== null && lost40 >= 5 && lost40 <= 9, 'washboard, straight across at 90 km/h: ' + (lost40 * 3.6).toFixed(0) + ' km/h gone 40 m in (' + lost40.toFixed(1) + ' m/s: ' + (fast.at40 * 3.6).toFixed(0) + ' km/h), dragged at ' + B.drag + ' m/s^2');
    check(fast.slowest >= B.most - 0.6 && fast.slowest <= B.most + 0.6, 'washboard, straight across: held at ' + Math.round(B.most * 3.6) + ' km/h over the rest of it, no slower (slowest ' + (fast.slowest * 3.6).toFixed(0) + ' km/h)');
    check(fast.rough === 1 && !fast.busted && fast.slowest > 2, 'washboard, straight across: all of its rough, through in ' + fast.t.toFixed(1) + ' s, never stopped (' + (fast.wrecks ? 'wrecked on a barrier' : fast.lost.toFixed(0) + ' health lost') + ')');
    check(said('Washboard'), 'washboard: it is announced');
    // hands off down the first straight of it (before the barrier at 3120): shaken about the lane, not out of it
    const wobble = (v) => { start(2960, 3, v); const lat0 = P.lat; let most = 0; g.run(20, () => { quiet(); P.speed = Math.min(P.speed, v); g.drive(1, 0); if (P.s > 2970) most = Math.max(most, Math.abs(P.lat - lat0)); return P.s > 3100; }); return most; };
    const wobbleFast = wobble(25), wobbleSlow = wobble(6);
    check(wobbleFast > 0.3 && wobbleFast < 1.6, 'washboard, hands off at 90 km/h: shaken ' + wobbleFast.toFixed(2) + ' m about its line, not out of the lane');
    check(wobbleSlow > 0.08 && wobbleSlow < wobbleFast, 'washboard, hands off crawling: shaken ' + wobbleSlow.toFixed(2) + ' m, less');
    // crawling: still shaken, a little; not slowed at all; round the barriers unhurt; and slower than straight across
    const slow = through(6);
    check(slow.least > 0 && slow.rough < 0.8 && slow.rough > 0.3, 'washboard, crawling at 22 km/h: shaken the whole way, less (' + slow.rough.toFixed(2) + ' of the rough at most)');
    check(slow.slowest > 5.4 && slow.lost === 0 && slow.wrecks === 0 && !slow.busted, 'washboard, crawling: keeps its speed (slowest ' + (slow.slowest * 3.6).toFixed(0) + ' km/h), round all three barriers unhurt, in ' + slow.t.toFixed(1) + ' s');
    check(fast.t < slow.t, 'washboard: straight across is the quicker (' + (slow.t - fast.t).toFixed(1) + ' s quicker than crawling)');
    // a car in under its `most`, foot down, pulls up to that and no more
    start(2960, 3, 10);
    let top = 0;
    g.run(12, () => { quiet(); g.drive(1, 0); if (P.s > 2965 && P.s < 3440) top = Math.max(top, P.speed); return P.s > 3440; });
    check(top >= B.most - 0.5 && top <= B.most + 0.5, 'washboard: in at 36 km/h, foot down, it pulls up to ' + Math.round(B.most * 3.6) + ' km/h and no more (' + (top * 3.6).toFixed(0) + ' km/h)');
    // off it, the speed comes back: no cap past its end
    start(3400, 3, B.most);
    g.run(8, () => { quiet(); g.drive(1, 0); return P.s > 3600; });
    check(P.speed > B.most + 4 && !P.corrugated, 'washboard: past its end the car pulls away again (' + (P.speed * 3.6).toFixed(0) + ' km/h at 3600)');
    // a ghost feels nothing
    start(3000, 3, 14, { ghost: true });
    g.run(0.5, () => { P.speed = 14; });
    check(Gambles.rough === 0 && !P.corrugated, 'washboard: a ghost feels nothing of it');
    real('washboards', () => check(Gambles.boards.length > 0, '  its washboard: ' + Gambles.boards.map(x => x.from + ' to ' + x.to + ' m').join('; ')));
  });

  // ---- low bridge (the bar at 4400, 2 m; the exit at 4000 goes round it, back at 4800)
  await section('bridge', async () => {
    const L = C.lowBridge, bar = () => Gambles.bars[0];
    // from 3850 to 4900 at up to v: straight on in lane n, or (exit) over to the exit lane and round by the side road
    const go = (car, v, n, exit = false) => {
      start(3850, n, v, { car });
      const health = P.health;
      let slowest = 99, side = false, after = 0;
      const t = g.run(120, () => {
        quiet();
        P.speed = Math.min(P.speed, v);
        const main = T().isMain(P.s);
        if (!main) side = true;
        const want = exit && main && P.s > 4000 - C.ramps.laneZone + 15 && P.s < 4010 ? lane(5, P.s) + C.laneWidth : main ? lane(n, P.s) : P.lat, d = want - P.lat;
        g.drive(1, Math.abs(d) < 0.3 ? 0 : Math.sign(d));
        slowest = Math.min(slowest, P.speed);
        if (main && P.s > 4400 && !after) after = P.speed;
        return (main && P.s > 4900) || G.wrecks > 0;
      });
      return { t, lost: health - P.health, slowest, side, after, hits: bar().hits, wrecks: G.wrecks, busted: P.busted, height: P.height };
    };
    check(bar().exit && bar().exit.exitAt === 4000, 'low bridge: the bar at ' + bar().s + ' m, ' + bar().clearance + ' m up, has the exit at 4000 m round it');
    const low = go('sport', 28, 4);
    check(low.hits === 0 && low.lost === 0 && !low.side && low.slowest > 27, 'low bridge, a car that fits (' + low.height + ' m): straight under, untouched, never slowed (' + low.t.toFixed(1) + ' s)');
    check(said('you fit under') && said(low.height.toFixed(1) + ' m under'), 'low bridge: it is told that it fits, and what it measures');
    const hit = go('liftedtruck', 28, 4);
    check(hit.hits === 1 && hit.lost >= L.damage && hit.wrecks === 0 && hit.after < 28 * L.keep + 1 && hit.slowest > 5, 'low bridge, the risk taken by a car too tall (' + hit.height + ' m): it takes the knock (' + hit.lost.toFixed(0) + ' health, down to ' + Math.round(hit.after * 3.6) + ' km/h) and is through, never stopped (' + hit.t.toFixed(1) + ' s)');
    check(said('too tall') && said('CLANG'), 'low bridge: it is told it is too tall before the exit, and the knock is said');
    const round = go('liftedtruck', 28, 5, true);
    check(round.side && round.hits === 0 && round.lost === 0 && !round.busted && round.slowest > 15, 'low bridge, the safe line: the tall car takes the exit and comes back unhurt, never under ' + Math.round(round.slowest * 3.6) + ' km/h (' + round.t.toFixed(1) + ' s: ' + (round.t - low.t).toFixed(1) + ' s longer than under the bar)');
    // the oncoming side has no bar; a ghost goes through it
    const across = go('liftedtruck', 28, 2);
    check(across.hits === 0 && across.lost === 0, 'low bridge: the oncoming side is not barred');
    // tall traffic takes the exit
    start(3700, 3, 0);
    const bus = put('bus', 3800, lane(5, 3800), 18), van = put('commuter', 3800, lane(4, 3800), 18);
    bus.fixed = van.fixed = false; bus.viaSide = van.viaSide = false;
    let under = false;
    g.run(40, () => { for (const c of g.Traffic.cars) if (c !== bus && c !== van && !c.fixed) c.active = false; P.speed = 0; P.s = 3700; if (bus.active && T().isMain(bus.s) && bus.s > 4390 && bus.s < 4410) under = true; return !bus.active || (!T().isMain(bus.s)) || bus.s > 4500; });
    if (under || !bus.active || T().isMain(bus.s) || van.viaSide) console.log('    (bus: under ' + under + ', active ' + bus.active + ', s ' + bus.s.toFixed(0) + ', lane ' + bus.lane + ', lat ' + bus.lat.toFixed(1) + ', viaSide ' + bus.viaSide + '; van viaSide ' + van.viaSide + ', s ' + van.s.toFixed(0) + ')');
    check(!under && bus.active && !T().isMain(bus.s) && !van.viaSide, 'low bridge: a bus coming up to it, with room to move over, takes the exit (a car that fits is left to choose)');
    real('lowBridges', () => check(Gambles.bars.every(x => x.exit), '  its bar' + (Gambles.bars.length > 1 ? 's' : '') + ': ' + Gambles.bars.map(x => x.s + ' m, ' + x.clearance + ' m up, round by the exit at ' + x.exit?.exitAt).join('; ')));
  });

  // ---- ford (5650 - 5720, 0.6 m deep; the exit at 5300 is the bridge, back at 6100)
  await section('ford', async () => {
    const F = C.ford, f = () => Gambles.fords[0];
    // from 5150 to 6200 at up to v: straight through in lane n, or (bridge) over to the exit lane and round
    const go = (car, v, n, bridge = false, ghost = false) => {
      start(5150, n, v, { car, ghost });
      const health = P.health, wades = Gambles.wades();
      let slowest = 99, side = false, wet = 0;
      const t = g.run(200, (now) => {
        quiet();
        P.speed = Math.min(P.speed, v);
        const main = T().isMain(P.s);
        if (!main) side = true;
        const want = bridge && main && P.s > 5300 - C.ramps.laneZone + 15 && P.s < 5310 ? lane(5, P.s) + C.laneWidth : main ? lane(n, P.s) : P.lat, d = want - P.lat;
        g.drive(1, Math.abs(d) < 0.3 ? 0 : Math.sign(d));
        slowest = Math.min(slowest, P.speed);
        if (Gambles.inFord) wet += 1 / 60;
        return (main && P.s > 6200) || G.wrecks > 0;
      });
      return { t, lost: health - P.health, slowest, side, wet, wades, wrecks: G.wrecks, busted: P.busted };
    };
    check(f().exit && f().exit.exitAt === 5300, 'ford: ' + f().from + ' to ' + f().to + ' m, ' + f().depth + ' m deep, has the exit at 5300 m as its bridge');
    check(Gambles.wades(0) === F.shallow && Gambles.wades(1) === F.deepest && Gambles.fordPace(0.3, 0.9) > Gambles.fordPace(0.8, 0.9) && Gambles.fordPace(0.9, 0.9) === F.slow && Gambles.fordPace(1, 0.9) === F.crawl,
      'ford: a car wades ' + F.shallow + ' m (the worst) to ' + F.deepest + ' m (the best); the deeper for it the slower, down to ' + Math.round(F.slow * 3.6) + ' km/h at its limit, and ' + Math.round(F.crawl * 3.6) + ' km/h beyond it');
    const good = go('liftedtruck', 28, 4);
    check(good.wet > 0 && good.lost === 0 && good.slowest > F.slow && !good.side, 'ford, the risk taken in the right car (wades ' + good.wades.toFixed(2) + ' m): through unhurt, never under ' + Math.round(good.slowest * 3.6) + ' km/h (' + good.t.toFixed(1) + ' s)');
    check(said('you can wade it') && said('0.6 m deep'), 'ford: it is told it can wade it, with the depth and what it wades');
    const bad = go('lowrider', 28, 4);
    check(bad.wet > 10 && bad.lost > 5 && bad.wrecks === 0 && bad.slowest >= F.crawl - 0.01, 'ford, the risk taken in the wrong car (wades ' + bad.wades.toFixed(2) + ' m): it crawls across, ' + bad.wet.toFixed(0) + ' s in the water and ' + bad.lost.toFixed(0) + ' health lost, never stopped (' + bad.t.toFixed(1) + ' s)');
    check(said('too deep for this car') && said('Out of your depth'), 'ford: it is told it is too deep before the exit, and again in it');
    const round = go('lowrider', 28, 5, true);
    check(round.side && round.wet === 0 && round.lost === 0 && !round.busted && round.slowest > 15, 'ford, the safe line: the same car over the bridge (the exit): dry, unhurt, never under ' + Math.round(round.slowest * 3.6) + ' km/h (' + round.t.toFixed(1) + ' s: ' + (bad.t - round.t).toFixed(1) + ' s quicker than wading, ' + (round.t - good.t).toFixed(1) + ' s slower than the truck through the water)');
    const ghost = go('lowrider', 28, 4, false, true);
    check(ghost.wet === 0 && ghost.lost === 0 && ghost.slowest > 25, 'ford: a ghost goes over it untouched');
    // traffic wades through slowly
    start(5500, 3, 0);
    const van = put('commuter', 5600, lane(4, 5600), 18);
    van.fixed = false;
    let fastest = 0;
    g.run(20, () => { P.speed = 0; P.s = 5500; if (van.active && van.s > 5670 && van.s < 5715) fastest = Math.max(fastest, van.vs); return !van.active || van.s > 5730; });
    check(fastest > 0 && fastest <= F.traffic + 0.5, 'ford: traffic wades it slowly (' + fastest.toFixed(1) + ' m/s in the water)');
    // ---- the flooded underpass (7150 - 7230: 0.2 m as the run starts, 0.9 m after 240 s; the exit at 6800 goes over)
    const under = () => Gambles.fords[1];
    // through it (or over, by the exit) from 6650 to 7700 in `car`, coming to it `late` s into the run
    const dip = (car, late, over = false) => {
      start(6650, over ? 5 : 4, 26, { car });
      G.time = late;
      const health = P.health;
      let wet = 0, side = false, slowest = 99, depth = 0;
      const t = g.run(200, () => {
        quiet();
        P.speed = Math.min(P.speed, 26);
        const main = T().isMain(P.s);
        if (!main) side = true;
        const want = over && main && P.s > 6800 - C.ramps.laneZone + 15 && P.s < 6810 ? lane(5, P.s) + C.laneWidth : main ? lane(over ? 5 : 4, P.s) : P.lat, d = want - P.lat;
        g.drive(1, Math.abs(d) < 0.3 ? 0 : Math.sign(d));
        if (Gambles.inFord) { wet += 1 / 60; depth = under().depth; }
        slowest = Math.min(slowest, P.speed);
        return (main && P.s > 7700) || G.wrecks > 0;
      });
      return { t, wet, side, slowest, depth, lost: health - P.health, wrecks: G.wrecks, busted: P.busted };
    };
    check(under().fills && under().exit && under().exit.exitAt === 6800 && Math.abs(Gambles.fordDepth(under(), 0) - 0.2) < 1e-9 && Math.abs(Gambles.fordDepth(under(), 120) - 0.55) < 1e-9 && Math.abs(Gambles.fordDepth(under(), 999) - 0.9) < 1e-9,
      'underpass: 0.2 m deep as the run starts, 0.55 m after 120 s, 0.9 m from 240 s on; the exit at 6800 m goes over it');
    const early = dip('lowrider', 5);
    check(early.wet > 0 && early.lost === 0 && early.slowest > F.slow && early.depth < 0.3, 'underpass, early: the Lowrider (wades 0.36 m) goes through ' + early.depth.toFixed(2) + ' m of water unhurt, never under ' + Math.round(early.slowest * 3.6) + ' km/h (' + early.t.toFixed(1) + ' s)');
    check(said('you can still wade it') && said('and rising'), 'underpass: it is told how deep it is now, and that it is rising');
    const late = dip('lowrider', 230);
    check(late.wet > 10 && late.lost > 5 && late.wrecks === 0 && late.slowest >= F.crawl - 0.01, 'underpass, late: the same car in ' + late.depth.toFixed(2) + ' m: it crawls across, ' + late.lost.toFixed(0) + ' health lost, never stopped (' + late.t.toFixed(1) + ' s)');
    check(said('FLOODED too deep'), 'underpass: by then it is told it is too deep, before the exit');
    const overIt = dip('lowrider', 230, true);
    check(overIt.side && overIt.wet === 0 && overIt.lost === 0 && !overIt.busted && overIt.t < late.t, 'underpass, the safe line: over by the slip road, dry and unhurt (' + overIt.t.toFixed(1) + ' s: ' + (late.t - overIt.t).toFixed(1) + ' s quicker than wading it late, ' + (overIt.t - early.t).toFixed(1) + ' s slower than straight through early)');
    const tall = dip('liftedtruck', 300);
    check(tall.wet > 0 && tall.lost === 0, 'underpass: a car that wades 0.96 m still gets through it full (' + tall.depth.toFixed(2) + ' m)');
    real('fords', () => check(Gambles.fords.every(x => x.exit), '  its ford' + (Gambles.fords.length > 1 ? 's' : '') + ': ' + Gambles.fords.map(x => x.from + ' to ' + x.to + ' m, ' + x.depth + ' m deep, the bridge the exit at ' + x.exit?.exitAt).join('; ')));
  });

  // ---- speed cushions (rows at 3520, 3565, 3610, 3655, 3700: a cushion in each lane, a gap on each lane line)
  await section('cushions', async () => {
    const K = C.cushion;
    // from 3480 to 3740 held at v, on the line `lat` m from the road's middle (a function of s), or braking for each row
    const over = (v, lat, { car = 'sport', brake = false } = {}) => {
      start(3480, 3, v, { car });
      P.lat = lat(3480);
      const health = P.health;
      let slowest = 99, air = 0;
      const t = g.run(90, () => {
        quiet();
        const next = Gambles.rows.find(r => r.s > P.s), slow = brake && next && next.s - P.s < 22 && P.speed > K.soft - 0.5;
        if (!brake) P.speed = Math.min(P.speed, v);
        const d = lat(P.s) - P.lat;
        g.drive(slow ? -1 : brake && P.speed > v ? 0 : 1, Math.abs(d) < 0.1 ? 0 : Math.sign(d));
        slowest = Math.min(slowest, P.speed);
        if (Gambles.fly) air += 1 / 60;
        return P.s > 3740 || G.wrecks > 0;
      });
      return { t, lost: health - P.health, hits: Gambles.cushionHits, slowest, air, wrecks: G.wrecks, busted: P.busted };
    };
    const line = (s) => (lane(3, s) + lane(4, s)) / 2, middle = (s) => lane(4, s);
    check(Gambles.rows.length === 5 && Gambles.onCushion(3520, middle(3520)) && !Gambles.onCushion(3520, line(3520)) && !Gambles.onCushion(3520, line(3520) + K.line - 0.05, K.hwRef) && Gambles.onCushion(3520, line(3520) + K.line + 0.05, K.hwRef),
      'cushions: 5 rows; the middle of a lane is on one, a lane line is between two, with ' + K.line + ' m to spare either side for a car as wide as the Commuter');
    check(Gambles.cushionRoom(1.12) < Gambles.cushionRoom(0.74) && Gambles.cushionRoom(1.4) === K.least, 'cushions: a wide car has less room in the gap (' + Gambles.cushionRoom(1.12).toFixed(2) + ' m against ' + Gambles.cushionRoom(0.74).toFixed(2) + ' m), never less than ' + K.least + ' m');
    const fast = over(30, line);
    check(fast.hits === 0 && fast.lost === 0 && fast.air === 0 && fast.slowest > 29, 'cushions, the risk taken and right: on the lane line at ' + Math.round(30 * 3.6) + ' km/h, through all five rows untouched (' + fast.t.toFixed(1) + ' s)');
    check(said('Speed cushions'), 'cushions: they are announced');
    const wrong = over(30, middle);
    check(wrong.hits >= 3 && wrong.lost > 3 * K.damage && wrong.air > 0.5 && wrong.wrecks === 0, 'cushions, the risk taken and wrong: down the middle of the lane at the same speed: over ' + wrong.hits + ' of them, thrown up each time (' + wrong.air.toFixed(1) + ' s in the air), ' + wrong.lost.toFixed(0) + ' health lost (' + wrong.t.toFixed(1) + ' s)');
    check(said('THUMP'), 'cushions: the first one hit is said');
    const off = over(30, (s) => line(s) + 0.7);
    check(off.hits >= 3, 'cushions: 0.7 m off the lane line is not in the gap (' + off.hits + ' hit)');
    const slow = over(22, middle, { brake: true });
    check(slow.hits === 0 && slow.lost === 0 && slow.wrecks === 0 && !slow.busted && slow.slowest > 5, 'cushions, the safe line: down the middle of the lane, braking to ' + Math.round(K.soft * 3.6) + ' km/h for each row: no damage, never under ' + Math.round(slow.slowest * 3.6) + ' km/h (' + slow.t.toFixed(1) + ' s: ' + (slow.t - fast.t).toFixed(1) + ' s slower than the line at speed)');
    // traffic crawls over them
    start(3300, 3, 0);
    const van = put('commuter', 3400, lane(4, 3400), 20);
    van.fixed = false;
    let fastest = 0;
    g.run(30, () => { P.speed = 0; P.s = 3300; if (van.active && van.s > 3530 && van.s < 3700) fastest = Math.max(fastest, van.vs); return !van.active || van.s > 3720; });
    check(fastest > 0 && fastest <= K.traffic + 0.5, 'cushions: traffic takes them slowly (' + fastest.toFixed(1) + ' m/s at most between the rows)');
    real('cushions', () => check(Gambles.rows.length > 0, '  its rows: ' + Gambles.rows.map(r => r.s).join(', ') + ' m'));
  });

  // ---- black ice in the shade (6250 - 6450, trees on the right: lane 5 and the shoulder in shadow; a barrier in
  // the shade at 6410, lane 5)
  await section('shade', async () => {
    const z = () => Gambles.shades[0];
    // from 6200 at v in lane n; from `turn` m on, steering for lane `to`
    const run = (v, n, to = n, turn = 0) => {
      start(6200, n, v);
      const health = P.health;
      let ice = 0, slowest = 99;
      const t = g.run(60, () => {
        quiet();
        P.speed = Math.min(P.speed, v);
        const want = lane(P.s >= turn ? to : n, P.s), d = want - P.lat;
        g.drive(1, Math.abs(d) < 0.2 ? 0 : Math.sign(d));
        if (P.onIce) ice += 1 / 60;
        slowest = Math.min(slowest, P.speed);
        return P.s > 6480 || G.wrecks > 0;
      });
      return { t, ice, slowest, lost: health - P.health, wrecks: G.wrecks, busted: P.busted };
    };
    check(z().first === 5 && z().last === 5 && Gambles.shadeAt(6300, lane(5, 6300)) && !Gambles.shadeAt(6300, lane(4, 6300)) && !Gambles.shadeAt(6200, lane(5, 6200)), 'shade: lane 5 is in shadow from 6250 to 6450 m, lane 4 in the sun');
    const sun = run(30, 4);
    check(sun.ice === 0 && sun.lost === 0, 'shade, the safe line: the sunny lane is never ice (' + sun.t.toFixed(1) + ' s)');
    check(said('black ice'), 'shade: it is said on the way in');
    const out = run(30, 5, 4, 6290);
    check(out.ice > 1 && out.lost === 0 && out.wrecks === 0, 'shade, the risk taken and right: into the shaded lane at ' + Math.round(30 * 3.6) + ' km/h (' + out.ice.toFixed(1) + ' s on ice), out of it in good time (steering from 6290 m): past the barrier unhurt');
    const late = run(30, 5, 4, 6385);
    check(late.ice > 1 && late.lost > 0, 'shade, the risk taken and wrong: steering out only 25 m before the barrier, the ice does not let it: it hits (' + (late.wrecks ? 'wrecked' : late.lost.toFixed(0) + ' health lost') + ')');
    // the same late move on a dry road clears a barrier (the one on the crest at 1218, lane 4, on the flat before it: none; so the same geometry with the ice patch taken away)
    start(6200, 5, 30);
    const patch = z().slick; patch.to = patch.from; // (no ice for this one)
    const dry = (() => { const health = P.health; g.run(60, () => { quiet(); P.speed = Math.min(P.speed, 30); const d = lane(P.s >= 6385 ? 4 : 5, P.s) - P.lat; g.drive(1, Math.abs(d) < 0.2 ? 0 : Math.sign(d)); return P.s > 6480 || G.wrecks > 0; }); return health - P.health; })();
    check(dry === 0, 'shade: the same late move with no ice there clears the barrier (so it is the ice that costs)');
    const slow = run(12, 5, 4, 6385);
    check(slow.lost === 0 && slow.slowest > 10, 'shade: in slowly (' + Math.round(12 * 3.6) + ' km/h), the same late move clears it even on the ice');
    // traffic moves into the sun before it
    start(6000, 3, 0);
    const van = put('commuter', 6120, lane(5, 6120), 18);
    van.fixed = false;
    // (its lane is read alongside the shade, not at the end of the run: past the shade's end it is free to go back
    // to the lane it came up in, and some do at once)
    let shaded = 0, alongside = 0, inSun = 0;
    g.run(25, () => {
      for (const c of g.Traffic.cars) if (c !== van && !c.fixed) c.active = false;
      P.speed = 0; P.s = 6000;
      if (van.active && Gambles.shadeAt(van.s, van.lat)) shaded++;
      if (van.active && van.s >= z().from && van.s <= z().to) { alongside++; if (van.lane < z().first) inSun++; }
      return !van.active || van.s > 6460;
    });
    check(shaded === 0 && alongside > 0 && inSun === alongside, 'shade: a van coming up the shaded lane moves into the sun before it and never touches the shade (in the sunny lane for all ' + (alongside / 60).toFixed(1) + ' s alongside it)');
    real('shade', () => check(Gambles.shades.length > 0, '  its shade: ' + Gambles.shades.map(x => x.from + ' to ' + x.to + ' m, lanes ' + x.first + ' to ' + x.last).join('; ')));
  });

  // ---- ruts (4830 - 5030: a rut down each lane; a barrier in lane 4's at 5000, the bigger cash in it at 4925)
  await section('ruts', async () => {
    const R = C.rut;
    // from 4790 at up to v in lane n; from `turn` m on, steering for lane `to`
    const run = (v, n, to = n, turn = 0, car = 'sport') => {
      start(4790, n, v, { car });
      const health = P.health;
      let slowest = 99, held = 0, mud = 0;
      const t = g.run(90, () => {
        quiet();
        P.speed = Math.min(P.speed, v);
        const d = lane(P.s >= turn ? to : n, P.s) - P.lat;
        g.drive(1, Math.abs(d) < 0.2 ? 0 : Math.sign(d));
        if (Gambles.rut) held += 1 / 60; else if (Gambles.rutted(P.s)) mud += 1 / 60;
        slowest = Math.min(slowest, P.speed);
        return P.s > 5060 || G.wrecks > 0;
      });
      return { t, held, mud, slowest, lost: health - P.health, jolts: Gambles.rutJolts, wrecks: G.wrecks, busted: P.busted };
    };
    const clear = run(30, 3);
    check(clear.jolts === 0 && clear.lost === 0 && clear.mud === 0 && clear.slowest > 29, 'ruts, the right rut picked before the mud: held in it the whole way at ' + Math.round(clear.slowest * 3.6) + ' km/h, nothing lost (' + clear.t.toFixed(1) + ' s)');
    check(said('Deep ruts'), 'ruts: they are announced');
    // a tap of the steering does not get the car out; holding it does
    start(4850, 3, 25);
    g.run(0.5, () => { quiet(); P.speed = 25; g.drive(1, 0); });
    g.run(R.climb - 0.15, () => { quiet(); P.speed = 25; g.drive(1, 1); });
    g.run(0.6, () => { quiet(); P.speed = 25; g.drive(1, 0); });
    check(Gambles.rut && Gambles.rutJolts === 0 && Math.abs(P.lat - lane(3, P.s)) < 0.3 && P.health === P.maxHealth, 'ruts: steered against for less than ' + R.climb + ' s, the rut holds the car (back to ' + Math.abs(P.lat - lane(3, P.s)).toFixed(2) + ' m from its middle, at no cost)');
    const wrong = run(30, 4);
    check(wrong.lost >= g.CONFIG.obstacleKinds.barrier.damage - 1 && wrong.jolts === 0, // (a barrier's cost: it was 30, and is 22 since damage went by size)
       'ruts, the wrong rut picked and kept: lane 4 has the big cash and then a barrier: into it (' + (wrong.wrecks ? 'wrecked' : wrong.lost.toFixed(0) + ' health lost') + ')');
    const out = run(30, 4, 3, 4935);
    check(out.jolts === 1 && out.lost > 0 && out.lost < 15 && out.mud > 0 && out.slowest < 30 * R.keep + 0.5 && out.wrecks === 0, 'ruts, changing rut: out of lane 4 after its cash with one jolt (' + out.lost.toFixed(0) + ' health, down to ' + Math.round(out.slowest * 3.6) + ' km/h, ' + out.mud.toFixed(1) + ' s in the mud between) and into lane 3: past the barrier (' + out.t.toFixed(1) + ' s: ' + (out.t - clear.t).toFixed(1) + ' s slower than the right rut)');
    check(said('Out of the rut'), 'ruts: climbing out is said');
    // the mud between is slower for a car that crosses rough ground badly
    const paceOf = (car) => { start(4850, 3, 25, { car }); P.lat = (lane(3, 4850) + lane(4, 4850)) / 2; let v = 99; g.run(2.5, () => { quiet(); g.drive(1, 0); P.lat = (lane(3, P.s) + lane(4, P.s)) / 2; v = P.speed; }); return v; };
    const low = paceOf('lowrider'), high = paceOf('liftedtruck');
    check(low < high && low > R.mud - 0.1 && high < R.mudBest + 0.1, 'ruts: kept on the mud between two, the Lowrider makes ' + Math.round(low * 3.6) + ' km/h and the Lifted Truck ' + Math.round(high * 3.6) + ' (never stopped)');
    const ghost = (() => { start(4850, 4, 28, { ghost: true }); g.run(1, () => { quiet(); g.drive(1, 1); }); return !Gambles.rut && Gambles.rutJolts === 0; })();
    check(ghost, 'ruts: a ghost is not held by them');
    real('ruts', () => check(Gambles.ruts.length > 0, '  its ruts: ' + Gambles.ruts.map(x => x.from + ' to ' + x.to + ' m').join('; ')));
  });

  // ---- fresh tarmac (1750 - 2050, lane 5; the queue crawls past in lanes 3 and 4)
  await section('tarmac', async () => {
    const K = C.tarmac;
    // from 1700 to 2150 (100 m beyond it): on the tar when on(tar so far, on it now) says so, and otherwise in lane 4
    // at the queue's pace, as if in the queue
    const run = (on) => {
      start(1700, 4, 28);
      let most = 0, tarred = 0, slowest = 99, onNow = false, atEnd = 0;
      const t = g.run(120, () => {
        quiet();
        const zone = P.s > 1750 && P.s < 2050;
        onNow = zone && on(Gambles.tar, onNow);
        const d = lane(onNow ? 5 : 4, P.s) - P.lat;
        g.drive(1, Math.abs(d) < 0.2 ? 0 : Math.sign(d));
        if (zone && !Gambles.onTar(P.s, P.lat)) P.speed = Math.min(P.speed, K.queue); // (in the queue)
        most = Math.max(most, Gambles.tar);
        if (Gambles.onTar(P.s, P.lat)) tarred += 1 / 60;
        if (P.s > 1760) slowest = Math.min(slowest, P.speed);
        if (!atEnd && P.s >= 2050) atEnd = P.speed;
        return P.s > 2150 || G.wrecks > 0;
      });
      return { t, most, tarred, slowest, atEnd, health: P.health === P.maxHealth };
    };
    const queue = run(() => false);
    check(queue.most === 0 && queue.health && queue.slowest > K.queue - 0.5, 'tarmac, the safe line: in the queue the whole way, at its ' + Math.round(K.queue * 3.6) + ' km/h: no tar, never stopped (' + queue.t.toFixed(1) + ' s)');
    check(said('fresh tar'), 'tarmac: it is announced');
    const hops = run((tar, on) => on ? tar < 0.45 : tar < 0.08);
    check(hops.most < 0.6 && hops.t < queue.t - 5 && hops.health, 'tarmac, the risk taken and right: short hops (on until the tyres are half full, off until they are clean): ' + hops.tarred.toFixed(0) + ' s on the tar in all, ' + hops.t.toFixed(1) + ' s: ' + (queue.t - hops.t).toFixed(1) + ' s quicker than the queue');
    check(said('On the fresh tar'), 'tarmac: being on it is said');
    const stay = run(() => true);
    check(stay.most === 1 && stay.slowest < K.queue && stay.atEnd < K.queue && stay.t > hops.t + 5 && stay.slowest > 1, 'tarmac, the risk taken and wrong: on it the whole way: the tyres fill, down to ' + Math.round(stay.slowest * 3.6) + ' km/h (slower than the queue, never stopped), still ' + Math.round(stay.atEnd * 3.6) + ' km/h as it ends (' + stay.t.toFixed(1) + ' s: ' + (stay.t - hops.t).toFixed(1) + ' s slower than the hops, ' + (stay.t - queue.t).toFixed(1) + ' s against the queue)');
    // the tar wears off only off it
    start(1800, 5, 20);
    g.run(K.fill + 0.5, () => { quiet(); g.drive(1, 0); });
    const full = Gambles.tar;
    Object.assign(P, { s: 2100, lat: lane(4, 2100) });
    const t0 = g.run(20, () => { quiet(); g.drive(1, 0); return Gambles.tar === 0; });
    check(full === 1 && Math.abs(t0 - K.clean) < 0.2, 'tarmac: full after ' + K.fill + ' s on it, clean again ' + t0.toFixed(1) + ' s after leaving it');
    // traffic keeps off it and crawls past
    start(1500, 3, 0);
    const van = put('commuter', 1640, lane(5, 1640), 18);
    van.fixed = false;
    let onIt = 0, fastest = 0;
    g.run(60, () => { for (const c of g.Traffic.cars) if (c !== van && !c.fixed) c.active = false; P.speed = 0; P.s = 1500; if (van.active && Gambles.onTar(van.s, van.lat)) onIt++; if (van.active && van.s > 1800 && van.s < 2040) fastest = Math.max(fastest, van.vs); return !van.active || van.s > 2050; });
    check(van.lane !== 5 && onIt < 150 && fastest > 0 && fastest <= K.queue + 0.5, 'tarmac: a van coming up its lane moves out of it and crawls past (' + fastest.toFixed(1) + ' m/s at most; on the tar for ' + (onIt / 60).toFixed(1) + ' s: traffic will swerve onto it for the cash there, as for any pickup)');
    real('tarmac', () => check(Gambles.tars.length > 0, '  its tar: ' + Gambles.tars.map(x => x.from + ' to ' + x.to + ' m, lane ' + x.lane).join('; ')));
  });

  // ---- truck spray (the wet stretch 2520 - 2880)
  await section('spray', async () => {
    const S = C.spray;
    // the player kept `back` m behind the tail of a vehicle of `kind` doing 20 m/s in lane 4, `over` lanes to its
    // side, for 3 s from `at` m: how much of the view is gone at the end, and whether the car was touched
    const behind = (kind, back, over = 0, at = 2780) => { // (well beyond the level's own tractor, which starts at 2640)
      start(at - 60, 4, 20);
      const lead = put(kind, at, lane(4, at), 20);
      let slowest = 99;
      g.run(3, () => {
        for (const c of g.Traffic.cars) if (c !== lead && !c.fixed) c.active = false;
        lead.vs = 20; lead.lat = lane(4, lead.s);
        Object.assign(P, { s: lead.s - lead.hl - back, lat: lane(4 + over, lead.s), speed: 20 });
        slowest = Math.min(slowest, P.speed);
      });
      return { veil: Gambles.veil, of: Gambles.veilOf, health: P.health === P.maxHealth, slowest };
    };
    const close = behind('semi', 8);
    check(close.veil > 0.7 && close.of === 'spray', 'spray, the risk taken: 8 m behind a lorry on the wet stretch, ' + Math.round(close.veil * 100) + '% of the view is gone');
    check(close.health && close.slowest >= 20, 'spray: nothing is done to the car itself (no damage, never slowed)');
    check(said('spray'), 'spray: it is announced');
    const far = behind('semi', S.length + 10);
    check(far.veil === 0, 'spray, the safe line: hanging back ' + (S.length + 10) + ' m, beyond the cloud, the view is clear');
    const mid = behind('semi', S.length / 2);
    check(mid.veil > 0.25 && mid.veil < close.veil, 'spray: half way back in the cloud less of it is gone (' + Math.round(mid.veil * 100) + '%)');
    const beside = behind('semi', 8, 1), wide = behind('semi', 8, -2);
    check(beside.veil > 0.5 && wide.veil === 0, 'spray: the cloud reaches over the next lane (' + Math.round(beside.veil * 100) + '% gone there: pulling out to pass is blind), not the one beyond');
    const car = behind('commuter', 8);
    check(car.veil === 0, 'spray: a car throws none up');
    const dry = behind('semi', 8, 0, 2300);
    check(dry.veil === 0, 'spray: on the dry road before it a lorry throws none up');
    // alongside and past the lorry the view is back
    const past = behind('semi', -12, 1);
    check(past.veil === 0, 'spray: alongside the lorry and ahead of it the view is clear again');
    real('spray', () => check(Gambles.wets.length > 0, '  its wet road: ' + Gambles.wets.map(x => x.from + ' to ' + x.to + ' m').join('; ')));
  });

  // ---- the low sun (6470 - 6690, to the finish)
  await section('sun', async () => {
    const L = C.lowSun;
    // the player held at 6540 .. doing 15 m/s for 2.5 s, `back` m behind a vehicle of `kind` in lane 4 (none: alone),
    // `over` lanes to its side
    const view = (kind = null, back = 10, over = 0, at = 6540) => {
      start(at - 40, 4, 15);
      const lead = kind ? put(kind, at, lane(4, at), 15) : null;
      let slowest = 99;
      g.run(2.5, () => {
        for (const c of g.Traffic.cars) if (c !== lead && !c.fixed) c.active = false;
        if (lead) { lead.vs = 15; lead.lat = lane(4, lead.s); }
        Object.assign(P, { s: lead ? lead.s - lead.hl - P.hl - back : P.s, lat: lane(4 + over, P.s), speed: 15 });
        slowest = Math.min(slowest, P.speed);
      });
      return { veil: Gambles.veil, of: Gambles.veilOf, shadow: Gambles.shadow, health: P.health === P.maxHealth, slowest };
    };
    const open = view();
    check(open.veil > L.most - 0.1 && open.of === 'sun' && !open.shadow, 'low sun, in the open: ' + Math.round(open.veil * 100) + '% of the view is gone');
    check(open.health && open.slowest >= 15, 'low sun: nothing is done to the car itself (no damage, never slowed)');
    check(said('Low sun'), 'low sun: it is announced');
    const tucked = view('semi', 10);
    check(tucked.veil === 0 && tucked.shadow, 'low sun, the safe line: 10 m behind a lorry, in its shadow, the view is clear (at the lorry\'s pace)');
    const far = view('semi', L.shadow * 4 + 15);
    check(far.veil > 0.5, 'low sun: ' + (L.shadow * 4 + 15) + ' m behind it is beyond its shadow (' + Math.round(far.veil * 100) + '% gone)');
    const beside = view('semi', 10, 1);
    check(beside.veil > 0.5, 'low sun: in the next lane there is no shadow: pulling out to pass is into the glare');
    const low = view('commuter', 6);
    check(low.veil > 0.5, 'low sun: a car is too low to shade anything');
    const before = view(null, 0, 0, 6200);
    check(before.veil === 0, 'low sun: none before the stretch');
    real('lowSun', () => check(Gambles.suns.length > 0, '  its low sun: ' + Gambles.suns.map(x => x.from + ' to ' + x.to + ' m').join('; ')));
  });

  // ---- the dust trail (920 - 1080, the wind blowing to the right)
  await section('dust', async () => {
    const D = C.dust;
    // the player held `back` m behind the tail of a vehicle of `kind` doing 18 m/s in lane 4 (coming the other way
    // in lane 1, if `oncoming`), `over` lanes to its side (+ = downwind, to the right), for 2.5 s
    const behind = (kind, back, over = 0, at = 980) => {
      start(at - 50, 4, 18);
      const lead = put(kind, at, lane(4, at), 18);
      let slowest = 99;
      g.run(2.5, () => {
        for (const c of g.Traffic.cars) if (c !== lead && !c.fixed) c.active = false;
        lead.vs = 18; lead.lat = lane(4, lead.s);
        Object.assign(P, { s: lead.s - lead.hl - back, lat: lane(4, lead.s) + over * C.laneWidth, speed: 18 });
        slowest = Math.min(slowest, P.speed);
      });
      return { veil: Gambles.veil, of: Gambles.veilOf, health: P.health === P.maxHealth, slowest };
    };
    const inIt = behind('commuter', 8);
    check(inIt.veil > 0.6 && inIt.of === 'dust', 'dust, the risk taken: 8 m behind a car on the dirt, ' + Math.round(inIt.veil * 100) + '% of the view is gone (any vehicle throws it up)');
    check(inIt.health && inIt.slowest >= 18, 'dust: nothing is done to the car itself (no damage, never slowed)');
    check(said('Dust'), 'dust: it is announced');
    const upwind = behind('commuter', 8, -1), downwind = behind('commuter', 30, 1);
    check(upwind.veil === 0, 'dust, the clear line: a lane upwind of it (to the left: the wind blows to the right) the view is clear');
    check(downwind.veil > 0.2, 'dust: a lane downwind and 30 m back is in the plume, carried across (' + Math.round(downwind.veil * 100) + '% gone)');
    const far = behind('commuter', D.length + 10);
    check(far.veil === 0, 'dust, the safe line: hanging back ' + (D.length + 10) + ' m, beyond the plume, the view is clear');
    const before = behind('commuter', 8, 0, 700);
    check(before.veil === 0, 'dust: none on the tarmac before it');
    real('dust', () => check(Gambles.dusts.length > 0, '  its dust: ' + Gambles.dusts.map(x => x.from + ' to ' + x.to + ' m, blown to the ' + (x.dir < 0 ? 'left' : 'right')).join('; ')));
  });

  // ---- a whole run, start to finish, hands off the wheel in the middle lane, a ghost (nothing here stops it)
  await section('finish', async () => {
    start(0, 3, 20, { ghost: true, keep: true });
    let slowest = 99;
    const t = g.run(400, () => { if (P.s > 200) slowest = Math.min(slowest, P.speed); return G.state !== 'playing'; });
    check(G.state !== 'playing' && !P.busted && slowest > 5, 'a run finishes: ' + G.state + ' after ' + t.toFixed(0) + ' s, never under ' + Math.round(slowest * 3.6) + ' km/h after the start');
  });

  } // (each seed)
  if (QUIET) {
    console.log(SEEDS + ' seeds from ' + SEED + (ONLY.length ? ', sections ' + ONLY.join(' ') : '') + ':');
    for (const [key, seeds] of tally) console.log('  ' + seeds.length + ' of ' + SEEDS + '  ' + key + '   (seeds ' + seeds.join(' ') + ')');
  }
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
