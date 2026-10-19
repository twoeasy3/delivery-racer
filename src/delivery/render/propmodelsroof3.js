// ---- TWELVE MORE ROOF PROPS, the third batch (the owner, 19-Oct: "more roof items"; CHECKLIST 511). Beside the first fifteen
// (render/propmodels.js BASE_PROPS.roof, render/propmodelsroof.js MORE_ROOF, render/propmodelsroof2.js MORE_ROOF_2), which this file does not
// touch. RENDER-ONLY (no rules module imports it; not in the replay fingerprint). The recipe of propmodelsroof2.js: each prop is modelled
// INSIDE the roof zone's canonical bound at scale 1 (render/propanchors.js PROP_BOUNDS.roof: the box 1 x 0.5 x 0.8, w x h x d, or the upright
// cylinder of radius 0.45 and height 0.5), centred on the origin, its base on the bound's floor (y = -0.25), the nose at +z; fitProp(carId,
// 'roof', shape, prop) places it. No textures: flat colours, a little emissive; parts overlap their neighbours, no two faces of different
// parts share a plane. Objects only: no people, figures, faces or hands; no text, logos or digits.
//   MORE_ROOF_3 = [ { id: 'roof-...', name, shape, colourFrom: 'car' | 'mixed' | 'fixed', align, maxScale, what, build(paint), parts(paint) } ]
//   build(paint): the parts MERGED BY MATERIAL (one mesh a material) and tagged (userData.prop = 'roof', propId); parts(paint): unmerged,
//   untagged (scripts/.propmodels-roof3-check.mjs tests them part by part). colourFrom / maxScale as propmodelsroof2.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const shared = (m) => { m.userData.shared = true; return m; };
const lam = (color, extra = {}) => shared(new THREE.MeshLambertMaterial({ color, ...extra }));
const DARK = lam(0x23252a);       // black plastic, rubber, bars
const ALU = lam(0xc9ced4);        // aluminium, a frame
const CHROME = lam(0xe2e4e8, { emissive: 0x2a2a2a, emissiveIntensity: 0.5 });
const WHITE = lam(0xf2f2ee);
const SUNNY = lam(0xffd23a);      // a paddle's blade, a flag
const STRAP = lam(0xe8641c);      // orange rope
const RED_LIT = lam(0xff2a2a, { emissive: 0xc01010, emissiveIntensity: 0.7 });
const BLUE_LIT = lam(0x2a6cff, { emissive: 0x1040ff, emissiveIntensity: 0.7 });
const WHITE_LIT = lam(0xfff6d8, { emissive: 0xfff2c0, emissiveIntensity: 0.6 });
const DOUGH = lam(0xd89a52);      // a crust
const CHEESE = lam(0xffc93a, { emissive: 0x402800, emissiveIntensity: 0.3 });
const PEPPERONI = lam(0xb8321e);
const GOLD = lam(0xe0b030, { emissive: 0x403000, emissiveIntensity: 0.5 });
const TAN = lam(0xa8743e);        // a leather case
const OLIVE = lam(0x5d6b3a);      // a canvas holdall
const PINE = lam(0x2f7a3c);       // a fir tree
const BARK = lam(0x6b4a2b);
const TWINE = lam(0xc0302a);
const CREAM = lam(0xeee4cc);      // cushions
const CELL = lam(0x1d3566, { emissive: 0x050a20, emissiveIntensity: 0.5 }); // solar cells
const LINE = lam(0x9fb4d0);       // the cells' grid

const box = (g, m, w, h, d, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
const cyl = (g, m, rTop, rBottom, h, x, y, z, seg = 8) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1), m); o.position.set(x, y, z); g.add(o); return o; };
// a rod of radius r from a to b ([x, y, z])
const rod = (g, m, r, a, b, seg = 5) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg, 1), m);
  o.position.copy(A).add(B).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.add(o); return o;
};
// a solid whose FRONT view (x across, y up) is `profile` [[x, y]...], `d` deep along z, centred on z = 0
const gable = (g, m, d, profile) => {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y))), { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const o = new THREE.Mesh(geo, m); g.add(o); return o;
};
// a solid whose SIDE view (z along the car, y up) is `profile` [[z, y]...], `w` wide across the car, centred on x = 0
const prismGeo = (w, profile) => {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y))), { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(w / 2, 0, 0);
  return geo;
};

