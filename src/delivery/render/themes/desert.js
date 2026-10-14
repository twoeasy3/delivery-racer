// ---- desert dunes, Dakar-rally style: a pale sandy unmarked track with tyre ruts across a sea of orange-gold dunes (the
// theme's terrain: windward faces light, lee faces dark; this file stripes it with the wind's ripples), under a pale hot
// hazy sky with a pale sun in it. Beside the track: dry bushes, thorn trees, sandstone rocks, hoodoos; rock arches that
// stand over the road; mesas and long dunes on the skyline; every 1100 m a rally service camp (a banner over the road, a row
// of tents and a marquee, flags, service trucks, fuel drums and jerrycans); a caravan of camels now and then, and an oasis of
// palms. Sand blows across the track (one Points object, thicker and faster in a crosswind: a level's "crosswinds").
// Everything is instanced or merged, nothing is allocated in a frame, and it is laid out the same every run (a seed of the
// level's own). (Where the camps, arches and oases are is CAMP, ARCH and OASIS below, the same on every level.)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { Player } from '../../player.js';
import { Gambles } from '../../gambles.js';
import { landAt } from '../road.js'; // (the height of the land as drawn: null on a level whose theme has no terrain)
import { everyFrame } from './sceneryClock.js';
import { archGeometry, palmCrownGeometry, duneGeometry, roofGeometry, wheelGeometry, discGeometry } from './desertModels.js';

const CAMP = { first: 380, every: 1100, length: 130 };   // a camp from 380 to 510 m, the next from 1480...
const ARCH = { first: 690, every: 1300 };                // a rock arch over the road at 690 m, 1990...
const OASIS = { first: 1180, every: 1500 };              // an oasis beside the road at 1180 m, 2680...
const CARAVAN = { first: 900, every: 850 };              // a caravan of camels at 900 m, 1750...
const NAMES = ['BIVOUAC', 'SERVICE', 'FUEL', 'ASSISTANCE'];
const CANVAS = 0xf1e8d2;

