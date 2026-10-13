// A check of the MODEL INSPECTOR (render/inspector.js, the garage's "Inspect" button; its model: render/inspectmodel.js):
// every idea car of the Car ideas lot (ideas.js IDEA_CARS) and every car of the roster the lot parks is built as the
// inspector builds it (makeShowCar, out of any scene, painted Good and then Evil) without an error, has a real model (not
// the plain block a car with none falls back to) standing on its own, and is counted: its shapes (meshes) and triangles,
// the figures the inspector's line shows to judge a model's quality (listed for the ideas). Then, by reading the source
// (no browser): the inspector makes no WebGL context of its own (modelviews.js sharedRenderer), caps its pixels at twice
// the screen's, stops its loop when it closes, takes a history entry (nav.js: back closes it), and the garage's lot is not
// drawn under it. What it looks like and how a drag feels were seen in headless Chromium (CHECKLIST), not here.
//   node scripts/.inspector-check.mjs            (add an idea id to see only that one)
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// render/scene.js makes the game's WebGL renderer as it loads: a stand-in for it (the models only want a scene to be put in)
const SCENE = `import * as THREE from 'three';
export const PIXEL_RATIO = 1, renderer = null, scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
export const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), Cinematic = {};
export const applySky = () => {}, clearGroup = () => {}, applyLight = () => {}, aim = () => {}, updateCamera = () => {};`;
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === 'measureText' ? () => ({ width: 10 }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => ctx2d), set: (o, k, v) => { o[k] = v; return true; } });
ctx2d.addColorStop = () => {};
const element = () => ({ classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 1 };
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
  const { buildInspectModel, paintInspectModel, countModel, sizeWords } = await load('render/inspectmodel.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { showroomCars } = await load('showroomData.js');
  const only = process.argv[2];
  const ideas = IDEA_CARS.filter(car => !only || car.id === only);
  const bad = [], blocks = [], rows = [];
  let total = 0;
  for (const car of ideas) {
    try {
      const model = buildInspectModel(car, false);
      if (model.parent) throw new Error('still in a scene');
      paintInspectModel(model, car, true); // (the Evil livery: its colour and the model's own livery function)
      paintInspectModel(model, car, false);
      const c = countModel(model);
      if (model.userData.block) blocks.push(car.id);
      if (!(c.meshes > 0 && c.triangles > 0)) throw new Error('nothing to draw');
      total += c.triangles;
      rows.push([car, c]);
    } catch (error) { bad.push(car.id + ' (' + error.message + ')'); }
  }
  rows.sort((a, b) => b[1].triangles - a[1].triangles);
  for (const [car, c] of rows) console.log('        ' + car.id.padEnd(16) + String(c.meshes).padStart(4) + ' shapes ' + String(c.triangles).padStart(7) + ' triangles ' + String(c.materials).padStart(4) + ' materials   ' + sizeWords(car));
  check(!bad.length && rows.length === ideas.length, 'every idea car (' + ideas.length + ') is built for the inspector, Good and Evil, out of any scene, and counted (' + total.toLocaleString('en') + ' triangles in all)' + (bad.length ? ' (not: ' + bad.join('; ') + ')' : ''));
  check(!blocks.length, 'each has a model of its own, not the plain block' + (blocks.length ? ' (blocks: ' + blocks.join(', ') + ')' : ''));
  if (!only) {
    // the cars of the lot and the showroom (Inspect on Crazey Jim's tab): built and counted the same way
    const roster = showroomCars(), wrong = [];
    for (const car of roster) {
      try { const m = buildInspectModel(car, false); const c = countModel(m); if (m.parent || !c.triangles) wrong.push(car.id); } catch (error) { wrong.push(car.id + ' (' + error.message + ')'); }
    }
    check(!wrong.length, 'every roster car (' + roster.length + ') is built and counted too' + (wrong.length ? ' (not: ' + wrong.join(', ') + ')' : ''));
    // the counting itself, on a model of known make
    const THREE = await import('three');
    const g = new THREE.Group(), box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    const many = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), box.material, 3), hidden = box.clone();
    hidden.visible = false;
    g.add(box, many, hidden);
    const c = countModel(g);
    check(c.meshes === 2 && c.triangles === 12 + 36 && c.materials === 1, 'the count: a box is 12 triangles, an instanced one times its copies, a hidden part not counted (' + JSON.stringify(c) + ')');
  }
} finally {
  await server.close();
}
// ---- the source: one renderer, a capped picture, nothing running when closed, back closes it, the lot paused under it ----
const src = readFileSync('src/delivery/render/inspector.js', 'utf8').replace(/\/\/.*$/gm, '');
const garage = readFileSync('src/delivery/render/garage.js', 'utf8');
check(!/new THREE\.WebGLRenderer|getContext\(['"]webgl/.test(src) && /sharedRenderer\(\)/.test(src), 'no WebGL context of its own: it draws with the shared renderer (modelviews.js sharedRenderer)');
check(/Math\.min\(window\.devicePixelRatio \|\| 1, 2/.test(src), 'its pixel ratio is capped at 2');
check(/close\(\)\s*\{[\s\S]*?cancelAnimationFrame\(raf\)[\s\S]*?Nav\.leave\('inspect'\)/.test(src) && /Nav\.enter\('inspect'/.test(src), 'it takes a history entry (back closes it) and its loop is cancelled when it closes');
check(/render\(now\)\s*\{\s*if \(Inspector\.isOpen\) return;/.test(garage), 'the garage\'s lot is not drawn while it is up');
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
