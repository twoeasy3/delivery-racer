// ---- TUNNELS: the road under cover (where they are: Track.tunnel, a level's "tunnels") ----------------
// Each tunnel: a wall along each shoulder with a pale band of tiles along it, a ceiling over the whole
// road with a line of lamps down it, and at each end a portal, a face of concrete round the opening.
// Inside, the dark closes in (the scene's fog drawn right in and its colour taken to the tunnel's, the
// sky gone with it), the player's headlights come on if the level doesn't have them anyway, and the
// engine echoes (Sound.echo). All of it eases in and out over the portals.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { THEMES } from '../themes.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { scene, tmp } from './scene.js';
import { buildStrip } from './road.js';
import { setHeadlights } from './headlights.js';
import { Sound } from './audio.js';

const group = new THREE.Group();
scene.add(group);
const USUAL = { near: 120, far: 520 };
const dark = new THREE.Color(), outside = new THREE.Color();
let inside = 0, lightsOwn = false, has = false;

// SPIKE: the ceiling's height at s for a tunnel: its `profile` [[s, h], ...], eased between points; its `height`; or the usual
export const heightOf = (t, usual) => {
  const P = t.profile;
  if (!P) { const h = t.height ?? usual; return () => h; }
  return (s) => {
    if (s <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) if (s <= P[i][0]) { const u = (s - P[i - 1][0]) / (P[i][0] - P[i - 1][0]), k = u * u * (3 - 2 * u); return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k; }
    return P[P.length - 1][1];
  };
};
// SPIKE: a roof strip whose height varies along s (buildStrip, with y a function of s)
const roofStrip = (sFrom, sTo, latA, latB, yAt, step = 4) => {
  const pos = [], idx = [];
  for (let n = 0; ; n++) {
    const s = Math.min(sFrom + n * step, sTo);
    Track.toWorld(s, latA(s), tmp); pos.push(tmp.x, tmp.y + yAt(s), tmp.z);
    Track.toWorld(s, latB(s), tmp); pos.push(tmp.x, tmp.y + yAt(s), tmp.z);
    if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    if (s >= sTo) break;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
};
const build = () => {
  for (const o of group.children) o.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });
  group.clear();
  inside = 0;
  has = !!(LEVEL.tunnels || []).length;
  lightsOwn = !!(THEMES[LEVEL.theme] || THEMES.city).headlights;
  if (!has) return;
  const T = CONFIG.tunnel, H = T.height;
  // (a theme may give a tunnel its colours, `tunnel` in themes.js: a cardboard box in the toy room)
  const look = { wall: 0x5a5d63, tiles: 0xd9dcd2, roof: 0x3d4046, lamp: 0xfff3d0, face: 0x6b6e74, ...(THEMES[LEVEL.theme] || THEMES.city).tunnel };
  const wall = new THREE.MeshLambertMaterial({ color: look.wall, side: THREE.DoubleSide });
  const tiles = new THREE.MeshLambertMaterial({ color: look.tiles, side: THREE.DoubleSide });
  const roof = new THREE.MeshLambertMaterial({ color: look.roof, side: THREE.DoubleSide });
  const lamp = new THREE.MeshBasicMaterial({ color: look.lamp });
  const face = new THREE.MeshLambertMaterial({ color: look.face, side: THREE.DoubleSide });
  const add = (geo, mat) => { if (!geo.attributes.normal) geo.computeVertexNormals(); const mesh = new THREE.Mesh(geo, mat); group.add(mesh); return mesh; };
  const spot = new THREE.Object3D();
  for (const t of LEVEL.tunnels) {
    const lo = (s) => Track.lo(s) - 0.3, hi = (s) => Track.hi(s) + 0.3;
    // SPIKE: the ceiling's height along the tunnel: a `profile` [[s, h], ...] (eased from one point to the next), a `height`, or the usual
    const hAt = heightOf(t, H);
    // the walls: a vertical strip each side, from the road up to the ceiling (built as a flat strip, stood up:
    // one quad per 4 m along, its two edges the foot and the top of the wall)
    for (const side of [-1, 1]) {
      const edge = side < 0 ? lo : hi;
      const pos = [], idx = [];
      let n = 0;
      for (let s = t.from; s <= t.to + 0.001; s += 4, n++) {
        const q = Math.min(s, t.to);
        Track.toWorld(q, edge(q), tmp);
        pos.push(tmp.x, tmp.y, tmp.z, tmp.x, tmp.y + hAt(q), tmp.z);
        if (n) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      add(geo, wall);
      // the band of tiles along it, at headlight height
      const band = pos.map((v, i) => i % 3 === 1 ? (i % 6 === 1 ? v + 0.9 : pos[i - 3] + 2.1) : v); // (SPIKE: the top from the foot, not the ceiling)
      const bandGeo = new THREE.BufferGeometry();
      bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(band, 3));
      bandGeo.setIndex(idx);
      const b = add(bandGeo, tiles);
      b.position.x += 0; // (flush: it is the same wall, a lighter band of it)
      b.scale.setScalar(1.001);
    }
    add(t.profile ? roofStrip(t.from, t.to, lo, hi, hAt, 4) : buildStrip(t.from, t.to, lo, hi, hAt(t.from), 4), roof);
    // the lamps down the middle of the ceiling
    const count = Math.floor((t.to - t.from) / T.lampEvery);
    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.12, 2.2), lamp, count);
    for (let k = 0; k < count; k++) {
      const s = t.from + T.lampEvery * (k + 0.5);
      spot.rotation.y = Track.toWorld(s, 0, tmp);
      spot.position.set(tmp.x, tmp.y + hAt(s) - 0.1, tmp.z);
      spot.updateMatrix();
      lamps.setMatrixAt(k, spot.matrix);
    }
    group.add(lamps);
    // the portals: a face of concrete round each opening, wide and tall, the hillside the tunnel goes into
    for (const end of [t.from, t.to]) {
      const H = hAt(end); // (SPIKE: the portal as tall as the tunnel is there)
      const w = hi(end) - lo(end);
      const h = Track.toWorld(end, (lo(end) + hi(end)) / 2, tmp);
      const slab = add(new THREE.BoxGeometry(w + 16, H + 9, 1.2), face);
      slab.position.set(tmp.x, tmp.y + (H + 9) / 2, tmp.z);
      slab.rotation.y = h;
      // (with the opening cut out: the slab is a lintel over the road and a pier each side; a theme's tunnel can make them
      // slighter: `lintel` m tall and `pier` m wide, 9 and 8 if not said: a covered bridge's frame, not a hillside)
      const LT = look.lintel ?? 9, PIER = look.pier ?? 8;
      slab.geometry = new THREE.BoxGeometry(w + PIER * 2, LT, 1.2);
      slab.position.y = tmp.y + H + LT / 2;
      for (const side of [-1, 1]) {
        const pier = add(new THREE.BoxGeometry(PIER, H, 1.2), face);
        const lat = (side < 0 ? lo(end) : hi(end)) + side * PIER / 2;
        Track.toWorld(end, lat, tmp);
        pier.position.set(tmp.x, tmp.y + H / 2, tmp.z);
        pier.rotation.y = h;
      }
    }
  }
};
Game.onLoad.push(build);

