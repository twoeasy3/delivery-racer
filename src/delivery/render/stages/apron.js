// ---- the airport apron's car stage (render/carstage.js): on the horizon the terminal's long glass front with its jet
// bridges, airliners' tails over it, a parked airliner side-on, hangars and the control tower; by the plinth (apron concrete)
// a stair truck (no one on it), a baggage cart, cones and a windsock: the scenery's own models (render/themes/apronModels.js)
import { stairTruck, dolly, apronCone, windsock, templateMesh } from '../themes/apronModels.js';

const TAILS = ['#1f4f99', '#c8392e', '#16807a', '#e07a1f', '#5a3f8f'];
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil, far = css(pal.haze.clone().lerp(pal.top, dark ? 0.6 : 0.3)), near = css(pal.haze.clone().lerp(pal.top, dark ? 0.8 : 0.5));
    // hangars far off on the left: walls under curved roofs
    g.fillStyle = far;
    for (const [x, s] of [[0.02, 1], [0.15, 0.8]]) { const x0 = w * x, bw = w * 0.12 * s, bh = hy * 0.09 * s; g.fillRect(x0, hy - bh, bw, bh + 1); g.beginPath(); g.ellipse(x0 + bw / 2, hy - bh, bw / 2, bh * 0.45, 0, Math.PI, 0); g.fill(); }
    // the control tower on the right: a shaft, the glass cab leaning out, a mast
    const tx = w * 0.86, th = hy * 0.5;
    g.fillStyle = far; g.fillRect(tx - 3, hy - th, 6, th + 1); g.fillRect(tx - 10, hy - th - 3, 20, 4);
    g.beginPath(); g.moveTo(tx - 9, hy - th - 3); g.lineTo(tx - 11, hy - th - 10); g.lineTo(tx + 11, hy - th - 10); g.lineTo(tx + 9, hy - th - 3); g.fill();
    g.fillStyle = dark ? '#8fc0e0' : 'rgba(70,120,160,.85)'; g.fillRect(tx - 10, hy - th - 9, 20, 4);
    g.fillStyle = far; g.fillRect(tx - 12, hy - th - 12, 24, 2.5); g.fillRect(tx - 0.6, hy - th - 20, 1.2, 8);
    if (dark) { g.fillStyle = '#ff3a2a'; g.fillRect(tx - 1, hy - th - 22, 2, 2); }
    // tails over the terminal's roof
    for (let i = 0; i < 6; i++) {
      const cx = w * (0.28 + i * 0.1 + rnd() * 0.03), ft = hy * (0.15 + rnd() * 0.05);
      g.fillStyle = dark ? near : TAILS[i % TAILS.length]; g.globalAlpha = dark ? 1 : 0.75;
      g.beginPath(); g.moveTo(cx, hy - hy * 0.06); g.lineTo(cx + ft * 0.55, hy - ft); g.lineTo(cx + ft * 0.85, hy - ft); g.lineTo(cx + ft * 0.75, hy - hy * 0.06); g.fill();
    }
    g.globalAlpha = 1;
    // the terminal: a long low front of glass under a deep roof, jet bridges out from it
    const t0 = w * 0.24, t1 = w * 0.8, top = hy - hy * 0.075;
    g.fillStyle = near; g.fillRect(t0, top, t1 - t0, hy - top + 1);
    g.fillStyle = dark ? 'rgba(255,214,140,.55)' : 'rgba(80,130,165,.8)'; g.fillRect(t0 + 2, top + 2.5, t1 - t0 - 4, hy - top - 3);
    g.fillStyle = near; for (let x = t0 + 6; x < t1 - 4; x += 6) g.fillRect(x, top + 2, 0.8, hy - top - 2);
    g.fillRect(t0 - 4, top - 1.5, t1 - t0 + 8, 2.5);
    for (let x = t0 + 20; x < t1 - 20; x += 46) { g.fillRect(x, hy - hy * 0.05, 22, 3); g.fillRect(x + 20, hy - hy * 0.05, 2.5, hy * 0.05); }
    // an airliner parked side-on, left of middle: fuselage, nose, wing, fin, engine, gear
    const ax = w * 0.06, ay = hy - hy * 0.035, L = w * 0.22, R = Math.max(2.5, L * 0.055);
    g.fillStyle = dark ? css(pal.haze.clone().lerp(pal.top, 0.7)) : '#eef0f1';
    g.beginPath(); g.ellipse(ax + L * 0.92, ay - R, L * 0.09, R, 0, -Math.PI / 2, Math.PI / 2); g.fill();
    g.fillRect(ax + L * 0.12, ay - 2 * R, L * 0.8, 2 * R);
    g.beginPath(); g.moveTo(ax + L * 0.12, ay - 2 * R); g.lineTo(ax, ay - 2.4 * R); g.lineTo(ax + L * 0.02, ay - 1.5 * R); g.lineTo(ax + L * 0.12, ay); g.fill();
    g.fillStyle = dark ? near : TAILS[0]; g.beginPath(); g.moveTo(ax + L * 0.02, ay - 2.2 * R); g.lineTo(ax - L * 0.02, ay - 5.5 * R); g.lineTo(ax + L * 0.07, ay - 5.5 * R); g.lineTo(ax + L * 0.16, ay - 2 * R); g.fill();
    g.fillStyle = dark ? near : '#c9ced3'; g.beginPath(); g.moveTo(ax + L * 0.42, ay - R * 0.8); g.lineTo(ax + L * 0.6, ay - R * 0.8); g.lineTo(ax + L * 0.36, ay - R * 0.2); g.fill();
    g.fillRect(ax + L * 0.52, ay - R * 0.7, L * 0.1, R * 0.8);
    g.fillStyle = dark ? 'rgba(255,214,140,.7)' : '#26323c'; for (let x = ax + L * 0.2; x < ax + L * 0.86; x += 3) g.fillRect(x, ay - R * 1.45, 1.4, R * 0.35);
    g.fillStyle = '#222'; for (const x of [0.2, 0.5, 0.86]) g.fillRect(ax + L * x, ay - 0.5, 2, 2.5);
  },
  plinth: (pal) => (pal.night || pal.evil ? 0x5c5e60 : 0x9c9e9b), // (the apron's concrete)
  ground: (pal) => (pal.night || pal.evil ? 0x4a4c4e : 0x9a9c99),
  models: {
    stairs: () => templateMesh(stairTruck(), { body: 0xe8eaeb, cab: 0xf0f0ee }),
    cart: () => templateMesh(dolly()),
    cone: () => templateMesh(apronCone()),
    windsock: () => templateMesh(windsock()),
  },
  props: [['stairs', -0.92, 2.3, 0.5, 0.8], ['cart', 0.86, 1.6, -0.5, 1, 'bale'], ['cone', 0.98, 0.3, 0, 1, 'cone'], ['windsock', 0.42, 5.2, 0, 1.1], ['cone', -0.98, 0.3, 0, 1, 'cone']],
};
