// ---- ONE WINDOW PANE, MOVED ON ITS OWN (the owner, 17-Oct: "The model editor still doesn't let me change the angle or placement of a
// single window, there are some cars with floating windscreens that I can't fix"; CHECKLIST 462). A window part is often ONE mesh with
// several panes in it (cabinGlass's merged glass, a hand-built car's glass merged by material): a pane is a run of that mesh's vertices
// (render/modelpatch.js windowPanes, cabinGlass's userData.panes). The patch's `panes` table moves, turns and sizes one run, in place:
//   panes: { '<part id>#<pane name>': { id, sig, pane, start, count, move: [x, y, z], turn: [yaw, pitch, roll], size: [w, h] } }
//   move: metres, the car's frame (x left, y up, z front); turn: degrees about the pane's own centre, the car's axes (yaw about y, pitch
//   about x, roll about z; Euler 'YXZ'); size: the pane's width (across, level) and height (up its face) as factors, in its own plane.
// Found again by the part (id, sig: as the ops) and the pane (cabinGlass's by name, else the stored run of vertices). Applied after the ops,
// on the part's own copy of its geometry (never one another model shares), as the model is built: render only, the same draw calls.
// SNAP TO BODY: the pane's rim (its outline's points, every 4 cm) paired with the nearest body surface (every part that is not a window or a
// wheel) and the pane moved and turned so the rim rests on it (an ICP fit: small-angle least squares, 3 mm proud so the glass never
// z-fights the body). The GAP (the audit's, the editor's chip): the median over the rim of its distance to the body beyond 6 mm (the glass's
// own proud lay), so a pane that rests reads 0. Pure (three.js only): the editor, the game and the checks run the same code.
import * as THREE from 'three';
import { windowKey } from './glassnames.js';

export const PANE_CONTACT = 0.006, PANE_STANDOFF = 0.003, PANE_CAP = 0.3; // (m: the rest allowance, the snap's lay, the search's reach)
const r4 = (v) => Math.round(v * 10000) / 10000, r3 = (v) => Math.round(v * 1000) / 1000;
const toModelOf = (node, root) => { root.updateMatrixWorld(true); return new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(node.matrixWorld); };
export const paneKeyOf = (partId, name) => partId + '#' + name;
export const isNoEdit = (e) => !e || (!e.contour?.length && (!e.move || e.move.every(v => !v)) && (!e.turn || e.turn.every(v => !v)) && (!e.size || e.size.every(v => v === 1)));

// the pane's triangles (vertex index triples), read through the index for an indexed geometry
export const paneTris = (geo, pane) => {
  const idx = geo.index?.array, out = [], lo = pane.start, hi = pane.start + pane.count;
  if (idx) { for (let t = 0; t + 2 < idx.length; t += 3) if (idx[t] >= lo && idx[t] < hi) out.push([idx[t], idx[t + 1], idx[t + 2]]); }
  else for (let t = lo; t + 2 < hi; t += 3) out.push([t, t + 1, t + 2]);
  return out;
};
const basePos = (node) => node.userData.paneBase?.pos || node.geometry.attributes.position.array;
// the part's geometry as built (its triangles' index too): a pane's as-built run is read from it even after a contour cut the pane finer
const baseGeo = (node) => (node.userData.paneBase ? { index: node.userData.paneBase.idx ? { array: node.userData.paneBase.idx } : null } : node.geometry);

// the pane AS BUILT, in the car's frame: centre (box), area normal, its own axes (u across and level, v up its face, n out of it) and size
export const paneFrame = (node, root, pane) => {
  const M = toModelOf(node, root), pos = basePos(node), v = new THREE.Vector3(), box = new THREE.Box3();
  const P = (i, out) => out.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(M);
  for (let i = pane.start; i < pane.start + pane.count; i++) box.expandByPoint(P(i, v));
  const n = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const centre = box.getCenter(new THREE.Vector3());
  for (const [i, j, k] of paneTris(baseGeo(node), pane)) {
    const cr = e1.subVectors(P(j, b), P(i, a)).cross(e2.subVectors(P(k, c), a));
    if (n.lengthSq() && cr.dot(n) < 0) cr.negate(); // (one way: a box's two faces do not cancel)
    n.add(cr);
  }
  if (n.lengthSq() < 1e-12) n.set(0, 0, 1);
  n.normalize();
  { const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z); // (out of the car, roughly: a flank's away from x = 0, a screen's toward its end, a roof's up)
    const s = ax >= ay && ax >= az ? Math.sign(n.x) * (centre.x < 0 ? -1 : 1) : az >= ay ? Math.sign(n.z) * (centre.z < 0 ? -1 : 1) : Math.sign(n.y);
    if (s < 0) n.negate(); }
  const u = Math.abs(n.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(n).normalize(), w = new THREE.Vector3().crossVectors(n, u);
  let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity;
  for (let i = pane.start; i < pane.start + pane.count; i++) { P(i, v).sub(centre); const pu = v.dot(u), pw = v.dot(w); u0 = Math.min(u0, pu); u1 = Math.max(u1, pu); w0 = Math.min(w0, pw); w1 = Math.max(w1, pw); }
  return { c: centre, u, v: w, n, width: u1 - u0, height: w1 - w0, M };
};

// the edit as a matrix in the car's frame: p -> c + move + R(turn) * S(size, in the pane's plane) * (p - c)
export const turnMatrix = (turn = [0, 0, 0]) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(turn[1] / 57.29577951308232, turn[0] / 57.29577951308232, turn[2] / 57.29577951308232, 'YXZ'));
export const editMatrix = (edit, f) => {
  const s = edit?.size || [1, 1], mv = edit?.move || [0, 0, 0];
  const B = new THREE.Matrix4().makeBasis(f.u, f.v, f.n), S = new THREE.Matrix4().makeScale(s[0], s[1], 1);
  const inPlane = B.clone().multiply(S).multiply(B.clone().transpose());
  return new THREE.Matrix4().makeTranslation(f.c.x + mv[0], f.c.y + mv[1], f.c.z + mv[2]).multiply(turnMatrix(edit?.turn)).multiply(inPlane).multiply(new THREE.Matrix4().makeTranslation(-f.c.x, -f.c.y, -f.c.z));
};
export const turnOf = (m) => { const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().extractRotation(m), 'YXZ'); return [e.y, e.x, e.z].map(a => Math.round(a * 57.29577951308232 * 100) / 100); };
// the same edit for the pane across the car (x mirrored): x, yaw and roll change sign
// (a contour's anchors: s across the pane runs the other way on its twin, paneFrame's u being up x n)
export const mirroredEdit = (e) => ({ ...e, move: e.move ? [-e.move[0], e.move[1], e.move[2]] : undefined, turn: e.turn ? [-e.turn[0], e.turn[1], -e.turn[2]] : undefined, ...(e.contour ? { contour: e.contour.map(a => [r3(1 - a[0]), ...a.slice(1)]) } : {}) });

