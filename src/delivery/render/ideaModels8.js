// ---- the eighth batch of car ideas' models: one concept car ----------------------------------------------------
// The Quad-Turbo Supercar (ideas.js: IDEA_CARS, after the Chrysler ME Four-Twelve show car of 2004): a mid-engined
// supercar, low, wide and rounded, with a big glass canopy set well forward and a long tail over the engine.
// Built as ideaModels6.js' are (the same helpers, kept here as copies so that the files do not import each other):
// few curve segments, one geometry for each set of identical parts, and parts that share a material and never move
// merged into one mesh. The builder takes the idea's entry and returns a group, front facing local +z, with
// userData.body (the mesh whose material is the paint, so the livery can be swapped), userData.animate (seconds) =>
// void, and userData.livery (evil) => void for its second colour. ideaModels.js spreads IDEA_MODELS_8 into
// IDEA_MODELS. State-free.
import * as THREE from 'three';
import { shapesLive } from './shapeedits.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x24262b;
const TYRE = lambert(0x141414);
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const AMBER = new THREE.MeshBasicMaterial({ color: 0xffa31a }), REVERSE = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
// one geometry for each set of identical parts (four wheels, a pair of lamps), made the first time it is asked for
const SHARED = new Map();
const shared = (key, make) => { if (shapesLive()) return make(); if (!SHARED.has(key)) SHARED.set(key, make()); return SHARED.get(key); };
const place = (parent, geo, material, x, y, z) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a wheel: a tyre and a hub, the axle across the car (returns [tyre, hub])
const wheel = (parent, radius, width, x, y, z, hubMaterial) => {
  const tyre = place(parent, shared('tyre' + [radius, width], () => new THREE.CylinderGeometry(radius, radius, width, 16).rotateZ(Math.PI / 2)), TYRE, x, y, z);
  const hub = place(parent, shared('hub' + [radius, width], () => new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, width + 0.02, 12).rotateZ(Math.PI / 2)), hubMaterial, x, y, z);
  return [tyre, hub];
};
// ---- parts merged into one mesh: each of these makes a geometry already in its place, and `merged` joins them
const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
const cyl = (r, length, x, y, z, axis = 'y', seg = 10, open = false) => {
  const geo = new THREE.CylinderGeometry(r, r, length, seg, 1, open);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return geo.translate(x, y, z);
};
// a solid whose side view is the polygon `profile` ([z, y] points), `w` wide across the car, its middle at x
const side = (profile, w, x) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 4 });
  geo.rotateY(-Math.PI / 2);
  return geo.translate(x + w / 2, 0, 0);
};
// a solid whose front view is the polygon `profile` ([x, y] points), `l` long along the car, its middle at z
const face = (profile, l, z) => {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, z - l / 2);
};
// a thin strip lying on a curved top (topY(z, x): its height), along `path` ([x, z] points), `hw` either side of it
// and `lift` above it: a slot, a stripe
const skin = (topY, path, hw, lift) => {
  const pos = [];
  const edge = path.map(([x, z], i) => {
    const [ax, az] = path[Math.max(0, i - 1)], [bx2, bz] = path[Math.min(path.length - 1, i + 1)], len = Math.hypot(bx2 - ax, bz - az);
    const nx = -(bz - az) / len * hw, nz = (bx2 - ax) / len * hw;
    return [[x + nx, z + nz], [x - nx, z - nz]].map(([px, pz]) => new THREE.Vector3(px, topY(pz, px) + lift, pz));
  });
  for (let i = 0; i + 1 < edge.length; i++) {
    const [a, b] = edge[i], [c, d] = edge[i + 1];
    for (const t of [[a, b, c], [b, d, c]]) {
      const up = new THREE.Vector3().subVectors(t[1], t[0]).cross(new THREE.Vector3().subVectors(t[2], t[0])).y > 0;
      for (const v of up ? t : [t[0], t[2], t[1]]) pos.push(v.x, v.y, v.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};
const merged = (parent, material, geos) => place(parent, mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false), material, 0, 0, 0);
// a material drawn a hair further back than its depth: for what a shell or panel lies close over, so the two never fight
const behind = (material) => { material.polygonOffset = true; material.polygonOffsetFactor = 1; material.polygonOffsetUnits = 2; return material; };

// a body lofted through cross-sections along the car: `rings` is a list of [z, points], each points a closed loop
// of [x, y] (as many in every ring, in the same order); both ends closed with a fan to their middle. Its material
// should be double-sided (the winding is not looked after)
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
const superTop = (w, yb, yTop, t, n) => [w * Math.pow(Math.abs(Math.cos(t)), 2 / n), yb + (yTop - yb) * Math.pow(Math.max(0, Math.sin(t)), 2 / n)];
const SHOULDER = [0, 1, 2, 3, 4].map(i => i * Math.PI / 10);
// the canopy (glass) lofted through [z, half width, the height of its foot, the height of its top]; and a shell over
// its top in another material, reaching `cover[z]` radians down its sides from the top at each z named
const loftCanopy = (group, material, CANOPY, n) => loft(group, material, CANOPY.map(([z, wc, base, top]) => {
  const s = [[wc * 0.97, base - 0.1], ...SHOULDER.map(t => superTop(wc, base, top, t, n))];
  return [z, [[0, base - 0.1], ...s, [0, top], ...s.slice().reverse().map(([x, y]) => [-x, y])]];
}));
const loftCover = (group, material, CANOPY, n, cover) => loft(group, material, CANOPY.filter(([z]) => z in cover).map(([z, wc, base, top]) => {
  const a = cover[z], arc = [0, 1, 2, 3].map(i => Math.PI / 2 - a * (1 - i / 4));
  const out = arc.map(t => superTop(wc + 0.016, base, top + 0.016, t, n)), inn = arc.map(t => superTop(wc - 0.004, base, top - 0.004, t, n));
  return [z, [...out, [0, top + 0.016], ...out.slice().reverse().map(([x, y]) => [-x, y]), ...inn.map(([x, y]) => [-x, y]), [0, top - 0.004], ...inn.slice().reverse()]];
}), false);

// ---- a supercar's body: cross-sections along the car, each a sill tucked in under a rounded shoulder that rises to
// a crest over each wheel (a front wing, a rear haunch) and dips between them to the middle of the deck; under the
// wheel arches the side is cut back inside the tyre, up to the arch.
//   BODY   [z, half width at its widest, the height of that, the deck's height on the middle, the crest's height,
//           the floor, the sill's half width]
//   AXLES  [z, wheel radius, tyre width, the tyre's outer face]
// Returns the body mesh, and sideX(z, y) / topY(z, x): where its side and its top are, for parts to sit on them.
const CREST = 0.6, ROUND = 2.4; // (the crest's place, a share of the half width; how square the shoulder is)
const supercarBody = (group, material, BODY, AXLES, around = [-0.46, -0.32, -0.12, 0.12, 0.32, 0.46]) => {
  const section = (z) => {
    let [W, yb, yc, yf, y0, wLow] = along(BODY, z), yLip = Math.max(yb - 0.1, y0 + 0.11);
    yb = Math.max(yb, yLip + 0.04);
    for (const [za, R, width, outer] of AXLES) {
      const dz = Math.abs(z - za), Ra = R + 0.07;
      if (dz < 0.47) {
        wLow = outer - width - 0.02;
        yLip = dz < Ra ? R + Math.sqrt(Ra * Ra - dz * dz) : y0 + 0.1;
        yb = Math.max(yb, yLip + 0.04);
      }
    }
    return { W, yb, yc, yf: Math.max(yf, yb + 0.02), y0, wLow, yLip };
  };
  const half = (z) => {
    const { W, yb, yc, yf, y0, wLow, yLip } = section(z), xf = W * CREST;
    const shoulder = SHOULDER.concat(Math.PI / 2).map(t => [xf + (W - xf) * Math.pow(Math.cos(t), 2 / ROUND), yb + (yf - yb) * Math.pow(Math.sin(t), 2 / ROUND)]);
    const deck = [0.62, 0.28].map(s => [xf * s, yc + (yf - yc) * s * s * (3 - 2 * s)]);
    return [[wLow, y0 + 0.04], [wLow, Math.max(y0 + 0.08, yLip - 0.02)], [W - 0.03, yLip], ...shoulder, ...deck];
  };
  const ring = (z) => {
    const { yc, y0 } = section(z), h = half(z);
    return [[0, y0], ...h, [0, yc], ...h.slice().reverse().map(([x, y]) => [-x, y])];
  };
  const zs = new Set(BODY.map(k => k[0]));
  for (const [za] of AXLES) for (const dz of around) zs.add(Math.round((za + dz) * 1000) / 1000);
  const stations = [...zs].sort((a, b) => a - b), body = loft(group, material, stations.map(z => [z, ring(z)]));
  // where the side is at height y (the outermost crossing of the half-section), and the top at x
  const cross = (pts, u, v, at) => { // (the largest v where the polyline crosses u = at)
    let best = null;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((a[u] - at) * (b[u] - at) > 0 || a[u] === b[u]) continue;
      const t = (at - a[u]) / (b[u] - a[u]), val = a[v] + (b[v] - a[v]) * t;
      if (best === null || val > best) best = val;
    }
    return best;
  };
  const sideX = (z, y) => cross(half(z), 1, 0, y) ?? 0;
  const topY = (z, x) => cross([...half(z), [0, section(z).yc]], 0, 1, Math.abs(x)) ?? section(z).yc;
  return { body, section, sideX, topY };
};

export const IDEA_MODELS_8 = {
  // A quad-turbo mid-engined supercar (a Chrysler ME Four-Twelve, 2004): low, wide and soft-edged. A short rounded
  // nose between front wings that rise over the wheels, slim lamps set into their tops; an oval mouth in the nose
  // and an intake under each lamp; a big glass canopy set well forward, its roof in the paint, the glass running on
  // back over the engine; a deep scoop in each flank behind the door; a long tail over broad haunches, a lip of a
  // spoiler on its end, a band of tail lamps across it, a stop lamp, reversing lamps, a mesh panel, a diffuser and
  // four exhausts in a row, one for each turbo. It sits still
  quadturbo: (car) => {
    const group = new THREE.Group();
    const paint = lambert(car.color), carbon = lambert(0x2c3036), chrome = lambert(CHROME), trim = lambert(TRIM);
    const glass = behind(lambert(GLASS)), slot = lambert(TRIM); // (the roof lies close over it)
    for (const m of [paint, glass, slot]) m.side = THREE.DoubleSide;
    const AXLES = [[1.3, 0.34, 0.26, 0.96], [-1.49, 0.36, 0.32, 0.975]];
    const { body, sideX, topY } = supercarBody(group, paint, [
      //  z      W     yb    yc    yf    y0    wLow
      [-2.27, 0.84, 0.44, 0.78, 0.8, 0.22, 0.72], [-2.2, 0.93, 0.48, 0.82, 0.85, 0.17, 0.82], [-1.95, 0.98, 0.5, 0.84, 0.88, 0.15, 0.86],
      [-1.0, 1.0, 0.5, 0.82, 0.88, 0.14, 0.86], [-0.5, 0.97, 0.47, 0.78, 0.82, 0.14, 0.86], [0.0, 0.95, 0.45, 0.74, 0.76, 0.14, 0.86],
      [1.0, 0.98, 0.47, 0.67, 0.8, 0.14, 0.86], [1.6, 0.98, 0.42, 0.58, 0.71, 0.15, 0.84],
      [1.95, 0.95, 0.38, 0.53, 0.64, 0.16, 0.8], [2.18, 0.88, 0.33, 0.46, 0.52, 0.17, 0.76], [2.27, 0.78, 0.33, 0.4, 0.44, 0.2, 0.68],
    ], AXLES);
    // the canopy: glass from the windscreen's foot, just behind the front wheels, over the cabin and on back down the
    // engine cover nearly to the tail; the roof over the cabin in the paint, its edges the pillars
    const CANOPY = [[1.08, 0.3, 0.66, 0.68], [0.85, 0.58, 0.69, 0.84], [0.55, 0.68, 0.71, 0.98], [0.2, 0.71, 0.73, 1.08], [-0.15, 0.71, 0.75, 1.13],
      [-0.5, 0.67, 0.78, 1.1], [-0.9, 0.58, 0.81, 1.02], [-1.3, 0.47, 0.83, 0.95], [-1.72, 0.32, 0.83, 0.88], [-1.92, 0.2, 0.83, 0.85]];
    loftCanopy(group, glass, CANOPY, 2.2);
    loftCover(group, paint, CANOPY, 2.2, { 0.55: 0.4, 0.2: 0.55, '-0.15': 0.6, '-0.5': 0.55, '-0.9': 0.3 });
    // the louvres across the glass over the engine
    merged(group, carbon, [-1.12, -1.3, -1.48, -1.66].map(z => {
      const wc = along(CANOPY.map(([cz, w]) => [cz, w]).reverse(), z)[0] * 0.8, y = along(CANOPY.map(([cz, , , t]) => [cz, t]).reverse(), z)[0];
      return bx(wc * 2, 0.02, 0.05, 0, y + 0.002, z, -0.17);
    }));
    // the nose: an oval mouth, an intake under each lamp, a splitter under it all
    const oval = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; oval.push([Math.cos(a) * 0.26, 0.31 + Math.sin(a) * 0.07]); }
    merged(group, trim, [face(oval, 0.02, 2.275), ...[-1, 1].map(s => face([[0.38, 0.25], [0.58, 0.25], [0.62, 0.33], [0.4, 0.34]].map(([x, y]) => [s * x, y]), 0.02, 2.275))]);
    merged(group, carbon, [bx(1.3, 0.03, 0.2, 0, 0.19, 2.15)]);
    // the headlamps, set into the tops of the front wings: a slim dark slot lying on each wing along its leading edge,
    // three lamps in it, an indicator at its outer end
    const slots = [], lamps = [], winkers = [];
    for (const s of [-1, 1]) {
      const path = [[0.88, 1.84], [0.8, 1.93], [0.69, 2.02], [0.58, 2.09], [0.47, 2.14]].map(([x, z]) => [s * x, z]);
      slots.push(skin(topY, path, 0.05, 0.01));
      const mix = (i, t) => [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t];
      for (const i of [1, 2, 3]) lamps.push(skin(topY, [mix(i - 1, 0.68), mix(i, 0), mix(i, 0.32)], 0.034, 0.016));
      winkers.push(skin(topY, [mix(0, 0.05), mix(0, 0.45)], 0.03, 0.016));
    }
    // and two vents in the bonnet, between the wings
    for (const s of [-1, 1]) slots.push(skin(topY, [[s * 0.19, 1.36], [s * 0.2, 1.47], [s * 0.21, 1.58], [s * 0.22, 1.69]], 0.045, 0.014));
    merged(group, slot, slots);
    merged(group, LAMP, lamps);
    merged(group, AMBER, winkers);
    // the scoops in the flanks behind the doors, and the sills under the doors, in carbon
    const scoop = [[-0.42, 0.62], [-0.98, 0.6], [-1.02, 0.36], [-0.7, 0.33]];
    merged(group, carbon, [-1, 1].flatMap(s => [
      side(scoop, 0.12, s * (sideX(-0.72, 0.48) - 0.045)),
      side([[0.82, 0.17], [-0.94, 0.17], [-0.94, 0.27], [0.82, 0.27]], 0.06, s * (sideX(0, 0.22) - 0.02)),
    ]));
    // mirrors on stalks off the canopy's foot
    merged(group, paint, [-1, 1].flatMap(s => [bx(0.07, 0.07, 0.14, s * 0.88, 0.81, 0.66), bx(0.26, 0.025, 0.05, s * 0.73, 0.79, 0.68)]));
    // the wheels: a dark hub with a five-spoke star on it
    const hubColour = lambert(0x3a3d43);
    for (const s of [-1, 1]) {
      for (const [za, R, width, outer] of AXLES) wheel(group, R, width, s * (outer - width / 2), R, za, hubColour);
    }
    merged(group, chrome, [-1, 1].flatMap(s => AXLES.flatMap(([za, R, , outer]) => [
      ...[0, 1, 2, 3, 4].map(i => bx(0.02, R * 0.6, 0.05, s * (outer + 0.012), R + Math.cos(i * 1.2566) * R * 0.29, za + Math.sin(i * 1.2566) * R * 0.29, i * 1.2566))])));
    // the tail: a lip of a spoiler, the band of tail lamps, a stop lamp over the mesh, the mesh panel, the
    // reversing lamps, the diffuser and four exhausts
    const zt = -2.27;
    merged(group, paint, [bx(1.42, 0.03, 0.18, 0, 0.835, -2.2, -0.12)]).userData.prop = 'wing'; // (the spoiler's lip: a wing prop)
    merged(group, TAIL, [-1, 1].flatMap(s => [bx(0.46, 0.05, 0.03, s * 0.47, 0.68, zt - 0.005), bx(0.06, 0.12, 0.03, s * 0.7, 0.62, zt - 0.005)]).concat(bx(0.3, 0.025, 0.02, 0, 0.765, zt - 0.006)));
    merged(group, trim, [bx(1.0, 0.18, 0.02, 0, 0.47, zt + 0.002), bx(1.5, 0.09, 0.3, 0, 0.215, -2.13), ...[-0.45, -0.15, 0.15, 0.45].map(x => bx(0.015, 0.06, 0.28, x, 0.19, -2.13))]);
    merged(group, REVERSE, [-1, 1].map(s => bx(0.12, 0.04, 0.03, s * 0.6, 0.5, zt - 0.003))); // (inner faces inside the tail)
    merged(group, AMBER, [-1, 1].map(s => bx(0.1, 0.04, 0.03, s * 0.6, 0.6, zt - 0.003)));
    merged(group, chrome, [-0.27, -0.09, 0.09, 0.27].map(x => cyl(0.045, 0.12, x, 0.31, zt + 0.02, 'z', 10, true)));
    merged(group, trim, [-0.27, -0.09, 0.09, 0.27].map(x => new THREE.CircleGeometry(0.04, 10).rotateY(Math.PI).translate(x, 0.31, zt - 0.02)));
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => carbon.color.setHex(evil ? 0x151619 : 0x2c3036),
    };
    return group;
  },
};
