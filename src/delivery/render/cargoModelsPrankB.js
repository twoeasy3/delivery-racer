// ---- the prank cargo, second batch: P5 Custard Pie Catapult, P6 Air Horn under a Cushion, P7 Bedsheet Ghost
// As cargoModelsEvil2.js's twenty (cargoModels.js spreads these into CARGO_MODELS): each a group standing
// on y = 0, facing +z, with userData.animate(t) and userData.setState(0 | 1 | 2). Plain three.js: nothing
// here touches the game. The ids are cargo.js's. Pranks are THINGS (joke-shop goods, set-up pranks), not
// people in boxes: calm is a plain object with one tell, agitated is the prank arming, furious is the prank
// going off, over and over. Each is told apart at thumbnail size in each state: its outline changes (the
// arm flat / jerking / upright, the cushion on / jumping / flung off, a square / a short cone / a tall one).
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const haze = (color, opacity = 0.5) => glow(color, { transparent: true, opacity, depthWrite: false });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const dome = (r, w = 14, h = 6) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);
const torus = (r, t, n = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 6, n, arc);
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 8);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const FLAT = Math.PI / 2;
// a part of a model: a mesh at (x, y, z), optionally turned (rx, ry, rz)
const part = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
// shown `k` of the way (0: gone, as near as a scale can be)
const show = (object, k) => object.scale.setScalar(Math.max(0.001, k));
// a material's colour, somewhere between two
const shade = new THREE.Color();
const tint = (material, from, to, k) => material.color.setHex(from).lerp(shade.setHex(to), clamp01(k));
// a shake that never repeats in step: -1 .. 1
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
// a short sharp pulse, `rate` a second: 0 most of the time, up to 1 for a moment
const pulse = (t, rate, k = 0) => Math.pow(Math.max(0, Math.sin(t * rate * Math.PI + k)), 10);
// things that go round and round a cycle (drops, rings): fn(mesh, 0 .. 1, k)
const cycle = (list, t, rate, fn) => list.forEach((m, k) => fn(m, (((t * rate + k / list.length) % 1) + 1) % 1, k));
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
// P5. a custard pie catapult: a spring-loaded arm on a plank, hinged at the front, a cream pie on the
// paddle and a stack of refills beside it. Set: the arm held flat under its latch, quivering / twitching:
// the latch slips, the arm jerks up and drops, the cream slides, splats on the plank / firing: the arm snaps
// over, the pie flies up and forward and is gone, a fresh one comes off the stack, the plank hops on the recoil
// ============================================================================
const makePieCatapult = () => {
  const group = new THREE.Group();
  const wood = lambert(0x9a6432), woodDark = lambert(0x5c3a1a), steel = lambert(0xb8bec8), tinMat = lambert(0xd9dde3), creamMat = lambert(0xfff6dc), cherry = lambert(0xd8262b);
  const all = sub(group);
  // the plank on two battens, the hinge posts and axle at the front
  part(all, box(1.1, 0.08, 1.1), wood, 0, 0.1, -0.2);
  for (const z of [-0.65, 0.25]) part(all, box(1.1, 0.06, 0.08), woodDark, 0, 0.03, z);
  for (const x of [-0.2, 0.2]) part(all, box(0.07, 0.3, 0.07), woodDark, x, 0.29, 0.2);
  part(all, cyl(0.025, 0.025, 0.5, 8), steel, 0, 0.36, 0.2, 0, 0, FLAT);
  for (const x of [-0.13, 0.13]) part(all, torus(0.06, 0.014, 16), steel, x, 0.36, 0.2, 0, FLAT); // (the torsion springs)
  // the latch: a post beside the arm with a hook over it, hinged at its foot
  const latch = sub(all, 0.1, 0.14, -0.3);
  part(latch, box(0.05, 0.3, 0.06), woodDark, 0, 0.15, 0);
  part(latch, box(0.14, 0.04, 0.06), steel, -0.055, 0.31, 0);
  // a pie: a tin with a dome of cream and a cherry (the one on the paddle, the one flying, and the stack)
  const pie = (parent, x, y, z) => {
    const p = sub(parent, x, y, z);
    part(p, cyl(0.2, 0.15, 0.08, 16), tinMat, 0, 0.04, 0);
    const cream = part(p, dome(0.17, 14, 6), creamMat, 0, 0.08, 0);
    cream.scale.y = 0.7;
    part(cream, sphere(0.035, 8, 6), cherry, 0, 0.17, 0);
    return p;
  };
  // the arm: its shaft lying on the axle, the paddle and pie at the far end (-z when flat)
  const arm = sub(all, 0, 0.36, 0.2);
  part(arm, box(0.1, 0.04, 0.8), wood, 0, 0.045, -0.34);
  part(arm, cyl(0.2, 0.2, 0.03, 16), woodDark, 0, 0.085, -0.7);
  const onPaddle = pie(arm, 0, 0.1, -0.7);
  const cream = onPaddle.children[1];
  const flying = pie(all, 0, 0, 0);
  // the refills: four tins stacked beside the arm, the top one with its cream on
  const stack = sub(all, -0.33, 0.14, -0.05);
  const tins = [0, 1, 2].map(k => part(stack, cyl(0.2, 0.15, 0.08, 16), tinMat, 0, 0.04 + k * 0.08, 0));
  const topPie = pie(stack, 0, 0.24, 0);
  // the splats on the plank, and the drops of cream in the air
  const splatA = [[0.25, -0.5, 0.09], [-0.1, -0.75, 0.07]].map(([x, z, r]) => part(all, cyl(r, r, 0.012, 10), creamMat, x, 0.152, z));
  const splatF = [[0.38, -0.2, 0.1], [-0.3, -0.72, 0.08], [0.1, 0.05, 0.06], [-0.05, -0.45, 0.05]].map(([x, z, r]) => part(all, cyl(r, r, 0.012, 10), creamMat, x, 0.152, z));
  const drops = [0, 1, 2, 3, 4].map(() => part(all, sphere(0.03, 6, 5), creamMat));
  return stated(group, (t, twitch, fire) => {
    const calm = clamp01(1 - twitch - fire);
    const u = (t * 0.9) % 1; // the firing cycle: snap over, hang there, drawn back down, reloaded
    const jerk = pulse(t, 1.7); // (agitated: the latch slips and the arm jerks)
    let angle;
    if (u < 0.15) { const s = u / 0.15; angle = 2.3 * (1 - (1 - s) * (1 - s)); }
    else if (u < 0.55) angle = 2.3 + Math.sin((u - 0.15) * 45) * 0.08 * (1 - (u - 0.15) / 0.4);
    else if (u < 0.85) angle = 2.3 * (1 - (u - 0.55) / 0.3);
    else angle = 0;
    arm.rotation.x = calm * jitter(t, 1) * 0.012 + twitch * (0.08 + jerk * 0.22) + fire * angle; // (agitated: lifted a few degrees off the latch, jerking higher)
    latch.rotation.z = -(twitch * (0.25 + jerk * 0.4) + fire * 1.25);
    // the pie on the paddle: wobbling, sliding back as the arm jerks, and gone while one is in the air
    const loaded = u < 0.045 ? 1 : u > 0.88 ? clamp01((u - 0.88) / 0.07) : 0;
    show(onPaddle, mix(1, loaded, fire));
    cream.scale.set(1 + calm * Math.sin(t * 6) * 0.04, 0.7 - calm * Math.sin(t * 6) * 0.04, 1 + calm * Math.cos(t * 6) * 0.04);
    cream.position.set(twitch * jitter(t, 2) * 0.02, 0.08, -twitch * (0.05 + jerk * 0.04));
    cream.rotation.x = -twitch * (0.12 + jerk * 0.1);
    // the pie in the air: released going over, an arc up and forward, tumbling, gone at the top of it
    const s = clamp01((u - 0.045) / 0.45);
    const inAir = fire > 0.5 && u >= 0.045 && u < 0.495;
    show(flying, inAir ? (s < 0.7 ? 1 : 1 - (s - 0.7) / 0.3) : 0);
    flying.position.set(0, 1.03 + 1.1 * s - 1.3 * s * s, -0.03 + 1.1 * s);
    flying.rotation.x = -s * 7;
    // the stack: the top pie taken as the paddle is reloaded, back when the next is set out
    show(topPie, mix(1, u > 0.86 && u < 0.97 ? 0 : 1, fire));
    stack.rotation.z = twitch * jitter(t, 3) * 0.06 + fire * jitter(t, 4) * 0.04;
    stack.position.y = 0.14 + fire * (u < 0.15 ? Math.sin(u / 0.15 * Math.PI) * 0.03 : 0);
    tins.forEach((tin, k) => { tin.position.x = (twitch + fire) * jitter(t, 5 + k) * 0.015; });
    // cream on the plank, and drops falling from the paddle as it fires
    for (const s of splatA) show(s, clamp01(twitch + fire));
    for (const s of splatF) show(s, fire);
    cycle(drops, t, 1.1, (d, v, k) => {
      const a = k * 2.4;
      d.position.set(Math.sin(a) * 0.25 * v, 0.95 - v * v * 0.78, -0.1 + Math.cos(a) * 0.3 * v);
      show(d, fire * (1 - v * 0.5));
    });
    // the plank: quivering under the tension / rattling / hopping on the recoil
    const recoil = fire * (u < 0.15 ? Math.sin(u / 0.15 * Math.PI) : 0);
    all.position.set(twitch * jerk * jitter(t, 6) * 0.01 + fire * jitter(t, 7) * 0.01, recoil * 0.07, 0);
    all.rotation.set(-recoil * 0.1 + twitch * jerk * 0.02, 0, calm * jitter(t, 8) * 0.004 + twitch * jerk * jitter(t, 9) * 0.04);
  });
};

