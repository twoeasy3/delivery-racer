// ---- TYRE TREADS: the first of a WHEEL SET's three parts (the owner, 15-Oct: "introducing different tyre treads and animating these with
// the rims"; "Wheel sets would now be - tread - tyre colour - hub colour or rim or spinner"; CHECKLIST 399). RENDER-ONLY like
// render/rims.js and render/wheelcosmetic.js (which call this): nothing here is read by a rule, written into a save or hashed into the
// replay fingerprint (vite.config.js logicFiles walks no render/ file). Only the player's car is dressed (traffic and the ghost are not).
// A TREAD is a ring of raised blocks, ribs or lugs round a tyre's RUNNING SURFACE (the cylinder's outer face between its sidewalls):
// GEOMETRY that is a CHILD OF ITS TYRE (never merged across wheels: the "trims bounced with the body" bug), ONE MESH PER TYRE, tagged
// userData.wheelRing (render/dents.js and render/carsuspension.js leave it alone) with a wheelHub material. The tyres themselves do not
// turn (only what is put on them does), so the tread mesh is turned about the axle as the rim is.
// UNITS: x, y in the tyre's TRUE radius R (its farthest vertex from the axle; the box's half height can be a facet short), z across in
// the tread's width W (the tyre's width less 7 mm a side, so no face of the tread lies within 4 mm of the tyre's sidewall); the mesh is
// scaled (R, R, W). Blocks rise from 0.93 R (inside the tyre's flattest facet, 0.95 R at 10 segments) to 1 + h; a block has a top and
// four sides (10 triangles; none underneath: it is buried); faces turned out from the block's middle.
// COLOUR: the tread is the tyre's own rubber, whatever colour it wears now (render/wheelcosmetic.js's tyre colour), shaded by vertex
// colours (tops lit, sides darker; the winter studs bright steel) on ONE shared white material. So the geometry is shared per design,
// rubber colour and variant (low / lite / which way it points), and every tread of every car shares the one material.
// VARIANTS: lower (LOWS: 0.7, 0.45 or 0.3 of the height) where bodywork sits close over a tyre (rays out from its tread, render/rims.js's way;
// an axle takes its worse tyre's answer; no room even for the lowest: no tread there); 'lite' (fewer blocks round) on a car with more than four
// tyres or a small tyre (R < 0.24 m). Directional designs (chevron, lugs) are built both ways and put on so the V points FORWARD when
// the car rolls forward (a centre wheel and either side alike).
// TURNING (with the rim: render/wheelcosmetic.js's animate hook calls turnWheels below, ONE pass for the rims and the treads, no
// allocation): by the distance rolled (userData.roll, render/items.js) over the wheel's radius (the rim's: the tyre's box, so the two match); idling at IDLE_RATE on show; stopped, still; reversing,
// back. Against the wagon-wheel effect a tread is clamped to CLAMP of its PITCH (one block row: TAU / n) a frame, and above BLUR_FROM
// of the pitch a translucent band of the tyre's rubber fades in over the blocks (BLUR steps). The rim and the tread of a wheel take the
// same distance in the same frame and turn by the same angle until one of them is clamped (the tread first: its pitch is finer); by
// then both blur. A model whose tyres turn themselves (userData.rollsWheels) has that turn taken off.
// TYRES THAT CARRY THEIR OWN TREAD (blocks, cleats or a ring of the tyre's rubber standing on its running surface, found here as parts
// round a tyre's axle reaching past its tread): hidden while a tread is worn, shown again after.
// SKIPPED: RIM_SKIP cars (hoops, tracks, hulls, discs), Legendary cars (their own wheels), tyres findHubs cannot find, tyres with no room.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as Store from './loadoutstore.js';
import { IDLE_RATE, CLAMP, BLUR_FROM, BLUR_FULL, BLUR, rimFrame } from './rims.js';

const TAU = Math.PI * 2;
// n: block rows round the tyre (the pitch, for the clamp); h: how far proud of the tyre's tread (in R); dir: directional (built both ways);
// walls: where its faces square to the axle lie, either side of the middle (in W): kept 5 mm off a body face in the same plane (z-fighting).
// (walls are worked out from the design's own footprints, below: every block edge that runs round the tyre at one place across)
// 16-Oct (the owner: "The treads are not rendering on the customisation screen"): the relief raised about a quarter, and every tread now
// also wears a PATTERN BAND (a code-drawn texture of its own footprints, light blocks on dark grooves, just over the running surface)
// and a SHOULDER RING on the tyre's outer face (the same pattern where it meets the sidewall), so it reads from the side and at phone
// size, and on cars with no room for raised blocks (an arch dipping into the tyre) the band and ring still show it.
export const TREAD_DESIGNS = [
  { id: 'none', name: 'Stock', n: 0 },
  { id: 'knobbly', name: 'Knobbly', n: 12, h: 0.08 },
  { id: 'chevron', name: 'Chevron', n: 14, h: 0.065, dir: true },
  { id: 'ribs', name: 'Road ribs', n: 10, h: 0.06, kMin: 0.45 }, // (kMin: its ring's flattest facet must stay clear of the tyre's corners)
  { id: 'lugs', name: 'Tractor', n: 12, h: 0.1, dir: true },
  { id: 'studs', name: 'Winter', n: 10, h: 0.055, pin: 0.025 }, // (pin: the studs stand that much over the blocks)
  // 16-Oct: eight more
  { id: 'slick', name: 'Slick', n: 16, h: 0.03, kMin: 0.7, plain: true }, // (two smooth ribs and a centre groove; plain: the band darker, a racing slick)
  { id: 'trail', name: 'Trail', n: 10, h: 0.075 },        // (all-terrain: shoulder blocks with a centre block between each pair)
  { id: 'zigzag', name: 'Zigzag', n: 10, h: 0.065 },      // (a zig-zag centre rib cut into short bars, shoulder blocks taking turns)
  { id: 'paddle', name: 'Paddle', n: 8, h: 0.11 },        // (sand paddles: straight bars right across, tall and few)
  { id: 'diamond', name: 'Diamond', n: 12, h: 0.06 },     // (a lattice of diamonds)
  { id: 'mud', name: 'Mud', n: 10, h: 0.1 },              // (mud terrain: big offset blocks, wide voids)
  { id: 'honeycomb', name: 'Honeycomb', n: 10, h: 0.06 }, // (hexagon blocks, staggered)
  { id: 'spikes', name: 'Spikes', n: 12, h: 0.09 },       // (pyramid spikes, staggered)
];
export const treadById = (id) => TREAD_DESIGNS.find(d => d.id === id) || TREAD_DESIGNS[0];
export const LOWS = [1, 0.7, 0.45, 0.3]; // a tread's height steps (of the design's own): the tallest that fits under the bodywork over the tyre
export const LITE_FROM = 4;   // more tyres than this: the lite tread (fewer rows)
export const SMALL_R = 0.24;  // m: a tyre smaller than this: the lite tread
export const MIN_R = 0.15;    // m: a tyre smaller than this gets none (a dragster's front wheels, a castor: too small to read, and too tight)
export const EDGE = 0.007;    // m: the tread stops at least this far in from each sidewall
export const SPAN = 0.86;     // of the tyre's width (less EDGE a side): the tread's own width (the tyre's square shoulders show either side)
export const BASE = 0.93;     // of R: the blocks' feet (inside the tyre)
const FIT_GAP = 0.0045;       // m: the least room left between a tread and bodywork over it
export const GRAZE = 0.004;   // m: the lowest step may graze bodywork this deep (a sill or an arch liner hard by the tyre, as on the Commuter), never more

// ---- the choice: the wheels slot's `tread` = { all, front?, rear? } (render/loadoutstore.js), per car over the default ----
const NONE = Object.freeze({ all: 'none' });
export const cleanTreadChoice = (raw) => {
  let v = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = { all: v }; } }
  if (typeof v === 'string') v = { all: v };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return NONE;
  const ok = (id) => typeof id === 'string' && TREAD_DESIGNS.some(d => d.id === id);
  const out = { all: ok(v.all) ? v.all : 'none' };
  for (const axle of ['front', 'rear']) if (ok(v[axle])) out[axle] = v[axle];
  return out;
};
const askedTread = typeof location !== 'undefined' ? /[?&]wheeltread=(\w+)/.exec(location.search)?.[1] : null; // (?wheeltread=chevron: every car, for stills; never saved)
export const treadAsked = !!askedTread;
export const savedTreadChoice = (carId = null) => cleanTreadChoice(Store.get(carId, 'wheels').tread);
// THE one reader: the tread a car's axle wears (the car's own for that axle, its own all-round, the default's for the axle, the default's)
export const resolveTread = (carId, axle) => {
  if (askedTread) return treadById(askedTread).id;
  const own = carId != null ? Store.own(carId, 'wheels')?.tread : null, d = Store.defaultSlot('wheels').tread || {};
  return treadById((own && (own[axle] || own.all)) || d[axle] || d.all).id;
};
export const globalTread = (carId = null) => (askedTread ? treadById(askedTread).id : savedTreadChoice(carId).all);
export const treadPatch = (id, target = null) => ({ tread: { ...savedTreadChoice(target), all: treadById(id).id } });

