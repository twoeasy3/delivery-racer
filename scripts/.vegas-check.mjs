// A check of THE LAS VEGAS STRIP (themes vegas and vegasNight: render/themes/vegas.js, vegasModels.js, vegasObstacles.js) and its two
// hidden levels (Vegas Strip, Vegas by Night), headless:
//   - both levels build with no problems, as hidden levels, on their themes, carrying their own cargo, with their three gimmicks
//     (boost pads, ramps over the jam, burst water mains) and nothing else of the catalogue's;
//   - their plain obstacles are the theme's (a velvet rope, a slot machine, a luggage cart, a giant die), each with the box of the
//     kind it stands in for, and each one COLLIDES: the player's car put into it is hurt by that kind's cost and the obstacle goes;
//   - pickups come in rows of two or more (but the odd power-up);
//   - the theme's scenery, laid out headless (its own code, road.js's helpers stood in for) on both levels and on four others
//     drawn as the Strip (?theme=vegas: one with bridges and exits, a tunnel, a level crossing, a drawbridge), keeps the rules:
//     nothing below 4.5 m stands on the road or its shoulders (the owner: dressing behind the kerb), nothing at all where a
//     bridge, tunnel, crossing, drawbridge or ford is (their clearings, as the city's);
//   - its COST is held under a budget (as scripts/.city-budget-check.mjs holds the city's): meshes (draw calls) in all and in
//     sight at once (any 1,200 m of road), instances, triangles in sight; and the textures it draws.
//   node scripts/.vegas-check.mjs [--report]       (--report: every number, not only failures)
import * as THREE from 'three';
import { boot } from './delivery-headless.mjs';

const BUDGET = {
  callsInSight: 24,   // meshes drawn at once (any 1,200 m; a one-off landmark counted where it stands; 16-Oct: see CHECKLIST)
  calls: 45,          // meshes in all
  trisInSight: 160000, // triangles drawn at once
  instances: 9000,    // instances in all
  textureBytes: 64 * 1024, // the theme's own canvas textures (the slot machine's reels; the city's wall texture is shared, not counted)
};
const REPORT = process.argv.includes('--report');
let failed = 0;
const check = (ok, what) => { if (!ok || REPORT) console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };

