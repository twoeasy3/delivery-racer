// ---- EIGHT MORE KILL EFFECTS (CHECKLIST 426; the first seven and the cut two: render/killfxdefs.js; the engine: render/killfx.js). Each
// differs from every one before it in how it moves and in its shapes:
//   Planes    paper darts launched out of a puff, gliding off in wide turns and sinking to the road (nose along their way)
//   Ink       a splat that spreads flat ON THE ROAD, thick drops flung out that fall and leave splats of their own
//   Hearts    one big heart beats twice, then a stream of little ones float up, zigzagging and beating
//   Gears     cogs flung out that land on edge and ROLL away, orange sparks, nuts and a jet of steam
//   Frost     ice spikes burst up out of the road in a ring, then snowflakes drift down turning; a frost ring
//   Leaves    a whirlwind: leaves spun up in a tightening column, then let go to see-saw down
//   Jelly     wobbly blobs: they squash and stretch, bounce, and wobble again where they land
//   Dominoes  two rings of toy tiles pop up round it and topple outward in a chain; a few flung over the top
// The same shape as the others (see the head of killfxdefs.js): name, icon(g, s), explode(S, x, y, z, vx, vz, k, ks, e), trail(S, x, y, z,
// floor); `floats` (nothing it throws lies on the floor), `mark` (the Cosmetics preview's floor mark, render/killpreview.js MARKS).
// Bounded: every count goes through S.n (the LOW version), every particle into a capped pool; nothing is allocated per spawn or frame.
import { FADE_DIM, FADE_FLICKER, FADE_POP, FADE_FLASH, TAU, r, rr, pick, sq, flash, puffs, outward } from './killfxdefs.js';

const PAPER = [0xffffff, 0xffffff, 0xfff6dc, 0xdcefff, 0xffe0ec];
const INK = [0x3434e0, 0x5a2ee0, 0x2a62f0]; // (a bright blue-violet ink: a black one is lost on the road)
const HEART = [0xff3b6b, 0xff6f9a, 0xe0185a, 0xff9ec0, 0xff4fa0];
const METAL = [0xd8a93c, 0xc8ccd4, 0xc97b45, 0xe8c25a];
const ICE = [0xffffff, 0xd6f3ff, 0xaee4ff];
const AUTUMN = [0xe8742a, 0xd9452b, 0xf2b22e, 0xb5651d, 0x9bb83a, 0xe85d1f];
const JELLY = [0x5be04a, 0xff4fa0, 0xffa12e, 0x9a5bff, 0x34d6e0, 0xffde3a];
const TOYS = [0xe8322f, 0xf28a1e, 0xf2d22a, 0x3cb44a, 0x2f7de8, 0x8a4fe0];

