// ---- BURST WATER MAINS: the water's two models (what a main does: ../hazards.js; where they are put and how they
// are moved: render/hazards.js) ----
// makePuddle: the water on the road: an irregular, soft-edged pool with a sheen on it, that spreads and shrinks
// away as it is told. makeFountain: white water up out of the road, breaking up into droplets that fall round
// about, and mist.
import * as THREE from 'three';
import { Particles, Smoke, rnd } from './effects.js';

// (seeded, so a puddle is the same shape every run)
const seeded = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// a puddle's picture: lobes of soft-edged water overlapping into one irregular pool, never reaching the
// picture's edge; or (sheen) the light on it: a few pale streaks and glints, inside the same shape
const puddleTexture = (seed, sheen) => {
  const N = 192, canvas = document.createElement('canvas'), random = seeded(seed);
  canvas.width = canvas.height = N;
  const c = canvas.getContext('2d');
  // the lobes: one in the middle, the rest round it, each a radial fade
  const lobes = [[0.5, 0.5, 0.3]];
  for (let k = 0; k < 9; k++) {
    const a = random() * Math.PI * 2, d = 0.1 + random() * 0.17, r = 0.1 + random() * 0.14;
    lobes.push([0.5 + Math.cos(a) * d, 0.5 + Math.sin(a) * d * 1.15, Math.min(r, 0.47 - d * 1.15)]);
  }
  for (const [x, y, r] of lobes) {
    const fade = c.createRadialGradient(x * N, y * N, 0, x * N, y * N, r * N);
    fade.addColorStop(0, 'rgba(255,255,255,1)');
    fade.addColorStop(0.62, 'rgba(255,255,255,0.9)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = fade;
    c.beginPath();
    c.arc(x * N, y * N, r * N, 0, Math.PI * 2);
    c.fill();
  }
  // (coloured through its own shape: darker and bluer in the deep middle, pale at the wet edge)
  c.globalCompositeOperation = 'source-in';
  if (!sheen) {
    const depth = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * 0.5);
    depth.addColorStop(0, '#4f86a6');
    depth.addColorStop(0.55, '#6fa3bf');
    depth.addColorStop(1, '#a9cbdc');
    c.fillStyle = depth;
    c.fillRect(0, 0, N, N);
  } else {
    c.fillStyle = 'rgba(0,0,0,0)';
    c.clearRect(0, 0, N, N);
    c.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 7; k++) { // streaks of sky on the water, lying across the road
      const x = (0.3 + random() * 0.4) * N, y = (0.28 + random() * 0.44) * N, w = (0.08 + random() * 0.16) * N, h = (0.012 + random() * 0.02) * N;
      const glint = c.createRadialGradient(x, y, 0, x, y, w);
      glint.addColorStop(0, 'rgba(255,255,255,0.95)');
      glint.addColorStop(1, 'rgba(255,255,255,0)');
      c.save();
      c.translate(x, y);
      c.scale(1, h / w);
      c.translate(-x, -y);
      c.fillStyle = glint;
      c.beginPath();
      c.arc(x, y, w, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }
  return new THREE.CanvasTexture(canvas);
};
// a puddle `width` m across the road and `length` m along it, lying on the road at the group's origin:
// userData.set(spread 0 .. 1, t s) spreads and shrinks it (from its middle) and moves the light on it
export const makePuddle = (width, length, seed = 1) => {
  const g = new THREE.Group(), plane = () => new THREE.PlaneGeometry(width, length).rotateX(-Math.PI / 2);
  const flat = (map, extra) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, ...extra });
  const water = new THREE.Mesh(plane(), flat(puddleTexture(seed, false)));
  const sheen = new THREE.Mesh(plane(), flat(puddleTexture(seed + 7, true), { blending: THREE.AdditiveBlending, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
  water.position.y = 0.03;
  sheen.position.y = 0.034;
  g.add(water, sheen);
  g.userData.set = (spread, t) => {
    g.visible = spread > 0.02;
    if (!g.visible) return;
    const k = 0.35 + 0.65 * spread; // (it never shrinks to a dot: it thins away as it goes)
    water.scale.set(k, 1, k);
    sheen.scale.set(k * (0.96 + 0.03 * Math.sin(t * 1.7)), 1, k * (0.96 + 0.03 * Math.cos(t * 1.3)));
    water.material.opacity = 0.78 * Math.min(1, spread * 1.6);
    sheen.material.opacity = (0.3 + 0.12 * Math.sin(t * 2.3 + seed)) * Math.min(1, spread * 1.6);
  };
  g.userData.set(0, 0);
  return g;
};
// a fountain at the group's origin, up to `height` m: a slim column of white water, flaring at the top.
// userData.set(up 0 .. 1, t s, x, y, z (where it is in the world), paused) sizes it, and throws its
// droplets (they rise, spread and fall back to the road) and the mist round its head
export const makeFountain = (height) => {
  const g = new THREE.Group();
  const white = (opacity) => new THREE.MeshBasicMaterial({ color: 0xf2f9ff, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 1, 10, 1, true).translate(0, 0.5, 0), white(0.85));
  const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.38, 1, 12, 1, true).translate(0, 0.5, 0), white(0.3));
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 6), white(0.28));
  const foam = new THREE.Mesh(new THREE.CircleGeometry(1.1, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
  foam.position.y = 0.04;
  g.add(core, veil, crown, foam);
  g.visible = false;
  g.userData.set = (up, t, x, y, z, paused) => {
    g.visible = up > 0.02;
    if (!g.visible) return;
    const h = height * up * (1 + 0.04 * Math.sin(t * 21));
    core.scale.set(1 + 0.2 * Math.sin(t * 27), h, 1 + 0.2 * Math.cos(t * 23));
    veil.scale.set(1 + 0.12 * Math.sin(t * 17), h * 0.92, 1 + 0.12 * Math.cos(t * 19));
    crown.position.y = h;
    crown.scale.set(1 + 0.15 * Math.sin(t * 13), 0.6, 1 + 0.15 * Math.cos(t * 11));
    foam.scale.setScalar(0.8 + 0.3 * Math.abs(Math.sin(t * 9)));
    if (paused) return;
    for (let n = 0; n < 5; n++) { // droplets thrown off the top, falling in a ring round the hole
      const a = Math.random() * Math.PI * 2, out = 1.5 + Math.random() * 3.5;
      Particles.emit(x + rnd(0.3), y + h * (0.75 + Math.random() * 0.25), z + rnd(0.3), Math.cos(a) * out, 1 + Math.random() * 4, Math.sin(a) * out,
        0.9 + Math.random() * 0.5, 0.1 + Math.random() * 0.12, 0.3, 18, Math.random() < 0.6 ? 0xffffff : 0xcfe9f2, y);
    }
    if (Math.random() < 0.5) Smoke.emit(x + rnd(0.8), y + h * 0.9 + rnd(0.6), z + rnd(0.8), rnd(1.5), -0.5, rnd(1.5), 0.7, 0.3 + Math.random() * 0.3, 1, 2, 0xeef6fb); // (mist)
  };
  return g;
};
