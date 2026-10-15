// ---- the second batch of car ideas' models ----------------------------------------------------------
// Twenty more vehicles drawn as ideas (ideas.js: IDEA_CARS, the entries after the Fire Engine), each after a real
// one and each with a silhouette of its own: a funeral coach, a tuk-tuk, a golf cart, a hovercraft, a steam wagon,
// a tipper, a dune buggy, an ice-cream van, a yellow cab, a cement mixer, a wrecker, a police wagon, a camper, a
// pickup with a boat, a kei roadster, an armoured van, a dragster, a cigar racer, a field scout and a scooter
// with a sidecar. They are built as ideaModels.js' are (the same helpers, kept here as copies so that the two files
// do not import each other): each builder takes the idea's entry and returns a group, front facing local +z,
// with userData.body (the mesh whose material is the paint, so the livery can be swapped), userData.animate
// (seconds) => void, and sometimes userData.livery (evil) => void. ideaModels.js spreads IDEA_MODELS_2 into
// IDEA_MODELS. State-free: nothing here knows about the game.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
const TYRE = lambert(0x141414), STEEL = lambert(0xc4c8ce), WHITE = lambert(0xf4f2ec);
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const AMBER = new THREE.MeshBasicMaterial({ color: 0xffa31a });
// (returns [tyre, hub]; the hub is steel unless given a material of its own)
const wheel = (parent, radius, width, x, y, z, hubMaterial = STEEL) => {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), TYRE);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.04, 12), hubMaterial);
  for (const mesh of [tyre, hub]) {
    mesh.rotation.z = Math.PI / 2; // axle across the car
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return [tyre, hub];
};
// a wheel with a white wall to its tyre
const whitewall = (parent, radius, width, x, y, z, hubMaterial) => {
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, width + 0.02, 16), WHITE);
  wall.rotation.z = Math.PI / 2;
  wall.position.set(x, y, z);
  parent.add(wall);
  return wheel(parent, radius, width, x, y, z, hubMaterial);
};
// a wheel with spokes (a thin tyre and rim, bars through the hub): the old wooden and wire wheels
const spoked = (parent, radius, width, x, y, z, spokeMaterial) => {
  const ring = (r, w, material) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 18), material);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  ring(radius, width, TYRE);
  ring(radius * 0.84, width + 0.02, spokeMaterial);
  ring(radius * 0.74, width + 0.04, lambert(0x2a2118)); // (the gaps between the spokes: dark)
  for (let i = 0; i < 4; i++) box(parent, spokeMaterial, width + 0.06, 0.04, radius * 1.5, x, y, z).rotation.x = i * Math.PI / 4;
};
// a flat panel tipped about the car's width: a windscreen. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
// a solid block whose side view is the polygon `profile` ([z, y] points), `w` wide across the car, its middle at x
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a solid whose end view is the polygon `profile` ([x, y] points), `length` long, its middle at z
const hull = (parent, material, profile, length, z = 0) => {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, z - length / 2);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
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
// a round bar: `axis` 'x' across the car, 'y' upright, 'z' along it
const tube = (parent, material, r, length, x, y, z, axis = 'y') => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 10), material);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a round bar from the point `a` to the point `b` (each [x, y, z])
const rod = (parent, material, r, a, b) => {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), dir = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 8), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(mesh);
  return mesh;
};
// a cone (or a drum, if the two radii are alike) standing upright
const cone = (parent, material, rTop, rBottom, h, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 16), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a rounded lump (a wing over a wheel, a dome, a bubble): a ball squashed to rx, ry, rz
const BALL = new THREE.SphereGeometry(1, 16, 10);
const blob = (parent, material, rx, ry, rz, x, y, z) => {
  const mesh = new THREE.Mesh(BALL, material);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a mudguard: the top half of a drum lying across the car, its middle at (x, y, z)
const fender = (parent, material, r, width, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 14, 1, false, 0, Math.PI), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a block that narrows (or grows) along the car: from the cross-section `a` to `b`, each [z, width, bottom, top],
// its middle at x. A pointed nose, a snout
const taper = (parent, material, a, b, x = 0) => {
  const corners = [];
  for (const [z, w, y0, y1] of [a[0] < b[0] ? a : b, a[0] < b[0] ? b : a]) corners.push([-w / 2, y0, z], [w / 2, y0, z], [w / 2, y1, z], [-w / 2, y1, z]);
  const faces = [4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 0, 7, 3, 0, 4, 7];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(i => [corners[i][0] + x, corners[i][1], corners[i][2]]), 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a pair of round headlamps (a lamp in a chrome ring) at the front, `k` of the width out from the middle
const headlamps = (parent, w, y, z, r = 0.1, k = 0.34) => {
  for (const side of [-1, 1]) {
    disc(parent, lambert(CHROME), r * 1.25, 0.05, side * w * k, y, z);
    disc(parent, LAMP, r, 0.07, side * w * k, y, z + 0.005);
  }
};
// a pair of red tail lamps at the back
const taillamps = (parent, w, y, z, k = 0.4, size = [0.1, 0.16]) => {
  for (const side of [-1, 1]) box(parent, TAIL, size[0], size[1], 0.04, side * w * k, y, z);
};

export const IDEA_MODELS_2 = {
  // A funeral coach (a Cadillac Miller-Meteor hearse): a long, low box with a roofed cab and a glass-sided
  // compartment behind it, a coffin under a spray of flowers in that, chrome landau bars on the pillars and a
  // grille like a church door. It sits still
  funeralcoach: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.34;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const see = new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.22, depthWrite: false });
    const body = box(group, paint, w, 0.62, L * 2, 0, 0.66, 0);                              // the low body, y 0.35 to 0.97
    box(group, glass, w * 0.96, 0.55, L * 0.45, 0, 1.245, L * 0.33);                         // the cab's glass
    box(group, paint, w * 0.985, 0.55, L * 0.12, 0, 1.245, 0);                               // the pillar behind the cab
    box(group, paint, w * 0.985, 0.55, L * 0.1, 0, 1.245, -L * 0.95);                        // and the one at the very back
    box(group, paint, w, 0.08, L * 1.56, 0, 1.56, -L * 0.2);                                 // the roof over both
    // the compartment: dark glass you can see through, the floor, a curtain behind the cab, the coffin
    box(group, trim, w * 0.94, 0.04, L * 0.84, 0, 0.99, -L * 0.5);
    box(group, lambert(0x7a2a3a), w * 0.92, 0.5, 0.05, 0, 1.25, -L * 0.07);
    box(group, lambert(0x4a321f), w * 0.4, 0.3, L * 0.62, 0, 1.16, -L * 0.52);              // the coffin,
    box(group, lambert(0x8a6238), w * 0.3, 0.04, L * 0.5, 0, 1.33, -L * 0.52);              // its lid,
    for (const [c, z] of [[0xd23a4a, -0.38], [0xf4f2ec, -0.52], [0xe8c23a, -0.66]]) blob(group, lambert(c), 0.2, 0.1, 0.2, 0, 1.4, L * z); // and the flowers on it
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.012);
      box(group, see, 0.03, 0.55, L * 0.76, x, 1.245, -L * 0.52);                           // the compartment's side glass,
      for (const z of [-0.28, -0.52, -0.76]) box(group, paint, 0.1, 0.55, 0.1, side * (w / 2 - 0.05), 1.245, L * z); // between pillars
      box(group, chrome, 0.05, 0.3, 0.05, side * (w / 2 + 0.01), 1.3, -L * 0.8);            // landau bars on the back pillar
      box(group, chrome, 0.03, 0.03, L * 1.3, side * (w / 2 + 0.01), 0.99, -L * 0.2);      // a chrome strip along the waist
      box(group, chrome, 0.06, 0.04, L * 1.5, side * w * 0.42, 1.62, -L * 0.2);            // roof rails
      wheel(group, R, 0.22, side * (w / 2 - 0.02), R, L * 0.6, STEEL);
      wheel(group, R, 0.22, side * (w / 2 - 0.02), R, -L * 0.6, STEEL);
    }
    box(group, paint, w * 0.9, 0.06, L * 0.4, 0, 1.0, L * 0.76);                             // the bonnet's panel,
    box(group, chrome, w * 0.5, 0.26, 0.06, 0, 0.7, L + 0.03);                                // the grille,
    for (const x of [-0.25, -0.12, 0, 0.12, 0.25]) box(group, trim, 0.025, 0.2, 0.07, x * w, 0.7, L + 0.035);
    box(group, chrome, w + 0.06, 0.12, 0.1, 0, 0.44, L + 0.05);                               // bumpers,
    box(group, chrome, w + 0.06, 0.12, 0.1, 0, 0.44, -L - 0.05);
    headlamps(group, w, 0.78, L + 0.02, 0.1, 0.36);
    taillamps(group, w, 0.8, -L - 0.03, 0.4, [0.12, 0.2]);
    box(group, chrome, 0.05, 0.14, 0.2, 0, 1.06, L * 0.94);                                  // a mascot on the bonnet
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A tuk-tuk (a Bajaj auto-rickshaw): one front wheel under a rounded cowl with the handlebars over it, an open
  // bench behind under a black canvas roof on four posts, two back wheels. It rocks on its springs
  tuktuk: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, L = car.hl, R = 0.27;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), canvas = lambert(0x24322b), seat = lambert(0xe6dcc0);
    const body = box(shell, paint, w, 0.45, L * 1.15, 0, 0.62, -L * 0.425);                 // the tub the bench sits in
    box(shell, paint, w * 0.7, 0.4, L * 0.4, 0, 0.6, L * 0.35);                              // the driver's part, narrower
    taper(shell, paint, [L * 0.55, w * 0.7, 0.4, 0.88], [L * 0.9, w * 0.4, 0.5, 0.78]);       // the nose, rounding off to the wheel
    box(shell, seat, w * 0.82, 0.18, L * 0.5, 0, 0.94, -L * 0.55);                           // the passengers' bench,
    box(shell, seat, w * 0.82, 0.5, 0.1, 0, 1.2, -L * 0.88);                                 // its back,
    box(shell, seat, w * 0.4, 0.14, L * 0.26, 0, 0.88, L * 0.32);                            // and the driver's saddle
    box(shell, canvas, w * 1.04, 0.07, L * 1.5, 0, 1.82, -L * 0.28);                         // the canvas roof,
    for (const side of [-1, 1]) {
      rod(shell, trim, 0.035, [side * w * 0.46, 0.85, -L * 0.94], [side * w * 0.46, 1.79, -L * 0.94]);  // on its posts
      rod(shell, trim, 0.035, [side * w * 0.46, 0.85, L * 0.42], [side * w * 0.46, 1.79, L * 0.42]);
      taillamps(shell, w, 0.7, -L - 0.01, 0.4);
      fender(shell, paint, R + 0.08, 0.2, side * (w / 2 - 0.02), R, -L * 0.6);              // mudguards over the back wheels
      wheel(group, R, 0.17, side * (w / 2 - 0.02), R, -L * 0.6);
    }
    box(shell, glass, w * 0.66, 0.4, 0.03, 0, 1.3, L * 0.5).rotation.x = 0.2;                  // the windscreen
    box(shell, trim, w * 0.78, 0.05, 0.08, 0, 1.56, L * 0.46);                               // its top frame
    for (const side of [-1, 1]) rod(shell, trim, 0.03, [side * w * 0.36, 1.04, L * 0.52], [side * w * 0.36, 1.57, L * 0.46]);
    tube(shell, chrome, 0.025, w * 0.8, 0, 1.0, L * 0.6, 'x');                               // the handlebars,
    rod(shell, trim, 0.03, [0, 0.8, L * 0.72], [0, 1.0, L * 0.6]);                           // their stem,
    disc(shell, LAMP, 0.1, 0.12, 0, 0.82, L * 0.76);                                         // and the lamp on the cowl
    disc(shell, chrome, 0.12, 0.06, 0, 0.82, L * 0.72);
    fender(shell, paint, R + 0.07, 0.2, 0, R, L * 0.78);                                      // the front mudguard
    wheel(group, R, 0.2, 0, R, L * 0.78);                                                    // the one front wheel,
    for (const side of [-1, 1]) rod(group, trim, 0.025, [side * 0.1, R, L * 0.78], [side * 0.08, 0.8, L * 0.7]); // on its fork
    box(shell, trim, w * 1.02, 0.07, 0.08, 0, 0.4, -L - 0.01);                               // a rear bumper bar
    group.userData = { body, animate: (t) => { shell.rotation.z = Math.sin(t * 2.2) * 0.012; shell.rotation.x = Math.sin(t * 3.1) * 0.008; } };
    return group;
  },

  // A golf cart (an E-Z-GO): a little open nose over a floor, a bench under a thin roof on four posts, a
  // windscreen, two golf bags on a rack at the back. Four small wheels. It is the quietest thing in the garage
  golfcart: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.24;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), seat = lambert(0xe9e2cc);
    const body = taper(group, paint, [L * 0.3, w * 0.95, 0.3, 0.74], [L * 0.97, w * 0.78, 0.34, 0.6]); // the cowl and nose
    box(group, trim, w * 0.92, 0.07, L * 1.9, 0, 0.27, 0);                                 // the floor and frame
    box(group, paint, w, 0.07, L * 1.5, 0, 0.36, -L * 0.2);                                  // the floor panel
    box(group, seat, w * 0.86, 0.14, L * 0.5, 0, 0.62, -L * 0.03);                         // the bench,
    box(group, seat, w * 0.86, 0.4, 0.1, 0, 0.88, -L * 0.3);                                 // and its back
    box(group, paint, w, 0.34, L * 0.5, 0, 0.55, -L * 0.72);                                 // the body at the back
    box(group, trim, w * 0.96, 0.05, L * 0.5, 0, 0.745, -L * 0.72);                           // its rack
    for (const [x, c] of [[-0.22, 0x2e5a3a], [0.2, 0xa8282c]]) {                             // two golf bags
      tube(group, lambert(c), 0.13, 0.62, x, 1.07, -L * 0.74).userData.prop = 'cargo'; // (the golf bags: a decorative load, tagged cargo, hidden by a chosen cargo prop, render/propcosmetic.js)
      blob(group, lambert(c), 0.13, 0.07, 0.13, x, 1.38, -L * 0.74).userData.prop = 'cargo';
      for (const k of [-0.07, 0.07]) blob(group, k > 0 ? WHITE : lambert(CHROME), 0.045, 0.045, 0.045, x + k, 1.47, -L * 0.74).userData.prop = 'cargo';
    }
    box(group, WHITE, w * 1.04, 0.06, L * 1.5, 0, 1.78, -L * 0.1);                          // the roof
    for (const side of [-1, 1]) {
      const x = side * w * 0.46;
      rod(group, trim, 0.03, [x, 0.6, L * 0.45], [x, 1.75, L * 0.45]);                      // roof posts,
      rod(group, trim, 0.03, [x, 0.6, -L * 0.86], [x, 1.75, -L * 0.86]);
      wheel(group, R, 0.16, side * (w / 2 - 0.04), R, L * 0.62, lambert(0x8a8f96));
      wheel(group, R, 0.16, side * (w / 2 - 0.04), R, -L * 0.62, lambert(0x8a8f96));
    }
    box(group, glass, w * 0.9, 0.5, 0.03, 0, 1.2, L * 0.46).rotation.x = 0.12;                // the windscreen
    rod(group, trim, 0.03, [0, 0.7, L * 0.38], [0, 1.0, L * 0.22]);                           // the steering column,
    disc(group, trim, 0.13, 0.03, -w * 0.2, 1.0, L * 0.2).rotation.x = Math.PI / 2 - 0.5;    // and the wheel
    headlamps(group, w, 0.5, L * 0.97 + 0.01, 0.07, 0.28);
    taillamps(group, w, 0.55, -L * 0.97 - 0.01, 0.42, [0.08, 0.1]);
    box(group, chrome, w * 0.9, 0.05, 0.05, 0, 0.35, L * 0.99);                             // bumper
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A hovercraft (a Griffon): a black rubber skirt round the whole hull, a cabin forward, and behind it a caged
  // fan in a duct on a pylon with two rudders. No wheels at all: the skirt floats on a cushion of air. The fan
  // turns and the whole craft bobs
  hovercraft: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, L = car.hl, r = w / 2, run = L - r;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), rubber = lambert(0x1b1c1f), steel = lambert(0xa9aeb5);
    const stripe = lambert(0xf4f2ec);
    // the skirt: a stadium of black rubber, the hull a smaller stadium on top
    box(shell, rubber, w, 0.49, run * 2, 0, 0.3, 0);
    for (const s of [-1, 1]) tube(shell, rubber, r, 0.5, 0, 0.3, s * run);
    const body = box(shell, paint, w - 0.22, 0.29, run * 2, 0, 0.64, 0);
    for (const s of [-1, 1]) tube(shell, paint, r - 0.11, 0.3, 0, 0.64, s * run);
    box(shell, stripe, w - 0.2, 0.05, run * 2, 0, 0.5, 0);               // a white band between skirt and hull
    for (const s of [-1, 1]) tube(shell, stripe, r - 0.1, 0.05, 0, 0.5, s * run);
    // the cabin forward: a glassy box under a roof, a bow lamp
    box(shell, paint, w * 0.74, 0.22, 1.6, 0, 0.9, L * 0.28);
    box(shell, glass, w * 0.76, 0.46, 1.5, 0, 1.24, L * 0.28);
    box(shell, paint, w * 0.78, 0.08, 1.6, 0, 1.52, L * 0.28);
    for (const z of [0.2, 0.9, -0.5]) box(shell, paint, w * 0.775, 0.46, 0.08, 0, 1.24, L * 0.28 + z * 0.9);  // pillars
    for (const side of [-1, 1]) {
      box(shell, TAIL, 0.1, 0.12, 0.05, side * w * 0.3, 0.64, -L - 0.02);
      disc(shell, LAMP, 0.11, 0.08, side * w * 0.25, 0.9, L * 0.28 + 0.8 + 0.01);
      box(shell, trim, 0.05, 0.05, 0.9, side * w * 0.46, 0.84, -L * 0.28);                  // a handrail along the deck
    }
    box(shell, WHITE, 0.4, 0.04, 0.4, 0, 0.82, -L * 0.3).rotation.y = 0.4;                    // a cargo hatch on the afterdeck
    // the fan: a pylon, a duct (a ring), a cage, four blades
    const ductPaint = new THREE.MeshLambertMaterial({ color: car.color, side: THREE.DoubleSide });
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.5, 24, 1, true), ductPaint);
    duct.rotation.x = Math.PI / 2;
    duct.position.set(0, 1.78, -L * 0.68);
    shell.add(duct);
    box(shell, trim, 0.4, 0.5, 0.45, 0, 0.98, -L * 0.68);
    const fan = new THREE.Group();
    fan.position.set(0, 1.78, -L * 0.68);
    for (let i = 0; i < 4; i++) {
      const blade = box(fan, trim, 0.16, 0.78, 0.04, 0, 0, 0);
      blade.geometry.translate(0, 0.39, 0);
      blade.rotation.z = i * Math.PI / 2;
    }
    blob(fan, steel, 0.14, 0.14, 0.14, 0, 0, 0);
    shell.add(fan);
    for (const z of [0.27, -0.27]) {                                                          // the cage across the duct's mouths
      tube(shell, steel, 0.02, 1.76, 0, 1.78, -L * 0.68 + z, 'x');
      tube(shell, steel, 0.02, 1.76, 0, 1.78, -L * 0.68 + z, 'y');
    }
    for (const side of [-1, 1]) box(shell, paint, 0.05, 1.2, 0.4, side * 0.3, 1.78, -L * 0.68 - 0.45);  // two rudders behind
    group.userData = {
      body,
      lampFrame: shell, // (the body the lamps ride on: render/carlights.js frame)
      livery: (evil) => ductPaint.color.setHex(evil ? car.evilColor : car.color),
      animate: (t) => { fan.rotation.z = t * 28; shell.position.y = 0.04 + Math.sin(t * 1.7) * 0.015; shell.rotation.z = Math.sin(t * 1.1) * 0.012; },
    };
    return group;
  },

  // A steam wagon (a Stanley Steamer): a boiler under a round bonnet with a brass nose and a chimney that puffs,
  // an open body of two bench seats, big wooden wheels with thin spokes, brass lamps. No roof, on purpose
  steamwagon: (car) => {
    const group = new THREE.Group(), puffs = [];
    const w = car.hw * 2, L = car.hl, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), brass = lambert(0xc9a23a), trim = lambert(TRIM), leather = lambert(0x6b2a22), wood = lambert(0xb48a52), floor = lambert(0x4a3622);
    const body = box(group, paint, w * 0.86, 0.5, L * 1.45, 0, 0.9, -L * 0.28);              // the body's tub, y 0.65 to 1.15
    box(group, floor, w * 0.72, 0.03, L * 1.1, 0, 1.165, -L * 0.34);                        // its floor, in wood
    for (const side of [-1, 1]) {
      box(group, paint, 0.07, 0.34, L * 1.4, side * w * 0.4, 1.31, -L * 0.3);               // its low sides
      spoked(group, R, 0.1, side * (w / 2 - 0.03), R, -L * 0.62, wood);                     // wheels, bigger behind
      spoked(group, R * 0.9, 0.1, side * (w / 2 - 0.03), R * 0.9, L * 0.62, wood);
      fender(group, paint, 0.58, 0.16, side * (w * 0.45), R, -L * 0.62);
      fender(group, paint, 0.52, 0.16, side * (w * 0.45), R * 0.9, L * 0.62);
      box(group, trim, 0.2, 0.04, L * 0.95, side * (w * 0.46), 0.6, 0.08 * L);              // running boards
      disc(group, lambert(0xe6d9a4), 0.12, 0.1, side * w * 0.3, 1.3, L * 0.86);              // brass lamps either side of the bonnet
      disc(group, brass, 0.15, 0.05, side * w * 0.3, 1.3, L * 0.82);
      tube(group, brass, 0.025, 0.4, side * w * 0.3, 1.1, L * 0.8);
    }
    tube(group, paint, 0.38, L * 0.8, 0, 1.0, L * 0.6, 'z');                                  // the boiler's round bonnet
    tube(group, brass, 0.4, 0.07, 0, 1.0, L * 0.99, 'z');                                     // its brass nose ring
    tube(group, brass, 0.06, 0.34, 0, 1.58, L * 0.55);                                        // the chimney,
    tube(group, trim, 0.09, 0.07, 0, 1.76, L * 0.55);
    box(group, trim, w * 0.2, 0.05, L * 0.3, 0, 0.62, L * 0.9);                              // the front axle housing, low
    for (const [z, a] of [[-0.12, 0.55], [-0.74, 0.55]]) {                                    // the two bench seats
      box(group, leather, w * 0.68, 0.2, L * 0.4, 0, 1.28, L * z);
      box(group, leather, w * 0.68, 0.5, 0.1, 0, 1.6, L * (z - 0.2) * 1.0).rotation.x = -0.1 * a;
    }
    box(group, glass, w * 0.7, 0.34, 0.03, 0, 1.55, L * 0.26).rotation.x = -0.15;             // the little windscreen,
    box(group, brass, w * 0.74, 0.04, 0.05, 0, 1.73, L * 0.27);
    rod(group, brass, 0.025, [0, 1.2, L * 0.3], [0, 1.45, L * 0.18]);                         // the steering column
    disc(group, wood, 0.17, 0.03, -w * 0.15, 1.46, L * 0.17).rotation.x = Math.PI / 2 - 0.6;
    box(group, paint, w * 0.7, 0.4, 0.35, 0, 1.0, -L * 0.98);                                 // the boot
    box(group, lambert(CHROME), w * 0.86, 0.05, 0.06, 0, 0.82, -L * 0.95);                    // a bumper rail
    box(group, TAIL, 0.1, 0.1, 0.04, w * 0.28, 1.2, -L * 0.99 - 0.18);
    for (let i = 0; i < 3; i++) {                                                             // puffs of steam off the chimney
      const puff = blob(group, WHITE, 0.15, 0.15, 0.15, 0, 1.9, L * 0.55);
      puffs.push(puff);
    }
    group.userData = {
      body,
      animate: (t) => puffs.forEach((p, i) => {
        const k = ((t * 0.5 + i / 3) % 1);
        p.position.set(0, 1.85 + k * 0.7, L * 0.55 - k * 0.5);
        p.scale.setScalar(0.1 + k * 0.25);
      }),
    };
    return group;
  },

  // A tipper (a three-axle dump truck): a bonnet and a cab with a shield sticking out over it, a deep tipping
  // body on the chassis heaped with earth, one steering axle in front and a tandem of dual wheels at the back
  tipper: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.55;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), earth = lambert(0x6e5236), dark = lambert(0x3a3d42);
    box(group, trim, w * 0.7, 0.25, L * 1.9, 0, 0.78, 0);                                    // the chassis
    const body = prism(group, paint, w * 0.98, [[-L * 0.98, 1.0], [L * 0.12, 1.0], [L * 0.12, 2.55], [-L * 0.98, 2.3]]); // the tipping body
    box(group, paint, w * 0.98, 0.1, L * 0.4, 0, 2.5, L * 0.32);                              // the shield over the cab
    blob(group, earth, w * 0.4, 0.3, L * 0.4, 0, 2.35, -L * 0.42).userData.prop = 'cargo';                            // the load, heaped above the sides
    box(group, dark, w * 0.84, 0.16, L * 0.1, 0, 1.08, -L - 0.02);                           // the tailgate's hinge strip
    box(group, paint, w * 0.92, 1.2, L * 0.32, 0, 1.5, L * 0.38);                            // the cab
    box(group, glass, w * 0.86, 0.5, 0.04, 0, 1.78, L * 0.54 + 0.005);                       // its windscreen
    box(group, paint, w * 0.94, 0.07, 0.22, 0, 2.12, L * 0.57);                              // and visor
    box(group, paint, w * 0.74, 0.7, L * 0.38, 0, 1.25, L * 0.78);                           // the bonnet,
    box(group, chrome, w * 0.5, 0.36, 0.05, 0, 1.25, L * 0.97 + 0.01);                       // the grille,
    for (let i = -3; i <= 3; i++) box(group, trim, 0.025, 0.3, 0.06, i * w * 0.06, 1.25, L * 0.97 + 0.015);
    box(group, trim, w * 0.96, 0.24, 0.3, 0, 0.82, L * 0.99);                                // a heavy bumper
    tube(group, chrome, 0.05, 0.95, w * 0.28, 2.0, L * 0.6);                                  // the exhaust stack
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.12);
      box(group, glass, 0.03, 0.5, L * 0.26, side * (w * 0.46 + 0.012), 1.78, L * 0.38);
      headlamps(group, w, 1.25, L * 0.97 + 0.015, 0.09, 0.42);
      fender(group, paint, 0.64, 0.4, x, R, L * 0.6);                                        // over the steering wheel
      wheel(group, R, 0.36, x, R, L * 0.6, chrome);
      for (const z of [-0.44, -0.72]) {                                                    // the tandem, in duals
        wheel(group, R, 0.34, x, R, L * z, chrome);
        wheel(group, R, 0.34, x - side * 0.4, R, L * z, chrome);
      }
      box(group, TAIL, 0.14, 0.2, 0.05, side * w * 0.42, 1.3, -L - 0.02);
      box(group, dark, 0.04, 0.5, 0.5, x, 0.98, -L * 0.92);                                  // mudflaps
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A dune buggy (a Meyers Manx): a fibreglass bathtub on a short chassis with no doors and no roof, a roll hoop,
  // the air-cooled engine bare at the back, fat balloon tyres behind and thin ones in front
  dunebuggy: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.44;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), seat = lambert(0x8a2a22), metal = lambert(0x6d7178);
    const body = box(group, paint, w * 0.56, 0.2, L * 1.1, 0, 0.56, -L * 0.02);              // the tub's floor
    taper(group, paint, [L * 0.5, w * 0.56, 0.46, 0.8], [L * 0.99, w * 0.4, 0.5, 0.66]);     // the nose
    box(group, lambert(0x3a2c24), w * 0.4, 0.02, L * 0.8, 0, 0.675, -L * 0.1);               // the cockpit floor in dark rubber
    for (const side of [-1, 1]) {
      const x = side * w * 0.26;
      box(group, paint, 0.1, 0.42, L * 1.0, x, 0.8, -L * 0.1);                                // the tub's sides
      box(group, seat, w * 0.2, 0.12, L * 0.32, side * w * 0.12, 0.74, -L * 0.1);            // two bucket seats
      box(group, seat, w * 0.2, 0.34, 0.1, side * w * 0.12, 0.95, -L * 0.28);
      fender(group, paint, 0.34, 0.26, side * (w / 2 - 0.1), 0.3, L * 0.66);                  // thin front wings
      wheel(group, 0.3, 0.2, side * (w / 2 - 0.1), 0.3, L * 0.66, chrome);
      fender(group, paint, 0.52, 0.5, side * (w / 2 - 0.19), R, -L * 0.62);                   // fat back ones
      wheel(group, R, 0.42, side * (w / 2 - 0.19), R, -L * 0.62, chrome);
      rod(group, chrome, 0.03, [side * w * 0.26, 0.98, -L * 0.06], [side * w * 0.26, 1.42, -L * 0.2]); // the roll hoop's legs,
      rod(group, chrome, 0.03, [side * w * 0.26, 1.42, -L * 0.2], [side * w * 0.26, 0.95, -L * 0.52]); // and its back stays
      rod(group, chrome, 0.035, [side * w * 0.12, 0.45, -L - 0.12], [side * w * 0.2, 0.52, -L - 0.12 - 0.0]); // the exhaust pipes
      headlamps(group, w, 0.66, L * 0.99, 0.09, 0.15);
      box(group, TAIL, 0.08, 0.1, 0.04, side * w * 0.3, 0.8, -L * 0.7 - 0.0);
    }
    tube(group, chrome, 0.03, w * 0.6, 0, 1.42, -L * 0.2, 'x');                               // the hoop's top bar
    box(group, metal, w * 0.28, 0.34, L * 0.3, 0, 0.82, -L * 0.7);                          // the engine, bare
    for (const x of [-0.18, 0.18]) {                                                       // its two round air filters
      tube(group, chrome, 0.09, 0.16, x, 1.08, -L * 0.7);
    }
    tube(group, chrome, 0.045, w * 0.5, 0, 0.5, -L - 0.12, 'x');                              // a pipe across the tail
    box(group, glass, w * 0.46, 0.22, 0.03, 0, 1.12, L * 0.36).rotation.x = -0.45;           // a tiny windscreen
    rod(group, trim, 0.025, [0, 0.8, L * 0.3], [0, 1.05, L * 0.12]);                         // the steering column,
    disc(group, trim, 0.12, 0.03, -w * 0.12, 1.06, L * 0.1).rotation.x = Math.PI / 2 - 0.5;
    group.userData = { body, animate: () => {} };
    return group;
  },

  // An ice-cream van (a Bedford CA "Mr Whippy"): a bonneted van with a serving hatch under a striped awning on
  // each side, a chimes speaker and, on the roof, a giant cone with three scoops and a cherry
  creamvan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.37;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), waffle = lambert(0xd6a455), scoop = lambert(0xf8e6c8), pinkScoop = lambert(0xf09ab6);
    const body = box(group, paint, w, 1.7, L * 1.45, 0, 1.25, -L * 0.27);                    // the van, y 0.4 to 2.1
    box(group, paint, w * 0.96, 0.8, L * 0.55, 0, 0.8, L * 0.725);                          // the bonnet in front of it
    box(group, glass, w * 0.9, 0.75, 0.03, 0, 1.62, L * 0.455 + 0.005);                     // the windscreen
    box(group, WHITE, w * 1.01, 0.22, L * 1.45, 0, 0.62, -L * 0.27);     // a white skirt round the base
    box(group, chrome, w * 0.5, 0.3, 0.05, 0, 0.8, L + 0.025);                              // the grille,
    for (const x of [-0.18, -0.06, 0.06, 0.18]) box(group, trim, 0.02, 0.24, 0.06, x * w * 1.1, 0.8, L + 0.03);
    box(group, chrome, w + 0.04, 0.12, 0.1, 0, 0.5, L + 0.04);                              // the bumpers
    box(group, chrome, w + 0.04, 0.12, 0.1, 0, 0.5, -L - 0.04);
    headlamps(group, w, 1.0, L + 0.01, 0.1, 0.36);
    taillamps(group, w, 1.0, -L - 0.015, 0.42, [0.1, 0.24]);
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.012);
      box(group, glass, 0.03, 0.55, L * 0.3, x, 1.65, L * 0.3);                              // the cab's side window
      box(group, glass, 0.03, 0.5, L * 0.7, x, 1.5, -L * 0.28);                              // the serving hatch, open
      box(group, chrome, 0.12, 0.05, L * 0.74, side * (w / 2 + 0.06), 1.22, -L * 0.28);      // its counter
      for (let i = 0; i < 5; i++) {                                                           // the awning over it, in stripes
        const stripe = box(group, i % 2 ? WHITE : lambert(0xd23a4a), 0.62, 0.04, L * 0.15, side * (w / 2 + 0.32), 2.0, -L * 0.28 - L * 0.3 + i * L * 0.15);
        stripe.rotation.z = side * -0.35;
      }
      for (let i = 0; i < 3; i++) box(group, i % 2 ? WHITE : lambert(0xd23a4a), 0.03, 0.12, L * 0.2, side * (w / 2 + 0.64), 1.75, -L * 0.28 - L * 0.2 + i * L * 0.2); // and its scalloped edge
      whitewall(group, R, 0.22, side * (w / 2 - 0.02), R, L * 0.66, chrome);
      whitewall(group, R, 0.22, side * (w / 2 - 0.02), R, -L * 0.6, chrome);
      box(group, trim, 0.1, 0.2, 0.1, side * (w / 2 + 0.1), 1.7, L * 0.42);                   // mirrors
    }
    box(group, trim, w * 0.34, 0.14, 0.34, w * 0.24, 2.2, L * 0.2).userData.prop = 'roof';                          // the chimes' speaker
    // the cone: tip down on a stand, three scoops and a cherry
    tube(group, trim, 0.06, 0.12, 0, 2.16, -L * 0.2).userData.prop = 'roof';
    cone(group, waffle, 0.34, 0.04, 0.62, 0, 2.52, -L * 0.2).userData.prop = 'roof';
    blob(group, scoop, 0.4, 0.28, 0.4, 0, 2.86, -L * 0.2).userData.prop = 'roof';
    blob(group, pinkScoop, 0.32, 0.22, 0.32, 0, 3.1, -L * 0.2).userData.prop = 'roof';
    blob(group, WHITE, 0.2, 0.15, 0.2, 0, 3.3, -L * 0.2).userData.prop = 'roof';
    blob(group, lambert(0xc4161e), 0.07, 0.07, 0.07, 0, 3.47, -L * 0.2).userData.prop = 'roof';
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A yellow cab (a Checker): a tall, square saloon with a chequered band down each flank, a roof sign, big
  // chrome bumpers and a long boot
  yellowcab: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.34;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), black = lambert(0x16161a);
    const body = box(group, paint, w, 0.65, L * 2, 0, 0.68, 0);                              // the low body, y 0.35 to 1.0
    box(group, glass, w * 0.94, 0.5, L * 1.0, 0, 1.25, -L * 0.18);                           // the glass cabin,
    box(group, paint, w, 0.08, L * 1.1, 0, 1.54, -L * 0.18);                                 // under its roof
    for (const z of [0.3, -0.04, -0.4, -0.68]) box(group, paint, w * 0.975, 0.5, 0.11, 0, 1.25, L * z); // pillars
    box(group, paint, w * 0.9, 0.05, L * 0.7, 0, 1.025, L * 0.62);                          // the bonnet's panel
    box(group, paint, w * 0.9, 0.05, L * 0.3, 0, 1.025, -L * 0.85);                         // and the boot's
    for (let i = 0; i < 14; i++) for (const side of [-1, 1]) {
      box(group, i % 2 ? WHITE : black, 0.02, 0.1, L * 2 / 14 - 0.01, side * (w / 2 + 0.008), 0.84, -L + (i + 0.5) * L * 2 / 14); // the chequered band
    }
    box(group, WHITE, 0.4, 0.14, 0.14, 0, 1.65, -L * 0.1).userData.prop = 'roof';                                     // the TAXI sign: white,
    box(group, black, 0.3, 0.06, 0.16, 0, 1.65, -L * 0.1).userData.prop = 'roof';                                    // with a dark word-strip
    box(group, chrome, w * 0.6, 0.26, 0.05, 0, 0.76, L + 0.025);                             // the grille
    for (let i = -4; i <= 4; i++) box(group, trim, 0.02, 0.2, 0.06, i * w * 0.06, 0.76, L + 0.03);
    box(group, chrome, w + 0.06, 0.16, 0.14, 0, 0.45, L + 0.06);                             // great bumpers
    box(group, chrome, w + 0.06, 0.16, 0.14, 0, 0.45, -L - 0.06);
    headlamps(group, w, 0.8, L + 0.01, 0.1, 0.38);
    taillamps(group, w, 0.8, -L - 0.015, 0.4, [0.14, 0.2]);
    for (const side of [-1, 1]) {
      box(group, trim, 0.08, 0.1, 0.1, side * (w / 2 + 0.05), 1.15, L * 0.28);              // mirrors
      whitewall(group, R, 0.22, side * (w / 2 - 0.02), R, L * 0.62, chrome);
      whitewall(group, R, 0.22, side * (w / 2 - 0.02), R, -L * 0.6, chrome);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A cement mixer (a Mack R-model): a cab-over cab, and over the chassis a tilted drum that runs from a fat
  // belly to a small mouth, with a fin winding round it, its hopper at the back. The drum turns
  mixer: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.55;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), fin = lambert(0xf0ead8), steel = lambert(0x8d9299);
    box(group, trim, w * 0.7, 0.3, L * 1.9, 0, 0.82, 0);                                      // the chassis
    const cab = box(group, paint, w * 0.9, 1.5, L * 0.44, 0, 1.7, L * 0.7);                   // the cab, flat-fronted
    box(group, glass, w * 0.82, 0.62, 0.04, 0, 2.1, L * 0.92 + 0.005);
    box(group, paint, w * 0.92, 0.07, 0.24, 0, 2.52, L * 0.94);                              // visor
    box(group, chrome, w * 0.6, 0.42, 0.05, 0, 1.3, L * 0.92 + 0.025);                       // grille
    for (let i = -3; i <= 3; i++) box(group, trim, 0.02, 0.36, 0.06, i * w * 0.07, 1.3, L * 0.92 + 0.03);
    box(group, trim, w * 0.96, 0.24, 0.3, 0, 0.9, L * 0.96);                                 // bumper
    headlamps(group, w, 1.3, L * 0.92 + 0.03, 0.1, 0.4);
    // the drum: spin inside tilt (the rear end the higher)
    const tilt = new THREE.Group(), spin = new THREE.Group();
    tilt.position.set(0, 2.45, -L * 0.3);
    tilt.rotation.x = 0.2;
    tilt.add(spin);
    const drum = (rTop, rBottom, len, z) => {                                                 // (a cylinder along the car, rTop towards the front)
      const mesh = cone(spin, paint, rTop, rBottom, len, 0, 0, z);
      mesh.rotation.x = Math.PI / 2;
      return mesh;
    };
    const belly = drum(0.9, 0.9, 2.6, 0);
    drum(0.45, 0.9, 0.7, 1.65);                                                                // the nose
    drum(0.9, 0.42, 1.2, -1.9);                                                                // the tail, narrowing to the mouth
    for (let k = 0; k < 4; k++) {                                                              // the fin: slabs wound round the belly
      for (let i = 0; i < 6; i++) {
        const a = k * Math.PI / 2 + i * 0.32 + 0.0, z = 1.1 - i * 0.44;
        const s = box(spin, fin, 0.12, 0.06, 0.52, Math.sin(a) * 0.93, Math.cos(a) * 0.93, z);
        s.rotation.z = -a;
        s.rotation.x = 0.0;
      }
    }
    for (const z of [-0.7, 0.6]) {                                                            // two steel rings round the belly
      const ring = cone(spin, steel, 0.94, 0.94, 0.12, 0, 0, z);
      ring.rotation.x = Math.PI / 2;
    }
    group.add(tilt);
    box(group, trim, 0.6, 0.5, 0.5, 0, 1.2, L * 0.15);                                        // the drum's front cradle on the chassis
    box(group, steel, w * 0.5, 0.5, 0.5, 0, 1.2, -L * 0.62);                                  // and the rear
    box(group, paint, w * 0.34, 0.1, 0.9, 0, 2.9, -L - 0.2).rotation.x = -0.45;              // the hopper under the mouth
    rod(group, steel, 0.03, [w * 0.4, 1.0, -L * 0.2], [w * 0.4, 3.0, -L * 0.82]);              // a ladder's rails,
    rod(group, steel, 0.03, [w * 0.34, 1.0, -L * 0.2], [w * 0.34, 3.0, -L * 0.82]);
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.12);
      box(group, glass, 0.03, 0.55, L * 0.3, side * (w * 0.45 + 0.012), 2.0, L * 0.74);
      fender(group, paint, 0.64, 0.4, x, R, L * 0.7);
      wheel(group, R, 0.36, x, R, L * 0.7, chrome);
      for (const z of [-0.5, -0.78]) { wheel(group, R, 0.34, x, R, L * z, chrome); wheel(group, R, 0.34, x - side * 0.4, R, L * z, chrome); }
      box(group, TAIL, 0.14, 0.2, 0.05, side * w * 0.38, 1.0, -L - 0.02);
    }
    group.userData = { body: cab, animate: (t) => { spin.rotation.z = t * 1.2; } };
    return group;
  },

  // A wrecker (a heavy tow truck): a bonneted cab with an amber bar on the roof, a long deck behind it with
  // tool lockers down its sides, and over the deck a tall A-frame boom with a cable and a hook. Its lights flash
  wrecker: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), steel = lambert(0xa5abb3), red = lambert(0xc4261e);
    const beacons = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: 0xffa31a }));
    box(group, trim, w * 0.7, 0.3, L * 1.9, 0, 0.8, 0);                                      // the chassis
    const body = box(group, paint, w * 0.92, 1.15, L * 0.34, 0, 1.52, L * 0.38);             // the cab
    box(group, glass, w * 0.86, 0.5, 0.04, 0, 1.85, L * 0.55 + 0.005);
    box(group, paint, w * 0.8, 0.7, L * 0.4, 0, 1.25, L * 0.76);                             // the bonnet
    box(group, chrome, w * 0.5, 0.36, 0.05, 0, 1.25, L * 0.96 + 0.01);
    for (let i = -3; i <= 3; i++) box(group, trim, 0.025, 0.3, 0.06, i * w * 0.06, 1.25, L * 0.96 + 0.015);
    box(group, trim, w * 0.96, 0.24, 0.3, 0, 0.82, L * 0.99);                                // bumper
    headlamps(group, w, 1.25, L * 0.96 + 0.015, 0.09, 0.4);
    box(group, trim, w * 0.7, 0.08, 0.3, 0, 2.14, L * 0.4).userData.prop = 'roof';                                  // the bar on the cab roof
    beacons.forEach((m, i) => { box(group, m, w * 0.18, 0.14, 0.26, (i - 1) * w * 0.24, 2.24, L * 0.4).userData.prop = 'roof'; }); // (the cab-roof bar and its beacons: tagged roof, hidden by a chosen roof prop, render/propcosmetic.js; they still flash)
    box(group, steel, w * 0.96, 0.16, L * 0.96, 0, 1.08, -L * 0.52);                          // the deck behind the cab
    // the boom: a turret, two legs leaning back, a cross-bar, a pulley, a cable and a hook
    box(group, trim, w * 0.5, 0.5, 0.8, 0, 1.5, -L * 0.3);
    for (const side of [-1, 1]) {
      rod(group, steel, 0.07, [side * 0.38, 1.7, -L * 0.28], [side * 0.14, 3.05, -L * 0.74]);
      rod(group, steel, 0.05, [side * 0.38, 1.7, -L * 0.1], [side * 0.18, 2.6, -L * 0.62]);   // a brace under each leg
      box(group, red, 0.5, 0.7, L * 0.34, side * (w / 2 - 0.02), 1.55, -L * 0.2);            // tool lockers down the sides
      box(group, steel, 0.52, 0.04, L * 0.3, side * (w / 2 - 0.02), 1.91, -L * 0.2);
      box(group, trim, 0.52, 0.5, L * 0.28, side * (w / 2 - 0.02), 1.4, -L * 0.62);
      box(group, glass, 0.03, 0.5, L * 0.22, side * (w * 0.46 + 0.012), 1.85, L * 0.38);
      fender(group, paint, 0.58, 0.38, side * (w / 2 - 0.12), R, L * 0.7);
      wheel(group, R, 0.34, side * (w / 2 - 0.12), R, L * 0.7, chrome);
      for (const z of [-0.42, -0.7]) { wheel(group, R, 0.32, side * (w / 2 - 0.12), R, L * z, chrome); wheel(group, R, 0.32, side * (w / 2 - 0.52), R, L * z, chrome); }
      box(group, TAIL, 0.14, 0.2, 0.05, side * w * 0.38, 1.1, -L - 0.02);
      for (let i = 0; i < 3; i++) box(group, (i + (side > 0 ? 1 : 0)) % 2 ? WHITE : red, 0.22, 0.2, 0.04, side * (0.14 + i * 0.22), 0.62, -L - 0.07); // warning stripes on the back
    }
    box(group, steel, 0.9, 0.08, 0.1, 0, 3.0, -L * 0.74);                                      // the cross-bar at the top
    tube(group, chrome, 0.12, 0.12, 0, 2.95, -L * 0.8, 'x');                                   // pulley
    rod(group, trim, 0.025, [0, 2.9, -L * 0.8], [0, 1.8, -L * 0.86]);                          // cable
    blob(group, chrome, 0.1, 0.13, 0.08, 0, 1.7, -L * 0.86);                                   // the hook
    group.userData = {
      body,
      animate: (t) => beacons.forEach((m, i) => m.color.setHex(Math.floor(t * 4 + i) % 2 ? 0xffa31a : 0x5a3a0a)),
    };
    return group;
  },

  // A police wagon (a Black Maria / Ford Transit): a navy van, white doors, a light bar, a push bar on the
  // front, small barred windows and a barred window in each rear door. Its lights flash red and blue
  policewagon: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.37;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), blue = new THREE.MeshBasicMaterial({ color: 0x2a6bff }), red = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    const body = box(group, paint, w, 1.75, L * 1.5, 0, 1.275, -L * 0.25);                   // the van, y 0.4 to 2.15
    box(group, paint, w * 0.96, 0.85, L * 0.5, 0, 0.825, L * 0.75);                          // the bonnet
    box(group, glass, w * 0.9, 0.7, 0.03, 0, 1.68, L * 0.5 + 0.005);                         // windscreen
    box(group, trim, w * 0.5, 0.28, 0.05, 0, 0.82, L + 0.025);                               // the grille
    box(group, chrome, w * 0.8, 0.07, 0.07, 0, 0.55, L + 0.1);                              // the push bar: two uprights and a rail
    for (const side of [-1, 1]) rod(group, chrome, 0.04, [side * w * 0.38, 0.5, L + 0.1], [side * w * 0.38, 1.1, L + 0.1]);
    box(group, chrome, w * 0.8, 0.07, 0.07, 0, 1.1, L + 0.1);
    headlamps(group, w, 1.05, L + 0.01, 0.1, 0.4);
    box(group, trim, w * 0.8, 0.08, 0.34, 0, 2.2, L * 0.2).userData.prop = 'roof';                                  // the light bar
    for (const [m, x] of [[red, -1], [blue, 1]]) box(group, m, w * 0.34, 0.16, 0.3, x * w * 0.2, 2.3, L * 0.2).userData.prop = 'roof'; // (the light bar and its lenses: tagged roof)
    box(group, WHITE, w + 0.02, 0.3, L * 1.5, 0, 0.62, -L * 0.25);        // a white skirt along the base
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.012);
      box(group, WHITE, 0.03, 0.85, L * 0.34, x, 1.35, L * 0.25);                             // the cab door, white
      box(group, glass, 0.03, 0.36, L * 0.28, x + side * 0.002, 1.85, L * 0.25);
      for (const z of [-0.2, -0.6]) {                                                         // barred windows in the box
        box(group, glass, 0.03, 0.32, L * 0.26, x, 1.7, L * z);
        for (let i = 0; i < 3; i++) box(group, chrome, 0.045, 0.34, 0.03, x + side * 0.008, 1.7, L * (z - 0.08 + i * 0.08));
      }
      whitewall(group, R, 0.22, side * (w / 2 - 0.02), R, L * 0.68, chrome);
      whitewall(group, R, 0.22, side * (w / 2 - 0.02), R, -L * 0.62, chrome);
      box(group, trim, 0.1, 0.22, 0.1, side * (w / 2 + 0.1), 1.65, L * 0.5 - 0.1);             // mirrors
      box(group, TAIL, 0.1, 0.34, 0.04, side * w * 0.46, 1.1, -L - 0.06);
      box(group, WHITE, w * 0.47, 1.35, 0.03, side * w * 0.25, 1.35, -L - 0.016);              // two rear doors, white,
      box(group, glass, w * 0.22, 0.32, 0.03, side * w * 0.25, 1.85, -L - 0.036);              // each with a small window
      for (let i = 0; i < 3; i++) box(group, chrome, 0.03, 0.34, 0.04, side * w * 0.25 + (i - 1) * 0.07, 1.85, -L - 0.06);
    }
    group.userData = {
      body,
      animate: (t) => { const a = Math.sin(t * 8) > 0; red.color.setHex(a ? 0xff2a2a : 0x4a1414); blue.color.setHex(a ? 0x142a5a : 0x2a6bff); },
    };
    return group;
  },

  // A camper (a Volkswagen T2 with a pop-top): a two-tone van with a V-shaped nose and a roof lifted on canvas, a
  // striped awning wound out over one side with two poles, round lamps and a spare can on the back
  camper: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.32;
    const paint = lambert(car.color), upper = lambert(0xf1ece0), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), canvas = lambert(0xe4d6ae), orange = lambert(0xe07a2c);
    const body = box(group, paint, w, 0.72, L * 1.94, 0, 0.76, -L * 0.03);                   // the lower body, y 0.4 to 1.12
    box(group, upper, w, 0.78, L * 1.94, 0, 1.51, -L * 0.03);                                // the upper in white,
    box(group, glass, w * 0.9, 0.5, 0.03, 0, 1.5, L * 0.94 + 0.005);                         // the flat windscreen
    box(group, glass, w * 0.8, 0.4, 0.03, 0, 1.5, -L * 1.0 - 0.005);                         // and the back window
    for (const side of [-1, 1]) {
      const v = box(group, paint, w * 0.52, 0.72, 0.05, side * w * 0.24, 0.76, L * 0.945);    // the V nose: two panels, tipped
      v.rotation.y = -side * 0.28;
      const x = side * (w / 2 + 0.012);
      for (const [z, len] of [[0.52, 0.5], [-0.12, 0.62], [-0.7, 0.42]]) box(group, glass, 0.03, 0.46, L * len, x, 1.52, L * z); // side windows
      for (const z of [0.76, 0.2, -0.46, -0.9]) box(group, upper, 0.04, 0.5, 0.1, x + side * 0.004, 1.52, L * z); // (pillars between them)
      headlamps(group, w, 0.9, L * 0.99, 0.1, 0.34);
      wheel(group, R, 0.2, side * (w / 2 - 0.02), R, L * 0.62, chrome);
      wheel(group, R, 0.2, side * (w / 2 - 0.02), R, -L * 0.6, chrome);
      box(group, TAIL, 0.1, 0.18, 0.04, side * w * 0.44, 0.9, -L - 0.01);
    }
    box(group, chrome, w * 0.1, 0.1, 0.04, 0, 0.82, L * 0.99 + 0.07);                        // a badge on the nose
    box(group, chrome, w + 0.04, 0.09, 0.1, 0, 0.5, L * 0.99 + 0.12);                        // bumpers
    box(group, chrome, w + 0.04, 0.09, 0.1, 0, 0.5, -L - 0.05);
    // the pop-top: a canvas skirt and a white lid, raised
    box(group, canvas, w * 0.9, 0.34, L * 1.78, 0, 2.06, -L * 0.03);
    box(group, upper, w * 0.96, 0.07, L * 1.86, 0, 2.265, -L * 0.03);
    // the awning on the right: a striped sheet sloped out, with two poles
    for (let i = 0; i < 6; i++) {
      const s = box(group, i % 2 ? WHITE : orange, 0.84, 0.03, L * 0.2, w / 2 + 0.42, 1.88, -L * 0.62 + i * L * 0.2);
      s.rotation.z = -0.12;
    }
    for (const z of [-0.62, 0.46]) rod(group, trim, 0.03, [w / 2 + 0.82, 1.82, L * z], [w / 2 + 0.82, 0, L * z]);
    box(group, lambert(0x3d5a2a), 0.2, 0.34, 0.14, -w * 0.3, 0.68, -L - 0.12);               // a jerry can on the back
    group.userData = { body, animate: () => {}, livery: (evil) => upper.color.setHex(evil ? 0x2c2c32 : 0xf1ece0) };
    return group;
  },

  // A boat hauler (a Ford F-150 pickup carrying a speedboat): a crew-cab pickup with a white deck boat riding
  // in the bed, its pointed bow forward over the cab's rear, a console and screen on its deck, an outboard
  // hanging off the tailgate. A blue stripe round the hull
  boathauler: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.42;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), hullWhite = lambert(0xf4f2ec), blue = lambert(0x1f58c2), floor = lambert(0x3a3d42);
    const body = box(group, paint, w, 0.7, L * 2, 0, 0.75, 0);                               // the low body, y 0.4 to 1.1
    box(group, glass, w * 0.94, 0.55, L * 0.58, 0, 1.375, L * 0.2);                          // the cab's glass,
    box(group, paint, w, 0.08, L * 0.66, 0, 1.69, L * 0.2);                                  // its roof,
    for (const z of [0.5, -0.04]) box(group, paint, w * 0.975, 0.55, 0.12, 0, 1.375, L * z);  // and pillars
    box(group, paint, w * 0.9, 0.05, L * 0.4, 0, 1.125, L * 0.78);                           // the bonnet's panel
    box(group, floor, w * 0.84, 0.03, L * 0.92, 0, 1.115, -L * 0.52);                         // the bed's floor
    for (const side of [-1, 1]) {
      box(group, paint, 0.08, 0.4, L * 0.98, side * (w / 2 - 0.04), 1.3, -L * 0.52);        // the bed's sides
      wheel(group, R, 0.26, side * (w / 2 - 0.02), R, L * 0.62, chrome);
      wheel(group, R, 0.26, side * (w / 2 - 0.02), R, -L * 0.6, chrome);
      box(group, trim, 0.08, 0.1, 0.1, side * (w / 2 + 0.06), 1.4, L * 0.5);
    }
    box(group, paint, w, 0.4, 0.08, 0, 1.3, -L + 0.04);                                      // the tailgate (it is up)
    box(group, chrome, w * 0.5, 0.26, 0.05, 0, 0.8, L + 0.025);
    for (let i = -3; i <= 3; i++) box(group, trim, 0.02, 0.2, 0.06, i * w * 0.06, 0.8, L + 0.03);
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.5, L + 0.06);
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.5, -L - 0.06);
    headlamps(group, w, 0.9, L + 0.01, 0.1, 0.4);
    taillamps(group, w, 1.0, -L - 0.01, 0.42, [0.1, 0.26]);
    // the boat: a stern block, a bow narrowing to a point, a deck, a console
    box(group, hullWhite, w * 0.74, 0.7, L * 0.84, 0, 1.5, -L * 0.62).userData.prop = 'cargo';                       // y 1.15 to 1.85
    taper(group, hullWhite, [-L * 0.2, w * 0.74, 1.15, 1.85], [L * 0.2, w * 0.1, 1.45, 1.95]).userData.prop = 'cargo';
    box(group, blue, w * 0.745, 0.12, L * 0.84, 0, 1.4, -L * 0.62).userData.prop = 'cargo';                          // a blue band along the hull,
    box(group, blue, w * 0.6, 0.04, L * 0.4, 0, 1.87, -L * 0.34).userData.prop = 'cargo';                             // a blue panel on the deck,
    box(group, trim, w * 0.34, 0.34, 0.24, 0, 2.04, -L * 0.52).userData.prop = 'cargo';                              // the console,
    { const screen = box(group, glass, w * 0.4, 0.26, 0.03, 0, 2.28, -L * 0.45); screen.rotation.x = 0.4; screen.userData.prop = 'cargo'; } // (the boat on the bed: a decorative load, hull to outboard, tagged cargo)            // with its small screen
    rod(group, chrome, 0.025, [-w * 0.2, 1.87, -L * 0.45], [-w * 0.2, 2.3, -L * 0.45]).userData.prop = 'cargo';
    rod(group, chrome, 0.025, [w * 0.2, 1.87, -L * 0.45], [w * 0.2, 2.3, -L * 0.45]).userData.prop = 'cargo';
    box(group, trim, 0.34, 0.6, 0.3, 0, 1.55, -L - 0.22).userData.prop = 'cargo';                                    // the outboard on the transom
    box(group, paint, 0.38, 0.3, 0.4, 0, 1.95, -L - 0.2).userData.prop = 'cargo';                                    // its cowl
    box(group, trim, 0.06, 0.4, 0.12, 0, 1.15, -L - 0.2).userData.prop = 'cargo';                                    // its leg
    for (const z of [-0.2, -0.6, -0.9]) box(group, trim, w * 0.78, 0.04, 0.07, 0, 1.87, L * z + 0.0).userData.prop = 'cargo'; // straps over the deck
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A kei roadster (a Honda Beat): a tiny mid-engined two-seater with no roof, a short nose, twin humps behind the
  // seats, round lamps and a toy of a wheel at each corner
  keiroadster: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.27;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), seat = lambert(0x2f3138), cabin = lambert(0x4a4d55);
    const body = box(group, paint, w, 0.35, L * 2, 0, 0.55, 0);                              // the low tub, y 0.375 to 0.725
    taper(group, paint, [L * 0.2, w, 0.7, 0.8], [L * 0.99, w * 0.9, 0.7, 0.6]);               // the nose, sloping down
    box(group, paint, w, 0.16, L * 0.62, 0, 0.8, -L * 0.69);                                 // the rear deck
    box(group, cabin, w * 0.78, 0.03, L * 0.62, 0, 0.745, -L * 0.1);                          // the cockpit's floor
    for (const side of [-1, 1]) {
      box(group, paint, 0.1, 0.18, L * 0.68, side * (w / 2 - 0.05), 0.82, -L * 0.1);         // the cockpit's sides
      box(group, seat, w * 0.36, 0.12, L * 0.3, side * w * 0.2, 0.8, -L * 0.04);             // two small seats,
      box(group, seat, w * 0.36, 0.34, 0.1, side * w * 0.2, 0.98, -L * 0.21);
      blob(group, paint, w * 0.17, 0.2, 0.28, side * w * 0.22, 0.9, -L * 0.4);                // a hump behind each
      rod(group, chrome, 0.025, [side * w * 0.44, 0.9, L * 0.2], [side * w * 0.38, 1.1, L * 0.34]); // the screen's frame legs
      headlamps(group, w, 0.74, L * 0.98 - 0.02, 0.1, 0.32);
      taillamps(group, w, 0.9, -L - 0.015, 0.36, [0.12, 0.08]);
      fender(group, paint, R + 0.07, 0.19, side * (w / 2 - 0.0), R, L * 0.62);               // small arches
      wheel(group, R, 0.17, side * (w / 2 - 0.02), R, L * 0.62, lambert(0x9aa0a8));
      fender(group, paint, R + 0.07, 0.19, side * (w / 2 - 0.0), R, -L * 0.62);
      wheel(group, R, 0.19, side * (w / 2 - 0.02), R, -L * 0.62, lambert(0x9aa0a8));
    }
    box(group, glass, w * 0.8, 0.26, 0.03, 0, 0.98, L * 0.3).rotation.x = -0.7;               // the low windscreen
    box(group, trim, w * 0.5, 0.1, 0.03, 0, 0.58, L * 0.99);                                 // a slot of a grille
    box(group, chrome, w * 0.8, 0.05, 0.05, 0, 0.42, L + 0.02);                              // little bumpers
    box(group, chrome, w * 0.8, 0.05, 0.05, 0, 0.42, -L - 0.02);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // An armoured van (a bank's cash-in-transit truck): slab sides leaning in to a flat roof, a cab with
  // slit windows and a mesh over the windscreen, slit ports along the box, a turret hatch on the roof, a
  // bull bar and wide guarded wheels. It flashes an amber beacon
  armoured: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), plate = lambert(0x8a9096);
    const beacon = new THREE.MeshBasicMaterial({ color: 0xffa31a });
    // (the cross-sections: slab sides, then a chamfer to the roof)
    const box1 = [[-w / 2, 0.55], [w / 2, 0.55], [w / 2, 1.75], [w * 0.42, 2.4], [-w * 0.42, 2.4], [-w / 2, 1.75]];
    const cab1 = [[-w * 0.46, 0.55], [w * 0.46, 0.55], [w * 0.46, 1.5], [w * 0.4, 2.0], [-w * 0.4, 2.0], [-w * 0.46, 1.5]];
    const body = hull(group, paint, box1, L * 1.25, -L * 0.375);                              // the strongbox
    hull(group, paint, cab1, L * 0.5, L * 0.5);                                              // the cab
    box(group, paint, w * 0.86, 0.7, L * 0.25, 0, 0.9, L * 0.875);                           // the bonnet
    box(group, glass, w * 0.6, 0.2, 0.03, 0, 1.68, L * 0.75 + 0.01);                         // the windscreen is a slit
    for (let i = 0; i < 4; i++) box(group, chrome, 0.025, 0.2, 0.04, (i - 1.5) * w * 0.14, 1.68, L * 0.75 + 0.03); // under a grille
    box(group, plate, w * 0.9, 0.12, 0.3, 0, 0.62, L + 0.1);                                 // the bull bar's plate,
    for (const side of [-1, 1]) {
      rod(group, trim, 0.05, [side * w * 0.36, 0.55, L + 0.1], [side * w * 0.36, 1.35, L * 0.97]);
      const x = side * (w / 2 + 0.012);
      box(group, glass, 0.03, 0.16, L * 0.26, x - side * 0.0, 1.55, L * 0.5);                // the cab's slits
      for (const z of [0.1, -0.35, -0.8]) box(group, glass, 0.03, 0.14, L * 0.2, x, 1.45, L * z); // the ports along the box
      box(group, plate, 0.04, 0.5, 0.22, x + side * 0.01, 1.0, L * 0.45 - 0.0);               // a door handle plate
      fender(group, paint, 0.62, 0.42, side * (w / 2 - 0.14), R, L * 0.66);
      wheel(group, R, 0.38, side * (w / 2 - 0.14), R, L * 0.66, plate);
      fender(group, paint, 0.62, 0.42, side * (w / 2 - 0.14), R, -L * 0.56);
      wheel(group, R, 0.38, side * (w / 2 - 0.14), R, -L * 0.56, plate);
      headlamps(group, w, 0.85, L * 0.995, 0.1, 0.36);
      box(group, TAIL, 0.14, 0.24, 0.04, side * w * 0.4, 1.2, -L - 0.02);
    }
    for (const z of [0.3, -0.1, -0.5, -0.9]) box(group, trim, w * 0.84, 0.03, 0.05, 0, 2.415, L * z); // seams across the roof
    tube(group, trim, 0.32, 0.18, 0, 2.5, -L * 0.3).userData.prop = 'roof';                                         // the turret hatch,
    blob(group, plate, 0.3, 0.14, 0.3, 0, 2.62, -L * 0.3).userData.prop = 'roof';
    box(group, beacon, 0.2, 0.14, 0.2, 0, 2.15, L * 0.55).userData.prop = 'roof';                                     // and the beacon on the cab
    box(group, plate, w * 0.6, 0.9, 0.04, 0, 1.3, -L - 0.02);                                // the back door
    group.userData = { body, animate: (t) => beacon.color.setHex(Math.floor(t * 3) % 2 ? 0xffa31a : 0x5a3a0a) };
    return group;
  },

  // A dragster (a slingshot top-fuel car): a rail of a chassis a car and a half long, skinny bicycle wheels
  // at the front, a bare supercharged engine with its pipes in the middle, the driver in a cage at the back
  // between two enormous slicks, a wing on struts and a parachute pack. It trembles at the line
  dragster: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, L = car.hl, R = 0.52;
    const paint = lambert(car.color), chrome = lambert(CHROME), trim = lambert(TRIM), metal = lambert(0x6d7178), alloy = lambert(0x9aa0a8), helmet = lambert(0xf4f2ec);
    const body = taper(shell, paint, [L * 0.4, 0.46, 0.34, 0.62], [L * 0.97, 0.12, 0.36, 0.48]);   // the nose
    for (const side of [-1, 1]) {
      rod(shell, trim, 0.045, [side * 0.18, 0.4, L * 0.95], [side * 0.18, 0.4, -L * 0.9]);   // the two chassis rails
      rod(shell, trim, 0.025, [side * 0.18, 0.4, L * 0.9], [side * 0.4, 0.26, L * 0.9]);     // the front axle's struts
      wheel(shell, 0.26, 0.08, side * 0.42, 0.26, L * 0.9, alloy);                           // skinny front wheels
      wheel(group, R, 0.56, side * (w / 2 - 0.28), R, -L * 0.68, alloy);                     // the slicks
      rod(shell, trim, 0.04, [side * 0.2, 0.46, -L * 0.6], [side * 0.62, R, -L * 0.68]);     // axle stubs
      rod(shell, chrome, 0.03, [side * 0.34, 0.45, -L * 0.74], [side * 0.34, 0.2, -L * 1.0]); // wheelie bars,
      wheel(shell, 0.1, 0.06, side * 0.34, 0.12, -L * 1.0, alloy);                           // each ending in a tiny wheel
      // the exhaust: four pipes a side, leaning back and out
      for (let i = 0; i < 4; i++) rod(shell, chrome, 0.045, [side * 0.28, 0.72, L * (0.34 - i * 0.1)], [side * 0.5, 1.02, L * (0.34 - i * 0.1) - 0.3]);
      box(shell, TAIL, 0.08, 0.1, 0.04, side * 0.14, 0.7, -L * 0.98);
      rod(shell, trim, 0.025, [side * 0.24, 0.5, -L * 0.82], [side * 0.5, 1.28, -L * 0.93]).userData.prop = 'wing';   // wing struts (tagged wing: a chosen wing hides the wing, its end plates and struts, render/propcosmetic.js)
      box(shell, paint, 0.04, 0.46, 0.55, side * 0.76, 1.32, -L * 0.93).userData.prop = 'wing';                      // endplates
      rod(shell, trim, 0.03, [side * 0.22, 0.56, -L * 0.18], [side * 0.2, 1.1, -L * 0.34]);    // roll cage: hoop legs
    }
    box(shell, metal, 0.6, 0.46, L * 0.3, 0, 0.7, L * 0.2);                                  // the engine block
    box(shell, trim, 0.46, 0.1, L * 0.28, 0, 0.99, L * 0.2);                                 // its heads
    box(shell, chrome, 0.5, 0.22, L * 0.22, 0, 1.14, L * 0.2);                               // the blower on top,
    box(shell, trim, 0.32, 0.22, 0.3, 0, 1.36, L * 0.22);                                    // its scoop
    box(shell, paint, 0.52, 0.3, L * 0.6, 0, 0.6, -L * 0.34);                                // the driver's tub
    box(shell, trim, 0.46, 0.04, L * 0.3, 0, 0.77, -L * 0.34);                              // his seat
    blob(shell, helmet, 0.17, 0.17, 0.2, 0, 0.98, -L * 0.34).userData.figure = true;         // the helmet (figure: hidden in the cinematics)
    box(shell, paint, 0.5, 0.06, 0.3, 0, 0.83, -L * 0.14);                                   // the cowl in front of him
    tube(shell, chrome, 0.03, 0.44, 0, 1.12, -L * 0.34 - 0.2, 'x');                           // the cage's top bar
    box(shell, paint, 1.5, 0.05, 0.5, 0, 1.58 - 0.2, -L * 0.93).userData.prop = 'wing';                             // the wing
    box(shell, trim, 0.3, 0.2, 0.3, 0, 0.74, -L * 0.88);                                     // the 'chute pack
    tube(shell, trim, 0.1, 0.4, 0, 0.9, -L * 0.98, 'z');
    taper(shell, paint, [-L * 0.6, 0.5, 0.36, 0.7], [-L * 0.95, 0.24, 0.4, 0.62]);            // the tail
    group.userData = { body, animate: (t) => { shell.position.y = Math.sin(t * 38) * 0.004; } };
    return group;
  },

  // A cigar racer (a Lotus 49): a body like a fat cigar with the driver's head in its top, the engine bare behind
  // him, a pair of fat tyres in front and fatter ones behind, spidery wishbones, a number roundel on each flank
  // and four megaphone pipes at the tail. No wings: it is the 1960s
  cigar: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), metal = lambert(0x6d7178), helmet = lambert(0xe8c23a);
    const body = blob(group, paint, 0.34, 0.3, L * 0.9, 0, 0.55, L * 0.02);                  // the cigar
    blob(group, trim, 0.16, 0.1, 0.07, 0, 0.5, L * 0.89);                                   // the nose's mouth,
    for (const side of [-1, 1]) {
      blob(group, paint, 0.15, 0.2, L * 0.4, side * 0.36, 0.5, -L * 0.1);                   // a tank along each flank
      const f = [side * 0.72, 0.3, L * 0.7], b = [side * 0.78, 0.38, -L * 0.58];
      wheel(group, 0.3, 0.26, ...f, chrome);                                                // front tyres,
      wheel(group, 0.39, 0.42, ...b, chrome);                                               // fatter ones behind
      rod(group, chrome, 0.025, [side * 0.28, 0.55, L * 0.7 + 0.12], [side * 0.62, 0.3, L * 0.7 + 0.12]); // wishbones, a pair each
      rod(group, chrome, 0.025, [side * 0.28, 0.5, L * 0.7 - 0.12], [side * 0.62, 0.3, L * 0.7 - 0.12]);
      rod(group, chrome, 0.025, [side * 0.28, 0.65, -L * 0.58 + 0.14], [side * 0.62, 0.38, -L * 0.58 + 0.14]);
      rod(group, chrome, 0.025, [side * 0.28, 0.55, -L * 0.58 - 0.14], [side * 0.62, 0.38, -L * 0.58 - 0.14]);
      tube(group, WHITE, 0.14, 0.03, side * 0.375, 0.64, L * 0.32, 'x');                    // the number roundel
      for (let i = 0; i < 2; i++) {                                                         // the megaphones, in a bunch
        const y = 0.58 + i * 0.1;
        rod(group, chrome, 0.05, [side * (0.12 + i * 0.02), y, -L * 0.8], [side * (0.2 + i * 0.03), y, -L * 1.02]);
      }
    }
    blob(group, metal, 0.24, 0.2, 0.4, 0, 0.7, -L * 0.55);                                   // the engine
    blob(group, glass, 0.2, 0.08, 0.16, 0, 0.8, L * 0.32);                                   // a little screen
    blob(group, helmet, 0.15, 0.15, 0.17, 0, 0.88, L * 0.08).userData.figure = true;        // the helmet, in the top (figure: hidden in the cinematics)
    tube(group, trim, 0.1, 0.03, 0, 0.82, L * 0.2, 'y').rotation.x = 0.6;                    // the wheel
    box(group, TAIL, 0.08, 0.08, 0.04, 0, 0.45, -L * 0.93);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A scooter with a sidecar (a Vespa and a chair): a little round-nosed scooter on two small wheels with its
  // leg shield and handlebars, and bolted to its side a one-seat sidecar like a boat with a wheel of its own
  sidecar: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.22, bx = -w * 0.17, sx = w * 0.26;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), seat = lambert(0x6a3a22);
    const body = blob(group, paint, 0.2, 0.3, 0.55, bx, 0.58, -L * 0.45);                    // the engine cowl and tail
    box(group, paint, 0.34, 0.08, L * 0.72, bx, 0.34, L * 0.05);                              // the floor,
    box(group, paint, 0.36, 0.7, 0.07, bx, 0.7, L * 0.38).rotation.x = -0.15;                // the leg shield,
    box(group, seat, 0.28, 0.12, L * 0.5, bx, 0.9, -L * 0.34);                               // the seat
    rod(group, trim, 0.025, [bx, 0.8, L * 0.5], [bx, 1.15, L * 0.46]);                       // the handlebar stem,
    tube(group, chrome, 0.02, 0.5, bx, 1.15, L * 0.46, 'x');                                 // the bar,
    blob(group, paint, 0.1, 0.1, 0.1, bx, 1.1, L * 0.58);                                    // headset and lamp
    disc(group, LAMP, 0.07, 0.06, bx, 1.1, L * 0.66);
    fender(group, paint, R + 0.05, 0.14, bx, R, L * 0.64);                                    // front mudguard
    wheel(group, R, 0.11, bx, R, L * 0.64);
    fender(group, paint, R + 0.07, 0.14, bx, R, -L * 0.62);
    wheel(group, R, 0.13, bx, R, -L * 0.62);
    rod(group, chrome, 0.02, [bx, 0.55, L * 0.64], [bx + 0.0, 1.05, L * 0.5]);               // the fork
    // the sidecar: a boat of a tub on its own wheel, a screen, a seat, a nose lamp
    blob(group, paint, 0.27, 0.22, L * 0.78, sx, 0.52, -L * 0.04);
    box(group, seat, 0.3, 0.1, 0.4, sx, 0.74, -L * 0.1);
    box(group, glass, 0.4, 0.2, 0.03, sx, 0.84, L * 0.2).rotation.x = -0.5;
    fender(group, paint, R + 0.05, 0.13, sx + 0.1, R, -L * 0.14);
    wheel(group, R, 0.12, sx + 0.1, R, -L * 0.14);
    for (const z of [0.0, -0.4]) rod(group, chrome, 0.025, [bx + 0.14, 0.5, L * z], [sx - 0.14, 0.5, L * z]); // two struts joining them
    taillamps(group, w, 0.6, -L * 0.98, 0.0, [0.1, 0.07]);
    group.userData = { body, animate: (t) => { group.rotation.z = Math.sin(t * 2.4) * 0.006; } };
    return group;
  },
};
