// ---- a special pack's BANNER: its featured cars, three of them, in ONE scene (the owner, 12-Oct: "recreate the poses
// here", an Asphalt promo banner: three cars parked in a staggered diagonal row, overlapping, the nearest the biggest and
// lowest, a low camera in front, their reflections and shadows on the ground, a warm blurred backdrop, rim light, the
// headlamps glowing). The Shop's featured tile (render/shop.js) and the pack's "What's inside" sheet (render/packcontents.js).
// One scene and one camera (not three stills pasted together): the cars stand on one ground, so their sizes, overlaps and
// shadows agree. The FIRST car given is the hero: nearest, on the right, biggest; the others step back to the left in
// order. Each car is scaled toward a common size (a bubble car up, a bus down) but only part way (BANNER.weight), so a
// real difference in size still shows. The camera is framed by the cars' turned boxes (as modelviews.js poseView):
// nothing is ever cut off. The picture (see-through round the cars and their ground) is drawn ONCE by the menu's one
// renderer (modelviews.js sharedRenderer: no WebGL context of its own), kept as an object URL by cars and size, and shown
// as the background of a layer over the CSS backdrop (shop.css .pack-banner). No WebGL: bannerArt calls its onFail and
// the caller keeps its old art.
import * as THREE from 'three';
import '../shop.css';
import { makeShowCar, paintShowCar } from './showcar.js';
import { sharedRenderer, STILL } from './modelviews.js';

// the composition's numbers (radians, degrees, shares of the picture). Tuned on stills of several trios
export const BANNER = {
  lift: 0.075,      // the camera's height: just above the bumpers
  fov: 25,          // a little long: the cars keep their shapes, the nearest still clearly the biggest
  heading: 0.6,     // the hero's nose turned this far to the right of straight at the camera (a front three-quarter)
  fan: 0.55,        // each car further back turned this much less (the row reads as parked, not as a column)
  row: 1.0,         // the row's line: from the hero back to the left, this far round from straight across the picture (rad)
  gap: 0.3,         // the space between two cars of the row, beside each other (m, at their scaled size)
  weight: 0.6,      // 0: real sizes; 1: every car the same size (by length x height); between, part way
  marginX: 0.94, marginY: 0.8, // the share of the picture's half width / height the whole group may take
  shiftX: 0.1, shiftY: -0.2,  // the group's middle moved right / up by this share of the half picture
};

// soft round textures, made once: a dark blot (the shadows) and a warm glow (the headlamps)
let blot, glow, groundTex;
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
const textures = () => {
  blot ??= radial([[0, 'rgba(0,0,0,0.95)'], [0.45, 'rgba(0,0,0,0.7)'], [1, 'rgba(0,0,0,0)']]);
  glow ??= radial([[0, 'rgba(255,250,232,1)'], [0.18, 'rgba(255,236,190,0.75)'], [0.5, 'rgba(255,200,140,0.18)'], [1, 'rgba(255,190,120,0)']]);
  groundTex ??= radial([[0, 'rgba(78,74,80,0.97)'], [0.3, 'rgba(70,66,72,0.94)'], [0.7, 'rgba(62,58,64,0.5)'], [1, 'rgba(62,58,64,0)']], 256);
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
export const bannerScene = (cars, aspect, o = BANNER) => {
  const { blot: shadowTex, glow: glowTex, groundTex: floorTex } = textures();
  const scene = new THREE.Scene();
  // light: a low warm sky, a key from the camera's right, a strong warm RIM from behind (it outlines roofs and backs),
  // a cool fill from the left
  scene.add(new THREE.HemisphereLight(0xffe4c8, 0x1c1a22, 1.25));
  const key = new THREE.DirectionalLight(0xfff2e0, 1.6); key.position.set(6, 5, 9); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb468, 2.6); rim.position.set(-4, 6, -10); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x8fb2ff, 0.55); fill.position.set(-9, 2, 3); scene.add(fill);

  const built = [];
  for (const car of cars) {
    try {
      const model = makeShowCar(car);
      paintShowCar(model, car, false);
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
  for (const b of built) b.scale = Math.min(1.6, Math.max(0.6, (mean / weightOf(b)) ** o.weight));

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
    place(mirror).add(b.model.clone());
    // its shadow: a soft dark blot under it, a little bigger than its footprint
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.9 }));
    shadow.rotation.set(-Math.PI / 2, heading, 0, 'YXZ');
    shadow.scale.set(w * 1.35, l * 1.18, 1);
    shadow.position.set(at.x, 0.012, at.z);
    shadow.renderOrder = 2;
    scene.add(shadow);
    // its headlamps, glowing
    for (const p of lampsOf(b.model, b.box)) {
      const local = p.clone().sub(new THREE.Vector3((b.box.min.x + b.box.max.x) / 2, b.box.min.y, (b.box.min.z + b.box.max.z) / 2));
      const world = local.multiplyScalar(b.scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading).add(at);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.95 }));
      s.position.copy(world).add(new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(0.06));
      s.scale.setScalar(0.62 * b.scale);
      s.renderOrder = 3;
      scene.add(s);
    }
    // its turned box's corners, for the framing
    const c = Math.cos(heading), sn = Math.sin(heading), hx = w / 2, hz = l / 2, h = b.size.y * b.scale;
    for (const x of [-hx, hx]) for (const z of [-hz, hz]) for (const y of [0, h]) corners.push(new THREE.Vector3(at.x + x * c + z * sn, y, at.z - x * sn + z * c));
    for (const x of [-hx, hx]) for (const z of [-hz, hz]) corners.push(new THREE.Vector3(at.x + x * c + z * sn, -h * 0.35, at.z - x * sn + z * c)); // (room for the reflections)
    prev = { at };
  });
  // the ground: dark, a little see-through (the reflections under it dimmed), fading out at its edge into the backdrop
  const mid = new THREE.Box3().setFromPoints(corners).getCenter(new THREE.Vector3());
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(60, 40, 1);
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

