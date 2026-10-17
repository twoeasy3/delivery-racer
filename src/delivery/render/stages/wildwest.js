// ---- the Wild West's car stage (render/carstage.js): red mesas and buttes on the horizon, saguaros before them; by the
// plinth (boards) a covered wagon and a windpump (the theme's own models), barrels, a cactus and a tumbleweed
import { makeWagon, makeWindpump } from '../themes/wildwestModels.js';
import { OBSTACLE_MODELS } from '../obstacleModels.js';
import { CYL, BALL, piece, group } from './kit.js';

// a saguaro: a trunk, two arms bent up, on a heap of sand
const cactus = () => {
  const g = group(), green = 0x4f7a3a;
  piece(g, CYL, green, 0, 1.3, 0, 0.5, 2.6, 0.5);
  piece(g, BALL, green, 0, 2.6, 0, 0.5, 0.5, 0.5);
  for (const [s, y, up] of [[1, 1.2, 0.9], [-1, 1.6, 0.7]]) {
    piece(g, CYL, green, s * 0.42, y, 0, 0.36, 0.36, 0.36, 0, 0, Math.PI / 2);
    piece(g, CYL, green, s * 0.62, y + up / 2, 0, 0.36, up, 0.36);
    piece(g, BALL, green, s * 0.62, y + up, 0, 0.36, 0.36, 0.36);
  }
  piece(g, BALL, 0xd8b07a, 0, 0, 0, 1.2, 0.4, 1.2);
  return g;
};
const barrels = () => { const g = group(), a = OBSTACLE_MODELS.barrel(), b = OBSTACLE_MODELS.barrel(); b.position.set(0.85, 0, 0.3); g.add(a, b); return g; };
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil;
    const butte = (x, bw, bh, colour) => { g.fillStyle = colour; g.beginPath(); g.moveTo(x - bw * 0.65, hy + 1); g.lineTo(x - bw * 0.5, hy - bh * 0.7); g.lineTo(x - bw * 0.42, hy - bh); g.lineTo(x + bw * 0.42, hy - bh); g.lineTo(x + bw * 0.5, hy - bh * 0.7); g.lineTo(x + bw * 0.65, hy + 1); g.fill(); };
    const far = css(pal.haze.clone().lerp(pal.ground, 0.45).lerp(pal.top, dark ? 0.5 : 0.1)), near = css(pal.ground.clone().lerp(pal.top, dark ? 0.6 : 0.2).multiplyScalar(0.85));
    butte(w * 0.15, w * 0.34, hy * 0.3, far); butte(w * 0.62, w * 0.5, hy * 0.22, far); butte(w * 0.88, w * 0.12, hy * 0.42, far);
    butte(w * 0.4, w * 0.16, hy * 0.36, near);
    g.fillStyle = dark ? css(pal.top.clone().lerp(pal.ground, 0.3)) : '#4d6a3c'; // saguaros on the flat
    for (let x = rnd() * 20; x < w; x += 22 + rnd() * 30) {
      const t = 8 + rnd() * 8;
      g.fillRect(x, hy - t, 2.5, t + 1); g.fillRect(x - 3, hy - t * 0.6, 2, t * 0.3); g.fillRect(x - 3, hy - t * 0.45, 4, 2); g.fillRect(x + 3.5, hy - t * 0.75, 2, t * 0.35); g.fillRect(x + 1.5, hy - t * 0.45, 4, 2);
    }
  },
  plinth: () => 0x5e3f26, // (weathered boards)
  models: { wagon: makeWagon, windpump: makeWindpump, cactus, barrels },
  props: [['wagon', -0.9, 2.1, 0.9, 0.7], ['barrels', 0.78, 1.3, -0.3, 1], ['cactus', 0.95, 3.2, 0, 1], ['windpump', -0.3, 6, 0.5, 0.6], ['tumbleweed', -0.98, 0.3, 0, 0.8]],
};
