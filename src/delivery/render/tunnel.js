// ---- TUNNELS: the road under cover (where they are: Track.tunnel, a level's "tunnels") ----------------
// Each tunnel: a wall along each shoulder with a pale band of tiles along it, a ceiling over the whole
// road with a line of lamps down it, and at each end a portal, a face of concrete round the opening.
// Inside, the dark closes in (the scene's fog drawn right in and its colour taken to the tunnel's, the
// sky gone with it), the player's headlights come on if the level doesn't have them anyway, and the
// engine echoes (Sound.echo). All of it eases in and out over the portals. A tunnel's height can vary along it and a theme
// can light its tunnels and draw their shell itself (tunnelshape.js; a mall's halls: render/themes/mall.js).
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
import { heightOf, tunnelsLit } from './tunnelshape.js'; // (the ceiling's height along a tunnel: the usual, the tunnel's own, or the theme's by zone)
import { TUNNEL_LOOKS, wallTexture, glowTexture, dressTunnels, dressStats } from './tunneldress.js'; // (the looks and fittings of the themes whose tunnels had none)

const group = new THREE.Group();
scene.add(group);
const USUAL = { near: 120, far: 520 };
const dark = new THREE.Color(), outside = new THREE.Color();
let inside = 0, lightsOwn = false, has = false, darkColor = null;

