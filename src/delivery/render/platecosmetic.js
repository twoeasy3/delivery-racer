// ---- the NUMBER PLATE cosmetic (the owner, 14-Oct: "Mark all existing number plates ... toggle the existing plate OFF when we equip one", then
// plate DESIGNS as unlockable items and the TEXT written by the player; CHECKLIST 279, 285). Two pieces, both RENDER-ONLY like
// render/wheelcosmetic.js: nothing is written onto a car's entry, a save, the cookie or the replay fingerprint (no rules module imports
// this file), the choice lives in this browser's localStorage only.
//
// 1. THE EXISTING PLATES. Every plate a model already has is tagged where it is built (mesh.userData.plate = 'front' | 'rear'; the audit:
//    src/delivery/AUDIT-plates-14-Oct.md, plates-audit.json). setExistingPlatesVisible(model, v) shows or hides them (`visible`: the mesh
//    stays in the tree, so part ids and dents see the model unchanged).
// 2. THE EQUIPPED PLATE. A design (render/platedesigns.js: colours, border, stripe; `stock` = keep the car's own plates) wearing the
//    player's text. When one is equipped, dressPlates(model, car) puts a thin plate on each END the car's anchor table gives it
//    (render/plateanchors.js: both ends where both have a place, else the one that has; a craft, a bike, an open-wheeler gets none) and
//    hides the car's own plate on those ends. LEGENDARY cars keep their own gold plates: nothing is added, nothing hidden. Stock puts
//    everything back. A plate is two meshes: a dark slab (the plate's edge) and a flat face with the drawn texture 1.5 mm in front of it,
//    standing 4.5 mm off the surface (so it cannot z-fight), a child of the model (it rides the suspension, and dents.js bends it as a panel
//    with the paint under it: `forgetDents` makes dents.js measure the model again with the plate on). Real size everywhere: nothing is
//    enlarged for play. The Ghost power-up and a blackout treat it as any mesh (a blacked-out model's new plate is made black too).
//    TEXTURES: one 256 x 64 canvas (64 KB, 85 KB with mipmaps) per distinct (design, text) pair, cached, shared by every car and both
//    ends (the material and the texture are flagged `shared`); only the equipped pair and the one before it are kept.
//    Geometry: the face is 2 triangles, the slab 12 (one pair per plate size, shared).
// STORAGE: delivery.platedesign and delivery.platetext (localStorage, try/catch; ignored and not written with Progress.noSave, i.e. test
// switches); ?platedesign=<id> and ?platetext=<text> for one visit (stills; never saved, the text is filtered the same). A saved design the
// player does not own wears Stock. Designs are registered as plate:<id> cosmetics (render/cosmetics.js; some free, the rest locked until
// owned; "Unlock everything: Absolutely" grants them). SHOP HOOK: each design carries a `price` (a placeholder, nothing reads it yet).
// API: dressPlates(model, car)                 where a car's model is built (render/showcar.js, render/items.js playerModel, beside dressWheels)
//      PLATE_DESIGNS, plateDesign(), shownDesign(), setPlateDesign(id) -> bool (false: unknown or not owned)
//      plateText(), setPlateText(raw) -> { ok, text, reason }   the filter (platetext.js); a refused text becomes the default text
//      resetPlate()   design Stock, text default       onPlate(fn)  fn() after any change (every dressed model alive follows at once)
//      platePlan(model) -> { status, ends, ... }  what a model got        plateTexture(design, text) -> { texture, material }  (for a check / the chips)
//      the existing-plates toggle: dressPlates' siblings below, kept as they were: existingPlates, setExistingPlatesVisible, platesEquipped,
//      setPlatesEquipped(on) (hides every tagged plate of every dressed model, Legendary included: the raw switch of 279), onPlatesEquipped
// Traffic is not dressed (it never wears the player's cosmetics): other drivers keep their plates. ?plates=none hides the existing plates
// for a visit (stills).
import * as THREE from 'three';
import { Progress } from '../progress.js';
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import { PLATE_DESIGNS, designById, drawPlate, W, H } from './platedesigns.js';
import { plateAnchorsFor } from './plateanchors.js';
import { DEFAULT_TEXT, checkPlateText } from './platetext.js';
import { forgetDents } from './dents.js';
import { SILHOUETTE } from './silhouette.js';

