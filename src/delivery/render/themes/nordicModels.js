// ---- The Nordic fjord's models (see nordic.js): no game state, so the gimmicks page and the car stage can show them too.
// The theme's two plain obstacles (registered in ../obstacleModels.js): a stack of fish boxes on a pallet for a crate, a stack of
// lobster creels with a coil of rope and a float for a bale. And the car ferry the scenery moors at its quay and sends across the
// fjord (empty: no people). Each model faces local +z, its feet on y = 0.
import * as THREE from 'three';
import { mergeParts } from './alpineModels.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (top, bottom, h, n = 10) => new THREE.CylinderGeometry(top, bottom, h, n);
// ONE mesh an obstacle (its parts merged, their colours as vertex colours) and the dark patch under it: two draw calls
const solid = (parts, r) => {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(mergeParts(parts), new THREE.MeshLambertMaterial({ vertexColors: true })));
  const shade = new THREE.Mesh(new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  shade.rotation.x = -Math.PI / 2; shade.position.y = 0.03;
  group.add(shade);
  return group;
};

const PALLET = 0x6b4a2e, BLUE = 0x2f6fb8, BLUE2 = 0x2a5f9e, WHITE = 0xe9eef2, ICE = 0xdff1fa, NET = 0x2f4a3a, WOOD = 0x8a6440, ROPE = 0xc9b48a, FLOAT = 0xf0641e;

// a crate's stand-in: fish boxes, blue and white plastic, stacked three high in two columns on a pallet, the top ones heaped with
// ice; a crate's box (1.2 m square, 1.1 m tall)
const fishCrates = () => {
  const parts = [[box(1.2, 0.12, 1.2), PALLET, 0, 0.06, 0]];
  for (const x of [-0.4, 0, 0.4]) parts.push([box(0.14, 0.06, 1.22), 0x4a321e, x, 0.01, 0]);
  for (const [cx, n] of [[-0.29, 3], [0.29, 3]]) {
    for (let k = 0; k < n; k++) {
      const y = 0.12 + k * 0.32, c = (k + (cx > 0 ? 1 : 0)) % 2 ? WHITE : BLUE, rim = c === WHITE ? 0xc9d0d6 : BLUE2;
      parts.push([box(0.56, 0.3, 1.14), c, cx, y + 0.15, 0]);
      parts.push([box(0.58, 0.05, 1.16), rim, cx, y + 0.28, 0]);                  // (its lip)
      for (const z of [-0.575, 0.575]) parts.push([box(0.22, 0.06, 0.02), 0x1e2a36, cx, y + 0.2, z]); // (the hand holes)
    }
    parts.push([box(0.48, 0.1, 1.04), ICE, cx, 1.1, 0], [box(0.3, 0.06, 0.7), 0xffffff, cx + 0.03, 1.17, 0.05]); // (the ice heaped in the top box)
  }
  return solid(parts, 0.95);
};

// a bale's stand-in: lobster creels, wooden frames with green netting, stacked two rows high and two deep, a coil of rope and an
// orange float on top; a bale's box (2.2 m square, 1.5 m tall)
const creelStack = () => {
  const parts = [];
  for (let row = 0; row < 2; row++) {
    for (const x of [-0.55, 0.55]) for (const z of [-0.5, 0.5]) {
      const y = row * 0.66;
      parts.push([box(1.0, 0.07, 0.9), WOOD, x, y + 0.035, z]);                     // the base board
      parts.push([cyl(0.42, 0.42, 0.96, 8, 1).rotateZ(Math.PI / 2), NET, x, y + 0.2, z, 0, 0, 0, 1, 1, 1]); // the netting (half sunk: a hoop's arch)
      for (const dx of [-0.4, 0, 0.4]) parts.push([new THREE.TorusGeometry(0.42, 0.03, 4, 8, Math.PI), WOOD, x + dx, y + 0.2, z, 0, Math.PI / 2, 0]); // the hoops
    }
  }
  // (the nets' feet would show below the base boards: the boards are as wide as the hoops, so the arch's lower half is inside the row
  // below, or under the bottom row's base: in the ground, as a bale's foot is)
  parts.push([new THREE.TorusGeometry(0.32, 0.08, 5, 12), ROPE, -0.3, 1.36, 0.1, Math.PI / 2, 0, 0]);
  parts.push([new THREE.TorusGeometry(0.2, 0.07, 5, 10), ROPE, -0.3, 1.46, 0.1, Math.PI / 2, 0, 0]);
  parts.push([new THREE.SphereGeometry(0.26, 10, 6), FLOAT, 0.45, 1.4, -0.15], [cyl(0.03, 0.03, 0.4, 5), 0x222222, 0.45, 1.62, -0.15]);
  return solid(parts, 1.5);
};

