// ---- SIX MORE ROOF PROPS, the second batch (the owner, 15-Oct: "Have 3 more agents each build roof cosmetics, cargo and wings"). Beside the
// first three (render/propmodels.js BASE_PROPS.roof: roofbox, roofsign, roofbeacon) and the first six extras (render/propmodelsroof.js
// MORE_ROOF: surfboard, tent, parcels, dish, pennant, cactus), which this file does not touch. RENDER-ONLY (no rules module imports it; not in
// the replay fingerprint). The same recipe as propmodelsroof.js: each prop is modelled INSIDE the roof zone's canonical bound at scale 1
// (render/propanchors.js PROP_BOUNDS.roof: the box 1 x 0.5 x 0.8, w x h x d, or the upright cylinder of radius 0.45 and height 0.5), centred
// on the origin, its base on the bound's floor (y = -0.25), the nose at +z; fitProp(carId, 'roof', shape, prop) places it on a car. No
// textures: flat colours, a little emissive; every part overlaps its neighbour by 5 mm or more and no two faces of different parts share a
// plane (gaps >= 5 mm). No people, figures, faces or hands; nothing flying.
//   MORE_ROOF_2 = [ { id: 'roof-...', name, shape, colourFrom: 'car' | 'mixed' | 'fixed', align, maxScale, what, build(paint), parts(paint) } ]
//   build(paint) -> the prop as worn: its parts MERGED BY MATERIAL (one mesh, so one draw call, a material) and tagged (the group and every
//   mesh: userData.prop = 'roof', userData.propId = <id>). parts(paint) -> the same parts unmerged and untagged (scripts/.propmodels-roof2-check.mjs
//   tests them part by part: no coplanar faces, no floating part). `paint` is the recolourable material the caller owns (propPaint(hex));
//   the other materials are shared module-level ones (userData.shared, so clearGroup keeps them).
//   colourFrom: as propmodelsroof.js ('car': the large parts are the car's colour; 'mixed': the car's colour plus accents of its own;
//   'fixed': its own colours, `paint` unused). maxScale: the largest it is worn at (its believable real size; PROP-AUDIT-GUIDE.md's table).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const shared = (m) => { m.userData.shared = true; return m; };
const lam = (color, extra = {}) => shared(new THREE.MeshLambertMaterial({ color, ...extra }));
const DARK = lam(0x23252a);       // black plastic, rubber, rails
const GREY = lam(0x6b7078);       // steel: a basket, a rack's tray
const ALU = lam(0xc9ced4);        // aluminium ladder
const HUB = lam(0xb4b8be);        // a wheel's rim
const CHROME = lam(0xe2e4e8, { emissive: 0x2a2a2a, emissiveIntensity: 0.5 }); // a horn's rim
const STRAP = lam(0xe8641c);      // orange clamps
const BOARD = lam(0xff8a14, { emissive: 0x401800, emissiveIntensity: 0.4 }); // orange recovery boards
const CONE = lam(0xff6a10, { emissive: 0x401400, emissiveIntensity: 0.35 }); // traffic-cone orange
const BAND = lam(0xf4f4f0, { emissive: 0x303030, emissiveIntensity: 0.3 });  // a cone's reflective band, a sprinkle
const DOUGH = lam(0xd89a52);      // fried dough
const SUNNY = lam(0xffd23a);      // a sprinkle

const box = (g, m, w, h, d, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
const cyl = (g, m, rTop, rBottom, h, x, y, z, seg = 8, open = false) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open), m); o.position.set(x, y, z); g.add(o); return o; };
// a rod of radius r from a to b ([x, y, z]); open-ended (its ends are buried in what it joins)
const rod = (g, m, r, a, b, seg = 5) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg, 1, true), m);
  o.position.copy(A).add(B).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.add(o); return o;
};
// a part along a horizontal direction at angle `th` from +z towards +x (its local +y turned to point that way)
const along = (o, th) => { o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(th), 0, Math.cos(th))); return o; };

