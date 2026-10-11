// ---- The moon base's models (see moon.js): no game state, so the gimmicks page can show them too. Each faces
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
const BALL = new THREE.SphereGeometry(1, 18, 12), CONE = new THREE.ConeGeometry(1, 1, 12), ROD = new THREE.CylinderGeometry(1, 1, 1, 14), BOX = new THREE.BoxGeometry(1, 1, 1);
const DOME = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const BOWL = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38);

// a tracking dish on a pedestal, turning slowly to and fro, a red lamp at its feed
export const makeDish = () => {
  const g = new THREE.Group();
  const white = lambert(0xe6e8ec), grey = lambert(0x7d8088);
  part(g, ROD, grey, 0, 0.4, 0, 2.6, 0.8, 2.6);
  part(g, ROD, grey, 0, 4, 0, 0.6, 7, 0.6);
  const head = new THREE.Group();
  const bowl = part(head, BOWL, lambert(0xe6e8ec, { side: THREE.DoubleSide }), 0, 6.6, 0, 6.5, 6.5, 6.5);
  bowl.userData.keep = true;
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; part(head, ROD, grey, Math.cos(a) * 2.2, 3.2, Math.sin(a) * 2.2, 0.08, 5.2, 0.08).rotation.set(Math.sin(a) * 0.42, 0, -Math.cos(a) * 0.42); }
  part(head, BALL, glow(0xff4a3a), 0, 5.6, 0, 0.35, 0.35, 0.35);
  part(head, BOX, white, 0, 0, 0, 1.6, 1.4, 1.6);
  head.position.y = 8;
  head.rotation.x = 0.9;
  const turn = new THREE.Group();
  turn.add(head);
  g.add(turn);
  g.userData.animate = (t) => { turn.rotation.y = Math.sin(t * 0.25) * 1.2; };
  return g;
};

// a lander on its four legs: a gold-foil descent stage, a grey cabin on it, a dish, and a flag planted beside it
export const makeLander = () => {
  const g = new THREE.Group();
  const gold = lambert(0xd9a52a), grey = lambert(0xa9adb5), dark = lambert(0x3a3c42);
  part(g, ROD, gold, 0, 3.4, 0, 3.4, 2.4, 3.4).rotation.y = Math.PI / 8;
  part(g, BOX, grey, 0, 6.2, 0, 3.6, 3.2, 3.2);
  part(g, BOX, dark, 0, 6.6, 1.65, 1.2, 0.9, 0.1); // its window
  part(g, CONE, dark, 0, 1.7, 0, 1.3, 1.6, 1.3);   // the engine bell
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * Math.PI * 2 + Math.PI / 4, x = Math.cos(a), z = Math.sin(a);
    const leg = part(g, ROD, grey, x * 4.2, 2.2, z * 4.2, 0.14, 5.2, 0.14);
    leg.rotation.set(z * 0.55, 0, -x * 0.55);
    part(g, ROD, gold, x * 5.6, 0.12, z * 5.6, 0.9, 0.24, 0.9);
  }
  part(g, ROD, grey, 1.6, 8.6, -1, 0.06, 2, 0.06);
  part(g, BOWL, lambert(0xe6e8ec, { side: THREE.DoubleSide }), 1.6, 10.6, -1, 1.2, 1.2, 1.2);
  part(g, ROD, grey, 8, 2.2, 3, 0.07, 4.4, 0.07);          // the flag: stiffened along its top, no wind to fly it
  part(g, BOX, lambert(0x3a6fd0), 9.1, 3.8, 3, 2.2, 1.3, 0.05);
  return g;
};

// a six-wheeled rover, its dish and its mast camera, and an astronaut standing by it waving
export const makeRover = () => {
  const g = new THREE.Group();
  const white = lambert(0xe6e8ec), dark = lambert(0x33353a), gold = lambert(0xd9a52a), visor = lambert(0xe0a030);
  part(g, BOX, white, 0, 1.7, 0, 2.6, 0.9, 4.6);
  part(g, BOX, gold, 0, 2.4, -0.6, 2.2, 0.6, 2.4);
  for (const x of [-1.6, 1.6]) for (const z of [-1.9, 0, 1.9]) part(g, ROD, dark, x, 0.75, z, 0.75, 0.6, 0.75).rotation.z = Math.PI / 2;
  part(g, ROD, dark, 0.8, 3.6, 1.6, 0.07, 2, 0.07);
  part(g, BOX, dark, 0.8, 4.7, 1.7, 0.6, 0.4, 0.5);
  part(g, BOWL, lambert(0xe6e8ec, { side: THREE.DoubleSide }), -0.7, 4.3, -1.2, 1, 1, 1);
  const man = new THREE.Group();
  part(man, BOX, white, 0, 1.25, 0, 0.8, 1.1, 0.5);
  part(man, BOX, white, 0, 1.3, -0.4, 0.7, 0.9, 0.35); // the pack on its back
  part(man, BALL, white, 0, 2.2, 0, 0.42, 0.42, 0.42);
  part(man, BALL, visor, 0, 2.2, 0.2, 0.3, 0.28, 0.3);
  for (const x of [-0.22, 0.22]) part(man, BOX, white, x, 0.35, 0, 0.3, 0.7, 0.36);
  part(man, BOX, white, -0.55, 1.3, 0, 0.24, 0.9, 0.26);
  const arm = new THREE.Group();
  part(arm, BOX, white, 0, 0.45, 0, 0.24, 0.9, 0.26);
  arm.position.set(0.55, 1.7, 0);
  man.add(arm);
  man.position.set(3.6, 0, 1);
  g.add(man);
  g.userData.animate = (t) => { arm.rotation.z = -0.5 + Math.sin(t * 4) * 0.35; man.position.y = Math.max(0, Math.sin(t * 1.1)) * 0.5; }; // (a slow hop: a sixth of the gravity)
  return g;
};

