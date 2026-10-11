import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { levelName } from '../levelText.js';
import { Track } from '../track.js';
import { houseAt, gangHouse, LOT } from '../gunfire.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { scene, tmp, applySky, applyLight, clearGroup } from './scene.js';
import { setHeadlights } from './headlights.js';
import { THEMES } from '../themes.js';
import { CIRCUITS } from './circuits/index.js';
import { THEME_SCENERY } from './themes/index.js';
import { THEME_EXTRAS, cityKeepsClear, outbackYard } from './themes/extras.js';

// ---- track meshes ----------------------------------------------------------
// flat strip following a road between lateral offsets latA and latB,
// each either a number or a function of s. Sits y above the road surface.
export const buildStrip = (sFrom, sTo, latA, latB, y, step = 4) => {
  const fa = typeof latA === 'function' ? latA : () => latA;
  const fb = typeof latB === 'function' ? latB : () => latB;
  const pos = [], idx = [];
  for (let n = 0; ; n++) {
    const s = Math.min(sFrom + n * step, sTo);
    Track.toWorld(s, fa(s), tmp); pos.push(tmp.x, tmp.y + y, tmp.z);
    Track.toWorld(s, fb(s), tmp); pos.push(tmp.x, tmp.y + y, tmp.z);
    if (n > 0) {
      const a = (n - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    if (s >= sTo) break;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
};

// dashed line along lat(s), drawn only where show(s) is true
// (dash: { length, spacing, width } of its own, if not a lane line's: a lane-drop line's, see CONFIG.ramps.dropLine)
const buildDashes = (sFrom, sTo, lat, show, dash) => {
  const pos = [], idx = [];
  const half = dash ? dash.width / 2 : 0.08, length = dash ? dash.length : CONFIG.dashLength;
  let n = 0;
  for (let s = sFrom; s < sTo; s += dash ? dash.spacing : CONFIG.dashSpacing) {
    if (!show(s)) continue;
    for (const [ds, dl] of [[0, -half], [0, half], [length, -half], [length, half]]) {
      Track.toWorld(s + ds, lat(s + ds) + dl, tmp);
      pos.push(tmp.x, tmp.y + 0.02, tmp.z);
    }
    idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    n += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
};

// The looks a level can have (its "theme" field): see ../themes.js
export { THEMES };

// Everything built here for the loaded level goes in this group, which is emptied and
// rebuilt each time a level is loaded.
export const levelGroup = new THREE.Group();
scene.add(levelGroup);

// ---- terrain (a theme with "terrain"): a mountainside --------------------------------------------
// The land round the road as a grid of heights, each blended from the heights of the road around
// it (the nearer a stretch of road, the more it counts), so the land climbs and falls with the road
// and fills in between its switchbacks: steep rock where two stretches at different heights come
// close, snow where it is gentler. It is flat, just under the road, for a strip each side of it,
// rougher the further it is from any road, and it sinks to the valley floor all round at the edge.
// (theme.terrain may give its colours: { gentle, steep }, snow and rock otherwise; how rough the
// land is away from the road, `rough` (1: as the alpine pass); and `flat`, m more of it level with the road)
// Returns the height of the land at a world point (x, z).
const buildTerrain = (colours, others) => {
  // every road there is, as points along it: where it is, half its width there, and the point after it on the
  // same road (or -1). The expressway by its own width at each (an exit lane's, a run-off's and all; its two
  // ways apart where a split parts them); then every other road (`others`: side roads, flyovers), on level ground
  const X = [], Y = [], Z = [], W = [], NEXT = [], p = {};
  const point = (x, y, z, w, follows) => {
    const n = X.length;
    X.push(x); Y.push(y); Z.push(z); W.push(w); NEXT.push(-1);
    if (follows >= 0) NEXT[follows] = n;
    return n;
  };
  const centre = -Track.medianHalf;
  let whole = -1, left = -1;
  for (let s = Track.start; s <= Track.end; s += 8) {
    const lo = Track.lo(s), hi = Track.hi(s), split = Track.apart(s) > 1 && lo < centre;
    Track.toWorld(s, split ? (centre + hi) / 2 : (lo + hi) / 2, p);
    whole = point(p.x, p.y, p.z, (hi - (split ? centre : lo)) / 2, whole);
    if (split) {
      Track.toWorld(s, (lo + centre) / 2 - 0.01, p);
      left = point(p.x, p.y, p.z, (centre - lo) / 2, left);
    } else left = -1;
  }
  for (let k = 0, last = -1; k < others.length; k += 3) {
    const near = last >= 0 && Math.hypot(others[k] - X[last], others[k + 1] - Z[last]) < 12; // (the same road, on from the last)
    last = point(others[k], others.ys ? others.ys[k / 3] : 0, others[k + 1], others[k + 2], near ? last : -1); // (a side road's own height, on hilly ground)
  }
  const N = X.length, PREV = new Int32Array(N).fill(-1);
  for (let k = 0; k < N; k++) if (NEXT[k] >= 0) PREV[NEXT[k]] = k;
  const flatTo = 12 + (colours?.flat ?? 0); // (m of level land beyond a road's edge: wider than a grid square, so no slope reaches the road)
  const heightAt = (x, z) => {
    // (the nearest road: by how far it is to its edge, not its middle)
    let best = Infinity, bi = 0, wsum = 0, hsum = 0;
    for (let k = 0; k < N; k++) {
      const dx = x - X[k], dz = z - Z[k], d2 = dx * dx + dz * dz, e = Math.sqrt(d2) - W[k];
      if (e < best) { best = e; bi = k; }
      const w = 1 / (d2 * d2 + 1);
      wsum += w;
      hsum += w * Y[k];
    }
    // (the road's height there: along the line between the samples either side of the nearest,
    // not the nearest sample's own, which on a steep hill can be most of a metre out)
    let bestY = Y[bi];
    for (const [a, b] of [[PREV[bi], bi], [bi, NEXT[bi]]]) {
      if (a < 0 || b < 0) continue;
      const ex = X[b] - X[a], ez = Z[b] - Z[a];
      const u = Math.max(0, Math.min(1, ((x - X[a]) * ex + (z - Z[a]) * ez) / (ex * ex + ez * ez || 1)));
      const e = Math.hypot(X[a] + ex * u - x, Z[a] + ez * u - z) - (W[a] + (W[b] - W[a]) * u);
      if (e <= best + 1e-6) { best = e; bestY = Y[a] + (Y[b] - Y[a]) * u; }
    }
    const d = Math.max(0, best), road = bestY - 0.3;
    if (d < flatTo) return road;
    const away = d - flatTo;
    const rough = (Math.sin(x * 0.05) * Math.cos(z * 0.043) * 5 + Math.sin(x * 0.013 + z * 0.017) * 16) * Math.min(1, away / 90) * (colours?.rough ?? 1);
    const t = Math.min(1, away / (colours?.rise ?? 20)); // (over this many m, from the road's height to the land's)
    const h = road * (1 - t) + (hsum / wsum + rough) * t;
    return h * Math.min(1, Math.max(0, (340 - d) / 140)); // (down to the valley floor at the edge)
  };
  // the grid: every 8 m, over the road and 350 m round it
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < N; i++) {
    x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]);
    z0 = Math.min(z0, Z[i]); z1 = Math.max(z1, Z[i]);
  }
  const G = 8, M = 350;
  const cols = Math.ceil((x1 - x0 + 2 * M) / G) + 1, rows = Math.ceil((z1 - z0 + 2 * M) / G) + 1;
  const pos = new Float32Array(cols * rows * 3), idx = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 - M + c * G, z = z0 - M + r * G, k = (r * cols + c) * 3;
      pos[k] = x; pos[k + 1] = heightAt(x, z); pos[k + 2] = z;
      if (r && c) {
        const a = (r - 1) * cols + c - 1, b = a + 1, d = r * cols + c - 1, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // snow where it is gentle, rock where it is steep (or the theme's own colours)
  const n = geo.attributes.normal, colors = new Float32Array(cols * rows * 3);
  const snow = new THREE.Color(colours?.gentle ?? 0xf3f6f9), rock = new THREE.Color(colours?.steep ?? 0x767c84), mixed = new THREE.Color();
  for (let i = 0; i < cols * rows; i++) {
    mixed.copy(rock).lerp(snow, Math.min(1, Math.max(0, (n.getY(i) - 0.55) / 0.3)));
    colors[i * 3] = mixed.r; colors[i * 3 + 1] = mixed.g; colors[i * 3 + 2] = mixed.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  land.material.polygonOffset = true; // (the road always wins where they meet)
  land.material.polygonOffsetFactor = 2;
  land.material.polygonOffsetUnits = 2;
  levelGroup.add(land);
  // (what stands on the land stands on the land as drawn: the grid's own triangles, which on a steep face between
  // two stretches of road can be metres off the height worked out at a point between its corners)
  const corner = (r, c) => pos[(Math.max(0, Math.min(rows - 1, r)) * cols + Math.max(0, Math.min(cols - 1, c))) * 3 + 1];
  return (x, z) => {
    const u = (x - (x0 - M)) / G, v = (z - (z0 - M)) / G, c = Math.floor(u), r = Math.floor(v), fx = u - c, fz = v - r;
    const a = corner(r, c), b = corner(r, c + 1), d = corner(r + 1, c), e = corner(r + 1, c + 1);
    return fx + fz <= 1 ? a + (b - a) * fx + (d - a) * fz : e + (d - e) * (1 - fx) + (b - e) * (1 - fz);
  };
};
// the height of the land as drawn at a world point (x, z), on a level whose theme has terrain; null on any other,
// where the land is level with the road beside it (what waits beside the road stands on it: see render/items.js)
export let landAt = null;

// how far out from the centre line (m) anything may reach on a side (-1 left, 1 right) at s: on the
// inside of a bend, short of its middle (with the sharpest bend within 200 m either way), so that
// a wide surface's edge never crosses back over itself; elsewhere, as far as you like
const reach = (s, side) => {
  let sharpest = 0;
  for (let q = s - 200; q <= s + 200; q += 20) {
    const c = Track.bend(q) * side;
    if (c > sharpest) sharpest = c;
  }
  return sharpest > 0 ? 0.85 / sharpest : Infinity;
};
// a lateral position, kept within that reach
const within = (s, lat) => {
  const side = lat < 0 ? -1 : 1;
  return side * Math.min(Math.abs(lat), reach(s, side));
};
// the stretches [from, to, ...rest] with the level's bridges cut out of them
const offBridges = (stretches) => {
  let out = stretches;
  for (const b of LEVEL.bridges || []) {
    out = out.flatMap(([from, to, ...rest]) => {
      if (to <= b.from + 4 || from >= b.to - 4) return [[from, to, ...rest]];
      return [[from, b.from + 4, ...rest], [b.to - 4, to, ...rest]].filter(([f, t]) => t - f > 1);
    });
  }
  return out;
};
// ---- zones (a level whose theme's scenery is 'zones'): each stretch of the level (LEVEL.zones)
// dressed as its zone.scenery says. Kits of things beside the road, each over a stretch [a, b],
// collected per kind and drawn at the end, one draw call each; and the landmarks, one by one.
let groundMesh = null;
// the zones a level is dressed in: its own, where its theme is one in zones; on a level with none, the theme's
// own (THEMES: zones), laid end to end along the road in equal shares (and with no sea, where a side road
// would have to run out over it); with any other theme, none
let zoneList = null, zonesFor = null;
const zonesOf = () => {
  if (zonesFor === LEVEL) return zoneList;
  zonesFor = LEVEL;
  const theme = THEMES[LEVEL.theme] || THEMES.city;
  if (theme.scenery !== 'zones') return (zoneList = null);
  if (LEVEL.zones && LEVEL.zones.length) return (zoneList = LEVEL.zones);
  const own = theme.zones || [], n = own.length, dry = (LEVEL.exits || []).length > 0;
  return (zoneList = own.map((z, i) => ({ id: z.scenery, ...z, sea: dry ? undefined : z.sea,
    from: i ? Math.round(Track.length * i / n) : Track.start, to: i === n - 1 ? Track.end : Math.round(Track.length * (i + 1) / n) })));
};
const SEA = 0x2b6fa8, SAND = 0xe4d29a, SANDSTONE = 0xc9a26b;
const buildZones = (beside, instances, add, flat, { cube, tube, cone }, sideStrip) => {
  const sphere = new THREE.SphereGeometry(0.5, 9, 6), p = {};
  const kinds = {}; // name -> [geometry, colour, list, glowing]
  const thing = (name, geometry, colour, glowing = false) => kinds[name] || (kinds[name] = [geometry, colour, [], glowing]);
  const putAt = (name, entry) => kinds[name][2].push(entry);
  const clear = (s, side, d) => { Track.toWorld(s, beside(side, s, d), p); return Track.mainDistance(p.x, p.z) > Math.max(Track.hi(s), -Track.lo(s)) + 3; };
  thing('trunk', tube, 0xd9cfbf); thing('gum', sphere, 0x7a8f62); thing('tower', cube, 0x6f8fa8); thing('sandTower', cube, 0xd8c39b);
  thing('windows', cube, 0x2f3a46); thing('house', cube, 0xe8dcc4); thing('roof', cone, 0x8c4a3a); thing('rock', cube, 0xb8915c);
  thing('pine', cone, 0x2e5b33); thing('pineTrunk', tube, 0x5a4636); thing('stoneWall', cube, 0x8f8a80); thing('midrise', cube, 0xd6d0c2);
  thing('cottage', cube, 0xf4f1e8); thing('poplar', sphere, 0x5f7f3e); thing('canal', cube, 0x5b8fa8); thing('crown', sphere, 0x3f6034);
  thing('saltPan', cube, 0xaebfc6); thing('salt', cone, 0xfbfbf7); thing('weed', cube, 0x4b5b33); thing('pool', cube, 0x6f9fb0);
  thing('stake', cube, 0x4a3b2c); thing('refuge', cube, 0x5a4a3a); thing('rail', cube, 0xd8d2c4); thing('gaugeRed', cube, 0xd2302a);
  thing('gaugeWhite', cube, 0xf6f6f2); thing('coat', cube, 0x3b5e8c); thing('face', sphere, 0xe0b48c);
  thing('tallGrass', cone, 0xc9a548); thing('acacia', sphere, 0x5f7a32); thing('boulder', sphere, 0x8d8272); thing('kopje', sphere, 0x9a8b74);
  thing('reed', cube, 0x6f8a3a); thing('hippoBack', sphere, 0x6a5a62); thing('mound', cone, 0xa0603a); thing('spots', cube, 0xd9a441);
  thing('neck', cube, 0xd9a441); thing('zebra', cube, 0xf2f2ee); thing('stripe', cube, 0x1e1e1e);
  thing('fallen', sphere, 0x6e5440); thing('railPost', cube, 0x8f959c); thing('seaRail', cube, 0xdfe3e6); thing('guidePost', cube, 0xf4f4f0);
  thing('stack', new THREE.CylinderGeometry(0.34, 0.5, 1, 7), 0x8a7356); thing('foam', tube, 0xf2f6f8);
  // (the cliffs: how high, how far down to the sea, and how far each end takes to rise out of the land)
  const CLIFF = { height: 60, below: 22, ramp: 160 };
  const ROCK_SHADES = [0x8c6c4a, 0x76593d, 0x9b7b57, 0x6a4f37, 0x856548, 0x7d6244];
  // 0 at a stretch's ends, easing up to 1 over CLIFF.ramp m in from each
  const ease = (a, b, q) => { const t = Math.max(0, Math.min(1, Math.min(q - a, b - q) / CLIFF.ramp)); return t * t * (3 - 2 * t); };
  // gum trees: pale trunks and untidy clumps of grey-green leaves
  const gums = (a, b, every, dMax, sides = [-1, 1]) => {
    for (let s = a; s < b; s += every) for (const side of sides) {
      const at = s + Math.random() * every, d = 4 + Math.random() * dMax;
      if (!clear(at, side, d)) continue;
      const h = 7 + Math.random() * 7, lat = beside(side, at, d);
      putAt('trunk', [at, lat, h / 2, 0.45, h, 0.45]);
      for (let k = 0; k < 3; k++) { const z = 2 + Math.random() * 2; putAt('gum', [at + Math.random() * 2 - 1, lat + Math.random() * 2 - 1, h * (0.7 + k * 0.15), z, z * 0.7, z]); }
    }
  };
  // towers (banded with windows), standing back from the road
  const towers = (a, b, every, d0, d1, hMin, hMax, kind = 'tower', sides = [-1, 1]) => {
    for (let s = a; s < b; s += every) for (const side of sides) {
      const w = 14 + Math.random() * 16, dd = 14 + Math.random() * 14, d = d0 + dd / 2 + Math.random() * (d1 - d0);
      if (!clear(s, side, d - dd / 2 - 4)) continue;
      const h = hMin + Math.random() * (hMax - hMin), lat = beside(side, s, d);
      putAt(kind, [s, lat, h / 2, dd, h, w]);
      for (let y = 4; y < h - 2; y += 4) putAt('windows', [s, lat, y, dd + 0.1, 1.1, w + 0.1]);
    }
  };
  // houses with hipped roofs, on their blocks
  const houses = (a, b, every, d0, sides = [-1, 1]) => {
    const roof = thing('hip', new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), 0x8c4a3a);
    for (let s = a; s < b; s += every) for (const side of sides) {
      const d = d0 + Math.random() * 20, lat = beside(side, s, d);
      if (!clear(s, side, d - 6)) continue;
      const w = 9 + Math.random() * 4, dd = 8 + Math.random() * 3;
      putAt('house', [s, lat, 1.7, dd, 3.4, w]);
      putAt('hip', [s, lat, 4.4, dd * 1.12, 2.2, w * 1.12]);
    }
  };
  // Vendee cottages: low, whitewashed, with shallow roofs of orange tiles
  const cottages = (a, b, every, d0, sides = [-1, 1]) => {
    thing('tiles', new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), 0xc8643a);
    for (let s = a; s < b; s += every) for (const side of sides) {
      const at = s + Math.random() * every * 0.6, d = d0 + Math.random() * 25, lat = beside(side, at, d);
      if (!clear(at, side, d - 6)) continue;
      const w = 8 + Math.random() * 6, dd = 6 + Math.random() * 2;
      putAt('cottage', [at, lat, 1.4, dd, 2.8, w]);
      putAt('tiles', [at, lat, 3.3, dd * 1.15, 1.1, w * 1.1]);
    }
  };
  // tall, narrow poplars in lines along the marsh's ditches
  const poplars = (a, b, every, side, d) => {
    for (let s = a; s < b; s += every) {
      const h = 14 + Math.random() * 6, lat = beside(side, s, d + Math.random() * 2);
      putAt('pineTrunk', [s, lat, 2, 0.4, 4, 0.4]);
      putAt('poplar', [s, lat, h * 0.55, 2.6, h * 0.85, 2.6]);
    }
  };
  // tall grass, in clumps from the road's edge out to d1, thick enough to hide anything in it
  const tallGrass = (a, b, side, d1, every = 2.5) => {
    for (let s = a; s < b; s += every) {
      for (let d = 0.6 + Math.random(); d < d1; d += 2 + Math.random() * 2) {
        const at = s + Math.random() * every, h = 1.4 + Math.random() * 1.2, w = 1.4 + Math.random() * 1.4;
        putAt('tallGrass', [at, beside(side, at, d), h / 2, w, h, w]);
      }
    }
  };
  // acacias: a thin trunk and a wide, flat crown
  const acacias = (a, b, every, side, d0, d1) => {
    for (let s = a; s < b; s += every) {
      const at = s + Math.random() * every, d = d0 + Math.random() * (d1 - d0), lat = beside(side, at, d), h = 5 + Math.random() * 3;
      if (!clear(at, side, d)) continue;
      putAt('pineTrunk', [at, lat, h / 2, 0.35, h, 0.35]);
      putAt('acacia', [at, lat, h, 7 + Math.random() * 4, 1.4, 7 + Math.random() * 4]);
    }
  };
  // a line of boulders along the road's edge, end to end
  const rockLine = (a, b, side) => {
    for (let s = a; s < b;) {
      const r = 1.2 + Math.random() * 1.6;
      putAt('boulder', [s + r / 2, beside(side, s + r / 2, 0.4 + r / 2), r * 0.35, r, r * 0.8, r * 1.1]);
      s += r * 0.9;
    }
  };
  // giraffes, browsing, and zebras, out in the grass
  const giraffes = (a, b, every, side, d0, d1) => {
    for (let s = a; s < b; s += every) {
      const at = s + Math.random() * every, lat = beside(side, at, d0 + Math.random() * (d1 - d0));
      putAt('spots', [at, lat, 2.4, 1.0, 1.4, 2.0]);
      putAt('neck', [at + 0.9, lat, 3.9, 0.45, 2.4, 0.45]);
      putAt('spots', [at + 1.25, lat, 5.1, 0.45, 0.4, 0.9]);
      for (const [dz, dx] of [[0.7, -0.35], [0.7, 0.35], [-0.7, -0.35], [-0.7, 0.35]]) putAt('neck', [at + dz, lat + dx, 0.9, 0.2, 1.8, 0.2]);
    }
  };
  const zebras = (a, b, every, side, d0, d1) => {
    for (let s = a; s < b; s += every) {
      for (let k = 0; k < 4; k++) { // (a few together)
        const at = s + Math.random() * 12, lat = beside(side, at, d0 + Math.random() * (d1 - d0));
        putAt('zebra', [at, lat, 1.1, 0.7, 0.8, 1.7]);
        for (let q = -2; q <= 2; q++) putAt('stripe', [at + q * 0.3, lat, 1.1, 0.72, 0.82, 0.1]);
        putAt('zebra', [at + 1.0, lat, 1.5, 0.35, 0.8, 0.35]);
        for (const dz of [-0.6, 0.6]) putAt('stripe', [at + dz, lat, 0.4, 0.5, 0.8, 0.12]);
      }
    }
  };
  // Norfolk Island pines: tall, dark, in tiers
  const pines = (a, b, every, side, d0, d1) => {
    for (let s = a; s < b; s += every) {
      const d = d0 + Math.random() * (d1 - d0), lat = beside(side, s, d), h = 14 + Math.random() * 10;
      if (!clear(s, side, d)) continue;
      putAt('pineTrunk', [s, lat, h * 0.15, 0.6, h * 0.3, 0.6]);
      for (let k = 0; k < 4; k++) putAt('pine', [s, lat, h * (0.3 + k * 0.18), h * (0.32 - k * 0.06), h * 0.22, h * (0.32 - k * 0.06)]);
    }
  };
  // a face of rock beside the road on a side, rising from its edge at d0 to a brow `rise` m up at
  // d1, and (with `top`) a slope back down to the land `top` m beyond (a cutting, or a cliff); with
  // `rise` < 0, a drop from the road to the
  // water, its foot at sea level (an absolute height)
  const face = (a, b, side, d0, d1, rise, colour, top = 0) => {
    const pos = [], idx = [];
    let n = 0;
    for (let s = a; s <= b + 0.001; s += 6, n++) {
      const q = Math.min(s, b);
      Track.toWorld(q, beside(side, q, d0), p);
      pos.push(p.x, p.y, p.z);
      const y = rise < 0 ? -0.05 : p.y + rise;
      Track.toWorld(q, beside(side, q, d1), p);
      pos.push(p.x, y, p.z);
      if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      // (the top slopes back down to the land behind it, so that it never ends in the air)
      if (top) { Track.toWorld(q, beside(side, q, d1 + top), p); pos.push(p.x, p.y - 0.05, p.z); }
    }
    const geo = new THREE.BufferGeometry();
    if (top) { // (three points a row: the edge, the brow, the far edge of the top)
      const tri = [];
      for (let k = 1; k < n; k++) {
        const a0 = (k - 1) * 3, b0 = k * 3;
        tri.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0, a0 + 1, a0 + 2, b0 + 1, a0 + 2, b0 + 2, b0 + 1);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(tri);
    } else {
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
    }
    geo.computeVertexNormals();
    levelGroup.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colour, side: THREE.DoubleSide })));
  };
  // a rugged rock face along the road: its foot d0 m off that edge, climbing rise(s) m (or, below 0, falling
  // to there: a drop to the sea), leaning `lean` m out over its height, in uneven ledges, each band a shade of
  // the rock and each facet a little lighter or darker than the next, so it reads as rock going by. With
  // `top`, it levels off into land that far back (a cliff never ends in the air)
  const crag = (a, b, side, d0, rise, lean, shades, top = 0, topColour = null) => {
    const ROWS = 6, grid = [], pos = [], col = [], c = new THREE.Color();
    for (let s = a; s <= b + 0.001; s += 5) {
      const q = Math.min(s, b), r = rise(q), row = [];
      for (let k = 0; k <= ROWS; k++) {
        const t = k / ROWS, inner = k > 0 && k < ROWS;
        Track.toWorld(q, beside(side, q, d0 + lean * t + (inner ? (Math.random() - 0.5) * 2.4 : 0)), p);
        row.push([p.x, p.y + r * t + (inner ? (Math.random() - 0.5) * Math.abs(r) * 0.05 : 0), p.z]);
      }
      if (top) { Track.toWorld(q, beside(side, q, d0 + lean + top), p); row.push([p.x, p.y + r * 0.92, p.z]); }
      grid.push(row);
    }
    const cols = grid[0].length - 1;
    for (let i = 1; i < grid.length; i++) for (let k = 0; k < cols; k++) {
      c.setHex(top && topColour !== null && k === cols - 1 ? topColour : shades[k % shades.length]).multiplyScalar(0.86 + Math.random() * 0.28);
      const A = grid[i - 1][k], B = grid[i - 1][k + 1], C = grid[i][k], D = grid[i][k + 1];
      for (const v of [A, B, C, B, D, C]) { pos.push(v[0], v[1], v[2]); col.push(c.r, c.g, c.b); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals(); // (facets unshared: flat shaded, every ledge catching the light its own way)
    levelGroup.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  };
  // the sea, on the right, from d0 out to the horizon, at sea level (or `drop(s)` m below it: under the
  // cliffs); and a beach before it
  const sea = (a, b, d0, drop = () => 0) => {
    const pos = [], idx = [];
    let n = 0;
    for (let s = a; s <= b + 0.001; s += 10, n++) {
      const q = Math.min(s, b);
      for (const d of [d0, 2500]) { Track.toWorld(q, within(q, beside(1, q, d)), p); pos.push(p.x, -0.05 - drop(q), p.z); }
      if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const water = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: SEA, side: THREE.DoubleSide, depthWrite: false }));
    water.renderOrder = -1.8;
    levelGroup.add(water);
  };
  const beach = (a, b, d0, d1) => {
    const sand = new THREE.Mesh(sideStrip(a, b, (q) => beside(1, q, d0), (q) => beside(1, q, d1), -0.02, 8),
      new THREE.MeshBasicMaterial({ color: SAND, side: THREE.DoubleSide, depthWrite: false }));
    sand.renderOrder = -1.6;
    levelGroup.add(sand);
  };
  // a white lighthouse on a green headland out in the water
  const lighthouse = (s, d, h, band) => {
    Track.toWorld(s, beside(1, s, d), p);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(45, 55, 6, 20), new THREE.MeshLambertMaterial({ color: 0x5f8f45 }));
    head.position.set(p.x, 1, p.z);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, h, 14), new THREE.MeshLambertMaterial({ color: 0xf6f6f2 }));
    tower.position.set(p.x, 4 + h / 2, p.z);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 2.4, 12), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    lantern.position.set(p.x, 4 + h + 1.2, p.z);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2, 12), new THREE.MeshLambertMaterial({ color: band }));
    cap.position.set(p.x, 4 + h + 3.4, p.z);
    levelGroup.add(head, tower, lantern, cap);
    return p;
  };

  for (const z of zonesOf()) {
    const a = z.from, b = z.to;
    if (z.sea !== undefined) { // (under the cliffs, straight into the sea; elsewhere, a beach first)
      const cliffs = z.scenery === 'seacliff';
      // (under the cliffs the sea lies far below the road, easing back up to sea level at the zone's ends)
      const drop = cliffs ? (q) => CLIFF.below * ease(a, b, q) : () => 0;
      if (!cliffs) sea(a, b, z.sea + 30);
      else { // (from the foot of the drop; beneath a bridge, in under the road, which is out over the water there)
        sea(a, b, z.sea + 6, drop);
        for (const br of LEVEL.bridges || []) if (br.from < b && br.to > a) sea(Math.max(a, br.from), Math.min(b, br.to), -40, drop);
      }
      if (!cliffs) beach(a, b, z.sea, z.sea + 32);
      for (const [f, t] of offBridges([[a, b]])) {
        if (cliffs) crag(f, t, 1, z.sea, (q) => -Math.max(1, drop(q)), 7, ROCK_SHADES); // (rock falling away to the water)
        else face(f, t, 1, z.sea, z.sea + 2, -1, 0xb89c6a);
      }
    }
    if (z.scenery === 'sydney') {
      // the city: towers of glass and sandstone near the Harbour Bridge, then lower down; and the
      // Opera House on the harbour beside the bridge (see render/items.js for the bridge)
      // (towers either side of the bridge: the city behind the start, and beyond the bridge)
      for (const [from, to] of [[Track.start, a + 140], [a + 650, a + 1050]]) {
        towers(from, to, 24, 18, 70, 50, 170);
        towers(from, to, 40, 20, 60, 20, 60, 'sandTower');
      }
      towers(a + 1050, b, 30, 22, 60, 12, 40, 'midrise');
      gums(a + 1050, b, 40, 30);
      const bridge = (LEVEL.bridges || []).find(x => x.style === 'harbour');
      if (bridge) {
        const at = (bridge.from + bridge.to) / 2 + 40, h = Track.toWorld(at, beside(1, at, 140), p);
        const white = new THREE.MeshLambertMaterial({ color: 0xf8f6ee }), podium = new THREE.MeshLambertMaterial({ color: 0xc9a77a });
        const house = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(60, 6, 120), podium);
        base.position.y = 3;
        house.add(base);
        [[0, 34, 26], [0, 4, 22], [0, -24, 17], [18, 30, 13], [18, 6, 11]].forEach(([x, z0, r], k) => {
          const sail = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI, 0, Math.PI / 2), white);
          sail.scale.set(0.75, 1.5, 1);
          sail.rotation.set(0, Math.PI / 2, 0);
          sail.position.set(x - 8, 6, z0);
          house.add(sail);
        });
        house.position.set(p.x, -0.05, p.z);
        house.rotation.y = h;
        levelGroup.add(house);
      }
    } else if (z.scenery === 'bush') {
      gums(a, b, 9, 55);
      for (let s = a; s < b; s += 70) for (const side of [-1, 1]) {
        const d = 6 + Math.random() * 30;
        if (clear(s, side, d)) putAt('rock', [s, beside(side, s, d), 0.8, 3 + Math.random() * 4, 1.6 + Math.random() * 2, 4 + Math.random() * 5]);
      }
    } else if (z.scenery === 'ousley') {
      // the escarpment: sandstone cuttings on the uphill side (the left), the bush falling away on
      // the right to the coastal plain and the sea far below
      face(a + 60, b - 300, -1, 2, 16, 26, SANDSTONE, 50);
      gums(a, b, 14, 50, [1]);
      sea(a + 400, b, 650);
    } else if (z.scenery === 'seacliff') {
      // cliffs on the left, rugged and banded, rising out of the land at the zone's start and sinking back at its
      // end; rocks fallen at their foot; the sea far below on the right, behind a guardrail, with sea stacks
      // standing out in it, foam round their feet; and guide posts down both sides, ticking by (the Sea Cliff
      // Bridge itself, where a level has it: render/items.js)
      const rise = (q) => CLIFF.height * ease(a, b, q) * (0.82 + 0.12 * Math.sin(q / 41) + 0.06 * Math.sin(q / 13));
      crag(a, b, -1, 0.8, rise, 14, ROCK_SHADES, 40, z.ground ?? 0x6b8a4e); // (grass on top)
      for (let s = a + 4; s < b - 4; s += 9 + Math.random() * 9) {
        const r = 0.6 + Math.random() * 1.6;
        if (ease(a, b, s) > 0.3) putAt('fallen', [s, beside(-1, s, 0.4 + Math.random() * 1.5), r * 0.5, r * 1.6, r, r * 1.3]);
      }
      for (const [f, t] of offBridges([[a, b]])) for (let s = f; s + 4 <= t; s += 4) {
        putAt('railPost', [s, beside(1, s, 0.4), 0.45, 0.14, 0.9, 0.14]);
        putAt('seaRail', [s, beside(1, s, 0.35), 0.75, 0.08, 0.32, 4.02, [s + 4, beside(1, s + 4, 0.35)]]);
      }
      for (let s = a; s < b; s += 25) for (const side of [-1, 1]) putAt('guidePost', [s, beside(side, s, side < 0 ? 0.3 : 0.9), 0.6, 0.12, 1.2, 0.12]);
      for (let s = a + 30; s < b - 30; s += 40 + Math.random() * 50) {
        const d = 40 + Math.random() * 260, h = 9 + Math.random() * 16, w = 9 + Math.random() * 12, y = z.sea !== undefined ? -CLIFF.below * ease(a, b, s) : 0; // (on the sea, far below)
        putAt('stack', [s, beside(1, s, d), y + h / 2 - 2, w, h, w * (0.7 + Math.random() * 0.5)]);
        putAt('foam', [s, beside(1, s, d), y + 0.05, w * 1.3, 0.1, w * 1.3]);
      }
    } else if (z.scenery === 'wollongong') {
      towers(a, b, 32, 22, 70, 15, 55, 'midrise', [-1]);
      pines(a, b, 45, 1, z.sea + 4, z.sea + 20);
      gums(a, b, 50, 25, [-1]);
      lighthouse(b - 300, z.sea + 160, 22, 0xd22a2a);
    } else if (z.scenery === 'shellharbour') {
      houses(a, b, 26, 14, [-1]);
      pines(a, b, 60, 1, z.sea + 4, z.sea + 20);
    } else if (z.scenery === 'marais') {
      // the marsh at Beauvoir-sur-Mer: flat green fields cut by ditches, lines of poplars,
      // whitewashed cottages
      for (const side of [-1, 1]) {
        putAt('canal', [(a + b) / 2, beside(side, (a + b) / 2, 14), -0.03, 3, 0.04, b - a]);
        poplars(a, b, 22, side, 20);
      }
      cottages(a, b - 100, 45, 30);
    } else if (z.scenery === 'gois') {
      // the causeway at mid-tide: the sea coming in on the right, up to the road; on the left the
      // sand flats, with pools, weed, rows of mussel stakes and people out gathering shellfish; and
      // along it the refuge towers to climb if the sea catches you, and depth gauges in the water
      sea(a, b, 0.6);
      for (let s = a; s < b; s += 18) {
        const d = 6 + Math.random() * 140, lat = beside(-1, s, d), k = Math.random();
        if (k < 0.45) putAt('weed', [s, lat, -0.02, 3 + Math.random() * 6, 0.05, 4 + Math.random() * 8]);
        else if (k < 0.7) putAt('pool', [s, lat, -0.03, 3 + Math.random() * 6, 0.03, 5 + Math.random() * 9]);
      }
      for (let s = a + 150; s < b - 150; s += 380) { // mussel stakes, in rows out across the flats
        const d0 = 40 + Math.random() * 80;
        for (let k = 0; k < 14; k++) putAt('stake', [s + (k % 2) * 1.5, beside(-1, s, d0 + k * 2.2), 0.8, 0.2, 1.6, 0.2]);
      }
      for (let s = a + 60; s < b; s += 90) { // shellfish gatherers
        if (Math.random() < 0.4) continue;
        const at = s + Math.random() * 40, lat = beside(-1, at, 15 + Math.random() * 90);
        putAt('coat', [at, lat, 0.6, 0.45, 1.2, 0.35]);
        putAt('face', [at, lat, 1.4, 0.3, 0.3, 0.3]);
      }
      for (let s = a + 200; s < b - 100; s += 470) { // the refuge towers: a tall post, a platform, a rail round it
        const lat = beside(-1, s, 3);
        putAt('refuge', [s, lat, 4.5, 0.4, 9, 0.4]);
        putAt('refuge', [s, lat, 7.2, 2.8, 0.25, 2.8]);
        for (const [x, z, w, l] of [[-1.35, 0, 0.08, 2.8], [1.35, 0, 0.08, 2.8], [0, -1.35, 2.8, 0.08], [0, 1.35, 2.8, 0.08]]) {
          putAt('rail', [s + z, lat + x, 7.75, w, 0.9, l]);
        }
        for (let y = 0.6; y < 7; y += 0.5) putAt('rail', [s - 0.3, lat, y, 0.5, 0.06, 0.06]); // (the rungs of its ladder)
      }
      for (let s = a + 40; s < b; s += 60) { // depth gauges: posts banded red and white, in the water
        for (let k = 0; k < 6; k++) putAt(k % 2 ? 'gaugeWhite' : 'gaugeRed', [s, beside(1, s, 1.2), 0.25 + k * 0.5, 0.16, 0.5, 0.16]);
      }
    } else if (z.scenery === 'noirmoutier') {
      // the island: salt pans with their white heaps of salt, umbrella pines, cottages, and the
      // sea beyond a beach on the right
      for (let s = a + 30; s < b - 30; s += 34) {
        const lat = beside(-1, s, 22 + Math.random() * 10);
        putAt('saltPan', [s, lat, -0.02, 14, 0.04, 26]);
        if (Math.random() < 0.7) putAt('salt', [s + 8, lat - 9, 0.7, 2.6, 1.4, 2.6]);
      }
      for (let s = a; s < b; s += 16) {
        const lat = beside(1, s, 8 + Math.random() * 30), h = 7 + Math.random() * 4;
        putAt('pineTrunk', [s, lat, h * 0.45, 0.35, h * 0.9, 0.35]);
        putAt('crown', [s, lat, h, 6, 2, 6]);
      }
      cottages(a + 60, b, 50, 45, [-1]);
      sea(a, b, 70);
      beach(a, b, 40, 72);
    } else if (z.scenery === 'savanna') {
      // tall golden grass right up to the road on both sides, acacias and giraffes beyond it
      for (const side of [-1, 1]) {
        tallGrass(a, b, side, 22);
        acacias(a, b, 70, side, 30, 160);
        giraffes(a + 100, b, 260, side, 40, 120);
      }
    } else if (z.scenery === 'kopjes') {
      // a line of boulders along each edge of the road, and the great piles of rock (the kopjes) beyond
      for (const side of [-1, 1]) {
        rockLine(a, b, side);
        for (let s = a + 40; s < b; s += 110) {
          const at = s + Math.random() * 40, d = 25 + Math.random() * 60;
          for (let k = 0; k < 6; k++) {
            const r = 4 + Math.random() * 8;
            putAt('kopje', [at + Math.random() * 14, beside(side, at, d + Math.random() * 14), r * 0.4 + k * 1.2, r, r * 0.8, r]);
          }
        }
        acacias(a, b, 120, side, 20, 140);
      }
    } else if (z.scenery === 'river') {
      // the river on the right, beyond a muddy bank: reeds at its edge, hippos wallowing in it, and
      // the far bank's trees; tall grass on the left
      const H = CONFIG.hippo, RIVER = 75;
      const bankMud = new THREE.Mesh(sideStrip(a, b, (q) => beside(1, q, 0), (q) => beside(1, q, H.bank + 0.5), -0.02, 6),
        new THREE.MeshBasicMaterial({ color: 0x6b5536, side: THREE.DoubleSide, depthWrite: false }));
      bankMud.renderOrder = -1.7;
      const river = new THREE.Mesh(sideStrip(a, b, (q) => beside(1, q, H.bank), (q) => within(q, beside(1, q, RIVER)), -0.03, 6),
        new THREE.MeshBasicMaterial({ color: 0x4d7f78, side: THREE.DoubleSide, depthWrite: false }));
      river.renderOrder = -1.6;
      levelGroup.add(bankMud, river);
      for (let s = a; s < b; s += 3) {
        if (Math.random() < 0.5) putAt('reed', [s, beside(1, s, H.bank + Math.random() * 1.5), 0.8, 0.12, 1.6 + Math.random(), 0.12]);
      }
      for (let s = a + 30; s < b; s += 45) { // hippos wallowing: backs, ears and eyes just out of the water
        const at = s + Math.random() * 30, lat = beside(1, at, H.out + 4 + Math.random() * 40);
        putAt('hippoBack', [at, lat, 0, 2, 0.7, 3.4]);
        putAt('hippoBack', [at + 1.9, lat, 0.1, 1, 0.5, 1]);
      }
      acacias(a, b, 40, 1, RIVER + 5, RIVER + 60);
      tallGrass(a, b, -1, 20);
      acacias(a, b, 90, -1, 25, 140);
    } else if (z.scenery === 'plains') {
      // short grass to the horizon: zebras, termite mounds, the odd acacia
      for (const side of [-1, 1]) {
        zebras(a, b, 180, side, 25, 110);
        acacias(a, b, 110, side, 20, 200);
        for (let s = a; s < b; s += 60) {
          const at = s + Math.random() * 60, h = 1.5 + Math.random() * 2.5;
          putAt('mound', [at, beside(side, at, 8 + Math.random() * 50), h / 2, 1.4, h, 1.4]);
        }
      }
    } else if (z.scenery === 'kiama') {
      // green hills with dry-stone walls, the lighthouse on its point at the end, and the blowhole beside it
      for (let s = a; s < b; s += 4) putAt('stoneWall', [s + 2, beside(-1, s + 2, 18), 0.5, 0.6, 1, 4.02]);
      gums(a, b, 60, 40, [-1]);
      houses(a, a + 300, 30, 26, [-1]);
      const lh = lighthouse(b - 120, z.sea + 110, 16, 0xf6f6f2);
      const spout = new THREE.Mesh(new THREE.ConeGeometry(5, 26, 12, 1, true), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
      spout.position.set(lh.x + 30, 13, lh.z + 10);
      spout.rotation.x = Math.PI;
      levelGroup.add(spout);
    }
  }
  for (const [geometry, colour, list, glowing] of Object.values(kinds)) instances(geometry, colour, list, glowing);
  // the sign before the causeway: the road goes under the sea at high tide
  if (LEVEL.tide && zonesOf().some(z => z.scenery === 'gois')) {
    const at = LEVEL.tide.from - 90, steel = new THREE.MeshLambertMaterial({ color: 0x9a9da3 });
    for (const dl of [-1.6, 1.6]) {
      Track.toWorld(at, beside(1, at, 2 + dl), p);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 0.15), steel);
      post.position.set(p.x, p.y + 2, p.z);
      levelGroup.add(post);
    }
    const h = Track.toWorld(at, beside(1, at, 2), p);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: goisSign(), side: THREE.DoubleSide }));
    sign.position.set(p.x, p.y + 3.6, p.z);
    sign.rotation.y = h + Math.PI;
    sign.userData.text = true;
    if (Track.mirrored) sign.scale.x = -1;
    levelGroup.add(sign);
  }
  // a kangaroo crossing sign on the kerb 60 m before each stretch kangaroos cross, facing the player
  for (const herd of (LEVEL.herds || []).filter(h => h.kind === 'kangaroo')) {
    const at = herd.from - 60, h = Track.toWorld(at, beside(1, at, 1.2), p);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), new THREE.MeshLambertMaterial({ color: 0x9a9da3 }));
    post.position.set(p.x, p.y + 1.2, p.z);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: kangarooSign(), transparent: true, side: THREE.DoubleSide }));
    sign.position.set(p.x, p.y + 2.9, p.z);
    sign.rotation.y = h + Math.PI;
    sign.userData.text = true; // (kept the right way round on a left-hand level: see render/items.js)
    if (Track.mirrored) sign.scale.x = -1;
    levelGroup.add(post, sign);
  }
};
// the Passage du Gois sign's face: blue, the name, and the warning that the road floods
let goisSignTexture = null;
const goisSign = () => {
  if (goisSignTexture) return goisSignTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#1d4f9c';
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#fff'; g.lineWidth = 8;
  g.strokeRect(10, 10, 492, 236);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = 'bold 58px sans-serif';
  g.fillText('PASSAGE DU GOIS', 256, 84);
  g.font = 'bold 30px sans-serif';
  g.fillText('ROUTE SUBMERSIBLE', 256, 138);
  g.fillText('À MARÉE HAUTE', 256, 176);
  g.font = '26px sans-serif';
  g.fillText('4,2 km', 256, 222);
  goisSignTexture = new THREE.CanvasTexture(canvas);
  goisSignTexture.colorSpace = THREE.SRGBColorSpace;
  return goisSignTexture;
};
// the road works sign's face: a yellow diamond, a black border, ROAD WORK
let roadWorkTexture = null;
const roadWorkSign = () => {
  if (roadWorkTexture) return roadWorkTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.translate(128, 128);
  g.rotate(Math.PI / 4);
  g.fillStyle = '#111';
  g.fillRect(-88, -88, 176, 176);
  g.fillStyle = '#ffb21f';
  g.fillRect(-80, -80, 160, 160);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#111';
  g.textAlign = 'center';
  g.font = 'bold 40px sans-serif';
  g.fillText('ROAD', 128, 118);
  g.fillText('WORK', 128, 162);
  roadWorkTexture = new THREE.CanvasTexture(canvas);
  roadWorkTexture.colorSpace = THREE.SRGBColorSpace;
  return roadWorkTexture;
};
// the kangaroo crossing sign's face: a yellow diamond with a black border and a kangaroo
let kangarooSignTexture = null;
const kangarooSign = () => {
  if (kangarooSignTexture) return kangarooSignTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.translate(128, 128);
  g.rotate(Math.PI / 4);
  g.fillStyle = '#111';
  g.fillRect(-88, -88, 176, 176);
  g.fillStyle = '#ffd21f';
  g.fillRect(-80, -80, 160, 160);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#111';
  g.beginPath(); g.ellipse(128, 132, 30, 40, -0.5, 0, Math.PI * 2); g.fill();          // body
  g.beginPath(); g.ellipse(160, 88, 14, 11, -0.3, 0, Math.PI * 2); g.fill();          // head
  g.beginPath(); g.moveTo(152, 80); g.lineTo(150, 62); g.lineTo(160, 78); g.fill();     // ear
  g.lineWidth = 11; g.lineCap = 'round'; g.strokeStyle = '#111';
  g.beginPath(); g.moveTo(108, 156); g.quadraticCurveTo(80, 185, 58, 190); g.stroke(); // tail
  g.lineWidth = 9;
  g.beginPath(); g.moveTo(132, 164); g.lineTo(150, 186); g.lineTo(176, 188); g.stroke(); // leg and foot
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(150, 118); g.lineTo(166, 128); g.stroke();                   // arm
  kangarooSignTexture = new THREE.CanvasTexture(canvas);
  kangarooSignTexture.colorSpace = THREE.SRGBColorSpace;
  return kangarooSignTexture;
};

