// ---- THE AIRPORT APRON'S MODELS (render/themes/apron.js lays them out; render/stages/apron.js stands a few on the car card) ----
// Each model is a TEMPLATE, not a mesh: its parts' shapes joined into one indexed list of points, every point carrying
// the NAME of its part's colour ('body', 'tail', 'tyre'...). The scenery bakes a template into the level's merged meshes as
// many times as it stands, each time with a palette of its own (an airliner's tail, a tractor's paint), so a whole stretch of
// apron is one draw call however many aircraft and tractors are on it. A name starting with '!' glows (a beacon). Every model
// faces local +z, its wheels on y = 0, in metres. No figures anywhere: the cabs are empty, the stairs bare.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
// a matrix from a place, a turn (rx, ry, rz, in that order) and a scale
export const mat4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') =>
  new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, order)), _s.set(sx, sy, sz));

// ---- the shapes (made once, cloned into a template as it is built) ----
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (top, bottom, h, n = 12, open = false, start = 0, length = Math.PI * 2) => new THREE.CylinderGeometry(top, bottom, h, n, 1, open, start, length);
const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);
// a flat outline ([[a, b], ...]) given a thickness: an extruded prism, the outline in its own x-y, thickness along z from 0
const slab = (points, depth) => new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([a, b]) => new THREE.Vector2(a, b))), { depth, bevelEnabled: false });
// a wing (or a tailplane): its outline seen from above ([x, z] points, x out from the root), t thick, its underside on y = 0
const planform = (points, t) => slab(points.map(([x, z]) => [x, z]), t).rotateX(Math.PI / 2).translate(0, t, 0);
// a fin: its outline seen from the side ([z, y] points), t thick, centred on x = 0
const profile = (points, t) => slab(points, t).rotateY(-Math.PI / 2).translate(t / 2, 0, 0);

// ---- a template being built: put(shape, colour name, place...), then done() ----
const builder = () => {
  const parts = [];
  const put = (geometry, key, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const g = geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    g.applyMatrix4(mat4(x, y, z, rx, ry, rz, sx, sy, sz));
    parts.push([g, key]);
    return g;
  };
  const done = () => {
    const names = [];
    let verts = 0, indices = 0;
    for (const [g] of parts) { verts += g.attributes.position.count; indices += g.index.count; }
    const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), key = new Uint8Array(verts), index = new Uint32Array(indices);
    let v = 0, i = 0;
    for (const [g, name] of parts) {
      let k = names.indexOf(name);
      if (k < 0) { k = names.length; names.push(name); }
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, v * 3);
      nor.set(g.attributes.normal.array, v * 3);
      key.fill(k, v, v + n);
      const ix = g.index.array;
      for (let j = 0; j < ix.length; j++) index[i + j] = ix[j] + v;
      v += n; i += ix.length;
      g.dispose();
    }
    return { pos, nor, key, index, names, verts, tris: indices / 3 };
  };
  return { put, done };
};
const made = {};
const once = (name, build) => () => (made[name] ||= build());

// ---- the colours: what a name is, unless the palette a model is baked with says otherwise ----
export const COLOURS = {
  white: 0xeef0f1, belly: 0xc9ced3, window: 0x26323c, glass: 0x34505f, engine: 0xd5d9dd, intake: 0x30343a, gear: 0x9aa1a8, tyre: 0x1c1d20,
  tail: 0x1f4f99, cheat: 0x1f4f99, dark: 0x2c2f34, frame: 0x8e959c, seat: 0x33363b, body: 0xf2c21d, roof: 0x3d6a9a, curtain: 0x3d6a9a, deck: 0x6c7176,
  bag0: 0x2c3e66, bag1: 0x7a2e2e, bag2: 0x3e5b3a, bag3: 0x8a6a3a, uld: 0xc6cacd, cab: 0xf0f0ee, tank: 0xe9ebec, stripe: 0xc8392e, rail: 0xe8eaeb,
  bus: 0xe8ebee, cone: 0xff6a1a, band: 0xf4f4f4, mast: 0x9aa1a8, head: 0x5d646c, lamp: 0xe9eef0, concrete: 0xd8d4cb, roofTrim: 0x7c838a,
  wall: 0xc8cdd1, door: 0xb5bcc2, door2: 0xa5adb4, stripe2: 0x2f5f8a, sock: 0xff5a1a,
  '!amber': 0xffa21a, '!red': 0xff2a1a, '!blue': 0x3a6cff,
};

