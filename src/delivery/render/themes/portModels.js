// ---- The container port's models: no game state. A gantry crane that stands over the road, its trolley running
// to and fro with a container on its ropes; a quay crane, boom out over the ship; a container ship; a straddle
// carrier and a reach stacker. Each returns a group facing local +z; one that moves has userData.animate(t).
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const part = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(BOX, material);
  mesh.scale.set(w, h, l);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const BOX = new THREE.BoxGeometry(1, 1, 1), WHEEL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12).rotateZ(Math.PI / 2);
// a container's colours, and its size (a forty-footer): m across, high and long
export const BOX_COLOURS = [0x9c3b2e, 0x1f5fa8, 0x2e7d4f, 0xe0722a, 0xd9b23a, 0x8f979e, 0x1a8a8a, 0xd8dde0, 0x6a2f4f];
export const BOX_SIZE = [2.44, 2.6, 12.2];
const container = (parent, k, x, y, z, along = true) => part(parent, lambert(BOX_COLOURS[k % BOX_COLOURS.length]), along ? BOX_SIZE[0] : BOX_SIZE[2], BOX_SIZE[1], along ? BOX_SIZE[2] : BOX_SIZE[0], x, y + BOX_SIZE[1] / 2, z);
const wheel = (parent, x, y, z, r = 0.8, w = 0.6) => { const tyre = new THREE.Mesh(WHEEL, lambert(0x1c1c1e)); tyre.scale.set(w, r * 2, r * 2); tyre.position.set(x, y, z); parent.add(tyre); return tyre; };

// a gantry crane over the road: a leg frame on wheels each side, `span` m apart, a pair of girders across at
// `height` m, and a trolley that runs along them with a container hung under it (never lower than `clear` m)
export const makeGantry = (span = 26, height = 19, k = 0, clear = 10) => {
  const g = new THREE.Group();
  const paint = lambert(0xf2b51c), dark = lambert(0x2f3338), white = lambert(0xe9ecef);
  for (const side of [-1, 1]) {
    const x = side * span / 2;
    for (const z of [-5, 5]) {
      part(g, paint, 0.9, height, 0.9, x, height / 2 + 0.8, z);          // a leg,
      for (const dz of [-1.1, 1.1]) wheel(g, x, 0.8, z + dz);              // its bogie
      part(g, dark, 1.1, 0.5, 3.4, x, 1.5, z);
    }
    part(g, paint, 0.7, 0.9, 10.9, x, height * 0.45, 0);                   // the ties between a side's legs
    part(g, paint, 0.7, 0.9, 10.9, x, 2.2, 0);
    const brace = part(g, paint, 0.4, 0.4, Math.hypot(10, height * 0.45 - 2.2), x, (height * 0.45 + 2.2) / 2, 0);
    brace.rotation.x = Math.atan2(height * 0.45 - 2.2, 10) * side;
  }
  for (const z of [-5, 5]) part(g, paint, span + 2.4, 1.5, 1.1, 0, height + 1.2, z); // the girders
  for (const side of [-1, 1]) part(g, paint, 1.1, 1.5, 11.1, side * (span / 2 + 0.6), height + 1.2, 0);
  part(g, white, 3, 2.4, 2.6, -span / 2 + 2.4, height - 1.2, 6.6);          // the driver's cab, under one end
  part(g, dark, 3.05, 1, 2.65, -span / 2 + 2.4, height - 0.9, 6.6);
  const trolley = new THREE.Group();
  part(trolley, dark, 3.6, 1, 11.4, 0, height + 2.4, 0);
  const drop = height + 1.6 - clear - BOX_SIZE[1] - 0.5;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(trolley, dark, 0.07, drop, 0.07, sx * 1, height + 1.9 - drop / 2, sz * 5.2); // its ropes
  part(trolley, paint, 2.6, 0.5, 12.4, 0, clear + BOX_SIZE[1] + 0.25, 0);   // the spreader,
  container(trolley, k, 0, clear, 0);                                      // and what hangs from it
  g.add(trolley);
  const reach = span / 2 - 3;
  g.userData.animate = (t) => { trolley.position.x = Math.sin(t * 0.22 + k * 1.7) * reach; };
  g.userData.animate(0);
  return g;
};

