// The flank decal FEASIBILITY prototype (CHECKLIST 383, src/delivery/DECAL-FEASIBILITY.md; render/flankdecal.js, render/decalzonestable.js):
//   1. the zone table is well formed (every row [id, z0 < z1, y0 < y1, flat >= 0, curve >= 0], a known id, R: 'L' or rows)
//   2. OFF BY DEFAULT: with no ?decaltest the dressing adds nothing (the model's meshes and triangles unchanged)
//   3. with ?decaltest=1 every car of the table gets ONE decal mesh (one draw call), triangles within a budget, the number reading
//      left to right from each side (the roundel's u runs with +z on the left flank, with -z on the right), hidden in a blackout
// Headless (no browser): the models built through Vite as scripts/modelpatch-load.mjs does. About 10 s.
import { startModels } from './modelpatch-load.mjs';

let failed = 0;
const ok = (cond, what) => { if (!cond) { failed++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
const BUDGET = 600; // triangles a car (both flanks, roundel and stripe)
const IDS = ['postvan', 'bug', 'wedge', 'flatbed', 'bus', 'woody'];

const run = async (search) => {
  globalThis.location = { search };
  const { load, close } = await startModels();
  try {
    const C = await load('cars.js');
    const { IDEA_CARS } = await load('ideas.js');
    const { makeShowCar } = await load('render/showcar.js');
    const FD = await load('render/flankdecal.js');
    const { silhouetteFor } = await load('render/silhouette.js');
    const all = [...C.CARS, ...C.FILLER_CARS, ...Object.values(C.SECRET_CARS), ...IDEA_CARS];
    return { C, all, makeShowCar, FD, silhouetteFor, close, load };
  } catch (e) { await close(); throw e; }
};
const decals = (m) => { const out = []; m.traverse(n => { if (n.userData.flankDecal) out.push(n); }); return out; };
const tris = (m) => { let t = 0; m.traverse(n => { if (n.isMesh && n.geometry) t += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; }); return t; };

// ---- 1 and 2: off ----
{
  const { all, makeShowCar, FD, close, load } = await run('');
  try {
    const { DECAL_ZONES } = await load('render/decalzonestable.js');
    const IDS_OK = new Set(['door', 'quarter', 'fender', 'flank', 'bed']);
    for (const [key, e] of Object.entries(DECAL_ZONES)) {
      const rows = [...e.L, ...(e.R === 'L' ? [] : e.R)];
      ok(Array.isArray(e.L) && (e.R === 'L' || Array.isArray(e.R)) && rows.every(r => r.length === 7 && IDS_OK.has(r[0]) && r[1] < r[2] && r[3] < r[4] && r[5] >= 0 && r[6] >= 0), 'table row ' + key + ' well formed (' + rows.length + ' zones)');
    }
    ok(FD.DECAL_TEST.mode === null, 'no ?decaltest: the prototype is off');
    for (const id of IDS) {
      const car = all.find(c => c.id === id), m = makeShowCar(car);
      ok(decals(m).length === 0 && !m.userData.flankDecalDone, id + ': nothing added when off (' + tris(m) + ' triangles)');
    }
  } finally { await close(); }
}
// ---- 3: on ----
{
  const { all, makeShowCar, FD, silhouetteFor, close } = await run('?decaltest=1');
  try {
    ok(FD.DECAL_TEST.mode === '1', '?decaltest=1 read');
    for (const id of IDS) {
      const car = all.find(c => c.id === id), m = makeShowCar(car), d = decals(m);
      ok(d.length === 1, id + ': one decal mesh (one draw call)');
      if (d.length !== 1) continue;
      const g = d[0].geometry, t = g.attributes.position.count / 3;
      ok(t > 0 && t <= BUDGET, id + ': ' + t + ' triangles (budget ' + BUDGET + ')');
      ok(silhouetteFor(d[0].material).colorWrite === false, id + ': hidden in a blackout');
      // the roundel's cell is v >= 0.25: its u against z on each side (x < 0 the left flank)
      const P = g.attributes.position, U = g.attributes.uv;
      for (const [side, sign] of [['left', -1], ['right', 1]]) {
        const pts = [];
        for (let k = 0; k < P.count; k++) if (U.getY(k) >= 0.25 && Math.sign(P.getX(k)) === sign) pts.push([P.getZ(k), U.getX(k)]);
        const lo = pts.reduce((a, b) => (b[0] < a[0] ? b : a), pts[0]), hi = pts.reduce((a, b) => (b[0] > a[0] ? b : a), pts[0]);
        ok(pts.length && (sign < 0 ? hi[1] > lo[1] : hi[1] < lo[1]), id + ': the number reads left to right on the ' + side + ' flank');
      }
    }
  } finally { await close(); }
}
console.log(failed ? failed + ' FAILED' : 'all ok');
process.exit(failed ? 1 : 0);
