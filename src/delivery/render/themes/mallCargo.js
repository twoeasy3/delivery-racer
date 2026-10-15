// ---- the mall level's cargo (Mall Dash): a Good item and an Evil one, as cargoModels.js's: each a group standing on y = 0,
// facing +z, about a metre tall when calm, with userData.animate(t), and the Evil one userData.setState(0 | 1 | 2). Plain
// three.js: nothing here touches the game. cargoModels.js spreads MALL_CARGO_MODELS into CARGO_MODELS; the ids are cargo.js's.
//   bubbletea    a tray of bubble teas: four tall cups in a cardboard carrier, each a different tea, a fat straw in each, the
//                pearls at the bottom bobbing, the tea sloshing as the tray tilts
//   hamsterball  a pet-shop hamster in its exercise ball (Evil): calm it sits nibbling a seed, the ball still; agitated it runs
//                and the ball spins on the spot, rocking; furious the ball bounces, the hatch flies off and it hangs half out
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const part = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
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

// ---- a tray of bubble teas: a cardboard carrier with four cup holes, four tall clear cups (milk tea, strawberry, matcha,
// taro), a domed lid and a fat striped straw in each, black pearls at the bottom bobbing, the tea's top sloshing
const makeBubbleTea = () => {
  const group = new THREE.Group(), body = sub(group);
  const card = lambert(0xc8a070), dark = lambert(0x9a7448);
  part(body, box(0.84, 0.05, 0.84), card, 0, 0.1, 0);                                       // the carrier
  for (const x of [-1, 1]) part(body, box(0.05, 0.14, 0.84), dark, x * 0.4, 0.17, 0);
  for (const z of [-1, 1]) part(body, box(0.84, 0.14, 0.05), dark, 0, 0.17, z * 0.4);
  part(body, box(0.05, 0.14, 0.84), dark, 0, 0.17, 0);
  part(body, box(0.84, 0.14, 0.05), dark, 0, 0.17, 0);
  part(body, box(0.06, 0.5, 0.06), dark, 0, 0.45, 0);                                       // the carrier's handle
  part(body, box(0.3, 0.06, 0.06), dark, 0, 0.72, 0);
  const TEAS = [0xc89a5e, 0xf08aa8, 0x8dc26a, 0xb48ad8], cups = [];
  [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([x, z], k) => {
    const cup = sub(body, x, 0.12, z);
    part(cup, cyl(0.15, 0.12, 0.56, 14), lambert(0xe8f4ff, { transparent: true, opacity: 0.35 }), 0, 0.28, 0);   // the clear cup
    const tea = part(cup, cyl(0.135, 0.115, 0.42, 14), lambert(TEAS[k], { transparent: true, opacity: 0.9 }), 0, 0.23, 0);
    const top = part(cup, cyl(0.137, 0.137, 0.03, 14), glow(TEAS[k]), 0, 0.45, 0);
    part(cup, sphere(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0xf4f1e6, { transparent: true, opacity: 0.8 }), 0, 0.56, 0); // the domed lid
    const straw = part(cup, cyl(0.022, 0.022, 0.5, 8), lambert(k % 2 ? 0xd8262b : 0x2f86d8), 0, 0.72, 0.02, 0.12, 0, 0.1 * (k % 2 ? -1 : 1));
    const pearls = [];
    for (let i = 0; i < 6; i++) { const a = i * 1.05; pearls.push(part(cup, sphere(0.028, 7, 5), lambert(0x1a1214), Math.cos(a) * 0.07, 0.06 + (i % 3) * 0.03, Math.sin(a) * 0.07)); }
    cups.push({ cup, tea, top, straw, pearls, k });
  });
  return idle(group, (t) => {
    body.rotation.z = Math.sin(t * 1.4) * 0.05;
    body.rotation.x = Math.sin(t * 1.1 + 1) * 0.04;
    for (const { tea, top, straw, pearls, k } of cups) {
      tea.rotation.z = Math.sin(t * 2.8 + k) * 0.08;
      top.rotation.z = Math.sin(t * 2.8 + k) * 0.18;
      top.position.y = 0.45 + Math.sin(t * 3.4 + k * 2) * 0.012;
      straw.rotation.x = 0.12 + Math.sin(t * 1.9 + k) * 0.05;
      pearls.forEach((p, i) => { p.position.y = 0.06 + (i % 3) * 0.03 + Math.abs(Math.sin(t * 2.2 + i * 1.3 + k)) * 0.05; });
    }
  });
};