// ---- 1. KAYAK: a pointed hull of the car's colour on two bars, a dark cockpit rim, orange straps round it, a paddle with yellow blades
// beside it. Box. The hull 0.26 x 0.79 (at 2.0, the max: a 1.6 m play kayak, 0.5 m wide).
const buildKayak = (paint) => {
  const g = new THREE.Group();
  for (const z of [-0.2, 0.2]) box(g, DARK, 0.94, 0.04, 0.05, 0, -0.23, z);                    // the bars, y -0.25 to -0.21
  const prof = [[0, -0.395], [0.06, -0.3], [0.11, -0.15], [0.13, 0], [0.11, 0.15], [0.06, 0.3], [0, 0.395]].map(([r, t]) => new THREE.Vector2(r, t));
  const hullGeo = new THREE.LatheGeometry(prof, 8); hullGeo.rotateX(Math.PI / 2);              // (the axis along z, a round section)
  const hull = new THREE.Mesh(hullGeo, paint); hull.scale.y = 0.65; hull.position.set(-0.08, -0.155, 0); g.add(hull); // (its keel 5 mm into the bars)
  const rim = cyl(g, DARK, 0.065, 0.065, 0.03, -0.08, -0.075, -0.02, 10); rim.scale.z = 1.5;     // the cockpit's rim, proud of the deck
  for (const z of [-0.2, 0.2]) box(g, STRAP, 0.2, 0.13, 0.03, -0.08, -0.15, z);                 // the straps round the hull, 7 mm proud
  rod(g, DARK, 0.012, [0.3, -0.2, -0.3], [0.3, -0.2, 0.3], 5);                                  // the paddle's shaft, on the bars
  for (const z of [-0.32, 0.32]) box(g, SUNNY, 0.07, 0.012, 0.14, 0.3, -0.2, z);                // its blades
  return g;
};

// ---- 2. LIGHT BAR: a long low housing of the car's colour on two feet, red lenses on the left, blue on the right, a white lamp between.
// Box. 0.96 long (at 1.2, the max: a 1.15 m bar, 0.2 m tall).
const buildLightbar = (paint) => {
  const g = new THREE.Group();
  for (const x of [-0.38, 0.38]) box(g, DARK, 0.08, 0.05, 0.18, x, -0.225, 0);                 // the feet, y -0.25 to -0.2
  box(g, paint, 0.96, 0.05, 0.24, 0, -0.18, 0);                                                 // the housing, y -0.205 to -0.155
  for (const x of [-0.34, -0.12]) box(g, RED_LIT, 0.2, 0.09, 0.2, x, -0.12, 0);                 // the red lenses (5 mm into the housing)
  for (const x of [0.12, 0.34]) box(g, BLUE_LIT, 0.2, 0.09, 0.2, x, -0.12, 0);                  // the blue
  box(g, WHITE_LIT, 0.012, 0.06, 0.14, 0, -0.13, 0);                                            // the white lamp between
  box(g, WHITE_LIT, 0.03, 0.03, 0.03, 0, -0.095, 0);                                            // (its cap)
  return g;
};

