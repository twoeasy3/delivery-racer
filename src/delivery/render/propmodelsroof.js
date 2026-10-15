// ---- SIX MORE ROOF PROPS (the owner, 15-Oct: "have one agent working on modelling interesting cosmetics for each zone. The props may choose
// to take their colours from the car's primary colour"; CHECKLIST 300). Beside the first three (render/propmodels.js PROPS.roof: roofbox,
// roofsign, roofbeacon), which this file does not touch. RENDER-ONLY (no rules module imports it; not in the replay fingerprint).
// Each is modelled INSIDE the roof zone's canonical bound at scale 1 (render/propanchors.js PROP_BOUNDS.roof: the box 1 x 0.5 x 0.8, w x h x d,
// or the upright cylinder of radius 0.45 and height 0.5), centred on the origin, its base on the bound's floor (y = -0.25), the nose at +z;
// then fitProp(carId, 'roof', shape) places it on a car. No textures: flat colours, a little emissive; every part overlaps its neighbour by
// 5 mm or more and no two faces of different parts share a plane (gaps >= 5 mm).
//   MORE_ROOF = [ { id: 'roof-...', name, shape: 'box' | 'cylinder', colourFrom: 'car' | 'mixed' | 'fixed', build(paint) -> Group } ]
//   colourFrom: 'car'   every large part is the CAR'S colour (`paint`), the rest is neutral hardware (black, grey, chrome)
//               'mixed' the car's colour on the main part, plus coloured accents of its own (a second board, a stripe, a ribbon)
//               'fixed' its own colours whatever the car (`paint` is not used)
//   build(paint): `paint` is the recolourable material (a MeshLambertMaterial the caller owns, e.g. propPaint(carPrimary(car, evil))); the
//   other materials are shared module-level ones (userData.shared, so clearGroup keeps them). The group and every mesh carry
//   userData.prop = 'roof' and userData.propId = <id>, so hideProps / existingProps treat them like any roof prop.
//   carPrimary(car, evil) -> the car's primary colour (hex) for its side, for the Cosmetics UI to pass to propPaint.
import * as THREE from 'three';
// (defined here, not imported from propmodels.js, which imports this file for the registry: no import cycle)
export const propPaint = (hex) => new THREE.MeshLambertMaterial({ color: hex });

// the car's primary colour for a side: the garage / idea entry's `color` (Good) or `evilColor` (Evil), as paintShowCar (render/showcar.js)
// sets it on the body (a car with no evilColor, such as a level's own vehicle, keeps its one paint)
export const carPrimary = (car, evil = false) => ((evil ? car.evilColor : car.color) ?? car.color);
export const roofPaint = (car, evil = false) => propPaint(carPrimary(car, evil));

const shared = (m) => { m.userData.shared = true; return m; };
const lam = (color, extra = {}) => shared(new THREE.MeshLambertMaterial({ color, ...extra }));
const DARK = lam(0x23252a);       // black plastic, rails, mounts
const GREY = lam(0x70757d);       // a grey shell
const CHROME = lam(0xd8d8d8);     // a pole, a bracket
const WHITE = lam(0xf2f2ee);      // a white board, a stripe
const SUN = lam(0xf2c230);
const TEAL = lam(0x2aa6a0);
const STRAP = lam(0xe8641c);     // orange ratchet straps        // a yellow board, a flower
const KRAFT = lam(0xb98a4e);      // brown card parcels
const KRAFT2 = lam(0xd2a869);     // a lighter parcel
const TAPE = lam(0xe9d9a8);       // parcel tape
const TUBE = lam(0xe8e2d0);       // a post tube
const POT = lam(0xc0663a);        // terracotta
const SOIL = lam(0x4a3524);
const LEAF = lam(0x3f9d4a);       // cactus green
const BLOOM = lam(0xff5fa8);      // a cactus flower
const LNB = lam(0x2b2d33);        // the dish's feed

