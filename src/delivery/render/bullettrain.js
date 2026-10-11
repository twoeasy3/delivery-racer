// ---- BULLET TRAIN: the train itself (its movement and the damage: ../bullettrain.js) -------------
// White carriages with a blue stripe and a dark band of windows, a long duck-billed nose at
// each end, the front one lit. Each carriage sits on the road where it is, so the train bends
// round curves and follows its lane where the road narrows.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { BulletTrain } from '../bullettrain.js';
import { scene, tmp } from './scene.js';
import { makeCarriage } from './trainModel.js';

const T = CONFIG.bulletTrain;
// the front carriage, the middle ones, and the back one (its nose facing the other way)
const carriages = Array.from({ length: T.cars }, (_, i) => makeCarriage(i === 0 || i === T.cars - 1, i === 0));
for (const c of carriages) { c.visible = false; scene.add(c); }
const at = { s: 0, lat: 0 };

export const syncBulletTrain = () => {
  carriages.forEach((carriage, i) => {
    carriage.visible = BulletTrain.active;
    if (!carriage.visible) return;
    BulletTrain.carriage(i, at);
    // southbound: turned round from the road's own heading, except the last carriage, whose nose points back
    carriage.rotation.y = Track.toWorld(at.s, at.lat, tmp) + (i === T.cars - 1 ? 0 : Math.PI);
    carriage.position.copy(tmp);
    carriage.rotation.x = Math.atan(Track.grade(at.s)) * (i === T.cars - 1 ? -1 : 1); // tilt with the slope
  });
};
