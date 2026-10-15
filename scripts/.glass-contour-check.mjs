// A REPORT (exit 0 always; not a test): does each car's glass follow the body's own side profile?
//   node scripts/.glass-contour-check.mjs                 every idea car
//   node scripts/.glass-contour-check.mjs touringcar ...  those ids (idea cars; a garage car whose model is in render/models.js too)
// The rule (the owner, 14-Oct): a side window's top, A-pillar and C-pillar edges run PARALLEL to the body's roofline and pillars at a
// fixed inset (no domes, no free-standing quads); the windscreen's top edge is as high as the side window's top at the A-pillar corner, and
// the rear glass's as high as the side window's at the C-pillar; the pillar (screen side edge to window front edge, in the side view) keeps one width top to foot.
// Method: the body's contour is its centre-line top silhouette (a ray down at x = 0 every 1 cm over the paint mesh, `userData.body`). Each
// glass mesh (the dark MeshLambert 0x1c2330) is split into connected pieces. A SIDE window (a piece whose x extent is small, off the centre):
// its boundary is sampled every 1 cm, the belt edge and any vertical cut (a B-pillar) skipped, and the distance of each sample to the contour
// measured along the edge's own normal, clear of its corners; a constant inset gives a small range (FAIL when max - min > 1.5 cm on any edge: the top, A and C edges each keep their own inset, parallel to the contour). A SCREEN (a piece spanning the car):
// its top edge's height against the side window's at the pillar (FAIL > 1.5 cm), the pillar width (the distance of the screen's side top corner and of its foot corner from the line of the
// window's A or C edge in the side view: FAIL if they differ by more than 1.5 cm), its top no more than 7 cm below the roof beside the pillar (a lowered screen leaves a strip), and its top
// edge proud of the body (a ray in along the screen's normal at its top edge must hit glass first: a top tucked under the body face is hidden, with a strip of body over the visible glass).
// Cars with no glass of that colour, or no body mesh, are listed as skipped. Helpers that build the glass this way:
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
  const { dropFlat } = await load('render/ideaModelsDkit.js');
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
    // A ROUNDED BODY WITH SHARP WINDOWS (the owner, 15-Oct; a car says so with userData.glassVirtual = { chain, grow }): the windows are judged against the
    // body's VIRTUAL outline (the cabin chain's corners where the tangents of each rounding meet, grown by the bevel to the silhouette), each rounding
    // counting as ONE corner; and every window corner must lie inside the REAL rounded silhouette (>= 4.5 cm). Every other car is judged exactly as before.
    const gv = model.userData.glassVirtual;
    let wcontour = contour;
    if (gv) {
      const c = gv.chain, off = c.slice(0, -1).map((q, i) => { const dz = c[i + 1][0] - q[0], dy = c[i + 1][1] - q[1], l = Math.hypot(dz, dy); return { at: [q[0] + dy / l * gv.grow, q[1] - dz / l * gv.grow], dir: [dz, dy] }; });
      const pts = [off[0].at];
      for (let i = 1; i < off.length; i++) { const a = off[i - 1], b = off[i], t = ((b.at[0] - a.at[0]) * b.dir[1] - (b.at[1] - a.at[1]) * b.dir[0]) / (a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0]); pts.push([a.at[0] + a.dir[0] * t, a.at[1] + a.dir[1] * t]); }
      const lastOff = off[off.length - 1]; pts.push([lastOff.at[0] + lastOff.dir[0], lastOff.at[1] + lastOff.dir[1]]);
      wcontour = [];
      for (let i = 0; i + 1 < pts.length; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); for (let t = 0; t < l; t += 0.01) wcontour.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t / l, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t / l]); }
      wcontour.push(pts[pts.length - 1]);
    }
    const insideReal = (z, y) => { // distance of a point inside the real silhouette (negative: outside), from the body's top contour
      let best = Infinity, yAt = -Infinity;
      for (let i = 1; i < contour.length; i++) {
        const [az, ay] = contour[i - 1], [bz, by] = contour[i], ez = bz - az, ey = by - ay, l2 = ez * ez + ey * ey, t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((z - az) * ez + (y - ay) * ey) / l2));
        best = Math.min(best, Math.hypot(z - az - ez * t, y - ay - ey * t));
        if ((az - z) * (bz - z) <= 0 && bz !== az) yAt = Math.max(yAt, ay + ey * (z - az) / ez);
      }
      return (y <= yAt + 1e-9 ? 1 : -1) * best;
    };
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
      return { tris, pts, ...b, side: (b.x1 - b.x0) < 0.2 && Math.abs((b.x0 + b.x1) / 2) > 0.3 }; // (a side window on a tapered flank leans in up to 0.2 over its height)
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
      // each boundary edge (the belt edge and vertical cuts skipped; edges shorter than 12 cm, the roof's curve pieces, too): its inset from the
      // contour measured ALONG ITS OWN NORMAL every 1 cm, clear of its ends (5 cm: the corners are mitres between two insets), so an edge parallel to
      // the contour has one inset all along (its range within TOL); edges by kind (top; A: rising to the front; C: rising to the rear)
      const cz = p.pts.reduce((s, q) => s + q[2], 0) / p.pts.length, cy = p.pts.reduce((s, q) => s + q[1], 0) / p.pts.length;
      const cross = (z, y, nz, ny) => { // the contour's crossing of the ray (z, y) + t (nz, ny): the smallest t > 0 within 25 cm
        let best = Infinity;
        for (let i = 1; i < wcontour.length; i++) {
          const [az, ay] = wcontour[i - 1], [bz, by] = wcontour[i], ez = bz - az, ey = by - ay, den = nz * ey - ny * ez;
          if (Math.abs(den) < 1e-9) continue;
          const t = ((az - z) * ey - (ay - y) * ez) / den, u = ((az - z) * ny - (ay - y) * nz) / den;
          if (t > 0 && t < best && u >= -1e-9 && u <= 1 + 1e-9) best = t;
        }
        return best < 0.25 ? best : null;
      };
      const found = [];
      for (const e of edges.values()) {
        if (e.n !== 1) continue;
        const dz = e.b[2] - e.a[2], dy = e.b[1] - e.a[1], len = Math.hypot(dz, dy);
        if (len < 0.12 || Math.abs(dz) / len < 0.05) continue; // a short piece; a vertical cut (a B-pillar)
        if (Math.max(e.a[1], e.b[1]) < p.y0 + 0.03) continue; // the belt edge (both ends at the belt)
        let nz = -dy / len, ny = dz / len; // a normal, turned outward (away from the window's middle)
        if ((e.a[2] - cz) * nz + (e.a[1] - cy) * ny < 0) { nz = -nz; ny = -ny; }
        const ts = [];
        for (let t = 0.05; t <= len - 0.05; t += 0.01) { const d = cross(e.a[2] + dz * t / len, e.a[1] + dy * t / len, nz, ny); if (d !== null) ts.push(d); }
        const kind = Math.abs(dy) < 0.25 * len ? 'top' : dz * dy < 0 ? 'A' : 'C';
        if (!ts.length && gv?.freeEdge) { notes.push(`window ${wi + 1}: its ${kind} edge is a deliberate free-standing line (userData.glassVirtual.freeEdge), not the contour`); continue; }
        if (!ts.length) { fails.push(`window ${wi + 1}: its ${kind} edge finds no contour within 25 cm`); continue; }
        const range = Math.max(...ts) - Math.min(...ts), mean = ts.reduce((s, d) => s + d, 0) / ts.length;
        found.push(`${kind} ${(mean * 100).toFixed(1)}`);
        // (a sharp window's top corners are pulled in along their pillars to clear the rounded body, so its top edge may sink a little toward each end: up to 5 cm)
        const tol = gv && kind === 'top' ? 0.05 : TOL;
        if (range > tol) fails.push(`window ${wi + 1}: its ${kind} edge follows the contour to only ${(range * 100).toFixed(1)} cm (> ${tol * 100})`);
      }
      if (!found.length) { notes.push('window ' + (wi + 1) + ': no edge near the contour'); fails.push('window ' + (wi + 1) + ' is not inset from the profile'); return; }
      notes.push(`window ${wi + 1}: inset from the contour (cm, by edge): ${found.join(', ')}`);
      // its EDGE COUNT (the owner, 14-Oct: a window has the corners the body's outline has there, no more): the boundary followed round, points on a
      // straight run (within 4 mm of the line between their neighbours) dropped; expected 4 (belt, A or front cut, top, C or rear cut) plus the
      // body's own corners along the window's top (the contour, flattened to 1 cm, turning more than 5 degrees between the top corners)
      const loop = [], left = new Map([...edges.values()].filter(e => e.n === 1).map(e => [e.a[3] + '|' + e.b[3], e]));
      let cur = left.values().next().value;
      while (cur) {
        left.delete(cur.a[3] + '|' + cur.b[3]);
        loop.push([cur.a[2], cur.a[1]]);
        const next = [...left.values()].find(e => e.a[3] === cur.b[3] || e.b[3] === cur.b[3]);
        if (next && next.b[3] === cur.b[3]) { const t = next.a; next.a = next.b; next.b = t; }
        cur = next;
      }
      const corners = dropFlat(loop, 0.004, true).length;
      const topPts = loop.filter(q => q[1] > p.y1 - 0.05), zA = Math.max(...topPts.map(q => q[0])), zC = Math.min(...topPts.map(q => q[0]));
      const flat = dropFlat(wcontour.filter(c => c[0] >= zC - 0.02 && c[0] <= zA + 0.02), 0.01, false);
      let own = 0;
      for (let i = 1; i + 1 < flat.length; i++) {
        const [a, q, b] = [flat[i - 1], flat[i], flat[i + 1]], turn = Math.abs(Math.atan2(b[1] - q[1], b[0] - q[0]) - Math.atan2(q[1] - a[1], q[0] - a[0]));
        if (turn > 5 * Math.PI / 180 && q[0] > zC + 0.03 && q[0] < zA - 0.03) own++;
      }
      if (process.env.DEBUG) console.log('window', wi + 1, 'top span', zC.toFixed(3), zA.toFixed(3), 'flat contour', flat.map(c => c.map(v => v.toFixed(3)).join(',')).join(' '));
      notes.push(`window ${wi + 1}: ${corners} edges (expected ${4 + own}: 4 + ${own} of the body's own corners along its top)`);
      if (corners > 4 + own) fails.push(`window ${wi + 1} has ${corners} edges, the body's outline gives it ${4 + own}`);
      if (gv) {
        const depths = dropFlat(loop, 0.004, true).filter(q => q[1] > p.y0 + 0.05).map(q => insideReal(q[0], q[1]));
        const deep = Math.min(...depths);
        notes.push(`window ${wi + 1}: its corners above the belt lie ${(deep * 100).toFixed(1)} cm inside the real rounded silhouette at the least (needs >= 4.5)`);
        if (deep < 0.045) fails.push(`window ${wi + 1}: a corner is only ${(deep * 100).toFixed(1)} cm inside the real silhouette (< 4.5): it pokes through the rounded body`);
      }
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
      // the roof beside the pillar: the contour's height within 10 cm of the window's top corner (not the screen's face, which a raked screen's top sits on)
      const roofGap = Math.max(...contour.filter(c => Math.abs(c[0] - wTop[2]) <= 0.1).map(c => c[1])) - sTop[1];
      // the screen's top edge must stand PROUD of the body: a ray in along the screen's face normal at the middle of its top edge hits glass first
      const top2 = scr.pts.filter(p => Math.abs(p[1] - sTop[1]) < 0.005), mid = top2.reduce((s, p) => [s[0] + p[0] / top2.length, s[1] + p[1] / top2.length, s[2] + p[2] / top2.length], [0, 0, 0]);
      const tri = scr.tris[0], e1 = new THREE.Vector3(tri[1][0] - tri[0][0], tri[1][1] - tri[0][1], tri[1][2] - tri[0][2]), e2 = new THREE.Vector3(tri[2][0] - tri[0][0], tri[2][1] - tri[0][1], tri[2][2] - tri[0][2]);
      const nrm = e1.cross(e2).normalize();
      if (nrm.z * (front_ ? 1 : -1) < 0) nrm.negate(); // (outward: forward for the windscreen, rearward for the rear glass)
      const start = new THREE.Vector3(mid[0], mid[1] - 0.01, mid[2]).addScaledVector(nrm, 1); // (1 cm below the edge, so the ray meets the face, not the edge)
      rc.set(start, nrm.clone().negate());
      const hit = rc.intersectObject(model, true).find(h => h.object.visible);
      const hidden = !hit || [].concat(hit.object.material)[0].color?.getHex() !== 0x1c2330;
      return { topDy, wTop: d(sTop), wFoot: d(sFoot), roofGap, hidden };
    };
    for (const [name, scr, win, f] of [['A-pillar', front, frontWin, true], ['C-pillar', rear, rearWin, false]]) {
      const r = pillar(scr, win, f);
      if (!r) { notes.push(name + ': no ' + (scr ? 'side window' : 'screen')); continue; }
      notes.push(`${name}: screen top vs window top ${(r.topDy * 100).toFixed(1)} cm apart in height; pillar (screen edge to window edge, side view) ${(r.wTop * 100).toFixed(1)} cm at the top, ${(r.wFoot * 100).toFixed(1)} cm at the foot`);
      if (r.topDy > TOL) fails.push(`${name}: the screen's top is ${(r.topDy * 100).toFixed(1)} cm from the window's top (> ${TOL * 100})`);
      notes.push(`${name}: screen top ${(r.roofGap * 100).toFixed(1)} cm below the roof height beside it`);
      if (r.roofGap > (gv ? 0.2 : 0.07)) fails.push(`${name}: the screen's top is ${(r.roofGap * 100).toFixed(1)} cm below the roof line (> 7): a lowered screen leaves a strip`);
      if (r.hidden) fails.push(`${name}: the screen's top edge is under the body (the glass is not proud of the body face there: its visible top is lower, with a strip of body over it)`);
      if (Math.abs(r.wTop - r.wFoot) > TOL && !(gv?.freeEdge && !f)) fails.push(`${name}: pillar width ${(r.wTop * 100).toFixed(1)} cm at the top, ${(r.wFoot * 100).toFixed(1)} cm at the foot`);
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
