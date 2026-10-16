// ---- the DECAL DESIGNS (the decal cosmetic's trial, CHECKLIST 423; render/decalcosmetic.js lays them on the flanks): FIXED designs, drawn
// here in code on a canvas (never an image file), plain bold shapes, no text, no letters or digits, no logos, no faces. The owner, 16-Oct:
// each design fixed in place; colours both from the car and chosen (as the props: colourFrom 'car' | 'mixed' | 'fixed' plus swatches);
// contrast part of each design (the feasibility's GO-IF 3): every shape has an EDGE, dark under a light ink and light under a dark one.
//   kind 'band'   a strip along the flank, its tile repeated nose-ward (tile = aspect x 1 in units of the band's height): stripes, checker...
//   kind 'panel'  one picture, aspect x 1, laid on one zone at its nose end (flames, the bolt)
//   kind 'badge'  one square picture on the roomiest zone (star, target, parcel)
// The pictures face the NOSE at the canvas's right (u = 1): the decal is mapped nose-ward on both flanks, so a chevron or a flame points
// forward on each side (the right flank sees it mirrored, as liveries are).
// colourFrom: 'car'   the whole design in the ink (the swatch, or 'Match car': a tone of the car's own paint, render/decalcosmetic.js)
//             'mixed' the ink plus a fixed accent of its own (the checker's white squares, the target's white ring, the parcel's tape)
//             'fixed' its own colours, the swatches do nothing (the flames)
// size: the tile's or picture's canvas, W x H (power-of-two, at most 256 x 256; 4 bytes a pixel, a third more with mipmaps), at a
// uniform scale (W / aspect = H), so strokes are round.
// Render-only (no rules module imports this).

export const DESIGNS = [
  { id: 'stripes', name: 'Stripes', kind: 'band', aspect: 4, h: 0.17, colourFrom: 'car' },
  { id: 'checker', name: 'Checker', kind: 'band', aspect: 4, h: 0.17, colourFrom: 'mixed' },
  { id: 'chevrons', name: 'Chevrons', kind: 'band', aspect: 4, h: 0.18, colourFrom: 'car' },
  { id: 'waves', name: 'Waves', kind: 'band', aspect: 4, h: 0.18, colourFrom: 'car' },
  { id: 'dots', name: 'Dots', kind: 'band', aspect: 4, h: 0.16, colourFrom: 'car' },
  { id: 'diamonds', name: 'Diamonds', kind: 'band', aspect: 4, h: 0.18, colourFrom: 'car' },
  { id: 'hex', name: 'Hex', kind: 'band', aspect: 4, h: 0.18, colourFrom: 'car' },
  { id: 'tiger', name: 'Tiger', kind: 'band', aspect: 2, h: 0.34, colourFrom: 'car' },
  { id: 'flames', name: 'Flames', kind: 'panel', aspect: 2, h: 0.3, colourFrom: 'fixed' },
  { id: 'bolt', name: 'Bolt', kind: 'panel', aspect: 2, h: 0.28, colourFrom: 'car' },
  { id: 'star', name: 'Star', kind: 'badge', aspect: 1, h: 0.46, colourFrom: 'car' },
  { id: 'target', name: 'Target', kind: 'badge', aspect: 1, h: 0.46, colourFrom: 'mixed' },
  { id: 'parcel', name: 'Parcel', kind: 'badge', aspect: 1, h: 0.46, colourFrom: 'mixed' },
];
export const designById = (id) => DESIGNS.find(d => d.id === id) || null;
// the canvas of a design: W x H
export const canvasSize = (d) => (d.aspect === 4 ? [256, 64] : d.aspect === 2 ? [256, 128] : [256, 256]);

// ---- colours ----
const hex6 = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
export const luminance = (hex) => {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(hex >> 16 & 255) + 0.7152 * lin(hex >> 8 & 255) + 0.0722 * lin(hex & 255);
};
export const DARK = 0x15171b, LIGHT = 0xf2f2ee;
// the edge under an ink: dark under a light ink, light under a dark one
export const edgeFor = (ink) => (luminance(ink) > 0.3 ? DARK : LIGHT);
const mix = (a, b, t) => { const c = (s) => Math.round((a >> s & 255) * (1 - t) + (b >> s & 255) * t); return (c(16) << 16) | (c(8) << 8) | c(0); };
// 'Match car': a TONE of the car's own paint that stands out on it (a dark paint: a light tint of it; a light one: a deep shade of it)
export const toneOf = (paint) => (luminance(paint) > 0.18 ? mix(paint, 0x000000, 0.62) : mix(paint, 0xffffff, 0.62));

