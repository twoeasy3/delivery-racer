// ---- OBSTACLE MODELS: one builder per kind of obstacle (and the animals, which are obstacles too) ----
// The models alone (no game state, nothing added to a scene): built here so the game and the menu's pages
// (see ../gimmicks.js) can both use them. Each faces local +z, its feet on y = 0.
import * as THREE from 'three';
import { makeWorker } from './siteModels.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
// a model made of boxes: parts are [material, width, height, length, x, y, z]
const boxModel = (parts) => {
  const group = new THREE.Group();
  for (const [material, w, hgt, l, x, y, z] of parts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, l), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
  return group;
};

// ---- obstacle models, one builder per kind; all face local +z -------------------------------
export const OBSTACLE_MODELS = {
  // a bandsman in a parade: a marcher in a red tunic and a tall hat, a drum slung in front
  marcher: () => {
    const g = makeWorker();
    const red = lambert(0xc81e1e), gold = lambert(0xe6c15a), navy = lambert(0x1d2a4f);
    g.children[2].material = red;                      // the tunic
    for (const k of [3, 4]) g.children[k].material = red; // the arms
    g.children[5].material = lambert(0xf2d2b8);        // (bare-headed under the hat)
    g.children[6].material = navy;                     // the hat...
    g.children[6].scale.set(1, 3, 1);                  // ...a tall one
    g.children[6].position.y = 2.0;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 12), gold);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, 1.0, 0.36);
    g.add(drum);
    return g;
  },
  // falling cargo: a wooden crate
  crate: (o) => boxModel([
    [lambert(0xb8894a), o.hw * 2, o.height, o.hl * 2, 0, o.height / 2, 0],
    [lambert(0x6b4a2b), o.hw * 2 + 0.04, 0.08, 0.12, 0, o.height / 2, 0],
    [lambert(0x6b4a2b), 0.12, 0.08, o.hl * 2 + 0.04, 0, o.height / 2, 0],
  ]),
  // a beach umbrella: a pole with a striped canopy
  umbrella: (o) => {
    const group = boxModel([[lambert(0xf4f4f4), 0.1, o.height - 0.5, 0.1, 0, (o.height - 0.5) / 2, 0]]);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(o.hw * 1.4, 0.7, 10), lambert(0xff6a5a));
    canopy.position.y = o.height - 0.35;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(o.hw * 0.7, 0.36, 10), lambert(0xf4f4f4));
    cap.position.y = o.height - 0.1;
    group.add(canopy, cap);
    return group;
  },
  // a surfboard stuck upright in the road, nose up, with a stripe and a fin
  surfboard: (o) => boxModel([
    [lambert(0xffd23f), o.hw * 2, o.height * 0.8, o.hl * 2, 0, o.height * 0.4, 0],
    [lambert(0xffd23f), o.hw * 1.1, o.height * 0.2, o.hl * 2, 0, o.height * 0.9, 0],   // nose
    [lambert(0x2f7de1), 0.14, o.height * 0.9, o.hl * 2 + 0.04, 0, o.height * 0.45, 0], // stripe
    [lambert(0x2b2f38), 0.08, 0.5, 0.45, 0, o.height * 0.2, -o.hl - 0.2],             // fin
  ]),
  // a wrecked car: a crumpled box car on four wheels, in a paint of its own
  wreck: (o) => {
    const paint = lambert([0x9a5a34, 0x4fc3f7, 0xe23b3b, 0x7ee081, 0xffd23f][Math.floor(Math.random() * 5)]);
    const parts = [
      [paint, o.hw * 2, o.height * 0.5, o.hl * 2, 0, 0.3 + o.height * 0.25, 0],                 // body
      [lambert(0x2b2f38), o.hw * 1.7, o.height * 0.42, o.hl * 0.95, 0, 0.3 + o.height * 0.7, -o.hl * 0.1], // cabin
      [lambert(0x3a3a40), o.hw * 2.1, 0.14, 0.2, 0, 0.45, o.hl],                               // bumpers
      [lambert(0x3a3a40), o.hw * 2.1, 0.14, 0.2, 0, 0.45, -o.hl],
    ];
    for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push([lambert(0x141414), 0.28, 0.66, 0.66, x * (o.hw - 0.1), 0.33, z * o.hl * 0.6]);
    const group = boxModel(parts);
    group.children[0].rotation.z = 0.06; // (a little bent)
    return group;
  },
  // an ice box with a white lid
  cooler: (o) => boxModel([
    [lambert(0x2f7de1), o.hw * 2, o.height * 0.75, o.hl * 2, 0, o.height * 0.375, 0],
    [lambert(0xf4f4f4), o.hw * 2 + 0.06, o.height * 0.25, o.hl * 2 + 0.06, 0, o.height * 0.875, 0],
  ]),
  // a lifeguard chair: a tall white frame with a seat, back and roof
  chair: (o) => {
    const white = lambert(0xf4f4f4), red = lambert(0xff3b30);
    const parts = [];
    for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push([white, 0.12, o.height * 0.65, 0.12, x * o.hw * 0.8, o.height * 0.325, z * o.hl * 0.8]);
    parts.push([white, o.hw * 2, 0.12, o.hl * 2, 0, o.height * 0.65, 0]);                        // seat
    parts.push([white, o.hw * 2, o.height * 0.3, 0.12, 0, o.height * 0.8, -o.hl * 0.8]);        // back
    parts.push([red, o.hw * 2.2, 0.1, o.hl * 2.2, 0, o.height, 0]);                              // roof
    return boxModel(parts);
  },
  // an orange block with a white stripe
  // a railway barrier: a low yellow block with black chevrons on both faces and a red lamp at
  // each end (small enough to vanish inside a bullet train going through it)
  railBarrier: (o) => {
    const group = boxModel([[lambert(0xffc400), o.hw * 2, o.height, o.hl * 2, 0, o.height / 2, 0]]);
    const black = lambert(0x1b1b1b), red = new THREE.MeshBasicMaterial({ color: 0xff2020 });
    for (const face of [-1, 1]) for (const x of [-0.8, -0.27, 0.27, 0.8]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 0.02), black);
      stripe.position.set(x * o.hw / 1.2, o.height / 2, face * (o.hl + 0.01));
      stripe.rotation.z = 0.5;
      group.add(stripe);
    }
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), red);
      lamp.position.set(side * (o.hw - 0.15), o.height + 0.07, 0);
      group.add(lamp);
    }
    return group;
  },
  barrier: (o) => boxModel([
    [lambert(0xff6a00), o.hw * 2, o.height, o.hl * 2, 0, o.height / 2, 0],
    [lambert(0xf2f2f2), o.hw * 2 + 0.05, o.height * 0.3, o.hl * 2 + 0.05, 0, o.height * 0.6, 0],
  ]),
  // a round hay bale lying on its side, with a darker band round it
  // a round bale, tied with twine. It all hangs off a roller (userData.roller) at its axle, so
  // a bale on the move can be rolled (see syncPickups)
  bale: (o) => {
    const group = new THREE.Group(), roller = new THREE.Group();
    const radius = o.height / 2;
    roller.position.y = radius;
    group.add(roller);
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, o.hw * 2, 16), lambert(0xe2c25a));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.03, radius + 0.03, 0.3, 16), lambert(0xa8842f));
    for (const mesh of [straw, band]) {
      mesh.rotation.z = Math.PI / 2; // axis across the road
      roller.add(mesh);
    }
    const twine = lambert(0x8a6a24);
    for (let i = 0; i < 3; i++) { // three lines of twine along it, which show it turning as it rolls
      const a = i * Math.PI * 2 / 3;
      const line = new THREE.Mesh(new THREE.BoxGeometry(o.hw * 2 + 0.02, 0.06, 0.1), twine);
      line.position.set(0, Math.cos(a) * radius, Math.sin(a) * radius);
      line.rotation.x = a;
      roller.add(line);
    }
    group.userData = { roller };
    return group;
  },
  frog: () => {
    const green = lambert(0x3fae4a), dark = lambert(0x2c7d35);
    const group = boxModel([
      [green, 2.4, 1.2, 2.6, 0, 0.8, 0],       // body
      [green, 1.9, 0.9, 1.2, 0, 1.5, 1.2],     // head
      [dark, 0.6, 0.5, 1.7, -1.45, 0.3, -0.5], // back legs
      [dark, 0.6, 0.5, 1.7, 1.45, 0.3, -0.5],
    ]);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), lambert(0xffffff));
      eye.position.set(side * 0.6, 2.15, 1.4);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      pupil.position.set(side * 0.6, 2.2, 1.72);
      group.add(eye, pupil);
    }
    return group;
  },
  // a black and white cow
  // a drop bear: a koala gone wrong. A round grey body, big furry ears, a black nose, red eyes, claws out
  dropBear: () => {
    const grey = lambert(0x8e8e92), pale = lambert(0xd8d8dc), black = lambert(0x161616), claw = lambert(0xf2f2ee);
    const group = boxModel([
      [grey, 0.9, 0.8, 0.8, 0, 0.45, 0],            // body
      [pale, 0.5, 0.45, 0.1, 0, 0.45, 0.4],          // belly
      [grey, 0.75, 0.6, 0.6, 0, 1.05, 0.1],          // head
      [black, 0.22, 0.28, 0.14, 0, 0.98, 0.42],      // nose
      [grey, 0.18, 0.3, 0.5, -0.5, 0.45, 0.25],      // arms, reaching
      [grey, 0.18, 0.3, 0.5, 0.5, 0.45, 0.25],
      [claw, 0.18, 0.06, 0.1, -0.5, 0.36, 0.52],     // claws
      [claw, 0.18, 0.06, 0.1, 0.5, 0.36, 0.52],
    ]);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), pale);
      ear.scale.set(1, 1, 0.5);
      ear.position.set(side * 0.42, 1.35, 0.05);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
      eye.position.set(side * 0.17, 1.15, 0.4);
      group.add(ear, eye);
    }
    return group;
  },
  // a kangaroo, upright: big feet and a long tail behind, small arms, ears up
  kangaroo: () => {
    const fur = lambert(0x9b6b43), pale = lambert(0xd9b48a), dark = lambert(0x3a2a1e);
    return boxModel([
      [fur, 0.55, 1.0, 0.75, 0, 1.0, 0],          // body
      [pale, 0.4, 0.6, 0.1, 0, 0.95, 0.38],        // chest
      [fur, 0.32, 0.35, 0.55, 0, 1.65, 0.25],      // head
      [dark, 0.1, 0.28, 0.08, -0.1, 1.95, 0.15],   // ears
      [dark, 0.1, 0.28, 0.08, 0.1, 1.95, 0.15],
      [fur, 0.12, 0.35, 0.12, -0.18, 1.05, 0.42],  // arms
      [fur, 0.12, 0.35, 0.12, 0.18, 1.05, 0.42],
      [fur, 0.22, 0.45, 0.35, -0.2, 0.3, 0],       // haunches...
      [fur, 0.22, 0.45, 0.35, 0.2, 0.3, 0],
      [dark, 0.16, 0.12, 0.7, -0.2, 0.06, 0.15],   // ...and feet
      [dark, 0.16, 0.12, 0.7, 0.2, 0.06, 0.15],
      [fur, 0.16, 0.16, 1.1, 0, 0.45, -0.85],      // tail
    ]);
  },
  // a portaloo: a plastic cabin (blue, green or orange), a pale roof, its door at the front with a
  // little vent, and a pipe out of the roof
  potty: () => {
    const shell = lambert([0x2f7fbf, 0x3a9a4a, 0xd96a1e][Math.floor(Math.random() * 3)]), pale = lambert(0xe8e4dc), dark = lambert(0x24323c);
    return boxModel([
      [shell, 1.35, 2.25, 1.35, 0, 1.125, 0],     // the cabin
      [pale, 1.5, 0.14, 1.5, 0, 2.32, 0],         // roof
      [pale, 0.9, 1.8, 0.05, 0, 1.05, 0.7],       // door
      [dark, 0.35, 0.12, 0.06, 0, 1.75, 0.73],    // its vent
      [dark, 0.1, 0.12, 0.08, 0.32, 1.1, 0.74],   // its latch
      [pale, 0.12, 0.5, 0.12, -0.45, 2.6, -0.4],  // the pipe out of the roof
    ]);
  },
  // a heap of sewage: a brown mound, darker lumps, a green tinge
  sewage: () => {
    const g = new THREE.Group(), brown = lambert(0x5a3d1e), dark = lambert(0x3c2812), green = lambert(0x6f7a2a);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brown);
    mound.scale.set(1, 0.65, 0.95);
    g.add(mound);
    for (const [x, z, r, m] of [[0.4, 0.3, 0.45, dark], [-0.5, -0.2, 0.4, dark], [0.1, -0.5, 0.35, green], [-0.2, 0.5, 0.3, green]]) {
      const lump = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
      lump.position.set(x, 0.45, z);
      g.add(lump);
    }
    return g;
  },
  // a heap of dirt
  pile: () => {
    const g = new THREE.Group();
    const heap = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.7, 9), lambert(0x8a6a45));
    heap.position.y = 0.85;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 7), lambert(0x9b7a52));
    top.position.set(0.3, 1.2, 0.2);
    g.add(heap, top);
    return g;
  },
  // a wheelbarrow: a green tray on a wheel at the front, two legs and handles at the back
  barrow: () => {
    const g = boxModel([
      [lambert(0x2f7a3a), 0.75, 0.32, 1.0, 0, 0.62, 0.05],     // the tray
      [lambert(0x6e5232), 0.62, 0.12, 0.8, 0, 0.82, 0.05],     // a load of sand in it
      [lambert(0x3a3a3a), 0.06, 0.4, 0.06, -0.25, 0.25, -0.35], // legs
      [lambert(0x3a3a3a), 0.06, 0.4, 0.06, 0.25, 0.25, -0.35],
      [lambert(0x8a6a45), 0.05, 0.05, 1.0, -0.28, 0.6, -0.6],   // handles
      [lambert(0x8a6a45), 0.05, 0.05, 1.0, 0.28, 0.6, -0.6],
    ]);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12).rotateZ(Math.PI / 2), lambert(0x161616));
    wheel.position.set(0, 0.22, 0.6);
    g.add(wheel);
    return g;
  },
  // a concrete pipe on its side, along the road, rolling across it (userData.roller turns)
  pipe: () => {
    const g = new THREE.Group(), roller = new THREE.Group();
    roller.position.y = 0.9;
    roller.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 16, 1, true).rotateX(Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0xb5b0a6, side: THREE.DoubleSide })));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 6, 16), lambert(0x8a857c)); // (a mark, to see it turn)
    band.position.z = 0.6;
    roller.add(band);
    g.add(roller);
    g.userData.roller = roller;
    return g;
  },
  // a steel I-beam lying across a lane, in red primer
  beam: () => {
    const red = lambert(0xa8452a);
    return boxModel([
      [red, 3.3, 0.5, 0.06, 0, 0.3, 0],           // web
      [red, 3.3, 0.06, 0.4, 0, 0.55, 0],          // flanges
      [red, 3.3, 0.06, 0.4, 0, 0.05, 0],
    ]);
  },
  // a wildebeest: dark grey-brown, high in the shoulder, a black mane and beard, curved horns
  wildebeest: () => {
    const hide = lambert(0x5d544c), dark = lambert(0x24201d), horn = lambert(0x3a3632);
    return boxModel([
      [hide, 0.9, 0.95, 2.0, 0, 1.25, -0.1],      // body
      [hide, 0.95, 0.5, 0.8, 0, 1.75, 0.45],      // the shoulders' hump
      [dark, 0.2, 0.55, 1.0, 0, 1.95, 0.35],      // mane
      [hide, 0.55, 0.6, 0.9, 0, 1.6, 1.25],       // head, low
      [dark, 0.3, 0.45, 0.25, 0, 1.15, 1.35],     // beard
      [horn, 1.0, 0.12, 0.12, 0, 2.0, 1.1],       // horns...
      [horn, 0.12, 0.3, 0.12, -0.48, 2.15, 1.1],  // ...curving up
      [horn, 0.12, 0.3, 0.12, 0.48, 2.15, 1.1],
      [dark, 0.22, 0.8, 0.22, -0.3, 0.4, 0.7],    // legs
      [dark, 0.22, 0.8, 0.22, 0.3, 0.4, 0.7],
      [dark, 0.22, 0.8, 0.22, -0.3, 0.4, -0.85],
      [dark, 0.22, 0.8, 0.22, 0.3, 0.4, -0.85],
      [dark, 0.1, 0.7, 0.1, 0, 1.05, -1.15],      // tail
    ]);
  },
  // a zebra: white with black stripes all over, a black-and-white mane
  zebra: () => {
    const white = lambert(0xf2f1ec), black = lambert(0x1c1c1c);
    const parts = [
      [white, 0.8, 0.85, 1.9, 0, 1.25, 0],        // body
      [white, 0.35, 0.9, 0.4, 0, 1.75, 0.95],     // neck
      [white, 0.4, 0.4, 0.8, 0, 2.05, 1.35],      // head
      [black, 0.3, 0.2, 0.25, 0, 1.95, 1.75],     // muzzle
      [black, 0.12, 0.5, 0.6, 0, 2.05, 0.95],     // mane
    ];
    for (let k = -3; k <= 3; k++) parts.push([black, 0.82, 0.87, 0.12, 0, 1.25, k * 0.25]); // stripes
    for (const [x, z] of [[-0.25, 0.7], [0.25, 0.7], [-0.25, -0.7], [0.25, -0.7]]) {
      parts.push([white, 0.18, 0.85, 0.18, x, 0.42, z], [black, 0.19, 0.1, 0.19, x, 0.55, z], [black, 0.19, 0.1, 0.19, x, 0.25, z]);
    }
    return boxModel(parts);
  },
  cow: () => {
    const white = lambert(0xf4f1ea), black = lambert(0x1f1f1f), pink = lambert(0xe8a0a8);
    return boxModel([
      [white, 1.1, 1.0, 2.2, 0, 1.2, 0],          // body
      [black, 1.14, 0.6, 0.8, 0, 1.35, -0.4],     // patches
      [black, 1.14, 0.5, 0.5, 0, 1.1, 0.55],
      [white, 0.7, 0.7, 0.8, 0, 1.55, 1.4],       // head
      [pink, 0.5, 0.3, 0.2, 0, 1.35, 1.82],       // nose
      [black, 0.25, 0.7, 0.25, -0.38, 0.35, 0.8], // legs
      [black, 0.25, 0.7, 0.25, 0.38, 0.35, 0.8],
      [black, 0.25, 0.7, 0.25, -0.38, 0.35, -0.8],
      [black, 0.25, 0.7, 0.25, 0.38, 0.35, -0.8],
    ]);
  },
};

