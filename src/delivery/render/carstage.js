// ---- THE CAR STAGE: a cheap little set for the car on show, one per theme (ON on the start screen's car card: CHECKLIST 347) ----
// The owner, 15-Oct: "a cheap, interchangeable scene for the selected car ... a 'frontend' for each theme". See
// src/delivery/CAR-STAGE-NOTES.md for the options measured and why this one.
// What a stage is, from the back to the front:
//   - the BACKDROP: a sky gradient, a band of haze, a skyline of the theme's own, PAINTED IN CODE on a 2D canvas that sits
//     under the car's picture (not in WebGL: no draw call, no texture, no shader). Painted again only when its size or
//     the horizon moves (a new car, a new shape of card), never per frame
//   - in 3D, drawn with the car by the menu's one renderer (render/modelviews.js): a ground disc fading into the haze
//     (one draw call, a 128 px canvas gradient), a low plinth in the road's colour (one), the car's soft shadow (one), and a
//     few of the THEME'S OWN OBSTACLE MODELS (themes.js `obstacles`: a slot machine, cheese wheels, a coil of steel...)
//     merged into ONE mesh with their colours in its vertices, faded toward the haze by their distance (fog without
//     THREE.Fog, which would compile a second shader for every one of the car's materials)
//   - the lights: the card's own two (render/modelviews.js lit), only recoloured from the theme's `light` (no new shader)
// Every theme has a stage with NO file of its own (its sky, ground, road, light and obstacles are in themes.js); a theme
// that wants more (a skyline, its own props) adds ONE small file in render/stages/ and ONE line in STAGE_FILES below.
// quality: 'high' all the props; 'low' two (a small card: the phone's); 'off' no stage at all (the plain card).
// THE FALLBACK (cardStage below): a level with no theme, or a theme that is not in themes.js: the DEFAULT studio (backdrop and plinth,
// no props); a theme whose stage threw (built, framed or painted): the default studio from then on; the default studio throwing too:
// the plain card as before. A theme's file that fails to arrive: the theme's stage without it (its palette and obstacles, no skyline).
// Never an error to the player: a console.warn at most.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { THEMES, themedKind } from '../themes.js';
import { OBSTACLE_MODELS } from './obstacleModels.js';
import { sharedRenderer } from './modelviews.js';
import { Progress } from '../progress.js';

// a theme's own stage file (a skyline, a prop list), loaded when first wanted; by theme name, else by its scenery's
export const STAGE_FILES = {
  city: () => import('./stages/city.js'),
  vegas: () => import('./stages/vegas.js'),
  alpinepass: () => import('./stages/alpine.js'),
  steelworks: () => import('./stages/steelworks.js'),
  // (new stages go above this line: one line each)
};
const loaded = {}, loading = {}, warned = new Set();
const warnOnce = (what) => { if (!warned.has(what)) { warned.add(what); console.warn(what); } };
// (for the checks and a picture of the fallback: ?stagethrow=<theme> or '*' makes that stage's build throw)
export const STAGE_TEST = { throwOn: null };
const fileOf = (theme) => (STAGE_FILES[theme] ? theme : STAGE_FILES[THEMES[theme]?.scenery] ? THEMES[theme].scenery : null);
// the stage file of a theme, now if it has arrived (else null, and it is asked for: onLoad is called when it comes)
export const stageFile = (theme, onLoad) => {
  const name = fileOf(theme);
  if (!name) return null;
  if (loaded[name]) return loaded[name];
  loading[name] ||= Promise.resolve().then(STAGE_FILES[name]).then((m) => { if (!m?.stage) throw new Error('no stage in it'); loaded[name] = m.stage; onLoad?.(m.stage); },
    (error) => { delete loading[name]; warnOnce('Stage file ' + name + ' not loaded (the stage goes on without it): ' + (error?.message || error)); });
  return null;
};