const g = await boot({ ownAll: true });
try {
  const { THEMES } = await g.load('themes.js');
  const { vegas, VEGAS } = await g.load('render/themes/vegas.js');
  const { REEL_SIZE } = await g.load('render/themes/vegasObstacles.js');
  const { loadTheme, hasThemeFile } = await g.load('render/themes/index.js');
  const { cargoFor } = await g.load('cargo.js');
  const { GROUPS } = await g.load('gimmicks.js');
  check(hasThemeFile('vegas') && typeof (await loadTheme('vegas')) === 'function', 'the theme loads by its name (themes/index.js)');
  check(THEMES.vegas?.scenery === 'vegas' && THEMES.vegasNight?.scenery === 'vegas' && THEMES.vegasNight.night && THEMES.vegasNight.lit, 'vegas and vegasNight in themes.js, the night lit');
  const H = g.levels.HIDDEN_LEVELS, K = g.CONFIG.obstacleKinds;
  const OWN = { barrier: 'velvetRope', crate: 'slotMachine', bale: 'luggageCart', cone: 'casinoDie' };
  for (const id of ['vegas-strip', 'vegas-night']) {
    const level = H[id];
    check(!!level && !g.levels.LEVELS.includes(level), id + ': a hidden level, not on the menu');
    if (!level) continue;
    g.select(level);
    g.Game.evil = false;
    g.Game.start();
    const T = g.track.Track;
    check(!(T.problems || []).length, id + ': builds with no problems' + ((T.problems || []).length ? ' (' + T.problems.join(' | ') + ')' : ''));
    check(T.length >= 3200 && T.length <= 3800, id + ': ' + Math.round(T.length) + ' m (3.2 to 3.8 km)');
    const good = cargoFor(level, false), evil = cargoFor(level, true);
    check(good?.id === 'pokerchips' && evil?.id === 'fakechips', id + ': carries ' + good?.id + ' / ' + evil?.id);
    // (the catalogue's gimmicks on it: GROUPS' cards whose has() is true, the plain road dressing not among them)
    const cards = GROUPS.flatMap(gr => gr.cards.map(c => ({ ...c, group: gr.name }))).filter(c => c.has && c.has(level)).map(c => c.name);
    const want = ['Boost pads', 'Ramp over the jam', 'Burst water mains'];
    const others = cards.filter(n => !want.includes(n) && !/traffic|police|emergency|rubberneck|pursuit|quirk/i.test(n));
    check(want.every(n => cards.includes(n)) && !others.length, id + ': its gimmicks ' + cards.join(', ') + (others.length ? ' (MORE: ' + others.join(', ') + ')' : ''));
    // ---- its obstacles: the theme's, the box of what they stand in for, and they collide
    const obs = g.Collision.obstacles.filter(o => !o.handrail && Object.values(OWN).includes(o.kind));
    const named = (level.obstacles || []).length;
    check(obs.length === named, id + ': ' + obs.length + ' of its ' + named + ' plain obstacles are the Strip\'s own (' + [...new Set(obs.map(o => o.kind))].join(', ') + ')');
    const size = g.Collision.size;
    for (const [like, kind] of Object.entries(OWN)) {
      check(JSON.stringify(size[kind]) === JSON.stringify(size[like]) && JSON.stringify(K[kind]) === JSON.stringify(K[like]), `${kind}: a ${like}'s box ${JSON.stringify(size[kind])} and cost ${JSON.stringify(K[kind])}`);
    }
    for (const kind of new Set(obs.map(o => o.kind))) {
      const o = obs.find(x => x.kind === kind), P = g.Player;
      g.Game.evil = false;
      g.Game.start();
      const target = g.Collision.obstacles.find(x => x.s === o.s && x.lat === o.lat);
      P.ghost = 0; P.shield = 0; P.testGhost = false; P.tank = 0; P.armour = 0;
      P.s = target.s - target.hl - P.hl - 0.6; P.lat = target.lat; P.speed = 15; P.latVel = 0;
      const before = P.health;
      g.drive(1, 0);
      g.run(0.5, () => target.gone);
      const cost = K[kind].damage;
      check(target.gone && before - P.health >= cost - 0.01, `${id}: driven into the ${kind} at ${Math.round(target.s)} m: it goes, ${Math.round(before - P.health)} damage (its cost ${cost})`);
    }
    // ---- pickups in rows: every cash pickup has another at its s
    const cash = (level.pickups || []).filter(p => /^cash/.test(p.type));
    const lone = cash.filter(p => !cash.some(q => q !== p && q.s === p.s));
    check(!lone.length, id + ': ' + cash.length + ' cash pickups, all in rows of two or more' + (lone.length ? ' (alone: ' + lone.map(p => p.s).join(', ') + ')' : ''));
  }
  // ---- the scenery, headless, on its levels and on others drawn as the Strip
  const others = ['expressway', 'canberra', 'hong-kong', 'harbour', 'gimmick-road'].map(id => [...g.levels.LEVELS, ...Object.values(H)].find(l => l.id === id)).filter(Boolean);
  const runs = [['vegas-strip', H['vegas-strip']], ['vegas-night', H['vegas-night']], ...others.map(l => [l.id + ' as the Strip', { ...l, theme: 'vegas' }])];
  for (const [name, level] of runs) {
    g.select(level);
    g.Game.loaded = null;
    g.Game.load();
    const T = g.track.Track, theme = THEMES[level.theme];
    const jobs = [], group = new THREE.Group();
    let strips = 0, stripTris = 0;
    const along = (s) => T.isMain(s) ? s : T.along(s);
    const ctx = {
      theme, exits: T.exits, cube: new THREE.BoxGeometry(1, 1, 1), levelGroup: group,
      beside: (side, s, d) => side < 0 ? T.lo(s) - d : T.hi(s) + d,
      instances: (geometry, color, list, glowing, pad, material) => { if (list.length) jobs.push({ tris: (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3, list, light: material?.blending === THREE.AdditiveBlending }); },
      sideStrip: () => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1], 3)); return geo; },
      add: (geo) => { strips++; stripTris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3; },
      flat: () => new THREE.MeshBasicMaterial(), offRoads: () => true, standsClear: () => true,
    };
    vegas(ctx);
    // the one-offs it put in the level's group itself (the speck that keeps time is no draw: it writes nothing)
    // (each counted in sight where it stands, if it says (userData.s); the mountains, the train and the beam's concrete everywhere)
    const ones = [];
    for (const top of group.children) {
      top.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.material?.colorWrite !== false) { const geo = o.geometry; ones.push([top.userData.s, (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1)]); } });
    }
    const near = (s) => ones.filter(([at]) => at === undefined || (at >= s - 300 && at <= s + 1200));
    const calls = jobs.length + strips + ones.length, instances = jobs.reduce((n, j) => n + j.list.length, 0);
    let callsInSight = 0, trisInSight = 0;
    const spans = jobs.map(j => { const ss = j.list.map(e => along(e[0])); return [Math.min(...ss), Math.max(...ss), j.tris * j.list.length]; });
    for (let s = T.start; s < T.end; s += 100) {
      const seen = spans.filter(([a, b]) => b >= s && a <= s + 1200);
      const there = near(s);
      callsInSight = Math.max(callsInSight, seen.length + strips + there.length);
      trisInSight = Math.max(trisInSight, seen.reduce((n, sp) => n + sp[2], 0) + stripTris + there.reduce((n, [, t]) => n + t, 0));
    }
    check(callsInSight <= BUDGET.callsInSight && calls <= BUDGET.calls && trisInSight <= BUDGET.trisInSight && instances <= BUDGET.instances,
      `${name}: ${calls} meshes (${callsInSight} in sight), ${instances} instances, ${Math.round(trisInSight / 1000)}k triangles in sight (budget ${BUDGET.callsInSight} / ${BUDGET.calls}, ${BUDGET.instances}, ${BUDGET.trisInSight / 1000}k)`);
    // the rules: nothing low on the road or its shoulders; nothing where a bridge, tunnel, crossing, drawbridge or ford keeps clear
    const clear = [];
    for (const b of level.bridges || []) clear.push([b.from - 30, b.to + 30, 'a bridge']);
    for (const t of level.tunnels || []) clear.push([t.from - 25, t.to + 25, 'a tunnel']);
    for (const c of level.crossings || []) { const s = T.place(c); clear.push([s - 18, s + 18, 'a level crossing']); }
    for (const d of level.drawbridges || []) { const s = T.place(d); clear.push([s - 50, s + 50, 'a drawbridge']); }
    for (const f of level.fords || []) clear.push([f.from - 20, f.to + 20, 'a ford']);
    let onRoad = 0, inClearing = 0;
    const where = [];
    for (const { list, light } of jobs) {
      if (light) continue; // (a lamp's pool of light: no thing)
      for (const e of list) {
        const [s, lat, y, sx, sy, sz] = e;
        if (!T.isMain(s)) continue;
        const r = Math.hypot(sx, sz) / 2 * (e.turn ? 1 : 0) + (e.turn ? 0 : sx / 2); // (across: half its width, or its whole reach if turned)
        const low = y - sy / 2 < 4.5 && sy < 400;
        if (low && lat - r < T.hi(s) + 0.25 && lat + r > T.lo(s) - 0.25) { onRoad++; if (where.length < 5) where.push(Math.round(s) + ' m, ' + lat.toFixed(1)); }
        if (clear.some(([a, b]) => s > a && s < b)) inClearing++;
      }
    }
    check(!onRoad, `${name}: nothing below 4.5 m on the road or its shoulders (${onRoad})` + (where.length ? ' at ' + where.join('; ') : ''));
    check(!inClearing, `${name}: nothing in the clearings of ${clear.length} bridges, tunnels, crossings, drawbridges and fords (${inClearing})`);
  }
  const bytes = REEL_SIZE[0] * REEL_SIZE[1] * 4;
  check(bytes <= BUDGET.textureBytes, `its own canvas textures: the slot machine's reels ${REEL_SIZE.join(' x ')} px, ${bytes / 1024} KB (budget ${BUDGET.textureBytes / 1024} KB; the city's 256 x 256 wall texture shared)`);
  check(VEGAS.mono.d - VEGAS.mono.wide / 2 > VEGAS.pave && VEGAS.basin.from > VEGAS.pave, 'the monorail\'s beam and the fountain\'s basin stand behind the pavement');
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'the Strip keeps its rules and its budget');
process.exit(failed ? 1 : 0);
