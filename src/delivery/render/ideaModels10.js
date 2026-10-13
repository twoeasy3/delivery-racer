// ---- a car idea's model: the Fishbowl Runabout -------------------------------------------------------------------
// One vehicle drawn as an idea (ideas.js: IDEA_CARS, `fishbowl`): a tiny three-seat electric city car after a
// concept of 2007 (the Nissan Pivo 2), short and tall on four small wheels at its corners, a round tub of a body
// with pods over the wheels, and a glass bubble over nearly all of it.
// Built as ideaModels6.js' lofted cars are (the same helpers, kept here as copies so that the files do not import
// each other): few curve segments, one geometry for each set of identical parts, parts that share a material and
// never move merged into one mesh. The builder takes the idea's entry and returns a group, front facing local +z,
// with userData.body (the mesh whose material is the paint, so the livery can be swapped), userData.animate
// (seconds) => void and userData.livery (evil) => void (the frame over the glass is a second colour).
// ideaModels.js spreads IDEA_MODELS_10 into IDEA_MODELS. State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const GLASS = 0x2a3340, TRIM = 0x2a2c31; // (the glass a touch bluer than the other ideas': it is most of the car)
const TYRE = lambert(0x141414), WHITE = lambert(0xf4f2ec);
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xd8141c });
const STOP = new THREE.MeshBasicMaterial({ color: 0xff3a3a }), AMBER = new THREE.MeshBasicMaterial({ color: 0xffa31a });
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
// a material drawn a hair further back than its depth: for what a shell or panel lies close over, so the two never fight
const behind = (material) => { material.polygonOffset = true; material.polygonOffsetFactor = 1; material.polygonOffsetUnits = 2; return material; };
// ---- parts merged into one mesh: each of these makes a geometry already in its place, and `merged` joins them
const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a disc facing along the car (a lamp), turned `yaw` about the upright
const dsc = (r, depth, x, y, z, yaw = 0, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).rotateY(yaw).translate(x, y, z);
// the top half of a ring lying flat on a flank (a wheel arch's lip), its middle at (x, y, z)
const lip = (r, t, x, y, z) => new THREE.TorusGeometry(r, t, 3, 8, Math.PI).rotateY(Math.PI / 2).translate(x, y, z);
// the top half of a thin disc on a flank (a dark wheel well behind a wheel)
const well = (r, x, y, z) => new THREE.CylinderGeometry(r, r, 0.01, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(x, y, z);
const merged = (parent, material, geos) => place(parent, mergeGeometries(geos, false), material, 0, 0, 0);
// ...or each made a mesh of its own (a pair of lamps, one each side)
const each = (parent, material, geos) => geos.map(geo => place(parent, geo, material, 0, 0, 0));

// a body lofted through cross-sections along the car: `rings` is a list of [z, points], each points a closed loop of
// [x, y] (as many in every ring, in the same order); both ends closed with a fan to their middle (`caps`). Its
// material should be double-sided (the winding is not looked after)
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
// ---- a lofted body (as ideaModels6.js'): cross-sections along the car, each a rounded shoulder over a side that is
// cut back under the haunches to clear the wheels, up to an arch.
//   BODY   [z, half width at its widest, the height of that, the height of the deck on the middle, the floor, the sill's half width]
//   AXLES  [z, wheel radius, tyre width, the tyre's outer face]
//   n      how square the shoulders are (2 round, more squarer)
// Returns the body mesh, and sideX(z, y) / topY(z, x): where its side and its top are, for parts to sit on them.
const superTop = (w, yb, yTop, t, n) => [w * Math.pow(Math.abs(Math.cos(t)), 2 / n), yb + (yTop - yb) * Math.pow(Math.max(0, Math.sin(t)), 2 / n)];
const SHOULDER = [0, 1, 2, 3, 4].map(i => i * Math.PI / 10);
const loftBody = (group, material, BODY, AXLES, n, around) => {
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
  return { body, section, sideX, topY };
};
// a canopy (glass) lofted through [z, half width, the height of its foot, the height of its top]; and a shell over
// its top in another material, reaching `cover` radians down its sides from the top at each of its stations
const canopyRing = ([wc, base, top], n) => {
  const side = [[wc * 0.97, base - 0.1], ...SHOULDER.map(t => superTop(wc, base, top, t, n))];
  return [[0, base - 0.1], ...side, [0, top], ...side.slice().reverse().map(([x, y]) => [-x, y])];
};
// (the shell's points at the canopy's own angles, so that it lies over the glass as an even skin, `off` out from it)
const coverRing = ([wc, base, top], n, a, off) => {
  const arc = [Math.PI / 2 - a, ...SHOULDER.filter(t => t > Math.PI / 2 - a + 0.05)];
  const out = arc.map(t => superTop(wc + off, base, top + off, t, n)), inn = arc.map(t => superTop(wc - 0.004, base, top - 0.004, t, n));
  return [...out, [0, top + off], ...out.slice().reverse().map(([x, y]) => [-x, y]), ...inn.map(([x, y]) => [-x, y]), [0, top - 0.004], ...inn.slice().reverse()];
};

export const IDEA_MODELS_10 = {
  // A tiny three-seat electric city car (after the Nissan Pivo 2 concept, 2007), lofted through cross-sections: a
  // round tub of a body, short and tall, with pods over four small wheels pushed out to its corners; a glass bubble
  // over nearly all of it, from a windscreen that starts low on the nose to a back window nearly upright, under a
  // frame in a second colour (a roof cap, a hoop over the middle where the doors meet, the windscreen's pillars).
  // Round lamps with dark rims in a stubby nose, an intake and a plate under them; a tail with lamps up its corners
  // (tail lamps over brake lamps), a stop lamp at the roof's end, reversing lamps and a plate. Dark arch lips and
  // wells, white hub caps, little mirrors on the shoulders. It sits still
  fishbowl: (car) => {
    const group = new THREE.Group();
    const L = car.hl, R = 0.27, TW = 0.17, OUT = car.hw - 0.02, ZA = 0.9;
    const paint = lambert(car.color), frame = lambert(0xf2f2ee), glass = lambert(GLASS), trim = lambert(TRIM), dark = lambert(0x111317);
    for (const m of [paint, glass, frame]) m.side = THREE.DoubleSide;
    behind(glass); // (the frame lies close over it)
    const NB = 2.3, NC = 2.1; // (how square the body's and the canopy's shoulders are: 2 round)
    const AXLES = [[ZA, R, TW, OUT], [-ZA, R, TW, OUT]];
    const { body, sideX, topY } = loftBody(group, paint, [
      [-L, 0.5, 0.46, 0.7, 0.25, 0.44], [-L + 0.04, 0.66, 0.47, 0.75, 0.21, 0.6], [-L + 0.12, 0.74, 0.48, 0.8, 0.18, 0.7],
      [-1.0, 0.78, 0.48, 0.86, 0.16, 0.74], [0, 0.785, 0.48, 0.84, 0.15, 0.75], [1.0, 0.78, 0.47, 0.79, 0.16, 0.74], [L - 0.12, 0.74, 0.47, 0.76, 0.17, 0.7],
      [L - 0.04, 0.66, 0.46, 0.7, 0.19, 0.62], [L, 0.5, 0.44, 0.62, 0.22, 0.46],
    ], AXLES, NB, [-0.4, -0.28, 0, 0.28, 0.4]);
    // the bubble: [z, half width, top (or, under 0.5, its height over the foot)]; its foot is where that width meets the body's shoulder
    const BUBBLE = [[-L + 0.015, 0.2, 0.06], [-L + 0.04, 0.38, 0.9], [-L + 0.09, 0.5, 1.04], [-L + 0.17, 0.58, 1.2], [-1.08, 0.64, 1.34], [-0.85, 0.69, 1.47], [-0.45, 0.71, 1.56],
      [-0.1, 0.715, 1.585], [0.25, 0.71, 1.56], [0.55, 0.69, 1.46], [0.82, 0.64, 1.28], [1.02, 0.56, 1.06], [1.13, 0.42, 0.88], [1.17, 0.24, 0.05]];
    // (at the tail the deck rises in the middle: there the foot is on the deck's crown, the skirt below it hiding the step at the sides)
    // (the last ring's top is given over its foot: the back of the bubble closes down onto the deck)
    const keys = BUBBLE.map(([z, wc, top]) => {
      const base = (z < -1.0 ? Math.max(topY(z, wc), topY(z, 0) - 0.03) : topY(z, wc)) - 0.01;
      return [z, wc, base, top < 0.5 ? base + top : top];
    });
    // the frame's pieces, [the stations along it, how far down the bubble's sides it reaches (rad), how far out it lies]:
    // the windscreen's pillars (a hoop round its back edge), the roof cap, and a hoop over the middle where the doors meet
    const FRAME = [[[0.5, 0.6], 1.571, 0.016], [[-1.08, -0.85, -0.45, -0.1, 0.25, 0.5], 0.62, 0.016], [[-0.24, -0.1], 1.571, 0.024]];
    const zs = [...new Set([...keys.map(k => k[0]), ...FRAME.flatMap(f => f[0])])].sort((a, b) => a - b); // (the glass has a station wherever the frame has one)
    loft(group, glass, zs.map(z => [z, canopyRing(along(keys, z), NC)]));
    for (const [at, a, off] of FRAME) loft(group, frame, at.map(z => [z, coverRing(along(keys, z), NC, a, off)]), false);
    // the stop lamp at the roof cap's back end
    const [, , capTop] = along(keys, -1.08);
    box(group, STOP, 0.32, 0.035, 0.05, 0, capTop - 0.06, -1.1);
    // the face: round lamps in dark rims, indicators beside them, the intake and the plate under them
    const LX = 0.4;
    each(group, dark, [-1, 1].map(side => dsc(0.1, 0.04, side * LX, 0.45, L, 0, 14)));
    each(group, LAMP, [-1, 1].map(side => dsc(0.075, 0.04, side * LX, 0.45, L + 0.007, 0, 14)));
    each(group, AMBER, [-1, 1].map(side => bx(0.035, 0.07, 0.04, side * 0.25, 0.42, L)));
    merged(group, trim, [bx(0.62, 0.1, 0.05, 0, 0.29, L - 0.008), bx(0.18, 0.03, 0.05, 0, 0.53, L - 0.01)]); // the intake, a slot of a grille over it
    box(group, WHITE, 0.36, 0.09, 0.02, 0, 0.29, L + 0.022);
    // the tail: lamps up its corners (tail over brake), reversing lamps, the plate and a dark valance
    each(group, TAIL, [-1, 1].map(side => bx(0.07, 0.12, 0.04, side * 0.4, 0.59, -L)));
    each(group, STOP, [-1, 1].map(side => bx(0.07, 0.08, 0.04, side * 0.4, 0.475, -L)));
    merged(group, AMBER, [-1, 1].map(side => bx(0.07, 0.04, 0.04, side * 0.4, 0.39, -L)));
    merged(group, LAMP, [-1, 1].map(side => bx(0.1, 0.04, 0.04, side * 0.24, 0.32, -L - 0.004)));
    box(group, WHITE, 0.36, 0.1, 0.02, 0, 0.48, -L - 0.016);
    box(group, trim, 0.7, 0.08, 0.05, 0, 0.3, -L + 0.012);
    // the flanks: where the doors meet (under the hoop), handles, mirrors on the shoulders
    const sill = sideX(0, 0.36);
    merged(group, trim, [-1, 1].flatMap(side => [
      bx(0.012, 0.36, 0.014, side * (sill + 0.003), 0.4, -0.17),
      bx(0.03, 0.06, 1.0, side * (sill - 0.006), 0.2, 0),                                  // the sills
    ]));
    each(group, frame, [-1, 1].map(side => bx(0.02, 0.025, 0.12, side * (sideX(0.1, 0.5) + 0.005), 0.5, 0.1)));
    for (const side of [-1, 1]) {
      const z = 0.72, x = 0.71, y = topY(z, x);
      merged(group, trim, [bx(0.03, 0.08, 0.03, side * x, y + 0.03, z), bx(0.11, 0.07, 0.06, side * (x + 0.06), y + 0.08, z)]);
      box(group, AMBER, 0.012, 0.03, 0.07, side * (sideX(0.45, 0.55) + 0.001), 0.55, 0.45);   // a side repeater on the pod
    }
    box(group, trim, 0.012, 0.1, 0.1, -(sideX(-0.62, 0.56) + 0.001), 0.56, -0.62);           // the charging flap
    const [, , roofTop] = along(keys, -0.85);
    box(group, trim, 0.03, 0.05, 0.1, 0, roofTop + 0.016 + 0.02, -0.85);                     // the aerial's fin
    // the wheels: small, at the corners, a white cap in each; dark wells and lips round them
    const tyreGeo = shared('fbTyre', () => new THREE.CylinderGeometry(R, R, TW, 16).rotateZ(Math.PI / 2));
    const capGeo = shared('fbCap', () => new THREE.CylinderGeometry(R * 0.6, R * 0.6, TW + 0.02, 12).rotateZ(Math.PI / 2));
    const nutGeo = shared('fbNut', () => new THREE.CylinderGeometry(0.05, 0.05, TW + 0.035, 8).rotateZ(Math.PI / 2));
    for (const side of [-1, 1]) for (const z of [ZA, -ZA]) {
      place(group, tyreGeo, TYRE, side * (OUT - TW / 2), R, z);
      place(group, capGeo, WHITE, side * (OUT - TW / 2), R, z);
      place(group, nutGeo, trim, side * (OUT - TW / 2), R, z);
    }
    merged(group, dark, [-1, 1].flatMap(side => [ZA, -ZA].map(z => well(R + 0.06, side * (OUT - TW - 0.01), R, z))));
    merged(group, trim, [-1, 1].flatMap(side => [ZA, -ZA].map(z => lip(R + 0.075, 0.025, side * (sideX(z, 0.62) + 0.006), R, z))));
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => frame.color.setHex(evil ? 0x1a1b20 : 0xf2f2ee),
    };
    return group;
  },
};
