// ---- THE NEON FUTURE CITY (theme 'neonCity': themes.js) -------------------------------------------------------------------
// A clean near-future megacity at night, rain-free: glass towers whose every face is outlined in light (blue, magenta, cyan,
// violet), abstract holo panels on their faces and on pylons (drifting colour fields, no text, no logo, no figure), an elevated
// maglev beam on columns along the left with a glowing rail, skybridges across the road between the towers, lamp posts whose
// light floats a hand's width over the post, a glowing kerb line. The road looks wet and glossy: coloured streaks lie on it
// under every lamp and panel (added light, faked: nothing is reflected). Nothing flies, nothing moves but the panels' colours.
// All of it behind the kerb but the skybridges, 16 m and more over the road.
// COST: every box in ONE instanced mesh a 600 m of road in ONE material (neonModels.js glassMaterial: towers, panels, strips,
// posts, the beam, the bridges); the pavements one merged mesh; the streaks one merged mesh (additive). No canvas texture, no
// light. Laid out the same every time (seeded from the level's id); drawn only: nothing here is read by the rules.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { everyFrame } from './sceneryClock.js';
import { KIND, HUES, HUE_HEX, glassMaterial, reflectionMaterial } from './neonModels.js';

export const NEON_CITY = { pave: 5, mono: { side: -1, d: 7.5, top: 10, wide: 1.2, deep: 1.4, every: 32 }, bridge: { y: 17, every: 420 } };
const SINK = 3;
const GLASS = [0x24305a, 0x2a2450, 0x1c3a58, 0x302a62, 0x203048];
const PAVEMENT = 0x262a3e, METAL = 0x3a4058;

