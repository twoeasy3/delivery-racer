// ---- WATER STAGES: the road as a channel of water (what it does: ../water.js) -----------------------
// Over each of a level's "water" stretches: a ribbed concrete slipway where the pavement goes in, a sheet of
// water over the road from bank to bank (pale and clear at the water's edge, deepening down the slipway to the
// channel's colour, glints running along it), a stone quay along each bank, and buoys where the lane lines
// were: small white ones on the lane lines, yellow on the centre line, red and green posts at the banks.
// The road itself is not dug out: the water stands CONFIG.water.surface m over it, and whatever floats is
// sat down into it (and through the road it hides) by its draft, bobbing and rolling; a boat rides on top.
// A car afloat throws up a bow wave and leaves a wake, and makes a splash as it comes off the slipway.
// Only the stretch around the player is brought up to date each frame.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { THEMES } from '../themes.js';
import { CAR } from '../cars.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';
import { scene, tmp, clearGroup } from './scene.js';
import { carMesh, trafficMeshes } from './cars.js';
import { Particles, rnd } from './effects.js';
import './boatModels.js'; // (the boats, added to MODELS)

const STEP = 4, COLS = 6;             // m between rows of the sheet; points across it
const BEHIND = 80, AHEAD = 600;       // m either side of the player kept up to date
const LEAD = 9;                       // m of slipway that shows above the water's edge
const W = () => CONFIG.water;

const group = new THREE.Group();
scene.add(group);
let sheets = [];   // one for each stage: { mesh, from, rows, base: [colour of each point] }
let buoys = null;
let dim = 1;       // (a night level's slipways and quays are dark; and its water, unless the theme says its colours)
let tones = null;  // the water's colours on this level: { shallow, deep, glint } (THREE.Color), a theme's own ("channel") or CONFIG's
const colour = (hex) => new THREE.Color(hex).multiplyScalar(dim);
const mixed = new THREE.Color();

// a strip of quads along the road from a to b, `cols` points across at lats(s): returns its mesh;
// paint(s, c, colourOut) says the colour and returns the alpha; up(s, c): m over the road
const strip = (a, b, step, cols, lats, up, paint, offset) => {
  const rows = Math.max(2, Math.ceil((b - a) / step) + 1);
  const pos = new Float32Array(rows * cols * 3), col = new Float32Array(rows * cols * 4), idx = [];
  for (let r = 0; r < rows; r++) {
    const s = Math.min(b, a + r * step);
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      Track.toWorld(s, lats(s, c), tmp);
      pos.set([tmp.x, tmp.y + up(s, c), tmp.z], k * 3);
      const alpha = paint(s, c, mixed);
      col.set([mixed.r, mixed.g, mixed.b, alpha], k * 4);
      if (r && c) { const p = (r - 1) * cols + c - 1, q = p + 1, d = r * cols + c - 1, e = d + 1; idx.push(p, q, d, q, e, d); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset }));
  mesh.frustumCulled = false;
  mesh.renderOrder = -offset; // (the slipway, then the water over it, then the foam)
  group.add(mesh);
  return { mesh, rows };
};
// m the water stands over the road at s (a hair over it at the water's edge)
const surface = (s) => 0.03 + W().surface * Track.water(s);

