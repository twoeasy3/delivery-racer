// ---- THE BATTLEFIELD's pillboxes (their shooting: ../gunfire.js; the armies are traffic: render/cars.js) ----
// Each a squat six-sided concrete bunker beside the road (the model: render/battleModels.js), a band of its
// army's colour round it (green, the player's; red, the enemy's), its firing slit to the road, its army's
// flag flapping on top.
import * as THREE from 'three';
import { Track } from '../track.js';
import { Gunfire } from '../gunfire.js';
import { scene, tmp } from './scene.js';
import { makePillbox } from './battleModels.js';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { FxQueue } from '../physics.js';
import { Sound } from './audio.js';

const group = new THREE.Group();
scene.add(group);
let built = null, meshes = [];

export const syncBattle = (dt) => {
  syncStrikes(dt);
  // (the pillboxes are set out as a run starts: see Gunfire.reset)
  if (built !== Gunfire.pillboxes) {
    group.clear();
    built = Gunfire.pillboxes;
    meshes = built.map(box => {
      const mesh = makePillbox(box.team);
      const h = Track.toWorld(box.s, box.lat, tmp);
      mesh.position.copy(tmp);
      mesh.rotation.y = h + (box.side < 0 ? Math.PI / 2 : -Math.PI / 2); // (its slit to the road)
      group.add(mesh);
      return mesh;
    });
  }
  const t = performance.now() / 1000;
  meshes.forEach((mesh, i) => { mesh.userData.flag.rotation.y = Math.sin(t * 3 + i) * 0.3; }); // (flapping)
};

// ---- airstrikes: only a sight (CONFIG.battle.airstrike) -------------------------------------------------
// A pair of jets comes over from behind the player, low and fast, down one side of the road, and drops a
// stick of bombs that walk across the fields there, well clear of the road: big blasts that shake the
// camera, and harm nobody.

const lambertJet = (color) => new THREE.MeshLambertMaterial({ color });
// a jet, nose to local +z: a slim fuselage, swept wings, a tail fin and a glowing exhaust
const makeJet = () => {
  const jet = new THREE.Group(), grey = lambertJet(0x5c636b), dark = lambertJet(0x2b2f35);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 11, 10).rotateX(Math.PI / 2), grey);
  jet.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3, 10).rotateX(Math.PI / 2), grey);
  nose.position.z = 7;
  jet.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lambertJet(0x1d2a38));
  canopy.scale.set(1, 0.8, 2.4);
  canopy.position.set(0, 0.45, 3);
  jet.add(canopy);
  const wing = new THREE.Shape([new THREE.Vector2(0, 2.5), new THREE.Vector2(7, -1.5), new THREE.Vector2(7, -2.6), new THREE.Vector2(0, -2.2)]);
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.ExtrudeGeometry(wing, { depth: 0.15, bevelEnabled: false }).rotateX(Math.PI / 2), grey);
    w.scale.x = side;
    w.position.y = -0.1;
    jet.add(w);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.4), dark);
    tail.position.set(side * 1.3, 0, -4.8);
    jet.add(tail);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 1.8), dark);
  fin.position.set(0, 1.2, -4.6);
  jet.add(fin);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffb04a }));
  flame.position.z = -6.6;
  jet.add(flame);
  return jet;
};
const jets = [makeJet(), makeJet()];
for (const jet of jets) { jet.visible = false; scene.add(jet); }
const bombGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8).rotateX(Math.PI / 2), bombMat = lambertJet(0x2b2f35);
const bombs = []; // { mesh, s, lat, y, vs, vy }
let strike = null, nextStrike = 4;
const between = (r) => r.min + Math.random() * (r.max - r.min);

// a strike sets off: the jets from far behind the player, down one side; the bombs fall along the way
const startStrike = () => {
  const A = CONFIG.battle.airstrike, side = Math.random() < 0.5 ? -1 : 1;
  const count = Math.round(between(A.bombs));
  strike = { side, s: Player.s - A.from, lat: (side < 0 ? Track.lo(Player.s) : Track.hi(Player.s)) + side * (A.out + A.spread * 0.4), drops: [] };
  // where each bomb lands: across the fields on that side, walking on down the road ahead of the player
  for (let k = 0; k < count; k++) {
    const at = Player.s + 40 + k * (A.to - 40) / count + Math.random() * 15;
    strike.drops.push({ at, lat: (side < 0 ? Track.lo(at) : Track.hi(at)) + side * (A.out + Math.random() * A.spread), dropped: false });
  }
  Sound.play('jet', 0.9);
};
const syncStrikes = (dt) => {
  const A = CONFIG.battle.airstrike;
  const live = LEVEL.battle && Game.state === 'playing' && !Game.paused && !Game.screensaver;
  if (live && !strike && (nextStrike -= dt) <= 0) {
    startStrike();
    nextStrike = between(A.every);
  }
  if (strike && !Game.paused) {
    strike.s += A.speed * dt;
    // each bomb is let go far enough ahead of where it lands to fall there (it keeps a little of the jet's pace)
    const fall = Math.sqrt(2 * A.height / 9.8), carry = A.speed * 0.35 * fall;
    for (const d of strike.drops) {
      if (d.dropped || strike.s < d.at - carry) continue;
      d.dropped = true;
      const mesh = new THREE.Mesh(bombGeo, bombMat);
      scene.add(mesh);
      bombs.push({ mesh, s: strike.s, lat: strike.lat + (d.lat - strike.lat) * 0.3, landLat: d.lat, y: A.height - 1.5, vs: A.speed * 0.35, vy: 0, t: 0, fall });
    }
    if (strike.s > Player.s + A.to + 300) strike = null;
  }
  jets.forEach((jet, k) => {
    jet.visible = !!strike;
    if (!strike) return;
    // (the wingman a little behind and further out)
    const s = strike.s - k * 14, lat = strike.lat + strike.side * k * 9;
    const h = Track.toWorld(s, lat, tmp);
    jet.position.set(tmp.x, tmp.y + A.height + k * 2, tmp.z);
    jet.rotation.set(0, h, strike.side * 0.12);
  });
  for (const b of bombs) {
    b.t += dt;
    b.vy -= 9.8 * dt;
    b.y += b.vy * dt;
    b.s += b.vs * dt;
    b.lat += (b.landLat - b.lat) * Math.min(1, dt * 2 / b.fall);
    const h = Track.toWorld(b.s, b.lat, tmp);
    b.mesh.position.set(tmp.x, tmp.y + Math.max(0, b.y), tmp.z);
    b.mesh.rotation.set(Math.min(1.2, b.t * 0.8), h, 0); // (nosing over as it falls)
    if (b.y <= 0) {
      FxQueue.push({ type: 'explode', s: b.s, lat: b.lat, vs: 0, big: true, scale: 1.8, smoke: 1.6 });
      scene.remove(b.mesh);
      b.done = true;
    }
  }
  for (let i = bombs.length - 1; i >= 0; i--) if (bombs[i].done) bombs.splice(i, 1);
};
Game.onLoad.push(() => {
  strike = null;
  nextStrike = 4;
  for (const b of bombs) scene.remove(b.mesh);
  bombs.length = 0;
});
