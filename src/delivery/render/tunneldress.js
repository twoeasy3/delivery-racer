// ---- TUNNEL DRESSING: a tunnel of its own for the themes that had only the plain one (CHECKLIST 422). render/tunnel.js builds
// every tunnel's shell (walls, ceiling, lamps, portals); this gives five themes a look for it and the fittings along it:
//   city      a bypass tunnel: white tiles over a dark dado and a blue stripe, cool lamps along both ceiling corners, jet fans in
//             pairs, blue SOS niches and green emergency doors, reflector posts; a blue name board and a height sign on the portal
//   port      a dock road tunnel: grey panels over yellow-and-black hazard paint, steel frames every 24 m, a red fire main and a blue
//             water pipe along the walls, sodium lamps, BERTH boards; containers stacked on the portal
//   snow      a rock tunnel under the fjord: raw blasted rock, a cable tray, sodium lamps on brackets down one wall, a blue-lit cavern
//             half way through (Laerdal's), icicles and ice glaze near the portals; a concrete hood under snow at each mouth, a blue
//             board with its length
//   hongkong  the cross-harbour tunnel: cream tiles with a green stripe, two lines of sodium strip light, lane signals over the
//             lanes, orange emergency telephones; a red board, the name in Chinese and English, over the portal
//   tokyo     a Shuto tunnel: white enamel panels over a blue dado, two lines of white LED light, green guide boards hung over the
//             lanes, 60 signs, red hydrant boxes, green emergency exits; a name plate on the portal
// Render only (the replay fingerprint never reads this). Everything stands on the walls or hangs from the ceiling, never in the
// lanes: below FREE m a fitting keeps behind the pavement's edge (the wall is 0.3 m beyond it), over the lanes nothing comes lower
// than OVER m (the chase camera rides at 5.5 m inside). One InstancedMesh per shape (its colours per instance) for the whole level and
// one merged mesh for all the signs (one canvas atlas, 256 px), so a level's dressing is five draw calls at most. (.tunnelthemes-check holds it.)
import * as THREE from 'three';
import { Track } from '../track.js';

export const FREE = 5.0, OVER = 6.3, OUTSIDE = 7.6; // m: below FREE nothing past the pavement's edge; over the lanes nothing lower than OVER
// inside (the camera rides at 5.5 m there), nor than OUTSIDE out beyond a portal (where the camera is kept under the ceiling less a metre)

// the looks, by THEME NAME (a theme with a `tunnel` of its own in themes.js keeps it: render/tunnel.js puts that over these).
// Beside tunnel.js's colours: wallMap (the wall's texture: draw, U m along a repeat, V m up one), band (false: no pale band, the
// texture has its own), lamps ({ rows: m in from each wall (none: down the middle), every, size [w, h, d], drop }), glow (the
// lamps' halo, its opacity), selfLit (the walls lit by the lamps as well as the scene: the colour of that light, on a night theme,
// where the scene's light is the night's), dark (the fog's colour inside), dress (the fittings below)
export const TUNNEL_LOOKS = {
  city: { wall: 0xffffff, roof: 0x2f3238, face: 0x8a8e94, lamp: 0xeef4ff, band: false, wallMap: 'bypass', glow: 0.3, dark: 0x0b0d12, dress: 'bypass',
    lamps: { rows: [0.9], every: 8, size: [0.3, 0.18, 1.8], drop: 0.35 } },
  port: { wall: 0xffffff, roof: 0x33383e, face: 0x5d6e7e, lamp: 0xffb347, band: false, wallMap: 'dock', glow: 0.4, dark: 0x120e09, dress: 'dock',
    lamps: { every: 10, size: [0.6, 0.16, 1.4], drop: 0.12 } },
  snow: { wall: 0xffffff, roof: 0x3c3f43, face: 0x6c7075, lamp: 0xffd08a, band: false, wallMap: 'rock', roofMap: true, glow: 0.38, dark: 0x080b10, dress: 'rock',
    lamps: { rows: [0.9], side: 1, every: 14, size: [0.7, 0.22, 0.9], drop: 1.6 } }, // (down the one wall, on brackets)
  hongkong: { wall: 0xffffff, roof: 0x2b2a2c, face: 0xd4c9ab, lamp: 0xffa040, band: false, wallMap: 'harbour', glow: 0.42, selfLit: 0x6a4a28, dark: 0x140d07, dress: 'harbour',
    lamps: { rows: [1.1], every: 5, size: [0.28, 0.14, 4.2], drop: 0.5 } },
  tokyo: { wall: 0xffffff, roof: 0x55595f, face: 0x8d9298, lamp: 0xf2f8ff, band: false, wallMap: 'shuto', glow: 0.3, selfLit: 0x5a5f68, dark: 0x090c14, dress: 'shuto',
    lamps: { rows: [0.7], every: 4, size: [0.24, 0.12, 3.7], drop: 0.3 } },
};