// write the pane's vertices from the part's as-built copy through the edit (an empty edit puts them back)
export const applyPaneEdit = (node, root, pane, edit) => {
  if (!node.userData.paneBase) {
    const g = node.geometry.clone(); g.userData = node.geometry.userData;
    node.geometry = g; node.userData.patchGeo = true;
    node.userData.paneBase = { pos: Float32Array.from(g.attributes.position.array), nor: g.attributes.normal ? Float32Array.from(g.attributes.normal.array) : null, idx: g.index ? Uint32Array.from(g.index.array) : null };
  }
  const f = paneFrame(node, root, pane), geo = node.geometry, base = node.userData.paneBase;
  const L = f.M.clone().invert().multiply(editMatrix(edit, f)).multiply(f.M), NL = new THREE.Matrix3().getNormalMatrix(L);
  const pos = geo.attributes.position, nor = geo.attributes.normal, v = new THREE.Vector3();
  for (let i = pane.start; i < pane.start + pane.count; i++) {
    v.set(base.pos[i * 3], base.pos[i * 3 + 1], base.pos[i * 3 + 2]).applyMatrix4(L); pos.setXYZ(i, v.x, v.y, v.z);
    if (nor && base.nor) { v.set(base.nor[i * 3], base.nor[i * 3 + 1], base.nor[i * 3 + 2]).applyMatrix3(NL).normalize(); nor.setXYZ(i, v.x, v.y, v.z); }
  }
  pos.needsUpdate = true; if (nor) nor.needsUpdate = true;
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return f;
};
// the pane an entry names in this node: cabinGlass's by name, else the stored run of vertices
export const paneRangeFor = (node, entry) => {
  const ps = node?.geometry?.userData?.panes, n = node?.geometry?.attributes?.position?.count || 0;
  if (ps) { const q = ps.find(p => p.name === entry.pane) || ps.find(p => windowKey(p.name) === windowKey(entry.pane)); if (q) return q; }
  if (Number.isInteger(entry.start) && Number.isInteger(entry.count) && entry.count > 0 && entry.start + entry.count <= n) return { name: entry.pane, start: entry.start, count: entry.count };
  return null;
};
// the patch's panes table on a built (and op-applied) model: find(id, sig) is applyPatch's resolver. Every entry's pane is found and moved first
// (as built: its stored run); then the CONTOURED ones (below) are cut finer and bent, the highest run of a mesh first so the runs below keep
// their places
export const applyPaneEdits = (root, table, find, out) => {
  const jobs = [];
  for (const [key, e] of Object.entries(table || {})) {
    const node = e && find(e.id, e.sig);
    const pane = node?.isMesh && node.parent ? paneRangeFor(node, e) : null;
    if (!pane) { out.unmatched.push('pane:' + key); out.warnings.push('pane edits: no window pane "' + key + '" in this build'); continue; }
    try { jobs.push({ key, e, node, pane, f: applyPaneEdit(node, root, pane, e) }); out.applied++; } catch (err) { out.warnings.push('pane ' + key + ': ' + err.message); }
  }
  for (const j of jobs.filter(q => Array.isArray(q.e.contour) && q.e.contour.length).sort((a, b) => b.pane.start - a.pane.start)) {
    try { applyContour(j.node, root, j.pane, j.e, j.f); } catch (err) { out.warnings.push('pane ' + j.key + ' contour: ' + err.message); }
  }
};

