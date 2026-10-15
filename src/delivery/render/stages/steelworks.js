// ---- the steelworks' car stage (render/carstage.js): sheds, chimneys and two cooling towers on the horizon, smoke over
// them, the furnaces' glow by night (and on the Evil side). Its props are the theme's own obstacles (themes.js)
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil, near = css(pal.haze.clone().lerp(pal.top, dark ? 0.85 : 0.7)), far = css(pal.haze.clone().lerp(pal.top, 0.4));
    if (dark) { const glow = g.createLinearGradient(0, hy - hy * 0.5, 0, hy); glow.addColorStop(0, 'rgba(255,120,40,0)'); glow.addColorStop(1, 'rgba(255,120,40,.45)'); g.fillStyle = glow; g.fillRect(0, hy - hy * 0.5, w, hy * 0.5); }
    g.fillStyle = far; // (sheds far off, their saw-tooth roofs)
    for (let x = 0; x < w; x += 10) g.fillRect(x, hy - hy * 0.12 - (x / 10 % 2) * 3, 10, hy * 0.12 + 4);
    const tower = (x, r, th) => { // a cooling tower: waisted
      g.fillStyle = near; g.beginPath(); g.moveTo(x - r, hy); g.quadraticCurveTo(x - r * 0.45, hy - th * 0.6, x - r * 0.62, hy - th); g.lineTo(x + r * 0.62, hy - th); g.quadraticCurveTo(x + r * 0.45, hy - th * 0.6, x + r, hy); g.fill();
    };
    tower(w * 0.18, hy * 0.2, hy * 0.42);
    tower(w * 0.3, hy * 0.17, hy * 0.36);
    g.fillStyle = near; // chimneys, and the long shed of the melt shop
    for (const [x, t] of [[0.55, 0.7], [0.6, 0.62], [0.82, 0.55]]) g.fillRect(w * x, hy - hy * t, 4, hy * t);
    g.fillRect(w * 0.42, hy - hy * 0.22, w * 0.5, hy * 0.22 + 1);
    g.fillStyle = dark ? 'rgba(90,60,55,.55)' : 'rgba(235,225,215,.6)'; // smoke from the chimneys
    for (const [x, t] of [[0.55, 0.7], [0.6, 0.62], [0.82, 0.55]]) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(w * x + 2 + i * 7, hy - hy * t - 4 - i * 5, 4 + i * 2.2, 0, Math.PI * 2); g.fill(); }
    if (dark) { g.fillStyle = '#ffa040'; for (let i = 0; i < 9; i++) g.fillRect(w * 0.44 + rnd() * w * 0.46, hy - hy * 0.2 + rnd() * hy * 0.14, 3, 2); }
  },
};
