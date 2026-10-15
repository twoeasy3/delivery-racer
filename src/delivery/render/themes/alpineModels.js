// ---- The alpine pass's models (see alpine.js): no game state, so the gimmicks page and the cargo page can show them too.
// The theme's four plain obstacles (registered in ../obstacleModels.js): two cheese wheels on a pallet for a crate, a woodpile
// for a bale, a milk churn for a cone, a cut block of snow with two snow poles in it for a barrier; its two cargo items (a wheel
// of mountain cheese for Good, a suspicious fondue for Evil: registered in ../cargoModels.js); and the lift chair and the
// gondola cabin the scenery hangs on its cables (empty, both). Each model faces local +z, its feet on y = 0.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const put = (group, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// parts [geometry, colour, x, y, z, rx, ry, rz, sx, sy, sz] merged into one geometry with their colours as vertex colours
export const mergeParts = (parts) => {
  const pos = [], nor = [], col = [], m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), w = new THREE.Vector3();
  for (const [geometry, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1] of parts) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(m.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), w.set(sx, sy, sz)));
    c.set(color);
    if (c.r > 0.72 && c.g > 0.76 && c.b > 0.8) c.multiplyScalar(1.25); // (snow: a little over white, so it is white in shade too)
    for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b);
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
};
// (the dark patch under an obstacle, as obstacleModels.js has it)
const grounded = (group, r) => {
  const shade = put(group, new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};
// ONE mesh an obstacle (its parts merged, their colours as vertex colours) and the dark patch under it: two draw calls
const solid = (parts, r) => {
  const group = new THREE.Group();
  put(group, mergeParts(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  return grounded(group, r);
};

// ---- the obstacles --------------------------------------------------------------------------------------------
const RIND = 0xe8a92c, CHEESE = 0xf6d36a, PALLET = 0x6b4a2e, BARK = 0x5a3c24, CUT = 0xdcbc8a, SNOW = 0xf4f8fc, POLE_RED = 0xd8262b, POLE_WHITE = 0xf6f6f2;

// a crate's stand-in: two great wheels of mountain cheese, golden rinds, stacked on a dark wooden pallet, a red maker's band round
// the top one; a crate's box (1.2 m square, 1.1 m tall)
const cheeseWheels = () => {
  const parts = [[box(1.2, 0.14, 1.2), PALLET, 0, 0.07, 0]];
  for (const x of [-0.45, 0, 0.45]) parts.push([box(0.16, 0.08, 1.22), 0x4a321e, x, 0.02, 0]);
  // three flat wheels stacked askew, each a golden rind with a pale face and a dark groove round its middle, a red band on the top one
  [[0.14, 0, 0, 0.6], [0.44, 0.07, -0.05, 0.57], [0.74, -0.06, 0.04, 0.54]].forEach(([y, x, z, R], k) => {
    parts.push([cyl(R, R, 0.28, 22), RIND, x, y + 0.14, z]);
    parts.push([cyl(R - 0.05, R - 0.05, 0.012, 22), CHEESE, x, y + 0.286, z]);           // the paler face on top
    parts.push([cyl(R + 0.01, R + 0.01, 0.04, 22), 0xa86a18, x, y + 0.14, z]);           // the groove round its middle
    if (k === 2) parts.push([cyl(R + 0.014, R + 0.014, 0.08, 22), POLE_RED, x, y + 0.2, z]); // the maker's band
  });
  return solid(parts, 0.95);
};

// a bale's stand-in: a woodpile, split logs stacked in a block 2.2 m across and 1.4 m tall, their pale cut ends to the road, a cap of
// snow along the top; a bale's box
const woodpile = () => {
  const parts = [], R = 0.17;
  for (let row = 0; row < 4; row++) {
    for (let k = 0; k < 6; k++) {
      const x = -0.92 + k * 0.37 + (row % 2 ? 0.18 : 0), y = 0.18 + row * 0.33;
      if (x > 0.95) continue;
      const r = R * (0.9 + ((k * 7 + row * 3) % 5) * 0.04);
      parts.push([cyl(r, r, 2.1, 7).rotateX(Math.PI / 2), BARK, x, y, 0]);
      for (const z of [-1.051, 1.051]) parts.push([new THREE.CircleGeometry(r * 0.92, 7), CUT, x, y, z, 0, z > 0 ? 0 : Math.PI, 0]); // (the cut ends)
    }
  }
  parts.push([box(2.2, 0.12, 2.2), 0x4a321e, 0, 0.0, 0]);
  parts.push([box(2.05, 0.16, 2.0), SNOW, 0, 1.42, 0], [box(1.6, 0.1, 1.7), SNOW, 0.1, 1.53, 0]);
  return solid(parts, 1.5);
};

// a cone's stand-in: a milk churn, aluminium with a red painted band and a red lid knob, 1.4 times life size as the cones are
const milkChurn = () => {
  const profile = [[0.0, 0], [0.32, 0], [0.34, 0.04], [0.34, 0.72], [0.3, 0.8], [0.18, 0.9], [0.17, 1.0], [0.21, 1.02], [0.21, 1.06], [0, 1.06]];
  const parts = [[new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 14), 0xc9d0d6, 0, 0, 0]];
  parts.push([cyl(0.345, 0.345, 0.16, 14), POLE_RED, 0, 0.5, 0]);
  parts.push([cyl(0.345, 0.345, 0.05, 14), 0x8a949c, 0, 0.18, 0]);
  parts.push([cyl(0.06, 0.06, 0.08, 8), POLE_RED, 0, 1.1, 0]);
  for (const x of [-1, 1]) parts.push([new THREE.TorusGeometry(0.07, 0.02, 5, 8, Math.PI), 0x8a949c, x * 0.25, 0.86, 0, 0, x * Math.PI / 2, 0]); // the handles
  return solid(parts, 0.55);
};

// a barrier's stand-in: a block of packed snow cut square by the plough, two red-and-white snow poles stuck in it and an orange
// flag on one; a barrier's box (2.4 m across, 1.2 deep, 1.2 tall)
const snowBlock = () => {
  const parts = [[box(2.4, 0.95, 1.2), SNOW, 0, 0.475, 0], [new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xffffff, 0, 0.92, 0, 0, 0, 0, 1.2, 0.3, 0.6], // (its rounded cap)
    [box(2.42, 0.1, 1.22), 0xc6d6e4, 0, 0.05, 0], [box(2.41, 0.05, 1.21), 0xd4e2ee, 0, 0.5, 0]]; // (the plough's cut: a bluish line)
  for (const x of [-0.85, 0.85]) {
    for (let k = 0; k < 6; k++) parts.push([cyl(0.05, 0.05, 0.3, 6), k % 2 ? POLE_WHITE : POLE_RED, x, 1.15 + k * 0.3, 0.2]);
  }
  parts.push([box(0.03, 0.42, 0.62), 0xff7a12, -0.85, 2.72, 0.52]);
  return solid(parts, 1.4);
};

export const ALPINE_OBSTACLES = { cheeseWheels, woodpile, milkChurn, snowBlock };

// ---- the lift chair and the gondola cabin: one geometry each, its colours in it (the scenery instances them along a cable).
// Hung from y = 0 (the cable), facing +z. Empty: a seat, a back and a safety bar up; nobody in either
export const chairGeometry = () => {
  const STEEL = 0x50565e, SEAT = 0x2f6fb3;
  return mergeParts([
    [box(0.08, 2.1, 0.08), STEEL, 0, -1.05, -0.05],            // the hanger
    [box(0.08, 0.08, 0.5), STEEL, 0, -0.04, 0.1],              // the grip
    [box(1.5, 0.08, 0.08), STEEL, 0, -2.05, -0.05],            // the yoke
    [box(1.5, 0.1, 0.55), SEAT, 0, -2.4, 0.22],                 // the seat
    [box(1.5, 0.55, 0.08), SEAT, 0, -2.1, -0.05],               // the back
    [box(0.08, 0.45, 0.08), STEEL, -0.72, -2.25, 0.2], [box(0.08, 0.45, 0.08), STEEL, 0.72, -2.25, 0.2],
    [box(1.5, 0.05, 0.05), 0x9aa2aa, 0, -1.5, 0.45],            // the safety bar, up
  ]);
};
export const cabinGeometry = () => {
  const RED = 0xd23a2c, GLASS = 0x2a3a48, STEEL = 0x50565e;
  return mergeParts([
    [box(0.12, 2.6, 0.12), STEEL, 0, -1.3, 0],                  // the hanger
    [box(1.2, 0.3, 0.6), STEEL, 0, -0.1, 0],                    // the grip
    [box(2.2, 2.0, 2.0), RED, 0, -3.6, 0],                       // the cabin
    [box(2.24, 0.8, 1.6), GLASS, 0, -3.2, 0], [box(1.6, 0.8, 2.04), GLASS, 0, -3.2, 0], // the windows all round
    [box(2.0, 0.2, 1.8), 0xe8e8e2, 0, -2.5, 0],                  // the roof
  ]);
};

// ---- the cargo ------------------------------------------------------------------------------------------------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// a wheel of mountain cheese (Good): a great golden wheel on a wooden board, a wedge cut out of it and lying beside it, the knife
// stuck in; it turns slowly on the board
const makeCheeseWheel = () => {
  const group = new THREE.Group(), all = sub(group);
  put(all, box(0.9, 0.06, 0.9), lambert(0x8a5a32), 0, 0.03, 0);
  const R = 0.38, H = 0.24, gap = 0.6; // (the wedge cut out: gap radians)
  const wheel = sub(all, 0, 0.06, 0);
  put(wheel, new THREE.CylinderGeometry(R, R, H, 24, 1, false, gap / 2, Math.PI * 2 - gap), lambert(RIND), 0, H / 2, 0);
  for (const a of [gap / 2, -gap / 2]) { // (the two cut faces)
    const face = put(wheel, new THREE.PlaneGeometry(R, H), lambert(CHEESE, { side: THREE.DoubleSide }), Math.sin(a) * R / 2, H / 2, Math.cos(a) * R / 2);
    face.rotation.y = a + Math.PI / 2;
  }
  const holes = lambert(0xd9ac3a);
  for (const [x, y, z] of [[0.05, 0.1, 0.2], [-0.04, 0.17, 0.25], [0.02, 0.06, 0.3]]) put(wheel, new THREE.SphereGeometry(0.025, 6, 4), holes, x, y, z);
  const wedge = put(all, new THREE.CylinderGeometry(R, R, H, 6, 1, false, 0, gap), lambert(CHEESE), 0.12, 0.06 + H / 2, 0.42);
  wedge.rotation.y = 2.3;
  const knife = sub(all, -0.08, 0.06 + H, 0.15);
  put(knife, box(0.03, 0.18, 0.12), lambert(0xd8dde2), 0, -0.02, 0);
  put(knife, box(0.04, 0.16, 0.05), lambert(0x3a2a1a), 0, 0.13, 0);
  knife.rotation.z = 0.25;
  group.userData.animate = (t) => { wheel.rotation.y = Math.sin(t * 0.4) * 0.15; all.rotation.y = Math.sin(t * 0.25) * 0.05; };
  group.userData.animate(0);
  return group;
};

// a suspicious fondue (Evil): a copper caldron on its stand over a burner, its lid on, a fork in it, a cheese of no known kind inside.
// Simmering: a lazy bubble now and then; bubbling: the lid rattles and bubbles come up green; boiling over: the lid hops off its
// rim, the flame roars, the cheese wells up over the side in glowing drips
const makeFondue = () => {
  const group = new THREE.Group(), all = sub(group);
  const copper = lambert(0xb8653a), iron = lambert(0x2c2c30), cheeseMat = lambert(0xe8d24a, { emissive: 0x000000 }), flame = glow(0x4f8cff, { transparent: true, opacity: 0.85 });
  put(all, cyl(0.3, 0.34, 0.04, 16), iron, 0, 0.02, 0);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const leg = put(all, box(0.04, 0.34, 0.04), iron, Math.sin(a) * 0.24, 0.2, Math.cos(a) * 0.24); leg.rotation.z = Math.cos(a) * 0.08; }
  put(all, new THREE.TorusGeometry(0.25, 0.02, 6, 18), iron, 0, 0.36, 0).rotation.x = Math.PI / 2;
  put(all, cyl(0.07, 0.07, 0.06, 10), lambert(0x9aa0a6), 0, 0.08, 0); // the burner
  const fire = put(all, new THREE.ConeGeometry(0.08, 0.18, 8), flame, 0, 0.2, 0);
  const pot = sub(all, 0, 0.36, 0);
  put(pot, new THREE.LatheGeometry([[0.0, 0], [0.16, 0], [0.24, 0.06], [0.27, 0.16], [0.26, 0.26], [0.27, 0.28], [0.25, 0.28], [0.24, 0.26], [0.25, 0.16], [0.22, 0.08], [0.14, 0.03], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y)), 18), copper);
  put(pot, box(0.36, 0.03, 0.05), lambert(0x3a2a1a), 0.42, 0.22, 0); // the handle
  put(pot, box(0.2, 0.02, 0.03), copper, 0.27, 0.22, 0);
  const surface = put(pot, cyl(0.245, 0.245, 0.02, 18), cheeseMat, 0, 0.24, 0);
  const lid = sub(pot, 0, 0.285, 0);
  put(lid, new THREE.SphereGeometry(0.265, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), copper).scale.y = 0.55;
  put(lid, new THREE.SphereGeometry(0.035, 8, 6), lambert(0x3a2a1a), 0, 0.13, 0);
  const fork = sub(pot, -0.1, 0.25, 0.05);
  put(fork, cyl(0.008, 0.008, 0.5, 5), lambert(0xd8dde2), 0, 0.2, 0);
  put(fork, cyl(0.016, 0.016, 0.1, 6), lambert(0x2f6fb3), 0, 0.42, 0);
  fork.rotation.z = 0.5;
  const bubbles = [0, 1, 2, 3].map((k) => { const b = put(pot, new THREE.SphereGeometry(0.04, 8, 6), cheeseMat, Math.sin(k * 2.4) * 0.12, 0.26, Math.cos(k * 2.4) * 0.12); b.userData.k = k; return b; });
  const drips = [0, 1, 2, 3, 4].map((k) => { const a = k / 5 * Math.PI * 2 + 0.3, d = put(pot, cyl(0.035, 0.05, 0.2, 7), cheeseMat, Math.sin(a) * 0.265, 0.18, Math.cos(a) * 0.265); return d; });
  // (the states, eased: the weights a and f, agitated and furious, as the other Evil items have them: cargoModels.js stated())
  const w = [1, 0, 0];
  let target = 0, last = null;
  group.userData.state = 0;
  group.userData.setState = (state, snap = false) => {
    target = Math.max(0, Math.min(2, Math.round(state) || 0));
    group.userData.state = target;
    if (snap) for (let i = 0; i < 3; i++) w[i] = i === target ? 1 : 0;
  };
  const sick = new THREE.Color(0x9ad23a), gold = new THREE.Color(0xe8d24a);
  group.userData.animate = (t) => {
    const dt = last === null ? 0 : Math.min(0.1, Math.abs(t - last));
    last = t;
    for (let i = 0; i < 3; i++) w[i] += Math.max(-dt / 0.5, Math.min(dt / 0.5, (i === target ? 1 : 0) - w[i]));
    const a = w[1], f = w[2];
    cheeseMat.color.copy(gold).lerp(sick, clamp01(a * 0.5 + f * 0.8));
    cheeseMat.emissive.setRGB(f * 0.25, f * 0.22, 0);
    surface.position.y = 0.24 + f * 0.03;
    bubbles.forEach((b) => {
      const k = b.userData.k, u = (t * (0.6 + a * 1.2 + f * 2.2) + k * 0.27) % 1;
      b.scale.setScalar(0.4 + u * (0.6 + a + f * 1.5));
      b.position.y = 0.25 + u * (0.02 + f * 0.08);
      b.visible = u < 0.9;
    });
    const hop = Math.pow(Math.max(0, Math.sin(t * (9 + f * 8))), 3);
    lid.position.y = 0.285 + hop * (a * 0.02 + f * 0.11);
    lid.rotation.z = Math.sin(t * 13) * (a * 0.04 + f * 0.25);
    lid.rotation.x = Math.sin(t * 11) * f * 0.2;
    drips.forEach((d, k) => { const u = (t * 0.7 + k * 0.21) % 1; d.visible = f > 0.3; d.scale.set(1, 0.4 + u * f * 1.4, 1); d.position.y = 0.26 - u * f * 0.14; });
    fire.scale.set(1 + f * 0.6, 1 + a * 0.5 + f * 1.4 + Math.sin(t * 30) * 0.15 * (a + f), 1 + f * 0.6);
    all.position.x = Math.sin(t * 37) * 0.006 * f;
    all.rotation.z = Math.sin(t * 29) * 0.03 * f;
  };
  group.userData.animate(0);
  return group;
};

export const ALPINE_CARGO = { cheesewheel: makeCheeseWheel, fondue: makeFondue };
