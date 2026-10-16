// ---- the KILL EFFECTS themselves (render/killfx.js is the engine, the registry and the choice; CHECKLIST 405). One entry each:
//   name      the chip's name (short)
//   icon(g,s) its chip's little picture, drawn on an s x s canvas (code, no image files)
//   explode(S, x, y, z, vx, vz, k, ks, e)   an explosion at x, y, z (y: the road's height) carrying vx, vz; k: its size (1, 1.5 big,
//             times the event's scale), ks: its smoke (1, 1.5 big, times the event's smoke). S.spec() gives the one spec object to fill,
//             S.add(pool) puts it in that pool (render/killfx.js POOL_TYPES), S.n(n) is n, or about a third of it in the LOW version
//   trail(S, x, y, z, floor)   the bits a flying package leaves, called every frame it flies: two at most (as the classic flames)
//   sound     optional: one more of the shipped sounds played with the usual one ({ name, volume }); the usual sounds are kept
// 'classic' has no explode / trail here: it is today's code (render/particles.js classicExplode / classicTrail) on the classic pools.
// Six shipped that clearly differ from each other and from Classic; the experiment's others are cut (KILL_EXTRA below; Glitter dropped).
const FADE_DIM = 1, FADE_FLICKER = 2, FADE_POP = 3, FADE_FLASH = 4; // (render/killfx.js FADE; 0, SHRINK, is the spec's default)
const TAU = Math.PI * 2;
const r = (a) => (Math.random() - 0.5) * 2 * a;
const rr = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sq = Math.sqrt;

// a quick bright flash at the heart of it (a glowing dot)
const flash = (S, x, y, z, size, color, life = 0.16) => {
  const p = S.spec();
  p.x = x; p.y = y; p.z = z; p.size = size; p.color = color; p.life = life; p.fade = FADE_DIM;
  S.add('glow');
};
// soft smoke (a puff pool's dots), n of them, of a colour
const puffs = (S, n, x, y, z, vx, vz, ks, color, spread = 1.5) => {
  for (let i = 0, m = S.n(n); i < m; i++) {
    const p = S.spec();
    p.x = x + r(spread); p.y = y + 0.8 + Math.random() * 1.2; p.z = z + r(spread);
    p.vx = vx * 0.4 + r(1.5); p.vy = rr(1.5, 3.5); p.vz = vz * 0.4 + r(1.5);
    p.size = rr(1.1, 1.7) * ks; p.grow = 1.2; p.life = rr(0.9, 1.5); p.color = color; p.ax = Math.random() * TAU; p.sax = r(0.6);
    S.add('puff');
  }
};
// a direction out from the centre (up more than down): sets out.x/y/z
const DIR = { x: 0, y: 0, z: 0 };
const outward = (up = -0.2) => {
  const u = rr(up, 1), a = Math.random() * TAU, h = sq(1 - u * u);
  DIR.x = Math.sin(a) * h; DIR.y = u; DIR.z = Math.cos(a) * h;
  return DIR;
};

const CONFETTI = [0xff3b6b, 0xffd23f, 0x3bd16f, 0x3fa9ff, 0xb46bff, 0xff8a1a, 0xffffff];
const FIREWORK = [0xff4f8b, 0xffd23f, 0x4fd1ff, 0x8bff6a, 0xc58bff, 0xff7a3d];
const GOLD = [0xffc83d, 0xffd75e, 0xf0b429];
const BUBBLE = [0xbff3ff, 0xffd0f0, 0xd8c8ff, 0xffffff, 0xc8ffe0];
const STARS = [0xffd23f, 0xffffff, 0x5ad1ff, 0xff6fb5];
const BOLT = [0xffffff, 0xd8f0ff, 0x8fd0ff];
const CANDY = [0xff4f8b, 0x4fd1ff, 0xffd23f, 0x8be04f, 0xb07cff, 0xff8a3d];
const SPRINKLE = [0xff3b6b, 0xffd23f, 0x3bd16f, 0x3fa9ff, 0xffffff, 0xb46bff, 0xff8fd0];
const PIXEL = [0xff004d, 0xffa300, 0xffec27, 0x00e436, 0x29adff, 0xff77a8, 0xffffff];

