// ---- the city's car stage (render/carstage.js): a skyline of towers in the haze, street furniture by the plinth --------
// skyline(g, w, h, hy, pal, rnd, css): paint over the sky, standing on the horizon at hy (px). pal: the stage's colours
// (THREE.Color: top, haze, ground, far; night, evil). rnd: a seeded random (the same skyline every time).
// props: [model kind, side, depth, turn, scale, kind of box]: see carstage.js SLOTS. No figures, no generic crates.
const towers = (g, w, hy, rnd, colour, lit, count, tallest) => {
  let x = -rnd() * 20;
  while (x < w) {
    const bw = w / count * (0.6 + rnd() * 0.8), bh = hy * tallest * (0.25 + rnd() * 0.75);
    g.fillStyle = colour;
    g.fillRect(x, hy - bh, bw - 2, bh + 1);
    if (lit) { // (lit windows: a few dots)
      g.fillStyle = lit;
      for (let y = hy - bh + 4; y < hy - 3; y += 5) for (let wx = x + 3; wx < x + bw - 5; wx += 5) if (rnd() < 0.3) g.fillRect(wx, y, 2, 2);
    }
    x += bw;
  }
};
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil;
    towers(g, w, hy, rnd, css(pal.haze.clone().lerp(pal.top, 0.4)), null, 9, 0.75);
    towers(g, w, hy, rnd, css(pal.haze.clone().lerp(pal.top, dark ? 0.8 : 0.7)), dark ? (pal.evil ? '#ff8a5a' : '#ffd98a') : null, 6, 0.5);
  },
  props: [['planter', -0.8, 1.9, 0.3, 1, 'bale'], ['bench', 0.82, 1.5, -0.5, 1, 'crate'], ['bin', 0.95, -1.5, 0, 1, 'cone'], ['bin', 0.55, 3.6, 0, 1, 'cone'], ['planter', -0.4, 5, 0, 1, 'bale']],
};
