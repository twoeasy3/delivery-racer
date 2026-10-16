// ---- SIX MORE CARGO PROPS (the owner, 16-Oct: "have 3 more agents each build roof cosmetics, cargo and wings"): loads for the CARGO zone
// beyond render/propmodels.js's three and render/propmodelscargo.js's seven, one a theme: trades (a cement mixer), farm and forest (a log
// pile), travel and leisure (a rubber dinghy), a party (speakers), sport (a giant trophy) and a delivery's goods (a washing machine).
// RENDER-ONLY, like its two companions: nothing in the rules imports it, it is not in the replay fingerprint. No people, no figures, nothing
// that flies. Each prop is modelled INSIDE the cargo slot's canonical bound at scale 1, centred on the origin, its base on the bound's floor
// (render/propanchors.js PROP_BOUNDS.cargo: box 1 x 0.8 x 1.2 [w, h, d], y -0.4 to 0.4, +z towards the cab; cylinder upright r 0.5 x 0.8
// high), then placed by fitProp(carId, 'cargo', shape, prop) (at most its own maxScale, against the cab) and the car's own load hidden.
//   MORE_CARGO_2 = [{ id, name, shape: 'box' | 'cylinder', colourFrom: 'car' | 'mixed' | 'fixed', maxScale, build(paint, opts?) -> Group }]
//   (the same shape as propmodelscargo.js MORE_CARGO; colourFrom as there: 'mixed' = the car's colour on one part plus fixed colours)
//   build(paint, { split: true }): the parts as separate meshes (scripts/.propmodels-cargo2-check.mjs tests their overlaps and faces);
//   without it the parts are MERGED BY MATERIAL (one mesh, so one draw call, a material: three to six a prop).
// Every load is secured (ratchet straps, a strap over a boat, stakes and straps on the logs, straps over a crated washer) and every part
// overlaps the one it rests on by 5 mm or more; no two parts share a face plane (5 mm apart at least). Flat colours, a little emissive on
// the speakers' rings and the trophy's gold; no textures. Under 300 triangles each.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const shared = (m) => { m.userData.shared = true; return m; };
const lam = (hex, extra = {}) => shared(new THREE.MeshLambertMaterial({ color: hex, ...extra }));
const DARK = lam(0x23252a);       // straps, rubber, black plastic
const STEEL = lam(0x7d858e);      // a mixer's frame, a dinghy's floor
const CHROME = lam(0xd8d8d8);     // a porthole ring, a knob, a speaker cone
const WOOD = lam(0x6b4a2b);       // a pallet, oars
const BARK = lam(0x5a3a22);       // a log's bark
const ENDGRAIN = lam(0xe2c48c);   // a log's sawn end
const WHITE = lam(0xf4f4f0);      // a washing machine
const CARDBOARD = lam(0xb98a55);  // corner protectors
const GOLD = lam(0xe8b52e, { emissive: 0x7a5200, emissiveIntensity: 0.35 }); // a trophy
const LED = lam(0xff3df0, { emissive: 0xd01ac8, emissiveIntensity: 0.7 });   // a speaker's light ring

