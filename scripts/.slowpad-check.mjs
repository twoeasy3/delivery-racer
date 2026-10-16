// A check of the SLOW PADS (SLOW-PAD-DESIGN.md; CONFIG.slowPad; Player.updateSpeed, Track.slowPadAt, lanegimmicks.js, render/slowpads.js),
// headless, on the demo level Slow Pad Lab (?hidden=slow-pad). Its first slow pad (380-460, lane 1) is on a straight:
//   - on it a car loses speed: with the accelerator held at least PINNED_LEAST of its speed, coasting more, never more than
//     CONFIG.slowPad.most of the speed it came on at, never under CONFIG.minSpeed (even with the drain made 50 times as strong);
//     every car loses about the same SHARE (the drain grows with speed^2); a table per car class (--table prints it)
//   - in the lane beside it nothing changes (top speed held exactly); after it, the car is back to exactly its own top speed
//   - a boost pad's push is ended by it; a turbo or a tank rides over it untouched; a ghost is slowed (it is the floor)
//   - the driven lane scrub is off on it (no stacking into a brake); its message once a run
//   - the level reports a spot with every lane padded, a slow pad on a boost pad, one before a jam ramp, one in a race
//   - the schema accepts the demo's pads and rejects a pad with no lane or a bad lane
//   - every skin (plain, reverse travelator, reverse conveyor, sand) builds for the demo's pads: two meshes plus a plate or drum
//     at each end of a travelator's or conveyor's, within a triangle budget; each theme gets the skin it should
//   - a clean ghost run (cleanrun.js, as the clock is worked out) delivers
// The replay's determinism on the demo level: node scripts/.replay-check.mjs slow-pad (run separately: heavy).
//   node scripts/.slowpad-check.mjs [--table]
import { boot } from './delivery-headless.mjs';

