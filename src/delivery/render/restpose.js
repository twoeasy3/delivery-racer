// ---- A MODEL'S REST POSE, for the cosmetics (the owner, 17-Oct: "The lowrider and super lowrider are really glitched with customisation"; CHECKLIST 444).
// Some models move parts of themselves every frame (the Lowrider's hydraulics lift its chassis and its front axle; the showroom's
// suspension holds the wheels on the floor while the body bounces; doors, sways). A cosmetic put on such a model LATER (picked on the
// Cosmetics screen while the car is turning and hopping) must be measured against the model as it was BUILT, at rest, and then parented
// to the part it rides with; measuring it in the current, animated pose baked that pose in (tread rings twice the tyre's size, plates and
// props off their anchors by the hop). recordRest(model) keeps every node's own (local) matrix as built; atRest(model, fn) puts them back
// for the length of fn (a measurement), then restores the animated pose exactly. Render-only.
const REST = new WeakMap(); // model -> Map(node -> its local matrix as built)

// where the model is built (render/showcar.js dressCosmetics, before anything animates it): every node's local matrix
export const recordRest = (model) => {
  if (!model || REST.has(model)) return model;
  const map = new Map();
  model.traverse((n) => { if (n !== model) { n.updateMatrix(); map.set(n, n.matrix.clone()); } });
  REST.set(model, map);
  return model;
};
export const hasRest = (model) => REST.has(model);
// fn() with the model's nodes in their rest pose (nodes added since, the cosmetics themselves, are left as they are: they ride on their
// parents); the pose is put back after, however fn ends. Nested calls are fine. Returns fn's value.
export const atRest = (model, fn) => {
  const map = model && REST.get(model);
  if (!map) return fn();
  const saved = [];
  for (const [n, m] of map) {
    if (!n.parent) continue; // (a node since removed)
    saved.push([n, n.matrix.clone(), n.matrixAutoUpdate]);
    n.matrix.copy(m); n.matrixAutoUpdate = false;
  }
  model.updateMatrixWorld(true);
  try { return fn(); } finally {
    for (const [n, m, auto] of saved) { n.matrix.copy(m); n.matrixAutoUpdate = auto; }
    model.updateMatrixWorld(true);
  }
};