// ---- an airliner, a single-aisle twinjet: 38 m nose to tail, 34 m across the wings, the tail fin's top 11.8 m up. Grounded:
// its gear down on y = 0, nose (local +z) to its stand. Its livery: 'tail' (the fin, and the engines' cowls when 'engine' is
// given it), 'cheat' (a line along the windows). A freighter: 'window' painted 'white' (no windows)
export const airliner = once('airliner', () => {
  const b = builder(), R = 2.0, Y = 3.3;
  b.put(cyl(R, R, 27, 16, true).rotateX(Math.PI / 2), 'white', 0, Y, 1.5);                   // the fuselage, z -12 to 15
  b.put(new THREE.SphereGeometry(R, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), 'white', 0, Y, 15, 0, 0, 0, 1, 1, 1.75); // the nose
  const tail = b.put(cyl(0.45, R, 7.5, 16, true).rotateX(-Math.PI / 2), 'white', 0, Y, -15.75); // the tail cone, swept up
  { const p = tail.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < -12) p.setY(i, p.getY(i) + (-12 - z) * 0.2); } }
  b.put(box(2.4, 0.5, 0.9), 'window', 0, Y + 0.95, 16.9, -0.55);                             // the flight deck's windows
  for (const x of [-1, 1]) b.put(box(0.06, 0.32, 22), 'window', x * 1.99, Y + 0.55, 1.5);     // the cabin windows
  for (const x of [-1, 1]) b.put(box(0.06, 0.22, 26), 'cheat', x * 1.99, Y + 0.05, 1.5);       // the cheat line under them
  b.put(box(3.2, 1.0, 9), 'belly', 0, Y - 1.85, 0.4);                                          // the belly fairing at the wings
  for (const side of [-1, 1]) {
    const wing = [[0, 3.2], [16.6 * side, -4.6], [16.9 * side, -6.4], [0, -3.4]];
    b.put(planform(wing, 0.45), 'white', 0.9 * side, 1.95, 0, 0, 0, side * 0.08);              // the wings, swept, a little dihedral
    b.put(profile([[-6.0, 0], [-5.0, 0], [-5.9, 1.9], [-6.5, 1.9]], 0.12), 'tail', 17.6 * side, 3.3, 0);    // the winglets
    b.put(planform([[0, -13.4], [6.2 * side, -17.4], [6.3 * side, -18.6], [0, -17.6]], 0.3), 'white', 0.3 * side, 4.6, 0); // the tailplane
    const ex = 5.7 * side;
    b.put(cyl(0.98, 0.9, 3.8, 14).rotateX(Math.PI / 2), 'engine', ex, 1.25, 2.6);               // the engines under the wings
    b.put(cyl(0.82, 0.82, 0.12, 14).rotateX(Math.PI / 2), 'intake', ex, 1.25, 4.46);
    b.put(box(0.3, 0.9, 2.6), 'white', ex, 2.05, 1.6);                                           // ...and their pylons
    b.put(box(0.2, 1.7, 0.25), 'gear', 2.4 * side, 1.0, -1.2);                                   // the main gear: a leg, two wheels
    for (const dz of [-0.45, 0.45]) b.put(cyl(0.56, 0.56, 0.38, 10).rotateZ(Math.PI / 2), 'tyre', 2.4 * side + side * 0.24, 0.56, -1.2 + dz);
  }
  b.put(profile([[-13.2, 0], [-19.6, 0], [-21.0, 8.6], [-18.4, 8.6]], 0.36), 'tail', 0, 4.9, 0);   // the fin
  b.put(box(0.16, 1.6, 0.16), 'gear', 0, 0.95, 13.0);                                          // the nose gear
  for (const dx of [-0.2, 0.2]) b.put(cyl(0.36, 0.36, 0.22, 10).rotateZ(Math.PI / 2), 'tyre', dx, 0.36, 13.0);
  return b.done();
});
// how far an airliner reaches each way at scale 1: its tail (z), its nose, half its span
export const AIRLINER = { tail: -21.0, nose: 18.6, span: 17.6, door: 12.5, height: 13.5 };

