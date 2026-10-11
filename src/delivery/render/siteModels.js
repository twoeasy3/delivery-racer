// ---- THE SITE'S WORKERS AND ITS LONG-REACH EXCAVATOR (see site.js) ----
// The models alone (no game state, nothing added to a scene): built here so the game and the menu's pages
// (see ../gimmicks.js) can both use them. Each faces local +z, its feet on y = 0.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const add = (group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const YELLOW = lambert(0xf2b51c), DARK = lambert(0x2a2a2a), GLASS = lambert(0x2f4a58), STEEL = lambert(0x7d838a), CONCRETE = lambert(0xb5b0a6);
const HIVIS = lambert(0xff8a1a), SKIN = lambert(0xe0b48c), HAT = lambert(0xf6e12a), TROUSERS = lambert(0x2c3440);
// a long-reach excavator, its arm along local +z, its bucket CONFIG.site.reach out, low down
export const makeDigger = () => {
  const g = new THREE.Group(), R = CONFIG.site.reach;
  for (const side of [-1, 1]) add(g, box(0.9, 1.0, 4.4), DARK, side * 1.3, 0.5, 0);
  add(g, box(2.8, 1.3, 3.4), YELLOW, 0, 1.65, -0.4);
  add(g, box(1.3, 1.6, 1.4), GLASS, -0.7, 3.1, 0.4);
  add(g, box(2.6, 1.0, 1.0), STEEL, 0, 1.9, -2.3);
  const boomLen = Math.hypot(R * 0.6, 3), stickLen = Math.hypot(R * 0.4, 4);
  add(g, box(0.55, 0.55, boomLen), YELLOW, 0.6, 2.4 + 1.5, R * 0.3, -Math.atan2(3, R * 0.6));          // boom, up and out
  add(g, box(0.45, 0.45, stickLen), YELLOW, 0.6, 5.4 - 2, R * 0.8, Math.atan2(4, R * 0.4));           // stick, down
  add(g, box(1.6, 1.0, 1.0), DARK, 0.6, 1.0, R);                                                        // bucket
  return g;
};
// a worker in hi-vis and a hard hat, facing local +z, feet on y = 0, arms out to push a barrow
export const makeWorker = () => {
  const g = new THREE.Group();
  add(g, box(0.22, 0.85, 0.22), TROUSERS, -0.13, 0.42, 0);
  add(g, box(0.22, 0.85, 0.22), TROUSERS, 0.13, 0.42, 0);
  add(g, box(0.55, 0.7, 0.32), HIVIS, 0, 1.2, 0);
  for (const side of [-1, 1]) add(g, box(0.14, 0.14, 0.6), HIVIS, side * 0.3, 1.25, 0.3);
  add(g, new THREE.SphereGeometry(0.16, 10, 8), SKIN, 0, 1.72, 0);
  add(g, new THREE.CylinderGeometry(0.2, 0.22, 0.12, 10), HAT, 0, 1.86, 0);
  return g;
};
