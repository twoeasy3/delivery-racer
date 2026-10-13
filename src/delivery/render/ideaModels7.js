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
const alloys = (group, AXLES, spokeMaterial, spokes = 5, rimMaterial = lambert(0x2e3138)) => {
  const parts = [];
  for (const side of [-1, 1]) {
    for (const [za, R, width, outer] of AXLES) {
      const x = side * (outer - width / 2), face = side * (outer + 0.012);
      wheel(group, R, width, x, R, za, rimMaterial, 0.7);
      for (let i = 0; i < spokes; i++) parts.push(bx(0.02, R * 0.62, 0.07, face, R + R * 0.31, za).translate(-face, -R, -za).rotateX(i * 2 * Math.PI / spokes).translate(face, R, za));
      parts.push(cyl(R * 0.16, 0.03, face, R, za, 'x', 8));
    }
  }
  merged(group, spokeMaterial, parts);
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
    box(group, WHITE, 0.4, 0.1, 0.02, 0, 0.42, ZT - 0.008);
    // the spoiler: a raked blade across the tail on two posts, the stop lamp along its back edge
    const spoiler = Math.atan2(0.05, 0.24);
    merged(group, trim, [-1, 1].map(side => bx(0.04, 0.09, 0.08, side * 0.5, topY(-2.12, 0.5) + 0.03, -2.12)));
    box(group, paint, 1.5, 0.03, 0.26, 0, topY(-2.12, 0.5) + 0.085, -2.12).rotation.x = -spoiler;
    box(group, TAIL, 0.9, 0.022, 0.02, 0, topY(-2.12, 0.5) + 0.06, -2.255);
    alloys(group, AXLES, alloy, 5);
    group.userData = { body, animate: () => {} };
    return group;
  },
};
