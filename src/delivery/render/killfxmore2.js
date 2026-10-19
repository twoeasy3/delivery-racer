// ---- EIGHT MORE KILL EFFECTS, a third set (CHECKLIST 512; the first seven: render/killfxdefs.js, the second eight: render/killfxmore.js;
// the engine: render/killfx.js). Each was drawn up against the gaps the fifteen leave, in how it moves and in its shapes:
//   Rings      three fat smoke rings, laid flat, launched up one after another, widening as they rise (hollow, slow, upward)
//   Shockwave  SLOW MOTION: a pale dome swells out over the road and eases to a stop, dust kicked up where its foot passes, road
//              chunks drifting up and down as if under water
//   Wisps      pale flames rising in a slow helix round the spot, motes drifting with them (nothing thrown, nothing falls)
//   Glitch     flat squares and scan bars, snapped to a grid, hopping a step and blinking, drifting up as they go (no physics)
//   Vortex     IMPLOSION: a whirlpool on the road, streaks pulled IN on a spiral, then a small pop and a ring out
//   Popcorn    a staccato: kernels pop one after another for a second, each jumping and bouncing (rhythm, not one blast)
//   Geyser     a sustained jet: a column of water standing for most of a second, falling back as an umbrella, splash rings
//   Rainbow    one arch springs up over the spot and fades, twinkles falling through it, a puff of cloud at its foot
// The same shape as the others (the head of killfxdefs.js): name, icon(g, s), explode(S, x, y, z, vx, vz, k, ks, e), trail(S, x, y, z,
// floor); `floats` (nothing it throws lies on the floor), `mark` (the Cosmetics preview's floor mark, render/killpreview.js MARKS).
// Bounded: every count goes through S.n (the LOW version), every particle into a capped pool; nothing allocated per spawn or frame;
// nothing lives past 3 s (the longest of the fifteen: Planes' 3.1 s).
import { FADE_DIM, FADE_FLICKER, FADE_FLASH, TAU, r, rr, pick, sq, flash, outward } from './killfxdefs.js';

const SMOKE = [0xd8d8dc, 0xc8c8cc, 0xe4e2de];
const DUST = [0xb8ad98, 0xa89c86, 0xc4bba8];
const ASPHALT = [0x4a4a52, 0x5c5c64, 0x3e3e44];
const WISP = [0x3ec890, 0x52d8a8, 0x6a9ad8, 0x46b8b0];
const GLITCH = [0xff2bd6, 0x2bf0ff, 0xffffff, 0x7dff3a, 0x2b6bff];
const VIOLET = [0xb07cff, 0x7d5bff, 0xff7ae0, 0xe8dcff];
const CORN = [0xfff8e6, 0xfff1cc, 0xffe9b0, 0xffffff];
const WATER = [0xcfefff, 0x9fd8ff, 0x7cc4f0, 0xffffff];
const SPECTRUM = [0xff3b3b, 0xff9a2a, 0xffe03a, 0x3cd65a, 0x2fb8ff, 0x3a5bff, 0x8a4fff];
let hue = 0; // (the rainbow trail's colour, stepped a frame)
const ease = (f) => 1 - Math.cbrt(1 - f); // (when an eased growth, 1 - (1 - t)^3, reaches f of its way)

