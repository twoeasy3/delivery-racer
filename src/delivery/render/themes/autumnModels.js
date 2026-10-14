// ---- AUTUMN's models: no game state, so the gimmicks page and the cargo page can show them too. Each faces local +z, its
// feet on y = 0.
//   the theme's own obstacles (themes.js `obstacles`; the kinds stand in for the plain crate, bale and cone):
//     harvestCrate  a slatted crate heaped with pumpkins (pumpkinCrate is Halloween's key)                        (a crate)
//     leafPile      a heap of raked leaves with a rake stuck in it               (a bale)
//     smallPumpkin  a pumpkin on a bale of straw, a stalk on it, a lit face      (a cone)
//   the cargo of Foliage Run: pie (Good: a pumpkin pie cooling on a stand) and syrup (Evil: a stolen tin of maple syrup)
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const haze = (color, opacity = 0.5) => glow(color, { transparent: true, opacity, depthWrite: false });
const put = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const sphere = (r, w = 10, h = 7) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 12) => new THREE.CylinderGeometry(top, bottom, h, n);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const show = (object, k) => object.scale.setScalar(Math.max(0.001, k));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const FLAT = Math.PI / 2;
// the dark patch under an obstacle (as obstacleModels.js's grounded): it reads against the road from the chase camera
const grounded = (group, r) => {
  const shade = put(group, new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -FLAT;
  return group;
};

const ORANGES = [0xf07a14, 0xe8680f, 0xf58a22, 0xdd5a0c, 0xf3951f];
// a pumpkin: a squashed ball in orange, six ribs (squashed balls turned about it, hidden in it but for their ridge), a stalk
const pumpkin = (parent, r, x, y, z, turn, color) => {
  const g = sub(parent, x, y, z);
  g.rotation.y = turn;
  const skin = lambert(color);
  put(g, sphere(r, 10, 7), skin).scale.set(1, 0.78, 1);
  for (const a of [0, Math.PI / 3, Math.PI * 2 / 3]) { const rib = put(g, sphere(r * 0.97, 8, 6), skin); rib.scale.set(0.5, 0.8, 1); rib.rotation.y = a; }
  put(g, cyl(r * 0.1, r * 0.17, r * 0.4, 6), lambert(0x4f6a22), 0, r * 0.74, 0).rotation.z = 0.2;
  return g;
};

// ---- the obstacles -----------------------------------------------------------------------------------------------
export const AUTUMN_OBSTACLES = {
  // a crate: a wooden crate, 1.2 m across, a heap of pumpkins in it
  harvestCrate: () => {
    const g = new THREE.Group(), wood = lambert(0x9a6a38), dark = lambert(0x5e3d1e);
    put(g, box(1.16, 0.62, 1.16), dark, 0, 0.31, 0);
    for (const y of [0.13, 0.31, 0.49]) put(g, box(1.2, 0.13, 1.2), wood, 0, y, 0);
    for (const x of [-0.56, 0.56]) for (const z of [-0.56, 0.56]) put(g, box(0.1, 0.66, 0.1), dark, x, 0.33, z);
    [[-0.3, 0.9, -0.28, 0.4], [0.3, 0.9, -0.25, 0.38], [-0.28, 0.88, 0.3, 0.37], [0.3, 0.9, 0.3, 0.4], [0, 1.28, 0.02, 0.36], [0.02, 0.92, 0.02, 0.34]]
      .forEach(([x, y, z, r], i) => pumpkin(g, r, x, y - 0.12, z, i * 1.3, ORANGES[i % ORANGES.length]));
    return grounded(g, 0.95);
  },
  // a bale: a heap of raked leaves in four reds and golds, a rake stuck in it
  leafPile: () => {
    const g = new THREE.Group();
    const leaves = [[0xc4501c, 0, 0.1, 0, 1.12, 0.72, 1.12], [0xd9741f, 0.5, 0.1, 0.35, 0.72, 0.5, 0.7], [0xe0a030, -0.55, 0.1, -0.2, 0.7, 0.46, 0.76],
      [0xa83a1a, -0.2, 0.1, 0.6, 0.62, 0.4, 0.6], [0xe8b840, 0.45, 0.1, -0.5, 0.6, 0.4, 0.62], [0xb8421a, 0, 0.5, 0, 0.7, 0.36, 0.7]];
    for (const [c, x, y, z, sx, sy, sz] of leaves) put(g, sphere(1, 10, 6), lambert(c), x, y, z).scale.set(sx, sy, sz);
    const wood = lambert(0x8a6238);
    put(g, cyl(0.04, 0.04, 2.1, 6), wood, 0.15, 1.1, 0.1, 0.05, 0, -0.25);                           // the rake's handle...
    put(g, box(0.62, 0.05, 0.08), wood, -0.12, 1.98, 0.05, 0, 0, -0.25);                              // ...its head...
    for (let k = -2; k <= 2; k++) put(g, box(0.035, 0.22, 0.035), lambert(0x4a4a50), -0.12 + k * 0.12, 1.8 - k * 0.03, 0.05);
    return grounded(g, 1.35);
  },
  // a cone: a pumpkin on a bale of straw, a green stalk, and a face lit on it (both sides, so it is read coming and going)
  smallPumpkin: () => {
    const g = new THREE.Group();
    put(g, cyl(0.46, 0.5, 0.36, 12), lambert(0xd9b44f), 0, 0.18, 0);
    for (const y of [0.1, 0.26]) put(g, cyl(0.505, 0.505, 0.05, 12), lambert(0x9a7a2a), 0, y, 0);
    const p = pumpkin(g, 0.5, 0, 0.74, 0, 0, 0xf07a14);
    p.scale.setScalar(1.05);
    const ink = glow(0xffd23f, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (const side of [-1, 1]) {
      const face = sub(g, 0, 0.74, side * 0.5);
      face.rotation.y = side < 0 ? Math.PI : 0;
      for (const x of [-0.17, 0.17]) put(face, new THREE.ConeGeometry(0.1, 0.16, 3), ink, x, 0.1, 0.005).rotation.z = 0;
      put(face, box(0.4, 0.08, 0.01), ink, 0, -0.14, 0.005);
      put(face, box(0.09, 0.14, 0.01), ink, -0.12, -0.19, 0.005);
      put(face, box(0.09, 0.14, 0.01), ink, 0.12, -0.19, 0.005);
    }
    return grounded(g, 0.62);
  },
};

// ---- the cargo ---------------------------------------------------------------------------------------------------
const TRANSITION = 0.5;
// puffs rising and fading
const cycle = (list, t, rate, fn) => list.forEach((m, k) => fn(m, (((t * rate + k / list.length) % 1) + 1) % 1, k));
const idle = (group, pose) => { group.userData.animate = pose; pose(0); return group; };
const stated = (group, pose) => {
  const w = [1, 0, 0];
  let target = 0, last = null;
  group.userData.state = 0;
  group.userData.setState = (state, snap = false) => {
    target = Math.max(0, Math.min(2, Math.round(state) || 0));
    group.userData.state = target;
    if (snap) for (let i = 0; i < 3; i++) w[i] = i === target ? 1 : 0;
  };
  group.userData.animate = (t) => {
    const dt = last === null ? 0 : Math.min(0.1, Math.abs(t - last));
    last = t;
    for (let i = 0; i < 3; i++) w[i] += Math.max(-dt / TRANSITION, Math.min(dt / TRANSITION, (i === target ? 1 : 0) - w[i]));
    pose(t, w[1], w[2], dt);
  };
  group.userData.animate(0);
  return group;
};
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
// a word or a drawing on a label, as a material (plain `ground` where there is no canvas, as in a headless check)
const label = (draw, ground, w = 128, h = 128) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + ground.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    draw(ctx, w, h);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return glow(0xffffff, { map, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  } catch { return glow(ground); }
};
// a maple leaf, drawn on a canvas: a star of five pointed lobes and a stem
const mapleLeaf = (ctx, cx, cy, r, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  const pts = [[0, -1], [0.18, -0.6], [0.5, -0.72], [0.4, -0.3], [0.85, -0.35], [0.6, 0.05], [0.8, 0.25], [0.3, 0.3], [0.3, 0.55], [0.08, 0.5], [0.06, 0.95]];
  pts.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, cx + x * r, cy + y * r));
  [...pts].reverse().forEach(([x, y]) => ctx.lineTo(cx - x * r, cy + y * r));
  ctx.closePath();
  ctx.fill();
};

