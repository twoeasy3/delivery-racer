// ---- THE LADLE'S MODELS (a level's "ladles": the steelworks' scripted event, ../lanegimmicks.js; drawn by ladles.js): no game
// state and no scene, so the checks can measure them headless (scripts/.steelworks-check.mjs: what hangs over the road keeps over
// the chase camera's clearance, CLEAR_OUT). Every piece is a vertex-coloured box or tube baked into ONE geometry per mesh.
// Local frame: +z the player's way, +x to the road's left, y up from the road. The ladle's own frame: its trunnions on the x axis
// at the origin, its lip towards -z (the player coming up), tipped by rotation.x (negative: the lip down towards the player).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const LADLE = {
  trunnion: 16.4,   // m up to the ladle's trunnions as it hangs
  below: 2.4,       // m from its trunnions down to its bottom (its bottom 14.0 m up: over CLEAR_OUT, 13.5)
  height: 3.4,      // m tall
  rTop: 1.9, rBot: 1.55,
  tip: 1.4,         // rad it tips to pour (about 80 degrees)
  girder: 20.2,     // m up to the underside of the crane's two girders
  trolleyTop: 23.4, // m up to the trolley's roof
  legOut: 3.0,      // m beyond the road's edge to the middle of a leg
  signY: 14.0,      // m up to the underside of the MOLTEN METAL board's gantry beam and board
};
// where the lip is, in the ladle's frame tipped by `tip` (rad), relative to the trunnions
export const lipAt = (tip = LADLE.tip) => { const y = LADLE.height - LADLE.below, z = -LADLE.rTop; return { y: y * Math.cos(-tip) - z * Math.sin(-tip), z: y * Math.sin(-tip) + z * Math.cos(-tip) }; };
// the lowest point of the ladle's body at a tip, relative to the trunnions (its bottom rim and its lip sampled)
export const lowestAt = (tip) => {
  let low = Infinity;
  for (const [y, r] of [[-LADLE.below, LADLE.rBot], [LADLE.height - LADLE.below, LADLE.rTop]]) for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
    const z = Math.cos(a) * r;
    low = Math.min(low, y * Math.cos(-tip) - z * Math.sin(-tip));
  }
  return low;
};

const colour = new THREE.Color();
// a piece: the geometry made non-indexed, coloured, placed; pieces merged into one geometry
const piece = (geometry, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  g.deleteAttribute('uv');
  colour.setHex(hex);
  const c = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < c.length; i += 3) { c[i] = colour.r; c[i + 1] = colour.g; c[i + 2] = colour.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
  return g;
};
export const merged = (pieces) => { const g = mergeGeometries(pieces); for (const p of pieces) p.dispose(); return g; };
export const boxPiece = (w, h, d, hex, x, y, z, rx, ry, rz) => piece(new THREE.BoxGeometry(w, h, d), hex, x, y, z, rx, ry, rz);
const tube = (rt, rb, h, hex, x, y, z, rx, ry, rz, n = 16, open = false) => piece(new THREE.CylinderGeometry(rt, rb, h, n, 1, open), hex, x, y, z, rx, ry, rz);
export const C = { yellow: 0xf2c21d, black: 0x1b1d22, dark: 0x3a3e44, darker: 0x26282c, steel: 0x7d858d, refractory: 0x4a403c, rim: 0x2c2624, red: 0xc8321f };
// hazard stripes across a w wide face, its middle at (x, y, z), facing along z
export const stripePieces = (out, w, h, d, x, y, z, n = 8) => { for (let k = 0; k < n; k++) out.push(boxPiece(w / n, h, d, k % 2 ? C.black : C.yellow, x - w / 2 + (k + 0.5) * w / n, y, z)); };