// a traffic cone: one mesh, orange with a white band, drawn 1.4 times life size (as its hitbox is)
const CONE_PROFILE = [[0.32, 0], [0.32, 0.06], [0.22, 0.06], [0.155, 0.34], [0.155, 0.341], [0.118, 0.5], [0.118, 0.501], [0.05, 0.78], [0, 0.78]];
OBSTACLE_MODELS.cone = () => {
  const geo = new THREE.LatheGeometry(CONE_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 10);
  const p = geo.attributes.position, colors = [];
  for (let i = 0; i < p.count; i++) {
    const white = p.getY(i) > 0.3405 && p.getY(i) < 0.5005;
    colors.push(1, white ? 1 : 0.42, white ? 1 : 0.05);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.scale(1.4, 1.4, 1.4);
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
};
// a sea mine (Oh Mine!), afloat: a white ball half out of the water, studded with horns, a ring of
// foam round it; it bobs on the swell (see syncPickups: bob)
OBSTACLE_MODELS.mine = () => {
  const group = new THREE.Group();
  const white = new THREE.MeshPhongMaterial({ color: 0xf4f4f2, shininess: 50, specular: 0x555555 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), white);
  ball.position.y = 0.1;
  group.add(ball);
  for (const [a, e] of [[0, 1.2], [1.26, 0.75], [2.51, 0.75], [3.77, 0.75], [5.03, 0.75], [0.63, 0.25], [1.88, 0.25], [3.14, 0.25], [4.4, 0.25], [5.65, 0.25]]) {
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 6), white);
    horn.position.copy(dir).multiplyScalar(0.42).add(ball.position);
    horn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(horn);
  }
  const foam = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 20), new THREE.MeshBasicMaterial({ color: 0xdff0f6 }));
  foam.rotation.x = Math.PI / 2;
  foam.position.y = 0.03;
  group.add(foam);
  group.userData.bob = true;
  group.scale.setScalar(1.3);
  return group;
};
// a roadside advertising sign on a post, facing the drivers coming up to it
const SIGNS = [['BUY', '#c62828'], ['SELL', '#1565c0'], ['$$$', '#2e7d32'], ['SALE', '#ef6c00'], ['PROFIT', '#6a1b9a'],
  ['SYNERGY', '#00838f'], ['HIRING', '#283593'], ['MERGE', '#ad1457'], ['INVEST', '#4e342e'], ['BONUS', '#558b2f']];
