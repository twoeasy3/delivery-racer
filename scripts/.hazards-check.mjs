// A check of Gimmick Road 2's gimmicks (src/delivery/hazards.js), one at a time, headless: each starts the
// level, sets the car down a little short of the gimmick, and drives at it one way or another.
//   node scripts/.hazards-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Hazards } = await g.load('hazards.js');
  const { SpeedCameras } = await g.load('cameras.js');
  const { Site } = await g.load('site.js');
  const { Crossings } = await g.load('crossing.js');
  const P = g.Player, G = g.Game;
  const level = g.select('gimmick-road-2');
  const lane = (n, s) => g.track.Track.laneOffset(n, s);
  // a fresh run, the car at s in lane n doing v, no traffic to get in the way
  const start = (s, n, v, { ghost = false } = {}) => {
    P.testGhost = false;
    G.evil = false;
    g.said.length = 0;
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    Object.assign(P, { s, lat: lane(n, s), speed: v, launching: false, shield: 0 });
    Hazards.lastS = SpeedCameras.lastS = s;
    P.testGhost = ghost;
    g.drive(1, 0);
  };
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  const said = (text) => g.said.some(line => line.includes(text));
  // ---- school crossing (s 800)
  start(600, 3, 30);
  console.log('Level problems: ' + (g.track.Track.problems.join(' | ') || 'none'));
  check(!g.track.Track.problems.length, 'the level loads without problems');
  g.run(12, () => { quiet(); return P.s > 900 || P.busted; });
  check(P.busted && P.bustReason === 'school', 'school crossing: driving through its STOP is a bust (' + P.bustReason + ')');
  start(600, 3, 30);
  g.run(30, () => { quiet(); g.drive(Hazards.schools[0].state === 'stop' ? -1 : 1, 0); return P.s > 900 || P.busted; });
  check(!P.busted && P.s > 900, 'school crossing: braking for it, then driving on, is no bust');
  start(600, 3, 0);
  g.Traffic.reset();
  let waited = 0;
  g.drive(-1, 0);
  Hazards.schools[0].state = 'stop'; Hazards.schools[0].t = 0; Hazards.schools[0].started = true;
  g.run(4, () => { Hazards.schools[0].t = 1; });
  waited = g.Traffic.cars.filter(c => c.active && Math.abs(c.s - 800) < 30 && Math.abs(c.vs) < 0.5).length;
  const over = g.Traffic.cars.filter(c => c.active && Math.abs(c.s - 800) < 3 && Math.abs(c.vs) > 2).length;
  console.log('         (traffic stopped within 30 m of it: ' + waited + ', driving over it: ' + over + ')');

  // ---- burst water main (s 300, lane 5)
  start(250, 5, 20);
  let iced = false, dry = false;
  g.run(12, () => { quiet(); P.s = 310; P.speed = 0; const m = Hazards.mains[0]; if (m.on && Track_icy()) iced = true; if (!m.on && !Track_icy()) dry = true; return iced && dry; });
  function Track_icy() { return !!g.track.Track.icy(310, lane(5, 310)); }
  check(iced && dry, 'water main: its lane is icy while it sprays, and not when it stops');
  check(!g.track.Track.icy(310, lane(4, 310)), 'water main: the lane beside it is never icy');

  // ---- trolleys (1050 - 1350)
  start(1000, 3, 5);
  const t0 = Hazards.trolleys.map(o => o.lat);
  g.run(6, () => { quiet(); P.s = 1000; });
  const moved = Hazards.trolleys.filter((o, i) => Math.abs(o.lat - t0[i]) > 0.5).length;
  const onRoad = Hazards.trolleys.every(o => o.lat >= g.track.Track.lo(o.s) && o.lat <= g.track.Track.hi(o.s));
  check(moved >= 6 && onRoad, 'trolleys: ' + moved + ' of ' + t0.length + ' rolled across, all still on the road');

  // ---- marathon (s 1600, lane 5)
  start(1500, 3, 20);
  g.run(5, () => { quiet(); });
  const m = Hazards.marathons[0];
  check(m.on && m.members.every(o => o.s > o.run.s0 + 10), 'marathon: the runners and the pace car set off');
  start(1570, 5, 30);
  const health = P.health;
  g.run(3, () => { quiet(); });
  check(m.members.some(o => o.gone) && P.health < health, 'marathon: running into the runners knocks them down, and costs health');

  // ---- balloon (s 3550)
  start(3250, 3, 30);
  let landed = false;
  g.run(20, () => { quiet(); const b = Hazards.balloons[0]; if (b.state === 'sit') landed = true; g.drive(b.state === 'gone' ? 1 : P.s > 3480 ? -1 : 1, 0); return P.s > 3600; });
  check(landed && Hazards.balloons[0].state === 'gone' && !Hazards.balloons[0].hit, 'balloon: it lands, sits and lifts off; waiting for it costs nothing');
  start(3250, 3, 30);
  const before = P.health;
  g.run(20, () => { quiet(); return P.s > 3600; });
  check(Hazards.balloons[0].hit && P.health < before, 'balloon: driving into its basket costs health (' + Math.round(before - P.health) + ')');

  // ---- wide load (s 3900)
  start(3700, 3, 30);
  g.run(6, () => { quiet(); return Hazards.loads[0].on && Hazards.loads[0].load.s > 3920; });
  check(Hazards.loads[0].on, 'wide load: it sets off as the player comes near');
  // (passed at speed, by timing: a scripted driver that never brakes below 12 m/s, reads the swing, wrong-foots
  // the escort and goes through on the open side; from every second of the load's rhythm, on Gimmick Road 2's
  // three lanes a side and on a copy of it with two)
  const passLoad = (label, prefer) => {
    const W = g.CONFIG.wideLoad, T = g.track.Track, period = 2 * (W.dwell + W.shift);
    let worst = { speed: Infinity, lost: 0, busts: 0, failed: 0, shoulder: 0, runs: 0, sides: { '-1': 0, 1: 0 } };
    for (let phase = 0; phase < period; phase += 1.3) {
      start(3700, T.rightLanes > 2 ? T.laneCount - 2 : T.laneCount - 1, 20);
      const w = Hazards.loads[0], health = P.health;
      let slowest = Infinity, onShoulder = 0, side = 0, speed = 20, phased = false;
      g.run(60, () => {
        quiet();
        if (!w.on) return false;
        if (!phased) { w.t = phase; phased = true; }
        const { load, escort } = w, room = 2 * P.hw + 1;
        const d = load.s - load.hl - P.s - P.hl, lane0 = g.levels.LEVEL.wideLoads[0].lanes[0];
        // the gap either side of it, at its narrowest while the car would be alongside, were it to close on it at v
        const look = (v) => {
          const c = Math.max(3, v - W.speed), eta = Math.max(0, d) / c, out = eta + (Math.min(d, 0) + 2 * load.hl + 2 * P.hl + 2) / c;
          const gaps = { '-1': Infinity, 1: Infinity }, at = {};
          for (let t = eta; t <= out + 1e-6; t += 0.1) {
            const s = load.s + W.speed * t, [left, right] = w.ends(s), lat = left + (right - left) * Hazards.loadSwing({ t: w.t + t });
            const lo = T.laneOffset(lane0, s) - g.CONFIG.laneWidth / 2, hi = T.hi(s);
            if (lat - load.hw - lo < gaps[-1]) { gaps[-1] = lat - load.hw - lo; at[-1] = (lat - load.hw + lo) / 2; }
            if (hi - lat - load.hw < gaps[1]) { gaps[1] = hi - lat - load.hw; at[1] = (lat + load.hw + hi) / 2; }
          }
          return { gaps, at };
        };
        // (well back, it picks the fastest speed, down to 14 m/s, that brings it alongside with a side open, and
        // that side; from 30 m out it is committed)
        if (d > 30 || !side) {
          side = 0;
          for (let v = Math.ceil(g.cars.CAR.maxSpeed); v >= 14 && !side; v--) {
            const { gaps } = look(v);
            const pick = gaps[prefer] >= room ? prefer : gaps[-prefer] >= room ? -prefer : 0;
            if (pick) { side = pick; speed = v; }
          }
        }
        const { at } = look(Math.max(P.speed, 14));
        let throttle = d > 30 ? (P.speed < speed - 0.4 ? 1 : P.speed > speed + 0.4 ? -1 : 0) : 1, want = P.lat;
        if (!side) throttle = P.speed > 14 ? -1 : 0; // (neither side will be open as it gets there: ease off, never to a stop)
        else {
          want = at[side];
          // (the escort: come up on the other side of it, and cut across late; and out onto the shoulder only as it comes alongside)
          const back = escort.s - escort.hl - P.s - P.hl;
          if (back > 0.9 * Math.max(4, P.speed - W.speed)) want = Math.max(T.laneOffset(T.laneCount - T.rightLanes, P.s) - g.CONFIG.laneWidth / 2 + P.hw, Math.min(T.laneHi(P.s) - P.hw, at[side] - side * (side > 0 ? 6 : 4)));
          else if (side > 0 && d > 0.85 * Math.max(4, P.speed - W.speed)) want = Math.min(want, T.laneHi(P.s) - P.hw);
          // (and by the escort itself on the side it is going, with room to spare, wherever it has got to)
          if (back > -2 * escort.hl - 2 * P.hl && back <= 0.9 * Math.max(4, P.speed - W.speed)) want = side > 0 ? Math.max(want, escort.lat + escort.hw + P.hw + 0.5) : Math.min(want, escort.lat - escort.hw - P.hw - 0.5);
        }
        g.drive(throttle, Math.abs(want - P.lat) < 0.15 ? 0 : Math.sign(want - P.lat));
        if (Math.abs(P.s - load.s) < 60) slowest = Math.min(slowest, P.speed);
        if (P.onShoulder) onShoulder += 1 / 60;
        return w.passed || P.busted || G.wrecks > 0;
      });
      worst.runs++;
      if (process.env.DBG) console.log('DBG', label, 'phase', phase.toFixed(1), 'side', side, 'slowest', slowest.toFixed(1), 'lost', health - P.health, 'sh', onShoulder.toFixed(1), P.busted, w.passed);
      worst.sides[side || 1]++;
      worst.speed = Math.min(worst.speed, slowest);
      worst.lost = Math.max(worst.lost, health - P.health);
      worst.shoulder = Math.max(worst.shoulder, onShoulder);
      if (P.busted) worst.busts++;
      if (!w.passed) worst.failed++;
    }
    check(!worst.failed && !worst.busts && worst.lost === 0 && worst.speed >= 12,
      'wide load, ' + label + ': passed from all ' + worst.runs + ' points of its rhythm (' + worst.sides[-1] + ' on its left, ' + worst.sides[1] + ' on its right) with no bust and no damage, never under ' +
      (worst.speed * 3.6).toFixed(0) + ' km/h (most on the shoulder: ' + worst.shoulder.toFixed(1) + ' s; ' + worst.failed + ' not past, ' + worst.busts + ' busts, ' + worst.lost.toFixed(0) + ' health lost)');
  };
  passLoad('three lanes a side, in the lane first', -1);
  passLoad('three lanes a side, the shoulder first', 1);
  // (and run into: a knock, and it is still there)
  start(3700, 5, 25);
  let knocked = 0;
  g.run(30, () => { quiet(); const w = Hazards.loads[0]; if (w.on) P.lat = w.load.lat; if (P.health < P.maxHealth) knocked++; return knocked > 30 || G.wrecks > 0; });
  check(knocked > 0 && G.wrecks === 0 && !P.busted && !Hazards.loads[0].load.gone && !Hazards.loads[0].escort.gone && P.health > P.maxHealth * 0.6,
    'wide load: driving into it is a knock (' + Math.round(P.maxHealth - P.health) + ' health), no wreck and no bust, and it is still there');
  g.select({ ...level, id: 'wide-load-two-lanes', lanes: 4, exits: [], pickups: [], waterMains: [], schoolCrossings: [], trolleys: [], marathons: [], balloons: [], drawbridges: [], wreckage: [], cameras: [], potholes: [], crossings: [], stampedes: [],
    wideLoads: [{ s: 3900, lanes: [2, 3] }] });
  start(3700, 3, 20);
  console.log('         (two lanes a side: ' + (g.track.Track.problems.join(' | ') || 'no problems') + ')');
  passLoad('two lanes a side, in the lane first', -1);
  passLoad('two lanes a side, the shoulder first', 1);
  g.select('gimmick-road-2');

  // ---- drawbridge (s 4700)
  start(4400, 3, 40);
  let highest = 0;
  g.run(15, () => { quiet(); highest = Math.max(highest, P.air); return P.s > 4820; });
  check(G.wrecks === 0 && highest > 1 && said('jumped'), 'drawbridge: at speed the car jumps the gap (' + highest.toFixed(1) + ' m up)');
  // (its deck, and the car on it: held open, the car hands off at the speed its board asks for)
  {
    const D = g.CONFIG.drawbridge, c = () => Hazards.bridges[0], need = Math.ceil(Hazards.bridgeJumpSpeed() * 3.6 / 5) * 5 / 3.6;
    const hold = () => { quiet(); Object.assign(c(), { state: 'open', t: D.raise + 1, started: true }); };
    start(4600, 3, need);
    hold();
    const lipY = D.leaf * Math.sin(D.angle), gap = Hazards.bridgeGap(c());
    const up = Hazards.deck(c(), 4700 - D.leaf / 2), down = Hazards.deck(c(), 4700 + D.leaf / 2);
    check(Math.abs(up.slope - Math.tan(D.angle)) < 1e-6 && Math.abs(down.slope + Math.tan(D.angle)) < 1e-6 && Math.abs(up.y - down.y) < 1e-6 && Hazards.deck(c(), 4700) === null &&
      Hazards.deck(c(), 4700 - D.leaf - 1) === undefined && Hazards.surface(4700).y < 0 && Hazards.surface(4600).y === 0,
      'drawbridge: its deck is two leaves at ' + (D.angle * 180 / Math.PI).toFixed(0) + ' degrees, lips ' + lipY.toFixed(1) + ' m up, ' + gap.toFixed(1) + ' m apart');
    let onLeaf = 0, off = 0, flew = false, top = 0, landedPitch = null, wasJump = false;
    g.drive(0, 0);
    g.run(15, () => {
      hold();
      const deck = Hazards.deck(c(), P.s);
      if (!Hazards.jump && deck && deck.slope > 0) { onLeaf++; off = Math.max(off, Math.abs(P.air - deck.y), Math.abs(P.pitch - D.angle)); }
      if (Hazards.jump) { flew = true; top = Math.max(top, P.air); }
      if (wasJump && !Hazards.jump) landedPitch = P.pitch;
      wasJump = !!Hazards.jump;
      return P.s > 4760 || G.wrecks > 0;
    });
    check(onLeaf > 10 && off < 1e-3, 'drawbridge: up the leaf the car is on its surface, pitched to its angle (' + onLeaf + ' steps, off by ' + off.toFixed(4) + ')');
    check(flew && top > lipY && G.wrecks === 0 && P.s > 4760, 'drawbridge: at the speed on its board, ' + Math.round(need * 3.6) + ' km/h, hands off, it crests the lip, flies (' + top.toFixed(1) + ' m up) and is over');
    check(landedPitch !== null && landedPitch <= 0, 'drawbridge: it lands pitched to what it lands on (' + (landedPitch ?? NaN).toFixed(2) + ' rad)');
    start(4640, 3, 10);
    hold();
    g.drive(1, 0);
    let high = 0;
    g.run(10, () => { hold(); if (P.s < 4684) P.speed = Math.min(P.speed, 10); high = Math.max(high, P.air); return G.wrecks > 0; });
    check(G.wrecks === 0 && high > 0.5 && high < lipY - 1 && P.s <= 4700 - D.leaf && P.speed < 2, 'drawbridge: far too slow, it stops short on the leaf (' + high.toFixed(1) + ' m up) and rolls back to its foot');
    for (const car of g.cars.CARS) if (!(car.maxSpeed >= need)) check(false, 'drawbridge: ' + car.id + ' cannot reach the speed that clears it');
    check(g.cars.CARS.every(car => car.tank || car.maxSpeed >= need), 'drawbridge: the top speed of every garage car clears it');
  }
  start(4400, 3, 18);
  g.run(25, () => { quiet(); P.speed = Math.min(P.speed, 18); return P.s > 4760 || G.wrecks > 0; });
  check(G.wrecks === 1 && said('Into the river'), 'drawbridge: too slow, the car drops into the gap and is wrecked');
  start(4400, 3, 30);
  g.run(40, () => { quiet(); const c = Hazards.bridges[0]; g.drive(c.state !== 'idle' && P.s < 4680 ? -1 : 1, 0); return P.s > 4760 || G.wrecks > 0; });
  check(G.wrecks === 0 && P.s > 4760, 'drawbridge: waiting for it to come down, then driving over, is safe');

  // ---- road train jackknife (s 5050, lanes 4 and 5)
  start(4850, 5, 30);
  g.run(12, () => { quiet(); return P.s > 5100 || G.wrecks > 0; });
  check(G.wrecks === 1 && said('jackknifing'), 'jackknife: staying in its lane wrecks the car');
  start(4850, 3, 30);
  g.run(12, () => { quiet(); return P.s > 5100 || G.wrecks > 0; });
  check(G.wrecks === 0, 'jackknife: the lane left open is safe');

  // ---- the side road: a camera, potholes, a level crossing and a stampede on it
  start(5300, 5, 30, { ghost: false });
  let onSide = false, crossingWent = false, seen = 0;
  const x = g.track.Track.exits[0];
  g.run(60, () => {
    quiet();
    if (P.s > 5330 && P.s < 5420 && g.track.Track.isMain(P.s)) P.lat = g.track.Track.hi(P.s) - 1.2; // (out into the exit lane)
    if (!g.track.Track.isMain(P.s)) { onSide = true; P.lat = lane(1, P.s); P.health = P.maxHealth; P.danger = 99; }
    if (Crossings.list[0].state !== 'idle') crossingWent = true;
    seen = Math.max(seen, Hazards.stampedes[0].animals.filter(o => o.gone).length);
    return onSide && g.track.Track.isMain(P.s);
  });
  check(onSide, 'side road: the car took the exit');
  check(G.fines > 0 || said('SPEED CAMERA'), 'side road: its speed camera caught the car ($' + G.fines + ')');
  check(Site.holes.length === 3 && Site.holes.every(h => !g.track.Track.isMain(h.s)), 'side road: its potholes are on it');
  check(crossingWent, 'side road: its level crossing went off as the car came up to it');
  check(said('STAMPEDE') && seen > 0, 'side road: the stampede charged (' + seen + ' of 8 run into or gone by)');

  // ---- slippery road: ice and a burst main's water against the dry road (CONFIG.ice, CONFIG.waterMain), on
  // three straight stretches of this level with everything else taken off it
  {
    const T = g.track.Track, LW = g.CONFIG.laneWidth, SPAN = 300;
    const straight = (from) => { for (let s = from; s < from + SPAN; s += 5) if (Math.abs(T.bend(s)) > 1e-6 || !T.isMain(s)) return false; return true; };
    const spots = [];
    for (let s = 600; s < T.length - SPAN - 200 && spots.length < 3; s += 20) if (straight(s)) { spots.push(s); s += SPAN + 40; }
    const [dryAt, iceAt, wetAt] = spots;
    check(spots.length === 3, 'slippery road: three straight stretches to try it on (at ' + spots.join(', ') + ')');
    g.select({ ...level, id: 'slippery-road', exits: [], pickups: [], schoolCrossings: [], trolleys: [], marathons: [], balloons: [], drawbridges: [], wreckage: [], cameras: [], potholes: [], crossings: [], stampedes: [], wideLoads: [], targets: [],
      ice: [{ from: iceAt, to: iceAt + SPAN }], waterMains: [{ s: wetAt, lane: 4, length: SPAN }, { s: wetAt, lane: 5, length: SPAN }] });
    // (both mains kept spraying)
    const hold = () => { quiet(); Hazards.mains.forEach((m, i) => { m.on = true; m.t = 0; T.sprays[i].on = true; }); };
    const brakeFrom = 30, brakeTo = 10;
    // m the car takes to brake from 30 to 10 m/s, and s to move one lane across (lane 4 to lane 5) at full steer
    const braking = (at, ghost) => {
      start(at + 10, 4, brakeFrom, { ghost }); hold(); g.drive(-1, 0);
      let off = 0;
      g.run(12, () => { hold(); if (at !== dryAt && !P.onIce) off++; return P.speed <= brakeTo; });
      return { d: P.s - at - 10, on: off <= 1, v: P.speed }; // (a main's water is on the road from the run's second step)
    };
    const across = (at, ghost) => {
      start(at + 10, 4, 20, { ghost }); hold();
      const from = P.lat, side = Math.sign(lane(5, at) - lane(4, at));
      g.drive(1, side);
      let off = 0;
      const t = g.run(6, () => { hold(); if (at !== dryAt && !P.onIce) off++; return Math.abs(P.lat - from) >= LW; });
      return { t, on: off <= 1, moved: Math.abs(P.lat - from) };
    };
    const b = { dry: braking(dryAt), ice: braking(iceAt), wet: braking(wetAt) }, a = { dry: across(dryAt), ice: across(iceAt), wet: across(wetAt) };
    const m1 = (x) => x.toFixed(1), s2 = (x) => x.toFixed(2);
    console.log('         (braking ' + brakeFrom + ' to ' + brakeTo + ' m/s: dry ' + m1(b.dry.d) + ' m, ice ' + m1(b.ice.d) + ' m, mains water ' + m1(b.wet.d) + ' m)');
    console.log('         (one lane across at full steer: dry ' + s2(a.dry.t) + ' s, ice ' + s2(a.ice.t) + ' s, mains water ' + s2(a.wet.t) + ' s)');
    check(b.ice.on && b.wet.on && a.ice.on && a.wet.on, 'slippery road: the car was on the ice, and on the water, all the way through each try');
    check(b.dry.v <= brakeTo && b.ice.v <= brakeTo && b.wet.v <= brakeTo, 'slippery road: the brakes still slow the car on all three');
    check(b.ice.d > b.dry.d * 1.5, 'slippery road: braking takes clearly longer on ice (' + m1(b.ice.d / b.dry.d) + ' times the dry road\'s distance)');
    check(b.wet.d > b.dry.d * 1.5, 'slippery road: braking takes clearly longer on a main\'s water (' + m1(b.wet.d / b.dry.d) + ' times)');
    check(a.dry.moved >= LW && a.ice.moved >= LW && a.wet.moved >= LW, 'slippery road: the car can still change lane on all three');
    check(a.ice.t > a.dry.t * 1.5, 'slippery road: a lane change takes clearly longer on ice (' + m1(a.ice.t / a.dry.t) + ' times the dry road\'s time)');
    check(a.wet.t > a.dry.t * 1.5, 'slippery road: a lane change takes clearly longer on a main\'s water (' + m1(a.wet.t / a.dry.t) + ' times)');
    check(a.ice.t < 2 && a.wet.t < 2, 'slippery road: and still no more than 2 s on either');
    // from a standstill on each, the accelerator and the steering both still answer
    const away = (at) => { start(at + 10, 4, 0); hold(); const from = P.lat; g.drive(1, Math.sign(lane(5, at) - lane(4, at))); g.run(3, () => { hold(); }); return P.speed > g.CONFIG.minSpeed && Math.abs(P.lat - from) > LW / 2; };
    check(away(iceAt) && away(wetAt), 'slippery road: from a standstill on either, the car pulls away and steers');
    // a ghost: nothing spares it the ice or the water (nor did anything before), so it must feel just the same
    const gb = { ice: braking(iceAt, true), wet: braking(wetAt, true) }, ga = { ice: across(iceAt, true), wet: across(wetAt, true) };
    console.log('         (a ghost: braking ' + m1(gb.ice.d) + ' m on ice and ' + m1(gb.wet.d) + ' m on water, a lane across in ' + s2(ga.ice.t) + ' s and ' + s2(ga.wet.t) + ' s)');
    check(Math.abs(gb.ice.d - b.ice.d) < 0.5 && Math.abs(gb.wet.d - b.wet.d) < 0.5 && Math.abs(ga.ice.t - a.ice.t) < 0.05 && Math.abs(ga.wet.t - a.wet.t) < 0.05,
      'slippery road: a ghost is on the ice and in the water like any car (no exemption, as before)');
    g.select('gimmick-road-2');
  }
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
