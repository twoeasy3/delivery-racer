// A check of THE STEELWORKS (themes.js steelworks / steelworksNight, render/themes/steelworks.js; levels steelworks-run and
// steelworks-night): the theme is there and has a file; each level builds with no problems and has its halls, crossings,
// conveyors and blasts; every one of its plain obstacles is the theme's own, sized as the plain kind, and is hit by driving
// into it; the scenery, laid out headless, keeps out of the driving area (what stands beside the road stands beyond its
// edge; what crosses over it keeps its underside over the chase camera: CLEAR_OUT outdoors, CLEAR_IN in a hall); the halls'
// ceilings are the theme's heights and the camera in them stays under the ceiling and under the crane bridges; and its cost
// is held to a budget (meshes, instances, triangles in sight in any 1,200 m of road, the textures' size). Headless.
//   node scripts/.steelworks-check.mjs [--report]
import * as THREE from 'three';
import { boot } from './delivery-headless.mjs';

const BUDGET = {
  callsInSight: 40,   // meshes drawn at once (any 1,200 m of road; the moving puffs, sparks and slabs included)
  calls: 80,          // meshes in all
  trisInSight: 160000, // triangles drawn at once
  instances: 20000,   // instances in all
  textureSide: 256,   // the biggest canvas texture's side, px
  textureBytes: 300 * 1024, // all its canvas textures together (4 bytes a pixel)
};
const REPORT = process.argv.includes('--report');
let failed = 0;
const check = (ok, what) => { if (!ok || REPORT || !what.startsWith('  ')) console.log((ok ? '  ok    ' : '  FAIL  ') + what.trim()); if (!ok) failed++; };

