// ---- the PROP cosmetics: a ROOF PROP, a CARGO PROP and a REAR WING the player puts on the car (the owner, 15-Oct: "get an agent on the
// ui" for the props of render/propmodels.js (34: 9 roof, 10 cargo, 15 wing); CHECKLIST 302). RENDER-ONLY like render/wheelcosmetic.js and render/platecosmetic.js:
// nothing is written onto a car's entry, a save, the cookie or the replay fingerprint (no rules module imports this file; it is not
// in vite.config.js logicFiles); the choice lives in this browser's localStorage only.
//
// THE CHOICE is PER CAR over a DEFAULT (15-Oct, the owner: "change the customisation to be car specific now"): one roof prop, one cargo
// prop, one wing and a paint for each, per car, or the default for every car without its own (render/loadoutstore.js, slots roof / cargo /
// wing = { id, paint }); a car that cannot wear the slot (the table says so) simply shows Stock for it.
//   id: the prop id, or 'none' (Stock: the car's own prop, if it has one); paint: 'match' (the car's own body colour, follows Good/Evil) or 6 hex digits
// The old global keys delivery.prop.<slot> and .paint are read once as the default and kept in step with it. try/catch on every access;
// ignored and not written on a visit with test switches (Progress.noSave: held for the visit only); never the cookie or the save code. ?roofprop=<id|none>&roofpaint=<hex|match>, ?cargoprop=, ?wingprop= (and cargopaint, wingpaint) for ONE visit (stills).
//
// DRESSING (dressProps(model, car), called where dressPlates is: render/showcar.js makeShowCar and render/items.js playerModel):
// a slot is worn only if the car's table entry supports it (render/propanchors.js propSupported / fitProp, by the car's id) and the car is not
// LEGENDARY (a Legendary car keeps its own black-and-gold look, as it keeps its gold hubs and plates: nothing added, nothing hidden). The prop
// (render/propmodels.js buildProp, modelled to the slot's canonical box / cylinder) is placed by fitProp(carId, slot, prop.shape) as a child of
// the model's BODY GROUP where the model keeps its body in one that moves (the same parent rule as the number plate), else of the model, so it
// rides the suspension and the body bounce; forgetDents makes dents.js measure the model again with it on. The car's own tagged props of that
// slot (userData.prop, render/propcosmetic.js) are hidden with it and shown again on Stock. The Ghost power-up treats it as any mesh
// (items.js ghostify); a blacked-out model's props are made flat black (SILHOUETTE) like its plate. Traffic is never dressed.
// PAINT: the prop's main (recolourable) material. 'match' SHARES the car's own body Color (not its material: bodies with vertex colours would turn a prop black), so it follows the car (Good / Evil, a livery);
// a hex is a plain colour. Either way a Lambert material of its own (one a prop, rebuilt with the prop when the colour changes).
// OWNERSHIP: each prop is a cosmetic 'roof:roofbox' ... (render/cosmetics.js; free for now, price a placeholder), granted by "Unlock
// everything: Absolutely" (unlockall.js imports this module). A saved prop the player does not own wears Stock.
// API: dressProps(model, car) -> model       propPlan(model) -> { carId, status, groups, worn }  what a model got
//      PROP_PAINTS, propChoice(slot, carId), shownProp(slot, carId), setProp(slot, id, target) -> bool, propPaintChoice(slot, carId),
//      setPropPaint(slot, v, target) -> bool, resetProp(slot, target), onProp(fn)  (carId none: the default; target null / none: the default)  (every dressed model alive follows a change at once)     slotStatus(car, slot) -> { ok, why }  (for the screen)
import * as THREE from 'three';
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import { PROPS, propById, buildProp, propPaint } from './propmodels.js';
import { SLOTS, propSlots, fitProp } from './propanchors.js';
import { existingProps } from './propcosmetic.js';
import { forgetDents } from './dents.js';
import { SILHOUETTE } from './silhouette.js';
import * as Store from './loadoutstore.js'; // (the choice: per car over a default)

export { PROPS, SLOTS };
export const KEY = (slot) => 'delivery.prop.' + slot;
export const KEY_PAINT = (slot) => 'delivery.prop.' + slot + '.paint';
export const PROP_PAINTS = [
  { id: 'match', name: 'Match car', hex: null },
  { id: 'black', name: 'Black', hex: 0x1b1c20 },
  { id: 'white', name: 'White', hex: 0xf2f2ee },
  { id: 'red', name: 'Red', hex: 0xd8262b },
  { id: 'orange', name: 'Orange', hex: 0xff7a1a },
  { id: 'blue', name: 'Blue', hex: 0x2563d6 },
  { id: 'green', name: 'Green', hex: 0x22a84f },
  { id: 'gold', name: 'Gold', hex: 0xd9a92a },
];
const hexString = (n) => n.toString(16).padStart(6, '0');
export const paintValueOf = (p) => (p.hex === null ? 'match' : hexString(p.hex)); // the stored value of a swatch

// ---- the registry: each prop is a cosmetic of its slot (free for now; the price a placeholder for a later shop, nothing reads it) ----
registerCosmetics(SLOTS.flatMap(slot => PROPS[slot].map(p => ({ slot, id: p.id, name: p.name, free: true, price: slot === 'wing' ? 400 : 300 }))));

