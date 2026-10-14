// ---- the seventh batch of car ideas' models: three concept cars ------------------------------------------------
// Three show cars drawn as ideas (ideas.js: IDEA_CARS, the entries after the sixth batch): a knife-edged mid-engined
// supercar of 2002, a sixteen-cylinder grand coupe of 2003 and a flame-bodied Le Mans prototype of 2007.
// Built as ideaModels6.js' are (the same helpers, kept here as copies so that the files do not import each other),
// light: shape first, every body lofted through cross-sections along the car, one geometry for each set of identical
// parts, and parts that share a material and never move merged into one mesh. Each builder takes the idea's entry and
// returns a group, front facing local +z, with userData.body (the mesh whose material is the paint, so the livery can
// be swapped; every part in the paint shares that one material), userData.animate (seconds) => void, and
// userData.livery (evil) => void where a second colour differs between Good and Evil. ideaModels.js spreads
// IDEA_MODELS_7 into IDEA_MODELS. State-free.
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
const wheel = (parent, radius, width, x, y, z, hubMaterial, hub = 0.62) => {
  const tyre = place(parent, shared('tyre' + [radius, width], () => new THREE.CylinderGeometry(radius, radius, width, 16).rotateZ(Math.PI / 2)), TYRE, x, y, z);
  const rim = place(parent, shared('hub' + [radius, width, hub], () => new THREE.CylinderGeometry(radius * hub, radius * hub, width + 0.03, 14).rotateZ(Math.PI / 2)), hubMaterial, x, y, z);
  return [tyre, rim];
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
// (indexed and unindexed geometries mixed: all made unindexed)
const merged = (parent, material, geos) => {
  const mixed = geos.some(g => g.index) && geos.some(g => !g.index);
  return place(parent, mergeGeometries(mixed ? geos.map(g => (g.index ? g.toNonIndexed() : g)) : geos, false), material, 0, 0, 0);
};
// a thin plate whose outline, seen from the side, is the polygon `profile` ([z, y] points), `w` thick across the car,
// its middle at x (a fin, a side window, an end plate)
const plate = (w, profile, x = 0) => {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y))), { depth: w, bevelEnabled: false });
  return geo.rotateY(-Math.PI / 2).translate(x + w / 2, 0, 0);
};

