// ---- The Wild West's models (see wildwest.js): no game state, so the gimmicks page can show them too. Each faces
// local +z, and userData.animate(t) moves what moves.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BOX = new THREE.BoxGeometry(1, 1, 1), BALL = new THREE.SphereGeometry(0.5, 12, 9);
const ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);                       // (standing)
const LIE = new THREE.CylinderGeometry(0.5, 0.5, 1, 16).rotateX(Math.PI / 2);  // (lying along z: a boiler)
const AXLE = new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateZ(Math.PI / 2); // (lying along x: a wheel)
const FUNNEL = new THREE.CylinderGeometry(0.5, 0.2, 1, 12);
const WEDGE = new THREE.ConeGeometry(0.5, 1, 4).rotateY(Math.PI / 4).rotateX(Math.PI / 2); // (a pyramid on its side, its point to +z)

// (a pair of wheels on an axle, at z, of that size)
const wheels = (g, material, z, size, half = 0.95) => { for (const x of [-half, half]) part(g, AXLE, material, x, size / 2, z, 0.22, size, size); };

// a steam locomotive of the 1870s: a long boiler, a diamond stack, brass domes, a red cab and cowcatcher, big
// driving wheels; smoke in puffs from the stack, drifting back over it
export const makeLocomotive = () => {
  const g = new THREE.Group();
  const black = lambert(0x26282c), green = lambert(0x2f5a44), red = lambert(0xb5302a), brass = lambert(0xd9a83a), wood = lambert(0x7a4a2a);
  part(g, BOX, black, 0, 1.05, 0, 2, 0.4, 8.6);
  part(g, LIE, green, 0, 2.5, 1.1, 1.9, 1.9, 5.2);
  part(g, LIE, black, 0, 2.5, 3.9, 2, 2, 0.6);
  for (const z of [0, 1.6]) part(g, LIE, brass, 0, 2.5, z + 0.3, 1.96, 1.96, 0.12); // (the boiler's bands)
  part(g, ROD, black, 0, 3.8, 3.3, 0.55, 1.2, 0.55);
  part(g, FUNNEL, black, 0, 4.9, 3.3, 1.7, 1.1, 1.7);
  part(g, BALL, brass, 0, 3.5, 1.7, 0.9, 1.1, 0.9);
  part(g, BALL, brass, 0, 3.5, 0.2, 0.8, 0.9, 0.8);
  part(g, BOX, red, 0, 2.9, -2.6, 2.4, 2.6, 2.2);
  part(g, BOX, black, 0, 4.3, -2.6, 2.9, 0.16, 2.9);
  for (const x of [-1.21, 1.21]) part(g, BOX, lambert(0x1a1c20), x, 3.3, -2.6, 0.04, 0.9, 1.3); // (the cab's windows)
  part(g, WEDGE, red, 0, 0.75, 4.75, 2.2, 1.3, 1.6);
  part(g, BOX, wood, 0, 1.4, 4.2, 2.3, 0.3, 0.3);
  part(g, BOX, black, 0, 3.75, 4.05, 0.5, 0.55, 0.45);
  part(g, BALL, glow(0xffe9a0), 0, 3.75, 4.3, 0.36, 0.36, 0.1);
  for (const z of [-0.5, -2.3]) wheels(g, red, z, 1.7, 1.02);
  for (const z of [2.3, 3.4]) wheels(g, red, z, 0.9, 1.02);
  for (const x of [-1.16, 1.16]) part(g, BOX, lambert(0x9a9da4), x, 0.85, -1.4, 0.08, 0.14, 2.4); // (the coupling rods)
  const puffs = [];
  for (let k = 0; k < 6; k++) puffs.push(part(g, BALL, new THREE.MeshBasicMaterial({ color: 0xe8e4dc, transparent: true, opacity: 0.6, depthWrite: false }), 0, 5.6, 3.3));
  g.userData.animate = (t) => {
    puffs.forEach((puff, k) => {
      const u = (t * 0.45 + k / puffs.length) % 1, r = 0.8 + u * 3.4;
      puff.position.set(Math.sin(k * 2.1) * u * 0.8, 5.5 + u * 7, 3.3 - u * 11);
      puff.scale.set(r, r, r);
      puff.material.opacity = 0.7 * (1 - u);
    });
  };
  return g;
};

