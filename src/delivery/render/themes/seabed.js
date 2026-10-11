// ---- sea bed: an underwater tunnel. The road runs along the sea bed inside a glass tube: steel ribs over it every
// 20 m, a stringer along its roof and one high on each shoulder, a kerb of plate with a lamp at each rib's foot, and glass between, through which
// everything else is seen: sand and sea grass, rocks, coral in clumps (branches, brains, fans, tube sponges), kelp
// standing tall, shoals of fish beside the tube and over it, columns of bubbles, shafts of light slanting down
// from the surface; and one at a time down the road a whale, a shark, a turtle, jellyfish, a yellow submarine, a
// wreck, a chest of gold. The water is the fog: everything goes off into blue. (The tube stops for a tunnel, a
// bridge, a junction and wherever another road comes near: there the road is in the open, on the bed.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { makeWhale, makeShark, makeTurtle, makeJellyfish, makeSubmarine, makeWreck, makeChest } from './seabedModels.js';

const CORAL = [0xff6f8f, 0xff9a4a, 0xc86fe0, 0xffd24a, 0x4ad0c0, 0xf0507a];
const FISH = [0xdfe8ee, 0xffc83a, 0xff7a3a, 0x4aa8ff, 0xf05a8a];
// The tube is tall and full in the shoulder (a rounded arch: |2u|^3 + v^3 = 1, u across it from -0.5 to 0.5, v up
// it from 0 to 1), so that the chase camera (CONFIG.camHeight: 11 m up, over whichever lane the car is in) is always
// well inside the glass, with every member that runs along or across the tube well over its head: nothing but the
// slim legs of the ribs, 20 m apart, stands lower than the camera's line to the road ahead. (It was a half ellipse
// 11.5 m high: the camera was at its crown under the middle of the road and outside the glass over any other lane.)
const HEIGHT = 19; // m from the road to the crown of the tube
const BULGE = 2 / 3; // (2 / the power of the arch: 1 would be a half ellipse)
const section = (t) => { // round the arch from one foot (t 0) to the other (pi): [u, v]
  const c = Math.cos(t);
  return [-Math.sign(c) * Math.abs(c) ** BULGE / 2, Math.sin(t) ** BULGE];
};
class Arch extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) { const [u, v] = section(Math.PI * t); return target.set(u, v, 0); }
}