const TABLE = process.argv.includes('--table');
const PINNED_LEAST = 0.08; // the least share of its speed an 80 m pad takes from a car with the accelerator held
const TRI_BUDGET = 3000;   // triangles for all of the demo's 5 pads, edges and ends, in any skin
const CLASSES = [['lovebus', 'slow (23 m/s)'], ['commuter', 'starter (24)'], ['sport', 'the Sport (31)'], ['polytruck', 'heavy truck (39)'], ['evsaloon', 'quick (40)'], ['classicgt', 'fastest (42)']];
const g = await boot({ cars: ['commuter', 'sport'], tiers: false });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { LaneGimmicks } = await g.load('lanegimmicks.js');
  const { checkLevel } = await g.load('levelSchema.js');
  const { THEMES } = await g.load('themes.js');
  const { pinCar, carStats } = g.cars;
  const P = g.Player, G = g.Game, C = g.CONFIG, SP = C.slowPad;
  const T = () => g.track.Track;
  const lane = (n, s) => T().laneOffset(n, s);
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  const demo = g.select('slow-pad');
  G.start();
  console.log('Level problems: ' + (T().problems.join(' | ') || 'none'));
  check(!T().problems.length, 'the demo level loads without problems');
  check(LaneGimmicks.slowPads.length === 5 && (demo.boostPads || []).length === 3, LaneGimmicks.slowPads.length + ' slow pads and ' + demo.boostPads.length + ' boost pads');
  const pad = LaneGimmicks.slowPads[0];
  check(pad.from === 380 && pad.lane === 1 && Math.abs(T().bend(pad.from)) < 1e-9 && Math.abs(T().bend(pad.to)) < 1e-9, 'the first pad (380-460, lane 1) is on a straight');

  // drive from 80 m before the pad at `v`, accelerator `throttle`, in `n`; what it came on at, the least on it, where it left it
  const run = (car, { v = null, throttle = 1, n = pad.lane, set = {}, until = pad.to + 100, steerOn = false } = {}) => { // (until: short of the bend at 580)
    pinCar(car);
    P.testGhost = false; G.evil = false; g.said.length = 0;
    G.start(); quiet();
    const top = carStats().maxSpeed, s0 = pad.from - 80;
    Object.assign(P, { s: s0, lat: lane(n, s0), latVel: 0, speed: v ?? top, launching: false, shield: 0, ghost: 0, tank: 0, armour: 0, turbo: 0, boost: 0, wetTyres: 0, onIce: false, onWater: false, health: P.maxHealth }, set);
    g.drive(throttle, 0);
    let entry = null, low = Infinity, exit = null, under = false, pullOn = 0, back = null, steered = false;
    const time = g.run(30, () => {
      quiet();
      if (P.speed < C.minSpeed - 1e-9) under = true;
      const on = P.s >= pad.from && P.s <= pad.to;
      if (on && entry === null) entry = P.speed;
      if (on) low = Math.min(low, P.speed);
      if (P.slowPad && P.pulling > 0) pullOn++; // (a step begun on the pad)
      if (steerOn && on && !steered && P.s > pad.from + 20) { steered = true; g.drive(throttle, 1); }
      if (P.s > pad.to && exit === null) { exit = P.speed; g.drive(throttle, 0); }
      if (exit !== null && back === null && Math.abs(P.speed - top) < 1e-6) back = P.s - pad.to;
      return P.s > until;
    });
    return { top, entry, low, exit, under, pullOn, back, end: P.speed, time };
  };

  // ---- per car class, at top speed: pinned and coasting
  const rows = [];
  for (const [car, what] of CLASSES) {
    const held = run(car), coast = run(car, { throttle: 0 }), clear = run(car, { n: pad.lane + 1 });
    const lh = 1 - held.low / held.entry, lc = 1 - coast.low / coast.entry;
    rows.push({ car, what, top: held.top, held: held.entry - held.low, heldShare: lh, coast: coast.entry - coast.low, coastShare: lc, back: held.back, lostHeld: held.time - clear.time, lostCoast: coast.time - clear.time });
    check(lh >= PINNED_LEAST && lc > lh && lc <= SP.most + 1e-9 && !held.under && !coast.under,
      `${car} (${what}): pinned loses ${(held.entry - held.low).toFixed(1)} m/s (${(lh * 100).toFixed(1)}%), coasting ${(coast.entry - coast.low).toFixed(1)} m/s (${(lc * 100).toFixed(1)}%), never under minSpeed`);
    check(held.pullOn === 0, `${car}: on the pad the driven lane scrub has nothing to take (the engine's pull is 0 there)`);
    check(held.back !== null && Math.abs(held.end - held.top) < 1e-6, `${car}: pinned, back to exactly its own top speed ${held.back?.toFixed(0)} m after the pad`);
  }
  const shares = rows.map(r => r.heldShare);
  check(Math.max(...shares) - Math.min(...shares) < 0.03, 'every car loses about the same share pinned (' + shares.map(x => (x * 100).toFixed(1)).join(', ') + '%): a slow car is not punished twice');
  if (TABLE || failures) {
    console.log('\n  car class                         top    pinned: lost   share   coasting: lost   share   back to top after   time lost to ' + (pad.to + 100) + ' m: pinned / coasting (then held)');
    for (const r of rows) console.log('  ' + (r.car + ' ' + r.what).padEnd(32) + r.top.toFixed(1).padStart(5) + (r.held.toFixed(1) + ' m/s').padStart(12) + ((r.heldShare * 100).toFixed(1) + '%').padStart(8) +
      (r.coast.toFixed(1) + ' m/s').padStart(14) + ((r.coastShare * 100).toFixed(1) + '%').padStart(8) + ((r.back ?? NaN).toFixed(0) + ' m').padStart(12) + (r.lostHeld.toFixed(2) + ' s / ' + r.lostCoast.toFixed(2) + ' s').padStart(26));
    console.log('');
  }

  // ---- the lane beside: nothing changes
  const beside = run('sport', { n: 2 });
  check(beside.low === beside.top && beside.end === beside.top, 'in the lane beside the pad the speed is untouched (' + beside.low + ' m/s, its top)');
  // ---- lane change off the pad, pinned: no worse than off it would be with the pad's loss alone (no stacking into a brake)
  const changing = run('sport', { steerOn: true }), straight = run('sport');
  check(changing.low >= straight.low - 1.5, 'a lane change off the pad, accelerator held, costs little more than the pad alone (' + changing.low.toFixed(1) + ' vs ' + straight.low.toFixed(1) + ' m/s at the least)');
  // ---- the message once, the sound
  run('sport');
  check(g.said.some(l => l.includes('Slow pad')), 'its message the first time: "' + (g.said.find(l => l.includes('Slow pad')) || 'none') + '"');
  // ---- a boost pad's push ended; a turbo and a tank untouched; a ghost slowed
  const boosted = run('sport', { v: 31 + C.boostPad.speed, set: { boost: C.boostPad.time } });
  check(P.boost === 0 && boosted.low < boosted.entry - 3, 'a boost pad\'s push is ended by the pad (came on at ' + boosted.entry.toFixed(1) + ', least ' + boosted.low.toFixed(1) + ' m/s)');
  const turbo = run('sport', { set: { turbo: 30 }, until: pad.to + 5 });
  check(turbo.low >= turbo.entry - 1e-6, 'a turbo rides over it untouched (' + turbo.entry.toFixed(1) + ' -> ' + turbo.low.toFixed(1) + ' m/s)');
  const tank = run('sport', { v: C.tankMaxSpeed, set: { tank: 30 }, until: pad.to + 5 });
  check(tank.low >= tank.entry - 1e-6, 'a tank rides over it untouched (' + tank.entry.toFixed(1) + ' -> ' + tank.low.toFixed(1) + ' m/s)');
  const ghost = run('sport', { set: { ghost: 30 } });
  check(ghost.low < ghost.entry * (1 - PINNED_LEAST), 'a ghost is slowed (it is the floor): ' + ghost.entry.toFixed(1) + ' -> ' + ghost.low.toFixed(1) + ' m/s');
  // ---- the floor: never under minSpeed, never more than `most`, even with the drain 50 times as strong
  const was = SP.tune;
  SP.tune = 50;
  const slow = run('lovebus', { v: 9, throttle: 0 }), fast = run('classicgt', { throttle: 0 });
  SP.tune = was;
  check(!slow.under && slow.low >= C.minSpeed - 1e-9, 'with the drain 50x, a slow car at 9 m/s is held at minSpeed: ' + slow.low.toFixed(2) + ' m/s');
  check(fast.low >= fast.entry * (1 - SP.most) - 1e-6, 'with the drain 50x, one pad takes no more than ' + SP.most * 100 + '%: ' + fast.entry.toFixed(1) + ' -> ' + fast.low.toFixed(1) + ' m/s');
  SP.tune = 0;
  const off = run('sport');
  SP.tune = was;
  check(off.low === off.top, '?slowpad=0 (tune 0): the pad does nothing');

  // ---- what the level reports
  const problemsOf = (extra, mutate) => {
    const level = g.select({ ...demo, id: 'slow-pad-test', ...extra });
    if (mutate) mutate(level);
    G.start();
    return T().problems.join(' | ');
  };
  check(/every lane is padded/.test(problemsOf({ slowPads: [0, 1, 2].map(lane => ({ from: 400, to: 460, lane })) })), 'every lane padded at one spot: reported');
  check(/on a boost pad/.test(problemsOf({ slowPads: [{ from: 160, to: 200, lane: 0 }] })), 'a slow pad on a boost pad: reported');
  check(/before the jump/.test(problemsOf({ jamRamps: [{ s: 520 }] })), 'a slow pad just before a jam ramp: reported');
  check(/on ice/.test(problemsOf({ ice: [{ from: 390, to: 420, lane: 1 }] })), 'a slow pad on ice: reported');
  g.select(demo); G.start();
  g.levels.LEVEL.grid = { count: 1 };
  T().problems.length = 0; LaneGimmicks.slowPadProblems();
  check(/not in a race/.test(T().problems.join(' | ')), 'slow pads in a race: reported');
  delete g.levels.LEVEL.grid;
  // ---- the schema
  const slowSay = (level) => checkLevel(level).filter(p => p.key === 'slowPads').map(p => p.text);
  check(!slowSay(demo).length, 'the schema accepts the demo\'s slow pads');
  check(slowSay({ ...demo, slowPads: [{ from: 100, to: 150 }] }).length > 0, 'the schema rejects a slow pad with no lane: ' + slowSay({ ...demo, slowPads: [{ from: 100, to: 150 }] })[0]);
  check(slowSay({ ...demo, slowPads: [{ from: 100, to: 150, lane: 'x' }] }).length > 0, 'and one with a bad lane');

  // ---- the drawing: every skin, headless (a canvas stand-in)
  const ctx = new Proxy({}, { get: () => () => {} });
  const prevCreate = globalThis.document.createElement;
  globalThis.document.createElement = () => ({ width: 0, height: 0, style: {}, getContext: () => ctx });
  g.select(demo); G.start();
  const { buildSlowPads, slowSkin, SLOW_SKINS } = await g.load('render/slowpads.js');
  const want = { city: 'plain', mall: 'travelator', metro: 'travelator', vegas: 'travelator', steelworks: 'conveyor', desert: 'sand', wildwest: 'sand', beach: 'sand' };
  check(Object.entries(want).every(([th, sk]) => slowSkin(THEMES[th]) === sk), 'each theme its skin: ' + Object.entries(want).map(([th, sk]) => th + ' ' + slowSkin(THEMES[th]) + (sk === slowSkin(THEMES[th]) ? '' : ' (WANT ' + sk + ')')).join(', '));
  for (const sk of SLOW_SKINS) {
    const theme = Object.entries(want).find(([, s]) => s === sk)[0];
    const built = buildSlowPads(LaneGimmicks.slowPads, THEMES[theme]);
    const tris = built.meshes.reduce((n, m) => n + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
    const ends = sk === 'travelator' || sk === 'conveyor' ? 2 * LaneGimmicks.slowPads.length : 0, lit = sk === 'sand' ? 1 : 2;
    check(built.skin === sk && built.meshes.length === lit + ends && tris <= TRI_BUDGET && built.belt.material.map,
      `${sk} (${theme}): ${built.meshes.length} meshes (${lit} for every pad${ends ? ' + ' + ends + ' ends' : ''}), ${tris} triangles (budget ${TRI_BUDGET}), creeping back at ${(built.belt.speed * 4).toFixed(1)} m/s`);
  }
  globalThis.document.createElement = prevCreate;

  // ---- a clean ghost run delivers (as the clock is worked out)
  g.select(demo);
  const { cleanRun } = await g.load('cleanrun.js');
  const clean = cleanRun();
  check(clean.delivered, 'a clean ghost run in the ' + clean.car + ' delivers: ' + clean.time.toFixed(1) + ' s; the clock ' + JSON.stringify(demo.clock) + ' (worked out: ' + JSON.stringify(clean.clock) + ')');
} catch (e) {
  failures++;
  console.log('  FAIL  threw: ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
