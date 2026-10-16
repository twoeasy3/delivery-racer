import * as THREE from 'three';
import { Track } from '../track.js';
import { Packages } from '../packages.js';
import { scene, tmp } from './scene.js';
import { unitBox } from './cars.js';
import { Particles, KillFx } from './effects.js';
import { classicTrail } from './particles.js';
import { chosenKill } from './killfx.js';
import { Player } from '../player.js';
import { CAR } from '../cars.js';

// ---- packages: plain boxes for the player's gifts, flaming ones from evil cars, cannon shells ----
const PACKAGE_LOOK = { gift: [0xc8955a, 0.7], fire: [0xff9d2e, 0.7], bomb: [0xff9d2e, 0.7], shell: [0x1c1c1c, 0.45] };
const packageMeshes = Packages.list.map(() => {
  const mesh = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color: 0xc8955a }));
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
});
const CLASSIC = { Particles };
export const syncPackages = (dt) => {
  for (let i = 0; i < Packages.list.length; i++) {
    const p = Packages.list[i], mesh = packageMeshes[i];
    mesh.visible = p.active;
    if (!p.active) continue;
    const [color, size] = PACKAGE_LOOK[p.kind];
    mesh.material.color.setHex(color);
    mesh.scale.setScalar(size);
    if (p.from) { // a cannon shell: a straight line between muzzle and landing spot
      const u = Math.min(1, p.t / p.flight);
      tmp.x = p.from.x + (p.to.x - p.from.x) * u;
      tmp.y = p.from.y + (p.to.y - p.from.y) * u;
      tmp.z = p.from.z + (p.to.z - p.from.z) * u;
    } else {
      Track.toWorld(p.s, p.lat, tmp); // everything else follows the road
    }
    mesh.position.set(tmp.x, tmp.y + p.h, tmp.z);
    mesh.rotation.x += dt * 9;
    mesh.rotation.z += dt * 6;
    // the TRAIL: the player's own packages (gifts, flaming ones, the 8x8's shells) leave the bits of the player's KILL EFFECT
    // (render/killfx.js; render-only); in Classic, and on everybody else's (an evil car's bombs, an army's shells), the flames as always
    // (a Classic gift leaves none)
    const look = p.owner === Player ? chosenKill(CAR.id) : 'classic';
    if (look !== 'classic' && KillFx.trail(look, tmp.x, tmp.y + p.h, tmp.z, tmp.y)) continue;
    if (p.kind === 'gift') continue;
    classicTrail(CLASSIC, tmp.x, tmp.y + p.h, tmp.z); // (flame trail)
  }
};
