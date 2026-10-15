// A check of THE ALPINE PASS (theme 'alpine', its scenery render/themes/alpine.js, its level 'alpine-pass'; CHECKLIST 7xx), headless:
//   - the theme: its entry in themes.js (and the dusk's), its scenery's file named in render/themes/index.js, its four obstacles;
//   - the level: it builds with no problems, 3.2 to 3.8 km, hidden (not on the menu), its words and its cargo there;
//   - its obstacles collide: each of the theme's own, driven into, is destroyed and costs what the kind it stands in for costs;
//   - the scenery is laid out (the theme's own code, road.js's helpers stood in for: the land is level here, as on a level with no
//     terrain), on its level, as the dusk, and on two other levels worn with ?theme=alpine, without an error;
//   - clear of the roads: nothing it stands (a chalet, a pylon, a column, a rock...) reaches onto any stretch of road, every ribbon
//     along the road (rail, wall, bank, snow wall) stands beyond the pavement's edge, the gallery's roof is over the tunnel's height;
//   - the camera: the chase camera (scene.js's: its height and the tunnel's easing, the ceiling's clamp) at every 3 m of the run, in
//     every lane, is never inside anything the theme stands, never at or over the gallery's roof, and stands where the land is not
//     touched (the theme lifts no land within KEEP m of a road, where road.js's land is the road's own);
//   - its cost, held to a budget (meshes, triangles, instances, the texture's side): raise one on purpose, with a word in CHECKLIST.md.
//   node scripts/.alpine-check.mjs [--report]
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { boot } from './delivery-headless.mjs';

const BUDGET = {
  meshes: 20,             // the theme's own meshes (draw calls), all of them (16-Oct: 14 to 16)
  triangles: 150000,      // the theme's own triangles, all of them (16-Oct: ~95k in the browser, more here: the land is level, so trees stand everywhere)
  instances: 4000,        // pines, chairs and cabins
  textureSide: 256,       // the signs' canvas, px a side
};
const REPORT = process.argv.includes('--report');
let failed = 0;
const check = (ok, what) => { if (!ok || REPORT) console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };

