// A REPORT (exit 0 always; not a test): does each car's glass follow the body's own side profile?
//   node scripts/.glass-contour-check.mjs                 every idea car
//   node scripts/.glass-contour-check.mjs touringcar ...  those ids (idea cars; a garage car whose model is in render/models.js too)
// The rule (the owner, 14-Oct): a side window's top, A-pillar and C-pillar edges run PARALLEL to the body's roofline and pillars at a
// fixed inset (no domes, no free-standing quads); the windscreen's top edge is as high as the side window's top at the A-pillar corner, and
// the rear glass's as high as the side window's at the C-pillar; the pillar (screen side edge to window front edge, in the side view) keeps one width top to foot.
// Method: the body's contour is its centre-line top silhouette (a ray down at x = 0 every 1 cm over the paint mesh, `userData.body`). Each
// glass mesh (the dark MeshLambert 0x1c2330) is split into connected pieces. A SIDE window (a piece whose x extent is small, off the centre):
// its boundary is sampled every 1 cm, the belt edge and any vertical cut (a B-pillar) skipped, and the distance of each sample to the contour
// measured; a constant inset gives a small range (FAIL when max - min > 1.5 cm over the top, A and C edges). A SCREEN (a piece spanning the car):
// its top edge's height against the side window's at the pillar (FAIL > 1.5 cm), and the pillar width (the distance of the screen's side top corner and of its foot corner from the line of the
// window's A or C edge in the side view: FAIL if they differ by more than 1.5 cm). Cars with no glass of that colour, or no body mesh, are listed as skipped. Helpers that build the glass this way:
// render/ideaModelsDkit.js cabinGlass / glassFromProfile / screenGlassFromProfile.
import { startModels } from './modelpatch-load.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = await import(join(ROOT, 'node_modules/three/build/three.module.js'));
const TOL = 0.015;
const { load, close } = await startModels();
const failures = [];
try {
  const { IDEA_CARS } = await load('ideas.js');
  const { makeIdeaModel } = await load('render/ideaModels.js');
  const want = process.argv.slice(2);
  const cars = (want.length ? IDEA_CARS.filter(c => want.includes(c.id)) : IDEA_CARS);
  const rows = [];
  for (const car of cars) {
    const model = makeIdeaModel(car);
    if (!model) { rows.push([car.id, 'no model']); continue; }
    model.userData.animate?.(0);
    model.updateMatrixWorld(true);
    const body = model.userData.body;
    const glass = [];
    model.traverse(o => { if (o.isMesh && [].concat(o.material)[0].color?.getHex() === 0x1c2330 && [].concat(o.material)[0].side === THREE.DoubleSide) glass.push(o); });
    if (!body || !glass.length) { rows.push([car.id, 'skipped: ' + (!body ? 'no body mesh' : 'no glass')]); continue; }
    // the contour: the body's top at x = 0, every 1 cm
    const box = new THREE.Box3().setFromObject(body, true), rc = new THREE.Raycaster(), contour = [];
    for (let z = box.min.z; z <= box.max.z; z += 0.01) {
      rc.set(new THREE.Vector3(0, box.max.y + 1, z), new THREE.Vector3(0, -1, 0));
      const hit = rc.intersectObject(body, true)[0];
      if (hit) contour.push([z, hit.point.y]);
    }
    const dist = (z, y) => { let d = Infinity; for (const [cz, cy] of contour) d = Math.min(d, Math.hypot(cz - z, cy - y)); return d; };
    // connected pieces of every glass mesh, in model space
    const pieces = [];
    for (const mesh of glass) {
      const pos = mesh.geometry.attributes.position, v = new THREE.Vector3(), key = (i) => { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); return v.toArray().map(c => Math.round(c * 1000)).join(','); };
      const idx = mesh.geometry.index ? [...mesh.geometry.index.array] : [...Array(pos.count).keys()];
      const parent = new Map(), find = (a) => { while (parent.get(a) !== a) { parent.set(a, parent.get(parent.get(a))); a = parent.get(a); } return a; };
      const tris = [];
      for (let t = 0; t < idx.length; t += 3) {
        const ks = [0, 1, 2].map(k => key(idx[t + k]));
        ks.forEach(k => { if (!parent.has(k)) parent.set(k, k); });
        parent.set(find(ks[1]), find(ks[0])); parent.set(find(ks[2]), find(ks[0]));
        tris.push([0, 1, 2].map(k => { const p = new THREE.Vector3().fromBufferAttribute(pos, idx[t + k]).applyMatrix4(mesh.matrixWorld); return [p.x, p.y, p.z, ks[k]]; }));
      }
      const byRoot = new Map();
      for (const tri of tris) { const r = find(tri[0][3]); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(tri); }
      for (const t of byRoot.values()) pieces.push(t);
    }
    const info = pieces.map(tris => {
      const pts = [...new Map(tris.flat().map(p => [p[3], p])).values()], xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), zs = pts.map(p => p[2]);
      const b = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), z0: Math.min(...zs), z1: Math.max(...zs) };
      return { tris, pts, ...b, side: (b.x1 - b.x0) < 0.12 && Math.abs((b.x0 + b.x1) / 2) > 0.3 };
    });
    // 1) the side windows, +x side only: boundary samples against the contour
    const notes = [], fails = [];
    const sides = info.filter(p => p.side && p.x0 > 0).sort((a, b) => b.z1 - a.z1);
    sides.forEach((p, wi) => {
      const edges = new Map();
      for (const tri of p.tris) for (let k = 0; k < 3; k++) {
        const a = tri[k], b = tri[(k + 1) % 3], id = [a[3], b[3]].sort().join('|');
        if (!edges.has(id)) edges.set(id, { a, b, n: 0 });
        edges.get(id).n++;
      }
      const ds = [];
      for (const e of edges.values()) {
        if (e.n !== 1) continue;
        const dz = e.b[2] - e.a[2], dy = e.b[1] - e.a[1], len = Math.hypot(dz, dy);
        if (len < 1e-6 || Math.abs(dz) / len < 0.05) continue; // a vertical cut (a B-pillar)
        for (let t = 0; t <= len; t += 0.01) {
          const z = e.a[2] + dz * t / len, y = e.a[1] + dy * t / len;
          if (y < p.y0 + 0.03) continue; // the belt edge
          const d = dist(z, y);
          if (d < 0.25) ds.push(d);
        }
      }
      if (!ds.length) { notes.push('window ' + (wi + 1) + ': no edge near the contour'); fails.push('window ' + (wi + 1) + ' is not inset from the profile'); return; }
      const range = Math.max(...ds) - Math.min(...ds), mean = ds.reduce((s, d) => s + d, 0) / ds.length;
      notes.push(`window ${wi + 1}: inset ${(mean * 100).toFixed(1)} cm, range ${(range * 100).toFixed(1)} cm`);
      if (range > TOL) fails.push(`window ${wi + 1} follows the contour to only ${(range * 100).toFixed(1)} cm (> ${TOL * 100})`);
    });
    // 2) the screens: pieces spanning the car
    const screens = info.filter(p => !p.side && p.x1 - p.x0 > 0.5);
    if (process.env.DEBUG) info.forEach(p => console.log('piece', p.side ? 'side' : 'screen', [p.x0, p.x1, p.y0, p.y1, p.z0, p.z1].map(v => v.toFixed(2)).join(' ')));
    const front = screens.filter(p => (p.z0 + p.z1) / 2 > 0 || p.z0 > -0.3).sort((a, b) => b.z1 - a.z1)[0];
    const rear = screens.filter(p => p !== front).sort((a, b) => a.z0 - b.z0)[0];
    const frontWin = sides[0], rearWin = sides[sides.length - 1];
    const near = (pts, pick) => pts.reduce((best, p) => (pick(p) > pick(best) ? p : best));
    const name_ = (f) => (f ? 'A' : 'C');
    const pillar = (scr, win, front_) => {
      if (!scr || !win) return null;
      const s = front_ ? 1 : -1;
      // the window's two corner vertices on its A (or C) edge, and the screen's side corners at +x: top and foot
      const wv = win.pts.slice().sort((a, b) => s * (b[2] - a[2])).slice(0, 2).sort((a, b) => b[1] - a[1]);
      const wTop = wv[0], wFoot = wv[wv.length - 1];
      const sv = scr.pts.filter(p => p[0] > 0), sTop = near(sv, p => p[1]), sFoot = near(sv, p => -p[1]);
      if (process.env.DEBUG) console.log(name_(front_), 'wTop', wTop.slice(0, 3).map(v => v.toFixed(3)).join(' '), 'wFoot', wFoot.slice(0, 3).map(v => v.toFixed(3)).join(' '), 'sTop', sTop.slice(0, 3).map(v => v.toFixed(3)).join(' '), 'sFoot', sFoot.slice(0, 3).map(v => v.toFixed(3)).join(' '));
      const topDy = Math.abs(sTop[1] - wTop[1]);
      // the pillar in the side view: how far the screen's top and foot corners are from the line of the window's A (or C) edge: equal = parallel
      const ez = wTop[2] - wFoot[2], ey = wTop[1] - wFoot[1], el = Math.hypot(ez, ey);
      const d = (p) => Math.abs(((p[2] - wFoot[2]) * ey - (p[1] - wFoot[1]) * ez) / el);
      return { topDy, wTop: d(sTop), wFoot: d(sFoot) };
    };
    for (const [name, scr, win, f] of [['A-pillar', front, frontWin, true], ['C-pillar', rear, rearWin, false]]) {
      const r = pillar(scr, win, f);
      if (!r) { notes.push(name + ': no ' + (scr ? 'side window' : 'screen')); continue; }
      notes.push(`${name}: screen top vs window top ${(r.topDy * 100).toFixed(1)} cm apart in height; pillar (screen edge to window edge, side view) ${(r.wTop * 100).toFixed(1)} cm at the top, ${(r.wFoot * 100).toFixed(1)} cm at the foot`);
      if (r.topDy > TOL) fails.push(`${name}: the screen's top is ${(r.topDy * 100).toFixed(1)} cm from the window's top (> ${TOL * 100})`);
      if (Math.abs(r.wTop - r.wFoot) > TOL) fails.push(`${name}: pillar width ${(r.wTop * 100).toFixed(1)} cm at the top, ${(r.wFoot * 100).toFixed(1)} cm at the foot`);
    }
    rows.push([car.id, fails.length ? 'FAIL' : 'ok', ...notes, ...fails.map(f => '  ! ' + f)]);
    if (fails.length) failures.push(car.id);
  }
  console.log('glass contour check (a report; exit 0): ' + cars.length + ' cars, tolerance ' + TOL * 100 + ' cm');
  for (const [id, status, ...lines] of rows) { console.log(`${status === 'ok' ? '  ok    ' : status === 'FAIL' ? '  FAIL  ' : '  skip  '}${id}${status.startsWith('skipped') || status === 'no model' ? ' (' + status + ')' : ''}`); lines.forEach(l => console.log('          ' + l)); }
  console.log(failures.length ? 'FAIL: ' + failures.join(', ') : 'all checked cars pass');
} finally {
  await close();
}