export const neon = ({ add, flat, instances, sideStrip, standsClear, beside, exits, cube, levelGroup }) => {
  let seed = 7;
  for (const ch of (LEVEL.id || 'neon') + ':' + (LEVEL.theme || '')) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const between = (a, b) => a + rand() * (b - a);
  const hue = () => Math.floor(rand() * 4);
  const mat = glassMaterial();
  const p = {};

  const boxes = [];
  const box = (s, lat, y, sx, sy, sz, c, kind, h = HUES.BLUE) => { const e = [s, lat, y, sx, sy, sz]; e.c = c; e.a = [kind, h, Math.floor(rand() * 1000) / 1000, 0]; boxes.push(e); return e; };
  const run = (s0, l0, s1, l1, y, sx, sy, c, kind, h) => { const e = box(s0, l0, y, sx, sy, 1, c, kind, h); e.push([s1, l1]); return e; };

  // ---- clearings (as the Strip's): nothing over a tunnel, bridge or crossing, no props round the exits ----
  const clearings = [];
  const keep = (from, to, what) => clearings.push([from, to, what]);
  for (const b of LEVEL.bridges || []) keep(b.from - 30, b.to + 30, 'all');
  for (const t of LEVEL.tunnels || []) keep(t.from - 25, t.to + 25, 'all');
  for (const c of LEVEL.crossings || []) { const s = Track.place(c); keep(s - 18, s + 18, 'all'); }
  for (const x of exits) { keep(x.exitAt - 30, x.mergeAt + 30, 'props'); }
  const blocked = (s, what = 'all') => clearings.some(([a, b, w]) => s > a && s < b && (w === 'all' || what === 'props'));

  // ---- the towers, each side: a podium, a glass shaft (now and then a setback), outlines, a holo panel on its face ----
  const CELL = 4, taken = new Set();
  const claim = (s, lat, across, along) => {
    const keys = [], half = Math.max(Track.hi(s), -Track.lo(s)) + 3;
    for (let i = 0; i <= Math.ceil(across / CELL); i++) for (let j = 0; j <= Math.ceil(along / CELL); j++) {
      Track.toWorld(s + (j / Math.ceil(along / CELL) - 0.5) * (along - 2), lat + (i / Math.ceil(across / CELL) - 0.5) * (across - 2), p);
      if (Track.mainDistance(p.x, p.z) < half) return false;
      keys.push(Math.floor(p.x / CELL) * 100003 + Math.floor(p.z / CELL));
    }
    if (keys.some(k => taken.has(k))) return false;
    for (const k of keys) taken.add(k);
    return true;
  };
  const tower = (s, side, d, deep, wide, H, panel) => {
    const lat = beside(side, s, d + deep / 2);
    if (!claim(s, lat, deep, wide) || !standsClear(s, lat, deep, wide)) return false;
    const h = hue();
    box(s, lat, (H - SINK) / 2, deep, H + SINK, wide, GLASS[Math.floor(rand() * GLASS.length)], KIND.GLASS, h);
    if (H > 60 && rand() < 0.55) { const H2 = H * between(0.18, 0.35); box(s, lat, H + H2 / 2, deep * 0.62, H2, wide * 0.62, GLASS[0], KIND.GLASS, (h + 2) % 4); }
    if (panel) { // (a holo panel on the face to the road, standing 0.4 m proud of the glass)
      const ph = Math.min(H * 0.35, between(10, 22)), pw = Math.min(wide * 0.7, ph * between(0.5, 1.4));
      box(s, beside(side, s, d - 0.4), between(10, Math.max(11, H - ph - 4)) + ph / 2, 0.3, ph, pw, 0xffffff, KIND.HOLO, hue());
    }
    return true;
  };
  const near = [];
  for (const side of [-1, 1]) {
    const front = side === NEON_CITY.mono.side ? 14 : 9;
    for (let s = Track.start + 15; s < Track.end - 20;) {
      if (blocked(s)) { s += 6; continue; }
      const wide = between(18, 36);
      if (!blocked(s + wide) && tower(s + wide / 2, side, front + between(0, 4), between(16, 26), wide, between(35, 140), rand() < 0.45)) near.push([s + wide / 2, side]);
      s += wide + between(4, 12);
    }
    for (let s = Track.start + 30; s < Track.end; s += between(40, 70)) { // (the far towers: taller, outlines only)
      if (!blocked(s) && rand() < 0.75) tower(s, side, between(70, 220), between(20, 34), between(24, 40), between(80, 260), false);
    }
  }

  // ---- the street: pavement, a glowing kerb line, lamp posts with floating lights, holo pylons; their streaks on the road ----
  const paving = [], streaks = [];
  const tint = new THREE.Color();
  const tinted = (geo, colour) => {
    tint.set(colour);
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([tint.r, tint.g, tint.b], i * 3);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    return geo;
  };
  // a streak on the road: from the kerb out across `reach` m of lanes, `wide` m along, brightest at the kerb, fading out
  const streak = (s, side, reach, wide, colour) => {
    tint.set(colour);
    const pos = [], col = [], edge = side < 0 ? Track.lo(s) : Track.hi(s);
    const rows = [[edge, 1], [edge - side * reach * 0.35, 0.55], [edge - side * reach, 0]];
    for (const [lat, k] of rows) for (const ds of [-wide / 2, wide / 2]) {
      Track.toWorld(s + ds, lat, p);
      pos.push(p.x, p.y + 0.03, p.z);
      const f = k * (0.25 + 0.75 * (1 - Math.abs(ds) / wide)); // (a soft middle along)
      col.push(tint.r * f, tint.g * f, tint.b * f);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5]);
    streaks.push(geo);
  };
  for (const side of [-1, 1]) {
    let from = null;
    const close = (to) => {
      if (from !== null && to - from > 3) {
        const geo = sideStrip(from, to, (q) => beside(side, q, 0.25), (q) => beside(side, q, NEON_CITY.pave), 0.12, 2, exits.length ? 3 : true);
        if (geo.attributes.position.count) paving.push(tinted(geo, PAVEMENT));
        const kerb = sideStrip(from, to, (q) => beside(side, q, 0), (q) => beside(side, q, 0.25), 0.14, 2, exits.length ? 3 : true);
        if (kerb.attributes.position.count) paving.push(tinted(kerb, side < 0 ? 0x2ff4ff : 0xff2fd0)); // (the kerb a line of light: cyan left, magenta right)
      }
      from = null;
    };
    for (let s = Track.start; s <= Track.end; s += 2) {
      const ok = !blocked(s) && !(Track.onBridge && Track.onBridge(s));
      if (!ok) close(s);
      else if (from === null) from = s;
    }
    close(Track.end);
    for (let s = Track.start + 10 + (side > 0 ? 14 : 0); s < Track.end - 5; s += 28) {
      if (blocked(s, 'props')) continue;
      const h = side < 0 ? HUES.CYAN : HUES.MAGENTA, lat = beside(side, s, 0.9);
      box(s, lat, 3.0, 0.18, 6.0, 0.18, METAL, KIND.METAL);                 // (the post)
      box(s, lat, 6.08, 0.5, 0.16, 0.5, METAL, KIND.METAL);                 // (its cap)
      box(s, lat, 6.75, 0.62, 0.62, 0.62, 0xffffff, KIND.GLOW, HUES.ICE).tilt = Math.PI / 4; // (the light, floating 0.5 m over the cap)
      box(s, lat, 6.75, 1.1, 0.07, 1.1, 0xffffff, KIND.GLOW, h);            // (a ring of colour round it)
      streak(s, side, 7.5, 2.2, HUE_HEX[h]);
    }
    for (let s = Track.start + 60 + (side > 0 ? 90 : 0); s < Track.end - 30; s += between(150, 230)) { // (a holo pylon on the pavement)
      if (blocked(s, 'props')) continue;
      const lat = beside(side, s, 3.2), h = hue();
      if (!standsClear(s, lat, 1, 6)) continue;
      box(s, lat, 1.6, 0.5, 3.2, 0.5, METAL, KIND.METAL);
      box(s, lat, 6.6, 0.25, 6.6, 4.8, 0xffffff, KIND.HOLO, h).turn = side * 0.5;
      streak(s, side, 9, 5, HUE_HEX[h]);
    }
  }
  // a streak at the foot of each near tower's panel too, faint
  for (const [s, side] of near) if (rand() < 0.5 && !blocked(s, 'props')) streak(s, side, 6, 7, HUE_HEX[hue()]);

  // ---- the maglev: a beam on columns along the left, a glowing rail on its top and its flank ----
  const M = NEON_CITY.mono, monoLat = (s) => beside(M.side, s, M.d);
  for (let a = Track.start + 10; a < Track.end - 10;) {
    if (blocked(a) || !standsClear(a, monoLat(a), 3, 3)) { a += 4; continue; }
    let b = a;
    while (b + 8 < Track.end - 10 && !blocked(b + 8) && standsClear(b + 8, monoLat(b + 8), 3, 3)) b += 8;
    if (b - a >= 24) {
      for (let s = a; s < b; s += 8) {
        const t = Math.min(b, s + 8);
        run(s, monoLat(s), t, monoLat(t), M.top - M.deep / 2, M.wide, M.deep, METAL, KIND.METAL);
        run(s, monoLat(s), t, monoLat(t), M.top + 0.06, 0.3, 0.12, 0xffffff, KIND.GLOW, HUES.CYAN);
        run(s, beside(M.side, s, M.d + M.wide / 2 + 0.02), t, beside(M.side, t, M.d + M.wide / 2 + 0.02), M.top - M.deep * 0.75, 0.04, 0.12, 0xffffff, KIND.GLOW, HUES.BLUE);
      }
      for (let s = a + 4; s < b - 2; s += M.every) {
        box(s, monoLat(s), (M.top - M.deep - SINK) / 2, 0.9, M.top - M.deep + SINK, 1.2, METAL, KIND.METAL);
        box(s, monoLat(s), M.top - M.deep - 0.3, 2.0, 0.6, 1.6, METAL, KIND.METAL);
        box(s, monoLat(s), 0.6, 1.0, 0.06, 1.3, 0xffffff, KIND.GLOW, HUES.CYAN); // (a band of light round its foot)
      }
    }
    a = b + 8;
  }

  // ---- skybridges: a glass tube of a box across the road from tower to tower, its underside outlined ----
  const Bd = NEON_CITY.bridge;
  for (let s = Track.start + 250; s < Track.end - 150; s += Bd.every * between(0.8, 1.2)) {
    if (blocked(s - 20) || blocked(s + 20)) continue;
    const l0 = beside(-1, s, 16), l1 = beside(1, s, 11);
    const h = hue();
    run(s, l0, s, l1, Bd.y, 5.5, 3.4, GLASS[2], KIND.GLASS, h);
    for (const e of [-2.3, 2.3]) run(s + e, l0, s + e, l1, Bd.y - 1.75, 0.18, 0.12, 0xffffff, KIND.GLOW, h);
  }

  // ---- all of it: one mesh a 600 m of boxes, the pavements, the streaks ----
  const by = new Map();
  for (const e of boxes) { const k = Math.floor((Track.isMain(e[0]) ? e[0] : Track.along(e[0])) / 600); if (!by.has(k)) by.set(k, []); by.get(k).push(e); }
  for (const part of by.values()) instances(cube, 0xffffff, part, false, 0, mat);
  if (paving.length) { const surface = flat(0xffffff); surface.vertexColors = true; add(mergeGeometries(paving), surface); }
  if (streaks.length) { const m = new THREE.Mesh(mergeGeometries(streaks), reflectionMaterial()); m.userData.flat = true; m.renderOrder = 1; levelGroup.add(m); }
  everyFrame(levelGroup, (t) => { mat.userData.uniforms.uTime.value = t; });
};