// ---- CONTOUR (CHECKLIST 465, the owner: "It should follow the body's contour if any as well") ------------------------------------------------
// A contour is the pane BENT off its plane, along its own (turned) normal: `contour: [[s, t, mm], ...]` in its entry (v: 2), anchors on its rim at
// (s, t), its place across and up its as-built face (0..1, paneFrame's u and v over its width and height; a pane thicker than 1 cm adds h, m
// out of the face: [s, t, mm, h], so a slab's two faces bend apart), each how far that rim point goes
// out (+) or in (-) along the normal, in mm; every vertex between moves by the anchors' inverse-distance mean (Shepard, power 2: a smooth sheet,
// exact at each anchor). An anchor with no body within reach is 0: that rim stays put. The pane is cut finer once, where the patch is applied
// (each triangle into 4, 16 or 64 by its count: 2^L along each edge), in place: its run grows, the runs after it move up
// (geometry.userData.paneRuns records it; paneAsBuilt maps a run back), cabinGlass's named panes follow. Build only: no per-frame work.
export const CONTOUR_REACH = 0.08, CONTOUR_STANDOFF = 0.002, CONTOUR_TURN = 8, CONTOUR_ROUNDS = 3; // (m: how far a rim point looks for the body along the normal; m: its lay off it; deg: the rigid turn's cap in a contour fit)
export const contourAt = (anchors, s, t, W, H, h = 0) => {
  let sw = 0, sd = 0;
  for (const a of anchors) {
    const du = (s - a[0]) * W, dv = (t - a[1]) * H, dh = a.length > 3 ? h - a[3] : 0, r2 = du * du + dv * dv + dh * dh;
    if (r2 < 1e-10) return a[2] / 1000;
    const w = 1 / r2; sw += w; sd += w * a[2];
  }
  return sw ? sd / sw / 1000 : 0;
};
// how finely a contoured pane is cut: its longest as-built edge to 5 cm or less, at most 64 to a triangle and 200 triangles a pane
const CUT_EDGE = 0.05, CUT_TRIS = 200; // (a car's budget is 1800 to 3000 triangles: a quad pane cut 8 to an edge is 128)
const levelOf = (node, root, pane) => {
  const v = asBuiltView(node), pos = v.geometry.attributes.position, M = toModelOf(node, root), tris = paneTris(v.geometry, pane), A = new THREE.Vector3(), B = new THREE.Vector3();
  let long = 0;
  for (const t of tris) for (let k = 0; k < 3; k++) { A.set(pos.array[t[k] * 3], pos.array[t[k] * 3 + 1], pos.array[t[k] * 3 + 2]).applyMatrix4(M); const j = t[(k + 1) % 3]; B.set(pos.array[j * 3], pos.array[j * 3 + 1], pos.array[j * 3 + 2]).applyMatrix4(M); long = Math.max(long, A.distanceTo(B)); }
  let L = 0; while (L < 3 && long / (1 << L) > CUT_EDGE && tris.length * (1 << (2 * (L + 1))) <= CUT_TRIS) L++;
  return L;
};
// (s, t: across and up the as-built face, 0..1; h: how far out of it, m: a thick pane's (a slab's, a dome's) two faces kept apart)
const stOf = (f, p) => { const dx = p.x - f.c.x, dy = p.y - f.c.y, dz = p.z - f.c.z; return [(dx * f.u.x + dy * f.u.y + dz * f.u.z) / Math.max(1e-6, f.width) + 0.5, (dx * f.v.x + dy * f.v.y + dz * f.v.z) / Math.max(1e-6, f.height) + 0.5, dx * f.n.x + dy * f.n.y + dz * f.n.z]; };
// the barycentric weights of a triangle cut 2^L along each edge: its points and its triangles (indices into the points, the same winding)
const cutOf = (L) => {
  const N = 1 << L, pts = [], at = new Map(), tris = [];
  for (let i = 0; i <= N; i++) for (let j = 0; i + j <= N; j++) { at.set(i + ',' + j, pts.length); pts.push([(N - i - j) / N, i / N, j / N]); }
  const k = (i, j) => at.get(i + ',' + j);
  for (let i = 0; i < N; i++) for (let j = 0; i + j < N; j++) { tris.push([k(i, j), k(i + 1, j), k(i, j + 1)]); if (i + j < N - 1) tris.push([k(i + 1, j), k(i + 1, j + 1), k(i, j + 1)]); }
  return { pts, tris };
};
// cut the pane (its as-built run, already moved by applyPaneEdit) finer in place, and bend it by its contour
export const applyContour = (node, root, pane, edit, f) => {
  const geo = node.geometry, idx = geo.index?.array, tris = paneTris(geo, pane), L = levelOf(node, root, pane), cut = cutOf(L), base = node.userData.paneBase;
  const n0 = f.n.clone().applyMatrix4(turnMatrix(edit.turn)), Minv = f.M.clone().invert();
  const dirL = n0.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(Minv)); // (a metre along the normal, in the mesh's own units)
  const names = Object.keys(geo.attributes), Wd = f.width * (edit.size?.[0] ?? 1), Hd = f.height * (edit.size?.[1] ?? 1);
  const P = new THREE.Vector3();
  // the new vertices of each of the pane's triangles: every attribute by its barycentric weights, then the position bent along the normal
  const perTri = idx ? cut.pts.length : cut.tris.length * 3, added = tris.length * perTri, oldCount = pane.count;
  const block = {}; for (const a of names) block[a] = new Float32Array(added * geo.attributes[a].itemSize);
  tris.forEach((t, ti) => {
    const list = idx ? cut.pts : cut.tris.flat().map(q => cut.pts[q]);
    list.forEach((w, vi) => {
      const o = ti * perTri + vi;
      for (const a of names) { const A = geo.attributes[a], sz = A.itemSize; for (let c = 0; c < sz; c++) block[a][o * sz + c] = w[0] * A.array[t[0] * sz + c] + w[1] * A.array[t[1] * sz + c] + w[2] * A.array[t[2] * sz + c]; }
      P.set(0, 0, 0); for (let k = 0; k < 3; k++) P.x += w[k] * base.pos[t[k] * 3], P.y += w[k] * base.pos[t[k] * 3 + 1], P.z += w[k] * base.pos[t[k] * 3 + 2];
      const [s, tt, h] = stOf(f, P.applyMatrix4(f.M)), d = contourAt(edit.contour, s, tt, Wd, Hd, h), p = block.position;
      p[o * 3] += dirL.x * d; p[o * 3 + 1] += dirL.y * d; p[o * 3 + 2] += dirL.z * d;
    });
  });
  // the geometry again: the vertices before the run, the new block, the ones after (moved up by delta); the index and groups remapped
  const delta = added - oldCount, total = geo.attributes.position.count + delta, at = pane.start, end = pane.start + oldCount;
  const g = new THREE.BufferGeometry();
  for (const a of names) {
    const A = geo.attributes[a], sz = A.itemSize, arr = new (A.array.constructor)(total * sz);
    arr.set(A.array.subarray(0, at * sz), 0); arr.set(block[a], at * sz); arr.set(A.array.subarray(end * sz), (at + added) * sz);
    g.setAttribute(a, new THREE.BufferAttribute(arr, sz, A.normalized));
  }
  const triMap = []; // (old triangle -> [its first new triangle, how many])
  if (idx) {
    const out = [], own = new Set(tris.map(t => t.join(','))); let mine = 0;
    for (let t = 0; t + 2 < idx.length; t += 3) {
      const tri = [idx[t], idx[t + 1], idx[t + 2]];
      triMap.push([out.length / 3, 0]);
      if (tri[0] >= at && tri[0] < end && own.has(tri.join(','))) { const b0 = at + mine * perTri; for (const q of cut.tris) out.push(b0 + q[0], b0 + q[1], b0 + q[2]); mine++; triMap[triMap.length - 1][1] = cut.tris.length; }
      else { for (const i of tri) out.push(i >= end ? i + delta : i); triMap[triMap.length - 1][1] = 1; }
    }
    g.setIndex(total > 65535 ? new THREE.Uint32BufferAttribute(out, 1) : new THREE.Uint16BufferAttribute(out, 1));
  } else {
    const nt = geo.attributes.position.count / 3;
    for (let t = 0, o = 0; t < nt; t++) { const n = t * 3 >= at && t * 3 < end ? cut.tris.length : 1; triMap.push([o, n]); o += n; }
  }
  const unit = 3; // (groups count indices, or vertices: three a triangle either way)
  for (const gr of geo.groups) {
    const a = Math.floor(gr.start / unit), b = Math.min(triMap.length, Math.ceil((gr.start + gr.count) / unit));
    if (a >= triMap.length) continue;
    const s0 = triMap[a][0], s1 = b > a ? triMap[b - 1][0] + triMap[b - 1][1] : s0;
    g.addGroup(s0 * unit, (s1 - s0) * unit, gr.materialIndex);
  }
  // the runs: cabinGlass's named panes follow, and the record of what grew (paneAsBuilt)
  const ud = { ...geo.userData };
  if (Array.isArray(ud.panes)) ud.panes = ud.panes.map(q => (q.start === at && q.count === oldCount ? { ...q, count: added } : q.start >= end ? { ...q, start: q.start + delta } : q));
  ud.paneRuns = [...(ud.paneRuns || []), { start: at, count: oldCount, now: added }];
  g.userData = ud;
  g.computeBoundingBox(); g.computeBoundingSphere();
  node.geometry = g; node.userData.paneContoured = true;
};
// a pane as the patch stores it (its as-built run) from the pane as found on a model whose contours grew some runs
export const paneAsBuilt = (node, pane) => {
  const runs = node?.geometry?.userData?.paneRuns;
  if (!runs?.length || !pane) return pane;
  const sorted = [...runs].sort((a, b) => a.start - b.start);
  let shift = 0;
  for (const r of sorted) {
    const nowStart = r.start + shift;
    if (pane.start === nowStart && pane.count === r.now) return { ...pane, start: r.start, count: r.count };
    if (nowStart >= pane.start) break;
    shift += r.now - r.count;
  }
  return { ...pane, start: pane.start - shift };
};

