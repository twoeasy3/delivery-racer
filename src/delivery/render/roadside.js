// ---- ROADSIDE: the hidden gimmicks level's things that aren't obstacles (what they do: ../crossing.js,
// ../stopgo.js, ../site.js, ../cameras.js; the cameras, rocks and cyclists are drawn as obstacles) ----
// Level crossings: the line across the road, a crossbuck with two red lamps flashing in turn at each
// stop line, a red and white boom beside it swinging down across the lanes coming up to it, and the
// train. Stop / go roadworks: the oncoming lane dug up, spoil heaped beside it, and a worker at each
// end with a STOP / GO sign. Potholes. And the fog bank, closing in round the player (scene.fog).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { THEMES } from '../themes.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Crossings } from '../crossing.js';
import { StopGo } from '../stopgo.js';
import { Site } from '../site.js';
import { SpeedCameras } from '../cameras.js';
import { scene, camera, tmp, tmp2 } from './scene.js';
import { buildStrip } from './road.js';
import { makeCarriage } from './trainModel.js';
import { makeLocomotive, makeTender, makeBoxcar, makeCarriage as makeWestCarriage, makeCaboose } from './themes/wildwestModels.js';
import { makeWorker } from './siteModels.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const flat = (color, offset) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset });
const add = (group, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
// the world heading of the line from (s, lat0) to (s, lat1): a rotation.y that points local +z along it
const across = (s, lat0, lat1) => {
  Track.toWorld(s, lat0, tmp);
  Track.toWorld(s, lat1, tmp2);
  return Math.atan2(tmp2.x - tmp.x, tmp2.z - tmp.z);
};
// a word on a sign, white on a colour
const label = (text, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = color;
  g.beginPath();
  g.arc(64, 64, 62, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.font = 'bold 44px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 66);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
};
const STOP = label('STOP', '#d8262b'), GO = label('GO', '#2e9b3d');
const LAMP_ON = 0xff2a1a, LAMP_OFF = 0x3a1210;

const group = new THREE.Group();
scene.add(group);
let crossings = [], signs = [], cameraMarkers = [];

// downward-pointing 3D locator arrow over upcoming speed cameras
const makeCameraMarker = () => {
  const g = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 4), glow);
  head.rotation.x = Math.PI;
  head.position.y = 0.42;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.24), glow);
  shaft.position.y = 1.15;
  g.add(head, shaft);
  g.visible = false;
  g.userData.glow = glow;
  group.add(g);
  return g;
};

// a crossing's post at a stop line: a crossbuck over two lamps on a black board. Its lamps: [left, right]
const crossingPost = (s, lat, face) => {
  const post = new THREE.Group();
  const white = lambert(0xf4f4f4), black = lambert(0x1b1d22);
  add(post, new THREE.BoxGeometry(0.16, 3.6, 0.16), lambert(0x8a9096), 0, 1.8, 0);
  for (const r of [0.6, -0.6]) add(post, new THREE.BoxGeometry(1.5, 0.22, 0.06), white, 0, 3.3, 0).rotation.z = r;
  add(post, new THREE.BoxGeometry(1.2, 0.45, 0.08), black, 0, 2.5, 0);
  const lamps = [-0.35, 0.35].map(x => {
    const material = new THREE.MeshBasicMaterial({ color: LAMP_OFF });
    add(post, new THREE.CircleGeometry(0.17, 14), material, x, 2.5, 0.05);
    add(post, new THREE.CircleGeometry(0.17, 14), material, x, 2.5, -0.05).rotation.y = Math.PI;
    return material;
  });
  const h = Track.toWorld(s, lat, tmp);
  post.position.copy(tmp);
  post.rotation.y = h + face;
  group.add(post);
  return lamps;
};
// a boom: a pivot at the post, its arm (red and white) reaching across to the centre line when down
const crossingBoom = (s, lat) => {
  const pivot = new THREE.Group(), swing = new THREE.Group();
  const length = Math.abs(lat) + 0.3;
  for (let k = 0; k * 1 < length; k++) {
    const piece = Math.min(1, length - k);
    add(swing, new THREE.BoxGeometry(piece, 0.14, 0.14), lambert(k % 2 ? 0xf4f4f4 : 0xd8262b), k + piece / 2, 0, 0);
  }
  pivot.add(swing);
  Track.toWorld(s, lat, tmp);
  pivot.position.set(tmp.x, tmp.y + 1.1, tmp.z);
  // (its local +x towards the centre line)
  pivot.rotation.y = across(s, lat, 0) - Math.PI / 2;
  group.add(pivot);
  return swing;
};

