// A check of the SIX NEW ROOF PROPS (render/propmodelsroof.js MORE_ROOF; CHECKLIST 300): same logic as .propmodels-check.mjs, for these six:
//   every vertex finite and inside the roof bound (box 1 x 0.5 x 0.8 / cylinder r 0.45 x 0.5, 2 mm), base on the bound's floor, under 300
//   triangles, tagged on the group and every mesh (userData.prop = 'roof', propId), the paint is on it (not for colourFrom 'fixed') and is the
//   caller's own, no same-facing coplanar faces, no floating part; the registry (six, ids 'roof-', both shapes, >= 2 cylinders, colourFrom
//   car / mixed / fixed all used); the paint really recolours; carPrimary; fitProp on the test cars; render-only (not in the replay fingerprint)
//   node scripts/.propmodels-roof-check.mjs
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';

const BUDGET = 300;
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const M = await load('render/propmodelsroof.js');
  const PM = await load('render/propmodels.js');
  const P = await load('render/propanchors.js');
  const v = new THREE.Vector3();
  const all = M.MORE_ROOF.map(p => ({ slot: 'roof', ...p }));
  check(all.length === 6 && new Set(all.map(p => p.id)).size === 6 && all.every(p => /^roof-/.test(p.id) && p.name && ['box', 'cylinder'].includes(p.shape)), 'six props, distinct ids prefixed roof-, a name and a shape');
  check(all.filter(p => p.shape === 'cylinder').length >= 2 && all.filter(p => p.shape === 'box').length >= 2, 'a mix of shapes (' + all.filter(p => p.shape === 'box').length + ' box, ' + all.filter(p => p.shape === 'cylinder').length + ' cylinder)');
  check(all.every(p => ['car', 'mixed', 'fixed'].includes(p.colourFrom)) && ['car', 'mixed', 'fixed'].every(c => all.some(p => p.colourFrom === c)), 'colourFrom on every prop, all three kinds used (' + all.map(p => p.colourFrom).join(', ') + ')');
  const first = PM.BASE_PROPS.roof.map(p => p.id);
  check(all.every(p => !first.includes(p.id) && PM.propById(p.id)?.build === p.build), 'none duplicates one of the first roof props (' + first.join(', ') + ')');
  check(M.carPrimary({ color: 0x112233, evilColor: 0x445566 }, false) === 0x112233 && M.carPrimary({ color: 0x112233, evilColor: 0x445566 }, true) === 0x445566 && M.carPrimary({ color: 0x112233 }, true) === 0x112233, 'carPrimary: color for Good, evilColor for Evil, color when there is no evilColor');
  const tris = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) { const geo = o.geometry; n += Math.floor((geo.index ? geo.index.count : geo.attributes.position.count) / 3); } }); return n; };
  const counts = [];
  for (const p of all) {
    const paint = PM.propPaint(0xff5500), g = M.buildRoofProp(p.id, paint);
    g.updateMatrixWorld(true);
    const B = P.PROP_BOUNDS.roof, meshes = [];
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
    check(g.userData.prop === 'roof' && g.userData.propId === p.id && meshes.every(m => m.userData.prop === 'roof' && m.userData.propId === p.id), p.id + ': tagged userData.prop = roof, propId, on the group and every mesh');
    const paintOn = meshes.filter(m => m.material === paint).length;
    check((p.colourFrom === 'fixed' ? paintOn === 0 : paintOn > 0) && !paint.userData.shared, p.id + ': colourFrom ' + p.colourFrom + ': the caller\'s paint is on ' + paintOn + ' of ' + meshes.length + ' meshes' + (p.colourFrom === 'fixed' ? ' (none, its own colours)' : ''));
    const other = PM.propPaint(0x0055ff), g2 = M.buildRoofProp(p.id, other);
    check(!meshes.some(m => m.material.userData.shared === false) && (p.colourFrom === 'fixed' || tris(g2) === n), p.id + ': a second paint builds the same prop');
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
        // (only axis-aligned boxes have faces on a plane: a rotated or round part's bounding box is not its surface)
        const flat = (m) => m.geometry.type === 'BoxGeometry' && m.rotation.x === 0 && m.rotation.y === 0 && m.rotation.z === 0;
        if (!flat(meshes[i]) || !flat(meshes[j])) continue;
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
  // placing on the test cars (the moke has no roof: null)
  const cars = ['minibus', 'touringcar', 'sporttruck', 'moke', 'rally'];
  let placed = 0, bad = [];
  for (const id of cars) for (const p of all) {
    const f = P.fitProp(id, 'roof', p.shape, p), s = P.propSlots(id).roof; // (as worn: at most the prop's own maxScale, CHECKLIST 450)
    if (!s.supported) { if (f !== null) bad.push(id + ' unsupported but fitProp gave a transform'); continue; }
    if (!f || !(f.scale > 0) || f.scale > Math.min(1.5, p.maxScale) + 1e-9 || !f.position.every(Number.isFinite) || !Number.isFinite(f.rotationY)) bad.push(id + ' ' + p.id);
    else placed++;
  }
  check(!bad.length && placed === 24, 'fitProp(car, roof, shape, prop) gives a transform (scale 0 to the prop\'s maxScale, at most 1.5, finite position and yaw) for the six on the four roofed test cars, null on the moke (' + placed + ' placed)' + (bad.length ? ': ' + bad.join('; ') : ''));
  const { logicFiles } = await import(ROOT + '/vite.config.js');
  check(![...logicFiles()].some(f => /propmodels|propmodelsroof|propanchors|propcosmetic|propbounds/.test(f)), 'the prop modules are not in the replay fingerprint (vite.config.js logicFiles)');
} finally { await close(); }
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
