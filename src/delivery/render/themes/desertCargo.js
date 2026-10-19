// ---- the desert level's cargo (Dakar Dash): a Good item and an Evil one, as cargoModels.js's: each a group standing on y = 0,
// facing +z, about a metre tall when calm, with userData.animate(t), and the Evil one userData.setState(0 | 1 | 2). Plain three.js:
// nothing here touches the game. cargoModels.js spreads DESERT_CARGO_MODELS into CARGO_MODELS; the ids are cargo.js's.
//   waterjugs  a crate of water jugs: blue jugs in a slatted crate, the water in them slopping about
//   scarabs    a crate of scarab beetles (Evil): calm a nailed-down lid with one feeler through the slats; agitated the lid
//              rattling and beetles crawling over the rim; furious the lid off and a swarm of them in the air
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mix = (a, b, k) => a + (b - a) * k;
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
// a slatted wooden crate, w wide, h tall, d deep, standing on y = 0, open at the top
const slatted = (parent, w, h, d) => {
  const g = sub(parent), wood = lambert(0xb07e45), dark = lambert(0x7a5430);
  part(g, box(w, 0.04, d), dark, 0, 0.02, 0);
  const rows = 3, slat = h / rows;
  for (let r = 0; r < rows; r++) {
    const y = slat * (r + 0.5);
    for (const z of [-1, 1]) part(g, box(w, slat * 0.82, 0.03), wood, 0, y, z * d / 2);
    for (const x of [-1, 1]) part(g, box(0.03, slat * 0.82, d), wood, x * w / 2, y, 0);
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) part(g, box(0.05, h, 0.05), dark, x * w / 2, h / 2, z * d / 2);
  return g;
};

// ---- a crate of water jugs: four blue jugs standing in a slatted crate, a white cap and a handle each, the water in them
// slopping (a lighter slab at the top of each rocking about), a bright drop hanging over the crate
const makeWaterJugs = () => {
  const group = new THREE.Group(), body = sub(group);
  slatted(body, 0.76, 0.34, 0.6);
  const jugs = [];
  [[-0.19, -0.15], [0.19, -0.15], [-0.19, 0.15], [0.19, 0.15]].forEach(([x, z], k) => {
    const jug = sub(body, x, 0.04, z);
    part(jug, cyl(0.15, 0.16, 0.5, 14), lambert(0x2f86d8, { transparent: true, opacity: 0.88 }), 0, 0.25, 0);
    part(jug, cyl(0.075, 0.12, 0.1, 12), lambert(0x2f86d8, { transparent: true, opacity: 0.88 }), 0, 0.55, 0);
    part(jug, cyl(0.085, 0.085, 0.06, 10), lambert(0xf4f1e6), 0, 0.63, 0);
    const water = part(jug, cyl(0.14, 0.14, 0.04, 14), glow(0xbfe4ff), 0, 0.4, 0);
    part(jug, new THREE.TorusGeometry(0.06, 0.012, 5, 10, Math.PI), lambert(0x1c5aa0), 0.0, 0.62, 0.0, 0, Math.PI / 2, 0);
    jugs.push([jug, water, k]);
  });
  const drop = part(group, new THREE.ConeGeometry(0.1, 0.26, 10), glow(0x7fd0ff), 0, 1.0, 0);
  const bead = part(group, sphere(0.1, 10, 8), glow(0x7fd0ff), 0, 0.9, 0);
  return idle(group, (t) => {
    for (const [jug, water, k] of jugs) {
      jug.rotation.z = Math.sin(t * 2.2 + k * 1.7) * 0.03;
      water.rotation.z = Math.sin(t * 3.1 + k) * 0.22;
      water.position.y = 0.4 + Math.sin(t * 2.6 + k * 2) * 0.012;
    }
    drop.position.y = 1.0 + Math.sin(t * 2.2) * 0.04;
    bead.position.y = 0.88 + Math.sin(t * 2.2) * 0.04;
    body.rotation.z = Math.sin(t * 1.3) * 0.018;
  });
};

