// ---- the sixth batch of car ideas' models ----------------------------------------------------------
// Five more vehicles drawn as ideas (ideas.js: IDEA_CARS, the entries after the Game-Drive Truck): two older ones
// (a vintage blown open tourer of 1929 and a split-level highway coach of 1954) and three modern ones (a
// horseshoe-grilled hypercar of 2016, a tall electric city car of 2013 and a coupe crossover of 2011).
// Built as ideaModels.js' are (the same helpers, kept here as copies so that the files do not import each other),
// but lighter: few curve segments, one geometry for each set of identical parts, and parts that share a material
// and never move merged into one mesh. Each builder takes the idea's entry and returns a group, front facing local
// +z, with userData.body (the mesh whose material is the paint, so the livery can be swapped; every part in the
// paint shares that one material), userData.animate (seconds) => void, and userData.livery (evil) => void where a
// second colour differs between Good and Evil. ideaModels.js spreads IDEA_MODELS_6 into IDEA_MODELS. State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
const TYRE = lambert(0x141414), WHITE = lambert(0xf4f2ec);
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const AMBER = new THREE.MeshBasicMaterial({ color: 0xffa31a });
// one geometry for each set of identical parts (four wheels, a pair of lamps), made the first time it is asked for
const SHARED = new Map();
const shared = (key, make) => { if (!SHARED.has(key)) SHARED.set(key, make()); return SHARED.get(key); };
const place = (parent, geo, material, x, y, z) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (parent, material, w, h, l, x, y, z) => place(parent, shared('box' + [w, h, l], () => new THREE.BoxGeometry(w, h, l)), material, x, y, z);
// a wheel: a tyre and a hub, the axle across the car (returns [tyre, hub])
const wheel = (parent, radius, width, x, y, z, hubMaterial) => {
  const tyre = place(parent, shared('tyre' + [radius, width], () => new THREE.CylinderGeometry(radius, radius, width, 16).rotateZ(Math.PI / 2)), TYRE, x, y, z);
  const hub = place(parent, shared('hub' + [radius, width], () => new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.03, 12).rotateZ(Math.PI / 2)), hubMaterial, x, y, z);
  return [tyre, hub];
};
// a flat panel tipped about the car's width. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
// a solid block whose side view is the polygon `profile` ([z, y] points), `w` wide across the car, its middle at x
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2, 0, 0);
  return place(parent, geo, material, 0, 0, 0);
};
// a side view with its corners rounded off: the polygon `points` ([z, y], or [z, y, r] for a corner of its own)
const rounded = (points, r = 0.08) => {
  const shape = new THREE.Shape(), n = points.length;
  points.forEach(([z, y, own], i) => {
    const [az, ay] = points[(i + n - 1) % n], [cz, cy] = points[(i + 1) % n];
    const la = Math.hypot(az - z, ay - y), lc = Math.hypot(cz - z, cy - y), k = Math.min(own ?? r, la / 2, lc / 2);
    const from = [z + (az - z) / la * k, y + (ay - y) / la * k], to = [z + (cz - z) / lc * k, y + (cy - y) / lc * k];
    if (i) shape.lineTo(from[0], from[1]); else shape.moveTo(from[0], from[1]);
    if (k > 0.001) shape.quadraticCurveTo(z, y, to[0], to[1]);
  });
  shape.closePath();
  return shape;
};
// a solid whose side view is the curved THREE.Shape `shape`, `w` wide across the car with its edges rounded off by
// `round` (the rounding adds `round` all round the side view too), its middle at x
const curved = (parent, material, w, shape, round, x = 0) => {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: w - 2 * round, curveSegments: 5, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 1,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2 - round, 0, 0);
  return place(parent, geo, material, 0, 0, 0);
};
// a round lamp (or anything disc-shaped) facing along the car
const disc = (parent, material, r, depth, x, y, z, seg = 12) =>
  place(parent, shared('disc' + [r, depth, seg], () => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2)), material, x, y, z);