// a seeded random (the same tunnel every time)
const seeded = (n) => { let seed = 1 + n; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; };
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---- THE WALLS' TEXTURES (drawn on a canvas; v runs from the wall's foot (bottom of the canvas) to the ceiling, 8.5 m, unless V says)
const WALLS = {
  bypass: { w: 128, h: 256, U: 4, draw(x, W, H) {
    const m = H / 8.5;
    x.fillStyle = '#6c7076'; x.fillRect(0, 0, W, H);                      // bare concrete over the tiles
    x.fillStyle = '#62666c'; for (let y = 0; y < H - 4.4 * m; y += 1.5 * m) x.fillRect(0, y, W, 1);
    x.fillStyle = '#e6e8e2'; x.fillRect(0, H - 4.4 * m, W, 3.2 * m);      // the white tiles, 1.2 to 4.4 m
    x.fillStyle = '#bfc2bb';
    for (let y = H - 4.4 * m; y < H - 1.2 * m; y += 8) x.fillRect(0, y, W, 1);
    for (let i = 0; i < W; i += 8) x.fillRect(i, H - 4.4 * m, 1, 3.2 * m);
    x.fillStyle = '#2d5aa0'; x.fillRect(0, H - 1.2 * m, W, 0.22 * m);     // the blue stripe
    x.fillStyle = '#44484e'; x.fillRect(0, H - 0.98 * m, W, 0.98 * m);    // the dado
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, H - 4.4 * m, W, 3);   // (the tiles' top edge)
  } },
  dock: { w: 128, h: 256, U: 4, draw(x, W, H) {
    const m = H / 8.5, r = seeded(3);
    x.fillStyle = '#7c868e'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#6a737a'; x.fillRect(0, 0, W, H - 6 * m);               // (darker up top)
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(40,36,30,${0.06 + r() * 0.1})`; x.fillRect(r() * W, r() * H * 0.7, 2 + r() * 3, 20 + r() * 60); } // rust streaks
    x.fillStyle = '#5c646b'; x.fillRect(0, 0, 2, H); x.fillRect(W / 2, 0, 2, H); // the panels' joints, every 2 m
    x.fillStyle = '#f2f2ee'; x.fillRect(0, H - 1.62 * m, W, 0.1 * m);      // a white line over...
    const top = H - 1.4 * m;                                               // ...yellow and black hazard paint, to 1.4 m
    x.fillStyle = '#f2c230'; x.fillRect(0, top, W, H - top);
    x.save(); x.beginPath(); x.rect(0, top, W, H - top); x.clip();
    x.fillStyle = '#1e1e1e';
    for (let i = -64; i < W + 64; i += 32) { x.beginPath(); x.moveTo(i, H); x.lineTo(i + 16, H); x.lineTo(i + 16 + (H - top), top); x.lineTo(i + (H - top), top); x.fill(); }
    x.restore();
  } },
  rock: { w: 128, h: 128, U: 5, V: 5, draw(x, W, H) {
    const r = seeded(11);
    x.fillStyle = '#5d6065'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { // blocks and facets of blasted rock, wrapping round the edges
      const g = 70 + Math.floor(r() * 50), cx = r() * W, cy = r() * H, s = 4 + r() * 16;
      x.fillStyle = `rgba(${g},${g + 2},${g + 6},0.55)`;
      for (const [ox, oy] of [[0, 0], [-W, 0], [0, -H], [-W, -H]]) {
        x.beginPath(); x.moveTo(cx + ox, cy + oy - s); x.lineTo(cx + ox + s * 0.9, cy + oy); x.lineTo(cx + ox + s * 0.2, cy + oy + s * 0.8); x.lineTo(cx + ox - s * 0.8, cy + oy + s * 0.1); x.fill();
      }
    }
    x.strokeStyle = 'rgba(25,26,30,0.7)'; x.lineWidth = 1;
    for (let i = 0; i < 9; i++) { let px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 30; py += r() * 18; x.lineTo(px, py); } x.stroke(); } // cracks
    x.fillStyle = 'rgba(30,32,36,0.35)'; for (let i = 8; i < W; i += 21) x.fillRect(i, 0, 2, H); // the drill holes' half-barrels
    for (let i = 0; i < 4; i++) { const sx = r() * W; const grd = x.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(20,24,30,0.0)'); grd.addColorStop(1, 'rgba(20,24,30,0.35)'); x.fillStyle = grd; x.fillRect(sx, 0, 5 + r() * 6, H); } // wet
  } },
  harbour: { w: 128, h: 256, U: 4, draw(x, W, H) {
    const m = H / 8.5;
    x.fillStyle = '#38383c'; x.fillRect(0, 0, W, H);                      // sooty paint over the tiles
    x.fillStyle = '#e8dcbc'; x.fillRect(0, H - 4.6 * m, W, 3.7 * m);      // cream tiles 0.9 to 4.6 m
    x.fillStyle = '#c4b896';
    for (let y = H - 4.6 * m; y < H - 0.9 * m; y += 10) x.fillRect(0, y, W, 1);
    for (let i = 0; i < W; i += 10) x.fillRect(i, H - 4.6 * m, 1, 3.7 * m);
    const grd = x.createLinearGradient(0, H - 4.6 * m, 0, H - 3.4 * m); grd.addColorStop(0, 'rgba(50,40,30,0.45)'); grd.addColorStop(1, 'rgba(50,40,30,0)');
    x.fillStyle = grd; x.fillRect(0, H - 4.6 * m, W, 1.2 * m);           // (soot along the tiles' top)
    x.fillStyle = '#1f7a4a'; x.fillRect(0, H - 1.65 * m, W, 0.32 * m);    // the green stripe
    x.fillStyle = '#3c4a40'; x.fillRect(0, H - 0.9 * m, W, 0.9 * m);      // the dado
  } },
  shuto: { w: 128, h: 256, U: 4, draw(x, W, H) {
    const m = H / 8.5;
    x.fillStyle = '#8a9097'; x.fillRect(0, 0, W, H);                      // painted concrete over the panels
    x.fillStyle = '#dfe3e6'; x.fillRect(0, H - 5 * m, W, 4 * m);          // white enamel panels, 1 to 5 m
    x.fillStyle = '#b4bbc2';
    for (let y = H - 5 * m; y < H - m; y += m) x.fillRect(0, y, W, 1);
    for (let i = 0; i < W; i += 32) x.fillRect(i, H - 5 * m, 1, 4 * m);
    x.fillStyle = '#f4f6f8'; x.fillRect(0, H - 1.08 * m, W, 0.08 * m);
    x.fillStyle = '#2f5d8a'; x.fillRect(0, H - m, W, m);                  // the blue dado
  } },
};
const textures = new Map(); // (one of each, kept for the page's life: 128 x 256 px, 128 KB)
export const wallTexture = (name) => {
  if (!WALLS[name]) return null;
  if (!textures.has(name)) {
    const T = WALLS[name], c = canvasOf(T.w, T.h);
    T.draw(c.getContext('2d'), T.w, T.h);
    const map = new THREE.CanvasTexture(c);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    textures.set(name, { map, U: T.U, V: T.V ?? 8.5, side: Math.max(T.w, T.h) });
  }
  return textures.get(name);
};

// ---- GLOWS: a soft spot ('spot', under a lamp) and a wash rising from the floor ('rise', the blue cavern's), white on black for
// additive blending (black adds nothing), 64 px, one of each
const glows = new Map();
export const glowTexture = (kind) => {
  if (!glows.has(kind)) {
    const c = canvasOf(64, 64), x = c.getContext('2d');
    const g = kind === 'spot' ? x.createRadialGradient(32, 32, 2, 32, 32, 32) : x.createLinearGradient(0, 64, 0, 0);
    g.addColorStop(0, '#ffffff'); g.addColorStop(kind === 'spot' ? 0.35 : 0.3, kind === 'spot' ? '#8a8a8a' : '#9a9a9a'); g.addColorStop(1, '#000000');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    glows.set(kind, map);
  }
  return glows.get(kind);
};

// ---- THE SIGNS: one 256 px atlas a kind, its cells [x, y, w, h, draw]
const board = (bg, fg, lines, opts = {}) => (x, X, Y, W, H) => {
  x.fillStyle = bg; x.fillRect(X, Y, W, H);
  if (opts.rim) { x.strokeStyle = opts.rim; x.lineWidth = 3; x.strokeRect(X + 3, Y + 3, W - 6, H - 6); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(([text, size, dy = 0]) => { x.font = `bold ${size}px "Noto Sans CJK SC", "WenQuanYi Zen Hei", "Hiragino Sans", "Microsoft YaHei", Arial, sans-serif`; x.fillText(text, X + W / 2, Y + H / 2 + dy, W - 10); });
};
const roundSign = (ring, fill, text, ink, size) => (x, X, Y, W, H) => {
  x.fillStyle = '#20232a'; x.fillRect(X, Y, W, H);
  x.beginPath(); x.arc(X + W / 2, Y + H / 2, W / 2 - 2, 0, Math.PI * 2); x.fillStyle = ring; x.fill();
  x.beginPath(); x.arc(X + W / 2, Y + H / 2, W / 2 - 9, 0, Math.PI * 2); x.fillStyle = fill; x.fill();
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${size}px Arial, sans-serif`; x.fillText(text, X + W / 2, Y + H / 2 + 1, W - 20);
};
const ATLAS = {
  bypass: {
    name: [0, 0, 256, 56, board('#1d4f9a', '#ffffff', [['BYPASS TUNNEL', 30]], { rim: '#ffffff' })],
    sos: [0, 56, 64, 64, board('#1d4f9a', '#ffffff', [['SOS', 24]], { rim: '#ffffff' })],
    exit: [64, 56, 128, 48, board('#138a3e', '#ffffff', [['EXIT', 28]], { rim: '#ffffff' })],
    limit: [192, 56, 64, 64, roundSign('#d0202a', '#ffffff', '4.5m', '#111', 17)],
  },
  dock: {
    name: [0, 0, 256, 56, board('#1a1a1a', '#f2c230', [['DOCK TUNNEL', 32]], { rim: '#f2c230' })],
    b4: [0, 64, 128, 40, board('#1a1a1a', '#f2c230', [['BERTH 4', 24]])],
    b5: [128, 64, 128, 40, board('#1a1a1a', '#f2c230', [['BERTH 5', 24]])],
    b6: [0, 104, 128, 40, board('#1a1a1a', '#f2c230', [['BERTH 6', 24]])],
    b7: [128, 104, 128, 40, board('#1a1a1a', '#f2c230', [['BERTH 7', 24]])],
    limit: [0, 152, 64, 64, roundSign('#d0202a', '#ffffff', '5.0m', '#111', 17)],
  },
  rock: {
    name: [0, 0, 256, 64, board('#1a4d8f', '#ffffff', [['FJORD TUNNEL', 30, -9], ['', 20, 17]], { rim: '#ffffff' })], // (its length written in below)
    sos: [0, 64, 64, 64, board('#1a4d8f', '#ffffff', [['SOS', 24]], { rim: '#ffffff' })],
  },
  harbour: {
    name: [0, 0, 256, 72, board('#c8262e', '#ffffff', [['海底隧道', 34, -12], ['CROSS HARBOUR TUNNEL', 17, 22]])],
    go: [0, 72, 64, 64, (x, X, Y, W, H) => { x.fillStyle = '#0c0c0c'; x.fillRect(X, Y, W, H); x.fillStyle = '#35ff6a'; x.beginPath(); x.moveTo(X + 22, Y + 10); x.lineTo(X + 42, Y + 10); x.lineTo(X + 42, Y + 34); x.lineTo(X + 54, Y + 34); x.lineTo(X + 32, Y + 56); x.lineTo(X + 10, Y + 34); x.lineTo(X + 22, Y + 34); x.fill(); }],
    phone: [64, 72, 128, 56, board('#e8771e', '#ffffff', [['緊急電話', 22, -10], ['EMERGENCY PHONE', 12, 15]])],
    exit: [0, 136, 256, 64, board('#1f6b3c', '#ffffff', [['九龍 紅磡 ↑', 26, -10], ['Kowloon  Hung Hom', 16, 18]], { rim: '#ffffff' })],
  },
  shuto: {
    name: [0, 0, 256, 64, board('#2a2d33', '#ffffff', [['山手トンネル', 28, -11], ['YAMATE TUNNEL', 15, 19]], { rim: '#c9cdd2' })],
    guide: [0, 64, 256, 80, board('#1e7a3c', '#ffffff', [['新宿  渋谷 ↑', 30, -14], ['Shinjuku   Shibuya', 17, 20]], { rim: '#ffffff' })],
    limit: [0, 144, 64, 64, roundSign('#d0202a', '#ffffff', '60', '#1d3f9a', 26)],
    exit: [64, 144, 128, 48, board('#138a3e', '#ffffff', [['非常口 EXIT', 22]])],
    hydrant: [192, 144, 64, 40, board('#c81e24', '#ffffff', [['消火栓', 18]])],
  },
};

// ---- THE FITTINGS
const cube = new THREE.BoxGeometry(1, 1, 1);
const pipe = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2); // (along the road)
const icicle = new THREE.ConeGeometry(0.5, 1, 6).rotateX(Math.PI);           // (point down)
const GEOS = { cube, pipe, icicle };
const p = new THREE.Vector3(), q = new THREE.Vector3(), dummy = new THREE.Object3D();

