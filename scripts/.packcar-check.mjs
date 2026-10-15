// A check of the car drawn on a card pack (render/packart.js packCar; CHECKLIST 201: the Silver Comet cut off on the
// reveal's big pack on a larger screen). The still was sized from the box ON SCREEN (getBoundingClientRect), which the
// big pack's shake (packs.css pr-shake: scale .6 to 1.7, turned) makes another size and shape than the span, and shown
// as a background at its own pixel size (no background-size: at 2x a picture twice the box, its right and bottom cut
// off). Here, headless: (1) modelviews.js boxOf and drawStill size a still by the element's OWN laid-out size, whatever
// its box on screen; (2) every car any pack features is framed whole by PACK_POSE in the pack's picture, at the big
// pack's shape and the Shop's (the corners of its box, turned, projected with the view offset drawStill uses, inside
// the picture); (3) the CSS and code that show it whole (contain) and draw it first, at its size, again on a resize.
// What it looks like was seen in headless Chromium (see the CHECKLIST), not here.
//   node scripts/.packcar-check.mjs
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// render/scene.js makes the game's WebGL renderer as it loads: a stand-in (as scripts/.suspension-check.mjs)
const SCENE = `import * as THREE from 'three';
export const PIXEL_RATIO = 1, renderer = null, scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
export const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), Cinematic = {};
export const applySky = () => {}, clearGroup = () => {}, applyLight = () => {}, aim = () => {}, updateCamera = () => {};`;
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === 'measureText' ? () => ({ width: 10 }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => ctx2d), set: (o, k, v) => { o[k] = v; return true; } });
ctx2d.addColorStop = () => {};
const element = () => ({ classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 2 };
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: '', createElement: () => ({ getContext: () => ctx2d, style: {}, width: 1, height: 1 }) };
const stored = new Map();
globalThis.localStorage = { getItem: (k) => (stored.has(k) ? stored.get(k) : null), setItem: (k, v) => stored.set(k, String(v)), removeItem: (k) => stored.delete(k) };
const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'error',
  server: { middlewareMode: true, ws: false, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  cacheDir: join(tmpdir(), 'delivery-vite-' + process.pid + '-' + Date.now().toString(36)),
  plugins: [{ name: 'no-renderer', enforce: 'pre', load(id) { if (/render[\\/]scene\.js$/.test(id)) return SCENE; } }],
});
const load = (path) => server.ssrLoadModule('/src/delivery/' + path);
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const THREE = await import('three');
  const { boxOf, drawStill, poseView } = await load('render/modelviews.js');
  const { makeShowCar, paintShowCar } = await load('render/showcar.js');
  const { carById } = await load('cars.js');
  const packs = JSON.parse(readFileSync('src/delivery/packs.json', 'utf8')).packs;
  const src = (p) => readFileSync('src/delivery/' + p, 'utf8');
  const packart = src('render/packart.js');
  const PACK_POSE = JSON.parse(packart.match(/(?:export )?const PACK_POSE = (\{[^}]*\})/)[1].replace(/(\w+):/g, '"$1":'));

  // ---- (1) the size a still is drawn at: the element's own, not its box on screen
  const shaken = { offsetWidth: 129, offsetHeight: 66, getBoundingClientRect: () => ({ width: 1.7 * 133, height: 1.7 * 75 }) }; // (the big pack's span, grown and turned by the shake)
  const b = boxOf(shaken);
  check(b.width === 129 && b.height === 66, 'boxOf: the span\'s own size (129x66), not its box on screen while the pack shakes (' + b.width + 'x' + b.height + ')');
  const svgish = { getBoundingClientRect: () => ({ width: 40, height: 20 }) };
  check(boxOf(svgish).width === 40 && boxOf(svgish).height === 20, 'boxOf: an element with no offset size falls back to its box on screen');
  const hidden = { offsetWidth: 0, offsetHeight: 0, getBoundingClientRect: () => ({ width: 0, height: 0 }) };
  check(boxOf(hidden).width === 0, 'boxOf: one not laid out is 0 wide (drawn later)');
  const canvases = [];
  document.createElement = () => { const c = { style: {}, width: 0, height: 0, getContext: () => ({ clearRect() {}, drawImage() {} }) }; canvases.push(c); return c; };
  const size = { x: 2, y: 2 };
  const fake = { domElement: {}, getContext: () => ({ isContextLost: () => false }), getSize(v) { v.x = size.x; v.y = size.y; return v; },
    setSize(w, h) { size.x = w; size.y = h; }, setViewport() {}, setScissor() {}, clear() {}, render() {} };
  const comet = carById('silvercomet');
  const model = makeShowCar(comet);
  paintShowCar(model, comet, false);
  const el = { ...shaken, append() {} };
  check(drawStill(fake, el, model, PACK_POSE) === true && canvases.at(-1).width === 258 && canvases.at(-1).height === 132,
    'drawStill at 2x: the canvas is the span\'s own size in device pixels (258x132), whatever the shake (' + canvases.at(-1).width + 'x' + canvases.at(-1).height + ')');

  // ---- (2) every car a pack features, whole in the picture (the big pack's span: 129x66; the Shop's and the event card's packs are other sizes)
  const Hu = await load('hunt.js'); // (a hunt pack, the Car Hunt's: every car of the hunt is drawn on it in turn, CHECKLIST 345)
  const featured = [...new Set(Object.entries(packs).flatMap(([id, p]) => {
    if (Hu.packHunt(id)) return Hu.huntOf(Hu.packHunt(id)).cars;
    const f = p.featured, tie = f?.sameCarAs && packs[f.sameCarAs]?.featured;
    const ids = [...new Set(((tie || f)?.entries || []).filter(e => !e.key).map(e => e.car))];
    return ids.length === 1 ? ids : [];
  }))];
  check(featured.includes('silvercomet'), 'the cars drawn on packs: ' + featured.join(', '));
  const corner = new THREE.Vector3();
  for (const id of featured) {
    const car = carById(id);
    if (!car) { check(false, id + ': no such car'); continue; }
    try { makeShowCar(car); } catch (e) { if (/canvas|getContext|document|ctx\./i.test(String(e?.message))) { console.log('  note  ' + id + ': its model draws a canvas texture, not built headless: not measured here'); continue; } throw e; }
    let worst = 0;
    for (const aspect of [129 / 66, 1.4, 1.7, 2.2, 2.6, 3]) {
      const before = worst; worst = 0;
      const m = makeShowCar(car);
      m.userData.animate?.(2.4); m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m); // (the model's own box, as poseView frames it; turned with it below, not the box of it turned)
      const { scene, camera, offset } = poseView(m, PACK_POSE, aspect);
      const w = Math.round(200 * aspect), h = 200;
      camera.setViewOffset(w, h, offset.x * w, offset.y * h, w, h);
      camera.updateProjectionMatrix();
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      const placed = m.parent.matrixWorld; // (the holder and the turn poseView put it in)
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z).applyMatrix4(placed).project(camera);
        worst = Math.max(worst, Math.abs(corner.x), Math.abs(corner.y));
      }
      worst = Math.max(worst, before);
    }
    check(worst <= 1, id + ' is whole on a pack at every shape (its box reaches ' + worst.toFixed(3) + ' of the way to the picture\'s edge; 1 is the edge)');
  }

  // ---- (3) shown whole, drawn first, at its size, again when its size changes
  const shop = src('shop.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = shop.match(/\.shop-pack \.pack-car\s*\{([^}]*)\}/)?.[1] || '';
  check(/background:[^;]*\/\s*contain/.test(rule) && /no-repeat/.test(rule), 'shop.css: the pack\'s car picture is contained, centred, not repeated (it was its pixel size: cut off at 2x)');
  const still = src('render/carstill.js');
  check(/const keyOf[\s\S]{0,80}boxOf\(el\)/.test(still) && !/const keyOf[\s\S]{0,80}getBoundingClientRect/.test(still), 'carstill.js keeps stills by the element\'s own size (boxOf), not its box on screen');
  check(/backgroundSize = 'contain'/.test(still), 'carstill.js: a still shown on an element with no background size of its own is contained');
  check(/first/.test(packart) && /new ResizeObserver/.test(packart) && /drawSoon\(el, car, opts\)/.test(packart), 'packart.js: the pack\'s car is drawn first, and again when its size changes (ResizeObserver)');
  const mv = src('render/modelviews.js');
  check(/export const drawStill[\s\S]{0,200}boxOf\(el\)/.test(mv), 'modelviews.js drawStill sizes by boxOf');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
} finally {
  await server.close();
}
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