OBSTACLE_MODELS.sign = (o) => {
  const w = o.hw * 2, top = o.height;
  const group = boxModel([
    [lambert(0x9a9da3), 0.18, top - 1.5, 0.18, 0, (top - 1.5) / 2, 0],  // post
    [lambert(0x22252b), w, 1.5, 0.14, 0, top - 0.75, 0],                 // board
  ]);
  const [text, colour] = SIGNS[Math.round(o.s / 13 + (o.lat > 0 ? 3 : 0)) % SIGNS.length];
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 144);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 80px sans-serif';
  ctx.font = 'bold ' + Math.floor(Math.min(80, 80 * 210 / ctx.measureText(text).width)) + 'px sans-serif';
  ctx.fillText(text, 128, 84);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, 1.38), new THREE.MeshBasicMaterial({ map }));
  face.rotation.y = Math.PI;
  face.position.set(0, top - 0.75, -0.08);
  face.userData.text = true;
  group.add(face);
  return group;
};

// a lumpy rock. Nothing marks whether it is at road level: judging that is the challenge
OBSTACLE_MODELS.asteroid = (o) => {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(o.r, 1);
  const p = geo.attributes.position;
  // push each corner in or out a little, so no two rocks are alike. The amount depends on
  // where the corner is, so the faces that share it move together and no cracks open up.
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const noise = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + o.r * 5.1) * 43758.5453;
    const k = 0.78 + (noise - Math.floor(noise)) * 0.4;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  geo.computeVertexNormals();
  const shade = 0.75 + (o.r * 7.3 % 1) * 0.35;
  const rock = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    color: new THREE.Color(0x8d8174).multiplyScalar(shade), flatShading: true }));
  group.add(rock);
  group.userData = { rock };
  return group;
};

// ---- the hidden gimmicks level's (see ../cameras.js, CONFIG.rockfall and CONFIG.peloton) ----
// a speed camera: a grey pole, a yellow box on top with its lens and flash looking back down the road
// (local -z: at traffic coming up to it), and a blue sign under it. userData.lamp: the flash's material
// a speed camera's limit sign (see CONFIG.speedCamera): a white disc, red ring, the limit in black, on a post
OBSTACLE_MODELS.limitSign = (o) => {
  const top = o.height, r = 0.62;
  const group = boxModel([[lambert(0x9a9da3), 0.14, top - r, 0.14, 0, (top - r) / 2, 0]]); // the post
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d81e1e';
  ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(64, 64, 47, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + (String(o.limit).length > 2 ? 40 : 52) + 'px sans-serif';
  ctx.fillText(String(o.limit), 64, 68);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ map }));
  face.rotation.y = Math.PI;
  face.position.set(0, top - r, -0.09);
  face.userData.text = true;
  group.add(face);
  const back = new THREE.Mesh(new THREE.CircleGeometry(r, 32), lambert(0x9a9da3)); // (its back, bare metal)
  back.position.set(0, top - r, -0.07);
  group.add(back);
  return group;
};
OBSTACLE_MODELS.camera = (o) => {
  const lamp = new THREE.MeshBasicMaterial({ color: 0x555a60 });
  const group = boxModel([
    [lambert(0x8a9096), 0.2, o.height - 0.7, 0.2, 0, (o.height - 0.7) / 2, 0],               // the pole
    [lambert(0xf2c21c), 0.9, 1.0, 1.1, 0, o.height - 0.4, 0],                                // the box
    [lambert(0x1b1d22), 0.96, 0.14, 1.16, 0, o.height + 0.17, 0],                            // its lid
    [lambert(0x1b1d22), 0.45, 0.45, 0.06, 0, o.height - 0.55, -0.57],                        // the lens
    [lamp, 0.65, 0.2, 0.06, 0, o.height - 0.13, -0.57],                                      // the flash
    [lambert(0x2f5fd8), 0.9, 0.9, 0.05, 0, o.height - 1.75, -0.12],                          // the sign
    [lambert(0xf4f4f4), 0.6, 0.16, 0.06, 0, o.height - 1.75, -0.15],                         // (its white bar)
  ]);
  group.userData.lamp = lamp;
  return group;
};
// a rock come down the hillside: a lumpy grey-brown boulder, tumbling as it falls. userData.rock: the boulder
OBSTACLE_MODELS.rock = (o) => {
  const group = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(o.r, 0), lambert([0x7a7066, 0x8d8174, 0x6b625a][Math.floor(Math.random() * 3)]));
  rock.scale.set(1, 0.8, 1.1);
  rock.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  rock.position.y = o.r * 0.62; // (a little sunk into what it rests on: its lowest point is 0.8 of its radius below its middle)
  group.add(rock);
  group.userData.rock = rock;
  group.userData.rest = rock.position.y;
  // (the dark patch under it where it meets the road, and under it as it bounds across: see render/items.js)
  const shade = new THREE.Mesh(new THREE.CircleGeometry(o.r * 1.15, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.03;
  group.add(shade);
  group.userData.shade = shade;
  return group;
};
// a cyclist, cartoon style: a chunky rider in a bright jersey, a big round head under a striped
// helmet, hunched over the bars of a bike with fat tyres. userData.animate(t) pedals, turning
// the wheels and the legs, and bobs the rider up and down with each stroke
OBSTACLE_MODELS.cyclist = () => {
  const colors = [[0xffd23f, 0x2f7de1], [0xff4f8b, 0xffd23f], [0x2f7de1, 0xff7a1a], [0x39d353, 0xb026ff], [0xff7a1a, 0x2bd4ff], [0xb026ff, 0x39d353]];
  const [main, trim] = colors[Math.floor(Math.random() * colors.length)];
  const jersey = lambert(main), stripe = lambert(trim), black = lambert(0x1b1d22), skin = lambert(0xf2c09a);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const frame = lambert(trim);
  const group = new THREE.Group(), rider = new THREE.Group();
  const add = (parent, geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  // the bike: fat tyres, a thick frame, a seat and bars
  const wheels = [-0.55, 0.55].map(z => {
    const wheel = add(group, new THREE.TorusGeometry(0.34, 0.09, 8, 18), black, 0, 0.43, z);
    wheel.rotation.y = Math.PI / 2;
    add(wheel, new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10).rotateX(Math.PI / 2), frame, 0, 0, 0); // (the hub)
    return wheel;
  });
  const tube = (x0, y0, z0, x1, y1, z1) => {
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
    const mesh = add(group, new THREE.CylinderGeometry(0.06, 0.06, a.distanceTo(b), 8), frame, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  };
  tube(0, 0.43, -0.55, 0, 0.95, -0.15); // seat stay to the seat
  tube(0, 0.43, -0.1, 0, 0.95, -0.15);  // the seat tube
  tube(0, 0.43, -0.1, 0, 0.95, 0.45);   // the down tube
  tube(0, 0.95, -0.15, 0, 0.95, 0.45);  // the top tube
  tube(0, 0.43, 0.55, 0, 1.08, 0.48);   // the fork
  add(group, new THREE.BoxGeometry(0.62, 0.08, 0.08), black, 0, 1.1, 0.5);        // the bars
  add(group, new THREE.BoxGeometry(0.2, 0.08, 0.34), black, 0, 1.0, -0.17);       // the seat
  // the rider: a round body leaning over the bars, a big head, its arms out to the bars
  group.add(rider);
  const body = add(rider, new THREE.SphereGeometry(0.36, 14, 10), jersey, 0, 1.35, 0.02);
  body.scale.set(0.95, 0.85, 1.25);
  body.rotation.x = 0.5;
  add(rider, new THREE.TorusGeometry(0.3, 0.05, 6, 16), stripe, 0, 1.4, 0.05).rotation.x = Math.PI / 2 + 0.5; // (a band round the jersey)
  for (const x of [-0.27, 0.27]) {
    const arm = add(rider, new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8), jersey, x, 1.3, 0.33);
    arm.rotation.x = 1.1;
  }
  add(rider, new THREE.SphereGeometry(0.3, 16, 12), skin, 0, 1.75, 0.38);           // the head...
  const helmet = add(rider, new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), stripe, 0, 1.8, 0.34);
  helmet.scale.set(1, 0.85, 1.3);
  add(rider, new THREE.BoxGeometry(0.08, 0.06, 0.8), jersey, 0, 2.08, 0.32);       // (the helmet's stripe)
  // the legs, pedalling: each a thigh and a shin, pumping round
  const legs = [-1, 1].map(side => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.17, 1.08, -0.12);
    group.add(hip);
    add(hip, new THREE.CylinderGeometry(0.09, 0.08, 0.5, 8), black, 0, -0.25, 0.05);
    add(hip, new THREE.SphereGeometry(0.1, 8, 6), white, 0, -0.52, 0.12);          // (a white shoe)
    return hip;
  });
  group.userData.animate = (t) => {
    for (const wheel of wheels) wheel.rotation.x = -t * 9;
    legs.forEach((leg, k) => { leg.rotation.x = Math.sin(t * 6 + k * Math.PI) * 0.6; });
    rider.position.y = Math.abs(Math.sin(t * 6)) * 0.06; // (bobbing with each stroke)
    rider.rotation.z = Math.sin(t * 3) * 0.05;
  };
  group.scale.setScalar(1.15);
  return group;
};

