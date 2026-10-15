// ---- the WHEEL colour: the first equippable cosmetic (the owner, 14-Oct: "Wheels first, and global"; CHECKLIST 263) ------------
// One choice for the whole game, not a loadout per car: the colour of the HUBS (rims, hub caps, spokes) of whatever car is on
// show or driven. Tyres stay rubber-black. RENDER-ONLY: nothing here is written onto a car's CARS entry, into a save's
// data or into the replay fingerprint (no rules module imports it); the choice is kept in this browser's localStorage under
// KEY (not the cookie: that has little room), reads and writes wrapped in try/catch (no storage: it holds for the visit), and
// is ignored on a visit with test switches (Progress.noSave: stock wheels, and a change lasts the visit only).
// DESIGNS (the owner, 14-Oct: "designs that look plausible spinning first, like whitewalls, and red with white hubs"): a small
// preset = a TYRE treatment + a HUB treatment, every one made of rings, discs and concentric bands, so it reads the same still or
// turning (no spokes to read). Tyre: a flat ring on each outer sidewall (RingGeometry, 16 segments = 32 triangles a ring, one
// geometry per ring shape shared by every wheel, 5 mm off the tyre's face so it cannot z-fight; a centre wheel gets one each side),
// and/or the tyre's rubber (tyres, tread blocks, sidewall rings) recoloured. Hub: a colour. The two choices combine: a chosen
// hub colour (anything but Stock) always wins over the design's hub; hub colour Stock leaves the design's own hubs (or the car's).
// A car with no hub found stays stock; a tyre with no hub of its own gets no treatment. Kept under KEY_DESIGN (?wheeldesign=<id>).
// API: dressWheels(model, car)  called where a car's model is built (render/showcar.js makeShowCar, render/items.js
//        playerModel): finds the model's hubs (once, as built) and puts the chosen colour on them; returns the model
//      WHEEL_DESIGNS, wheelDesign(), setWheelDesign(id)  the designs ({ id, name, tyre, ring, hub }), the choice, change it
//      WHEEL_COLOURS, wheelColour(), setWheelColour(id)  the list ({ id, name, hex }; Stock = hex null), the choice, change it
//      WHEEL_SETS, wheelSet(), setWheelSet(id)  the player-facing complete wheels ({ id, name, design, hub }), the equipped one (derived; 'custom' if the pair is no set), equip one
//      onWheelColour(fn)  fn() is called after a colour or a design change (the menu's chips); every dressed model still alive is recoloured
//        on the spot: no reload
//      findHubs(model) -> { tyres, hubs: [{ mesh, tyre }] }  (for the check)
// How the hubs are found (models have no wheel tagging; each builds its tyre and hub its own way): the TYRES are the discs on
// their side touching the floor (as render/carsuspension.js finds them: not a box, as high as long, thinner across); a HUB
// is any other mesh centred on a tyre's axle (within a tenth of its radius, and about its width along the axle), no wider
// across than the tyre's tread, and not in the tyre's own colour (tread blocks, sidewall rings). A car with no tyres, or
// no hub that way, stays stock. A Legendary car keeps its gold hub caps (the owner's black-and-gold look).
// Materials: a hub's material is often a cached one shared by other parts and cars, so it is never changed: the model gets a
// CLONE (one per stock material), with the colour set, and the stock one is put back for Stock. A part whose material is
// something else at that moment (a blacked-out silhouette) is left alone; a ghost's stand-in (render/items.js ghostify)
// keeps the part's own paint in userData.solidMat, which is the one changed, so the ghost fades back to the new colour.
import * as THREE from 'three';
import { Progress } from '../progress.js';
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import { addRims, spinRims, putRim, globalRim, savedRimChoice, resolveRim, rimAsked, RIM_SKIP } from './rims.js'; // (a set's rim: render/rims.js)

