// A check of the WHEEL COLOUR cosmetic (render/wheelcosmetic.js, CHECKLIST 263): the one global choice that recolours the hubs of
// whatever car is shown or driven. For every car of the roster (garage, filler, Bespoke, event and earned cars, the ideas, every
// Super version), built as the showroom builds it (render/showcar.js makeShowCar): its hubs are found (the hit rate is printed,
// and the cars left stock are listed: the ones with no tyres and the ones whose wheels show no hub); a colour is put on, then
// Stock again: the hubs wear a CLONE (no shared, cached material is ever changed: every other part keeps its material, object and
// colour), Stock gives the very same stock material back, a ghost's stand-in or a blackout silhouette is left alone / the paint
// under the ghost changes, a Legendary car keeps its gold, dents move the same panels with a blue hub as with a stock one, nothing
// is written onto a car's entry, the rules' fingerprint does not include the module, the choice is kept in localStorage (and
// survives a fresh load), works with no storage, and is ignored with Progress.noSave. No picture (scripts/shots.mjs).
//   node scripts/.wheelcosmetic-check.mjs            (add a car id to see only that car)
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
const plain = (car) => JSON.stringify(car, (k, v) => (typeof v === 'function' ? 'fn' : v));
try {
  const THREE = await import('three');
  const { makeShowCar } = await load('render/showcar.js');
  const { showroomCars } = await load('showroomData.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { superOf, CARS } = await load('cars.js');
  const W = await load('render/wheelcosmetic.js');
  const { dentModel, glassy } = await load('render/dents.js');
  const { silhouetteFor } = await load('render/silhouette.js');
  const only = process.argv[2];
  const cars = [...new Set([...showroomCars(), ...IDEA_CARS, ...CARS.map(superOf).filter(Boolean)])].filter(car => !only || car.id === only);
  const entryBefore = new Map(cars.map(car => [car, plain(car)]));
  const build = (car) => { try { return makeShowCar(car); } catch { return null; } };
  const hexOf = (id) => W.WHEEL_COLOURS.find(c => c.id === id).hex;
  check(W.wheelColour() === 'stock', 'a fresh visit with nothing saved: Stock');

  // the models, built under Stock; every material of every part noted (object and colour)
  const stat = { cars: 0, tyred: 0, hit: 0, miss: [], none: [], partial: [], legend: [], hubs: 0, tyres: 0, tyresWithHub: 0 };
  const models = [];
  for (const car of cars) {
    const model = build(car);
    if (!model) continue;
    const found = model.userData.wheelHubs;
    const snap = new Map();
    model.traverse(n => { if (n.isMesh) snap.set(n, { material: n.material, hex: n.material.color?.getHex?.() }); });
    const tyres = W.findHubs(model).tyres.length, hubs = found.hubs.length;
    stat.cars++;
    if (car.legend) stat.legend.push(car.id);
    else if (!tyres) stat.none.push(car.id);
    else {
      stat.tyred++; stat.tyres += tyres;
      const withHub = new Set(found.hubs.map(h => h.tyre)).size;
      stat.tyresWithHub += withHub; stat.hubs += hubs;
      if (hubs) { stat.hit++; if (withHub < tyres) stat.partial.push(car.id + ' ' + withHub + '/' + tyres); } else stat.miss.push(car.id);
    }
    models.push({ car, model, snap, hubs: found.hubs });
  }
  console.log('        hubs found on ' + stat.hit + ' of ' + stat.tyred + ' cars with tyres (' + stat.tyresWithHub + ' of ' + stat.tyres + ' tyres; ' + stat.hubs + ' hub parts), ' + stat.cars + ' cars built');
  console.log('        no tyres (stay stock): ' + stat.none.join(', '));
  console.log('        tyres but no hub (stay stock): ' + (stat.miss.join(', ') || 'none') + '; some wheels without (' + (stat.partial.join(', ') || 'none') + ')');
  console.log('        Legendary (keep their gold): ' + stat.legend.join(', '));
  if (!only) check(stat.hit / stat.tyred >= 0.95 && stat.tyresWithHub / stat.tyres >= 0.95, 'the hubs are found on 95% or more of the cars with tyres, and of their tyres');

  // a colour on
  const green = hexOf('green');
  W.setWheelColour('green');
  check(W.wheelColour() === 'green', 'a change takes at once');
  const bad = [];
  for (const { car, model, snap, hubs } of models) {
    const hubSet = new Set(hubs.map(h => h.mesh));
    model.traverse(n => {
      if (!n.isMesh) return;
      const was = snap.get(n);
      if (hubSet.has(n)) { if (n.material === was.material || n.material.color.getHex() !== green) bad.push(car.id + ' hub not green'); }
      else if (n.material !== was.material || n.material.color?.getHex?.() !== was.hex) bad.push(car.id + ' non-hub changed');
    });
    for (const [, s] of snap) if (s.material.color && s.material.color.getHex() !== s.hex) bad.push(car.id + ' a stock material was mutated');
  }
  check(!bad.length, 'Green: every hub wears a green clone; every other part keeps its very material and colour; no stock (shared) material is changed' + (bad.length ? ' (' + bad.slice(0, 6).join('; ') + ')' : ''));
  const tyreBad = models.filter(({ model }) => W.findHubs(model).tyres.some(t => t.material.color && t.material.color.getHex() === green));
  check(!tyreBad.length, 'no tyre turns green');
  const legends = models.filter(({ car }) => car.legend);
  check(legends.every(({ hubs }) => !hubs.length), 'Legendary cars: no hub is recoloured (' + legends.length + ' cars)');
  W.setWheelColour('stock');
  check(models.every(({ model, snap }) => { let ok = true; model.traverse(n => { if (n.isMesh && n.material !== snap.get(n).material) ok = false; }); return ok; }), 'Stock puts every very same stock material back, on every car');

  // the ghost: its stand-in material is on the parts, their own paint put aside in userData.solidMat (render/items.js ghostify)
  {
    const sample = models.find(({ car }) => car.id === 'commuter') || models.find(({ hubs }) => hubs.length);
    const GHOST = new THREE.MeshLambertMaterial({ color: 0xdfe9ff });
    const hub = sample.hubs[0].mesh, stockMat = sample.hubs[0].stock, red = hexOf('red');
    hub.userData.solidMat = hub.material; hub.material = GHOST; // (ghostify on)
    W.setWheelColour('red');
    check(hub.material === GHOST && hub.userData.solidMat.color.getHex() === red && hub.userData.solidMat !== stockMat, 'a ghost: the stand-in stays on, the paint under it takes the new colour');
    hub.material = hub.userData.solidMat; hub.userData.solidMat = null; // (ghostify off)
    check(hub.material.color.getHex() === red, 'after the ghost: the hub is red');
    W.setWheelColour('stock');
    check(hub.material === stockMat, 'and Stock gives the stock material back');
    const sil = silhouetteFor(hub.material);
    hub.material = sil;
    W.setWheelColour('gold');
    check(hub.material === sil, 'a blacked-out silhouette is left alone');
    hub.material = stockMat;
    W.setWheelColour('stock');
  }

  // dents: the same panels move with a blue hub as with a stock one (a blue is "glass" by dents.js's colour test, unless it is a hub)
  {
    const sig = (model) => { let h = 0, n = 0; model.traverse(m => { if (m.isMesh) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { h += p.getX(i) * 1.3 + p.getY(i) * 2.1 + p.getZ(i) * 3.7; n++; } } }); return h.toFixed(4) + '/' + n; };
    for (const id of ['commuter', 'pickup', 'sport', 'steamwagon', 'coach', 'woody'].filter(id => cars.some(c => c.id === id))) {
      const car = cars.find(c => c.id === id);
      W.setWheelColour('stock');
      const a = build(car); a.updateMatrixWorld(true); dentModel(a, a.userData.body, 1); const sa = sig(a);
      W.setWheelColour('blue');
      const b = build(car); b.updateMatrixWorld(true); dentModel(b, b.userData.body, 1); const sb = sig(b);
      const hubGlass = b.userData.wheelHubs.hubs.some(h => glassy(h.mesh.material) && !h.mesh.material.userData.wheelHub);
      check(sa === sb && !hubGlass, id + ': at full damage the same panels move with blue hubs as with stock ones (the blue clone is flagged, not taken for glass)');
      dentModel(b, b.userData.body, 0);
      check(b.userData.wheelHubs.hubs.every(h => h.mesh.material.color.getHex() === hexOf('blue')), id + ': and the hubs are still blue after a dent and a repair');
      W.setWheelColour('stock');
    }
  }

  // nothing written onto a car, nothing in the fingerprint
  check(cars.every(car => plain(car) === entryBefore.get(car)), 'no car entry changed (' + cars.length + ' cars)');
  const { logicFiles } = await import('../vite.config.js');
  const files = logicFiles();
  check(!files.some(f => /wheelcosmetic/.test(f)) && !files.some(f => f.startsWith('render/')), 'the replay fingerprint (vite.config.js logicFiles) does not include the module (' + files.length + ' files, none under render/)');

  // keeping it
  const raw = globalThis.localStorage;
  W.setWheelColour('gold');
  check(raw.getItem(W.KEY) === 'gold', 'the choice is kept in localStorage under ' + W.KEY + ' (and not in the cookie: ' + JSON.stringify(document.cookie) + ')');
  server.moduleGraph.invalidateAll();
  const fresh = await load('render/wheelcosmetic.js');
  check(fresh !== W && fresh.wheelColour() === 'gold', 'a fresh load (a reload) finds Gold');
  raw.setItem(W.KEY, 'nonsense');
  server.moduleGraph.invalidateAll();
  check((await load('render/wheelcosmetic.js')).wheelColour() === 'stock', 'a saved id it does not know: Stock');
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  server.moduleGraph.invalidateAll();
  const blocked = await load('render/wheelcosmetic.js');
  let threw = false;
  try {
    check(blocked.wheelColour() === 'stock', 'no storage (it throws): Stock');
    blocked.setWheelColour('red');
    check(blocked.wheelColour() === 'red', 'no storage: a change still holds for the visit');
  } catch { threw = true; }
  check(!threw, 'no storage: nothing throws');
  globalThis.localStorage = raw;
  raw.setItem(W.KEY, 'gold');
  server.moduleGraph.invalidateAll();
  const quiet = await load('render/wheelcosmetic.js');
  const { Progress } = await load('progress.js');
  Progress.noSave = true;
  check(quiet.wheelColour() === 'stock', 'a visit with test switches (Progress.noSave) ignores the saved Gold');
  quiet.setWheelColour('red');
  check(quiet.wheelColour() === 'red' && raw.getItem(W.KEY) === 'gold', 'and a change in it lasts the visit only: the saved Gold is not overwritten');
  Progress.noSave = false;
} finally {
  await server.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
