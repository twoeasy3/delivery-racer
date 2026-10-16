// ---- MORE NUMBER PLATE DESIGNS (the owner, 16-Oct: "More plates"; CHECKLIST 431). Families that look different, not recolours:
// FRAMES (a frame drawn round a plain plate), PRINTS (a background picture), HOLDERS (something holding the plate: a bracket, a flipped-up
// cover, a ribbon under it, fuzzy dice), SHAPES (pill, hex, oval, shield, ticket, slim, tiny) and SEASON (pumpkin, snow, hearts, candy cane).
// Everything is drawn in code on the plate's one 256 x 64 canvas (render/platedesigns.js drawPlate), no image file, no brand, no real
// registration format, no face or figure, no text but the player's. A design here is the data of platedesigns.js plus, all optional:
//   family            the Plate tab's group (PLATE_FAMILIES)
//   pieces()          the plate's OUTLINE as polygons in canvas pixels (y down): [{ pts, slab }], the first is the plate's body. A design
//                     with pieces is cut to that outline: render/platecosmetic.js builds its face and edge from the same polygons (so a
//                     shaped plate is a shaped mesh: the ghost, a blackout and the dents treat it as any part), and the canvas is clear
//                     outside them. It never leaves the 256 x 64 box, so it stays inside the car's plate anchor (plateanchors.js).
//                     slab: false = no dark edge behind that piece (a dice cord)
//   paint(g, b, d)    the background picture, clipped to the body (b: the body's box { x, y, w, h })
//   frame(g, body, b) drawn instead of the plain border line (body: the body's polygon, or null for a plain rectangle)
//   over(g, b, d)     drawn last, over the other pieces (dice, a ribbon)
//   pad               [x, top, bottom] the characters' margins inside the body's box (default [10, 8, 8])
//   outline, glow     a stroke round each character (keeps it readable over a busy picture) / a glow colour
// Each painter is seeded by the design's id, so a chip and the plate on the car draw the same picture.
const T = Math.PI * 2;
export const seeded = (s) => { let a = 0; for (const c of String(s)) a = (a * 31 + c.charCodeAt(0)) | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// ---- polygons (canvas pixels, y down) ----
export const rr = (x, y, w, h, r, n = 5) => {
  const p = [];
  for (const [cx, cy, a0] of [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]])
    for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
};
const ellipse = (cx, cy, rx, ry, n = 40) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * T) * rx, cy + Math.sin(i / n * T) * ry]);
const quad = (a, c, b, n = 8) => Array.from({ length: n }, (_, i) => { const t = (i + 1) / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
export const boxOf = (pts) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
// the polygon pulled in by d pixels (scaled about its box's centre: right for the convex outlines here)
export const inset = (pts, d) => { const b = boxOf(pts), cx = b.x + b.w / 2, cy = b.y + b.h / 2, sx = (b.w - 2 * d) / b.w, sy = (b.h - 2 * d) / b.h; return pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]); };
export const pathOf = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
const RECT = rr(0, 0, 256, 64, 7, 4);
// points every `step` px round a closed polygon, with the edge's direction
const along = (pts, step, fn) => {
  let carry = 0, k = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], len = Math.hypot(bx - ax, by - ay), a = Math.atan2(by - ay, bx - ax);
    for (let s = carry; s < len; s += step) fn(ax + (bx - ax) * s / len, ay + (by - ay) * s / len, a, k++);
    carry = (carry - len) % step; if (carry < 0) carry += step;
  }
};
const band = (g, body, at, width, style) => { g.strokeStyle = style; g.lineWidth = width; g.lineJoin = 'round'; pathOf(g, inset(body || RECT, at)); g.stroke(); };
const grad = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
const disc = (g, x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, T); g.fillStyle = fill; g.fill(); };
const heart = (g, x, y, s, fill) => { g.beginPath(); g.moveTo(x, y + s * 0.35); g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.35); g.bezierCurveTo(x - s * 0.5, y + s * 0.65, x, y + s * 0.8, x, y + s); g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.65, x + s * 0.5, y + s * 0.35); g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35); g.fillStyle = fill; g.fill(); };
const flake = (g, x, y, r, style) => { g.strokeStyle = style; g.lineWidth = 1.3; g.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke(); };
const SANS = 'Arial, Helvetica, sans-serif', HEAVY = 'Impact, "Arial Black", Arial, sans-serif', SERIF = 'Georgia, "Times New Roman", serif', MONO = '"Courier New", Courier, monospace';
const metal = (stops) => (g, body, b) => { band(g, body, 7.5, 9, grad(g, 0, b.y, 0, b.y + b.h, stops)); band(g, body, 3.6, 1, 'rgba(255,255,255,.75)'); band(g, body, 12.2, 1.2, 'rgba(0,0,0,.55)'); };
const hold = (h) => rr(0, 0, 256, h, 6, 4); // a holder's plate: the top of the box, leaving room under it
const RIBBON = [[44, 46], [212, 46], [212, 51], [234, 51], [224, 57.5], [234, 64], [196, 64], [196, 59], [60, 59], [60, 64], [22, 64], [32, 57.5], [22, 51], [44, 51]]; // (under the plate, its tails cut in a V)