// ---- 1. BIKE RACK: a chunky bike of the car's colour, upright in a rack's wheel tray on two bars, its down tube held by the rack's arm. Box.
// A bike is ~1.7 m long: the model is 0.79 long, so at 2.0 (the max) 1.57 m; wheel centres z +-0.235, the tray's top y -0.185.
const buildBike = (paint) => {
  const g = new THREE.Group();
  for (const z of [-0.2, 0.2]) box(g, GREY, 0.94, 0.04, 0.05, 0, -0.23, z);                    // the roof bars, y -0.25 to -0.21
  box(g, GREY, 0.08, 0.03, 0.78, 0, -0.2, 0);                                                   // the wheel tray (5 mm into the bars)
  const tyre = new THREE.TorusGeometry(0.125, 0.032, 3, 12); tyre.rotateY(Math.PI / 2);         // (a fat tyre, in the car's plane)
  for (const z of [-0.235, 0.235]) { const t = new THREE.Mesh(tyre, DARK); t.position.set(0, -0.032, z); g.add(t); } // (5 mm into the tray)
  // the frame, a diamond: rear hub, bottom bracket, seat tube's top, the top tube's joint on it, the head tube's top and bottom, front hub
  const RH = [0, -0.032, -0.235], FH = [0, -0.032, 0.235], BB = [0, -0.065, -0.02], ST = [0, 0.15, -0.105], TJ = [0, 0.125, -0.1], HT = [0, 0.135, 0.15], HB = [0, 0.055, 0.17];
  rod(g, paint, 0.022, RH, BB);                                                                 // the chain stay
  rod(g, paint, 0.02, RH, TJ);                                                                  // the seat stay
  rod(g, paint, 0.024, BB, ST);                                                                 // the seat tube
  rod(g, paint, 0.024, TJ, HT);                                                                 // the top tube
  rod(g, paint, 0.026, BB, HB);                                                                 // the down tube
  rod(g, paint, 0.026, HB, HT);                                                                 // the head tube
  rod(g, paint, 0.02, HB, FH);                                                                  // the fork
  rod(g, DARK, 0.014, ST, [0, 0.195, -0.11], 4);                                                // the seat post
  box(g, DARK, 0.06, 0.03, 0.11, 0, 0.2, -0.12);                                                // the saddle, y 0.185 to 0.215
  rod(g, DARK, 0.014, HT, [0, 0.21, 0.14], 4);                                                  // the stem
  rod(g, DARK, 0.016, [-0.12, 0.205, 0.14], [0.12, 0.205, 0.14], 4);                            // the handlebar across
  rod(g, DARK, 0.014, [0, -0.195, 0.04], [0, 0.0, 0.08], 4);                                    // the rack's arm up to the down tube
  return g;
};

// ---- 2. TRADE LADDER: a two-section aluminium ladder clamped on roof bars with orange hooks, and a black pipe carrier with end caps of
// the car's colour beside it (a pipe of the car's colour vanished into the roof in the stills). Box. The ladder 0.3 wide x 0.78 long (at 1.6, the max: 0.48 x 1.25 m), the pipe 0.12 across (19 cm at 1.6).
const buildLadder = (paint) => {
  const g = new THREE.Group();
  for (const z of [-0.24, 0.24]) box(g, DARK, 0.96, 0.04, 0.05, 0, -0.23, z);                   // the roof bars, y -0.25 to -0.21
  for (const x of [-0.355, -0.085]) box(g, ALU, 0.035, 0.05, 0.78, x, -0.19, 0);                // the lower section's rails (5 mm into the bars)
  for (const z of [-0.32, -0.16, 0, 0.16, 0.32]) box(g, ALU, 0.28, 0.025, 0.035, -0.22, -0.19, z); // its rungs
  for (const x of [-0.35, -0.09]) box(g, ALU, 0.03, 0.045, 0.6, x, -0.1475, 0);                 // the upper (fly) section's rails, 5 mm into the lower
  for (const z of [-0.21, -0.07, 0.07, 0.21]) box(g, ALU, 0.24, 0.022, 0.03, -0.22, -0.1475, z); // its rungs
  for (const z of [-0.24, 0.24]) {
    box(g, STRAP, 0.36, 0.03, 0.06, -0.22, -0.115, z);                                          // the hook over both sections (5 mm into the fly's rails)
    box(g, STRAP, 0.025, 0.11, 0.05, -0.39, -0.16, z);                                          // its leg down to the bar, outside the rails
  }
  const pipe = cyl(g, DARK, 0.06, 0.06, 0.74, 0.22, -0.155, 0, 8, true); pipe.rotation.x = Math.PI / 2; // the black pipe carrier (5 mm into the bars)
  for (const s of [-1, 1]) {                                                                    // its end caps of the car's colour, facing out
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), paint);
    cap.position.set(0.22, -0.155, s * 0.369); cap.rotation.y = s > 0 ? 0 : Math.PI; g.add(cap);
  }
  return g;
};