// a barrier's stand-in: a long low pallet of fish boxes, four across and two high, blue and white by turns, the top row heaped with
// ice; a barrier's box (2.4 m across, 1.2 deep, 1.2 tall), as long as a barrier along the road
const fishBoxWall = () => {
  const parts = [[box(2.4, 0.12, 1.2), PALLET, 0, 0.06, 0]];
  for (const z of [-0.45, 0, 0.45]) parts.push([box(2.42, 0.06, 0.14), 0x4a321e, 0, 0.01, z]);
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 4; k++) {
      const x = -0.9 + k * 0.6, y = 0.12 + row * 0.5, c = (k + row) % 2 ? WHITE : BLUE, rim = c === WHITE ? 0xc9d0d6 : BLUE2;
      parts.push([box(0.58, 0.48, 1.14), c, x, y + 0.24, 0]);
      parts.push([box(0.6, 0.05, 1.16), rim, x, y + 0.46, 0]);                       // (its lip)
      for (const z of [-0.575, 0.575]) parts.push([box(0.24, 0.07, 0.02), 0x1e2a36, x, y + 0.34, z]); // (the hand holes, front and back)
    }
  }
  for (let k = 0; k < 4; k++) parts.push([box(0.5, 0.08, 1.02), ICE, -0.9 + k * 0.6, 1.16, 0]); // (ice in the top boxes)
  return solid(parts, 1.35);
};

export const NORDIC_OBSTACLES = { fishCrates, creelStack, fishBoxWall };

// ---- the car ferry: a long white hull with a dark band at the waterline and a red one over it, an open car deck down the middle
// between two side casings, the bridge on a tower amidships, a funnel, a ramp at each end (raised). ~60 m long; its middle at the
// waterline. Parts for nordic.js's merge: [shape, lx, ly, lz, sx, sy, sz, colour]
export const ferryParts = (BOX) => {
  const L = 62, W = 13, HULL = 0xf2f2ee, BAND = 0x1e2630, RED = 0xb8262a, DECK = 0x4a4d52, CAS = 0xe6e8e4, GLASS = 0x2a3442;
  return [
    [BOX, 0, -0.6, 0, W, 2.6, L - 6, BAND], [BOX, 0, -0.4, 0, W - 2, 2.2, L, BAND],     // below the waterline / at it
    [BOX, 0, 1.6, 0, W, 2.0, L - 6, HULL], [BOX, 0, 1.6, 0, W - 2.4, 2.0, L, HULL],
    [BOX, 0, 0.85, 0, W + 0.04, 0.5, L - 6.2, RED],
    [BOX, 0, 2.66, 0, W - 4, 0.12, L - 1, DECK],                                         // the car deck
    ...[-1, 1].map(sd => [BOX, sd * (W / 2 - 1.1), 4.4, 0, 2.2, 3.6, L - 10, CAS]),       // the casings
    ...[-1, 1].map(sd => [BOX, sd * (W / 2 - 1.1), 4.6, 0, 2.24, 0.5, L - 14, GLASS]),    // their windows
    [BOX, 0, 7.4, 2, W - 1, 2.6, 9, HULL],                                               // the bridge across the casings
    [BOX, 0, 7.6, 2, W - 0.96, 0.9, 9.04, GLASS],
    [BOX, 0, 8.9, 2, W + 1.6, 0.25, 4, HULL],                                            // its wings
    [BOX, W / 2 - 1.1, 9.6, -6, 1.6, 3.2, 2.2, RED], [BOX, W / 2 - 1.1, 11.3, -6, 1.7, 0.3, 2.3, BAND], // the funnel
    ...[-1, 1].map(end => [BOX, 0, 5.2, end * (L / 2 - 0.6), W - 5, 5.2, 0.3, 0x9aa0a6, 0, end * 0.35]), // the ramps, raised
  ];
};