// a landmine (the Battlefield's): a squat olive-drab disc half sunk in the dirt, a ring of pressure studs on
// top round a red light that flashes. userData.light: the light's material
OBSTACLE_MODELS.landmine = () => {
  const group = new THREE.Group();
  const drab = lambert(0x4f5a2e), dark = lambert(0x22261a);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.22, 16), drab);
  body.position.y = 0.11;
  group.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 20), dark);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.22;
  group.add(rim);
  for (let k = 0; k < 6; k++) {
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), dark);
    stud.position.set(Math.cos(k * Math.PI / 3) * 0.3, 0.25, Math.sin(k * Math.PI / 3) * 0.3);
    group.add(stud);
  }
  const light = new THREE.MeshBasicMaterial({ color: 0x3a0e0a });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), light);
  bulb.position.y = 0.22;
  group.add(bulb);
  // (and a faint glow round it while lit, so it shows down the road)
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0 }));
  halo.position.y = 0.235;
  group.add(halo);
  group.userData.light = light;
  group.userData.halo = halo;
  group.scale.setScalar(1.4); // (bigger than life, so it is seen in time)
  return group;
};

// ---- Gimmick Road 2's (see ../hazards.js) ---------------------------------------------------------
// a shopping trolley: a wire basket on four little wheels, a red handle, a bag or two in it
OBSTACLE_MODELS.trolley = () => {
  const wire = lambert(0xc4c9ce), group = boxModel([
    [wire, 0.8, 0.06, 1.1, 0, 0.42, 0],                                   // the basket's floor,
    [wire, 0.06, 0.5, 1.1, -0.4, 0.68, 0], [wire, 0.06, 0.5, 1.1, 0.4, 0.68, 0], // its sides,
    [wire, 0.8, 0.5, 0.06, 0, 0.68, 0.55], [wire, 0.8, 0.4, 0.06, 0, 0.72, -0.55], // its ends
    [lambert(0xd8262b), 0.9, 0.07, 0.07, 0, 1.05, -0.62],                 // the handle
    [lambert(0x8a9096), 0.06, 0.36, 0.06, -0.36, 0.22, 0.45], [lambert(0x8a9096), 0.06, 0.36, 0.06, 0.36, 0.22, 0.45],
    [lambert(0x8a9096), 0.06, 0.36, 0.06, -0.36, 0.22, -0.45], [lambert(0x8a9096), 0.06, 0.36, 0.06, 0.36, 0.22, -0.45],
    [lambert(0xb07a3a), 0.4, 0.45, 0.4, -0.12, 0.72, 0.15], [lambert(0x39a04a), 0.3, 0.3, 0.3, 0.18, 0.62, -0.2], // shopping
  ]);
  for (const x of [-0.36, 0.36]) for (const z of [-0.45, 0.45]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8).rotateZ(Math.PI / 2), lambert(0x1b1d22));
    wheel.position.set(x, 0.08, z);
    group.add(wheel);
  }
  group.scale.setScalar(1.25); // (bigger than life: easier to see)
  return group;
};
// a marathon runner: singlet and shorts, a race number, arms and legs swinging. userData.animate(t) runs
OBSTACLE_MODELS.runner = () => {
  const vests = [0xff4f8b, 0x2f7de1, 0xffd23f, 0x39d353, 0xff7a1a, 0xb026ff];
  const vest = lambert(vests[Math.floor(Math.random() * vests.length)]), skin = lambert([0xf2c09a, 0xc68a5c, 0x8a5a3a][Math.floor(Math.random() * 3)]);
  const group = new THREE.Group(), body = new THREE.Group();
  const part = (parent, w, hgt, d, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  group.add(body);
  part(body, 0.42, 0.55, 0.26, vest, 0, 1.25, 0);
  part(body, 0.26, 0.2, 0.02, lambert(0xf4f4f4), 0, 1.28, 0.14);          // the race number
  part(body, 0.44, 0.22, 0.28, lambert(0x1b1d22), 0, 0.88, 0);            // shorts
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skin);
  head.position.set(0, 1.72, 0.02);
  body.add(head);
  const limb = (x, y, length, material) => { // (hung from its top, so it swings from the shoulder or the hip)
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    part(pivot, 0.12, length, 0.12, material, 0, -length / 2, 0);
    body.add(pivot);
    return pivot;
  };
  const arms = [limb(-0.28, 1.5, 0.55, skin), limb(0.28, 1.5, 0.55, skin)];
  const legs = [limb(-0.11, 0.8, 0.8, skin), limb(0.11, 0.8, 0.8, skin)];
  group.userData.animate = (t) => {
    const swing = Math.sin(t * 9);
    legs[0].rotation.x = swing * 0.8; legs[1].rotation.x = -swing * 0.8;
    arms[0].rotation.x = -swing * 0.9; arms[1].rotation.x = swing * 0.9;
    body.position.y = Math.abs(Math.cos(t * 9)) * 0.08;
  };
  group.scale.setScalar(1.15);
  return group;
};
// a water station's table: a trestle table under a blue cloth, rows of paper cups, a big water bottle
OBSTACLE_MODELS.waterTable = () => {
  const parts = [[lambert(0x2f7de1), 1.8, 0.08, 0.9, 0, 0.8, 0], [lambert(0x2f7de1), 1.8, 0.4, 0.04, 0, 0.6, 0.45], [lambert(0x2f7de1), 1.8, 0.4, 0.04, 0, 0.6, -0.45]];
  for (const x of [-0.8, 0.8]) for (const z of [-0.35, 0.35]) parts.push([lambert(0x8a9096), 0.06, 0.8, 0.06, x, 0.4, z]);
  for (let k = 0; k < 10; k++) parts.push([lambert(0xf4f4f4), 0.1, 0.14, 0.1, -0.7 + (k % 5) * 0.28, 0.91, k < 5 ? -0.2 : 0.1]);
  parts.push([lambert(0x7fd4f2), 0.3, 0.5, 0.3, 0.68, 1.09, 0.25]);
  return boxModel(parts);
};
// the marathon's pace car: a small white car with a big clock on its roof and amber lamps
OBSTACLE_MODELS.paceCar = (o) => {
  const w = o.hw * 2, l = o.hl * 2, white = lambert(0xf4f4f4), dark = lambert(0x1b1d22);
  const group = boxModel([
    [white, w, 0.7, l, 0, 0.65, 0], [dark, w * 0.86, 0.55, l * 0.5, 0, 1.25, -l * 0.05], [white, w * 0.88, 0.06, l * 0.48, 0, 1.55, -l * 0.05],
    [dark, w * 0.9, 0.6, 0.12, 0, 1.95, -l * 0.05],                               // the clock's board
    [new THREE.MeshBasicMaterial({ color: 0xffb020 }), w * 0.7, 0.3, 0.14, 0, 1.95, -l * 0.05], // its digits, glowing
    [new THREE.MeshBasicMaterial({ color: 0xffa21a }), 0.25, 0.16, 0.25, -w * 0.3, 1.66, -l * 0.3], [new THREE.MeshBasicMaterial({ color: 0xffa21a }), 0.25, 0.16, 0.25, w * 0.3, 1.66, -l * 0.3],
    [new THREE.MeshBasicMaterial({ color: 0xff2a2a }), w * 0.22, 0.16, 0.06, -w * 0.32, 0.75, -l / 2 - 0.02], [new THREE.MeshBasicMaterial({ color: 0xff2a2a }), w * 0.22, 0.16, 0.06, w * 0.32, 0.75, -l / 2 - 0.02],
  ]);
  for (const x of [-1, 1]) for (const z of [-1, 1]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.26, 12).rotateZ(Math.PI / 2), dark); wheel.position.set(x * (o.hw - 0.1), 0.33, z * l * 0.31); group.add(wheel); }
  return group;
};
// a wide load: a low loader, two lanes wide, carrying half a house, red and white boards at each
// end and an amber lamp at each corner
OBSTACLE_MODELS.wideLoad = (o) => {
  const w = o.hw * 2, l = o.hl * 2, steel = lambert(0x3a3d44), dark = lambert(0x1b1d22);
  const parts = [
    [steel, w * 0.5, 0.4, l * 0.96, 0, 0.8, 0],                                  // the trailer's bed
    [lambert(0xc0392b), 2.5, 2.3, 2.6, 0, 1.75, l / 2 - 1.4],                    // the tractor's cab
    [dark, 2.3, 0.8, 0.1, 0, 2.3, l / 2 - 0.08],                                 // (its windscreen)
    [lambert(0xe8dcc4), w * 0.96, 2.2, l * 0.62, 0, 2.1, -l * 0.12],             // the house: its walls,
    [lambert(0x7a4a3a), w * 1.0, 0.25, l * 0.66, 0, 3.3, -l * 0.12],             // its roof's eaves,
    [lambert(0x8a5646), w * 0.6, 0.4, l * 0.66, 0, 3.55, -l * 0.12],             // and ridge
    [lambert(0xffd23f), w * 0.9, 0.5, 0.08, 0, 1.1, -l / 2 - 0.02],              // "OVERSIZE", at the back
  ];
  for (let k = 0; k < 6; k++) parts.push([lambert(k % 2 ? 0xf4f4f4 : 0xd8262b), w / 6, 0.3, 0.1, -w / 2 + w / 12 + k * w / 6, 0.55, -l / 2 - 0.04]);
  for (const x of [-1, 1]) for (let k = 0; k < 4; k++) parts.push([dark, 0.5, 0.9, 0.9, x * w * 0.2, 0.45, -l * 0.42 + k * 1.1]);
  for (const x of [-1, 1]) parts.push([dark, 0.5, 1.0, 1.0, x * 1.1, 0.5, l / 2 - 1.2]);
  const group = boxModel(parts), amber = new THREE.MeshBasicMaterial({ color: 0xffa21a });
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), amber);
    lamp.position.set(x * w * 0.48, 3.5, -l * 0.12 + z * l * 0.31);
    group.add(lamp);
  }
  // the arrow board on its tail (see Hazards.loadSignal; render/items.js lights it): a black board, on it a
  // row of green chevrons pointing to the side to pass on (userData.arrows: [{ side: -1 | 1, group }]), or
  // a red cross while it swings over (userData.cross). The model's +x is the road's left
  const back = new THREE.Group();
  back.position.set(0, 2.35, -l * 0.43 - 0.1);
  back.add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 1.7, 0.08), dark));
  const green = new THREE.MeshBasicMaterial({ color: 0x35f06a }), red = new THREE.MeshBasicMaterial({ color: 0xff3524 });
  const bar = (parent, material, x, y, length, turn) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, 0.05), material);
    mesh.position.set(x, y, -0.07);
    mesh.rotation.z = turn;
    parent.add(mesh);
  };
  group.userData.arrows = [-1, 1].map((side) => {
    const arrows = new THREE.Group(), point = -side; // (which way along the model's x its chevrons point)
    for (let k = -1; k <= 1; k++) {
      bar(arrows, green, k * 1.5 + point * 0.2, 0.25, 0.85, -point * 0.75);
      bar(arrows, green, k * 1.5 + point * 0.2, -0.25, 0.85, point * 0.75);
    }
    arrows.visible = false;
    back.add(arrows);
    return { side, group: arrows };
  });
  const cross = new THREE.Group();
  bar(cross, red, 0, 0, 1.8, 0.7);
  bar(cross, red, 0, 0, 1.8, -0.7);
  cross.visible = false;
  back.add(cross);
  group.userData.cross = cross;
  group.add(back);
  return group;
};
// its escort: a white pilot car, a yellow WIDE LOAD board across its roof, two amber beacons.
// userData.beacons: their material (lit while it moves over to block: see render/items.js)
OBSTACLE_MODELS.escort = (o) => {
  const w = o.hw * 2, l = o.hl * 2, white = lambert(0xf4f4f4), dark = lambert(0x1b1d22);
  const beacons = new THREE.MeshBasicMaterial({ color: 0x4a3a1a });
  const group = boxModel([
    [white, w, 0.75, l, 0, 0.68, 0], [dark, w * 0.86, 0.55, l * 0.5, 0, 1.32, -l * 0.05], [white, w * 0.88, 0.06, l * 0.48, 0, 1.62, -l * 0.05],
    [lambert(0xffd23f), w * 1.05, 0.45, 0.1, 0, 1.95, -l * 0.1],                  // the board
    [dark, w * 0.8, 0.12, 0.12, 0, 1.95, -l * 0.1 + 0.02],                       // (its lettering, a dark bar)
    [beacons, 0.26, 0.22, 0.26, -w * 0.32, 2.3, -l * 0.1], [beacons, 0.26, 0.22, 0.26, w * 0.32, 2.3, -l * 0.1],
    [lambert(0xff7a1a), w * 1.01, 0.18, l * 1.01, 0, 0.7, 0],                    // an orange stripe round it
  ]);
  for (const x of [-1, 1]) for (const z of [-1, 1]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.26, 12).rotateZ(Math.PI / 2), dark); wheel.position.set(x * (o.hw - 0.1), 0.33, z * l * 0.31); group.add(wheel); }
  group.userData.beacons = beacons;
  return group;
};

