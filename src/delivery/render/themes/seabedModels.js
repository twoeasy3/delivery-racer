// ---- The sea bed's models (the underwater tunnel: see seabed.js): no game state, so the gimmicks page can show
// them too. Each lies along local z, its head at +z, and userData.animate(t) moves what moves.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BALL = new THREE.SphereGeometry(1, 18, 12), CONE = new THREE.ConeGeometry(1, 1, 10), ROD = new THREE.CylinderGeometry(1, 1, 1, 14), BOX = new THREE.BoxGeometry(1, 1, 1);
const DOME = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);

// a blue whale, some 34 m of it: a long body, a pale throat, flippers, and flukes that beat slowly
export const makeWhale = () => {
  const g = new THREE.Group();
  const skin = lambert(0x3f6f8f), pale = lambert(0xb9d3de), dark = lambert(0x2c5470);
  part(g, BALL, skin, 0, 0, 2, 4.2, 3.6, 13);                 // the body
  part(g, BALL, pale, 0, -1.1, 5, 3.7, 2.8, 9.5);             // its throat and belly
  part(g, BALL, skin, 0, 0.3, -11, 2.2, 2, 7);                // the tail stock
  part(g, BALL, dark, 0, 2.6, -4, 0.35, 1.1, 1.8);            // the small fin on its back
  for (const side of [-1, 1]) {
    part(g, BALL, dark, side * 4.6, -1.6, 6, 3, 0.35, 1.3).rotation.z = -side * 0.5; // a flipper
    part(g, BALL, new THREE.MeshBasicMaterial({ color: 0x10202a }), side * 3.3, 0.4, 11.2, 0.3, 0.3, 0.3); // an eye
  }
  const flukes = new THREE.Group();
  for (const side of [-1, 1]) part(flukes, BALL, dark, side * 2.6, 0, -1.2, 3, 0.3, 1.5).rotation.y = side * 0.5;
  flukes.position.set(0, 0.3, -17);
  g.add(flukes);
  g.userData.animate = (t) => { flukes.rotation.x = Math.sin(t * 0.9) * 0.35; g.rotation.x = Math.sin(t * 0.9 + 1) * 0.03; };
  return g;
};

// a shark: grey over white, the fin on its back, a tail taller above than below, sweeping from side to side
export const makeShark = () => {
  const g = new THREE.Group();
  const grey = lambert(0x6f7d88), white = lambert(0xe6ecef);
  part(g, BALL, grey, 0, 0, 0, 1.3, 1.4, 5.2);
  part(g, BALL, white, 0, -0.45, 0.6, 1.15, 1.05, 4.4);
  part(g, CONE, grey, 0, 0, 5.2, 0.9, 2.2, 0.9).rotation.x = Math.PI / 2; // the snout
  part(g, CONE, grey, 0, 2, -0.3, 0.25, 2.2, 1.3).rotation.x = -0.35;      // the fin
  for (const side of [-1, 1]) {
    part(g, CONE, grey, side * 1.8, -0.7, 1.4, 0.3, 2.6, 1).rotation.z = side * 1.9;
    part(g, BALL, new THREE.MeshBasicMaterial({ color: 0x0c0c0c }), side * 0.8, 0.3, 4.4, 0.16, 0.16, 0.16);
  }
  const tail = new THREE.Group();
  part(tail, CONE, grey, 0, 1.3, -1, 0.22, 3, 1).rotation.x = -0.6;
  part(tail, CONE, grey, 0, -0.8, -0.8, 0.2, 1.8, 0.8).rotation.x = Math.PI + 0.6;
  tail.position.set(0, 0, -4.6);
  g.add(tail);
  g.userData.animate = (t) => { tail.rotation.y = Math.sin(t * 3) * 0.4; g.rotation.y = (g.userData.heading || 0) + Math.sin(t * 3 + 1.5) * 0.05; };
  return g;
};

// a sea turtle, paddling
export const makeTurtle = () => {
  const g = new THREE.Group();
  const shell = lambert(0x5d7a3a), plate = lambert(0x7d9a4a), skin = lambert(0x9fb86a);
  part(g, BALL, shell, 0, 0, 0, 2.2, 0.9, 2.8);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) part(g, BALL, plate, i * 1.1, 0.62, j * 1.4, 0.55, 0.3, 0.7);
  part(g, BALL, skin, 0, 0.1, 3.3, 0.7, 0.6, 0.9); // the head
  const flippers = [];
  for (const side of [-1, 1]) {
    flippers.push(part(g, BALL, skin, side * 2.7, -0.1, 1.5, 1.7, 0.18, 0.7));
    part(g, BALL, skin, side * 1.9, -0.1, -2.5, 0.9, 0.16, 0.5);
  }
  g.userData.animate = (t) => { flippers.forEach((f, i) => { f.rotation.z = (i ? -1 : 1) * Math.sin(t * 2) * 0.5; }); };
  return g;
};

