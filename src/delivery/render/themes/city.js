// ---- THE CITY: the default theme (a level with no theme of its own, and 'city', 'night', 'flooded' and every theme whose
// scenery is 'city') ------------------------------------------------------------------------------------------------
// Until 15-Oct this was grey boxes and white poles, from the game's first day. Now a city, laid out along the road in
// DISTRICTS, a few hundred metres each, so a drive does not repeat: the edge of town (houses with hipped roofs behind
// their garden walls, low blocks of flats), the industrial estate (warehouses with sawtooth roofs and loading doors
// behind a fence), the high street (brick and rendered terraces, shops under awnings with coloured fascias), midtown
// (blocks of flats with balconies, modern mid-rise with ribbon windows, shops under them) and downtown (glass and banded
// towers on podiums, stepping back as they rise, plant rooms and masts on top, little plazas between). How central a
// stretch is decides what it may be, so the skyline rises towards the middle of the level (two middles on a long one) and
// falls away at its ends; behind the street a backdrop of more towers, taller downtown, makes the rest of the city.
// The street: a kerb and a pavement each side (wide where there are shops, narrow past the warehouses), street lamps
// every 25 m (their heads glowing at night, a cone of light under each and a pool of it on the ground: no real lights),
// trees in grates, benches, bins, hydrants, bus shelters with a lit advert, planters downtown. All of it behind the kerb:
// nothing that is not an obstacle stands in the road or on its shoulder (the owner's rule).
// Everything goes through road.js's `instances`, so nothing stands on another road, a side road, a flyover, a crossroads'
// arm, nor in what keeps clear of them; and nothing is built where the level has a bridge, a tunnel, a level crossing,
// a drawbridge or a ford, and no street furniture where a target, a camera, a low bridge, a shade or roadworks stand
// (clearings below). The Ring Road's set pieces (render/themes/extras.js) keep their stretches as before (cityKeepsClear).
// COST: every box is one instance of one mesh in one material (see cityModels.js: the facades are drawn by its shader),
// and the sawtooth roofs, hipped roofs, water tanks, tree crowns and (at night) the lamps' light one mesh each, the
// pavements one merged mesh: seven draw calls at most, one canvas texture of 256 x 256. Laid out the same every time
// (seeded from the level's id), drawn only: nothing here is read by the rules.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../../config.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { STYLE, SHAPES, cityMaterial, lampLightMaterial } from './cityModels.js';

const CITY_SETS = ['estate', 'retail', 'stadium', 'services', 'centre']; // (the Ring Road's zones: extras.js)
const SINK = 3; // m a building's box goes on down below the street (so on a hill none stands on air)

// ---- the palettes (sRGB) ----
const BRICKS = [0x9a5a45, 0xa8684d, 0x8b4e3c, 0xb27a5c, 0x7e4a3b, 0xc19a78, 0x93604e];
const RENDERS = [0xe6dccb, 0xd8c6a6, 0xc8ced0, 0xe2cfb2, 0xbcc6bd, 0xd6b49c, 0xa9b6c2, 0xece6da];
const CONCRETE = [0xc4c0b6, 0xb3b1ab, 0xd2cec4, 0xa3a5a8, 0xdcd8cf, 0xe4e1d8];
const GLASSES = [0x6a8aa3, 0x587a92, 0x7d98a4, 0x4d6b82, 0x86a09c, 0x6b7a8e, 0x8a8f96];
const METALS = [0x9aa3a8, 0x7d8c88, 0xb2b5b2, 0x8c8176, 0x6d8293, 0xa39b86];
const HOUSES = [0xf0e6d2, 0xe8d6bc, 0xd9e1e4, 0xf2dccb, 0xdfe5d3, 0xe9e1cf, 0xc9b49a];
const TILES = [0x8c4a3a, 0x7a3f33, 0x5b5f66, 0x9a5a40, 0x4f5358, 0x6e4a3c];
const AWNINGS = [0xb3352c, 0x2f5f8a, 0x2f7a4f, 0xd09a2a, 0x7a2f45, 0x2a2d33, 0xe8e4da, 0x1f7f86];
const GREENS = [0x4f7f3a, 0x5a8a40, 0x3f6f35, 0x6a8f45, 0x55783a];
const ADVERTS = [0xf2f0e6, 0xffd36a, 0x8fd0ff, 0xff9a7a, 0xb8f0a0];
const STONE = 0xd6d0c0, KERB = 0xa9a9a4, PAVEMENT = 0xbdbcb5, POST = 0x3b4148, DARK = 0x2e3236, LAMP = 0xfff0c8;

