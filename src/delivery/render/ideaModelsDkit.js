// ---- the shared kit for the ideas batch D (ideaModelsD.js, ideaModelsD2.js): the helpers of ideaModelsTopupC.js, exported once. State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const keep = (m) => { m.userData.shared = true; return m; };
export const lambert = (color) => new THREE.MeshLambertMaterial({ color });
export const basic = (color) => keep(new THREE.MeshBasicMaterial({ color }));
export const TYRE = keep(lambert(0x161616)), HUB = keep(lambert(0xb4b8be)), TRIM = keep(lambert(0x24262a)), CHROME = keep(lambert(0xc8cbd0));
export const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
export const LAMP = basic(0xfff3c4), TAIL = basic(0xff2a2a), AMBER = basic(0xffa31a), SPARK = basic(0xbfe6ff);

export const SHARED = new Map();
export const shared = (key, make) => {
  if (!SHARED.has(key)) { const geo = make(); geo.userData.shared = true; SHARED.set(key, geo); }
  return SHARED.get(key);
};
export const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
export const plain = (geo) => {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g;
};
export const merge = (geos) => mergeGeometries(geos.map(plain), false);
export const parts = (parent, key, material, make) => place(parent, shared(key, () => merge(make())), material);

export const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a disc facing along the car (a lamp, a bezel), turned `yaw` about the upright
export const dsc = (r, depth, x, y, z, yaw = 0, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).rotateY(yaw).translate(x, y, z);
export const blob = (sx, sy, sz, x, y, z, seg = [12, 7]) => new THREE.SphereGeometry(1, seg[0], seg[1]).scale(sx, sy, sz).translate(x, y, z);

// ---- a body: an extrusion of its side view ([z, y] points; ['arc', z, y, r] a wheel arch from its rear foot over to its
// front), `w` wide across the car, its outline grown by `bevel` all round and rounded `across` deep over the sides
export const curve = (a, b, c, d, n) => new THREE.CubicBezierCurve(...[a, b, c, d].map(([z, y]) => new THREE.Vector2(z, y)))
  .getPoints(n).slice(1).map(v => [v.x, v.y]);
export const sideShape = (outline) => {
  const shape = new THREE.Shape();
  outline.forEach((p, i) => {
    if (p[0] === 'arc') shape.absarc(p[1], p[2], p[3], Math.PI, 0, true);
    else if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });
  return shape;
};
export const narrowAt = (x, y, [y0, y1, k]) => (y > y0 ? x * (1 - k * Math.min(1.2, (y - y0) / (y1 - y0))) : x);
export const extrudeSide = (outline, w, bevel, taper = null, segs = 2, across = bevel) => {
  const geo = new THREE.ExtrudeGeometry(sideShape(outline), {
    depth: w - 2 * across, bevelEnabled: true, bevelThickness: across, bevelSize: bevel, bevelSegments: segs, curveSegments: 6,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(w / 2 - across, 0, 0);
  if (taper) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, narrowAt(pos.getX(i), pos.getY(i), taper));
    geo.computeVertexNormals();
  }
  return geo;
};
// a flat convex panel through the points ([x, y, z], in order), and the same panel on both sides of the car
export const panel = (pts) => {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};
export const pair = (pts) => {
  const [a, b, c] = pts, ux = [b[1] - a[1], b[2] - a[2]], vx = [c[1] - a[1], c[2] - a[2]];
  const out = ux[0] * vx[1] - ux[1] * vx[0] > 0 ? pts : pts.slice().reverse();
  return [panel(out), panel(out.map(([x, y, z]) => [-x, y, z]).reverse())];
};
// side windows: each a polygon of [z, y] laid on the (narrowed) flank of half width `half`, `lift` out from it
export const sideGlass = (windows, half, taper, lift) => windows.flatMap(win => pair(win.map(([z, y]) => [(taper ? narrowAt(half, y, taper) : half) + lift, y, z])));
// a glass panel across the car on a face sloping from [z0, y0] to [z1, y1], `hx` its half width, laid `lift` out from it
export const slopeGlass = ([z0, y0], [z1, y1], hx0, hx1, lift) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  const [nz, ny] = dz < 0 ? [dy / len, -dz / len] : [-dy / len, dz / len];
  const at = (z, y, hx, s) => [s * hx, y + ny * lift, z + nz * lift];
  return panel([at(z0, y0, hx0, -1), at(z0, y0, hx0, 1), at(z1, y1, hx1, 1), at(z1, y1, hx1, -1)]);
};
// shade a geometry by height: `fn(y)` gives the multiplier (a vertex colour times the paint's)
export const shadeBy = (geo, fn) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) col.set(fn(pos.getY(i), pos.getZ(i), pos.getX(i)), i * 3);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};
export const low = (y0, y1, c) => (y) => { const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0))); return c.map(v => v + (1 - v) * t); };

