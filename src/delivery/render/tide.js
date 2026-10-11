// ---- TIDE: the sea over the road (the water itself, and what it does: ../tide.js) ----------------
// A sheet of water over the player's side of the causeway, from the water's edge out over the
// pavement's edge to meet the sea: pale, thin and clear where it is shallow, darkening and rising
// to full depth (deep enough to hide a car's wheels), then down to the sea beyond the road. A line of
// surf runs along its edge. A wave warned of is a white crest rolling in from out at sea; it
// breaks at the road's edge and rushes in over it as the water's edge, then drains away.
// Only the stretch around the player is brought up to date each frame.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Tide } from '../tide.js';
import { scene, tmp } from './scene.js';

const STEP = 2;                       // m between rows of the water's sheet
const DEPTH = 0.3;                    // m the water stands over the road at full depth (to look at)
const BEHIND = 60, AHEAD = 560;       // m either side of the player kept up to date (the fog hides the rest)
const CREST_FROM = 59;                // m out from the water's edge that a wave's crest is when it is warned of
const CREST_CLIMB = 4;                // m beyond the pavement over which a crest comes up from the sea onto the road
const SHALLOW = new THREE.Color(0x86bccb), DEEP = new THREE.Color(0x2e6c8f);
const CREST = new THREE.Color(0xf2fafd), SWELL = new THREE.Color(0x4f8fb3);
const sheet = (opacity, offset) => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, depthWrite: false,
  side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset });

const group = new THREE.Group();
scene.add(group);
let water = null, foam = null, rows = 0, from = 0;
const crests = []; // one mesh for each wave there can be at once
const CREST_ROWS = Math.ceil(CONFIG.tide.stretch / 4) + 1;

// a mesh of `rows` rows of `cols` points, each row joined to the next in quads
const grid = (rowCount, cols, material) => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rowCount * cols * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rowCount * cols * 4), 4)); // (with alpha)
  const idx = [];
  for (let r = 1; r < rowCount; r++) {
    for (let c = 1; c < cols; c++) {
      const a = (r - 1) * cols + c - 1, b = a + 1, d = r * cols + c - 1, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false; // (its points move every frame)
  return mesh;
};
const put = (mesh, k, s, lat, up, colour, alpha = 1) => {
  Track.toWorld(s, lat, tmp);
  mesh.geometry.attributes.position.setXYZ(k, tmp.x, tmp.y + up, tmp.z);
  mesh.geometry.attributes.color.setXYZW(k, colour.r, colour.g, colour.b, alpha);
};
const mixed = new THREE.Color();

const buildTide = () => {
  for (const mesh of [water, foam, ...crests]) {
    if (!mesh) continue;
    group.remove(mesh);
    mesh.geometry.dispose();
  }
  water = foam = null;
  crests.length = 0;
  if (!LEVEL.tide) return;
  from = LEVEL.tide.from;
  rows = Math.ceil((LEVEL.tide.to - from) / STEP) + 1;
  water = grid(rows, 4, sheet(1, -3));
  foam = grid(rows, 2, sheet(0.9, -4));
  for (let i = 0; i < 4; i++) crests.push(grid(CREST_ROWS, 3, sheet(0.9, -5)));
  group.add(water, foam, ...crests);
  for (let r = 0; r < rows; r++) row(r, 0); // (all of it, once: after this only the stretch near the player)
};
Game.onLoad.push(buildTide);

// brings row r of the sheet and its surf up to date
const row = (r, now) => {
  const s = Math.min(from + r * STEP, LEVEL.tide.to);
  const outer = Track.hi(s) + 0.6, edge = Math.min(outer, Tide.edge(s)), dry = edge >= outer - 0.01;
  const full = Math.min(outer, edge + CONFIG.tide.ramp), share = (full - edge) / CONFIG.tide.ramp;
  const top = 0.05 + (DEPTH - 0.05) * share, sea = -0.04 - tmpY(s);
  mixed.copy(SHALLOW).lerp(DEEP, share);
  // (clear enough at the edge to see the road's lines through it; murkier the deeper it is)
  put(water, r * 4, s, edge, dry ? sea : 0.05, SHALLOW, 0.3);
  put(water, r * 4 + 1, s, full, dry ? sea : top, mixed, 0.3 + 0.4 * share);
  put(water, r * 4 + 2, s, outer, dry ? sea : top, mixed, 0.3 + 0.45 * share);
  put(water, r * 4 + 3, s, outer + 4, sea, mixed, 0.9);
  // (the surf wanders back and forth a little; none where there is no water)
  const lap = edge < outer - 0.1 ? 0.25 * Math.sin(s * 0.21 + now * 0.004) + 0.1 * Math.sin(s * 0.53 - now * 0.007) : 0;
  const width = edge < outer - 0.1 ? 0.7 : 0;
  put(foam, r * 2, s, Math.min(outer, edge - 0.15 + lap), 0.07, CREST);
  put(foam, r * 2 + 1, s, Math.min(outer, edge + width + lap), 0.07 + (DEPTH - 0.05) * width / CONFIG.tide.ramp, CREST);
};

let lastTime = -1;
export const syncTide = (now) => {
  if (!water) return;
  // (a new run: the whole sheet again, the tide having gone back out)
  if (Tide.time < lastTime) for (let r = 0; r < rows; r++) row(r, now);
  lastTime = Tide.time;
  const r0 = Math.max(0, Math.floor((Player.s - BEHIND - from) / STEP));
  const r1 = Math.min(rows - 1, Math.ceil((Player.s + AHEAD - from) / STEP));
  for (let r = r0; r <= r1; r++) row(r, now);
  for (const mesh of [water, foam]) {
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.attributes.color.needsUpdate = true;
  }
  // the waves: rolling in from out at sea while they are warned of; breaking over the road's
  // edge and rushing in with the water's edge as they come in; gone once they are in
  const { warning, rise } = CONFIG.tide;
  crests.forEach((mesh, i) => {
    const w = Tide.waves[i];
    mesh.visible = !!w && w.t < rise;
    if (!mesh.visible) return;
    for (let r = 0; r < CREST_ROWS; r++) {
      const s = w.s0 + (w.s1 - w.s0) * r / (CREST_ROWS - 1), k = Tide.stretch(w, s);
      // (one motion from out at sea to as far in as it gets: it rolls in to the water's edge as it stands, and is
      // there, no higher and no further out, the moment it breaks and the edge takes it on in. Its ends hang back
      // out at sea, and come up level with its middle over the last of the warning)
      const far = Math.max(0, -w.t / warning);         // 1 when it is warned of .. 0 as it breaks
      const edge = Tide.edge(s) + 0.2, lat = edge + CREST_FROM * far + (1 - k) * 25 * Math.min(1, far * 3);
      const height = (w.t < 0 ? 1.4 + 0.8 * Math.min(1, far * 3) : 1.4 * (1 - w.t / rise)) * k;
      // (out at sea it stands on the sea; it climbs onto the road over the last few metres before the pavement)
      const beyond = Math.min(1, Math.max(0, (lat - Track.hi(s)) / CREST_CLIMB));
      const up = DEPTH * 0.5 + (-0.05 - tmpY(s) - DEPTH * 0.5) * beyond;
      put(mesh, r * 3, s, lat, up, CREST);
      put(mesh, r * 3 + 1, s, lat + 1.5, up + height, CREST);
      put(mesh, r * 3 + 2, s, lat + 8, up, SWELL);
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.attributes.color.needsUpdate = true;
  });
};
// the road's height at s (the sea is at 0, whatever the road does)
const tmpY = (s) => { Track.toWorld(s, 0, tmp); return tmp.y; };
