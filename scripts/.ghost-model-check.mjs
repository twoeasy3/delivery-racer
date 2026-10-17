// A check of the best run's GHOST car's model (render/ghostmodel.js, drawn by render/ghostcar.js; CHECKLIST 445): for about
// 25 cars (box-car-sized commuters, Super versions, Legendary cars, car ideas, amphibious cars, the tall and odd ones: the
// monster truck, the bus, the Tank, the Saucer, the hovercraft...) the ghost is built as the game builds it and must be the
// car's OWN model (not the box car: only a car with no model of its own is that, as in play), one mesh in the shared ghost
// material (see-through, no depth write, no shadow, drawn late), the same triangles and bounds as the car's stock model
// (render/showcar.js makeShowCar with stock: true, less a Super car's glow and a Legendary car's wreaths), with nothing of the
// player's loadout on it (a wheel set is worn here, and it does dress the show cars), and swapping cars disposes the last
// one's geometry and leaves nothing behind in the scene. No picture: stills of it are taken in a browser (CHECKLIST 445).
//   node scripts/.ghost-model-check.mjs
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  const THREE = await import('three');
  const W = await load('render/wheelcosmetic.js');
  // (the player's loadout: a redline wheel set with turbine rims on every car, which the ghost must not wear)
  localStorage.setItem(W.KEY, 'gold'); localStorage.setItem(W.KEY_DESIGN, 'redline'); localStorage.setItem('delivery.wheelrim', 'turbine');
  const { makeShowCar } = await load('render/showcar.js');
  const { ghostSource, flattenModel, ghostMeshFor, GhostModel, GHOST_MAT } = await load('render/ghostmodel.js');
  const { scene } = await load('render/scene.js');
  const { carById, CARS, FILLER_CARS, EARNED_CARS, BESPOKE_CARS, EVENT_CARS } = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const all = [...CARS, ...FILLER_CARS, ...EARNED_CARS, ...BESPOKE_CARS, ...EVENT_CARS, ...IDEA_CARS];
  const first = (test) => all.find(test);
  const named = ['commuter', 'junker', 'lowrider', 'bus', 'wedge', 'monster', 'tank', 'ufo', 'wedgemicro', 'sport', 'van', 'hearse', 'limo', 'pickup', 'hovercraft', 'f1'];
  const picks = [...named.map(id => carById(id)),
    first(c => c.super), first(c => c.superKit && !c.super), first(c => c.legend), all.filter(c => c.legend)[1],
    first(c => c.idea), IDEA_CARS[Math.floor(IDEA_CARS.length / 2)], IDEA_CARS[IDEA_CARS.length - 1],
    first(c => c.amphibious), all.filter(c => c.amphibious)[2], first(c => c.kind === 'bus' || c.height > 2.8 && c.model !== 'citybus')];
  const cars = [...new Set(picks.filter(Boolean))];
  check(cars.length >= 24, cars.length + ' cars: ' + cars.map(c => c.id).join(', '));

  // the stock model's visible triangles as the ghost flattens them, less what the ghost leaves off (a Super glow, a Legendary wreath)
  const stockGeometry = (car) => {
    const model = makeShowCar(car, { stock: true });
    model.removeFromParent();
    model.traverse((o) => { if (o.userData.legend && o.isMesh) o.visible = false; });
    if (car.ufo) { const g = new THREE.Group(); model.position.y = 1.0; g.add(model); return flattenModel(g); } // (the Saucer at its hover height, as in play)
    return flattenModel(model);
  };
  // (the tags the dressing modules put on what they add: render/rims.js, treads.js, wheelcosmetic.js, platecosmetic.js, propdress.js, decalcosmetic.js, underglow.js)
  const COSMETIC = ['wheelRing', 'plateFace', 'propCosmetic', 'decalCosmetic', 'flankDecal', 'underglow'];
  let dressedDiffers = 0;
  for (const car of cars) {
    const { model, source } = ghostSource(car, false);
    const tagged = []; model.traverse((o) => { for (const k of COSMETIC) if (o.userData[k] && o !== model) tagged.push(k); });
    const ghost = flattenModel(model), ref = stockGeometry(car);
    const gb = ghost.boundingBox, rb = ref.boundingBox, size = rb.getSize(new THREE.Vector3());
    const tol = Math.max(size.x, size.y, size.z) * 0.03;
    const off = Math.max(...['x', 'y', 'z'].flatMap(a => [Math.abs(gb.min[a] - rb.min[a]), Math.abs(gb.max[a] - rb.max[a])]));
    const tris = ghost.index.count / 3, refTris = ref.index.count / 3;
    const box = source === 'box', hasModel = !!(car.model || car.idea || car.tank || car.ufo);
    const dressed = makeShowCar(car); dressed.removeFromParent();
    const dressedTris = flattenModel(dressed).index.count / 3;
    if (dressedTris !== refTris) dressedDiffers++;
    check(box === !hasModel && tris > (box ? 0 : 60) && !tagged.length && off <= tol && Math.abs(tris - refTris) <= refTris * 0.03,
      car.id + ': ' + source + ', ' + tris + ' triangles (stock ' + refTris + ', dressed ' + dressedTris + '), size ' + size.toArray().map(n => n.toFixed(2)).join(' x ')
      + ' m, bounds off by ' + off.toFixed(3) + ' m' + (tagged.length ? ', COSMETICS ' + tagged.join(' ') : ''));
  }
  check(dressedDiffers >= 5, 'the loadout is worn here (' + dressedDiffers + ' of the cars dressed differ from stock), and not by the ghost');

  // the game's one ghost mesh: one material, no shadow, drawn late; swapping cars disposes the last geometry, adds nothing to the scene
  const kids = scene.children.length;
  const disposed = new Set(), seen = [];
  const sequence = [cars[0], cars[0], cars[3], cars[5], cars[5], cars[7], cars[0]];
  let builds = 0, prev = null;
  for (const car of sequence) {
    const mesh = ghostMeshFor(car, false, scene);
    if (mesh.geometry !== prev) { builds++; seen.push(mesh.geometry); mesh.geometry.addEventListener('dispose', (e) => disposed.add(e.target)); prev = mesh.geometry; }
  }
  const mesh = GhostModel.mesh;
  let meshes = 0, wrong = 0;
  mesh.traverse((o) => { if (o.isMesh) { meshes++; if (o.material !== GHOST_MAT) wrong++; } });
  check(meshes === 1 && !wrong && GHOST_MAT.transparent && GHOST_MAT.opacity === 0.38 && GHOST_MAT.depthWrite === false && GHOST_MAT.color.getHex() === 0xbfefff
    && !mesh.castShadow && !mesh.receiveShadow && mesh.renderOrder >= 2, 'the ghost is one mesh in the shared pale see-through material (0xbfefff, 0.38, no depth write, no shadow, render order ' + mesh.renderOrder + ')');
  check(builds === 5, 'rebuilt only when the car changes: ' + builds + ' builds for ' + sequence.length + ' calls (5 changes)');
  check(seen.slice(0, -1).every(g => disposed.has(g)) && !disposed.has(seen[seen.length - 1]), 'every geometry but the one shown disposed (' + disposed.size + ' of ' + seen.length + ')');
  check(scene.children.length === kids + 1 && scene.children.filter(c => c === mesh).length === 1,
    'nothing left in the scene but the one ghost mesh (' + scene.children.length + ' children, ' + kids + ' before)');
  const g1 = ghostMeshFor(cars[0], true, scene).geometry;
  check(GhostModel.evil === true && g1 !== seen[seen.length - 1], 'Evil as recorded: built afresh for the side');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
} finally {
  await server.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