// ---- ground equipment ----
// a baggage tractor: low, an open cab under a roof on four posts, a seat, a wheel, an amber beacon; 2.8 m long ('body' its paint)
export const tractor = once('tractor', () => {
  const b = builder();
  b.put(box(1.4, 0.35, 2.8), 'dark', 0, 0.45, 0);
  b.put(box(1.36, 0.55, 1.15), 'body', 0, 0.9, 0.78);
  b.put(box(1.36, 0.2, 1.4), 'body', 0, 0.72, -0.6);
  b.put(box(0.6, 0.18, 0.5), 'seat', 0, 0.95, -0.45);
  b.put(box(0.6, 0.6, 0.1), 'seat', 0, 1.3, -0.72);
  b.put(box(0.08, 0.65, 0.08), 'dark', 0, 1.3, 0.18, -0.4);
  b.put(cyl(0.2, 0.2, 0.04, 10), 'dark', 0, 1.62, 0.06, -0.9);
  for (const x of [-0.63, 0.63]) for (const z of [0.25, -1.1]) b.put(box(0.08, 1.3, 0.08), 'frame', x, 1.6, z);
  b.put(box(1.46, 0.08, 1.55), 'body', 0, 2.26, -0.43);
  b.put(box(0.18, 0.14, 0.18), '!amber', 0.4, 2.37, -0.8);
  b.put(box(0.2, 0.12, 0.45), 'dark', 0, 0.4, -1.55);
  for (const x of [-0.63, 0.63]) for (const z of [0.95, -0.95]) b.put(cyl(0.32, 0.32, 0.26, 10).rotateZ(Math.PI / 2), 'tyre', x, 0.32, z);
  return b.done();
});
// a covered baggage cart: a canopy on four posts over a deck of bags, a curtain down one side, a tow bar; 3 m long
export const dolly = once('dolly', () => {
  const b = builder();
  b.put(box(1.6, 0.14, 3.0), 'frame', 0, 0.52, 0);
  b.put(box(1.5, 0.05, 2.9), 'deck', 0, 0.62, 0);
  for (const x of [-0.68, 0.68]) for (const z of [-1.1, 1.1]) b.put(cyl(0.22, 0.22, 0.14, 8).rotateZ(Math.PI / 2), 'tyre', x, 0.22, z);
  for (const x of [-0.76, 0.76]) for (const z of [-1.43, 1.43]) b.put(box(0.07, 1.4, 0.07), 'frame', x, 1.34, z);
  b.put(box(1.68, 0.08, 3.06), 'roof', 0, 2.06, 0);
  b.put(box(0.03, 1.05, 2.8), 'curtain', 0.79, 1.45, 0);
  for (const [k, w, h, d, x, y, z] of [[0, 0.62, 0.42, 0.8, -0.35, 0.86, 0.95], [1, 0.55, 0.36, 0.7, 0.32, 0.83, 0.9], [2, 0.6, 0.5, 0.9, -0.32, 0.9, -0.05],
    [3, 0.5, 0.4, 0.75, 0.35, 0.85, -0.1], [1, 0.58, 0.45, 0.8, -0.3, 0.88, -1.0], [0, 0.5, 0.34, 0.6, 0.3, 0.82, -1.05], [2, 0.45, 0.32, 0.6, -0.2, 1.27, 0.9]]) {
    b.put(box(w, h, d), 'bag' + k, x, y, z);
  }
  b.put(box(0.08, 0.08, 1.1), 'frame', 0, 0.45, 2.0, 0.12);
  return b.done();
});
// a container dolly with one LD3 on it (the contoured box a wide-body's hold takes): 'uld' its aluminium, its door a curtain
export const uldDolly = once('uldDolly', () => {
  const b = builder();
  b.put(box(1.7, 0.14, 1.9), 'frame', 0, 0.52, 0);
  for (const x of [-0.7, 0.7]) for (const z of [-0.7, 0.7]) b.put(cyl(0.22, 0.22, 0.14, 8).rotateZ(Math.PI / 2), 'tyre', x, 0.22, z);
  b.put(slab([[-0.78, 0], [0.78, 0], [1.2, 0.55], [1.2, 1.62], [-0.78, 1.62]], 1.53), 'uld', -0.2, 0.6, -0.765);
  b.put(box(1.4, 1.45, 0.03), 'curtain', -0.05, 1.4, 0.78);
  b.put(box(0.08, 0.08, 1.0), 'frame', 0, 0.45, 1.4, 0.12);
  return b.done();
});
// a fuel bowser: a cab, the tank behind it on the chassis, a cabinet of hoses at the back, six wheels, a beacon; 9.4 m long
export const bowser = once('bowser', () => {
  const b = builder();
  b.put(box(2.3, 0.45, 9.0), 'dark', 0, 0.85, 0);
  b.put(box(2.45, 2.1, 2.0), 'cab', 0, 2.0, 3.6);
  b.put(box(2.25, 0.85, 0.06), 'glass', 0, 2.5, 4.61);
  b.put(box(2.47, 0.7, 1.1), 'glass', 0, 2.55, 3.85);
  b.put(box(2.45, 0.3, 0.15), 'dark', 0, 0.85, 4.6);
  b.put(cyl(1.15, 1.15, 6.2, 14).rotateX(Math.PI / 2), 'tank', 0, 2.3, -0.95, 0, 0, 0, 1.06, 1, 1);
  for (const x of [-1, 1]) b.put(box(0.06, 0.26, 6.0), 'stripe', x * 1.2, 2.05, -0.95);
  b.put(box(0.6, 0.06, 5.6), 'frame', 0, 3.5, -0.95);
  b.put(box(2.35, 1.35, 1.0), 'frame', 0, 1.65, -4.3);
  b.put(cyl(0.45, 0.45, 0.5, 12).rotateZ(Math.PI / 2), 'dark', 0, 2.6, -4.3);
  b.put(box(0.2, 0.14, 0.2), '!amber', 0, 3.12, 3.6);
  for (const x of [-1.05, 1.05]) for (const z of [3.3, -2.3, -3.4]) b.put(cyl(0.5, 0.5, 0.36, 10).rotateZ(Math.PI / 2), 'tyre', x, 0.5, z);
  return b.done();
});
// a stair truck: a small truck, its stairs climbing from the back over the cab to a platform under a canopy, rails both sides
// (no one on them); the platform 3.4 m up at the front, for a single-aisle's door
export const stairTruck = once('stairTruck', () => {
  const b = builder();
  b.put(box(2.2, 0.4, 6.4), 'dark', 0, 0.7, 0);
  b.put(box(2.2, 1.7, 1.5), 'cab', 0, 1.65, 2.5);
  b.put(box(2.0, 0.7, 0.06), 'glass', 0, 1.95, 3.26);
  for (const x of [-0.95, 0.95]) for (const z of [2.3, -2.2]) b.put(cyl(0.45, 0.45, 0.3, 10).rotateZ(Math.PI / 2), 'tyre', x, 0.45, z);
  const z0 = -3.0, y0 = 1.0, z1 = 1.7, y1 = 3.4, run = Math.hypot(z1 - z0, y1 - y0), tilt = -Math.atan2(y1 - y0, z1 - z0);
  for (const x of [-0.62, 0.62]) {
    b.put(box(0.1, 0.3, run), 'frame', x, (y0 + y1) / 2, (z0 + z1) / 2, tilt);
    b.put(box(0.06, 0.06, run), 'rail', x, (y0 + y1) / 2 + 0.95, (z0 + z1) / 2, tilt);
    for (let k = 0; k <= 3; k++) { const f = k / 3; b.put(box(0.05, 0.95, 0.05), 'rail', x, y0 + (y1 - y0) * f + 0.48, z0 + (z1 - z0) * f); }
  }
  for (let k = 0; k < 11; k++) { const f = (k + 0.5) / 11; b.put(box(1.2, 0.05, 0.32), 'deck', 0, y0 + (y1 - y0) * f, z0 + (z1 - z0) * f); }
  b.put(box(1.5, 0.1, 1.5), 'frame', 0, y1, 2.45);
  for (const x of [-0.72, 0.72]) {
    b.put(box(0.06, 0.06, 1.5), 'rail', x, y1 + 0.95, 2.45);
    b.put(box(0.07, 2.1, 0.07), 'frame', x, y1 + 1.05, 3.15);
    b.put(box(0.07, 2.1, 0.07), 'frame', x, y1 + 1.05, 1.75);
  }
  b.put(box(1.7, 0.07, 2.0), 'body', 0, y1 + 2.12, 2.4);
  b.put(box(0.04, 1.2, 1.5), 'body', 0.82, y1 + 1.5, 2.45);
  b.put(box(0.2, 0.14, 0.2), '!amber', 0.6, 2.58, 2.4);
  return b.done();
});
// a belt loader: a low chassis with a little cab at the back and a belt climbing to a hold door, rails along the belt; 8 m long
export const beltLoader = once('beltLoader', () => {
  const b = builder();
  b.put(box(1.8, 0.4, 7.0), 'dark', 0, 0.55, 0);
  b.put(box(1.2, 1.2, 1.3), 'body', 0.25, 1.35, -2.7);
  b.put(box(1.0, 0.5, 0.06), 'glass', 0.25, 1.65, -2.03);
  for (const x of [-0.85, 0.85]) for (const z of [2.4, -2.4]) b.put(cyl(0.36, 0.36, 0.26, 10).rotateZ(Math.PI / 2), 'tyre', x, 0.36, z);
  const z0 = -1.6, y0 = 1.0, z1 = 3.9, y1 = 2.9, run = Math.hypot(z1 - z0, y1 - y0), tilt = -Math.atan2(y1 - y0, z1 - z0);
  b.put(box(0.85, 0.16, run), 'dark', -0.3, (y0 + y1) / 2, (z0 + z1) / 2, tilt);
  for (const x of [-0.78, 0.18]) b.put(box(0.05, 0.3, run), 'body', x, (y0 + y1) / 2 + 0.25, (z0 + z1) / 2, tilt);
  b.put(box(0.2, 1.4, 0.2), 'frame', -0.3, 1.4, 2.2);
  return b.done();
});
// a pushback tug: long, low and wide, a cab hump at one end; 6 m long
export const pushback = once('pushback', () => {
  const b = builder();
  b.put(box(2.8, 1.0, 6.0), 'body', 0, 0.85, 0);
  b.put(box(1.7, 0.75, 1.7), 'body', 0.3, 1.72, -2.0);
  b.put(box(1.72, 0.42, 1.72), 'glass', 0.3, 1.86, -2.0);
  b.put(box(2.9, 0.35, 0.3), 'dark', 0, 0.6, 3.05);
  b.put(box(0.2, 0.14, 0.2), '!amber', 0.3, 2.17, -2.0);
  for (const x of [-1.25, 1.25]) for (const z of [1.9, -1.9]) b.put(cyl(0.5, 0.5, 0.42, 10).rotateZ(Math.PI / 2), 'tyre', x, 0.5, z);
  return b.done();
});
// an apron bus: low floored, wide, glass all along, doors down one side; 13 m long
export const apronBus = once('apronBus', () => {
  const b = builder();
  b.put(box(2.9, 2.3, 13), 'bus', 0, 1.55, 0);
  b.put(box(2.93, 1.25, 12.4), 'glass', 0, 1.95, 0);
  b.put(box(2.8, 0.2, 12.8), 'bus', 0, 2.78, 0);
  b.put(box(2.7, 1.1, 0.05), 'glass', 0, 1.9, 6.51);
  for (const z of [-3.5, 0.5, 4.5]) b.put(box(0.05, 2.0, 1.3), 'dark', 1.47, 1.4, z);
  b.put(box(2.94, 0.3, 13.04), 'stripe2', 0, 0.75, 0);
  for (const x of [-1.25, 1.25]) for (const z of [4.4, -4.6]) b.put(cyl(0.48, 0.48, 0.34, 10).rotateZ(Math.PI / 2), 'tyre', x, 0.45, z);
  return b.done();
});
// a traffic cone (orange, a white band, a square foot)
export const apronCone = once('apronCone', () => {
  const b = builder();
  b.put(box(0.42, 0.04, 0.42), 'cone', 0, 0.02, 0);
  b.put(cone(0.17, 0.72, 8), 'cone', 0, 0.4, 0);
  b.put(cyl(0.1, 0.125, 0.12, 8), 'band', 0, 0.48, 0);
  return b.done();
});
// a floodlight mast: a tapering pole 30 m up, a head frame with its lamps (unlit by day: light grey panels)
export const mast = once('mast', () => {
  const b = builder();
  b.put(cyl(0.32, 0.55, 30, 8), 'mast', 0, 15, 0);
  b.put(box(5.0, 2.2, 0.35), 'head', 0, 30.7, 0, -0.25);
  for (let k = 0; k < 4; k++) for (const y of [30.15, 31.2]) b.put(box(1.0, 0.75, 0.12), 'lamp', -1.8 + k * 1.2, y, 0.23, -0.25);
  b.put(box(0.8, 0.5, 0.8), 'head', 0, 0.25, 0);
  return b.done();
});
// a windsock on its mast (the car card's: the level's own are render/gambles.js's)
export const windsock = once('windsock', () => {
  const b = builder();
  b.put(cyl(0.06, 0.08, 4.2, 8), 'frame', 0, 2.1, 0);
  b.put(cyl(0.3, 0.3, 0.06, 10).rotateZ(Math.PI / 2), 'frame', 0, 4.1, 0.0);
  for (let k = 0; k < 5; k++) b.put(cyl(0.29 - (k + 1) * 0.035, 0.29 - k * 0.035, 0.42, 10).rotateZ(-Math.PI / 2), k % 2 ? 'band' : 'sock', 0.24 + k * 0.42, 4.02 - k * 0.04, 0);
  b.put(box(0.6, 0.06, 0.6), 'frame', 0, 0.03, 0);
  return b.done();
});
// the control tower: a concrete shaft on a low base block, a ring of balconies, the cab of glass leaning out under its roof,
// a mast with a radar dome and a red obstruction light; 64 m to the light
export const controlTower = once('controlTower', () => {
  const b = builder();
  b.put(box(16, 6, 14), 'wall', 0, 3, 0);
  b.put(box(16.2, 0.8, 14.2), 'roofTrim', 0, 6.2, 0);
  b.put(box(9, 1.2, 0.1), 'window', 0, 3.5, 7.03);
  b.put(cyl(3.0, 3.6, 40, 12), 'concrete', 0, 26, 0);
  b.put(cyl(0.9, 0.9, 40, 6), 'window', 0, 26, 2.75);
  b.put(cyl(4.4, 4.4, 1.0, 12), 'concrete', 0, 40, 0);
  b.put(cyl(5.8, 3.4, 3.6, 8), 'concrete', 0, 47.6, 0);
  b.put(cyl(6.5, 5.6, 4.8, 8), 'glass', 0, 51.8, 0);
  b.put(cyl(6.9, 6.9, 0.8, 8), 'roofTrim', 0, 54.6, 0);
  b.put(cyl(3.2, 4.8, 1.6, 8), 'concrete', 0, 55.8, 0);
  b.put(box(0.35, 7, 0.35), 'frame', 0, 60, 0);
  b.put(new THREE.SphereGeometry(1.3, 10, 6), 'white', 2.6, 58, 0);
  b.put(box(0.3, 1.6, 0.3), 'frame', 2.6, 56.8, 0);
  b.put(box(0.32, 0.32, 0.32), '!red', 0, 63.6, 0);
  return b.done();
});
// a hangar: walls, a curved roof, its doors to the front (+z), a coloured band over them, a lean-to at one side; 70 x 60 m, 25 m up
export const hangar = once('hangar', () => {
  const b = builder(), W = 70, D = 60, H = 16, RISE = 9;
  b.put(box(W, H, D), 'wall', 0, H / 2, 0);
  b.put(cyl(1, 1, 1, 18, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), 'roofTrim', 0, H, 0, 0, 0, 0, W / 2, RISE, D);
  b.put(new THREE.CircleGeometry(1, 18, 0, Math.PI), 'wall', 0, H, D / 2, 0, 0, 0, W / 2, RISE, 1);
  b.put(new THREE.CircleGeometry(1, 18, 0, Math.PI), 'wall', 0, H, -D / 2, 0, Math.PI, 0, W / 2, RISE, 1);
  for (let k = 0; k < 6; k++) b.put(box(W / 6 - 0.4, H - 2.2, 0.3), k % 2 ? 'door' : 'door2', -W / 2 + (k + 0.5) * W / 6, (H - 2.2) / 2, D / 2 + 0.15);
  b.put(box(W + 0.2, 1.4, 0.4), 'stripe2', 0, H - 0.6, D / 2 + 0.1);
  b.put(box(12, 7, D * 0.6), 'wall', W / 2 + 6, 3.5, -D * 0.1);
  b.put(box(3, 2.4, 0.2), 'window', W / 2 + 6, 3, -D * 0.1 + D * 0.3 + 0.05);
  return b.done();
});
// a unit box and a unit tube (1 m each way: scaled where they stand, one colour, 'c')
export const unitBox = once('unitBox', () => { const b = builder(); b.put(box(1, 1, 1), 'c'); return b.done(); });
export const unitTube = once('unitTube', () => { const b = builder(); b.put(cyl(0.5, 0.5, 1, 10), 'c'); return b.done(); });

// ---- the colours a template is baked in, as bytes (linear: as three.js reads vertex colours) ----
const bytes = new Map(), tint = new THREE.Color();
export const colourBytes = (hex) => {
  if (!bytes.has(hex)) { tint.set(hex); bytes.set(hex, [Math.round(tint.r * 255), Math.round(tint.g * 255), Math.round(tint.b * 255)]); }
  return bytes.get(hex);
};
// a template as a mesh (the car card: render/carstage.js merges its props by their vertex colours), in a palette of its own
export const templateMesh = (t, palette = {}) => {
  const geometry = new THREE.BufferGeometry(), col = new Float32Array(t.verts * 3);
  const per = t.names.map(name => { tint.set(palette[name] ?? COLOURS[name] ?? 0x888888); return [tint.r, tint.g, tint.b]; });
  for (let i = 0; i < t.verts; i++) col.set(per[t.key[i]], i * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(t.pos.slice(), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(t.nor.slice(), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geometry.setIndex(new THREE.BufferAttribute(t.index.slice(), 1));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })));
  return g;
};
