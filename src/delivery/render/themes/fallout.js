// ---- the fallout zone: the road through the exclusion zone round a power plant that has gone wrong. Dead grey-brown
// land under a sick green sky: dead trees, rubble, tufts of dead grass, a chain-link fence along both sides of the road
// hung with trefoil signs, warning posts; ash drifting down. Along the road, by the level's zones (a theme's `sets`,
// ../../themes.js: a level with none gets them in equal shares, see extras.js setsOf):
//   pylons      a line of pylons marching beside the road, their wires strung between them
//   checkpoint  an abandoned checkpoint: a guard hut each side, the booms up, sandbags, a floodlight, the board
//   plant       the plant itself off to the right: two cooling towers steaming, the reactor dome, the turbine hall, the
//               chimney, the switchyard; pipe racks along both sides of the road, and the gate
//   tankfarm    a tank farm off to the right: storage tanks, pipes between them, a flare stack burning
//   village     a dead village: derelict houses with dark windows, a church, a water tower, a bus shelter
// The haze over a radiated stretch of the whole road spreads out over the land beside it. What moves (the steam, the
// flare, the ash) keeps its own time: sceneryClock.js. Only a sight, all of it; what hurts is ../radiation.js.
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { everyFrame } from './sceneryClock.js';
import { makeKit, setsOf } from './extras.js';
import { makeTrefoilPlate, RAD } from '../radiationModels.js';
import { makeSign } from '../gambleModels.js';

const SPHERE = new THREE.SphereGeometry(0.5, 10, 7);
const PYRAMID = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);   // (a square pyramid, a metre each way)
const HILL = new THREE.ConeGeometry(0.5, 1, 9);
const PIPE = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2);      // (a pipe lying along z)
const BRANCH = [0.75, -0.75].map(a => new THREE.BoxGeometry(0.16, 2.6, 0.16).translate(0, 1.3, 0).rotateZ(a)); // (a bough out to one side)
const BOOM = new THREE.BoxGeometry(0.18, 6, 0.18).translate(0, 3, 0).rotateX(-1.15);  // (a checkpoint's boom, raised)
const TOWER = new THREE.LatheGeometry([[16, 0], [13.5, 10], [11.5, 24], [10.6, 36], [11, 48], [12.2, 58]].map(([x, y]) => new THREE.Vector2(x, y)), 22);
const FENCE = 3.4; // m off the pavement