export { PLATE_DESIGNS, designById, DEFAULT_TEXT };
export const KEY_DESIGN = 'delivery.platedesign', KEY_TEXT = 'delivery.platetext';
export const SLAB = 0.006, STAND = 0.0045, MARGIN = 0.014; // m: the dark edge's depth (half in the body), how far the face stands off the surface, the edge's margin round the face
const asked = typeof location !== 'undefined' ? /[?&]plates=(\w+)/.exec(location.search)?.[1] : null;
const askedDesign = typeof location !== 'undefined' ? /[?&]platedesign=(\w+)/.exec(location.search)?.[1] : null;
const askedText = typeof location !== 'undefined' ? /[?&]platetext=([^&#]*)/.exec(location.search)?.[1] : null;

// ---- the registry: every design is a cosmetic of the 'plate' slot (free ones for everyone, the rest owned when unlocked) ----
registerCosmetics(PLATE_DESIGNS.map(d => ({ slot: 'plate', id: d.id, name: d.name, free: d.free, price: d.price })));

// ---- the existing plates (279) ----
let equipped = false;
const live = new Set(); // WeakRefs to the models dressed (a car on show comes and goes; one still alive follows a change)
const listeners = new Set();
export const platesEquipped = () => equipped || asked === 'none';
export const existingPlates = (model) => {
  const found = [];
  model.traverse((node) => { if (node.isMesh && node.userData.plate) found.push({ mesh: node, face: node.userData.plate }); });
  return found;
};
export const setExistingPlatesVisible = (model, visible) => {
  const plates = existingPlates(model);
  for (const { mesh } of plates) mesh.visible = !!visible;
  return plates.length;
};

// ---- the choice ----
let storedDesign = null, storedText = null, visitDesign = null, visitText = null; // the saved values (read the first time they are wanted); what a visit that saves nothing chose
export const plateDesign = () => {
  if (askedDesign) return designById(askedDesign).id;
  if (Progress.noSave) return visitDesign || 'stock';
  if (storedDesign === null) { storedDesign = 'stock'; try { storedDesign = designById(localStorage.getItem(KEY_DESIGN)).id; } catch { /* (no storage: stock) */ } }
  return storedDesign;
};
// the design that is worn: the chosen one if it is owned (a saved choice that is not owned wears Stock; ?platedesign= is the visit's own)
export const shownDesign = () => {
  const id = plateDesign();
  return askedDesign || ownsCosmetic('plate', id) ? id : 'stock';
};
export const plateText = () => {
  if (askedText != null) { let raw = askedText; try { raw = decodeURIComponent(askedText); } catch { /* (as typed) */ } return checkPlateText(raw.replace(/\+/g, ' ')).text; }
  if (Progress.noSave) return visitText || DEFAULT_TEXT;
  if (storedText === null) { storedText = DEFAULT_TEXT; try { const raw = localStorage.getItem(KEY_TEXT); if (raw) storedText = checkPlateText(raw).text; } catch { /* (no storage: the default) */ } }
  return storedText;
};
const refresh = () => {
  for (const ref of live) { const model = ref.deref(); if (model) apply(model); else live.delete(ref); }
  prune();
  for (const fn of listeners) fn();
};
export const setPlateDesign = (id) => {
  const design = PLATE_DESIGNS.find(d => d.id === id);
  if (!design || !ownsCosmetic('plate', design.id)) return false;
  if (Progress.noSave) visitDesign = design.id;
  else { storedDesign = design.id; try { localStorage.setItem(KEY_DESIGN, design.id); } catch { /* (no storage: for this visit) */ } }
  refresh();
  return true;
};
// the player's text, through the filter: { ok, text, reason } (text = what is worn: the cleaned text, or the default if it was empty or refused)
export const setPlateText = (raw) => {
  const result = checkPlateText(raw);
  if (Progress.noSave) visitText = result.text;
  else { storedText = result.text; try { localStorage.setItem(KEY_TEXT, result.text); } catch { /* (no storage: for this visit) */ } }
  refresh();
  return result;
};
export const resetPlate = () => {
  if (Progress.noSave) { visitDesign = 'stock'; visitText = DEFAULT_TEXT; }
  else { storedDesign = 'stock'; storedText = DEFAULT_TEXT; try { localStorage.removeItem(KEY_DESIGN); localStorage.removeItem(KEY_TEXT); } catch { /* (no storage) */ } }
  refresh();
};
export const onPlate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// ---- the textures: one per (design, text), cached, shared by every plate ----
const cache = new Map(); // 'design|text' -> { texture, material }; the newest last
export const plateTexture = (design, text) => {
  const key = design + '|' + text;
  let hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; } // (most recent last)
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  drawPlate(canvas.getContext('2d'), designById(design), text);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData.shared = true;
  const material = new THREE.MeshLambertMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.2 }); // (a little self-lit so the characters read in shade)
  material.userData.shared = true;
  cache.set(key, hit = { texture, material, key });
  return hit;
};
// only the plate worn and the one before it are kept (typing makes a new pair at every letter)
const prune = () => {
  const keep = new Set([shownDesign() + '|' + plateText()]);
  const keys = [...cache.keys()];
  for (const k of keys.slice(0, Math.max(0, keys.length - 2))) if (!keep.has(k)) { const hit = cache.get(k); hit.texture.dispose(); hit.material.dispose(); cache.delete(k); }
};
export const plateCacheStats = () => ({ textures: cache.size, bytes: cache.size * W * H * 4, bytesWithMips: Math.round(cache.size * W * H * 4 * 4 / 3), keys: [...cache.keys()] });

