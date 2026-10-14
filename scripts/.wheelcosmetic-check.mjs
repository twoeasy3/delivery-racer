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


  // ---- DESIGNS ----
  {
    const D = W.WHEEL_DESIGNS, ids = D.map(d => d.id);
    check(D.length >= 5 && D.length <= 8 && D[0].id === 'stock', 'the designs: ' + ids.join(', '));
    check(W.wheelDesign() === 'stock', 'a fresh visit: design Stock');
    const hubbed = models.filter(({ car, hubs }) => !car.legend && hubs.length);
    const ringsOf = (model) => { const r = []; model.traverse(n => { if (n.userData.wheelRing) r.push(n); }); return r; };
    const hubbedTyres = ({ model }) => new Set(model.userData.wheelHubs.info.map(t => t.tyre)).size;
    for (const design of D.slice(1)) {
      W.setWheelDesign(design.id);
      check(W.wheelDesign() === design.id, design.id + ': a change takes at once');
      const bad = [], geos = new Set(); let rings = 0, tris = new Set(), tyresRed = 0;
      for (const { car, model, snap, hubs } of models) {
        const mine = ringsOf(model), found = model.userData.wheelHubs;
        const expect = design.ring ? found.info.reduce((n, t) => n + (t.outer ? 1 : 2), 0) : 0;
        if (mine.length !== expect) bad.push(car.id + ' rings ' + mine.length + '/' + expect);
        if (car.legend || !hubs.length) { if (mine.length) bad.push(car.id + ' left-stock car has rings'); }
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
    check(models.every(({ model, snap }) => { let ok = !ringsOf(model).length; model.traverse(n => { if (n.isMesh && n.material !== snap.get(n)?.material) ok = false; }); return ok; }), 'design Stock removes every ring and puts every very same stock material back');
    // back and forth does not pile up rings
    for (const id of ['whitewall', 'redline', 'whitewall']) W.setWheelDesign(id);
    check(models.every(m => ringsOf(m.model).length === (m.model.userData.wheelHubs.info.reduce((n, t) => n + (t.outer ? 1 : 2), 0))), 'changing design again and again leaves one set of rings');
    W.setWheelDesign('stock');

    // a model BUILT while a design is on is dressed as it is built
    W.setWheelDesign('redwhite');
    const born = build(cars.find(c => c.id === 'commuter') || hubbed[0].car);
    check(ringsOf(born).length === 0 && born.userData.wheelHubs.hubs.every(h => h.mesh.material.color.getHex() === 0xf4f4f2) && born.userData.wheelHubs.info.every(t => t.tyre.material.color.getHex() === 0xd8262b), 'a car built under Red tyres, white hubs wears them from the start');
    W.setWheelDesign('goldwall');
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

  // the design is kept too, under its own key
  {
    const raw2 = globalThis.localStorage;
    server.moduleGraph.invalidateAll();
    const w1 = await load('render/wheelcosmetic.js');
    w1.setWheelDesign('redline');
    check(raw2.getItem(w1.KEY_DESIGN) === 'redline' && w1.KEY_DESIGN !== w1.KEY, 'the design is kept in localStorage under ' + w1.KEY_DESIGN);
    server.moduleGraph.invalidateAll();
    check((await load('render/wheelcosmetic.js')).wheelDesign() === 'redline', 'a fresh load finds Redline');
    raw2.setItem(w1.KEY_DESIGN, 'nonsense');
    server.moduleGraph.invalidateAll();
    check((await load('render/wheelcosmetic.js')).wheelDesign() === 'stock', 'a saved design it does not know: Stock');
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    server.moduleGraph.invalidateAll();
    const b2 = await load('render/wheelcosmetic.js');
    let threw2 = false;
    try { check(b2.wheelDesign() === 'stock', 'no storage: design Stock'); b2.setWheelDesign('whitewall'); check(b2.wheelDesign() === 'whitewall', 'no storage: a design change still holds for the visit'); } catch { threw2 = true; }
    check(!threw2, 'no storage: nothing throws (design)');
    globalThis.localStorage = raw2;
    raw2.setItem(w1.KEY_DESIGN, 'redline');
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
    raw3.removeItem(W.KEY); raw3.removeItem(W.KEY_DESIGN);
    server.moduleGraph.invalidateAll();
    const S = await load('render/wheelcosmetic.js'), { Progress: P3 } = await load('progress.js');
    const sets = S.WHEEL_SETS;
    check(sets.length >= 10 && sets.length <= 14 && new Set(sets.map(x => x.id)).size === sets.length, sets.length + ' sets, ids unique');
    check(new Set(sets.map(x => x.design + '/' + x.hub)).size === sets.length, 'no two sets are the same design + hub pair');
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
      check(raw3.getItem(W.KEY_DESIGN) === set.design && raw3.getItem(W.KEY) === set.hub, set.id + ': the two existing keys hold it (no new key)');
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
    raw3.setItem(S.KEY_DESIGN, 'nonsense'); raw3.setItem(S.KEY, 'nonsense'); server.moduleGraph.invalidateAll();
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
    raw3.setItem(S.KEY_DESIGN, 'redline'); raw3.setItem(S.KEY, 'blue');
    server.moduleGraph.invalidateAll();
    const N = await load('render/wheelcosmetic.js'), { Progress: P4 } = await load('progress.js');
    check(N.wheelSet() === 'redline-blue', 'saved redline + blue: that set');
    P4.noSave = true;
    check(N.wheelSet() === 'stock', 'noSave: the saved set is ignored (Stock)');
    N.setWheelSet('orange-pop');
    check(N.wheelSet() === 'orange-pop' && raw3.getItem(S.KEY) === 'blue' && raw3.getItem(S.KEY_DESIGN) === 'redline', 'noSave: a set lasts the visit and the saved pair is not overwritten');
    P4.noSave = false;
    N.setWheelSet('stock');
    raw3.removeItem(S.KEY); raw3.removeItem(S.KEY_DESIGN);
    void P3;
  }
} finally {
  await server.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