export const fallout = ({ theme, add, instances, sideStrip, offRoads, beside, inJunction, exits, cube, tube, cone, levelGroup }) => {
  let seed = 61 + (LEVEL.id || '').length * 457;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const kit = makeKit({ instances, offRoads, levelGroup, cube });
  const p = {};
  const within = (list, s, pad, a = 'from', b = 'to') => (list || []).some(x => !x.road && x[a] !== undefined && s >= x[a] - pad && s <= x[b] + pad);
  const covered = (s, pad = 0) => within(LEVEL.tunnels, s, pad) || within(LEVEL.bridges, s, pad);
  const busy = (s, pad = 0) => covered(s, pad) || inJunction(s) || within(LEVEL.crossings, s, pad + 16, 's', 's');
  const onRamps = (s, pad = 0) => exits.some(x => s > x.exitAt - 60 - pad && s < x.exitAt + 60 + pad) || exits.some(x => s > x.mergeAt - 60 - pad && s < x.mergeAt + 60 + pad);
  const sets = setsOf(theme);
  const inSet = (name, s) => sets.some(z => z.set === name && s >= z.from && s <= z.to);
  const moving = [];

  // ---- the fence along both sides of the road, the whole way: posts, three wires and a barbed one along the top; a
  // trefoil sign hung on it now and then; and a warning post at the edge every so often
  const posts = [], wires = [], barbs = [], signs = [];
  for (const side of [-1, 1]) {
    let last = null;
    for (let s = Track.start + 3, k = 0; s < Track.end - 2; s += 6, k++) {
      if (busy(s, 2) || onRamps(s, 10)) { last = null; continue; }
      const lat = beside(side, s, FENCE);
      posts.push([s, lat, 1.2, 0.12, 2.4, 0.12]);
      if (last) {
        for (const y of [0.7, 1.4, 2.1]) wires.push([last[0], last[1], y, 0.04, 0.04, 1, [s, lat]]);
        barbs.push([last[0], last[1] + side * 0.12, 2.45, 0.05, 0.05, 1, [s, lat + side * 0.12]]);
      }
      last = [s, lat];
      if (k % 12 === (side > 0 ? 3 : 9)) signs.push([s, lat]);
    }
  }
  instances(tube, 0x6b7076, posts);
  instances(cube, 0x9aa0a4, wires);
  instances(cube, 0x4a4e52, barbs);
  for (const [s, lat] of signs) {
    const plate = makeTrefoilPlate(0.8);
    const h = Track.toWorld(s, lat, p);
    plate.position.set(p.x, p.y + 1.5, p.z);
    plate.rotation.y = h + (lat < 0 ? -Math.PI / 2 : Math.PI / 2); // (facing the road)
    levelGroup.add(plate);
  }

  // ---- the dead land: tufts of dead grass, dead trees, rubble; and the hills far off
  const tufts = [], trunks = [], boughs = [[], []], rubble = [], stones = [];
  for (let s0 = Track.start + 2; s0 < Track.end - 2; s0 += 9) {
    for (const side of [-1, 1]) {
      const s = s0 + rand() * 7;
      if (covered(s, 10)) continue;
      const village = inSet('village', s), plant = inSet('plant', s);
      for (let k = 0; k < 2; k++) {
        const d = FENCE + 1.5 + rand() * rand() * 60;
        tufts.push([s + rand() * 5, beside(side, s, d), 0.25, 0.8 + rand() * 0.8, 0.5 + rand() * 0.6, 0.8 + rand() * 0.8]);
      }
      const roll = rand();
      if (roll < 0.3 && !plant) { // a dead tree, bare
        const d = FENCE + 3 + rand() * (village ? 10 : 36), q = s + rand() * 4, h = 4.5 + rand() * 4, lat = beside(side, q, d);
        trunks.push([q, lat, h / 2, 0.3 + rand() * 0.2, h, 0.3 + rand() * 0.2]);
        boughs[k2(rand())].push([q, lat, h * (0.55 + rand() * 0.25), 1, 0.7 + rand() * 0.5, 1]);
        if (rand() < 0.6) boughs[k2(rand())].push([q, lat, h * (0.35 + rand() * 0.25), 1, 0.6 + rand() * 0.4, 1]);
      } else if (roll < 0.42 && !village) { // rubble: a heap and a few stones
        const d = FENCE + 2 + rand() * 20, q = s + rand() * 4, r = 1.5 + rand() * 3;
        rubble.push([q, beside(side, q, d), r * 0.22, r * 2, r * 0.45, r * 2]);
        for (let k = 0; k < 3; k++) stones.push([q + (rand() - 0.5) * r * 2.4, beside(side, q, d + (rand() - 0.5) * r * 2.4), 0.25, 0.5 + rand() * 0.6, 0.4 + rand() * 0.4, 0.5 + rand() * 0.6]);
      }
    }
  }
  instances(cone, 0x8a8260, tufts);
  instances(tube, 0x3a332c, trunks);
  BRANCH.forEach((geo, i) => instances(geo, 0x3a332c, boughs[i]));
  instances(cone, 0x55504a, rubble);
  instances(cube, 0x6a655d, stones);
  const hills = [];
  for (let s = Track.start - 100; s < Track.end + 150; s += 95) {
    for (const side of [-1, 1]) {
      const q = Math.max(Track.start, Math.min(Track.end, s)), r = 50 + rand() * 70, h = 22 + rand() * 30, d = 260 + r * 0.5 + rand() * 120;
      Track.toWorld(q, beside(side, q, d), p);
      if (!offRoads(p.x, p.z, r) || Track.mainDistance(p.x, p.z) < d - 25) continue;
      hills.push([s, beside(side, q, d), h / 2 - 12, r * 2, h + 24, r * 2]);
    }
  }
  instances(HILL, 0x5a6048, hills, false, 20);

  // ---- the haze of a radiated stretch of the whole road, spreading over the land beside it
  const haze = new THREE.MeshBasicMaterial({ color: RAD.haze, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  for (const a of LEVEL.radiation || []) {
    if (a.lanes || a.road) continue;
    for (const side of [-1, 1]) add(sideStrip(a.from, a.to, (s) => beside(side, s, 0), (s) => beside(side, s, 28), 0.04, 4), haze);
  }

  // ---- the sets along the road
  const steelDark = 0x5a6066, steel = 0x8a9096, rust = 0x7a4a2a, concrete = 0xb9b6ae;
  for (const z of sets) {
    const mid = (z.from + z.to) / 2;
    if (z.set === 'pylons') { // a line of them along the left, 45 m out, wires strung from one to the next
      let last = null;
      for (let s = z.from + 40; s < z.to - 20; s += 110) {
        if (covered(s, 20)) { last = null; continue; }
        const at = kit.point(s, beside(-1, s, 45));
        if (!kit.at(steelDark, PYRAMID, at.x, at.y + 15, at.z, 7, 30, 7, at.h, false, 6)) { last = null; continue; }
        for (const y of [20, 25]) kit.at(steelDark, cube, at.x, at.y + y, at.z, y === 20 ? 11 : 8, 0.5, 0.5, at.h, false, -1);
        if (last) {
          for (const [dx, y] of [[-5, 20], [5, 20], [-3.5, 25], [3.5, 25]]) {
            const a = kit.point(last.s, beside(-1, last.s, 45 - dx), y - 0.6), b = kit.point(s, beside(-1, s, 45 - dx), y - 0.6);
            kit.span(0x2a2c30, a, b, 0.1, 0.1);
          }
        }
        last = { s };
      }
    } else if (z.set === 'checkpoint') { // at the start of the stretch: the booms up, a hut and sandbags each side, a light, the board
      const s = z.from + 30;
      if (!busy(s, 12) && !onRamps(s, 20)) {
        for (const side of [-1, 1]) {
          const lat = beside(side, s, 1.4);
          kit.of(0x8c8a80).push([s + side * 2, lat + side * 1.6, 1.4, 3, 2.8, 3]);
          kit.of(0x55524a).push([s + side * 2, lat + side * 1.6, 2.95, 3.6, 0.3, 3.6]);
          kit.of(0x1d2024).push([s + side * 2 - 1.51, lat + side * 1.6, 1.6, 0.06, 1, 1.2]);
          kit.of(0xd8262b, BOOM).push([s - 2, beside(side, s - 2, 0.9), 1.0, 1, 1, 1]);
          kit.of(0xf4f4f4).push([s - 2, beside(side, s - 2, 0.9), 0.5, 0.4, 1, 0.4]);
          for (let k = 0; k < 7; k++) for (let row = 0; row < 2; row++) kit.of(0x9a8a62, SPHERE).push([s - 6 + k * 0.9 + row * 0.45, lat + side * (0.6 + row * 0.15), 0.25 + row * 0.42, 0.9, 0.5, 0.6]);
          kit.of(0xffd23f).push([s + 6, lat + side * 0.5, 0.5, 1.2, 1, 1.2]);
          kit.of(0x16181c).push([s + 6, lat + side * 0.5, 0.75, 1.24, 0.25, 1.24]);
        }
        kit.of(steel, tube).push([s + 4, beside(1, s + 4, 4.5), 4.5, 0.3, 9, 0.3]);
        kit.of(0x2a2c30).push([s + 4, beside(1, s + 4, 4.5), 9.2, 1.2, 0.5, 0.6]);
        const board = makeSign('CHECKPOINT\nEXCLUSION ZONE: NO ENTRY', '#ffd23f', '#111', 6.4, 2.6);
        board.rotation.y = Track.toWorld(s - 40, beside(1, s - 40, 0.8), p);
        board.position.set(p.x, p.y, p.z);
        board.children[1].scale.x = Track.mirrored ? -1 : 1; // (mirrored back on a left-hand level, so it still reads)
        levelGroup.add(board);
      }
    } else if (z.set === 'plant') { // the plant off to the right, pipe racks along the road, the gate
      const towers = [[mid - 60, 150], [mid + 10, 175]];
      for (const [s, d] of towers) {
        const at = kit.point(s, beside(1, s, d));
        if (!kit.at(concrete, TOWER, at.x, at.y, at.z, 1, 1, 1, 0, false, 20)) continue;
        for (let k = 0; k < 4; k++) { // the steam over it
          const puff = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color: 0xeef2ea, transparent: true, opacity: 0.55, depthWrite: false }));
          puff.userData = { x: at.x, y: at.y + 58, z: at.z, k, drift: Math.sin(at.h) * 0.6, driftZ: Math.cos(at.h) * 0.6 };
          levelGroup.add(puff);
          moving.push(puff);
        }
      }
      const dome = kit.point(mid - 140, beside(1, mid - 140, 110));
      if (kit.at(0x9aa0a6, tube, dome.x, dome.y + 7, dome.z, 38, 14, 38, 0, false, 22)) kit.at(0xc4c8cc, SPHERE, dome.x, dome.y + 14, dome.z, 38, 30, 38, 0, false, -1);
      const hall = kit.point(mid - 140, beside(1, mid - 140, 72));
      if (kit.at(0x8a8f94, cube, hall.x, hall.y + 8, hall.z, 28, 16, 70, hall.h, false, 16)) kit.at(0x5a5f64, cube, hall.x, hall.y + 16.4, hall.z, 29, 0.8, 71, hall.h, false, -1);
      const stack = kit.point(mid + 60, beside(1, mid + 60, 120));
      if (kit.at(0xb0b4b8, tube, stack.x, stack.y + 47, stack.z, 4, 94, 4, 0, false, 4)) for (const y of [80, 90]) kit.at(0xd8262b, tube, stack.x, stack.y + y, stack.z, 4.3, 3, 4.3, 0, false, -1);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { // the switchyard: a grid of frames
        const s = mid + 90 + i * 12, at = kit.point(s, beside(1, s, 60 + j * 12));
        if (!kit.at(steel, cube, at.x, at.y + 4.5, at.z, 0.4, 9, 0.4, at.h, false, 3)) continue;
        kit.at(steel, cube, at.x, at.y + 9, at.z, 10, 0.4, 0.4, at.h, false, -1);
        kit.at(0x3a3c40, cube, at.x, at.y + 1.2, at.z, 1.6, 2.4, 1.2, at.h, false, -1);
      }
      for (const side of [-1, 1]) { // the pipe racks, outside the fence
        let last = null;
        for (let s = z.from + 20; s < z.to - 10; s += 10) {
          if (busy(s, 6) || onRamps(s, 12)) { last = null; continue; }
          const lat = beside(side, s, FENCE + 4.6);
          for (const dx of [-1.3, 1.3]) kit.of(steelDark).push([s, lat + dx, 2, 0.3, 4, 0.3]);
          kit.of(steelDark).push([s, lat, 4, 3.4, 0.25, 0.25]);
          if (last) [[-1.1, 0xb8bec4, 0.5], [0, 0xd9c33a, 0.4], [1.1, 0x8a5a3a, 0.5]].forEach(([dx, color, r]) => kit.of(color, PIPE).push([last[0], last[1] + dx, 4.45, r, r, 1, [s, lat + dx]]));
          last = [s, lat];
        }
      }
      const gate = z.from + 60; // the gate: two pillars and a board, on the right, where the plant's fence would open
      if (!busy(gate, 10)) {
        for (const dz of [-4, 4]) kit.of(concrete).push([gate + dz, beside(1, gate, FENCE), 1.8, 0.8, 3.6, 0.8]);
        const board = makeSign('POWER STATION\nKEEP OUT', '#f4f4f4', '#c1121f', 6, 2.4);
        board.rotation.y = Track.toWorld(gate, beside(1, gate, FENCE + 0.8), p);
        board.position.set(p.x, p.y, p.z);
        board.children[1].scale.x = Track.mirrored ? -1 : 1;
        levelGroup.add(board);
      }
    } else if (z.set === 'tankfarm') { // tanks off to the right, pipes between them, a flare
      let prev = null;
      for (let k = 0, s = z.from + 50; s < z.to - 30 && k < 6; s += 46, k++) {
        const d = 24 + (k % 2) * 20, at = kit.point(s, beside(1, s, d)), r = 7 + (k % 3);
        if (!kit.at(0xcfd3d6, tube, at.x, at.y + 3.5, at.z, r * 2, 7, r * 2, 0, false, r + 2)) continue;
        kit.at(0x8a8f94, tube, at.x, at.y + 7.2, at.z, r * 2 + 0.4, 0.5, r * 2 + 0.4, 0, false, -1);
        kit.at(0xa9adb0, cube, at.x, at.y + 7.6, at.z, 1.2, 0.6, r * 2, at.h, false, -1); // (the walkway over it)
        if (prev) kit.span(0xb8bec4, { x: prev.x, y: prev.y + 1.2, z: prev.z }, { x: at.x, y: at.y + 1.2, z: at.z }, 0.5, 0.5, false, PIPE);
        prev = at;
      }
      const flare = kit.point(z.to - 40, beside(1, z.to - 40, 30));
      if (kit.at(steel, tube, flare.x, flare.y + 12, flare.z, 1.2, 24, 1.2, 0, false, 3)) {
        const flame = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xff8a1e }));
        flame.position.set(flare.x, flare.y + 26, flare.z);
        flame.scale.set(2.4, 4.5, 2.4);
        flame.userData = { flare: true, y: flare.y + 26 };
        levelGroup.add(flame);
        moving.push(flame);
      }
    } else if (z.set === 'village') { // derelict houses each side, a church, a water tower, a bus shelter
      const walls = [0x9a9484, 0x8a7f72, 0x7f8a7a, 0xa09a8a], roofs = [0x4f4a44, 0x5e4a3a];
      let n = 0;
      for (let s = z.from + 20; s < z.to - 20; s += 28 + rand() * 14, n++) {
        for (const side of [-1, 1]) {
          if (rand() < 0.25 || busy(s, 8) || onRamps(s, 14)) continue;
          const d = FENCE + 6 + rand() * 14, lat = beside(side, s, d), w = 6 + rand() * 3, l = 6 + rand() * 4, h = 3.2 + rand() * 1.2;
          kit.of(walls[n % 4]).push([s, lat, h / 2, w, h, l]);
          kit.of(roofs[n % 2], PYRAMID).push([s, lat, h + 1.1, w + 1, 2.2, l + 1]);
          for (const dz of [-l * 0.28, l * 0.28]) kit.of(0x1d2024).push([s + dz, lat - side * (w / 2 + 0.02), h * 0.55, 0.06, 1.1, 1.1]); // (the windows, dark, facing the road)
          kit.of(0x1d2024).push([s, lat - side * (w / 2 + 0.02), 1, 0.06, 2, 1]);
          if (rand() < 0.5) kit.of(0x2a2c30, tube).push([s + l * 0.3, lat + side * w * 0.3, h + 2.6, 0.5, 1.4, 0.5]); // (a chimney)
        }
      }
      const church = kit.point(mid, beside(-1, mid, FENCE + 12));
      if (kit.at(0xa8a194, cube, church.x, church.y + 3.5, church.z, 9, 7, 18, church.h, false, 8)) {
        kit.at(0x4a4540, PYRAMID, church.x, church.y + 8.5, church.z, 10, 3, 19, church.h, false, -1);
        const spire = kit.point(mid - 11, beside(-1, mid - 11, FENCE + 12));
        kit.at(0xa8a194, cube, spire.x, spire.y + 6, spire.z, 4, 12, 4, spire.h, false, 4);
        kit.at(0x4a4540, PYRAMID, spire.x, spire.y + 15, spire.z, 4.4, 6, 4.4, spire.h, false, -1);
      }
      const tower = kit.point(z.from + 40, beside(1, z.from + 40, FENCE + 16));
      if (kit.at(0x8a8f94, tube, tower.x, tower.y + 13.5, tower.z, 7, 5, 7, 0, false, 6)) for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) kit.at(0x4a4e52, cube, tower.x + dx, tower.y + 5.5, tower.z + dz, 0.4, 11, 0.4, 0, false, -1);
      const stop = z.to - 60;
      if (!busy(stop, 6) && !onRamps(stop, 12)) {
        kit.of(0x8a8f94).push([stop, beside(1, stop, 1.2), 2.5, 1.6, 0.15, 4]);
        for (const dz of [-1.8, 1.8]) kit.of(0x8a8f94).push([stop + dz, beside(1, stop, 2.0), 1.25, 0.12, 2.5, 0.12]);
        kit.of(0x3a3c40).push([stop, beside(1, stop, 2.0), 0.6, 0.6, 0.1, 3.4]);
      }
    }
  }
  kit.draw();

  // ---- ash coming down all round the camera
  const BOX = 60, points = [];
  for (let i = 0; i < 900; i++) points.push((rand() - 0.5) * BOX * 2, rand() * BOX, (rand() - 0.5) * BOX * 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const mat = new THREE.PointsMaterial({ color: 0xd9dfcc, size: 0.2, transparent: true, opacity: 0.8, depthWrite: false });
  const falls = [0, 1].map(layer => { const fall = new THREE.Points(geo, mat); fall.frustumCulled = false; fall.userData = { layer }; levelGroup.add(fall); return fall; });

  everyFrame(levelGroup, (t, x, y, z) => {
    for (const fall of falls) {
      const down = (t * 1.1 + fall.userData.layer * BOX) % (BOX * 2);
      fall.position.set(x + Math.sin(t / 4) * 4, y + BOX - down, z);
    }
    for (const m of moving) {
      const u = m.userData;
      if (u.flare) { m.scale.set(2.2 + 0.5 * Math.sin(t * 9), 4 + 1.2 * Math.sin(t * 7 + 1), 2.2 + 0.5 * Math.cos(t * 8)); m.position.y = u.y + m.scale.y / 2; continue; }
      const w = ((t * 0.12 + u.k / 4) % 1), size = 16 + w * 26;
      m.position.set(u.x + u.drift * w * 40, u.y + w * 55 + size * 0.3, u.z + u.driftZ * w * 40);
      m.scale.set(size, size * 0.8, size);
      m.material.opacity = 0.55 * (1 - w) * Math.min(1, w * 6);
    }
  });
};
const k2 = (r) => (r < 0.5 ? 0 : 1);
