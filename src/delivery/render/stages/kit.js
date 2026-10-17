// ---- a kit for the car stages' own props (render/carstage.js merges them into ONE mesh, their colours into its vertices):
// unit shapes shared by every file, and piece() to stand one, scaled, turned, in a colour. Nothing here is drawn as it is
import * as THREE from 'three';

export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);  // (upright, 1 m across and high)
export const HEX = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);   // (a basalt column, a post)
export const BALL = new THREE.IcosahedronGeometry(0.5, 1);
export const ROCK = new THREE.IcosahedronGeometry(0.5, 0);
const mats = new Map();
const mat = (color) => { if (!mats.has(color)) mats.set(color, new THREE.MeshLambertMaterial({ color })); return mats.get(color); };
// piece(group, shape, colour, x, y, z, sx, sy, sz, rx, ry, rz): a mesh of that shape, its middle at (x, y, z)
export const piece = (group, geometry, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geometry, mat(color));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  group.add(m);
  return m;
};
export const group = () => new THREE.Group();