export const KEY = 'delivery.wheelcolour';
export const WHEEL_COLOURS = [
  { id: 'stock', name: 'Stock', hex: null },
  { id: 'silver', name: 'Silver', hex: 0xcfd3d9 },
  { id: 'black', name: 'Black', hex: 0x17181b },
  { id: 'gold', name: 'Gold', hex: 0xd9a92a },
  { id: 'white', name: 'White', hex: 0xf4f4f2 },
  { id: 'red', name: 'Red', hex: 0xd8262b },
  { id: 'blue', name: 'Blue', hex: 0x2563d6 },
  { id: 'green', name: 'Green', hex: 0x22a84f },
  { id: 'orange', name: 'Orange', hex: 0xff7a1a },
];
const byId = (id) => WHEEL_COLOURS.find(c => c.id === id) || WHEEL_COLOURS[0];

// the designs. tyre: the rubber's colour (null: stock); ring: a flat band on the outer sidewall, from `inner` to `outer` times
// the tyre's radius; hub: the hub colour the design brings (null: the car's own), overridden by a hub colour chosen apart
export const KEY_DESIGN = 'delivery.wheeldesign';
const WHITE = 0xf4f4f2, RED = 0xd8262b;
const whitewall = { inner: 0.64, outer: 0.88, hex: WHITE }, redline = { inner: 0.78, outer: 0.84, hex: RED };
export const WHEEL_DESIGNS = [
  { id: 'stock', name: 'Stock', tyre: null, ring: null, hub: null },
  { id: 'whitewall', name: 'Whitewall', tyre: null, ring: whitewall, hub: null },
  { id: 'redline', name: 'Redline', tyre: null, ring: redline, hub: null },
  { id: 'redwhite', name: 'Red tyres, white hubs', tyre: RED, ring: null, hub: WHITE },
  { id: 'whiteblack', name: 'White hubs on black', tyre: null, ring: null, hub: WHITE },
  { id: 'goldwall', name: 'Gold hubs, whitewall', tyre: null, ring: whitewall, hub: 0xd9a92a },
];
const designById = (id) => WHEEL_DESIGNS.find(d => d.id === id) || WHEEL_DESIGNS[0];

let stored = null, visit = null, storedDesign = null, visitDesign = null; // the saved id (read the first time it is wanted); the id chosen in a visit that saves nothing
const asked = typeof location !== 'undefined' ? /[?&]wheelcolour=(\w+)/.exec(location.search)?.[1] : null; // (?wheelcolour=red: a colour for the visit, for stills; never saved)
// a SAVED pair that is a wheel set the player does not own (a save without it, a cosmetic made non-free) wears Stock instead; the
// saved ids are left as they are, so owning it again brings it back. (Only the saved choice: ?wheelcolour= and test visits are the visit's own.)
const savedPairOwned = () => {
  if (stored === null) { stored = 'stock'; try { stored = byId(localStorage.getItem(KEY)).id; } catch { /* (no storage: stock) */ } }
  if (storedDesign === null) { storedDesign = 'stock'; try { storedDesign = designById(localStorage.getItem(KEY_DESIGN)).id; } catch { /* (no storage: stock) */ } }
  const set = WHEEL_SETS.find(s => s.design === storedDesign && s.hub === stored && (s.rim || 'none') === savedRimChoice().all);
  return !set || ownsCosmetic('wheels', set.id);
};
export const wheelColour = () => {
  if (asked) return byId(asked).id;
  if (Progress.noSave) return visit || 'stock'; // (a test switch is on, set after this module loads: stock wheels, and a change lasts the visit)
  if (stored === null) {
    stored = 'stock';
    try { stored = byId(localStorage.getItem(KEY)).id; } catch { /* (no storage: stock) */ }
  }
  return savedPairOwned() ? stored : 'stock';
};

const askedDesign = typeof location !== 'undefined' ? /[?&]wheeldesign=(\w+)/.exec(location.search)?.[1] : null; // (?wheeldesign=whitewall: for stills; never saved)
export const wheelDesign = () => {
  if (askedDesign) return designById(askedDesign).id;
  if (Progress.noSave) return visitDesign || 'stock';
  if (storedDesign === null) {
    storedDesign = 'stock';
    try { storedDesign = designById(localStorage.getItem(KEY_DESIGN)).id; } catch { /* (no storage: stock) */ }
  }
  return savedPairOwned() ? storedDesign : 'stock';
};

