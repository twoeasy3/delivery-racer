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
