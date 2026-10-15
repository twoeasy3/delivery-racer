// ---- MORE CARGO PROPS: six new loads for the CARGO zone (the owner, 15-Oct: "have one agent working on modelling interesting cosmetics for
// each zone. The props may choose to take their colours from the car's primary colour"). RENDER-ONLY, like render/propmodels.js (which
// holds the first nine props; this file is its cargo companion and does not touch it): nothing in the rules imports it, it is not in the
// replay fingerprint. Each prop is modelled INSIDE the cargo slot's canonical bound at scale 1, centred on the origin, its base on the
// bound's floor (render/propanchors.js PROP_BOUNDS.cargo: box 1 x 0.8 x 1.2 [w, h, d], y -0.4 to 0.4; cylinder upright r 0.5 x 0.8 high),
// then placed on a car with fitProp(carId, 'cargo', shape) and the car's own load hidden (render/propcosmetic.js hideProps(model, 'cargo')).
//   MORE_CARGO = [{ id, name, shape: 'box' | 'cylinder', colourFrom: 'car' | 'mixed' | 'fixed', build(paint) -> Group }]
//   colourFrom: 'car'   the whole load is in the car's colour (bar a few dark ties and chrome bits)
//               'mixed' the car's colour on the main part plus fixed accents (tape, wood, rubber, chrome)
//               'fixed' its own natural colours whatever the car (build ignores `paint`; the caller may pass any)
//   build(paint): `paint` is the recolourable MeshLambertMaterial (the caller owns it: one per placed prop; cargoPaint(hex) makes one).
//   carPrimary(car, evil): the car's primary colour for its side (what paintShowCar paints the body: evilColor when evil, else color).
//   buildCargo(id, paint) -> the group, tagged userData.prop = 'cargo' and userData.propId = id on the group and every mesh.
// No textures: flat colours and a few vertex colours (the melons' stripes). Under 300 triangles each (scripts/.propmodels-cargo-check.mjs).
import * as THREE from 'three';

const shared = (m) => { m.userData.shared = true; return m; };
const lam = (hex, extra = {}) => shared(new THREE.MeshLambertMaterial({ color: hex, ...extra }));
const DARK = lam(0x23252a);       // straps, black plastic
const RUBBER = lam(0x2b2d32);     // tyres
const CHROME = lam(0xd8d8d8);     // valves, a hub cap
const WOOD = lam(0x6b4a2b);       // pallets, feet
const CARDBOARD = lam(0xb98a55);  // a brown parcel
const TAPE = lam(0xefe6cc);       // parcel tape
const STRAW = [lam(0xd9b44a), lam(0xc9a43c), lam(0xe0be58)]; // hay bales, three tones
const TWINE = lam(0xb5532a);      // baler twine
const WICKER = lam(0xb88a4a);     // a fruit basket
const RIM = lam(0x6a4a2a);        // its rim band
const CREAM = lam(0xe9dfc8);      // a seat cushion
const MELON = shared(new THREE.MeshLambertMaterial({ vertexColors: true })); // striped by vertex colour
const STEEL = lam(0x8d949c);      // a steel pallet disc
const NECK = lam(0xe9e9e4);       // a cylinder's shoulder

export const cargoPaint = (hex) => new THREE.MeshLambertMaterial({ color: hex });
// the car's primary colour for a side: the body paint paintShowCar (render/showcar.js) applies (a car with no evilColor keeps its colour)
export const carPrimary = (car, evil = false) => (evil ? car.evilColor : car.color) ?? car.color;

const box = (parent, material, w, h, d, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };
const cyl = (parent, material, rTop, rBottom, h, x, y, z, seg = 10, open = false) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open), material); m.position.set(x, y, z); parent.add(m); return m; };
// a solid of revolution about y from a profile [[r, y], ...] (open ends: the caller closes them)
const lathe = (parent, material, pts, x, y, z, seg = 10) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), material); m.position.set(x, y, z); parent.add(m); return m; };
// a band around a box part: a slab a little bigger in the two other axes than the part (5 mm proud on each face it crosses)
const band = (parent, material, part, axis, width, at) => {
  const g = part.geometry.parameters, p = part.position, e = 0.01;
  const dims = { x: [width, g.height + e, g.depth + e], y: [g.width + e, width, g.depth + e], z: [g.width + e, g.height + e, width] }[axis];
  const off = { x: [at, 0, 0], y: [0, at, 0], z: [0, 0, at] }[axis];
  const m = box(parent, material, ...dims, p.x + off[0], p.y + off[1], p.z + off[2], part.rotation.y); return m;
};