// ---- the chips' icons (s x s canvas, transparent) ----
const icon = {
  rings: (g, s) => {
    for (const [y, w, a] of [[0.78, 0.2, 0.55], [0.52, 0.28, 0.8], [0.24, 0.36, 1]]) {
      g.strokeStyle = `rgba(220,220,226,${a})`; g.lineWidth = Math.max(2, s * 0.09); g.beginPath(); g.ellipse(s * 0.5, s * y, s * w, s * w * 0.32, 0, 0, TAU); g.stroke();
    }
  },
  shockwave: (g, s) => {
    const c = s / 2;
    const grad = g.createRadialGradient(c, s * 0.78, s * 0.1, c, s * 0.78, s * 0.46); grad.addColorStop(0, 'rgba(154,184,255,0)'); grad.addColorStop(0.85, 'rgba(190,210,255,0.85)'); grad.addColorStop(1, 'rgba(154,184,255,0)');
    g.fillStyle = grad; g.beginPath(); g.ellipse(c, s * 0.78, s * 0.46, s * 0.46, 0, Math.PI, TAU); g.fill();
    g.strokeStyle = '#cfe0ff'; g.lineWidth = Math.max(1.5, s * 0.04); g.beginPath(); g.ellipse(c, s * 0.8, s * 0.46, s * 0.1, 0, 0, TAU); g.stroke();
  },
  wisps: (g, s) => {
    const flame = (x, y, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x * s, (y - h) * s); g.bezierCurveTo((x + h * 0.25) * s, (y - h * 0.5) * s, (x + h * 0.3) * s, y * s, x * s, y * s); g.bezierCurveTo((x - h * 0.3) * s, y * s, (x - h * 0.25) * s, (y - h * 0.5) * s, x * s, (y - h) * s); g.fill(); };
    flame(0.36, 0.9, 0.62, 'rgba(110,232,200,0.9)'); flame(0.68, 0.62, 0.44, 'rgba(120,170,240,0.85)'); flame(0.2, 0.42, 0.26, 'rgba(160,140,240,0.8)');
  },
  glitch: (g, s) => {
    const u = s / 8;
    [[1, 2, '#ff2bd6'], [2, 2, '#ff2bd6'], [5, 1, '#2bf0ff'], [3, 4, '#ffffff'], [6, 5, '#7dff3a'], [2, 6, '#2bf0ff'], [4, 6, '#ff2bd6']].forEach(([x, y, c]) => { g.fillStyle = c; g.fillRect(x * u, y * u, u * 0.9, u * 0.9); });
    g.fillStyle = 'rgba(43,240,255,0.8)'; g.fillRect(0, 3.3 * u, s * 0.7, u * 0.35); g.fillStyle = 'rgba(255,43,214,0.8)'; g.fillRect(s * 0.3, 5.2 * u, s * 0.7, u * 0.3);
  },
  vortex: (g, s) => {
    const c = s / 2; g.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) { g.strokeStyle = arm ? '#7d5bff' : '#ff7ae0'; g.lineWidth = Math.max(1.5, s * 0.06); g.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20, a = arm * 2.094 + u * 4.4, d = s * (0.05 + u * 0.4); g.lineTo(c + Math.sin(a) * d, c + Math.cos(a) * d); } g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, s * 0.07, 0, TAU); g.fill();
  },
  popcorn: (g, s) => {
    const kernel = (x, y, sc) => { for (const [dx, dy, rad] of [[-0.3, 0, 0.42], [0.3, -0.1, 0.4], [0.05, 0.32, 0.38], [0, -0.38, 0.32]]) { g.fillStyle = '#fff8e6'; g.beginPath(); g.arc((x + dx * sc) * s, (y + dy * sc) * s, rad * sc * s, 0, TAU); g.fill(); } g.fillStyle = '#c99a3a'; g.beginPath(); g.arc(x * s, (y + 0.42 * sc) * s, 0.14 * sc * s, 0, TAU); g.fill(); };
    kernel(0.36, 0.62, 0.3); kernel(0.72, 0.34, 0.2); kernel(0.74, 0.8, 0.14);
  },
  geyser: (g, s) => {
    g.fillStyle = 'rgba(159,216,255,0.9)';
    g.beginPath(); g.moveTo(s * 0.44, s * 0.86); g.lineTo(s * 0.47, s * 0.2); g.lineTo(s * 0.53, s * 0.2); g.lineTo(s * 0.56, s * 0.86); g.fill();
    for (const [x, y, rad] of [[0.3, 0.26, 0.05], [0.7, 0.26, 0.05], [0.2, 0.44, 0.045], [0.8, 0.44, 0.045], [0.5, 0.14, 0.07], [0.38, 0.17, 0.05], [0.62, 0.17, 0.05]]) { g.beginPath(); g.arc(x * s, y * s, rad * s, 0, TAU); g.fill(); }
    g.strokeStyle = '#cfefff'; g.lineWidth = Math.max(1.5, s * 0.04); g.beginPath(); g.ellipse(s * 0.5, s * 0.88, s * 0.34, s * 0.07, 0, 0, TAU); g.stroke();
  },
  rainbow: (g, s) => {
    g.lineWidth = Math.max(1.5, s * 0.055);
    SPECTRUM.forEach((c, i) => { g.strokeStyle = '#' + c.toString(16).padStart(6, '0'); g.beginPath(); g.arc(s * 0.5, s * 0.8, s * (0.44 - i * 0.05), Math.PI, TAU); g.stroke(); });
  },
};

