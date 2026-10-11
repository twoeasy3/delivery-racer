// ---- the old Wild West: a dirt road over red desert, and every 800 m a town with the road for its main street:
// false-front wooden buildings each side with their names painted up (saloon, bank, general store, livery stable...),
// a boardwalk under an awning, hitching rails with horses tied up, barrels, a water tower, a white church. Between
// the towns: saguaros, sagebrush, red rocks, ranch fences, a wind pump, covered wagons, Boot Hill, tumbleweed blowing
// along beside the road. A railway runs the whole way along the left, telegraph poles beside it, and a steam train
// on it; mesas and buttes stand all round the skyline, and a tunnel is a mine driven through a butte.
// (Where the towns are is TOWN below, the same on every level: a level's own things are placed to suit.)
import * as THREE from 'three';
import { CONFIG } from '../../config.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { makeLocomotive, makeTender, makeCarriage, makeBoxcar, makeCaboose, makeWagon, makeWindpump, makeTumbleweed } from './wildwestModels.js';

const TOWN = { first: 160, every: 800, length: 320 }; // (a town from 160 to 480 m, the next from 960...)
const FRONT = 6.4;   // m from the pavement to a building's face: a boardwalk and a hitching rail before it
const RAIL = 38;     // m from the pavement to the railway, on the left
const WOOD = [0x9a6b43, 0x7d5a3c, 0xb08a5c, 0x8f4a34, 0xcdbb94, 0x6f7f6c];
// (the names painted up, in the order a town has them: each side of the street gets them in turn)
const NAMES = ['SALOON', 'BANK', 'GENERAL STORE', 'LIVERY STABLE', 'SHERIFF', 'HOTEL', 'BARBER', 'UNDERTAKER', 'TELEGRAPH', 'ASSAY OFFICE', 'BLACKSMITH', 'DRY GOODS', 'GUNSMITH', 'LAND OFFICE'];

