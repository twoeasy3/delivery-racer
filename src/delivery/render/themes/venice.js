// ---- venice: the road is a quay. The ground is the lagoon's water, and everything else is built on it here:
// on the left, a pavement and a wall of palazzi shoulder to shoulder (washed ochre, pink and brick red, white
// stone round the windows, a balcony at the piano nobile, green shutters, tiled roofs, chimneys with their
// upturned pots); on the right the canal, a white stone edge to the quay, striped mooring poles, gondolas tied up
// and gondolas rowed, vaporetti and water taxis, humped footbridges over to the far bank, where the palazzi stand
// straight out of the water. Where the road humps (a level's segments, their "grade") it is a bridge: the land
// road.js lays under a hilly road is hidden, a side canal runs through under it, and the bridge gets its walls and
// its parapets (a drawbridge has its canal too). A tunnel is a sotoportego, the road going under a building. A
// third of the way down, a piazza opens on the left: the campanile, the church's domes, an arcade along the back,
// two columns at the water. Along a tide's stretch (acqua alta) the far bank is gone: the open lagoon, and an
// island with a church across the water. More campanili stand on the skyline. (The models: veniceModels.js.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { makeGondola, makeVaporetto, makeWaterTaxi, makeFootbridge, makeCampanile, makeDomedChurch } from './veniceModels.js';

const WASH = [0xd9a066, 0xc9664a, 0xe0b48c, 0xe6cf9a, 0xd98c7a, 0xefe0c0, 0xc98a5a, 0xdcb0a0];
const QUAY = 5, CANAL0 = 1.4, CANAL1 = 30; // m from the pavement: the left quay's depth; the canal's near edge and its far bank, on the right