// its tender: a box of water, cordwood stacked on top
export const makeTender = () => {
  const g = new THREE.Group();
  const black = lambert(0x26282c), green = lambert(0x2f5a44), wood = lambert(0x8a5a34);
  part(g, BOX, black, 0, 1.05, 0, 2, 0.4, 4.4);
  part(g, BOX, green, 0, 2.05, 0, 2.3, 1.6, 4);
  part(g, BOX, wood, 0, 3, 0.3, 1.9, 0.5, 2.8);
  part(g, BOX, lambert(0x6f4426), 0, 3.35, 0.5, 1.5, 0.3, 1.8);
  for (const z of [-1.3, 1.3]) wheels(g, black, z, 0.9);
  return g;
};

// a passenger car: mustard sides, a row of windows, a clerestory roof, a railed platform at each end
export const makeCarriage = () => {
  const g = new THREE.Group();
  const side = lambert(0xd9a83a), roof = lambert(0x7a2a24), dark = lambert(0x26282c);
  part(g, BOX, dark, 0, 1.05, 0, 2.1, 0.4, 9.6);
  part(g, BOX, side, 0, 2.5, 0, 2.5, 2.5, 8.2);
  part(g, BOX, lambert(0x2a3540), 0, 2.95, 0, 2.54, 0.85, 7.2);
  for (let z = -3; z <= 3; z += 1.2) part(g, BOX, side, 0, 2.95, z, 2.56, 0.87, 0.22);
  part(g, BOX, roof, 0, 3.85, 0, 2.8, 0.22, 9);
  part(g, BOX, roof, 0, 4.1, 0, 1.3, 0.34, 7.6);
  for (const z of [-4.5, 4.5]) for (const x of [-1, 1]) part(g, BOX, dark, x, 1.8, z, 0.08, 1.1, 0.08);
  for (const z of [-3.2, -2.2, 2.2, 3.2]) wheels(g, dark, z, 0.9);
  return g;
};

// a boxcar: oxide red planks, a sliding door, a walkway along its roof
export const makeBoxcar = (color = 0x9a3f2c) => {
  const g = new THREE.Group();
  const dark = lambert(0x26282c);
  part(g, BOX, dark, 0, 1.05, 0, 2.1, 0.4, 8);
  part(g, BOX, lambert(color), 0, 2.65, 0, 2.5, 2.8, 7.6);
  part(g, BOX, lambert(new THREE.Color(color).multiplyScalar(0.75).getHex()), 0, 2.55, 0, 2.56, 2.4, 2);
  part(g, BOX, lambert(0x5a2a20), 0, 4.1, 0, 2.7, 0.14, 7.9);
  part(g, BOX, lambert(0x8a6a48), 0, 4.22, 0, 0.6, 0.1, 7.6);
  for (const z of [-2.9, -1.9, 1.9, 2.9]) wheels(g, dark, z, 0.9);
  return g;
};

// the caboose: red, a cupola on its roof, a lamp at the back
export const makeCaboose = () => {
  const g = new THREE.Group();
  const red = lambert(0xc2382e), dark = lambert(0x26282c);
  part(g, BOX, dark, 0, 1.05, 0, 2.1, 0.4, 6.6);
  part(g, BOX, red, 0, 2.5, 0, 2.5, 2.5, 5.4);
  part(g, BOX, dark, 0, 3.82, 0, 2.8, 0.16, 6.2);
  part(g, BOX, red, 0, 4.3, 0.3, 1.5, 0.9, 1.7);
  part(g, BOX, dark, 0, 4.8, 0.3, 1.8, 0.14, 2);
  for (const x of [-1.26, 1.26]) for (const z of [-1.4, 1.4]) part(g, BOX, lambert(0xf2e2a8), x, 2.8, z, 0.04, 0.8, 0.8);
  part(g, BALL, glow(0xff4a3a), 0, 2.2, -3.2, 0.3, 0.3, 0.3);
  for (const z of [-1.9, 1.9]) wheels(g, dark, z, 0.9);
  return g;
};