// ---- 3. EXPEDITION BASKET: a steel roof basket (a floor, four posts, a rail round the top) holding a spare tyre and two jerry cans
// of the car's colour, standing up with its face to the back (the chase camera), a storage box, an orange recovery board along each side. Box.
// The tyre is 0.4 across (at 1.5, the max: 0.6 m), the basket 0.92 x 0.75.
const railGeo = () => {
  const s = new THREE.Shape([[-0.46, -0.375], [0.46, -0.375], [0.46, 0.375], [-0.46, 0.375]].map(([x, z]) => new THREE.Vector2(x, z)));
  s.holes.push(new THREE.Path([[-0.43, -0.345], [-0.43, 0.345], [0.43, 0.345], [0.43, -0.345]].map(([x, z]) => new THREE.Vector2(x, z))));
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);                                                                    // (the outline flat, 3 cm thick upwards)
  return geo;
};
const buildBasket = (paint) => {
  const g = new THREE.Group();
  box(g, GREY, 0.92, 0.03, 0.74, 0, -0.235, 0);                                                // the floor, y -0.25 to -0.22
  for (const x of [-0.445, 0.445]) for (const z of [-0.355, 0.355]) box(g, GREY, 0.02, 0.125, 0.02, x, -0.1675, z); // the posts, to -0.105
  const rail = new THREE.Mesh(railGeo(), GREY); rail.position.y = -0.145; g.add(rail);           // the rail, y -0.145 to -0.115, round the posts
  along(cyl(g, DARK, 0.2, 0.2, 0.12, -0.19, -0.025, -0.19, 12), 0);                             // the spare tyre standing up, its face to the back (5 mm into the floor)
  along(cyl(g, HUB, 0.11, 0.11, 0.13, -0.19, -0.025, -0.19, 8), 0);                             // its rim, 5 mm proud of each face
  box(g, DARK, 0.3, 0.12, 0.2, -0.19, -0.165, 0.18);                                            // a storage box in front of it, y -0.225 to -0.105
  box(g, HUB, 0.08, 0.04, 0.02, -0.19, -0.13, 0.285);                                           // its latch, 5 mm proud of its front
  for (const z of [-0.13, 0.13]) {
    box(g, paint, 0.1, 0.25, 0.19, 0.25, -0.1, z);                                              // a jerry can, y -0.225 to 0.025
    box(g, DARK, 0.04, 0.03, 0.12, 0.25, 0.035, z - 0.02);                                      // its handle (5 mm into the top)
    box(g, DARK, 0.045, 0.035, 0.045, 0.25, 0.04, z + 0.07);                                    // its cap
  }
  for (const s of [-1, 1]) box(g, BOARD, 0.02, 0.13, 0.62, s * 0.465, -0.15, 0);               // the recovery boards, 5 mm into the rail
  return g;
};

// ---- 4. LOUDSPEAKERS: two big flared horns of the car's colour back to back (an ice-cream van's, a campaign van's), one to the front and one
// to the back, on a dark driver, block and post; dark throats in chrome rims, so the chase camera looks into one. Cylinder. A horn is 0.32
// long, 0.37 across its rim (at 1.6, the max: 0.51 / 0.6 m, a big PA horn). (The first draft, four small horns splayed 35 degrees, was a
// dark speck on a bus and on a black car in the stills.)
const buildHorns = (paint) => {
  const g = new THREE.Group(), Y = 0.06;
  cyl(g, DARK, 0.16, 0.16, 0.03, 0, -0.235, 0, 8);                                              // the base plate, y -0.25 to -0.22
  cyl(g, DARK, 0.03, 0.03, 0.2, 0, -0.125, 0, 6);                                               // the post, y -0.225 to -0.025
  box(g, DARK, 0.1, 0.07, 0.12, 0, -0.04, 0);                                                   // the block, y -0.075 to -0.005, under the driver
  along(cyl(g, DARK, 0.055, 0.055, 0.16, 0, Y, 0, 8), 0);                                       // the driver, z -0.08 to 0.08 (5 mm into the block)
  for (const s of [1, -1]) {
    const th = s > 0 ? 0 : Math.PI;
    along(cyl(g, paint, 0.17, 0.035, 0.32, 0, Y, s * 0.22, 12, true), th);                     // the horn: throat r 0.035 at |z| 0.06, mouth r 0.17 at 0.38
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), DARK);                    // the dark throat seen down the mouth, 3 cm in
    mouth.position.set(0, Y, s * 0.35); mouth.rotation.y = th; g.add(mouth);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.155, 0.186, 12), CHROME);              // the chrome rim round the mouth, 4 mm inside its lip
    rim.position.set(0, Y, s * 0.376); rim.rotation.y = th; g.add(rim);
  }
  return g;
};

