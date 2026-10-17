// ---- the alpine pass's car stage (render/carstage.js): two ranges of peaks with snow on them, a line of firs at their
// feet. Its props are the theme's own obstacles (themes.js: cheese wheels, a woodpile, a milk churn, a block of snow)
const range = (g, w, hy, rnd, top, colour, snow, peaks) => {
  const pts = [[0, hy]];
  for (let i = 0; i <= peaks; i++) pts.push([w * i / peaks + (rnd() - 0.5) * w / peaks * 0.5, hy - hy * top * (0.45 + rnd() * 0.55)]);
  pts.push([w, hy]);
  g.fillStyle = colour;
  g.beginPath(); for (const [x, y] of pts) g.lineTo(x, y); g.fill();
  if (!snow) return;
  g.fillStyle = snow; // (a cap on each peak: the top fifth of it)
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], d = (hy - y) * 0.22;
    g.beginPath(); g.moveTo(x - d * 0.9, y + d); g.lineTo(x, y); g.lineTo(x + d * 0.9, y + d); g.lineTo(x + d * 0.3, y + d * 0.7); g.lineTo(x - d * 0.2, y + d * 1.05); g.fill();
  }
};
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil;
    range(g, w, hy, rnd, 0.85, css(pal.haze.clone().lerp(pal.top, 0.3)), dark ? 'rgba(255,190,170,.6)' : 'rgba(255,255,255,.9)', 5);
    range(g, w, hy, rnd, 0.45, css(pal.far.clone().lerp(pal.top, dark ? 0.6 : 0.25)), dark ? null : 'rgba(250,252,255,.75)', 7);
    g.fillStyle = css(pal.ground.clone().lerp(pal.top, dark ? 0.6 : 0.35)); // (firs)
    for (let x = rnd() * 6; x < w; x += 5 + rnd() * 9) { const t = 6 + rnd() * 9; g.beginPath(); g.moveTo(x - t * 0.3, hy + 1); g.lineTo(x, hy - t); g.lineTo(x + t * 0.3, hy + 1); g.fill(); }
  },
  // (the theme's own obstacles where the plain slots put them, named here so alpineDusk, which has no obstacle list, has them too)
  props: [['woodpile', -0.8, 1.9, 0.5, 1, 'bale'], ['cheeseWheels', 0.82, 1.5, -0.4, 1, 'crate'], ['milkChurn', 0.95, -1.5, 0.3, 1, 'cone'], ['milkChurn', 0.55, 3.6, 0.2, 1, 'cone'], ['snowBlock', -0.4, 5, 0.1, 1, 'barrier']],
};