// ---- finding the hubs ----------------------------------------------------------------------------------------------
const NEAR = 0.03;
const toModel = new THREE.Matrix4(), m1 = new THREE.Matrix4(), v1 = new THREE.Vector3();
const boxIn = (mesh) => {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return new THREE.Box3().copy(mesh.geometry.boundingBox).applyMatrix4(m1.multiplyMatrices(toModel, mesh.matrixWorld));
};
const colourOf = (mesh) => { const m = [].concat(mesh.material)[0]; return m?.color ? m.color.getHex() : null; };

export const findHubs = (model) => {
  model.updateMatrixWorld(true);
  toModel.copy(model.matrixWorld).invert();
  const meshes = [];
  model.traverse((node) => { if (node.isMesh && node.geometry && !node.isInstancedMesh && node.visible && !node.userData.wheelRing) meshes.push({ node, box: boxIn(node) }); });
  const all = new THREE.Box3();
  for (const m of meshes) all.union(m.box);
  const ground = all.min.y, middle = all.getCenter(new THREE.Vector3());
  const tyres = meshes.filter((m) => {
    const size = m.box.getSize(v1), across = Math.min(size.x, size.z), along = Math.max(size.x, size.z);
    return !m.node.geometry.type.startsWith('Box') && size.y > 0.1 && m.box.min.y - ground < NEAR && Math.abs(along - size.y) < 0.15 * size.y && across < 0.85 * size.y;
  });
  const isTyre = new Set(tyres.map(t => t.node)), hubs = [], taken = new Set(), rubber = [], info = [];
  for (const tyre of tyres) {
    const size = tyre.box.getSize(new THREE.Vector3()), centre = tyre.box.getCenter(new THREE.Vector3());
    const axleX = size.x < size.z, r = size.y / 2, half = (axleX ? size.x : size.z) / 2, tread = colourOf(tyre.node);
    const mine = { tyre: tyre.node, centre, axleX, r, half, hubs: 0, rubber: [], outer: Math.abs(axleX ? centre.x - middle.x : centre.z - middle.z) < 0.15 * r ? 0 : Math.sign(axleX ? centre.x - middle.x : centre.z - middle.z) };
    for (const m of meshes) {
      if (isTyre.has(m.node) || taken.has(m.node)) continue;
      const s = m.box.getSize(new THREE.Vector3()), c = m.box.getCenter(new THREE.Vector3()).sub(centre);
      const axial = axleX ? c.x : c.z, other = axleX ? c.z : c.x, sAxial = axleX ? s.x : s.z, sOther = axleX ? s.z : s.x;
      if (Math.abs(c.y) > 0.1 * r || Math.abs(other) > 0.1 * r) continue;      // (on the axle)
      if (Math.abs(axial) > half * 1.6 || sAxial > half * 3.2) continue;          // (about the tyre's width: a hub may stand a little proud)
      if (Math.max(s.y, sOther) > r * 1.94) continue;                              // (no wider across than the tread)
      taken.add(m.node);
      if (colourOf(m.node) === tread) { mine.rubber.push(m.node); rubber.push(m.node); continue; } // (tread blocks and sidewall rings: the tyre's own black; they follow a tyre recolour)
      mine.hubs++;
      hubs.push({ mesh: m.node, tyre: tyre.node });
    }
    // the tyre's frame: where its ring goes is kept relative to the tyre, so it rides with the tyre whatever moves it later
    mine.toTyre = new THREE.Matrix4().copy(tyre.node.matrixWorld).invert().multiply(model.matrixWorld);
    info.push(mine);
  }
  return { tyres: tyres.map(t => t.node), hubs, rubber, info };
};

