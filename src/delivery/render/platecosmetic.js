// ---- the NUMBER PLATE cosmetic's first piece: hiding the plates a model already has (CHECKLIST 279; the owner, 14-Oct: "Mark all
// existing number plates on the file and toggle the existing plate OFF when we equip one"). No plate item exists yet: nothing here
// draws a plate, keeps a choice or reaches the player; `platesEquipped` is false today, so every car looks as it always did.
// The existing plates are tagged where the models are built: a plate's mesh carries userData.plate = 'front' | 'rear' (src/delivery
// /AUDIT-plates-14-Oct.md and plates-audit.json list them: 25 models, 32 plates; the learner's L board is three meshes, all tagged).
// When a plate is equipped, the real cosmetic will call setPlatesEquipped(true): every tagged plate of every model dressed here is
// hidden (`visible = false`: the mesh stays in the tree, so part ids, dents and the model patches see the model unchanged), and shown
// again on Stock / unequip. RENDER-ONLY like render/wheelcosmetic.js: nothing is written onto a car's entry, a save or the replay
// fingerprint (no rules module imports this file), and nothing is stored: the state is the cosmetic's to keep.
// API: dressPlates(model, car)            called where a car's model is built (render/showcar.js makeShowCar, render/items.js
//                                        playerModel, beside dressWheels): remembers the model and applies the current state; returns it
//      setExistingPlatesVisible(model, v) show / hide every tagged plate of that model; returns how many meshes it set
//      existingPlates(model)              the tagged meshes: [{ mesh, face }]
//      platesEquipped(), setPlatesEquipped(on)   the state, and a change of it (every dressed model still alive follows at once)
//      onPlatesEquipped(fn)               fn(on) after a change
// Traffic is not dressed (it never wears the player's cosmetics): other drivers keep their plates. ?plates=none hides the existing
// plates for a visit (for stills; nothing is saved).
const asked = typeof location !== 'undefined' ? /[?&]plates=(\w+)/.exec(location.search)?.[1] : null;

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

export const dressPlates = (model) => {
  live.add(new WeakRef(model));
  if (platesEquipped()) setExistingPlatesVisible(model, false);
  return model;
};

export const setPlatesEquipped = (on) => {
  equipped = !!on;
  const show = !platesEquipped();
  for (const ref of live) { const model = ref.deref(); if (model) setExistingPlatesVisible(model, show); else live.delete(ref); }
  for (const fn of listeners) fn(platesEquipped());
};
export const onPlatesEquipped = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
