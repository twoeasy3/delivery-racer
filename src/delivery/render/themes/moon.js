// ---- moon base: grey regolith under a black sky, the stars out and the Earth hanging in it. A road of compacted
// dust, a marker post with an amber lamp every 30 m; beside it craters of every size (a rim, a darker floor),
// boulders, the tracks of rovers; and the base, a piece at a time down the road: domes with lit windows and an
// air-lock, habitat tubes on legs, fields of solar panels, tank farms, a greenhouse, tracking dishes, a lander
// with its flag, a rover and its astronaut, a rocket on its pad; ridges all round, out where the light gives out.
// (There is no air: nothing is hazy, the dark is the horizon.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { makeDish, makeLander, makeRover, makeRocket, makeGreenhouse, makeEarth } from './moonModels.js';

export const moon = ({ add, flat, instances, sideStrip, offRoads, beside, inJunction, exits, cube, tube, cone, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 5 + (LEVEL.id || '').length * 149;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {};
  const roads = [[Track.start, Track.end], ...exits.map(x => [x.side0, x.sideEnd])];

  // ---- the sky: stars all round and the Earth, which travel with the camera so they never get nearer
  const points = [];
  for (let i = 0; i < 1500; i++) {
    const a = rand() * Math.PI * 2, y = rand() * 1.1 - 0.1, r = Math.sqrt(Math.max(0, 1 - y * y));
    points.push(Math.cos(a) * r * 600, y * 600, Math.sin(a) * r * 600);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, depthWrite: false }));
  stars.frustumCulled = false;
  stars.renderOrder = -3;
  const earth = makeEarth(50);
  const h0 = Track.toWorld(Track.start, 0, p); // (ahead of the start line and a little to the left, low over the horizon)
  const away = new THREE.Vector3(Math.sin(h0 - 0.3) * 540, 125, Math.cos(h0 - 0.3) * 540);
  earth.rotation.y = h0 + Math.PI;
  stars.onBeforeRender = (renderer, scene, camera) => {
    stars.position.copy(camera.position);
    if (scene.scale.x < 0) stars.position.x = -stars.position.x; // (in the scene's own terms)
    stars.updateMatrixWorld();
    earth.position.copy(stars.position).add(away);
  };
  levelGroup.add(stars, earth);

  // ---- the road's own: a marker post each side every 30 m, an amber lamp on it
  const posts = [], lamps = [];
  for (const [from, to] of roads) {
    for (let s = from + 15; s < to; s += 30) {
      if (inJunction(s) || Track.onBridge(s) || Track.tunnel(s) > 0) continue;
      for (const side of [-1, 1]) { const lat = beside(side, s, 0.8); posts.push([s, lat, 0.6, 0.14, 1.2, 0.14]); lamps.push([s, lat, 1.3, 0.3, 0.22, 0.3]); }
    }
  }
  instances(cube, 0x4a4c52, posts);
  instances(cube, 0xffb53a, lamps, true);

  // ---- rover tracks in the dust, wandering along beside the road
  const rut = flat(0x74757b);
  for (let s = Track.start + 40, n = 0; s < Track.end - 200; s += 380, n++) {
    const side = n % 2 ? 1 : -1, d = 9 + rand() * 8, wave = (q) => d + Math.sin(q / 37 + n) * 3.5 + Math.sin(q / 11) * 0.6;
    for (const g of [0, 2.4]) add(sideStrip(s, s + 300, (q) => beside(side, q, wave(q) + g), (q) => beside(side, q, wave(q) + g + 0.5), 0.03, 4), rut);
  }

  // ---- craters and boulders, a lot every 30 m each side; and now and then a field of small ones
  const RIM = new THREE.TorusGeometry(0.5, 0.075, 5, 22).rotateX(Math.PI / 2), FLOOR = new THREE.CylinderGeometry(0.5, 0.5, 1, 22), ROCK = new THREE.DodecahedronGeometry(0.5, 0);
  const rims = [], floors = [], rocks = [[], []];
  // (not where a piece of the base stands, below: there they keep well back, beyond it)
  const EVERY = 150, FIRST = Track.start + 70;
  const built = (s, side) => {
    const n = Math.floor((s - FIRST) / EVERY), u = s - FIRST - n * EVERY, base = n % 2 ? -1 : 1;
    return side === base ? u < 85 : u > 125 || (u > 40 && u < 105);
  };
  // (never on the road: a hairpin brings the road back past what was laid beside it the first time. A thing beside
  // its own stretch is always further off than this, so a level without hairpins is laid out as it was; a side road's are left as they were)
  const spot = {}, onRoad = (s, lat, r) => { if (!Track.isMain(s)) return false; Track.toWorld(s, lat, spot); return Track.mainDistance(spot.x, spot.z) < Math.max(Track.hi(s), -Track.lo(s)) + r + 2; };
  const crater = (s, lat, r) => { if (onRoad(s, lat, r)) return; rims.push([s, lat, 0, r * 2, r * 1.1, r * 2]); floors.push([s, lat, 0.04, r * 1.78, 0.08, r * 1.78]); };
  for (const [from, to] of roads) {
    for (let s0 = from + 6; s0 < to - 6; s0 += 30) {
      for (const side of [-1, 1]) {
        const s = s0 + rand() * 20, roll = rand(), far = from === Track.start && built(s, side) ? 78 + rand() * 40 : 4 + rand() * rand() * 70;
        if (roll < 0.45) { const r = 2.5 + rand() * rand() * 20; crater(s, beside(side, s, far + r), r); }
        else if (roll < 0.6) { for (let k = 0; k < 5; k++) { const r = 1 + rand() * 2.2; crater(s + (rand() - 0.5) * 26, beside(side, s, far + r + rand() * 18), r); } }
        else {
          const r = 1.5 + rand() * rand() * 7, lat = beside(side, s, far + r);
          if (!onRoad(s, lat, r * 0.6)) rocks[0].push([s, lat, r * 0.3, r, r * 0.85, r * 1.15]);
          for (let k = 0; k < 4; k++) { const m = 0.5 + rand() * 1.4; rocks[k % 2].push([s + (rand() - 0.5) * (r * 2 + 6), lat + (rand() - 0.5) * (r * 2 + 6), m * 0.3, m, m * 0.8, m]); }
        }
      }
    }
  }
  instances(RIM, 0xa4a5ab, rims, false, 1);
  instances(FLOOR, 0x505157, floors, false, 1);
  instances(ROCK, 0x7b7c83, rocks[0], false, 1);
  instances(ROCK, 0x5f6067, rocks[1], false, 1);

  // ---- the base, a piece every 150 m, on one side then the other: instanced where there is a lot of a thing
  const DOME = new THREE.SphereGeometry(0.5, 20, 9, 0, Math.PI * 2, 0, Math.PI / 2), LIE = new THREE.CylinderGeometry(0.5, 0.5, 1, 16).rotateX(Math.PI / 2);
  const CAP = new THREE.SphereGeometry(0.5, 14, 10), PANEL = new THREE.BoxGeometry(1, 0.06, 1).rotateX(-0.6);
  const domes = [], rings = [], windows = [], locks = [], doors = [], habs = [], caps = [], legs = [], links = [], panels = [], stands = [], tanks = [[], []], pads = [];
  const MAKERS = [makeDish, makeLander, makeRover, makeRocket, makeGreenhouse];
  const alive = [];
  const stand = (make, s, side, off, turn) => {
    const model = make(), h = Track.toWorld(s, beside(side, s, off), p);
    if (!offRoads(p.x, p.z, 14)) return;
    model.position.set(p.x, p.y, p.z);
    model.rotation.y = h + turn;
    levelGroup.add(model);
    if (model.userData.animate) alive.push(model);
  };
  for (let s = FIRST, n = 0; s < Track.end - 20; s += EVERY, n++) {
    const side = n % 2 ? -1 : 1, kind = n % 9, toRoad = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    if (kind === 0 || kind === 5) { // a dome and a smaller one, a tube between them, windows lit all round, an air-lock towards the road
      const r = 11 + rand() * 5, lat = beside(side, s, 16 + r);
      for (const [q, l, rr] of [[s, lat, r], [s + r + 15, lat + side * 5, r * 0.62]]) {
        domes.push([q, l, 0.8, rr * 2, rr * 1.7, rr * 2]);
        rings.push([q, l, 0.5, rr * 2 + 1.2, 1, rr * 2 + 1.2]);
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; windows.push([q + Math.cos(a) * rr * 0.93, l + Math.sin(a) * rr * 0.93, 2.6, 0.9, 1.1, 0.9]); }
      }
      links.push([s + r - 2, lat + side * 2, 2.2, 3.4, 3.4, 1, [s + r + 15 - r * 0.5, lat + side * 5]]);
      locks.push([s, lat - side * (r + 1), 2.2, 6, 4.4, 5]);
      doors.push([s, lat - side * (r + 4.05), 1.9, 0.12, 3, 2.6]);
    } else if (kind === 1 || kind === 6) { // habitat tubes on legs, end to end, a lit port in each
      const lat = beside(side, s, 14 + rand() * 6);
      for (let k = 0; k < 3; k++) {
        const q = s + k * 26, l = lat + 3;
        habs.push([q, l, 4.4, 6, 6, 22]);
        caps.push([q - 11, l, 4.4, 5.9, 5.9, 3], [q + 11, l, 4.4, 5.9, 5.9, 3]);
        for (const e of [-7, 7]) for (const w of [-2, 2]) legs.push([q + e, l + w, 1, 0.4, 2, 0.4]);
        for (const e of [-6, 0, 6]) windows.push([q + e, l - side * 2.95, 5, 0.3, 1.1, 1.4]);
        if (k) links.push([q - 15, l, 4.4, 2.6, 2.6, 4]);
      }
    } else if (kind === 2 || kind === 7) { // a field of solar panels, all tilted the one way
      const lat = beside(side, s, 10);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
        panels.push([s + j * 8, lat + side * (4 + i * 8), 2.6, 6.4, 6.4, 6.4]);
        stands.push([s + j * 8, lat + side * (4 + i * 8), 1.2, 0.3, 2.4, 0.3]);
      }
    } else if (kind === 3) { // a tank farm: spheres on a pad
      const lat = beside(side, s, 12);
      pads.push([s + 8, lat + side * 9, 0.15, 30, 0.3, 36]);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
        tanks[(i + j) % 2].push([s + j * 9, lat + side * (4 + i * 10), 4.2, 6.6, 6.6, 6.6]);
        for (const e of [-2, 2]) for (const w of [-2, 2]) legs.push([s + j * 9 + e, lat + side * (4 + i * 10) + w, 0.8, 0.3, 1.6, 0.3]);
      }
    }
    // (and with each, one of the few: a dish, a lander, a rover, a rocket well back, a greenhouse)
    const make = MAKERS[n % MAKERS.length];
    stand(make, s + 62 + rand() * 20, -side, make === makeRocket ? 50 : make === makeGreenhouse ? 20 : 12 + rand() * 8, make === makeRover ? rand() * 6 : toRoad * -1);
  }
  instances(DOME, 0xe9ebef, domes, false, 2);
  instances(tube, 0x8d9098, rings, false, 2);
  instances(cube, 0xfff0b0, windows, true);
  instances(cube, 0xc9ccd3, locks, false, 1);
  instances(cube, 0xffb53a, doors, true);
  instances(LIE, 0xe9ebef, habs, false, 1);
  instances(CAP, 0xd3d6dc, caps, false, 1);
  instances(cube, 0x6f737b, legs);
  instances(LIE, 0xb9bcc4, links, false, 1);
  instances(PANEL, 0x2a55b8, panels, false, 1);
  instances(cube, 0x6f737b, stands);
  instances(CAP, 0xe9ebef, tanks[0], false, 1);
  instances(CAP, 0xe08a2a, tanks[1], false, 1);
  instances(cube, 0x9a9ba1, pads, false, 1);

  // ---- ridges all round, out where the light gives out
  const ridges = [[], []];
  for (let s = Track.start - 150, k = 0; s < Track.end + 150; s += 95, k++) {
    const side = k % 2 ? 1 : -1, at = Math.max(Track.start, Math.min(Track.end, s)), r = 90 + rand() * 120, lat = beside(side, at, 135 + r / 2 + rand() * 110);
    Track.toWorld(at, lat, p);
    if (offRoads(p.x, p.z, r / 2 + 10) && Track.mainDistance(p.x, p.z) > r / 2 + 70) { const tall = r * (0.3 + rand() * 0.4); ridges[k % 4 < 2 ? 0 : 1].push([s, lat, tall / 2 - 2, r, tall, r * 1.6]); }
  }
  instances(cone, 0x8f9096, ridges[0]);
  instances(cone, 0x7c7d84, ridges[1]);

  // (the few are kept moving by the stars, which are always drawn: there is no state of the game's in any of it)
  const follow = stars.onBeforeRender;
  stars.onBeforeRender = (...all) => { follow(...all); const t = performance.now() / 1000; for (const model of alive) model.userData.animate(t); };
};
