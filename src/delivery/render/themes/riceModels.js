// ---- The rice terraces' models (see rice.js): no game state, so the gimmicks page can show them too. Each faces
// local +z, and userData.animate(t) moves what moves.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BOX = new THREE.BoxGeometry(1, 1, 1), BALL = new THREE.SphereGeometry(0.5, 10, 8), ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const CONE = new THREE.ConeGeometry(0.5, 1, 10), HIP = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
const DIAMOND = new THREE.CylinderGeometry(0.5, 0.5, 1, 4).rotateX(Math.PI / 2); // (a square on its corner, facing z)

// a kite: a diamond of paper in two colours, a tail of bows, on a string down to whoever flies it (`up` m below);
// it swings and dips on the wind
export const makeKite = (color = 0xe8443a, second = 0xffd23a, up = 30) => {
  const g = new THREE.Group(), kite = new THREE.Group();
  const basic = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  part(kite, DIAMOND, basic(color), 0, 0, 0, 3.2, 4.4, 0.05);
  part(kite, DIAMOND, basic(second), 0, 0.5, 0.04, 1.5, 2, 0.05);
  const tail = [];
  for (let k = 0; k < 6; k++) tail.push(part(kite, BOX, basic(k % 2 ? color : second), 0, -2.6 - k * 0.8, 0, 0.7, 0.25, 0.05));
  kite.rotation.x = -0.5;
  kite.position.y = up;
  g.add(kite);
  const string = part(g, BOX, basic(0xf4f4f4), 0, up / 2, -up * 0.2, 0.04, 1, 0.04);
  g.userData.animate = (t) => {
    const sway = Math.sin(t * 0.7) * 5, dip = Math.sin(t * 1.3) * 2.2;
    kite.position.set(sway, up + dip, 0);
    kite.rotation.z = Math.sin(t * 0.7 + 1) * 0.3;
    tail.forEach((bow, k) => { bow.position.x = Math.sin(t * 3 - k * 0.7) * 0.12 * (k + 1); });
    // (the string from the ground, up * 0.4 behind, to the kite)
    const fx = 0, fy = 0, fz = -up * 0.4, dx = sway - fx, dy = up + dip - fy, dz = -fz;
    string.position.set(fx + dx / 2, fy + dy / 2, fz + dz / 2);
    string.scale.y = Math.hypot(dx, dy, dz);
    string.rotation.set(Math.atan2(dz, dy), 0, -Math.atan2(dx, Math.hypot(dy, dz)));
  };
  return g;
};

// a water buffalo standing in a paddy, up to its knees: slate grey, wide swept-back horns, an egret on its back
export const makeBuffalo = () => {
  const g = new THREE.Group();
  const hide = lambert(0x4a4c52), horn = lambert(0xcfc8b4);
  part(g, BOX, hide, 0, 1.25, 0, 1.2, 1.1, 2.4);
  part(g, BOX, hide, 0, 1.45, 1.5, 0.75, 0.75, 0.9);
  for (const x of [-0.42, 0.42]) for (const z of [-0.9, 0.9]) part(g, BOX, hide, x, 0.4, z, 0.3, 0.9, 0.3);
  for (const x of [-1, 1]) { const h = part(g, BOX, horn, x * 0.7, 1.95, 1.35, 0.9, 0.14, 0.14); h.rotation.set(0, x * 0.5, x * 0.35); }
  part(g, BOX, hide, 0, 1.4, -1.3, 0.1, 0.8, 0.1);
  part(g, BALL, lambert(0xffffff), 0.1, 2.05, -0.3, 0.3, 0.42, 0.5);
  part(g, BOX, lambert(0xffffff), 0.1, 2.4, -0.05, 0.07, 0.5, 0.07);
  part(g, BOX, lambert(0xf2b83a), 0.1, 2.62, 0.12, 0.05, 0.05, 0.3);
  return g;
};

// a hut on stilts: woven walls, a steep roof of thatch well down over them, a ladder up to its door
export const makeHut = () => {
  const g = new THREE.Group();
  const wood = lambert(0x7a5a3a), wall = lambert(0xc9a877), thatch = lambert(0xb8964e);
  for (const x of [-1.9, 1.9]) for (const z of [-2.4, 2.4]) part(g, ROD, wood, x, 1.2, z, 0.25, 2.4, 0.25);
  part(g, BOX, wood, 0, 1.75, 0, 4.6, 0.2, 5.6);
  part(g, BOX, wall, 0, 3, 0, 4, 2.3, 5);
  part(g, BOX, lambert(0x3a2a1e), 2.02, 2.8, 0, 0.06, 1.7, 1);
  part(g, HIP, thatch, 0, 5.4, 0, 6, 3.2, 7.2);
  part(g, HIP, lambert(0xa3823f), 0, 6.3, 0, 3.4, 2.2, 4.2);
  const ladder = part(g, BOX, wood, 2.9, 0.9, 0, 0.12, 2.3, 0.9);
  ladder.rotation.z = -0.5;
  return g;
};

// a farmer bent to the rice: a straw hat like a wide cone, a shirt in a colour
export const makeFarmer = (color = 0x3a6fd0) => {
  const g = new THREE.Group();
  part(g, BOX, lambert(color), 0, 0.85, 0.1, 0.5, 0.75, 0.4).rotation.x = 0.5;
  part(g, BOX, lambert(0x2f3136), 0, 0.3, 0, 0.42, 0.6, 0.3);
  part(g, CONE, lambert(0xe2c878), 0, 1.42, 0.3, 1.15, 0.4, 1.15);
  return g;
};