// a roof strip whose height varies along s (buildStrip, with y a function of s: a ceiling that climbs into an atrium)
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
  const T = CONFIG.tunnel;
  // (a theme may give a tunnel its colours, `tunnel` in themes.js: a cardboard box in the toy room)
  // (and a theme with none of its own may have a look here: render/tunneldress.js, by the theme's name: a bypass, a dock tunnel, a
  // rock tunnel under the fjord, the cross-harbour tunnel, a Shuto tunnel. Its texture on the walls, its lamps, their glow, its fittings)
  const own = (THEMES[LEVEL.theme] || THEMES.city).tunnel;
  const look = { wall: 0x5a5d63, tiles: 0xd9dcd2, roof: 0x3d4046, lamp: 0xfff3d0, face: 0x6b6e74, ...(own ? {} : TUNNEL_LOOKS[LEVEL.theme] || TUNNEL_LOOKS[LEVEL.theme === undefined ? 'city' : '']), ...own };
  darkColor = look.dark ?? null;
  const wallTex = wallTexture(look.wallMap), roofTex = look.roofMap ? wallTex : null;
  const wall = new THREE.MeshLambertMaterial({ color: look.wall, side: THREE.DoubleSide, map: wallTex?.map ?? null,
    ...(look.selfLit ? { emissive: look.selfLit, emissiveMap: wallTex?.map ?? null } : {}) });
  const tiles = new THREE.MeshLambertMaterial({ color: look.tiles, side: THREE.DoubleSide });
  const roof = new THREE.MeshLambertMaterial({ color: roofTex ? 0xffffff : look.roof, side: THREE.DoubleSide, map: roofTex?.map ?? null });
  const lamp = new THREE.MeshBasicMaterial({ color: look.lamp });
  const face = new THREE.MeshLambertMaterial({ color: look.face, side: THREE.DoubleSide });
  const add = (geo, mat) => { if (!geo.attributes.normal) geo.computeVertexNormals(); const mesh = new THREE.Mesh(geo, mat); group.add(mesh); return mesh; };
  const spot = new THREE.Object3D();
  if (look.shell === false) return; // (the theme draws the whole shell itself, walls, ceiling, lamps and portals: a mall's halls, render/themes/mall.js)
  // (a tunnel junction, hazards.js: a mouth CONFIG.tunnelJunction.mouth m wide in each wall, and beyond it a stub of side tunnel)
  const mouths = (LEVEL.tunnelJunctions || []).map(j => Track.place(j)), HALF = (CONFIG.tunnelJunction?.mouth ?? 10) / 2;
  const inMouth = (s) => mouths.some(m => Math.abs(s - m) < HALF);
  for (const t of LEVEL.tunnels) {
    const lo = (s) => Track.lo(s) - 0.3, hi = (s) => Track.hi(s) + 0.3;
    // the ceiling's height along the tunnel (tunnelshape.js): the usual H, the tunnel's own `height` or `profile`, or the theme's by zone
    const hAt = heightOf(t), varies = hAt(t.from) !== hAt(t.to) || !!t.profile || !!look.heights;
    // the walls: a vertical strip each side, from the road up to the ceiling (built as a flat strip, stood up:
    // one quad per 4 m along, its two edges the foot and the top of the wall)
    for (const side of [-1, 1]) {
      const edge = side < 0 ? lo : hi;
      const pos = [], idx = [], uv = [];
      let n = 0;
      for (let s = t.from; s <= t.to + 0.001; s += 4, n++) {
        const q = Math.min(s, t.to);
        Track.toWorld(q, edge(q), tmp);
        pos.push(tmp.x, tmp.y, tmp.z, tmp.x, tmp.y + hAt(q), tmp.z);
        if (wallTex) uv.push((q - t.from) / wallTex.U, 0, (q - t.from) / wallTex.U, hAt(q) / wallTex.V); // (the texture's metres along and up)
        if (n && !inMouth(q - 2)) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } // (no wall across a junction's mouth)
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      if (wallTex) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      add(geo, wall);
      if (look.band === false) continue; // (the look's texture has its own)
      // the band of tiles along it, at headlight height
      const band = pos.map((v, i) => i % 3 === 1 ? (i % 6 === 1 ? v + 0.9 : pos[i - 3] + 2.1) : v); // (the top from the foot, whatever the ceiling's height)
      const bandGeo = new THREE.BufferGeometry();
      bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(band, 3));
      bandGeo.setIndex(idx);
      const b = add(bandGeo, tiles);
      b.position.x += 0; // (flush: it is the same wall, a lighter band of it)
      b.scale.setScalar(1.001);
    }
    const roofGeo = varies ? roofStrip(t.from, t.to, lo, hi, hAt, 4) : buildStrip(t.from, t.to, lo, hi, hAt(t.from), 4);
    if (roofTex) { // (the texture over the ceiling too: a rock tunnel's. The strips' points go in pairs, 4 m apart along)
      const P = roofGeo.attributes.position, uv = [];
      for (let i = 0; i < P.count; i++) uv.push(Math.floor(i / 2) * 4 / roofTex.U, (i % 2) * (hi(t.from) - lo(t.from)) / roofTex.V);
      roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    }
    add(roofGeo, roof);
    // the side tunnels of its junctions: a stub each side, as tall as the tunnel there, 20 m long, the dark at its end
    for (const m of mouths) {
      if (m <= t.from || m >= t.to) continue;
      const H = hAt(m);
      for (const side of [-1, 1]) {
        const h = Track.toWorld(m, (side < 0 ? lo(m) : hi(m)) + side * 10, tmp), stub = new THREE.Group();
        stub.position.set(tmp.x, tmp.y, tmp.z);
        stub.rotation.y = h;
        for (const dz of [-HALF, HALF]) { const w = new THREE.Mesh(new THREE.BoxGeometry(20, H, 0.3), wall); w.position.set(0, H / 2, dz); stub.add(w); }
        const r = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, HALF * 2 + 0.3), roof); r.position.set(0, H, 0); stub.add(r);
        const end = new THREE.Mesh(new THREE.BoxGeometry(0.3, H, HALF * 2), face); end.position.set(-side * 10, H / 2, 0); // (local +x is the road's left: the far end of a left mouth's stub is at +x) stub.add(end);
        group.add(stub);
      }
    }
    // the lamps down the middle of the ceiling (or the look's: in rows `rows` m in from both walls, or one wall (`side`), every `every`
    // m, `size`, `drop` m under the ceiling), and the look's glow under each (`glow`: a halo, added light)
    const LA = look.lamps || {}, every = LA.every ?? T.lampEvery, size = LA.size ?? [0.5, 0.12, 2.2], drop = LA.drop ?? 0.1;
    const rows = LA.rows ? LA.rows.flatMap(d => (LA.side ? [LA.side] : [-1, 1]).map(side => [side, d])) : [[0, 0]];
    const count = Math.floor((t.to - t.from) / every), at = [];
    for (let k = 0; k < count; k++) {
      const s = t.from + every * (k + 0.5);
      for (const [side, d] of rows) at.push([s, side ? (side < 0 ? lo(s) + d : hi(s) - d) : 0]);
    }
    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), lamp, at.length);
    const halo = look.glow ? new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: look.lamp, map: glowTexture('spot'), transparent: true, opacity: look.glow * 2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), at.length) : null;
    at.forEach(([s, lat], k) => {
      spot.rotation.y = Track.toWorld(s, lat, tmp);
      spot.position.set(tmp.x, tmp.y + hAt(s) - drop, tmp.z);
      spot.scale.set(1, 1, 1);
      spot.updateMatrix();
      lamps.setMatrixAt(k, spot.matrix);
      if (!halo) return;
      spot.position.y -= size[1] / 2 + 0.03; // (just under the lamp, a soft spot of light round it, five times as wide, twice as long)
      spot.scale.set(size[0] * 5 + 1, 1, size[2] * 2 + 1);
      spot.updateMatrix();
      halo.setMatrixAt(k, spot.matrix);
    });
    group.add(lamps);
    if (halo) group.add(halo);
    // the portals: a face of concrete round each opening, wide and tall, the hillside the tunnel goes into
    for (const end of [t.from, t.to]) {
      const H = hAt(end); // (the portal as tall as the tunnel is there)
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
  // the look's fittings, all the level's tunnels' together (render/tunneldress.js)
  dressStats.last = dressTunnels(look.dress, LEVEL.tunnels, heightOf, group);
};
Game.onLoad.push(build);