// ---- 3. PIZZA SIGN: a giant slice standing tip up, its faces to the front and the back: a crust along its foot, cheese on both faces,
// pepperoni, on two stalks over a plinth of the car's colour. Box. 0.52 across (at 1.6, the max: 0.83 m).
const buildPizza = (paint) => {
  const g = new THREE.Group();
  box(g, paint, 0.5, 0.04, 0.16, 0, -0.23, 0);                                                   // the plinth, y -0.25 to -0.21
  for (const x of [-0.12, 0.12]) box(g, paint, 0.03, 0.08, 0.03, x, -0.175, 0);                 // the stalks, into the crust
  const crust = cyl(g, DOUGH, 0.04, 0.04, 0.52, 0, -0.11, 0, 7); crust.rotation.z = Math.PI / 2; // the crust, y -0.15 to -0.07
  gable(g, DOUGH, 0.05, [[-0.24, -0.1], [0.24, -0.1], [0, 0.245]]);                             // the slice
  gable(g, CHEESE, 0.06, [[-0.21, -0.085], [0.21, -0.085], [0, 0.215]]);                        // the cheese, 5 mm proud of both faces
  for (const [x, y] of [[0, 0.08], [-0.09, -0.02], [0.09, -0.02]]) {
    const p = cyl(g, PEPPERONI, 0.045, 0.045, 0.07, x, y, 0, 10); p.rotation.x = Math.PI / 2;  // the pepperoni, through the slice, 5 mm proud
  }
  return g;
};

// ---- 4. TROPHY: a gold cup with two handles on a stepped plinth (dark, then the car's colour). Cylinder. 0.45 tall (at 1.4, the max:
// a 0.7 m trophy, the cup 0.46 m across).
const buildTrophy = (paint) => {
  const g = new THREE.Group();
  box(g, DARK, 0.3, 0.08, 0.3, 0, -0.21, 0);                                                     // the plinth's foot, y -0.25 to -0.17
  box(g, paint, 0.24, 0.08, 0.24, 0, -0.135, 0);                                                 // its block, y -0.175 to -0.095
  const prof = [[0, -0.1], [0.09, -0.1], [0.03, -0.075], [0.025, -0.02], [0.12, 0.05], [0.16, 0.16], [0.165, 0.24], [0.145, 0.24], [0.12, 0.14], [0, 0.1]];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 10), GOLD)); // the cup, foot 5 mm into the block
  for (const s of [-1, 1]) {                                                                     // the handles, half rings out of the bowl's sides
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 3, 6, Math.PI), GOLD);
    h.position.set(s * 0.15, 0.15, 0); h.rotation.z = -s * Math.PI / 2; g.add(h);
  }
  return g;
};

// ---- 5. BUNTING: four slim posts at the roof's corners, a sagging line across the front and one across the back, each hung with six
// pennants in the car's colour, white and yellow, their faces to the front and back. Box. The posts 0.46 tall (at 1.5, the max: 0.7 m).
const buildBunting = (paint) => {
  const g = new THREE.Group(), X = 0.44, TOP = 0.2, SAG = 0.13;
  const colours = [paint, WHITE, SUNNY];
  for (const z of [-0.34, 0.34]) {
    for (const x of [-X, X]) {
      box(g, DARK, 0.06, 0.03, 0.06, x, -0.235, z);                                             // the foot, y -0.25 to -0.22
      cyl(g, CHROME, 0.012, 0.012, 0.44, x, -0.005, z, 5);                                      // the post, y -0.225 to 0.215
    }
    for (const s of [-1, 1]) rod(g, DARK, 0.006, [s * X, TOP, z], [0, SAG, z], 4);              // the line, sagging to the middle
    [-0.33, -0.2, -0.07, 0.07, 0.2, 0.33].forEach((x, i) => {
      const y = SAG + (TOP - SAG) * Math.abs(x) / X + 0.004;                                    // (the pennant's top 4 mm over the line's axis)
      gable(g, colours[i % 3], 0.008, [[x - 0.04, y], [x + 0.04, y], [x, y - 0.1]]).position.z = z;
    });
  }
  return g;
};

