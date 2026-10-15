// A check of the THIRD SET OF SIX REAR WINGS (render/propmodelswing2.js MORE_WING_2; CHECKLIST 382), the logic of .propmodels-check.mjs: each is built
// with a paint (merged by material: at most three meshes) and
//   - lies INSIDE the wing slot's canonical bound at scale 1 (box 1.4 x 0.35 x 0.3, or the cylinder of radius 0.15 and length 1.4 across the car;
//     2 mm of tolerance), is finite, and its base reaches the bound's floor (3 mm)
//   - is under the triangle budget (300), tagged userData.prop = 'wing' / propId on the group and every mesh
//   - uses the paint on a mesh (not for colourFrom 'fixed'), and the paint is the caller's own (not shared); carPrimary reads the car's side colour
//   - no z-fighting between parts (no same-facing coplanar faces of the parts' boxes within 0.5 mm) and no floating part, on the merged meshes
//     AND on the unmerged parts (wing2Parts): every part enters a neighbour (boxes overlapping by 5 mm on every axis, or 2 mm for a tilted one)
//   - the registry: six, ids 'wing-*', distinct from every other wing, shape box | cylinder ,
//     colourFrom car | mixed | fixed; fitProp gives a transform for the wing slot of the supported test cars; render-only
//   node scripts/.propmodels-wing2-check.mjs
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';
const BUDGET = 300;
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const M = await load('render/propmodels.js');
  const W = await load('render/propmodelswing2.js');
  const W1 = await load('render/propmodelswing.js');
  const WC = await load('render/propmodelswingclassic.js');
  const P = await load('render/propanchors.js');
  const v = new THREE.Vector3();
  const all = W.MORE_WING_2.map(p => ({ slot: 'wing', ...p }));
  check(all.length === 6 && all.every(p => /^wing-[a-z0-9-]+$/.test(p.id)), 'six wings, ids wing-* (' + all.map(p => p.id).join(', ') + ')');
  const first = M.BASE_PROPS.wing.map(p => p.id);
  check(new Set(all.map(p => p.id)).size === 6 && all.every(p => !first.includes(p.id) && M.propById(p.id)?.build === p.build && !W1.MORE_WING.some(q => q.id === p.id) && !WC.MORE_WING_CLASSIC.some(q => q.id === p.id)) && M.PROPS.wing.length === 21 && new Set(M.PROPS.wing.map(p => p.id)).size === 21, 'ids distinct from each other, the playful six, the classic six and winggt / winglip / wingtube; PROPS.wing holds 21');
  check(all.every(p => ['box', 'cylinder'].includes(p.shape) && ['car', 'mixed', 'fixed'].includes(p.colourFrom) && p.name && typeof p.build === 'function'), 'a name, shape (box | cylinder), colourFrom (car | mixed | fixed) and build on every wing');
  check(all.every(p => p.shape === 'box' && p.maxScale >= 1 && p.maxScale <= 1.8), 'all six are box-bound, each with a maxScale between 1 and 1.8 (' + all.map(p => p.id + ' ' + p.maxScale).join(', ') + ')');
  check(W1.carPrimary({ color: 1, evilColor: 2 }, false) === 1 && W1.carPrimary({ color: 1, evilColor: 2 }, true) === 2 && W1.carPrimary({ color: 1 }, true) === 1, 'carPrimary(car, evil): colour for Good, evilColor for Evil, colour when there is no evilColor');
  const tris = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) { const geo = o.geometry; n += Math.floor((geo.index ? geo.index.count : geo.attributes.position.count) / 3); } }); return n; };
  const counts = [];
  for (const p of all) {
    const paint = M.propPaint(0xff5500), g = W.buildWing2(p.id, paint);
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
    check(meshes.length <= 3 && new Set(meshes.map(m => m.material)).size === meshes.length, p.id + ': merged by material, one mesh a material (' + meshes.length + ' draw calls)');
    check(M.propById(p.id)?.build === p.build && M.PROPS.wing.includes(M.propById(p.id)), p.id + ': in the registry (PROPS.wing)');
    // the unmerged parts: each enters a neighbour by 5 mm (2 mm for a rotated part, whose box is loose), none coplanar
    {
      const parts = W.wing2Parts(p.id, paint), pb = parts.map(m => { m.updateMatrixWorld(true); return new THREE.Box3().setFromObject(m, true); });
      const lone = [], flat = [];
      for (let i = 0; i < pb.length; i++) {
        let enters = false;
        for (let j = 0; j < pb.length; j++) {
          if (i === j) continue;
          const need = parts[i].rotation.z || parts[j].rotation.z ? 0.002 : 0.005;
          const ov = ['x', 'y', 'z'].map(ax => Math.min(pb[i].max[ax], pb[j].max[ax]) - Math.max(pb[i].min[ax], pb[j].min[ax]));
          if (ov.every(o => o >= need - 1e-6)) enters = true;
          if (j > i) for (const ax of ['x', 'y', 'z']) {
            const others = ['x', 'y', 'z'].filter(o => o !== ax);
            if (!others.every(o => Math.min(pb[i].max[o], pb[j].max[o]) - Math.max(pb[i].min[o], pb[j].min[o]) > 0.005)) continue;
            if (Math.abs(pb[i].max[ax] - pb[j].max[ax]) < 0.0005 || Math.abs(pb[i].min[ax] - pb[j].min[ax]) < 0.0005) flat.push(i + '/' + j + ' on ' + ax);
          }
        }
        if (!enters) lone.push(i + ' ' + parts[i].geometry.type);
      }
      check(!lone.length && !flat.length, p.id + ': ' + parts.length + ' parts, each entering a neighbour, none coplanar' + (lone.length ? ': lonely ' + lone.join('; ') : '') + (flat.length ? ': coplanar ' + flat.join('; ') : ''));
    }
    check(g.userData.prop === 'wing' && g.userData.propId === p.id && meshes.every(m => m.userData.prop === 'wing' && m.userData.propId === p.id), p.id + ': tagged userData.prop = wing, propId, on the group and every mesh');
    check((p.colourFrom === 'fixed' ? true : meshes.some(m => m.material === paint)) && !paint.userData.shared && meshes.every(m => m.material === paint || m.material.userData.shared), p.id + ': colourFrom ' + p.colourFrom + (p.colourFrom === 'fixed' ? ' (paint unused)' : ': the paint is on it') + ', the paint is the caller\'s own, every other material shared');
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
  // placing on the test cars: the wing slot
  const cars = ['minibus', 'touringcar', 'sporttruck', 'rally', 'moke'];
  let placed = 0; const bad = [];
  for (const id of cars) for (const shape of ['box', 'cylinder']) {
    const f = P.fitProp(id, 'wing', shape), s2 = P.propSlots(id).wing;
    if (!s2.supported) { if (f !== null) bad.push(id + ' unsupported but fitProp gave a transform'); continue; }
    if (!f || !(f.scale > 0) || f.position.length !== 3 || !f.position.every(Number.isFinite) || !Number.isFinite(f.rotationY)) bad.push(id + ' ' + shape); else placed++;
  }
  check(!bad.length && placed === 10, 'fitProp(car, wing, shape) gives a transform for the five test cars (the moke\'s rear deck takes a wing since the placement audit, CHECKLIST 307) (' + placed + ' placed)' + (bad.length ? ': ' + bad.join('; ') : ''));
  const { logicFiles } = await import(ROOT + '/vite.config.js');
  check(![...logicFiles()].some(f => /propmodels|propanchors|propcosmetic|propbounds|propmodelswing/.test(f)), 'the prop modules are not in the replay fingerprint (vite.config.js logicFiles)');
} finally { await close(); }
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
