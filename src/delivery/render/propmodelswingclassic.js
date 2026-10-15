// ---- SIX CONVENTIONAL REAR WINGS (the owner, 15-Oct: "let's do some conventional looking wings please"; CHECKLIST 300). RENDER-ONLY, the
// sister of render/propmodelswing.js (the six playful wings): real-world wings and spoilers, each built to the REAR WING slot's canonical
// BOX (render/propanchors.js PROP_BOUNDS.wing: 1.4 x 0.35 x 0.3, floor y = -0.175, nose at +z) at scale 1, centred on the origin, then
// placed with fitProp(carId, 'wing', 'box'). The blade / main part takes the car's primary colour (carPrimary in propmodelswing.js);
// stands, pylons and often the end plates are carbon black. MORE_WING_CLASSIC = [{ id, name, shape: 'box', colourFrom, build(paint) }].
import * as THREE from 'three';
// (defined here, not imported from propmodels.js, which imports this file for the registry: no import cycle)
export const propPaint = (hex) => new THREE.MeshLambertMaterial({ color: hex });

const shared = (m) => { m.userData.shared = true; return m; };
const DARK = shared(new THREE.MeshLambertMaterial({ color: 0x1f2125 }));        // carbon black: pylons, plates
const RED = shared(new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xc01010, emissiveIntensity: 0.6 })); // a brake lamp strip

const box = (parent, material, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); parent.add(m); return m; };
// a solid whose side view (z along the car, y up) is `profile` ([z, y] pairs), `w` wide across the car, centred on x
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(w / 2 + x, 0, 0);
  const m = new THREE.Mesh(geo, material); parent.add(m); return m;
};
// a bent bar: the centreline [z, y] points given a half thickness h (flat ends)
const ribbon = (pts, h) => {
  const L = [], R = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tz = b[0] - a[0], ty = b[1] - a[1]; const n = Math.hypot(tz, ty); tz /= n; ty /= n;
    L.push([p[0] - ty * h, p[1] + tz * h]); R.push([p[0] + ty * h, p[1] - tz * h]);
  });
  return [...L, ...R.reverse()];
};
// an aerofoil blade: rounded nose at +z, `w` wide, `chord` long, `t` thick, centred at (x, y, z), tilted (rotation.x: + lowers the nose)
const blade = (parent, material, w, chord, t, x, y, z, tilt = 0) => {
  const c = chord / 2, h = t / 2;
  const m = prism(parent, material, w, [[c, 0], [c * 0.6, h], [-c * 0.2, h * 1.1], [-c, h * 0.45], [-c, -h * 0.45], [-c * 0.2, -h * 0.9], [c * 0.6, -h]], x);
  m.position.set(0, y, z); m.rotation.x = tilt; return m;
};

