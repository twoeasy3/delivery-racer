// A check of the RIMS' names, turning and the themed designs (render/rims.js; CHECKLIST 310 and 451, the owner, 15-Oct: "Let's fix
// the rims right. Some of the rims say spinner. Lets have a Halloween Pumpkin rim and a Candy Cane rim"). Headless, no picture:
//   - no rim and no wheel set is NAMED a spinner; every rim design turns with the car (kind 'speed'; no fixed-pace kind is left);
//   - EVERY design, on a live car: rolling, a rim turns by the distance over its wheel's radius (in proportion: twice the speed,
//     twice the turn), reversing turns it back; a car stopped in the game stands still; a car on show (no speed) only idles at
//     IDLE_RATE; at speed the turn is clamped and the blur disc shows;
//   - the old ids blade3 and twinspin still resolve (a saved choice, a bare id, the old global key, ?wheelrim=), now named Blade and
//     Twin blade; the sets that carry them keep their ids;
//   - the Pumpkin and the Candy cane build on a sample of cars (a hatch, a truck, a sports car, a bus): one mesh per tyre face, each a
//     child of its tyre, tagged wheelRing with a wheelHub material, the design's ONE shared geometry and the ONE white material,
//     coloured by vertex colours, no rim in any z-fight pair, and no more meshes (draw calls) than the 5-spoke on the same car;
//     triangles per face and per car printed.
//   node scripts/.rims-check.mjs
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
  const RM = await load('render/rims.js'), WC = await load('render/wheelcosmetic.js');
  const { makeShowCar } = await load('render/showcar.js'), { CARS, LEVEL_CARS, SECRET_CARS, superOf } = await load('cars.js'), { findZFights } = await load('render/zfight.js');
  const { showroomCars } = await load('showroomData.js'), { IDEA_CARS } = await load('ideas.js');
  const fleet = [...new Set([...showroomCars(), ...Object.values(LEVEL_CARS), ...Object.values(SECRET_CARS), ...IDEA_CARS, ...CARS.map(superOf).filter(Boolean)])];
  const D = RM.RIM_DESIGNS, designs = D.filter(d => d.kind);

  // ---- names and kinds ----
  const named = [...D.map(d => d.name), ...WC.WHEEL_SETS.map(s => s.name)];
  check(!named.some(n => /spinner/i.test(n)), 'no rim and no wheel set is named a spinner (' + designs.map(d => d.name).join(', ') + ')');
  check(designs.every(d => d.kind === 'speed') && !('SPIN_RATE' in RM), 'every rim design turns with the car (kind speed), and no fixed-pace rate is left');
  check(designs.every(d => WC.WHEEL_SETS.some(s => s.rim === d.id)), 'every design is in a wheel set: ' + WC.WHEEL_SETS.filter(s => s.rim).map(s => s.name).join(', '));
  check(Math.max(...WC.WHEEL_SETS.map(s => s.name.length)) <= 22 && designs.every(d => d.name.length <= 12), 'names short enough for a chip on a phone (longest set name ' + Math.max(...WC.WHEEL_SETS.map(s => s.name.length)) + ' letters)');
  check(['pumpkin', 'candycane'].every(id => D.some(d => d.id === id && d.own)), 'the Pumpkin and the Candy cane are there, with their own colours');

  // ---- the old ids ----
  check(RM.rimById('blade3').name === 'Blade' && RM.rimById('twinspin').name === 'Twin blade', 'blade3 is the Blade, twinspin the Twin blade');
  check(RM.cleanRimChoice('blade3').all === 'blade3' && RM.cleanRimChoice('{"all":"twinspin","rear":"blade3"}').rear === 'blade3' && RM.cleanRimChoice('{"all":"twinspin"}').all === 'twinspin', 'a saved blade3 / twinspin (bare or JSON, per axle) is kept');
  check(['blade-spinner', 'twin-spinner'].every(id => WC.WHEEL_SETS.some(s => s.id === id)), 'their sets keep their ids (blade-spinner, twin-spinner: ownership keys), only the names changed');
  stored.set('delivery.wheelrim', '{"all":"twinspin"}'); server.moduleGraph.invalidateAll();
  {
    const R2 = await load('render/rims.js');
    check(R2.resolveRim('commuter', 'front') === 'twinspin' && R2.resolveRim(null, 'rear') === 'twinspin', 'an old save (the old global key) with twinspin: every car resolves to it');
  }
  stored.clear(); globalThis.location = { search: '?wheelrim=blade3' }; server.moduleGraph.invalidateAll();
  {
    const R3 = await load('render/rims.js');
    check(R3.rimAsked && R3.resolveRim('pickup', 'front') === 'blade3', '?wheelrim=blade3 still dresses every car');
  }
  delete globalThis.location; stored.clear(); server.moduleGraph.invalidateAll();

  // ---- the designs on a sample of cars ----
  const R = await load('render/rims.js'), W = await load('render/wheelcosmetic.js'), { makeShowCar: make } = await load('render/showcar.js');
  void makeShowCar;
  const sample = [['hatch', 'sprinthatch'], ['truck', 'flatbed'], ['sports car', 'sport'], ['bus', 'bus']].map(([what, id]) => [what, fleet.find(c => c.id === id)]);
  check(sample.every(([, c]) => c), 'the sample cars are in the game: ' + sample.map(([w, c]) => w + ' ' + (c && c.id)).join(', '));
  const rimsOf = (m) => m.userData.wheelHubs?.rims?.list || [];
  const setOf = (rim) => W.WHEEL_SETS.find(s => s.rim === rim);
  const meshesOf = (car, rim) => { W.setWheelSet(setOf(rim).id); const m = make(car); return { m, list: rimsOf(m) }; };
  for (const id of designs.map(d => d.id)) console.log('        ' + id + ': ' + R.rimTriangles(id) + ' triangles a face (flat, behind bodywork: ' + R.rimTriangles(id, true) + ')');
  for (const id of ['pumpkin', 'candycane']) {
    const geo = R.rimGeometry(id), white = R.rimMaterial(0xffffff);
    check(!!geo.attributes.color && !!geo.attributes.normal && !geo.attributes.uv && (id !== 'pumpkin' || geo.attributes.color.array.some(v => v > 1.5)), id + ': one merged geometry with vertex colours (the pumpkin\'s glow brighter than lit)');
    for (const [what, car] of sample) {
      const five = meshesOf(car, 'spoke5').list.length, { m, list } = meshesOf(car, id); // (the 5-spoke first: a set change re-dresses every live car)
      const found = m.userData.wheelHubs;
      const tags = list.every(r => r.userData.wheelRing && r.material.userData.wheelHub && r.userData.rim.blur.userData.wheelRing && r.userData.rim.blur.material.userData.wheelHub);
      const shared = list.every(r => r.geometry === R.rimGeometry(id, r.userData.rim.flat) && r.material === white);
      const parents = list.every(r => found.rimInfo.some(t => t.tyre === r.parent));
      const zf = findZFights(m).filter(f => [f.a, f.b].some(x => x.userData.rim || x.parent?.userData.rim));
      const tris = list.reduce((n, r) => n + R.rimTriangles(id, r.userData.rim.flat), 0);
      check(list.length > 0 && list.length === five && tags && shared && parents && !zf.length,
        id + ' on the ' + what + ' (' + car.id + '): ' + list.length + ' rim meshes (5-spoke: ' + five + '), children of their tyres, tagged, one shared geometry and material, ' + tris + ' triangles, z-fight pairs with a rim: ' + zf.length);
    }
  }

  // ---- turning, every design, measured from a point near the rim's edge in the model's frame ----
  const tip = new THREE.Vector3(), inv = new THREE.Matrix4();
  const angleOf = (m, rim, t) => { tip.set(0, 0.7, 0.01).applyMatrix4(rim.matrixWorld).applyMatrix4(inv.copy(m.matrixWorld).invert()); return Math.atan2(tip.z - t.centre.z, tip.y - t.centre.y); };
  const run = (m, v, frames, fresh = true) => { // v m/s at 60 fps (null: no speed, on show); per rim: the mean turn a frame
    const list = rimsOf(m), info = m.userData.wheelHubs.rimInfo, last = list.map(() => null), sum = list.map(() => 0);
    if (fresh && v !== null) m.userData.roll = 0;
    if (v === null) { delete m.userData.roll; m.userData.wheelHubs.rims.roll = undefined; }
    m.userData.animate(100);
    for (let f = 1; f <= frames; f++) {
      if (v !== null) m.userData.roll += v / 60;
      m.userData.animate(100 + f / 60); m.updateMatrixWorld(true);
      list.forEach((r, i) => { const a = angleOf(m, r, info.find(t => t.tyre === r.parent)); if (last[i] !== null) { let da = a - last[i]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; sum[i] += da; } last[i] = a; });
    }
    return list.map((r, i) => ({ per: sum[i] / (frames - 1), r: r.userData.rim.r, gap: r.userData.rim.gap, level: r.userData.rim.level, blur: r.userData.rim.blur.visible }));
  };
  const commuter = fleet.find(c => c.id === 'commuter');
  for (const d of designs) {
    const { m } = meshesOf(commuter, d.id);
    const one = run(m, 1.5, 30), two = run(m, 3, 30), back = run(m, -1.5, 30), stop = run(m, 0, 30), show = run(m, null, 30), fast = run(m, 45, 60);
    const near = (a, b) => Math.abs(a - b) < 0.002 * Math.abs(b) + 1e-4;
    check(one.length > 0 && one.every(x => near(x.per, 1.5 / x.r / 60)) && two.every((x, i) => near(x.per, 2 * one[i].per)) && back.every((x, i) => near(x.per, -one[i].per)),
      d.name + ': rolling, it turns by distance over radius (' + one[0].per.toFixed(4) + ' rad a frame at 1.5 m/s, twice that at 3 m/s, back when reversing)');
    check(stop.every(x => Math.abs(x.per) < 1e-6) && show.every(x => near(x.per, R.IDLE_RATE / 60)),
      d.name + ': a car stopped in the game stands still; on show (no speed) it only idles at ' + R.IDLE_RATE + ' rad/s');
    check(fast.every(x => near(x.per, R.CLAMP * x.gap) && x.level === R.BLUR.length - 1 && x.blur), d.name + ': at 45 m/s clamped to ' + R.CLAMP + ' of its gap a frame, the blur disc on');
  }
  W.setWheelSet('stock');
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
await server.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
