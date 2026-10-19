// ---- the PROP MODELS: three roof props, three cargo props, three rear wings (the owner, 15-Oct: "create 3 of each prop"; CHECKLIST 300).
// RENDER-ONLY (no rules module imports this; not in the replay fingerprint). Each prop is BUILT TO ITS SLOT'S CANONICAL BOUNDS
// (render/propanchors.js PROP_BOUNDS) at scale 1, centred on the origin: a 'box' prop fits inside the slot's box [w, h, d] (its base
// on y = -h / 2, the surface it stands on), a 'cylinder' prop inside the slot's cylinder (radius, height, axis). It is then placed on a
// car with fitProp(carId, slot, shape) (position, rotation.y, uniform scale) as a child of the car's model, and the car's own prop of
// that slot is hidden (render/propcosmetic.js hideProps). Checked by scripts/.propmodels-check.mjs: inside the bounds, finite, under
// the triangle budget, tagged, no coplanar faces between parts, every part touching another.
//   PROPS = { roof: [...], cargo: [...], wing: [...] }, a prop = { id, name, shape: 'box' | 'cylinder', build(paint) -> Group }
//   maxScale (every prop, CHECKLIST 450): the largest scale it is worn at, its believable real size (the slot's room may be bigger:
//   render/propanchors.js fitProp wears it at min(room, maxScale), seated); align?: 'centre' | 'front' | 'rear' overrides the slot's
//   (roof centre, cargo front = against the cab, wing rear). The table of maxima and their reasons: PROP-AUDIT-GUIDE.md
//   build(paint): `paint` is the RECOLOURABLE main material (a MeshLambertMaterial; the caller owns it: the same prop in several
//   colours is the same build with another paint); the other parts use the fixed materials below (shared, flagged so clearGroup keeps
//   them). The group carries userData.prop = <slot> and userData.propId = <id>, and so does every mesh (hideProps finds them).
//   Textures: none (flat colours and a little emissive: the owner's "not everything needs a texture").
//   propById(id) -> the prop; buildProp(id, paint) -> the group; propPaint(hex) -> a paint material for it.
import * as THREE from 'three';
import { MORE_ROOF } from './propmodelsroof.js';
import { MORE_ROOF_2 } from './propmodelsroof2.js';
import { MORE_ROOF_3 } from './propmodelsroof3.js';
import { MORE_CARGO } from './propmodelscargo.js';
import { MORE_CARGO_2 } from './propmodelscargo2.js';
import { MORE_WING } from './propmodelswing.js';
import { MORE_WING_CLASSIC } from './propmodelswingclassic.js';
import { MORE_WING_2 } from './propmodelswing2.js';

const shared = (m) => { m.userData.shared = true; return m; };
const DARK = shared(new THREE.MeshLambertMaterial({ color: 0x23252a }));      // black plastic, stands, rails
const CHROME = shared(new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));    // a latch, a ring
const WOOD = shared(new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));      // dark battens, a pallet
const LIT = shared(new THREE.MeshLambertMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0.6 })); // a sign's lit face
const AMBER = shared(new THREE.MeshLambertMaterial({ color: 0xffa31a, emissive: 0xff8a00, emissiveIntensity: 0.5 })); // a beacon's dome
const RED = shared(new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xc01010, emissiveIntensity: 0.6 }));   // a brake strip
export const propPaint = (hex) => new THREE.MeshLambertMaterial({ color: hex });

const box = (parent, material, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); parent.add(m); return m; };
const cyl = (parent, material, rTop, rBottom, h, x, y, z, seg = 14, open = false) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open), material); m.position.set(x, y, z); parent.add(m); return m; };
// a solid whose side view (z along the car, y up) is `profile`, `w` wide across the car
const prism = (parent, material, w, profile) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(w / 2, 0, 0);
  const m = new THREE.Mesh(geo, material); parent.add(m); return m;
};

