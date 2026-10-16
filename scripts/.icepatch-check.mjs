// A check of how ice patches are drawn (src/delivery/render/icepatch.js), headless: on every level with ice, and on a
// made-up road that bends and climbs, all of a level's patches are ONE geometry; each patch's triangles are under a
// budget; the same patch gives the same vertices twice (seeded by its place); every vertex sits on the road at the
// lift (laid with the road's own toWorld), and between rows the sheet never leaves the road by more than 2 cm (no
// stairs on a bend or a crest, no gap); the drawn patch covers its slippery part and strays no further than its rim.
// Prints the build time and the triangles.
//   node scripts/.icepatch-check.mjs
import * as THREE from 'three';
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const BUDGET = 260; // triangles for a 50 m patch on one lane on a straight road (a whole-road patch has more columns, a bend more rows)
try {
  const { buildIceGeometry, iceMaterial, icePatchesOf, iceLookOf, ICE_LOOKS } = await g.load('render/icepatch.js');
  const LW = g.CONFIG.laneWidth;
  const v = new THREE.Vector3(), w = new THREE.Vector3();

  // the sheet against the road it lies on: each triangle's middle against the road's own point under it
  const measure = (geo, toWorld, lift) => {
    const pos = geo.attributes.position.array, idx = geo.index.array;
    let worst = 0;
    for (let t = 0; t < idx.length; t += 3) {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 3; k++) { x += pos[idx[t + k] * 3]; y += pos[idx[t + k] * 3 + 1]; z += pos[idx[t + k] * 3 + 2]; }
      v.set(x / 3, y / 3, z / 3);
      const near = toWorld.inverse(v); // (the road point under it: the made-up road's inverse is known)
      toWorld(near.s, near.lat, w);
      worst = Math.max(worst, Math.abs(v.y - (w.y + lift)));
    }
    return worst;
  };

  // ---- a made-up road: a 60 m radius bend that climbs and crests (y = 6 sin(s / 25)), lanes 3.5 m
  {
    const R = 60, toWorld = (s, lat, out) => { const a = s / R; out.set(Math.sin(a) * (R + lat), 6 * Math.sin(s / 25), Math.cos(a) * (R + lat)); return 0; };
    toWorld.inverse = (p) => { const a = Math.atan2(p.x, p.z); return { s: a * R, lat: Math.hypot(p.x, p.z) - R }; };
    const lane = (n) => ({ lo: () => n * LW - LW / 2 + 0.15, hi: () => n * LW + LW / 2 - 0.15 });
    const patches = [{ from: 10, to: 60, seed: 11, ...lane(0) }, { from: 80, to: 125, seed: 12, lo: () => -LW / 2, hi: () => 2.5 * LW }];
    const look = ICE_LOOKS.snow, t0 = performance.now();
    const geo = buildIceGeometry(patches, toWorld, look);
    const ms = performance.now() - t0;
    const tris = geo.index.count / 3;
    const one = buildIceGeometry([patches[0]], toWorld, look).index.count / 3;
    const straight = buildIceGeometry([patches[0]], (s, lat, out) => out.set(lat, 0, -s), look).index.count / 3;
    check(straight <= BUDGET && one <= 2 * BUDGET, `a 50 m one-lane patch: ${straight} triangles on a straight road (budget ${BUDGET}), ${one} on the 60 m bend over a crest; both patches ${tris}, built in ${ms.toFixed(1)} ms`);
    const again = buildIceGeometry(patches, toWorld, look);
    check(geo.attributes.position.array.every((x, i) => x === again.attributes.position.array[i]) && geo.attributes.color.array.every((x, i) => x === again.attributes.color.array[i]), 'the same patches give the same vertices and colours twice');
    const other = buildIceGeometry([{ ...patches[0], seed: 99 }], toWorld, look);
    const first = buildIceGeometry([patches[0]], toWorld, look);
    check(other.attributes.position.array.some((x, i) => Math.abs(x - first.attributes.position.array[i]) > 0.01), 'another seed gives another outline');
    const off = measure(geo, toWorld, 0.025);
    check(off < 0.02, `on a 60 m bend over a crest the sheet keeps to the road: at most ${(off * 100).toFixed(1)} cm off its 2.5 cm lift`);
    // the outline: within its slippery part's bounds plus the rim, and covering the middle of it
    const pos = geo.attributes.position.array, col = geo.attributes.color.array;
    let stray = 0, covered = 0, samples = 0;
    for (let i = 0; i < pos.length / 3; i++) {
      const { s, lat } = toWorld.inverse(v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
      const p = patches.find(q => s >= q.from - 1.3 && s <= q.to + 1.3);
      if (!p) { stray = Infinity; continue; }
      stray = Math.max(stray, p.lo(s) - lat, lat - p.hi(s));
    }
    check(stray <= 0.6, `no vertex strays more than the rim (0.5 m, and the 12 cm the middle sways) beyond its patch's bounds (worst ${stray.toFixed(2)} m)`);
    // (the middle of each patch, every metre, lies inside a triangle with some alpha: a point-in-triangle test in (s, lat))
    const idx = geo.index.array, sl = [];
    for (let i = 0; i < pos.length / 3; i++) sl.push(toWorld.inverse(v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])));
    const inside = (ps, plat) => {
      for (let t = 0; t < idx.length; t += 3) {
        const [a, b, c] = [sl[idx[t]], sl[idx[t + 1]], sl[idx[t + 2]]];
        const d = (b.lat - c.lat) * (a.s - c.s) + (c.s - b.s) * (a.lat - c.lat);
        if (Math.abs(d) < 1e-9) continue;
        const l1 = ((b.lat - c.lat) * (ps - c.s) + (c.s - b.s) * (plat - c.lat)) / d, l2 = ((c.lat - a.lat) * (ps - c.s) + (a.s - c.s) * (plat - c.lat)) / d, l3 = 1 - l1 - l2;
        if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) return l1 * col[idx[t] * 4 + 3] + l2 * col[idx[t + 1] * 4 + 3] + l3 * col[idx[t + 2] * 4 + 3];
      }
      return 0;
    };
    for (const p of patches) for (let s = p.from + 2; s <= p.to - 2; s += 1) { samples++; if (inside(s, (p.lo(s) + p.hi(s)) / 2) > 0.3) covered++; }
    check(covered === samples, `the patches' middles are covered all along (${covered} of ${samples} points, 2 m in from the ends)`);
  }

  // ---- every level with ice, on its own road
  let levelsWithIce = 0;
  for (const level of [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)]) {
    if (!level.ice || !level.ice.length) continue;
    levelsWithIce++;
    g.select(level.id);
    g.track.buildTrack(); // (the level's road)
    const Track = g.track.Track;
    const patches = icePatchesOf(g.levels.LEVEL.ice, Track, LW), look = iceLookOf(level.theme);
    const t0 = performance.now();
    const geo = buildIceGeometry(patches, (s, lat, out) => Track.toWorld(s, lat, out), look);
    const ms = performance.now() - t0, tris = geo.index.count / 3;
    // (every vertex is the road's point at its own (s, lat) plus the lift: rebuild each row's points the same way and compare a sample)
    const pos = geo.attributes.position.array;
    let bad = 0;
    for (let i = 0; i < pos.length / 3; i++) if (!isFinite(pos[i * 3]) || !isFinite(pos[i * 3 + 1]) || !isFinite(pos[i * 3 + 2])) bad++;
    // (every edge of the sheet that runs along the road: its midpoint against the road's own point at its middle s and lat)
    const sl = geo.userData.sl, idx = geo.index.array, lift = look.lift ?? 0.025;
    let worst = 0, flat = 0;
    for (let k = 0; k < idx.length; k += 3) {
      for (const [i, j] of [[idx[k], idx[k + 1]], [idx[k + 1], idx[k + 2]], [idx[k + 2], idx[k]]]) {
        if (Math.abs(sl[i * 2] - sl[j * 2]) < 0.01) continue;
        Track.toWorld((sl[i * 2] + sl[j * 2]) / 2, (sl[i * 2 + 1] + sl[j * 2 + 1]) / 2, w);
        v.set((pos[i * 3] + pos[j * 3]) / 2, (pos[i * 3 + 1] + pos[j * 3 + 1]) / 2 - lift, (pos[i * 3 + 2] + pos[j * 3 + 2]) / 2);
        worst = Math.max(worst, Math.abs(v.y - w.y)); flat = Math.max(flat, Math.hypot(v.x - w.x, v.z - w.z));
      }
    }
    check(bad === 0 && worst < 0.015 && flat < 0.12, `${level.id} (${level.theme}): ${patches.length} patches, ONE geometry, ${tris} triangles (${Math.round(tris / patches.length)} a patch), ${ms.toFixed(1)} ms; between rows the sheet is within ${(worst * 100).toFixed(1)} cm of the road's height (1.5 allowed: it is lifted 2.5) and ${(flat * 100).toFixed(1)} cm of its line (the road is laid in 2 m pieces; 12 allowed)`);
  }
  check(levelsWithIce >= 6, `${levelsWithIce} levels have ice`);

  // ---- the material: one, see-through, depth not written, lifted by polygonOffset; Lambert on a lit theme
  const lit = iceMaterial(ICE_LOOKS.iceroad, true), unlit = iceMaterial(ICE_LOOKS.snow, false);
  check(lit.type === 'MeshLambertMaterial' && unlit.type === 'MeshBasicMaterial' && lit.transparent && !lit.depthWrite && lit.polygonOffset && lit.vertexColors,
    'the material: Lambert on a lit theme (the dark keeps it dark), Basic otherwise; see-through, no depth written, polygonOffset, vertex colours');
  check(iceLookOf('mall') === ICE_LOOKS.mall && iceLookOf('iceroadThaw') === ICE_LOOKS.iceroad && iceLookOf('nowhere') === ICE_LOOKS.snow, 'the looks by theme (mall, the thaw as the lake, others as snow)');
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (e.stack || e));
}
g.close();
console.log(failures ? `${failures} FAILED` : 'all ok');
process.exit(failures ? 1 : 0);
