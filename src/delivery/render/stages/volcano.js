// ---- the volcano's car stage (render/carstage.js): the cone on the horizon, lava down its flanks and a glow at its crater,
// a plume of ash over it; by the plinth, lava rocks (the theme's own obstacle), basalt columns and a crusted lava pool
import { OBSTACLE_MODELS } from '../obstacleModels.js';
import { HEX, ROCK, BOX, piece, group } from './kit.js';

// a cluster of basalt columns: hexagons of a few heights, packed
const basalt = () => {
  const g = group();
  for (const [x, z, h, w] of [[0, 0, 2.1, 0.62], [0.55, 0.2, 1.5, 0.58], [-0.5, 0.25, 1.2, 0.56], [0.2, -0.5, 1.75, 0.6], [-0.3, -0.45, 0.8, 0.55], [0.75, -0.35, 0.6, 0.5]]) {
    piece(g, HEX, 0x2b2629, x, h / 2, z, w, h, w);
    piece(g, HEX, 0x3d3539, x, h + 0.02, z, w * 0.96, 0.04, w * 0.96); // (the top: a paler face)
  }
  return g;
};
// a crusted pool of lava: a low glowing sheet with black plates of crust on it and a rim of rocks
const lavaPool = () => {
  const g = group();
  piece(g, BOX, 0xff6a1a, 0, 0.03, 0, 2.6, 0.06, 1.6, 0, 0.3, 0);
  piece(g, BOX, 0xffb43a, 0.2, 0.05, 0.1, 1.2, 0.04, 0.5, 0, 0.5, 0);
  for (const [x, z, s, r] of [[-0.7, 0.2, 0.7, 0.4], [0.6, -0.3, 0.55, 1.1], [0.1, 0.45, 0.4, 2]]) piece(g, BOX, 0x1e1a1c, x, 0.08, z, s, 0.05, s * 0.7, 0, r, 0);
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; piece(g, ROCK, 0x2e282b, Math.cos(a) * 1.45, 0.12, Math.sin(a) * 0.95, 0.5, 0.35, 0.45, k, k * 2, 0); }
  return g;
};
const rock = (r) => () => OBSTACLE_MODELS.lavaRock({ r });
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil, cone = css(pal.top.clone().lerp(pal.haze, 0.25).lerp(pal.ground, 0.5));
    const glow = g.createLinearGradient(0, hy * 0.55, 0, hy); // (the land's glow on the haze)
    glow.addColorStop(0, 'rgba(255,110,40,0)'); glow.addColorStop(1, dark ? 'rgba(255,100,30,.55)' : 'rgba(255,120,60,.3)');
    g.fillStyle = glow; g.fillRect(0, hy * 0.55, w, hy * 0.45);
    const cx = w * 0.4, top = hy * 0.2, half = w * 0.5, crater = w * 0.07;
    g.fillStyle = 'rgba(70,60,62,.55)'; // the plume of ash, leaning
    for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(cx + i * w * 0.035, top - 6 - i * hy * 0.035, crater * (0.55 + i * 0.16), 0, Math.PI * 2); g.fill(); }
    g.fillStyle = cone; // the cone
    g.beginPath(); g.moveTo(cx - half, hy + 1); g.quadraticCurveTo(cx - crater * 1.6, top + hy * 0.2, cx - crater, top); g.lineTo(cx + crater, top); g.quadraticCurveTo(cx + crater * 1.6, top + hy * 0.2, cx + half, hy + 1); g.fill();
    g.fillStyle = '#ff9a2a'; // the crater's glow, lava down the flanks
    g.beginPath(); g.ellipse(cx, top + 1, crater * 0.9, 3, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ff6a1a'; g.lineCap = 'round';
    for (const [dx, len, lw] of [[-0.5, 0.75, 2.5], [0.3, 0.55, 2], [0.75, 0.9, 1.6]]) {
      g.lineWidth = lw; g.beginPath(); g.moveTo(cx + dx * crater, top + 2);
      g.quadraticCurveTo(cx + dx * crater * 2.5, top + (hy - top) * len * 0.5, cx + dx * crater * (3 + rnd() * 2), top + (hy - top) * len); g.stroke();
    }
    g.fillStyle = css(pal.far.clone().lerp(pal.top, dark ? 0.7 : 0.45)); // a ridge in front, low
    g.beginPath(); g.moveTo(0, hy + 1); for (let x = 0; x <= w; x += w / 10) g.lineTo(x, hy - hy * (0.04 + rnd() * 0.07)); g.lineTo(w, hy + 1); g.fill();
  },
  plinth: (pal) => (pal.evil ? 0x4d4044 : 0x241f22), // (basalt; paler under the Evil side's black car)
  models: { lavaRockBig: rock(1.0), lavaRock: rock(0.7), lavaRockSmall: rock(0.45), basalt, lavaPool },
  // [model, side, depth (car radii behind), turn, scale, kind of box]
  props: [['basalt', -0.78, 1.9, 0.3, 1], ['lavaRockBig', 0.74, 1.6, 0.6, 0.9], ['lavaPool', -0.5, 3.2, 0.2, 1.2], ['lavaRock', 0.3, 4.8, 0, 1], ['lavaRockSmall', 0.97, 0.2, 1, 1]],
};