// the obstacle kinds' boxes (collision.js SIZE: hw, hl, height), for the theme's models built here
const BOX = { crate: [0.6, 0.6, 1.1], bale: [1.1, 1.1, 1.5], cone: [0.42, 0.42, 1.12], barrier: [1.2, 0.6, 1.2] };
// where the props stand: [kind, side (-1 left, +1 right, or between), depth (car radii behind its middle), turn (rad)].
// Their x is a share of the picture's half width at that depth: so they flank the car in a tall card or a wide one
const SLOTS = [['bale', -0.8, 1.9, 0.5], ['crate', 0.82, 1.5, -0.4], ['cone', 0.95, -1.5, 0.3], ['cone', 0.55, 3.6, 0.2], ['barrier', -0.4, 5, 0.1]];
// (the third stands IN FRONT, at the picture's edge, cut by it: depth negative. The first two are the low quality's)
const LOW = 2; // (props at low quality)

const col = (hex) => new THREE.Color(hex);
const mix = (a, b, t) => col(a).lerp(col(b), t);
const css = (c) => '#' + c.getHexString();
// the stage's colours for a theme and a side (Evil: the sky dark and red, the light lower)
// (the DEFAULT stage, for 'default' or a name that is no theme: a plain studio, grey-blue, no props, no skyline)
const STUDIO = { sky: 0xb8c4d2, ground: 0x8e98a4, road: 0x4a505a };
export const palette = (theme, evil = false) => {
  const T = THEMES[theme] || STUDIO, night = !!T.night, sky = T.sky ?? 0x9fc4e8;
  const top = night ? mix(sky, 0x000000, 0.35) : mix(sky, 0x2b5a8a, 0.35);
  const haze = night ? mix(sky, T.fogColor ?? 0x6a5a8a, 0.35) : mix(sky, 0xffffff, 0.45);
  const p = { night, top, haze, ground: col(T.ground ?? 0x5d8a4e), road: col(T.road ?? 0x3a3d42), light: T.light || null };
  if (evil) { p.top.lerp(col(0x1c0507), 0.7); p.haze.lerp(col(0x8a2a1a), 0.5); p.ground.lerp(col(0x2a1010), 0.35); }
  p.far = p.ground.clone().lerp(p.haze, 0.55); // (the ground at the horizon: into the haze)
  p.evil = evil;
  return p;
};