// the district a stretch may be, by how central it is (0 the edge of town, 1 downtown)
const DISTRICTS = (c) => c > 0.72 ? ['downtown', 'downtown', 'midtown'] : c > 0.45 ? ['midtown', 'highstreet', 'midtown', 'downtown']
  : c > 0.22 ? ['highstreet', 'residential', 'midtown'] : ['industrial', 'residential', 'highstreet'];
const ZONE_DISTRICT = { estate: 'residential', retail: 'industrial', stadium: 'industrial', services: 'industrial', centre: 'downtown' };
// m of pavement from the kerb, by district (to the shopfronts where there are shops)
const PAVE = { downtown: 6.2, midtown: 6.2, highstreet: 6.2, residential: 3.2, industrial: 2.6 };
// what keeps what clear (CLEARINGS): 'all', nothing at all; 'street', no pavement and no furniture but the lamps (a flooded
// stretch); 'props', no lamps or furniture (a target, a camera, a low bridge's posts); 'sets', no furniture (the Ring Road's
// set pieces: sound barriers, banners, a car park beside the pavement)
const RULES = { building: ['all'], pavement: ['all', 'street'], lamp: ['all', 'props'], props: ['all', 'props', 'street', 'sets'] };

export const city = ({ theme, add, flat, instances, sideStrip, beside, exits, cube, cityKeepsClear }) => {
  let seed = 7;
  for (const ch of (LEVEL.id || 'city') + ':' + (LEVEL.theme || '')) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const between = (a, b) => a + rand() * (b - a);
  // (a few cm on a building's height, so two side by side, or overlapping round a bend, never have their tops in one plane)
  const jitter = () => between(0.05, 0.45);
  const night = !!(theme.night || theme.lit);
  const material = cityMaterial({ night, sky: theme.sky ?? 0x9fc4e8 });
  const L = Track.length;

  // ---- the lists: one mesh each ----
  const boxes = [], prisms = [], hips = [], tanks = [], crowns = [], cones = [];
  // an entry [s, lat, y, across, high, along] in a colour, a style, a seed, m of it below the street, its ground floor
  const put = (list, s, lat, y, sx, sy, sz, c, style = STYLE.PLAIN, sd = 0, sink = 0, ground = 0) => {
    const e = [s, lat, y, sx, sy, sz];
    e.c = c; e.a = [style, Math.floor(sd * 1000), sink, ground]; // (the seed, 0..1, as a whole number: see cityModels.js)
    list.push(e);
    return e;
  };
  // a run from (s, lat) to (s2, lat2) (a kerb, a fence: it follows the road round a bend)
  // (each a few cm short at its far end: road.js makes a run 2 cm longer than it is, and two end to end would share 2 cm of face)
  const run = (s, lat, s2, lat2, y, sx, sy, c, style = STYLE.PLAIN) => {
    const e = [s, lat, y, sx, sy, 1, [s2 - 0.03 * Math.sign(s2 - s), lat2]];
    e.c = c; e.a = [style, 0, 0, 0];
    boxes.push(e);
  };

  // ---- where nothing, or no street furniture, is to go (in the s of whichever road it is on) ----
  const clearings = [];
  const keep = (from, to, side, what) => clearings.push([from, to, side, what]);
  const sideOf = (x) => x === 'left' ? -1 : x === 'right' ? 1 : 0;
  for (const b of LEVEL.bridges || []) keep(b.from - 30, b.to + 30, 0, 'all');
  for (const t of LEVEL.tunnels || []) keep(t.from - 25, t.to + 25, 0, 'all'); // (and its portals' faces)
  for (const c of LEVEL.crossings || []) { const s = Track.place(c); keep(s - 18, s + 18, 0, 'all'); } // (the railway's line out either side)
  for (const d of LEVEL.drawbridges || []) { const s = Track.place(d); keep(s - 50, s + 50, 0, 'all'); } // (the river under it)
  for (const f of LEVEL.fords || []) keep(f.from - 20, f.to + 20, 0, 'all'); // (the river across the road, wide of it)
  for (const b of LEVEL.lowBridges || []) keep(b.s - 10, b.s + (CONFIG.lowBridge?.stagger ?? 60) + 10, 0, 'props');
  for (const z of LEVEL.shade || []) keep(z.from - 6, z.to + 6, sideOf(z.side), 'props'); // (its own trees cast the shade)
  for (const t of LEVEL.targets || []) { const s = Track.place(t); keep(s - 6, s + 6, sideOf(t.side) || 1, 'props'); }
  for (const c of LEVEL.cameras || []) { const s = Track.place(c); keep(s - 7, s + 7, sideOf(c.side), 'props'); }
  for (const c of LEVEL.schoolCrossings || []) { const s = Track.place(c); keep(s - 12, s + 12, 0, 'props'); }
  for (const w of LEVEL.siteWorks || []) keep(w.from - 10, w.to + 10, sideOf(w.side), 'props');
  for (const z of LEVEL.stopGo || []) keep(z.from - 40, z.to + 40, 0, 'props');
  for (const w of LEVEL.water || []) keep(w.from, w.to, 0, 'street'); // (under water: the lamps stand in it, nothing else)
  // (a roadworks diversion, a level's "diversions" (branch claude/roadworks): its signs on the verge before it, and its plant
  // parked 5.5 m off the road a third and two thirds of the way along, on the works' side, where no shop may stand)
  for (const d of LEVEL.diversions || []) {
    keep(d.from - 220, d.to + 60, 0, 'props');
    [0.33, 0.66].forEach((u, i) => { const s = d.from + (d.to - d.from) * u; keep(s - 16, s + 16, d.kind === 'cross' || d.kind === 'merge' || i ? 1 : -1, 'all'); });
  }
  for (const x of exits) { // (where a side road leaves and comes back, the pavement gives way to the verge: no bench on the grass)
    keep(x.exitAt - 30, x.exitAt + 140, 1, 'props'); keep(x.mergeAt - 140, x.mergeAt + 30, 1, 'props');
    keep(x.side0 - 5, x.side0 + 140, 0, 'props'); keep(x.sideEnd - 140, x.sideEnd + 5, 0, 'props');
  }
  const sets = (LEVEL.zones || []).filter(z => CITY_SETS.includes(z.scenery));
  for (const z of sets) keep(z.from, z.to, 0, 'sets'); // (sound barriers, banners, a car park: the set pieces' own)
  const blocked = (s, side, kind) => clearings.some(([a, b, sd, w]) => s > a && s < b && (!sd || sd === side) && RULES[kind].includes(w));

  // ---- the districts, along the expressway (a side road takes its stretch's) ----
  const centres = L > 4200 ? [0.3, 0.74] : [0.56];
  const central = (s) => Math.max(...centres.map(c => Math.exp(-((((s / L) - c) / 0.2) ** 2))));
  const districts = [];
  for (let s = Track.start, last = null; s < Track.end;) {
    const length = between(280, 560), mid = s + length / 2, c = central(mid);
    const zone = sets.find(z => mid >= z.from && mid < z.to);
    let type = zone ? ZONE_DISTRICT[zone.scenery] : pick(DISTRICTS(c));
    if (!zone && type === last) type = DISTRICTS(c).find(t => t !== last) || type;
    districts.push({ from: s, to: s + length, type, c });
    last = type;
    s += length;
  }
  const districtAt = (sMain) => districts.find(d => sMain >= d.from && sMain < d.to) || districts[districts.length - 1];

  // ---- room for a building: none on top of another road's buildings, nor across the expressway where it bends back ----
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

  // ---- the parts of a building ----
  let owner = '';
  // its body: its front d m off the pavement's edge, deep m back, wide m along (s its middle), H m tall
  const body = (s, side, d, deep, wide, H, color, style, sd, ground = 0) => {
    const lat = beside(side, s, d + deep / 2);
    if (!claim(s, lat, deep, wide, owner)) return null;
    put(boxes, s, lat, (H - SINK) / 2, deep, H + SINK, wide, color, style, sd, SINK, ground);
    return lat;
  };
  // a tier standing on what is under it, from y0 to y1 (its floors still counted from the street)
  const tier = (s, lat, y0, y1, deep, wide, color, style, sd) => put(boxes, s, lat, (y0 - 0.05 + y1) / 2, deep, y1 - y0 + 0.05, wide, color, style, sd, -(y0 - 0.05), 0);
  // a cornice or parapet round the top at y: out past the walls front and back, short of the ends (so two side by side
  // never share a face, and no face of it lies in one of the walls')
  const cornice = (s, lat, y, deep, wide, color, high = 0.6) => put(boxes, s, lat, y + high / 2 - 0.25, deep + 0.7, high, Math.max(0.5, wide - 0.3), color);
  // rooftop clutter on a roof at y: plant rooms, an air-conditioning unit or two, a water tank, a mast
  const clutter = (s, lat, y, deep, wide, odds = 1) => {
    if (rand() < 0.55 * odds) { const h = between(2.6, 3.4); put(boxes, s - wide * between(-0.2, 0.2), lat, y + h / 2, Math.min(deep * 0.4, 5), h, Math.min(wide * 0.3, 6), pick(CONCRETE), STYLE.LOUVRE); }
    for (let k = 0; k < 2; k++) if (rand() < 0.4 * odds) { const h = between(1.0, 1.4); put(boxes, s + wide * between(-0.35, 0.35), lat + deep * between(-0.3, 0.3), y + h / 2, 1.6, h, 2.2, 0x9ea3a6, STYLE.LOUVRE); }
    if (rand() < 0.3 * odds) {
      const ts = s + wide * between(-0.3, 0.3), tl = lat + deep * between(-0.25, 0.25);
      put(boxes, ts, tl, y + 0.9, 2.4, 1.8, 2.4, DARK);
      put(tanks, ts, tl, y + 3.0, 2.6, 2.4, 2.6, pick([0x8a6a4a, 0x9aa0a4, 0x6f7276]));
    }
    if (rand() < 0.2 * odds) put(boxes, s + wide * between(-0.3, 0.3), lat, y + 2.5, 0.12, 5, 0.12, DARK);
  };
  // a street tree in its grate (on the pavement) or a garden
  const tree = (s, lat, scale = 1) => {
    put(boxes, s, lat, 0.12, 1.2, 0.3, 1.2, DARK);
    put(boxes, s, lat, 1.6 * scale, 0.22, 3.2 * scale, 0.22, 0x5a4636);
    put(crowns, s, lat, 4.7 * scale, 3.4 * scale, 3.8 * scale, 3.4 * scale, pick(GREENS), STYLE.LEAF);
  };

  // ---- the buildings, one lot at a time: each returns the m of frontage it took ----
  const BUILD = {
    // a terraced house or shop, 2 to 5 storeys over a shop: brick or render, a cornice, an awning or two
    terrace(s, side, c) {
      const wide = between(6.5, 10.5), deep = between(11, 16), floors = 2 + Math.floor(rand() * (2 + c * 3)), H = 4.2 + floors * 3.1 + 0.6 + jitter();
      const d = 6.2 + (rand() < 0.3 ? rand() * 0.6 : 0), brick = rand() < 0.65, sm = s + wide / 2;
      const lat = body(sm, side, d, deep, wide, H, brick ? pick(BRICKS) : pick(RENDERS), brick ? STYLE.BRICK : STYLE.RENDER, rand(), 1);
      if (lat === null) return wide;
      cornice(sm, lat, H, deep, wide, brick ? STONE : pick(CONCRETE));
      if (rand() < 0.5) { // (awnings over the shops, leaning out over the pavement)
        const units = Math.max(1, Math.round(wide / 6.5)), uw = wide / units;
        for (let k = 0; k < units; k++) {
          if (rand() < 0.3) continue;
          const at = s + (k + 0.5) * uw;
          put(boxes, at, beside(side, at, d - 0.85), 3.15, 1.8, 0.07, uw - 0.9, pick(AWNINGS)).tilt = side * 0.32;
        }
      }
      if (rand() < 0.35) put(boxes, sm + between(-1, 1), beside(side, sm, d + deep * 0.75), H + 1, 0.9, 2, 2.2, brick ? pick(BRICKS) : DARK, brick ? STYLE.BRICK : STYLE.PLAIN); // (a chimney stack)
      clutter(sm, lat, H + 0.35, deep, wide, 0.5);
      return wide;
    },
    // a block of flats: render or brick, balconies up its front, shops under it now and then, a stair tower and a tank on top
    flats(s, side, c, tall) {
      const wide = between(18, 30), deep = between(12, 16), floors = tall ? 5 + Math.floor(rand() * (3 + c * 6)) : 3 + Math.floor(rand() * 3);
      const shops = rand() < (tall ? 0.55 : 0.15), gH = shops ? 4.2 : 0, H = gH + floors * 3.1 + 0.8 + jitter();
      const d = shops ? 6.2 : between(8, 11), brick = rand() < 0.3, sm = s + wide / 2;
      const lat = body(sm, side, d, deep, wide, H, brick ? pick(BRICKS) : pick(RENDERS), brick ? STYLE.BRICK : STYLE.RENDER, rand(), shops ? 1 : 2);
      if (lat === null) return wide;
      cornice(sm, lat, H, deep, wide, pick(CONCRETE), 0.9);
      if (rand() < 0.75) { // (balconies: a slab and a rail at each floor, across most of the front)
        const rail = pick([0x3a3f45, 0xdedbd2, 0x7d98a4]), bw = wide - between(2, 6);
        for (let k = 1; k < floors; k++) {
          const y = gH + k * 3.1;
          put(boxes, sm, beside(side, sm, d - 0.6), y + 0.1, 1.3, 0.2, bw, 0xd8d4ca);
          put(boxes, sm, beside(side, sm, d - 1.17), y + 0.7, 0.06, 1.0, bw, rail);
        }
      }
      put(boxes, sm + wide * 0.2, beside(side, sm, d + deep * 0.6), H + 1.85, 4, 4.1, 3.5, pick(CONCRETE)); // (the stair and lift tower, over what else is up there)
      clutter(sm, lat, H + 0.4, deep, wide);
      return wide + between(1.5, 6);
    },
    // modern mid-rise: ribbon windows, shops under, air conditioning on the roof
    midrise(s, side, c) {
      const wide = between(20, 34), deep = between(16, 24), floors = 3 + Math.floor(rand() * (3 + c * 5)), H = 4.2 + floors * 3.5 + 0.7 + jitter();
      const d = 6.2 + rand() * 1.5, sm = s + wide / 2;
      const lat = body(sm, side, d, deep, wide, H, pick(CONCRETE), STYLE.BANDED, rand(), rand() < 0.7 ? 1 : 2);
      if (lat === null) return wide;
      cornice(sm, lat, H, deep, wide, 0xe8e6df, 0.7);
      if (rand() < 0.4 && floors > 4) { // (the top floor or two set back)
        const top = H + 3.5 * (1 + Math.floor(rand() * 2));
        tier(sm, beside(side, sm, d + deep / 2 + 2), H + 0.1, top, deep - 5, wide - 4, pick(GLASSES), STYLE.GLASS, rand());
        clutter(sm, lat, top, deep - 5, wide - 4);
      } else clutter(sm, lat, H + 0.35, deep, wide);
      return wide + between(2, 7);
    },
    // an office tower on a podium: glass or banded, one to three setbacks, a plant room on top, a mast on the tallest
    tower(s, side, c) {
      const wide = between(24, 38), deep = between(22, 32), d = between(7, 12), sm = s + wide / 2;
      const podium = 4.2 + 3.5 * (1 + Math.floor(rand() * 3)) + jitter();
      const lat = body(sm, side, d, deep, wide, podium, pick(CONCRETE), STYLE.BANDED, rand(), rand() < 0.6 ? 1 : 2);
      if (lat === null) return wide;
      cornice(sm, lat, podium, deep, wide, 0xe4e1d8, 0.7);
      const glass = rand() < 0.62, colour = glass ? pick(GLASSES) : pick(CONCRETE), style = glass ? STYLE.GLASS : STYLE.BANDED, sd = rand();
      let w = wide * between(0.62, 0.8), dp = deep * between(0.62, 0.8), y = podium, top = podium + between(24, 40) + c * between(30, 80);
      const back = beside(side, sm, d + deep / 2 + (deep - dp) * 0.25);
      for (let k = 0; k < 3 && top > y + 6; k++) { // (the shaft, and each setback above it)
        tier(sm, back, y, top, dp, w, colour, style, sd);
        if (!glass) cornice(sm, back, top, dp, w, 0xe8e6df, 0.5);
        y = top;
        if (rand() < 0.45) break;
        w *= 0.78; dp *= 0.78; top = y + between(8, 20);
      }
      put(boxes, sm, back, y + 2, dp * 0.55, 4, w * 0.55, pick([0x4a4f55, 0x8a8f96, 0xc8c4ba]), STYLE.LOUVRE); // (the plant room)
      if (y > 70 && rand() < 0.6) { // (a mast, its light red at night)
        put(boxes, sm, back, y + 4 + 6, 0.35, 12, 0.35, 0xb8bcc0);
        put(boxes, sm, back, y + 16.3, 0.5, 0.5, 0.5, 0xff3a2a, STYLE.GLOW);
      }
      return wide + between(5, 14);
    },
    // a warehouse: corrugated metal, loading doors, a sawtooth roof or a flat one with vents, a fence along its yard
    warehouse(s, side) {
      const wide = between(28, 52), deep = between(24, 40), H = between(7, 11), d = between(10, 18), sm = s + wide / 2;
      const lat = body(sm, side, d, deep, wide, H, pick(METALS), STYLE.METAL, rand(), 3);
      if (lat === null) return wide;
      if (rand() < 0.55) { // (the teeth: each upright face glazed)
        const n = Math.max(2, Math.round(deep / 6)), t = deep / n, colour = pick([0x8e959a, 0x7b8486, 0xa0a39f]);
        for (let k = 0; k < n; k++) put(prisms, sm, beside(side, sm, d + (k + 0.5) * t), H + 1.05, t, 2.2, wide - 0.6, colour, STYLE.SAWTOOTH, rand());
      } else {
        cornice(sm, lat, H, deep, wide, pick(METALS), 0.5);
        for (let k = 0; k < 3; k++) if (rand() < 0.6) put(boxes, sm + wide * between(-0.4, 0.4), lat + deep * between(-0.3, 0.3), H + 0.8, 1.4, 1.2, 1.4, 0x9ea3a6, STYLE.LOUVRE);
      }
      if (d > 13 && rand() < 0.6) { // (its office at the front, two storeys)
        const ow = Math.min(12, wide * 0.4), os = sm + (wide - ow) / 2 * (rand() < 0.5 ? -1 : 1);
        put(boxes, os, beside(side, os, d - 4), (7 - SINK) / 2, 8.2, 7 + SINK, ow, pick(CONCRETE), STYLE.BANDED, rand(), SINK, 2);
        cornice(os, beside(side, os, d - 4), 7, 8.2, ow, 0xe8e6df, 0.5);
      }
      for (let q = s; q < s + wide + 4; q += 4) run(q, beside(side, q, 5.2), Math.min(q + 4, s + wide + 4), beside(side, Math.min(q + 4, s + wide + 4), 5.2), 0.8, 0.08, 1.6, 0x8c968f, STYLE.LOUVRE); // (a palisade along its yard)
      return wide + between(6, 14);
    },
    // a house: two storeys (or one), a hipped roof, a garden wall, a tree in the garden
    house(s, side) {
      const wide = between(10, 13.5), deep = between(8, 10), H = (rand() < 0.75 ? 5.9 : 3.1) + jitter() / 3, d = between(8, 11), sm = s + wide / 2, fw = wide - 3;
      const lat = body(sm, side, d, deep, fw, H, pick(HOUSES), STYLE.HOUSE, rand());
      if (lat === null) return wide;
      put(hips, sm, lat, H + 1.15, deep + 0.8, 2.4, fw + 0.8, pick(TILES));
      if (rand() < 0.5) put(boxes, sm + fw * 0.25, beside(side, sm, d + deep * 0.6), H + 1.6, 0.7, 2.2, 0.7, 0x8a5a48, STYLE.BRICK); // (a chimney)
      run(s + 0.3, beside(side, s + 0.3, 4.3), s + wide - 0.3, beside(side, s + wide - 0.3, 4.3), 0.4, 0.3, 0.8, pick([0x9a5a45, 0xd8d2c2, 0x8f8a80]), STYLE.PLAIN);
      if (rand() < 0.55) tree(sm + between(-3, 3), beside(side, sm, d - 2.2), between(0.8, 1.1));
      return wide;
    },
    // a little plaza or a gap: trees, a planter, a bench
    plaza(s, side) {
      const wide = between(16, 28);
      for (let q = s + 4; q < s + wide - 3; q += between(6, 9)) {
        if (rand() < 0.6) tree(q, beside(side, q, between(8, 12)));
        else {
          put(boxes, q, beside(side, q, 9), 0.3, 1.2, 0.6, 2.6, pick(CONCRETE));
          put(boxes, q, beside(side, q, 9), 0.75, 1.0, 0.4, 2.4, pick(GREENS), STYLE.LEAF);
        }
      }
      return wide;
    },
  };
  // what a district builds, lot by lot
  const LOT = {
    downtown: (s, side, c) => { const r = rand(); return r < 0.55 ? BUILD.tower(s, side, c) : r < 0.85 ? BUILD.midrise(s, side, c) : BUILD.plaza(s, side); },
    midtown: (s, side, c) => { const r = rand(); return r < 0.4 ? BUILD.flats(s, side, c, true) : r < 0.75 ? BUILD.midrise(s, side, c) : r < 0.93 ? BUILD.terrace(s, side, c) : BUILD.plaza(s, side); },
    highstreet: (s, side, c) => { const r = rand(); return r < 0.84 ? BUILD.terrace(s, side, c) : r < 0.95 ? BUILD.midrise(s, side, c) : BUILD.plaza(s, side); },
    residential: (s, side, c) => { const r = rand(); return r < 0.62 ? BUILD.house(s, side) : r < 0.92 ? BUILD.flats(s, side, c, false) : BUILD.plaza(s, side); },
    industrial: (s, side) => rand() < 0.88 ? BUILD.warehouse(s, side) : between(12, 25),
  };

  // ---- each road: the main one and every side road ----
  const streets = [{ id: 0, from: Track.start, to: Track.end, main: true }, ...exits.map((x, n) => ({ id: n + 1, from: x.side0, to: x.sideEnd, main: false }))];
  const sMainOf = (st, s) => st.main ? s : Track.along(s);
  for (const st of streets) {
    for (const side of [-1, 1]) {
      owner = 'r' + st.id + ':' + side;
      for (let s = st.from + 4; s < st.to - 10;) {
        const sMain = sMainOf(st, s);
        if (blocked(s, side, 'building') || cityKeepsClear(sMain, side)) { s += 6; continue; }
        const d = districtAt(sMain), lists = [boxes, prisms, hips, tanks, crowns], before = lists.map(list => list.length);
        s += Math.max(4, LOT[d.type](s, side, d.c));
        // (a lot that ran on into a clearing, or off the end of its road: taken back, the clearing kept)
        if (s > st.to || blocked(s - 1, side, 'building') || cityKeepsClear(sMainOf(st, s - 1), side)) lists.forEach((list, k) => { list.length = before[k]; });
      }
    }
  }

  // ---- the backdrop: more of the city behind the street, taller towards the middle ----
  if (!sets.length) {
    let k = 0;
    for (let s = Track.start + 30; s < Track.end; s += between(38, 70)) {
      for (const side of [-1, 1]) {
        if (blocked(s, side, 'building') || rand() < 0.25) continue;
        const d = districtAt(s), c = d.c, w = between(18, 34), dp = between(16, 30);
        const far = between(48, 150) + (d.type === 'industrial' ? 30 : 0);
        const low = d.type === 'industrial' || d.type === 'residential';
        const H = low ? between(10, 26) : between(18, 40) + c * between(30, 110);
        owner = 'sky' + k++;
        const glass = !low && rand() < 0.55, colour = glass ? pick(GLASSES) : low ? pick(rand() < 0.5 ? RENDERS : BRICKS) : pick(CONCRETE);
        const style = glass ? STYLE.GLASS : low ? (rand() < 0.5 ? STYLE.RENDER : STYLE.BRICK) : STYLE.BANDED;
        const lat = body(s, side, far, dp, w, H, colour, style, rand());
        if (lat === null) continue;
        cornice(s, lat, H, dp, w, glass ? 0x4a4f55 : pick(CONCRETE), 0.8);
        if (!low && H > 60 && rand() < 0.5) tier(s, lat, H + 0.3, H + between(8, 18), dp * 0.6, w * 0.6, colour, style, rand());
      }
    }
  }

  // ---- the street: kerbs and pavements, lamps, trees, furniture ----
  const paving = [], tint = new THREE.Color();
  const tinted = (geo, colour) => { // (a colour for each of its corners: the pavements and kerbs are one mesh)
    tint.set(colour);
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([tint.r, tint.g, tint.b], i * 3);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    return geo;
  };
  for (const st of streets) {
    for (const side of [-1, 1]) {
      // the pavement in pieces: where it may be, at its district's width
      let from = null, width = 0;
      const close = (to) => {
        if (from !== null && to - from > 3) {
          const w = width, geo = sideStrip(from, to, (q) => beside(side, q, 0.3), (q) => beside(side, q, w), 0.12, 2, exits.length ? 3 : true);
          // (and its kerb, a little higher, from just over the road's edge: so no gap shows under the pavement's edge)
          const kerb = sideStrip(from, to, (q) => beside(side, q, -0.05), (q) => beside(side, q, 0.3), 0.14, 2, exits.length ? 3 : true);
          for (const [piece, colour] of [[geo, PAVEMENT], [kerb, KERB]]) if (piece.attributes.position.count) paving.push(tinted(piece, colour));
        }
        from = null;
      };
      for (let s = st.from; s <= st.to; s += 2) {
        const ok = !blocked(s, side, 'pavement') && !(Track.onBridge && Track.onBridge(s));
        const w = PAVE[districtAt(sMainOf(st, s)).type];
        if (!ok || (from !== null && w !== width)) close(s);
        if (ok && from === null) { from = s; width = w; }
      }
      close(st.to);
      // lamps every 25 m (staggered side to side), and between them a tree, a bin, a bench, a hydrant, a shelter
      let shelterAt = st.from + between(150, 300);
      for (let s = st.from + 6 + (side > 0 ? 12.5 : 0); s < st.to - 4; s += 25) {
        const sMain = sMainOf(st, s), type = districtAt(sMain).type;
        if (!blocked(s, side, 'lamp')) {
          put(boxes, s, beside(side, s, 0.9), 3.8, 0.18, 7.6, 0.18, POST);
          put(boxes, s, beside(side, s, 0.45), 7.55, 1.0, 0.12, 0.12, POST);
          put(boxes, s, beside(side, s, 0.02), 7.47, 0.8, 0.16, 0.36, LAMP, STYLE.GLOW);
          if (night) cones.push([s, beside(side, s, 0.02), 3.7, 5.2, 7.4, 5.2]);
          if (!blocked(s, side, 'props')) {
            if (rand() < 0.3) put(boxes, s + 1.3, beside(side, s + 1.3, 1.3), 0.47, 0.55, 0.95, 0.55, pick([0x2a3a30, 0x23262b, 0x3a3f45]));
            if (rand() < 0.16) put(boxes, s - 3, beside(side, s - 3, 0.6), 0.35, 0.3, 0.7, 0.3, 0xc0322a);
          }
        }
        const t = s + 12.5; // (midway to the next lamp)
        if (t > st.to - 4 || blocked(t, side, 'props')) continue;
        if (type !== 'industrial' && t > shelterAt) { // a bus shelter: a roof, glass at the back, a lit advert at one end, a bench
          shelterAt = t + between(320, 520);
          const lat = (d) => beside(side, t, d);
          put(boxes, t, lat(3.0), 2.55, 1.7, 0.12, 4.4, 0x5d656d);
          put(boxes, t, lat(3.75), 1.3, 0.06, 2.4, 4.2, 0x8fa6b2);
          for (const e of [-2.1, 2.1]) put(boxes, t + e, lat(2.3), 1.25, 0.1, 2.5, 0.1, 0x5d656d);
          put(boxes, t + 2.1, lat(3.05), 1.3, 1.3, 1.8, 0.14, pick(ADVERTS), STYLE.GLOW);
          put(boxes, t - 0.4, lat(3.45), 0.45, 0.45, 0.12, 2.4, 0x6a6f75);
          continue;
        }
        const r = rand();
        if (type === 'residential' || type === 'midtown' ? r < 0.75 : type === 'highstreet' ? r < 0.35 : type === 'downtown' ? r < 0.5 : false) tree(t, beside(side, t, type === 'residential' ? 1.9 : 2.7), type === 'residential' ? between(0.9, 1.15) : 1);
        else if (type === 'downtown' || (type === 'highstreet' && r < 0.6)) { // a bench facing the road; or downtown a planter
          if (type === 'downtown' && rand() < 0.5) {
            put(boxes, t, beside(side, t, 3.4), 0.42, 1.0, 0.6, 2.6, pick(CONCRETE));
            put(boxes, t, beside(side, t, 3.4), 0.92, 0.85, 0.45, 2.4, pick(GREENS), STYLE.LEAF);
          } else {
            put(boxes, t, beside(side, t, 3.5), 0.42, 0.5, 0.1, 1.8, 0x7a5a3e);
            put(boxes, t, beside(side, t, 3.78), 0.72, 0.08, 0.5, 1.8, 0x7a5a3e);
            for (const e of [-0.75, 0.75]) put(boxes, t + e, beside(side, t + e, 3.55), 0.2, 0.5, 0.4, 0.08, POST);
          }
        }
      }
    }
  }
  if (paving.length) {
    const surface = flat(0xffffff);
    surface.vertexColors = true;
    add(mergeGeometries(paving), surface);
  }

  // ---- all of it, one mesh a shape (road.js: placed, and taken off any other road, at the end of the level's scenery) ----
  // (the boxes and the crowns, the most of it, in a mesh for each CHUNK m of the road: what is out of sight, behind the
  // camera or round a bend, is not drawn at all. Two or three of each are in sight at once)
  const CHUNK = 600, chunks = (list) => {
    const by = new Map();
    for (const e of list) { const k = Math.floor((Track.isMain(e[0]) ? e[0] : Track.along(e[0])) / CHUNK); if (!by.has(k)) by.set(k, []); by.get(k).push(e); }
    return [...by.values()];
  };
  for (const part of chunks(boxes)) instances(cube, 0xffffff, part, false, 0, material);
  instances(SHAPES.prism, 0xffffff, prisms, false, 0, material);
  instances(SHAPES.hip, 0xffffff, hips, false, 0, material);
  instances(SHAPES.tank, 0xffffff, tanks, false, 0, material);
  for (const part of chunks(crowns)) instances(SHAPES.crown, 0xffffff, part, false, 0, material);
  if (cones.length) instances(SHAPES.lamp, 0xffd9a0, cones, false, 0, lampLightMaterial());
};
