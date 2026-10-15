// The PROP PLACEMENT search and its measures, shared by the generator (scripts/prop-anchors.mjs) and the audit (scripts/prop-placement-audit.mjs)
// (CHECKLIST 307; the owner, 15-Oct: the first placements were too small, not at the rear edge, sometimes on a car's own untagged wing, some
// roof props sunk too deep; then "lift the size caps, only keep a size floor"). It replaces the first generator's top-surface height map
// (prop-anchors-lib.mjs, removed) and works on the car's TRIANGLES as they are drawn:
//   carGeometry(model, glassy)       every visible triangle in car space (the Super kit and see-through parts too: they are drawn), each with
//                                    its mesh (name, kind body | glass | lamp | wheel | kit | clear, its prop tag), a grid over x / z
//   g.rays(x, z, allow)              every hit of a vertical line, top first ({ y, ny, m })
//   g.support(x, z, ceil, allow)     the highest UPWARD-facing hit at or under `ceil`
//   g.intrude(vol, allow)            the car's surface INSIDE a volume (a box, or a cylinder along x or y), clipped exactly: how far it
//                                    reaches in from the volume's faces (depth), its area, which meshes
//   g.widthAt(z, yMin)               the body's width across x at z (above yMin; no wheels)
//   g.blades(allow)                  thin horizontal plates with air under them (a spoiler, a rack shelf), clustered: { x0, x1, z0, z1, y, meshes }
//   best(g, ...)                     the OPTIMUM placement of a slot's shape: the largest uniform scale that stands on the surface (inset at
//                                    most `maxInset`), touches nothing, and (a wing) is no wider than the body; a wing prefers the rear
//   measureShape(g, ...)             a placed shape's numbers: support, gap, inset, intrusion
import * as THREE from 'three';

export const GRID = 0.1;
export const TOL = 0.015;          // m: the surface may touch a shape this far over its (un-sunk) base: contact, not a collision
export const KINDS = ['body', 'glass', 'lamp', 'wheel', 'kit', 'clear'];