// ---- putting a colour on them --------------------------------------------------------------------------------------
const live = new Set(); // WeakRefs to the models dressed (a car on show comes and goes; one still alive is recoloured on a change)
const listeners = new Set();

// the model's clone of a stock material (one per material, so parts that shared one still do), the colour set; not
// `shared`, so clearGroup disposes it with the model
const cloneFor = (model, stock, key) => {
  const clones = model.userData[key] || (model.userData[key] = new Map());
  let clone = clones.get(stock);
  if (!clone) {
    clone = stock.clone();
    if (clone.userData) { delete clone.userData.shared; clone.userData.wheelHub = true; } // (wheelHub: render/dents.js does not take it for glass)
    clones.set(stock, clone);
  }
  return clone;
};

// parts: [{ mesh, stock }]; key: the model's map of clones for them (hubs and rubber keep their own)
const paint = (model, parts, key, hex, glow = 0) => {
  for (const part of parts) {
    const mesh = part.mesh, ghost = !!mesh.userData.solidMat, current = ghost ? mesh.userData.solidMat : mesh.material;
    if (Array.isArray(current) || !current) continue;
    const stock = part.stock;
    if (current !== stock && current !== model.userData[key]?.get(stock)) continue; // (a silhouette or something else stands in: left)
    const next = hex === null ? stock : cloneFor(model, stock, key);
    if (hex !== null) { next.color.setHex(hex); if (next.emissive) next.emissive.copy(next.color).multiplyScalar(glow); } // (glow: a little of its own light, so a white hub in shade reads white, not grey)
    if (ghost) mesh.userData.solidMat = next; else mesh.material = next;
  }
};

// ---- the sidewall rings: one geometry per ring shape and one material per colour, shared by every wheel of every car ----
const ringGeos = new Map(), ringMats = new Map(), Z = new THREE.Vector3(0, 0, 1);
const ringGeo = (ring) => {
  const key = ring.inner + '/' + ring.outer;
  if (!ringGeos.has(key)) { const g = new THREE.RingGeometry(ring.inner, ring.outer, 16, 1); g.userData.shared = true; ringGeos.set(key, g); }
  return ringGeos.get(key);
};
const ringMat = (hex) => {
  if (!ringMats.has(hex)) { const m = new THREE.MeshLambertMaterial({ color: hex, emissive: new THREE.Color(hex).multiplyScalar(0.35) }); m.userData.shared = true; m.userData.wheelHub = true; ringMats.set(hex, m); }
  return ringMats.get(hex);
};
export const RING_GAP = 0.005; // how far a ring stands off the tyre's face (m): over the 4 mm the z-fight detector calls "the same plane"
const pose = new THREE.Matrix4(), axis = new THREE.Vector3(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), one = new THREE.Vector3();
const removeRings = (model) => {
  const found = model.userData.wheelHubs;
  for (const ring of found.rings) ring.parent?.remove(ring);
  found.rings.length = 0;
};
const addRings = (model, ring) => {
  const found = model.userData.wheelHubs;
  removeRings(model);
  if (!ring) return;
  const geo = ringGeo(ring), mat = ringMat(ring.hex);
  for (const t of found.info) {
    const tyre = t.tyre, ghost = tyre.userData.solidMat, current = ghost || tyre.material;
    if (current !== t.stock && current !== model.userData.wheelRubberClones?.get(t.stock)) continue; // (blacked out: no ring)
    for (const side of t.outer ? [t.outer] : [-1, 1]) {
      axis.set(t.axleX ? side : 0, 0, t.axleX ? 0 : side);
      q.setFromUnitVectors(Z, axis);
      pos.copy(t.centre).addScaledVector(axis, t.half + RING_GAP);
      pose.compose(pos, q, one.set(t.r, t.r, 1)).premultiply(t.toTyre);
      const mesh = new THREE.Mesh(geo, mat);
      pose.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.userData.wheelRing = true; // (the other render modules leave it be: dents, suspension)
      if (ghost) { mesh.userData.solidMat = mat; mesh.material = tyre.material; } // (a ghost: pale like the rest)
      tyre.add(mesh);
      found.rings.push(mesh);
    }
  }
};

