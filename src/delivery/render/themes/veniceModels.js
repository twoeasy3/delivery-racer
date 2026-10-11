// ---- Venice's models: no game state, so the gimmicks page can show them too. The boats of the canal (a gondola
// and its gondolier, a vaporetto, a varnished water taxi), a humped footbridge, a campanile and a domed church for
// the skyline. Each lies along local z, its bow (or its front) to +z, its keel on the water at y = 0.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BOX = new THREE.BoxGeometry(1, 1, 1), ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 12), CONE = new THREE.ConeGeometry(0.5, 1, 12), BALL = new THREE.SphereGeometry(0.5, 14, 10);
const PYRAMID = new THREE.ConeGeometry(0.707, 1, 4).rotateY(Math.PI / 4), DOME = new THREE.SphereGeometry(0.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);

// a gondola: long, black and narrow, both ends swept up, the steel ferro at the bow, red seats; rowed: with its
// gondolier standing at the stern, striped shirt, straw hat, the oar over the side
export const makeGondola = (rowed = false) => {
  const g = new THREE.Group();
  const black = lambert(0x16171a), red = lambert(0xb5282c), steel = lambert(0xd8dde2), gold = lambert(0xd9a441);
  part(g, BOX, black, 0, 0.3, 0, 1.4, 0.6, 7);
  part(g, BOX, black, 0, 0.45, 4.1, 1.05, 0.5, 1.6).rotation.x = -0.28;
  part(g, BOX, black, 0, 0.85, 5.2, 0.6, 0.4, 1.4).rotation.x = -0.6;
  part(g, BOX, black, 0, 0.45, -4.1, 1.05, 0.5, 1.6).rotation.x = 0.28;
  part(g, BOX, black, 0, 0.95, -5.2, 0.5, 0.4, 1.6).rotation.x = 0.75;
  part(g, BOX, steel, 0, 1.55, 5.75, 0.08, 1.3, 0.5);                       // the ferro
  for (let k = 0; k < 4; k++) part(g, BOX, steel, 0, 1.2 + k * 0.22, 6.05, 0.08, 0.09, 0.4);
  part(g, BOX, red, 0, 0.75, 0.6, 1, 0.3, 1.1);
  part(g, BOX, red, 0, 1.05, 0.05, 1, 0.6, 0.16);
  part(g, BOX, gold, 0, 0.64, 2.6, 1.42, 0.08, 0.5);
  if (rowed) {
    const shirt = lambert(0xf4f4f0), stripe = lambert(0x2d4f8a), skin = lambert(0xe0b48c), straw = lambert(0xe6cf8a), wood = lambert(0x8a5a36);
    part(g, BOX, lambert(0x1c1d21), 0, 1.5, -3.4, 0.5, 1.2, 0.4);           // his legs
    part(g, BOX, shirt, 0, 2.55, -3.4, 0.7, 0.9, 0.45);
    for (const y of [2.3, 2.6, 2.9]) part(g, BOX, stripe, 0, y, -3.4, 0.72, 0.1, 0.47);
    part(g, BALL, skin, 0, 3.25, -3.4, 0.5, 0.5, 0.5);
    part(g, ROD, straw, 0, 3.5, -3.4, 1, 0.08, 1);
    part(g, ROD, straw, 0, 3.6, -3.4, 0.55, 0.2, 0.55);
    part(g, BOX, red, 0, 3.52, -3.4, 0.57, 0.07, 0.57);
    const oar = part(g, BOX, wood, 1.1, 1.5, -3.6, 0.09, 0.09, 5);
    oar.rotation.set(0.45, 0.25, 0);
  }
  return g;
};