// ---- drawing: ctx scaled so the picture's height is 1 (its width the aspect); ink and edge as numbers ----
const T = Math.PI * 2;
const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
// a path filled in the ink over its own outline in the edge colour (the outline e wide outside it)
const inked = (g, path, ink, edge, e = 0.07) => {
  g.lineJoin = 'round'; g.lineCap = 'round';
  path(); g.lineWidth = e * 2; g.strokeStyle = hex6(edge); g.stroke();
  path(); g.fillStyle = hex6(ink); g.fill();
};
const rect = (g, x, y, w, h, c) => { g.fillStyle = hex6(c); g.fillRect(x, y, w, h); };
const DRAW = {
  // two stripes, a broad one over a slim one, edged above and below (full width: the tile repeats without a seam)
  stripes(g, a, ink, edge) {
    for (const [y0, y1] of [[0.1, 0.5], [0.64, 0.86]]) { rect(g, -0.1, y0 - 0.07, a + 0.2, y1 - y0 + 0.14, edge); rect(g, -0.1, y0, a + 0.2, y1 - y0, ink); }
  },
  // two rows of squares, ink and an accent (white, or black under a light ink), edged above and below
  checker(g, a, ink, edge) {
    const other = luminance(ink) > 0.55 ? DARK : LIGHT;
    rect(g, -0.1, 0, a + 0.2, 1, edge);
    const n = a * 2, w = a / n, top = 0.07, h = (1 - 2 * top) / 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) rect(g, i * w, top + j * h, w, h, (i + j) % 2 ? other : ink);
  },
  // arrows pointing to the nose
  chevrons(g, a, ink, edge) {
    const n = 3, w = a / n;
    for (let i = 0; i < n; i++) { const x = i * w + 0.12; inked(g, () => poly(g, [[x, 0.12], [x + 0.42, 0.12], [x + 0.86, 0.5], [x + 0.42, 0.88], [x, 0.88], [x + 0.44, 0.5]]), ink, edge); }
  },
  // a ribbon waving along the flank (two waves a tile: it joins up across the tile's ends)
  waves(g, a, ink, edge) {
    const band = (half) => { g.beginPath(); for (let i = 0; i <= 80; i++) { const x = -0.1 + (a + 0.2) * i / 80; g.lineTo(x, 0.5 + 0.2 * Math.sin(x * T / 2) - half); } for (let i = 80; i >= 0; i--) { const x = -0.1 + (a + 0.2) * i / 80; g.lineTo(x, 0.5 + 0.2 * Math.sin(x * T / 2) + half); } g.closePath(); };
    band(0.22); g.fillStyle = hex6(edge); g.fill();
    band(0.15); g.fillStyle = hex6(ink); g.fill();
  },
  dots(g, a, ink, edge) {
    for (let i = 0; i < a; i++) inked(g, () => { g.beginPath(); g.arc(i + 0.5, 0.5, 0.34, 0, T); }, ink, edge);
  },
  // diamonds on a line
  diamonds(g, a, ink, edge) {
    rect(g, -0.1, 0.43, a + 0.2, 0.14, edge); rect(g, -0.1, 0.46, a + 0.2, 0.08, ink);
    for (let i = 0; i < a; i++) inked(g, () => poly(g, [[i + 0.5, 0.08], [i + 0.9, 0.5], [i + 0.5, 0.92], [i + 0.1, 0.5]]), ink, edge);
  },
  // a row of hexagons, each with a hexagon hole
  hex(g, a, ink, edge) {
    const hexPath = (cx, r) => { g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(cx + r * Math.cos(k * T / 6), 0.5 + r * Math.sin(k * T / 6)); g.closePath(); };
    for (let i = 0; i < a; i++) {
      inked(g, () => hexPath(i + 0.5, 0.43), ink, edge);
      hexPath(i + 0.5, 0.2); g.fillStyle = hex6(edge); g.fill();
    }
  },
  // tiger stripes: tapering jagged stripes in from the top and the bottom, leaning back
  tiger(g, a, ink, edge) {
    const k = a / 2, thorn = (x, top, len, w) => {
      const y0 = top ? -0.15 : 1.15, s = top ? 1 : -1;
      return () => poly(g, [[x, y0], [x + w, y0], [x + w * 0.7 - 0.1, y0 + s * (len * 0.55 + 0.15)], [x + w * 0.45 - 0.08, y0 + s * (len * 0.6 + 0.15)], [x - 0.18, y0 + s * (len + 0.15)], [x + w * 0.15 - 0.06, y0 + s * (len * 0.5 + 0.15)]]);
    };
    for (const [x, top, len, w] of [[0.15, true, 0.62, 0.2], [0.55, false, 0.55, 0.18], [0.95, true, 0.48, 0.16], [1.3, false, 0.66, 0.22], [1.68, true, 0.58, 0.18]]) inked(g, thorn(x * k, top, len, w), ink, edge, 0.06);
  },
  // flames from the nose (right) licking back: orange with a yellow heart, a dark edge
  flames(g) {
    const tongue = (scale) => () => {
      const P = [[2.0, 0.12], [1.55, 0.14], [1.15, 0.05], [1.32, 0.24], [0.62, 0.2], [1.08, 0.38], [0.12, 0.5], [1.05, 0.6], [0.45, 0.82], [1.28, 0.76], [1.0, 0.95], [1.6, 0.86], [2.0, 0.88]];
      g.beginPath();
      P.forEach(([x, y], i) => { const X = 2 - (2 - x) * scale, Y = 0.5 + (y - 0.5) * (scale < 1 ? 0.62 : 1); if (!i) g.moveTo(X, Y); else { const [px, py] = P[i - 1], mx = 2 - (2 - (px + x) / 2) * scale, my = 0.5 + ((py + y) / 2 - 0.5) * (scale < 1 ? 0.62 : 1); g.quadraticCurveTo(mx, my, X, Y); } });
      g.lineTo(2.1, 0.88); g.lineTo(2.1, 0.12); g.closePath();
    };
    inked(g, tongue(1), 0xf05a1a, DARK, 0.06);
    tongue(0.62)(); g.fillStyle = '#ffd23a'; g.fill();
  },
  // a lightning bolt lying along the flank, its point to the nose
  bolt(g, a, ink, edge) {
    inked(g, () => poly(g, [[0.08, 0.3], [0.86, 0.46], [0.8, 0.18], [1.92, 0.6], [1.1, 0.5], [1.18, 0.8], [0.08, 0.36]]), ink, edge);
  },
  star(g, a, ink, edge) {
    inked(g, () => { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.19 : 0.45, t = -Math.PI / 2 + k * T / 10; g.lineTo(0.5 + r * Math.cos(t), 0.53 + r * Math.sin(t)); } g.closePath(); }, ink, edge);
  },
  // rings: the ink, a white (or black) ring, the ink
  target(g, a, ink, edge) {
    const other = luminance(ink) > 0.55 ? DARK : LIGHT;
    const disc = (r, c) => { g.beginPath(); g.arc(0.5, 0.5, r, 0, T); g.fillStyle = hex6(c); g.fill(); };
    disc(0.48, edge); disc(0.43, ink); disc(0.31, other); disc(0.19, ink);
  },
  // a parcel seen from above a corner: its three faces in the ink (lit, shaded), the tape across in the edge colour
  parcel(g, a, ink, edge) {
    const top = [[0.5, 0.1], [0.9, 0.3], [0.5, 0.5], [0.1, 0.3]], left = [[0.1, 0.3], [0.5, 0.5], [0.5, 0.92], [0.1, 0.72]], right = [[0.5, 0.5], [0.9, 0.3], [0.9, 0.72], [0.5, 0.92]];
    inked(g, () => poly(g, [[0.5, 0.1], [0.9, 0.3], [0.9, 0.72], [0.5, 0.92], [0.1, 0.72], [0.1, 0.3]]), ink, edge);
    poly(g, top); g.fillStyle = hex6(mix(ink, 0xffffff, 0.35)); g.fill();
    poly(g, right); g.fillStyle = hex6(mix(ink, 0x000000, 0.3)); g.fill();
    g.fillStyle = hex6(edge);
    poly(g, [[0.27, 0.215], [0.33, 0.185], [0.73, 0.385], [0.73, 0.81], [0.67, 0.84], [0.67, 0.415]]); g.fill(); // (the tape, over the top and down the side)
    g.lineWidth = 0.025; g.strokeStyle = hex6(edge); poly(g, left); g.stroke(); poly(g, right); g.stroke();
  },
};
// draw design d on a 2D context of W x H (cleared first) in this ink (a number; 'fixed' designs ignore it)
export const drawDesign = (g, d, ink, W, H) => {
  g.save();
  g.clearRect(0, 0, W, H);
  g.scale(H, H); // (uniform: the picture is d.aspect x 1 units)
  DRAW[d.id](g, d.aspect, ink, edgeFor(ink));
  g.restore();
};
// a chip's small picture (the Cosmetics screen): the design on a patch of the car's paint, W x H; a band shows a piece of its tile
export const drawPreview = (g, d, ink, paint, W, H) => {
  g.save();
  g.fillStyle = hex6(paint); g.fillRect(0, 0, W, H);
  const k = d.kind === 'band' ? H * (d.id === 'tiger' ? 0.9 : 0.5) : d.kind === 'panel' ? Math.min(H * 0.8, W * 0.95 / d.aspect) : H * 0.86;
  g.beginPath(); g.rect(0, 0, W, H); g.clip();
  g.translate(d.kind === 'band' ? 0 : (W - k * d.aspect) / 2, (H - k) / 2);
  g.scale(k, k);
  if (d.kind === 'band') { g.beginPath(); g.rect(0, 0, W / k, 1); g.clip(); }
  DRAW[d.id](g, d.aspect, ink, edgeFor(ink));
  g.restore();
};