// ---- the geometry ----
// FOOT: while a design is built for its footprints (footprintsOf), every block, strip and rib also records its footprint here:
// { pts: [[angle, z]...] } (a polygon round the tyre, angle absolute) or { z0, z1 } (a rib right round); steel: a stud
let FOOT = null;
// a block: its footprint corners [s, z] (s: radians round from angle a; z: across, -0.5..0.5 of W), in order round it; feet at BASE,
// top at r1; vertex colours top / side (linear [r, g, b]); shrink: the top's corners drawn in toward its middle (1: a block, under 1: a
// spike's frustum)
const block = (pos, col, a, corners, r1, top, side, shrink = 1) => {
  if (FOOT) FOOT.push({ pts: corners.map(([s, z]) => [a + s, z]), steel: top === STEEL });
  const P = (r, [s, z]) => [r * Math.cos(a + s), r * Math.sin(a + s), z];
  const ms = corners.reduce((n, c) => n + c[0], 0) / corners.length, mz = corners.reduce((n, c) => n + c[1], 0) / corners.length;
  const tops = corners.map(([s, z]) => P(r1, [ms + (s - ms) * shrink, mz + (z - mz) * shrink])), feet = corners.map(c => P(BASE, c));
  let area = 0; // (the footprint's winding in (s, z): each side's outward normal from it)
  for (let i = 0; i < corners.length; i++) { const [s0, z0] = corners[i], [s1, z1] = corners[(i + 1) % corners.length]; area += s0 * z1 - s1 * z0; }
  const tri = (p, q, w, c, out) => { // (turned to face `out`)
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v = [w[0] - p[0], w[1] - p[1], w[2] - p[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const flip = n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0;
    pos.push(...p, ...(flip ? w : q), ...(flip ? q : w));
    for (let k = 0; k < 3; k++) col.push(...c);
  };
  for (let i = 1; i < tops.length - 1; i++) { const sm = (corners[0][0] + corners[i][0] + corners[i + 1][0]) / 3; tri(tops[0], tops[i], tops[i + 1], top, [Math.cos(a + sm), Math.sin(a + sm), 0]); } // (the top: a fan from the first corner, which sees the whole footprint)
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length, [s0, z0] = corners[i], [s1, z1] = corners[j], k = area > 0 ? 1 : -1;
    const ns = (z1 - z0) * k, nz = -(s1 - s0) * k, sm = a + (s0 + s1) / 2; // (outward in (s, z), then in 3D: s is the tangent)
    const out = [-Math.sin(sm) * ns, Math.cos(sm) * ns, nz];
    tri(feet[i], feet[j], tops[j], side, out); tri(feet[i], tops[j], tops[i], side, out);
  }
};
// a box block: s0..s1 round, z0..z1 across; skew: how far round its z1 end is moved from its z0 end (a slanted bar)
const box = (pos, col, a, s0, s1, z0, z1, r1, top, side, skew = 0) => block(pos, col, a, [[s0, z0], [s1, z0], [s1 + skew, z1], [s0 + skew, z1]], r1, top, side);
// a slanted bar as a STRIP of n sections along it: w wide (round), from z0 to z1, its z1 end `skew` further round; one top that bends
// with the tyre, two long walls, two end walls (6 n + 4 triangles)
const strip = (pos, col, a, w, z0, z1, skew, n, r1, top, side) => {
  const P = (r, s, z) => [r * Math.cos(a + s), r * Math.sin(a + s), z];
  const tri = (p, q, x, c, out) => {
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v = [x[0] - p[0], x[1] - p[1], x[2] - p[2]];
    const nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const flip = nn[0] * out[0] + nn[1] * out[1] + nn[2] * out[2] < 0;
    pos.push(...p, ...(flip ? x : q), ...(flip ? q : x));
    for (let k = 0; k < 3; k++) col.push(...c);
  };
  const quad = (p, q, x, y, c, out) => { tri(p, q, x, c, out); tri(p, x, y, c, out); };
  const at = (k) => ({ z: z0 + (z1 - z0) * k, s: skew * k });
  if (FOOT) for (let k = 0; k < n; k++) { const A = at(k / n), B = at((k + 1) / n); FOOT.push({ pts: [[a + A.s - w / 2, A.z], [a + A.s + w / 2, A.z], [a + B.s + w / 2, B.z], [a + B.s - w / 2, B.z]] }); }
  const tan = (s) => [-Math.sin(a + s), Math.cos(a + s), 0], rad = (s) => [Math.cos(a + s), Math.sin(a + s), 0];
  const sgn = Math.sign(z1 - z0) || 1; // (the long walls face round either way; the end walls along z)
  for (let k = 0; k < n; k++) {
    const A = at(k / n), B = at((k + 1) / n), sm = (A.s + B.s) / 2;
    const L = (c, r) => P(r, c.s - w / 2, c.z), Rr = (c, r) => P(r, c.s + w / 2, c.z);
    quad(L(A, r1), Rr(A, r1), Rr(B, r1), L(B, r1), top, rad(sm));
    const t = tan(sm), o1 = [t[0], t[1], 0], o0 = [-t[0], -t[1], 0];
    quad(Rr(A, BASE), Rr(B, BASE), Rr(B, r1), Rr(A, r1), side, o1);
    quad(L(A, BASE), L(B, BASE), L(B, r1), L(A, r1), side, o0);
  }
  const E0 = at(0), E1 = at(1);
  quad(P(BASE, E0.s - w / 2, E0.z), P(BASE, E0.s + w / 2, E0.z), P(r1, E0.s + w / 2, E0.z), P(r1, E0.s - w / 2, E0.z), side, [0, 0, -sgn]);
  quad(P(BASE, E1.s - w / 2, E1.z), P(BASE, E1.s + w / 2, E1.z), P(r1, E1.s + w / 2, E1.z), P(r1, E1.s - w / 2, E1.z), side, [0, 0, sgn]);
};
// (a rib built from boxes would put a wall between each two facets: coplanar walls back to back; so the rib is built here by hand)
const ring = (pos, col, z0, z1, r1, seg, top, side) => {
  if (FOOT) FOOT.push({ z0, z1 });
  const P = (r, ang, z) => [r * Math.cos(ang), r * Math.sin(ang), z];
  const quad = (p, q, w, x, c, outward) => {
    // p q w x round a quad; outward: the direction its normal should point (a vector)
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v = [w[0] - p[0], w[1] - p[1], w[2] - p[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const flip = n[0] * outward[0] + n[1] * outward[1] + n[2] * outward[2] < 0;
    const t = flip ? [p, w, q, p, x, w] : [p, q, w, p, w, x];
    for (const vtx of t) { pos.push(...vtx); col.push(...c); }
  };
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU, am = (a0 + a1) / 2;
    quad(P(r1, a0, z0), P(r1, a1, z0), P(r1, a1, z1), P(r1, a0, z1), top, [Math.cos(am), Math.sin(am), 0]);
    quad(P(BASE, a0, z0), P(BASE, a1, z0), P(r1, a1, z0), P(r1, a0, z0), side, [0, 0, -1]);
    quad(P(BASE, a0, z1), P(BASE, a1, z1), P(r1, a1, z1), P(r1, a0, z1), side, [0, 0, 1]);
  }
};
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }; // (THREE.Color takes sRGB hex to linear)
const times = (c, k) => c.map(v => v * k);
const STEEL = lin(0xd8dde4);
// each design: (pos, col, { rows, h, dir, top, side }) -> fills pos / col. rows: block rows round (the lite one fewer); dir: +1 / -1,
// which way round is FORWARD at the top of the wheel (the V's point and the lugs' leading ends go that way)
const BUILD = {
  // KNOBBLY: off-road blocks in staggered rows: a pair at the shoulders, then one big block in the middle
  knobbly: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, w = p * 0.5, r1 = 1 + h;
    for (let i = 0; i < rows; i++) {
      const a = i * p;
      if (i % 2) box(pos, col, a, -w * 0.55, w * 0.55, -0.22, 0.22, r1, top, side);
      else { box(pos, col, a, -w / 2, w / 2, -0.5, -0.14, r1, top, side); box(pos, col, a, -w / 2, w / 2, 0.14, 0.5, r1, top, side); }
    }
  },
  // CHEVRON: the directional rain tyre: a row of V's, each one piece (an arrow head), the point leading forward
  chevron: (pos, col, { rows, h, dir, top, side }) => {
    const p = TAU / rows, t = p * 0.32, back = p * 0.62, r1 = 1 + h;
    for (let i = 0; i < rows; i++) {
      const a = i * p, f = dir;
      // the V: the point at z 0 (forward), the arms back to the shoulders; t thick along the way round
      block(pos, col, a, [[f * back / 2, 0], [f * (back / 2 - back), 0.5], [f * (back / 2 - back - t), 0.5], [f * (back / 2 - t), 0], [f * (back / 2 - back - t), -0.5], [f * (back / 2 - back), -0.5]].map(([s, z]) => [s, z]), r1, top, side);
    }
  },
  // ROAD RIBS: the road tyre: two continuous shoulder ribs and a middle rib of short blocks (sipes between them: the turn shows)
  ribs: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, r1 = 1 + h;
    ring(pos, col, -0.5, -0.24, r1, 16, top, side); // (16 facets whatever the rows: the flattest stays clear of the tyre's corners)
    ring(pos, col, 0.24, 0.5, r1, 16, top, side);
    for (let i = 0; i < rows; i++) box(pos, col, i * p + p / 2, -p * 0.36, p * 0.36, -0.13, 0.13, r1, top, side);
  },
  // TRACTOR LUGS: deep slanted paddles from each shoulder past the middle, left and right taking turns, the inner ends leading. A lug
  // runs a long way round, so it is built as a STRIP of three sections (its top follows the tyre's round, never a flat chord under it)
  lugs: (pos, col, { rows, h, dir, top, side }) => {
    const p = TAU / rows, w = p * 0.5, r1 = 1 + h, slant = p * 1.1;
    for (let i = 0; i < rows; i++) {
      const a = i * p, s = i % 2 ? 1 : -1; // (s: which shoulder)
      // from the shoulder (z = s * 0.5) to past the middle (z = -s * 0.08), the middle end ahead by `slant`
      strip(pos, col, a, w, s * 0.5, -s * 0.12, dir * slant, 3, r1, top, side);
    }
  },
  // WINTER: siped blocks in a zigzag pair each row, a bright steel stud standing out of one of them
  studs: (pos, col, { rows, h, pin, top, side }) => {
    const p = TAU / rows, w = p * 0.38, r1 = 1 + h, sh = p * 0.22;
    for (let i = 0; i < rows; i++) {
      const a = i * p, s = i % 2 ? 1 : -1;
      box(pos, col, a - sh / 2, -w / 2, w / 2, -0.5, -0.04, r1, top, side, s * sh * 0.5);
      box(pos, col, a + sh / 2, -w / 2, w / 2, 0.04, 0.5, r1, top, side, -s * sh * 0.5);
      // the stud: a small three-sided pin out of the block's top (its feet inside the block)
      const zc = s * 0.27, sc = s > 0 ? sh / 2 : -sh / 2, d = 0.022;
      block(pos, col, a + sc, [[-d, zc - 0.05], [d, zc - 0.05], [0, zc + 0.06]], r1 + pin, STEEL, times(STEEL, 0.7));
    }
  },
  // SLICK: two smooth ribs right round with one groove down the middle (22 facets: no common tyre facet count, so no face of a rib
  // lies parallel and close to one of the tyre's)
  slick: (pos, col, { h, top, side }) => {
    ring(pos, col, -0.5, -0.05, 1 + h, 22, top, side);
    ring(pos, col, 0.05, 0.5, 1 + h, 22, top, side);
  },
  // TRAIL: all-terrain: a block at each shoulder, and a centre block half a row on, between each pair
  trail: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, w = p * 0.56, r1 = 1 + h;
    for (let i = 0; i < rows; i++) {
      const a = i * p;
      box(pos, col, a, -w / 2, w / 2, -0.5, -0.2, r1, top, side);
      box(pos, col, a, -w / 2, w / 2, 0.2, 0.5, r1, top, side);
      box(pos, col, a + p / 2, -w * 0.42, w * 0.42, -0.14, 0.14, r1, top, side);
    }
  },
  // ZIGZAG: a centre rib that zigs and zags round the tyre (short slanted bars, a sipe between each), shoulder blocks taking turns
  zigzag: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, r1 = 1 + h, w = p * 0.14; // (each bar's ends clear of the next one's by 0.02 of a row: no two tops overlap)
    for (let i = 0; i < rows; i++) {
      const a = i * p;
      strip(pos, col, a, w, -0.26, 0.26, p * 0.34, 1, r1, top, side);
      strip(pos, col, a + p / 2, w, 0.26, -0.26, p * 0.34, 1, r1, top, side);
      const s = i % 2 ? 1 : -1;
      box(pos, col, a + p / 4, -p * 0.3, p * 0.3, s > 0 ? 0.34 : -0.5, s > 0 ? 0.5 : -0.34, r1, top, side);
    }
  },
  // PADDLE: sand paddles: one straight bar right across each row
  paddle: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, r1 = 1 + h;
    for (let i = 0; i < rows; i++) box(pos, col, i * p, -p * 0.11, p * 0.11, -0.5, 0.5, r1, top, side);
  },
  // DIAMOND: a lattice of diamonds, one in the middle and a pair at the shoulders, row by row
  diamond: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, r1 = 1 + h, ds = p * 0.46, dz = 0.17;
    const dia = (a, zc) => block(pos, col, a, [[-ds, zc], [0, zc - dz], [ds, zc], [0, zc + dz]], r1, top, side);
    for (let i = 0; i < rows; i++) { const a = i * p; if (i % 2) dia(a, 0); else { dia(a, -0.33); dia(a, 0.33); } }
  },
  // MUD: big blocks from each shoulder, one long and one short a row, swapping sides; wide voids between rows
  mud: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, r1 = 1 + h, w = p * 0.5;
    for (let i = 0; i < rows; i++) {
      const a = i * p, s = i % 2 ? 1 : -1;
      box(pos, col, a, -w / 2, w / 2, s > 0 ? -0.5 : -0.06, s > 0 ? 0.06 : 0.5, r1, top, side);
      box(pos, col, a, -w / 2, w / 2, s > 0 ? 0.18 : -0.5, s > 0 ? 0.5 : -0.18, r1, top, side);
    }
  },
  // HONEYCOMB: hexagon blocks, a pair then one between them, row by row
  honeycomb: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, r1 = 1 + h, rs = p * 0.34, rz = 0.15;
    const hex = (a, zc) => block(pos, col, a, [0, 1, 2, 3, 4, 5].map(k => { const t = k / 6 * TAU; return [Math.cos(t) * rs, zc + Math.sin(t) * rz]; }), r1, top, side);
    for (let i = 0; i < rows; i++) { const a = i * p; if (i % 2) hex(a, 0); else { hex(a, -0.33); hex(a, 0.33); } }
  },
  // SPIKES: square-footed pyramids (a small flat tip), a pair then one between them
  spikes: (pos, col, { rows, h, top, side }) => {
    const p = TAU / rows, r1 = 1 + h, ds = p * 0.3, dz = 0.13;
    const spike = (a, zc) => block(pos, col, a, [[-ds, zc - dz], [ds, zc - dz], [ds, zc + dz], [-ds, zc + dz]], r1, top, side, 0.22);
    for (let i = 0; i < rows; i++) { const a = i * p; if (i % 2) spike(a, 0); else { spike(a, -0.3); spike(a, 0.3); } }
  },
};
const LITE_ROWS = { knobbly: 8, chevron: 10, ribs: 8, lugs: 10, studs: 8, slick: 16, trail: 8, zigzag: 8, paddle: 6, diamond: 8, mud: 8, honeycomb: 8, spikes: 8 };
const geos = new Map();
// ---- the PATTERN'S COLOURS (16-Oct: a black pattern on a black tyre did not read at phone size). The TINT of a tread: on a dark
// rubber a worn mid grey (PATTERN of it is about sRGB #6f: the blocks' tops and the band's blocks), on a coloured or light rubber the
// rubber itself; the grooves are GROOVE of it (near black). A plain design (the slick) is darker all over.
const PATTERN = 0.83, GROOVE = 0.045, DARK_TINT = 0.2;
const tintOf = (hex, d) => {
  const c = lin(hex), l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const t = l < 0.12 ? [DARK_TINT, DARK_TINT, DARK_TINT * 1.04] : c.map(v => Math.min(1, v * 1.15));
  return d.plain ? times(t, 0.6) : t;
};
// ---- FOOTPRINTS: a design built once with FOOT on, for its band's texture, its chip's picture and its walls ----
const feet = new Map();
export const footprintsOf = (id, dir = 1, lite = false) => {
  const d = treadById(id), key = id + ':' + dir + (lite ? ':lite' : '');
  if (!d.n) return [];
  if (!feet.has(key)) {
    FOOT = [];
    try { BUILD[id]([], [], { rows: lite ? LITE_ROWS[id] : d.n, h: d.h, pin: d.pin || 0, dir, top: [1, 1, 1], side: [1, 1, 1] }); } finally { feet.set(key, FOOT); FOOT = null; }
  }
  return feet.get(key);
};
// a design's walls: where a block edge runs round the tyre at one place across (|z|, in W): a face square to the axle there
for (const d of TREAD_DESIGNS) if (d.n) {
  const zs = new Set();
  for (const f of footprintsOf(d.id)) {
    if (f.pts) f.pts.forEach(([a0, z0], i) => { const [a1, z1] = f.pts[(i + 1) % f.pts.length]; if (Math.abs(z1 - z0) < 1e-9 && Math.abs(a1 - a0) > 1e-9) zs.add(Math.abs(z0).toFixed(3)); });
    else { zs.add(Math.abs(f.z0).toFixed(3)); zs.add(Math.abs(f.z1).toFixed(3)); }
  }
  d.walls = [...zs].map(Number);
}
// draw a design's footprints into a 2D context: across (z) along one axis, round the tyre along the other; `rows` rows shown. For
// the band's texture (TILE: two rows round x the tread's width) and the chips' pictures (render/cosmeticsui.js). value(kind): the
// fill for 'groove', 'block', 'steel'.
// tile: the texture's way (every footprint folded into `rows` rows, which must be a whole number of the design's repeat, 2); otherwise a
// stretch of the tyre from `from` rows on (a chip)
export const drawTread = (g, id, { w, h, rows = 2, dir = 1, lite = false, around = 'x', value, tile = false, from = -0.5 }) => {
  const d = treadById(id);
  g.fillStyle = value('groove'); g.fillRect(0, 0, w, h);
  if (!d.n) return;
  const p = TAU / (lite ? LITE_ROWS[id] : d.n), L = around === 'x' ? w : h, X = around === 'x' ? h : w;
  const map = (ang, z, shift) => { const u = ((ang + shift) / (rows * p) - (tile ? 0 : from / rows)) * L, v = (z + 0.5) * X; return around === 'x' ? [u, v] : [v, u]; };
  const shifts = tile ? [...Array(Math.ceil(TAU / (rows * p)) + 3).keys()].map(k => (1 - k) * rows * p) : [0, -TAU];
  for (const steel of [false, true]) {
    g.fillStyle = value(steel ? 'steel' : 'block');
    for (const f of footprintsOf(id, dir, lite)) {
      if (!!f.steel !== steel) continue;
      if (!f.pts) { const [a, b] = [map(0, f.z0, 0), map(0, f.z1, 0)]; if (around === 'x') g.fillRect(0, a[1], w, b[1] - a[1]); else g.fillRect(a[0], 0, b[0] - a[0], h); continue; }
      for (const shift of shifts) {
        g.beginPath();
        f.pts.forEach(([ang, z], i) => { const [x, y] = map(ang, z, shift); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
        g.closePath(); g.fill();
      }
    }
  }
};
// the band's texture: one per design, way round and lite (128 x 128, a few kB each; light blocks on dark grooves, a grey the tint colours)
export const TILE = 128;
const texes = new Map();
const grey = (v) => { const n = Math.round(Math.pow(v, 1 / 2.2) * 255); return 'rgb(' + n + ',' + n + ',' + n + ')'; }; // (linear to an sRGB canvas grey)
const treadTexture = (id, dir, lite) => {
  const key = id + ':' + dir + (lite ? ':lite' : '');
  if (!texes.has(key)) {
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    let tex = null;
    if (c) {
      c.width = c.height = TILE;
      const g = c.getContext && c.getContext('2d');
      if (g) drawTread(g, id, { w: TILE, h: TILE, rows: 2, dir, lite, tile: true, value: (k) => grey(k === 'groove' ? GROOVE : k === 'steel' ? 1 : PATTERN) });
      tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.flipY = false;
      tex.userData.shared = true;
    }
    texes.set(key, tex);
  }
  return texes.get(key);
};
// THE BLOCKS of a design and variant (no colour: the tyre's tint is the material's; vertex colours are the shading, 1 on the tops, SIDE on
// the walls, a stud's steel over 1 so it stays bright on any tint), uv from where each point is round and across (the band's texture: a
// block's top samples its own footprint there). Shared by every tyre and rubber colour.
const SIDE = 0.45, STUD = STEEL.map(v => v / DARK_TINT);
export const treadGeometry = (id, hex, { k = 1, lite = false, dir = 1 } = {}) => {
  const d = treadById(id);
  const key = id + ':' + k + (lite ? ':lite' : '') + (d.dir ? ':' + dir : '');
  if (!geos.has(key)) {
    const rows = lite ? LITE_ROWS[id] : d.n, pos = [], col = [], top = [1, 1, 1], side = [SIDE, SIDE, SIDE];
    BUILD[id](pos, col, { rows, h: d.h * k, pin: (d.pin || 0) * Math.max(k, 0.7), dir, top, side });
    const steelSide = times(STEEL, 0.7), uv = [];
    for (let i = 0; i < col.length; i += 3) {
      if (col[i] === STEEL[0] && col[i + 1] === STEEL[1]) col.splice(i, 3, ...STUD); else if (col[i] === steelSide[0] && col[i + 1] === steelSide[1]) col.splice(i, 3, ...times(STUD, 0.7));
    }
    for (let i = 0; i < pos.length; i += 9) { // (each triangle's angles unwrapped from its first point's, so none straddles the seam)
      const a0 = Math.atan2(pos[i + 1], pos[i]);
      for (let j = 0; j < 3; j++) { let a = Math.atan2(pos[i + j * 3 + 1], pos[i + j * 3]); while (a - a0 > Math.PI) a -= TAU; while (a - a0 < -Math.PI) a += TAU; uv.push(a / TAU * rows / 2, pos[i + j * 3 + 2] + 0.5); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    g.userData.shared = true;
    // the lowest point of the blocks' tops (in R): a flat top is lower in its middle than at its corners (the pattern band stays FIT_GAP under it)
    let low = Infinity;
    for (let i = 0; i < pos.length; i += 9) if (col[i] === 1 && col[i + 1] === 1) low = Math.min(low, Math.hypot((pos[i] + pos[i + 3] + pos[i + 6]) / 3, (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3));
    g.userData.topLow = low === Infinity ? 1 + d.h * k : low;
    geos.set(key, g);
  }
  return geos.get(key);
};
export const treadTriangles = (id, opts) => treadGeometry(id, null, opts).attributes.position.count / 3; // (the blocks; the band and rings: SKIN_SEG x 2 and SKIN_SEG x 2 a face)
export const treadRows = (id, lite = false) => (lite ? LITE_ROWS[id] : treadById(id).n);
// the blur band: an open tube just over the blocks' tops (its flattest facet 2 % of R over them) and two side rings
const BAND_SEG = 20;
export const treadHeight = (d, k = 1) => d.h * k + (d.pin || 0) * Math.max(k, 0.7); // (in R, over the tyre: the tallest part)
const bandGeometry = (id, k) => {
  const key = 'band:' + id + ':' + k;
  if (!geos.has(key)) {
    const d = treadById(id), top = 1 + treadHeight(d, k) + 0.02, r = top / Math.cos(Math.PI / BAND_SEG);
    // the tube, and a flat ring at each side just outside the tread (inside the tyre's width), so the blocks blur seen from the side too
    const g = mergeGeometries([new THREE.CylinderGeometry(r, r, 1, BAND_SEG, 1, true).rotateX(Math.PI / 2),
      new THREE.RingGeometry(0.95, r, BAND_SEG, 1).translate(0, 0, 0.56), new THREE.RingGeometry(0.95, r, BAND_SEG, 1).rotateY(Math.PI).translate(0, 0, -0.56)], false);
    g.userData.shared = true; geos.set(key, g);
  }
  return geos.get(key);
};

// ---- the PATTERN BAND and the SHOULDER RING (16-Oct) ----
// the band: an open tube over the tread's width just outside the tyre (rb, in R: SKIN_M over its farthest vertex, so never more proud
// than the lowest step's graze), the texture wrapped round it, two rows a repeat. SKIN_SEG facets: a prime, so no facet of it lies
// parallel to one of a tyre's (10 to 48 facets) and 3 to 5 mm off it.
export const SKIN_M = [0.003, 0.0045], SKIN_SEG = 47;
const BULGE = 1.03 / Math.cos(Math.PI / 47) - 1.03; // (in R: how much higher the band's corners stand than its facets' middles)
export const skinRadius = (R) => 1 + Math.min(SKIN_M[1], Math.max(SKIN_M[0], 0.012 * R)) / R;
const plainGeometry = (pos, nor, uv) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3)); // (white: the tint and the texture colour it)
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.shared = true;
  return g;
};
const skinGeometry = (rows, rb) => {
  const key = 'skin:' + rows + ':' + rb.toFixed(3);
  if (!geos.has(key)) {
    const pos = [], uv = [], nor = [], r = rb / Math.cos(Math.PI / SKIN_SEG); // (the facets' middles at rb)
    for (let i = 0; i < SKIN_SEG; i++) {
      const a0 = i / SKIN_SEG * TAU, a1 = (i + 1) / SKIN_SEG * TAU, u0 = a0 / TAU * rows / 2, u1 = a1 / TAU * rows / 2;
      const P = (a, z) => [r * Math.cos(a), r * Math.sin(a), z];
      for (const [a, z, u, v] of [[a0, -0.5, u0, 0], [a1, -0.5, u1, 0], [a1, 0.5, u1, 1], [a0, -0.5, u0, 0], [a1, 0.5, u1, 1], [a0, 0.5, u0, 1]]) { pos.push(...P(a, z)); uv.push(u, v); nor.push(Math.cos(a), Math.sin(a), 0); }
    }
    geos.set(key, plainGeometry(pos, nor, uv));
  }
  return geos.get(key);
};
// the shoulder ring: a flat annulus on the tyre's outer face (RING_IN..RING_OUT of R: outside a whitewall's 0.88 and a rim's lip at 0.8,
// inside the tyre's outline), facing out along +z (sign 1) or -z, showing the band's pattern where it meets that shoulder (z from
// FACE_Z to the edge), so the tread reads side on. Placed FACE_GAP off the tyre's face (the sidewall rings' 5 mm).
export const RING_IN = 0.89, RING_OUT = 0.97, FACE_Z = 0.3, FACE_GAP = 0.005;
const faceGeometry = (rows, sign) => {
  const key = 'face:' + rows + ':' + sign;
  if (!geos.has(key)) {
    const pos = [], uv = [], nor = [], seg = SKIN_SEG;
    const v = (r) => { const k = (r - RING_IN) / (RING_OUT - RING_IN), z = FACE_Z + (0.5 - FACE_Z) * k; return sign > 0 ? z + 0.5 : 0.5 - z; };
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU, u0 = a0 / TAU * rows / 2, u1 = a1 / TAU * rows / 2;
      const P = (a, r) => [r * Math.cos(a), r * Math.sin(a), 0];
      const quad = [[a0, RING_IN, u0], [a1, RING_IN, u1], [a1, RING_OUT, u1], [a0, RING_IN, u0], [a1, RING_OUT, u1], [a0, RING_OUT, u0]];
      const order = sign < 0 ? quad : [quad[0], quad[2], quad[1], quad[3], quad[5], quad[4]]; // (wound to face out: the quad as listed faces -z)
      for (const [a, r, u] of order) { pos.push(...P(a, r)); uv.push(u, v(r)); nor.push(0, 0, sign); }
    }
    geos.set(key, plainGeometry(pos, nor, uv));
  }
  return geos.get(key);
};
// ONE geometry for a tyre's whole tread: the blocks (k: their height step; none: no room), the band (rb: its radius in R; none), and a
// shoulder ring per face ([z in the mesh's frame, which way it faces]); shared by every tyre laid out the same
export const tyreTreadGeometry = (id, { k = null, lite = false, dir = 1, rb = null, faces = [] } = {}) => {
  const d = treadById(id), rows = lite ? LITE_ROWS[id] : d.n;
  const key = 'tyre:' + id + ':' + k + (lite ? ':lite' : '') + ':' + (d.dir ? dir : 1) + ':' + rb + ':' + faces.map(f => f.join('/')).join(',');
  if (!geos.has(key)) {
    const parts = [];
    if (k) parts.push(treadGeometry(id, null, { k, lite, dir }));
    if (rb) parts.push(skinGeometry(rows, rb));
    for (const [z, sign] of faces) parts.push(faceGeometry(rows, sign).clone().translate(0, 0, z));
    const g = parts.length ? mergeGeometries(parts.map(x => { const c = x.clone(); for (const n of Object.keys(c.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(n)) c.deleteAttribute(n); return c; }), false) : null;
    if (g) { g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.shared = true; g.userData.parts = { blocks: !!k, band: !!rb, rings: faces.length }; }
    geos.set(key, g);
  }
  return geos.get(key);
};
// their materials: per design / way round / lite and tint (every dark rubber shares one tint), the pattern's; and per tint a plain one
// for the band and ring while the blur band shows (a turning pattern would strobe)
const skinMats = new Map();
const skinMaterial = (id, dir, lite, hex) => {
  const d = treadById(id), tint = tintOf(hex, d), key = id + ':' + dir + (lite ? ':lite' : '') + ':' + tint.map(v => v.toFixed(3)).join(',');
  if (!skinMats.has(key)) {
    const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(...tint), map: treadTexture(id, dir, lite), vertexColors: true });
    m.userData.shared = true; m.userData.wheelHub = true; skinMats.set(key, m);
  }
  return skinMats.get(key);
};
const softMaterial = (hex, d) => {
  const tint = tintOf(hex, d), key = 'soft:' + tint.map(v => v.toFixed(3)).join(',');
  if (!skinMats.has(key)) { const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(...times(tint, (PATTERN + GROOVE) / 2)), vertexColors: true }); m.userData.shared = true; m.userData.wheelHub = true; skinMats.set(key, m); }
  return skinMats.get(key);
};