// ---- a pet-shop hamster ball (Evil): a clear ball on a cardboard ring, a golden hamster inside with a seed in its paws, a
// round hatch on top. Calm: still, nibbling. Agitated: it runs, the ball spins on the spot and rocks. Furious: the ball bounces
// and spins fast, the hatch pops off and tumbles above it, the hamster hangs half out of the hole
const makeHamsterBall = () => {
  const group = new THREE.Group(), all = sub(group);
  part(all, cyl(0.36, 0.4, 0.08, 16), lambert(0xc8a070), 0, 0.04, 0);                       // the cardboard ring it sits on
  const ball = sub(all, 0, 0.5, 0);
  const shell = part(ball, sphere(0.42, 18, 12), lambert(0xd8f0ff, { transparent: true, opacity: 0.28 }));
  // (the ball's lines: three rings, so the spin shows)
  for (const r of [0, 1, 2]) part(ball, new THREE.TorusGeometry(0.42, 0.012, 5, 28), lambert(0x7fb8d8), 0, 0, 0, r === 0 ? Math.PI / 2 : 0, r === 2 ? Math.PI / 2 : 0, 0);
  const hatch = part(ball, cyl(0.12, 0.12, 0.03, 14), lambert(0xf2c21d), 0, 0.42, 0);
  const vents = [0, 1, 2, 3].map(k => part(ball, cyl(0.025, 0.025, 0.02, 6), lambert(0x1a1b1e), Math.cos(k * 1.57) * 0.2, 0.37, Math.sin(k * 1.57) * 0.2));
  // the hamster: a golden egg of a body, a paler belly, two round ears, black bead eyes, a pink nose, little paws, a stub tail
  const ham = sub(ball, 0, -0.2, 0);
  const fur = lambert(0xe0a048), pale = lambert(0xf4e2c0), bead = lambert(0x111111);
  const bodyM = part(ham, sphere(0.2, 14, 10), fur, 0, 0.14, 0);
  bodyM.scale.set(1, 0.85, 1.2);
  part(ham, sphere(0.15, 12, 8), pale, 0, 0.09, 0.06).scale.set(0.9, 0.7, 1);
  const head = sub(ham, 0, 0.26, 0.17);
  part(head, sphere(0.13, 12, 9), fur);
  for (const x of [-1, 1]) part(head, sphere(0.045, 8, 6), fur, x * 0.09, 0.1, -0.02);
  for (const x of [-1, 1]) part(head, sphere(0.03, 8, 6), lambert(0xf0b0b0), x * 0.09, 0.1, -0.01);
  for (const x of [-1, 1]) part(head, sphere(0.022, 6, 5), bead, x * 0.055, 0.03, 0.11);
  part(head, sphere(0.025, 6, 5), lambert(0xf08aa8), 0, -0.02, 0.13);
  const seed = part(head, sphere(0.03, 6, 5), lambert(0x6b4a2a), 0, -0.07, 0.12);
  seed.scale.set(0.7, 1, 1.4);
  const paws = [-1, 1].map(x => part(ham, sphere(0.035, 6, 5), pale, x * 0.07, 0.12, 0.2));
  const feet = [-1, 1].map(x => part(ham, sphere(0.045, 6, 5), pale, x * 0.09, 0.0, 0.05));
  part(ham, sphere(0.03, 6, 5), pale, 0, 0.1, -0.22);                                       // the tail
  return stated(group, (t, up, rage) => {
    // the ball: still, then spinning on the spot and rocking, then bouncing and spinning fast
    const spin = up * 2.2 + rage * 9;
    ball.rotation.x += spin * 0.016;
    ball.rotation.z = up * Math.sin(t * 7) * 0.12 + rage * Math.sin(t * 11) * 0.25;
    ball.position.y = 0.5 + rage * Math.abs(Math.sin(t * 6)) * 0.35;
    all.position.x = rage * jitter(t, 2) * 0.04;
    shell.material.opacity = 0.28 + rage * 0.1;
    // the hamster keeps its feet down whatever the ball does (it runs inside it)
    ham.rotation.x = -ball.rotation.x;
    ham.rotation.z = -ball.rotation.z;
    const run = up + rage;
    ham.position.y = -0.2 + rage * 0.42;                                                   // (furious: up to the hatch, half out)
    ham.rotation.y = Math.sin(t * 2) * 0.3 * (1 - run) + rage * Math.sin(t * 9) * 0.3;
    head.rotation.x = -0.2 + Math.sin(t * 9) * 0.06 * (1 - run) + run * Math.sin(t * 14) * 0.15; // nibbling, then looking about
    head.rotation.y = Math.sin(t * 1.3) * 0.25 * (1 - run);
    seed.visible = rage < 0.5;
    paws.forEach((p, i) => { p.position.y = 0.12 + run * Math.abs(Math.sin(t * 16 + i * Math.PI)) * 0.06; p.position.z = 0.2 + run * Math.sin(t * 16 + i * Math.PI) * 0.05; });
    feet.forEach((f, i) => { f.position.z = 0.05 + run * Math.sin(t * 16 + i * Math.PI) * 0.08; });
    // the hatch: on, rattling, then off and tumbling above the ball
    hatch.position.set(rage * 0.3, 0.42 + up * Math.abs(Math.sin(t * 13)) * 0.03 + rage * (0.5 + Math.abs(Math.sin(t * 5)) * 0.2), rage * 0.1);
    hatch.rotation.set(rage * t * 6, 0, rage * (0.6 + Math.sin(t * 3) * 0.2));
    for (const [k, v] of vents.entries()) v.scale.setScalar(1 + rage * (1 + Math.sin(t * 8 + k)) * 0.3);
  });
};

export const MALL_CARGO_MODELS = { bubbletea: makeBubbleTea, hamsterball: makeHamsterBall };
