// ---- RADIATION, drawn (what it does: ../radiation.js; the models: radiationModels.js) ----
// A radiated area: a green haze lying on its lanes (three sheets, the lowest the densest, so it reads as a volume
// from the chase camera), hard bright edges down both sides, yellow-and-black hazard bands across each end with a
// trefoil post at each corner, and a warning board on the way in. An infected car: a green shell of light round
// it, a trefoil floating over it and its ring on the road (the edge of what it doses); all of it throbbing. The
// player's picture goes green at the edges while a dose is being taken (the deeper the fuller the meter), and
// throbs faintly for the rest of the run once infected.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';
import { Radiation } from '../radiation.js';
import { scene, tmp } from './scene.js';
import { trafficMeshes, carMesh } from './cars.js';
import { buildStrip } from './road.js';
import { RAD, makeRadiationBoard, makeTrefoilPlate, makeInfection, hazardStripes } from './radiationModels.js';

const group = new THREE.Group();
scene.add(group);
// a group set down on the road at (s, lat), facing along it (its local +z the player's way, +x to the left)
const at = (s, lat, y = 0) => {
  const g = new THREE.Group();
  g.rotation.y = Track.toWorld(s, lat, tmp);
  g.position.set(tmp.x, tmp.y + y, tmp.z);
  group.add(g);
  return g;
};
const sheet = (opacity, offset = -2) => new THREE.MeshBasicMaterial({ color: RAD.haze, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset });
const EDGE = new THREE.MeshBasicMaterial({ color: RAD.edge, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const PUDDLE = new THREE.MeshBasicMaterial({ color: RAD.puddle, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
const steel = new THREE.MeshLambertMaterial({ color: 0x8a9096 });
// a trefoil plate on a short post, for an area's corners
const makeMarker = () => {
  const g = new THREE.Group(), post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), steel);
  post.position.y = 1.1;
  const plate = makeTrefoilPlate(1.1);
  plate.position.y = 2.6;
  g.add(post, plate);
  return g;
};
let hazes = [];     // the haze sheets, for the throb
let bands = [];     // the hazard bands' maps, for the crawl

Game.onLoad.push(() => {
  group.clear();
  hazes = [];
  bands = [];
  const R = CONFIG.radiation;
  let seed = 7 + Radiation.areas.length * 131;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const a of Radiation.areas) {
    const lo = (s) => Radiation.span(a, s)[0], hi = (s) => Radiation.span(a, s)[1];
    // the haze: three sheets, the lowest the densest
    for (const [y, opacity] of [[0.03, 0.34], [0.9, 0.09], [1.9, 0.05]]) {
      const mesh = new THREE.Mesh(buildStrip(a.from, a.to, lo, hi, y, 3), sheet(opacity, y < 0.1 ? -2 : 0));
      mesh.userData.base = opacity;
      group.add(mesh);
      hazes.push(mesh);
    }
    // the hard edges down both sides
    for (const edge of [lo, hi]) group.add(new THREE.Mesh(buildStrip(a.from, a.to, (s) => edge(s) - 0.15, (s) => edge(s) + 0.15, 0.04, 3), EDGE));
    // puddles of the brightest green, here and there in it
    for (let s = a.from + 8 + rand() * 20; s < a.to - 6; s += 18 + rand() * 30) {
      const [l, h] = Radiation.span(a, s), lat = l + 1 + rand() * Math.max(0.5, h - l - 2), r = 0.6 + rand() * 0.8;
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(r, 16), PUDDLE);
      puddle.rotation.x = -Math.PI / 2;
      at(s, lat, 0.05).add(puddle);
    }
    // the hazard bands across each end, and a trefoil post at each corner
    for (const s of [a.from, a.to]) {
      const [l, h] = Radiation.span(a, s), w = h - l, map = hazardStripes().clone();
      map.needsUpdate = true;
      map.repeat.set(w / 1.6, 1);
      const band = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.4), new THREE.MeshBasicMaterial({ map, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      band.rotation.x = -Math.PI / 2;
      at(s, (l + h) / 2, 0.045).add(band);
      bands.push(map);
      for (const lat of [l + 0.4, h - 0.4]) at(s, lat).add(makeMarker());
    }
    // the warning board, on the right of the road on the way in (what it says: the whole road, or which lanes)
    const s = a.from - R.sign;
    if (s > 5) {
      const lanes = a.lanes ? (a.lanes[0] === a.lanes[1] ? 'ONE LANE' : 'SOME LANES') : 'ALL LANES';
      const bypass = !a.lanes && Track.exits.some(x => x.exitAt > s && x.exitAt < a.from && x.mergeAt > a.to); // (a side road round it, leaving between the board and the green)
      const text = 'RADIATION ' + Math.round(a.to - a.from) + ' m\n' + lanes + (a.lanes ? ': KEEP OUT OF THE GREEN' : bypass ? ': EXIT, OR ARMOUR' : ': ARMOUR OR RUN IT');
      const board = makeRadiationBoard(text, 6.8, 2.4);
      board.userData.words.scale.x = Track.mirrored ? -1 : 1; // (mirrored back on a left-hand level, so it still reads)
      at(s, Track.hi(s) - 0.6).add(board);
    }
  }
});

// ---- the infected cars: a model a traffic slot, built the first time its car is seen infected (and again if the
// slot has been dealt another kind of vehicle since), shown only while that car is active and infected
const auras = [];
const auraGroup = new THREE.Group();
scene.add(auraGroup);
const auraFor = (i, car) => {
  let a = auras[i];
  if (a && a.userData.kind !== car.kind) { auraGroup.remove(a); a = null; }
  if (!a) {
    a = makeInfection(car.hw, car.hl, car.height, CONFIG.radiation.radius);
    a.userData.kind = car.kind;
    auraGroup.add(a);
    auras[i] = a;
  }
  return a;
};

// ---- the player's own: an infected player's car wears the same shell, trefoil and ring as an infected car, built
// once for the car's size (and again for another car), dimmed while the shield keeps the radiation out
let playerAura = null, playerKey = '';
const playerGlow = (t, show) => {
  const P = Player, key = [P.hw, P.hl, P.height].join('/');
  if (playerAura && key !== playerKey) { auraGroup.remove(playerAura); playerAura = null; }
  if (!playerAura && show) {
    playerAura = makeInfection(P.hw, P.hl, P.height, CONFIG.radiation.radius);
    playerKey = key;
    auraGroup.add(playerAura);
  }
  if (!playerAura) return;
  playerAura.visible = show;
  if (!show) return;
  playerAura.position.copy(carMesh.position);
  playerAura.rotation.y = carMesh.rotation.y;
  playerAura.userData.body.rotation.x = carMesh.rotation.x;
  playerAura.userData.pulse(t, Radiation.kept ? 0.4 : 1);
};

// ---- the veil over the picture: a green vignette, under the HUD, with a clear middle round the car
const veil = document.createElement('div');
veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:0;background:radial-gradient(ellipse 72% 64% at 50% 62%, rgba(125,255,42,0) 48%, rgba(125,255,42,.62) 100%)';
document.getElementById('game')?.insertAdjacentElement('afterend', veil);
let veilNow = 0;

export const syncRadiation = (now, dt) => {
  const t = now / 1000;
  if (!Radiation.on) {
    if (veilNow > 0) { veilNow = 0; veil.style.opacity = '0'; }
    for (const a of auras) if (a) a.visible = false;
    playerGlow(t, false);
    return;
  }
  // the haze breathes, the bands crawl
  const beat = 0.5 + 0.5 * Math.sin(t * 1.7);
  for (const h of hazes) h.material.opacity = h.userData.base * (0.8 + 0.3 * beat);
  for (const map of bands) map.offset.x = (t * 0.25) % 1;
  // the infected cars
  for (let i = 0; i < Traffic.cars.length; i++) {
    const car = Traffic.cars[i];
    if (!car.active || !car.infected) { if (auras[i]) auras[i].visible = false; continue; }
    const a = auraFor(i, car), mesh = trafficMeshes[i];
    a.visible = true;
    a.position.copy(mesh.position);
    a.rotation.y = mesh.rotation.y;
    a.userData.body.rotation.x = mesh.rotation.x;
    a.userData.pulse(t + i * 0.7);
  }
  // the player's car, once infected (not in the garage, a cinematic's still or a fly-through: wherever the car is not drawn)
  playerGlow(t, Radiation.infected && Player.active && Game.state === 'playing' && !Game.screensaver && carMesh.visible);
  // the veil: deeper the fuller the meter while a dose is being taken; a slow throb once infected; nothing under the shield
  const playing = Game.state === 'playing' && Player.active && !Game.screensaver;
  const target = !playing ? 0 : Radiation.source && !Radiation.kept ? 0.3 + 0.45 * Radiation.meter : Radiation.infected && !Radiation.kept ? 0.2 + 0.1 * Math.sin(t * 2.2) : 0;
  veilNow += (target - veilNow) * Math.min(1, dt * (target > veilNow ? 4 : 2));
  veil.style.opacity = (Game.paused ? 0 : veilNow).toFixed(3);
};
