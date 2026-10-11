// ---- THE AIRPORT'S AIRLINERS AND ITS CONTROL TOWER (see wreckage.js) ----
// The models alone (no game state, nothing added to a scene): built here so the game and the menu's pages
// (see ../gimmicks.js) can both use them. Each faces local +z, its feet on y = 0.
import * as THREE from 'three';

export const lambert = (color) => new THREE.MeshLambertMaterial({ color });
export const CHAR = lambert(0x2a2624), STEEL = lambert(0x8f969e), WHITE = lambert(0xe8eaec), GLASS = lambert(0x2f5560);
export const add = (group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const across = (r0, r1, length, sides = 14) => new THREE.CylinderGeometry(r0, r1, length, sides).rotateZ(Math.PI / 2); // (lying across the road)

// an airliner, w m across the road at its widest and d m nose to tail (local +z), wheels on y = 0;
// broken: its wings snapped off short, scorched (crashed), or whole (parked)
export const makeAirliner = (w, d, broken) => {
  const g = new THREE.Group(), blue = lambert(0x1d4f9c);
  add(g, new THREE.CylinderGeometry(2.1, 2.1, d * 0.82, 16).rotateX(Math.PI / 2), WHITE, 0, 2.6, 0);  // fuselage
  add(g, new THREE.CylinderGeometry(2.12, 2.12, d * 0.82, 16).rotateX(Math.PI / 2), blue, 0, 3.1, 0).scale.set(1, 0.16, 1); // its stripe
  add(g, new THREE.SphereGeometry(2.1, 14, 10), WHITE, 0, 2.6, d * 0.41).scale.set(1, 1, 1.8);       // nose
  add(g, new THREE.ConeGeometry(2.1, d * 0.16, 14).rotateX(-Math.PI / 2), WHITE, 0, 3.0, -d * 0.48); // tail cone
  add(g, box(0.4, 6, 4.5), blue, 0, 6.5, -d * 0.44, 0.3);                                            // fin
  add(g, box(11, 0.3, 3), WHITE, 0, 3.6, -d * 0.44);                                                 // tailplane
  const span = broken ? w : d * 0.95;
  add(g, box(span, 0.45, 5.5), WHITE, 0, 1.9, -d * 0.02);                                            // wings
  for (const side of [-1, 1]) if (!broken || w > 9) add(g, new THREE.CylinderGeometry(1.1, 1.1, 3.5, 12).rotateX(Math.PI / 2), STEEL, side * Math.min(span * 0.3, 7), 1.2, d * 0.04);
  if (broken) {
    add(g, box(4.4, 3, d * 0.2), CHAR, 0, 2.6, d * 0.1);                                              // burnt through
    add(g, box(1.5, 0.5, 4), CHAR, span / 2 - 0.5, 1.9, 0, 0, 0.4, 0.3);                              // a torn wing root
  }
  return g;
};

// the control tower: a tall concrete shaft with its glass cab on top (its foot at y = 0)
export const makeTower = () => {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(2.2, 3.2, 44, 14), lambert(0xd3cfc5), 0, 22, 0);
  add(g, new THREE.CylinderGeometry(5.2, 3.6, 2, 8), lambert(0xd3cfc5), 0, 45, 0);
  add(g, new THREE.CylinderGeometry(5, 5, 5, 8), GLASS, 0, 48.5, 0);
  add(g, new THREE.CylinderGeometry(5.6, 5.6, 0.8, 8), STEEL, 0, 51.4, 0);
  add(g, box(0.3, 7, 0.3), STEEL, 1.5, 55, 0);
  return g;
};