export const PLATE_FAMILIES = [
  { id: 'plain', label: 'Plain' }, { id: 'frame', label: 'Frame' }, { id: 'print', label: 'Print' },
  { id: 'holder', label: 'Holder' }, { id: 'shape', label: 'Shape' }, { id: 'season', label: 'Season' },
];

export const MORE_PLATES = [
  // ---- FRAMES ----
  { id: 'chrome', family: 'frame', name: 'Chrome', price: 450, bg: '#f4f5f2', text: '#15161a', border: '#15161a', edge: '#4a5058', font: SANS, pad: [17, 13, 13],
    frame: metal(['#ffffff', '#9aa3ae', '#eef2f7', '#59616c', '#c9d0d8']) },
  { id: 'goldframe', family: 'frame', name: 'Gold frame', price: 650, bg: '#f6efd8', text: '#1d1a12', border: '#1d1a12', edge: '#5a3e0e', font: SERIF, pad: [17, 13, 13],
    frame: (g, body, b) => { metal(['#fff4b8', '#c9952a', '#ffe58a', '#7a5414', '#e8c25a'])(g, body, b); for (const [x, y] of [[8, 8], [248, 8], [8, 56], [248, 56], [128, 7.5], [128, 56.5]]) { g.fillStyle = '#fff4b8'; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y); g.lineTo(x, y + 4); g.lineTo(x - 4, y); g.closePath(); g.fill(); g.strokeStyle = '#7a5414'; g.lineWidth = 0.8; g.stroke(); } } },
  { id: 'chequer', family: 'frame', name: 'Chequer', price: 400, bg: '#ffffff', text: '#101114', border: '#101114', edge: '#101114', font: HEAVY, pad: [17, 13, 13],
    frame: (g) => { g.fillStyle = '#ffffff'; g.fillRect(3, 3, 250, 9); g.fillRect(3, 52, 250, 9); g.fillRect(3, 3, 9, 58); g.fillRect(244, 3, 9, 58); g.fillStyle = '#101114';
      for (let x = 3, i = 0; x < 253; x += 4.5, i++) { g.fillRect(x, i % 2 ? 3 : 7.5, 4.5, 4.5); g.fillRect(x, i % 2 ? 52 : 56.5, 4.5, 4.5); }
      for (let y = 12, i = 0; y < 52; y += 4.5, i++) { g.fillRect(i % 2 ? 3 : 7.5, y, 4.5, Math.min(4.5, 52 - y)); g.fillRect(i % 2 ? 244 : 248.5, y, 4.5, Math.min(4.5, 52 - y)); }
      g.strokeStyle = '#101114'; g.lineWidth = 1.4; g.strokeRect(12.5, 12.5, 231, 39); } },
  { id: 'rope', family: 'frame', name: 'Rope', price: 400, bg: '#f2ead3', text: '#1b2b4a', border: '#1b2b4a', edge: '#5a4630', font: SERIF, pad: [17, 13, 13],
    frame: (g, body) => { band(g, body, 7.5, 8, '#c9a46a'); g.strokeStyle = '#6e5130'; g.lineWidth = 1.4; along(inset(body || RECT, 7.5), 4.2, (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a + 0.75); g.beginPath(); g.moveTo(-4.4, 0); g.lineTo(4.4, 0); g.stroke(); g.restore(); }); } },
  { id: 'studs', family: 'frame', name: 'Studs', price: 400, bg: '#f4f4ef', text: '#121316', border: '#121316', edge: '#121316', font: HEAVY, pad: [18, 13, 13],
    frame: (g, body) => { band(g, body, 7.5, 9.5, '#25272c'); along(inset(body || RECT, 7.5), 15.6, (x, y) => { disc(g, x, y, 2.9, '#9ba3ad'); disc(g, x - 0.8, y - 0.8, 1.2, '#f4f6f8'); }); } },
  { id: 'dashed', family: 'frame', name: 'Stitched', price: 350, bg: '#d8ecff', text: '#10264d', border: '#10264d', edge: '#10264d', font: SANS, pad: [16, 12, 12],
    frame: (g, body) => { band(g, body, 5.5, 1.6, '#10264d'); g.setLineDash([7, 4.5]); band(g, body, 9.5, 2.6, '#10264d'); g.setLineDash([]); } },
  { id: 'neon', family: 'frame', name: 'Neon', price: 600, bg: '#0d0b16', text: '#ffffff', border: '#ff7be6', edge: '#050409', font: SANS, pad: [17, 13, 13], glow: '#5ef2ff',
    frame: (g, body) => { g.shadowBlur = 6; g.shadowColor = '#ff3fd2'; band(g, body, 6, 2.6, '#ff8ce9'); g.shadowColor = '#22d8ff'; band(g, body, 10.5, 2, '#7ff5ff'); g.shadowBlur = 0; } },
  { id: 'candy', family: 'season', name: 'Candy cane', price: 350, bg: '#fffaf6', text: '#b5121b', border: '#b5121b', edge: '#7a0c12', font: HEAVY, pad: [17, 13, 13],
    frame: (g, body) => { band(g, body, 7.5, 9, '#fffaf6'); g.save(); pathOf(g, inset(body || RECT, 3)); pathOf(g, inset(body || RECT, 12)); g.clip('evenodd'); g.fillStyle = '#d8262b'; for (let x = -64; x < 300; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 5, 0); g.lineTo(x + 5 + 40, 64); g.lineTo(x + 40, 64); g.closePath(); g.fill(); } g.restore(); band(g, body, 12.2, 1.2, '#b5121b'); } },

  // ---- PRINTS ----
  { id: 'sunset', family: 'print', name: 'Sunset', price: 450, bg: '#ff8a3c', text: '#ffffff', border: '#2a0f3a', edge: '#2a0f3a', font: HEAVY, outline: '#2a0f3a',
    paint: (g, b) => { g.fillStyle = grad(g, 0, b.y, 0, b.y + b.h, ['#ffb347', '#ff5e62', '#7b2f8e']); g.fillRect(b.x, b.y, b.w, b.h); disc(g, b.x + b.w / 2, b.y + b.h + 4, 34, 'rgba(255,222,120,.85)'); g.fillStyle = '#ff5e62'; for (let y = b.y + b.h - 24; y < b.y + b.h; y += 6) g.fillRect(b.x + b.w / 2 - 40, y, 80, 1.8); } },
  { id: 'speed', family: 'print', name: 'Speed stripes', price: 400, bg: '#eef0f3', text: '#111216', border: '#111216', edge: '#1c1d22', font: HEAVY, pad: [44, 8, 8],
    paint: (g, b) => { for (const [i, c] of [[0, '#d8262b'], [1, '#1f4fbf'], [2, '#d8262b']]) { g.fillStyle = c; for (const side of [1, -1]) { const x = side > 0 ? b.x + 8 + i * 10 : b.x + b.w - 8 - i * 10; g.beginPath(); g.moveTo(x, b.y); g.lineTo(x + side * 6, b.y); g.lineTo(x + side * 20, b.y + b.h); g.lineTo(x + side * 14, b.y + b.h); g.closePath(); g.fill(); } } } },
  { id: 'camo', family: 'print', name: 'Camo', price: 400, bg: '#6b7a3c', text: '#f4f1dc', border: '#1c1f12', edge: '#1c1f12', font: HEAVY, outline: '#1c1f12',
    paint: (g, b, d) => { const r = seeded(d.id); for (let i = 0; i < 46; i++) { g.fillStyle = ['#3e4a22', '#9a8f5a', '#2a2a1c'][i % 3]; g.beginPath(); g.ellipse(b.x + r() * b.w, b.y + r() * b.h, 6 + r() * 12, 3 + r() * 7, r() * T, 0, T); g.fill(); } } },
  { id: 'hazard', family: 'print', name: 'Hazard', price: 400, bg: '#f5c400', text: '#111111', border: '#111111', edge: '#111111', font: HEAVY, pad: [40, 12, 12],
    paint: (g, b) => { g.fillStyle = '#111111'; for (let x = b.x - 64; x < b.x + b.w; x += 18) { g.beginPath(); g.moveTo(x, b.y + b.h); g.lineTo(x + 9, b.y + b.h); g.lineTo(x + 9 + b.h, b.y); g.lineTo(x + b.h, b.y); g.closePath(); g.fill(); } g.fillStyle = '#f5c400'; g.beginPath(); g.roundRect(b.x + 30, b.y + 9, b.w - 60, b.h - 18, 4); g.fill(); g.strokeStyle = '#111111'; g.lineWidth = 1.5; g.stroke(); },
    frame: () => {} },
  { id: 'circuit', family: 'print', name: 'Circuit', price: 500, bg: '#0e3b26', text: '#eafff1', border: '#c9a640', edge: '#06180f', font: MONO, outline: '#06180f',
    paint: (g, b, d) => { const r = seeded(d.id); g.lineWidth = 1.6; g.strokeStyle = '#3fbf6a'; for (let i = 0; i < 16; i++) { const x = b.x + r() * b.w, y = b.y + 6 + r() * (b.h - 12), l = 12 + r() * 30, s = r() < 0.5 ? -1 : 1, e = r() * 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.lineTo(x + l + e, y + s * e); g.lineTo(x + l + e + 14, y + s * e); g.stroke(); disc(g, x, y, 2.2, '#c9a640'); disc(g, x + l + e + 14, y + s * e, 2.2, '#c9a640'); } } },
  { id: 'stars', family: 'print', name: 'Starry', price: 450, bg: '#0b1440', text: '#ffffff', border: '#cfd8ff', edge: '#050a22', font: SANS, outline: '#0b1440',
    paint: (g, b, d) => { const r = seeded(d.id); g.fillStyle = grad(g, b.x, 0, b.x + b.w, 0, ['#0b1440', '#2b1a5c', '#0b1440']); g.fillRect(b.x, b.y, b.w, b.h); for (let i = 0; i < 60; i++) disc(g, b.x + r() * b.w, b.y + r() * b.h, 0.4 + r() * 1.1, 'rgba(255,255,255,' + (0.5 + r() * 0.5) + ')');
      for (const [x, y, s] of [[22, 18, 6], [236, 44, 7], [200, 14, 4], [52, 48, 4]]) { g.fillStyle = '#fff6c8'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? s * 0.28 : s; g.lineTo(b.x + x + Math.cos(a) * rr2, b.y + y + Math.sin(a) * rr2); } g.closePath(); g.fill(); } } },
  { id: 'waves', family: 'print', name: 'Waves', price: 400, bg: '#2f8fd6', text: '#ffffff', border: '#08325c', edge: '#08325c', font: HEAVY, outline: '#08325c',
    paint: (g, b) => { g.fillStyle = grad(g, 0, b.y, 0, b.y + b.h, ['#9ee3ff', '#2f8fd6', '#0b5fa8']); g.fillRect(b.x, b.y, b.w, b.h); for (const [y0, amp, c] of [[0.42, 3.5, '#4fb0ec'], [0.62, 4, '#1f7cc8'], [0.82, 3.5, '#0b4f92']]) { g.beginPath(); g.moveTo(b.x, b.y + b.h); for (let x = 0; x <= b.w; x += 4) g.lineTo(b.x + x, b.y + b.h * y0 + Math.sin(x / 13 + y0 * 9) * amp); g.lineTo(b.x + b.w, b.y + b.h); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.3; g.stroke(); } } },
  { id: 'clouds', family: 'print', name: 'Clouds', price: 400, bg: '#8ccfff', text: '#12305a', border: '#12305a', edge: '#12305a', font: SANS, outline: '#ffffff',
    paint: (g, b, d) => { const r = seeded(d.id); g.fillStyle = grad(g, 0, b.y, 0, b.y + b.h, ['#5fb6ff', '#cfeaff']); g.fillRect(b.x, b.y, b.w, b.h); for (let c = 0; c < 7; c++) { const cx = b.x + (c + 0.3 * r()) * b.w / 6.5, cy = b.y + (c % 2 ? 0.75 : 0.22) * b.h; for (let i = 0; i < 4; i++) disc(g, cx + (i - 1.5) * 7, cy + (i % 2 ? -2 : 3), 6 + r() * 5, 'rgba(255,255,255,.95)'); } } },
  { id: 'pixel', family: 'print', name: 'Pixel', price: 450, bg: '#2b1b4f', text: '#ffe14a', border: '#ffe14a', edge: '#120a24', font: MONO, outline: '#120a24',
    pieces: () => [{ pts: [[0, 0], [256, 0], [256, 64], [0, 64]] }],
    paint: (g, b, d) => { const r = seeded(d.id); for (let x = 0; x < b.w; x += 8) for (let y = 0; y < b.h; y += 8) { const edge = Math.min(x, b.w - 8 - x) < 24, v = r(); g.fillStyle = edge && v < 0.18 ? (v < 0.09 ? '#ff4fa3' : '#4fd8ff') : ['#2b1b4f', '#3a2470', '#4b2f8f', '#24164a'][Math.floor(v * 4)]; g.fillRect(b.x + x, b.y + y, 8, 8); } } },
  { id: 'tiles', family: 'print', name: 'Mosaic', price: 450, bg: '#2aa3a0', text: '#0d2236', border: '#0d2236', edge: '#0d2236', font: SANS, outline: '#f6fbfb',
    paint: (g, b, d) => { const r = seeded(d.id); g.fillStyle = '#e9eef0'; g.fillRect(b.x, b.y, b.w, b.h); for (let x = 0; x < b.w; x += 8) for (let y = 0; y < b.h; y += 8) { g.fillStyle = ['#1f8a8a', '#2aa3a0', '#167070', '#5cc2bc', '#f2f2ea'][Math.floor(r() * 5)]; g.fillRect(b.x + x + 0.8, b.y + y + 0.8, 6.4, 6.4); } } },
  { id: 'wood', family: 'print', name: 'Wood', price: 400, bg: '#a8693a', text: '#fff1d6', border: '#4a2a12', edge: '#3a200c', font: SERIF, outline: '#4a2a12',
    paint: (g, b, d) => { const r = seeded(d.id); g.strokeStyle = 'rgba(92,52,22,.55)'; g.lineWidth = 1.2; for (let i = 0; i < 14; i++) { const y0 = b.y + i * b.h / 13, ph = r() * 6; g.beginPath(); for (let x = 0; x <= b.w; x += 6) g.lineTo(b.x + x, y0 + Math.sin(x / 40 + ph) * 2.2); g.stroke(); } for (const [x, y] of [[0.16, 0.3], [0.82, 0.68]]) { g.beginPath(); g.ellipse(b.x + x * b.w, b.y + y * b.h, 7, 3, 0, 0, T); g.fillStyle = 'rgba(92,52,22,.6)'; g.fill(); } } },
  { id: 'carbon', family: 'print', name: 'Carbon', price: 500, bg: '#1b1c1f', text: '#eef0f4', border: '#d23a2a', edge: '#0a0a0b', font: SANS, outline: '#000000',
    paint: (g, b) => { for (let x = 0; x < b.w; x += 6) for (let y = 0; y < b.h; y += 6) { const odd = ((x + y) / 6) % 2; g.fillStyle = odd ? grad(g, b.x + x, 0, b.x + x + 6, 0, ['#2a2c31', '#3c3f46']) : grad(g, 0, b.y + y, 0, b.y + y + 6, ['#16171a', '#2c2e33']); g.fillRect(b.x + x, b.y + y, 6, 6); } } },
  { id: 'flames', family: 'print', name: 'Flames', price: 550, bg: '#121212', text: '#ffffff', border: '#ff9a1f', edge: '#050505', font: HEAVY, outline: '#000000',
    paint: (g, b, d) => { const r = seeded(d.id); for (let i = 0; i < 7; i++) { const y = b.y + 4 + i * (b.h - 8) / 6, len = 70 + r() * 70, h = 5 + r() * 3; g.fillStyle = grad(g, b.x, 0, b.x + len, 0, ['#d81e05', '#ff7a00', '#ffd23f']); g.beginPath(); g.moveTo(b.x, y - h); g.bezierCurveTo(b.x + len * 0.5, y - h * 1.6, b.x + len * 0.7, y - h * 0.2, b.x + len, y - h * 1.2); g.bezierCurveTo(b.x + len * 0.65, y + h * 0.4, b.x + len * 0.4, y + h * 1.4, b.x, y + h); g.closePath(); g.fill(); } } },

  // ---- HOLDERS ----
  { id: 'bracket', family: 'holder', name: 'Bracket', price: 450, bg: '#f5f4ee', text: '#15161a', border: '#15161a', edge: '#3a3f46', font: SANS, pad: [18, 11, 15],
    frame: (g) => { g.fillStyle = grad(g, 0, 0, 0, 64, ['#e6eaee', '#8e97a2', '#c9d0d8', '#6b737e']); g.beginPath(); g.rect(3, 3, 250, 58); g.rect(13, 9, 230, 43); g.fill('evenodd'); g.fillStyle = '#5b636e'; g.fillRect(3, 52, 250, 9); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(3, 52, 250, 1);
      for (const [x, y] of [[8, 6], [248, 6], [8, 56.5], [248, 56.5]]) { g.fillStyle = '#d6dbe0'; g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(x + Math.cos(i * Math.PI / 3) * 3.6, y + Math.sin(i * Math.PI / 3) * 3.6); g.closePath(); g.fill(); g.strokeStyle = '#3a3f46'; g.lineWidth = 0.8; g.stroke(); disc(g, x, y, 1.1, '#3a3f46'); } } },
  { id: 'flip', family: 'holder', name: 'Flip cover', price: 500, bg: '#f5f4ee', text: '#15161a', border: '#15161a', edge: '#202226', font: SANS, pad: [10, 6, 7],
    pieces: () => [{ pts: rr(6, 16, 244, 48, 6, 4) }, { pts: [[2, 0], [254, 0], [244, 15], [12, 15]] }],
    over: (g) => { g.fillStyle = grad(g, 0, 0, 0, 15, ['rgba(60,70,84,.95)', 'rgba(28,32,40,.95)']); pathOf(g, [[3.5, 1], [252.5, 1], [243, 14], [13, 14]]); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(30, 4); g.lineTo(90, 4); g.stroke();
      g.fillStyle = '#9aa3ae'; g.fillRect(20, 16, 216, 3.5); for (let x = 22; x < 236; x += 18) { g.fillStyle = '#c9d0d8'; g.fillRect(x, 15.5, 8, 4.5); } } },
  { id: 'banner', family: 'holder', name: 'Ribbon', price: 450, bg: '#f5f4ee', text: '#15161a', border: '#15161a', edge: '#202226', font: SANS,
    pieces: () => [{ pts: hold(46) }, { pts: RIBBON }],
    over: (g) => { g.fillStyle = '#9c1420'; pathOf(g, RIBBON); g.fill();
      g.fillStyle = grad(g, 0, 46, 0, 59, ['#e8394a', '#c41e2e']); g.fillRect(44, 46, 168, 13); g.fillStyle = '#7a0c16'; g.fillRect(44, 46, 168, 1.2);
      g.fillStyle = 'rgba(0,0,0,.3)'; for (const x of [44, 196]) g.fillRect(x, 51, 16, 8); g.strokeStyle = '#ffd34a'; g.lineWidth = 1; g.beginPath(); g.moveTo(52, 49.5); g.lineTo(204, 49.5); g.moveTo(52, 55.5); g.lineTo(204, 55.5); g.stroke(); } },
  { id: 'dice', family: 'holder', name: 'Fuzzy dice', price: 550, bg: '#f5f4ee', text: '#15161a', border: '#15161a', edge: '#202226', font: SANS,
    pieces: () => [{ pts: hold(44) }, { pts: [[29, 44], [31, 44], [31, 47], [29, 47]], slab: false }, { pts: rr(21, 47, 18, 16, 3, 3) }, { pts: [[225, 44], [227, 44], [227, 46], [225, 46]], slab: false }, { pts: rr(217, 46, 18, 17, 3, 3) }],
    over: (g) => { g.fillStyle = '#e8e2d4'; g.fillRect(29, 44, 2, 3); g.fillRect(225, 44, 2, 2);
      for (const [x, y, w, h, fill, pip, n] of [[21, 47, 18, 16, '#f4f2ec', '#15161a', 5], [217, 46, 18, 17, '#d8262b', '#ffffff', 3]]) {
        g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, 3); g.fill(); g.strokeStyle = fill; g.lineWidth = 1; for (let i = 0; i < 24; i++) { const a = i / 24 * T, cx = x + w / 2, cy = y + h / 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * w * 0.42, cy + Math.sin(a) * h * 0.42); g.lineTo(cx + Math.cos(a) * w * 0.52, cy + Math.sin(a) * h * 0.52); g.stroke(); }
        const p = n === 5 ? [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]] : [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]];
        for (const [px, py] of p) disc(g, x + px * w, y + py * h, 1.7, pip);
      } } },

  // ---- SHAPES (the outline is the plate's own: a shaped mesh, inside the anchor's box) ----
  { id: 'pill', family: 'shape', name: 'Pill', price: 350, bg: '#ffffff', text: '#0f1f2a', border: '#1c8c8c', edge: '#0f3c3c', font: SANS, pad: [28, 9, 9], pieces: () => [{ pts: rr(0, 0, 256, 64, 32, 10) }] },
  { id: 'hex', family: 'shape', name: 'Hex', price: 400, bg: '#26282c', text: '#c7ff3a', border: '#c7ff3a', edge: '#0c0d0f', font: HEAVY, pad: [30, 9, 9], pieces: () => [{ pts: [[22, 0], [234, 0], [256, 32], [234, 64], [22, 64], [0, 32]] }] },
  { id: 'oval', family: 'shape', name: 'Oval', price: 400, bg: '#f3ead2', text: '#6a1420', border: '#6a1420', edge: '#3a0a10', font: SERIF, pad: [36, 10, 10], pieces: () => [{ pts: ellipse(128, 32, 128, 32, 44) }] },
  { id: 'shield', family: 'shape', name: 'Shield', price: 450, bg: '#1d3f8f', text: '#ffffff', border: '#d8dde8', edge: '#0c1a3c', font: HEAVY, pad: [16, 8, 20],
    pieces: () => [{ pts: [[6, 0], [250, 0], [256, 6], [256, 30], ...quad([256, 30], [250, 52], [128, 64], 9), ...quad([128, 64], [6, 52], [0, 30], 9).slice(0, -1), [0, 30], [0, 6]] }] },
  { id: 'ticket', family: 'shape', name: 'Ticket', price: 350, bg: '#d8262b', text: '#fff6e8', border: '#fff6e8', edge: '#6a0c10', font: HEAVY, pad: [38, 10, 10],
    pieces: () => { const p = [], r = 10, arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 6; i++) { const a = a0 + (a1 - a0) * i / 6; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } }; arc(256, 0, Math.PI, Math.PI / 2); arc(256, 64, -Math.PI / 2, -Math.PI); arc(0, 64, 0, -Math.PI / 2); arc(0, 0, Math.PI / 2, 0); return [{ pts: p }]; },
    over: (g) => { g.strokeStyle = 'rgba(255,246,232,.75)'; g.lineWidth = 1.6; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(30, 12); g.lineTo(30, 52); g.moveTo(226, 12); g.lineTo(226, 52); g.stroke(); g.setLineDash([]); } },
  { id: 'slim', family: 'shape', name: 'Slim', price: 300, bg: '#d7dadf', text: '#1b1d22', border: '#1b1d22', edge: '#3a3d44', font: SANS, pad: [10, 5, 5], pieces: () => [{ pts: rr(0, 12, 256, 40, 5, 4) }] },
  { id: 'tiny', family: 'shape', name: 'Tiny', price: 300, bg: '#1f6b3a', text: '#ffffff', border: '#ffffff', edge: '#0c2a16', font: SANS, pad: [9, 6, 6], pieces: () => [{ pts: rr(45, 11, 166, 42, 6, 4) }] },

  // ---- SEASON ----
  { id: 'pumpkin', family: 'season', name: 'Pumpkin', price: 400, bg: '#f07a12', text: '#2a1205', border: '#2a1205', edge: '#3a1a06', font: HEAVY, pad: [14, 12, 8],
    paint: (g, b) => { g.strokeStyle = '#c45a08'; g.lineWidth = 2.2; for (let i = 1; i < 9; i++) { const x = b.x + i * b.w / 9; g.beginPath(); g.moveTo(x, b.y); g.quadraticCurveTo(x + (i < 4.5 ? -6 : 6), b.y + b.h / 2, x, b.y + b.h); g.stroke(); }
      g.strokeStyle = '#3f7a1c'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(b.x + 4, b.y + 6); g.bezierCurveTo(b.x + 40, b.y + 2, b.x + 60, b.y + 12, b.x + 90, b.y + 5); g.moveTo(b.x + b.w - 4, b.y + 6); g.bezierCurveTo(b.x + b.w - 40, b.y + 2, b.x + b.w - 60, b.y + 12, b.x + b.w - 90, b.y + 5); g.stroke();
      for (const x of [26, 64, b.w - 26, b.w - 64]) { g.fillStyle = '#4f9a24'; g.beginPath(); g.ellipse(b.x + x, b.y + 7, 6, 3, x < b.w / 2 ? -0.4 : 0.4, 0, T); g.fill(); } } },
  { id: 'snow', family: 'season', name: 'Snowy', price: 400, bg: '#d8ecfb', text: '#14365e', border: '#14365e', edge: '#14365e', font: SANS, pad: [12, 14, 8],
    paint: (g, b, d) => { const r = seeded(d.id); g.fillStyle = grad(g, 0, b.y, 0, b.y + b.h, ['#eef7ff', '#b9d9f5']); g.fillRect(b.x, b.y, b.w, b.h); for (let i = 0; i < 12; i++) { const x = i % 2 ? b.x + 6 + r() * 26 : b.x + b.w - 32 + r() * 26; flake(g, x, b.y + 16 + r() * (b.h - 22), 2.5 + r() * 2.5, '#ffffff'); }
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x + b.w, b.y); for (let x = b.w; x >= 0; x -= 8) g.lineTo(b.x + x, b.y + 9 + Math.sin(x * 0.7) * 2.5); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; for (let x = 18; x < b.w - 10; x += 29) { const y = b.y + 10 + Math.sin(x * 0.7) * 2.5; g.beginPath(); g.moveTo(b.x + x - 2.5, y - 1); g.lineTo(b.x + x + 2.5, y - 1); g.lineTo(b.x + x, y + 6); g.closePath(); g.fill(); } } },
  { id: 'hearts', family: 'season', name: 'Hearts', price: 400, bg: '#ffc2d6', text: '#7a0a33', border: '#7a0a33', edge: '#5a0626', font: HEAVY, outline: '#ffe6ee',
    paint: (g, b, d) => { const r = seeded(d.id); for (let i = 0; i < 26; i++) { const s = 6 + r() * 9; heart(g, b.x + r() * b.w, b.y - 4 + r() * b.h, s, i % 3 ? 'rgba(255,127,168,.85)' : 'rgba(255,255,255,.8)'); } } },
];
