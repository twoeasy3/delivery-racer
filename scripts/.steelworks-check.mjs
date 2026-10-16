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
  const { TEXTURE_BYTES, TEXTURE_SIDE, STEELWORKS_OBSTACLES } = await g.load('render/themes/steelworksModels.js');
  const { heightOf, tunnelCamera, ceilingAt } = await g.load('render/tunnelshape.js');
  check(!!THEMES.steelworks && !!THEMES.steelworksNight && THEMES.steelworksNight.scenery === 'steelworks', 'the theme and its night are in themes.js, the night drawn as the steelworks');
  check(themeNames().includes('steelworks'), 'its scenery has a file of its own (render/themes/index.js THEME_FILES)');
  check(CONFIG.crossing.trains.includes(THEMES.steelworks.train), 'its crossings\' train (' + THEMES.steelworks.train + ') is one of CONFIG.crossing.trains');
  const map = THEMES.steelworks.obstacles || {};
  for (const [plain, own] of Object.entries(map)) {
    check(!!STEELWORKS_OBSTACLES[own] && !!CONFIG.obstacleKinds[own] && JSON.stringify(CONFIG.obstacleKinds[own]) === JSON.stringify(CONFIG.obstacleKinds[plain]) &&
      JSON.stringify(g.Collision.size[own]) === JSON.stringify(g.Collision.size[plain]), `a ${plain} is a ${own} here: modelled, and the ${plain}'s cost and box (${JSON.stringify(g.Collision.size[own])})`);
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
