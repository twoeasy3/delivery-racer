// ---- the car stages of the themes with no file of their own, as ONE TABLE (render/carstage.js STAGE_FILES points each at
// this module, loaded once): per theme a skyline (a list of painters, below, with their numbers), the props round the plinth
// (the game's own obstacle models, or a few small ones of shared shapes: render/stages/kit.js), the plinth's colour and,
// where the theme's own does not suit a stage, the ground's. Painters draw on the backdrop's 2D canvas, standing on the
// horizon at hy; t is how far toward the sky's top colour a layer is (0 the haze: far; 1 the top: near and dark).
// No figures (no people), no generic crates.
import { OBSTACLE_MODELS } from '../obstacleModels.js';
import { BOX, CYL, BALL, piece, group } from './kit.js';

// ---- the painters: (g, w, hy, P, ...numbers). P: { pal, rnd, css, dark, tone(t), land(t) }
const P_ = (pal, rnd, css) => {
  const dark = pal.night || pal.evil;
  return { pal, rnd, css, dark, tone: (t) => css(pal.haze.clone().lerp(pal.top, dark ? Math.min(1, t + 0.25) : t)), land: (t) => css(pal.far.clone().lerp(pal.top, dark ? Math.min(1, t + 0.3) : t)) };
};
const PAINT = {
  // a row of towers: count across the width, the tallest a share of hy; lit windows by night
  towers(g, w, hy, P, count, tallest, t, x0 = 0, x1 = 1) {
    let x = w * x0 - P.rnd() * 20;
    while (x < w * x1) {
      const bw = w / count * (0.6 + P.rnd() * 0.8), bh = hy * tallest * (0.3 + P.rnd() * 0.7);
      g.fillStyle = P.tone(t); g.fillRect(x, hy - bh, bw - 2, bh + 1);
      if (P.dark) { g.fillStyle = P.pal.evil ? '#ff8a5a' : '#ffd98a'; for (let y = hy - bh + 4; y < hy - 3; y += 5) for (let wx = x + 3; wx < x + bw - 5; wx += 5) if (P.rnd() < 0.3) g.fillRect(wx, y, 2, 2); }
      x += bw;
    }
  },
  // rolling hills, a share of hy high
  hills(g, w, hy, P, lift, t, waves = 5, phase = 0) {
    g.fillStyle = P.land(t); g.beginPath(); g.moveTo(0, hy + 1);
    for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, hy - hy * lift * (0.55 + 0.45 * Math.sin(x / w * waves + phase)));
    g.lineTo(w, hy + 1); g.fill();
  },
  // a mountain: peak at x (share of w), a share of hy high, its foot half-width a share of w; snow on its top
  mountain(g, w, hy, P, x, lift, foot, t, snow = 0) {
    const cx = w * x, top = hy - hy * lift, half = w * foot;
    g.fillStyle = P.tone(t); g.beginPath(); g.moveTo(cx - half, hy + 1); g.lineTo(cx - half * 0.12, top + 2); g.lineTo(cx + half * 0.1, top); g.lineTo(cx + half, hy + 1); g.fill();
    if (snow) { g.fillStyle = P.dark ? 'rgba(255,200,190,.5)' : 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(cx - half * 0.12 - half * snow * 0.7, top + 2 + hy * lift * snow); g.lineTo(cx - half * 0.12, top + 2); g.lineTo(cx + half * 0.1, top); g.lineTo(cx + half * 0.1 + half * snow * 0.75, top + hy * lift * snow); g.fill(); }
  },
  // a band of water at the horizon (its height a share of hy)
  water(g, w, hy, P, depth, day, night) { g.fillStyle = P.dark ? night : day; g.fillRect(0, hy - hy * depth, w, hy * depth + 1); g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 14; i++) g.fillRect(P.rnd() * w, hy - hy * depth * P.rnd(), 6 + P.rnd() * 10, 1); },
  // trees along the horizon: kind round | fir | palm | acacia | gum, from x0 to x1 (shares of w), their size in px, the gap
  trees(g, w, hy, P, kind, t, x0, x1, size, gap) {
    g.fillStyle = P.land(t); g.strokeStyle = P.land(t);
    for (let x = w * x0 + P.rnd() * gap; x < w * x1; x += gap * (0.6 + P.rnd() * 0.8)) {
      const s = size * (0.7 + P.rnd() * 0.6);
      if (kind === 'fir') { g.beginPath(); g.moveTo(x - s * 0.3, hy + 1); g.lineTo(x, hy - s * 1.5); g.lineTo(x + s * 0.3, hy + 1); g.fill(); }
      else if (kind === 'palm') { g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, hy); g.quadraticCurveTo(x + s * 0.2, hy - s, x + s * 0.1, hy - s * 1.8); g.stroke(); for (let k = 0; k < 5; k++) { const a = -Math.PI * (0.1 + k * 0.2); g.beginPath(); g.moveTo(x + s * 0.1, hy - s * 1.8); g.quadraticCurveTo(x + s * 0.1 + Math.cos(a) * s * 0.6, hy - s * 1.8 + Math.sin(a) * s * 0.5, x + s * 0.1 + Math.cos(a) * s * 0.9, hy - s * 1.8 + s * 0.25); g.stroke(); } }
      else if (kind === 'acacia') { g.fillRect(x - 0.8, hy - s, 1.6, s); g.beginPath(); g.ellipse(x, hy - s, s * 0.9, s * 0.22, 0, 0, Math.PI * 2); g.fill(); }
      else if (kind === 'gum') { g.fillRect(x - 0.8, hy - s * 1.2, 1.6, s * 1.2); for (const [dx, dy, r] of [[-0.3, 1.3, 0.4], [0.3, 1.5, 0.45], [0, 1.85, 0.4]]) { g.beginPath(); g.arc(x + dx * s, hy - dy * s, r * s, 0, Math.PI * 2); g.fill(); } }
      else { g.fillRect(x - 0.8, hy - s, 1.6, s); g.beginPath(); g.arc(x, hy - s * 1.3, s * 0.6, 0, Math.PI * 2); g.fill(); }
    }
  },
  // a grandstand: x (share), its width (share of w), height (share of hy); seats in bands under a roof
  stand(g, w, hy, P, x, wide, high, t) {
    const x0 = w * x, bw = w * wide, bh = hy * high;
    g.fillStyle = P.tone(t); g.beginPath(); g.moveTo(x0, hy + 1); g.lineTo(x0, hy - bh * 0.3); g.lineTo(x0 + bw * 0.08, hy - bh * 0.85); g.lineTo(x0 + bw, hy - bh * 0.85); g.lineTo(x0 + bw, hy + 1); g.fill();
    g.fillRect(x0 - bw * 0.03, hy - bh, bw * 1.06, bh * 0.08); // (the roof)
    g.fillStyle = P.dark ? 'rgba(90,110,150,.6)' : 'rgba(70,110,170,.5)'; for (let k = 1; k < 4; k++) g.fillRect(x0 + bw * 0.1, hy - bh * 0.82 + k * bh * 0.18, bw * 0.88, 2);
  },
  // houses with pitched roofs, a row of them
  houses(g, w, hy, P, count, t) {
    for (let x = P.rnd() * 10; x < w; x += w / count * (0.8 + P.rnd() * 0.5)) {
      const bw = w / count * 0.55, bh = hy * (0.07 + P.rnd() * 0.04);
      g.fillStyle = P.tone(t); g.fillRect(x, hy - bh, bw, bh + 1);
      g.fillStyle = P.dark ? P.tone(t + 0.15) : ['#a35a48', '#6c6f78', '#8a5a3c'][Math.floor(P.rnd() * 3)]; g.beginPath(); g.moveTo(x - 2, hy - bh); g.lineTo(x + bw / 2, hy - bh - bw * 0.35); g.lineTo(x + bw + 2, hy - bh); g.fill();
      if (P.dark) { g.fillStyle = '#ffd98a'; g.fillRect(x + bw * 0.25, hy - bh * 0.6, 2, 2); }
    }
  },
  // a control tower: a shaft, a cab with a band of glass
  control(g, w, hy, P, x, high, t) {
    const cx = w * x, th = hy * high;
    g.fillStyle = P.tone(t); g.fillRect(cx - 3, hy - th, 6, th + 1); g.fillRect(cx - 9, hy - th - 8, 18, 9); g.fillRect(cx - 7, hy - th - 12, 14, 3);
    g.fillStyle = P.dark ? '#9fd8ff' : 'rgba(80,140,180,.8)'; g.fillRect(cx - 8, hy - th - 6, 16, 3);
  },
  // an airliner's tail fins over a long low terminal
  terminal(g, w, hy, P, t) {
    g.fillStyle = P.tone(t); g.fillRect(w * 0.45, hy - hy * 0.07, w * 0.55, hy * 0.07 + 1);
    for (const [x, s] of [[0.12, 1], [0.3, 0.8], [0.62, 0.9]]) { const cx = w * x, th = hy * 0.16 * s; g.fillStyle = P.tone(t); g.beginPath(); g.moveTo(cx, hy); g.lineTo(cx + th * 0.5, hy - th); g.lineTo(cx + th * 0.85, hy - th); g.lineTo(cx + th * 0.75, hy); g.fill(); g.fillStyle = P.dark ? '#ff5050' : '#c8463a'; g.fillRect(cx + th * 0.55, hy - th * 0.85, th * 0.2, th * 0.25); }
  },
  // a tower crane: mast, jib out to one side, a counter-jib and its weight
  crane(g, w, hy, P, x, high, t, flip = 1) {
    const cx = w * x, th = hy * high;
    g.fillStyle = P.dark ? P.tone(t) : '#d9a82a'; g.fillRect(cx - 1.5, hy - th, 3, th + 1); g.fillRect(cx - th * 0.2 * flip, hy - th, th * 0.8 * flip, 2.5);
    g.fillRect(cx - th * 0.22 * flip - 3 * flip, hy - th - 1, 6 * flip, 5); g.fillRect(cx - 1, hy - th - 6, 2, 6);
    g.strokeStyle = g.fillStyle; g.lineWidth = 0.8; g.beginPath(); g.moveTo(cx, hy - th - 6); g.lineTo(cx + th * 0.6 * flip, hy - th); g.moveTo(cx + th * 0.45 * flip, hy - th); g.lineTo(cx + th * 0.45 * flip, hy - th * 0.6); g.stroke();
    if (P.dark) { g.fillStyle = '#ff4030'; g.fillRect(cx - 1, hy - th - 8, 2, 2); }
  },
  // frames of a building going up: a grid of floors and columns, unclad
  frame(g, w, hy, P, x, wide, high, t) {
    const x0 = w * x, bw = w * wide, bh = hy * high; g.fillStyle = P.tone(t);
    for (let y = 0; y <= bh; y += bh / 6) g.fillRect(x0, hy - y - 1, bw, 1.5);
    for (let k = 0; k <= 4; k++) g.fillRect(x0 + k * bw / 4 - 0.8, hy - bh, 1.6, bh);
  },
  // the Marina Bay towers: three slabs under one long deck, and the supertrees' funnels
  marina(g, w, hy, P, x, t) {
    const cx = w * x, th = hy * 0.5, tw = w * 0.05; g.fillStyle = P.tone(t);
    for (let k = 0; k < 3; k++) g.fillRect(cx + k * tw * 1.4, hy - th, tw, th + 1);
    g.beginPath(); g.moveTo(cx - tw * 0.6, hy - th - 2); g.lineTo(cx + tw * 4.6, hy - th - 4); g.lineTo(cx + tw * 4.4, hy - th + 2); g.lineTo(cx - tw * 0.6, hy - th + 2); g.fill();
    g.fillStyle = P.dark ? '#c06aff' : P.land(0.4);
    for (const [dx, s] of [[-0.2, 1], [-0.12, 0.8], [-0.05, 1.1]]) { const bx = cx + w * dx, bh = hy * 0.22 * s; g.fillRect(bx - 1, hy - bh, 2, bh); g.beginPath(); g.moveTo(bx - 1, hy - bh); g.lineTo(bx - bh * 0.25, hy - bh * 1.18); g.lineTo(bx + bh * 0.25, hy - bh * 1.18); g.lineTo(bx + 1, hy - bh); g.fill(); }
  },
  // Parliament House on its hill: a long low front in the grass, the four-legged flagpole over it
  parliament(g, w, hy, P, x, t) {
    const cx = w * x; g.fillStyle = P.land(t);
    g.beginPath(); g.ellipse(cx, hy, w * 0.22, hy * 0.08, 0, Math.PI, 0); g.fill();
    g.fillStyle = P.tone(t + 0.1); g.fillRect(cx - w * 0.1, hy - hy * 0.1, w * 0.2, hy * 0.04);
    g.strokeStyle = P.tone(t + 0.2); g.lineWidth = 1.3; const top = hy - hy * 0.42, base = hy - hy * 0.09;
    g.beginPath(); g.moveTo(cx - 9, base); g.lineTo(cx, top); g.lineTo(cx + 9, base); g.moveTo(cx - 4, base); g.lineTo(cx, top); g.lineTo(cx + 4, base); g.stroke();
    g.fillStyle = P.dark ? '#5a6a8a' : '#2a4aa0'; g.fillRect(cx, top, 9, 5); g.fillStyle = '#d33'; g.fillRect(cx, top, 3, 2);
  },
  // the Biosphère: a lattice dome on the far bank
  dome(g, w, hy, P, x, r, t) {
    const cx = w * x, R = hy * r; g.strokeStyle = P.tone(t); g.lineWidth = 1;
    g.beginPath(); g.arc(cx, hy, R, Math.PI, 0); g.stroke();
    for (let k = 1; k < 4; k++) { g.beginPath(); g.ellipse(cx, hy, R * k / 4, R, 0, Math.PI, 0); g.stroke(); g.beginPath(); g.moveTo(cx - R * Math.sqrt(1 - (k / 4) ** 2), hy - R * k / 4); g.lineTo(cx + R * Math.sqrt(1 - (k / 4) ** 2), hy - R * k / 4); g.stroke(); }
  },
  // Tokyo Tower: a red lattice spire with white bands, two decks
  spire(g, w, hy, P, x, high) {
    const cx = w * x, th = hy * high; g.fillStyle = P.pal.evil ? '#a8302a' : '#e0452c';
    g.beginPath(); g.moveTo(cx - th * 0.18, hy); g.lineTo(cx - 1, hy - th); g.lineTo(cx + 1, hy - th); g.lineTo(cx + th * 0.18, hy); g.lineTo(cx + th * 0.1, hy); g.lineTo(cx, hy - th * 0.3); g.lineTo(cx - th * 0.1, hy); g.fill();
    g.fillStyle = '#f2efe8'; for (const k of [0.45, 0.72]) g.fillRect(cx - th * 0.18 * (1 - k) - 2, hy - th * k, th * 0.36 * (1 - k) + 4, 3);
    if (P.dark) { g.fillStyle = 'rgba(255,170,90,.35)'; g.beginPath(); g.arc(cx, hy - th * 0.6, th * 0.25, 0, Math.PI * 2); g.fill(); }
  },
  // neon signs on the nearer towers (by night)
  neon(g, w, hy, P, count) { if (!P.dark) return; for (let i = 0; i < count; i++) { g.fillStyle = ['#ff3fa4', '#34e1ff', '#ffd23f', '#9b5cff'][i % 4]; g.fillRect(P.rnd() * w, hy - hy * (0.1 + P.rnd() * 0.3), 3, 8 + P.rnd() * 10); } },
  // a lighthouse on a headland
  lighthouse(g, w, hy, P, x, high, t) {
    const cx = w * x, th = hy * high; g.fillStyle = P.land(t); g.beginPath(); g.moveTo(cx - w * 0.16, hy + 1); g.quadraticCurveTo(cx - w * 0.05, hy - hy * 0.12, cx + w * 0.04, hy - hy * 0.1); g.lineTo(cx + w * 0.08, hy + 1); g.fill();
    const base = hy - hy * 0.1; g.fillStyle = '#f2f0ea'; g.beginPath(); g.moveTo(cx - 4, base); g.lineTo(cx - 2.5, base - th); g.lineTo(cx + 2.5, base - th); g.lineTo(cx + 4, base); g.fill();
    g.fillStyle = '#c8392e'; for (const k of [0.25, 0.6]) g.fillRect(cx - 3.6 + k * 1.2, base - th * k - 3, 7.2 - k * 2.4, 4); g.fillRect(cx - 3, base - th - 4, 6, 4);
    if (P.dark) { g.fillStyle = 'rgba(255,240,170,.4)'; g.beginPath(); g.moveTo(cx, base - th - 2); g.lineTo(cx + w * 0.3, base - th - 14); g.lineTo(cx + w * 0.3, base - th + 8); g.fill(); }
  },
  // sails out on the water
  sails(g, w, hy, P, count) { for (let i = 0; i < count; i++) { const x = P.rnd() * w, s = 5 + P.rnd() * 6, y = hy - 2 - P.rnd() * 4; g.fillStyle = P.dark ? 'rgba(200,210,230,.4)' : '#f4f4f0'; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.6); g.lineTo(x + s, y); g.fill(); g.fillStyle = P.tone(0.6); g.fillRect(x - s * 0.3, y, s * 1.5, 2); } },
  // ruins: broken walls with gaps for windows, jagged tops
  ruins(g, w, hy, P, count, t) {
    for (let x = P.rnd() * 20; x < w; x += w / count * (0.8 + P.rnd() * 0.6)) {
      const bw = w / count * 0.6, bh = hy * (0.12 + P.rnd() * 0.2); g.fillStyle = P.tone(t); g.beginPath(); g.moveTo(x, hy + 1); g.lineTo(x, hy - bh);
      for (let k = 1; k <= 4; k++) g.lineTo(x + bw * k / 4, hy - bh * (0.5 + P.rnd() * 0.5)); g.lineTo(x + bw, hy + 1); g.fill();
      g.fillStyle = P.tone(0); for (let k = 0; k < 3; k++) g.fillRect(x + bw * (0.15 + k * 0.28), hy - bh * 0.45, bw * 0.12, bh * 0.15);
    }
  },
  // smoke rising: puffs leaning with the wind
  smoke(g, w, hy, P, x, high) { g.fillStyle = P.dark ? 'rgba(60,45,45,.55)' : 'rgba(90,85,80,.45)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * x + i * 5, hy - hy * high * i / 6, 4 + i * 2.5, 0, Math.PI * 2); g.fill(); } },
  // flames on the horizon, and spires of black rock
  flames(g, w, hy, P) {
    const glow = g.createLinearGradient(0, hy * 0.5, 0, hy); glow.addColorStop(0, 'rgba(255,90,20,0)'); glow.addColorStop(1, 'rgba(255,110,30,.7)'); g.fillStyle = glow; g.fillRect(0, hy * 0.5, w, hy * 0.5);
    g.fillStyle = '#ff7a1a'; for (let x = 0; x < w; x += 4 + P.rnd() * 5) { const f = hy * (0.03 + P.rnd() * 0.08); g.beginPath(); g.moveTo(x - 3, hy + 1); g.lineTo(x, hy - f); g.lineTo(x + 3, hy + 1); g.fill(); }
    g.fillStyle = '#1a0a08'; for (const [x, s] of [[0.1, 0.5], [0.22, 0.32], [0.7, 0.6], [0.86, 0.38]]) { const cx = w * x, th = hy * s; g.beginPath(); g.moveTo(cx - th * 0.12, hy + 1); g.lineTo(cx - th * 0.03, hy - th); g.lineTo(cx + th * 0.04, hy - th * 0.85); g.lineTo(cx + th * 0.14, hy + 1); g.fill(); }
  },
  // the oil field: a flat horizon of nodding donkeys, a derrick or two, a tank battery, a flare stack burning
  oilfield(g, w, hy, P) {
    const far = P.tone(0.35), near = P.tone(0.6);
    g.fillStyle = P.land(0.15); g.fillRect(0, hy - hy * 0.02, w, hy * 0.02 + 1);
    const donkey = (x, s, t) => { g.fillStyle = P.tone(t); g.fillRect(x - 0.6, hy - s * 1.3, 1.6, s * 1.3); g.fillRect(x - s * 1.25, hy - s * 1.45, s * 2.3, 1.8); g.fillRect(x + s * 0.95, hy - s * 1.45, 1.8, s * 0.85); g.fillRect(x - s * 1.4, hy - 1.5, s * 2.6, 1.5); };
    for (let x = P.rnd() * 12; x < w; x += 18 + P.rnd() * 26) donkey(x, 4 + P.rnd() * 3, 0.3);
    const derrick = (x, th) => { g.strokeStyle = near; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - th * 0.17, hy); g.lineTo(x - 1.2, hy - th); g.lineTo(x + 1.2, hy - th); g.lineTo(x + th * 0.17, hy); g.stroke();
      g.lineWidth = 0.7; for (let k = 1; k < 6; k++) { const y = hy - th * k / 6, hw = th * 0.17 * (1 - k / 6) + 1.2; g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x + hw, y); g.lineTo(x - hw - th * 0.03, y + th / 6); g.stroke(); } g.fillStyle = near; g.fillRect(x - 3, hy - th - 3, 6, 3); };
    derrick(w * 0.2, hy * 0.5); derrick(w * 0.86, hy * 0.36);
    g.fillStyle = far; for (let k = 0; k < 4; k++) g.fillRect(w * 0.5 + k * hy * 0.075, hy - hy * 0.1, hy * 0.065, hy * 0.1 + 1);
    const fx = w * 0.66, fh = hy * 0.42; g.fillStyle = near; g.fillRect(fx - 1, hy - fh, 2, fh);
    g.fillStyle = P.dark ? 'rgba(255,140,40,.95)' : 'rgba(255,150,50,.9)'; g.beginPath(); g.ellipse(fx + 1, hy - fh - 6, 3, 7, 0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,240,180,.9)'; g.beginPath(); g.ellipse(fx + 0.5, hy - fh - 3.5, 1.4, 3, 0.2, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 3; k++) donkey(w * (0.08 + k * 0.38) + P.rnd() * 20, 8 + P.rnd() * 3, 0.65);
  },
  // space: a black sky full of stars, a ringed planet, the land a grey regolith
  space(g, w, hy, P, h) {
    const sky = g.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, '#03040a'); sky.addColorStop(1, P.pal.evil ? '#2a0c14' : '#141a30'); g.fillStyle = sky; g.fillRect(0, 0, w, hy);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + P.rnd() * 0.7})`; g.fillRect(P.rnd() * w, P.rnd() * hy, 1 + (P.rnd() < 0.1), 1 + (P.rnd() < 0.1)); }
    const px = w * 0.72, py = hy * 0.35, r = Math.min(w, hy) * 0.16;
    g.fillStyle = '#d98a4a'; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(px + r * 0.35, py + r * 0.2, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(240,210,170,.8)'; g.lineWidth = 2; g.beginPath(); g.ellipse(px, py, r * 1.7, r * 0.35, -0.3, 0, Math.PI * 2); g.stroke();
    const land = g.createLinearGradient(0, hy, 0, h); land.addColorStop(0, '#2c2f38'); land.addColorStop(1, '#4a4d56'); g.fillStyle = land; g.fillRect(0, hy, w, h - hy);
    g.fillStyle = '#3a3d47'; for (let i = 0; i < 6; i++) { const cx = P.rnd() * w; g.beginPath(); g.ellipse(cx, hy + 3 + P.rnd() * 10, 8 + P.rnd() * 14, 2 + P.rnd() * 2, 0, 0, Math.PI * 2); g.fill(); }
  },
};

// ---- small models of shared shapes (kit.js), where the game has none fitting
const tyres = () => { const g = group(); for (const [x, z, n] of [[0, 0, 4], [0.68, 0.1, 3], [0.34, 0.6, 2]]) for (let k = 0; k < n; k++) { piece(g, CYL, 0x1c1c1e, x, 0.15 + k * 0.3, z, 0.66, 0.28, 0.66); if (k === n - 1) piece(g, CYL, 0xe8e8e8, x, 0.3 + k * 0.3, z, 0.3, 0.02, 0.3); } return g; };
const armco = () => { const g = group(); for (let k = 0; k < 4; k++) piece(g, BOX, 0x8a8d92, k * 1.2 - 1.8, 0.4, 0, 0.1, 0.8, 0.1); for (const y of [0.45, 0.7]) piece(g, BOX, 0xc9ccd0, 0, y, 0.07, 4, 0.18, 0.04); return g; };
const kerb = () => { const g = group(); for (let k = 0; k < 8; k++) piece(g, BOX, k % 2 ? 0xf2f2f2 : 0xd62a2a, k * 0.6 - 2.1, 0.06, 0, 0.6, 0.12, 0.9); return g; };
const board = (n) => () => { const g = group(); for (const x of [-0.45, 0.45]) piece(g, BOX, 0x9a9da3, x, 0.7, 0, 0.08, 1.4, 0.08); piece(g, BOX, 0xf4f4f4, 0, 1.25, 0, 1.2, 0.8, 0.06); for (let k = 0; k < n; k++) piece(g, BOX, 0x1a1a1a, -0.3 + k * 0.3, 1.25, 0.04, 0.12, 0.5, 0.02); return g; };
const buoy = (c) => () => { const g = group(); piece(g, CYL, c, 0, 0.5, 0, 0.9, 1.0, 0.9); piece(g, CYL, c, 0, 1.25, 0, 0.35, 0.9, 0.35); piece(g, BOX, 0xf2f2f2, 0, 0.75, 0, 0.92, 0.2, 0.92); piece(g, BALL, 0xffd23f, 0, 1.8, 0, 0.3, 0.3, 0.3); return g; };
const ring = () => { const g = group(); piece(g, BOX, 0x8a6a45, 0, 0.6, 0, 0.12, 1.2, 0.12); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; piece(g, BOX, k % 2 ? 0xf2f2f2 : 0xe2452c, Math.cos(a) * 0.32, 1.0 + Math.sin(a) * 0.32, 0.08, 0.18, 0.24, 0.12, 0, 0, a); } return g; };
const vending = (c) => () => { const g = group(); piece(g, BOX, c, 0, 0.95, 0, 1.0, 1.9, 0.8); piece(g, BOX, 0xeaf6ff, 0, 1.25, 0.41, 0.8, 0.8, 0.02); for (let k = 0; k < 4; k++) piece(g, BOX, [0xe2452c, 0x2f7de1, 0x3fae4a, 0xffd23f][k], -0.27 + k * 0.18, 1.25, 0.43, 0.1, 0.5, 0.02); piece(g, BOX, 0x1a1a1a, 0, 0.35, 0.41, 0.6, 0.18, 0.02); return g; };
const lantern = () => { const g = group(); piece(g, BOX, 0x3a2c20, 0, 1.0, 0, 0.1, 2.0, 0.1); piece(g, BOX, 0x3a2c20, 0.3, 1.95, 0, 0.7, 0.08, 0.08); piece(g, BALL, 0xe2302a, 0.55, 1.55, 0, 0.5, 0.7, 0.5); for (const y of [1.2, 1.9]) piece(g, CYL, 0x1a1a1a, 0.55, y, 0, 0.3, 0.06, 0.3); return g; };
const picket = () => { const g = group(); for (let k = 0; k < 9; k++) piece(g, BOX, 0xf4f2ec, k * 0.4 - 1.6, 0.5, 0, 0.12, 1.0, 0.05); for (const y of [0.35, 0.75]) piece(g, BOX, 0xf4f2ec, 0, y, -0.04, 3.4, 0.08, 0.04); return g; };
const letterbox = () => { const g = group(); piece(g, BOX, 0x6e5232, 0, 0.55, 0, 0.1, 1.1, 0.1); piece(g, BOX, 0xc8392e, 0, 1.2, 0, 0.35, 0.3, 0.5); piece(g, BOX, 0xf2c21d, 0.18, 1.3, 0.15, 0.03, 0.18, 0.05); return g; };
const sandbags = () => OBSTACLE_MODELS.sackStack({ hw: 1.1, hl: 1.1, height: 1.5 });
const opt = (kind, o) => () => OBSTACLE_MODELS[kind](o);
// the oil field's: a stack of oil drums, a little nodding donkey, a valve wheel on its post, a length of pipe on chocks
const drums = () => { const g = group(); for (const [x, z, y, c] of [[0, 0, 0, 0x2f5f8f], [0.66, 0.1, 0, 0xc8321f], [0.33, 0.62, 0, 0x2f5f8f], [0.33, 0.24, 0.9, 0xd8a228]]) { piece(g, CYL, c, x, y + 0.44, z, 0.6, 0.88, 0.6); for (const k of [0.3, 0.6]) piece(g, CYL, 0x1c1c1e, x, y + k, z, 0.62, 0.04, 0.62); } return g; };
const donkey = () => { const g = group(), paint = 0x2f5a3a, steel = 0x4c5157;
  piece(g, BOX, steel, 0, 0.1, -0.2, 0.5, 0.2, 2.8);
  for (const x of [-1, 1]) for (const z of [-1, 1]) piece(g, BOX, paint, x * 0.16, 0.85, z * 0.2, 0.07, 1.5, 0.07, -z * 0.14, 0, x * 0.1);
  piece(g, BOX, paint, 0, 1.68, 0.05, 0.14, 0.18, 2.2, 0.18); piece(g, BOX, paint, 0, 1.45, 1.15, 0.18, 0.75, 0.32, 0.18);
  piece(g, BOX, steel, 0, 0.6, -0.95, 0.28, 0.5, 0.5); for (const x of [-1, 1]) { piece(g, BOX, 0x8a3b26, x * 0.2, 0.6, -0.78, 0.1, 0.32, 0.3); piece(g, BOX, steel, x * 0.24, 1.1, -0.9, 0.05, 0.9, 0.05); }
  piece(g, CYL, 0x9da3a8, 0, 0.25, 1.25, 0.1, 0.5, 0.1); piece(g, BOX, 0x2a2c30, 0, 0.75, 1.3, 0.02, 0.6, 0.02); return g; };
const valve = () => { const g = group(); piece(g, CYL, 0x8e9499, 0, 0.5, 0, 0.16, 1.0, 0.16); piece(g, CYL, 0x8e9499, 0, 0.2, 0, 0.5, 0.4, 0.5);
  piece(g, CYL, 0xc8321f, 0, 1.04, 0, 0.62, 0.05, 0.62); piece(g, CYL, 0x1c1c1e, 0, 1.07, 0, 0.44, 0.05, 0.44); for (let k = 0; k < 3; k++) piece(g, BOX, 0xc8321f, 0, 1.09, 0, 0.5, 0.03, 0.04, 0, k * Math.PI / 3, 0); return g; };
const pipe = () => { const g = group(); for (const z of [-0.9, 0.9]) piece(g, BOX, 0x6b5238, 0, 0.08, z, 0.9, 0.16, 0.2); piece(g, CYL, 0x8e9499, 0, 0.42, 0, 0.5, 2.8, 0.5, Math.PI / 2); piece(g, CYL, 0x5a6067, 0, 0.42, 1.43, 0.56, 0.08, 0.56, Math.PI / 2); return g; };
const MODELS = { drums, donkey, valve, pipe, tyres, armco, kerb, board3: board(3), board2: board(2), buoyRed: buoy(0xd8352a), buoyGreen: buoy(0x2e8a4a), ring, vendRed: vending(0xd8352a), vendBlue: vending(0x2f6ac0), lantern, picket, letterbox, sandbags,
  umbrella: opt('umbrella', { hw: 0.9, hl: 0.9, height: 2.3 }), rockBig: opt('rock', { r: 0.8 }), rockSmall: opt('rock', { r: 0.5 }),
  asteroidBig: opt('asteroid', { r: 0.9 }), asteroidSmall: opt('asteroid', { r: 0.55 }), brimBig: opt('brimstone', { hw: 0.5, hl: 0.5, height: 1.6 }) };

// ---- the themes: sky (painter, numbers...), props [model, side, depth, turn, scale, kind of box], plinth, ground
const CIRCUIT_PROPS = [['tyres', -0.85, 1.8, 0.3, 1], ['board3', 0.8, 1.6, -0.5, 1], ['kerb', -0.2, 4.4, 0, 1], ['armco', 0.95, 0.3, -0.2, 1], ['board2', -0.98, 0.2, 0.6, 1]];
const TABLE = {
  singapore: { sky: [['towers', 10, 0.55, 0.35], ['marina', 0.55, 0.65], ['trees', 'palm', 0.5, 0, 1, 7, 26]],
    props: [['hawkerCart', -0.85, 1.9, 0.5, 1], ['palmPot', 0.82, 1.6, 0, 1, 'bale'], ['bench', 0.98, 0.2, -0.4, 1, 'crate'], ['planter', 0.35, 4.8, 0, 1, 'bale'], ['bin', -0.98, 0.3, 0, 1, 'cone']] },
  coast: { sky: [['water', 0.08, 'rgba(60,120,170,.75)', 'rgba(20,40,70,.8)'], ['lighthouse', 0.78, 0.3, 0.45], ['sails', 3], ['hills', 0.05, 0.2, 4]],
    props: [['umbrella', -0.82, 1.9, 0, 1], ['cooler', 0.8, 1.4, -0.3, 1, 'crate'], ['surfboard', 0.98, 0.3, 0.4, 1, 'cone'], ['chair', 0.4, 4.6, 0.3, 1, 'crate'], ['ring', -0.98, 0.3, 0.5, 1]], plinth: () => 0x8a7a62 },
  safari: { sky: [['mountain', 0.7, 0.45, 0.32, 0.3, 0.28], ['hills', 0.06, 0.25, 3], ['trees', 'acacia', 0.55, 0, 1, 9, 40]],
    props: [['zebra', -0.85, 2.0, 0.9, 0.9], ['termiteMound', 0.82, 1.6, 0, 1, 'cone'], ['rockBig', 0.97, 0.3, 0, 1], ['wildebeest', 0.3, 5.2, -0.8, 0.9], ['rockSmall', -0.98, 0.3, 0, 1]], plinth: () => 0x7a5a3a },
  construction: { sky: [['towers', 8, 0.35, 0.3], ['frame', 0.15, 0.22, 0.5, 0.5], ['frame', 0.6, 0.18, 0.4, 0.55], ['crane', 0.3, 0.75, 0.6, 1], ['crane', 0.82, 0.6, 0.6, -1]],
    props: [['pipePallet', -0.85, 1.8, 0.4, 1, 'crate'], ['cableReel', 0.82, 1.5, -0.3, 1, 'crate'], ['barrow', 0.98, 0.3, 0.6, 1], ['sandPile', 0.35, 4.8, 0, 1, 'bale'], ['trafficDrum', -0.98, 0.3, 0, 1, 'cone']] },
  airport: { sky: [['terminal', 0.55], ['control', 0.82, 0.42, 0.85], ['hills', 0.03, 0.2, 3]],
    props: [['tug', -0.85, 1.9, 0.6, 1], ['luggageCart', 0.82, 1.6, -0.4, 1, 'bale'], ['cone', 0.98, 0.3, 0, 1], ['velvetRope', 0.35, 4.8, 0, 1, 'barrier'], ['cone', -0.98, 0.3, 0, 1]] },
  canberra: { sky: [['water', 0.05, 'rgba(90,140,180,.7)', 'rgba(20,40,70,.8)'], ['parliament', 0.62, 0.35], ['trees', 'gum', 0.45, 0, 0.4, 7, 26], ['trees', 'gum', 0.45, 0.85, 1, 7, 26]],
    props: [['kangaroo', -0.85, 1.9, 0.8, 1], ['rockBig', 0.82, 1.6, 0, 1], ['dropBear', 0.98, 0.3, -0.6, 1], ['kangaroo', 0.35, 5.0, -0.5, 0.9], ['bench', -0.98, 0.3, 0.4, 1, 'crate']] },
  suburb: { sky: [['houses', 7, 0.4], ['trees', 'round', 0.4, 0, 1, 6, 30]],
    props: [['picket', -0.8, 2.0, 0.2, 1], ['wheelieBin', 0.82, 1.5, -0.3, 1, 'cone'], ['letterbox', 0.98, 0.3, -0.5, 1], ['planter', 0.35, 4.8, 0, 1, 'bale'], ['wheelieBin', -0.98, 0.3, 0.3, 1, 'cone']] },
  battlefield: { sky: [['ruins', 7, 0.45], ['smoke', 0.3, 0.6], ['smoke', 0.72, 0.45]],
    props: [['wreck', -0.85, 2.0, 0.8, 0.9, 'crate'], ['sandbags', 0.82, 1.5, -0.3, 1], ['fuelDrum', 0.98, 0.3, 0, 1, 'crate'], ['fuelDrum', 0.35, 5.0, 0, 1, 'crate'], ['sandbags', -0.98, 0.3, 0.4, 1]], plinth: () => 0x55493a },
  bathurst: { sky: [['hills', 0.3, 0.3, 2, 1.2], ['hills', 0.1, 0.45, 5], ['trees', 'gum', 0.55, 0, 1, 6, 22], ['stand', 0.6, 0.25, 0.22, 0.8]],
    props: [['tyres', -0.85, 1.8, 0.3, 1], ['board3', 0.8, 1.6, -0.5, 1], ['kangaroo', 0.3, 4.8, -0.6, 0.9], ['armco', 0.95, 0.3, -0.2, 1], ['kerb', -0.98, 0.2, 0.6, 0.7]] },
  monza: { sky: [['trees', 'round', 0.35, 0, 1, 9, 14], ['stand', 0.45, 0.5, 0.3, 0.85]], props: CIRCUIT_PROPS },
  spa: { sky: [['hills', 0.32, 0.3, 3], ['trees', 'fir', 0.5, 0, 1, 8, 9], ['stand', 0.62, 0.3, 0.24, 0.85]], props: CIRCUIT_PROPS },
  'albert-park': { sky: [['towers', 9, 0.55, 0.35, 0.45, 1], ['water', 0.05, 'rgba(70,130,170,.7)', 'rgba(20,40,70,.8)'], ['trees', 'palm', 0.5, 0, 0.45, 7, 22], ['stand', 0.05, 0.3, 0.24, 0.85]], props: CIRCUIT_PROPS },
  montreal: { sky: [['towers', 10, 0.5, 0.35, 0.5, 1], ['water', 0.06, 'rgba(70,120,160,.7)', 'rgba(20,40,70,.8)'], ['dome', 0.25, 0.28, 0.6], ['trees', 'round', 0.45, 0, 1, 6, 26]], props: CIRCUIT_PROPS },
  sea: { sky: [['hills', 0.08, 0.3, 3], ['water', 0.04, 'rgba(40,120,160,.8)', 'rgba(20,40,70,.8)'], ['lighthouse', 0.22, 0.28, 0.4], ['sails', 4]],
    props: [['buoyRed', -0.85, 1.8, 0, 1], ['mooringPosts', 0.82, 1.6, 0, 1, 'crate'], ['buoyGreen', 0.98, 0.3, 0, 1], ['buoyGreen', 0.3, 5, 0, 1], ['ring', -0.98, 0.3, 0.5, 1]], plinth: () => 0x7a5a3a },
  space: { sky: [['space']], props: [['asteroidBig', -0.85, 1.9, 0, 1], ['supplyPod', 0.82, 1.5, -0.3, 1, 'crate'], ['asteroidSmall', 0.98, 0.3, 0, 1], ['flagStand', 0.3, 5, 0, 1, 'cone'], ['asteroidSmall', -0.98, 0.3, 0, 0.8]],
    plinth: () => 0x3a3d47, ground: () => 0x3a3d47 },
  tokyo: { sky: [['towers', 10, 0.6, 0.45], ['spire', 0.3, 0.7], ['neon', 14]],
    props: [['vendRed', -0.85, 1.7, 0.4, 1], ['vendBlue', -0.6, 2.6, 0.4, 1], ['lantern', 0.82, 1.5, -0.3, 1], ['trafficDrum', 0.98, 0.3, 0, 1, 'cone'], ['bin', -0.98, 0.3, 0, 1, 'cone']] },
  oilfield: { sky: [['oilfield']], props: [['donkey', -0.85, 2.0, 0.9, 1], ['drums', 0.8, 1.5, -0.3, 1], ['valve', 0.98, 0.3, 0, 1], ['pipe', 0.35, 4.8, 0.3, 1], ['valve', -0.98, 0.3, 0.5, 0.8]], plinth: () => 0xb7a27a },
  hell: { sky: [['flames']], props: [['brimBig', -0.82, 1.8, 0, 1], ['lavaRock', 0.82, 1.5, 0, 1, 'cone'], ['brimstone', 0.98, 0.3, 0, 1, 'cone'], ['brimBig', 0.3, 5, 0.5, 1.3], ['brimstone', -0.98, 0.3, 0, 1, 'cone']], plinth: () => 0x241010 },
};
TABLE.panorama = TABLE.bathurst; // (the same mountain)
TABLE.singaporeNight = TABLE.singapore; // (its night is in the palette)
// lavaRock wants a size: a medium one for hell
MODELS.lavaRock = opt('lavaRock', { r: 0.6 });

// the stage of a theme from the table (carstage.js: { skyline, props, models, plinth, ground })
export const stageOf = (name) => {
  const T = TABLE[name];
  if (!T) return null;
  return {
    skyline(g, w, h, hy, pal, rnd, css) { const P = P_(pal, rnd, css); for (const [painter, ...n] of T.sky) PAINT[painter](g, w, hy, P, ...(painter === 'space' ? [h] : n)); },
    props: T.props, models: MODELS, plinth: T.plinth, ground: T.ground,
  };
};