// ---- the themes' own obstacles (see ../themes.js: a theme's `obstacles`) ----------------------------------
// Each stands in for a plain kind on its theme's levels (a crate, a bale, a cone) and has that kind's hitbox and
// cost (see Collision's SIZE and CONFIG.obstacleKinds), so none takes its size from `o`: the model is the one
// thing that differs. Each is made to be read from the chase camera at speed on its own theme's road: taller
// than what it replaces, in colours that stand off that road, a dark patch under it where it meets the ground.
const put = (group, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
const lathe = (profile, segments, material) => new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
// (the dark patch under it, as a rock's)
const grounded = (group, r) => {
  const shade = put(group, new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};
// the toy room's: two alphabet blocks, the small one askew on the big one, a pale face with a coloured middle on every side
OBSTACLE_MODELS.toyBlock = () => {
  const block = (size, color, middle) => {
    const g = boxModel([
      [lambert(color), size, size, size, 0, 0, 0],
      [lambert(0xfff3d0), size * 0.7, size * 0.7, size + 0.04, 0, 0, 0], [lambert(0xfff3d0), size + 0.04, size * 0.7, size * 0.7, 0, 0, 0], [lambert(0xfff3d0), size * 0.7, size + 0.04, size * 0.7, 0, 0, 0],
      [lambert(middle), size * 0.34, size * 0.34, size + 0.08, 0, 0, 0], [lambert(middle), size + 0.08, size * 0.34, size * 0.34, 0, 0, 0], [lambert(middle), size * 0.34, size + 0.08, size * 0.34, 0, 0, 0],
    ]);
    return g;
  };
  const group = new THREE.Group(), big = block(1.2, 0x1f5fd0, 0xd8262b), small = block(0.8, 0x2f9a48, 0x1f5fd0);
  big.position.y = 0.6;
  small.position.y = 1.6;
  small.rotation.y = 0.55;
  group.add(big, small);
  return grounded(group, 0.95);
};
// ...and its cone: a skittle, white with two red bands round its neck (one mesh, as the cone is)
const SKITTLE_PROFILE = [[0.17, 0], [0.27, 0.2], [0.31, 0.42], [0.27, 0.66], [0.15, 0.9], [0.15, 0.901], [0.12, 1.0], [0.12, 1.001], [0.17, 1.12], [0.16, 1.24], [0.08, 1.33], [0, 1.34]];
OBSTACLE_MODELS.skittle = () => {
  const geo = new THREE.LatheGeometry(SKITTLE_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 12);
  const p = geo.attributes.position, colors = [];
  for (let i = 0; i < p.count; i++) {
    const red = p.getY(i) > 0.9005 && p.getY(i) < 1.0005;
    colors.push(red ? 0.85 : 1, red ? 0.1 : 1, red ? 0.12 : 1);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.scale(1.3, 1.3, 1.3);
  return grounded(new THREE.Group().add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }))), 0.5);
};
// the sea bed's: a hard-hat diver's helmet, brass, on its copper collar, a dark glass port to the front, the back and each side
OBSTACLE_MODELS.divingHelmet = () => {
  const group = new THREE.Group();
  const brass = new THREE.MeshPhongMaterial({ color: 0xf2b83a, shininess: 60, specular: 0x8a6a2a, emissive: 0x5a3c08 }) /* (its own light: the tube is dim) */, copper = new THREE.MeshLambertMaterial({ color: 0xd9743a, emissive: 0x3a1a08 }), glass = lambert(0x0f2a36);
  put(group, new THREE.CylinderGeometry(0.4, 0.6, 0.42, 14), copper, 0, 0.21, 0);          // the collar
  put(group, new THREE.CylinderGeometry(0.44, 0.44, 0.1, 14), brass, 0, 0.46, 0);           // its neck ring
  put(group, new THREE.SphereGeometry(0.52, 16, 12), brass, 0, 0.92, 0);                    // the dome
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, x = Math.sin(a), z = Math.cos(a);
    const rim = put(group, new THREE.CylinderGeometry(0.21, 0.21, 0.12, 12), copper, x * 0.47, 0.95, z * 0.47);
    const port = put(group, new THREE.CylinderGeometry(0.15, 0.15, 0.14, 12), glass, x * 0.48, 0.95, z * 0.48);
    for (const m of [rim, port]) { m.rotation.x = Math.PI / 2; m.rotation.z = -a; }
  }
  put(group, new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8), copper, 0, 1.48, 0);            // the valve on top
  return grounded(group, 0.8);
};
// the Moon's: a supply pod set down on three splayed legs: a white capsule with a dark hatch, an orange band, gold
// foil below, an aerial and a red light on top
OBSTACLE_MODELS.supplyPod = () => {
  const group = new THREE.Group(), white = lambert(0xf4f4f4), dark = lambert(0x2b2f38), foil = lambert(0xe6b63c);
  put(group, new THREE.CylinderGeometry(0.5, 0.36, 0.3, 12), foil, 0, 0.55, 0);               // the foil, tucked in under it
  put(group, new THREE.CylinderGeometry(0.5, 0.5, 0.6, 12), white, 0, 1.0, 0);                // the capsule
  put(group, new THREE.CylinderGeometry(0.52, 0.52, 0.16, 12), lambert(0xff6a00), 0, 0.8, 0); // its band
  put(group, new THREE.CylinderGeometry(0.24, 0.5, 0.3, 12), white, 0, 1.45, 0);              // its shoulder
  for (const z of [-1, 1]) put(group, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10).rotateX(Math.PI / 2), dark, 0, 1.08, z * 0.49); // the hatch, fore and aft
  put(group, new THREE.BoxGeometry(0.03, 0.5, 0.03), dark, 0.12, 1.84, 0);                    // the aerial
  put(group, new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 }), 0, 1.68, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.5, leg = put(group, new THREE.BoxGeometry(0.08, 0.78, 0.08), foil, Math.sin(a) * 0.52, 0.34, Math.cos(a) * 0.52);
    leg.rotation.order = 'YXZ';
    leg.rotation.y = a;
    leg.rotation.x = 0.5;
    put(group, new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8), dark, Math.sin(a) * 0.7, 0.025, Math.cos(a) * 0.7); // its pad
  }
  return grounded(group, 0.9);
};
// the film studio's: a director's chair: tall, pale wood, crossed legs, the seat and the high back of red canvas,
// DIRECTOR stencilled across the back, both sides
OBSTACLE_MODELS.directorChair = () => {
  const wood = lambert(0xe6c690), canvas = lambert(0xd8262b);
  const group = boxModel([
    [canvas, 1.04, 0.07, 0.84, 0, 1.05, 0],                                          // the seat
    [canvas, 1.04, 0.62, 0.05, 0, 1.86, -0.42],                                      // the back
    [wood, 0.1, 0.08, 0.95, -0.55, 1.4, 0], [wood, 0.1, 0.08, 0.95, 0.55, 1.4, 0],   // the arms
    [wood, 0.1, 1.2, 0.1, -0.55, 1.6, -0.42], [wood, 0.1, 1.2, 0.1, 0.55, 1.6, -0.42], // the back's posts
    [wood, 0.1, 0.36, 0.1, -0.55, 1.2, 0.42], [wood, 0.1, 0.36, 0.1, 0.55, 1.2, 0.42], // the arms' front posts
    [wood, 1.1, 0.08, 0.08, 0, 0.42, 0.44],                                          // the footrest
  ]);
  for (const z of [-0.42, 0.42]) for (const lean of [-1, 1]) { // the crossed legs, front and back
    const leg = put(group, new THREE.BoxGeometry(0.1, 1.56, 0.1), wood, 0, 0.53, z + lean * 0.03);
    leg.rotation.z = lean * 0.8;
  }
  const paper = document.createElement('canvas');
  paper.width = 256; paper.height = 128;
  const ctx = paper.getContext('2d');
  ctx.fillStyle = '#d8262b';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('DIRECTOR', 128, 68);
  const map = new THREE.CanvasTexture(paper);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const way of [-1, 1]) { // (read from behind, as the player comes up to it, and from the front)
    const face = put(group, new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map }), 0, 1.86, -0.42 + way * 0.03);
    face.rotation.y = way < 0 ? Math.PI : 0;
    face.userData.text = true;
  }
  group.scale.setScalar(1.1);
  return grounded(group, 0.85);
};
// ...and its bale: a film camera on a dolly: a low dark platform on four wheels with a yellow edge, a yellow column,
// and the camera big on top of it, turned across the road so its profile is what the player comes up on: the black
// body, the pale lens hood out to one side, the two round film magazines on top; a red seat for its operator
OBSTACLE_MODELS.cameraDolly = () => {
  const black = lambert(0x1b1d22), yellow = lambert(0xffc928);
  const group = boxModel([
    [lambert(0x4a4f57), 1.7, 0.14, 1.8, 0, 0.36, 0],                                 // the platform
    [yellow, 1.76, 0.08, 1.86, 0, 0.3, 0],                                           // (a yellow edge round it)
    [black, 0.08, 0.5, 0.08, 0, 0.75, 0.6], [lambert(0xd8262b), 0.5, 0.1, 0.5, 0, 1.03, 0.6], // the operator's seat
    [yellow, 1.4, 0.07, 0.07, 0, 1.1, 0.9], [yellow, 0.07, 0.7, 0.07, -0.65, 0.75, 0.9], [yellow, 0.07, 0.7, 0.07, 0.65, 0.75, 0.9], // the push bar
  ]);
  put(group, new THREE.CylinderGeometry(0.17, 0.24, 1.0, 10), yellow, 0, 0.93, -0.1); // the column
  const head = boxModel([
    [black, 0.55, 0.62, 1.1, 0, 0, 0],                                               // the camera
    [lambert(0x2b2f38), 0.3, 0.3, 0.3, 0, 0, 0.68],                                  // its lens
    [lambert(0xe6eaee), 0.62, 0.56, 0.3, 0, 0, 0.92],                                // the lens hood
    [lambert(0x8a9096), 0.14, 0.2, 0.36, 0, 0.2, -0.7],                              // the eyepiece
  ]);
  for (const z of [-0.3, 0.36]) { // the magazines, one behind the other, a pale hub on each
    put(head, new THREE.CylinderGeometry(0.4, 0.4, 0.22, 16).rotateZ(Math.PI / 2), black, 0, 0.62, z);
    put(head, new THREE.CylinderGeometry(0.12, 0.12, 0.26, 10).rotateZ(Math.PI / 2), lambert(0xe6eaee), 0, 0.62, z);
  }
  head.position.set(0, 1.76, -0.1);
  head.rotation.y = Math.PI / 2;
  group.add(head);
  for (const x of [-0.78, 0.78]) for (const z of [-0.7, 0.7]) put(group, new THREE.CylinderGeometry(0.22, 0.22, 0.18, 10).rotateZ(Math.PI / 2), black, x, 0.22, z);
  return grounded(group, 1.4);
};
// Venice's: mooring posts (paline), three lashed together, banded red and white, a gold cap on each
OBSTACLE_MODELS.mooringPosts = () => {
  const group = new THREE.Group(), white = lambert(0xf6f2e6), red = lambert(0xc81e1e), gold = lambert(0xe6b63c);
  [[0, 0.3, 2.3], [2.1, 0.32, 2.0], [4.2, 0.32, 1.75]].forEach(([a, r, h]) => {
    const post = new THREE.Group();
    put(post, new THREE.CylinderGeometry(0.16, 0.18, h, 10), white, 0, h / 2, 0);
    for (let y = 0.35; y < h - 0.2; y += 0.56) put(post, new THREE.CylinderGeometry(0.185, 0.185, 0.28, 10), red, 0, y, 0);
    put(post, new THREE.ConeGeometry(0.19, 0.26, 10), gold, 0, h + 0.13, 0);
    post.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    post.rotation.set(Math.cos(a) * 0.07, 0, -Math.sin(a) * 0.07); // (each leaning out a little)
    group.add(post);
  });
  put(group, new THREE.CylinderGeometry(0.52, 0.52, 0.14, 12), lambert(0x6b4a2b), 0, 1.0, 0); // the rope round them
  return grounded(group, 0.85);
};
// the ice road's: a red fuel drum, two pale hoops round it, a cap of snow on top
OBSTACLE_MODELS.fuelDrum = () => {
  const group = new THREE.Group(), pale = lambert(0xf2f2f2);
  put(group, new THREE.CylinderGeometry(0.56, 0.56, 1.25, 14), lambert(0xe0261f), 0, 0.625, 0);
  for (const y of [0.42, 0.84]) put(group, new THREE.CylinderGeometry(0.585, 0.585, 0.08, 14), pale, 0, y, 0);
  put(group, new THREE.SphereGeometry(0.58, 12, 8), lambert(0xf6fbff), 0, 1.24, 0).scale.y = 0.34;
  return grounded(group, 0.85);
};
// the fallout zone's: a drum of waste: a yellow drum, two black hoops round it, a black trefoil on its side (both sides)
OBSTACLE_MODELS.wasteDrum = () => {
  const group = new THREE.Group(), ink = lambert(0x16181c);
  put(group, new THREE.CylinderGeometry(0.56, 0.56, 1.25, 14), lambert(0xffd23f), 0, 0.625, 0);
  for (const y of [0.3, 0.95]) put(group, new THREE.CylinderGeometry(0.585, 0.585, 0.09, 14), ink, 0, y, 0);
  put(group, new THREE.CylinderGeometry(0.5, 0.5, 0.06, 14), ink, 0, 1.27, 0);
  for (const side of [-1, 1]) { // (the trefoil: a hub and three blades, flat on the drum's side, drawn in boxes and a disc)
    const face = new THREE.Group();
    put(face, new THREE.CircleGeometry(0.1, 10), ink, 0, 0, 0);
    for (const a of [Math.PI / 2, Math.PI / 2 + Math.PI * 2 / 3, Math.PI / 2 - Math.PI * 2 / 3]) {
      const blade = put(face, new THREE.BoxGeometry(0.17, 0.26, 0.02), ink, Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0);
      blade.rotation.z = a - Math.PI / 2;
    }
    face.position.set(0, 0.63, side * 0.575);
    face.rotation.y = side > 0 ? 0 : Math.PI;
    group.add(face);
  }
  return grounded(group, 0.85);
};
// the theme park's: a popcorn cart: a red cart on two white wheels, a box of popcorn behind glass posts, a striped roof
OBSTACLE_MODELS.popcornCart = () => {
  const red = lambert(0xd8262b), white = lambert(0xf6f6f6);
  const parts = [
    [red, 1.1, 0.55, 1.05, 0, 0.82, 0],                                              // the cart
    [lambert(0xffd95a), 0.92, 0.4, 0.86, 0, 1.3, 0],                                 // the popcorn
    [red, 0.07, 0.07, 0.5, -0.4, 0.95, -0.75], [red, 0.07, 0.07, 0.5, 0.4, 0.95, -0.75], [white, 0.9, 0.07, 0.07, 0, 0.95, -1.0], // the handles
    [red, 0.08, 0.55, 0.08, 0, 0.28, 0.45],                                          // the leg it stands on
  ];
  for (const x of [-0.5, 0.5]) for (const z of [-0.47, 0.47]) parts.push([white, 0.06, 0.85, 0.06, x, 1.52, z]); // the roof's posts
  for (let i = 0; i < 5; i++) parts.push([i % 2 ? white : red, 0.26, 0.12, 1.3, -0.52 + i * 0.26, 2.0, 0]);     // the roof, striped
  const group = boxModel(parts);
  for (const x of [-0.6, 0.6]) {
    put(group, new THREE.CylinderGeometry(0.42, 0.42, 0.07, 14).rotateZ(Math.PI / 2), white, x, 0.42, -0.1);
    put(group, new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8).rotateZ(Math.PI / 2), red, x, 0.42, -0.1);
  }
  return grounded(group, 0.95);
};
// the Wild West's: a barrel: dark oak staves, bulged, three iron hoops, a paler lid
OBSTACLE_MODELS.barrel = () => {
  const group = new THREE.Group(), iron = lambert(0x24262b);
  group.add(lathe([[0.43, 0], [0.51, 0.3], [0.55, 0.675], [0.51, 1.05], [0.43, 1.35], [0, 1.35]], 14, lambert(0x7a4520)));
  for (const [y, r] of [[0.2, 0.5], [0.675, 0.565], [1.15, 0.5]]) put(group, new THREE.CylinderGeometry(r, r, 0.09, 14), iron, 0, y, 0);
  put(group, new THREE.CylinderGeometry(0.39, 0.39, 0.03, 14), lambert(0xa9713c), 0, 1.35, 0);
  return grounded(group, 0.85);
};
// the favela's: a stack of plastic chairs, red and white by turns: each a seat, a back curving round behind it and
// four legs splayed out, the legs of each over the legs of the one below
OBSTACLE_MODELS.chairStack = () => {
  const group = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const plastic = new THREE.MeshLambertMaterial({ color: i % 2 ? 0xf6f6f6 : 0xe0261f, side: THREE.DoubleSide }), y = 0.66 + i * 0.2, back = -i * 0.03;
    put(group, new THREE.BoxGeometry(0.96, 0.07, 0.9), plastic, 0, y, back);
    put(group, new THREE.CylinderGeometry(0.56, 0.5, 0.72, 10, 1, true, Math.PI - 1.15, 2.3), plastic, 0, y + 0.38, back + 0.02);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const leg = put(group, new THREE.BoxGeometry(0.09, 0.7, 0.09), plastic, x * 0.5, y - 0.34, back + z * 0.46);
      leg.rotation.set(z * 0.2, 0, -x * 0.2);
    }
  }
  return grounded(group, 0.95);
};
// the rice terraces': two woven baskets heaped with rice on a bamboo carrying pole, cords from the pole to each
// basket's rim, and a straw hat hung on the pole between them
OBSTACLE_MODELS.riceBasket = () => {
  const group = new THREE.Group(), band = lambert(0x8a5f24), bamboo = lambert(0xc9b25a), cord = lambert(0x6b4a2b);
  for (const x of [-0.36, 0.36]) {
    const basket = lathe([[0.2, 0], [0.33, 0.55], [0.28, 0.55], [0.18, 0.08]], 12, lambert(0xd9a546));
    basket.position.x = x;
    group.add(basket);
    for (const [y, r] of [[0.16, 0.245], [0.5, 0.335]]) put(group, new THREE.CylinderGeometry(r, r, 0.07, 12), band, x, y, 0);
    put(group, new THREE.SphereGeometry(0.3, 10, 6), lambert(0xfbf8ec), x, 0.55, 0).scale.y = 0.5; // the rice
    for (const z of [-0.3, 0.3]) put(group, new THREE.BoxGeometry(0.035, 0.72, 0.035), cord, x, 0.9, z * 0.5).rotation.x = -z * 0.75;
  }
  put(group, new THREE.CylinderGeometry(0.045, 0.045, 1.5, 6).rotateZ(Math.PI / 2), bamboo, 0, 1.22, 0); // the pole
  put(group, new THREE.ConeGeometry(0.4, 0.2, 14), lambert(0xe9c869), 0, 1.36, 0);                        // the hat
  return grounded(group, 0.9);
};
// Christmas Eve's bale: a wrapped present: red paper, a gold ribbon both ways round it and a bow on top
OBSTACLE_MODELS.present = () => {
  const gold = lambert(0xf2c230);
  const group = boxModel([
    [lambert(0xd8262b), 1.9, 1.4, 1.9, 0, 0.7, 0],
    [gold, 0.3, 1.44, 1.94, 0, 0.71, 0], [gold, 1.94, 1.44, 0.3, 0, 0.71, 0],
    [gold, 0.7, 0.34, 0.3, -0.42, 1.6, 0], [gold, 0.7, 0.34, 0.3, 0.42, 1.6, 0], [gold, 0.3, 0.3, 0.34, 0, 1.52, 0],
  ]);
  group.children[3].rotation.z = -0.5;
  group.children[4].rotation.z = 0.5;
  return grounded(group, 1.45);
};
// the volcano's rock: a boulder of cooled lava, black, the glow of what is still hot inside showing through its
// faces, a cap of pale ash on top and the glow on the road under it (a grey-brown rock is lost on that black road).
// Sized by its radius, as a rock is
OBSTACLE_MODELS.lavaRock = (o) => {
  const group = new THREE.Group(), r = o.r, hot = new THREE.MeshBasicMaterial({ color: 0xff6a14 });
  const body = new THREE.Group();
  body.position.y = r * 0.62;
  body.scale.set(1, 0.8, 1.1);
  const geo = new THREE.IcosahedronGeometry(r, 1), p = geo.attributes.position, cracks = [];
  put(body, geo, new THREE.MeshLambertMaterial({ color: 0x4a4246, flatShading: true }));
  for (let i = 0; i < p.count; i += 3) { // (the cracks: the faces along two rings round it, glowing, a hair proud of the crust)
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3 / r, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 / r, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3 / r;
    if (Math.abs(x * 0.5 + y * 0.6 + z * 0.62) > 0.2 && Math.abs(x * 0.7 - y * 0.35 - z * 0.62) > 0.2) continue;
    for (let k = i; k < i + 3; k++) cracks.push(p.getX(k) * 1.012, p.getY(k) * 1.012, p.getZ(k) * 1.012);
  }
  put(body, new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(cracks, 3)), hot);
  const ash = put(body, new THREE.SphereGeometry(r * 0.86, 10, 4, 0, Math.PI * 2, 0, 0.75), lambert(0xddd6cc), 0, r * 0.3, 0);
  ash.scale.y = 0.95;
  group.add(body);
  const glow = put(group, new THREE.CircleGeometry(r * 1.5, 16), new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.42,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  glow.rotation.x = -Math.PI / 2;
  return group;
};
// the Wild West's drifting bale: a tumbleweed: a dark ball of twigs. It hangs off a roller, as a bale does, and rolls as it goes
OBSTACLE_MODELS.tumbleweed = () => {
  const group = new THREE.Group(), roller = new THREE.Group(), twig = lambert(0x5a3a18);
  roller.position.y = 0.95;
  group.add(roller);
  put(roller, new THREE.IcosahedronGeometry(0.62, 1), lambert(0x7a5526));
  for (const [x, y, z] of [[0, 0, 0], [1.57, 0, 0], [0, 1.57, 0], [0.8, 0.8, 0], [-0.8, 0.8, 0.4], [0.8, -0.8, 1.2], [0.3, 1.9, 0.9]]) {
    put(roller, new THREE.TorusGeometry(0.88, 0.05, 5, 14), twig).rotation.set(x, y, z);
  }
  group.userData = { roller };
  return grounded(group, 1.05);
};
// the beach's bale: a great beach ball, six stripes meeting at its top. On a roller, as a bale is: on the move it rolls
OBSTACLE_MODELS.beachBall = () => {
  const group = new THREE.Group(), roller = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.98, 18, 12).toNonIndexed(), p = geo.attributes.position, colors = [];
  const STRIPES = [[0.9, 0.12, 0.12], [1, 1, 1], [0.1, 0.42, 0.9], [1, 1, 1], [1, 0.8, 0.1], [1, 1, 1]];
  for (let i = 0; i < p.count; i += 3) { // (each face one colour, by where its middle is round the ball)
    const x = p.getX(i) + p.getX(i + 1) + p.getX(i + 2), z = p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2);
    const c = STRIPES[Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI * 2) * 6) % 6];
    for (let k = 0; k < 3; k++) colors.push(...c);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  roller.position.y = 0.98;
  roller.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
  group.add(roller);
  group.userData = { roller };
  return grounded(group, 1.1);
};
// the Moon's drifting cone: a flag on a stand: a broad weighted yellow foot, a stout white pole with a gold ball on
// top, and a wide banner hung square from a bar across it (there is no wind): orange and white stripes and a blue
// corner, bright enough of themselves to be seen in the Moon's hard shadow
OBSTACLE_MODELS.flagStand = () => {
  const lit = (color, share = 0.45) => new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(share) });
  const white = lit(0xf6f6f6), orange = lit(0xff4a12), parts = [
    [white, 0.14, 2.9, 0.14, 0, 1.55, 0],                                            // the pole
    [white, 1.4, 0.09, 0.09, 0, 2.86, 0],                                            // the bar the banner hangs from
    [lit(0x1f5fd0), 0.56, 0.5, 0.07, -0.37, 2.56, 0],                                // the banner's corner
  ];
  for (let i = 0; i < 5; i++) parts.push([i % 2 ? white : orange, 1.3, 0.25, 0.05, 0, 2.69 - i * 0.25, 0]); // its stripes
  const group = boxModel(parts);
  put(group, new THREE.CylinderGeometry(0.26, 0.48, 0.3, 10), lit(0xffc928, 0.3), 0, 0.15, 0); // the foot
  put(group, new THREE.SphereGeometry(0.13, 8, 6), lit(0xffc928, 0.3), 0, 3.05, 0);
  return grounded(group, 0.7);
};
// the hood's cone: a wheelie bin: green, a yellow lid, two wheels and a handle at the back
OBSTACLE_MODELS.wheelieBin = () => {
  const green = lambert(0x2f9a48), yellow = lambert(0xffd23f), dark = lambert(0x1b1d22);
  const group = boxModel([
    [green, 0.62, 0.95, 0.66, 0, 0.6, 0],                                            // the body
    [green, 0.7, 0.1, 0.74, 0, 1.08, 0],                                             // its rim
    [yellow, 0.74, 0.1, 0.8, 0, 1.19, 0.02],                                         // the lid
    [dark, 0.6, 0.06, 0.06, 0, 1.12, -0.44],                                         // the handle
    [lambert(0xf2f2f2), 0.3, 0.3, 0.02, 0, 0.7, -0.335], [lambert(0xf2f2f2), 0.3, 0.3, 0.02, 0, 0.7, 0.335], // a number stuck on, back and front
  ]);
  group.children[2].rotation.x = -0.06;
  for (const x of [-0.3, 0.3]) put(group, new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10).rotateZ(Math.PI / 2), dark, x, 0.16, -0.3);
  group.scale.setScalar(1.15); // (bigger than life, as the cone it stands in for is)
  return grounded(group, 0.6);
};
// the snow's and the ice road's cone: a heap of shovelled snow, a stout orange pole stuck in it with two bright
// reflective bands and a dark cap (a thin stake could not be seen from the car)
OBSTACLE_MODELS.snowdrift = () => {
  const group = new THREE.Group(), snow = lambert(0xf6fbff), orange = new THREE.MeshLambertMaterial({ color: 0xff6a00, emissive: 0x551f00 });
  const bright = new THREE.MeshBasicMaterial({ color: 0xffffff });
  put(group, new THREE.SphereGeometry(0.5, 10, 6), snow, 0, 0.1, 0).scale.set(1, 0.8, 1);
  put(group, new THREE.SphereGeometry(0.32, 8, 6), snow, 0.22, 0.1, 0.24).scale.set(1, 0.7, 1);
  put(group, new THREE.BoxGeometry(0.2, 1.9, 0.2), orange, -0.05, 1.1, 0);
  for (const y of [1.25, 1.7]) put(group, new THREE.BoxGeometry(0.23, 0.2, 0.23), bright, -0.05, y, 0);
  put(group, new THREE.BoxGeometry(0.24, 0.14, 0.24), lambert(0x1b1d22), -0.05, 2.1, 0);
  return grounded(group, 0.65);
};
// Mumbai's bale: jute sacks stacked three, two and one, a red band stencilled round each
OBSTACLE_MODELS.sackStack = () => {
  const jute = lambert(0xcfa868), band = lambert(0xc0392b), group = new THREE.Group();
  const sack = (x, y, z, turn) => {
    const s = new THREE.Group();
    put(s, new THREE.SphereGeometry(0.5, 10, 6), jute).scale.set(1.05, 0.42, 0.68);
    put(s, new THREE.CylinderGeometry(0.345, 0.345, 0.16, 10).rotateZ(Math.PI / 2), band).scale.set(1, 0.62, 1);
    s.position.set(x, y, z);
    s.rotation.y = turn;
    group.add(s);
  };
  for (const z of [-0.68, 0, 0.68]) for (const x of [-0.52, 0.52]) sack(x, 0.2, z, 0.06 * (x + z));
  for (const z of [-0.36, 0.36]) for (const x of [-0.5, 0.5]) sack(x, 0.56, z, -0.08 * x);
  for (const z of [-0.3, 0.3]) sack(0, 0.92, z, Math.PI / 2 + 0.1 * z);
  sack(0, 1.26, 0, 0.3);
  return grounded(group, 1.4);
};
// Hong Kong's crate: a hawker's cart: a dark steel box on two big spoked wheels, a shelf of goods in front, a red-white-blue
// striped awning on four poles over it, and a red lamp lit under the awning (what reads at night on a dark road)
OBSTACLE_MODELS.hawkerCart = () => {
  const steel = lambert(0x3a4048), red = lambert(0xd8262b), white = lambert(0xf2f2ee), blue = lambert(0x1f5fd0), group = new THREE.Group();
  put(group, new THREE.BoxGeometry(1.2, 0.7, 1.1), steel, 0, 0.95, 0);                                 // the box
  put(group, new THREE.BoxGeometry(1.24, 0.08, 1.14), lambert(0xa8b0b8), 0, 1.32, 0);                   // its steel top
  for (const [x, z, c] of [[-0.35, -0.3, 0xffb020], [0.3, -0.25, 0x3aa655], [0, 0.3, 0xe86a1e], [0.4, 0.3, 0xf6e27a]]) put(group, new THREE.BoxGeometry(0.34, 0.3, 0.34), lambert(c), x, 1.5, z); // the goods
  for (const x of [-0.4, 0.4]) put(group, new THREE.BoxGeometry(0.07, 0.07, 0.5), steel, x, 1.0, -0.78); // the handles, out the back
  put(group, new THREE.BoxGeometry(0.9, 0.07, 0.07), steel, 0, 1.0, -1.0);
  for (const x of [-0.68, 0.68]) {                                                                      // the wheels
    put(group, new THREE.CylinderGeometry(0.5, 0.5, 0.08, 16).rotateZ(Math.PI / 2), lambert(0x1c1c1c), x, 0.5, 0);
    put(group, new THREE.CylinderGeometry(0.42, 0.42, 0.09, 16).rotateZ(Math.PI / 2), white, x, 0.5, 0);
    for (const a of [0, Math.PI / 3, Math.PI * 2 / 3]) put(group, new THREE.BoxGeometry(0.05, 0.8, 0.05), steel, x * 1.03, 0.5, 0).rotation.x = a;
    put(group, new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8).rotateZ(Math.PI / 2), red, x, 0.5, 0);
  }
  for (const x of [-0.55, 0.55]) for (const z of [-0.5, 0.5]) put(group, new THREE.BoxGeometry(0.06, 1.1, 0.06), steel, x, 1.85, z); // the awning's poles
  for (let i = 0; i < 6; i++) put(group, new THREE.BoxGeometry(0.28, 0.1, 1.5), [red, white, blue][i % 3], -0.7 + i * 0.28, 2.42, 0); // the awning, striped
  for (const x of [-0.84, 0.84]) put(group, new THREE.BoxGeometry(0.04, 0.26, 1.5), red, x, 2.26, 0);                               // its hanging edges
  put(group, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), steel, 0, 2.22, 0);                       // the lamp on its cord
  put(group, new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff4a3a }), 0, 2.0, 0);
  return grounded(group, 0.95);
};
// Hong Kong's bale: a heap of the red-white-blue nylon bags: fat striped bags stacked three, two and one, strapped down with black
// cord, the stripes different ways on each
OBSTACLE_MODELS.bagStack = () => {
  const group = new THREE.Group(), cord = lambert(0x1c1c1c), stripes = [lambert(0xd8262b), lambert(0xf2f2ee), lambert(0x1f5fd0)];
  const bag = (x, y, z, w, h, l, turn) => {
    const b = new THREE.Group();
    for (let i = 0; i < 6; i++) put(b, new THREE.BoxGeometry(w / 6, h, l), stripes[i % 3], -w / 2 + w / 12 + i * w / 6, 0, 0);
    put(b, new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.08), cord, 0, 0, l * 0.3);                        // the straps round it
    put(b, new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.08), cord, 0, 0, -l * 0.3);
    put(b, new THREE.BoxGeometry(0.12, 0.3, 0.16), stripes[2], 0, h / 2 + 0.1, -l / 2 + 0.2);            // a handle sticking up
    b.position.set(x, y, z);
    b.rotation.y = turn;
    group.add(b);
  };
  for (const z of [-0.72, 0, 0.72]) bag(0, 0.34, z, 1.6, 0.68, 0.7, 0.03 * z);
  for (const z of [-0.4, 0.4]) bag(0, 1.0, z, 1.4, 0.64, 0.74, Math.PI / 2 + 0.05 * z);
  bag(0, 1.62, 0, 1.3, 0.6, 0.8, 0.2);
  return grounded(group, 1.3);
};
// hell's cone: a spike of brimstone, black at the foot and glowing to yellow at its tip. One mesh, and one geometry and one
// material between all of them (All Heck has hundreds along its shoulders)
let brimstoneParts = null;
OBSTACLE_MODELS.brimstone = () => {
  if (!brimstoneParts) {
    const geo = new THREE.ConeGeometry(0.36, 1.5, 5, 3).toNonIndexed(), p = geo.attributes.position, colors = [];
    geo.translate(0, 0.75, 0);
    for (let i = 0; i < p.count; i++) {
      const u = Math.min(1, Math.max(0, p.getY(i) / 1.5)), hot = u * u;
      colors.push(0.3 + 0.7 * u, 0.04 + 0.72 * hot, 0.02 + 0.2 * hot);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    brimstoneParts = [geo, new THREE.MeshBasicMaterial({ vertexColors: true })];
  }
  return new THREE.Mesh(brimstoneParts[0], brimstoneParts[1]);
};
// the toy room's bale: a toy drum: blue, yellow hoops, a white cord zigzagging round it, two sticks laid across the skin
OBSTACLE_MODELS.toyDrum = () => {
  const group = new THREE.Group(), yellow = lambert(0xffd23f), white = lambert(0xf6f6f6), wood = lambert(0xe6c690);
  put(group, new THREE.CylinderGeometry(1.0, 1.0, 1.2, 18), lambert(0x1f5fd0), 0, 0.65, 0);
  for (const y of [0.12, 1.18]) put(group, new THREE.CylinderGeometry(1.06, 1.06, 0.2, 18), yellow, 0, y, 0);
  put(group, new THREE.CylinderGeometry(0.96, 0.96, 0.04, 18), white, 0, 1.29, 0);  // the skin
  for (let i = 0; i < 12; i++) { // the cord, up and down round it
    const a = (i + 0.5) * Math.PI / 6, cord = put(group, new THREE.BoxGeometry(0.07, 1.0, 0.05), white, Math.sin(a) * 1.02, 0.65, Math.cos(a) * 1.02);
    cord.rotation.y = a;
    cord.rotation.z = i % 2 ? 0.5 : -0.5;
  }
  for (const lean of [-1, 1]) {
    const stick = put(group, new THREE.BoxGeometry(0.08, 0.08, 1.5), wood, lean * 0.25, 1.37, 0);
    stick.rotation.y = lean * 0.45;
    put(group, new THREE.SphereGeometry(0.13, 8, 6), lambert(0xd8262b), lean * 0.25 + Math.sin(lean * 0.45) * 0.75, 1.37, Math.cos(lean * 0.45) * 0.75);
  }
  return grounded(group, 1.35);
};
// Venice's cone: a cafe table: a red cloth over a little round table, and its parasol, shut, standing tall out of the middle
OBSTACLE_MODELS.cafeTable = () => {
  const group = new THREE.Group(), white = lambert(0xf6f2e6);
  put(group, new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), lambert(0x2b2f38), 0, 0.4, 0);       // the leg
  put(group, new THREE.CylinderGeometry(0.26, 0.3, 0.06, 10), lambert(0x2b2f38), 0, 0.03, 0);     // its foot
  put(group, new THREE.CylinderGeometry(0.42, 0.46, 0.3, 12), lambert(0xd8262b), 0, 0.72, 0);     // the cloth
  put(group, new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12), white, 0, 0.89, 0);                // the table top
  put(group, new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), white, 0, 1.6, 0);                 // the parasol's pole
  put(group, new THREE.ConeGeometry(0.17, 1.0, 8), lambert(0x1f8a4a), 0, 1.85, 0);                // the parasol, shut
  put(group, new THREE.SphereGeometry(0.06, 6, 5), lambert(0xe6b63c), 0, 2.38, 0);
  return grounded(group, 0.6);
};
