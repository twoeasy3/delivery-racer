// ---- toy room: the whole level at toy scale. The road is a run of orange plastic track across a blue carpet, a
// raised lip along each edge and a blue joiner every so often; beside it, everything a playroom floor has, as
// big as it is to a toy car: alphabet blocks in stacks, building bricks, crayons, marbles, dominoes stood in
// rows, rings on a peg, a wooden railway with its train, rugs; here and there a cat asleep, a teddy bear, a
// rubber duck; and for a skyline, the furniture: chairs and a table the road runs under, a sofa, bookshelves.
// (The sky is the wallpaper's colour, and the haze takes the far end of the room into it.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { makeCat, makeTeddy, makeDuck } from './toyModels.js';

const BRIGHT = [0xe23b3b, 0xf2c21c, 0x2f7fe0, 0x35a852, 0xf27d1a, 0x9a4fd0];

export const toyroom = ({ add, flat, instances, sideStrip, offRoads, beside, inJunction, exits, cube, tube, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 7 + (LEVEL.id || '').length * 131;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {};
  const roads = [[Track.start, Track.end], ...exits.map(x => [x.side0, x.sideEnd])];

  // ---- the track's own: a lip along each edge, a joiner (a blue tab each side) every 40 m
  const lips = [], tabs = [];
  for (const [from, to] of roads) {
    for (let s = from; s < to; s += 4) {
      if (inJunction(s) || Track.onBridge(s)) continue;
      for (const side of [-1, 1]) lips.push([s, beside(side, s, 0.12), 0.22, 0.28, 0.44, 4.02, [s + 4, beside(side, s + 4, 0.12)]]);
    }
    for (let s = from + 20; s < to; s += 40) {
      if (inJunction(s) || Track.onBridge(s)) continue;
      for (const side of [-1, 1]) tabs.push([s, beside(side, s, 0.75), 0.12, 1.3, 0.24, 2.4]);
    }
  }
  instances(cube, 0xe85d04, lips);
  instances(cube, 0x1f6fd0, tabs);

  // ---- rugs on the carpet: wide flat patches, well off the road
  const rugs = BRIGHT.map(() => []), fringes = [];
  for (let s = Track.start + 120; s < Track.end; s += 420) {
    const side = rand() < 0.5 ? -1 : 1, w = 50 + rand() * 40, l = 80 + rand() * 60, lat = beside(side, s, 16 + w / 2);
    const outer = Math.floor(rand() * 3) + 3, inner = Math.floor(rand() * 3);
    // (where the road doubles back, a hairpin's legs, a rug laid beside one leg would lie over the next: not there)
    // (every 5 m of the rug as it lies, a straight rectangle turned the road's way at its middle: at five places
    // along it and three across, 35 m and 45 m apart, the road went between the places looked at and under the rug)
    let clear = true;
    const turn = Track.toWorld(s, lat, p), cx = p.x, cz = p.z, fx = Math.sin(turn), fz = Math.cos(turn), keep = Math.max(Track.hi(s), -Track.lo(s)) + 2;
    for (let a = -(w + 3) / 2; a <= (w + 3) / 2 && clear; a += 5) for (let b = -l / 2; b <= l / 2 && clear; b += 5) {
      if (Track.mainDistance(cx + fx * b + fz * a, cz + fz * b - fx * a) < keep) clear = false;
    }
    if (!clear) continue;
    rugs[outer].push([s, lat, 0.03, w, 0.06, l]);
    rugs[inner].push([s, lat, 0.05, w * 0.7, 0.07, l * 0.75]);
    fringes.push([s, lat, 0.02, w + 3, 0.04, l]);
  }
  rugs.forEach((list, i) => instances(cube, [0xb5483f, 0xd9a441, 0x3f7f6b, 0x7a3f58, 0x2d5f8a, 0xc9b79a][i], list, false, 4));
  instances(cube, 0xf3ead8, fringes, false, 4);

  // ---- the things on the floor, one lot every 34 m each side, each a kind of its own
  const blocks = BRIGHT.map(() => []), plates = [], bricks = BRIGHT.map(() => []), studs = BRIGHT.map(() => []);
  const crayons = BRIGHT.map(() => []), tips = BRIGHT.map(() => []), wraps = [], balls = BRIGHT.map(() => []);
  const dominoes = [], pips = [], rings = BRIGHT.map(() => []), pegs = [], bases = [];
  const LIE = new THREE.CylinderGeometry(0.5, 0.5, 1, 12).rotateX(Math.PI / 2);   // a crayon, lying along the road
  const TIP = new THREE.ConeGeometry(0.5, 1, 12).rotateX(Math.PI / 2);
  const RING = new THREE.TorusGeometry(0.5, 0.2, 8, 18).rotateX(Math.PI / 2);
  const BALL = new THREE.SphereGeometry(0.5, 14, 10);
  for (const [from, to] of roads) {
    for (let s0 = from + 10; s0 < to - 10; s0 += 34) {
      for (const side of [-1, 1]) {
        const s = s0 + rand() * 14, roll = rand(), far = 5 + rand() * 22;
        const at = (size) => beside(side, s, far + size / 2);
        if (roll < 0.26) { // alphabet blocks, stacked: a cube of colour with a pale plate let into each face
          const size = 5 + rand() * 3.5, n = 1 + Math.floor(rand() * 3), lat = at(size);
          for (let k = 0; k < n; k++) {
            const off = k ? (rand() - 0.5) * 1.6 : 0, c = Math.floor(rand() * BRIGHT.length);
            blocks[c].push([s + off, lat + off, size * (k + 0.5), size, size, size]);
            plates.push([s + off, lat + off, size * (k + 0.5), size * 0.72, size * 0.72, size + 0.12], [s + off, lat + off, size * (k + 0.5), size + 0.12, size * 0.72, size * 0.72]);
          }
          if (rand() < 0.5) { const c = Math.floor(rand() * BRIGHT.length); blocks[c].push([s + size * 1.2, lat + side * 2, size * 0.4, size * 0.8, size * 0.8, size * 0.8]); }
        } else if (roll < 0.46) { // building bricks, studs on top, one on another
          const n = 1 + Math.floor(rand() * 3), lat = at(8);
          for (let k = 0; k < n; k++) {
            const c = Math.floor(rand() * BRIGHT.length), shift = k * 4 * (rand() < 0.5 ? 1 : -1);
            bricks[c].push([s + shift, lat, 2.4 + k * 4.8, 8, 4.8, 16]);
            if (k === n - 1) for (let i = -1; i <= 1; i += 2) for (let j = -3; j <= 3; j += 2) studs[c].push([s + shift + j * 2, lat + i * 2, 4.8 * n + 0.5, 2.4, 1, 2.4]);
          }
        } else if (roll < 0.6) { // crayons dropped beside the road
          for (let k = 0; k < 2 + Math.floor(rand() * 2); k++) {
            const c = Math.floor(rand() * BRIGHT.length), lat = at(2) + side * k * 3.4, q = s + (rand() - 0.5) * 8;
            crayons[c].push([q, lat, 1.1, 2.2, 2.2, 15]);
            tips[c].push([q + 9, lat, 1.1, 2.1, 2.1, 3]);
            wraps.push([q - 1.5, lat, 1.1, 2.3, 2.3, 7]);
          }
        } else if (roll < 0.74) { // marbles and balls
          for (let k = 0; k < 2 + Math.floor(rand() * 3); k++) {
            const r = 1.2 + rand() * rand() * 5;
            balls[Math.floor(rand() * BRIGHT.length)].push([s + (rand() - 0.5) * 16, at(r * 2) + side * rand() * 10, r, r * 2, r * 2, r * 2]);
          }
        } else if (roll < 0.88) { // dominoes stood in a row, ready to go
          const lat = at(1.2);
          for (let k = 0; k < 6; k++) {
            dominoes.push([s + k * 3.6, lat, 3.2, 3, 6.4, 0.8]);
            pips.push([s + k * 3.6, lat, 4.8, 0.7, 0.7, 0.86], [s + k * 3.6, lat, 3.2, 2.6, 0.16, 0.86], [s + k * 3.6, lat - 0.7, 1.6, 0.7, 0.7, 0.86], [s + k * 3.6, lat + 0.7, 1.6, 0.7, 0.7, 0.86]);
          }
        } else { // rings on a peg, the biggest at the bottom
          const lat = at(9);
          bases.push([s, lat, 0.5, 10, 1, 10]);
          pegs.push([s, lat, 7, 1.2, 13, 1.2]);
          for (let k = 0; k < 5; k++) rings[(k + Math.abs(Math.floor(s))) % BRIGHT.length].push([s, lat, 2.2 + k * 2.4, 9 - k * 1.3, 6, 9 - k * 1.3]);
        }
      }
    }
  }
  BRIGHT.forEach((color, i) => {
    instances(cube, color, blocks[i], false, 2);
    instances(cube, color, bricks[i], false, 2);
    instances(tube, color, studs[i]);
    instances(LIE, color, crayons[i]);
    instances(TIP, color, tips[i]);
    instances(BALL, color, balls[i]);
    instances(RING, color, rings[i]);
  });
  instances(cube, 0xf6edd6, plates, false, 2);
  instances(LIE, 0xf4f1e8, wraps);
  instances(cube, 0xf7f4ec, dominoes);
  instances(cube, 0x1c1c1c, pips);
  instances(tube, 0xd9b077, pegs);
  instances(tube, 0xd9b077, bases);

  // ---- a wooden railway along the left, some way off, its train standing on it
  const wood = flat(0xd9b077), groove = flat(0xa87c4a);
  const cars = BRIGHT.map(() => []), wheels = [], funnels = [];
  for (let s = Track.start + 200, n = 0; s < Track.end - 260; s += 700, n++) {
    const side = n % 2 ? 1 : -1, d = 36;
    add(sideStrip(s, s + 240, (q) => beside(side, q, d), (q) => beside(side, q, d + 6), 0.5, 4), wood);
    for (const g of [1.4, 4.6]) add(sideStrip(s, s + 240, (q) => beside(side, q, d + g - 0.35), (q) => beside(side, q, d + g + 0.35), 0.53, 4), groove);
    for (let k = 0; k < 5; k++) {
      const q = s + 60 + k * 11.5, lat = beside(side, q, d + 3), c = (k + n) % BRIGHT.length;
      cars[c].push([q, lat, 3.4, 5, 3.6, 9.5]);
      if (k === 4) { cars[c].push([q + 2, lat, 6.4, 4.6, 2.6, 4.5]); funnels.push([q - 2.5, lat, 6.6, 1.6, 3, 1.6]); } // (the engine, at the front: a cab and a funnel)
      else cars[(c + 2) % BRIGHT.length].push([q, lat, 5.9, 3.6, 1.6, 6.5]);                                             // (a truck's load)
      for (const e of [-3, 3]) for (const w of [-2.7, 2.7]) wheels.push([q + e, lat + w, 1.6, 0.8, 2.6, 2.6]);
    }
  }
  const WHEEL = new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateZ(Math.PI / 2);
  BRIGHT.forEach((color, i) => instances(cube, color, cars[i], false, 2));
  instances(WHEEL, 0x3a2a1c, wheels);
  instances(tube, 0x2a2a2a, funnels);

  // ---- the furniture, for a skyline: a chair close by now and then, sofas and bookshelves far off; and one
  // table the road runs under, its legs either side
  const legs = [], seats = [], sofas = [], cushions = [], shelves = [], books = BRIGHT.map(() => []);
  for (let s = Track.start + 300, n = 0; s < Track.end; s += 520, n++) {
    const side = n % 2 ? -1 : 1;
    if (n % 3 === 1) { // a table over the road
      for (const e of [-1, 1]) for (const q of [-70, 70]) legs.push([s + q, beside(e, s + q, 58), 60, 9, 120, 9]);
      Track.toWorld(s, 0, p);
      const top = new THREE.Mesh(new THREE.BoxGeometry(190, 7, 190), new THREE.MeshLambertMaterial({ color: 0x9a6a3a }));
      top.position.set(p.x, p.y + 123.5, p.z);
      top.rotation.y = Track.toWorld(s, 0, p);
      levelGroup.add(top);
      continue;
    }
    const lat = beside(side, s, 62 + rand() * 30); // a chair: four legs, a seat, a back
    for (const e of [-1, 1]) for (const q of [-1, 1]) legs.push([s + q * 17, lat + e * 17, 30, 5, 60, 5]);
    seats.push([s, lat, 62, 42, 4, 42], [s, lat + side * 19, 96, 4, 64, 42]);
  }
  for (let s = Track.start - 100, n = 0; s < Track.end + 100; s += 300, n++) {
    const side = n % 2 ? 1 : -1, q = Math.max(Track.start, Math.min(Track.end, s)), lat = beside(side, q, 190 + rand() * 60);
    Track.toWorld(q, lat, p);
    if (!offRoads(p.x, p.z, 80) || Track.mainDistance(p.x, p.z) < 120) continue;
    if (n % 4 < 2) { // a sofa
      sofas.push([s, lat, 20, 70, 40, 190], [s, lat + side * 30, 62, 22, 60, 190]);
      for (let k = -1; k <= 1; k++) cushions.push([s + k * 60, lat - side * 6, 46, 56, 14, 56]);
    } else { // a bookshelf, its books' spines to the room
      shelves.push([s, lat, 100, 40, 200, 150]);
      for (let y = 14; y < 190; y += 34) for (let k = -68; k < 68; k += 7 + rand() * 6) books[Math.floor(rand() * BRIGHT.length)].push([s + k, lat - side * 20.5, y + 11, 1, 20 + rand() * 8, 6]);
    }
  }
  instances(cube, 0x8a5a2b, legs, false, 2);
  instances(cube, 0x9a6a3a, seats, false, 2);
  instances(cube, 0x9c4a4a, sofas);
  instances(cube, 0xc9b79a, cushions);
  instances(cube, 0x6b4a2c, shelves);
  BRIGHT.forEach((color, i) => instances(cube, color, books[i]));

  // ---- and the ones there are only a few of: a cat asleep, a teddy bear, a rubber duck, in turn down the road
  const makers = [makeCat, makeTeddy, makeDuck];
  for (let s = Track.start + 150, n = 0; s < Track.end; s += 330, n++) {
    const side = n % 2 ? 1 : -1, model = makers[n % makers.length]();
    const at = Math.min(Track.end, s + rand() * 60), h = Track.toWorld(at, beside(side, at, 26 + rand() * 12), p);
    if (!offRoads(p.x, p.z, 16)) continue;
    model.position.set(p.x, p.y, p.z);
    model.rotation.y = h + (side > 0 ? -1 : 1) * (0.9 + rand() * 0.8); // (turned towards the road, more or less)
    levelGroup.add(model);
  }
};
