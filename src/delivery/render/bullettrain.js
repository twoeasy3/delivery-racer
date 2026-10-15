// ---- BULLET TRAIN: the train itself (its movement and the damage: ../bullettrain.js) -------------
// White carriages with a blue stripe and a dark band of windows, a long duck-billed nose at
// each end, the front one lit. Each carriage sits on the road where it is, so the train bends
// round curves and follows its lane where the road narrows. Each train its own carriages: the one
// coming down the road (always made), and an edge railway's overtaking one (UpTrain: made the
// first time it runs, so no other level pays for it)
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { TRAINS } from '../bullettrain.js';
import { scene, tmp } from './scene.js';
import { makeCarriage } from './trainModel.js';

const T = CONFIG.bulletTrain;
// the front carriage, the middle ones, and the back one (its nose facing the other way)
const makeSet = () => {
  const set = Array.from({ length: T.cars }, (_, i) => makeCarriage(i === 0 || i === T.cars - 1, i === 0));
  for (const c of set) { c.visible = false; scene.add(c); }
  return set;
};
const sets = [makeSet()];
const at = { s: 0, lat: 0 };

export const syncBulletTrain = () => {
  TRAINS.forEach((train, k) => {
    if (!sets[k]) { if (!train.active) return; sets[k] = makeSet(); }
    // coming down the road: turned round from the road's own heading; going up it: the road's heading (each but the last
    // carriage, whose nose points back)
    const turn = train.up ? 0 : Math.PI, tilt = train.up ? -1 : 1;
    sets[k].forEach((carriage, i) => {
      carriage.visible = train.active;
      if (!carriage.visible) return;
      train.carriage(i, at);
      const last = i === T.cars - 1;
      carriage.rotation.y = Track.toWorld(at.s, at.lat, tmp) + turn + (last ? Math.PI : 0);
      carriage.position.copy(tmp);
      carriage.rotation.x = Math.atan(Track.grade(at.s)) * tilt * (last ? -1 : 1); // tilt with the slope
    });
  });
};
