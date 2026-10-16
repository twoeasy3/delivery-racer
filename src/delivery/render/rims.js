// ---- RIMS: the part of a WHEEL SET that is a wheel's face (the owner, 15-Oct: "rims are part of the existing wheel sets"; CHECKLIST 310).
// RENDER-ONLY like render/wheelcosmetic.js (which calls this): nothing here is read by a rule, written into a save or hashed into the
// replay fingerprint (vite.config.js logicFiles walks no render/ file). Only the player's car is dressed (traffic is not).
// A rim is GEOMETRY that is a CHILD OF ITS TYRE (never merged across wheels: that was the "trims bounced with the body" bug), one
// mesh per outer face (a centre wheel gets both faces), one shared geometry per design and one shared material per colour,
// tagged userData.wheelRing (render/dents.js and render/carsuspension.js leave it alone) with a wheelHub material. Each rim is
// one merged geometry in tyre radii across and metres deep: a dark backing disc (it covers the stock hub, which is hidden while
// a rim is on and shown again after), a lip, the spokes or blades, a centre cap; vertex colours shade it, the material's colour
// is the set's hub colour. It stands RIM_GAP off the tyre's face (or its tread blocks), over the 4 mm the z-fight finder calls
// one plane and clear of a design's sidewall ring (5 mm).
// TURNING: EVERY rim (kind 'speed') turns with the car; a SPINNER (kind 'spin', since the three-part wheel set) turns at SPIN_RATE always; as a real wheel's face does (the owner, 15-Oct: "fix the rims right": the two that turned
// at a fixed pace, stopped or not, were called spinners; they are now ordinary rims, 'Blade' and 'Twin blade', ids kept). The
// player's model gets userData.roll (metres rolled, from render/items.js) and each frame the rim turns by the distance over its
// wheel's radius; with no roll (the garage, the showroom, the Cosmetics screen) it idles at IDLE_RATE. Against the wagon-wheel
// effect a turn is never more than CLAMP of the gap between two spokes in one frame, and above BLUR_FROM of the gap a translucent
// disc fades in over the spokes (in steps: BLUR shared materials). A model whose tyres turn themselves (userData.rollsWheels: the
// three old cars of render/models.js) has that turn taken off the rim's own.
// COLOURS: a rim is shaded grey by its vertex colours and coloured by the set's hub colour; a THEMED rim (own: true, the Pumpkin
// and the Candy cane) carries its own colours in its vertex colours on one white material (still one geometry and one material,
// so no more draw calls than any other rim), and its blur disc takes the design's own `blur` colour.
// The per-frame work is spinRims(model, t), called from the model's userData.animate (wrapped by dressWheels): one quaternion per
// rim mesh and no allocation.
// THE CHOICE: PER CAR over a default (render/loadoutstore.js: the wheels slot's rim = { all, front?, rear? }); resolveRim(carId, axle)
// is the one reader (the car's own rim, else the default's; an axle's own, else the all-round one). Nothing edits per axle yet.
// Unknown, absent or broken = 'none'. ?wheelrim=<id> for a visit (every car). The old global key KEY_RIM is read once as the
// default by the store's migration and kept in step with the default.
// SKIPPED cars (RIM_SKIP: hoops, tracks, hulls, a jet's discs) and cars whose tyres findHubs cannot find get no rim; Legendary
// cars keep their own wheels (wheelcosmetic.js); a wheel face under bodywork is judged by roomFor below (per face, then per axle).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as Store from './loadoutstore.js'; // (the choice, per car over the default)

export const KEY_RIM = 'delivery.wheelrim';
// kind: 'speed' (every rim: it turns with the car; null: none); n: the spokes (or blades, ribs) round it, for the wagon-wheel clamp;
// own: its own colours (not the set's hub colour), blur: then its blur disc's colour. The ids are kept for good (saved loadouts and
// ?wheelrim= name them): blade3 and twinspin were the 'Blade spinner' and 'Twin spinner' before 15-Oct.
export const RIM_DESIGNS = [
  { id: 'none', name: 'None', kind: null, n: 0 },
  { id: 'spoke5', name: '5-spoke', kind: 'speed', n: 5 },
  { id: 'twin10', name: 'Twin spoke', kind: 'speed', n: 10 },
  { id: 'turbine', name: 'Turbine', kind: 'speed', n: 10 },
  { id: 'blade3', name: 'Blade', kind: 'speed', n: 3 },
  { id: 'twinspin', name: 'Twin blade', kind: 'speed', n: 2 },
  { id: 'pumpkin', name: 'Pumpkin', kind: 'speed', n: 8, own: true, blur: 0xe8661a },
  { id: 'candycane', name: 'Candy cane', kind: 'speed', n: 5, own: true, blur: 0xe8a0a8 },
  // SPINNERS (the owner, 15-Oct: "hub colour or rim or spinner"): a hub that keeps turning at SPIN_RATE, stopped or not, whatever the
  // car does (main's 'Blade spinner' and 'Twin spinner' of CHECKLIST 310, back as their own kind). NEW ids: blade3 / twinspin stay the
  // speed rims Blade / Twin blade (CHECKLIST 451), so a saved blade3 / twinspin keeps meaning what it has meant since then.
  { id: 'spinblade', name: 'Blade spinner', kind: 'spin', n: 3 },
  { id: 'spintwin', name: 'Twin spinner', kind: 'spin', n: 2 },
];
export const rimById = (id) => RIM_DESIGNS.find(d => d.id === id) || RIM_DESIGNS[0];
// cars that cannot wear a rim (by car id or model): a hoop, tracks, hulls, a hovercraft's skirt, discs that are not wheels; and three whose
// wheels are their look (the Quad Turbo's own alloys, the Circus Wagon's wooden spokes, a dodgem's hidden castors)
export const RIM_SKIP = new Set(['monowheel', 'hovercraft', 'snocat', 'quadturbo', 'dodgem', 'circuswagon', 'halftrack', 'tank', 'amphibioustank', 'jetboat', 'trawler', 'jetcar', 'moonrover']);

