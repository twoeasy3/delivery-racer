// ---- SHAPE EDITS (the owner, 15-Oct: "Make it possible to edit ANY extruded shape in the model editor. I want it to be a plain build at the
// end, not a build-and-patch. Mirrored mode on."): the OUTLINE of every extruded, flat or lathed shape a car's code builds, recorded as plain
// data while the model is BUILT, and an edited outline read as a BUILD INPUT (never a change to the built mesh), as the glass edits are
// (CHECKLIST 301, render/ideaModelsDkit.js withGlassEdits).
//
// HOW: three.js reads a shape's outline in one place: Shape.extractPoints (ExtrudeGeometry, ShapeGeometry), and a lathe's profile is its
// `points`. Inside withShapeEdits(table, fn) those are hooked: each outline gets an id from its own points (`s<hash>#<n>`: the hash of its
// points to 0.1 mm, `n` the how-many-th outline with those points in this build; a lathe `l<hash>#<n>`), and when the table names that id
// (or `s<hash>` for every one of them) the edited points are built instead. Nothing else changes: the same code, the same helpers, the same
// bevels, merges and draw calls. Outside withShapeEdits nothing is hooked at all (the plain game never installs the hooks).
// With `record`, every outline is listed (lastShapeReport().records): its id, kind ('extrude' | 'flat' | 'lathe'), its points [[u, v], ...]
// in its own plane (a side extrusion's [z, y]; a lathe's [radius, height]), its depth / bevel, and the geometry made from it (with its
// vertices as first made, so the editor can find where it ended up: locateShapes).
// CACHES: a model built inside withShapeEdits (edits or recording) caches nothing: every model file's geometry cache asks shapesLive() and
// makes its own copy (so the plain cars' cache is never touched, and every outline is really built, in order, each time).
// The end state is plain code: scripts/bake-shapes.mjs <car> writes the edited points into the car's source where the outline is written,
// proves the source builds the same model, and takes the table out of the patch.
import * as THREE from 'three';

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
const r4 = (v) => Math.round(v * 10000) / 10000;
let state = null, installed = false, lastReport = { records: [], used: [], unused: [], edits: null };