export const desert = ({ add, flat, instances, sideStrip, offRoads, beside, inJunction, cube, tube, cone, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 11 + (LEVEL.id || '').length * 173;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {};
  const open = (s) => s > Track.start + 4 && s < Track.end - 4 && !inJunction(s) && !Track.onBridge(s) && !(Track.tunnel(s) > 0);
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));
  // how far the land is above the road at (s, lat): what stands on a dune stands on the dune (the terrain's own height)
  const up = (s, lat) => { Track.toWorld(s, lat, p); return landAt ? landAt(p.x, p.z) - p.y : -0.3; };
  // is there room at (s, side, d) for a thing r m across (clear of every other road)?
  // (and that no part of the main road, a hairpin's other leg, say, is nearer than this thing's own road)
  const room = (s, side, d, r) => { if (!open(s)) return false; Track.toWorld(s, beside(side, s, d), p); return offRoads(p.x, p.z, r) && Track.mainDistance(p.x, p.z) > half(s) + d - 3; };

  const BALL = new THREE.SphereGeometry(0.5, 7, 5), ROCK = new THREE.DodecahedronGeometry(0.5, 0), TUFT = new THREE.ConeGeometry(0.5, 1, 5);
  const ROOF = roofGeometry(), WHEEL = wheelGeometry(), DISC = discGeometry();
  const MESA = new THREE.CylinderGeometry(0.5, 0.56, 1, 9), SPIRE = new THREE.CylinderGeometry(0.3, 0.5, 1, 7), CAP = new THREE.CylinderGeometry(0.62, 0.3, 1, 8);

  // ---- the land: the wind's ripples, drawn into the terrain's vertex colours as long bands running across the dunes, and
  // a warmer and a paler tint wandering over it, so the great faces are not one flat orange. (The terrain mesh is the one
  // in the level's group with a colour of its own for every vertex.)
  const land = levelGroup.children.find(c => c.isMesh && c.material?.vertexColors && c.geometry?.attributes?.color && c.geometry.attributes.position.count > 400);
  if (land) {
    const geo = land.geometry, pos = geo.attributes.position, col = geo.attributes.color, c = new THREE.Color(), warm = new THREE.Color(0xe2832f), pale = new THREE.Color(0xf6d79c);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const along = x * 0.84 + z * 0.54 + Math.sin(x * 0.011 + z * 0.017) * 11 + Math.sin(z * 0.031) * 4;
      const ripple = 0.5 + 0.5 * Math.sin(along / 5.4), drift = Math.sin(x * 0.0043 - z * 0.0037) + Math.sin(x * 0.0091 + z * 0.0061) * 0.5;
      c.fromBufferAttribute(col, i);
      c.lerp(drift > 0 ? warm : pale, Math.min(0.28, Math.abs(drift) * 0.2));
      c.multiplyScalar(0.9 + 0.17 * ripple);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  // ---- the track: tyre ruts, a pair worn into every lane, in runs (60 m of rut, 20 m without), each weaving a little
  // across its lane. All of them one merged mesh. Darker than the track, a hair above it
  const ruts = [];
  for (let lane = 0; lane < Track.laneCount; lane++) {
    if (Track.medianLanes && lane >= Track.leftLanes && lane < Track.leftLanes + Track.medianLanes) continue;
    for (const g of [-0.85, 0.85]) {
      for (let s = Track.start + 8 + (lane * 17 + (g > 0 ? 9 : 0)) % 40; s < Track.end - 70; s += 80) {
        if (!open(s) || !open(s + 60)) continue;
        const at = (q) => Track.laneOffset(lane, q) + g + Math.sin(q / 41 + lane * 1.9 + g) * 0.22;
        ruts.push(sideStrip(s, s + 60, (q) => at(q) - 0.19, (q) => at(q) + 0.19, 0.04, 4));
      }
    }
  }
  if (ruts.length) {
    const mat = flat(0xcdb07c);
    mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
    add(mergeGeometries(ruts, false), mat);
  }

  // ---- the track's edge: a white post with an orange cap every 40 m each side, where the sand takes over from the track
  const posts = [], caps = [];
  for (let s = Track.start + 20; s < Track.end - 10; s += 40) {
    if (!open(s)) continue;
    for (const side of [-1, 1]) { const lat = beside(side, s, 0.9); posts.push([s, lat, 0.62, 0.2, 1.3, 0.2]); caps.push([s, lat, 1.4, 0.26, 0.3, 0.26]); }
  }
  instances(cube, 0xf4f1e6, posts);
  instances(cube, 0xff7a1a, caps);

  // ---- long dunes on the skyline: a whaleback of sand every so often, 200 to 430 m out, lying along the road, two colours
  // for the lit face and the lee. Out where the haze takes them: soft shapes against the sky
  const dunes = [[], [], [], []];
  for (let s = Track.start - 100, k = 0; s < Track.end + 100; s += 105 + rand() * 40, k++) {
    const at = Math.max(Track.start, Math.min(Track.end, s)), side = k % 2 ? 1 : -1, len = 180 + rand() * 220, wide = 110 + rand() * 90, tall = 24 + rand() * 40;
    const d = 200 + wide / 2 + rand() * 230;
    if (!room(at, side, d, wide / 2 + 20)) continue;
    const lat = beside(side, at, d);
    dunes[k % 4].push([s, lat, up(at, lat) - 1, wide, tall * 2, len]);
  }
  instances(duneGeometry(0.2), 0xeab260, dunes[0]);
  instances(duneGeometry(-0.2), 0xe09f4f, dunes[1]);
  instances(duneGeometry(0.2), 0xd98f42, dunes[2]);
  instances(duneGeometry(-0.2), 0xf0c276, dunes[3]);

  // ---- mesas and buttes beyond the dunes: a wide flat-topped block in three tiers (pale, rust, pale cap) with scree at its
  // foot, and slim spires with a cap, 230 to 500 m out
  const mesaLow = [], mesaMid = [], mesaTop = [], scree = [], spires = [], spireCaps = [];
  for (let s = Track.start - 100, k = 0; s < Track.end + 100; s += 190 + rand() * 90, k++) {
    const at = Math.max(Track.start, Math.min(Track.end, s)), side = k % 2 ? -1 : 1, spire = k % 4 === 3;
    const r = spire ? 6 + rand() * 6 : 34 + rand() * 40, h = spire ? 38 + rand() * 40 : 28 + rand() * 38, long = spire ? 1 : 1 + rand() * 1.2;
    const d = 230 + r + rand() * 200;
    if (!room(at, side, d, r * long + 10)) continue;
    const lat = beside(side, at, d), y0 = up(at, lat);
    if (spire) { spires.push([s, lat, y0 + h / 2 - 2, r * 2, h, r * 2]); spireCaps.push([s, lat, y0 + h - 1, r * 3, 7, r * 3]); continue; }
    mesaLow.push([s, lat, y0 + h * 0.18 - 2, r * 2, h * 0.36, r * 2 * long]);
    mesaMid.push([s, lat, y0 + h * 0.58 - 2, r * 1.8, h * 0.44, r * 1.8 * long]);
    mesaTop.push([s, lat, y0 + h * 0.88 - 2, r * 1.72, h * 0.24, r * 1.72 * long]);
    scree.push([s, lat, y0 + h * 0.08 - 2, r * 2.7, h * 0.18, r * 2.7 * long]);
  }
  instances(MESA, 0xd9a269, mesaLow);
  instances(MESA, 0xb5683a, mesaMid);
  instances(MESA, 0xe0b27a, mesaTop);
  instances(cone, 0xd49a5c, scree);
  instances(SPIRE, 0xc17a46, spires);
  instances(CAP, 0xa65f33, spireCaps);

  // ---- rock arches: a natural arch of sandstone standing over the road, its feet well outside the shoulders, the top
  // 30 m up; a buttress of boulders at each foot
  const arches = [], buttress = [], buttress2 = [];
  for (let s = ARCH.first; s < Track.end - 60; s += ARCH.every) {
    const w = half(s), sx = (w + 4) / 0.7, sy = 21;
    if (!open(s - 20) || !open(s) || !open(s + 20)) continue;
    arches.push([s, (Track.lo(s) + Track.hi(s)) / 2, up(s, 0) - 0.4, sx, sy, 14]);
    for (const side of [-1, 1]) {
      const lat = (Track.lo(s) + Track.hi(s)) / 2 + side * sx;
      buttress.push([s, lat, up(s, lat) + 3, 9, 7, 10], [s + 3, lat + side * 6, up(s, lat) + 1.6, 6, 4, 6]);
      buttress2.push([s - 4, lat + side * 3, up(s, lat) + 2, 5, 5, 6]);
    }
  }
  instances(archGeometry(), 0xc7753f, arches);
  instances(ROCK, 0xb5683a, buttress);
  instances(ROCK, 0xd08a52, buttress2);

  // ---- hoodoos: pillars of sandstone with a fat cap, in groups of three or four, here and there out in the dunes
  const pillars = [], hoods = [];
  for (let s = 260; s < Track.end - 100; s += 430 + rand() * 120) {
    const side = rand() < 0.5 ? -1 : 1, d = 48 + rand() * 60;
    if (!room(s, side, d, 18)) continue;
    for (let i = 0; i < 4; i++) {
      const q = s + (rand() - 0.5) * 30, lat = beside(side, q, d + (rand() - 0.5) * 24), h = 5 + rand() * 9, r = 0.9 + rand() * 1.1, y0 = up(q, lat);
      pillars.push([q, lat, y0 + h / 2 - 0.5, r * 1.7, h, r * 1.7]);
      hoods.push([q, lat, y0 + h, r * 3.2, 1.6 + r, r * 3.2]);
    }
  }
  instances(SPIRE, 0xc9854c, pillars);
  instances(CAP, 0xa65f33, hoods);

  // ---- the scrub: dry bushes, tufts of grass, thorn trees and sandstone rocks, thick near the track and thinning out
  const bushes = [[], []], tufts = [], trunks = [], crowns = [], rocks = [[], []], boulders = [];
  for (let s0 = Track.start + 6; s0 < Track.end - 6; s0 += 11) {
    for (const side of [-1, 1]) {
      const s = s0 + rand() * 8, roll = rand(), d = 3.5 + rand() * rand() * 70;
      if (!room(s, side, d, 4)) continue;
      const lat = beside(side, s, d), y0 = up(s, lat);
      if (roll < 0.34) { for (let k = 0; k < 2; k++) { const r = 0.9 + rand() * 1.5; bushes[k].push([s + (rand() - 0.5) * 4, lat + (rand() - 0.5) * 4, y0 + r * 0.22, r * 1.6, r * 0.8, r * 1.4]); } }
      else if (roll < 0.52) { for (let k = 0; k < 4; k++) { const h = 0.8 + rand() * 0.9; tufts.push([s + (rand() - 0.5) * 2.6, lat + (rand() - 0.5) * 2.6, y0 + h / 2 - 0.05, 0.9, h, 0.9]); } }
      else if (roll < 0.62) { const h = 3 + rand() * 1.8, w = 4 + rand() * 2.4; trunks.push([s, lat, y0 + h / 2, 0.34, h, 0.34]); crowns.push([s, lat, y0 + h + 0.2, w, 0.9 + rand() * 0.5, w * 0.9]); }
      else if (roll < 0.9) { const r = 0.8 + rand() * rand() * 3.5; rocks[roll < 0.76 ? 0 : 1].push([s, lat, y0 + r * 0.25, r, r * 0.75, r * 1.2]); if (rand() < 0.4) boulders.push([s + r, lat + side * r, y0 + 0.2, 0.7, 0.5, 0.7]); }
    }
  }
  instances(BALL, 0x9d8c54, bushes[0]);
  instances(BALL, 0xb09c5c, bushes[1]);
  instances(TUFT, 0xd2b869, tufts);
  instances(tube, 0x6b4a2b, trunks);
  instances(BALL, 0x8f9a52, crowns);
  instances(ROCK, 0xb06a3c, rocks[0]);
  instances(ROCK, 0x93562f, rocks[1]);
  instances(ROCK, 0xc08850, boulders);

  // ---- rally service camps: beside the road every CAMP.every m, on alternating sides. A banner over the road at its
  // entrance; a row of tents (white canvas, coloured roofs) and a marquee; flags on tall masts; two service trucks;
  // drums, stacks of jerrycans; a shade net on poles
  const walls = [], roofs = [[], [], [], []], marquees = [], marqueeRoofs = [], masts = [], flags = [[], [], []], truckBodies = [], truckCabs = [], truckStripes = [], wheels = [];
  const drums = [[], []], cans = [[], []], netTops = [], gantry = [];
  const boards = new Map();
  const board = (name) => {
    if (!boards.has(name)) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f1e8d2'; ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#c8321f'; ctx.fillRect(0, 0, 256, 7); ctx.fillRect(0, 57, 256, 7);
      ctx.fillStyle = '#2b2f38'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 36px Arial Black, Arial, sans-serif';
      ctx.fillText(name, 128, 34, 236);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      boards.set(name, new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    }
    return boards.get(name);
  };
  const PLANE = new THREE.PlaneGeometry(1, 1);
  const camp = (n, from, side) => {
    const FRONT = 11;
    // the tents: five in a row, parallel to the road
    for (let i = 0; i < 5; i++) {
      const s = from + 12 + i * 13, lat = beside(side, s, FRONT + 4), y0 = up(s, lat);
      walls.push([s, lat, y0 + 0.85, 6.2, 1.7, 7.4]);
      roofs[(n + i) % 4].push([s, lat, y0 + 1.7 + 1.3, 7.4, 2.6, 8.8]);
    }
    // the marquee behind them, longer along the road, with a mast and a flag on it
    const ms = from + 50, ml = beside(side, ms, FRONT + 18), my = up(ms, ml);
    marquees.push([ms, ml, my + 1.6, 9, 3.2, 26]);
    marqueeRoofs.push([ms, ml, my + 3.2 + 1.7, 11, 3.4, 28]);
    masts.push([ms, ml, my + 11, 0.22, 16, 0.22]);
    flags[n % 3].push([ms, ml, my + 17.4, 0.06, 2.2, 3.6]);
    // masts along the front, flag after flag in red, yellow and blue
    for (let i = 0; i < 7; i++) {
      const s = from + 4 + i * 20, lat = beside(side, s, 6), y0 = up(s, lat);
      masts.push([s, lat, y0 + 4.2, 0.16, 8.4, 0.16]);
      flags[(i + n) % 3].push([s, lat, y0 + 7.4, 0.05, 1.5, 2.4]);
    }
    // two service trucks nose to tail, beside the marquee
    for (let i = 0; i < 2; i++) {
      const s = from + 14 + i * 40, lat = beside(side, s, FRONT + 33), y0 = up(s, lat);
      truckBodies.push([s - 1.5, lat, y0 + 2.3, 2.7, 3.2, 6.6]);
      truckStripes.push([s - 1.5, lat, y0 + 2.2, 2.74, 0.6, 6.7]);
      truckCabs.push([s + 3.1, lat, y0 + 1.7, 2.5, 2.3, 2.4]);
      for (const z of [-3.6, -1.5, 3.2]) for (const x of [-1.2, 1.2]) wheels.push([s + z, lat + x, y0 + 0.62, 0.4, 1.25, 1.25]);
    }
    // drums and jerrycans in a heap at the front of the camp
    for (let i = 0; i < 10; i++) {
      const s = from + 98 + (i % 5) * 1.3, lat = beside(side, s, FRONT + 2 + Math.floor(i / 5) * 1.4), y0 = up(s, lat);
      if (i < 6) drums[i % 2].push([s, lat, y0 + 0.5, 0.95, 1.0, 0.95]);
      else cans[i % 2].push([s, lat, y0 + 0.28, 0.5, 0.56, 0.5], [s, lat, y0 + 0.84, 0.5, 0.56, 0.5]);
    }
    // a shade net on four poles
    const ns = from + 108, nl = beside(side, ns, FRONT + 14), ny = up(ns, nl);
    netTops.push([ns, nl, ny + 3.2, 7, 0.12, 9]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) masts.push([ns + b * 4.4, nl + a * 3.4, ny + 1.6, 0.14, 3.2, 0.14]);
    // the banner over the road: two posts outside the shoulders, a beam across, the name hung from it
    const w = half(from) + 1.4, mid = (Track.lo(from) + Track.hi(from)) / 2;
    for (const a of [-1, 1]) gantry.push([from, mid + a * w, 4.4, 0.7, 8.8, 0.7]);
    gantry.push([from, mid, 8.7, w * 2 + 0.7, 0.6, 0.7]);
    const h = Track.toWorld(from, mid, p);
    const sign = new THREE.Mesh(PLANE, board(NAMES[n % NAMES.length]));
    sign.position.set(p.x, p.y + 7.05, p.z);
    sign.rotation.y = h + Math.PI;                       // (its face back down the road, to the player coming)
    sign.scale.set(Track.mirrored ? -w * 2 : w * 2, 3.3, 1);
    levelGroup.add(sign);
  };
  for (let s = CAMP.first, n = 0; s + CAMP.length < Track.end - 40; s += CAMP.every, n++) {
    const side = n % 2 ? -1 : 1;
    let clear = true;
    for (let e = 0; e <= CAMP.length; e += 16) clear = clear && room(s + e, side, 28, 18) && open(s + e);
    if (clear) camp(n, s, side);
  }
  instances(cube, CANVAS, walls);
  [0xc4452a, 0x2f5f8f, 0xd9a441, 0x8a2f25].forEach((color, i) => instances(ROOF, color, roofs[i]));
  instances(cube, CANVAS, marquees);
  instances(ROOF, 0xc4452a, marqueeRoofs);
  instances(tube, 0xf4f1e6, masts);
  [0xd8262b, 0xf2c030, 0x2f6fc0].forEach((color, i) => instances(cube, color, flags[i]));
  instances(cube, 0xf4f1e6, truckBodies);
  instances(cube, 0xd8262b, truckStripes);
  instances(cube, 0xe86a1c, truckCabs);
  instances(WHEEL, 0x1a1b1e, wheels);
  instances(tube, 0xc8321f, drums[0]);
  instances(tube, 0x2f5f8f, drums[1]);
  instances(cube, 0x59702f, cans[0]);
  instances(cube, 0xe0a82a, cans[1]);
  instances(cube, 0xe6d6a8, netTops);
  instances(cube, 0x4a4f57, gantry);

  // ---- oases: a pool with a patch of green round it, palms with their crowns, a few reeds, beside the road on alternating sides
  const pools = [], greens = [], palmTrunks = [], palmCrowns = [], reeds = [];
  for (let s = OASIS.first, n = 0; s < Track.end - 100; s += OASIS.every, n++) {
    const side = n % 2 ? 1 : -1, d = 24;
    if (!room(s, side, d, 24)) continue;
    const lat = beside(side, s, d), y0 = up(s, lat);
    greens.push([s, lat, y0 + 0.1, 36, 1, 30]);
    pools.push([s, lat, y0 + 0.16, 20, 1, 13]);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + rand() * 0.5, rr = 9 + rand() * 6, q = s + Math.cos(a) * rr * 1.1, l = lat + Math.sin(a) * rr * 0.9, h = 7 + rand() * 4, y = up(q, l);
      palmTrunks.push([q, l, y + h / 2, 0.55, h, 0.55]);
      palmCrowns.push([q, l, y + h, 8.5, 4, 8.5]);
    }
    for (let i = 0; i < 10; i++) { const a = rand() * Math.PI * 2, rr = 11 + rand() * 4; reeds.push([s + Math.cos(a) * rr * 1.1, lat + Math.sin(a) * rr * 0.75, y0 + 0.5, 0.35, 1.1 + rand(), 0.35]); }
  }
  instances(DISC, 0x7f9a3c, greens);
  instances(DISC, 0x2fb4c4, pools);
  instances(tube, 0x8a6a42, palmTrunks);
  instances(palmCrownGeometry(), 0x4f8f3a, palmCrowns);
  instances(TUFT, 0x6a8f3a, reeds);

  // ---- camels: a caravan of four walking along beside the road, 30 to 60 m out, one behind another: each a long body, four
  // legs, a neck, a head, a hump (all the one colour; the humps and the packs' red blankets their own)
  const camel = [], humps = [], blankets = [];
  for (let s = CARAVAN.first, n = 0; s < Track.end - 100; s += CARAVAN.every, n++) {
    const side = n % 2 ? 1 : -1, d = 30 + rand() * 30;
    if (!room(s, side, d, 16)) continue;
    const lat = beside(side, s, d) + 0;
    for (let i = 0; i < 4; i++) {
      const q = s + i * 7.5 + rand() * 1.2, l = lat + (rand() - 0.5) * 3, y0 = up(q, l);
      camel.push([q, l, y0 + 2.0, 0.9, 1.0, 2.5]);                                          // the body
      for (const a of [-1, 1]) for (const b of [-1, 1]) camel.push([q + b * 0.85, l + a * 0.28, y0 + 0.8, 0.22, 1.6, 0.22]); // four legs
      camel.push([q + 1.35, l, y0 + 2.95, 0.3, 1.5, 0.34], [q + 1.62, l, y0 + 3.55, 0.28, 0.32, 0.62]);   // the neck, the head
      camel.push([q - 1.3, l, y0 + 1.95, 0.1, 1.1, 0.1]);                                    // the tail
      humps.push([q - 0.15, l, y0 + 2.7, 0.85, 0.9, 1.1]);
      if (i % 2 === 0) blankets.push([q - 0.15, l, y0 + 2.62, 1.0, 0.8, 1.3]);
    }
  }
  instances(cube, 0xb98a52, camel);
  instances(BALL, 0xa87a46, humps);
  instances(BALL, 0xc4452a, blankets);

  // ---- the sun: a pale core in a wide soft halo, low over the horizon ahead and to the left, fixed in the sky (it travels
  // with the camera, so it never gets nearer). Drawn without fog and over nothing: the dunes and mesas in front of it hide it
  {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'), g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,252,236,1)'); g.addColorStop(0.1, 'rgba(255,246,214,0.95)'); g.addColorStop(0.2, 'rgba(255,232,176,0.5)');
    g.addColorStop(0.55, 'rgba(255,214,150,0.16)'); g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sun.scale.set(270, 270, 1);
    sun.frustumCulled = false;
    sun.renderOrder = -1;
    const h0 = Track.toWorld(Track.start, 0, p), away = new THREE.Vector3(Math.sin(h0 + 0.42) * 560 * 0.94, 560 * 0.34, Math.cos(h0 + 0.42) * 560 * 0.94);
    sun.onBeforeRender = (renderer, scene, camera) => {
      sun.position.copy(camera.position).add(away);
      if (scene.scale.x < 0) sun.position.x = -camera.position.x + away.x; // (in the scene's own terms)
      sun.updateMatrixWorld();
    };
    levelGroup.add(sun);
  }

  // ---- sand blowing across the track: one Points object, the grains in a box round the camera that the wind carries through.
  // It blows the way the level's crosswind does (right, if it has none), and in a crosswind it is thicker, faster and gusts
  const GRAINS = 1500, BOX = 38, TALL = 9, LAYERS = 2;
  const grains = new Float32Array(GRAINS * 3);
  for (let i = 0; i < GRAINS; i++) { grains[i * 3] = (rand() - 0.5) * BOX * 2; grains[i * 3 + 1] = rand() * rand() * TALL; grains[i * 3 + 2] = (rand() - 0.5) * BOX * 2; }
  const sandGeo = new THREE.BufferGeometry();
  sandGeo.setAttribute('position', new THREE.BufferAttribute(grains, 3));
  const sandMat = new THREE.PointsMaterial({ color: 0xf0cc86, size: 0.42, transparent: true, opacity: 0.3, depthWrite: false });
  const sheets = [];
  for (let k = 0; k < LAYERS; k++) { const sheet = new THREE.Points(sandGeo, sandMat); sheet.frustumCulled = false; sheets.push(sheet); levelGroup.add(sheet); }
  const ambient = (LEVEL.crosswinds && LEVEL.crosswinds[0]?.dir === 'left') ? -1 : 1;
  let amount = 0.2, dir = ambient, last = performance.now() / 1000;
  const tip = new THREE.Vector3();
  const blow = (t) => {
    const dt = Math.min(0.1, Math.max(0, t - last)); last = t;
    const w = Gambles.winds && Gambles.winds.length ? Gambles.wind(Player.s) : null;
    const want = w ? 0.45 + 0.55 * Gambles.gust(w) : 0.2;
    amount += (want - amount) * Math.min(1, dt * 2.5);
    if (w) dir = w.dir; else dir += (ambient - dir) * Math.min(1, dt);
    const h = Track.toWorld(Player.s, 0, p), ground = p.y;
    sandMat.opacity = 0.14 + 0.5 * amount;
    sandGeo.setDrawRange(0, Math.floor(450 + 1050 * amount));
    const speed = 5 + 24 * amount, ax = -Math.cos(h) * dir, az = Math.sin(h) * dir; // (the wind's way, across the road, to the right for dir 1)
    tip.set(ax, 0, az);
    return [ground, speed];
  };
  everyFrame(levelGroup, (t, cx, cy, cz) => { // (cx: the camera's, in the level's own terms)
    const [ground, speed] = blow(t);
    sheets.forEach((sheet, k) => {
      const run = BOX - ((t * speed + k * BOX) % (BOX * 2));
      sheet.position.set(cx + tip.x * run, ground - 0.3, cz + tip.z * run);
      sheet.updateMatrixWorld();
    });
  });
};