const buildWater = () => {
  clearGroup(group);
  sheets = [];
  buoys = null;
  if (!Track.waters.length) return;
  const C = W(), K = C.colours, theme = THEMES[LEVEL.theme] || THEMES.city;
  dim = theme.night ? 0.42 : theme.lit ? 0.3 : 1;
  const own = theme.channel, tone = (name) => own ? new THREE.Color(own[name]) : colour(K[name]);
  tones = { shallow: tone('shallow'), deep: tone('deep'), glint: tone('glint') };
  const { shallow, deep } = tones, slip = colour(K.slip), rib = colour(K.rib), quay = colour(K.quay), foam = colour(K.foam);
  const across = (s, c) => Track.lo(s) - C.bank + (Track.hi(s) - Track.lo(s) + 2 * C.bank) * c / (COLS - 1);
  const spots = [], lanes = Track.laneCount;
  for (const w of Track.waters) {
    const a = Math.max(Track.start + 1, w.from), b = Math.min(Track.end - 1, w.to);
    // the slipways: ribbed concrete from a little above the water's edge to the slipway's foot
    for (const [from, to] of [[w.from - LEAD, w.from + C.slipway], [w.to - C.slipway, w.to + LEAD]]) {
      if (from < Track.start + 1 || to > Track.end - 1) continue;
      strip(from, to, 1, 2, (s, c) => c ? Track.hi(s) + C.bank : Track.lo(s) - C.bank, () => 0.02,
        (s, c, out) => { out.copy(Math.floor(s) % 2 ? slip : rib); return 1; }, -2);
    }
    // the water: clear at its edge, the channel's colour by a third of the way down the slipway
    const paint = (s, c, out) => { const d = Track.water(s); out.copy(shallow).lerp(deep, Math.min(1, d * 3)); return Math.min(1, 0.4 + d * 6); };
    const sheet = strip(a, b, STEP, COLS, across, surface, paint, -4);
    sheets.push({ ...sheet, from: a, to: b });
    // a line of foam at each water's edge
    for (const at of [w.from, w.to]) {
      if (at < Track.start + 1 || at > Track.end - 1) continue;
      strip(at - 0.5, at + 0.5, 1, 2, (s, c) => c ? Track.hi(s) + C.bank : Track.lo(s) - C.bank, () => 0.05, (s, c, out) => { out.copy(foam); return 0.85; }, -6);
    }
    // a stone quay along each bank
    for (const side of [-1, 1]) {
      strip(a, b, STEP, 2, (s, c) => (side < 0 ? Track.lo(s) - C.bank : Track.hi(s) + C.bank) + side * c * 0.7, (s) => surface(s) + 0.14,
        (s, c, out) => { out.copy(quay); return 1; }, -5);
    }
    // the buoys: one every buoyEvery m along each lane line, and a post at each bank every other one
    for (let s = Math.max(a, w.from + C.slipway * 0.6), n = 0; s <= Math.min(b, w.to - C.slipway * 0.6); s += C.buoyEvery, n++) {
      for (let l = 1; l < lanes; l++) {
        const centre = Track.flow === 'both' && !Track.medianLanes && l === Track.leftLanes; // (the centre line of a two-way road)
        spots.push({ s, lat: (Track.laneOffset(l - 1, s) + Track.laneOffset(l, s)) / 2, hex: centre ? 0xf2c418 : 0xf4f1e6, size: centre ? 1.25 : 0.8 });
      }
      if (n % 2 === 0) spots.push({ s, lat: Track.lo(s) + 0.2, hex: 0xd8262b, size: 1.5 }, { s, lat: Track.hi(s) - 0.2, hex: 0x2fae5a, size: 1.5 });
    }
  }
  if (spots.length) {
    const geo = new THREE.ConeGeometry(0.3, 0.8, 8).translate(0, 0.32, 0);
    buoys = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), spots.length);
    const m = new THREE.Matrix4(), tint = new THREE.Color();
    spots.forEach((spot, i) => {
      Track.toWorld(spot.s, spot.lat, tmp);
      m.makeScale(spot.size, spot.size, spot.size).setPosition(tmp.x, tmp.y + surface(spot.s), tmp.z);
      buoys.setMatrixAt(i, m);
      buoys.setColorAt(i, tint.setHex(spot.hex));
    });
    buoys.frustumCulled = false;
    group.add(buoys);
  }
};
Game.onLoad.push(buildWater);

// how a thing afloat at s sits: m it is moved up (or down: its draft), and its roll and pitch (rad), by a swell
// of its own (phase)
const ride = { y: 0, roll: 0, pitch: 0 };
const riding = (s, draft, phase, now) => {
  const C = W(), B = C.bob, d = Track.water(s), t = now / 1000 * 2 * Math.PI / B.period + phase;
  ride.y = (C.surface - draft) * d + Math.sin(t) * B.height * d;
  ride.roll = Math.sin(t * 0.83 + 1) * B.roll * d;
  ride.pitch = Math.sin(t * 1.21) * B.pitch * d;
  return ride;
};
// white water thrown up by a hull at (s, lat) moving at `speed` (signed, along the road): churned up astern,
// and curling off each side of the bow
const spray = (s, lat, hw, hl, speed, dir) => {
  const way = Math.sign(speed) || dir, pace = Math.abs(speed);
  const h = Track.toWorld(s - way * hl, lat, tmp), y = tmp.y + surface(s);
  for (let n = 0; n < 2; n++) {
    Particles.emit(tmp.x + rnd(hw * 0.7), y + 0.05, tmp.z + rnd(hw * 0.7), Math.sin(h) * speed * 0.15 + rnd(1.2), 1 + Math.random() * 1.6, Math.cos(h) * speed * 0.15 + rnd(1.2),
      0.5 + Math.random() * 0.3, 0.17, 0.9, 6, Math.random() < 0.6 ? 0xffffff : 0xcfe9f2, y);
  }
  if (pace < 8) return;
  for (const side of [-1, 1]) { // the bow wave: out to each side, the further the faster
    Track.toWorld(s + way * hl * 0.9, lat + side * hw, tmp);
    const out = side * (2 + pace * 0.12) * (Track.mirrored ? -1 : 1);
    Particles.emit(tmp.x, y + 0.05, tmp.z, Math.cos(h) * out + Math.sin(h) * speed * 0.3, 1.2 + Math.random() * 1.2, -Math.sin(h) * out + Math.cos(h) * speed * 0.3,
      0.4 + Math.random() * 0.2, 0.15, 0.7, 7, 0xffffff, y);
  }
};

