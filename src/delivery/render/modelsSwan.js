// ---- the Swan Car, redone as a covered car (the owner, 13-Oct: the open tourer with a swan's neck over its bonnet was
// "too weird"). STAGE 1: a first pass at the idea and the shape, for the owner to approve before it is polished.
// A closed two-door coupe, believable as a road car, its swan carried by a few restrained cues, not a bird sculpture:
//   - a full, rounded 'breast' of a nose, standing forward of a long low bonnet that rises in one gentle S (the neck)
//     to the windscreen's foot;
//   - a short glasshouse well back, its roof running into a long fastback;
//   - the 'folded wings': a raised crown over each rear wheel, tapering forward to a point on the door and sweeping up
//     behind into a softly raised tail at each rear corner, either side of a lower deck;
//   - the swan's face: a small beak-orange grille in the middle of the breast and a black mask from it out to each
//     headlamp (Evil: a black swan, the beak red-orange);
//   - long, feather-like tail lamps laid along the raised tail corners, a brake lamp across the deck's lip.
// Built as render/modelsOrig1b.js' Commuter (the approved benchmark): side views extruded across the car with their
// edges rounded off by one bevel, the glasshouse narrowed toward its roof; glass as thin flat panels a few mm proud;
// small parts as squashed spheres merged into one mesh per material; the wheels a plain fat tyre and a hub disc each
// (meshes of their own: the showroom's suspension finds them by shape). No panel lines. State-free.
// The builder takes the car's entry ({ hw, hl, height, color }) and returns a group, front facing local +z, with
//   userData.body     the mesh in the paint (the livery's colour is set from outside)
//   userData.animate  (seconds) => void
//   userData.livery   (evil) => void: the beak accent (orange / red-orange)
//   userData.stripe   (hex) => void: the beak accent in a colour of one's own
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const TYRE = keep(lambert(0x161616)), HUB = keep(lambert(0xd4d6da)), MASK = keep(lambert(0x141518));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = keep(basic(0xfff3c4)), TAIL = keep(basic(0xc0141c)), STOP = keep(basic(0xff3b3b));

const SHARED = new Map();
const shared = (key, make) => {
  if (!SHARED.has(key)) { const geo = make(); geo.userData.shared = true; SHARED.set(key, geo); }
  return SHARED.get(key);
};
const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const plain = (geo) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
};
const merge = (geos) => mergeGeometries(geos.map(plain), false);
const parts = (parent, key, material, make) => place(parent, shared(key, () => merge(make())), material);

// a squashed sphere, turned (pitch about x, then yaw about y) and placed
const blob = (sx, sy, sz, x, y, z, pitch = 0, yaw = 0, seg = [10, 6]) => {
  const geo = new THREE.SphereGeometry(1, seg[0], seg[1]).scale(sx, sy, sz);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a teardrop: a squashed sphere with its front (+z) half drawn to a point
const tear = (sx, sy, sz, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.SphereGeometry(1, 8, 5), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = 1 - 0.65 * Math.max(0, pos.getZ(i));
    pos.setXYZ(i, pos.getX(i) * t * sx, pos.getY(i) * t * sy, pos.getZ(i) * sz);
  }
  geo.computeVertexNormals();
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
const panel = (pts) => {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};
const pair = (pts) => {
  const [a, b, c] = pts, ux = [b[1] - a[1], b[2] - a[2]], vx = [c[1] - a[1], c[2] - a[2]];
  const out = ux[0] * vx[1] - ux[1] * vx[0] > 0 ? pts : pts.slice().reverse();
  return [panel(out), panel(out.map(([x, y, z]) => [-x, y, z]).reverse())];
};

// ---- side views, extruded ----------------------------------------------------------------------------------------
const curve = (a, b, c, d, n) => new THREE.CubicBezierCurve(...[a, b, c, d].map(([z, y]) => new THREE.Vector2(z, y)))
  .getPoints(n).slice(1).map(v => [v.x, v.y]);
const sideShape = (outline) => {
  const shape = new THREE.Shape();
  outline.forEach((p, i) => {
    if (p[0] === 'arc') shape.absarc(p[1], p[2], p[3], Math.PI, 0, true); // (a wheel arch, from its rear foot over to its front)
    else if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });
  return shape;
};
const narrowAt = (x, y, [y0, y1, k]) => (y > y0 ? x * (1 - k * Math.min(1.2, (y - y0) / (y1 - y0))) : x);
const extrudeSide = (outline, w, bevel, taper = null, segs = 2, across = bevel, arcs = 6) => {
  const geo = new THREE.ExtrudeGeometry(sideShape(outline), {
    depth: w - 2 * across, bevelEnabled: true, bevelThickness: across, bevelSize: bevel, bevelSegments: segs, curveSegments: arcs,
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
const heightAt = (chain, z) => {
  for (let i = 0; i + 1 < chain.length; i++) {
    const [z0, y0] = chain[i], [z1, y1] = chain[i + 1];
    if ((z - z0) * (z - z1) <= 0 && z0 !== z1) return y0 + (y1 - y0) * (z - z0) / (z1 - z0);
  }
  return chain[0][1];
};
const slopeGlass = ([z0, y0], [z1, y1], half, taper, inset, ends, lift) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  const [nz, ny] = dz < 0 ? [dy / len, -dz / len] : [-dy / len, dz / len];
  const at = (t, sx) => {
    const z = z0 + dz * t + nz * lift, y = y0 + dy * t + ny * lift;
    return [sx * (narrowAt(half, y, taper) - inset), y, z];
  };
  const [a, b] = ends;
  return panel([at(a, -1), at(a, 1), at(1 - b, 1), at(1 - b, -1)]);
};
const sideGlass = (windows, half, taper, lift) => windows.flatMap(win => pair(win.map(([z, y]) => [narrowAt(half, y, taper) + lift, y, z])));

const wheel = (parent, key, R, width, x, z, hubR, hubMat) => {
  const tyre = place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, 14).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(hubR, hubR, width + 0.016, 12).rotateZ(Math.PI / 2)), hubMat, x, R, z);
  return tyre;
};
// a soft cool shade toward the foot (vertex colours, times the paint's): white paint keeps its form
const shadeLow = (geo, y0, y1, low) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0)));
    for (let c = 0; c < 3; c++) col[i * 3 + c] = low[c] + (1 - low[c]) * t;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};

