// ---- ONE WINDOW PANE, MOVED ON ITS OWN (the owner, 17-Oct: "The model editor still doesn't let me change the angle or placement of a
// single window, there are some cars with floating windscreens that I can't fix"; CHECKLIST 448). A window part is often ONE mesh with
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
const r4 = (v) => Math.round(v * 10000) / 10000;
const toModelOf = (node, root) => { root.updateMatrixWorld(true); return new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(node.matrixWorld); };
export const paneKeyOf = (partId, name) => partId + '#' + name;
export const isNoEdit = (e) => !e || ((!e.move || e.move.every(v => !v)) && (!e.turn || e.turn.every(v => !v)) && (!e.size || e.size.every(v => v === 1)));

// the pane's triangles (vertex index triples), read through the index for an indexed geometry
export const paneTris = (geo, pane) => {
  const idx = geo.index?.array, out = [], lo = pane.start, hi = pane.start + pane.count;
  if (idx) { for (let t = 0; t + 2 < idx.length; t += 3) if (idx[t] >= lo && idx[t] < hi) out.push([idx[t], idx[t + 1], idx[t + 2]]); }
  else for (let t = lo; t + 2 < hi; t += 3) out.push([t, t + 1, t + 2]);
  return out;
};
const basePos = (node) => node.userData.paneBase?.pos || node.geometry.attributes.position.array;