// ---- 5. GIANT DOUGHNUT: a doughnut shop's roof sign: a giant ring doughnut standing up on a dark plinth, its hole to the front and back,
// iced in the car's colour on both faces (the dough shows round its rims) with white and yellow sprinkles. Cylinder. 0.41 across (at 1.6,
// the max: 0.66 m).
const buildDonut = (paint) => {
  const g = new THREE.Group(), C = 0.04;                                                        // (the ring's centre height)
  box(g, DARK, 0.3, 0.04, 0.12, 0, -0.23, 0);                                                   // the plinth, y -0.25 to -0.21
  for (const x of [-0.07, 0.07]) box(g, DARK, 0.03, 0.08, 0.03, x, -0.18, 0);                   // the stalks, 1.3 cm up into the dough
  const dough = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.075, 5, 10), DOUGH);
  dough.position.y = C; dough.scale.z = 0.7; g.add(dough);                                      // the dough: across 0.41, 0.105 thick, y -0.165 to 0.245
  const icing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.065, 6, 10), paint);
  icing.position.y = C; g.add(icing);                                                           // the icing: over the faces, under the rims (|r - 0.13| < 0.054)
  const tet = new THREE.TetrahedronGeometry(0.014);
  for (let i = 0; i < 10; i++) {                                                                // the sprinkles, five on each face, half sunk in the icing
    const a = (i % 5) * 1.256 + (i < 5 ? 0.3 : 0.9), face = i < 5 ? 1 : -1;
    const s = new THREE.Mesh(tet, i % 2 ? SUNNY : BAND);
    s.position.set(Math.cos(a) * 0.13, C + Math.sin(a) * 0.13, face * 0.063); s.rotation.set(a, i, a * 2); g.add(s);
  }
  return g;
};

// ---- 6. CONE STACK: three stacks of orange traffic cones with a white band, three square bases deep, on two roof bars. Box. A cone is 0.44
// tall over its bases (at 1.5, the max: a 0.7 m cone, a 0.36 m base: road-works size). Its own colours.
const buildCones = () => {
  const g = new THREE.Group();
  for (const z of [-0.1, 0.1]) box(g, DARK, 0.96, 0.04, 0.05, 0, -0.23, z);                     // the roof bars, y -0.25 to -0.21
  for (const x of [-0.3, 0, 0.3]) {
    for (let k = 0; k < 3; k++) box(g, CONE, 0.24, 0.025, 0.24, x, -0.2025 + k * 0.03, 0);       // the bases, 5 mm apart (the cones' bodies join them)
    cyl(g, CONE, 0.018, 0.1, 0.44, x, 0.01, 0, 8);                                              // the cone, y -0.21 to 0.23
    cyl(g, BAND, 0.0398, 0.0547, 0.08, x, 0.1, 0, 8, true);                                     // its band, 5 mm proud, y 0.06 to 0.14
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
export const MORE_ROOF_2 = [
  def('roof-bike', 'Bike rack', 'box', 'mixed', buildBike, 'a chunky bike of the car colour upright in a rack\'s wheel tray', 2.0),
  def('roof-ladder', 'Trade ladder', 'box', 'mixed', buildLadder, 'a two-section ladder on bars with orange hooks, a black pipe carrier with caps in the car colour', 1.6),
  def('roof-basket', 'Roof basket', 'box', 'mixed', buildBasket, 'a steel basket with a spare tyre, two jerry cans in the car colour, orange recovery boards', 1.5),
  def('roof-horns', 'Speakers', 'cylinder', 'car', buildHorns, 'two big flared horns back to back in the car colour, chrome rims, on a post', 1.6),
  def('roof-donut', 'Giant doughnut', 'cylinder', 'mixed', buildDonut, 'a giant ring doughnut sign, iced in the car colour, with sprinkles', 1.6),
  def('roof-cones', 'Cone stack', 'box', 'fixed', buildCones, 'three stacks of orange traffic cones with white bands, its own colours', 1.5),
];