export const BASE_PROPS = {
  roof: [
    // 1. a roof box: a long carrier on two rails, its lid darker, a chrome latch at the nose. Box 1 x 0.5 x 0.8: y -0.25 (the roof) to 0.25
    { id: 'roofbox', name: 'Roof box', maxScale: 1.0, shape: 'box', build: (paint) => {
      const g = new THREE.Group();
      for (const s of [-1, 1]) box(g, DARK, 0.06, 0.05, 0.7, s * 0.3, -0.225, 0);     // the rails on the roof
      box(g, paint, 0.9, 0.34, 0.76, 0, -0.03, 0);                                     // the carrier
      box(g, DARK, 0.84, 0.06, 0.7, 0, 0.17, 0);                                       // its lid, 5 mm in from the carrier's sides
      box(g, CHROME, 0.12, 0.03, 0.02, 0, 0.0, 0.39);                                  // the latch, 1 cm proud of the nose
      return g;
    } },
    // 2. a roof sign: a lit panel on two stalks over a base bar (a taxi's, a delivery sign). Its faces glow; the panel is the paint
    { id: 'roofsign', name: 'Roof sign', maxScale: 1.1, shape: 'box', build: (paint) => {
      const g = new THREE.Group();
      box(g, DARK, 0.5, 0.04, 0.16, 0, -0.23, 0);                                      // the base bar on the roof
      for (const s of [-1, 1]) box(g, DARK, 0.03, 0.12, 0.03, s * 0.2, -0.16, 0);     // the stalks (into the bar and the panel)
      box(g, paint, 0.9, 0.26, 0.12, 0, 0.02, 0);                                      // the panel
      for (const s of [-1, 1]) box(g, LIT, 0.8, 0.18, 0.01, 0, 0.02, s * 0.065);      // its lit faces, 1 cm proud
      return g;
    } },
    // 3. a beacon dome: a base plate, a drum of the paint, a chrome ring and an amber dome. Cylinder r 0.45 x 0.5 high: y -0.25 to 0.25
    { id: 'roofbeacon', name: 'Beacon dome', maxScale: 0.5, shape: 'cylinder', build: (paint) => {
      const g = new THREE.Group();
      cyl(g, DARK, 0.42, 0.42, 0.04, 0, -0.23, 0, 16);                                 // the base plate
      cyl(g, paint, 0.3, 0.3, 0.16, 0, -0.13, 0, 12);                                  // the drum
      cyl(g, CHROME, 0.31, 0.31, 0.03, 0, -0.045, 0, 12);                              // the ring, 1 cm proud of the drum
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), AMBER);
      dome.scale.set(1, 0.85, 1); dome.position.y = -0.04; g.add(dome);               // the dome, its rim 5 mm into the ring
      return g;
    } },
  ],
  cargo: [
    // 1. a crate stack: three crates of the paint with dark battens up their edges, two on the deck, one on top. Box 1 x 0.8 x 1.2
    { id: 'cargocrates', name: 'Crate stack', maxScale: 1.5, shape: 'box', build: (paint) => {
      const g = new THREE.Group();
      const crate = (w, h, d, x, y, z) => {
        box(g, paint, w, h, d, x, y, z);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, WOOD, 0.04, h, 0.04, x + sx * (w / 2 - 0.015), y + 0.005, z + sz * (d / 2 - 0.015)); // (battens 5 mm proud at the top, 5 mm short at the base)
      };
      crate(0.6, 0.4, 0.6, -0.18, -0.2, 0.28);
      crate(0.5, 0.36, 0.5, 0.22, -0.22, -0.3);
      crate(0.44, 0.34, 0.44, -0.18, 0.175, 0.28);                                     // (on the first, 5 mm into its battens' tops)
      return g;
    } },
    // 2. a barrel: a bellied drum of the paint with three dark hoops and a lid. Cylinder r 0.5 x 0.8 high: y -0.4 to 0.4
    { id: 'cargobarrel', name: 'Barrel', maxScale: 0.9, shape: 'cylinder', build: (paint) => {
      const g = new THREE.Group();
      cyl(g, paint, 0.46, 0.4, 0.4, 0, -0.2, 0, 14);                                   // the lower belly (its base on the deck)
      cyl(g, paint, 0.4, 0.46, 0.38, 0, 0.19, 0, 14);                                  // the upper
      for (const y of [-0.27, 0, 0.27]) cyl(g, DARK, 0.465, 0.465, 0.04, 0, y, 0, 14, true); // the hoops (open tubes, 5 mm proud at the belly)
      cyl(g, DARK, 0.36, 0.36, 0.02, 0, 0.385, 0, 14);                                 // the lid, 5 mm proud of the top
      cyl(g, CHROME, 0.05, 0.05, 0.016, 0.2, 0.386, 0, 8);                             // the bung, 2 mm into the lid, its top 6 mm under the bound
      return g;
    } },
    // 3. a tarp load: a mound of the paint roped down on a pallet. Box 1 x 0.8 x 1.2
    { id: 'cargotarp', name: 'Tarp load', maxScale: 2.0, shape: 'box', build: (paint) => {
      const g = new THREE.Group();
      box(g, WOOD, 0.96, 0.08, 1.16, 0, -0.36, 0);                                     // the pallet's deck
      for (const s of [-1, 1]) box(g, WOOD, 0.1, 0.04, 1.1, s * 0.4, -0.3, 0);        // its bearers (on the deck, under the mound)
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 7), paint);
      mound.scale.set(0.47, 0.36, 0.57); mound.position.y = 0.02; g.add(mound);        // the mound: y -0.34 (into the bearers) to 0.38
      for (const z of [-0.28, 0.28]) box(g, DARK, 0.98, 0.03, 0.03, 0, -0.33, z);     // the straps' ends across the pallet's edge
      return g;
    } },
  ],
  wing: [
    // 1. a GT wing: a blade of the paint on two dark stands, between end plates. Box 1.4 x 0.35 x 0.3: y -0.175 (the deck) to 0.175
    { id: 'winggt', name: 'GT wing', maxScale: 1.8, shape: 'box', build: (paint) => {
      const g = new THREE.Group();
      for (const s of [-1, 1]) box(g, DARK, 0.05, 0.29, 0.14, s * 0.4, -0.03, 0);     // the stands, 5 mm up into the blade
      box(g, paint, 1.36, 0.04, 0.26, 0, 0.13, 0);                                     // the blade
      for (const s of [-1, 1]) box(g, DARK, 0.02, 0.16, 0.28, s * 0.69, 0.08, 0);     // the end plates
      return g;
    } },
    // 2. a duck-tail lip: a low wedge of the paint rising to the tail, a brake strip on its back. Box 1.4 x 0.35 x 0.3 (it uses the lower half)
    { id: 'winglip', name: 'Duck-tail lip', maxScale: 1.8, shape: 'box', build: (paint) => {
      const g = new THREE.Group();
      prism(g, paint, 1.3, [[0.13, -0.175], [-0.14, -0.175], [-0.14, -0.02], [-0.08, 0], [0.13, -0.12]]); // the wedge, its tail 1 cm short of the bound
      box(g, RED, 0.5, 0.03, 0.01, 0, -0.06, -0.145);                                 // the brake strip, 5 mm proud of the back
      return g;
    } },
    // 3. a tube wing: a round bar of the paint across the tail on two slim stands, round end plates. Cylinder across the car, r 0.15 x 1.4
    { id: 'wingtube', name: 'Tube wing', maxScale: 1.8, shape: 'cylinder', build: (paint) => {
      const g = new THREE.Group();
      const bar = cyl(g, paint, 0.055, 0.055, 1.3, 0, 0.09, 0, 12); bar.rotation.z = Math.PI / 2; // the bar
      for (const s of [-1, 1]) box(g, DARK, 0.05, 0.245, 0.03, s * 0.42, -0.0275, 0); // the stands: y -0.15 (the deck) to 0.095 (into the bar)
      for (const s of [-1, 1]) { const d = cyl(g, DARK, 0.115, 0.115, 0.02, s * 0.66, 0.03, 0, 12); d.rotation.z = Math.PI / 2; } // the end plates
      return g;
    } },
  ],
};
// ---- the full registry: the nine first props above, then the extra ones of each zone (3 + 6 roof, 3 + 7 cargo, 3 + 6 + 6 wing).
// The extras live in their own files (propmodelsroof / cargo / wing / wingclassic, each with a MORE_* list and colourFrom: 'car' | 'mixed' |
// 'fixed'); their ids are 'roof-...', 'cargo-...', 'wing-...' and never collide with the nine.
export const PROPS = {
  roof: [...BASE_PROPS.roof, ...MORE_ROOF, ...MORE_ROOF_2, ...MORE_ROOF_3],
  cargo: [...BASE_PROPS.cargo, ...MORE_CARGO, ...MORE_CARGO_2],
  wing: [...BASE_PROPS.wing, ...MORE_WING_CLASSIC, ...MORE_WING_2, ...MORE_WING],
};
export const propById = (id) => Object.values(PROPS).flat().find(p => p.id === id) || null;
export const propSlotOf = (id) => Object.keys(PROPS).find(slot => PROPS[slot].some(p => p.id === id)) || null;
// the prop built and tagged (every mesh: userData.prop = slot, propId = id)
export const buildProp = (id, paint = propPaint(0xffffff)) => {
  const prop = propById(id);
  if (!prop) return null;
  const slot = propSlotOf(id), group = prop.build(paint);
  group.name = 'prop-' + id;
  group.traverse((o) => { o.userData.prop = slot; o.userData.propId = id; });
  return group;
};