// the pane AS BUILT, in the car's frame: centre (box), area normal, its own axes (u across and level, v up its face, n out of it) and size
export const paneFrame = (node, root, pane) => {
  const M = toModelOf(node, root), pos = basePos(node), v = new THREE.Vector3(), box = new THREE.Box3();
  const P = (i, out) => out.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(M);
  for (let i = pane.start; i < pane.start + pane.count; i++) box.expandByPoint(P(i, v));
  const n = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const centre = box.getCenter(new THREE.Vector3());
  for (const [i, j, k] of paneTris(node.geometry, pane)) {
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
export const mirroredEdit = (e) => ({ ...e, move: e.move ? [-e.move[0], e.move[1], e.move[2]] : undefined, turn: e.turn ? [-e.turn[0], e.turn[1], -e.turn[2]] : undefined });

// write the pane's vertices from the part's as-built copy through the edit (an empty edit puts them back)
export const applyPaneEdit = (node, root, pane, edit) => {
  if (!node.userData.paneBase) {
    const g = node.geometry.clone(); g.userData = node.geometry.userData;
    node.geometry = g; node.userData.patchGeo = true;
    node.userData.paneBase = { pos: Float32Array.from(g.attributes.position.array), nor: g.attributes.normal ? Float32Array.from(g.attributes.normal.array) : null };
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
// the patch's panes table on a built (and op-applied) model: find(id, sig) is applyPatch's resolver
export const applyPaneEdits = (root, table, find, out) => {
  for (const [key, e] of Object.entries(table || {})) {
    const node = e && find(e.id, e.sig);
    const pane = node?.isMesh && node.parent ? paneRangeFor(node, e) : null;
    if (!pane) { out.unmatched.push('pane:' + key); out.warnings.push('pane edits: no window pane "' + key + '" in this build'); continue; }
    try { applyPaneEdit(node, root, pane, e); out.applied++; } catch (err) { out.warnings.push('pane ' + key + ': ' + err.message); }
  }
};

// ---- the GAP and SNAP TO BODY ------------------------------------------------------------------------------------------------------------
// the pane's rim in the car's frame: its outline's points (the triangle edges used once), and points every 4 cm along each edge
export const rimPoints = (node, root, pane, step = 0.04) => {
  const M = toModelOf(node, root), pos = node.geometry.attributes.position, edges = new Map(), v = new THREE.Vector3();
  const key = (i) => { v.fromBufferAttribute(pos, i); return Math.round(v.x * 1e4) + ',' + Math.round(v.y * 1e4) + ',' + Math.round(v.z * 1e4); };
  for (const t of paneTris(node.geometry, pane)) for (let k = 0; k < 3; k++) {
    const a = t[k], b = t[(k + 1) % 3], ka = key(a), kb = key(b); if (ka === kb) continue;
    const id = ka < kb ? ka + '|' + kb : kb + '|' + ka;
    const e = edges.get(id); if (e) e.n++; else edges.set(id, { a, b, n: 1 });
  }
  let rim = [...edges.values()].filter(e => e.n === 1);
  if (!rim.length) rim = [...edges.values()];
  const out = [], seen = new Set(), A = new THREE.Vector3(), B = new THREE.Vector3();
  for (const e of rim) {
    A.fromBufferAttribute(pos, e.a).applyMatrix4(M); B.fromBufferAttribute(pos, e.b).applyMatrix4(M);
    const n = Math.max(1, Math.ceil(A.distanceTo(B) / step));
    for (let i = 0; i < n; i++) { const p = A.clone().lerp(B, i / n), k = p.toArray().map(x => Math.round(x * 1000)).join(','); if (!seen.has(k)) { seen.add(k); out.push(p); } }
  }
  if (out.length > 240) { const k = out.length / 240; return out.filter((_, i) => Math.floor(i % k) === 0).slice(0, 240); }
  return out;
};
// what a pane rests on, as triangles in the car's frame: the body's meshes (whole), and the OTHER panes of the car's glass ({ mesh, tris }:
// their vertex index triples), so a pane that meets another pane (a glass box's faces, a screen wrapped into its side windows) rests
export const bodyTriangles = (root, items) => {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), list = [], v = new THREE.Vector3();
  for (const it of items) {
    const m = it.isMesh ? it : it.mesh, pos = m?.geometry?.attributes?.position; if (!pos) continue;
    const M = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), idx = m.geometry.index?.array;
    const start = m.geometry.drawRange?.start || 0, end = Math.min(idx ? idx.length : pos.count, start + (m.geometry.drawRange?.count ?? Infinity));
    const triples = it.isMesh ? null : it.tris;
    const n = triples ? triples.length : Math.max(0, Math.floor((end - start) / 3));
    for (let j = 0; j < n; j++) {
      const tri = new Float32Array(9), t = start + j * 3;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, triples ? triples[j][k] : idx ? idx[t + k] : t + k).applyMatrix4(M); tri[k * 3] = v.x; tri[k * 3 + 1] = v.y; tri[k * 3 + 2] = v.z; }
      list.push(tri);
    }
  }
  const n = list.length, tris = new Float32Array(n * 9), lo = new Float32Array(n * 3), hi = new Float32Array(n * 3);
  list.forEach((t, i) => { tris.set(t, i * 9); for (let a = 0; a < 3; a++) { lo[i * 3 + a] = Math.min(t[a], t[3 + a], t[6 + a]); hi[i * 3 + a] = Math.max(t[a], t[3 + a], t[6 + a]); } });
  return { n, tris, lo, hi };
};
const TRI = new THREE.Triangle(), Q = new THREE.Vector3();
// the nearest body point to p within `cap` (null beyond it)
export const nearestBody = (body, p, cap = PANE_CAP) => {
  let best = cap, at = null;
  for (let i = 0; i < body.n; i++) {
    const i3 = i * 3;
    if (p.x < body.lo[i3] - best || p.x > body.hi[i3] + best || p.y < body.lo[i3 + 1] - best || p.y > body.hi[i3 + 1] + best || p.z < body.lo[i3 + 2] - best || p.z > body.hi[i3 + 2] + best) continue;
    const t = body.tris, k = i * 9;
    TRI.a.set(t[k], t[k + 1], t[k + 2]); TRI.b.set(t[k + 3], t[k + 4], t[k + 5]); TRI.c.set(t[k + 6], t[k + 7], t[k + 8]);
    TRI.closestPointToPoint(p, Q);
    const d = Q.distanceTo(p);
    if (d < best) { best = d; at = Q.clone(); }
  }
  return at ? { q: at, d: best } : null;
};
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// the gap: { gap (m: the median over the rim of its distance to the body beyond the rest allowance), clear (m: the rim's nearest point to
// the body; PANE_CAP and more: nothing within reach), points }
export const gapOf = (pts, body) => {
  const ds = pts.map(p => nearestBody(body, p)?.d ?? PANE_CAP);
  return { gap: r4(median(ds.map(d => Math.max(0, d - PANE_CONTACT)))), clear: r4(ds.length ? Math.min(...ds) : PANE_CAP), points: pts.length };
};
export const paneGap = (root, node, pane, body) => gapOf(rimPoints(node, root, pane), body);