// the plan of a level's dressing: { boxes: Map(key -> { geo, glow (false, true: lit, 'add': a wash of light), list, colors }), quads: [...], fittings: [...] (each one's s, lateral
// extent and heights, for the check), atlas } , from the level's tunnels and their ceilings' heights (hAtOf(t): s -> m)
export const planDress = (kind, tunnels, hAtOf) => {
  const boxes = new Map(), quads = [], fittings = [];
  const r = seeded(kind.length * 7 + tunnels.length);
  const lo = (s) => Track.lo(s) - 0.3, hi = (s) => Track.hi(s) + 0.3; // (the wall lines, as tunnel.js has them)
  const wallAt = (side, s, d) => side < 0 ? lo(s) + d : hi(s) - d;      // d m in from that wall
  const mid = (s) => (Track.lo(s) + Track.hi(s)) / 2;
  // a box: [s, lat, y (of its middle, over the road there), w (across), h, d (along)]; or a run from (s, lat) to to = [s1, lat1]
  const box = (geo, color, s, lat, y, w, h, d, glow = false, to = null) => {
    const key = geo + '|' + glow;
    if (!boxes.has(key)) boxes.set(key, { geo, glow, list: [], colors: [] });
    boxes.get(key).list.push([s, lat, y, w, h, d, to]);
    boxes.get(key).colors.push(color);
    const lats = to ? [lat, to[1]] : [lat];
    fittings.push({ kind: geo, s, s1: to ? to[0] : s, latLo: Math.min(...lats) - w / 2, latHi: Math.max(...lats) + w / 2, y0: y - h / 2, y1: y + h / 2 });
  };
  // a sign: a cell of the atlas on a quad, `facing` 'front' (to a driver coming along) or a side (-1 / 1: flat on that wall, to the road)
  const sign = (cell, s, lat, y, w, h, facing) => {
    quads.push({ cell, s, lat, y, w, h, facing });
    fittings.push({ kind: 'sign', s, s1: s, latLo: lat - w / 2, latHi: lat + w / 2, y0: y - h / 2, y1: y + h / 2 });
  };
  // a run of something along a wall (a pipe, a tray), in pieces of `step` m that follow the bends
  const run = (geo, color, t, side, d, y, w, h, step = 6, glow = false) => {
    for (let s = t.from; s < t.to - 0.01; s += step) { const s1 = Math.min(t.to, s + step); box(geo, color, s, wallAt(side, s, d), y, w, h, 0, glow, [s1, wallAt(side, s1, d)]); }
  };
  // the lanes' width at s, over which a thing hung from the ceiling spans
  const across = (s) => Track.laneHi(s) - Track.laneLo(s);

  for (const t of tunnels) {
    const hAt = hAtOf(t), L = t.to - t.from;
    if (kind === 'bypass') {
      // jet fans in pairs across the ceiling, every 110 m, each hung on two straps, its ends darker
      for (let s = t.from + 55; s < t.to - 30; s += 110) {
        const H = hAt(s);
        for (const off of [-3.2, 3.2]) {
          const lat = mid(s) + off, y = H - 0.95;
          box('pipe', 0x9aa1a8, s, lat, y, 0.95, 0.95, 3.4);
          box('pipe', 0x2a2d31, s - 1.75, lat, y, 1.02, 1.02, 0.16); box('pipe', 0x2a2d31, s + 1.75, lat, y, 1.02, 1.02, 0.16);
          box('cube', 0x4a4f55, s - 1.0, lat, H - 0.27, 0.1, 0.55, 0.1); box('cube', 0x4a4f55, s + 1.0, lat, H - 0.27, 0.1, 0.55, 0.1);
        }
      }
      // SOS niches and emergency doors, sides in turn; reflector posts down both walls
      for (let s = t.from + 40, k = 0; s < t.to - 20; s += 75, k++) {
        const side = k % 2 ? 1 : -1;
        if (k % 2 === 0) {
          box('cube', 0x1d4f9a, s, wallAt(side, s, 0.06), 1.25, 0.12, 2.3, 1.7);
          box('cube', 0xd8dde4, s, wallAt(side, s, 0.13), 1.2, 0.04, 0.9, 0.5);     // (the phone's cabinet)
          sign('sos', s, wallAt(side, s, 0.02), 2.95, 0.9, 0.9, side);
        } else {
          box('cube', 0x1d8a4a, s, wallAt(side, s, 0.06), 1.15, 0.12, 2.3, 1.3);
          box('cube', 0xdfe6df, s + 0.45, wallAt(side, s, 0.13), 1.1, 0.04, 0.08, 0.25); // (its handle)
          sign('exit', s, wallAt(side, s, 0.02), 2.75, 1.4, 0.52, side);
        }
      }
      for (let s = t.from + 6; s < t.to; s += 12) for (const side of [-1, 1]) {
        box('cube', 0xf2f2f2, s, wallAt(side, s, 0.05), 0.75, 0.1, 0.5, 0.18);
        box('cube', 0xff7a1a, s, wallAt(side, s, 0.11), 0.85, 0.02, 0.14, 0.14, true);
      }
      // the portal: the name board over the opening, the height sign beside it
      const H0 = hAt(t.from);
      sign('name', t.from - 0.66, mid(t.from), H0 + 3.2, 11, 2.4, 'front');
      sign('limit', t.from - 0.66, mid(t.from) + 8.5, H0 + 3.2, 2, 2, 'front');
    } else if (kind === 'dock') {
      // steel frames every 24 m: a post up each wall and a beam across the ceiling
      for (let s = t.from + 12; s < t.to - 4; s += 24) {
        const H = hAt(s);
        for (const side of [-1, 1]) box('cube', 0x3e4a56, s, wallAt(side, s, 0.12), H / 2, 0.24, H, 0.5);
        box('cube', 0x3e4a56, s, mid(s), H - 0.3, hi(s) - lo(s), 0.6, 0.5);
      }
      // the fire main (red) and a water pipe (blue) down the walls, high, on brackets
      for (const side of [-1, 1]) {
        run('pipe', side < 0 ? 0xb3261e : 0x2f5f9e, t, side, 0.42, 5.9, 0.42, 0.42);
        run('pipe', side < 0 ? 0x2f5f9e : 0x7a8088, t, side, 0.35, 6.7, 0.3, 0.3);
        for (let s = t.from + 3; s < t.to; s += 6) box('cube', 0x2a2e33, s, wallAt(side, s, 0.3), 6.3, 0.6, 1.2, 0.12);
      }
      // BERTH boards on the walls, sides in turn
      for (let s = t.from + 50, k = 0; s < t.to - 20; s += 70, k++) {
        const side = k % 2 ? 1 : -1;
        sign('b' + (4 + (k % 4)), s, wallAt(side, s, 0.03), 2.6, 2.6, 0.8, side);
      }
      // the portal: containers stacked on the lintel, the name board, the headroom sign
      const H0 = hAt(t.from), BOX = [0xc0392b, 0x2e6da4, 0x2e8b57, 0xd9822b, 0x7b3fa0];
      for (const end of [t.from, t.to]) {
        const H = hAt(end), m = mid(end), top = H + 9, out = end === t.from ? -1 : 1;
        for (const [off, c, up] of [[-6.3, 0, 0], [6.3, 1, 0], [-0.5, 2, 1]]) box('cube', BOX[(c + (end === t.to ? 2 : 0)) % BOX.length], end + out * 0.2, m + off, top + 1.3 + up * 2.6, 12.2, 2.6, 2.44);
      }
      sign('name', t.from - 0.66, mid(t.from), H0 + 3.4, 11, 2.4, 'front');
      sign('limit', t.from - 0.66, mid(t.from) + 8.3, H0 + 3.4, 1.9, 1.9, 'front');
    } else if (kind === 'rock') {
      // a cable tray high on the near wall, the lamps' brackets on the far one (tunnel.js puts the lamps there: rows -1)
      run('cube', 0x6d7278, t, -1, 0.4, 6.4, 0.6, 0.12, 6);
      for (let s = t.from + 3; s < t.to; s += 6) box('cube', 0x3a3d42, s, wallAt(-1, s, 0.25), 6.25, 0.5, 0.3, 0.08);
      for (let k = 0; ; k++) { const s = t.from + 14 * (k + 0.5); if (s > t.to) break; box('cube', 0x3a3d42, s, wallAt(1, s, 0.45), hAt(s) - 1.45, 0.9, 0.1, 0.12); }
      // the blue cavern half way through: blue light along both walls' feet and up them, for 60 m
      const c0 = t.from + L / 2 - 30, c1 = c0 + 60;
      if (L > 160) for (let s = c0; s <= c1; s += 3) for (const side of [-1, 1]) {
        box('cube', 0x3aa8ff, s, wallAt(side, s, 0.08), 0.35, 0.16, 0.18, 1.6, true);
        box('cube', 0x1a50a0, s, wallAt(side, s, 0.04), 2.6, 0.04, 4.2, 2.9, 'add');
      }
      // SOS cabinets every 100 m, sides in turn
      for (let s = t.from + 60, k = 0; s < t.to - 20; s += 100, k++) {
        const side = k % 2 ? 1 : -1;
        box('cube', 0xd8dde4, s, wallAt(side, s, 0.1), 1.2, 0.2, 1.6, 1.0);
        sign('sos', s, wallAt(side, s, 0.21), 1.45, 0.7, 0.7, side);
      }
      // ice: icicles from the ceiling by the walls and glaze down the walls, within 26 m of either portal
      for (const [a, b] of [[t.from, t.from + 26], [t.to - 26, t.to]]) {
        for (let s = a + 1; s < b; s += 1.3 + r() * 1.6) for (const side of [-1, 1]) {
          if (r() < 0.35) continue;
          const len = 0.3 + r() * 0.6, H = hAt(s);
          box('icicle', 0xdff3ff, s, wallAt(side, s, 0.25 + r() * 1.2), H - len / 2, 0.16 + r() * 0.12, len, 0.16 + r() * 0.12);
        }
        for (let s = a + 3; s < b - 2; s += 5 + r() * 4) for (const side of [-1, 1]) {
          if (r() < 0.4) continue;
          const tall = 1.5 + r() * 3.5;
          box('cube', 0xbfe6f6, s, wallAt(side, s, 0.03), tall / 2, 0.06, tall, 1 + r() * 2);
        }
      }
      // at each mouth a concrete hood out over the road 8 m (its walls on the wall lines), under snow, and icicles off its front
      for (const [end, out] of [[t.from, -1], [t.to, 1]]) {
        const H = hAt(end), s0 = end + out * 0.6, s1 = end + out * 8.6, sm = (s0 + s1) / 2;
        for (const side of [-1, 1]) {
          box('cube', 0xa9adb2, s0, side < 0 ? lo(s0) - 0.35 : hi(s0) + 0.35, H / 2, 0.7, H, 0, false, [s1, side < 0 ? lo(s1) - 0.35 : hi(s1) + 0.35]);
        }
        box('cube', 0xa9adb2, sm, mid(sm), H + 0.35, hi(sm) - lo(sm) + 1.4, 0.7, 8);
        box('cube', 0xf4f7fa, sm, mid(sm), H + 1.0, hi(sm) - lo(sm) + 1.0, 0.6, 7.6); // the snow on it
        box('cube', 0xf4f7fa, end + out * 0.2, mid(end), H + 9.25, hi(end) - lo(end) + 16.6, 0.5, 2.0); // and along the face's top
        for (let a = lo(s1) + 0.6; a < hi(s1) - 0.3; a += 0.7 + r() * 0.9) {
          const len = 0.2 + r() * 0.6;
          box('icicle', 0xdff3ff, s1 - out * 0.3, a, H - len / 2, 0.14 + r() * 0.1, len, 0.14 + r() * 0.1);
        }
      }
      const H0 = hAt(t.from);
      sign('name', t.from - 0.66, mid(t.from), H0 + 3.4, 8, 2.0, 'front');
    } else if (kind === 'harbour') {
      // lane signals over the lanes every 100 m: a beam across under the ceiling, a lit arrow over each lane
      for (let s = t.from + 40; s < t.to - 20; s += 100) {
        const H = hAt(s);
        box('cube', 0x2a2b2e, s, mid(s), H - 0.9, hi(s) - lo(s), 0.3, 0.3);
        for (let lane = 0; lane < Track.laneCount; lane++) {
          const lat = Track.laneOffset(lane, s);
          if (lat < Track.laneLo(s) || lat > Track.laneHi(s)) continue;
          box('cube', 0x101012, s, lat, H - 1.55, 1.0, 1.0, 0.4);
          box('cube', 0x2a2b2e, s, lat, H - 0.95, 0.12, 0.3, 0.12);
          sign('go', s - 0.22, lat, H - 1.55, 0.9, 0.9, 'front');
        }
      }
      // orange emergency telephones, sides in turn
      for (let s = t.from + 70, k = 0; s < t.to - 20; s += 80, k++) {
        const side = k % 2 ? 1 : -1;
        box('cube', 0xe8771e, s, wallAt(side, s, 0.1), 1.3, 0.2, 1.6, 1.1);
        sign('phone', s, wallAt(side, s, 0.21), 1.75, 1.0, 0.44, side);
      }
      // a cable tray down each wall over the dado, and the exit board hung over the lanes near the far end
      for (const side of [-1, 1]) run('cube', 0x55575c, t, side, 0.2, 5.4, 0.4, 0.1, 6);
      const se = t.to - Math.min(90, L * 0.3), He = hAt(se);
      box('cube', 0x2a2b2e, se, mid(se) - 3, He - 0.4, 0.12, 0.8, 0.12); box('cube', 0x2a2b2e, se, mid(se) + 3, He - 0.4, 0.12, 0.8, 0.12);
      box('cube', 0x1f6b3c, se, mid(se), He - 1.3, 9.2, 1.8, 0.2);
      sign('exit', se - 0.12, mid(se), He - 1.3, 8.8, 1.7, 'front');
      const H0 = hAt(t.from);
      sign('name', t.from - 0.66, mid(t.from), H0 + 3.4, 12, 3.4, 'front');
    } else if (kind === 'shuto') {
      // green guide boards hung over the lanes, every 140 m
      for (let s = t.from + 60; s < t.to - 30; s += 140) {
        const H = hAt(s), w = Math.min(11, across(s) - 0.4);
        for (const off of [-w / 3, w / 3]) box('cube', 0x6d7278, s, mid(s) + off, H - 0.3, 0.12, 0.6, 0.12);
        box('cube', 0x1e7a3c, s, mid(s), H - 1.3, w, 1.8, 0.2);
        sign('guide', s - 0.12, mid(s), H - 1.3, w - 0.2, 1.7, 'front');
      }
      // 60 signs, red hydrant boxes (a red lamp over each) and green emergency exits, down the walls
      for (let s = t.from + 25, k = 0; s < t.to - 10; s += 50, k++) {
        const side = k % 2 ? 1 : -1;
        box('cube', 0xc81e24, s, wallAt(side, s, 0.1), 1.2, 0.2, 1.4, 1.0);
        sign('hydrant', s, wallAt(side, s, 0.21), 1.55, 0.8, 0.5, side);
        box('cube', 0xff2a1a, s, wallAt(side, s, 0.12), 2.25, 0.24, 0.24, 0.24, true);
        if (k % 2 === 0) { if (s + 12 < t.to - 5) sign('limit', s + 12, wallAt(-side, s + 12, 0.03), 3.2, 1.2, 1.2, -side); }
        else if (s + 25 < t.to - 5) {
          box('cube', 0x138a3e, s + 25, wallAt(-side, s + 25, 0.06), 1.15, 0.12, 2.3, 1.2);
          sign('exit', s + 25, wallAt(-side, s + 25, 0.02), 2.8, 1.6, 0.6, -side);
        }
      }
      const H0 = hAt(t.from);
      sign('name', t.from - 0.66, mid(t.from), H0 + 3.0, 9, 2.25, 'front');
    }
  }
  return { boxes, quads, fittings };
};

