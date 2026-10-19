// A check of the DECAL cosmetic over the WHOLE ROSTER (CHECKLIST 525): every car with a zone row x every design, built cold (the probe and
// geometry caches forgotten), as the Cosmetics screen builds it (makeShowCar with ?decal=<id>: render/decalcosmetic.js -> render/flankdecal.js):
//   1. no (car, design) throws, and none shows NOTHING (a mesh with a quad) unless it is on NOTHING_OK below, each with its reason
//   2. no (car, design) takes longer than BUDGET_MS of CPU (the best of three tries, so one garbage collection on a loaded machine does not fail it)
//      or casts more than BUDGET_RAYS rays (the same on every machine: the cost on a low-end device is the rays times the triangles a ray meets)
//   3. the ray caster (render/flankdecal.js flankHit: a 2D grid over the side view) answers as three's Raycaster does, on four cars
//   4. the paint probe is kept per car AND extent: a model measured longer (a rack, a wing) does not read the rows of the shorter one
//   node scripts/.decal-sweep-check.mjs [--out file.json] [--cars a,b] [--report]   (headless, no browser, about 40 s; --report: the slowest 12 too)
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';
const arg = (n) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
const BUDGET_MS = 150, BUDGET_RAYS = 45000, TRIES = 3;
// (car id/design id -> why no decal is acceptable: none today)
const NOTHING_OK = {};
const { load, close } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const C = await load('cars.js'), { IDEA_CARS } = await load('ideas.js'), { makeShowCar } = await load('render/showcar.js');
  const DC = await load('render/decalcosmetic.js'), FD = await load('render/flankdecal.js');
  const all = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...C.EARNED_CARS, ...Object.values(C.SECRET_CARS), ...IDEA_CARS];
  const only = arg('cars')?.split(',');
  const cars = all.filter(c => DC.decalSupported(c) && (!only || only.includes(c.id)));
  const rows = [];
  const build = (c, d) => {
    DC.forgetDecalGeometry(); DC.forgetPaintRuns();
    globalThis.location = { search: '?decal=' + d.id };
    let m, err = null;
    try { m = makeShowCar(c); } catch (e) { err = String(e.message || e); }
    const plan = m ? DC.decalPlan(m) : null, st = plan?.stats;
    return { car: c.id, model: DC.decalKey(c), design: d.id, kind: d.kind, ms: Math.round(st?.ms ?? 0), tris: st ? st.triangles : 0, rays: st ? st.rays : 0,
      quads: st ? st.pieces.reduce((a, p) => a + p.quads, 0) : 0, shown: !!plan?.mesh, err: err || plan?.error || null, len: st ? +st.length.toFixed(2) : 0, longest: st ? +Math.max(0, ...st.rects.map(r => r.z1 - r.z0)).toFixed(2) : 0 };
  };
  for (const c of cars) for (const d of DC.DESIGNS) {
    let r = build(c, d);
    for (let k = 1; k < TRIES && r.ms > BUDGET_MS && !r.err; k++) { const again = build(c, d); if (again.ms < r.ms) r = { ...again }; } // (a slow one tried again: the best time counts)
    rows.push(r);
  }
  if (arg('out')) writeFileSync(arg('out'), JSON.stringify(rows));
  if (process.argv.includes('--report')) { console.log('slowest:'); for (const r of [...rows].sort((a, b) => b.ms - a.ms).slice(0, 12)) console.log('  ' + r.car + ' / ' + r.design + ': ' + r.ms + ' ms, ' + r.rays + ' rays, ' + r.tris + ' tris'); }
  // ---- 1. nothing, throws ----
  const threw = rows.filter(r => r.err), none = rows.filter(r => !r.err && (!r.shown || !r.quads) && !NOTHING_OK[r.car + '/' + r.design]);
  check(rows.length === cars.length * DC.DESIGNS.length && cars.length >= (only ? 1 : 150), cars.length + ' cars with a zone row x ' + DC.DESIGNS.length + ' designs = ' + rows.length + ' builds');
  check(!threw.length, 'no build throws' + threw.slice(0, 8).map(r => ' [' + r.car + '/' + r.design + ': ' + r.err + ']').join(''));
  check(!none.length, 'no (car, design) shows nothing (allowlist: ' + Object.keys(NOTHING_OK).length + ')' + none.slice(0, 12).map(r => ' [' + r.car + '/' + r.design + ']').join(''));
  for (const k of Object.keys(NOTHING_OK)) check(rows.some(r => r.car + '/' + r.design === k && !r.shown), 'allowlisted ' + k + ' still shows nothing (' + NOTHING_OK[k] + '): else take it off the list');
  // ---- 2. the budget ----
  const slow = rows.filter(r => r.ms > BUDGET_MS), many = rows.filter(r => r.rays > BUDGET_RAYS);
  check(!slow.length, 'no build over ' + BUDGET_MS + ' ms CPU (slowest ' + Math.max(0, ...rows.map(r => r.ms)) + ' ms)' + slow.slice(0, 8).map(r => ' [' + r.car + '/' + r.design + ' ' + r.ms + ' ms]').join(''));
  check(!many.length, 'no build over ' + BUDGET_RAYS + ' rays (most ' + Math.max(0, ...rows.map(r => r.rays)) + ')' + many.slice(0, 8).map(r => ' [' + r.car + '/' + r.design + ' ' + r.rays + ']').join(''));
  // ---- 3. the grid caster is three's ----
  if (!only) {
    globalThis.location = { search: '?decal=none' };
    const NM = new THREE.Matrix3();
    const old = (view, s, y, z, paintOnly) => {
      const { model, inv, ray } = view, reach = Math.max(Math.abs(view.box.min.x), Math.abs(view.box.max.x)) + 2;
      ray.set(new THREE.Vector3(s * reach, y, z).applyMatrix4(model.matrixWorld), new THREE.Vector3(-s, 0, 0).transformDirection(model.matrixWorld)); ray.far = reach * 2;
      const hit = ray.intersectObjects(paintOnly ? view.paintMeshes : view.meshes, false)[0];
      if (!hit || !hit.face) return { kind: 'air' };
      const point = hit.point.clone().applyMatrix4(inv), normal = hit.face.normal.clone().applyMatrix3(NM.getNormalMatrix(hit.object.matrixWorld)).transformDirection(inv).normalize();
      let kind = view.kinds.get(hit.object); if (kind === 'paint' && normal.x * s < FD.FLANK.FACING) kind = 'curve';
      return { kind, point, normal };
    };
    let n = 0, bad = 0;
    for (const id of ['postvan', 'hotdog', 'bus', 'armouredlimo']) {
      const v = FD.flankView(makeShowCar(all.find(c => c.id === id)));
      for (const s of [-1, 1]) for (let z = v.box.min.z; z <= v.box.max.z; z += 0.0437) for (let y = 0.003; y <= v.box.max.y; y += 0.0231) for (const po of [false, true]) {
        const a = old(v, s, y, z, po), b = FD.flankHit(v, s, y, z, po); n++;
        if (!(a.kind === b.kind && (a.kind === 'air' || (a.point.distanceTo(b.point) < 1e-4 && a.normal.distanceTo(b.normal) < 1e-4)))) bad++;
      }
    }
    check(bad <= n * 1e-3, 'the grid caster answers as the Raycaster on 4 cars: ' + bad + ' of ' + n + ' rays differ (a tie of coplanar faces or an edge: at most 1 in 1,000)');
    // ---- 4. the paint probe is per extent ----
    const c = all.find(x => x.id === 'armouredlimo'), run = (extra) => {
      const m = makeShowCar(c);
      if (extra) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial()); b.position.set(0, 1.5, extra); m.add(b); }
      delete m.userData.decalPlan; DC.forgetDecalGeometry();
      DC.dressDecal(m, c, { look: { id: 'stripes' } });
      return DC.decalPlan(m).stats.rects.map(r => r.z0.toFixed(2) + '..' + r.z1.toFixed(2)).join(' ');
    };
    DC.forgetPaintRuns();
    const plain = run(0), longer = run(-3.6), again = run(0);
    check(plain === again && plain !== longer, 'the Armoured Limo\'s band is the same before and after a model measured longer has used the probe (' + plain.split(' ')[0] + ' / ' + longer.split(' ')[0] + ' / ' + again.split(' ')[0] + ')');
  }
  console.log(failures ? failures + ' FAILED' : 'all ok');
} finally { await close(); }
process.exit(failures ? 1 : 0);