// ============================================================================
// P6. an air horn under a cushion: a red can with a flared trumpet out of its side, a plump cushion sat on
// the button. Primed: still, the cushion settling and lifting / parping: short blasts, the trumpet puffing
// out, the cushion jumping an inch, rings of sound out of the mouth / blaring: one long blast, the trumpet
// flared wide, big rings streaming, the can riding its recoil in a circle, the cushion flung off and landing
// back, the can glowing hot
// ============================================================================
const makeAirHorn = () => {
  const group = new THREE.Group();
  const canMat = lambert(0xd8262b), label = lambert(0xf4f1e8), dark = lambert(0x22252b), chrome = lambert(0xcfd4dc);
  const cushionMat = lambert(0x7a4fb0), trim = lambert(0xe6c84a);
  const all = sub(group);
  const can = sub(all);
  part(can, cyl(0.17, 0.17, 0.52, 18), canMat, 0, 0.26, 0);
  part(can, cyl(0.178, 0.178, 0.16, 18), label, 0, 0.3, 0);
  part(can, box(0.12, 0.07, 0.014), glow(0xf2b705), 0, 0.3, 0.182, 0, 0, 0.3); // (a lightning flash on the label)
  part(can, cyl(0.15, 0.17, 0.05, 18), dark, 0, 0.535, 0);
  const button = part(can, cyl(0.1, 0.1, 0.07, 14), dark, 0, 0.585, 0);
  // the trumpet out of the side, tilted up; its mouth a black face with the rim standing proud of it
  const horn = sub(can, 0.133, 0.4, 0.106); // (out of the side, to the right and forward, so the bell reads in profile from the front)
  horn.rotation.set(-0.45, 0.9, 0);
  part(horn, cyl(0.035, 0.035, 0.14, 10), chrome, 0, 0, 0.07, FLAT);
  const bell = sub(horn, 0, 0, 0.14);
  part(bell, cyl(0.24, 0.045, 0.34, 20), chrome, 0, 0, 0.17, FLAT);
  part(bell, cyl(0.22, 0.22, 0.02, 20), glow(0x0a0a0a), 0, 0, 0.32, FLAT);
  part(bell, torus(0.245, 0.02, 24), chrome, 0, 0, 0.34);
  const rings = [0, 1, 2, 3, 4].map(() => part(horn, torus(0.1, 0.014, 20), haze(0xfff2a0, 0.7), 0, 0, 0.48));
  // the cushion: plump, piped, a button in the middle and a tassel at each corner, its bottom on the can's button
  const cushion = sub(all, 0, 0.625, 0);
  part(cushion, box(0.62, 0.14, 0.62), cushionMat, 0, 0.07, 0);
  part(cushion, box(0.64, 0.04, 0.64), lambert(0x5a3690), 0, 0.07, 0);
  part(cushion, sphere(0.035, 8, 6), trim, 0, 0.145, 0);
  for (const x of [-0.31, 0.31]) for (const z of [-0.31, 0.31]) part(cushion, sphere(0.04, 8, 6), trim, x, 0.07, z);
  return stated(group, (t, parp, blare) => {
    const calm = clamp01(1 - parp - blare);
    const puff = pulse(t, 2.2); // (agitated: a short blast now and then)
    const blast = clamp01(parp * puff + blare);
    // the trumpet puffs out at each blast, and flares wide for the long one
    bell.scale.set(1 + parp * puff * 0.12 + blare * 0.4, 1 + parp * puff * 0.12 + blare * 0.4, 1 + blare * 0.1);
    button.position.y = 0.585 - clamp01(parp + blare) * 0.02;
    cycle(rings, t, mix(1.2, 2.4, blare), (ring, v) => {
      ring.position.z = 0.48 + v * mix(0.5, 0.9, blare);
      ring.scale.setScalar(Math.max(0.001, blast * (0.5 + v * mix(1.8, 3.2, blare))));
      ring.material.opacity = 0.7 * (1 - v);
    });
    // the cushion: settling and lifting as if someone is about to sit / jumping an inch / flung off and back
    const v = (t * 0.8) % 1;
    const toss = blare * Math.sin(v * Math.PI);
    cushion.position.set(blare * Math.sin(v * Math.PI) * 0.15, 0.625 + parp * puff * 0.05 + toss * 0.7, 0);
    cushion.rotation.set(blare * v * Math.PI * 2, 0, toss * 0.4);
    cushion.scale.y = 1 - calm * 0.08 * (0.5 + 0.5 * Math.sin(t * 1.4));
    // the can: rocking at each parp / riding its own recoil in a circle, glowing hot
    all.position.set(blare * Math.cos(t * 7) * 0.07, 0, blare * Math.sin(t * 7) * 0.07);
    all.rotation.set(blare * Math.cos(t * 7) * 0.12, 0, parp * puff * 0.05 + blare * Math.sin(t * 7) * 0.12);
    can.scale.set(1 + blast * 0.03, 1 - blast * 0.02, 1 + blast * 0.03);
    tint(canMat, 0xd8262b, 0xff5a2a, blare);
    canMat.emissive.setHex(0xff2000).multiplyScalar(blare * (0.3 + Math.sin(t * 9) * 0.1));
  });
};