export const SPIN_RATE = 6;    // rad/s: a spinner, everywhere (stopped, moving, on show)
export const IDLE_RATE = 1.2;  // rad/s: a rim with no speed to follow (a car on show)
export const CLAMP = 0.45;     // of the spoke gap: the most a speed rim turns in one frame
export const BLUR_FROM = 0.18, BLUR_FULL = 0.4; // of the spoke gap per frame: the disc starts to show / is at its thickest
export const BLUR = [0, 0.3, 0.55, 0.8]; // the disc's opacity steps (one shared material each, per colour)
export const RIM_GAP = 0.012;  // m off the tyre's face (a sidewall ring is at 5 mm)
export const DEFAULT_HEX = 0xcfd3d9; // a rim with a Stock hub colour: silver

// ---- the choice: in the loadout store (render/loadoutstore.js), the wheels slot's `rim` = { all, front?, rear? }, per car over the default ----
const NONE = Object.freeze({ all: 'none' });
// a value made safe: a JSON object of known ids (all, front, rear; and the old per-car part), or a bare id; anything else: none
export const cleanRimChoice = (raw) => {
  let v = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = { all: v }; } }
  if (typeof v === 'string') v = { all: v };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return NONE;
  const ok = (id) => typeof id === 'string' && RIM_DESIGNS.some(d => d.id === id);
  const out = { all: ok(v.all) ? v.all : 'none' };
  for (const axle of ['front', 'rear']) if (ok(v[axle])) out[axle] = v[axle];
  if (v.cars && typeof v.cars === 'object' && !Array.isArray(v.cars)) {
    const cars = {};
    for (const [id, c] of Object.entries(v.cars).slice(0, 400)) {
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || !c || typeof c !== 'object') continue;
      const one = {};
      for (const k of ['all', 'front', 'rear']) if (ok(c[k])) one[k] = c[k];
      if (Object.keys(one).length) cars[id] = one;
    }
    if (Object.keys(cars).length) out.cars = cars;
  }
  return out;
};
const search = typeof location !== 'undefined' ? location.search : '';
// ?wheelrim=spoke5 (a rim or a spinner id), or ?wheelhub=rim:<id> / spin:<id> / <colour> (a colour: no rim): every car, for stills; never saved
const askedHub = /[?&]wheelhub=(\w+)(?::(\w+))?/.exec(search);
const askedRim = /[?&]wheelrim=(\w+)/.exec(search)?.[1] || (askedHub ? (askedHub[2] && /^(rim|spin)$/.test(askedHub[1]) ? askedHub[2] : 'none') : null);
export const rimAsked = !!askedRim;
// the stored rim choice of a car (null: the default), as saved, whatever the visit's ?wheelrim= (for the ownership test in wheelcosmetic.js)
export const savedRimChoice = (carId = null) => cleanRimChoice(Store.get(carId, 'wheels').rim);
export const rimChoice = (carId = null) => (askedRim ? { all: rimById(askedRim).id } : savedRimChoice(carId));
// THE one reader: the rim a car's axle ('front' | 'rear') wears: the car's own wheels (or the default's), that axle's rim or the all-round one
// (the order, as before: the car's own rim for that axle, its own all-round, the default's for that axle, the default's all-round)
export const resolveRim = (carId, axle) => {
  if (askedRim) return rimById(askedRim).id;
  const own = carId != null ? Store.own(carId, 'wheels')?.rim : null, d = Store.defaultSlot('wheels').rim || {};
  return rimById((own && (own[axle] || own.all)) || d[axle] || d.all).id;
};
export const globalRim = (carId = null) => rimChoice(carId).all;
// the rim (all round) of a target (a car id, or null: the default); the per-axle parts are kept. Returns the id. (Written with the rest of the wheel set by wheelcosmetic.js.)
export const rimPatch = (id, target = null) => ({ rim: { ...savedRimChoice(target), all: rimById(id).id } });
export const putRim = (id, target = null) => { Store.setSlot(target, 'wheels', rimPatch(id, target)); return rimById(id).id; };