export const MORE_CARGO = [
  // 1. a PALLET OF PARCELS: six parcels stacked on a wooden pallet, two in cardboard and four in the car's colour, each taped across.
  //    Box 1 x 0.8 x 1.2: the pallet's runners on y -0.4, the top parcel under y 0.4
  { id: 'cargo-parcels', name: 'Pallet of parcels', shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    for (const x of [-0.4, 0, 0.4]) box(g, WOOD, 0.12, 0.075, 1.12, x, -0.3625, 0);     // the runners (y -0.4 to -0.325)
    box(g, WOOD, 0.96, 0.04, 1.16, 0, -0.325, 0);                                          // the deck (y -0.345 to -0.305)
    const parcel = (mat, w, h, d, x, z, base, taped, ry = 0) => {                          // stands on `base`, 5 mm into what is under it
      const y = base + h / 2 - 0.005, p = box(g, mat, w, h, d, x, y, z, ry);
      if (taped) band(g, TAPE, p, 'x', 0.06, 0);
      return { top: y + h / 2, y };
    };
    const A = parcel(paint, 0.46, 0.34, 0.52, -0.24, 0.3, -0.305, true);                  // front left
    parcel(CARDBOARD, 0.42, 0.28, 0.5, 0.25, 0.32, -0.305, true, 0.04);                    // front right, a little skewed
    const C = parcel(CARDBOARD, 0.88, 0.24, 0.44, 0, -0.3, -0.305, true);                 // the long one across the back
    parcel(paint, 0.4, 0.2, 0.4, -0.24, 0.3, A.top, true, -0.06);                          // on the front left
    parcel(paint, 0.5, 0.2, 0.38, 0.12, -0.3, C.top, true);                                // on the long one
    parcel(paint, 0.28, 0.13, 0.28, -0.24, 0.3, A.top + 0.19, false, 0.2);                 // a small one on top
    return g;
  } },
  // 2. a BUNDLE OF GAS CYLINDERS: four bottles of the car's colour with white shoulders and chrome valves standing in a round steel base.
  //    Cylinder r 0.5 x 0.8 high: the base at y -0.4, the valves under y 0.4
  { id: 'cargo-gas', name: 'Gas cylinders', shape: 'cylinder', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    cyl(g, STEEL, 0.49, 0.49, 0.05, 0, -0.375, 0, 10);                                      // the round base (y -0.4 to -0.35)
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = sx * 0.2, z = sz * 0.2;
      lathe(g, paint, [[0.18, -0.355], [0.18, 0.2]], x, 0, z, 8);                           // the bottle (5 mm into the base; its top is the shoulder's rim)
      cyl(g, NECK, 0.07, 0.18, 0.13, x, 0.26, z, 8, true);                                  // the shoulder (y 0.195 to 0.325, 5 mm over the bottle's top)
      cyl(g, CHROME, 0.065, 0.065, 0.08, x, 0.36, z, 6);                                    // the valve (y 0.32 to 0.4)
    }
    return g;
  } },
  // 3. a HAY STACK: two bales lengthwise and two across on top, each with two loops of orange twine. Fixed straw colours.
  //    Box 1 x 0.8 x 1.2: the bottom bales on y -0.4, the top ones under y 0.34
  { id: 'cargo-hay', name: 'Hay bales', shape: 'box', colourFrom: 'fixed', build: () => {
    const g = new THREE.Group();
    const bale = (mat, w, h, d, x, y, z, ry, along) => {
      const b = box(g, mat, w, h, d, x, y, z, ry);
      for (const t of along === 'z' ? [-0.26, 0.26] : [-0.15, 0.15]) band(g, TWINE, b, along === 'z' ? 'z' : 'x', 0.03, along === 'z' ? t * d / 1.1 : t * w / 0.5);
      return b;
    };
    bale(STRAW[0], 0.46, 0.38, 1.04, -0.245, -0.205, 0.01, 0.01, 'z');                      // bottom left
    bale(STRAW[1], 0.46, 0.36, 1.08, 0.245, -0.215, -0.02, -0.012, 'z');                     // bottom right
    bale(STRAW[2], 0.9, 0.36, 0.5, 0.0, 0.145, 0.3, 0.01, 'x');                            // across the top, front (sits 5 mm into the two below)
    bale(STRAW[0], 0.88, 0.34, 0.5, 0.0, 0.135, -0.3, -0.01, 'x');                         // across the top, back
    return g;
  } },
  // 4. a BASKET OF WATERMELONS: a wicker basket heaped with four striped melons. Fixed colours.
  //    Cylinder r 0.5 x 0.8 high: the basket on y -0.4, the top melon under y 0.4
  { id: 'cargo-melons', name: 'Watermelons', shape: 'cylinder', colourFrom: 'fixed', build: () => {
    const g = new THREE.Group();
    cyl(g, WICKER, 0.49, 0.42, 0.24, 0, -0.28, 0, 12);                                      // the basket (y -0.4 to -0.16)
    cyl(g, RIM, 0.495, 0.495, 0.04, 0, -0.17, 0, 12, true);                                 // its rim band
    const melon = (x, y, z, r, tilt) => {
      const geo = new THREE.SphereGeometry(r, 8, 4);
      const col = new Float32Array(geo.attributes.position.count * 3), p = geo.attributes.position, c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const a = Math.atan2(p.getZ(i), p.getX(i)), k = Math.round(((a + Math.PI) / (Math.PI * 2)) * 8) % 2; // longitude stripes
        c.setHex(k ? 0x14461c : 0x69b84a); col.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.scale(1, 0.9, 1.1);
      const m = new THREE.Mesh(geo, MELON); m.position.set(x, y, z); m.rotation.y = tilt; g.add(m);
    };
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; melon(Math.sin(a) * 0.24, -0.08, Math.cos(a) * 0.24, 0.2, i); } // the ring
    melon(0, 0.17, 0, 0.2, 0.5);                                                            // the top one, in the gap
    return g;
  } },
  // 5. a STACK OF TYRES: three tyres, slightly out of true, with a wheel rim of the car's colour on top. Cylinder r 0.5 x 0.8 high
  { id: 'cargo-tyres', name: 'Tyre stack', shape: 'cylinder', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    const prof = [[0.2, 0], [0.45, 0.03], [0.45, 0.21], [0.2, 0.24]];
    const offs = [[0, 0], [0.025, -0.015], [-0.02, 0.02]];
    offs.forEach(([x, z], i) => lathe(g, RUBBER, prof, x, -0.4 + i * 0.235, z, 10));       // each 5 mm into the one below (0.24 tall, 0.235 apart)
    cyl(g, paint, 0.3, 0.3, 0.05, offs[2][0], -0.4 + 2 * 0.235 + 0.24 - 0.01 + 0.025, offs[2][1], 10); // the rim lying on the top tyre (y 0.285 to 0.335)
    cyl(g, CHROME, 0.08, 0.08, 0.03, offs[2][0], 0.345, offs[2][1], 6);                    // its centre cap (y 0.33 to 0.36)
    return g;
  } },
  // 6. a LONE ARMCHAIR ON STRAPS: a chair of the car's colour with a cream seat cushion on four wooden feet, two black straps over the arms.
  //    No person. Box 1 x 0.8 x 1.2: the feet on y -0.4, the back's top under y 0.4; it faces the tail (the chase camera sees the seat)
  { id: 'cargo-armchair', name: 'Armchair on straps', shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, WOOD, 0.08, 0.1, 0.08, sx * 0.38, -0.35, sz * 0.36); // the feet (y -0.4 to -0.3)
    box(g, paint, 0.9, 0.2, 0.9, 0, -0.205, 0);                                            // the seat base (y -0.305 to -0.105)
    box(g, paint, 0.92, 0.7, 0.18, 0, 0.04, -0.46);                                        // the back (y -0.31 to 0.39), 1 cm wider than the base; z -0.55 to -0.37
    for (const s of [-1, 1]) box(g, paint, 0.15, 0.3, 0.84, s * 0.38, -0.005, 0.04);       // the arms (y -0.155 to 0.145; x to 0.455, 5 mm proud of the base; z -0.38 to 0.46)
    box(g, CREAM, 0.58, 0.1, 0.62, 0, -0.06, 0.12);                                        // the seat cushion (y -0.11 to -0.01)
    box(g, CREAM, 0.5, 0.2, 0.06, 0, 0.12, -0.345);                                        // the back cushion (y 0.02 to 0.22), 5 mm into the back
    for (const z of [0.2, -0.04]) box(g, DARK, 0.94, 0.34, 0.035, 0, -0.01, z);           // the straps over arms and seat (y -0.18 to 0.16)
    g.rotation.y = Math.PI;                                                                // turned round: it sits facing the TAIL, so the chase camera sees its seat, arms and cushion, not its back
    const root = new THREE.Group(); root.add(g);                                           // (an inner group: the placement owns the root's yaw)
    return root;
  } },
];
export const cargoById = (id) => MORE_CARGO.find(p => p.id === id) || null;
export const buildCargo = (id, paint = cargoPaint(0xffffff)) => {
  const prop = cargoById(id);
  if (!prop) return null;
  const group = prop.build(paint);
  group.name = 'prop-' + id;
  group.traverse((o) => { o.userData.prop = 'cargo'; o.userData.propId = id; });
  return group;
};