// a vaporetto, the water bus: a long low white hull, a cabin all windows, a flat roof, the wheelhouse forward
export const makeVaporetto = () => {
  const g = new THREE.Group();
  const white = lambert(0xf2efe6), dark = lambert(0x2c3a46), yellow = lambert(0xe2b21c), green = lambert(0x2f6b4f), grey = lambert(0x9aa0a6);
  part(g, BOX, dark, 0, 0.4, 0, 4, 0.8, 19);
  part(g, BOX, white, 0, 1.1, 0, 4.2, 0.7, 19.4);
  part(g, BOX, white, 0, 1.0, 10.6, 3, 0.9, 2.4);
  part(g, BOX, yellow, 0, 1.5, 0, 4.25, 0.14, 19.5);
  part(g, BOX, white, 0, 2.5, -1.5, 3.8, 2, 12);
  part(g, BOX, dark, 0, 2.7, -1.5, 3.86, 1, 11.2);
  for (let z = -6.5; z < 4.5; z += 1.6) part(g, BOX, white, 0, 2.7, z, 3.9, 1.02, 0.2);
  part(g, BOX, grey, 0, 3.6, -1.5, 4.1, 0.2, 12.6);
  part(g, BOX, white, 0, 2.7, 6.4, 3, 2.4, 2.6);                             // the wheelhouse
  part(g, BOX, dark, 0, 3.1, 6.6, 3.06, 0.9, 2.3);
  part(g, BOX, grey, 0, 4, 6.4, 3.3, 0.2, 3);
  part(g, BOX, green, 0, 1.9, -8.6, 3.6, 0.9, 0.2);
  part(g, ROD, grey, 0, 4.7, 5.6, 0.1, 1.4, 0.1);
  return g;
};

// a water taxi: a varnished wooden launch, a low white cabin aft, a windscreen
export const makeWaterTaxi = () => {
  const g = new THREE.Group();
  const wood = lambert(0x9a5a2c), white = lambert(0xf4f1e8), glass = lambert(0x35576a), chrome = lambert(0xd8dde2);
  part(g, BOX, wood, 0, 0.5, -0.5, 2.3, 1, 7);
  part(g, BOX, wood, 0, 0.6, 3.7, 1.7, 0.8, 1.8).rotation.x = -0.12;
  part(g, BOX, wood, 0, 0.7, 4.9, 0.9, 0.6, 1.2).rotation.x = -0.2;
  part(g, BOX, white, 0, 1.4, -1.6, 2, 0.9, 3.4);
  part(g, BOX, glass, 0, 1.45, -1.6, 2.04, 0.5, 2.8);
  part(g, BOX, glass, 0, 1.4, 1.1, 1.9, 0.7, 0.1).rotation.x = -0.4;
  part(g, BOX, chrome, 0, 1.02, 0, 2.34, 0.06, 7);
  return g;
};

