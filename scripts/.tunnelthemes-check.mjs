// A check of THE TUNNEL THEMES (render/tunneldress.js, CHECKLIST 424): the looks and fittings of the tunnels of the themes that had
// only the plain one (city, port, snow, hongkong, tokyo), headless:
//   - each look is for a theme with no tunnel of its own in themes.js (a theme with one keeps it: never touched), and has a dressing;
//   - every look builds on every level of its theme with tunnels, and on three other tunnel levels (one of them the mall's, a long
//     tunnel with no shoulders), without an error;
//   - nothing in the lanes: below FREE m a fitting keeps behind the pavement's edge (Track.lo / hi), over the lanes nothing hangs
//     lower than OVER m inside a tunnel (the chase camera rides at 5.5 m there) nor than OUTSIDE m beyond a portal, and nothing
//     inside comes down through the ceiling or stands out through a wall;
//   - its cost, held to a budget: a level's dressing in draw calls (meshes), triangles and instances, its textures' sides;
//   - render-only: the replay fingerprint (vite.config.js logicFiles) walks no render/ file and no logic file names the module.
//   node scripts/.tunnelthemes-check.mjs [--report]
import { readFileSync, readdirSync } from 'node:fs';
import * as THREE from 'three';
import { boot } from './delivery-headless.mjs';

const BUDGET = { meshes: 5, triangles: 3500, instances: 130, textureSide: 256 }; // (a level's dressing, all its tunnels; triangles and instances a 100 m of tunnel)
const REPORT = process.argv.includes('--report');
let failed = 0;
const check = (ok, what) => { if (!ok || REPORT) console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };

// (a canvas that draws nothing, for the textures: headless there is none)
const fakeCanvas = () => {
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : /^create.*Gradient$/.test(k) ? () => ({ addColorStop() {} }) : () => {}, set: (o, k, v) => { o[k] = v; return true; } });
  return { width: 0, height: 0, getContext: () => ctx };
};