export const seabed = ({ instances, offRoads, beside, inJunction, cube, tube, cone, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 11 + (LEVEL.id || '').length * 137;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {};

  // ---- the tube. Its feet stand 1.4 m off the pavement each side; where is there one at s?
  const OUT = 1.4;
  const left = (s) => beside(-1, s, OUT), right = (s) => beside(1, s, OUT);
  const tubed = (s) => {
    if (s < Track.start || s > Track.end || inJunction(s) || Track.onBridge(s) || Track.tunnel(s) > 0) return false;
    Track.toWorld(s, left(s), p);
    Track.toWorld(s, right(s), q);
    return offRoads(p.x, p.z, 1) && offRoads(q.x, q.z, 1);
  };
  const ARCH = new THREE.TubeGeometry(new Arch(), 48, 0.005, 6, false); // (a rib, standing across the road, 1 wide and 1 high: scaled to the tube. Slim: its legs are all that stands low down)
  const ribs = [], kerbs = [], lamps = [], stringers = [];
  const STEP = 5, RIB = 20, ARC = 20;
  const pos = [], idx = [];
  let before = false, n = 0;
  for (let s = Math.ceil(Track.start / STEP) * STEP; s <= Track.end; s += STEP) {
    const here = tubed(s), a = left(s), b = right(s), mid = (a + b) / 2, w = b - a;
    if (here) {
      for (let k = 0; k <= ARC; k++) {
        const [u, v] = section(Math.PI * k / ARC);
        Track.toWorld(s, mid + u * w, p);
        pos.push(p.x, p.y + v * HEIGHT, p.z);
      }
      if (before) {
        for (let k = 0; k < ARC; k++) { const i = (n - 1) * (ARC + 1) + k, j = i + ARC + 1; idx.push(i, j, i + 1, i + 1, j, j + 1); }
        const a0 = left(s - STEP), b0 = right(s - STEP), m0 = (a0 + b0) / 2, w0 = b0 - a0;
        kerbs.push([s - STEP, a0, 0.45, 0.7, 0.9, 1, [s, a]], [s - STEP, b0, 0.45, 0.7, 0.9, 1, [s, b]]);
        for (const [t, thick] of [[Math.PI / 2, 0.3], [Math.PI * 0.3, 0.16], [Math.PI * 0.7, 0.16]]) { // (the roof's stringer, and one high on each shoulder: 16.5 m up, none lower)
          const [u, v] = section(t);
          stringers.push([s - STEP, m0 + u * w0, v * HEIGHT, thick, thick, 1, [s, mid + u * w]]);
        }
      }
      if (s % RIB === 0) {
        ribs.push([s, mid, 0, w, HEIGHT, 50]);
        lamps.push([s, a + 0.5, 1.15, 0.5, 0.35, 0.9], [s, b - 0.5, 1.15, 0.5, 0.35, 0.9]);
      }
      n++;
    }
    before = here;
  }
  instances(ARCH, 0x8fa3b0, ribs);
  instances(cube, 0x6f8494, stringers);
  instances(cube, 0x55697a, kerbs);
  instances(cube, 0xd8fbff, lamps, true);
  if (idx.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const glass = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xc8f4ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }));
    glass.userData.flat = true;
    glass.renderOrder = 2;
    levelGroup.add(glass);
  }

  // ---- the bed: patches of sea grass and of paler sand, flat on it
  const grass = [], sand = [];
  for (let s = Track.start + 60; s < Track.end; s += 150) {
    for (const side of [-1, 1]) {
      const w = 30 + rand() * 50, l = 50 + rand() * 70;
      (rand() < 0.6 ? grass : sand).push([s + rand() * 80, beside(side, s, 8 + w / 2 + rand() * 30), 0.04, w, 0.06, l]);
    }
  }
  const DISC = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
  instances(DISC, 0x3f8a6a, grass, false, 2);
  instances(DISC, 0x9fc4b0, sand, false, 2);

  // ---- what grows and lies on it, one lot every 26 m each side, each a kind of its own
  const ROCK = new THREE.DodecahedronGeometry(0.5, 0), BALL = new THREE.SphereGeometry(0.5, 12, 8), FAN = new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateX(Math.PI / 2);
  const BLADE = new THREE.ConeGeometry(0.5, 1, 5), STAR = new THREE.CylinderGeometry(0.5, 0.5, 1, 5);
  const rocks = [], branches = CORAL.map(() => []), brains = CORAL.map(() => []), fans = CORAL.map(() => []), sponges = CORAL.map(() => []);
  const kelp = [[], []], stars = CORAL.map(() => []), bubbles = [];
  for (let s0 = Track.start + 8; s0 < Track.end - 8; s0 += 26) {
    for (const side of [-1, 1]) {
      const s = s0 + rand() * 16, roll = rand(), far = 5 + rand() * rand() * 40;
      const at = (size) => beside(side, s, far + size / 2);
      if (roll < 0.2) { // rocks, a big one and its litter
        const r = 3 + rand() * 6, lat = at(r);
        rocks.push([s, lat, r * 0.3, r, r * 0.8, r * 1.2]);
        for (let k = 0; k < 3; k++) { const m = 0.8 + rand() * 1.6; rocks.push([s + (rand() - 0.5) * r * 2.4, lat + (rand() - 0.5) * r * 2.4, m * 0.3, m, m * 0.8, m]); }
        if (rand() < 0.5) { const c = Math.floor(rand() * CORAL.length); stars[c].push([s + r, lat - side * r * 0.9, 0.12, 1.6, 0.24, 1.6]); }
      } else if (roll < 0.42) { // branching coral: a clump of spikes, leaning every way
        const c = Math.floor(rand() * CORAL.length), lat = at(5);
        for (let k = 0; k < 9; k++) { const h = 2 + rand() * 4.5; branches[c].push([s + (rand() - 0.5) * 5, lat + (rand() - 0.5) * 5, h / 2, 0.7 + rand() * 0.6, h, 0.7 + rand() * 0.6]); }
        rocks.push([s, lat, 0.3, 6, 1.2, 6]);
      } else if (roll < 0.56) { // brain coral: domes
        const c = Math.floor(rand() * CORAL.length), lat = at(5);
        for (let k = 0; k < 3; k++) { const r = 2 + rand() * 3.5; brains[c].push([s + (rand() - 0.5) * 7, lat + (rand() - 0.5) * 6, r * 0.25, r, r * 0.8, r]); }
      } else if (roll < 0.68) { // sea fans: flat discs on edge, a stalk under each
        const c = Math.floor(rand() * CORAL.length), lat = at(4);
        for (let k = 0; k < 3; k++) { const r = 3 + rand() * 3; fans[c].push([s + k * 2.4 - 2.4, lat + (rand() - 0.5) * 4, r * 0.6, r, r, 0.25]); }
      } else if (roll < 0.8) { // tube sponges: pipes in a bunch
        const c = Math.floor(rand() * CORAL.length), lat = at(4);
        for (let k = 0; k < 5; k++) { const h = 2.5 + rand() * 4; sponges[c].push([s + (rand() - 0.5) * 3.5, lat + (rand() - 0.5) * 3.5, h / 2, 1 + rand() * 0.6, h, 1 + rand() * 0.6]); }
      } else if (roll < 0.95) { // kelp: tall blades in a stand
        const lat = at(6);
        for (let k = 0; k < 8; k++) { const h = 9 + rand() * 16; kelp[k % 2].push([s + (rand() - 0.5) * 8, lat + (rand() - 0.5) * 8, h / 2, 1.1, h, 0.5 + rand() * 0.8]); }
      } else { // a vent: bubbles in a column, bigger as they rise
        const lat = at(2);
        rocks.push([s, lat, 0.4, 3, 1.4, 3]);
        for (let y = 1.5, k = 0; y < 34; y += 1.6 + k * 0.12, k++) { const r = 0.25 + k * 0.035; bubbles.push([s + Math.sin(k * 1.7) * 0.8, lat + Math.cos(k * 2.3) * 0.8, y, r, r, r]); }
      }
    }
  }
  instances(ROCK, 0x5f7480, rocks, false, 1);
  CORAL.forEach((color, i) => {
    instances(cone, color, branches[i], false, 1);
    instances(BALL, color, brains[i], false, 1);
    instances(FAN, color, fans[i], false, 1);
    instances(tube, color, sponges[i], false, 1);
    instances(STAR, color, stars[i]);
  });
  instances(BLADE, 0x2f7a4a, kelp[0], false, 1);
  instances(BLADE, 0x4a9a52, kelp[1], false, 1);
  instances(BALL, 0xe8fbff, bubbles, true);

  // ---- shoals: forty or so fish each, all heading one way, beside the tube and now and then right over it
  const FISHY = new THREE.SphereGeometry(0.5, 8, 6), TAIL = new THREE.OctahedronGeometry(0.5, 0);
  const bodies = FISH.map(() => []), tails = FISH.map(() => []);
  for (let s = Track.start + 40, k = 0; s < Track.end; s += 85, k++) {
    const c = k % FISH.length, over = k % 4 === 3, side = k % 2 ? 1 : -1;
    const lat0 = over ? (Track.lo(s) + Track.hi(s)) / 2 : beside(side, s, 14 + rand() * 30), y0 = over ? HEIGHT + 5 + rand() * 6 : 4 + rand() * 14;
    const size = 0.5 + rand() * 0.7, dir = rand() < 0.5 ? 1 : -1; // (dir: which way they head)
    for (let i = 0; i < 44; i++) {
      const ds = (rand() - 0.5) * 30, dl = (rand() - 0.5) * 12, dy = (rand() - 0.5) * 6;
      bodies[c].push([s + ds, lat0 + dl, y0 + dy, size * 0.45, size * 0.9, size * 2.2]);
      tails[c].push([s + ds - dir * size * 1.4, lat0 + dl, y0 + dy, size * 0.2, size * 1.1, size * 1.1]);
    }
  }
  FISH.forEach((color, i) => { instances(FISHY, color, bodies[i]); instances(TAIL, color, tails[i]); });

  // ---- sea mounts far off, to go into the blue: and shafts of light down from the surface, all one mesh
  const mounts = [];
  for (let s = Track.start - 100, k = 0; s < Track.end + 100; s += 170, k++) {
    const side = k % 2 ? 1 : -1, at = Math.max(Track.start, Math.min(Track.end, s)), r = 70 + rand() * 90, lat = beside(side, at, 110 + r / 2 + rand() * 120);
    Track.toWorld(at, lat, p);
    if (offRoads(p.x, p.z, r / 2 + 10) && Track.mainDistance(p.x, p.z) > r / 2 + 40) mounts.push([s, lat, r * 0.3, r, r * (0.5 + rand() * 0.5), r * 1.3]);
  }
  instances(cone, 0x2f6272, mounts);
  const shafts = [], shaftIdx = [];
  for (let s = Track.start + 30, k = 0; s < Track.end; s += 46, k++) {
    const side = k % 2 ? 1 : -1, w = 5 + rand() * 9, lean = 26 + rand() * 14;
    Track.toWorld(s, beside(side, s, 12 + rand() * 60), p);
    const h = Track.toWorld(s, 0, q), ax = Math.sin(h), az = Math.cos(h), i = shafts.length / 3; // (as wide along the road, leaning back up it)
    shafts.push(p.x - ax * w, p.y, p.z - az * w, p.x + ax * w, p.y, p.z + az * w, p.x + ax * (w * 0.5 - lean), p.y + 95, p.z + az * (w * 0.5 - lean), p.x - ax * (w * 0.5 + lean), p.y + 95, p.z - az * (w * 0.5 + lean));
    shaftIdx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  const shaftGeo = new THREE.BufferGeometry();
  shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute(shafts, 3));
  shaftGeo.setIndex(shaftIdx);
  const light = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  light.userData.flat = true;
  light.renderOrder = 1;
  levelGroup.add(light);

  // ---- and the ones there are only a few of, in turn down the road: [maker, m off the tube, m up, turned (rad from the road's way)]
  const KINDS = [
    [makeTurtle, 9, 6, 0.2], [makeWhale, 46, 20, 0.15], [makeJellyfish, 12, 9, 0], [makeWreck, 44, 0, 0.9], [makeShark, 16, 8, Math.PI - 0.2],
    [makeChest, 9, 0, -1.2], [makeSubmarine, 32, 13, Math.PI + 0.1], [makeJellyfish, 10, 13, 0], [makeShark, 12, 5, 0.25],
  ];
  const alive = [];
  for (let s = Track.start + 90, k = 0; s < Track.end; s += 190, k++) {
    const [make, off, up, turn] = KINDS[k % KINDS.length], side = k % 2 ? 1 : -1;
    const group = make === makeJellyfish ? [0xff8fd0, 0x8fe0ff, 0xc89fff, 0xff8fd0, 0xffd08f] : [0];
    group.forEach((color, i) => {
      const at = Math.min(Track.end, s + i * 7 + rand() * 30), model = make(color);
      const h = Track.toWorld(at, beside(side, at, off + i * 5 + rand() * 6), p);
      if (!offRoads(p.x, p.z, off > 30 ? 20 : 6)) return;
      const y = p.y + up + (up ? i * 2.2 : 0);
      model.position.set(p.x, y, p.z);
      model.rotation.y = model.userData.heading = h + side * turn;
      if (make === makeJellyfish) model.scale.setScalar(1.3 + (i % 3) * 0.5);
      levelGroup.add(model);
      if (model.userData.animate) alive.push([model, y, up ? 0.6 + rand() * 0.6 : 0, rand() * 6]);
    });
  }
  // (they are kept moving by a speck that is always drawn: there is no state of the game's in any of it)
  const speck = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, -90, 0, 0.01, -90, 0, 0, -90, 0.01], 3)), new THREE.MeshBasicMaterial());
  speck.frustumCulled = false;
  speck.onBeforeRender = () => {
    const t = performance.now() / 1000;
    for (const [model, y, bob, phase] of alive) { model.userData.animate(t + phase); model.position.y = y + Math.sin(t * 0.5 + phase) * bob; }
  };
  levelGroup.add(speck);
};