// a round bar: `axis` 'x' across the car, 'y' upright, 'z' along it
const tube = (parent, material, r, length, x, y, z, axis = 'y', seg = 10) => place(parent, shared('tube' + [r, length, axis, seg], () => {
  const geo = new THREE.CylinderGeometry(r, r, length, seg);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return geo;
}), material, x, y, z);
// a rounded lump: a ball squashed to rx, ry, rz
const BALL = new THREE.SphereGeometry(1, 10, 6);
const blob = (parent, material, rx, ry, rz, x, y, z) => {
  const mesh = place(parent, BALL, material, x, y, z);
  mesh.scale.set(rx, ry, rz);
  return mesh;
};
// a block that narrows (or grows) along the car: from the cross-section `a` to `b`, each [z, width, bottom, top],
// its middle at x. A nose, a tail
const taper = (parent, material, a, b, x = 0) => {
  const corners = [];
  for (const [z, w, y0, y1] of [a[0] < b[0] ? a : b, a[0] < b[0] ? b : a]) corners.push([-w / 2, y0, z], [w / 2, y0, z], [w / 2, y1, z], [-w / 2, y1, z]);
  const faces = [4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 0, 7, 3, 0, 4, 7];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(i => [corners[i][0] + x, corners[i][1], corners[i][2]]), 3));
  geo.computeVertexNormals(); // (no shared corners: each face flat)
  return place(parent, geo, material, 0, 0, 0);
};
// ---- parts merged into one mesh: each of these makes a geometry already in its place, and `merged` joins them
const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
const cyl = (r, length, x, y, z, axis = 'y', seg = 10) => {
  const geo = new THREE.CylinderGeometry(r, r, length, seg);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return geo.translate(x, y, z);
};
// the top half of a ring lying flat on a flank (a wheel arch's lip), its middle at (x, y, z)
const lip = (r, t, x, y, z) => new THREE.TorusGeometry(r, t, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(x, y, z);
// the top half of a thin disc on a flank (a dark wheel well behind a wheel)
const well = (r, x, y, z) => new THREE.CylinderGeometry(r, r, 0.01, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(x, y, z);
const merged = (parent, material, geos) => place(parent, mergeGeometries(geos, false), material, 0, 0, 0);

// a body lofted through cross-sections along the car: `rings` is a list of [z, points] going nose-ward or tail-ward,
// each points a closed loop of [x, y] (as many in every ring, in the same order); both ends closed with a fan to their
// middle. Its material should be double-sided (the winding is not looked after)
const loft = (parent, material, rings) => {
  const n = rings[0][1].length, pos = [], idx = [];
  for (const [z, pts] of rings) for (const [x, y] of pts) pos.push(x, y, z);
  for (let r = 0; r + 1 < rings.length; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + (i + 1) % n, c = (r + 1) * n + i, d = (r + 1) * n + (i + 1) % n;
      idx.push(a, b, d, a, d, c);
    }
  }
  for (const r of [0, rings.length - 1]) {
    const [z, pts] = rings[r], mid = pos.length / 3;
    pos.push(pts.reduce((t, p) => t + p[0], 0) / n, pts.reduce((t, p) => t + p[1], 0) / n, z);
    for (let i = 0; i < n; i++) idx.push(mid, r * n + i, r * n + (i + 1) % n);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return place(parent, geo, material, 0, 0, 0);
};
// linear interpolation through keys [z, ...values] (sorted by z) at z
const along = (keys, z) => {
  if (z <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const [z1, ...b] = keys[i], [z0, ...a] = keys[i - 1];
    if (z <= z1) { const t = (z - z0) / (z1 - z0); return a.map((v, j) => v + (b[j] - v) * t); }
  }
  return keys[keys.length - 1].slice(1);
};
export const IDEA_MODELS_6 = {
  // A blown vintage tourer (a 1929 Bentley 4½ Litre "Blower"): open, long and upright. A supercharger drum juts
  // out under a tall radiator with a mesh stone guard; two big lamps on a bar between cycle wings; a long louvred
  // bonnet with a leather strap round it; two aero screens and two bucket seats in an open tub; running boards
  // from wing to wing, a spare wheel on the flank, an exhaust down the other; a slab of a fuel tank on the tail,
  // with its filler, two tail lamps and a stop lamp. Wire wheels. It sits still
  blower: (car) => {
    const group = new THREE.Group();
    const R = 0.4, X = 0.72, ZF = 1.5, ZR = -1.75;
    const paint = lambert(car.color);
    paint.side = THREE.DoubleSide; // (the cycle wings are thin shells, seen from under as well as over)
    const chrome = lambert(CHROME), trim = lambert(TRIM), leather = lambert(0x4a2e1e), wire = lambert(0xb4b8be);
    const alloy = lambert(0xc9ccd0), glass = lambert(GLASS), iron = lambert(0x55524e);
    // the chassis: two rails nose to tail, and the axles under them
    for (const side of [-1, 1]) box(group, trim, 0.08, 0.1, 3.75, side * 0.36, 0.47, -0.08);
    for (const z of [ZF, ZR]) tube(group, trim, 0.035, 1.3, 0, R, z, 'x');
    // the radiator, upright, with its stone guard and its cap; the supercharger out in front of it, between the rails
    box(group, chrome, 0.66, 0.74, 0.1, 0, 0.85, 1.4);
    box(group, trim, 0.54, 0.6, 0.02, 0, 0.86, 1.455);
    tube(group, chrome, 0.04, 0.08, 0, 1.26, 1.4, 'y');
    tube(group, alloy, 0.13, 0.42, 0, 0.56, 1.65, 'z', 14);
    disc(group, chrome, 0.09, 0.04, 0, 0.56, 1.88);
    // the long bonnet, its leather strap and louvres; the scuttle; the open tub, two bucket seats, the wheel
    const body = box(group, paint, 0.84, 0.64, 1.22, 0, 0.82, 0.74);
    box(group, leather, 0.86, 0.52, 0.05, 0, 0.885, 0.78);
    box(group, chrome, 0.03, 0.015, 1.2, 0, 1.146, 0.74);                                   // (the bonnet's hinge, down its middle)
    merged(group, trim, [-1, 1].flatMap(side => [1.0, 0.92, 0.84, 0.76].map(y => bx(0.012, 0.03, 0.38, side * 0.422, y, 1.07))));
    taper(group, paint, [0.16, 0.86, 0.51, 1.15], [-0.12, 0.92, 0.51, 1.2]);
    box(group, paint, 0.9, 0.53, 1.45, 0, 0.765, -0.775);
    box(group, trim, 0.8, 0.02, 1.0, 0, 1.035, -0.65);
    merged(group, leather, [-1, 1].map(side => bx(0.36, 0.34, 0.1, side * 0.2, 1.12, -0.95, -0.12)));
    const steering = place(group, new THREE.TorusGeometry(0.17, 0.016, 6, 14), trim, -0.2, 1.2, -0.42);
    steering.rotation.x = -0.35;
    tube(group, trim, 0.02, 0.32, -0.2, 1.17, -0.27, 'z');
    for (const side of [-1, 1]) slab(group, glass, 0.32, 0.2, 0.015, side * 0.2, 1.28, -0.04, -0.35);
    // the cycle wings, a stay under each, the running boards between them
    const wingF = shared('blowerWingF', () => new THREE.CylinderGeometry(R + 0.07, R + 0.07, 0.22, 12, 1, true, 0.55, 2.4).rotateZ(Math.PI / 2));
    const wingR = shared('blowerWingR', () => new THREE.CylinderGeometry(R + 0.07, R + 0.07, 0.24, 12, 1, true, 0.2, 2.1).rotateZ(Math.PI / 2));
    const stays = [];
    for (const side of [-1, 1]) {
      place(group, wingF, paint, side * X, R, ZF);
      place(group, wingR, paint, side * X, R, ZR);
      stays.push(cyl(0.02, 0.3, side * 0.57, 0.84, ZF - 0.15, 'x', 8), cyl(0.02, 0.3, side * 0.57, 0.84, ZR + 0.15, 'x', 8));
      box(group, trim, 0.39, 0.04, 2.34, side * 0.585, 0.47, -0.12);
      wheel(group, R, 0.16, side * X, R, ZF, wire);
      wheel(group, R, 0.16, side * X, R, ZR, wire);
    }
    merged(group, trim, stays);
    // the lamps: a bar between the front wings, a big lamp each side on it
    tube(group, chrome, 0.022, 1.44, 0, 0.87, 1.62, 'x');
    for (const side of [-1, 1]) {
      disc(group, chrome, 0.13, 0.2, side * 0.36, 1.0, 1.62, 14);
      disc(group, LAMP, 0.11, 0.02, side * 0.36, 1.0, 1.725, 14);
    }
    // the spare wheel on the near flank, on its bracket; the exhaust down the other
    wheel(group, R, 0.16, 0.53, 0.89, 0.4, wire);
    tube(group, chrome, 0.03, 0.2, 0.52, 0.89, 0.4, 'x');
    tube(group, iron, 0.045, 1.6, -0.49, 0.6, 0.15, 'z');
    // the tail: the fuel tank, its filler, two tail lamps, a stop lamp and the plate
    box(group, paint, 0.86, 0.45, 0.48, 0, 0.73, -1.71);
    tube(group, chrome, 0.08, 0.06, 0, 0.985, -1.71, 'y', 12);
    for (const side of [-1, 1]) disc(group, TAIL, 0.05, 0.04, side * 0.3, 0.62, -1.96);
    box(group, TAIL, 0.14, 0.06, 0.03, 0, 0.88, -1.955);
    box(group, WHITE, 0.34, 0.12, 0.02, 0, 0.72, -1.955);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A highway coach (a 1954 GM Scenicruiser): long and slab-sided, with a split-level roof: a low deck at the
  // front and a raised deck behind a glazed step, windows all round both, fluted sides under them; a flat face with
  // a split windscreen, a destination sign over it, four lamps and five markers on the roof; the door at the front
  // on the kerb side; three axles, the last a tag axle; louvres for the engine at the back, tail and stop lamps.
  // It sits still
  coach: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.5, rr = 0.06, S = w * 0.98 / 2; // (S: the flank)
    const paint = lambert(car.color), glass = lambert(0x33465c), chrome = lambert(CHROME), trim = lambert(TRIM); // (the glass tinted blue, to read on a dark coach too)
    const body = curved(group, paint, w * 0.98, rounded([[L - rr, 0.45, 0.1], [L - rr, 2.8, 0.15], [L * 0.3, 2.8, 0.05], [L * 0.3 - 0.3, 3.18, 0.05], [-L + rr, 3.18, 0.2], [-L + rr, 0.45, 0.1]]), rr);
    // the glass: the low deck's windows, the raised deck's, the step between them; the pillars across both
    prism(group, glass, w * 0.98 + 0.03, [[L * 0.93, 1.95], [L * 0.93, 2.68], [L * 0.32, 2.68], [L * 0.32, 1.95]]);
    prism(group, glass, w * 0.98 + 0.03, [[L * 0.24, 2.4], [L * 0.24, 3.06], [-L * 0.9, 3.06], [-L * 0.9, 2.4]]);
    const stepPitch = Math.atan2(0.38, 0.3);
    slab(group, glass, w * 0.88, 0.02, 0.4, 0, 3.033, L * 0.3 - 0.15 + 0.057, stepPitch);
    merged(group, paint, [
      ...[0.75, 0.6, 0.45].map(f => bx(w * 0.98 + 0.05, 0.75, 0.08, 0, 2.315, L * f)),
      ...[1, 2, 3, 4, 5, 6].map(k => bx(w * 0.98 + 0.05, 0.68, 0.1, 0, 2.73, L * (0.24 - k * 0.163))),
    ]);
    // the flanks: a bright strip under the windows, the flutes, a dark well behind each wheel
    merged(group, chrome, [-1, 1].flatMap(side => [
      bx(0.02, 0.05, L * 1.84, side * (S + 0.012), 1.9, -L * 0.04),                       // (under the low deck's windows, on to the tail)
      bx(0.02, 0.04, L * 1.16, side * (S + 0.012), 2.36, -L * 0.33),                      // (under the raised deck's,
      bx(0.02, 0.04, L * 1.16, side * (S + 0.012), 3.1, -L * 0.33),                       // over them,
      bx(0.02, 0.04, L * 0.62, side * (S + 0.012), 2.72, L * 0.625),                      // and over the low deck's)
    ]));
    merged(group, chrome, [-1, 1].flatMap(side => [1.15, 1.35, 1.55, 1.75].map(y => {
      const front = side < 0 ? L * 0.76 : L * 0.9, back = -L * 0.96;
      return bx(0.02, 0.04, front - back, side * (S + 0.008), y, (front + back) / 2);
    })));
    const axles = [L * 0.7, -L * 0.5, -L * 0.72];
    merged(group, trim, [-1, 1].flatMap(side => axles.map(z => well(R + 0.14, side * (S + 0.004), R, z))));
    for (const side of [-1, 1]) for (const z of axles) wheel(group, R, 0.3, side * (S - 0.12), R, z, chrome);
    // the face: the split windscreen, the destination sign, four lamps, the grille, the bumper; markers on the roof
    for (const side of [-1, 1]) box(group, glass, w * 0.45, 0.7, 0.03, side * w * 0.235, 2.15, L + 0.012);
    box(group, trim, 1.5, 0.15, 0.04, 0, 2.58, L + 0.015);
    box(group, lambert(0xf2eccf), 1.3, 0.1, 0.02, 0, 2.58, L + 0.035);
    for (const side of [-1, 1]) box(group, chrome, 0.5, 0.18, 0.04, side * 0.8, 0.85, L + 0.01);
    merged(group, LAMP, [-1, 1].flatMap(side => [0.68, 0.92].map(x => cyl(0.07, 0.03, side * x, 0.85, L + 0.035, 'z', 12))));
    merged(group, AMBER, [-1, 1].map(side => bx(0.16, 0.08, 0.03, side * 0.8, 1.02, L + 0.012)));
    box(group, trim, 0.9, 0.3, 0.03, 0, 0.85, L + 0.01);
    box(group, chrome, w, 0.18, 0.14, 0, 0.48, L + 0.04);
    merged(group, AMBER, [-0.5, -0.25, 0, 0.25, 0.5].map(x => bx(0.08, 0.05, 0.06, x, 2.88, L - 0.25)));
    // the mirrors, out on long arms
    merged(group, trim, [-1, 1].map(side => cyl(0.02, 0.22, side * (S + 0.1), 2.3, L - 0.15, 'x', 8)));
    merged(group, trim, [-1, 1].map(side => bx(0.06, 0.3, 0.15, side * (S + 0.22), 2.25, L - 0.15)));
    // the door, at the front on the kerb side
    box(group, glass, 0.02, 2.05, L * 0.15, -(S + 0.015), 1.55, L * 0.87);
    // the back: the engine's louvres, a window up high, tail, stop and reversing lamps, the bumper and the plate
    merged(group, trim, [1.0, 1.12, 1.24, 1.36, 1.48, 1.6].map(y => bx(2.0, 0.04, 0.03, 0, y, -L - 0.01)));
    box(group, glass, 1.6, 0.4, 0.02, 0, 2.75, -L - 0.005);
    merged(group, TAIL, [-1, 1].map(side => bx(0.16, 0.45, 0.04, side * 1.02, 0.95, -L - 0.01)));
    merged(group, TAIL, [-1, 1].map(side => cyl(0.08, 0.04, side * 1.0, 2.75, -L - 0.01, 'z', 12)));
    merged(group, LAMP, [-1, 1].map(side => bx(0.14, 0.1, 0.04, side * 1.02, 0.65, -L - 0.01)));
    box(group, chrome, w, 0.18, 0.14, 0, 0.48, -L - 0.04);
    box(group, WHITE, 0.4, 0.2, 0.02, 0, 0.78, -L - 0.01);
    group.userData = { body, animate: () => {} };
    return group;
  },
  // A horseshoe-grilled hypercar (a Bugatti Chiron, 2016): low, wide and rounded, lofted through cross-sections: a
  // domed nose round a big horseshoe grille, a waist at the cabin and big rounded haunches over the wheels (the back
  // ones wider), a bubble of a canopy whose top and engine cover are in carbon, with a fin down its middle to a stop
  // lamp; a chrome C round an intake on each flank; four little square lamps in each headlamp; a tucked-in tail with
  // a light bar following its curve over a black mesh and one round exhaust; a wing that rises out of the tail
  horseshoe: (car) => {
    const group = new THREE.Group();
    const paint = lambert(car.color), carbon = lambert(0x3a4150), chrome = lambert(CHROME), trim = lambert(TRIM);
    const glass = lambert(GLASS);
    for (const m of [paint, carbon, glass]) m.side = THREE.DoubleSide;
    const NU = 2.6, NC = 2.2; // (how square the body's and the canopy's shoulders are: 2 round, more squarer)
    // the body: [z, half width at its widest, the height of that, the height of the deck on the middle, the floor, the sill's half width]
    const BODY = [
      [-2.27, 0.72, 0.62, 0.8, 0.34, 0.66], [-2.15, 0.93, 0.66, 0.9, 0.3, 0.84], [-1.9, 1.0, 0.72, 0.95, 0.27, 0.9],
      [-1.44, 1.02, 0.74, 0.96, 0.27, 0.9], [-1.0, 0.99, 0.7, 0.96, 0.27, 0.9], [-0.5, 0.92, 0.62, 0.93, 0.26, 0.88],
      [0.0, 0.9, 0.6, 0.88, 0.26, 0.86], [0.6, 0.93, 0.6, 0.82, 0.26, 0.87], [1.27, 0.99, 0.64, 0.75, 0.26, 0.88],
      [1.8, 0.95, 0.58, 0.68, 0.26, 0.84], [2.12, 0.8, 0.52, 0.64, 0.27, 0.72], [2.27, 0.55, 0.46, 0.58, 0.3, 0.5],
    ];
    const AXLES = [[1.27, 0.36, 0.26, 0.97], [-1.44, 0.375, 0.3, 1.0]]; // [z, radius, width, the tyre's outer face]
    // a cross-section's figures at z: under the haunches the side is cut back to clear the wheel, up to an arch
    const section = (z) => {
      let [wHigh, yb, yTop, y0, wLow] = along(BODY, z), yLip = yb - 0.12;
      for (const [za, R, width, outer] of AXLES) {
        const dz = Math.abs(z - za), Ra = R + 0.07;
        if (dz < 0.42) {
          wLow = outer - width - 0.02;
          yLip = dz < Ra ? R + Math.sqrt(Ra * Ra - dz * dz) : y0 + 0.1;
          yb = Math.max(yb, yLip + 0.04);
        }
      }
      return { wHigh, yb, yTop, y0, wLow, yLip };
    };
    const upper = (w, yb, yTop, t, n) => [w * Math.pow(Math.abs(Math.cos(t)), 2 / n), yb + (yTop - yb) * Math.pow(Math.max(0, Math.sin(t)), 2 / n)];
    const ANG = [0, 1, 2, 3, 4, 5].map(i => i * Math.PI / 12);
    const ring = (z) => {
      const { wHigh, yb, yTop, y0, wLow, yLip } = section(z);
      const side = [[wLow - 0.08, y0], [wLow, y0 + 0.06], [wLow, Math.max(y0 + 0.08, yLip - 0.02)], [wHigh - 0.02, yLip], ...ANG.map(t => upper(wHigh, yb, yTop, t, NU))];
      return [[0, y0], ...side, [0, yTop], ...side.slice().reverse().map(([x, y]) => [-x, y])];
    };
    const zs = new Set(BODY.map(k => k[0]));
    for (const [za] of AXLES) for (const dz of [-0.47, -0.4, -0.27, 0, 0.27, 0.4, 0.47]) zs.add(Math.round((za + dz) * 1000) / 1000);
    const body = loft(group, paint, [...zs].sort((a, b) => a - b).map(z => [z, ring(z)]));
    // where the body's side is at (z, y), and its top at (z, x): for parts to sit on it
    const sideX = (z, y) => {
      const { wHigh, yb, yTop, wLow, yLip } = section(z);
      if (y >= yb) { const sn = Math.pow(Math.min(1, (y - yb) / (yTop - yb)), NU / 2); return wHigh * Math.pow(Math.sqrt(1 - sn * sn), 2 / NU); }
      return y >= yLip ? wHigh - 0.02 + 0.02 * (y - yLip) / (yb - yLip) : wLow;
    };
    const topY = (z, x) => {
      const { wHigh, yb, yTop } = section(z);
      const c = Math.pow(Math.min(1, Math.abs(x) / wHigh), NU / 2);
      return yb + (yTop - yb) * Math.pow(Math.sqrt(1 - c * c), 2 / NU);
    };
    // the canopy: [z, half width, the height of its foot, the height of its top]
    const CANOPY = [[-1.85, 0.28, 0.92, 0.95], [-1.5, 0.46, 0.92, 0.99], [-1.1, 0.6, 0.9, 1.08], [-0.7, 0.69, 0.88, 1.17], [-0.3, 0.72, 0.84, 1.21],
      [0.1, 0.72, 0.8, 1.15], [0.45, 0.68, 0.76, 1.02], [0.75, 0.6, 0.72, 0.86], [0.95, 0.42, 0.7, 0.73]];
    loft(group, glass, CANOPY.map(([z, wc, base, top]) => {
      const side = [[wc * 0.97, base - 0.1], ...ANG.map(t => upper(wc, base, top, t, NC))];
      return [z, [[0, base - 0.1], ...side, [0, top], ...side.slice().reverse().map(([x, y]) => [-x, y])]];
    }));
    // its top and the engine cover in carbon: a shell over the canopy, reaching further down its sides towards the tail
    const COVER = { 0.45: 0.4, 0.1: 0.55, '-0.3': 0.6, '-0.7': 0.95, '-1.1': 1.45, '-1.5': 1.571, '-1.85': 1.571 };
    loft(group, carbon, CANOPY.filter(([z]) => z <= 0.45).map(([z, wc, base, top]) => {
      const a = COVER[String(z)], arc = [0, 1, 2, 3].map(i => Math.PI / 2 - a * (1 - i / 4));
      const out = arc.map(t => upper(wc + 0.012, base, top + 0.012, t, NC)), inn = arc.map(t => upper(wc - 0.004, base, top - 0.004, t, NC));
      return [z, [...out, [0, top + 0.012], ...out.slice().reverse().map(([x, y]) => [-x, y]), ...inn.map(([x, y]) => [-x, y]), [0, top - 0.004], ...inn.slice().reverse()]];
    }));
    // the fin down the middle, from the roof to the tail, and the stop lamp at its end
    prism(group, carbon, 0.05, [[0.1, 1.2], [-0.3, 1.26], [-0.7, 1.22], [-1.1, 1.13], [-1.5, 1.04], [-1.85, 0.99], [-2.1, 0.95],
      [-2.1, 0.88], [-1.85, 0.92], [-1.5, 0.96], [-1.1, 1.05], [-0.7, 1.14], [-0.3, 1.18], [0.1, 1.12]]);
    box(group, TAIL, 0.1, 0.03, 0.04, 0, 0.935, -2.115);
    // the horseshoe, big in the middle of the nose: a chrome one, the black mesh in it
    const shoe = (k) => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.17 * k, 0);
      shape.lineTo(-0.17 * k, 0.12 * k);
      shape.absarc(0, 0.12 * k, 0.17 * k, Math.PI, 0, true);
      shape.lineTo(0.17 * k, 0);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false, curveSegments: 6 });
    };
    place(group, shared('shoe1.25', () => shoe(1.25)), chrome, 0, 0.29, 2.12);
    place(group, shared('shoe1.0', () => shoe(1.0)), trim, 0, 0.32, 2.125);
    // the headlamps, tucked into the nose's corners: a dark housing on the curve, four little square lamps in a row
    const lamps = [];
    for (const side of [-1, 1]) {
      const x = side * 0.53, z = 1.98, y = topY(z, x) + 0.005;
      const pitch = Math.atan2(topY(z - 0.08, x) - topY(z + 0.08, x), 0.16), roll = Math.atan2(topY(z, x + 0.06) - topY(z, x - 0.06), 0.12);
      const housing = box(group, trim, 0.4, 0.04, 0.18, x, y, z);
      housing.rotation.set(pitch, 0, roll);
      for (const dx of [-0.135, -0.045, 0.045, 0.135]) lamps.push(bx(0.07, 0.03, 0.08, dx, 0.02, 0, 0, 0, 0).applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pitch, 0, roll))).translate(x, y, z));
    }
    merged(group, LAMP, lamps);
    merged(group, AMBER, [-1, 1].map(side => bx(0.1, 0.03, 0.06, side * 0.66, 0.47, 2.0)));
    merged(group, trim, [-1, 1].map(side => bx(0.3, 0.12, 0.2, side * 0.47, 0.38, 2.1)));                   // the intakes either side of it
    box(group, carbon, 1.3, 0.035, 0.3, 0, 0.285, 2.0);                                                     // the splitter
    // the flanks: the C round an intake, mirrors on stalks
    const C = [];
    for (let i = 0; i <= 10; i++) {
      const f = -0.55 * Math.PI + i * 0.11 * Math.PI, z = -0.25 - 0.24 * Math.cos(f), y = 0.55 + 0.24 * Math.sin(f);
      C.push(new THREE.Vector3(sideX(z, y) + 0.012, y, z));
    }
    const curveC = new THREE.CatmullRomCurve3(C);
    for (const side of [-1, 1]) {
      const tubeC = place(group, shared('chironC2', () => new THREE.TubeGeometry(curveC, 12, 0.025, 4, false)), chrome, 0, 0, 0);
      tubeC.scale.x = side;
      box(group, trim, 0.03, 0.3, 0.24, side * (sideX(-0.22, 0.55) - 0.005), 0.55, -0.22);
    }
    merged(group, carbon, [-1, 1].flatMap(side => [bx(0.16, 0.07, 0.11, side * 0.82, 0.92, 0.55), bx(0.16, 0.025, 0.04, side * 0.68, 0.89, 0.55)]));
    // the wheels
    for (const side of [-1, 1]) {
      for (const [za, R, width, outer] of AXLES) wheel(group, R, width, side * (outer - width / 2), R, za, lambert(0x9aa0a8));
    }
    // the tail: the light bar along its curve, the black mesh, the exhaust, the diffuser
    const bar = new THREE.CatmullRomCurve3([[-0.88, -2.15], [-0.74, -2.225], [-0.5, -2.28], [0, -2.285], [0.5, -2.28], [0.74, -2.225], [0.88, -2.15]].map(([x, z]) => new THREE.Vector3(x, 0.76, z)));
    place(group, new THREE.TubeGeometry(bar, 14, 0.022, 4, false), TAIL, 0, 0, 0);
    box(group, trim, 1.0, 0.22, 0.02, 0, 0.5, -2.276);
    disc(group, chrome, 0.075, 0.06, 0, 0.4, -2.28);
    disc(group, trim, 0.055, 0.02, 0, 0.4, -2.305);
    box(group, trim, 1.0, 0.08, 0.3, 0, 0.33, -2.12);
    // the wing, and its struts, which rise out of the tail together
    const wing = new THREE.Group();
    group.add(wing);
    box(wing, carbon, 1.3, 0.03, 0.3, 0, 0.985, -1.97);                                    // (at rest it lies in the engine cover)
    merged(wing, trim, [-1, 1].map(side => bx(0.03, 0.22, 0.1, side * 0.35, 0.87, -1.97)));
    group.userData = {
      body,
      animate: (t) => { // (down for most of the time; up now and then)
        const up = Math.max(0, Math.min(1, Math.sin(t * 0.5) * 3 - 1.5));
        wing.position.y = up * 0.14;
      },
      livery: (evil) => carbon.color.setHex(evil ? 0x1c1d22 : 0x3a4150),
    };
    return group;
  },

  // A tall electric city car (a BMW i3, 2013): short, narrow and upright, on tall skinny tyres. A black bonnet; a
  // black band across the face with two blanked-off nostrils and a U of light in each lamp; a long steep windscreen,
  // a black roof, and a black belt that dips under the back door's window and sweeps up into a black tail, the
  // whole tailgate black glass with U-shaped lamps in it; black sills and arch lips; doors that open from the middle.
  // It sits still
  cityev: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36, rr = 0.05, ZW = L * 0.64, S = w * 0.96 / 2;
    const paint = lambert(car.color), black = lambert(0x1c1d21), glass = lambert(GLASS), grey = lambert(0x4a5568), steel = lambert(0xb8bcc2);
    const body = curved(group, paint, w * 0.96, rounded([[-L + rr, 0.33], [L - rr, 0.33], [L - rr, 0.74], [L * 0.8, 0.84], [L * 0.42, 0.92], [-L * 0.6, 0.96], [-L + rr, 0.96]]), rr);
    prism(group, black, w * 0.9, [[L * 0.86, 0.78], [L * 0.86, 0.866], [L * 0.8, 0.9], [L * 0.42, 0.98], [L * 0.42, 0.85]]); // the black bonnet
    // the glasshouse, the black roof over it, the black tail behind it, the pillars at the windscreen
    prism(group, glass, w * 0.88, [[L * 0.44, 0.93], [L * 0.06, 1.5], [-L * 0.64, 1.52], [-L * 0.64, 0.93]]);
    box(group, black, w * 0.86, 0.05, L * 0.7, 0, 1.53, -L * 0.29);
    prism(group, black, w * 0.9, [[-L * 0.6, 0.94], [-L * 0.66, 1.54], [-L * 0.9, 1.5], [-L - 0.03, 1.1], [-L - 0.03, 0.62], [-L * 0.6, 0.62]]);
    for (const side of [-1, 1]) {
      prism(group, black, 0.05, [[L * 0.45, 0.95], [L * 0.39, 0.95], [L * 0.03, 1.51], [L * 0.09, 1.51]], side * w * 0.43);
      prism(group, black, 0.02, [[0, 0.965], [0, 0.945], [-L * 0.5, 0.82], [-L * 0.62, 0.82], [-L * 0.62, 0.965]], side * (S + 0.01)); // the belt's dip
      box(group, black, 0.14, 0.09, 0.08, side * 0.84, 1.0, L * 0.36);                    // mirrors
    }
    merged(group, black, [-1, 1].flatMap(side => [
      bx(0.012, 0.58, 0.015, side * (S + 0.004), 0.64, -L * 0.1),                          // (where the doors meet,
      bx(0.03, 0.5, 0.015, side * w * 0.44, 1.2, -L * 0.1),                                // and in the glass over it)
      bx(0.02, 0.1, L * 1.6, side * (S + 0.008), 0.38, 0),                                 // the sills
    ]));
    merged(group, black, [-1, 1].flatMap(side => [lip(R + 0.05, 0.035, side * (S + 0.016), R, ZW), lip(R + 0.05, 0.035, side * (S + 0.016), R, -ZW)]));
    merged(group, steel, [-1, 1].map(side => bx(0.02, 0.025, 0.12, side * (S + 0.01), 0.86, L * 0.1)));  // the door handles
    merged(group, AMBER, [-1, 1].map(side => bx(0.012, 0.03, 0.08, side * (S + 0.006), 0.78, L * 0.5))); // side repeaters
    box(group, black, 0.012, 0.12, 0.12, -(S + 0.006), 0.82, -L * 0.82);                  // the charging flap
    blob(group, black, 0.04, 0.05, 0.12, 0, 1.555, -L * 0.55);                              // the aerial's fin
    // the face: the black band, the lamps in it, the nostrils, the intake, the plate
    box(group, black, 1.5, 0.15, 0.03, 0, 0.66, L + 0.005);
    merged(group, LAMP, [-1, 1].flatMap(side => [
      bx(0.26, 0.022, 0.02, side * 0.52, 0.61, L + 0.025), bx(0.022, 0.09, 0.02, side * 0.4, 0.65, L + 0.025), bx(0.022, 0.09, 0.02, side * 0.64, 0.65, L + 0.025),
      cyl(0.035, 0.02, side * 0.52, 0.665, L + 0.025, 'z', 10),
    ]));
    merged(group, AMBER, [-1, 1].map(side => bx(0.06, 0.03, 0.02, side * 0.71, 0.7, L + 0.025)));
    merged(group, grey, [-1, 1].map(side => bx(0.14, 0.09, 0.02, side * 0.09, 0.68, L + 0.025)));
    box(group, black, 0.9, 0.12, 0.04, 0, 0.42, L + 0.005);
    box(group, WHITE, 0.42, 0.1, 0.02, 0, 0.44, L + 0.03);
    // the tail: U lamps in the black glass, the stop lamp at the roof's end, reversing lamps, the diffuser, the plate
    merged(group, TAIL, [-1, 1].flatMap(side => [
      bx(0.025, 0.2, 0.02, side * 0.72, 0.95, -L - 0.04), bx(0.18, 0.025, 0.02, side * 0.63, 1.04, -L - 0.04), bx(0.18, 0.025, 0.02, side * 0.63, 0.86, -L - 0.04),
    ]));
    box(group, TAIL, 0.4, 0.03, 0.04, 0, 1.52, -L * 0.9 - 0.02);
    merged(group, LAMP, [-1, 1].map(side => bx(0.12, 0.05, 0.02, side * 0.45, 0.5, -L - 0.012)));
    box(group, black, 1.1, 0.1, 0.06, 0, 0.38, -L + 0.01);
    box(group, WHITE, 0.42, 0.11, 0.02, 0, 0.72, -L - 0.039);
    // tall, skinny wheels, a dark cap in each
    for (const side of [-1, 1]) for (const z of [ZW, -ZW]) {
      wheel(group, R, 0.17, side * (w / 2 - 0.085), R, z, steel);
      disc(group, black, 0.07, 0.02, side * (w / 2 + 0.006), R, z).rotation.set(0, Math.PI / 2, 0);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A coupe crossover (a Range Rover Evoque, 2011): a tall body on big wheels with a waist that climbs to the tail
  // while the roof falls to meet it, leaving a slit of side glass; a floating roof in a second colour, with a spoiler
  // and a stop lamp at its end; thin lamps that wrap round the corners with a strip of light along their tops, a
  // grille between them, a skid plate under the nose; a clamshell bonnet with vents; black sills and arch lips;
  // lamps that wrap round the tail, two exhausts. It sits still
  coupecross: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.4, rr = 0.05, ZW = L * 0.61, S = w * 0.96 / 2;
    const paint = lambert(car.color), roofPaint = lambert(0x18181b), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const black = lambert(0x1c1d21), silver = lambert(0xb9bdc2), alloy = lambert(0xa8adb4);
    const body = curved(group, paint, w * 0.96, rounded([[-L + rr, 0.45], [L - rr, 0.45], [L - rr, 0.82], [L * 0.82, 0.96], [L * 0.34, 1.04], [-L * 0.62, 1.16], [-L * 0.9, 1.2], [-L + rr, 1.09]]), rr);
    // the slit of glass, the floating roof and its spoiler, the pillars
    prism(group, glass, w * 0.84, [[L * 0.36, 1.02], [L * 0.06, 1.54], [-L * 0.62, 1.48], [-L * 0.9, 1.22], [-L * 0.9, 1.14], [-L * 0.62, 1.12], [L * 0.36, 0.99]]);
    prism(group, roofPaint, w * 0.86, [[L * 0.1, 1.51], [L * 0.06, 1.57], [-L * 0.62, 1.515], [-L * 0.7, 1.45], [-L * 0.6, 1.45], [L * 0.06, 1.51]]);
    for (const side of [-1, 1]) {
      prism(group, roofPaint, 0.05, [[L * 0.37, 1.04], [L * 0.32, 1.04], [L * 0.03, 1.54], [L * 0.08, 1.54]], side * w * 0.42);
      box(group, paint, 0.16, 0.1, 0.1, side * 0.87, 1.16, L * 0.3);                       // mirrors
    }
    merged(group, black, [-1, 1].map(side => bx(0.03, 0.4, 0.08, side * w * 0.42, 1.31, -L * 0.12))); // the middle pillars, blacked out
    box(group, TAIL, 0.3, 0.025, 0.03, 0, 1.44, -L * 0.68);                                 // the stop lamp, under the spoiler
    box(group, black, 0.03, 0.03, 0.4, 0, 1.24, -L * 0.88).rotation.x = -0.75;              // the rear wiper
    // the face: the lamps, wrapping round the corners, their strips of light; the grille; the intake and the skid plate
    merged(group, trim, [-1, 1].flatMap(side => [bx(0.42, 0.09, 0.2, side * 0.6, 0.83, L - 0.07), bx(0.04, 0.08, 0.25, side * (S - 0.005), 0.84, L - 0.15)]));
    merged(group, LAMP, [-1, 1].flatMap(side => [bx(0.36, 0.02, 0.02, side * 0.6, 0.855, L + 0.035), bx(0.08, 0.05, 0.02, side * 0.48, 0.815, L + 0.035)]));
    merged(group, AMBER, [-1, 1].map(side => bx(0.012, 0.03, 0.12, side * (S + 0.019), 0.83, L - 0.15)));
    box(group, black, 0.74, 0.12, 0.04, 0, 0.82, L + 0.005);
    merged(group, silver, [0.79, 0.84].map(y => bx(0.7, 0.012, 0.02, 0, y, L + 0.028)));
    box(group, black, 1.2, 0.16, 0.04, 0, 0.58, L + 0.005);
    box(group, silver, 0.7, 0.05, 0.25, 0, 0.46, L - 0.05);
    box(group, WHITE, 0.42, 0.1, 0.02, 0, 0.68, L + 0.03);
    // the bonnet: its clamshell edge down each flank, two vents on top
    const shut = Math.atan2(0.07, 1.26);
    merged(group, black, [-1, 1].map(side => bx(0.01, 0.012, 1.26, side * (S + 0.004), 0.935, 1.37, shut)));
    merged(group, black, [-1, 1].map(side => bx(0.16, 0.012, 0.3, side * 0.55, 1.047, L * 0.6, Math.atan2(0.08, 1.05))));
    merged(group, silver, [-1, 1].map(side => bx(0.02, 0.025, 0.12, side * (S + 0.01), 1.02, -L * 0.05)));  // the door handles
    // the tail: lamps wrapping round it, reversing lamps, the black bumper, two exhausts, the plate
    merged(group, TAIL, [-1, 1].flatMap(side => [bx(0.36, 0.1, 0.03, side * 0.6, 1.04, -L - 0.012), bx(0.02, 0.1, 0.16, side * (S - 0.004), 1.04, -L + 0.16)]));
    merged(group, LAMP, [-1, 1].map(side => bx(0.1, 0.05, 0.02, side * 0.35, 0.68, -L - 0.012)));
    box(group, black, 1.6, 0.18, 0.05, 0, 0.54, -L - 0.01);
    merged(group, chrome, [-1, 1].map(side => cyl(0.05, 0.06, side * 0.6, 0.48, -L - 0.02, 'z', 10)));
    box(group, WHITE, 0.42, 0.11, 0.02, 0, 0.84, -L - 0.011);
    // black sills and arch lips; big alloys with a cap each
    merged(group, black, [-1, 1].map(side => bx(0.03, 0.12, L * 0.62, side * (S + 0.006), 0.51, 0)));
    merged(group, black, [-1, 1].flatMap(side => [lip(R + 0.06, 0.05, side * (S + 0.02), R, ZW), lip(R + 0.06, 0.05, side * (S + 0.02), R, -ZW)]));
    for (const side of [-1, 1]) for (const z of [ZW, -ZW]) {
      wheel(group, R, 0.24, side * (w / 2 - 0.12), R, z, alloy);
      disc(group, black, 0.06, 0.02, side * (w / 2 + 0.01), R, z).rotation.set(0, Math.PI / 2, 0);
    }
    group.userData = { body, animate: () => {}, livery: (evil) => roofPaint.color.setHex(evil ? 0xc9ccd2 : 0x18181b) };
    return group;
  },
};