// ---- the chips' icons (s x s canvas, transparent) ----
const icon = {
  classic: (g, s) => {
    const c = s / 2, grad = g.createRadialGradient(c, c, 1, c, c, s * 0.45);
    grad.addColorStop(0, '#fff6c0'); grad.addColorStop(0.35, '#ffd23f'); grad.addColorStop(0.7, '#ff8c1a'); grad.addColorStop(1, 'rgba(255,59,26,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(c, c, s * 0.45, 0, TAU); g.fill();
  },
  confetti: (g, s) => {
    const bits = [[0.25, 0.3, 0.6], [0.6, 0.22, -0.4], [0.75, 0.55, 0.9], [0.35, 0.68, -0.8], [0.52, 0.48, 0.2], [0.18, 0.55, 1.3], [0.7, 0.8, 0.4]];
    bits.forEach(([x, y, a], i) => { g.save(); g.translate(x * s, y * s); g.rotate(a); g.fillStyle = '#' + CONFETTI[i % CONFETTI.length].toString(16).padStart(6, '0'); g.fillRect(-s * 0.06, -s * 0.09, s * 0.12, s * 0.18); g.restore(); });
  },
  fireworks: (g, s) => {
    const c = s / 2; g.lineCap = 'round'; g.lineWidth = Math.max(2, s * 0.05);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.strokeStyle = i % 2 ? '#ff4f8b' : '#ffd23f'; g.beginPath(); g.moveTo(c + Math.sin(a) * s * 0.14, c - Math.cos(a) * s * 0.14); g.lineTo(c + Math.sin(a) * s * 0.42, c - Math.cos(a) * s * 0.42); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, s * 0.08, 0, TAU); g.fill();
  },
  coins: (g, s) => {
    const coin = (x, y, rad) => { g.fillStyle = '#e0a020'; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); g.fillStyle = '#ffd75e'; g.beginPath(); g.arc(x, y, rad * 0.78, 0, TAU); g.fill(); g.strokeStyle = '#e0a020'; g.lineWidth = Math.max(1, rad * 0.14); g.beginPath(); g.arc(x, y, rad * 0.5, 0, TAU); g.stroke(); };
    g.save(); g.translate(s * 0.68, s * 0.3); g.rotate(0.4); g.fillStyle = '#4fae55'; g.fillRect(-s * 0.2, -s * 0.1, s * 0.4, s * 0.2); g.fillStyle = '#8fe08a'; g.fillRect(-s * 0.06, -s * 0.06, s * 0.12, s * 0.12); g.restore();
    coin(s * 0.36, s * 0.62, s * 0.24); coin(s * 0.68, s * 0.7, s * 0.17);
  },
  bubbles: (g, s) => {
    const b = (x, y, rad) => { g.strokeStyle = '#bff3ff'; g.lineWidth = Math.max(1.5, s * 0.04); g.fillStyle = 'rgba(191,243,255,0.25)'; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - rad * 0.35, y - rad * 0.4, rad * 0.18, 0, TAU); g.fill(); };
    b(s * 0.4, s * 0.58, s * 0.28); b(s * 0.72, s * 0.32, s * 0.16); b(s * 0.78, s * 0.72, s * 0.11);
  },
  pixels: (g, s) => {
    const u = s / 8, cells = [[3, 1], [4, 2], [2, 3], [5, 3], [3, 4], [1, 5], [4, 5], [6, 5], [2, 6], [5, 6], [3, 3]];
    cells.forEach(([x, y], i) => { g.fillStyle = '#' + PIXEL[i % PIXEL.length].toString(16).padStart(6, '0'); g.fillRect(x * u, y * u, u * 0.92, u * 0.92); });
  },
  comic: (g, s) => {
    const c = s / 2, star = (rad, fill) => { g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, q = i % 2 ? rad * 0.5 : rad * (0.95 - (i % 5) * 0.04); g.lineTo(c + Math.sin(a) * q, c - Math.cos(a) * q); } g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = Math.max(1.5, s * 0.04); g.strokeStyle = '#111'; g.stroke(); };
    star(s * 0.47, '#ffd23f'); star(s * 0.27, '#ff4b2b');
  },
  lightning: (g, s) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    const path = [[0.58, 0.06], [0.36, 0.44], [0.55, 0.46], [0.34, 0.94]];
    for (const [w, col] of [[s * 0.16, 'rgba(111,195,255,0.5)'], [s * 0.07, '#e8f6ff']]) { g.lineWidth = w; g.strokeStyle = col; g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s))); g.stroke(); }
  },
  candy: (g, s) => {
    g.save(); g.translate(s * 0.45, s * 0.5); g.rotate(-0.5);
    g.fillStyle = '#ff4f8b';
    g.beginPath(); g.moveTo(-s * 0.42, -s * 0.15); g.lineTo(-s * 0.16, 0); g.lineTo(-s * 0.42, s * 0.15); g.fill();
    g.beginPath(); g.moveTo(s * 0.42, -s * 0.15); g.lineTo(s * 0.16, 0); g.lineTo(s * 0.42, s * 0.15); g.fill();
    g.beginPath(); g.arc(0, 0, s * 0.2, 0, TAU); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.5, s * 0.05); for (const d of [-0.08, 0.06]) { g.beginPath(); g.moveTo(d * s - s * 0.06, -s * 0.17); g.lineTo(d * s + s * 0.06, s * 0.17); g.stroke(); }
    g.restore();
    [[0.2, 0.15, '#3fa9ff'], [0.8, 0.2, '#ffd23f'], [0.78, 0.82, '#3bd16f'], [0.2, 0.85, '#b46bff']].forEach(([x, y, col], i) => { g.save(); g.translate(x * s, y * s); g.rotate(i); g.fillStyle = col; g.fillRect(-s * 0.08, -s * 0.025, s * 0.16, s * 0.05); g.restore(); });
  },

};