// a soft round patch on a small canvas (the ground's fade, the shadow): made once each
let groundMap, shadowMap;
const patch = (size, stops) => {
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
export const TEXTURE_BYTES = 128 * 128 * 4 + 64 * 64 * 4; // (the two patches; the backdrop is a 2D canvas, counted apart)

// a texture's mean colour (its canvas drawn down to one pixel), linear, once per texture
const means = new WeakMap();
const average = (map) => {
  if (means.has(map)) return means.get(map);
  let c = col(0xffffff);
  try {
    const src = map.image, one = document.createElement('canvas');
    one.width = one.height = 1;
    const g = one.getContext('2d');
    g.drawImage(src, 0, 0, 1, 1);
    const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
    c = new THREE.Color().setRGB(r / 255, gr / 255, b / 255, THREE.SRGBColorSpace);
  } catch { /* (no picture to read: white) */ }
  means.set(map, c);
  return c;
};
// The props: the theme's models built once, every part's colour put in its vertices (faded toward the haze by
// `fade`), all merged into ONE geometry. A part with a picture on it (a sign's face) keeps only its colour
const merged = (models, haze) => {
  const parts = [];
  for (const { model, fade } of models) {
    model.updateMatrixWorld(true);
    model.traverse((node) => {
      const m = node.isMesh && [].concat(node.material)[0];
      if (!m || node.isInstancedMesh || !node.visible || (m.transparent && m.opacity < 0.6)) return; // (a model's own soft shadow: the stage has its own light)
      let g = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
      const own = m.vertexColors ? g.attributes.color : null; // (a model whose parts' colours are in its vertices already)
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(node.matrixWorld);
      const c = (m.color ? m.color.clone() : col(0x888888));
      if (m.map) c.multiply(average(m.map)); // (a part with a picture on it: its picture's mean colour)
      if (m.emissive) c.add(m.emissive.clone().multiplyScalar(Math.min(1, m.emissiveIntensity ?? 1)));
      const n = g.attributes.position.count, rgb = new Uint8Array(n * 3), byte = (x) => Math.round(Math.min(1, Math.max(0, x)) * 255);
      for (let i = 0; i < n; i++) {
        const k = own ? [own.getX(i), own.getY(i), own.getZ(i)] : [1, 1, 1];
        rgb[i * 3] = byte(k[0] * c.r + (haze.r - k[0] * c.r) * fade); rgb[i * 3 + 1] = byte(k[1] * c.g + (haze.g - k[1] * c.g) * fade); rgb[i * 3 + 2] = byte(k[2] * c.b + (haze.b - k[2] * c.b) * fade); // (faded toward the haze)
      }
      g.setAttribute('color', new THREE.BufferAttribute(rgb, 3, true)); // (a byte a channel)
      parts.push(g);
    });
    model.traverse((node) => { node.geometry?.dispose(); }); // (the model's own: only its copies are kept)
  }
  if (!parts.length) return null;
  const geometry = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return geometry;
};

// makeStage(theme, { evil, quality }) -> { group, attach(view), detach(), frame(camera, aspect), paint(canvas, camera),
//   stats, dispose() }. view: a card's { scene, model } (render/modelviews.js standView); frame() stands the camera for the
// card's shape and puts the props where it shows them; paint() draws the backdrop onto a 2D canvas for that camera.
export const makeStage = (theme, { evil = false, quality = 'high' } = {}) => {
  const t0 = performance.now();
  if (STAGE_TEST.throwOn && (STAGE_TEST.throwOn === '*' || STAGE_TEST.throwOn === theme)) throw new Error('stage ' + theme + ' made to throw (STAGE_TEST)');
  const T = THEMES[theme] || STUDIO, pal = palette(theme, evil);
  let file = stageFile(theme, () => { file = loaded[fileOf(theme)]; stage.repaint = true; }); // (arrived later: drawn again with it)
  const group = new THREE.Group();
  groundMap ||= patch(128, [[0, 'rgba(255,255,255,1)'], [0.55, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
  shadowMap ||= patch(64, [[0, 'rgba(0,0,0,0.8)'], [1, 'rgba(0,0,0,0)']]);
  const disc = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshBasicMaterial({ map: groundMap, color: pal.ground.clone().lerp(pal.far, 0.25), transparent: true, depthWrite: false });
  const ground = new THREE.Mesh(disc, groundMat);
  ground.renderOrder = -3;
  group.add(ground);
  const plinthMat = new THREE.MeshLambertMaterial({ color: pal.road });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.04, 1, 40), plinthMat);
  group.add(plinth);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity: 0.6, depthWrite: false });
  const shadow = new THREE.Mesh(disc, shadowMat);
  shadow.renderOrder = -1;
  const propMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  let props = null, propKey = '';
  let propsMs = 0, lifted = null;
  let view = null, car = null; // (the card's view and the car's measure: { r, h, lift })
  let kept = null; // (what attach changed on the view, put back by detach: the camera, its fit, the lights)
  const PLINTH_H = 0.12;

  // the props for this car's size and this picture's shape (built again only when either changes much)
  // (A CAR SWITCH builds nothing here: the props stay as they stand, for a car within half a metre of the last one's size the
  // same; for another size they are built again when the page is next idle, not in the switch's own frame)
  let idle = 0, lastCamera = null, gone = false;
  const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  const buildProps = (camera, now = false) => {
    const slots = (file?.props || SLOTS).slice(0, quality === 'low' ? LOW : 99);
    const r = Math.max(1, Math.round(car.r * 2) / 2);
    const key = (file ? 'f' : '') + slots.length + ':' + r + ':' + camera.aspect.toFixed(2);
    lastCamera = camera;
    if (key === propKey) return;
    if (props && !now) { idle ||= later(() => { idle = 0; if (car && lastCamera && !gone) buildProps(lastCamera, true); }); return; }
    propKey = key;
    const p0 = performance.now();
    if (props) { group.remove(props); props.geometry.dispose(); props = null; }
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.zoom * camera.aspect;
    const models = [];
    for (const [kind, side, depth, turn, scale = 1, like] of slots) { // (like: a file's prop's kind of box, crate / bale / cone / barrier)
      const real = file?.props ? kind : themedKind(theme, kind);
      const make = OBSTACLE_MODELS[real];
      if (!make || real === kind && !file?.props && !T.obstacles) continue; // (a theme with no obstacles of its own: no generic crates)
      const [hw, hl, height] = BOX[like] || BOX[kind] || BOX.crate;
      let model;
      try { model = make({ kind: real, hw, hl, height }); } catch { continue; }
      const z = -depth * r * (depth > 0 ? 1 + Math.max(0, 1 / camera.aspect - 0.8) * 1.2 : 1), dist = camera.position.z - z, x = side * dist * halfTan;
      model.position.set(x, 0, z);
      model.rotation.y = turn;
      model.scale.setScalar(scale * Math.max(0.8, Math.min(1.6, r / 2.2)));
      models.push({ model, fade: Math.min(0.55, Math.max(0, (depth - 0.8) * 0.12)) });
    }
    const geometry = merged(models, pal.haze);
    if (geometry) { props = new THREE.Mesh(geometry, propMat); group.add(props); }
    propsMs = performance.now() - p0;
  };

  const stage = {
    theme, evil, group, repaint: true,
    // onto a card's view: the set in its scene, the shadow on its turntable, its lights in the theme's colours
    attach(v) {
      this.detach();
      view = v;
      kept = { position: v.camera.position.clone(), quaternion: v.camera.quaternion.clone(), zoom: v.camera.zoom, reach: v.reach,
        lights: v.scene.children.filter((n) => n.isLight).map((n) => [n, n.color.getHex(), n.groundColor?.getHex(), n.intensity]) };
      v.reach = 0; // (the stage frames the camera itself: see frame)
      const turn = v.model.parent, at = turn.position.clone(), yaw = turn.rotation.y;
      turn.position.set(0, 0, 0); turn.rotation.y = 0; turn.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(v.model), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3()); // (the car's own measure, on the turntable's frame)
      turn.position.copy(at); turn.rotation.y = yaw;
      car = { r: Math.hypot(size.x, size.z) / 2, h: size.y };
      turn.position.y += PLINTH_H; // (the car stands on the plinth)
      lifted = turn;
      ground.scale.set(car.r * 16, 1, car.r * 16);
      plinth.scale.set(car.r * 1.12, PLINTH_H, car.r * 1.12);
      plinth.position.y = PLINTH_H / 2;
      shadow.scale.set(size.x * 1.3, 1, size.z * 1.2);
      shadow.position.set(mid.x, box.min.y + 0.004, mid.z); // (on the turntable: it turns with the car)
      turn.add(shadow);
      v.scene.add(group);
      for (const node of v.scene.children) {
        const L = pal.light;
        if (node.isHemisphereLight) {
          node.color.set(L ? L.sky : 0xffffff); node.groundColor.set(L ? L.ground : 0x445566);
          node.intensity = 2.2 * (L ? Math.min(1.15, L.ambient / 1.25) : 1) * (evil ? 0.8 : 1);
        } else if (node.isDirectionalLight) {
          node.color.set(L ? L.sun : 0xffffff); node.intensity = 1.5 * (L ? Math.min(1.15, L.sunlight) : 1) * (evil ? 0.8 : 1);
        }
      }
      this.repaint = true;
    },
    detach() {
      if (!view) return;
      group.removeFromParent();
      shadow.removeFromParent();
      if (lifted) { lifted.position.y -= PLINTH_H; lifted = null; }
      if (kept) { // (the view as it was: the plain card's camera and lights)
        view.camera.position.copy(kept.position); view.camera.quaternion.copy(kept.quaternion); view.camera.zoom = kept.zoom; view.reach = kept.reach;
        view.camera.updateProjectionMatrix();
        for (const [n, c, g, i] of kept.lights) { n.color.setHex(c); if (g !== undefined) n.groundColor.setHex(g); n.intensity = i; }
        kept = null;
      }
      view = null;
    },
    // the camera for this shape of picture: the whole car, a little from above, the horizon about a third down; in a
    // tall card the car stands low, the sky and skyline over it; in a wide one the props to its sides
    frame(camera) {
      if (!car || !(camera.aspect > 0) || !Number.isFinite(camera.aspect)) return; // (a card of no size yet: nothing to frame)
      const aspect = camera.aspect, lift = 0.15, vHalf = THREE.MathUtils.degToRad(camera.fov / 2), hHalf = Math.atan(Math.tan(vHalf) * aspect);
      const up = car.r * Math.sin(lift) + car.h / 2 * Math.cos(lift) + PLINTH_H;
      const far = Math.max(car.r * 1.08 / Math.tan(hHalf), up * 1.15 / Math.tan(vHalf)) + car.r * 0.6;
      const tall = Math.max(0, 1 / aspect - 0.8); // (0 for a wide card; about 0.5 for the desktop's tall one)
      const aim = car.h * 0.45 + PLINTH_H + tall * far * Math.tan(vHalf) * 0.45; // (aimed above the car: the car low in the picture)
      camera.zoom = 1;
      camera.position.set(0, car.h * 0.45 + PLINTH_H + far * Math.sin(lift), far * Math.cos(lift));
      camera.lookAt(0, aim, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      buildProps(camera);
    },
    // the backdrop for the camera, onto a 2D canvas (its size: the card's in CSS px, no more); false: nothing to do
    paint(canvas, camera, cw, ch) {
      if (!(cw > 0 && ch > 0)) return false; // (a card of no size: nothing to paint)
      const ratio = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(4e5 / Math.max(1, cw * ch))), w = Math.round(cw * ratio), h = Math.round(ch * ratio); // (crisp, at most 400k px: 1.6 MB)
      const hz = new THREE.Vector3(0, 0, -1e4).project(camera), hy = Math.round((1 - hz.y) / 2 * h);
      const key = w + 'x' + h + ':' + hy;
      if (!this.repaint && canvas.dataset.key === key) return false;
      this.repaint = false;
      canvas.dataset.key = key;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const g = canvas.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, Math.max(1, hy));
      sky.addColorStop(0, css(pal.top));
      sky.addColorStop(1, css(pal.haze));
      g.fillStyle = sky;
      g.fillRect(0, 0, w, Math.max(0, hy));
      const land = g.createLinearGradient(0, hy, 0, h);
      land.addColorStop(0, css(pal.far));
      land.addColorStop(1, css(pal.ground.clone().lerp(pal.far, 0.3)));
      g.fillStyle = land;
      g.fillRect(0, hy, w, h - hy);
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      g.save(); g.scale(ratio, ratio);
      try { file?.skyline?.(g, cw, ch, hy / ratio, pal, rnd, css); } catch (error) { console.warn('Stage skyline: ' + (error?.message || error)); }
      g.restore();
      return true;
    },
    // what it costs (for ?stagelog and the notes)
    get stats() {
      let triangles = 0, bytes = 0;
      group.traverse((n) => { if (n.geometry) { triangles += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; for (const a of Object.values(n.geometry.attributes)) bytes += a.array.byteLength; } });
      return { meshes: 3 + (props ? 1 : 0), triangles: Math.round(triangles + 2), geometryBytes: bytes, textureBytes: TEXTURE_BYTES, buildMs: +(built - t0).toFixed(2), propsMs: +propsMs.toFixed(2), file: !!file };
    },
    dispose() {
      gone = true;
      this.detach();
      for (const thing of [disc, plinth.geometry, groundMat, plinthMat, shadowMat, propMat, props?.geometry]) thing?.dispose();
    },
  };
  const built = performance.now();
  return stage;
};

