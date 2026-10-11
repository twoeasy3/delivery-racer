// ---- HIPPOS: the hippos charging out of the river (their movement and the damage: ../hippos.js) ----
// A big grey-pink barrel of a hippo on stumpy legs, its jaws thrown wide as it charges. Surfacing
// it throws up a splash of water; charging over dry ground it kicks up dust.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Hippos } from '../hippos.js';
import { scene, tmp } from './scene.js';
import { Particles, rnd } from './effects.js';
import { makeHippo, add } from './hippoModel.js';


const pool = [];
for (let i = 0; i < CONFIG.hippo.most; i++) {
  const hippo = makeHippo();
  hippo.visible = false;
  scene.add(hippo);
  pool.push(hippo);
}
const splashed = new Set(); // the hippos (by id) that have made their splash
export const syncHippos = () => {
  pool.forEach((mesh, i) => {
    const h = Hippos.list[i];
    mesh.visible = !!h;
    if (!h) return;
    const heading = Track.toWorld(h.s, h.lat, tmp);
    mesh.position.set(tmp.x, tmp.y + h.y, tmp.z);
    mesh.rotation.y = heading + Math.PI / 2; // (facing across the road, to its left)
    const charging = Hippos.charging(h);
    mesh.userData.jaw.rotation.x = charging ? 0.55 + 0.15 * Math.sin(h.t * 9) : 0.1;
    mesh.userData.legs.forEach((leg, k) => { leg.rotation.x = charging ? Math.sin(h.legs * 2.2 + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * 0.7 : 0; });
    // a splash as it comes up; dust (or spray, still in the water) as it charges
    if (!splashed.has(h.id)) {
      splashed.add(h.id);
      for (let k = 0; k < 40; k++) {
        Particles.emit(tmp.x + rnd(1.5), -0.05, tmp.z + rnd(1.5), rnd(3), 4 + Math.random() * 6, rnd(3),
          0.6 + Math.random() * 0.5, 0.25 + Math.random() * 0.3, 0, 18, Math.random() < 0.5 ? 0xffffff : 0x9fd0e0, -0.2);
      }
    }
    if (charging && Math.random() < 0.6) {
      const wet = h.lat > Track.hi(h.s) + CONFIG.hippo.bank;
      Particles.emit(tmp.x + rnd(1), h.y + 0.2, tmp.z + rnd(1), rnd(2), 1 + Math.random() * 2, rnd(2),
        0.5 + Math.random() * 0.4, wet ? 0.25 : 0.5, wet ? 0 : 1.5, wet ? 12 : 1, wet ? 0xe8f4f8 : 0xb8956a, tmp.y);
    }
  });
  if (!Hippos.list.length) splashed.clear();
};