// how a model's wheels are shown now: the chosen design, and the hub colour (a colour chosen apart wins over the design's hubs)
const dressed = (model) => {
  const found = model.userData.wheelHubs;
  if (!found) return; // (no hub found: the colour and rings have nothing to go on, but a rim still may)
  const design = designById(wheelDesign()), colour = byId(wheelColour());
  const hub = colour.hex !== null ? colour.hex : design.hub;
  paint(model, found.hubs, 'wheelClones', hub, 0.3);
  paint(model, found.parts, 'wheelRubberClones', design.tyre);
  addRings(model, design.ring);
  addRims(model, hub, rimsWorn()); // (the set's rim, in its hub colour; render/rims.js)
};

const plain = (mesh) => { const m = mesh.material; return m && !Array.isArray(m) && m.color && !m.map && !m.vertexColors; };
export const dressWheels = (model, car) => {
  if (!model || model.userData.wheelHubs) return model;
  if (car && car.legend) { model.userData.wheelHubs = { tyres: [], hubs: [], parts: [], info: [], rings: [], legend: true }; return model; } // (Legendary: black and gold, as designed)
  let found;
  try { found = findHubs(model); } catch { found = { tyres: [], hubs: [], rubber: [], info: [] }; }
  // only plain single-colour materials can be tinted: a textured, vertex-coloured or multi-material hub stays as it is
  found.rawHubs = found.hubs.slice(); // (every hub, tintable or not: a rim's dish covers them all)
  found.hubs = found.hubs.filter(({ mesh }) => plain(mesh));
  for (const hub of found.hubs) hub.stock = hub.mesh.material;
  // a tyre with no hub of its own (or a car with none) stays stock; the tyre's rubber = the tyre and its tread blocks / rings
  const hubbed = new Set(found.hubs.map(h => h.tyre));
  // a RIM goes on every plain tyre found, hub or none (render/rims.js); front or rear by where it is along the car
  found.rimInfo = found.info.filter(t => plain(t.tyre));
  const zs = found.rimInfo.map(t => t.centre.z), midZ = (Math.min(...zs) + Math.max(...zs)) / 2;
  for (const t of found.rimInfo) { t.stock = t.tyre.material; t.axle = t.centre.z > midZ + 0.01 ? 'front' : 'rear'; }
  found.carId = car ? car.id : null;
  found.rimSkip = !!(car && (RIM_SKIP.has(car.id) || RIM_SKIP.has(car.model)));
  found.info = found.hubs.length ? found.info.filter(t => hubbed.has(t.tyre) && plain(t.tyre)) : [];
  found.parts = [];
  for (const t of found.info) {
    t.stock = t.tyre.material;
    for (const mesh of [t.tyre, ...t.rubber]) if (plain(mesh)) found.parts.push({ mesh, stock: mesh.material });
  }
  found.rings = [];
  model.userData.wheelHubs = found;
  live.add(new WeakRef(model));
  // the rims turn as the model is drawn: its animate(t) also turns them (no extra arrays: a model's animate takes at most a few arguments)
  const animate = model.userData.animate;
  model.userData.animate = (t, a, b, c) => { const r = animate ? animate(t, a, b, c) : undefined; spinRims(model, t); return r; };
  if (wheelColour() !== 'stock' || wheelDesign() !== 'stock' || found.rimInfo.some(t => resolveRim(found.carId, t.axle) !== 'none')) dressed(model);
  return model;
};

const refresh = (id) => {
  for (const ref of live) { const model = ref.deref(); if (model) dressed(model); else live.delete(ref); }
  for (const fn of listeners) fn(id);
};
const putColour = (id) => {
  const colour = byId(id);
  if (Progress.noSave) visit = colour.id;
  else { stored = colour.id; try { localStorage.setItem(KEY, colour.id); } catch { /* (no storage: for this visit) */ } }
  return colour.id;
};
const putDesign = (id) => {
  const design = designById(id);
  if (Progress.noSave) visitDesign = design.id;
  else { storedDesign = design.id; try { localStorage.setItem(KEY_DESIGN, design.id); } catch { /* (no storage: for this visit) */ } }
  return design.id;
};
export const setWheelColour = (id) => refresh(putColour(id));
export const setWheelRim = (id) => refresh(putRim(id)); // (the rim alone, for a check or a later per-axle screen; the menu equips whole sets)
export const setWheelDesign = (id) => refresh(putDesign(id));