// ---- the chips' icons (s x s canvas, transparent) ----
const icon = {
  planes: (g, s) => {
    const dart = (x, y, sc, a, col) => { g.save(); g.translate(x * s, y * s); g.rotate(a); g.scale(sc * s, sc * s);
      g.fillStyle = col; g.beginPath(); g.moveTo(0.5, 0); g.lineTo(-0.5, -0.32); g.lineTo(-0.3, 0); g.closePath(); g.fill();
      g.fillStyle = '#b8c4d8'; g.beginPath(); g.moveTo(0.5, 0); g.lineTo(-0.3, 0); g.lineTo(-0.5, 0.2); g.closePath(); g.fill(); g.restore(); };
    dart(0.42, 0.62, 0.62, -0.45, '#ffffff'); dart(0.76, 0.26, 0.36, -0.2, '#dcefff');
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(1, s * 0.03); g.setLineDash([s * 0.05, s * 0.05]);
    g.beginPath(); g.moveTo(s * 0.06, s * 0.92); g.quadraticCurveTo(s * 0.1, s * 0.7, s * 0.22, s * 0.72); g.stroke(); g.setLineDash([]);
  },
  ink: (g, s) => {
    g.fillStyle = '#3a2a7a'; const c = s / 2;
    g.beginPath(); g.arc(c, c, s * 0.24, 0, TAU); g.fill();
    for (let i = 0; i < 8; i++) { const a = i * 2.39, d = s * (0.22 + (i % 3) * 0.06), rad = s * (0.05 + (i % 2) * 0.04); g.beginPath(); g.arc(c + Math.sin(a) * d, c + Math.cos(a) * d, rad, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(c - s * 0.08, c - s * 0.09, s * 0.07, s * 0.04, -0.6, 0, TAU); g.fill();
  },
  hearts: (g, s) => {
    const heart = (x, y, sz, col) => { g.save(); g.translate(x * s, y * s); g.scale(sz * s / 52, sz * s / 52); g.translate(-32, -32);
      g.beginPath(); g.moveTo(32, 56); g.bezierCurveTo(4, 36, 4, 10, 20, 9); g.bezierCurveTo(27, 9, 31, 14, 32, 19); g.bezierCurveTo(33, 14, 37, 9, 44, 9); g.bezierCurveTo(60, 10, 60, 36, 32, 56); g.fillStyle = col; g.fill(); g.restore(); };
    heart(0.42, 0.58, 0.7, '#ff3b6b'); heart(0.78, 0.26, 0.32, '#ff9ec0'); heart(0.2, 0.2, 0.22, '#ff6f9a');
  },
  gears: (g, s) => {
    const cog = (x, y, rad, teeth, col) => { g.fillStyle = col; g.beginPath();
      for (let i = 0; i < teeth * 4; i++) { const a = i / (teeth * 4) * TAU, q = i % 4 < 2 ? rad : rad * 0.76; g.lineTo(x * s + Math.sin(a) * q * s, y * s - Math.cos(a) * q * s); }
      g.closePath(); g.fill(); g.fillStyle = '#1b2030'; g.beginPath(); g.arc(x * s, y * s, rad * s * 0.3, 0, TAU); g.fill(); };
    cog(0.38, 0.6, 0.32, 10, '#d8a93c'); cog(0.74, 0.3, 0.2, 8, '#c8ccd4');
  },
  frost: (g, s) => {
    const c = s / 2; g.strokeStyle = '#d6f3ff'; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, s * 0.06);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, dx = Math.sin(a), dy = -Math.cos(a);
      g.beginPath(); g.moveTo(c, c); g.lineTo(c + dx * s * 0.42, c + dy * s * 0.42); g.stroke();
      const m = s * 0.26, t = s * 0.1; g.beginPath(); g.moveTo(c + dx * m, c + dy * m); g.lineTo(c + dx * (m + t) + dy * t, c + dy * (m + t) - dx * t); g.moveTo(c + dx * m, c + dy * m); g.lineTo(c + dx * (m + t) - dy * t, c + dy * (m + t) + dx * t); g.stroke(); }
  },
  leaves: (g, s) => {
    const leaf = (x, y, sz, a, col) => { g.save(); g.translate(x * s, y * s); g.rotate(a); g.scale(sz * s, sz * s);
      g.fillStyle = col; g.beginPath(); g.moveTo(0, -0.5); g.bezierCurveTo(0.4, -0.25, 0.36, 0.2, 0, 0.42); g.bezierCurveTo(-0.36, 0.2, -0.4, -0.25, 0, -0.5); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.05; g.beginPath(); g.moveTo(0, 0.5); g.lineTo(0, -0.4); g.stroke(); g.restore(); };
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, s * 0.035); g.beginPath(); g.ellipse(s * 0.5, s * 0.55, s * 0.38, s * 0.14, 0, 0.3, TAU - 0.6); g.stroke();
    leaf(0.36, 0.5, 0.5, -0.6, '#e8742a'); leaf(0.72, 0.34, 0.36, 0.7, '#f2b22e'); leaf(0.66, 0.78, 0.3, 2.2, '#d9452b');
  },
  jelly: (g, s) => {
    const blob = (x, y, w, h, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x * s, y * s, w * s, h * s, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse((x - w * 0.35) * s, (y - h * 0.4) * s, w * 0.25 * s, h * 0.18 * s, -0.5, 0, TAU); g.fill(); };
    blob(0.4, 0.66, 0.3, 0.2, '#5be04a'); blob(0.72, 0.3, 0.16, 0.2, '#ff4fa0'); blob(0.22, 0.24, 0.1, 0.1, '#ffa12e');
  },
  dominoes: (g, s) => {
    const tile = (x, y, a, col) => { g.save(); g.translate(x * s, y * s); g.rotate(a); g.fillStyle = col; g.fillRect(-s * 0.08, -s * 0.2, s * 0.16, s * 0.4); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-s * 0.08, -s * 0.2, s * 0.05, s * 0.4); g.restore(); };
    tile(0.18, 0.62, 0, '#e8322f'); tile(0.38, 0.6, 0.35, '#f2d22a'); tile(0.6, 0.62, 0.8, '#3cb44a'); tile(0.8, 0.72, 1.35, '#2f7de8');
  },
};

