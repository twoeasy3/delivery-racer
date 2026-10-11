// ---- MACHINERY: the construction site's machines (their movement and the knocks: ../machinery.js) ----
// A yellow bulldozer with its blade, an excavator with its arm and bucket, an orange dump truck,
// each on the road crossing it, turned the way it is going, its tracks or wheels turning; its
// warning beacon flashing. Also the mud a car throws up, driving through it.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Machinery } from '../machinery.js';
import { scene, tmp } from './scene.js';
import { Particles, rnd } from './effects.js';
import { makeMachine, add, BEACON_ON, BEACON_OFF } from './machineModels.js';


const group = new THREE.Group();
scene.add(group);
let meshes = [];
Game.onLoad.push(() => {
  group.clear();
  meshes = (LEVEL.machinery || []).map(m => {
    const mesh = makeMachine(m.kind);
    group.add(mesh);
    return mesh;
  });
});

export const syncMachinery = (now) => {
  meshes.forEach((mesh, i) => {
    const m = Machinery.list[i];
    mesh.visible = !!m && !m.gone;
    if (!mesh.visible) return;
    const heading = Track.toWorld(m.s, m.lat, tmp);
    mesh.position.copy(tmp);
    // (facing the way it is going: across the road; along its shoulder; or a forklift, its forks to the
    // fence, backing out onto the shoulder and driving off it)
    mesh.rotation.y = m.mode === 'along' ? heading + (m.dir > 0 ? 0 : Math.PI)
      : m.mode === 'poke' ? heading - m.side * Math.PI / 2
      : heading + (m.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    mesh.userData.beacon.material = Math.floor(now / 250 + i) % 2 ? BEACON_ON : BEACON_OFF;
    if (mesh.userData.boom) mesh.userData.boom.rotation.x = -0.6 + 0.2 * Math.sin(now / 700 + i);
    if (m.rest <= 0 && Math.random() < 0.15) { // (a puff of exhaust as it works)
      Particles.emit(tmp.x + rnd(1), tmp.y + 4.5, tmp.z + rnd(1), rnd(0.5), 2, rnd(0.5), 1, 0.4, 1.5, 0, 0x3a3a3a, tmp.y);
    }
  });
  // mud thrown up from the player's wheels, driving through it
  if (Player.active && Track.muddy(Player.s) && Player.speed > 4 && Math.random() < 0.8) {
    const h = Track.toWorld(Player.s - Player.hl, Player.lat + rnd(Player.hw), tmp);
    const back = -Math.min(1, Player.speed / 20) * 4;
    Particles.emit(tmp.x, tmp.y + 0.3, tmp.z, Math.sin(h) * back + rnd(1.5), 2 + Math.random() * 3, Math.cos(h) * back + rnd(1.5),
      0.6 + Math.random() * 0.4, 0.2 + Math.random() * 0.2, 0, 15, Math.random() < 0.5 ? 0x5a4128 : 0x6e5232, tmp.y);
  }
};