// ---- the start screen's car card on a stage (render/menustage.js loads this module lazily, after the menu is up; ?stage=off: never) ----
// cardStage(el): the backdrop canvas under the card's picture, and the stage kept on the card's view (render/modelviews.js
// standView). sync(view, theme, evil) after each change of car, side or level (a theme of 'off', or no view: no stage);
// release(view) before the view is given back (the stage is kept for the next car: nothing is built again on a switch).
// quality: 'low' where the picture is small (the phone's car row, 92 px tall), else 'high'; ?stagequality= sets it.
// The fallback: see the top of this file. `broken`: the stages that threw this visit (a theme, or 'default')
export const cardStage = (el, { quality: asked = null } = {}) => {
  let stage = null, key = '', on = null, last = null;
  const broken = new Set();
  const back = document.createElement('canvas');
  back.className = 'stage-back';
  back.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;border-radius:inherit;pointer-events:none';
  const off = () => { try { stage?.dispose(); } catch { /* (gone either way) */ } stage = null; key = ''; on = null; back.style.display = 'none'; };
  // which stage a theme gets: its own; the default studio for no theme, a theme not in themes.js, or one that threw; none (null) if the default threw too
  const choose = (theme) => {
    const own = theme && theme !== 'default' && THEMES[theme] && !broken.has(theme) ? theme : 'default';
    return broken.has(own) ? null : own;
  };
  const fail = (what, error) => {
    broken.add(what);
    console.warn('Car stage ' + what + ' failed (' + (what === 'default' ? 'the plain card' : 'the default studio') + ' instead): ' + (error?.message || error));
  };
  const card = {
    get stage() { return stage; },
    sync(view, theme, evil) {
      last = { view, theme, evil };
      if (!view || theme === 'off') return off();
      for (let want = choose(theme); want; want = choose(theme)) {
        try {
          const quality = asked || (el.clientHeight && el.clientHeight < 120 ? 'low' : 'high');
          const id = want + '/' + !!evil + '/' + quality;
          if (id !== key) { off(); stage = makeStage(want, { evil, quality }); key = id; }
          if (on !== view) {
            stage.detach();
            stage.attach(view);
            on = view;
            if (!view.staged) { // (the view's step wrapped once: the stage's camera and backdrop before each of its frames)
              view.staged = true;
              const step = view.step.bind(view);
              view.step = (t, dt) => {
                if (stage && on === view) {
                  try { stage.frame(view.camera); stage.paint(back, view.camera, el.clientWidth, el.clientHeight); } catch (error) {
                    fail(stage.theme, error);
                    off();
                    card.sync(last.view, last.theme, last.evil); // (the next in the chain, from the next frame)
                  }
                }
                step(t, dt);
              };
            }
            stage.repaint = true;
          }
          if (back.parentNode !== el) el.prepend(back);
          back.style.display = 'block';
          return;
        } catch (error) { fail(want, error); off(); }
      }
      off(); // (the default studio failed too: the plain card)
    },
    release(view) { if (on === view) { stage?.detach(); on = null; } },
    broken,
  };
  return card;
};

