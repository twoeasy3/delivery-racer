// ---- animated models ---------------------------------------------------------------------
// Vehicles with a look of their own (a car's "model" field in src/cars.js). Each builder
// takes the car's entry and returns a group, front facing local +z, with:
//   userData.body     the mesh whose material is the paint (so the livery can be swapped)
//   userData.animate  (seconds) => void: poses the model for that moment. It is called every
//                     frame the model is drawn, in the game and in the garage alike, so the
//                     animation loops for as long as the model is on screen.
//   userData.livery   optional, (evil) => void: shows the parts that differ between the Good
//                     and Evil liveries (beyond the paint), called whenever the paint is set
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// (returns [tyre, hub]; the hub is gold unless given a material of its own)
const wheel = (parent, radius, width, x, y, z, hubMaterial = lambert(0xe6c15a)) => {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), lambert(0x141414));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.04, 12), hubMaterial);
  for (const mesh of [tyre, hub]) {
    mesh.rotation.z = Math.PI / 2; // axle across the car
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return [tyre, hub];
};

// a flat panel tipped about the car's width: a windscreen, a fastback. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
// a solid block whose side view is the polygon `profile` ([z, y] points), `w` wide across the car
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); // (the profile's z along the car; extruded across it)
  geo.translate(x + w / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a solid whose side view is the curved THREE.Shape `shape` (x along the car, y up), `w` wide across it
// with its edges rounded off by `round`
const curved = (parent, material, w, shape, round) => {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: w - 2 * round, curveSegments: 14, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 3,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(w / 2 - round, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a windscreen (or a rear window), as `slab` tips it, made solid: the wedge under the glass, from its
// lower edge back (or forward) to beneath its upper edge, filled in, so there is no seeing through
// the car's sides past it
const screen = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = slab(parent, material, w, t, l, x, y, z, pitch);
  const dz = l / 2 * Math.cos(pitch), dy = l / 2 * Math.sin(pitch);
  const front = [z + dz, y - dy], back = [z - dz, y + dy]; // (its two edges, side on)
  const [high, low] = front[1] > back[1] ? [front, back] : [back, front];
  prism(parent, material, w, [low, high, [high[0], low[1]]], x);
  return mesh;
};
// a round lamp (or anything disc-shaped) facing along the car
const disc = (parent, material, r, depth, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 14), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
// an F1 car's second colour, by its paint number (see Traffic: paint)
export const F1_ACCENTS = [0xf4f4f4, 0x151515, 0xf2d21f, 0x1d4f9c, 0x18a35a, 0xe0701e, 0xc81f3a, 0x6fd0ff];
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
// where an ambulance's box body starts, ahead of its middle, as a share of its half length (its light
// bar sits on the front of the box's roof: render/cars.js)
export const AMBULANCE_BOX = 0.36;
// ---- what a police car and an ambulance wear on the road, whoever draws them (the game's traffic:
// render/cars.js; the menu's road card: render/levelcard3d.js). Neither model has these of its own.
// The paint a kind is always in, whoever drives it (a kind not here takes one of the traffic's paints, or its livery)
export const FIXED_PAINT = { police: 0xf5f5f5, ambulance: 0xf5f5f5, driveby: 0x3a1840 };
// The roof light bar: one lamp that flashes from colour to colour, on a dark housing (userData.mount) that
// only an ambulance shows (wider than the lamp, so its white flash shows on the white roof)
const barBox = new THREE.BoxGeometry(1, 1, 1);
export const makeLightBar = () => {
  const bar = new THREE.Mesh(barBox, new THREE.MeshBasicMaterial({ color: 0x2060ff }));
  bar.scale.set(1.3, 0.22, 0.35);
  bar.position.set(0, 1.85, -0.3);
  const mount = new THREE.Mesh(barBox, new THREE.MeshLambertMaterial({ color: 0x15171c }));
  mount.scale.set(1.12, 0.5, 1.7);
  mount.position.y = -0.55;
  bar.add(mount);
  bar.userData.mount = mount;
  return bar;
};
// ...put on the roof of a vehicle of `kind` (v: its { hl, height }), and shown only on a police car or an
// ambulance (an ambulance's at the front of its box's roof, just behind the cab)
export const placeLightBar = (bar, kind, v) => {
  const ambulance = kind === 'ambulance';
  bar.visible = kind === 'police' || ambulance;
  bar.userData.mount.visible = ambulance;
  bar.position.set(0, v.height + 0.1, ambulance ? v.hl * AMBULANCE_BOX - 0.25 : -0.15);
};
// ...and its colour at `ms` (n: a whole number of its own, so that no two cars flash together)
export const flashLightBar = (bar, kind, ms, n = 0) => {
  if (kind === 'police') bar.material.color.setHex(Math.floor(ms / 160 + n) % 2 ? 0xff2020 : 0x2060ff);
  else if (kind === 'ambulance') bar.material.color.setHex(Math.floor(ms / 110 + n) % 2 ? 0xff2020 : 0xffffff);
};

// an outboard motor clamped to a transom at (x, y, z), hanging down over the back (facing dir: 1 = the
// car's way): its cowling, its leg down into the water, and a propeller (returned, to be spun)
const outboard = (parent, x, y, z, dir = 1) => {
  box(parent, lambert(0x2a2c31), 0.36, 0.42, 0.5, x, y + 0.1, z - dir * 0.05);      // the cowling
  box(parent, lambert(0xf2f2f2), 0.37, 0.08, 0.51, x, y + 0.2, z - dir * 0.05);     // its white band
  box(parent, lambert(0x2a2c31), 0.12, 0.9, 0.16, x, y - 0.5, z - dir * 0.08);      // the leg
  const prop = new THREE.Group();
  prop.position.set(x, y - 0.9, z - dir * 0.2);
  parent.add(prop);
  for (let k = 0; k < 3; k++) box(prop, lambert(0xc9a227), 0.05, 0.3, 0.03, 0, 0, 0).rotation.z = k * Math.PI * 2 / 3;
  return prop;
};
// a boat's hull seen from above (plan: [x, z] points round it, x across the car and z along it), stood up
// `height` m from y: an extrusion of that outline, straight-sided
const hull = (parent, material, plan, y, height) => {
  const shape = new THREE.Shape(plan.map(([x, z]) => new THREE.Vector2(x, -z))); // (the shape's y is -z: see rotateX)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = y;
  parent.add(mesh);
  return mesh;
};
const CHROME_MAT = () => lambert(CHROME);
export const MODELS = {
  // A Formula 1 car: a long, low nose and monocoque in the livery, sidepods, the engine cover with
  // its fin, the halo over the cockpit, big front and rear wings in a second colour, four fat
  // tyres standing clear of the body. userData.accent(n) picks the second colour.
  f1: (car) => {
    const group = new THREE.Group();
    const l = car.hl * 2, paint = lambert(car.color), accent = lambert(0xf4f4f4), carbon = lambert(0x1b1b1e);
    const body = box(group, paint, 0.75, 0.42, l * 0.62, 0, 0.42, -l * 0.02);                   // monocoque
    box(group, paint, 0.4, 0.28, l * 0.3, 0, 0.36, l * 0.36);                                     // the nose
    for (const side of [-1, 1]) box(group, paint, 0.42, 0.36, l * 0.3, side * 0.55, 0.38, -l * 0.05); // sidepods
    box(group, paint, 0.5, 0.42, l * 0.28, 0, 0.72, -l * 0.18);                                   // engine cover...
    box(group, accent, 0.05, 0.36, l * 0.24, 0, 1.0, -l * 0.24);                                  // ...and its fin
    box(group, carbon, 0.42, 0.16, 0.5, 0, 0.72, l * 0.06);                                       // the cockpit
    box(group, lambert(0xf2d21f), 0.24, 0.24, 0.24, 0, 0.82, l * 0.02);                           // a helmet
    // the halo: a hoop round the cockpit, its two arms running from the engine cover behind the driver's
    // shoulders forward to a point ahead of the helmet, held up there by a pillar down to the monocoque
    const haloY = 0.99, back = -l * 0.045, tip = l * 0.125, arm = 0.25;
    for (const side of [-1, 1]) {
      const rail = box(group, carbon, 0.07, 0.07, Math.hypot(arm, tip - back) + 0.04, side * arm / 2, haloY, (back + tip) / 2);
      rail.rotation.y = Math.atan2(-side * arm, tip - back);
      box(group, carbon, 0.09, haloY - 0.9, 0.12, side * arm, (haloY + 0.9) / 2, back);        // (its mounts on the cover)
    }
    const foot = tip + 0.2, deck = 0.63; // (where the pillar meets the monocoque's top)
    slab(group, carbon, 0.07, 0.07, Math.hypot(foot - tip, haloY - deck) + 0.06, 0, (haloY + deck) / 2, (tip + foot) / 2, Math.atan2(haloY - deck, foot - tip));
    box(group, accent, 1.9, 0.05, 0.45, 0, 0.12, l * 0.5);                                         // front wing
    for (const side of [-1, 1]) box(group, accent, 0.05, 0.22, 0.5, side * 0.95, 0.2, l * 0.5);
    box(group, accent, 1.2, 0.08, 0.42, 0, 1.05, -l * 0.47);                                       // rear wing...
    for (const side of [-1, 1]) box(group, carbon, 0.05, 0.6, 0.45, side * 0.6, 0.8, -l * 0.47);  // ...on its end plates
    const wheels = [];
    for (const [z, r, w] of [[l * 0.33, 0.33, 0.36], [-l * 0.33, 0.37, 0.44]]) {
      for (const side of [-1, 1]) wheels.push(...wheel(group, r, w, side * 0.78, r, z, lambert(0x8a8f96)));
    }
    group.userData = {
      body,
      animate: (t) => { for (const w of wheels) w.rotation.x = t * 30; },
      accent: (n) => accent.color.setHex(F1_ACCENTS[n % F1_ACCENTS.length]),
    };
    return group;
  },
  // A Le Mans prototype: low and wide, its wheels shut in under four pontoon wings joined by the sidepods, a
  // narrow tub between them with a glass bubble of a cockpit, the engine cover running back from it under a
  // shark fin to a wing right across the tail; lamps in the front wings' noses. In the livery, with a second
  // colour (userData.accent(n), as an F1 car's) on its fin, wing, nose and mirrors.
  lmp: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.34;
    const paint = lambert(car.color), accent = lambert(0xf4f4f4), carbon = lambert(0x1b1b1e), glass = lambert(GLASS);
    const body = prism(group, paint, w * 0.52, [[-L, 0.2], [L * 0.98, 0.2], [L, 0.32], [L * 0.42, 0.56], [-L * 0.9, 0.66], [-L, 0.5]]); // the tub
    prism(group, glass, w * 0.4, [[L * 0.42, 0.55], [L * 0.14, 0.98], [-L * 0.1, 1.0], [-L * 0.16, 0.6]]);             // the cockpit's bubble
    box(group, paint, w * 0.3, 0.04, L * 0.24, 0, 1.01, L * 0.02);                                                     // its roof
    prism(group, paint, w * 0.34, [[-L * 0.1, 1.0], [-L * 0.84, 0.7], [-L * 0.84, 0.6], [-L * 0.1, 0.6]]);             // the engine cover
    prism(group, accent, 0.05, [[-L * 0.14, 1.0], [-L * 0.2, 1.2], [-L * 0.86, 1.2], [-L * 0.86, 0.7]]);               // the shark fin
    box(group, carbon, 0.16, 0.14, 0.3, 0, 1.1, -L * 0.02);                                                            // the roof's air intake
    slab(group, accent, w * 0.2, 0.02, L * 0.5, 0, 0.455, L * 0.7, Math.atan2(0.24, L * 0.58));                        // a stripe down the nose
    const wheels = [];
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.26);
      prism(group, paint, 0.5, [[L, 0.2], [L, 0.42], [L * 0.76, 0.78], [L * 0.42, 0.78], [L * 0.3, 0.5], [L * 0.3, 0.2]], x);       // the front wing over its wheel,
      prism(group, paint, 0.5, [[-L * 0.3, 0.2], [-L * 0.3, 0.5], [-L * 0.42, 0.84], [-L * 0.92, 0.84], [-L, 0.62], [-L, 0.2]], x); // the rear one,
      box(group, paint, 0.42, 0.3, L * 0.62, x, 0.37, 0);                                                              // and the sidepod between
      box(group, carbon, 0.3, 0.16, 0.05, x, 0.42, L * 0.3 - 0.02);                                                    // (its radiator's mouth)
      slab(group, LAMP, 0.34, 0.03, 0.26, x, 0.56, L * 0.9, Math.atan2(0.36, L * 0.24));                               // lamps in the wing's nose
      box(group, TAIL, 0.06, 0.34, 0.05, side * (w / 2 - 0.08), 0.56, -L - 0.01);                                      // tall thin tail lamps
      box(group, accent, 0.16, 0.08, 0.12, side * w * 0.27, 0.82, L * 0.3);                                            // mirrors
      box(group, carbon, 0.05, 0.5, 0.5, side * (w / 2 - 0.04), 1.02, -L + 0.1);                                       // the wing's end plates
      wheels.push(...wheel(group, R, 0.3, side * (w / 2 - 0.13), R, L * 0.6, lambert(0x8a8f96)));
      wheels.push(...wheel(group, R + 0.02, 0.32, side * (w / 2 - 0.13), R + 0.02, -L * 0.62, lambert(0x8a8f96)));
    }
    box(group, accent, w - 0.08, 0.06, 0.42, 0, 1.22, -L + 0.1);                                                       // the rear wing
    box(group, carbon, w * 0.98, 0.05, 0.3, 0, 0.2, L - 0.05);                                                         // the splitter
    box(group, carbon, w * 0.5, 0.18, 0.2, 0, 0.3, -L + 0.02);                                                         // the diffuser
    group.userData = {
      body,
      animate: (t) => { for (const wh of wheels) wh.rotation.x = t * 30; },
      accent: (n) => accent.color.setHex(F1_ACCENTS[n % F1_ACCENTS.length]),
    };
    return group;
  },
  // A GT road car, raced: one of three shapes, by its paint number (userData.style(n)): a
  // front-engined grand tourer (a long bonnet, the cabin set back, a fastback), a rear-engined
  // coupe (a short sloping nose, the roof running down to the tail, a whale tail) or a mid-engined
  // wedge (a low nose, the cabin forward, a louvred engine deck behind it, intakes in its flanks).
  // Each is a side profile in the livery, a glasshouse on it, a white roundel on each door, a
  // splitter, a diffuser, lamps, and big wheels in dark alloys.
  gt: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36; // (L: half its length; the profiles are drawn for 2.3, and scaled)
    const paint = lambert(car.color), glass = lambert(GLASS), dark = lambert(0x16171a), white = lambert(0xf4f4f4);
    const alloy = lambert(0x3a3d44);
    const k = L / 2.3, at = (pts) => pts.map(([z, y]) => [z * k, y]);
    const styles = [], wheels = [];
    const SHAPES = [
      { // front-engined grand tourer
        body: [[-2.3, 0.3], [2.3, 0.3], [2.33, 0.55], [2.2, 0.72], [0.5, 0.82], [-1.6, 0.86], [-2.3, 0.8], [-2.33, 0.45]],
        glass: [[0.52, 0.8], [-0.2, 1.2], [-0.95, 1.22], [-1.95, 0.84], [-1.95, 0.8]],
        roof: [-0.2, -0.95, 1.2], lamps: 0.62, tails: 0.7, stripes: true,
      },
      { // rear-engined coupe
        body: [[-2.3, 0.32], [2.3, 0.32], [2.33, 0.52], [2.05, 0.7], [0.9, 0.8], [0.55, 0.84], [-1.7, 0.86], [-2.3, 0.68], [-2.33, 0.42]],
        glass: [[0.6, 0.82], [0.0, 1.24], [-0.7, 1.26], [-2.0, 0.84], [-2.0, 0.8]],
        roof: [0.0, -0.7, 1.24], lamps: 0.64, tails: 0.62, whale: true, blackRoof: true,
      },
      { // mid-engined wedge
        body: [[-2.3, 0.3], [2.3, 0.3], [2.34, 0.44], [1.0, 0.68], [-1.1, 0.84], [-2.3, 0.84], [-2.33, 0.4]],
        glass: [[1.05, 0.66], [0.25, 1.06], [-0.45, 1.08], [-1.05, 0.9], [-1.05, 0.78]],
        roof: [0.25, -0.45, 1.06], lamps: 0.5, tails: 0.66, louvres: true, wing: true,
      },
    ];
    let body = null;
    for (const S of SHAPES) {
      const g = new THREE.Group();
      group.add(g);
      styles.push(g);
      const shell = prism(g, paint, w, at(S.body));
      body ||= shell;
      // the glasshouse: the windscreen and side windows up to the back of the roof; behind it the
      // fastback (or the engine cover's buttresses) in the livery, a rear window set into it
      const [r0, r1, ry] = S.roof, [tz, ty] = S.glass[S.glass.length - 2], base = S.glass[S.glass.length - 1][1];
      prism(g, glass, w * 0.78, at([...S.glass.slice(0, 3), [r1, base]]));
      prism(g, paint, w * 0.8, at([[r1, ry], [tz, ty], [tz, base], [r1, base]]));
      box(g, paint, w * 0.8, 0.05, (r0 - r1) * k, 0, ry + 0.02, (r0 + r1) / 2 * k); // (the roof)
      const run = (r1 - tz) * k, rise = ry - ty;
      slab(g, glass, w * 0.56, 0.03, Math.hypot(run, rise) * 0.78, 0, (ry + ty) / 2 + 0.02, (r1 + tz) / 2 * k, -Math.atan2(rise, run));
      box(g, dark, w * 0.92, 0.07, 0.3, 0, 0.3, L - 0.1);                          // splitter
      box(g, dark, w * 0.84, 0.16, 0.25, 0, 0.36, -L + 0.08);                       // diffuser
      box(g, dark, w * 1.01, 0.1, L * 1.1, 0, 0.38, 0);                             // sills
      // (told apart at a glance, from behind and above: the tourer's twin white stripes nose to tail, the
      // coupe's black roof, wide hips and whale tail, the wedge's black engine deck and tall full-width wing)
      if (S.stripes) {
        for (const side of [-1, 1]) {
          const x = side * w * 0.13, sw = w * 0.13;
          slab(g, white, sw, 0.02, 1.72 * k, x, 0.785, 1.35 * k, Math.atan2(0.1, 1.7 * k)); // down the bonnet,
          box(g, white, sw, 0.02, (r0 - r1) * k, x, ry + 0.055, (r0 + r1) / 2 * k);          // over the roof,
          box(g, white, sw, 0.02, 0.72 * k, x, 0.85, -1.95 * k);                             // and across the boot
        }
        box(g, paint, w * 0.9, 0.07, 0.16, 0, 0.88, -L + 0.06);                              // a ducktail
      }
      if (S.blackRoof) box(g, dark, w * 0.74, 0.03, (r0 - r1) * k + 0.1, 0, ry + 0.055, (r0 + r1) / 2 * k);
      if (S.whale) { // a whale tail on the engine lid, and the wide hips over the rear wheels
        box(g, paint, w * 0.98, 0.07, 0.5, 0, 1.0, -L * 0.83);
        box(g, dark, w * 0.98, 0.04, 0.1, 0, 1.03, -L * 0.83 - 0.24);
        for (const side of [-1, 1]) {
          box(g, dark, 0.05, 0.14, 0.3, side * w * 0.3, 0.92, -L * 0.83);
          box(g, paint, 0.14, 0.34, L * 0.62, side * (w / 2 + 0.03), 0.62, -L * 0.6);
        }
      }
      if (S.wing) { // a black engine deck, and a tall wing right across the tail between end plates
        box(g, dark, w * 0.72, 0.03, 1.15 * k, 0, 0.855, -1.7 * k);
        box(g, dark, w * 1.04, 0.05, 0.4, 0, 1.24, -L + 0.12);
        for (const side of [-1, 1]) {
          box(g, paint, 0.05, 0.46, 0.5, side * w * 0.52, 1.08, -L + 0.12);
          box(g, dark, 0.06, 0.38, 0.1, side * w * 0.26, 1.04, -L + 0.14);
        }
        box(g, dark, w * 0.3, 0.1, 0.5 * k, 0, 1.12, -0.1 * k);                              // a roof scoop
      }
      if (S.louvres) { // the engine deck's louvres, and intakes in its flanks
        for (let i = 0; i < 4; i++) box(g, dark, w * 0.56, 0.03, 0.08, 0, 0.86, -L * (0.55 + i * 0.09));
        for (const side of [-1, 1]) box(g, dark, 0.04, 0.2, 0.55, side * (w / 2 + 0.005), 0.62, -L * 0.3);
        box(g, paint, w * 0.9, 0.04, 0.2, 0, 0.9, -L * 0.95);                       // a lip spoiler
      }
      for (const side of [-1, 1]) {
        // lamps of its own: the tourer's wide oblong headlamps and twin round tail lamps a side; the coupe's
        // round headlamps and one red bar right across its tail; the wedge's thin slits of headlamps and tall
        // red blades at the corners of its tail
        if (S.stripes) {
          box(g, LAMP, w * 0.26, 0.1, 0.08, side * w * 0.32, S.lamps, L + 0.02);
          for (const x of [0.2, 0.38]) disc(g, TAIL, 0.085, 0.08, side * w * x, S.tails, -L - 0.02);
        } else if (S.whale) {
          disc(g, LAMP, 0.11, 0.08, side * w * 0.34, S.lamps, L - 0.04);
          disc(g, dark, 0.14, 0.06, side * w * 0.34, S.lamps, L - 0.06);
          if (side > 0) box(g, TAIL, w * 0.94, 0.06, 0.08, 0, S.tails, -L - 0.02);
        } else {
          box(g, LAMP, w * 0.3, 0.035, 0.08, side * w * 0.3, 0.45, L + 0.03);
          box(g, TAIL, 0.07, 0.22, 0.08, side * w * 0.44, S.tails, -L - 0.02);
          box(g, TAIL, 0.07, 0.22, 0.08, side * w * 0.34, S.tails, -L - 0.02);
        }
        const roundel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16), white); // (its race number's disc)
        roundel.rotation.z = Math.PI / 2;
        roundel.position.set(side * (w / 2 + 0.01), 0.6, -L * 0.05);
        g.add(roundel);
      }
    }
    for (const z of [L * 0.62, -L * 0.62]) {
      for (const side of [-1, 1]) wheels.push(...wheel(group, R, 0.3, side * (w / 2 - 0.02), R, z, alloy));
    }
    group.userData = {
      body,
      animate: (t) => { for (const wh of wheels) wh.rotation.x = t * 30; },
      style: (n) => styles.forEach((g, i) => { g.visible = i === n % styles.length; }),
    };
    group.userData.style(0);
    return group;
  },
  // A drive-by car (The Hood): a long, low 80s sedan in deep plum, blacked-out windows all round, chrome
  // bumpers and a chrome strip down each side, gold wire wheels with whitewalls; firing, a gun barrel pokes
  // out of each rear window (userData.firing(on))
  driveby: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const paint = lambert(car.color), tint = lambert(0x0b0b10), chrome = lambert(CHROME), white = lambert(0xf1f1ee);
    const body = box(group, paint, w, 0.5, l, 0, 0.6, 0);
    box(group, paint, w * 0.96, 0.08, l * 0.32, 0, 0.88, l * 0.32);                // the long bonnet
    box(group, paint, w * 0.96, 0.08, l * 0.22, 0, 0.88, -l * 0.38);               // and boot
    box(group, tint, w * 0.88, 0.5, l * 0.38, 0, 1.15, -l * 0.04);                 // the glasshouse, blacked out
    box(group, paint, w * 0.9, 0.08, l * 0.36, 0, 1.43, -l * 0.04);                // a flat roof
    screen(group, tint, w * 0.86, 0.04, 0.6, 0, 1.12, l * 0.17, 0.75);             // the windscreen
    screen(group, tint, w * 0.86, 0.04, 0.5, 0, 1.12, -l * 0.25, -0.85);           // the rear window
    box(group, chrome, w + 0.06, 0.14, 0.14, 0, 0.42, l / 2 + 0.03);               // chrome bumpers,
    box(group, chrome, w + 0.06, 0.14, 0.14, 0, 0.42, -l / 2 - 0.03);
    box(group, chrome, w * 0.6, 0.22, 0.04, 0, 0.66, l / 2 + 0.01);                 // a big grille,
    for (const side of [-1, 1]) {
      box(group, chrome, 0.03, 0.05, l * 0.9, side * (w / 2 + 0.01), 0.68, 0);       // the side strips
      box(group, LAMP, w * 0.16, 0.12, 0.04, side * w * 0.36, 0.66, l / 2 + 0.02);   // square headlamps
      box(group, TAIL, w * 0.2, 0.14, 0.04, side * w * 0.34, 0.66, -l / 2 - 0.02);
      for (const z of [l * 0.31, -l * 0.31]) {
        wheel(group, R, 0.26, side * (w / 2 - 0.04), R, z);                          // (gold hubs)
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.78, R * 0.78, 0.27, 16), white); // whitewalls
        wall.rotation.z = Math.PI / 2;
        wall.position.set(side * (w / 2 - 0.04), R, z);
        group.add(wall);
      }
    }
    const guns = [-1, 1].map(side => { // (out of each rear window)
      const gun = box(group, lambert(0x1a1a1a), 0.5, 0.08, 0.08, side * (w / 2 + 0.18), 1.12, -l * 0.12);
      gun.visible = false;
      return gun;
    });
    group.userData = {
      body,
      animate: () => {},
      firing: (on) => { for (const gun of guns) gun.visible = on; },
    };
    return group;
  },
  // A fishing trawler, sat in the water: a deep hull in the livery with a raked bow and a white gunwale, a
  // white wheelhouse aft with its funnel, a mast forward and a boom out over the stern with its net drum.
  // It rolls slowly on the swell.
  trawler: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, f = l / 2;
    const paint = lambert(car.color), white = lambert(0xf2f2f0), dark = lambert(0x1b1d22), glass = lambert(GLASS), wood = lambert(0x8a6a45), rust = lambert(0xb5532a);
    const body = prism(shell, paint, w, [[-f, -0.4], [f * 0.72, -0.4], [f, 1.15], [-f, 0.9]]);          // the hull
    for (const side of [-1, 1]) prism(shell, white, 0.12, [[-f, 0.8], [f * 0.97, 1.02], [f, 1.2], [-f, 0.95]], side * w / 2); // its gunwales
    prism(shell, wood, w * 0.9, [[-f * 0.98, 0.9], [f * 0.9, 1.12], [f * 0.9, 1.16], [-f * 0.98, 0.94]]);  // the deck
    const hz = -f * 0.45;                                                                                // the wheelhouse
    box(shell, white, w * 0.7, 1.3, l * 0.24, 0, 1.55, hz);
    box(shell, glass, w * 0.72, 0.4, l * 0.2, 0, 1.85, hz + 0.08);
    box(shell, dark, w * 0.78, 0.08, l * 0.28, 0, 2.24, hz);
    box(shell, rust, 0.4, 0.8, 0.4, 0, 2.6, hz - 0.3);                                                   // the funnel
    box(shell, dark, 0.42, 0.14, 0.42, 0, 2.95, hz - 0.3);
    box(shell, dark, 0.12, 2.6, 0.12, 0, 2.2, f * 0.35);                                                 // the mast,
    box(shell, dark, 1.4, 0.08, 0.08, 0, 2.9, f * 0.35);                                                 // its yard
    slab(shell, dark, 0.1, 0.1, l * 0.36, 0, 1.75, -f * 0.82, 0.5);                                      // the boom aft
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, w * 0.6, 12), lambert(0x2f6f4a));   // and its net drum
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 1.3, -f * 0.8);
    shell.add(drum);
    for (const side of [-1, 1]) {
      box(shell, rust, 0.5, 0.35, 0.7, side * w * 0.26, 1.1, f * 0.08);                                  // fish crates on deck
      box(shell, TAIL, 0.1, 0.1, 0.04, side * w * 0.4, 0.7, -f - 0.01);
    }
    group.userData = {
      body,
      animate: (t) => { // (heavy: a slow roll and pitch)
        shell.position.y = Math.sin(t * 2.1) * 0.08;
        shell.rotation.x = Math.sin(t * 1.7) * 0.03;
        shell.rotation.z = Math.sin(t * 1.3) * 0.045;
      },
    };
    return group;
  },
  // A sleek sports cruiser, sat in the water (its hull's bottom under the surface): a long white
  // hull, pointed at the bow, with a stripe in the livery down its side; a raised foredeck, and
  // amidships the captain's cabin: a raked windshield, a hardtop roof on slim pillars, glass round
  // the sides, and the captain at the wheel; a swim platform and the jet's nozzle at the stern.
  // It bobs on the swell, pitching and rolling a little.
  jetboat: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, front = l / 2;
    const white = lambert(0xf2f2f0), paint = lambert(car.color), dark = lambert(0x1b1d22), glass = lambert(GLASS), chrome = lambert(CHROME);
    // the hull, seen from above: square at the stern, sweeping in to a point at the bow, extruded down
    const plan = (scale, inset = 0) => {
      const shape = new THREE.Shape(), hw = w / 2 * scale - inset;
      shape.moveTo(-hw, -front + inset);
      for (const [x, z] of [[hw, -front + inset], [hw, front * 0.15], [hw * 0.72, front * 0.7], [0, front - inset]]) shape.lineTo(x, z);
      shape.lineTo(-hw * 0.72, front * 0.7);
      shape.lineTo(-hw, front * 0.15);
      shape.closePath();
      return shape;
    };
    const slabOf = (shape, from, to, material) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: to - from, bevelEnabled: false, curveSegments: 4 });
      geometry.rotateX(Math.PI / 2); // (the plan's z along the car, extruded downwards)
      geometry.translate(0, to, 0);
      const mesh = new THREE.Mesh(geometry, material);
      shell.add(mesh);
      return mesh;
    };
    slabOf(plan(1), -0.3, 0.5, white);                                                   // the hull
    const body = slabOf(plan(1.015), 0.24, 0.36, paint);                                 // its stripe, in the livery
    slabOf(plan(0.96, 0.05), 0.5, 0.56, lambert(0xe2dccf));                              // the teak deck
    prism(shell, white, w * 0.62, [[front * 0.15, 0.56], [front * 0.75, 0.56], [front * 0.15, 0.8]]); // the raised foredeck
    // the captain's cabin
    const cabFront = front * 0.18, cabBack = -front * 0.42, roof = 1.55;
    box(shell, white, w * 0.86, 0.36, cabFront - cabBack, 0, 0.74, (cabFront + cabBack) / 2); // its lower walls
    screen(shell, glass, w * 0.82, 0.04, 0.72, 0, 1.22, cabFront - 0.2, 0.95);           // the raked windshield
    box(shell, white, w * 0.9, 0.07, cabFront - cabBack + 0.25, 0, roof, (cabFront + cabBack) / 2 - 0.12); // the hardtop roof
    for (const side of [-1, 1]) {
      box(shell, glass, 0.03, 0.55, (cabFront - cabBack) * 0.75, side * w * 0.43, 1.2, (cabFront + cabBack) / 2 - 0.05); // side glass
      box(shell, white, 0.06, 0.62, 0.06, side * w * 0.42, 1.22, cabBack - 0.15);        // the roof's rear pillars
      box(shell, chrome, 0.03, 0.03, front * 0.4, side * w * 0.24, 0.95, front * 0.48);  // the bow rails
      box(shell, TAIL, 0.08, 0.08, 0.04, side * w * 0.4, 0.45, -front - 0.01);
    }
    box(shell, glass, w * 0.7, 0.4, 0.03, 0, 1.2, cabBack - 0.13);                       // the back of the cabin, glass
    box(shell, dark, 0.34, 0.5, 0.3, -0.3, 0.96, -front * 0.08);                         // the captain: sat at the wheel...
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lambert(0xe0b48c));     // ...the head...
    head.position.set(-0.3, 1.32, -front * 0.08);
    shell.add(head);
    box(shell, lambert(0xf4f4f4), 0.3, 0.08, 0.3, -0.3, 1.45, -front * 0.08);            // ...and cap
    box(shell, dark, 0.06, 0.25, 0.06, -0.3, 1.0, cabFront - 0.45);                      // the wheel's column
    box(shell, dark, w * 0.96, 0.05, 0.45, 0, 0.08, -front - 0.2);                       // the swim platform
    disc(shell, dark, 0.18, 0.3, 0, 0.0, -front - 0.15);                                 // the jet's nozzle
    group.userData = {
      body,
      animate: (t) => { // bobbing on the chop: quick, and never quite the same twice
        shell.position.y = Math.sin(t * 6.1) * 0.07 + Math.sin(t * 9.7 + 1) * 0.025;
        shell.rotation.x = Math.sin(t * 4.4) * 0.035 + Math.sin(t * 7.3) * 0.01;
        shell.rotation.z = Math.sin(t * 3.4) * 0.03;
      },
    };
    return group;
  },

  // A police cruiser: a big late-90s sedan in black and white (the paint is the white: its doors and
  // roof), a push bar on the nose and a spotlight by the windscreen. Its light bar is the traffic
  // mesh's own (render/cars.js), on the roof
  police: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.34;
    const paint = lambert(car.color), black = lambert(0x121316), glass = lambert(GLASS), trim = lambert(TRIM);
    const steel = lambert(0x8a8f96);
    box(group, black, w, 0.46, l, 0, 0.6, 0);                                          // the black body...
    const body = box(group, paint, w + 0.02, 0.44, l * 0.42, 0, 0.62, -l * 0.02);       // ...its white doors
    box(group, black, w * 0.94, 0.12, l * 0.27, 0, 0.88, l * 0.33);                    // bonnet
    box(group, black, w * 0.94, 0.1, l * 0.2, 0, 0.87, -l * 0.38);                     // boot
    box(group, glass, w * 0.86, 0.42, l * 0.44, 0, 1.06, -l * 0.03);                   // the glasshouse
    box(group, paint, w * 0.88, 0.07, l * 0.36, 0, 1.3, -l * 0.04);                    // white roof
    screen(group, glass, w * 0.84, 0.05, 0.62, 0, 1.06, l * 0.22, 0.6);                  // windscreen
    screen(group, glass, w * 0.84, 0.05, 0.5, 0, 1.05, -l * 0.26, -0.55);                // rear window
    for (const side of [-1, 1]) {
      for (const z of [0.15, -0.02, -0.2]) box(group, black, 0.07, 0.42, 0.08, side * w * 0.44, 1.06, l * z); // pillars
      box(group, LAMP, w * 0.24, 0.13, 0.06, side * w * 0.3, 0.72, l / 2 + 0.01);      // headlamps
      box(group, TAIL, w * 0.26, 0.12, 0.06, side * w * 0.3, 0.74, -l / 2 - 0.01);
      box(group, trim, 0.05, 0.5, 0.06, side * w * 0.3, 0.55, l / 2 + 0.24);           // the push bar's uprights
      wheel(group, R, 0.26, side * (w / 2 - 0.05), R, l * 0.31, steel);
      wheel(group, R, 0.26, side * (w / 2 - 0.05), R, -l * 0.31, steel);
    }
    box(group, trim, w * 0.7, 0.08, 0.06, 0, 0.72, l / 2 + 0.25);                      // the push bar
    box(group, trim, w * 0.7, 0.08, 0.06, 0, 0.42, l / 2 + 0.25);
    box(group, trim, w * 0.4, 0.14, 0.05, 0, 0.66, l / 2 + 0.02);                      // grille
    disc(group, lambert(CHROME), 0.08, 0.14, -w * 0.47, 1.18, l * 0.2);                // the spotlight
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.42, l / 2 + 0.03);                     // bumpers
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.42, -l / 2 - 0.03);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A city bus: a long, tall box in the livery with a white roof, a dark band of windows all round,
  // a tall windscreen under a glowing destination sign, folding doors on the kerb side, and six
  // big wheels. (The traffic bus, and the secret City Bus you can drive)
  citybus: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, h = car.height, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), white = lambert(0xf1f1ee), black = lambert(0x16171a);
    const steel = lambert(0x8a8f96);
    const body = box(group, paint, w, h - 0.45, l, 0, 0.45 + (h - 0.45) / 2, 0);       // the body
    box(group, white, w * 0.97, 0.12, l * 0.98, 0, h + 0.03, 0);                        // white roof
    box(group, glass, w + 0.02, 0.95, l * 0.84, 0, h - 0.95, -l * 0.04);                // the window band...
    for (let i = 1; i < 7; i++) {                                                         // ...split into windows
      for (const side of [-1, 1]) box(group, paint, 0.04, 0.95, 0.12, side * (w / 2 + 0.01), h - 0.95, -l * 0.46 + i * l * 0.12);
    }
    box(group, glass, w * 0.9, 1.5, 0.05, 0, h - 1.15, l / 2 + 0.01);                   // the tall windscreen
    box(group, new THREE.MeshBasicMaterial({ color: 0xffb21a }), w * 0.7, 0.26, 0.05, 0, h - 0.22, l / 2 + 0.02); // destination sign
    box(group, glass, w * 0.8, 0.7, 0.05, 0, h - 0.95, -l / 2 - 0.01);                  // rear window
    box(group, black, 0.04, 1.9, 0.9, -(w / 2 + 0.01), 1.4, l * 0.36);                  // the front doors (kerb side)...
    box(group, black, 0.04, 1.9, 0.9, -(w / 2 + 0.01), 1.4, -l * 0.08);                 // ...and the middle ones
    box(group, white, w + 0.03, 0.18, l * 0.9, 0, 1.0, -l * 0.02);                     // a white stripe along
    for (const side of [-1, 1]) {
      box(group, LAMP, w * 0.16, 0.18, 0.06, side * w * 0.36, 0.75, l / 2 + 0.02);     // headlamps
      box(group, TAIL, w * 0.12, 0.3, 0.06, side * w * 0.4, 0.9, -l / 2 - 0.02);
      box(group, black, 0.12, 0.3, 0.1, side * (w / 2 + 0.08), h - 0.8, l / 2 - 0.1); // mirrors
      wheel(group, R, 0.34, side * (w / 2 - 0.12), R, l * 0.34, steel);
      for (const z of [-0.26, -0.36]) wheel(group, R, 0.34, side * (w / 2 - 0.12), R, l * z, steel);
    }
    box(group, black, w + 0.04, 0.3, 0.14, 0, 0.45, l / 2 + 0.04);                     // bumpers
    box(group, black, w + 0.04, 0.3, 0.14, 0, 0.45, -l / 2 - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // An ambulance: a short cab up front and a tall box body behind it, white (the paint), with a red
  // band and a red cross on each side and the back. Its light bar is the traffic mesh's own, on the
  // front of the box's roof, just behind the cab (render/cars.js: AMBULANCE_BOX)
  ambulance: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, h = car.height, R = 0.4;
    const paint = lambert(car.color), red = lambert(0xd8202a), glass = lambert(GLASS), trim = lambert(TRIM);
    const steel = lambert(0x8a8f96);
    const front = car.hl * AMBULANCE_BOX;                                                 // where the box starts
    const body = box(group, paint, w, h - 0.5, l / 2 + front, 0, 0.5 + (h - 0.5) / 2, (front - l / 2) / 2); // the box
    const nose = l * 0.38;                                                                // where the cab ends
    box(group, paint, w * 0.94, 1.1, nose - front, 0, 1.05, (front + nose) / 2);        // the cab...
    box(group, paint, w * 0.9, 0.55, l / 2 - nose, 0, 0.78, (nose + l / 2) / 2);         // ...its stubby bonnet
    screen(group, glass, w * 0.84, 0.05, 0.62, 0, 1.3, nose + 0.06, 0.35);                 // and windscreen
    for (const side of [-1, 1]) {
      box(group, glass, 0.04, 0.42, (nose - front) * 0.7, side * (w * 0.47 + 0.01), 1.35, (front + nose) / 2 + 0.05); // cab side windows
      box(group, red, 0.03, 0.22, l / 2 + front, side * (w / 2 + 0.01), 1.1, (front - l / 2) / 2); // red band
      box(group, red, 0.03, 0.62, 0.2, side * (w / 2 + 0.015), h - 0.75, -l * 0.15);     // the red cross
      box(group, red, 0.03, 0.2, 0.62, side * (w / 2 + 0.015), h - 0.75, -l * 0.15);
      box(group, LAMP, w * 0.18, 0.16, 0.06, side * w * 0.32, 0.8, l / 2 + 0.01);        // headlamps
      box(group, TAIL, w * 0.1, 0.3, 0.06, side * w * 0.42, 1.0, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.1), R, l * 0.32, steel);
      wheel(group, R, 0.3, side * (w / 2 - 0.1), R, -l * 0.3, steel);
    }
    box(group, red, 0.62, 0.2, 0.03, 0, h - 0.75, -l / 2 - 0.02);                       // a cross on the back doors
    box(group, red, 0.2, 0.62, 0.03, 0, h - 0.75, -l / 2 - 0.02);
    box(group, trim, 0.03, h - 0.7, 0.04, 0, 0.5 + (h - 0.7) / 2, -l / 2 - 0.015);      // the back doors' split
    box(group, trim, w + 0.04, 0.18, 0.14, 0, 0.45, l / 2 + 0.03);                     // bumpers
    box(group, trim, w + 0.04, 0.18, 0.14, 0, 0.45, -l / 2 - 0.03);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A vintage delivery van (a 1930s Ford panel truck, more or less): a tall box body with a cream
  // sign panel down each side, an upright cab, a long narrow bonnet behind a tall chrome grille,
  // round headlamps on stalks, separate black mudguards and running boards, cream-spoked wheels
  deliveryvan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const paint = lambert(car.color), glass = lambert(GLASS), black = lambert(0x161616), chrome = lambert(CHROME);
    const cream = lambert(0xf0e2bd);
    const body = box(group, paint, w * 0.96, 1.55, l * 0.6, 0, 1.38, -l * 0.2);       // the box body
    box(group, paint, w * 0.9, 1.5, l * 0.17, 0, 1.36, l * 0.175);                     // the cab
    box(group, glass, w * 0.92, 0.48, l * 0.13, 0, 1.78, l * 0.18);                    // its side windows
    box(group, glass, w * 0.76, 0.5, 0.05, 0, 1.78, l * 0.262);                        // the upright windscreen
    box(group, black, w * 0.99, 0.1, l * 0.78, 0, 2.2, -l * 0.115);                    // the roof
    box(group, paint, w * 0.46, 0.5, l * 0.19, 0, 1.12, l * 0.355);                    // the long, narrow bonnet
    box(group, chrome, w * 0.4, 0.66, 0.08, 0, 1.08, l * 0.45);                        // the tall grille
    box(group, chrome, 0.08, 0.08, 0.08, 0, 1.43, l * 0.43);                           // radiator cap
    box(group, chrome, w * 0.86, 0.1, 0.1, 0, 0.5, l / 2 - 0.02);                      // front bumper
    box(group, black, w * 0.9, 0.16, 0.1, 0, 0.62, -l / 2 + 0.02);                     // rear bumper
    for (const side of [-1, 1]) {
      box(group, cream, 0.02, 0.72, l * 0.46, side * (w * 0.48 + 0.01), 1.5, -l * 0.2); // the sign panel...
      box(group, black, 0.025, 0.05, l * 0.48, side * (w * 0.48 + 0.012), 1.9, -l * 0.2); // ...edged above
      box(group, black, 0.025, 0.05, l * 0.48, side * (w * 0.48 + 0.012), 1.1, -l * 0.2); // ...and below
      // the front mudguard sweeping down to the running board, and the rear one over its wheel
      box(group, black, w * 0.2, 0.08, l * 0.17, side * w * 0.39, 0.92, l * 0.33);
      slab(group, black, w * 0.2, 0.08, l * 0.1, side * w * 0.39, 0.74, l * 0.43, 0.75);
      slab(group, black, w * 0.2, 0.08, l * 0.09, side * w * 0.39, 0.72, l * 0.215, -0.75);
      box(group, black, w * 0.16, 0.06, l * 0.12, side * w * 0.41, 0.56, l * 0.13);     // running board
      box(group, black, 0.16, 0.36, l * 0.2, side * (w * 0.48 + 0.06), 0.88, -l * 0.3); // rear mudguard
      box(group, chrome, 0.05, 0.3, 0.05, side * w * 0.3, 1.0, l * 0.43);              // a headlamp's stalk...
      disc(group, chrome, 0.19, 0.16, side * w * 0.3, 1.2, l * 0.43);                  // ...its shell...
      disc(group, LAMP, 0.15, 0.04, side * w * 0.3, 1.2, l * 0.43 + 0.09);             // ...and lamp
      disc(group, TAIL, 0.08, 0.05, side * w * 0.4, 0.95, -l / 2 - 0.01);              // round tail lamps
      box(group, chrome, 0.1, 0.1, 0.12, side * (w * 0.46 + 0.06), 1.72, l * 0.25);    // mirrors
      box(group, black, 0.02, 1.3, 0.04, side * w * 0.003, 1.38, -l / 2 - 0.005);     // the rear doors' split
      wheel(group, R, 0.24, side * (w / 2 - 0.16), R, l * 0.33, cream);
      wheel(group, R, 0.24, side * (w / 2 - 0.12), R, -l * 0.3, cream);
    }
    box(group, glass, w * 0.6, 0.36, 0.04, 0, 1.75, -l / 2 - 0.01);                   // the rear doors' windows
    group.userData = { body, animate: () => {} };
    return group;
  },
  // An 18-wheeler: a cab-over prime mover in the livery, its sleeper and wind fairing on top,
  // chrome stacks behind, and a long white box trailer on three axles
  semi: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, cabL = 3.4, front = l / 2;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), steel = lambert(0xb8bcc4);
    const chrome = lambert(CHROME), white = lambert(0xf1f1ee);
    const body = box(group, paint, w * 0.98, 2.3, cabL, 0, 2.0, front - cabL / 2);
    box(group, glass, w * 0.86, 0.9, 0.06, 0, 2.6, front + 0.01);                    // windscreen
    box(group, trim, w * 0.72, 0.8, 0.08, 0, 1.25, front + 0.02);                    // grille
    box(group, paint, w * 0.94, 1.0, 1.8, 0, 3.6, front - cabL + 0.9);               // sleeper and fairing
    box(group, trim, w * 0.98, 0.25, 0.3, 0, 0.75, front + 0.05);                    // bumper
    for (const side of [-1, 1]) {
      box(group, LAMP, 0.32, 0.22, 0.05, side * w * 0.36, 1.05, front + 0.07);       // headlamps
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.4, 8), chrome);
      stack.position.set(side * (w / 2 - 0.15), 3.3, front - cabL - 0.15);           // exhaust stacks
      group.add(stack);
    }
    box(group, trim, w * 0.55, 0.35, l - 1, 0, 0.75, -0.2);                         // chassis
    const trailer = l - cabL - 0.6;
    // The cargo truck (a kind that sheds its load: CONFIG.vehicles' "sheds") is this truck in another
    // state: its back doors swung wide, the back of the trailer open with its load showing (crates and
    // a bale, one crate on the lip ready to go), so the truck that drops things is told from an
    // ordinary semi at a glance. The same size and hitbox: the doors and the lip's crate are looks only.
    const open = car.sheds ? 1.6 : 0;                                                // the open back's depth
    box(group, white, w, 2.9, trailer - open, 0, 2.6, -l / 2 + open + (trailer - open) / 2); // trailer
    box(group, paint, w + 0.02, 0.35, trailer - open, 0, 1.3, -l / 2 + open + (trailer - open) / 2); // a stripe of the livery
    if (open) {
      const dark = lambert(0x2b2622), crate = lambert(0xb8894a), band = lambert(0x6b4a2b), straw = lambert(0xe2c25a);
      const back = -l / 2, floor = 1.3;
      // the open end is a shell (the load sits inside it, so it cannot be a solid block): a white
      // floor, roof and walls, lined dark inside, with a dark wall at the far end
      box(group, white, w, 0.14, open, 0, floor - 0.07, back + open / 2);              // its floor...
      box(group, white, w, 0.12, open, 0, 4.0, back + open / 2);                      // ...roof...
      for (const side of [-1, 1]) box(group, white, 0.06, 2.9, open, side * (w / 2 - 0.03), 2.6, back + open / 2); // ...and walls
      box(group, dark, w - 0.12, 2.74, 0.06, 0, 2.6, back + open - 0.03);             // the far end, dark
      box(group, dark, w - 0.12, 0.04, open, 0, 3.92, back + open / 2);               // the roof's underside...
      for (const side of [-1, 1]) box(group, dark, 0.04, 2.74, open, side * (w / 2 - 0.08), 2.6, back + open / 2); // ...and the walls' insides
      // the load: two crates stacked by the left wall, a bale on its side by the right, and a crate
      // on the lip between them, skewed, half over the edge
      const load = (mat, sx, sy, sz, x, y, z, turn = 0) => { const m = box(group, mat, sx, sy, sz, x, y, z); m.rotation.y = turn; return m; };
      for (const [x, y, z, turn] of [[-w * 0.28, floor + 0.45, back + 0.6, 0.1], [-w * 0.28, floor + 1.35, back + 0.65, -0.15], [-w * 0.06, floor + 0.45, back - 0.1, 0.35]]) {
        load(crate, 0.9, 0.9, 0.9, x, y, z, turn);
        load(band, 0.94, 0.08, 0.12, x, y, z, turn);                                  // its bands
        load(band, 0.12, 0.08, 0.94, x, y, z, turn);
      }
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12), straw);
      bale.rotation.z = Math.PI / 2;
      bale.position.set(w * 0.28, floor + 0.5, back + 0.7);
      group.add(bale);
      const twine = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.14, 12), lambert(0xa8842f));
      twine.rotation.z = Math.PI / 2;
      twine.position.copy(bale.position);
      group.add(twine);
      // the doors, hinged at the back corners and swung right back along the sides, ajar by 15
      // degrees, so that nothing of the truck reaches past half a lane (no car exceeds a lane:
      // the doors' tips stop short of 1.75 m). From behind they show as two white wedges beside
      // the open, dark mouth
      for (const side of [-1, 1]) {
        const hinge = new THREE.Group();
        hinge.position.set(side * (w / 2 + 0.04), 2.62, back);
        hinge.rotation.y = -side * 4.45;                                              // (about 255 degrees round)
        group.add(hinge);
        box(hinge, white, w / 2 - 0.04, 2.7, 0.06, -side * (w / 4 - 0.02), 0, 0);
        box(hinge, steel, 0.08, 2.0, 0.08, -side * (w / 4 - 0.02), 0, -0.05);         // its lock bar
      }
    }
    for (const side of [-1, 1]) box(group, TAIL, 0.3, 0.25, 0.05, side * w * 0.38, 1.1, -l / 2 - 0.02);
    // wheels: the steer axle, two drive axles, and three under the trailer's tail
    for (const z of [front - 1.1, front - cabL - 0.4, front - cabL - 1.6, -l / 2 + 1.2, -l / 2 + 2.5, -l / 2 + 3.8]) {
      for (const side of [-1, 1]) wheel(group, 0.52, 0.42, side * (w / 2 - 0.22), 0.52, z, steel);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },
  // The Commuter: an old three-door supermini (a first-generation Nissan Micra). Small and
  // boxy, with a tall glasshouse, a short sloping bonnet, square headlamps and chunky black
  // bumpers.
  commuter: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.3;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), steel = lambert(0xb8bcc4);
    const body = box(group, paint, w, 0.5, l, 0, 0.55, 0);
    box(group, paint, w * 0.95, 0.08, l * 0.22, 0, 0.83, l * 0.37);               // short bonnet
    box(group, glass, w * 0.9, 0.5, l * 0.58, 0, 1.08, -l * 0.08);                // tall glasshouse
    box(group, paint, w * 0.92, 0.07, l * 0.56, 0, 1.36, -l * 0.08);              // roof
    screen(group, glass, w * 0.86, 0.05, 0.6, 0, 1.06, l * 0.22, 0.55);             // windscreen
    screen(group, glass, w * 0.86, 0.05, 0.52, 0, 1.06, -l * 0.37, -0.22);          // the hatch's glass
    for (const side of [-1, 1]) {
      for (const z of [0.18, -0.02, -0.35]) box(group, paint, 0.08, 0.5, 0.09, side * w * 0.45, 1.08, l * z); // pillars
      box(group, trim, 0.03, 0.08, l * 0.8, side * (w / 2 + 0.01), 0.6, 0);        // rubbing strip
      box(group, trim, 0.12, 0.09, 0.1, side * (w / 2 + 0.06), 0.95, l * 0.2);     // mirror
      box(group, LAMP, w * 0.24, 0.16, 0.08, side * w * 0.32, 0.68, l / 2 + 0.01); // square headlamps
      box(group, TAIL, w * 0.16, 0.22, 0.08, side * w * 0.38, 0.7, -l / 2 - 0.01);
      wheel(group, R, 0.26, side * (w / 2 - 0.04), R, l * 0.31, steel);
      wheel(group, R, 0.26, side * (w / 2 - 0.04), R, -l * 0.31, steel);
    }
    for (let i = 0; i < 3; i++) box(group, trim, w * 0.3, 0.03, 0.04, 0, 0.62 + i * 0.06, l / 2 + 0.02); // grille slats
    box(group, trim, w + 0.06, 0.2, 0.16, 0, 0.36, l / 2 + 0.04);                 // chunky bumpers
    box(group, trim, w + 0.06, 0.2, 0.16, 0, 0.36, -l / 2 - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A Japanese kei truck: a tiny cab-over with a flat, near-upright face, a long, low flatbed
  // with fold-down sides behind it, and little wheels right at the corners. It bobs as it idles
  keitruck: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.27;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), steel = lambert(0xc4c8ce);
    const body = new THREE.Group(); group.add(body);
    const cab = box(body, paint, w, 1.1, l * 0.36, 0, 1.0, l * 0.32);              // the cab, right over the front wheels
    box(body, glass, w * 0.86, 0.5, 0.04, 0, 1.28, l / 2 + 0.01);                   // its upright windscreen, flush in the face
    for (const side of [-1, 1]) box(body, glass, 0.04, 0.42, l * 0.24, side * (w / 2 + 0.005), 1.3, l * 0.31); // door glass
    box(body, paint, w * 1.02, 0.06, l * 0.37, 0, 1.57, l * 0.32);                 // the roof's lip
    box(body, trim, w * 0.9, 0.6, 0.06, 0, 1.14, l * 0.14);                        // the cab's back panel
    box(body, trim, w * 0.94, 0.12, l * 0.66, 0, 0.5, -l * 0.17);                  // the flatbed's floor
    for (const side of [-1, 1]) box(body, paint, 0.05, 0.3, l * 0.64, side * (w / 2 - 0.03), 0.71, -l * 0.17); // its drop sides
    box(body, paint, w * 0.94, 0.3, 0.05, 0, 0.71, -l / 2 + 0.03);                  // and tailgate
    box(body, trim, 0.06, 0.5, 0.06, -w * 0.3, 1.0, l * 0.14 - 0.06);               // the headboard's rail
    box(body, trim, 0.06, 0.5, 0.06, w * 0.3, 1.0, l * 0.14 - 0.06);
    box(body, trim, w * 0.62, 0.06, 0.06, 0, 1.24, l * 0.14 - 0.06);
    for (const side of [-1, 1]) {
      box(body, LAMP, w * 0.2, 0.14, 0.06, side * w * 0.33, 0.66, l / 2 + 0.01);   // headlamps low in the face
      box(body, TAIL, 0.1, 0.16, 0.06, side * w * 0.4, 0.66, -l / 2 - 0.01);
      box(body, trim, 0.1, 0.08, 0.1, side * (w / 2 + 0.05), 1.18, l * 0.44);       // mirrors
      wheel(group, R, 0.2, side * (w / 2 - 0.06), R, l * 0.36, steel);
      wheel(group, R, 0.2, side * (w / 2 - 0.06), R, -l * 0.3, steel);
    }
    box(body, trim, w + 0.02, 0.14, 0.1, 0, 0.42, l / 2 + 0.03);                    // bumper
    group.userData = { body: cab, animate: (t) => { body.position.y = Math.abs(Math.sin(t * 9)) * 0.015; } };
    return group;
  },

  // An auto-rickshaw (Mumbai's traffic): a three-wheeler, black below and a yellow canopy above, open
  // sides, a single wheel under its snub nose and two at the back, a little windscreen, a meter on the
  // dash. It waddles as it goes (the whole body rocking on its one front wheel)
  rickshaw: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.22;
    const black = lambert(0x1c1c1e), yellow = lambert(car.color), glass = lambert(GLASS), steel = lambert(0xb8bcc4);
    const body = new THREE.Group(); group.add(body);
    const tub = box(body, black, w, 0.55, l * 0.72, 0, 0.55, -l * 0.08);                 // the tub
    box(body, black, w * 0.7, 0.5, l * 0.3, 0, 0.6, l * 0.35);                           // the nose
    box(body, yellow, w * 1.04, 0.08, l * 0.8, 0, 1.6, -l * 0.06);                        // the canopy
    box(body, yellow, w * 1.04, 0.06, l * 0.3, 0, 1.56, -l * 0.42).rotation.x = 0.5;      // its back, hanging down
    screen(body, glass, w * 0.7, 0.04, 0.55, 0, 1.3, l * 0.3, 0.25);                     // windscreen
    for (const side of [-1, 1]) {
      box(body, black, 0.06, 0.8, 0.06, side * (w / 2 - 0.05), 1.2, -l * 0.42);          // the rear pillars
      box(body, black, 0.06, 0.8, 0.06, side * (w * 0.35), 1.2, l * 0.22);               // the front pillars
      box(body, LAMP, 0.1, 0.12, 0.05, side * w * 0.2, 0.75, l / 2 + 0.01);
      box(body, TAIL, 0.14, 0.12, 0.05, side * w * 0.38, 0.7, -l / 2 - 0.01);
      wheel(group, R, 0.14, side * (w / 2 - 0.08), R, -l * 0.3, steel);
    }
    wheel(group, R, 0.14, 0, R, l * 0.38, steel);                                          // the one at the front
    box(body, lambert(0x3a3a40), w * 0.5, 0.35, 0.3, 0, 0.95, l * 0.05);                   // the driver's seat
    box(body, lambert(0xd8c8a0), w * 0.8, 0.3, 0.4, 0, 0.85, -l * 0.25);                   // the passengers' bench
    group.userData = { body: tub, animate: (t) => { body.rotation.z = Math.sin(t * 6) * 0.03; body.position.y = Math.abs(Math.sin(t * 6)) * 0.02; } };
    return group;
  },

  // A parade float: a long low flatbed on small wheels with a skirt of bunting round it, a tower of
  // colour on top (tiers of boxes in the paint and its friends), a banner across the front, balloons
  // on strings swaying over it all. It rolls and the balloons bob as it goes
  float: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.32;
    const paint = lambert(car.color), trim = lambert(TRIM), steel = lambert(0xb8bcc4);
    const COLOURS = [0xff6ad5, 0x27e7ff, 0xffe12b, 0x7cff3a, 0xff5a3a].map(lambert);
    const deck = box(group, trim, w, 0.3, l, 0, 0.75, 0);                                 // the flatbed
    for (const side of [-1, 1]) {                                                        // its skirt of bunting, in stripes
      for (let z = -l / 2, k = 0; z < l / 2; z += 0.6, k++) box(group, COLOURS[k % COLOURS.length], 0.06, 0.55, 0.58, side * (w / 2 + 0.02), 0.5, z + 0.3);
    }
    const body = box(group, paint, w * 0.8, 1.0, l * 0.6, 0, 1.4, -l * 0.05);             // the tiers
    box(group, COLOURS[0], w * 0.6, 0.8, l * 0.42, 0, 2.3, -l * 0.08);
    box(group, COLOURS[1], w * 0.4, 0.7, l * 0.26, 0, 3.05, -l * 0.1);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    star.position.set(0, 3.7, -l * 0.1);
    group.add(star);
    box(group, COLOURS[2], w * 0.9, 0.7, 0.08, 0, 1.5, l / 2 - 0.1);                      // the banner across the front
    box(group, lambert(0xf2f2f2), w * 0.8, 0.14, 0.09, 0, 1.5, l / 2 - 0.09);              // (its lettering, a pale stripe)
    const balloons = [];
    for (let k = 0; k < 6; k++) {                                                          // balloons on strings
      const x = (k % 3 - 1) * w * 0.3, z = (k < 3 ? 1 : -1) * l * 0.3;
      box(group, trim, 0.02, 1.6, 0.02, x, 2.6, z);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), COLOURS[k % COLOURS.length]);
      b.position.set(x, 3.5, z);
      group.add(b);
      balloons.push({ b, x, z, k });
    }
    for (const side of [-1, 1]) for (const z of [l * 0.36, 0, -l * 0.36]) wheel(group, R, 0.26, side * (w / 2 - 0.1), R, z, steel);
    group.userData = { body, animate: (t) => {
      for (const { b, x, z, k } of balloons) b.position.set(x + Math.sin(t * 1.3 + k) * 0.25, 3.5 + Math.sin(t * 2.1 + k) * 0.12, z + Math.cos(t * 1.1 + k) * 0.2);
      star.rotation.y = t;
      deck.position.y = 0.75 + Math.sin(t * 5) * 0.01;
    } };
    return group;
  },

  // A small post van: a tall panel van with a short, sloping nose, a rounded high roof, blind rear
  // sides each wearing a big envelope (its flap in the van's colour) over a pale band, twin rear
  // doors with another envelope across them, and an amber beacon on the roof that flashes as it idles
  postvan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.31;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), band = lambert(0xf2efe6);
    const front = l * 0.14, scuttle = l * 0.23;                                      // (where the roof ends, and the windscreen's foot)
    const body = box(group, paint, w, 1.32, front + l / 2, 0, 1.0, (front - l / 2) / 2); // the tall load box, up to the windscreen
    box(group, paint, w, 0.52, l / 2 - front, 0, 0.6, (front + l / 2) / 2);           // the nose
    prism(group, paint, w * 0.98, [[l * 0.5, 0.86], [l * 0.36, 1.0], [front, 1.0], [front, 0.86]]); // sloping bonnet
    const rise = 1.66 - 1.0, run = scuttle - front;
    screen(group, glass, w * 0.9, 0.05, Math.hypot(rise, run), 0, 1.33, (front + scuttle) / 2, Math.atan2(rise, run)); // the raked windscreen
    for (const side of [-1, 1]) {
      box(group, glass, 0.04, 0.4, l * 0.16, side * (w / 2 + 0.005), 1.32, l * 0.05); // cab door glass only
      box(group, band, 0.03, 0.16, l * 0.9, side * (w / 2 + 0.01), 0.86, 0);         // the pale band down each side
      box(group, LAMP, w * 0.26, 0.14, 0.06, side * w * 0.3, 0.8, l / 2 + 0.01);     // headlamps
      box(group, TAIL, 0.1, 0.4, 0.06, side * w * 0.42, 1.2, -l / 2 - 0.01);        // tall tail lamps
      box(group, trim, 0.12, 0.14, 0.1, side * (w / 2 + 0.06), 1.16, l * 0.2);       // mirrors
      wheel(group, R, 0.24, side * (w / 2 - 0.05), R, l * 0.33, lambert(0x9da2a8));
      wheel(group, R, 0.24, side * (w / 2 - 0.05), R, -l * 0.32, lambert(0x9da2a8));
    }
    box(group, trim, 0.03, 0.5, 0.04, 0, 0.72, -l / 2 - 0.01);                       // the split in the rear doors, under their envelope
    box(group, trim, w * 0.5, 0.12, 0.05, 0, 0.6, l / 2 + 0.01);                     // grille
    box(group, trim, w + 0.04, 0.18, 0.12, 0, 0.36, l / 2 + 0.03);                    // bumpers
    box(group, trim, w + 0.04, 0.18, 0.12, 0, 0.36, -l / 2 - 0.03);
    const hump = new THREE.Shape();                                                   // a raised, rounded high roof, side on
    hump.moveTo(front - 0.05, 1.6);
    hump.quadraticCurveTo(front - 0.1, 1.86, front - 0.5, 1.88);
    hump.lineTo(-l * 0.44, 1.88);
    hump.quadraticCurveTo(-l * 0.49, 1.88, -l * 0.49, 1.6);
    hump.lineTo(front - 0.05, 1.6);
    curved(group, paint, w * 0.94, hump, 0.06);
    for (const side of [-1, 1]) {                                                       // an envelope on each flank:
      const x = side * (w / 2 + 0.015), z0 = -l * 0.2, top = 1.5, half = 0.4, drop = 0.24;
      box(group, band, 0.02, 0.5, half * 2, x, top - 0.25, z0);                          // the envelope,
      for (const dir of [-1, 1]) {                                                       // and its flap, in the van's colour
        const flap = box(group, paint, 0.03, 0.05, Math.hypot(half, drop), x, top - drop / 2, z0 + dir * half / 2);
        flap.rotation.x = dir * -Math.atan2(drop, half);
      }
    }
    {                                                                                   // and a third across the rear doors
      const z = -l / 2 - 0.015, top = 1.5, half = 0.4, drop = 0.24;
      box(group, band, half * 2, 0.5, 0.02, 0, top - 0.25, z);
      for (const dir of [-1, 1]) {
        const flap = box(group, paint, Math.hypot(half, drop), 0.05, 0.03, dir * half / 2, top - drop / 2, z);
        flap.rotation.z = dir * Math.atan2(drop, half);
      }
    }
    const beacon = new THREE.MeshBasicMaterial({ color: 0xffa31a });                  // an amber beacon on the roof
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 12), beacon);
    lamp.position.set(0, 2.0, front - 0.6);
    group.add(lamp);
    box(group, trim, 0.34, 0.05, 0.34, 0, 1.9, front - 0.6);                             // on its base
    group.userData = { body, animate: (t) => { beacon.color.setHex((t * 2.5) % 1 < 0.5 ? 0xffa31a : 0x7a4a10); } };
    return group;
  },

  // A retro Mini: tiny, upright and round-shouldered, its body one curved side profile with a
  // contrasting roof floating over a glasshouse all round, big round headlamps either side of a
  // chrome grille, chrome bumpers, twin bonnet stripes, spot lamps, and little wheels right at the
  // corners. Good is red with a white roof; Evil seventies orange with a black one. It sits still
  mini: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.26;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const roofPaint = lambert(0xf4f2ec), stripe = lambert(0xf4f2ec);
    const shell = new THREE.Shape();                                                  // the body, side on:
    shell.moveTo(-L * 0.94, 0.24);
    shell.lineTo(L * 0.92, 0.24);
    shell.quadraticCurveTo(L, 0.24, L, 0.4);                                          // the front's lower lip
    shell.quadraticCurveTo(L * 1.01, 0.74, L * 0.88, 0.8);                            // the round nose
    shell.quadraticCurveTo(L * 0.6, 0.86, L * 0.4, 0.86);                             // the short bonnet
    shell.lineTo(-L * 0.9, 0.86);                                                     // the waist
    shell.quadraticCurveTo(-L * 1.0, 0.84, -L, 0.6);                                  // the round tail
    shell.quadraticCurveTo(-L * 1.0, 0.26, -L * 0.94, 0.24);
    const body = curved(group, paint, w - 0.06, shell, 0.06);
    prism(group, glass, w * 0.86, [[L * 0.4, 0.85], [L * 0.2, 1.24], [-L * 0.8, 1.24], [-L * 0.88, 0.85]]); // the glasshouse
    box(group, roofPaint, w * 0.9, 0.07, L * 1.12, 0, 1.28, -L * 0.3);  // the roof, in the other colour
    for (const x of [-0.16, 0.16]) box(group, stripe, 0.12, 0.02, L * 0.5, x, 0.875, L * 0.66); // bonnet stripes
    for (const side of [-1, 1]) {
      disc(group, LAMP, 0.13, 0.06, side * w * 0.31, 0.64, L + 0.02);               // big round headlamps
      disc(group, chrome, 0.155, 0.04, side * w * 0.31, 0.64, L + 0.005);           // in chrome rims
      disc(group, LAMP, 0.08, 0.05, side * w * 0.14, 0.42, L + 0.1);                // spot lamps on the bumper
      box(group, TAIL, 0.08, 0.2, 0.05, side * w * 0.4, 0.6, -L - 0.02);            // upright tail lamps
      box(group, chrome, 0.08, 0.06, 0.08, side * (w / 2 + 0.03), 0.98, L * 0.38);   // little round-ish mirrors
      wheel(group, R, 0.2, side * (w / 2 - 0.06), R, L * 0.74, lambert(0xd0d3d8));
      wheel(group, R, 0.2, side * (w / 2 - 0.06), R, -L * 0.74, lambert(0xd0d3d8));
    }
    box(group, chrome, w * 0.34, 0.24, 0.04, 0, 0.6, L + 0.03);                       // the chrome grille
    for (let i = 0; i < 4; i++) box(group, trim, w * 0.32, 0.02, 0.03, 0, 0.51 + i * 0.06, L + 0.05);
    box(group, chrome, w + 0.04, 0.07, 0.08, 0, 0.32, L + 0.06);                      // thin chrome bumpers
    box(group, chrome, w + 0.04, 0.07, 0.08, 0, 0.32, -L - 0.06);
    const roofs = { good: 0xf4f2ec, evil: 0x161616 };
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => roofPaint.color.setHex(evil ? roofs.evil : roofs.good),
    };
    group.userData.livery(false);
    return group;
  },

  // A hot hatch (a Golf GTI, more or less): a boxy little three-door, low and square, with an
  // upright hatch on thick rear pillars, a black grille right across the nose holding four round
  // lamps and edged in red, black bumpers and rubbing strips, a lip of a roof spoiler. It sits still
  hothatch: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.3;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), red = lambert(0xd0142c);
    const body = box(group, paint, w, 0.5, l, 0, 0.58, 0);
    box(group, paint, w * 0.96, 0.08, l * 0.26, 0, 0.86, l * 0.36);                // the bonnet
    box(group, glass, w * 0.88, 0.46, l * 0.58, 0, 1.08, -l * 0.16);               // the glasshouse, right to the tail
    box(group, paint, w * 0.9, 0.07, l * 0.58, 0, 1.34, -l * 0.16);                // roof
    screen(group, glass, w * 0.86, 0.05, 0.62, 0, 1.07, l * 0.19, 0.6);              // windscreen
    screen(group, glass, w * 0.86, 0.05, 0.48, 0, 1.08, -l * 0.45, -0.18);           // the upright hatch
    box(group, trim, w * 0.8, 0.04, 0.16, 0, 1.39, -l * 0.43);                      // the roof spoiler's lip
    box(group, trim, w * 0.94, 0.24, 0.05, 0, 0.7, l / 2 + 0.01);                   // the grille, right across
    box(group, red, w * 0.94, 0.03, 0.06, 0, 0.83, l / 2 + 0.02);                   // edged in red
    for (const side of [-1, 1]) {
      box(group, paint, 0.08, 0.46, l * 0.16, side * w * 0.445, 1.08, -l * 0.36);   // thick rear pillars
      box(group, paint, 0.08, 0.46, 0.1, side * w * 0.445, 1.08, l * 0.0);         // and the door's
      for (const x of [0.22, 0.38]) disc(group, LAMP, 0.085, 0.06, side * w * x, 0.7, l / 2 + 0.03); // four round lamps
      box(group, TAIL, w * 0.24, 0.16, 0.06, side * w * 0.33, 0.72, -l / 2 - 0.01);
      box(group, trim, 0.03, 0.1, l * 0.7, side * (w / 2 + 0.01), 0.6, 0);          // rubbing strip
      box(group, trim, 0.12, 0.09, 0.1, side * (w / 2 + 0.06), 0.96, l * 0.14);     // mirror
      wheel(group, R, 0.24, side * (w / 2 - 0.04), R, l * 0.31, lambert(0x5d6168));
      wheel(group, R, 0.24, side * (w / 2 - 0.04), R, -l * 0.31, lambert(0x5d6168));
    }
    box(group, trim, w + 0.06, 0.18, 0.16, 0, 0.38, l / 2 + 0.04);                  // black bumpers
    box(group, trim, w + 0.06, 0.18, 0.16, 0, 0.38, -l / 2 - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // An Aussie ute: a saloon's long nose and cab, then a tub in the body's colour behind it, with a
  // sports bar over the tub just behind the cab. It sits still
  ute: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.33;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(group, paint, w, 0.5, l, 0, 0.62, 0);
    box(group, paint, w * 0.97, 0.08, l * 0.3, 0, 0.9, l * 0.35);                  // the long bonnet
    box(group, glass, w * 0.88, 0.44, l * 0.24, 0, 1.12, l * 0.02);                // the cab
    box(group, paint, w * 0.9, 0.07, l * 0.24, 0, 1.37, l * 0.02);                 // its roof
    screen(group, glass, w * 0.86, 0.05, 0.7, 0, 1.1, l * 0.17, 0.62);               // windscreen
    box(group, paint, w * 0.88, 0.44, 0.06, 0, 1.12, -l * 0.1);                     // the cab's back,
    box(group, glass, w * 0.7, 0.28, 0.03, 0, 1.15, -l * 0.1 - 0.035);               // and its little window
    const tubZ = (-l / 2 - l * 0.1) / 2, tubL = l / 2 - l * 0.1;
    for (const side of [-1, 1]) box(group, paint, 0.06, 0.25, tubL, side * (w / 2 - 0.03), 1.0, tubZ); // the tub's sides
    box(group, paint, w, 0.25, 0.06, 0, 1.0, -l / 2 + 0.03);                        // and tailgate
    box(group, trim, w * 0.9, 0.04, tubL - 0.1, 0, 0.88, tubZ);                     // its floor
    for (const side of [-1, 1]) box(group, chrome, 0.06, 0.45, 0.06, side * w * 0.4, 1.1, -l * 0.1 - 0.25); // the sports bar
    box(group, chrome, w * 0.84, 0.06, 0.06, 0, 1.33, -l * 0.1 - 0.25);
    box(group, trim, w * 0.6, 0.14, 0.05, 0, 0.72, l / 2 + 0.01);                   // grille
    for (const side of [-1, 1]) {
      box(group, LAMP, w * 0.2, 0.12, 0.06, side * w * 0.36, 0.74, l / 2 + 0.01);
      box(group, TAIL, 0.1, 0.24, 0.05, side * w * 0.42, 0.75, -l / 2 - 0.01);
      box(group, trim, 0.12, 0.09, 0.1, side * (w / 2 + 0.06), 1.0, l * 0.12);      // mirror
      wheel(group, R, 0.26, side * (w / 2 - 0.05), R, l * 0.32, lambert(0xc4c8ce));
      wheel(group, R, 0.26, side * (w / 2 - 0.05), R, -l * 0.3, lambert(0xc4c8ce));
    }
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.42, l / 2 + 0.03);                  // bumpers
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.42, -l / 2 - 0.03);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A beach buggy (a Meyers Manx, more or less): a curvy fibreglass tub with no doors and no roof,
  // flared mudguards swooping over the wheels, a little windscreen, two seats, a roll bar, round
  // lamps perched on the nose, and the air-cooled engine out in the open at the back, its twin pipes
  // poking out. Fat tyres behind, skinny ones in front. It rocks as it idles
  buggy: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, Rf = 0.3, Rr = 0.36, zf = L * 0.64, zr = -L * 0.6;
    const paint = lambert(car.color), glass = lambert(0x9fc6d8), trim = lambert(TRIM), chrome = lambert(CHROME);
    const rig = new THREE.Group(); group.add(rig);                                      // (everything the springs carry)
    const tub = new THREE.Shape();                                                      // the tub, side on
    tub.moveTo(-L * 0.82, 0.32);
    tub.lineTo(L * 0.82, 0.32);
    tub.quadraticCurveTo(L, 0.34, L * 0.98, 0.56);                                      // the nose
    tub.quadraticCurveTo(L * 0.95, 0.74, L * 0.8, 0.76);
    tub.lineTo(L * 0.34, 0.8);                                                          // the bonnet
    tub.quadraticCurveTo(L * 0.26, 0.8, L * 0.22, 0.62);                                // the cockpit's lip,
    tub.lineTo(-L * 0.46, 0.62);
    tub.quadraticCurveTo(-L * 0.52, 0.76, -L * 0.62, 0.76);                             // the deck behind it
    tub.quadraticCurveTo(-L * 0.82, 0.76, -L * 0.82, 0.32);
    const body = curved(rig, paint, w * 0.64, tub, 0.06);
    const guard = (z, r, reach) => {                                                    // a mudguard's arch, side on
      const g = new THREE.Shape(), lo = 0.4, outer = r + 0.28, inner = r + 0.14;
      g.moveTo(z + reach, lo);
      g.quadraticCurveTo(z + reach, r + outer, z, r + outer);
      g.quadraticCurveTo(z - reach, r + outer, z - reach, lo);
      g.lineTo(z - reach + 0.12, lo);
      g.quadraticCurveTo(z - reach + 0.12, r + inner, z, r + inner);
      g.quadraticCurveTo(z + reach - 0.12, r + inner, z + reach - 0.12, lo);
      return g;
    };
    for (const side of [-1, 1]) {
      const fender = curved(rig, paint, 0.36, guard(zf, Rf, 0.48), 0.04), back = curved(rig, paint, 0.42, guard(zr, Rr, 0.56), 0.04);
      fender.position.x = side * (w / 2 - 0.16);
      back.position.x = side * (w / 2 - 0.19);
      box(rig, paint, 0.34, 0.06, zf - zr - 1.0, side * (w / 2 - 0.17), 0.42, (zf + zr) / 2); // the running board between
      wheel(group, Rf, 0.24, side * (w / 2 - 0.16), Rf, zf, chrome);
      wheel(group, Rr, 0.36, side * (w / 2 - 0.19), Rr, zr, chrome);
      disc(rig, LAMP, 0.09, 0.08, side * w * 0.18, 0.88, L * 0.68);                    // round lamps on the nose
      disc(rig, chrome, 0.11, 0.06, side * w * 0.18, 0.88, L * 0.66);
      box(rig, lambert(0x2b2b2b), 0.4, 0.12, 0.42, side * w * 0.15, 0.68, -L * 0.1);    // the seats
      box(rig, lambert(0x2b2b2b), 0.4, 0.42, 0.1, side * w * 0.15, 0.88, -L * 0.33);
      box(rig, chrome, 0.06, 0.74, 0.06, side * w * 0.28, 0.99, -L * 0.42);            // the roll bar
      for (const x of [0.08, 0.16]) disc(rig, chrome, 0.045, 0.3, side * x, 0.44, -L - 0.1); // twin pipes
      box(rig, TAIL, 0.12, 0.08, 0.04, side * w * 0.22, 0.66, -L * 0.83);
    }
    box(rig, chrome, w * 0.6, 0.06, 0.06, 0, 1.36, -L * 0.42);
    screen(rig, glass, w * 0.56, 0.03, 0.36, 0, 0.95, L * 0.24, 0.35);                  // the little windscreen
    box(rig, lambert(0x6b6f75), w * 0.46, 0.3, 0.42, 0, 0.56, -L * 0.88);               // the engine, out in the open
    box(rig, lambert(0x3a3d42), w * 0.3, 0.14, 0.3, 0, 0.78, -L * 0.86);                // its air cleaner
    group.userData = { body, animate: (t) => { rig.rotation.x = Math.sin(t * 7) * 0.006; } };
    return group;
  },

  // A lifted truck (a late-nineties full-size pickup on a big suspension lift): sky-high on huge
  // off-road tyres, the chassis, axles and bright yellow shocks all showing underneath, a big-rig
  // nose with the bonnet standing proud of drooping wings, a chrome crosshair grille, a light bar on
  // the roof, chrome bumpers and mud flaps. It sits still
  liftedtruck: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.58, base = 1.3; // (base: the body's underside, high over the tyres)
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const shock = lambert(0xf2c418);
    box(group, trim, w * 0.56, 0.2, l * 0.9, 0, base - 0.12, 0);                       // the chassis rails
    const body = box(group, paint, w, 0.6, l * 0.98, 0, base + 0.3, 0);               // the body
    box(group, paint, w * 0.56, 0.12, l * 0.3, 0, base + 0.66, l * 0.33);               // the bonnet, proud of the wings
    box(group, glass, w * 0.9, 0.55, l * 0.25, 0, base + 0.88, -l * 0.02);              // the cab
    box(group, paint, w * 0.92, 0.08, l * 0.25, 0, base + 1.19, -l * 0.02);             // its roof
    screen(group, glass, w * 0.88, 0.05, 0.75, 0, base + 0.87, l * 0.13, 0.7);           // windscreen
    box(group, paint, w * 0.9, 0.55, 0.06, 0, base + 0.88, -l * 0.145);                // the cab's back,
    box(group, glass, w * 0.7, 0.32, 0.03, 0, base + 0.92, -l * 0.145 - 0.035);         // and its window
    const bedFront = -l * 0.145 - 0.05, bedZ = (bedFront - l / 2) / 2, bedL = bedFront + l / 2;
    for (const side of [-1, 1]) box(group, paint, 0.08, 0.45, bedL, side * (w / 2 - 0.04), base + 0.8, bedZ); // the bed's sides
    box(group, paint, w, 0.45, 0.08, 0, base + 0.8, -l / 2 + 0.04);                    // and tailgate
    box(group, trim, w * 0.9, 0.04, bedL - 0.1, 0, base + 0.6, bedZ);                  // its floor
    box(group, trim, w * 0.8, 0.1, 0.14, 0, base + 1.29, 0);                           // the light bar
    box(group, LAMP, w * 0.74, 0.06, 0.02, 0, base + 1.29, 0.08);
    box(group, trim, w * 0.5, 0.46, 0.05, 0, base + 0.36, l / 2 + 0.01);               // the grille,
    box(group, chrome, 0.1, 0.46, 0.07, 0, base + 0.36, l / 2 + 0.02);                 // its chrome crosshair
    box(group, chrome, w * 0.5, 0.09, 0.07, 0, base + 0.36, l / 2 + 0.02);
    for (const y of [0.13, 0.59]) box(group, chrome, w * 0.54, 0.05, 0.07, 0, base + y, l / 2 + 0.02); // and surround
    for (const side of [-1, 1]) box(group, chrome, 0.05, 0.5, 0.07, side * w * 0.26, base + 0.36, l / 2 + 0.02);
    box(group, chrome, w + 0.1, 0.22, 0.16, 0, base - 0.02, l / 2 + 0.06);             // chrome bumpers
    box(group, chrome, w + 0.1, 0.22, 0.16, 0, base - 0.02, -l / 2 - 0.06);
    for (const z of [l * 0.33, -l * 0.3]) {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, w, 8), trim);    // an axle
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, R, z);
      group.add(axle);
      for (const side of [-1, 1]) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, base - R, 8), shock); // a yellow shock, axle up to frame
        s.position.set(side * w * 0.3, (base + R) / 2 - 0.05, z + 0.25);
        group.add(s);
        wheel(group, R, 0.42, side * (w / 2 + 0.06), R, z, chrome);
      }
    }
    for (const side of [-1, 1]) {
      box(group, LAMP, w * 0.18, 0.2, 0.06, side * w * 0.37, base + 0.38, l / 2 + 0.01);
      box(group, TAIL, 0.1, 0.36, 0.05, side * w * 0.44, base + 0.8, -l / 2 - 0.01);
      box(group, trim, 0.1, 0.3, 0.22, side * (w / 2 + 0.1), base + 0.9, l * 0.12);    // big towing mirrors
      box(group, trim, 0.4, 0.62, 0.03, side * (w / 2 + 0.06), base - 0.4, -l * 0.3 - R - 0.12); // mud flaps
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A rally car (a WRX, more or less): a four-door saloon on gold wheels with a scoop on the bonnet, a
  // tall wing on the boot, a roof vent, fog lamps in the bumper, white roundels on the doors and red
  // mud flaps behind every wheel. It sits still
  rally: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.33;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), gold = lambert(0xd9b03a);
    const white = lambert(0xf4f4f4), red = lambert(0xc8102e);
    const body = box(group, paint, w, 0.5, l, 0, 0.62, 0);
    box(group, paint, w * 0.96, 0.08, l * 0.3, 0, 0.9, l * 0.35);                   // bonnet
    box(group, trim, w * 0.3, 0.1, 0.42, 0, 0.98, l * 0.3);                          // its scoop
    box(group, glass, w * 0.86, 0.44, l * 0.36, 0, 1.12, -l * 0.02);                // the cabin
    box(group, paint, w * 0.88, 0.07, l * 0.36, 0, 1.37, -l * 0.02);                // roof
    box(group, trim, w * 0.24, 0.06, 0.3, 0, 1.42, l * 0.04);                        // roof vent
    screen(group, glass, w * 0.84, 0.05, 0.66, 0, 1.1, l * 0.19, 0.6);               // windscreen
    screen(group, glass, w * 0.84, 0.05, 0.6, 0, 1.1, -l * 0.24, -0.55);             // rear screen
    box(group, paint, w * 0.96, 0.06, l * 0.2, 0, 0.9, -l * 0.39);                  // the boot
    for (const side of [-1, 1]) box(group, trim, 0.06, 0.3, 0.12, side * w * 0.38, 1.06, -l * 0.45); // the wing's posts
    box(group, paint, w * 0.94, 0.05, 0.36, 0, 1.22, -l * 0.45);                    // the tall wing
    for (const side of [-1, 1]) {
      const roundel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), white); // a door roundel
      roundel.rotation.z = Math.PI / 2;
      roundel.position.set(side * (w / 2 + 0.01), 0.66, l * 0.02);
      group.add(roundel);
      box(group, LAMP, w * 0.2, 0.12, 0.06, side * w * 0.34, 0.76, l / 2 + 0.01);  // headlamps
      disc(group, LAMP, 0.08, 0.06, side * w * 0.3, 0.44, l / 2 + 0.07);            // fog lamps in the bumper
      box(group, TAIL, w * 0.22, 0.12, 0.06, side * w * 0.34, 0.76, -l / 2 - 0.01);
      box(group, trim, 0.12, 0.09, 0.1, side * (w / 2 + 0.06), 1.0, l * 0.13);     // mirror
      for (const z of [0.32, -0.31]) {
        wheel(group, R, 0.26, side * (w / 2 - 0.05), R, l * z, gold);
        box(group, red, 0.3, 0.28, 0.03, side * (w / 2 - 0.05), 0.24, l * z - R - 0.08); // mud flap
      }
    }
    box(group, trim, w * 0.5, 0.14, 0.05, 0, 0.72, l / 2 + 0.01);                   // grille
    box(group, trim, w + 0.04, 0.2, 0.14, 0, 0.42, l / 2 + 0.03);                   // bumpers
    box(group, trim, w + 0.04, 0.2, 0.14, 0, 0.42, -l / 2 - 0.03);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A rotary coupe (an RX-7, more or less): low and all curves, one smooth side profile from a
  // low, pointed nose over swelling wings to a short, rounded tail, a glass bubble of a cabin, pop-up
  // headlamps standing up out of the bonnet, a hoop of a spoiler and a tail lamp bar. It sits still
  rotary: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.31;
    const paint = lambert(car.color), glass = lambert(0x1a2230), trim = lambert(TRIM);
    const shell = new THREE.Shape();                                                   // the body, side on:
    shell.moveTo(-L * 0.94, 0.28);
    shell.lineTo(L * 0.9, 0.28);
    shell.quadraticCurveTo(L, 0.28, L, 0.4);                                          // the low nose
    shell.quadraticCurveTo(L * 0.99, 0.56, L * 0.8, 0.6);
    shell.quadraticCurveTo(L * 0.5, 0.66, L * 0.3, 0.76);                             // up the bonnet to the wings
    shell.lineTo(-L * 0.7, 0.8);
    shell.quadraticCurveTo(-L * 0.98, 0.8, -L, 0.6);                                  // the short, round tail
    shell.quadraticCurveTo(-L, 0.3, -L * 0.94, 0.28);
    const body = curved(group, paint, w - 0.08, shell, 0.06);
    const bubble = new THREE.Shape();                                                  // the glass bubble
    bubble.moveTo(L * 0.34, 0.74);
    bubble.bezierCurveTo(L * 0.12, 1.06, -L * 0.04, 1.14, -L * 0.24, 1.14);
    bubble.bezierCurveTo(-L * 0.5, 1.14, -L * 0.66, 1.0, -L * 0.78, 0.79);
    bubble.lineTo(L * 0.34, 0.74);
    curved(group, glass, w * 0.78, bubble, 0.05);
    for (const side of [-1, 1]) {
      box(group, paint, 0.34, 0.12, 0.26, side * w * 0.3, 0.72, L * 0.7);             // the pop-up headlamps, up,
      box(group, LAMP, 0.3, 0.09, 0.02, side * w * 0.3, 0.72, L * 0.7 + 0.135);       // and lit
      box(group, trim, 0.05, 0.12, 0.06, side * w * 0.36, 0.86, -L * 0.86);           // the spoiler's posts
      wheel(group, R, 0.26, side * (w / 2 - 0.06), R, L * 0.66, lambert(0xc6cad0));
      wheel(group, R, 0.28, side * (w / 2 - 0.06), R, -L * 0.62, lambert(0xc6cad0));
    }
    box(group, paint, w * 0.8, 0.04, 0.2, 0, 0.92, -L * 0.86);                        // the hoop of a spoiler
    box(group, TAIL, w * 0.8, 0.08, 0.04, 0, 0.66, -L - 0.03);                        // the tail lamp bar
    box(group, trim, w * 0.5, 0.08, 0.04, 0, 0.36, L + 0.03);                         // the mouth under the nose
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A sleeper wagon (a Swedish brick of an estate, more or less): long, square and plain, but sitting
  // low on dark alloys, with a lip under the nose, a glasshouse right to the upright tailgate, roof
  // rails, and twin fat exhaust tips the only real giveaway. It sits still
  sleeper: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.32;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(group, paint, w, 0.5, l, 0, 0.56, 0);
    box(group, paint, w * 0.96, 0.08, l * 0.28, 0, 0.84, l * 0.36);                 // the long, flat bonnet
    box(group, glass, w * 0.88, 0.46, l * 0.6, 0, 1.06, -l * 0.12);                 // the long glasshouse
    box(group, paint, w * 0.9, 0.07, l * 0.6, 0, 1.32, -l * 0.12);                  // roof
    screen(group, glass, w * 0.86, 0.05, 0.62, 0, 1.06, l * 0.2, 0.55);              // windscreen
    screen(group, glass, w * 0.86, 0.05, 0.48, 0, 1.06, -l * 0.43, -0.12);           // the upright tailgate
    for (const side of [-1, 1]) {
      box(group, trim, 0.05, 0.05, l * 0.56, side * w * 0.4, 1.38, -l * 0.12);      // roof rails
      for (const z of [0.12, -0.1]) box(group, paint, 0.08, 0.46, 0.1, side * w * 0.445, 1.06, l * z); // pillars
      box(group, paint, 0.08, 0.46, l * 0.1, side * w * 0.445, 1.06, -l * 0.38);    // the D-pillars
      box(group, LAMP, w * 0.26, 0.16, 0.06, side * w * 0.3, 0.68, l / 2 + 0.01);   // square headlamps
      box(group, TAIL, 0.12, 0.36, 0.06, side * w * 0.42, 0.88, -l / 2 - 0.01);     // tall tail lamps
      box(group, trim, 0.12, 0.09, 0.1, side * (w / 2 + 0.06), 0.94, l * 0.18);     // mirror
      disc(group, chrome, 0.07, 0.2, side * 0.18, 0.3, -l / 2 - 0.08);               // twin fat exhaust tips
      wheel(group, R, 0.28, side * (w / 2 - 0.05), R, l * 0.32, lambert(0x3a3d42));
      wheel(group, R, 0.28, side * (w / 2 - 0.05), R, -l * 0.31, lambert(0x3a3d42));
    }
    box(group, chrome, w * 0.5, 0.18, 0.05, 0, 0.66, l / 2 + 0.01);                 // the plain grille
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.36, l / 2 + 0.03);                   // bumpers,
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.36, -l / 2 - 0.03);
    box(group, trim, w * 0.9, 0.05, 0.16, 0, 0.26, l / 2 + 0.08);                     // and the lip under the nose
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A tow truck (an eighties one-ton wrecker): a square-jawed pickup cab with a chrome grille, an amber
  // light bar on the roof, tool boxes either side behind it, and a boom raised over the back with its
  // cable and hook swinging, and the sling bar slung low behind. The hook sways as it idles
  towtruck: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const amber = new THREE.MeshBasicMaterial({ color: 0xffa31a }), boomPaint = lambert(0xe8b81a);
    box(group, trim, w * 0.6, 0.2, l * 0.9, 0, 0.62, 0);                              // the chassis rails
    const body = box(group, paint, w * 0.92, 0.5, l * 0.28, 0, 1.0, l * 0.36);       // the bonnet and wings
    box(group, paint, w, 0.6, l * 0.2, 0, 1.0, l * 0.12);                            // the cab, below the glass
    box(group, glass, w * 0.92, 0.42, l * 0.18, 0, 1.5, l * 0.12);                  // its glass
    box(group, paint, w * 0.94, 0.07, l * 0.2, 0, 1.74, l * 0.12);                  // its roof
    screen(group, glass, w * 0.9, 0.05, 0.5, 0, 1.47, l * 0.215, 0.3);               // windscreen
    box(group, trim, w * 0.8, 0.08, 0.2, 0, 1.82, l * 0.12);                         // the light bar's base
    for (const side of [-1, 1]) box(group, amber, w * 0.3, 0.1, 0.16, side * w * 0.22, 1.89, l * 0.12); // and its lamps
    for (const side of [-1, 1]) box(group, paint, 0.42, 0.62, l * 0.42, side * (w / 2 - 0.21), 1.0, -l * 0.24); // the tool boxes
    box(group, trim, w * 0.5, 0.06, l * 0.42, 0, 0.78, -l * 0.24);                   // the deck between them
    const foot = [0, 1.2, -l * 0.1], tip = [0, 2.3, -l * 0.5 - 0.2];                 // the boom, from its foot to its tip
    const run = foot[2] - tip[2], rise = tip[1] - foot[1];
    const boom = box(group, boomPaint, 0.2, 0.2, Math.hypot(run, rise), 0, (foot[1] + tip[1]) / 2, (foot[2] + tip[2]) / 2);
    boom.rotation.x = Math.atan2(rise, run);
    box(group, boomPaint, 0.3, 0.5, 0.3, 0, 1.0, -l * 0.08);                          // its base
    const hook = new THREE.Group();                                                    // the cable and hook, swinging from the tip
    hook.position.set(...tip);
    group.add(hook);
    box(hook, trim, 0.03, 1.1, 0.03, 0, -0.55, 0);
    box(hook, chrome, 0.12, 0.16, 0.06, 0, -1.15, 0);
    box(group, trim, w * 0.7, 0.12, 0.12, 0, 0.5, -l / 2 - 0.25);                     // the sling bar,
    for (const side of [-1, 1]) box(group, trim, 0.04, 0.04, 0.3, side * w * 0.3, 0.58, -l / 2 - 0.1); // on its arms
    box(group, chrome, w * 0.5, 0.36, 0.05, 0, 1.0, l / 2 + 0.01);                    // the chrome grille
    for (const side of [-1, 1]) {
      box(group, LAMP, w * 0.14, 0.18, 0.06, side * w * 0.36, 1.02, l / 2 + 0.01);
      box(group, TAIL, 0.1, 0.24, 0.05, side * w * 0.42, 1.0, -l * 0.45 - 0.01);
      box(group, trim, 0.1, 0.26, 0.18, side * (w / 2 + 0.1), 1.5, l * 0.2);          // tall mirrors
      wheel(group, R, 0.32, side * (w / 2 - 0.08), R, l * 0.34, chrome);
      wheel(group, R, 0.42, side * (w / 2 - 0.12), R, -l * 0.28, chrome);
    }
    box(group, chrome, w + 0.06, 0.2, 0.14, 0, 0.66, l / 2 + 0.04);                    // the front bumper
    group.userData = { body, animate: (t) => { hook.rotation.x = Math.sin(t * 1.6) * 0.12; } };
    return group;
  },

  // A six-wheeled luxury off-roader (a G-Wagen 6x6, more or less): a boxy, upright cab on three
  // axles of huge tyres on portal hubs, round lamps with indicators perched on the wings, black
  // flares over every wheel, a light bar on a roof rack, and an open bed behind with a roll bar and a
  // spare standing in it. It sits still
  sixbysix: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.55, base = 1.15;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const amber = lambert(0xffa31a);
    box(group, trim, w * 0.56, 0.2, l * 0.92, 0, base - 0.2, 0);                        // the chassis rails
    const body = box(group, paint, w, 0.55, l * 0.98, 0, base + 0.275, 0);             // the body
    box(group, paint, w * 0.9, 0.12, l * 0.24, 0, base + 0.61, l * 0.37);               // the flat bonnet
    const cabFront = l * 0.25, cabBack = l * 0.02, cabZ = (cabFront + cabBack) / 2, cabL = cabFront - cabBack;
    box(group, glass, w * 0.92, 0.55, cabL, 0, base + 0.85, cabZ);                     // the upright cab
    box(group, paint, w * 0.94, 0.08, cabL, 0, base + 1.16, cabZ);                     // its roof
    screen(group, glass, w * 0.86, 0.05, 0.56, 0, base + 0.86, cabFront + 0.03, 0.12);  // the near-upright windscreen
    for (const z of [cabFront - 0.05, cabZ, cabBack + 0.05]) for (const side of [-1, 1]) box(group, paint, 0.08, 0.55, 0.1, side * w * 0.455, base + 0.85, z); // pillars
    box(group, trim, w * 0.9, 0.06, cabL, 0, base + 1.25, cabZ);                         // the roof rack,
    box(group, LAMP, w * 0.7, 0.08, 0.03, 0, base + 1.3, cabFront - 0.05);              // and its light bar
    const bedZ = (cabBack - l / 2) / 2, bedL = cabBack + l / 2;
    for (const side of [-1, 1]) box(group, paint, 0.08, 0.4, bedL, side * (w / 2 - 0.04), base + 0.75, bedZ); // the bed's sides
    box(group, paint, w, 0.4, 0.08, 0, base + 0.75, -l / 2 + 0.04);                     // and tailgate
    box(group, trim, w * 0.9, 0.04, bedL - 0.1, 0, base + 0.56, bedZ);                  // its floor
    for (const side of [-1, 1]) box(group, trim, 0.07, 0.6, 0.07, side * w * 0.42, base + 0.86, cabBack - 0.35); // the roll bar
    box(group, trim, w * 0.9, 0.07, 0.07, 0, base + 1.16, cabBack - 0.35);
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), lambert(0x141414)); // the spare, standing in the bed
    spare.rotation.x = Math.PI / 2;
    spare.position.set(0, base + 1.0, cabBack - 0.75);
    group.add(spare);
    box(group, trim, w * 0.5, 0.34, 0.05, 0, base + 0.3, l / 2 + 0.01);                 // the grille,
    for (const y of [0.2, 0.3, 0.4]) box(group, chrome, w * 0.46, 0.03, 0.06, 0, base + y, l / 2 + 0.02); // its slats
    box(group, trim, w + 0.1, 0.24, 0.2, 0, base - 0.02, l / 2 + 0.08);                 // the bumpers
    box(group, trim, w + 0.1, 0.24, 0.2, 0, base - 0.02, -l / 2 - 0.08);
    for (const side of [-1, 1]) {
      disc(group, LAMP, 0.13, 0.06, side * w * 0.36, base + 0.32, l / 2 + 0.03);         // round lamps,
      disc(group, chrome, 0.16, 0.04, side * w * 0.36, base + 0.32, l / 2 + 0.01);
      box(group, amber, 0.14, 0.1, 0.16, side * w * 0.4, base + 0.61, l / 2 - 0.12);     // indicators perched on the wings
      box(group, TAIL, 0.1, 0.3, 0.05, side * w * 0.44, base + 0.3, -l / 2 - 0.01);
      box(group, trim, 0.1, 0.24, 0.2, side * (w / 2 + 0.08), base + 0.85, cabFront - 0.1); // mirrors
      box(group, trim, 0.3, 0.06, l * 0.3, side * (w / 2 + 0.1), base - 0.05, cabZ);     // side step
    }
    for (const z of [l * 0.34, -l * 0.14, -l * 0.36]) {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, w * 0.9, 8), trim); // an axle,
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, R + 0.18, z);
      group.add(axle);
      for (const side of [-1, 1]) {
        box(group, trim, 0.22, 0.4, 0.3, side * (w / 2 - 0.2), R + 0.08, z);             // its portal hubs
        box(group, trim, 0.26, 0.12, 1.3, side * (w / 2 + 0.06), base + 0.04, z);       // a flare over the wheel
        wheel(group, R, 0.44, side * (w / 2 + 0.02), R, z, lambert(0x3a3d42));
      }
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A classic GT (an E-Type, more or less): all curves, a very long bonnet with a power bulge down its
  // middle, a small oval mouth, faired-in headlamps, a fastback glass canopy set right back, slim
  // chrome bumperettes, and wire wheels with knock-off spinners. It sits still
  classicgt: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.32;
    const paint = lambert(car.color), glass = lambert(0x1a2230), trim = lambert(TRIM), chrome = lambert(CHROME);
    const shell = new THREE.Shape();                                                    // the body, side on:
    shell.moveTo(-L * 0.92, 0.26);
    shell.lineTo(L * 0.86, 0.26);
    shell.quadraticCurveTo(L, 0.26, L, 0.4);                                           // the chin, under the mouth
    shell.quadraticCurveTo(L, 0.6, L * 0.84, 0.64);                                    // the rounded nose
    shell.quadraticCurveTo(L * 0.4, 0.78, L * 0.02, 0.8);                              // the very long bonnet
    shell.lineTo(-L * 0.74, 0.8);
    shell.quadraticCurveTo(-L * 0.98, 0.78, -L, 0.56);                                 // the round tail
    shell.quadraticCurveTo(-L, 0.28, -L * 0.92, 0.26);
    const body = curved(group, paint, w - 0.08, shell, 0.06);
    const bulge = new THREE.Shape();                                                    // the power bulge
    bulge.moveTo(L * 0.82, 0.6);
    bulge.quadraticCurveTo(L * 0.5, 0.9, L * 0.06, 0.9);
    bulge.lineTo(L * 0.06, 0.7);
    bulge.lineTo(L * 0.82, 0.6);
    curved(group, paint, 0.5, bulge, 0.04);
    const canopy = new THREE.Shape();                                                   // the fastback canopy, set back
    canopy.moveTo(L * 0.04, 0.78);
    canopy.bezierCurveTo(-L * 0.1, 1.06, -L * 0.22, 1.12, -L * 0.36, 1.12);
    canopy.bezierCurveTo(-L * 0.58, 1.12, -L * 0.7, 0.98, -L * 0.84, 0.79);
    canopy.lineTo(L * 0.04, 0.78);
    curved(group, glass, w * 0.74, canopy, 0.05);
    box(group, trim, w * 0.3, 0.14, 0.05, 0, 0.42, L + 0.01);                           // the oval mouth,
    box(group, chrome, w * 0.32, 0.03, 0.07, 0, 0.42, L + 0.02);                        // with its bar
    for (const side of [-1, 1]) {
      disc(group, LAMP, 0.13, 0.08, side * w * 0.29, 0.53, L * 0.99);                    // faired-in headlamps,
      disc(group, glass, 0.16, 0.05, side * w * 0.29, 0.53, L * 0.97);                   // in their dark recesses
      box(group, chrome, w * 0.3, 0.05, 0.08, side * w * 0.3, 0.3, L + 0.04);           // slim bumperettes, front
      box(group, chrome, w * 0.32, 0.05, 0.08, side * w * 0.28, 0.32, -L - 0.04);       // and back
      box(group, TAIL, 0.1, 0.08, 0.04, side * w * 0.36, 0.48, -L - 0.01);
      disc(group, chrome, 0.04, 0.2, side * 0.08, 0.24, -L - 0.08);                      // twin pipes
      for (const z of [L * 0.68, -L * 0.62]) {
        wheel(group, R, 0.22, side * (w / 2 - 0.08), R, z, chrome);                     // wire wheels,
        box(group, lambert(0xe6c15a), 0.04, 0.16, 0.04, side * (w / 2 + 0.06), R, z);   // with knock-off spinners
      }
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // ---- the amphibious cars (Top Gear's two amphibious challenges, more or less) ----------------------
  // Clarkson's Toybota: a pickup turned boat, its tailgate gone for a transom board with an outboard
  // clamped to it, a life ring on the side, a rope coiled in the bed. The propeller turns as it idles
  toybota: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.38;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), white = lambert(0xf2f2f2);
    const body = box(group, paint, w, 0.55, l, 0, 0.72, 0);
    box(group, paint, w * 0.96, 0.1, l * 0.3, 0, 1.04, l * 0.34);                    // bonnet
    box(group, glass, w * 0.9, 0.5, l * 0.22, 0, 1.25, l * 0.04);                    // the cab
    box(group, paint, w * 0.92, 0.07, l * 0.22, 0, 1.53, l * 0.04);                  // its roof
    screen(group, glass, w * 0.88, 0.05, 0.64, 0, 1.24, l * 0.18, 0.5);               // windscreen
    for (const side of [-1, 1]) box(group, paint, 0.07, 0.36, l * 0.4, side * (w / 2 - 0.035), 1.16, -l * 0.27); // the bed's sides
    box(group, lambert(0x8a6a45), w, 0.5, 0.08, 0, 1.1, -l / 2 + 0.04);              // the transom board, for the tailgate
    box(group, trim, w * 0.9, 0.04, l * 0.38, 0, 1.0, -l * 0.27);                    // the bed
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 6, 14), lambert(0xd9c27a)); // a rope, coiled in it
    rope.rotation.x = Math.PI / 2;
    rope.position.set(w * 0.2, 1.06, -l * 0.33);
    group.add(rope);
    const prop = outboard(group, 0, 1.1, -l / 2 - 0.2, 1);
    for (const side of [-1, 1]) {
      box(group, LAMP, w * 0.2, 0.14, 0.06, side * w * 0.34, 0.86, l / 2 + 0.01);
      box(group, trim, 0.1, 0.1, 0.12, side * (w / 2 + 0.05), 1.3, l * 0.14);          // mirrors
      wheel(group, R, 0.28, side * (w / 2 - 0.05), R, l * 0.32, lambert(0xc4c8ce));
      wheel(group, R, 0.28, side * (w / 2 - 0.05), R, -l * 0.3, lambert(0xc4c8ce));
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), lambert(0xf2662a)); // a life ring on the bed's side
    ring.rotation.y = Math.PI / 2;
    ring.position.set(w / 2 + 0.03, 1.16, -l * 0.22);
    group.add(ring);
    box(group, trim, w + 0.04, 0.18, 0.14, 0, 0.5, l / 2 + 0.03);                     // bumper
    box(group, white, 0.03, 0.06, l * 0.9, w / 2 + 0.01, 0.98, 0);                   // a waterline stripe,
    box(group, white, 0.03, 0.06, l * 0.9, -w / 2 - 0.01, 0.98, 0);
    group.userData = { body, animate: (t) => { prop.rotation.z = t * 20; } };
    return group;
  },

  // Clarkson's Nissank: a pickup on two great black pontoons, one down each side, pointed at the front,
  // with twin outboards on the back, a tall exhaust stack behind the cab and a flag flying from it
  nissank: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2 - 0.7, l = car.hl * 2, R = 0.4; // (the cab and body inside its pontoons)
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), black = lambert(0x1c1c1e);
    const body = box(group, paint, w, 0.55, l * 0.92, 0, 0.82, 0);
    box(group, paint, w * 0.96, 0.1, l * 0.28, 0, 1.14, l * 0.32);                   // bonnet
    box(group, glass, w * 0.9, 0.5, l * 0.22, 0, 1.35, l * 0.04);                    // the cab
    box(group, paint, w * 0.92, 0.07, l * 0.22, 0, 1.63, l * 0.04);                  // its roof
    screen(group, glass, w * 0.88, 0.05, 0.64, 0, 1.34, l * 0.18, 0.5);               // windscreen
    for (const side of [-1, 1]) box(group, paint, 0.07, 0.34, l * 0.38, side * (w / 2 - 0.035), 1.26, -l * 0.26); // the bed's sides
    box(group, paint, w, 0.34, 0.07, 0, 1.26, -l * 0.44);
    for (const side of [-1, 1]) { // a pontoon down each side: a long drum with a pointed nose
      const x = side * (w / 2 + 0.36);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, l * 0.82, 14), black);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(x, 0.86, -l * 0.04);
      group.add(drum);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.7, 14), black);
      nose.rotation.x = Math.PI / 2;
      nose.position.set(x, 0.86, l * 0.37 + 0.35);
      group.add(nose);
      for (const z of [0.25, -0.05, -0.32]) box(group, trim, 0.9, 0.05, 0.08, side * (w / 2 + 0.2), 1.06, l * z); // its straps
      wheel(group, R, 0.28, side * (w / 2 - 0.05), R, l * 0.3, lambert(0xc4c8ce));
      wheel(group, R, 0.28, side * (w / 2 - 0.05), R, -l * 0.28, lambert(0xc4c8ce));
      box(group, LAMP, w * 0.22, 0.14, 0.06, side * w * 0.32, 0.96, l * 0.46 + 0.01);
    }
    const props = [-0.45, 0.45].map(x => outboard(group, x, 1.12, -l * 0.46 - 0.2, 1));
    box(group, CHROME_MAT(), 0.12, 1.4, 0.12, w * 0.32, 2.0, -l * 0.08);              // the exhaust stack,
    const flag = box(group, lambert(0xd8262b), 0.03, 0.4, 0.6, w * 0.32, 2.55, -l * 0.08 - 0.32); // and its flag
    box(group, trim, w + 0.04, 0.18, 0.14, 0, 0.6, l * 0.46 + 0.03);                   // bumper
    group.userData = { body, animate: (t) => { for (const p of props) p.rotation.z = t * 20; flag.rotation.y = Math.sin(t * 6) * 0.25; } };
    return group;
  },

  // May's Herald: a little sixties convertible with its hood down, a mast stepped in it and a white sail
  // set, a boom across the back seats, and a rudder hung off the tail. The sail stirs in the breeze
  herald: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.3;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), sailCloth = lambert(0xf4f2ea);
    const body = box(group, paint, w, 0.45, l, 0, 0.55, 0);
    box(group, paint, w * 0.94, 0.12, l * 0.34, 0, 0.82, l * 0.32);                   // the long bonnet
    box(group, paint, w * 0.94, 0.1, l * 0.24, 0, 0.82, -l * 0.38);                   // the boot, its little fins
    for (const side of [-1, 1]) box(group, paint, 0.08, 0.14, l * 0.2, side * w * 0.44, 0.92, -l * 0.39);
    screen(group, glass, w * 0.86, 0.04, 0.4, 0, 0.98, l * 0.12, 0.35);                // windscreen, the hood down
    box(group, lambert(0x3a2a20), w * 0.86, 0.2, l * 0.34, 0, 0.82, -l * 0.08);        // the seats
    box(group, lambert(0x2a2c31), w * 0.86, 0.12, 0.3, 0, 0.94, -l * 0.27);            // the folded hood
    const rig = new THREE.Group(); // (the mast, boom and sail, swaying together)
    rig.position.set(0, 0.8, l * 0.02);
    group.add(rig);
    box(rig, lambert(0xd9c9a8), 0.09, 4.2, 0.09, 0, 2.1, 0);                         // the mast
    box(rig, lambert(0xd9c9a8), 0.07, 0.07, l * 0.5, 0, 0.55, -l * 0.25);             // the boom
    prism(rig, sailCloth, 0.03, [[-0.06, 0.6], [-0.06, 4.1], [-l * 0.48, 0.6]]);        // the sail
    box(group, lambert(0x8a6a45), 0.06, 0.6, 0.4, 0, 0.4, -l / 2 - 0.2);              // the rudder
    for (const side of [-1, 1]) {
      disc(group, LAMP, 0.09, 0.06, side * w * 0.33, 0.66, l / 2 + 0.02);              // round lamps
      box(group, TAIL, 0.08, 0.12, 0.04, side * w * 0.38, 0.66, -l / 2 - 0.01);
      wheel(group, R, 0.22, side * (w / 2 - 0.06), R, l * 0.32, lambert(0xc4c8ce));
      wheel(group, R, 0.22, side * (w / 2 - 0.06), R, -l * 0.3, lambert(0xc4c8ce));
    }
    box(group, lambert(CHROME), w * 0.9, 0.06, 0.08, 0, 0.36, l / 2 + 0.04);           // slim chrome bumpers
    box(group, lambert(CHROME), w * 0.9, 0.06, 0.08, 0, 0.36, -l / 2 - 0.04);
    group.userData = { body, animate: (t) => { rig.rotation.y = Math.sin(t * 0.8) * 0.12; } };
    return group;
  },

  // Hammond's Dampervan: a high-top T3 camper gone to sea, as it was: dark green, a red band round its
  // side windows with a harlequin stripe of diamonds under them, a white fibreglass high top with a
  // window in its front, and below the cream stripe at its sheer line the black boat hull it was built
  // into, its bow pushed out round in front of the nose, a white bow plate on its corner, a tyre hung off
  // the front for a fender. A propeller and rudder at the back
  dampervan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.34;
    const paint = lambert(car.color), red = lambert(0xc8262b), glass = lambert(GLASS), trim = lambert(TRIM);
    const black = lambert(0x1c1c1e), cream = lambert(0xeae2c8), fibreglass = lambert(0xe8e6dc);
    const sheer = 0.98, nose = l / 2;
    // the hull: from just over the wheels' middles up to the sheer, its bow rounding out in front of the nose
    const hw = w / 2 + 0.06, plan = [[-hw, -nose - 0.05], [hw, -nose - 0.05], [hw, nose - 0.25]];
    for (let k = 1; k < 8; k++) { const a = (k / 8) * Math.PI; plan.push([hw * Math.cos(a), nose - 0.25 + 0.75 * Math.sin(a)]); }
    plan.push([-hw, nose - 0.25]);
    hull(group, black, plan, 0.3, sheer - 0.3);
    hull(group, cream, plan.map(([x, z]) => [x * 1.01, z + (z > nose - 0.3 ? 0.01 : 0)]), sheer, 0.07); // the cream stripe at the sheer
    const plate = box(group, cream, 0.06, 0.5, 0.7, hw * 0.78, 0.72, nose + 0.32);      // the white bow plate, on its corner
    plate.rotation.y = 0.75;
    // the van above it: dark green, its square nose, the big windscreen, the grille band and round lamps
    const body = box(group, paint, w, 0.95, l, 0, sheer + 0.06 + 0.47, 0);
    box(group, glass, w * 0.88, 0.46, 0.04, 0, 1.72, nose + 0.005);                     // the windscreen, near upright in its square face
    box(group, trim, w * 0.5, 0.2, 0.04, 0, 1.2, nose + 0.01);                          // the grille
    for (const side of [-1, 1]) {
      disc(group, LAMP, 0.12, 0.06, side * w * 0.36, 1.2, nose + 0.02);                // round lamps
      box(group, glass, 0.04, 0.42, l * 0.13, side * (w / 2 + 0.005), 1.72, l * 0.36);   // the cab's door window
      box(group, red, 0.04, 0.5, l * 0.66, side * (w / 2 + 0.005), 1.72, -l * 0.12);    // the red band round the side windows,
      for (const z of [0.12, -0.08, -0.28]) box(group, glass, 0.045, 0.36, l * 0.16, side * (w / 2 + 0.008), 1.74, l * z); // the windows in it
      box(group, cream, 0.04, 0.06, l * 0.86, side * (w / 2 + 0.006), 1.42, 0);        // the harlequin stripe:
      for (let k = 0; k < 9; k++) {                                                      // its diamonds
        const d = box(group, [red, lambert(0x2f6fd6), lambert(0xf2c418)][k % 3], 0.05, 0.09, 0.09, side * (w / 2 + 0.01), 1.42, -l * 0.4 + k * l * 0.1);
        d.rotation.x = Math.PI / 4;
      }
      box(group, TAIL, 0.08, 0.2, 0.04, side * w * 0.42, 1.3, -nose - 0.01);
      wheel(group, R, 0.26, side * (w / 2 - 0.04), R, l * 0.32, black);
      wheel(group, R, 0.26, side * (w / 2 - 0.04), R, -l * 0.3, black);
    }
    // the high top: white fibreglass, rounded over the front, a window in its front slope
    const top = new THREE.Shape();
    top.moveTo(nose - 0.15, 1.98);
    top.quadraticCurveTo(nose - 0.1, 2.5, nose - 0.55, 2.62);
    top.lineTo(-nose + 0.3, 2.68);
    top.quadraticCurveTo(-nose + 0.02, 2.66, -nose + 0.02, 2.3);
    top.lineTo(-nose + 0.02, 1.98);
    curved(group, fibreglass, w * 0.98, top, 0.08);
    const skylight = box(group, glass, w * 0.5, 0.24, 0.05, 0, 2.3, nose - 0.08);
    skylight.rotation.x = -0.45;
    // a tyre hung off the front corner, for a fender
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 8, 14), black);
    tyre.rotation.y = 0.8;
    tyre.position.set(w * 0.34, 1.22, nose + 0.12);
    group.add(tyre);
    box(group, trim, 0.06, 0.06, 0.5, 0, 0.36, -nose - 0.25);                         // the propeller's shaft,
    const prop = new THREE.Group();                                                     // and its propeller
    prop.position.set(0, 0.36, -nose - 0.5);
    group.add(prop);
    for (let k = 0; k < 3; k++) box(prop, lambert(0xc9a227), 0.05, 0.34, 0.03, 0, 0, 0).rotation.z = k * Math.PI * 2 / 3;
    box(group, trim, 0.05, 0.5, 0.36, 0, 0.5, -nose - 0.75);                          // the rudder
    group.userData = { body, animate: (t) => { prop.rotation.z = t * 18; } };
    return group;
  },

  // Hammond and May's other Transporter: a boxy, square-nosed van (a T3), lashed between bright yellow
  // floats down both sides, an outboard on the back, and a little mast with a pennant on the roof
  transporter: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2 - 0.6, l = car.hl * 2, R = 0.33;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), yellow = lambert(0xf2c418);
    const body = box(group, paint, w, 1.55, l * 0.96, 0, 1.25, 0);                     // the box of it
    prism(group, paint, w, [[l * 0.48, 0.5], [l * 0.48, 1.25], [l * 0.42, 2.0], [l * 0.3, 2.0], [l * 0.3, 0.5]]); // the square nose, raked a little
    screen(group, glass, w * 0.88, 0.05, 0.76, 0, 1.64, l * 0.45, 0.2);                 // windscreen
    box(group, trim, w * 0.94, 0.22, 0.05, 0, 0.98, l * 0.48 + 0.01);                  // the black band across the nose,
    for (const side of [-1, 1]) {
      box(group, LAMP, w * 0.2, 0.14, 0.06, side * w * 0.32, 0.98, l * 0.48 + 0.02);   // its square lamps
      box(group, glass, 0.04, 0.44, l * 0.5, side * (w / 2 + 0.005), 1.62, -l * 0.1);  // the long side windows
      box(group, TAIL, 0.08, 0.3, 0.04, side * w * 0.42, 1.0, -l * 0.48 - 0.01);
      const x = side * (w / 2 + 0.3); // a float down each side, lashed on
      box(group, yellow, 0.56, 0.5, l * 0.86, x, 0.9, -l * 0.02);
      prism(group, yellow, 0.56, [[l * 0.41, 0.65], [l * 0.41, 1.15], [l * 0.5, 1.15]], x);
      for (const z of [0.3, 0, -0.3]) box(group, trim, 0.06, 0.62, 0.08, side * (w / 2 + 0.03), 1.0, l * z); // its lashings
      wheel(group, R, 0.24, side * (w / 2 - 0.05), R, l * 0.33, lambert(0xc4c8ce));
      wheel(group, R, 0.24, side * (w / 2 - 0.05), R, -l * 0.31, lambert(0xc4c8ce));
    }
    const prop = outboard(group, 0, 1.1, -l * 0.48 - 0.2, 1);
    box(group, lambert(0xd9c9a8), 0.06, 1.2, 0.06, 0, 2.6, l * 0.1);                   // the little mast on the roof,
    const pennant = prism(group, lambert(0xd8262b), 0.02, [[l * 0.1, 3.15], [l * 0.1, 2.9], [l * 0.1 - 0.6, 3.03]]); // its pennant
    box(group, trim, w + 0.04, 0.16, 0.12, 0, 0.5, l * 0.48 + 0.04);                     // bumper
    group.userData = { body, animate: (t) => { prop.rotation.z = t * 20; pennant.rotation.y = Math.sin(t * 5) * 0.2; } };
    return group;
  },

  // The Darkvan: a full-size panel van with lifted suspension (the A-Team's, more or less):
  // big off-road tyres, a bull bar, a roof spoiler and a short nose. In its Evil livery it is
  // the A-Team's own: black over grey with the red stripe and red wheels; in its Good one,
  // plain light green.
  darkvan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM);
    const grey = lambert(0x8d9096), red = lambert(0xc8102e), chrome = lambert(CHROME);
    const body = box(group, paint, w, 1.3, l * 0.8, 0, 1.6, -l * 0.1);            // the box
    box(group, paint, w * 0.96, 0.62, l * 0.2, 0, 1.25, l * 0.4);                 // short nose
    screen(group, glass, w * 0.9, 0.05, 0.8, 0, 1.86, l * 0.32, 0.5);               // windscreen
    box(group, trim, w * 0.6, 0.1, 0.5, 0, 2.3, -l * 0.43);                       // roof spoiler
    box(group, trim, w * 0.7, 0.14, l * 0.86, 0, 0.82, -l * 0.04);                // the lifted chassis, showing
    box(group, trim, w * 0.5, 0.36, 0.06, 0, 1.2, l / 2 + 0.01);                  // grille
    // the bull bar
    box(group, trim, w * 0.9, 0.08, 0.08, 0, 1.0, l / 2 + 0.22);
    box(group, trim, w * 0.9, 0.08, 0.08, 0, 1.45, l / 2 + 0.22);
    for (const x of [-0.3, 0.3]) box(group, trim, 0.08, 0.53, 0.08, x * w, 1.22, l / 2 + 0.22);
    box(group, trim, w + 0.1, 0.22, 0.18, 0, 0.98, -l / 2 - 0.05);                // rear bumper
    const evilOnly = [], hubs = [];
    for (const side of [-1, 1]) {
      box(group, glass, 0.02, 0.42, l * 0.16, side * (w / 2 + 0.005), 1.9, l * 0.22); // cab windows
      box(group, glass, 0.02, 0.36, l * 0.16, side * (w / 2 + 0.005), 1.9, -l * 0.34); // little rear windows
      box(group, trim, 0.14, 0.12, 0.12, side * (w / 2 + 0.07), 1.75, l * 0.32);       // mirrors
      box(group, trim, 0.22, 0.06, l * 0.4, side * (w / 2 + 0.1), 0.92, l * 0.02);     // side steps
      disc(group, LAMP, 0.14, 0.08, side * w * 0.36, 1.32, l / 2 + 0.02);             // round headlights
      box(group, TAIL, 0.14, 0.4, 0.08, side * w * 0.43, 1.6, -l / 2 - 0.01);
      evilOnly.push(
        box(group, grey, 0.02, 0.5, l * 0.98, side * (w / 2 + 0.006), 1.2, 0),           // grey lower panels
        slab(group, red, 0.02, 0.14, l * 0.62, side * (w / 2 + 0.012), 1.58, -l * 0.02, -0.12)); // the red stripe
      for (const z of [0.3, -0.3]) {
        hubs.push(wheel(group, R, 0.42, side * (w / 2 - 0.02), R, l * z, chrome)[1]);
        box(group, trim, 0.06, 0.5, 0.06, side * w * 0.36, 0.72, l * z);           // lift kit: the long shocks
      }
    }
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => { // (the A-Team's grey, stripe and red wheels are the Evil livery's)
        for (const part of evilOnly) part.visible = evil;
        for (const hub of hubs) hub.material = evil ? red : chrome;
      },
    };
    group.userData.livery(false);
    return group;
  },

  // The Minivan: the same full-size van as the Darkvan, but road-going: normal ride height,
  // a row of passenger windows down each side, chrome bumpers and hubcaps.
  minivan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.38;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(group, paint, w, 1.3, l * 0.8, 0, 1.15, -l * 0.1);           // the box
    box(group, paint, w * 0.96, 0.6, l * 0.2, 0, 0.8, l * 0.4);                   // short nose
    screen(group, glass, w * 0.9, 0.05, 0.8, 0, 1.42, l * 0.32, 0.5);               // windscreen
    box(group, chrome, w * 0.5, 0.3, 0.06, 0, 0.8, l / 2 + 0.01);                 // grille
    box(group, chrome, w + 0.08, 0.18, 0.16, 0, 0.42, l / 2 + 0.04);              // chrome bumpers
    box(group, chrome, w + 0.08, 0.18, 0.16, 0, 0.42, -l / 2 - 0.04);
    box(group, glass, w * 0.7, 0.4, 0.02, 0, 1.45, -l / 2 - 0.005);               // rear windows
    for (const side of [-1, 1]) {
      for (const z of [0.22, 0.02, -0.16, -0.34]) {                                // passenger windows
        box(group, glass, 0.02, 0.42, l * 0.15, side * (w / 2 + 0.005), 1.45, l * z);
      }
      box(group, chrome, 0.02, 0.05, l * 0.9, side * (w / 2 + 0.008), 0.98, -l * 0.02); // body side trim
      box(group, trim, 0.13, 0.12, 0.12, side * (w / 2 + 0.07), 1.3, l * 0.32);   // mirrors
      box(group, LAMP, w * 0.2, 0.16, 0.08, side * w * 0.36, 0.86, l / 2 + 0.01);  // square headlamps
      box(group, TAIL, 0.14, 0.36, 0.08, side * w * 0.43, 1.0, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.3, chrome);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.3, chrome);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // The Hearse: long and low, a long glasshouse running back over the coffin deck, curtains
  // drawn in the rear windows, chrome landau bars on the rear quarters and a chrome grille.
  hearse: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), curtain = lambert(0x4a2a4a);
    const body = box(group, paint, w, 0.62, l, 0, 0.66, 0);
    box(group, paint, w * 0.95, 0.06, l * 0.26, 0, 1.0, l * 0.36);               // long bonnet
    box(group, paint, w * 0.9, 0.62, l * 0.6, 0, 1.28, -l * 0.17);               // the long roofed body
    box(group, paint, w * 0.92, 0.07, l * 0.6, 0, 1.62, -l * 0.17);              // roof
    screen(group, glass, w * 0.86, 0.05, 0.6, 0, 1.26, l * 0.18, 0.45);            // windscreen
    box(group, curtain, w * 0.7, 0.45, 0.02, 0, 1.3, -l / 2 + 0.02);              // curtained back door
    for (const side of [-1, 1]) {
      box(group, glass, 0.02, 0.42, l * 0.14, side * (w * 0.45 + 0.005), 1.3, l * 0.06); // front side windows
      box(group, curtain, 0.02, 0.38, l * 0.16, side * (w * 0.45 + 0.005), 1.3, -l * 0.14); // curtained rear windows
      // the landau bar: an S of chrome on the blind rear quarter
      slab(group, chrome, 0.03, 0.05, 0.6, side * (w * 0.45 + 0.02), 1.32, -l * 0.36, 0.5);
      slab(group, chrome, 0.03, 0.05, 0.6, side * (w * 0.45 + 0.02), 1.32, -l * 0.36, -0.5);
      box(group, chrome, 0.02, 0.05, l * 0.94, side * (w / 2 + 0.006), 0.72, 0);   // chrome side trim
      box(group, chrome, 0.12, 0.08, 0.1, side * (w / 2 + 0.05), 1.05, l * 0.2);    // mirrors
      box(group, LAMP, w * 0.2, 0.14, 0.08, side * w * 0.34, 0.78, l / 2 + 0.01);
      box(group, TAIL, 0.12, 0.34, 0.08, side * w * 0.42, 0.8, -l / 2 - 0.01);       // tall tail lamps
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.3, chrome);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.3, chrome);
    }
    box(group, chrome, w * 0.6, 0.26, 0.06, 0, 0.78, l / 2 + 0.02);               // chrome grille
    box(group, chrome, w + 0.1, 0.16, 0.16, 0, 0.42, l / 2 + 0.04);               // bumpers
    box(group, chrome, w + 0.1, 0.16, 0.16, 0, 0.42, -l / 2 - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // The Sportscar: a little two-seat roadster (a first Mazda Miata), top down, pop-up
  // headlamps up, twin racing stripes over the bonnet and boot: white on red in the Good
  // livery, black on yellow in the Evil one.
  // A modern American muscle car: long, low and wide; a long flat bonnet with a power bulge and a scoop,
  // the glasshouse set well back under a short roof, quad round headlamps set in a wide dark grille, a
  // full-width tail lamp bar, twin stripes over it nose to tail, fat tyres
  muscle: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.38;
    const shell = new THREE.Group();
    group.add(shell);
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), stripe = lambert(0xf2f2f2);
    const body = box(shell, paint, w, 0.62, l, 0, 0.66, 0);
    box(shell, paint, w * 0.98, 0.08, l * 0.42, 0, 1.0, l * 0.27);                 // the long bonnet
    box(shell, paint, w * 0.42, 0.1, l * 0.3, 0, 1.08, l * 0.27);                  // its bulge...
    box(shell, trim, w * 0.2, 0.08, 0.3, 0, 1.15, l * 0.33);                       // ...and scoop
    box(shell, glass, w * 0.84, 0.36, l * 0.34, 0, 1.18, -l * 0.12);               // glasshouse, set back
    box(shell, paint, w * 0.86, 0.07, l * 0.28, 0, 1.38, -l * 0.13);               // roof
    screen(shell, glass, w * 0.82, 0.05, 0.6, 0, 1.17, l * 0.07, 0.75);              // raked windscreen
    screen(shell, glass, w * 0.82, 0.05, 0.6, 0, 1.15, -l * 0.31, -0.55);            // rear screen
    box(shell, paint, w * 0.96, 0.1, l * 0.2, 0, 1.0, -l * 0.39);                  // short boot deck...
    box(shell, trim, w * 0.9, 0.06, 0.12, 0, 1.08, -l / 2 + 0.06);                 // ...with a lip spoiler
    for (const x of [-0.16, 0.16]) { // twin stripes over the roof, the bonnet and the boot
      box(shell, stripe, w * 0.12, 0.012, l * 0.28, x * w, 1.42, -l * 0.13);
      box(shell, stripe, w * 0.12, 0.012, l * 0.42, x * w, 1.045, l * 0.27);
      box(shell, stripe, w * 0.12, 0.012, l * 0.2, x * w, 1.055, -l * 0.39);
    }
    box(shell, trim, w * 0.94, 0.32, 0.06, 0, 0.82, l / 2 + 0.02);                 // the wide grille
    box(shell, trim, w + 0.06, 0.2, 0.16, 0, 0.42, l / 2 + 0.04);                  // bumpers
    box(shell, trim, w + 0.06, 0.2, 0.16, 0, 0.42, -l / 2 - 0.04);
    box(shell, TAIL, w * 0.9, 0.14, 0.06, 0, 0.86, -l / 2 - 0.01);                 // the tail lamp bar
    for (const side of [-1, 1]) {
      for (const x of [0.3, 0.4]) disc(shell, LAMP, 0.09, 0.06, side * w * x, 0.84, l / 2 + 0.05); // quad headlamps
      box(shell, trim, 0.12, 0.08, 0.1, side * (w / 2 + 0.06), 1.12, l * 0.04);    // mirrors
      box(shell, trim, 0.08, 0.24, 0.5, side * (w / 2 + 0.01), 0.62, -l * 0.28);   // side scoops
      wheel(group, R, 0.32, side * (w / 2 - 0.06), R, l * 0.32);
      wheel(group, R + 0.02, 0.4, side * (w / 2 - 0.08), R + 0.02, -l * 0.31);      // (fatter at the back)
    }
    group.userData = {
      body,
      animate: (t) => { shell.rotation.z = Math.sin(t * 9) * 0.006; }, // (a lumpy idle)
    };
    return group;
  },

  // A late-90s full-size SUV: a long, tall box on a truck frame; three rows of side windows, a chrome bar
  // grille between square headlamps, a silver lower body, a roof rack, running boards, barn doors at the back
  fullsize: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.44;
    const shell = new THREE.Group();
    group.add(shell);
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), silver = lambert(0xb9bcc0);
    const body = box(shell, paint, w, 0.62, l, 0, 1.05, 0);
    box(shell, silver, w + 0.02, 0.36, l + 0.02, 0, 0.62, 0);                      // the silver lower body
    box(shell, paint, w * 0.98, 0.12, l * 0.2, 0, 1.4, l * 0.39);                  // bonnet
    box(shell, glass, w * 0.96, 0.52, l * 0.72, 0, 1.62, -l * 0.1);                // the long glasshouse...
    box(shell, paint, w * 0.98, 0.08, l * 0.74, 0, 1.92, -l * 0.1);                // ...its roof
    screen(shell, glass, w * 0.9, 0.05, 0.55, 0, 1.6, l * 0.28, 0.5);                // windscreen
    for (const z of [0.25, 0.04, -0.17, -0.4]) for (const side of [-1, 1]) box(shell, paint, 0.08, 0.54, 0.12, side * w * 0.485, 1.62, l * z); // pillars: three rows of windows
    for (const side of [-1, 1]) box(shell, trim, 0.06, 0.06, l * 0.62, side * w * 0.38, 2.0, -l * 0.1); // roof rack rails...
    for (const z of [0.1, -0.15, -0.38]) box(shell, trim, w * 0.8, 0.05, 0.06, 0, 2.03, l * z);         // ...and bars
    box(shell, chrome, w * 0.6, 0.34, 0.06, 0, 1.12, l / 2 + 0.02);                // the chrome grille...
    for (const y of [1.02, 1.12, 1.22]) box(shell, trim, w * 0.58, 0.03, 0.04, 0, y, l / 2 + 0.05); // ...its bars
    box(shell, chrome, w + 0.1, 0.26, 0.2, 0, 0.58, l / 2 + 0.06);                 // chrome bumpers
    box(shell, chrome, w + 0.1, 0.26, 0.2, 0, 0.58, -l / 2 - 0.06);
    box(shell, trim, 0.04, 0.6, 0.04, 0, 1.15, -l / 2 - 0.02);                     // the barn doors' split
    for (const side of [-1, 1]) {
      box(shell, LAMP, 0.36, 0.2, 0.06, side * w * 0.36, 1.12, l / 2 + 0.03);      // square headlamps
      box(shell, TAIL, 0.12, 0.5, 0.08, side * w * 0.45, 1.1, -l / 2 - 0.02);      // tall tail lamps
      box(shell, trim, 0.16, 0.12, 0.14, side * (w / 2 + 0.08), 1.5, l * 0.25);    // mirrors
      box(shell, trim, 0.22, 0.06, l * 0.42, side * (w / 2 + 0.1), 0.42, -l * 0.02); // running boards
      wheel(group, R, 0.34, side * (w / 2 - 0.06), R, l * 0.32, lambert(0xb9bcc0));
      wheel(group, R, 0.34, side * (w / 2 - 0.06), R, -l * 0.3, lambert(0xb9bcc0));
    }
    group.userData = {
      body,
      animate: (t) => {
        shell.rotation.z = Math.sin(t * 1.4) * 0.014; // (soft springs: it wallows)
        shell.position.y = Math.sin(t * 2.8) * 0.014;
      },
    };
    return group;
  },

  // An electric luxury saloon, all curves: one smooth side profile (a rounded nose sweeping up the bonnet,
  // a short tail tucked under) with a dark glass canopy arching from the windscreen to the tail over it,
  // both extruded across the car with rounded edges. Thin light bars glow right across the nose and the
  // tail; flush aero wheels; no grille. Silent: it sits still
  evsaloon: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.37;
    const paint = lambert(car.color), glass = lambert(0x1a2230), trim = lambert(TRIM);
    const shell = new THREE.Shape();                                                 // the body, side on:
    shell.moveTo(-L * 0.92, 0.3);
    shell.lineTo(L * 0.9, 0.3);
    shell.quadraticCurveTo(L, 0.3, L, 0.52);                                         // the chin
    shell.quadraticCurveTo(L, 0.8, L * 0.86, 0.86);                                  // the rounded nose
    shell.quadraticCurveTo(L * 0.6, 0.98, L * 0.38, 1.0);                            // the bonnet
    shell.lineTo(-L * 0.78, 1.02);                                                   // the waist
    shell.quadraticCurveTo(-L * 0.98, 1.0, -L, 0.82);                                // the tail's lip
    shell.quadraticCurveTo(-L * 1.01, 0.4, -L * 0.92, 0.3);                          // tucked under
    const body = curved(group, paint, w - 0.1, shell, 0.05);
    const canopy = new THREE.Shape();                                                // the glass, side on:
    canopy.moveTo(L * 0.4, 0.96);
    canopy.bezierCurveTo(L * 0.16, 1.26, L * 0.02, 1.4, -L * 0.18, 1.4);             // windscreen into the roof
    canopy.bezierCurveTo(-L * 0.48, 1.4, -L * 0.7, 1.18, -L * 0.86, 0.98);           // and a long fastback
    canopy.lineTo(L * 0.4, 0.96);
    curved(group, glass, w * 0.8, canopy, 0.05);
    const bar = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });
    box(group, bar, w * 0.84, 0.04, 0.05, 0, 0.7, L + 0.04);                         // the light bar across the nose
    box(group, TAIL, w * 0.88, 0.05, 0.05, 0, 0.88, -L - 0.05);                      // and across the tail
    box(group, trim, w * 0.6, 0.1, 0.05, 0, 0.44, L + 0.04);                         // the lower intake (there is no grille)
    for (const side of [-1, 1]) {
      box(group, trim, 0.1, 0.06, 0.12, side * (w / 2 + 0.03), 1.02, L * 0.3);      // slim mirrors
      box(group, lambert(0xc8ccd2), 0.02, 0.03, L * 0.7, side * (w / 2 + 0.01), 0.86, -L * 0.04); // flush handle strip
      for (const z of [0.64, -0.62]) wheel(group, R, 0.3, side * (w / 2 - 0.08), R, L * z, lambert(0xd5d9de)); // aero wheels
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  miata: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.32;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM);
    const stripe = lambert(0xf4f4f4), white = 0xf4f4f4, black = 0x151515;
    const body = box(group, paint, w, 0.42, l, 0, 0.55, 0);
    box(group, paint, w * 0.92, 0.06, l * 0.34, 0, 0.78, l * 0.3);               // bonnet
    box(group, paint, w * 0.92, 0.06, l * 0.22, 0, 0.8, -l * 0.36);              // boot
    box(group, trim, w * 0.8, 0.12, l * 0.3, 0, 0.72, -l * 0.06);                 // the cockpit
    screen(group, glass, w * 0.82, 0.04, 0.36, 0, 0.92, l * 0.1, 0.9);              // small windscreen
    for (const side of [-1, 1]) {
      box(group, trim, 0.32, 0.36, 0.1, side * w * 0.2, 0.95, -l * 0.18);          // seat backs
      box(group, paint, w * 0.18, 0.12, 0.3, side * w * 0.3, 0.86, l * 0.38);      // pop-up headlamps, up...
      box(group, LAMP, w * 0.16, 0.09, 0.02, side * w * 0.3, 0.86, l * 0.38 + 0.16); // ...and lit
      box(group, stripe, w * 0.08, 0.02, l * 0.34, side * w * 0.1, 0.815, l * 0.3); // racing stripes:
      box(group, stripe, w * 0.08, 0.02, l * 0.22, side * w * 0.1, 0.835, -l * 0.36); // bonnet and boot
      box(group, trim, 0.11, 0.08, 0.1, side * (w / 2 + 0.05), 0.85, l * 0.08);    // mirrors
      box(group, TAIL, w * 0.24, 0.1, 0.06, side * w * 0.3, 0.62, -l / 2 - 0.01);
      wheel(group, R, 0.28, side * (w / 2 - 0.04), R, l * 0.32, lambert(0xb8bcc4));
      wheel(group, R, 0.28, side * (w / 2 - 0.04), R, -l * 0.31, lambert(0xb8bcc4));
    }
    box(group, trim, w * 0.4, 0.08, 0.04, 0, 0.5, l / 2 + 0.02);                  // the little mouth
    box(group, trim, w + 0.04, 0.12, 0.12, 0, 0.36, -l / 2 - 0.02);
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => { stripe.color.setHex(evil ? black : white); },
      stripe: (hex) => stripe.color.setHex(hex), // (a scheme of its own: see Traffic, a rival courier)
    };
    return group;
  },

  // The Pick Up: a lifted square-body pickup (a Chevy C-10): a boxy cab and an open bed with
  // its tailgate, a wide chrome grille with square headlamps, big off-road tyres and the
  // chassis and long shocks of the lift showing beneath.
  pickup: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.48;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(group, paint, w, 0.6, l, 0, 1.25, 0);                        // the body, end to end
    box(group, paint, w * 0.96, 0.08, l * 0.28, 0, 1.58, l * 0.35);               // bonnet
    box(group, glass, w * 0.9, 0.5, l * 0.24, 0, 1.8, l * 0.07);                  // cab glass
    box(group, paint, w * 0.92, 0.08, l * 0.24, 0, 2.08, l * 0.07);               // cab roof
    screen(group, glass, w * 0.88, 0.05, 0.55, 0, 1.8, l * 0.2, 0.35);              // windscreen
    box(group, glass, w * 0.7, 0.36, 0.02, 0, 1.82, -l * 0.05 - 0.01);            // back window
    box(group, trim, w * 0.84, 0.06, l * 0.38, 0, 1.56, -l * 0.29);               // the bed floor
    box(group, paint, w * 0.94, 0.42, 0.08, 0, 1.76, -l / 2 + 0.04);              // tailgate
    for (const side of [-1, 1]) {
      box(group, paint, 0.08, 0.42, l * 0.42, side * (w / 2 - 0.04), 1.76, -l * 0.29); // bed sides
      box(group, paint, 0.08, 0.5, 0.1, side * w * 0.45, 1.8, l * 0.17);          // windscreen pillars
      box(group, chrome, 0.14, 0.12, 0.1, side * (w / 2 + 0.07), 1.65, l * 0.18); // mirrors
      box(group, LAMP, w * 0.16, 0.16, 0.06, side * w * 0.37, 1.32, l / 2 + 0.02); // square headlamps
      box(group, TAIL, 0.1, 0.3, 0.06, side * w * 0.44, 1.5, -l / 2 - 0.01);
      for (const z of [0.31, -0.3]) {
        wheel(group, R, 0.42, side * (w / 2 - 0.02), R, l * z, chrome);
        box(group, trim, 0.06, 0.5, 0.06, side * w * 0.34, 0.75, l * z);        // the lift's long shocks
      }
    }
    box(group, chrome, w * 0.56, 0.24, 0.05, 0, 1.32, l / 2 + 0.02);              // wide chrome grille
    box(group, trim, w * 0.7, 0.14, l * 0.86, 0, 0.8, 0);                         // the chassis, showing
    box(group, chrome, w + 0.08, 0.18, 0.16, 0, 0.98, l / 2 + 0.05);              // bumpers
    box(group, chrome, w + 0.08, 0.18, 0.16, 0, 0.98, -l / 2 - 0.05);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A long, low car on hydraulics: the front end rises and falls in a smooth, endless bob,
  // pivoting about the rear axle. The front wheels hang on their suspension: they lift only
  // part of the way with the nose, so as it rises they droop below the body.
  // The Super Lowrider (model 'superlowrider') is the same car taken to extremes: flames licking
  // back along its flanks, gold wire wheels on whitewalls, a chrome continental kit on the tail, a
  // hood ornament, and neon glowing underneath, cycling through the colours; and it hops far higher,
  // rocking side to side as it goes (three-wheel motion)
  lowrider: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36, extreme = car.model === 'superlowrider';
    const rearZ = -l * 0.3, frontZ = l * 0.32;

    // everything that rises with the front end hangs off this, whose origin is the rear axle
    const chassis = new THREE.Group();
    chassis.position.set(0, R, rearZ);
    group.add(chassis);
    const at = (z) => z - rearZ; // a position along the car, measured from the pivot

    const paint = lambert(car.color);
    const body = box(chassis, paint, w, 0.42, l, 0, 0.18, at(0));
    box(chassis, lambert(0xd8d8d8), w + 0.06, 0.07, l * 0.92, 0, 0.1, at(0));          // chrome strip
    box(chassis, paint, w * 0.86, 0.1, l * 0.3, 0, 0.44, at(l * 0.3));                  // bonnet bulge
    box(chassis, lambert(0x23262d), w * 0.8, 0.36, l * 0.34, 0, 0.56, at(-l * 0.06));   // low cabin
    box(chassis, paint, w * 0.82, 0.06, l * 0.3, 0, 0.77, at(-l * 0.06));               // roof
    const chrome = lambert(CHROME), gold = lambert(0xe6c15a);
    screen(chassis, lambert(0x23262d), w * 0.78, 0.05, 0.6, 0, 0.56, at(l * 0.15), 0.62); // windscreen
    box(chassis, chrome, w + 0.1, 0.11, 0.13, 0, 0.03, at(l / 2 + 0.03));               // chrome bumpers
    box(chassis, chrome, w + 0.1, 0.11, 0.13, 0, 0.03, at(-l / 2 - 0.03));
    box(chassis, chrome, w * 0.4, 0.14, 0.06, 0, 0.22, at(l / 2 + 0.02));               // grille
    const lamp = LAMP, tail = TAIL;
    const frontAxle = new THREE.Group(); // (not part of the chassis: see animate)
    frontAxle.position.set(0, R, frontZ);
    group.add(frontAxle);
    for (const side of [-1, 1]) {
      box(chassis, paint, 0.09, 0.2, l * 0.24, side * (w / 2 - 0.045), 0.49, at(-l * 0.38)); // tail fins
      box(chassis, gold, 0.02, 0.04, l * 0.84, side * (w / 2 + 0.005), 0.3, at(0));     // pinstripe
      box(chassis, paint, 0.09, 0.36, 0.09, side * w * 0.38, 0.56, at(-l * 0.22));      // rear pillars
      box(chassis, chrome, 0.12, 0.08, 0.1, side * (w / 2 + 0.05), 0.46, at(l * 0.12)); // mirrors
      box(chassis, lamp, w * 0.2, 0.16, 0.1, side * w * 0.33, 0.22, at(l / 2 + 0.01));
      box(chassis, tail, w * 0.24, 0.1, 0.1, side * w * 0.3, 0.24, at(-l / 2 - 0.01));
      wheel(frontAxle, R, 0.3, side * (w / 2 - 0.05), 0, 0, extreme ? gold : undefined); // front wheels, on their suspension
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, rearZ, extreme ? gold : undefined);  // rear wheels stay planted
      if (extreme) {
        for (const [parent, y, z] of [[frontAxle, 0, 0], [group, R, rearZ]]) {          // whitewalls
          const wall = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.8, R * 0.8, 0.31, 16), lambert(0xf4f4f4));
          wall.rotation.z = Math.PI / 2;
          wall.position.set(side * (w / 2 - 0.05), y, z);
          parent.add(wall);
        }
        const flame = (colour, x, scale) => prism(chassis, lambert(colour), 0.02, [        // flames, licking back from the nose
          [l * 0.48, 0.1], [l * 0.48, 0.3], [l * 0.3, 0.36], [l * 0.24, 0.26], [l * 0.1, 0.34], [l * 0.04, 0.22],
          [-l * 0.1, 0.3], [-l * 0.2, 0.17], [l * 0.1, 0.12],
        ].map(([z, y]) => [at(z * scale + l * 0.48 * (1 - scale)), 0.2 + (y - 0.2) * scale]), x);
        flame(0xff7a1a, side * (w / 2 + 0.01), 1);
        flame(0xffd23f, side * (w / 2 + 0.02), 0.7);
      }
    }
    let glow = null;
    if (extreme) {
      box(chassis, chrome, 0.06, 0.12, 0.2, 0, 0.47, at(l * 0.44));                         // the hood ornament
      const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 16), lambert(0x141414)); // the continental kit:
      spare.rotation.x = Math.PI / 2;
      spare.position.set(0, 0.22, at(-l / 2 - 0.16));
      chassis.add(spare);
      disc(chassis, chrome, 0.24, 0.18, 0, 0.22, at(-l / 2 - 0.17));                       // the spare in its chrome cover
      const fade = document.createElement('canvas');                                       // (a soft pool of light: bright in the
      fade.width = fade.height = 64;                                                      // middle, fading out to nothing)
      const ctx = fade.getContext('2d'), pool = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
      pool.addColorStop(0, 'rgba(255,255,255,1)');
      pool.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, 64, 64);
      glow = new THREE.MeshBasicMaterial({ color: 0x00e5ff, map: new THREE.CanvasTexture(fade), transparent: true, depthWrite: false }); // the neon underneath, lighting
      const neon = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.45, l * 1.1), glow);            // the road out past the body
      neon.rotation.x = -Math.PI / 2;
      neon.position.set(0, 0.02, 0);
      group.add(neon);
    }

    group.userData = {
      body,
      animate: (t) => {
        const tilt = (extreme ? 0.5 : 0.27) * (1 - Math.cos(t * 4)) / 2; // 0 (level) .. 0.27 rad (0.5 hopped up), and back, smoothly
        chassis.rotation.x = -tilt; // (negative pitch lifts the nose)
        if (extreme) {
          chassis.rotation.z = Math.sin(t * 2) * 0.12;                                    // rocking side to side,
          glow.color.setHSL((t * 0.15) % 1, 1, 0.55);                                     // the neon cycling round
        }
        // the front wheels rise only a third as far as the nose does
        frontAxle.position.y = R + Math.sin(tilt) * (frontZ - rearZ) * 0.3;
      },
    };
    return group;
  },

  // A rusty old pickup (a 70s full-size one): a long bonnet, a tall cab with a raked windscreen, an
  // open load bed behind with a heap in it piled higher than the cab (purple for a good driver, yellow
  // for an evil one), a door
  // in grey primer, rust patches, one headlight out. It shudders as it idles.
  junker: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const paint = lambert(car.color), rust = lambert(0x6b3a1f), dark = lambert(0x23262d), glass = lambert(GLASS);
    const primer = lambert(0x8d9096), dull = lambert(0x9a9c9e);
    const cabFront = l * 0.15, cabBack = -l * 0.09, bonnetFront = l / 2, top = 1.12, roof = 1.9;
    const body = box(shell, paint, w, 0.55, l, 0, 0.85, 0);                                // the body sides
    box(shell, paint, w * 0.92, 0.26, bonnetFront - cabFront - 0.1, 0, top + 0.13, (bonnetFront + cabFront + 0.1) / 2); // the long bonnet
    box(shell, paint, w * 0.94, roof - top, cabFront - cabBack, 0, (top + roof) / 2, (cabFront + cabBack) / 2); // the cab
    // the windscreen, raked back from the bonnet's tail to the cab roof
    const fz = cabFront + 0.1, fy = top + 0.26, bz = cabFront - 0.18, by = roof;
    screen(shell, glass, w * 0.86, 0.05, Math.hypot(fz - bz, by - fy), 0, (fy + by) / 2, (fz + bz) / 2, Math.atan2(by - fy, fz - bz));
    box(shell, paint, w * 0.94, 0.06, cabFront - cabBack, 0, roof + 0.03, (cabFront + cabBack) / 2); // roof
    box(shell, glass, w * 0.7, 0.34, 0.04, 0, roof - 0.3, cabBack - 0.01);                // back window
    for (const side of [-1, 1]) {
      box(shell, glass, 0.04, 0.36, (cabFront - cabBack) * 0.6, side * (w * 0.47 + 0.01), roof - 0.3, (cabFront + cabBack) / 2 - 0.05); // side windows
      box(shell, paint, 0.1, 0.45, l / 2 + cabBack - 0.1, side * (w / 2 - 0.05), top + 0.22, (cabBack - l / 2) / 2 - 0.05); // bed sides
      box(shell, dull, 0.12, 0.1, 0.1, side * (w / 2 + 0.06), roof - 0.35, cabFront - 0.05); // mirrors
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, l * 0.31);
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, -l * 0.3);
    }
    box(shell, paint, w, 0.45, 0.1, 0, top + 0.22, -l / 2 + 0.05);                       // tailgate
    box(shell, dark, w * 0.86, 0.04, l / 2 + cabBack - 0.2, 0, top + 0.02, (cabBack - l / 2) / 2); // bed floor
    // the heap in the bed, its colour by the driver's side (see livery)
    const heap = lambert(0x8e44ad);
    // (domes on the bed's floor, heaped high, over the cab's roof)
    const dome = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const [x, y, z, sx, sy, sz] of [[0, top, -l * 0.29, w * 0.44, 1.3, l * 0.18], [-w * 0.17, top, -l * 0.17, w * 0.28, 0.85, l * 0.1],
      [w * 0.18, top, -l * 0.42, w * 0.27, 0.75, l * 0.08], [-w * 0.08, top + 0.7, -l * 0.31, w * 0.24, 0.6, l * 0.1]]) {
      const lump = new THREE.Mesh(dome, heap);
      lump.scale.set(sx, sy, sz);
      lump.position.set(x, y, z);
      shell.add(lump);
    }
    box(shell, primer, 0.05, 0.5, (cabFront - cabBack) * 0.8, -w / 2 - 0.01, 1.0, (cabFront + cabBack) / 2); // a door in primer
    box(shell, rust, 0.05, 0.3, l * 0.18, w / 2 + 0.01, 0.78, -l * 0.3);                // rust patches
    box(shell, rust, w * 0.45, 0.03, l * 0.1, w * 0.15, top + 0.27, l * 0.38);
    box(shell, dull, w * 0.6, 0.3, 0.05, 0, 0.92, l / 2 + 0.01);                        // the grille
    box(shell, dull, w + 0.1, 0.16, 0.14, 0, 0.56, l / 2 + 0.04);                       // bumpers
    box(shell, dull, w + 0.1, 0.16, 0.14, 0, 0.56, -l / 2 - 0.04);
    disc(shell, LAMP, 0.13, 0.06, -w * 0.38, 0.92, l / 2 + 0.02);                       // one headlight works...
    disc(shell, dark, 0.13, 0.06, w * 0.38, 0.92, l / 2 + 0.02);                        // ...the other's out
    for (const side of [-1, 1]) box(shell, TAIL, w * 0.12, 0.2, 0.08, side * w * 0.4, 0.95, -l / 2 - 0.01);
    group.userData = {
      body,
      livery: (evil) => heap.color.setHex(evil ? 0xe0bd1c : 0x8e44ad), // (a yellow heap of who knows what, or a purple one)
      animate: (t) => { // a rough idle: the body shudders on its springs
        shell.position.y = Math.sin(t * 31) * 0.012;
        shell.rotation.z = Math.sin(t * 23) * 0.008;
      },
    };
    return group;
  },

  // A small, low sports coupe: wedge nose, a centre stripe, a wing on the back.
  sport: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const paint = lambert(car.color), dark = lambert(0x1c1f25), white = lambert(0xf4f4f4);
    const body = box(group, paint, w, 0.36, l, 0, 0.52, 0);
    box(group, paint, w * 0.94, 0.12, l * 0.3, 0, 0.72, l * 0.3);                 // low bonnet
    box(group, dark, w * 0.8, 0.32, l * 0.36, 0, 0.86, -l * 0.06);                // cabin
    box(group, paint, w * 0.76, 0.05, l * 0.26, 0, 1.04, -l * 0.08);              // roof
    box(group, white, w * 0.16, 0.02, l * 0.3, 0, 0.79, l * 0.3);                 // stripe: bonnet,
    box(group, white, w * 0.16, 0.02, l * 0.26, 0, 1.075, -l * 0.08);             // roof,
    box(group, white, w * 0.16, 0.02, l * 0.2, 0, 0.71, -l * 0.39);               // and boot
    for (const side of [-1, 1]) box(group, dark, 0.06, 0.2, 0.08, side * w * 0.36, 0.84, -l * 0.44); // wing posts
    box(group, paint, w * 1.02, 0.05, 0.3, 0, 0.96, -l * 0.45);                   // wing
    box(group, dark, w * 0.9, 0.1, 0.12, 0, 0.4, l / 2 + 0.02);                   // splitter
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    for (const side of [-1, 1]) {
      box(group, lamp, w * 0.22, 0.1, 0.1, side * w * 0.33, 0.6, l / 2 + 0.01);
      box(group, tail, w * 0.3, 0.08, 0.1, side * w * 0.3, 0.62, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.3);
      wheel(group, R, 0.32, side * (w / 2 - 0.04), R, -l * 0.31);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A big, boxy family 4x4: tall glasshouse, roof rails, a spare wheel on the back.
  wagon: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.46;
    const paint = lambert(car.color), dark = lambert(0x20242b), trim = lambert(0x2a2a2a);
    const body = box(group, paint, w, 0.7, l, 0, 0.95, 0);
    box(group, trim, w + 0.06, 0.2, l + 0.04, 0, 0.66, 0);                        // lower cladding
    box(group, paint, w * 0.96, 0.6, l * 0.64, 0, 1.6, -l * 0.12);                // upper body
    box(group, dark, w * 0.98, 0.36, l * 0.56, 0, 1.62, -l * 0.12);               // side windows
    box(group, dark, w * 0.84, 0.36, l * 0.66, 0, 1.62, -l * 0.12);               // screens, front and back
    for (const side of [-1, 1]) box(group, trim, 0.06, 0.06, l * 0.5, side * w * 0.38, 1.95, -l * 0.12); // roof rails
    box(group, lambert(0xcfd3d8), w * 0.5, 0.2, 0.06, 0, 1.0, l / 2 + 0.02);      // grille
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    for (const side of [-1, 1]) {
      box(group, lamp, w * 0.18, 0.2, 0.1, side * w * 0.37, 1.0, l / 2 + 0.01);
      box(group, tail, w * 0.12, 0.34, 0.1, side * w * 0.42, 1.05, -l / 2 - 0.01);
      wheel(group, R, 0.34, side * (w / 2 - 0.04), R, l * 0.3);
      wheel(group, R, 0.34, side * (w / 2 - 0.04), R, -l * 0.3);
    }
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.26, 16), lambert(0x141414));
    spare.rotation.x = Math.PI / 2; // flat against the tailgate
    spare.position.set(0, 1.1, -l / 2 - 0.16);
    group.add(spare);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A split-colour camper bus: painted below, white above, a V on its flat nose, big round
  // headlights, a surfboard on the roof, and its spare tyre carried on the nose. It sways gently as it goes.
  lovebus: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, R = 0.4;
    const paint = lambert(car.color), white = lambert(0xf6f3ea), dark = lambert(0x23262d);
    const body = box(shell, paint, w, 0.75, l, 0, 0.85, 0);
    box(shell, white, w * 0.99, 0.85, l * 0.99, 0, 1.65, 0);                      // upper half
    box(shell, dark, w * 1.01, 0.4, l * 0.78, 0, 1.68, -l * 0.04);                // side windows
    box(shell, dark, w * 0.84, 0.42, 0.06, 0, 1.7, l / 2);                        // split windscreen
    box(shell, white, 0.06, 0.44, 0.08, 0, 1.7, l / 2 + 0.01);
    for (const side of [-1, 1]) { // the V on the nose, in the body colour's opposite
      const arm = box(shell, white, 0.12, 0.62, 0.05, side * w * 0.14, 0.92, l / 2 + 0.01);
      arm.rotation.z = side * 0.42;
    }
    box(shell, lambert(0xd8d8d8), w + 0.08, 0.12, 0.12, 0, 0.5, l / 2 + 0.03);    // chrome bumpers
    box(shell, lambert(0xd8d8d8), w + 0.08, 0.12, 0.12, 0, 0.5, -l / 2 - 0.03);
    box(shell, lambert(0xff7eb6), w * 0.3, 0.07, l * 0.8, w * 0.18, 2.16, -l * 0.02); // surfboard
    disc(shell, lambert(0x141414), 0.3, 0.2, 0, 0.62, l / 2 + 0.16);              // the spare tyre, on the bumper...
    disc(shell, lambert(CHROME), 0.15, 0.22, 0, 0.62, l / 2 + 0.16);              // ...and its hubcap
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 14), lamp);
      light.rotation.x = Math.PI / 2;
      light.position.set(side * w * 0.33, 0.92, l / 2 + 0.03);
      shell.add(light);
      box(shell, tail, w * 0.1, 0.24, 0.1, side * w * 0.4, 0.9, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.32);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.32);
    }
    group.userData = {
      body,
      animate: (t) => { // a slow, easy sway
        shell.rotation.z = Math.sin(t * 2.2) * 0.025;
        shell.position.y = Math.sin(t * 4.4) * 0.015;
      },
    };
    return group;
  },

  // A Checker Marathon cab: a long, upright sedan with a checker band down each side, quad
  // round headlights, big chrome bumpers and a lit TAXI sign on the roof.
  taxi: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.38;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.6, l, 0, 0.65, 0);
    box(group, paint, w * 0.95, 0.06, l * 0.27, 0, 0.98, l * 0.37);               // bonnet
    box(group, paint, w * 0.95, 0.06, l * 0.2, 0, 0.98, -l * 0.41);               // boot
    box(group, glass, w * 0.88, 0.52, l * 0.46, 0, 1.21, -l * 0.06);              // glasshouse
    box(group, paint, w * 0.9, 0.08, l * 0.44, 0, 1.5, -l * 0.06);                // roof
    screen(group, glass, w * 0.86, 0.05, 0.56, 0, 1.2, l * 0.19, 0.36);             // windscreen
    screen(group, glass, w * 0.84, 0.05, 0.54, 0, 1.2, -l * 0.3, -0.36);            // rear window
    // the checker band: two rows of black and white squares
    const checks = document.createElement('canvas');
    checks.width = 256; checks.height = 16;
    const g = checks.getContext('2d');
    for (let i = 0; i < 32; i++) {
      for (let row = 0; row < 2; row++) {
        g.fillStyle = (i + row) % 2 ? '#111111' : '#f4f4f4';
        g.fillRect(i * 8, row * 8, 8, 8);
      }
    }
    const band = new THREE.CanvasTexture(checks);
    band.colorSpace = THREE.SRGBColorSpace;
    const checker = new THREE.MeshLambertMaterial({ map: band });
    // the roof sign, lit from inside
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128; signCanvas.height = 48;
    const s = signCanvas.getContext('2d');
    s.fillStyle = '#fff6c8';
    s.fillRect(0, 0, 128, 48);
    s.fillStyle = '#1b1b1b';
    s.font = 'bold 34px sans-serif';
    s.textAlign = 'center';
    s.textBaseline = 'middle';
    s.fillText('TAXI', 64, 26);
    const signMap = new THREE.CanvasTexture(signCanvas);
    signMap.colorSpace = THREE.SRGBColorSpace;
    box(group, new THREE.MeshBasicMaterial({ map: signMap }), 0.9, 0.26, 0.42, 0, 1.68, -l * 0.04);
    for (const side of [-1, 1]) {
      box(group, checker, 0.02, 0.14, l * 0.86, side * (w / 2 + 0.006), 0.84, 0);  // checker band
      for (const z of [0.12, -0.06, -0.26]) box(group, paint, 0.09, 0.52, 0.1, side * w * 0.43, 1.21, l * z); // pillars
      box(group, chrome, 0.12, 0.08, 0.1, side * (w / 2 + 0.05), 1.0, l * 0.16);    // mirrors
      for (const x of [0.22, 0.4]) disc(group, LAMP, 0.11, 0.08, side * w * x, 0.78, l / 2 + 0.02); // quad headlights
      box(group, TAIL, w * 0.12, 0.26, 0.1, side * w * 0.4, 0.75, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.3);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.3);
    }
    box(group, chrome, w * 0.24, 0.22, 0.06, 0, 0.78, l / 2 + 0.02);               // grille
    box(group, chrome, w + 0.14, 0.2, 0.18, 0, 0.42, l / 2 + 0.05);               // big chrome bumpers
    box(group, chrome, w + 0.14, 0.2, 0.18, 0, 0.42, -l / 2 - 0.05);
    box(group, trim, w * 0.5, 0.18, 0.04, 0, 0.62, -l / 2 - 0.02);                // number plate
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A 2002 Jeep Liberty: tall and square, round headlights either side of the seven-slot
  // grille, black arch flares, roof rails and a spare wheel on the tailgate. It rocks a
  // little on its soft springs.
  suv: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const shell = new THREE.Group(); // (what rocks on the springs: everything but the wheels)
    group.add(shell);
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(shell, paint, w, 0.75, l, 0, 0.78, 0);
    box(shell, paint, w * 0.96, 0.1, l * 0.24, 0, 1.18, l * 0.37);                // bonnet
    box(shell, glass, w * 0.9, 0.5, l * 0.6, 0, 1.42, -l * 0.08);                 // glasshouse
    box(shell, paint, w * 0.92, 0.08, l * 0.62, 0, 1.7, -l * 0.08);               // roof
    screen(shell, glass, w * 0.88, 0.05, 0.62, 0, 1.4, l * 0.25, 0.55);             // windscreen
    box(shell, paint, w * 0.56, 0.4, 0.06, 0, 0.9, l / 2 + 0.02);                 // grille...
    for (let i = 0; i < 7; i++) box(shell, trim, 0.06, 0.3, 0.04, (i - 3) * w * 0.075, 0.9, l / 2 + 0.05); // ...its seven slots
    box(shell, trim, w + 0.1, 0.24, 0.18, 0, 0.5, l / 2 + 0.05);                  // bumpers
    box(shell, trim, w + 0.1, 0.24, 0.18, 0, 0.5, -l / 2 - 0.05);
    // the spare wheel on the tailgate
    disc(shell, lambert(0x141414), 0.38, 0.24, 0, 1.0, -l / 2 - 0.15);
    disc(shell, lambert(0x8d9096), 0.2, 0.26, 0, 1.0, -l / 2 - 0.15);
    for (const side of [-1, 1]) {
      disc(shell, LAMP, 0.15, 0.08, side * w * 0.38, 0.98, l / 2 + 0.03);         // round headlights
      box(shell, TAIL, 0.14, 0.42, 0.1, side * w * 0.43, 1.0, -l / 2 - 0.01);       // tall tail lights
      for (const z of [0.18, -0.08, -0.36]) box(shell, paint, 0.09, 0.5, 0.1, side * w * 0.45, 1.42, l * z); // pillars
      box(shell, trim, 0.06, 0.06, l * 0.56, side * w * 0.4, 1.78, -l * 0.08);      // roof rails
      box(shell, trim, 0.14, 0.1, 0.12, side * (w / 2 + 0.07), 1.22, l * 0.2);      // mirrors
      for (const z of [0.3, -0.3]) box(shell, trim, 0.1, 0.12, 1.1, side * (w / 2 + 0.03), R * 2 + 0.08, l * z); // arch flares
      box(shell, chrome, 0.02, 0.05, l * 0.3, side * (w / 2 + 0.005), 0.98, 0);    // door handles strip
      wheel(group, R, 0.32, side * (w / 2 - 0.05), R, l * 0.3);
      wheel(group, R, 0.32, side * (w / 2 - 0.05), R, -l * 0.3);
    }
    group.userData = {
      body,
      animate: (t) => {
        shell.rotation.z = Math.sin(t * 1.7) * 0.012;
        shell.position.y = Math.sin(t * 3.4) * 0.012;
      },
    };
    return group;
  },

  // A Ford lo-boy hot rod: no fenders, a long narrow bonnet with the engine out in the open
  // (chrome stacks and all), big wheels at the back, skinny ones up front, and a chopped
  // windscreen over an open cockpit. The engine shakes as it idles.
  hotrod: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, RR = 0.5, RF = 0.34;
    const paint = lambert(car.color), chrome = lambert(CHROME), trim = lambert(TRIM), glass = lambert(GLASS);
    box(group, trim, w * 0.5, 0.12, l * 0.9, 0, 0.42, 0);                          // frame rails
    const body = box(group, paint, w * 0.78, 0.55, l * 0.36, 0, 0.78, -l * 0.12);   // the tub
    box(group, trim, w * 0.6, 0.2, l * 0.2, 0, 0.98, -l * 0.15);                    // cockpit and seat
    box(group, paint, w * 0.52, 0.32, l * 0.3, 0, 0.82, l * 0.2);                   // bonnet
    box(group, paint, w * 0.5, 0.62, 0.14, 0, 0.88, l * 0.36);                      // grille shell
    box(group, chrome, w * 0.38, 0.48, 0.04, 0, 0.88, l * 0.44);                    // grille bars
    box(group, glass, w * 0.7, 0.22, 0.04, 0, 1.18, l * 0.06);                      // chopped windscreen
    box(group, chrome, w * 0.74, 0.04, 0.06, 0, 1.3, l * 0.06);                     // its frame
    box(group, trim, w * 0.9, 0.08, 0.1, 0, 0.42, l * 0.33);                        // dropped front axle
    box(group, chrome, w * 0.5, 0.12, 0.1, 0, 0.42, -l / 2 + 0.05);                 // rear nerf bar
    const engine = new THREE.Group(); // (it shakes)
    engine.position.set(0, 1.0, l * 0.22);
    group.add(engine);
    box(engine, lambert(0x5a5e66), w * 0.4, 0.22, 0.6, 0, 0, 0);                    // the block, showing
    box(engine, chrome, w * 0.3, 0.2, 0.4, 0, 0.2, 0);                              // blower
    box(engine, lambert(0x8d9096), w * 0.24, 0.08, 0.3, 0, 0.34, -0.02);           // its scoop
    for (const side of [-1, 1]) {
      for (const z of [-0.15, 0.05, 0.25]) { // stacks
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), chrome);
        stack.position.set(side * w * 0.27, 0.12, z);
        engine.add(stack);
      }
      box(group, chrome, 0.07, 0.07, l * 0.55, side * w * 0.3, 0.55, -l * 0.05);   // side pipes
      disc(group, LAMP, 0.13, 0.12, side * w * 0.33, 1.02, l * 0.38);              // headlights on a bar
      box(group, chrome, 0.04, 0.24, 0.04, side * w * 0.33, 0.86, l * 0.38);
      box(group, TAIL, 0.12, 0.12, 0.06, side * w * 0.3, 0.72, -l * 0.3 - 0.01);
      wheel(group, RR, 0.42, side * (w / 2 - 0.08), RR, -l * 0.3);                  // big ones at the back
      wheel(group, RF, 0.2, side * w * 0.42, RF, l * 0.33);                         // skinny ones up front
    }
    group.userData = {
      body,
      animate: (t) => {
        engine.rotation.z = Math.sin(t * 38) * 0.04;
        engine.position.y = 1.0 + Math.abs(Math.sin(t * 19)) * 0.02;
      },
    };
    return group;
  },
};
MODELS.superlowrider = MODELS.lowrider; // (the lowrider builder makes both: see it)