// ---- a crate of scarabs (Evil)
const makeScarabs = () => {
  const group = new THREE.Group(), all = sub(group);
  slatted(all, 0.7, 0.4, 0.5).name = 'crate'; // (the names: cargoRules.js)
  // the lid: boards across the top, nailed down (a plank each way), and one beetle sitting on it
  const lid = sub(all, 0, 0.42, 0);
  for (const z of [-0.17, 0, 0.17]) part(lid, box(0.74, 0.04, 0.15), lambert(0xc08a50), 0, 0, z);
  for (const x of [-0.28, 0.28]) part(lid, box(0.08, 0.05, 0.54), lambert(0x7a5430), x, 0.02, 0);
  const SHELL = lambert(0x16a085), SHELL2 = lambert(0x1c3f8f), LEG = lambert(0x15171a), GOLD = lambert(0xe6b63c);
  const bodyG = sphere(0.06, 8, 6), headG = sphere(0.035, 6, 5), wingG = box(0.07, 0.008, 0.11), legG = box(0.012, 0.012, 0.07);
  const beetle = (parent, shell) => {
    const b = sub(parent);
    part(b, bodyG, shell).scale.set(1, 0.6, 1.4);
    part(b, headG, LEG, 0, 0, 0.09);
    part(b, new THREE.ConeGeometry(0.014, 0.05, 4), GOLD, 0, 0.02, 0.14, Math.PI / 2);   // the horn
    const wings = [-1, 1].map(d => part(b, wingG, GOLD, d * 0.045, 0.04, -0.01));
    for (const d of [-1, 1]) for (const z of [-0.04, 0.02, 0.07]) part(b, legG, LEG, d * 0.065, -0.02, z, 0, d * 0.5, 0);
    b.userData.wings = wings;
    return b;
  };
  const sitter = beetle(lid, SHELL);
  sitter.position.set(-0.1, 0.07, -0.04);
  const feeler = part(all, cyl(0.007, 0.007, 0.22, 4), LEG, 0.2, 0.52, 0.255);              // a feeler out between the slats
  // the crawlers at the rim (agitated) and the swarm (furious)
  const crawlers = [0, 1, 2, 3].map(k => { const b = beetle(all, k % 2 ? SHELL2 : SHELL); b.visible = false; b.name = 'crawler' + k; return b; });
  const swarm = Array.from({ length: 12 }, (_, k) => { const b = beetle(group, k % 3 ? SHELL : SHELL2); b.visible = false; b.scale.setScalar(1.15); return b; });
  return stated(group, (t, up, rage) => {
    all.position.set(rage * jitter(t, 1) * 0.03, rage * Math.abs(Math.sin(t * 9)) * 0.04, 0);
    all.rotation.z = up * Math.sin(t * 13) * 0.03 + rage * Math.sin(t * 11) * 0.06;
    // the lid: rattling, then lifted and knocked off
    lid.position.set(rage * 0.52, 0.42 + up * Math.abs(Math.sin(t * 9)) * 0.045 + rage * (0.34 + Math.abs(Math.sin(t * 4)) * 0.08), rage * 0.12);
    lid.rotation.set(rage * 0.35, 0, rage * (0.9 + Math.sin(t * 3) * 0.15) + up * Math.sin(t * 15) * 0.02);
    sitter.visible = rage < 0.6;
    sitter.position.x = -0.1 + up * Math.sin(t * 2) * 0.06;
    feeler.rotation.z = Math.sin(t * 5) * (0.25 + up * 0.5);
    feeler.visible = rage < 0.5;
    crawlers.forEach((b, k) => {
      const show = clamp01(up * 1.4 - k * 0.2) * (1 - clamp01(rage * 2));
      b.visible = show > 0.05;
      const side = k < 2 ? -1 : 1, u = (t * 0.35 + k * 0.27) % 1;
      b.scale.setScalar(Math.max(0.01, show));
      // (crawling head down the outside of a side, its belly 4 mm off the slats and clear of the posts: it once stood level
      // through the wall, and its wings met the slats' faces as it grew)
      b.position.set(side * 0.405, 0.4 - u * 0.15, (k % 2 ? 0.08 : -0.08) + Math.sin(t * 6 + k) * 0.03);
      b.rotation.set(Math.PI / 2, side * Math.PI / 2, 0, 'YXZ');
    });
    swarm.forEach((b, k) => {
      b.visible = rage > 0.05;
      const a = t * (1.6 + (k % 4) * 0.35) + k * 0.9, r = mix(0.25, 0.5 + (k % 3) * 0.14, rage), y = 0.5 + rage * (0.25 + (k % 5) * 0.13) + Math.sin(t * 3 + k) * 0.05;
      b.scale.setScalar(Math.max(0.01, rage * 1.15));
      b.position.set(Math.sin(a) * r, y, Math.cos(a) * r * 0.8);
      b.rotation.set(0.3, a + Math.PI / 2, Math.sin(t * 2 + k) * 0.3);
      for (const [i, wing] of b.userData.wings.entries()) wing.rotation.z = (i ? -1 : 1) * (0.3 + Math.abs(Math.sin(t * 40 + k)) * 0.9) * rage;
    });
  });
};

export const DESERT_CARGO_MODELS = { waterjugs: makeWaterJugs, scarabs: makeScarabs };