export const syncTunnel = () => {
  if (!has) {
    if (inside) { inside = 0; Sound.echo(0); }
    return;
  }
  const T = CONFIG.tunnel, want = Game.state === 'start' ? 0 : Track.tunnel(Player.s);
  if (!inside && !want) return;
  if (LEVEL.tunnels.every(t => t.lit)) { inside = want; Sound.echo(inside * T.echo * 0.6); return; } // (SPIKE: a lit tunnel: no dark, no fog, no headlights; a little echo)
  if (!inside) outside.copy(scene.background); // (going in: the sky as it was, to put back)
  inside = want;
  dark.set(T.color);
  // (never less fog than a fog bank in the tunnel already has: see render/roadside.js)
  scene.fog.near = Math.min(scene.fog.near, USUAL.near + (T.near - USUAL.near) * inside);
  scene.fog.far = Math.min(scene.fog.far, USUAL.far + (T.far - USUAL.far) * inside);
  scene.background.copy(outside).lerp(dark, inside);
  scene.fog.color.copy(scene.background);
  if (!lightsOwn) setHeadlights(inside > 0.3); // (the headlights come on at the portal)
  Sound.echo(inside * T.echo);
  if (!want) { // out the far end: the sky back, and the fog as the level has it
    scene.background.copy(outside);
    scene.fog.color.copy(outside);
    if (Track.foggy(Player.s) === 0) { scene.fog.near = USUAL.near; scene.fog.far = USUAL.far; }
  }
};
