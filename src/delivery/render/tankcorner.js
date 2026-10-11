// ---- the TANK RAGE corner: a little tank turning in the top corner of the screen ----------------
// It starts out a pale ghost; each TANK RAGE piece found (Game.tankPieces) turns its part of
// the tank solid, in the order they are found, and the fifth starts TANK RAGE. It has a
// canvas and a renderer of its own, so it never touches the main scene. On an amphibious level it is the
// Amphibious Tank that is pieced together (cars.js AMPHIBIOUS_TANK: that level's TANK RAGE is in it), in the
// same five pieces.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { makeTankMesh } from './cars.js';
import { LEVEL } from '../levels.js';
import { AMPHIBIOUS_TANK, rageTankFor } from '../cars.js';
import { makeAmphibiousTankMesh } from './tankModels.js';
import { PIXEL_RATIO } from './scene.js';

const canvas = document.getElementById('tankCorner');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(PIXEL_RATIO);
renderer.setSize(canvas.clientWidth || 120, canvas.clientHeight || 84, false);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(3, 6, 4);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(32, (canvas.clientWidth || 120) / (canvas.clientHeight || 84), 0.1, 50);
camera.position.set(0, 4.2, 9.5);
camera.lookAt(0, 0.9, 0);

const tank = makeTankMesh(0x4b5a2a);
tank.userData.body.material.color.setHex(0x4b5a2a);
scene.add(tank);
const ghost = new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.2, depthWrite: false });
const amphibian = makeAmphibiousTankMesh(AMPHIBIOUS_TANK.color);
amphibian.scale.setScalar(0.82); // (it is the longer of the two)
amphibian.position.z = -0.4;
const turn = new THREE.Group(); // (so it turns about its middle)
turn.add(amphibian);
scene.add(turn);
for (const model of [tank, amphibian]) for (const list of model.userData.pieces) for (const mesh of list) mesh.userData.solid = mesh.material;

let shownPieces = -1, shown = null;
export const syncTankCorner = (dt) => {
  const show = Game.state === 'playing' && !Game.screensaver;
  canvas.style.display = show ? 'block' : 'none';
  if (!show) return;
  // (a tank in TANK RAGE, the garage's included, is all there)
  const have = Player.tank > 0 ? CONFIG.tankPieces : Game.tankPieces;
  const model = rageTankFor(LEVEL) ? amphibian : tank;
  tank.visible = model === tank;
  turn.visible = model === amphibian;
  if (have !== shownPieces || model !== shown) {
    shownPieces = have;
    shown = model;
    amphibian.userData.livery(Player.evil);
    amphibian.userData.body.userData.solid.color.setHex(Player.evil ? AMPHIBIOUS_TANK.evilColor : AMPHIBIOUS_TANK.color);
    model.userData.pieces.forEach((list, i) => { for (const mesh of list) mesh.material = i < have ? mesh.userData.solid : ghost; });
  }
  tank.rotation.y += dt * 0.9;
  turn.rotation.y = tank.rotation.y;
  renderer.render(scene, camera);
};
