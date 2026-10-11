// ---- THE BULLET TRAIN'S CARRIAGES (see bullettrain.js) ----
// The models alone (no game state, nothing added to a scene): built here so the game and the menu's pages
// (see ../gimmicks.js) can both use them. Each faces local +z, its feet on y = 0.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const T = CONFIG.bulletTrain;
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
// (the shell is one skin, painted panel by panel: see makeCarriage)
const SHELL = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
const WHITE = new THREE.Color(0xf4f6f8), BLUE = new THREE.Color(0x1f4fa8), GLASS = new THREE.Color(0x1b2430), SKIRT = new THREE.Color(0x9aa1ab),
  END = new THREE.Color(0x2b2f35);
const DARK = lambert(0x2b2f35);
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const add = (group, geometry, material, x, y, z) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};

// the carriage's cross-section, its right half from the middle of the floor up and over to the middle of the
// roof: [share of the half width, height (m, of a carriage 3.6 m tall)]; and each panel's paint between two
// points: the skirt, the blue stripe along the side, the band the windows are in, a roof rounded at the shoulder
const SECTION = [[0, 0.3], [0.88, 0.3], [1, 0.55], [1, 1.05], [1, 1.4], [1, 1.85], [1, 2.65], [0.93, 3.05], [0.75, 3.38], [0.45, 3.55], [0, 3.6]];
const PAINT = [SKIRT, SKIRT, WHITE, BLUE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE];
const WINDOWS = 5, SCREEN = [7, 8, 9]; // the panel the side windows are in, and those the cab's windscreen is in
const FLOOR = SECTION[0][1];
const NOSE = 18; // the nose's rings
// the nose, by how far along it (0 where it leaves the body to 1 at its tip): how wide and how tall it is
// there, of the body, and how far its floor has lifted. Long and low, a duck's bill, rounded at the tip
const noseWide = (t) => Math.sqrt(1 - t * t * t);
const noseTall = (t) => (1 - 0.6 * Math.pow(t, 1.3)) * Math.sqrt(1 - Math.pow(t, 8));
const noseLift = (t) => 0.25 * t * t * t;

// one carriage, its front towards local +z; `nose`: one with a nose (lamps lit: the front end)
export const makeCarriage = (nose, lit) => {
  const group = new THREE.Group();
  const w = T.hw * 2 - 0.2, h = T.height, L = T.carLength - 0.8, k = h / 3.6;
  const nl = nose ? 9 : 0, back = -L / 2, front = L / 2 - nl; // (the nose takes the front of the carriage)
  // the rings the skin is stretched over, back to front: { z, wide, tall, lift }, and what the stretch on from
  // each has in it: a window in the side, the cab's side window, its windscreen
  const rings = [{ z: back, wide: 1, tall: 1, lift: 0 }];
  const DOORS = 1.6, PANE = 1.1, PILLAR = 0.5; // (m: clear of windows at each end, for the doors)
  for (let z = back + DOORS; z + PANE <= front - DOORS; z += PANE + PILLAR) {
    rings.push({ z, wide: 1, tall: 1, lift: 0, glass: true }, { z: z + PANE, wide: 1, tall: 1, lift: 0 });
  }
  for (let i = 0; i <= (nose ? NOSE : 0); i++) {
    const t = nose ? i / NOSE : 0;
    rings.push({ z: front + nl * t, wide: noseWide(t), tall: noseTall(t), lift: noseLift(t), cab: nose && i >= 1 && i <= 3, screen: nose && i >= 2 && i <= 5 });
  }
  const at = (ring, j, side) => [side * SECTION[j][0] * w / 2 * ring.wide, (FLOOR + ring.lift + (SECTION[j][1] - FLOOR) * ring.tall) * k, ring.z];
  const position = [], color = [];
  const tri = (a, b, c, paint, side) => {
    for (const p of side > 0 ? [a, b, c] : [a, c, b]) { position.push(...p); color.push(paint.r, paint.g, paint.b); }
  };
  for (const side of [-1, 1]) {
    for (let r = 0; r < rings.length - 1; r++) {
      const a = rings[r], b = rings[r + 1];
      for (let j = 0; j < PAINT.length; j++) {
        const paint = (j === WINDOWS && (a.glass || a.cab)) || (a.screen && SCREEN.includes(j)) ? GLASS : PAINT[j];
        tri(at(a, j, side), at(a, j + 1, side), at(b, j + 1, side), paint, side);
        tri(at(a, j, side), at(b, j + 1, side), at(b, j, side), paint, side);
      }
    }
    // (a flat end, closed)
    for (const [ring, out] of nose ? [[rings[0], -1]] : [[rings[0], -1], [rings[rings.length - 1], 1]]) {
      const middle = [0, h / 2, ring.z];
      for (let j = 0; j < PAINT.length; j++) tri(middle, at(ring, j, side), at(ring, j + 1, side), END, side * out);
    }
  }
  const skin = new THREE.BufferGeometry();
  skin.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  skin.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  skin.computeVertexNormals();
  // (smooth over the panels, so the roof and the nose are rounded, not faceted; the flat ends keep their own)
  const normal = skin.getAttribute('normal').array, sums = new Map();
  const keyOf = (i) => color[i] === END.r && color[i + 1] === END.g ? null : position[i].toFixed(3) + ',' + position[i + 1].toFixed(3) + ',' + position[i + 2].toFixed(3);
  for (let i = 0; i < normal.length; i += 3) {
    const key = keyOf(i);
    if (!key) continue;
    const sum = sums.get(key) || sums.set(key, [0, 0, 0]).get(key);
    for (let c = 0; c < 3; c++) sum[c] += normal[i + c];
  }
  for (let i = 0; i < normal.length; i += 3) {
    const sum = sums.get(keyOf(i));
    if (!sum) continue;
    const len = Math.hypot(...sum) || 1;
    for (let c = 0; c < 3; c++) normal[i + c] = sum[c] / len;
  }
  group.add(new THREE.Mesh(skin, SHELL));
  // the bogies under it, and the gangway on to the next carriage at each flat end
  for (const z of [back + 3.2, front - (nose ? 1.5 : 3.2)]) add(group, new THREE.BoxGeometry(w * 0.72, 0.5 * k, 3.4), DARK, 0, 0.3 * k, z);
  for (const z of nose ? [back] : [back, front]) add(group, new THREE.BoxGeometry(w * 0.7, h * 0.68, 0.8), DARK, 0, h * 0.48, z);
  if (nose) {
    // its lamps, low on the nose, in the stripe
    const t = 0.72, ring = { z: front + nl * t, wide: noseWide(t), tall: noseTall(t), lift: noseLift(t) };
    const [x, y, z] = at(ring, 3, 1), top = at(ring, 4, 1)[1];
    for (const side of [-1, 1]) add(group, new THREE.BoxGeometry(0.36, 0.16, 0.6), lit ? LAMP : TAIL, side * x * 0.72, (y + top) / 2, z + 0.25);
  }
  group.rotation.order = 'YXZ'; // turn to the heading first, then pitch with the slope
  return group;
};