// ---- drawn once, kept: by the cars (in order) and the picture's size in steps of 20 px ---------------------------
const pictures = new Map(); // key -> object URL
const keyOf = (el, cars) => {
  const r = el.getBoundingClientRect();
  return cars.map(c => c.id).join('+') + '/' + Math.round(r.width / 20) + 'x' + Math.round(r.height / 20);
};
const layerOf = (el) => el.querySelector(':scope > .pack-banner-cars') || el.appendChild(Object.assign(document.createElement('div'), { className: 'pack-banner-cars' }));
const show = (el, url) => { layerOf(el).style.backgroundImage = `url("${url}")`; el.classList.add('drawn'); };
const rsize = new THREE.Vector2();
// draw the banner into `el` now (its own size). False: no renderer, or no size yet, or no car built
export const drawBanner = (el, cars) => {
  const url = pictures.get(keyOf(el, cars));
  if (url) { show(el, url); return true; }
  const renderer = sharedRenderer();
  if (!renderer || renderer.getContext().isContextLost()) return false;
  const r = el.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (!r.width || !r.height) return false;
  const w = Math.max(1, Math.round(r.width * ratio)), h = Math.max(1, Math.round(r.height * ratio));
  const view = bannerScene(cars, r.width / r.height);
  if (!view) return false;
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
  const key = keyOf(el, cars);
  const done = (u) => { pictures.set(key, u); if (el.isConnected) show(el, u); };
  if (canvas.toBlob) canvas.toBlob((blob) => done(blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')), 'image/png');
  else done(canvas.toDataURL('image/png'));
  return true;
};
// the cars a pack's banner shows: its featured entries' cars, each once, in order (the first the hero), at most three;
// null if fewer than two (one featured car keeps the tile's own art)
export const bannerCars = (featured = []) => {
  const seen = new Set(), out = [];
  for (const f of featured) { const car = f?.car || f; if (car?.id && !seen.has(car.id)) { seen.add(car.id); out.push(car); } }
  return out.length >= 2 ? out.slice(0, 3) : null;
};
// the banner, as an element to put in the page: the CSS backdrop (shop.css .pack-banner), the cars' picture over it
// (drawn once it has a size, and again at a new size), the cars' names in labels at its foot (the hero first).
// onFail: no renderer here (no WebGL): the caller takes the element away and shows its old art. labels: false, none
export const bannerArt = (cars, { onFail, labels = true, className = '' } = {}) => {
  const el = document.createElement('div');
  el.className = 'pack-banner' + (className ? ' ' + className : '');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Featured: ' + cars.map(c => c.name).join(', '));
  layerOf(el);
  if (labels) {
    const names = document.createElement('div');
    names.className = 'pack-banner-names';
    for (const car of cars) { const b = document.createElement('b'); b.textContent = car.name; names.append(b); }
    el.append(names);
  }
  let failed = false, last = '';
  const draw = () => {
    if (failed || !el.isConnected) return;
    if (!sharedRenderer()) { failed = true; observer?.disconnect(); onFail?.(); return; }
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const key = keyOf(el, cars);
    if (key === last) return;
    if (drawBanner(el, cars)) last = key;
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => requestAnimationFrame(draw)) : null;
  observer?.observe(el);
  let tries = 0;
  requestAnimationFrame(function first() { if (!el.isConnected) { if (++tries < 120) requestAnimationFrame(first); return; } draw(); });
  return el;
};
