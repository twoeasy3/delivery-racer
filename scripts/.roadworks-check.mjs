// A check of the roadworks diversions (src/delivery/roadworks.js and Track's lateral-offset layer: Track.divert, works, bounds),
// headless, on the Roadworks level (?hidden=roadworks): a merge, a shift and a crossover.
//   GEOMETRY: every open lane runs on continuously through each diversion (no jump, its slope a taper's), no two open lanes
//   overlap, no open lane is in a works zone, every lane is on the pavement; the level's pickups there sit on open lanes.
//   THE PLAYER: left in the closing lane it is squeezed over by the taper's line, knocks cones (a cone's cost each) and is
//   never stopped nor busted; steered hard at a works zone it is held at the line, in shift and contraflow alike.
//   TRAFFIC (the owner: "make sure traffic reacts to it"): several seeds of minutes each, the player rolling through at a
//   traffic pace: no car under control touches a cone, enters a works zone or touches another car; none stands still for
//   long; cars spawned in a diversion are on its lanes; they keep to the limit; closing lanes merge (zip). An ambulance in a
//   diversion never busts the player (there is nowhere to pull over). Prints the numbers.
//   node scripts/.roadworks-check.mjs [--seeds=1,2,3,4,5] [--seconds=280]   (280 s at 13 m/s: the whole level)
import { boot } from './delivery-headless.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const SEEDS = opt('seeds', '1,2,3,4,5').split(',').map(Number), SECONDS = Number(opt('seconds', 280));
const g = await boot({ ownAll: true });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { CONFIG } = g, P = g.Player, G = g.Game, LW = CONFIG.laneWidth, DV = CONFIG.diversion;
  const { Roadworks } = await g.load('roadworks.js');
  const level = g.select('roadworks');
  const start = (seed = 1) => {
    G.nextSeed = seed; G.nextLoadSeed = seed;
    G.evil = false;
    g.said.length = 0;
    P.testGhost = false;
    G.start();
    return g.track.Track;
  };
  let T = start();
  console.log('Level problems: ' + (T.problems.join(' | ') || 'none'));
  check(!T.problems.length, 'the level loads without problems');
  const kinds = T.diversions.map(d => d.kind);
  check(kinds.join() === 'merge,shift,cross', 'three diversions: ' + kinds.join(', '));

  // ---- geometry
  const lanes = [...Array(T.laneCount).keys()];
  let jump = 0, overlap = 0, inZone = 0, offRoad = 0, steepest = 0;
  for (const d of T.diversions) {
    let last = null;
    for (let s = d.from - 20; s <= d.to + 20; s += 0.5) {
      const at = lanes.map(l => T.laneOffset(l, s)), open = lanes.filter(l => T.openLane(l, s) === l);
      if (last) for (const l of lanes) { const dl = Math.abs(at[l] - last[l]); jump = Math.max(jump, dl); if (T.openLane(l, s) === l) steepest = Math.max(steepest, dl / 0.5); }
      last = at;
      for (let i = 1; i < open.length; i++) if (at[open[i]] - at[open[i - 1]] < LW - 0.05) overlap++; // (a lane closing is closed from its first cone: 1.4% of the way in)
      const z = T.works(s);
      for (const l of open) {
        for (let k = 0; k < z.n; k++) if (Math.min(at[l] + LW / 2, z[k][1]) - Math.max(at[l] - LW / 2, z[k][0]) > 0.01) inZone++;
        if (at[l] - LW / 2 < T.lo(s) - 0.01 || at[l] + LW / 2 > T.hi(s) + 0.01) offRoad++;
      }
    }
  }
  check(jump < 0.12, 'every lane runs on continuously through the tapers (the most a lane moves in 0.5 m: ' + jump.toFixed(3) + ' m; steepest open lane ' + steepest.toFixed(3) + ' m across per m)');
  check(!overlap && !inZone && !offRoad, 'no two open lanes overlap (' + overlap + '), none is in a works zone (' + inZone + '), all are on the pavement (' + offRoad + ')');
  const along = (s) => T.diversions.find(d => s > d.from && s < d.to);
  const onLanes = level.pickups.filter(p => along(p.s) && typeof p.lane === 'number');
  const offLane = onLanes.filter(p => T.openLane(p.lane, p.s) !== p.lane);
  check(onLanes.length >= 10 && !offLane.length, onLanes.length + ' pickups in the diversions, each on an open lane where it is (' + offLane.length + ' not)');
  const shifted = onLanes.filter(p => Math.abs(T.laneOffset(p.lane, p.s) - (p.lane < T.leftLanes ? -1 : 1) * (T.medianHalf + ((p.lane < T.leftLanes ? T.leftLanes - 1 - p.lane : p.lane - T.leftLanes - T.medianLanes) + 0.5) * LW)) > 0.5);
  check(shifted.length >= 6, shifted.length + ' of them sit on the temporary lanes, moved over from where the lane usually runs');
  const cones = g.Collision.obstacles.filter(o => o.roadworks);
  check(cones.length > 20 && cones.every(o => o.kind === 'cone') && JSON.stringify(CONFIG.obstacleKinds.cone) === JSON.stringify({ damage: 3, speedKept: 0.94, light: true }), cones.length + ' taper cones, each an ordinary cone (a cone\'s box and cost)');
  const coneInLane = cones.filter(o => lanes.some(l => T.openLane(l, o.s) === l && Math.abs(o.lat - T.laneOffset(l, o.s)) < o.hw + 1.0));
  check(!coneInLane.length, 'no cone stands where a car in the middle of an open lane (1 m each side of it) would touch it (' + coneInLane.length + ')');

  // ---- the player: left in the merge's closing lane, squeezed over, cones knocked, never stopped
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  const merge = T.diversions[0], kerb = T.laneCount - 1;
  T = start();
  Object.assign(P, { s: merge.from - 40, lat: T.laneOffset(kerb, merge.from - 40), speed: 22, launching: false, shield: 0, ghost: 0 });
  g.drive(1, 0);
  const h0 = P.health, standing = () => cones.filter(o => !o.gone).length, c0 = standing(), others = g.Collision.obstacles.filter(o => !o.roadworks && !o.gone).length;
  let slowest = Infinity, latMost = -Infinity;
  g.run(12, () => { quiet(); P.speed = Math.max(P.speed, 0); if (P.s > merge.from + 10) slowest = Math.min(slowest, P.speed); if (P.s > merge.from + DV.taper + 5 && P.s < merge.to - 50) latMost = Math.max(latMost, P.lat + P.hw); return P.s > merge.from + DV.taper + 60; });
  const knocked = c0 - standing() + others - g.Collision.obstacles.filter(o => !o.roadworks && !o.gone).length, zoneEdge = T.laneOffset(kerb - 1, merge.from + DV.taper + 30) + LW / 2;
  check(c0 - standing() >= 2 && P.health < h0 && P.health >= h0 - knocked * 3 - 0.01, 'driven on in the closing lane: squeezed over, ' + (c0 - standing()) + ' cones knocked over (' + knocked + ' things in all), ' + (h0 - P.health).toFixed(0) + ' health lost (a cone\'s 3 each)');
  check(slowest > 22 * 0.94 ** knocked * 0.8 && !P.busted && P.active, 'never stopped (slowest ' + slowest.toFixed(1) + ' m/s from 22), no bust');
  check(latMost <= zoneEdge + 0.02, 'and held out of the works zone after the taper (its side at ' + latMost.toFixed(2) + ', the line at ' + zoneEdge.toFixed(2) + ')');
  // steered hard into the works, in the shift (into the strip between the ways) and the contraflow (into the barrier, and the kerb side)
  for (const [d, steer, what] of [[T.diversions[1], -1, 'the shift, steering at the works in the middle'], [T.diversions[2], -1, 'the contraflow, steering at the barrier'], [T.diversions[2], 1, 'the contraflow, steering at the works on the kerb side']]) {
    T = start();
    const s0 = (d.from + d.to) / 2 - 80;
    Object.assign(P, { s: s0, lat: T.laneOffset(T.leftLanes + T.medianLanes, s0), speed: 20, launching: false, shield: 0, ghost: 0 });
    g.drive(1, steer);
    let worst = 0, slow = Infinity;
    g.run(6, () => {
      quiet();
      const z = T.works(P.s);
      for (let k = 0; k < z.n; k++) worst = Math.max(worst, Math.min(P.lat + P.hw, z[k][1]) - Math.max(P.lat - P.hw, z[k][0]));
      slow = Math.min(slow, P.speed);
      return P.s > s0 + 140;
    });
    check(worst <= 0.02 && slow > 12, what + ': held at the line (into it ' + Math.max(0, worst).toFixed(3) + ' m), still going (' + slow.toFixed(1) + ' m/s at the least)');
  }

  // hands off through the shift and the crossover: carried over with its lane as by a bend (Track.carry), no cone touched
  for (const d of T.diversions.slice(1)) {
    for (const lane of [T.leftLanes + T.medianLanes, T.laneCount - 1]) {
      T = start();
      Object.assign(P, { s: d.from - 30, lat: T.laneOffset(lane, d.from - 30), speed: 25, launching: false, shield: 0, ghost: 0 });
      g.drive(1, 0);
      const before = cones.filter(o => !o.gone).length, h = P.health;
      let off = 0;
      g.run(40, () => { quiet(); off = Math.max(off, Math.abs(P.lat - T.laneOffset(lane, P.s))); return P.s > d.to + 20; });
      check(cones.filter(o => !o.gone).length === before && P.health === h && off < 0.3, `hands off in lane ${lane} through the ${d.kind}: carried with its lane (at most ${off.toFixed(2)} m off its middle), no cone touched`);
    }
  }

  // ---- traffic
  const totals = { cones: 0, zone: 0, contacts: 0, near: 0, stuck: 0, spawned: 0, spawnedOff: 0, zips: 0, waits: 0, wild: 0, wildContacts: 0, n: 0, speeds: [], merges: 0 };
  for (const seed of SEEDS) {
    T = start(seed);
    P.testGhost = true; // (the player rolls through at a traffic pace, in the left-most of its lanes, touching nothing)
    const inWorks = (s) => T.diversions.some(d => s > d.from - DV.slow - 40 && s < d.to + 40);
    const still = new Map(), seen = new Set(), last = new Map();
    let t = 0;
    const counted = { cones: 0, zone: 0, contacts: 0, near: 0, stuck: 0 };
    while (t < SECONDS && P.s < T.length - 60) {
      P.speed = 13;
      P.lat = T.laneOffset(T.openLane(T.leftLanes + T.medianLanes, P.s), P.s);
      G.update(1 / 60); g.FxQueue.length = 0; t += 1 / 60;
      const cars = g.Traffic.cars.filter(c => c.active && !c.junction && T.isMain(c.s));
      const wild = (c) => c.spin > 0 || c.stun > 0 || c.wobble > 0; // (knocked out of control by something else: a package, a feud before the works)
      for (const c of cars) {
        if (!seen.has(c) || last.get(c) !== c.kind + c.dir) { // (a car just put on the road)
          seen.add(c); last.set(c, c.kind + c.dir);
          if (along(c.s)) { totals.spawned++; if (T.openLane(c.lane, c.s) !== c.lane || Math.abs(c.lat - T.laneOffset(c.lane, c.s)) > 0.05) totals.spawnedOff++; }
          c._was = c.lane;
        }
        if (c._was !== c.lane && T.openLane(c._was, c.s + c.dir * 40) !== c._was && along(c.s + c.dir * 40)) totals.merges++;
        c._was = c.lane;
        if (!inWorks(c.s)) { still.delete(c); continue; }
        if (wild(c)) { totals.wild++; continue; }
        for (const o of cones) if (!o.gone && Math.abs(o.s - c.s) < o.hl + c.hl + 1 && g.Collision.overlap(c, o)) { counted.cones++; if (process.env.WHY) console.log('    cone', c.kind, c.s.toFixed(1), c.lat.toFixed(2), 'lane', c.lane, 'dir', c.dir, 'yaw', c.yaw.toFixed(3), 'zip', c.zipInto, '| cone', o.s.toFixed(1), o.lat.toFixed(2), '| lane at', T.laneOffset(c.lane, c.s).toFixed(2)); }
        const co = Math.cos(c.yaw), si = Math.sin(c.yaw);
        for (const [u, w] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { // (its four corners, against the works zones where each is)
          const q = c.s + co * u * c.hl - si * w * c.hw, ql = c.lat + si * u * c.hl + co * w * c.hw, z = T.works(q);
          for (let k = 0; k < z.n; k++) if (ql > z[k][0] + 0.05 && ql < z[k][1] - 0.05) counted.zone++;
        }
        const lim = Roadworks.limitAt(c.s, c.dir);
        if (lim < Infinity && T.diverting(c.s)) totals.speeds.push(Math.abs(c.vs) / lim);
        const v = Math.abs(c.vs) < 0.5 ? (still.get(c) || 0) + 1 / 60 : 0;
        still.set(c, v);
        if (v > 20 && v - 1 / 60 <= 20) counted.stuck++;
        if (c.zipInto != null) totals.waits++;
      }
      for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i], b = cars[j];
        if (!inWorks(a.s) || Math.abs(a.s - b.s) > a.hl + b.hl + 2) continue;
        const touching = g.Collision.overlap(a, b);
        if (wild(a) || wild(b)) { if (touching) totals.wildContacts++; continue; }
        if (touching) counted.contacts++;
        else if (Math.abs(a.s - b.s) < a.hl + b.hl + 1 && Math.abs(a.lat - b.lat) < a.hw + b.hw + 0.3) counted.near++;
      }
    }
    for (const k of Object.keys(counted)) totals[k] += counted[k];
    totals.n += t;
    console.log(`  seed ${seed}: ${t.toFixed(0)} s to ${P.s.toFixed(0)} m: cone contacts ${counted.cones}, works-zone corner-steps ${counted.zone}, car contacts ${counted.contacts}, near misses ${counted.near} (car-steps), stuck ${counted.stuck}`);
  }
  const sp = totals.speeds.sort((a, b) => a - b), q = (f) => sp[Math.floor(sp.length * f)] ?? NaN;
  console.log(`  traffic in ${totals.n.toFixed(0)} s of driving over ${SEEDS.length} seeds: speed in the works / its limit: median ${q(0.5).toFixed(2)}, 10% ${q(0.1).toFixed(2)}, 90% ${q(0.9).toFixed(2)}; ${totals.merges} merges out of closing lanes, ${(totals.waits / 60).toFixed(0)} car-seconds waiting at a taper for a gap; ${totals.spawned} cars put on the road inside a diversion; out of control (knocked by something else) ${(totals.wild / 60).toFixed(0)} car-seconds, their contacts ${totals.wildContacts}`);
  check(!totals.cones && !totals.zone && !totals.contacts, 'no car under control touches a cone (' + totals.cones + '), puts a corner in a works zone (' + totals.zone + '), or touches another car (' + totals.contacts + ')');
  check(!totals.stuck, 'none stands still for 20 s or more (' + totals.stuck + ')');
  check(totals.spawned > 0 && !totals.spawnedOff, totals.spawned + ' cars put on the road inside a diversion, each on an open lane where it is (' + totals.spawnedOff + ' not)');
  check(q(0.5) > 0.85 && q(0.5) < 1.05 && q(0.9) < 1.2, 'they keep to the limit (median ' + q(0.5).toFixed(2) + ', 90% ' + q(0.9).toFixed(2) + ' of it)');
  check(totals.merges > 0, 'closing lanes merge (' + totals.merges + ')');

  // ---- a rival courier racing the player through all three (a racer: it keeps to the works' rules too, a little over the limit)
  level.rival = 'opposite';
  T = start(11);
  P.testGhost = true;
  const rival = g.Traffic.cars.find(c => c.active && c.courier);
  let rivalBad = 0, rivalIn = 0;
  g.run(200, () => {
    P.speed = 24; P.lat = T.laneOffset(T.openLane(T.laneCount - 2, P.s), P.s);
    if (rival?.active && along(rival.s) && !(rival.spin > 0 || rival.stun > 0)) {
      rivalIn++;
      for (const o of cones) if (!o.gone && Math.abs(o.s - rival.s) < o.hl + rival.hl + 1 && g.Collision.overlap(rival, o)) rivalBad++;
      const z = T.works(rival.s);
      for (let k = 0; k < z.n; k++) if (Math.min(rival.lat + rival.hw, z[k][1]) - Math.max(rival.lat - rival.hw, z[k][0]) > 0.05) rivalBad++;
    }
    return P.s > T.length - 80;
  });
  delete level.rival;
  check(!!rival && rivalIn > 60 && !rivalBad, 'a rival courier through the diversions (' + (rivalIn / 60).toFixed(0) + ' s in them): no cone touched, never in a works zone (' + rivalBad + ')');

  // ---- an ambulance coming up behind the player in the contraflow: it waits, never busts
  level.emergencies = { every: { min: 2, max: 4 } };
  const counts = [level.trafficCount, level.oncomingCount];
  Object.assign(level, { trafficCount: 6, oncomingCount: 6 }); // (an ambulance takes a car the level leaves unused)
  T = start(7);
  const cross = T.diversions[2];
  Object.assign(P, { s: cross.from + 140, lat: T.laneOffset(T.leftLanes + T.medianLanes, cross.from + 140), speed: 5, launching: false, shield: 0, ghost: 0 });
  let came = 0;
  g.run(90, () => {
    P.speed = 5; P.health = 100; P.lat = T.laneOffset(T.openLane(T.leftLanes + T.medianLanes, P.s), P.s);
    if (g.Traffic.cars.some(c => c.active && c.emergency && c.dir > 0 && P.s - c.s > 0 && P.s - c.s < 30)) came++;
    return P.busted || P.s > cross.to - 20;
  });
  delete level.emergencies;
  [level.trafficCount, level.oncomingCount] = counts;
  check(!P.busted, 'an ambulance behind the player in the contraflow (' + (came / 60).toFixed(1) + ' s within 30 m of it) waits: no bust');
} catch (error) {
  failures++;
  console.log(error.stack);
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
