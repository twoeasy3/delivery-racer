// ---- favela hillside: the road switchbacks up a hill that is houses all the way to the top: boxes of brick and
// painted plaster in every colour, two and three storeys of them one on another, each row standing on the land a
// step above the last (the land is the theme's terrain: it climbs with the road). Flat concrete roofs with blue water
// tanks on them, stairways running straight up between the houses, poles along the street with wires strung every
// way between them, a caged football pitch where the land is level, a cable car over it all from the foot of the
// hill to the top. Far below: the city's towers by the sea, a great dome of rock in the bay, and a statue on a peak.
import * as THREE from 'three';
import { CONFIG } from '../../config.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { landAt } from '../road.js'; // (the height of the land as drawn: null on a level whose theme has no terrain)
import { makeGondola, makeGoal, makeStatue } from './favelaModels.js';

const PAINT = [0xf2c14e, 0xe8684a, 0x4aa8d8, 0x6cc070, 0xf08ab0, 0xf4f0e6, 0xb5623c, 0xb5623c, 0x8a6fc0, 0x3cb8b0, 0xf59a3a];
const FIRST = 3.2, ROW = 6.6, ROWS = 10; // m from the pavement to the first row of houses, from row to row, and how many rows

export const favela = ({ instances, offRoads, beside, inJunction, cube, tube, cone, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 13 + (LEVEL.id || '').length * 173;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {};
  const open = (s) => s > Track.start + 2 && s < Track.end - 2 && !inJunction(s) && !Track.onBridge(s) && !(Track.tunnel(s) > 0);
  const land = (x, z, fallback) => landAt ? landAt(x, z) : fallback;
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));
  // is a thing `r` m round at (s, side, d m off the pavement) clear of every other stretch of the road, and of the other roads?
  const clear = (s, side, d, r) => {
    Track.toWorld(s, beside(side, s, d), p);
    const own = (side < 0 ? -Track.lo(s) : Track.hi(s)) + d, gap = Track.mainDistance(p.x, p.z);
    return offRoads(p.x, p.z, r) && (gap >= half(s) + r + 1 || gap >= own - 0.6);
  };

  // ---- things standing in the world (not along the road): one draw call a kind. [x, y, z, sx, sy, sz, turn]
  const spot = new THREE.Object3D();
  const placed = (geometry, color, list, glowing) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geometry, glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }), list.length);
    list.forEach(([x, y, z, sx, sy, sz, turn = 0], i) => {
      spot.position.set(x, y, z);
      spot.rotation.y = turn;
      spot.scale.set(sx, sy, sz);
      spot.updateMatrix();
      mesh.setMatrixAt(i, spot.matrix);
    });
    levelGroup.add(mesh);
  };
  // (what is taken already, by 4 m square: a pitch, a stairway, a house)
  const taken = new Map();
  const key = (x, z) => Math.floor(x / 4) * 100003 + Math.floor(z / 4);
  const take = (x, z, r) => { for (let i = -r; i <= r; i += 4) for (let j = -r; j <= r; j += 4) taken.set(key(x + i, z + j), true); };
  const free = (x, z, r) => { for (let i = -r; i <= r; i += r) for (let j = -r; j <= r; j += r) if (taken.has(key(x + i, z + j))) return false; return true; };

  // ---- the football pitch: the first level, straight stretch past the middle of the road with room beside it
  const pitch = { grass: [], lines: [], posts: [], lamps: [] };
  for (let s = Track.start + (Track.end - Track.start) * 0.42; s < Track.end - 80 && !pitch.grass.length; s += 10) {
    for (const side of [1, -1]) {
      let level = Math.abs(Track.bend(s)) < 0.0012 && Math.abs(Track.bend(s + 14)) < 0.0012 && Math.abs(Track.bend(s - 14)) < 0.0012;
      Track.toWorld(s, 0, q);
      const y0 = q.y;
      for (const [e, d] of [[-15, 4], [15, 4], [-15, 18], [15, 18], [0, 11]]) {
        level = level && open(s + e) && clear(s + e, side, d, 2);
        Track.toWorld(s + e, beside(side, s + e, d), p);
        level = level && Math.abs(land(p.x, p.z, p.y) - y0) < 0.9 && Math.abs(p.y - y0) < 0.5;
      }
      if (!level) continue;
      const at = (d) => beside(side, s, d), mid = at(10.75);
      pitch.grass.push([s, mid, 0.06, 14.3, 0.12, 29]);
      pitch.lines.push([s, mid, 0.13, 13, 0.02, 0.18], [s - 14, mid, 0.13, 13, 0.02, 0.18], [s + 14, mid, 0.13, 13, 0.02, 0.18], [s, at(4.25), 0.13, 0.18, 0.02, 28.2], [s, at(17.25), 0.13, 0.18, 0.02, 28.2]);
      for (let e = -15; e <= 15; e += 5) for (const d of [3.6, 17.9]) pitch.posts.push([s + e, at(d), 2, 0.12, 4, 0.12]);
      for (let d = 3.6; d <= 17.95; d += 3.575) for (const e of [-15, 15]) pitch.posts.push([s + e, at(d), 2, 0.12, 4, 0.12]);
      for (const d of [3.6, 17.9]) pitch.posts.push([s, at(d), 4, 0.08, 0.08, 30]);
      for (const e of [-15, 15]) { pitch.posts.push([s + e, mid, 4, 14.3, 0.08, 0.08]); pitch.lamps.push([s + e, at(17.9), 7.2, 1.2, 0.5, 0.5]); pitch.posts.push([s + e, at(17.9), 5.5, 0.16, 3.4, 0.16]); }
      for (const e of [-13.6, 13.6]) {
        const goal = makeGoal(), h = Track.toWorld(s + e, mid, p);
        goal.position.set(p.x, p.y + 0.1, p.z);
        goal.rotation.y = h + (e < 0 ? 0 : Math.PI);
        levelGroup.add(goal);
      }
      for (let e = -16; e <= 16; e += 4) for (let d = 2; d <= 21; d += 3) { Track.toWorld(s + e, at(d), p); take(p.x, p.z, 0); }
      break;
    }
  }
  instances(cube, 0x4f9a4a, pitch.grass);
  instances(cube, 0xffffff, pitch.lines);
  instances(cube, 0x7d8a8f, pitch.posts);
  instances(cube, 0xfff3c0, pitch.lamps, true);

  // ---- stairways: every 50 m or so each side, a flight of concrete steps straight out from the street and up (or
  // down) the hill between the houses, a rail of pipe beside it
  const steps = [], handrails = [];
  for (let s0 = Track.start + 30; s0 < Track.end - 20; s0 += 46) {
    for (const side of [-1, 1]) {
      const s = s0 + rand() * 20;
      if (!open(s)) continue;
      const h = Track.toWorld(s, 0, q);
      for (let d = 1.6; d < FIRST + ROW * ROWS; d += 0.6) {
        if (!clear(s, side, d, 1.2)) break;
        Track.toWorld(s, beside(side, s, d), p);
        if (taken.get(key(p.x, p.z)) === true && d > 3) break;
        const y = d < 2.6 ? p.y : land(p.x, p.z, p.y);
        steps.push([p.x, y - 1.3, p.z, 1.7, 3, 0.62, h + Math.PI / 2]);
        if (Math.round(d / 0.6) % 4 === 0) handrails.push([p.x + Math.sin(h) * 0.95, y + 0.5, p.z + Math.cos(h) * 0.95, 0.07, 1.4, 0.07, 0]);
        taken.set(key(p.x, p.z), 'steps');
      }
    }
  }
  placed(cube, 0xbdb7aa, steps);
  placed(cube, 0x5a8fb5, handrails);

  const LEAF = new THREE.IcosahedronGeometry(0.5, 1);
  // ---- the houses: row behind row each side of the road, wherever there is land for one. A house stands on the
  // land as it is: its foot let into the slope, a storey or two (or three) on that, each a box in a colour of its own
  const trunks = [], crowns = [[], []];
  const walls = PAINT.map(() => []), slabs = [], tin = [], tanks = [], lids = [], panes = [], doorways = [], dishes = [], shades = [];
  const cineKeep = (s, side, row) => side > 0 && s > Track.start + 165 && s < Track.start + 235 && row < 2; // (room for the menu picture's camera, beside the start)
  for (let s0 = Track.start + 5; s0 < Track.end - 3; s0 += 5.9) {
    for (const side of [-1, 1]) {
      for (let row = 0; row < ROWS; row++) {
        if (cineKeep(s0, side, row)) continue;
        const tree = rand() < 0.07;
        const w = 4.6 + rand() * 1.9, depth = 4.6 + rand() * 1.6, s = s0 + (rand() - 0.5) * 1.6, d = FIRST + row * ROW + rand() * 1.3 + depth / 2;
        if (!open(s) || !clear(s, side, d, depth / 2 + 0.4)) continue;
        const h = Track.toWorld(s, beside(side, s, d), p), x = p.x, z = p.z;
        if (!free(x, z, 2.4)) continue;
        // (the land under its corners: it stands on the lowest, and its floor is at the highest)
        let lo = Infinity, hi = -Infinity;
        for (const [i, j] of [[0, 0], [-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) { const y = land(x + i, z + j, p.y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
        if (tree || hi - lo > 11) { // (no house here: a tree, or on a face too steep to build on, scrub)
          const r = tree ? 3.5 + rand() * 2.5 : 3 + rand() * 3, y = land(x, z, p.y);
          if (tree) { trunks.push([x, y + 1.6, z, 0.45, 3.6, 0.45]); take(x, z, 2); }
          crowns[Math.floor(rand() * 2)].push([x, y + (tree ? 3.4 + r * 0.35 : 0.4), z, r, r * (tree ? 0.8 : 0.5), r]);
          continue;
        }
        take(x, z, 2);
        const floors = row === 0 ? 1 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * rand() * 3.4), turn = h + (rand() - 0.5) * 0.12;
        let c = Math.floor(rand() * PAINT.length), y = lo - 0.6, top = hi + 2.9, ww = w, dd = depth, cx = x, cz = z;
        for (let f = 0; f < floors; f++) {
          walls[c].push([cx, (y + top) / 2, cz, dd, top - y, ww, turn]);
          // (a door and windows right through it, so they show on its face to the street and its back alike)
          const wy = top - 1.55;
          if (row < 4) for (const e of ww > 5.6 ? [-0.27, 0.27] : [f ? 0 : 0.24]) panes.push([cx + Math.sin(turn) * ww * e, wy, cz + Math.cos(turn) * ww * e, dd + 0.12, 1.05, 0.95, turn]);
          if (!f && row < 3) doorways.push([cx - Math.sin(turn) * ww * 0.22, top - 1.9, cz - Math.cos(turn) * ww * 0.22, dd + 0.14, 2, 0.95, turn]);
          if (f === floors - 1) break;
          slabs.push([cx, top + 0.08, cz, dd + 0.3, 0.16, ww + 0.3, turn]);
          y = top + 0.16; top = y + 2.75;
          if (rand() < 0.55) c = Math.floor(rand() * PAINT.length);
          if (rand() < 0.5) { ww *= 0.86; dd *= 0.9; cx += (rand() - 0.5) * 0.7; cz += (rand() - 0.5) * 0.7; }
        }
        // its roof: a concrete slab with a parapet's shadow, or sheets of tin; a blue water tank, a dish, an awning
        (rand() < 0.3 ? tin : slabs).push([cx, top + 0.1, cz, dd + 0.4, 0.2, ww + 0.4, turn]);
        if (rand() < 0.62) {
          const tx = cx + (rand() - 0.5) * (dd - 2), tz = cz + (rand() - 0.5) * (ww - 2);
          tanks.push([tx, top + 0.85, tz, 1.5, 1.3, 1.5, 0]);
          lids.push([tx, top + 1.54, tz, 1.62, 0.12, 1.62, 0]);
        }
        if (row < 4 && rand() < 0.3) dishes.push([cx + (rand() - 0.5) * 2, top + 0.6, cz + (rand() - 0.5) * 2, 0.9, 0.9, 0.25, rand() * 6]);
        if (row === 0 && rand() < 0.3) { Track.toWorld(s, beside(side, s, FIRST - 0.9), q); shades.push([q.x, hi + 2.5, q.z, 1.9, 0.12, w * 0.8, h]); }
      }
    }
  }
  PAINT.forEach((color, i) => placed(cube, color, walls[i]));
  placed(cube, 0xa9a59c, slabs);
  placed(tube, 0x6a4a34, trunks);
  placed(LEAF, 0x3f8f48, crowns[0]);
  placed(LEAF, 0x57a04a, crowns[1]);
  placed(cube, 0x8a6a58, tin);
  placed(tube, 0x2f74c8, tanks);
  placed(tube, 0x1f5aa8, lids);
  placed(cube, 0x26333f, panes);
  placed(cube, 0x4a3326, doorways);
  placed(new THREE.SphereGeometry(0.5, 10, 6), 0xdfe2e6, dishes);
  placed(cube, 0xd8342c, shades.filter((_, i) => i % 3 === 0));
  placed(cube, 0x2f9a5a, shades.filter((_, i) => i % 3 === 1));
  placed(cube, 0xf2c14e, shades.filter((_, i) => i % 3 === 2));

  // ---- the street's own: a kerb each side, and a pole every 28 m with wires strung every way: along the street at
  // every height, across it to the pole opposite, and a transformer on some
  const kerbs = [], poles = [], boxes = [], wires = [], bulbs = [];
  for (let s = Track.start; s < Track.end - 4; s += 4) {
    if (!open(s) || !open(s + 4)) continue;
    for (const side of [-1, 1]) kerbs.push([s, beside(side, s, 0.15), 0.1, 0.3, 0.22, 1, [s + 4, beside(side, s + 4, 0.15)]]);
  }
  // (no wires over a brow or for 120 m before one: the camera rises there to see over it, see CONFIG.crest, and a wire
  // would hang right across its view)
  const height = (s) => { Track.toWorld(s, 0, q); return q.y; };
  const brow = (s) => { for (let u = s - 70; u <= s + 130; u += 10) if (height(u) * 2 - height(u - 30) - height(u + 30) > 1.4) return true; return false; };
  const GAP = 28, wired = (s) => open(s) && open(s + GAP) && s + GAP < Track.end && !brow(s);
  for (let s = Track.start + 12, k = 0; s < Track.end - 6; s += GAP, k++) {
    if (!open(s)) continue;
    for (const side of [-1, 1]) {
      const l = beside(side, s, 1.1), l2 = beside(side, s + GAP, 1.1);
      poles.push([s, l, 7.2, 0.28, 14.4, 0.28], [s, l, 13.6, 1.5, 0.12, 0.12], [s, l, 12.7, 1.1, 0.12, 0.12]);
      if ((k + (side > 0 ? 2 : 0)) % 4 === 0) boxes.push([s, l + side * 0.5, 11.4, 0.7, 1, 0.7]);
      if (k % 2) bulbs.push([s, l - side * 0.9, 7.4, 0.5, 0.2, 0.3], [s, l - side * 0.45, 7.55, 0.9, 0.08, 0.08]);
      if (!wired(s)) continue;
      for (let n = 0; n < 5; n++) wires.push([s, l + (rand() - 0.5) * 1.4, 12.2 + rand() * 1.6, 0.03, 0.03, 1, [s + GAP, l2 + (rand() - 0.5) * 1.4]]);
      wires.push([s, l, 13.3 + rand() * 0.8, 0.03, 0.03, 1, [s + GAP, beside(-side, s + GAP, 1.1)]]); // (across to the next pole on the other side)
    }
  }
  instances(cube, 0xc9c5ba, kerbs);
  instances(cube, 0x4a4038, poles);
  instances(cube, 0x8d9098, boxes);
  instances(cube, 0xfff0b8, bulbs, true);
  instances(cube, 0x1c1c20, wires);

  // ---- a tunnel goes through a spur of the hill: rock along both sides of it and over its roof, green on top
  const rock = [], scrub = [];
  for (const t of LEVEL.tunnels || []) {
    if (t.road === 'side') continue;
    const H = CONFIG.tunnel.height;
    for (let s = t.from + 8; s < t.to; s += 16) {
      const tall = H + 5 + rand() * 9, w = 18 + rand() * 10, mid = (Track.lo(s) + Track.hi(s)) / 2, across = Track.hi(s) - Track.lo(s);
      for (const side of [-1, 1]) { rock.push([s, beside(side, s, 1.4 + w / 2), tall / 2 - 1, w, tall, 17]); scrub.push([s, beside(side, s, 1.4 + w / 2), tall - 0.6, w + 0.6, 1, 17.6]); }
      rock.push([s, mid, H + 1 + (tall - H) / 2, across + 3, tall - H, 17]);
      scrub.push([s, mid, tall + 1.2, across + 3.6, 1, 17.6]);
    }
  }
  instances(cube, 0x8a6a50, rock);
  instances(cube, 0x5f9a50, scrub);

  // ---- the cable car: from beside the foot of the hill to beside its top, in a straight line over everything
  // between, on tall white pylons; red cabins going up one side and down the other
  let high = 0, top = -Infinity;
  for (let s = 0; s < Track.length; s += 10) { Track.toWorld(s, 0, p); if (p.y > top + 0.05) { top = p.y; high = s; } }
  const ends = [];
  for (const [s, side, d] of [[Math.min(Track.length * 0.08, 380), -1, 16], [high, 1, 14]]) { Track.toWorld(s, beside(side, s, d), p); ends.push(new THREE.Vector3(p.x, land(p.x, p.z, p.y), p.z)); }
  const stops = [], cabins = [];
  if (top > 25) {
    const run = ends[0].distanceTo(ends[1]), n = Math.max(2, Math.round(run / 80)), white = new THREE.MeshLambertMaterial({ color: 0xeef0f2 }), steel = new THREE.MeshLambertMaterial({ color: 0x3a3c42 });
    const dir = ends[1].clone().sub(ends[0]).setY(0).normalize(), across = new THREE.Vector3(dir.z, 0, -dir.x);
    for (let k = 0; k <= n; k++) {
      const at = ends[0].clone().lerp(ends[1], k / n);
      for (let tries = 0; tries < 8 && Track.mainDistance(at.x, at.z) < half(0) + 5; tries++) at.addScaledVector(dir, 6); // (a pylon never stands in the road)
      const foot = land(at.x, at.z, at.y), up = k === 0 || k === n ? 9 : 20;
      let head = foot + up;
      for (let i = -40; i <= 40; i += 8) head = Math.max(head, land(at.x + dir.x * i, at.z + dir.z * i, at.y) + (k === 0 || k === n ? 8 : 15)); // (and its cable clears the land either side)
      const pylon = new THREE.Mesh(cube, white);
      pylon.position.set(at.x, (foot + head) / 2 - 2, at.z);
      pylon.scale.set(1.5, head - foot + 4, 1.5);
      const arm = new THREE.Mesh(cube, white);
      arm.position.set(at.x, head + 0.3, at.z);
      arm.scale.set(6.4, 0.6, 1);
      arm.rotation.y = Math.atan2(across.x, across.z) + Math.PI / 2;
      levelGroup.add(pylon, arm);
      if (k === 0 || k === n) { // a station: a concrete box open to the line, a red roof
        const hall = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: 0xd9d5cc })), roof = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: 0xd8342c }));
        hall.position.set(at.x, foot + 2.5, at.z); hall.scale.set(10, 6, 12);
        roof.position.set(at.x, head + 2.2, at.z); roof.scale.set(13, 0.5, 16);
        hall.rotation.y = roof.rotation.y = Math.atan2(dir.x, dir.z);
        levelGroup.add(hall, roof);
      }
      stops.push(new THREE.Vector3(at.x, head, at.z));
    }
    for (let k = 0; k < n; k++) {
      for (const off of [-2.6, 2.6]) {
        const a = stops[k].clone().addScaledVector(across, off), b = stops[k + 1].clone().addScaledVector(across, off);
        const cable = new THREE.Mesh(cube, steel);
        cable.position.copy(a).lerp(b, 0.5);
        cable.scale.set(0.09, 0.09, a.distanceTo(b));
        cable.lookAt(b);
        levelGroup.add(cable);
      }
    }
    let whole = 0;
    const spans = stops.slice(1).map((b, k) => { const from = whole; whole += b.distanceTo(stops[k]); return [from, whole, stops[k], b]; });
    const count = Math.max(4, Math.round(whole / 45)) * 2;
    for (let k = 0; k < count; k++) {
      const cabin = makeGondola(k % 3 === 2 ? 0xf2c14e : 0xd8342c);
      cabin.rotation.y = Math.atan2(dir.x, dir.z);
      levelGroup.add(cabin);
      cabins.push([cabin, k % 2 ? -1 : 1, (k >> 1) / (count / 2) * whole]);
    }
    const along = new THREE.Vector3();
    stops.ride = (t) => {
      for (const [cabin, way, from] of cabins) {
        const u = ((from + t * 5 * way) % whole + whole) % whole, span = spans.find(sp => u <= sp[1]) || spans[spans.length - 1];
        along.copy(span[2]).lerp(span[3], (u - span[0]) / (span[1] - span[0])).addScaledVector(across, way * 2.6);
        cabin.position.copy(along);
      }
    };
  }

  // ---- far below and far off: the city's towers by the sea beside the start, a great dome of rock in the bay
  // beyond them, and a statue with its arms out on a green peak behind the hill
  const towers = [[], [], []], glass = [];
  for (let s = Track.start - 60; s < Math.min(Track.length * 0.14, 700); s += 26) {
    for (let d = 95; d < 330; d += 30) {
      if (rand() < 0.35) continue;
      const w = 12 + rand() * 12, h = 22 + rand() * rand() * 70, at = s + rand() * 12, lat = beside(1, Math.max(Track.start, at), d + rand() * 14);
      Track.toWorld(Math.max(Track.start, at), lat, p);
      if (Track.mainDistance(p.x, p.z) < 80 || Math.abs(land(p.x, p.z, 0)) > 6) continue;
      towers[Math.floor(rand() * 3)].push([at, lat, h / 2 - 5, w, h, w * (0.7 + rand() * 0.6)]);
      for (let y = 6; y < h - 6; y += 7) glass.push([at, lat, y, w + 0.3, 1.6, w * 0.5]);
    }
  }
  instances(cube, 0xf1eee6, towers[0]);
  instances(cube, 0xd9dde2, towers[1]);
  instances(cube, 0xe6d8c0, towers[2]);
  instances(cube, 0x6f93ad, glass);
  const far = (s, side, d, y, model) => {
    Track.toWorld(Math.max(Track.start, Math.min(Track.end, s)), side * d, p);
    const x = p.x, z = p.z;
    if (Track.mainDistance(x, z) < 150) return;
    model.position.set(x, y, z);
    levelGroup.add(model);
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshLambertMaterial({ color: 0x74695c }));
  dome.scale.set(70, 150, 95);
  far(Track.start + 120, 1, 420, -10, dome);
  const skirt = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshLambertMaterial({ color: 0x4f8a4a }));
  skirt.scale.set(110, 40, 140);
  far(Track.start + 120, 1, 420, -12, skirt);
  if (top > 25) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(110, 150, 9), new THREE.MeshLambertMaterial({ color: 0x4f8a4a }));
    far(high, -1, 300, top + 5, peak);
    const statue = makeStatue(34);
    far(high, -1, 300, top + 78, statue);
    Track.toWorld(Track.start, 0, p);
    statue.rotation.y = Math.atan2(p.x - statue.position.x, p.z - statue.position.z); // (it looks out over the bay)
  }

  // (the cabins are kept moving by a speck that is always drawn: there is no state of the game's in any of it)
  if (stops.ride) {
    const speck = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, -90, 0, 0.01, -90, 0, 0, -90, 0.01], 3)), new THREE.MeshBasicMaterial());
    speck.frustumCulled = false;
    speck.onBeforeRender = () => stops.ride(performance.now() / 1000);
    levelGroup.add(speck);
  }
};