// a body lofted through cross-sections along the car: `rings` is a list of [z, points] going nose-ward or tail-ward,
// each points a closed loop of [x, y] (as many in every ring, in the same order); both ends closed with a fan to their
// middle. Its material should be double-sided (the winding is not looked after). `sharp`: each strip between two
// neighbouring points of the loop has corners of its own, so it is shaded smooth along the car but meets the next strip
// at a sharp crease (the creased, flat-panelled look); otherwise shaded smooth all round
const loftGeo = (rings, caps = true, sharp = false) => {
  const n = rings[0][1].length, pos = [], idx = [];
  if (sharp) {
    for (let i = 0; i < n; i++) {
      const base = pos.length / 3;
      for (const [z, pts] of rings) pos.push(pts[i][0], pts[i][1], z, pts[(i + 1) % n][0], pts[(i + 1) % n][1], z);
      for (let r = 0; r + 1 < rings.length; r++) { const a = base + 2 * r; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    }
  } else {
    for (const [z, pts] of rings) for (const [x, y] of pts) pos.push(x, y, z);
    for (let r = 0; r + 1 < rings.length; r++) {
      for (let i = 0; i < n; i++) {
        const a = r * n + i, b = r * n + (i + 1) % n, c = (r + 1) * n + i, d = (r + 1) * n + (i + 1) % n;
        idx.push(a, b, d, a, d, c);
      }
    }
  }
  for (const r of caps ? [0, rings.length - 1] : []) {
    const [z, pts] = rings[r], mid = pos.length / 3;
    pos.push(pts.reduce((t, p) => t + p[0], 0) / n, pts.reduce((t, p) => t + p[1], 0) / n, z);
    for (let i = 0; i < n; i++) { pos.push(pts[i][0], pts[i][1], z); idx.push(mid, mid + 1 + i, mid + 1 + (i + 1) % n); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
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
// a closed section from its right half: points from the bottom of the middle, up the side, to the top of the middle
const mirror = (half) => [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
// the wheel arch at z, if z is over a wheel: AXLES [z, wheel radius, tyre width, the tyre's outer face]. The side under
// the arch is cut back to `inner` (clear of the tyre), up to the arch's edge at `lip`
const archAt = (AXLES, z, gap = 0.06) => {
  for (const [za, R, width, outer] of AXLES) {
    const dz = Math.abs(z - za), Ra = R + gap;
    if (dz < Ra) return { inner: outer - width - 0.03, lip: R + Math.sqrt(Ra * Ra - dz * dz) };
  }
  return null;
};
// the stations of a body: its keys' z, and enough round each wheel for the arch to read as one
const stationsOf = (KEYS, AXLES, gap = 0.06, extra = []) => {
  const zs = new Set([...KEYS.map(k => k[0]), ...extra]);
  for (const [za, R] of AXLES) for (const d of [-1.06, -0.97, -0.8, -0.55, -0.25, 0.25, 0.55, 0.8, 0.97, 1.06]) zs.add(Math.round((za + d * (R + gap)) * 1000) / 1000);
  for (const [za] of AXLES) zs.add(za);
  return [...zs].filter(z => z >= KEYS[0][0] && z <= KEYS[KEYS.length - 1][0]).sort((a, b) => a - b);
};

// where a lofted body's side and top are, from its half sections: sideX(z, y) the side's x at a height y (up the side
// points first..last of the half, which climb), topY(z, x) the top's height at x (along points first..last, which come
// in to the middle)
const surface = (half, side = [1, 5], top = [4, 6]) => ({
  sideX: (z, y) => {
    const h = half(z);
    for (let i = side[0]; i < side[1]; i++) {
      const [xa, ya] = h[i], [xb, yb] = h[i + 1];
      if (y <= yb || i + 1 === side[1]) return xa + (xb - xa) * Math.max(0, Math.min(1, (y - ya) / ((yb - ya) || 1)));
    }
    return h[side[1]][0];
  },
  topY: (z, x) => {
    const h = half(z), ax = Math.abs(x);
    for (let i = top[0]; i < top[1]; i++) {
      const [xa, ya] = h[i], [xb, yb] = h[i + 1];
      if (ax >= xb || i + 1 === top[1]) return ya + (yb - ya) * Math.max(0, Math.min(1, (xa - ax) / ((xa - xb) || 1)));
    }
    return h[top[1]][1];
  },
});
// a flat outline facing along the car (x across, y up), `depth` deep, its face at z (a grille, a lamp's housing)
const facing = (points, depth, z) => new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false }).translate(0, 0, z - depth);
// a flat outline lying on a flank (z along, y up), its corners `off` out from the side sideX(z, y) (an intake, a vent): two-sided, 4 mm thick
const onFlank = (sideX, points, off, sign) => {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ShapeGeometry(shape).toNonIndexed(), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getX(i), y = pos.getY(i);
    pos.setXYZ(i, sign * (sideX(z, y) + off), y, z);
  }
  geo.computeVertexNormals();
  return geo;
};
// alloy wheels: a black tyre, a dark rim in it and `spokes` bright spokes and a cap on its outer face. AXLES as archAt's.
// One geometry for each size of tyre and rim, the spokes of all four merged into one mesh
const alloys = (group, AXLES, spokeMaterial, spokes = 5, rimMaterial = lambert(0x2e3138), trims = true) => {
  const parts = [];
  for (const side of [-1, 1]) {
    for (const [za, R, width, outer] of AXLES) {
      const x = side * (outer - width / 2), face = side * (outer + 0.012);
      wheel(group, R, width, x, R, za, rimMaterial, 0.7);
      if (!trims) continue; // (no spokes or cap: they are merged into one mesh over all four wheels, which the suspension takes for body, so they bounced with the car)
      for (let i = 0; i < spokes; i++) parts.push(bx(0.02, R * 0.62, 0.07, face, R + R * 0.31, za).translate(-face, -R, -za).rotateX(i * 2 * Math.PI / spokes).translate(face, R, za));
      parts.push(cyl(R * 0.16, 0.03, face, R, za, 'x', 8));
    }
  }
  if (parts.length) merged(group, spokeMaterial, parts);
};

export const IDEA_MODELS_7 = {
  // A knife-edged supercar (a Cadillac Cien, 2002): low, wide and wedge-shaped, every surface a flat facet meeting
  // the next at a sharp crease. A long low nose with a shield of a grille in its point and a tall, narrow stack of
  // lamps in the leading edge of each wing; raised wings either side of a valley of a bonnet; a big faceted canopy
  // drawn back into a flat engine deck with louvres; deep intakes in the flanks; a tail cut off square with a blade
  // of red up each corner, a raked spoiler with the stop lamp in its edge, and a black diffuser. Alloy wheels, bigger
  // at the back. It sits still
  knifeedge: (car) => {
    const group = new THREE.Group();
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), alloy = lambert(0xb4b9c0);
    const intakeDark = lambert(TRIM);
    for (const m of [paint, glass, intakeDark]) m.side = THREE.DoubleSide;
    const AXLES = [[1.3, 0.34, 0.26, 0.98], [-1.42, 0.37, 0.32, 1.0]];
    // the body, section by section: [z, floor, sill's half width, its height, the crease's (the widest), its height,
    // the shoulder's, its height, the deck's edge, its height, the middle's height]
    const KEYS = [
      [-2.23, 0.3, 0.8, 0.36, 0.9, 0.6, 0.88, 0.86, 0.76, 0.92, 0.93],
      [-2.08, 0.24, 0.9, 0.3, 0.99, 0.68, 0.95, 0.9, 0.8, 0.95, 0.96],
      [-1.42, 0.17, 0.92, 0.28, 1.0, 0.8, 0.96, 0.89, 0.8, 0.93, 0.95],
      [-0.75, 0.17, 0.9, 0.28, 0.98, 0.62, 0.93, 0.84, 0.76, 0.88, 0.9],
      [-0.1, 0.17, 0.86, 0.28, 0.93, 0.57, 0.9, 0.8, 0.72, 0.84, 0.84],
      [0.55, 0.17, 0.88, 0.28, 0.96, 0.6, 0.92, 0.76, 0.72, 0.79, 0.74],
      [1.3, 0.18, 0.9, 0.28, 0.99, 0.78, 0.95, 0.81, 0.7, 0.83, 0.66],
      [1.95, 0.2, 0.86, 0.3, 0.93, 0.55, 0.9, 0.66, 0.68, 0.68, 0.56],
      [2.12, 0.23, 0.8, 0.3, 0.88, 0.46, 0.85, 0.6, 0.64, 0.62, 0.52],
      [2.23, 0.27, 0.66, 0.31, 0.76, 0.42, 0.74, 0.58, 0.58, 0.59, 0.49],
    ];
    const half = (z) => {
      const [y0, ws, ys, wc, yc, wsh, ysh, wd, yd, yt] = along(KEYS, z);
      const h = [[0, y0], [ws - 0.05, y0], [ws, ys], [wc, yc], [wsh, ysh], [wd, yd], [0, yt]];
      const a = archAt(AXLES, z);
      if (a) {
        h[1][0] = Math.min(h[1][0], a.inner - 0.02); h[2][0] = Math.min(h[2][0], a.inner); h[2][1] = Math.max(h[2][1], a.lip);
        for (let i = 3; i <= 5; i++) h[i][1] = Math.max(h[i][1], h[i - 1][1] + (i === 3 ? 0.035 : 0.015));
      }
      return h;
    };
    const body = place(group, loftGeo(stationsOf(KEYS, AXLES).map(z => [z, mirror(half(z))]), true, true), paint, 0, 0, 0);
    const { sideX, topY } = surface(half);
    // the canopy: [z, half width at its foot, the foot's height, half width at its flat top, the top's height]; the
    // glass to the B pillar, then the engine deck in the paint, a shade bigger where it overlaps
    const CANOPY = [[-1.98, 0.5, 0.9, 0.36, 0.95], [-1.4, 0.6, 0.86, 0.42, 1.0], [-0.75, 0.66, 0.82, 0.44, 1.08], [-0.3, 0.68, 0.8, 0.44, 1.13],
      [0.1, 0.68, 0.78, 0.42, 1.1], [0.55, 0.64, 0.73, 0.34, 0.92], [0.95, 0.56, 0.66, 0.2, 0.72]];
    const canopy = (from, to, grow) => loftGeo(CANOPY.filter(([z]) => z >= from && z <= to).map(([z, wb, yb, wt, yt]) => {
      const m = 0.5 * (wb + wt) + 0.05;
      return [z, mirror([[0, yb - 0.08], [wb + grow, yb - 0.08], [wb + grow, yb], [m + grow, (yb + yt) / 2 + 0.03 + grow], [wt + grow, yt + grow], [0, yt + grow]])];
    }), true, true);
    place(group, canopy(-0.75, 1, 0), glass, 0, 0, 0);
    place(group, canopy(-2, -0.75, 0.012), paint, 0, 0, 0);
    // the engine deck's louvres: a dark panel let into its flat top, slats across it
    const deckY = (z) => along(CANOPY, z)[3] + 0.012;
    merged(group, trim, [bx(0.62, 0.02, 0.95, 0, deckY(-1.4) + 0.008, -1.4, -Math.atan2(deckY(-0.92) - deckY(-1.88), 0.96))]);
    merged(group, paint, [-1.0, -1.18, -1.36, -1.54, -1.72].map(z => bx(0.58, 0.03, 0.05, 0, deckY(z) + 0.02, z)));
    // the nose: a shield of a grille in its point, a slot of an intake under it, the lamps stacked up each wing's edge
    const ZN = 2.23;
    merged(group, chrome, [facing([[-0.27, 0.53], [0.27, 0.53], [0.17, 0.33], [-0.17, 0.33]], 0.04, ZN + 0.012)]);
    merged(group, trim, [facing([[-0.23, 0.51], [0.23, 0.51], [0.15, 0.355], [-0.15, 0.355]], 0.04, ZN + 0.02), bx(0.9, 0.05, 0.04, 0, 0.31, ZN - 0.005)]);
    merged(group, chrome, [bx(0.4, 0.016, 0.03, 0, 0.44, ZN + 0.03)]);                      // (the grille's one blade)
    merged(group, trim, [-1, 1].map(side => bx(0.1, 0.26, 0.06, side * 0.6, 0.45, ZN - 0.01)));
    merged(group, LAMP, [-1, 1].flatMap(side => [bx(0.035, 0.22, 0.02, side * 0.62, 0.46, ZN + 0.025), bx(0.025, 0.14, 0.02, side * 0.57, 0.48, ZN + 0.025)]));
    merged(group, AMBER, [-1, 1].map(side => bx(0.03, 0.08, 0.06, side * (sideX(2.0, 0.5) - 0.012), 0.5, 2.0)));
    // the flanks: a deep intake behind each door, a mirror out on a stalk
    const intake = [[-0.25, 0.555], [-1.02, 0.575], [-0.98, 0.34], [-0.72, 0.31]];
    for (const side of [-1, 1]) place(group, onFlank(sideX, intake, 0.02, side), intakeDark, 0, 0, 0);
    merged(group, paint, [-1, 1].flatMap(side => [bx(0.2, 0.08, 0.12, side * 0.84, 0.86, 0.42), bx(0.2, 0.02, 0.05, side * 0.68, 0.83, 0.42)]));
    // the tail: a blade of red up each corner, the stop lamp in the spoiler's edge, the black mesh between, reversing
    // lamps, two exhausts in the diffuser, the plate
    const ZT = -2.23;
    merged(group, trim, [bx(1.2, 0.3, 0.03, 0, 0.62, ZT - 0.005), bx(1.5, 0.12, 0.2, 0, 0.27, ZT + 0.08)]);
    merged(group, trim, [-0.45, -0.15, 0.15, 0.45].map(x => bx(0.02, 0.1, 0.16, x, 0.25, ZT - 0.02)));
    merged(group, TAIL, [-1, 1].flatMap(side => [bx(0.05, 0.42, 0.025, side * 0.76, 0.64, ZT - 0.008), bx(0.024, 0.3, 0.025, side * 0.69, 0.68, ZT - 0.008)]));
    merged(group, LAMP, [-1, 1].map(side => bx(0.1, 0.04, 0.02, side * 0.48, 0.4, ZT - 0.006)));
    merged(group, chrome, [-1, 1].map(side => cyl(0.045, 0.06, side * 0.12, 0.33, ZT - 0.01, 'z', 10)));
    box(group, WHITE, 0.4, 0.1, 0.02, 0, 0.42, ZT - 0.008).userData.plate = 'rear';
    // the spoiler: a raked blade across the tail on two posts, the stop lamp along its back edge
    const spoiler = Math.atan2(0.05, 0.24);
    merged(group, trim, [-1, 1].map(side => bx(0.04, 0.09, 0.08, side * 0.5, topY(-2.12, 0.5) + 0.03, -2.12)));
    box(group, paint, 1.5, 0.03, 0.26, 0, topY(-2.12, 0.5) + 0.085, -2.12).rotation.x = -spoiler;
    box(group, TAIL, 0.9, 0.022, 0.02, 0, topY(-2.12, 0.5) + 0.06, -2.255);
    alloys(group, AXLES, alloy, 5);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A sixteen-cylinder grand coupe (a Cadillac Sixteen, 2003): huge and long and stately. A tall upright shield of a
  // grille in an upright face, a tall slab of lamps at each corner; a bonnet half the car long in bright metal with a
  // hinge down its middle and vents for the sixteen cylinders behind each front wheel; a straight crease nose to
  // tail; a short glasshouse set far back under a flat roof, falling into a long fastback; a tall slab of red at
  // each corner of the tail; enormous many-spoked wheels. It sits still
  sixteen: (car) => {
    const group = new THREE.Group();
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), bonnet = lambert(0xd3d6da);
    for (const m of [paint, glass, bonnet]) m.side = THREE.DoubleSide;
    const AXLES = [[1.92, 0.43, 0.27, 0.98], [-1.64, 0.43, 0.29, 0.99]];
    // the body, section by section: [z, floor, sill's half width, its height, the crease's (the widest), its height,
    // the shoulder's, its height, the deck's edge, its height, the middle's height]
    const KEYS = [
      [-2.84, 0.4, 0.74, 0.44, 0.84, 0.8, 0.8, 0.86, 0.6, 0.88, 0.89],
      [-2.7, 0.33, 0.86, 0.38, 0.93, 0.86, 0.9, 0.91, 0.72, 0.94, 0.95],
      [-2.2, 0.27, 0.92, 0.33, 0.97, 0.92, 0.94, 0.96, 0.78, 0.98, 0.99],
      [-1.64, 0.24, 0.94, 0.32, 0.99, 0.95, 0.97, 0.99, 0.8, 1.0, 1.01],
      [-0.8, 0.22, 0.93, 0.3, 0.98, 0.95, 0.96, 0.99, 0.8, 1.02, 1.04],
      [0.3, 0.22, 0.94, 0.3, 0.99, 0.96, 0.97, 1.0, 0.82, 1.04, 1.06],
      [1.92, 0.24, 0.94, 0.32, 0.99, 0.95, 0.97, 0.99, 0.82, 1.02, 1.04],
      [2.72, 0.28, 0.92, 0.34, 0.97, 0.93, 0.95, 0.98, 0.8, 1.01, 1.03],
      [2.84, 0.34, 0.82, 0.38, 0.87, 0.9, 0.85, 0.95, 0.72, 0.98, 1.0],
    ];
    const half = (z) => {
      const [y0, ws, ys, wc, yc, wsh, ysh, wd, yd, yt] = along(KEYS, z);
      const h = [[0, y0], [ws - 0.05, y0], [ws, ys], [wc, yc], [wsh, ysh], [wd, yd], [0, yt]];
      const a = archAt(AXLES, z, 0.05);
      if (a) {
        h[1][0] = Math.min(h[1][0], a.inner - 0.02); h[2][0] = Math.min(h[2][0], a.inner); h[2][1] = Math.max(h[2][1], a.lip);
        for (let i = 3; i <= 5; i++) h[i][1] = Math.max(h[i][1], h[i - 1][1] + (i === 3 ? 0.03 : 0.012));
      }
      return h;
    };
    const body = place(group, loftGeo(stationsOf(KEYS, AXLES, 0.05).map(z => [z, mirror(half(z))]), true, true), paint, 0, 0, 0);
    const { sideX } = surface(half);
    // the bonnet, a plate of bright metal lying on the top from the face to the windscreen, the hinge down its middle
    const lid = (z) => { const h = half(z), x = h[5][0] - 0.04, y = h[5][1] + (h[6][1] - h[5][1]) * 0.04 / h[5][0]; return [z, mirror([[0, h[6][1] - 0.02], [x, y - 0.02], [x, y + 0.008], [0, h[6][1] + 0.01]])]; };
    place(group, loftGeo([2.82, 2.72, 2.3, 1.92, 1.5, 1.0, 0.6, 0.48].map(lid), true, true), bonnet, 0, 0, 0);
    const hinge = [0.55, 2.7].map(z => half(z)[6][1] + 0.01 + 0.012);
    merged(group, chrome, [bx(0.035, 0.02, 2.15, 0, (hinge[0] + hinge[1]) / 2, 1.625, Math.atan2(hinge[0] - hinge[1], 2.15))]);
    // the glasshouse: [z, half width at its foot, the foot's height, half width at the roof, the roof's height]. Glass
    // from the windscreen to the end of the side windows; the roof over it and the fastback behind in the paint
    const CAB = [[-2.62, 0.5, 0.94, 0.26, 0.96], [-2.1, 0.64, 0.97, 0.4, 1.12], [-1.45, 0.72, 0.99, 0.5, 1.3], [-0.95, 0.75, 1.0, 0.54, 1.385],
      [-0.3, 0.77, 1.02, 0.55, 1.4], [0.05, 0.78, 1.03, 0.52, 1.28], [0.5, 0.76, 1.03, 0.42, 1.05]];
    const cabRing = (z, grow) => {
      const [wb, yb, wt, yt] = along(CAB, z), m = 0.5 * (wb + wt) + 0.06;
      return [z, mirror([[0, yb - 0.1], [wb + grow, yb - 0.1], [wb + grow, yb], [m + grow, (yb + yt) / 2 + grow], [wt + grow, yt + grow], [0, yt + 0.015 + grow]])];
    };
    place(group, loftGeo([0.5, 0.05, -0.3, -0.95, -1.45].map(z => cabRing(z, 0)), true, true), glass, 0, 0, 0);
    place(group, loftGeo([-1.38, -1.45, -2.1, -2.62].map(z => cabRing(z, 0.012)), true, true), paint, 0, 0, 0);
    // the glass roof: a rail down each edge of it and a spine down its middle, two bars across; and the windscreen's
    // pillars, from the scuttle to the roof
    const onCab = (z, k) => { const [, , wt, yt] = along(CAB, z); return new THREE.Vector3(wt * k, yt + 0.015 * (1 - k), z); };
    const rail = new THREE.CatmullRomCurve3([-0.3, -0.6, -0.95, -1.2, -1.42].map(z => onCab(z, 0.96)));
    const spine = new THREE.CatmullRomCurve3([-0.3, -0.6, -0.95, -1.2, -1.42].map(z => onCab(z, 0)));
    const pillar = (k) => { const [wb, yb] = along(CAB, 0.5), [, , wt, yt] = along(CAB, -0.3); return new THREE.Vector3(wb + (wt * 0.96 - wb) * k, yb + (yt - yb) * k, 0.5 - 0.8 * k); };
    const A = new THREE.LineCurve3(pillar(0), pillar(1));
    for (const side of [-1, 1]) {
      place(group, shared('sixteenA', () => new THREE.TubeGeometry(A, 1, 0.032, 4, false)), paint, 0, 0, 0).scale.x = side;
      place(group, shared('sixteenRail', () => new THREE.TubeGeometry(rail, 6, 0.032, 4, false)), paint, 0, 0, 0).scale.x = side;
    }
    place(group, new THREE.TubeGeometry(spine, 6, 0.025, 4, false), paint, 0, 0, 0);
    merged(group, paint, [-0.3, -0.95].map(z => { const [, , wt, yt] = along(CAB, z); return bx(wt * 2, 0.04, 0.06, 0, yt + 0.008, z); }));
    // the face: the tall shield of a grille (a chrome frame, the black in it, a crate of bright bars), a slab of lamps
    // at each corner, the black slot under it all
    const ZN = 2.84;
    merged(group, chrome, [facing([[-0.34, 0.96], [0.34, 0.96], [0.24, 0.4], [-0.24, 0.4]], 0.05, ZN + 0.02)]);
    merged(group, trim, [facing([[-0.3, 0.93], [0.3, 0.93], [0.21, 0.43], [-0.21, 0.43]], 0.05, ZN + 0.03)]);
    merged(group, chrome, [
      ...[0.53, 0.63, 0.73, 0.83].map(y => bx(0.42 + (y - 0.43) * 0.18, 0.018, 0.02, 0, y, ZN + 0.035)),
      ...[-0.12, 0, 0.12].map(x => bx(0.018, 0.48, 0.02, x, 0.68, ZN + 0.035)),
    ]);
    merged(group, trim, [-1, 1].map(side => bx(0.16, 0.44, 0.06, side * 0.66, 0.7, ZN - 0.005)));
    merged(group, LAMP, [-1, 1].flatMap(side => [0.62, 0.7].map(x => bx(0.05, 0.38, 0.02, side * x, 0.71, ZN + 0.032))));
    merged(group, AMBER, [-1, 1].map(side => bx(0.03, 0.12, 0.06, side * (sideX(2.6, 0.75) - 0.004), 0.75, 2.6)));
    merged(group, trim, [bx(1.3, 0.1, 0.05, 0, 0.36, ZN - 0.01)]);
    // the flanks: the vents behind each front wheel, a bright sill, mirrors
    const vents = [];
    for (const side of [-1, 1]) for (const k of [0, 1, 2]) {
      const z = 1.3 - k * 0.12, y = 0.7;
      vents.push(bx(0.02, 0.3, 0.035, side * (sideX(z, y) + 0.004), y, z));
    }
    merged(group, chrome, vents);
    merged(group, chrome, [-1, 1].map(side => bx(0.02, 0.04, 2.6, side * (sideX(0.14, 0.36) + 0.006), 0.36, 0.14)));
    merged(group, paint, [-1, 1].flatMap(side => [bx(0.2, 0.1, 0.13, side * 0.92, 1.12, 0.3), bx(0.16, 0.025, 0.05, side * 0.8, 1.09, 0.3)]));
    // the tail: a tall slab of red at each corner, the stop lamp at the roof's end, reversing lamps, two exhausts, the plate
    const ZT = -2.84;
    merged(group, TAIL, [-1, 1].map(side => bx(0.07, 0.36, 0.03, side * 0.66, 0.66, ZT - 0.012)));
    merged(group, trim, [-1, 1].map(side => bx(0.11, 0.4, 0.02, side * 0.66, 0.66, ZT - 0.002)));
    box(group, TAIL, 0.36, 0.03, 0.02, 0, along(CAB, -2.62)[3] - 0.005, -2.632);                // (in the fastback's end)
    merged(group, LAMP, [-1, 1].map(side => bx(0.12, 0.05, 0.02, side * 0.42, 0.52, ZT - 0.006)));
    merged(group, chrome, [bx(1.0, 0.03, 0.03, 0, 0.8, ZT - 0.006), ...[-1, 1].map(side => cyl(0.05, 0.08, side * 0.3, 0.42, ZT - 0.01, 'z', 10))]);
    box(group, WHITE, 0.42, 0.1, 0.02, 0, 0.62, ZT - 0.008).userData.plate = 'rear';
    alloys(group, AXLES, chrome, 8, trim, false); // (the owner, 14-Oct: the wheel trims bounced with the car: deleted)
    group.userData = { body, animate: () => {}, livery: (evil) => bonnet.color.setHex(evil ? 0x848a96 : 0xd3d6da) };
    return group;
  },

  // A flame-bodied Le Mans prototype (a Mazda Furai, 2007): low, wide and all flowing curves, lofted smooth through
  // cross-sections that dip between a fender over each wheel and the tub in the middle. A long, low blade of a nose
  // between the front fenders, slits of lamps in their tips; a bubble of a canopy swept back into the engine cover;
  // big intakes in the sidepods behind the front wheels; rear fenders swelling up to a wing the width of the car on two
  // end plates; lines that flow back along the flanks like flames; a black diffuser, a red lamp in each fender's tail
  // and a rain lamp in the middle. It sits still
  windsong: (car) => {
    const group = new THREE.Group();
    const paint = lambert(car.color), glass = lambert(GLASS), dark = lambert(0x1e1f24), flame = lambert(0x1a1a1e);
    for (const m of [paint, glass, dark]) m.side = THREE.DoubleSide;
    const AXLES = [[1.25, 0.34, 0.3, 0.98], [-1.55, 0.35, 0.36, 0.99]];
    // the body, section by section: [z, floor, the side's half width, the sill's height, the side's top, the fender's
    // peak (half width, height), the valley inside it (half width, height), the tub's shoulder (half width, height),
    // the middle's height]
    const KEYS = [
      [-2.33, 0.2, 0.9, 0.22, 0.6, 0.78, 0.76, 0.5, 0.58, 0.2, 0.6, 0.6],
      [-2.0, 0.14, 0.97, 0.16, 0.72, 0.84, 0.88, 0.55, 0.62, 0.2, 0.66, 0.66],
      [-1.55, 0.12, 1.0, 0.14, 0.8, 0.84, 0.92, 0.55, 0.64, 0.2, 0.68, 0.7],
      [-1.0, 0.12, 0.99, 0.14, 0.66, 0.82, 0.82, 0.55, 0.62, 0.25, 0.7, 0.72],
      [-0.3, 0.12, 0.93, 0.14, 0.5, 0.76, 0.64, 0.5, 0.58, 0.3, 0.68, 0.7],
      [0.3, 0.12, 0.9, 0.14, 0.45, 0.72, 0.58, 0.48, 0.55, 0.3, 0.62, 0.64],
      [0.8, 0.12, 0.97, 0.14, 0.6, 0.78, 0.76, 0.46, 0.5, 0.24, 0.55, 0.58],
      [1.25, 0.12, 0.99, 0.14, 0.77, 0.8, 0.87, 0.48, 0.44, 0.2, 0.45, 0.47],
      [1.7, 0.12, 0.97, 0.14, 0.6, 0.8, 0.74, 0.48, 0.38, 0.18, 0.38, 0.4],
      [2.1, 0.12, 0.85, 0.14, 0.34, 0.76, 0.48, 0.42, 0.3, 0.15, 0.3, 0.31],
      [2.33, 0.14, 0.62, 0.16, 0.22, 0.55, 0.27, 0.3, 0.22, 0.12, 0.23, 0.24],
    ];
    const half = (z) => {
      const [y0, wf, ys, yside, xp, yp, xv, yv, xc, yc, ym] = along(KEYS, z);
      const h = [[0, y0], [wf - 0.05, y0], [wf, ys], [wf, yside], [(wf + xp) / 2 + 0.03, (yside + yp) / 2 + 0.05], [xp, yp], [xv, yv], [xc, yc], [0, ym]];
      const a = archAt(AXLES, z, 0.06);
      if (a) {
        h[1][0] = Math.min(h[1][0], a.inner - 0.02); h[2][0] = Math.min(h[2][0], a.inner); h[2][1] = Math.max(h[2][1], a.lip);
        h[3][1] = Math.max(h[3][1], a.lip + 0.03); h[4][1] = Math.max(h[4][1], h[3][1] + 0.04); h[5][1] = Math.max(h[5][1], h[4][1] + 0.02);
      }
      return h;
    };
    const body = place(group, loftGeo(stationsOf(KEYS, AXLES, 0.06, [-0.65, 0.0, 0.55, 1.9]).map(z => [z, mirror(half(z))])), paint, 0, 0, 0);
    const { sideX, topY } = surface(half, [1, 5], [5, 8]);
    // the canopy, a bubble swept back into the engine cover: [z, half width, its foot, its top]
    const BUBBLE = [[-0.8, 0.12, 0.68, 0.72], [-0.45, 0.3, 0.64, 0.88], [0.0, 0.36, 0.6, 0.98], [0.4, 0.34, 0.56, 0.95], [0.8, 0.24, 0.5, 0.76], [1.05, 0.1, 0.44, 0.5]];
    const ARC = [0, 1, 2, 3, 4].map(i => i * Math.PI / 10);
    place(group, loftGeo(BUBBLE.map(([z, w, b, t]) => {
      const side = [[w * 0.97, b - 0.1], ...ARC.map(a => [w * Math.cos(a), b + (t - b) * Math.sin(a)])];
      return [z, mirror([[0, b - 0.1], ...side, [0, t]])];
    })), glass, 0, 0, 0);
    // the lamps: a slit in each front fender's tip, lying on its slope
    const lamps = [];
    for (const side of [-1, 1]) {
      const x = side * 0.68, z = 2.05, y = topY(z, x);
      const pitch = Math.atan2(topY(z - 0.06, x) - topY(z + 0.06, x), 0.12), roll = Math.atan2(topY(z, x + 0.05) - topY(z, x - 0.05), 0.1);
      lamps.push(bx(0.15, 0.04, 0.2, 0, 0, 0).rotateZ(roll).rotateX(pitch).translate(x, y, z));
    }
    merged(group, LAMP, lamps);
    // the sidepods' intakes, behind the front wheels; the flames along the flanks
    const intake = [[0.8, 0.44], [0.18, 0.36], [0.12, 0.19], [0.78, 0.19]];
    for (const side of [-1, 1]) place(group, onFlank(sideX, intake, 0.012, side), dark, 0, 0, 0);
    const flameCurve = (pts) => new THREE.CatmullRomCurve3(pts.map(([z, y]) => new THREE.Vector3(sideX(z, y), y, z)));
    const flames = [flameCurve([[0.83, 0.57], [0.5, 0.5], [-0.2, 0.45], [-0.8, 0.52], [-1.1, 0.62]]),       // (between the arches: off the flank there is only the wheel well)
      flameCurve([[0.1, 0.4], [-0.3, 0.36], [-0.8, 0.41], [-1.1, 0.5]])];
    flames.forEach((curve, i) => {
      for (const side of [-1, 1]) place(group, shared('furaiFlame' + i, () => new THREE.TubeGeometry(curve, 14, 0.02, 4, false)), flame, 0, 0, 0).scale.x = side;
    });
    // mirrors on the fenders, by the canopy
    merged(group, paint, [-1, 1].flatMap(side => [bx(0.14, 0.07, 0.1, side * 0.66, topY(0.75, 0.66) + 0.09, 0.75), bx(0.02, 0.1, 0.04, side * 0.66, topY(0.75, 0.66) + 0.03, 0.75)]));
    // the wing, the width of the car, on two end plates that stand on the rear fenders
    box(group, dark, 1.78, 0.03, 0.34, 0, 1.0, -2.17).rotation.x = -0.12;
    merged(group, dark, [-1, 1].map(side => plate(0.025, [[-2.0, 0.7], [-2.34, 0.64], [-2.34, 1.06], [-2.1, 1.06]], side * 0.9)));
    // the tail: a red lamp in each fender's tail, the rain lamp in the middle, the diffuser
    const ZT = -2.33;
    merged(group, TAIL, [-1, 1].map(side => bx(0.16, 0.05, 0.02, side * 0.7, 0.62, ZT - 0.008)));
    box(group, dark, 0.9, 0.18, 0.02, 0, 0.45, ZT - 0.004);
    box(group, TAIL, 0.1, 0.08, 0.02, 0, 0.48, ZT - 0.016);
    merged(group, dark, [bx(1.3, 0.2, 0.3, 0, 0.26, ZT + 0.08), ...[-0.4, -0.13, 0.13, 0.4].map(x => bx(0.02, 0.18, 0.34, x, 0.25, ZT + 0.06))]);
    box(group, dark, 1.5, 0.03, 0.3, 0, 0.13, 2.18);                                        // (the splitter under the nose)
    alloys(group, AXLES, lambert(0x9da2a9), 6, lambert(0x2a2c31));
    group.userData = { body, animate: () => {}, livery: (evil) => flame.color.setHex(evil ? 0xff5a1a : 0x1a1a1e) };
    return group;
  },
};