const box = (parent, m, w, h, d, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };
const cyl = (parent, m, rTop, rBottom, h, x, y, z, seg = 10) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1), m); o.position.set(x, y, z); parent.add(o); return o; };
const ico = (parent, m, r, x, y, z, sy = 1) => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m); o.position.set(x, y, z); o.scale.y = sy; parent.add(o); return o; };
// a solid whose side view (z along the car, y up) is `profile` [[z, y]...], `w` wide across the car (centred on x = 0)
const prism = (parent, m, w, profile) => {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y))), { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(w / 2, 0, 0);
  const o = new THREE.Mesh(geo, m); parent.add(o); return o;
};
// a gable: a solid whose FRONT view (x across, y up) is `profile` [[x, y]...], `d` long (centred on z = 0)
const gable = (parent, m, d, profile) => {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y))), { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const o = new THREE.Mesh(geo, m); parent.add(o); return o;
};
// a rod of radius r between two points
const rod = (parent, m, r, a, b, seg = 6) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg, 1), m);
  o.position.copy(A).add(B).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  parent.add(o); return o;
};

// ---- 1. SURFBOARDS: three boards (the car's colour, white, yellow) strapped on a two-bar rack, nose forward, a fin up at each tail, a stripe
// down each. Box: the rack's bars y -0.25 to -0.2, the boards -0.205 to -0.135, the fins to -0.015.
const boardGeo = (W, L, t) => {
  const w = W / 2, h = L / 2, s = new THREE.Shape();
  s.moveTo(0, -h);                                               // the nose (shape y -> -z, so the nose ends at +z)
  s.quadraticCurveTo(w * 0.75, -h * 0.7, w, -h * 0.1);
  s.quadraticCurveTo(w * 1.05, h * 0.5, w * 0.8, h - 0.04);
  s.quadraticCurveTo(0, h + 0.02, -w * 0.8, h - 0.04);          // the round tail
  s.quadraticCurveTo(-w * 1.05, h * 0.5, -w, -h * 0.1);
  s.quadraticCurveTo(-w * 0.75, -h * 0.7, 0, -h);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return g;
};
const buildSurfboard = (paint) => {
  const g = new THREE.Group();
  for (const z of [-0.2, 0.2]) box(g, DARK, 0.98, 0.05, 0.05, 0, -0.225, z);                 // the rack's bars
  const gm = boardGeo(0.36, 0.78, 0.07);
  // two boards below (yellow, teal) and the car's own on top, between them; the last two have a pale / paint stripe
  const boards = [[-0.2, SUN, DARK, -0.205, 0.12], [0.2, TEAL, WHITE, -0.205, 0.12], [0, paint, WHITE, -0.14, 0.16]];
  for (const [x, body, stripe, y0, fin] of boards) {
    const b = new THREE.Mesh(gm, body); b.position.set(x, y0, 0); g.add(b);                  // the board (5 mm into the bars / the boards below)
    box(g, stripe, 0.05, 0.01, 0.45, x, y0 + 0.07, 0.025);                                    // its stripe, 5 mm proud
    prism(g, body, 0.02, [[-0.2, 0], [-0.34, 0], [-0.31, fin]]).position.set(x, y0 + 0.065, 0); // its fin, 5 mm into the board
  }
  for (const z of [-0.2, 0.2]) {
    box(g, STRAP, 0.82, 0.095, 0.04, 0, -0.1675, z);                                           // the orange straps over the two boards below
    box(g, STRAP, 0.4, 0.07, 0.04, 0, -0.09, z);                                               // and over the one on top
  }
  return g;
};

// ---- 2. CAMPING ROOF TENT: a grey shell on the roof, a pitched tent of the car's colour on it, a dark door at the front and a window at the
// back, a little ladder down the right side. Box: the shell y -0.25 to -0.17, the ridge at 0.24.
const buildTent = (paint) => {
  const g = new THREE.Group();
  box(g, GREY, 0.96, 0.08, 0.78, 0, -0.21, 0);                                                // the shell
  gable(g, paint, 0.72, [[-0.47, -0.175], [0.47, -0.175], [0.47, -0.02], [0, 0.24], [-0.47, -0.02]]); // the tent (5 mm into the shell)
  gable(g, DARK, 0.02, [[-0.13, -0.17], [0.13, -0.17], [0, 0.1]]).position.z = 0.36;         // the door opening, a dark triangle 5 mm into the front, 5 mm proud
  box(g, DARK, 0.18, 0.1, 0.02, 0, -0.07, -0.36);                                             // the window, 7 mm proud of the back
  for (const z of [-0.1, 0.1]) box(g, CHROME, 0.025, 0.21, 0.02, 0.4875, -0.145, z);          // the ladder's rails (x 0.475 to 0.5)
  for (const y of [-0.2, -0.14, -0.08]) box(g, CHROME, 0.01, 0.018, 0.2, 0.4875, y, 0);      // its rungs, recessed 7 mm
  return g;
};