// ---- the geometry: x, y in tyre radii (the mesh is scaled by the radius), z in metres outward ------------------------------
// v: a grey (times the set's hub colour), or [r, g, b] (a themed rim's own colour; over 1 is brighter than lit: the jack-o'-lantern's glow)
const shade = (g, v) => {
  const geo = g.index ? g.toNonIndexed() : g;
  geo.deleteAttribute('uv');
  const n = geo.attributes.position.count, c = new Float32Array(n * 3);
  if (Array.isArray(v)) for (let i = 0; i < n; i++) c.set(v, i * 3); else c.fill(v);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  return geo;
};
// a triangle's colour from where its middle is (x, y in tyre radii; i: the triangle's index): stripes, pinwheels
const paintTris = (geo, fn) => {
  const p = geo.attributes.position, c = geo.attributes.color;
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const v = fn(x, y, i / 3);
    for (let k = 0; k < 3; k++) c.setXYZ(i + k, v[0], v[1], v[2]);
  }
  return geo;
};
// a flat polygon (points [x, y] in tyre radii, either winding) at depth z, facing out (+z)
const poly = (pts, z, v) => {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return shade(new THREE.ShapeGeometry(shape).translate(0, 0, z), v);
};
// the same polygon grown by d (each point pushed away from the polygon's middle: an outline round it, for the carved look)
const grow = (pts, d) => { const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length; return pts.map(([x, y]) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / l * d, y + (y - cy) / l * d]; }); };
const each = (g, fn) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const [x, y, z] = fn(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, y, z); } return g; };
const circle = (r, z, seg, v) => shade(new THREE.CircleGeometry(r, seg).translate(0, 0, z), v);
const ring = (r0, r1, z, seg, v) => shade(new THREE.RingGeometry(r0, r1, seg, 1).translate(0, 0, z), v);
// a bar from r0 to r1 out along +y, w wide, z0..z1 deep; taper: its outer end that much narrower; sweep: bent back that far at its tip; pitch: its face tilted (m of depth across its width); off: moved sideways; turned to `ang`
const bar = (w, r0, r1, z0, z1, ang, v, { taper = 0, sweep = 0, pitch = 0, off = 0 } = {}) => {
  const g = shade(new THREE.BoxGeometry(w, r1 - r0, z1 - z0).translate(0, (r0 + r1) / 2, (z0 + z1) / 2), v);
  each(g, (x, y, z) => { const k = (y - r0) / (r1 - r0); return [x * (1 - taper * k) - sweep * k * k + off, y, z + pitch * x / w]; });
  return g.rotateZ(ang);
};
// (a cap: its side and top; no bottom, which nothing sees and which would lie on the spokes)
const cap = (r, z0, z1, seg, v, x = 0, y = 0) => shade(mergeGeometries([new THREE.CylinderGeometry(r * 0.9, r, z1 - z0, seg, 1, true), new THREE.CircleGeometry(r * 0.9, seg).rotateX(-Math.PI / 2).translate(0, (z1 - z0) / 2, 0)].map(g => g.toNonIndexed()), false).rotateX(Math.PI / 2).translate(x, y, (z0 + z1) / 2), v);
const TAU = Math.PI * 2, DARK = 0.1;
const base = () => [circle(0.74, 0, 20, DARK), ring(0.68, 0.8, 0.008, 20, 1)]; // (the dark dish over the stock hub, and the lip)
// FLAT: the same design squeezed in behind bodywork close to the tyre (a mudguard's side 2 cm off it): no dish (the tyre's own black
// face shows between the spokes), the lip and the spokes in one plane side by side (never over each other; the spokes' backs sunk into
// the tyre, so no face lies close over another), the cap and anything
// on top 4.5 mm over them; FLAT_DEPTH deep in all. Every pair of faces that overlap stays at least 4.5 mm apart (the z-fight finder's 4).
export const FLAT_DEPTH = 0.0095;
const flatLip = () => [ring(0.7, 0.8, 0, 20, 1)];
// ---- the THEMED rims (own colours in their vertex colours; render/rims.js header) ----
// PUMPKIN: a jack-o'-lantern. A dark disc behind (the dish and the lip in one: it shows as a thin dark edge and in the notches
// between the lobes), the pumpkin's face over it, lobed round its edge (8 ribs) and shaded darker into each rib, two carved
// triangle eyes and a jagged grin (a dark carved edge, and inside it a glow brighter than lit), the green stem as the centre cap.
// (colours written as seen, sRGB, and made linear for the renderer: vertex colours are linear; the glow over 1 stays over 1)
const lin = (c) => c.map(v => Math.pow(v, 2.2));
const ORANGE = lin([1.12, 0.56, 0.04]), RIB = lin([0.78, 0.3, 0.02]), SHELL = lin([0.22, 0.08, 0.02]), CARVED = lin([0.25, 0.06, 0.01]), GLOW = lin([1.3, 1.12, 0.45]), STEM = lin([0.3, 0.5, 0.12]);
const EYE = [[-0.37, 0.2], [-0.15, 0.2], [-0.26, 0.42]];
const GRIN = [[-0.52, -0.1], [-0.36, -0.22], [-0.24, -0.27], [-0.18, -0.38], [-0.12, -0.29], [0.12, -0.29], [0.18, -0.38], [0.24, -0.27], [0.36, -0.22], [0.52, -0.1],
  [0.4, -0.36], [0.22, -0.5], [0.06, -0.55], [0, -0.44], [-0.06, -0.55], [-0.22, -0.5], [-0.4, -0.36]];