// ---- the triangles ----
export const carGeometry = (model, glassy) => {
  model.updateMatrixWorld(true);
  const body = model.userData.body, bodyMat = body?.material, kit = model.userData.kit?.isObject3D ? model.userData.kit : null;
  const meshes = [], pos = [], tm = [];
  const v = new THREE.Vector3(), mat = new THREE.Matrix4(), inst = new THREE.Matrix4();
  model.traverse((n) => {
    if (!n.isMesh || !n.geometry || n.userData.propId) return;
    let inKit = false;
    for (let p = n; p; p = p.parent) { if (p.visible === false) return; if (kit && p === kit) inKit = true; }
    const m = [].concat(n.material)[0];
    if (!m || m.visible === false) return;
    let kind = 'body';
    if (m.transparent && m.opacity < 0.95) kind = 'clear';
    else if (m.isMeshBasicMaterial || (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0.25)) kind = 'lamp';
    else if (n !== body && m !== bodyMat && glassy(m)) kind = 'glass';
    else if (n.geometry.type === 'CylinderGeometry' && n.geometry.parameters.radiusTop >= 0.18 && Math.abs(Math.abs(n.rotation.z) - Math.PI / 2) < 0.02) kind = 'wheel';
    if (inKit && kind === 'body') kind = 'kit';
    const mi = meshes.length;
    meshes.push({ mesh: n, name: n.name || n.geometry.type, kind, tag: n.userData.prop || null });
    const g = n.geometry, p = g.attributes.position, idx = g.index, count = idx ? idx.count : p.count;
    const copies = n.isInstancedMesh ? n.count : 1;
    for (let c = 0; c < copies; c++) {
      mat.copy(n.matrixWorld);
      if (n.isInstancedMesh) { n.getMatrixAt(c, inst); mat.multiply(inst); }
      for (let t = 0; t + 2 < count; t += 3) {
        for (let k = 0; k < 3; k++) { v.fromBufferAttribute(p, idx ? idx.getX(t + k) : t + k).applyMatrix4(mat); pos.push(v.x, v.y, v.z); }
        tm.push(mi);
      }
    }
  });
  const P = new Float32Array(pos), M = new Int32Array(tm), T = M.length;
  const box = new THREE.Box3();
  for (let i = 0; i < P.length; i += 3) box.expandByPoint(v.set(P[i], P[i + 1], P[i + 2]));
  const gx0 = Math.floor(box.min.x / GRID) - 1, gz0 = Math.floor(box.min.z / GRID) - 1;
  const gnx = Math.ceil(box.max.x / GRID) - gx0 + 2, gnz = Math.ceil(box.max.z / GRID) - gz0 + 2;
  const cells = Array.from({ length: gnx * gnz }, () => []);
  const tb = new Float32Array(T * 6); // per triangle: min x y z, max x y z
  for (let t = 0; t < T; t++) {
    const o = t * 9;
    const xs = [P[o], P[o + 3], P[o + 6]], ys = [P[o + 1], P[o + 4], P[o + 7]], zs = [P[o + 2], P[o + 5], P[o + 8]];
    tb.set([Math.min(...xs), Math.min(...ys), Math.min(...zs), Math.max(...xs), Math.max(...ys), Math.max(...zs)], t * 6);
    const i0 = Math.floor(tb[t * 6] / GRID) - gx0, i1 = Math.floor(tb[t * 6 + 3] / GRID) - gx0, j0 = Math.floor(tb[t * 6 + 2] / GRID) - gz0, j1 = Math.floor(tb[t * 6 + 5] / GRID) - gz0;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) cells[i * gnz + j].push(t);
  }
  const stamp = new Int32Array(T); let gen = 0;
  const near = (x0, x1, z0, z1) => {
    gen++;
    const out = [];
    const i0 = Math.max(0, Math.floor(x0 / GRID) - gx0), i1 = Math.min(gnx - 1, Math.floor(x1 / GRID) - gx0), j0 = Math.max(0, Math.floor(z0 / GRID) - gz0), j1 = Math.min(gnz - 1, Math.floor(z1 / GRID) - gz0);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const t of cells[i * gnz + j]) if (stamp[t] !== gen) { stamp[t] = gen; out.push(t); }
    return out;
  };
  const ALL = () => true;
  // every hit of the vertical line at (x, z), highest first: { y, ny (the face's normal y, + up), m (mesh index) }
  const rays = (x, z, allow = ALL) => {
    const out = [];
    for (const t of near(x, x, z, z)) {
      if (!allow(M[t])) continue;
      const o = t * 9;
      if (x < tb[t * 6] - 1e-6 || x > tb[t * 6 + 3] + 1e-6 || z < tb[t * 6 + 2] - 1e-6 || z > tb[t * 6 + 5] + 1e-6) continue;
      const ax = P[o], ay = P[o + 1], az = P[o + 2], bx = P[o + 3], by = P[o + 4], bz = P[o + 5], cx = P[o + 6], cy = P[o + 7], cz = P[o + 8];
      const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
      if (Math.abs(det) < 1e-12) continue;
      const l1 = ((bx - x) * (cz - z) - (cx - x) * (bz - z)) / det, l2 = ((cx - x) * (az - z) - (ax - x) * (cz - z)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      // the face normal's y: (b - a) x (c - a), normalised
      const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, len = Math.hypot(nx, ny, nz) || 1;
      out.push({ y: l1 * ay + l2 * by + l3 * cy, ny: ny / len, m: M[t] });
    }
    return out.sort((a, b) => b.y - a.y);
  };
  // the highest upward-facing surface at or under `ceil` (null where there is none)
  const support = (x, z, ceil = Infinity, allow = ALL) => {
    for (const h of rays(x, z, allow)) if (h.y <= ceil + 1e-6 && h.ny > 0.05) return h;
    return null;
  };
  // the car's surface inside a volume: vol = { min: [x, y, z], max: [x, y, z], cyl?: { axis: 'x' | 'y', c: [x, y, z], r } }
  // -> { depth (m: how far the deepest point reaches in from the nearest face), area (m2), top (the highest y inside), meshes: Map(mi -> depth) }
  const intrude = (vol, allow = ALL) => {
    const [x0, y0, z0] = vol.min, [x1, y1, z1] = vol.max;
    const res = { depth: 0, area: 0, top: -Infinity, meshes: new Map() };
    if (x1 <= x0 || y1 <= y0 || z1 <= z0) return res;
    const planes = [[0, 1, x0], [0, -1, x1], [1, 1, y0], [1, -1, y1], [2, 1, z0], [2, -1, z2(z1)]];
    function z2(z) { return z; }
    const inner = (q) => { // how deep q is inside the volume (negative outside)
      let d = Math.min(q[0] - x0, x1 - q[0], q[1] - y0, y1 - q[1], q[2] - z0, z1 - q[2]);
      if (vol.cyl) {
        const { axis, c, r } = vol.cyl;
        const rr = axis === 'y' ? Math.hypot(q[0] - c[0], q[2] - c[2]) : Math.hypot(q[1] - c[1], q[2] - c[2]);
        d = Math.min(d, r - rr);
      }
      return d;
    };
    for (const t of near(x0, x1, z0, z1)) {
      if (!allow(M[t])) continue;
      if (tb[t * 6 + 3] < x0 || tb[t * 6] > x1 || tb[t * 6 + 4] < y0 || tb[t * 6 + 1] > y1 || tb[t * 6 + 5] < z0 || tb[t * 6 + 2] > z1) continue;
      const o = t * 9;
      let poly = [[P[o], P[o + 1], P[o + 2]], [P[o + 3], P[o + 4], P[o + 5]], [P[o + 6], P[o + 7], P[o + 8]]];
      for (const [ax, sg, val] of planes) { // Sutherland-Hodgman against each face
        const out = [];
        for (let k = 0; k < poly.length; k++) {
          const a = poly[k], b = poly[(k + 1) % poly.length];
          const da = sg * (a[ax] - val), db = sg * (b[ax] - val);
          if (da >= 0) out.push(a);
          if ((da >= 0) !== (db >= 0)) { const f = da / (da - db); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); }
        }
        poly = out;
        if (poly.length < 3) break;
      }
      if (poly.length < 3) continue;
      // sample the clipped polygon (a fan of triangles, each on a barycentric grid): its deepest point is usually inside it, not a corner
      let deep = -Infinity, area = 0, inside = 0, samples = 0;
      for (let k = 1; k + 1 < poly.length; k++) {
        const a = poly[0], b = poly[k], c = poly[k + 1];
        const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
        area += Math.hypot(...cr) / 2;
        const n = Math.min(14, Math.max(2, Math.ceil(Math.max(Math.hypot(...ab), Math.hypot(...ac)) / 0.02)));
        for (let i = 0; i <= n; i++) for (let j = 0; i + j <= n; j++) {
          const u = i / n, w = j / n, q = [a[0] + ab[0] * u + ac[0] * w, a[1] + ab[1] * u + ac[1] * w, a[2] + ab[2] * u + ac[2] * w];
          const d = inner(q);
          samples++;
          if (d >= 0) { inside++; if (d > deep) deep = d; if (q[1] > res.top) res.top = q[1]; }
        }
      }
      if (!inside) continue;
      res.area += area * inside / samples;
      if (deep > res.depth) res.depth = deep;
      res.meshes.set(M[t], Math.max(res.meshes.get(M[t]) || 0, deep));
    }
    return res;
  };
  // the body's width across x at z (the triangles cut by a slab z +- 0.05 above yMin; no wheels, no lamps, nothing see-through)
  const widthAt = (z, yMin = 0.25, allow = ALL) => {
    let lo = Infinity, hi = -Infinity;
    for (const t of near(box.min.x, box.max.x, z - 0.05, z + 0.05)) {
      const k = meshes[M[t]].kind;
      if (!allow(M[t]) || k === 'wheel' || k === 'clear') continue;
      if (tb[t * 6 + 5] < z - 0.05 || tb[t * 6 + 2] > z + 0.05 || tb[t * 6 + 4] < yMin) continue;
      const o = t * 9;
      // the triangle's cut by the plane z (its edges that cross it), and its corners inside the slab
      for (let k2 = 0; k2 < 3; k2++) {
        const ax = P[o + k2 * 3], ay = P[o + k2 * 3 + 1], az = P[o + k2 * 3 + 2];
        const k3 = (k2 + 1) % 3, bx = P[o + k3 * 3], by = P[o + k3 * 3 + 1], bz = P[o + k3 * 3 + 2];
        if (Math.abs(az - z) <= 0.05 && ay >= yMin) { lo = Math.min(lo, ax); hi = Math.max(hi, ax); }
        if ((az - z) * (bz - z) < 0) {
          const f = (z - az) / (bz - az), x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
          if (y >= yMin) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
        }
      }
    }
    return hi > lo ? { w: hi - lo, x0: lo, x1: hi } : { w: 0, x0: 0, x1: 0 };
  };
  // thin plates with AIR under them: a hit going down, its underside within 0.1 m, then 3 cm or more of nothing, then a surface facing up
  const blades = (allow = ALL, step = 0.04) => {
    const nx = Math.ceil((box.max.x - box.min.x) / step), nz = Math.ceil((box.max.z - box.min.z) / step);
    const cell = new Map();
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const x = box.min.x + i * step, z = box.min.z + j * step;
      const hs = rays(x, z, allow);
      if (hs.length < 3 || hs[0].ny <= 0.3) continue;
      const k0 = meshes[hs[0].m].kind;
      if (k0 !== 'body' && k0 !== 'kit') continue;
      let under = -1;
      for (let k = 1; k < hs.length; k++) if (hs[k].ny < -0.05) { under = k; break; }
      if (under < 0 || hs[0].y - hs[under].y > 0.1) continue;
      const below = hs.slice(under + 1).find(h => h.ny > 0.05);
      if (!below || hs[under].y - below.y < 0.03) continue;
      cell.set(i * (nz + 1) + j, { i, j, x, z, y: hs[0].y, gap: hs[under].y - below.y, m: hs[0].m });
    }
    const seen = new Set(), out = [];
    for (const [key, c] of cell) {
      if (seen.has(key)) continue;
      const comp = [], stack = [c]; seen.add(key);
      while (stack.length) {
        const a = stack.pop(); comp.push(a);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k2 = (a.i + di) * (nz + 1) + a.j + dj, b = cell.get(k2);
          if (b && !seen.has(k2) && Math.abs(b.y - a.y) < 0.08) { seen.add(k2); stack.push(b); }
        }
      }
      if (comp.length < 4) continue;
      const ms = new Map();
      for (const a of comp) ms.set(a.m, (ms.get(a.m) || 0) + 1);
      out.push({ x0: Math.min(...comp.map(a => a.x)), x1: Math.max(...comp.map(a => a.x)), z0: Math.min(...comp.map(a => a.z)), z1: Math.max(...comp.map(a => a.z)),
        y: comp.reduce((s, a) => s + a.y, 0) / comp.length, gap: Math.min(...comp.map(a => a.gap)), cells: comp.length, meshes: [...ms].sort((a, b) => b[1] - a[1]).map(([m]) => m) });
    }
    return out;
  };
  // is the surface hit `h` at (x, z) a THIN PLATE with air under it (a spoiler's blade, a rack's shelf)?
  const isBlade = (x, z, h, allow = ALL) => {
    const hs = rays(x, z, allow).filter(q => q.y < h.y - 1e-4 && meshes[q.m].kind !== 'clear');
    const under = hs.find(q => q.ny < -0.05);
    if (!under || h.y - under.y > 0.1) return false;
    const below = hs.find(q => q.y < under.y && q.ny > 0.05);
    return !!below && under.y - below.y >= 0.03 && under.y - below.y <= 0.35; // (more air than that is a cabin under its roof)
  };
  return { meshes, P, M, T, box, rays, support, intrude, widthAt, blades, near, isBlade };
};

