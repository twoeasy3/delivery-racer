// ---- the ninth batch of car ideas' models: a concept car ---------------------------------------------------------
// One concept car drawn as an idea (ideas.js: IDEA_CARS, the Midsummer Roadster): a small open two-seater after the
// Pontiac Solstice concept of 2002. Built as ideaModels6.js' are (the same helpers, kept here as copies so that the
// files do not import each other): a body lofted through cross-sections, few curve segments, one geometry for each set
// of identical parts, and parts that share a material and never move merged into one mesh. The builder takes the
// idea's entry and returns a group, front facing local +z, with userData.body (the mesh whose material is the paint,
// so the livery can be swapped; every part in the paint shares that one material), userData.animate (seconds) =>
// void, and userData.livery (evil) => void (the seats' leather). ideaModels.js spreads IDEA_MODELS_9 into IDEA_MODELS.
// State-free: nothing here knows about the game.
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
// a flat panel tipped about the car's width. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
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
const merged = (parent, material, geos) => place(parent, mergeGeometries(geos, false), material, 0, 0, 0);

// a body lofted through cross-sections along the car: `rings` is a list of [z, points] going nose-ward or tail-ward,
// each points a closed loop of [x, y] (as many in every ring, in the same order); both ends closed with a fan to their
// middle. Its material should be double-sided (the winding is not looked after)
const loft = (parent, material, rings, caps = true) => {
  const n = rings[0][1].length, pos = [], idx = [];
  for (const [z, pts] of rings) for (const [x, y] of pts) pos.push(x, y, z);
  for (let r = 0; r + 1 < rings.length; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + (i + 1) % n, c = (r + 1) * n + i, d = (r + 1) * n + (i + 1) % n;
      idx.push(a, b, d, a, d, c);
    }
  }
  for (const r of caps ? [0, rings.length - 1] : []) {
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
// ---- a lofted car body (for the curvy ones): cross-sections along the car, each a rounded shoulder over a side
// that is cut back under the haunches to clear the wheels, up to an arch.
//   BODY   [z, half width at its widest, the height of that, the height of the deck on the middle, the floor, the sill's half width]
//   AXLES  [z, wheel radius, tyre width, the tyre's outer face]
//   n      how square the shoulders are (2 round, more squarer)
// Returns the body mesh, and sideX(z, y) / topY(z, x): where its side and its top are, for parts to sit on them.
const superTop = (w, yb, yTop, t, n) => [w * Math.pow(Math.abs(Math.cos(t)), 2 / n), yb + (yTop - yb) * Math.pow(Math.max(0, Math.sin(t)), 2 / n)];
const SHOULDER = [0, 1, 2, 3, 4].map(i => i * Math.PI / 10);
const loftBody = (group, material, BODY, AXLES, n, around = [-0.47, -0.4, -0.3, -0.15, 0, 0.15, 0.3, 0.4, 0.47]) => {
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
  const ring = (z) => {
    const { wHigh, yb, yTop, y0, wLow, yLip } = section(z);
    const side = [[wLow - 0.08, y0], [wLow, y0 + 0.06], [wLow, Math.max(y0 + 0.08, yLip - 0.02)], [wHigh - 0.02, yLip], ...SHOULDER.map(t => superTop(wHigh, yb, yTop, t, n))];
    return [[0, y0], ...side, [0, yTop], ...side.slice().reverse().map(([x, y]) => [-x, y])];
  };
  const zs = new Set(BODY.map(k => k[0]));
  for (const [za] of AXLES) for (const dz of around) zs.add(Math.round((za + dz) * 1000) / 1000);
  const stations = [...zs].sort((a, b) => a - b), body = loft(group, material, stations.map(z => [z, ring(z)]));
  const sideX = (z, y) => {
    const { wHigh, yb, yTop, wLow, yLip } = section(z);
    if (y >= yb) { const sn = Math.pow(Math.min(1, (y - yb) / (yTop - yb)), n / 2); return wHigh * Math.pow(Math.sqrt(1 - sn * sn), 2 / n); }
    return y >= yLip ? wHigh - 0.02 + 0.02 * (y - yLip) / (yb - yLip) : wLow;
  };
  const topY = (z, x) => {
    const { wHigh, yb, yTop } = section(z);
    const c = Math.pow(Math.min(1, Math.abs(x) / wHigh), n / 2);
    return yb + (yTop - yb) * Math.pow(Math.sqrt(1 - c * c), 2 / n);
  };
  return { body, stations, section, sideX, topY };
};

// a round bar from the point a to the point b ([x, y, z] each), already in its place (for `merged`)
const strut = (a, b, r, seg = 8) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dir = B.clone().sub(A);
  const geo = new THREE.CylinderGeometry(r, r, dir.length(), seg);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  return geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
};

