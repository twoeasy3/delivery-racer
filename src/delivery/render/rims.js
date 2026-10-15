// ---- RIMS: the part of a WHEEL SET that is a wheel's face (the owner, 15-Oct: "rims are part of the existing wheel sets"; CHECKLIST 307).
// RENDER-ONLY like render/wheelcosmetic.js (which calls this): nothing here is read by a rule, written into a save or hashed into the
// replay fingerprint (vite.config.js logicFiles walks no render/ file). Only the player's car is dressed (traffic is not).
// A rim is GEOMETRY that is a CHILD OF ITS TYRE (never merged across wheels: that was the "trims bounced with the body" bug), one
// mesh per outer face (a centre wheel gets both faces), one shared geometry per design and one shared material per colour,
// tagged userData.wheelRing (render/dents.js and render/carsuspension.js leave it alone) with a wheelHub material. Each rim is
// one merged geometry in tyre radii across and metres deep: a dark backing disc (it covers the stock hub, which is hidden while
// a rim is on and shown again after), a lip, the spokes or blades, a centre cap; vertex colours shade it, the material's colour
// is the set's hub colour. It stands RIM_GAP off the tyre's face (or its tread blocks), over the 4 mm the z-fight finder calls
// one plane and clear of a design's sidewall ring (5 mm).
// TURNING: two kinds. 'speed' rims (5-spoke, twin, turbine) turn with the car: the player's model gets userData.roll (metres
// rolled, from render/items.js) and each frame the rim turns by the distance over its wheel's radius; with no roll (the garage,
// the showroom, the Cosmetics screen) they idle at IDLE_RATE. Against the wagon-wheel effect a turn is never more than CLAMP of
// the gap between two spokes in one frame, and above BLUR_FROM of the gap a translucent disc fades in over the spokes (in steps:
// BLUR shared materials). 'spin' rims (the spinners) turn at SPIN_RATE everywhere, stopped or not. A model whose tyres turn
// themselves (userData.rollsWheels: the three old cars of render/models.js) has that turn taken off the rim's own.
// The per-frame work is spinRims(model, t), called from the model's userData.animate (wrapped by dressWheels): one quaternion per
// rim mesh and no allocation.
// THE CHOICE: global today, kept so that it can grow per axle and per car: the stored value (KEY_RIM, JSON) is
// { all: id } and may later carry { front, rear, cars: { <carId>: { all, front, rear } } }; resolveRim(carId, axle) is the one
// reader (today: the global rim for every car and axle). Unknown, absent or broken = 'none'. ?wheelrim=<id> for a visit.
// SKIPPED cars (RIM_SKIP: hoops, tracks, hulls, a jet's discs) and cars whose tyres findHubs cannot find get no rim; Legendary
// cars keep their own wheels (wheelcosmetic.js); a wheel face under bodywork is judged by roomFor below (per face, then per axle).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Progress } from '../progress.js';

export const KEY_RIM = 'delivery.wheelrim';
// kind: 'speed' turns with the car, 'spin' at a fixed pace; n: the spokes (or blades) round it, for the wagon-wheel clamp
export const RIM_DESIGNS = [
  { id: 'none', name: 'None', kind: null, n: 0 },
  { id: 'spoke5', name: '5-spoke', kind: 'speed', n: 5 },
  { id: 'twin10', name: 'Twin spoke', kind: 'speed', n: 10 },
  { id: 'turbine', name: 'Turbine', kind: 'speed', n: 10 },
  { id: 'blade3', name: 'Blade spinner', kind: 'spin', n: 3 },
  { id: 'twinspin', name: 'Twin spinner', kind: 'spin', n: 2 },
];
export const rimById = (id) => RIM_DESIGNS.find(d => d.id === id) || RIM_DESIGNS[0];
// cars that cannot wear a rim (by car id or model): a hoop, tracks, hulls, a hovercraft's skirt, discs that are not wheels; and three whose
// wheels are their look (the Quad Turbo's own alloys, the Circus Wagon's wooden spokes, a dodgem's hidden castors)
export const RIM_SKIP = new Set(['monowheel', 'hovercraft', 'snocat', 'quadturbo', 'dodgem', 'circuswagon', 'halftrack', 'tank', 'amphibioustank', 'jetboat', 'trawler', 'jetcar', 'moonrover']);