export const AUTUMN_CARGO = {
  // GOOD: a pumpkin pie cooling on a wooden stand: a fluted crust, an orange filling, a swirl of cream, a leaf of pastry, steam
  pie: () => {
    const g = new THREE.Group(), all = sub(g);
    const wood = lambert(0x9a6a38), crust = lambert(0xd9a14a), filling = lambert(0xd9731c), cream = lambert(0xfdf6e3), tin = lambert(0xc4c8cc);
    put(all, cyl(0.24, 0.3, 0.05, 16), wood, 0, 0.025, 0);                               // the stand: a foot...
    put(all, cyl(0.05, 0.07, 0.3, 10), wood, 0, 0.2, 0);                                  // ...a stem...
    put(all, cyl(0.42, 0.4, 0.04, 20), wood, 0, 0.37, 0);                                 // ...a plate
    put(all, cyl(0.36, 0.3, 0.14, 24), tin, 0, 0.46, 0);                                  // the tin
    put(all, new THREE.TorusGeometry(0.34, 0.045, 7, 24), crust, 0, 0.545, 0, FLAT);      // the crust
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; put(all, sphere(0.034, 6, 4), crust, Math.cos(a) * 0.37, 0.55, Math.sin(a) * 0.37); } // (fluted)
    put(all, cyl(0.32, 0.32, 0.03, 24), filling, 0, 0.53, 0);
    for (const [x, z] of [[-0.12, 0.1], [0.1, -0.12], [0.13, 0.12]]) { // pastry leaves on the filling
      put(all, sphere(0.06, 6, 4), crust, x, 0.555, z).scale.set(1.4, 0.3, 0.8);
    }
    const dollop = sub(all, 0, 0.55, 0);
    [[0.0, 0], [0.09, 0.07], [0.15, 0.13], [0.2, 0.2]].forEach(([r, h], k) => put(dollop, sphere(0.11 - k * 0.02, 8, 6), cream, Math.cos(k * 1.5) * r * 0.4, h * 0.6, Math.sin(k * 1.5) * r * 0.4));
    put(all, cyl(0.012, 0.012, 0.1, 5), lambert(0x4f6a22), 0, 0.89, 0).rotation.z = 0.3;       // a sprig of mint
    put(all, sphere(0.05, 6, 4), lambert(0x4f8a2a), 0.02, 0.94, 0).scale.set(1.6, 0.5, 1);
    const steam = [0, 1, 2, 3, 4].map(() => put(all, sphere(0.06, 7, 5), haze(0xffffff, 0.4)));
    return idle(g, (t) => {
      all.rotation.y = Math.sin(t * 0.5) * 0.12;
      cycle(steam, t, 0.35, (s, u, k) => {
        s.position.set(Math.sin(t * 1.3 + k * 2) * 0.1 * (0.3 + u) + (k % 2 ? 0.1 : -0.1), 0.62 + u * 0.55, Math.cos(t + k * 1.7) * 0.08);
        s.scale.setScalar(0.5 + u * 1.2);
        s.material.opacity = 0.4 * Math.sin(Math.PI * u);
      });
    });
  },
  // EVIL: a tin of maple syrup that is not the carrier's. Calm: sealed, a stolen tag on its handle, a sticky ring. Agitated: it
  // sweats, drips run down its sides and a puddle spreads, the tin hums. Furious: the cap blows, syrup pours from the spout and
  // over the sides, strands drip off the handle, the whole tin shakes
  syrup: () => {
    const g = new THREE.Group(), all = sub(g);
    const W = 0.46, H = 0.62, D = 0.28;
    const tin = lambert(0xc23b1c), trim = lambert(0xe6b34a), amber = glow(0xe08a14);
    const front = label((ctx, w, h) => {
      ctx.fillStyle = '#f3d8a0'; ctx.fillRect(10, 24, w - 20, h - 48);
      mapleLeaf(ctx, w / 2, h * 0.42, 34, '#c23b1c');
      ctx.fillStyle = '#7a2a10'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PURE MAPLE', w / 2, h * 0.8);
    }, 0xc23b1c);
    put(all, box(W, H, D), tin, 0, H / 2 + 0.03, 0);
    put(all, box(W + 0.02, 0.05, D + 0.02), trim, 0, 0.055, 0);                           // the base...
    put(all, box(W + 0.02, 0.05, D + 0.02), trim, 0, H + 0.005, 0);                       // ...and the shoulder
    for (const s of [-1, 1]) { const f = put(all, new THREE.PlaneGeometry(0.36, 0.36), front, 0, 0.33, s * (D / 2 + 0.003)); f.rotation.y = s < 0 ? Math.PI : 0; }
    const cap = sub(all, 0.13, H + 0.03, 0);                                             // the spout and its cap
    put(cap, cyl(0.045, 0.05, 0.1, 10), trim, 0, 0.05, 0);
    const lid = sub(cap, 0, 0.1, 0);
    put(lid, cyl(0.055, 0.055, 0.04, 10), lambert(0x2f3a8a), 0, 0.02, 0);
    const handle = sub(all, -0.1, H + 0.03, 0);
    put(handle, new THREE.TorusGeometry(0.1, 0.02, 6, 12, Math.PI), lambert(0x4a4a50), 0, 0.01, 0);
    const tag = sub(handle, 0.04, 0.03, 0.02);                                          // a paper tag on a string: STOLEN
    put(tag, box(0.1, 0.07, 0.006), label((ctx, w, h) => { ctx.fillStyle = '#d81e1e'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STOLEN', w / 2, h / 2); }, 0xfbf7ea, 128, 64), 0, -0.04, 0);
    const puddle = put(all, new THREE.CircleGeometry(0.3, 18), glow(0xe08a14, { transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 0, 0.012, 0);
    puddle.rotation.x = -FLAT;
    const drips = [-0.17, 0.0, 0.14].map(x => put(all, box(0.04, 1, 0.012), amber, x, H, D / 2 + 0.012));
    const back = [-0.12, 0.1].map(x => put(all, box(0.04, 1, 0.012), amber, x, H, -D / 2 - 0.012));
    const stream = put(all, cyl(0.03, 0.045, 1, 8), amber, 0.13, H, 0);
    const blobs = [0, 1, 2, 3].map(() => put(all, sphere(0.04, 6, 5), amber));
    return stated(g, (t, up, rage) => {
      const calm = 1 - Math.min(1, up + rage), out = clamp01(up + rage);
      all.position.set(rage * jitter(t, 2) * 0.02, rage * Math.abs(Math.sin(t * 9)) * 0.03, 0);
      all.rotation.z = out * Math.sin(t * 5) * 0.015 + rage * Math.sin(t * 11) * 0.06;
      lid.position.set(rage * (0.1 + Math.sin(t * 2.6) * 0.04), 0.1 + rage * (0.25 + Math.abs(Math.sin(t * 3.4)) * 0.3), 0);
      lid.rotation.set(rage * t * 6, 0, rage * 0.6);
      puddle.scale.setScalar(Math.max(0.001, 0.55 + up * 0.5 + rage * 1.0));
      drips.forEach((d, k) => { const len = (up * (0.14 + k * 0.05) + rage * (0.3 + k * 0.07)) * (0.6 + 0.4 * Math.sin(t * 1.4 + k)); d.scale.y = Math.max(0.001, len); d.position.y = H - len / 2; });
      back.forEach((d, k) => { const len = rage * (0.25 + k * 0.1); d.scale.y = Math.max(0.001, len); d.position.y = H - len / 2; });
      const flow = rage * (0.6 + 0.4 * Math.abs(Math.sin(t * 4))); // the stream from the spout, arcing down to the side
      stream.scale.set(1, Math.max(0.001, flow * 0.45), 1);
      stream.position.set(0.13 + flow * 0.05, H + 0.05 + flow * 0.12, 0);
      stream.rotation.z = -0.5;
      cycle(blobs, t, 1.8, (b, u, k) => { show(b, rage); b.position.set(0.16 + u * 0.28, H + 0.2 - u * u * (H + 0.18) - 0.0, (k - 1.5) * 0.04); });
      tag.rotation.z = Math.sin(t * (1.5 + rage * 6)) * (0.2 + rage * 0.3);
      puddle.material.opacity = 0.55 + out * 0.4 + calm * 0.0;
    });
  },
};
