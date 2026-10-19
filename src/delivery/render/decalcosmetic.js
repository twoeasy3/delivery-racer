// ---- the DECAL cosmetic, a TRIAL on six cars (CHECKLIST 423; the feasibility: src/delivery/DECAL-FEASIBILITY.md, CHECKLIST 414). The owner
// (16-Oct, CHECKLIST "OWNER'S DECISIONS"): (1) each design FIXED in place, the player does not pick a zone; (3) decals CRUMPLE with the car;
// (4) colours BOTH from the car and chosen (as cargo and wings: colourFrom 'car' / 'mixed' / 'fixed' plus the swatches); (5) SCALED up on
// big vehicles; (6) NO decals on Legendary cars. Designs: render/decaldesigns.js (13 plain bold shapes, drawn in code, no text, no digits).
// WHO: a car whose MODEL has a row in the zone table (render/decalzonestable.js: today the six feasibility models postvan, bug, wedge,
// flatbed, citybus, woody), not Legendary, not the Tank or the Saucer, not a blacked-out card. The Cosmetics screen's 'Decal' tab
// (render/cosmeticslots.js slot 'decal', woken here by registerSlot) shows on those cars only; anywhere else there is no tab at all.
// THE CHOICE: PER CAR over a DEFAULT (render/loadoutstore.js slot decal = { id, colour }: id a design or 'none', colour 'match' (a tone of
// the car's own paint, Good / Evil followed) or 6 hex digits, the prop swatches render/propdress.js PROP_PAINTS). ?decal=<id>[,<colour>]
// (colour: match, a swatch's name or 6 hex digits; ?decal=none) dresses every car that can wear one for the visit, over its own; not stored.
// THE DECAL: the feasibility prototype's method (render/flankdecal.js, the shared core): rays find the PAINT under each piece's rectangle,
// a lattice as coarse as keeps within 2 mm of it, every point 4 mm out along its normal, polygon offset -4, no depth write, alpha-tested;
// where something covers the paint (glass, a handle, a wheel, trim) the vertices' alpha is 0, so it never shows on a window. Laid on the
// zones BOTH flanks share (pairedZones) for a badge or a panel, mapped nose-ward (a chevron points forward on both). Layout
// (decalLayout): a BAND runs as far as the PAINT goes on unbroken at its height (paintRuns: rays every 2 cm (its height chosen on an 8 cm probe), paint facing out at every
// row, smooth as its normals predict within 4 mm, 1 cm clear of a tyre), started from a clean zone; each flank its own runs (the bus's
// doors are on one side only), the unbroken height preferred (the Post Van's band is one piece, 4.16 m); its tile clipped at the end;
// a panel sits on the zone it is biggest in, at that zone's nose end; a badge in the middle of the roomiest zone. SIZE: the
// design's own (band height, picture height) times the vehicle's scale S = its length / 4.4 m, between 1 and 2.2 (the bus 2.2), never
// more than the zone takes (85% of a band's zone height, 90% of a badge's).
// ONE MESH a car (both flanks), ONE material per design + ink (a 256 x 64 / 128 / 256 canvas, made when first worn, kept while a dressed
// model wears it: looks no model wears are let go once more than LOOKS_KEPT are held), so ONE draw call a car. The wrapped geometry
// is kept per car + design (GEO), so a second dressing casts no rays. Parented where the body is (it rides the suspension and the body
// bounce: it is one of the sprung parts). DENTS: render/dents.js crumples it as a panel (a large non-paint part, lifted off the paint where
// both bend); forgetDents after every change, so a model measured before measures again with it. BLACKOUT: its material is
// `blackout: 'hide'` (render/silhouette.js) and a blacked-out model wears none. GHOST: render/items.js ghostify swaps it to an unseen
// material (not the ghost's pale one, which would show its rectangle). Not on the unlock reveals (dressCosmetics stock).
// RENDER-ONLY: no rules module imports this; nothing in the replay fingerprint, the cookie or a save code. No per-frame work: the livery
// hook compares one flag.
// ?decaltest= (the prototype) wins: with it on, this adds nothing.
import * as THREE from 'three';
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import { registerSlot } from './cosmeticslots.js';
import { flankView, flankHit, wrapRect, pairedZones, zonesFor, FLANK, DECAL_TEST } from './flankdecal.js';
import { DECAL_ZONES } from './decalzonestable.js';
import { forgetDents } from './dents.js';
import { SILHOUETTE } from './silhouette.js';
import { carPrimary } from './propmodelsroof.js';
import { PROP_PAINTS, paintValueOf } from './propdress.js';
import * as Store from './loadoutstore.js';
import { DESIGNS, designById, canvasSize, drawDesign, toneOf } from './decaldesigns.js';
import { atRest as restPose } from './restpose.js'; // (measured against the model as built, then riding with its part: CHECKLIST 458)

