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
const BALL = new THREE.SphereGeometry(1, 12, 8);
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
const merged = (parent, material, geos) => place(parent, mergeGeometries(geos.map(g => (g.index ? g : g)), false), material, 0, 0, 0);

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
};