// ---- 6. WIND TURBINE: a white tower on a dark plate, a nacelle of the car's colour, its hub to the back (the chase camera) and three
// white tapered blades. Cylinder. 0.49 tall (at 1.6, the max: 0.78 m).
const bladeGeo = () => {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape([[-0.02, 0.015], [0.02, 0.015], [0.008, 0.215], [-0.006, 0.215]].map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.012, bevelEnabled: false });
  geo.translate(0, 0, -0.006);
  return geo;
};
const buildTurbine = (paint) => {
  const g = new THREE.Group(), HY = 0.02, HZ = -0.08;
  cyl(g, DARK, 0.12, 0.12, 0.03, 0, -0.235, 0, 10);                                            // the plate, y -0.25 to -0.22
  cyl(g, WHITE, 0.02, 0.035, 0.25, 0, -0.1, 0, 7);                                              // the tower, y -0.225 to 0.025
  box(g, paint, 0.07, 0.07, 0.16, 0, HY, 0.0);                                                  // the nacelle, z -0.08 to 0.08
  const hub = cyl(g, paint, 0.0, 0.035, 0.05, 0, HY, HZ - 0.02, 8); hub.rotation.x = -Math.PI / 2; // the spinner, pointing back
  const bg = bladeGeo();
  for (const a of [0, 2.094, 4.189]) { const b = new THREE.Mesh(bg, WHITE); b.position.set(0, HY, HZ - 0.01); b.rotation.z = a; g.add(b); } // the blades, from the hub
  return g;
};

// ---- 7. SUITCASES: on two bars, a big hard case of the car's colour (a dark seam, a handle), a tan leather case on it with two straps and
// chrome clasps, and an olive holdall beside them with its handle. Box. The big case 0.62 x 0.72 (at 1.2, the max: 0.74 x 0.86 m).
const buildLuggage = (paint) => {
  const g = new THREE.Group();
  for (const z of [-0.22, 0.22]) box(g, DARK, 0.94, 0.04, 0.05, 0, -0.23, z);                   // the bars, y -0.25 to -0.21
  box(g, paint, 0.62, 0.18, 0.72, -0.12, -0.125, 0);                                             // the big case, y -0.215 to -0.035
  box(g, DARK, 0.63, 0.02, 0.73, -0.12, -0.1, 0);                                                // its seam, 5 mm proud
  box(g, DARK, 0.14, 0.03, 0.03, -0.12, -0.15, 0.37);                                            // its handle at the front
  box(g, TAN, 0.48, 0.14, 0.52, -0.1, 0.03, 0);                                                  // the leather case, 5 mm down into the big one
  for (const x of [-0.22, 0.02]) box(g, DARK, 0.05, 0.15, 0.53, x, 0.03, 0);                     // its straps, 5 mm proud
  for (const x of [-0.28, 0.08]) box(g, CHROME, 0.04, 0.03, 0.015, x, 0.06, 0.265);              // its clasps
  const bag = cyl(g, OLIVE, 0.1, 0.1, 0.5, 0.34, -0.115, 0, 9); bag.rotation.x = Math.PI / 2;   // the holdall, along the car
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 3, 6, Math.PI), DARK);            // its handle over the top
  h.position.set(0.34, -0.025, 0); h.rotation.y = Math.PI / 2; g.add(h);
  return g;
};

// ---- 8. FIR TREE: a tree going home, lying along the roof with its trunk to the front, three tiers of green on two foam blocks, red twine
// round it. Box. Its own colours. 0.34 across (at 2.0, the max: a 1.5 m tree).
const buildTree = () => {
  const g = new THREE.Group(), Y = -0.07;
  box(g, DARK, 0.3, 0.065, 0.06, 0, -0.2175, 0.2);                                              // the front block, y -0.25 to -0.185
  box(g, DARK, 0.24, 0.09, 0.06, 0, -0.205, -0.15);                                             // the rear block, y -0.25 to -0.16
  for (const [r, h, z] of [[0.17, 0.36, 0.12], [0.14, 0.3, -0.08], [0.1, 0.24, -0.26]]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), PINE); c.rotation.x = -Math.PI / 2; c.position.set(0, Y, z); g.add(c); // a tier, its point to the back
  }
  const t = cyl(g, BARK, 0.04, 0.04, 0.09, 0, Y, 0.335, 6); t.rotation.x = Math.PI / 2;        // the trunk, z 0.29 to 0.38
  for (const [r, z] of [[0.128, 0.2], [0.1, -0.15]]) {                                           // the twine round it over the blocks
    const tw = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 3, 10), TWINE); tw.position.set(0, Y, z); g.add(tw);
  }
  return g;
};

