// ---- the EXISTING PROPS of a car's model, and the toggle that hides them (the owner, 15-Oct: "If a car already has props like this, tag
// the geometry to remove them when a prop is chosen"; CHECKLIST 300). RENDER-ONLY like render/platecosmetic.js: nothing is written onto a
// car's entry, a save, the cookie or the replay fingerprint (no rules module imports this file).
// A model's own roof rack, roof box, light bar, beacon, roof sign, aerial ornament (slot 'roof'), decorative load in a bed, crates,
// barrels, a boat in the bed (slot 'cargo'), spoiler, wing, rear fin that is a wing (slot 'wing') is TAGGED where it is built:
// mesh.userData.prop = 'roof' | 'cargo' | 'wing'. Hiding is `visible = false` (the mesh stays in the tree, so part ids, dents, the ghost
// stand-in and a blackout see the model unchanged, as the plate tags do). The future cosmetic hides a slot's props when the player
// picks a prop for that slot (render/propanchors.js gives the bounds it may fill) and shows them again on Stock.
// API: existingProps(model) -> [{ mesh, slot }]    hideProps(model, slot?) -> how many hidden (no slot: all three)    showProps(model, slot?)   (an EQUIPPED prop, render/propdress.js, carries userData.propId too and is not counted as the car's own)
export const PROP_SLOTS = ['roof', 'cargo', 'wing'];
export const existingProps = (model) => {
  const found = [];
  model.traverse((node) => { if (node.isMesh && node.userData.prop && !node.userData.propId) found.push({ mesh: node, slot: node.userData.prop }); });
  return found;
};
export const hideProps = (model, slot = null) => {
  let n = 0;
  for (const { mesh, slot: s } of existingProps(model)) if (!slot || s === slot) { mesh.visible = false; n++; }
  return n;
};
export const showProps = (model, slot = null) => {
  let n = 0;
  for (const { mesh, slot: s } of existingProps(model)) if (!slot || s === slot) { mesh.visible = true; n++; }
  return n;
};