// a rocket standing on its pad beside its gantry, a red lamp winking at the gantry's top
export const makeRocket = () => {
  const g = new THREE.Group();
  const white = lambert(0xeceef2), red = lambert(0xc93a2f), grey = lambert(0x6f737b), dark = lambert(0x2f3136);
  part(g, ROD, grey, 0, 0.5, 0, 12, 1, 12);
  part(g, ROD, white, 0, 16, 0, 2.6, 28, 2.6);
  part(g, ROD, red, 0, 21, 0, 2.66, 1.6, 2.66);
  part(g, ROD, dark, 0, 9, 0, 2.66, 0.8, 2.66);
  part(g, CONE, red, 0, 33.5, 0, 2.6, 7, 2.6);
  part(g, CONE, dark, 0, 1.8, 0, 2.2, 2, 2.2);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; part(g, BOX, red, Math.cos(a) * 3.2, 4, Math.sin(a) * 3.2, 0.3, 6, 3).rotation.y = -a + Math.PI / 2; }
  for (const [x, z] of [[6, 5], [8.4, 5], [6, 7.4], [8.4, 7.4]]) part(g, ROD, grey, x, 15, z, 0.16, 30, 0.16);
  for (let y = 4; y <= 28; y += 6) part(g, BOX, grey, 7.2, y, 6.2, 2.8, 0.2, 2.8);
  part(g, BOX, grey, 4.4, 24, 3.6, 0.4, 0.4, 6).rotation.y = 0.9; // the arm across to it
  const lamp = part(g, BALL, glow(0xff3a2a), 7.2, 30.6, 6.2, 0.5, 0.5, 0.5);
  g.userData.animate = (t) => { lamp.visible = t % 1.4 < 0.7; };
  return g;
};

// a greenhouse: a glass dome on a ring, rows of green under it, lit from inside
export const makeGreenhouse = (r = 10) => {
  const g = new THREE.Group();
  part(g, ROD, lambert(0x8d9098), 0, 0.5, 0, r + 0.6, 1, r + 0.6);
  part(g, ROD, lambert(0x5a4a3a), 0, 1.05, 0, r - 0.6, 0.1, r - 0.6);
  for (let k = -3; k <= 3; k++) { const l = Math.sqrt(1 - (k / 4) ** 2) * (r - 1.2) * 2; part(g, BOX, lambert(0x3f9a4a), k * (r / 4.4), 1.9, 0, 1.3, 1.7, l); }
  part(g, DOME, new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.28, depthWrite: false }), 0, 1, 0, r, r * 0.8, r);
  for (let k = 0; k < 6; k++) { const rib = part(g, new THREE.TorusGeometry(1, 0.02, 5, 18, Math.PI), lambert(0xdfe2e8), 0, 1, 0, r, r * 0.8, r); rib.rotation.y = k / 6 * Math.PI; }
  part(g, BALL, glow(0xfff2c0), 0, r * 0.62, 0, 0.6, 0.6, 0.6);
  return g;
};

// the Earth, for the sky: blue, with land and cloud on it, a little under half of it in shadow. (Unlit and out of
// the fog: it is placed far off and kept there by whoever makes it.)
export const makeEarth = (r = 60) => {
  const g = new THREE.Group();
  const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, fog: false, depthWrite: false, ...extra });
  part(g, BALL, basic(0x2f6fd6), 0, 0, 0, r, r, r);
  const land = basic(0x4f9a52), cloud = basic(0xf2f6fa);
  for (const [a, b, sx, sy] of [[0.3, 0.3, 0.42, 0.3], [-0.5, -0.1, 0.3, 0.42], [0.9, -0.4, 0.26, 0.2], [-0.1, 0.75, 0.3, 0.14], [0.2, -0.85, 0.4, 0.1]]) {
    const m = part(g, BALL, land, Math.sin(a) * Math.cos(b) * r * 0.86, Math.sin(b) * r * 0.86, Math.cos(a) * Math.cos(b) * r * 0.86, r * sx, r * sy, r * 0.16);
    m.lookAt(0, 0, 0);
  }
  for (const [a, b, sx, sy] of [[0, 0.5, 0.5, 0.07], [0.6, 0.05, 0.36, 0.06], [-0.4, -0.4, 0.46, 0.07], [-0.8, 0.35, 0.3, 0.05], [0.4, -0.6, 0.3, 0.05]]) {
    const m = part(g, BALL, cloud, Math.sin(a) * Math.cos(b) * r * 0.9, Math.sin(b) * r * 0.9, Math.cos(a) * Math.cos(b) * r * 0.9, r * sx, r * sy, r * 0.13);
    m.lookAt(0, 0, 0);
  }
  // (the night side: a dark half-shell over it)
  const shade = part(g, new THREE.SphereGeometry(1, 24, 14, 0, Math.PI), basic(0x04050a, { transparent: true, opacity: 0.9 }), 0, 0, 0, r * 1.03, r * 1.03, r * 1.03);
  shade.rotation.y = 2.2;
  let order = -2.9; // (drawn in this order, behind everything: none of it writes depth)
  g.traverse((o) => { o.renderOrder = (order += 0.01); o.frustumCulled = false; });
  return g;
};
