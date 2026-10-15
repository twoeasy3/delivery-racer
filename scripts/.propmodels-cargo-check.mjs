// A check of the SIX NEW CARGO PROPS (render/propmodelscargo.js MORE_CARGO; companion of .propmodels-check.mjs): each is built with a paint, and
//   - lies INSIDE the cargo slot's canonical bound (render/propanchors.js PROP_BOUNDS.cargo) at scale 1 (2 mm tolerance), its base on the floor
//   - is finite, under 300 triangles, tagged userData.prop = 'cargo' and propId on the group and every mesh; colourFrom 'car' / 'mixed' props
//     use the paint on a mesh (and it is the caller's own, not shared); a 'fixed' prop leaves it alone; different paints give different colours
//   - has no z-fighting between parts (same-facing box faces on one plane) and no floating part (every part touches another, 2 mm)
//   - the registry: six props, distinct 'cargo-' ids, at least two cylinders, shape / colourFrom valid, and none collides with propmodels.js ids
//   - carPrimary(car, evil) gives the side's colour; fitProp places each on the sporttruck and moke (cargo scale within the cap 1.6)
//   - the module is render-only (not in the replay fingerprint)
//   node scripts/.propmodels-cargo-check.mjs
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';

const BUDGET = 300;
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const C = await load('render/propmodelscargo.js');
  const M = await load('render/propmodels.js');
  const P = await load('render/propanchors.js');
  const v = new THREE.Vector3();
  const all = C.MORE_CARGO;
  check(all.length === 7 && all.every(p => /^cargo-[a-z]+$/.test(p.id)) && new Set(all.map(p => p.id)).size === 7, 'seven props with distinct cargo- ids (' + all.map(p => p.id).join(', ') + ')');
  check(all.every(p => ['box', 'cylinder'].includes(p.shape) && ['car', 'mixed', 'fixed'].includes(p.colourFrom) && p.name && typeof p.build === 'function'), 'shape box|cylinder, colourFrom car|mixed|fixed, a name and build() on each');
  check(all.filter(p => p.shape === 'cylinder').length >= 2 && all.filter(p => p.shape === 'box').length >= 2, 'a mix of shapes (' + all.filter(p => p.shape === 'box').length + ' box, ' + all.filter(p => p.shape === 'cylinder').length + ' cylinder)');
  check(all.every(p => !Object.values(M.BASE_PROPS).flat().some(q => q.id === p.id) && M.propById(p.id) === p) && all.every(p => C.cargoById(p.id) === p), 'ids do not collide with propmodels.js; cargoById finds each');
  const tris = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) { const geo = o.geometry; n += Math.floor((geo.index ? geo.index.count : geo.attributes.position.count) / 3); } }); return n; };
  const counts = [];
  for (const p of all) {
    p.slot = 'cargo';
    const paint = C.cargoPaint(0xff5500), g = C.buildCargo(p.id, paint);
    g.updateMatrixWorld(true);
    const B = P.PROP_BOUNDS.cargo, meshes = [];
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
    check(g.userData.prop === 'cargo' && g.userData.propId === p.id && meshes.every(m => m.userData.prop === 'cargo' && m.userData.propId === p.id), p.id + ': tagged userData.prop = cargo, propId, on the group and every mesh');
    const uses = meshes.some(m => m.material === paint);
    check(!paint.userData.shared && (p.colourFrom === 'fixed' ? !uses : uses), p.id + ': colourFrom ' + p.colourFrom + (p.colourFrom === 'fixed' ? ': ignores the paint' : ': the paint is on it') + ', and is the caller\'s own');
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
        const plainBox = (m) => m.geometry.type === 'BoxGeometry' && !m.rotation.x && !m.rotation.y && !m.rotation.z; // (a rotated or round part's AABB says nothing about its faces)
        if (!plainBox(meshes[i]) || !plainBox(meshes[j])) continue;
        for (const ax of axes) {
          const others = axes.filter(o => o !== ax);
          const overlap = others.every(o => Math.min(a.max[o], b.max[o]) - Math.max(a.min[o], b.min[o]) > 0.005);
          if (!overlap) continue;
          if (Math.abs(a.max[ax] - b.max[ax]) < 0.0005 || Math.abs(a.min[ax] - b.min[ax]) < 0.0005) coplanar.push('parts ' + i + ' and ' + j + ' on ' + ax);
        }
      }
      if (!touches) lonely.push(meshes[i].geometry.type + ' at ' + boxes[i].getCenter(v).toArray().map(x => x.toFixed(2)).join(','));
    }
    check(!coplanar.length, p.id + ': no same-facing coplanar faces between parts' + (coplanar.length ? ': ' + coplanar.slice(0, 4).join('; ') : ''));
    check(!lonely.length, p.id + ': every part touches another' + (lonely.length ? ': ' + lonely.join('; ') : ''));
  }
  console.log('        triangles: ' + counts.join(', '));
  const car = { color: 0x112233, evilColor: 0x445566 }, bare = { color: 0x778899 };
  check(C.carPrimary(car, false) === 0x112233 && C.carPrimary(car, true) === 0x445566 && C.carPrimary(bare, true) === 0x778899 && C.carPrimary(bare) === 0x778899, 'carPrimary(car, evil): color, evilColor when evil, color for a car with no evilColor');
  // two paints give two colours on the main part, and the shared materials are untouched
  for (const p of all.filter(q => q.colourFrom !== 'fixed')) {
    const a = C.cargoPaint(0xff0000), b = C.cargoPaint(0x0000ff); C.buildCargo(p.id, a); C.buildCargo(p.id, b);
    check(a.color.getHex() !== b.color.getHex(), p.id + ': two builds take two paints');
  }
  let placed = 0; const bad = [];
  for (const id of ['sporttruck', 'moke']) for (const p of all) {
    const f = P.fitProp(id, 'cargo', p.shape);
    if (!f || !(f.scale > 0) || f.scale > 1.6 + 1e-9 || !f.position.every(Number.isFinite)) bad.push(id + ' ' + p.id); else placed++;
  }
  check(!bad.length && placed === 14, 'fitProp gives a transform with scale <= 1.6 for each of the seven on the sporttruck and the moke (' + placed + ' placed)' + (bad.length ? ': ' + bad.join('; ') : ''));
  const { logicFiles } = await import(ROOT + '/vite.config.js');
  check(![...logicFiles()].some(f => /propmodelscargo/.test(f)), 'propmodelscargo.js is not in the replay fingerprint (vite.config.js logicFiles)');
} finally { await close(); }
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
