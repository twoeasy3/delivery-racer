// A check of the WHEEL COLOUR cosmetic (render/wheelcosmetic.js, CHECKLIST 263): the one global choice that recolours the hubs of
// whatever car is shown or driven. For every car of the roster (garage, filler, Bespoke, event and earned cars, the ideas, every
// Super version), built as the showroom builds it (render/showcar.js makeShowCar): its hubs are found (the hit rate is printed,
// and the cars left stock are listed: the ones with no tyres and the ones whose wheels show no hub); a colour is put on, then
// Stock again: the hubs wear a CLONE (no shared, cached material is ever changed: every other part keeps its material, object and
// colour), Stock gives the very same stock material back, a ghost's stand-in or a blackout silhouette is left alone / the paint
// under the ghost changes, a Legendary car keeps its gold, dents move the same panels with a blue hub as with a stock one, nothing
// is written onto a car's entry, the rules' fingerprint does not include the module, the choice is kept in localStorage (and
// survives a fresh load), works with no storage, and is ignored with Progress.noSave. DESIGNS (tyre + hub presets: sidewall rings,
// red tyres): the same for every design on every car (a ring per hubbed tyre, 32 triangles, one shared geometry per shape; rubber
// cloned; stock shared materials never changed; Stock gives everything back and removes the rings), plus the ghost, a silhouette,
// dents, the suspension finder, the z-fight finder, and storage under its own key. No picture (scripts/shots.mjs).
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
      if (!n.isMesh || n.userData.wheelRing || !snap.has(n)) return; // (a rim, ring or tread put on by the dressing, e.g. the Wedge's stock Dial rim, rebuilt on a change: not a part of the car)
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
  // (a rim the dressing put on, as the Wedge's stock Dial, is no stock part: only the parts snapped at build are compared)
  check(models.every(({ model, snap }) => { let ok = true; model.traverse(n => { if (n.isMesh && snap.has(n) && n.material !== snap.get(n).material) ok = false; }); return ok; }), 'Stock puts every very same stock material back, on every car');

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


  // ---- DESIGNS ----
  {
    const D = W.WHEEL_DESIGNS, ids = D.map(d => d.id);
    check(D.length >= 5 && D.length <= 12 && D[0].id === 'stock', 'the designs: ' + ids.join(', '));
    check(W.wheelDesign() === 'stock', 'a fresh visit: design Stock');
    const hubbed = models.filter(({ car, hubs }) => !car.legend && hubs.length);
    const ringsOf = (model) => { const r = []; model.traverse(n => { if (n.userData.ringSide !== undefined) r.push(n); }); return r; };
    const hubbedTyres = ({ model }) => new Set(model.userData.wheelHubs.info.map(t => t.tyre)).size;
    for (const design of D.slice(1)) {
      W.setWheelDesign(design.id);
      check(W.wheelDesign() === design.id, design.id + ': a change takes at once');
      const bad = [], geos = new Set(); let rings = 0, tris = new Set(), tyresRed = 0;
      for (const { car, model, snap, hubs } of models) {
        const mine = ringsOf(model), found = model.userData.wheelHubs;
        const expect = design.ring ? found.info.reduce((n, t) => n + (t.outer ? 1 : 2), 0) : 0;
        if (mine.length !== expect) bad.push(car.id + ' rings ' + mine.length + '/' + expect);
        if (car.legend || (!hubs.length && !model.userData.stockRim)) { if (mine.length) bad.push(car.id + ' left-stock car has rings'); } // (a model whose wheel is a rim design, the Wedge, takes tyre colours)
        for (const r of mine) { rings++; geos.add(r.geometry); tris.add(r.geometry.index.count / 3); if (!found.info.some(t => t.tyre === r.parent)) bad.push(car.id + ' ring not on a hubbed tyre'); }
        const partSet = new Set(found.parts.map(p => p.mesh)), hubSet = new Set(hubs.map(h => h.mesh));
        model.traverse(n => {
          if (!n.isMesh || n.userData.wheelRing) return;
          const was = snap.get(n);
          if (partSet.has(n) && design.tyre !== null) { tyresRed++; if (n.material === was.material || n.material.color.getHex() !== design.tyre) bad.push(car.id + ' rubber not ' + design.tyre.toString(16)); }
          else if (hubSet.has(n) && design.hub !== null) { if (n.material === was.material || n.material.color.getHex() !== design.hub) bad.push(car.id + ' hub not the design hub'); }
          else if (n.material !== was.material) bad.push(car.id + ' an unrelated part changed');
        });
        for (const [, st] of snap) if (st.material.color && st.material.color.getHex() !== st.hex) bad.push(car.id + ' a stock material was mutated');
      }
      check(!bad.length, design.id + ': a ring on every hubbed tyre only, rubber / hubs clones in the design colour, nothing else changed, no stock material mutated' + (bad.length ? ' (' + bad.slice(0, 5).join('; ') + ')' : ''));
      if (design.ring) check(geos.size === 1 && [...tris].join() === '32', design.id + ': ' + rings + ' rings share ONE geometry of ' + [...tris].join() + ' triangles each');
      if (design.tyre !== null) check(tyresRed > 0 && models.every(({ model }) => { let ok = true; for (const t of model.userData.wheelHubs.info) if (t.tyre.material.color.getHex() !== design.tyre) ok = false; return ok; }), design.id + ': every hubbed tyre wears the design colour (' + tyresRed + ' rubber parts)');
      // a hub colour chosen apart wins; Stock hub colour leaves the design's hubs
      if (design.hub !== null) {
        W.setWheelColour('green');
        check(hubbed.every(({ model }) => model.userData.wheelHubs.hubs.every(h => h.mesh.material.color.getHex() === hexOf('green'))), design.id + ': a chosen hub colour (Green) wins over the design hub');
        check(design.tyre === null || hubbed.every(({ model }) => model.userData.wheelHubs.info.every(t => t.tyre.material.color.getHex() === design.tyre)), design.id + ': ...and the tyres keep the design');
        W.setWheelColour('stock');
      }
    }
    // the hit rate of designs: cars that get a design / cars with tyres
    W.setWheelDesign('whitewall');
    const cover = hubbed.filter(m => ringsOf(m.model).length).length, tyresAll = models.reduce((n, m) => n + (m.car.legend ? 0 : W.findHubs(m.model).tyres.length), 0), tyresDone = hubbed.reduce((n, m) => n + hubbedTyres(m), 0);
    console.log('        designs reach ' + cover + ' cars; ' + tyresDone + ' of ' + tyresAll + ' tyres of the non-Legendary cars; Legendary and cars with no hub stay stock: ' + (models.length - cover));
    if (!only) check(tyresDone / tyresAll >= 0.95, 'designs reach 95% or more of the tyres');
    // Stock restores everything
    W.setWheelDesign('stock');
    check(models.every(({ model, snap }) => { let ok = !ringsOf(model).length; model.traverse(n => { if (n.isMesh && !n.userData.wheelRing && n.material !== snap.get(n)?.material) ok = false; }); return ok; }), 'design Stock removes every ring and puts every very same stock material back');
    // back and forth does not pile up rings
    for (const id of ['whitewall', 'redline', 'whitewall']) W.setWheelDesign(id);
    check(models.every(m => ringsOf(m.model).length === (m.model.userData.wheelHubs.info.reduce((n, t) => n + (t.outer ? 1 : 2), 0))), 'changing design again and again leaves one set of rings');
    W.setWheelDesign('stock');

    // a model BUILT while a design is on is dressed as it is built
    W.setWheelDesign('redwhite');
    const born = build(cars.find(c => c.id === 'commuter') || hubbed[0].car);
    check(ringsOf(born).length === 0 && born.userData.wheelHubs.hubs.every(h => h.mesh.material.color.getHex() === 0xf4f4f2) && born.userData.wheelHubs.info.every(t => t.tyre.material.color.getHex() === 0xd8262b), 'a car built under Red tyres, white hubs wears them from the start');
    W.setWheelColour('stock'); W.setWheelDesign('goldwall'); // (since the three-part set the hub is its own choice: the old gold-hub design brings its gold only where the hub was Stock)
    const born2 = build(cars.find(c => c.id === 'commuter') || hubbed[0].car);
    check(ringsOf(born2).length > 0 && born2.userData.wheelHubs.hubs.every(h => h.mesh.material.color.getHex() === 0xd9a92a), 'a car built under Gold hubs, whitewall wears them from the start');

    // the ghost and a blackout
    {
      const m = hubbed.find(({ car }) => car.id === 'commuter') || hubbed[0], found = m.model.userData.wheelHubs, tyre = found.info[0].tyre;
      const GHOST = new THREE.MeshLambertMaterial({ color: 0xdfe9ff });
      W.setWheelDesign('stock');
      tyre.userData.solidMat = tyre.material; tyre.material = GHOST; // (ghostify on)
      W.setWheelDesign('redwhite');
      check(tyre.material === GHOST && tyre.userData.solidMat.color.getHex() === 0xd8262b, 'a ghost: the stand-in stays on a tyre, the paint under it turns red');
      W.setWheelDesign('whitewall');
      const gr = ringsOf(m.model).filter(r => r.parent === tyre);
      check(gr.length > 0 && gr.every(r => r.material === GHOST && r.userData.solidMat), 'a ring added during a ghost is pale like the rest, its own white under it');
      tyre.material = tyre.userData.solidMat; tyre.userData.solidMat = null; for (const r of gr) { r.material = r.userData.solidMat; r.userData.solidMat = null; } // (ghostify off)
      W.setWheelDesign('stock');
      check(tyre.material === found.info[0].stock && !ringsOf(m.model).length, 'after the ghost, Stock gives the tyre back and the rings go');
      const sil = silhouetteFor(tyre.material);
      tyre.material = sil;
      W.setWheelDesign('redline');
      check(tyre.material === sil && !ringsOf(m.model).some(r => r.parent === tyre), 'a blacked-out tyre is left alone and gets no ring');
      tyre.material = found.info[0].stock;
      W.setWheelDesign('stock');
    }

    // the suspension finder and the dents leave the ring alone
    {
      const { prepareSuspension } = await load('render/carsuspension.js');
      const sig = (model) => { let h = 0, n = 0; model.traverse(x => { if (x.isMesh && !x.userData.wheelRing) { const p = x.geometry.attributes.position; for (let i = 0; i < p.count; i++) { h += p.getX(i) * 1.3 + p.getY(i) * 2.1 + p.getZ(i) * 3.7; n++; } } }); return h.toFixed(4) + '/' + n; };
      for (const id of ['commuter', 'pickup', 'sport', 'steamwagon', 'coach', 'woody'].filter(id => cars.some(c => c.id === id))) {
        const car = cars.find(c => c.id === id);
        W.setWheelDesign('stock');
        const a = build(car); a.updateMatrixWorld(true); const sa = prepareSuspension(a);
        dentModel(a, a.userData.body, 1); const da = sig(a);
        W.setWheelDesign('whitewall');
        const b = build(car); b.updateMatrixWorld(true); const sb = prepareSuspension(b);
        const ringGeo = ringsOf(b)[0]?.geometry, before = ringGeo && ringGeo.attributes.position.array.slice();
        dentModel(b, b.userData.body, 1);
        check(sa.wheels === sb.wheels && sa.how === sb.how && sa.plantedMeshes.length === sb.plantedMeshes.length && sa.squash.length === sb.squash.length, id + ': the suspension finder sees the same wheels with rings on (' + sb.wheels + ', ' + sb.how + ')');
        check(sig(b) === da, id + ': at full damage the same panels move with rings as without');
        check(!ringGeo || before.every((v, i) => v === ringGeo.attributes.position.array[i]), id + ': a dent never moves a ring (the shared geometry is untouched)');
        dentModel(b, b.userData.body, 0);
        check(ringsOf(b).length > 0, id + ': the rings are still on after a dent and a repair');
        W.setWheelDesign('stock');
      }
    }

    // z-fighting: the finder reports nothing new with rings on
    {
      const { findZFights } = await load('render/zfight.js');
      let worse = [];
      for (const id of ['commuter', 'pickup', 'sport', 'steamwagon', 'coach', 'woody', 'hatch'].filter(id => cars.some(c => c.id === id))) {
        const car = cars.find(c => c.id === id);
        W.setWheelDesign('stock');
        const a = build(car); a.updateMatrixWorld(true);
        W.setWheelDesign('goldwall');
        const b = build(car); b.updateMatrixWorld(true);
        const na = findZFights(a).length, nb = findZFights(b).length;
        if (nb > na) worse.push(id + ' ' + na + '->' + nb);
      }
      check(!worse.length, 'the z-fight finder finds nothing new with rings on, 5 mm off the tyre (' + (worse.join('; ') || 'same') + ')');
    }
    W.setWheelDesign('stock');
    W.setWheelColour('stock');
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
  raw.removeItem('delivery.loadout'); raw.setItem(W.KEY, 'nonsense');
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
  raw.removeItem('delivery.loadout'); raw.setItem(W.KEY, 'gold');
  server.moduleGraph.invalidateAll();
  const quiet = await load('render/wheelcosmetic.js');
  const { Progress } = await load('progress.js');
  Progress.noSave = true;
  check(quiet.wheelColour() === 'stock', 'a visit with test switches (Progress.noSave) ignores the saved Gold');
  quiet.setWheelColour('red');
  check(quiet.wheelColour() === 'red' && raw.getItem(W.KEY) === 'gold', 'and a change in it lasts the visit only: the saved Gold is not overwritten');
  Progress.noSave = false;

  // the design is kept too, under its own key
  {
    const raw2 = globalThis.localStorage;
    server.moduleGraph.invalidateAll();
    const w1 = await load('render/wheelcosmetic.js');
    w1.setWheelDesign('redline');
    check(raw2.getItem(w1.KEY_DESIGN) === 'redline' && w1.KEY_DESIGN !== w1.KEY, 'the design is kept in localStorage under ' + w1.KEY_DESIGN);
    server.moduleGraph.invalidateAll();
    check((await load('render/wheelcosmetic.js')).wheelDesign() === 'redline', 'a fresh load finds Redline');
    raw2.removeItem('delivery.loadout'); raw2.setItem(w1.KEY_DESIGN, 'nonsense');
    server.moduleGraph.invalidateAll();
    check((await load('render/wheelcosmetic.js')).wheelDesign() === 'stock', 'a saved design it does not know: Stock');
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    server.moduleGraph.invalidateAll();
    const b2 = await load('render/wheelcosmetic.js');
    let threw2 = false;
    try { check(b2.wheelDesign() === 'stock', 'no storage: design Stock'); b2.setWheelDesign('whitewall'); check(b2.wheelDesign() === 'whitewall', 'no storage: a design change still holds for the visit'); } catch { threw2 = true; }
    check(!threw2, 'no storage: nothing throws (design)');
    globalThis.localStorage = raw2;
    raw2.removeItem('delivery.loadout'); raw2.setItem(w1.KEY_DESIGN, 'redline');
    server.moduleGraph.invalidateAll();
    const q2 = await load('render/wheelcosmetic.js'), { Progress: P2 } = await load('progress.js');
    P2.noSave = true;
    check(q2.wheelDesign() === 'stock', 'with test switches (Progress.noSave) the saved Redline is ignored');
    q2.setWheelDesign('whitewall');
    check(q2.wheelDesign() === 'whitewall' && raw2.getItem(w1.KEY_DESIGN) === 'redline', 'and a design change lasts the visit only');
    P2.noSave = false;
  }
  // WHEEL SETS: the player-facing complete wheel (design + hub colour together); the equipped set is derived from the two keys
  {
    const raw3 = globalThis.localStorage;
    raw3.removeItem('delivery.loadout'); raw3.removeItem(W.KEY); raw3.removeItem(W.KEY_DESIGN);
    server.moduleGraph.invalidateAll();
    const S = await load('render/wheelcosmetic.js'), { Progress: P3 } = await load('progress.js');
    const sets = S.WHEEL_SETS;
    check(sets.length >= 10 && sets.length <= 40 && new Set(sets.map(x => x.id)).size === sets.length, sets.length + ' sets, ids unique');
    check(new Set(sets.map(x => x.design + '/' + x.hub + '/' + (x.rim || 'none') + '/' + (x.tread || 'none'))).size === sets.length, 'no two presets are the same tyre colour + hub + rim + tread');
    check(sets.every(x => S.WHEEL_DESIGNS.some(d => d.id === x.design) && S.WHEEL_COLOURS.some(c => c.id === x.hub)), 'every set uses an existing design and hub colour');
    check(sets[0].id === 'stock' && sets[0].design === 'stock' && sets[0].hub === 'stock', 'the first set is Stock');
    check(S.wheelSet() === 'stock', 'nothing saved: the equipped set is Stock');
    const pick = models.find(m => m.car.id === 'pickup') || models.find(m => !m.car.legend && m.model.userData.wheelHubs.hubs.length);
    const model3 = pick.model, hubsOf = model3.userData.wheelHubs;
    let calls = 0;
    const off = W.onWheelColour(() => calls++);
    for (const set of sets) {
      calls = 0;
      W.setWheelSet(set.id);
      check(W.wheelDesign() === set.design && W.wheelColour() === set.hub && W.wheelSet() === set.id, set.id + ': design + hub set together, and detected as equipped');
      check(calls === 1, set.id + ': one change notice');
      check(raw3.getItem(W.KEY_DESIGN) === set.design && raw3.getItem(W.KEY) === set.hub && JSON.parse(raw3.getItem('delivery.wheelrim')).all === (set.rim || 'none'), set.id + ': the two existing keys hold it, and the rim key its rim (' + (set.rim || 'none') + ')');
      const d = W.WHEEL_DESIGNS.find(x => x.id === set.design), c = W.WHEEL_COLOURS.find(x => x.id === set.hub);
      const wantHub = c.hex !== null ? c.hex : d.hub;
      const hubOk = wantHub === null ? hubsOf.hubs.every(h => h.mesh.material === h.stock) : hubsOf.hubs.every(h => h.mesh.material.color.getHex() === wantHub);
      check(hubOk && (d.ring ? hubsOf.rings.length > 0 : hubsOf.rings.length === 0), set.id + ': the live car wears the hub and the tyre treatment');
    }
    off();
    check(raw3.getItem('delivery.wheelset') === null, 'no wheelset key was stored');
    // an older / test-switch pair that is no set
    W.setWheelDesign('redline'); W.setWheelColour('gold');
    check(W.wheelSet() === 'custom', 'redline + gold (no set): Custom');
    check(W.wheelDesign() === 'redline' && W.wheelColour() === 'gold' && hubsOf.rings.length > 0, 'and Custom keeps working (the pair is applied)');
    server.moduleGraph.invalidateAll();
    const R = await load('render/wheelcosmetic.js');
    check(R.wheelSet() === 'custom' && R.wheelDesign() === 'redline', 'reload: Custom survives');
    W.setWheelSet('gold-rush'); server.moduleGraph.invalidateAll();
    check((await load('render/wheelcosmetic.js')).wheelSet() === 'gold-rush', 'reload: the equipped set is found again from the two keys');
    raw3.removeItem('delivery.loadout'); raw3.setItem(S.KEY_DESIGN, 'nonsense'); raw3.setItem(S.KEY, 'nonsense'); server.moduleGraph.invalidateAll();
    check((await load('render/wheelcosmetic.js')).wheelSet() === 'stock', 'garbage saved: Stock');
    S.setWheelSet('no-such-set');
    check(S.wheelSet() === 'stock', 'an unknown set id changes nothing');
    // blocked storage
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    server.moduleGraph.invalidateAll();
    const B = await load('render/wheelcosmetic.js');
    let thr = false;
    try { check(B.wheelSet() === 'stock', 'no storage: Stock'); B.setWheelSet('red-white'); check(B.wheelSet() === 'red-white', 'no storage: a set holds for the visit'); } catch { thr = true; }
    check(!thr, 'no storage: nothing throws (sets)');
    globalThis.localStorage = raw3;
    // noSave
    raw3.removeItem('delivery.loadout'); raw3.setItem(S.KEY_DESIGN, 'redline'); raw3.setItem(S.KEY, 'blue');
    server.moduleGraph.invalidateAll();
    const N = await load('render/wheelcosmetic.js'), { Progress: P4 } = await load('progress.js');
    check(N.wheelSet() === 'redline-blue', 'saved redline + blue: that set');
    P4.noSave = true;
    check(N.wheelSet() === 'stock', 'noSave: the saved set is ignored (Stock)');
    N.setWheelSet('orange-pop');
    check(N.wheelSet() === 'orange-pop' && raw3.getItem(S.KEY) === 'blue' && raw3.getItem(S.KEY_DESIGN) === 'redline', 'noSave: a set lasts the visit and the saved pair is not overwritten');
    P4.noSave = false;
    N.setWheelSet('stock');
    raw3.removeItem('delivery.loadout'); raw3.removeItem(S.KEY); raw3.removeItem(S.KEY_DESIGN);
    void P3;
  }

  // ---- RIMS (render/rims.js, CHECKLIST 310): a set's rim, a child of each tyre, turning with the car or at a fixed pace ----
  {
    const raw = globalThis.localStorage;
    raw.removeItem('delivery.loadout'); raw.removeItem('delivery.wheelrim'); raw.removeItem(W.KEY); raw.removeItem(W.KEY_DESIGN);
    server.moduleGraph.invalidateAll();
    const { makeShowCar: make } = await load('render/showcar.js');
    const WC = await load('render/wheelcosmetic.js'), RM = await load('render/rims.js'), { Progress: PR } = await load('progress.js');
    const { CARS: C2, LEVEL_CARS, SECRET_CARS, superOf: sup } = await load('cars.js'), { showroomCars: sc } = await load('showroomData.js'), { IDEA_CARS: IC } = await load('ideas.js');
    const { findZFights } = await load('render/zfight.js'), { dentModel: dent } = await load('render/dents.js'), { prepareSuspension } = await load('render/carsuspension.js');
    const fleetAll = [...new Set([...sc(), ...Object.values(LEVEL_CARS), ...Object.values(SECRET_CARS), ...IC, ...C2.map(sup).filter(Boolean)])], fleet = fleetAll.filter(car => !only || car.id === only);
    const mk = (car) => { try { return make(car); } catch { return null; } };
    const rimsOf = (model) => model.userData.wheelHubs?.rims?.list || [];
    const D = RM.RIM_DESIGNS, rimSets = WC.WHEEL_SETS.filter(x => x.rim);
    check(D[0].id === 'none' && D.slice(1).every(d => d.kind === 'speed' || d.kind === 'spin') && D.length >= 8, 'rim designs (a rim turns with the car, a spinner at its own pace): ' + D.slice(1).map(d => d.id + ' (' + d.kind + ', ' + RM.rimTriangles(d.id) + ' triangles a face)').join(', '));
    check(rimSets.length >= 5 && rimSets.every(x => D.some(d => d.id === x.rim && d.kind)) && !WC.WHEEL_SETS[0].rim && D.slice(1).every(d => rimSets.some(x => x.rim === d.id)), rimSets.length + ' sets carry a rim (every design in one), Stock carries none: ' + rimSets.map(x => x.id).join(', '));
    check(WC.wheelRim() === 'none' && RM.resolveRim('commuter', 'front') === 'none', 'nothing saved: no rim');

    // every rim set on a live car (the Pick-Up), then Stock again
    const pu = mk(fleetAll.find(c => c.id === 'pickup') || fleet[0]), found = pu.userData.wheelHubs;
    const hubsVisible = () => found.rawHubs.every(h => h.mesh.visible);
    check(RM.rimStatus(pu) === 'ok' && rimsOf(pu).length === 0 && hubsVisible(), 'the Pick-Up can wear rims; none on yet, its hubs shown');
    for (const set of rimSets) {
      WC.setWheelSet(set.id);
      const list = rimsOf(pu), hex = (WC.WHEEL_COLOURS.find(c => c.id === set.hub).hex ?? RM.DEFAULT_HEX);
      check(WC.wheelSet() === set.id && WC.wheelRim() === set.rim && list.length === 4 && list.every(m => m.userData.rim.id === set.rim && m.material === RM.rimMaterial(RM.rimHex(set.rim, hex)) && m.geometry === RM.rimGeometry(set.rim)), set.id + ': equipped, the live Pick-Up wears ' + list.length + ' ' + set.rim + ' rims in the set\'s hub colour (one shared geometry and material)');
      check(list.every(m => found.rimInfo.some(t => t.tyre === m.parent)) && list.every(m => m.userData.wheelRing && m.material.userData.wheelHub && (!m.userData.rim.blur || (m.userData.rim.blur.userData.wheelRing && m.userData.rim.blur.material.userData.wheelHub))), set.id + ': every rim is a child of its own tyre, tagged wheelRing, its material wheelHub (and the blur disc too)');
      check(new Set(list.map(m => m.parent)).size === list.length || found.rimInfo.some(t => !t.outer), set.id + ': one rim per tyre face (never one mesh across wheels)');
      check(!hubsVisible(), set.id + ': the stock hubs under the rims are hidden');
    }
    WC.setWheelSet('stock');
    check(rimsOf(pu).length === 0 && hubsVisible() && JSON.parse(raw.getItem('delivery.wheelrim')).all === 'none', 'Stock: the rims go, the hubs come back, the rim key says none');
    for (let i = 0; i < 3; i++) WC.setWheelSet(rimSets[i % 2].id);
    check(rimsOf(pu).length === 4, 'changing set again and again leaves one set of rims');

    // the whole fleet, every design: who wears them, the triangles and meshes it adds, z-fighting, poking through bodywork
    const stat = { ok: [], skip: [], none: [], blocked: [] };
    WC.setWheelSet('stock');
    const base = new Map();
    for (const car of fleet) {
      const m = mk(car);
      if (!m) continue;
      const st = RM.rimStatus(m);
      stat[st].push(car.id);
      if ((m.userData.wheelHubs.blockedFaces || []).length) stat.blocked.push(car.id + ' ' + m.userData.wheelHubs.blockedFaces.length);
      if (st === 'ok') base.set(car, findZFights(m).length);
    }
    console.log('        rims: ' + stat.ok.length + ' cars wear them; skipped (RIM_SKIP or Legendary): ' + stat.skip.join(', '));
    console.log('        no room or no tyre found (stay stock, "No rims for this car"): ' + stat.none.join(', '));
    console.log('        cars with some faces left stock for bodywork over the wheel (faces): ' + (stat.blocked.join(', ') || 'none'));
    if (!only) check(stat.ok.length >= 0.8 * fleet.length, 'rims reach ' + stat.ok.length + ' of ' + fleet.length + ' cars (80% or more)');
    const ray = new THREE.Raycaster(), o = new THREE.Vector3(), e = new THREE.Vector3(), d = new THREE.Vector3();
    for (const design of D.slice(1)) {
      const set = rimSets.find(x => x.rim === design.id);
      WC.setWheelSet(set.id);
      const zf = [], poke = [], tris = [], meshes = [], wrong = [];
      for (const [car, zBase] of base) {
        const m = mk(car), list = rimsOf(m);
        if (!list.length) { wrong.push(car.id + ' no rims'); continue; }
        m.updateMatrixWorld(true);
        tris.push(list.reduce((n, x) => n + RM.rimTriangles(x.userData.rim.id), 0)); meshes.push(list.length);
        const isRim = (x) => !!(x.userData.rim || x.parent?.userData.rim), all = findZFights(m), fights = all.filter(f => isRim(f.a) || isRim(f.b)).length;
        if (fights) zf.push(car.id + ' ' + fights);
        else if (set.design === 'stock' && all.length > zBase) zf.push(car.id + ' ' + zBase + '->' + all.length + ' (a part the hidden hub had covered)'); // (a set with a sidewall ring can add the ring's own: the designs' check above)
        // poking through: from the tyre's face to the rim's top at 36 points of each rim, either way, against everything but the wheel's own parts
        const own = new Set([...m.userData.wheelHubs.tyres, ...m.userData.wheelHubs.rawHubs.map(h => h.mesh)]);
        for (const t of m.userData.wheelHubs.rimInfo) for (const p of t.rubber) own.add(p);
        const others = []; m.traverse(n => { if (n.isMesh && !own.has(n) && !n.userData.wheelRing) { let v = true; for (let p = n; p; p = p.parent) if (!p.visible) v = false; if (v) others.push(n); } });
        for (const rim of list) {
          let hits = 0;
          for (const rho of [0.3, 0.55, 0.8]) for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            const fl = rim.userData.rim.flat;
            o.set(Math.cos(a) * rho, Math.sin(a) * rho, -(fl ? RM.TIGHT_GAP : RM.RIM_GAP) + 0.001).applyMatrix4(rim.matrixWorld);
            e.set(Math.cos(a) * rho, Math.sin(a) * rho, fl ? RM.FLAT_DEPTH : 0.045).applyMatrix4(rim.matrixWorld);
            d.subVectors(e, o); const len = d.length(); d.normalize();
            ray.set(o, d); ray.far = len;
            let hit = ray.intersectObjects(others, false).length > 0;
            if (!hit) { ray.set(e, d.negate()); hit = ray.intersectObjects(others, false).length > 0; }
            if (hit) hits++;
          }
          if (hits > Math.floor((1 - RM.MOSTLY) * 36)) poke.push(car.id + ' ' + hits + '/36'); // (a nearly open face may have a mudguard's edge over a sliver: render/rims.js MOSTLY)
        }
      }
      tris.sort((a, b) => a - b); meshes.sort((a, b) => a - b);
      console.log('        ' + design.id + ': ' + RM.rimTriangles(design.id) + ' triangles a face; per car ' + tris[0] + ' / ' + tris[tris.length >> 1] + ' / ' + tris[tris.length - 1] + ' (least / median / most), ' + meshes[0] + ' to ' + meshes[meshes.length - 1] + ' rim meshes (draw calls)');
      check(!wrong.length, design.id + ': on every car that can wear rims (' + base.size + ')' + (wrong.length ? ' (' + wrong.slice(0, 5).join('; ') + ')' : ''));
      check(!zf.length, design.id + ': the z-fight finder finds no rim in any pair, on any car (' + (zf.slice(0, 6).join('; ') || 'none') + ')');
      check(!poke.length, design.id + ': no rim pokes through bodywork on any car (' + (poke.slice(0, 6).join('; ') || 'none') + ')');
    }
    WC.setWheelSet('stock');

    // dents and the suspension finder: the same with rims on (hubs hidden) as without
    {
      const sig = (model) => { let h = 0, n = 0; model.traverse(x => { if (x.isMesh && !x.userData.wheelRing) { const p = x.geometry.attributes.position; for (let i = 0; i < p.count; i++) { h += p.getX(i) * 1.3 + p.getY(i) * 2.1 + p.getZ(i) * 3.7; n++; } } }); return h.toFixed(4) + '/' + n; };
      for (const id of ['commuter', 'pickup', 'sport', 'coach', 'f1', 'farmtractor'].filter(id => fleetAll.some(c => c.id === id))) {
        const car = fleetAll.find(c => c.id === id);
        WC.setWheelSet('stock');
        const a = mk(car); a.updateMatrixWorld(true); const sa = prepareSuspension(a); dent(a, a.userData.body, 1); const da = sig(a);
        WC.setWheelSet('spoke5');
        const b = mk(car); b.updateMatrixWorld(true); const sb = prepareSuspension(b);
        const g = rimsOf(b)[0]?.geometry, before = g && g.attributes.position.array.slice();
        dent(b, b.userData.body, 1);
        check(rimsOf(b).length > 0 && sa.wheels === sb.wheels && sa.how === sb.how && sa.plantedMeshes.length === sb.plantedMeshes.length && sa.squash.length === sb.squash.length, id + ': the suspension finder sees the same wheels with rims on (' + sb.wheels + ', ' + sb.how + ')');
        check(sig(b) === da && (!g || before.every((v, i) => v === g.attributes.position.array[i])), id + ': at full damage the same panels move with rims as without, and no rim is dented');
        dent(b, b.userData.body, 0);
      }
      WC.setWheelSet('stock');
    }

    // the ghost: rims put on during it are pale like the rest; the blur steps go to the paint under it
    {
      const m = mk(fleetAll.find(c => c.id === 'commuter')), GHOST = new THREE.MeshLambertMaterial({ color: 0xdfe9ff });
      m.traverse(n => { if (n.isMesh) { n.userData.solidMat = n.material; n.material = GHOST; } });
      WC.setWheelSet('spoke5');
      const list = rimsOf(m), u = list[0]?.userData.rim;
      check(list.length > 0 && list.every(r => r.material === GHOST && r.userData.solidMat === RM.rimMaterial(0xcfd3d9) && r.userData.rim.blur.material === GHOST), 'a ghost: rims added during it wear the ghost, their own paint under it (the blur disc too)');
      m.userData.roll = 0; m.userData.animate(0); for (let f = 1; f <= 30; f++) { m.userData.roll += 40 / 60; m.userData.animate(f / 60); }
      check(u.level > 0 && list[0].userData.rim.blur.visible && list[0].userData.rim.blur.material === GHOST && u.blurs.includes(list[0].userData.rim.blur.userData.solidMat), 'a ghost at speed: the blur step changes the paint under the ghost, the ghost stays on');
      WC.setWheelSet('stock');
    }

    // TURNING, measured: a spoke's tip, in the model's frame, as the car rolls at a fixed speed (angle about the axle: forward = the top goes to +z)
    {
      const tip = new THREE.Vector3(), inv = new THREE.Matrix4();
      const angleOf = (m, rim, t) => { tip.set(0, 0.7, 0.01).applyMatrix4(rim.matrixWorld).applyMatrix4(inv.copy(m.matrixWorld).invert()); return Math.atan2(tip.z - t.centre.z, tip.y - t.centre.y); };
      const run = (m, v, frames, startRoll = true) => { // v m/s at 60 fps; returns per rim: mean measured turn per frame
        const list = rimsOf(m), info = m.userData.wheelHubs.rimInfo, last = list.map(() => null), sum = list.map(() => 0);
        if (startRoll) m.userData.roll = 0;
        m.userData.animate(100);
        for (let f = 1; f <= frames; f++) {
          if (v !== null) m.userData.roll += v / 60;
          m.userData.animate(100 + f / 60); m.updateMatrixWorld(true);
          list.forEach((r, i) => { const a = angleOf(m, r, info.find(t => t.tyre === r.parent)); if (last[i] !== null) { let da = a - last[i]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; sum[i] += da; } last[i] = a; });
        }
        return list.map((r, i) => ({ side: r.userData.rim.side, r: r.userData.rim.r, perFrame: sum[i] / (frames - 1), level: r.userData.rim.level, gap: r.userData.rim.gap }));
      };
      WC.setWheelSet('spoke5');
      const com = mk(fleetAll.find(c => c.id === 'commuter'));
      const slow = run(com, 2, 40);
      const want = slow.map(x => 2 / x.r / 60);
      console.log('        spoke5 at 2 m/s, per frame (rad): measured ' + slow.map(x => (x.side > 0 ? 'R ' : 'L ') + x.perFrame.toFixed(4)).join(', ') + '; wanted v/r/60 = ' + want.map(w => w.toFixed(4)).join(', '));
      check(slow.every((x, i) => Math.abs(x.perFrame - want[i]) < 0.002 * want[i] + 1e-4), 'a speed rim turns by the distance rolled over its radius, every frame (2 m/s)');
      check(slow.every(x => x.perFrame > 0) && slow.some(x => x.side > 0) && slow.some(x => x.side < 0), 'both sides turn forward (the top of the wheel toward the front) at a forward roll');
      const back = run(com, -2, 20);
      check(back.every(x => x.perFrame < 0), 'reversing turns them the other way');
      check(slow.every(x => x.level === 0), 'at 2 m/s no blur');
      const fast = run(com, 40, 60);
      check(fast.every(x => Math.abs(x.perFrame - RM.CLAMP * x.gap) < 1e-3) && fast.every(x => x.level === RM.BLUR.length - 1), 'at 40 m/s the turn is clamped to ' + RM.CLAMP + ' of the spoke gap a frame (' + (RM.CLAMP * fast[0].gap).toFixed(3) + ' rad, under half of ' + fast[0].gap.toFixed(3) + ') and the blur disc is at its thickest');
      const steps = [];
      for (const v of [2, 4, 6, 8, 10, 12, 16]) { const r = run(com, v, 40)[0]; steps.push(v + ' m/s: ' + (r.perFrame / r.gap).toFixed(2) + ' gap, step ' + r.level); }
      console.log('        blur steps (commuter, r ' + slow[0].r.toFixed(2) + ' m, 60 fps; starts at ' + RM.BLUR_FROM + ', full at ' + RM.BLUR_FULL + ' of the gap a frame): ' + steps.join('; '));
      delete com.userData.roll; com.userData.wheelHubs.rims.roll = undefined;
      const idle = run(com, null, 30, false);
      check(idle.every(x => Math.abs(x.perFrame - RM.IDLE_RATE / 60) < 1e-4), 'with no speed to follow (garage, showroom) a speed rim idles at ' + RM.IDLE_RATE + ' rad/s');
      WC.setWheelSet('blade-spinner'); // (the Blade: a spinner until 15-Oct, now a rim like the rest: scripts/.rims-check.mjs turns every design)
      const sp = mk(fleetAll.find(c => c.id === 'commuter'));
      const still = run(sp, 0, 30), moving = run(sp, 2, 30);
      check(still.every(x => Math.abs(x.perFrame) < 1e-6) && moving.every(x => Math.abs(x.perFrame - 2 / x.r / 60) < 0.002 * (2 / x.r / 60) + 1e-4), 'the Blade (once a spinner) stands still with the car stopped and turns by distance over radius rolling');
      // an old model whose tyres turn themselves (render/models.js wheelTurn): the rim's turn is still distance over radius, not doubled
      WC.setWheelSet('spoke5');
      const f1 = fleetAll.find(c => c.id === 'f1');
      if (f1) {
        const m = mk(f1);
        check(m.userData.rollsWheels === true && m.userData.onShow === true, 'the F1 car is flagged as turning its own tyres, and built on show');
        const r = run(m, 3, 40), tyre = rimsOf(m)[0].parent;
        check(r.every(x => Math.abs(x.perFrame - 3 / x.r / 60) < 0.002 * (3 / x.r / 60) + 1e-4), 'F1 car: its rims turn by distance over radius although its tyres turn too');
        check(Math.abs(tyre.rotation.x - m.userData.roll / 0.35) < 1e-9, 'F1 car in the game: its tyres turn by distance rolled (roll / 0.35), not by the clock');
        delete m.userData.roll; m.userData.animate(10);
        check(Math.abs(tyre.rotation.x - 30) < 1e-9, 'F1 car on show: a gentle idle (3 rad/s; was 30)');
        const { MODELS } = await load('render/models.js'), traffic = MODELS.f1(f1); traffic.userData.animate(2);
        const tt = []; traffic.traverse(n => { if (n.isMesh && n.geometry.type === 'CylinderGeometry' && n.rotation.x) tt.push(n.rotation.x); });
        check(tt.length > 0 && tt.every(x => Math.abs(x - 60) < 1e-9), 'F1 car as traffic (not on show, no roll): as before, 30 rad/s');
      }
      WC.setWheelSet('stock');
    }

    // the choice: its own key, JSON, per axle and per car kept for later, garbage, blocked storage, noSave
    {
      check(JSON.stringify(RM.cleanRimChoice('spoke5')) === '{"all":"spoke5"}' && RM.cleanRimChoice('{"all":"nope"}').all === 'none' && RM.cleanRimChoice('[1,2]').all === 'none' && RM.cleanRimChoice(null).all === 'none' && RM.cleanRimChoice('{bad json').all === 'none', 'a stored rim made safe: a bare id, an unknown id, an array, nothing, broken JSON');
      const per = RM.cleanRimChoice(JSON.stringify({ all: 'none', rear: 'blade3', cars: { pickup: { front: 'turbine' }, 'bad id!': { all: 'spoke5' } }, junk: 1 }));
      check(JSON.stringify(per) === '{"all":"none","rear":"blade3","cars":{"pickup":{"front":"turbine"}}}', 'per axle and per car parts are kept, junk dropped: ' + JSON.stringify(per));
      raw.removeItem('delivery.loadout'); raw.setItem('delivery.wheelrim', JSON.stringify(per));
      server.moduleGraph.invalidateAll();
      const { makeShowCar: make2 } = await load('render/showcar.js'), R2 = await load('render/rims.js'), W2 = await load('render/wheelcosmetic.js');
      check(R2.resolveRim('commuter', 'front') === 'none' && R2.resolveRim('commuter', 'rear') === 'blade3' && R2.resolveRim('pickup', 'front') === 'turbine' && R2.resolveRim('pickup', 'rear') === 'blade3', 'resolveRim(car, axle): the one reader, per axle and per car');
      const p2 = make2(fleetAll.find(c => c.id === 'pickup')), l2 = p2.userData.wheelHubs.rims?.list || [];
      check(l2.length === 4 && l2.every(r => r.userData.rim.id === (p2.userData.wheelHubs.rimInfo.find(t => t.tyre === r.parent).axle === 'front' ? 'turbine' : 'blade3')), 'a car built under it wears turbine on its front axle and the blade spinner on its rear');
      W2.setWheelSet('spoke5');
      check(JSON.parse(raw.getItem('delivery.wheelrim')).all === 'spoke5' && JSON.parse(raw.getItem('delivery.wheelrim')).rear === 'blade3', 'equipping a set changes the global rim and keeps the per-axle part');
      raw.removeItem('delivery.loadout'); raw.setItem('delivery.wheelrim', 'garbage{'); server.moduleGraph.invalidateAll();
      check((await load('render/rims.js')).globalRim() === 'none' && (await load('render/wheelcosmetic.js')).wheelSet() !== 'spoke5', 'garbage saved: no rim');
      raw.removeItem('delivery.loadout'); raw.setItem(W.KEY, 'silver'); raw.setItem(W.KEY_DESIGN, 'stock'); raw.setItem('delivery.wheelrim', '{"all":"spoke5"}'); server.moduleGraph.invalidateAll();
      check((await load('render/wheelcosmetic.js')).wheelSet() === 'spoke5', 'reload: the 5-spoke set is found again from the three keys');
      raw.removeItem('delivery.loadout'); raw.removeItem('delivery.wheelrim'); server.moduleGraph.invalidateAll();
      check((await load('render/wheelcosmetic.js')).wheelRim() === 'none', 'an older save with no rim key: no rim (silver + stock tyres is then no set: Custom)');
      // a rim set the player does not own: Stock, rim and all
      raw.removeItem('delivery.loadout'); raw.setItem(W.KEY, 'gold'); raw.setItem(W.KEY_DESIGN, 'stock'); raw.setItem('delivery.wheelrim', '{"all":"blade3"}'); server.moduleGraph.invalidateAll();
      const W3 = await load('render/wheelcosmetic.js'), { COSMETICS } = await load('render/cosmetics.js'), entry = COSMETICS.find(c => c.slot === 'wheels' && c.id === 'blade-spinner');
      entry.free = false;
      check(W3.wheelSet() === 'stock' && W3.wheelRim() === 'none', 'a saved rim set not owned wears Stock, rim and all');
      entry.free = true;
      check(W3.wheelSet() === 'blade-spinner', '...and owned again, it is back');
      globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
      server.moduleGraph.invalidateAll();
      let threw = false;
      try { const B = await load('render/wheelcosmetic.js'); check(B.wheelRim() === 'none', 'no storage: no rim'); B.setWheelSet('turbine'); check(B.wheelRim() === 'turbine' && B.wheelSet() === 'turbine', 'no storage: a rim set holds for the visit'); } catch { threw = true; }
      check(!threw, 'no storage: nothing throws (rims)');
      globalThis.localStorage = raw;
      raw.removeItem('delivery.loadout'); raw.setItem('delivery.wheelrim', '{"all":"spoke5"}'); server.moduleGraph.invalidateAll();
      const N = await load('render/wheelcosmetic.js'), { Progress: PN } = await load('progress.js');
      PN.noSave = true;
      check(N.wheelRim() === 'none', 'a visit with test switches (Progress.noSave) ignores the saved rim');
      N.setWheelSet('twin-spinner');
      check(N.wheelRim() === 'twinspin' && raw.getItem('delivery.wheelrim') === '{"all":"spoke5"}', 'and a rim set chosen in it lasts the visit: the saved one is not overwritten');
      PN.noSave = false;
      raw.removeItem('delivery.loadout'); raw.removeItem('delivery.wheelrim'); raw.removeItem(W.KEY); raw.removeItem(W.KEY_DESIGN);
      void PR;
    }
    // UNLOCK REVEALS show the STOCK car; every other view wears the loadout (the owner, 15-Oct; render/showcar.js dressCosmetics)
    {
      server.moduleGraph.invalidateAll();
      const { makeShowCar: mk2 } = await load('render/showcar.js'), W4 = await load('render/wheelcosmetic.js');
      const { cosmeticKeys: keys2, grantCosmetics, awardCosmetic } = await load('render/cosmetics.js');
      await load('unlockall.js'); grantCosmetics(keys2());
      const PC = await load('render/platecosmetic.js'), PD = await load('render/propdress.js'), { PLATE_DESIGNS } = await load('render/platedesigns.js'), { PROPS } = await load('render/propmodels.js');
      W4.setWheelSet('blade-spinner');
      // (the plate and the roof prop are EARNED, per car only (CHECKLIST 433): one of each given through awardCosmetic and worn on the car itself)
      const plateId = PLATE_DESIGNS.find(d => d.id !== 'stock').id, roofId = PROPS.roof[0].id;
      awardCosmetic('plate:' + plateId, 1, { source: 'check' }); awardCosmetic('roof:' + roofId, 1, { source: 'check' });
      const plateOn = PC.setPlateDesign(plateId, 'commuter'), propOn = PD.setProp('roof', roofId, 'commuter');
      const car = fleetAll.find(c => c.id === 'commuter');
      const dressedCar = mk2(car), stockCar = mk2(car, { stock: true });
      const worn = (m) => ({ rims: m.userData.wheelHubs?.rims?.list.length || 0, plate: PC.platePlan(m)?.worn?.length || 0, props: PD.propPlan(m)?.worn?.length || 0, cos: (() => { let n = 0; m.traverse(x => { if (x.userData.propCosmetic || x.userData.wheelRing || x.userData.plateFace) n++; }); return n; })() });
      const dw = worn(dressedCar), sw = worn(stockCar);
      check(plateOn && propOn && dw.rims > 0 && dw.plate > 0 && dw.props > 0 && dw.cos > 0, 'a loadout on (Blade set, a plate design, a roof prop): a car on show wears it (' + JSON.stringify(dw) + ')');
      check(!stockCar.userData.wheelHubs && !PC.platePlan(stockCar) && !PD.propPlan(stockCar) && sw.cos === 0 && sw.rims === 0, 'makeShowCar(car, { stock: true }): the car as it comes, no wheel set, rim, plate or prop (' + JSON.stringify(sw) + ')');
      const { readFileSync } = await import('node:fs');
      const src = (f) => readFileSync('src/delivery/' + f, 'utf8');
      const uc = src('render/unlockcine.js'), calls = [...uc.matchAll(/makeShowCar\(([^)]*)\)/g)].map(m => m[1]).filter(x => x !== '' && !/^\s*$/.test(x));
      check(calls.length === 1 && /\{ stock: true \}/.test(calls[0]) && !/makeShowCar|dressWheels|dressPlates|dressProps/.test(src('render/ecucine.js')), 'the unlock cinematics (render/unlockcine.js: car, key, and render/ecucine.js through it: Crazey Jim, ECU up, ECU max) build their car with { stock: true } only');
      check(/drawSoon\([^)]*stock: true/.test(src('render/packs.js')), "a pack reveal's cards are drawn stock (render/packs.js)");
      // (the PACK umbrella is stock too since 15-Oct, "It should be a STOCK good car": the pack banner, and every pack / Shop / blueprint-card
      // still through carstill.js stock: scripts/.loadout-key-check.mjs checks those call sites)
      const others = ['render/garage.js', 'render/showroomview.js', 'render/warmup.js', 'render/inspectmodel.js', 'render/items.js'];
      check(others.every(f => !/stock: true/.test(src(f))) && /makeShowCar\(CAR\)/.test(src('render/menustage.js')) && /makeShowCar\(car, \{ stock \}\)/.test(src('render/carstill.js')) && /dressCosmetics\(model, car\)/.test(src('render/items.js')) && /makeShowCar\(car, \{ stock: true \}\)/.test(src('render/packbanner.js')),
        'every other view (garage, showroom, menu card, the dressed stills, the game and its cameras) builds the dressed car: none passes stock; the pack banner is stock');
      // the game's model of the player's car is dressed through the same one hook
      W4.setWheelSet('stock'); PC.setPlateDesign('stock'); PD.setProp('roof', 'none');
    }
    // unlock everything grants them; nothing in the fingerprint
    {
      server.moduleGraph.invalidateAll();
      const { cosmeticKeys } = await load('render/cosmetics.js');
      await load('unlockall.js');
      check(rimSets.every(x => cosmeticKeys().includes('wheels:' + x.id)), 'the rim sets are in the registry, so "Absolutely everything" grants them: ' + rimSets.map(x => 'wheels:' + x.id).join(', '));
      const { logicFiles } = await import('../vite.config.js');
      check(!logicFiles().some(f => /rims|wheelcosmetic|models\.js|ideaModels3|items\.js|showcar/.test(f)), 'the replay fingerprint includes none of rims.js, wheelcosmetic.js, models.js, ideaModels3.js, items.js, showcar.js');
    }
  }
} finally {
  await server.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
