// ---- The favela's models (see favela.js): no game state, so the gimmicks page can show them too. Each faces local +z.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BOX = new THREE.BoxGeometry(1, 1, 1), BALL = new THREE.SphereGeometry(0.5, 12, 9), ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);

// a cable car's cabin, hung from its cable by an arm (the cable is at the model's own height, y = 0): rounded, glazed
// all round, in the line's colour
export const makeGondola = (color = 0xd8342c) => {
  const g = new THREE.Group();
  const paint = lambert(color), steel = lambert(0x8d9098);
  part(g, BOX, steel, 0, -0.1, 0, 0.5, 0.3, 1.1);   // the grip on the cable
  part(g, BOX, steel, 0, -1.2, 0, 0.14, 2.2, 0.14); // the arm
  part(g, BOX, paint, 0, -2.5, 0, 2.3, 0.3, 2.9);
  part(g, BOX, lambert(0x9fd0e6), 0, -3.3, 0, 2.2, 1.3, 2.8);
  part(g, BOX, paint, 0, -4.4, 0, 2.3, 1, 2.9);
  for (const x of [-1.12, 1.12]) for (const z of [-1.42, 1.42]) part(g, BOX, paint, x, -3.3, z, 0.12, 1.3, 0.12);
  return g;
};

// a five-a-side goal: white posts and a bar, a net sloping back
export const makeGoal = () => {
  const g = new THREE.Group();
  const white = lambert(0xf4f4f4);
  for (const x of [-2, 2]) part(g, ROD, white, x, 1.1, 0, 0.14, 2.2, 0.14);
  part(g, BOX, white, 0, 2.2, 0, 4.14, 0.14, 0.14);
  const net = part(g, BOX, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }), 0, 1.1, -0.7, 4, 2.4, 0.04);
  net.rotation.x = 0.55;
  return g;
};

// the statue on the peak: a pale figure on a plinth, its arms held straight out
export const makeStatue = (h = 30) => {
  const g = new THREE.Group();
  const stone = lambert(0xece8dc);
  part(g, BOX, lambert(0x9a958a), 0, h * 0.1, 0, h * 0.2, h * 0.2, h * 0.2);
  part(g, BOX, stone, 0, h * 0.5, 0, h * 0.16, h * 0.6, h * 0.12);
  part(g, BOX, stone, 0, h * 0.72, 0, h * 0.9, h * 0.07, h * 0.08);
  part(g, BALL, stone, 0, h * 0.86, 0, h * 0.13, h * 0.14, h * 0.13);
  return g;
};