const g = await boot({ ownAll: true });
try {
  globalThis.document.createElement = (tag) => tag === 'canvas' ? fakeCanvas() : {};
  const { THEMES } = await g.load('themes.js');
  const D = await g.load('render/tunneldress.js');
  const { heightOf } = await g.load('render/tunnelshape.js');
  const { TUNNEL_LOOKS, dressTunnels, wallTexture, FREE, OVER, OUTSIDE } = D;

  // ---- the looks
  const names = Object.keys(TUNNEL_LOOKS);
  check(names.length === 5 && names.every(n => THEMES[n] && !THEMES[n].tunnel && TUNNEL_LOOKS[n].dress),
    `${names.length} looks (${names.join(', ')}), each for a theme with no tunnel of its own, each with its fittings`);
  for (const n of names) {
    const T = wallTexture(TUNNEL_LOOKS[n].wallMap);
    check(!!T && T.side <= BUDGET.textureSide, `${n}: its wall texture (${TUNNEL_LOOKS[n].wallMap}) ${T?.side} px a side at most`);
  }

  // ---- the levels with tunnels, by theme
  const dir = new URL('../src/delivery/levels/', import.meta.url);
  const tunnelLevels = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
    .filter(L => (L.tunnels || []).length).map(L => ({ id: L.id, theme: L.theme || 'city' }));
  const own = tunnelLevels.filter(L => TUNNEL_LOOKS[L.theme]);
  check(own.length >= 8, `${own.length} levels of these themes have tunnels: ${own.map(L => L.id + ' (' + L.theme + ')').join(', ')}`);
  const others = ['backlot', 'cinder', 'mall-dash'].filter(id => tunnelLevels.some(L => L.id === id)); // (a long tunnel too: the mall's)

  const lay = (id, look) => {
    g.select(id);
    g.Game.loaded = null; g.Game.load();
    const Track = g.track.Track, group = new THREE.Group();
    const stats = dressTunnels(TUNNEL_LOOKS[look].dress, g.levels.LEVEL.tunnels, heightOf, group);
    return { Track, stats, group, tunnels: g.levels.LEVEL.tunnels };
  };
  const totals = {};
  for (const { id, theme } of [...own, ...others.flatMap(id => names.map(theme => ({ id, theme })))]) {
    let res = null;
    try { res = lay(id, theme); } catch (e) { console.log('        ' + e.stack.split('\n').slice(0, 3).join(' / ')); }
    check(!!res, `${theme}'s tunnel builds on ${id}`);
    if (!res) continue;
    const { Track, stats, group, tunnels } = res;
    const inTunnel = (s) => tunnels.find(t => s >= t.from && s <= t.to);
    // nothing in the lanes, nothing through the ceiling or out through a wall
    const bad = [];
    for (const f of stats.fittings) {
      for (const s of [f.s, (f.s + f.s1) / 2, f.s1]) {
        const lo = Track.lo(s), hi = Track.hi(s), t = inTunnel(s);
        const onPavement = f.latHi > lo + 0.001 && f.latLo < hi - 0.001;
        const overLanes = f.latHi > Track.laneLo(s) && f.latLo < Track.laneHi(s);
        if (f.y0 < FREE && onPavement) bad.push(`${f.kind} at ${s.toFixed(0)} m on the pavement, ${f.y0.toFixed(2)} m up`);
        else if (overLanes && f.y0 < (t ? OVER : OUTSIDE)) bad.push(`${f.kind} at ${s.toFixed(0)} m over the lanes, ${f.y0.toFixed(2)} m up`);
        if (t && s > t.from + 0.5 && s < t.to - 0.5) {
          if (f.y1 > heightOf(t)(s) + 0.01) bad.push(`${f.kind} at ${s.toFixed(0)} m through the ceiling (${f.y1.toFixed(2)} m)`);
          if (f.latLo < lo - 0.31 || f.latHi > hi + 0.31) bad.push(`${f.kind} at ${s.toFixed(0)} m out through a wall`);
        }
        if (bad.length > 5) break;
      }
    }
    check(stats.fittings.length > 20 && !bad.length, `${theme} on ${id}: ${stats.fittings.length} fittings, none in the lanes, through the ceiling or a wall` + (bad.length ? ': ' + bad.slice(0, 5).join('; ') : ''));
    // the cost
    const len = tunnels.reduce((a, t) => a + t.to - t.from, 0);
    const per = Math.max(1, len / 100);
    check(stats.meshes <= BUDGET.meshes && stats.triangles <= BUDGET.triangles * per && stats.instances <= BUDGET.instances * per && stats.textureSide <= BUDGET.textureSide && group.children.length === stats.meshes,
      `${theme} on ${id} (${tunnels.length} tunnel${tunnels.length > 1 ? 's' : ''}, ${len} m): ${stats.meshes} draw calls, ${Math.round(stats.triangles)} triangles, ${stats.instances} instances, its atlas ${stats.textureSide} px (budget ${BUDGET.meshes}, ${BUDGET.triangles * per | 0}, ${BUDGET.instances * per | 0}, ${BUDGET.textureSide})`);
    if (own.some(L => L.id === id)) totals[id] = { theme, meshes: stats.meshes, triangles: Math.round(stats.triangles), instances: stats.instances, tunnels: tunnels.length, len };
  }
  if (REPORT) for (const [id, t] of Object.entries(totals)) console.log(`        ${id} (${t.theme}): ${t.tunnels} tunnel(s), ${t.len} m: +${t.meshes} draw calls, +${t.triangles} triangles, ${t.instances} instances`);

  // ---- render-only
  const { logicFiles } = await import('../vite.config.js');
  const files = logicFiles();
  check(!files.some(f => /render\//.test(f)), `the replay fingerprint (vite.config.js logicFiles, ${files.length} files) walks no render/ file`);
  const named = files.filter(f => /tunneldress/.test(readFileSync(new URL('../src/delivery/' + f, import.meta.url), 'utf8')));
  check(!named.length, 'no logic file imports or names render/tunneldress.js (' + (named.join(', ') || 'none') + '): render-only');
} catch (e) {
  failed++;
  console.log(e.stack);
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'the tunnel themes are all right');
process.exit(failed ? 1 : 0);