const g = await boot({ ownAll: true });
try {
  const { THEMES } = await g.load('themes.js');
  const { CARGO } = await g.load('cargo.js');
  const { levelName, levelDescription } = await g.load('levelText.js');
  const A = await g.load('render/themes/alpine.js');
  const { OBSTACLE_MODELS } = await g.load('render/obstacleModels.js');
  const K = g.CONFIG.obstacleKinds;

  // ---- the theme
  const T = THEMES.alpine;
  check(T && T.scenery === 'alpinepass' && T.terrain && T.tunnel?.lit && T.tunnel?.shell === false, 'THEMES.alpine: scenery alpinepass, terrain, a lit tunnel whose shell the theme draws');
  check(THEMES.alpineDusk?.scenery === 'alpinepass' && THEMES.alpineDusk.dusk, 'THEMES.alpineDusk: the same scenery at dusk');
  const index = readFileSync(new URL('../src/delivery/render/themes/index.js', import.meta.url), 'utf8');
  check(/alpinepass: \(\) => import\('\.\/alpine\.js'\)/.test(index), 'render/themes/index.js loads alpine.js for the scenery alpinepass');
  const own = { crate: 'cheeseWheels', bale: 'woodpile', cone: 'milkChurn', barrier: 'snowBlock' };
  for (const [like, kind] of Object.entries(own)) {
    check(T.obstacles?.[like] === kind && JSON.stringify(K[kind]) === JSON.stringify(K[like]) && typeof OBSTACLE_MODELS[kind] === 'function',
      `the alpine ${like} is a ${kind}: the same cost (${JSON.stringify(K[kind])}) and a model`);
  }

  // ---- the level
  const level = g.select('alpine-pass');
  g.Game.loaded = null; g.Game.load();
  const Track = g.track.Track;
  check(Track.problems.length === 0, 'alpine-pass builds with no problems' + (Track.problems.length ? ': ' + Track.problems.join('; ') : ''));
  check(Track.length >= 3200 && Track.length <= 3800, `alpine-pass is ${Math.round(Track.length)} m (3.2 to 3.8 km)`);
  check(!!g.levels.HIDDEN_LEVELS['alpine-pass'] && !g.levels.LEVELS.includes(level), 'alpine-pass is hidden (?hidden=alpine-pass), not on the menu');
  check(levelName(level) === 'Alpine Pass' && levelDescription(level, false) && levelDescription(level, true), 'its name and its two descriptions (levelText.json)');
  check(CARGO.good.some(c => c.id === 'cheesewheel') && CARGO.evil.some(c => c.id === 'fondue'), 'its cargo: the Wheel of Mountain Cheese (Good), the Suspicious Fondue (Evil)');

  // ---- its obstacles collide
  const { Player, Collision, Traffic, Game, FxQueue } = g;
  for (const kind of Object.values(own)) {
    Game.start();
    for (const c of Traffic.cars) c.active = false;
    const o = Collision.obstacles.find(x => x.kind === kind);
    if (!o) { check(false, `a ${kind} on the road`); continue; }
    for (const other of Collision.obstacles) if (other !== o) other.gone = true;
    o.gone = false;
    Player.s = o.s - 1; Player.lat = o.lat; Player.speed = 20; Player.launching = false;
    Collision.check();
    if (FxQueue) FxQueue.length = 0;
    check(o.gone && Math.abs(Player.health - (Player.maxHealth - K[kind].damage)) < 1e-6, `driven into, a ${kind} is destroyed and costs ${K[kind].damage} health`);
  }

  // ---- the scenery, laid out
  const lay = (lv, themeName) => {
    g.select(lv);
    g.Game.loaded = null; g.Game.load();
    const Tk = g.track.Track, group = new THREE.Group();
    A.alpinepass({ theme: THEMES[themeName], offRoads: () => true, inJunction: () => false, levelGroup: group,
      beside: (side, s, d) => side < 0 ? Tk.lo(s) - d : Tk.hi(s) + d });
    return { stats: A.alpineStats.last, group, Track: Tk };
  };
  for (const [lv, th] of [['alpine-pass', 'alpineDusk'], ['stelvio', 'alpine'], ['expressway', 'alpine']]) {
    let ok = true;
    try { lay(lv, th); } catch (e) { ok = false; console.log('        ' + e.stack.split('\n').slice(0, 3).join(' / ')); }
    check(ok, `the scenery is laid out on ${lv} as ${th}`);
  }
  const { stats, group } = lay('alpine-pass', 'alpine');
  const roads = A.roadIndex(), W2 = (Track.hi(0) - Track.lo(0)) / 2;
  check(group.children.every(c => c.userData.alpine), `${group.children.length} meshes, every one marked as the theme's own`);

  // ---- clear of the roads
  const near = stats.solids.filter(f => f.kind !== 'lake' && roads.near(f.x, f.z, f.r + 40).d < W2 + f.r + 0.15);
  check(stats.solids.length > 60 && near.length === 0, `${stats.solids.length} things stood (${[...new Set(stats.solids.map(f => f.kind))].join(', ')}), none reaching onto a road` +
    (near.length ? ': ' + near.slice(0, 5).map(f => `${f.kind} at ${Math.round(f.s)} m`).join(', ') : ''));
  const lake = stats.solids.find(f => f.kind === 'lake');
  check(!!lake && roads.near(lake.x, lake.z, 200).d > W2 + lake.r * 0.6 + 20, 'the frozen lake lies well off every stretch of road');
  const bad = stats.ribbons.filter(r => r.kind !== 'verge' && r.kind !== 'gallery' && r.minD < 0.25);
  check(stats.ribbons.length >= 8 && bad.length === 0, `${stats.ribbons.length} ribbons along the road (${[...new Set(stats.ribbons.map(r => r.kind))].join(', ')}), every one beyond the pavement's edge`);
  check(stats.ribbons.filter(r => r.kind === 'verge').every(r => r.maxY <= 0.05), 'the verge lies at the road\'s level, nothing to drive into');
  const G = stats.gallery;
  check(!!G && G.roof >= g.CONFIG.tunnel.height && level.tunnels.some(t => t.from === G.from && t.to === G.to), `the avalanche gallery is the level's tunnel (${G?.from}-${G?.to} m), its roof ${G?.roof} m up`);

  // ---- the camera (as render/scene.js has it: CONFIG.camHeight / camBack, the tunnel's camera eased over camEase m each side of a
  // portal, never within a metre of the ceiling)
  const C = g.CONFIG, TC = C.tunnel, cam = THEMES.alpine.tunnel, p = {};
  const inTunnel = (camS) => {
    let most = 0;
    for (const t of level.tunnels || []) {
      if (camS < t.from - TC.camEase || camS > t.to + TC.camEase) continue;
      if (camS >= t.from && camS <= t.to) return 1;
      const u = camS < t.from ? (camS - (t.from - TC.camEase)) / TC.camEase : (t.to + TC.camEase - camS) / TC.camEase;
      most = Math.max(most, u * u * (3 - 2 * u));
    }
    return most;
  };
  let inside = 0, roof = 0, lifted = 0, samples = 0;
  for (let s = Track.start + 20; s < Track.end - 2; s += 3) {
    const k = inTunnel(s - C.camBack), back = C.camBack + (cam.camBack - C.camBack) * k;
    let h = C.camHeight + (cam.camHeight - C.camHeight) * k;
    if (k > 0) h = Math.min(h, TC.height - 1);
    for (let lat = Track.lo(s - back) + 0.5; lat <= Track.hi(s - back) - 0.5; lat += 1.75) {
      samples++;
      Track.toWorld(s - back, lat, p);
      const y = p.y + h;
      if (stats.solids.some(f => f.kind !== 'lake' && Math.hypot(p.x - f.x, p.z - f.z) < f.r && y > f.y0 && y < f.y1)) inside++;
      if (G && s - back >= G.from && s - back <= G.to && h > G.roof - 0.5) roof++;
      if (A.lift(p.x, p.z, roads.near(p.x, p.z, 60).d) > 0) lifted++;
    }
  }
  check(samples > 5000 && !inside && !roof && !lifted, `the chase camera at ${samples} places: never inside what the theme stands (${inside}), never at the gallery's roof (${roof}), never over land the theme lifts (${lifted})`);

  // ---- the cost
  const what = `${stats.meshes} meshes, ${Math.round(stats.triangles / 1000)}k triangles, ${stats.instances} instances, the texture ${stats.textureSide} px`;
  check(stats.meshes <= BUDGET.meshes && stats.triangles <= BUDGET.triangles && stats.instances <= BUDGET.instances && stats.textureSide <= BUDGET.textureSide,
    what + ` (budget ${BUDGET.meshes} meshes, ${BUDGET.triangles / 1000}k triangles, ${BUDGET.instances} instances, ${BUDGET.textureSide} px)`);
  if (REPORT) console.log('        ' + stats.chunks.map(c => `${c.from}-${c.to}: ${Math.round(c.triangles)}${c.pines ? ' (' + c.pines + ' pines)' : ''}`).join(', '));
} catch (e) {
  failed++;
  console.log(e.stack);
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'the alpine pass is all right');
process.exit(failed ? 1 : 0);