// ---- the blur band's materials: one per rubber colour and step ----
const blurs = new Map();
const blurMaterials = (hex) => {
  if (!blurs.has(hex)) {
    const c = new THREE.Color(hex);
    blurs.set(hex, BLUR.map((o) => { const m = new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: o, depthWrite: false }); m.userData.shared = true; m.userData.wheelHub = true; return m; }));
  }
  return blurs.get(hex);
};

// ---- room over each tyre, and the tyre's own tread ----
const Z = new THREE.Vector3(0, 0, 1), axis = new THREE.Vector3(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), pose = new THREE.Matrix4();
const toModel = new THREE.Matrix4(), m1 = new THREE.Matrix4(), v3 = new THREE.Vector3(), box3 = new THREE.Box3();
const ray = new THREE.Raycaster();
// FOR A CHECK (scripts/.treads-check.mjs measures pokes with rays, independently of roomFor's triangles, by the same rules): the surfaces
// met from a point inside a tyre (o: 0.8 R) out to a point of its tread (e), the tyre's surface `skin` along the way, either facing, a face
// square to the axle (`axle`, world) let be; null if one lies within the tyre's own outer band (bodywork that already cuts into the stock
// tyre); else how far past the skin the nearest one is (Infinity: none).
const nm = new THREE.Matrix3(), fn = new THREE.Vector3();
export const clearance = (others, o, e, skin, axle = null) => {
  cd3.subVectors(e, o); const len = cd3.length(); cd3.normalize();
  let least = Infinity;
  const square = (h) => axle && h.face && Math.abs(fn.copy(h.face.normal).applyMatrix3(nm.getNormalMatrix(h.object.matrixWorld)).normalize().dot(axle)) > 0.995;
  ray.set(o, cd3); ray.near = 0; ray.far = len;
  for (const h of ray.intersectObjects(others, false)) if (!square(h)) least = Math.min(least, h.distance);
  ray.set(e, cd3.negate()); ray.far = len;
  for (const h of ray.intersectObjects(others, false)) if (!square(h)) least = Math.min(least, len - h.distance);
  if (least <= skin + 0.0005) return null;
  return least - skin;
};
const cd3 = new THREE.Vector3();
// a tyre's true radius: its farthest vertex from the axle (in the model's frame)
const trueRadius = (t) => {
  const g = t.tyre.geometry, p = g.attributes.position;
  m1.multiplyMatrices(toModel, t.tyre.matrixWorld);
  let R = 0;
  for (let i = 0; i < p.count; i++) {
    v3.fromBufferAttribute(p, i).applyMatrix4(m1).sub(t.centre);
    R = Math.max(R, t.axleX ? Math.hypot(v3.y, v3.z) : Math.hypot(v3.y, v3.x));
  }
  return R || t.r;
};
// parts that stand on a tyre's running surface: round its axle, reaching past its tread but not far (cleats, a ring of tread blocks),
// or small parts lying wholly in the band just over its tread within its width
const ownTread = (model, t, meshes) => {
  const out = [];
  for (const m of meshes) {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    box3.copy(m.geometry.boundingBox).applyMatrix4(m1.multiplyMatrices(toModel, m.matrixWorld));
    const c = box3.getCenter(v3).sub(t.centre), along = t.axleX ? c.x : c.z, sz = box3.getSize(new THREE.Vector3());
    const wide = t.axleX ? sz.x : sz.z, across = Math.max(sz.y, t.axleX ? sz.z : sz.x);
    if (Math.abs(along) > t.half + 0.01 || wide > 2 * t.half + 0.03) continue;
    const onAxle = Math.hypot(c.y, t.axleX ? c.z : c.x) < 0.1 * t.R;
    if (onAxle && across > 1.94 * t.r && across < 2.5 * t.R) { out.push(m); continue; } // (a ring of tread round the tyre)
    // a single cleat: its box's nearest corner to the axle at least 0.8 R out, its farthest no more than 1.3 R
    const cy = c.y, cx = t.axleX ? c.z : c.x, hy = sz.y / 2, hx = (t.axleX ? sz.z : sz.x) / 2;
    const far = Math.hypot(Math.abs(cy) + hy, Math.abs(cx) + hx), near = Math.hypot(Math.max(0, Math.abs(cy) - hy), Math.max(0, Math.abs(cx) - hx));
    if (near > 0.8 * t.R && far < 1.3 * t.R && across < 0.6 * t.R) out.push(m);
  }
  return out;
};
// ---- the room over a tyre, from the triangles of the parts near it (no rays: exact, and cheap) ----
// trianglesNear: every triangle of those meshes, in the tyre's own terms: [axial, across, up] from its centre, in the model's units
const tv = new THREE.Vector3();
const trianglesNear = (meshes, t) => {
  const out = [];
  for (const m of meshes) {
    const g = m.geometry, p = g.attributes.position, idx = g.index, n = idx ? idx.count : p.count;
    m1.multiplyMatrices(toModel, m.matrixWorld);
    const pt = (i) => { tv.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(m1).sub(t.centre); return t.axleX ? [tv.x, tv.z, tv.y] : [tv.z, tv.x, tv.y]; };
    for (let i = 0; i + 2 < n; i += 3) {
      const a = pt(i), b = pt(i + 1), c = pt(i + 2);
      const far = 1.4 * t.R + 0.02; // (a quick cut: wholly beyond the tyre's reach on one side)
      if (Math.min(a[1], b[1], c[1]) > far || Math.max(a[1], b[1], c[1]) < -far || Math.min(a[2], b[2], c[2]) > far || Math.max(a[2], b[2], c[2]) < -far) continue;
      if (Math.min(a[0], b[0], c[0]) > t.half + 0.02 || Math.max(a[0], b[0], c[0]) < -t.half - 0.02) continue;
      out.push([a, b, c]);
    }
  }
  return out;
};
const squareToAxle = ([a, b, c]) => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n);
  return l > 0 && Math.abs(n[0]) / l > 0.995;
};
// a polygon clipped to where f(p) >= 0
const clip = (poly, f) => {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const k = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]); }
  }
  return out;
};
// the part of a triangle within the slab z0..z1 across and between heights lo..hi (up, from the axle): how near to the axle and how far
// from it it comes (the nearest: the distance from the axle to the clipped polygon seen along the axle; 0 if it goes round it), or null
const shell = (tri, z0, z1, lo, hi) => {
  let poly = clip(tri, p => p[0] - z0);
  if (poly.length) poly = clip(poly, p => z1 - p[0]);
  if (poly.length) poly = clip(poly, p => p[2] - lo);
  if (poly.length && hi !== Infinity) poly = clip(poly, p => hi - p[2]);
  if (poly.length < 3) return null;
  let max = 0, min = Infinity, inside = true, sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    max = Math.max(max, Math.hypot(a[1], a[2]));
    const ex = b[1] - a[1], ey = b[2] - a[2], l2 = ex * ex + ey * ey, k = l2 ? Math.max(0, Math.min(1, -(a[1] * ex + a[2] * ey) / l2)) : 0;
    min = Math.min(min, Math.hypot(a[1] + ex * k, a[2] + ey * k));
    const cr = ex * -a[2] - ey * -a[1]; // (which side of the edge the axle is)
    if (Math.abs(cr) > 1e-12) { const sg = Math.sign(cr); if (!sign) sign = sg; else if (sg !== sign) inside = false; }
  }
  return { min: inside && sign ? 0 : min, max };
};
// per tyre: t.R (true radius), t.ownTread, t.treadRoom (m), t.tz (its tread's extent across); per axle t.axleRoom (in R): the least of the axle
const roomFor = (model, found) => {
  model.updateMatrixWorld(true);
  toModel.copy(model.matrixWorld).invert();
  const tyres = new Set(found.tyres || []), hubs = new Set(found.rawHubs.map(h => h.mesh));
  const meshes = [];
  model.traverse((n) => { if (n.isMesh && !tyres.has(n) && !hubs.has(n) && !n.userData.wheelRing && !n.isInstancedMesh && n.geometry) { let p = n, seen = true; while (p && p !== model) { if (!p.visible) seen = false; p = p.parent; } if (seen) meshes.push(n); } });
  const rubberAll = new Set(found.rimInfo.flatMap(t => t.rubber));
  const scale = model.matrixWorld.getMaxScaleOnAxis() || 1;
  const hMax = Math.max(...TREAD_DESIGNS.filter(d => d.n).map(d => treadHeight(d)));
  // across: each tyre's tread is SPAN of its width (less EDGE a side), and short of a TWIN beside it (tyres on one axle line that touch or overlap:
  // the line between them is half-way, the tread EDGE short of it)
  for (const t of found.rimInfo) {
    t.tz = [-(t.half - EDGE) * SPAN, (t.half - EDGE) * SPAN];
    t.twin = { '-1': false, '1': false }; // (a twin tyre against that face: no shoulder ring there)
    const at = (u) => (t.axleX ? u.centre.x : u.centre.z);
    for (const u of found.rimInfo) {
      if (u === t || u.axleX !== t.axleX || Math.abs(u.centre.y - t.centre.y) > 0.1 * t.r || Math.abs((t.axleX ? u.centre.z - t.centre.z : u.centre.x - t.centre.x)) > 0.1 * t.r) continue;
      const d = at(u) - at(t);
      if (Math.abs(d) > t.half + u.half + 0.04) continue;
      t.twin[d > 0 ? '1' : '-1'] = true;
      if (Math.abs(d) > t.half + u.half + 0.02) continue;
      if (d > 0) t.tz[1] = Math.min(t.tz[1], d / 2 - EDGE); else t.tz[0] = Math.max(t.tz[0], d / 2 + EDGE);
    }
  }
  const boxes = new Map(meshes.map(m => { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); return [m, new THREE.Box3().copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld)]; }));
  const sphere = new THREE.Sphere();
  for (const t of found.rimInfo) {
    t.R = trueRadius(t);
    sphere.center.copy(t.centre).applyMatrix4(model.matrixWorld); sphere.radius = (t.R * 1.35 + t.half) * scale; // (only the parts near this tyre are tried)
    const nearby = meshes.filter(m => boxes.get(m).intersectsSphere(sphere) && !rubberAll.has(m));
    t.ownTread = ownTread(model, t, meshes);
    const mine = new Set([...t.ownTread, ...t.rubber]);
    const tris = trianglesNear(nearby.filter(m => !mine.has(m)), t);
    // (for the side walls also the wheel's own flat parts: a hub's face or a tyre-coloured ring lying in a wall's plane z-fights the same)
    const own = [...found.rawHubs.filter(h => h.tyre === t.tyre).map(h => h.mesh), ...t.rubber].filter(m => m.visible && m.geometry?.attributes?.position);
    const wallTris = tris.concat(trianglesNear(own, t));
    // beside the tread: a flat face of bodywork lying in the plane of one of its side walls (a skirt or a body side the wheel is set into,
    // within 5 mm of it: the z-fight finder's 4 mm and a little) brings that wall in 8 mm at a time until it is clear; still close at 60 % of
    // the tread's width: no tread on that tyre
    for (const end of [0, 1]) {
      for (let tries = 0; tries < 8; tries++) {
        const z = t.tz[end];
        // (a face square to the axle within 5 mm of the wall's plane, over the wall's height: the z-fight finder's 4 mm and a little)
        const near = wallTris.some(tri => { if (!squareToAxle(tri) || tri.some(p => Math.abs(p[0] - z) > 0.005)) return false; const s = shell(tri, z - 0.006, z + 0.006, -0.7 * t.R, Infinity); return s && s.min < t.R * (1 + hMax) && s.max > BASE * t.R; });
        const out = end ? 1 : -1;
        if (!near) break;
        if (t.tz[1] - t.tz[0] < (t.half - EDGE) * SPAN * 1.2) { t.wallBlocked = true; break; } // (still close at 60 % of the width: no tread here)
        t.tz[end] -= out * 0.008;
      }
    }
    // the room over the tread: every part's triangles within the tread's width, round the tyre bar the floor's quarter; a face square to
    // the axle (a body side the wheel is set into) is let be: the tread goes into it as the tyre does, edge on, nothing shows through
    let room = Infinity, near = Infinity; // (near: the least room over the tyre from the parts that stay outside it, even where another dips in)
    for (const tri of tris) {
      if (squareToAxle(tri)) continue;
      for (const [lo, hi, over] of [[0.35 * t.R, Infinity, true], [-0.7 * t.R, 0.35 * t.R, false]]) {
        const s = shell(tri, t.tz[0], t.tz[1], lo, hi);
        if (!s || s.max <= t.R) continue; // (nothing there, or wholly inside the tyre: hidden)
        if (s.min > t.R) near = Math.min(near, s.min - t.R);
        if (s.min > t.R) room = Math.min(room, s.min - t.R);
        else if (over) room = 0; // (over the tyre, an arch dips into it: a tread turning past would show through it)
        // (low down, a sill or a bumper run through the stock tyre: the tread goes in with the tyre)
      }
    }
    // faces square to the axle WITHIN the tread's width (a body side or a sill end the wheel is set into): a design's inner walls keep off them
    t.squares = [];
    for (const tri of wallTris) if (squareToAxle(tri)) { const z = (tri[0][0] + tri[1][0] + tri[2][0]) / 3; if (z > t.tz[0] - 0.006 && z < t.tz[1] + 0.006) { const sh = shell(tri, z - 0.003, z + 0.003, -0.7 * t.R, Infinity); if (sh && sh.min < t.R * (1 + hMax) && sh.max > BASE * t.R) t.squares.push(z); } }
    t.treadRoom = t.wallBlocked || t.R < MIN_R ? 0 : room; // (m over the tyre's tread before bodywork; Infinity: open; 0: none)
    // the PATTERN BAND's lift over the tyre (m): SKIN_M, or less where a part over the tyre is closer than that plus FIT_GAP (a face of it
    // within 4 mm of the band would z-fight); under 2 mm: no band on that tyre. Where bodywork dips into the tyre the band goes in with it, as
    // the tyre itself does (only the parts that stay outside the tyre count)
    t.skinLift = Math.min((skinRadius(t.R) - 1) * t.R, near - FIT_GAP - BULGE * t.R);
    // the SHOULDER RING on each outer face: nothing of the bodywork or the wheel's own parts within a few mm of the ring's plane over its
    // annulus, and no twin tyre against that face
    t.faceOk = {};
    for (const f of [-1, 1]) {
      const F = f * (t.half + FACE_GAP), z0 = f > 0 ? F - 0.002 : F - 0.009, z1 = f > 0 ? F + 0.009 : F + 0.002;
      t.faceOk[f] = t.R >= MIN_R && !t.twin[String(f)] && !wallTris.some(tri => { const s = shell(tri, z0, z1, -Infinity, Infinity); return s && s.max > (RING_IN - 0.03) * t.R && s.min < (RING_OUT + 0.025) * t.R; });
    }
  }
  // the axles (tyres within a third of a radius along the car): the least room of the axle
  const axles = [];
  for (const t of found.rimInfo) { const z = t.axleX ? t.centre.z : t.centre.x; const ax = axles.find(a => Math.abs(a.z - z) < t.r / 3); if (ax) ax.tyres.push(t); else axles.push({ z, tyres: [t] }); }
  for (const ax of axles) { const room = Math.min(...ax.tyres.map(t => t.treadRoom / t.R)); for (const t of ax.tyres) t.axleRoom = room; } // (in R)
  found.treadLite = found.rimInfo.length > LITE_FROM;
  found.treadRoomChecked = true;
};
// the room is measured AT REST: on the Cosmetics screen a tread is put on the live model, whose suspension (render/carsuspension.js) may be
// mid-bounce, its tyres and low parts held or squashed by matrices of their own; those are set back to their rest pose for the measure
const atRest = (model, fn) => {
  const s = model.userData.suspension;
  if (!s || !s.active) return fn();
  const nodes = [...s.planted, ...s.squash.map(p => p.node)], saved = nodes.map(n => n.matrix.clone());
  for (const n of nodes) n.updateMatrix();
  model.updateMatrixWorld(true);
  try { return fn(); } finally { nodes.forEach((n, i) => n.matrix.copy(saved[i])); model.updateMatrixWorld(true); }
};
// how a design fits a tyre: the height step k (LOWS) that fits under what is over it (the lowest may graze it by GRAZE), or null
const fitOf = (t, d) => t.axleRoom <= 0 ? null : LOWS.find((k, i) => k >= (d.kMin || 0) && (t.axleRoom >= treadHeight(d, k) + FIT_GAP / t.R || (i === LOWS.length - 1 && t.axleRoom >= treadHeight(d, k) - GRAZE / t.R))) || null;

