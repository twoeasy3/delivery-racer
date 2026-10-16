// A check of the SECOND SIX EXTRA ROOF PROPS (render/propmodelsroof2.js MORE_ROOF_2): the logic of .propmodels-roof-check.mjs, for these six,
// built as worn (their parts merged by material) and part by part (parts(paint), unmerged):
//   AS WORN: every vertex finite and inside the roof bound (box 1 x 0.5 x 0.8 / cylinder r 0.45 x 0.5, 2 mm), base on the bound's floor, under
//   300 triangles, at most one mesh a material (DRAWS: the draw calls), tagged on the group and every mesh (userData.prop = 'roof', propId),
//   the paint is on it (not for colourFrom 'fixed') and is the caller's own, a second paint builds the same prop;
//   PART BY PART: no same-facing coplanar faces between axis-aligned boxes, no floating part (every part's box within 2 mm of another's);
//   the registry (six, ids 'roof-', distinct from every other roof prop, both shapes, colourFrom car / mixed / fixed all used, maxScale and align,
//   in render/propmodels.js PROPS.roof); fitProp on the test cars; render-only (not in the replay fingerprint)
//   node scripts/.propmodels-roof2-check.mjs
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';

const BUDGET = 300;
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const M = await load('render/propmodelsroof2.js');
  const PM = await load('render/propmodels.js');
  const R1 = await load('render/propmodelsroof.js');
  const P = await load('render/propanchors.js');
  const v = new THREE.Vector3();
  const all = M.MORE_ROOF_2;
  check(all.length === 6 && new Set(all.map(p => p.id)).size === 6 && all.every(p => /^roof-/.test(p.id) && p.name && p.name.length <= 16 && ['box', 'cylinder'].includes(p.shape)), 'six props, distinct ids prefixed roof-, a short name (a chip) and a shape');
  check(all.filter(p => p.shape === 'cylinder').length >= 2 && all.filter(p => p.shape === 'box').length >= 2, 'a mix of shapes (' + all.filter(p => p.shape === 'box').length + ' box, ' + all.filter(p => p.shape === 'cylinder').length + ' cylinder)');
  check(all.every(p => ['car', 'mixed', 'fixed'].includes(p.colourFrom)) && ['car', 'mixed', 'fixed'].every(c => all.some(p => p.colourFrom === c)), 'colourFrom on every prop, all three kinds used (' + all.map(p => p.colourFrom).join(', ') + ')');
  const others = [...PM.BASE_PROPS.roof, ...R1.MORE_ROOF];
  check(all.every(p => !others.some(o => o.id === p.id || o.name === p.name) && PM.propById(p.id)?.build === p.build && PM.propSlotOf(p.id) === 'roof'), 'none duplicates an earlier roof prop\'s id or name (' + others.map(p => p.id).join(', ') + '), and each is in PROPS.roof');
  check(all.every(p => Number.isFinite(p.maxScale) && p.maxScale >= P.MIN_SCALE.roof && ['centre', 'front', 'rear'].includes(p.align)), 'maxScale and align on every prop (' + all.map(p => p.id + ' ' + p.maxScale).join(', ') + ')');
  const tris = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) { const geo = o.geometry; n += Math.floor((geo.index ? geo.index.count : geo.attributes.position.count) / 3); } }); return n; };
  const counts = [];
  for (const p of all) {
    const paint = PM.propPaint(0xff5500), g = PM.buildProp(p.id, paint);
    g.updateMatrixWorld(true);
    const B = P.PROP_BOUNDS.roof, meshes = [];
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    let outside = 0, nan = 0, lowest = Infinity, worst = 0;
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
    const n = tris(g), mats = new Set(meshes.map(m => m.material));
    counts.push(p.id + ' ' + n + ' tris / ' + meshes.length + ' draws');
    check(!nan && !outside, p.id + ': every vertex finite and inside the ' + p.shape + ' bound' + (outside ? ' (' + outside + ' outside, worst by ' + (worst * 1000).toFixed(1) + ' mm)' : ' (' + (-worst * 1000).toFixed(1) + ' mm inside at the closest)'));
    check(Math.abs(lowest + B.box[1] / 2) < 0.003, p.id + ': its base stands on the bound\'s floor (' + lowest.toFixed(3) + ')');
    check(n <= BUDGET, p.id + ': ' + n + ' triangles (budget ' + BUDGET + ')');
    check(mats.size === meshes.length && meshes.length <= 5, p.id + ': merged by material, ' + meshes.length + ' meshes (draw calls), one a material');
    check(g.userData.prop === 'roof' && g.userData.propId === p.id && meshes.every(m => m.userData.prop === 'roof' && m.userData.propId === p.id), p.id + ': tagged userData.prop = roof, propId, on the group and every mesh');
    const paintOn = meshes.filter(m => m.material === paint).length;
    check((p.colourFrom === 'fixed' ? paintOn === 0 : paintOn === 1) && !paint.userData.shared && meshes.every(m => m.material === paint || m.material.userData.shared), p.id + ': colourFrom ' + p.colourFrom + ': the caller\'s paint on ' + paintOn + ' mesh, every other material shared');
    check(tris(PM.buildProp(p.id, PM.propPaint(0x0055ff))) === n, p.id + ': a second paint builds the same prop');
    // part by part: z-fighting and floating, by the parts' boxes (only axis-aligned boxes have faces on a plane)
    const parts = p.parts(PM.propPaint(0xff5500)); parts.updateMatrixWorld(true);
    const pm = parts.children.filter(o => o.isMesh), boxes = pm.map(m => new THREE.Box3().setFromObject(m, true));
    const flat = (m) => m.geometry.type === 'BoxGeometry' && m.rotation.x === 0 && m.rotation.y === 0 && m.rotation.z === 0;
    const coplanar = [], lonely = [];
    check(tris(parts) === n, p.id + ': the parts hold the same triangles as the merged prop (' + pm.length + ' parts)');
    for (let i = 0; i < boxes.length; i++) {
      let touches = boxes.length === 1;
      for (let j = 0; j < boxes.length; j++) {
        if (i === j) continue;
        const a = boxes[i], b = boxes[j];
        if (a.clone().expandByScalar(0.002).intersectsBox(b)) touches = true;
        if (j < i || !flat(pm[i]) || !flat(pm[j])) continue;
        for (const ax of ['x', 'y', 'z']) {
          const rest = ['x', 'y', 'z'].filter(o => o !== ax);
          if (!rest.every(o => Math.min(a.max[o], b.max[o]) - Math.max(a.min[o], b.min[o]) > 0.005)) continue;
          if (Math.abs(a.max[ax] - b.max[ax]) < 0.0005 || Math.abs(a.min[ax] - b.min[ax]) < 0.0005) coplanar.push('part ' + i + '/' + j + ' on ' + ax);
        }
      }
      if (!touches) lonely.push(pm[i].geometry.type + ' at ' + boxes[i].getCenter(v).toArray().map(x => x.toFixed(2)).join(','));
    }
    check(!coplanar.length, p.id + ': no same-facing coplanar faces between parts' + (coplanar.length ? ': ' + coplanar.slice(0, 4).join('; ') : ''));
    check(!lonely.length, p.id + ': every part touches another' + (lonely.length ? ': ' + lonely.join('; ') : ''));
  }
  console.log('        ' + counts.join(', '));
  // placing on the test cars (the moke has no roof: null)
  const cars = ['minibus', 'touringcar', 'sporttruck', 'moke', 'rally'];
  let placed = 0;
  const bad = [];
  for (const id of cars) for (const p of all) {
    const f = P.fitProp(id, 'roof', p.shape, p), s = P.propSlots(id).roof;
    if (!s.supported) { if (f !== null) bad.push(id + ' unsupported but fitProp gave a transform'); continue; }
    if (!f || !(f.scale > 0) || f.scale > p.maxScale + 1e-9 || !f.position.every(Number.isFinite) || !Number.isFinite(f.rotationY)) bad.push(id + ' ' + p.id);
    else placed++;
  }
  check(!bad.length && placed === 24, 'fitProp(car, roof, shape, prop) gives a transform (scale 0 to the prop\'s maxScale, finite position and yaw) for the six on the four roofed test cars, null on the moke (' + placed + ' placed)' + (bad.length ? ': ' + bad.join('; ') : ''));
  const { logicFiles } = await import(ROOT + '/vite.config.js');
  check(![...logicFiles()].some(f => /propmodels|propanchors|propcosmetic|propbounds/.test(f)), 'the prop modules are not in the replay fingerprint (vite.config.js logicFiles)');
} finally { await close(); }
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
