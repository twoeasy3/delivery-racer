// ---- THE BATTLEFIELD's pillbox model (no game state, nothing added to a scene): built here so the game
// (render/battle.js) and the gimmicks page can both use it
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const CONCRETE = lambert(0x9a978e), SLIT = lambert(0x141414), BAGS = lambert(0xb8a676), POLE = lambert(0x5a554c);
const TEAM = { 1: lambert(CONFIG.battle.colors.good.apc), [-1]: lambert(CONFIG.battle.colors.evil.apc) };
const add = (group, geometry, material, x, y, z) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};

// a pillbox of an army (team: 1 the green, -1 the red), its slit facing local +z (towards the road).
// userData.flag: its flag, to flap
export const makePillbox = (team) => {
  const group = new THREE.Group();
  add(group, new THREE.CylinderGeometry(2.2, 2.5, 1.9, 6), CONCRETE, 0, 0.95, 0);
  add(group, new THREE.CylinderGeometry(2.28, 2.28, 0.35, 6), TEAM[team], 0, 1.55, 0);   // its army's band
  add(group, new THREE.CylinderGeometry(1.9, 2.2, 0.3, 6), CONCRETE, 0, 2.02, 0);       // the roof
  add(group, new THREE.BoxGeometry(1.6, 0.28, 0.6), SLIT, 0, 1.15, 1.95);               // the firing slit
  for (const x of [-1.6, 1.6]) add(group, new THREE.BoxGeometry(1.3, 0.7, 0.9), BAGS, x, 0.35, 2.1); // sandbags
  add(group, new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), POLE, -0.9, 3.3, -0.6);     // the flagpole...
  const flag = add(group, new THREE.BoxGeometry(0.04, 0.6, 1.0), TEAM[team], -0.9, 4.15, -0.08); // ...and flag
  group.userData.flag = flag;
  group.scale.setScalar(CONFIG.battle.pillboxScale);
  return group;
};