export const removeTreads = (model) => {
  const st = model.userData.wheelHubs?.treads;
  if (!st) return;
  for (const mesh of st.list) mesh.parent?.remove(mesh);
  for (const part of st.hidden) part.visible = true;
  st.list.length = 0; st.hidden.length = 0;
};
// the treads a model wears now: per tyre, the tread its axle resolves to. worn false: none (a saved set not owned). Returns how many.
export const addTreads = (model, worn = true) => {
  const found = model.userData.wheelHubs;
  if (!found) return 0;
  if (!found.treads) found.treads = { list: [], hidden: [] };
  removeTreads(model);
  if (!worn || found.rimSkip || found.legend || !found.rimInfo || !found.rimInfo.length) return 0;
  if (!found.rimInfo.some(t => resolveTread(found.carId, t.axle) !== 'none')) return 0;
  model.updateMatrixWorld(true);
  toModel.copy(model.matrixWorld).invert();
  if (!found.treadRoomChecked) atRest(model, () => roomFor(model, found));
  for (const t of found.rimInfo) {
    const d = treadById(resolveTread(found.carId, t.axle));
    if (!d.n) continue;
    const tyre = t.tyre, ghost = tyre.userData.solidMat, current = ghost || tyre.material;
    if (current !== t.stock && current !== model.userData.wheelRubberClones?.get(t.stock)) continue; // (blacked out: no tread)
    if (t.R < MIN_R) continue; // (too small to read, and too tight)
    // RAISED blocks where they fit (fit: the height step); else (bodywork close over the tyre, or dipping into it) the pattern band alone
    let fit = fitOf(t, d);
    const side = t.outer || 1, lite = found.treadLite || t.R < SMALL_R, hex = current.color.getHex(), dirKey = d.dir ? side : 1;
    axis.set(t.axleX ? side : 0, 0, t.axleX ? 0 : side);
    q.setFromUnitVectors(Z, axis);
    // across, from the tyre's middle along the axle (+x / +z of the model): clear of its sidewalls and of a twin beside it; moved aside (and
    // narrowed to stay within the tyre) while one of the design's walls lies within 5 mm of a body face in its plane
    let lo = t.tz[0], hi = t.tz[1];
    if (fit) {
      const clash = (l, h) => t.squares.some(z => d.walls.some(f => Math.abs((l + h) / 2 + f * (h - l) - z) < 0.005 || Math.abs((l + h) / 2 - f * (h - l) - z) < 0.005));
      for (const sh of [0.006, -0.006, 0.012, -0.012, 0.018, -0.018]) { if (!clash(lo, hi)) break; if (!clash(t.tz[0] + Math.abs(sh) + sh, t.tz[1] - Math.abs(sh) + sh)) { lo = t.tz[0] + Math.abs(sh) + sh; hi = t.tz[1] - Math.abs(sh) + sh; } } // (moved aside and narrowed, so it stays within the tyre)
      if (clash(lo, hi)) { fit = null; lo = t.tz[0]; hi = t.tz[1]; } // (no way clear for the blocks' walls: the band alone, which has none)
    }
    const W = Math.max(0.03, hi - lo), mid = (lo + hi) / 2;
    pos.copy(t.centre); if (t.axleX) pos.x += mid; else pos.z += mid;
    pose.compose(pos, q, scl.set(t.R, t.R, W)).premultiply(t.toTyre);
    const rows = treadRows(d.id, lite), sharp = skinMaterial(d.id, dirKey, lite, hex), soft = softMaterial(hex, d);
    // the band: under raised blocks, FIT_GAP or more under their tops (a top close over it would z-fight); none if under 2 mm
    const blocks = fit ? treadGeometry(d.id, null, { k: fit, lite, dir: side }) : null;
    const lift = fit ? Math.min(t.skinLift, (blocks.userData.topLow - 1 - BULGE) * t.R - FIT_GAP) : t.skinLift;
    const rb = lift >= 0.002 ? Math.round((1 + lift / t.R) * 1000) / 1000 : null;
    // the shoulder rings, on the outer face(s) with room (a centre wheel: both), in the mesh's frame: its z is the axle times `side`
    const faces = (t.outer ? [t.outer] : [-1, 1]).filter(f => t.faceOk[f]).map(f => [Math.round(side * (f * (t.half + FACE_GAP) - mid) / W * 1000) / 1000, side * f]);
    const geo = tyreTreadGeometry(d.id, { k: fit, lite, dir: side, rb, faces });
    if (!geo) continue; // (no blocks, no band, no ring: stock)
    // ONE mesh a tyre (one draw call, as before): the blocks, the band and the rings in one geometry, one material (the pattern's texture,
    // the tint, the shading in vertex colours)
    const mesh = new THREE.Mesh(geo, sharp);
    pose.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.userData.wheelRing = true;
    const skins = [mesh];
    let blur = null, bl = null;
    if (fit) {
      bl = blurMaterials(hex);
      blur = new THREE.Mesh(bandGeometry(d.id, fit), bl[1]);
      blur.userData.wheelRing = true; blur.visible = false;
      mesh.add(blur);
    }
    mesh.userData.tread = { id: d.id, side, fit, lite, rows, q0: mesh.quaternion.clone(), a: 0, f: 0, level: 0, gap: TAU / rows, r: t.r, tyre, x0: tyre.rotation.x, rolls: !!model.userData.rollsWheels, blur, blurs: bl, skins, sharp, soft };
    if (ghost) for (const part of [mesh, ...mesh.children]) { part.userData.solidMat = part.material; part.material = tyre.material; }
    tyre.add(mesh);
    found.treads.list.push(mesh);
    for (const part of t.ownTread || []) if (part.visible) { part.visible = false; found.treads.hidden.push(part); }
  }
  return found.treads.list.length;
};
// 'ok' (raised blocks on some tyre), 'flat' (the pattern band and shoulder rings only: bodywork close over or into every tyre), 'skip'
// (RIM_SKIP, Legendary) or 'none' (no tyre found, or every tyre under MIN_R)
export const treadStatus = (model) => {
  const found = model?.userData.wheelHubs;
  if (!found) return 'none';
  if (found.rimSkip || found.legend) return 'skip';
  if (!found.rimInfo || !found.rimInfo.length) return 'none';
  if (!found.treadRoomChecked) atRest(model, () => roomFor(model, found));
  if (found.rimInfo.some(t => t.R >= MIN_R && TREAD_DESIGNS.some(d => d.n && fitOf(t, d)))) return 'ok';
  return found.rimInfo.some(t => t.R >= MIN_R) ? 'flat' : 'none';
};
// can this car wear a tread at all (the Cosmetics screen's Tread row is shown only then)
export const treadSupported = (model) => { const s = treadStatus(model); return s === 'ok' || s === 'flat'; };