// ---- the Swan Car ------------------------------------------------------------------------------------------------
export const SWAN_MODELS = {};
SWAN_MODELS.swancar = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.37;
  const k = 'swan' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const beak = lambert(0xf08a1c);
  const AF = 0.62 * L, AR = -0.6 * L; // (the axles)
  const BEV = 0.1, NOSE = L - BEV - 0.06, TAILZ = -L + BEV;
  // the body, side on (between the wings): the breast, tall and round; a long bonnet rising gently to the windscreen;
  // the tail drawn out behind to a soft point, its underside lifting (the swan's tail)
  const BW = 1.36, WSF = [0.8, 0.95];
  const bodyOutline = [[NOSE - 0.22, 0.3], ...curve([NOSE - 0.22, 0.3], [NOSE + 0.12, 0.42], [NOSE + 0.1, 0.84], [NOSE - 0.3, 0.92], 3),
    ...curve([NOSE - 0.3, 0.92], [1.7, 0.94], [1.2, 0.94], WSF, 2),
    [-1.6, 0.94], ...curve([-1.6, 0.94], [-2.1, 0.93], [TAILZ - 0.02, 0.88], [TAILZ, 0.78], 2),
    ...curve([TAILZ, 0.78], [TAILZ + 0.02, 0.62], [TAILZ + 0.2, 0.46], [-2.0, 0.3], 2),
    ['arc', AR, R - 0.02, R + 0.16], ['arc', AF, R - 0.02, R + 0.16]];
  // the wings (the pontoon wings, outside the body): in front, a full round crown over the wheel that sweeps down and
  // back along the door to a point (the swan's neck, side on); behind, a long teardrop over the rear wheel, its spat
  // down over the wheel's top half, its tail lifted
  const front = [[NOSE - 0.18, 0.34], ...curve([NOSE - 0.18, 0.34], [NOSE + 0.04, 0.5], [NOSE - 0.02, 0.82], [AF - 0.05, 0.84], 3),
    ...curve([AF - 0.05, 0.84], [0.9, 0.84], [0.1, 0.52], [-0.6, 0.4], 4), [0.2, 0.34], ['arc', AF, R - 0.02, R + 0.05]];
  const rear = [[-0.55, 0.42], ...curve([-0.55, 0.42], [-1.0, 0.82], [-1.9, 0.88], [TAILZ + 0.08, 0.72], 4),
    ...curve([TAILZ + 0.08, 0.72], [TAILZ - 0.04, 0.6], [TAILZ + 0.02, 0.48], [TAILZ + 0.3, 0.4], 2)];
  const FW = 0.42, fx = W - FW / 2;
  // the glasshouse: a raked windscreen, a round roof, a long fastback down onto the tail
  const CBEV = 0.12, CW = 1.26, TOP = 1.6 - CBEV, CY = 0.84;
  const TAPER = [CY - CBEV, TOP, 0.26];
  const WS = [[WSF[0] + 0.06, CY], [-0.02, TOP - 0.06]];
  const roof = [WS[1], ...curve(WS[1], [-0.25, TOP + 0.03], [-0.5, TOP + 0.03], [-0.75, TOP - 0.04], 3)];
  const back = [[-0.75, TOP - 0.04], ...curve([-0.75, TOP - 0.04], [-1.2, TOP - 0.1], [-1.75, 1.06], [-2.2, CY], 4)];
  const cabinOutline = [WS[0], ...roof, ...back.slice(1)];
  const mirrorX = narrowAt(CW / 2, 1.08, TAPER) + 0.05;
  const body = place(group, shared(k + 'body', () => shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 2, 0.28, 3), // (its arches hidden by the wings: coarse)
    ...[-1, 1].map(s => extrudeSide(front, FW, 0.12, null, 2, 0.19).translate(s * fx, 0, 0)),
    ...[-1, 1].map(s => extrudeSide(rear, FW, 0.12, null, 2, 0.19).translate(s * fx, 0, 0)),
    extrudeSide(cabinOutline, CW, CBEV, TAPER, 2, 0.14),
    ...[-1, 1].map(s => blob(0.08, 0.055, 0.07, s * mirrorX, 1.08, 0.62, 0, s * 0.3, [6, 4])),   // the mirrors
  ]), 0.2, 0.95, [0.72, 0.74, 0.8])), paint);
  // the glass: the windscreen, the fastback's window (laid along its curve), one long window a side
  const LIFT = CBEV + 0.006, CH = CW / 2;
  const zAt = ([[z0, y0], [z1, y1]], y) => z0 + (z1 - z0) * (y - y0) / (y1 - y0);
  const top = (z) => heightAt(roof, z) - 0.05;
  const backAt = (y) => { for (let i = 0; i + 1 < back.length; i++) if ((y - back[i][1]) * (y - back[i + 1][1]) <= 0) return zAt([back[i], back[i + 1]], y); return back.at(-1)[0]; };
  const SY = 1.07; // (the side windows' sill)
  const rearGlass = back.filter(([, y]) => y > 1.1 && y < TOP - 0.02);
  parts(group, k + 'glass', GLASS, () => [
    slopeGlass([zAt(WS, 1.04), 1.04], WS[1], CH, TAPER, CBEV + 0.03, [0.02, 0.04], LIFT),
    slopeGlass(rearGlass[0], rearGlass.at(-1), CH, TAPER, CBEV + 0.08, [0, 0], LIFT + 0.02), // (one pane on the curve's chord, lifted clear of its bulge)
    ...sideGlass([[[zAt(WS, SY) - 0.1, SY], [backAt(SY) + 0.3, SY], [backAt(top(-0.8)) + 0.12, top(-0.8)],
      [-0.4, top(-0.4)], [zAt(WS, top(-0.02)) - 0.08, top(-0.02)]]], CH, TAPER, 0.006),
  ]);
  // the swan's face: a slim upright grille in the breast, beak orange, in a black surround (the knob at the beak's
  // root); the headlamps in the wings' noses, each in a black ring
  const GZ = NOSE + 0.1; // (the breast's face, at the grille's height)
  place(group, shared(k + 'beak', () => merge([blob(0.075, 0.15, 0.03, 0, 0.6, GZ + 0.03, 0, 0, [10, 5])])), beak);
  const LZ = NOSE - 0.04, LY = 0.6;
  parts(group, k + 'mask', MASK, () => [
    blob(0.11, 0.19, 0.04, 0, 0.62, GZ, 0, 0, [10, 5]),
    ...[-1, 1].map(s => blob(0.14, 0.13, 0.08, s * fx, LY, LZ, 0, 0, [8, 5])),
  ]);
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => blob(0.11, 0.1, 0.06, s * fx, LY, LZ + 0.05, 0, 0, [8, 5])));
  // the tail: a feather-long lamp up each rear wing's lifted tail, a brake lamp at the body's tail
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => tear(0.055, 0.04, 0.15, s * fx, 0.6, TAILZ - 0.08, -1.75, 0)));
  parts(group, k + 'stop', STOP, () => [blob(0.14, 0.04, 0.04, 0, 0.7, TAILZ - 0.1, 0, 0, [8, 4])]);
  for (const side of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, 0.24, side * (W - 0.17), z, 0.22, HUB);
  const accent = (hex) => beak.color.setHex(hex);
  group.userData = {
    body,
    animate: () => {},
    livery: (evil) => accent(evil ? 0xd8341f : 0xf08a1c),
    stripe: accent,
  };
  return group;
};
