// ---- the Nordic fjord's car stage (render/carstage.js): the fjord between its two walls, a snow-capped peak at its head, the water
// down the middle, a white waterfall down the left wall, spruce along the walls' feet, red cabins on the shore. By the plinth the
// theme's own obstacles (fish boxes, lobster creels), a red timber cabin, a spruce, a mooring bollard and an upturned rowboat
import { BOX, CYL, piece, group } from './kit.js';
import * as THREE from 'three';

const css2 = (pal, css, t, dark) => css(pal.haze.clone().lerp(pal.top, dark ? Math.min(1, t + 0.25) : t));

const CONE = new THREE.ConeGeometry(0.5, 1, 6);
const PRISM = (() => { // a gable: 1 across, 1 tall, 1 long, its ridge along z, its foot on y = 0
  const g = new THREE.BufferGeometry(), a = [-0.5, 0, -0.5], b = [0.5, 0, -0.5], c = [0, 1, -0.5], d = [-0.5, 0, 0.5], e = [0.5, 0, 0.5], f = [0, 1, 0.5];
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...c, ...b, ...d, ...e, ...f, ...a, ...d, ...c, ...c, ...d, ...f, ...b, ...c, ...e, ...c, ...f, ...e], 3));
  g.computeVertexNormals();
  return g;
})();
// a small red timber cabin (a boathouse's size), white corner boards, a turf roof, its door and a window
const cabin = () => {
  const g = group(), w = 2.2, d = 2.6, h = 1.5, RED = 0x9b2d20, WHITE = 0xf4f2ec;
  piece(g, BOX, 0x5a5a56, 0, 0.1, 0, w + 0.2, 0.2, d + 0.2);
  piece(g, BOX, RED, 0, 0.2 + h / 2, 0, w, h, d);
  piece(g, PRISM, RED, 0, 0.2 + h, 0, w - 0.02, 0.6, d - 0.02);
  for (const sd of [-1, 1]) piece(g, BOX, 0x5d7a3a, sd * 0.6, 0.2 + h + 0.32, 0, 1.36, 0.16, d + 0.4, 0, 0, -sd * 0.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) piece(g, BOX, WHITE, sx * (w / 2 + 0.01), 0.2 + h / 2, sz * (d / 2 + 0.01), 0.08, h, 0.08);
  piece(g, BOX, 0x2a4a6a, -0.45, 0.75, d / 2 + 0.02, 0.6, 1.1, 0.04);
  piece(g, BOX, WHITE, 0.5, 1.05, d / 2 + 0.02, 0.62, 0.52, 0.04); piece(g, BOX, 0x23303c, 0.5, 1.05, d / 2 + 0.035, 0.46, 0.38, 0.04);
  return g;
};
const spruce = () => {
  const g = group();
  piece(g, CYL, 0x4a3424, 0, 0.4, 0, 0.18, 0.8, 0.18);
  for (const [r, y, h] of [[0.9, 0.6, 1.6], [0.7, 1.5, 1.4], [0.48, 2.3, 1.2], [0.26, 3.0, 0.9]]) piece(g, CONE, 0x2a4428, 0, y + h / 2, 0, r * 2, h, r * 2);
  return g;
};
// a mooring bollard on its slab of quay, a rope's turns round it
const bollard = () => {
  const g = group();
  piece(g, BOX, 0xa9a69e, 0, 0.05, 0, 1.2, 0.1, 1.2);
  piece(g, CYL, 0x2a2c30, 0, 0.4, 0, 0.42, 0.7, 0.42);
  piece(g, CYL, 0x2a2c30, 0, 0.8, 0, 0.6, 0.14, 0.6);
  for (const y of [0.32, 0.46]) piece(g, CYL, 0xc9b48a, 0, y, 0, 0.5, 0.07, 0.5);
  return g;
};
// a wooden rowboat, upturned on two trestles: its hull a long box tapered by a wedge at each end, painted white over a blue sheer
const rowboat = () => {
  const g = group();
  for (const z of [-0.8, 0.8]) { piece(g, BOX, 0x6b5a45, 0, 0.25, z, 1.1, 0.5, 0.12); }
  piece(g, BOX, 0xf2f2ee, 0, 0.72, 0, 1.0, 0.42, 2.4);
  piece(g, BOX, 0x2a5f9e, 0, 0.53, 0, 1.04, 0.1, 2.44);
  for (const sz of [-1, 1]) piece(g, PRISM, 0xf2f2ee, 0, 0.51, sz * 1.45, 1.0, 0.42, 0.5, Math.PI / 2 * sz, 0, 0); // (the bow and stern, turned down)
  piece(g, BOX, 0x8a6440, 0, 0.95, 0, 0.12, 0.06, 2.6); // the keel, up
  return g;
};
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil;
    // the peak at the fjord's head, snow on it
    const px = w * (0.48 + rnd() * 0.08), ph = hy * 0.82;
    g.fillStyle = css2(pal, css, 0.18, dark);
    g.beginPath(); g.moveTo(px - w * 0.3, hy); g.lineTo(px - w * 0.04, hy - ph * 0.92); g.lineTo(px, hy - ph); g.lineTo(px + w * 0.06, hy - ph * 0.9); g.lineTo(px + w * 0.32, hy); g.fill();
    g.fillStyle = dark ? 'rgba(255,200,190,.55)' : 'rgba(255,255,255,.92)';
    g.beginPath(); g.moveTo(px - w * 0.075, hy - ph * 0.72); g.lineTo(px - w * 0.04, hy - ph * 0.92); g.lineTo(px, hy - ph); g.lineTo(px + w * 0.06, hy - ph * 0.9); g.lineTo(px + w * 0.1, hy - ph * 0.68);
    g.lineTo(px + w * 0.05, hy - ph * 0.74); g.lineTo(px + w * 0.01, hy - ph * 0.66); g.lineTo(px - w * 0.03, hy - ph * 0.76); g.fill();
    // the water down the middle, to the horizon
    g.fillStyle = dark ? 'rgba(20,40,70,.9)' : 'rgba(36,96,126,.9)';
    g.fillRect(0, hy - hy * 0.05, w, hy * 0.05 + 1);
    // the two walls, steep, their tops ragged, dark with forest at the foot, a little snow on the left's top
    for (const [x0, x1, top, t] of [[-0.02, 0.38, 0.95, 0.45], [0.62, 1.02, 0.85, 0.42]]) {
      const left = x0 < 0.5, a = w * (left ? x0 : x1), b = w * (left ? x1 : x0);
      g.fillStyle = css2(pal, css, t, dark);
      g.beginPath(); g.moveTo(a, hy + 1); g.lineTo(a, hy - hy * top);
      for (let k = 1; k <= 6; k++) { const f = k / 6; g.lineTo(a + (b - a) * f * 0.55, hy - hy * top * (1 - f * 0.25) - (rnd() - 0.5) * hy * 0.05); }
      g.lineTo(b, hy - hy * 0.05); g.lineTo(b, hy + 1); g.fill();
      if (left) { g.fillStyle = dark ? 'rgba(255,200,190,.45)' : 'rgba(255,255,255,.85)'; g.fillRect(a, hy - hy * top - 1, (b - a) * 0.28, hy * 0.04); }
      g.fillStyle = css(pal.ground.clone().lerp(pal.top, dark ? 0.7 : 0.5)); // (spruce along the foot)
      for (let x = Math.min(a, b) + rnd() * 5; x < Math.max(a, b); x += 4 + rnd() * 6) {
        const f = left ? (x - a) / (b - a) : (b - x) / (b - a), base = hy - hy * 0.05 * (1 - f) * 0.4, s = 5 + rnd() * 6;
        g.beginPath(); g.moveTo(x - s * 0.3, base + 1); g.lineTo(x, base - s * 1.4); g.lineTo(x + s * 0.3, base + 1); g.fill();
      }
    }
    // a waterfall down the left wall: a white thread, a little foam at the foot
    g.fillStyle = dark ? 'rgba(200,215,235,.45)' : 'rgba(250,253,255,.9)';
    const fx = w * 0.27;
    g.fillRect(fx, hy - hy * 0.72, 2, hy * 0.6); g.fillRect(fx - 1, hy - hy * 0.13, 4, hy * 0.08);
    // red cabins on the shore, small
    for (const [x, s] of [[0.12, 1], [0.17, 0.8], [0.74, 0.9], [0.84, 1]]) {
      const cx = w * x, bw = 7 * s, bh = 4 * s, base = hy - 1;
      g.fillStyle = dark ? '#5a2a26' : '#a8382a'; g.fillRect(cx, base - bh, bw, bh);
      g.fillStyle = dark ? '#2a2a2a' : '#4f6e34'; g.beginPath(); g.moveTo(cx - 1, base - bh); g.lineTo(cx + bw / 2, base - bh - 3 * s); g.lineTo(cx + bw + 1, base - bh); g.fill();
      if (dark) { g.fillStyle = '#ffd98a'; g.fillRect(cx + bw * 0.3, base - bh * 0.6, 2, 2); }
    }
  },
  plinth: (pal) => (pal.night || pal.evil ? 0x3a3c40 : 0x55585c),
  models: { cabin, spruce, bollard, rowboat },
  props: [['creelStack', -0.8, 1.9, 0.5, 1, 'bale'], ['fishCrates', 0.82, 1.5, -0.4, 1, 'crate'], ['bollard', 0.95, -1.5, 0.3, 1], ['spruce', 0.55, 3.6, 0.2, 1], ['cabin', -0.45, 5, 0.5, 1], ['rowboat', -0.98, 0.3, 0.6, 1]],
};
