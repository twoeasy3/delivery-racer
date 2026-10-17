// ---- the container port's car stage (render/carstage.js): quay cranes over a ship and the stacks on the horizon, the
// harbour's water before them; by the plinth, stacks of containers (the port's own colours) and mooring bollards
import { BOX_COLOURS } from '../themes/portModels.js';
import { BOX, CYL, piece, group } from './kit.js';

// a twenty-foot container: its box, ribs along its sides, its doors' bars at one end; k its colour
const box20 = (g, k, x, y, z, turn = 0) => {
  const c = BOX_COLOURS[k % BOX_COLOURS.length], L = 6.06, W = 2.44, H = 2.59, inner = group();
  piece(inner, BOX, c, 0, H / 2, 0, W, H, L);
  for (let i = -3; i <= 3; i++) for (const s of [-1, 1]) piece(inner, BOX, c, s * (W / 2 + 0.03), H / 2, i * 0.8, 0.06, H * 0.9, 0.12); // (ribs)
  for (const dx of [-0.35, 0.35]) piece(inner, BOX, 0x2a2d31, dx, H / 2, L / 2 + 0.03, 0.06, H * 0.88, 0.04); // (the door bars)
  inner.position.set(x, y, z); inner.rotation.y = turn;
  g.add(inner);
};
const stack = (a, b) => () => { const g = group(); box20(g, a, 0, 0, 0); box20(g, b, 0.15, 2.6, -0.3, 0.06); return g; };
const single = (k) => () => { const g = group(); box20(g, k, 0, 0, 0); return g; };
// a mooring bollard: a black iron post with a cap, a hawser's turns round it, on a yellow-edged slab of quay
const bollard = () => {
  const g = group();
  piece(g, BOX, 0x8e9196, 0, 0.05, 0, 1.4, 0.1, 1.4);
  piece(g, BOX, 0xe2b21c, 0, 0.11, 0.66, 1.4, 0.04, 0.1);
  piece(g, CYL, 0x1f2124, 0, 0.45, 0, 0.5, 0.8, 0.5);
  piece(g, CYL, 0x1f2124, 0, 0.9, 0, 0.72, 0.16, 0.72);
  for (const y of [0.35, 0.5]) piece(g, CYL, 0xc9b98a, 0, y, 0, 0.6, 0.08, 0.6);
  return g;
};
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil, near = css(pal.haze.clone().lerp(pal.top, dark ? 0.85 : 0.6)), far = css(pal.haze.clone().lerp(pal.top, 0.35));
    g.fillStyle = dark ? 'rgba(30,50,75,.85)' : 'rgba(70,110,140,.55)'; // the harbour's water, a band at the horizon
    g.fillRect(0, hy - 1, w, Math.max(4, hy * 0.06));
    g.fillStyle = far; // the ship's hull, its stacks of boxes
    g.fillRect(w * 0.05, hy - hy * 0.1, w * 0.55, hy * 0.1);
    for (let x = w * 0.08; x < w * 0.5; x += 7) { g.fillStyle = dark ? far : ['#b0574c', '#5a7fae', '#5f9a77', '#d79a5a', '#c9b56a'][Math.floor(rnd() * 5)]; g.globalAlpha = dark ? 1 : 0.55; g.fillRect(x, hy - hy * 0.1 - hy * (0.04 + rnd() * 0.07), 6, hy * 0.12); }
    g.globalAlpha = 1;
    g.strokeStyle = near; g.fillStyle = near; g.lineWidth = 2.2; // the quay cranes: legs, a deck, a boom out over the ship
    for (const [x, s] of [[0.22, 1], [0.48, 0.85], [0.8, 1.05]]) {
      const cx = w * x, top = hy - hy * 0.62 * s, span = hy * 0.12 * s;
      g.beginPath(); g.moveTo(cx - span, hy); g.lineTo(cx - span * 0.6, top); g.moveTo(cx + span, hy); g.lineTo(cx + span * 0.6, top); g.stroke();
      g.fillRect(cx - span * 0.9, top - 3, span * 2.6, 4); // the deck and the boom
      g.fillRect(cx - span * 1.6, top - 1.5, span * 1.2, 2);
      g.beginPath(); g.moveTo(cx - span * 0.3, top - 3); g.lineTo(cx + span * 0.2, top - hy * 0.13 * s); g.lineTo(cx + span * 0.8, top - 3); g.stroke(); // its A-frame
      if (dark) { g.fillStyle = '#ff4030'; g.fillRect(cx + span * 0.15, top - hy * 0.13 * s - 2, 3, 3); g.fillStyle = near; }
    }
  },
  plinth: (pal) => (pal.night ? 0x3a3d42 : 0x55585e), // (the quay's concrete, darker than the yard's)
  models: { stackA: stack(0, 1), stackB: stack(3, 2), single: single(4), bollard },
  props: [['stackA', -0.95, 2.2, 0.25, 0.75], ['single', 0.88, 1.7, -0.35, 0.75], ['bollard', -0.6, 0.9, 0, 1], ['stackB', 0.4, 5, 0.1, 0.75], ['bollard', 0.98, 0.1, 0, 1]],
};
