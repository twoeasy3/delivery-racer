// ---- UNLOCK CINEMATICS: a new car's reveal, and a more dramatic one for a car's KEY (the owner, 13-Oct: "a cinematic
// unlock animation, and a more dramatic one for a key unlock", "only viewable from link for now"; then "different camera
// shots", "the car unlock exactly 5 seconds"; 14-Oct: tap to dismiss at the end, a real ignition, more shots of the car,
// a fob that unlocks the car for the keys with no blade). Reached ONLY by the address for now (main.js loads this file
// only then); nothing in the menus or in play starts one yet.
//   ?unlockcine=car:<id>   the CAR unlock, 5.0 s, four shots, then held:
//       0.00-1.25 SILHOUETTE  a low wide hero shot from the front left, in the dark: a spotlight beam sweeps across
//                              behind the car, a glow rises behind it, the car a black shape with a rim of light
//       1.25-2.25 DETAIL      the front corner (lamp and grille), close, tracking across: the headlamps flicker on
//                              (1.40, 1.50), the key light sweeps on
//       2.25-3.35 TRACKING    a side shot along the car, lit; at 2.55 a FLARE in the rarity's colour (sparks, a lens
//                              streak, rays)
//       3.35-5.00 HERO        the front three-quarter, pushing in; NEW CAR, the name, the stars (each in turn), the
//                              rarity banner; at 4.7 "Tap to continue", and the last frame HELD until a tap or a key
//   ?unlockcine=key:<id>   the KEY unlock, 10.0 s, eight shots, then held. Two openings, by the car's key:
//     a key with a BLADE (an IGNITION):
//       0.00-1.40 DARKNESS    black; a small light finds the car's key (its own model, render/keyModels.js), standing,
//                              turning slowly, dust in the light
//       1.40-2.80 INSERT      from the side: the key, its blade level and its teeth DOWN, slides along the barrel's axis
//                              into the vertical slot; three tumbler clicks (1.90, 2.15, 2.40)
//       2.80-3.50 THE TURN    the barrel's face, from the driver's seat: a quarter turn CLOCKWISE (2.90-3.10), LOCK ->
//                              ACC -> ON lighting round the barrel, and at 3.10 the CLICK: shake, a white flash going to
//                              the rarity's colour, a thud
//     a FOB with no blade (FOB_ONLY below: smart, snowboot, carbonfob, wedgefob, startfob, artisan; the Horseshoe
//     Hypercar, the Snowcat, the Quad-Turbo, the Knife-Edge, the Windsong, the Sixteen-Cylinder Coupe):
//       0.00-1.40 DARKNESS    the fob, standing, turning slowly in a small light
//       1.40-3.50 THE PRESS   one shot (14-Oct, the owner): the fob large in the foreground, pointing at the car, which
//                              stands small and dark in the background; a slow push in. The button pressed at 2.20
//                              (the fob dips and tips, a light at it, a click), a pulse of light leaves its tip for the
//                              car (2.25-2.55), THEN the car answers: indicators and headlamps blink twice with a chirp
//                              each (2.60, 2.95; the second with a small shake), its headlamps stay on low
//     then both:
//       3.50-4.60 BURST       slow motion past the lock (or the fob) to the car: sparks and rays spreading, the car a
//                              silhouette behind, its edges lit by the burst; a dip to black
//       4.60-5.60 LAMPS       a close-up of the front corner: the headlamp flickers (4.85) and powers on (5.00)
//       5.60-6.60 SIDE        a sweep along the side as the light comes across it
//       6.60-7.60 REAR        a low rear three-quarter: the tail lamps light (6.80)
//       7.60-10.0 HERO        the front three-quarter, pushing in; KEY UNLOCKED, the name, the stars, the rarity; at 9.3
//                              "Tap to continue", and the last frame HELD
//   &evil      the Evil livery          &loop      play it again and again (no hold)
//   &still=<s> that moment of it, held (for stills; no sound)
// A tap or click, Escape, Space or Enter while it plays jumps to the held last frame; at the held frame it closes.
// Reduced motion (prefers-reduced-motion) or any ?lite= switch: a short fade-only version (the final shot, still, fading
// in with its words, then held).
// THE COST (the owner's tablet flickers: CHECKLIST 212 / 215): everything is drawn in ONE WebGL canvas (its own renderer,
// made when it starts and given back, context and all, when it ends): no CSS blur, backdrop-filter, filters, isolation or
// big see-through layers. The flash, the vignette, the letterbox bars and the fades are drawn in the same canvas; only
// the words are page elements (small, opaque text, no shadow but a hard 1 px one). Pixels: the screen's at most 1.5x
// (1.25x on a touch screen) and never more than about 1.3 million; no shadow maps, a few hundred points. Held, nothing
// is drawn at all (the loop stops).
// Sound: the game's own (render/audio.js Sound.play, existing WAVs and synthesised stand-ins only). A browser plays
// none until the page has been tapped or a key pressed, so a first play straight from the address is silent.
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
import { DIRECTORS } from './ecucine.js';
import { keyPose, FOB } from './keypose.js'; // (the other cinematics: Crazey Jim's sale, ECU up, max ECU)

const params = new URLSearchParams(location.search);
const LEN = 4.4; // (every car scaled to this length, so the shots fit any car)
const DURATION = { car: 5.0, key: 10.0, lite: 1.3 };
const HINT = { car: 4.7, key: 9.3, lite: 1.0 }; // (when "Tap to continue" shows: the banner settled)
// the key models with NO BLADE (render/keyModels.js smart, snowboot; render/keyModelsOrdC.js carbonfob, wedgefob;
// render/keyModelsOrdD.js startfob, artisan): their cars get the fob unlocking the car, not the ignition
export const FOB_ONLY = new Set(['smart', 'snowboot', 'carbonfob', 'wedgefob', 'startfob', 'artisan']);

// ---- little helpers ----
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const span = (t, a, b) => clamp((t - a) / (b - a)); // 0 before a, 1 after b
const smooth = (u) => u * u * (3 - 2 * u);
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
const easeIn = (u) => u * u * u;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const rand = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const WHITE = new THREE.Color(0xffffff);

