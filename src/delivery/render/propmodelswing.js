// ---- SIX MORE REAR WINGS (the owner, 15-Oct: "have one agent working on modelling interesting cosmetics for each zone. The props may
// choose to take their colours from the car's primary colour"; CHECKLIST 300). RENDER-ONLY, like render/propmodels.js (which holds the
// first three wings: winggt, winglip, wingtube; this file adds to them and does not touch it). Each wing is built to the REAR WING
// slot's canonical bound (render/propanchors.js PROP_BOUNDS.wing) at scale 1, centred on the origin, the nose at +z:
//   box       1.4 x 0.35 x 0.3  (x across the car, y up from the floor y = -0.175, z along it)
//   cylinder  axis x, radius 0.15, length 1.4: the y-z section must stay inside a circle of radius 0.15 (floor y = -0.15)
// and is placed with fitProp(carId, 'wing', shape) as a child of the car's model; the car's own wing is hidden (hideProps).
//   MORE_WING = [{ id: 'wing-...', name, shape: 'box' | 'cylinder', colourFrom: 'car' | 'mixed' | 'fixed', build(paint) -> Group }]
//   colourFrom: 'car'   the prop is (nearly) all the CAR'S PRIMARY COLOUR (carPrimary below), with dark stands and trim
//               'mixed' the car's colour on the main part plus fixed accent colours (cardboard, grey, dark, red)
//               'fixed' its own colours whatever the car (the paint is accepted and not used)
//   build(paint): `paint` is the recolourable main material (the caller owns it: propPaint(hex), or one material per car);
//   the fixed materials below are shared and flagged so clearGroup keeps them. Every group and mesh is tagged userData.prop = 'wing',
//   userData.propId = <id> (the wings are tagged by buildWingProp, and by the prop's own build for use without it).
//   carPrimary(car, evil) -> the car's primary colour (hex) for its side, as paintShowCar sets the body: evilColor for an Evil
//   driver, falling back to colour (a level's own vehicle may have one paint).
import * as THREE from 'three';
import { propPaint } from './propmodels.js';

export { propPaint };
export const carPrimary = (car, evil = false) => ((evil ? car.evilColor : car.color) ?? car.color);

const shared = (m) => { m.userData.shared = true; return m; };
const DARK = shared(new THREE.MeshLambertMaterial({ color: 0x23252a }));        // black plastic, stands, rails
const GREY = shared(new THREE.MeshLambertMaterial({ color: 0xc9ced4 }));        // a rocket pod's body
const CARDBOARD = shared(new THREE.MeshLambertMaterial({ color: 0xe6cf9c }));   // a pizza box
const CRUST = shared(new THREE.MeshLambertMaterial({ color: 0xd9a24a }));
const SAUCE = shared(new THREE.MeshLambertMaterial({ color: 0xc23a22 }));
const FLAME = shared(new THREE.MeshLambertMaterial({ color: 0xff5a1a, emissive: 0xc82a00, emissiveIntensity: 0.55 }));
const FLAME_CORE = shared(new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0xffa800, emissiveIntensity: 0.6 }));
const GLOW = shared(new THREE.MeshLambertMaterial({ color: 0xffa31a, emissive: 0xff8a00, emissiveIntensity: 0.7 }));

const box = (parent, material, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); parent.add(m); return m; };
const cyl = (parent, material, rTop, rBottom, h, x, y, z, seg = 10, open = false) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open), material); m.position.set(x, y, z); parent.add(m); return m; };
// a solid whose side view (z along the car, y up) is `profile` ([z, y] pairs), `w` wide across the car, centred on x
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(w / 2 + x, 0, 0);
  const m = new THREE.Mesh(geo, material); parent.add(m); return m;
};
// an aerofoil blade: a rounded nose at +z, the tail edge at -z, `w` wide, `chord` long, `t` thick, centred at (x, y, z)
const blade = (parent, material, w, chord, t, x, y, z, tilt = 0) => {
  const c = chord / 2, h = t / 2;
  const m = prism(parent, material, w, [[c, 0], [c * 0.6, h], [-c * 0.2, h * 1.1], [-c, h * 0.45], [-c, -h * 0.45], [-c * 0.2, -h * 0.9], [c * 0.6, -h]], x);
  m.position.set(0, y, z); m.rotation.x = tilt; return m;
};

