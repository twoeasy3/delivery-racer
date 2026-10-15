// ---- THE LAS VEGAS STRIP (themes 'vegas' and 'vegasNight': themes.js) -----------------------------------------------------
// A casino boulevard across the desert. Behind a wide pavement of palms and tall lamps, one resort after another, each a
// landmark of its own, an homage and never a copy (no names, no trademarks, nothing readable): a dark glass pyramid with an
// obelisk before it (and at night a beam of light straight up from its tip), an iron lattice tower after the Paris one, a
// huge sphere whose skin is a screen, a white castle with towers under red, blue and gold cones, an observation tower with
// its pod 200 m up, Y-shaped towers of bronze glass, slab towers with neon crowns; in front of each its pylon sign: a
// marquee of chasing bulbs and scrolling light bars, an arrow, a diamond on top. Between them wedding chapels with a pink
// sign, LED billboards, a forecourt of palms. On the right a dancing fountain in its long basin (beside the level's burst
// water mains, if it has any: the fountains' mains); on the left the monorail on its concrete beam, a train passing, coming
// the other way. Far off an observation wheel turning, and the desert's mountains all round the horizon.
// By day the desert's light; at night (vegasNight, its hero look) the facades' windows, the signs, the bulbs and screens,
// the lamps' pools of light and the sky beam.
// All of it behind the kerb (the owner's rule): nothing that is not an obstacle stands in the road or on its shoulder.
// COST: as the city's (cityModels.js): every solid box in one instanced mesh a 600 m of road in the city's facade material,
// every lit sign box in one instanced mesh a 600 m in ONE neon material (vegasModels.js); palms' crowns, cylinders, cones
// and the pyramids one instanced mesh each in the facade material; the pavements, kerbs and the fountain's water one merged
// mesh, the monorail's beam and the basin's rim another; one mesh each for the jets, the train's cars (instanced), its
// windows, the sphere, the lattice tower, the wheel and its cabins, the mountains, the beam of light. No canvas texture of
// its own. Laid out the same every time (seeded from the level's id); drawn only: nothing here is read by the rules.
// Long things (the beam, the rim, the pavements) are built as continuous strips that follow the road, never as boxes in a row.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../../config.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { Player } from '../../player.js';
import { everyFrame } from './sceneryClock.js';
import { STYLE, SHAPES, cityMaterial, lampLightMaterial } from './cityModels.js';
import { NEON, neonMaterial, jetMaterial, orbMaterial, latticeMaterial, palmCrown, latticeTower, monorailCar, monorailWindows, MONORAIL, wheelFrame, wheelCabins, mountainRing } from './vegasModels.js';

// where the long things stand, m off the road's edge (scripts/.vegas-check.mjs reads these)
export const VEGAS = {
  pave: 6.4,                                     // the pavement, from the kerb
  mono: { side: -1, d: 9.6, top: 7.8, wide: 1.0, deep: 1.5, every: 30 }, // the monorail's beam: its middle, its top, its section; a column every 30 m
  front: { left: 14.5, right: 8 },               // where a resort's lot begins (signs, a canopy, the fountain's basin)
  basin: { from: 8, to: 25, wall: 0.7, water: 0.42 }, // the fountain's basin, m off the edge (right)
};
const SINK = 3;
export const PLACED = []; // (the lots of the level built last: [kind, s, side], for a check or a picture's place)
const PODIUMS = [0xe8dcc8, 0xd9c6a8, 0xf2ece0, 0xc9b8a0, 0xe6d2c0, 0xbfae9a];
const GLASSES = [0x8a6a44, 0x6b7f95, 0xb08a52, 0x4f6a82, 0x9a7a5a, 0x7a8fa0, 0xc0a070];
const RENDERS = [0xf2ece0, 0xe8dcc8, 0xf6f0e6, 0xe0c8b0, 0xd8e0e4];
const NEONS = [0xff2a8a, 0x2ad8ff, 0xffc81e, 0x8a3aff, 0x3aff7a, 0xff5a1e, 0xffffff];
const PAVEMENT = 0xd2c0ae, KERB = 0xb1aaa2, POST = 0x3b3f46, LAMP = 0xfff0c8, PALM = 0x8a6a4a;
const GREENS = [0x4f8a3a, 0x5a9440, 0x3f7a35, 0x6a9a45];
const RULES = { building: ['all'], pavement: ['all', 'street'], lamp: ['all', 'props'], props: ['all', 'props', 'street'] };