// ---- WHEEL SETS (the owner, 14-Oct: "Don't split tyres and rims ... the player should get the item as a set") ----------------------
// rim (15-Oct): a set may carry a rim (render/rims.js RIM_DESIGNS); none if absent. Kept under its own key, delivery.wheelrim.
// What the player sees and equips: one complete wheel = a design (tyre) + a hub colour, applied together through the two setters
// above (nothing new is stored: the equipped set is DERIVED from the two saved ids, so older saves and ?wheeldesign= / ?wheelcolour=
// combinations keep working; a pair that is no set is 'custom'). A hub colour 'stock' lets the design's own hubs (or the car's) show.
export const WHEEL_SETS = [
  { id: 'stock', name: 'Stock', design: 'stock', hub: 'stock' },
  { id: 'whitewall-silver', name: 'Whitewall + silver', design: 'whitewall', hub: 'silver' },
  { id: 'whitewall-gold', name: 'Whitewall + gold', design: 'goldwall', hub: 'stock' },
  { id: 'whitewall-green', name: 'Whitewall + green', design: 'whitewall', hub: 'green' },
  { id: 'redline-blue', name: 'Redline + blue', design: 'redline', hub: 'blue' },
  { id: 'redline-black', name: 'Redline + black', design: 'redline', hub: 'black' },
  { id: 'red-white', name: 'Red tyres, white hubs', design: 'redwhite', hub: 'stock' },
  { id: 'white-on-black', name: 'White hubs on black', design: 'whiteblack', hub: 'stock' },
  { id: 'blackout', name: 'Black out', design: 'stock', hub: 'black' },
  { id: 'gold-rush', name: 'Gold rush', design: 'stock', hub: 'gold' },
  { id: 'orange-pop', name: 'Orange pop', design: 'stock', hub: 'orange' },
  { id: 'red-hot', name: 'Red hot', design: 'stock', hub: 'red' },
  { id: 'spoke5', name: '5-spoke', design: 'stock', hub: 'silver', rim: 'spoke5' },
  { id: 'twin-spoke', name: 'Twin spoke', design: 'stock', hub: 'white', rim: 'twin10' },
  { id: 'turbine', name: 'Turbine', design: 'redline', hub: 'silver', rim: 'turbine' },
  { id: 'blade-spinner', name: 'Blade spinner', design: 'stock', hub: 'gold', rim: 'blade3' },
  { id: 'twin-spinner', name: 'Twin spinner', design: 'stock', hub: 'red', rim: 'twinspin' },
];
registerCosmetics(WHEEL_SETS.map(s => ({ slot: 'wheels', id: s.id, name: s.name, free: true }))); // (all free today; cosmetics.js)
export const CUSTOM_SET = 'custom';
const rimsWorn = () => rimAsked || Progress.noSave || savedPairOwned();
export const wheelRim = () => (rimsWorn() ? globalRim() : 'none'); // (the global rim worn: a saved set not owned wears Stock, rim and all)
export const wheelSet = () => { const d = wheelDesign(), h = wheelColour(), r = wheelRim(); return WHEEL_SETS.find(s => s.design === d && s.hub === h && (s.rim || 'none') === r)?.id || CUSTOM_SET; };
export const setWheelSet = (id) => {
  const set = WHEEL_SETS.find(s => s.id === id);
  if (!set) return;
  putDesign(set.design); putColour(set.hub); putRim(set.rim || 'none');
  refresh(set.id); // (one refresh: every live car and the menu change once)
};
export const onWheelColour = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