// a wheel arch's flare: a band round the arch (radii ri to ro, centred at z, y: its feet at y), `t` thick, its outer face
// at x 0 and its inner at -t (move it out to the flank)
export const flare = (z, y, ri, ro, t) => {
  const shape = new THREE.Shape();
  shape.moveTo(z + ro, y);
  shape.absarc(z, y, ro, 0, Math.PI, false);
  shape.lineTo(z - ri, y);
  shape.absarc(z, y, ri, Math.PI, 0, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 5 }).rotateY(-Math.PI / 2);
};
// a wheel: a fat tyre and a plain hub disc, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
export const wheel = (parent, key, R, width, x, z, seg = 16) => {
  place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, seg).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(R * 0.52, R * 0.52, width + 0.02, Math.round(seg * 0.75)).rotateZ(Math.PI / 2)), HUB, x, R, z);
};

// a rounded rectangle in plan (x across, the shape's y along the car), half sizes a, b, corner radius r
export const roundRect = (a, b, r, path = new THREE.Shape()) => {
  path.moveTo(-a + r, -b);
  path.lineTo(a - r, -b); path.absarc(a - r, -b + r, r, -Math.PI / 2, 0, false);
  path.lineTo(a, b - r); path.absarc(a - r, b - r, r, 0, Math.PI / 2, false);
  path.lineTo(-a + r, b); path.absarc(-a + r, b - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(-a, -b + r); path.absarc(-a + r, -b + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
};
// a solid of a plan shape, from y0 up, `depth` tall plus its rounded edges (`bevel`) above and below
export const extrudePlan = (shape, depth, bevel, y0, segs = 2) => new THREE.ExtrudeGeometry(shape, {
  depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 3,
}).rotateX(-Math.PI / 2).translate(0, y0 + bevel, 0);

// a flat picture w by h facing 'x', '-x', 'z' or '-z', its uv a part of the texture (u, v ranges)
export const decal = (w, h, x, y, z, facing, u = [0, 1], v = [0, 1]) => {
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) { uv.setX(i, u[0] + uv.getX(i) * (u[1] - u[0])); uv.setY(i, v[0] + uv.getY(i) * (v[1] - v[0])); }
  if (facing === 'x') geo.rotateY(Math.PI / 2);
  if (facing === '-x') geo.rotateY(-Math.PI / 2);
  if (facing === '-z') geo.rotateY(Math.PI);
  return geo.translate(x, y, z);
};

// ---- the small canvas textures: drawn once, shared ------------------------------------------------------------------
export const textures = new Map();
export const texture = (key, w, h, draw, repeat = false) => {
  if (!textures.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    if (repeat) map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.userData.shared = true;
    textures.set(key, map);
  }
  return textures.get(key);
};
export const random = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// ---- glass that FOLLOWS THE BODY (the owner, 14-Oct: a window's top, A-pillar and C-pillar edges run parallel to the body's own
// roofline and pillars at a fixed inset; never an eyeballed arch or a free-standing quad). All of it is derived from the SAME side
// profile ([z, y] points, nose to tail) the body is extruded from (extrudeSide), so the glass cannot drift from the body.
// Check a car with:  node scripts/.glass-contour-check.mjs <car id>   (a report: how far each window sits from the roof contour).
//
//   glassFromProfile(profile, { from, to, belt, inset, zFront, zRear, half, taper, lift }) -> [right, left] geometries
//     the side window(s): `profile[from..to]` is the cabin's chain (the screen's foot, its top, the roof, the rear slope's foot; use
//     profile.indexOf(point)); the chain's first and last edges are carried (or trimmed) to y = belt and closed by the belt line; each
//     edge moves in by inset.aPillar (rising rearward), inset.roof (near level) or inset.cPillar (falling rearward), the belt edge
//     by inset.belt (defaults 0.07, 0.055, 0.08, 0.025). zFront / zRear cut the window (a B-pillar: two calls). `half`, `taper`
//     are the body's half width and taper ([y0, y1, k] of extrudeSide), `lift` how far the glass stands off the flank (0.004).
//       parts(group, 'glass', GLASS, () => [...glassFromProfile(outline, { from: outline.indexOf(WSF), to: outline.indexOf(RW1),
//         belt: BELT, inset: { roof: 0.06 }, zFront: -0.1, half: HALF, taper: TAPER })]);
//   screenGlassFromProfile(profile, { edge: [i, j], foot, top, half, taper, sideInset, lift, topLift }) -> one geometry
//     the windscreen or rear glass: a panel along the profile edge from point i to point j (either order), `foot` up from its lower end
//     and `top` down from its upper end, sideInset (0.1) in from the flank each side, `lift` out from the body at the foot and `topLift`
//     at the top (smaller than lift, even negative, to tuck its top edge just under the roof so no edge shows over it).
//   insetOutline(poly, insets), clipZ(poly, zMin, zMax), tiltGlass(...): the pieces they are made from.
export const insetOutline = (poly, insets) => {
  const n = poly.length;
  let area = 0;
  poly.forEach((p, i) => { const q = poly[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; });
  const sign = area > 0 ? 1 : -1;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n], dz = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dz, dy);
    return { at: [p[0] - dy / len * sign * insets[i], p[1] + dz / len * sign * insets[i]], dir: [dz, dy] };
  });
  return poly.map((_, i) => {
    const a = lines[(i + n - 1) % n], b = lines[i];
    const t = ((b.at[0] - a.at[0]) * b.dir[1] - (b.at[1] - a.at[1]) * b.dir[0]) / (a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0]);
    return [a.at[0] + a.dir[0] * t, a.at[1] + a.dir[1] * t];
  });
};
export const clipZ = (poly, zMin, zMax) => {
  const cut = (pts, keep, cross) => pts.flatMap((p, i) => {
    const q = pts[(i + 1) % pts.length], pin = keep(p), qin = keep(q);
    return (pin ? [p] : []).concat(pin !== qin ? [cross(p, q)] : []);
  });
  const at = (z) => (p, q) => [z, p[1] + (q[1] - p[1]) * (z - p[0]) / (q[0] - p[0])];
  return cut(cut(poly, p => p[0] >= zMin - 1e-9, at(zMin)), p => p[0] <= zMax + 1e-9, at(zMax));
};
// the cabin's outline: profile[from..to], its first and last edges carried (or trimmed) to the belt line, which closes it
// A window has exactly the corners the body's cabin outline has there, no more (the owner, 14-Oct): a point within `tol` (1 cm) of the line
// between its neighbours is no corner (the roof's gentle curve pieces, a point an inset or a clip left on a straight run) and is dropped, the
// one furthest inside the tolerance first; an open chain keeps its two ends, a closed polygon may lose any point
export const dropFlat = (pts, tol = 0.01, closed = false) => {
  const out = pts.map(p => [p[0], p[1]]);
  const off = (a, p, b) => { const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy); return l < 1e-9 ? Math.hypot(p[0] - a[0], p[1] - a[1]) : Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dz) / l; };
  for (;;) {
    const n = out.length;
    if (n <= (closed ? 3 : 2)) return out;
    let best = -1, d = tol;
    for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) { const e = off(out[(i + n - 1) % n], out[i], out[(i + 1) % n]); if (e < d) { d = e; best = i; } }
    if (best < 0) return out;
    out.splice(best, 1);
  }
};
// a closed polygon's segments shorter than `short` (3 cm), which an inset's or a clip's corner leaves beside the outline's own, made ONE mitre:
// the two ends are replaced by the crossing of the edges either side (their middle where those are parallel)
export const oneMitre = (poly, short = 0.03) => {
  const out = poly.map(p => [p[0], p[1]]);
  for (let guard = 0; guard < 64; guard++) {
    const n = out.length;
    if (n <= 3) return out;
    let at = -1, l = short;
    for (let i = 0; i < n; i++) { const e = Math.hypot(out[(i + 1) % n][0] - out[i][0], out[(i + 1) % n][1] - out[i][1]); if (e < l) { l = e; at = i; } }
    if (at < 0) return out;
    const a = out[(at + n - 1) % n], p = out[at], q = out[(at + 1) % n], b = out[(at + 2) % n];
    const d1 = [p[0] - a[0], p[1] - a[1]], d2 = [b[0] - q[0], b[1] - q[1]], den = d1[0] * d2[1] - d1[1] * d2[0];
    const m = Math.abs(den) < 1e-9 ? [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] : (() => { const t = ((q[0] - a[0]) * d2[1] - (q[1] - a[1]) * d2[0]) / den; return [a[0] + d1[0] * t, a[1] + d1[1] * t]; })();
    if (at + 1 < n) out.splice(at, 2, m); else { out.splice(at, 1, m); out.splice(0, 1); }
  }
  return out;
};
export const cabinChain = (profile, from, to, belt) => {
  const chain = profile.slice(from, to + 1).map(p => [p[0], p[1]]);
  const toBelt = (p, q) => { const t = (belt - p[1]) / (q[1] - p[1]); return [p[0] + (q[0] - p[0]) * t, belt]; };
  chain[0] = toBelt(chain[0], chain[1]);
  chain[chain.length - 1] = toBelt(chain[chain.length - 1], chain[chain.length - 2]);
  return dropFlat(chain); // (the body's own corners only: the roof's curve pieces within 1 cm of a straight run are none)
};
// a window polygon tidied: no point on a straight run, no segment under 3 cm (one mitre at each corner)
export const tidyGlass = (poly) => dropFlat(oneMitre(poly), 0.005, true);
// the inset of the chain's edge i (from point i to the next): the belt edge (the last), the roof (an edge rising or falling less than
// 1 in 4, about 14 degrees: a raked screen of 25 to 30 degrees is a PILLAR, not roof), the A-pillar (rising rearward) or the C-pillar
export const edgeInset = (chain, i, { aPillar, roof, cPillar, belt }) => {
  if (i === chain.length - 1) return belt;
  const p = chain[i], q = chain[i + 1], dz = q[0] - p[0], dy = q[1] - p[1];
  return Math.abs(dy) < 0.25 * Math.hypot(dz, dy) ? roof : dy > 0 ? aPillar : cPillar;
};
// ROUNDED BODY, SHARP WINDOWS (the owner, 15-Oct): a run of short edges (under `short`, 20 cm: a rounded roof corner drawn as curve pieces) between two
// long edges is collapsed to its VIRTUAL corner, where the long edges' lines meet. profile.slice(from, to + 1) in, { points, map } out (map: old index
// (relative to `from`) -> the new one). A run at either end of the chain is kept as it is.
export const virtualCorners = (chain, short = 0.2) => {
  const n = chain.length, len = (i) => Math.hypot(chain[i + 1][0] - chain[i][0], chain[i + 1][1] - chain[i][1]);
  const points = [], map = [];
  for (let i = 0; i < n;) {
    if (i >= 1 && i < n - 1 && len(i) < short && len(i - 1) >= short) {
      let j = i;
      while (j < n - 1 && len(j) < short) j++;
      if (j < n - 1) {
        const a = chain[i - 1], b = chain[i], c = chain[j], d = chain[j + 1];
        const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [d[0] - c[0], d[1] - c[1]], den = d1[0] * d2[1] - d1[1] * d2[0];
        if (Math.abs(den) > 1e-9) {
          const t = ((c[0] - a[0]) * d2[1] - (c[1] - a[1]) * d2[0]) / den;
          // (a corner on a vertical or level long edge is snapped to that edge's coordinate: 1.7000000000000002 would flip tiltGlass's normal)
          const snap = (v, ...near) => near.find(w => Math.abs(v - w) < 1e-9) ?? v;
          points.push([snap(a[0] + d1[0] * t, a[0], b[0], c[0], d[0]), snap(a[1] + d1[1] * t, a[1], b[1], c[1], d[1])]);
          for (let k = i; k <= j; k++) map[k] = points.length - 1;
          i = j + 1;
          continue;
        }
      }
    }
    map[i] = points.length;
    points.push([chain[i][0], chain[i][1]]);
    i++;
  }
  return { points, map };
};
// how far inside an open chain (nose-side first, the cabin's outline: the inside is to the LEFT of its travel) a point is; negative: outside
export const insideChain = (chain, p) => {
  let best = Infinity, sign = 1;
  for (let i = 0; i + 1 < chain.length; i++) {
    const a = chain[i], b = chain[i + 1], dz = b[0] - a[0], dy = b[1] - a[1], l2 = dz * dz + dy * dy;
    const t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dz + (p[1] - a[1]) * dy) / l2));
    const d = Math.hypot(p[0] - (a[0] + dz * t), p[1] - (a[1] + dy * t));
    if (d < best - 1e-12) { best = d; sign = ((p[0] - a[0]) * -dy + (p[1] - a[1]) * dz) >= 0 ? 1 : -1; }
  }
  return sign * best;
};
// a sharp window's two top corners, pulled in along their pillar's inset line until they sit `margin` inside the REAL (rounded) chain
// (no vertex added: the window stays a clean polygon, its top edge sinks a little at each end)
export const pullCornersIn = (poly, real, margin) => {
  const out = poly.map(p => [p[0], p[1]]), n = out.length;
  for (const [k, o] of [[1, 0], [n - 2, n - 1]]) {
    const d = [poly[o][0] - poly[k][0], poly[o][1] - poly[k][1]], l = Math.hypot(d[0], d[1]);
    for (let s = 0; s < l * 0.8 && insideChain(real, out[k]) < margin; s += 0.002) out[k] = [poly[k][0] + d[0] / l * s, poly[k][1] + d[1] / l * s];
  }
  return out;
};
export const glassFromProfile = (profile, { from, to, belt, inset = {}, zFront = Infinity, zRear = -Infinity, half, taper = null, lift = 0.004, real = null, margin = 0 }) => {
  const { aPillar = 0.07, roof = 0.055, cPillar = 0.08, belt: beltInset = 0.025 } = inset;
  const chain = cabinChain(profile, from, to, belt);
  let inner = insetOutline(chain, chain.map((p, i) => edgeInset(chain, i, { aPillar, roof, cPillar, belt: beltInset })));
  if (real) inner = pullCornersIn(inner, real, margin); // (rounded body, sharp window: `profile` holds the virtual corners, `real` the rounded chain)
  const poly = tidyGlass(clipZ(inner, zRear, zFront));
  const xAt = (y) => (taper ? narrowAt(half, y, taper) : half) + lift;
  const faces = THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p[0], p[1])), []);
  return [1, -1].map(s => {
    const pos = [];
    for (const f of faces) for (const i of (s > 0 ? f : f.slice().reverse())) pos.push(s * xAt(poly[i][1]), poly[i][1], poly[i][0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  });
};
// a glass panel across the car on a face from [z0, y0] up to [z1, y1], standing `foot` off it at the lower end and `top` at the upper
export const tiltGlass = ([z0, y0], [z1, y1], hx0, hx1, foot, top) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  const [nz, ny] = dz < 0 ? [dy / len, -dz / len] : [-dy / len, dz / len];
  const at = (z, y, hx, s, l) => [s * hx, y + ny * l, z + nz * l];
  return panel([at(z0, y0, hx0, -1, foot), at(z0, y0, hx0, 1, foot), at(z1, y1, hx1, 1, top), at(z1, y1, hx1, -1, top)]);
};
export const screenGlassFromProfile = (profile, { edge, foot = 0.03, top = 0.07, half, taper = null, sideInset = 0.1, lift = 0.004, topLift = lift }) => {
  let [p0, p1] = [profile[edge[0]], profile[edge[1]]];
  if (p0[1] > p1[1]) [p0, p1] = [p1, p0];
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
  const a = [p0[0] + d[0] * foot, p0[1] + d[1] * foot], b = [p1[0] - d[0] * top, p1[1] - d[1] * top];
  const hx = (y) => (taper ? narrowAt(half, y, taper) : half) - sideInset;
  return tiltGlass(a, b, hx(a[1]), hx(b[1]), lift, topLift);
};

