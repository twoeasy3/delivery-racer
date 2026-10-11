// ---- the cargo's models: what the player is delivering ------------------------------------------
// Shared by the game (render/cargo.js: the corner of the HUD and the delivery at the kerb) and the
// cargo page (cargopage.js). Plain three.js: nothing here touches the game, so a page of its own can
// show them. The ids are those of cargo.js (the logic's table: which level carries what).
//   CARGO_MODELS[id]()  a group standing on y = 0, facing +z, about a metre tall, with
//     userData.animate(t)   (seconds) poses it for that moment: call it every frame it is shown
//     userData.setState(n)  an Evil item only: 0 calm, 1 agitated, 2 furious. It eases from one to
//                           the next over TRANSITION s as animate goes on (setState(n, true) snaps)
//     userData.state        the state last asked for
// A Good item only idles. An Evil one is built to be told apart at thumbnail size in each state: its
// outline changes (the porcupine balls up, the lid comes off the jar, the doll leaves the ground).
import * as THREE from 'three';
import { GOOD2_MODELS } from './cargoModelsGood2.js';
import { EVIL2_MODELS } from './cargoModelsEvil2.js';
import { MORE_MODELS } from './cargoModels3.js';
import { PRANK_B_MODELS } from './cargoModelsPrankB.js';
import { PRANK_C_MODELS } from './cargoModelsPrankC.js';

export const TRANSITION = 0.5; // s an Evil item takes from one state to the next

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// a part of a model: a mesh at (x, y, z), optionally turned (rx, ry, rz)
const part = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
// a material's colour, somewhere between two
const shade = new THREE.Color();
const tint = (material, from, to, k) => material.color.setHex(from).lerp(shade.setHex(to), clamp01(k));
// a shake that never repeats in step: -1 .. 1
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
// a Good item: it only idles
const idle = (group, pose) => {
  group.userData.animate = pose;
  pose(0);
  return group;
};
// an Evil item: pose(t, agitated, furious, dt), the two weights 0 .. 1 easing as its state changes
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

// ============================================================================
// GOOD: five things worth getting there in one piece
// ============================================================================

// a wedding cake: three tiers on a silver board, piped in pink, the couple on top. It wobbles
const makeCake = () => {
  const group = new THREE.Group();
  const icing = lambert(0xfffaf0), pink = lambert(0xff8fb1), red = lambert(0xe0304a);
  part(group, cyl(0.54, 0.54, 0.04, 20), lambert(0xc9cfd6), 0, 0.02, 0);
  const tiers = [];
  let parent = group, y = 0.04;
  for (const [r, h] of [[0.45, 0.3], [0.33, 0.26], [0.22, 0.22]]) {
    const tier = sub(parent, 0, y, 0);
    part(tier, cyl(r, r, h, 20), icing, 0, h / 2, 0);
    part(tier, new THREE.TorusGeometry(r, 0.035, 6, 20), pink, 0, h, 0, Math.PI / 2);
    part(tier, new THREE.TorusGeometry(r, 0.03, 6, 20), pink, 0, 0.03, 0, Math.PI / 2);
    const n = Math.round(r * 22);
    for (let k = 0; k < n; k++) { // (a ring of sugar roses round its side)
      const a = k / n * Math.PI * 2;
      part(tier, sphere(0.035, 6, 5), k % 2 ? red : pink, Math.sin(a) * r, h * 0.55, Math.cos(a) * r);
    }
    tiers.push(tier);
    parent = tier;
    y = h;
  }
  const couple = sub(tiers[2], 0, 0.22, 0);
  part(couple, new THREE.CapsuleGeometry(0.035, 0.1, 4, 8), lambert(0x22252b), -0.06, 0.09, 0); // the groom
  part(couple, sphere(0.035, 8, 6), lambert(0xf1c9a5), -0.06, 0.2, 0);
  part(couple, new THREE.ConeGeometry(0.07, 0.16, 10), icing, 0.06, 0.08, 0);                  // the bride
  part(couple, sphere(0.035, 8, 6), lambert(0xf1c9a5), 0.06, 0.2, 0);
  const heart = part(couple, sphere(0.04, 8, 6), red, 0, 0.32, 0);
  return idle(group, (t) => {
    tiers[1].rotation.z = Math.sin(t * 2.2) * 0.035;
    tiers[2].rotation.z = Math.sin(t * 2.2 - 0.7) * 0.06;
    tiers[1].rotation.x = Math.cos(t * 1.7) * 0.02;
    couple.rotation.z = Math.sin(t * 2.2 - 1.4) * 0.1;
    heart.position.y = 0.32 + Math.abs(Math.sin(t * 3)) * 0.05;
    heart.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
  });
};

