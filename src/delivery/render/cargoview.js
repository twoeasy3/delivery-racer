// ---- the cargo's round window: how the HUD's corner draws it, for whoever else draws it ------------------
// The HUD's corner (render/cargo.js: a round window under the TANK RAGE corner) shows the item in a little
// scene of its own: the same two lights as every card, a turntable turning at CONFIG.consignment.corner.spin,
// a camera at corner.fov framed on what the item takes up (played through a few seconds in each state), a dark
// glass behind it, a white rim. The framing, the lights and the camera's place are here, so the menu's level
// card (render/menustage.js) shows the item in the very same window: cargoCircleView is that scene as a card
// view for render/modelviews.js (drawn by the menu's shared renderer into a small canvas: no WebGL context of
// its own). The glass and the rim are the stylesheet's there (menu2.css .cargo3d), as cargohud.css's here.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { makeCargoModel } from './cargoModels.js';

const C = CONFIG.consignment;

// what the item takes up in each state, played through a few seconds, so a calm one is not lost in the room a
// furious one needs: [{ mid, radius }] by state (a state it has not got is the calm one's)
export const cornerFrames = (model) => {
  const frames = [0, 1, 2].map((state) => {
    if (state && !model.userData.setState) return null;
    model.userData.setState?.(state, true);
    const bounds = new THREE.Box3();
    for (let t = 0; t < 5; t += 0.31) { model.userData.animate(t); model.updateMatrixWorld(true); bounds.union(new THREE.Box3().setFromObject(model)); }
    const size = bounds.getSize(new THREE.Vector3());
    return { mid: bounds.getCenter(new THREE.Vector3()).y, radius: Math.max(size.x, size.y, size.z) * 0.56 };
  });
  model.userData.setState?.(0, true);
  return frames.map(f => f || frames[0]);
};
// the corner's lights
export const addCornerLights = (scene) => {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 6, 5);
  scene.add(sun);
};
// the camera, back far enough for the frame, a little above, looking at the middle of it
export const placeCornerCamera = (camera, frame) => {
  const far = frame.radius / Math.sin(THREE.MathUtils.degToRad(C.corner.fov / 2));
  camera.position.set(0, frame.mid + far * 0.3, far * 0.95);
  camera.lookAt(0, frame.mid, 0);
};

// The item in that window, calm, as a card view ({ scene, camera, step, stand }: modelviews.js drawViews). Its
// own model, built here (the HUD's are its own: nothing is shared with a run). spin: turning at the corner's
// speed; otherwise it stands at a three-quarter angle, and is drawn once. A model that cannot be built is the
// plain box makeCargoModel gives (an id nobody has drawn): this does not throw for an id
export const cargoCircleView = (id, { spin = true, angle = 0.7 } = {}) => {
  const scene = new THREE.Scene();
  addCornerLights(scene);
  const model = makeCargoModel(id);
  const frame = cornerFrames(model)[0]; // (calm: the state the card shows)
  const turn = new THREE.Group();
  turn.rotation.y = angle;
  turn.add(model);
  scene.add(turn);
  const camera = new THREE.PerspectiveCamera(C.corner.fov, 1, 0.1, 60);
  placeCornerCamera(camera, frame);
  const phase = Math.random() * 6;
  if (!spin) model.userData.animate?.(2.4 + phase);
  return { scene, camera, step(t, dt) {
    if (!spin) return;
    turn.rotation.y += dt * C.corner.spin;
    model.userData.animate?.(t + phase);
  }, stand(to) { if (spin) turn.rotation.y = to; } }; // (standing still: see modelviews.js STILL)
};
