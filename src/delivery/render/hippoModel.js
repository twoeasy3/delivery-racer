// ---- THE HIPPO (see hippos.js) ----
// The models alone (no game state, nothing added to a scene): built here so the game and the menu's pages
// (see ../gimmicks.js) can both use them. Each faces local +z, its feet on y = 0.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const HIDE = lambert(0x7d6a72), BELLY = lambert(0xc99a9a), MOUTH = lambert(0xd9707a), TUSK = lambert(0xf4efe2), EYE = lambert(0x161616);
export const add = (group, geometry, material, x, y, z) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
// one hippo, facing local +z, its feet at y = 0
export const makeHippo = () => {
  const group = new THREE.Group();
  const body = add(group, new THREE.SphereGeometry(1, 16, 12), HIDE, 0, 1.15, -0.3);
  body.scale.set(0.95, 0.8, 1.9);
  add(group, new THREE.BoxGeometry(1.3, 0.3, 2.6), BELLY, 0, 0.6, -0.3);
  const head = new THREE.Group(); // (the head, which the jaws hang from)
  head.position.set(0, 1.35, 1.5);
  group.add(head);
  add(head, new THREE.BoxGeometry(1.1, 0.55, 1.2), HIDE, 0, 0.15, 0.4);           // the upper jaw and snout
  const jaw = new THREE.Group();
  head.add(jaw);
  add(jaw, new THREE.BoxGeometry(1.0, 0.3, 1.1), HIDE, 0, -0.15, 0.45);           // the lower jaw...
  add(jaw, new THREE.BoxGeometry(0.85, 0.06, 0.95), MOUTH, 0, 0.02, 0.45);         // ...pink inside...
  for (const side of [-1, 1]) {
    add(jaw, new THREE.BoxGeometry(0.12, 0.35, 0.12), TUSK, side * 0.35, 0.18, 0.85); // ...with its tusks
    add(head, new THREE.BoxGeometry(0.16, 0.18, 0.1), HIDE, side * 0.35, 0.55, -0.1); // ears
    add(head, new THREE.BoxGeometry(0.14, 0.14, 0.08), EYE, side * 0.35, 0.42, 0.05);  // eyes
  }
  add(head, new THREE.BoxGeometry(0.85, 0.06, 0.95), MOUTH, 0, -0.12, 0.45);       // (the roof of its mouth)
  const legs = [];
  for (const [x, z] of [[-0.55, 0.9], [0.55, 0.9], [-0.55, -1.4], [0.55, -1.4]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.75, z);
    add(leg, new THREE.BoxGeometry(0.45, 0.75, 0.45), HIDE, 0, -0.38, 0);
    group.add(leg);
    legs.push(leg);
  }
  group.userData = { jaw, legs };
  group.scale.setScalar(CONFIG.hippo.hw / 2.1); // (the model is 4.2 m nose to tail)
  return group;
};