let wasAfloat = false, rolled = false;
export const syncWater = (now, dt) => {
  if (!sheets.length) {
    if (rolled) { carMesh.rotation.z = 0; rolled = false; }
    return;
  }
  const C = W();
  // glints running along the water, near the player
  const { deep, glint, shallow } = tones;
  for (const sheet of sheets) {
    if (Player.s + AHEAD < sheet.from || Player.s - BEHIND > sheet.to) continue;
    const r0 = Math.max(0, Math.floor((Player.s - BEHIND - sheet.from) / STEP)), r1 = Math.min(sheet.rows - 1, Math.ceil((Player.s + AHEAD - sheet.from) / STEP));
    const colours = sheet.mesh.geometry.attributes.color;
    for (let r = r0; r <= r1; r++) {
      const s = Math.min(sheet.to, sheet.from + r * STEP), d = Math.min(1, Track.water(s) * 3);
      for (let c = 0; c < COLS; c++) {
        const wave = 0.5 + 0.5 * Math.sin(s * 0.19 + c * 1.9 + now * 0.0016) * Math.sin(s * 0.07 - c * 0.8 - now * 0.0011);
        mixed.copy(shallow).lerp(deep, d).lerp(glint, wave * 0.55 * d);
        colours.setXYZ(r * COLS + c, mixed.r, mixed.g, mixed.b);
      }
    }
    colours.needsUpdate = true;
  }
  if (buoys) buoys.position.y = Math.sin(now / 700) * 0.04;
  // the player's car afloat: down into the water by its draft, bobbing, its bow up a little at speed
  const depth = Game.screensaver ? 0 : Track.water(Player.s);
  if (depth > 0) {
    const r = riding(Player.s, Player.rageTank ? Player.rageTank.draft : Player.tank > 0 || CAR.noWheels ? C.boatDraft : CAR.draft ?? C.draft, 0, now);
    carMesh.position.y += r.y;
    carMesh.rotation.z = r.roll;
    carMesh.rotation.x += r.pitch - depth * 0.05 * Math.min(1, Player.speed / 30);
    rolled = true;
    if (Player.active && Player.speed > C.wakeFrom && depth > 0.2) {
      spray(Player.s, Player.lat, Player.hw, Player.hl, Player.speed, 1);
      // (the Amphibious Tank shoulders a big bow wave ahead of it: as much white water again, thrown wider)
      for (let n = 1; n < (Player.rageTank?.bowWave || 1); n++) spray(Player.s + 0.6 * n, Player.lat, Player.hw + 0.5 * n, Player.hl + 0.4, Player.speed * (1 + 0.25 * n), 1);
    }
  } else if (rolled) { carMesh.rotation.z = 0; rolled = false; }
  // (a splash as it floats off the slipway)
  if (Player.afloat && !wasAfloat && Player.active) {
    const h = Track.toWorld(Player.s + Player.hl, Player.lat, tmp), y = tmp.y + surface(Player.s);
    for (let n = 0; n < 46; n++) {
      const a = (n / 46) * Math.PI * 2, out = 3 + Math.random() * 5;
      Particles.emit(tmp.x + rnd(1), y, tmp.z + rnd(1), Math.cos(a) * out + Math.sin(h) * Player.speed * 0.4, 3 + Math.random() * 5, Math.sin(a) * out + Math.cos(h) * Player.speed * 0.4,
        0.7 + Math.random() * 0.5, 0.24, 0.8, 9, n % 3 ? 0xffffff : 0xcfe9f2, y);
    }
  }
  wasAfloat = Player.afloat;
  // the traffic on the water: boats riding on it, amphibious cars down in it
  for (let i = 0; i < Traffic.cars.length; i++) {
    const car = Traffic.cars[i], mesh = trafficMeshes[i];
    if (!car.active || car.junction) continue;
    const d = Track.water(car.s);
    if (d <= 0) { if (mesh.userData.rolled) { mesh.rotation.z = 0; mesh.userData.rolled = false; } continue; }
    const type = CONFIG.vehicles[car.kind] || {};
    const r = riding(car.s, type.boat ? C.boatDraft : type.draft ?? C.draft, i * 1.7, now);
    mesh.position.y += r.y;
    mesh.rotation.z = r.roll;
    mesh.rotation.x += r.pitch;
    mesh.userData.rolled = true;
    if (Math.abs(car.vs) > C.wakeFrom && d > 0.2 && Math.abs(car.s - Player.s) < 220 && Math.random() < 0.6) spray(car.s, car.lat, car.hw, car.hl, car.vs, car.dir);
  }
};