// ---- the choice, per slot ----
const query = () => (typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams(''));
const asked = (slot, what) => { const v = query().get(slot + what); return v === null ? null : v.toLowerCase(); };
const validProp = (slot, id) => id === 'none' || PROPS[slot].some(p => p.id === id);
const validPaint = (v) => v === 'match' || /^[0-9a-f]{6}$/.test(v);
// the store's slot { id, paint }: the car's own over the default (carId none / null: the default); a stored id or paint it does not know: Stock / match
export const propChoice = (slot, carId = null) => { const a = asked(slot, 'prop'); if (a !== null && validProp(slot, a)) return a; const id = Store.get(carId, slot).id; return validProp(slot, id) ? id : 'none'; };
export const propPaintChoice = (slot, carId = null) => { const a = asked(slot, 'paint'); if (a !== null && validPaint(a)) return a; const v = String(Store.get(carId, slot).paint).toLowerCase(); return validPaint(v) ? v : 'match'; };
// the prop that is worn: the chosen one if owned (?<slot>prop= is the visit's own), else Stock
export const shownProp = (slot, carId = null) => {
  const id = propChoice(slot, carId);
  return id === 'none' || asked(slot, 'prop') === id || ownsCosmetic(slot, id) ? id : 'none';
};
const live = new Set(); // WeakRefs to the models dressed
const listeners = new Set();
const refresh = () => {
  for (const ref of live) { const model = ref.deref(); if (model) apply(model); else live.delete(ref); }
  for (const fn of listeners) fn();
};
Store.onStore(({ slot }) => { if (slot === null || SLOTS.includes(slot)) refresh(); });
// target: a car id (that car's own) or null / none (the default: every car without its own)
export const setProp = (slot, id, target = null) => {
  if (!SLOTS.includes(slot) || !validProp(slot, id) || (id !== 'none' && !ownsCosmetic(slot, id))) return false;
  Store.setSlot(target, slot, { id }); return true;
};
export const setPropPaint = (slot, value, target = null) => {
  const v = String(value).toLowerCase().replace(/^#|^0x/, '');
  if (!SLOTS.includes(slot) || !validPaint(v)) return false;
  Store.setSlot(target, slot, { paint: v }); return true;
};
export const resetProp = (slot, target = null) => { if (SLOTS.includes(slot)) Store.setSlot(target, slot, { id: 'none', paint: 'match' }); };
export const onProp = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// can this car wear this slot? { ok, why }: why = '' (no table entry at all) or the table's own short reason; a Legendary car keeps its own look
export const slotStatus = (car, slot) => {
  if (!car) return { ok: false, why: '' };
  if (car.legend) return { ok: false, why: 'Legendary cars keep their own look', legend: true };
  const s = propSlots(car.id)[slot];
  if (!s || !s.supported) return { ok: false, why: s && s.reason && s.reason !== 'no entry' ? s.reason : '' };
  return { ok: true, why: '' };
};

// ---- dressing a model ----
const blackedOut = (model) => { const m = model.userData.body?.material; return !!m && (m === SILHOUETTE || (m.isMeshBasicMaterial && m.color.getHex() < 0x0a0a0e)); };
const paintFor = (model, info, value) => {
  const p = propPaint(0xcccccc);
  p.userData.ownPaint = true;
  if (value === 'match') {
    const m = info.bodyMat;
    if (m && m.color) p.color = m.color; // (the body's own Color object: the prop follows the car's paint, Good / Evil and liveries. The body's MATERIAL is not shared: many bodies use vertex colours, which a prop's plain geometry has none of)
  } else p.color.setHex(parseInt(value, 16));
  return p;
};
const remove = (group) => {
  group.removeFromParent();
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isMesh && o.material?.userData.ownPaint) o.material.dispose();
  });
};
// where the prop is parented: the body's own group where the model keeps its body in one that moves (the number plate's rule), else the model
const attach = (model, group) => {
  const parent = model.userData.body?.parent;
  if (parent && parent !== model && !parent.userData.animate && !parent.userData.body) {
    model.updateMatrixWorld(true);
    group.updateMatrix();
    const toParent = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(parent.matrixWorld).invert().multiply(group.matrix);
    toParent.decompose(group.position, group.quaternion, group.scale);
    parent.add(group);
  } else model.add(group);
};
const apply = (model) => {
  const info = model.userData.propPlan;
  if (!info) return;
  let changed = false;
  const dark = blackedOut(model);
  for (const slot of SLOTS) {
    const id = info.status === 'ok' ? shownProp(slot, info.carId) : 'none';
    const prop = id !== 'none' ? propById(id) : null;
    const fit = prop ? fitProp(info.carId, slot, prop.shape) : null;
    const paintValue = propPaintChoice(slot, info.carId);
    let group = info.groups[slot];
    if (group && (!fit || group.userData.propId !== id || group.userData.paintValue !== paintValue)) { remove(group); group = info.groups[slot] = null; changed = true; }
    if (fit && !group) {
      group = buildProp(id, paintFor(model, info, paintValue));
      group.userData.paintValue = paintValue;
      group.userData.propCosmetic = slot;
      group.position.set(...fit.position);
      group.rotation.y = fit.rotationY * Math.PI / 180;
      group.scale.setScalar(fit.scale);
      attach(model, group);
      info.groups[slot] = group;
      changed = true;
    }
    if (group && dark) group.traverse((o) => { if (o.isMesh) o.material = SILHOUETTE; });
    // the car's own props of this slot: hidden under a worn prop, shown on Stock
    for (const { mesh, slot: s } of existingProps(model)) if (s === slot) mesh.visible = !group;
  }
  info.worn = SLOTS.filter(s => info.groups[s]);
  if (changed) forgetDents(model);
};
export const propPlan = (model) => model?.userData.propPlan || null;
export const dressProps = (model, car) => {
  if (!model || model.userData.propPlan) return model;
  model.userData.propPlan = { carId: car ? car.id : null, status: !car ? 'none' : car.legend ? 'legend' : 'ok', groups: { roof: null, cargo: null, wing: null }, worn: [], bodyMat: model.userData.body?.material || null };
  live.add(new WeakRef(model));
  apply(model);
  return model;
};