// a humped footbridge over a canal `span` m wide: an arch of pale stone, steps up and down, a parapet each side.
// It crosses along local x, from x = 0 to x = span; `wide` m across
export const makeFootbridge = (span = 28, wide = 4, rise = 4.6) => {
  const g = new THREE.Group();
  const stone = lambert(0xe6dfcf, { side: THREE.DoubleSide }), tread = lambert(0xb9b0a0, { side: THREE.DoubleSide }), brick = lambert(0xb5654a, { side: THREE.DoubleSide });
  const N = 24, top = (t) => rise * Math.sin(Math.PI * t), under = (t) => Math.max(0, rise * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.14) / 0.72))) - 0.9) * (t > 0.14 && t < 0.86 ? 1 : 0);
  const strip = (rows, material) => { // rows: [[x, y, z], [x, y, z]] pairs
    const pos = [], idx = [];
    rows.forEach(([a, b], k) => { pos.push(...a, ...b); if (k) { const q = (k - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, material));
  };
  const ts = Array.from({ length: N + 1 }, (_, k) => k / N);
  strip(ts.map(t => [[t * span, top(t) + 0.02, -wide / 2], [t * span, top(t) + 0.02, wide / 2]]), tread);            // the way over
  for (const z of [-wide / 2, wide / 2]) {
    strip(ts.map(t => [[t * span, top(t) + 1, z], [t * span, top(t), z]]), stone);                                    // the parapet
    strip(ts.map(t => [[t * span, top(t), z], [t * span, under(t), z]]), brick);                                      // the arch's face
    strip(ts.map(t => [[t * span, top(t) + 1.12, z - 0.2], [t * span, top(t) + 1.12, z + 0.2]]), stone);              // its coping
  }
  strip(ts.filter(t => t >= 0.14 && t <= 0.86).map(t => [[t * span, under(t), -wide / 2], [t * span, under(t), wide / 2]]), brick); // the vault, from below
  return g;
};

// a campanile: a tall square shaft of brick, a white belfry of arches, a green pyramid of a spire, a gilded figure
export const makeCampanile = (height = 70, wide = 9) => {
  const g = new THREE.Group();
  const brick = lambert(0xb5654a), stone = lambert(0xefe8d8), dark = lambert(0x3a2f2a), green = lambert(0x6f9a86), gold = lambert(0xe2b21c);
  const shaft = height * 0.62, belfry = height * 0.1, attic = height * 0.08, spire = height * 0.2;
  part(g, BOX, brick, 0, shaft / 2, 0, wide, shaft, wide);
  for (const x of [-0.3, 0, 0.3]) for (const r of [0, 1]) { const rib = part(g, BOX, lambert(0xa3573f), 0, shaft / 2, 0, r ? wide + 0.3 : 0.5, shaft, r ? 0.5 : wide + 0.3); rib.position[r ? 'z' : 'x'] = x * wide; }
  part(g, BOX, stone, 0, shaft + 0.4, 0, wide + 1, 0.8, wide + 1);
  part(g, BOX, stone, 0, shaft + 0.8 + belfry / 2, 0, wide, belfry, wide);
  for (let k = -1.5; k <= 1.5; k++) for (const r of [0, 1]) { const arch = part(g, BOX, dark, 0, shaft + 0.8 + belfry * 0.5, 0, r ? wide + 0.1 : wide * 0.16, belfry * 0.7, r ? wide * 0.16 : wide + 0.1); arch.position[r ? 'z' : 'x'] = k * wide * 0.23; }
  part(g, BOX, stone, 0, shaft + 1.2 + belfry, 0, wide + 1, 0.8, wide + 1);
  part(g, BOX, brick, 0, shaft + 1.6 + belfry + attic / 2, 0, wide * 0.92, attic, wide * 0.92);
  part(g, PYRAMID, green, 0, shaft + 1.6 + belfry + attic + spire / 2, 0, wide * 0.92, spire, wide * 0.92);
  part(g, BALL, gold, 0, shaft + 1.6 + belfry + attic + spire + 0.8, 0, 1.6, 2.4, 1.6);
  return g;
};

// a domed church: a white front with a pediment, a drum and a great dome with its lantern, a smaller dome behind
export const makeDomedChurch = (scale = 1) => {
  const g = new THREE.Group();
  const stone = lambert(0xefe8d8), shade = lambert(0xd6cdb8), lead = lambert(0x9aa7ad), dark = lambert(0x3a2f2a);
  part(g, BOX, stone, 0, 9, 0, 30, 18, 26);
  part(g, BOX, shade, 0, 8, 13.2, 16, 16, 1);
  for (const x of [-6, -2, 2, 6]) part(g, ROD, stone, x, 7, 14, 1.3, 14, 1.3);
  part(g, BOX, dark, 0, 4, 13.8, 3, 8, 0.3);
  const pediment = part(g, PYRAMID, stone, 0, 17.5, 13, 12.5, 5, 1.2);
  pediment.scale.set(17.6, 5, 1.6);
  part(g, ROD, stone, 0, 21, 0, 17, 6, 17);
  part(g, DOME, lead, 0, 24, 0, 18, 22, 18);
  part(g, ROD, stone, 0, 36, 0, 3, 3, 3);
  part(g, DOME, lead, 0, 37.5, 0, 3.4, 4, 3.4);
  part(g, ROD, stone, 0, 19.5, -11, 9, 3, 9);
  part(g, DOME, lead, 0, 21, -11, 9.6, 11, 9.6);
  g.scale.setScalar(scale);
  return g;
};
