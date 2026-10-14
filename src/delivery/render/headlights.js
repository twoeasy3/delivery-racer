// ---- headlights, on night levels only ------------------------------------------------------
// The player's are two spotlights that ride on the car. They are always in the scene and only
// switched on and off with the level (adding or removing a light makes three.js rebuild every
// lit material); a car that isn't there turns them down.
// Traffic can't each have real lights (there are too many), so every traffic vehicle carries a
// beam instead: a soft glow laid on the road ahead of it, added to whatever is underneath.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { scene } from './scene.js';
import { carMesh, trafficMeshes } from './cars.js';
import { CAR } from '../cars.js';
import { NightLamps, lampLayout, lampKey } from './carlights.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';

const H = CONFIG.headlights;
const lamps = [-1, 1].map((side) => {
  const light = new THREE.SpotLight(H.color, 0, H.range, H.angle, H.penumbra, H.decay);
  light.visible = false;
  scene.add(light, light.target);
  return { light, side };
});
const at = new THREE.Vector3();

// the traffic's beams: one flat quad on each traffic mesh, holding an oval pool of light that
// is brightest a little ahead of the nose and fades to nothing before every edge
const B = CONFIG.trafficBeam;
const beamTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const R = 160; // (the top of the picture is the end at the car)
  g.translate(64, 96);
  g.scale(62 / R, 1);
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, R);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.45, 'rgba(255,255,255,0.5)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(-R, -96, 2 * R, 256);
  return new THREE.CanvasTexture(canvas);
})();
const beamGeometry = new THREE.PlaneGeometry(B.width, B.length).rotateX(-Math.PI / 2); // (flat, the top end behind)
const beamMaterial = new THREE.MeshBasicMaterial({ map: beamTexture, color: B.color, transparent: true,
  opacity: B.strength, blending: THREE.AdditiveBlending, depthWrite: false });
const beams = trafficMeshes.map((mesh) => {
  const beam = new THREE.Mesh(beamGeometry, beamMaterial);
  beam.visible = false;
  mesh.add(beam);
  return beam;
});
let beamsOn = false;

// on for a night level, off for any other (see buildRoad)
export const setHeadlights = (on) => {
  for (const { light } of lamps) light.visible = on;
  beamsOn = on;
  NightLamps.on = on; // (and the headlamps' glow on the cars render/carlights.js lists: render/cars.js syncLamps)
  for (const beam of beams) beam.visible = on;
};
// every frame, after syncTraffic: each beam just ahead of its own vehicle's nose
export const syncTrafficBeams = () => {
  if (!beamsOn) return;
  for (let i = 0; i < beams.length; i++) {
    const car = Traffic.cars[i], own = CONFIG.vehicles[car.kind]?.model, beam = own && lampLayout(own)?.beam; // (from a listed car's own headlamps)
    beams[i].position.set(0, 0.08, (beam ? beam.z : car.hl) + B.length / 2);
    beams[i].visible = !Traffic.cars[i].toad; // (toads have no headlights)
  }
};
// every frame, once the car has been put where it is
export const syncHeadlights = () => {
  if (!lamps[0].light.visible) return;
  carMesh.updateMatrixWorld();
  // (a car render/carlights.js lists: from its own headlamps, how far apart and how far forward; the height stays
  // CONFIG's, a little above real lamps, so the light reaches on down the road)
  const beam = Player.tank > 0 || CAR.ufo ? null : lampLayout(lampKey(CAR))?.beam;
  const spread = beam ? beam.spread : H.spread, z = beam ? beam.z : Player.hl;
  for (const { light, side } of lamps) {
    light.intensity = carMesh.visible ? H.intensity : 0; // (no car: the screensaver, or being carried off)
    // (in the scene's own terms: the car's matrix, not its world one, which a mirrored level reverses)
    light.position.copy(at.set(side * spread, H.height, z).applyMatrix4(carMesh.matrix));
    light.target.position.copy(at.set(side * spread, 0, z + H.aim).applyMatrix4(carMesh.matrix));
  }
};
