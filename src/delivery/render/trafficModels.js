// ---- MORE TRAFFIC MODELS: the traffic with quirks of its own (see CONFIG.vehicles, and Traffic for what
// each does): an ice cream van, a bin lorry, a learner driver's car, a boy racer's, and a car towing a
// caravan. Added to MODELS (./models.js), so they are drawn like any other: each faces local +z, its
// paint is userData.body's material, and userData.animate(t) moves what moves.
import * as THREE from 'three';
import { MODELS } from './models.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const wheels = (parent, w, zs, r = 0.36) => {
  const tyre = lambert(0x141414);
  for (const z of zs) for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 12).rotateZ(Math.PI / 2), tyre);
    wheel.position.set(side * (w / 2 - 0.1), r, z);
    parent.add(wheel);
  }
};
const GLASS = lambert(0x232a35), LAMP = glow(0xfff3c4), TAIL = glow(0xff2a2a), DARK = lambert(0x1b1d22);
const lights = (parent, w, l, y) => {
  for (const side of [-1, 1]) {
    box(parent, LAMP, w * 0.2, 0.18, 0.06, side * w * 0.33, y, l / 2 + 0.01);
    box(parent, TAIL, w * 0.2, 0.16, 0.06, side * w * 0.33, y, -l / 2 - 0.01);
  }
};
// a plain saloon: body, cabin, roof, lights and wheels. Returns its body (the paint)
const saloon = (group, paint, w, l, h) => {
  const body = box(group, paint, w, h * 0.5, l, 0, 0.3 + h * 0.25, 0);
  box(group, GLASS, w * 0.86, h * 0.42, l * 0.5, 0, 0.3 + h * 0.71, -l * 0.06);
  box(group, paint, w * 0.88, 0.07, l * 0.46, 0, 0.3 + h * 0.94, -l * 0.06);
  lights(group, w, l, 0.3 + h * 0.32);
  wheels(group, w, [l * 0.31, -l * 0.31], 0.33);
  return body;
};