// a goldfish in its bowl, going round and round, the water slopping a little
const makeGoldfish = () => {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhongMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.25, shininess: 120, depthWrite: false });
  const water = new THREE.MeshLambertMaterial({ color: 0x3fa9f5, transparent: true, opacity: 0.5, depthWrite: false });
  part(group, cyl(0.2, 0.26, 0.05, 16), lambert(0x2b3a4d), 0, 0.025, 0); // its stand
  const gravel = part(group, sphere(0.3, 14, 8), lambert(0xe2c58f), 0, 0.17, 0);
  gravel.scale.set(1, 0.3, 1);
  for (const [x, z, h] of [[-0.16, 0.05, 0.3], [-0.1, -0.1, 0.22], [0.17, -0.08, 0.26]]) part(group, new THREE.ConeGeometry(0.03, h, 5), lambert(0x2f9e4f), x, 0.2 + h / 2, z).userData.weed = x;
  const pool = sub(group, 0, 0.5, 0);
  const sea = part(pool, new THREE.SphereGeometry(0.42, 20, 12, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.68), water);
  sea.renderOrder = 1;
  const top = part(pool, new THREE.CircleGeometry(0.356, 20), water, 0, 0.222, 0, -Math.PI / 2);
  top.renderOrder = 1;
  const bowl = part(group, sphere(0.45, 20, 14), glass, 0, 0.5, 0);
  bowl.renderOrder = 2;
  part(group, new THREE.TorusGeometry(0.25, 0.03, 6, 20), lambert(0xe8f4ff), 0, 0.9, 0, Math.PI / 2);
  const fish = sub(group);
  const orange = lambert(0xff7a1a);
  const body = part(fish, sphere(0.1, 12, 8), orange);
  body.scale.set(0.6, 0.8, 1.4);
  const tail = sub(fish, 0, 0, -0.13);
  part(tail, new THREE.ConeGeometry(0.09, 0.14, 4), lambert(0xffa23a), 0, 0, -0.06, Math.PI / 2).scale.x = 0.25;
  part(fish, new THREE.ConeGeometry(0.04, 0.09, 4), lambert(0xffa23a), 0, 0.09, -0.02).scale.x = 0.25;
  for (const x of [-0.05, 0.05]) {
    part(fish, sphere(0.024, 6, 5), glow(0xffffff), x, 0.025, 0.09);
    part(fish, sphere(0.012, 6, 5), glow(0x111111), x * 1.25, 0.025, 0.105);
  }
  const bubbles = [0, 1, 2].map(k => part(group, sphere(0.02, 6, 5), glow(0xffffff, { transparent: true, opacity: 0.7 }), -0.1 + k * 0.09, 0.3, 0.05 - k * 0.06));
  return idle(group, (t) => {
    const a = t * 1.5;
    fish.position.set(Math.sin(a) * 0.2, 0.46 + Math.sin(t * 2.3) * 0.06, Math.cos(a) * 0.2);
    fish.rotation.y = a + Math.PI / 2;
    tail.rotation.y = Math.sin(t * 11) * 0.6;
    pool.rotation.z = Math.sin(t * 1.9) * 0.05;
    pool.rotation.x = Math.cos(t * 1.4) * 0.04;
    bubbles.forEach((b, k) => { const u = (t * 0.45 + k * 0.37) % 1; b.position.y = 0.26 + u * 0.44; b.scale.setScalar(0.6 + u); });
    for (const w of group.children) if (w.userData.weed) w.rotation.z = Math.sin(t * 1.6 + w.userData.weed * 9) * 0.2;
  });
};

// a cactus in a terracotta pot, a ribbon and a bow round the pot, a flower on its head
const makeCactus = () => {
  const group = new THREE.Group();
  const clay = lambert(0xc0623a), green = lambert(0x3f9b4b), ribbon = lambert(0xe0203a);
  part(group, cyl(0.3, 0.22, 0.32, 16), clay, 0, 0.16, 0);
  part(group, cyl(0.335, 0.335, 0.08, 16), clay, 0, 0.33, 0);
  part(group, cyl(0.3, 0.3, 0.02, 16), lambert(0x4a3525), 0, 0.375, 0);
  part(group, cyl(0.285, 0.265, 0.07, 16), ribbon, 0, 0.2, 0);
  const bow = sub(group, 0, 0.2, 0.28);
  const loops = [-1, 1].map(d => part(bow, new THREE.ConeGeometry(0.09, 0.2, 4), ribbon, d * 0.11, 0, 0, 0, 0, d * Math.PI / 2));
  for (const loop of loops) loop.scale.z = 0.45;
  part(bow, sphere(0.045, 8, 6), ribbon);
  for (const d of [-1, 1]) part(bow, box(0.05, 0.16, 0.02), ribbon, d * 0.05, -0.1, 0, 0, 0, d * 0.35);
  const plant = sub(group, 0, 0.38, 0);
  part(plant, new THREE.CapsuleGeometry(0.17, 0.42, 6, 12), green, 0, 0.36, 0);
  const arms = [[-1, 0.3, 0.2], [1, 0.42, 0.14]].map(([d, y, h]) => {
    const arm = sub(plant, d * 0.15, y, 0);
    part(arm, new THREE.CapsuleGeometry(0.07, 0.12, 4, 8), green, d * 0.1, 0, 0, 0, 0, Math.PI / 2);
    part(arm, new THREE.CapsuleGeometry(0.07, h, 4, 8), green, d * 0.2, h / 2 + 0.02, 0);
    return arm;
  });
  const pale = glow(0xf4f7d8);
  for (let k = 0; k < 18; k++) { // (its spines, as pale dots)
    const a = k * 2.4, y = 0.12 + (k % 6) * 0.1;
    part(plant, sphere(0.014, 5, 4), pale, Math.sin(a) * 0.172, y, Math.cos(a) * 0.172);
  }
  const flower = sub(plant, 0, 0.76, 0);
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2;
    part(flower, sphere(0.06, 8, 6), lambert(0xff5fa2), Math.sin(a) * 0.075, 0.01, Math.cos(a) * 0.075).scale.y = 0.45;
  }
  part(flower, sphere(0.045, 8, 6), lambert(0xffd23f), 0, 0.03, 0);
  return idle(group, (t) => {
    plant.rotation.z = Math.sin(t * 1.7) * 0.06;
    arms[0].rotation.z = Math.sin(t * 1.7 + 0.8) * 0.12;
    arms[1].rotation.z = Math.sin(t * 1.7 + 2.1) * 0.12;
    flower.rotation.y = t * 0.9;
    flower.scale.setScalar(1 + Math.sin(t * 3.1) * 0.08);
    loops.forEach((loop, k) => { loop.scale.y = 1 + Math.sin(t * 4 + k * Math.PI) * 0.1; });
  });
};