export const KILL_DEFS = {
  classic: { name: 'Classic', icon: icon.classic, classic: true },

  // CONFETTI: paper squares and a few streamers, thrown up and fluttering down; a white pop at the heart, a pale puff
  confetti: {
    name: 'Confetti', icon: icon.confetti,
    explode(S, x, y, z, vx, vz, k, ks) {
      flash(S, x, y + 1, z, 2.6 * k, 0xffffff);
      for (let i = 0, n = S.n(56 * k), sk = sq(k); i < n; i++) {
        const p = S.spec(), a = Math.random() * TAU, sp = rr(3, 10) * sk, streamer = i % 7 === 0;
        p.x = x + r(0.8); p.y = y + 0.6 + Math.random() * 1.2; p.z = z + r(0.8);
        p.vx = vx * 0.6 + Math.sin(a) * sp; p.vy = rr(10, 17) * sk; p.vz = vz * 0.6 + Math.cos(a) * sp;
        p.gravity = 7; p.drag = streamer ? 2.6 : 2.2; p.flutter = rr(0.8, 2); p.phase = Math.random() * TAU;
        p.life = rr(1.8, 2.8); p.size = streamer ? 0.24 : rr(0.42, 0.58); p.len = streamer ? 5 : 1.4;
        p.ax = Math.random() * TAU; p.ay = Math.random() * TAU; p.sax = r(14); p.say = r(10);
        p.color = pick(CONFETTI); p.floor = y + 0.03;
        S.add('quad');
      }
      puffs(S, 3 * ks, x, y, z, vx, vz, ks, 0xf2f0ff);
    },
    trail(S, x, y, z, floor) {
      const p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.vy = rr(0, 1); p.gravity = 3; p.drag = 2; p.flutter = 1; p.phase = Math.random() * TAU;
      p.size = 0.28; p.len = 1.4; p.ax = Math.random() * TAU; p.ay = Math.random() * TAU; p.sax = r(12); p.say = r(8);
      p.life = 0.8; p.color = pick(CONFETTI); p.floor = floor + 0.03;
      S.add('quad');
    },
  },

  // FIREWORKS: a shell of glowing streaks in two colours fanning out from above the spot, then a crackle of white sparks
  fireworks: {
    name: 'Fireworks', icon: icon.fireworks,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k), cy = y + 1.6 * sk, a = pick(FIREWORK); let b = pick(FIREWORK); if (b === a) b = 0xffffff;
      flash(S, x, cy, z, 3.4 * k, 0xffffff, 0.2);
      flash(S, x, cy, z, 2 * k, a, 0.45);
      for (let i = 0, n = S.n(56 * k); i < n; i++) {
        const p = S.spec(), d = outward(-0.35), sp = rr(14, 19) * sk;
        p.x = x; p.y = cy; p.z = z; p.vx = vx * 0.3 + d.x * sp; p.vy = d.y * sp; p.vz = vz * 0.3 + d.z * sp;
        p.gravity = 5; p.drag = 2.2; p.life = rr(0.9, 1.4); p.size = 0.13 * sk; p.len = 3.5; p.fade = FADE_DIM;
        p.color = i % 2 ? a : b; p.floor = y + 0.05;
        S.add('spark');
      }
      for (let i = 0, n = S.n(24 * k); i < n; i++) { // the crackle, where the shell has got to
        const p = S.spec(), d = outward(-0.3), far = rr(3, 5.5) * sk;
        p.x = x + d.x * far; p.y = Math.max(y + 0.3, cy + d.y * far); p.z = z + d.z * far; p.vy = -1;
        p.delay = rr(0.4, 0.9); p.life = rr(0.12, 0.22); p.size = rr(0.8, 1.3); p.color = 0xfff3c0; p.fade = FADE_FLICKER;
        S.add('glow');
      }
      puffs(S, 3 * ks, x, y, z, vx, vz, ks, 0x3a3a48);
    },
    trail(S, x, y, z) {
      let p = S.spec();
      p.x = x + r(0.15); p.y = y + r(0.15); p.z = z + r(0.15); p.vx = r(1.5); p.vy = rr(-1, 1); p.vz = r(1.5); p.gravity = 3;
      p.life = 0.35; p.size = 0.1; p.len = 2; p.fade = FADE_DIM; p.color = pick(FIREWORK);
      S.add('spark');
      p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.life = 0.3; p.size = 0.55; p.fade = FADE_FLICKER; p.color = 0xfff3c0;
      S.add('glow');
    },
  },

  // COINS: gold coins spun up and raining down (bouncing, glinting as they turn), a few banknotes fluttering; a quiet till
  coins: {
    name: 'Coins', icon: icon.coins, sound: { name: 'cash5', volume: 0.45 },
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      flash(S, x, y + 1, z, 2.4 * k, 0xffe08a);
      for (let i = 0, n = S.n(26 * k); i < n; i++) {
        const p = S.spec();
        p.x = x + r(0.6); p.y = y + 0.8 + Math.random() * 0.6; p.z = z + r(0.6);
        p.vx = vx * 0.5 + r(6) * sk; p.vy = rr(10, 16) * sk; p.vz = vz * 0.5 + r(5) * sk;
        p.gravity = 24; p.bounce = 0.45; p.floor = y + 0.2; p.size = rr(0.7, 0.9); p.shade = 1;
        p.ay = Math.random() * TAU; p.say = rr(10, 22) * (Math.random() < 0.5 ? -1 : 1); p.ax = r(0.6); p.sax = r(3);
        p.life = rr(1.8, 2.6); p.color = pick(GOLD);
        S.add('coin');
      }
      for (let i = 0, n = S.n(8 * k); i < n; i++) { // banknotes
        const p = S.spec(), a = Math.random() * TAU;
        p.x = x + r(0.6); p.y = y + 1; p.z = z + r(0.6);
        p.vx = vx * 0.5 + Math.sin(a) * rr(2, 6); p.vy = rr(7, 12) * sk; p.vz = vz * 0.5 + Math.cos(a) * rr(2, 6);
        p.gravity = 6; p.drag = 2.2; p.flutter = 1.5; p.phase = Math.random() * TAU; p.size = 0.95; p.len = 0.5;
        p.ax = Math.random() * TAU; p.ay = Math.random() * TAU; p.sax = r(8); p.say = r(6); p.life = rr(2, 2.8);
        p.color = i % 2 ? 0x6fcf6a : 0x4fae55; p.floor = y + 0.03;
        S.add('quad');
      }
      for (let i = 0, n = S.n(10 * k); i < n; i++) { // glints among them
        const p = S.spec();
        p.x = x + r(2.5) * sk; p.y = y + rr(0.6, 3.5) * sk; p.z = z + r(2.5) * sk; p.vy = 0.5;
        p.delay = rr(0, 0.7); p.life = rr(0.25, 0.4); p.size = rr(0.7, 1.1); p.fade = FADE_FLICKER; p.color = 0xfff6c8;
        S.add('glow');
      }
      puffs(S, 2 * ks, x, y, z, vx, vz, ks, 0xfff0c8);
    },
    trail(S, x, y, z, floor) {
      let p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.life = 0.35; p.size = 0.6; p.fade = FADE_FLICKER; p.color = 0xffe08a;
      S.add('glow');
      if (Math.random() < 0.25) {
        p = S.spec();
        p.x = x; p.y = y - 0.2; p.z = z; p.vx = r(1); p.vy = rr(0, 2); p.vz = r(1); p.gravity = 20; p.bounce = 0.4; p.floor = floor + 0.08;
        p.size = 0.4; p.shade = 1; p.say = 18; p.ay = Math.random() * TAU; p.life = 0.7; p.color = pick(GOLD);
        S.add('coin');
      }
    },
  },

  // BUBBLES: a froth of soap bubbles rising and drifting, each popping; a splash ring and a few drops
  bubbles: {
    name: 'Bubbles', icon: icon.bubbles,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      const ring = S.spec();
      ring.x = x; ring.y = y + 1; ring.z = z; ring.size = 2 * k; ring.grow = 3; ring.life = 0.4; ring.fade = FADE_DIM; ring.color = 0xbff3ff;
      S.add('ring');
      for (let i = 0, n = S.n(30 * k); i < n; i++) {
        const p = S.spec();
        p.x = x + r(1); p.y = y + 0.5 + Math.random() * 1.5; p.z = z + r(1);
        p.vx = vx * 0.3 + r(6) * sk; p.vy = rr(2, 7); p.vz = vz * 0.3 + r(6) * sk;
        p.gravity = -1.5; p.drag = 1.4; p.flutter = rr(0.6, 1.4); p.phase = Math.random() * TAU;
        p.size = rr(0.7, 1.7) * sk; p.life = rr(1, 2.4); p.fade = FADE_POP; p.color = pick(BUBBLE);
        S.add('bubble');
      }
      for (let i = 0, n = S.n(10 * k); i < n; i++) { // drops
        const p = S.spec(), d = outward(0.2);
        p.x = x; p.y = y + 1; p.z = z; p.vx = d.x * 6; p.vy = rr(4, 8); p.vz = d.z * 6; p.gravity = 14; p.floor = y;
        p.size = 0.45; p.life = 0.55; p.fade = FADE_DIM; p.color = 0xcff6ff;
        S.add('glow');
      }
      puffs(S, 4 * ks, x, y, z, vx, vz, ks, 0xf0fbff);
    },
    trail(S, x, y, z) {
      if (Math.random() > 0.7) return;
      const p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.vy = 0.5; p.gravity = -1; p.drag = 1; p.flutter = 0.6; p.phase = Math.random() * TAU;
      p.size = rr(0.3, 0.55); p.life = rr(0.5, 0.9); p.fade = FADE_POP; p.color = pick(BUBBLE);
      S.add('bubble');
    },
  },

  // COMIC: a flat starburst snaps up over the spot (yellow, a red one inside, a white heart), a ring, little stars flung out, cartoon cloud
  comic: {
    name: 'Comic', icon: icon.comic,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k), cy = y + 1.4 * sk;
      for (const [size, color, toCam, life] of [[5.2, 0xffd23f, 0, 0.7], [3.3, 0xff4b2b, 0.25, 0.62], [1.6, 0xffffff, 0.5, 0.5]]) {
        const p = S.spec();
        p.x = x; p.y = cy; p.z = z; p.size = size * k; p.toCam = toCam; p.life = life; p.fade = FADE_FLASH; p.color = color;
        p.ax = Math.random() * TAU; p.sax = r(1.5);
        S.add('star');
      }
      const ring = S.spec();
      ring.x = x; ring.y = cy; ring.z = z; ring.size = 2.6 * k; ring.grow = 2.6; ring.life = 0.45; ring.fade = FADE_DIM; ring.toCam = -0.2;
      S.add('ring');
      for (let i = 0, n = S.n(14 * k); i < n; i++) {
        const p = S.spec(), d = outward(0), sp = rr(6, 12) * sk;
        p.x = x; p.y = cy; p.z = z; p.vx = vx * 0.6 + d.x * sp; p.vy = rr(5, 11); p.vz = vz * 0.6 + d.z * sp; p.gravity = 14;
        p.bounce = 0.3; p.floor = y + 0.35; p.size = rr(0.7, 1); p.ax = Math.random() * TAU; p.sax = r(8); p.life = rr(0.8, 1.2);
        p.color = pick(STARS);
        S.add('star');
      }
      for (let i = 0, n = S.n(5 * ks); i < n; i++) { // a cartoon cloud round its foot
        const p = S.spec(), a = i / 5 * TAU + r(0.3);
        p.x = x + Math.sin(a) * 1.4 * sk; p.y = y + 0.6; p.z = z + Math.cos(a) * 1.4 * sk; p.vx = Math.sin(a) * 2; p.vy = 1; p.vz = Math.cos(a) * 2;
        p.size = rr(1.2, 1.8) * ks; p.grow = 0.6; p.life = rr(0.7, 1); p.color = 0xffffff;
        S.add('puff');
      }
    },
    trail(S, x, y, z) {
      const p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.vy = rr(0, 1); p.size = rr(0.45, 0.65); p.ax = Math.random() * TAU; p.sax = r(6);
      p.life = 0.5; p.color = pick(STARS);
      S.add('star');
    },
  },

  // LIGHTNING: forked blue-white bolts crack out from the spot and flicker, sparks spray and bounce, a blue flash and a ring on the road
  lightning: {
    name: 'Lightning', icon: icon.lightning,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k), cy = y + 1.2 * sk;
      flash(S, x, cy, z, 5 * k, 0x9fd8ff, 0.35);
      flash(S, x, cy, z, 2.2 * k, 0xffffff, 0.15);
      const ring = S.spec();
      ring.x = x; ring.y = y + 0.3; ring.z = z; ring.size = 2.2 * k; ring.grow = 3; ring.life = 0.4; ring.fade = FADE_DIM; ring.color = 0x7fc8ff;
      S.add('ring');
      const bolt = (sx, sy, sz, yaw, pitch, segs, len, delay) => {
        for (let j = 0; j < segs; j++) {
          yaw += r(0.7); pitch = Math.max(-0.05, Math.min(1.2, pitch + r(0.6))); // (never into the road)
          const dx = Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(yaw) * Math.cos(pitch);
          const p = S.spec();
          p.size = 0.24 * sk; p.len = len / p.size;
          p.x = sx + dx * len / 2; p.y = Math.max(y + 0.05, sy + dy * len / 2); p.z = sz + dz * len / 2;
          p.ax = -pitch; p.ay = yaw; p.delay = delay + j * 0.02; p.life = rr(0.25, 0.45); p.fade = FADE_FLICKER; p.color = BOLT[Math.min(2, j)];
          S.add('bolt');
          sx += dx * len; sy += dy * len; sz += dz * len;
          if (j === 1 && segs > 2 && Math.random() < 0.85) bolt(sx, sy, sz, yaw + r(1.2), pitch, 2, len * 0.7, delay + 0.04);
        }
      };
      for (let i = 0, n = S.n(8 * k); i < n; i++) bolt(x, cy, z, i / 8 * TAU + r(0.4), rr(0, 0.9), 4, rr(1.3, 1.9) * sk, i % 2 ? 0 : 0.15); // (half of them a moment later: a second strike)
      for (let i = 0, n = S.n(22 * k); i < n; i++) {
        const p = S.spec(), d = outward(-0.2), sp = rr(10, 18) * sk;
        p.x = x; p.y = cy; p.z = z; p.vx = vx * 0.4 + d.x * sp; p.vy = d.y * sp + 3; p.vz = vz * 0.4 + d.z * sp;
        p.gravity = 14; p.drag = 2; p.bounce = 0.3; p.floor = y + 0.05; p.size = 0.11; p.len = 1.5; p.life = rr(0.5, 0.8); p.fade = FADE_DIM; p.color = pick(BOLT);
        S.add('spark');
      }
      puffs(S, 3 * ks, x, y, z, vx, vz, ks, 0x2b3448);
    },
    trail(S, x, y, z) {
      let p = S.spec();
      const yaw = Math.random() * TAU, pitch = r(1);
      p.x = x + r(0.15); p.y = y + r(0.15); p.z = z + r(0.15); p.size = 0.11; p.len = 0.9 / 0.11; p.ax = -pitch; p.ay = yaw;
      p.life = 0.14; p.fade = FADE_FLICKER; p.color = pick(BOLT);
      S.add('bolt');
      p = S.spec();
      p.x = x; p.y = y; p.z = z; p.vx = r(3); p.vy = r(3); p.vz = r(3); p.gravity = 8; p.size = 0.1; p.len = 1.5; p.life = 0.3; p.fade = FADE_DIM; p.color = 0xbfe6ff;
      S.add('spark');
    },
  },

};