// ---- turning ----
const Q = new THREE.Quaternion();
const levelOf = (f) => (f < BLUR_FROM ? 0 : Math.min(BLUR.length - 1, 1 + Math.floor((f - BLUR_FROM) / (BLUR_FULL - BLUR_FROM) * (BLUR.length - 1))));
const setLevel = (u, level) => {
  if (u.level === level) return;
  const b = u.blur;
  if (b && !u.blurs.includes(b.userData.solidMat || b.material)) return;
  u.level = level;
  if (b) { b.visible = level > 0; if (level > 0) { if (b.userData.solidMat) b.userData.solidMat = u.blurs[level]; else b.material = u.blurs[level]; } }
  // the pattern band and rings: plain while it blurs (a turning pattern would strobe); a stand-in (a ghost's) keeps theirs in solidMat
  const m = level > 0 ? u.soft : u.sharp;
  for (const s of u.skins) { if (s.userData.solidMat) s.userData.solidMat = m; else if (s.material === u.sharp || s.material === u.soft) s.material = m; }
};
export const treadFrame = (model, dt, dist) => {
  const st = model.userData.wheelHubs?.treads;
  if (!st || !st.list.length) return;
  const scale = dist === null ? 1 : (model.matrixWorld.getMaxScaleOnAxis() || 1);
  for (let i = 0; i < st.list.length; i++) {
    const mesh = st.list[i], u = mesh.userData.tread;
    let da = dist === null ? IDLE_RATE * dt : dist / (u.r * scale);
    u.f = dist === null ? 0 : u.f + (Math.abs(da) / u.gap - u.f) * 0.25; // (on show the idle turn is slow: never blurred, even at a low frame rate)
    const lim = CLAMP * u.gap;
    if (da > lim) da = lim; else if (da < -lim) da = -lim;
    setLevel(u, levelOf(u.f));
    u.a = (u.a + da) % TAU;
    Q.setFromAxisAngle(Z, u.side * (u.a - (u.rolls ? u.tyre.rotation.x - u.x0 : 0)));
    mesh.quaternion.copy(u.q0).multiply(Q);
  }
};
// THE per-frame turn of a dressed model's wheels (rims, spinners and treads in one pass), from its animate(t) (seconds, wall clock):
// the time step, and the roll the game gave it (render/items.js) if any. No allocation.
export const turnWheels = (model, t) => {
  const found = model.userData.wheelHubs;
  if (!found) return;
  const st = found.turn || (found.turn = { t: null, roll: undefined });
  let dt = st.t === null ? 0 : t - st.t;
  st.t = t;
  if (!(dt > 0)) dt = 0; else if (dt > 0.1) dt = 0.1;
  const roll = model.userData.roll;
  let dist = null;
  if (typeof roll === 'number') { dist = st.roll === undefined ? 0 : roll - st.roll; st.roll = roll; }
  if (LOG?.stopAt && !model.userData.onShow && (LOG.models.get(model)?.rows.length || 0) >= LOG.stopAt) return; // (?treadstop=K: the wheels held at the run's K-th frame, for a still)
  if (found.rims?.list.length) rimFrame(model, dt, dist);
  if (found.treads?.list.length) treadFrame(model, dt, dist);
  if (LOG) logFrame(model, found, dt, dist);
};

