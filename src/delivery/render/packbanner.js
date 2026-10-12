// ---- THE PACK BANNER TEMPLATE: up to three cars in ONE scene, posed like an Asphalt promo banner (the owner, 12-Oct:
// "recreate the poses here"; then "plop 3 cars into it and re-shoot"): a staggered row, the first car (the HERO) nearest,
// on the right and lowest, the others back to the left, each turned a little less; a low camera in front; reflections
// and shadows on one ground; glowing headlamps; rim light; a warm blurred backdrop. EVERY number is in BANNER below: change
// it there and re-shoot. Nothing here knows about packs: the Shop's featured tile (render/shop.js) and "What's inside"
// (render/packcontents.js) hand it the featured cars (bannerCars), and get an element back (bannerArt).
// API:
//   renderPackBanner(cars, { width, height, evil, config }) -> a canvas (the cars, their shadows and ground, see-through
//     elsewhere) or null (no WebGL, no car built). cars: 1 to 3 car objects or ids, the first the hero. width/height in px
//   bannerArt(cars, { labels, evil, className, onFail }) -> an element: the backdrop (BANNER.backdrop), the cars' picture
//     (drawn once it has a size, again at a new one; kept by cars, side and size in 20 px steps), the names in pink labels
//   bannerCars(featured) -> a pack's featured entries as the banner's cars (each car once, at most 3), null under two
// RE-SHOOT ANY TRIO (a debug page, seen only by asking for it): index.html?banner=<id>,<id>,<id> (1 to 3 ids, the hero
// first), &w=<px>&h=<px> (the banner's size, default 1600x800), &evil (the Evil livery), &labels=0 (no names). E.g.
//   node scripts/shots.mjs shots "trio=index.html?banner=wedge,midnight,splitwindow&w=1280&h=640" --size=1280x640
//     --wait=8000 --browser=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
// The picture is drawn ONCE by the menu's one renderer (modelviews.js sharedRenderer: no WebGL context of its own). No
// WebGL: bannerArt calls its onFail and the caller keeps its old art.
import * as THREE from 'three';
import '../shop.css';
import { makeShowCar, paintShowCar } from './showcar.js';
import { carById } from '../cars.js';
import { sharedRenderer, STILL } from './modelviews.js';

// ALL the template's numbers (radians, degrees, shares of the picture, three.js light intensities). Settled on stills of
// several trios (wedge/midnight/splitwindow, gullwing/classicgt/snake, jetcar/dragster/flyingcar, doubledecker/bubble/monster)
export const BANNER = {
  // the camera
  lift: 0.075,      // its height: an angle up from level, just above the bumpers
  fov: 18,          // its lens: long, so the cars further back stay nearly the hero's size (the owner: "further in front")
  marginX: 0.86, marginY: 0.8, // the share of the picture's half width / height the whole group may take (never cropped)
  shiftX: 0.1, shiftY: -0.2,  // the group's middle moved right / up by this share of the half picture (room for the labels)
  // the row
  heading: 0.55,    // the hero's nose turned this far to the right of straight at the camera (a front three-quarter)
  fan: 0.4,         // each car further back turned this much less (the last one's nose to the left, as in the reference)
  row: 0.6,         // the row's line: from the hero back to the left, this far round from straight across (more: deeper)
  gap: 0.9,         // the space between two cars' footprints (m, at their scaled size): every car's face shows
  weight: 0.6,      // the size pull: 0 real sizes; 1 every car the same size (by length x height); between, part way
  scaleMin: 0.6, scaleMax: 1.6, // and never more than this
  // the light
  sky: { colour: 0xffe4c8, ground: 0x1c1a22, intensity: 1.25 },              // a low warm sky
  key: { colour: 0xfff2e0, intensity: 1.6, at: [6, 5, 9] },                 // from the camera's right
  rim: { colour: 0xffb468, intensity: 2.6, at: [-4, 6, -10] },               // a warm rim from behind (roofs, backs)
  fill: { colour: 0x8fb2ff, intensity: 0.55, at: [-9, 2, 3] },               // a cool fill from the left
  // the ground and what is on it
  ground: [[0, 'rgba(78,74,80,0.97)'], [0.3, 'rgba(70,66,72,0.94)'], [0.7, 'rgba(62,58,64,0.5)'], [1, 'rgba(62,58,64,0)']], // its colour out from the middle (opaque: weaker reflections)
  groundSize: [60, 40],                                                       // m across / deep
  reflections: true,                                                          // the cars mirrored under it
  shadow: { opacity: 0.9, wider: 1.35, longer: 1.18 },                        // a soft blot under each car, this much bigger than it
  glow: { size: 0.62, opacity: 0.95 },                                        // a glow on each headlamp (m, at the car's scale)
  // the backdrop (CSS, behind the picture): a sky, a town out of focus in it, a vignette over everything
  backdrop: {
    sky: 'radial-gradient(42% 30% at 72% 30%, rgba(255, 214, 160, .55), transparent 70%), radial-gradient(26% 40% at 12% 34%, rgba(122, 82, 58, .75), transparent 72%), radial-gradient(22% 34% at 38% 38%, rgba(150, 104, 72, .6), transparent 72%), radial-gradient(30% 30% at 90% 42%, rgba(120, 84, 66, .55), transparent 72%), radial-gradient(18% 26% at 58% 44%, rgba(176, 128, 92, .45), transparent 72%), linear-gradient(180deg, #e2c4a2 0%, #cfa482 30%, #a8806a 48%, #6e6066 58%, #4a464e 70%, #2e2c34 100%)',
    town: 'linear-gradient(#8a6650, #8a6650) 6% 18% / 13% 40% no-repeat, linear-gradient(#a27a5e, #a27a5e) 19% 28% / 15% 30% no-repeat, linear-gradient(#7c5c4a, #7c5c4a) 33% 12% / 10% 46% no-repeat, linear-gradient(#b08a6c, #b08a6c) 46% 30% / 18% 28% no-repeat, linear-gradient(#94705a, #94705a) 64% 22% / 12% 36% no-repeat, linear-gradient(#c7a184, #c7a184) 86% 4% / 4% 52% no-repeat, linear-gradient(#9c765e, #9c765e) 92% 30% / 16% 28% no-repeat, repeating-linear-gradient(90deg, transparent 0 18px, rgba(60, 40, 34, .35) 18px 24px) 0 26% / 100% 18% no-repeat',
    townBlur: 7, townOpacity: 0.8, // px, 0..1
    vignette: 'radial-gradient(120% 90% at 60% 55%, transparent 55%, rgba(10, 8, 16, .55) 100%)',
  },
};

