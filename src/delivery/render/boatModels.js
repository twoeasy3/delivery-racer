// ---- BOAT MODELS: the boats of a water stage (see CONFIG.vehicles: dinghy, barge, ferry, pedalo; and
// ../water.js for where they go). Added to MODELS (./models.js), so they are drawn like any other traffic:
// each faces local +z, sits on the water at y = 0, its paint is userData.body's material, and
// userData.animate(t) moves what moves. No game state here: the gimmicks page shows them too.
import * as THREE from 'three';
import { MODELS } from './models.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a hull: a box with a pointed bow (a wedge on the front of it), w wide, h high, l long over all, its foot at y
const hull = (parent, material, w, h, l, y, bow = 0.25) => {
  const body = box(parent, material, w, h, l * (1 - bow), 0, y + h / 2, -l * bow / 2);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, l * bow); shape.closePath();
  const wedge = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }), material);
  wedge.rotation.x = Math.PI / 2; // (the plan, laid flat: its point to +z)
  wedge.scale.y = 1;
  wedge.position.set(0, y + h, l / 2 - l * bow);
  parent.add(wedge);
  return body;
};
const WOOD = lambert(0x8a6a45), DARK = lambert(0x1c1c1e), WHITE = lambert(0xf2f2ee), GLASS = lambert(0x232a35), STEEL = lambert(0x8d9096);
const person = (parent, shirt, x, y, z) => {
  box(parent, lambert(shirt), 0.42, 0.5, 0.3, x, y + 0.25, z);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), lambert(0xe2b48c));
  head.position.set(x, y + 0.68, z);
  parent.add(head);
};

Object.assign(MODELS, {
  // a dinghy: a little open boat, a thwart across it, someone at the tiller of its outboard
  dinghy: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, paint = lambert(car.color);
    const body = hull(group, paint, w, 0.5, l, -0.12, 0.35);
    box(group, WHITE, w * 0.86, 0.06, l * 0.6, 0, 0.36, -l * 0.16);          // its floor, pale inside
    box(group, WOOD, w * 0.9, 0.07, 0.28, 0, 0.42, -l * 0.05);               // the thwart
    box(group, DARK, 0.26, 0.42, 0.3, 0, 0.5, -l / 2 - 0.12);                // the outboard,
    const prop = box(group, STEEL, 0.3, 0.05, 0.05, 0, 0.05, -l / 2 - 0.2);  // its propeller
    person(group, 0xf2862a, 0.1, 0.4, -l * 0.3);
    group.userData = { body, animate: (t) => { prop.rotation.z = t * 22; } };
    return group;
  },
  // a barge: a long, low, wide steel hull, its hold heaped with cargo under tarpaulins, a little
  // wheelhouse right at the stern
  barge: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, paint = lambert(car.color);
    const body = hull(group, paint, w, 0.9, l, -0.15, 0.1);
    box(group, DARK, w * 1.02, 0.12, l * 0.88, 0, 0.78, -l * 0.05);           // the rubbing strake
    for (let k = 0; k < 4; k++) {                                             // the cargo, heap by heap
      const heap = box(group, lambert([0x6b7a4a, 0x8a6a45, 0x5a6470, 0x9a8160][k]), w * 0.8, 0.5 + (k % 2) * 0.25, l * 0.15, 0, 1.05 + (k % 2) * 0.12, l * 0.28 - k * l * 0.17);
      heap.rotation.y = (k % 2 ? 1 : -1) * 0.04;
    }
    box(group, WHITE, w * 0.7, 1.1, l * 0.11, 0, 1.3, -l * 0.42);              // the wheelhouse,
    box(group, GLASS, w * 0.72, 0.4, l * 0.112, 0, 1.5, -l * 0.42);            // its windows,
    box(group, DARK, w * 0.76, 0.08, l * 0.13, 0, 1.9, -l * 0.42);             // its roof
    const flag = box(group, lambert(0xd8262b), 0.03, 0.3, 0.5, 0, 2.3, -l * 0.47);
    box(group, STEEL, 0.05, 0.6, 0.05, 0, 2.15, -l * 0.455);
    group.userData = { body, animate: (t) => { flag.rotation.y = Math.sin(t * 5) * 0.25; } };
    return group;
  },
  // a ferry: a white double-ended passenger boat, two decks of windows, a funnel, lifebelts along its rail
  ferry: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, paint = lambert(car.color);
    const body = hull(group, paint, w, 1.0, l, -0.15, 0.16);
    box(group, WHITE, w * 0.92, 1.0, l * 0.74, 0, 1.35, -l * 0.04);            // the lower deck
    box(group, GLASS, w * 0.94, 0.42, l * 0.68, 0, 1.45, -l * 0.04);
    box(group, WHITE, w * 0.8, 0.85, l * 0.5, 0, 2.28, -l * 0.06);             // the upper deck
    box(group, GLASS, w * 0.82, 0.36, l * 0.44, 0, 2.36, -l * 0.06);
    box(group, paint, w * 0.86, 0.1, l * 0.56, 0, 2.76, -l * 0.06);            // its roof
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.9, 10), lambert(0xf2c418));
    funnel.position.set(0, 3.2, -l * 0.14);
    group.add(funnel);
    for (const side of [-1, 1]) for (const z of [0.2, 0, -0.2]) {
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 6, 12), lambert(0xf2662a));
      belt.rotation.y = Math.PI / 2;
      belt.position.set(side * (w * 0.46 + 0.04), 1.0, l * z);
      group.add(belt);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },
  // a pedal boat: two bright floats, a seat for two between them, a paddle wheel turning at the back
  pedalo: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, paint = lambert(car.color);
    let body = null;
    for (const side of [-1, 1]) {
      const float = box(group, paint, w * 0.3, 0.34, l, side * w * 0.34, 0.06, 0);
      body = body || float;
      float.material = paint;
    }
    box(group, WHITE, w * 0.9, 0.08, l * 0.6, 0, 0.3, -l * 0.05);             // the deck between them
    box(group, WHITE, w * 0.8, 0.5, 0.12, 0, 0.6, -l * 0.3);                  // the seat's back
    for (const x of [-0.28, 0.28]) person(group, x < 0 ? 0x2f7fc4 : 0xe24a8c, x, 0.36, -l * 0.14);
    const wheel = new THREE.Group();                                           // the paddle wheel
    wheel.position.set(0, 0.25, -l * 0.44);
    for (let k = 0; k < 4; k++) box(wheel, lambert(0xf2c418), w * 0.3, 0.5, 0.05, 0, 0, 0).rotation.x = k * Math.PI / 4;
    group.add(wheel);
    group.userData = { body, animate: (t) => { wheel.rotation.x = t * 4; } };
    return group;
  },
});