// true while a model is built with shape edits or recorded: a geometry cache makes a fresh copy instead (see above)
export const shapesLive = () => !!state;
export const lastShapeReport = () => lastReport;
const keyOf = (prefix, pts) => prefix + fnv(pts.map(q => q[0] + ',' + q[1]).join(';'));
const valid = (e) => Array.isArray(e) && e.length >= 3 && e.every(q => Array.isArray(q) && q.length >= 2 && Number.isFinite(+q[0]) && Number.isFinite(+q[1]));
// the next id for these points, the edit for it (if any), and its record (when recording)
const take = (prefix, pts, kind) => {
  const key = keyOf(prefix, pts), n = state.occ.get(key) || 0;
  state.occ.set(key, n + 1);
  const id = key + '#' + n;
  const e = state.edits ? (state.edits[id] !== undefined ? state.edits[id] : state.edits[key]) : null;
  if (state.edits) { if (state.edits[id] !== undefined) state.used.add(id); else if (state.edits[key] !== undefined) state.used.add(key); }
  const edit = valid(e) ? e.map(q => [+q[0], +q[1]]) : null;
  let rec = null;
  if (state.rec) {
    rec = { i: state.rec.length, id, key, n, kind, pts, edited: !!edit, now: edit || pts, holes: 0, opts: null, geo: null, raw: null };
    if (state.stacks) rec.stack = new Error().stack;
    state.rec.push(rec);
  }
  return { id, edit, rec };
};
const install = () => {
  if (installed) return;
  installed = true;
  const extract = THREE.Shape.prototype.extractPoints;
  THREE.Shape.prototype.extractPoints = function (divisions) {
    const out = extract.call(this, divisions);
    if (!state || state.busy) return out;
    const pts = out.shape.map(v => [r4(v.x), r4(v.y)]);
    const { edit, rec } = take('s', pts, 'extrude');
    if (rec) { rec.holes = out.holes.length; state.pending.push(rec); }
    return edit ? { shape: edit.map(([a, b]) => new THREE.Vector2(a, b)), holes: out.holes } : out;
  };
  const clone = THREE.BufferGeometry.prototype.clone; // (three's clone makes a geometry of the default shape first, then copies: not an outline of the car's)
  THREE.BufferGeometry.prototype.clone = function () {
    if (!state || state.busy) return clone.call(this);
    state.busy = true;
    try { return clone.call(this); } finally { state.busy = false; }
  };
  const setIndex = THREE.BufferGeometry.prototype.setIndex;
  THREE.BufferGeometry.prototype.setIndex = function (index) {
    if (state && !state.busy && this.type === 'LatheGeometry' && !this.userData.shapeSub) {
      const P = this.parameters, pts = P.points.map(v => [r4(v.x), r4(v.y)]);
      const { edit, rec } = take('l', pts, 'lathe');
      if (rec) { rec.geo = this; rec.opts = { segments: P.segments, phiStart: P.phiStart, phiLength: P.phiLength }; this.userData.shapeIds = [rec.id]; this.userData.shapeRec = rec; }
      if (edit) {
        state.busy = true;
        try { this.userData.shapeSub = new THREE.LatheGeometry(edit.map(([a, b]) => new THREE.Vector2(a, b)), P.segments, P.phiStart, P.phiLength); } finally { state.busy = false; }
        this.parameters = { ...P, points: edit.map(([a, b]) => new THREE.Vector2(a, b)) };
        index = this.userData.shapeSub.index;
      }
    }
    return setIndex.call(this, index);
  };
  const setAttribute = THREE.BufferGeometry.prototype.setAttribute;
  THREE.BufferGeometry.prototype.setAttribute = function (name, attr) {
    if (this.userData.shapeSub) { // (a lathe built from its edited profile: its own arrays swapped for the edited one's)
      const sub = this.userData.shapeSub;
      attr = sub.getAttribute(name) || attr;
      if (name === 'normal') delete this.userData.shapeSub;
    }
    if (state && !state.busy && name === 'position') {
      if (state.pending.length && (this.type === 'ExtrudeGeometry' || this.type === 'ShapeGeometry')) {
        const o = this.parameters.options || {};
        for (const rec of state.pending) {
          rec.geo = this; rec.raw = attr.array.slice();
          rec.kind = this.type === 'ExtrudeGeometry' ? 'extrude' : 'flat';
          rec.opts = this.type === 'ExtrudeGeometry' ? { depth: o.depth ?? 1, bevel: o.bevelEnabled !== false ? { thickness: o.bevelThickness ?? 0.2, size: o.bevelSize ?? (o.bevelThickness ?? 0.2) - 0.1, segments: o.bevelSegments ?? 3 } : null, curveSegments: o.curveSegments ?? 12 } : { curveSegments: this.parameters.curveSegments };
          rec.shapes = state.pending.length;
        }
        this.userData.shapeIds = state.pending.map(r => r.id);
        state.pending = [];
      } else if (this.userData.shapeRec && !this.userData.shapeRec.raw) this.userData.shapeRec.raw = attr.array.slice();
    }
    return setAttribute.call(this, name, attr);
  };
};

// build `fn()` with the shape edits table { '<id>': [[u, v], ...] } (null: none); { record: true } lists every outline; { stacks: true } keeps
// where in the code each was made (scripts/bake-shapes.mjs). With no edits and no recording it is fn() itself, nothing hooked.
export const withShapeEdits = (edits, fn, { record = false, stacks = false } = {}) => {
  const has = edits && typeof edits === 'object' && Object.keys(edits).length > 0;
  if (!has && !record) {
    const prev = state; state = null;
    try { return fn(); } finally { state = prev; lastReport = { records: [], used: [], unused: [], edits: null }; }
  }
  install();
  const prev = state;
  state = { edits: has ? edits : null, rec: record ? [] : null, stacks, occ: new Map(), used: new Set(), pending: [], busy: false };
  const mine = state;
  try { return fn(); } finally {
    state = prev;
    lastReport = { records: mine.rec || [], used: [...mine.used], unused: has ? Object.keys(edits).filter(k => !mine.used.has(k)) : [], edits: has ? edits : null };
  }
};