// ---- the GAP and SNAP TO BODY ------------------------------------------------------------------------------------------------------------
// the pane's rim in the car's frame: its outline's points (the triangle edges used once), and points every 4 cm along each edge
export const rimPoints = (node, root, pane, step = 0.04) => {
  const M = toModelOf(node, root), pos = node.geometry.attributes.position, edges = new Map(), v = new THREE.Vector3();
  const key = (i) => { v.fromBufferAttribute(pos, i); return Math.round(v.x * 1e4) + ',' + Math.round(v.y * 1e4) + ',' + Math.round(v.z * 1e4); };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const t of paneTris(node.geometry, pane)) {
    A.fromBufferAttribute(pos, t[0]); B.fromBufferAttribute(pos, t[1]); C.fromBufferAttribute(pos, t[2]);
    const fn = B.clone().sub(A).cross(C.clone().sub(A)); if (fn.lengthSq() < 1e-20) continue; fn.normalize();
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3], ka = key(a), kb = key(b); if (ka === kb) continue;
      const id = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      const e = edges.get(id); if (e) { e.n++; if (Math.abs(e.fn.dot(fn)) < 0.9) e.sharp = true; } else edges.set(id, { a, b, n: 1, fn, sharp: false });
    }
  }
  let rim = [...edges.values()].filter(e => e.n === 1);
  const closed = !rim.length; // (a closed pane, a glass slab: its creases, both faces' (a flat face's own diagonals, or a contour's cuts, are not): gapOf reads its nearer quarter)
  if (closed) { rim = [...edges.values()].filter(e => e.sharp); if (!rim.length) rim = [...edges.values()]; }
  const out = [], seen = new Set();
  for (const e of rim) {
    A.fromBufferAttribute(pos, e.a).applyMatrix4(M); B.fromBufferAttribute(pos, e.b).applyMatrix4(M);
    const n = Math.max(1, Math.ceil(A.distanceTo(B) / step));
    for (let i = 0; i < n; i++) { const p = A.clone().lerp(B, i / n), k = p.toArray().map(x => Math.round(x * 1000)).join(','); if (!seen.has(k)) { seen.add(k); out.push(p); } }
  }
  const res = out.length > 240 ? out.filter((_, i) => Math.floor(i % (out.length / 240)) === 0).slice(0, 240) : out;
  res.closed = closed;
  return res;
};
// what a pane rests on, as triangles in the car's frame: the body's meshes (whole), and the OTHER panes of the car's glass ({ mesh, tris }:
// their vertex index triples), so a pane that meets another pane (a glass box's faces, a screen wrapped into its side windows) rests
export const bodyTriangles = (root, items) => {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), list = [], glassy = [], v = new THREE.Vector3();
  for (const it of items) {
    const m = it.isMesh ? it : it.mesh, pos = m?.geometry?.attributes?.position; if (!pos) continue;
    const M = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), idx = m.geometry.index?.array;
    const start = m.geometry.drawRange?.start || 0, end = Math.min(idx ? idx.length : pos.count, start + (m.geometry.drawRange?.count ?? Infinity));
    const triples = it.isMesh ? null : it.tris;
    const n = triples ? triples.length : Math.max(0, Math.floor((end - start) / 3));
    for (let j = 0; j < n; j++) {
      const tri = new Float32Array(9), t = start + j * 3;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, triples ? triples[j][k] : idx ? idx[t + k] : t + k).applyMatrix4(M); tri[k * 3] = v.x; tri[k * 3 + 1] = v.y; tri[k * 3 + 2] = v.z; }
      list.push(tri); glassy.push(it.isMesh ? 0 : 1);
    }
  }
  const n = list.length, tris = new Float32Array(n * 9), lo = new Float32Array(n * 3), hi = new Float32Array(n * 3);
  list.forEach((t, i) => { tris.set(t, i * 9); for (let a = 0; a < 3; a++) { lo[i * 3 + a] = Math.min(t[a], t[3 + a], t[6 + a]); hi[i * 3 + a] = Math.max(t[a], t[3 + a], t[6 + a]); } });
  return { n, tris, lo, hi, glass: Uint8Array.from(glassy) }; // (glass: 1 for another pane's triangle)
};
const TRI = new THREE.Triangle(), Q = new THREE.Vector3();
// the nearest body point to p within `cap` (null beyond it)
export const nearestBody = (body, p, cap = PANE_CAP) => {
  let best = cap, at = null, bi = -1;
  for (let i = 0; i < body.n; i++) {
    const i3 = i * 3;
    if (p.x < body.lo[i3] - best || p.x > body.hi[i3] + best || p.y < body.lo[i3 + 1] - best || p.y > body.hi[i3 + 1] + best || p.z < body.lo[i3 + 2] - best || p.z > body.hi[i3 + 2] + best) continue;
    const t = body.tris, k = i * 9;
    TRI.a.set(t[k], t[k + 1], t[k + 2]); TRI.b.set(t[k + 3], t[k + 4], t[k + 5]); TRI.c.set(t[k + 6], t[k + 7], t[k + 8]);
    TRI.closestPointToPoint(p, Q);
    const d = Q.distanceTo(p);
    if (d < best) { best = d; at = Q.clone(); bi = i; }
  }
  if (!at) return null;
  const k = bi * 9, t = body.tris; TRI.a.set(t[k], t[k + 1], t[k + 2]); TRI.b.set(t[k + 3], t[k + 4], t[k + 5]); TRI.c.set(t[k + 6], t[k + 7], t[k + 8]);
  return { q: at, d: best, n: TRI.getNormal(new THREE.Vector3()), glass: !!body.glass?.[bi] }; // (n: the face's own normal, by its winding: out of the body)
};
const quantile = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// the gap: { gap (m: the median over the rim of its distance to the body beyond the rest allowance, 6 mm; a closed pane, a slab with both faces'
// edges, its nearer quarter), clear (m: the rim's nearest point to
// the body; PANE_CAP and more: nothing within reach), points }
export const gapOf = (pts, body, closed = !!pts.closed) => {
  const ds = pts.map(p => nearestBody(body, p)?.d ?? PANE_CAP), g = ds.map(d => Math.max(0, d - PANE_CONTACT));
  return { gap: r4(closed ? quantile(g, 0.25) : median(g)), clear: r4(ds.length ? Math.min(...ds) : PANE_CAP), points: pts.length };
};
export const paneGap = (root, node, pane, body) => gapOf(rimPoints(node, root, pane), body);