// a quay crane (ship to shore): a portal on four legs, a boom out over the water (local +x) and a shorter one
// back over the quay, a machinery house, stays up to an A-frame; some 70 m to the top
export const makeQuayCrane = (k = 0) => {
  const g = new THREE.Group();
  const paint = lambert([0xc9302c, 0x1f5fa8, 0xe0722a][k % 3]), white = lambert(0xe9ecef), dark = lambert(0x2f3338);
  const H = 40;
  for (const x of [-8, 8]) for (const z of [-11, 11]) {
    part(g, paint, 1.4, H, 1.4, x, H / 2 + 1.2, z);
    part(g, dark, 1.8, 1.2, 5, x, 0.9, z);
  }
  for (const x of [-8, 8]) { part(g, paint, 1.1, 1.3, 22, x, 13, 0); part(g, paint, 1.1, 1.3, 22, x, H, 0); }
  for (const z of [-11, 11]) { part(g, paint, 16, 1.3, 1.1, 0, 13, z); part(g, paint, 16, 1.3, 1.1, 0, H, z); }
  for (const z of [-11, 11]) { const brace = part(g, paint, 0.7, Math.hypot(16, H - 13), 0.7, 0, (H + 13) / 2, z); brace.rotation.z = Math.atan2(16, H - 13) * (z > 0 ? 1 : -1); }
  for (const z of [-3.2, 3.2]) part(g, paint, 92, 1.6, 1, 16, H + 2, z);   // the boom: 62 m out over the ship, 30 back
  for (let x = -28; x <= 60; x += 8) part(g, paint, 0.6, 0.6, 7.4, x, H + 2, 0);
  part(g, white, 14, 6, 9, -17, H + 6, 0);                                  // the machinery house
  part(g, paint, 1.2, 26, 1.2, 4, H + 15, 0);                               // the A-frame, and the stays from its top
  for (const [x, y] of [[58, H + 2.5], [28, H + 2.5], [-28, H + 2.5]]) {
    const stay = part(g, dark, 0.3, Math.hypot(x - 4, H + 28 - y), 0.3, (x + 4) / 2, (H + 28 + y) / 2, 0);
    stay.rotation.z = Math.atan2(x - 4, H + 28 - y);
  }
  const trolley = new THREE.Group();
  part(trolley, white, 4, 2.6, 5, 0, H - 0.4, 0);
  for (const sz of [-1, 1]) part(trolley, dark, 0.08, 14, 0.08, 0, H - 8.5, sz * 2);
  container(trolley, k + 3, 0, H - 18.5, 0, false);
  g.add(trolley);
  g.userData.animate = (t) => { trolley.position.x = 20 + Math.sin(t * 0.17 + k * 2.1) * 30; };
  g.userData.animate(0);
  return g;
};

// a container ship lying along local z, `length` m long: a dark hull with a red boot-top, containers on deck in
// bays up to five high, the white house and the funnel aft
export const makeShip = (length = 210, k = 0) => {
  const g = new THREE.Group();
  const hullMat = lambert([0x1d2f4f, 0x232528, 0x7a2a26, 0x2f5a4a][k % 4]), red = lambert(0x9a2a22), white = lambert(0xeef0f2), dark = lambert(0x2a2d33), funnel = lambert([0xe0722a, 0x1f5fa8, 0xd9b23a, 0xc9302c][k % 4]);
  const W = 30, D = 13;
  part(g, red, W - 0.6, 3, length - 4, 0, -0.2, 0);
  part(g, hullMat, W, D - 2, length - 22, 0, D / 2 + 0.2, -3);
  const bow = part(g, hullMat, W * 0.72, D - 2, 30, 0, D / 2 + 0.2, length / 2 - 12);  // the bow: narrower, and a point on it
  bow.rotation.y = 0;
  const stem = part(g, hullMat, W * 0.5, D - 2, W * 0.5, 0, D / 2 + 0.2, length / 2 - 2);
  stem.rotation.y = Math.PI / 4;
  part(g, white, W - 4, 20, 13, 0, D + 10, -length / 2 + 26);                            // the house,
  part(g, dark, W - 3.8, 1.6, 13.2, 0, D + 17.5, -length / 2 + 26);                      // its bridge windows,
  part(g, white, W + 4, 1, 6, 0, D + 19, -length / 2 + 26);                              // the bridge wings
  part(g, funnel, 5, 9, 7, 0, D + 24, -length / 2 + 18);
  part(g, dark, 5.2, 1.6, 7.2, 0, D + 28, -length / 2 + 18);
  // the boxes on deck: one InstancedMesh a colour
  let seed = 31 + k * 977;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lists = BOX_COLOURS.map(() => []), m = new THREE.Matrix4();
  for (let z = -length / 2 + 38; z < length / 2 - 34; z += BOX_SIZE[2] + 0.9) {
    const tiers = 2 + Math.floor(rand() * 4);
    for (let x = -W / 2 + 2.2; x < W / 2 - 1.5; x += BOX_SIZE[0] + 0.12) {
      const n = Math.max(1, tiers - (rand() < 0.25 ? 1 : 0));
      for (let y = 0; y < n; y++) lists[Math.floor(rand() * BOX_COLOURS.length)].push([x, D + 0.2 + (y + 0.5) * BOX_SIZE[1], z]);
    }
  }
  lists.forEach((list, i) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(BOX, lambert(BOX_COLOURS[i]), list.length);
    list.forEach(([x, y, z], j) => { m.makeScale(BOX_SIZE[0], BOX_SIZE[1], BOX_SIZE[2]).setPosition(x, y, z); mesh.setMatrixAt(j, m); });
    g.add(mesh);
  });
  return g;
};