// ---- the model editor's side ------------------------------------------------------------------------------------------------
// the model editor builds its car with its own patch's table (and records); the game's patch files are read by modelpatchapply.js
let override = null;
export const setShapeOverride = (o) => { override = o; };
// THE CAR'S SCOPE: a car's own model (not its cosmetics) is built inside this (render/showcar.js, items.js, ideaslot.js), so the ids count
// only the car's own outlines
export const carShapes = (edits, fn) => {
  const model = override ? withShapeEdits(override.edits, fn, override) : withShapeEdits(edits, fn);
  if (model?.isObject3D && lastReport.edits) model.userData.shapeEdits = { used: lastReport.used, unused: lastReport.unused }; // (for the patch's report: modelpatch.js)
  return model;
};

// the two points of a shape's plane in its own geometry's first frame: an extrusion's / flat shape's (u, v) is its (x, y); a lathe's
// (radius, height) stands at phi = 0: (0, height, radius) with the lathe's sin / cos
const planePoint = (rec, [u, v], w = 0) => (rec.kind === 'lathe'
  ? new THREE.Vector3(u * Math.sin(rec.opts.phiStart || 0), v, u * Math.cos(rec.opts.phiStart || 0))
  : new THREE.Vector3(u, v, w));
// the affine map from a geometry's vertices as first made (raw) to where they are now (cur): solved on four spread, non-coplanar vertices
const affine = (raw, cur, offset) => {
  const n = raw.length / 3;
  if (!n) return null;
  const P = (a, i) => new THREE.Vector3(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
  const C = (i) => new THREE.Vector3(cur[(offset + i) * 3], cur[(offset + i) * 3 + 1], cur[(offset + i) * 3 + 2]);
  let a = 0, b = 0, best = -1;
  for (let i = 0; i < n; i++) { const d = P(raw, i).distanceToSquared(P(raw, 0)); if (d > best) { best = d; b = i; } }
  best = -1; let c = 0;
  const ab = P(raw, b).sub(P(raw, a));
  for (let i = 0; i < n; i++) { const d = new THREE.Vector3().crossVectors(ab, P(raw, i).sub(P(raw, a))).lengthSq(); if (d > best) { best = d; c = i; } }
  const nrm = new THREE.Vector3().crossVectors(ab, P(raw, c).sub(P(raw, a)));
  best = 0; let d4 = -1;
  for (let i = 0; i < n; i++) { const d = Math.abs(P(raw, i).sub(P(raw, a)).dot(nrm)); if (d > best + 1e-9) { best = d; d4 = i; } }
  const R = new THREE.Matrix4(), M = new THREE.Matrix4();
  const cols = [a, b, c].map(i => [P(raw, i), C(i)]);
  if (d4 >= 0 && best > 1e-7) cols.push([P(raw, d4), C(d4)]);
  else { // (a flat shape: the fourth point off its plane, carried along the normal, kept to the same length)
    const rn = nrm.clone().normalize(), ca = C(a), cn = new THREE.Vector3().crossVectors(C(b).sub(ca), C(c).sub(ca)).normalize().multiplyScalar(C(b).distanceTo(ca) / Math.max(1e-9, P(raw, b).distanceTo(P(raw, a))));
    cols.push([P(raw, a).add(rn), ca.clone().add(cn)]);
  }
  const e = (k) => cols.map(([p]) => p.getComponent(k));
  R.set(...e(0), ...e(1), ...e(2), 1, 1, 1, 1);
  const f = (k) => cols.map(([, q]) => q.getComponent(k));
  M.set(...f(0), ...f(1), ...f(2), 1, 1, 1, 1);
  if (Math.abs(R.determinant()) < 1e-12) return null;
  return M.multiply(R.invert());
};
// the vertices a geometry draws, de-indexed (as a merge or toNonIndexed lays them)
const flatPositions = (geo) => {
  const p = geo.attributes.position.array;
  if (!geo.index) return p;
  const idx = geo.index.array, out = new Float32Array(idx.length * 3);
  for (let i = 0; i < idx.length; i++) { out[i * 3] = p[idx[i] * 3]; out[i * 3 + 1] = p[idx[i] * 3 + 1]; out[i * 3 + 2] = p[idx[i] * 3 + 2]; }
  return out;
};
const findRun = (hay, needle) => { // (where `needle` stands in `hay`, vertex-aligned, or -1)
  const n = needle.length;
  if (!n || n > hay.length) return -1;
  for (let i = 0; i + n <= hay.length; i += 3) {
    if (hay[i] !== needle[0] || hay[i + 1] !== needle[1] || hay[i + 2] !== needle[2]) continue;
    let ok = true;
    for (let j = 3; j < n && ok; j++) ok = hay[i + j] === needle[j];
    if (ok) return i / 3;
  }
  return -1;
};
const findAffineRun = (raw, hay) => {
  const n = raw.length / 3, total = hay.length / 3;
  if (n < 4 || n > total) return null;
  const sample = Array.from({ length: Math.min(16, n) }, (_, k) => Math.floor(k * (n - 1) / Math.max(1, Math.min(16, n) - 1)));
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  let size = 0;
  for (let i = 0; i < raw.length; i++) size = Math.max(size, Math.abs(raw[i]));
  for (let start = 0; start + n <= total; start++) {
    const A = affine(raw, hay, start);
    if (!A) continue;
    let ok = true;
    for (const i of sample) {
      v.set(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]).applyMatrix4(A);
      w.set(hay[(start + i) * 3], hay[(start + i) * 3 + 1], hay[(start + i) * 3 + 2]);
      if (v.distanceToSquared(w) > 1e-8 * Math.max(1, size * size)) { ok = false; break; }
    }
    if (ok) return { start, A };
  }
  return null;
};
// WHERE EACH OUTLINE ENDED UP in the built model: its mesh (the geometry itself, or a merged one holding its vertices), and `toModel`, the
// matrix from the shape's plane (planePoint) to the model's space; a shape whose geometry was changed after it was merged is left unfound
// (mesh null). Sets rec.mesh, rec.toModel, rec.count (its vertices), rec.start (its first vertex in the mesh's drawn order)
export const locateShapes = (root, records) => {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const meshes = [];
  root.traverse((n) => { if (n.isMesh && n.geometry?.attributes.position) meshes.push(n); });
  const flat = new Map();
  for (const rec of records) {
    rec.mesh = null; rec.toModel = null; rec.meshToModel = null;
    if (!rec.geo || !rec.raw) continue;
    const mine = flatPositions(rec.geo), rawFlat = rec.geo.index ? (() => { const idx = rec.geo.index.array, o = new Float32Array(idx.length * 3); for (let i = 0; i < idx.length; i++) { o[i * 3] = rec.raw[idx[i] * 3]; o[i * 3 + 1] = rec.raw[idx[i] * 3 + 1]; o[i * 3 + 2] = rec.raw[idx[i] * 3 + 2]; } return o; })() : rec.raw;
    if (rawFlat.length !== mine.length) continue;
    const at = (m, start, A) => {
      rec.mesh = m; rec.start = start; rec.count = mine.length / 3;
      rec.meshToModel = new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld);
      rec.toModel = rec.meshToModel.clone().multiply(A);
    };
    for (const m of meshes) { // (its own geometry, or its vertices as they are now inside a merged one)
      if (m.geometry !== rec.geo && !flat.has(m.geometry)) flat.set(m.geometry, flatPositions(m.geometry));
      const start = m.geometry === rec.geo ? 0 : findRun(flat.get(m.geometry), mine);
      if (start < 0) continue;
      const A = affine(rawFlat, m.geometry === rec.geo ? mine : flat.get(m.geometry), m.geometry === rec.geo ? 0 : start);
      if (A) { at(m, start, A); break; }
    }
    if (rec.mesh) continue;
    for (const m of meshes) { // (else a copy of it moved, turned or scaled before it was merged: a run that is an affine image of it as made)
      if (!flat.has(m.geometry)) flat.set(m.geometry, flatPositions(m.geometry));
      const found = findAffineRun(rawFlat, flat.get(m.geometry));
      if (found) { at(m, found.start, found.A); break; }
    }
  }
  return records;
};
// the outline's points in the model's space (on its plane: an extrusion's near face is w = 0), for drawing it on the car
// the shape's own plane in the model (its near face for an extrusion), and a point of the model read back as the shape's (u, v): for dragging a
// point on the car itself (the model editor)
export const shapePlane = (rec) => {
  if (!rec.toModel) return null;
  const a = planePoint(rec, [0, 0]).applyMatrix4(rec.toModel), b = planePoint(rec, [1, 0]).applyMatrix4(rec.toModel), c = planePoint(rec, [0, 1]).applyMatrix4(rec.toModel);
  return new THREE.Plane().setFromCoplanarPoints(a, b, c);
};
export const modelToShape = (rec, p) => {
  const q = p.clone().applyMatrix4(new THREE.Matrix4().copy(rec.toModel).invert());
  if (rec.kind !== 'lathe') return [r4(q.x), r4(q.y)];
  const phi = rec.opts.phiStart || 0;
  return [r4(Math.abs(Math.cos(phi)) > 0.5 ? q.z / Math.cos(phi) : q.x / Math.sin(phi)), r4(q.y)];
};
export const outlineInModel = (rec, pts = rec.now, w = 0) => (rec.toModel ? pts.map(q => planePoint(rec, q, w).applyMatrix4(rec.toModel)) : []);