const mesh = (g, mat, geo, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
const box = (g, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => mesh(g, mat, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
const cyl = (g, mat, rt, rb, h, x, y, z, seg, open = false, rx = 0, ry = 0, rz = 0) => mesh(g, mat, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), x, y, z, rx, ry, rz);
const lathe = (g, mat, pts, seg, x, y, z, rx = 0) => mesh(g, mat, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), x, y, z, rx);
const disc = (g, mat, r, seg, x, y, z, rx = 0, ry = 0) => mesh(g, mat, new THREE.CircleGeometry(r, seg), x, y, z, rx, ry);
const torus = (g, mat, R, t, rs, ts, arc, x, y, z, rx = 0, ry = 0, rz = 0) => mesh(g, mat, new THREE.TorusGeometry(R, t, rs, ts, arc), x, y, z, rx, ry, rz);
// a strap over a load across the car (x): a band over the top and a leg down each side, in the x-y plane at z
//   (x0, x1: the legs' centres; yTop: the band's centre; yFoot: the legs' foot; t: thickness, d: width along z). The band ends inside the
//   legs, which are 1 cm thicker and wider and stop 5 mm under its top: no two faces on one plane
const strap = (g, mat, x0, x1, yTop, yFoot, z, t = 0.03, d = 0.05) => {
  box(g, mat, x1 - x0, t, d, (x0 + x1) / 2, yTop, z);
  const top = yTop + t / 2 - 0.005;
  for (const x of [x0, x1]) box(g, mat, t + 0.01, top - yFoot, d + 0.01, x, (top + yFoot) / 2, z);
};
// the parts merged by material: one mesh a material (the build's draw calls), unless opts.split (the check looks at the parts)
const finish = (g, opts) => {
  if (opts && opts.split) return g;
  const buckets = new Map();
  for (const m of [...g.children]) {
    m.updateMatrix();
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
    geo.clearGroups();
    if (!buckets.has(m.material)) buckets.set(m.material, []);
    buckets.get(m.material).push(geo);
    m.geometry.dispose();
  }
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) out.add(new THREE.Mesh(geos.length === 1 ? geos[0] : mergeGeometries(geos), mat));
  return out;
};