// the atlas for a kind (its length on the rock tunnel's board: the level's first tunnel's)
const atlasFor = (kind, tunnels) => {
  const cells = ATLAS[kind], c = canvasOf(256, 256), x = c.getContext('2d');
  for (const [X, Y, W, H, draw] of Object.values(cells)) draw(x, X, Y, W, H);
  if (kind === 'rock' && tunnels.length) { // (the length under the name)
    const [X, Y, W, H] = cells.name;
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 20px Arial, sans-serif';
    x.fillText(Math.round(tunnels[0].to - tunnels[0].from) + ' m', X + W / 2, Y + H / 2 + 17);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return { map, cells };
};

// the quads of the signs, merged into one geometry (world space) with their atlas cells for uv
const quadGeometry = (quads, cells) => {
  const pos = [], uv = [], idx = [];
  const side = new THREE.Vector3(), c = new THREE.Vector3(), look = new THREE.Vector3();
  for (const { cell, s, lat, y, w, h, facing } of quads) {
    Track.toWorld(s, lat, c); c.y += y;
    if (facing === 'front') { Track.toWorld(s + 0.5, lat, p); Track.toWorld(s - 0.5, lat, q); }
    else { Track.toWorld(s, lat + facing * 0.5, p); Track.toWorld(s, lat - facing * 0.5, q); } // (looking out at the wall)
    look.set(p.x - q.x, 0, p.z - q.z).normalize();
    side.set(-look.z, 0, look.x);                 // (the viewer's right)
    if (Track.mirrored) side.negate();            // (the scene is drawn mirrored on a left-hand level: so it reads)
    const [X, Y, W, H] = cells[cell], u0 = X / 256, u1 = (X + W) / 256, v1 = 1 - Y / 256, v0 = 1 - (Y + H) / 256;
    const n = pos.length / 3;
    for (const [a, b, u, v] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
      pos.push(c.x + side.x * a * w / 2, c.y + b * h / 2, c.z + side.z * a * w / 2);
      uv.push(u, v);
    }
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
};

// place an entry's matrix in `dummy` (as road.js's instances do: a run is turned and stretched from one end to the other)
const place = ([s, lat, y, w, h, d, to]) => {
  dummy.rotation.set(0, 0, 0);
  if (to) {
    Track.toWorld(s, lat, p); Track.toWorld(to[0], to[1], q);
    const run = Math.hypot(q.x - p.x, q.z - p.z);
    dummy.rotation.order = 'YXZ';
    dummy.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
    dummy.rotation.x = -Math.atan2(q.y - p.y, run);
    dummy.position.set((p.x + q.x) / 2, (p.y + q.y) / 2 + y, (p.z + q.z) / 2);
    dummy.scale.set(w, h, Math.hypot(run, q.y - p.y) + 0.02);
  } else {
    dummy.rotation.y = Track.toWorld(s, lat, p);
    dummy.position.set(p.x, p.y + y, p.z);
    dummy.scale.set(w, h, d);
  }
  dummy.updateMatrix();
  dummy.rotation.order = 'XYZ';
};

// build a level's dressing into `group`: returns what it cost (meshes = draw calls, triangles, instances, the atlas's side)
export const dressTunnels = (kind, tunnels, hAtOf, group) => {
  const stats = { meshes: 0, triangles: 0, instances: 0, textureSide: 0, fittings: [] };
  if (!kind || !tunnels.length) return stats;
  const plan = planDress(kind, tunnels, hAtOf);
  stats.fittings = plan.fittings;
  const color = new THREE.Color();
  for (const { geo, glow, list, colors } of plan.boxes.values()) {
    const g = GEOS[geo];
    const mat = glow === 'add' ? new THREE.MeshBasicMaterial({ map: glowTexture('rise'), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
      : glow ? new THREE.MeshBasicMaterial() : new THREE.MeshLambertMaterial();
    const mesh = new THREE.InstancedMesh(g, mat, list.length);
    list.forEach((entry, i) => { place(entry); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, color.set(colors[i])); });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    stats.meshes++; stats.instances += list.length; stats.triangles += list.length * (g.index ? g.index.count : g.attributes.position.count) / 3;
  }
  if (plan.quads.length) {
    const { map, cells } = atlasFor(kind, tunnels);
    const mesh = new THREE.Mesh(quadGeometry(plan.quads, cells), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    group.add(mesh);
    stats.meshes++; stats.triangles += plan.quads.length * 2; stats.textureSide = 256;
  }
  return stats;
};
export const dressStats = { last: null }; // (render/tunnel.js's last build: for a look in the console and the check)