// THE VIEW a shape is edited in (the model editor): the model axes it is seen along (a side shape from the side: z to the right, y up; a plan
// shape from above; a front shape from the front), and the maps between its own (u, v) and that view's (h, v) in metres
export const shapeView = (rec) => {
  if (!rec.toModel) return null;
  const o = planePoint(rec, [0, 0]).applyMatrix4(rec.toModel), du = planePoint(rec, [1, 0]).applyMatrix4(rec.toModel).sub(o), dv = planePoint(rec, [0, 1]).applyMatrix4(rec.toModel).sub(o);
  const n = new THREE.Vector3().crossVectors(du, dv), a = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
  const [name, H, V] = a[0] >= a[1] && a[0] >= a[2] ? ['side', 2, 1] : a[1] >= a[2] ? ['top', 2, 0] : ['front', 0, 1];
  const c = (vec, k) => vec.getComponent(k);
  const det = c(du, H) * c(dv, V) - c(dv, H) * c(du, V);
  const toView = ([u, v]) => [c(o, H) + u * c(du, H) + v * c(dv, H), c(o, V) + u * c(du, V) + v * c(dv, V)];
  const fromView = ([h, w]) => { const x = h - c(o, H), y = w - c(o, V); return [r4((x * c(dv, V) - y * c(dv, H)) / det), r4((y * c(du, H) - x * c(du, V)) / det)]; };
  return { name, H, V, ok: Math.abs(det) > 1e-9, toView, fromView };
};
// MIRROR: each outline's PARTNER across the car, by its vertices in the model (as render/modelpatch.js symmetryOf pairs parts): the other
// outline whose vertex set is its own mirrored in x (to the millimetre); `self` when its mirror is itself (one shape across the car: a body
// side extruded the car's width, a lathe on the centre line). -> Map id -> { partner: id | null, self }
export const shapePartners = (records) => {
  const q = (x) => (x < 0 ? -Math.round(-x * 1000) : Math.round(x * 1000));
  const keys = new Map(), v = new THREE.Vector3();
  for (const rec of records) {
    if (!rec.mesh) continue;
    const pos = flatPositions(rec.mesh.geometry), m = rec.meshToModel;
    const plain = new Set(), flip = new Set();
    for (let i = rec.start; i < rec.start + rec.count; i++) { v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(m); plain.add(q(v.x) + ',' + q(v.y) + ',' + q(v.z)); flip.add(-q(v.x) + ',' + q(v.y) + ',' + q(v.z)); }
    keys.set(rec, [fnv([...plain].sort().join('|')), fnv([...flip].sort().join('|'))]);
    const b = new THREE.Box3();
    for (let i = rec.start; i < rec.start + rec.count; i++) b.expandByPoint(v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(m));
    rec.centre = b.getCenter(new THREE.Vector3());
  }
  const byPlain = new Map();
  for (const [rec, [p]] of keys) { if (!byPlain.has(p)) byPlain.set(p, []); byPlain.get(p).push(rec); }
  const out = new Map();
  for (const [rec, [p, f]] of keys) {
    const self = p === f;
    const twin = self ? null : (byPlain.get(f) || []).find(o => o !== rec) || null;
    out.set(rec.id, { partner: twin ? twin.id : null, self });
  }
  // (else the same outline standing across the car from it: a piece the code laid on each flank by moving one copy over, not by mirroring
  // it, as the Touring Car's wheel-arch flares; `loose`)
  for (const [rec] of keys) {
    const o = out.get(rec.id);
    if (o.partner || o.self || Math.abs(rec.centre.x) < 0.05) continue;
    const twin = [...keys.keys()].find(t => t !== rec && t.key === rec.key && !out.get(t.id).partner && !out.get(t.id).self && Math.abs(t.centre.x + rec.centre.x) < 0.15 && Math.abs(t.centre.y - rec.centre.y) < 0.01 && Math.abs(t.centre.z - rec.centre.z) < 0.01);
    if (twin) { out.set(rec.id, { partner: twin.id, self: false, loose: true }); out.set(twin.id, { partner: rec.id, self: false, loose: true }); }
  }
  return out;
};
// the partner's points for an edit of `rec`'s points: each point carried to the model, mirrored in x, and read back on the partner's plane
// (a side shape at the other flank keeps its [z, y]; a plan shape's across-the-car coordinate turns over). Its own point order is kept when
// the two outlines' points pair up one to one (else the edit's order).
export const mirrorPoints = (rec, twin, pts) => {
  if (!rec.toModel || !twin.toModel) return pts.map(q => q.slice());
  if (rec.kind === 'lathe') return pts.map(q => q.slice()); // (a lathe mirrored is the same profile)
  const S = new THREE.Matrix4().makeScale(-1, 1, 1), back = new THREE.Matrix4().copy(twin.toModel).invert();
  const map = ([u, v]) => { const p = planePoint(rec, [u, v]).applyMatrix4(rec.toModel).applyMatrix4(S).applyMatrix4(back); return [r4(p.x), r4(p.y)]; };
  const mapped = pts.map(map);
  if (pts.length === rec.pts.length && twin.pts.length === rec.pts.length) { // (same count: keep the twin's own numbering where it pairs up)
    const was = rec.pts.map(map), order = was.map(w => twin.pts.reduce((best, t, j) => { const d = Math.hypot(t[0] - w[0], t[1] - w[1]); return d < best[1] ? [j, d] : best; }, [-1, Infinity]));
    if (order.every(([, d]) => d < 0.002) && new Set(order.map(([j]) => j)).size === order.length) {
      const out = twin.pts.map(q => q.slice());
      order.forEach(([j], i) => { out[j] = mapped[i]; });
      return out;
    }
  }
  return mapped;
};
// the patch's `shapes` table: `pts` for the outline `id`; null takes it out (render/modelpatch.js keeps the table on the patch)
export const withShape = (patch, id, pts) => {
  const p = JSON.parse(JSON.stringify(patch));
  p.shapes = { ...(p.shapes || {}) };
  if (pts == null) delete p.shapes[id]; else p.shapes[id] = pts.map(q => [r4(q[0]), r4(q[1])]);
  if (!Object.keys(p.shapes).length) delete p.shapes;
  return p;
};
