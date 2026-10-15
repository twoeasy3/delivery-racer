// A check of the PROP MODELS (render/propmodels.js; CHECKLIST 300): every prop is built (with a paint), and
//   - lies INSIDE its slot's canonical bounds (render/propanchors.js PROP_BOUNDS) at scale 1: every vertex of a box prop within the box
//     (2 mm of tolerance), of a cylinder prop within the cylinder's radius and height; and its base reaches the bound's floor (a prop
//     stands on the surface, it does not float)
//   - is finite (no NaN in any vertex), under the triangle budget (BUDGET), tagged on the group and every mesh (userData.prop = slot,
//     userData.propId = id), uses the paint on at least one mesh, and the paint is not shared
//   - has no z-fighting between its parts: no two parts have same-facing faces of their boxes on one plane (within 0.5 mm) that overlap
//     in the other two axes; and no floating part: every part touches or enters another (boxes within 2 mm)
//   - the registry: three a slot, distinct ids, shape 'box' | 'cylinder', propById / propSlotOf agree
//   - fitProp(carId, slot, shape) places a prop on the five test cars (a transform with a positive scale), and the module is render-only
//   node scripts/.propmodels-check.mjs
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';

const BUDGET = 300;
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const M = await load('render/propmodels.js');
  const P = await load('render/propanchors.js');
  const v = new THREE.Vector3();
  const slots = Object.keys(M.PROPS);
  check(slots.join(',') === 'roof,cargo,wing' && slots.every(s => M.PROPS[s].length === 3), 'three props a slot, roof / cargo / wing (' + slots.map(s => s + ' ' + M.PROPS[s].length).join(', ') + ')');
  const all = slots.flatMap(s => M.PROPS[s].map(p => ({ slot: s, ...p })));
  check(new Set(all.map(p => p.id)).size === all.length && all.every(p => ['box', 'cylinder'].includes(p.shape) && p.name), 'distinct ids, a name and a shape (box | cylinder) on every prop');
  check(all.every(p => M.propById(p.id) === M.PROPS[p.slot].find(q => q.id === p.id) && M.propSlotOf(p.id) === p.slot), 'propById / propSlotOf find every prop in its slot');
  const tris = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) { const geo = o.geometry; n += Math.floor((geo.index ? geo.index.count : geo.attributes.position.count) / 3); } }); return n; };
  const counts = [];
  for (const p of all) {
    const paint = M.propPaint(0xff5500), g = M.buildProp(p.id, paint);
    g.updateMatrixWorld(true);
    const B = P.PROP_BOUNDS[p.slot], meshes = [];
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    // every vertex inside the bound; the lowest vertex on its floor
    let outside = 0, nan = 0, lowest = Infinity, worst = 0;
    for (const m of meshes) {
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        if (!Number.isFinite(v.x + v.y + v.z)) { nan++; continue; }
        lowest = Math.min(lowest, p.shape === 'cylinder' && B.cylinder.axis === 'x' ? v.y : v.y);
        let over = 0;
        if (p.shape === 'box') over = Math.max(Math.abs(v.x) - B.box[0] / 2, Math.abs(v.y) - B.box[1] / 2, Math.abs(v.z) - B.box[2] / 2);
        else if (B.cylinder.axis === 'y') over = Math.max(Math.hypot(v.x, v.z) - B.cylinder.radius, Math.abs(v.y) - B.cylinder.height / 2);
        else over = Math.max(Math.hypot(v.y, v.z) - B.cylinder.radius, Math.abs(v.x) - B.cylinder.height / 2);
        worst = Math.max(worst, over);
        if (over > 0.002) outside++;
      }
    }
    const floor = p.shape === 'box' ? -B.box[1] / 2 : B.cylinder.axis === 'y' ? -B.cylinder.height / 2 : -B.cylinder.radius;
    const n = tris(g);
    counts.push(p.id + ' ' + n);
    check(!nan && !outside, p.id + ': every vertex finite and inside the ' + p.shape + ' bound' + (outside ? ' (' + outside + ' outside, worst by ' + (worst * 1000).toFixed(1) + ' mm)' : ' (' + (worst * 1000).toFixed(1) + ' mm inside at the closest)'));
    check(Math.abs(lowest - floor) < 0.003, p.id + ': its base stands on the bound\'s floor (' + lowest.toFixed(3) + ' vs ' + floor.toFixed(3) + ')');
    check(n <= BUDGET, p.id + ': ' + n + ' triangles (budget ' + BUDGET + '), ' + meshes.length + ' meshes');
    check(g.userData.prop === p.slot && g.userData.propId === p.id && meshes.every(m => m.userData.prop === p.slot && m.userData.propId === p.id), p.id + ': tagged userData.prop = ' + p.slot + ', propId, on the group and every mesh');
    check(meshes.some(m => m.material === paint) && !paint.userData.shared, p.id + ': the paint is on it and is the caller\'s own');
    // z-fighting and floating, by the parts' boxes
    const boxes = meshes.map(m => new THREE.Box3().setFromObject(m, true));
    const axes = ['x', 'y', 'z'];
    const coplanar = [], lonely = [];
    for (let i = 0; i < boxes.length; i++) {
      let touches = boxes.length === 1;
      for (let j = 0; j < boxes.length; j++) {
        if (i === j) continue;
        const a = boxes[i], b = boxes[j];
        if (a.clone().expandByScalar(0.002).intersectsBox(b)) touches = true;
        if (j < i) continue;
        for (const ax of axes) {
          const others = axes.filter(o => o !== ax);
          const overlap = others.every(o => Math.min(a.max[o], b.max[o]) - Math.max(a.min[o], b.min[o]) > 0.005);
          if (!overlap) continue;
          if (Math.abs(a.max[ax] - b.max[ax]) < 0.0005 || Math.abs(a.min[ax] - b.min[ax]) < 0.0005) coplanar.push(meshes[i].geometry.type + '/' + meshes[j].geometry.type + ' on ' + ax);
        }
      }
      if (!touches) lonely.push(meshes[i].geometry.type + ' at ' + boxes[i].getCenter(v).toArray().map(x => x.toFixed(2)).join(','));
    }
    check(!coplanar.length, p.id + ': no same-facing coplanar faces between parts' + (coplanar.length ? ': ' + coplanar.slice(0, 4).join('; ') : ''));
    check(!lonely.length, p.id + ': every part touches another' + (lonely.length ? ': ' + lonely.join('; ') : ''));
  }
  console.log('        triangles: ' + counts.join(', '));
  // placing on the test cars
  const cars = ['minibus', 'touringcar', 'sporttruck', 'moke', 'rally'];
  let placed = 0, bad = [];
  for (const id of cars) for (const slot of slots) for (const shape of ['box', 'cylinder']) {
    const f = P.fitProp(id, slot, shape), s = P.propSlots(id)[slot];
    if (!s.supported) { if (f !== null) bad.push(id + ' ' + slot + ' unsupported but fitProp gave a transform'); continue; }
    if (!f || !(f.scale > 0) || f.position.length !== 3 || !f.position.every(Number.isFinite) || !Number.isFinite(f.rotationY)) bad.push(id + ' ' + slot + ' ' + shape);
    else placed++;
  }
  check(!bad.length && placed >= 20, 'fitProp gives a transform (positive scale, finite position and yaw) for every supported slot of the five test cars, null otherwise (' + placed + ' placed)' + (bad.length ? ': ' + bad.join('; ') : ''));
  const { logicFiles } = await import(ROOT + '/vite.config.js');
  check(![...logicFiles()].some(f => /propmodels|propanchors|propcosmetic|propbounds/.test(f)), 'the prop modules are not in the replay fingerprint (vite.config.js logicFiles)');
} finally { await close(); }
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