export const MORE_WING = [
  // 1. a biplane wing: two staggered blades of the paint, one above the other, braced by slim struts and closed by two tall end
  //    plates, on two stands: the loudest motorsport silhouette (a hill-climb special). Box; the car's colour on the blades.
  { id: 'wing-biplane', name: 'Biplane wing', shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) box(g, DARK, 0.04, 0.17, 0.05, s * 0.3, -0.09, -0.03);   // the stands: the floor (-0.175) up into the lower blade
    blade(g, paint, 1.34, 0.21, 0.034, 0, 0.0, -0.01, 0.1);                           // the lower blade, set back
    blade(g, paint, 1.34, 0.19, 0.03, 0, 0.14, 0.03, 0.1);                            // the upper blade, set 4 cm forward of the lower (the stagger)
    for (const s of [-1, 1]) box(g, DARK, 0.03, 0.15, 0.03, s * 0.3, 0.07, 0.0);      // the struts, bridging the gap between the blades
    for (const s of [-1, 1]) box(g, DARK, 0.04, 0.27, 0.27, s * 0.68, 0.035, 0.0);   // the end plates: y -0.1 to 0.17, blade ends 5 mm into them
    return g;
  } },
  // 2. a shark-fin wing: five swept dorsal fins of the paint in a school across the tail, the middle one tallest and carrying three
  //    gill slits, on a dark rail. Box.
  { id: 'wing-shark', name: 'Shark-fin wing', shape: 'box', colourFrom: 'car', build: (paint) => {
    const g = new THREE.Group();
    box(g, DARK, 1.3, 0.03, 0.26, 0, -0.16, 0);                                       // the rail on the deck (y -0.175 to -0.145)
    const fin = (x, s) => {                                                           // a fin: base y -0.165, height 0.34 * s, swept back
      const y = (t) => -0.165 + t * 0.34 * s;
      prism(g, paint, 0.09, [[0.14, y(0)], [0.12, y(0.22)], [0.07, y(0.48)], [-0.01, y(0.75)], [-0.12, y(1)], [-0.085, y(0.62)], [-0.095, y(0.3)], [-0.14, y(0)]], x);
    };
    fin(0, 1); fin(-0.31, 0.72); fin(0.31, 0.72); fin(-0.58, 0.46); fin(0.58, 0.46);
    for (const z of [-0.05, -0.025, 0.0]) box(g, DARK, 0.1, 0.07, 0.008, 0, -0.07, z);  // the gill slits across the middle fin, 5 mm proud each side
    return g;
  } },
  // 3. a pizza-box wing: a flat box on two stands with two pizzas in it and its lid standing open behind as the wing's tall blade,
  //    a sash of the paint across the lid. A delivery car's joke. Box.
  { id: 'wing-pizza', name: 'Pizza-box wing', shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) box(g, DARK, 0.05, 0.1, 0.05, s * 0.45, -0.125, 0.03);   // the stands: the floor up into the box
    box(g, CARDBOARD, 1.3, 0.04, 0.18, 0, -0.07, 0.03);                                 // the box, y -0.09 to -0.05
    for (const s of [-1, 1]) {
      cyl(g, CRUST, 0.075, 0.075, 0.02, s * 0.3, -0.04, 0.035, 10);                    // a pizza: crust y -0.05 to -0.03
      cyl(g, SAUCE, 0.058, 0.058, 0.012, s * 0.3, -0.026, 0.035, 10);                    // and its sauce on top (2 mm into the crust)
    }
    const lid = new THREE.Group();                                                    // the lid, hinged at the box's rear edge
    lid.position.set(0, -0.05, -0.055); lid.rotation.x = -0.3;                         // leaning well back, as a lid stands open
    box(lid, CARDBOARD, 1.26, 0.2, 0.02, 0, 0.095, 0);
    box(lid, paint, 1.0, 0.09, 0.016, 0, 0.1, -0.018);                                // the sash across its back, 8 mm proud
    g.add(lid);
    return g;
  } },
  // 4. a flame wing: five tongues of fire, red-orange with a yellow core, the middle one tallest, licking back from a dark rail.
  //    Its own colours whatever the car. Box.
  { id: 'wing-flame', name: 'Flame wing', shape: 'box', colourFrom: 'fixed', build: () => {
    const g = new THREE.Group();
    box(g, DARK, 1.3, 0.03, 0.26, 0, -0.16, 0);
    const tongue = (x, s) => {
      const y = (t) => -0.165 + t * 0.34 * s;
      const outline = [[0.14, 0], [0.13, 0.42], [0.05, 0.8], [-0.12, 1], [-0.02, 0.5], [-0.06, 0.22], [-0.14, 0]];
      prism(g, FLAME, 0.16, outline.map(([z, t]) => [z, y(t)]), x);
      // the core: the same shape smaller, 1 cm wider each side so it shows
      prism(g, FLAME_CORE, 0.18, outline.map(([z, t]) => [0.05 + (z - 0.05) * 0.45, y(0.04 + t * 0.55)]), x);
    };
    tongue(0, 1); tongue(-0.3, 0.8); tongue(0.3, 0.8); tongue(-0.58, 0.55); tongue(0.58, 0.55);
    return g;
  } },
  // 5. a rocket-pod pair: two grey pods with the car's colour on their nose cones, a short wing plate through them and glowing
  //    bells at the back. Cylinder (the section stays inside the 0.15 circle).
  { id: 'wing-rockets', name: 'Rocket pods', shape: 'cylinder', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const x = s * 0.38;
      const body = cyl(g, GREY, 0.07, 0.07, 0.17, x, 0.0, 0.0, 10); body.rotation.x = Math.PI / 2;      // the pod, z -0.085 to 0.085
      const nose = cyl(g, paint, 0.0, 0.07, 0.05, x, 0.0, 0.11, 10); nose.rotation.x = Math.PI / 2;        // the cone, base at z 0.085 (the pod's front face)
      const bell = cyl(g, DARK, 0.058, 0.075, 0.035, x, 0.0, -0.1025, 10, true); bell.rotation.x = Math.PI / 2; // the bell, open at the back
      const fire = cyl(g, GLOW, 0.05, 0.05, 0.012, x, 0.0, -0.097, 10); fire.rotation.x = Math.PI / 2;     // the glow inside it
      box(g, DARK, 0.05, 0.095, 0.02, x, -0.1025, 0.0);                                               // the stand: y -0.15 up into the pod
    }
    box(g, paint, 1.2, 0.02, 0.16, 0, 0.0, 0.0);                                                        // the wing plate through both pods
    return g;
  } },
  // 6. a hoop wing: three round hoops of the paint standing in a row across the tail, tied top and bottom by two slim rods. Cylinder.
  { id: 'wing-hoops', name: 'Hoop wing', shape: 'cylinder', colourFrom: 'car', build: (paint) => {
    const g = new THREE.Group();
    for (const x of [-0.5, 0, 0.5]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.035, 4, 8), paint);                // 8 around so a vertex sits at the very bottom
      ring.rotation.y = Math.PI / 2; ring.position.set(x, 0, 0); g.add(ring);
    }
    for (const y of [-0.115, 0.115]) { const rod = cyl(g, DARK, 0.016, 0.016, 1.3, 0, y, 0, 6, true); rod.rotation.z = Math.PI / 2; }
    return g;
  } },
];

export const wingPropById = (id) => MORE_WING.find(p => p.id === id) || null;
// the wing built and tagged (the group and every mesh: userData.prop = 'wing', propId = id)
export const buildWingProp = (id, paint = propPaint(0xffffff)) => {
  const prop = wingPropById(id);
  if (!prop) return null;
  const group = prop.build(paint);
  group.name = 'prop-' + id;
  group.traverse((o) => { o.userData.prop = 'wing'; o.userData.propId = id; });
  return group;
};