const lobedFace = (z, seg = 32) => {
  const pos = [], col = [], at = (i) => { const a = i / seg * TAU, l = Math.sqrt(Math.abs(Math.cos(4 * a))); return [Math.cos(a) * (0.7 + 0.08 * l), Math.sin(a) * (0.7 + 0.08 * l), RIB.map((c, k) => c + (ORANGE[k] - c) * l)]; };
  for (let i = 0; i < seg; i++) {
    const [x0, y0, c0] = at(i), [x1, y1, c1] = at(i + 1);
    pos.push(0, 0, z, x0, y0, z, x1, y1, z); col.push(...ORANGE, ...c0, ...c1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};
const pumpkin = (flat) => {
  const z = flat ? [0, 0.0045, 0.009] : [0.006, 0.0115, 0.017]; // (the face; the carved edge; the glow: each 4.5 mm or more over the last)
  const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
  return [
    ...(flat ? [] : [circle(0.8, 0, 32, SHELL)]), lobedFace(z[0]),
    poly(grow(EYE, 0.04), z[1], CARVED), poly(grow(mirror(EYE), 0.04), z[1], CARVED), poly(grow(GRIN, 0.04), z[1], CARVED),
    poly(EYE, z[2], GLOW), poly(mirror(EYE), z[2], GLOW), poly(GRIN, z[2], GLOW),
    flat ? cap(0.12, -0.003, FLAT_DEPTH, 6, STEM) : cap(0.12, 0.006, 0.045, 6, STEM),
  ];
};
// CANDY CANE: five striped canes, each a J (straight out from the middle, then curled round like a cane's hook), red and white
// bands along them, a red lip round a dark pine-green dish (a green gap between the hooks and the lip, so each J reads), and a peppermint for the centre cap (red and white wedges,
// a white middle).
const RED = lin([0.88, 0.07, 0.1]), WHITE = lin([1.12, 1.1, 1.08]), PINE = lin([0.06, 0.24, 0.1]);
const cane = (ang, z0, z1, w = 0.15, a = 0.15, top = 0.42) => {
  const line = [];
  for (let i = 0; i <= 3; i++) line.push([0, 0.15 + (top - 0.15) * i / 3]);
  for (let i = 1; i <= 3; i++) { const f = i / 3 * (160 / 180) * Math.PI; line.push([-a + a * Math.cos(f), top + a * Math.sin(f)]); }
  const pos = [], col = [], side = (p, q, n) => [p[0] + n[0] * w / 2, p[1] + n[1] * w / 2];
  const normal = (i) => { const p = line[Math.max(0, i - 1)], q = line[Math.min(line.length - 1, i + 1)], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [dy / l, -dx / l]; }; // (to the right of the way along)
  const quad = (a3, b3, c3, d3, c) => { pos.push(...a3, ...b3, ...c3, ...a3, ...c3, ...d3); for (let k = 0; k < 6; k++) col.push(...c); };
  for (let i = 0; i < line.length - 1; i++) {
    const n0 = normal(i), n1 = normal(i + 1), m0 = [-n0[0], -n0[1]], m1 = [-n1[0], -n1[1]];
    const r0 = side(line[i], 0, n0), r1 = side(line[i + 1], 0, n1), l0 = side(line[i], 0, m0), l1 = side(line[i + 1], 0, m1);
    const c = i % 2 ? WHITE : RED;
    quad([r0[0], r0[1], z1], [r1[0], r1[1], z1], [l1[0], l1[1], z1], [l0[0], l0[1], z1], c); // (the front)
    quad([r0[0], r0[1], z0], [r1[0], r1[1], z0], [r1[0], r1[1], z1], [r0[0], r0[1], z1], c); // (the right side)
    quad([l1[0], l1[1], z0], [l0[0], l0[1], z0], [l0[0], l0[1], z1], [l1[0], l1[1], z1], c); // (the left side)
  }
  const e = line.length - 1, ne = normal(e), re = side(line[e], 0, ne), le = side(line[e], 0, [-ne[0], -ne[1]]);
  quad([le[0], le[1], z0], [re[0], re[1], z0], [re[0], re[1], z1], [le[0], le[1], z1], WHITE); // (the hook's end)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g.rotateZ(ang);
};
const stripes = (n, a = RED, b = WHITE) => (x, y) => (Math.floor(((Math.atan2(y, x) + TAU) % TAU) / (TAU / n)) % 2 ? b : a);
const candycane = (flat) => {
  const canes = [0, 1, 2, 3, 4].map(i => (flat ? cane(i * TAU / 5, -0.009, 0) : cane(i * TAU / 5, -0.004, 0.018)));
  const mint = (z0, z1) => paintTris(cap(0.19, z0, z1, 12, WHITE), stripes(12));
  return flat
    ? [ring(0.7, 0.8, 0, 20, RED), ...canes, mint(-0.003, 0.0045), circle(0.07, 0.009, 8, WHITE)]
    : [circle(0.74, 0, 20, PINE), ring(0.68, 0.8, 0.008, 20, RED), ...canes, mint(0, 0.03), circle(0.07, 0.035, 8, WHITE)];
};
const BUILD = {
  spoke5: (f) => f ? [...flatLip(), ...[0, 1, 2, 3, 4].map(i => bar(0.17, 0.14, 0.68, -0.009, 0, i * TAU / 5, 1, { taper: 0.35 })), cap(0.17, -0.003, 0.0045, 10, 0.85)]
    : [...base(), ...[0, 1, 2, 3, 4].map(i => bar(0.17, 0.14, 0.72, -0.006, 0.018, i * TAU / 5, 1, { taper: 0.35 })), cap(0.17, 0, 0.03, 10, 0.85)],
  twin10: (f) => f ? [...flatLip(), ...[0, 1, 2, 3, 4].flatMap(i => [-1, 1].map(s => bar(0.06, 0.15, 0.68, -0.009, 0, i * TAU / 5, 1, { off: s * 0.055 }))), cap(0.17, -0.003, 0.0045, 10, 0.85)]
    : [...base(), ...[0, 1, 2, 3, 4].flatMap(i => [-1, 1].map(s => bar(0.06, 0.15, 0.72, -0.006, 0.016, i * TAU / 5, 1, { off: s * 0.055 }))), cap(0.17, 0, 0.03, 10, 0.85)],
  turbine: (f) => f ? [...flatLip(), ...[...Array(10).keys()].map(i => bar(0.15, 0.2, 0.68, -0.009, -0.0015, i * TAU / 10, 0.92, { pitch: 0.003, taper: -0.3 })), cap(0.2, -0.003, 0.0045, 10, 0.8)]
    : [...base(), ...[...Array(10).keys()].map(i => bar(0.15, 0.18, 0.72, -0.004, 0.008, i * TAU / 10, 0.92, { pitch: 0.018, taper: -0.3 })), cap(0.2, 0, 0.03, 10, 0.8)],
  blade3: (f) => f ? [...flatLip(), ...[0, 1, 2].map(i => bar(0.24, 0.12, 0.66, -0.009, 0, i * TAU / 3, 1, { taper: 0.55, sweep: 0.12 })), cap(0.2, -0.003, 0.0045, 12, 1)]
    : [...base(), ...[0, 1, 2].map(i => bar(0.24, 0.12, 0.74, 0.004, 0.02, i * TAU / 3, 1, { taper: 0.55, sweep: 0.14 })), cap(0.2, 0, 0.04, 12, 1)],
  twinspin: (f) => f ? [...flatLip(), circle(0.5, 0, 20, 0.5), ...[0, 1].map(i => bar(0.18, 0.1, 0.66, -0.009, 0.005, i * Math.PI, 1, { taper: 0.4 })), cap(0.1, 0.001, FLAT_DEPTH, 8, 0.2, 0.28, 0), cap(0.12, 0.001, FLAT_DEPTH, 10, 1)]
    : [...base(), circle(0.5, 0.012, 20, 0.5), ...[0, 1].map(i => bar(0.18, 0.1, 0.76, 0.014, 0.026, i * Math.PI, 1, { taper: 0.4 })), cap(0.1, 0.012, 0.045, 8, 0.2, 0.28, 0), cap(0.12, 0.012, 0.035, 10, 1)],

  pumpkin: (f) => pumpkin(f),
  candycane: (f) => candycane(f),
};
BUILD.spinblade = BUILD.blade3; BUILD.spintwin = BUILD.twinspin; // (the spinners: main's geometry of the two, as they were)
const BLUR_Z = { spoke5: 0.024, twin10: 0.022, turbine: 0.03, blade3: 0.025, twinspin: 0.031, spinblade: 0.025, spintwin: 0.031, pumpkin: 0.022, candycane: 0.024 }, BLUR_Z_FLAT = 0.003; // (the blur disc, just over the spokes' faces; under the cap's top)
const geos = new Map();
export const rimGeometry = (id, flat = false) => {
  const key = id + (flat ? ':flat' : '');
  if (!geos.has(key)) {
    const g = mergeGeometries(BUILD[id](flat), false);
    g.computeBoundingBox(); g.computeBoundingSphere();
    g.userData.shared = true;
    geos.set(key, g);
  }
  return geos.get(key);
};
const blurGeometry = (id, flat = false) => {
  const key = 'blur:' + id + (flat ? ':flat' : '');
  if (!geos.has(key)) { const g = new THREE.RingGeometry(0.17, flat ? 0.7 : 0.76, 20, 1).translate(0, 0, flat ? BLUR_Z_FLAT : BLUR_Z[id]); g.userData.shared = true; geos.set(key, g); }
  return geos.get(key);
};
export const rimTriangles = (id, flat = false) => { const g = rimGeometry(id, flat); return (g.index ? g.index.count : g.attributes.position.count) / 3; };

// ---- the materials: one per colour (the blur: one per colour and step) ------------------------------------------------------
const mats = new Map(), blurs = new Map();
export const rimMaterial = (hex) => {
  if (!mats.has(hex)) {
    const m = new THREE.MeshLambertMaterial({ color: hex, vertexColors: true, emissive: new THREE.Color(hex).multiplyScalar(0.06) });
    m.userData.shared = true; m.userData.wheelHub = true; mats.set(hex, m);
  }
  return mats.get(hex);
};
// the colour of a design's material: the set's hub colour, or white for a themed rim (its colours are in its vertex colours)
export const rimHex = (id, hex) => (rimById(id).own ? 0xffffff : hex);
const blurMaterials = (hex) => {
  if (!blurs.has(hex)) {
    const c = new THREE.Color(hex).multiplyScalar(0.55);
    blurs.set(hex, BLUR.map((o) => { const m = new THREE.MeshLambertMaterial({ color: c, emissive: c.clone().multiplyScalar(0.15), transparent: true, opacity: o, depthWrite: false }); m.userData.shared = true; m.userData.wheelHub = true; return m; }));
  }
  return blurs.get(hex);
};

// ---- putting them on a model (wheelcosmetic.js keeps the model's tyres in userData.wheelHubs: info, rawHubs) ---------------
const Z = new THREE.Vector3(0, 0, 1), axis = new THREE.Vector3(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), pose = new THREE.Matrix4();
const toModel = new THREE.Matrix4(), m1 = new THREE.Matrix4(), box = new THREE.Box3(), c3 = new THREE.Vector3();
// how far a mesh reaches from a tyre's centre along its axle, on one side (m), and how far across from the axle
const reach = (mesh, t, side) => {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  box.copy(mesh.geometry.boundingBox).applyMatrix4(m1.multiplyMatrices(toModel, mesh.matrixWorld));
  const lo = t.axleX ? box.min.x - t.centre.x : box.min.z - t.centre.z, hi = t.axleX ? box.max.x - t.centre.x : box.max.z - t.centre.z;
  box.getSize(c3);
  return { out: side > 0 ? hi : -lo, across: Math.max(c3.y, t.axleX ? c3.z : c3.x) / 2 };
};
// which faces of each tyre have ROOM for a rim (worked out once per model). Bodywork near a wheel's face (a mudguard's or a spat's
// side, a skirt, an arch) is found with rays along the axle, from the tyre's face out past where a rim's cap would be, at 36 points
// over the face (radii 0.3, 0.55, 0.8 of the tyre, 12 round), either way (a face turned away still counts). Per face:
//   clear  the share of the 36 that meet nothing; depth  how far out (m) the nearest part met is, over the face.
// Where something is met the rim is put BEHIND it, as a real wheel sits behind its arch, ending FIT_GAP short of the nearest part
// met: whole if it fits; else FLAT (FLAT_DEPTH deep, brought in to TIGHT_GAP off the tyre; the design's sidewall ring, if any,
// gives way on that face). A face wears a rim:
//   open (clear >= MOSTLY): whole (a mudguard's edge or a bracket over a sliver of it is let be);
//   partly covered (clear >= CLEAR) and the rim fits behind what covers it (the classic half-covered wheel under a mudguard);
//   else (a spat or a skirt over most of it, or bodywork too close to get behind): stock.
// Then per AXLE (tyres at the same place along the car): its faces take the worse face's answer, so one axle never mixes a rim and a
// stock wheel, unless the car really is lopsided there (one face fully open, ALL_OPEN, the other heavily covered, under CLEAR - LOPSIDED).
export const CLEAR = 0.4, MOSTLY = 0.9, ALL_OPEN = 0.97, LOPSIDED = 0.35, FIT_GAP = 0.0045, TIGHT_GAP = 0.005;
const RIM_DEPTH = 0.045; // m: the deepest design (the twin blade's weight, the pumpkin's stem), from the rim's base
const REACH = RIM_GAP + RIM_DEPTH + 0.004; // m out from the tyre's face that the rays look
const ray = new THREE.Raycaster(), o3 = new THREE.Vector3(), e3 = new THREE.Vector3(), d3 = new THREE.Vector3(), u3 = new THREE.Vector3(), w3 = new THREE.Vector3();
const nearest = (others, from, dir, far) => { ray.set(from, dir); ray.near = 0; ray.far = far; const h = ray.intersectObjects(others, false); return h.length ? h[0].distance : null; };
const measure = (model, found) => {
  const own = new Set([...(found.tyres || []), ...found.rawHubs.map(h => h.mesh)]);
  for (const t of found.rimInfo) for (const part of t.rubber) own.add(part);
  const others = [];
  model.traverse((n) => { if (n.isMesh && !own.has(n) && !n.userData.wheelRing && !n.isInstancedMesh) { let p = n, seen = true; while (p && p !== model) { if (!p.visible) seen = false; p = p.parent; } if (seen) others.push(n); } });
  const scale = model.matrixWorld.getMaxScaleOnAxis() || 1;
  for (const t of found.rimInfo) {
    t.faceStats = [];
    const tyres = (found.tyres || []).filter(x => x !== t.tyre);
    for (const side of t.outer ? [t.outer] : [-1, 1]) {
      let face = Math.max(t.half, reach(t.tyre, t, side).out); // (a tyre leaning a little stands proud at its rim)
      for (const part of t.rubber) face = Math.max(face, reach(part, t, side).out);
      axis.set(t.axleX ? side : 0, 0, t.axleX ? 0 : side);
      u3.set(0, 1, 0); w3.crossVectors(axis, u3);
      let hits = 0, depth = Infinity, behind = 0;
      for (const rho of [0.3, 0.55, 0.8]) for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU, y = Math.sin(a) * rho * t.r, x = Math.cos(a) * rho * t.r;
        o3.copy(t.centre).addScaledVector(u3, y).addScaledVector(w3, x).addScaledVector(axis, face + 0.001).applyMatrix4(model.matrixWorld);
        e3.copy(t.centre).addScaledVector(u3, y).addScaledVector(w3, x).addScaledVector(axis, face + REACH).applyMatrix4(model.matrixWorld);
        d3.subVectors(e3, o3); const len = d3.length(); d3.normalize();
        let at = nearest(others, o3, d3, len);
        if (at === null) { const back = nearest(others, e3, d3.negate(), len); if (back !== null) at = len - back; } // (a face turned toward the tyre: met from outside)
        if (at !== null) { hits++; depth = Math.min(depth, at / scale + 0.001); }
        if (tyres.length && (nearest(tyres, o3, d3.subVectors(e3, o3).normalize(), len) !== null || nearest(tyres, e3, d3.negate(), len) !== null)) behind++; // (either way: a face inside a wider tyre meets it from within)
      }
      t.faceStats.push({ side, face, clear: 1 - hits / 36, depth, inner: behind >= 18 }); // (inner: the inner tyre of a pair of twins, its face against the outer one: no rim, and not counted)
    }
  }
};
// how a face's rim fits: st.fit 'whole' | 'flat' | null (no room behind what is met), st.gap how far off the tyre it stands
const fitOf = (st) => {
  st.gap = RIM_GAP;
  if (st.depth >= RIM_GAP + RIM_DEPTH + FIT_GAP) return 'whole';
  if (st.depth >= TIGHT_GAP + FLAT_DEPTH + FIT_GAP) { st.gap = TIGHT_GAP; return 'flat'; }
  return null;
};
const roomFor = (model, found) => {
  measure(model, found);
  for (const t of found.rimInfo) for (const st of t.faceStats) { st.fit = fitOf(st); if (st.fit === null && st.clear >= MOSTLY) { st.fit = 'whole'; st.gap = RIM_GAP; } st.ok = st.clear >= CLEAR && st.fit !== null; }
  // the axles: tyres within a third of a radius of each other along the car
  const axles = [];
  for (const t of found.rimInfo) { const z = t.axleX ? t.centre.z : t.centre.x; const ax = axles.find(a => Math.abs(a.z - z) < t.r / 3); if (ax) ax.tyres.push(t); else axles.push({ z, tyres: [t] }); }
  for (const ax of axles) {
    for (const t of ax.tyres) for (const st of t.faceStats) if (st.inner) st.ok = st.on = false;
    const faces = ax.tyres.flatMap(t => t.faceStats.filter(f => !f.inner));
    if (!faces.length) { ax.mode = 'stock'; continue; }
    const worst = faces.reduce((a, b) => (b.clear < a.clear || (b.ok === false && a.ok) ? b : a));
    const best = faces.reduce((a, b) => (b.clear > a.clear ? b : a));
    const lopsided = faces.length > 1 && best.ok && best.clear >= ALL_OPEN && worst.clear < CLEAR - LOPSIDED;
    ax.mode = !worst.ok && !lopsided ? 'stock' : lopsided ? 'lopsided' : 'rims';
    for (const st of faces) st.on = ax.mode === 'stock' ? false : st.ok;
    // one fit for the axle (flat if any face must be), so both sides look alike
    const on = faces.filter(f => f.on), flat = on.some(f => f.fit === 'flat');
    for (const st of on) { st.fit = flat ? 'flat' : 'whole'; st.gap = flat ? TIGHT_GAP : RIM_GAP; }
  }
  found.axles = axles.map(a => ({ mode: a.mode, faces: a.tyres.flatMap(t => t.faceStats.filter(f => !f.inner).map(f => ({ clear: f.clear, depth: f.depth, on: f.on, fit: f.fit, gap: f.gap }))) }));
  for (const t of found.rimInfo) t.faces = t.faceStats.filter(f => f.on).map(f => ({ side: f.side, face: f.face, flat: f.fit === 'flat', gap: f.gap }));
  found.blockedFaces = found.rimInfo.flatMap(t => t.faceStats.filter(f => !f.on && !f.inner).map(f => Math.round((1 - f.clear) * 36)));
  found.roomChecked = true;
};
export const removeRims = (model) => {
  const found = model.userData.wheelHubs;
  if (!found || !found.rims) return;
  for (const mesh of found.rims.list) { mesh.parent?.remove(mesh); mesh.userData.rim.blur?.parent?.remove(mesh.userData.rim.blur); }
  for (const hub of found.rims.hidden) hub.visible = true;
  found.rims.list.length = 0; found.rims.hidden.length = 0;
};
// the rims a model wears now: per tyre, the rim its axle resolves to (none: none), in `hex`. Returns how many rim meshes.
export const addRims = (model, hex, worn = true) => {
  const found = model.userData.wheelHubs;
  if (!found) return 0;
  if (!found.rims) found.rims = { list: [], hidden: [], t: null, roll: undefined };
  removeRims(model);
  if (!worn || found.rimSkip || !found.rimInfo || !found.rimInfo.length) return 0; // (worn false: the saved set is not owned, so Stock)
  model.updateMatrixWorld(true);
  toModel.copy(model.matrixWorld).invert();
  if (!found.roomChecked) roomFor(model, found);
  const colour = hex === null || hex === undefined ? DEFAULT_HEX : hex;
  for (const t of found.rimInfo) {
    const rim = rimById(resolveRim(found.carId, t.axle));
    if (!rim.kind) continue;
    const tyre = t.tyre, ghost = tyre.userData.solidMat, current = ghost || tyre.material;
    if (current !== t.stock && current !== model.userData.wheelRubberClones?.get(t.stock)) continue; // (blacked out: no rim)
    const hubs = found.rawHubs.filter(h => h.tyre === tyre).map(h => h.mesh);
    let across = 0.8;
    for (const hub of hubs) across = Math.max(across, reach(hub, t, 1).across / t.r + 0.02);
    const k = Math.min(1.2, across / 0.8); // (a hub wider than the lip: the rim is made a little bigger to cover it)
    const mat = rimMaterial(rimHex(rim.id, colour)), blurs = blurMaterials(rim.own ? rim.blur : colour);
    if (!t.faces.length) continue; // (no room on either face: this wheel stays stock)
    for (const { side, face, flat, gap } of t.faces) { // (face: the tyre's face, or its tread blocks' / own sidewall rings' if they stand prouder; flat: fitted in behind bodywork)
      const geo = rimGeometry(rim.id, flat);
      axis.set(t.axleX ? side : 0, 0, t.axleX ? 0 : side);
      q.setFromUnitVectors(Z, axis);
      pos.copy(t.centre).addScaledVector(axis, face + gap);
      if (gap < RIM_GAP) for (const ring of found.rings || []) if (ring.parent === tyre && ring.userData.ringSide === side) { ring.parent.remove(ring); ring.visible = false; } // (brought in over a design's sidewall ring: the ring gives way)
      pose.compose(pos, q, scl.set(t.r * k, t.r * k, 1)).premultiply(t.toTyre);
      const mesh = new THREE.Mesh(geo, mat);
      pose.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.userData.wheelRing = true;
      const blur = new THREE.Mesh(blurGeometry(rim.id, flat), blurs[1]);
      blur.userData.wheelRing = true;
      blur.visible = false;
      mesh.add(blur); // (it turns with the rim: a disc, so that cannot be seen)
      mesh.userData.rim = { id: rim.id, flat, spin: rim.kind === 'spin', side, q0: mesh.quaternion.clone(), a: 0, f: 0, level: 0, gap: TAU / rim.n, r: t.r, tyre, x0: tyre.rotation.x, rolls: !!model.userData.rollsWheels, blur, blurs };
      if (ghost) { mesh.userData.solidMat = mat; mesh.material = tyre.material; if (blur) { blur.userData.solidMat = blur.material; blur.material = tyre.material; } } // (a ghost: pale like the rest)
      tyre.add(mesh);
      found.rims.list.push(mesh);
    }
    if (t.faces.length === (t.outer ? 1 : 2)) for (const hub of hubs) if (hub.visible) { hub.visible = false; found.rims.hidden.push(hub); } // (the rim's dish covers it; shown again when the rim goes)
  }
  return found.rims.list.length;
};
// 'ok' (it wears rims), 'skip' (a car that cannot: RIM_SKIP, Legendary) or 'none' (no tyre found to put one on)
export const rimStatus = (model) => {
  const found = model?.userData.wheelHubs;
  if (!found) return 'none';
  if (found.rimSkip || found.legend) return 'skip';
  if (!found.rimInfo || !found.rimInfo.length) return 'none';
  if (!found.roomChecked) { model.updateMatrixWorld(true); toModel.copy(model.matrixWorld).invert(); roomFor(model, found); }
  return found.rimInfo.some(t => t.faces.length) ? 'ok' : 'none';
};

// ---- turning ----------------------------------------------------------------------------------------------------------------
const Q = new THREE.Quaternion();
const levelOf = (f) => (f < BLUR_FROM ? 0 : Math.min(BLUR.length - 1, 1 + Math.floor((f - BLUR_FROM) / (BLUR_FULL - BLUR_FROM) * (BLUR.length - 1))));
const setLevel = (u, level) => {
  if (u.level === level || !u.blur) return;
  const b = u.blur, cur = b.userData.solidMat || b.material;
  if (!u.blurs.includes(cur)) return; // (a silhouette or something else stands in: left)
  u.level = level;
  b.visible = level > 0;
  if (level > 0) { if (b.userData.solidMat) b.userData.solidMat = u.blurs[level]; else b.material = u.blurs[level]; }
};
// one frame of every rim on a model: dt (s) since the last; dist (m rolled since the last, or null: no speed to follow, idle)
export const rimFrame = (model, dt, dist) => {
  const st = model.userData.wheelHubs?.rims;
  if (!st || !st.list.length) return;
  const scale = dist === null ? 1 : (model.matrixWorld.getMaxScaleOnAxis() || 1);
  for (let i = 0; i < st.list.length; i++) {
    const mesh = st.list[i], u = mesh.userData.rim;
    let da = u.spin ? SPIN_RATE * dt : dist === null ? IDLE_RATE * dt : dist / (u.r * scale); // (a spinner: its own pace, whatever the car does)
    u.f += (Math.abs(da) / u.gap - u.f) * 0.25; // (the turn per frame as a share of the spoke gap, smoothed: a frame's jitter does not flicker the blur)
    const lim = CLAMP * u.gap;
    if (da > lim) da = lim; else if (da < -lim) da = -lim;
    setLevel(u, levelOf(u.f));
    u.a = (u.a + da) % TAU;
    Q.setFromAxisAngle(Z, u.side * (u.a - (u.rolls ? u.tyre.rotation.x - u.x0 : 0)));
    mesh.quaternion.copy(u.q0).multiply(Q);
  }
};
// from a model's animate(t) (seconds, wall clock): the time step, and the roll the game gave it (render/items.js) if any
export const spinRims = (model, t) => {
  const st = model.userData.wheelHubs?.rims;
  if (!st) return;
  let dt = st.t === null ? 0 : t - st.t;
  st.t = t;
  if (!(dt > 0)) dt = 0; else if (dt > 0.1) dt = 0.1;
  const roll = model.userData.roll;
  let dist = null;
  if (typeof roll === 'number') { dist = st.roll === undefined ? 0 : roll - st.roll; st.roll = roll; }
  if (st.list.length) rimFrame(model, dt, dist);
};