Object.assign(MODELS, {
  // an ice cream van: pink and cream, a serving hatch and awning down one side, a giant cone on the roof
  icecream: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, paint = lambert(car.color), cream = lambert(0xfff3d6);
    const body = box(group, paint, w, 0.9, l, 0, 0.85, 0);
    box(group, cream, w * 0.98, 1.0, l * 0.98, 0, 1.75, -0.02);
    box(group, GLASS, w * 0.9, 0.55, 0.06, 0, 1.75, l / 2);                         // the windscreen
    box(group, GLASS, 0.06, 0.6, l * 0.4, w / 2, 1.75, -l * 0.1);                    // the serving hatch (on its right: local -x is right)
    box(group, GLASS, 0.06, 0.6, l * 0.4, -w / 2, 1.75, -l * 0.1);
    for (let k = 0; k < 5; k++) box(group, lambert(k % 2 ? 0xfff3d6 : 0xff7fb0), 0.5, 0.06, l * 0.08, -w / 2 - 0.25, 2.12, -l * 0.26 + k * l * 0.08).rotation.z = 0.35; // its awning
    box(group, paint, w * 1.0, 0.12, l * 1.0, 0, 2.3, 0);                           // the roof
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 10).rotateX(Math.PI), lambert(0xd9a55a));
    cone.position.set(0, 2.82, -l * 0.15);
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), lambert(0xfff3f8));
    scoop.position.set(0, 3.4, -l * 0.15);
    const flake = box(group, lambert(0x5a3a22), 0.1, 0.5, 0.1, 0.15, 3.75, -l * 0.15);
    flake.rotation.z = -0.4;
    group.add(cone, scoop);
    lights(group, w, l, 0.95);
    wheels(group, w, [l * 0.3, -l * 0.3], 0.38);
    group.userData = { body, animate: (t) => { scoop.scale.setScalar(1 + Math.sin(t * 5) * 0.04); } };
    return group;
  },
  // a bin lorry: a cab, a big hopper body with a tailgate, an amber beacon. userData.beacon: its lamp
  binlorry: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, paint = lambert(car.color), steel = lambert(0x9aa0a6);
    box(group, lambert(0xf4f4f4), w * 0.96, 1.9, l * 0.24, 0, 1.55, l * 0.37);       // the cab
    box(group, GLASS, w * 0.9, 0.7, 0.06, 0, 1.95, l / 2 - 0.02);
    const body = box(group, paint, w, 2.4, l * 0.6, 0, 1.9, -l * 0.07);              // the body
    box(group, steel, w * 0.98, 2.0, l * 0.14, 0, 1.6, -l * 0.43);                   // the hopper at the back...
    box(group, DARK, w * 0.8, 0.9, 0.06, 0, 1.3, -l / 2 + 0.02);                     // ...its mouth
    for (let k = 0; k < 4; k++) box(group, steel, w * 1.02, 0.08, 0.1, 0, 1.0 + k * 0.6, -l * 0.07 + (k % 2 ? 0.8 : -0.8)); // ribs
    box(group, DARK, w * 0.9, 0.5, l * 0.9, 0, 0.6, 0);                              // chassis
    for (let k = 0; k < 4; k++) box(group, lambert(k % 2 ? 0xffd23f : 0xd8262b), w / 4, 0.3, 0.05, -w * 0.375 + k * w / 4, 0.75, -l / 2 - 0.01); // chevrons
    const beacon = box(group, glow(0xffa21a), 0.3, 0.2, 0.3, 0, 2.62, l * 0.37);
    lights(group, w, l, 0.95);
    wheels(group, w, [l * 0.36, -l * 0.22, -l * 0.34], 0.45);
    group.userData = { body, beacon, animate: (t) => { beacon.visible = Math.floor(t * 4) % 2 === 0; } };
    return group;
  },
  // a learner driver's car: a small saloon with L plates front and back and a driving school's sign on its roof
  learner: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, h = car.height;
    const body = saloon(group, lambert(car.color), w, l, h);
    const plate = (z, turn) => {
      const white = box(group, lambert(0xf4f4f4), 0.42, 0.42, 0.04, w * 0.22, 0.3 + h * 0.3, z);
      const red = box(group, lambert(0xd8262b), 0.1, 0.3, 0.05, w * 0.22 + turn * 0.07, 0.3 + h * 0.3, z);
      box(group, lambert(0xd8262b), 0.22, 0.1, 0.05, w * 0.22 - turn * 0.02, 0.3 + h * 0.3 - 0.1, z);
      return [white, red];
    };
    plate(l / 2 + 0.03, 1);
    plate(-l / 2 - 0.03, -1);
    box(group, lambert(0xffd23f), w * 0.7, 0.32, 0.5, 0, 0.3 + h * 0.94 + 0.2, -l * 0.06); // the school's sign...
    box(group, lambert(0xd8262b), 0.22, 0.22, 0.52, 0, 0.3 + h * 0.94 + 0.2, -l * 0.06);   // ...its L
    group.userData = { body, animate: () => {} };
    return group;
  },
  // a boy racer's: a small hatchback slammed to the ground, a body kit, a huge wing, neon under it
  // and an exhaust like a drainpipe
  boyracer: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, h = car.height, paint = lambert(car.color);
    const body = box(group, paint, w, h * 0.5, l, 0, 0.16 + h * 0.25, 0);
    box(group, GLASS, w * 0.84, h * 0.42, l * 0.48, 0, 0.16 + h * 0.7, -l * 0.08);
    box(group, paint, w * 0.86, 0.07, l * 0.44, 0, 0.16 + h * 0.93, -l * 0.08);
    box(group, DARK, w * 1.06, 0.16, l * 1.04, 0, 0.14, 0);                            // the body kit
    box(group, DARK, w * 1.02, 0.06, 0.5, 0, 0.16 + h * 1.12, -l * 0.44);              // the wing...
    for (const side of [-1, 1]) box(group, DARK, 0.06, h * 0.35, 0.3, side * w * 0.4, 0.16 + h * 0.95, -l * 0.44); // ...on its struts
    box(group, lambert(0xf4f4f4), 0.22, 0.02, l * 0.9, w * 0.25, 0.16 + h * 0.5 + 0.01, 0); // a racing stripe
    const neon = box(group, glow(0x39ff14), w * 0.9, 0.04, l * 0.8, 0, 0.05, 0);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 10).rotateX(Math.PI / 2), lambert(0xd8d8d8));
    pipe.position.set(-w * 0.3, 0.26, -l / 2 - 0.15);
    group.add(pipe);
    lights(group, w, l, 0.16 + h * 0.32);
    wheels(group, w, [l * 0.31, -l * 0.31], 0.34);
    group.userData = { body, animate: (t) => { neon.material.color.setHSL((t * 0.3) % 1, 1, 0.55); } };
    return group;
  },
  // a car towing a caravan: the car at the front of its hitbox, the white caravan behind on its one
  // axle, swaying on its hitch (userData.animate sways it)
  caravan: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, carL = l * 0.4, vanL = l * 0.5;
    const tow = new THREE.Group();
    tow.position.z = l / 2 - carL / 2;
    const body = saloon(tow, lambert(car.color), w * 0.9, carL, 1.5);
    group.add(tow);
    const hitch = new THREE.Group(); // (the caravan pivots about the tow ball)
    hitch.position.set(0, 0, l / 2 - carL - 0.3);
    box(hitch, DARK, 0.1, 0.1, 0.9, 0, 0.5, -0.4);
    box(hitch, lambert(0xf2f0ea), w, 2.0, vanL, 0, 1.6, -0.8 - vanL / 2);
    box(hitch, lambert(0x7fb6d8), w * 1.01, 0.3, vanL * 0.9, 0, 1.2, -0.8 - vanL / 2); // its stripe
    box(hitch, GLASS, w * 1.01, 0.5, vanL * 0.3, 0, 2.0, -0.8 - vanL * 0.35);
    box(hitch, GLASS, w * 0.6, 0.5, 0.05, 0, 2.0, -0.8 - vanL - 0.01);
    for (const side of [-1, 1]) box(hitch, TAIL, w * 0.16, 0.16, 0.05, side * w * 0.36, 0.9, -0.8 - vanL - 0.02);
    wheels(hitch, w, [-0.8 - vanL * 0.55], 0.34);
    group.add(hitch);
    group.userData = { body, animate: (t) => { hitch.rotation.y = Math.sin(t * 2.3) * 0.12; hitch.rotation.z = Math.sin(t * 2.3 + 0.6) * 0.03; } };
    return group;
  },
});