// ---- ?stagelog: the card's cost, in the console (a picture run prints it: scripts/shots.mjs). ?stageswap=<car>&swapat=<ms>:
// switches to that car then, and logs the next frames' pictures (blank or not): the no-blank-frame check of a switch
export const stageLog = (getView, card, params) => {
  const renderer = sharedRenderer();
  if (!renderer) return;
  const report = (what) => {
    const v = getView();
    if (!v) return console.warn('[stagelog] ' + what + ': no view');
    renderer.info.autoReset = false;
    renderer.info.reset();
    const t0 = performance.now();
    renderer.render(v.scene, v.camera);
    const ms = performance.now() - t0;
    renderer.info.autoReset = true;
    const s = card?.stage?.stats || null;
    console.warn('[stagelog] ' + JSON.stringify({ what, car: v.car?.id, stage: card?.stage ? card.stage.theme + (card.stage.evil ? '/evil' : '') : 'plain',
      calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, renderMs: +ms.toFixed(2), stats: s,
      picture: [v.el.clientWidth, v.el.clientHeight] }));
  };
  let n = 0; // (after 8 frames drawn: a software-GL page's clock jumps, so frames, not ms; and its ms are not to be trusted)
  const settle = () => (++n < 8 ? requestAnimationFrame(settle) : report('settled'));
  requestAnimationFrame(settle);
  const swap = params.get('stageswap');
  if (swap) setTimeout(() => {
    if (!Progress.data.cars.includes(swap)) Progress.data.cars.push(swap);
    Progress.data.car = swap;
    const t0 = performance.now();
    window.dispatchEvent(new Event('carchange'));
    const syncMs = performance.now() - t0, frames = [];
    const look = (n) => requestAnimationFrame(() => {
      const v = getView(), c = v?.canvas;
      let cover = 0;
      if (c?.width) { const d = c.getContext('2d').getImageData(0, Math.floor(c.height * 0.6), c.width, 1).data; for (let i = 3; i < d.length; i += 4) if (d[i]) cover++; }
      frames.push({ car: v?.car?.id, cover: c?.width ? +(cover / c.width).toFixed(2) : 0, back: card ? card.stage ? 'on' : 'off' : 'none' });
      if (n < 6) look(n + 1); else { console.warn('[stagelog] swap ' + JSON.stringify({ syncMs: +syncMs.toFixed(1), frames })); report('after swap'); }
    });
    look(0);
  }, Number(params.get('swapat')) || 4000);
};
