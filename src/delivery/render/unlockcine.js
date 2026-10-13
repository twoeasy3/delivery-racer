// ---- UNLOCK CINEMATICS: a new car's reveal, and a more dramatic one for a car's KEY (the owner, 13-Oct: "a cinematic
// unlock animation, and a more dramatic one for a key unlock", "only viewable from link for now"; then "different camera
// shots", "the car unlock exactly 5 seconds"). Reached ONLY by the address for now (main.js loads this file only then);
// nothing in the menus or in play starts one yet.
//   ?unlockcine=car:<id>   the CAR unlock, 5.0 s, four shots:
//       0.00-1.25 SILHOUETTE  a low wide hero shot from the front left, in the dark: a spotlight beam sweeps across
//                              behind the car, a glow rises behind it, the car is a black shape with a rim of light
//       1.25-2.25 DETAIL      a close-up of the front wheel and lamp, tracking forward, the key light sweeping on
//       2.25-3.35 TRACKING    a side shot tracking along the car, lit; at 2.55 a FLARE in the rarity's colour (a
//                              burst of sparks, a horizontal lens streak)
//       3.35-5.00 HERO        the front three-quarter reveal, pushing in; NEW CAR, the name, the stars (each in turn),
//                              the rarity banner; a short settle, a fade out over the last 0.25 s
//   ?unlockcine=key:<id>   the KEY unlock, 9.0 s, six shots:
//       0.00-1.60 DARKNESS    black; a thin light from above finds the car's key (its own model, render/keyModels.js),
//                              standing, turning slowly, dust in the light
//       1.60-3.10 APPROACH    a side shot: the key, level, slides into a lock barrel in slow motion; three tumbler
//                              lights come on with a click each (2.35, 2.60, 2.85)
//       3.10-3.60 THE TURN    a close-up on the lock: the key turns a quarter, and at 3.30 the CLICK: camera shake,
//                              a white flash going to the rarity's colour, a thud
//       3.60-5.00 BURST       a slow-motion wide shot from in front of the lock: sparks and rays spreading slowly,
//                              and far behind it the car's silhouette, backlit
//       5.00-6.70 RESOLVE     a low wide shot of the car: a black shape, then a light sweeping across brings it out
//       6.70-9.00 HERO        the front three-quarter, pushing in; KEY UNLOCKED, the name, the stars, the rarity
//                              banner; a fade out over the last 0.3 s
//   &evil      the Evil livery          &loop      play it again and again
//   &still=<s> that moment of it, held (for stills; no sound)
// Skipped by a tap or click, Escape, Space or Enter (it closes; with &loop the looping stops too).
// Reduced motion (prefers-reduced-motion) or any ?lite= switch: a short fade-only version (the final shot, still, fading
// in with its words, held, fading out: 2.6 s).
// THE COST (the owner's tablet flickers: CHECKLIST 212 / 215): everything is drawn in ONE WebGL canvas (its own renderer,
// made when it starts and given back, context and all, when it ends): no CSS blur, backdrop-filter, filters, isolation or
// big see-through layers. The flash, the vignette, the letterbox bars and the fades are drawn in the same canvas; only
// the words are page elements (small, opaque text, no shadow but a hard 1 px one). Pixels: the screen's at most 1.5x
// (1.25x on a touch screen) and never more than about 1.3 million; no shadow maps, a few hundred points.
// Sound: the game's own (render/audio.js Sound.play, existing WAVs and synthesised stand-ins only). A browser plays
// none until the page has been tapped or a key pressed, so a first play straight from the address is silent; with
// &loop, the plays after a tap are heard (a tap skips: use a key that is not Esc / Space / Enter, e.g. Shift).
// No game state: nothing is saved, nothing is read but the car's data (cars.js, showroomData.js).
import * as THREE from 'three';
import { carById, stars, starColour } from '../cars.js';
import { rarityOf, RARITIES } from '../showroomData.js';
import { makeShowCar, paintShowCar } from './showcar.js';
import { makeKey } from './keyModels.js';
import { keyModelInUse } from './keycard.js';
import { stillViews } from './modelviews.js';
import { LITE } from '../lite.js';
import { Sound } from './audio.js';

const params = new URLSearchParams(location.search);
const LEN = 4.4; // (every car scaled to this length, so the shots fit any car)
const DURATION = { car: 5.0, key: 9.0, lite: 2.6 };

// ---- little helpers ----
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const span = (t, a, b) => clamp((t - a) / (b - a)); // 0 before a, 1 after b
const smooth = (u) => u * u * (3 - 2 * u);
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
const easeIn = (u) => u * u * u;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const rand = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// soft round patch / vertical gradient / rays, drawn once on a canvas
const texture = (draw, w = 128, h = 128) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
};
const radial = (stops) => texture((g, w, h) => {
  const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  for (const [at, colour] of stops) grad.addColorStop(at, colour);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
});