export const venice = ({ theme, add, flat, instances, sideStrip, buildStrip, offRoads, clearOfRoads, beside, cube, tube, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 23 + (LEVEL.id || '').length * 113;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {};
  const SPHERE = new THREE.SphereGeometry(0.5, 10, 7), POT = new THREE.ConeGeometry(0.5, 1, 10).rotateX(Math.PI);
  const height = (s) => { Track.toWorld(s, 0, p); return p.y; };

  // ---- the land under a hilly road (road.js: its ribbon and its banks, in the ground's colour) is hidden: here the
  // ground is water, and a road that rises is a bridge over it
  const water = new THREE.Color(theme.ground).getHex(), bank = new THREE.Color(theme.ground).multiplyScalar(0.8).getHex();
  for (const m of levelGroup.children) if (m.isMesh && m.renderOrder !== -2 && m.material && m.material.color && (m.material.color.getHex() === water || m.material.color.getHex() === bank)) m.visible = false;

  // ---- where a side canal crosses: under every hump, and under every drawbridge. [from, to, hump]
  const gaps = [];
  let open = null;
  for (let s = Track.start; s <= Track.end; s += 2) {
    const up = height(s) > 0.15;
    if (up && open === null) open = s;
    if (!up && open !== null) { gaps.push([open - 2, s + 2, true]); open = null; }
  }
  if (open !== null) gaps.push([open - 2, Track.end, true]);
  for (const d of LEVEL.drawbridges || []) if (!d.road) gaps.push([d.s - 19, d.s + 19, false]);
  gaps.sort((a, b) => a[0] - b[0]);
  const inGap = (s, pad = 0) => gaps.some(([a, b]) => s > a - pad && s < b + pad);
  const ranges = [];
  let from = Track.start;
  for (const [a, b] of gaps) { if (a > from) ranges.push([from, a]); from = Math.max(from, b); }
  if (from < Track.end) ranges.push([from, Track.end]);
  const tunnels = LEVEL.tunnels || [];
  const inTunnel = (s, pad = 0) => tunnels.some(t => s > t.from - pad && s < t.to + pad);
  const tide = LEVEL.tide || null;
  const lagoon = (s, pad = 0) => !!tide && s > tide.from - 30 - pad && s < tide.to + 30 + pad;
  // the piazza, on the left, if there is level, open road for it
  let P0 = Math.round(Track.length * 0.3), P1 = P0 + 150;
  if (inGap(P0, 20) || inGap(P1, 20) || inGap((P0 + P1) / 2, 20) || inTunnel(P0, 20) || inTunnel(P1, 20) || P1 > Track.end - 50) P0 = P1 = -1;
  const inPiazza = (s, pad = 0) => s > P0 - pad && s < P1 + pad;

  const put = (model, s, lat, turn = 0, margin = 3, y = 0) => {
    const h = Track.toWorld(s, lat, p);
    if (!offRoads(p.x, p.z, margin)) return null;
    model.position.set(p.x, y, p.z); // (on the water, wherever the road is)
    model.rotation.y = h + turn;
    levelGroup.add(model);
    return model;
  };

  // ---- the quay: a pavement on the left under the palazzi, a white stone edge and a dark drop to the water on the right
  for (const [a, b] of ranges) {
    add(sideStrip(a, b, (s) => beside(-1, s, -0.15), (s) => beside(-1, s, QUAY + 17), 0.03, 4), flat(0xb5ad9e));
    add(sideStrip(a, b, (s) => beside(1, s, -0.15), (s) => beside(1, s, 0.8), 0.05, 4), flat(0xece5d4));
    add(sideStrip(a, b, (s) => beside(1, s, 0.8), (s) => beside(1, s, CANAL0), 0.02, 4), flat(0x2c4644));
  }
  // light on the water: pale streaks, along the canal and out over the lagoon
  const sheen = new THREE.MeshBasicMaterial({ color: 0x86c4b8, side: THREE.DoubleSide });
  for (let s = Track.start; s < Track.end - 16; s += 9) {
    if (inGap(s, 16)) continue;
    const out = lagoon(s) ? 3 + rand() * 150 : 3 + rand() * (CANAL1 - 5), len = 5 + rand() * 9;
    add(buildStrip(s, s + len, (t) => beside(1, t, out), (t) => beside(1, t, out + 0.45), 0.01, 4), sheen);
  }

  // ---- palazzi
  const walls = WASH.map(() => []), plain = WASH.map(() => []), roofs = [], bases = [], frames = [], panes = [], shutters = [], balconies = [], doors = [], chimneys = [], pots = [], algae = [], flowers = [];
  const palazzo = (mid, w, side, near, onWater) => {
    const d = 10 + rand() * 5, h = 10.6 + Math.floor(rand() * 3) * 3.4, c = Math.floor(rand() * WASH.length);
    const lat = beside(side, mid, near + d / 2), front = lat - side * (d / 2 + 0.06);
    Track.toWorld(mid, lat, p);
    if (!offRoads(p.x, p.z, 8)) return;
    walls[c].push([mid, lat, h / 2, d, h, w]);
    roofs.push([mid, lat, h + 0.3, d + 1, 0.6, w + 0.6]);
    bases.push([mid, front, 0.7, 0.14, 1.4, w]);
    if (onWater) algae.push([mid, front - side * 0.06, 0.22, 0.16, 0.44, w]);
    doors.push([mid + (rand() - 0.5) * w * 0.3, front, 1.7, 0.2, 3.4, 1.9]);
    const n = w > 11.5 ? 4 : 3; // the piano nobile: a row of tall windows close together in one white frame, a balcony under it
    frames.push([mid, front, 6.3, 0.18, 3.5, n * 1.3 + 0.5]);
    for (let k = 0; k < n; k++) panes.push([mid + (k - (n - 1) / 2) * 1.3, front - side * 0.05, 6.2, 0.2, 2.7, 0.8]);
    balconies.push([mid, front - side * 0.55, 4.6, 1, 0.22, n * 1.3 + 1.2], [mid, front - side * 1, 5.1, 0.12, 0.8, n * 1.3 + 1.2]);
    for (const e of [-1, 1]) {
      const x = mid + e * (w / 2 - 1.5);
      frames.push([x, front, 6.3, 0.18, 3, 1.4]);
      panes.push([x, front - side * 0.05, 6.2, 0.2, 2.3, 0.8], [x, front - side * 0.05, 2.6, 0.2, 1.4, 1]);
    }
    for (let y = 10; y < h - 1.4; y += 3.4) {
      for (let k = -w / 2 + 1.6; k <= w / 2 - 1.5; k += 2.4) {
        panes.push([mid + k, front - side * 0.05, y, 0.2, 1.8, 0.9]);
        shutters.push([mid + k - 0.72, front - side * 0.05, y, 0.16, 1.8, 0.42], [mid + k + 0.72, front - side * 0.05, y, 0.16, 1.8, 0.42]);
        if (rand() < 0.3) flowers.push([mid + k, front - side * 0.2, y - 1.05, 0.34, 0.3, 1]);
      }
    }
    if (rand() < 0.7) { const x = mid + (rand() - 0.5) * w * 0.6; chimneys.push([x, lat, h + 1.7, 0.7, 2.4, 0.7]); pots.push([x, lat, h + 3.3, 1.7, 1.1, 1.7]); }
    if (rand() < 0.5) { // (another behind, taller: only its top and its roof show)
      const h2 = h + 3 + rand() * 6, lat2 = beside(side, mid, near + d + 2 + 6);
      plain[Math.floor(rand() * WASH.length)].push([mid, lat2, h2 / 2, 12, h2, w + 2]);
      roofs.push([mid, lat2, h2 + 0.3, 13, 0.6, w + 2.6]);
    }
  };
  // footbridges over the canal: where each lands, the far bank is left open
  const footbridges = [];
  for (let s = Track.start + 190; s < Track.end - 60; s += 370) if (!inGap(s, 30) && !inTunnel(s, 30) && !lagoon(s, 20)) footbridges.push(s);
  for (const [a, b] of ranges) {
    for (let s = a + 1; s < b - 9;) { // the left bank, on the quay
      const w = 9 + rand() * 6, mid = s + w / 2;
      if (s + w > b - 1) break;
      if (!inTunnel(mid, w / 2 + 10) && !inPiazza(mid, w / 2 + 1)) palazzo(mid, w, -1, QUAY, false);
      s += w + (rand() < 0.2 ? 2.4 : 0.06);
    }
    for (let s = a + 1; s < b - 9;) { // the far bank, out of the water
      const w = 9 + rand() * 6, mid = s + w / 2;
      if (s + w > b - 1) break;
      if (!lagoon(mid, w / 2) && !inTunnel(mid, w / 2 + 4) && !footbridges.some(f => Math.abs(f - mid) < w / 2 + 3.5)) palazzo(mid, w, 1, CANAL1, true);
      s += w + (rand() < 0.2 ? 2.4 : 0.06);
    }
  }
  // a side canal's banks, running off either way from each gap: plain houses along both its edges
  for (const [a, b] of gaps) {
    for (const [s, e] of [[a - 6.5, 1], [b + 6.5, -1]]) {
      if (s < Track.start + 8 || s > Track.end - 8) continue;
      for (const side of [-1, 1]) {
        for (let off = (side < 0 ? QUAY : CANAL1) + 22; off < 120; off += 13.5) {
          if (side > 0 && lagoon(s)) break;
          const h = 10 + rand() * 9, lat = beside(side, s, off);
          plain[Math.floor(rand() * WASH.length)].push([s, lat, h / 2, 13, h, 12]);
          roofs.push([s, lat, h + 0.3, 13.6, 0.6, 13]);
          algae.push([s + e * 6.05, lat, 0.22, 13, 0.44, 0.16]);
          for (let y = 6; y < h - 1.5; y += 3.4) for (const k of [-3.5, 0, 3.5]) panes.push([s + e * 6.05, lat + k, y, 0.9, 1.8, 0.2]);
        }
      }
    }
  }

  // ---- a hump is a bridge: a wall down to the water under each edge, a white parapet along it, a dark arch
  const bridgeWalls = [], parapets = [], copings = [], arches = [];
  for (const [a, b, hump] of gaps) {
    if (!hump) continue;
    let top = 0, at = a;
    for (let s = a; s < b; s += 2) {
      const h = (height(s) + height(s + 2)) / 2;
      if (h > top) { top = h; at = s + 1; }
      for (const side of [-1, 1]) {
        const lat = (t) => beside(side, t, 0.32);
        if (h > 0.1) bridgeWalls.push([s, lat(s), -h / 2 - 0.02, 0.64, h, 2.02, [s + 2, lat(s + 2)]]);
        parapets.push([s, lat(s), 0.5, 0.36, 1, 2.02, [s + 2, lat(s + 2)]]);
        copings.push([s, lat(s), 1.06, 0.56, 0.14, 2.02, [s + 2, lat(s + 2)]]);
      }
    }
    if (top > 2.4) for (const side of [-1, 1]) arches.push([at, beside(side, at, 0.66), -(top + 1.3) / 2, 0.1, top - 1.3, Math.min(18, (b - a) * 0.3)]);
  }

  // ---- a tunnel is a sotoportego: the road goes under a building. Its walls outside (the portal is its front), a
  // tiled roof over it, windows over the way in and the way out
  const shell = [];
  for (const t of tunnels) {
    const out = 8.3, top = 17.5;
    for (let s = t.from; s < t.to; s += 4) for (const side of [-1, 1]) shell.push([s, beside(side, s, out), top / 2, 0.6, top, 4.02, [Math.min(t.to, s + 4), beside(side, Math.min(t.to, s + 4), out)]]);
    add(buildStrip(t.from, t.to, (s) => Track.lo(s) - out - 0.8, (s) => Track.hi(s) + out + 0.8, top + 0.1, 4), flat(0xb5583a));
    for (const [s, e] of [[t.from, -1], [t.to, 1]]) {
      const lo = Track.lo(s) - 6.5, hi = Track.hi(s) + 6.5;
      for (const y of [10.8, 14.6]) for (let lat = lo; lat <= hi + 0.01; lat += (hi - lo) / Math.round((hi - lo) / 3.2)) {
        frames.push([s + e * 0.62, lat, y, 1.5, 2.6, 0.12]);
        panes.push([s + e * 0.66, lat, y - 0.05, 0.9, 2, 0.14]);
      }
      balconies.push([s + e * 0.9, (lo + hi) / 2, 9.1, hi - lo + 1.5, 0.22, 0.9]);
    }
  }

  // ---- mooring poles: striped in a house's colours, a gilded cap; and bricole, three dark posts together, out in the channel
  const stripes = [[], [], []], whites = [], caps = [], posts = [];
  const pole = (s, lat, scheme, tall = 3.4) => {
    Track.toWorld(s, lat, p);
    const sink = p.y; // (its foot is in the water, wherever the road is)
    for (let k = 0; k < 6; k++) (k % 2 ? whites : stripes[scheme]).push([s, lat, (k + 0.5) * tall / 6 - sink, 0.34, tall / 6 + 0.01, 0.34]);
    caps.push([s, lat, tall + 0.2 - sink, 0.5, 0.5, 0.5]);
  };
  for (let s = Track.start + 4; s < Track.end - 4; s += 6 + rand() * 7) {
    if (inTunnel(s, 2) || inGap(s, 1)) continue;
    pole(s, beside(1, s, CANAL0 + 0.9 + rand() * 1.2), Math.floor(rand() * 3), 3 + rand() * 1.2);
    if (!lagoon(s) && rand() < 0.5) pole(s + 2, beside(1, s + 2, CANAL1 - 1.2 - rand()), Math.floor(rand() * 3), 3 + rand() * 1.2);
  }
  for (let s = Track.start + 30; s < Track.end - 10; s += 55 + rand() * 30) {
    const out = lagoon(s) ? 30 + rand() * 80 : 12 + rand() * 8, sink = height(s);
    for (const [ds, dl] of [[0, 0], [0.7, 0.5], [-0.3, 0.8]]) posts.push([s + ds, beside(1, s, out) + dl, 1.6 - sink, 0.4, 3.2 + ds, 0.4]);
  }

  // ---- boats: gondolas tied up along the quay and rowed down the canal, a vaporetto, a water taxi
  for (let s = Track.start + 12, n = 0; s < Track.end - 12; s += 20 + rand() * 16, n++) {
    if (inTunnel(s, 8) || inGap(s, 6)) continue;
    put(makeGondola(false), s, beside(1, s, CANAL0 + 2.6), n % 2 ? Math.PI : 0, 2);
  }
  for (let s = Track.start + 60, n = 0; s < Track.end - 30; s += 70 + rand() * 50, n++) {
    const far = lagoon(s), turn = (n % 2 ? Math.PI : 0) + (rand() - 0.5) * 0.3;
    if (n % 5 === 2) put(makeVaporetto(), s, beside(1, s, far ? 30 + rand() * 40 : 15 + rand() * 4), turn, 10);
    else if (n % 5 === 4) put(makeWaterTaxi(), s, beside(1, s, far ? 18 + rand() * 60 : 11 + rand() * 12), turn, 5);
    else put(makeGondola(true), s, beside(1, s, far ? 9 + rand() * 50 : 8 + rand() * 16), turn, 6);
  }
  for (const s of footbridges) {
    Track.toWorld(s, beside(1, s, CANAL0 - 0.2), p);
    const bridge = makeFootbridge(CANAL1 - CANAL0 + 0.6, 4.2);
    bridge.position.set(p.x, 0, p.z);
    bridge.rotation.y = Track.toWorld(s, 0, q) + Math.PI; // (it crosses along its +x: turned, that is away from the road on the right)
    levelGroup.add(bridge);
  }

  // ---- street lamps along the left pavement: a dark post, three pink glass globes
  const lampPosts = [], globes = [];
  for (let s = Track.start + 10; s < Track.end; s += 31) {
    if (inGap(s, 2) || inTunnel(s, 6)) continue;
    const lat = beside(-1, s, 1.1);
    lampPosts.push([s, lat, 2.2, 0.16, 4.4, 0.16], [s, lat, 4.1, 0.1, 0.1, 1.2]);
    globes.push([s, lat, 4.75, 0.55, 0.55, 0.55], [s - 0.55, lat, 4.4, 0.45, 0.45, 0.45], [s + 0.55, lat, 4.4, 0.45, 0.45, 0.45]);
  }

  // ---- the piazza: paved in pale stone with white bands, the campanile, the church, an arcade along the back,
  // two columns at the water's edge, and pigeons
  const arcade = [], arcadeArches = [], columns = [], gilt = [], bands = [], pigeons = [];
  if (P0 >= 0) {
    add(sideStrip(P0, P1, (s) => beside(-1, s, -0.15), (s) => beside(-1, s, 86), 0.035, 4), flat(0xcfc8b8));
    for (const off of [18, 36, 54]) bands.push([P0, beside(-1, P0, off), 0.05, 0.6, 0.02, P1 - P0, [P1, beside(-1, P1, off)]]);
    put(makeCampanile(72, 9), P0 + 34, beside(-1, P0 + 34, 24), 0, 8);
    put(makeDomedChurch(1), P1 - 24, beside(-1, P1 - 24, 44), -Math.PI / 2, 20);
    for (let s = P0 + 6; s < P1 - 44; s += 12) {
      const lat = beside(-1, s, 80), front = lat + 6.06;
      arcade.push([s, lat, 7.5, 12, 15, 12.02]);
      roofs.push([s, lat, 15.3, 13, 0.6, 12.1]);
      for (const k of [-4, 0, 4]) { arcadeArches.push([s + k, front, 2.5, 0.16, 4.6, 2.6]); panes.push([s + k, front, 8.6, 0.16, 2.4, 1.3], [s + k, front, 12.4, 0.16, 2.2, 1.3]); }
    }
    for (const s of [P0 + 84, P0 + 100]) {
      const lat = beside(-1, s, 7);
      columns.push([s, lat, 6.5, 1.1, 13, 1.1], [s, lat, 0.5, 2, 1, 2], [s, lat, 13.2, 1.8, 0.5, 1.8]);
      gilt.push([s, lat, 14.3, 0.9, 1.6, 2]);
    }
    for (let k = 0; k < 70; k++) pigeons.push([P0 + 10 + rand() * (P1 - P0 - 20), beside(-1, P0, 3 + rand() * 60), 0.16, 0.26, 0.3, 0.42]);
  }

  // ---- islands on the skyline, each with its campanile; and across the lagoon from an acqua alta's quay, one with a church
  const island = (x, z, r, church, turn = 0) => {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2), flat(0xb5ad9e));
    ground.position.set(x, 0.02, z);
    ground.scale.set(1.5, 1, 1);
    ground.rotation.y = turn;
    levelGroup.add(ground);
    const tower = makeCampanile(52 + rand() * 20, 7.5);
    tower.position.set(x + Math.cos(turn) * r * 0.6, 0, z - Math.sin(turn) * r * 0.6);
    levelGroup.add(tower);
    if (church) { const c = makeDomedChurch(0.9); c.position.set(x - Math.cos(turn) * r * 0.2, 0, z + Math.sin(turn) * r * 0.2); c.rotation.y = turn + Math.PI; levelGroup.add(c); }
    for (let k = 0; k < 9; k++) {
      const a = k * 0.7 + rand(), d = r * (0.3 + rand() * 0.9), h = 7 + rand() * 7, house = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: WASH[k % WASH.length] }));
      house.position.set(x + Math.cos(a) * d * 1.4, h / 2, z + Math.sin(a) * d * 0.9);
      house.scale.set(10 + rand() * 6, h, 9 + rand() * 5);
      house.rotation.y = turn;
      levelGroup.add(house);
      const roof = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: 0xb5583a }));
      roof.position.set(house.position.x, h + 0.3, house.position.z);
      roof.scale.set(house.scale.x + 1, 0.6, house.scale.z + 1);
      roof.rotation.y = turn;
      levelGroup.add(roof);
    }
  };
  for (const [f, a] of [[0.12, 2.2], [0.5, 4.1], [0.82, 1.2], [0.98, 5.2]]) {
    Track.toWorld(Track.length * f, 0, q);
    const at = clearOfRoads(q.x, q.z, Math.sin(a), Math.cos(a), 230, 60, 90);
    island(at.x, at.z, 30, f === 0.5, a);
  }
  if (tide) {
    const mid = (tide.from + tide.to) / 2, h = Track.toWorld(mid, beside(1, mid, 210), q);
    if (offRoads(q.x, q.z, 90)) island(q.x, q.z, 38, true, h + Math.PI / 2);
  }

  // ---- drawn
  WASH.forEach((color, i) => { instances(cube, color, walls[i], false, 2); instances(cube, color, plain[i], false, 2); });
  instances(cube, 0xb5583a, roofs, false, 2);
  instances(cube, 0xe9e2d0, bases);
  instances(cube, 0xf2ecde, frames);
  instances(cube, 0x2a3640, panes);
  instances(cube, 0x3f6b4f, shutters);
  instances(cube, 0xf2ecde, balconies);
  instances(cube, 0x3a2a20, doors);
  instances(cube, 0xd6cdb8, chimneys);
  instances(POT, 0xd6cdb8, pots);
  instances(cube, 0x2f4f3f, algae);
  instances(cube, 0xd23a4a, flowers);
  instances(cube, 0xd9cfbc, bridgeWalls);
  instances(cube, 0xf2ecde, parapets);
  instances(cube, 0xe6dfcf, copings);
  instances(cube, 0x1f3836, arches);
  instances(cube, 0xd9a066, shell);
  [0xc0392b, 0x2d5f8a, 0x2f7f4f].forEach((color, i) => instances(tube, color, stripes[i]));
  instances(tube, 0xf4f1e8, whites);
  instances(SPHERE, 0xe2b21c, caps);
  instances(tube, 0x4a3b2c, posts);
  instances(cube, 0x1f2a26, lampPosts);
  instances(SPHERE, 0xf2b8c6, globes);
  instances(cube, 0xe6dcc6, arcade);
  instances(cube, 0x4a4038, arcadeArches);
  instances(tube, 0xd9d2c4, columns);
  instances(cube, 0xe2b21c, gilt);
  instances(cube, 0xf4f1e8, bands);
  instances(cube, 0x6f747c, pigeons);
};
