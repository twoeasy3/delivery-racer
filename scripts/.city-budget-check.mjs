// A check of THE CITY'S COST (render/themes/city.js, the default theme's buildings and street; CHECKLIST 323): every level
// drawn as the city (no theme of its own, or a theme whose scenery is 'city': city, night, flooded, and any added later),
// on the menu or hidden, has its scenery laid out headless (the theme's own code, with road.js's helpers stood in for), and
// what it would hand the GPU is counted: meshes (draw calls), instances and triangles, all of it and what is in sight at
// once (any 1,200 m of road: the boxes are in meshes of 600 m each and the crowns of 1,800 m, culled out of sight; the rest is
// drawn whole),
// and the one texture's size. Each is held under a budget, so the scenery cannot grow by stealth: raise a budget on purpose,
// with a word in CHECKLIST.md. An upper bound: what road.js then takes off other roads is still counted here.
//   node scripts/.city-budget-check.mjs [--report]       (--report: every level's numbers, not only failures)
// Before 15-Oct (grey blocks and poles): 2 meshes, about 400 to 1,100 instances, 11,000 to 49,000 triangles of scenery in
// the browser's own count; see CHECKLIST 323 for the measured table.
import * as THREE from 'three';
import { boot } from './delivery-headless.mjs';

const BUDGET = {
  callsInSight: 10,       // meshes drawn at once (any 1,200 m), the pavement's included (15-Oct: 7 or 8)
  calls: 30,              // meshes in all (a long level has more chunks; 15-Oct: 10 to 23)
  trisInSight: 80000,     // triangles drawn at once (15-Oct: 26,000 to 62,000)
  instances: 15000,       // instances in all (15-Oct: 2,800 to 10,900)
  textureSide: 256,       // the canvas texture's side, px (4 bytes a pixel)
};
const REPORT = process.argv.includes('--report');
let failed = 0;
const check = (ok, what) => { if (!ok || REPORT) console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };

const g = await boot({ ownAll: true });
try {
  const { THEMES } = await g.load('themes.js');
  const { city } = await g.load('render/themes/city.js');
  const { cityKeepsClear } = await g.load('render/themes/extras.js');
  const { CITY_TEXTURE_SIZE } = await g.load('render/themes/cityModels.js');
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS), g.levels.SCREENSAVER_LEVEL]; // (the screensaver's too: Pile-Up Parade)
  const levels = [...new Set(all)].filter(l => (THEMES[l.theme] || THEMES.city).scenery === 'city');
  check(levels.length > 0, levels.length + ' levels drawn as the city: ' + levels.map(l => l.id).join(', '));
  for (const level of levels) {
    g.select(level);
    g.Game.loaded = null;
    g.Game.load();
    const Track = g.track.Track; // (built for this level)
    const theme = THEMES[level.theme] || THEMES.city;
    const jobs = [];
    let strips = 0;
    const along = (s) => Track.isMain(s) ? s : Track.along(s);
    const ctx = {
      theme, exits: Track.exits, cube: new THREE.BoxGeometry(1, 1, 1), cityKeepsClear,
      beside: (side, s, d) => side < 0 ? Track.lo(s) - d : Track.hi(s) + d,
      instances: (geometry, color, list) => { if (list.length) jobs.push({ tris: (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3, list }); },
      sideStrip: () => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1], 3)); return geo; },
      add: () => { strips++; },
      flat: () => new THREE.MeshBasicMaterial(),
    };
    city(ctx);
    const calls = jobs.length + strips, instances = jobs.reduce((n, j) => n + j.list.length, 0);
    // (in sight: each 1,200 m window, every mesh with something in it, and its triangles, the whole mesh's)
    let callsInSight = 0, trisInSight = 0;
    const spans = jobs.map(j => { const ss = j.list.map(e => along(e[0])); return [Math.min(...ss), Math.max(...ss), j.tris * j.list.length]; });
    for (let s = Track.start; s < Track.end; s += 100) {
      const seen = spans.filter(([a, b]) => b >= s && a <= s + 1200);
      callsInSight = Math.max(callsInSight, seen.length + strips);
      trisInSight = Math.max(trisInSight, seen.reduce((n, sp) => n + sp[2], 0));
    }
    const what = `${level.id}: ${calls} meshes (${callsInSight} in sight), ${instances} instances, ${Math.round(trisInSight / 1000)}k triangles in sight`;
    check(callsInSight <= BUDGET.callsInSight && calls <= BUDGET.calls && trisInSight <= BUDGET.trisInSight && instances <= BUDGET.instances,
      what + ` (budget ${BUDGET.callsInSight} / ${BUDGET.calls} meshes, ${BUDGET.instances} instances, ${BUDGET.trisInSight / 1000}k triangles)`);
  }
  check(CITY_TEXTURE_SIZE <= BUDGET.textureSide, 'the city\'s one texture ' + CITY_TEXTURE_SIZE + ' x ' + CITY_TEXTURE_SIZE + ' px (budget ' + BUDGET.textureSide + ')');
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'the city is within its budget');
process.exit(failed ? 1 : 0);