// ---- a slot's shape at a scale: its size and its volume at a place ----
export const dims = (B, shape, s) => (shape === 'box' ? { W: B.box[0] * s, H: B.box[1] * s, D: B.box[2] * s }
  : B.cylinder.axis === 'y' ? { W: 2 * B.cylinder.radius * s, H: B.cylinder.height * s, D: 2 * B.cylinder.radius * s, cyl: 'y', r: B.cylinder.radius * s }
    : { W: B.cylinder.height * s, H: 2 * B.cylinder.radius * s, D: 2 * B.cylinder.radius * s, cyl: 'x', r: B.cylinder.radius * s });
// the volume of a shape whose (sunk) base is at y `base`, centred on (x, z); `bottom` cuts it from below (the surface may stand in it up to there)
export const volume = (d, x, base, z, bottom = base) => {
  const v = { min: [x - d.W / 2, Math.max(base, bottom), z - d.D / 2], max: [x + d.W / 2, base + d.H, z + d.D / 2] };
  if (d.cyl) v.cyl = { axis: d.cyl, c: [x, base + d.H / 2, z], r: d.r };
  return v;
};
// the footprint's sample points: [fx, fz] fractions of the half width and half depth (a cylinder standing up: its rim)
export const footprint = (d, slot) => {
  if (d.cyl === 'y') { const pts = [[0, 0]]; for (let k = 0; k < 8; k++) pts.push([0.92 * Math.cos(k * Math.PI / 4), 0.92 * Math.sin(k * Math.PI / 4)]); for (let k = 0; k < 8; k++) pts.push([0.5 * Math.cos(k * Math.PI / 4 + 0.39), 0.5 * Math.sin(k * Math.PI / 4 + 0.39)]); return pts; }
  if (slot === 'wing') { const pts = []; for (const fx of [-0.6, -0.3, 0, 0.3, 0.6]) for (const fz of [-0.85, 0, 0.85]) pts.push([fx, fz]); return pts; }
  const pts = []; for (const fx of [-0.92, -0.46, 0, 0.46, 0.92]) for (const fz of [-0.92, 0, 0.92]) pts.push([fx, fz]); return pts;
};

