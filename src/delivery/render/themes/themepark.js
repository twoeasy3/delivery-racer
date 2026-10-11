// ---- theme park: the road runs through the park. A promenade of pale paving each side behind a candy-striped
// kerb; bunting strung across the road and rainbow arches over it; stalls under striped awnings, striped tents
// and big tops, lollipop trees, flower beds, bunches of balloons; carousels turning close by, Ferris wheels
// turning over the rooftops, a rollercoaster that runs along one side, crosses over the road, loops on the far
// side and comes back over, its train going round; and a fairy-tale castle on the skyline.
// (Its models: parkModels.js. What moves keeps its own time: sceneryClock.js. Only a sight, all of it.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { everyFrame, striped } from './sceneryClock.js';
import { makeFerrisWheel, makeCarousel, makeCastle, makeCoaster, PARK_COLOURS } from './parkModels.js';

const BALL = new THREE.SphereGeometry(0.5, 12, 8);
const [WALL_A, WALL_B] = striped(new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, true), 16);
const [ROOF_A, ROOF_B] = striped(new THREE.ConeGeometry(0.5, 1, 16), 16);
const [AWNING_A, AWNING_B] = striped(new THREE.ConeGeometry(0.6, 1, 8).rotateY(Math.PI / 8), 8);
// a pennant: a triangle hanging point down across the road (both its faces)
const PENNANT = new THREE.BufferGeometry();
PENNANT.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, -1.2, 0, 0.5, 0, 0, -0.5, 0, 0, 0, -1.2, 0], 3));
PENNANT.computeVertexNormals();
const RAINBOW = [0xe23b3b, 0xf27d1a, 0xf2c21c, 0x35a852, 0x2f7fe0, 0x9a4fd0];