// ============================================================================
// P7. a bedsheet ghost: a sheet with two eyeholes, and someone under it who cannot keep still, trainers
// showing. Folded: a neat square on the trainers' toes, twitching now and then / rising: a short rounded
// cone, the eyeholes at the front, swaying, a muffled speech bubble popping up and sinking / BOO: full height,
// billowing, two arms out under the sheet, the trainers kicking, leaping, "BOO!" in big letters, the eyeholes
// glowing
// ============================================================================
const SHEET = new THREE.LatheGeometry([[0.42, 0], [0.41, 0.06], [0.38, 0.18], [0.33, 0.36], [0.28, 0.54], [0.24, 0.7], [0.21, 0.82], [0.17, 0.91], [0.1, 0.975], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 22);
// the sheet's radius at a share of its height
const sheetR = (k) => k < 0.7 ? mix(0.42, 0.24, k / 0.7) : k < 0.91 ? mix(0.24, 0.17, (k - 0.7) / 0.21) : mix(0.17, 0, (k - 0.91) / 0.09);
const makeGhost = () => {
  const group = new THREE.Group();
  const sheet = lambert(0xf7f4ee, { side: THREE.DoubleSide }), hem = lambert(0xf7f4ee), fold = lambert(0xd9d4c8);
  const shoeMat = lambert(0xf2f2f2), sole = lambert(0x2a2d33), stripe = lambert(0xd8262b), eyeMat = glow(0x0e0c0a), ink = glow(0x111111), paper = glow(0xffffff);
  const all = sub(group);
  // the trainers, toes out at the front
  const shoes = [-0.11, 0.11].map(x => {
    const s = sub(all, x, 0, 0.34);
    part(s, box(0.15, 0.03, 0.3), sole, 0, 0.015, 0);
    part(s, box(0.14, 0.08, 0.28), shoeMat, 0, 0.07, -0.01);
    part(s, box(0.142, 0.02, 0.1), stripe, 0, 0.085, 0.03);
    part(s, sphere(0.07, 8, 6), shoeMat, 0, 0.055, 0.13).scale.y = 0.75;
    return s;
  });
  // the folded square, on the toes, the eyeholes on top
  const folded = sub(all, 0, 0.115, 0);
  part(folded, box(0.5, 0.14, 0.5), sheet, 0, 0.07, 0);
  part(folded, box(0.51, 0.012, 0.51), fold, 0, 0.07, 0);
  const foldedEyes = [-0.1, 0.1].map(x => part(folded, sphere(0.055, 8, 6), eyeMat, x, 0.14, 0.03));
  for (const e of foldedEyes) e.scale.set(1, 0.35, 1.3);
  // the sheet: a rounded cone, a black face across its open bottom, a wavy hem, the eyeholes, the arms
  const ghost = sub(all, 0, 0.16, 0);
  const cloth = part(ghost, SHEET, sheet);
  const under = part(ghost, cyl(0.4, 0.4, 0.01, 20), glow(0x0a0a0a), 0, 0.012, 0);
  const scallops = [];
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const s = part(ghost, sphere(0.07, 8, 6), hem, Math.sin(a) * 0.42, 0.03, Math.cos(a) * 0.42); s.scale.y = 0.7; scallops.push([s, a]); }
  const eyes = [-0.09, 0.09].map(x => { const e = part(ghost, sphere(0.05, 8, 6), eyeMat, x, 0.5, 0.2); e.scale.set(1, 1.3, 0.5); return e; });
  const arms = [-1, 1].map(d => {
    const root = sub(ghost, d * 0.22, 0.5, 0.05);
    part(root, capsule(0.06, 0.3), sheet, 0, 0.21, 0);
    return root;
  });
  // the speech bubble: a card with BOO! on it and a tail down to the ghost
  const bubble = sub(all, 0.42, 1, 0.1);
  part(bubble, box(0.7, 0.34, 0.06), paper);
  part(bubble, cone(0.05, 0.16, 6), paper, -0.3, -0.21, 0, 0, 0, 0.5);
  part(bubble, box(0.035, 0.2, 0.03), ink, -0.27, 0, 0.04);
  for (const y of [-0.05, 0.05]) part(bubble, torus(0.05, 0.016, 12, Math.PI), ink, -0.27, y, 0.04, 0, 0, -FLAT);
  for (const x of [-0.1, 0.06]) part(bubble, torus(0.07, 0.018, 14), ink, x, 0, 0.04);
  part(bubble, box(0.035, 0.12, 0.03), ink, 0.22, 0.035, 0.04);
  part(bubble, sphere(0.022, 6, 5), ink, 0.22, -0.08, 0.04);
  return stated(group, (t, rise, boo) => {
    const up = clamp01(rise + boo), calm = 1 - up;
    const H = mix(0.72, 1.15, boo), h = H * up, w = mix(0.6, 1, up) * (1 + boo * Math.sin(t * 8) * 0.05);
    // the folded square shrinks away as the sheet rises; folded, it twitches and a toe lifts
    const twitch = pulse(t, 0.6, 1);
    folded.scale.set(Math.max(0.001, calm), Math.max(0.001, calm * (1 + twitch * 0.12)), Math.max(0.001, calm));
    folded.rotation.set(0, calm * twitch * 0.14, 0);
    cloth.scale.set(w, Math.max(0.001, h), w);
    under.scale.set(w, Math.max(0.001, up), w);
    for (const [s, a] of scallops) { s.position.set(Math.sin(a) * 0.42 * w, 0.03 + boo * Math.sin(t * 8 + a * 3) * 0.03, Math.cos(a) * 0.42 * w); s.scale.set(up, up * 0.7, up); }
    const r = sheetR(0.74) * w;
    eyes.forEach((e, k) => { e.position.set((k ? 0.09 : -0.09) * w, 0.74 * h, Math.sqrt(Math.max(0, r * r - 0.0081 * w * w))); e.scale.set(up * (1 + boo * 0.6), up * (1.3 + boo * 0.5), up * 0.5); });
    tint(eyeMat, 0x0e0c0a, 0xffe14a, boo);
    arms.forEach((root, k) => {
      const d = k ? 1 : -1;
      root.position.set(d * 0.22 * w, 0.5 * h, 0.05);
      root.rotation.z = -d * (FLAT - 0.3 - Math.sin(t * 7 + k) * 0.45 * boo);
      show(root, boo);
    });
    // swaying / billowing and leaping, the trainers kicking
    ghost.rotation.set(0, 0, rise * Math.sin(t * 2.5) * 0.12 + boo * Math.sin(t * 6) * 0.08);
    const leap = boo * Math.abs(Math.sin(t * 5)) * 0.22;
    all.position.y = leap;
    shoes.forEach((s, k) => { s.rotation.x = -calm * twitch * (k ? 0.25 : 0) + boo * Math.sin(t * 10 + k * Math.PI) * 0.45; });
    // the bubble: a muffled one popping up and sinking / BOO! held up big
    const pop = clamp01(Math.sin(t * 2.2) * 1.6);
    bubble.position.set(0.35 + 0.2 * w, 0.16 + h + 0.05 + boo * Math.sin(t * 9) * 0.03, 0.1);
    show(bubble, rise * 0.5 * pop + boo * (1 + Math.sin(t * 9) * 0.06));
  });
};

export const PRANK_B_MODELS = { piecatapult: makePieCatapult, airhorn: makeAirHorn, ghost: makeGhost };