export const KILL_MORE2 = {
  // RINGS: a puff, then three fat rings of smoke laid flat, launched up one after another, each widening as it climbs. A ring is a faint
  // flat halo with eight lumps of smoke round it, all moving together (the lumps' outward speed is the halo's growth: they stay on it)
  rings: {
    name: 'Rings', icon: icon.rings, floats: true,
    mark: [['scorch', 0x000000, 0.35, 2.8]],
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      flash(S, x, y + 0.6, z, 1.8 * k, 0xffe6c0, 0.14);
      for (let j = 0, m = S.low ? 2 : k > 1.2 ? 4 : 3; j < m; j++) {
        const wait = j * 0.32, R0 = (0.8 + j * 0.1) * sk, life = rr(1.7, 1.9), grow = 1.6, rise = rr(1.5, 1.8) * sk, y0 = y + 0.45, col = pick(SMOKE);
        let p = S.spec();
        p.x = x; p.y = y0; p.z = z; p.vx = vx * 0.15; p.vy = rise; p.vz = vz * 0.15; p.ax = -Math.PI / 2; p.ay = Math.random() * TAU;
        p.size = R0 / 0.41; p.grow = grow; p.life = life; p.delay = wait; p.fade = FADE_DIM; p.color = 0x9a9aa0; // (the halo's ring is at 0.41 of its size)
        S.add('halo');
        for (let i = 0, n = S.n(11 * sk); i < n; i++) {
          const a = i / n * TAU + j * 0.4, vr = R0 * grow / life;
          p = S.spec();
          p.x = x + Math.sin(a) * R0; p.y = y0; p.z = z + Math.cos(a) * R0; p.vx = vx * 0.15 + Math.sin(a) * vr; p.vy = rise; p.vz = vz * 0.15 + Math.cos(a) * vr;
          p.size = rr(0.42, 0.52) * sk; p.grow = 0.9; p.life = life; p.delay = wait; p.ax = Math.random() * TAU; p.sax = r(1.2); p.color = col;
          S.add('puff');
        }
      }
      for (let i = 0, n = S.n(3 * ks); i < n; i++) { // the dark pop it came out of
        const p = S.spec();
        p.x = x + r(0.4); p.y = y + 0.5; p.z = z + r(0.4); p.vx = vx * 0.2 + r(0.8); p.vy = rr(0.4, 1); p.vz = vz * 0.2 + r(0.8);
        p.size = rr(0.9, 1.2) * ks; p.grow = 0.5; p.life = rr(0.5, 0.7); p.ax = Math.random() * TAU; p.color = 0x55555c;
        S.add('puff');
      }
    },
    trail(S, x, y, z) {
      let p = S.spec();
      p.x = x + r(0.1); p.y = y + r(0.1); p.z = z + r(0.1); p.vy = 0.4; p.size = rr(0.22, 0.3); p.grow = 0.8; p.life = 0.45; p.ax = Math.random() * TAU; p.color = pick(SMOKE);
      S.add('puff');
      if (Math.random() < 0.18) { // now and then a little ring
        p = S.spec();
        p.x = x; p.y = y; p.z = z; p.vy = 0.9; p.ax = -Math.PI / 2; p.size = 0.9; p.grow = 1.4; p.life = 0.55; p.fade = FADE_DIM; p.color = 0x8a8a90;
        S.add('halo');
      }
    },
  },

  // SHOCKWAVE: slow motion. A pale dome swells out over the road and eases to a stop as it fades, a bright ring at its foot; dust kicked up
  // just as the foot passes; chunks of road lifted slowly, turning slowly, settling back (low gravity: the slow-motion read)
  shockwave: {
    name: 'Shockwave', icon: icon.shockwave,
    mark: [['scorch', 0x000000, 0.45, 3.2], ['ring', 0x9ab8ff, 0.45, 5.6, true]],
    explode(S, x, y, z, vx, vz, k) {
      const sk = sq(k), d0 = 0.8 * k, grow = 6.5, life = 1.5; // (the dome: 0.8 m across to 6 m, eased)
      flash(S, x, y + 0.5, z, 2.2 * k, 0xdfe8ff, 0.12);
      let p = S.spec();
      p.x = x; p.y = y; p.z = z; p.size = d0; p.grow = grow; p.ease = 1; p.life = life; p.fade = FADE_DIM; p.color = 0x8aa8e8;
      S.add('dome');
      for (const [wait, c] of [[0, 0x8ea4d0], [0.22, 0x4a5878]]) { // its foot on the road, and a fainter echo after it
        p = S.spec();
        p.x = x; p.y = y + 0.04; p.z = z; p.ax = -Math.PI / 2; p.size = d0 * 0.5 / 0.41; p.grow = grow; p.ease = 1; p.life = life - wait; p.delay = wait; p.fade = FADE_DIM; p.color = c;
        S.add('halo');
      }
      for (let i = 0, n = S.n(18 * k); i < n; i++) { // dust where the foot passes: set off as it gets there
        const a = i / n * TAU + r(0.2), f = rr(0.2, 0.8), d = d0 * 0.5 * (1 + grow * f);
        p = S.spec();
        p.x = x + Math.sin(a) * d; p.y = y + 0.25; p.z = z + Math.cos(a) * d; p.vx = Math.sin(a) * 0.8; p.vy = rr(0.6, 1.4); p.vz = Math.cos(a) * 0.8; p.drag = 1;
        p.delay = ease(f) * life; p.size = rr(0.5, 0.75) * sk; p.grow = 0.9; p.life = rr(0.7, 1); p.ax = Math.random() * TAU; p.color = pick(DUST);
        S.add('puff');
      }
      for (let i = 0, n = S.n(10 * k); i < n; i++) { // road chunks, lifted slowly
        const a = Math.random() * TAU, d = rr(0.3, 1.4) * sk, size = rr(0.18, 0.32);
        p = S.spec();
        p.x = x + Math.sin(a) * d; p.y = y + 0.1; p.z = z + Math.cos(a) * d; p.vx = vx * 0.1 + Math.sin(a) * rr(0.4, 1); p.vy = rr(2, 3.2) * sk; p.vz = vz * 0.1 + Math.cos(a) * rr(0.4, 1);
        p.gravity = 2.4; p.floor = y + size / 2; p.size = size; p.ax = Math.random() * TAU; p.ay = Math.random() * TAU; p.sax = r(1.6); p.say = r(1.6);
        p.life = rr(2.3, 2.7); p.color = pick(ASPHALT);
        S.add('cube');
      }
    },
    trail(S, x, y, z, floor) {
      let p = S.spec();
      p.x = x + r(0.1); p.y = y + r(0.1); p.z = z + r(0.1); p.size = 0.4; p.life = 0.3; p.fade = FADE_DIM; p.color = 0x6a7aa8;
      S.add('glow');
      if (Math.random() < 0.12) { // a ripple on the road under it
        p = S.spec();
        p.x = x; p.y = floor + 0.04; p.z = z; p.ax = -Math.PI / 2; p.size = 0.5; p.grow = 4; p.ease = 1; p.life = 0.6; p.fade = FADE_DIM; p.color = 0x8aa8e8;
        S.add('halo');
      }
    },
  },

  // WISPS: pale flames lift off the spot and rise slowly in a helix round it, swaying, with motes drifting up among them; a faint ring
  // on the road. No faces, no figures: soft teardrops of light
  wisps: {
    name: 'Wisps', icon: icon.wisps, floats: true,
    mark: [['ring', 0x46c8a6, 0.35, 3, true]],
    explode(S, x, y, z, vx, vz, k) {
      const sk = sq(k), spin = Math.random() < 0.5 ? 1 : -1;
      flash(S, x, y + 0.8, z, 2 * k, 0x5ad8b8, 0.2);
      let p = S.spec();
      p.x = x; p.y = y + 0.04; p.z = z; p.ax = -Math.PI / 2; p.size = 2.4 * sk; p.grow = 0.8; p.ease = 1; p.life = 0.9; p.fade = FADE_DIM; p.color = 0x3a9a86;
      S.add('halo');
      for (let i = 0, n = S.n(10 * k); i < n; i++) {
        const a = i / n * TAU + r(0.3), d = rr(0.5, 1.1) * sk, v = rr(1, 1.5) * sk;
        p = S.spec();
        p.x = x + Math.sin(a) * d; p.y = y + rr(0.3, 0.9); p.z = z + Math.cos(a) * d;
        p.vx = vx * 0.1 + Math.cos(a) * v * spin; p.vy = rr(1.5, 2.4) * sk; p.vz = vz * 0.1 - Math.sin(a) * v * spin; p.turn = -spin * v / d; // (round the centre)
        p.flutter = rr(0.3, 0.7); p.phase = Math.random() * TAU; p.delay = rr(0, 0.35);
        p.size = rr(1, 1.4) * sk; p.len = 2; p.grow = -0.3; p.life = rr(1.8, 2.5); p.fade = FADE_DIM; p.color = pick(WISP);
        S.add('wisp');
      }
      for (let i = 0, n = S.n(16 * k); i < n; i++) {
        const d = outward(0.4), sp = rr(0.6, 1.6);
        p = S.spec();
        p.x = x + d.x * 0.8; p.y = y + rr(0.4, 1.4); p.z = z + d.z * 0.8; p.vx = d.x * sp; p.vy = rr(0.8, 1.8); p.vz = d.z * sp; p.drag = 0.6;
        p.flutter = rr(0.4, 1); p.phase = Math.random() * TAU; p.delay = rr(0, 0.5); p.size = rr(0.22, 0.36); p.life = rr(1.1, 1.8); p.fade = FADE_FLICKER; p.color = 0xbff8e8;
        S.add('glow');
      }
    },
    trail(S, x, y, z) {
      let p = S.spec();
      p.x = x + r(0.12); p.y = y + r(0.12); p.z = z + r(0.12); p.vy = 0.7; p.flutter = 0.4; p.phase = Math.random() * TAU;
      p.size = rr(0.3, 0.42); p.len = 2; p.life = 0.5; p.fade = FADE_DIM; p.color = pick(WISP);
      S.add('wisp');
      if (Math.random() < 0.4) {
        p = S.spec();
        p.x = x + r(0.25); p.y = y + r(0.25); p.z = z + r(0.25); p.vy = 0.5; p.size = 0.2; p.life = 0.5; p.fade = FADE_FLICKER; p.color = 0xbff8e8;
        S.add('glow');
      }
    },
  },

  // GLITCH: the car de-rezzes. Flat squares facing the camera, snapped to a 25 cm grid, hopping a step and blinking out, drifting up and
  // out; thin scan bars flash across it. Nothing tumbles, nothing falls: it is the one effect with no physics in its look
  glitch: {
    name: 'Glitch', icon: icon.glitch, floats: true,
    explode(S, x, y, z, vx, vz, k) {
      const sk = sq(k);
      flash(S, x, y + 0.8, z, 2 * k, 0xc8f8ff, 0.08);
      let p;
      for (let i = 0, n = S.n(36 * k); i < n; i++) {
        p = S.spec();
        p.x = x + r(1.2) * sk; p.y = y + rr(0.2, 2) * sk; p.z = z + r(1.2) * sk; p.vx = vx * 0.1 + r(0.9); p.vy = rr(0.3, 1.3); p.vz = vz * 0.1 + r(0.9);
        p.snap = 0.25; p.phase = Math.random(); p.delay = i < 12 ? 0 : rr(0, 0.6);
        p.size = [0.25, 0.25, 0.37, 0.5][i % 4] * sk; p.life = rr(0.9, 1.8); p.fade = FADE_FLASH; p.color = pick(GLITCH);
        S.add('pixel');
      }
      for (let i = 0, n = S.n(8 * k); i < n; i++) { // scan bars
        p = S.spec();
        p.x = x + r(0.6); p.y = y + rr(0.2, 2.2) * sk; p.z = z + r(0.6); p.snap = 0.25; p.phase = Math.random();
        p.delay = rr(0, 0.9); p.size = rr(1.6, 2.8) * sk; p.len = 0.06; p.life = rr(0.2, 0.4); p.fade = FADE_FLASH; p.color = i % 2 ? 0x2bf0ff : 0xff2bd6;
        S.add('pixel');
      }
    },
    trail(S, x, y, z) {
      const p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.vy = 0.4; p.snap = 0.2; p.phase = Math.random();
      p.size = rr(0.14, 0.22); p.life = 0.35; p.fade = FADE_FLASH; p.color = pick(GLITCH);
      S.add('pixel');
    },
  },

  // VORTEX: an implosion. A whirlpool opens on the road and turns; streaks are pulled IN from round it on a spiral (a spring to the
  // centre with drag, and a speed round it); then a small pop at the heart and a ring going out
  vortex: {
    name: 'Vortex', icon: icon.vortex, floats: true, // (what it pulls in goes at the pop: nothing lies on the floor)
    mark: [['scorch', 0x5a2ab8, 0.4, 3.4]],
    explode(S, x, y, z, vx, vz, k) {
      const sk = sq(k), spin = Math.random() < 0.5 ? 1 : -1, popAt = 0.75;
      let p = S.spec();
      p.x = x; p.y = y + 0.03; p.z = z; p.ax = -Math.PI / 2; p.ay = Math.random() * TAU; p.say = -spin * 5;
      p.size = 1.6 * k; p.grow = 1.4; p.ease = 1; p.life = 1.5; p.color = 0x6a3ad0;
      S.add('swirl');
      for (let i = 0, n = S.n(30 * k); i < n; i++) {
        const a = Math.random() * TAU, d = rr(2.4, 4) * sk, w = 2.4; // (w: the spring's turn rate, rad/s)
        p = S.spec();
        p.x = x + Math.sin(a) * d; p.y = y + rr(0.15, 1.6) * sk; p.z = z + Math.cos(a) * d;
        p.vx = Math.cos(a) * d * w * 0.7 * spin; p.vy = rr(-0.6, 0); p.vz = -Math.sin(a) * d * w * 0.7 * spin; // (round it, at a share of the orbit's speed)
        p.pull = w * w; p.cx = x; p.cz = z; p.drag = 1.6; p.floor = y + 0.05; p.delay = rr(0, 0.3);
        p.size = 0.13 * sk; p.len = 2.5; p.life = popAt - p.delay + rr(-0.05, 0.05); p.color = pick(VIOLET);
        S.add('spark');
      }
      flash(S, x, y + 0.7, z, 1.4 * k, 0x8a5bff, 0.6);
      p = S.spec(); // the pop
      p.x = x; p.y = y + 0.7; p.z = z; p.size = 2.8 * k; p.life = 0.18; p.delay = popAt; p.fade = FADE_DIM; p.color = 0xf0e0ff;
      S.add('glow');
      p = S.spec();
      p.x = x; p.y = y + 0.7; p.z = z; p.size = 1.4 * k; p.grow = 3.2; p.life = 0.45; p.delay = popAt; p.fade = FADE_DIM; p.toCam = -0.2; p.color = 0xb07cff;
      S.add('ring');
      for (let i = 0, n = S.n(10 * k); i < n; i++) {
        const d = outward(0), sp = rr(6, 10) * sk;
        p = S.spec();
        p.x = x; p.y = y + 0.7; p.z = z; p.vx = d.x * sp; p.vy = d.y * sp + 1; p.vz = d.z * sp; p.gravity = 10; p.drag = 2.4;
        p.delay = popAt; p.size = 0.08; p.len = 1.6; p.life = rr(0.35, 0.55); p.fade = FADE_DIM; p.color = pick(VIOLET);
        S.add('spark');
      }
    },
    trail(S, x, y, z) {
      const a = Math.random() * TAU, d = 0.45;
      const p = S.spec();
      p.x = x + Math.sin(a) * d; p.y = y + r(0.1); p.z = z + Math.cos(a) * d; p.vx = Math.cos(a) * 3; p.vz = -Math.sin(a) * 3;
      p.pull = 30; p.cx = x; p.cz = z; p.drag = 2; p.size = 0.06; p.len = 2; p.life = 0.35; p.fade = FADE_DIM; p.color = pick(VIOLET);
      S.add('spark');
    },
  },

  // POPCORN: a staccato. A dozen kernels go at once, then the rest pop one after another for a second, each snapping in, jumping and
  // bouncing on the road; a little steam over it
  popcorn: {
    name: 'Popcorn', icon: icon.popcorn,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      flash(S, x, y + 0.7, z, 1.6 * k, 0xfff0b0, 0.12);
      for (let i = 0, n = S.n(32 * k); i < n; i++) {
        const size = rr(0.5, 0.72) * sk, p = S.spec();
        p.x = x + r(1.1) * sk; p.y = y + rr(0.3, 1); p.z = z + r(1.1) * sk; p.vx = vx * 0.3 + r(3); p.vy = rr(5, 9) * sk; p.vz = vz * 0.3 + r(3);
        p.gravity = 20; p.bounce = 0.45; p.floor = y + size * 0.4; p.ax = Math.random() * TAU; p.sax = r(6);
        p.delay = i < 10 ? 0 : rr(0.05, 1.1); p.size = size; p.life = rr(1.4, 1.8); p.fade = FADE_FLASH; p.color = pick(CORN);
        S.add('pop');
      }
      for (let i = 0, n = S.n(3 * ks); i < n; i++) {
        const p = S.spec();
        p.x = x + r(0.8); p.y = y + 0.6; p.z = z + r(0.8); p.vy = rr(1, 2); p.drag = 1; p.delay = i * 0.3;
        p.size = rr(0.8, 1.1) * ks; p.grow = 1; p.life = rr(0.7, 0.9); p.ax = Math.random() * TAU; p.color = 0xfaf6ee;
        S.add('puff');
      }
    },
    trail(S, x, y, z, floor) {
      let p = S.spec();
      p.x = x + r(0.15); p.y = y + r(0.15); p.z = z + r(0.15); p.size = 0.3; p.life = 0.25; p.fade = FADE_DIM; p.color = 0x7a6a40;
      S.add('glow');
      if (Math.random() < 0.3) {
        const size = rr(0.16, 0.24);
        p = S.spec();
        p.x = x; p.y = y - 0.1; p.z = z; p.vx = r(1.2); p.vy = rr(1, 2.5); p.vz = r(1.2); p.gravity = 18; p.bounce = 0.4; p.floor = floor + size * 0.4;
        p.ax = Math.random() * TAU; p.sax = r(6); p.size = size; p.life = 0.8; p.fade = FADE_FLASH; p.color = pick(CORN);
        S.add('pop');
      }
    },
  },

  // GEYSER: a sustained jet. A column of water stands over the spot for most of a second, falling back round it as an umbrella and
  // spattering on the road; a splash ring at its foot and another as it ends; spray
  geyser: {
    name: 'Geyser', icon: icon.geyser,
    mark: [['scorch', 0x9fd8ff, 0.35, 4]],
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k), jet = 0.7;
      let p;
      for (const [wait, size] of [[0, 1.6], [jet, 2.4]]) {
        p = S.spec();
        p.x = x; p.y = y + 0.04; p.z = z; p.ax = -Math.PI / 2; p.size = size * sk; p.grow = 2.2; p.ease = 1; p.life = 0.6; p.delay = wait; p.fade = FADE_DIM; p.color = 0x7cc4f0;
        S.add('halo');
      }
      for (let i = 0, n = S.n(40 * k); i < n; i++) { // the column: let go one after another over `jet` s
        p = S.spec();
        p.x = x + r(0.15); p.y = y + 0.2; p.z = z + r(0.15); p.vx = vx * 0.15 + r(1.7) * sk; p.vy = rr(12, 16) * sk; p.vz = vz * 0.15 + r(1.7) * sk;
        p.gravity = 22; p.floor = y + 0.06; p.delay = i / n * jet; p.size = rr(0.26, 0.42) * sk; p.len = 1.25; p.life = rr(1.45, 1.75); p.color = pick(WATER);
        S.add('blob');
      }
      for (let i = 0, n = S.n(12 * k); i < n; i++) { // spatter at its foot
        const d = outward(0.3), sp = rr(3, 5);
        p = S.spec();
        p.x = x; p.y = y + 0.2; p.z = z; p.vx = d.x * sp; p.vy = rr(2, 4); p.vz = d.z * sp; p.gravity = 20; p.bounce = 0.3; p.floor = y + 0.06;
        p.delay = rr(0, jet); p.size = rr(0.16, 0.26); p.life = rr(0.6, 0.9); p.color = pick(WATER);
        S.add('blob');
      }
      for (let i = 0, n = S.n(3 * ks); i < n; i++) {
        p = S.spec();
        p.x = x + r(0.6); p.y = y + 0.8 + i * 0.9; p.z = z + r(0.6); p.vx = vx * 0.2 + r(0.6); p.vy = rr(1, 2); p.vz = vz * 0.2 + r(0.6); p.drag = 1;
        p.delay = i * 0.15; p.size = rr(1, 1.4) * ks; p.grow = 1.2; p.life = rr(0.8, 1.1); p.ax = Math.random() * TAU; p.color = 0xeef8ff;
        S.add('puff');
      }
    },
    trail(S, x, y, z, floor) {
      const p = S.spec();
      p.x = x + r(0.12); p.y = y - 0.1; p.z = z + r(0.12); p.vx = r(0.6); p.vy = rr(-1, 0.5); p.vz = r(0.6); p.gravity = 16; p.floor = floor + 0.06;
      p.size = rr(0.12, 0.2); p.len = 1.6; p.life = 0.5; p.color = pick(WATER);
      S.add('blob');
    },
  },

  // RAINBOW: one arch springs up over the spot (eased, standing on its diameter, facing the camera), a faint second arch outside it, both
  // fading; twinkles falling through it and a puff of cloud at its foot
  rainbow: {
    name: 'Rainbow', icon: icon.rainbow, floats: true,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      let p = S.spec();
      p.x = x; p.y = y; p.z = z; p.size = 0.4 * k; p.grow = 6.5; p.ease = 1; p.life = 1.9; p.fade = FADE_DIM; p.color = 0xb4b4b4;
      S.add('arc');
      p = S.spec();
      p.x = x; p.y = y; p.z = z; p.size = 0.55 * k; p.grow = 6.5; p.ease = 1; p.life = 1.6; p.delay = 0.12; p.fade = FADE_DIM; p.color = 0x383838;
      S.add('arc');
      flash(S, x, y + 0.8, z, 2 * k, 0xfff4d0, 0.14);
      for (let i = 0, n = S.n(16 * k); i < n; i++) {
        const d = outward(0.5), sp = rr(2, 5) * sk;
        p = S.spec();
        p.x = x; p.y = y + 1; p.z = z; p.vx = d.x * sp; p.vy = d.y * sp + 2; p.vz = d.z * sp; p.gravity = 2.5; p.drag = 1.4;
        p.delay = rr(0.1, 0.5); p.size = rr(0.3, 0.5); p.life = rr(0.9, 1.4); p.fade = FADE_FLICKER; p.color = pick(SPECTRUM);
        S.add('glow');
      }
      for (let i = 0, n = S.n(4 * ks); i < n; i++) {
        const a = i / 4 * TAU + r(0.4), p2 = S.spec();
        p2.x = x + Math.sin(a) * 0.9 * sk; p2.y = y + 0.4; p2.z = z + Math.cos(a) * 0.9 * sk; p2.vx = Math.sin(a) * 1.2; p2.vy = 0.6; p2.vz = Math.cos(a) * 1.2; p2.drag = 1;
        p2.size = rr(1, 1.4) * ks; p2.grow = 0.6; p2.life = rr(0.8, 1.1); p2.ax = Math.random() * TAU; p2.color = 0xffffff;
        S.add('puff');
      }
    },
    trail(S, x, y, z) {
      hue = (hue + 1) % (SPECTRUM.length * 2);
      const p = S.spec();
      p.x = x + r(0.08); p.y = y + r(0.08); p.z = z + r(0.08); p.size = 0.42; p.life = 0.45; p.fade = FADE_DIM; p.color = SPECTRUM[hue >> 1];
      S.add('glow');
    },
  },
};
