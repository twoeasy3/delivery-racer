// ---- headlights, on night levels only ------------------------------------------------------
// The player's are two spotlights that ride on the car. They are always in the scene AND always visible,
// only turned up and down (intensity 0 when off): a hidden light is not counted, so hiding or showing one
// changes the light count and three.js rebuilds every lit material (the blackout's freeze, CHECKLIST 495;
// a tunnel's portal too). A car that isn't there turns them down.
// Traffic can't each have real lights (there are too many), so every traffic vehicle carries a
// beam instead: a soft glow laid on the road ahead of it, added to whatever is underneath.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { scene, renderer, camera } from './scene.js';
import { carMesh, trafficMeshes } from './cars.js';
import { CAR } from '../cars.js';
import { NightLamps, lampLayout, lampKey } from './carlights.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';

const H = CONFIG.headlights;
const lamps = [-1, 1].map((side) => {
  const light = new THREE.SpotLight(H.color, 0, H.range, H.angle, H.penumbra, H.decay); // (visible, at 0: see above)
  scene.add(light, light.target);
  return { light, side };
});
const at = new THREE.Vector3();
let lampsOn = false;

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
// the beams' shader compiled AND drawn once, at the first level's build: one beam, alone in the main scene (its lights and fog,
// so the very program the beams will use; everything else hidden for that draw), into one pixel of the canvas, not cleared.
// Not on the frame a blackout, a night or a tunnel first shows them (CHECKLIST 495: three.js's compile() alone leaves the
// program's link, and the driver's own work, to the first draw)
let beamsWarm = false;
const warmBeams = () => {
  beamsWarm = true;
  const beam = new THREE.Mesh(beamGeometry, beamMaterial), hidden = scene.children.filter(o => o.visible && !o.isLight);
  beam.frustumCulled = false; // (drawn wherever the camera is)
  let put = null;
  try {
    const view = renderer.getViewport(new THREE.Vector4()), cut = renderer.getScissor(new THREE.Vector4());
    const cutOn = renderer.getScissorTest(), clear = renderer.autoClear, target = renderer.getRenderTarget();
    put = () => {
      renderer.setScissorTest(cutOn);
      renderer.setScissor(cut);
      renderer.setViewport(view);
      renderer.autoClear = clear;
      renderer.setRenderTarget(target);
    };
    for (const o of hidden) o.visible = false;
    scene.add(beam);
    renderer.setRenderTarget(null);
    renderer.autoClear = false;
    renderer.setViewport(0, 0, 1, 1);
    renderer.setScissor(0, 0, 1, 1);
    renderer.setScissorTest(true);
    renderer.render(scene, camera);
  } catch { /* (compiled on first sight instead) */ } finally {
    scene.remove(beam);
    for (const o of hidden) o.visible = true;
    try { put?.(); } catch { /* (a stand-in renderer) */ }
  }
};

// on for a night level, off for any other (see buildRoad)
export const setHeadlights = (on) => {
  if (!beamsWarm) warmBeams();
  lampsOn = on;
  if (!on) for (const { light } of lamps) light.intensity = 0; // (never .visible: see above)
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
  if (!lampsOn) return;
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