// soft round textures, made once: a dark blot (the shadows) and a warm glow (the headlamps)
let blot, glow, groundTex, groundOf = null;
const radial = (stops, size = 128) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d'), grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, colour] of stops) grad.addColorStop(at, colour);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const textures = (o) => {
  blot ??= radial([[0, 'rgba(0,0,0,0.95)'], [0.45, 'rgba(0,0,0,0.7)'], [1, 'rgba(0,0,0,0)']]);
  glow ??= radial([[0, 'rgba(255,250,232,1)'], [0.18, 'rgba(255,236,190,0.75)'], [0.5, 'rgba(255,200,140,0.18)'], [1, 'rgba(255,190,120,0)']]);
  if (groundOf !== o.ground) { groundTex?.dispose(); groundTex = radial(o.ground, 256); groundOf = o.ground; }
  return { blot, glow, groundTex };
};

// a model's headlamps: its unlit (MeshBasic) parts of a warm white, in the front fifth of it. Their places in the
// model's own frame, for a glow each
const lampsOf = (model, box) => {
  const out = [], len = box.max.z - box.min.z, front = box.max.z - len * 0.22, p = new THREE.Vector3();
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  model.traverse((m) => {
    const mat = m.isMesh && !Array.isArray(m.material) ? m.material : null;
    if (!mat?.isMeshBasicMaterial || !mat.color || mat.transparent) return;
    const { r, g, b } = mat.color;
    if (!(r > 0.85 && g > 0.8 && b > 0.55 && b < r + 0.02)) return; // (warm white: not a red tail lamp, not a blue light bar)
    m.getWorldPosition(p).applyMatrix4(inv);
    if (p.z >= front && p.y < box.max.y * 0.8) out.push(p.clone());
  });
  // one glow a lamp: lamps close together (a lamp in parts) count once
  return out.filter((q, i) => !out.slice(0, i).some(o => o.distanceTo(q) < 0.25)).slice(0, 4);
};

