// ---- the NUMBER PLATE cosmetic (the owner, 14-Oct: "Mark all existing number plates ... toggle the existing plate OFF when we equip one", then
// plate DESIGNS as unlockable items and the TEXT written by the player; CHECKLIST 279, 286). Two pieces, both RENDER-ONLY like
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
//    Geometry: the face is 2 triangles, the slab 12 (one pair per plate size, shared); a SHAPED design (platedesigns2.js pieces: CHECKLIST
//    432) is its outline's polygons instead, still inside the anchor's 4:1 box (one pair per size and outline, shared).
// STORAGE: PER CAR over a default (15-Oct): the loadout store's plate slot (render/loadoutstore.js: one localStorage key, try/catch; ignored
// and not written with Progress.noSave, i.e. test switches); delivery.platedesign and delivery.platetext are the old global keys, read once
// as the default and kept in step with it. ?platedesign=<id> and ?platetext=<text> for one visit, every car (stills; never saved, the text
// is filtered the same). A saved design the
// player does not own wears Stock. Designs are registered as plate:<id> cosmetics (render/cosmetics.js; some free, the rest locked until
// owned; "Unlock everything: Absolutely" grants them). SHOP HOOK: each design carries a `price` (a placeholder, nothing reads it yet).
// API: dressPlates(model, car)                 where a car's model is built (render/showcar.js, render/items.js playerModel, beside dressWheels)
//      PLATE_DESIGNS, plateDesign(carId), shownDesign(carId), setPlateDesign(id, target) -> bool (false: unknown or not owned)
//      plateText(carId), setPlateText(raw, target) -> { ok, text, reason }   the filter (platetext.js); a refused text becomes the default text
//      resetPlate(target)   design Stock, text default       onPlate(fn)  fn() after any change (every dressed model alive follows at once)
//      (carId: whose plate, none = the default; target: a car id = that car's own, null / none = the default, every car without its own)
//      platePlan(model) -> { status, ends, ... }  what a model got        plateTexture(design, text) -> { texture, material }  (for a check / the chips)
//      the existing-plates toggle: dressPlates' siblings below, kept as they were: existingPlates, setExistingPlatesVisible, platesEquipped,
//      setPlatesEquipped(on) (hides every tagged plate of every dressed model, Legendary included: the raw switch of 279), onPlatesEquipped
// Traffic is not dressed (it never wears the player's cosmetics): other drivers keep their plates. ?plates=none hides the existing plates
// for a visit (stills).
import * as THREE from 'three';
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import { PLATE_DESIGNS, designById, drawPlate, piecesOf, W, H } from './platedesigns.js';
import { plateAnchorsFor } from './plateanchors.js';
import { DEFAULT_TEXT, checkPlateText } from './platetext.js';
import { forgetDents } from './dents.js';
import { SILHOUETTE } from './silhouette.js';
import * as Store from './loadoutstore.js'; // (the choice: per car over a default)

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