export const wildwest = ({ add, flat, instances, sideStrip, offRoads, beside, inJunction, cube, tube, cone, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 7 + (LEVEL.id || '').length * 131;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {};
  const open = (s) => s > Track.start + 4 && s < Track.end - 4 && !inJunction(s) && !Track.onBridge(s) && !(Track.tunnel(s) > 0);
  const crossed = (s) => (LEVEL.crossings || []).some(c => c.road !== 'side' && Math.abs(c.s - s) < 11); // (a level crossing's line runs out across the street's edge)
  const town = (s) => { const u = s - TOWN.first; return u >= 0 && u % TOWN.every < TOWN.length ? Math.floor(u / TOWN.every) : -1; };

  // ---- a name board: the name painted on planks, one texture a name
  const boards = new Map();
  const board = (name) => {
    if (!boards.has(name)) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f0e2bd';
      ctx.fillRect(0, 0, 512, 96);
      ctx.strokeStyle = '#5a2f1c'; ctx.lineWidth = 6;
      ctx.strokeRect(5, 5, 502, 86);
      ctx.fillStyle = '#5a2f1c';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 64px Rockwell, Georgia, serif';
      ctx.fillText(name, 256, 51, 470);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      boards.set(name, new THREE.MeshBasicMaterial({ map }));
    }
    return boards.get(name);
  };
  const PLANE = new THREE.PlaneGeometry(1, 1);
  const sign = (name, s, side, d, y, w, h) => {
    Track.toWorld(s, beside(side, s, d), p);
    Track.toWorld(s, beside(side, s, d - 3), q);
    const mesh = new THREE.Mesh(PLANE, board(name));
    mesh.position.set(p.x, p.y + y, p.z);
    mesh.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); // (its face to the road)
    mesh.scale.set(Track.mirrored ? -w : w, h, 1);      // (mirrored back on a left-hand level, so it still reads)
    levelGroup.add(mesh);
  };

  // ---- the towns: a row of buildings each side of the street, lot by lot
  const bodies = WOOD.map(() => []), fronts = WOOD.map(() => []), trims = [], roofs = [], walks = [], awnings = [], posts = [], doors = [], panes = [], lit = [];
  const rails = [], barrels = [], hay = [], troughs = [], water = [];
  const horses = [[], [], []], dark = [], saddles = [];
  const horse = (s, side, c) => { // (tied to the rail, its head to the building)
    const at = (d) => beside(side, s, d);
    horses[c].push([s, at(2.1), 1.3, 1.9, 0.75, 0.6], [s, at(3.0), 1.95, 0.42, 1.1, 0.34], [s, at(3.4), 2.45, 0.85, 0.36, 0.3]);
    for (const d of [1.35, 2.85]) for (const e of [-0.2, 0.2]) horses[c].push([s + e, at(d), 0.47, 0.16, 0.94, 0.16]);
    dark.push([s, at(1.1), 1.25, 0.12, 0.75, 0.12], [s, at(2.78), 2.1, 0.1, 0.9, 0.12]);
    saddles.push([s, at(2.05), 1.71, 0.5, 0.1, 0.64]);
  };
  const building = (s, side, w, name, c) => {
    const at = (d) => beside(side, s, d), barn = name === 'LIVERY STABLE', tall = name === 'HOTEL' || name === 'SALOON';
    const depth = barn ? 13 : 9, h = barn ? 6.4 : tall ? 7.6 : 4.6 + rand() * 1.4, top = h + (barn ? 2.6 : 2.2);
    bodies[c].push([s, at(FRONT + 0.3 + depth / 2), h / 2, depth, h, w]);
    roofs.push([s, at(FRONT + 0.3 + depth / 2), h + 0.1, depth + 0.3, 0.24, w + 0.3]);
    fronts[c].push([s, at(FRONT + 0.15), top / 2, 0.3, top, w + 0.4]);
    trims.push([s, at(FRONT + 0.15), top + 0.15, 0.5, 0.3, w + 0.8]);
    if (barn || rand() < 0.5) { fronts[c].push([s, at(FRONT + 0.15), top + 0.85, 0.3, 1.1, w * 0.46]); trims.push([s, at(FRONT + 0.15), top + 1.5, 0.5, 0.24, w * 0.46 + 0.4]); } // (a stepped top)
    sign(name, s, side, FRONT - 0.03, barn ? h + 0.9 : h + 0.75, Math.min(w - 1, name.length * 0.62 + 1.4), 1.25);
    if (barn) { // a great dark doorway, hay beside it
      doors.push([s, at(FRONT - 0.02), 2.2, 0.1, 4.4, 4.6]);
      panes.push([s, at(FRONT - 0.02), 5.3, 0.1, 0.9, 1.2]);
      for (let k = 0; k < 4; k++) hay.push([s + w / 2 - 1 - (k % 2) * 1.5, at(FRONT - 0.9), 0.5 + Math.floor(k / 2), 1, 1, 1.4]);
      troughs.push([s - w / 2 + 2, at(FRONT - 1.4), 0.4, 0.8, 0.8, 2.6]);
      water.push([s - w / 2 + 2, at(FRONT - 1.4), 0.78, 0.6, 0.06, 2.4]);
    } else {
      walks.push([s, at(FRONT - 1.2), 0.2, 2.4, 0.4, w + 0.8]);
      awnings.push([s, at(FRONT - 1.25), 3.35, 2.7, 0.16, w + 0.6]);
      for (const e of [-1, 0, 1]) posts.push([s + e * (w / 2 - 0.2), at(FRONT - 2.3), 1.85, 0.16, 2.9, 0.16]);
      doors.push([s, at(FRONT - 0.02), 1.5, 0.1, 2.2, 1.3]);
      if (name === 'SALOON') lit.push([s, at(FRONT - 0.06), 1.5, 0.1, 1, 1.25]); // (its swing doors, the lamplight over them)
      for (const e of [-1, 1]) (rand() < 0.5 ? lit : panes).push([s + e * w * 0.3, at(FRONT - 0.02), 2.1, 0.1, 1.3, 1.2]);
      if (tall) { // (an upper floor: a balcony over the awning, windows on to it)
        for (const e of [-1, 0, 1]) panes.push([s + e * w * 0.3, at(FRONT - 0.02), 5.2, 0.1, 1.3, 1]);
        rails.push([s, at(FRONT - 2.4), 4.2, 0.08, 0.08, w + 0.4]);
        for (let e = -w / 2; e <= w / 2 + 0.01; e += w / 4) posts.push([s + e, at(FRONT - 2.4), 3.85, 0.1, 0.8, 0.1]);
      }
      if (rand() < 0.6) barrels.push([s + (w / 2 - 0.7) * (rand() < 0.5 ? 1 : -1), at(FRONT - 0.7), 0.95, 0.85, 1.1, 0.85]);
    }
    if (rand() < 0.75) { // a hitching rail before it, a horse or two tied up
      const e = (rand() - 0.5) * (w - 5);
      rails.push([s + e, at(3.5), 1.05, 0.1, 0.1, 3.8]);
      for (const k of [-1.7, 0, 1.7]) posts.push([s + e + k, at(3.5), 0.55, 0.14, 1.1, 0.14]);
      for (const k of [-0.9, 0.9]) if (rand() < 0.55) horse(s + e + k, side, Math.floor(rand() * 3));
    }
  };
  const towers = { legs: [], tanks: [], bands: [], tops: [] }, church = { walls: [], roofs: [], crosses: [] };
  for (let n = 0, from = TOWN.first; from < Track.end - 60; n++, from += TOWN.every) {
    for (const side of [-1, 1]) {
      let k = side < 0 ? n : n + 2; // (which name comes next: the saloon, the bank, the store and the stable in every town)
      for (let s = from + rand() * 6; ;) {
        const name = NAMES[(k < n + 4 ? k - n : k) % NAMES.length], w = name === 'LIVERY STABLE' ? 13 : name.length > 9 ? 12 + rand() * 2 : 8.5 + rand() * 4;
        if (s + w > Math.min(from + TOWN.length, Track.end - 20)) break;
        let clear = true;
        for (let e = -4; e <= w + 4; e += 4) { Track.toWorld(s + e, beside(side, s + e, FRONT + 5), p); clear = clear && open(s + e) && !crossed(s + e) && offRoads(p.x, p.z, 11); }
        if (clear) { building(s + w / 2, side, w, name, Math.floor(rand() * WOOD.length)); k++; }
        s += w + (rand() < 0.2 ? 7 + rand() * 4 : 1.2 + rand() * 2.5);
      }
    }
    // a water tower behind the row on one side, a church at the far end on the other
    const side = n % 2 ? -1 : 1, s = from + 90 + rand() * 80, lat = beside(side, s, 25);
    for (const a of [-1.9, 1.9]) for (const b of [-1.9, 1.9]) towers.legs.push([s + a, lat + b, 4.6, 0.32, 9.2, 0.32]);
    for (const y of [3, 6.2]) towers.legs.push([s, lat - 1.9, y, 0.14, 0.14, 3.9], [s, lat + 1.9, y, 0.14, 0.14, 3.9], [s - 1.9, lat, y, 3.9, 0.14, 0.14], [s + 1.9, lat, y, 3.9, 0.14, 0.14]);
    towers.tanks.push([s, lat, 11.4, 5.6, 4.4, 5.6]);
    for (const y of [9.9, 11.4, 12.9]) towers.bands.push([s, lat, y, 5.75, 0.16, 5.75]);
    towers.tops.push([s, lat, 14.6, 6.6, 2, 6.6]);
    const cs = from + TOWN.length + 16, clat = beside(-side, cs, 15);
    if (open(cs) && open(cs - 10) && cs < Track.end - 30) {
      church.walls.push([cs, clat, 3, 7, 6, 13], [cs - 8, clat, 5.5, 3.4, 11, 3.4]);
      church.roofs.push([cs, clat, 7.2, 8, 2.4, 14], [cs - 8, clat, 13.5, 4, 5, 4]);
      church.crosses.push([cs - 8, clat, 16.8, 0.16, 1.8, 0.16], [cs - 8, clat, 17.1, 0.16, 0.16, 1]);
      doors.push([cs - 8, clat - side * -1.72, 1.3, 0.1, 2.6, 1.4]);
    }
  }
  WOOD.forEach((color, i) => { instances(cube, color, bodies[i], false, 1); instances(cube, new THREE.Color(color).multiplyScalar(1.12).getHex(), fronts[i], false, 1); });
  instances(cube, 0x4a3324, trims);
  instances(cube, 0x57402f, roofs);
  instances(cube, 0xb89668, walks);
  instances(cube, 0x6a4a34, awnings);
  instances(cube, 0x5a3f2c, posts);
  instances(cube, 0x2a1d16, doors);
  instances(cube, 0x39505c, panes);
  instances(cube, 0xffd98a, lit, true);
  instances(cube, 0x5a3f2c, rails);
  instances(tube, 0x7a4f2e, barrels);
  instances(cube, 0xd9b84a, hay);
  instances(cube, 0x6a4a34, troughs);
  instances(cube, 0x5fa6c9, water);
  [0x6b4226, 0x2f2622, 0xb8936a].forEach((color, i) => instances(cube, color, horses[i]));
  instances(cube, 0x1f1a17, dark);
  instances(cube, 0x8a2f25, saddles);
  instances(cube, 0x6a4a34, towers.legs);
  instances(tube, 0x93623c, towers.tanks);
  instances(tube, 0x3d2e24, towers.bands);
  instances(cone, 0x5a3f2c, towers.tops);
  const HIP = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
  instances(cube, 0xf0ead8, church.walls, false, 1);
  instances(HIP, 0x6a4a3a, church.roofs, false, 1);
  instances(cube, 0xf0ead8, church.crosses);

  // ---- the desert between the towns, and out beyond them: saguaros, prickly pear, sagebrush, red rocks
  const BALL = new THREE.SphereGeometry(0.5, 10, 7), ROCK = new THREE.DodecahedronGeometry(0.5, 0), WEED = new THREE.IcosahedronGeometry(0.5, 1);
  const stems = [], elbows = [], tips = [], pears = [], sage = [[], []], rocks = [[], []], weeds = [];
  const saguaro = (s, lat) => {
    const h = 3.5 + rand() * 4.5;
    stems.push([s, lat, h / 2, 0.75, h, 0.75]);
    tips.push([s, lat, h, 0.75, 0.75, 0.75]);
    for (const dir of [-1, 1]) {
      if (rand() < 0.3) continue;
      const y = h * (0.35 + rand() * 0.25), up = 1.2 + rand() * (h - y - 1) * 0.8, out = 1 + rand() * 0.5;
      elbows.push([s + dir * out / 2, lat, y, 0.5, 0.5, out]);
      stems.push([s + dir * out, lat, y + up / 2, 0.55, up, 0.55]);
      tips.push([s + dir * out, lat, y + up, 0.55, 0.55, 0.55], [s + dir * out, lat, y, 0.55, 0.55, 0.55]);
    }
  };
  for (let s0 = Track.start + 6; s0 < Track.end - 6; s0 += 11) {
    for (const side of [-1, 1]) {
      const s = s0 + rand() * 8, here = town(s) >= 0 || town(s - 24) >= 0 || town(s + 8) >= 0, roll = rand();
      const far = here ? 30 + rand() * 60 : 3.5 + rand() * rand() * 75, lat = beside(side, s, far);
      if (side < 0 && Math.abs(far - RAIL) < 7) continue; // (not on the railway)
      if (roll < 0.3) saguaro(s, lat);
      else if (roll < 0.42) { for (let k = 0; k < 4; k++) pears.push([s + (rand() - 0.5) * 1.6, lat + (rand() - 0.5) * 1.6, 0.5 + k * 0.45, 0.9, 1.1, 0.3]); }
      else if (roll < 0.72) { for (let k = 0; k < 3; k++) { const r = 0.8 + rand() * 1.4; sage[k % 2].push([s + (rand() - 0.5) * 5, lat + (rand() - 0.5) * 5, r * 0.3, r, r * 0.7, r]); } }
      else if (roll < 0.92) { const r = 1 + rand() * rand() * 5; rocks[0].push([s, lat + side * r / 2, r * 0.3, r, r * 0.8, r * 1.2]); for (let k = 0; k < 3; k++) { const m = 0.5 + rand(); rocks[1].push([s + (rand() - 0.5) * (r + 4), lat + (rand() - 0.5) * (r + 4), m * 0.3, m, m * 0.8, m]); } }
      else weeds.push([s, lat, 0.55, 1.1, 1.1, 1.1]);
    }
  }
  instances(tube, 0x4f8a4a, stems, false, 0.5);
  instances(cube, 0x4f8a4a, elbows);
  instances(BALL, 0x5a964f, tips);
  instances(BALL, 0x6aa052, pears);
  instances(BALL, 0x8f9a6a, sage[0]);
  instances(BALL, 0xa3a67a, sage[1]);
  instances(ROCK, 0xa5553a, rocks[0], false, 1);
  instances(ROCK, 0x8a452f, rocks[1]);
  instances(WEED, 0xa88a55, weeds);

  // ---- between the towns, on the right: a ranch fence, a wind pump and its tank, a covered wagon; Boot Hill
  const fence = [], graves = [], mound = [];
  const alive = [];
  const stand = (model, s, side, d, turn = 0) => {
    const h = Track.toWorld(s, beside(side, s, d), p);
    if (!open(s) || !offRoads(p.x, p.z, 8)) return null;
    model.position.set(p.x, p.y, p.z);
    model.rotation.y = h + turn;
    levelGroup.add(model);
    if (model.userData.animate) alive.push(model);
    return model;
  };
  for (let n = 0, from = TOWN.first + TOWN.length + 50; from < Track.end - 150; n++, from += TOWN.every) {
    const to = Math.min(from + TOWN.every - TOWN.length - 100, Track.end - 30), side = n % 2 ? -1 : 1;
    for (let s = from; s < to - 4; s += 4) { // (posts and two rails, 12 m back)
      if (!open(s) || !open(s + 4) || Math.abs(s - from - 120) < 5) continue; // (a gap for its gate)
      fence.push([s, beside(1, s, 12), 0.65, 0.16, 1.3, 0.16]);
      for (const y of [0.55, 1.05]) fence.push([s, beside(1, s, 12), y, 0.07, 0.12, 1, [s + 4, beside(1, s + 4, 12)]]);
    }
    for (const e of [-5, 5]) fence.push([from + 120 + e, beside(1, from + 120, 12), 2.6, 0.3, 5.2, 0.3]); // (the gate: two tall posts and a beam across)
    fence.push([from + 120, beside(1, from + 120, 12), 5.1, 0.3, 0.3, 10.6]);
    stand(makeWindpump(), from + 60, 1, 26, n);
    stand(makeWagon(), from + 180 + rand() * 60, side, 7 + rand() * 4, 0.3 + rand() * 2.5);
    stand(makeWagon(), from + 20, -side, 9, Math.PI / 2 + rand());
    // Boot Hill: a low mound, a few crosses and headboards on it
    const hs = from + 230, hl = beside(1, hs, 24);
    if (hs < to && open(hs)) {
      mound.push([hs, hl, 0, 26, 2.4, 30]);
      for (let k = 0; k < 9; k++) {
        const gs = hs + (k % 3 - 1) * 5 + rand() * 2, gl = hl + (Math.floor(k / 3) - 1) * 4.5;
        graves.push([gs, gl, 1.7, 0.14, 1.3, 0.14]);
        graves.push(k % 2 ? [gs, gl, 1.95, 0.14, 0.14, 0.8] : [gs, gl, 1.9, 0.14, 0.6, 0.6]);
      }
    }
  }
  instances(cube, 0x7a5a3c, fence);
  instances(BALL, 0xb96a45, mound, false, 1);
  instances(cube, 0xe6dcc2, graves);

  // ---- the railway, the whole way along the left: ballast, sleepers, two rails; telegraph poles beyond it
  const line = (s) => beside(-1, s, RAIL);
  const ballast = flat(0x9a8672), sleepers = [], steel = [], poles = [], wires = [];
  const railed = (s) => { if (!open(s)) return false; Track.toWorld(s, line(s), p); return offRoads(p.x, p.z, 3); };
  for (let s = Track.start, from = null; s <= Track.end; s += 6) { // (its bed, in runs: none through a tunnel's hill or over another road)
    const here = railed(s) && s + 6 <= Track.end;
    if (here && from === null) from = s;
    if (!here && from !== null) { add(sideStrip(from, s, (u) => line(u) + 1.7, (u) => line(u) - 1.7, 0.05, 4), ballast); from = null; }
    if (!here) continue;
    for (const e of [0, 2, 4]) sleepers.push([s + e, line(s + e), 0.12, 2.5, 0.14, 0.32]);
    for (const w of [-0.72, 0.72]) steel.push([s, line(s) + w, 0.27, 0.1, 0.14, 1, [s + 6, line(s + 6) + w]]);
  }
  for (let s = Track.start + 10; s < Track.end - 42; s += 42) {
    const l = (u) => beside(-1, u, RAIL + 4.5);
    if (!railed(s)) continue;
    poles.push([s, l(s), 3.6, 0.2, 7.2, 0.2], [s, l(s), 6.7, 1.7, 0.14, 0.14]);
    if (railed(s + 42)) for (const w of [-0.7, 0.7]) wires.push([s, l(s) + w, 6.85, 0.035, 0.035, 1, [s + 42, l(s + 42) + w]]);
  }
  instances(cube, 0x5a4030, sleepers);
  instances(cube, 0x74767c, steel);
  instances(cube, 0x5a4030, poles);
  instances(cube, 0x2a2a2e, wires);

  // ...and the train on it: the locomotive, its tender, boxcars, two passenger cars and the caboose, steaming
  // the player's way, round again from the start when it reaches the end
  const train = [[makeLocomotive(), 9.6], [makeTender(), 5], [makeBoxcar(), 8.6], [makeBoxcar(0x6f5a3c), 8.6], [makeCarriage(), 10.2], [makeCarriage(), 10.2], [makeCaboose(), 7.2]];
  let back = 0;
  for (const car of train) { car[2] = back + car[1] / 2; back += car[1]; levelGroup.add(car[0]); car[0].userData.keep = true; }
  const run = Track.end - Track.start - 40;
  const steam = (t) => {
    const head = Track.start + 20 + back + ((t * 17 + 900) % (run - back));
    for (const [model, , behind] of train) {
      const s = head - behind;
      model.rotation.y = Track.toWorld(s, line(s), p);
      model.position.set(p.x, p.y + 0.3, p.z);
      model.visible = railed(Math.round(s / 6) * 6);
    }
    train[0][0].userData.animate(t);
  };

  // ---- tumbleweed blowing along beside the road, each over a stretch of its own, round and round
  const tumble = [];
  for (let s = Track.start + 80, k = 0; s < Track.end - 150; s += 170, k++) {
    const model = makeTumbleweed(0.55 + rand() * 0.4);
    levelGroup.add(model);
    tumble.push([model, s, k % 2 ? 1 : -1, 1.6 + rand() * 1.6, 3.5 + rand() * 3, rand() * 9]);
  }

  // ---- a tunnel is a mine driven through a butte: red rock piled up along both sides of it and over its roof
  const crag = [[], []], props = [];
  for (const t of LEVEL.tunnels || []) {
    if (t.road === 'side') continue;
    const H = CONFIG.tunnel.height;
    for (const [s, out] of [[t.from, -0.5], [t.to, 0.5]]) { // (pit props at each mouth: two baulks of timber and a beam across)
      for (const side of [-1, 1]) props.push([s + out, beside(side, s, 0.2), H / 2, 0.7, H, 0.7]);
      props.push([s + out, (Track.lo(s) + Track.hi(s)) / 2, H + 0.3, Track.hi(s) - Track.lo(s) + 2, 0.8, 0.8]);
    }
    for (let s = t.from + 8, k = 0; s < t.to; s += 16, k++) {
      const tall = H + 6 + rand() * 12, w = 16 + rand() * 14, mid = (Track.lo(s) + Track.hi(s)) / 2, across = Track.hi(s) - Track.lo(s);
      for (const side of [-1, 1]) crag[k % 2].push([s, beside(side, s, 1.4 + w / 2), tall / 2 - 1, w, tall + rand() * 6, 17]);
      crag[(k + 1) % 2].push([s, mid, H + 1 + (tall - H) / 2, across + 3, tall - H, 17]);
    }
  }
  instances(cube, 0xb05c3e, crag[0]);
  instances(cube, 0xa04f33, crag[1]);
  instances(cube, 0x6a4a34, props);

  // ---- mesas and buttes all round the skyline: red rock in bands, flat on top, scree round their feet
  const MESA = new THREE.CylinderGeometry(0.5, 0.56, 1, 9), SCREE = new THREE.CylinderGeometry(0.55, 1, 1, 9);
  const mesas = [[], []], bands = [], scree = [];
  for (let s = Track.start - 200, k = 0; s < Track.end + 200; s += 120, k++) {
    const side = k % 2 ? 1 : -1, at = Math.max(Track.start, Math.min(Track.end, s)), spire = k % 5 === 3;
    const r = spire ? 9 + rand() * 9 : 40 + rand() * 60, h = spire ? 55 + rand() * 40 : 45 + rand() * 60, long = spire ? 1 : 1 + rand() * 1.3;
    const lat = beside(side, at, 170 + r + rand() * 170);
    Track.toWorld(at, lat, p);
    if (!offRoads(p.x, p.z, r * long + 20) || Track.mainDistance(p.x, p.z) < r * long + 90) continue;
    mesas[k % 4 < 2 ? 0 : 1].push([s, lat, h / 2 - 8, r * 2, h, r * 2 * long]);
    bands.push([s, lat, h * 0.62 - 8, r * 2.06, h * 0.07, r * 2.06 * long], [s, lat, h * 0.86 - 8, r * 2.03, h * 0.04, r * 2.03 * long]);
    scree.push([s, lat, h * 0.16 - 8, r * 2.1, h * 0.32, r * 2.1 * long]);
  }
  instances(MESA, 0xb5573a, mesas[0]);
  instances(MESA, 0xa64e36, mesas[1]);
  instances(MESA, 0xd08a5a, bands);
  instances(SCREE, 0xc47a52, scree);

  // (the train, the tumbleweed and the wind pumps are kept moving by a speck that is always drawn: there is no state
  // of the game's in any of it)
  const speck = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, -90, 0, 0.01, -90, 0, 0, -90, 0.01], 3)), new THREE.MeshBasicMaterial());
  speck.frustumCulled = false;
  speck.onBeforeRender = () => {
    const t = performance.now() / 1000;
    steam(t);
    for (const model of alive) model.userData.animate(t);
    for (const [model, from, side, off, pace, phase] of tumble) {
      const s = from + ((t + phase) * pace) % 150;
      model.rotation.y = Track.toWorld(s, beside(side, s, off + Math.sin(s / 14 + phase) * 1.1), p);
      model.position.set(p.x, p.y, p.z);
      model.visible = open(s);
      model.userData.animate(t + phase);
    }
  };
  levelGroup.add(speck);
};
