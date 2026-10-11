// ---- ELEPHANTS: elephants plodding across the road (their movement and the damage: ../elephants.js) --
// A big grey elephant: a barrel of a body on four pillar legs, great flapping ears, a swinging
// trunk and tusks. Also the dust the migration's herd kicks up as it streams across the road.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Collision } from '../collision.js';
import { Elephants } from '../elephants.js';
import { scene, tmp } from './scene.js';
import { Particles, rnd } from './effects.js';
import { makeElephant, add } from './elephantModel.js';


const group = new THREE.Group();
scene.add(group);
let meshes = [];
Game.onLoad.push(() => {
  group.clear();
  const count = (LEVEL.elephants || []).reduce((sum, z) => sum + (z.count || 1), 0);
  meshes = [];
  for (let i = 0; i < count; i++) {
    const mesh = makeElephant();
    group.add(mesh);
    meshes.push(mesh);
  }
});

export const syncElephants = (now) => {
  meshes.forEach((mesh, i) => {
    const e = Elephants.list[i];
    mesh.visible = !!e;
    if (!e) return;
    const heading = Track.toWorld(e.s, e.lat, tmp);
    mesh.position.copy(tmp);
    mesh.rotation.y = heading + (e.dir > 0 ? -Math.PI / 2 : Math.PI / 2); // (facing the way it is walking, across the road)
    const walking = e.rest <= 0, t = now / 1000 + i;
    const { ears, trunk, tip, legs } = mesh.userData;
    legs.forEach((leg, k) => { leg.rotation.x = walking ? Math.sin(e.legs * 1.6 + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * 0.35 : 0; });
    ears.forEach((ear, k) => { ear.rotation.y = (k ? -1 : 1) * (0.25 + 0.25 * Math.sin(t * 2.2)); });
    trunk.rotation.x = 0.15 + 0.15 * Math.sin(t * 1.3);
    tip.rotation.x = 0.3 + 0.25 * Math.sin(t * 1.3 + 0.8);
  });
  // the migration's dust: kicked up by the herd near the player as it streams across
  for (const o of Collision.obstacles) {
    if (!o.migrate || o.gone || Math.abs(o.s - Player.s) > 250 || Math.random() > 0.08) continue;
    Track.toWorld(o.s, o.lat, tmp);
    Particles.emit(tmp.x + rnd(1), tmp.y + 0.3, tmp.z + rnd(1), rnd(1.5), 0.8 + Math.random() * 1.5, rnd(1.5),
      1.2 + Math.random() * 0.8, 0.8 + Math.random() * 0.6, 2.5, 0.5, 0xc4a77a, tmp.y);
  }
};