// ---- 3. PARCEL STACK: kraft-paper parcels, one wrapped in the car's colour with a pale ribbon and a bow, a post tube across the top. Box.
const buildParcels = (paint) => {
  const g = new THREE.Group();
  box(g, KRAFT, 0.56, 0.24, 0.56, -0.2, -0.13, -0.1);                                         // the big parcel
  box(g, TAPE, 0.06, 0.01, 0.5, -0.2, -0.005, -0.1);                                          // its tape (5 mm proud)
  box(g, KRAFT2, 0.38, 0.2, 0.36, -0.2, 0.085, -0.1);                                         // the one on top (it sits 5 mm into the tape)
  box(g, paint, 0.4, 0.22, 0.5, 0.29, -0.14, 0.1);                                            // the wrapped parcel
  box(g, TAPE, 0.06, 0.215, 0.52, 0.29, -0.1325, 0.1);                                        // its ribbon, 5 mm proud on top
  for (const s of [-1, 1]) { const b = box(g, TAPE, 0.12, 0.03, 0.04, 0.29 + s * 0.045, -0.015, 0.1); b.rotation.y = s * 0.7; } // the bow
  const t = cyl(g, TUBE, 0.07, 0.07, 0.6, 0.085, 0.06, 0, 10); t.rotation.x = Math.PI / 2;     // the post tube lying across both
  for (const s of [-1, 1]) { const c = cyl(g, paint, 0.062, 0.062, 0.02, 0.085, 0.06, s * 0.305, 10); c.rotation.x = Math.PI / 2; } // its end caps
  return g;
};

// ---- 4. SATELLITE DISH: a base plate and a post, a dish of the car's colour on a strut, tipped up and back to face the chase camera, a feed
// arm and a dark receiver on its axis. Cylinder.
const dishGeo = (R, depth, thick) => {
  const k = depth / (R * R), rs = [0, R * 0.42, R * 0.74, R], pts = [];
  for (const r of rs) pts.push(new THREE.Vector2(r, k * r * r));                              // the inner (concave) face: three rings
  pts.push(new THREE.Vector2(R, k * R * R - thick));                                          // the rim's edge
  pts.push(new THREE.Vector2(0, -0.045));                                                     // the back is one cone to the hub
  return new THREE.LatheGeometry(pts.reverse(), 14);
};
const buildDish = (paint) => {
  const g = new THREE.Group();
  cyl(g, DARK, 0.3, 0.3, 0.03, 0, -0.235, 0, 10);                                            // the base plate
  cyl(g, DARK, 0.04, 0.05, 0.14, 0, -0.17, 0, 6);                                             // the post
  const elev = 50 * Math.PI / 180, axis = new THREE.Vector3(0, Math.sin(elev), -Math.cos(elev));
  const centre = new THREE.Vector3(0, -0.04, 0.0);
  const dish = new THREE.Mesh(dishGeo(0.32, 0.1, 0.015), paint);
  dish.position.copy(centre); dish.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis); g.add(dish);
  rod(g, DARK, 0.022, [0, -0.13, 0], centre.clone().addScaledVector(axis, -0.01), 6);        // the strut from the post up to the dish's back
  const focus = centre.clone().addScaledVector(axis, 0.2);
  rod(g, DARK, 0.01, centre.toArray(), focus.toArray(), 5);                                   // the feed arm
  const head = cyl(g, LNB, 0.03, 0.03, 0.05, focus.x, focus.y, focus.z, 8);                   // the receiver
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  return g;
};

