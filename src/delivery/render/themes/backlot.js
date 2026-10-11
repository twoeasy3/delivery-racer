// ---- film studio backlot: one street that is several sets in turn. Which set stands where is the level's
// "zones" (each zone's `scenery` one of the sets below; a level with none gets the four outdoor ones end to end):
//   studioLot   the lot itself: soundstages with their big doors and stage numbers, palms at the kerb, trucks
//               and golf carts, the studio's water tower, its gate over the road at the start
//   western     a Western town on sand: false-fronted wooden buildings with porches and painted signs (some only
//               a front, propped up from behind), hitching rails, barrels, cacti, a wooden water tower, and a
//               painted desert on scaffolding beyond
//   soundstage  the lot again, closer in; a tunnel here (or anywhere) is a soundstage the road drives into, and
//               inside it a spaceship's corridor (the theme's tunnel colours, and the lit ribs added here)
//   newyork     a city street of flats: brick fronts a metre thick with windows, awnings, fire escapes and shop
//               signs, held up by braces, the lot showing in the gaps; lamp posts, hydrants, a lighting truss
//   skies       painted skies on scaffolding (a blue one, a sunset, deep space, a skyline), green screens, wind
//               machines, and props waiting their turn: a flying saucer, a rocket
// And along all of it, the crew: camera cranes with their jibs out over the road, lamps on stands, directors'
// chairs, a clapperboard. (The models: backlotModels.js.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { makeBoard, makeCameraCrane, makeLightStand, makeDirectorChair, makeClapper, makeWindMachine, makeGolfCart, makeWaterTower, makeBackdrop, makeSaucer, makeRocket } from './backlotModels.js';

const OUTDOORS = ['studioLot', 'western', 'newyork', 'skies'];
const WOOD = [0x9a6b42, 0x8a5a36, 0xb08a5a, 0x7a4a2e, 0x8f8676, 0xa9774a];
const BRICK = [0x8a4a3a, 0x9a5a44, 0x6e5444, 0xc9b99a, 0x7c7f86, 0xa8624a];
const AWNING = [0xc0392b, 0x2f7f4f, 0x2d5f8a, 0xd9a441];
const SALOONS = ['SALOON', 'SHERIFF', 'BANK', 'GENERAL STORE', 'HOTEL', 'LIVERY', 'UNDERTAKER', 'BARBER', 'ASSAY OFFICE', 'TELEGRAPH', 'DRY GOODS', 'JAIL'];
const SHOPS = ['DELI', 'PIZZA', 'HOTEL', 'BAR', 'DINER', 'NEWS', 'LAUNDRY', 'BAGELS', 'PAWN', 'RECORDS', 'TAILOR', 'CAFE'];

