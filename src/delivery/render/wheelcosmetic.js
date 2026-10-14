// ---- the WHEEL colour: the first equippable cosmetic (the owner, 14-Oct: "Wheels first, and global"; CHECKLIST 260) ------------
// One choice for the whole game, not a loadout per car: the colour of the HUBS (rims, hub caps, spokes) of whatever car is on
// show or driven. Tyres stay rubber-black. RENDER-ONLY: nothing here is written onto a car's CARS entry, into a save's
// data or into the replay fingerprint (no rules module imports it); the choice is kept in this browser's localStorage under
// KEY (not the cookie: that has little room), reads and writes wrapped in try/catch (no storage: it holds for the visit), and
// is ignored on a visit with test switches (Progress.noSave: stock wheels, and a change lasts the visit only).
// API: dressWheels(model, car)  called where a car's model is built (render/showcar.js makeShowCar, render/items.js
//        playerModel): finds the model's hubs (once, as built) and puts the chosen colour on them; returns the model
//      WHEEL_COLOURS, wheelColour(), setWheelColour(id)  the list ({ id, name, hex }; Stock = hex null), the choice, change it
//      onWheelColour(fn)  fn(id) is called after a change (the menu's swatches); every dressed model still alive is recoloured
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

let stored = null, visit = null; // the saved id (read the first time it is wanted); the id chosen in a visit that saves nothing
export const wheelColour = () => {
  if (Progress.noSave) return visit || 'stock'; // (a test switch is on, set after this module loads: stock wheels, and a change lasts the visit)
  if (stored === null) {
    stored = 'stock';
    try { stored = byId(localStorage.getItem(KEY)).id; } catch { /* (no storage: stock) */ }
  }
  return stored;
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
  model.traverse((node) => { if (node.isMesh && node.geometry && !node.isInstancedMesh && node.visible) meshes.push({ node, box: boxIn(node) }); });
  const all = new THREE.Box3();
  for (const m of meshes) all.union(m.box);
  const ground = all.min.y;
  const tyres = meshes.filter((m) => {
    const size = m.box.getSize(v1), across = Math.min(size.x, size.z), along = Math.max(size.x, size.z);
    return !m.node.geometry.type.startsWith('Box') && size.y > 0.1 && m.box.min.y - ground < NEAR && Math.abs(along - size.y) < 0.15 * size.y && across < 0.85 * size.y;
  });
  const isTyre = new Set(tyres.map(t => t.node)), hubs = [], taken = new Set();
  for (const tyre of tyres) {
    const size = tyre.box.getSize(new THREE.Vector3()), centre = tyre.box.getCenter(new THREE.Vector3());
    const axleX = size.x < size.z, r = size.y / 2, half = (axleX ? size.x : size.z) / 2, tread = colourOf(tyre.node);
    for (const m of meshes) {
      if (isTyre.has(m.node) || taken.has(m.node)) continue;
      const s = m.box.getSize(new THREE.Vector3()), c = m.box.getCenter(new THREE.Vector3()).sub(centre);
      const axial = axleX ? c.x : c.z, other = axleX ? c.z : c.x, sAxial = axleX ? s.x : s.z, sOther = axleX ? s.z : s.x;
      if (Math.abs(c.y) > 0.1 * r || Math.abs(other) > 0.1 * r) continue;      // (on the axle)
      if (Math.abs(axial) > half * 1.6 || sAxial > half * 3.2) continue;          // (about the tyre's width: a hub may stand a little proud)
      if (Math.max(s.y, sOther) > r * 1.94) continue;                              // (no wider across than the tread)
      if (colourOf(m.node) === tread) continue;                                    // (tread blocks and sidewall rings: the tyre's own black)
      taken.add(m.node);
      hubs.push({ mesh: m.node, tyre: tyre.node });
    }
  }
  return { tyres: tyres.map(t => t.node), hubs };
};

// ---- putting a colour on them --------------------------------------------------------------------------------------
const live = new Set(); // WeakRefs to the models dressed (a car on show comes and goes; one still alive is recoloured on a change)
const listeners = new Set();

// the model's clone of a stock material (one per material, so parts that shared one still do), the colour set; not
// `shared`, so clearGroup disposes it with the model
const cloneFor = (model, stock) => {
  const clones = model.userData.wheelClones || (model.userData.wheelClones = new Map());
  let clone = clones.get(stock);
  if (!clone) {
    clone = stock.clone();
    if (clone.userData) { delete clone.userData.shared; clone.userData.wheelHub = true; } // (wheelHub: render/dents.js does not take it for glass)
    clones.set(stock, clone);
  }
  return clone;
};

const paint = (model, hex) => {
  const found = model.userData.wheelHubs;
  if (!found) return;
  for (const hub of found.hubs) {
    const mesh = hub.mesh, ghost = !!mesh.userData.solidMat, current = ghost ? mesh.userData.solidMat : mesh.material;
    if (Array.isArray(current) || !current) continue;
    const stock = hub.stock;
    if (current !== stock && current !== model.userData.wheelClones?.get(stock)) continue; // (a silhouette or something else stands in: left)
    const next = hex === null ? stock : cloneFor(model, stock);
    if (hex !== null) next.color.setHex(hex);
    if (ghost) mesh.userData.solidMat = next; else mesh.material = next;
  }
};

// how a model's hubs are shown now: its colour, or none (the stock)
const dressed = (model) => paint(model, byId(wheelColour()).hex);

export const dressWheels = (model, car) => {
  if (!model || model.userData.wheelHubs) return model;
  if (car && car.legend) { model.userData.wheelHubs = { tyres: [], hubs: [] }; return model; } // (Legendary: black and gold, as designed)
  let found;
  try { found = findHubs(model); } catch { found = { tyres: [], hubs: [] }; }
  // only plain single-colour materials can be tinted: a textured, vertex-coloured or multi-material hub stays as it is
  found.hubs = found.hubs.filter(({ mesh }) => { const m = mesh.material; return m && !Array.isArray(m) && m.color && !m.map && !m.vertexColors; });
  for (const hub of found.hubs) hub.stock = hub.mesh.material;
  model.userData.wheelHubs = found;
  live.add(new WeakRef(model));
  if (byId(wheelColour()).hex !== null) dressed(model);
  return model;
};

export const setWheelColour = (id) => {
  const colour = byId(id);
  if (Progress.noSave) visit = colour.id;
  else { stored = colour.id; try { localStorage.setItem(KEY, colour.id); } catch { /* (no storage: for this visit) */ } }
  for (const ref of live) { const model = ref.deref(); if (model) dressed(model); else live.delete(ref); }
  for (const fn of listeners) fn(colour.id);
};
export const onWheelColour = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