const g = await boot({ ownAll: true });
try {
  const { THEMES } = await g.load('themes.js');
  const { themeNames } = await g.load('render/themes/index.js');
  const { CONFIG } = await g.load('config.js');
  const { steelworks, STEELWORKS_BUILT, CLEAR_OUT, CLEAR_IN } = await g.load('render/themes/steelworks.js');
  const { TEXTURE_BYTES, TEXTURE_SIDE, STEELWORKS_OBSTACLES, STEELWORKS_SIZES } = await g.load('render/themes/steelworksModels.js');
  const { heightOf, tunnelCamera, ceilingAt } = await g.load('render/tunnelshape.js');
  check(!!THEMES.steelworks && !!THEMES.steelworksNight && THEMES.steelworksNight.scenery === 'steelworks', 'the theme and its night are in themes.js, the night drawn as the steelworks');
  check(themeNames().includes('steelworks'), 'its scenery has a file of its own (render/themes/index.js THEME_FILES)');
  check(CONFIG.crossing.trains.includes(THEMES.steelworks.train), 'its crossings\' train (' + THEMES.steelworks.train + ') is one of CONFIG.crossing.trains');
  const map = THEMES.steelworks.obstacles || {};
  for (const [plain, own] of Object.entries(map)) {
    // (its own box, bigger than the plain kind's, the same as the model is drawn at; within a lane, a car's width to spare beside)
    const [hw, hl, height] = g.Collision.size[own], [pw, pl, ph] = g.Collision.size[plain];
    check(!!STEELWORKS_OBSTACLES[own] && !!CONFIG.obstacleKinds[own] && JSON.stringify(CONFIG.obstacleKinds[own]) === JSON.stringify(CONFIG.obstacleKinds[plain]) &&
      JSON.stringify(g.Collision.size[own]) === JSON.stringify(STEELWORKS_SIZES[own]) && g.Collision.ownBox.has(own) && hw * 2 <= CONFIG.laneWidth - 0.4 && Math.max(hw, hl, height) >= Math.max(pw, pl, ph) * 0.99 && hw * hl * height > pw * pl * ph,
      `a ${plain} is a ${own} here: modelled, the ${plain}'s cost, a bigger box of its own ${(hw * 2).toFixed(1)} x ${(hl * 2).toFixed(1)} x ${height} m (the ${plain}'s ${(pw * 2).toFixed(1)} x ${(pl * 2).toFixed(1)} x ${ph}), as drawn, within a lane`);
  }
  for (const id of ['steelworks-run', 'steelworks-night']) {
    const level = g.select(id), G = g.Game, P = g.Player;
    G.loaded = null; G.evil = false; G.start();
    const T = g.track.Track;
    check(!T.problems.length, `${id}: builds with no problems${T.problems.length ? ' (' + T.problems.join(' | ') + ')' : ''}, ${Math.round(T.length)} m long`);
    check(T.length >= 3200 && T.length <= 3800, `${id}: between 3.2 and 3.8 km`);
    check(!!g.levels.HIDDEN_LEVELS[id] && !g.levels.LEVELS.includes(level), `${id}: a hidden level, not on the menu`);
    check((level.tunnels || []).length >= 1 && (level.crossings || []).length && (level.boostPads || []).length && (level.wreckage || []).some(e => e.kind === 'blast'), `${id}: its halls, ingot-train crossings, conveyors and blasts`);
    // the conveyors: flush with the road, no handrails (pads have none unless they say rails: true: the owner, 16-Oct)
    check(level.boostPads.every(p => p.rails !== true) && !g.Collision.obstacles.some(o => o.kind === 'handrail'), `${id}: its ${level.boostPads.length} conveyors are flush: no handrails`);
    // the obstacles: all the theme's own, each hit by driving into it
    const obs = g.Collision.obstacles.filter(o => level.obstacles.some(x => x.s === o.s));
    check(obs.length === level.obstacles.length && obs.every(o => Object.values(map).includes(o.kind)), `${id}: its ${obs.length} plain obstacles are all the steelworks' own (${[...new Set(obs.map(o => o.kind))].join(', ')})`);
    let hit = 0;
    for (const o of obs) {
      G.start();
      P.testGhost = false;
      const it = g.Collision.obstacles.find(x => x.s === o.s && x.lat === o.lat), health = P.health;
      Object.assign(P, { s: o.s - 18, lat: o.lat, speed: 16, launching: false, shield: 0, ghost: 0 });
      g.drive(1, 0);
      g.run(2.2, () => { P.lat = o.lat; return it.gone; });
      if (it.gone && P.health < health) hit++;
    }
    check(hit === obs.length, `${id}: each obstacle is hit, and hurts, driving into it (${hit} of ${obs.length})`);
    // ---- THE LADLES (the owner, 16-Oct: "Lets have the molten bucket be a scripted event. It dumps its load on the road below
    // and is an other instakill for non ghost and invulnerable."): lanegimmicks.js, CONFIG.ladle
    const LG = (await g.load('lanegimmicks.js')).LaneGimmicks, LC = CONFIG.ladle;
    const ladles = LG.ladles, pads = level.boostPads || [], placedObs = level.obstacles || [];
    check(ladles.length >= 2 && ladles.length <= 3, `${id}: ${ladles.length} ladles (${ladles.map(l => Math.round(l.s) + ' m lanes ' + l.first + '-' + l.last).join(', ')})`);
    for (const l of ladles) {
      const at = Math.round(l.s), [p0, p1] = T.laneRange(1, l.s);
      const outdoors = !level.tunnels.some(t => l.s > t.from - 40 && l.s < t.to + 20);
      const clearOf = !pads.some(p => l.s > p.from - LC.warn && l.s < p.to + 40) && !(level.crossings || []).some(c => Math.abs(c.s - l.s) < 40) && !(level.wreckage || []).some(w => Math.abs(w.at - l.s) < 60);
      const obsNear = placedObs.filter(o => Math.abs(o.s - l.s) < 35);
      check(outdoors && clearOf && !obsNear.length, `${id}: the ladle at ${at} m is out in the open (40 m clear of a hall), not at a pad, a crossing or a blast, no obstacle within 35 m${obsNear.length ? ' (' + obsNear.map(o => o.s).join(', ') + ')' : ''}`);
      const free = []; for (let k = p0; k <= p1; k++) if (k < l.first || k > l.last) free.push(k);
      check(free.length >= 1 && free.some(k => k === l.first - 1 || k === l.last + 1) && l.free[0] === free.sort((a, b) => Math.min(Math.abs(a - l.first), Math.abs(a - l.last)) - Math.min(Math.abs(b - l.first), Math.abs(b - l.last)))[0],
        `${id}: the ladle at ${at} m pours on ${l.last - l.first + 1} lane(s) and leaves the player's lane ${l.free.join(', ')} free, beside it (the pool ${(l.hw * 2).toFixed(1)} m across, ${(l.hl * 2).toFixed(0)} m along)`);
    }
    // the telegraph: at least 2 s at the fastest a car can go (its top speed, a turbo and a pad on top)
    const { CARS, carStats } = await g.load('cars.js');
    const fastest = Math.max(...CARS.map(c => carStats(c).maxSpeed)) + CONFIG.turboBoost + CONFIG.boostPad.speed, warnTime = LC.warn / fastest;
    check(warnTime >= 2 && LC.sign / fastest >= 1.8, `${id}: the warning comes ${LC.warn} m before (the sign ${LC.sign} m): ${warnTime.toFixed(2)} s at the fastest ${fastest.toFixed(0)} m/s (2 s at least)`);
    // driven into each pool, in each protection: wrecked but for the Ghost. And what the helicopter does after
    const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
    const keep = (protect) => {
      if (protect === 'shield') P.shield = 30; else if (protect === 'armour') P.armour = 30; else if (protect === 'tank') P.tank = 30; else if (protect === 'ghost') P.ghost = 30;
      else if (protect === 'invincible') { P.mystery = 'invincible'; P.mysteryTime = 30; }
    };
    const { Pickups } = await g.load('pickups.js');
    const into = (l, lane, v, protect = null) => {
      G.start(); quiet(); P.testGhost = false; g.said.length = 0;
      for (const o of g.Collision.obstacles) o.gone = true; // (only the pour in question: no obstacle, no mystery's bullet train on the way)
      for (const p of Pickups.items) p.taken = true;
      Object.assign(P, { s: l.s - 260, lat: T.laneOffset(lane, l.s - 260), speed: v, launching: false, shield: 0, ghost: 0, tank: 0, armour: 0 });
      keep(protect); g.drive(1, 0);
      let warned = null, wreckedAt = null;
      g.run(40, () => {
        quiet(); keep(protect); if (P.active && P.health > 0) { P.speed = v; P.lat = T.laneOffset(lane, P.s); }
        g.drive(1, 0);
        if (warned === null && g.said.some(t => t.includes('LADLE OVERHEAD'))) warned = l.s - P.s;
        if (wreckedAt === null && P.health <= 0) wreckedAt = { s: P.s, pour: l.pour, atPool: Math.abs(P.s - l.s) < l.hl + P.hl + 1 };
        return wreckedAt !== null || P.s > l.s + 40;
      });
      return { warned, wreckedAt, said: [...g.said] };
    };
    const lane0 = (l) => Math.max(l.first, T.laneRange(1, l.s)[0]); // (a lane of the player's side under the pour)
    const row = {};
    for (const protect of [null, 'shield', 'armour', 'tank', 'invincible', 'ghost']) {
      row[protect || 'plain'] = ladles.map(l => into(l, lane0(l), 25, protect));
    }
    const first = row.plain[0];
    check(first.warned !== null && first.warned <= LC.warn + 2 && first.warned > LC.warn - 30 && first.said.some(t => /LADLE OVERHEAD! Keep (left|right)!/.test(t)), `${id}: the warning (${first.said.find(t => t.includes('LADLE')) || 'none'}) with ${Math.round(first.warned)} m to go`);
    for (const [who, runs] of Object.entries(row)) {
      const wrecked = runs.filter(r => r.wreckedAt?.atPool).length, msg = runs.every(r => !r.wreckedAt || r.said.some(t => t.includes('Molten metal')));
      check(who === 'ghost' ? wrecked === 0 : wrecked === runs.length && msg, `${id}: driven into each pool at 25 m/s, ${who === 'plain' ? 'a plain car' : who === 'invincible' ? 'an invincible mystery' : who === 'ghost' ? 'a Ghost' : 'with ' + who}: ${who === 'ghost' ? 'passes through all ' + runs.length : 'wrecked at ' + wrecked + ' of ' + runs.length + ' (' + runs.map(r => r.wreckedAt ? (r.wreckedAt.s - ladles[runs.indexOf(r)].s).toFixed(1) + ' m, ' + r.wreckedAt.pour.toFixed(2) + ' s into the pour' : '-').join('; ') + ')'}`);
    }
    // the lane it leaves free: driven past unharmed
    { let ok = 0; const why = [];
      for (const l of ladles) { G.start(); quiet(); P.testGhost = false; for (const o of g.Collision.obstacles) o.gone = true; const h = P.health; /* (the obstacles out of the way: only the pour is in question) */ Object.assign(P, { s: l.s - 260, lat: T.laneOffset(l.free[0], l.s - 260), speed: 25, launching: false, shield: 0, ghost: 0, tank: 0, armour: 0 }); g.drive(1, 0);
        g.run(20, () => { quiet(); P.speed = 25; P.lat = T.laneOffset(l.free[0], P.s); g.drive(1, 0); return P.s > l.s + 30 || P.health <= 0; });
        if (P.health >= h && P.active && !G.wrecks && l.pour >= 0) ok++; else why.push(Math.round(l.s) + ': health ' + Math.round(h) + ' -> ' + Math.round(P.health) + ', wrecks ' + G.wrecks + ', pour ' + l.pour.toFixed(1) + ', at ' + (P.s - l.s).toFixed(0) + ' m, ' + G.state + (G.over ? ' over' : '') + (P.active ? '' : ' inactive') + ' t ' + G.time?.toFixed?.(1)); }
      check(ok === ladles.length, `${id}: in the lane each ladle leaves free, driven past it while it pours, unharmed (${ok} of ${ladles.length})${why.length ? ': ' + why.join('; ') : ''}`); }
    // wrecked in a pool at 15, 35 and 60 m/s: the helicopter sets the new car down in the free lane, shielded, and it drives on
    // with no second wreck from the same pool
    { const runs = [];
      for (const l of ladles) for (const v of [15, 35, 60]) {
        const lane = lane0(l), r = into(l, lane, v);
        if (!r.wreckedAt) { runs.push({ l, v, bad: 'not wrecked' }); continue; }
        g.run(10, () => { quiet(); return P.active; });
        const wrecks = G.wrecks; // (counted once the helicopter has been: the first wreck)
        const landed = { lane: T.nearestLane(P.lat, P.s), shield: P.shield, s: P.s, pour: l.pour };
        let second = false;
        g.run(8, () => { quiet(); g.drive(1, 0); P.lat = T.laneOffset(landed.lane, P.s); if (P.health <= 0 || G.wrecks > wrecks) second = true; return second || P.s > l.s + l.hl + 15; }); // (past the pool, not on to the next hazard)
        runs.push({ l, v, landed, second, bad: !l.free.includes(landed.lane) ? 'set down in lane ' + landed.lane : !(landed.shield > 0) ? 'no shield' : second ? 'wrecked again' : null });
      }
      const bad = runs.filter(r => r.bad);
      check(!bad.length, `${id}: wrecked in each pool at 15, 35 and 60 m/s (${runs.length} runs): set down in the free lane, shielded, ${runs.map(r => r.landed ? (r.landed.s - r.l.s).toFixed(0) + ' m, ' + r.landed.pour.toFixed(1) + ' s into the pour' : '-').slice(0, 3).join('; ')}..., and driven on with no second wreck${bad.length ? ': ' + bad.map(r => Math.round(r.l.s) + ' at ' + r.v + ': ' + r.bad + (r.landed ? ' (' + (r.landed.s - r.l.s).toFixed(1) + ' m)' : '')).join('; ') : ''}`); }
    // after it has cooled: harmless
    { const l = ladles[0]; G.start(); quiet(); P.testGhost = false; for (const o of g.Collision.obstacles) o.gone = true;
      Object.assign(P, { s: l.s - 80, lat: T.laneOffset(lane0(l), l.s - 80), speed: 0, launching: false, shield: 0, ghost: 0, tank: 0, armour: 0 });
      g.run(LC.arrive + LC.pour + LC.molten + LC.cool + 2, () => { quiet(); P.speed = 0; return false; });
      const h = P.health;
      g.run(10, () => { quiet(); P.speed = 20; P.lat = T.laneOffset(lane0(l), P.s); g.drive(1, 0); return P.s > l.s + 20 || P.health <= 0; });
      check(l.pour > LC.pour + LC.molten && P.health >= h && !G.wrecks && P.s > l.s + 10, `${id}: once it has crusted over (${(LC.pour + LC.molten).toFixed(1)} s after it tips), driven over unharmed (pour ${l.pour.toFixed(1)} s, health ${Math.round(h)} -> ${Math.round(P.health)}, wrecks ${G.wrecks}, at ${(P.s - l.s).toFixed(0)} m)`); }
    // traffic: untouched by it (a car of the traffic driven through a molten pool keeps its health and goes on)
    { const l = ladles[0]; G.start(); P.testGhost = true;
      Object.assign(P, { s: l.s - 60, speed: 0, launching: false });
      const car = g.Traffic.cars.find(c => c.dir === 1 || c.bound === P.bound) || g.Traffic.cars[0];
      let met = false, h0 = null;
      g.run(12, () => { P.speed = 0; if (l.pour > LC.fall + LC.spread && !met && car) { Object.assign(car, { active: true, s: l.s - 12, lat: l.lat }); h0 = car.health; met = true; } return met && car.s > l.s + 12; });
      check(met && car.health === h0 && car.active && car.s > l.s + 8, `${id}: a traffic car driven through the molten pool is untouched (health ${h0} -> ${car?.health}, through to ${car ? (car.s - l.s).toFixed(0) : '-'} m past)`);
      P.testGhost = false; }
    // never a wall: at every metre of the level at least one of the player's lanes is clear of obstacles and pools by a car's width
    { let walls = [];
      const obs = g.Collision.obstacles.filter(o => !o.hazard && !o.laneEnd && o.kind !== 'handrail');
      for (let s = 20; s < T.length - 20; s += 1) {
        const [p0, p1] = T.laneRange(1, s);
        let open = 0;
        for (let k = p0; k <= p1; k++) {
          const c = T.laneOffset(k, s), hw = P.hw + 0.15;
          const blocked = obs.some(o => Math.abs(o.s - s) < o.hl + P.hl && Math.abs(o.lat - c) < o.hw + hw) || ladles.some(l => k >= l.first && k <= l.last && Math.abs(l.s - s) < l.hl + P.hl);
          if (!blocked) open++;
        }
        if (!open) walls.push(s);
      }
      check(!walls.length, `${id}: at every metre one of the player's lanes is open (no wall of obstacles, nor an obstacle beside a pool)${walls.length ? ': shut at ' + [...new Set(walls.map(s => Math.round(s / 10) * 10))].join(', ') : ''}`); }
    // the halls: their ceilings, the camera under them
    const cam = tunnelCamera();
    for (const t of level.tunnels) {
      const h = heightOf(t), mid = h((t.from + t.to) / 2), zone = (level.zones || []).find(z => (t.from + t.to) / 2 >= z.from && (t.from + t.to) / 2 < z.to)?.scenery;
      check(mid === THEMES[level.theme].tunnel.heights[zone], `${id}: the hall ${t.from}-${t.to} (${zone}) is ${mid} m to its roof`);
      let least = Infinity;
      for (let s = t.from - 40; s <= t.to + 40; s += 5) { const c = ceilingAt(s); if (c !== null) least = Math.min(least, c); }
      check(cam.camHeight + 1 < least && cam.camHeight + 2 <= CLEAR_IN, `${id}: the camera in it (${cam.camHeight} m) is under its lowest ceiling (${least} m) and under CLEAR_IN (${CLEAR_IN} m)`);
    }
    // the scenery, headless: out of the driving area, over the camera, within its budget
    const levelGroup = new THREE.Group();
    steelworks({ theme: THEMES[level.theme], offRoads: () => true, levelGroup });
    const inHall = (s) => level.tunnels.some(t => s >= t.from - 1 && s <= t.to + 1);
    let bad = [];
    for (const n of STEELWORKS_BUILT.near) {
      const lo = T.lo(n.s), hi = T.hi(n.s), over = n.lat1 > lo + 0.05 && n.lat0 < hi - 0.05;
      if (over && n.y0 < (inHall(n.s) ? CLEAR_IN : CLEAR_OUT) - 0.01) bad.push(`${n.what} at ${Math.round(n.s)} m (${n.lat0.toFixed(1)}..${n.lat1.toFixed(1)}, ${n.y0.toFixed(1)} m up)`);
    }
    check(!bad.length, `${id}: of ${STEELWORKS_BUILT.near.length} things near the road, none stands in the driving area or hangs below the camera's clearance${bad.length ? ': ' + bad.slice(0, 6).join('; ') : ''}`);
    const overs = STEELWORKS_BUILT.near.filter(n => n.lat1 > T.lo(n.s) + 0.05 && n.lat0 < T.hi(n.s) - 0.05);
    check(overs.length > 0, `${id}: ${overs.length} spans cross over the road (pipe and conveyor bridges, gantries, crane bridges, hall lintels), the lowest ${Math.min(...overs.filter(n => !inHall(n.s)).map(n => n.y0)).toFixed(1)} m up outdoors and ${Math.min(...overs.filter(n => inHall(n.s)).map(n => n.y0)).toFixed(1)} m in a hall`);
    const meshes = STEELWORKS_BUILT.meshes, calls = meshes.length, instances = meshes.reduce((a, m) => a + m.instances, 0);
    let callsInSight = 0, trisInSight = 0;
    for (let s = T.start; s < T.end; s += 100) {
      const seen = meshes.filter(m => m.moving || (m.to >= s && m.from <= s + 1200)); // (as the city check counts it: the road ahead)
      callsInSight = Math.max(callsInSight, seen.length);
      trisInSight = Math.max(trisInSight, seen.reduce((a, m) => a + m.tris, 0));
    }
    const all = meshes.reduce((a, m) => a + m.tris, 0);
    check(callsInSight <= BUDGET.callsInSight && calls <= BUDGET.calls && trisInSight <= BUDGET.trisInSight && instances <= BUDGET.instances,
      `${id}: ${calls} meshes (${callsInSight} in sight), ${instances} instances, ${Math.round(trisInSight / 1000)}k triangles in sight (${Math.round(all / 1000)}k in all) (budget ${BUDGET.callsInSight} / ${BUDGET.calls} meshes, ${BUDGET.instances} instances, ${BUDGET.trisInSight / 1000}k)`);
  }
  { // the ladle's crane: what hangs over the road keeps over the camera's clearance, at rest and tipped
    const { LADLE, lowestAt } = await g.load('render/ladleModels.js');
    let low = Infinity;
    for (let t = 0; t <= LADLE.tip + 1e-6; t += LADLE.tip / 20) low = Math.min(low, LADLE.trunnion + lowestAt(t));
    check(low >= CLEAR_OUT && LADLE.signY >= CLEAR_OUT && LADLE.girder >= CLEAR_OUT && LADLE.legOut >= 2.5, `the ladle hangs ${low.toFixed(2)} m up at its lowest (tipped or not), its girders ${LADLE.girder} m and the MOLTEN METAL board ${LADLE.signY} m: over the camera's clearance ${CLEAR_OUT} m; the crane's legs ${LADLE.legOut} m beyond the road's edge`);
  }
  const bytes = Object.values(TEXTURE_BYTES).reduce((a, b) => a + b, 0);
  check(TEXTURE_SIDE <= BUDGET.textureSide && bytes <= BUDGET.textureBytes, `its canvas textures: ${Object.entries(TEXTURE_BYTES).map(([k, b]) => k + ' ' + Math.round(b / 1024) + ' KB').join(', ')} (one sign texture per sign: ${Math.round(bytes / 1024)} KB for one of each; budget ${BUDGET.textureSide} px a side)`);
} catch (error) {
  failed++;
  console.log(error.stack);
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'the steelworks is all right');
process.exit(failed ? 1 : 0);
