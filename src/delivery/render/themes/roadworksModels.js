// ---- The roadworks' own plain obstacles (the Roadworks theme, themes.js: registered in ../obstacleModels.js). Each is the kind it
// stands in for in another shape, its box and its cost (config.js obstacleKinds, collision.js SIZE): a pair of water-filled barrier
// blocks for a barrier, a cable drum for a crate, a heap of sand for a bale; and, named outright by a level, a traffic drum (a cone),
// a pallet of pipes (a crate) and a works sign on its frame (a sign). Tall, bright, a dark patch under each, so it reads on the grey
// road from the chase camera. Each faces local +z, its feet on y = 0. No game state.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const put = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const grounded = (group, w, d) => { // (the dark patch under it)
  const shade = put(group, new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};
const RED = lambert(0xd8262b), WHITE = lambert(0xf2f2f2), ORANGE = lambert(0xff6a00), BLACK = lambert(0x1b1d22), WOOD = lambert(0xa8783e),
  DARKWOOD = lambert(0x6b4a2b), SAND = lambert(0xd9b36a), SANDDARK = lambert(0xb8914e), STEEL = lambert(0x8a9096), AMBER = new THREE.MeshBasicMaterial({ color: 0xffa21a });
for (const m of [RED, WHITE, ORANGE, BLACK, WOOD, DARKWOOD, SAND, SANDDARK, STEEL, AMBER]) m.userData.shared = true;

// the works sign's face: a red warning triangle, a shovel in a heap (no figure), ROAD WORKS under it (128 x 128, made once)
let face = null;
const signFace = () => {
  if (face) return face;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#d8262b'; c.beginPath(); c.moveTo(64, 6); c.lineTo(122, 98); c.lineTo(6, 98); c.closePath(); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(64, 26); c.lineTo(104, 90); c.lineTo(24, 90); c.closePath(); c.fill();
  c.fillStyle = '#1b1d22'; c.fillRect(44, 74, 40, 6); c.beginPath(); c.arc(64, 70, 12, Math.PI, 0); c.fill(); c.fillRect(70, 42, 4, 30);
  c.font = 'bold 17px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ROAD WORKS', 64, 114);
  face = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide });
  face.userData.shared = true;
  face.map.userData.shared = true;
  return face;
};

