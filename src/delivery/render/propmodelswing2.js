// ---- SIX MORE REAR WINGS, set 3 (the owner, 15-Oct: "have 3 more agents each build roof cosmetics, cargo and wings"; CHECKLIST 400,
// a placeholder number). RENDER-ONLY, the sister of render/propmodelswing.js (the playful six) and propmodelswingclassic.js (the classic
// six): real aero and style, each a silhouette the other wings do not have (from behind: a low slab with a black lip, a tall sheet, a
// goalpost, a thin U on a V, an overhanging shelf with a light bar, a round arch). Each is built to the REAR WING slot's canonical BOX
// (render/propanchors.js PROP_BOUNDS.wing: 1.4 x 0.35 x 0.3; x across the car, the floor y = -0.175, the nose at +z) at scale 1, centred
// on the origin, then placed with fitProp(carId, 'wing', 'box', prop) as a child of the car's model (the car's own wing hidden).
//   MORE_WING_2 = [{ id: 'wing-...', name, shape: 'box', colourFrom: 'car' | 'mixed' | 'fixed', maxScale, build(paint) -> Group }]
//   (colourFrom and carPrimary as in render/propmodelswing.js; maxScale and its reason: PROP-AUDIT-GUIDE.md's table, CHECKLIST 450)
// Each wing is modelled as PARTS (wing2Parts: separate meshes, every part entering its neighbour by 5 mm or more, no two faces on one
// plane: scripts/.propmodels-wing2-check.mjs tests the parts), then build() MERGES the parts by material: one mesh (one draw call) per
// material, two or three a wing. The fixed materials are shared and flagged (clearGroup keeps them); `paint` is the caller's own.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// (defined here, not imported from propmodels.js, which imports this file for the registry: no import cycle)
export const propPaint = (hex) => new THREE.MeshLambertMaterial({ color: hex });

const shared = (m) => { m.userData.shared = true; return m; };
const DARK = shared(new THREE.MeshLambertMaterial({ color: 0x1f2125 }));       // black: rubber, stands, plates, gussets
const CARBON = shared(new THREE.MeshLambertMaterial({ color: 0x343941, emissive: 0x0b0d10, emissiveIntensity: 0.6 })); // a carbon blade: a lighter, cooler black than the hardware
const RED = shared(new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xc01010, emissiveIntensity: 0.6 }));  // brake lamps, an accent

const box = (P, material, w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); P.push(m); return m; };
// a solid whose side view (z along the car, y up) is `profile` ([z, y] pairs), `w` wide across the car, centred on x
const prism = (P, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(w / 2 + x, 0, 0);
  const m = new THREE.Mesh(geo, material); P.push(m); return m;
};
// an aerofoil blade: rounded nose at +z, `w` wide, `chord` long, `t` thick, centred at (x, y, z), tilted (rotation.x: + lowers the nose)
const blade = (P, material, w, chord, t, x, y, z, tilt = 0) => {
  const c = chord / 2, h = t / 2;
  const m = prism(P, material, w, [[c, 0], [c * 0.6, h], [-c * 0.2, h * 1.1], [-c, h * 0.45], [-c, -h * 0.45], [-c * 0.2, -h * 0.9], [c * 0.6, -h]], x);
  m.position.set(0, y, z); m.rotation.x = tilt; return m;
};
// a bent bar seen from BEHIND (x across, y up): the centreline points, half thickness h, flat ends square to the line; extruded `d` along z
const loopBar = (P, material, pts, h, d) => {
  const L = [], R = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const n = Math.hypot(tx, ty); tx /= n; ty /= n;
    L.push([p[0] - ty * h, p[1] + tx * h]); R.push([p[0] + ty * h, p[1] - tx * h]);
  });
  const shape = new THREE.Shape([...L, ...R.reverse()].map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, material); P.push(m); return m;
};
// the parts merged by material: one mesh a material (the transforms baked in)
const mergeParts = (parts) => {
  const g = new THREE.Group(), byMat = new Map();
  for (const m of parts) {
    m.updateMatrix();
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geo.applyMatrix4(m.matrix); geo.clearGroups();
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(geo);
    m.geometry.dispose();
  }
  for (const [material, geos] of byMat) { g.add(new THREE.Mesh(mergeGeometries(geos, false), material)); geos.forEach(q => q.dispose()); }
  return g;
};