// ---- the stage: one scene for both sequences (the car at the middle, facing +z; the lock in front of it) ----
const build = (car, evil, mode) => {
  const own = []; // (geometries, materials and textures to give back)
  const keep = (x) => { own.push(x); return x; };
  const rarity = rarityOf(car) || 'common';
  const accent = new THREE.Color(mode === 'key' && car.bespoke ? RARITIES.bespoke.colour : (RARITIES[rarity]?.colour || '#ffffff'));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 14, 34);

  // the car, scaled to LEN long, stood on the floor at the middle
  const model = makeShowCar(car);
  paintShowCar(model, car, evil);
  model.userData.animate?.(0);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(v3()), mid = box.getCenter(v3());
  const scale = LEN / Math.max(size.z, size.x, size.y, 0.01);
  const carRig = new THREE.Group(), holder = new THREE.Group();
  holder.add(model);
  model.position.set(-mid.x, -box.min.y, -mid.z);
  holder.scale.setScalar(scale);
  carRig.add(holder);
  scene.add(carRig);
  const W = size.x * scale, H = size.y * scale, L = size.z * scale;

  // the floor: dark, lit only where a light falls; a glow pool under the car
  const floor = new THREE.Mesh(keep(new THREE.CircleGeometry(30, 48)), keep(new THREE.MeshLambertMaterial({ color: 0x15171d })));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const additive = (map, colour, opacity = 1) => keep(new THREE.MeshBasicMaterial({ map, color: colour, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const soft = keep(radial([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]));
  const plane = keep(new THREE.PlaneGeometry(1, 1));
  const pool = new THREE.Mesh(plane, additive(soft, accent.clone().lerp(new THREE.Color(0xffffff), 0.5), 0));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.01; pool.scale.set(L * 1.7, L * 1.7, 1);
  scene.add(pool);
  const shadowTx = keep(radial([[0, 'rgba(0,0,0,0.9)'], [1, 'rgba(0,0,0,0)']]));
  const shadow = new THREE.Mesh(plane, keep(new THREE.MeshBasicMaterial({ map: shadowTx, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; shadow.scale.set(W * 1.5, L * 1.25, 1);
  scene.add(shadow);

  // the glow behind the car (what makes it a silhouette), and the spotlight's beam that sweeps across
  const backGlow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: soft, color: accent.clone().lerp(new THREE.Color(0xffffff), 0.35), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  backGlow.position.set(0, H * 0.55, -L * 0.95); backGlow.scale.set(L * 2.6, H * 2.8 + 1.2, 1);
  scene.add(backGlow);
  const beamTx = keep(texture((g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }, 4, 64));
  const beamMat = keep(new THREE.MeshBasicMaterial({ map: beamTx, color: 0xdfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const beamGeo = keep(new THREE.ConeGeometry(1.6, 9, 24, 1, true));
  beamGeo.translate(0, -4.5, 0); // (the apex, the texture's bright end, at the group's origin; the cone hanging down from it)
  const beam = new THREE.Group();
  beam.add(new THREE.Mesh(beamGeo, beamMat));
  beam.position.set(0, 8, -L * 0.6);
  scene.add(beam);
  const spotPool = new THREE.Mesh(plane, additive(soft, 0xdfe8ff, 0));
  spotPool.rotation.x = -Math.PI / 2; spotPool.position.y = 0.015; spotPool.scale.set(3.4, 3.4, 1);
  scene.add(spotPool);

  // the lights (all set per frame)
  const hemi = new THREE.HemisphereLight(0xc8d6ff, 0x20222a, 0);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0);
  const rim = new THREE.DirectionalLight(accent.clone().lerp(new THREE.Color(0xffffff), 0.4), 0);
  rim.position.set(-2, 3, -8);
  const rim2 = new THREE.DirectionalLight(0xbfd0ff, 0);
  rim2.position.set(5, 2.5, -6);
  scene.add(hemi, keyLight, keyLight.target, rim, rim2);

  // sparks: one set of points, every one's path a function of the time (so a still is any moment)
  const N = 220, dot = keep(radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]));
  const sparkGeo = keep(new THREE.BufferGeometry());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const sparks = new THREE.Points(sparkGeo, keep(new THREE.PointsMaterial({ size: 0.12, map: dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  sparks.frustumCulled = false;
  scene.add(sparks);
  const r = rand(car.id.length * 977 + 13), seeds = [];
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, b = Math.acos(r() * 2 - 1);
    seeds.push({ dir: v3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)), speed: 0.4 + r() * 1, hue: r(), late: r() * 0.25, wob: r() * 6, kind: i < 150 ? 'burst' : 'dust' });
  }
  // the lens streak and the rays (the flare)
  const streak = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: soft, color: accent.clone().lerp(new THREE.Color(0xffffff), 0.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  const flareCore = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: soft, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  const raysTx = keep(texture((g, w, h) => {
    g.translate(w / 2, h / 2);
    const rr = rand(7);
    for (let i = 0; i < 28; i++) {
      g.rotate((Math.PI * 2) / 28 + (rr() - 0.5) * 0.08);
      const len = w * (0.25 + rr() * 0.25), grad = g.createLinearGradient(0, 0, len, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath(); g.moveTo(0, -1.5 - rr() * 2); g.lineTo(len, 0); g.lineTo(0, 1.5 + rr() * 2); g.fill();
    }
  }, 256, 256));
  const rays = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: raysTx, color: accent.clone().lerp(new THREE.Color(0xffffff), 0.45), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  scene.add(streak, flareCore, rays);

  const stage = { scene, own, keep, model, carRig, W, H, L, accent, rarity, hemi, keyLight, rim, rim2, floor, pool, shadow, backGlow, beam, beamMat, spotPool, sparks, sparkGeo, seeds, streak, flareCore, rays };
  if (mode === 'key') buildLock(stage, car);
  return stage;
};

// the key and its lock, in front of the car (the lock facing +z, the camera's way; the key comes in from +z)
const buildLock = (s, car) => {
  const { keep, scene, H, L, accent } = s;
  const lockAt = v3(0, H * 0.5 + 0.45, L / 2 + 6.5);
  // the key: the car's own model at Bespoke, scaled to 1.1 long, its middle at the rig's origin
  const key = makeKey(car, { model: keyModelInUse(car), rarity: 'bespoke' });
  key.updateMatrixWorld(true);
  const kb = new THREE.Box3().setFromObject(key), ks = kb.getSize(v3()), km = kb.getCenter(v3());
  const kScale = 1.1 / Math.max(ks.y, 0.01);
  key.position.set(-km.x, -km.y, -km.z);
  const keyScaled = new THREE.Group(); keyScaled.add(key); keyScaled.scale.setScalar(kScale);
  const keyLevel = new THREE.Group(); keyLevel.add(keyScaled); // (orientation: standing, or blade forward)
  const keyRig = new THREE.Group(); keyRig.add(keyLevel); // (where it is, and its turn)
  scene.add(keyRig);
  const keyHalf = ks.y * kScale / 2;
  // the lock: a chrome barrel, a dark face with the slot, a ring of tumbler lights, a glow ring
  const lock = new THREE.Group();
  lock.position.copy(lockAt);
  const chrome = keep(new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 0.9, roughness: 0.28 }));
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.5, roughness: 0.5 }));
  const barrel = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.42, 0.46, 0.6, 32)), chrome);
  barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.3;
  const bezel = new THREE.Mesh(keep(new THREE.TorusGeometry(0.42, 0.06, 10, 40)), chrome);
  bezel.position.z = 0.0;
  const face = new THREE.Mesh(keep(new THREE.CircleGeometry(0.37, 36)), dark);
  face.position.z = 0.012;
  const slotMat = keep(new THREE.MeshBasicMaterial({ color: 0x000000 }));
  const slot = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.07, 0.42)), slotMat);
  slot.position.z = 0.016;
  const faceTurn = new THREE.Group(); faceTurn.add(face, slot); // (the face turns with the key)
  const pips = [];
  for (let i = 0; i < 3; i++) {
    const m = keep(new THREE.MeshBasicMaterial({ color: 0x222630 }));
    const pip = new THREE.Mesh(keep(new THREE.CircleGeometry(0.045, 16)), m);
    const a = Math.PI / 2 + (i - 1) * 0.55;
    pip.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.02);
    pips.push(m);
    lock.add(pip);
  }
  const plate = new THREE.Mesh(keep(new THREE.CircleGeometry(0.78, 40)), keep(new THREE.MeshStandardMaterial({ color: 0x1b1e26, metalness: 0.6, roughness: 0.45 })));
  plate.position.z = -0.01;
  const glowRing = new THREE.Mesh(keep(new THREE.RingGeometry(0.47, 0.56, 48)), keep(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
  glowRing.position.z = 0.02;
  lock.add(barrel, bezel, faceTurn, plate, glowRing);
  scene.add(lock);
  // a small light of its own over the key (the car far behind is not lit by it)
  const keySpot = new THREE.PointLight(0xffffff, 0, 4.5, 1.6);
  scene.add(keySpot);
  Object.assign(s, { lockAt, keyRig, keyLevel, keyHalf, lock, faceTurn, pips, glowRing, keySpot, keyMaterials: [] });
};

// ---- the camera's shots: each { from, to, at (seconds), cam(u) => [position, target, fov] } ----
// (k: wider screens need less, narrow ones more: distances are stretched by it)
const carShots = (s, k) => {
  const { W, H, L } = s;
  return [
    { from: 0, to: 1.25, cam: (u) => [v3(-3.6 * k + u * 0.4, 0.38, 6.4 * k - u * 0.9), v3(0, H * 0.48, 0), 40] }, // SILHOUETTE: low, wide, front left
    { from: 1.25, to: 2.25, cam: (u) => [v3(W / 2 + 1.0, H * 0.32, L * 0.12 + u * 0.7), v3(W * 0.42, H * 0.3, L * 0.42 + u * 0.25), 36] }, // DETAIL: the front wheel and lamp
    { from: 2.25, to: 3.35, cam: (u) => [v3(-6.2 * k, H * 0.62, -2.0 + u * 3.0), v3(0, H * 0.42, -0.9 + u * 2.2), 34] }, // TRACKING: the side
    { from: 3.35, to: 5.0, cam: (u) => { const d = lerp(9.6, 8.1, easeOut(u)) * k; return [v3(d * 0.62, 1.35 + H * 0.3, d * 0.78), v3(0, H * 0.42, 0), 32, 0.17]; } }, // HERO (the car high in the picture: the words under it)
  ];
};
const keyShots = (s, k) => {
  const { lockAt: P, H, L } = s;
  return [
    { from: 0, to: 1.6, cam: (u) => [v3(0.15, 0.08 - u * 0.05, 2.0 + 2.3 - u * 0.35).add(P), v3(0, 0, 2.0).add(P), 34] }, // DARKNESS: the key, close
    { from: 1.6, to: 3.1, cam: (u) => [v3(2.3 - u * 0.25, 0.45, 0.9 - u * 0.15).add(P), v3(0, 0, 0.55 - u * 0.2).add(P), 38] }, // APPROACH: from the side
    { from: 3.1, to: 3.6, cam: (u) => [v3(0.55, 0.3, 1.9 - u * 0.15).add(P), v3(0, 0, 0.3).add(P), 32] }, // THE TURN: the lock, close
    { from: 3.6, to: 5.0, cam: (u) => [v3(1.0 + u * 0.2, 0.55 + u * 0.15, 3.6 + u * 0.6).add(P), v3(0, -0.6, -3).add(P), 46] }, // BURST: past the lock to the car
    { from: 5.0, to: 6.7, cam: (u) => [v3(2.6 * k - u * 0.6, 0.42, (L / 2 + 5.2) * k - u * 0.6), v3(0, H * 0.5, 0), 40] }, // RESOLVE: low and wide
    { from: 6.7, to: 9.0, cam: (u) => { const d = lerp(9.8, 8.0, easeOut(u)) * k; return [v3(-d * 0.62, 1.35 + H * 0.3, d * 0.78), v3(0, H * 0.42, 0), 32, 0.2]; } }, // HERO (the other side; high in the picture)
  ];
};

// ---- the words ----
const css = `
.ucine{position:fixed;inset:0;z-index:10000;background:#000;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
.ucine canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ucine-words{position:absolute;left:0;right:0;bottom:7%;text-align:center;pointer-events:none;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.ucine-words>*{opacity:0;will-change:auto}
.ucine-tag{font-size:clamp(12px,1.6vw,17px);letter-spacing:.42em;font-weight:700;text-transform:uppercase;margin-bottom:.35em;text-shadow:0 1px 0 #000}
.ucine-big{font-size:clamp(26px,5.2vw,64px);letter-spacing:.18em;font-weight:900;text-transform:uppercase;line-height:1.05;margin-bottom:.12em;text-shadow:0 2px 0 #000}
.ucine-name{font-size:clamp(22px,4vw,48px);font-weight:800;line-height:1.1;text-shadow:0 2px 0 #000}
.ucine-stars{font-size:clamp(18px,2.6vw,30px);letter-spacing:.12em;margin:.15em 0 .3em;text-shadow:0 1px 0 #000}
.ucine-stars span{display:inline-block;opacity:0}
.ucine-rarity{display:inline-block;padding:.3em 1.4em;font-size:clamp(12px,1.5vw,16px);font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#0b0c10;border-radius:3px}
.ucine-skip{position:absolute;right:14px;top:10px;font:600 12px system-ui,sans-serif;color:#8a90a0;letter-spacing:.1em;pointer-events:none}
`;

// ---- one play ----
export const playUnlock = ({ mode = 'car', carId = 'commuter', evil = false, loop = false, still = null } = {}) => {
  const car = carById(carId) || carById('commuter');
  if (!car) return null;
  const lite = !!(LITE.size || stillViews());
  const style = Object.assign(document.createElement('style'), { textContent: css });
  const root = Object.assign(document.createElement('div'), { className: 'ucine' });
  const canvas = document.createElement('canvas');
  root.append(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('No unlock cinematic (no WebGL): ' + (error?.message || error));
    return null;
  }
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.head.append(style);
  document.body.append(root);

  const s = build(car, evil, mode);
  const rarityInfo = RARITIES[mode === 'key' && car.bespoke ? 'bespoke' : s.rarity] || RARITIES.common;
  // the words' elements
  const words = Object.assign(document.createElement('div'), { className: 'ucine-words' });
  const tag = Object.assign(document.createElement('div'), { className: 'ucine-tag', textContent: mode === 'key' ? 'The key is yours' : (evil ? 'New ride' : 'New car') });
  tag.style.color = '#' + s.accent.getHexString();
  const big = Object.assign(document.createElement('div'), { className: 'ucine-big', textContent: 'Key unlocked' });
  const name = Object.assign(document.createElement('div'), { className: 'ucine-name', textContent: car.name || car.id });
  const starRow = Object.assign(document.createElement('div'), { className: 'ucine-stars' });
  starRow.style.color = starColour(car);
  const starText = stars(car);
  for (const ch of starText) starRow.append(Object.assign(document.createElement('span'), { textContent: ch }));
  const pill = Object.assign(document.createElement('div'), { className: 'ucine-rarity', textContent: rarityInfo.name });
  pill.style.background = rarityInfo.colour;
  if (mode === 'key') words.append(big, name, starRow, pill); else words.append(tag, name, starRow, pill);
  const skipNote = Object.assign(document.createElement('div'), { className: 'ucine-skip', textContent: still === null ? 'TAP TO SKIP' : '' });
  root.append(words, skipNote);

  // the overlay drawn over the scene in the same canvas: vignette, flash, letterbox bars, fade
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  const over = new THREE.Scene();
  const vigTx = s.keep(radial([[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]));
  const quad = s.keep(new THREE.PlaneGeometry(2, 2));
  const vignette = new THREE.Mesh(quad, s.keep(new THREE.MeshBasicMaterial({ map: vigTx, transparent: true, depthTest: false, depthWrite: false })));
  vignette.scale.set(1.45, 1.45, 1);
  const flashMat = s.keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  const flash = new THREE.Mesh(quad, flashMat);
  const barMat = s.keep(new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false }));
  const barTop = new THREE.Mesh(quad, barMat), barBottom = new THREE.Mesh(quad, barMat);
  const fadeMat = s.keep(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  const fade = new THREE.Mesh(quad, fadeMat);
  over.add(vignette, flash, barTop, barBottom, fade);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
  let shots = [], aspect = 1, k = 1;
  const view = { lift: 0 };
  const resize = () => {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    let ratio = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5);
    ratio = Math.min(ratio, Math.sqrt(1.3e6 / Math.max(1, w * h)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    aspect = w / h;
    k = Math.pow(Math.max(1, 1.6 / aspect), 0.85);
    shots = mode === 'key' ? keyShots(s, k) : carShots(s, k);
    // letterbox: the picture about 2.2:1 where the screen is wider than tall, never more than 11% a bar
    const bar = clamp((1 - (w / 2.2) / h) / 2, 0.04, 0.11);
    barTop.scale.set(1, bar, 1); barTop.position.y = 1 - bar;
    barBottom.scale.set(1, bar, 1); barBottom.position.y = -1 + bar;
    words.style.bottom = (bar * 50 + 4) + '%';
  };
  resize();

  const total = lite ? DURATION.lite : DURATION[mode];
  // the words' timings: [element, appears at, fades at] (fade with the whole at the end)
  const reveal = mode === 'key' ? { tag: 6.85, big: 6.95, name: 7.25, stars: 7.5, pill: 7.85 } : { tag: 3.5, name: 3.62, stars: 3.88, pill: 4.12 };
  const setWords = (t) => {
    const at = lite ? { tag: 0.35, big: 0.35, name: 0.45, stars: 0.55, pill: 0.65 } : reveal;
    const show = (el, t0, rise = 14) => {
      const u = lite ? span(t, t0, t0 + 0.4) : easeOut(span(t, t0, t0 + 0.35));
      el.style.opacity = u.toFixed(3);
      el.style.transform = lite ? '' : `translateY(${((1 - u) * rise).toFixed(1)}px)`;
    };
    show(tag, at.tag, 8);
    if (mode === 'key') {
      const u = span(t, at.big, at.big + 0.5);
      big.style.opacity = (lite ? u : easeOut(u)).toFixed(3);
      big.style.letterSpacing = lite ? '' : (0.18 + (1 - easeOut(u)) * 0.5).toFixed(3) + 'em';
    }
    show(name, at.name);
    starRow.style.opacity = t >= at.stars ? '1' : '0';
    [...starRow.children].forEach((el, i) => {
      const u = lite ? span(t, at.stars, at.stars + 0.3) : span(t, at.stars + i * 0.07, at.stars + i * 0.07 + 0.18);
      el.style.opacity = u.toFixed(3);
      el.style.transform = lite ? '' : `scale(${(1 + (1 - easeOut(u)) * 1.2).toFixed(3)})`;
    });
    const p = span(t, at.pill, at.pill + 0.35);
    pill.style.opacity = p > 0 ? '1' : '0';
    pill.style.clipPath = lite ? '' : `inset(0 ${((1 - easeOut(p)) * 50).toFixed(1)}% 0 ${((1 - easeOut(p)) * 50).toFixed(1)}%)`;
    const out = lite ? span(t, total - 0.4, total) : span(t, total - (mode === 'key' ? 0.3 : 0.25), total);
    words.style.opacity = (1 - out).toFixed(3);
  };

  // sparks: where each is at time t
  const sparkPos = s.sparkGeo.attributes.position, sparkCol = s.sparkGeo.attributes.color, col = new THREE.Color();
  const setSparks = (t, origin, t0, slow, power, show, dustOn) => {
    let n = 0;
    for (const sd of s.seeds) {
      let p = null;
      if (sd.kind === 'burst' && show && t >= t0 + sd.late * 0.2) {
        const age = t - t0 - sd.late * 0.2;
        const life = 1.6 + sd.late * 3;
        if (age < life) {
          const d = power * sd.speed * (1 - Math.exp(-age / slow));
          p = v3(origin.x + sd.dir.x * d, origin.y + sd.dir.y * d * 0.8 + age * 0.15, origin.z + sd.dir.z * d);
          const fadeU = 1 - age / life;
          if (s.accentRainbow) col.setHSL((sd.hue + t * 0.1) % 1, 0.85, 0.62); else col.copy(s.accent).lerp(new THREE.Color(0xffffff), sd.hue * 0.5);
          col.multiplyScalar(fadeU);
        }
      } else if (sd.kind === 'dust' && dustOn > 0) {
        const c = dustOn;
        p = v3(origin.x + (sd.dir.x * 1.6) + Math.sin(t * 0.3 + sd.wob) * 0.25, origin.y + sd.dir.y * 1.2 + Math.sin(t * 0.21 + sd.wob * 2) * 0.2, origin.z + sd.dir.z * 1.2);
        col.setRGB(0.55 * c, 0.58 * c, 0.65 * c).multiplyScalar(0.5 + 0.5 * Math.sin(t * 1.3 + sd.wob));
      }
      if (p) { sparkPos.setXYZ(n, p.x, p.y, p.z); sparkCol.setXYZ(n, col.r, col.g, col.b); n++; }
    }
    s.sparkGeo.setDrawRange(0, n);
    sparkPos.needsUpdate = true; sparkCol.needsUpdate = true;
  };
  s.accentRainbow = mode === 'key' && !!car.bespoke;

  const shake = (t, t0, amount) => {
    if (t < t0) return v3(0, 0, 0);
    const e = Math.exp(-(t - t0) * 7) * amount;
    return v3(Math.sin(t * 71) * e, Math.sin(t * 53 + 1) * e, Math.sin(t * 47 + 2) * e * 0.5);
  };

  // ---- the state of everything at time t ----
  const setCar = (t) => {
    const lt = lite ? 99 : t; // (the lite version: everything as at the end)
    const shot = lite ? shots[shots.length - 1] : shots.find(x => t < x.to) || shots[shots.length - 1];
    const u = lite ? 1 : span(t, shot.from, shot.to);
    const [pos, target, fov, lift = 0] = shot.cam(smooth(u) * 0.5 + u * 0.5);
    view.lift = lift;
    camera.position.copy(pos); camera.fov = fov; camera.lookAt(target);
    const { W, H, L } = s;
    // lights: dark, a rim, then the key light sweeping on in the detail shot, full from the side shot
    const on = smooth(span(lt, 1.35, 2.3));
    s.hemi.intensity = 0.02 + on * 1.35;
    s.keyLight.intensity = on * 2.4;
    const sweep = lerp(-1.2, 0.7, smooth(span(lt, 1.25, 2.6)));
    s.keyLight.position.set(Math.sin(sweep) * 8, 6, Math.cos(sweep) * 8);
    s.rim.intensity = 1.2 + 1.6 * smooth(span(lt, 0.1, 0.8));
    s.rim2.intensity = 0.8 * smooth(span(lt, 0.3, 1.0)) + on * 0.6;
    s.backGlow.material.opacity = 0.75 * smooth(span(lt, 0.0, 0.7)) * (1 - 0.55 * on);
    s.pool.material.opacity = 0.15 + 0.35 * on;
    // the beam's sweep (the silhouette shot), then gone
    const b = span(lt, 0, 1.3);
    s.beam.position.set(lerp(-L * 0.9, L * 0.9, smooth(b)), 7.5, -L * 0.55);
    s.beam.rotation.z = lerp(0.35, -0.35, smooth(b));
    s.beamMat.opacity = 0.16 * Math.sin(Math.PI * b) * (lite ? 0 : 1);
    s.spotPool.position.set(s.beam.position.x + 7.5 * Math.tan(s.beam.rotation.z), 0.015, -L * 0.55); // (where the beam meets the floor)
    s.spotPool.material.opacity = 0.5 * Math.sin(Math.PI * b) * (lite ? 0 : 1);
    // the flare at 2.55 (behind the car, low), its sparks
    const fT = 2.55, f = lite ? 0 : span(t, fT, fT + 1.4);
    const origin = v3(0, H * 0.55, -L * 0.15);
    s.flareCore.position.copy(origin); s.streak.position.copy(origin); s.rays.position.copy(origin);
    const pulse = t >= fT && !lite ? Math.exp(-(t - fT) * 2.2) : 0;
    s.flareCore.material.opacity = pulse * 0.9; s.flareCore.scale.setScalar(2 + pulse * 3);
    s.streak.material.opacity = pulse * 0.8; s.streak.scale.set(9 + (1 - pulse) * 4, 0.16, 1);
    s.rays.material.opacity = pulse * 0.35; s.rays.scale.setScalar(4 + f * 3); s.rays.material.rotation = t * 0.15;
    setSparks(t, origin, fT, 0.45, Math.max(W, L) * 0.65, !lite, 0);
    s.sparks.material.size = 0.11;
    s.model.userData.animate?.(lt === 99 ? 2.4 : t);
    flashMat.opacity = lite ? 0 : 0.35 * (t >= fT ? Math.exp(-(t - fT) * 9) : 0);
    flashMat.color.copy(s.accent).lerp(new THREE.Color(0xffffff), 0.5);
    // fades: in from black, out at the end
    const fadeIn = lite ? span(t, 0, 0.5) : span(t, 0, 0.35);
    const fadeOut = lite ? span(t, total - 0.4, total) : span(t, total - 0.25, total);
    fadeMat.opacity = Math.max(1 - fadeIn, fadeOut);
  };

  const setKey = (t) => {
    const lt = lite ? 99 : t;
    const shot = lite ? shots[shots.length - 1] : shots.find(x => t < x.to) || shots[shots.length - 1];
    const u = lite ? 1 : span(t, shot.from, shot.to);
    const [pos, target, fov, lift = 0] = shot.cam(smooth(u) * 0.5 + u * 0.5);
    view.lift = lift;
    const CLICK = 3.3;
    camera.position.copy(pos).add(lite ? v3(0, 0, 0) : shake(t, CLICK, 0.07));
    camera.fov = fov; camera.lookAt(target);
    const { H, L, lockAt: P } = s;
    // the key: standing and turning slowly (the first shot), then level, blade into the lock, and the turn
    if (t < 1.6 && !lite) {
      s.keyLevel.rotation.set(0, 0, 0);
      s.keyRig.position.set(P.x, P.y + Math.sin(t * 1.1) * 0.03, P.z + 2.0);
      s.keyRig.rotation.set(0, 0.6 - t * 0.35, -0.12);
      s.keyRig.visible = true;
    } else {
      // level: blade (-y) toward -z, its face up (+y)
      s.keyLevel.rotation.set(Math.PI / 2, 0, 0);
      const inU = easeOut(span(t, 1.6, 2.95));
      const tipZ = lerp(1.7, -0.32, inU); // (the blade's tip, from the lock's face: in at last)
      s.keyRig.position.set(P.x, P.y, P.z + tipZ + s.keyHalf);
      const turn = easeIn(span(t, 3.12, CLICK)) * Math.PI / 2;
      s.keyRig.rotation.set(0, 0, turn);
      s.keyRig.visible = lt < 5.0 || lite ? !lite : false;
    }
    s.faceTurn.rotation.z = s.keyRig.rotation.z * (t >= 1.6 ? 1 : 0);
    // the tumbler lights, one by one, then all the rarity's colour at the click
    s.pips.forEach((m, i) => { const lit = t >= 2.35 + i * 0.25; m.color.set(lit ? (t >= CLICK ? s.accent : new THREE.Color(0xfff2c8)) : new THREE.Color(0x222630)); });
    const ringPulse = t >= CLICK ? Math.exp(-(t - CLICK) * 1.6) : 0;
    s.glowRing.material.opacity = lite ? 0 : 0.2 * span(t, 2.3, 3.1) + ringPulse * 0.9;
    s.lock.visible = !lite && t >= 1.6 && t < 5.0; // (not in the dark first shot: only the key)
    // the key's own little light
    s.keySpot.position.set(P.x + 0.4, P.y + 1.1, P.z + 1.6);
    s.keySpot.intensity = lite ? 0 : 6 * smooth(span(t, 0.3, 1.2)) * (t < 5.0 ? 1 : 0) + 10 * ringPulse;
    // the car: a silhouette far behind the lock, then the light sweeping across it (RESOLVE), full in the hero shot
    const on = smooth(span(lt, 5.35, 6.4));
    s.hemi.intensity = 0.05 + on * 1.35;
    s.keyLight.intensity = on * 2.5;
    const sweep = lerp(1.3, -0.5, smooth(span(lt, 5.2, 6.5)));
    s.keyLight.position.set(Math.sin(sweep) * 8, 6, Math.cos(sweep) * 8);
    s.rim.intensity = 2.6 * smooth(span(lt, 3.3, 4.6));
    s.rim2.intensity = 1.2 * smooth(span(lt, 3.6, 5.0)) + on * 0.5;
    s.backGlow.material.opacity = 0.85 * smooth(span(lt, 3.35, 4.6)) * (1 - 0.6 * on);
    s.pool.material.opacity = 0.05 + 0.4 * on;
    s.beamMat.opacity = 0; s.spotPool.material.opacity = 0;
    // the light burst at the click: core, streak, rays (slow motion), sparks; in the hero shot, a soft one behind the car
    const origin = t < 5.0 ? v3(P.x, P.y, P.z + 0.05) : v3(0, H * 0.55, -L * 0.2);
    s.flareCore.position.copy(origin); s.streak.position.copy(origin); s.rays.position.copy(origin);
    const pulse = !lite && t >= CLICK && t < 5.0 ? Math.exp(-(t - CLICK) * 0.9) : 0;
    const settle = !lite && t >= 6.7 ? 0.4 * Math.exp(-(t - 6.7) * 1.2) : 0;
    s.flareCore.material.opacity = Math.min(1, pulse * 1.1 + settle); s.flareCore.scale.setScalar(1.2 + pulse * 2.4 + settle * 6);
    s.streak.material.opacity = pulse * 0.9 + settle; s.streak.scale.set(7 + (1 - pulse) * 5, 0.12, 1);
    s.rays.material.opacity = pulse * 0.55 + settle * 0.6; s.rays.scale.setScalar(2.5 + (t - CLICK) * 0.9); s.rays.material.rotation = t * 0.08;
    if (t < 5.0) setSparks(t, origin, CLICK, 1.1, 2.2, !lite, lite ? 0 : smooth(span(t, 0.2, 1.0)) * (t < 1.6 ? 1 : 0));
    else setSparks(t, origin, 6.7, 0.6, Math.max(s.W, L) * 0.6, !lite, 0);
    s.sparks.material.size = t < 5.0 ? 0.045 : 0.1;
    s.model.userData.animate?.(lt === 99 ? 2.4 : t);
    // the flash at the click: white, going to the rarity's colour
    if (!lite && t >= CLICK && t < 4.2) {
      const a = t - CLICK;
      flashMat.opacity = a < 0.06 ? 1 : Math.exp(-(a - 0.06) * 3.5) * 0.85;
      flashMat.color.set(0xffffff).lerp(s.accent, clamp(a / 0.35));
    } else flashMat.opacity = 0;
    const fadeIn = lite ? span(t, 0, 0.5) : span(t, 0, 0.6);
    const fadeOut = lite ? span(t, total - 0.4, total) : span(t, total - 0.3, total);
    // (a dip to black on the cut to the car: from the light of the burst into the dark room)
    const dip = lite ? 0 : Math.max(span(t, 4.75, 5.0) * (t < 5.0 ? 1 : 0), t >= 5.0 ? 1 - span(t, 5.0, 5.3) : 0);
    fadeMat.opacity = Math.max(1 - fadeIn, fadeOut, dip);
  };

  // sound cues: [time, name, volume]
  const CUES = lite ? [] : mode === 'key'
    ? [[0.15, 'rumble', 0.6], [1.7, 'throw', 0.5], [2.35, 'camera', 0.8], [2.6, 'camera', 0.8], [2.85, 'camera', 0.9], [3.28, 'crash', 0.9], [3.3, 'drum', 1], [3.34, 'burst', 0.7], [5.05, 'turbo', 0.6], [6.95, 'bell', 0.8], [7.85, 'menuPick', 0.7]]
    : [[0.05, 'rumble', 0.35], [1.25, 'throw', 0.45], [2.55, 'drum', 0.9], [2.56, 'turbo', 0.5], [3.62, 'menuPick', 0.7], [4.12, 'bell', 0.7]];

  // ---- the loop ----
  let raf = 0, startAt = 0, lastT = -1, done = false;
  const frame = (t) => {
    if (mode === 'key') setKey(t); else setCar(t);
    camera.aspect = aspect;
    if (view.lift) camera.setViewOffset(1000, 1000, 0, view.lift * 1000, 1000, 1000); else camera.clearViewOffset(); // (the picture slid: the subject higher)
    camera.updateProjectionMatrix();
    setWords(t);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(s.scene, camera);
    renderer.clearDepth();
    renderer.render(over, ortho);
  };
  const tick = (now) => {
    if (done) return;
    raf = requestAnimationFrame(tick);
    if (!startAt) startAt = now;
    let t = (now - startAt) / 1000;
    if (t >= total) {
      if (!loop) { close(); return; }
      startAt = now; t = 0; lastT = -1;
    }
    for (const [at, nameOf, vol] of CUES) if (lastT < at && t >= at) Sound.play(nameOf, vol);
    lastT = t;
    frame(t);
  };
  const close = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    removeEventListener('resize', onResize);
    removeEventListener('keydown', onKey, true);
    root.remove(); style.remove();
    s.scene.traverse((node) => { node.geometry?.dispose(); for (const m of [].concat(node.material || [])) { m.map?.dispose(); m.dispose(); } });
    for (const x of s.own) x.dispose?.();
    renderer.dispose();
    renderer.forceContextLoss();
  };
  const onResize = () => { resize(); if (still !== null) frame(still); };
  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); close(); }
  };
  root.addEventListener('pointerdown', (e) => { e.stopPropagation(); close(); });
  addEventListener('resize', onResize);
  addEventListener('keydown', onKey, true);

  if (still !== null) { const t = clamp(still, 0, total); requestAnimationFrame(() => { resize(); frame(t); }); }
  else raf = requestAnimationFrame(tick);
  return { close, get done() { return done; }, total };
};

// ---- the address: ?unlockcine=car:<id> | key:<id> [&evil] [&loop] [&still=<s>] ----
const raw = params.get('unlockcine');
if (raw) {
  const [kind, id] = raw.includes(':') ? raw.split(':') : ['car', raw];
  const start = () => playUnlock({
    mode: kind === 'key' ? 'key' : 'car', carId: (id || 'commuter').trim(), evil: params.has('evil'), loop: params.has('loop'),
    still: params.has('still') ? Number(params.get('still')) || 0 : null,
  });
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start, { once: true }); else start();
}