// an intrusion's depth, the Super kit's flat racing stripe forgiven (a 3 cm strip laid on the body: a prop may stand over it)
export const KIT_GRACE = 0.025;
export const effDepth = (g, r) => { let d = 0; for (const [mi, dd] of r.meshes) d = Math.max(d, g.meshes[mi].kind === 'kit' ? dd - KIT_GRACE : dd); return d; };
// the footprint's RIM (its corners and edges; a standing cylinder's outer ring): where the prop's base must touch
export const isRim = (d, slot, fx, fz) => (d.cyl === 'y' ? Math.hypot(fx, fz) > 0.9 : slot === 'wing' ? Math.abs(fx) >= 0.59 || Math.abs(fz) >= 0.84 : Math.abs(fx) >= 0.9 || Math.abs(fz) >= 0.9);
// ---- a placed shape measured: { base, top, inset, need, gaps, air, kinds, intr } ----
//   top   the highest support under the footprint (the shape's un-sunk base)    inset  as placed (top - base)
//   need  the LEAST inset that makes every corner touch (the lowest support under the footprint's corners, from the top)
//   air   the share of footprint points with no surface within 0.5 m under them   kinds  what the footprint stands on
export const measureShape = (g, B, slot, shape, s, x, y, z, inset, allow) => {
  const d = dims(B, shape, s), base = y - d.H / 2 - inset;
  const sup = [];
  for (const [fx, fz] of footprint(d, slot)) {
    const px = x + fx * d.W / 2, pz = z + fz * d.D / 2;
    const h = g.support(px, pz, base + inset + 0.02 + 0.08, allow);
    sup.push({ fx, fz, h: h && base - h.y < 0.5 ? h : null });
  }
  const hs = sup.filter(p => p.h).map(p => p.h.y);
  const top = hs.length ? Math.max(...hs) : null;
  const corners = sup.filter(p => p.h && isRim(d, slot, p.fx, p.fz));
  const need = top != null && corners.length ? top - Math.min(...corners.map(p => p.h.y)) : 0;
  const gaps = sup.filter(p => p.h).map(p => base - p.h.y);
  const kinds = {};
  for (const p of sup) if (p.h) kinds[g.meshes[p.h.m].kind] = (kinds[g.meshes[p.h.m].kind] || 0) + 1;
  const intr = g.intrude(volume(d, x, base, z, base + inset + TOL), allow);
  return { d, base, top, inset, need, minGap: gaps.length ? Math.min(...gaps.map(v => Math.max(0, v))) : null, air: sup.filter(p => !p.h).length / sup.length,
    kinds, intr, supports: sup };
};

