// ---- the PROP BOUNDS drawn on a car, for review (CHECKLIST 300; render-only, a debug view: nothing in the game calls it). For a car's
// model it draws the three slots' containment bounds (render/propanchors.js propSlots: the canonical box and cylinder at the car's
// scale, centre and yaw) as translucent coloured wireframes: ROOF blue, CARGO green, WING red; the box in solid lines, the cylinder in
// dashed lines of a lighter tint, each with a faint filled shape; and paints the car's own tagged props (render/propcosmetic.js) magenta
// so they stand out. Used by the scratch page delivery/zpropview.html (untracked) with scripts/shots.mjs.
// API: addPropBounds(model, carId, { slots?, shapes?, highlight? }) -> the group added (a child of the model; removePropBounds takes it off)
import * as THREE from 'three';
import { propSlots, PROP_BOUNDS, SLOTS } from './propanchors.js';
import { existingProps } from './propcosmetic.js';

export const COLOURS = { roof: 0x2f6fff, cargo: 0x22b14c, wing: 0xe8202a };
export const TINTS = { roof: 0x8fb4ff, cargo: 0x8fe0a6, wing: 0xff9aa0 };
const HIGHLIGHT = new THREE.MeshLambertMaterial({ color: 0xff2ad4, emissive: 0x7a0a66 });

const place = (obj, shape) => {
  obj.position.set(shape.centre[0], shape.centre[1], shape.centre[2]);
  obj.rotation.y = shape.yaw * Math.PI / 180;
  obj.scale.setScalar(shape.scale);
};
// the wireframe of one canonical shape of a slot at scale 1, centred on the origin (a group: the faint fill and the edges)
export const boundsWireframe = (slot, shape) => {
  const B = PROP_BOUNDS[slot], g = new THREE.Group();
  if (shape === 'box') {
    const geo = new THREE.BoxGeometry(B.box[0], B.box[1], B.box[2]);
    const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: COLOURS[slot], transparent: true, opacity: 0.14, depthWrite: false }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: COLOURS[slot], transparent: true, opacity: 0.95 }));
    fill.renderOrder = edges.renderOrder = 10;
    g.add(fill, edges);
  } else {
    const c = B.cylinder, geo = new THREE.CylinderGeometry(c.radius, c.radius, c.height, 24, 1);
    if (c.axis === 'x') geo.rotateZ(Math.PI / 2); else if (c.axis === 'z') geo.rotateX(Math.PI / 2);
    const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: TINTS[slot], transparent: true, opacity: 0.12, depthWrite: false }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineDashedMaterial({ color: TINTS[slot], dashSize: 0.05, gapSize: 0.03, transparent: true, opacity: 0.95 }));
    edges.computeLineDistances();
    fill.renderOrder = edges.renderOrder = 10;
    g.add(fill, edges);
  }
  return g;
};
export const addPropBounds = (model, carId, { slots = SLOTS, shapes = ['box', 'cyl'], highlight = true } = {}) => {
  const group = new THREE.Group();
  group.name = 'propbounds';
  const plan = propSlots(carId);
  for (const slot of slots) {
    const s = plan[slot];
    if (!s || !s.supported) continue;
    if (shapes.includes('box')) { const w = boundsWireframe(slot, 'box'); place(w, s.box); group.add(w); }
    if (shapes.includes('cyl')) {
      const w = boundsWireframe(slot, 'cylinder'); place(w, s.cylinder);
      // (a dashed line's dashes are in local units: scale them back so they read the same at every scale)
      w.children[1].material.dashSize = 0.05 / s.cylinder.scale; w.children[1].material.gapSize = 0.03 / s.cylinder.scale;
      group.add(w);
    }
  }
  if (highlight) for (const { mesh } of existingProps(model)) if (!mesh.userData.propId) { mesh.userData.propPaint = mesh.material; mesh.material = HIGHLIGHT; } // (the car's OWN props, not a fitted one)
  model.add(group);
  return group;
};
export const removePropBounds = (model) => {
  const group = model.getObjectByName('propbounds');
  group?.removeFromParent();
  for (const { mesh } of existingProps(model)) if (mesh.userData.propPaint) { mesh.material = mesh.userData.propPaint; delete mesh.userData.propPaint; }
  return group;
};