export const IDLE_RATE = 1.2;  // rad/s: a speed rim with no speed to follow (a car on show)
export const SPIN_RATE = 6;    // rad/s: a spinner, everywhere
export const CLAMP = 0.45;     // of the spoke gap: the most a speed rim turns in one frame
export const BLUR_FROM = 0.18, BLUR_FULL = 0.4; // of the spoke gap per frame: the disc starts to show / is at its thickest
export const BLUR = [0, 0.3, 0.55, 0.8]; // the disc's opacity steps (one shared material each, per colour)
export const RIM_GAP = 0.012;  // m off the tyre's face (a sidewall ring is at 5 mm)
export const DEFAULT_HEX = 0xcfd3d9; // a rim with a Stock hub colour: silver

// ---- the choice -------------------------------------------------------------------------------------------------------------
const NONE = Object.freeze({ all: 'none' });
// a stored value made safe: a JSON object of known ids (per axle and per car kept for later), or a bare id; anything else: none
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
let storedRim = null, visitRim = null;
const askedRim = typeof location !== 'undefined' ? /[?&]wheelrim=(\w+)/.exec(location.search)?.[1] : null; // (?wheelrim=spoke5: for stills; never saved)
export const rimAsked = !!askedRim;
// the saved choice as it is stored (for the ownership test in wheelcosmetic.js), whatever the visit's switches
export const savedRimChoice = () => {
  if (storedRim === null) { storedRim = NONE; try { storedRim = cleanRimChoice(localStorage.getItem(KEY_RIM)); } catch { /* (no storage: none) */ } }
  return storedRim;
};
export const rimChoice = () => {
  if (askedRim) return { all: rimById(askedRim).id };
  if (Progress.noSave) return visitRim || NONE;
  return savedRimChoice();
};
// THE one reader: the rim a car's axle ('front' | 'rear') wears. Today the global one for every car and axle.
export const resolveRim = (carId, axle) => {
  const c = rimChoice(), car = carId && c.cars ? c.cars[carId] : null;
  return rimById((car && (car[axle] || car.all)) || c[axle] || c.all).id;
};
export const globalRim = () => rimChoice().all;
// put the global rim (the per-axle and per-car parts, none today, are kept); returns the id
export const putRim = (id) => {
  const rim = rimById(id).id;
  if (Progress.noSave) { visitRim = { ...(visitRim || NONE), all: rim }; return rim; }
  storedRim = { ...savedRimChoice(), all: rim };
  try { localStorage.setItem(KEY_RIM, JSON.stringify(storedRim)); } catch { /* (no storage: for this visit) */ }
  return rim;
};

// ---- the geometry: x, y in tyre radii (the mesh is scaled by the radius), z in metres outward ------------------------------
const shade = (g, v) => {
  const geo = g.index ? g.toNonIndexed() : g;
  geo.deleteAttribute('uv');
  const n = geo.attributes.position.count;
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(v), 3));
  return geo;
};
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
};
const BLUR_Z = { spoke5: 0.024, twin10: 0.022, turbine: 0.03 }, BLUR_Z_FLAT = 0.003; // (the blur disc, just over the spokes' faces; under the cap's top)
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
const RIM_DEPTH = 0.045; // m: the deepest design (the twin spinner's weight), from the rim's base
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
    const mat = rimMaterial(colour);
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
      let blur = null;
      if (rim.kind === 'speed') {
        blur = new THREE.Mesh(blurGeometry(rim.id, flat), blurMaterials(colour)[1]);
        blur.userData.wheelRing = true;
        blur.visible = false;
        mesh.add(blur); // (it turns with the rim: a disc, so that cannot be seen)
      }
      mesh.userData.rim = { id: rim.id, flat, spin: rim.kind === 'spin', side, q0: mesh.quaternion.clone(), a: 0, f: 0, level: 0, gap: TAU / rim.n, r: t.r, tyre, x0: tyre.rotation.x, rolls: !!model.userData.rollsWheels, blur, blurs: blurMaterials(colour) };
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
    let da;
    if (u.spin) da = SPIN_RATE * dt;
    else {
      da = dist === null ? IDLE_RATE * dt : dist / (u.r * scale);
      u.f += (Math.abs(da) / u.gap - u.f) * 0.25; // (the turn per frame as a share of the spoke gap, smoothed: a frame's jitter does not flicker the blur)
      const lim = CLAMP * u.gap;
      if (da > lim) da = lim; else if (da < -lim) da = -lim;
      setLevel(u, levelOf(u.f));
    }
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