export const IDEA_MODELS_9 = {
  // A small open roadster (after the Pontiac Solstice concept of 2002): two seats and no roof, short overhangs with
  // big wheels pushed out to the corners, lofted through cross-sections into one rounded, muscular body: wings that
  // swell over the wheels (the back ones the widest), a waist between them, a long bonnet with a power bulge down its
  // middle, a low raked windscreen in a bright frame, a cockpit sunk between the shoulders with two seats, a hump
  // behind each headrest running down a short high tail. A split grille over a wide mouth, slim lamps swept into the
  // tops of the wings; lamps in a band across the tail, a stop lamp over them, two exhausts in a dark diffuser.
  // Five-spoke wheels. It sits still
  midsummer: (car) => {
    const group = new THREE.Group();
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const black = lambert(0x18191c), leather = lambert(0x9a6a44), alloy = lambert(0xbfc3c8);
    for (const m of [paint, glass, black]) m.side = THREE.DoubleSide;
    const R = 0.34, NU = 3;
    const AXLES = [[1.25, R, 0.25, 0.88], [-1.22, R, 0.27, 0.89]];
    // [z, half width at the shoulder, the shoulder's height, the deck's on the middle, the floor, the sill's half width]
    const { body, sideX, topY } = loftBody(group, paint, [
      [-1.97, 0.66, 0.58, 0.8, 0.3, 0.6], [-1.9, 0.82, 0.66, 0.88, 0.26, 0.78], [-1.65, 0.88, 0.76, 0.92, 0.22, 0.84],
      [-1.22, 0.9, 0.78, 0.93, 0.2, 0.85], [-0.75, 0.87, 0.76, 0.9, 0.2, 0.83], [-0.56, 0.85, 0.74, 0.82, 0.2, 0.82],
      [0.42, 0.84, 0.72, 0.8, 0.2, 0.82], [0.62, 0.85, 0.72, 0.86, 0.2, 0.83], [0.85, 0.87, 0.74, 0.85, 0.2, 0.84],
      [1.25, 0.9, 0.76, 0.81, 0.2, 0.85], [1.6, 0.88, 0.7, 0.77, 0.21, 0.84], [1.85, 0.8, 0.58, 0.7, 0.23, 0.76],
      [1.97, 0.62, 0.5, 0.64, 0.26, 0.58],
    ], AXLES, NU, [-0.42, -0.3, -0.15, 0, 0.15, 0.3, 0.42]);
    const zMirror = 0.14;
    // the cockpit, sunk between the shoulders: a dark tub lying on the deck, two seats in it, a dash under the screen
    const XS = [-0.62, -0.5, -0.3, 0, 0.3, 0.5, 0.62];
    loft(group, black, [[0.42, 0.5], [0.36, 1], [0.1, 1], [-0.2, 1], [-0.45, 1], [-0.52, 0.85]].map(([z, k]) => {
      const top = XS.map(x => [x * k, topY(z, x * k) + 0.008]);
      return [z, [...top, ...top.slice().reverse().map(([x, y]) => [x, y - 0.04])]];
    }));
    merged(group, leather, [-1, 1].flatMap(side => [
      bx(0.42, 0.44, 0.09, side * 0.3, 0.88, -0.42, -0.2),                                 // (the backs, leaning back and
      bx(0.26, 0.12, 0.07, side * 0.3, 1.13, -0.475, -0.2),                                 // a headrest on each)
    ]));
    box(group, black, 1.2, 0.1, 0.2, 0, 0.85, 0.3);
    box(group, trim, 0.16, 0.1, 0.62, 0, 0.84, 0.0);                                       // (the console between the seats)
    box(group, trim, 0.16, 0.05, 0.03, 0, 1.08, zMirror);                                   // (the mirror, under the screen's top bar)
    const steering = place(group, shared('midsummerWheel', () => new THREE.TorusGeometry(0.16, 0.02, 4, 12)), black, 0.3, 0.98, 0.18);
    steering.rotation.x = -0.45;
    // the humps behind the headrests, running down the tail; a filler cap between them
    for (const side of [-1, 1]) blob(group, paint, 0.19, 0.27, 0.72, side * 0.3, 0.78, -1.08);
    tube(group, chrome, 0.05, 0.03, 0, topY(-1.45, 0) + 0.01, -1.45, 'y', 12);
    // the bonnet's power bulge
    blob(group, paint, 0.24, 0.035, 0.6, 0, topY(1.05, 0) - 0.012, 1.05);
    // the windscreen, low and raked, in a bright frame: a bar across its top and a post up each side
    const zB = 0.56, zT = 0.17, yB = topY(zB, 0.6) - 0.01, yT = 1.12, half = 0.66;
    slab(group, glass, half * 2, 0.02, Math.hypot(zB - zT, yT - yB), 0, (yB + yT) / 2, (zB + zT) / 2, Math.atan2(yT - yB, zB - zT));
    merged(group, chrome, [
      strut([-half - 0.02, yT, zT], [half + 0.02, yT, zT], 0.022, 8),
      ...[-1, 1].map(side => strut([side * (half + 0.01), yB - 0.04, zB + 0.03], [side * (half + 0.02), yT, zT], 0.022, 8)),
    ]);
    // mirrors on stalks off the scuttle
    merged(group, trim, [-1, 1].map(side => bx(0.025, 0.2, 0.035, side * 0.8, 0.8, 0.5)));
    merged(group, paint, [-1, 1].map(side => bx(0.15, 0.08, 0.1, side * 0.84, 0.92, 0.49)));
    // the nose: a split grille in bright surrounds, a wide mouth under it, slim lamps swept into the wings' tops,
    // indicators at the corners
    merged(group, chrome, [-1, 1].map(side => bx(0.32, 0.16, 0.02, side * 0.19, 0.465, 1.972, 0, 0, -side * 0.1)));
    merged(group, black, [
      ...[-1, 1].map(side => bx(0.27, 0.115, 0.02, side * 0.19, 0.465, 1.98, 0, 0, -side * 0.1)),
      bx(0.84, 0.07, 0.02, 0, 0.32, 1.972),
    ]);
    const lamps = [], housings = [];
    for (const side of [-1, 1]) {
      const x = side * 0.6, z = 1.74, y = topY(z, x);
      const pitch = Math.atan2(topY(z - 0.08, x) - topY(z + 0.08, x), 0.16), roll = Math.atan2(topY(z, x + 0.05) - topY(z, x - 0.05), 0.1);
      const tilt = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pitch, side * 0.2, roll));
      housings.push(bx(0.34, 0.04, 0.15, 0, 0, 0).applyMatrix4(tilt).translate(x, y - 0.006, z));
      lamps.push(bx(0.27, 0.03, 0.1, 0, 0.01, 0.005).applyMatrix4(tilt).translate(x, y - 0.006, z));
    }
    merged(group, black, housings);
    merged(group, LAMP, lamps);
    merged(group, AMBER, [
      ...[-1, 1].map(side => bx(0.08, 0.04, 0.02, side * 0.47, 0.5, 1.975)),
      ...[-1, 1].map(side => bx(0.012, 0.03, 0.07, side * (sideX(0.9, 0.62) + 0.004), 0.62, 0.9)), // (side repeaters)
    ]);
    // a vent in each flank behind the front wheel; door handles; a dark splitter under the nose
    merged(group, chrome, [-1, 1].map(side => bx(0.02, 0.025, 0.12, side * (sideX(-0.25, 0.7) + 0.004), 0.7, -0.25)));
    box(group, trim, 0.96, 0.03, 0.16, 0, 0.245, 1.88);
    merged(group, black, [-1, 1].map(side => bx(0.03, 0.08, 0.22, side * sideX(0.66, 0.5), 0.5, 0.66)));
    // the tail: a band of lamps across it, a stop lamp over them, reversing lamps, the plate, the diffuser, two exhausts
    merged(group, TAIL, [
      ...[-1, 1].map(side => bx(0.3, 0.07, 0.02, side * 0.42, 0.63, -1.976)),
      bx(0.28, 0.025, 0.02, 0, 0.73, -1.976),
    ]);
    merged(group, LAMP, [-1, 1].map(side => bx(0.1, 0.05, 0.02, side * 0.42, 0.53, -1.976)));
    box(group, WHITE, 0.36, 0.11, 0.02, 0, 0.53, -1.976).userData.plate = 'rear';
    box(group, black, 0.9, 0.1, 0.24, 0, 0.3, -1.88);
    merged(group, chrome, [-1, 1].map(side => cyl(0.045, 0.08, side * 0.16, 0.3, -1.99, 'z', 10)));
    merged(group, black, [-1, 1].map(side => cyl(0.03, 0.02, side * 0.16, 0.3, -2.025, 'z', 8)));
    // five-spoke wheels: a tyre, the alloy's face, and the dark gaps between its spokes round a dark centre (flat faces
    // looking out of the car, a hair proud of the tyre's wall and of each other)
    const face = (geo) => geo.rotateY(Math.PI / 2);
    const gaps = shared('midsummerGaps', () => mergeGeometries([
      face(new THREE.CircleGeometry(0.05, 8)),
      ...[0, 1, 2, 3, 4].map(i => face(new THREE.PlaneGeometry(0.13, 0.07)).translate(0, 0, 0.15).rotateX(i * Math.PI * 2 / 5 + Math.PI / 5)),
    ], false));
    const rim = shared('midsummerRim', () => face(new THREE.CircleGeometry(R * 0.74, 14)));
    for (const side of [-1, 1]) {
      for (const [z, r, width, outer] of AXLES) {
        const x = side * (outer - width / 2);
        place(group, shared('midsummerTyre' + width, () => new THREE.CylinderGeometry(r, r, width, 16).rotateZ(Math.PI / 2)), TYRE, x, r, z);
        place(group, rim, alloy, x + side * (width / 2 + 0.004), r, z).rotation.y = side < 0 ? Math.PI : 0;
        place(group, gaps, black, x + side * (width / 2 + 0.008), r, z).rotation.y = side < 0 ? Math.PI : 0;
      }
    }
    group.userData = { body, animate: () => {}, livery: (evil) => leather.color.setHex(evil ? 0x7a1c1c : 0x9a6a44) };
    return group;
  },
};
