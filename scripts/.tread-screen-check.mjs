// A check of the TREADS ON THE COSMETICS SCREEN'S PATH (the owner, 16-Oct: "The treads are not rendering on the customisation screen";
// render/treads.js, render/wheelcosmetic.js, render/cosmeticslots.js; CHECKLIST 431). Headless, no picture. The screen does not build its car
// again when a tread is picked: its live model (render/showroomview.js: built stock, on a turntable, its suspension prepared and bouncing) is
// dressed again in place by the loadout store's notice. So, as the screen does it:
//   - on a sample of cars (a sports car, the Junker, the Pick-Up, a truck, the coach, the Hot Hatch, the Commuter: raised blocks and
//     band-only cars alike) built STOCK, suspension prepared and mid-bounce, every tread design picked for THIS CAR changes the live model:
//     a tread mesh on its tyres, a child of the tyre, one mesh a tyre, its material carrying the design's own pattern texture, its
//     geometry and texture different from the design before; the loadout key moves; Stock takes it all off again
//   - the designs' footprints (what the band's texture, the chips and the walls are drawn from) are there and differ design to design;
//     each texture has blocks drawn on it (a recording 2D context)
//   - the Tread row's rule (cosmeticslots wheels rows.tread): shown on the sample cars, hidden on a Legendary car, a RIM_SKIP car and a
//     model with no tyres found; in 'All cars' (no model) shown
//   - presets with a tread (Mud plugger, Trail...) put it on the live car; Reset car takes it off; Copy to all brings it to another car
//   - the whole fleet: which cars can show no tread at all, and why (printed)
//   - render-only: the replay fingerprint walks no render/ file (its hash printed)
//   node scripts/.tread-screen-check.mjs
import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCENE = `import * as THREE from 'three';
export const PIXEL_RATIO = 1, renderer = null, scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
export const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), Cinematic = {};
export const applySky = () => {}, clearGroup = () => {}, applyLight = () => {}, aim = () => {}, updateCamera = () => {};`;
// a 2D context that records what is filled (the band's texture and the chips draw through it)
const fills = [];
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === 'measureText' ? () => ({ width: 10 }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : k === 'fill' ? () => fills.push(o.fillStyle) : k === 'fillRect' ? () => fills.push(o.fillStyle) : () => ctx2d), set: (o, k, v) => { o[k] = v; return true; } });
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
  const TR = await load('render/treads.js'), W = await load('render/wheelcosmetic.js'), Store = await load('render/loadoutstore.js');
  const { makeShowCar } = await load('render/showcar.js'), { loadoutKey } = await load('render/loadout.js'), { slotById } = await load('render/cosmeticslots.js');
  const { prepareSuspension, applySuspension } = await load('render/carsuspension.js');
  const C = await load('cars.js'), { showroomCars } = await load('showroomData.js'), { IDEA_CARS } = await load('ideas.js'), { RIM_SKIP, rimStatus } = await load('render/rims.js');
  const fleet = [...new Set([...showroomCars(), ...Object.values(C.LEVEL_CARS), ...Object.values(C.SECRET_CARS), ...IDEA_CARS, ...C.CARS])];
  const byId = (id) => fleet.find(c => c.id === id) || C.carById(id);
  const designs = TR.TREAD_DESIGNS.filter(d => d.n);
  const treadsOf = (m) => m.userData.wheelHubs?.treads?.list || [];
  // the screen's way: the car built stock (as the screen's model is before a tread is picked), on a turntable, suspension prepared, a bounce
  const onStage = (car) => {
    const m = makeShowCar(car), turn = new THREE.Group(), body = new THREE.Group();
    body.add(m); turn.add(body);
    prepareSuspension(m);
    applySuspension(m, body, { y: -0.02, pitch: 0.01, roll: 0.004, wheelY: 0 }); // (mid-landing, as when a chip is tapped soon after opening)
    turn.rotation.y = -0.64; turn.updateMatrixWorld(true);
    return m;
  };
  W.setWheelSet('stock');

  // ---- the designs' footprints and textures ----
  const sig = (id) => TR.footprintsOf(id).map(f => (f.pts ? f.pts.map(([a, z]) => a.toFixed(2) + ',' + z.toFixed(2)).join(';') : f.z0 + '..' + f.z1)).join('|');
  const sigs = designs.map(d => sig(d.id));
  check(designs.length >= 13 && designs.every(d => TR.footprintsOf(d.id).length > 0) && new Set(sigs).size === designs.length, designs.length + ' tread designs, each with footprints of its own (no two alike): ' + designs.map(d => d.name).join(', '));
  {
    const drawn = designs.map(d => { fills.length = 0; TR.drawTread(ctx2d, d.id, { w: 128, h: 128, rows: 2, tile: true, value: (k) => k }); return fills.filter(f => f === 'block').length; });
    check(drawn.every(n => n > 0), 'every design\'s band texture has its blocks drawn on it (' + designs.map((d, i) => d.id + ' ' + drawn[i]).join(', ') + ' shapes)');
  }

  // ---- the sample cars, as the screen dresses them ----
  const sample = ['sport', 'junker', 'pickup', 'liftedtruck', 'coach', 'hothatch', 'commuter'].map(byId);
  check(sample.every(Boolean), 'the sample cars are in the game: ' + sample.map(c => c && c.id).join(', '));
  for (const car of sample) {
    const m = onStage(car), found = m.userData.wheelHubs;
    check(treadsOf(m).length === 0, car.name + ': built stock, no tread on it');
    const key0 = loadoutKey(car);
    let last = null, ok = true, keys = true, bad = [];
    for (const d of designs) {
      W.setWheelTread(d.id, car.id); // (picked for THIS CAR, as the Tread row does: the store's notice re-dresses the live model)
      const list = treadsOf(m), maps = new Set(list.map(x => x.material.map)), geos = new Set(list.map(x => x.geometry));
      const children = list.every(x => found.rimInfo.some(t => t.tyre === x.parent)) && new Set(list.map(x => x.parent)).size === list.length;
      const textured = list.length > 0 && list.every(x => x.material.map && x.material.map.userData.shared && x.geometry.attributes.uv);
      const changed = !last || (![...maps].some(t => last.maps.has(t)) && ![...geos].some(g => last.geos.has(g)));
      if (!(list.length && children && textured && changed)) { ok = false; bad.push(d.id + ' ' + list.length + (children ? '' : ' not-children') + (textured ? '' : ' untextured') + (changed ? '' : ' unchanged')); }
      if (loadoutKey(car) === key0) keys = false;
      last = { maps, geos };
    }
    const kinds = (() => { W.setWheelTread('knobbly', car.id); const l = treadsOf(m); return l.filter(x => x.userData.tread.fit).length + ' raised, ' + l.filter(x => !x.userData.tread.fit).length + ' band only, ' + l.reduce((n, x) => n + (x.geometry.userData.parts?.rings || 0), 0) + ' shoulder rings'; })();
    check(ok && keys, car.name + ': every design picked on the screen changes the live model (' + treadsOf(m).length + '/' + found.rimInfo.length + ' tyres, Knobbly: ' + kinds + '), its own texture and geometry each time, the loadout key moved' + (bad.length ? ': ' + bad.join('; ') : ''));
    W.setWheelTread('none', car.id);
    check(treadsOf(m).length === 0 && loadoutKey(car) === key0, car.name + ': Stock takes the tread off the live model, the key back as it was');
  }

  // ---- the Tread row's rule ----
  {
    const rule = slotById('wheels').rows.tread;
    const legend = C.carById('l-sport'), skip = fleet.find(c => RIM_SKIP.has(c.id) || RIM_SKIP.has(c.model));
    const lm = legend && makeShowCar(legend), sm = skip && makeShowCar(skip), empty = new THREE.Group();
    check(sample.every(car => rule(car, { model: makeShowCar(car) })) && rule(sample[0], {}) && !rule(legend, { model: lm }) && !rule(skip, { model: sm }) && !rule(sample[0], { model: empty }),
      'the Tread row: shown on the sample cars and in All cars (no model), hidden on a Legendary car (' + legend?.id + '), a RIM_SKIP car (' + skip?.id + ') and a model with no tyres found');
  }

  // ---- presets, Reset car, Copy to all ----
  {
    const car = byId('pickup'), other = byId('sport'), m = onStage(car), o = onStage(other);
    W.setWheelSet('mud-plugger', car.id);
    const mud = treadsOf(m).length && treadsOf(m).every(x => x.userData.tread.id === 'mud') && W.wheelRim(car.id) === 'steelie' && W.wheelColour(car.id) === 'black' && W.wheelSet(car.id) === 'mud-plugger';
    const otherStock = treadsOf(o).length === 0;
    Store.resetCar(car.id);
    const reset = treadsOf(m).length === 0 && W.wheelSet(car.id) === 'stock';
    W.setWheelSet('trail', car.id); Store.copyToAll(car.id);
    const copied = treadsOf(o).length > 0 && treadsOf(o).every(x => x.userData.tread.id === 'trail') && W.wheelSet(other.id) === 'trail';
    check(mud && otherStock && reset && copied, 'Mud plugger on the Pick-Up dresses its live model (mud tread, black Steelie) and not the Sportscompact; Reset car takes it off; Trail copied to all reaches the Sportscompact\'s live model');
    W.setWheelSet('stock');
    const named = ['racing-slicks', 'retro-whitewall', 'gold-rims', 'neon', 'off-road'];
    check(named.every(id => W.WHEEL_SETS.some(s => s.id === id)) && W.WHEEL_SETS.every(s => !s.tread || designs.some(d => d.id === s.tread)) && W.WHEEL_SETS.length >= 35, 'named presets: ' + W.WHEEL_SETS.length + ' (' + named.join(', ') + ' among them), every tread they name a real design');
  }

  // ---- the fleet: who can show no tread, and why ----
  {
    const why = new Map(), mk = (car) => { try { return makeShowCar(car); } catch { return null; } };
    let wearing = 0, raised = 0, total = 0;
    for (const car of fleet) {
      const m = mk(car);
      if (!m) continue;
      total++;
      const st = TR.treadStatus(m), f = m.userData.wheelHubs;
      if (st === 'ok' || st === 'flat') { wearing++; if (st === 'ok') raised++; continue; }
      const reason = car.legend ? 'Legendary (its own wheels)' : f?.rimSkip ? 'RIM_SKIP (no wheels to dress: tracks, a hull, a hoop, discs)' : !f?.rimInfo?.length ? 'no tyre found (box-built or no round tyre on the floor)' : 'every tyre under ' + TR.MIN_R + ' m';
      if (!why.has(reason)) why.set(reason, []);
      why.get(reason).push(car.id);
    }
    const rimCars = fleet.filter(car => { const m = mk(car); return m && rimStatus(m) === 'ok'; }).length;
    console.log('        cars that can show NO tread (the Tread row hidden): ' + [...why].map(([r, ids]) => r + ': ' + ids.length + ' (' + ids.join(', ') + ')').join('; '));
    check(wearing >= rimCars * 0.95, 'treads reach ' + wearing + ' of ' + total + ' cars (raised blocks on ' + raised + ', the pattern band and rings only on ' + (wearing - raised) + '); ' + rimCars + ' cars wear rims');
  }

  // ---- render-only ----
  {
    const { logicFiles } = await import('../vite.config.js');
    const files = logicFiles(), hash = createHash('sha256');
    for (const file of files) hash.update(file + '\0' + readFileSync('src/delivery/' + file));
    check(!files.some(f => /render\/|treads|rims|wheelcosmetic|cosmetic/.test(f)), 'the replay fingerprint (' + files.length + ' logic files, hash ' + hash.digest('hex').slice(0, 10) + ') walks no render/ file and no wheel or cosmetics module');
  }
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
await server.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