Game.onLoad.push(() => {
  group.clear();
  crossings = [];
  signs = [];
  cameraMarkers = (LEVEL.cameras || []).map(() => makeCameraMarker());
  const C = CONFIG.crossing;
  for (const c of LEVEL.crossings || []) {
    const s = Track.place(c);
    // the line: ballast, sleepers and two rails, right across the road and out either side
    group.add(new THREE.Mesh(buildStrip(s - 1.5, s + 1.5, -C.reach, C.reach, 0.03, 1), flat(0x5b544c, -3)));
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.08, 0.25), lambert(0x4a3a2c), Math.floor(2 * C.reach / 0.7));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < sleepers.count; k++) {
      const lat = -C.reach + k * 0.7;
      const h = Track.toWorld(s, lat, tmp);
      m.compose(tmp.clone().setY(tmp.y + 0.06), q.setFromAxisAngle(up, h), new THREE.Vector3(1, 1, 1));
      sleepers.setMatrixAt(k, m);
    }
    group.add(sleepers);
    for (const off of [-0.75, 0.75]) {
      Track.toWorld(s + off, 0, tmp);
      const rail = add(group, new THREE.BoxGeometry(0.1, 0.14, 2 * C.reach), lambert(0x9aa0a6), tmp.x, tmp.y + 0.12, tmp.z);
      rail.rotation.y = across(s + off, -1, 1);
    }
    // the posts and booms at each stop line, on the right of the traffic coming up to it
    const ours = s - C.stopLine, theirs = s + C.stopLine;
    const lamps = [...crossingPost(ours, Track.hi(ours) - 0.6, 0), ...crossingPost(theirs, Track.lo(theirs) + 0.6, Math.PI)];
    const booms = [crossingBoom(ours, Track.laneHi(ours) + 0.4), crossingBoom(theirs, Track.laneLo(theirs) - 0.4)];
    // the train: short, its carriages the bullet train's, cut down; or the Wild West's steam train, the
    // locomotive leading, its pieces spaced out to the same length. Each piece: { model, at (m from the nose
    // to its middle), back (true: it faces the way it came) }
    const length = Crossings.trainLength, carriages = [];
    if (Crossings.model(c) === 'steam') {
      const pieces = [[makeLocomotive(), 9.6], [makeTender(), 5], [makeBoxcar(), 8.6], [makeWestCarriage(), 10.2], [makeWestCarriage(), 10.2], [makeCaboose(), 7.2]];
      const gap = (length - pieces.reduce((sum, [, l]) => sum + l, 0)) / (pieces.length - 1);
      let at = 0;
      for (const [model, l] of pieces) { carriages.push({ model, at: at + l / 2, back: false }); at += l + gap; }
    } else {
      const BT = CONFIG.bulletTrain;
      for (let i = 0; i < C.cars; i++) {
        const model = makeCarriage(i === 0 || i === C.cars - 1, i === 0);
        model.scale.set(C.hw / BT.hw, 1, C.carLength / BT.carLength);
        carriages.push({ model, at: (i + 0.5) * C.carLength, back: i === C.cars - 1 && i > 0 }); // (the last carriage's nose points back)
      }
    }
    for (const { model } of carriages) { model.visible = false; group.add(model); }
    crossings.push({ lamps, booms, carriages, steam: carriages[0].model.userData.animate });
  }
  // stop / go: the oncoming lane and its shoulder dug up, spoil beside them, and the workers with their signs
  for (const z of LEVEL.stopGo || []) {
    const from = Track.place({ s: z.from }), to = from + (z.to - z.from);
    group.add(new THREE.Mesh(buildStrip(from, to, (s) => Track.lo(s) + 0.2, -0.9, 0.02, 2), flat(0x3a2a1c, -3))); // (out to the road's edge, shoulder and all)
    for (let s = from + 6; s < to; s += 11) {
      const h = Track.toWorld(s, Track.lo(s) - 1.6, tmp);
      const heap = add(group, new THREE.ConeGeometry(1.3, 1.1, 7), lambert(0x6e5232), tmp.x, tmp.y + 0.5, tmp.z);
      heap.rotation.y = h;
    }
    const G = CONFIG.stopGo;
    for (const [s, lat, face] of [[from - StopGo.taper - G.stopLine, Track.hi(from) - 0.8, Math.PI], [to + StopGo.taper + G.stopLine, Track.lo(to) + 0.8, 0]]) {
      const worker = makeWorker(), h = Track.toWorld(s, lat, tmp);
      worker.position.copy(tmp);
      worker.rotation.y = h + face;
      // the sign: a pole in its hand, a round board on top, the word on both faces
      add(worker, new THREE.BoxGeometry(0.06, 1.9, 0.06), lambert(0x8a9096), 0.35, 1.6, 0.2);
      const front = add(worker, new THREE.CircleGeometry(0.62, 20), GO, 0.35, 2.85, 0.24);
      const back = add(worker, new THREE.CircleGeometry(0.62, 20), GO, 0.35, 2.85, 0.16);
      back.rotation.y = Math.PI;
      group.add(worker);
      signs.push({ index: (LEVEL.stopGo || []).indexOf(z), dir: face === Math.PI ? 1 : -1, faces: [front, back] }); // (the way of the traffic it faces)
    }
  }
  // potholes: a ragged hole, a ring of crumbling asphalt round it, cracks running off it and loose
  // chunks lying about (each its own shape: seeded by where it is)
  for (const h of LEVEL.potholes || []) {
    const s = Track.place(h), lat = Track.laneOffset(h.lane, s) + (h.off || 0), r = h.r || CONFIG.site.potholeR;
    let seed = Math.floor(s * 7 + h.lane * 131) % 2147483647 || 1;
    const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const ragged = (radius, wobble, points = 16) => { // a jagged outline, flat on the road (local x, z)
      const shape = new THREE.Shape();
      for (let k = 0; k <= points; k++) {
        const a = (k % points) / points * Math.PI * 2, d = radius * (1 - wobble + 2 * wobble * rand());
        if (k === 0) shape.moveTo(Math.cos(a) * d, Math.sin(a) * d * 0.8);
        else shape.lineTo(Math.cos(a) * d, Math.sin(a) * d * 0.8);
      }
      return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
    };
    const hole = new THREE.Group();
    add(hole, ragged(r * 1.45, 0.25), flat(0x4d4a46, -3), 0, 0.02, 0);   // the crumbling rim
    add(hole, ragged(r, 0.3), flat(0x15120f, -5), 0, 0.03, 0);           // the hole
    add(hole, ragged(r * 0.45, 0.35, 9), flat(0x2a2620, -6), r * 0.2 * (rand() - 0.5), 0.035, r * 0.2 * (rand() - 0.5)); // (rubble in the bottom)
    for (let k = 0, n = 3 + Math.floor(rand() * 3); k < n; k++) {        // cracks running off it
      const a = rand() * Math.PI * 2, length = r * (0.8 + rand() * 1.4);
      const crack = add(hole, new THREE.PlaneGeometry(0.06 + rand() * 0.04, length).rotateX(-Math.PI / 2), flat(0x1d1b19, -4),
        Math.cos(a) * (r * 1.2 + length / 2), 0.025, Math.sin(a) * (r * 1.2 + length / 2));
      crack.rotation.y = Math.PI / 2 - a + (rand() - 0.5) * 0.5;
    }
    for (let k = 0, n = 4 + Math.floor(rand() * 4); k < n; k++) {        // loose chunks of asphalt
      const a = rand() * Math.PI * 2, d = r * (1.2 + rand() * 0.9), size = 0.12 + rand() * 0.18;
      const chunk = add(hole, new THREE.BoxGeometry(size, size * 0.5, size * (0.7 + rand() * 0.6)), lambert(0x3a3b3f), Math.cos(a) * d, size * 0.25, Math.sin(a) * d);
      chunk.rotation.set(rand() * 0.4, rand() * 3, rand() * 0.4);
    }
    hole.rotation.y = Track.toWorld(s, lat, tmp);
    hole.position.copy(tmp);
    group.add(hole);
  }

});