export const themepark = ({ theme, add, flat, instances, sideStrip, offRoads, beside, inJunction, exits, cube, tube, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 11 + (LEVEL.id || '').length * 977;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {};
  const night = !!theme.night; // (the park after closing: the rides' bulbs lit, the arches neon, bulbs along the bunting)
  const within = (list, s, pad, a = 'from', b = 'to') => (list || []).some(x => !x.road && s >= x[a] - pad && s <= x[b] + pad);
  // under cover or on a bridge there (nothing stands there, nothing hangs over it); and, as well, where the
  // level has something of its own across the road (a level crossing's train, a drawbridge's leaves, a junction)
  const covered = (s, pad = 0) => within(LEVEL.tunnels, s, pad) || within(LEVEL.bridges, s, pad);
  const busy = (s, pad = 0) => covered(s, pad) || inJunction(s) || within(LEVEL.crossings, s, pad + 20, 's', 's') || within(LEVEL.drawbridges, s, pad + 60, 's', 's');
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));
  const moving = [];
  const stand = (model, s, lat, turn = 0, y = 0) => {
    const h = Track.toWorld(s, lat, p);
    model.position.set(p.x, p.y + y, p.z);
    model.rotation.y = h + turn;
    levelGroup.add(model);
    if (model.userData.animate) moving.push(model);
    return model;
  };
  // what has been given to the big things: [from, to, side, nearest, furthest] (m along, and m off the pavement)
  const taken = [];
  const free = (s, side, d, pad = 0) => !taken.some(([a, b, at, d0, d1]) => (at === 0 || at === side) && s > a - pad && s < b + pad && d > d0 - pad && d < d1 + pad);

  // ---- the ground: a promenade each side of every road behind a striped kerb
  const paving = flat(0xf3dcc0), edging = flat(0xf2a7c6), kerbWhite = flat(0xffffff);
  const kerbs = [];
  for (const [from, to, wide] of [[Track.start, Track.end, 10], ...exits.map(x => [x.side0, x.sideEnd, 4])]) {
    for (let a = from; a < to; a += 40) {
      const b = Math.min(to, a + 40);
      if (Track.onBridge(a) || Track.onBridge(b)) continue;
      for (const side of [-1, 1]) {
        add(sideStrip(a, b, (q) => beside(side, q, 0.45), (q) => beside(side, q, wide), 0.02), paving);
        add(sideStrip(a, b, (q) => beside(side, q, wide), (q) => beside(side, q, wide + 0.7), 0.03), edging);
        add(sideStrip(a, b, (q) => beside(side, q, 0.02), (q) => beside(side, q, 0.45), 0.05), kerbWhite);
      }
    }
    for (let s = from; s < to; s += 6) {
      if (Track.onBridge(s) || inJunction(s)) continue;
      for (const side of [-1, 1]) kerbs.push([s, beside(side, s, 0.235), 0.045, 0.44, 0.09, 3, [s + 3, beside(side, s + 3, 0.235)]]);
    }
  }
  instances(cube, 0xe23b3b, kerbs);

  // ---- rollercoasters: one every kilometre or so, wherever 400 m of road is open on both sides
  const overs = []; // (where one goes over the road: nothing else is hung there)
  const under = (s, pad) => overs.some(([a, b]) => s > a - pad && s < b + pad);
  const coaster = (s0, flip, colour) => {
    const D = 22, pts = [], A = (s, d) => beside(-flip, s, d), B = (s, d) => beside(flip, s, d);
    const at = (ds, lat, y) => { Track.toWorld(s0 + ds, lat, p); pts.push(new THREE.Vector3(p.x, p.y + y, p.z)); };
    // out along one side: the station, the lift, the first drop, a camelback
    for (const [ds, y] of [[15, 4], [40, 4], [65, 5.5], [100, 17], [135, 29], [160, 31], [190, 15], [215, 7], [245, 17], [275, 9], [302, 10]]) at(ds, A(s0 + ds, D), y);
    // over the road in a half circle,
    const round = (ds0, out, from, to, y0, y1) => {
      for (let k = 1; k <= 5; k++) {
        const th = k / 6 * Math.PI, w = (1 - Math.cos(th)) / 2, s = s0 + ds0, rho = (Track.hi(s) - Track.lo(s)) / 2 + D;
        const ds = ds0 + out * rho * 0.9 * Math.sin(th);
        at(ds, from(s0 + ds, D) * (1 - w) + to(s0 + ds, D) * w, y0 + y1 * Math.sin(th));
      }
    };
    round(330, 1, A, B, 10, 3.5);
    // back down the other side: a loop, and three hills
    at(305, B(s0 + 305, D), 9);
    at(277, B(s0 + 277, D), 4.5);
    const first = pts.length;
    for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI * 2, ds = 250 - 11 * Math.sin(a); at(ds, B(s0 + ds, D + 3.6 * k / 8), 3.5 + 11 * (1 - Math.cos(a))); }
    const last = pts.length - 1;
    for (const [ds, d, y] of [[222, 3.6, 5], [195, 2, 13], [165, 0, 5], [130, 0, 14], [95, 0, 6], [62, 0, 11], [32, 0, 8.5]]) at(ds, B(s0 + ds, D + d), y);
    // and over the road again to the station
    round(0, -1, B, A, 5.5, 7);
    const mid = s0 + 165, wide = half(mid) + 2.5;
    const model = makeCoaster(pts, {
      loop: [first, last], colour, trains: 2,
      ground: (x, z) => { if (!Track.hilly) return 0; Track.toWorld(Track.fromWorld(x, z, mid, 260).s, 0, p); return p.y; },
      stands: (x, z) => Track.mainDistance(x, z) > wide && offRoads(x, z, 1),
    });
    levelGroup.add(model);
    moving.push(model);
    model.userData.at = pts[20];
    taken.push([s0 - 45, s0 + 375, 0, 19, 30]);
    overs.push([s0 - 45, s0 + 30], [s0 + 315, s0 + 375]);
  };
  for (let s0 = Track.start + 260, n = 0; s0 < Track.end - 420; s0 += 40) {
    let clear = true;
    for (let s = s0 - 40; s <= s0 + 370 && clear; s += 10) {
      clear = !busy(s, 25) && Track.isMain(s);
      for (const side of [-1, 1]) for (const d of [16, 30]) { Track.toWorld(s, beside(side, s, d), p); clear = clear && offRoads(p.x, p.z, 5); }
    }
    if (!clear) continue;
    coaster(s0, n % 2 ? -1 : 1, [0xe23b3b, 0x2f7fe0, 0x9a4fd0][n % 3]);
    s0 += 980;
    n++;
  }

  // ---- the big things: Ferris wheels, big tops, carousels, each in turn down the road, and a castle beyond them
  const tentsA = [], tentsB = [], roofsA = [], roofsB = [], masts = [], flags = PARK_COLOURS.map(() => []);
  const big = (s, side, d, r) => { // room for something r m round, d m off: its spot, or null
    if (busy(s, r) || !free(s, side, d, r)) return null;
    Track.toWorld(s, beside(side, s, d), p);
    if (!offRoads(p.x, p.z, r + 2) || Track.mainDistance(p.x, p.z) < half(s) + d - r - 4) return null;
    taken.push([s - r, s + r, side, d - r, d + r]);
    return true;
  };
  for (let s = Track.start + 130, n = 0; s < Track.end - 40; s += 150, n++) {
    const side = n % 2 ? 1 : -1, at = s + rand() * 50;
    if (n % 3 === 0) { // a Ferris wheel, across the road's way so that it is seen whole from the road
      const r = 24 + rand() * 6;
      if (big(at, side, r + 9, r + 2)) stand(makeFerrisWheel(r, night), at, beside(side, at, r + 9));
    } else if (n % 3 === 1) { // a big top: a striped drum under a striped cone, a pennant on its mast
      const r = 11 + rand() * 4, d = r + 14 + rand() * 12;
      if (!big(at, side, d, r + 1)) continue;
      const lat = beside(side, at, d);
      tentsA.push([at, lat, 2.6, r * 2, 5.2, r * 2]); tentsB.push([at, lat, 2.6, r * 2, 5.2, r * 2]);
      roofsA.push([at, lat, 5.2 + r * 0.45, r * 2.2, r * 0.9, r * 2.2]); roofsB.push([at, lat, 5.2 + r * 0.45, r * 2.2, r * 0.9, r * 2.2]);
      masts.push([at, lat, 5.2 + r * 0.9 + 2, 0.25, 4, 0.25]);
      flags[n % flags.length].push([at + 1.3, lat, 5.2 + r * 0.9 + 3.3, 0.12, 1.3, 2.6]);
    } else if (big(at, side, 17, 9)) stand(makeCarousel(night), at, beside(side, at, 17)); // a carousel
  }
  for (let s = Track.start + 420, n = 0; s < Track.end + 300; s += 1150, n++) {
    const side = n % 2 ? -1 : 1, q = Math.min(Track.end, s);
    for (let d = 150; d < 330; d += 30) {
      Track.toWorld(q, beside(side, q, d), p);
      if (!offRoads(p.x, p.z, 70) || Track.mainDistance(p.x, p.z) < d - 30) continue;
      stand(makeCastle(1.25, night), q, beside(side, q, d), side * (Math.PI / 2 + 0.55));
      break;
    }
  }
  instances(WALL_A, 0xe23b3b, tentsA, false, 2); instances(WALL_B, 0xfff6e4, tentsB, false, 2);
  instances(ROOF_A, 0xe23b3b, roofsA, false, 2); instances(ROOF_B, 0xfff6e4, roofsB, false, 2);
  instances(cube, 0x6b5a4a, masts);
  PARK_COLOURS.forEach((color, i) => instances(cube, color, flags[i]));

  // ---- rainbow arches over the road, and bunting strung across it between striped poles
  const archMats = RAINBOW.map(color => new (night ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial)({ color }));
  for (let s = Track.start + 60; s < Track.end; s += 640) {
    if (busy(s, 30) || under(s, 25) || within(LEVEL.reversible, s, 20) || exits.some(x => s > x.exitAt - 200 && s < x.mergeAt + 200)) continue;
    const arch = new THREE.Group(), r = (Track.hi(s) - Track.lo(s)) / 2 + 2.5;
    RAINBOW.forEach((color, k) => arch.add(new THREE.Mesh(new THREE.TorusGeometry(r + (RAINBOW.length - k) * 0.9, 0.5, 6, 40, Math.PI), archMats[k])));
    stand(arch, s, (Track.lo(s) + Track.hi(s)) / 2);
  }
  const poles = [], bands = [], lines = [], pennants = PARK_COLOURS.map(() => []), knobs = [], bulbs = [];
  for (let s = Track.start + 25, n = 0; s < Track.end - 5; s += 52, n++) {
    if (busy(s, 12) || !Track.isMain(s) || within(LEVEL.reversible, s, 10) || under(s, 6) || exits.some(x => s > x.exitAt - 190 && s < x.mergeAt + 190)) continue;
    const lo = beside(-1, s, 1.1), hi = beside(1, s, 1.1), y = 8.2;
    for (const lat of [lo, hi]) {
      poles.push([s, lat, y / 2, 0.3, y, 0.3]);
      for (let b = 1; b < y - 0.5; b += 2) bands.push([s, lat, b, 0.34, 0.9, 0.34]);
      knobs.push([s, lat, y + 0.3, 0.7, 0.7, 0.7]);
    }
    lines.push([s, lo, y - 0.2, 0.06, 0.06, 1, [s, hi]]);
    for (let lat = lo + 1, k = 0; lat < hi - 0.6; lat += 1.25, k++) pennants[(k + n) % PARK_COLOURS.length].push([s, lat, y - 0.25, 1, 1, 1]);
    if (night) for (let lat = lo + 0.4; lat < hi; lat += 1.25) bulbs.push([s, lat, y - 0.1, 0.34, 0.34, 0.34]);
  }
  instances(tube, 0xffffff, poles);
  instances(tube, 0xe23b3b, bands);
  instances(BALL, 0xf2c21c, knobs);
  instances(cube, 0x4a4a4a, lines);
  instances(BALL, 0xfff2b0, bulbs, true);
  PARK_COLOURS.forEach((color, i) => instances(PENNANT, color, pennants[i]));

  // ---- lamps along the promenade, a white globe on a green post, each side in turn
  const lampPosts = [], globes = [];
  for (const [from, to] of [[Track.start, Track.end], ...exits.map(x => [x.side0, x.sideEnd])]) {
    for (let s = from + 12, k = 0; s < to; s += 26, k++) {
      if (covered(s, 6) || Track.onBridge(s) || inJunction(s)) continue;
      const side = k % 2 ? 1 : -1;
      lampPosts.push([s, beside(side, s, 1.9), 2.3, 0.2, 4.6, 0.2]);
      globes.push([s, beside(side, s, 1.9), 4.9, 0.95, 0.95, 0.95]);
    }
  }
  instances(tube, 0x2d6a55, lampPosts);
  instances(BALL, 0xfffbe6, globes, true);

  // ---- and the small things, one lot every 17 m each side: stalls, small tents, lollipop trees, flower beds,
  // balloon sellers; with a second row of trees and tents further back, to fill the park out to the haze
  const stallsBy = PARK_COLOURS.map(() => []), counters = [], awnA = [], awnB = [], smallA = [], smallB = [], capA = [], capB = [];
  const trunks = [], crowns = [[], [], [], []], beds = [[], [], []], bedRims = [], carts = [], strings = [], balloons = PARK_COLOURS.map(() => []);
  const tree = (s, lat) => {
    const h = 3.5 + rand() * 3, r = 2.6 + rand() * 2;
    trunks.push([s, lat, h / 2, 0.45, h, 0.45]);
    crowns[Math.floor(rand() * crowns.length)].push([s, lat, h + r * 0.75, r * 2, r * 2, r * 2]);
  };
  const bunch = (s, lat, y0) => { // balloons on their strings
    for (let k = 0; k < 6; k++) {
      const dx = (rand() - 0.5) * 1.8, dz = (rand() - 0.5) * 1.8, y = y0 + 2.6 + rand() * 1.6;
      balloons[Math.floor(rand() * PARK_COLOURS.length)].push([s + dz, lat + dx, y, 1.15, 1.4, 1.15]);
      strings.push([s + dz / 2, lat + dx / 2, y0 + (y - y0) / 2, 0.03, y - y0 - 0.6, 0.03]);
    }
  };
  for (const [from, to, main] of [[Track.start, Track.end, true], ...exits.map(x => [x.side0, x.sideEnd, false])]) {
    for (let s0 = from + 6; s0 < to - 4; s0 += 17) {
      for (const side of [-1, 1]) {
        const s = s0 + rand() * 9, roll = rand(), near = main ? 12 : 6;
        if (covered(s, 14)) continue;
        if (main) for (let k = 0; k < 2; k++) { // the park beyond: trees, and the odd tent
          const d = 44 + rand() * 120, q = s + rand() * 14;
          if (!free(q, side, d, 6) || within(LEVEL.crossings, q, 9, 's', 's')) continue;
          if (rand() < 0.82) tree(q, beside(side, q, d));
          else { const r = 4 + rand() * 4, lat = beside(side, q, d); smallA.push([q, lat, 2, r * 2, 4, r * 2]); smallB.push([q, lat, 2, r * 2, 4, r * 2]); capA.push([q, lat, 4 + r * 0.5, r * 2.3, r, r * 2.3]); capB.push([q, lat, 4 + r * 0.5, r * 2.3, r, r * 2.3]); }
        }
        if (busy(s, 6)) continue;
        if (roll < 0.24) { // a stall: a counter in its colour under a striped awning, balloons tied to one corner
          const d = near + 2 + rand() * 5;
          if (!free(s, side, d, 4)) continue;
          const lat = beside(side, s, d), c = Math.floor(rand() * PARK_COLOURS.length);
          stallsBy[c].push([s, lat, 1.5, 4.6, 3, 4.6]);
          counters.push([s, lat - side * 2.5, 1.1, 0.5, 0.25, 4.8]);
          awnA.push([s, lat, 3.9, 6.6, 1.8, 6.6]); awnB.push([s, lat, 3.9, 6.6, 1.8, 6.6]);
          if (rand() < 0.6) bunch(s + 2.6, lat - side * 2.6, 0.4);
        } else if (roll < 0.42) { // a small striped tent
          const r = 2.6 + rand() * 1.6, d = near + r + rand() * 9;
          if (!free(s, side, d, r + 1)) continue;
          const lat = beside(side, s, d);
          smallA.push([s, lat, 1.6, r * 2, 3.2, r * 2]); smallB.push([s, lat, 1.6, r * 2, 3.2, r * 2]);
          capA.push([s, lat, 3.2 + r * 0.55, r * 2.3, r * 1.1, r * 2.3]); capB.push([s, lat, 3.2 + r * 0.55, r * 2.3, r * 1.1, r * 2.3]);
        } else if (roll < 0.7) { // lollipop trees, a pair
          for (let k = 0; k < 2; k++) { const d = near + 1 + rand() * 14, q = s + k * 6; if (free(q, side, d, 3)) tree(q, beside(side, q, d)); }
        } else if (roll < 0.86) { // a flower bed
          const d = near + 3 + rand() * 12, r = 2.5 + rand() * 2.5;
          if (!free(s, side, d, r)) continue;
          const lat = beside(side, s, d);
          bedRims.push([s, lat, 0.12, r * 2 + 0.8, 0.24, r * 2 + 0.8]);
          beds[Math.floor(rand() * beds.length)].push([s, lat, 0.2, r * 2, 0.3, r * 2]);
        } else { // a balloon seller's cart
          const d = main ? 5.5 + rand() * 3 : 3;
          if (!free(s, side, d, 2)) continue;
          const lat = beside(side, s, d);
          carts.push([s, lat, 0.9, 1.4, 1, 2.2]);
          bunch(s, lat, 1.4);
        }
      }
    }
  }
  PARK_COLOURS.forEach((color, i) => { instances(cube, color, stallsBy[i], false, 1); instances(BALL, color, balloons[i]); });
  instances(cube, 0xfff6e4, counters);
  instances(AWNING_A, 0xe23b3b, awnA, false, 1); instances(AWNING_B, 0xfff6e4, awnB, false, 1);
  instances(WALL_A, 0x2f7fe0, smallA, false, 1); instances(WALL_B, 0xfff6e4, smallB, false, 1);
  instances(ROOF_A, 0x2f7fe0, capA, false, 1); instances(ROOF_B, 0xfff6e4, capB, false, 1);
  instances(tube, 0x8a5a2b, trunks);
  [0x4fb65a, 0x2f9a4f, 0xff8fc0, 0x8ed24a].forEach((color, i) => instances(BALL, color, crowns[i]));
  [0xff6fb1, 0xf2c21c, 0x9a4fd0].forEach((color, i) => instances(tube, color, beds[i]));
  instances(tube, 0x3f9a4a, bedRims);
  instances(cube, 0xe23b3b, carts);
  instances(cube, 0xf4f4f0, strings);

  // ---- what moves, moved: only what is near enough to be seen
  everyFrame(levelGroup, (t, x, y, z) => {
    for (const model of moving) {
      const at = model.userData.at || model.position;
      if ((at.x - x) ** 2 + (at.z - z) ** 2 < 640 * 640) model.userData.animate(t);
    }
  });
};