// a grandfather clock: the pendulum swinging in its window, the hands going round far too fast
const makeClock = () => {
  const group = new THREE.Group();
  const wood = lambert(0x7a4a26), dark = lambert(0x53301a), gold = lambert(0xe9b93a);
  const body = sub(group); // (it rocks a little on its feet with each swing)
  part(body, box(0.52, 0.14, 0.36), dark, 0, 0.07, 0);
  part(body, box(0.38, 0.72, 0.27), wood, 0, 0.5, 0);
  part(body, box(0.24, 0.56, 0.02), lambert(0x241710), 0, 0.5, 0.135);
  part(body, box(0.5, 0.42, 0.33), wood, 0, 1.07, 0);
  part(body, box(0.58, 0.06, 0.39), dark, 0, 1.31, 0);
  part(body, new THREE.ConeGeometry(0.3, 0.16, 4), dark, 0, 1.42, 0, 0, Math.PI / 4).scale.z = 0.6;
  for (const x of [-0.24, 0, 0.24]) part(body, sphere(0.035, 8, 6), gold, x, x ? 1.375 : 1.53, 0);
  part(body, new THREE.CircleGeometry(0.17, 24), lambert(0xfdf4dc), 0, 1.07, 0.168);
  part(body, new THREE.TorusGeometry(0.17, 0.018, 6, 24), gold, 0, 1.07, 0.168);
  const ink = glow(0x1c1a17);
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    part(body, box(0.012, k % 3 ? 0.025 : 0.045, 0.004), ink, Math.sin(a) * 0.135, 1.07 + Math.cos(a) * 0.135, 0.171, 0, 0, -a);
  }
  const hour = sub(body, 0, 1.07, 0.174), minute = sub(body, 0, 1.07, 0.178);
  part(hour, box(0.026, 0.085, 0.004), ink, 0, 0.04, 0);
  part(minute, box(0.016, 0.125, 0.004), ink, 0, 0.06, 0);
  part(body, sphere(0.014, 6, 5), gold, 0, 1.07, 0.182);
  const pendulum = sub(body, 0, 0.76, 0.15);
  part(pendulum, box(0.016, 0.4, 0.008), gold, 0, -0.2, 0);
  part(pendulum, cyl(0.06, 0.06, 0.016, 16), gold, 0, -0.42, 0, Math.PI / 2);
  return idle(group, (t) => {
    const swing = Math.sin(t * 3.2);
    pendulum.rotation.z = swing * 0.3;
    body.rotation.z = swing * 0.012;
    minute.rotation.z = -t * 1.1;
    hour.rotation.z = -t * 1.1 / 12 - 1;
  });
};

// a tower of pizza boxes, leaning, the top one's lid lifting on the steam
const makePizza = () => {
  const group = new THREE.Group();
  const card = lambert(0xf3e7cc), red = lambert(0xd8262b);
  const boxes = [];
  let parent = group;
  for (let k = 0; k < 6; k++) {
    const b = sub(parent, 0, k ? 0.1 : 0, 0);
    b.rotation.y = [0.1, -0.16, 0.22, -0.08, 0.14, -0.2][k];
    if (k < 5) part(b, box(0.64, 0.095, 0.64), card, 0, 0.05, 0);
    else part(b, box(0.64, 0.05, 0.64), card, 0, 0.025, 0);
    part(b, box(0.645, 0.03, 0.645), red, 0, 0.035, 0);
    boxes.push(b);
    parent = b;
  }
  const topBox = boxes[5];
  part(topBox, cyl(0.27, 0.27, 0.03, 18), lambert(0xf2c14e), 0, 0.065, 0);
  for (let k = 0; k < 6; k++) part(topBox, cyl(0.045, 0.045, 0.012, 8), red, Math.sin(k * 1.05) * 0.16, 0.085, Math.cos(k * 1.05) * 0.16);
  part(topBox, new THREE.TorusGeometry(0.27, 0.025, 5, 18), lambert(0xc98a3c), 0, 0.07, 0, Math.PI / 2);
  const lid = sub(topBox, 0, 0.06, -0.32);
  part(lid, box(0.64, 0.02, 0.64), card, 0, 0, 0.32);
  part(lid, cyl(0.17, 0.17, 0.006, 18), red, 0, 0.013, 0.32);
  const steam = [0, 1, 2].map(k => part(topBox, sphere(0.06, 7, 5), glow(0xffffff, { transparent: true, opacity: 0.5, depthWrite: false }), -0.12 + k * 0.12, 0.15, 0.05));
  return idle(group, (t) => {
    const lean = Math.sin(t * 1.4) * 0.03;
    boxes.forEach((b, k) => { if (k) { b.rotation.z = lean; b.position.x = lean * 0.4; } });
    lid.rotation.x = -(0.55 + Math.sin(t * 2.6) * 0.2);
    steam.forEach((s, k) => {
      const u = (t * 0.5 + k * 0.33) % 1;
      s.position.y = 0.12 + u * 0.4;
      s.position.x = -0.12 + k * 0.12 + Math.sin(t * 2 + k) * 0.03;
      s.scale.setScalar(0.5 + u);
      s.material.opacity = 0.5 * (1 - u);
    });
  });
};

// ============================================================================
// EVIL: five things nobody should be driving about with. Calm, agitated, furious
// ============================================================================