// the fog bank: the scene's fog drawn in from its usual distances (and its colour towards the fog's) by
// how deep in one the player is. The fog's colour is the theme's: under a bright sky the usual pale grey
// (CONFIG.fog.color), under a dark one that grey in the little light there is, so mostly the sky's own colour
// (night: a dark blue-grey; the volcano going up: a red-brown murk; the sea bed: silt), the one running into
// the other between CONFIG.fog.dark and .bright; or the colour the theme names (its "fogColor")
const USUAL = { near: 120, far: 520 };
const usualColor = new THREE.Color(), fogColor = new THREE.Color(CONFIG.fog.color);
const fogColorOf = (theme) => {
  if (theme.fogColor !== undefined) return theme.fogColor;
  const F = CONFIG.fog, parts = (hex) => [hex >> 16 & 255, hex >> 8 & 255, hex & 255];
  const sky = parts(theme.sky ?? 0x87ceeb), grey = parts(F.color);
  const light = (0.299 * sky[0] + 0.587 * sky[1] + 0.114 * sky[2]) / 255; // (how bright the sky is, 0 .. 1)
  const u = Math.min(1, Math.max(0, (light - F.dark) / (F.bright - F.dark))), share = F.lit + (1 - F.lit) * u * u * (3 - 2 * u);
  return sky.reduce((hex, part, i) => hex * 256 + Math.round(part + (grey[i] - part) * share), 0);
};
let fogged = 0, fogFresh = true; // (fogFresh: a level just loaded, nothing of it drawn yet)
const flashEl = document.getElementById('cameraFlash');

