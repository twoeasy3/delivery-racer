// ---- THE SIDE RING (IDEAS-good-evil-11-Oct.md idea 1; CHECKLIST 500): a decal on the road under a car that says its side by SHAPE:
// a thin warm-white full ring for Good, two short dull-red arcs (horns) at the front for Evil, so it reads on any paint.
// Built like the traffic beams (render/headlights.js): flat unlit quads, NOT lights (a light makes three.js rebuild every lit
// material). The halo is ADDED to what is underneath, as the beams are; the horns are laid OVER it (normal blending), since red
// added to a warm road (sand, dirt, brick) is lost: an unlit dull red reads on a pale road and, unlit, at night too. Two
// InstancedMeshes in all (ring, horns), shared by the player's car and the traffic: at most two draw calls, none while the
// settings are off. Nothing is allocated per frame. Render only: no rule of a run reads it.
// THE SETTINGS (Options): 'Side ring' (the player's car) and 'Traffic rings' (every traffic car, by its own side), both OFF by
// default, kept in this browser's localStorage (never the save). ?ring=on / all (player and traffic) / off: for the visit only.
import * as THREE from 'three';
import { scene } from './scene.js';
import { carMesh, trafficMeshes } from './cars.js';
import { NightLamps } from './carlights.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';
import { Track } from '../track.js';
import { CONFIG } from '../config.js';
import { playerDraft, trafficDraft } from './water.js';

const R = {
  good: 0xfff0c8, evil: 0xa81c0c, // (warm white, added; a dull red, laid over)
  margin: 0.75,   // m beyond the car's hitbox on each side
  player: 0.7, traffic: 0.45, night: 0.6, // (the halo's strength: the player's, a traffic car's; at night, by this much less)
  horns: 0.85, hornsTraffic: 0.75,        // (the horns' shade: laid over, so a lower one is darker, not fainter)
  y: 0.07,        // m above the road (under the traffic beams' 0.08)
  airFade: 1.5,   // m in the air at which it has gone (it stays on the road: the car leaves it)
  // afloat (render/water.js sinks a car by its draft and bobs it): lifted by the draft, and the swell, to lie on the water
};

// ---- the settings ----
const KEY = 'delivery_sidering', TKEY = 'delivery_trafficrings';
const read = (k) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };
const write = (k, on) => { try { if (on) localStorage.setItem(k, '1'); else localStorage.removeItem(k); } catch { /* (no storage: for this visit) */ } };
const param = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('ring') : null;
export const SideRing = {
  player: param === 'on' || param === 'all' ? true : param === 'off' ? false : read(KEY),
  traffic: param === 'all' ? true : param === 'off' || param === 'on' ? false : read(TKEY),
};

// ---- the two shapes (128 x 128 canvases, 64 KB each; the quad's front, +z, is the bottom of the picture) ----
const texture = (draw) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  g.lineCap = 'round';
  g.strokeStyle = g.shadowColor = '#fff';
  g.shadowBlur = 6;
  draw(g);
  const map = new THREE.CanvasTexture(canvas);
  map.anisotropy = 4; // (it is seen at a slant)
  return map;
};
const SHAPES = [ // [draw, blending]
  [(g) => { g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 54, 0, 2 * Math.PI); g.stroke(); }, THREE.AdditiveBlending], // Good: the halo
  [(g) => { // Evil: two horns, off the nose to either side, thicker
    g.lineWidth = 9;
    for (const side of [-1, 1]) { const mid = Math.PI / 2 + side * 0.85; g.beginPath(); g.arc(64, 64, 52, mid - 0.5, mid + 0.5); g.stroke(); }
  }, THREE.NormalBlending],
];
let meshes = null; // (made the first time either setting is on)
const MAX = 1 + trafficMeshes.length;
const make = () => {
  const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  meshes = SHAPES.map(([draw, blending]) => {
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ map: texture(draw), transparent: true,
      blending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), MAX);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, new THREE.Color()); // (makes the instance colours: each one's side and strength)
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false; // (its instances move: a bounding sphere would go stale)
    mesh.renderOrder = 7; // (after render/water.js's sheets, quays and foam, 4 to 6: on the water, not under it)
    mesh.count = 0;
    mesh.visible = false;
    mesh.userData.sideRing = true;
    scene.add(mesh); // (in the scene's own terms, as the cars are: a mirrored level mirrors it with them)
    return mesh;
  });
};

const afloat = (s, draft) => { const d = Track.water(s); return d > 0 ? d * draft + CONFIG.water.bob.height : 0; };
const place = new THREE.Matrix4(), local = new THREE.Matrix4(), tint = new THREE.Color(), side = [new THREE.Color(R.good), new THREE.Color(R.evil)];
const put = (owner, hw, hl, evil, traffic, fade, rise) => {
  if (fade <= 0.01) return;
  const strength = fade * (evil ? (traffic ? R.hornsTraffic : R.horns) : (traffic ? R.traffic : R.player) * (NightLamps.on ? R.night : 1));
  const mesh = meshes[evil ? 1 : 0], k = mesh.count++;
  owner.updateMatrix();
  local.makeScale(2 * (hw + R.margin), 1, 2 * (hl + R.margin)).setPosition(0, R.y + rise, 0);
  mesh.setMatrixAt(k, place.multiplyMatrices(owner.matrix, local));
  mesh.setColorAt(k, tint.copy(side[evil ? 1 : 0]).multiplyScalar(strength));
};

// every frame, once the car and the traffic are placed (and floated, and shaken)
export const syncSideRing = () => {
  if (!meshes) { if (!SideRing.player && !SideRing.traffic) return; make(); }
  meshes[0].count = meshes[1].count = 0;
  if (SideRing.player && carMesh.visible && carMesh.parent) {
    const air = Math.max(0, Player.air);
    put(carMesh, Player.hw, Player.hl, Player.evil, false, Math.max(0, 1 - air / R.airFade), afloat(Player.s, playerDraft()) - air);
  }
  if (SideRing.traffic) {
    for (let i = 0; i < trafficMeshes.length; i++) {
      const car = Traffic.cars[i], mesh = trafficMeshes[i];
      if (!car.active || !mesh.visible || car.toad || car.parked) continue; // (a toad has no side; a parked car has no driver)
      put(mesh, car.hw, car.hl, car.evil, true, 1, car.junction ? 0 : afloat(car.s, trafficDraft(car.kind)));
    }
  }
  for (const mesh of meshes) {
    mesh.visible = mesh.count > 0;
    if (mesh.visible) { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; }
  }
};

// ---- the settings' buttons (Options > Settings) ----
if (typeof document !== 'undefined') {
  const button = (id, label, key, what) => {
    const b = document.getElementById(id);
    if (!b) return;
    const show = () => { b.textContent = label + ': ' + (SideRing[what] ? 'on' : 'off'); };
    b.addEventListener('click', () => { SideRing[what] = !SideRing[what]; write(key, SideRing[what]); show(); });
    show();
  };
  button('ringBtn', 'Side ring', KEY, 'player');
  button('trafficRingBtn', 'Traffic rings', TKEY, 'traffic');
}
