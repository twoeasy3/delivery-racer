// ---- CAR KIT CHECKS: measure a built spec against the rules (three.js passed in; Node or browser) -----------------------------
// runChecks(THREE, spec) -> { results: [{ id, status: 'pass' | 'warn' | 'fail', what, detail }], stats }
// Every check is geometry, measured: no pictures. Thresholds are in the code next to each check and in FORMAT.md.
import { buildCar, expandWheels, expandParts, GLASS_TAGS, mountFrames, framePoint } from './build.mjs';
import { validateSpec } from './validate.mjs';
import { CLASSES, BUDGETS, RATIO } from './classes.mjs';
import { findZFights } from './zfight.mjs';

const cm = (m) => (m * 100).toFixed(1) + ' cm';
const f2 = (v) => v.toFixed(2);

export const runChecks = (THREE, spec) => {
  const results = [];
  const add = (id, status, what, detail = '') => results.push({ id, status, what, detail });
  // 1. the format
  const { errors, warnings } = validateSpec(spec);
  if (errors.length) { add('schema', 'fail', 'spec is valid', errors.length + ' error(s):\n    ' + errors.join('\n    ')); return { results, stats: null }; }
  add('schema', warnings.length ? 'warn' : 'pass', 'spec is valid', warnings.length ? warnings.join('\n    ') : 'no errors, no warnings');
  let U, M;
  try {
    U = buildCar(THREE, spec, { merge: false });
    M = buildCar(THREE, spec, { merge: true });
  } catch (e) { add('build', 'fail', 'the spec builds', String(e && e.stack || e)); return { results, stats: null }; }
  U.updateMatrixWorld(true); M.updateMatrixWorld(true);
  const cls = CLASSES[spec.class], bud = BUDGETS[spec.class];

  // ---- the triangles, per part, in car space ---------------------------------------------------------------------------------
  const parts = []; // { name, mesh, role, wheel?, glass, tris: Float32Array (9 per triangle), box }
  U.traverse((n) => {
    if (!n.isMesh) return;
    const g = n.geometry, p = g.attributes.position, idx = g.index;
    const count = idx ? idx.count : p.count, t = new Float32Array(count * 3), v = new THREE.Vector3();
    for (let i = 0; i < count; i++) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(n.matrixWorld); t[i * 3] = v.x; t[i * 3 + 1] = v.y; t[i * 3 + 2] = v.z; }
    const box = new THREE.Box3().setFromBufferAttribute(new THREE.BufferAttribute(t, 3));
    parts.push({ name: n.userData.part || n.name, mesh: n, role: n.userData.role || n.material.userData.role, wheel: n.userData.wheel || null, glass: (n.material.userData.role === 'glass'), tag: n.userData.tag, tris: t, box, single: false });
  });
  const specOf = new Map(expandParts(spec).map(e => [e.name, e.part]));
  for (const p of parts) { const sp = specOf.get(p.name); p.single = !!sp && sp.shape === 'panel' && !(sp.thickness > 0); p.sheet = p.single && (p.role === 'glass' || p.role === 'plate'); p.spec = sp; }

  // ---- 2. budgets ------------------------------------------------------------------------------------------------------------
  let mTris = 0, mMeshes = 0; const mMats = new Set();
  M.traverse((n) => { if (!n.isMesh) return; mMeshes++; mTris += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; mMats.add(n.material); });
  const nParts = expandParts(spec).length;
  const grade = (v, [w, f]) => (v > f ? 'fail' : v > w ? 'warn' : 'pass');
  add('budget-tris', grade(mTris, bud.tris), 'triangles within budget', mTris + ' (aim under ' + bud.tris[0] + ', never over ' + bud.tris[1] + ' for class ' + spec.class + ')');
  add('budget-meshes', grade(mMeshes, bud.meshes), 'meshes (draw calls) within budget', mMeshes + ' after joining by material (warn over ' + bud.meshes[0] + ', fail over ' + bud.meshes[1] + ')');
  add('budget-materials', grade(mMats.size, bud.mats), 'materials within budget', mMats.size + ' (warn over ' + bud.mats[0] + ', fail over ' + bud.mats[1] + ')');
  add('budget-parts', grade(nParts, bud.parts), 'parts within budget', nParts + ' parts after mirroring (warn over ' + bud.parts[0] + ', fail over ' + bud.parts[1] + ')');

  // ---- 3. nothing absurd -----------------------------------------------------------------------------------------------------
  let nan = 0, zero = 0; const zeroParts = new Set();
  for (const p of parts) {
    const t = p.tris;
    for (let i = 0; i < t.length; i += 9) {
      if (!Number.isFinite(t[i] + t[i + 1] + t[i + 2] + t[i + 3] + t[i + 4] + t[i + 5] + t[i + 6] + t[i + 7] + t[i + 8])) { nan++; continue; }
      const ux = t[i + 3] - t[i], uy = t[i + 4] - t[i + 1], uz = t[i + 5] - t[i + 2], vx = t[i + 6] - t[i], vy = t[i + 7] - t[i + 1], vz = t[i + 8] - t[i + 2];
      const a = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
      if (a < 1e-8) { zero++; zeroParts.add(p.name); }
    }
  }
  add('sane-geometry', nan || zero ? 'fail' : 'pass', 'no NaN, no zero-area triangles', nan || zero ? nan + ' NaN, ' + zero + ' zero-area triangle(s) in: ' + [...zeroParts].join(', ') : 'all ' + parts.reduce((s, p) => s + p.tris.length / 9, 0) + ' triangles fine');

  // ---- 4. size and place -----------------------------------------------------------------------------------------------------
  const all = new THREE.Box3(); for (const p of parts) all.union(p.box);
  const size = all.getSize(new THREE.Vector3()), mid = all.getCenter(new THREE.Vector3());
  const inR = (v, [a, b]) => v >= a && v <= b;
  const sizeOk = inR(size.z, cls.length) && inR(size.x, cls.width) && inR(size.y, cls.height);
  add('size-class', sizeOk ? 'pass' : 'fail', 'size fits its class (' + spec.class + ')',
    'L ' + f2(size.z) + ' (' + cls.length.join('-') + ')  W ' + f2(size.x) + ' (' + cls.width.join('-') + ')  H ' + f2(size.y) + ' (' + cls.height.join('-') + ') m');
  const ratio = size.x / size.z;
  add('size-ratio', spec.class === 'truck' ? 'pass' : ratio < RATIO.fail ? 'fail' : ratio < RATIO.warn ? 'warn' : 'pass', 'not narrow (width / length)', f2(ratio) + ' (the game\'s median 0.46; warn under ' + RATIO.warn + ')');
  add('centred', Math.abs(mid.x) <= 0.02 && Math.abs(mid.z) <= 0.25 ? 'pass' : 'fail', 'centred on x = 0 and z = 0', 'box middle x ' + cm(mid.x) + ' (within 2 cm), z ' + cm(mid.z) + ' (within 25 cm)');
  let lowPart = null, low = Infinity;
  for (const p of parts) if (!p.wheel && p.box.min.y < low) { low = p.box.min.y; lowPart = p.name; }
  add('above-ground', low >= -0.002 ? 'pass' : 'fail', 'nothing below the ground (y = 0)', 'lowest non-wheel point ' + cm(low) + ' (' + lowPart + ')');

  // ---- spatial index of every triangle (for distances) -----------------------------------------------------------------------
  const CELL = 0.12, grid = new Map(), triList = [];
  const key = (i, j, k) => i + ',' + j + ',' + k;
  parts.forEach((p, pi) => {
    const t = p.tris;
    for (let i = 0; i < t.length; i += 9) {
      const ti = triList.length; triList.push([pi, i]);
      const lo = [0, 1, 2].map(c => Math.floor(Math.min(t[i + c], t[i + 3 + c], t[i + 6 + c]) / CELL)), hi = [0, 1, 2].map(c => Math.floor(Math.max(t[i + c], t[i + 3 + c], t[i + 6 + c]) / CELL));
      for (let a = lo[0]; a <= hi[0]; a++) for (let b = lo[1]; b <= hi[1]; b++) for (let c = lo[2]; c <= hi[2]; c++) {
        const k = key(a, b, c); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(ti);
      }
    }
  });
  const closest = new THREE.Vector3(), tri = new THREE.Triangle(), P = new THREE.Vector3();
  const triOf = (ti) => { const [pi, i] = triList[ti], t = parts[pi].tris; tri.a.set(t[i], t[i + 1], t[i + 2]); tri.b.set(t[i + 3], t[i + 4], t[i + 5]); tri.c.set(t[i + 6], t[i + 7], t[i + 8]); return pi; };
  // the parts within `r` of point q (r <= CELL), with their distance: Map(part index -> distance)
  const near = (q, r, skip = -1) => {
    const out = new Map(), seen = new Set();
    const i0 = Math.floor((q.x - r) / CELL), i1 = Math.floor((q.x + r) / CELL), j0 = Math.floor((q.y - r) / CELL), j1 = Math.floor((q.y + r) / CELL), k0 = Math.floor((q.z - r) / CELL), k1 = Math.floor((q.z + r) / CELL);
    for (let a = i0; a <= i1; a++) for (let b = j0; b <= j1; b++) for (let c = k0; c <= k1; c++) for (const ti of grid.get(key(a, b, c)) || []) {
      if (seen.has(ti)) continue; seen.add(ti);
      const pi = triOf(ti); if (pi === skip) continue;
      tri.closestPointToPoint(q, closest);
      const d = closest.distanceTo(q);
      if (d <= r && (!out.has(pi) || out.get(pi) > d)) out.set(pi, d);
    }
    return out;
  };
  // is q inside part pi's closed shell? (a ray along +x, crossings counted)
  const inside = (q, pi) => {
    const p = parts[pi]; if (!p.box.containsPoint(q)) return false;
    const t = p.tris; let hits = 0;
    for (let i = 0; i < t.length; i += 9) {
      // (the triangle's projection on the y-z plane contains (q.y, q.z), and it crosses at x > q.x)
      const ay = t[i + 1], az = t[i + 2], by = t[i + 4], bz = t[i + 5], cy = t[i + 7], cz = t[i + 8];
      const d = (by - ay) * (cz - az) - (bz - az) * (cy - ay); if (Math.abs(d) < 1e-12) continue;
      const u = ((q.y - ay) * (cz - az) - (q.z - az) * (cy - ay)) / d, v = ((by - ay) * (q.z - az) - (bz - az) * (q.y - ay)) / d;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const x = t[i] + u * (t[i + 3] - t[i]) + v * (t[i + 6] - t[i]);
      if (x > q.x) hits++;
    }
    return hits % 2 === 1;
  };
  // sample points over a part's surface: its vertices' centroids and area-weighted random points (seeded)
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const samples = (p, n) => {
    const t = p.tris, out = [], areas = []; let total = 0;
    for (let i = 0; i < t.length; i += 9) {
      const ux = t[i + 3] - t[i], uy = t[i + 4] - t[i + 1], uz = t[i + 5] - t[i + 2], vx = t[i + 6] - t[i], vy = t[i + 7] - t[i + 1], vz = t[i + 8] - t[i + 2];
      const a = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2; areas.push(a); total += a;
      out.push({ q: new THREE.Vector3((t[i] + t[i + 3] + t[i + 6]) / 3, (t[i + 1] + t[i + 4] + t[i + 7]) / 3, (t[i + 2] + t[i + 5] + t[i + 8]) / 3), w: a, n: new THREE.Vector3(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx).normalize() });
      for (let c = 0; c < 9; c += 3) out.push({ q: new THREE.Vector3(t[i + c], t[i + c + 1], t[i + c + 2]), w: 0, n: null });
    }
    for (let s = 0; s < n && total > 0; s++) {
      let r = rnd() * total, i = 0; while (i < areas.length - 1 && r > areas[i]) { r -= areas[i]; i++; }
      let a = rnd(), b = rnd(); if (a + b > 1) { a = 1 - a; b = 1 - b; }
      const o = i * 9;
      out.push({ q: new THREE.Vector3(t[o] + a * (t[o + 3] - t[o]) + b * (t[o + 6] - t[o]), t[o + 1] + a * (t[o + 4] - t[o + 1]) + b * (t[o + 7] - t[o + 1]), t[o + 2] + a * (t[o + 5] - t[o + 2]) + b * (t[o + 8] - t[o + 2])), w: total / n, n: out[i * 4].n });
    }
    return out;
  };
  const rc = new THREE.Raycaster();
  const solidIdx = parts.map((p, i) => i).filter(i => !parts[i].glass && !parts[i].single && !parts[i].wheel);
  const cast = (from, dir, far = 20) => { rc.set(from, dir.clone().normalize()); rc.near = 0; rc.far = far; return rc.intersectObject(U, true); };

  // ---- 5. wheels --------------------------------------------------------------------------------------------------------------
  const W = expandWheels(spec);
  const wheelParts = (key) => parts.filter(p => p.wheel === key);
  add('wheels-count', W.length >= 4 ? 'pass' : 'fail', '4 or more wheels', W.length + ' wheels: ' + W.map(w => w.key).join(' '));
  const ground = W.map(w => ({ w, bottom: w.y - w.radius }));
  const bad = ground.filter(g => Math.abs(g.bottom) > 0.01);
  add('wheels-ground', bad.length ? 'fail' : 'pass', 'every wheel touches the ground (bottom within 1 cm of y = 0)', ground.map(g => g.w.key + ' ' + cm(g.bottom)).join(', '));
  const rBad = W.filter(w => !inR(w.radius, cls.wheel));
  add('wheels-size', rBad.length ? 'warn' : 'pass', 'wheel radius usual for the class', W.map(w => w.key + ' r ' + f2(w.radius)).join(', ') + ' (usual ' + cls.wheel.join('-') + ' m)');
  if (!spec.asymmetric) {
    const unpaired = W.filter(w => Math.abs(w.x) > 0.01 && !W.some(o => o !== w && Math.abs(o.x + w.x) < 0.01 && Math.abs(o.z - w.z) < 0.01 && Math.abs(o.radius - w.radius) < 0.005 && Math.abs(o.width - w.width) < 0.005));
    add('wheels-pairs', unpaired.length ? 'fail' : 'pass', 'wheels in matching left / right pairs', unpaired.length ? 'no partner for ' + unpaired.map(w => w.key).join(', ') : W.length / 2 + ' pairs, mirrored within 1 cm');
  }
  // round: the tyre's box is as tall as it is long (no squashed wheels)
  const unround = W.filter(w => { const t = wheelParts(w.key).find(p => p.name.startsWith('tyre')); if (!t) return true; const s = t.box.getSize(new THREE.Vector3()); return Math.abs(s.y - s.z) > 0.02 * s.y; });
  add('wheels-round', unround.length ? 'fail' : 'pass', 'wheels are round', unround.length ? 'not round: ' + unround.map(w => w.key).join(', ') : 'all round');
  // visible from the side: rays from outside at the tyre's lower half meet that wheel first
  const buried = [], gaps = [], stalks = [];
  for (const w of W) {
    const side = w.x >= 0 ? 1 : -1, mine = new Set(wheelParts(w.key).map(p => p.mesh));
    let seen = 0;
    for (const dz of [-0.35, 0, 0.35]) for (const dy of [-0.55, -0.25]) {
      const from = new THREE.Vector3(side * (size.x / 2 + 2), w.y + dy * w.radius, w.z + dz * w.radius);
      const h = cast(from, new THREE.Vector3(-side, 0, 0))[0];
      if (h && mine.has(h.object)) seen++;
    }
    if (!seen) buried.push(w.key);
    if (spec.openWheels) continue;
    // under the body: straight up from the top of the tyre (and a little in from it), the body within reach
    let best = Infinity;
    for (const dx of [0, -side * w.width * 0.4, side * w.width * 0.4]) for (const dz of [0, 0.25 * w.radius, -0.25 * w.radius]) {
      const from = new THREE.Vector3(w.x + dx, w.y + w.radius * 0.6, w.z + dz);
      if (solidIdx.some(i => inside(from, i))) { best = Math.min(best, 0); continue; } // (the tyre's top is up inside the body)
      const hits = cast(from, new THREE.Vector3(0, 1, 0), 2).filter(h => !mine.has(h.object) && !h.object.userData.wheel);
      if (hits[0]) best = Math.min(best, hits[0].point.y - (w.y + w.radius));
    }
    if (best === Infinity) stalks.push(w.key + ' nothing above it');
    else if (best > 0.3) stalks.push(w.key + ' body ' + cm(best) + ' above the tyre');
    else if (best > 0.12) gaps.push(w.key + ' ' + cm(best));
  }
  add('wheels-visible', buried.length ? 'fail' : 'pass', 'wheels not buried in the body (seen from the side)', buried.length ? 'hidden from the side: ' + buried.join(', ') : 'every wheel shows from the side');
  if (!spec.openWheels) add('wheels-under-arch', stalks.length ? 'fail' : gaps.length ? 'warn' : 'pass', 'wheels sit under the body (no wheels on legs, no gap over the tyre)',
    stalks.length ? stalks.join('; ') + ' (the tyre top must be within 30 cm of the body over it: no stalks)' : gaps.length ? 'gap over the tyre (warn over 12 cm): ' + gaps.join(', ') : 'body within 12 cm over every tyre');

  // ---- 6. symmetry --------------------------------------------------------------------------------------------------------------
  if (!spec.asymmetric) {
    let offArea = 0, total = 0; const offParts = new Map(), lopsided = [];
    for (let pi = 0; pi < parts.length; pi++) {
      const p = parts[pi]; if (p.wheel || p.spec?.asymmetric) continue; // (a part the spec says is one-sided: an exhaust, a fuel cap)
      let mine = 0, off = 0;
      for (const s of samples(p, Math.min(60, Math.max(12, p.tris.length / 9)))) {
        if (!s.w) continue;
        total += s.w; mine += s.w;
        P.set(-s.q.x, s.q.y, s.q.z);
        const n = near(P, 0.01);
        if (!n.size) { offArea += s.w; off += s.w; offParts.set(p.name, (offParts.get(p.name) || 0) + s.w); }
      }
      if (mine && off / mine > 0.25) lopsided.push(p.name + ' (' + Math.round(off / mine * 100) + '%)');
    }
    const share = total ? offArea / total : 0, worst = [...offParts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, a]) => n + ' ' + (a / total * 100).toFixed(1) + '%');
    add('symmetry', share > 0.03 || lopsided.length ? 'fail' : share > 0.005 ? 'warn' : 'pass', 'symmetric about x = 0 (or "asymmetric": true)', (share * 100).toFixed(2) + '% of the surface has no mirror twin within 1 cm' + (lopsided.length ? '; parts with no twin for over 25% of their own surface: ' + lopsided.join(', ') : '') + (worst.length && !lopsided.length ? ' (most: ' + worst.join(', ') + ')' : ''));
  }

  // ---- 7. z-fighting -------------------------------------------------------------------------------------------------------------
  const fights = findZFights(THREE, U, { gap: 0.004 });
  const visibleF = fights.filter(f => !f.sameColour), doubled = fights.filter(f => f.sameColour);
  const fname = (f) => (f.a.userData.part || f.a.name) + ' / ' + (f.b.userData.part || f.b.name) + ' (' + (f.area * 10000).toFixed(1) + ' cm2, ' + (f.gapMin * 1000).toFixed(1) + '-' + (f.gapMax * 1000).toFixed(1) + ' mm apart, at ' + f.at.toArray().map(v => v.toFixed(2)).join(',') + ')';
  add('z-fighting', visibleF.length ? 'fail' : doubled.length ? 'warn' : 'pass', 'no z-fighting (no two visible surfaces within 4 mm)',
    visibleF.length ? visibleF.length + ' pair(s):\n    ' + visibleF.slice(0, 12).map(fname).join('\n    ') + (doubled.length ? '\n    and ' + doubled.length + ' doubled surface(s) of one colour' : '') : doubled.length ? doubled.length + ' doubled surface(s) of one colour (cannot flicker, but wasteful):\n    ' + doubled.slice(0, 8).map(fname).join('\n    ') : 'none');

  // ---- 8. closed shells, outward faces -------------------------------------------------------------------------------------------
  const open = [], inverted = [], nonManifold = [];
  for (const p of parts) {
    if (p.sheet) continue; // (a glass or plate sheet: an open surface by design)
    const t = p.tris, ids = new Map(), vid = (i) => { const k = Math.round(t[i] * 1e4) + ',' + Math.round(t[i + 1] * 1e4) + ',' + Math.round(t[i + 2] * 1e4); let v = ids.get(k); if (v === undefined) { v = ids.size; ids.set(k, v); } return v; };
    const edges = new Map();
    let vol = 0;
    for (let i = 0; i < t.length; i += 9) {
      const a = vid(i), b = vid(i + 3), c = vid(i + 6);
      for (const [x, y] of [[a, b], [b, c], [c, a]]) { if (x === y) continue; const k = x + '>' + y; edges.set(k, (edges.get(k) || 0) + 1); }
      vol += (t[i] * (t[i + 4] * t[i + 8] - t[i + 5] * t[i + 7]) - t[i + 1] * (t[i + 3] * t[i + 8] - t[i + 5] * t[i + 6]) + t[i + 2] * (t[i + 3] * t[i + 7] - t[i + 4] * t[i + 6])) / 6;
    }
    let openE = 0, bad = 0;
    for (const [k, n] of edges) { const [x, y] = k.split('>'); const back = edges.get(y + '>' + x) || 0; if (!back) openE++; else if (back !== n) bad++; }
    if (openE) open.push(p.name + ' (' + openE + ' open edges)');
    if (bad) nonManifold.push(p.name);
    if (vol < -1e-9) inverted.push(p.name);
  }
  add('closed-shells', open.length || nonManifold.length ? 'fail' : 'pass', 'every shape is closed (no open shells but glass sheets)', open.length || nonManifold.length ? [...open, ...nonManifold.map(n => n + ' (edges shared unevenly)')].join(', ') : 'all ' + parts.filter(p => !p.sheet).length + ' solid parts closed');
  add('outward-faces', inverted.length ? 'fail' : 'pass', 'faces point outward (nothing inside out)', inverted.length ? 'inside out: ' + inverted.join(', ') : 'all outward');

  // ---- 9. floating parts --------------------------------------------------------------------------------------------------------
  const solids = parts.map((p, i) => i).filter(i => !parts[i].wheel);
  const link = new Map(solids.map(i => [i, new Set()]));
  for (const i of solids) {
    const p = parts[i], tol = p.glass || p.single ? 0.035 : 0.006;
    for (const s of samples(p, 80)) {
      for (const [j] of near(s.q, tol, i)) if (link.has(j)) { link.get(i).add(j); link.get(j).add(i); }
    }
    for (const j of solids) { // (wholly inside another part: overlaps it)
      if (j === i || link.get(i).has(j) || !parts[j].box.intersectsBox(p.box)) continue;
      const q = p.box.getCenter(new THREE.Vector3());
      if (inside(q, j) || samples(p, 0).slice(0, 40).some(s => inside(s.q, j))) { link.get(i).add(j); link.get(j).add(i); }
    }
  }
  // (wheels: tied to the body by the under-arch check above; a tyre touching a part also links it)
  let root = solids[0], biggest = -1;
  for (const i of solids) { if (parts[i].role !== 'body') continue; const s = parts[i].box.getSize(new THREE.Vector3()); const v = s.x * s.y * s.z; if (v > biggest) { biggest = v; root = i; } }
  const reached = new Set([root]), queue = [root];
  while (queue.length) { const i = queue.pop(); for (const j of link.get(i) || []) if (!reached.has(j)) { reached.add(j); queue.push(j); } }
  const islands = solids.filter(i => !reached.has(i)).map(i => parts[i].name);
  add('no-floating', islands.length ? 'fail' : 'pass', 'no floating parts (every part touches or overlaps the body)', islands.length ? 'not connected to "' + parts[root].name + '": ' + islands.join(', ') : 'all ' + solids.length + ' parts connected to "' + parts[root].name + '"');

  // ---- 10. glass -----------------------------------------------------------------------------------------------------------------
  const glass = parts.filter(p => p.glass), glassMeshes = new Set(glass.map(p => p.mesh));
  const facing = [], buriedG = [], floatingG = [], edgeGap = [];
  // the gap between a pane and the body behind it: from the pane's BACK face (a slab's inner face; a sheet's only face) to the
  // first thing that is not glass, along -dir (null: nothing within 50 cm)
  const GLASS_GAP = 0.03;
  const gapBehind = (q, dir, mesh) => {
    const hits = cast(q.clone().addScaledVector(dir, 0.004), dir.clone().negate(), 3); // (far: a pane sunk in the body meets its far side, turned away)
    let back = 0.004;
    for (const h of hits) if (h.object === mesh && h.distance < 0.1) back = Math.max(back, h.distance);
    // (the pane's back sunk inside a solid part: no gap there)
    const bp = q.clone().addScaledVector(dir, 0.004 - back - 0.001);
    if (solidIdx.some(i => inside(bp, i))) return 0;
    for (const h of hits) {
      if (h.object === mesh || glassMeshes.has(h.object)) continue;
      return Math.max(0, h.distance - back);
    }
    return null;
  };
  // (rays for the glass see both sides of every face, so a pane sunk into the body meets the body's inside)
  const sides = new Map(); U.traverse(n => { if (n.isMesh) { sides.set(n.material, n.material.side); n.material.side = THREE.DoubleSide; } });
  for (const p of glass) {
    const ss = samples(p, 30).filter(s => s.n);
    // its outward facing (area-weighted mean normal, single sheets were turned outward by the builder)
    // (its OUTER face: the faces turned away from the car's middle; a thin slab's inner face is left out)
    const gc = p.box.getCenter(new THREE.Vector3()), outOf = (n) => (Math.abs(n.x) > 0.55 ? new THREE.Vector3(Math.sign(gc.x) || 1, 0, 0) : gc.clone().sub(new THREE.Vector3(0, mid.y, mid.z)).normalize());
    const nrm = new THREE.Vector3(); for (const s of ss) if (s.n.dot(outOf(s.n)) > 0.2) nrm.addScaledVector(s.n, s.w);
    if (nrm.lengthSq() < 1e-12) for (const s of ss) nrm.addScaledVector(s.n, s.w);
    nrm.normalize();
    const want = GLASS_TAGS[p.tag];
    const ok = want === 'windscreen' ? nrm.z > 0.25 : want === 'rear' ? nrm.z < -0.25 : want === 'side' ? Math.abs(nrm.x) > 0.5 : want === 'roof' ? nrm.y > 0.7 : true;
    if (!ok) facing.push(p.name + ' faces ' + nrm.toArray().map(v => v.toFixed(2)).join(','));
    // seen from outside, along its own outward normal; sitting on the body (inward, the body within 4 cm)
    let vis = 0, seat = 0, n = 0;
    const use = p.single ? [nrm] : null;
    for (const s of ss.filter(s => s.w > 0).slice(0, 30)) {
      const dir = use ? use[0] : s.n.dot(nrm) > 0.7 ? s.n : null; if (!dir) continue;
      n++;
      const out = cast(s.q.clone().addScaledVector(dir, 0.002), dir, 4).filter(h => !glassMeshes.has(h.object) && !h.object.userData.prop);
      if (!out.length) vis++;
      const g = gapBehind(s.q, dir, p.mesh);
      if (g !== null && g <= GLASS_GAP) seat++;
    }
    if (n && vis / n < 0.6) buriedG.push(p.name + ' (' + Math.round(vis / n * 100) + '% seen)');
    if (n && seat / n < 0.6) floatingG.push(p.name + ' (' + Math.round(seat / n * 100) + '% backed)');
    // its rim: points 1.5 cm in from each corner toward its middle, the body behind them within 4 cm (no gap at the cowl or the roof)
    const t = p.tris, c = p.box.getCenter(new THREE.Vector3());
    let rim = 0, rimOk = 0;
    for (let i = 0; i < t.length; i += 3) {
      const v = new THREE.Vector3(t[i], t[i + 1], t[i + 2]);
      const toMid = c.clone().sub(v); if (toMid.length() < 0.03) continue;
      const q = v.addScaledVector(toMid.normalize(), 0.015);
      rim++;
      const g = gapBehind(q, nrm, p.mesh);
      if (g !== null && g <= GLASS_GAP) rimOk++;
      if (rim > 40) break;
    }
    if (rim && rimOk / rim < 0.8) edgeGap.push(p.name + ' (' + Math.round(rimOk / rim * 100) + '% of its rim backed)');
  }
  for (const [m, sd] of sides) m.side = sd;
  const wsCount = glass.filter(p => p.tag === 'windscreen').length;
  add('glass-tagged', 'pass', 'glass tagged', glass.length + ' pane(s): ' + glass.map(p => p.mesh.name).join(', ') + (wsCount ? '' : ' (no windscreen: ' + (spec.noWindscreen || '') + ')'));
  add('glass-facing', facing.length ? 'fail' : 'pass', 'each pane faces the way its tag says', facing.length ? facing.join('; ') : 'windscreen forward, rear window back, side windows sideways');
  add('glass-visible', buriedG.length ? 'fail' : 'pass', 'glass not buried inside the body', buriedG.length ? buriedG.join(', ') : 'every pane seen from outside (60% or more of it)');
  add('glass-seated', floatingG.length || edgeGap.length ? 'fail' : 'pass', 'glass sits on the body (no floating panes, no gap at its rim)', floatingG.length || edgeGap.length ? [...floatingG, ...edgeGap].join(', ') + ' (the body must be within 3 cm behind the back of the pane, rim included)' : 'every pane backed by the body within 3 cm of its back face, rim included');

  // ---- 11. lamps -----------------------------------------------------------------------------------------------------------------
  const lampSeen = (p, front) => {
    const mesh = p.mesh, s = samples(p, 6).filter(x => x.w > 0 && x.n && (front ? x.n.z > 0.3 : x.n.z < -0.3));
    return s.some(x => { const h = cast(new THREE.Vector3(x.q.x, x.q.y, front ? all.max.z + 1 : all.min.z - 1), new THREE.Vector3(0, 0, front ? -1 : 1), 30)[0]; return h && h.object === mesh; });
  };
  const heads = parts.filter(p => p.tag === 'headlight'), tails = parts.filter(p => p.tag === 'taillight' || p.tag === 'brake-light');
  const headBad = heads.filter(p => p.box.getCenter(new THREE.Vector3()).z < 0 || !lampSeen(p, true)).map(p => p.name);
  const tailBad = tails.filter(p => p.box.getCenter(new THREE.Vector3()).z > 0 || !lampSeen(p, false)).map(p => p.name);
  add('lights-front', !heads.length || headBad.length ? 'fail' : 'pass', 'headlights at the front, seen from ahead', heads.length ? (headBad.length ? 'hidden or not at the front: ' + headBad.join(', ') : heads.map(p => p.name).join(', ')) : 'none tagged "headlight"');
  add('lights-rear', !tails.length || tailBad.length ? 'fail' : 'pass', 'tail lamps at the back, seen from behind', tails.length ? (tailBad.length ? 'hidden or not at the back: ' + tailBad.join(', ') : tails.map(p => p.name).join(', ')) : 'none tagged "taillight" / "brake-light"');

  // ---- 12. mounts: roof, cargo, wing, plates, decal areas -----------------------------------------------------------------------
  const MS = spec.mounts || {};
  for (const slot of ['roof', 'wing']) if (MS[slot]?.none) add('mount-' + slot, 'warn', slot + ' mount present', '"none": ' + MS[slot].none + ' (every car should offer a ' + slot + ' area; say why not)');
  if (MS.cargo?.none) add('mount-cargo', 'pass', 'cargo mount present or explained', '"none": ' + MS.cargo.none);
  const frames = mountFrames(spec);
  const V3 = (a) => new THREE.Vector3(...a);
  const paintRole = (r) => r === 'body' || r === 'accent' || (r || '').startsWith('paint:');
  for (const f of frames) {
    const n = V3(f.n), problems = [], notes = [];
    const nu = f.kind === 'decal' ? 7 : 5, nv = f.kind === 'decal' ? 4 : 5;
    const own = (o) => f.kind === 'prop' && o.userData.prop === f.slot; // (the slot's own prop: hidden when a cosmetic is put there)
    let centre = null, offs = [], angles = [], miss = 0, wrong = new Set();
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = -0.9 + 1.8 * i / (nu - 1), b = -0.9 + 1.8 * j / (nv - 1);
      const q = V3(framePoint(f, a, b, 0.3));
      const h = cast(q, n.clone().negate(), 0.6).filter(x => !glassMeshes.has(x.object) && !own(x.object) && !x.object.userData.wheel)[0];
      const hAll = cast(q, n.clone().negate(), 0.6).filter(x => !own(x.object))[0];
      if (!h) { miss++; continue; }
      const off = 0.3 - h.distance; offs.push(off);
      if (h.face) { const fn = h.face.normal.clone().transformDirection(h.object.matrixWorld); angles.push(Math.acos(Math.max(-1, Math.min(1, fn.dot(n)))) * 180 / Math.PI); }
      if (f.kind === 'decal' && hAll && (hAll.object !== h.object || !paintRole(h.object.userData.role || h.object.material.userData.role))) wrong.add(hAll.object.userData.part || hAll.object.name);
      if (Math.abs(a) < 0.3 && Math.abs(b) < 0.3) centre = off;
    }
    const total = nu * nv;
    if (centre === null) { const ct = cast(V3(framePoint(f, 0, 0, 0.3)), n.clone().negate(), 0.6).filter(x => !glassMeshes.has(x.object) && !own(x.object))[0]; centre = ct ? 0.3 - ct.distance : null; }
    if (centre === null) problems.push('no surface under its middle (floating)');
    else if (Math.abs(centre) > 0.03) problems.push('its middle is ' + cm(centre) + (centre > 0 ? ' under the surface (buried)' : ' above the surface (floating)'));
    if (miss) problems.push(miss + ' of ' + total + ' points of the area have no surface under them (it hangs off the edge)');
    const depth = offs.length ? Math.max(...offs) - Math.min(...offs) : 0, curve = angles.length ? Math.max(...angles) : 0;
    if (f.kind === 'decal') {
      if (depth > f.maxDepth) problems.push('not flat: ' + cm(depth) + ' deep (max ' + cm(f.maxDepth) + ')');
      if (curve > f.maxCurve) problems.push('curves ' + curve.toFixed(0) + ' deg (max ' + f.maxCurve + ')');
      if (wrong.size) problems.push('something other than paint is in the area: ' + [...wrong].join(', '));
    } else {
      if (depth > 0.08) problems.push('surface not flat enough: ' + cm(depth) + ' up and down (max 8 cm)');
      else if (depth > 0.04) notes.push('surface ' + cm(depth) + ' up and down (sunk in up to 8 cm is allowed)');
    }
    // free above it, for its height (roof, cargo, wing: a prop there touches nothing)
    if (f.kind === 'prop') {
      const clip = new Set();
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const a = -0.95 + 1.9 * i / 4, b = -0.95 + 1.9 * j / 4;
        const base = V3(framePoint(f, a, b, 0));
        const top = cast(base.clone().addScaledVector(n, 0.3), n.clone().negate(), 0.6).filter(x => !glassMeshes.has(x.object) && !own(x.object) && !x.object.userData.wheel)[0];
        const from = base.clone().addScaledVector(n, (top ? 0.3 - top.distance : 0) + 0.01);
        for (const h of cast(from, n, f.height)) if (!own(h.object)) { clip.add(h.object.userData.part || h.object.name); break; }
      }
      if (clip.size) problems.push('not free: ' + [...clip].join(', ') + ' inside the ' + cm(f.height) + ' above it');
    }
    const label = f.kind === 'decal' ? 'decal "' + f.name + '"' : f.slot;
    add('mount-' + f.name.replace(/\s+/g, '-'), problems.length ? 'fail' : notes.length ? 'warn' : 'pass', label + ' area on the body, flat and free',
      (problems.length ? problems.join('; ') + '. ' : notes.length ? notes.join('; ') + '. ' : '') + f.size.map(v => f2(v)).join(' x ') + ' m' + (f.kind === 'prop' ? ', ' + f2(f.height) + ' m free above' : '') + ', at ' + f.at.map(v => v.toFixed(2)).join(',') + ', depth ' + cm(depth) + ', curve ' + curve.toFixed(0) + ' deg');
  }
  // mounts do not overlap each other (their boxes: the area times its free height)
  const insideFrame = (q, f) => { const d = [q[0] - f.at[0], q[1] - f.at[1], q[2] - f.at[2]]; const a = d[0] * f.u[0] + d[1] * f.u[1] + d[2] * f.u[2], b = d[0] * f.v[0] + d[1] * f.v[1] + d[2] * f.v[2], c = d[0] * f.n[0] + d[1] * f.n[1] + d[2] * f.n[2]; return Math.abs(a) < f.size[0] / 2 && Math.abs(b) < f.size[1] / 2 && c > -0.01 && c < f.height; };
  const overlaps = [];
  for (let i = 0; i < frames.length; i++) for (let j = i + 1; j < frames.length; j++) {
    const A = frames[i], B = frames[j]; let hit = false;
    for (let a = -0.9; a <= 0.91 && !hit; a += 0.3) for (let b = -0.9; b <= 0.91 && !hit; b += 0.3) for (const c of [0.005, A.height / 2, A.height * 0.95]) if (insideFrame(framePoint(A, a, b, c), B)) { hit = true; break; }
    if (hit) overlaps.push(A.name + ' / ' + B.name);
  }
  if (frames.length) add('mounts-apart', overlaps.length ? 'fail' : 'pass', 'mount areas do not overlap', overlaps.length ? overlaps.join(', ') : frames.length + ' areas, none overlapping');
  const decals = frames.filter(f => f.kind === 'decal');
  add('decal-areas', !decals.length ? 'warn' : decals.some(f => f.spec.side === 'left' || f.spec.side === 'right') && !spec.asymmetric ? 'warn' : 'pass', 'decal areas given, on both sides',
    decals.length ? decals.map(f => f.name).join(', ') + ' (frames: origin at, u, v; size in m)' : 'none (most cars should offer at least one flank area on both sides)');

  // ---- 13. moving parts ----------------------------------------------------------------------------------------------------------
  if ((spec.animate || []).length) {
    let okA = true;
    try { for (const t of [0, 0.37, 1.1, 2.9]) { U.userData.animate(t); U.updateMatrixWorld(true); U.traverse(n => { if (!Number.isFinite(n.matrixWorld.elements[12] + n.matrixWorld.elements[13] + n.matrixWorld.elements[14])) okA = false; }); } U.userData.animate(0); } catch { okA = false; }
    add('animate', okA ? 'pass' : 'fail', 'animations run', (spec.animate || []).map(a => a.type + ' ' + a.target).join(', '));
  }

  const stats = { triangles: mTris, meshes: mMeshes, materials: mMats.size, parts: nParts, size: [size.x, size.y, size.z].map(v => +v.toFixed(3)), wheels: W.length, lamps: M.userData.lamps };
  return { results, stats };
};

export const formatResults = ({ results, stats }, name = '') => {
  const lines = [];
  if (name) lines.push('check ' + name);
  for (const r of results) lines.push((r.status === 'pass' ? 'PASS ' : r.status === 'warn' ? 'WARN ' : 'FAIL ') + r.what + (r.detail ? ': ' + r.detail : ''));
  const n = (s) => results.filter(r => r.status === s).length;
  lines.push('');
  if (stats) lines.push('stats: ' + stats.triangles + ' triangles, ' + stats.meshes + ' meshes, ' + stats.materials + ' materials, ' + stats.parts + ' parts, ' + stats.wheels + ' wheels, size W x H x L ' + stats.size.join(' x ') + ' m');
  lines.push((n('fail') ? 'FAILED' : 'PASSED') + ': ' + n('pass') + ' pass, ' + n('warn') + ' warn, ' + n('fail') + ' fail');
  return lines.join('\n');
};