// ---- 9. SHARK FIN: a big swept fin of the car's colour, thick at its root and thin at its tip, on a dark pad. Box. 0.49 tall, 0.62 long
// (at 1.5, the max: 0.73 m tall).
const finGeo = () => {
  const geo = prismGeo(0.12, [[0.32, -0.235], [-0.22, -0.235], [-0.2, -0.12], [-0.24, 0.05], [-0.33, 0.245], [-0.2, 0.17], [-0.02, 0.04], [0.16, -0.1]]);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - 0.85 * (p.getY(i) + 0.235) / 0.48)); // (tapered: 12 cm at the root, 2 at the tip)
  geo.computeVertexNormals();
  return geo;
};
const buildFin = (paint) => {
  const g = new THREE.Group();
  box(g, DARK, 0.16, 0.025, 0.6, 0, -0.2375, 0.02);                                              // the pad, y -0.25 to -0.225
  const f = new THREE.Mesh(finGeo(), paint); f.position.y = 0.005; g.add(f);                    // the fin, its root 5 mm into the pad
  return g;
};

// ---- 10. SOFA: moving day: a two-seat sofa of the car's colour standing on the roof, facing the right, cream seat cushions, dark feet,
// orange rope over it to the roof's edges. Box. 0.76 long (at 1.8, the max: a 1.37 m sofa).
const buildSofa = (paint) => {
  const g = new THREE.Group();
  for (const x of [-0.15, 0.15]) for (const z of [-0.33, 0.33]) box(g, DARK, 0.04, 0.04, 0.04, x, -0.23, z); // the feet, y -0.25 to -0.21
  box(g, paint, 0.38, 0.12, 0.74, 0, -0.155, 0);                                                 // the base, y -0.215 to -0.095
  box(g, paint, 0.11, 0.225, 0.72, -0.14, 0.0075, 0);                                            // the back, y -0.105 to 0.12
  for (const s of [-1, 1]) box(g, paint, 0.385, 0.1, 0.075, 0.0075, -0.05, s * 0.3425);          // the arms
  for (const s of [-1, 1]) box(g, CREAM, 0.27, 0.055, 0.29, 0.05, -0.0775, s * 0.15);            // the seat cushions
  for (const z of [-0.18, 0.18]) {                                                               // the rope: roof edge, over the seat, the back, down
    const pts = [[0.25, -0.235, z], [0.19, -0.045, z], [-0.085, 0.125, z], [-0.2, 0.125, z], [-0.25, -0.235, z]];
    for (let i = 0; i < pts.length - 1; i++) rod(g, STRAP, 0.008, pts[i], pts[i + 1], 4);
  }
  return g;
};

// ---- 11. WIND-UP KEY: a toy's giant wind-up key out of the roof: a dark collar, a chrome shaft, a two-lobed bow of the car's colour facing
// the back. Cylinder. 0.45 tall, the bow 0.4 across (at 1.5, the max: 0.68 m tall).
const buildKey = (paint) => {
  const g = new THREE.Group();
  cyl(g, DARK, 0.07, 0.08, 0.04, 0, -0.23, 0, 10);                                              // the collar, y -0.25 to -0.21
  cyl(g, CHROME, 0.025, 0.025, 0.21, 0, -0.11, 0, 8);                                            // the shaft, y -0.215 to -0.005
  const hub = cyl(g, paint, 0.045, 0.045, 0.06, 0, 0.0, 0, 10); hub.rotation.x = Math.PI / 2;  // the bow's hub
  for (const s of [-1, 1]) {
    const lobe = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 4, 10), paint); lobe.position.set(s * 0.1, 0.1, 0); g.add(lobe); // a lobe, y 0 to 0.2
  }
  return g;
};