export { DESIGNS, designById };
export const DECAL_PAINTS = PROP_PAINTS; // (the swatches: Match car and the seven colours, as the props)
export const PRICE = 250; // (a placeholder for a later shop, as the props' 300 / 400; nothing reads it yet)
registerCosmetics(DESIGNS.map(d => ({ slot: 'decal', id: d.id, name: d.name, free: true, price: PRICE })));

// ---- who can wear one ----
export const decalKey = (car) => (car ? car.model || car.id : null);
export const decalSupported = (car) => !!car && !car.legend && !car.tank && !car.ufo && !car.silhouette && !!DECAL_ZONES[decalKey(car)];

// ---- the choice ----
const NONE = Object.freeze({ id: 'none', colour: 'match' });
const validId = (id) => id === 'none' || !!designById(id);
const colourValue = (v) => {
  if (typeof v !== 'string') return null;
  const s = v.toLowerCase().replace(/^#|^0x/, '');
  if (s === 'match' || /^[0-9a-f]{6}$/.test(s)) return s;
  const p = PROP_PAINTS.find(x => x.id === s);
  return p ? paintValueOf(p) : null;
};
// ?decal=<id>[,<colour>]: the visit's own, for every car (null: not asked, or not understood)
const asked = () => {
  let v;
  try { v = new URLSearchParams(location.search).get('decal'); } catch { return null; }
  if (!v) return null;
  const [id, colour] = v.toLowerCase().split(',');
  return validId(id) ? { id, colour: colourValue(colour || 'match') || 'match' } : null;
};
// the car's choice (carId null: the default's): its own over the default's (render/loadoutstore.js); an unknown id or colour: none / match
export const decalChoice = (carId = null) => {
  const a = asked();
  if (a) return a;
  const s = Store.get(carId, 'decal');
  return { id: validId(s.id) ? s.id : 'none', colour: colourValue(s.colour) || 'match' };
};
// the decal worn: the choice if owned (?decal= is the visit's own), else none
export const shownDecal = (carId = null) => {
  const c = decalChoice(carId);
  return c.id === 'none' || asked()?.id === c.id || ownsCosmetic('decal', c.id) ? c : { id: 'none', colour: c.colour };
};
export const setDecal = (id, target = null) => {
  if (!validId(id) || (id !== 'none' && !ownsCosmetic('decal', id))) return false;
  return Store.setSlot(target, 'decal', { id });
};
export const setDecalColour = (colour, target = null) => {
  const v = colourValue(colour);
  return v ? Store.setSlot(target, 'decal', { colour: v }) : false;
};
export const resetDecal = (target = null) => Store.setSlot(target, 'decal', { id: 'none', colour: 'match' });
const listeners = new Set();
export const onDecal = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
// the ink a design is drawn in: the swatch, or for 'match' a tone of the car's paint on that side (a 'fixed' design: its own, 0 here)
export const inkOf = (d, colour, car, evil = false) => (d.colourFrom === 'fixed' ? 0 : colour === 'match' ? toneOf(carPrimary(car, evil) ?? 0x888888) : parseInt(colour, 16));

// ---- the layout on a car's zones (model frame: z the nose +, y up from the road) ----
const INSET = 0.03; // m: kept in from a zone's ends
export const vehicleScale = (length) => Math.max(1, Math.min(2.2, length / 4.4));
// [{ z0, z1, y0, y1, cell: [u0, v0, u1, v1], zone, side? }]: a badge or a panel the same on both flanks (the zones both share); a band
// at one height on both flanks, along each flank's own RUNS when opts.runs(side, ya, yb) -> [{ z0, z1 }] is given (the paint followed
// by rays, see paintRuns: one unbroken piece wherever the paint goes on smooth and paint-faced, zones or not; side 'L' / 'R'), else
// along the shared zones themselves (zones that touch joined). A band's motif runs on to the piece's end and is CLIPPED there (a part
// motif at the end, nothing stretched or dropped).
export const decalLayout = (d, zones, S = 1, opts = {}) => {
  if (!d || !zones.length) return [];
  if (d.kind === 'band') {
    const want = d.h * S, sides = opts.runs ? ['L', 'R'] : [null], seeds = opts.seeds || zones;
    const piecesAt = (side, ya, yb, fine = false) => {
      if (opts.runs) return opts.runs(side, ya, yb, fine).filter(r => r.z1 - r.z0 >= 0.3 && (opts.zonesOf?.(side) || zones).some(o => o.y0 <= yb && o.y1 >= ya && Math.min(o.z1, r.z1) - Math.max(o.z0, r.z0) >= 0.15)); // (a run that meets a clean zone)
      const out = [];
      for (const o of zones.filter(o => o.y0 <= ya + 1e-6 && o.y1 >= yb - 1e-6).sort((p, q) => p.z0 - q.z0)) {
        const last = out[out.length - 1];
        if (last && o.z0 - last.z1 <= 0.01) { last.z1 = Math.max(last.z1, o.z1); last.zone += '+' + o.id; } else out.push({ z0: o.z0 + INSET, z1: o.z1, zone: o.id });
      }
      for (const p of out) p.z1 -= INSET;
      return out.filter(p => p.z1 - p.z0 >= 0.3);
    };
    let best = null;
    for (const z of seeds) {
      const h = Math.min(want, (z.y1 - z.y0) * 0.85);
      for (const yc of [(z.y0 + z.y1) / 2, ...[0, 1, 2, 3, 4].map(k => z.y1 - h / 2 - 0.005 - k * 0.02), z.y0 + h / 2 + 0.01]) { // (the middle, a few heights from the top down, the bottom)
        if (yc - h / 2 < z.y0 - 1e-6) continue;
        const ya = yc - h / 2, yb = yc + h / 2, per = sides.map(side => ({ side, pieces: piecesAt(side, ya, yb) }));
        const lens = per.flatMap(p => p.pieces.map(r => r.z1 - r.z0)), long = Math.max(0, ...lens); // (an unbroken band wins: its longest piece counts in full, the others a third)
        const both = per.every(p => p.pieces.length) ? 1 : 0.25; // (a height that dresses both flanks over one that leaves a flank bare: CHECKLIST 508, the coach)
        const score = (long + (lens.reduce((t, l) => t + l, 0) - long) / 3) * Math.sqrt(Math.min(1, h / want)) * both; // (a thinner unbroken band over a broken full-height one)
        if (score > 0 && (!best || score > best.score + 1e-6)) best = { score, h, ya, yb, per };
      }
    }
    if (!best) return [];
    if (opts.runs) best.per = sides.map(side => ({ side, pieces: piecesAt(side, best.ya, best.yb, true) })); // (the height chosen on the coarse probe; its runs found on the fine one)
    return best.per.flatMap(({ side, pieces }) => pieces.map(p => ({ z0: p.z0, z1: p.z1, y0: best.ya, y1: best.yb, cell: [0, 0, (p.z1 - p.z0) / (best.h * d.aspect), 1], zone: p.zone || 'run', ...(side ? { side } : {}) })));
  }
  // a panel or a badge: on the zone it is biggest in (a tie: the one nearer the nose)
  const cap = d.h * S;
  let best = null;
  for (const z of zones) {
    const h = Math.min(cap, (z.y1 - z.y0) * 0.9, (z.z1 - z.z0 - 2 * INSET) / d.aspect);
    if (h > 0 && (!best || h > best.h + 1e-6 || (Math.abs(h - best.h) <= 1e-6 && z.z1 > best.z.z1))) best = { h, z };
  }
  if (!best || best.h < 0.12) return [];
  const { h, z } = best, w = h * d.aspect, yc = (z.y0 + z.y1) / 2;
  const z1 = d.kind === 'panel' ? z.z1 - INSET : (z.z0 + z.z1) / 2 + w / 2;
  return [{ z0: z1 - w, z1, y0: yc - h / 2, y1: yc + h / 2, cell: [0, 0, 1, 1], zone: z.id }];
};

// ---- the paint along a flank, by rays (for a band's runs): a 2 cm lattice along the side view, each ray's first hit, made row by row as
// a band asks (kept per car). A COLUMN of a band's rows is good where every row meets PAINT facing out (render/flankdecal.js flankHit:
// not glass, a wheel, a lamp, trim or a curve) and moves from the column before as its normals predict, within SMOOTH (so a 4 cm step,
// a panel's edge standing out, an arch's lip break it; a flat door shut line does not). A run is good columns in a row, ends inset 1 cm.
const STEP = 0.02, SMOOTH = 0.004, COARSE = 4, LAT = 0.01;
const PAINT = new Map();
const paintRuns = (view, car) => {
  const key = car.id;
  if (!PAINT.has(key)) PAINT.set(key, { rows: { L: new Map(), R: new Map() }, rays: 0 });
  const P = PAINT.get(key), z0 = view.box.min.z, nz = Math.floor((view.box.max.z - z0) / STEP) + 1;
  // a row of rays at a height on the 1 cm lattice (shared by every band that asks), each cell cast when first asked
  const row = (side, j) => {
    let r = P.rows[side].get(j);
    if (!r) P.rows[side].set(j, r = { y: j * LAT, s: side === 'L' ? -1 : 1, done: new Uint8Array(nz), ok: new Uint8Array(nz), wheel: new Uint8Array(nz), x: new Float32Array(nz), slope: new Float32Array(nz) });
    return r;
  };
  const cell = (r, i) => {
    if (!r.done[i]) {
      const h = flankHit(view, r.s, r.y, z0 + i * STEP); P.rays++;
      r.done[i] = 1;
      if (h.kind === 'paint') { r.ok[i] = 1; r.x[i] = h.point.x; r.slope[i] = -h.normal.z / h.normal.x; }
      if (h.kind === 'wheel') r.wheel[i] = 1;
    }
    return r;
  };
  // fine: every 2 cm along, rows 1 cm in from the band's edges and no more than 4 cm apart between, a row 1 cm outside each edge for a
  // tyre's top; coarse (to choose the band's height): every 8 cm along, its two edge rows and its middle
  const runs = (side, ya, yb, fine = false) => {
    const lo = Math.ceil((ya + 0.005) / LAT), hi = Math.max(lo, Math.floor((yb - 0.005) / LAT)), js = [lo, hi];
    if (fine) for (let j = lo + 4; j < hi; j += 4) js.push(j); else js.push(Math.round((lo + hi) / 2));
    const rows = [...new Set(js)].map(j => row(side, j)), margin = [row(side, Math.floor((ya - 0.005) / LAT)), row(side, Math.ceil((yb + 0.005) / LAT))];
    const di = fine ? 1 : COARSE, out = [];
    const good = (i) => rows.every(r => cell(r, i).ok[i]) && !margin.some(r => cell(r, i).wheel[i]);
    const smooth = (i) => rows.every(r => Math.abs(r.x[i] - r.x[i - di] - (r.slope[i] + r.slope[i - di]) / 2 * STEP * di) <= SMOOTH * (fine ? 1 : 2));
    let start = -1, last = -1;
    for (let i = 0; i < nz + di; i += di) {
      const g = i < nz && good(i), joined = g && start >= 0 && smooth(i);
      if (start >= 0 && !joined) { out.push({ z0: z0 + start * STEP + 0.01, z1: z0 + last * STEP - 0.01 }); start = -1; }
      if (g && start < 0) start = i;
      if (g) last = i;
    }
    return out;
  };
  return { runs, stats: P };
};
export const forgetPaintRuns = () => PAINT.clear(); // (for a check)

// ---- the wrapped geometry, per car + design (model frame), kept ----
const GEO = new Map();
const wrapDecal = (model, car, d) => {
  const k = car.id + '|' + d.id;
  if (GEO.has(k)) return GEO.get(k);
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const view = flankView(model), length = view.box.max.z - view.box.min.z, S = vehicleScale(length);
  const key = decalKey(car), paint = d.kind === 'band' ? paintRuns(view, car) : null, rays0 = paint ? paint.stats.rays : 0;
  const rects = decalLayout(d, pairedZones(key), S, paint ? { runs: paint.runs, seeds: [...zonesFor(key, 'L'), ...zonesFor(key, 'R')], zonesOf: (side) => zonesFor(key, side) } : {}), out = { pos: [], nor: [], uv: [], col: [] }, pieces = [];
  for (const [s, side] of [[-1, 'L'], [1, 'R']]) for (const r of rects) if (!r.side || r.side === side) pieces.push({ side, zone: r.zone, rect: r, ...wrapRect(view, s, r, { cell: r.cell, map: 'forward', adaptive: true }, out, FLANK.LIFT) });
  const flat = (list) => { const a = new Float32Array(list.length * 3); list.forEach((p, i) => { a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z; }); return a; };
  const g = { pos: flat(out.pos), nor: flat(out.nor), uv: Float32Array.from(out.uv), col: Float32Array.from(out.col),
    stats: { S, length, rects, pieces, triangles: out.pos.length / 3, rays: pieces.reduce((a, p) => a + p.rays, 0) + (paint ? paint.stats.rays - rays0 : 0), ms: (typeof performance !== 'undefined' ? performance : Date).now() - t0 } };
  GEO.set(k, g);
  return g;
};
export const forgetDecalGeometry = () => GEO.clear(); // (for a check)
const M = new THREE.Matrix4();
const meshFor = (model, g, material) => {
  const parent = model.userData.body?.parent || model;
  model.updateMatrixWorld(true);
  M.copy(parent.matrixWorld).invert().multiply(model.matrixWorld);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(g.pos.slice(), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(g.nor.slice(), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(g.uv.slice(), 2));
  geo.setAttribute('color', new THREE.BufferAttribute(g.col.slice(), 4));
  geo.applyMatrix4(M); // (the model's frame into the parent's: positions and normals)
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'decal';
  mesh.userData.flankDecal = true; // (render/flankdecal.js flankView looks through it; render/items.js ghostify hides it)
  mesh.userData.decalCosmetic = true;
  mesh.userData.patchRole = 'decal';
  mesh.renderOrder = 2;
  mesh.raycast = () => {}; // (not pickable: placement rays and the model editor go through it)
  parent.add(mesh);
  return mesh;
};

// ---- the looks: a canvas texture and a material per design + ink, shared by every model wearing it ----
const LOOKS = new Map(); // key -> { texture, material, bytes }
export const LOOKS_KEPT = 4;
const lookKey = (d, ink) => (d.colourFrom === 'fixed' ? d.id : d.id + ':' + ink.toString(16).padStart(6, '0'));
const live = new Set(); // WeakRefs to the models dressed
const plans = () => { const out = []; for (const ref of live) { const m = ref.deref(); if (m) out.push(m.userData.decalPlan); else live.delete(ref); } return out; };
const sweep = (keep) => { // (looks no model wears let go, once more than LOOKS_KEPT are held)
  if (LOOKS.size <= LOOKS_KEPT) return;
  const used = new Set(plans().map(p => p.lookKey));
  for (const [k, look] of LOOKS) if (k !== keep && !used.has(k)) { look.texture.dispose(); look.material.dispose(); LOOKS.delete(k); }
};
const lookFor = (d, ink) => {
  const key = lookKey(d, ink);
  let look = LOOKS.get(key);
  if (look) return { key, look };
  if (typeof document === 'undefined' || !document.createElement) return { key, look: null };
  const [W, H] = canvasSize(d), canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return { key, look: null };
  drawDesign(g, d, ink, W, H);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = d.kind === 'band' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.userData.shared = true; // (render/scene.js clearGroup leaves it: kept here)
  // lit as the body is; see-through outside its shapes and where the paint does not show (the vertices' alpha); no depth written, pulled
  // forward by a polygon offset over its 4 mm lift (no z-fighting with the paint under it)
  const material = new THREE.MeshLambertMaterial({ map: texture, emissive: 0x3a3a3a, emissiveMap: texture, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.5,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  material.userData.shared = true;
  material.userData.blackout = 'hide'; // (render/silhouette.js: not drawn at all on a blacked-out car)
  material.name = 'decal ' + key;
  look = { texture, material, bytes: W * H * 4, size: [W, H] };
  LOOKS.set(key, look);
  sweep(key);
  return { key, look };
};
// the GPU memory the looks held now take (bytes, a third more with mipmaps), for a check or a report
export const decalMemory = () => { let b = 0; for (const l of LOOKS.values()) b += Math.round(l.bytes * 4 / 3); return { looks: LOOKS.size, bytes: b }; };

// ---- dressing a model ----
const blackedOut = (model) => { const m = model.userData.body?.material; return !!m && (m === SILHOUETTE || (m.isMeshBasicMaterial && m.color.getHex() < 0x0a0a0e)); };
// a mesh's material set, or its own put aside while the Ghost's stands in (render/items.js ghostify)
const setMaterial = (mesh, m) => { if (mesh.userData.solidMat) mesh.userData.solidMat = m; else mesh.material = m; };
const removeMesh = (model, plan) => {
  forgetDents(model); // (its crumpled copies back to clean and let go first: the dents measured it)
  plan.mesh.removeFromParent();
  plan.mesh.geometry.dispose();
  plan.mesh = null; plan.designId = null;
};
const apply = (model) => restPose(model, () => applyNow(model)); // (at rest: a model that animates is measured as built, then the cosmetic rides with its part: render/restpose.js)
const applyNow = (model) => {
  const plan = model.userData.decalPlan;
  if (!plan) return;
  const c = plan.status !== 'ok' || DECAL_TEST.mode ? NONE : plan.forced || shownDecal(plan.carId);
  const d = c.id !== 'none' ? designById(c.id) : null, dark = blackedOut(model);
  if (plan.mesh && (!d || dark || plan.designId !== d.id)) removeMesh(model, plan);
  if (d && !dark) {
    const ink = inkOf(d, c.colour, plan.car, plan.evil), { key, look } = lookFor(d, ink);
    if (!plan.mesh && look) {
      const g = wrapDecal(model, plan.car, d);
      plan.stats = g.stats;
      if (g.pos.length) { plan.mesh = meshFor(model, g, look.material); plan.designId = d.id; forgetDents(model); }
    }
    if (plan.mesh && look && plan.lookKey !== key) setMaterial(plan.mesh, look.material);
    plan.lookKey = plan.mesh && look ? key : null;
  } else plan.lookKey = null;
  plan.worn = plan.mesh ? { id: d.id, colour: d.colourFrom === 'fixed' ? 'fixed' : c.colour } : null;
};
const refresh = () => {
  for (const ref of live) { const model = ref.deref(); if (model) apply(model); else live.delete(ref); }
  for (const fn of [...listeners]) { try { fn(); } catch (error) { console.warn('decal listener: ' + (error?.message || error)); } }
};
Store.onStore(({ slot }) => { if (slot === null || slot === 'decal') refresh(); });
export const decalPlan = (model) => model?.userData.decalPlan || null;
// opts.look { id, colour }: this look whatever is chosen (a review page, a check)
export const dressDecal = (model, car, opts = {}) => {
  if (!model?.userData || model.userData.decalPlan) return model;
  const status = !car ? 'none' : decalSupported(car) ? 'ok' : 'unsupported';
  const plan = model.userData.decalPlan = { carId: car ? car.id : null, car, status, forced: opts.look ? { id: opts.look.id, colour: colourValue(opts.look.colour || 'match') || 'match' } : null,
    mesh: null, designId: null, lookKey: null, evil: false, worn: null, stats: null };
  if (status === 'ok') {
    live.add(new WeakRef(model));
    // the model's livery hook tells the side (for 'Match car'): a look made again only when the side changes
    const livery = model.userData.livery;
    model.userData.livery = function (evil, ...rest) { const r = livery?.call(this, evil, ...rest); if (plan.evil !== !!evil) { plan.evil = !!evil; if (plan.mesh) apply(model); } return r; };
  }
  apply(model);
  return model;
};

// ---- the Cosmetics screen's tab: shown on a car with a zone row (render/cosmeticsui.js gives it its panel: design chips and a colour row) ----
registerSlot({
  id: 'decal', label: 'Decal', name: 'Decal', scope: 'car',
  supports: (car) => decalSupported(car),
  items: () => DESIGNS.map(d => ({ id: d.id, name: d.name })),
  chosen: (target) => decalChoice(target).id,
  pick: (id, target) => setDecal(id, target),
});