export const syncRoadside = (dt) => {
  const t = performance.now() / 1000;
  Crossings.list.forEach((c, k) => {
    const mesh = crossings[k];
    if (!mesh) return;
    const on = Crossings.flashing(c), phase = Math.floor(t * 2.5) % 2;
    mesh.lamps.forEach((lamp, i) => lamp.color.setHex(on && i % 2 === phase ? LAMP_ON : LAMP_OFF));
    const down = Crossings.lowered(c);
    mesh.booms.forEach((boom, i) => {
      boom.visible = !c.broken[i];
      boom.rotation.z = (1 - down) * Math.PI / 2 * 0.95;
    });
    for (const { model, at, back } of mesh.carriages) {
      model.visible = c.state === 'train';
      if (!model.visible) continue;
      const lat = c.train - c.dir * at; // (each piece so far behind the nose)
      Track.toWorld(c.s, lat, tmp);
      model.position.copy(tmp);
      // (nose first the way it is going; the bullet train's last carriage's nose points back)
      model.rotation.y = across(c.s, lat, lat + c.dir) + (back ? Math.PI : 0);
    }
    if (c.state === 'train' && mesh.steam) mesh.steam(t); // (the locomotive's smoke)
  });
  for (const sign of signs) {
    const z = StopGo.list[sign.index];
    if (!z) continue;
    const material = StopGo.go(z, sign.dir) ? GO : STOP;
    for (const face of sign.faces) face.material = material;
  }
  // the fog bank (the sky goes grey with it; out of it, the sky is whatever the level makes it)
  if (Game.state !== 'start') {
    const want = Track.foggy(Player.s);
    if (fogFresh) { fogged = want; fogFresh = false; } // (a run that starts inside a bank, ?at= in the address, is in the fog at once: it did not drive into it)
    if (!fogged && !want) {
      usualColor.copy(scene.background);
    } else {
      fogged += (want - fogged) * Math.min(1, dt * 2);
      if (fogged < 0.002 && !want) fogged = 0;
      const F = CONFIG.fog;
      scene.fog.near = USUAL.near + (F.near - USUAL.near) * fogged;
      scene.fog.far = USUAL.far + (F.far - USUAL.far) * fogged;
      scene.background.copy(usualColor).lerp(fogColor, fogged);
      scene.fog.color.copy(scene.background);
    }
  }
  // 3D locator arrow over upcoming speed cameras (see CONFIG.speedCamera)
  const warnDist = CONFIG.speedCamera?.warn || 180;
  for (let i = 0; i < cameraMarkers.length; i++) {
    const marker = cameraMarkers[i];
    const cam = SpeedCameras.list[i];
    if (!cam || cam.passed || cam.obstacle?.gone || Game.state !== 'playing' || !Player.active) {
      marker.visible = false;
      continue;
    }
    const gap = cam.s - Player.s;
    if (gap > 0 && gap <= warnDist) {
      marker.visible = true;
      const camLat = cam.obstacle ? cam.obstacle.lat : 0;
      Track.toWorld(cam.s, camLat, tmp);
      const nowMs = t * 1000;
      const bob = Math.sin(nowMs / 200 + i) * 0.2;
      marker.position.set(tmp.x, tmp.y + 4.9 + bob, tmp.z);
      marker.rotation.y = nowMs / 500 + i;
      const sx = scene.scale.x < 0 ? -tmp.x : tmp.x;
      const far = Math.hypot(sx - camera.position.x, tmp.y - camera.position.y, tmp.z - camera.position.z);
      marker.scale.setScalar(Math.max(1, far / 45));
      const speeding = Player.speed > cam.limit;
      marker.userData.glow.color.setHex(speeding ? (Math.floor(nowMs / 200) % 2 ? 0xff2222 : 0xff7777) : 0xffd23f);
    } else {
      marker.visible = false;
    }
  }
  syncFlash();
};
// a speed camera catching the player: the screen flashes white
const syncFlash = () => {
  if (flashEl) flashEl.style.opacity = (SpeedCameras.flash * 0.8).toFixed(2);
};
Game.onLoad.push(() => { // (out of any fog left from the last run; a level's own sky is put up as it loads: see applySky)
  fogged = 0;
  fogFresh = true;
  fogColor.set(fogColorOf(THEMES[LEVEL.theme] || THEMES.city));
  usualColor.set((THEMES[LEVEL.theme] || THEMES.city).sky ?? scene.background.getHex()); // (a run that starts inside a fog bank never saw the sky to come back out to: it was white)
  scene.fog.near = USUAL.near;
  scene.fog.far = USUAL.far;
});
