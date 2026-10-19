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
          // (planned a little under top speed: a sweep across the road flat out at top speed scrubs about 1 m/s since
          // CHECKLIST 421, CONFIG.trueSpeed.driven, and a pass planned at the very top speed then arrives late)
          for (let v = Math.floor(g.cars.CAR.maxSpeed) - 1; v >= 14 && !side; v--) {
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
    wideLoads: [{ s: 3900, lanes: [2, 3] }], oilSlicks: [], gluePiles: [], empMines: [], magmaPatches: [] });
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

  // ---- the player's own (hazards.js patchesOf): oil slicks, on Gimmick Road 2. Traffic is never touched by them
  {
    const T = g.track.Track, own = (kind) => Hazards.patches.find(p => p.kind === kind);
    // ---- oil slick (s 2350, lane 4): ice, far worse, for CONFIG.oilSlick.time s
    const oil = own('oil'), O = g.CONFIG.oilSlick;
    check(!!oil, 'oil slick: on the level');
    start(oil.from - 40, 4, 30);
    let oiled = false;
    g.run(4, () => { quiet(); if (P.onOil) oiled = true; return P.s > oil.to + 5; });
    check(oiled && P.onOil && P.onIce && said('Oil!'), 'oil slick: driving over it puts the car on oil (and says so)');
    // braking from 30 m/s for 0.5 s: on the oil against the dry road, and against ice (CONFIG.ice)
    const shed = (setup) => { start(oil.from - 200, 4, 30); setup(); g.drive(-1, 0); const v = P.speed; g.run(0.5, () => { quiet(); setup(); }); return v - P.speed; };
    const dry = shed(() => {}), slick = shed(() => { P.oiled = O.time + O.tail; });
    console.log('         (speed shed braking 0.5 s from 30 m/s: dry ' + dry.toFixed(1) + ', oiled ' + slick.toFixed(1) + ' m/s; the ice\'s brakes ' + Math.round(g.CONFIG.ice.brakeGrip * 100) + '%, the oil\'s ' + Math.round(O.brakeGrip * 100) + '%)');
    check(slick < dry * 0.3, 'oil slick: the brakes barely bite on it');
    check(O.brakeGrip < g.CONFIG.ice.brakeGrip && O.steerGrip < g.CONFIG.ice.steerGrip && O.laneSpeed < g.CONFIG.ice.laneSpeed && O.accelGrip < g.CONFIG.ice.accelGrip && O.grip < g.CONFIG.ice.grip, 'oil slick: every grip number below the ice\'s');
    start(oil.from - 40, 4, 30);
    let lasted = 0;
    g.run(8, () => { quiet(); if (P.onOil) lasted += 1 / 60; return P.s > oil.to + 200; });
    check(!P.onOil && lasted > 1.5 && lasted < O.time + O.tail + 0.3, 'oil slick: it wears off ' + lasted.toFixed(2) + ' s after (CONFIG.oilSlick time ' + O.time + ' s + tail ' + O.tail + ' s, refilled while on it; a car that spins out gets its grip back at once)');
    check(!T.icy(oil.s, lane(4, oil.s)), 'oil slick: traffic\'s road is not slippery there (Track.icy: what traffic slides on)');
    start(oil.from - 40, 4, 30);
    let tankOiled = false;
    g.run(4, () => { quiet(); P.tank = 1; if (P.onOil) tankOiled = true; return P.s > oil.to + 5; });
    check(!tankOiled, 'oil slick: a tank rides over it untouched');
    start(oil.from - 40, 4, 30);
    P.shield = 5;
    let shieldOiled = false;
    g.run(4, () => { quiet(); P.shield = 5; if (P.onOil) shieldOiled = true; return P.s > oil.to + 5; });
    check(!shieldOiled, 'oil slick: a car just set down (shielded) rides over it untouched');

    // ---- the slide: a kick the way the car was going, a big yaw, countersteer saves it (CONFIG.oilSlick, Player.oilStep)
    // A scripted driver: `strat` is 'none', 'with' (steers the way it slides), or a countersteer after `at` s from the kick
    // (full lock against the yaw until it is nearly straight). Returns the outcome and a trace, to compare runs exactly.
    const slide = (car, speed, strat, at = 0, { lv = 0, off = 10 } = {}) => {
      g.cars.pinCar(car);
      start(oil.from - off, 4, speed);
      P.latVel = lv;
      const lat0 = P.lat, h0 = P.health, trace = [];
      let kick = null, peak = 0, maxLat = 0;
      g.run(8, (t) => {
        quiet();
        if (kick === null && P.oiled > 0) kick = t;
        let u = 0;
        if (kick !== null && P.oiled > 0) {
          if (strat === 'with') u = P.oilSpun ? 0 : Math.sign(P.oilYaw) || P.oilSide;
          else if (strat === 'counter' && t - kick >= at && Math.abs(P.oilYaw) > 0.1) u = -Math.sign(P.oilYaw);
        }
        g.drive(1, u);
        if (kick !== null) { peak = Math.max(peak, Math.abs(P.yaw)); maxLat = Math.max(maxLat, Math.abs(P.lat - lat0)); if (trace.length < 400) trace.push(Math.round(P.yaw * 1000) + ':' + Math.round((P.lat - lat0) * 1000)); }
        return kick !== null && P.oiled <= 0 && t - kick > 0.5 || P.busted;
      });
      g.cars.pinCar(null);
      return { spun: P.oilSpun, hurt: Math.round(h0 - P.health), peak: Math.round(peak * 57.3), side: P.oilSide, maxLat, left: Math.abs(P.yaw), trace: trace.join(',') };
    };
    const cap = Math.min(g.CONFIG.maxYawDeg, 45) + O.yawExtra;
    const none = slide('commuter', 40, 'none');
    console.log('         (commuter 40 m/s, no input: yaw peak ' + none.peak + ' deg (usual clamp ' + Math.min(g.CONFIG.maxYawDeg, 45) + ', this one ' + cap + '), ' + none.maxLat.toFixed(1) + ' m across, health -' + none.hurt + ')');
    check(none.spun && none.hurt > 0 && none.peak > Math.min(g.CONFIG.maxYawDeg, 45) + 15 && none.maxLat > 3.5, 'oil slick: doing nothing, the yaw builds well past the usual clamp, the car slides over a lane and spins out');
    check(slide('commuter', 40, 'with').spun, 'oil slick: steering WITH the slide spins the car out');
    check(slide('commuter', 40, 'none', 0, { lv: 3, off: 1 }).side === 1 && slide('commuter', 40, 'none', 0, { lv: -3, off: 1 }).side === -1, 'oil slick: the kick is the way the car was going (its sideways speed)');
    // (a run twice over is the same run, to the last hundredth: nothing here draws a die)
    check(slide('commuter', 40, 'counter', 0.5).trace === slide('commuter', 40, 'counter', 0.5).trace && none.trace === slide('commuter', 40, 'none').trace, 'oil slick: deterministic, the same run twice gives the same yaw and path');
    const table = [];
    let saved = true, lost = true;
    for (const [car, label] of [['mini', 'light'], ['commuter', 'average'], ['polytruck', 'low-agility heavy'], ['sixbysix', 'heavy']]) {
      for (const v of [25, 40, 60]) {
        const row = { car: label, v };
        for (const at of [0.3, 0.5, 0.8]) { const r = slide(car, v, 'counter', at); row['@' + at] = r.spun ? 'SPUN' : r.left > 0.17 ? 'yawed' : 'ok ' + r.peak + ' deg ' + r.maxLat.toFixed(1) + ' m'; if (at <= 0.5 && (r.spun || r.left > 0.17)) saved = false; }
        const n = slide(car, v, 'none'), w = slide(car, v, 'with');
        row.none = n.spun ? 'SPUN' : 'ok'; row.with = w.spun ? 'SPUN' : 'ok';
        if (!n.spun || !w.spun) lost = false;
        table.push(row);
      }
    }
    console.log('         (countersteer at 0.3 / 0.5 / 0.8 s after the kick, doing nothing, and steering with it:)');
    for (const r of table) console.log('           ' + r.car.padEnd(18) + String(r.v).padStart(3) + ' m/s  0.3: ' + r['@0.3'].padEnd(16) + ' 0.5: ' + r['@0.5'].padEnd(16) + ' 0.8: ' + r['@0.8'].padEnd(16) + ' none: ' + r.none + '  with: ' + r.with);
    check(saved, 'oil slick: a countersteer at 0.3 s or 0.5 s after the kick recovers cleanly (no spin, straight again), at 25, 40 and 60 m/s, in a light, an average, a heavy and a low-agility car');
    check(lost, 'oil slick: doing nothing, or steering with the slide, spins every one of them out');
    const late = (car) => slide(car, 40, 'counter', 0.7).spun;
    check(late('mini') && !slide('polytruck', 40, 'counter', 0.7).spun, 'oil slick: the window is shorter in a light, agile car and longer in a heavy, low-agility one (0.7 s late: mini ' + (late('mini') ? 'spins' : 'recovers') + ', polytruck ' + (slide('polytruck', 40, 'counter', 0.7).spun ? 'spins' : 'recovers') + ')');

    // ---- glue pile (s 2550, lane 4): held still for CONFIG.gluePile.hold s, then let go at .kept of the speed it came with
    const glue = own('glue'), GP = g.CONFIG.gluePile;
    check(!!glue, 'glue pile: on the level');
    start(glue.s - 40, 4, 25);
    let came = 0, heldAt = null, heldFor = 0, moved = 0, after = null;
    g.run(6, () => {
      quiet();
      if (P.glued > 0) { if (heldAt === null) { heldAt = { s: P.s, lat: P.lat }; came = P.gluedSpeed / GP.kept; } heldFor += 1 / 60; moved = Math.max(moved, Math.abs(P.s - heldAt.s), Math.abs(P.lat - heldAt.lat)); }
      else if (heldAt && after === null) after = P.speed;
      return after !== null;
    });
    console.log('         (came at ' + came.toFixed(1) + ' m/s, held ' + heldFor.toFixed(2) + ' s, moved ' + moved.toFixed(3) + ' m held, let go at ' + (after ?? 0).toFixed(1) + ' m/s)');
    check(heldAt && said('Glue!'), 'glue pile: driving onto it sticks the car (and says so)');
    check(Math.abs(heldFor - GP.hold) < 0.05 && moved < 0.01, 'glue pile: held still, no movement, for ' + GP.hold + ' s');
    check(after !== null && Math.abs(after - came * GP.kept) < 0.6, 'glue pile: let go at ' + Math.round(GP.kept * 100) + '% of the speed it came with');
    g.run(2, () => { quiet(); });
    check(!(P.glued > 0) && P.s > glue.s + 10, 'glue pile: once a pass: the car drives on off it');
    start(glue.s - 40, 4, 25);
    let tankGlued = false;
    g.run(4, () => { quiet(); P.tank = 1; if (P.glued > 0) tankGlued = true; return P.s > glue.s + 10; });
    check(!tankGlued, 'glue pile: a tank rides over it untouched');

    // ---- EMP mine (s 2750, lane 4): a little damage, then no accelerator, steering or throwing for CONFIG.empMine.time s
    const emp = own('emp'), E = g.CONFIG.empMine, { Packages } = await g.load('packages.js');
    check(!!emp, 'EMP mine: on the level');
    start(emp.s - 40, 4, 30);
    const hp = P.health;
    let hit = false;
    g.run(4, () => { quiet(); if (P.emp > 0) hit = true; return hit; });
    check(hit && own('emp').gone && said('EMP!'), 'EMP mine: run over, it goes off and is gone (and says so)');
    check(Math.abs(hp - P.health - E.damage) < 0.01, 'EMP mine: ' + E.damage + ' damage (' + (hp - P.health).toFixed(1) + ')');
    check(g.Message.sticky.some(h => h.path === 'events.emp'), 'EMP mine: its status icon is up');
    const flying = () => Packages.list.filter(p => p.active).length, latAt = P.lat, thrown = flying();
    g.drive(1, 1);
    Packages.throwOne();
    let slowest = P.speed, outFor = 0;
    g.run(E.time + 1, () => { quiet(); if (P.emp > 0) { outFor += 1 / 60; slowest = Math.min(slowest, P.speed); } return P.emp <= 0; });
    console.log('         (out for ' + outFor.toFixed(2) + ' s, down to ' + slowest.toFixed(1) + ' m/s with the accelerator held, moved ' + Math.abs(P.lat - latAt).toFixed(2) + ' m across steering hard)');
    check(Math.abs(outFor - E.time) < 0.1, 'EMP mine: the electronics are out for ' + E.time + ' s');
    check(slowest <= E.crawl + 0.01 && slowest > 0, 'EMP mine: no accelerator: it slows hard, to a crawl (' + E.crawl + ' m/s), never a stop');
    check(Math.abs(P.lat - latAt) < 0.3, 'EMP mine: no steering');
    check(flying() === thrown, 'EMP mine: no throwing');
    const v0 = P.speed;
    g.run(1, () => { quiet(); });
    const before = flying();
    Packages.throwOne();
    check(P.speed > v0 + 1 && Math.abs(P.lat - latAt) > 0.5 && flying() > before && !g.Message.sticky.some(h => h.path === 'events.emp'), 'EMP mine: after it, the accelerator, steering and throwing answer again, and the icon is gone');
    start(emp.s - 40, 4, 30, { ghost: true });
    g.run(3, () => { quiet(); return P.s > emp.s + 10; });
    check(!(P.emp > 0) && !own('emp').gone, 'EMP mine: a ghost passes over it');

    // ---- magma (s 2950, lane 4): CONFIG.magma.damage as the car touches it, and every .every s while it is on it
    const M = g.CONFIG.magma, mag = own('magma');
    check(!!mag, 'magma: on the level');
    start(mag.from - 140, 4, 30); // (past the EMP mine in the same lane)
    let h0 = P.health, burns = [];
    g.run(10, () => { quiet(); if (P.health < h0 - 0.01) { burns.push(h0 - P.health); } h0 = P.health; return P.s > mag.to + 20; });
    check(said('Magma ahead!'), 'magma: warned of on the way up to it');
    check(burns.length === 1 && Math.abs(burns[0] - M.damage) < 0.01, 'magma: driven over at speed, one burn of ' + M.damage + ' (' + burns.map(b => b.toFixed(0)).join(', ') + ')');
    // (held on it for 2 s: a burn as it touches, and every 0.5 s after; a burn a step is counted)
    const sit = (setup = () => {}) => {
      start(mag.s, 4, 0);
      P.health = P.maxHealth = 1e4;
      setup();
      let last = P.health, n = 0, total = 0;
      g.run(2, () => { quiet(); P.s = mag.s; P.speed = 0; setup(); if (P.health < last - 0.01) { n++; total += last - P.health; } last = P.health; });
      return { n, total };
    };
    const held = sit();
    check(held.n === Math.floor(2 / M.every) && Math.abs(held.total - held.n * M.damage) < 0.1, 'magma: held on it 2 s, burnt ' + held.n + ' times (every ' + M.every + ' s), ' + held.total.toFixed(0) + ' in all');
    check(sit(() => { P.tank = 1; }).n === 0, 'magma: a tank is not burnt');
    check(sit(() => { P.testGhost = true; P.ghost = 1; }).n === 0, 'magma: a ghost is not burnt');
    check(sit(() => { P.shield = 1; }).n === 0, 'magma: a car just set down (its shield) is not burnt');
    check(sit(() => { P.mystery = 'invincible'; P.mysteryTime = 9; }).total === 0, 'magma: an invincible car takes nothing (damageScale)');
    const armoured = sit(() => { P.armour = 9; });
    check(Math.abs(armoured.total - held.total * g.CONFIG.armour.damage) < 0.5, 'magma: armour takes its share off (' + armoured.total.toFixed(0) + ' of ' + held.total.toFixed(0) + ')');
    // (and traffic: a car stood on each of the four, a second, untouched)
    start(oil.from - 300, 4, 0);
    const cars = g.Traffic.cars.slice(0, 4), spots = ['oil', 'glue', 'emp', 'magma'].map(own);
    let harmed = 0;
    g.run(1, () => { cars.forEach((car, i) => { Object.assign(car, { active: true, s: spots[i].s, lat: lane(4, spots[i].s), vs: 0, dir: 1, health: car.maxHealth || 100 }); }); });
    cars.forEach((car, i) => { if (car.health < (car.maxHealth || 100) || car.spin > 0) harmed++; });
    check(harmed === 0 && !own('emp').gone && P.emp === 0, 'traffic: a car on each of the four is untouched by it (and the mine is not set off)');
  }

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