// ---- NO TEXTURES (the owner, 14-Oct: flat colours, shapes and vertex colours only): every glow, shadow, beam, ray and
// the vignette is geometry whose VERTEX COLOURS (RGBA) fade it out, drawn additive (a glow: black adds nothing) or
// blended (a shadow, the vignette); nothing is drawn on a canvas
// a round disc of rings in the x-y plane: stops [[radius, alpha], ...] from the middle (radius 0) outward; white, so the
// material's colour tints it
export const radialDisc = (stops, segs = 32) => {
  const pos = [0, 0, 0], col = [1, 1, 1, stops[0][1]], idx = [];
  for (let r = 1; r < stops.length; r++) for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pos.push(Math.cos(a) * stops[r][0], Math.sin(a) * stops[r][0], 0);
    col.push(1, 1, 1, stops[r][1]);
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + i, 1 + ((i + 1) % segs));
  for (let r = 2; r < stops.length; r++) {
    const a0 = 1 + (r - 2) * segs, a1 = 1 + (r - 1) * segs;
    for (let i = 0; i < segs; i++) { const i1 = (i + 1) % segs; idx.push(a0 + i, a1 + i, a1 + i1, a0 + i, a1 + i1, a0 + i1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
};
// the soft glow's profile (1 across: a sprite's size), and a glow's material
export const SOFT = [[0, 1], [0.175, 0.45], [0.5, 0]];
export const glowMat = (colour, opacity = 0) => new THREE.MeshBasicMaterial({ vertexColors: true, color: colour, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
// a camera-facing glow (in s.facing: turned to the camera each frame): a group with .material (its mesh's) and .spin
// (its mesh turned in the picture's plane), sized as a sprite (scale = its size across)
export const facing = (s, geometry, material) => {
  const g = new THREE.Group(), mesh = new THREE.Mesh(geometry, material);
  g.add(mesh);
  g.material = material;
  g.mesh = mesh;
  s.facing.push(g);
  return g;
};
// the starburst: thin rays from the middle, each fading to its tip (1 across)
const raysGeometry = () => {
  const rr = rand(7), pos = [], col = [];
  let a = 0;
  for (let i = 0; i < 28; i++) {
    a += (Math.PI * 2) / 28 + (rr() - 0.5) * 0.08;
    const len = 0.25 + rr() * 0.25, half = (1.5 + rr() * 2) / 256, c = Math.cos(a), sn = Math.sin(a);
    pos.push(-sn * half, c * half, 0, sn * half, -c * half, 0, c * len, sn * len, 0);
    col.push(1, 1, 1, 0.9, 1, 1, 1, 0.9, 1, 1, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  return g;
};
// a spotlight's beam: an open cone hanging from its apex (at the origin), bright there and fading to its base
export const beamGeometry = (radius = 1.6, length = 9) => {
  const g = new THREE.ConeGeometry(radius, length, 24, 1, true);
  g.translate(0, -length / 2, 0);
  const p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) col.push(1, 1, 1, 0.9 * (1 + p.getY(i) / length));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  return g;
};
export const shown = (node) => { for (let n = node; n; n = n.parent) if (!n.visible) return false; return true; };

// ---- the car's LAMPS: its headlamps, tail lamps and indicators found by their look and place (as the model editor
// guesses them: render/modelpatch.js), each with an "off" copy of its material (dimmed) and a glow sprite at it. A car
// whose lamps are not found gets glows where they would be (the front and rear corners).
const findLamps = (s) => {
  const { model, carRig, W, H, L, keep } = s;
  carRig.updateMatrixWorld(true);
  const found = { head: [], tail: [], amber: [] }, box = new THREE.Box3(), c = v3(), size = v3(), hsl = {};
  model.traverse((node) => {
    if (!node.isMesh || !shown(node)) return;
    const mat = [].concat(node.material)[0];
    if (!mat?.color) return;
    box.setFromObject(node); box.getCenter(c); box.getSize(size);
    if (size.length() > L * 0.3) return;
    mat.color.getHSL(hsl);
    const glow = mat.type === 'MeshBasicMaterial' || (mat.emissive && mat.emissive.getHex() > 0 && (mat.emissiveIntensity ?? 1) > 0);
    if (!(glow || hsl.l > 0.8)) return;
    const front = c.z > L / 2 - L * 0.16, rear = c.z < -L / 2 + L * 0.16;
    const red = (hsl.h < 0.04 || hsl.h > 0.94) && hsl.s > 0.5, amber = hsl.h > 0.04 && hsl.h < 0.13 && hsl.s > 0.5;
    const kind = front && !red ? (amber ? 'amber' : 'head') : rear && (red || amber) ? (amber ? 'amber' : 'tail') : null;
    if (!kind) return;
    const off = keep(mat.clone());
    off.color.multiplyScalar(kind === 'head' ? 0.16 : 0.22);
    if (off.emissive) off.emissive.setHex(0);
    found[kind].push({ node, on: node.material, off, at: c.clone() });
  });
  const corners = (z, y) => [-1, 1].map((x) => ({ at: v3(x * W * 0.34, y, z) }));
  const lamps = {
    head: found.head.length ? found.head : corners(L / 2 + 0.02, H * 0.36),
    tail: found.tail.length ? found.tail : corners(-L / 2 - 0.02, H * 0.42),
    amber: found.amber.length ? found.amber : [...corners(L / 2 + 0.02, H * 0.3), ...corners(-L / 2 - 0.02, H * 0.36)],
  };
  // the glows (a few a kind: their places merged two by two at most for a car with many small lamp parts)
  const colours = { head: 0xfff1cc, tail: 0xff2a1a, amber: 0xffa21a };
  for (const kind of Object.keys(lamps)) {
    const list = lamps[kind].slice(0, 8);
    lamps[kind].glows = list.map((l) => {
      const sprite = facing(s, s.softGeo, keep(glowMat(colours[kind])));
      sprite.position.copy(l.at).add(v3(0, 0, Math.sign(l.at.z) * 0.06));
      sprite.scale.setScalar(kind === 'head' ? 0.75 : 0.55);
      s.scene.add(sprite);
      return sprite;
    });
  }
  return lamps;
};
// a kind of lamp on (1) or off (0): the material swapped (on from half way), the glow by the level
const setLamp = (lamps, kind, level, glow = 1) => {
  const list = lamps[kind];
  for (const l of list) if (l.node) l.node.material = level > 0.5 ? l.on : l.off;
  for (const g of list.glows) g.material.opacity = clamp(level) * glow * (kind === 'head' ? 0.75 : 0.65);
};

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
  model.traverse((node) => { if (node.userData.figure) node.visible = false; }); // (no people in a cutscene, the owner, 14-Oct: a model's driver, rider or helmet, tagged `figure` where it is built)
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
  const facingList = [];
  const softGeo = keep(radialDisc(SOFT));
  const pool = new THREE.Mesh(softGeo, keep(glowMat(accent.clone().lerp(WHITE, 0.5))));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.01; pool.scale.set(L * 1.7, L * 1.7, 1);
  scene.add(pool);
  const shadow = new THREE.Mesh(keep(radialDisc([[0, 0.9], [0.5, 0]])), keep(new THREE.MeshBasicMaterial({ color: 0x000000, vertexColors: true, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; shadow.scale.set(W * 1.5, L * 1.25, 1);
  scene.add(shadow);

  // the glow behind the car (what makes it a silhouette), and the spotlight's beam that sweeps across
  const fs = { facing: facingList };
  const backGlow = facing(fs, softGeo, keep(glowMat(accent.clone().lerp(WHITE, 0.35))));
  backGlow.position.set(0, H * 0.55, -L * 0.95); backGlow.scale.set(L * 2.6, H * 2.8 + 1.2, 1);
  scene.add(backGlow);
  const beamMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xdfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const beamGeo = keep(beamGeometry());
  const beam = new THREE.Group();
  beam.add(new THREE.Mesh(beamGeo, beamMat));
  beam.position.set(0, 8, -L * 0.6);
  scene.add(beam);
  const spotPool = new THREE.Mesh(softGeo, keep(glowMat(0xdfe8ff)));
  spotPool.rotation.x = -Math.PI / 2; spotPool.position.y = 0.015; spotPool.scale.set(3.4, 3.4, 1);
  scene.add(spotPool);

  // the lights (all set per frame)
  const hemi = new THREE.HemisphereLight(0xc8d6ff, 0x20222a, 0);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0);
  const rim = new THREE.DirectionalLight(accent.clone().lerp(WHITE, 0.4), 0);
  rim.position.set(-0.6, 1.1, -8); // (from straight behind: an edge of light, the sides the camera sees left dark)
  const rim2 = new THREE.DirectionalLight(0xbfd0ff, 0);
  rim2.position.set(2.5, 0.9, -8);
  scene.add(hemi, keyLight, keyLight.target, rim, rim2);

  // sparks: one set of points, every one's path a function of the time (so a still is any moment)
  const N = 220;
  const sparkGeo = keep(new THREE.BufferGeometry());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const sparks = new THREE.Points(sparkGeo, keep(new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  sparks.frustumCulled = false;
  scene.add(sparks);
  const r = rand(car.id.length * 977 + 13), seeds = [];
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, b = Math.acos(r() * 2 - 1);
    seeds.push({ dir: v3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)), speed: 0.4 + r() * 1, hue: r(), late: r() * 0.25, wob: r() * 6, kind: i < 150 ? 'burst' : 'dust' });
  }
  // the lens streak and the rays (the flare)
  const streak = facing(fs, softGeo, keep(glowMat(accent.clone().lerp(WHITE, 0.3))));
  const flareCore = facing(fs, softGeo, keep(glowMat(0xffffff)));
  const rays = facing(fs, keep(raysGeometry()), keep(glowMat(accent.clone().lerp(WHITE, 0.45))));
  scene.add(streak, flareCore, rays);

  const stage = { scene, own, keep, softGeo, facing: facingList, model, carRig, W, H, L, accent, rarity, hemi, keyLight, rim, rim2, floor, pool, shadow, backGlow, beam, beamMat, spotPool, sparks, sparkGeo, seeds, streak, flareCore, rays };
  stage.lamps = findLamps(stage);
  if (mode === 'key') buildLock(stage, car);
  return stage;
};

// the key and its lock, in front of the car. THE IGNITION: the barrel's axis along z, its face toward +z (the driver,
// and the camera), its slot VERTICAL; the key goes in along the axis, its blade's flat sides facing sideways and its
// teeth (the blade's right edge as keyModels.js builds it) DOWN, and turns a quarter CLOCKWISE seen from the driver
// (about +z by -90 degrees): LOCK (12 o'clock) -> ACC -> ON (3 o'clock). A fob (FOB_ONLY) has no lock: it is held up.
const buildLock = (s, car) => {
  const { keep, scene, H, L, accent } = s;
  const lockAt = v3(0, H * 0.5 + 0.45, L / 2 + 6.5);
  const model = keyModelInUse(car), fob = FOB_ONLY.has(model);
  // the key: the car's own model at Bespoke, scaled to 1.1 long; its BLADE's middle (the lowest part's) on the rig's
  // axis, so it turns about the blade as a key in a barrel does (a fob: about its own middle)
  const key = makeKey(car, { model, rarity: 'bespoke' });
  key.updateMatrixWorld(true);
  const kb = new THREE.Box3().setFromObject(key), ks = kb.getSize(v3()), km = kb.getCenter(v3());
  let axis = km.clone();
  if (!fob) {
    let lowest = null, low = Infinity;
    const b = new THREE.Box3();
    key.traverse((node) => { if (node.isMesh && shown(node)) { b.setFromObject(node); if (b.min.y < low - 1e-4) { low = b.min.y; lowest = b.getCenter(v3()); } } });
    if (lowest) axis = v3(lowest.x, km.y, lowest.z);
  }
  const kScale = 1.1 / Math.max(ks.y, 0.01);
  key.position.set(-axis.x, -km.y, -axis.z);
  const keyScaled = new THREE.Group(); keyScaled.add(key); keyScaled.scale.setScalar(kScale);
  const keyLevel = new THREE.Group(); keyLevel.add(keyScaled); // (orientation: standing, or in the barrel)
  const keyRig = new THREE.Group(); keyRig.add(keyLevel); // (where it is, and its turn)
  scene.add(keyRig);
  const keyHalf = ks.y * kScale / 2;
  // in the barrel: the key's -y (the blade) along -z, its +x (the teeth) down (-y), so its face (+z) toward -x
  const inBarrel = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(v3(0, -1, 0), v3(0, 0, 1), v3(-1, 0, 0)));
  // the lock: a chrome barrel, a dark face with the vertical slot and an index mark (they turn with the key), the
  // LOCK / ACC / ON marks round it, a glow ring
  const lock = new THREE.Group();
  lock.position.copy(lockAt);
  const chrome = keep(new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 0.9, roughness: 0.28 }));
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.5, roughness: 0.5 }));
  const barrel = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.42, 0.46, 0.6, 32)), chrome);
  barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.3;
  const bezel = new THREE.Mesh(keep(new THREE.TorusGeometry(0.42, 0.06, 10, 40)), chrome);
  const face = new THREE.Mesh(keep(new THREE.CircleGeometry(0.37, 36)), dark);
  face.position.z = 0.012;
  const slot = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.075, 0.44)), keep(new THREE.MeshBasicMaterial({ color: 0x000000 })));
  slot.position.z = 0.016;
  const index = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.035, 0.07)), keep(new THREE.MeshBasicMaterial({ color: 0xd8dce6 })));
  index.position.set(0, 0.3, 0.017); // (the face's mark: at 12 o'clock, LOCK, with the slot upright)
  const faceTurn = new THREE.Group(); faceTurn.add(face, slot, index);
  const pips = [];
  [Math.PI / 2, Math.PI / 4, 0].forEach((a, i) => { // LOCK, ACC, ON: clockwise from 12 o'clock to 3 seen from the driver
    const m = keep(new THREE.MeshBasicMaterial({ color: 0x222630 }));
    const pip = new THREE.Mesh(keep(new THREE.CircleGeometry(i === 2 ? 0.06 : 0.045, 16)), m);
    pip.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.02);
    pips.push(m);
    lock.add(pip);
  });
  const plate = new THREE.Mesh(keep(new THREE.CircleGeometry(0.8, 40)), keep(new THREE.MeshStandardMaterial({ color: 0x1b1e26, metalness: 0.6, roughness: 0.45 })));
  plate.position.z = -0.01;
  const glowRing = new THREE.Mesh(keep(new THREE.RingGeometry(0.47, 0.56, 48)), keep(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
  glowRing.position.z = 0.02;
  lock.add(barrel, bezel, faceTurn, plate, glowRing);
  scene.add(lock);
  // a small light of its own over the key (the car far behind is not lit by it)
  const keySpot = new THREE.PointLight(0xffffff, 0, 4.5, 1.6);
  scene.add(keySpot);
  Object.assign(s, { fob, lockAt, keyRig, keyLevel, keyHalf, inBarrel, lock, faceTurn, pips, glowRing, keySpot });
};

// ---- the camera's shots: each { from, to, cam(u) => [position, target, fov, lift] } ----
// (k: wider screens need less, narrow ones more: distances are stretched by it; lift: the picture slid down by that
// share of its height, so the car stands high and the words go under it)
const carShots = (s, k) => {
  const { W, H, L } = s;
  const tall = Math.max(1, H / 1.6); // (a tall car, a van or a bus: the hero shot stands further back)
  return [
    { from: 0, to: 1.25, cam: (u) => [v3(-3.6 * k + u * 0.4, 0.38, 6.4 * k - u * 0.9), v3(0, H * 0.48, 0), 40] }, // SILHOUETTE: low, wide, front left
    { from: 1.25, to: 2.25, cam: (u) => [v3(W * 0.95 - u * 0.5, H * 0.42, L / 2 + 1.35 - u * 0.15), v3(W * 0.22 - u * 0.2, H * 0.4, L / 2 - 0.1), 38] }, // DETAIL: the front corner
    { from: 2.25, to: 3.35, cam: (u) => [v3(-6.2 * k, H * 0.62, -2.0 + u * 3.0), v3(0, H * 0.42, -0.9 + u * 2.2), 34] }, // TRACKING: the side
    { from: 3.35, to: 5.0, cam: (u) => { const d = lerp(9.6, 8.1, easeOut(u)) * k * tall; return [v3(d * 0.62, 1.35 + H * 0.3, d * 0.78), v3(0, H * 0.42, 0), 32, 0.17]; } }, // HERO
  ];
};
const keyShots = (s, k) => {
  const { lockAt: P, W, H, L, fob } = s;
  const tall = Math.max(1, H / 1.6);
  const opening = fob ? [
    // THE PRESS: one shot over the fob to the car: the fob large in the foreground (lower left), pointing at the car,
    // the car small and dark in the middle of the picture; a slow push in on the car (the lens closing in)
    { from: 1.4, to: 3.5, cam: (u) => [v3(0.75, 0.45, 2.0 + 2.1).add(P), v3(0, H * 0.42, 0), lerp(36, 28, smooth(u))] },
  ] : [
    { from: 1.4, to: 2.8, cam: (u) => [v3(-(2.8 - u * 0.3) * Math.sqrt(k), 0.45, 1.0 - u * 0.2).add(P), v3(0, 0, 0.6 - u * 0.25).add(P), 38] }, // INSERT: from the side
    { from: 2.8, to: 3.5, cam: (u) => [v3(0.32, 0.22, 2.25 - u * 0.2).add(P), v3(0, 0, 0.25).add(P), 34] }, // THE TURN: the barrel's face, from the driver
  ];
  return [
    { from: 0, to: 1.4, cam: (u) => [v3(0.15, 0.08 - u * 0.05, 2.0 + 2.9 - u * 0.35).add(P), v3(0, 0, 2.0).add(P), 34] }, // DARKNESS: the key, close
    ...opening,
    { from: 3.5, to: 4.6, cam: (u) => [v3(1.0 + u * 0.2, 0.55 + u * 0.15, 3.6 + u * 0.6).add(P), v3(0, -0.6, -3).add(P), 46] }, // BURST: past the lock to the car
    { from: 4.6, to: 5.6, cam: (u) => [v3(W * 0.95 - u * 0.45, H * 0.4, L / 2 + 1.3 - u * 0.1), v3(W * 0.25 - u * 0.15, H * 0.38, L / 2 - 0.1), 38] }, // LAMPS: the front corner, close
    { from: 5.6, to: 6.6, cam: (u) => [v3(-6.0 * k, H * 0.55, -2.4 + u * 3.2), v3(0, H * 0.42, -1.2 + u * 2.4), 34] }, // SIDE: a sweep along it
    { from: 6.6, to: 7.6, cam: (u) => [v3((W / 2 + 2.6 - u * 0.4) * Math.sqrt(k), H * 0.38, -(L / 2 + 3.4 - u * 0.5) * Math.sqrt(k)), v3(0, H * 0.42, -L * 0.15), 38] }, // REAR: low three-quarter
    { from: 7.6, to: 10.0, cam: (u) => { const d = lerp(10.8, 9.0, easeOut(u)) * k * tall; return [v3(-d * 0.62, 1.35 + H * 0.3, d * 0.78), v3(0, H * 0.42, 0), 32, 0.15]; } }, // HERO (the other side)
  ];
};

// ---- the words ----
const css = `
.ucine{position:fixed;inset:0;z-index:10000;background:#000;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
.ucine canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ucine-words{position:absolute;left:0;right:0;bottom:7%;text-align:center;pointer-events:none;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.ucine-words>*{opacity:0}
.ucine-tag{font-size:clamp(12px,1.6vw,17px);letter-spacing:.42em;font-weight:700;text-transform:uppercase;margin-bottom:.35em;text-shadow:0 1px 0 #000}
.ucine-big{font-size:clamp(26px,5.2vw,64px);letter-spacing:.18em;font-weight:900;text-transform:uppercase;line-height:1.05;margin-bottom:.12em;text-shadow:0 2px 0 #000}
.ucine-name{font-size:clamp(22px,4vw,48px);font-weight:800;line-height:1.1;text-shadow:0 2px 0 #000}
.ucine-stars{font-size:clamp(18px,2.6vw,30px);letter-spacing:.12em;margin:.15em 0 .3em;text-shadow:0 1px 0 #000}
.ucine-stars span{display:inline-block;opacity:0}
.ucine-rarity{display:inline-block;padding:.3em 1.4em;font-size:clamp(12px,1.5vw,16px);font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#0b0c10;border-radius:3px}
.ucine-skip{position:absolute;right:14px;top:10px;font:600 12px system-ui,sans-serif;color:#8a90a0;letter-spacing:.1em;pointer-events:none}
.ucine-sub{font-size:clamp(13px,1.7vw,18px);font-weight:700;letter-spacing:.06em;margin:.1em 0 .35em;color:#e9ecf2;text-shadow:0 1px 0 #000}
.ucine-hint{position:absolute;left:0;right:0;text-align:center;font:600 13px system-ui,sans-serif;color:#c3c8d4;letter-spacing:.28em;text-transform:uppercase;pointer-events:none;opacity:0}
`;

// ---- one play ----
export const playUnlock = ({ mode = 'car', carId = 'commuter', evil = false, loop = false, still = null, level = null } = {}) => {
  const car = carById(carId) || carById('commuter');
  if (!car) return null;
  const lite = !!(LITE.size || stillViews());
  const style = Object.assign(document.createElement('style'), { textContent: css + (DIRECTORS[mode]?.css || '') });
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
  const tag = Object.assign(document.createElement('div'), { className: 'ucine-tag', textContent: evil ? 'New ride' : 'New car' });
  tag.style.color = '#' + s.accent.getHexString();
  const big = Object.assign(document.createElement('div'), { className: 'ucine-big', textContent: 'Key unlocked' });
  const name = Object.assign(document.createElement('div'), { className: 'ucine-name', textContent: car.name || car.id });
  const starRow = Object.assign(document.createElement('div'), { className: 'ucine-stars' });
  starRow.style.color = starColour(car);
  for (const ch of stars(car)) starRow.append(Object.assign(document.createElement('span'), { textContent: ch }));
  const pill = Object.assign(document.createElement('div'), { className: 'ucine-rarity', textContent: rarityInfo.name });
  pill.style.background = rarityInfo.colour;
  const sub = Object.assign(document.createElement('div'), { className: 'ucine-sub' });
  const pips = Object.assign(document.createElement('div'), { className: 'ucine-pips' });
  const director = DIRECTORS[mode];
  if (director) words.append(...director.words.map((w) => ({ tag, big, name, stars: starRow, pill, sub, pips })[w]));
  else if (mode === 'key') words.append(big, name, starRow, pill); else words.append(tag, name, starRow, pill);
  const skipNote = Object.assign(document.createElement('div'), { className: 'ucine-skip', textContent: still === null ? 'TAP TO SKIP' : '' });
  const hint = Object.assign(document.createElement('div'), { className: 'ucine-hint', textContent: 'Tap to continue' });
  root.append(words, skipNote, hint);

  // the overlay drawn over the scene in the same canvas: vignette, flash, letterbox bars, fade
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  const over = new THREE.Scene();

  const quad = s.keep(new THREE.PlaneGeometry(2, 2));
  const vignette = new THREE.Mesh(s.keep(radialDisc([[0, 0], [0.8, 0], [1.45, 0.85], [2.3, 0.9]], 48)), s.keep(new THREE.MeshBasicMaterial({ color: 0x000000, vertexColors: true, transparent: true, depthTest: false, depthWrite: false })));
  const flashMat = s.keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  const flash = new THREE.Mesh(quad, flashMat);
  const barMat = s.keep(new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false }));
  const barTop = new THREE.Mesh(quad, barMat), barBottom = new THREE.Mesh(quad, barMat);
  const fadeMat = s.keep(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  const fade = new THREE.Mesh(quad, fadeMat);
  over.add(vignette, flash, barTop, barBottom, fade);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
  let shots = [], aspect = 1, k = 1;
  const view = { lift: 0, shift: 0 };
  let d = null; // (another cinematic's director: render/ecucine.js)
  const resize = () => {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    let ratio = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5);
    ratio = Math.min(ratio, Math.sqrt(1.3e6 / Math.max(1, w * h)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    aspect = w / h;
    k = Math.pow(Math.max(1, 1.6 / aspect), 0.7);
    shots = d ? d.shots(k, aspect) : mode === 'key' ? keyShots(s, k) : carShots(s, k);
    // letterbox: the picture about 2.2:1 where the screen is wider than tall, never more than 11% a bar
    const bar = clamp((1 - (w / 2.2) / h) / 2, 0.04, 0.11);
    barTop.scale.set(1, bar, 1); barTop.position.y = 1 - bar;
    barBottom.scale.set(1, bar, 1); barBottom.position.y = -1 + bar;
    words.style.bottom = (bar * 50 + 4) + '%';
    hint.style.bottom = Math.max(1, bar * 50 - 3.2) + '%';
  };
  const shakeAt = (t, t0, amount) => shake(t, t0, amount);
  if (director) d = director({ s, car, evil, lite, level, camera, root, words: { tag, big, name, sub, pill, starRow, pips }, flashMat, fadeMat, view, shake: shakeAt, shotAt: (t) => shotAt(t), sparks: (...a) => setSparks(...a), live: still === null, size: () => ({ w: root.clientWidth || innerWidth, h: root.clientHeight || innerHeight }) });
  resize();

  const total = d ? (lite ? DURATION.lite : d.total) : lite ? DURATION.lite : DURATION[mode];
  const hintAt = d ? (lite ? HINT.lite : d.hint) : lite ? HINT.lite : HINT[mode];
  // the words' timings
  const reveal = d ? d.reveal : mode === 'key' ? { tag: 7.75, big: 7.8, name: 8.1, stars: 8.35, pill: 8.65 } : { tag: 3.5, name: 3.62, stars: 3.88, pill: 4.12 };
  const setWords = (t) => {
    const at = lite ? { tag: 0.35, big: 0.35, name: 0.45, stars: 0.55, pill: 0.65, sub: 0.7 } : reveal;
    const show = (el, t0, rise = 14) => {
      const u = lite ? span(t, t0, t0 + 0.4) : easeOut(span(t, t0, t0 + 0.35));
      el.style.opacity = u.toFixed(3);
      el.style.transform = lite ? '' : `translateY(${((1 - u) * rise).toFixed(1)}px)`;
    };
    show(sub, at.sub ?? 99, 8);
    show(pips, at.pips ?? 99, 6);
    show(tag, at.tag, 8);
    if (at.big !== undefined) {
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
    hint.style.opacity = loop ? '0' : (0.85 * span(t, hintAt, hintAt + 0.3)).toFixed(3);
    skipNote.style.opacity = t >= hintAt ? '0' : '1';
  };

  // sparks: where each is at time t
  const sparkPos = s.sparkGeo.attributes.position, sparkCol = s.sparkGeo.attributes.color, col = new THREE.Color();
  const rainbow = mode === 'key' && !!car.bespoke;
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
          if (rainbow) col.setHSL((sd.hue + t * 0.1) % 1, 0.85, 0.62); else col.copy(s.accent).lerp(WHITE, sd.hue * 0.5);
          col.multiplyScalar(1 - age / life);
        }
      } else if (sd.kind === 'dust' && dustOn > 0) {
        p = v3(origin.x + (sd.dir.x * 1.6) + Math.sin(t * 0.3 + sd.wob) * 0.25, origin.y + sd.dir.y * 1.2 + Math.sin(t * 0.21 + sd.wob * 2) * 0.2, origin.z + sd.dir.z * 1.2);
        col.setRGB(0.55 * dustOn, 0.58 * dustOn, 0.65 * dustOn).multiplyScalar(0.5 + 0.5 * Math.sin(t * 1.3 + sd.wob));
      }
      if (p) { sparkPos.setXYZ(n, p.x, p.y, p.z); sparkCol.setXYZ(n, col.r, col.g, col.b); n++; }
    }
    s.sparkGeo.setDrawRange(0, n);
    sparkPos.needsUpdate = true; sparkCol.needsUpdate = true;
  };

  const shake = (t, t0, amount) => {
    if (t < t0) return v3(0, 0, 0);
    const e = Math.exp(-(t - t0) * 7) * amount;
    return v3(Math.sin(t * 71) * e, Math.sin(t * 53 + 1) * e, Math.sin(t * 47 + 2) * e * 0.5);
  };
  const shotAt = (t) => {
    const shot = lite ? shots[shots.length - 1] : shots.find(x => t < x.to) || shots[shots.length - 1];
    const u = lite ? 1 : span(t, shot.from, shot.to);
    const [pos, target, fov, lift = 0, shift = 0] = shot.cam(smooth(u) * 0.5 + u * 0.5);
    view.lift = lift * Math.min(1, aspect); // (a tall screen has room under the car as it is)
    view.shift = aspect > 1.1 ? shift : 0; // (sideways: a panel of words beside the car, on a wide screen only)
    return [pos, target, fov];
  };
  // a flicker then on: 0 before a, a short blink at a, steady from b
  const powerOn = (t, a, b) => (t >= b ? 1 : t >= a && t < a + 0.06 ? 1 : 0);

  // ---- the state of everything at time t ----
  const setCar = (t) => {
    const lt = lite ? 99 : t; // (the lite version: everything as at the end)
    const [pos, target, fov] = shotAt(t);
    camera.position.copy(pos); camera.fov = fov; camera.lookAt(target);
    const { W, H, L } = s;
    // lights: dark, a rim, then the key light sweeping on in the detail shot, full from the side shot
    const on = smooth(span(lt, 1.3, 2.1));
    s.hemi.intensity = 0.02 + on * 1.35;
    s.keyLight.intensity = on * 2.4;
    const sweep = lerp(1.6, 0.5, smooth(span(lt, 1.25, 2.6))); // (from the right across the nose)
    s.keyLight.position.set(Math.sin(sweep) * 8, 6, Math.cos(sweep) * 8);
    s.rim.intensity = 1.2 + 1.6 * smooth(span(lt, 0.1, 0.8));
    s.rim2.intensity = 0.8 * smooth(span(lt, 0.3, 1.0)) + on * 0.6;
    s.backGlow.material.opacity = 0.75 * smooth(span(lt, 0.0, 0.7)) * (1 - 0.55 * on);
    s.pool.material.opacity = 0.15 + 0.35 * on;
    // the lamps: off in the dark, the headlamps flickering on in the detail shot, the tail lamps with the light
    setLamp(s.lamps, 'head', powerOn(lt, 1.4, 1.5), 1 - 0.5 * on);
    setLamp(s.lamps, 'tail', powerOn(lt, 2.25, 2.3), 0.8);
    setLamp(s.lamps, 'amber', 0);
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
    s.rays.material.opacity = pulse * 0.35; s.rays.scale.setScalar(4 + f * 3); s.rays.mesh.rotation.z = t * 0.15;
    setSparks(t, origin, fT, 0.45, Math.max(W, L) * 0.65, !lite, 0);
    s.sparks.material.size = 0.11;
    s.model.userData.animate?.(lt === 99 ? 2.4 : t);
    flashMat.opacity = lite ? 0 : 0.35 * (t >= fT ? Math.exp(-(t - fT) * 9) : 0);
    flashMat.color.copy(s.accent).lerp(WHITE, 0.5);
    fadeMat.opacity = 1 - (lite ? span(t, 0, 0.5) : span(t, 0, 0.35)); // (in from black; no fade out: the end is held)
  };

  const CLICK = s.fob ? FOB.blinks[1] : 3.1; // (the moment: the ignition's click, or the car's second blink for a fob)
  const setKey = (t) => {
    const lt = lite ? 99 : t;
    const [pos, target, fov] = shotAt(t);
    camera.position.copy(pos).add(lite ? v3(0, 0, 0) : shake(t, CLICK, s.fob ? 0.02 : 0.07));
    camera.fov = fov; camera.lookAt(target);
    const { H, L, lockAt: P } = s;
    const opening = !lite && t < 4.6; // (the key's part)
    // the key: standing and turning slowly (the first shot); then the blade in the barrel and the turn, or the fob held up
    s.keyRig.visible = opening;
    s.lock.visible = opening && !s.fob && t >= 1.4;
    const pose = keyPose(lite ? 0 : t, { fob: s.fob, P, keyHalf: s.keyHalf, inBarrel: s.inBarrel, click: CLICK }); // (continuous through the cuts: render/keypose.js)
    s.keyLevel.quaternion.identity();
    s.keyRig.position.copy(pose.pos);
    s.keyRig.quaternion.copy(pose.quat);
    s.faceTurn.rotation.z = pose.turn;
    // the barrel's marks: LOCK lit as the key is home, ACC half way round, ON (the rarity's colour) at the click
    if (!s.fob) {
      const turnU = span(t, 2.9, CLICK);
      const lit = [t >= 2.75, turnU >= 0.5, t >= CLICK];
      s.pips.forEach((m, i) => m.color.set(!lit[i] ? 0x222630 : i === 2 ? s.accent : 0xfff2c8));
    }
    const ringPulse = t >= CLICK ? Math.exp(-(t - CLICK) * 1.6) : 0;
    s.glowRing.material.opacity = lite || s.fob ? 0 : 0.2 * span(t, 1.9, 2.8) + ringPulse * 0.9;
    // the key's own little light
    if (s.fob) s.keySpot.position.copy(t < 1.0 ? v3(P.x + 0.5, P.y + 0.9, P.z + 2.9) : v3(P.x + 0.5, P.y + 0.9, P.z + 2.9).lerp(v3(P.x - 1.2, P.y + 0.25, P.z + 2.4), smooth(span(t, 0.9, 1.3)))); // (to the side as it turns face up: no glare)
    else if (t < 1.4) s.keySpot.position.set(P.x + 0.5, P.y + 0.9, P.z + 2.9);
    else if (t < 2.8) s.keySpot.position.set(P.x - 1.0, P.y + 0.7, P.z + 1.5); // (the insert, seen from the left: lit from the left)
    else s.keySpot.position.set(P.x + 0.3, P.y + 0.6, P.z + 1.7);
    const press = !lite && s.fob ? pose.press : 0; // (the fob's button pressed: a pulse of light at it)
    s.keySpot.intensity = !opening ? 0 : 9 * smooth(span(t, 0.3, 1.2)) * (s.fob ? 1 - 0.45 * smooth(span(t, 0.9, 1.3)) : 1) + 10 * ringPulse;
    // the car's lights. Dark until the burst; its edges lit by the burst (a glimpse); a little fill as the headlamp
    // comes on (LAMPS); the key light sweeping across (SIDE); full from the rear shot on
    const on = smooth(span(lt, 5.6, 6.4));
    const blinkA = s.fob && t >= FOB.blinks[0] && t < FOB.blinks[0] + FOB.blink, blinkB = s.fob && t >= FOB.blinks[1] && t < FOB.blinks[1] + FOB.blink; // (the car's two blinks: only after the press)
    const awake = s.fob && !lite && t >= FOB.blinks[1] + FOB.blink && t < 4.6; // (then its lamps stay on, low: the car awake)
    const blink = !lite && (blinkA || blinkB);
    s.hemi.intensity = 0.03 + (s.fob && !lite && t >= 1.4 && t < 3.5 ? 0.14 : 0) + (blink ? 0.3 : 0) + 0.3 * smooth(span(lt, 4.6, 5.0)) * (1 - on) + on * 1.35;
    s.keyLight.intensity = on * 2.5;
    const sweep = lerp(-1.4, 0.6, smooth(span(lt, 5.6, 6.5)));
    s.keyLight.position.set(Math.sin(sweep) * 8, 6, Math.cos(sweep) * 8);
    const glimpse = !lite && t >= CLICK && t < 4.6 ? 1.6 * Math.exp(-((t - CLICK - 0.4) ** 2) * 3) : 0;
    s.rim.intensity = 2.6 * smooth(span(lt, CLICK + 0.2, 4.4)) + glimpse;
    s.rim2.intensity = 1.2 * smooth(span(lt, CLICK + 0.5, 4.6)) + on * 0.5 + glimpse * 0.8;
    s.backGlow.material.opacity = 0.85 * smooth(span(lt, CLICK + 0.05, 4.2)) * (1 - 0.6 * on);
    s.pool.material.opacity = 0.05 + 0.4 * on;
    s.beamMat.opacity = 0; s.spotPool.material.opacity = 0;
    // the lamps: the fob's blinks (indicators and headlamps); the headlamp flickering on (LAMPS); the tail lamps (REAR)
    setLamp(s.lamps, 'amber', blink ? 1 : 0, 1.4);
    setLamp(s.lamps, 'head', blink || awake ? 1 : powerOn(lt, 4.85, 5.0), blink ? 1.3 : awake ? 0.35 : 1 - 0.5 * on);
    setLamp(s.lamps, 'tail', blink ? 1 : powerOn(lt, 6.75, 6.8), 0.9);
    // the light burst at the moment: core, streak, rays (slow motion), sparks; in the hero shot, a soft one behind the car
    const origin = t < 4.6 ? (s.fob ? pose.pos.clone().add(v3(0, 0, -0.7)) : v3(P.x, P.y, P.z + 0.05)) : v3(0, H * 0.55, -L * 0.2);
    s.flareCore.position.copy(origin); s.streak.position.copy(origin); s.rays.position.copy(origin);
    const fromLock = s.fob ? t >= 3.5 : t >= CLICK; // (the fob's burst: from the cut to it)
    const pulse = !lite && fromLock && t < 4.6 ? Math.exp(-(t - (s.fob ? 3.5 : CLICK)) * 0.9) : 0;
    const settle = !lite && t >= 7.6 ? 0.4 * Math.exp(-(t - 7.6) * 1.2) : 0;
    // (the fob's press: a small light at its face, then a pulse leaving its tip for the car, 2.25-2.55)
    const fly = s.fob && !lite && t >= FOB.pulse[0] && t < FOB.pulse[1] ? span(t, FOB.pulse[0], FOB.pulse[1]) : -1;
    if (fly >= 0) {
      const tip = pose.pos.clone().addScaledVector(v3(0, 1, 0).applyQuaternion(pose.quat), 0.55);
      s.flareCore.position.copy(tip.lerp(v3(0, H * 0.45, L / 2), smooth(fly)));
    } else if (press) s.flareCore.position.copy(pose.pos).addScaledVector(v3(0, 0, 1).applyQuaternion(pose.quat), 0.08);
    s.flareCore.material.opacity = Math.min(1, pulse * 1.1 + settle + press * 0.95 + (fly >= 0 ? 0.9 * (1 - fly * 0.5) : 0));
    s.flareCore.scale.setScalar(fly >= 0 ? 0.3 : press ? 0.2 + press * 0.25 : 1.2 + pulse * 2.4 + settle * 6);
    s.streak.material.opacity = pulse * 0.9 + settle; s.streak.scale.set(7 + (1 - pulse) * 5, 0.12, 1);
    s.rays.material.opacity = pulse * 0.55 + settle * 0.6; s.rays.scale.setScalar(2.5 + Math.max(0, t - CLICK) * 0.9); s.rays.mesh.rotation.z = t * 0.08;
    if (t < 4.6) setSparks(t, origin, s.fob ? 3.5 : CLICK, 1.1, 2.2, !lite && !press, lite ? 0 : smooth(span(t, 0.2, 1.0)) * (t < 1.4 ? 1 : 0));
    else setSparks(t, origin, 7.6, 0.6, Math.max(s.W, L) * 0.6, !lite, 0);
    s.sparks.material.size = t < 4.6 ? 0.045 : 0.1;
    s.model.userData.animate?.(lt === 99 ? 2.4 : t);
    // the flash at the moment: white, going to the rarity's colour (the fob's: smaller)
    if (!lite && t >= CLICK && t < CLICK + 0.9) {
      const a = t - CLICK;
      flashMat.opacity = (a < 0.06 ? 1 : Math.exp(-(a - 0.06) * 6) * 0.75) * (s.fob ? 0.1 : 1); // (short: the key turned home shows through it)
      flashMat.color.set(0xffffff).lerp(s.accent, clamp(a / (s.fob ? 0.1 : 0.35)));
    } else flashMat.opacity = 0;
    const fadeIn = lite ? span(t, 0, 0.5) : span(t, 0, 0.6);
    // (a dip to black on the cut to the car's lamps: from the light of the burst into the dark)
    const dip = lite ? 0 : Math.max(span(t, 4.4, 4.6) * (t < 4.6 ? 1 : 0), t >= 4.6 ? 1 - span(t, 4.6, 4.85) : 0);
    fadeMat.opacity = Math.max(1 - fadeIn, dip);
  };

  // sound cues: [time, name, volume]
  const CUES = lite ? [] : d ? d.cues : mode === 'key'
    ? [[0.15, 'rumble', 0.6],
      ...(s.fob
        ? [[FOB.press, 'camera', 0.7], [FOB.blinks[0], 'bell', 0.7], [FOB.blinks[1], 'bell', 0.8], [FOB.blinks[1] + 0.02, 'drum', 0.5], [3.5, 'burst', 0.5]]
        : [[1.5, 'throw', 0.5], [1.9, 'camera', 0.8], [2.15, 'camera', 0.8], [2.4, 'camera', 0.9], [3.08, 'crash', 0.9], [3.1, 'drum', 1], [3.14, 'burst', 0.7]]),
      [4.85, 'camera', 0.5], [5.0, 'turbo', 0.6], [6.8, 'drum', 0.5], [7.8, 'bell', 0.8], [8.65, 'menuPick', 0.7]]
    : [[0.05, 'rumble', 0.35], [1.25, 'throw', 0.45], [1.5, 'camera', 0.4], [2.55, 'drum', 0.9], [2.56, 'turbo', 0.5], [3.62, 'menuPick', 0.7], [4.12, 'bell', 0.7]];

  // ---- the loop ----
  let raf = 0, startAt = 0, lastT = -1, done = false, held = false;
  const frame = (t) => {
    if (d) d.set(t); else if (mode === 'key') setKey(t); else setCar(t);
    camera.aspect = aspect;
    if (view.lift || view.shift) camera.setViewOffset(1000 * aspect, 1000, view.shift * 1000 * aspect, view.lift * 1000, 1000 * aspect, 1000); else camera.clearViewOffset(); // (the picture slid: the subject higher, or to one side)
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const g of s.facing) g.quaternion.copy(camera.quaternion); // (the glows face the camera)
    d?.post?.(t); // (page labels pinned to things in the picture)
    setWords(t);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(s.scene, camera);
    renderer.clearDepth();
    renderer.render(over, ortho);
  };
  // the end: the last frame drawn once and HELD (nothing more drawn) until a tap or a key
  const hold = () => {
    held = true;
    cancelAnimationFrame(raf); raf = 0;
    d?.stop?.();
    frame(total);
  };
  const tick = (now) => {
    if (done || held) return;
    raf = requestAnimationFrame(tick);
    if (!startAt) startAt = now;
    let t = (now - startAt) / 1000;
    if (t >= total) {
      if (!loop) { hold(); return; }
      startAt = now; t = 0; lastT = -1;
    }
    for (const [at, nameOf, vol] of CUES) if (lastT < at && t >= at) Sound.play(nameOf, vol);
    lastT = t;
    d?.sound?.(t);
    frame(t);
  };
  const close = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    d?.stop?.();
    removeEventListener('resize', onResize);
    removeEventListener('keydown', onKey, true);
    root.remove(); style.remove();
    s.scene.traverse((node) => { node.geometry?.dispose(); for (const m of [].concat(node.material || [])) { m.map?.dispose(); m.dispose(); } });
    for (const x of s.own) x.dispose?.();
    renderer.dispose();
    renderer.forceContextLoss();
  };
  // a tap or a key: while it plays, to the held end; at the end (or a still), closed
  const skip = () => { if (held || still !== null) close(); else hold(); };
  const onResize = () => { resize(); if (still !== null) frame(still); else if (held) frame(total); };
  const onKey = (e) => {
    if (['Escape', 'Space', 'Enter', 'NumpadEnter'].includes(e.code) || ['Escape', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); skip(); }
  };
  root.addEventListener('click', (e) => { e.stopPropagation(); skip(); }); // (on the click, the last of a tap's events: nothing under it gets the tap)
  addEventListener('resize', onResize);
  addEventListener('keydown', onKey, true);

  if (still !== null) { const t = clamp(still, 0, total); requestAnimationFrame(() => { resize(); frame(t); }); }
  else raf = requestAnimationFrame(tick);
  return { close, skip, get done() { return done; }, get held() { return held; }, total };
};

export { clamp, lerp, span, smooth, easeOut, easeIn, v3, rand, WHITE, setLamp };

// ---- the address: ?unlockcine=car:<id> | key:<id> [&evil] [&loop] [&still=<s>] ----
const raw = params.get('unlockcine');
if (raw) {
  const [kind, id, level] = raw.includes(':') ? raw.split(':') : ['car', raw];
  const start = () => playUnlock({
    mode: ['key', 'jim', 'ecu', 'ecumax'].includes(kind) ? kind : 'car', carId: (id || 'commuter').trim(), level: level ? Number(level) : null, evil: params.has('evil'), loop: params.has('loop'),
    still: params.has('still') ? Number(params.get('still')) || 0 : null,
  });
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start, { once: true }); else start();
}