// a porcupine: sniffing about with its quills laid back / rolled up in a ball of spikes /
// rabid: reared up, twice the quills, red eyes, foaming, snapping from side to side
const makePorcupine = () => {
  const group = new THREE.Group();
  const fur = lambert(0x5b4636), face = lambert(0x8a6a4c), quillLight = lambert(0xf0e4c8), quillDark = lambert(0x3a2c22);
  const all = sub(group); // (everything: it hops and shakes)
  const torso = part(all, sphere(0.3, 16, 12), fur, 0, 0.3, 0);
  const head = sub(all, 0, 0.26, 0.36);
  part(head, sphere(0.15, 12, 10), face).scale.z = 1.2;
  part(head, new THREE.ConeGeometry(0.09, 0.16, 10), face, 0, -0.02, 0.19, Math.PI / 2);
  part(head, sphere(0.04, 8, 6), glow(0x15100c), 0, -0.02, 0.28);
  for (const x of [-0.1, 0.1]) part(head, sphere(0.045, 8, 6), fur, x, 0.12, -0.02);
  const eyeMat = glow(0x15100c);
  const eyes = [-0.075, 0.075].map(x => part(head, sphere(0.032, 8, 6), eyeMat, x, 0.06, 0.12));
  const jaw = sub(head, 0, -0.07, 0.12);
  part(jaw, box(0.1, 0.03, 0.14), lambert(0x7a1420), 0, 0, 0.04);
  for (const x of [-0.03, 0.03]) part(jaw, new THREE.ConeGeometry(0.014, 0.05, 4), glow(0xffffff), x, 0.035, 0.1);
  const foam = sub(head, 0, -0.08, 0.2);
  for (const [x, y, z, r] of [[-0.07, 0, 0, 0.04], [0.06, -0.01, 0.02, 0.045], [0, -0.04, 0.04, 0.05], [-0.03, -0.08, 0.02, 0.035], [0.04, -0.07, 0, 0.03]]) part(foam, sphere(r, 7, 5), glow(0xffffff), x, y, z);
  const feet = [[-0.17, 0.2], [0.17, 0.2], [-0.17, -0.2], [0.17, -0.2]].map(([x, z]) => part(all, sphere(0.07, 8, 6), face, x, 0.05, z));
  // the quills: each stands out from the body along `out`; calm, only those on its back show, laid back
  const up = new THREE.Vector3(0, 1, 0), aim = new THREE.Vector3(), back = new THREE.Vector3(0, 0.25, -1).normalize();
  const quills = [];
  const geometry = new THREE.ConeGeometry(0.022, 0.36, 4).translate(0, 0.18, 0);
  for (let k = 0; k < 84; k++) {
    const y = 1 - (k + 0.5) / 84 * 2, r = Math.sqrt(1 - y * y), a = k * 2.39996;
    const out = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const mesh = part(all, geometry, k % 3 ? quillLight : quillDark);
    quills.push({ mesh, out, onBack: out.y > -0.1 && out.z < 0.45, len: 0.75 + (k % 5) * 0.09 });
  }
  return stated(group, (t, ball, rage) => {
    const calm = clamp01(1 - ball - rage);
    // the body: a long oval / a ball / a bigger oval, reared up
    const sx = mix(mix(1, 1.12, ball), 1.15, rage), sy = mix(mix(0.82, 1.12, ball), 1, rage), sz = mix(mix(1.35, 1.12, ball), 1.4, rage);
    torso.scale.set(sx, sy, sz);
    const cy = mix(0.3, 0.36, ball);
    torso.position.y = cy;
    const tucked = clamp01(1 - ball * 1.4);
    head.scale.setScalar(tucked * (1 + rage * 0.25));
    head.position.set(0, mix(0.26, 0.34, rage), mix(0.36, 0.2, ball) + rage * (0.06 + Math.abs(Math.sin(t * 17)) * 0.05));
    head.rotation.x = calm * Math.sin(t * 4.2) * 0.12 - rage * 0.2;
    head.rotation.y = calm * Math.sin(t * 1.3) * 0.25;
    for (const f of feet) f.scale.setScalar(tucked);
    tint(eyeMat, 0x15100c, 0xff1a10, rage * 1.5);
    for (const e of eyes) e.scale.setScalar(1 + rage * 0.9);
    jaw.rotation.x = rage * (0.5 + Math.abs(Math.sin(t * 17)) * 0.4);
    jaw.scale.setScalar(Math.max(0.001, rage));
    foam.scale.setScalar(Math.max(0.001, rage * (1 + Math.sin(t * 9) * 0.12)));
    for (const q of quills) {
      const shown = q.onBack ? 1 : clamp01(ball + rage * 0.6);
      const bristle = clamp01(ball + rage);
      aim.copy(q.out).lerp(back, calm * 0.72).normalize();
      q.mesh.quaternion.setFromUnitVectors(up, aim);
      q.mesh.position.set(q.out.x * 0.27 * sx, cy + q.out.y * 0.27 * sy, q.out.z * 0.27 * sz);
      const len = q.len * shown * (mix(0.62, 1, bristle) + rage * (0.55 + jitter(t, q.len * 40) * 0.2));
      q.mesh.scale.set(shown ? 1 + rage * 0.3 : 0.001, Math.max(0.001, len), shown ? 1 + rage * 0.3 : 0.001);
    }
    // sniffing along / trembling, rocking / hopping mad
    all.position.set(ball * jitter(t, 1) * 0.012 + rage * jitter(t, 2) * 0.035, calm * Math.abs(Math.sin(t * 3.4)) * 0.012 + rage * Math.abs(Math.sin(t * 9)) * 0.13, rage * jitter(t, 3) * 0.03);
    all.rotation.set(-rage * 0.3, rage * Math.sin(t * 12) * 0.3, ball * Math.sin(t * 2.4) * 0.14);
  });
};