const DEFS = [
  // 1. a WHALE TAIL (a 1970s turbo coupe's): a broad flat tray of the paint rising off the deck lid, a black rubber lip around its
  //    rear edge flicked up 6 cm, black rubber rails down its sides, an engine-air grille (black, paint slats) let into its top.
  { id: 'wing-whale', name: 'Whale tail', maxScale: 1.5, colourFrom: 'mixed', parts: (paint) => {
    const P = [], T = 0.03;                                                                     // T: the tray's flat top
    prism(P, paint, 1.3, [[0.14, -0.175], [-0.12, -0.175], [-0.12, T], [0.0, T], [0.14, -0.14]]); // the tray: a ramp up from the deck, flat on top
    prism(P, DARK, 1.36, [[-0.105, T - 0.05], [-0.145, T - 0.05], [-0.145, T + 0.06], [-0.128, T + 0.06], [-0.105, T + 0.005]]); // the rear lip, 15 mm onto the tray
    for (const s of [-1, 1]) box(P, DARK, 0.03, 0.04, 0.12, s * 0.66, T + 0.005, -0.055);    // the side rails: 5 mm into the tray's sides, into the lip
    box(P, DARK, 1.0, 0.016, 0.09, 0, T + 0.002, -0.055);                                     // the grille's panel, 6 mm into the top
    for (const z of [-0.088, -0.066, -0.044, -0.022]) box(P, paint, 0.96, 0.02, 0.012, 0, T + 0.015, z); // its slats, 5 mm into the panel
    return P;
  } },
  // 2. a DRAG PLANK (a pro-stock drag car's spoiler): one tall flat sheet of the paint across the tail, leaning back 20 degrees, held
  //    from the front by three black gussets on a black base rail, framed in black (so it shows against a body of its own colour).
  //    From behind: a framed wall of colour.
  { id: 'wing-plank', name: 'Drag plank', maxScale: 1.3, colourFrom: 'mixed', parts: (paint) => {
    const P = [];
    box(P, DARK, 1.36, 0.03, 0.2, 0, -0.16, 0.03);                                             // the base rail: y -0.175 to -0.145
    prism(P, paint, 1.34, [[0.035, -0.155], [0.017, -0.155], [-0.105, 0.17], [-0.087, 0.17]]); // the sheet: its foot 10 mm into the rail
    for (const x of [-0.45, 0, 0.45]) prism(P, DARK, 0.03, [[0.12, -0.152], [0.024, -0.152], [-0.05, 0.05]], x); // the gussets: rail to sheet, their tops inside it
    for (const s of [-1, 1]) prism(P, DARK, 0.03, [[0.047, -0.16], [0.009, -0.16], [-0.115, 0.172], [-0.077, 0.172]], s * 0.67); // the black edges up its ends, 15 mm over the sheet
    prism(P, DARK, 1.38, [[-0.068, 0.143], [-0.108, 0.143], [-0.118, 0.175], [-0.078, 0.175]]); // and along its top: a black frame that outlines the sheet against the car
    return P;
  } },
  // 3. a TOURING WING (a 1990s touring-car series'): no centre stands: two big black end plates ARE the mounts, standing on feet on the
  //    deck (a goalpost from behind), a deep main plane and a slotted flap of the paint between them, a paint stripe on each plate.
  { id: 'wing-touring', name: 'Touring wing', maxScale: 1.8, colourFrom: 'mixed', parts: (paint) => {
    const P = [];
    for (const s of [-1, 1]) {
      box(P, DARK, 0.08, 0.02, 0.24, s * 0.655, -0.165, 0);                                    // the foot on the deck
      prism(P, DARK, 0.035, [[0.06, -0.16], [-0.1, -0.16], [-0.14, 0.0], [-0.14, 0.172], [0.04, 0.172], [0.14, 0.06], [0.14, 0.0]], s * 0.6725); // the plate: 5 mm into its foot
      box(P, paint, 0.014, 0.04, 0.2, s * 0.691, 0.11, -0.03);                                 // the stripe on its outer face, 6 mm in, 8 mm proud
    }
    blade(P, paint, 1.32, 0.22, 0.04, 0, 0.06, 0.02, 0.08);                                    // the main plane, 5 mm into each plate
    blade(P, paint, 1.32, 0.12, 0.026, 0, 0.135, -0.08, 0.4);                                  // the flap, steep, over the main plane's tail (the slot)
    return P;
  } },
  // 4. a CARBON BLADE (a modern track car's): a thin bare-carbon blade with upswept tips, on two black struts that lean OUT from the
  //    centre of the deck (a V), a red stripe along its trailing edge. Its own colours on every car.
  { id: 'wing-blade', name: 'Carbon blade', maxScale: 1.7, colourFrom: 'fixed', parts: () => {
    const P = [], y0 = 0.05, a = Math.atan2(0.18, 0.209), L = Math.hypot(0.18, 0.209), b = 0.5;
    for (const s of [-1, 1]) {
      box(P, DARK, 0.12, 0.02, 0.09, s * 0.22, -0.165, 0);                                     // the foot
      const st = box(P, DARK, 0.045, L, 0.05, s * 0.31, (-0.159 + y0) / 2, 0); st.rotation.z = -s * a; // the strut, foot (7 mm in) to blade (inside it)
      const tip = blade(P, CARBON, 0.21, 0.23, 0.04, 0, y0 + 0.105 * Math.sin(b), 0.0, 0.06); // the upswept tip: its inner end 10 mm into the centre blade
      tip.position.x = s * (0.49 + 0.105 * Math.cos(b)); tip.rotation.z = s * b;
    }
    blade(P, CARBON, 1.0, 0.26, 0.044, 0, y0, 0.0, 0.06);                                     // the centre blade
    box(P, RED, 0.9, 0.02, 0.012, 0, y0 + 0.018, -0.122);                                      // the red stripe on its trailing edge, 8 mm in
    return P;
  } },
  // 5. a ROOF VISOR (an estate's / a hot hatch's roof-edge spoiler): a moulded wedge of the paint that ramps up off the roof and
  //    overhangs the rear window as a sharp shelf, a full-width red light bar across its back, two black strakes on top.
  { id: 'wing-visor', name: 'Roof visor', maxScale: 1.8, colourFrom: 'mixed', parts: (paint) => {
    const P = [];
    prism(P, paint, 1.3, [[0.145, -0.175], [-0.03, -0.175], [-0.03, -0.07], [-0.135, -0.055], [-0.135, 0.0], [-0.03, -0.005], [0.145, -0.15]]); // the wedge and its shelf
    prism(P, DARK, 1.32, [[-0.02, -0.085], [-0.14, -0.07], [-0.14, -0.05], [-0.02, -0.065]]);  // the black lip under the shelf: 10 mm into the wedge, 5 mm past the shelf's back
    box(P, RED, 1.1, 0.024, 0.02, 0, -0.03, -0.139);                                          // the light bar: 6 mm into the shelf's back
    for (const s of [-1, 1]) prism(P, DARK, 0.035, [[0.12, -0.143], [-0.03, -0.013], [-0.125, -0.008], [-0.125, 0.1], [-0.06, 0.1], [0.12, -0.12]], s * 0.6); // the strakes, 7 mm or more into the top
    return P;
  } },
  // 6. a LOOP SPOILER (a 1990s Japanese sports coupe's hoop): one continuous bar of the paint, two uprights curving over into the blade
  //    in round corners (an arch from behind), on two black feet, a black Gurney lip on the blade, a red brake lamp in the middle of its back.
  { id: 'wing-loop', name: 'Loop spoiler', maxScale: 1.5, colourFrom: 'car', parts: (paint) => {
    const P = [], r = 0.12, cx = 0.48, cy = 0.0, arc = [];
    for (let i = 0; i <= 6; i++) { const t = (i / 6) * Math.PI / 2; arc.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } // the right corner, from the upright to the top
    const right = [[0.6, -0.16], [0.6, -0.08], ...arc];
    const pts = [...right.map(([x, y]) => [-x, y]), ...right.slice().reverse()];             // up the left upright, across the top (x -0.48 to 0.48), down the right
    loopBar(P, paint, pts, 0.02, 0.2);                                                         // the loop: feet at y -0.16, top 0.10 to 0.14
    for (const s of [-1, 1]) box(P, DARK, 0.08, 0.02, 0.22, s * 0.6, -0.165, 0);              // the feet: the loop's ends 5 mm into them
    box(P, RED, 0.24, 0.018, 0.02, 0, 0.12, -0.105);                                           // the brake lamp, 5 mm into the blade's back
    box(P, DARK, 0.9, 0.016, 0.02, 0, 0.143, -0.088);                                          // a black Gurney lip along the blade's top rear edge, 5 mm into it
    return P;
  } },
];

export const MORE_WING_2 = DEFS.map(({ parts, ...d }) => ({ ...d, shape: 'box', build: (paint) => mergeParts(parts(paint)) }));
// the parts unmerged (for the checks: every part touches a neighbour, no coplanar faces)
export const wing2Parts = (id, paint = propPaint(0xffffff)) => { const d = DEFS.find(p => p.id === id); return d ? d.parts(paint) : null; };
export const wing2ById = (id) => MORE_WING_2.find(p => p.id === id) || null;
// the wing built and tagged (the group and every mesh: userData.prop = 'wing', propId = id)
export const buildWing2 = (id, paint = propPaint(0xffffff)) => {
  const prop = wing2ById(id);
  if (!prop) return null;
  const group = prop.build(paint);
  group.name = 'prop-' + id;
  group.traverse((o) => { o.userData.prop = 'wing'; o.userData.propId = id; });
  return group;
};