// a covered wagon: a plank bed on four spoked wheels, a canvas tilt over hoops, the tongue on the ground
export const makeWagon = () => {
  const g = new THREE.Group();
  const wood = lambert(0x8a5a34), dark = lambert(0x5a3a22), canvas = lambert(0xefe6cf);
  part(g, BOX, wood, 0, 1.35, 0, 1.8, 0.7, 4);
  part(g, LIE, canvas, 0, 2.15, 0, 2, 2.3, 3.7);
  part(g, LIE, lambert(0x3a2c20), 0, 2.15, 0, 1.7, 2, 3.74); // (the dark inside, seen at each end)
  for (const z of [-1.5, 0, 1.5]) part(g, LIE, lambert(0xd9cdb0), 0, 2.15, z, 2.04, 2.34, 0.1); // (the hoops)
  for (const [z, size] of [[1.4, 1.2], [-1.3, 1.5]]) {
    for (const x of [-1.05, 1.05]) {
      part(g, AXLE, dark, x, size / 2, z, 0.12, size, size);
      part(g, AXLE, wood, x * 1.01, size / 2, z, 0.13, size * 0.78, size * 0.78);
      part(g, AXLE, dark, x * 1.02, size / 2, z, 0.14, 0.3, 0.3);
    }
  }
  part(g, BOX, wood, 0, 0.5, 3.4, 0.12, 0.12, 3).rotation.x = 0.15;
  return g;
};

// a wind pump: a lattice tower, a wheel of blades turning at its head, a tail vane, a water tank at its foot
export const makeWindpump = () => {
  const g = new THREE.Group();
  const steel = lambert(0x9a9da4), wood = lambert(0x8a5a34);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, BOX, steel, x * 0.75, 4.5, z * 0.75, 0.12, 9.1, 0.12).rotation.set(z * 0.11, 0, -x * 0.11);
  for (const y of [2, 4.5, 7]) { const w = 2.5 - y * 0.22; for (const s of [-1, 1]) { part(g, BOX, steel, 0, y, s * w / 2, w, 0.08, 0.08); part(g, BOX, steel, s * w / 2, y, 0, 0.08, 0.08, w); } }
  const head = new THREE.Group(), fan = new THREE.Group();
  for (let k = 0; k < 14; k++) { const blade = part(fan, BOX, steel, 0, 0, 0, 0.42, 1.5, 0.04); const a = k / 14 * Math.PI * 2; blade.position.set(Math.sin(a) * 1.25, Math.cos(a) * 1.25, 0); blade.rotation.z = -a; blade.rotation.y = 0.35; }
  part(fan, AXLE, steel, 0, 0, 0, 0.1, 0.5, 0.5).rotation.y = Math.PI / 2;
  fan.position.z = 0.7;
  head.add(fan);
  part(head, BOX, steel, 0, 0, -1.4, 0.06, 0.1, 2.8);
  part(head, BOX, lambert(0xb5302a), 0, 0, -3, 0.06, 1.3, 1.2);
  head.position.y = 9.4;
  g.add(head);
  part(g, ROD, wood, 3.2, 0.7, 0, 3, 1.4, 3);
  part(g, ROD, lambert(0x4f8fb0), 3.2, 1.36, 0, 2.8, 0.1, 2.8);
  g.userData.animate = (t) => { fan.rotation.z = t * 2.2; head.rotation.y = Math.sin(t * 0.2) * 0.3; };
  return g;
};

// a tumbleweed: a ball of dry twigs, rolling
export const makeTumbleweed = (r = 0.7) => {
  const g = new THREE.Group(), ball = new THREE.Group();
  const SHAPE = new THREE.IcosahedronGeometry(1, 1);
  part(ball, SHAPE, lambert(0x8f7446), 0, 0, 0, r * 0.72, r * 0.72, r * 0.72);
  part(ball, SHAPE, new THREE.MeshBasicMaterial({ color: 0xc9a868, wireframe: true }), 0, 0, 0, r, r, r);
  ball.position.y = r;
  g.add(ball);
  g.userData.ball = ball;
  g.userData.animate = (t) => { ball.rotation.x = t * 5; ball.rotation.z = Math.sin(t * 1.3) * 0.5; ball.position.y = r + Math.abs(Math.sin(t * 3.1)) * r * 0.9; };
  return g;
};