export const KILL_MORE = {
  // PLANES: a puff of paper, then darts launched out every way, each turning in a wide circle as it glides down to the road
  planes: {
    name: 'Planes', icon: icon.planes,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      flash(S, x, y + 1.2, z, 2.2 * k, 0xffffff, 0.14);
      for (let i = 0, n = S.n(20 * k); i < n; i++) {
        const p = S.spec(), a = i / n * TAU + r(0.3), sp = rr(6, 10) * sk;
        p.x = x + Math.sin(a) * 0.4; p.y = y + rr(0.8, 1.8); p.z = z + Math.cos(a) * 0.4;
        p.vx = vx * 0.4 + Math.sin(a) * sp; p.vy = rr(4, 9) * sk; p.vz = vz * 0.4 + Math.cos(a) * sp;
        p.gravity = 5; p.drag = 0.9; p.turn = rr(1.2, 2.4) * (i % 2 ? 1 : -1); p.floor = y + 0.03;
        p.size = rr(0.7, 1) * sk; p.life = rr(2.2, 3.1); p.color = pick(PAPER);
        S.add('dart');
      }
      for (let i = 0, n = S.n(10 * k); i < n; i++) { // torn scraps of the sheet they were folded from
        const p = S.spec();
        p.x = x + r(0.6); p.y = y + 1.2; p.z = z + r(0.6); p.vx = vx * 0.4 + r(4); p.vy = rr(3, 7); p.vz = vz * 0.4 + r(4);
        p.gravity = 5; p.drag = 2.5; p.flutter = 1; p.phase = Math.random() * TAU; p.size = rr(0.2, 0.32); p.len = 1.3;
        p.ax = Math.random() * TAU; p.ay = Math.random() * TAU; p.sax = r(10); p.say = r(8); p.life = rr(1.2, 1.8); p.color = 0xf4f4f4; p.floor = y + 0.03;
        S.add('quad');
      }
      puffs(S, 3 * ks, x, y, z, vx, vz, ks, 0xf6f6ff);
    },
    trail(S, x, y, z, floor) {
      let p = S.spec();
      p.x = x + r(0.1); p.y = y + r(0.1); p.z = z + r(0.1); p.vx = r(0.4); p.vz = r(0.4); p.size = 0.07; p.len = 3; p.life = 0.4; p.fade = FADE_DIM; p.color = 0xa0a8b8;
      S.add('spark');
      if (Math.random() < 0.12) {
        p = S.spec();
        const a = Math.random() * TAU;
        p.x = x; p.y = y; p.z = z; p.vx = Math.sin(a) * 3; p.vy = rr(0.5, 2); p.vz = Math.cos(a) * 3; p.gravity = 3; p.drag = 0.8; p.turn = r(2.5);
        p.floor = floor + 0.03; p.size = 0.4; p.life = 1.1; p.color = pick(PAPER);
        S.add('dart');
      }
    },
  },

  // INK: a splat spreads on the road under it, thick drops are flung out and fall, and where they fall smaller splats spread
  ink: {
    name: 'Ink', icon: icon.ink,
    mark: [['scorch', 0x3434e0, 0.3, 4.4]],
    explode(S, x, y, z, vx, vz, k) {
      const sk = sq(k);
      let p = S.spec();
      p.x = x; p.y = y + 0.03; p.z = z; p.ax = -Math.PI / 2; p.ay = Math.random() * TAU; p.size = 2.6 * k; p.grow = 0.35; p.life = 3; p.color = INK[0];
      S.add('blot');
      for (let i = 0, n = S.n(26 * k); i < n; i++) { // the drops: thrown up and out, falling (stretched as they go)
        const d = outward(0.25), sp = rr(5, 10) * sk;
        p = S.spec();
        p.x = x + d.x * 0.5; p.y = y + 0.6; p.z = z + d.z * 0.5; p.vx = vx * 0.3 + d.x * sp; p.vy = rr(5, 11) * sk; p.vz = vz * 0.3 + d.z * sp;
        p.gravity = 20; p.floor = y + 0.08; p.size = rr(0.26, 0.5) * sk; p.len = 1.5; p.life = rr(0.75, 1.05); p.color = pick(INK);
        S.add('blob');
      }
      for (let i = 0, n = S.n(8 * k); i < n; i++) { // the splats they leave (they spread out from where the drops come down)
        const a = Math.random() * TAU, d = rr(1.8, 4) * sk;
        p = S.spec();
        p.x = x + Math.sin(a) * d + vx * 0.25; p.y = y + 0.025; p.z = z + Math.cos(a) * d + vz * 0.25; p.ax = -Math.PI / 2; p.ay = Math.random() * TAU;
        p.delay = rr(0.45, 0.8); p.size = rr(0.6, 1.2) * sk; p.grow = 0.4; p.life = rr(1.8, 2.4); p.color = pick(INK);
        S.add('blot');
      }
      flash(S, x, y + 0.8, z, 1.8 * k, 0x6a4cff, 0.18);
    },
    trail(S, x, y, z, floor) {
      let p = S.spec();
      p.x = x + r(0.12); p.y = y - 0.1; p.z = z + r(0.12); p.vy = rr(-1, 0); p.gravity = 14; p.floor = floor + 0.08;
      p.size = rr(0.14, 0.22); p.len = 1.6; p.life = 0.45; p.color = pick(INK);
      S.add('blob');
      if (Math.random() < 0.1) {
        p = S.spec();
        p.x = x + r(0.3); p.y = floor + 0.025; p.z = z + r(0.3); p.ax = -Math.PI / 2; p.ay = Math.random() * TAU; p.size = rr(0.3, 0.5); p.grow = 0.3; p.life = 1.2; p.color = INK[1];
        S.add('blot');
      }
    },
  },

  // HEARTS: one big heart beats twice over it, a pink ring, then little hearts stream up and out, zigzagging, beating as they go
  hearts: {
    name: 'Hearts', icon: icon.hearts, floats: true,
    explode(S, x, y, z, vx, vz, k) {
      const sk = sq(k), cy = y + 1.5 * sk;
      let p = S.spec();
      p.x = x; p.y = cy; p.z = z; p.size = 3.2 * k; p.toCam = 0.3; p.life = 0.95; p.fade = FADE_FLASH; p.beat = 2.2; p.color = 0xff2d5e;
      S.add('heart');
      p = S.spec();
      p.x = x; p.y = cy; p.z = z; p.size = 2.4 * k; p.grow = 2.6; p.life = 0.5; p.fade = FADE_DIM; p.toCam = -0.2; p.color = 0xff7ab0;
      S.add('ring');
      flash(S, x, cy, z, 3 * k, 0xff9ec0, 0.22);
      for (let i = 0, n = S.n(26 * k); i < n; i++) {
        const d = outward(0.1), sp = rr(4, 8) * sk;
        p = S.spec();
        p.x = x; p.y = cy; p.z = z; p.vx = vx * 0.3 + d.x * sp; p.vy = d.y * sp + 2; p.vz = vz * 0.3 + d.z * sp;
        p.gravity = -0.6; p.drag = 2.4; p.flutter = rr(1.2, 2.2); p.phase = Math.random() * TAU; p.beat = rr(1.8, 2.8);
        p.delay = rr(0, 0.25); p.size = rr(0.45, 0.85) * sk; p.life = rr(1.8, 2.6); p.fade = FADE_POP; p.color = pick(HEART);
        S.add('heart');
      }
    },
    trail(S, x, y, z) {
      if (Math.random() < 0.45) return;
      const p = S.spec();
      p.x = x + r(0.15); p.y = y + r(0.15); p.z = z + r(0.15); p.vy = 0.8; p.gravity = -1; p.drag = 1; p.flutter = 1; p.phase = Math.random() * TAU; p.beat = 2.5;
      p.size = rr(0.28, 0.4); p.life = 0.8; p.fade = FADE_POP; p.color = pick(HEART);
      S.add('heart');
    },
  },

  // GEARS: cogs thrown up spinning, which land on edge and roll away along the road; sparks, nuts and a jet of steam
  gears: {
    name: 'Gears', icon: icon.gears,
    mark: [['scorch', 0x000000, 0.5, 3]],
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      flash(S, x, y + 1, z, 2.4 * k, 0xffd08a, 0.16);
      for (let i = 0, n = S.n(14 * k); i < n; i++) {
        const p = S.spec(), a = Math.random() * TAU, sp = rr(3, 7) * sk, size = rr(0.5, 0.95) * sk;
        p.x = x + Math.sin(a) * 0.3; p.y = y + rr(0.8, 1.4); p.z = z + Math.cos(a) * 0.3;
        p.vx = vx * 0.4 + Math.sin(a) * sp; p.vy = rr(8, 13) * sk; p.vz = vz * 0.4 + Math.cos(a) * sp;
        p.gravity = 22; p.bounce = 0.35; p.floor = y + size * 0.5; p.size = size;
        p.ay = Math.atan2(p.vx, p.vz); p.sax = Math.hypot(p.vx, p.vz) / (size * 0.5); // (rolling: its spin matches its speed over the road)
        p.life = rr(2, 2.8); p.color = pick(METAL);
        S.add('gear');
      }
      for (let i = 0, n = S.n(8 * k); i < n; i++) { // nuts and bolts
        const p = S.spec();
        p.x = x + r(0.5); p.y = y + 1; p.z = z + r(0.5); p.vx = vx * 0.4 + r(6); p.vy = rr(6, 11); p.vz = vz * 0.4 + r(6);
        p.gravity = 22; p.bounce = 0.4; p.floor = y + 0.08; p.size = 0.16; p.len = 1.4; p.sax = r(14); p.say = r(14); p.life = rr(1.4, 2); p.color = 0x6a6e78;
        S.add('cube');
      }
      for (let i = 0, n = S.n(18 * k); i < n; i++) {
        const p = S.spec(), d = outward(0), sp = rr(9, 15) * sk;
        p.x = x; p.y = y + 1; p.z = z; p.vx = vx * 0.4 + d.x * sp; p.vy = d.y * sp + 2; p.vz = vz * 0.4 + d.z * sp;
        p.gravity = 16; p.drag = 1.5; p.bounce = 0.3; p.floor = y + 0.05; p.size = 0.09; p.len = 1.6; p.life = rr(0.4, 0.7); p.fade = FADE_DIM; p.color = i % 3 ? 0xffa030 : 0xffe0a0;
        S.add('spark');
      }
      for (let i = 0, n = S.n(5 * ks); i < n; i++) { // the steam: a white jet straight up
        const p = S.spec();
        p.x = x + r(0.3); p.y = y + 0.6 + i * 0.3; p.z = z + r(0.3); p.vx = vx * 0.2 + r(0.6); p.vy = rr(5, 8); p.vz = vz * 0.2 + r(0.6); p.drag = 1.6;
        p.size = rr(0.8, 1.2) * ks; p.grow = 1.6; p.life = rr(0.8, 1.2); p.color = 0xf4f6f8; p.ax = Math.random() * TAU;
        S.add('puff');
      }
    },
    trail(S, x, y, z, floor) {
      let p = S.spec();
      p.x = x + r(0.12); p.y = y + r(0.12); p.z = z + r(0.12); p.vx = r(2); p.vy = rr(-1, 1.5); p.vz = r(2); p.gravity = 10; p.size = 0.07; p.len = 1.6; p.life = 0.3; p.fade = FADE_DIM; p.color = 0xffa030;
      S.add('spark');
      if (Math.random() < 0.18) {
        p = S.spec();
        const a = Math.random() * TAU, sp = rr(1, 2.5);
        p.x = x; p.y = y - 0.15; p.z = z; p.vx = Math.sin(a) * sp; p.vy = 1; p.vz = Math.cos(a) * sp; p.gravity = 18; p.bounce = 0.3;
        p.size = 0.32; p.floor = floor + 0.16; p.ay = a; p.sax = sp / 0.16; p.life = 1; p.color = pick(METAL);
        S.add('gear');
      }
    },
  },

  // FROST: a ring of ice spikes bursts up out of the road leaning out, a white-blue flash and a frost ring; snowflakes drift down turning
  frost: {
    name: 'Frost', icon: icon.frost,
    mark: [['scorch', 0xcff0ff, 0.5, 4.4], ['ring', 0x9fe0ff, 0.6, 3.6, true]],
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k);
      flash(S, x, y + 0.9, z, 3.4 * k, 0xbfeaff, 0.25);
      let p = S.spec();
      p.x = x; p.y = y + 0.2; p.z = z; p.size = 2.4 * k; p.grow = 3; p.life = 0.45; p.fade = FADE_DIM; p.color = 0x9fe0ff;
      S.add('ring');
      for (const [ring, count, at, tall, wait] of [[0, 9, [0.2, 0.7], [2.4, 3.4], 0], [1, 13, [1.1, 1.8], [1.3, 2.2], 0.07]]) {
        for (let i = 0, n = S.n(count * k); i < n; i++) {
          const a = i / n * TAU + r(0.25) + ring * 0.2, d = rr(at[0], at[1]) * sk;
          p = S.spec();
          p.x = x + Math.sin(a) * d; p.y = y; p.z = z + Math.cos(a) * d; p.ay = a; p.ax = rr(0.25, 0.75) + ring * 0.25;
          p.size = rr(0.45, 0.7) * sk; p.len = rr(tall[0], tall[1]); p.delay = wait + rr(0, 0.05); p.life = rr(1.1, 1.6); p.fade = FADE_FLASH; p.color = pick(ICE);
          S.add('shard');
        }
      }
      for (let i = 0, n = S.n(30 * k); i < n; i++) {
        const d = outward(0.3), sp = rr(2, 6) * sk;
        p = S.spec();
        p.x = x + d.x * 0.5; p.y = y + 1; p.z = z + d.z * 0.5; p.vx = vx * 0.3 + d.x * sp; p.vy = rr(4, 9) * sk; p.vz = vz * 0.3 + d.z * sp;
        p.gravity = 2.2; p.drag = 2.6; p.flutter = rr(0.5, 1.2); p.phase = Math.random() * TAU; p.floor = y + 0.06;
        p.ax = Math.random() * TAU; p.sax = r(3); p.size = rr(0.3, 0.55); p.life = rr(2, 3); p.color = pick(ICE);
        S.add('flake');
      }
      puffs(S, 3 * ks, x, y, z, vx, vz, ks, 0xeaf8ff);
    },
    trail(S, x, y, z, floor) {
      let p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.vy = -0.3; p.gravity = 1; p.drag = 1.5; p.flutter = 0.8; p.phase = Math.random() * TAU; p.floor = floor + 0.06;
      p.ax = Math.random() * TAU; p.sax = r(3); p.size = rr(0.18, 0.28); p.life = 0.9; p.color = pick(ICE);
      S.add('flake');
      p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.size = 0.45; p.life = 0.25; p.fade = FADE_FLICKER; p.color = 0xbfeaff;
      S.add('glow');
    },
  },

  // LEAVES: a whirlwind. Leaves spun up round it in a column that tightens as it rises, then let go to see-saw down; a ring of dust
  leaves: {
    name: 'Leaves', icon: icon.leaves,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k), spin = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0, n = S.n(38 * k); i < n; i++) {
        const p = S.spec(), a = Math.random() * TAU, d = rr(0.6, 1.6) * sk, v = rr(5, 8) * sk;
        p.x = x + Math.sin(a) * d; p.y = y + rr(0.2, 1.4); p.z = z + Math.cos(a) * d;
        // (round the centre: its heading turns at speed / radius, so it circles it; the drag slows it and the circle tightens)
        p.vx = vx * 0.2 + Math.cos(a) * v * spin; p.vy = rr(6, 11) * sk; p.vz = vz * 0.2 - Math.sin(a) * v * spin;
        p.turn = -spin * v / d; p.gravity = 5; p.drag = 0.8; p.flutter = rr(0.6, 1.4); p.phase = Math.random() * TAU; p.floor = y + 0.03;
        p.ax = Math.random() * TAU; p.ay = Math.random() * TAU; p.sax = r(7); p.say = r(5); p.size = rr(0.42, 0.6) * sk; p.len = 1.15;
        p.life = rr(2.4, 3.2); p.color = pick(AUTUMN);
        S.add('leaf');
      }
      for (let i = 0, n = S.n(3 * ks); i < n; i++) { // a little dust, swept round
        const p = S.spec(), a = i / n * TAU, d = 1.2 * sk;
        p.x = x + Math.sin(a) * d; p.y = y + 0.5; p.z = z + Math.cos(a) * d; p.vx = Math.cos(a) * 3 * spin; p.vy = 1.5; p.vz = -Math.sin(a) * 3 * spin; p.turn = -spin * 2.5; p.drag = 1;
        p.size = rr(0.45, 0.65) * ks; p.grow = 0.6; p.life = rr(0.5, 0.7); p.color = 0x7d6e52; p.ax = Math.random() * TAU;
        S.add('puff');
      }
    },
    trail(S, x, y, z, floor) {
      const p = S.spec();
      p.x = x + r(0.2); p.y = y + r(0.2); p.z = z + r(0.2); p.vy = rr(0, 1); p.gravity = 3; p.drag = 2; p.flutter = 1.2; p.phase = Math.random() * TAU; p.floor = floor + 0.03;
      p.ax = Math.random() * TAU; p.ay = Math.random() * TAU; p.sax = r(8); p.say = r(6); p.size = rr(0.26, 0.36); p.len = 1.15; p.life = 0.9; p.color = pick(AUTUMN);
      S.add('leaf');
    },
  },

  // JELLY: a big blob squashes on the spot, wobbly blobs thrown up that squash and stretch, bounce, and wobble where they land
  jelly: {
    name: 'Jelly', icon: icon.jelly,
    mark: [['scorch', 0x5be04a, 0.35, 3.6]],
    explode(S, x, y, z, vx, vz, k) {
      const sk = sq(k), main = pick(JELLY);
      let p = S.spec();
      p.x = x; p.y = y + 0.9 * sk; p.z = z; p.size = 2.2 * k; p.jelly = 1.6; p.life = 0.7; p.fade = FADE_POP; p.toCam = 0.3; p.color = main;
      S.add('blob');
      for (let i = 0, n = S.n(16 * k); i < n; i++) {
        const a = Math.random() * TAU, sp = rr(3, 7) * sk, size = rr(0.55, 1.1) * sk;
        p = S.spec();
        p.x = x + Math.sin(a) * 0.4; p.y = y + 1; p.z = z + Math.cos(a) * 0.4; p.vx = vx * 0.4 + Math.sin(a) * sp; p.vy = rr(8, 13) * sk; p.vz = vz * 0.4 + Math.cos(a) * sp;
        p.gravity = 22; p.bounce = 0.55; p.floor = y + size * 0.42; p.jelly = 1; p.phase = Math.random() * TAU;
        p.size = size; p.life = rr(1.8, 2.6); p.color = i % 3 ? main : pick(JELLY);
        S.add('blob');
      }
      for (let i = 0, n = S.n(12 * k); i < n; i++) { // droplets
        const d = outward(0.2), sp = rr(6, 10) * sk;
        p = S.spec();
        p.x = x; p.y = y + 1; p.z = z; p.vx = d.x * sp; p.vy = rr(4, 9); p.vz = d.z * sp; p.gravity = 20; p.bounce = 0.4; p.floor = y + 0.1;
        p.jelly = 0.6; p.size = rr(0.18, 0.3); p.life = rr(0.8, 1.2); p.color = main;
        S.add('blob');
      }
    },
    trail(S, x, y, z, floor) {
      const p = S.spec();
      p.x = x + r(0.15); p.y = y - 0.1; p.z = z + r(0.15); p.vx = r(1); p.vy = rr(0, 1.5); p.vz = r(1); p.gravity = 16; p.bounce = 0.5; p.floor = floor + 0.1;
      p.jelly = 1; p.phase = Math.random() * TAU; p.size = rr(0.2, 0.32); p.life = 0.8; p.color = pick(JELLY);
      S.add('blob');
    },
  },

  // DOMINOES: two rings of toy tiles pop up round the spot and topple outward one after another round the ring; a few flung over
  dominoes: {
    name: 'Dominoes', icon: icon.dominoes,
    explode(S, x, y, z, vx, vz, k, ks) {
      const sk = sq(k), dir = Math.random() < 0.5 ? 1 : -1, a0 = Math.random() * TAU;
      for (const [ring, count, at, wait] of [[0, 12, 1.1, 0], [1, 20, 2.1, 0.12]]) {
        for (let i = 0, n = S.n(count * sk); i < n; i++) {
          const p = S.spec(), a = a0 + dir * i / n * TAU, size = (ring ? 0.95 : 0.8) * sk, d = at * sk;
          p.x = x + Math.sin(a) * d; p.y = y + 0.08 * size; p.z = z + Math.cos(a) * d;
          p.ay = a; p.ax = 0.06; p.sax = 0.8; p.topple = 22; p.axMax = Math.PI / 2 - 0.02; // (leans out, falls faster and faster, and lies)
          p.delay = wait + i / n * 0.45; p.size = size; p.life = rr(1.9, 2.3); p.fade = FADE_FLASH; p.color = TOYS[(i + ring * 3) % TOYS.length];
          S.add('domino');
        }
      }
      for (let i = 0, n = S.n(7 * k); i < n; i++) { // the ones in the middle, flung up over the rings
        const p = S.spec(), a = Math.random() * TAU, sp = rr(3, 6) * sk;
        p.x = x; p.y = y + 0.5; p.z = z; p.vx = vx * 0.4 + Math.sin(a) * sp; p.vy = rr(8, 12) * sk; p.vz = vz * 0.4 + Math.cos(a) * sp;
        p.gravity = 22; p.bounce = 0.3; p.floor = y + 0.04; p.sax = r(10); p.say = r(8); p.size = 0.7 * sk; p.life = rr(1.6, 2.2); p.color = pick(TOYS);
        S.add('domino');
      }
      flash(S, x, y + 0.6, z, 1.8 * k, 0xfff2c0, 0.14);
      puffs(S, 3 * ks, x, y, z, vx, vz, ks, 0xd8ccb4, 2.2);
    },
    trail(S, x, y, z, floor) {
      if (Math.random() < 0.5) return;
      const p = S.spec();
      p.x = x + r(0.15); p.y = y - 0.15; p.z = z + r(0.15); p.vx = r(1.5); p.vy = rr(0, 2); p.vz = r(1.5); p.gravity = 16; p.bounce = 0.3; p.floor = floor + 0.03;
      p.sax = r(10); p.say = r(8); p.size = 0.32; p.life = 0.8; p.color = pick(TOYS);
      S.add('domino');
    },
  },
};