// the ladle: a tapered steel shell, dark refractory, banded, its rim and lip, two trunnions; the molten top glowing (its own
// geometry, drawn unlit: { body, glow })
export const ladleGeometry = () => {
  const L = LADLE, mid = L.height / 2 - L.below, top = L.height - L.below, out = [];
  out.push(tube(L.rTop, L.rBot, L.height, C.refractory, 0, mid, 0, 0, 0, 0, 20));
  out.push(tube(L.rBot * 0.98, L.rBot * 0.9, 0.2, C.rim, 0, -L.below - 0.08, 0, 0, 0, 0, 20)); // (its foot)
  for (const f of [0.2, 0.55, 0.88]) { const r = L.rBot + (L.rTop - L.rBot) * f + 0.05; out.push(tube(r, r, 0.22, C.rim, 0, -L.below + L.height * f, 0, 0, 0, 0, 20, true)); }
  out.push(tube(L.rTop + 0.12, L.rTop + 0.12, 0.3, C.dark, 0, top - 0.1, 0, 0, 0, 0, 20, true)); // the rim
  out.push(boxPiece(0.9, 0.3, 0.7, C.dark, 0, top - 0.05, -L.rTop - 0.2)); // the lip
  for (const x of [-1, 1]) { out.push(tube(0.28, 0.28, 0.6, C.steel, x * (L.rTop + 0.15), 0, 0, 0, 0, Math.PI / 2, 12)); out.push(boxPiece(0.2, 1.4, 1.0, C.dark, x * (L.rTop - 0.02), -0.3, 0)); }
  const glow = [tube(L.rTop - 0.12, L.rTop - 0.12, 0.06, 0xffd27a, 0, top - 0.12, 0, 0, 0, 0, 20), boxPiece(0.6, 0.06, 0.5, 0xffb040, 0, top + 0.08, -L.rTop - 0.2)];
  return { body: merged(out), glow: merged(glow) };
};
// the crane's trolley on its girders, with the hoist ropes, the hook block and the bail down to the ladle's trunnions (all of
// it moves across the road as one; its frame's origin under it on the road)
export const trolleyGeometry = () => {
  const L = LADLE, out = [], top = L.trolleyTop, base = L.girder + 1.8, hook = L.trunnion + 2.4;
  out.push(boxPiece(4.6, top - base, 5.2, C.yellow, 0, (top + base) / 2, 0));
  out.push(boxPiece(4.8, 0.2, 5.4, C.dark, 0, top + 0.1, 0));
  stripePieces(out, 4.6, 0.45, 0.04, 0, base + 0.3, -2.62, 8);
  for (const x of [-0.6, 0.6]) for (const z of [-0.3, 0.3]) out.push(boxPiece(0.07, base - hook, 0.07, C.black, x, (base + hook) / 2, z)); // the ropes
  out.push(boxPiece(1.8, 0.9, 1.0, C.yellow, 0, hook + 0.2, 0)); // the hook block
  out.push(boxPiece(2 * L.rTop + 1.2, 0.35, 0.5, C.dark, 0, hook - 0.3, 0)); // the bail's crosshead
  for (const x of [-1, 1]) out.push(boxPiece(0.22, hook - L.trunnion, 0.6, C.dark, x * (L.rTop + 0.5), (hook + L.trunnion) / 2 - 0.15, 0)); // its side plates
  return merged(out);
};
// the stream: a glowing tube 1 m long hanging from y = 0 down to -1 (scaled to its length), white-hot in the core
export const streamGeometry = () => {
  const g = new THREE.CylinderGeometry(0.32, 0.5, 1, 12, 4, true).translate(0, -0.5, 0), p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const u = -p.getY(i); colour.setRGB(1, 0.82 - u * 0.35, 0.45 - u * 0.4); c.set([colour.r, colour.g, colour.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
};
// the pool: a rounded rectangle (a superellipse) 2 across and 2 along, flat, white-hot in the middle and deep orange at its
// rim, the rim a little ragged (only ever inwards: the hit box is the full rectangle, scaled to it)
export const poolGeometry = () => {
  const n = 48, pos = [0, 0, 0], col = [1, 0.95, 0.62], idx = [];
  for (const [ring, rgb] of [[0.6, [1, 0.72, 0.22]], [1, [0.95, 0.32, 0.06]]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), rag = ring === 1 ? 1 - 0.07 * Math.abs(Math.sin(i * 2.7) * Math.cos(i * 1.3)) : 1;
      pos.push(Math.sign(c) * Math.abs(c) ** 0.5 * ring * rag, 0, Math.sign(s) * Math.abs(s) ** 0.5 * ring * rag);
      col.push(...rgb);
    }
  }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(0, 1 + j, 1 + i); idx.push(1 + i, 1 + j, 1 + n + j, 1 + i, 1 + n + j, 1 + n + i); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
};