// the pane's samples now (the car's frame): its rim, its inside (vertices and triangle middles) and its area normal
export const paneSamples = (node, root, pane) => {
  const M = toModelOf(node, root), pos = node.geometry.attributes.position, inner = [], n = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const [i, j, k] of paneTris(node.geometry, pane)) {
    a.fromBufferAttribute(pos, i).applyMatrix4(M); b.fromBufferAttribute(pos, j).applyMatrix4(M); c.fromBufferAttribute(pos, k).applyMatrix4(M);
    const cr = e1.subVectors(b, a).cross(e2.subVectors(c, a)); if (n.lengthSq() && cr.dot(n) < 0) cr.negate(); n.add(cr);
    if (inner.length < 400) inner.push(a.clone(), a.clone().add(b).add(c).divideScalar(3));
  }
  return { rim: rimPoints(node, root, pane), inner, n: n.lengthSq() ? n.normalize() : new THREE.Vector3(0, 0, 1) };
};
const RAY = new THREE.Ray(), HIT = new THREE.Vector3();
// the body's nearest face along dir from p (within reach): { t, m (its normal, toward p) } or null
const castBody = (body, list, p, dir, reach, bodyOnly = false) => {
  RAY.origin.copy(p); RAY.direction.copy(dir);
  let best = reach, m = null;
  for (const i of list) {
    if (bodyOnly && body.glass[i]) continue;
    const k = i * 9, t = body.tris;
    TRI.a.set(t[k], t[k + 1], t[k + 2]); TRI.b.set(t[k + 3], t[k + 4], t[k + 5]); TRI.c.set(t[k + 6], t[k + 7], t[k + 8]);
    if (!RAY.intersectTriangle(TRI.a, TRI.b, TRI.c, false, HIT)) continue;
    const d = HIT.distanceTo(p); if (d < best) { best = d; m = TRI.getNormal(new THREE.Vector3()); }
  }
  if (!m) return null;
  const facing = m.dot(dir) > 0; // (its front faces along the ray: away from the pane, seen from beyond: it hides what is behind it)
  if (facing) m.negate();
  return { t: best, m, facing };
};
export const SNAP_REACH = 0.15, SNAP_TURN = 20; // (m: how far behind the pane the body is looked for; deg: the most it is turned to lie on it)
const angleOf = (R) => { const q = new THREE.Quaternion().setFromRotationMatrix(R); return 2 * Math.acos(Math.min(1, Math.abs(q.w))) * 57.29577951308232; };
const RAD = 1 / 57.29577951308232;
// SNAP TO BODY: the move and turn (about `pivot`, the pane's centre now) that rest the pane on the body: its rim (60 points) brought to 3 mm
// off the nearest surfaces round it (the body, the other panes), searched move by move and turn by turn (a pattern search, 2 cm and 2 degrees
// halved down to half a millimetre), from where it is and from where rays along its normal lay it on the body face behind it (a flat pane
// turned parallel to it). Never into the body: a try that puts more of the pane's inside under a body face facing out is refused; at most
// 15 cm and 20 degrees, and never deeper into it: a try that puts more of the pane's inside behind the body face nearest it (by that face's
// winding) is refused too. -> { R, t, moved (m), turned (deg), before, after (gapOf), how } or null (nothing within reach, or it rests already)
export const snapPane = (sample, body, pivot, opt = {}) => {
  const TURN = opt.turn ?? SNAP_TURN; // (a contour fit turns it less: fitPane)
  const before = gapOf(sample.rim, body), all = [...sample.inner, ...sample.rim];
  const box = new THREE.Box3().setFromPoints(all).expandByScalar(SNAP_REACH + 0.05), near = [];
  for (let i = 0; i < body.n; i++) { const i3 = i * 3; if (body.hi[i3] >= box.min.x && body.lo[i3] <= box.max.x && body.hi[i3 + 1] >= box.min.y && body.lo[i3 + 1] <= box.max.y && body.hi[i3 + 2] >= box.min.z && body.lo[i3 + 2] <= box.max.z) near.push(i); }
  const sub = { n: near.length, tris: new Float32Array(near.length * 9), lo: new Float32Array(near.length * 3), hi: new Float32Array(near.length * 3), glass: new Uint8Array(near.length) };
  near.forEach((i, j) => { sub.tris.set(body.tris.subarray(i * 9, i * 9 + 9), j * 9); sub.lo.set(body.lo.subarray(i * 3, i * 3 + 3), j * 3); sub.hi.set(body.hi.subarray(i * 3, i * 3 + 3), j * 3); sub.glass[j] = body.glass[i]; });
  const ids = sub.glass.map((_, j) => j);
  const pick = (list, n) => (list.length > n ? list.filter((_, i) => i % Math.ceil(list.length / n) === 0) : list);
  const rim = pick(sample.rim, 60), inner = pick(sample.inner, 30);
  const xf = (x) => { const R = new THREE.Matrix4(), w = new THREE.Vector3(x[3], x[4], x[5]); if (w.lengthSq() > 1e-14) R.makeRotationAxis(w.clone().normalize(), w.length()); return { R, t: new THREE.Vector3(x[0], x[1], x[2]) }; };
  const at = (c, p) => p.clone().sub(pivot).applyMatrix4(c.R).add(pivot).add(c.t);
  // which side the body is on (rays along the normal: more faces hit, else the nearer), and so which side is OUT
  const none = xf([0, 0, 0, 0, 0, 0]), shoot = (c, dir, pts) => pts.map(p => castBody(sub, ids, at(c, p), dir, SNAP_REACH)).filter(Boolean);
  let dir = sample.n.clone().negate(), hits = shoot(none, dir, all);
  { const other = shoot(none, sample.n, all); if (other.length > hits.length || (other.length === hits.length && other.length && median(other.map(h => h.t)) < median(hits.map(h => h.t)))) { dir = sample.n.clone(); hits = other; } }
  const sunkOf = (c) => { const out = dir.clone().negate().applyMatrix4(new THREE.Matrix4().extractRotation(c.R)); return inner.length ? inner.filter(p => castBody(sub, ids, at(c, p).addScaledVector(out, 0.0005), out, 0.08, true)?.facing).length / inner.length : 0; };
  // inside the body: a point behind the body face nearest it (by that face's winding), deeper than 2 mm
  const insideOf = (c) => { let n = 0; for (const p of inner) { const q = at(c, p), h = nearestBody(sub, q, 0.1); if (h && !h.glass && h.d > 0.002 && q.clone().sub(h.q).dot(h.n) < 0) n++; } return inner.length ? n / inner.length : 0; };
  const sunk0 = sunkOf(none), in0 = insideOf(none), fine = (c) => sunkOf(c) <= sunk0 + 0.1 && insideOf(c) <= in0 + 0.05;
  const cost = (c) => { let s2 = 0; for (const p of rim) { const h = nearestBody(sub, at(c, p), SNAP_REACH); s2 += Math.abs((h ? h.d : SNAP_REACH) - PANE_STANDOFF); } return s2 / rim.length; };
  const ok = (x) => Math.hypot(x[0], x[1], x[2]) <= SNAP_REACH && Math.hypot(x[3], x[4], x[5]) <= TURN * RAD;
  const search = (x0, how) => {
    const x = x0.slice(); let c = xf(x), J = cost(c), st = 0.02, sr = 2 * RAD, evals = 0;
    while (st >= 0.0005 && evals < 700) {
      let better = false;
      for (let k = 0; k < 6; k++) for (const sg of [1, -1]) {
        const y = x.slice(); y[k] += sg * (k < 3 ? st : sr); if (!ok(y)) continue;
        const cy = xf(y), Jy = cost(cy); evals++;
        if (Jy < J - 1e-6 && fine(cy)) { x.splice(0, 6, ...y); c = cy; J = Jy; better = true; }
      }
      if (!better) { st /= 2; sr /= 2; }
    }
    return { ...c, J, how, x };
  };
  const tries = [search([0, 0, 0, 0, 0, 0], 'rim')];
  if (hits.length >= 3 && hits.length >= all.length * 0.25) { // (from the body face behind it: turned parallel if flat, laid 3 mm off)
    const m = hits.reduce((s2, h) => s2.add(h.m), new THREE.Vector3()).normalize().negate();
    const mid = all.reduce((s2, p) => s2.add(p), new THREE.Vector3()).divideScalar(all.length);
    const flat = all.every(p => Math.abs(p.clone().sub(mid).dot(sample.n)) < 0.015);
    const q = flat && dir.angleTo(m) <= TURN * RAD ? new THREE.Quaternion().setFromUnitVectors(dir, m) : new THREE.Quaternion();
    const w = new THREE.Vector3(q.x, q.y, q.z), ang = 2 * Math.acos(Math.min(1, q.w)), rv = w.lengthSq() > 1e-14 ? w.normalize().multiplyScalar(ang) : w;
    const c0 = xf([0, 0, 0, rv.x, rv.y, rv.z]), d = flat ? m : dir, again = shoot(c0, d, all);
    if (again.length) { const tt = d.clone().multiplyScalar(Math.min(...again.map(h => h.t)) - PANE_STANDOFF); const x0 = [tt.x, tt.y, tt.z, rv.x, rv.y, rv.z]; if (ok(x0) && fine(xf(x0))) tries.push(search(x0, 'face')); }
  }
  const best = tries.sort((p, q) => p.J - q.J)[0], moved = best.t.length(), turned = angleOf(best.R);
  if (moved < 2e-4 && turned < 0.05) return null;
  return { R: best.R, t: best.t, moved: r4(moved), turned: Math.round(turned * 10) / 10, before, after: gapOf(sample.rim.map(p => at(best, p)), body, !!sample.rim.closed), how: best.how };
};
// the snap folded into the pane's edit: the turn composed (the snap's about the centre now), the move added
export const snappedEdit = (edit, snap) => {
  const R0 = turnMatrix(edit?.turn), mv = edit?.move || [0, 0, 0];
  return { ...edit, move: [mv[0] + snap.t.x, mv[1] + snap.t.y, mv[2] + snap.t.z].map(r4), turn: turnOf(snap.R.clone().multiply(R0)), size: edit?.size || [1, 1] };
};
// what `self` (a pane of node `selfNode`) rests on: the body's shown meshes (not a window, not a wheel) and every other shown pane.
// ex: extractParts's { parts, nodes, panes } (panes: part id -> its panes); isWindow: modelpatch.js isWindowPart
const NOT_BODY = new Set(['wheel', 'tyre', 'hub', 'wheels']);
export const restItems = (root, ex, isWindow, selfNode, selfPane) => {
  const shown = (n) => { for (let p = n; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };
  const items = [];
  for (const r of ex.parts) {
    const node = ex.nodes.get(r.id);
    if (r.type !== 'mesh' || !node?.isMesh || !shown(node)) continue;
    if (isWindow(r) || ex.panes.has(r.id)) {
      for (const q of ex.panes.get(r.id) || []) if (!(node === selfNode && q.start === selfPane.start && q.count === selfPane.count)) items.push({ mesh: node, tris: paneTris(node.geometry, q) });
    } else if (!NOT_BODY.has(r.role) && !/^wheels?\b/.test(r.hook || '')) items.push(node);
  }
  return bodyTriangles(root, items);
};

// ---- CONTOUR FIT: the rigid snap (its turn capped at CONTOUR_TURN, so a screen that stands free is not laid down), then each rim point sent
// along the pane's normal to 2 mm off the first surface it meets within 8 cm (the body, or another pane: never through it, never past it);
// a rim point with nothing there stays put (its anchor 0). The sheet between follows (contourAt). A vertex the bend would take through a
// surface gets an anchor of its own that stops it 2 mm short. Repeated (at most 3 rounds) while the rim still closes by 0.3 mm.
// The pane's points under an edit (rigid and contour) without touching the geometry: its as-built rim and its cut-finer vertices, mapped
const asBuiltView = (node) => {
  const b = node.userData.paneBase; if (!b) return node;
  return { geometry: { attributes: { position: new THREE.BufferAttribute(b.pos, 3) }, index: b.idx ? { array: b.idx } : null }, matrixWorld: node.matrixWorld };
};
export const samplesUnder = (node, root, paneAB, edit, f = paneFrame(node, root, paneAB)) => {
  const view = asBuiltView(node), E = editMatrix(edit, f), n0 = f.n.clone().applyMatrix4(turnMatrix(edit?.turn)), an = edit?.contour || [];
  const Wd = f.width * (edit?.size?.[0] ?? 1), Hd = f.height * (edit?.size?.[1] ?? 1);
  const map = (p, st) => p.clone().applyMatrix4(E).addScaledVector(n0, an.length ? contourAt(an, st[0], st[1], Wd, Hd, st[2]) : 0);
  // the pane cut as applyContour cuts it (as built, the car's frame): its vertices (inner) and its rim's (the outline, or a slab's creases)
  const pos = view.geometry.attributes.position, tris = paneTris(view.geometry, paneAB), cut = cutOf(levelOf(node, root, paneAB)), M = f.M, innerSt = [], inner = [], rim = [], rimSt = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), at = new Map(), pts = [], edges = new Map();
  const id = (p) => { const k = p.toArray().map(x => Math.round(x * 1e4)).join(); if (!at.has(k)) { at.set(k, pts.length); pts.push(p); } return at.get(k); };
  for (const t of tris) {
    A.fromBufferAttribute(pos, t[0]).applyMatrix4(M); B.fromBufferAttribute(pos, t[1]).applyMatrix4(M); C.fromBufferAttribute(pos, t[2]).applyMatrix4(M);
    const fn = B.clone().sub(A).cross(C.clone().sub(A)); if (fn.lengthSq() < 1e-20) continue; fn.normalize();
    const ix = cut.pts.map(w => id(new THREE.Vector3().addScaledVector(A, w[0]).addScaledVector(B, w[1]).addScaledVector(C, w[2])));
    for (const q of cut.tris) for (let k = 0; k < 3; k++) {
      const a = ix[q[k]], b = ix[q[(k + 1) % 3]], e = a < b ? a + '|' + b : b + '|' + a, x = edges.get(e);
      if (x) { x.n++; if (Math.abs(x.fn.dot(fn)) < 0.9) x.sharp = true; } else edges.set(e, { a, b, n: 1, fn, sharp: false });
    }
  }
  let rimE = [...edges.values()].filter(e => e.n === 1);
  const closed = !rimE.length;
  if (closed) { rimE = [...edges.values()].filter(e => e.sharp); if (!rimE.length) rimE = [...edges.values()]; }
  const onRim = new Set(rimE.flatMap(e => [e.a, e.b]));
  pts.forEach((p, i) => { const st = stOf(f, p), q = map(p, st); innerSt.push(st); inner.push(q); if (onRim.has(i)) { rimSt.push(st); rim.push(q); } });
  rim.closed = closed;
  const hs = [...rimSt, ...innerSt].map(q => q[2]);
  return { rim, rimSt, inner, innerSt, n: n0, Wd, Hd, f, thick: Math.max(...hs) - Math.min(...hs) > 0.01 };
};
const nearOf = (body, pts, pad) => {
  const box = new THREE.Box3().setFromPoints(pts).expandByScalar(pad), near = [];
  for (let i = 0; i < body.n; i++) { const i3 = i * 3; if (body.hi[i3] >= box.min.x && body.lo[i3] <= box.max.x && body.hi[i3 + 1] >= box.min.y && body.lo[i3 + 1] <= box.max.y && body.hi[i3 + 2] >= box.min.z && body.lo[i3 + 2] <= box.max.z) near.push(i); }
  const sub = { n: near.length, tris: new Float32Array(near.length * 9), lo: new Float32Array(near.length * 3), hi: new Float32Array(near.length * 3), glass: new Uint8Array(near.length) };
  near.forEach((i, j) => { sub.tris.set(body.tris.subarray(i * 9, i * 9 + 9), j * 9); sub.lo.set(body.lo.subarray(i * 3, i * 3 + 3), j * 3); sub.hi.set(body.hi.subarray(i * 3, i * 3 + 3), j * 3); sub.glass[j] = body.glass[i]; });
  return { sub, ids: near.map((_, j) => j) };
};
// the rim's fit: the farthest rim point from the body among those with a surface within reach along the normal (m), and how many have one
export const rimFit = (smp, body) => {
  const { sub, ids } = nearOf(body, smp.rim, CONTOUR_REACH + 0.02), neg = smp.n.clone().negate();
  let max = 0, n = 0;
  for (const p of smp.rim) {
    if (!castBody(sub, ids, p, smp.n, CONTOUR_REACH) && !castBody(sub, ids, p, neg, CONTOUR_REACH)) continue;
    n++; max = Math.max(max, nearestBody(sub, p, PANE_CAP)?.d ?? PANE_CAP);
  }
  return { max: r4(max), n, of: smp.rim.length };
};
const solveContour = (smp, sub, ids, old) => {
  const n0 = smp.n, neg = n0.clone().negate(), anchors = [], q = new THREE.Vector3();
  let conformed = 0;
  smp.rim.forEach((p, i) => {
    const [s, t, h] = smp.rimSt[i], cur = contourAt(old, s, t, smp.Wd, smp.Hd, h);
    let best = null;
    for (const [dir, sg] of [[n0, 1], [neg, -1]]) { const h = castBody(sub, ids, p, dir, CONTOUR_REACH); if (h && (!best || h.t < best.t)) best = { t: h.t, sg }; }
    let d = cur;
    if (best) {
      const delta = best.sg * (best.t - CONTOUR_STANDOFF);
      q.copy(p).addScaledVector(n0, delta);
      const was = nearestBody(sub, p, PANE_CAP)?.d ?? PANE_CAP, now = nearestBody(sub, q, PANE_CAP)?.d ?? PANE_CAP;
      if (now < was - 0.0002 || now <= CONTOUR_STANDOFF + 0.001) { d = cur + delta; if (Math.abs(delta) > 0.0005) conformed++; }
    }
    d = Math.max(-CONTOUR_REACH, Math.min(CONTOUR_REACH, d));
    anchors.push(smp.thick ? [r3(s), r3(t), Math.round(d * 10000) / 10, r3(h)] : [r3(s), r3(t), Math.round(d * 10000) / 10]);
  });
  // never through a surface: a vertex the bend would carry through one stops 2 mm short (an anchor of its own)
  for (let round = 0; round < 3; round++) {
    let added = 0;
    smp.inner.forEach((p, i) => {
      const [s, t, h] = smp.innerSt[i], dOld = contourAt(old, s, t, smp.Wd, smp.Hd, h), dNew = contourAt(anchors, s, t, smp.Wd, smp.Hd, h), D = dNew - dOld;
      if (Math.abs(D) < 0.0003) return;
      const hit = castBody(sub, ids, p, D > 0 ? n0 : neg, Math.abs(D) + CONTOUR_STANDOFF);
      if (!hit || hit.t >= Math.abs(D) + CONTOUR_STANDOFF - 0.0001) return;
      const d = Math.round((dOld + Math.sign(D) * Math.max(0, hit.t - CONTOUR_STANDOFF)) * 10000) / 10;
      anchors.push(smp.thick ? [r3(s), r3(t), d, r3(h)] : [r3(s), r3(t), d]); added++;
    });
    if (!added) break;
  }
  return { anchors, conformed };
};
const turnAngle = (a, b) => angleOf(turnMatrix(a).multiply(turnMatrix(b).invert()));
// -> { edit (the fitted edit: move, turn, size, contour), before, rigid, after (gapOf), fit (rimFit after), moved (m), turned (deg), conformed, rim, rounds } or null
export const fitPane = (node, root, paneAB, edit, body) => {
  const f = paneFrame(node, root, paneAB), e0 = { move: [...(edit?.move || [0, 0, 0])], turn: [...(edit?.turn || [0, 0, 0])], size: [...(edit?.size || [1, 1])], ...(edit?.contour?.length ? { contour: edit.contour } : {}) };
  const s0 = samplesUnder(node, root, paneAB, e0, f), before = gapOf(s0.rim, body), fit0 = rimFit(s0, body);
  let e = e0, rigid = null, after = before, fit = fit0, conformed = 0, rounds = 0;
  for (; rounds < CONTOUR_ROUNDS; rounds++) {
    const s = samplesUnder(node, root, paneAB, e, f), left = CONTOUR_TURN - turnAngle(e.turn, e0.turn);
    const sn = snapPane(s, body, f.c.clone().add(new THREE.Vector3(...e.move)), { turn: Math.max(0, left) });
    const er = sn ? snappedEdit(e, sn) : e;
    if (!rounds) rigid = gapOf(samplesUnder(node, root, paneAB, er, f).rim, body);
    const s2 = samplesUnder(node, root, paneAB, er, f), { sub, ids } = nearOf(body, [...s2.rim, ...s2.inner], CONTOUR_REACH + 0.02);
    const c = solveContour(s2, sub, ids, er.contour || []);
    const en = { ...er, contour: c.anchors.some(a => Math.abs(a[2]) >= 0.1) ? c.anchors : undefined };
    if (!en.contour) delete en.contour;
    const s3 = samplesUnder(node, root, paneAB, en, f), g = gapOf(s3.rim, body), fz = rimFit(s3, body);
    const better = fz.max < fit.max - 0.0003 || g.gap < after.gap - 0.0003;
    if (rounds && !better) break;
    e = en; after = g; fit = fz; conformed = Math.max(conformed, c.conformed);
    if (fz.max <= CONTOUR_STANDOFF + 0.001) { rounds++; break; }
  }
  const moved = Math.hypot(...e.move.map((v, i) => v - e0.move[i])), turned = turnAngle(e.turn, e0.turn);
  if (moved < 2e-4 && turned < 0.05 && JSON.stringify(e.contour || null) === JSON.stringify(e0.contour || null)) return null;
  return { edit: e, before, rigid, after, fit0, fit, moved: r4(moved), turned: Math.round(turned * 10) / 10, conformed, rim: s0.rim.length, rounds };
};