// ---- the OPTIMUM: the largest scale a slot's shape takes on the car, and where ----
// opts: { slot, shape, B, min, max, zFrom, zTo, level(y, z) -> ok, maxInset, allow, avoid: [volumes], prefer: 'rear' | 'centre' | 'front',
//         airRows (a wing: the rear row of the footprint may hang over nothing), widthCap (a wing: no wider than the body there) }
// -> { s, x, z, top, inset, base } or null
export const feasible = (g, o, s, z) => {
  const d = dims(o.B, o.shape, s);
  if (o.widthCap) { const bw = g.widthAt(z, o.widthYMin ?? 0.3, o.allow).w; if (d.W > bw * o.widthCap + 0.01) return null; } // (quick: the body's width)
  const pts = footprint(d, o.slot);
  // the levels to try: the up-facing surfaces under the footprint's centre (and its front, for an overhanging wing)
  const levels = new Set();
  if (o.debug) console.log('feasible', o.slot, o.shape, s, z);
  for (const [fx, fz] of [[0, 0], [0, 0.85], [0.3, 0.85], [-0.3, 0.85]]) for (const h of g.rays(fx * d.W / 2, z + fz * d.D / 2, o.allow)) if (h.ny > 0.05 && o.level(h.y, z)) levels.add(Math.round(h.y * 200) / 200);
  for (const L of [...levels].sort((a, b) => b - a)) {
    let top = -Infinity, low = Infinity, bad = false, air = 0;
    for (const [fx, fz] of pts) {
      const px = fx * d.W / 2, pz = z + fz * d.D / 2;
      const h = g.support(px, pz, L + 0.01, o.allow);
      const isAir = !h || L - h.y > (o.maxInset + 0.4);
      const why = (w) => { if (o.debug) console.log('  L', L, 's', s, 'z', z, [fx, fz], w, h && h.y, h && g.meshes[h.m].name); };
      if (isAir) { if (o.airRows && fz < 0) { air++; continue; } why('air'); bad = true; break; }
      const rim = isRim(d, o.slot, fx, fz);
      if (L - h.y > o.maxInset + (rim ? 0 : 0.1) + 1e-6) { why('inset'); bad = true; break; } // (inside the rim a dip is a gap under the prop)
      const k = g.meshes[h.m].kind;
      // (stands only on the car's own untagged body: never glass, a lamp, the Super kit's parts, or another slot's own prop, which is
      // hidden when that slot is worn)
      if (k !== 'body' || g.meshes[h.m].tag) { why('kind ' + k + (g.meshes[h.m].tag ? ' tagged ' + g.meshes[h.m].tag : '')); bad = true; break; }
      if (o.noBlades && g.isBlade(px, pz, h, o.allow)) { why('blade'); bad = true; break; }
      top = Math.max(top, h.y);
      if (rim) low = Math.min(low, h.y);
    }
    if (bad || top === -Infinity) continue;
    if (o.airRows && air > pts.length / 3) continue;
    // the INSET: the least that makes the footprint's rim (its corners and edges) touch the surface (the owner, 15-Oct)
    const inset = low === Infinity ? 0 : Math.max(0, top - low);
    if (inset > o.maxInset + 1e-6) continue;
    // a wing no wider than the SURFACE it stands on (the cross-section within 0.15 m under it: a roof's width at its rear edge, a boot's)
    if (o.widthCap) { const sw = g.widthAt(z, top - 0.15, o.allow).w; if (d.W > sw * o.widthCap + 0.01) { if (o.debug) console.log('  L', L, 'wider than the surface', sw); continue; } }
    const base = top - inset;
    const vol = volume(d, 0, base, z, top + TOL);
    if (effDepth(g, g.intrude(vol, o.allow)) > 0.01) { if (o.debug) { const r = g.intrude(vol, o.allow); console.log('  L', L, 'intrude', r.depth, [...r.meshes].map(([mi, dd]) => g.meshes[mi].name + '/' + g.meshes[mi].kind + ' ' + dd.toFixed(3)).join(', ')); } continue; }
    if (o.avoid && o.avoid.some(a => overlap(volume(d, 0, base, z), a) > 0)) { if (o.debug) console.log('  L', L, 'avoid'); continue; }
    if (o.frontLimit != null && z + d.D / 2 > o.frontLimit + 1e-9) continue;
    if (o.rearLimit != null && z - d.D / 2 < o.rearLimit - 1e-9) continue;
    if (o.maxTop && base + d.H > o.maxTop(base) + 1e-9) continue;
    return { s, x: 0, z, top, inset, base, y: top + d.H / 2, air };
  }
  return null;
};
export const SEARCH_MAX = { roof: 3, cargo: 3, wing: 2.5 }; // (no cap: the search's own ceiling, far over anything a car's width allows)
export const best = (g, o) => {
  const step = o.zStep || 0.04, rows = [];
  const W1 = o.shape === 'box' ? o.B.box[0] : o.B.cylinder.axis === 'x' ? o.B.cylinder.height : 2 * o.B.cylinder.radius;
  const max = Math.min(o.max, SEARCH_MAX[o.slot] ?? 3);
  for (let z = o.zFrom; z <= o.zTo + 1e-9; z += step) {
    let hit = null;
    const start = Math.min(max, Math.floor((g.widthAt(z, 0.2, o.allow).w + 0.02) / W1 * 20) / 20); // (no wider than the car there)
    for (let s = start; s >= o.min - 1e-9; s = Math.round((s - 0.05) * 100) / 100) { hit = feasible(g, o, s, z); if (hit) break; }
    if (!hit) continue;
    for (let s = Math.min(max, Math.round((hit.s + 0.04) * 100) / 100); s > hit.s; s = Math.round((s - 0.01) * 100) / 100) { const h2 = feasible(g, o, s, z); if (h2) { hit = h2; break; } }
    rows.push(hit);
  }
  if (!rows.length) return null;
  const sMax = Math.max(...rows.map(r => r.s)), cap = Math.min(o.cap ?? o.max, max);
  // (the search went past the cap to say whether the cap limits; the pick is made with every scale capped)
  for (let i = 0; i < rows.length; i++) if (rows[i].s > cap) { const c = feasible(g, o, cap, rows[i].z); if (c) rows[i] = { ...c, raw: rows[i].s }; }
  rows.splice(0, rows.length, ...rows.filter(r => r.s <= cap + 1e-9));
  if (!rows.length) return null;
  const sTop = Math.max(...rows.map(r => r.s));
  let pick;
  if (o.prefer === 'rear') pick = rows.filter(r => r.s >= sTop * (o.rearShare ?? 0.85) - 1e-9).sort((a, b) => a.z - b.z)[0];
  else if (o.prefer === 'front') pick = rows.filter(r => r.s >= sTop - 1e-9).sort((a, b) => b.z - a.z)[0];
  else {
    const top = rows.filter(r => r.s >= sTop - 1e-9);
    // the middle of the best run of z (centred in the space it fits)
    const zs = top.map(r => r.z).sort((a, b) => a - b), mid = (zs[0] + zs[zs.length - 1]) / 2;
    pick = top.sort((a, b) => Math.abs(a.z - mid) - Math.abs(b.z - mid))[0];
  }
  return { ...pick, sMax, rows };
};
// the overlap volume of two volumes' boxes (m3)
export const overlap = (a, b) => {
  let v = 1;
  for (let k = 0; k < 3; k++) { const e = Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]); if (e <= 0.005) return 0; v *= e; }
  return v;
};