export const ROADWORKS_OBSTACLES = {
  // a barrier: two water-filled barrier blocks side by side across the lane, red and white, an amber lamp on top
  barrierBlock: (o) => {
    const g = new THREE.Group(), w = o.hw - 0.02, h = Math.min(1.1, o.height);
    [-1, 1].forEach((side, k) => {
      put(g, box(w, h * 0.78, o.hl * 1.6), k ? WHITE : RED, side * w / 2, h * 0.39, 0);
      put(g, box(w * 0.9, h * 0.22, o.hl * 1.1), k ? WHITE : RED, side * w / 2, h * 0.89, 0); // (its narrower top)
      put(g, box(w + 0.01, 0.1, o.hl * 1.62), k ? RED : WHITE, side * w / 2, h * 0.55, 0);     // (a band of the other colour)
    });
    put(g, box(0.16, 0.16, 0.16), AMBER, 0, h + 0.12, 0);
    put(g, box(0.05, 0.1, 0.05), BLACK, 0, h + 0.02, 0);
    return grounded(g, o.hw * 2 + 0.2, o.hl * 2);
  },
  // a crate: a cable drum on its side, its axle across the road: wooden ends, black cable wound round it
  cableReel: (o) => {
    const g = new THREE.Group(), r = o.height / 2;
    for (const side of [-1, 1]) put(g, cyl(r, r, 0.12, 18), WOOD, side * (o.hw - 0.08), r, 0, 0, 0, Math.PI / 2);
    put(g, cyl(r * 0.78, r * 0.78, o.hw * 2 - 0.26, 18), BLACK, 0, r, 0, 0, 0, Math.PI / 2);
    put(g, cyl(0.1, 0.1, o.hw * 2 + 0.04, 8), DARKWOOD, 0, r, 0, 0, 0, Math.PI / 2);
    for (const side of [-1, 1]) put(g, box(0.06, 0.08, r * 1.6), DARKWOOD, side * (o.hw - 0.01), r, 0); // (a batten across each end)
    return grounded(g, o.hw * 2 + 0.2, o.hl * 2);
  },
  // a bale: a heap of sand, a spade stuck in it
  sandPile: (o) => {
    const g = new THREE.Group(), r = o.hw + 0.05;
    put(g, cyl(0.25, r, o.height * 0.82, 14), SAND, 0, o.height * 0.41, 0);
    put(g, new THREE.SphereGeometry(0.42, 10, 8), SAND, 0, o.height * 0.82, 0);
    put(g, cyl(r * 0.55, r * 0.8, 0.35, 12), SANDDARK, r * 0.45, 0.17, r * 0.35);
    put(g, cyl(0.03, 0.03, 1.0, 6), DARKWOOD, 0.25, o.height * 0.95, 0.1, 0.3, 0, -0.35); // the spade's handle
    put(g, box(0.22, 0.28, 0.03), STEEL, 0.08, o.height * 0.62, 0.05, 0.3, 0, -0.35);     // its blade
    return grounded(g, r * 2.2, r * 2.2);
  },
  // a cone: a traffic drum, orange, two white bands, a black weighted base
  trafficDrum: (o) => {
    const g = new THREE.Group(), r = o.hw * 0.86, h = o.height;
    put(g, cyl(o.hw, o.hw, 0.1, 16), BLACK, 0, 0.05, 0);
    put(g, cyl(r, r, h - 0.1, 16), ORANGE, 0, 0.1 + (h - 0.1) / 2, 0);
    for (const y of [0.4, 0.72]) put(g, cyl(r + 0.012, r + 0.012, 0.13, 16), WHITE, 0, y * h + 0.05, 0); // (round the outside: never through it)
    put(g, cyl(r * 0.6, r * 0.9, 0.06, 16), BLACK, 0, h + 0.02, 0);
    return grounded(g, o.hw * 2.4, o.hw * 2.4);
  },
  // a crate: a pallet of plastic pipes, stacked three, two, one and strapped
  pipePallet: (o) => {
    const g = new THREE.Group(), w = o.hw * 2, l = o.hl * 2;
    put(g, box(w, 0.14, l), WOOD, 0, 0.07, 0);
    for (const x of [-w / 2 + 0.06, 0, w / 2 - 0.06]) put(g, box(0.1, 0.1, l), DARKWOOD, x, 0.05, 0);
    const r = (o.height - 0.14) / 5.2, PIPE = lambert(0xe86a1a), BLUE = lambert(0x2a6fd0);
    const rows = [[-2, 0, 2], [-1, 1], [0]];
    rows.forEach((row, k) => row.forEach((c) => put(g, cyl(r, r, w + 0.1, 12), k === 1 ? BLUE : PIPE, 0, 0.14 + r + k * r * 1.75, c * r * 1.02, 0, 0, Math.PI / 2))); // (lying across, stacked along)
    put(g, box(w + 0.02, 0.04, 0.06), BLACK, 0, o.height - 0.05, 0); // (the strap)
    return grounded(g, w + 0.2, l + 0.2);
  },
  // a sign: a portable works sign on its folding steel frame, sandbags on its feet
  worksSign: (o) => {
    const g = new THREE.Group(), w = Math.min(1.7, o.hw * 1.5);
    for (const side of [-1, 1]) {
      put(g, box(0.06, 2.2, 0.06), STEEL, side * w * 0.42, 1.1, 0);
      put(g, box(0.05, 1.4, 0.05), STEEL, side * w * 0.42, 0.6, 0.35, -0.55, 0, 0); // (the back leg)
      put(g, box(0.45, 0.18, 0.3), SANDDARK, side * w * 0.42, 0.09, 0.1);            // (a sandbag)
    }
    put(g, box(w + 0.08, w + 0.08, 0.04), STEEL, 0, 1.35 + w / 2, 0);
    put(g, new THREE.PlaneGeometry(w, w), signFace(), 0, 1.35 + w / 2, -0.03, 0, Math.PI, 0); // (its face at local -z: at traffic coming up to it)
    put(g, new THREE.PlaneGeometry(w, w), signFace(), 0, 1.35 + w / 2, 0.03); // (and the same on its back: a sign that folds both ways)
    return grounded(g, w + 0.4, 1.0);
  },
};