// a ticking parcel: brown paper and string, an alarm clock taped to the front, dynamite on top.
// Ticking / the fuse lit and the box throbbing / red hot, bulging, hopping, sparks flying
const makeParcel = () => {
  const group = new THREE.Group();
  const paper = lambert(0xc8955a), string = lambert(0x4a3a2a), stick = lambert(0xd8262b);
  const all = sub(group);
  const crate = sub(all, 0, 0, 0);
  part(crate, box(0.72, 0.5, 0.56), paper, 0, 0.25, 0);
  part(crate, box(0.735, 0.515, 0.05), string, 0, 0.25, 0);
  part(crate, box(0.05, 0.515, 0.575), string, 0, 0.25, 0);
  // the alarm clock on its front
  part(crate, cyl(0.16, 0.16, 0.04, 20), lambert(0xfdf4dc), 0.16, 0.26, 0.29, Math.PI / 2);
  part(crate, new THREE.TorusGeometry(0.16, 0.022, 6, 20), lambert(0x30343c), 0.16, 0.26, 0.3);
  const hand = sub(crate, 0.16, 0.26, 0.315);
  part(hand, box(0.018, 0.12, 0.006), glow(0x1c1a17), 0, 0.055, 0);
  const lampMat = glow(0x3a0d0d);
  const lamp = part(crate, sphere(0.045, 8, 6), lampMat, -0.2, 0.36, 0.285);
  // the dynamite, strapped on top, and its fuse
  const sticks = sub(all, 0, 0.5, 0);
  for (const [x, y] of [[-0.11, 0.06], [0, 0.06], [0.11, 0.06], [-0.055, 0.155], [0.055, 0.155]]) part(sticks, cyl(0.055, 0.055, 0.5, 10), stick, x, y, 0, Math.PI / 2);
  for (const z of [-0.14, 0.14]) part(sticks, box(0.36, 0.22, 0.04), lambert(0x22252b), 0, 0.1, z);
  const fuse = sub(sticks, 0.055, 0.2, 0.2);
  const cord = part(fuse, cyl(0.012, 0.012, 1, 5).translate(0, 0.5, 0), lambert(0x2a2a2a));
  const spark = sub(fuse);
  const sparkCore = part(spark, sphere(0.05, 8, 6), glow(0xfff2a0));
  const sparkHalo = part(spark, sphere(0.09, 8, 6), glow(0xff8a1a, { transparent: true, opacity: 0.55, depthWrite: false }));
  const flying = [0, 1, 2, 3, 4, 5, 6, 7].map(() => part(all, sphere(0.03, 5, 4), glow(0xffd23f)));
  const smoke = [0, 1].map(() => part(all, sphere(0.1, 7, 5), glow(0x55585e, { transparent: true, opacity: 0.5, depthWrite: false })));
  let ticks = 0;
  return stated(group, (t, hot, rage, dt) => {
    const lit = clamp01(hot + rage);
    ticks += dt * mix(mix(1, 4, hot), 14, rage); // (the clock's hand: a tick a second, then faster)
    hand.rotation.z = -(rage > 0.5 ? ticks : Math.floor(ticks)) * Math.PI / 6;
    const beat = Math.abs(Math.sin(t * mix(8, 15, rage)));
    crate.scale.set(1 + hot * 0.03 * beat + rage * 0.12 * beat, 1 + hot * 0.04 * beat + rage * 0.1 * beat, 1 + hot * 0.03 * beat + rage * 0.12 * beat);
    tint(paper, 0xc8955a, 0xff3a1a, rage * (0.55 + beat * 0.35));
    paper.emissive.setHex(0xff2a00).multiplyScalar(rage * (0.25 + beat * 0.35));
    const blink = Math.sin(t * mix(6, 19, hot)) > 0 ? 1 : 0;
    tint(lampMat, 0x3a0d0d, 0xff2010, rage > 0.5 ? 1 : lit * blink);
    lamp.scale.setScalar(1 + lit * 0.5);
    // the fuse burns down
    const left = mix(mix(0.34, 0.26, hot), 0.09, rage);
    cord.scale.y = left;
    fuse.rotation.z = -0.35 + Math.sin(t * 3) * 0.05;
    spark.position.y = left;
    spark.scale.setScalar(Math.max(0.001, lit * (0.8 + jitter(t, 4) * 0.35 + rage * 0.6)));
    sparkCore.rotation.y = t * 9;
    sparkHalo.scale.setScalar(1 + Math.sin(t * 31) * 0.25);
    flying.forEach((f, k) => { // (sparks thrown out, over and over)
      const u = (t * 1.7 + k / 8) % 1, a = k * 2.4 + Math.floor(t * 1.7 + k / 8) * 1.3;
      f.position.set(Math.sin(a) * u * 0.75, 0.6 + u * 0.75 - u * u * 0.6, Math.cos(a) * u * 0.75);
      f.scale.setScalar(Math.max(0.001, rage * (1 - u) * 1.4));
    });
    smoke.forEach((s, k) => {
      const u = (t * 0.6 + k * 0.5) % 1;
      s.position.set(0.2 + Math.sin(t + k * 3) * 0.08, 0.85 + u * 0.6, 0.15);
      s.scale.setScalar(Math.max(0.001, lit * (0.5 + u)));
      s.material.opacity = 0.5 * (1 - u);
    });
    all.position.set(hot * jitter(t, 1) * 0.012 + rage * jitter(t, 2) * 0.03, rage * Math.abs(Math.sin(t * 10)) * 0.1, 0);
    all.rotation.z = (Math.floor(ticks) % 2 ? 1 : -1) * 0.012 * (1 - rage) + rage * Math.sin(t * 13) * 0.09;
  });
};

