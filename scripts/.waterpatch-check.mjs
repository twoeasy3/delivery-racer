// A check of standing water (a level's "waterPatches") and the level's "wetness" (track.js waterNumbers, Track.wet), headless:
// standing water is a burst main's water with no main (the same numbers, the same wet tyres after it), the wetness scales
// both for the whole level (strength 1 = CONFIG.waterMain's numbers exactly, 0 = no slip, floors kept), and Mall Dash's
// wet floor is standing water now (no ice). It also prints what the mall's wetness does to a car, against tarmac's.
//   node scripts/.waterpatch-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'], tiers: false });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Hazards } = await g.load('hazards.js');
  const { SpeedCameras } = await g.load('cameras.js');
  const { waterNumbers } = g.track;
  const P = g.Player, G = g.Game, W = g.CONFIG.waterMain, LW = g.CONFIG.laneWidth;
  const T = () => g.track.Track;
  const lane = (n, s) => T().laneOffset(n, s);
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  const start = (s, n, v) => {
    P.testGhost = false; G.evil = false; g.said.length = 0;
    G.start(); quiet();
    Object.assign(P, { s, lat: lane(n, s), speed: v, launching: false, shield: 0, wetTyres: 0, onIce: false, onWater: false, yawVel: 0 });
    Hazards.lastS = SpeedCameras.lastS = s;
    g.drive(1, 0);
  };

  // ---- the numbers (track.js waterNumbers)
  const one = waterNumbers({}), same = waterNumbers({ wetness: { strength: 1, tail: 1 } });
  check(['brakeGrip', 'steerGrip', 'laneSpeed', 'wetAfter'].every(k => one[k] === W[k] && same[k] === W[k]), 'wetness 1 (and none at all): CONFIG.waterMain\'s numbers exactly (' + ['brakeGrip', 'steerGrip', 'laneSpeed', 'wetAfter'].map(k => k + ' ' + one[k]).join(', ') + ')');
  const up = waterNumbers({ wetness: { strength: 1.5, tail: 2 } });
  const want = (k) => Math.max(W.floor[k], 1 - (1 - W[k]) * 1.5);
  check(['brakeGrip', 'steerGrip', 'laneSpeed'].every(k => Math.abs(up[k] - want(k)) < 1e-12) && up.wetAfter === W.wetAfter * 2,
    'wetness 1.5, tail 2: each share 1 - loss x 1.5, floored (' + ['brakeGrip', 'steerGrip', 'laneSpeed'].map(k => k + ' ' + up[k].toFixed(3)).join(', ') + '), wet tail ' + up.wetAfter + ' m');
  const top = waterNumbers({ wetness: { strength: 3 } });
  check(['brakeGrip', 'steerGrip', 'laneSpeed'].every(k => top[k] === W.floor[k]), 'wetness 3: every share at its floor (' + JSON.stringify(W.floor) + ')');
  const dry = waterNumbers({ wetness: { strength: 0 } });
  check(['brakeGrip', 'steerGrip', 'laneSpeed'].every(k => dry[k] === 1), 'wetness 0: no share lost');

  // ---- a test road: Gimmick Road 2 with everything taken off it, standing water (both lanes 4 and 5) and a burst main held
  // spraying over each of lanes 4 and 5, on two straight stretches
  const base = g.select('gimmick-road-2');
  G.start();
  const SPAN = 300, straight = (from) => { for (let s = from; s < from + SPAN + 120; s += 5) if (Math.abs(T().bend(s)) > 1e-6 || !T().isMain(s)) return false; return true; };
  const spots = [];
  for (let s = 600; s < T().length - SPAN - 300 && spots.length < 3; s += 20) if (straight(s)) { spots.push(s); s += SPAN + 160; }
  const [dryAt, patchAt, mainAt] = spots;
  check(spots.length === 3, 'three straight stretches to try it on (at ' + spots.join(', ') + ')');
  const road = (wetness) => g.select({ ...base, id: 'standing-water-road', exits: [], pickups: [], schoolCrossings: [], trolleys: [], marathons: [], balloons: [], drawbridges: [], wreckage: [], cameras: [], potholes: [], crossings: [], stampedes: [], wideLoads: [], targets: [], obstacles: [],
    ice: [], waterPatches: [{ from: patchAt, to: patchAt + SPAN, lane: 4 }, { from: patchAt, to: patchAt + SPAN, lane: 5 }],
    waterMains: [{ s: mainAt, lane: 4, length: SPAN }, { s: mainAt, lane: 5, length: SPAN }], ...(wetness ? { wetness } : {}) });
  const hold = () => { quiet(); Hazards.mains.forEach((m, i) => { m.on = true; m.t = 0; T().sprays[i].on = true; }); };
  // m to brake 30 -> 10 m/s; s to move one lane across at full steer from 20 m/s (at s + 10, wholly on the water)
  const braking = (at) => { start(at + 10, 4, 30); hold(); g.drive(-1, 0); let off = 0; g.run(12, () => { hold(); if (at !== dryAt && !P.onWater) off++; return P.speed <= 10; }); return { d: P.s - at - 10, on: off <= 1 }; };
  const across = (at, v = 20) => { start(at + 10, 4, v); hold(); const from = P.lat; g.drive(1, Math.sign(lane(5, at) - lane(4, at))); let off = 0; const t = g.run(6, () => { hold(); if (at !== dryAt && !P.onWater) off++; return Math.abs(P.lat - from) >= LW; }); return { t, on: off <= 1, v: P.speed }; };
  // the wet tail: through the patch at 20 m/s in lane 4, then wetTyres read at the end and every 5 m after it
  const tail = (at) => { start(at + SPAN - 30, 4, 20); hold(); const rows = []; let inIt = 0; g.run(10, () => { hold(); if (P.s < at + SPAN && P.onWater && P.wetTyres === 1) inIt++; const past = P.s - (at + SPAN); if (past >= rows.length * 5 && past >= 0) rows.push([Math.round(past), P.wetTyres]); return past > T().wet.wetAfter + 10; }); return { inIt, rows }; };
  const m1 = (x) => x.toFixed(1), s2 = (x) => x.toFixed(2);

  road(null); G.start();
  check(!T().problems.length, 'the test road loads without problems (' + (T().problems.join(' | ') || 'none') + ')');
  const pIcy = T().icy(patchAt + 50, lane(4, patchAt + 50));
  check(pIcy && pIcy.water === true, 'standing water: Track.icy gives water there');
  check(!T().icy(patchAt + 50, lane(3, patchAt + 50)), 'standing water: the lane beside is dry');
  check(T().icy(patchAt + 50, lane(4, patchAt + 50)) && T().icy(patchAt + 50, lane(4, patchAt + 50)) === T().icy(patchAt + 120, lane(4, patchAt + 120)), 'standing water: always there (no main, no cycle)');
  const b = { dry: braking(dryAt), patch: braking(patchAt), main: braking(mainAt) }, a = { dry: across(dryAt), patch: across(patchAt), main: across(mainAt) };
  console.log('         (braking 30 to 10 m/s: dry ' + m1(b.dry.d) + ' m, standing water ' + m1(b.patch.d) + ' m, a main\'s water ' + m1(b.main.d) + ' m)');
  console.log('         (one lane across from 20 m/s: dry ' + s2(a.dry.t) + ' s, standing water ' + s2(a.patch.t) + ' s, a main\'s water ' + s2(a.main.t) + ' s)');
  check(b.patch.on && b.main.on && a.patch.on && a.main.on, 'the car was on the water all the way through each try');
  check(Math.abs(b.patch.d - b.main.d) < 1e-9 && Math.abs(a.patch.t - a.main.t) < 1e-9, 'standing water brakes and steers exactly as a burst main\'s water does');
  check(b.patch.d > b.dry.d * 1.5 && a.patch.t > a.dry.t * 1.5, 'and clearly worse than the dry road');
  const tp = tail(patchAt), tm = tail(mainAt);
  console.log('         (wet tyres past the standing water, every 5 m: ' + tp.rows.slice(0, 11).map(r => r[1].toFixed(2)).join(' ') + ')');
  check(tp.inIt > 10, 'standing water: wet tyres 1 on it');
  check(tp.rows.length === tm.rows.length && tp.rows.every((r, i) => Math.abs(r[1] - tm.rows[i][1]) < 1e-9), 'the wet tail after standing water is the main\'s exactly');
  const at = (rows, m) => rows.find(r => r[0] >= m)?.[1];
  check(at(tp.rows, 20) > 0.45 && at(tp.rows, 20) < 0.6 && at(tp.rows, W.wetAfter + 2) === 0, 'the tyres dry over wetAfter (' + W.wetAfter + ' m): about half wet at 20 m, dry by ' + (W.wetAfter + 2) + ' m');
  // (what else a car meets on it is a main's water's: the same Track.icy test, a patch with water: true. So traffic hitting it may spin out, as
  // on a main's water and on ice (traffic.js), and the player's car slews round as it arrives (the look only, player.js): measured, not changed)
  start(patchAt - 20, 4, 25); g.drive(1, 0); let kicked = 0; g.run(2, () => { if (P.onWater && Math.abs(P.yawVel) > 0.5) kicked++; return P.s > patchAt + 20; });
  start(mainAt - 20, 4, 25); g.drive(1, 0); let kickedMain = 0; g.run(2, () => { hold(); if (P.onWater && Math.abs(P.yawVel) > 0.5) kickedMain++; return P.s > mainAt + 20; });
  console.log('         (the slew on arriving, as on a main\'s water: standing water ' + (kicked > 0) + ', a main\'s ' + (kickedMain > 0) + ')');
  check((kicked > 0) === (kickedMain > 0), 'the arrival slew (look only) is as a main\'s water\'s');

  // ---- wetness 1.5, tail 2: the same road, slipperier
  road({ strength: 1.5, tail: 2 }); G.start();
  check(T().wet.wetAfter === W.wetAfter * 2 && Math.abs(T().wet.laneSpeed - want('laneSpeed')) < 1e-12, 'wetness 1.5: Track.wet is waterNumbers\' (wet tail ' + T().wet.wetAfter + ' m)');
  const b15 = braking(patchAt), a15 = across(patchAt), m15 = braking(mainAt), t15 = tail(patchAt);
  console.log('         (wetness 1.5: braking ' + m1(b15.d) + ' m, a lane across ' + s2(a15.t) + ' s; tyres every 5 m after: ' + t15.rows.slice(0, 20).filter((_, i) => i % 2 === 0).map(r => r[1].toFixed(2)).join(' ') + ')');
  check(b15.d > b.patch.d && a15.t > a.patch.t, 'wetness 1.5: braking takes longer and a lane change slower than at 1');
  check(Math.abs(m15.d - b15.d) < 1e-9, 'wetness 1.5: a burst main\'s water is scaled the same');
  check(at(t15.rows, 40) > 0.45 && at(t15.rows, 40) < 0.6 && at(t15.rows, 2 * W.wetAfter + 2) === 0, 'wetness tail 2: the tyres dry over ' + 2 * W.wetAfter + ' m');
  check(a15.t < 3, 'wetness 1.5: a lane change still within 3 s (the floors)');
  // ---- wetness 0: no slip anywhere
  road({ strength: 0 }); G.start();
  const b0 = braking(patchAt), m0 = braking(mainAt), a0 = across(patchAt);
  check(!T().icy(patchAt + 50, lane(4, patchAt + 50)) && Math.abs(b0.d - b.dry.d) < 1e-9 && Math.abs(m0.d - b.dry.d) < 1e-9 && Math.abs(a0.t - a.dry.t) < 1e-9, 'wetness 0: standing water and a main\'s water are the dry road (braking ' + m1(b0.d) + ' m)');

  // ---- Mall Dash: its wet floor is standing water
  const mall = g.select('mall-dash');
  G.start();
  check(!mall.ice && mall.waterPatches?.length === 6, 'Mall Dash: no ice, six standing-water patches');
  check(!T().problems.length, 'Mall Dash loads without problems (' + (T().problems.join(' | ') || 'none') + ')');
  check(Hazards.puddles.length === 6 && mall.waterPatches.every(p => T().icy((p.from + p.to) / 2, lane(p.lane ?? 0, (p.from + p.to) / 2))?.water), 'Mall Dash: each patch is water');
  const M = T().wet;
  console.log('         (Mall Dash wetness ' + JSON.stringify(mall.wetness || null) + ': brakes ' + M.brakeGrip.toFixed(3) + ', steering ' + M.steerGrip.toFixed(3) + ', across ' + M.laneSpeed.toFixed(3) + ', wet tail ' + M.wetAfter + ' m)');
  // the spacing: the end of each patch's wet tail against the next patch in the same lane (or any lane, for a patch across the road)
  const ps = [...mall.waterPatches].sort((x, y) => x.from - y.from);
  const gaps = ps.slice(1).map((p, i) => [ps[i], p, p.from - ps[i].to]);
  console.log('         (gaps between patches, m: ' + gaps.map(([x, y, d]) => x.from + '-' + x.to + ' -> ' + y.from + ': ' + d).join(', ') + ')');
  check(gaps.every(([, , d]) => d > M.wetAfter), 'Mall Dash: no patch reached before the tyres are dry from the one before (gaps ' + Math.min(...gaps.map(x => x[2])) + ' m and up, tail ' + M.wetAfter + ' m)');
  // the warning
  start(ps[0].from - 200, ps[0].lane ?? 0, 25); g.run(8, () => { quiet(); return P.s > ps[0].from; });
  check(g.said.some(t => /WET FLOOR/.test(t)), 'Mall Dash: WET FLOOR! said before the first patch');

  // ---- what the mall's wetness does, against tarmac's (wetness 1): the test road again, at the reference car's speed
  const rows = [];
  for (const [name, w] of [['tarmac (1)', null], ['mall ' + JSON.stringify(mall.wetness || {}), mall.wetness || null]]) {
    road(w); G.start();
    const v = 30;
    const br = braking(patchAt), ac = across(patchAt, v);
    // a lane change at the middle of the wet tail (half wet) and 1 m into it, from v
    const tailAcross = (past) => { start(patchAt + SPAN - 20, 4, v); g.drive(1, 0); g.run(5, () => P.s >= patchAt + SPAN + past); const from = P.lat, s0 = P.s; g.drive(1, Math.sign(lane(5, P.s) - lane(4, P.s))); const t = g.run(6, () => Math.abs(P.lat - from) >= LW); return { t, wet: P.wetTyres, m: P.s - s0 }; };
    const t1 = tailAcross(1), th = tailAcross(T().wet.wetAfter / 2);
    // speed shed by a second of braking from v: on it, and on the dry road
    const shed = (at) => { start(at + 10, 4, v); hold(); g.drive(-1, 0); g.run(1); return v - P.speed; };
    rows.push(name + ': braking 30->10 ' + m1(br.d) + ' m; a second of braking from ' + v + ' m/s sheds ' + m1(shed(patchAt)) + ' m/s on it (dry ' + m1(shed(dryAt)) + '); a lane across from ' + v + ' m/s on it ' + s2(ac.t) + ' s, ' + s2(t1.t) + ' s just past it, ' + s2(th.t) + ' s ' + (T().wet.wetAfter / 2) + ' m past it; dry ' + s2(across(dryAt, v).t) + ' s');
  }
  for (const r of rows) console.log('         (' + r + ')');
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
  process.exit(failures ? 1 : 0);
}