// ---- the choice: the loadout store's plate slot { design, text } (render/loadoutstore.js), the car's own over the default ----
// every reader takes a car id (none / null: the default); every setter a target (a car id: that car's own; null / none: the default)
export const plateDesign = (carId = null) => {
  if (askedDesign) return designById(askedDesign).id;
  return designById(Store.get(carId, 'plate').design).id;
};
// the design that is worn: the chosen one if it is owned (a saved choice that is not owned wears Stock; ?platedesign= is the visit's own)
export const shownDesign = (carId = null) => {
  const id = plateDesign(carId);
  return askedDesign || ownsCosmetic('plate', id) ? id : 'stock';
};
const checked = new Map(); // (a stored text through the filter, once each)
const filtered = (raw) => { if (!checked.has(raw)) { if (checked.size > 50) checked.clear(); checked.set(raw, checkPlateText(raw).text); } return checked.get(raw); };
// the text being typed (render/cosmeticsui.js): worn at once, saved only when confirmed. Its target: a car (that car only) or null (the
// default: every car without a plate of its own)
let preview = null;
const previewed = (carId) => preview && (preview.target === null ? !Store.hasOwn(carId, 'plate') : preview.target === carId);
export const plateText = (carId = null) => {
  if (previewed(carId)) return preview.text;
  if (askedText != null) { let raw = askedText; try { raw = decodeURIComponent(askedText); } catch { /* (as typed) */ } return checkPlateText(raw.replace(/\+/g, ' ')).text; }
  const raw = Store.get(carId, 'plate').text;
  return raw ? filtered(raw) : DEFAULT_TEXT;
};
const refresh = () => {
  for (const ref of live) { const model = ref.deref(); if (model) apply(model); else live.delete(ref); }
  prune();
  for (const fn of listeners) fn();
};
Store.onStore(({ slot }) => { if (slot === null || slot === 'plate') refresh(); });
export const setPlateDesign = (id, target = null) => {
  const design = PLATE_DESIGNS.find(d => d.id === id);
  if (!design || !ownsCosmetic('plate', design.id)) return false;
  Store.setSlot(target, 'plate', { design: design.id });
  return true;
};
// the player's text, through the filter: { ok, text, reason } (text = what is worn: the cleaned text, or the default if it was empty or refused)
export const setPlateText = (raw, target = null) => {
  const result = checkPlateText(raw);
  preview = null;
  Store.setSlot(target, 'plate', { text: result.text });
  return result;
};
// the text as it is typed: worn live (the target's cars), checked by the filter, NOT saved; setPlateText(raw) saves it, previewPlateText(null) drops it
export const previewPlateText = (raw, target = null) => {
  preview = raw == null ? null : { ...checkPlateText(raw), target: target == null ? null : String(target) };
  refresh();
  return preview;
};
export const resetPlate = (target = null) => {
  preview = null;
  Store.setSlot(target, 'plate', { design: 'stock', text: null });
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
// only the plates worn (every live car's: they may differ car to car) and the one before are kept (typing makes a new pair at every letter)
const prune = () => {
  const keep = new Set([shownDesign() + '|' + plateText()]);
  for (const ref of live) { const key = ref.deref()?.userData.platePlan?.key; if (key) keep.add(key); }
  const keys = [...cache.keys()];
  for (const k of keys.slice(0, Math.max(0, keys.length - 2))) if (!keep.has(k)) { const hit = cache.get(k); hit.texture.dispose(); hit.material.dispose(); cache.delete(k); }
};
export const plateCacheStats = () => ({ textures: cache.size, bytes: cache.size * W * H * 4, bytesWithMips: Math.round(cache.size * W * H * 4 * 4 / 3), keys: [...cache.keys()] });

// ---- the plate meshes: shared geometry per (end, width, outline) ----
// A shaped design (platedesigns2.js `pieces`: a pill, a hex, a plate with dice under it...) is a shaped mesh: its face is the outline's
// polygons (a ShapeGeometry, its UVs the canvas's own pixels, so the drawing lands on it), its edge each piece pulled out by the margin and
// given the slab's depth. It never leaves the anchor's 4:1 box. A plain design keeps the 2-triangle face and the 12-triangle box.
const geos = new Map();
const shapeKey = (d) => (d && d.pieces ? d.id : 'rect');
const geoFor = (end, w, d = null) => {
  const pieces = piecesOf(d), key = end + w + '|' + shapeKey(d);
  if (!geos.has(key)) {
    const h = w / (W / H), s = end === 'rear' ? -1 : 1;
    let face, slab;
    if (pieces) {
      const toM = ([x, y]) => new THREE.Vector2((x / W - 0.5) * w, (0.5 - y / H) * h);
      face = new THREE.ShapeGeometry(pieces.map(p => new THREE.Shape(p.pts.map(toM))));
      const pos = face.attributes.position, uv = face.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
      const mx = MARGIN / 2 / w * W, my = MARGIN / 2 / h * H; // (the edge's margin in canvas pixels, each way)
      const grown = pieces.filter(p => p.slab !== false).map((p) => {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = (x1 - x0 + 2 * mx) / (x1 - x0), sy = (y1 - y0 + 2 * my) / (y1 - y0);
        return new THREE.Shape(p.pts.map(([x, y]) => toM([cx + (x - cx) * sx, cy + (y - cy) * sy])));
      });
      slab = new THREE.ExtrudeGeometry(grown, { depth: SLAB, bevelEnabled: false, curveSegments: 1 });
      slab.translate(0, 0, -SLAB / 2);
      if (end === 'rear') slab.rotateY(Math.PI);
    } else { face = new THREE.PlaneGeometry(w, h); slab = new THREE.BoxGeometry(w + MARGIN, h + MARGIN, SLAB); }
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

const buildEnd = (model, end, anchor, d) => {
  const group = new THREE.Group();
  const { face, slab } = geoFor(end, anchor.size[0], d);
  group.userData.plateShape = shapeKey(d);
  const edge = new THREE.Mesh(slab, slabMaterial(0x202226)), front = new THREE.Mesh(face, slabMaterial(0x202226));
  group.userData.platecosmetic = end;
  edge.userData.platecosmetic = front.userData.platecosmetic = end;
  front.userData.plateFace = true;
  group.add(edge, front);
  group.position.set(0, anchor.at[1], anchor.at[2]);
  group.rotation.x = anchor.pitch * Math.PI / 180;
  group.name = 'numberplate-' + end;
  // on the body's own group where the model keeps its body in one that moves (the lowrider's hydraulics, an idle sway): the plate goes
  // where the anchor says AT REST (the anchor is in the model's frame), then rides with the body
  const parent = model.userData.body?.parent;
  if (parent && parent !== model && !parent.userData.animate && !parent.userData.body) { // (a group with an animation of its own is skipped by dents.js: the plate stays on the model then)
    model.updateMatrixWorld(true);
    group.updateMatrix();
    const toParent = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(parent.matrixWorld).invert().multiply(group.matrix);
    toParent.decompose(group.position, group.quaternion, group.scale);
    parent.add(group);
  } else model.add(group);
  return group;
};

// ---- dressing a model ----
const planOf = (model) => model.userData.platePlan;
export const platePlan = (model) => (model && planOf(model)) || null;
// the model in its current state: plates on its ends (or none), the car's own plates shown or hidden to match
const apply = (model) => {
  const info = model.userData.platePlan;
  if (!info) return;
  const design = shownDesign(info.carId), want = design !== 'stock' && info.status === 'ok' ? info.ends : [];
  const text = plateText(info.carId);
  let changed = false;
  // ends that have a plate group and should not, and the other way
  const dWorn = designById(design);
  for (const end of ['rear', 'front']) {
    const have = info.groups[end];
    if (have && (!want.includes(end) || have.userData.plateShape !== shapeKey(dWorn))) { have.removeFromParent(); info.groups[end] = null; changed = true; } // (another outline: built again)
    if (!info.groups[end] && want.includes(end)) { info.groups[end] = buildEnd(model, end, info[end], dWorn); changed = true; }
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
  model.userData.platePlan = { ...plan, carId: car ? car.id : null, groups: { rear: null, front: null }, worn: [], key: null };
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