export const vegas = ({ theme, add, flat, instances, sideStrip, offRoads, standsClear, beside, exits, cube, levelGroup }) => {
  let seed = 11;
  for (const ch of (LEVEL.id || 'vegas') + ':' + (LEVEL.theme || '')) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const between = (a, b) => a + rand() * (b - a);
  const jitter = () => between(0.05, 0.45);
  const night = !!theme.night;
  const solid = cityMaterial({ night, sky: theme.sky ?? 0xa9cfe8 });
  const neon = neonMaterial({ night });
  const leaves = cityMaterial({ night, sky: theme.sky ?? 0xa9cfe8 });
  leaves.side = THREE.DoubleSide; // (the palms' fronds: one-sided strips, seen from both sides)
  const L = Track.length, p = {};
  PLACED.length = 0;

  // ---- the lists: one instanced mesh each (the boxes and the neon by 600 m of road) ----
  const boxes = [], neons = [], crowns = [], cyls = [], cones = [], pyramids = [], lampCones = [], jets = [];
  const put = (list, s, lat, y, sx, sy, sz, c, a = [STYLE.PLAIN, 0, 0, 0]) => { const e = [s, lat, y, sx, sy, sz]; e.c = c; e.a = a; list.push(e); return e; };
  const solidBox = (s, lat, y, sx, sy, sz, c, style = STYLE.PLAIN, sd = 0, sink = 0, ground = 0) => put(boxes, s, lat, y, sx, sy, sz, c, [style, Math.floor(sd * 1000), sink, ground]);
  const lit = (s, lat, y, sx, sy, sz, c, kind = NEON.SOLID, speed = 0) => put(neons, s, lat, y, sx, sy, sz, c, [kind, Math.floor(rand() * 1000), speed, 0]);

  // ---- where nothing, or no street furniture, is to go (as the city's: render/themes/city.js) ----
  const clearings = [];
  const keep = (from, to, side, what) => clearings.push([from, to, side, what]);
  const sideOf = (x) => x === 'left' ? -1 : x === 'right' ? 1 : 0;
  for (const b of LEVEL.bridges || []) keep(b.from - 30, b.to + 30, 0, 'all');
  for (const t of LEVEL.tunnels || []) keep(t.from - 25, t.to + 25, 0, 'all');
  for (const c of LEVEL.crossings || []) { const s = Track.place(c); keep(s - 18, s + 18, 0, 'all'); }
  for (const d of LEVEL.drawbridges || []) { const s = Track.place(d); keep(s - 50, s + 50, 0, 'all'); }
  for (const f of LEVEL.fords || []) keep(f.from - 20, f.to + 20, 0, 'all');
  for (const b of LEVEL.lowBridges || []) keep(b.s - 10, b.s + (CONFIG.lowBridge?.stagger ?? 60) + 10, 0, 'props');
  for (const z of LEVEL.shade || []) keep(z.from - 6, z.to + 6, sideOf(z.side), 'props');
  for (const t of LEVEL.targets || []) { const s = Track.place(t); keep(s - 6, s + 6, sideOf(t.side) || 1, 'props'); }
  for (const c of LEVEL.cameras || []) { const s = Track.place(c); keep(s - 7, s + 7, sideOf(c.side), 'props'); }
  for (const c of LEVEL.schoolCrossings || []) { const s = Track.place(c); keep(s - 12, s + 12, 0, 'props'); }
  for (const w of LEVEL.siteWorks || []) keep(w.from - 10, w.to + 10, sideOf(w.side), 'props');
  for (const z of LEVEL.stopGo || []) keep(z.from - 40, z.to + 40, 0, 'props');
  for (const w of LEVEL.water || []) keep(w.from, w.to, 0, 'street');
  for (const d of LEVEL.diversions || []) keep(d.from - 220, d.to + 60, 0, 'props');
  for (const x of exits) {
    keep(x.exitAt - 30, x.exitAt + 140, 1, 'props'); keep(x.mergeAt - 140, x.mergeAt + 30, 1, 'props');
    keep(x.side0 - 5, x.side0 + 140, 0, 'props'); keep(x.sideEnd - 140, x.sideEnd + 5, 0, 'props');
  }
  const blocked = (s, side, kind) => clearings.some(([a, b, sd, w]) => s > a && s < b && (!sd || sd === side) && RULES[kind].includes(w));
  const allClear = (a, b, side, kind = 'building') => { for (let s = a; s <= b; s += 5) if (blocked(s, side, kind)) return false; return !blocked(b, side, kind); };

  // ---- room for a lot: none on top of another's, nor across the road where it bends back (as the city's) ----
  const CELL = 4, taken = new Map(), spot = {};
  const claim = (s, lat, across, along, owner) => {
    const keys = [], half = Math.max(Track.hi(s), -Track.lo(s)) + 3;
    const nx = Math.max(1, Math.ceil(across / CELL)), nz = Math.max(1, Math.ceil(along / CELL));
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        Track.toWorld(s + (j / nz - 0.5) * (along - 2), lat + (i / nx - 0.5) * (across - 2), spot);
        if (Track.mainDistance(spot.x, spot.z) < half) return false;
        keys.push(Math.floor(spot.x / CELL) * 100003 + Math.floor(spot.z / CELL));
      }
    }
    if (keys.some(k => taken.has(k) && taken.get(k) !== owner)) return false;
    for (const k of keys) taken.set(k, owner);
    return true;
  };
  let owner = '';

  // ---- the parts of a resort ----
  // a block: its front d m off the road's edge, deep m back, wide m along (s its middle), H m tall, its box sunk below the street
  const block = (s, side, d, deep, wide, H, colour, style, sd, ground = 0) => {
    const lat = beside(side, s, d + deep / 2);
    if (!claim(s, lat, deep, wide, owner)) return null;
    solidBox(s, lat, (H - SINK) / 2, deep, H + SINK, wide, colour, style, sd, SINK, ground);
    return lat;
  };
  // a crown of neon round a tower's top (out past its walls, so no face of it lies in one of theirs)
  const crown = (s, lat, top, deep, wide, colour, high = 2.4) => lit(s, lat, top - high / 2 - 0.6, deep + 0.5, high, wide + 0.5, colour, NEON.TUBE);
  // the casino's podium along the front: a lobby in the middle, a marquee band over it, a neon line along its top
  const podium = (s, side, d, wide, colour) => {
    const deep = between(28, 40), H = between(12, 17) + jitter();
    const lat = block(s, side, d, deep, wide, H, colour, STYLE.BANDED, rand(), 2);
    if (lat === null) return null;
    solidBox(s, lat, H + 0.3, deep + 0.6, 0.6, wide - 0.3, 0xf2ece0); // (its cornice)
    lit(s, beside(side, s, d - 0.2), H - 0.9, 0.3, 0.5, wide - 1, pick(NEONS), NEON.TUBE);
    lit(s, beside(side, s, d - 0.25), 9, 0.4, 3.6, Math.min(wide - 8, 26), pick(NEONS), NEON.MARQUEE, rand());
    return { lat, H, deep };
  };
  // a porte-cochere: a canopy out over the forecourt on four columns, bulbs all over it
  const canopy = (s, side, d0, d1, wide, colour) => {
    const lat = beside(side, s, (d0 + d1) / 2);
    lit(s, lat, 6.3, d1 - d0, 0.9, wide, colour, NEON.BULBS, 0.5);
    for (const e of [-1, 1]) for (const q of [d0 + 1, d1 - 1]) solidBox(s + e * (wide / 2 - 1), beside(side, s, q), 2.95, 0.6, 5.9, 0.6, 0xe8dcc8);
  };
  // a pylon sign in front of a resort, its faces along the road (to the traffic both ways): two legs, the marquee, an arrow
  // under it, a diamond of bulbs on top; how tall, by how grand
  const pylon = (s, side, d, grand = 1) => {
    if (blocked(s, side, 'props')) return;
    const w = 7 + 3 * grand, lat = beside(side, s, d + w / 2), h0 = 7 + 3 * grand, colour = pick(NEONS);
    for (const e of [-1, 1]) solidBox(s, lat + e * (w / 2 - 0.6), h0 / 2, 0.9, h0, 0.9, 0x2e3238);
    lit(s, lat, h0 + 2.6 * grand, w, 5.2 * grand, 0.9, colour, NEON.MARQUEE, rand());
    lit(s, lat, h0 - 1.1, w * 0.9, 1.6, 0.7, pick(NEONS), NEON.ARROW, rand());
    const k = 2.6 + 1.4 * grand, top = h0 + 5.2 * grand + k * 0.71 + 0.3;
    lit(s, lat, top, k, k, 1.0, colour === 0xffffff ? 0xffc81e : 0xffffff, NEON.BULBS, rand()).tilt = Math.PI / 4;
    lit(s, lat, top, k * 0.62, k * 0.62, 1.12, colour, NEON.TUBE).tilt = Math.PI / 4; // (its heart, standing proud of the bulbs)
  };
  // a tower: glass, banded or rendered, a crown of neon, now and then a blade sign up its front
  const tower = (s, side, d, deep, wide, H, glass) => {
    const colour = glass ? pick(GLASSES) : pick(RENDERS), style = glass ? STYLE.GLASS : rand() < 0.5 ? STYLE.BANDED : STYLE.RENDER;
    const lat = block(s, side, d, deep, wide, H, colour, style, rand());
    if (lat === null) return null;
    crown(s, lat, H, deep, wide, pick(NEONS));
    if (rand() < 0.5) lit(s, beside(side, s, d - 2.2), H * 0.62, 5, H * 0.42, 1.1, pick(NEONS), NEON.MARQUEE, rand());
    return lat;
  };
  // a palm: its trunk (a slim box, leaning a little), its crown
  const palm = (s, lat, h = 9) => {
    solidBox(s, lat, h / 2, 0.42, h, 0.42, PALM, STYLE.PLAIN).tilt = between(-0.05, 0.05);
    const k = between(0.85, 1.1);
    put(crowns, s, lat, h - 0.2, k, k, k, pick(GREENS), [STYLE.LEAF, 0, 0, 0]);
  };

  // ---- the landmarks: each builds its lot from s along, returns the m of frontage it took ----
  const F = (side) => side === VEGAS.mono.side ? VEGAS.front.left : VEGAS.front.right;
  const LOTS = {
    // a slab tower (or two) on a podium, a canopy and the pylon
    slab(s, side) {
      const wide = between(70, 100), f = F(side), sm = s + wide / 2, back = f + 12;
      if (!podium(sm, side, back, wide, pick(PODIUMS))) return wide;
      canopy(sm, side, f + 1, back - 0.4, 22, pick(NEONS));
      const n = rand() < 0.4 ? 2 : 1;
      for (let k = 0; k < n; k++) tower(sm + (n === 2 ? (k ? 1 : -1) * wide * 0.24 : between(-6, 6)), side, back + between(14, 24), between(16, 22), n === 2 ? wide * 0.36 : between(42, 60), between(80, 150) + jitter(), rand() < 0.6);
      pylon(s + 8, side, f - 0.5, 1);
      return wide + between(8, 20);
    },
    // a Y: three wings of bronze glass round a core, each with its crown
    wye(s, side) {
      const wide = between(90, 120), f = F(side), sm = s + wide / 2, back = f + 12;
      if (!podium(sm, side, back, wide, pick(PODIUMS))) return wide;
      canopy(sm, side, f + 1, back - 0.4, 24, 0xffc81e);
      const cl = beside(side, sm, back + 60), H = between(130, 175) + jitter(), colour = pick([0x8a6a44, 0xb08a52, 0x9a7a5a]);
      owner = 'wye' + s;
      if (claim(sm, cl, 90, 90, owner)) {
        for (const a of [0, 2.094, 4.189]) {
          const Lw = 40, c = Math.cos(a), sn = Math.sin(a);
          const ws = sm + c * Lw / 2, wl = cl - sn * Lw / 2; // (a box's local +z, turned by a, is along the road by cos a and the -lat way by sin a)
          const e = solidBox(ws, wl, (H - SINK) / 2, 15, H + SINK, Lw, colour, STYLE.GLASS, rand(), SINK);
          e.turn = a;
          const r = lit(ws, wl, H - 1.8, 15.5, 2.4, Lw + 0.5, 0xffd890, NEON.TUBE);
          r.turn = a;
        }
        solidBox(sm, cl, (H + 8 - SINK) / 2, 16, H + 8 + SINK, 16, colour, STYLE.GLASS, rand(), SINK);
      }
      pylon(s + 8, side, f - 0.5, 1.3);
      return wide + between(10, 20);
    },
    // a dark glass pyramid, an obelisk before it, the beam from its tip at night
    pyramid(s, side) {
      const wide = 170, f = F(side), sm = s + 75, back = f + 14, half = 52, H = 72;
      const cl = beside(side, sm, back + 26 + half);
      owner = 'pyr' + s;
      if (!claim(sm, cl, half * 2, half * 2, owner)) return 40;
      put(pyramids, sm, cl, H / 2 - 0.5, half * 2, H, half * 2, 0x2a2e36);
      put(pyramids, sm - 34, beside(side, sm, back + 8), 13, 3.2, 26, 3.2, 0xb8a888); // (the obelisk)
      solidBox(sm - 34, beside(side, sm, back + 8), 0.6, 5, 1.2, 5, 0xd9c6a8);
      podium(sm + 66, side, back, 36, 0xd9c6a8);
      pylon(s + 6, side, f - 0.5, 1.2);
      for (const [ds, dl, w, l] of [[0, -half, half * 2 + 1, 0.6], [0, half, half * 2 + 1, 0.6], [-half, 0, 0.6, half * 2 + 1], [half, 0, 0.6, half * 2 + 1]]) lit(sm + ds, cl + dl, 0.9, l, 0.8, w, 0xffd890, NEON.TUBE); // (a line of light round its foot)
      lit(sm, cl, H - 1.2, 2.2, 2.2, 2.2, 0xfff4d8).tilt = Math.PI / 4; // (its tip, lit)
      if (night) beams.push([sm, cl, H]);
      return wide + 10;
    },
    // the lattice tower (after the Paris one), a hotel behind it, its podium
    eiffel(s, side) {
      const wide = 110, f = F(side), sm = s + wide / 2, back = f + 12;
      if (!podium(sm, side, back, wide * 0.8, 0xe6d2c0)) return wide;
      canopy(sm - 20, side, f + 1, back - 0.4, 20, 0xffc81e);
      owner = 'eif' + s;
      const tl = beside(side, sm + 10, back + 52);
      if (claim(sm + 10, tl, 34, 34, owner)) towers.push([sm + 10, tl]);
      tower(sm - 28, side, back + 44, 24, 40, between(90, 120), false);
      pylon(s + 6, side, f - 0.5, 1);
      return wide + 10;
    },
    // the sphere: a screen 70 m across, sat on a low arena, a podium in front
    orb(s, side) {
      const wide = 120, f = F(side), sm = s + wide / 2, back = f + 12, R = 36;
      const cl = beside(side, sm, back + 44 + R);
      owner = 'orb' + s;
      if (!claim(sm, cl, R * 2, R * 2, owner)) return 40;
      orbs.push([sm, cl, R]);
      put(cyls, sm, cl, 1.5, R * 1.7, 5, R * 1.7, 0x2a2d33);
      podium(sm, side, back, 70, pick(PODIUMS));
      pylon(s + 6, side, f - 0.5, 1.2);
      return wide + 10;
    },
    // a white castle: a curtain wall with battlements, round towers under coloured cones, two hotel towers behind
    castle(s, side) {
      const wide = 120, f = F(side), sm = s + wide / 2, back = f + 14;
      owner = 'cas' + s;
      const wl = beside(side, sm, back + 6);
      if (!claim(sm, wl, 12, wide - 10, owner)) return 40;
      solidBox(sm, wl, (14 - SINK) / 2, 10, 14 + SINK, wide - 10, 0xf4f0e8, STYLE.PLAIN, 0, SINK);
      for (let q = sm - wide / 2 + 7; q < sm + wide / 2 - 6; q += 3) solidBox(q, beside(side, sm, back + 1.4), 14.6, 1.2, 1.4, 1.5, 0xf4f0e8);
      const ROOFS = [0xd8262b, 0x2a5fd0, 0xe8b84a];
      [[-0.45, 8, 26], [-0.2, 6, 34], [0.05, 9, 40], [0.28, 6, 30], [0.48, 8, 24]].forEach(([u, r, h], k) => {
        const q = sm + u * wide, tl = beside(side, q, back + 6 + (k % 2 ? 10 : 0));
        put(cyls, q, tl, (h - SINK) / 2, r * 2, h + SINK, r * 2, 0xf6f2ea, [STYLE.PLAIN, 0, SINK, 0]);
        put(cones, q, tl, h + r * 1.1, r * 2.3, r * 2.2, r * 2.3, ROOFS[k % 3]);
      });
      for (const u of [-0.25, 0.25]) tower(sm + u * wide, side, back + 40, 20, 34, between(70, 95), false);
      pylon(s + 6, side, f - 0.5, 1);
      return wide + 10;
    },
    // the observation tower: a tapering shaft, its pod 200 m up with a ring of neon, a mast, a hotel at its foot
    needle(s, side) {
      const wide = 80, f = F(side), sm = s + wide / 2, back = f + 12, tl = beside(side, sm, back + 70);
      owner = 'ndl' + s;
      if (!claim(sm, tl, 30, 30, owner)) return 30;
      put(cyls, sm, tl, 100, 14, 200, 14, 0xe8e4dc);
      put(cyls, sm, tl, 196, 30, 6, 30, 0xf2efe8, [STYLE.BANDED, 300, -193, 0]);
      put(cyls, sm, tl, 203, 34, 8, 34, 0xd8d4cc, [STYLE.BANDED, 600, -199, 0]);
      put(cones, sm, tl, 211, 30, 8, 30, 0xb8bcc0);
      solidBox(sm, tl, 230, 0.8, 32, 0.8, 0xc8ccd0);
      lit(sm, tl, 230 + 16.4, 0.9, 0.9, 0.9, 0xff3a2a);
      put(neons, sm, tl, 199.3, 34.6, 0.8, 34.6, 0x2ad8ff, [NEON.TUBE, 7, 0, 0]);
      podium(sm, side, back, wide - 6, pick(PODIUMS));
      pylon(s + 6, side, f - 0.5, 1);
      return wide + 10;
    },
    // a wedding chapel: a little white chapel, a steeple, a picket fence, a pink sign of bulbs on two posts
    chapel(s, side) {
      const wide = 34, f = F(side), sm = s + wide / 2;
      const lat = block(sm, side, f + 7, 12, 10, 6.2, 0xf8f4ee, STYLE.RENDER, rand());
      if (lat === null) return wide;
      solidBox(sm, lat, 6.5, 12.8, 0.6, 10.8, 0xffffff);
      const st = beside(side, sm, f + 5.5);
      solidBox(sm, st, 5.5, 2.2, 11, 2.2, 0xf8f4ee);
      put(cones, sm, st, 13.2, 2.6, 4.4, 2.6, 0xf2b8c8);
      for (let q = s + 2; q < s + wide - 2; q += 2.5) solidBox(q, beside(side, q, f + 0.8), 0.45, 0.08, 0.9, 0.1, 0xffffff);
      solidBox(sm, beside(side, sm, f + 0.8), 0.82, 0.1, 0.08, wide - 4, 0xffffff);
      const sl = beside(side, s + 6, f + 2.8);
      for (const e of [-1.6, 1.6]) solidBox(s + 6, sl + e, 2.6, 0.25, 5.2, 0.25, 0xf2f2f2);
      lit(s + 6, sl, 5.6, 4.4, 2.4, 0.4, 0xff4fa8, NEON.BOARD);
      lit(s + 6, sl, 7.4, 1.4, 1.4, 0.45, 0xff2a8a, NEON.TUBE).tilt = Math.PI / 4;
      palm(sm + 9, beside(side, sm, f + 3), 7.5);
      return wide;
    },
    // an LED billboard on two legs, turned to the traffic coming up the road
    billboard(s, side) {
      const f = F(side), bl = beside(side, s + 8, f + 4);
      if (blocked(s + 8, side, 'props')) return 20;
      for (const e of [-3.5, 3.5]) solidBox(s + 8 + e, bl, 4.5, 0.5, 9, 0.5, 0x3b3f46);
      lit(s + 8, bl, 10.5, 0.5, 6, 13, 0xffffff, NEON.SCREEN, rand()).turn = side * 0.45;
      return 26;
    },
    // a forecourt of palms, a planter round them
    palms(s, side) {
      const wide = between(26, 40), f = F(side);
      for (let q = s + 4; q < s + wide - 3; q += between(5, 8)) palm(q, beside(side, q, f + between(1.5, 9)), between(8, 12));
      return wide;
    },
  };
  const beams = [], towers = [], orbs = [];

  // ---- the fountains: one long basin on the right beside the level's burst water mains (its fountains' mains), or one a third
  // of the way along on a level with none ----
  const fountains = [];
  { const mains = (LEVEL.waterMains || []).filter(m => !m.road).map(m => m.s).sort((a, b) => a - b);
    let group = [];
    const close = () => { if (group.length) fountains.push([group[0] - 70, group[group.length - 1] + 90]); group = []; };
    for (const s of mains) { if (group.length && s - group[group.length - 1] > 260) close(); group.push(s); }
    close();
    if (!fountains.length && L > 900) fountains.push([L * 0.33, L * 0.33 + 160]);
    for (let i = fountains.length - 1; i >= 0; i--) { // (nowhere it would stand in a clearing)
      const [a, b] = fountains[i];
      if (a < Track.start + 40 || b > Track.end - 40 || !allClear(a, b, 1)) fountains.splice(i, 1);
    }
  }
  const inFountain = (s, pad = 0) => fountains.some(([a, b]) => s > a - pad && s < b + pad);

  // ---- the lots, along the expressway, each side ----
  // (the five homages once each, spread along the level and side to side, in an order of the level's own; between them slab
  // towers and Y towers, chapels, billboards and palms. A homage whose place is taken, or in the fountain, goes on to the next lot)
  const HOMAGES = ['pyramid', 'eiffel', 'orb', 'castle', 'needle'];
  for (let i = HOMAGES.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [HOMAGES[i], HOMAGES[j]] = [HOMAGES[j], HOMAGES[i]]; }
  const flip = rand() < 0.5 ? 1 : -1;
  const slots = HOMAGES.map((kind, i) => ({ kind, s: Track.start + (Track.end - Track.start) * (0.07 + 0.19 * i), side: (i % 2 ? 1 : -1) * flip, done: false }));
  for (const side of [-1, 1]) {
    owner = 'r0:' + side;
    let small = 0;
    for (let s = Track.start + 20; s < Track.end - 30;) {
      if (blocked(s, side, 'building')) { s += 6; continue; }
      if (side > 0 && inFountain(s, 4)) { // (the basin, and the resort behind it across its whole length)
        const fo = fountains.find(([a, b]) => s > a - 4 && s < b + 4);
        s = fo[1] + 6;
        continue;
      }
      // (two or three small lots between big ones)
      let kind;
      const slot = slots.find(x => !x.done && x.side === side && x.s <= s + 10);
      if (slot) { kind = slot.kind; slot.done = true; small = 0; } else if (small >= 2 + Math.floor(rand() * 2)) { kind = rand() < 0.3 ? 'wye' : 'slab'; small = 0; } else { kind = pick(['chapel', 'billboard', 'palms', 'chapel', 'billboard', 'palms', 'slab']); small++; if (kind === 'slab') small = 0; }
      const lists = [boxes, neons, crowns, cyls, cones, pyramids], before = lists.map(l => l.length), extra = [beams.length, towers.length, orbs.length];
      const took = LOTS[kind](s, side);
      // (a lot that ran on into a clearing, the fountain or off the end: taken back)
      if (s + took > Track.end - 10 || !allClear(s, s + took, side) || (side > 0 && fountains.some(([a, b]) => s + took > a - 4 && s < b + 4))) {
        lists.forEach((l, k) => { l.length = before[k]; });
        beams.length = extra[0]; towers.length = extra[1]; orbs.length = extra[2];
        s += 12;
        continue;
      }
      PLACED.push([kind, Math.round(s), side]);
      s += Math.max(6, took);
      owner = 'r0:' + side;
    }
  }
  // the resort behind each fountain, and the basin itself: a balustrade round it, the water, the jets in two rows and a row of tall ones
  const concrete = []; // (strips of the basin's rim and the monorail's beam: one merged mesh)
  const paving = [];
  const tint = new THREE.Color();
  const tinted = (geo, colour) => {
    tint.set(colour);
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([tint.r, tint.g, tint.b], i * 3);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    return geo;
  };
  // a box-section strip along the road (a beam, a rim): its middle at lat(s), `wide` across, y0 to y1, a face each side, its
  // top and underside, closed at the ends: continuous, round any bend (no boxes in a row)
  const strip = (a, b, lat, wide, y0, y1, colour, step = 2) => {
    const pos = [], ring = [];
    for (let s = a; ; s = Math.min(b, s + step)) {
      const h = Track.toWorld(s, lat(s), p), y = p.y, nx = Math.cos(h), nz = -Math.sin(h); // (across the road, the +lat way)
      ring.push([p.x - nx * wide / 2, p.z - nz * wide / 2, p.x + nx * wide / 2, p.z + nz * wide / 2, y]);
      if (s >= b) break;
    }
    const v = (r, k, top) => [k ? r[2] : r[0], r[4] + (top ? y1 : y0), k ? r[3] : r[1]];
    for (let i = 0; i < ring.length - 1; i++) {
      const r0 = ring[i], r1 = ring[i + 1];
      const quad = (a0, a1, b0, b1) => pos.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1);
      quad(v(r0, 0, 1), v(r0, 1, 1), v(r1, 0, 1), v(r1, 1, 1)); // the top
      quad(v(r0, 1, 0), v(r0, 0, 0), v(r1, 1, 0), v(r1, 0, 0)); // the underside
      quad(v(r0, 0, 0), v(r0, 0, 1), v(r1, 0, 0), v(r1, 0, 1)); // one side
      quad(v(r0, 1, 1), v(r0, 1, 0), v(r1, 1, 1), v(r1, 1, 0)); // the other
    }
    for (const [r, out] of [[ring[0], -1], [ring[ring.length - 1], 1]]) { // the ends
      const q = [v(r, 0, 0), v(r, 1, 0), v(r, 0, 1), v(r, 1, 1)];
      if (out > 0) pos.push(...q[0], ...q[1], ...q[2], ...q[2], ...q[1], ...q[3]); else pos.push(...q[0], ...q[2], ...q[1], ...q[1], ...q[2], ...q[3]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    concrete.push(tinted(geo, colour));
  };
  // (the pieces of a..b where a long thing may stand: clear of clearings and of every other road)
  const pieces = (a, b, side, d, across, kind = 'building') => {
    const out = [];
    let from = null;
    for (let s = a; s <= b; s += 2) {
      const ok = !blocked(s, side, kind) && standsClear(s, beside(side, s, d), across, 2) && !(Track.onBridge && Track.onBridge(s));
      if (ok && from === null) from = s;
      if ((!ok || s + 2 > b) && from !== null) { if (s - from > 12) out.push([from, ok ? s : s - 2]); from = null; }
    }
    return out;
  };
  const B = VEGAS.basin;
  for (const [a, b] of fountains) {
    const side = 1, mid = (a + b) / 2, len = b - a;
    owner = 'fountain' + a;
    claim(mid, beside(side, mid, (B.from + B.to) / 2), B.to - B.from, len, owner);
    for (const d of [B.from + B.wall / 2, B.to - B.wall / 2]) strip(a, b, (s) => beside(side, s, d), B.wall, -0.2, 0.95, 0xe8dcc8);
    for (const e of [a + B.wall / 2, b - B.wall / 2]) solidBox(e, beside(side, e, (B.from + B.to) / 2), 0.375, B.to - B.from - B.wall * 2 - 0.02, 1.15, B.wall, 0xe8dcc8);
    paving.push(tinted(sideStrip(a + B.wall, b - B.wall, (s) => beside(side, s, B.from + B.wall), (s) => beside(side, s, B.to - B.wall), B.water, 2), night ? 0x0c2c40 : 0x2a7488));
    for (let s = a + 4; s < b - 3; s += 2.6) {
      [[0.3, 0], [0.55, 1], [0.8, 0]].forEach(([u, row], k) => {
        if (row === 1 && Math.round((s - a) / 2.6) % 3) return; // (the tall row's jets three times as far apart)
        put(jets, s + (k === 1 ? 0 : k * 0.6), beside(side, s, B.from + (B.to - B.from) * u), B.water + 0.02, row ? 0.4 : 0.26, 1, row ? 0.4 : 0.26, 0xffffff, [s - a, row + k * 0.5, rand(), 0]);
      });
    }
    for (let s = a + 8; s < b - 6; s += 18) { solidBox(s, beside(side, s, B.from + 0.35), 1.6, 0.25, 1.3, 0.25, 0xe8dcc8); lit(s, beside(side, s, B.from + 0.35), 2.4, 0.5, 0.5, 0.5, LAMP); } // (lanterns on the rim)
    // the resort over the water
    const hl = beside(side, mid, B.to + 26), H = between(110, 150) + jitter();
    owner = 'fres' + a;
    if (claim(mid, hl, 40, Math.min(150, len), owner)) {
      solidBox(mid, hl, (H - SINK) / 2, 22, H + SINK, Math.min(140, len - 10), 0xf0e6d4, STYLE.RENDER, rand(), SINK, 2);
      crown(mid, hl, H, 22, Math.min(140, len - 10), 0xffd890);
      for (const e of [-1, 1]) {
        const ws = mid + e * Math.min(60, len * 0.4), wl = beside(side, ws, B.to + 30);
        solidBox(ws, wl, (H * 0.7 - SINK) / 2, 30, H * 0.7 + SINK, 18, 0xf0e6d4, STYLE.RENDER, rand(), SINK);
      }
      podium(mid, side, B.to + 3, Math.min(120, len - 20), 0xe8dcc8);
    }
  }

  // ---- the backdrop: more towers behind the Strip, and casino crowns lit on them ----
  for (let s = Track.start + 40, k = 0; s < Track.end; s += between(50, 90)) {
    for (const side of [-1, 1]) {
      if (blocked(s, side, 'building') || rand() < 0.3) continue;
      owner = 'sky' + k++;
      const far = between(150, 260), H = between(50, 150) + jitter();
      tower(s, side, far, between(18, 28), between(26, 44), H, rand() < 0.6);
    }
  }

  // ---- the street: kerbs and pavements, the tall lamps, palms ----
  const streets = [{ from: Track.start, to: Track.end, main: true }, ...exits.map(x => ({ from: x.side0, to: x.sideEnd, main: false }))];
  for (const st of streets) {
    for (const side of [-1, 1]) {
      let from = null;
      const close = (to) => {
        if (from !== null && to - from > 3) {
          const geo = sideStrip(from, to, (q) => beside(side, q, 0.3), (q) => beside(side, q, VEGAS.pave), 0.12, 2, exits.length ? 3 : true);
          const kerb = sideStrip(from, to, (q) => beside(side, q, -0.05), (q) => beside(side, q, 0.3), 0.14, 2, exits.length ? 3 : true);
          for (const [piece, colour] of [[geo, PAVEMENT], [kerb, KERB]]) if (piece.attributes.position.count) paving.push(tinted(piece, colour));
        }
        from = null;
      };
      for (let s = st.from; s <= st.to; s += 2) {
        const ok = !blocked(s, side, 'pavement') && !(Track.onBridge && Track.onBridge(s));
        if (!ok) close(s);
        if (ok && from === null) from = s;
      }
      close(st.to);
      // the lamps every 30 m (staggered side to side): a tall post, two heads on an arm; between them palms in the pavement
      for (let s = st.from + 8 + (side > 0 ? 15 : 0); s < st.to - 4; s += 30) {
        if (!blocked(s, side, 'lamp')) {
          solidBox(s, beside(side, s, 0.9), 4.6, 0.22, 9.2, 0.22, POST);
          solidBox(s, beside(side, s, 0.55), 9.1, 1.6, 0.14, 0.14, POST);
          for (const d of [-0.15, 1.35]) solidBox(s, beside(side, s, d), 8.98, 0.62, 0.2, 0.34, LAMP, STYLE.GLOW);
          if (night) lampCones.push([s, beside(side, s, 0.2), 4.4, 6.2, 8.8, 6.2]);
        }
        const t = s + 15; // (a palm midway between two lamps)
        if (t < st.to - 4 && !blocked(t, side, 'props')) palm(t, beside(side, t, 3.4), between(8.5, 11.5));
      }
    }
  }

  // ---- the monorail: its beam on columns along the left, and a train on it ----
  const M = VEGAS.mono, monoLat = (s) => beside(M.side, s, M.d), runs = [];
  owner = 'mono';
  for (const [a, b] of pieces(Track.start + 15, Track.end - 15, M.side, M.d, 3)) {
    strip(a, b, monoLat, M.wide, M.top - M.deep, M.top, 0xd8d2c6);
    runs.push([a, b]);
    for (let s = a + 6; s < b - 4; s += M.every) {
      solidBox(s, monoLat(s), (M.top - M.deep - SINK) / 2, 1.1, M.top - M.deep + SINK, 1.4, 0xd8d2c6, STYLE.PLAIN, 0, SINK);
      solidBox(s, monoLat(s), M.top - M.deep - 0.37, 2.2, 0.7, 1.8, 0xd8d2c6); // (its cap under the beam)
    }
  }

  // ---- all of it, one mesh a shape ----
  const chunks = (list, every) => {
    const by = new Map();
    for (const e of list) { const k = Math.floor((Track.isMain(e[0]) ? e[0] : Track.along(e[0])) / every); if (!by.has(k)) by.set(k, []); by.get(k).push(e); }
    return [...by.values()];
  };
  for (const part of chunks(boxes, 600)) instances(cube, 0xffffff, part, false, 0, solid);
  for (const part of chunks(neons, 600)) instances(cube, 0xffffff, part, false, 0, neon);
  for (const part of chunks(crowns, 1800)) instances(SHAPES_V.crown, 0xffffff, part, false, 0, leaves);
  instances(SHAPES_V.cyl, 0xffffff, cyls, false, 0, solid);
  instances(SHAPES_V.cone, 0xffffff, cones, false, 0, solid);
  instances(SHAPES_V.pyramid, 0xffffff, pyramids, false, 0, solid);
  if (lampCones.length) instances(SHAPES.lamp, 0xffd9a0, lampCones, false, 0, lampLightMaterial());
  const jetMat = jetMaterial({ night });
  if (jets.length) instances(SHAPES_V.jet, 0xffffff, jets, false, 0, jetMat);
  if (paving.length) {
    const surface = flat(0xffffff);
    surface.vertexColors = true;
    add(mergeGeometries(paving), surface);
  }
  if (concrete.length) {
    const mesh = new THREE.Mesh(mergeGeometries(concrete), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    levelGroup.add(mesh);
  }

  // ---- the one-offs: the sphere, the lattice tower, the beam of light, the wheel, the mountains, the train ----
  const orbMat = orbMaterial({ night });
  for (const [s, lat, R] of orbs) {
    const orb = new THREE.Mesh(SHAPES_V.sphere, orbMat);
    Track.toWorld(s, lat, p);
    orb.position.set(p.x, p.y + R * 0.92, p.z);
    orb.scale.setScalar(R);
    orb.userData.s = s; // (where along the road: scripts/.vegas-check.mjs counts it in sight only near there)
    levelGroup.add(orb);
  }
  for (const [s, lat] of towers) {
    const t = new THREE.Mesh(SHAPES_V.lattice, latticeMaterial({ night }));
    t.rotation.y = Track.toWorld(s, lat, p);
    t.position.set(p.x, p.y, p.z);
    t.userData.s = s;
    levelGroup.add(t);
  }
  for (const [s, lat, H] of beams) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 8, 640, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    Track.toWorld(s, lat, p);
    beam.position.set(p.x, p.y + H + 320, p.z);
    beam.userData.s = s;
    levelGroup.add(beam);
  }
  // (the observation wheel, far off on the right, 60% of the way along, turned a little to the road)
  let wheel = null;
  { const s = Track.start + (Track.end - Track.start) * 0.62, R = 70;
    for (let d = 210; d < 420; d += 30) {
      const lat = beside(1, s, d), h = Track.toWorld(s, lat, p);
      if (Track.mainDistance(p.x, p.z) > R + 40 && offRoads(p.x, p.z, R)) {
        wheel = new THREE.Group();
        wheel.position.set(p.x, p.y + R + 12, p.z);
        wheel.rotation.y = h + 0.5;
        // (by day the frame and its glass cabins are one mesh; at night the cabins and a ring of lights round the rim glow, as
        // a second; its legs, one each side of the wheel from the ends of its axle out to the ground, are a third, still)
        const turning = new THREE.Group();
        turning.add(new THREE.Mesh(night ? SHAPES_V.wheel : SHAPES_V.wheelDay, new THREE.MeshLambertMaterial({ vertexColors: true })));
        if (night) turning.add(new THREE.Mesh(SHAPES_V.wheelLights, new THREE.MeshBasicMaterial({ vertexColors: true })));
        wheel.add(turning);
        wheel.userData.turning = turning;
        wheel.add(new THREE.Mesh(SHAPES_V.wheelLegs, new THREE.MeshLambertMaterial({ color: 0xd8dde2 })));
        wheel.userData.s = s;
        levelGroup.add(wheel);
        break;
      }
    }
  }
  const sky = new THREE.Color(theme.sky ?? 0xa9cfe8);
  const mountains = new THREE.Mesh(SHAPES_V.mountains, new THREE.MeshBasicMaterial({ color: new THREE.Color(night ? 0x1c1838 : 0xb8957e).lerp(sky, night ? 0.25 : 0.45), fog: false, side: THREE.DoubleSide }));
  mountains.frustumCulled = false;
  levelGroup.add(mountains);
  // the train: three cars, coming the other way, met again and again (it starts afresh ahead once it is well behind)
  const train = [];
  if (runs.length) {
    const body = new THREE.InstancedMesh(SHAPES_V.car, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 3);
    const panes = new THREE.InstancedMesh(SHAPES_V.panes, new THREE.MeshBasicMaterial({ color: night ? 0xffe2a8 : 0x26303c, side: THREE.DoubleSide }), 3);
    for (const m of [body, panes]) { m.frustumCulled = false; levelGroup.add(m); }
    train.push(body, panes);
  }
  const onRun = (s) => runs.some(([a, b]) => s > a + 6 && s < b - 6);
  const dummy = new THREE.Object3D(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  let trainS = null, lastT = null, lastPs = null;
  const groundY = () => { Track.toWorld(Math.max(Track.start, Math.min(Track.end, Player.s || 0)), 0, p); return p.y; };
  everyFrame(levelGroup, (t, cx, cy, cz) => {
    neon.userData.uniforms.uTime.value = t;
    jetMat.userData.uniforms.uTime.value = t;
    orbMat.userData.uniforms.uTime.value = t;
    mountains.position.set(cx, groundY(), cz);
    mountains.updateMatrixWorld();
    if (wheel) { wheel.userData.turning.rotation.z = t * 0.03; wheel.updateMatrixWorld(true); }
    if (!train.length) return;
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const ps = Player.s || 0;
    // (the first one close ahead, and again whenever the car is put somewhere new: the monorail is the first thing seen moving)
    if (trainS === null || lastPs === null || Math.abs(ps - lastPs) > 60) trainS = ps + 75;
    else if (trainS < ps - 160 || trainS > ps + 900) trainS = ps + 700;
    lastPs = ps;
    trainS -= 19 * dt;
    for (let k = 0; k < 3; k++) {
      const s = trainS + k * (MONORAIL.length + MONORAIL.gap);
      if (!onRun(s)) { train[0].setMatrixAt(k, hidden); train[1].setMatrixAt(k, hidden); continue; }
      const h = Track.toWorld(s, monoLat(s), p);
      dummy.position.set(p.x, p.y + M.top + 0.05, p.z);
      dummy.rotation.set(0, h + Math.PI, 0);
      dummy.updateMatrix();
      train[0].setMatrixAt(k, dummy.matrix); train[1].setMatrixAt(k, dummy.matrix);
    }
    train[0].instanceMatrix.needsUpdate = true; train[1].instanceMatrix.needsUpdate = true;
  });
};

// ---- the theme's own shapes (made once, kept between levels) ----
const keepShape = (geometry) => { geometry.userData.shared = true; return geometry; };
// (a few geometries as one, each in a colour of its own: [[geometry, colour], ...])
const painted = (parts) => {
  const c = new THREE.Color();
  return keepShape(mergeGeometries(parts.map(([geometry, colour]) => {
    const g = (geometry.index ? geometry.toNonIndexed() : geometry.clone());
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    c.set(colour);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  })));
};
export const SHAPES_V = {
  get crown() { return this._crown ||= palmCrown(); },
  get cyl() { return this._cyl ||= keepShape(new THREE.CylinderGeometry(0.5, 0.5, 1, 20)); },
  get cone() { return this._cone ||= keepShape(new THREE.ConeGeometry(0.5, 1, 16)); },
  // (a four-sided pyramid, its faces square to the road, flat-shaded: each face its own normal)
  get pyramid() { return this._pyr ||= keepShape((() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).toNonIndexed(); g.computeVertexNormals(); return g; })()); },
  get jet() { return this._jet ||= keepShape(new THREE.CylinderGeometry(0.5, 0.5, 1, 7, 4, true)); },
  get sphere() { return this._sphere ||= keepShape(new THREE.SphereGeometry(1, 56, 36)); },
  get lattice() { return this._lattice ||= latticeTower(110); },
  get car() { return this._car ||= monorailCar(0xd8262b); },
  get panes() { return this._panes ||= monorailWindows(); },
  get wheel() { return this._wheel ||= painted([[wheelFrame(70), 0xe8ecf0]]); },
  get wheelDay() { return this._wheelDay ||= painted([[wheelFrame(70), 0xe8ecf0], [wheelCabins(70), 0x9fc4d8]]); },
  get wheelLights() { return this._wheelLights ||= painted([[wheelCabins(70), 0xbfeaff], [new THREE.TorusGeometry(71.2, 0.35, 4, 120), 0xff3aa0]]); },
  get wheelLegs() { return this._wheelLegs ||= painted([-1, 1].map(e => [new THREE.BoxGeometry(2.2, 88, 2.2).rotateX(-e * 0.195).translate(0, -39, e * 11.4), 0xd8dde2])); },
  get mountains() { return this._mountains ||= keepShape(mountainRing(470, 5)); },
};