export const MORE_CARGO_2 = [
  // 1. a CEMENT MIXER (trades): a site mixer's drum of the car's colour, tipped back with its mouth up towards the tail, a dark band round its
  //    belly, on an axle between two steel posts on skid rails, two wheels at the tail end, a handwheel on its side; two ratchet straps over
  //    the rails. Box 1 x 0.8 x 1.2: the rails on y -0.4, the mouth's rim under y 0.4
  { id: 'cargo-mixer', name: 'Cement mixer', maxScale: 1.2, shape: 'box', colourFrom: 'mixed', build: (paint, opts) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) box(g, STEEL, 0.06, 0.06, 0.9, s * 0.32, -0.37, 0.05);              // the skid rails (y -0.4 to -0.34, z -0.4 to 0.5)
    for (const s of [-1, 1]) box(g, STEEL, 0.05, 0.40, 0.06, s * 0.32, -0.155, 0.06);            // the posts (y -0.355 to 0.045, 1.5 cm into the rails)
    cyl(g, STEEL, 0.035, 0.035, 0.82, 0, 0.0, 0.06, 5, false, 0, 0, Math.PI / 2);               // the axle through the drum, both posts and the handwheel (x +-0.41)
    for (const s of [-1, 1]) cyl(g, DARK, 0.13, 0.13, 0.06, s * 0.37, -0.27, -0.38, 6, false, 0, 0, Math.PI / 2); // the wheels on the rails' tail ends (1 cm into them)
    // the drum: a lathe about its own axis, tipped back 0.6 rad (its mouth up and towards the tail), its axis through the axle
    const T = -0.6;                                                                             // (rotation.x = T: the drum's axis is (0, cos T, sin T))
    const base = [0, -0.22, 0.21];                                                              // the drum's closed end, low and towards the cab
    lathe(g, paint, [[0.0, 0.0], [0.25, 0.02], [0.3, 0.2], [0.13, 0.47], [0.13, 0.55]], 8, ...base, T); // (a round bottom, a cone to a short neck)
    const at = (h) => [0, base[1] + h * Math.cos(T), base[2] + h * Math.sin(T)];               // a point on the drum's axis
    cyl(g, DARK, 0.307, 0.307, 0.05, ...at(0.2), 8, true, T);                                    // the band round its belly (open, 7 mm proud)
    disc(g, DARK, 0.118, 8, ...at(0.525), T - Math.PI / 2);                                      // the dark inside of its mouth, 2.5 cm down the neck
    cyl(g, DARK, 0.1, 0.1, 0.025, 0.4, 0.0, 0.06, 6, false, 0, 0, Math.PI / 2);                  // the tipping handwheel on the axle's end (x 0.3875 to 0.4125)
    for (const z of [0.3, -0.15]) strap(g, DARK, -0.36, 0.36, -0.33, -0.392, z, 0.03, 0.045);    // ratchet straps over the rails, their feet 8 mm off the floor
    return finish(g, opts);
  } },
  // 2. a LOG PILE (farm and forest): six sawn logs along the bed in a 3-2-1 pyramid, bark brown with pale sawn ends, held by four dark
  //    stakes and two straps of the car's colour over the top. Box 1 x 0.8 x 1.2: the bottom logs on y -0.4, the top log under y 0.29
  { id: 'cargo-logs', name: 'Log pile', maxScale: 1.4, shape: 'box', colourFrom: 'mixed', build: (paint, opts) => {
    const g = new THREE.Group();
    const logs = [[-0.25, -0.27, 0.13, 0.01], [0, -0.27, 0.13, -0.015], [0.25, -0.27, 0.13, 0.02],
      [-0.125, -0.06, 0.125, -0.02], [0.125, -0.06, 0.128, 0.012], [0, 0.155, 0.124, 0.0]];      // [x, y, r, z shift]: each row nested 1 cm into the one below
    for (const [x, y, r, dz] of logs) {
      const L = 1.12 - Math.abs(dz) * 2;
      cyl(g, BARK, r, r, L, x, y, dz, 7, true, Math.PI / 2);                                    // the log (an open tube along z)
      for (const s of [-1, 1]) disc(g, ENDGRAIN, r * Math.cos(Math.PI / 7) - 0.004, 7, x, y, dz + s * (L / 2 - 0.006), 0, s > 0 ? 0 : Math.PI); // its sawn ends, 6 mm in (inside the tube's flats)
    }
    for (const sx of [-1, 1]) for (const z of [-0.3, 0.3]) box(g, DARK, 0.05, 0.5, 0.05, sx * 0.4, -0.145, z); // the stakes (y -0.395 to 0.105), 5 mm into the bottom logs
    for (const z of [-0.3, 0.3]) {                                                              // the straps: over the top log, down to the stakes' heads
      box(g, paint, 0.26, 0.03, 0.05, 0, 0.275, z);                                             // (across the top log, 1.5 cm into it)
      for (const s of [-1, 1]) box(g, paint, 0.34, 0.03, 0.05, s * 0.28, 0.19, z, 0, 0, s * -0.6); // (down each side to the stake's head)
    }
    return finish(g, opts);
  } },
  // 3. a RUBBER DINGHY (travel and leisure): two fat tubes of the car's colour joined in a round bow towards the cab, a grey floor, a dark
  //    transom with an outboard motor on it at the tail, two oars along the tubes, on two wooden bunks (so it shows over a bed's sides), a strap over it all. Box 1 x 0.8 x 1.2: the
  //    bunks on y -0.4, the cowling's top at y 0.18
  { id: 'cargo-dinghy', name: 'Rubber dinghy', maxScale: 1.6, shape: 'box', colourFrom: 'mixed', build: (paint, opts) => {
    const g = new THREE.Group();
    const R = 0.13, X = 0.32, L = 0.16, Y = -0.27 + L;                                         // (the boat rides L up, on two wooden bunks: it shows over a bed's sides)
    for (const z of [0.25, -0.3]) box(g, WOOD, 0.8, 0.185, 0.1, 0, -0.3075, z);               // the bunks across the bed (y -0.4 to -0.215)
    torus(g, paint, X, R, 6, 6, Math.PI, 0, Y, 0.1, Math.PI / 2);                              // the bow: half a ring from one tube round to the other (z to 0.55)
    for (const s of [-1, 1]) cyl(g, paint, R, R, 0.67, s * X, Y, -0.225, 8, false, Math.PI / 2); // a tube, capped at the tail (z -0.56 to 0.11, 1 cm into the bow)
    box(g, STEEL, 0.56, 0.03, 0.66, 0, -0.225, -0.165);                                         // the floor (y -0.24 to -0.21, 1 cm into the bunks), into the tubes
    box(g, DARK, 0.5, 0.2, 0.04, 0, -0.125, -0.48);                                             // the transom (y -0.225 to -0.025)
    box(g, DARK, 0.18, 0.2, 0.17, 0, 0.08, -0.5);                                               // the outboard's cowling on it (y -0.02 to 0.18, z to -0.585)
    box(g, DARK, 0.06, 0.2, 0.06, 0, -0.11, -0.55);                                             // its leg down behind the transom
    for (const s of [-1, 1]) {
      box(g, WOOD, 0.03, 0.03, 0.82, s * 0.23, 0.0, -0.05);                                     // an oar's loom along the tube's inner top
      box(g, WOOD, 0.1, 0.02, 0.22, s * 0.23, 0.0, -0.48);                                      // its blade at the tail
    }
    strap(g, DARK, -0.452, 0.452, 0.03, -0.392, 0.16, 0.025, 0.05);                             // a strap over both tubes, its legs down their sides to the deck
    return finish(g, opts);
  } },
  // 4. PARTY SPEAKERS (a party): two speaker cabinets of the car's colour facing the tail, each with a big woofer (a glowing magenta ring
  //    round a silver cone) and a tweeter, a dark flight case in front of them against the cab, a strap round the lot. Box 1 x 0.8 x 1.2:
  //    on y -0.4, the taller cabinet's top at y 0.32
  { id: 'cargo-speakers', name: 'Party speakers', maxScale: 1.1, shape: 'box', colourFrom: 'mixed', build: (paint, opts) => {
    const g = new THREE.Group();
    const cabs = [[-0.235, 0.72], [0.235, 0.64]], Z = -0.15, D = 0.38, back = Z - D / 2;     // [x, height]; the faces at z -0.34
    for (const [x, h] of cabs) {
      const y0 = -0.4, yc = y0 + h / 2;
      box(g, paint, 0.42, h, D, x, yc, Z);                                                       // the cabinet
      const wy = y0 + 0.24;                                                                      // the woofer's centre, low on the face
      cyl(g, CHROME, 0.05, 0.15, 0.05, x, wy, back + 0.012, 10, false, Math.PI / 2);            // its cone, the wide end 1.3 cm out of the face
      mesh(g, LED, new THREE.RingGeometry(0.146, 0.185, 10, 1), x, wy, back - 0.006, 0, Math.PI); // its glowing ring round the cone, facing the tail (7 mm into the cone's depth)
      box(g, DARK, 0.2, 0.1, 0.03, x, y0 + h - 0.1, back - 0.005);                               // the tweeter's horn near the top (clear of the strap)
    }
    box(g, DARK, 0.8, 0.3, 0.42, 0, -0.245, 0.24);                                              // the flight case against the cab (z 0.03 to 0.45, y -0.395 to -0.095)
    for (const s of [-1, 1]) box(g, CHROME, 0.04, 0.31, 0.04, s * 0.39, -0.245, 0.435);         // its chrome corners at the cab end (5 mm proud)
    // the strap round both cabinets: back, front, the two sides (y 0.05)
    const sy = 0.05;
    box(g, DARK, 0.9, 0.05, 0.02, 0, sy, back - 0.008);                                        // (the back and front bands end inside the side ones)
    box(g, DARK, 0.9, 0.05, 0.02, 0, sy, Z + D / 2 + 0.008);
    for (const s of [-1, 1]) box(g, DARK, 0.02, 0.06, D + 0.046, s * 0.452, sy, Z);
    return finish(g, opts);
  } },
  // 5. a GIANT TROPHY (sport): a gold cup with two handles on a two-step plinth, the upper step the car's colour with a gold plaque facing
  //    the tail, strapped down from the handles to the base. Cylinder r 0.5 x 0.8 high: the plinth on y -0.4, the cup's rim under y 0.38
  { id: 'cargo-trophy', name: 'Giant trophy', maxScale: 1.3, shape: 'cylinder', colourFrom: 'mixed', build: (paint, opts) => {
    const g = new THREE.Group();
    box(g, DARK, 0.5, 0.1, 0.5, 0, -0.35, 0);                                                   // the base step (y -0.4 to -0.3)
    box(g, paint, 0.4, 0.105, 0.4, 0, -0.2575, 0);                                              // the upper step (y -0.31 to -0.205)
    box(g, GOLD, 0.22, 0.06, 0.02, 0, -0.2575, -0.205);                                         // the plaque on its tail face (5 mm into it)
    const Y0 = -0.21;
    lathe(g, GOLD, [[0, 0], [0.15, 0], [0.13, 0.05], [0.04, 0.1], [0.035, 0.22], [0.18, 0.27], [0.26, 0.38], [0.27, 0.585]], 9, 0, Y0, 0); // the cup: foot, stem, bowl (y -0.21 to 0.375)
    disc(g, GOLD, 0.24, 9,  0, 0.35, 0, -Math.PI / 2);                                           // the inside of the bowl, 2.5 cm under the rim
    for (const s of [-1, 1]) torus(g, GOLD, 0.09, 0.03, 4, 6, Math.PI, s * 0.24, 0.22, 0, 0, 0, -s * Math.PI / 2); // the handles (x to +-0.36)
    for (const s of [-1, 1]) box(g, DARK, 0.03, 0.56, 0.05, s * 0.285, -0.06, 0, 0, 0, s * 0.12); // the straps: from each handle down to the base step's edge
    return finish(g, opts);
  } },
  // 6. a WASHING MACHINE (a delivery's goods): a white machine on a pallet, its round porthole (chrome ring, dark glass) and control panel
  //    facing the tail, cardboard corner protectors up its edges, two ratchet straps of the car's colour over it. Box 1 x 0.8 x 1.2: the
  //    pallet on y -0.4, the straps' tops under y 0.38
  { id: 'cargo-washer', name: 'Washing machine', maxScale: 1.15, shape: 'box', colourFrom: 'mixed', build: (paint, opts) => {
    const g = new THREE.Group();
    const Z = 0.05, F = Z - 0.31;                                                               // the machine's centre along the bed, its front (tail) face
    for (const x of [-0.3, 0, 0.3]) box(g, WOOD, 0.1, 0.03, 0.7, x, -0.385, Z);                 // the pallet's runners (y -0.4 to -0.37)
    box(g, WOOD, 0.74, 0.04, 0.74, 0, -0.355, Z);                                               // its deck (y -0.375 to -0.335)
    box(g, WHITE, 0.62, 0.7, 0.62, 0, 0.005, Z);                                                // the machine (y -0.345 to 0.355)
    cyl(g, CHROME, 0.19, 0.19, 0.03, 0, -0.03, F - 0.005, 12, true, Math.PI / 2);              // the porthole's ring (1 cm into the face)
    disc(g, DARK, 0.178, 12, 0, -0.03, F - 0.012, 0, Math.PI);                                  // its dark glass, 7 mm in front of the face, inside the ring
    box(g, DARK, 0.56, 0.09, 0.02, 0, 0.27, F - 0.005);                                         // the control panel across the top
    cyl(g, CHROME, 0.035, 0.035, 0.03, 0.18, 0.27, F - 0.02, 6, false, Math.PI / 2);            // its knob
    box(g, CHROME, 0.16, 0.05, 0.02, -0.17, 0.27, F - 0.012);                                   // its soap drawer
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, CARDBOARD, 0.07, 0.705, 0.07, sx * 0.31, 0.0125, Z + sz * 0.31); // corner protectors (y -0.34 to 0.365)
    for (const dz of [-0.15, 0.15]) strap(g, paint, -0.32, 0.32, 0.362, -0.34, Z + dz, 0.03, 0.05); // the straps: over the top, down to the deck
    return finish(g, opts);
  } },
];
export const cargo2ById = (id) => MORE_CARGO_2.find(p => p.id === id) || null;
