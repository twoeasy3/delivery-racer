// ---- container port: the road through a terminal. A concrete barrier along each edge, then a lane the straddle
// carriers run up and down, then the stacks: containers in every colour, block after block, up to five high, a wall
// each side with an aisle through it now and then where a reach stacker stands. Gantry cranes stand right over
// the road, their trolleys running across with a box on the ropes. On the right, behind the first stacks, the
// quay: quay cranes with their booms out over container ships lying alongside, and the grey water of the
// harbour. Floodlight masts over it all; rails let into the road, and sidings that swing off it into the yard;
// sheds and tanks beyond the stacks on the landward side.
// (Its models: portModels.js. What moves keeps its own time: sceneryClock.js. Only a sight, all of it.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { everyFrame } from './sceneryClock.js';
import { makeGantry, makeQuayCrane, makeShip, makeStraddle, makeStacker, BOX_COLOURS, BOX_SIZE } from './portModels.js';

const LANE = [3, 11];   // m off the pavement: the straddle carriers' lane, between its yellow lines
const STACKS = 13.5;    // ...where the stacks begin
const QUAY = 50;        // ...and, on the right, the quay's edge

export const port = ({ add, flat, instances, sideStrip, buildStrip, offRoads, beside, inJunction, exits, cube, tube, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 41 + (LEVEL.id || '').length * 389;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {};
  const within = (list, s, pad, a = 'from', b = 'to') => (list || []).some(x => !x.road && x[a] !== undefined && s >= x[a] - pad && s <= x[b] + pad);
  const covered = (s, pad = 0) => within(LEVEL.tunnels, s, pad) || within(LEVEL.bridges, s, pad);
  // where the level has something of its own across the road or coming onto it from the side
  const busy = (s, pad = 0) => covered(s, pad) || inJunction(s) || within(LEVEL.crossings, s, pad + 16, 's', 's') || within(LEVEL.drawbridges, s, pad + 24, 's', 's') ||
    within(LEVEL.machinery, s, pad + 12, 's', 's');
  const onRamps = (s, pad = 0) => exits.some(x => s > x.exitAt - 200 - pad && s < x.mergeAt + 200 + pad);
  const roads = [[Track.start, Track.end, true], ...exits.map(x => [x.side0, x.sideEnd, false])];
  const moving = [];
  const stand = (model, s, lat, turn = 0) => {
    const h = Track.toWorld(s, lat, p);
    model.position.set(p.x, p.y, p.z);
    model.rotation.y = h + turn;
    levelGroup.add(model);
    if (model.userData.animate) moving.push(model);
    return model;
  };

  // ---- rails let into the road, down the middle of the kerbside lane: a length of them every 520 m, the last
  // 80 m of each a siding that swings off the road and away into the yard
  const steel = new THREE.MeshBasicMaterial({ color: 0xa9afb5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const bed = new THREE.MeshBasicMaterial({ color: 0x26282c, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2.5, polygonOffsetUnits: -2.5 });
  const sidings = []; // [from, to]: where one leaves the road on the right (nothing stands in its way)
  for (let s0 = Track.start + 90; s0 < Track.end - 330; s0 += 520) {
    const end = s0 + 300;
    if (onRamps(s0, 20) || onRamps(end, 60) || [s0, s0 + 150, end, end + 40].some(q => within(LEVEL.drawbridges, q, 45, 's', 's') || inJunction(q))) continue;
    const lane = (q) => Track.laneOffset(Track.laneCount - 1, q);
    const swing = (q) => { const u = Math.max(0, Math.min(1, (q - (end - 80)) / 120)); return u * u * (3 - 2 * u); };
    const line = (q) => lane(q) + swing(q) * (Track.hi(q) + 30 - lane(q));
    add(buildStrip(s0, end + 40, (q) => line(q) - 1.05, (q) => line(q) + 1.05, 0.012, 2), bed);
    for (const off of [-0.72, 0.72]) add(buildStrip(s0, end + 40, (q) => line(q) + off - 0.08, (q) => line(q) + off + 0.08, 0.02, 2), steel);
    sidings.push([end - 56, end + 46]);
  }
  const onSiding = (s, pad = 0) => sidings.some(([a, b]) => s > a - pad && s < b + pad);

  // ---- the road's edges: a concrete barrier each side (every fifth length of it painted yellow), broken where
  // the level brings something across; and the carriers' lane beyond it, between yellow lines
  const barriers = [], painted = [];
  for (const [from, to, main] of roads) {
    for (let s = from, k = 0; s < to; s += 4, k++) {
      if (busy(s, 2) || busy(s + 4, 2) || Track.onBridge(s)) continue;
      for (const side of [-1, 1]) if (!(main && side > 0 && onSiding(s, 2))) (k % 5 ? barriers : painted).push([s, beside(side, s, 0.8), 0.42, 0.5, 0.84, 4.02, [s + 4, beside(side, s + 4, 0.8)]]);
    }
    if (!main) continue;
    const yellow = flat(0xe2b93b);
    for (const side of [-1, 1]) for (const d of LANE) add(sideStrip(from, to, (q) => beside(side, q, d - 0.12), (q) => beside(side, q, d + 0.12), 0.02), yellow);
  }
  instances(cube, 0xb4b7ba, barriers);
  instances(cube, 0xe2b93b, painted);

  // ---- the quay, along the right: its apron's edge, bollards, the water; ships alongside wherever the road runs
  // straight enough for one to lie against it, two quay cranes over each
  add(sideStrip(Track.start, Track.end, (q) => beside(1, q, QUAY - 1.4), (q) => beside(1, q, QUAY), 0.25, 4), flat(0xc9ccd0));
  add(sideStrip(Track.start, Track.end, (q) => beside(1, q, QUAY - 2.2), (q) => beside(1, q, QUAY - 1.4), 0.03, 4), flat(0xe2b93b));
  add(sideStrip(Track.start, Track.end, (q) => beside(1, q, QUAY), (q) => beside(1, q, QUAY + 560), -0.03, 8), new THREE.MeshBasicMaterial({ color: 0x41616b, side: THREE.DoubleSide }));
  const sheen = new THREE.MeshBasicMaterial({ color: 0x5b7c85, side: THREE.DoubleSide });
  const bollards = [], craneRails = [];
  for (let s = Track.start; s < Track.end; s += 18) {
    bollards.push([s, beside(1, s, QUAY - 0.7), 0.55, 0.7, 0.6, 0.7]);
    const out = QUAY + 50 + rand() * 300, len = 10 + rand() * 24;
    add(sideStrip(s, s + len, (q) => beside(1, q, out), (q) => beside(1, q, out + 0.8), -0.02, 4), sheen);
  }
  for (const d of [QUAY - 21.5, QUAY - 5.5]) for (let s = Track.start; s < Track.end; s += 6) craneRails.push([s, beside(1, s, d), 0.06, 0.3, 0.12, 6.02, [s + 6, beside(1, s + 6, d)]]);
  instances(tube, 0x2f3338, bollards);
  instances(cube, 0x6a6f75, craneRails);
  const berths = []; // [from, to]: where a ship lies (the stacks on the right keep low there, so it is seen)
  for (let s = Track.start + 190, n = 0; s < Track.end - 160; s += 60) {
    const length = 190 + (n % 3) * 20, a = {}, b = {};
    const turn = Math.abs(Track.toWorld(s - length / 2, 0, a) - Track.toWorld(s + length / 2, 0, b));
    if (turn > 0.07 || covered(s - length / 2, 10) || covered(s + length / 2, 10)) continue;
    let clear = true;
    for (let q = s - length / 2; q <= s + length / 2 && clear; q += 15) {
      for (const d of [QUAY - 24, QUAY + 4, QUAY + 36]) { Track.toWorld(q, beside(1, q, d), p); clear = clear && offRoads(p.x, p.z, 6) && Track.mainDistance(p.x, p.z) > d - 2; }
    }
    if (!clear) continue;
    stand(makeShip(length, n), s, beside(1, s, QUAY + 19));
    for (const at of [s - length * 0.2, s + length * 0.22]) stand(makeQuayCrane(n + (at > s ? 1 : 0)), at, beside(1, at, QUAY - 13.5), Math.PI);
    berths.push([s - length / 2, s + length / 2]);
    s += length + 90;
    n++;
  }
  const atBerth = (s) => berths.some(([a, b]) => s > a - 8 && s < b + 8);

  // ---- the stacks: bays of containers 12.6 m apart along the road, in blocks of six bays with an aisle between;
  // a block's rows and how high it may go are its own. Left: a deep yard, and another band of blocks beyond it.
  // Right: two or three rows between the road and the quay
  const boxes = BOX_COLOURS.map(() => []), ends = [];
  const BAY = BOX_SIZE[2] + 0.4, ROW = BOX_SIZE[0] + 0.26, H = BOX_SIZE[1];
  const stack = (s, side, d, top) => {
    const n = Math.max(1, Math.round(top - rand() * rand() * 2.5)), lat = beside(side, s, d + BOX_SIZE[0] / 2);
    for (let y = 0; y < n; y++) boxes[Math.floor(rand() * BOX_COLOURS.length)].push([s, lat, (y + 0.5) * H, BOX_SIZE[0], H, BOX_SIZE[2]]);
    if (rand() < 0.5) ends.push([s + BOX_SIZE[2] / 2 + 0.03, lat, H * n - H / 2, BOX_SIZE[0] * 0.8, H * 0.8, 0.06]); // (its doors' bars, on the top box)
  };
  const aisles = []; // [s, side]: the middle of each aisle through the first rows
  for (const [from, to, main] of roads) {
    for (const side of [-1, 1]) {
      let rows = 3, top = 3, far = 0;
      for (let s = from + 8 + (side > 0 ? 20 : 0), k = 0; s < to - 6; s += BAY, k++) {
        if (k % 7 === 0) { rows = side < 0 || !main ? 3 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 2); top = 2 + Math.floor(rand() * 4); far = rand() < 0.75 ? 2 + Math.floor(rand() * 4) : 0; }
        if (k % 7 === 6) { if (main && !busy(s, 8) && !onSiding(s, 12)) aisles.push([s, side]); continue; } // (the aisle)
        if (covered(s, 10) || within(LEVEL.crossings, s, 12, 's', 's') || within(LEVEL.drawbridges, s, 22, 's', 's')) continue;
        if (side > 0 && main && onSiding(s, 4)) continue;
        const low = side > 0 && main && atBerth(s);
        for (let j = 0; j < (main ? rows : 2); j++) stack(s, side, (main ? STACKS : 7) + j * ROW, low ? Math.min(top, 2) : top);
        if (main && side < 0 && far) for (let j = 0; j < 5; j++) stack(s, side, STACKS + 34 + j * ROW, far);
        if (main && side < 0 && far > 2 && k % 2) for (let j = 0; j < 4; j++) stack(s, side, STACKS + 66 + j * ROW, far - 1);
      }
    }
  }
  BOX_COLOURS.forEach((color, i) => instances(cube, color, boxes[i], false, 1));
  instances(cube, 0x3a3d42, ends);

  // ---- floodlight masts between the lane and the stacks, each side in turn; and a few out on the quay
  const masts = [], heads = [], lamps = [];
  const mast = (s, lat, h) => {
    masts.push([s, lat, h / 2, 0.55, h, 0.55]);
    heads.push([s, lat, h + 0.4, 5.4, 1.5, 1.2]);
    for (let i = -2; i <= 2; i++) lamps.push([s - 0.62, lat + i * 1.02, h + 0.4, 0.8, 1, 0.1]);
  };
  for (let s = Track.start + 40, k = 0; s < Track.end; s += 95, k++) {
    if (covered(s, 8) || busy(s, 4)) continue;
    const side = k % 2 ? 1 : -1;
    if (side > 0 && onSiding(s, 6)) continue;
    mast(s, beside(side, s, STACKS - 1.3), 27);
    if (k % 3 === 0) mast(s + 40, beside(1, s + 40, QUAY - 3.5), 32);
  }
  instances(cube, 0x7f858c, masts);
  instances(cube, 0x4a4f57, heads);
  instances(cube, 0xfff4c8, lamps, true);

  // ---- gantry cranes over the road, one every 330 m or so, clear of the side roads' ramps, the tunnels, and
  // whatever the level has across the road
  for (let s = Track.start + 170, k = 0; s < Track.end - 60; s += 330) {
    let at = null;
    for (const q of [s, s + 40, s - 40, s + 80]) if (!busy(q, 14) && !covered(q, 30) && !onRamps(q) && !within(LEVEL.reversible, q, 12) && !within(LEVEL.balloons, q, 40, 's', 's')) { at = q; break; }
    if (at === null) continue;
    stand(makeGantry(Track.hi(at) - Track.lo(at) + 4.4, 19, k++), at, (Track.lo(at) + Track.hi(at)) / 2);
  }

  // ---- reach stackers standing in the aisles; and straddle carriers running up and down their lane, each over
  // a beat of its own
  aisles.forEach(([s, side], k) => {
    if (k % 2) return;
    Track.toWorld(s, beside(side, s, STACKS + 5), p);
    if (!offRoads(p.x, p.z, 8)) return;
    stand(makeStacker(k / 2), s, beside(side, s, STACKS + 5), side > 0 ? -Math.PI / 2 : Math.PI / 2);
  });
  const carriers = [];
  for (let s = Track.start + 120, k = 0; s < Track.end - 220; s += 260, k++) {
    const side = k % 2 ? -1 : 1, reach = 150;
    let clear = true;
    for (let q = s - 12; q <= s + reach + 12 && clear; q += 6) {
      Track.toWorld(q, beside(side, q, 7), p);
      clear = !busy(q, 4) && !covered(q, 4) && offRoads(p.x, p.z, 5) && !(side > 0 && onSiding(q, 8)) && !(LEVEL.targets || []).some(t => !t.road && (t.side === 'left' ? -1 : 1) === side && Math.abs(t.s - q) < 8);
    }
    if (!clear) continue;
    const model = makeStraddle(k, k % 3 !== 2);
    levelGroup.add(model);
    carriers.push({ model, s, reach, side, phase: rand() * 60, period: 46 + rand() * 20 });
  }

  // ---- beyond the stacks on the landward side: sheds, and a tank farm now and then
  const sheds = [], roofs = [], doors = [], tanks = [], tops = [];
  for (let s = Track.start - 60, k = 0; s < Track.end + 120; s += 130, k++) {
    const q = Math.max(Track.start, Math.min(Track.end, s)), d = 125 + rand() * 60;
    Track.toWorld(q, beside(-1, q, d), p);
    if (!offRoads(p.x, p.z, 45) || Track.mainDistance(p.x, p.z) < d - 20) continue;
    if (k % 3 < 2) {
      const h = 13 + rand() * 8, lat = beside(-1, q, d);
      sheds.push([s, lat, h / 2, 46, h, 96]);
      roofs.push([s, lat, h + 0.5, 48, 1, 98]);
      for (let z = -36; z <= 36; z += 24) doors.push([s + z, lat + 23.1, 4, 0.3, 8, 12]);
    } else for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const r = 11 + rand() * 4, h = 13 + rand() * 6;
      tanks.push([s - 34 + i * 34, beside(-1, q, d - 14 + j * 32), h / 2, r * 2, h, r * 2]);
      tops.push([s - 34 + i * 34, beside(-1, q, d - 14 + j * 32), h + 0.3, r * 2.06, 0.6, r * 2.06]);
    }
  }
  instances(cube, 0x9aa3ab, sheds, false, 4);
  instances(cube, 0x33608f, roofs, false, 4);
  instances(cube, 0x5b6470, doors, false, 4);
  instances(tube, 0xe6e8ea, tanks, false, 4);
  instances(tube, 0xc9302c, tops, false, 4);

  // ---- what moves, moved: the cranes' trolleys near enough to be seen, and the straddle carriers (out along
  // their beat and back again, never turning round: they drive as well backwards)
  everyFrame(levelGroup, (t, x, y, z) => {
    for (const model of moving) if ((model.position.x - x) ** 2 + (model.position.z - z) ** 2 < 620 * 620) model.userData.animate(t);
    for (const c of carriers) {
      const u = ((t + c.phase) % c.period) / c.period, leg = u < 0.5 ? u * 2 : 2 - u * 2, eased = leg * leg * (3 - 2 * leg), s = c.s + eased * c.reach;
      const h = Track.toWorld(s, beside(c.side, s, 7), p);
      c.model.position.set(p.x, p.y, p.z);
      c.model.rotation.y = h;
    }
  });
};