export const backlot = ({ add, flat, instances, sideStrip, buildStrip, offRoads, beside, cube, tube, cone, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 11 + (LEVEL.id || '').length * 97;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {};
  const own = (LEVEL.zones || []).filter(z => OUTDOORS.includes(z.scenery) || z.scenery === 'soundstage');
  const zones = own.length ? own.map((z, i) => ({ set: z.scenery, from: i ? z.from : Track.start, to: i === own.length - 1 ? Track.end : own[i + 1].from }))
    : OUTDOORS.map((set, i) => ({ set, from: i ? Math.round(Track.length * i / 4) : Track.start, to: i === 3 ? Track.end : Math.round(Track.length * (i + 1) / 4) }));
  const tunnels = LEVEL.tunnels || [];
  const inTunnel = (s, pad = 0) => tunnels.some(t => s > t.from - pad && s < t.to + pad);
  const SPHERE = new THREE.SphereGeometry(0.5, 10, 7);

  // a model stood at (s, lat), turned `turn` from the way the road runs; not on another road
  const put = (model, s, lat, turn = 0, margin = 3, y = 0) => {
    const h = Track.toWorld(s, lat, p);
    if (!offRoads(p.x, p.z, margin)) return null;
    model.position.set(p.x, p.y + y, p.z);
    model.rotation.y = h + turn;
    levelGroup.add(model);
    return model;
  };
  const facing = (side) => side * Math.PI / 2;                  // (turned to face the road, from that side of it: a model's +x is to the road's left)
  const toPlayer = (side, by = 0.9) => Math.PI - side * by;     // (turned to the road and back down it, at whoever is coming)
  const sign = (text, s, lat, y, w, h, side, bg, fg, font) => put(makeBoard(text, w, h, bg, fg, font), s, lat, facing(side), 1, y);
  // braces and props' legs: a beam from one point beside the road to another, all of a kind drawn together
  const struts = { wood: [], steel: [] };
  const strut = (kind, s0, lat0, y0, s1, lat1, y1, t = 0.28) => {
    Track.toWorld(s0, lat0, p);
    Track.toWorld(s1, lat1, q);
    if (offRoads(p.x, p.z, 1) && offRoads(q.x, q.z, 1)) struts[kind].push([p.x, p.y + y0, p.z, q.x, q.y + y1, q.z, t]);
  };

  const walls = [[], []], roofs = [], doors = [], trims = [], smallDoors = [], redLamps = [], trunks = [], crowns = [], fronds = [];
  const truckBodies = [], truckCabs = [], tyres = [], cases = [], caseTrims = [];
  let stageNo = 1;
  // a soundstage: a great plain shed, a raised roof, an elephant door, its number painted high on the wall
  const stage = (s, side, near) => {
    const w = 44 + rand() * 20, d = 30 + rand() * 14, h = 15 + rand() * 6, lat = beside(side, s, near + d / 2), face = lat - side * (d / 2 + 0.07);
    Track.toWorld(s, lat, p);
    if (!offRoads(p.x, p.z, 30) || inTunnel(s, w / 2 + 14)) return;
    walls[stageNo % 2].push([s, lat, h / 2, d, h, w]);
    roofs.push([s, lat, h + 0.5, d * 0.7, 1, w + 0.4]);
    trims.push([s, face, h - 0.5, 0.14, 1, w]);
    doors.push([s - w * 0.18, face, 5, 0.14, 10, 9]);
    smallDoors.push([s + w * 0.3, face, 1.1, 0.14, 2.2, 1.2]);
    redLamps.push([s + w * 0.3, face - side * 0.1, 2.8, 0.25, 0.4, 0.4]);
    sign('STAGE ' + stageNo++, s + w * 0.24, face - side * 0.1, h - 4.4, 13, 4.2, side, '#d8cdb4', '#3a342a', 'bold 46px Arial, sans-serif');
    if (rand() < 0.6) { // (a grip truck backed up to it)
      const at = s + w * 0.05 + rand() * 6, out = face - side * 5.5;
      truckBodies.push([at, out, 2.2, 6.6, 2.9, 2.7]);
      truckCabs.push([at, out - side * 4.4, 1.5, 2.2, 2, 2.5]);
      for (const k of [-2.2, 1.8, -4.4]) tyres.push([at, out + side * k, 0.5, 0.9, 1, 2.9]);
    }
  };
  const palm = (s, side) => {
    const lat = beside(side, s, 2.4), h = 9 + rand() * 4;
    trunks.push([s, lat, h / 2, 0.45, h, 0.45]);
    crowns.push([s, lat, h, 3, 1.4, 3]);
    fronds.push([s + 2, lat, h - 0.3, 0.7, 0.14, 3.6], [s - 2, lat, h - 0.3, 0.7, 0.14, 3.6], [s, lat + 2, h - 0.3, 3.6, 0.14, 0.7], [s, lat - 2, h - 0.3, 3.6, 0.14, 0.7]);
  };

  const ground = (a, b, colour, from = 0.2, to = 128, y = 0.02) => { for (const side of [-1, 1]) add(sideStrip(a, b, (s) => beside(side, s, from), (s) => beside(side, s, to), y, 4), flat(colour)); };
  const body = WOOD.map(() => []), fronts = WOOD.map(() => []), caps = [], porches = [], posts = [], darkDoors = [], glass = [], rails = [], barrels = [], cacti = [], cactusArms = [], rocks = [];
  const flats = BRICK.map(() => []), cornices = [], windows = [], litWindows = [], sills = [], shopGlass = [], awnings = AWNING.map(() => []), escapes = [], sandbags = [];
  const lampPosts = [], lampHeads = [], hydrants = [], trussPosts = [], trussLamps = [], trussGlow = [];
  let nameNo = 0;

  for (const z of zones) {
    const a = z.from, b = z.to;
    if (z.set === 'studioLot' || z.set === 'soundstage') {
      const near = z.set === 'soundstage' ? 10 : 15;
      for (let s = a + 50, n = 0; s < b - 30; s += 78, n++) for (const side of [-1, 1]) stage(s + (side > 0 ? 30 : 0) + rand() * 10, side, near + rand() * 5);
      for (let s = a + 14; s < b - 6; s += 26) for (const side of [-1, 1]) if (!inTunnel(s, 12)) palm(s + (side > 0 ? 13 : 0), side);
      for (const side of [-1, 1]) add(sideStrip(a, b, (s) => beside(side, s, 0.2), (s) => beside(side, s, 4.6), 0.03, 4), flat(0xd6d0c2)); // (a pavement)
      if (z.set === 'studioLot') put(makeWaterTower(), a + (b - a) * 0.55, beside(-1, a + (b - a) * 0.55, 62), 0.4, 12);
    } else if (z.set === 'western') {
      ground(a, b, 0xd9b77a);
      for (const side of [-1, 1]) {
        for (let s = a + 6 + rand() * 6; s < b - 16;) {
          const w = 9 + rand() * 5, d = 8 + rand() * 3, h = 5 + rand() * 1.8, fh = h + 2.4 + rand() * 2, mid = s + w / 2, c = Math.floor(rand() * WOOD.length);
          const lat = beside(side, mid, 6.5 + d / 2), front = lat - side * d / 2, propped = rand() < 0.3;
          s += w + 1.5 + rand() * 6;
          Track.toWorld(mid, lat, p);
          if (!offRoads(p.x, p.z, 9) || inTunnel(mid, 16)) continue;
          if (!propped) { body[c].push([mid, lat, h / 2, d, h, w]); caps.push([mid, lat, h + 0.15, d + 0.3, 0.3, w + 0.3]); }
          else for (const k of [-0.3, 0.3]) strut('wood', mid + w * k, front + side * 0.3, fh * 0.8, mid + w * k, front + side * (0.3 + fh * 0.6), 0);
          fronts[c].push([mid, front, fh / 2, 0.5, fh, w + 0.5]);
          caps.push([mid, front, fh + 0.15, 0.9, 0.3, w + 0.9]);
          porches.push([mid, front - side * 1.6, 3.3, 3, 0.2, w + 0.5], [mid, front - side * 1.6, 0.2, 3, 0.4, w + 0.5]);
          for (const k of [-1, 0, 1]) posts.push([mid + k * (w / 2 - 0.2), front - side * 2.9, 1.8, 0.22, 3, 0.22]);
          darkDoors.push([mid, front - side * 0.28, 1.65, 0.1, 2.5, 1.5]);
          for (const k of [-0.3, 0.3]) glass.push([mid + w * k, front - side * 0.28, 2.2, 0.1, 1.5, 1.4]);
          if (fh > 8) for (const k of [-0.25, 0.25]) glass.push([mid + w * k, front - side * 0.28, 5.4, 0.1, 1.2, 1.1]);
          sign(SALOONS[nameNo++ % SALOONS.length], mid, front - side * 0.3, fh - 1.1, Math.min(w - 1, 7.5), 1.4, side, '#ead9b0', '#4a2414');
          if (rand() < 0.5) { rails.push([mid, front - side * 4.2, 1, 0.14, 0.14, 3.4]); for (const k of [-1.6, 1.6]) posts.push([mid + k, front - side * 4.2, 0.55, 0.16, 1.1, 0.16]); }
          if (rand() < 0.6) for (let k = 0; k < 1 + Math.floor(rand() * 3); k++) barrels.push([mid + w * 0.4 - k * 0.95, front - side * 0.9, 0.9, 0.8, 1, 0.8]);
        }
        for (let s = a + 10; s < b - 10; s += 15 + rand() * 20) { // cacti and rocks out on the sand, beyond the town
          const far = 26 + rand() * 80, lat = beside(side, s, far), h = 3.5 + rand() * 3.5;
          if (rand() < 0.3) { rocks.push([s, lat, 0.7, 3 + rand() * 4, 1.8 + rand() * 2, 3 + rand() * 4]); continue; }
          cacti.push([s, lat, h / 2, 0.9, h, 0.9], [s, lat + 1.3, h * 0.55 + 0.9, 0.55, 1.8, 0.55], [s, lat - 1.2, h * 0.4 + 0.7, 0.55, 1.4, 0.55]);
          cactusArms.push([s, lat + 0.75, h * 0.55, 1.1, 0.5, 0.5], [s, lat - 0.7, h * 0.4, 1, 0.5, 0.5]);
        }
      }
      for (let s = a + 130, n = 0; s < b - 60; s += 250, n++) put(makeBackdrop(96, 30, 'mesa'), s, beside(n % 2 ? 1 : -1, s, 84), facing(n % 2 ? 1 : -1), 50);
      put(makeWaterTower(true), a + 90, beside(-1, a + 90, 30), 0.3, 6);
      put(makeWaterTower(true), b - 160, beside(1, b - 160, 34), 0.8, 6);
    } else if (z.set === 'newyork') {
      ground(a, b, 0x5d6066);
      ground(a, b, 0xa9a59c, 0.2, 5.4, 0.04);
      for (const side of [-1, 1]) {
        for (let s = a + 4, n = 0; s < b - 18; n++) {
          const w = 11 + rand() * 7, h = 13 + rand() * 11, mid = s + w / 2, c = Math.floor(rand() * BRICK.length), lat = beside(side, mid, 6.2), front = lat - side * 0.53;
          s += w + (n % 4 === 3 ? 8 : 0.1);
          Track.toWorld(mid, lat, p);
          if (!offRoads(p.x, p.z, 8) || inTunnel(mid, 16)) continue;
          flats[c].push([mid, lat, h / 2, 1, h, w]);
          cornices.push([mid, lat - side * 0.35, h - 0.3, 1.7, 0.6, w + 0.3], [mid, lat - side * 0.3, 4, 1.4, 0.3, w + 0.1]);
          for (let y = 5.9; y < h - 2; y += 3.3) for (let k = -w / 2 + 1.7; k < w / 2 - 1.2; k += 2.5) {
            (rand() < 0.14 ? litWindows : windows).push([mid + k, front, y, 0.06, 1.9, 1.2]);
            sills.push([mid + k, front - side * 0.08, y - 1.05, 0.22, 0.16, 1.5]);
          }
          shopGlass.push([mid, front, 1.9, 0.06, 2.6, w - 2.6]);
          if (rand() < 0.75) {
            awnings[Math.floor(rand() * AWNING.length)].push([mid, front - side * 1.05, 3.3, 2.1, 0.16, w - 2]);
            if (rand() < 0.7) sign(SHOPS[nameNo++ % SHOPS.length], mid, front - side * 2.14, 2.95, Math.min(w - 3, 6), 0.7, side, '#1c1c2c', '#ffe9a8', 'bold 44px Arial, sans-serif');
          }
          if (rand() < 0.45) { // a fire escape down the front: a landing at every floor, a ladder between
            const at = mid + (rand() < 0.5 ? -1 : 1) * w * 0.2;
            let top = 0;
            for (let y = 4.7; y < h - 2.4; y += 3.3) { escapes.push([at, front - side * 0.75, y, 1.4, 0.12, 3.6], [at, front - side * 1.42, y + 0.55, 0.07, 1.1, 3.6]); top = y; }
            escapes.push([at + 1.5, front - side * 0.75, (4.7 + top) / 2, 0.08, top - 4.7, 0.5]);
          }
          for (const k of [-0.32, 0.32]) { // (what holds it up)
            strut('steel', mid + w * k, lat + side * 0.5, h * 0.78, mid + w * k, lat + side * (0.5 + h * 0.5), 0.2);
            sandbags.push([mid + w * k, lat + side * (0.5 + h * 0.5), 0.35, 1.6, 0.7, 1.3]);
          }
        }
      }
      for (let s = a + 12, n = 0; s < b - 6; s += 34, n++) {
        const side = n % 2 ? 1 : -1;
        if (inTunnel(s, 12)) continue;
        lampPosts.push([s, beside(side, s, 1.1), 3.4, 0.2, 6.8, 0.2], [s, beside(side, s, 0.4), 6.7, 1.6, 0.14, 0.14]);
        lampHeads.push([s, beside(side, s, -0.3), 6.5, 0.7, 0.3, 0.5]);
        hydrants.push([s + 9, beside(-side, s + 9, 1), 0.45, 0.42, 0.9, 0.42]);
      }
      for (const f of [0.3, 0.72]) { // a lighting truss over the street, its lamps hung along it
        const s = a + (b - a) * f, lo = Track.lo(s) - 1.4, hi = Track.hi(s) + 1.4;
        if (inTunnel(s, 30)) continue;
        trussPosts.push([s, lo, 5.5, 0.5, 11, 0.5], [s, hi, 5.5, 0.5, 11, 0.5], [s, (lo + hi) / 2, 11, hi - lo + 0.5, 0.5, 0.5], [s, (lo + hi) / 2, 10.1, hi - lo + 0.5, 0.2, 0.2]);
        for (let lat = lo + 2; lat < hi - 1; lat += 2.6) { trussLamps.push([s, lat, 9.6, 0.9, 0.9, 0.9]); trussGlow.push([s, lat, 9.12, 0.7, 0.06, 0.7]); }
      }
    } else if (z.set === 'skies') {
      const KINDS = ['sky', 'sunset', 'stars', 'city'];
      for (let s = a + 70, n = 0; s < b - 40; s += 105, n++) {
        const side = n % 2 ? -1 : 1;
        put(makeBackdrop(66, 30, KINDS[n % KINDS.length]), s, beside(side, s, 40 + rand() * 10), side * (Math.PI / 2 + 0.35), 40);
        put(makeBackdrop(26, 11, 'green'), s + 30, beside(-side, s + 30, 11 + rand() * 4), -side * (Math.PI / 2 + 0.25), 16);
      }
      for (let s = a + 8; s < b - 6; s += 17 + rand() * 12) { // flight cases in stacks, and a generator truck now and then
        const side = rand() < 0.5 ? -1 : 1, lat = beside(side, s, 6.5 + rand() * 9), n = 1 + Math.floor(rand() * 3);
        if (rand() < 0.2) { truckBodies.push([s, lat, 2.2, 2.7, 2.9, 6.6]); truckCabs.push([s + 4.4, lat, 1.5, 2.5, 2, 2.2]); for (const k of [-2.2, 1.8, 4.4]) tyres.push([s + k, lat, 0.5, 2.9, 1, 0.9]); continue; }
        for (let k = 0; k < n; k++) { cases.push([s + k * 0.2, lat, 0.55 + k * 1.1, 1.3, 1.1, 2 - k * 0.3]); caseTrims.push([s + k * 0.2, lat, 0.55 + k * 1.1, 1.36, 0.16, 2.06 - k * 0.3]); }
        if (rand() < 0.5) cases.push([s + 2.6, lat + side * 0.6, 0.45, 1, 0.9, 1]);
      }
      put(makeSaucer(), a + 30, beside(-1, a + 30, 20), 0, 9);
      put(makeRocket(), a + (b - a) * 0.5 + 20, beside(1, a + (b - a) * 0.5 + 20, 24), 0.5, 6);
      put(makeSaucer(), b - 80, beside(1, b - 80, 24), 0, 9);
      for (const side of [-1, 1]) add(sideStrip(a, b, (s) => beside(side, s, 0.2), (s) => beside(side, s, 4.6), 0.03, 4), flat(0xd6d0c2));
    }
  }

  // ---- wind machines along every crosswind, on the side it blows from (or a few among the skies, with none)
  const winds = (LEVEL.crosswinds || []).filter(w => !w.road);
  for (const w of winds) {
    const side = w.dir === 'left' ? 1 : -1;
    for (let s = w.from + 10; s < w.to; s += 48) put(makeWindMachine(), s, beside(side, s, 3.6), facing(side), 3);
  }
  if (!winds.length) for (const z of zones) if (z.set === 'skies') for (let s = z.from + 50; s < z.to; s += 160) put(makeWindMachine(), s, beside(1, s, 3.6), facing(1), 3);

  // ---- the studio's gate over the road, a little way in from the start
  {
    const s = Math.min(60, Track.length / 4), lo = Track.lo(s) - 2.2, hi = Track.hi(s) + 2.2, pillars = [], arch = [];
    pillars.push([s, lo, 5.2, 3, 10.4, 3], [s, hi, 5.2, 3, 10.4, 3]);
    arch.push([s, (lo + hi) / 2, 11.6, hi - lo + 4, 3, 1.8]);
    instances(cube, 0xefe6d0, pillars);
    instances(cube, 0xefe6d0, arch);
    instances(cube, 0xb5352c, [[s, lo, 10.6, 3.4, 0.5, 3.4], [s, hi, 10.6, 3.4, 0.5, 3.4], [s, (lo + hi) / 2, 13.3, hi - lo + 4.6, 0.4, 2.2]]);
    put(makeBoard('DELIVERY PICTURES', Math.min(hi - lo, 22), 2.3, '#efe6d0', '#b5352c'), s - 0.93, (lo + hi) / 2, Math.PI, 0, 11.6);
  }

  // ---- a tunnel is a soundstage the road drives into: its shell outside (the portal is its end wall), and inside,
  // the spaceship's corridor: a lit rib every few metres, panels of light between
  const shell = [], ribs = [], panels = [[], []];
  for (const t of tunnels) {
    const out = 8.3, top = 17.5;
    for (let s = t.from; s < t.to; s += 4) for (const side of [-1, 1]) shell.push([s, beside(side, s, out), top / 2, 0.6, top, 4.02, [Math.min(t.to, s + 4), beside(side, Math.min(t.to, s + 4), out)]]);
    add(buildStrip(t.from, t.to, (s) => Track.lo(s) - out, (s) => Track.hi(s) + out, top, 4), flat(0xbfb59c));
    put(makeBoard('STAGE 9', 14, 4.4, '#d8cdb4', '#3a342a', 'bold 46px Arial, sans-serif'), t.from - 0.7, (Track.lo(t.from) + Track.hi(t.from)) / 2, Math.PI, 0, 13);
    for (let s = t.from + 6, n = 0; s < t.to - 2; s += 12, n++) {
      const lo = Track.lo(s) - 0.22, hi = Track.hi(s) + 0.22;
      ribs.push([s, lo, 4.25, 0.14, 8.5, 0.4], [s, hi, 4.25, 0.14, 8.5, 0.4], [s, (lo + hi) / 2, 8.4, hi - lo, 0.12, 0.4]);
      if (s + 6 < t.to) for (const lat of [lo, hi]) panels[n % 2].push([s + 6, lat, 2.7, 0.12, 0.9, 2.4], [s + 6, lat, 5.6, 0.12, 0.5, 4.4]);
    }
  }

  // ---- the crew, all down the street: a camera crane with its jib out over the road, lamps on stands, chairs
  const CHAIRS = [0xc0392b, 0x1c1c2c, 0x2d5f8a, 0xf2c21c];
  const chair = (s, side, d, n) => { const m = put(makeDirectorChair(CHAIRS[n % CHAIRS.length]), s, beside(side, s, d), facing(side) + (rand() - 0.5) * 0.7, 1); if (m) m.scale.setScalar(1.5); };
  for (let s = Track.start + 130, n = 0; s < Track.end - 20; s += 105 + rand() * 30, n++) {
    const side = n % 2 ? -1 : 1;
    if (inTunnel(s, 30)) continue;
    if (n % 3 === 0) {
      put(makeCameraCrane(), s, beside(side, s, 5.4), toPlayer(side), 4);
      chair(s - 6, side, 2.6, n); chair(s - 8, side, 2.9, n + 1);
      put(makeLightStand(), s + 7, beside(side, s + 7, 2.4), toPlayer(side, 1.1), 2);
    } else if (n % 3 === 1) {
      put(makeLightStand(5.2), s, beside(side, s, 2.6), toPlayer(side, 1.1), 2);
      put(makeLightStand(), s + 5, beside(side, s + 5, 3.4), toPlayer(side, 0.8), 2);
      put(makeClapper(), s + 12, beside(side, s + 12, 3.2), toPlayer(side, 0.5), 3);
      chair(s + 16, side, 2.6, n);
    } else {
      put(makeGolfCart(n % 2 ? 0xf4f1e8 : 0x9fd4e8), s, beside(side, s, 2.6), 0, 2);
      for (let k = 0; k < 3; k++) chair(s + 5 + k * 1.9, side, 2.5 + (k % 2) * 0.5, n + k);
      put(makeLightStand(), s + 12, beside(side, s + 12, 2.8), toPlayer(side, 1), 2);
    }
  }

  // ---- drawn
  instances(cube, 0xd8cdb4, walls[0], false, 4);
  instances(cube, 0xcabfa2, walls[1], false, 4);
  instances(cube, 0xa39a84, roofs, false, 4);
  instances(cube, 0x9a8f78, trims);
  instances(cube, 0x6f6756, doors);
  instances(cube, 0x4a443a, smallDoors);
  instances(cube, 0xff3a2a, redLamps, true);
  instances(cube, 0xf4f4f0, truckBodies);
  instances(cube, 0x3d5a80, truckCabs);
  instances(cube, 0x1c1d21, tyres);
  instances(cube, 0x23252b, cases);
  instances(cube, 0xb9c2cc, caseTrims);
  instances(tube, 0x8a735a, trunks);
  instances(SPHERE, 0x3f7a2e, crowns);
  instances(cube, 0x4a8a34, fronds);
  WOOD.forEach((color, i) => { instances(cube, color, body[i], false, 2); instances(cube, color, fronts[i], false, 2); });
  instances(cube, 0x5a3a22, caps);
  instances(cube, 0x7a5a3a, porches);
  instances(cube, 0x6b4a2c, posts);
  instances(cube, 0x2a1c12, darkDoors);
  instances(cube, 0x3a4652, glass);
  instances(cube, 0x6b4a2c, rails);
  instances(tube, 0x6b4a2c, barrels);
  instances(tube, 0x4f8a4a, cacti);
  instances(cube, 0x4f8a4a, cactusArms);
  instances(SPHERE, 0xb8885c, rocks);
  BRICK.forEach((color, i) => instances(cube, color, flats[i], false, 2));
  instances(cube, 0xe6dcc6, cornices);
  instances(cube, 0x2f3a46, windows);
  instances(cube, 0xffe9a8, litWindows, true);
  instances(cube, 0xe6dcc6, sills);
  instances(cube, 0x26303a, shopGlass);
  AWNING.forEach((color, i) => instances(cube, color, awnings[i]));
  instances(cube, 0x1c1d21, escapes);
  instances(cube, 0xb9a57a, sandbags);
  instances(cube, 0x2c2f36, lampPosts);
  instances(cube, 0xfff1c8, lampHeads, true);
  instances(tube, 0xd22a2a, hydrants);
  instances(cube, 0x3a3f47, trussPosts);
  instances(cube, 0x141518, trussLamps);
  instances(cube, 0xfff6d8, trussGlow, true);
  instances(cube, 0xd8cdb4, shell);
  instances(cube, 0x39d8ff, ribs, true);
  instances(cube, 0xff7ad9, panels[0], true);
  instances(cube, 0xffe12b, panels[1], true);
  const dummy = new THREE.Object3D();
  for (const [kind, colour] of [['wood', 0x6b4a2c], ['steel', 0x8f959c]]) {
    if (!struts[kind].length) continue;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: colour }), struts[kind].length);
    struts[kind].forEach(([x0, y0, z0, x1, y1, z1, t], i) => {
      dummy.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      dummy.lookAt(x1, y1, z1);
      dummy.scale.set(t, t, Math.hypot(x1 - x0, y1 - y0, z1 - z0));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.frustumCulled = false;
    levelGroup.add(mesh);
  }
};