export const syncTunnel = () => {
  if (!has) {
    if (inside) { inside = 0; Sound.echo(0); }
    return;
  }
  const T = CONFIG.tunnel, want = Game.state === 'start' ? 0 : Track.tunnel(Player.s);
  if (!inside && !want) return;
  // (a LIT tunnel, a mall's halls: no dark, no fog closing in, no headlights; only a little of the echo, a hall's: T.litEcho. Unless
  // the theme's tunnel has a fog of its own (`tunnel.fog`: { color, near, far }, the metro's): then its far end fades into that, still
  // with no headlights)
  const lit = tunnelsLit(), litFog = lit ? (THEMES[LEVEL.theme] || THEMES.city).tunnel?.fog : null;
  if (lit && !litFog) { inside = want; Sound.echo(inside * T.echo * (T.litEcho ?? 0.5)); return; }
  const F = litFog || T;
  if (!inside) outside.copy(scene.background); // (going in: the sky as it was, to put back)
  inside = want;
  dark.set(litFog ? F.color : darkColor ?? F.color); // (a look's own dark: render/tunneldress.js)
  // (never less fog than a fog bank in the tunnel already has: see render/roadside.js)
  scene.fog.near = Math.min(scene.fog.near, USUAL.near + (F.near - USUAL.near) * inside);
  scene.fog.far = Math.min(scene.fog.far, USUAL.far + (F.far - USUAL.far) * inside);
  scene.background.copy(outside).lerp(dark, inside);
  scene.fog.color.copy(scene.background);
  if (!lightsOwn && !lit) setHeadlights(inside > 0.3); // (the headlights come on at the portal)
  Sound.echo(inside * T.echo * (lit ? T.litEcho ?? 0.5 : 1));
  if (!want) { // out the far end: the sky back, and the fog as the level has it
    scene.background.copy(outside);
    scene.fog.color.copy(outside);
    if (Track.foggy(Player.s) === 0) { scene.fog.near = USUAL.near; scene.fog.far = USUAL.far; }
  }
};
