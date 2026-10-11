// ---- volcano island: a black road over black sand. Rivers of lava glowing beside it, winding, each in a bed of
// dark crust, and one straight across under every bridge (a level's "bridges" and "drawbridges"); boulders of
// basalt, palms (some of them burnt to a stump), thatched huts and torches at the roadside, vents in the ground
// puffing steam; the sea off to the right beyond a line of surf, dark hills inland; ash coming down, and a few
// embers; and on the skyline the volcano, smoking, lava down its flanks, always there however far the road goes
// (it keeps its place in the sky as a far mountain does: it is moved with the camera).
// A theme with "erupting" (volcanoErupting: Eruption Day) has the mountain going up: bigger and nearer, a fountain
// of lava standing out of its crater, pulsing, and four times the embers coming down.
// (Its models: volcanoModels.js. What moves keeps its own time: sceneryClock.js. Only a sight, all of it.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { everyFrame } from './sceneryClock.js';
import { makeVolcano, FRONDS, BOULDER, PUFF } from './volcanoModels.js';

export const volcano = ({ theme, add, instances, sideStrip, buildStrip, offRoads, beside, inJunction, exits, cube, tube, cone, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 23 + (LEVEL.id || '').length * 613;
  const erupting = !!theme.erupting;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {};
  const within = (list, s, pad, a = 'from', b = 'to') => (list || []).some(x => !x.road && s >= x[a] - pad && s <= x[b] + pad);
  const covered = (s, pad = 0) => within(LEVEL.tunnels, s, pad);
  // where lava runs across under the road: every bridge, and every drawbridge
  const draws = (LEVEL.drawbridges || []).filter(b => !b.road).map(b => [b.s - 15, b.s + 15]);
  const spans = [...(LEVEL.bridges || []).filter(b => !b.road).map(b => [b.from + 8, b.to - 8]), ...draws];
  const spanned = (s, pad = 0) => spans.some(([a, b]) => s > a - pad && s < b + pad) || within(LEVEL.bridges, s, pad);
  const busy = (s, pad = 0) => covered(s, pad) || spanned(s, pad) || inJunction(s) || within(LEVEL.crossings, s, pad + 20, 's', 's');
  const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...extra });
  const CRUST = glow(0x0e0a0a), LAVA = glow(0xff4a12), CORE = glow(0xffb52e), HALO = glow(0xff5a1e, { transparent: true, opacity: 0.09, depthWrite: false });

  // ---- lava: rivers beside the road, 150 m of one in every 210, each side out of step with the other
  const rivers = []; // [from, to, side, nearest, furthest]: nothing else stands in one
  for (const side of [-1, 1]) {
    for (let s0 = Track.start + (side > 0 ? 40 : 140); s0 < Track.end - 30; s0 += 210) {
      const near = 8 + rand() * 9, ph = rand() * 6, wide = 6 + rand() * 4, to = Math.min(Track.end, s0 + 110 + rand() * 60);
      if ([s0, to, (s0 + to) / 2].some(q => spanned(q, 40) || covered(q, 30))) continue; // (none into a bridge's, or up against a tunnel)
      const fade = (q) => Math.min(1, (q - s0) / 25, (to - q) / 25);                      // (it narrows to nothing at each end)
      const a = (q) => near + 4 * Math.sin(q * 0.045 + ph), w = (q) => (wide + 2.5 * Math.sin(q * 0.031 + ph * 2)) * Math.max(0.05, fade(q));
      const strip = (in0, out0, y, mat) => add(sideStrip(s0, to, (q) => beside(side, q, a(q) + w(q) * in0), (q) => beside(side, q, a(q) + w(q) * out0), y, 4), mat);
      strip(-0.55, 1.55, 0.05, HALO);
      strip(-0.22, 1.22, 0.07, CRUST);
      strip(0, 1, 0.09, LAVA);
      strip(0.3, 0.7, 0.11, CORE);
      rivers.push([s0, to, side, near - 7, near + wide + 9]);
    }
  }
  // ...and one across under each bridge, as far as the land goes either side, its banks black
  for (const [from, to] of spans) {
    for (const side of [-1, 1]) {
      const across = (in0, out0, y, mat) => add(sideStrip(from + in0, to - in0, (q) => beside(side, q, out0), (q) => beside(side, q, 126), y, 4), mat);
      across(-9, 0.3, 0.05, HALO);
      across(-2.5, 0.3, 0.07, CRUST);
      across(0, 0.3, 0.09, LAVA);
      across((to - from) * 0.3, 0.3, 0.11, CORE);
    }
  }
  // (a drawbridge has a river of its own under it, drawn with it from bank to bank, in this theme's `river` and
  // `riverCore` colours (../../themes.js, render/hazards.js): so it is lava the car jumps when the leaves are up)
  const clearOfLava = (s, side, d, pad = 2) => !rivers.some(([a, b, at, d0, d1]) => at === side && s > a - pad && s < b + pad && d > d0 - pad && d < d1 + pad) && !spanned(s, pad + 4);

  // ---- the sea, off to the right beyond the land, and its line of surf (at the height of the sea, whatever
  // the road is doing)
  const sea = (a, b, y, color) => {
    const pos = [], idx = [];
    for (let s = Track.start - 60, n = 0; s <= Track.end + 60; s += 10, n++) {
      const q = Math.max(Track.start, Math.min(Track.end, s));
      for (const d of [a, b]) { Track.toWorld(s, Track.hi(q) + d, p); pos.push(p.x, y, p.z); }
      if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    mesh.userData.flat = true;
    mesh.renderOrder = -1;
    levelGroup.add(mesh);
  };
  sea(132, 700, -0.02, 0x2a8496);
  sea(129, 133, 0, 0xdfeeee);

  // ---- along the road: marker posts at the edge, torches now and then
  const markers = [], tips = [], torches = [], flames = [], cores = [];
  for (const [from, to] of [[Track.start, Track.end], ...exits.map(x => [x.side0, x.sideEnd])]) {
    for (let s = from + 5, k = 0; s < to; s += 15, k++) {
      if (covered(s, 2) || inJunction(s)) continue;
      for (const side of [-1, 1]) {
        markers.push([s, beside(side, s, 0.5), 0.45, 0.14, 0.9, 0.14]);
        tips.push([s, beside(side, s, 0.5), 0.82, 0.16, 0.18, 0.16]);
      }
      if (k % 4 === 0 && !busy(s, 4)) {
        const side = (k / 4) % 2 ? 1 : -1, lat = beside(side, s, 1.6);
        torches.push([s, lat, 1.3, 0.14, 2.6, 0.14]);
        flames.push([s, lat, 2.95, 0.5, 0.7, 0.5]);
        cores.push([s, lat, 3.1, 0.24, 0.8, 0.24]);
      }
    }
  }
  instances(cube, 0xe8e2d4, markers);
  instances(cube, 0xff7a1e, tips, true);
  instances(tube, 0x4a3524, torches);
  instances(cone, 0xff5a14, flames, true);
  instances(cone, 0xffd23f, cores, true);

  // ---- what stands on the sand, one lot every 13 m each side: boulders, palms, burnt stumps, vents, huts
  const rocks = [[], [], []], trunks = [], crowns = [[], []], nuts = [], stumps = [], mounds = [], throats = [], posts = [], floors = [], thatch = [];
  const vents = [];
  const palm = (s, lat) => {
    const h = 6.5 + rand() * 5;
    trunks.push([s, lat, h / 2, 0.42, h, 0.42]);
    crowns[rand() < 0.5 ? 0 : 1].push([s, lat, h - 0.1, 1 + rand() * 0.25, 1, 1 + rand() * 0.25]);
    nuts.push([s, lat, h - 0.5, 0.9, 0.6, 0.9]);
  };
  for (const [from, to, main] of [[Track.start, Track.end, true], ...exits.map(x => [x.side0, x.sideEnd, false])]) {
    for (let s0 = from + 4; s0 < to - 4; s0 += 13) {
      for (const side of [-1, 1]) {
        const s = s0 + rand() * 9, roll = rand();
        if (covered(s, 16)) continue;
        if (main) { // further off, out to the hills: boulders and palms, thinner the further
          const d = 34 + rand() * rand() * 90, q = s + rand() * 12;
          if (clearOfLava(q, side, d, 4) && !within(LEVEL.crossings, q, 9, 's', 's')) {
            if (rand() < 0.55) { const r = 1.5 + rand() * rand() * 9; rocks[Math.floor(rand() * 3)].push([q, beside(side, q, d), r * 0.3, r * (1.6 + rand()), r, r * (1.6 + rand())]); }
            else palm(q, beside(side, q, d));
          }
        }
        if (busy(s, 5)) continue;
        if (roll < 0.34) { // a boulder or three
          for (let k = 0; k < 1 + Math.floor(rand() * 3); k++) {
            const r = 0.8 + rand() * rand() * 3.5, d = 4 + r + rand() * 24, q = s + k * 3;
            if (clearOfLava(q, side, d, r)) rocks[Math.floor(rand() * 3)].push([q, beside(side, q, d), r * 0.32, r * 2, r * (0.9 + rand() * 0.5), r * 2]);
          }
        } else if (roll < 0.62) { // a palm, or a pair
          for (let k = 0; k < 1 + Math.floor(rand() * 2); k++) {
            const d = 4.5 + rand() * 22, q = s + k * 5;
            if (clearOfLava(q, side, d, 3)) palm(q, beside(side, q, d));
            else if (clearOfLava(q, side, d, 0.5)) stumps.push([q, beside(side, q, d), 1.6 + rand() * 1.5, 0.4, 3.2 + rand() * 3, 0.4]); // (too near the lava: burnt)
          }
        } else if (roll < 0.76) { // a vent: a low mound, a glow in its throat, steam out of it
          const d = 5 + rand() * 16;
          if (!clearOfLava(s, side, d, 3)) continue;
          const lat = beside(side, s, d);
          Track.toWorld(s, lat, p);
          if (!offRoads(p.x, p.z, 3)) continue;
          mounds.push([s, lat, 0.45, 4.4, 0.9, 4.4]);
          throats.push([s, lat, 0.92, 1.3, 0.08, 1.3]);
          vents.push({ x: p.x, y: p.y + 1, z: p.z, phase: rand(), reach: 7 + rand() * 6 });
        } else if (roll < 0.83 && main) { // a hut on stilts under a thatched roof
          const d = 9 + rand() * 12;
          if (!clearOfLava(s, side, d, 6)) continue;
          const lat = beside(side, s, d);
          for (const i of [-1, 1]) for (const j of [-1, 1]) posts.push([s + i * 1.9, lat + j * 1.9, 1.6, 0.25, 3.2, 0.25]);
          floors.push([s, lat, 1.1, 4.6, 0.25, 4.6]);
          thatch.push([s, lat, 4.6, 7.4, 3.4, 7.4]);
        }
      }
    }
  }
  [0x1b1a1e, 0x26252b, 0x322c2e].forEach((color, i) => instances(BOULDER, color, rocks[i], false, 1));
  instances(tube, 0x7a6650, trunks);
  [0x3f9a4a, 0x2c7f45].forEach((color, i) => instances(FRONDS, color, crowns[i]));
  instances(BOULDER, 0x4a3524, nuts);
  instances(tube, 0x141214, stumps);
  instances(cone, 0x221d1f, mounds);
  instances(tube, 0xff7a1e, throats, true);
  instances(cube, 0x5a4630, posts);
  instances(cube, 0x7a6248, floors);
  instances(new THREE.ConeGeometry(0.5, 1, 4).rotateY(Math.PI / 4), 0xb89a5c, thatch, false, 1);

  // ---- hills inland (the left), dark against the sky: cones of rock, their feet well down
  const hills = [];
  for (let s = Track.start - 100; s < Track.end + 150; s += 85) {
    const q = Math.max(Track.start, Math.min(Track.end, s)), r = 45 + rand() * 60, h = 40 + rand() * 60, d = 150 + r * 0.6 + rand() * 110;
    Track.toWorld(q, beside(-1, q, d), p);
    if (!offRoads(p.x, p.z, r) || Track.mainDistance(p.x, p.z) < d - 25) continue;
    hills.push([s, beside(-1, q, d), h / 2 - 30, r * 2, h + 60, r * 2]);
  }
  instances(new THREE.ConeGeometry(0.5, 1, 7), 0x2c2529, hills, false, 20);

  // ---- steam: three puffs to a vent, rising and spreading, only the vents near enough to be seen
  const steam = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.36, depthWrite: false });
  const POOL = 150, EACH = 5, puffs = [];
  for (let k = 0; k < POOL; k++) { const puff = new THREE.Mesh(PUFF, steam); puff.visible = false; puff.userData.flat = true; levelGroup.add(puff); puffs.push(puff); }

  // ---- ash coming down all round the camera, and a few embers among it
  const fallout = (color, count, size, speed, opacity) => {
    const BOX = 70, points = [];
    for (let i = 0; i < count; i++) points.push((rand() - 0.5) * BOX * 2, rand() * BOX, (rand() - 0.5) * BOX * 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false });
    return [0, 1].map(layer => { const fall = new THREE.Points(geo, mat); fall.frustumCulled = false; fall.userData = { layer, speed, BOX }; levelGroup.add(fall); return fall; });
  };
  const falls = [...fallout(0x3a3437, 1300, 0.24, 2.6, 0.85), ...fallout(0xff8a2a, erupting ? 680 : 170, erupting ? 0.26 : 0.2, 1.4, 0.95)];

  // ---- the volcano on the skyline: off to the left of the way the road goes, taken as a whole
  const HIGH = erupting ? 88 : 78;
  const mountain = makeVolcano(erupting ? 150 : 125, HIGH);
  // (erupting: the fountain over the crater, three cones one inside another, the hottest innermost, each its own beat)
  const fountain = [];
  if (erupting) {
    for (const [color, wide, tall, beat] of [[0xff4a12, 21, 30, 2.3], [0xff8a1e, 13, 38, 3.1], [0xffd24a, 6, 45, 4.3]]) {
      const jet = new THREE.Mesh(new THREE.ConeGeometry(wide, tall, 12, 1, true).translate(0, tall / 2, 0), new THREE.MeshBasicMaterial({ color, fog: false, side: THREE.DoubleSide, transparent: true, depthTest: false }));
      jet.position.y = HIGH - 3;
      jet.renderOrder = 6 + fountain.length; // (through its own smoke, which would hide it: the sky is all that is ever behind it)
      jet.userData.beat = beat;
      mountain.add(jet);
      fountain.push(jet);
    }
  }
  mountain.userData.flat = true; // (a backdrop: never in any road's way)
  levelGroup.add(mountain);
  const a = {}, b = {};
  Track.toWorld(0, 0, a); Track.toWorld(Track.length, 0, b);
  const bearing = Math.atan2(b.x - a.x, b.z - a.z) + 0.3, FAR = erupting ? 500 : 540;

  everyFrame(levelGroup, (t, x, y, z) => {
    mountain.position.set(x + Math.sin(bearing) * FAR, Math.max(0, y - 11) * 0.55 - 4, z + Math.cos(bearing) * FAR);
    mountain.userData.animate(t);
    for (const jet of fountain) { const b = jet.userData.beat, up = 0.78 + 0.22 * Math.sin(t * b) + 0.1 * Math.sin(t * b * 2.7 + 1); jet.scale.set(1 + 0.12 * Math.sin(t * b * 1.9), up, 1 + 0.12 * Math.sin(t * b * 1.9)); }
    for (const fall of falls) {
      const { layer, speed, BOX } = fall.userData, down = (t * speed + layer * BOX) % (BOX * 2);
      fall.position.set(x + Math.sin(t / 3) * 3, y + BOX - down, z);
    }
    let n = 0;
    for (const v of vents) {
      if (n > POOL - EACH) break;
      if ((v.x - x) ** 2 + (v.z - z) ** 2 > 260 * 260) continue;
      for (let k = 0; k < EACH; k++) {
        const u = (t * 0.3 + k / EACH + v.phase) % 1, puff = puffs[n++], size = (0.8 + u * 3.4) * Math.min(1, (1 - u) * 4);
        puff.visible = true;
        puff.position.set(v.x + Math.sin(u * 3 + v.phase * 9) * 1.2 + u * u * 3, v.y + u * v.reach, v.z);
        puff.scale.set(size, size * 1.25, size);
      }
    }
    for (; n < POOL; n++) puffs[n].visible = false;
  });
};