// a jellyfish: a glowing bell, pulsing, its tentacles trailing under it
export const makeJellyfish = (color = 0xff8fd0) => {
  const g = new THREE.Group();
  const bell = part(g, DOME, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }), 0, 0, 0, 1.6, 1.5, 1.6);
  part(g, DOME, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), 0, 0.1, 0, 0.9, 1.0, 0.9);
  const strand = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
  const strands = [];
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; strands.push(part(g, ROD, strand, Math.cos(a) * 0.9, -2.2, Math.sin(a) * 0.9, 0.07, 4.4, 0.07)); }
  g.userData.animate = (t) => {
    const p = Math.sin(t * 1.7 + g.position.x);
    bell.scale.set(1.6 - p * 0.2, 1.5 + p * 0.25, 1.6 - p * 0.2);
    strands.forEach((s, k) => { s.rotation.z = Math.sin(t * 1.7 + k) * 0.12; });
  };
  return g;
};

// a yellow submarine: hull, conning tower, periscope, portholes lit, a propeller turning, a lamp at its nose
export const makeSubmarine = () => {
  const g = new THREE.Group();
  const yellow = lambert(0xf2c21c), dark = lambert(0x8a6d10), lit = new THREE.MeshBasicMaterial({ color: 0xcff6ff });
  part(g, BALL, yellow, 0, 0, 0, 3.2, 3.2, 11);
  part(g, ROD, yellow, 0, 3.6, 1, 1.6, 2.6, 2.4);
  part(g, ROD, dark, 0, 5.8, 1.6, 0.18, 2.4, 0.18);
  part(g, BOX, dark, 0, 6.9, 2, 0.3, 0.3, 1);
  for (const side of [-1, 1]) {
    for (let k = -1; k <= 2; k++) part(g, BALL, lit, side * 3.05, 0.6, k * 2.8, 0.25, 0.6, 0.6);
    part(g, BOX, dark, side * 2.4, 0, -8.6, 2.6, 0.25, 1.6); // the tail planes
  }
  part(g, BOX, dark, 0, 1.6, -8.6, 0.25, 2.6, 1.6);
  part(g, BALL, lit, 0, 0, 10.8, 0.8, 0.8, 0.5);
  const prop = new THREE.Group();
  for (let k = 0; k < 3; k++) part(prop, BOX, dark, 0, 0, 0, 0.5, 3.6, 0.15).rotation.z = k * Math.PI / 3;
  prop.position.set(0, 0, -11.2);
  g.add(prop);
  g.userData.animate = (t) => { prop.rotation.z = t * 6; };
  return g;
};

// a wreck on the bed: a wooden hull heeled over and broken-backed, its ribs showing, two masts, one fallen
export const makeWreck = () => {
  const g = new THREE.Group();
  const wood = lambert(0x5a4630), dark = lambert(0x3d3022), weed = lambert(0x3f7a52);
  const hull = new THREE.Group();
  part(hull, BALL, wood, 0, 2, 4, 5, 4.4, 13);
  part(hull, BOX, dark, 0, 5, 4, 8, 1.4, 22);       // the deck, sunk into it
  part(hull, BOX, wood, 0, 6.4, -7, 8.4, 4, 7);     // the sterncastle
  for (let k = -3; k <= 5; k++) for (const side of [-1, 1]) part(hull, BOX, dark, side * 4.6, 5.4, k * 2.6, 0.5, 3.4, 0.5).rotation.z = -side * 0.25;
  part(hull, ROD, dark, 0, 13, 7, 0.45, 16, 0.45);  // a mast standing
  part(hull, BOX, dark, 0, 16, 7, 9, 0.4, 0.4);
  const fallen = part(hull, ROD, dark, 5, 7, -1, 0.45, 15, 0.45);
  fallen.rotation.z = 1.15;
  for (let k = 0; k < 7; k++) part(hull, CONE, weed, (k % 3 - 1) * 3, 7.5 + (k % 2), k * 3 - 8, 0.5, 3 + (k % 3), 0.5);
  hull.rotation.z = 0.32;
  hull.rotation.x = -0.06;
  hull.position.y = -1;
  g.add(hull);
  return g;
};

// a treasure chest on the sand, its lid up, gold in it and a glint over it
export const makeChest = () => {
  const g = new THREE.Group();
  const wood = lambert(0x7a4a22), band = lambert(0xc9a13a), gold = new THREE.MeshBasicMaterial({ color: 0xffd84a });
  part(g, BOX, wood, 0, 1.2, 0, 4.4, 2.4, 3);
  for (const x of [-1.6, 0, 1.6]) part(g, BOX, band, x, 1.2, 0, 0.4, 2.5, 3.1);
  const lid = part(g, BOX, wood, 0, 3.3, -1.7, 4.4, 0.5, 2.6);
  lid.rotation.x = 1.1;
  for (let k = 0; k < 9; k++) part(g, BALL, gold, (k % 3 - 1) * 1.2, 2.5 + (k % 2) * 0.3, (Math.floor(k / 3) - 1) * 0.8, 0.55, 0.35, 0.55);
  return g;
};
