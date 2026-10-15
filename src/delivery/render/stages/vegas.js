// ---- the Strip's car stage (render/carstage.js): resort towers, a glass pyramid and a lattice tower on the horizon,
// their crowns in neon by night (and on the Evil side). Its props are the theme's own obstacles (themes.js): no list here
const NEON = ['#ff3fa4', '#34e1ff', '#ffd23f', '#9b5cff'];
export const stage = {
  skyline(g, w, h, hy, pal, rnd, css) {
    const dark = pal.night || pal.evil, far = css(pal.haze.clone().lerp(pal.top, 0.45)), near = css(pal.haze.clone().lerp(pal.top, dark ? 0.85 : 0.75));
    // the desert's mountains, far off
    g.fillStyle = far;
    g.beginPath(); g.moveTo(0, hy);
    for (let x = 0; x <= w; x += w / 8) g.lineTo(x, hy - hy * (0.06 + rnd() * 0.1));
    g.lineTo(w, hy); g.fill();
    // the resorts: slabs with neon crowns, a pyramid, a lattice tower
    const slab = (x, bw, bh) => {
      g.fillStyle = near; g.fillRect(x, hy - bh, bw, bh + 1);
      if (dark) {
        g.fillStyle = NEON[Math.floor(rnd() * NEON.length)]; g.fillRect(x, hy - bh, bw, 3);
        g.fillStyle = pal.evil ? 'rgba(255,140,90,.55)' : 'rgba(255,220,150,.55)';
        for (let y = hy - bh + 7; y < hy - 3; y += 5) for (let wx = x + 2; wx < x + bw - 3; wx += 4) if (rnd() < 0.35) g.fillRect(wx, y, 2, 2);
      }
    };
    for (let i = 0; i < 7; i++) slab(w * (i / 7) + rnd() * w * 0.05, w * (0.06 + rnd() * 0.05), hy * (0.25 + rnd() * 0.45));
    const px = w * 0.22, pw = hy * 0.32; // the pyramid
    g.fillStyle = near; g.beginPath(); g.moveTo(px - pw, hy); g.lineTo(px, hy - pw * 0.9); g.lineTo(px + pw, hy); g.fill();
    if (dark) { g.fillStyle = 'rgba(220,240,255,.55)'; g.fillRect(px - 1, 0, 2, hy - pw * 0.9); } // (its beam up)
    const tx = w * 0.74, th = hy * 0.8; // the lattice tower and its pod
    g.fillStyle = near; g.beginPath(); g.moveTo(tx - 6, hy); g.lineTo(tx - 1.5, hy - th); g.lineTo(tx + 1.5, hy - th); g.lineTo(tx + 6, hy); g.fill();
    g.fillRect(tx - 7, hy - th * 0.86, 14, 6);
    if (dark) { g.fillStyle = NEON[1]; g.fillRect(tx - 7, hy - th * 0.86 + 6, 14, 1.5); }
  },
};
