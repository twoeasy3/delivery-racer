// ---- REVERSIBLE LANES: the overhead signs (the flipping, and the traffic down the lane: ../traffic.js) ----
// Along each reversible stretch, gantries over the road every so often: a beam on two posts, and over the
// reversible lane a sign, a green arrow pointing down the lane while it is the player's, a red cross once
// it has flipped to oncoming. The sign flips with the lane.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Traffic } from '../traffic.js';
import { Game } from '../game.js';
import { scene, tmp } from './scene.js';

const group = new THREE.Group();
scene.add(group);
let signs = []; // { mesh, r }

const face = (draw) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#111';
  g.fillRect(0, 0, 128, 128);
  draw(g);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) });
};
let ARROW = null, CROSS = null;
const materials = () => {
  if (ARROW) return;
  ARROW = face((g) => { // a green arrow pointing down
    g.fillStyle = '#2ecc40';
    g.fillRect(52, 18, 24, 56);
    g.beginPath(); g.moveTo(24, 70); g.lineTo(104, 70); g.lineTo(64, 112); g.closePath(); g.fill();
  });
  CROSS = face((g) => { // a red cross
    g.strokeStyle = '#ff3b30';
    g.lineWidth = 18;
    g.beginPath(); g.moveTo(24, 24); g.lineTo(104, 104); g.moveTo(104, 24); g.lineTo(24, 104); g.stroke();
  });
};

const build = () => {
  for (const o of group.children) o.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  group.clear();
  signs = [];
  if (!(LEVEL.reversible || []).length) return;
  materials();
  const steel = new THREE.MeshLambertMaterial({ color: 0x5a5f67 });
  const R = CONFIG.reversible;
  LEVEL.reversible.forEach((r, i) => {
    for (let s = r.from; s <= r.to; s += R.signEvery) {
      const lo = Track.lo(s) - 0.6, hi = Track.hi(s) + 0.6, h = Track.toWorld(s, (lo + hi) / 2, tmp);
      const gantry = new THREE.Group();
      gantry.position.copy(tmp);
      gantry.rotation.y = h;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(hi - lo + 0.5, 0.4, 0.4), steel);
      beam.position.y = 6.4;
      gantry.add(beam);
      for (const x of [lo, hi]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.6, 0.4), steel);
        post.position.set(x - (lo + hi) / 2, 3.3, 0);
        gantry.add(post);
      }
      // (the sign hangs under the beam over the lane, facing back down the road at the player)
      const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.12), [steel, steel, steel, steel, steel, ARROW]);
      sign.position.set(Track.laneOffset(r.lane, s) - (lo + hi) / 2, 5.3, 0);
      sign.rotation.y = Math.PI;
      gantry.add(sign);
      group.add(gantry);
      signs.push({ mesh: sign, i });
    }
  });
};
Game.onLoad.push(build);

export const syncReversible = () => {
  if (!signs.length) return;
  for (const { mesh, i } of signs) {
    const r = Traffic.reversibles[i];
    const want = r && r.flipped ? CROSS : ARROW;
    if (mesh.material[5] !== want) mesh.material[5] = want;
  }
};