// ---- the three slots of a car, by the rules (the generator scripts/prop-anchors.mjs and the audit use this one search) ----
export const MAX_INSET = 0.05;   // m: the owner, 15-Oct ("some of the roof insets are too strong"): 4 to 5 cm at most, the least that gives contact
export const WIDTH_CAP = 0.95;   // a wing spans at most this share of the body's width at its z (a real wing: 80 to 100 %)
export const REAR_SHARE = 0.85;  // a wing takes the rear-most place whose scale is within this share of the best anywhere
// -> { opt: { 'wing-box', 'wing-cyl', 'roof-box', 'roof-cyl', 'cargo-box', 'cargo-cyl' } (best() results or null), info }
//    o.high: { roof, cargo, wing } scales to search up to (past the caps: the audit's "would a bigger cap help"); default the caps
export const SOFT_INSET = 0.03, SOFT_SHARE = 0.85; // a slot takes a place within 3 cm of inset when that keeps 85 % of the scale 5 cm gives
const bestSoft = (g, o) => {
  const hard = best(g, o);
  if (!hard) return null;
  const soft = best(g, { ...o, maxInset: Math.min(o.maxInset, SOFT_INSET) });
  return soft && soft.s >= hard.s * SOFT_SHARE - 1e-9 ? { ...soft, sMax: hard.sMax } : hard;
};
export const optimum = (g, P, kind, o = {}) => {
  const maxInset = o.maxInset ?? MAX_INSET, high = o.high || {};
  const tail = g.box.min.z, len = g.box.max.z - g.box.min.z, height = g.box.max.y;
  const hideSlot = (slot) => (m) => g.meshes[m].tag !== slot;
  let glassTop = -Infinity, glassMinZ = Infinity, rearGlassFoot = Infinity, bodyTop = -Infinity;
  for (let t = 0; t < g.T; t++) {
    const mm = g.meshes[g.M[t]];
    if (mm.tag) continue; // (a tagged prop's lenses or panels are no glasshouse: it is hidden when a prop is worn)
    for (let v = 0; v < 3; v++) {
      const y = g.P[t * 9 + v * 3 + 1], z = g.P[t * 9 + v * 3 + 2];
      if (mm.kind === 'glass' || (mm.kind === 'clear' && y > height * 0.4)) { glassTop = Math.max(glassTop, y); glassMinZ = Math.min(glassMinZ, z); } // (a see-through canopy is a glasshouse too)
      if (mm.kind === 'body' && !mm.tag) bodyTop = Math.max(bodyTop, y);
    }
  }
  if (glassMinZ < Infinity) for (let t = 0; t < g.T; t++) if ((g.meshes[g.M[t]].kind === 'glass' || g.meshes[g.M[t]].kind === 'clear') && !g.meshes[g.M[t]].tag) for (let v = 0; v < 3; v++) if (g.P[t * 9 + v * 3 + 2] < glassMinZ + 0.3 && g.P[t * 9 + v * 3 + 1] > height * 0.4) rearGlassFoot = Math.min(rearGlassFoot, g.P[t * 9 + v * 3 + 1]);
  const hasGlass = glassTop > -Infinity;
  const topAt = (z, allow) => { const h = g.rays(0, z, allow).find(q => q.ny > 0.05 && g.meshes[q.m].kind !== 'clear'); return h ? h.y : -Infinity; };
  const vols = (slot, r) => (r ? ['box', 'cyl'].map(sh => volume(dims(P.PROP_BOUNDS[slot], sh, r.s), 0, r.base, r.z)) : []);
  const opt = {};
  // the WING: the top surface at the tail (a boot lid, a deck, the roof's rear edge), never over glass, never on a thin plate, as wide as
  // the body allows, the rear-most place within REAR_SHARE of the best scale; its rear row may hang over the tail
  const wingAllow = hideSlot('wing');
  const wingLevel = (y, z) => y >= Math.max(0.45, hasGlass ? rearGlassFoot - 0.2 : height * 0.45) && y >= topAt(z, wingAllow) - 0.03;
  for (const shape of ['box', 'cyl']) {
    opt['wing-' + shape] = bestSoft(g, { slot: 'wing', shape, B: P.PROP_BOUNDS.wing, min: P.MIN_SCALE.wing, max: high.wing ?? P.maxScale('wing', kind), cap: P.maxScale('wing', kind),
      zFrom: tail + 0.04, zTo: hasGlass ? Math.min(g.box.max.z - 0.3, glassMinZ + 0.6) : tail + len * 0.55, noBlades: true,
      level: wingLevel, maxInset, allow: wingAllow, prefer: 'rear', rearShare: REAR_SHARE, airRows: true, widthCap: WIDTH_CAP, rearLimit: tail - 0.05 });
  }
  // (a wing's box and cylinder at the same z: the cylinder's own search may pick another place; it follows the box where it fits there)
  if (opt['wing-box'] && opt['wing-cyl'] && Math.abs(opt['wing-cyl'].z - opt['wing-box'].z) > 0.05) {
    const o2 = { slot: 'wing', shape: 'cyl', B: P.PROP_BOUNDS.wing, maxInset, allow: wingAllow, level: wingLevel, noBlades: true, airRows: true, widthCap: WIDTH_CAP, rearLimit: tail - 0.05 };
    for (let s = opt['wing-cyl'].s; s >= P.MIN_SCALE.wing; s = Math.round((s - 0.02) * 100) / 100) { const f = feasible(g, o2, s, opt['wing-box'].z); if (f) { opt['wing-cyl'] = { ...f, sMax: opt['wing-cyl'].sMax }; break; } }
  }
  const wingAvoid = [...vols('wing', opt['wing-box']), ...vols('wing', opt['wing-cyl'])];
  // the ROOF: over the glasshouse, centred where the biggest fits, clear of the wing
  const roofFloor = hasGlass ? glassTop - 0.06 : bodyTop - 0.5;
  for (const shape of ['box', 'cyl']) {
    opt['roof-' + shape] = bestSoft(g, { slot: 'roof', shape, B: P.PROP_BOUNDS.roof, min: P.MIN_SCALE.roof, max: high.roof ?? P.maxScale('roof', kind), cap: P.maxScale('roof', kind), noBlades: false, // (a car's roof is a plate over the cabin: no blade test)
     
      zFrom: tail + 0.1, zTo: g.box.max.z - 0.1, level: (y) => y >= roofFloor, maxInset, allow: hideSlot('roof'), prefer: 'centre', avoid: wingAvoid });
  }
  if (opt['roof-box'] && opt['roof-cyl'] && Math.abs(opt['roof-cyl'].z - opt['roof-box'].z) > 0.05) { // (the cylinder centred where the box is, if it fits there)
    const o2 = { slot: 'roof', shape: 'cyl', B: P.PROP_BOUNDS.roof, maxInset, allow: hideSlot('roof'), level: (y) => y >= roofFloor, avoid: wingAvoid };
    for (let s = opt['roof-cyl'].s; s >= P.MIN_SCALE.roof; s = Math.round((s - 0.02) * 100) / 100) { const f = feasible(g, o2, s, opt['roof-box'].z); if (f) { opt['roof-cyl'] = { ...f, sMax: opt['roof-cyl'].sMax }; break; } }
  }
  // the CARGO: on a deck behind the cab, under the roof line, as big as fits, then as close to the cab as it goes (the owner, 15-Oct: "right
  // behind the cab"), clear of the wing and the roof
  const roofY = opt['roof-box'] ? opt['roof-box'].top : bodyTop;
  const cabRear = hasGlass ? glassMinZ - 0.04 : g.box.max.z - len * 0.45;
  const avoid2 = [...wingAvoid, ...vols('roof', opt['roof-box']), ...vols('roof', opt['roof-cyl'])];
  for (const shape of ['box', 'cyl']) {
    opt['cargo-' + shape] = cabRear - tail < 0.3 ? null : bestSoft(g, { slot: 'cargo', shape, B: P.PROP_BOUNDS.cargo, min: P.MIN_SCALE.cargo, max: high.cargo ?? P.maxScale('cargo', kind), cap: P.maxScale('cargo', kind), noBlades: false, // (a deck is often a plate over the chassis, air under it)
     
      zFrom: tail + 0.1, zTo: cabRear - 0.1, frontLimit: cabRear, level: (y) => y > 0.2 && y < roofY - 0.25, maxInset, allow: hideSlot('cargo'), prefer: 'front', zStep: 0.04, avoid: avoid2,
      maxTop: (base) => Math.max(base + 0.5, roofY + 0.1) }); // (a load no higher than the cab's roof, or 0.5 m: the first generator's clearance rule)
  }
  return { opt, info: { tail, len, height, glassTop, glassMinZ, rearGlassFoot, bodyTop, hasGlass, roofFloor, cabRear } };
};
// a best() result as a table row: { box: [s, x, y, z], cyl: [...], from, lim, inset? }
export const toEntry = (slot, rb, rc, info, cap) => {
  if (!rb || !rc) return null;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const from = slot === 'roof' ? 'roof' : slot === 'cargo' ? 'deck' : (rb.top >= info.roofFloor - 0.02 && info.hasGlass ? 'roof-edge' : rb.air ? 'deck-edge' : 'deck');
  const e = { box: [rb.s, 0, r3(rb.y), r3(rb.z)], cyl: [rc.s, 0, r3(rc.y), r3(rc.z)], from, lim: rb.s >= cap - 1e-9 ? 'max' : 'fit' }; // ('fit': the surface limited it)
  if (rb.inset > 0.004 || rc.inset > 0.004) e.inset = [r3(rb.inset), r3(rc.inset)];
  return e;
};
