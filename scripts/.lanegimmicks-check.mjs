// A check of the lane gimmicks (src/delivery/lanegimmicks.js: boost pads and dead-end lanes), headless, on Mall Dash.
// Boost pads: on a pad the car goes faster than its own top speed, the push ends soon after the pad, it never stops the
// car, a ghost is pushed too, the handrails are ordinary obstacles (a cone's box and cost) and are blown away on contact.
// Dead ends: the warning with CONFIG.deadEnd.warn m to go; a SHUTTER wrecks a plain car, a Ghost passes through, a tank
// and an armoured car smash through (the shutter gone, no damage); a WALL wrecks a plain car, a Ghost AND a tank; the
// wrecked car is set in the open lane; another lane is always open (a level closing both is a problem); the warning
// distance is longer than a lane change takes at the fastest top speed, with a margin; no dead end's wall at a junction's
// mouth or on a pad; no one-way barrier along a dead lane (it is entered freely), but its blocker is solid from the side: a car
// steered at it from the lane beside is held at the line, never wrecked (the owner, 17-Oct); Mall Dash has no pad or turbo.
//   node scripts/.lanegimmicks-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { LaneGimmicks } = await g.load('lanegimmicks.js');
  const { CARS, carStats } = await g.load('cars.js');
  const { CONFIG } = g;
  const P = g.Player, G = g.Game, B = CONFIG.boostPad, D = CONFIG.deadEnd;
  // (Mall Dash's own travelators and turbos were taken out, the owner 17-Oct: the pads tested here are its three, put back on a copy)
  const PADS = [{ from: 200, to: 280, lane: 0, rails: true }, { from: 1850, to: 1930, lane: 0, rails: true }, { from: 2580, to: 2660, lane: 0, rails: true }];
  const mallDash = g.levels.HIDDEN_LEVELS['mall-dash'];
  check(!(mallDash.boostPads || []).length && !(mallDash.pickups || []).some(p => p.type === 'turbo'), 'Mall Dash itself: no travelator and no turbo pickup (the owner, 17-Oct)');
  const level = g.select({ ...mallDash, id: 'mall-pads', boostPads: PADS });
  const lane = (n, s) => g.track.Track.laneOffset(n, s);
  const start = (s, n, v, { ghost = false } = {}) => {
    P.testGhost = false;
    G.evil = false;
    g.said.length = 0;
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    Object.assign(P, { s, lat: lane(n, s), speed: v, launching: false, shield: 0, ghost: 0, tank: 0, armour: 0 });
    P.testGhost = ghost;
    g.drive(1, 0);
  };
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  const said = (text) => g.said.some(line => line.includes(text));
  start(100, 0, 0);
  const T = g.track.Track;
  console.log('Level problems: ' + (T.problems.join(' | ') || 'none'));
  check(!T.problems.length, 'the level loads without problems');
  check(LaneGimmicks.pads.length === 3 && LaneGimmicks.ends.length === 3, 'three pads and three dead ends (' + LaneGimmicks.ends.map(e => e.kind).join(', ') + ')');
  // ---- a pad: faster than the car's own top speed on it, back to it after
  const pad = LaneGimmicks.pads[0], top = carStats().maxSpeed;
  start(pad.from - 60, pad.lane, top);
  let most = 0, onPad = 0, after = null;
  g.run(12, () => { quiet(); g.drive(1, 0); if (P.s >= pad.from && P.s <= pad.to) { onPad++; } most = Math.max(most, P.speed); if (P.s > pad.to + 5 && after === null) after = P.s; return P.s > pad.to + 400; });
  check(onPad > 0 && most > top + B.speed * 0.5, 'on the pad the car goes well over its own top speed (' + most.toFixed(1) + ' vs ' + top.toFixed(1) + ' m/s)');
  check(Math.abs(P.speed - top) < 0.5, 'and is back to its own top speed by 400 m on (' + P.speed.toFixed(1) + ' m/s)');
  check(P.boost === 0, 'the push has ended');
  start(pad.from - 60, pad.lane, top, { ghost: true });
  let gmost = 0;
  g.run(8, () => { quiet(); g.drive(1, 0); gmost = Math.max(gmost, P.speed); return P.s > pad.to + 50; });
  check(gmost > top + B.speed * 0.5, 'a ghost is pushed too (' + gmost.toFixed(1) + ' m/s)');
  // the handrails: ordinary obstacles, a cone's box and cost
  const rails = g.Collision.obstacles.filter(o => o.kind === 'handrail');
  const K = CONFIG.obstacleKinds;
  check(rails.length === 144 && level.boostPads.every(p => p.rails === true) && JSON.stringify(K.handrail) === JSON.stringify(K.cone), rails.length + ' handrail sections (144 expected: the mall\'s pads say rails: true), each at a cone\'s cost');
  // (the rails' boxes: as thin as the rail, nothing of them in the lane beside, and the pad's lane keeps room for a car between them)
  const LW = CONFIG.laneWidth, outer = Math.max(...rails.map(o => Math.abs(o.lat - lane(pad.lane, o.s)) + o.hw)), inner = Math.min(...rails.map(o => Math.abs(o.lat - lane(pad.lane, o.s)) - o.hw));
  check(outer <= LW / 2 && inner * 2 >= P.hw * 2 + 0.5, 'the rails reach ' + outer.toFixed(2) + ' m from the pad lane\'s centre (the lane\'s edge is at ' + (LW / 2).toFixed(2) + '): nothing in the lane beside; ' + (inner * 2).toFixed(2) + ' m clear between them for a car ' + (P.hw * 2).toFixed(2) + ' m wide');
  start(pad.from - 30, pad.lane + 1, 20);
  const hNext = P.health, railsNext = rails.filter(o => !o.gone).length;
  g.run(8, () => { quiet(); g.drive(1, 0); P.lat = lane(pad.lane + 1, P.s); return P.s > pad.to + 12; });
  check(P.health === hNext && rails.filter(o => !o.gone).length === railsNext, 'a car down the lane beside the pad touches no rail');
  start(pad.from - 30, pad.lane, 20);
  const h0 = P.health, before = rails.filter(o => !o.gone).length;
  g.run(8, () => { quiet(); g.drive(1, 0); P.lat += 0.25; P.lat = Math.min(P.lat, lane(pad.lane, P.s) + CONFIG.laneWidth / 2 + 0.3); return P.s > pad.to + 20; });
  check(rails.filter(o => !o.gone).length < before && P.health < h0 && P.speed > 1 && !P.busted, 'steered into the rails: ' + (before - rails.filter(o => !o.gone).length) + ' blown away, ' + Math.round(h0 - P.health) + ' health lost, still going, no bust');
  // ---- dead ends: the warning, then each kind with each protection
  const shutter = LaneGimmicks.ends.find(e => e.kind === 'shutter'), wall = LaneGimmicks.ends.find(e => e.kind === 'wall');
  const into = (e, protect) => {
    start(e.s - 200, e.lane, 25);
    if (protect === 'ghost') P.ghost = 30; else if (protect === 'tank') P.tank = 30; else if (protect === 'armour') P.armour = 30;
    let warned = null;
    const o = g.Collision.obstacles.find(o => o.laneEnd && Math.abs(o.s - e.s) < 1);
    g.run(14, () => { quiet(); P.speed = 25; if (protect === 'ghost') P.ghost = 30; else if (protect === 'tank') P.tank = 30; else if (protect === 'armour') P.armour = 30; if (P.health > 0) P.lat = lane(e.lane, P.s); g.drive(1, 0); if (warned === null && said('DEAD END')) warned = e.s - P.s; return P.health <= 0 || !P.active || P.s > e.s + 30; });
    return { warned, wrecked: P.health <= 0 || !P.active, past: P.s > e.s + 10, gone: o.gone, lat: P.lat, open: o.openLat };
  };
  const plain = into(shutter, null);
  check(plain.warned !== null && plain.warned <= D.warn + 5 && plain.warned > D.warn - 40, 'the warning comes with ' + Math.round(plain.warned) + ' m to go (' + D.warn + ' set)');
  check(plain.wrecked && !plain.past, 'a plain car hitting the shutter is wrecked');
  check(Math.abs(plain.lat - plain.open) < 0.1, 'and set in the open lane beside (lat ' + plain.lat.toFixed(1) + ')');
  const gh = into(shutter, 'ghost');
  check(!gh.wrecked && gh.past, 'a Ghost passes through the shutter');
  const tk = into(shutter, 'tank');
  check(!tk.wrecked && tk.past && tk.gone, 'a tank smashes through the shutter (the shutter gone)');
  const ar = into(shutter, 'armour');
  check(!ar.wrecked && ar.past && ar.gone, 'an armoured car smashes through the shutter');
  const wp = into(wall, null), wg = into(wall, 'ghost'), wt = into(wall, 'tank'), wa = into(wall, 'armour');
  check(wp.wrecked && wg.wrecked && wt.wrecked && wa.wrecked, 'the wall wrecks a plain car, a Ghost, a tank and an armoured car alike');
  // ---- no one-way barrier (the owner, 17-Oct): the dead lane is entered and left freely up to its blocker; beside the blocker (a
  // shutter's face, a wall's face and the block behind it) a car from the open lane is held at the line, never wrecked from the side
  { const besideOf = (e) => e.lane > 0 ? e.lane - 1 : e.lane + 1;
    const steerIn = (e, at, secs = 2.5) => {
      start(at, besideOf(e), 20);
      const want = lane(e.lane, P.s), was = P.lat, h0 = P.health;
      g.run(secs, () => { quiet(); P.speed = 20; g.drive(1, Math.sign(want - P.lat)); P.latVel = Math.sign(want - was) * 4; return P.health <= 0 || Math.abs(P.lat - lane(e.lane, P.s)) < 0.3; });
      const line = lane(e.lane, P.s) + Math.sign(was - lane(e.lane, P.s)) * LW / 2;
      return { inLane: Math.abs(P.lat - lane(e.lane, P.s)) < 0.5, held: Math.sign(P.lat - line) === Math.sign(was - line) && Math.abs(P.lat - lane(e.lane, P.s)) > LW / 2, wrecked: P.health <= 0 || !P.active, hurt: P.health < h0, lat: P.lat, s: P.s };
    };
    for (const e of [shutter, wall]) {
      const early = steerIn(e, e.s - D.sign + 10);
      check(early.inLane && !early.wrecked, e.kind + ': after its sign the dead lane is entered freely, no barrier (lat ' + early.lat.toFixed(2) + ')');
      const run = (at, secs) => { start(at, besideOf(e), 20); const want = lane(e.lane, P.s), was = P.lat, h0 = P.health; let held = true;
        g.run(secs, () => { quiet(); P.speed = 20; g.drive(1, Math.sign(want - P.lat)); P.latVel = Math.sign(want - was) * 4;
          const near = P.s > e.s - 4 && P.s < e.s + (e.kind === 'wall' ? 24.3 : 0.4) + 4; if (near && Math.abs(P.lat - lane(e.lane, P.s)) < LW / 2 + P.hw - 0.1) held = false; return P.health <= 0 || P.s > e.s + 40; });
        return { held, wrecked: P.health <= 0 || !P.active, hurt: P.health < h0 }; };
      for (const at of [e.s - 3.9, e.s - 2, e.s + 2]) { // (its nose at the face, alongside it, and past it)
        const r = run(at, 2.2);
        check(r.held && !r.wrecked && !r.hurt, e.kind + ': steered at its blocker from the side at ' + (at - e.s).toFixed(1) + ' m: held at the line beside it, not wrecked');
      }
      if (e.kind === 'wall') for (const at of [e.s + 8, e.s + 18]) {
        const r = run(at, 0.5);
        check(r.held && !r.wrecked && !r.hurt, 'wall: steered into the block behind it at ' + (at - e.s) + ' m: held at the line, not wrecked, not through it');
      }
    }
    start(shutter.s - D.sign + 10, shutter.lane, 20);
    const out = lane(besideOf(shutter), P.s);
    g.run(3, () => { quiet(); P.speed = 20; g.drive(1, Math.sign(out - P.lat)); P.latVel = Math.sign(out - lane(shutter.lane, P.s)) * 4; return Math.abs(P.lat - out) < 0.3; });
    check(Math.abs(P.lat - out) < 0.5 && P.health > 0, 'a car in the dead lane leaves it freely (lat ' + P.lat.toFixed(2) + ')');
  }
  // ---- a car in the lane beside drives past unharmed
  start(shutter.s - 200, shutter.lane > 0 ? shutter.lane - 1 : shutter.lane + 1, 25);
  const hb = P.health;
  g.run(12, () => { quiet(); g.drive(1, 0); return P.s > shutter.s + 30; });
  check(P.health === hb && P.active && !P.busted, 'the lane beside is open: driven past unharmed');
  // ---- fairness by the numbers
  const fastest = Math.max(...CARS.map(c => carStats(c).maxSpeed)) + CONFIG.turboBoost + B.speed;
  const need = fastest * (CONFIG.laneWidth / CONFIG.steerSpeed) + fastest * 0.6; // (a lane across at full steer, and 0.6 s to read the sign)
  check(D.warn > need && D.sign > need * 0.8, 'the warning distance ' + D.warn + ' m (the sign ' + D.sign + ' m) is longer than a lane change at the fastest top speed, ' + fastest.toFixed(0) + ' m/s, with 0.6 s to read it: ' + need.toFixed(0) + ' m');
  const near = (a, b, d) => Math.abs(a - b) < d;
  check(LaneGimmicks.ends.every(e => !(level.tunnelJunctions || []).some(j => near(j.s, e.s, 40)) && !LaneGimmicks.pads.some(p => e.s > p.from - 40 && e.s < p.to + 40 || e.from < p.to && e.s > p.from && e.lane === p.lane)), 'no dead end\'s wall within 40 m of a junction\'s mouth, nor on a pad');
  // (handrails are OFF by default, the owner 16-Oct: a pad that does not say rails: true has none; every level's pads, listed)
  for (const other of [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)].filter(l => l.boostPads?.length)) {
    g.select(other);
    G.load();
    const n = g.Collision.obstacles.filter(o => o.kind === 'handrail').length, want = other.boostPads.some(p => p.rails === true);
    check(want ? n > 0 : n === 0, other.id + ': ' + other.boostPads.length + ' pads, ' + (want ? n + ' handrail sections (rails: true)' : 'no handrails'));
  }
  // ---- both lanes dead at once: a level problem
  g.select({ ...level, id: 'both-dead', deadEnds: [{ s: 490, lane: 1, kind: 'shutter', length: 120 }, { s: 470, lane: 0, kind: 'wall', length: 100 }] });
  start(100, 0, 0);
  check(g.track.Track.problems.some(p => p.includes('both lanes dead')), 'two dead ends closing both lanes at once is a level problem: ' + (g.track.Track.problems.find(p => p.includes('dead')) || '-'));
  g.select('mall-dash');
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
