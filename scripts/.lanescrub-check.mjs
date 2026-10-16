// A check of the lane-change scrub (CONFIG.trueSpeed: laneScrub, and `driven`, the scrub with the accelerator held; CHECKLIST 421),
// headless, on a straight stretch of Gimmick Road 2 with everything taken off it. Five cars (a slow starter, the Sportscompact,
// a heavy truck, a nimble car, a fast one) change one lane and two lanes:
//   at top speed, accelerator held: the lane change clearly costs speed (at least PINNED_LEAST m/s at its lowest for one lane)
//   at top speed, accelerator off (hands off: the speed holds): it costs no more than before 421 (laneScrub alone, a few tenths)
//   mid-range (half the top speed), accelerator held: the car still gains speed through the change, and reaches top speed
//     hardly later than going straight
// and: going straight, the speed is untouched (top speed reached exactly, held there); never below CONFIG.minSpeed; tune 0 is
// exactly the old scrub; a turbo is scrubbed only as before.
//   node scripts/.lanescrub-check.mjs           the check
//   node scripts/.lanescrub-check.mjs --table   and the table before (tune 0) / after, for every car
import { boot } from './delivery-headless.mjs';

const TABLE = process.argv.includes('--table');
const PINNED_LEAST = 0.6; // m/s: the least one lane at top speed, accelerator held, may cost (the nimblest car loses least)
const CARS = [['bus', 'slow starter'], ['sport', 'the Sport'], ['polytruck', 'heavy truck'], ['mini', 'nimble'], ['evsaloon', 'fast']];
const g = await boot({ cars: ['commuter', 'sport'], tiers: false });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { pinCar, carStats } = g.cars;
  const P = g.Player, G = g.Game, C = g.CONFIG, D = C.trueSpeed.driven, LW = C.laneWidth;
  const T = () => g.track.Track;
  const lane = (n, s) => T().laneOffset(n, s);
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  const base = g.select('gimmick-road-2');
  G.start();
  // a straight stretch long enough for a run at the fastest car's top speed
  const SPAN = 700, straight = (from) => { for (let s = from; s < from + SPAN; s += 5) if (Math.abs(T().bend(s)) > 1e-6 || !T().isMain(s)) return false; return true; };
  let at = 0;
  for (let s = 400; s < T().length - SPAN; s += 20) if (straight(s)) { at = s; break; }
  check(at > 0, 'a straight stretch of ' + SPAN + ' m to try it on (at ' + at + ')');
  const empty = { exits: [], pickups: [], schoolCrossings: [], trolleys: [], marathons: [], balloons: [], drawbridges: [], wreckage: [], cameras: [], potholes: [], crossings: [], stampedes: [], wideLoads: [], targets: [], obstacles: [], ice: [], waterPatches: [], waterMains: [], gravel: [], mud: [] };
  g.select({ ...base, id: 'lane-scrub-road', ...empty });
  const start = (car, v, n = 3) => {
    pinCar(car);
    P.testGhost = true; G.evil = false;
    G.start(); quiet();
    Object.assign(P, { s: at, lat: lane(n, at), latVel: 0, speed: v, launching: false, shield: 0, wetTyres: 0, onIce: false, onWater: false, yawVel: 0, turbo: 0, boost: 0 });
  };
  // drive for `secs`: straight for `lead` s, then (lanes > 0) steer over that many lanes and let go; the speeds on the way
  const go = (car, v, throttle, lanes, { secs = 4, lead = 0.5, until = null, tune = D.tune, turbo = 0 } = {}) => {
    const was = D.tune; D.tune = tune;
    start(car, v);
    if (turbo) P.turbo = turbo;
    const top = carStats().maxSpeed;
    g.drive(throttle, 0);
    let from = null, done = null, low = Infinity, atDone = null, t0 = null, reached = null, under = false;
    const dir = Math.sign(lane(5, at) - lane(3, at));
    const t = g.run(secs, (t) => {
      quiet();
      if (P.speed < C.minSpeed - 1e-9) under = true;
      if (lanes && t >= lead && from === null) { from = P.lat; t0 = t; g.drive(throttle, dir); }
      if (from !== null && done === null) {
        low = Math.min(low, P.speed);
        if (Math.abs(P.lat - from) >= lanes * LW) { done = t - t0; atDone = P.speed; g.drive(throttle, 0); }
      }
      if (reached === null && P.speed >= top - 1e-6) reached = t;
      return until ? until(t) : false;
    });
    D.tune = was;
    return { top, s: P.s - at, v: P.speed, low, atDone, done, reached, under, t };
  };
  const f2 = (x) => x === null ? '-' : x.toFixed(2), kmh = (x) => (x * 3.6).toFixed(1);

  // ---- going straight: top speed exactly, and held, accelerator held or not
  for (const [car] of CARS) {
    const flat = go(car, 10, 1, 0, { secs: 8 }), held = go(car, carStats().maxSpeed, 0, 0, { secs: 2 });
    check(Math.abs(flat.v - flat.top) < 1e-9 && Math.abs(held.v - held.top) < 1e-9, car + ': straight, top speed ' + flat.top + ' m/s reached exactly and held (accelerator off: holds it)');
  }
  // ---- tune 0 is the old scrub exactly; the accelerator off is the old scrub exactly whatever tune is
  {
    const was = go('sport', 31, 1, 1, { tune: 0 }), off0 = go('sport', 31, 0, 1, { tune: 0 }), off1 = go('sport', 31, 0, 1);
    const old = C.trueSpeed.laneScrub * 1; // (the bound: laneScrub at full across for the time of the change, over agility 1)
    check(off0.v === off1.v && off0.low === off1.low, 'accelerator off: the scrub is the old one exactly (sport, one lane at top speed: ' + f2(31 - off1.v) + ' m/s)');
    check(31 - was.low < old * 0.1, 'tune 0, accelerator held: as before 421, the lane change at top speed costs next to nothing (' + f2(31 - was.low) + ' m/s at its lowest)');
  }

  const rows = [];
  for (const [car, what] of CARS) {
    start(car, 1);
    const top = carStats().maxSpeed, ag = P.agility, acc = carStats().accel;
    const r = {};
    for (const tune of [0, D.tune]) {
      const k = tune === 0 ? 'before' : 'after';
      r[k] = {};
      for (const lanes of [1, 2]) {
        // over 6 s, against a ghost that goes straight from the same start with the same pedal (no lane change, no scrub):
        // at top speed with the accelerator held and off, and from half the top speed held (the change at once, still pulling)
        const pin = go(car, top, 1, lanes, { tune, secs: 6 }), off = go(car, top, 0, lanes, { tune, secs: 6 });
        const mid = go(car, top * 0.5, 1, lanes, { tune, lead: 0, secs: 6 }), midStraight = go(car, top * 0.5, 1, 0, { tune, lead: 0, secs: 6 });
        const pinStraight = go(car, top, 1, 0, { tune, secs: 6 }), offStraight = go(car, top, 0, 0, { tune, secs: 6 });
        const behind = { pin: pinStraight.s - pin.s, off: offStraight.s - off.s, mid: midStraight.s - mid.s };
        r[k][lanes] = { pin, off, mid, midStraight, behind };
      }
    }
    rows.push({ car, what, top, ag, acc, r });
  }
  for (const { car, top, ag, acc, r } of rows) {
    const a = r.after, b = r.before;
    for (const lanes of [1, 2]) {
      const x = a[lanes], drop = top - x.pin.low, offDrop = top - x.off.low;
      if (lanes === 1) check(drop >= PINNED_LEAST && drop >= 2.5 * offDrop && drop <= top * 0.1, car + ' (top ' + top + ', accel ' + acc + ', agility ' + ag + '): one lane at top speed, accelerator held, costs ' + f2(drop) + ' m/s (' + kmh(drop) + ' km/h) at its lowest: felt, under a tenth of top speed');
      else check(drop >= a[1].pin.low - x.pin.low + 1e-9 && drop <= top * 0.2, car + ': two lanes at top speed, held, costs ' + f2(drop) + ' m/s (one: ' + f2(top - a[1].pin.low) + ')');
      check(offDrop <= C.trueSpeed.laneScrub * lanes * 0.6 / ag, car + ': ' + lanes + ' lane(s) at top speed, accelerator off, costs only ' + f2(offDrop) + ' m/s');
      const midLoss = b[lanes].mid.atDone - x.mid.atDone; // (m/s the driven scrub took off a car still pulling, by the end of the change)
      check(x.behind.mid > b[lanes].behind.mid + 0.02 && midLoss > 0 && midLoss < (top - x.pin.low) / 4, car + ': ' + lanes + ' lane(s) from half top speed, held: a little further behind the ghost than before 421 (' + f2(b[lanes].behind.mid) + ' -> ' + f2(x.behind.mid) + ' m at 6 s; ' + f2(midLoss) + ' m/s more lost by the end of the change, against ' + f2(top - x.pin.low) + ' at top speed)');
      check(x.mid.atDone > top * 0.5 + 1 && x.mid.reached !== null && x.mid.reached - b[lanes].mid.reached < 0.1,
        car + ': ' + lanes + ' lane(s) from half top speed, held: still gaining (' + f2(top * 0.5) + ' -> ' + f2(x.mid.atDone) + ' m/s over the change), top speed at ' + f2(x.mid.reached) + ' s (before 421: ' + f2(b[lanes].mid.reached) + ' s; straight ' + f2(x.midStraight.reached) + ' s)');
      check(Math.abs(x.off.low - b[lanes].off.low) < 1e-9, car + ': ' + lanes + ' lane(s), accelerator off: exactly as before 421');
      check(Math.abs(x.pin.v - top) < 1e-9 && !x.pin.under && !x.off.under, car + ': back at top speed exactly afterwards, never under minSpeed');
    }
  }
  // ---- never below minSpeed: a long weave at minSpeed + 0.5 with the heavy weight on (agility 0.55), at full tune x 5
  {
    start('bus', C.minSpeed + 0.5); P.heavy = 10; let under = false; const was = D.tune; D.tune = 5;
    g.drive(1, 1); let flip = 0;
    g.run(4, () => { quiet(); P.heavy = 10; if (P.speed < C.minSpeed - 1e-9) under = true; if (++flip % 40 === 0) g.drive(1, (flip / 40) % 2 ? -1 : 1); return false; });
    D.tune = was;
    check(!under, 'never below minSpeed (the bus, weighed down, weaving at tune 5)');
  }
  // ---- a turbo: scrubbed only as before
  {
    start('sport', 1); const top = carStats().maxSpeed + C.turboBoost;
    const a = go('sport', top, 1, 1, { turbo: 5 }), b = go('sport', top, 1, 1, { turbo: 5, tune: 0 });
    check(a.low === b.low && a.v === b.v, 'under a turbo the lane change scrubs as before 421 (' + f2(top - a.low) + ' m/s)');
  }
  if (TABLE) {
    const m = (x) => x.toFixed(2) + ' m (' + (x / x0).toFixed(2) + ' s)'; let x0 = 1;
    console.log('\n| car | top m/s | accel | agility | lanes | held at top: lowest drop, before -> after | held at top: behind the ghost at 6 s | off at top: drop / behind at 6 s (before = after) | from half top, held: behind the ghost at 6 s, before -> after | from half top: m/s at end of change, before -> after | time to top: ghost / before / after |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|');
    for (const { car, what, top, ag, acc, r } of rows) for (const lanes of [1, 2]) {
      const b = r.before[lanes], a = r.after[lanes]; x0 = top;
      console.log(`| ${car} (${what}) | ${top} | ${acc} | ${ag} | ${lanes} | ${f2(top - b.pin.low)} -> ${f2(top - a.pin.low)} m/s (${kmh(top - a.pin.low)} km/h, ${(100 * (top - a.pin.low) / top).toFixed(1)}%) | ${m(b.behind.pin)} -> ${m(a.behind.pin)} | ${f2(top - a.off.low)} m/s / ${m(a.behind.off)} | ${m(b.behind.mid)} -> ${m(a.behind.mid)} | ${f2(b.mid.atDone)} -> ${f2(a.mid.atDone)} (in ${f2(a.mid.done)} s) | ${f2(a.midStraight.reached)} / ${f2(b.mid.reached)} / ${f2(a.mid.reached)} s |`);
    }
  }
} finally {
  await g.close();
}
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