// CUT after the experiment (CHECKLIST 405): not on the Cosmetics screen, but kept and wearable for a visit with ?killfx=pixels / candy.
// Pixels: tumbling cubes read too close to Classic's own cube debris. Candy: in motion it is Confetti with sweets in (too close to it).
export const KILL_EXTRA = {
  // PIXELS: chunky bright cubes in an arcade palette, tumbling and bouncing; a square shock of white cubes along the road
  pixels: {
    name: 'Pixels', icon: icon.pixels,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      flash(S, x, y + 1, z, 2 * k, 0xffffff, 0.12);
      for (let i = 0, n = S.n(26 * k); i < n; i++) {
        const p = S.spec(), size = [0.45, 0.7, 1][i % 3] * sk;
        p.x = x + r(0.8); p.y = y + 0.6 + Math.random(); p.z = z + r(0.8);
        p.vx = vx * 0.8 + r(7); p.vy = rr(7, 14) * sk; p.vz = vz * 0.8 + r(7);
        p.gravity = 22; p.bounce = 0.4; p.floor = y + size / 2; p.size = size;
        p.sax = r(8); p.say = r(8); p.life = rr(1.8, 2.6); p.color = pick(PIXEL);
        S.add('cube');
      }
      for (let i = 0, n = S.low ? 6 : 12; i < n; i++) { // the shock: a ring of white cubes skating out on the road
        const p = S.spec(), a = i / n * TAU, sp = 11 * sk;
        p.x = x; p.y = y + 0.2; p.z = z; p.vx = vx + Math.sin(a) * sp; p.vz = vz + Math.cos(a) * sp; p.drag = 3;
        p.size = 0.55; p.life = 0.55; p.ay = a; p.color = 0xffffff;
        S.add('cube');
      }
      for (let i = 0, n = S.n(4 * ks); i < n; i++) { // blocky smoke
        const p = S.spec();
        p.x = x + r(1.2); p.y = y + 1 + Math.random(); p.z = z + r(1.2); p.vx = vx * 0.3 + r(1); p.vy = rr(2, 4); p.vz = vz * 0.3 + r(1);
        p.size = rr(0.8, 1.1) * ks; p.grow = 0.6; p.life = rr(1, 1.5); p.color = i % 2 ? 0x5f574f : 0x83769c;
        S.add('cube');
      }
    },
    trail(S, x, y, z, floor) {
      for (let n = 0; n < 2; n++) {
        const p = S.spec(), size = rr(0.2, 0.32);
        p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.vy = rr(0, 1.5); p.gravity = 10; p.floor = floor + size / 2;
        p.size = size; p.life = 0.5; p.color = pick(PIXEL);
        S.add('cube');
      }
    },
  },

  // CANDY: wrapped sweets and a shower of sprinkles, bouncing on the road; a pink flash and a sugar puff (with the Candy cane rims)
  candy: {
    name: 'Candy', icon: icon.candy,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      flash(S, x, y + 1, z, 2.4 * k, 0xffc0e0);
      for (let i = 0, n = S.n(18 * k); i < n; i++) {
        const p = S.spec();
        p.x = x + r(0.6); p.y = y + 0.8 + Math.random() * 0.6; p.z = z + r(0.6);
        p.vx = vx * 0.6 + r(7) * sk; p.vy = rr(9, 15) * sk; p.vz = vz * 0.6 + r(6) * sk;
        p.gravity = 18; p.bounce = 0.4; p.floor = y + 0.3; p.size = rr(1, 1.3); p.ax = Math.random() * TAU; p.sax = r(10);
        p.life = rr(1.6, 2.2); p.color = pick(CANDY);
        S.add('candy');
      }
      for (let i = 0, n = S.n(40 * k); i < n; i++) {
        const p = S.spec();
        p.x = x + r(0.6); p.y = y + 0.8 + Math.random(); p.z = z + r(0.6);
        p.vx = vx * 0.6 + r(7) * sk; p.vy = rr(5, 12) * sk; p.vz = vz * 0.6 + r(7) * sk;
        p.gravity = 18; p.bounce = 0.2; p.floor = y + 0.06; p.size = 0.13; p.len = 4; p.ax = Math.random() * TAU; p.ay = Math.random() * TAU;
        p.sax = r(14); p.say = r(14); p.life = rr(1.2, 2); p.color = pick(SPRINKLE);
        S.add('cube');
      }
      puffs(S, 3 * ks, x, y, z, vx, vz, ks, 0xffd6ea);
    },
    trail(S, x, y, z, floor) {
      for (let n = 0; n < 2; n++) {
        const p = S.spec();
        p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.vy = rr(0, 1); p.gravity = 10; p.floor = floor + 0.04;
        p.size = 0.11; p.len = 4; p.ax = Math.random() * TAU; p.ay = Math.random() * TAU; p.sax = r(14); p.life = 0.55; p.color = pick(SPRINKLE);
        S.add('cube');
      }
    },
  },
};