// ---- 5. PENNANT: a chrome mast with a ball on a dark base, a long swallow-free pennant of the car's colour with a pale stripe, rippling
// back from the top. Cylinder (the pennant trails to 0.42 from the mast).
const flagGeo = (L, w0, wave, frac, doubleSided, push) => {
  // a strip along -z from the mast: top edge y = w0/2 * frac(s), bottom = -w0/2 * frac(s), tapering to the tip; x ripples with distance
  const n = 6, pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, hw = (w0 / 2) * (1 - s) * frac, x = wave * Math.sin(s * 7) * s + push;
    pos.push(x, hw, -s * L, x, -hw, -s * L);
  }
  for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }  // (the front faces +x)
  if (doubleSided) for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
};
const buildPennant = (paint) => {
  const g = new THREE.Group();
  cyl(g, DARK, 0.2, 0.2, 0.03, 0, -0.235, 0, 12);                                             // the base
  cyl(g, CHROME, 0.02, 0.02, 0.46, 0, -0.01, 0, 8);                                         // the mast, y -0.24 to 0.22
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), CHROME); ball.position.y = 0.217; g.add(ball); // the ball, top at 0.247
  const flag = new THREE.Mesh(flagGeo(0.43, 0.27, 0.035, 1, true, 0), paint); flag.position.y = 0.09; flag.rotation.y = -Math.PI / 2; g.add(flag); // (flying out to the right: seen from behind and from the front)
  for (const s of [-1, 1]) {                                                                   // the pale stripe, 5 mm off each face of the pennant
    const geo = flagGeo(0.36, 0.27, 0.035, 0.34, false, s * 0.005);
    if (s < 0) { geo.index.array.reverse(); geo.computeVertexNormals(); }                      // (the far face looks the other way)
    const st = new THREE.Mesh(geo, WHITE);
    st.position.set(0, 0.09, 0.0); st.rotation.y = -Math.PI / 2; g.add(st);
  }
  return g;
};

// ---- 6. ROOFTOP CACTUS: a terracotta pot with a tall green cactus (two arms, a pink flower) and a little round one. Cylinder. Its own colours.
const buildCactus = () => {
  const g = new THREE.Group();
  cyl(g, POT, 0.43, 0.28, 0.2, 0, -0.15, 0, 10);                                              // the pot, y -0.25 to -0.05
  cyl(g, SOIL, 0.39, 0.39, 0.02, 0, -0.045, 0, 10);                                           // the soil, 5 mm into the pot, 15 mm over its rim
  cyl(g, LEAF, 0.08, 0.08, 0.26, 0, 0.07, 0, 8);                                              // the tall cactus, y -0.06 to 0.2
  for (const [s, y, top] of [[1, 0.04, 0.17], [-1, 0.1, 0.22]]) {                              // two arms: out, then up
    cyl(g, LEAF, 0.045, 0.045, 0.16, s * 0.13, y, 0, 6).rotation.z = Math.PI / 2;
    cyl(g, LEAF, 0.045, 0.045, top - y + 0.045, s * 0.205, (top + y - 0.045) / 2, 0, 6);
  }
  ico(g, BLOOM, 0.033, 0, 0.215, 0);                                                          // the flower on top
  ico(g, LEAF, 0.09, 0.2, 0.035, 0.18, 0.85);                                                 // the little round cactus (7 mm into the soil)
  ico(g, SUN, 0.026, 0.2, 0.105, 0.18);                                                       // and its flower
  return g;
};

const tagged = (id, build) => (paint) => {
  const g = build(paint);
  g.name = 'prop-' + id;
  g.traverse((o) => { o.userData.prop = 'roof'; o.userData.propId = id; });
  return g;
};
const def = (id, name, shape, colourFrom, build, what) => ({ id, name, shape, colourFrom, what, build: tagged(id, build) });
export const MORE_ROOF = [
  def('roof-surfboard', 'Surfboard rack', 'box', 'mixed', buildSurfboard, 'three strapped boards on a rack, the first in the car colour'),
  def('roof-tent', 'Roof tent', 'box', 'car', buildTent, 'a camping tent on a shell with a ladder, in the car colour'),
  def('roof-parcels', 'Parcel stack', 'box', 'mixed', buildParcels, 'kraft parcels, one wrapped in the car colour, and a post tube'),
  def('roof-dish', 'Satellite dish', 'cylinder', 'car', buildDish, 'a dish on a post, tipped up and back, in the car colour'),
  def('roof-pennant', 'Pennant mast', 'cylinder', 'mixed', buildPennant, 'a mast with a rippling pennant in the car colour and a pale stripe'),
  def('roof-cactus', 'Rooftop cactus', 'cylinder', 'fixed', buildCactus, 'a terracotta pot with a flowering cactus, its own colours'),
];
export const moreRoofById = (id) => MORE_ROOF.find(p => p.id === id) || null;
// the prop built (already tagged) with a paint; `paint` defaults to white
export const buildRoofProp = (id, paint = propPaint(0xffffff)) => moreRoofById(id)?.build(paint) || null;
