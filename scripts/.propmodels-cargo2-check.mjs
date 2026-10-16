// A check of the SIX MORE CARGO PROPS (render/propmodelscargo2.js MORE_CARGO_2; companion of .propmodels-check.mjs and .propmodels-cargo-check.mjs):
//   - the registry: six props, distinct 'cargo-' ids colliding with no other prop's, in PROPS.cargo after MORE_CARGO, shape / colourFrom valid,
//     a maxScale (>= MIN_SCALE.cargo), align absent or valid, names short (a chip: at most 16 characters)
//   - each AS WORN (merged by material): inside the cargo bound at scale 1 (2 mm), its base on the floor, finite, at most 300 triangles, at most
//     6 meshes (draw calls), tagged userData.prop = 'cargo' and propId on the group and every mesh (buildProp), the paint on it ('mixed' / 'car')
//     and the caller's own; two paints give two colours; the merged build has the same triangles as the parts
//   - each AS PARTS (build(paint, { split: true })): every part overlaps another by 5 mm or more (the boxes' common depth on all three axes), and
//     no two axis-aligned box parts have same-facing faces closer than 5 mm while overlapping in the other two axes (z-fighting)
//   - fitProp(car, 'cargo', shape, prop) on every car with a cargo slot: a transform, at most the prop's maxScale
//   - the module is render-only (not in the replay fingerprint)
//   node scripts/.propmodels-cargo2-check.mjs
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';