// ---- the plate meshes: shared geometry per (end, width) ----
const geos = new Map();
const geoFor = (end, w) => {
  const key = end + w;
  if (!geos.has(key)) {
    const h = w / (W / H), s = end === 'rear' ? -1 : 1;
    const face = new THREE.PlaneGeometry(w, h), slab = new THREE.BoxGeometry(w + MARGIN, h + MARGIN, SLAB);
    if (end === 'rear') face.rotateY(Math.PI);
    face.translate(0, 0, s * STAND);
    face.userData.shared = true; slab.userData.shared = true;
    geos.set(key, { face, slab });
  }
  return geos.get(key);
};
const slabMaterials = new Map();
const slabMaterial = (hex) => {
  if (!slabMaterials.has(hex)) { const m = new THREE.MeshLambertMaterial({ color: hex }); m.userData.shared = true; slabMaterials.set(hex, m); }
  return slabMaterials.get(hex);
};
const blackedOut = (model) => { const m = model.userData.body?.material; return !!m && (m === SILHOUETTE || (m.isMeshBasicMaterial && m.color.getHex() < 0x0a0a0e)); };

const buildEnd = (model, end, anchor) => {
  const group = new THREE.Group();
  const { face, slab } = geoFor(end, anchor.size[0]);
  const edge = new THREE.Mesh(slab, slabMaterial(0x202226)), front = new THREE.Mesh(face, slabMaterial(0x202226));
  group.userData.platecosmetic = end;
  edge.userData.platecosmetic = front.userData.platecosmetic = end;
  front.userData.plateFace = true;
  group.add(edge, front);
  group.position.set(0, anchor.at[1], anchor.at[2]);
  group.rotation.x = anchor.pitch * Math.PI / 180;
  group.name = 'numberplate-' + end;
  model.add(group);
  return group;
};

// ---- dressing a model ----
const planOf = (model) => model.userData.platePlan;
export const platePlan = (model) => planOf(model) || null;
// the model in its current state: plates on its ends (or none), the car's own plates shown or hidden to match
const apply = (model) => {
  const info = model.userData.platePlan;
  if (!info) return;
  const design = shownDesign(), want = design !== 'stock' && info.status === 'ok' ? info.ends : [];
  const text = plateText();
  let changed = false;
  // ends that have a plate group and should not, and the other way
  for (const end of ['rear', 'front']) {
    const have = info.groups[end];
    if (have && !want.includes(end)) { have.removeFromParent(); info.groups[end] = null; changed = true; }
    else if (!have && want.includes(end)) { info.groups[end] = buildEnd(model, end, info[end]); changed = true; }
  }
  if (want.length) {
    const hit = plateTexture(design, text), dark = blackedOut(model);
    info.key = hit.key;
    for (const end of want) {
      const group = info.groups[end], d = designById(design);
      group.traverse((node) => {
        if (!node.isMesh) return;
        const m = node.userData.plateFace ? (dark ? SILHOUETTE : hit.material) : (dark ? SILHOUETTE : slabMaterial(parseInt(d.edge.slice(1), 16)));
        if (node.userData.solidMat) node.userData.solidMat = m; else node.material = m; // (a ghost's stand-in stays on; the plate under it changes)
      });
    }
  } else info.key = null;
  info.worn = want.slice();
  // the car's own plates: hidden on the ends we cover (all of them for the raw switch), shown otherwise
  const all = platesEquipped();
  for (const { mesh, face } of existingPlates(model)) mesh.visible = !(all || want.includes(face));
  if (changed) forgetDents(model);
};

export const dressPlates = (model, car) => {
  if (!model || model.userData.platePlan) return model;
  const plan = car ? plateAnchorsFor(car) : { status: 'none', ends: [] };
  model.userData.platePlan = { ...plan, groups: { rear: null, front: null }, worn: [], key: null };
  live.add(new WeakRef(model));
  apply(model);
  return model;
};

// the raw switch of 279: every tagged plate of every dressed model hidden / shown (Legendary included); the design cosmetic does not use it
export const setPlatesEquipped = (on) => {
  equipped = !!on;
  for (const ref of live) { const model = ref.deref(); if (model) apply(model); else live.delete(ref); }
  for (const fn of onEquipped) fn(platesEquipped());
};
const onEquipped = new Set();
export const onPlatesEquipped = (fn) => { onEquipped.add(fn); return () => onEquipped.delete(fn); };