// ---- PROOF IN A REAL RUN (?treadlog, the owner, 15-Oct: "Check that the tread do actually spin"): render-only, off unless asked. Each
// frame of a dressed model it measures how far every tread and rim mesh has really turned about its axle, in the model's own frame (a
// point on the mesh, as scripts/.treads-check.mjs measures: whatever turns it, its own turn or a tyre that turns itself), with the
// distance rolled; after LOG_FRAMES frames it prints one summary line (console.warn, which scripts/shots.mjs prints under a picture).
const LOG = typeof location !== 'undefined' && /[?&]treadlog\b/.test(location.search) ? { models: new Map(), stopAt: +(/[?&]treadstop=(\d+)/.exec(location.search)?.[1] || 0) } : null;
const LOG_FRAMES = 60, LOG_EACH = LOG ? /[?&]treadlog=(\d+)/.exec(location.search)?.[1] | 0 : 0, lp = new THREE.Vector3(), lm = new THREE.Matrix4();
const logFrame = (model, found, dt, dist) => {
  let st = LOG.models.get(model);
  if (!st) { st = { car: found.carId, rows: [], last: null, done: false }; LOG.models.set(model, st); console.warn('TREADLOG start car=' + found.carId + ' treads=' + (found.treads?.list.length || 0) + ' rims=' + (found.rims?.list.length || 0) + ' tyres=' + (found.rimInfo?.length || 0) + ' on show=' + !!model.userData.onShow); }
  if (st.done) return;
  model.updateMatrixWorld(true);
  lm.copy(model.matrixWorld).invert();
  const angleOf = (mesh, u) => {
    const t = found.rimInfo.find(x => x.tyre === u.tyre);
    lp.set(0, 0.9, 0).applyMatrix4(mesh.matrixWorld).applyMatrix4(lm).sub(t.centre);
    return t.axleX ? Math.atan2(lp.z, lp.y) : Math.atan2(-lp.x, lp.y); // (forward: the top going to the front, +z)
  };
  const tr = (found.treads?.list || []).map(m => angleOf(m, m.userData.tread)), rm = (found.rims?.list || []).map(m => angleOf(m, m.userData.rim));
  const r = found.treads?.list[0]?.userData.tread.r || found.rims?.list[0]?.userData.rim.r || 1;
  const wrap = (d) => { while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
  if (st.last) st.rows.push({ dt, dist, want: dist === null ? IDLE_RATE * dt : dist / (r * (model.matrixWorld.getMaxScaleOnAxis() || 1)), tread: tr.map((a, i) => wrap(a - st.last.tr[i])), rim: rm.map((a, i) => wrap(a - st.last.rm[i])), level: found.treads?.list[0]?.userData.tread.level ?? null, gap: found.treads?.list[0]?.userData.tread.gap ?? null });
  st.last = { tr, rm };
  const x = st.rows[st.rows.length - 1];
  if (x && st.rows.length <= LOG_EACH) console.warn('TREADLOG frame ' + st.rows.length + ' car=' + st.car + ' dist=' + (x.dist === null ? 'idle' : x.dist.toFixed(4)) + ' want=' + x.want.toFixed(4) + ' treads=' + x.tread.map(v => v.toFixed(4)).join('/') + ' rims=' + x.rim.map(v => v.toFixed(4)).join('/') + ' blur=' + x.level);
  if (st.rows.length < LOG_FRAMES) return;
  st.done = true;
  const f4 = (v) => (v === null ? 'idle' : v.toFixed(4)), rows = st.rows;
  const moving = rows.filter(x => x.dist !== null && Math.abs(x.dist) > 1e-6), stopped = rows.filter(x => x.dist !== null && Math.abs(x.dist) <= 1e-6), idle = rows.filter(x => x.dist === null);
  const allTurn = moving.length ? (found.treads?.list || []).map((_, i) => moving.filter(x => Math.abs(x.tread[i]) > 1e-5).length / moving.length) : [];
  const together = rows.filter(x => x.rim.length && x.tread.length).map(x => Math.abs(x.tread[0] - x.rim[0]));
  console.warn('TREADLOG car=' + st.car + ' treads=' + tr.length + ' rims=' + rm.length + ' frames=' + rows.length + ' moving=' + moving.length + ' stopped=' + stopped.length + ' idle=' + idle.length
    + ' | every tread turning on moving frames: ' + allTurn.map(v => (v * 100).toFixed(0) + '%').join(',')
    + ' | stopped frames, largest tread turn: ' + (stopped.length ? Math.max(...stopped.flatMap(x => x.tread.map(Math.abs))).toExponential(1) : '-')
    + ' | tread - rim per frame, largest: ' + (together.length ? Math.max(...together).toFixed(4) : '-')
    + ' | pitch ' + (rows[0]?.gap ?? 0).toFixed(3) + ' clamp ' + (CLAMP * (rows[0]?.gap ?? 0)).toFixed(3)
    + ' | frames (dist m, want rad, tread0..n rad, rim0 rad, blur step): ' + rows.filter((_, i) => i % 5 === 0).slice(0, 12).map(x => [f4(x.dist), x.want.toFixed(4), x.tread.map(v => v.toFixed(4)).join('/'), x.rim.length ? x.rim[0].toFixed(4) : '-', x.level].join(' ')).join(' ; '));
};
