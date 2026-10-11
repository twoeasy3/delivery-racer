// ---- UFO AIR STRIKE: the flying saucer's visit (the timeline and the damage: ../ufostrike.js) ----
// It swoops in from high up ahead, hovers above and a little ahead of the player's car with a
// beam shining down on it, then shoots off the way it came.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { UfoStrike } from '../ufostrike.js';
import { scene } from './scene.js';
import { ufoMesh } from './cars.js';

const saucer = ufoMesh.clone(true);
saucer.scale.setScalar(1.8);
saucer.visible = false;
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3.2, 1, 24, 1, true), new THREE.MeshBasicMaterial({
  color: 0x7fe8ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending }));
beam.visible = false;
scene.add(saucer, beam);

const over = new THREE.Vector3(), away = new THREE.Vector3(), car = new THREE.Vector3(), down = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export const syncUfoStrike = (dt) => {
  const U = CONFIG.ufoStrike, phase = UfoStrike.phase, t = UfoStrike.t;
  saucer.visible = !!phase;
  beam.visible = phase === 'hover';
  if (!phase) return;
  // over the car, and a point far ahead and high above it that the saucer comes from and goes back to
  const h = Track.toWorld(Player.s, Player.lat, car);
  over.set(car.x + Math.sin(h) * U.ahead, car.y + U.height, car.z + Math.cos(h) * U.ahead);
  away.set(over.x + Math.sin(h) * 140, over.y + 70, over.z + Math.cos(h) * 140);
  if (phase === 'arrive') saucer.position.lerpVectors(away, over, ease(t / U.arrive));
  else if (phase === 'leave') saucer.position.lerpVectors(over, away, ease(t / U.leave));
  else saucer.position.set(over.x, over.y + Math.sin(t * 3) * 0.3, over.z);
  saucer.rotation.y += dt * 2.5;
  if (beam.visible) { // slanting down from the saucer onto the car
    down.subVectors(car, saucer.position);
    beam.scale.y = down.length();
    beam.position.copy(saucer.position).addScaledVector(down, 0.5);
    beam.quaternion.setFromUnitVectors(UP, down.normalize().negate()); // (the cone's wide end at the car)
  }
};