// small 6x6 solve (Gaussian elimination with partial pivots)
const solve = (A, b) => {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
};
// SNAP: the move and turn (about `pivot`, the pane's centre now) that rest the rim on the body. -> { R: Matrix4 (rotation), t: Vector3,
// moved (m), turned (deg), before, after: gapOf } or null when the body is out of reach of the whole rim
export const snapPane = (pts0, body, pivot, { iters = 60, rotate = true } = {}) => {
  const before = gapOf(pts0, body);
  let pts = pts0.map(p => p.clone());
  const R = new THREE.Matrix4(), t = new THREE.Vector3(), c = pivot.clone();
  let used = 0;
  for (let it = 0; it < iters; it++) {
    const pairs = [];
    for (const p of pts) {
      const h = nearestBody(body, p); if (!h) continue;
      const dir = h.d > 1e-6 ? p.clone().sub(h.q).divideScalar(h.d) : null;
      pairs.push([p, dir ? h.q.clone().addScaledVector(dir, PANE_STANDOFF) : p.clone()]);
    }
    used = pairs.length;
    if (pairs.length < 3) break;
    // minimise sum |p + w x (p - c') + d - q|^2 over (w, d), c' the pane's centre now
    const cc = c.clone().add(t), A = Array.from({ length: 6 }, () => new Array(6).fill(0)), b = new Array(6).fill(0);
    for (const [p, q] of pairs) {
      const r = p.clone().sub(cc), e = q.clone().sub(p);
      // the rows of J = [ -[r]x | I ] (3 x 6) : J x = e
      const J = [[0, r.z, -r.y, 1, 0, 0], [-r.z, 0, r.x, 0, 1, 0], [r.y, -r.x, 0, 0, 0, 1]], E = [e.x, e.y, e.z];
      for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) { b[i] += J[k][i] * E[k]; for (let j = 0; j < 6; j++) A[i][j] += J[k][i] * J[k][j]; }
    }
    const lam = 1e-4 * pairs.length; for (let i = 0; i < 6; i++) A[i][i] += i < 3 ? lam * 4 : lam;
    if (!rotate) for (let i = 0; i < 3; i++) { A[i].fill(0); A.forEach(r => { r[i] = 0; }); A[i][i] = 1; b[i] = 0; }
    const x = solve(A, b); if (!x) break;
    const w = new THREE.Vector3(x[0], x[1], x[2]), ang = Math.min(w.length(), 0.035), d = new THREE.Vector3(x[3], x[4], x[5]);
    const dR = ang > 1e-9 ? new THREE.Matrix4().makeRotationAxis(w.clone().normalize(), ang) : new THREE.Matrix4();
    pts = pts.map(p => p.clone().sub(cc).applyMatrix4(dR).add(cc).add(d));
    R.premultiply(dR); t.add(d);
    if (d.length() < 2e-5 && ang < 2e-5) break;
  }
  if (!used) return null;
  const after = gapOf(pts, body), angle = new THREE.Quaternion().setFromRotationMatrix(R);
  return { R, t, moved: r4(t.length()), turned: Math.round(2 * Math.acos(Math.min(1, Math.abs(angle.w))) * 57.29577951308232 * 10) / 10, before, after, points: pts };
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