const BUDGET = 300, DRAWS = 6, GAP = 0.0045;
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const C2 = await load('render/propmodelscargo2.js');
  const C = await load('render/propmodelscargo.js');
  const M = await load('render/propmodels.js');
  const P = await load('render/propanchors.js');
  const v = new THREE.Vector3();
  const all = C2.MORE_CARGO_2;
  const others = Object.values(M.PROPS).flat().filter(p => !all.includes(p));
  check(all.length === 6 && all.every(p => /^cargo-[a-z]+$/.test(p.id)) && new Set(all.map(p => p.id)).size === 6 && all.every(p => !others.some(q => q.id === p.id)), 'six props with distinct cargo- ids, none another prop\'s (' + all.map(p => p.id).join(', ') + ')');
  const cargo = M.PROPS.cargo, at = cargo.indexOf(all[0]);
  check(at === M.BASE_PROPS.cargo.length + C.MORE_CARGO.length && all.every((p, i) => cargo[at + i] === p && M.propById(p.id) === p && M.propSlotOf(p.id) === 'cargo' && C2.cargo2ById(p.id) === p), 'in PROPS.cargo after MORE_CARGO; propById / propSlotOf / cargo2ById find each');
  check(all.every(p => ['box', 'cylinder'].includes(p.shape) && ['car', 'mixed', 'fixed'].includes(p.colourFrom) && p.name && p.name.length <= 16 && typeof p.build === 'function'), 'shape, colourFrom, a short name (<= 16 characters) and build() on each');
  check(all.every(p => Number.isFinite(p.maxScale) && p.maxScale >= P.MIN_SCALE.cargo && (!p.align || ['centre', 'front', 'rear'].includes(p.align))), 'a maxScale on each (>= ' + P.MIN_SCALE.cargo + '), align absent or valid (' + all.map(p => p.id + ' ' + p.maxScale).join(', ') + ')');
  const tris = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) { const geo = o.geometry; n += Math.floor((geo.index ? geo.index.count : geo.attributes.position.count) / 3); } }); return n; };
  const counts = [];
  for (const p of all) {
    const paint = M.propPaint(0xff5500), g = M.buildProp(p.id, paint);
    g.updateMatrixWorld(true);
    const B = P.PROP_BOUNDS.cargo, meshes = [];
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    let outside = 0, nan = 0, lowest = Infinity, worst = -Infinity;
    for (const m of meshes) {
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        if (!Number.isFinite(v.x + v.y + v.z)) { nan++; continue; }
        lowest = Math.min(lowest, v.y);
        const over = p.shape === 'box' ? Math.max(Math.abs(v.x) - B.box[0] / 2, Math.abs(v.y) - B.box[1] / 2, Math.abs(v.z) - B.box[2] / 2)
          : Math.max(Math.hypot(v.x, v.z) - B.cylinder.radius, Math.abs(v.y) - B.cylinder.height / 2);
        worst = Math.max(worst, over);
        if (over > 0.002) outside++;
      }
    }
    const floor = p.shape === 'box' ? -B.box[1] / 2 : -B.cylinder.height / 2;
    const n = tris(g), parts = p.build(M.propPaint(0xff5500), { split: true }), np = tris(parts);
    counts.push(p.id + ' ' + n + ' tris / ' + meshes.length + ' draws / ' + parts.children.length + ' parts');
    check(!nan && !outside, p.id + ': every vertex finite and inside the ' + p.shape + ' bound' + (outside ? ' (' + outside + ' outside, worst by ' + (worst * 1000).toFixed(1) + ' mm)' : ' (' + (-worst * 1000).toFixed(1) + ' mm inside at the closest)'));
    check(Math.abs(lowest - floor) < 0.003, p.id + ': its base stands on the bound\'s floor (' + lowest.toFixed(3) + ' vs ' + floor.toFixed(3) + ')');
    check(n <= BUDGET && n === np && meshes.length <= DRAWS, p.id + ': ' + n + ' triangles (budget ' + BUDGET + ', the parts ' + np + '), ' + meshes.length + ' meshes (at most ' + DRAWS + ')');
    check(g.userData.prop === 'cargo' && g.userData.propId === p.id && meshes.every(m => m.userData.prop === 'cargo' && m.userData.propId === p.id), p.id + ': tagged userData.prop = cargo, propId, on the group and every mesh');
    const uses = meshes.some(m => m.material === paint);
    check(!paint.userData.shared && (p.colourFrom === 'fixed' ? !uses : uses) && meshes.every(m => m.material === paint || m.material.userData.shared), p.id + ': colourFrom ' + p.colourFrom + ', the paint the caller\'s own, every other material shared');
    if (p.colourFrom !== 'fixed') { const a = M.propPaint(0xff0000), b = M.propPaint(0x0000ff); M.buildProp(p.id, a); M.buildProp(p.id, b); check(a.color.getHex() !== b.color.getHex(), p.id + ': two builds take two paints'); }
    // the parts: overlaps of 5 mm, no coplanar same-facing faces
    parts.updateMatrixWorld(true);
    const pm = parts.children.filter(o => o.isMesh), boxes = pm.map(m => new THREE.Box3().setFromObject(m, true));
    // (the common depth of two parts' boxes; a FLAT part (a disc: under 1 mm thick on an axis) counts on that axis when its plane lies 5 mm or more inside the other)
    const depth = (a, b) => Math.min(...['x', 'y', 'z'].map(ax => (a.max[ax] - a.min[ax] < 0.001 ? Math.min(a.min[ax] - b.min[ax], b.max[ax] - a.max[ax]) >= 0.005 - 1e-6 ? Infinity : -1
      : Math.min(a.max[ax], b.max[ax]) - Math.max(a.min[ax], b.min[ax]))));
    const lonely = [], coplanar = [];
    const plainBox = (m) => m.geometry.type === 'BoxGeometry' && !m.rotation.x && !m.rotation.y && !m.rotation.z;
    for (let i = 0; i < pm.length; i++) {
      let best = -Infinity;
      for (let j = 0; j < pm.length; j++) {
        if (i === j) continue;
        best = Math.max(best, depth(boxes[i], boxes[j]));
        if (j < i || !plainBox(pm[i]) || !plainBox(pm[j])) continue;
        for (const ax of ['x', 'y', 'z']) {
          const o2 = ['x', 'y', 'z'].filter(o => o !== ax), a = boxes[i], b = boxes[j];
          if (!o2.every(o => Math.min(a.max[o], b.max[o]) - Math.max(a.min[o], b.min[o]) > 0.005)) continue;
          for (const e of ['max', 'min']) if (Math.abs(a[e][ax] - b[e][ax]) < GAP) coplanar.push('parts ' + i + ' and ' + j + ' ' + e + ' ' + ax + ' ' + ((a[e][ax] - b[e][ax]) * 1000).toFixed(1) + ' mm');
        }
      }
      if (best < 0.005 - 1e-6) lonely.push('part ' + i + ' ' + pm[i].geometry.type + ' at ' + boxes[i].getCenter(v).toArray().map(x => x.toFixed(3)).join(',') + ' (' + (best * 1000).toFixed(1) + ' mm)');
    }
    check(!lonely.length, p.id + ': every part overlaps another by 5 mm or more' + (lonely.length ? ': ' + lonely.join('; ') : ''));
    check(!coplanar.length, p.id + ': no same-facing box faces within 5 mm of each other' + (coplanar.length ? ': ' + coplanar.slice(0, 5).join('; ') : ''));
  }
  console.log('        ' + counts.join('\n        '));
  // worn on every car with a cargo slot
  let worn = 0, capped = 0; const bad = [];
  for (const id of Object.keys({ ...P.PROP_TABLE, ...P.HAND })) for (const p of all) {
    const f = P.fitProp(id, 'cargo', p.shape, p);
    if (!P.propSupported(id, 'cargo')) { if (f) bad.push(id + ' ' + p.id + ' unsupported but placed'); continue; }
    if (!f || !(f.scale > 0) || f.scale > p.maxScale + 1e-9 || !f.position.every(Number.isFinite)) bad.push(id + ' ' + p.id); else { worn++; if (f.capped) capped++; }
  }
  check(!bad.length && worn > 200, 'fitProp(car, cargo, shape, prop) on every car with a cargo slot (' + worn + ' worn, ' + capped + ' at the prop\'s max)' + (bad.length ? ': ' + bad.slice(0, 6).join('; ') : ''));
  const { logicFiles } = await import(ROOT + '/vite.config.js');
  check(![...logicFiles()].some(f => /propmodelscargo2/.test(f)), 'propmodelscargo2.js is not in the replay fingerprint (vite.config.js logicFiles)');
} finally { await close(); }
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