export const MORE_WING_CLASSIC = [
  // 1. a swan-neck GT wing: the blade hangs UNDER two curved pylons that rise from the deck, arch over and drop onto its top; end plates.
  { id: 'wing-swan', name: 'Swan-neck GT wing', maxScale: 1.8, shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    const neck = ribbon([[0.105, -0.175], [0.105, -0.02], [0.098, 0.08], [0.07, 0.13], [0.02, 0.153], [-0.03, 0.135], [-0.05, 0.105], [-0.05, 0.07]], 0.02);
    for (const s of [-1, 1]) prism(g, DARK, 0.035, neck, s * 0.32);
    blade(g, paint, 1.34, 0.21, 0.03, 0, 0.055, -0.015, 0.06);                        // the blade, hung below the arches
    for (const s of [-1, 1]) prism(g, DARK, 0.03, [[0.13, -0.02], [-0.13, -0.02], [-0.13, 0.12], [0.0, 0.12], [0.13, 0.095]], s * 0.68); // the end plates
    return g;
  } },
  // 2. a single-pedestal wing: one wide tapered pylon on the centre line carries a long blade, small end plates (a time-attack wing).
  { id: 'wing-pedestal', name: 'Pedestal wing', maxScale: 1.8, shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    prism(g, DARK, 0.09, [[0.06, -0.175], [-0.07, -0.175], [-0.035, 0.1], [0.035, 0.1]]);   // the pylon: wide at the deck, narrow under the blade
    blade(g, paint, 1.34, 0.24, 0.035, 0, 0.115, -0.01, 0.08);                           // the blade, y 0.1 to 0.13, the pylon's top 1.5 cm into it
    for (const s of [-1, 1]) prism(g, DARK, 0.03, [[0.12, 0.085], [-0.12, 0.085], [-0.12, 0.175], [0.04, 0.175]], s * 0.68);
    return g;
  } },
  // 3. a tuner wing: a wide flat blade low on two short stands between big upswept end plates in the car's colour.
  { id: 'wing-tuner', name: 'Tuner wing', maxScale: 1.8, shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) box(g, DARK, 0.05, 0.14, 0.05, s * 0.4, -0.105, 0.0);       // the short stands: floor up into the blade
    blade(g, paint, 1.34, 0.28, 0.032, 0, -0.025, 0.0, 0.07);                            // the blade
    for (const s of [-1, 1]) prism(g, paint, 0.03, [[0.14, -0.175], [-0.14, -0.175], [-0.14, 0.12], [-0.02, 0.09], [0.14, 0.02]], s * 0.68); // big plates, swept up at the tail
    return g;
  } },
  // 4. a ducktail: one moulded kicked-up lip that follows the deck: it rises from the deck's surface in a gentle curve to a lifted tail edge.
  { id: 'wing-ducktail', name: 'Ducktail', maxScale: 1.8, shape: 'box', colourFrom: 'car', build: (paint) => {
    const g = new THREE.Group();
    const top = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const t = i / 7; return [0.15 - 0.265 * t, -0.17 + 0.135 * Math.pow(t, 2.2)]; }); // the gentle rise, from the deck to the lifted tail edge
    prism(g, paint, 1.3, [[0.15, -0.175], [-0.14, -0.175], [-0.14, -0.04], ...top.reverse()]);
    return g;
  } },
  // 5. a hatch roof spoiler: a curved, deep blade on two short pedestals at the roof's rear edge, with a brake lamp strip on its back.
  { id: 'wing-hatch', name: 'Hatch roof spoiler', maxScale: 1.8, shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) box(g, DARK, 0.08, 0.1, 0.07, s * 0.5, -0.125, 0.0);          // the pedestals: floor up into the blade
    const o = -0.08;
    prism(g, paint, 1.3, [[0.11, 0 + o], [0.08, 0.045 + o], [0.0, 0.07 + o], [-0.08, 0.06 + o], [-0.125, 0.015 + o], [-0.125, -0.03 + o], [-0.07, -0.02 + o], [0.0, -0.01 + o]]);
    box(g, RED, 0.9, 0.02, 0.012, 0, -0.088, -0.1305);                                    // the brake lamp strip on the back
    return g;
  } },
  // 6. a race wing: a tall dual-element blade (main plane and a steep flap with a Gurney flap), two vertical pylons, large end plates.
  { id: 'wing-race', name: 'Race wing', maxScale: 1.8, shape: 'box', colourFrom: 'mixed', build: (paint) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) box(g, DARK, 0.045, 0.215, 0.05, s * 0.3, -0.0675, 0.015);   // the pylons: floor up into the main plane
    blade(g, paint, 1.36, 0.17, 0.035, 0, 0.05, 0.02, 0.05);                              // the main plane
    blade(g, paint, 1.36, 0.13, 0.025, 0, 0.125, -0.075, 0.35);                           // the flap, steeper, with a slot between
    box(g, DARK, 1.3, 0.03, 0.008, 0, 0.155, -0.133);                                     // the Gurney flap on the flap's tail
    for (const s of [-1, 1]) prism(g, DARK, 0.03, [[0.13, -0.03], [-0.14, -0.03], [-0.14, 0.175], [0.03, 0.175], [0.13, 0.07]], s * 0.685);
    return g;
  } },
];

export const classicWingById = (id) => MORE_WING_CLASSIC.find(p => p.id === id) || null;
export const buildClassicWing = (id, paint = propPaint(0xffffff)) => {
  const prop = classicWingById(id);
  if (!prop) return null;
  const group = prop.build(paint);
  group.name = 'prop-' + id;
  group.traverse((o) => { o.userData.prop = 'wing'; o.userData.propId = id; });
  return group;
};