// a crate of bees: a slatted crate with the hive showing through. A few bees idling round it /
// the lid rattling and more of them out / the lid thrown back and the whole swarm boiling over
const makeBees = () => {
  const group = new THREE.Group();
  const wood = lambert(0xb98a4e), darkWood = lambert(0x8a6234), honey = lambert(0xe9a820);
  const all = sub(group);
  part(all, box(0.74, 0.04, 0.6), darkWood, 0, 0.02, 0);
  for (const x of [-0.35, 0.35]) for (const z of [-0.28, 0.28]) part(all, box(0.06, 0.52, 0.06), darkWood, x, 0.28, z);
  for (const y of [0.12, 0.28, 0.44]) {
    for (const z of [-0.3, 0.3]) part(all, box(0.74, 0.09, 0.025), wood, 0, y, z);
    for (const x of [-0.37, 0.37]) part(all, box(0.025, 0.09, 0.6), wood, x, y, 0);
  }
  for (const [y, r] of [[0.14, 0.24], [0.27, 0.22], [0.39, 0.17]]) part(all, sphere(r, 14, 8), honey, 0, y, 0).scale.y = 0.45; // the hive inside
  part(all, sphere(0.05, 8, 6), glow(0x2a1a08), 0, 0.2, 0.22);
  const lid = sub(all, 0, 0.54, -0.3);
  for (const x of [-0.25, 0, 0.25]) part(lid, box(0.22, 0.035, 0.62), wood, x, 0.018, 0.31);
  for (const z of [0.08, 0.54]) part(lid, box(0.74, 0.03, 0.06), darkWood, 0, 0.045, z);
  // the bees
  const yellow = lambert(0xffd21f), black = lambert(0x1c1a17), wingMat = glow(0xffffff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const eyeMat = glow(0x1c1a17);
  const bees = [];
  for (let k = 0; k < 18; k++) {
    const bee = sub(group);
    part(bee, sphere(0.05, 8, 6), yellow).scale.z = 1.5;
    part(bee, cyl(0.051, 0.051, 0.025, 8), black, 0, 0, 0.005, Math.PI / 2);
    part(bee, sphere(0.036, 7, 5), black, 0, 0, 0.075);
    for (const x of [-0.02, 0.02]) part(bee, sphere(0.012, 5, 4), eyeMat, x, 0.012, 0.105);
    part(bee, new THREE.ConeGeometry(0.014, 0.06, 4), black, 0, 0, -0.095, -Math.PI / 2);
    const wings = [-1, 1].map(d => part(bee, new THREE.CircleGeometry(0.05, 8), wingMat, d * 0.045, 0.045, 0, -Math.PI / 2));
    bees.push({ bee, wings, at: k * 2.39996, r: 0.38 + (k * 7 % 5) * 0.035, h: 0.62 + (k * 5 % 7) * 0.03, k });
  }
  return stated(group, (t, busy, rage, dt) => {
    const calm = clamp01(1 - busy - rage), out = 3 + busy * 6 + rage * 15; // (how many bees are out)
    const speed = mix(mix(1.3, 3.6, busy), 7.5, rage);
    tint(eyeMat, 0x1c1a17, 0xff2010, rage * 1.5);
    for (const b of bees) {
      b.at += dt * speed * (b.k % 2 ? 1 : -1) * (0.8 + (b.k % 4) * 0.12);
      const shown = clamp01(out - b.k);
      const r = b.r * (1 + busy * 0.25 + rage * (0.5 + 0.35 * Math.sin(t * 5 + b.k * 1.7)));
      const h = b.h + busy * (b.k % 3) * 0.12 + rage * ((b.k % 6) * 0.14 - 0.2) + Math.sin(t * mix(2.2, 9, rage) + b.k) * mix(0.04, 0.12, rage);
      b.bee.position.set(Math.sin(b.at) * r + jitter(t, b.k) * (busy + rage) * 0.04, Math.max(0.1, h), Math.cos(b.at) * r);
      b.bee.rotation.y = b.at + (b.k % 2 ? 1 : -1) * Math.PI / 2;
      b.bee.rotation.x = -rage * 0.5; // (stings first)
      b.bee.scale.setScalar(Math.max(0.001, shown * (1 + rage * 0.45)));
      const flap = Math.sin(t * 60 + b.k) * 0.5;
      b.wings[0].rotation.y = flap;
      b.wings[1].rotation.y = -flap;
    }
    // the lid: shut / rattling / thrown back, flapping
    lid.rotation.x = -(busy * Math.abs(Math.sin(t * 13)) * 0.22 + rage * (1.75 + Math.sin(t * 8) * 0.2));
    all.position.set(busy * jitter(t, 1) * 0.012 + rage * jitter(t, 2) * 0.03, rage * Math.abs(Math.sin(t * 9.5)) * 0.07, 0);
    all.rotation.z = busy * Math.sin(t * 15) * 0.02 + rage * Math.sin(t * 11) * 0.08 + calm * 0;
  });
};

// a cursed doll: sat with her eyes shut, head nodding / eyes open and yellow, head on one side and
// swivelling, arms out, a hand's breadth off the ground / high in the air in a purple ring, head spinning, red eyes
const makeDoll = () => {
  const group = new THREE.Group();
  const china = lambert(0xf3e6d8), dressMat = lambert(0x8a2d52), lace = lambert(0xfffaf0), hair = lambert(0x1a1418);
  const fig = sub(group); // (all of her: she rises)
  part(fig, new THREE.ConeGeometry(0.3, 0.46, 14), dressMat, 0, 0.23, 0);
  part(fig, new THREE.TorusGeometry(0.29, 0.03, 6, 18), lace, 0, 0.03, 0, Math.PI / 2);
  part(fig, cyl(0.09, 0.14, 0.22, 12), dressMat, 0, 0.5, 0);
  part(fig, new THREE.TorusGeometry(0.085, 0.025, 6, 14), lace, 0, 0.61, 0, Math.PI / 2);
  for (const x of [-0.09, 0.09]) { // her legs, out in front
    part(fig, new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), china, x, 0.05, 0.32, Math.PI / 2);
    part(fig, sphere(0.055, 8, 6), hair, x, 0.07, 0.46);
  }
  const arms = [-1, 1].map(d => {
    const arm = sub(fig, d * 0.12, 0.57, 0);
    part(arm, new THREE.CapsuleGeometry(0.035, 0.2, 4, 8), dressMat, 0, -0.13, 0);
    part(arm, sphere(0.045, 8, 6), china, 0, -0.27, 0);
    return { arm, d };
  });
  const head = sub(fig, 0, 0.78, 0);
  part(head, sphere(0.18, 16, 12), china);
  part(head, new THREE.SphereGeometry(0.19, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 0.01, -0.015);
  part(head, new THREE.SphereGeometry(0.192, 16, 10, 0, Math.PI, 0, Math.PI * 0.8), hair, 0, 0, -0.01, 0, Math.PI);
  for (const x of [-0.2, 0.2]) {
    part(head, sphere(0.085, 10, 8), hair, x, 0.06, -0.02);
    part(head, sphere(0.035, 6, 5), lambert(0xe0203a), x * 0.86, 0.13, 0.02);
  }
  for (const x of [-0.09, 0.09]) part(head, new THREE.CircleGeometry(0.035, 10), lambert(0xf7a6b4), x, -0.05, 0.165, 0, x * 3);
  const lids = [-0.065, 0.065].map(x => part(head, box(0.06, 0.012, 0.01), glow(0x2a1a14), x, 0.02, 0.172));
  const eyeMat = glow(0xffd23f);
  const eyes = [-0.07, 0.07].map(x => part(head, sphere(0.052, 10, 8), eyeMat, x, 0.02, 0.15));
  const mouth = part(head, sphere(0.03, 8, 6), glow(0x4a0c14), 0, -0.085, 0.165);
  const ringMat = glow(0xb040ff, { transparent: true, opacity: 0.7, depthWrite: false });
  const rings = [0.42, 0.52].map(r => part(group, new THREE.TorusGeometry(r, 0.02, 5, 28), ringMat, 0, 0.6, 0));
  const shadow = part(group, new THREE.CircleGeometry(0.3, 16), glow(0x000000, { transparent: true, opacity: 0.3, depthWrite: false }), 0, 0.005, 0, -Math.PI / 2);
  let turn = 0;
  return stated(group, (t, awake, rage, dt) => {
    const calm = clamp01(1 - awake - rage), up = clamp01(awake + rage);
    turn += dt * (awake * 1.5 + rage * 10);
    if (calm >= 1) turn = 0;
    // (every so often, awake, she jerks)
    const jerk = awake * (Math.sin(t * 1.9) > 0.92 ? 1 : 0);
    fig.position.set(rage * jitter(t, 1) * 0.02 + jerk * 0.03, awake * (0.16 + Math.sin(t * 2.2) * 0.03) + rage * (0.42 + Math.sin(t * 3.4) * 0.07), 0);
    fig.rotation.z = awake * Math.sin(t * 1.1) * 0.08 + rage * Math.sin(t * 5) * 0.12;
    fig.rotation.y = rage * Math.sin(t * 0.9) * 0.5;
    head.rotation.set(calm * (0.22 + Math.sin(t * 1.2) * 0.06), turn * rage + awake * Math.sin(turn) * 1.5, calm * Math.sin(t * 0.8) * 0.1 + awake * 0.45);
    for (const { arm, d } of arms) arm.rotation.set(-awake * (1.25 + Math.sin(t * 2 + d) * 0.12), 0, d * (0.2 * calm + rage * (1.9 + jitter(t, d) * 0.25)));
    for (const lid of lids) lid.scale.setScalar(Math.max(0.001, 1 - up * 1.5));
    tint(eyeMat, 0xffd23f, 0xff1a10, rage * 1.4);
    for (const e of eyes) e.scale.setScalar(Math.max(0.001, up * (1 + rage * 0.5 + Math.sin(t * 7) * 0.08 * up)));
    mouth.scale.set(1 + rage * 1.4, 0.4 + rage * 2.2, 0.5);
    tint(dressMat, 0x8a2d52, 0x2a0d2e, rage * 0.8);
    rings.forEach((ring, k) => {
      ring.position.y = fig.position.y + 0.42;
      ring.rotation.set(t * (2.3 + k) * (k ? -1 : 1), t * 1.7, k * 1.2);
      ring.scale.setScalar(Math.max(0.001, rage * (1 + Math.sin(t * 6 + k) * 0.08)));
    });
    shadow.scale.setScalar(Math.max(0.001, up * (1 - rage * 0.35)));
  });
};

// a specimen jar: something green and coiled at the bottom of it / the lid lifting on a tentacle
// that feels about outside, an eye at the glass / the lid gone, three of them thrashing, the jar rocking
const makeTentacle = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const glass = new THREE.MeshPhongMaterial({ color: 0xd8f2e6, transparent: true, opacity: 0.28, shininess: 120, depthWrite: false, side: THREE.DoubleSide });
  const liquid = new THREE.MeshLambertMaterial({ color: 0x5ccf74, transparent: true, opacity: 0.36, depthWrite: false });
  const skin = lambert(0xb8477e), metal = lambert(0x8a8f98);
  part(all, cyl(0.31, 0.31, 0.03, 18), lambert(0x9fb8ad), 0, 0.015, 0);
  const pool = part(all, cyl(0.285, 0.285, 0.44, 18), liquid, 0, 0.25, 0);
  pool.renderOrder = 1;
  const jar = part(all, new THREE.CylinderGeometry(0.31, 0.31, 0.62, 18, 1, true), glass, 0, 0.33, 0);
  jar.renderOrder = 2;
  part(all, new THREE.TorusGeometry(0.3, 0.025, 6, 18), metal, 0, 0.64, 0, Math.PI / 2);
  const label = sub(all, 0, 0.3, 0.315);
  part(label, box(0.26, 0.2, 0.004), lambert(0xfdf4dc));
  for (const d of [-1, 1]) part(label, box(0.16, 0.03, 0.005), glow(0xd8262b), 0, 0, 0.002, 0, 0, d * Math.PI / 4);
  const lid = sub(all);
  part(lid, cyl(0.33, 0.33, 0.07, 18), metal, 0, 0.035, 0);
  part(lid, sphere(0.05, 8, 6), metal, 0, 0.09, 0);
  // the eye
  const eye = sub(all, 0.1, 0.3, 0.14);
  part(eye, sphere(0.1, 12, 10), glow(0xfff8e0));
  const irisMat = glow(0x2a8a3a);
  part(eye, sphere(0.055, 10, 8), irisMat, 0, 0, 0.065);
  part(eye, sphere(0.028, 8, 6), glow(0x0a0a0a), 0, 0, 0.105);
  // the tentacles: chains of balls, each joint turning a little more than the last
  const limbs = [0, 1, 2].map((n) => {
    const root = sub(all), joints = [];
    let parent = root;
    for (let j = 0; j < 9; j++) {
      const joint = sub(parent, 0, j ? 0.12 : 0, 0), r = 0.115 - j * 0.0085;
      part(joint, sphere(r, 9, 7), skin, 0, 0.05, 0).scale.y = 1.25;
      if (j % 2 === 0 && j < 8) part(joint, sphere(r * 0.42, 6, 5), lambert(0xf2b6cf), 0, 0.05, r * 0.8); // (a sucker)
      joints.push(joint);
      parent = joint;
    }
    return { root, joints, n };
  });
  const bubbles = [0, 1, 2, 3].map(k => part(all, sphere(0.022, 6, 5), glow(0xeaffea, { transparent: true, opacity: 0.7 }), -0.15 + k * 0.1, 0.1, -0.1 + (k % 2) * 0.16));
  return stated(group, (t, out, rage, dt) => {
    void dt;
    const calm = clamp01(1 - out - rage), up = clamp01(out + rage);
    tint(liquid, 0x5ccf74, 0xa02ad0, rage);
    tint(skin, 0xb8477e, 0xd0202a, rage * 0.8);
    tint(irisMat, 0x2a8a3a, 0xff2010, rage * 1.5);
    eye.scale.setScalar(Math.max(0.001, out * 0.9 + rage * 1.25));
    eye.position.set(0.08 + Math.sin(t * 1.3) * 0.04, 0.3 + Math.sin(t * 2) * 0.03, 0.15);
    eye.rotation.set(Math.sin(t * 2.6) * 0.3, Math.sin(t * 1.7) * 0.5 * (1 - rage) + jitter(t, 7) * rage * 0.4, 0);
    for (const { root, joints, n } of limbs) {
      const shown = n === 0 ? 1 : rage, side = n === 0 ? 0 : n === 1 ? -1 : 1;
      // the first: coiled at the bottom / up through the neck; the others only come out furious
      root.position.set(side * 0.13 * rage, n === 0 ? mix(0.06, 0.3, up) : 0.3, n === 0 ? -0.04 : 0.06);
      root.scale.setScalar(Math.max(0.001, shown * (n === 0 ? mix(0.62, 1, up) : 0.85)));
      root.rotation.set(0, n * 2.1 + rage * Math.sin(t * 2 + n) * 0.6, -side * rage * 0.75 + (n === 0 ? calm * 1.2 : 0));
      joints.forEach((joint, j) => {
        const wave = Math.sin(t * mix(2.6, 8.5, rage) - j * 0.7 + n * 2);
        const stem = j < 3 ? 0.25 : 1; // (it stands straight up through the neck, and waves above it)
        joint.rotation.z = calm * (n === 0 ? 0.72 : 0) + out * wave * 0.28 * stem + rage * wave * 0.36 * stem + (j > 5 ? up * 0.25 : 0);
        joint.rotation.x = up * Math.cos(t * mix(2.1, 7, rage) - j * 0.6 + n) * mix(0.16, 0.26, rage) * stem;
      });
    }
    // the lid: on / lifted, tilting on the tentacle / knocked off and bouncing about above it all
    lid.position.set(out * 0.14 + rage * (0.5 + Math.sin(t * 3.1) * 0.12), 0.65 + out * (0.2 + Math.sin(t * 3) * 0.04) + rage * (0.75 + Math.abs(Math.sin(t * 4.2)) * 0.3), rage * Math.cos(t * 3.1) * 0.2);
    lid.rotation.set(rage * t * 5, 0, out * (0.75 + Math.sin(t * 3) * 0.12) + rage * t * 3.2);
    bubbles.forEach((b, k) => { const u = (t * mix(0.35, 1.6, up) + k * 0.27) % 1; b.position.y = 0.06 + u * 0.4; b.scale.setScalar(0.5 + u * (1 + up)); });
    all.position.set(rage * jitter(t, 2) * 0.025, rage * Math.abs(Math.sin(t * 8.5)) * 0.06, 0);
    all.rotation.z = out * Math.sin(t * 4.5) * 0.035 + rage * Math.sin(t * 10.5) * 0.11;
  });
};

// every item's model, by its id in cargo.js
export const CARGO_MODELS = {
  cake: makeCake, goldfish: makeGoldfish, cactus: makeCactus, clock: makeClock, pizza: makePizza,
  ...GOOD2_MODELS,
  porcupine: makePorcupine, parcel: makeParcel, bees: makeBees, doll: makeDoll, tentacle: makeTentacle,
  ...EVIL2_MODELS,
  ...MORE_MODELS,
  ...PRANK_B_MODELS,
  ...PRANK_C_MODELS,
};
// the model for an id (a plain box if it is not one of them: a level naming an item nobody has drawn)
export const makeCargoModel = (id) => {
  if (CARGO_MODELS[id]) return CARGO_MODELS[id]();
  const group = new THREE.Group();
  part(group, box(0.6, 0.6, 0.6), lambert(0xc8955a), 0, 0.3, 0);
  return idle(group, () => {});
};