// a straddle carrier: four tall legs on wheels astride a container, a frame across the top, the cab up at one
// corner; it carries its box along local z
export const makeStraddle = (k = 0, loaded = true) => {
  const g = new THREE.Group();
  const paint = lambert([0xf2b51c, 0xe0722a, 0xd8262b][k % 3]), dark = lambert(0x2f3338), glass = lambert(0x35576a);
  for (const x of [-2.2, 2.2]) {
    for (const z of [-4.2, 4.2]) part(g, paint, 0.7, 9.4, 0.7, x, 5.5, z);
    part(g, paint, 0.8, 1, 10.4, x, 1.6, 0);
    part(g, paint, 0.6, 0.8, 9.6, x, 10.4, 0);
    for (const z of [-4.2, -1.4, 1.4, 4.2]) wheel(g, x, 0.75, z, 0.75, 0.7);
  }
  for (const z of [-4.2, 4.2]) part(g, paint, 5.1, 0.8, 0.7, 0, 10.4, z);
  part(g, dark, 3.4, 1, 6, 0, 10.6, 0);                       // the engine deck
  part(g, paint, 1.6, 2, 2, 2.2, 9.2, 5.6);                    // the cab, hung off the front corner
  part(g, glass, 1.65, 0.9, 2.05, 2.2, 9.5, 5.6);
  if (loaded) {
    container(g, k + 2, 0, 2.6, 0);
    part(g, dark, 2.6, 0.4, 12.3, 0, 5.4, 0);                  // its spreader
    for (const z of [-4, 4]) part(g, dark, 0.12, 4.6, 0.12, 0, 7.9, z);
  }
  return g;
};

// a reach stacker: a heavy truck, a boom up from the back of it over the cab, a container held out in front
export const makeStacker = (k = 0) => {
  const g = new THREE.Group();
  const paint = lambert([0xd8262b, 0xf2b51c, 0x1f5fa8][k % 3]), dark = lambert(0x2f3338), glass = lambert(0x35576a);
  part(g, paint, 3.6, 1.6, 8, 0, 1.9, -1);
  part(g, dark, 3.8, 1.2, 2.4, 0, 2, -5.6);                    // the counterweight
  part(g, paint, 1.8, 2, 2.2, 0, 3.7, -1.6);                   // the cab
  part(g, glass, 1.85, 1, 2.25, 0, 4, -1.6);
  for (const x of [-1.9, 1.9]) { wheel(g, x, 1, 2, 1, 0.9); wheel(g, x, 0.9, -4, 0.9, 0.7); }
  const boom = part(g, paint, 1, 1, 12, 0, 7, 0.4);
  boom.rotation.x = -0.62;
  part(g, dark, 0.5, 2.2, 0.5, 0, 9.3, 5);
  part(g, dark, 12.4, 0.4, 2.6, 0, 8.1, 5);                    // the spreader, across,
  container(g, k + 5, 0, 5.3, 5, false);                       // and its box
  return g;
};
