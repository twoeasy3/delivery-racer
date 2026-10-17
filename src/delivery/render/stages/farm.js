// ---- the farm's car stage (render/carstage.js): green hills, a red barn and a silo, a line of trees and a fence on the
// horizon; by the plinth (packed earth) round hay bales, a cow, a fence, a milk churn and a barrow (the game's own models)
import { OBSTACLE_MODELS } from '../obstacleModels.js';
import { BOX, piece, group } from './kit.js';

const fence = () => { // a post-and-rail fence, three bays
  const g = group(), wood = 0xe9e4d8;
  for (let i = 0; i < 4; i++) piece(g, BOX, wood, i * 1.6 - 2.4, 0.6, 0, 0.14, 1.2, 0.14);
  for (const y of [0.45, 0.9]) piece(g, BOX, wood, 0, y, 0.08, 5, 0.12, 0.05);
  return g;
};
const bales = () => { const g = group(), o = { hw: 0.6, hl: 0.6, height: 1.3 }, a = OBSTACLE_MODELS.bale(o), b = OBSTACLE_MODELS.bale(o); b.position.set(1.35, 0, 0.4); b.rotation.y = 0.4; g.add(a, b); return g; };
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil;
    const hill = (lift, colour) => { g.fillStyle = colour; g.beginPath(); g.moveTo(0, hy + 1); for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, hy - hy * lift * (0.5 + 0.5 * Math.sin(x / w * 5 + lift * 9))); g.lineTo(w, hy + 1); g.fill(); };
    hill(0.16, css(pal.far.clone().lerp(pal.top, dark ? 0.55 : 0.25)));
    hill(0.08, css(pal.ground.clone().lerp(pal.far, 0.5).lerp(pal.top, dark ? 0.5 : 0)));
    const bx = w * 0.66, bw = w * 0.13, bh = hy * 0.16; // the barn: a red body under a gambrel roof, white trim and doors
    g.fillStyle = dark ? '#4a2220' : '#b23a2c'; g.fillRect(bx, hy - bh, bw, bh + 1);
    g.beginPath(); g.moveTo(bx - 2, hy - bh); g.lineTo(bx + bw * 0.15, hy - bh * 1.45); g.lineTo(bx + bw * 0.5, hy - bh * 1.7); g.lineTo(bx + bw * 0.85, hy - bh * 1.45); g.lineTo(bx + bw + 2, hy - bh); g.fill();
    g.strokeStyle = dark ? 'rgba(220,210,200,.5)' : '#f2ede4'; g.lineWidth = 1.2; g.strokeRect(bx + bw * 0.32, hy - bh * 0.75, bw * 0.36, bh * 0.75);
    g.beginPath(); g.moveTo(bx + bw * 0.32, hy - bh * 0.75); g.lineTo(bx + bw * 0.68, hy); g.moveTo(bx + bw * 0.68, hy - bh * 0.75); g.lineTo(bx + bw * 0.32, hy); g.stroke();
    g.fillStyle = dark ? '#5a5f66' : '#c9ccd0'; g.fillRect(bx + bw + 4, hy - bh * 2, bw * 0.28, bh * 2 + 1); // a silo, its dome
    g.beginPath(); g.arc(bx + bw + 4 + bw * 0.14, hy - bh * 2, bw * 0.14, Math.PI, 0); g.fill();
    g.fillStyle = css(pal.ground.clone().lerp(pal.top, dark ? 0.7 : 0.35).multiplyScalar(0.8)); // round trees
    for (let x = rnd() * 15; x < w * 0.6; x += 14 + rnd() * 24) { const r = 4 + rnd() * 4; g.fillRect(x - 0.8, hy - r, 1.6, r); g.beginPath(); g.arc(x, hy - r * 1.4, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = dark ? 'rgba(200,190,180,.35)' : 'rgba(255,255,255,.75)'; // the fence along the field
    g.fillRect(0, hy - 3, w, 1);
    for (let x = 2; x < w; x += 9) g.fillRect(x, hy - 5, 1, 5);
  },
  plinth: () => 0x6a5138, // (packed earth)
  models: { bales, fence },
  props: [['bales', -0.85, 1.8, 0.5, 1], ['cow', 0.82, 2.4, -0.9, 0.9], ['fence', -0.1, 4.6, 0, 1], ['milkChurn', 0.98, 0.4, 0, 1, 'cone'], ['barrow', -0.98, 0.2, 0.6, 1]],
};