// ---- the Battlefield's armies (CONFIG.vehicles: jeep, apc, tank; the player's 8x8: LEVEL_CARS.apc) ------
// Each in its army's colours (the paint: userData.body; a darker second colour on its trim), with a gun that
// turns (userData.aim(yaw): rad from straight ahead, + to its right) on all but the jeep.

const ARMY_DARK = 0x2b2e26, ARMY_STEEL = 0x4a4d45;
// a turret on a ring, turning about its middle: the group to add the gun and the hatch to
const turretOn = (group, y, z) => {
  const turret = new THREE.Group();
  turret.position.set(0, y, z);
  group.add(turret);
  return turret;
};
Object.assign(MODELS, {
  // an army jeep: an open-topped four-by-four with a roll bar, a spare wheel on the back and a
  // machine gun on a post (no turret: it throws packages)
  jeep: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const paint = lambert(car.color), dark = lambert(ARMY_DARK), steel = lambert(ARMY_STEEL);
    const body = box(group, paint, w, 0.55, l * 0.9, 0, 0.75, 0);                        // the tub
    box(group, paint, w * 0.95, 0.3, l * 0.32, 0, 1.1, l * 0.28);                         // bonnet
    box(group, dark, w * 0.9, 0.08, 0.06, 0, 1.45, l * 0.12);                            // the windscreen frame
    box(group, lambert(GLASS), w * 0.84, 0.36, 0.04, 0, 1.28, l * 0.12);                 // folded flat glass
    for (const side of [-1, 1]) {
      box(group, steel, 0.08, 0.75, 0.08, side * w * 0.42, 1.4, -l * 0.18);              // the roll bar
      wheel(group, R, 0.32, side * (w / 2 + 0.02), R, l * 0.32, steel);
      wheel(group, R, 0.32, side * (w / 2 + 0.02), R, -l * 0.32, steel);
      box(group, dark, 0.2, 0.1, l * 0.3, side * (w / 2 + 0.05), 0.95, l * 0.32);        // the wings over the wheels
      box(group, dark, 0.2, 0.1, l * 0.3, side * (w / 2 + 0.05), 0.95, -l * 0.32);
    }
    box(group, steel, w * 0.84, 0.08, 0.08, 0, 1.78, -l * 0.18);                         // across the roll bar
    box(group, dark, 0.08, 0.6, 0.08, 0, 1.4, -l * 0.02);                                // the gun post...
    box(group, dark, 0.1, 0.12, 0.9, 0, 1.75, l * 0.1);                                  // ...and gun
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.26, 14), lambert(0x141414));
    spare.rotation.x = Math.PI / 2;
    spare.position.set(0, 1.0, -l / 2 - 0.15);
    group.add(spare);
    box(group, LAMP, w * 0.18, 0.12, 0.05, -w * 0.3, 1.0, l * 0.45);
    box(group, LAMP, w * 0.18, 0.12, 0.05, w * 0.3, 1.0, l * 0.45);
    group.userData = { body, animate: () => {} };
    return group;
  },
  // an 8x8: a long armoured car with a sloped nose, eight big wheels, and a small turret with a gun
  apc: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.55;
    const paint = lambert(car.color), dark = lambert(ARMY_DARK), steel = lambert(ARMY_STEEL);
    const body = box(group, paint, w, 1.0, l * 0.88, 0, 1.15, -l * 0.04);              // the hull
    prism(group, paint, w, [[l * 0.4, 0.65], [l * 0.5, 0.9], [l * 0.42, 1.65], [l * 0.36, 1.65], [l * 0.36, 0.65]]); // its sloped nose
    box(group, dark, w * 0.9, 0.08, l * 0.75, 0, 1.68, -l * 0.06);                      // the roof
    for (const side of [-1, 1]) {
      for (const z of [0.36, 0.17, -0.12, -0.31]) wheel(group, R, 0.42, side * (w / 2 - 0.05), R, l * z, steel);
      box(group, dark, 0.06, 0.25, l * 0.82, side * (w / 2 + 0.02), 1.4, -l * 0.04);    // a dark band down each side
      box(group, LAMP, 0.18, 0.1, 0.05, side * w * 0.33, 1.28, l * 0.49);
    }
    const turret = turretOn(group, 1.72, l * 0.04);
    box(turret, paint, w * 0.55, 0.45, w * 0.6, 0, 0.22, 0);
    box(turret, dark, 0.3, 0.12, 0.3, -0.25, 0.5, -0.15);                               // the hatch
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 10), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.25, 1.15);
    turret.add(barrel);
    group.userData = { body, animate: () => {}, aim: (yaw) => { turret.rotation.y = -yaw; } };
    return group;
  },
  // a tank: on its tracks, a long low hull and a big turret with a long gun
  armytank: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2;
    const paint = lambert(car.color), dark = lambert(ARMY_DARK), steel = lambert(ARMY_STEEL);
    const tracks = [];
    for (const side of [-1, 1]) {
      tracks.push(box(group, dark, w * 0.24, 0.85, l, side * w * 0.38, 0.45, 0));      // the tracks...
      for (let k = 0; k < 5; k++) {                                                     // ...and their road wheels
        const wheelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, w * 0.25, 12), steel);
        wheelMesh.rotation.z = Math.PI / 2;
        wheelMesh.position.set(side * w * 0.38, 0.38, -l * 0.38 + k * l * 0.19);
        group.add(wheelMesh);
      }
    }
    const body = box(group, paint, w * 0.8, 0.7, l * 0.95, 0, 1.15, 0);                 // the hull
    prism(group, paint, w * 0.8, [[l * 0.47, 0.8], [l * 0.5, 1.15], [l * 0.42, 1.5], [l * 0.35, 1.5], [l * 0.35, 0.8]]);
    box(group, dark, w * 0.4, 0.06, l * 0.2, 0, 1.52, -l * 0.35);                       // the engine deck
    const turret = turretOn(group, 1.5, -l * 0.05);
    box(turret, paint, w * 0.62, 0.62, l * 0.42, 0, 0.31, 0);
    box(turret, paint, w * 0.45, 0.45, l * 0.15, 0, 0.3, -l * 0.27);                    // its bustle
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), dark);
    hatch.position.set(0.3, 0.66, -0.2);
    turret.add(hatch);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 12), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.32, l * 0.21 + 1.8);
    turret.add(barrel);
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 12), dark);
    brake.rotation.x = Math.PI / 2;
    brake.position.set(0, 0.32, l * 0.21 + 3.5);
    turret.add(brake);
    // a broken track (see Traffic's tracksBroken): its left one thrown, the rear of it off its wheels and
    // lying out flat on the road behind
    const thrown = box(group, dark, w * 0.24, 0.12, l * 0.9, -w * 0.38, 0.06, -l * 0.85);
    thrown.rotation.y = 0.12;
    thrown.visible = false;
    const broken = (on) => {
      thrown.visible = on;
      tracks[0].scale.z = on ? 0.55 : 1;
      tracks[0].position.z = on ? l * 0.225 : 0;
    };
    group.userData = { body, animate: () => {}, aim: (yaw) => { turret.rotation.y = -yaw; }, broken };
    return group;
  },
});

// Four garage cars (cars.js: the Blue Star cars at four stars) whose builders were drawn as car ideas and still
// live with the ideas' (render/ideaModels.js, which knows nothing of the game): the same builder, by the same
// name, with an animate as every model here has
import { IDEA_MODELS } from './ideaModels.js';
for (const name of ['gullwing', 'rearengine', 'snake', 'polytruck']) {
  MODELS[name] = (car) => {
    const model = IDEA_MODELS[name](car);
    model.userData.animate = model.userData.animate || (() => {});
    return model;
  };
}