// cabinGlass(profile, opts) -> { sides: [geometry, ...], front, rear }: the side windows, the windscreen and the rear glass of ONE cabin, all built
// from the same inset outline so they agree where they meet: ONE top line. The side window's top is the roof contour inset by the roof-rail
// margin; the windscreen's top edge is at exactly the height of the side window's top corner at the A-pillar, the rear glass's at the C-pillar
// corner's (the owner, 14-Oct: level, never a screen lowered below the window nor left higher). opts: from, to, belt, inset ({ aPillar, roof,
// cPillar, belt }, as glassFromProfile), grow (0: how far the body's SILHOUETTE stands outside the profile, i.e. extrudeSide's bevel size; the
// insets are measured from that silhouette, the pink line of the owner's mark-up, so a body grown 5 cm with a 5 cm roof inset has its side
// glass right up to the roof's rounded shoulder), half, taper, windows ([[zRear, zFront], ...] one side window each; default one), sideLift
// (0.004: a side window off the flank), lift / topLift (the screens' foot and top off the PROFILE: pass BEV + 0.006 so the glass is 6 mm proud
// of a body grown BEV; a top lift below BEV hides the screen's top under the body and leaves a solid strip over it), sideInset (the screens'
// margin from the flank each side, 0.08), foot (0.03: a screen starts this far up its slope from the body's own edge). Example:
//   const g = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(RW1), belt: BELT, half: HALF, taper: TAPER, grow: BEV,
//     inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, windows: [[-0.1, 9], [-9, -0.26]] });
//   parts(group, k + 'glass', GLASS, () => [...g.sides, g.front, g.rear]);
// ROUNDED BODY, SHARP WINDOWS (`sharp: true`, the owner, 15-Oct): the profile may round its roof corners (runs of edges under 20 cm); the glass is built
// from their virtual corners (virtualCorners), so every window is a clean polygon, and each window's two top corners are pulled in along their pillar's
// inset line until they lie `cornerDepth` (0.05) inside the real rounded silhouette (pullCornersIn: no vertex added, the top edge sinks a little).
// The result's `virtual` holds the virtual chain: a car publishes it as userData.glassVirtual = { chain, grow } for scripts/.glass-contour-check.mjs.
export const cabinGlass = (profile, { from, to, belt, inset = {}, grow = 0, half, taper = null, windows = [[-Infinity, Infinity]], sideLift = 0.004, lift = 0.004, topLift = lift, sideInset = 0.08, foot = 0.03, sharp = false, cornerDepth = 0.05 }) => {
  const { aPillar = 0.07, roof = 0.055, cPillar = 0.08, belt: beltInset = 0.025 } = inset;
  // (the insets from the profile: `grow` less than from the silhouette; never outside the profile, where the body's shoulder rounds away)
  const ins = { aPillar: Math.max(0, aPillar - grow), roof: Math.max(0, roof - grow), cPillar: Math.max(0, cPillar - grow), belt: beltInset };
  // sharp: the body's rounded corners (runs of short edges) are collapsed to their virtual corners for the glass; a window corner that would stand
  // outside the real rounded body (nearer than `cornerDepth` to its silhouette) is pulled in along its pillar's inset line (see pullCornersIn)
  let real = null, margin = 0, virtual = null;
  if (sharp) {
    real = cabinChain(profile, from, to, belt);
    margin = cornerDepth - grow + 0.003; // (negative: the corner may stand between the profile and the silhouette)
    const v = virtualCorners(profile.slice(from, to + 1));
    virtual = v.points; profile = v.points; from = 0; to = v.points.length - 1;
  }
  const last = profile[to];
  // the outline both ends of the glass are derived from
  const chain = cabinChain(profile, from, to, belt);
  const raw = insetOutline(chain, chain.map((p, i) => edgeInset(chain, i, ins)));
  const poly = tidyGlass(real ? pullCornersIn(raw, real, margin) : raw), n = poly.length; // (poly[0] and poly[n - 1] are the belt corners: the ends are kept)
  const sides = windows.flatMap(([zRear, zFront]) => glassFromProfile(profile, { from, to, belt, inset: ins, zFront, zRear, half, taper, lift: sideLift, real, margin }));
  const onLine = (p, q, y) => [p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]), y];
  const hx = (y) => (taper ? narrowAt(half, y, taper) : half) - sideInset;
  // the shared top line: the side window's top corner at each pillar
  const aTopY = poly[1][1], cTopY = poly[n - 2][1];
  // (a screen stands off the body along its face's normal, which lifts its top edge by cos(slope) * topLift: aim lower so the EDGE lands at aTopY)
  const rise = (p, q) => Math.abs(q[0] - p[0]) / Math.hypot(q[0] - p[0], q[1] - p[1]);
  const aFoot = onLine(chain[0], chain[1], Math.max(chain[0][1], profile[from][1]) + foot * 0.8 - rise(chain[0], chain[1]) * lift), aTop = onLine(chain[0], chain[1], aTopY - rise(chain[0], chain[1]) * topLift);
  const cTop = onLine(chain[n - 1], chain[n - 2], cTopY - rise(chain[n - 1], chain[n - 2]) * topLift), cFoot = onLine(chain[n - 1], chain[n - 2], last[1] + foot * 0.8 - rise(chain[n - 1], chain[n - 2]) * lift);
  return {
    sides,
    front: tiltGlass(aFoot, aTop, hx(aFoot[1]), hx(aTop[1]), lift, topLift),
    rear: tiltGlass(cFoot, cTop, hx(cFoot[1]), hx(cTop[1]), lift, topLift),
    virtual, // (sharp: the cabin chain's virtual corners, for the contour check)
  };
};