// ---- 12. SOLAR PANELS: two flat panels of dark blue cells in aluminium frames, a pale grid over the cells, on two rails. Box. Its own
// colours. 0.96 x 0.76 (at 1.5, the max: a 1.4 x 1.1 m array).
const buildSolar = () => {
  const g = new THREE.Group();
  for (const z of [-0.25, 0.25]) box(g, ALU, 0.94, 0.03, 0.04, 0, -0.235, z);                    // the rails, y -0.25 to -0.22
  for (const s of [-1, 1]) {
    box(g, ALU, 0.48, 0.02, 0.76, s * 0.24, -0.22, 0);                                            // the frame, y -0.23 to -0.21
    box(g, CELL, 0.46, 0.03, 0.74, s * 0.24, -0.21, 0);                                           // the cells, y -0.225 to -0.195
    for (const z of [-0.18, 0, 0.18]) box(g, LINE, 0.44, 0.006, 0.012, s * 0.24, -0.1925, z);     // the grid across
    box(g, LINE, 0.012, 0.008, 0.72, s * 0.24, -0.1925, 0);                                        // and along
  }
  return g;
};

// every mesh of `g` joined with the others of its material (their places baked in): one mesh, one draw call, a material
const mergeByMaterial = (g) => {
  g.updateMatrixWorld(true);
  const buckets = new Map();
  for (const mesh of [...g.children]) {
    if (!mesh.isMesh) continue;
    const geo = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix);
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.clearGroups();
    if (!buckets.has(mesh.material)) buckets.set(mesh.material, []);
    buckets.get(mesh.material).push(geo);
    g.remove(mesh);
  }
  const out = new THREE.Group();
  for (const [material, geos] of buckets) {
    const geo = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
    if (geos.length > 1) for (const gg of geos) gg.dispose();
    out.add(new THREE.Mesh(geo, material));
  }
  return out;
};
const def = (id, name, shape, colourFrom, build, what, maxScale) => ({
  id, name, shape, colourFrom, what, maxScale, align: 'centre', parts: build,
  build: (paint) => {
    const g = mergeByMaterial(build(paint));
    g.name = 'prop-' + id;
    g.traverse((o) => { o.userData.prop = 'roof'; o.userData.propId = id; });
    return g;
  },
});
export const MORE_ROOF_3 = [
  def('roof-kayak', 'Kayak', 'box', 'mixed', buildKayak, 'a kayak in the car colour on bars, straps, a yellow-bladed paddle', 2.0),
  def('roof-lightbar', 'Light bar', 'box', 'mixed', buildLightbar, 'a low bar in the car colour, red and blue lenses', 1.2),
  def('roof-pizza', 'Pizza sign', 'box', 'mixed', buildPizza, 'a giant pizza slice standing on a plinth in the car colour', 1.6),
  def('roof-trophy', 'Trophy', 'cylinder', 'mixed', buildTrophy, 'a gold cup on a plinth in the car colour', 1.4),
  def('roof-bunting', 'Bunting', 'box', 'mixed', buildBunting, 'four posts, two lines of pennants in the car colour, white, yellow', 1.5),
  def('roof-turbine', 'Wind turbine', 'cylinder', 'mixed', buildTurbine, 'a white turbine, its nacelle in the car colour', 1.6),
  def('roof-luggage', 'Suitcases', 'box', 'mixed', buildLuggage, 'a hard case in the car colour, a leather case, a holdall', 1.2),
  def('roof-tree', 'Fir tree', 'box', 'fixed', buildTree, 'a fir tree lying on foam blocks, tied with twine, its own colours', 2.0),
  def('roof-fin', 'Shark fin', 'box', 'car', buildFin, 'a big swept fin in the car colour', 1.5),
  def('roof-sofa', 'Sofa', 'box', 'mixed', buildSofa, 'a sofa in the car colour roped on, cream cushions', 1.8),
  def('roof-key', 'Wind-up key', 'cylinder', 'car', buildKey, 'a toy wind-up key, its bow in the car colour', 1.5),
  def('roof-solar', 'Solar panels', 'box', 'fixed', buildSolar, 'two solar panels in frames, its own colours', 1.5),
];