// every frame: on a level in zones, the sky (and the fog with it) and the ground blend towards
// the colours of the zone the player is in
// (all at once when the player has jumped there: a new run, or ?at= in the address)
const skyNow = new THREE.Color(), skyWant = new THREE.Color();
let zoneS = 0;
export const syncZones = (dt) => {
  const zones = Track && zonesOf();
  if (!zones || !zones.length) return;
  const zone = zones.find(z => Player.s >= z.from && Player.s < z.to) || zones[Player.s < zones[0].from ? 0 : zones.length - 1];
  const k = Math.abs(Player.s - zoneS) > 100 ? 1 : Math.min(1, dt * 0.6);
  zoneS = Player.s;
  skyWant.set(zone.sky ?? (THEMES[LEVEL.theme] || THEMES.city).sky);
  skyNow.lerp(skyWant, k);
  applySky(skyNow.getHex());
  if (groundMesh && zone.ground !== undefined) groundMesh.material.color.lerp(skyWant.set(zone.ground), k);
};

const buildRoad = () => {
  // a left-hand level is the game seen in a mirror: the whole scene drawn with x reversed
  scene.scale.x = Track.mirrored ? -1 : 1;
  clearGroup(levelGroup);
  const theme = THEMES[LEVEL.theme] || THEMES.city;
  applySky(theme.sky);
  if (zonesOf() && zonesOf().length) skyNow.set((zonesOf()[0].sky ?? theme.sky));
  applyLight(theme.light);
  setHeadlights(!!theme.headlights);
  const flat = (color) => new (theme.lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial)({ color, side: THREE.DoubleSide });
  const add = (geo, mat) => {
    // (a lit surface needs to know which way it faces; the strips are built without that)
    if (theme.lit && !geo.attributes.normal) geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.flat = true; // (a surface laid on the ground: nothing a camera can't see over, see render/racewatch.js)
    return levelGroup.add(mesh);
  };
  const asphalt = flat(theme.road || 0), lineMat = flat(theme.line || 0xf2f2f2), centreMat = flat(theme.centre || 0xffc400);
  const pave = (geo) => { if (theme.road !== null) add(geo, asphalt); }; // (no road surface in space)
  const LW = CONFIG.laneWidth, ZONE = CONFIG.ramps.laneZone, RAMP = CONFIG.ramps.ramp;
  const exits = Track.exits;
  // every other road's pavement (side roads, and flyovers where an exit has them), as points along its middle:
  // x, z, and half its width there and a little over. Nothing of any theme's scenery stands on one (see
  // instances, and offRoads), and the land of a theme with terrain lies level under it (see buildTerrain)
  const others = [];
  for (const x of exits) {
    const along = (from, to, lo, hi) => {
      for (let s = from; s <= to; s += 5) {
        Track.toWorld(s, (lo(s) + hi(s)) / 2, tmp);
        others.push(tmp.x, tmp.z, (hi(s) - lo(s)) / 2 + 1.5);
        (others.ys || (others.ys = [])).push(tmp.y);
      }
    };
    along(x.side0, x.sideEnd, Track.lo, Track.hi);
    if (x.flyovers) for (const from of [x.flyA0, x.flyB0]) along(from, from + CONFIG.ramps.flyoverLength, () => -LW / 2 - 0.5, () => LW / 2 + 0.5);
  }
  // (and each arm of a crossroads that the road does not take, a level's "junctions": as wide as the road, level)
  for (const jn of Track.junctions) {
    for (const arm of jn.arms) {
      for (let d = jn.half; d <= arm.length; d += 5) {
        others.push(jn.centre.x + arm.dir.x * d, jn.centre.z + arm.dir.z * d, jn.half + 1.5);
        (others.ys || (others.ys = [])).push(jn.centre.y);
      }
    }
  }
  // ---- keeping scenery off the other roads ----------------------------------------------------------
  // Every road's pavement, shoulders and all, as points 2 m apart along its middle (x, z, half its width there,
  // which road), in a grid of squares to look them up by: each side road and flyover whole, and the expressway
  // round each exit. Road 0 is the expressway; exit n's side road is 1 + 3n, its flyovers 2 + 3n and 3 + 3n.
  // Everything any theme stands beside a road goes through offRoads (or what is built on it: instances,
  // sideStrip, and the last look over the level at the end of buildRoad), so that nothing stands on, hangs
  // over or pokes through another road or its verge, and nothing is cleared that is not in the way
  const SQUARE = 16, VERGE = CONFIG.ramps.clear, paved = [], squares = new Map();
  const pavedRoad = (id, from, to, lo, hi) => {
    for (let s = from; s <= to; s += 2) {
      Track.toWorld(s, (lo(s) + hi(s)) / 2, tmp);
      const key = Math.floor(tmp.x / SQUARE) * 100003 + Math.floor(tmp.z / SQUARE);
      if (!squares.has(key)) squares.set(key, []);
      squares.get(key).push(paved.length);
      paved.push(tmp.x, tmp.z, (hi(s) - lo(s)) / 2, id);
    }
  };
  exits.forEach((x, n) => {
    const FLY = CONFIG.ramps.flyoverLength;
    pavedRoad(0, Math.max(Track.start, (x.flyovers ? x.landingAt : x.exitAt - ZONE) - 150), Math.min(Track.end, (x.flyovers ? x.flyoverAt : x.mergeAt + ZONE) + 150), Track.lo, Track.hi);
    pavedRoad(1 + 3 * n, x.side0, x.sideEnd, Track.lo, Track.hi);
    if (x.flyovers) [x.flyA0, x.flyB0].forEach((from, k) => pavedRoad(2 + 3 * n + k, from, from + FLY, () => -LW / 2 - 0.5, () => LW / 2 + 0.5));
  });
  // (a crossroads' arms: roads 900 on, two to a junction. Until 2026-10-10 they were not here at all, and on a level
  // with no exits nothing was: houses, lawns, trees, fences and pavements stood on the cross road, over its lines)
  Track.junctions.forEach((jn, j) => jn.arms.forEach((arm, k) => {
    for (let d = jn.half; d <= arm.length; d += 2) {
      const x = jn.centre.x + arm.dir.x * d, z = jn.centre.z + arm.dir.z * d;
      const key = Math.floor(x / SQUARE) * 100003 + Math.floor(z / SQUARE);
      if (!squares.has(key)) squares.set(key, []);
      squares.get(key).push(paved.length);
      paved.push(x, z, jn.half, 900 + 2 * j + k);
    }
  }));
  // which road s is on
  const roadOf = (s) => {
    if (Track.isMain(s)) return 0;
    const n = exits.findIndex(x => s >= x.side0 - 1 && s < x.side0 + 30000 - 2000);
    return n < 0 ? 0 : 1 + 3 * n + (s < exits[n].flyA0 - 1 ? 0 : s < exits[n].flyB0 - 1 ? 1 : 2);
  };
  // m from a world point to the nearest pavement of any road but `own` (Infinity: none within `reach` m or so)
  const roadGap = (x, z, own = 0, reach = 0) => {
    let best = Infinity;
    const n = Math.ceil((reach + 24) / SQUARE), cx = Math.floor(x / SQUARE), cz = Math.floor(z / SQUARE);
    for (let i = cx - n; i <= cx + n; i++) {
      for (let j = cz - n; j <= cz + n; j++) {
        const list = squares.get(i * 100003 + j);
        if (!list) continue;
        for (const k of list) if (paved[k + 3] !== own) best = Math.min(best, Math.hypot(x - paved[k], z - paved[k + 1]) - paved[k + 2]);
      }
    }
    return best;
  };
  // is a world point clear of every road but `own` (the one it stands beside: the expressway, if not said), by
  // `margin` m (half the width of whatever stands there, say) and a verge (CONFIG.ramps.clear)?
  const offRoads = (x, z, margin = 0, own = 0) => !paved.length || roadGap(x, z, own, margin + VERGE) > margin + VERGE;
  // the same of a thing `across` m wide and `along` m long standing at (s, lat) on a road: every part of it
  const spot = {};
  const standsClear = (s, lat, across, along, pad = 0) => {
    if (!paved.length) return true;
    const own = roadOf(s), r = Math.hypot(across, along) / 2;
    Track.toWorld(s, lat, spot);
    const gap = roadGap(spot.x, spot.z, own, r + pad + VERGE);
    if (gap > r + pad + VERGE) return true;                 // (nowhere near)
    if (gap <= pad + VERGE || r < 1.5) return gap > Math.min(across, along) / 2 + pad + VERGE; // (its middle is on one; or it is small)
    const nx = Math.ceil(across / 3), nz = Math.ceil(along / 3); // (a big thing: looked at every 3 m or less across it)
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        Track.toWorld(s + (j / nz - 0.5) * along, lat + (i / nx - 0.5) * across, spot);
        if (!offRoads(spot.x, spot.z, pad, own)) return false;
      }
    }
    return true;
  };
  // a strip beside a road (as buildStrip: ground cover, a pavement, a rail), stopping short of any other road:
  // each row of it runs out from its edge nearer the road only as far as it is clear, and where that edge
  // itself is on another road the strip breaks off
  // (whole: no part rows. A pavement is its full width or not there: a sliver of one in the wedge between two roads is no
  // pavement. As a number: and only where that many m beyond it are clear too, so that two roads' pavements, in the
  // wedge where the roads part, both begin where there is room for the two of them and grass between)
  const sideStrip = (sFrom, sTo, latA, latB, y, step = 4, whole = false) => {
    if (!paved.length) return buildStrip(sFrom, sTo, latA, latB, y, step);
    const fa = typeof latA === 'function' ? latA : () => latA, fb = typeof latB === 'function' ? latB : () => latB;
    const pos = [], idx = [], own = roadOf(sFrom);
    let n = 0, joined = false;
    step = Math.min(step, 2);
    for (let k = 0; ; k++) {
      const s = Math.min(sFrom + k * step, sTo);
      let a = fa(s), b = fb(s);
      const swap = Math.abs(a) > Math.abs(b); // (a: the edge nearer the road)
      if (swap) [a, b] = [b, a];
      Track.toWorld(s, (a + b) / 2, spot);
      const width = Math.abs(b - a);
      const beyond = typeof whole === 'number' ? whole : 0;
      let reach = width + beyond;
      if (roadGap(spot.x, spot.z, own, width / 2 + beyond + VERGE) <= width / 2 + beyond + VERGE) {
        reach = -1;
        for (let d = 0; d <= width + beyond; d += Math.min(1, width || 1)) {
          Track.toWorld(s, a + Math.sign(b - a) * d, spot);
          if (!offRoads(spot.x, spot.z, 0, own)) break;
          reach = d;
          if (!width) break;
        }
      }
      if (whole && reach < width + beyond - 0.01) reach = -1;
      reach = Math.min(reach, width);
      if (reach < Math.min(width, 0.2) && width) joined = false;
      else if (reach < 0) joined = false;
      else {
        const far = a + Math.sign(b - a) * reach;
        for (const lat of swap ? [far, a] : [a, far]) { Track.toWorld(s, lat, spot); pos.push(spot.x, spot.y + y, spot.z); }
        if (joined) { const q = (n - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
        joined = true;
        n++;
      }
      if (s >= sTo) break;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    return geo;
  };
  // a big thing out in the scenery (a mountain): from (cx, cz) out along the way (dx, dz), the first spot
  // `far` m or more out where nothing of it (`r` m round) comes within `margin` m of any road, main or side:
  // so no road ever runs into one, however the level winds (see the alpine peaks)
  const clearOfRoads = (cx, cz, dx, dz, far, r, margin) => {
    const half = Math.max(...[0, Track.length / 2, Track.length].map(s => Math.max(Track.hi(s), -Track.lo(s))));
    for (let k = 0; k < 200; k++, far += 25) {
      const x = cx + dx * far, z = cz + dz * far;
      if (Track.mainDistance(x, z) > r + half + margin && offRoads(x, z, r + margin)) return { x, z };
    }
    return { x: cx + dx * far, z: cz + dz * far };
  };
  // painted markings lie a couple of centimetres above the road; this keeps them on top of it
  for (const mat of [lineMat, centreMat]) {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
  }
  // a junction's box has no lines through it, like a real one: the road's markings stop at its
  // edges (its crossings and stop lines are render/junctions.js's)
  // (nor anywhere on a runway, which has markings of its own: see the airport's scenery)
  const inJunction = (s) => Track.junctions.some(jn => s > jn.s - 1 && s < jn.end + 1) || (!!LEVEL.runway && s > LEVEL.runway.from - 1) ||
    Track.muddy(s); // (nor in mud)
  const unmarked = (a, b) => { // the pieces of a..b to be marked: outside every junction (and runway, and mud)
    const pieces = [];
    let from = null;
    for (let s = a; ; s = Math.min(b, s + 1)) {
      const marked = !inJunction(s);
      if (marked && from === null) from = s;
      if ((!marked || s >= b) && from !== null) {
        if (s - from > 0.5) pieces.push([from, s]);
        from = null;
      }
      if (s >= b) break;
    }
    return pieces;
  };
  const dashOutside = (s) => !inJunction(s) && !inJunction(s + CONFIG.dashLength);
  const line = (a, b, lat, mat = lineMat) => {
    for (const [p, q] of unmarked(a, b)) add(buildStrip(p, q, (s) => lat(s) - 0.1, (s) => lat(s) + 0.1, 0.02), mat);
  };

  // ---- expressway -------------------------------------------------------------------
  // (where the two ways part, a level's "splits", each is a road of its own: so the two sides are paved apart)
  const HALF = Track.medianHalf;
  if ((LEVEL.splits || []).length) {
    pave(buildStrip(Track.start, Track.end, Track.lo, -HALF - 0.01, 0));
    pave(buildStrip(Track.start, Track.end, -HALF, Track.hi, 0));
  } else pave(buildStrip(Track.start, Track.end, Track.lo, Track.hi, 0));
  line(Track.start, Track.end, Track.laneLo);
  // right edge line: solid, along the outside of the exit / merge lane where there is one. A fork is marked
  // as a real diverge is, and a merge as its mirror image (see CONFIG.ramps):
  //   - the exit lane opens in a taper, the edge line going out round it and on down the side road's right
  //   - a lane-drop line, short dashes close together, divides it from the through lane, up to the nose
  //   - at the nose the two roads part: the expressway's own edge line begins there and runs on to the merge,
  //     and the side road's left edge line begins there too (see each exit, below). The two solid lines meet
  //     at that point, and the wedge of pavement between them, as far as the grass, is hatched with chevrons,
  //     each pointing at the nose's tip (at a fork: against the traffic)
  {
    const R = CONFIG.ramps, way = {};
    // the nose at a fork (toward: 1, the roads parting from `at` on the expressway and `side` on the side road) or
    // a merge (toward: -1, coming together there). q: m from its tip; gap(q): m between the two solid lines there
    const nose = (at, side, toward) => {
      const gaps = [];
      for (let q = 0; q <= R.nose.reach; q += 2) {
        Track.toWorld(side + toward * q, Track.laneLo(side + toward * q), way);
        const m = Track.fromWorld(way.x, way.z, at + toward * q, 30);
        gaps.push(Math.max(0, m.lat - Track.edge(m.s)));
      }
      const gap = (q) => { const f = Math.max(0, Math.min(gaps.length - 1.001, q / 2)), i = Math.floor(f); return gaps[i] + (gaps[i + 1] - gaps[i]) * (f - i); };
      const pos = [], idx = [];
      const corner = (q, lat) => { const s = at + toward * q; Track.toWorld(s, Track.edge(s) + lat, way); pos.push(way.x, way.y + 0.02, way.z); };
      for (let q = 0; q < R.nose.reach; q += 0.5) { // (the first chevron: where the wedge is wide enough for one)
        if (gap(q) < R.nose.from) continue;
        for (; q < R.nose.reach; q += R.nose.every) {
          const back = R.nose.sweep * gap(q) / 2; // (how far its arms sweep back from its point)
          if (gap(q + back + R.nose.thick) > Track.shoulder + 0.3) break; // (the grass begins)
          for (const arm of [0, 1]) { // (towards the expressway's line, then the side road's)
            const n = pos.length / 3;
            for (const d of [0, R.nose.thick]) {
              corner(q + d, gap(q + d) / 2);
              corner(q + back + d, arm ? gap(q + back + d) - R.nose.inset : R.nose.inset);
            }
            idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
          }
        }
        break;
      }
      if (!pos.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      add(geo, lineMat);
    };
    let from = Track.start;
    for (const x of [...exits].sort((a, b) => a.exitAt - b.exitAt)) {
      line(from, x.exitAt, Track.laneHi);
      line(x.exitAt, x.mergeAt, Track.edge);
      const open = (s) => Track.extraLane(s) > R.dropLine.from;
      add(buildDashes(x.exitAt - ZONE, x.exitAt - R.dropLine.length, Track.edge, open, R.dropLine), lineMat);
      add(buildDashes(x.mergeAt + R.dropLine.spacing - R.dropLine.length, x.mergeAt + ZONE, Track.edge, open, R.dropLine), lineMat);
      nose(x.exitAt, x.side0, 1);
      nose(x.mergeAt, x.sideEnd, -1);
      from = x.mergeAt;
    }
    line(from, Track.end, Track.laneHi);
  }
  // double yellow centre line (a one-way road has an ordinary lane divider there instead, and
  // a road with a median a solid line along each side of it)
  const twoWay = Track.flow === 'both', HM = Track.medianHalf;
  if (!twoWay && Track.leftLanes && Track.rightLanes) add(buildDashes(Track.start, Track.end, () => 0, dashOutside), lineMat);
  for (const side of [-1, 1]) {
    if (twoWay && !HM) for (const [p, q] of unmarked(Track.start, Track.end)) add(buildStrip(p, q, side * 0.12, side * 0.28, 0.02), centreMat);
    if (HM) line(Track.start, Track.end, () => side * HM - (side < 0 ? 0.11 : 0)); // (wholly on its own side of a split)
    // dashed dividers between the lanes of each side, only where both lanes exist
    for (let k = 1; k < (side < 0 ? Track.leftLanes : Track.rightLanes); k++) {
      add(buildDashes(Track.start, Track.end, () => side * (HM + k * LW),
        (s) => Track.lanesOn(side, s) >= k + 0.95 && dashOutside(s)), lineMat);
    }
  }
  // a dirt road has no markings at all: only a pair of ruts worn along each lane (merging where
  // the lane does)
  if (theme.unmarked) {
    lineMat.visible = centreMat.visible = false;
  }
  if (theme.unmarked && !theme.water) {
    const rut = flat(new THREE.Color(theme.road).multiplyScalar(0.8).getHex());
    for (const x of exits) { // (each side road's lanes: as many as it ever has, each where it is open)
      for (let lane = 0; lane < Math.max(2, ...x.lanes.map(l => l.count)); lane++) {
        for (const side of [-1, 1]) {
          const at = (s) => Track.laneOffset(Track.openLane(lane, s), s) + side * 0.85;
          add(buildStrip(x.side0, x.sideEnd, (s) => at(s) - 0.22, (s) => at(s) + 0.22, 0.015), rut);
        }
      }
    }
    for (let lane = 0; lane < Track.laneCount; lane++) {
      for (const side of [-1, 1]) {
        const at = (s) => Track.laneOffset(Track.openLane(lane, s), s) + side * 0.85;
        add(buildStrip(Track.start, Track.end, (s) => at(s) - 0.22, (s) => at(s) + 0.22, 0.01), rut);
      }
    }
  }
  // the median: a strip of its own colour between those lines and, on a level with a railway, a
  // track down the middle of it: sleepers on ballast, and two rails
  if (HM) {
    add(buildStrip(Track.start, Track.end, -HM + 0.1, HM - 0.1, 0.01), flat(theme.median || 0x6f8f4a));
    if (LEVEL.railway) {
      const GAUGE = 1.435;
      const BED = CONFIG.railCrossing.width / 2;
      add(buildStrip(Track.start, Track.end, -BED, BED, 0.03), flat(0x8b8378));
      const sleeper = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.12, 0.26), new THREE.MeshLambertMaterial({ color: 0x5e4b3a }),
        Math.ceil((Track.end - Track.start) / 0.7));
      const spot = new THREE.Object3D();
      let n = 0;
      for (let s = Track.start; s < Track.end; s += 0.7, n++) {
        spot.rotation.y = Track.toWorld(s, 0, tmp);
        spot.position.set(tmp.x, tmp.y + 0.08, tmp.z);
        spot.updateMatrix();
        sleeper.setMatrixAt(n, spot.matrix);
      }
      sleeper.count = n;
      levelGroup.add(sleeper);
      for (const side of [-1, 1]) {
        add(buildStrip(Track.start, Track.end, side * GAUGE / 2 - 0.04, side * GAUGE / 2 + 0.04, 0.2), flat(0xb8bcc4));
      }
    }
  }
  // gravel traps (a level's "gravel": see Track.gravelBand): a bed of pale, sand-coloured gravel on the shoulder
  // and run-off, a darker lip along each edge of it so that it reads against the asphalt and the grass, and
  // rake lines along it
  for (const g of Track.gravels) {
    const at = (s, k) => { // (its near edge, k 0, to its far one, k 1; no width where there is no room for it)
      const band = Track.gravelBand(g, s), d = band ? band[0] + (band[1] - band[0]) * k : (g.inner ?? CONFIG.gravel.inner);
      return g.sign < 0 ? Track.laneLo(s) - d : Track.laneHi(s) + d;
    };
    const mat = (color, offset) => { const m = flat(color); m.polygonOffset = true; m.polygonOffsetFactor = m.polygonOffsetUnits = offset; return m; };
    add(buildStrip(g.from, g.to, (s) => at(s, 0), (s) => at(s, 1), 0.012, 2), mat(0xd9c48f, -2));
    for (const k of [0.2, 0.4, 0.6, 0.8]) add(buildStrip(g.from, g.to, (s) => at(s, k) - 0.06, (s) => at(s, k) + 0.06, 0.014, 2), mat(0xcbb47d, -3));
    for (const k of [0, 1]) add(buildStrip(g.from, g.to, (s) => at(s, k) - (Track.gravelBand(g, s) ? 0.18 : 0), (s) => at(s, k) + (Track.gravelBand(g, s) ? 0.18 : 0), 0.016, 2), mat(0x9c8757, -4));
  }
  // mud: where the road gives way to it, a sheet of churned brown right across, its ruts and puddles
  // darker, and a ragged edge where the road begins again
  for (const m of LEVEL.mud || []) {
    const soft = theme.soft || {}; // (a theme whose soft ground is not earth: the thaw's slush)
    const mudMat = flat(soft.mud ?? 0x5e4630);
    mudMat.polygonOffset = true;
    mudMat.polygonOffsetFactor = -1;
    mudMat.polygonOffsetUnits = -1;
    add(buildStrip(m.from, m.to, (s) => Track.lo(s) - 2, (s) => Track.hi(s) + 2, 0.006, 3), mudMat);
    const rut = flat(soft.track ?? 0x4a3622);
    rut.polygonOffset = true;
    rut.polygonOffsetFactor = -2;
    rut.polygonOffsetUnits = -2;
    for (let lane = 0; lane < Track.laneCount; lane++) {
      for (const side of [-1, 1]) {
        const at = (s) => Track.laneOffset(lane, s) + side * 0.85 + 0.15 * Math.sin(s * 0.13 + lane);
        add(buildStrip(m.from, m.to, (s) => at(s) - 0.25, (s) => at(s) + 0.25, 0.012, 3), rut);
      }
    }
    const puddle = flat(soft.puddle ?? 0x6b6a55);
    puddle.polygonOffset = true;
    puddle.polygonOffsetFactor = -2;
    puddle.polygonOffsetUnits = -2;
    for (let s = m.from + 8; s < m.to - 8; s += 14 + Math.random() * 20) {
      const lat = Track.lo(s) + Math.random() * (Track.hi(s) - Track.lo(s)), w = 1 + Math.random() * 2, l = 2 + Math.random() * 4;
      add(buildStrip(s, s + l, lat - w, lat + w, 0.014, 1), puddle);
    }
  }
  // ice patches: a pale, glassy sheet over the lane (or the whole road), with brighter streaks on it
  if (LEVEL.ice) {
    const sheet = new THREE.MeshBasicMaterial({ color: 0xd6eef8, transparent: true, opacity: 0.72, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    for (const p of LEVEL.ice) {
      const a = (s) => p.lane === undefined ? Track.laneLo(s) : Track.laneOffset(p.lane, s) - LW / 2 + 0.15;
      const b = (s) => p.lane === undefined ? Track.laneHi(s) : Track.laneOffset(p.lane, s) + LW / 2 - 0.15;
      add(buildStrip(p.from, p.to, a, b, 0.025, 2), sheet);
      for (let k = 0; k < 3; k++) { // (streaks, staggered along it)
        const from = p.from + (p.to - p.from) * (0.1 + k * 0.27), to = from + (p.to - p.from) * 0.18, at = 0.25 + k * 0.25;
        const lat = (s) => a(s) + (b(s) - a(s)) * at;
        add(buildStrip(from, to, (s) => lat(s) - 0.12, (s) => lat(s) + 0.12, 0.03, 2), shine);
      }
    }
  }
  // start and finish lines
  add(buildStrip(-1, 0, Track.lo, Track.hi, 0.03, 1), lineMat);
  add(buildStrip(Track.length, Track.length + 2, Track.lo, Track.hi, 0.03, 1), flat(0xffd23f));

  // ---- each exit: side road, flyovers, sign ---------------------------------------------
  const deck = flat(0x8d9096);
  const steel = new THREE.MeshLambertMaterial({ color: 0x9a9da3 });
  const pillars = [];
  for (const x of exits) {
    // side road: its lanes (see its exit's "lanes"), dashes between them where both are there; and between
    // lanes 0 and 1, from where lane 0 turns oncoming, a double yellow line
    pave(buildStrip(x.side0, x.sideEnd, Track.lo, Track.hi, 0.005));
    line(x.side0, x.sideEnd, Track.laneLo);
    line(x.side0, x.sideEnd, Track.laneHi);
    const both = (k) => (s) => k ? Track.sideWidth(s) > k + 1.6 : Track.sideLeft(s) > 0.6; // (lanes k and k + 1)
    const yellowFrom = x.side0 + Math.max(RAMP, x.oncomingFrom);
    if (x.oncoming) for (const side of [-1, 1]) add(buildStrip(yellowFrom, x.sideEnd - RAMP, side * 0.12, side * 0.28, 0.02), centreMat);
    add(buildDashes(x.side0 + RAMP, Math.min(yellowFrom, x.sideEnd - RAMP), () => 0, both(0)), lineMat);
    for (let k = 1; k < Math.max(...x.lanes.map(l => l.count)) - 1; k++) add(buildDashes(x.side0 + RAMP, x.sideEnd - RAMP, () => k * LW, both(k)), lineMat);

    // flyovers: raised decks with kerbs, so they read as structures
    // (they carry the oncoming traffic, at an exit that has them: its "flyovers")
    for (const from of x.flyovers ? [x.flyA0, x.flyB0] : []) {
      const to = from + CONFIG.ramps.flyoverLength;
      add(buildStrip(from, to, -LW / 2 - 0.4, LW / 2 + 0.4, 0.03, 3), deck);
      for (const side of [-1, 1]) {
        add(buildStrip(from, to, side * (LW / 2 + 0.15), side * (LW / 2 + 0.4), 0.5, 3), lineMat);
      }
      for (let s = from; s < to; s += 18) if (Track.flyPillar(s)) pillars.push(s);
    }

    // exit sign on a post beside the right shoulder, where the exit lane begins
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1b7a3a';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Track.mirrored ? '↖  EXIT' : 'EXIT  ↗', 256, 78); // (the exit is on the left of a left-hand level)
    ctx.font = 'bold 34px sans-serif';
    const saved = Math.round(x.span - x.length);
    ctx.fillText('side road  ' + (saved >= 0 ? saved + ' m shorter' : -saved + ' m longer'), 256, 128);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const sAt = x.exitAt - ZONE;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map }));
    sign.rotation.y = Track.toWorld(sAt, Track.hi(sAt) - 3, tmp) + Math.PI; // faces oncoming drivers
    sign.scale.x = Track.mirrored ? -1 : 1; // (mirrored back on a left-hand level, so it still reads)
    sign.position.set(tmp.x, tmp.y + 8, tmp.z);
    levelGroup.add(sign);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), steel);
    Track.toWorld(sAt, Track.hi(sAt) + 1.5, tmp);
    post.position.set(tmp.x, tmp.y + 4, tmp.z);
    levelGroup.add(post);
  }
  const dummy = new THREE.Object3D();
  if (pillars.length) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, pillars.length);
    pillars.forEach((s, i) => {
      dummy.rotation.y = Track.toWorld(s, 0, tmp);
      const tall = Track.flyHeight(s); // (from the land under it, which on a hill is not at 0)
      dummy.position.set(tmp.x, tmp.y - tall / 2, tmp.z);
      dummy.scale.set(1.2, tall, 1.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(mesh);
  }

  // ---- ground and finish gate -----------------------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), flat(theme.ground || 0));
  ground.visible = theme.ground !== null; // (space has none)
  ground.rotation.x = -Math.PI / 2;
  // The ground is drawn first and leaves no mark in the depth buffer, so everything else
  // simply draws over it. (A road a few centimetres above a plane this size is too fine a
  // gap to leave to depth testing: on some devices the grass showed through the road.)
  ground.renderOrder = -2;
  ground.material.depthWrite = false;
  groundMesh = ground;
  Track.toWorld(Track.length / 2, 0, tmp);
  ground.position.set(tmp.x, -(theme.elevated || 0) - 0.05, tmp.z); // (an elevated road: the ground far below it)
  levelGroup.add(ground);

  const terrainAt = theme.terrain ? buildTerrain(theme.terrain === true ? null : theme.terrain, others) : null; // (the height of the land at a world point)
  landAt = terrainAt;
  if (Track.hilly && theme.ground !== null && !theme.terrain) {
    // Hills: the land beside the road rises and falls with it. It is a wide ribbon of grass
    // just under the road, with a skirt sloping down to the flat ground along each edge.
    // It writes depth (pushed back a little, so the road always wins) so that a crest hides
    // what lies beyond it.
    const LAND = 130;
    // (a level in zones has its land in each zone's own colour; and where a zone is by the sea
    // (zone.sea: m from the road to the water), none out over the sea on that side, the right)
    const zones = zonesOf() && zonesOf().length ? zonesOf() : null;
    // (and none under a bridge, where there is the water to see, far below)
    const stretches = offBridges(zones ? zones.map((z, i) => [i ? z.from : Track.start, i === zones.length - 1 ? Track.end : zones[i + 1].from, z.ground ?? theme.ground, z.sea])
      : [[Track.start, Track.end, theme.ground, undefined]]);
    // A side road has land of its own, at its own height (below): the expressway's stops short of it, and meets
    // it at its height. So no land ever lies in the plane of a side road's pavement, or comes up through it
    // (which it did, flickering, wherever the side road was a few centimetres off the expressway's height).
    // sides: every side road, as points along its middle: x, z, half its width, its height
    const sides = [], ray = {};
    for (const x of exits) {
      for (let s = x.side0; s <= x.sideEnd; s += 3) {
        Track.toWorld(s, (Track.lo(s) + Track.hi(s)) / 2, ray);
        sides.push(ray.x, ray.z, (Track.hi(s) - Track.lo(s)) / 2, ray.y);
      }
    }
    // the right-hand edge of the expressway's land at s: [m out from the pavement, its height or null (the road's)]
    const edges = new Map();
    const landEdge = (s, sea) => {
      if (edges.has(s)) return edges.get(s);
      let edge = [sea ?? LAND, null];
      if (exits.some(x => s >= x.exitAt && s <= x.mergeAt)) { // (only where there is a side road beside it)
        search: for (let d = 0; d < edge[0]; d += 2) {
          Track.toWorld(s, within(s, Track.hi(s) + d), ray);
          for (let k = 0; k < sides.length; k += 4) {
            if (Math.hypot(ray.x - sides[k], ray.z - sides[k + 1]) < sides[k + 2] + 2.5) { edge = [d, sides[k + 3]]; break search; }
          }
        }
      }
      edges.set(s, edge);
      return edge;
    };
    // the rows of a stretch of land: one every 6 m, and one just before each fork and just after each merge, so
    // the land goes right up to where a side road's own begins
    const rowsOf = (from, to) => {
      const rows = [];
      for (let s = from; s < to; s += 6) rows.push(s);
      rows.push(to);
      for (const x of exits) rows.push(...[x.exitAt - 0.01, x.exitAt, x.mergeAt, x.mergeAt + 0.01].filter(s => s > from && s < to));
      return rows.sort((a, b) => a - b);
    };
    const landMesh = (pos, idx, colour) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      const land = new THREE.Mesh(geo, flat(colour));
      land.material.polygonOffset = true;
      land.material.polygonOffsetFactor = 2;
      land.material.polygonOffsetUnits = 2;
      land.renderOrder = -1.5;
      levelGroup.add(land);
    };
    for (const [from, to, colour, sea] of stretches) {
      const pos = [], idx = [];
      rowsOf(from, to).forEach((s, n) => {
        const [out, y] = landEdge(s, sea);
        // (level right across the road, from the far edge of the land on the left to the pavement's on the right)
        Track.toWorld(s, within(s, Track.lo(s) - LAND), tmp);
        pos.push(tmp.x, tmp.y - 0.04, tmp.z);
        Track.toWorld(s, Track.hi(s), tmp);
        pos.push(tmp.x, tmp.y - 0.04, tmp.z);
        Track.toWorld(s, within(s, Track.hi(s) + out), tmp);
        pos.push(tmp.x, y === null ? tmp.y - 0.04 : y - 0.2, tmp.z); // (meeting a side road: just under its own land)
        if (n > 0) { const a = (n - 1) * 3; idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4); }
      });
      landMesh(pos, idx, colour);
    }
    // each side road's own land: a narrow verge on its left, where the expressway's land comes to meet it, and on
    // its right land as wide as the expressway's (short of the expressway itself, should it turn that way), with
    // a bank down to the ground along both
    for (const x of exits) {
      const R = CONFIG.ramps, zone = Track.zoneAt(x.exitAt), colour = zone && zone.ground !== undefined ? zone.ground : theme.ground;
      const mainHalf = Math.max(Track.hi(x.exitAt), -Track.lo(x.exitAt)) + 4;
      const rows = [];
      for (let s = x.side0; ; s = Math.min(x.sideEnd, s + 4)) {
        let out = 0;
        for (; out < R.land; out += 3) {
          Track.toWorld(s, within(s, Track.hi(s) + out + 3), ray);
          if (Track.mainDistance(ray.x, ray.z) < mainHalf) break;
        }
        rows.push([s, within(s, Track.lo(s) - R.verge), within(s, Track.hi(s) + out)]);
        if (s >= x.sideEnd) break;
      }
      // (its far edge evened out along the road: how far out it may go changes in steps from bend to bend)
      const far = rows.map(r => r[2] - Track.hi(r[0]));
      rows.forEach((r, n) => {
        let least = Infinity, sum = 0, count = 0;
        for (let k = Math.max(0, n - 10); k <= Math.min(rows.length - 1, n + 10); k++) { least = Math.min(least, far[k]); sum += far[k]; count++; }
        r[2] = Track.hi(r[0]) + Math.min(far[n], (least + sum / count) / 2);
      });
      const pos = [], idx = [];
      rows.forEach(([s, a, b], n) => {
        Track.toWorld(s, a, tmp); pos.push(tmp.x, tmp.y - 0.04, tmp.z);
        Track.toWorld(s, b, tmp); pos.push(tmp.x, tmp.y - 0.04, tmp.z);
        if (n > 0) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      });
      landMesh(pos, idx, colour);
      for (const side of [-1, 1]) {
        const bank = [], at = [];
        rows.forEach(([s, a, b], n) => {
          const top = side < 0 ? a : b;
          Track.toWorld(s, top, tmp);
          bank.push(tmp.x, tmp.y - 0.04, tmp.z);
          Track.toWorld(s, within(s, top + side * (2 + tmp.y * 2.5)), tmp);
          bank.push(tmp.x, -0.04, tmp.z);
          if (n > 0) { const k = (n - 1) * 2; at.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(bank, 3));
        geo.setIndex(at);
        levelGroup.add(new THREE.Mesh(geo, flat(new THREE.Color(colour).multiplyScalar(0.8))));
      }
    }
    for (const [from, to, colour, sea] of stretches) for (const side of [-1, 1]) {
      const bank = flat(new THREE.Color(colour).multiplyScalar(0.8));
      const out = side > 0 && sea !== undefined ? sea : LAND; // (by the sea, a short drop to the water's edge)
      const pos = [], idx = [];
      let n = 0;
      let met = true; // (no bank where the land meets a side road's)
      for (const s of rowsOf(from, to)) {
        const before = met;
        met = side > 0 && landEdge(s, sea)[1] !== null;
        const top = within(s, (side < 0 ? Track.lo(s) : Track.hi(s)) + side * (met ? landEdge(s, sea)[0] : out));
        Track.toWorld(s, top, tmp);
        const drop = tmp.y; // the further it has to fall, the further out the foot of the slope
        pos.push(tmp.x, tmp.y - 0.04, tmp.z);
        Track.toWorld(s, within(s, top + side * (out === LAND ? 2 + drop * 2.5 : 1 + drop * 0.6)), tmp);
        pos.push(tmp.x, -0.04, tmp.z);
        if (n > 0 && !met && !before) {
          const a = (n - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
        n++;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      levelGroup.add(new THREE.Mesh(geo, bank));
    }
    // (a lit theme's land and banks need to know which way they face, as `add` sees to for the strips: without, they are black)
    if (theme.lit) levelGroup.traverse((o) => { if (o.isMesh && o.geometry.attributes.position && !o.geometry.attributes.normal) o.geometry.computeVertexNormals(); });
    // where the land stops at each end of a bridge, an embankment down to the water, right across
    // the land and its banks, so that it never ends in the air
    for (const b of LEVEL.bridges || []) {
      for (const [at, toward] of [[b.from + 4, 1], [b.to - 4, -1]]) {
        Track.toWorld(at, 0, tmp);
        const drop = tmp.y;
        if (drop < 1) continue;
        const zone = Track.zoneAt(at), sea = zone ? zone.sea : undefined, right = sea ?? LAND;
        const bank = flat(new THREE.Color(zone && zone.ground !== undefined ? zone.ground : theme.ground).multiplyScalar(0.8));
        const lo = Track.lo(at) - LAND - 2 - drop * 2.5, hi = Track.hi(at) + right + (sea === undefined ? 2 + drop * 2.5 : 1 + drop * 0.6);
        const pos = [], idx = [];
        let n = 0;
        for (let lat = lo; lat <= hi + 0.001; lat += 10, n++) {
          const l = Math.min(lat, hi);
          Track.toWorld(at, l, tmp);
          pos.push(tmp.x, tmp.y - 0.04, tmp.z);
          Track.toWorld(at + toward * (2 + drop * 1.2), l, tmp);
          pos.push(tmp.x, -0.04, tmp.z);
          if (n) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        levelGroup.add(new THREE.Mesh(geo, bank));
      }
    }
  }

  const hw = Track.hi(Track.length);
  const gateMat = new THREE.MeshLambertMaterial({ color: 0xffd23f });
  const gate = new THREE.Group();
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 0.6), gateMat);
    post.position.set(side * (hw + 0.5), 3.5, 0);
    gate.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 1.6, 1.2, 0.6), gateMat);
  bar.position.y = 7;
  gate.add(bar);
  gate.rotation.y = Track.toWorld(Track.length, 0, tmp);
  gate.position.copy(tmp);
  levelGroup.add(gate);

  const beside = (side, s, d) => side < 0 ? Track.lo(s) - d : Track.hi(s) + d; // d metres off the pavement
  // one draw call per kind of thing. list entries: [s, lat, y, sx, sy, sz]
  // (an entry with a 7th, [s1, lat1], is a run of wall or the like from (s, lat) to there: placed
  // between the two in the world, turned along the line from one to the other and as long as it,
  // so it follows an edge that swings out from the road, a run-off's, and meets the next one)
  const placeEntry = ([s, lat, y, sx, sy, sz, to]) => {
    if (to) {
      const a = {}, b = {};
      Track.toWorld(s, lat, a);
      Track.toWorld(to[0], to[1], b);
      // (from one point to the other: turned to it, and tipped up or down to it, so that on a hill
      // the pieces run on from one to the next, not in steps)
      const run = Math.hypot(b.x - a.x, b.z - a.z);
      dummy.rotation.order = 'YXZ';
      dummy.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      dummy.rotation.x = -Math.atan2(b.y - a.y, run);
      dummy.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + y, (a.z + b.z) / 2);
      dummy.scale.set(sx, sy, Math.hypot(run, b.y - a.y) + 0.02);
      dummy.updateMatrix();
      dummy.rotation.x = 0; // (nothing else placed with it is tipped)
      return;
    } else {
      dummy.rotation.y = Track.toWorld(s, lat, tmp);
      dummy.position.set(tmp.x, tmp.y + y, tmp.z);
      dummy.scale.set(sx, sy, sz);
    }
    dummy.updateMatrix();
  };
  // (every kind is kept until the whole level's scenery has been said, then gone through together: see
  // placeInstances. pad: m more than the verge to keep that kind clear of another road)
  const pending = [];
  const instances = (geometry, color, list, glowing, pad = 0) => {
    if (list.length) pending.push({ geometry, color, list: list.slice(), glowing, pad });
  };
  // is an entry clear of every other road? Its footprint from its geometry and its scale (a run of wall or
  // rail: at both ends and the middle). Returns [x, z, m round it, clear]
  const sizes = new Map();
  const entryAt = (geometry, [s, lat, , sx, , sz, to], pad) => {
    if (!sizes.has(geometry)) {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const b = geometry.boundingBox;
      sizes.set(geometry, [Math.max(-b.min.x, b.max.x) * 2, Math.max(-b.min.z, b.max.z) * 2]);
    }
    const [gx, gz] = sizes.get(geometry), across = gx * Math.abs(sx);
    if (to) {
      const a = {}, b = {};
      let clear = true;
      for (const f of [0, 0.5, 1]) clear = standsClear(s + (to[0] - s) * f, lat + (to[1] - lat) * f, across, across, pad) && clear;
      Track.toWorld(s, lat, a);
      Track.toWorld(to[0], to[1], b);
      return [(a.x + b.x) / 2, (a.z + b.z) / 2, Math.hypot(b.x - a.x, b.z - a.z) / 2, clear];
    }
    const along = gz * Math.abs(sz), clear = standsClear(s, lat, across, along, pad);
    Track.toWorld(s, lat, tmp);
    return [tmp.x, tmp.z, Math.max(across, along) / 2, clear];
  };
  // Not what would stand on another road, where a side road or a flyover leaves the expressway or comes back to
  // it, or runs close by: whatever the theme, its fences, walls, posts, trees and buildings break off there. And
  // what stands with something that does goes with it (a tree's crown with its trunk, a roof with its walls, a
  // lamp with its post): anything whose middle is within the other's footprint
  const placeInstances = () => {
    if (paved.length) {
      const NEAR = 12, gone = new Map(); // (those that went, by 12 m square)
      for (const job of pending) {
        job.at = job.list.map(entry => entryAt(job.geometry, entry, job.pad));
        for (const [x, z, r, clear] of job.at) {
          if (clear) continue;
          const key = Math.floor(x / NEAR) * 100003 + Math.floor(z / NEAR);
          if (!gone.has(key)) gone.set(key, []);
          gone.get(key).push(x, z, r);
        }
      }
      const withOne = (x, z, r) => {
        const n = Math.ceil((r + 20) / NEAR), cx = Math.floor(x / NEAR), cz = Math.floor(z / NEAR);
        for (let i = cx - n; i <= cx + n; i++) {
          for (let j = cz - n; j <= cz + n; j++) {
            const list = gone.get(i * 100003 + j);
            if (!list) continue;
            for (let k = 0; k < list.length; k += 3) if (Math.hypot(x - list[k], z - list[k + 1]) < Math.min(20, Math.max(r, list[k + 2])) + 0.3) return true;
          }
        }
        return false;
      };
      if (gone.size) for (const job of pending) job.list = job.list.filter((_, i) => job.at[i][3] && !withOne(job.at[i][0], job.at[i][1], job.at[i][2]));
    }
    for (const { geometry, color, list, glowing } of pending) {
      if (!list.length) continue;
      const material = glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach((entry, i) => {
        placeEntry(entry);
        mesh.setMatrixAt(i, dummy.matrix);
      });
      levelGroup.add(mesh);
    }
  };
  // and the last look over the level: whatever a theme has stood in it by itself (a house, a sign, a crane: an
  // object of its own, with a place) and not through instances, if it is on another road. Not what is built in
  // the world's own terms (strips: see sideStrip), nor anything over 60 m across (a backdrop: a lake, a
  // skyline, a mountain: those are placed with offRoads or clearOfRoads where they are made)
  const firstLoose = levelGroup.children.length;
  const clearLoose = () => {
    if (!paved.length) return;
    const box = new THREE.Box3(), size = new THREE.Vector3(), mid = new THREE.Vector3(), mirror = Track.mirrored ? -1 : 1;
    levelGroup.updateMatrixWorld(true);
    for (const child of levelGroup.children.slice(firstLoose)) {
      if (child.userData.flat || child.isPoints || child.isInstancedMesh || !(child.isMesh || child.isGroup)) continue;
      if (!child.position.x && !child.position.z) continue;
      box.setFromObject(child);
      if (box.isEmpty()) continue;
      box.getSize(size); box.getCenter(mid);
      if (size.x > 60 || size.z > 60) continue;
      let clear = true;
      const nx = Math.max(1, Math.ceil(size.x / 3)), nz = Math.max(1, Math.ceil(size.z / 3));
      for (let i = 0; i <= nx && clear; i++) {
        for (let j = 0; j <= nz && clear; j++) clear = offRoads(mirror * (mid.x + (i / nx - 0.5) * size.x), mid.z + (j / nz - 0.5) * size.z);
      }
      if (!clear) levelGroup.remove(child);
    }
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const tube = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const cone = new THREE.ConeGeometry(0.5, 1, 8);

  // weather, in a box round the camera: particles drifting down, starting again at the top as they
  // reach the bottom (two layers, one above the other, so the box is never seen to empty).
  // size: a particle's; speed: m/s it falls; sway: m the whole box swings side to side (snow drifts, rain doesn't)
  const precipitation = (color, count, size, speed, sway, opacity) => {
    const BOX = 70, points = [];
    for (let i = 0; i < count; i++) points.push((Math.random() - 0.5) * BOX * 2, Math.random() * BOX, (Math.random() - 0.5) * BOX * 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false });
    for (const layer of [0, 1]) {
      const fall = new THREE.Points(geo, mat);
      fall.frustumCulled = false;
      fall.onBeforeRender = (renderer, scene, camera) => {
        const down = (performance.now() / 1000 * speed + layer * BOX) % (BOX * 2);
        const x = scene.scale.x < 0 ? -camera.position.x : camera.position.x; // (in the scene's own terms)
        fall.position.set(x + Math.sin(performance.now() / 3000) * sway, camera.position.y + BOX - down, camera.position.z);
        fall.updateMatrixWorld();
      };
      levelGroup.add(fall);
    }
  };
  // snow falling (the alpine pass, and any theme with snow: true)
  const snowfall = () => precipitation(0xffffff, 1400, 0.18, 2.5, 2, 0.85);
  // rain (a theme with rain: true): fine, fast and grey, and a lot of it
  const rainfall = () => precipitation(0xc8d4e0, 2600, 0.07, 22, 0, 0.6);
  // an elevated road (a theme's "elevated": m above the ground): a parapet along each edge, lamps on it,
  // and concrete piers down to the ground every so often (under the main road and every side road alike)
  const elevatedRoad = (drop) => {
    const walls = [], caps = [], lamps = [], posts = [], piers = [], heads = [];
    for (let s = Track.start; s < Track.end; s += 4) {
      for (const side of [-1, 1]) {
        walls.push([s, beside(side, s, 0.2), 0.55, 0.3, 1.1, 4.02, [s + 4, beside(side, s + 4, 0.2)]]);
        caps.push([s, beside(side, s, 0.2), 1.14, 0.42, 0.1, 4.02, [s + 4, beside(side, s + 4, 0.2)]]);
      }
    }
    for (let s = Track.start + 15, k = 0; s < Track.end; s += 30, k++) {
      const side = k % 2 ? 1 : -1;
      if (Track.tunnel(s) === 0 && !(LEVEL.tunnels || []).some(t => s >= t.from - 10 && s <= t.to + 10)) {
        posts.push([s, beside(side, s, 0.1), 4.5, 0.18, 7, 0.18]);
        lamps.push([s, beside(side, s, -0.8), 7.9, 1.8, 0.2, 0.5]);
      }
      // (a pier under the middle of the road, from the ground up to its underside; a head spreading under the deck)
      piers.push([s, 0, -drop / 2 - 0.3, 2.4, drop - 0.6, 2.4]);
      heads.push([s, 0, -0.6, Track.hi(s) - Track.lo(s) - 1, 0.8, 2.8]);
    }
    for (const x of exits) {
      for (let s = x.side0 + 20; s < x.sideEnd - 20; s += 30) {
        const mid = (Track.lo(s) + Track.hi(s)) / 2;
        piers.push([s, mid, -drop / 2 - 0.3, 2, drop - 0.6, 2]);
        heads.push([s, mid, -0.6, Track.hi(s) - Track.lo(s) - 1, 0.8, 2.4]);
      }
      // (and a parapet of its own along each edge, and a deck under it: where it leaves the expressway and comes
      // back, each road's parapet stops for the other, as all scenery does)
      for (let s = x.side0; s < x.sideEnd; s += 4) {
        for (const side of [-1, 1]) {
          walls.push([s, beside(side, s, 0.2), 0.55, 0.3, 1.1, 4.02, [s + 4, beside(side, s + 4, 0.2)]]);
          caps.push([s, beside(side, s, 0.2), 1.14, 0.42, 0.1, 4.02, [s + 4, beside(side, s + 4, 0.2)]]);
        }
      }
      add(buildStrip(x.side0, x.sideEnd, (q) => Track.lo(q) - 0.2, (q) => Track.hi(q) + 0.2, -0.9, 6), new THREE.MeshLambertMaterial({ color: 0x6e7177, side: THREE.DoubleSide }));
    }
    // (the deck's underside: a slab under the whole road, so from below it isn't a sheet of nothing)
    add(buildStrip(Track.start, Track.end, (q) => Track.lo(q) - 0.2, (q) => Track.hi(q) + 0.2, -0.9, 6), new THREE.MeshLambertMaterial({ color: 0x6e7177, side: THREE.DoubleSide }));
    for (const side of [-1, 1]) add(sideStrip(Track.start, Track.end, (q) => beside(side, q, -0.05), (q) => beside(side, q, 0.2), -0.45, 6), new THREE.MeshLambertMaterial({ color: 0x80848a, side: THREE.DoubleSide }));
    instances(cube, 0x9ea2a8, walls);
    instances(cube, 0xb8bcc2, caps);
    instances(cube, 0x4a4f57, posts);
    instances(cube, 0xfff1c8, lamps, true);
    instances(cube, 0x7d8188, piers);
    instances(cube, 0x8a8e95, heads);
  };
  // a city's towers at night: dark boxes with rows of lit windows up their faces (windows: a glowing grid
  // laid a hair proud of each face along the road)
  const litTowers = (towers, windows, s, lat, w, h, d, side) => {
    towers.push([s, lat, h / 2, d, h, w]);
    const face = lat - side * (d / 2 + 0.05); // (the face towards the road)
    for (let y = 3; y < h - 2; y += 3.2) {
      if (Math.random() < 0.25) continue; // (some floors dark)
      windows.push([s, face, y, 0.1, 1.4, w * 0.84]);
    }
  };

  // ---- a race circuit's trackside (Singapore's Grand Prix at night, Montreal): concrete walls and
  // catch fences along both edges (broken off at each junction, and on a bridge, which has sides of its
  // own), red and white kerbs round every bend, and (lit) light pylons with lamps over the road
  const circuitTrackside = (lit) => {
    const breaks = Track.junctions.map(jn => [jn.s - 6, jn.end + 6]);
    const walls = [], fences = [], posts = [];
    for (const side of [-1, 1]) {
      let from = Track.start;
      for (const [a, b] of [...breaks, [Track.end, Track.end]]) {
        for (let s = from; s + 4 <= a; s += 4) {
          if (Track.onBridge(s) || Track.onBridge(s + 4)) continue; // (a bridge has its own sides)
          walls.push([s, beside(side, s, 0.3), 0.55, 0.5, 1.1, 4.02, [s + 4, beside(side, s + 4, 0.3)]]);
          fences.push([s, beside(side, s, 0.32), 2.9, 0.03, 3.6, 4.02, [s + 4, beside(side, s + 4, 0.32)]]);
          posts.push([s, beside(side, s, 0.32), 2.9, 0.1, 3.6, 0.1]);
        }
        from = b;
      }
    }
    instances(cube, 0xdedede, walls);
    instances(cube, 0x4a4f57, posts);
    // (the catch fence: a see-through mesh)
    const mesh = fences.filter(entry => entryAt(cube, entry, 0)[3]); // (none of it across another road)
    const fence = new THREE.InstancedMesh(cube, new THREE.MeshBasicMaterial({ color: 0x9aa4ae, transparent: true, opacity: 0.3, depthWrite: false }), mesh.length);
    mesh.forEach((entry, i) => {
      placeEntry(entry);
      fence.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(fence);
    if (lit) { // light pylons each side, their lamps overhanging the road
      const poles = [], arms = [], lamps = [];
      for (let s = Track.start + 10, k = 0; s < Track.end; s += 26, k++) {
        if (inJunction(s) || Track.onBridge(s)) continue;
        for (const side of [-1, 1]) {
          poles.push([s, beside(side, s, 1.0), 5.5, 0.3, 11, 0.3]);
          arms.push([s, beside(side, s, 0.1), 10.9, 1.9, 0.15, 0.15]);
          lamps.push([s, beside(side, s, -0.9), 10.8, 1.6, 0.3, 0.8]);
        }
      }
      instances(cube, 0x3a3f47, poles);
      instances(cube, 0x3a3f47, arms);
      instances(cube, 0xffffff, lamps, true);
    }
    // kerbs, red and white, along both edges of every bend that isn't a junction's
    // (blocks of each colour as one instanced mesh: a circuit is bends nearly all the way round)
    const redKerbs = [], whiteKerbs = [];
    let at = 0;
    for (const seg of LEVEL.segments) {
      const from = at, to = at + seg.length;
      at = to;
      if (Math.abs(seg.curve) < 0.004 || Track.junctions.some(jn => from < jn.end + 1 && to > jn.s - 1)) continue;
      // (each block from one point on the kerb's line to the next, as the walls are, so that round a
      // bend they meet end to end; the white a hair higher, so where they do still overlap, on the
      // inside of a tight one, neither flickers through the other)
      for (let s = from, k = 0; s < to; s += 2.5, k++) {
        const e = Math.min(to, s + 2.5), y = (white) => white ? 0.034 : 0.03;
        (k % 2 ? whiteKerbs : redKerbs).push([s, Track.laneHi(s) + 0.5, y(k % 2), 1, 0.06, 2.5, [e, Track.laneHi(e) + 0.5]]);
        (k % 2 ? redKerbs : whiteKerbs).push([s, Track.laneLo(s) - 0.5, y(!(k % 2)), 1, 0.06, 2.5, [e, Track.laneLo(e) - 0.5]]);
      }
    }
    instances(cube, 0xd62a2a, redKerbs);
    instances(cube, 0xf2f2f2, whiteKerbs);
  };
  // a level's grandstands, stepped and roofed, and its pit garages (lit within, at night): "stands"
  const grandstands = (night) => {
    for (const st of LEVEL.stands || []) {
      const side = st.side === 'left' ? -1 : 1, rows = [], roofs = [];
      for (let s = st.from; s < st.to; s += 10) {
        if (st.pits) {
          rows.push([s + 5, beside(side, s + 5, 8), 4, 10, 8, 9.6]);
          roofs.push([s + 5, beside(side, s + 5, 4.1), 3.2, 0.2, 5, 8], [s + 5, beside(side, s + 5, 8), 8.4, 11, 0.8, 10]);
        } else {
          for (let k = 0; k < 5; k++) rows.push([s + 5, beside(side, s + 5, 4 + k * 2.2), 0.8 + k * 1.4, 2.2, 1.6 + k * 2.8, 9.8]);
          roofs.push([s + 5, beside(side, s + 5, 9), 13, 12, 0.5, 10]);
        }
      }
      instances(cube, st.pits ? 0xe9ecef : 0x2a5f9c, rows);
      instances(cube, st.pits ? (night ? 0xffe9b0 : 0x9aa3ab) : 0xe9ecef, roofs, st.pits && night);
    }
  };

  if (theme.scenery === 'city') {
    // ---- roadside poles and blocks (instanced), so speed is readable -----------------------------
    // along the expressway and every side road alike, end to end: what would stand on another road, at a fork
    // or a merge, under a flyover or where two roads run close, is taken out with the rest (see placeInstances);
    // and nothing is put in a river
    const nearBridge = (s) => (LEVEL.bridges || []).some(b => s > b.from - 30 && s < b.to + 30);
    const poles = [], blocks = [];
    const roads = [[Track.start, Track.end], ...exits.map(x => [x.side0, x.sideEnd])];
    for (const [from, to] of roads) {
      for (let s = from; s < to; s += CONFIG.poleSpacing) {
        if (Track.onBridge(s)) continue;
        poles.push([s, Track.lo(s) - 1.5, 2.5, 1, 1, 1], [s, Track.hi(s) + 1.5, 2.5, 1, 1, 1]);
      }
      for (let s0 = from; s0 < to - 10; s0 += CONFIG.buildingSpacing) {
        if (nearBridge(s0)) continue;
        for (const side of [-1, 1]) {
          const s = s0 + Math.random() * 10;
          const w = 6 + Math.random() * 10, h = 5 + Math.random() * 22, d = 6 + Math.random() * 12;
          const far = 8 + w / 2 + Math.random() * 30;
          // (a set-piece of a zone stands there: themes/extras.js. The dice are thrown all the same, so the rest is laid
          // out as ever. A side road's own blocks reach across the expressway where the two run close: along such a
          // stretch it has none on its left)
          if (from === Track.start ? cityKeepsClear(s, side) : side < 0 && cityKeepsClear(Track.along(s), -1)) continue;
          blocks.push([s, side < 0 ? Track.lo(s) - far : Track.hi(s) + far, h / 2, w, h, d]);
        }
      }
    }
    instances(new THREE.BoxGeometry(0.3, 5, 0.3), 0xd9d9d9, poles);
    instances(cube, 0x8b93a1, blocks, false, CONFIG.ramps.clearBuilding);
  } else if (theme.scenery === 'farm') {
    // ---- farm: fenced fields of crops, trees, barns, silos and hay stacks -------------------------
    // fields: strips of different crops running alongside the road, drawn just after the ground
    const crops = [0xd9b84a, 0x6fae45, 0x9a7b4f, 0xc7d44f];
    for (const side of [-1, 1]) {
      for (let s = Track.start, k = side > 0 ? 0 : 2; s < Track.end; s += 140, k++) {
        const field = new THREE.Mesh(
          sideStrip(s, Math.min(Track.end, s + 132), (q) => beside(side, q, 4), (q) => beside(side, q, 110), -0.03, 8),
          new THREE.MeshBasicMaterial({ color: crops[k % crops.length], side: THREE.DoubleSide, depthWrite: false }));
        field.renderOrder = -1;
        levelGroup.add(field);
      }
      // a two-rail fence along the roadside: it also makes speed readable
      for (const y of [0.5, 1.0]) {
        add(sideStrip(Track.start, Track.end, (q) => beside(side, q, 1.32), (q) => beside(side, q, 1.48), y), flat(0x8a6a45));
      }
    }
    const posts = [], trunks = [], crowns = [], barns = [], roofs = [], silos = [], caps = [], stacks = [];
    for (let s = Track.start; s < Track.end; s += 6) {
      for (const side of [-1, 1]) posts.push([s, beside(side, s, 1.4), 0.6, 0.2, 1.2, 0.2]);
    }
    for (let s = Track.start; s < Track.end; s += 26) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 14;
        if (roll < 0.5) { // a tree
          const h = 4 + Math.random() * 4, lat = beside(side, at, 7 + Math.random() * 45);
          trunks.push([at, lat, h * 0.2, 0.6, h * 0.4, 0.6]);
          crowns.push([at, lat, h * 0.75, h * 0.6, h * 0.9, h * 0.6]);
        } else if (roll < 0.58) { // a red barn with a dark roof
          const lat = beside(side, at, 22 + Math.random() * 30);
          barns.push([at, lat, 3, 10, 6, 14]);
          roofs.push([at, lat, 6.6, 10.8, 1.2, 14.8]);
        } else if (roll < 0.64) { // a silo
          const lat = beside(side, at, 18 + Math.random() * 30);
          silos.push([at, lat, 6, 5, 12, 5]);
          caps.push([at, lat, 13.2, 5.4, 2.4, 5.4]);
        } else if (roll < 0.78) { // a stack of hay in the field
          stacks.push([at, beside(side, at, 8 + Math.random() * 30), 0.8, 2.4, 1.6, 2.4]);
        }
      }
    }
    instances(cube, 0x7a5a3a, posts);
    instances(tube, 0x6b4a2b, trunks);
    instances(cone, 0x3f8f3f, crowns);
    instances(cube, 0xb5382e, barns);
    instances(cube, 0x4a3a34, roofs);
    instances(tube, 0xc9ccd1, silos);
    instances(cone, 0x8a8f96, caps);
    instances(tube, 0xe0c060, stacks);
  } else if (theme.scenery === 'beach') {
    // ---- beach: the sea along the right with a line of surf, palms, umbrellas and huts ---------
    for (const [a, b, color, order] of [[30, 600, 0x2f6f9f, -1], [28, 32, 0xd8e6ea, -0.9]]) {
      const water = new THREE.Mesh(sideStrip(Track.start, Track.end, (q) => beside(1, q, a), (q) => beside(1, q, b), -0.03, 8),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false }));
      water.renderOrder = order;
      levelGroup.add(water);
    }
    const trunks = [], crowns = [], poles = [], shades = [], huts = [], roofs = [];
    for (let s = Track.start; s < Track.end; s += 18) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 12;
        // the sea side has the beach: umbrellas and huts between the road and the water,
        // palms behind the road on the land side and here and there along the shore
        if (side > 0 && roll < 0.35) {
          const lat = beside(1, at, 6 + Math.random() * 18);
          poles.push([at, lat, 1.2, 0.12, 2.4, 0.12]);
          shades.push([at, lat, 2.5, 3, 0.9, 3]);
        } else if (side > 0 && roll < 0.45) {
          const lat = beside(1, at, 8 + Math.random() * 12);
          huts.push([at, lat, 1.4, 3.2, 2.8, 3.2]);
          roofs.push([at, lat, 3.3, 3.8, 1.2, 3.8]);
        } else if (roll < (side > 0 ? 0.6 : 0.5)) {
          const h = 6 + Math.random() * 5, lat = beside(side, at, side > 0 ? 4 + Math.random() * 20 : 5 + Math.random() * 50);
          trunks.push([at, lat, h / 2, 0.5, h, 0.5]);
          crowns.push([at, lat, h + 0.4, 6, 1.8, 6]);
        }
      }
    }
    instances(tube, 0x8a6a45, trunks);
    instances(cone, 0x3f9f4f, crowns);
    instances(tube, 0xf4f4f4, poles);
    instances(cone, 0xff6a5a, shades, true);
    instances(cube, 0x62b0d8, huts);
    instances(cone, 0xf2e3c4, roofs);
  } else if (theme.scenery === 'suburb') {
    // ---- suburb: a pavement each side, then lots: a front lawn behind a picket fence, a house
    // with a door and windows facing the road, a driveway and a mailbox; here and there a little
    // park of trees instead. Trees in the gardens, and street lamps along the pavement.
    // (the same along each side road, and along each arm of a crossroads: lots, lamps and pavement, as the main road's.
    // runs: every road that has them, [from, to, the number of its first lot])
    const runs = [[Track.start, Track.end, 0], ...exits.map((x, n) => [x.side0, x.sideEnd, 5000 * (n + 1)])];
    for (const side of [-1, 1]) {
      for (const [from, to] of runs) add(sideStrip(from, to, (q) => beside(side, q, 0.4), (q) => beside(side, q, 2.4), 0.03, 4, exits.length ? 3 : true), flat(0xcfd0cb));
    }
    // (round the outside of each fork and merge the pavement runs on unbroken, from the exit lane's kerb onto the side
    // road's and back: there the two roads are one pavement wide apart, and each one's strip would stop for the other)
    for (const x of exits) {
      for (const [a, b] of [[x.exitAt - 45, x.exitAt], [x.side0, x.side0 + 45], [x.sideEnd - 45, x.sideEnd], [x.mergeAt, x.mergeAt + 45]]) {
        add(buildStrip(a, b, (q) => beside(1, q, 0.4), (q) => beside(1, q, 2.4), 0.03), flat(0xcfd0cb));
      }
    }
    for (const jn of Track.junctions) {
      for (const arm of jn.arms) {
        for (const side of [-1, 1]) { // (from the corner, where the road's own pavement stops, out along the arm)
          const pos = [], r = { x: -arm.dir.z, z: arm.dir.x };
          // (and the corner: on round it to where the road's own pavement, kept a verge and more off the arm, breaks off)
          for (const [u, v] of [[jn.half + 0.4, 0.4], [jn.half + 0.4, 2.4], [arm.length, 0.4], [arm.length, 2.4],
            [jn.half + 0.4, 2.4], [jn.half + 0.4, 8], [jn.half + 2.4, 2.4], [jn.half + 2.4, 8]]) {
            pos.push(jn.centre.x + arm.dir.x * u + r.x * side * (jn.half + v), jn.centre.y + 0.03, jn.centre.z + arm.dir.z * u + r.z * side * (jn.half + v));
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          geo.setIndex([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6]);
          add(geo, flat(0xcfd0cb));
        }
      }
    }
    // (run down, theme.rundown: drab walls, boarded windows, gaps in the fences, dead trees, bare dirt,
    // burnt-out houses, wrecks on the lawns, rubbish and graffiti)
    const rundown = !!theme.rundown, odds = (p) => rundown && Math.random() < p;
    const WALLS = rundown ? [0x9a9282, 0xa8a08a, 0x7f8a8c, 0x9c8c7a, 0x77726a, 0xb0a88f] : [0xf2e6c9, 0xbfd8e8, 0xf0c9b0, 0xd9e5c3, 0xe8d0e0, 0xfafafa];
    const walls = WALLS.map(() => []), roofs = [], doors = [], windows = [], drives = [];
    const pickets = [], rails = [], mailPosts = [], mailboxes = [], trunks = [], crowns = [], lampPosts = [], lampHeads = [];
    const boards = [], holes = [], burnt = [], burntRoofs = [], dirt = [], branches = [], wrecks = [], wreckTops = [], bags = [], tags = [[], [], []];
    const gangWalls = [], gangWindows = [], gangDoors = [], gangTags = [], poles = [], flags = [], beacons = [];
    // (festive, theme.festive: Christmas. Fairy lights along every eave, a wreath on every door, and the
    // trees in the front gardens are firs strung with lights, a star on top)
    const festive = !!theme.festive, FAIRY = [0xff3b3b, 0x3bff5a, 0x3b8cff, 0xffd23f, 0xff6ad5];
    const fairy = FAIRY.map(() => []), firs = [], firTrunks = [], stars = [], wreaths = [];
    const tree = (at, lat, front) => {
      const h = 0.8 + Math.random() * 0.5;
      if (festive && front) { // (a Christmas tree: a fir in tiers, lights all over it, a star on top)
        firTrunks.push([at, lat, 0.4, 0.3, 0.8, 0.3]);
        for (let k = 0; k < 3; k++) firs.push([at, lat, 1.2 + k * 1.1, 3.2 - k * 0.8, 1.6, 3.2 - k * 0.8]);
        stars.push([at, lat, 4.4, 0.4, 0.4, 0.4]);
        for (let k = 0; k < 14; k++) {
          const a = k * 2.4, y = 0.7 + k * 0.25, r = 1.6 - k * 0.1;
          fairy[k % FAIRY.length].push([at + Math.sin(a) * r, lat + Math.cos(a) * r, y, 0.16, 0.16, 0.16]);
        }
        return;
      }
      if (odds(0.5)) { // (a dead one: a bare trunk and a few bare branches)
        trunks.push([at, lat, 1.6 * h, 0.3, 3.2 * h, 0.3]);
        for (let k = 0; k < 3; k++) branches.push([at + Math.random() * 1.2 - 0.6, lat + Math.random() * 1.2 - 0.6, (2.2 + k * 0.5) * h, 0.12, 0.12, 1.6 + Math.random()]);
        return;
      }
      trunks.push([at, lat, 1.2 * h, 0.35, 2.4 * h, 0.35]);
      crowns.push([at, lat, 3.6 * h, 3.4 * h, 3.0 * h, 3.4 * h]);
    };
    const FENCE = 2.8; // m off the pavement edge to the fence (and LOT m along the road per lot: see gunfire.js)
    // (nothing goes where it would stand on a side road)
    const clear = (s, lat) => standsClear(s, lat, 20, LOT, CONFIG.ramps.clearBuilding); // (a lot: its house and garden)
    // (nor where another road's lot already is: the expressway's come first, then each side road's between and beyond)
    const taken = [], lotSpot = {};
    const free = (s, lat, run) => {
      Track.toWorld(s, lat, lotSpot);
      if (taken.some(t => t[2] !== run && Math.hypot(t[0] - lotSpot.x, t[1] - lotSpot.z) < LOT + 6)) return false;
      taken.push([lotSpot.x, lotSpot.z, run]);
      return true;
    };
    // ---- sets (the theme's "sets" in themes.js): a zone of the level (its "zones") can be one of them, in place of
    // the lots of houses, so a level is a town with parts to it. Along the expressway only. 'highstreet': a row of
    // shops under awnings, bunting over the road; 'market': a market square: stalls under striped canopies, the town
    // hall, a clock tower; 'retail': a retail park: big sheds behind their car parks; 'park': a town park: railings,
    // a pond, a bandstand, a playground, flower beds. (All instanced, and all through the placement tests above)
    const BRICK = [0xb5654a, 0xc9b79a, 0x8f5a48, 0xd8cdb8], BRIGHT = [0xc0392b, 0x2e7d5b, 0x2c5f9e, 0xe0a82e], PAINT = [0xc0392b, 0x2c5f9e, 0xe8e8e8, 0x2b2b2b, 0xe0a82e];
    const shopWalls = BRICK.map(() => []), awnings = BRIGHT.map(() => []), fascias = [], shopGlass = [], paving = [], cornices = [], bollards = [], benches = [];
    const carBodies = PAINT.map(() => []), carTops = [], carParks = [], sheds = [], shedBands = BRIGHT.map(() => []), pylons = [], hedges = [], chimneys = [], bins = [];
    const stallPosts = [], stallTops = BRIGHT.map(() => []), stallTables = [], produce = BRIGHT.map(() => []), cobbles = [], stone = [], stoneRoofs = [], clockFaces = [], columns = [];
    const railPosts = [], railBars = [], ponds = [], decks = [], bandRoofs = [], playBars = BRIGHT.map(() => []), beds = BRIGHT.map(() => []), bunting = BRIGHT.map(() => []);
    const cattle = [], sheep = [];
    const towered = new Set();
    const parkedCar = (at, lat, alongRoad, k) => { // a car standing: a body and a cabin (alongRoad: nose along the road, not across it)
      const [ax, az] = alongRoad ? [1.8, 4.2] : [4.2, 1.8];
      carBodies[k % PAINT.length].push([at, lat, 0.6, ax, 0.7, az]);
      carTops.push([at, lat, 1.2, ax * (alongRoad ? 0.86 : 0.5), 0.5, az * (alongRoad ? 0.5 : 0.86)]);
    };
    const railways = (LEVEL.crossings || []).filter(c => c.road !== 'side').map(c => Track.place(c)); // (where a railway crosses the expressway)
    const SETS = {
      highstreet(side, s, mid, lot) {
        paving.push([mid, beside(side, mid, 3.6), 0.02, 2.4, 0.05, LOT]); // (a forecourt, from the pavement to the shop fronts)
        for (const half of [0, 1]) {
          const at = s + LOT * (0.25 + half * 0.5), k = lot * 2 + half + (side > 0 ? 1 : 0), w = LOT / 2 - 0.4, h = k % 3 ? 7 : 10, deep = 11, front = 4.8;
          const face = beside(side, at, front - 0.06);
          shopWalls[k % BRICK.length].push([at, beside(side, at, front + deep / 2), h / 2, deep, h, w]);
          cornices.push([at, beside(side, at, front + 0.1), h + 0.2, 0.6, 0.4, w + 0.3]);
          shopGlass.push([at - 1.2, face, 1.6, 0.1, 2.3, w * 0.6]);
          doors.push([at + w * 0.36, face, 1.15, 0.1, 2.3, 1.2]);
          fascias.push([at, face, 3.75, 0.16, 0.9, w * 0.94]);
          awnings[(k * 3 + 1) % BRIGHT.length].push([at, beside(side, at, front - 1), 3.05, 2, 0.16, w * 0.9]);
          for (let y = 5.4; y < h - 1; y += 3) for (const q of [-w * 0.28, w * 0.28]) windows.push([at + q, face, y, 0.1, 1.5, 1.4]);
        }
        for (let q = s + 2; q < s + LOT; q += 6.5) bollards.push([q, beside(side, q, 0.7), 0.45, 0.2, 0.9, 0.2]);
        benches.push([mid + 4, beside(side, mid + 4, 4.1), 0.45, 0.5, 0.5, 1.8]);
        if (lot % 2) tree(s + 3, beside(side, s + 3, 3.5));
        if (side > 0 && lot % 2 === 0) { // bunting over the road, from a post on each pavement
          const a = Track.lo(mid) - 1.2, b = Track.hi(mid) + 1.2, n = Math.round((b - a) / 0.9);
          for (const lat of [a, b]) lampPosts.push([mid, lat, 5, 0.16, 10, 0.16]);
          for (let i = 1; i < n; i++) bunting[i % BRIGHT.length].push([mid, a + (b - a) * i / n, 9.6 - Math.sin(Math.PI * i / n) * 1.1, 0.5, 0.5, 0.06]);
        }
      },
      market(side, s, mid, lot, zone) {
        cobbles.push([mid, beside(side, mid, 15.4), 0.02, 26, 0.05, LOT + 0.05]);
        for (const d of [7.5, 14.5]) for (const q of [4.5, 13, 21.5]) { // stalls: a striped canopy on four posts, a table, crates of produce
          const at = s + q, lat = beside(side, at, d), k = Math.floor(Math.random() * BRIGHT.length);
          stallTops[k].push([at, lat, 2.7, 3.4, 0.22, 4.4]);
          stallTops[(k + 2) % BRIGHT.length].push([at, lat, 2.86, 1.2, 0.12, 4.4]);
          for (const i of [-1, 1]) for (const j of [-1, 1]) stallPosts.push([at + j * 2, lat + i * 1.5, 1.35, 0.1, 2.7, 0.1]);
          stallTables.push([at, lat, 0.45, 2, 0.9, 3.4]);
          for (let c = 0; c < 3; c++) produce[(k + c + 1) % BRIGHT.length].push([at - 1.1 + c * 1.1, lat, 1.05, 1.5, 0.3, 0.8]);
        }
        // behind the square: the town hall's stone front, columns along it
        stone.push([mid, beside(side, mid, 36), 5.5, 14, 11, LOT - 1]);
        stoneRoofs.push([mid, beside(side, mid, 36), 12.2, 15.5, 2.4, LOT + 0.6]);
        for (let q = s + 2.5; q < s + LOT; q += 4.2) columns.push([q, beside(side, q, 28.6), 4, 0.7, 8, 0.7]);
        for (const q of [s + 8, s + 18]) windows.push([q, beside(side, q, 28.9), 8.6, 0.1, 1.8, 2.2]);
        if (side > 0 && zone && !towered.has(zone) && mid > (zone.from + zone.to) / 2 - LOT) { // the clock tower, once, half way along
          towered.add(zone);
          stone.push([mid, beside(side, mid, 23), 9, 4.6, 18, 4.6]);
          stoneRoofs.push([mid, beside(side, mid, 23), 20.5, 5.6, 5, 5.6]);
          clockFaces.push([mid, beside(side, mid, 20.6), 15, 0.16, 2.6, 2.6], [mid - 2.36, beside(side, mid, 23), 15, 2.6, 2.6, 0.16], [mid + 2.36, beside(side, mid, 23), 15, 2.6, 2.6, 0.16]);
        }
      },
      retail(side, s, mid, lot) {
        carParks.push([mid, beside(side, mid, 18.4), 0.02, 28, 0.05, LOT + 0.05]);
        hedges.push([mid, beside(side, mid, 3.4), 0.5, 0.9, 1, LOT - 5]);
        for (const d of [9, 14.5, 23, 28.5]) for (let q = s + 2; q < s + LOT - 1; q += 3) if (Math.random() < 0.55) parkedCar(q, beside(side, q, d), false, Math.floor(Math.random() * 97));
        sheds.push([mid, beside(side, mid, 47), 4.5, 26, 9, LOT - 0.4]);
        shedBands[Math.floor(lot / 2) % BRIGHT.length].push([mid, beside(side, mid, 33.8), 7.4, 0.3, 1.8, LOT - 0.4]);
        if (lot % 2 === 0) shopGlass.push([mid + LOT / 2, beside(side, mid, 33.9), 1.9, 0.12, 3.8, 9]);
        lampPosts.push([mid, beside(side, mid, 18.6), 4, 0.2, 8, 0.2]);
        lampHeads.push([mid, beside(side, mid, 18.6), 8, 2.6, 0.2, 0.5]);
        if (lot % 4 === 0) { // a pylon sign by the way in
          pylons.push([s + 1.5, beside(side, s + 1.5, 5), 5, 0.5, 10, 0.5]);
          shedBands[Math.floor(lot / 4) % BRIGHT.length].push([s + 1.5, beside(side, s + 1.5, 5), 10.6, 0.7, 3.2, 4.4]);
        }
      },
      // 'livestock': a cattle market: a yard of pens, railed, a few beasts in each, the market's shed behind them and,
      // once, half way along on the right, the round sale ring under its roof
      livestock(side, s, mid, lot, zone) {
        paving.push([mid, beside(side, mid, 15.4), 0.02, 26, 0.05, LOT + 0.05]);
        if (side > 0 && zone && !towered.has(zone) && mid > (zone.from + zone.to) / 2 - LOT) {
          towered.add(zone);
          decks.push([mid, beside(side, mid, 15), 0.3, 13, 0.6, 13]);
          for (let a = 0; a < 8; a++) stallPosts.push([mid + Math.sin(a * Math.PI / 4) * 6, beside(side, mid, 15) + Math.cos(a * Math.PI / 4) * 6, 2.6, 0.16, 4, 0.16]);
          bandRoofs.push([mid, beside(side, mid, 15), 5.6, 14.5, 2.2, 14.5]);
          return;
        }
        for (const d of [5, 11, 17, 23]) for (const y of [0.5, 1.0]) railBars.push([mid, beside(side, mid, d), y, 0.08, 0.08, LOT - 2]);
        for (let q = s + 1; q <= s + LOT - 1; q += 6) {
          for (const y of [0.5, 1.0]) railBars.push([q, beside(side, q, 14), y, 18, 0.08, 0.08]);
          for (const d of [5, 11, 17, 23]) railPosts.push([q, beside(side, q, d), 0.6, 0.14, 1.2, 0.14]);
        }
        for (const d of [8, 14, 20]) for (let q = s + 4; q < s + LOT - 2; q += 6) {
          const big = (lot + d) % 2 === 0, list = big ? cattle : sheep;
          for (let k = Math.floor(Math.random() * 3); k > 0; k--) list.push([q + Math.random() * 3 - 1.5, beside(side, q, d + Math.random() * 3 - 1.5), big ? 0.85 : 0.5, big ? 0.8 : 0.6, big ? 0.9 : 0.6, big ? 1.9 : 1.1]);
        }
        sheds.push([mid, beside(side, mid, 33), 3, 12, 6, LOT - 2]);
      },
      park(side, s, mid, lot) {
        for (let q = s; q < s + LOT; q += 2.6) railPosts.push([q, beside(side, q, FENCE), 0.6, 0.1, 1.2, 0.1]);
        for (const y of [0.45, 1.05]) railBars.push([mid, beside(side, mid, FENCE), y, 0.06, 0.08, LOT]);
        for (let k = 0; k < 5; k++) tree(s + Math.random() * LOT, beside(side, mid, (k < 2 ? 5 : 24) + Math.random() * 20));
        benches.push([mid, beside(side, mid, FENCE + 1.2), 0.45, 0.5, 0.5, 1.8]);
        const kind = (lot + (side > 0 ? 2 : 0)) % 4, at = (d) => beside(side, mid, d);
        if (kind === 0) ponds.push([mid, at(16), 0.05, 15, 0.06, 19]);
        else if (kind === 1) { // a bandstand
          decks.push([mid, at(15), 0.4, 7.4, 0.8, 7.4]);
          for (let a = 0; a < 6; a++) stallPosts.push([mid + Math.sin(a * Math.PI / 3) * 3.2, at(15) + Math.cos(a * Math.PI / 3) * 3.2, 2.4, 0.14, 3.2, 0.14]);
          bandRoofs.push([mid, at(15), 4.9, 8.4, 1.8, 8.4]);
        } else if (kind === 2) { // a playground: swings, and a climbing frame
          playBars[0].push([mid - 4, at(12), 2.6, 0.14, 0.14, 4.4]);
          for (const i of [-1, 1]) for (const j of [-1, 1]) playBars[0].push([mid - 4 + j * 2.1, at(12) + i * 0.8, 1.3, 0.12, 2.6, 0.12]);
          for (const j of [-0.8, 0.8]) playBars[3].push([mid - 4 + j, at(12), 0.7, 0.5, 0.08, 0.3]);
          for (const i of [-1, 1]) for (const j of [-1, 1]) playBars[2].push([mid + 5 + j * 1.2, at(13) + i * 1.2, 1.2, 0.12, 2.4, 0.12]);
          playBars[3].push([mid + 5, at(13), 2.4, 2.8, 0.14, 2.8]);
          playBars[1].push([mid + 5, at(13), 1.2, 2.5, 0.12, 2.5]);
        } else for (let k = 0; k < 4; k++) beds[k].push([s + 4 + k * 6, at(8 + (k % 2) * 4), 0.12, 3.2, 0.24, 3.2]); // flower beds
      },
    };
    for (const [runFrom, runTo, lot0] of runs) for (const side of [-1, 1]) {
      for (let s = runFrom + (side > 0 ? 0 : LOT / 2), lot = lot0; s < runTo - LOT; s += LOT, lot++) {
        const mid = s + LOT / 2;
        if (!clear(mid, beside(side, mid, 12))) continue;
        if (exits.length && !free(mid, beside(side, mid, 14), lot0)) continue;
        if (lot0 === 0 && railways.some(cs => Math.abs(cs - mid) < LOT)) continue; // (the line, its station and its signal box are there: below)
        const zone = lot0 === 0 ? (LEVEL.zones || []).find(z => mid >= z.from && mid < z.to) : null;
        if (zone && SETS[zone.scenery]) { SETS[zone.scenery](side, s, mid, lot, zone); continue; }
        // (each lot the same every time: The Hood's shooters are in these houses, see gunfire.js)
        const house = houseAt(side, lot);
        if (!house) { // a little park
          for (let k = 0; k < 4; k++) tree(s + Math.random() * LOT, beside(side, mid, 5 + Math.random() * 22));
          continue;
        }
        const { along, across, tall, front } = house, h = tall ? 6 : 3.4; // (front: m of front lawn, from the pavement edge to the house)
        const lat = beside(side, mid, front + across / 2), face = beside(side, mid, front - 0.06);
        // (a gang house, which shoots: see gunfire.js. Marked out: black, its windows glowing red behind
        // the guns, a red door, a red tag across the front, and a red flag flying from a pole on the roof)
        const gang = rundown && gangHouse(side, lot);
        const shell = !gang && odds(0.1); // (burnt out: blackened, its roof fallen in, its windows empty)
        if (gang) {
          gangWalls.push([mid, lat, h / 2, across, h, along]);
          roofs.push([mid, lat, h + 1.1, across * 1.12, 2.2, along * 1.12]);
          gangTags.push([mid, beside(side, mid, front - 0.09), h * 0.55, 0.06, 1.2, along * 0.85]);
          const pole = beside(side, mid, front + across / 2);
          poles.push([mid, pole, h + 3.6, 0.14, 5, 0.14]);
          flags.push([mid + 1.1, pole, h + 5.3, 0.06, 1.4, 2.2]);
          beacons.push([mid, pole, h + 6.2, 0.45, 0.45, 0.45]);
        } else if (shell) {
          burnt.push([mid, lat, h / 2, across, h, along]);
          burntRoofs.push([mid, lat, h + 0.35, across * 0.9, 0.7, along * 0.9]);
        } else {
          walls[Math.floor(Math.random() * WALLS.length)].push([mid, lat, h / 2, across, h, along]);
          roofs.push([mid, lat, h + 1.1, across * 1.12, 2.2, along * 1.12]);
          chimneys.push([mid - along * 0.28, lat, h + 1.5, 0.8, 1.9, 0.8]);
          if (festive) { // (fairy lights along the eave facing the road, and round the far side too)
            for (let q = -along * 0.55, k = 0; q <= along * 0.55; q += 0.7, k++) {
              fairy[(k + lot) % FAIRY.length].push([mid + q, beside(side, mid, front - 0.2), h + 0.05, 0.14, 0.14, 0.14]);
              fairy[(k + lot + 2) % FAIRY.length].push([mid + q, beside(side, mid, front + across + 0.2), h + 0.05, 0.14, 0.14, 0.14]);
            }
            wreaths.push([mid - 1.5, beside(side, mid, front - 0.14), 1.7, 0.1, 0.7, 0.7]);
          }
        }
        (gang ? gangDoors : shell || odds(0.25) ? holes : doors).push([mid - 1.5, face, 1.1, 0.12, 2.2, 1.1]); // (a door, or the hole where it was)
        const pane = (at, y) => (gang ? gangWindows : shell ? holes : odds(0.5) ? boards : windows).push([at, face, y, 0.1, 1.2, 1.7]); // (or boarded up)
        for (const floor of tall ? [1.6, 4.4] : [1.6]) {
          pane(mid + 2.2, floor);
          if (floor > 2) pane(mid - 1.5, floor);
        }
        if (!shell && !gang && odds(0.35)) tags[Math.floor(Math.random() * 3)].push([mid + Math.random() * 3 - 1.5, beside(side, mid, front - 0.08), 0.9, 0.06, 1.1, 2.4 + Math.random() * 2]); // (graffiti)
        if (rundown) { // the lawn: bare dirt in patches, now and then a wreck on it, and bags of rubbish by the mailbox
          for (let k = 0; k < 2; k++) dirt.push([s + 3 + Math.random() * (LOT - 6), beside(side, mid, FENCE + 1.5 + Math.random() * (front - FENCE - 3)), 0.02, 2 + Math.random() * 3, 0.04, 3 + Math.random() * 4]);
          if (odds(0.2)) {
            const w = beside(side, mid, FENCE + 3.2);
            wrecks.push([mid + 3, w, 0.55, 1.8, 0.8, 4.2]);
            wreckTops.push([mid + 3.3, w, 1.15, 1.5, 0.5, 2]);
          }
          for (let k = Math.floor(Math.random() * 3); k > 0; k--) bags.push([mid + along / 2 + 1 + Math.random() * 1.5, beside(side, mid, FENCE - 0.6 - Math.random() * 0.6), 0.3, 0.6, 0.6, 0.6]);
        }
        // the driveway, beside the house, from the pavement to its far side, with the mailbox at its end
        const drive = mid + along / 2 + 2;
        drives.push([drive, beside(side, drive, (front + across) / 2 + 1.2), 0.03, front + across - 2.4, 0.06, 3.2]);
        mailPosts.push([drive - 2.3, beside(side, drive - 2.3, FENCE - 0.3), 0.5, 0.1, 1.0, 0.1]);
        mailboxes.push([drive - 2.3, beside(side, drive - 2.3, FENCE - 0.3), 1.1, 0.32, 0.3, 0.55]);
        // a car on the driveway (not at a burnt-out house, and fewer where it is run down), and the bins out by the kerb
        if (!shell && Math.random() < (rundown ? 0.2 : 0.55)) parkedCar(drive, beside(side, drive, FENCE + 3.4 + Math.random() * 2), false, Math.floor(Math.random() * 97));
        if (Math.random() < 0.5) for (const k of [0, 1]) bins.push([drive + 2.3 + k * 0.8, beside(side, drive, FENCE - 0.5), 0.55, 0.6, 1.1, 0.6]);
        const hedged = !rundown && lot % 5 === 2; // (a clipped hedge along the front in place of the pickets)
        // the picket fence along the front of the lot, open where the driveway crosses it
        for (const [from, to] of [[s, drive - 1.8], [drive + 1.8, s + LOT]]) {
          if (hedged && to - from >= 1) { hedges.push([(from + to) / 2, beside(side, (from + to) / 2, FENCE), 0.55, 0.8, 1.1, to - from]); continue; }
          if (to - from < 1 || odds(0.2)) continue; // (run down: some stretches of fence gone altogether...)
          for (let q = from; q <= to; q += 1.2) if (!odds(0.3)) pickets.push([q, beside(side, q, FENCE), 0.45, 0.1, 0.9, 0.1]); // (...and pickets missing)
          for (const y of [0.3, 0.65]) rails.push([(from + to) / 2, beside(side, (from + to) / 2, FENCE), y, 0.06, 0.08, to - from]);
        }
        if (festive || Math.random() < 0.6) tree(s + 2 + Math.random() * 5, beside(side, s, FENCE + 2 + Math.random() * 3), true); // in the front garden
        tree(mid + Math.random() * 8 - 4, beside(side, mid, front + across + 5 + Math.random() * 10));   // and the back
      }
    }
    // (a row of trees along each side of a cross road, where the road runs straight over it: its arms lie square
    // to the road there, so a spot on one is a spot beside the road, that far out)
    for (const jn of Track.junctions) {
      if (jn.way) continue;
      jn.arms.forEach((arm, k) => {
        for (const side of [-1, 1]) {
          for (let d = jn.half + 14; d < arm.length - 6; d += 17) tree(jn.s + jn.half + side * (jn.half + 6.5), (k ? -1 : 1) * (d + Math.random() * 4));
        }
      });
    }
    // (a railway, where a level crossing is: fenced off either side of the line, telegraph poles along it, a station
    // beyond it on the right (a platform under a canopy, the building behind) and a signal box before it on the left)
    for (const cs of railways) {
      for (const side of [-1, 1]) {
        for (const q of [cs - 3, cs + 3]) {
          for (let d = 3.4; d < 150; d += 2.4) pickets.push([q, beside(side, q, d), 0.5, 0.1, 1, 0.1]);
          for (const y of [0.35, 0.75]) rails.push([q, beside(side, q, 76.7), y, 146.6, 0.08, 0.06]);
        }
        for (let d = 14; d < 280; d += 38) {
          lampPosts.push([cs - 4.4, beside(side, cs, d), 3.5, 0.2, 7, 0.2]);
          fascias.push([cs - 4.4, beside(side, cs, d), 6.6, 0.16, 0.16, 2.2]);
        }
      }
      const st = (d) => beside(1, cs, d), box = (d) => beside(-1, cs, d);
      paving.push([cs + 4.2, st(19), 0.45, 28, 0.9, 3.4]);
      shopWalls[0].push([cs + 9.4, st(17), 2.6, 16, 5.2, 6]);
      roofs.push([cs + 9.4, st(17), 6.3, 17.5, 2.2, 7.4]);
      chimneys.push([cs + 9.4, st(12), 6.6, 0.9, 2.4, 0.9]);
      fascias.push([cs + 4.6, st(17), 3.9, 18, 0.2, 4]);
      for (const d of [9, 14, 20, 25]) stallPosts.push([cs + 3.2, st(d), 2.4, 0.14, 3, 0.14]);
      for (const d of [12, 17, 22]) windows.push([cs + 6.36, st(d), 2.4, 1.6, 1.6, 0.1]);
      doors.push([cs + 6.36, st(19.5), 2, 1.2, 2.2, 0.1]);
      benches.push([cs + 5.4, st(24), 1.3, 1.8, 0.5, 0.5]);
      shopWalls[2].push([cs - 6.5, box(8), 1.6, 5, 3.2, 3.6]);
      shopGlass.push([cs - 6.5, box(8), 4.3, 5.2, 2.2, 3.8]);
      roofs.push([cs - 6.5, box(8), 6.2, 6.2, 1.6, 4.8]);
    }
    // (houses along each arm of a cross road the road runs straight over, facing the arm, out beyond the back gardens
    // of the road's own: a house, its chimney, door and window, a driveway and now and then a car on it or a hedge)
    for (const jn of Track.junctions) {
      if (jn.way) continue;
      const centre = jn.s + jn.half;
      jn.arms.forEach((arm, k) => {
        const out = k ? -1 : 1;
        for (const side of [-1, 1]) {
          const off = (d) => centre + side * (jn.half + d); // (d m off the arm's edge)
          for (let d = (out > 0 ? Track.hi(centre) : -Track.lo(centre)) + 17, n = 0; d < arm.length - 16; d += LOT, n++) {
            const lat = out * d, tall = (n + k + (side > 0 ? 1 : 0)) % 3 === 0, h = tall ? 6 : 3.4;
            if (!standsClear(off(12.6), lat, 12, 10) || !free(off(12.6), lat, 9000 + Math.round(jn.s) * 4 + k * 2 + (side > 0 ? 1 : 0))) continue; // (nor where one of the road's own lots is)
            walls[(n * 3 + k + (side > 0 ? 2 : 0)) % WALLS.length].push([off(12.6), lat, h / 2, 11, h, 8]);
            roofs.push([off(12.6), lat, h + 1.1, 12.3, 2.2, 9]);
            chimneys.push([off(12.6), lat + 3, h + 1.5, 0.8, 1.9, 0.8]);
            doors.push([off(8.56), lat - 1.5, 1.1, 1.1, 2.2, 0.12]);
            for (const y of tall ? [1.6, 4.4] : [1.6]) windows.push([off(8.56), lat + 2.2, y, 1.7, 1.2, 0.1]);
            drives.push([off(7.2), lat + 8, 0.03, 3.2, 0.06, 9.6]);
            if (n % 2) parkedCar(off(8), lat + 8, true, n * 7 + k * 3 + (side > 0 ? 1 : 0));
            if ((n + k) % 3 === 1) hedges.push([off(5.2), lat - 1, 0.55, 11, 1.1, 0.8]);
          }
        }
      });
    }
    for (const [runFrom, runTo] of runs) for (let s = runFrom, k = 0; s < runTo; s += 55, k++) { // street lamps, each side in turn
      const side = k % 2 ? 1 : -1;
      if (!clear(s, beside(side, s, 0.8))) continue;
      lampPosts.push([s, beside(side, s, 0.8), 2.75, 0.16, 5.5, 0.16]);
      lampHeads.push([s, beside(side, s, 0.2), 5.45, 1.2, 0.18, 0.4]);
    }
    // (a four-sided cone turned an eighth is a square pyramid over a unit square: a hip roof)
    const roof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
    WALLS.forEach((color, i) => instances(cube, color, walls[i]));
    instances(roof, rundown ? 0x4a423c : 0x6b4a3f, roofs);
    instances(cube, rundown ? 0x5a3a2e : 0x7a3b2e, doors);
    instances(cube, rundown ? 0x6f8794 : 0x9cc7e0, windows);
    instances(cube, rundown ? 0x8a8780 : 0x9a9a95, drives);
    instances(cube, rundown ? 0xb3ab98 : 0xffffff, pickets);
    instances(cube, rundown ? 0xb3ab98 : 0xffffff, rails);
    instances(cube, 0x5a5a5a, mailPosts);
    instances(cube, rundown ? 0x4a4f58 : 0x2a4a8a, mailboxes);
    instances(tube, rundown ? 0x5b4a3a : 0x6b4a2b, trunks);
    instances(new THREE.SphereGeometry(0.5, 10, 8), rundown ? 0x6f7a3a : 0x3f8f3f, crowns);
    if (rundown) {
      instances(cube, 0x8a6a42, boards);            // boarded-up windows
      instances(cube, 0x161616, holes);             // doorways and windows with nothing in them
      instances(cube, 0x57514b, burnt);             // burnt-out shells, sooty grey (only the gang's houses are black)
      instances(cube, 0x3a3532, burntRoofs);
      instances(cube, 0x7a6644, dirt);              // bare dirt on the lawns
      instances(cube, 0x4a3c30, branches);          // dead trees' branches
      instances(cube, 0x7a4a2a, wrecks);            // rusting wrecks
      instances(cube, 0x5a3a24, wreckTops);
      instances(new THREE.SphereGeometry(0.5, 8, 6), 0x161618, bags); // rubbish bags
      [0xd9367a, 0x2fb3d9, 0xe0d23a].forEach((color, i) => instances(cube, color, tags[i])); // graffiti
      instances(cube, 0x1c1a1f, gangWalls);           // the gang houses: black,
      instances(cube, 0xff2a2a, gangWindows, true);   // their windows glowing red,
      instances(cube, 0xc81e1e, gangDoors);           // a red door,
      instances(cube, 0xe01818, gangTags);            // a red tag across the front,
      instances(cube, 0x2a2a2a, poles);               // and a red flag on a pole,
      instances(cube, 0xe31b1b, flags);
      instances(new THREE.SphereGeometry(0.5, 10, 8), 0xff3030, beacons, true); // with a red light on top
    }
    instances(cube, 0x55595f, lampPosts);
    instances(cube, 0xfff3c4, lampHeads, true);
    // (the driveways' cars, the chimneys, bins and hedges; and the sets)
    const drab = (color) => rundown ? new THREE.Color(color).lerp(new THREE.Color(0x7a7468), 0.55).getHex() : color;
    PAINT.forEach((color, i) => instances(cube, drab(color), carBodies[i]));
    instances(cube, 0x26303a, carTops);
    instances(cube, rundown ? 0x5e4a40 : 0x8a4a3a, chimneys);
    instances(cube, rundown ? 0x3c4038 : 0x2f6b3a, bins);
    instances(cube, 0x2f6f35, hedges);
    BRICK.forEach((color, i) => instances(cube, color, shopWalls[i]));
    BRIGHT.forEach((color, i) => {
      instances(cube, color, [...awnings[i], ...stallTops[i], ...shedBands[i], ...playBars[i], ...produce[i]]);
      instances(tube, color, beds[i]);
      instances(new THREE.ConeGeometry(0.5, 1, 3).rotateX(Math.PI), color, bunting[i]);
    });
    instances(cube, 0xf4efe2, [...fascias, ...cornices, ...stallPosts]);
    instances(cube, 0x86b7d4, shopGlass);
    instances(cube, 0xb9b3a6, paving);
    instances(cube, 0x3c3f44, [...bollards, ...pylons]);
    instances(cube, 0x7a5a3a, [...benches, ...stallTables]);
    instances(cube, 0xa89f8c, cobbles);
    instances(cube, 0xcfc6b0, stone);
    instances(roof, 0x5a6a72, stoneRoofs);
    instances(tube, 0xe6e0d0, columns);
    instances(cube, 0xfbfbf4, clockFaces);
    instances(cube, 0x55585d, carParks);
    instances(cube, 0xdfe3e6, sheds);
    instances(cube, 0x24402c, [...railPosts, ...railBars]);
    instances(tube, 0x4f9ad0, ponds);
    instances(tube, 0xe9e2d0, decks);
    instances(new THREE.ConeGeometry(0.5, 1, 8), 0x9a3b2e, bandRoofs);
    instances(cube, 0x6b4a32, cattle);
    instances(cube, 0xefeadc, sheep);
    // low wooded hills out beyond the houses, all round, so the street has a horizon (each pushed out clear of every road)
    {
      const hills = [], at = {}, far = {}, shade = new THREE.Color(theme.ground);
      for (let s = Track.start + 150, k = 0; s < Track.end; s += 240, k++) for (const side of [-1, 1]) {
        const r = 70 + Math.random() * 70, h = 16 + Math.random() * 26;
        Track.toWorld(s, 0, at);
        Track.toWorld(s, side * 100, far);
        const d = Math.hypot(far.x - at.x, far.z - at.z) || 1;
        const p = clearOfRoads(at.x, at.z, (far.x - at.x) / d, (far.z - at.z) / d, 190 + Math.random() * 120 + r, r, 60);
        hills.push([p.x, p.z, r, h]);
      }
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: shade.multiplyScalar(0.78) }), hills.length);
      hills.forEach(([x, z, r, h], i) => {
        dummy.position.set(x, -0.5, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(r, h, r);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.userData.flat = true; // (a backdrop: placed clear of the roads already)
      levelGroup.add(mesh);
    }
    if (festive) {
      FAIRY.forEach((color, i) => instances(cube, color, fairy[i], true));
      instances(tube, 0x4a3426, firTrunks);
      instances(cone, 0x1f5a34, firs);
      instances(new THREE.OctahedronGeometry(0.5, 0), 0xffe066, stars, true);
      instances(new THREE.TorusGeometry(0.5, 0.14, 6, 12), 0x2e7d3a, wreaths);
    }
  } else if (theme.scenery === 'canberra') {
    // ---- canberra: gum trees in the dry grass, concrete government blocks set back from the road,
    // kangaroos, Lake Burley Griffin under each bridge with the Captain Cook jet, Black Mountain and
    // its tower off to the left, and Parliament House and its flag mast past the finish
    const trunks = [], leaves = [], blocks = [], bands = [], roos = [], heads = [];
    const gum = (at, lat) => {
      const h = 7 + Math.random() * 6;
      trunks.push([at, lat, h / 2, 0.45, h, 0.45]);
      for (let k = 0; k < 3; k++) { // (clumps of leaves, untidy, up the top of it)
        const size = 2.2 + Math.random() * 2;
        leaves.push([at + Math.random() * 2 - 1, lat + Math.random() * 2 - 1, h * (0.7 + k * 0.15), size, size * 0.7, size]);
      }
    };
    const nearLake = (s) => (LEVEL.bridges || []).some(b => s > b.from - 40 && s < b.to + 40);
    for (let s = Track.start; s < Track.end; s += 14) {
      if (nearLake(s)) continue;
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 10;
        if (roll < 0.45) gum(at, beside(side, at, 4 + Math.random() * 50));
        else if (roll < 0.5) { // a kangaroo or two, sitting up in the grass
          const lat = beside(side, at, 8 + Math.random() * 30);
          roos.push([at, lat, 0.75, 0.7, 1.3, 0.8]);
          heads.push([at + 0.3, lat, 1.55, 0.35, 0.45, 0.5]);
        }
      }
    }
    for (let s = Track.start + 60, k = 0; s < Track.end; s += 110, k++) { // concrete blocks, each side in turn
      if (nearLake(s) || nearLake(s + 40)) continue;
      const side = k % 2 ? 1 : -1, w = 26 + Math.random() * 22, h = 8 + Math.random() * 7, d = 14 + Math.random() * 10;
      const lat = beside(side, s, 28 + d / 2 + Math.random() * 25);
      blocks.push([s, lat, h / 2, d, h, w]);
      for (let y = 2.4; y < h - 1; y += 3) bands.push([s, lat, y, d + 0.1, 0.9, w + 0.1]); // (rows of windows)
    }
    instances(tube, 0xe3dccb, trunks);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x7e9468, leaves);
    instances(cube, 0xbdb6a8, blocks);
    instances(cube, 0x3e464f, bands);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x8a6a4a, roos);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x7a5c3e, heads);
    // the lake under each bridge, out to either side, and the jet (a plume of spray) on the left
    for (const b of LEVEL.bridges || []) {
      for (const side of [-1, 1]) {
        const lake = new THREE.Mesh(sideStrip(b.from - 20, b.to + 20, (q) => beside(side, q, 2), (q) => beside(side, q, 500), -0.02, 8),
          new THREE.MeshBasicMaterial({ color: 0x4f86a8, side: THREE.DoubleSide, depthWrite: false }));
        lake.renderOrder = -1;
        levelGroup.add(lake);
      }
      const jet = new THREE.Mesh(new THREE.ConeGeometry(4, 70, 12, 1, true), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
      Track.toWorld((b.from + b.to) / 2, beside(-1, (b.from + b.to) / 2, 160), tmp);
      jet.position.set(tmp.x, 35, tmp.z);
      levelGroup.add(jet);
    }
    // Black Mountain, with Telstra Tower on top: a third of the way along, off to the left
    {
      const at = Track.length / 3;
      Track.toWorld(at, beside(-1, at, 380), tmp);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(160, 70, 16), new THREE.MeshLambertMaterial({ color: 0x5f7448 }));
      hill.position.set(tmp.x, 35, tmp.z);
      const concrete = new THREE.MeshLambertMaterial({ color: 0xd8d8d2 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 120, 12), concrete);
      shaft.position.set(tmp.x, 70 + 60, tmp.z);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(9, 7, 14, 16), concrete);
      pod.position.set(tmp.x, 70 + 80, tmp.z);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 50, 8), concrete);
      mast.position.set(tmp.x, 70 + 145, tmp.z);
      levelGroup.add(hill, shaft, pod, mast);
    }
    // Parliament House, just past the end of the road: a long low front, and the flag mast on its
    // four legs over the middle, flying the flag
    {
      const at = Track.end + 140, h = Track.toWorld(at, 0, tmp);
      const house = new THREE.Group();
      const white = new THREE.MeshLambertMaterial({ color: 0xece8de });
      const front = new THREE.Mesh(new THREE.BoxGeometry(220, 14, 40), white);
      front.position.y = 7;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(60, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6f8f4a }));
      hill.scale.set(1.8, 0.35, 1.2);
      hill.position.z = 40;
      house.add(front, hill);
      const steel = new THREE.MeshLambertMaterial({ color: 0xc9ccd1 });
      for (const [x, z] of [[-14, 25], [14, 25], [-14, 55], [14, 55]]) { // the four legs, leaning in to the top
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 82, 6), steel);
        leg.position.set(x / 2, 40, (z + 40) / 2);
        leg.lookAt(0, 81, 40);
        leg.rotateX(Math.PI / 2);
        house.add(leg);
      }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 30, 6), steel);
      pole.position.set(0, 95, 40);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ color: 0x0b2a6f, side: THREE.DoubleSide }));
      flag.position.set(6, 106, 40);
      house.add(pole, flag);
      house.rotation.y = h;
      house.position.copy(tmp);
      levelGroup.add(house);
    }
  } else if (theme.scenery === 'singapore') {
    // ---- singapore: pavements, rain trees along the road, glass towers, housing blocks with bands
    // of colour and low shophouses set back from it, a grove of Supertrees, the Singapore Flyer near
    // the start and Marina Bay Sands by the finish. Nothing stands on a junction or its arms, nor on
    // another stretch of road. At night (theme.night) it is the Grand Prix: windows lit, the
    // landmarks glowing, light pylons over the road, walls and catch fences in place of the
    // pavements, and kerbs on the corners.
    const p = {}, night = !!theme.night;
    const glowMat = (color) => new THREE.MeshBasicMaterial({ color });
    // (a level with its real landmarks, "landmarks", puts them where they are, and keeps the town clear of them)
    const marks = LEVEL.landmarks || [], mark = (kind) => marks.find(l => l.kind === kind);
    const clearOf = (x, z, margin) => Track.mainDistance(x, z) > Math.max(Track.hi(0), -Track.lo(0)) + margin &&
      !marks.some(l => Math.hypot(x - l.x, z - l.z) < l.r + margin) &&
      !Track.junctions.some(jn => jn.arms.some(arm => {
        const dx = x - jn.centre.x, dz = z - jn.centre.z, u = dx * arm.dir.x + dz * arm.dir.z;
        const v = Math.abs(-dx * arm.dir.z + dz * arm.dir.x);
        return u > -jn.half - margin && u < arm.length + margin && v < jn.half + margin;
      }) || Math.hypot(x - jn.centre.x, z - jn.centre.z) < jn.half * 1.5 + margin);
    // pavements (or at night, the circuit's trackside: see circuitTrackside), broken off at each junction
    if (night) circuitTrackside(true);
    else {
      const breaks = Track.junctions.map(jn => [jn.s - 6, jn.end + 6]);
      for (const side of [-1, 1]) {
        let from = Track.start;
        for (const [a, b] of [...breaks, [Track.end, Track.end]]) {
          if (a > from) add(sideStrip(from, a, (q) => beside(side, q, 0.4), (q) => beside(side, q, 3), 0.03), flat(0xc9c7c0));
          from = b;
        }
      }
    }
    const trunks = [], canopies = [], towers = [], glass = [], blocks = [], bands = [], shops = [], roofs = [];
    // (none along a circuit's start / finish straight: the straight either side of the line)
    const straight = (q) => Math.abs(Track.bend(q)) < 0.002;
    let straightTo = 0, straightFrom = Track.length;
    if (Track.loop) {
      while (straightTo < Track.length && straight(straightTo)) straightTo += 2;
      while (straightFrom > 0 && straight(straightFrom - 1)) straightFrom -= 2;
    }
    for (let s = Track.start; s < Track.end; s += 16) {
      if (Track.loop && (s < straightTo || s > straightFrom)) continue;
      for (const side of [-1, 1]) {
        const lat = beside(side, s, 4.5);
        Track.toWorld(s, lat, p);
        if (!clearOf(p.x, p.z, 4)) continue;
        trunks.push([s, lat, 1.8, 0.5, 3.6, 0.5]);
        canopies.push([s, lat, 4.6, 9, 2.6, 9]); // (a rain tree: a wide, flat umbrella of leaves)
      }
    }
    for (let s = Track.start, k = 0; s < Track.end; s += 30, k++) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), w = 16 + Math.random() * 14, d = 16 + Math.random() * 14;
        const lat = beside(side, s, 16 + d / 2 + Math.random() * 30);
        Track.toWorld(s, lat, p);
        if (!clearOf(p.x, p.z, Math.max(w, d) / 2 + 6)) continue;
        if (roll < 0.4) { // a glass tower, with a lighter crown
          const h = 60 + Math.random() * 100;
          towers.push([s, lat, h / 2, d, h, w]);
          glass.push([s, lat, h + 2, d * 0.8, 4, w * 0.8]);
        } else if (roll < 0.8) { // a housing block, with bands of colour
          const h = 30 + Math.random() * 25;
          blocks.push([s, lat, h / 2, d * 0.7, h, w * 1.3]);
          for (let y = 3; y < h - 1; y += 6) bands.push([s, lat, y, d * 0.7 + 0.1, 0.8, w * 1.3 + 0.1]);
        } else { // a row of shophouses
          const h = 9 + Math.random() * 4;
          shops.push([s, lat, h / 2, d * 0.6, h, w]);
          roofs.push([s, lat, h + 0.6, d * 0.65, 1.2, w + 0.4]);
        }
      }
    }
    // (at night the towers are dark glass with rows of lit windows, the blocks' bands are lit
    // windows, and the shophouses glow at street level)
    if (night) {
      for (const [s, lat, , d, h, w] of towers) for (let y = 4; y < h - 2; y += 4.5) bands.push([s, lat, y, d + 0.1, 1.3, w + 0.1]);
      for (const [s, lat, , d, , w] of shops) roofs.push([s, lat, 3.2, d + 0.1, 1.6, w + 0.1]);
    }
    instances(tube, 0x6b5440, trunks);
    instances(new THREE.SphereGeometry(0.5, 10, 6), 0x4f8a3c, canopies);
    instances(cube, night ? 0x4a6582 : 0x6fa3b8, towers);
    instances(cube, night ? 0x9fd8ff : 0xe8f1f4, glass, night);
    instances(cube, night ? 0xcabd9f : 0xf1e4c9, blocks);
    instances(cube, night ? 0xffe2a0 : 0x3f8f8a, bands, night);
    instances(cube, night ? 0xd29a70 : 0xe7b48a, shops);
    instances(cube, night ? 0xffc070 : 0x9c4a3a, roofs, night);
    // a grove of Supertrees, half way along on the right: purple trunks widening up to a flat crown
    // (glowing, at night)
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7b3fa8, emissive: night ? 0x3a1060 : 0x000000 });
    const crownMat = night ? glowMat(0xff4fd8) : new THREE.MeshLambertMaterial({ color: 0xd9468f });
    for (let k = 0, tries = 0; k < (mark('gardens') ? 14 : 7) && tries < 120; tries++) {
      const at = Track.length * 0.5 + Math.random() * 120 - 60, garden = mark('gardens');
      if (garden) Object.assign(p, { x: garden.x + (Math.random() - 0.5) * garden.r * 2, y: 0, z: garden.z + (Math.random() - 0.5) * garden.r * 2 });
      else Track.toWorld(at, beside(1, at, 45 + Math.random() * 60), p);
      if (!garden && !clearOf(p.x, p.z, 12)) continue;
      const h = 22 + Math.random() * 26;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 1.2, h, 10), trunkMat);
      trunk.position.set(p.x, p.y + h / 2, p.z);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(7, 4, 2.2, 14), crownMat);
      crown.position.set(p.x, p.y + h + 1.1, p.z);
      levelGroup.add(trunk, crown);
      k++;
    }
    // Marina Bay Sands by the finish, on the left: three towers with the boat of a park across their tops
    for (let tries = 0, at = Track.length - 40; tries < 20; tries++, at -= 15) {
      const m = mark('mbs'), h = m ? (Object.assign(p, { x: m.x, y: 0, z: m.z }), m.rot) : Track.toWorld(at, beside(-1, at, 120), p);
      if (!m && !clearOf(p.x, p.z, 70)) continue;
      const fx = Math.sin(h), fz = Math.cos(h);
      const white = new THREE.MeshLambertMaterial({ color: 0xe9ecee, emissive: night ? 0x5a5648 : 0x000000 });
      for (const k of [-1, 0, 1]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(30, 190, 16), white);
        tower.position.set(p.x + fx * k * 38, p.y + 95, p.z + fz * k * 38);
        tower.rotation.y = h + Math.PI / 2;
        levelGroup.add(tower);
      }
      const park = new THREE.Mesh(new THREE.BoxGeometry(36, 7, 150), night ? glowMat(0xbfe6ff) : new THREE.MeshLambertMaterial({ color: 0xc8d4d8 }));
      park.position.set(p.x + fx * 8, p.y + 194, p.z + fz * 8);
      park.rotation.y = h;
      levelGroup.add(park);
      break;
    }
    // the Singapore Flyer near the start, off to the left: a great wheel standing side-on to the
    // road, on a pair of legs, with its capsules round the rim (lit, at night)
    for (let tries = 0, at = Math.min(260, Track.length * 0.1); tries < 20; tries++, at += 20) {
      const m = mark('flyer'), h = m ? (Object.assign(p, { x: m.x, y: 0, z: m.z }), m.rot) : Track.toWorld(at, beside(-1, at, 150), p);
      if (!m && !clearOf(p.x, p.z, 25)) continue;
      const wheel = new THREE.Group(), R = 70, HUB = 85;
      const steel = night ? glowMat(0x9fe8ff) : new THREE.MeshLambertMaterial({ color: 0xe8ecef });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 1.2, 8, 72), steel);
      rim.position.y = HUB;
      wheel.add(rim);
      for (let k = 0; k < 14; k++) { // spokes, and a capsule at the end of each... and between
        const a = k / 14 * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, R, 4), steel);
        spoke.position.set(Math.cos(a) * R / 2, HUB + Math.sin(a) * R / 2, 0);
        spoke.rotation.z = a - Math.PI / 2;
        wheel.add(spoke);
      }
      const capsuleMat = night ? glowMat(0xfff3c4) : new THREE.MeshLambertMaterial({ color: 0xbfd9e6 });
      for (let k = 0; k < 28; k++) {
        const a = k / 28 * Math.PI * 2;
        const capsule = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 2.2), capsuleMat);
        capsule.position.set(Math.cos(a) * (R + 2), HUB + Math.sin(a) * (R + 2), 0);
        wheel.add(capsule);
      }
      const legMat = new THREE.MeshLambertMaterial({ color: 0xcfd4d8 });
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, HUB / Math.cos(0.25), 8), legMat);
        leg.position.set(side * HUB * Math.tan(0.25) / 2, HUB / 2, 0);
        leg.rotation.z = side * 0.25;
        wheel.add(leg);
      }
      wheel.position.set(p.x, p.y, p.z);
      wheel.rotation.y = h - Math.PI / 2; // (its face towards the road)
      levelGroup.add(wheel);
      break;
    }
    // ...and the rest of a level's real landmarks, and its grandstands and pits
    const lit = (color, glow) => new THREE.MeshLambertMaterial({ color, emissive: night ? glow : 0x000000 });
    for (const l of marks) {
      const g = new THREE.Group();
      g.position.set(l.x, 0, l.z);
      g.rotation.y = l.rot || 0;
      const put = (geometry, material, x, y, z) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
      if (l.kind === 'bay') { // the water of Marina Bay, lights shimmering on it at night
        const water = put(new THREE.CircleGeometry(l.r, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: night ? 0x17304d : 0x2d6f96, depthWrite: false }), 0, -0.03, 0);
        water.renderOrder = -1.8;
      } else if (l.kind === 'esplanade') { // Esplanade - Theatres on the Bay: two spiky "durian" domes
        for (const [dx, r] of [[-28, 30], [30, 26]]) {
          put(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lit(0xb98d52, 0x4a3218), dx, 0, 0).scale.set(1, 0.7, 1.25);
          const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 3.5, 4), lit(0x8f6a3c, 0x2a1a0a), 90);
          const d = new THREE.Object3D();
          for (let k = 0; k < 90; k++) {
            const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3;
            d.position.set(dx + Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.7, Math.sin(a) * Math.cos(e) * r * 1.25);
            d.lookAt(dx, -r, 0);
            d.rotateX(-Math.PI / 2);
            d.updateMatrix();
            spikes.setMatrixAt(k, d.matrix);
          }
          g.add(spikes);
        }
      } else if (l.kind === 'fullerton') { // the Fullerton Hotel: a great neoclassical block, columns along its front
        put(new THREE.BoxGeometry(70, 26, 60), lit(0xe6dcc6, 0x5a4f3a), 0, 13, 0);
        put(new THREE.BoxGeometry(74, 3, 64), lit(0xd8ccb2, 0x4a4030), 0, 27.5, 0);
        for (let k = -6; k <= 6; k++) put(new THREE.CylinderGeometry(1, 1, 18, 8), lit(0xf2ecdc, 0x6a6048), k * 5, 9, 31);
        put(new THREE.BoxGeometry(14, 8, 14), lit(0xffe2a0, 0x8a6a30), 0, 33, 0); // (its lit crown)
      } else if (l.kind === 'merlion') { // the Merlion, spouting into the bay
        put(new THREE.CylinderGeometry(2.5, 3.2, 3, 10), lit(0xc9c3b6, 0x403c34), 0, 1.5, 0);
        put(new THREE.CylinderGeometry(1.6, 2.2, 5, 10), lit(0xf2f0ea, 0x6a6860), 0, 5.5, 0);
        put(new THREE.SphereGeometry(1.8, 12, 10), lit(0xf2f0ea, 0x6a6860), 0, 8.8, 0.4);
        const spout = put(new THREE.CylinderGeometry(0.3, 0.9, 9, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }), 0, 7, 5);
        spout.rotation.x = Math.PI / 2.6;
      } else if (l.kind === 'padang') { // the Padang: a green field, the pavilion at one end
        put(new THREE.PlaneGeometry(l.r * 1.6, l.r * 1.1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x3f7a3a }), 0, 0.02, 0);
        put(new THREE.BoxGeometry(40, 10, 16), lit(0xf2efe6, 0x5a5850), 0, 5, -l.r * 0.65);
        put(new THREE.BoxGeometry(44, 2, 20), lit(0x8a3a2a, 0x2a0a06), 0, 11, -l.r * 0.65);
      } else if (l.kind === 'artscience') { // the ArtScience Museum: a white lotus, its petals opening up from a round base
        const white = lit(0xf1f1ee, 0x6a6a64);
        put(new THREE.CylinderGeometry(9, 12, 6, 20), white, 0, 3, 0);
        for (let k = 0; k < 10; k++) { // (broad, rounded fingers, leaning out, some taller than the rest)
          const a = k / 10 * Math.PI * 2, half = 15 + (k % 3) * 4;
          const petal = put(new THREE.SphereGeometry(1, 14, 10), white, Math.sin(a) * (8 + half * 0.4), 4 + half * 0.9, Math.cos(a) * (8 + half * 0.4));
          petal.rotation.order = 'YXZ';
          petal.rotation.y = a;
          petal.rotation.x = 0.45;
          petal.scale.set(6.5, half, 2.4);
        }
      } else if (l.kind === 'helix') { // the Helix Bridge: a walkway over the water inside a double helix of steel (in lights, at night)
        const L = l.r * 2, deckY = 6;
        put(new THREE.BoxGeometry(6, 0.8, L), lit(0xb9bec4, 0x30343a), 0, deckY, 0);
        for (const [phase, glow] of [[0, 0x9fe8ff], [Math.PI, 0xff6fd0]]) {
          const curve = [];
          for (let k = 0; k <= 240; k++) {
            const zz = -L / 2 + L * k / 240, a = zz / 9 + phase;
            curve.push(new THREE.Vector3(Math.cos(a) * 4.5, deckY + 3.6 + Math.sin(a) * 4.5, zz));
          }
          put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 480, 0.35, 6), night ? glowMat(glow) : lit(0xdfe6ec, 0), 0, 0, 0);
        }
        for (const zz of [-L / 2 + 20, -L / 6, L / 6, L / 2 - 20]) put(new THREE.CylinderGeometry(0.9, 0.9, deckY, 8), lit(0x9aa0a6, 0x202428), 0, deckY / 2, zz);
      } else if (l.kind === 'float') { // The Float @ Marina Bay: a great steel platform on the water, its grandstand stepped up on the shore
        put(new THREE.BoxGeometry(110, 1.2, 80), lit(0x8d949b, 0x2a2e33), 0, 0.6, 0);
        put(new THREE.BoxGeometry(96, 0.1, 66), lit(0x3d7f5a, 0x0f2a1a), 0, 1.25, 0); // (its pitch)
        for (let k = 0; k < 9; k++) {
          put(new THREE.BoxGeometry(116, 1.3, 3), lit(k % 2 ? 0xd94a3a : 0xe8e8e8, k % 2 ? 0x5a1a10 : 0x5a5a5a), 0, 1.3 + k * 1.3, -44 - k * 2.8);
        }
        put(new THREE.BoxGeometry(120, 0.6, 30), lit(0xf2f2f2, 0x6a6a6a), 0, 17, -56); // (the stand's roof)
      } else if (l.kind === 'cbd' || l.kind === 'suntec') {
        // Raffles Place and the Financial Centre: the city's tallest towers, packed together (some
        // octagonal, as UOB Plaza is); or Suntec City: five towers round a ring, the Fountain of
        // Wealth in the middle, a bronze ring on four legs. Lit windows at night
        let seed = l.kind === 'cbd' ? 11 : 23;
        const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const tones = [0x5f7d99, 0x8aa1b5, 0x3f566e, 0xa9b8c4, 0x6d7f8c], windows = [];
        const tower = (x, z, w, d, ht, turn, octagonal, color) => {
          // (at night, a dark silhouette that shows through the haze, as its windows do)
          const t = put(octagonal ? new THREE.CylinderGeometry(w / 2, w / 2, ht, 8) : new THREE.BoxGeometry(w, ht, d), night ? new THREE.MeshBasicMaterial({ color: 0x1b2638, fog: false }) : lit(color, 0), x, ht / 2, z);
          t.rotation.y = turn;
          for (let y = 6; y < ht - 4; y += 7) windows.push([x, y, z, w + 0.3, d + 0.3, turn]);
          return t;
        };
        if (l.kind === 'cbd') {
          for (let k = 0; k < 26; k++) {
            const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * l.r * 0.85;
            tower(Math.sin(a) * d, Math.cos(a) * d, 22 + rand() * 18, 22 + rand() * 18, 110 + rand() * 170, rand() * 0.6, rand() < 0.2, tones[k % tones.length]);
          }
        } else {
          for (let k = 0; k < 5; k++) {
            const a = k / 5 * Math.PI * 2 + 0.3, ht = k === 4 ? 75 : 175;
            tower(Math.sin(a) * 62, Math.cos(a) * 62, 32, 30, ht, a, false, 0x7f9cb3);
            const cap = put(new THREE.ConeGeometry(22, 12, 4), lit(0x5f7d99, 0x101820), Math.sin(a) * 62, ht + 6, Math.cos(a) * 62);
            cap.rotation.y = a + Math.PI / 4;
          }
          const bronze = lit(0xb08d57, 0x4a3a1a);
          const ring = put(new THREE.TorusGeometry(11, 1.3, 8, 40), bronze, 0, 13, 0);
          ring.rotation.x = Math.PI / 2;
          for (let k = 0; k < 4; k++) {
            const a = k / 4 * Math.PI * 2, leg = put(new THREE.CylinderGeometry(0.9, 1.4, 14, 8), bronze, Math.sin(a) * 9, 6.5, Math.cos(a) * 9);
            leg.rotation.order = 'YXZ';
            leg.rotation.y = a;
            leg.rotation.x = -0.2;
          }
          put(new THREE.CylinderGeometry(0.6, 1.6, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }), 0, 7, 0);
        }
        if (night && windows.length) { // (rows of lit windows, one draw for them all)
          const lights = new THREE.InstancedMesh(cube, glowMat(0xffe2a0), windows.length), d = new THREE.Object3D();
          lights.material.fog = false; // (city lights carry far through the haze: the skyline shows from the circuit)
          windows.forEach(([x, y, z, w, dd, turn], i) => {
            d.position.set(x, y, z);
            d.rotation.set(0, turn, 0);
            d.scale.set(w, 1.4, dd);
            d.updateMatrix();
            lights.setMatrixAt(i, d.matrix);
          });
          g.add(lights);
        }
      } else if (l.kind === 'gallery') { // the National Gallery: City Hall's colonnade, and the old Supreme Court with its green dome
        const stone = lit(0xe9e2d0, 0x5a5444);
        put(new THREE.BoxGeometry(110, 24, 40), stone, -35, 12, -20);
        for (let k = -9; k <= 9; k++) put(new THREE.CylinderGeometry(1.3, 1.3, 18, 10), stone, -35 + k * 5.6, 11, 2);
        put(new THREE.BoxGeometry(112, 3, 6), stone, -35, 21.5, 2);
        put(new THREE.BoxGeometry(70, 22, 50), stone, 58, 11, -25);
        for (let k = -4; k <= 4; k++) put(new THREE.CylinderGeometry(1.2, 1.2, 15, 10), stone, 58 + k * 5.5, 8.5, 1);
        put(new THREE.CylinderGeometry(12, 12, 10, 20), stone, 58, 27, -25);
        put(new THREE.SphereGeometry(12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lit(0x6f9c8a, 0x1a3a30), 58, 32, -25);
      } else if (l.kind === 'domes') { // Gardens by the Bay's conservatories: the Flower Dome and the taller Cloud Forest, glass on steel ribs
        for (const [dx, dz, rx, ry, rz] of [[-45, 0, 55, 30, 40], [52, 10, 38, 44, 32]]) {
          const shell = new THREE.MeshLambertMaterial({ color: 0xbfe3ef, transparent: true, opacity: 0.5, emissive: night ? 0x2a5a6a : 0x000000, depthWrite: false });
          put(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), lit(0x4f8a3c, 0x0a2a0a), dx, 0, dz).scale.set(rx * 0.7, ry * 0.55, rz * 0.7); // (the gardens inside)
          put(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), shell, dx, 0, dz).scale.set(rx, ry, rz);
          put(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: night ? 0x9fe8ff : 0x7d8790, wireframe: true, fog: !night }), dx, 0, dz).scale.set(rx * 1.01, ry * 1.01, rz * 1.01);
        }
      }
      levelGroup.add(g);
    }
    grandstands(night);
  } else if (theme.scenery === 'montreal') {
    // ---- montreal: Circuit Gilles-Villeneuve on Île Notre-Dame: the circuit's trackside (walls, catch
    // fences, kerbs), its grandstands and the pits, parkland all round, and each where it really is
    // (the level's "landmarks"): the St Lawrence round the island, the Olympic rowing basin, the
    // Casino, the Biosphère's dome, and the city's towers across the river with Mount Royal behind
    circuitTrackside(false);
    grandstands(false);
    const marks = LEVEL.landmarks || [], p = {};
    const roadHalf = Math.max(Track.hi(0), -Track.lo(0));
    const inMark = (l, x, z, margin) => { // (is that point on the landmark, or within margin of it?)
      const dx = x - l.x, dz = z - l.z;
      if (l.kind === 'basin') {
        const ux = Math.sin(l.rot), uz = Math.cos(l.rot);
        return Math.abs(dx * ux + dz * uz) < l.r + margin && Math.abs(dx * uz - dz * ux) < l.w + margin;
      }
      return Math.hypot(dx, dz) < l.r + margin;
    };
    const clearOf = (x, z, margin) => Track.mainDistance(x, z) > roadHalf + margin && !marks.some(l => inMark(l, x, z, margin));
    const water = new THREE.MeshLambertMaterial({ color: 0x2f6f8e });
    for (const l of marks) {
      const g = new THREE.Group();
      g.position.set(l.x, 0, l.z);
      g.rotation.y = l.rot || 0;
      const put = (geo, mat, x, y, z) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
      if (l.kind === 'river') { // the St Lawrence, round the island
        put(new THREE.CircleGeometry(l.r, 72).rotateX(-Math.PI / 2), water, 0, -0.02, 0);
      } else if (l.kind === 'basin') { // the Olympic rowing basin: a long, straight strip of water, its lanes buoyed
        put(new THREE.PlaneGeometry(l.w * 2, l.r * 2).rotateX(-Math.PI / 2), water, 0, -0.02, 0);
        for (let k = -2; k <= 2; k++) put(new THREE.BoxGeometry(0.4, 0.1, l.r * 2 - 40), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }), k * l.w * 0.3, 0.02, 0);
        put(new THREE.BoxGeometry(14, 16, 10), new THREE.MeshLambertMaterial({ color: 0xe6e8ea }), l.w + 12, 8, -l.r + 30); // the finish tower
      } else if (l.kind === 'casino') { // the Casino (once France's pavilion at Expo 67): white tiers, glass between, gold fins
        const white = new THREE.MeshLambertMaterial({ color: 0xf0f0ec }), glass = new THREE.MeshLambertMaterial({ color: 0x5f86a3 });
        const gold = new THREE.MeshLambertMaterial({ color: 0xd9b45a });
        put(new THREE.BoxGeometry(90, 10, 56), white, 0, 5, 0);
        put(new THREE.BoxGeometry(78, 14, 46), glass, 0, 17, 0);
        put(new THREE.BoxGeometry(66, 6, 40), white, 0, 27, 0);
        put(new THREE.BoxGeometry(48, 10, 30), glass, 0, 35, 0);
        for (let k = -3; k <= 3; k++) {
          const fin = put(new THREE.BoxGeometry(1.4, 36, 3), gold, k * 13, 18, 29);
          fin.rotation.z = 0.25 * Math.sign(k);
        }
      } else if (l.kind === 'biosphere') { // the Biosphère: Buckminster Fuller's geodesic dome, a lattice round a glassy sphere
        put(new THREE.IcosahedronGeometry(l.r, 3), new THREE.MeshBasicMaterial({ color: 0xdfe5ea, wireframe: true }), 0, l.r * 0.55, 0);
        put(new THREE.SphereGeometry(l.r * 0.97, 32, 20), new THREE.MeshLambertMaterial({ color: 0x9fb8cc, transparent: true, opacity: 0.45 }), 0, l.r * 0.55, 0);
      } else if (l.kind === 'skyline') { // the city across the river: towers along its waterfront, Mount Royal behind
        let seed = 7;
        const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const tones = [0x7d8a99, 0x9aa6b3, 0x5d6b7c, 0xb9c2cc, 0x4f5966].map(c => new THREE.MeshLambertMaterial({ color: c }));
        for (let k = 0; k < 34; k++) {
          const h = 40 + Math.pow(rand(), 1.6) * 170, w = 18 + rand() * 22;
          put(new THREE.BoxGeometry(w, h, w * (0.7 + rand() * 0.6)), tones[k % tones.length], (rand() - 0.5) * l.r * 2, h / 2, -rand() * 160);
        }
        const hill = put(new THREE.SphereGeometry(700, 32, 16), new THREE.MeshLambertMaterial({ color: 0x4f7d43 }), 0, -40, -900);
        hill.scale.y = 0.32;
      }
      levelGroup.add(g);
    }
    // the parkland: broadleaf trees all over the island, in clumps of every shade of green (none on
    // the straight either side of the start line, where the stands and the pits are)
    const straight = (q) => Math.abs(Track.bend(q)) < 0.002;
    let straightTo = 0, straightFrom = Track.length;
    while (straightTo < Track.length && straight(straightTo)) straightTo += 2;
    while (straightFrom > 0 && straight(straightFrom - 1)) straightFrom -= 2;
    const trunks = [], greens = [[], [], []];
    for (let s = Track.start; s < Track.end; s += 9) {
      if (s < straightTo + 40 || s > straightFrom - 40) continue;
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const lat = beside(side, s, 9 + Math.random() * 70 + k * 25), at = s + Math.random() * 8;
          Track.toWorld(at, lat, p);
          if (!clearOf(p.x, p.z, 6)) continue;
          const size = 5 + Math.random() * 5;
          trunks.push([at, lat, 1.6, 0.6, 3.2, 0.6]);
          greens[Math.floor(Math.random() * 3)].push([at, lat, 3.2 + size * 0.45, size, size * 0.9, size]);
        }
      }
    }
    instances(tube, 0x5a4330, trunks);
    const leaf = new THREE.IcosahedronGeometry(0.5, 1);
    [0x3f7f36, 0x4f8f3f, 0x6a9a44].forEach((color, i) => instances(leaf, color, greens[i]));
  } else if (theme.scenery === 'zones') {
    buildZones(beside, instances, add, flat, { cube, tube, cone }, sideStrip);
  } else if (theme.scenery === 'construction') {
    // ---- construction: orange barrier fencing along both sides, and beyond it the site: tower
    // cranes, the steel frames of buildings going up, site huts, heaps of gravel, stacks of pipes,
    // floodlights on masts
    const kinds = { fence: [], post: [], mast: [], lamp: [], frame: [], floor: [], hut: [], gravel: [], pipe: [], craneMast: [], jib: [], counter: [],
      jersey: [], waterRed: [], waterWhite: [], skip: [], pallet: [], brick: [], rebar: [], timber: [], spool: [], hivis: [], skin: [], hat: [],
      beacon: [], bags: [], scaffold: [], plank: [], genset: [], dirt: [], drum: [], mixer: [] };
    const sphereGeo = new THREE.SphereGeometry(0.5, 10, 8);
    for (let s = Track.start; s < Track.end; s += 2.5) {
      for (const side of [-1, 1]) {
        kinds.fence.push([s + 1.25, beside(side, s, 1.5), 0.6, 0.05, 1.1, 2.5]);
        kinds.post.push([s, beside(side, s, 1.5), 0.6, 0.12, 1.2, 0.12]);
      }
    }
    for (let s = 60; s < Track.end; s += 120) {
      for (const side of [-1, 1]) {
        const lat = beside(side, s + side * 30, 6);
        kinds.mast.push([s + side * 30, lat, 6, 0.3, 12, 0.3]);
        kinds.lamp.push([s + side * 30, lat, 12.2, 1.6, 0.6, 0.8]);
      }
    }
    // (a level's quarries, LEVEL.quarries { from, to, side }: see below. The site's big things keep out of them)
    const quarries = (LEVEL.quarries || []).map(q => ({ ...q, sg: q.side === 'left' ? -1 : 1 }));
    const inQuarry = (s, side) => quarries.some(q => q.sg === side && s > q.from - 40 && s < q.to + 40);
    for (let s = 40; s < Track.end; s += 90 + Math.random() * 70) {
      const side = Math.random() < 0.5 ? -1 : 1, d = 25 + Math.random() * 40, lat = beside(side, s, d), r = Math.random();
      if (inQuarry(s, side)) continue;
      if (r < 0.35) { // a steel frame going up: columns and floor beams, a few storeys
        const floors = 3 + Math.floor(Math.random() * 5), w = 18, dd = 14;
        for (const [x, z] of [[-w / 2, -dd / 2], [w / 2, -dd / 2], [-w / 2, dd / 2], [w / 2, dd / 2], [0, -dd / 2], [0, dd / 2]]) {
          kinds.frame.push([s + x, lat + z, floors * 1.75, 0.35, floors * 3.5, 0.35]);
        }
        for (let f = 1; f <= floors; f++) {
          kinds.frame.push([s, lat - dd / 2, f * 3.5, 0.3, 0.35, w], [s, lat + dd / 2, f * 3.5, 0.3, 0.35, w]);
          if (f < floors - 1) kinds.floor.push([s, lat, f * 3.5 - 0.2, dd, 0.25, w]);
        }
      } else if (r < 0.55) { // a tower crane, its jib out over the site
        const h = 30 + Math.random() * 15;
        kinds.craneMast.push([s, lat, h / 2, 1.4, h, 1.4]);
        kinds.jib.push([s, lat, h + 0.6, 0.9, 1.2, 40]);
        kinds.counter.push([s - 12, lat, h - 0.6, 2.4, 2.4, 3]);
      } else if (r < 0.75) { // site huts, stacked
        kinds.hut.push([s, lat, 1.3, 2.6, 2.6, 7], [s + 8, lat, 1.3, 2.6, 2.6, 7], [s + 4, lat, 3.9, 2.6, 2.6, 7]);
      } else if (r < 0.9) { // heaps of gravel
        for (let k = 0; k < 3; k++) kinds.gravel.push([s + k * 7, lat + Math.random() * 4, 1.6, 6, 3.2, 6]);
      } else { // concrete manhole rings, stacked
        for (let k = 0; k < 4; k++) for (let y = 0; y < 1 + (k % 2); y++) kinds.pipe.push([s + k * 2.4, lat, 0.75 + y * 1.5, 2, 1.5, 2]);
      }
    }
    // right by the road, between the fence and the site: the clutter of the job, close enough to
    // read at speed. (Every so often a line of barriers along the fence; and beacons on its posts.)
    for (let s = Track.start + 10; s < Track.end; s += 5 + Math.random() * 6) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.15) continue;
        const d = 3 + Math.random() * 14, at = s + Math.random() * 4, lat = beside(side, at, d), r = Math.random();
        if (r < 0.1) { // a skip, piled with rubble
          kinds.skip.push([at, lat, 0.75, 2, 1.5, 4]);
          kinds.dirt.push([at, lat, 1.6, 1.6, 0.8, 3]);
        } else if (r < 0.2) { // pallets of bricks
          for (let k = 0; k < 2; k++) {
            kinds.pallet.push([at + k * 1.4, lat, 0.08, 1.2, 0.16, 1.2]);
            kinds.brick.push([at + k * 1.4, lat, 0.6, 1.1, 0.9, 1.1]);
          }
        } else if (r < 0.28) { // a bundle of rebar
          for (let k = 0; k < 6; k++) kinds.rebar.push([at, lat + (k % 3) * 0.12, 0.08 + Math.floor(k / 3) * 0.12, 0.08, 0.08, 6]);
        } else if (r < 0.36) { // a stack of timber
          for (let y = 0; y < 4; y++) kinds.timber.push([at, lat, 0.12 + y * 0.22, 1.3, 0.2, 4.8]);
        } else if (r < 0.43) { // cable drums
          kinds.spool.push([at, lat, 0.7, 1.6, 1.4, 1.6], [at + 2, lat + 0.4, 0.5, 1.2, 1.0, 1.2]);
        } else if (r < 0.55) { // workers in hi-vis and hard hats, standing about
          for (let k = 0; k < 1 + Math.floor(Math.random() * 3); k++) {
            const wl = lat + k * 0.9, ws = at + Math.random() * 2;
            kinds.hivis.push([ws, wl, 1.05, 0.5, 1.1, 0.35]);
            kinds.drum.push([ws, wl, 0.4, 0.22, 0.8, 0.22]);           // (legs, in dark trousers)
            kinds.skin.push([ws, wl, 1.78, 0.3, 0.32, 0.3]);
            kinds.hat.push([ws, wl, 2.0, 0.38, 0.14, 0.38]);
          }
        } else if (r < 0.63) { // sandbags
          for (let k = 0; k < 5; k++) kinds.bags.push([at + k * 0.7, lat, 0.15 + (k % 2) * 0.25, 0.6, 0.3, 0.65]);
        } else if (r < 0.7) { // a generator
          kinds.genset.push([at, lat, 0.7, 1.4, 1.4, 2.6]);
        } else if (r < 0.78) { // scaffolding, two storeys, boards across
          for (const [x, z] of [[-1, -2], [1, -2], [-1, 2], [1, 2]]) kinds.scaffold.push([at + z, lat + x, 3, 0.1, 6, 0.1]);
          for (const y of [3, 6]) kinds.plank.push([at, lat, y, 2.2, 0.08, 4.4]);
        } else if (r < 0.85) { // a cement mixer
          kinds.genset.push([at, lat, 0.5, 1.0, 1.0, 1.2]);
          kinds.mixer.push([at, lat, 1.4, 1.1, 1.1, 1.1]);
        } else { // a heap of spoil
          kinds.dirt.push([at, lat, 0.9, 4, 1.8, 5]);
        }
      }
    }
    for (let s = Track.start + 30; s < Track.end; s += 160 + Math.random() * 120) { // lines of barriers along the fence
      const side = Math.random() < 0.5 ? -1 : 1, water = Math.random() < 0.5;
      for (let k = 0; k < 12; k++) {
        const at = s + k * 2.1, lat = beside(side, at, 0.6);
        if (water) (k % 2 ? kinds.waterWhite : kinds.waterRed).push([at, lat, 0.5, 0.5, 1.0, 2]);
        else kinds.jersey.push([at, lat, 0.4, 0.6, 0.8, 2]);
      }
    }
    for (let s = Track.start; s < Track.end; s += 25) for (const side of [-1, 1]) kinds.beacon.push([s, beside(side, s, 1.5), 1.35, 0.18, 0.18, 0.18]);
    const colours = { fence: 0xff7a1a, post: 0xd8d8d8, mast: 0x8a8f96, lamp: 0xfff4c8, frame: 0xb04a2a, floor: 0x9a9a96, hut: 0xe8e2d4,
      jersey: 0xb9b6ae, waterRed: 0xd8342a, waterWhite: 0xf2f2f2, skip: 0xf2b51c, pallet: 0x9a7a4e, brick: 0xa8503a, rebar: 0x7a4a2c,
      timber: 0xd4b07a, spool: 0x8a6a45, hivis: 0xff8a1a, skin: 0xe0b48c, hat: 0xf6e12a, beacon: 0xffa21a, bags: 0xb8a77a,
      scaffold: 0x9aa3ab, plank: 0xb8925a, genset: 0x3f7d3a, dirt: 0x7a6248, drum: 0x2c3440, mixer: 0xe86a1e,
      gravel: 0x9c968a, pipe: 0xb5b0a6, craneMast: 0xf2c21a, jib: 0xf2c21a, counter: 0x8a8f96 };
    // ---- quarries: a gravel floor by the road, and beyond it the rock face cut back in benches, each
    // higher than the last, banded in the rock's colours; on the floor heaps of crushed stone, the
    // crusher with its conveyor up to the biggest heap, and haul trucks parked up
    const Q = CONFIG.quarry;
    Object.assign(kinds, { qFloor: [], benchA: [], benchB: [], stone: [], crusher: [], hopper: [], haul: [], haulCab: [], tyre: [] });
    for (const q of quarries) {
      const floorTo = q.floor ?? Q.floorTo; // (a quarry whose face comes close in to the road has only a ledge of a floor)
      for (let s = q.from; s < q.to; s += 10) kinds.qFloor.push([s + 5, beside(q.sg, s + 5, (Q.floorFrom + floorTo) / 2), 0.03, floorTo - Q.floorFrom, 0.06, 10.4]);
      for (let k = 0; k < Q.benches; k++) {
        const d = floorTo + k * Q.benchDepth + Q.benchDepth / 2;
        // (each bench set back a little at the quarry's ends; not where another stretch of the same quarry runs on)
        const joinsBefore = quarries.some(o => o !== q && o.sg === q.sg && o.to === q.from), joinsAfter = quarries.some(o => o !== q && o.sg === q.sg && o.from === q.to);
        for (let s = q.from + (joinsBefore ? 0 : k * 8); s < q.to - (joinsAfter ? 0 : k * 8); s += 6) {
          const h = (k + 1) * Q.benchHeight + Math.random() * 0.8;
          (k % 2 ? kinds.benchB : kinds.benchA).push([s + 3, beside(q.sg, s + 3, d), h / 2, Q.benchDepth + 0.2, h, 6.3]);
        }
      }
      // the hill the face is cut into: land rising behind the benches to the height of the top one, running on
      // back from there (Q.hill.top m) before it falls away (over Q.hill.back m), and sloping down to the ground
      // past each end of the quarry (over Q.hill.ends m). Under the benches it climbs with them, inside them
      {
        const HL = Q.hill, top = Q.benches * Q.benchHeight, dTop = floorTo + Q.benches * Q.benchDepth;
        const joined = (at) => quarries.some(o => o !== q && o.sg === q.sg && (o.to === at || o.from === at)); // (another stretch of the same quarry runs on from there)
        const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
        const along = (s) => Math.min(joined(q.from) ? 1 : ease((s - (q.from - HL.ends)) / (HL.ends + 16)), joined(q.to) ? 1 : ease(((q.to + HL.ends) - s) / (HL.ends + 16)));
        const across = [floorTo, dTop, dTop + HL.top * 0.5, dTop + HL.top, dTop + HL.top + HL.back * 0.5, dTop + HL.top + HL.back];
        const rise = (d) => d <= dTop ? (d - floorTo) / (dTop - floorTo) : 1 - ease((d - dTop - HL.top) / HL.back);
        const from = joined(q.from) ? q.from : q.from - HL.ends, to = joined(q.to) ? q.to : q.to + HL.ends;
        const pos = [], idx = [], rows = Math.ceil((to - from) / 10);
        for (let r = 0; r <= rows; r++) {
          const s = Math.min(to, from + r * 10);
          // (no hill where another road runs through where it would stand: it is level ground there)
          let open = 1;
          for (let d = floorTo; open && d <= across[across.length - 1]; d += 4) {
            Track.toWorld(s, beside(q.sg, s, d), tmp);
            if (!offRoads(tmp.x, tmp.z, 6)) open = 0;
          }
          across.forEach((d, c) => {
            Track.toWorld(s, beside(q.sg, s, d), tmp);
            pos.push(tmp.x, tmp.y - 0.05 + top * along(s) * rise(d) * open, tmp.z);
            if (r && c) {
              const a = (r - 1) * across.length + c - 1, b = a + 1, e = r * across.length + c - 1, f = e + 1;
              idx.push(a, e, b, b, e, f);
            }
          });
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        levelGroup.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: HL.colour, side: THREE.DoubleSide })));
      }
      if (floorTo - Q.floorFrom < 25) continue; // (no room on the floor for the works)
      for (let s = q.from + 30; s < q.to - 20; s += 55 + Math.random() * 30) { // heaps of crushed stone
        const h = 4 + Math.random() * 4;
        kinds.stone.push([s, beside(q.sg, s, Q.floorFrom + 8 + Math.random() * (Q.floorTo - Q.floorFrom - 16)), h / 2, h * 2.4, h, h * 2.4]);
      }
      const mid = (q.from + q.to) / 2, crushD = Q.floorTo - 6; // the crusher, and its conveyor up to the big heap
      kinds.crusher.push([mid, beside(q.sg, mid, crushD), 3, 6, 6, 8]);
      kinds.hopper.push([mid, beside(q.sg, mid, crushD), 7, 4, 2, 5]);
      const heapS = mid + 26, heapD = Q.floorFrom + 10;
      kinds.stone.push([heapS, beside(q.sg, heapS, heapD), 4.5, 20, 9, 20]);
      const a = {}, b = {};
      Track.toWorld(mid, beside(q.sg, mid, crushD), a); a.y += 6;
      Track.toWorld(heapS, beside(q.sg, heapS, heapD), b); b.y += 9.5;
      const belt = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)), new THREE.MeshLambertMaterial({ color: 0x3a3d42 }));
      belt.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      belt.lookAt(b.x, b.y, b.z);
      levelGroup.add(belt);
      for (let k = 0; k < 2; k++) { // haul trucks, parked up on the floor
        const ts = q.from + 40 + k * 24 + Math.random() * 20, td = Q.floorFrom + 6 + k * 5;
        kinds.haul.push([ts, beside(q.sg, ts, td), 2.6, 4, 2.4, 8]);
        kinds.haulCab.push([ts + 4.2, beside(q.sg, ts + 4.2, td), 2.9, 2.6, 2.2, 2]);
        for (const [dz, dx] of [[-2.6, -1.9], [-2.6, 1.9], [2.8, -1.9], [2.8, 1.9]]) kinds.tyre.push([ts + dz, beside(q.sg, ts + dz, td) + dx, 1.2, 2.4, 0.9, 2.4]);
      }
    }
    Object.assign(colours, { qFloor: 0xb5ab98, benchA: 0x9a9182, benchB: 0x7f786c, stone: 0xa9a092, crusher: 0x5f646b, hopper: 0xf2b51c,
      haul: 0xf2c21a, haulCab: 0x2c3440, tyre: 0x1c1c1c });
    for (const [name, list] of Object.entries(kinds)) {
      instances(name === 'gravel' || name === 'dirt' || name === 'stone' ? cone : name === 'pipe' || name === 'spool' ? tube : name === 'mixer' || name === 'skin' ? sphereGeo : cube,
        colours[name], list, name === 'lamp' || name === 'beacon' || name === 'hivis');
    }
    // "ROAD WORK" signs, yellow diamonds on posts beside the road, every so often, facing the player
    for (let s = 40; s < Track.end; s += 260) {
      const side = (s / 260) % 2 < 1 ? 1 : -1, h = Track.toWorld(s, beside(side, s, 1.2), tmp);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), new THREE.MeshLambertMaterial({ color: 0x9a9da3 }));
      post.position.set(tmp.x, tmp.y + 1.2, tmp.z);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: roadWorkSign(), transparent: true, side: THREE.DoubleSide }));
      sign.position.set(tmp.x, tmp.y + 3.0, tmp.z);
      sign.rotation.y = h + Math.PI;
      sign.userData.text = true;
      if (Track.mirrored) sign.scale.x = -1;
      levelGroup.add(post, sign);
    }
  } else if (theme.scenery === 'airport') {
    // ---- airport: the perimeter road past the terminal, through the fence onto the runway --------
    // Before the turn: a fence along both sides; buildings close by on both sides (offices, cargo
    // sheds), the terminal further out on the right, the apron on the left with hangars and fuel
    // tanks out beyond it. The runway (LEVEL.runway): wide concrete with a runway's markings in
    // place of lanes (see inJunction), edge lights, and hangars and terminal piers beyond its edges.
    // Nothing on the old road carrying straight on where the route turns off, nor by the buildings
    // that blow up (both: see render/wreckage.js), nor where the parked airliners stand.
    // (on a level with no tower to turn at, nor a runway: the perimeter road all the way)
    const T = LEVEL.tower, R = LEVEL.runway, turn = T ? T.at : Track.end, runway = R ? R.from : Infinity, RW = R ? R.width : 0;
    const stubFrom = {}, h = T ? Track.toWorld(T.at, 0, stubFrom) : 0;
    const offStub = (s, lat) => { // (clear of the old road and the fallen tower)
      if (!T) return true;
      Track.toWorld(s, lat, tmp);
      const dx = tmp.x - stubFrom.x, dz = tmp.z - stubFrom.z, along = dx * Math.sin(h) + dz * Math.cos(h);
      const side = -(dx * Math.cos(h) - dz * Math.sin(h)); // (to the right of it)
      return along < -10 || along > T.stub + 10 || side < -100 || side > 50;
    };
    const blasts = (LEVEL.wreckage || []).filter(e => e.kind === 'blast');
    const free = (s, side, d) => !blasts.some(e => (e.from === 'left' ? -1 : 1) === side && Math.abs(e.at - s) < 45) &&
      !(side < 0 && s < turn && (LEVEL.parkedPlanes || []).some(p => Math.abs(p.s - s) < 50)) && offStub(s, beside(side, s, d));
    const kinds = { post: [], rail: [], terminal: [], glass: [], bridge: [], hangar: [], roof: [], tank: [], light: [], apron: [],
      office: [], windows: [], shed: [], door: [], pier: [] };
    for (let s = Track.start; s < Math.min(turn, Track.end); s += 4) {
      for (const side of [-1, 1]) {
        const lat = beside(side, s, 2);
        kinds.post.push([s, lat, 1.2, 0.12, 2.4, 0.12]);
        kinds.rail.push([s + 2, lat, 2.3, 0.05, 0.05, 4]);
        kinds.rail.push([s + 2, lat, 1.2, 0.05, 0.05, 4]);
      }
    }
    for (let s = 60; s < turn - 60; s += 140) { // the terminal, in sections, with a jet bridge each
      if (!offStub(s, Track.hi(s) + 60)) continue;
      const lat = beside(1, s, 75);
      kinds.terminal.push([s, lat, 7, 30, 14, 120]);
      kinds.glass.push([s, lat, 8, 30.4, 6, 118]);
      kinds.bridge.push([s, beside(1, s, 52), 4, 16, 3, 3]);
    }
    for (let s = 200; s < turn - 100; s += 380) { // hangars and fuel tanks, out beyond the apron
      const lat = beside(-1, s, 140 + Math.random() * 40);
      kinds.hangar.push([s, lat, 10, 60, 20, 50]);
      kinds.roof.push([s, lat, 21, 62, 3, 52]);
      for (let k = 0; k < 3; k++) kinds.tank.push([s + 120 + k * 22, beside(-1, s, 70), 6, 16, 12, 16]);
    }
    kinds.apron.push([Math.min(turn, Track.end) / 2, beside(-1, turn / 2, 45), -0.02, 80, 0.04, Math.min(turn, Track.end)]);
    // buildings close by along both sides, all the way: offices with bands of windows, and cargo
    // sheds with roller doors; along the runway, out beyond its concrete, hangars and terminal piers
    for (let s = 30; s < Track.end - 30; s += 55 + Math.random() * 35) {
      for (const side of [-1, 1]) {
        if (s > turn - 80 && s < runway + 40) continue; // (the turn onto the runway: open ground)
        const onRunway = s >= runway, d0 = onRunway ? RW + 18 : 14 + Math.random() * 8;
        if (!free(s, side, d0 + 10)) continue;
        const r = Math.random();
        if (onRunway && r < 0.4) { // a hangar, its doors to the runway
          const d = d0 + 25, lat = beside(side, s, d);
          kinds.hangar.push([s, lat, 9, 50, 18, 45]);
          kinds.roof.push([s, lat, 19, 52, 2.5, 47]);
        } else if (onRunway && r < 0.6) { // a terminal pier, glass-fronted
          const lat = beside(side, s, d0 + 12);
          kinds.pier.push([s, lat, 5, 20, 10, 45]);
          kinds.glass.push([s, lat, 6, 20.4, 4, 44]);
        } else if (r < 0.55) { // an office block
          const w = 18 + Math.random() * 18, dd = 12 + Math.random() * 8, ht = 10 + Math.random() * 16, lat = beside(side, s, d0 + dd / 2);
          kinds.office.push([s, lat, ht / 2, dd, ht, w]);
          for (let y = 3; y < ht - 1.5; y += 3.5) kinds.windows.push([s, lat, y, dd + 0.2, 1.4, w + 0.2]);
        } else { // a cargo shed
          const w = 30 + Math.random() * 20, dd = 18, lat = beside(side, s, d0 + dd / 2);
          kinds.shed.push([s, lat, 4.5, dd, 9, w]);
          for (let k = -1; k <= 1; k++) kinds.door.push([s + k * w * 0.28, beside(side, s, d0 - 0.1), 3, 0.2, 6, 6]);
        }
      }
    }
    if (R) {
      // the runway: one sweep of concrete over the road and well out either side, with a runway's
      // markings in place of lanes: edge lines, the threshold's stripes and its number, touchdown
      // zone bars and the aiming point, and dashes down the centre line; lights along its edges
      const lo = (q) => Track.lo(q) - RW, hi = (q) => Track.hi(q) + RW, mid = (q) => (Track.lo(q) + Track.hi(q)) / 2;
      const concrete = flat(0x6c6f73);
      concrete.polygonOffset = true;
      concrete.polygonOffsetFactor = -1;
      concrete.polygonOffsetUnits = -1;
      add(buildStrip(runway - 20, Track.end, lo, hi, 0.004, 8), concrete);
      const paint = (from, to, lat, width) => add(buildStrip(from, to, (q) => mid(q) + lat - width / 2, (q) => mid(q) + lat + width / 2, 0.02, 4), lineMat);
      for (const side of [-1, 1]) {
        const edge = (q) => side < 0 ? lo(q) + 1.5 : hi(q) - 1.5;
        add(buildStrip(runway, Track.end, (q) => edge(q) - 0.45, (q) => edge(q) + 0.45, 0.02, 8), lineMat);
        for (let q = runway; q < Track.end; q += 30) kinds.light.push([q, beside(side, q, RW - 0.5), 0.3, 0.4, 0.4, 0.4]);
        for (let j = 0; j < 6; j++) paint(runway + 10, runway + 40, side * (2.7 + j * 3.6), 1.8);          // the threshold
        for (const [at, bars] of [[150, 3], [450, 2], [600, 1]]) {                                      // touchdown zone
          for (let k = 0; k < bars; k++) paint(runway + at, runway + at + 22, side * (5 + k * 3), 1.8);
        }
        paint(runway + 300, runway + 345, side * 9, 7);                                                 // aiming point
      }
      for (let q = runway + 110; q < Track.end - 30; q += 50) paint(q, q + 30, 0, 0.9);                 // centre line
      // the runway's number, "27", read from the threshold
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const g = canvas.getContext('2d');
      g.fillStyle = '#f2f2f2';
      g.font = 'bold 400px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('27', 256, 270);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const number = new THREE.Mesh(new THREE.PlaneGeometry(18, 18).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      const nh = Track.toWorld(runway + 62, mid(runway + 62), tmp);
      number.position.set(tmp.x, tmp.y + 0.03, tmp.z);
      number.rotation.y = nh + Math.PI; // (its top furthest away, as a pilot coming in reads it)
      levelGroup.add(number);
    }
    const colours = { post: 0x8a8f96, rail: 0x9aa0a6, terminal: 0xcfd3d6, glass: 0x35576a, bridge: 0xa9aeb3, hangar: 0x9ba3a8,
      roof: 0x6f777d, tank: 0xe4e2dc, light: 0xffe08a, apron: 0x8d9196, office: 0xb9b2a6, windows: 0x2f3e4a, shed: 0x8e9aa4,
      door: 0x5d6770, pier: 0xd8dcdf };
    for (const [name, list] of Object.entries(kinds)) {
      instances(name === 'tank' ? tube : cube, colours[name], list.filter(([q, lat]) => offStub(q, lat)), name === 'light');
    }
  } else if (theme.scenery === 'bathurst') {
    // ---- bathurst: Mount Panorama: the circuit's trackside (walls, catch fences, kerbs), the pits and
    // grandstands, and gum trees standing on the hill all round (never on the road). As an everyday road
    // (theme.roadside: Panorama Avenue), white guide posts along both edges instead, the bush thicker, and
    // sandstone rocks in the grass
    const trunks = [], clumps = [], rocks = [], p = {}, spot = new THREE.Object3D();
    if (theme.roadside) {
      const posts = [], reflectors = [];
      for (let s = Track.start; s < Track.end; s += 25) for (const side of [-1, 1]) {
        posts.push([s, beside(side, s, 0.6), 0.55, 0.14, 1.1, 0.14]);
        reflectors.push([s, beside(side, s, 0.6), 0.95, 0.15, 0.12, 0.15]);
      }
      instances(cube, 0xf2f2ee, posts);
      instances(cube, 0xd8261b, reflectors, true);
    } else {
      circuitTrackside(false);
      grandstands(false);
    }
    const roadHalf = Math.max(Track.hi(0), -Track.lo(0));
    for (let s = Track.start; s < Track.end; s += theme.roadside ? 5 : 7) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.3) continue;
        const d = (theme.roadside ? 6 : 9) + Math.random() * 70;
        if (outbackYard(theme, s, side, d)) continue; // (a roadhouse's forecourt, a siding, a homestead's yard: see themes/extras.js)
        Track.toWorld(s + Math.random() * 6, beside(side, s, d), p);
        if (Track.mainDistance(p.x, p.z) < roadHalf + (theme.roadside ? 4 : 7) || !offRoads(p.x, p.z, 3)) continue;
        const y = terrainAt(p.x, p.z), h = 9 + Math.random() * 9;
        if (theme.roadside && Math.random() < 0.12) { // (a sandstone rock, half sunk in the grass)
          const w = 1.5 + Math.random() * 3;
          rocks.push([p.x, y + w * 0.15, p.z, w, w * 0.55, w * (0.8 + Math.random() * 0.6)]);
          continue;
        }
        trunks.push([p.x, y + h * 0.3, p.z, 0.5, h * 0.6, 0.5]); // (pale, and bare a long way up)
        for (let k = 0; k < 3; k++) {
          const w = 3 + Math.random() * 3;
          clumps.push([p.x + Math.random() * 3 - 1.5, y + h * (0.62 + k * 0.14), p.z + Math.random() * 3 - 1.5, w, w * 0.6, w]);
        }
      }
    }
    const placed = (geometry, color, list) => { // (like instances(), but at world points, not road ones)
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color }), list.length);
      list.forEach(([x, y, z, sx, sy, sz], i) => {
        spot.position.set(x, y, z);
        spot.scale.set(sx, sy, sz);
        spot.updateMatrix();
        mesh.setMatrixAt(i, spot.matrix);
      });
      levelGroup.add(mesh);
    };
    placed(tube, 0xd9cfbf, trunks);
    placed(new THREE.SphereGeometry(0.5, 8, 6), 0x7a8f62, clumps);
    if (rocks.length) placed(new THREE.DodecahedronGeometry(0.6), 0xb8915c, rocks);
  } else if (theme.scenery === 'alpine') {
    // ---- alpine: guardrails and snowbanks along both edges, snowy pines on the mountainside,
    // peaks all round in the haze, and snow falling
    const posts = [], rails = [], banks = [];
    for (let s = Track.start; s < Track.end; s += 4) {
      for (const side of [-1, 1]) {
        posts.push([s, beside(side, s, 0.5), 0.4, 0.12, 0.8, 0.12]);
        // (each rail a run from one post to the next, tipped to the slope, as the circuits' walls: no steps on a hill)
        rails.push([s, beside(side, s, 0.45), 0.65, 0.08, 0.3, 4.02, [s + 4, beside(side, s + 4, 0.45)]]);
        if (Math.random() < 0.6) banks.push([s + Math.random() * 4, beside(side, s, -0.1), 0.1, 1.2 + Math.random(), 0.7, 2 + Math.random() * 2]);
      }
    }
    instances(cube, 0x5a5f66, posts);
    instances(cube, 0xb9bec5, rails);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0xffffff, banks);
    // snow poles: tall, orange, black at the top, every 24 m along both edges, so the road reads under snow
    // and its bends show from a way off
    const poles = [], tips = [];
    for (let s = Track.start; s < Track.end; s += 24) {
      for (const side of [-1, 1]) {
        poles.push([s, beside(side, s, 0.95), 1.5, 0.09, 3, 0.09]);
        tips.push([s, beside(side, s, 0.95), 2.8, 0.11, 0.45, 0.11]);
      }
    }
    instances(cube, 0xf07a1a, poles);
    instances(cube, 0x1b1d22, tips);
    // a hairpin (a bend tighter than HAIRPIN m round) reads as one: round the outside of it, and a little way
    // either side, a stone wall with snow along its top in place of the rail's snowbanks, a band of red and white
    // boards along its face, pointing the bend out
    const HAIRPIN = 1 / 30, LEAD = 16, stone = [], capping = [], red = [], pale = [];
    const hairpinAt = (s) => { const c = Track.bend(s); return Math.abs(c) > HAIRPIN ? Math.sign(c) : 0; };
    for (let s = Track.start, k = 0; s < Track.end; s += 2, k++) {
      const turn = hairpinAt(s) || hairpinAt(s + LEAD) || hairpinAt(s - LEAD);
      if (!turn) continue;
      const side = -turn, a = [s, beside(side, s, 1.3)], b = [s + 2, beside(side, s + 2, 1.3)]; // (+ = a right turn: its outside is the left)
      stone.push([a[0], a[1], 0.6, 0.6, 1.2, 1, b]);
      capping.push([a[0], a[1], 1.27, 0.75, 0.16, 1, b]);
      if (hairpinAt(s)) (Math.floor(k / 2) % 2 ? red : pale).push([s, beside(side, s, 0.97), 0.75, 0.06, 0.6, 1, [s + 2, beside(side, s + 2, 0.97)]]);
    }
    instances(cube, 0x7f8388, stone);
    instances(cube, 0xffffff, capping);
    instances(cube, 0xd23b2b, red);
    instances(cube, 0xf4f4f4, pale);
    // the top of the pass (on a level that climbs): a refuge hut of stone beside the road at its highest point,
    // snow on its roof, and a board on two posts with the level's name on it
    let hut = null; // (where it is along the road: no pines there)
    if (Track.hilly) {
      let top = 0, high = -Infinity, flatTo = 0;
      for (let s = 0; s < Track.length; s += 10) { Track.toWorld(s, 0, tmp); if (tmp.y > high + 0.05) { high = tmp.y; top = flatTo = s; } else if (tmp.y > high - 0.05) flatTo = s; }
      const at = Math.min(Track.length - 60, Math.max(60, (top + flatTo) / 2));
      if (high > 20) {
        hut = at + 26;
        instances(cube, 0x8c8478, [[at + 26, beside(1, at + 26, 11), 2, 9, 4, 12]]);            // the hut's walls
        instances(cube, 0x4d3b30, [[at + 26, beside(1, at + 26, 6.45), 1.1, 0.12, 2.2, 1.2]]);  // its door
        instances(cube, 0xffd98a, [[at + 22.5, beside(1, at + 22.5, 6.45), 2.2, 0.12, 1, 1.4], [at + 29.5, beside(1, at + 29.5, 6.45), 2.2, 0.12, 1, 1.4]], true); // lit windows
        instances(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), 0xf3f6f9, [[at + 26, beside(1, at + 26, 11), 5.2, 10.4, 2.4, 13.4]]); // a hip roof, under snow
        instances(cube, 0x6a5a4a, [[at + 30, beside(1, at + 30, 13), 6.4, 0.9, 1.6, 0.9]]);   // the chimney
        instances(cube, 0x5a4636, [[at, beside(1, at, 3.4), 1.6, 0.22, 3.2, 0.22], [at, beside(1, at, 8.6), 1.6, 0.22, 3.2, 0.22]]); // the board's posts
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 192;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#5b3a22';
        ctx.fillRect(0, 0, 512, 192);
        ctx.strokeStyle = '#f4ead2'; ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, 492, 172);
        ctx.fillStyle = '#f4ead2';
        ctx.textAlign = 'center';
        ctx.font = 'bold 58px sans-serif';
        ctx.fillText(String(levelName(LEVEL) || 'The pass').toUpperCase().slice(0, 16), 256, 92, 460);
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('SUMMIT  ' + Math.round(2000 + high * 6) + ' m', 256, 150, 460);
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        const board = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.1), new THREE.MeshBasicMaterial({ map }));
        board.rotation.y = Track.toWorld(at, beside(1, at, 6), tmp) + Math.PI; // (facing the car coming up)
        board.scale.x = Track.mirrored ? -1 : 1; // (mirrored back on a left-hand level, so it still reads)
        board.position.set(tmp.x, tmp.y + 2.3, tmp.z);
        levelGroup.add(board);
      }
    }
    // pines: dark green tiers dusted with snow, standing on the land itself, never on another stretch of road
    const trunks = [], tiers = [], caps = [], spot = new THREE.Object3D(), p = {};
    for (let s = Track.start; s < Track.end; s += 9) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.35) continue;
        const d = 10 + Math.random() * 45;
        if (d < 24 && (hairpinAt(s) || hairpinAt(s + LEAD) || hairpinAt(s - LEAD))) continue; // (none close in round a hairpin: a tall pine there fills the screen)
        if (hut !== null && side > 0 && Math.abs(s - hut + 13) < 34 && d < 26) continue; // (nor on the hut and its board)
        Track.toWorld(s + Math.random() * 6, beside(side, s, d), p);
        if (Track.mainDistance(p.x, p.z) < Math.max(Track.hi(s), -Track.lo(s)) + 4 || !offRoads(p.x, p.z, 3)) continue;
        const y = terrainAt(p.x, p.z), h = 6 + Math.random() * 6;
        trunks.push([p.x, y + h * 0.1, p.z, 0.5, h * 0.2, 0.5]);
        for (let k = 0; k < 3; k++) {
          const w = h * (0.55 - k * 0.13);
          tiers.push([p.x, y + h * (0.35 + k * 0.22), p.z, w, h * 0.4, w]);
          caps.push([p.x, y + h * (0.47 + k * 0.22), p.z, w * 0.6, h * 0.18, w * 0.6]);
        }
      }
    }
    const placed = (geometry, color, list) => { // (like instances(), but at world points, not road ones)
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color }), list.length);
      list.forEach(([x, y, z, sx, sy, sz], i) => {
        spot.position.set(x, y, z);
        spot.scale.set(sx, sy, sz);
        spot.updateMatrix();
        mesh.setMatrixAt(i, spot.matrix);
      });
      levelGroup.add(mesh);
    };
    placed(tube, 0x4a3426, trunks);
    placed(cone, 0x2f5a3c, tiers);
    placed(cone, 0xf6f8fa, caps);
    // peaks all round, out in the haze: rock with snow on top
    const middle = {};
    Track.toWorld(Track.length / 2, 0, middle);
    const rock = new THREE.MeshLambertMaterial({ color: 0x7d838c }), white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2 + Math.random() * 0.2, far = 700 + Math.random() * 250;
      const r = 180 + Math.random() * 140, h = 260 + Math.random() * 220;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rock);
      const at = clearOfRoads(middle.x, middle.z, Math.sin(a), Math.cos(a), far, r, 40); // (pushed out clear of every road)
      peak.position.set(at.x, h / 2 - 20, at.z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.42, 7), white);
      cap.position.set(peak.position.x, h - 20 - h * 0.21 + 1, peak.position.z);
      peak.material.fog = cap.material.fog = true;
      levelGroup.add(peak, cap);
    }
    snowfall();
  } else if (theme.scenery === 'battlefield') {
    // ---- battlefield: craters, sandbags, tank traps, barbed wire and shattered trees ------------------
    const craters = [], rims = [], bags = [], traps = [], posts = [], stumps = [], wrecks = [];
    for (let s = Track.start; s < Track.end; s += 9) {
      for (const side of [-1, 1]) {
        const at = s + Math.random() * 8, roll = Math.random();
        if (roll < 0.22) { // a shell crater: a dark pit inside a ring of thrown-up earth
          const r = 2 + Math.random() * 4, lat = beside(side, at, 6 + Math.random() * 70);
          rims.push([at, lat, 0.05, r * 2.6, 0.3, r * 2.6]);
          craters.push([at, lat, 0.12, r * 2, 0.3, r * 2]);
        } else if (roll < 0.3) { // a line of sandbags
          bags.push([at, beside(side, at, 3 + Math.random() * 14), 0.45, 1.2, 0.9, 6 + Math.random() * 6]);
        } else if (roll < 0.4) { // a tank trap: three steel beams crossed
          const lat = beside(side, at, 2 + Math.random() * 22);
          traps.push([at, lat, 0.7, 0.25, 1.4, 1.6], [at, lat, 0.7, 1.6, 1.4, 0.25], [at, lat, 0.7, 0.25, 0.25, 1.8]);
        } else if (roll < 0.5) { // a shattered tree
          const h = 2 + Math.random() * 5;
          stumps.push([at, beside(side, at, 8 + Math.random() * 60), h / 2, 0.5, h, 0.5]);
        } else if (roll < 0.53) { // a burnt-out wreck
          wrecks.push([at, beside(side, at, 10 + Math.random() * 50), 0.9, 3, 1.8, 6]);
        }
      }
    }
    // barbed wire on posts along both sides
    for (let s = Track.start; s < Track.end; s += 5) for (const side of [-1, 1]) posts.push([s, beside(side, s, 1.6), 0.55, 0.12, 1.1, 0.12]);
    for (const side of [-1, 1]) for (const y of [0.45, 0.85]) add(sideStrip(Track.start, Track.end, (q) => beside(side, q, 1.55), (q) => beside(side, q, 1.65), y), flat(0x6d6a63));
    instances(tube, 0x5a4e36, rims);
    instances(tube, 0x2e2618, craters);
    instances(cube, 0xb8a676, bags);
    instances(cube, 0x3c3a36, traps);
    instances(cube, 0x5a554c, posts);
    instances(tube, 0x2b231a, stumps);
    instances(cube, 0x2a2622, wrecks);
  } else if (theme.scenery === 'hell') {
    // ---- hell: rivers of lava, black spires of rock, and fires along the roadside ------------------
    const glow = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false });
    for (const side of [-1, 1]) {
      for (let s = Track.start, k = side > 0 ? 0 : 1; s < Track.end; s += 170, k++) {
        const near = 12 + (k % 3) * 9, far = near + 30 + (k % 2) * 25, to = Math.min(Track.end, s + 120);
        // (a brighter core down the middle of each river, drawn after it)
        for (const [a, b, color, order] of [[near, far, 0xff4a12, -1], [near + 6, far - 8, 0xffb52e, -0.9]]) {
          const lava = new THREE.Mesh(sideStrip(s, to, (q) => beside(side, q, a), (q) => beside(side, q, b), -0.03, 8), glow(color));
          lava.renderOrder = order;
          levelGroup.add(lava);
        }
      }
    }
    const spires = [], flames = [], cores = [];
    for (let s = Track.start; s < Track.end; s += 12) {
      for (const side of [-1, 1]) {
        const at = s + Math.random() * 10, h = 5 + Math.pow(Math.random(), 2) * 34;
        spires.push([at, beside(side, at, 5 + h * 0.2 + Math.random() * 90), h / 2, h * 0.35, h, h * 0.35]);
        if (Math.random() < 0.3) {
          const f = 2 + Math.random() * 3, lat = beside(side, at, 2.5 + Math.random() * 4);
          flames.push([at, lat, f * 0.35, f * 0.5, f * 0.7, f * 0.5]);   // a wide base,
          cores.push([at, lat, f * 0.6, f * 0.2, f * 1.2, f * 0.2]);      // and a bright tongue rising out of it
        }
      }
    }
    instances(cone, 0x2a1512, spires);
    instances(cone, 0xff5a14, flames, true);
    instances(cone, 0xffd23f, cores, true);
  } else if (theme.scenery === 'sea') {
    // ---- the sea: a breakwater of rocks along each edge, half under the water, red and white marker
    // buoys along it, and rocky islands off in the distance --------------------------------------------
    const rock = new THREE.DodecahedronGeometry(0.5, 0), buoy = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
    const rocks = [], red = [], white = [], isles = [], tops = [];
    for (let s = Track.start; s < Track.end; s += 1.8) {
      for (const side of [-1, 1]) {
        const size = 1.2 + Math.random() * 1.8;
        rocks.push([s + Math.random(), beside(side, s, 0.4 + size * 0.4 + Math.random() * 0.8), size * 0.15, size, size * (0.5 + Math.random() * 0.5), size]);
      }
    }
    for (let s = Track.start, k = 0; s < Track.end; s += 14, k++) {
      for (const side of [-1, 1]) (k % 2 ? red : white).push([s, beside(side, s, 0.2), 0.45, 0.6, 1.1, 0.6]);
    }
    for (let s = Track.start; s < Track.end; s += 90) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.45) continue;
        const r = 12 + Math.random() * 30, at = s + Math.random() * 60, lat = beside(side, at, 60 + Math.random() * 220);
        isles.push([at, lat, r * 0.25, r * 2, r * 0.8, r * 1.6]);
        if (Math.random() < 0.6) tops.push([at, lat, r * 0.55, r * 0.9, r * 0.6, r * 0.8]);
      }
    }
    instances(rock, 0x6f6a64, rocks);
    instances(buoy, 0xd8262b, red);
    instances(buoy, 0xf2f2f2, white);
    instances(rock, 0x7a776f, isles);
    instances(rock, 0x5f8a4a, tops);
  } else if (theme.scenery === 'circuit') {
    // ---- a real circuit with a look of its own (theme.circuit: render/circuits/<id>.js): the circuit's
    // trackside (walls, catch fences, kerbs; light pylons when the theme is lit), its grandstands and
    // pits, and then whatever the circuit draws for itself: its landmarks and the land round it
    circuitTrackside(!!theme.lit);
    grandstands(!!theme.night);
    const draw = CIRCUITS[theme.circuit];
    if (draw) draw({ THREE, levelGroup, Track, LEVEL, CONFIG, theme, tmp, add, flat, buildStrip, instances, placeEntry, dummy, cube, tube, beside, terrainAt, offRoads, clearOfRoads, inJunction });
    else console.warn('no circuit scenery called "' + theme.circuit + '"');
  } else if (theme.scenery === 'space') {
    // ---- space: stars all round, which travel with the camera so they never get nearer -----
    const points = [];
    for (let i = 0; i < 1800; i++) {
      const a = Math.random() * Math.PI * 2, y = Math.random() * 2 - 1, r = Math.sqrt(1 - y * y);
      points.push(Math.cos(a) * r * 600, y * 600, Math.sin(a) * r * 600);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, depthWrite: false }));
    stars.frustumCulled = false;
    stars.renderOrder = -3;
    stars.onBeforeRender = (renderer, scene, camera) => {
      stars.position.copy(camera.position);
      if (scene.scale.x < 0) stars.position.x = -stars.position.x; // (in the scene's own terms)
      stars.updateMatrixWorld();
    };
    levelGroup.add(stars);
  } else if (theme.scenery === 'hongkong') {
    // ---- hong kong: Victoria Harbour at night. The harbour along the right (theme.sea m off the road)
    // behind a promenade and its railing, the Kowloon skyline lit across the water; a wall of lit
    // towers along the left, crowded up to the road; neon signs hung out over the road from both sides;
    // red taxis' worth of light everywhere. (The Star Ferry and the trams: render/movers.js)
    const SEA = theme.sea || 14;
    const water = new THREE.MeshBasicMaterial({ color: 0x0f2238, side: THREE.DoubleSide });
    add(sideStrip(Track.start, Track.end, (q) => beside(1, q, SEA), (q) => beside(1, q, SEA + 520), -0.03, 8), water);
    // (ripples: a few long pale streaks on the water, the city's lights in it)
    const sheen = new THREE.MeshBasicMaterial({ color: 0x24405c, side: THREE.DoubleSide });
    for (let s = Track.start; s < Track.end; s += 26) {
      const out = SEA + 10 + Math.random() * 300, len = 6 + Math.random() * 14;
      add(sideStrip(s, s + len, (q) => beside(1, q, out), (q) => beside(1, q, out + 0.6), -0.02, 4), sheen);
    }
    add(sideStrip(Track.start, Track.end, (q) => beside(1, q, 0.4), (q) => beside(1, q, SEA - 0.4), 0.03), flat(0x8c8a84)); // the promenade
    add(sideStrip(Track.start, Track.end, (q) => beside(1, q, SEA - 1), (q) => beside(1, q, SEA), 0.6, 4), flat(0x6f6d68));     // its sea wall
    add(sideStrip(Track.start, Track.end, (q) => beside(-1, q, 0.4), (q) => beside(-1, q, 3.2), 0.03), flat(0x8c8a84));         // and a pavement on the left
    const rails = [], railPosts = [], towers = [], windows = [], crowns = [], signs = [[], [], [], []], signPosts = [], arms = [], farTowers = [], farWindows = [], lampPosts = [], lampHeads = [];
    const NEON = [0xff2d95, 0x27e7ff, 0xffe12b, 0x7cff3a];
    for (let s = Track.start; s < Track.end; s += 2.5) {
      rails.push([s, beside(1, s, SEA - 0.6), 1.05, 0.06, 0.08, 2.52, [s + 2.5, beside(1, s + 2.5, SEA - 0.6)]]);
      if (Math.round(s) % 5 === 0) railPosts.push([s, beside(1, s, SEA - 0.6), 0.55, 0.1, 1.1, 0.1]);
    }
    // the towers along the left: tall, narrow, shoulder to shoulder, lit
    for (let s = Track.start; s < Track.end; s += 18) {
      const w = 12 + Math.random() * 8, d = 14 + Math.random() * 10, h = 45 + Math.random() * 90;
      const lat = beside(-1, s + w / 2, 6 + d / 2);
      litTowers(towers, windows, s + w / 2, lat, w, h, d, -1);
      if (Math.random() < 0.4) crowns.push([s + w / 2, lat, h + 1.5, d * 0.5, 3, w * 0.5]);
      // (a second row behind, taller still)
      if (Math.random() < 0.7) {
        const h2 = 80 + Math.random() * 120, d2 = 16 + Math.random() * 10;
        litTowers(towers, windows, s + w / 2 + 6, beside(-1, s, 6 + d + 8 + d2 / 2), w + 4, h2, d2, -1);
      }
    }
    // Kowloon across the water: a skyline of lit towers along the far shore
    for (let s = Track.start - 200; s < Track.end + 200; s += 24) {
      const w = 16 + Math.random() * 16, h = 40 + Math.random() * 130, d = 20;
      const lat = beside(1, Math.max(Track.start, Math.min(Track.end, s)), SEA + 420 + Math.random() * 80);
      farTowers.push([s, lat, h / 2, d, h, w]);
      for (let y = 4; y < h - 3; y += 4.5) if (Math.random() < 0.8) farWindows.push([s, lat - d / 2 - 0.05, y, 0.1, 1.6, w * 0.8]);
    }
    // neon signs hung out over the road on arms from posts at the kerb, both sides, each a slab of colour
    // (a few stacked, as Nathan Road's) and a glow laid on the road under it
    for (let s = Track.start + 20, k = 0; s < Track.end; s += 34, k++) {
      const side = k % 3 === 2 ? 1 : -1; // (more on the city side)
      signPosts.push([s, beside(side, s, 0.9), 4, 0.25, 8, 0.25]);
      arms.push([s, beside(side, s, -2.6), 7.6, 7.4, 0.14, 0.14]);
      const n = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) signs[(k + j) % NEON.length].push([s, beside(side, s, -3.5 - j * 0.2), 6.6 - j * 1.4, 2.6 + Math.random() * 2, 1.0, 0.18]);
    }
    for (let s = Track.start, k = 0; s < Track.end; s += 40, k++) { // street lamps along the pavement, each side in turn
      const side = k % 2 ? 1 : -1;
      lampPosts.push([s, beside(side, s, 0.7), 3, 0.16, 6, 0.16]);
      lampHeads.push([s, beside(side, s, 0.1), 5.95, 1.2, 0.18, 0.4]);
    }
    instances(cube, 0x9aa0a8, rails);
    instances(cube, 0x6f747c, railPosts);
    instances(cube, 0x14171f, towers);
    instances(cube, 0xffe9a8, windows, true);
    instances(cube, 0x2a2f3a, crowns);
    instances(cube, 0x0e1118, farTowers);
    instances(cube, 0xd8e4ff, farWindows, true);
    instances(cube, 0x3a3f47, signPosts);
    instances(cube, 0x3a3f47, arms);
    NEON.forEach((color, i) => instances(cube, color, signs[i], true));
    instances(cube, 0x4a4f57, lampPosts);
    instances(cube, 0xfff1c8, lampHeads, true);
  } else if (theme.scenery === 'tokyo') {
    // ---- tokyo: the Shuto Expressway at night, up on its piers (theme.elevated: see elevatedRoad), green
    // overhead sign gantries, the towers of the city all round below, lit, some rising well above the
    // road; a red and white lattice tower off in the distance
    const drop = theme.elevated || 20;
    const towers = [], windows = [], low = [], gantryPosts = [], gantryBeams = [], boards = [], boardText = [], lowRoofs = [];
    const p = {};
    for (let s = Track.start - 100; s < Track.end + 100; s += 14) {
      for (const side of [-1, 1]) {
        const roll = Math.random();
        const far = 14 + Math.random() * 90, at = Math.max(Track.start, Math.min(Track.end, s));
        const lat = beside(side, at, far);
        Track.toWorld(at, lat, p);
        if (!offRoads(p.x, p.z, 12) || Track.mainDistance(p.x, p.z) < Math.max(Track.hi(at), -Track.lo(at)) + 10) continue;
        if (roll < 0.35) { // a tower, from the ground far below, rising past the road
          const w = 14 + Math.random() * 14, d = 14 + Math.random() * 14, h = drop + 10 + Math.random() * 110;
          towers.push([s, lat, h / 2 - drop, d, h, w]);
          const face = lat - side * (d / 2 + 0.05);
          for (let y = -drop + 3; y < h - drop - 2; y += 3.4) if (Math.random() < 0.8) windows.push([s, face, y, 0.1, 1.3, w * 0.82]);
        } else { // low buildings, crowded, their roofs below the road
          const w = 8 + Math.random() * 10, d = 8 + Math.random() * 8, h = 6 + Math.random() * (drop - 8);
          low.push([s, lat, h / 2 - drop, d, h, w]);
          lowRoofs.push([s, lat, h - drop + 0.1, d * 0.9, 0.2, w * 0.9]);
        }
      }
    }
    // overhead gantries: a beam across the whole road on two posts, green boards hung from it over the lanes
    for (let s = Track.start + 120; s < Track.end - 60; s += 260) {
      if (inJunction(s)) continue;
      if (Track.tunnel(s) > 0 || (LEVEL.tunnels || []).some(t => s >= t.from - 20 && s <= t.to + 20)) continue;
      const lo = Track.lo(s) - 0.6, hi = Track.hi(s) + 0.6;
      gantryPosts.push([s, lo, 3.5, 0.5, 7, 0.5], [s, hi, 3.5, 0.5, 7, 0.5]);
      gantryBeams.push([s, (lo + hi) / 2, 6.9, hi - lo + 0.5, 0.5, 0.5]);
      for (let lane = 0; lane < Track.laneCount; lane += 2) {
        const lat = Track.laneOffset(lane, s) + (lane + 1 < Track.laneCount ? LW / 2 : 0);
        boards.push([s, lat, 5.6, 2 * LW - 0.6, 2.2, 0.15]);
        boardText.push([s, lat, 5.9, 2 * LW - 1.6, 0.35, 0.02], [s, lat, 5.2, 2 * LW - 2.4, 0.3, 0.02]);
      }
    }
    // the lattice tower, off to one side of the middle of the level, lit red and white
    const middle = {};
    Track.toWorld(Track.length / 2, 0, middle);
    const at = clearOfRoads(middle.x, middle.z, Math.sin(1.1), Math.cos(1.1), 500, 40, 60);
    const H = 300;
    for (let k = 0; k < 6; k++) { // (in six bands, red and white in turn, each a tapering open lattice)
      const r = 40 * (1 - k / 6.5), r1 = 40 * (1 - (k + 1) / 6.5);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r, H / 6, 4, 2, true).translate(0, H / 12, 0),
        new THREE.MeshBasicMaterial({ color: k % 2 ? 0xf2f2f2 : 0xff4a1a, wireframe: true }));
      seg.position.set(at.x, -drop + k * H / 6, at.z);
      levelGroup.add(seg);
    }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    beacon.position.set(at.x, -drop + H + 2, at.z);
    levelGroup.add(beacon);
    instances(cube, 0x14171f, towers);
    instances(cube, 0xf4e6b8, windows, true);
    instances(cube, 0x22252d, low);
    instances(cube, 0x2e323a, lowRoofs);
    instances(cube, 0x5a5f67, gantryPosts);
    instances(cube, 0x5a5f67, gantryBeams);
    instances(cube, 0x1e7a3c, boards);
    instances(cube, 0xf4f4f4, boardText, true);
    elevatedRoad(drop);
  } else if (theme.scenery === 'mumbai') {
    // ---- mumbai in the monsoon: low buildings in washed-out colours crowded up to the road, painted
    // hoardings on tall frames, palms bending in the rain, awnings over the pavement, water lying in
    // every low spot of the road, and the rain
    for (const side of [-1, 1]) add(sideStrip(Track.start, Track.end, (q) => beside(side, q, 0.3), (q) => beside(side, q, 2.6), 0.03), flat(0x7f7b70));
    const WASH = [0xd9a066, 0x8fb0c9, 0xc9c48a, 0xd98c8c, 0xa6c48f, 0xe0d2b8, 0x9b8fc4];
    const walls = WASH.map(() => []), roofs = [], windows = [], awnings = [], hoardings = [], frames = [], trunks = [], fronds = [], stains = [], tanks = [];
    const p = {};
    for (let s = Track.start; s < Track.end; s += 9) {
      for (const side of [-1, 1]) {
        const w = 6 + Math.random() * 8, d = 7 + Math.random() * 7, h = 6 + Math.random() * 12;
        const lat = beside(side, s + w / 2, 3.5 + d / 2);
        Track.toWorld(s + w / 2, lat, p);
        if (!offRoads(p.x, p.z, 6)) continue;
        walls[Math.floor(Math.random() * WASH.length)].push([s + w / 2, lat, h / 2, d, h, w]);
        roofs.push([s + w / 2, lat, h + 0.2, d + 0.6, 0.4, w + 0.6]);
        stains.push([s + w / 2, lat - side * (d / 2 + 0.03), h * 0.2, 0.05, h * 0.4, w * 0.9]); // (the damp running down the walls)
        const face = lat - side * (d / 2 + 0.05);
        for (let y = 2; y < h - 1.5; y += 3) for (let q = -w / 2 + 1.2; q < w / 2 - 0.8; q += 2.2) windows.push([s + w / 2 + q, face, y, 0.1, 1.2, 1.1]);
        if (Math.random() < 0.6) awnings.push([s + w / 2, lat - side * (d / 2 + 1.1), 2.9, 2.2, 0.12, w * 0.8]);
        if (Math.random() < 0.5) tanks.push([s + w / 2 + (Math.random() - 0.5) * w * 0.5, lat, h + 0.9, 1.2, 1.4, 1.2]); // (water tanks on the roofs)
        // (the odd taller block behind)
        if (Math.random() < 0.3) {
          const h2 = 18 + Math.random() * 20, d2 = 12 + Math.random() * 8;
          walls[Math.floor(Math.random() * WASH.length)].push([s + w / 2, beside(side, s, 3.5 + d + 6 + d2 / 2), h2 / 2, d2, h2, w + 6]);
        }
      }
    }
    for (let s = Track.start + 40, k = 0; s < Track.end; s += 110, k++) { // hoardings: a big painted board on a steel frame, over the buildings
      const side = k % 2 ? 1 : -1, lat = beside(side, s, 5 + Math.random() * 6);
      frames.push([s - 3.5, lat, 7, 0.3, 14, 0.3], [s + 3.5, lat, 7, 0.3, 14, 0.3]);
      hoardings.push([s, lat, 12, 0.25, 5, 9]);
    }
    for (let s = Track.start + 6; s < Track.end; s += 23) { // palms at the kerb, leaning
      for (const side of [-1, 1]) {
        if (Math.random() < 0.4) continue;
        const lat = beside(side, s, 1.6), h = 6 + Math.random() * 4;
        trunks.push([s, lat, h / 2, 0.35, h, 0.35]);
        for (let k = 0; k < 6; k++) fronds.push([s + Math.sin(k) * 1.6, lat + Math.cos(k) * 1.6, h + 0.4 - k * 0.1, 0.5, 0.12, 3.2]);
      }
    }
    // water lying on the road: wide shallow sheets, pale and glassy
    const puddle = new THREE.MeshBasicMaterial({ color: 0x9aa6b0, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    for (let s = Track.start + 10; s < Track.end - 10; s += 18 + Math.random() * 30) {
      const lat = Track.lo(s) + Math.random() * (Track.hi(s) - Track.lo(s)), w = 1.5 + Math.random() * 3, l = 4 + Math.random() * 10;
      add(buildStrip(s, s + l, lat - w, lat + w, 0.025, 2), puddle);
    }
    WASH.forEach((color, i) => instances(cube, color, walls[i]));
    instances(cube, 0x6b5a4a, roofs);
    instances(cube, 0x3a4652, windows);
    instances(cube, 0xc9463d, awnings);
    instances(cube, 0x5a5f67, frames);
    [0xe8c23a, 0x3ab0e8, 0xe84a7a].forEach((color, i) => instances(cube, color, hoardings.filter((_, k) => k % 3 === i)));
    instances(cube, 0x4a3a2a, stains);
    instances(cube, 0x2a2a2a, tanks);
    instances(tube, 0x6b5436, trunks);
    instances(cube, 0x3f7a2e, fronds);
  } else if (THEME_SCENERY[theme.scenery]) {
    // ---- a theme with a file of its own (render/themes/<scenery>.js): given what stands things beside a road here
    THEME_SCENERY[theme.scenery]({ theme, add, flat, instances, sideStrip, buildStrip, offRoads, standsClear, clearOfRoads, beside, inJunction, exits, cube, tube, cone, levelGroup, elevatedRoad });
  }
  // (what the older themes were given since, beside what is drawn for them above: render/themes/extras.js)
  if (THEME_EXTRAS[theme.scenery]) THEME_EXTRAS[theme.scenery]({ theme, add, flat, instances, sideStrip, buildStrip, offRoads, standsClear, clearOfRoads, beside, inJunction, exits, cube, tube, cone, levelGroup, terrainAt, litTowers });
  if (theme.snow && theme.scenery !== 'alpine') snowfall();
  if (theme.rain) rainfall();
  if (theme.elevated && theme.scenery !== 'tokyo') elevatedRoad(theme.elevated);
  placeInstances();
  clearLoose();
};
Game.onLoad.push(buildRoad);