// do two footprints overlap ({ x, z, h: heading, w, l }: a turned rectangle on the ground)? The separating-axis test
const axesOf = (f) => [[Math.cos(f.h), -Math.sin(f.h)], [Math.sin(f.h), Math.cos(f.h)]];
const cornersOf = (f) => {
  const [[ax, az], [bx, bz]] = axesOf(f), out = [];
  for (const i of [-1, 1]) for (const j of [-1, 1]) out.push([f.x + ax * i * f.w / 2 + bx * j * f.l / 2, f.z + az * i * f.w / 2 + bz * j * f.l / 2]);
  return out;
};
const overlap = (a, b) => {
  const ca = cornersOf(a), cb = cornersOf(b);
  for (const [nx, nz] of [...axesOf(a), ...axesOf(b)]) {
    const pa = ca.map(([x, z]) => x * nx + z * nz), pb = cb.map(([x, z]) => x * nx + z * nz);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
};
// the scene: { scene, camera, offset } for a picture of aspect w/h, or null (no car could be built)
// cars: car objects (the first the hero); evil: their Evil livery; o: the numbers (BANNER, or a copy with some changed)
export const bannerScene = (cars, aspect, { evil = false, config: o = BANNER } = {}) => {
  const { blot: shadowTex, glow: glowTex, groundTex: floorTex } = textures(o);
  const scene = new THREE.Scene();
  // light: a low warm sky, a key from the camera's right, a strong warm RIM from behind (it outlines roofs and backs),
  // a cool fill from the left
  scene.add(new THREE.HemisphereLight(o.sky.colour, o.sky.ground, o.sky.intensity));
  for (const l of [o.key, o.rim, o.fill]) { const light = new THREE.DirectionalLight(l.colour, l.intensity); light.position.set(...l.at); scene.add(light); }

  const built = [];
  for (const car of cars) {
    try {
      const model = makeShowCar(car);
      paintShowCar(model, car, evil);
      model.userData.animate?.(STILL.t);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      if (box.isEmpty()) continue;
      built.push({ car, model, box, size: box.getSize(new THREE.Vector3()) });
    } catch (error) { console.warn('No model for the banner: ' + (error?.message || error)); }
  }
  if (!built.length) return null;
  // toward a common size, part way: by length x height (a long low car and a short tall one weigh alike)
  const weightOf = (b) => Math.sqrt(Math.max(0.1, b.size.z) * Math.max(0.1, b.size.y));
  const mean = Math.exp(built.reduce((n, b) => n + Math.log(weightOf(b)), 0) / built.length);
  for (const b of built) b.scale = Math.min(o.scaleMax, Math.max(o.scaleMin, (mean / weightOf(b)) ** o.weight));

  // the row: the hero at the origin, the next to its left and back, each turned a little less
  const mirror = new THREE.Group(); mirror.scale.y = -1; // (the reflections: the same cars upside down under the ground)
  scene.add(mirror);
  const corners = [], feet = [];
  let at = new THREE.Vector3(), prev = null;
  built.forEach((b, i) => {
    const heading = o.heading - i * o.fan;
    const w = b.size.x * b.scale, l = b.size.z * b.scale;
    if (prev) { // along the row's line from the one before (back and to the left), as close as it can stand: the two
      // footprints, turned, a `gap` apart (a separating-axis test, stepped out until it is clear of every car before)
      const rowDir = new THREE.Vector3(-Math.cos(o.row), 0, -Math.sin(o.row));
      const me = (d) => ({ x: prev.at.x + rowDir.x * d, z: prev.at.z + rowDir.z * d, h: heading, w: w + o.gap, l: l + o.gap });
      let d = 0.2;
      while (d < 40 && feet.some(f => overlap(f, me(d)))) d += 0.05;
      at = new THREE.Vector3(me(d).x, 0, me(d).z);
    }
    feet.push({ x: at.x, z: at.z, h: heading, w, l });
    const place = (group) => {
      const holder = new THREE.Group(), turn = new THREE.Group();
      holder.position.set(-(b.box.min.x + b.box.max.x) / 2, -b.box.min.y, -(b.box.min.z + b.box.max.z) / 2);
      turn.rotation.y = heading;
      turn.scale.setScalar(b.scale);
      turn.position.copy(at);
      turn.add(holder);
      group.add(turn);
      return holder;
    };
    place(scene).add(b.model);
    if (o.reflections) place(mirror).add(b.model.clone());
    // its shadow: a soft dark blot under it, a little bigger than its footprint
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: o.shadow.opacity }));
    shadow.rotation.set(-Math.PI / 2, heading, 0, 'YXZ');
    shadow.scale.set(w * o.shadow.wider, l * o.shadow.longer, 1);
    shadow.position.set(at.x, 0.012, at.z);
    shadow.renderOrder = 2;
    scene.add(shadow);
    // its headlamps, glowing
    for (const p of lampsOf(b.model, b.box)) {
      const local = p.clone().sub(new THREE.Vector3((b.box.min.x + b.box.max.x) / 2, b.box.min.y, (b.box.min.z + b.box.max.z) / 2));
      const world = local.multiplyScalar(b.scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading).add(at);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o.glow.opacity }));
      s.position.copy(world).add(new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(0.06));
      s.scale.setScalar(o.glow.size * b.scale);
      s.renderOrder = 3;
      scene.add(s);
    }
    // its turned box's corners, for the framing
    const c = Math.cos(heading), sn = Math.sin(heading), hx = w / 2, hz = l / 2, h = b.size.y * b.scale;
    for (const x of [-hx, hx]) for (const z of [-hz, hz]) for (const y of [0, h]) corners.push(new THREE.Vector3(at.x + x * c + z * sn, y, at.z - x * sn + z * c));
    if (o.reflections) for (const x of [-hx, hx]) for (const z of [-hz, hz]) corners.push(new THREE.Vector3(at.x + x * c + z * sn, -h * 0.35, at.z - x * sn + z * c)); // (room for the reflections)
    prev = { at };
  });
  // the ground: dark, a little see-through (the reflections under it dimmed), fading out at its edge into the backdrop
  const mid = new THREE.Box3().setFromPoints(corners).getCenter(new THREE.Vector3());
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(o.groundSize[0], o.groundSize[1], 1);
  floor.position.set(mid.x, 0, mid.z);
  floor.renderOrder = 1;
  scene.add(floor);

  // the camera: low, in front, aimed at the group's middle at half the hero's height; put back until every corner fits
  const camera = new THREE.PerspectiveCamera(o.fov, aspect, 0.05, 1000);
  const target = new THREE.Vector3(mid.x, built[0].size.y * built[0].scale * 0.45, mid.z);
  const dir = new THREE.Vector3(0, Math.sin(o.lift), Math.cos(o.lift));
  const v = new THREE.Vector3();
  const span = (d) => {
    camera.position.copy(target).addScaledVector(dir, d);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of corners) {
      v.copy(p).applyMatrix4(camera.matrixWorldInverse);
      if (v.z > -camera.near) return null;
      v.applyMatrix4(camera.projectionMatrix);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    return { w: (x1 - x0) / 2, h: (y1 - y0) / 2, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  const fits = (s) => s && s.w <= o.marginX && s.h <= o.marginY;
  const size = new THREE.Box3().setFromPoints(corners).getSize(new THREE.Vector3()).length();
  let near = size * 0.05, far = size * 40;
  for (let i = 0; i < 30; i++) { const d = (near + far) / 2; if (fits(span(d))) far = d; else near = d; }
  const s = span(far);
  // (offset: a share of the picture to slide the view by: the group's middle to (shiftX, shiftY))
  return { scene, camera, offset: s ? { x: (s.cx - o.shiftX) / 2, y: -(s.cy - o.shiftY) / 2 } : { x: 0, y: 0 } };
};

const disposeScene = (scene) => scene.traverse((node) => {
  if (node.isSprite || node.geometry?.type === 'PlaneGeometry') { node.geometry?.dispose(); node.material?.dispose?.(); return; }
  node.geometry?.dispose();
  for (const material of [].concat(node.material || [])) { material.map?.dispose(); material.dispose(); }
});

// cars as car objects: ids looked up (an unknown id left out), each once, at most three
const carsOf = (list) => {
  const seen = new Set(), out = [];
  for (const x of list || []) { const car = typeof x === 'string' ? carById(x) : x?.car || x; if (car?.id && !seen.has(car.id)) { seen.add(car.id); out.push(car); } }
  return out.slice(0, 3);
};
const rsize = new THREE.Vector2();
// THE TEMPLATE, rendered: 1 to 3 cars (objects or ids; the first the hero) into a new canvas of width x height device
// px: the cars, their shadows, reflections and ground, see-through round them (the backdrop is the page's: bannerArt).
// null: no renderer (no WebGL), no size, no car built
export const renderPackBanner = (list, { width, height, evil = false, config = BANNER } = {}) => {
  const cars = carsOf(list), renderer = sharedRenderer();
  if (!cars.length || !renderer || renderer.getContext().isContextLost()) return null;
  const w = Math.max(0, Math.round(width || 0)), h = Math.max(0, Math.round(height || 0));
  if (!w || !h) return null;
  const view = bannerScene(cars, w / h, { evil, config });
  if (!view) return null;
  renderer.getSize(rsize);
  if (w > rsize.x || h > rsize.y) renderer.setSize(rsize.x = Math.max(rsize.x, w), rsize.y = Math.max(rsize.y, h), false);
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.clear();
  view.camera.setViewOffset(w, h, view.offset.x * w, view.offset.y * h, w, h);
  renderer.render(view.scene, view.camera);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(renderer.domElement, 0, rsize.y - h, w, h, 0, 0, w, h);
  disposeScene(view.scene);
  return canvas;
};

// ---- drawn once, kept: by the cars (in order), the side and the picture's size in steps of 20 px -------------------
const pictures = new Map(); // key -> object URL
const keyOf = (el, cars, evil) => {
  const r = el.getBoundingClientRect();
  return cars.map(c => c.id).join('+') + (evil ? '/evil/' : '/good/') + Math.round(r.width / 20) + 'x' + Math.round(r.height / 20);
};
const layerOf = (el) => el.querySelector(':scope > .pack-banner-cars') || el.appendChild(Object.assign(document.createElement('div'), { className: 'pack-banner-cars' }));
const show = (el, url) => { layerOf(el).style.backgroundImage = `url("${url}")`; el.classList.add('drawn'); };
// draw the banner into `el` now (its own size). False: no renderer, or no size yet, or no car built
export const drawBanner = (el, cars, evil = false) => {
  const key = keyOf(el, cars, evil), url = pictures.get(key);
  if (url) { show(el, url); return true; }
  const r = el.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = renderPackBanner(cars, { width: r.width * ratio, height: r.height * ratio, evil });
  if (!canvas) return false;
  const done = (u) => { pictures.set(key, u); if (el.isConnected) show(el, u); };
  if (canvas.toBlob) canvas.toBlob((blob) => done(blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')), 'image/png');
  else done(canvas.toDataURL('image/png'));
  return true;
};
// the cars a pack's banner shows: its featured entries' cars, each once, in order (the first the hero), at most three;
// null if fewer than two (one featured car keeps the tile's own art)
export const bannerCars = (featured = []) => {
  const out = carsOf(featured);
  return out.length >= 2 ? out : null;
};
// the banner, as an element to put in the page: the backdrop (BANNER.backdrop: a sky, a blurred town, a vignette), the
// cars' picture over it (drawn once it has a size, and again at a new size), the cars' names in labels at its foot (the
// hero first). onFail: no renderer here (no WebGL): the caller takes the element away and shows its old art
export const bannerArt = (list, { onFail, labels = true, evil = false, className = '' } = {}) => {
  const cars = carsOf(list), b = BANNER.backdrop;
  const el = document.createElement('div');
  el.className = 'pack-banner' + (className ? ' ' + className : '');
  el.style.background = b.sky;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Featured: ' + cars.map(c => c.name).join(', '));
  const town = Object.assign(document.createElement('div'), { className: 'pack-banner-town' });
  town.style.cssText = `background:${b.town};filter:blur(${b.townBlur}px);opacity:${b.townOpacity}`;
  const vignette = Object.assign(document.createElement('div'), { className: 'pack-banner-vignette' });
  vignette.style.background = b.vignette;
  el.append(town, vignette);
  layerOf(el);
  if (labels) {
    const names = document.createElement('div');
    names.className = 'pack-banner-names';
    for (const car of cars) { const n = document.createElement('b'); n.textContent = car.name; names.append(n); }
    el.append(names);
  }
  let failed = false, last = '';
  const draw = () => {
    if (failed || !el.isConnected) return;
    if (!sharedRenderer()) { failed = true; observer?.disconnect(); onFail?.(); return; }
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const key = keyOf(el, cars, evil);
    if (key === last) return;
    if (drawBanner(el, cars, evil)) last = key;
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => requestAnimationFrame(draw)) : null;
  observer?.observe(el);
  let tries = 0;
  requestAnimationFrame(function first() { if (!el.isConnected) { if (++tries < 120) requestAnimationFrame(first); return; } draw(); });
  return el;
};

// ---- the debug page: ?banner=<ids>&w=&h=&evil&labels=0 (see the top): just the banner, over everything, to re-shoot ----
const params = typeof location === 'object' ? new URLSearchParams(location.search) : null;
if (params?.get('banner')) {
  const ids = params.get('banner').split(',').map(x => x.trim()).filter(Boolean);
  const w = Math.max(80, Number(params.get('w')) || 1600), h = Math.max(60, Number(params.get('h')) || 800);
  const page = Object.assign(document.createElement('div'), { className: 'pack-banner-page' });
  page.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#0b0d14;overflow:auto';
  const art = bannerArt(ids, { evil: params.get('evil') !== null, labels: params.get('labels') !== '0',
    onFail: () => { art.textContent = 'No WebGL here: no banner'; } });
  art.style.width = w + 'px'; art.style.height = h + 'px'; art.style.flex = '0 0 auto';
  page.append(art);
  document.body.append(page);
}
