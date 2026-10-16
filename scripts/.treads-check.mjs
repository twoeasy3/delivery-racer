// A check of the TYRE TREADS and the THREE-PART WHEEL SET (render/treads.js, render/wheelcosmetic.js, render/rims.js; CHECKLIST 399, the
// owner, 15-Oct: "introducing different tyre treads and animating these with the rims"; "Wheel sets would now be - tread - tyre colour - hub
// colour or rim or spinner"). Headless, no picture:
//   - the designs: names, triangles a tyre (full and lite) under the budget, one geometry per design / colour / variant, ONE material;
//   - on a hatch, a truck, a sports car, a bus and the six-wheeler, every design: one mesh per tyre, each a child of its tyre, tagged
//     wheelRing with a wheelHub material, shared geometry and material, no tread in a z-fight pair, triangles a tyre under budget;
//   - TURNING on a live car, with a rim on: the tread turns by distance over radius, by the same angle as the rim in the same frame (twice
//     the speed, twice the turn; back in reverse; still when stopped; idling on show in step with the rim), and at 45 m/s it is clamped to
//     CLAMP of its pitch and the blur band shows; a SPINNER turns at SPIN_RATE stopped and moving, the tread beside it does not;
//   - the directional designs point FORWARD on both sides of the car (the V's point leads as the car rolls forward);
//   - the three parts are independent (tread, tyre colour, hub colour / rim / spinner) and combine; the tread takes the tyre's colour;
//   - the choice: unknown, absent or broken = none; per car over the default; ?wheeltread=, ?wheeltyre=, ?wheelhub=rim:/spin:/<colour>;
//   - the whole fleet, every design on every car that wears rims: no tread in a z-fight pair, no tread pokes through bodywork, tread meshes
//     (draw calls) and triangles a car; cars whose tyres carry their own tread blocks have them hidden while a tread is worn.
//   node scripts/.treads-check.mjs [--quick]   (--quick: the fleet part on 30 cars)
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const QUICK = process.argv.includes('--quick');
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
const BUDGET = 300;
try {
  const THREE = await import('three');
  const TR = await load('render/treads.js'), RM = await load('render/rims.js'), W = await load('render/wheelcosmetic.js');
  const { makeShowCar } = await load('render/showcar.js'), { CARS, LEVEL_CARS, SECRET_CARS, superOf } = await load('cars.js'), { findZFights } = await load('render/zfight.js');
  const { showroomCars } = await load('showroomData.js'), { IDEA_CARS } = await load('ideas.js');
  const fleet = [...new Set([...showroomCars(), ...Object.values(LEVEL_CARS), ...Object.values(SECRET_CARS), ...IDEA_CARS, ...CARS.map(superOf).filter(Boolean)])];
  const designs = TR.TREAD_DESIGNS.filter(d => d.n);
  const mk = (car) => { try { return makeShowCar(car); } catch { return null; } };
  const treadsOf = (m) => m.userData.wheelHubs?.treads?.list || [];
  const rimsOf = (m) => m.userData.wheelHubs?.rims?.list || [];
  const trisOf = (mesh) => mesh.geometry.attributes.position.count / 3;

  // ---- the designs ----
  check(TR.TREAD_DESIGNS[0].id === 'none' && designs.length >= 5 && designs.every(d => d.name.length <= 10), 'tread designs: ' + designs.map(d => d.id + ' "' + d.name + '"').join(', ') + ' (and Stock: the car\'s own)');
  for (const d of designs) {
    const full = TR.treadTriangles(d.id), lite = TR.treadTriangles(d.id, { lite: true }), low = TR.treadTriangles(d.id, { k: 0.3 });
    check(full <= BUDGET && lite <= full && low === full, d.name + ': ' + full + ' triangles a tyre (lite, on a car of more than ' + TR.LITE_FROM + ' tyres or a small tyre: ' + lite + '), ' + d.n + ' rows round (pitch ' + (360 / d.n).toFixed(0) + ' deg), ' + (d.h * 100).toFixed(1) + ' % of the radius proud');
  }
  check(TR.treadGeometry('knobbly', 0x1b1b1d) === TR.treadGeometry('knobbly', 0xd8262b) && TR.treadGeometry('knobbly') !== TR.treadGeometry('knobbly', null, { lite: true }), 'one blocks geometry per design and variant, whatever the rubber colour (the colour is the material\'s tint; 16-Oct)');

  // ---- the sample cars ----
  const sample = [['hatch', 'sprinthatch'], ['truck', 'flatbed'], ['sports car', 'sport'], ['bus', 'coach'], ['six-wheeler', 'sixwheeler']].map(([what, id]) => [what, fleet.find(c => c.id === id)]);
  check(sample.every(([, c]) => c), 'the sample cars are in the game: ' + sample.map(([w, c]) => w + ' ' + (c && c.id)).join(', '));
  for (const d of designs) {
    W.setWheelTread(d.id);
    const lines = [];
    let ok = true, worn = 0;
    for (const [what, car] of sample) {
      const m = mk(car), found = m.userData.wheelHubs, list = treadsOf(m);
      const parents = list.every(x => found.rimInfo.some(t => t.tyre === x.parent)) && new Set(list.map(x => x.parent)).size === list.length;
      // (16-Oct: raised blocks wear the one tread material; a tyre with no room for blocks wears the pattern band alone; every part under
      // a tread, its band, shoulder rings and blur band, is tagged and shared)
      const parts = list.flatMap(x => [x, ...x.children]);
      const tags = parts.every(x => x.userData.wheelRing && x.material.userData.wheelHub);
      const shared = list.every(x => !!x.material.map && x.material.vertexColors) && parts.every(x => x.geometry.userData.shared && x.material.userData.shared);
      const zf = findZFights(m).filter(f => [f.a, f.b].some(x => x.userData.tread || x.parent?.userData.tread));
      const tris = list.map(trisOf), most = Math.max(0, ...tris);
      if (list.length) worn++;
      if (!(parents && tags && shared && !zf.length && most <= BUDGET + 6 * TR.SKIN_SEG)) ok = false; // (the blocks, and the band and a ring a face: 2 x SKIN_SEG each)
      lines.push(what + ' ' + list.length + '/' + found.rimInfo.length + ' tyres' + (list.some(x => x.userData.tread.lite) ? ' (lite)' : '') + ', steps ' + [...new Set(list.map(x => x.userData.tread.fit || 'band'))].join('/') + ', ' + list.reduce((n, x) => n + (x.geometry.userData.parts?.rings || 0), 0) + ' rings, ' + tris.reduce((a, b) => a + b, 0) + ' tris' + (zf.length ? ', Z-FIGHT ' + zf.length : ''));
    }
    check(ok && worn >= sample.length, d.name + ' on ' + worn + ' of the ' + sample.length + ' sample cars (one may have no room): ' + lines.join('; ') + ': children of their tyres, tagged, shared, no z-fight');
  }
  W.setWheelTread('none');

  // ---- turning, measured from a point on the tread (and on the rim) in the model's frame ----
  const tip = new THREE.Vector3(), inv = new THREE.Matrix4();
  const angleOf = (m, mesh, t) => { tip.set(0, 1, 0).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv.copy(m.matrixWorld).invert()); return Math.atan2(tip.z - t.centre.z, tip.y - t.centre.y); };
  const run = (m, v, frames) => { // v m/s at 60 fps (null: on show); per tread and per rim: the mean turn a frame
    const info = m.userData.wheelHubs.rimInfo, list = [...treadsOf(m), ...rimsOf(m)], last = list.map(() => null), sum = list.map(() => 0);
    if (v !== null) m.userData.roll = 0; else { delete m.userData.roll; }
    m.userData.wheelHubs.turn = undefined;
    m.userData.animate(100);
    for (let f = 1; f <= frames; f++) {
      if (v !== null) m.userData.roll += v / 60;
      m.userData.animate(100 + f / 60); m.updateMatrixWorld(true);
      list.forEach((x, i) => { const a = angleOf(m, x, info.find(t => t.tyre === x.parent)); if (last[i] !== null) { let da = a - last[i]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; sum[i] += da; } last[i] = a; });
    }
    return list.map((x, i) => ({ tread: !!x.userData.tread, tyre: x.parent, per: sum[i] / (frames - 1), u: x.userData.tread || x.userData.rim }));
  };
  const near = (a, b) => Math.abs(a - b) < 0.002 * Math.abs(b) + 1e-4;
  const commuter = fleet.find(c => c.id === 'sprinthatch'); // (a hatch with room for every design at full height)
  for (const d of designs) {
    W.setWheelSet('spoke5'); W.setWheelTread(d.id);
    const m = mk(commuter);
    const one = run(m, 1.5, 30), two = run(m, 3, 30), back = run(m, -1.5, 30), stop = run(m, 0, 30), show = run(m, null, 30), fast = run(m, 45, 60);
    const tr = (rs) => rs.filter(x => x.tread);
    const together = tr(one).every(x => one.filter(y => !y.tread && y.tyre === x.tyre).every(y => near(y.per, x.per))) && tr(show).every(x => show.filter(y => !y.tread && y.tyre === x.tyre).every(y => near(y.per, x.per)));
    check(tr(one).length > 0 && tr(one).every(x => near(x.per, 1.5 / x.u.r / 60)) && tr(two).every((x, i) => near(x.per, 2 * tr(one)[i].per)) && tr(back).every((x, i) => near(x.per, -tr(one)[i].per)) && together,
      d.name + ' with the 5-spoke: the tread turns by distance over radius (' + tr(one)[0].per.toFixed(4) + ' rad a frame at 1.5 m/s, the same as its rim; twice that at 3 m/s; back when reversing)');
    check(tr(stop).every(x => Math.abs(x.per) < 1e-6) && tr(show).every(x => near(x.per, RM.IDLE_RATE / 60)), d.name + ': stopped in the game it stands still; on show it idles at ' + RM.IDLE_RATE + ' rad/s in step with the rim');
    check(tr(fast).every(x => near(x.per, RM.CLAMP * x.u.gap) && x.u.level === RM.BLUR.length - 1 && x.u.blur.visible), d.name + ': at 45 m/s clamped to ' + RM.CLAMP + ' of its pitch a frame (' + (RM.CLAMP * tr(fast)[0].u.gap).toFixed(3) + ' rad), the blur band at its thickest; at what speed it starts to blur on this car: ' + (RM.BLUR_FROM * tr(fast)[0].u.gap * 60 * tr(fast)[0].u.r).toFixed(1) + ' m/s');
  }
  {
    W.setWheelSet('spinner-blade'); W.setWheelTread('knobbly');
    const m = mk(commuter), stop = run(m, 0, 30), move = run(m, 3, 30), show = run(m, null, 30);
    const sp = (rs) => rs.filter(x => !x.tread), tr = (rs) => rs.filter(x => x.tread);
    check(sp(stop).length > 0 && sp(stop).every(x => x.u.spin && near(x.per, RM.SPIN_RATE / 60)) && sp(move).every(x => near(x.per, RM.SPIN_RATE / 60)) && sp(show).every(x => near(x.per, RM.SPIN_RATE / 60)),
      'a spinner (Blade spinner) turns at ' + RM.SPIN_RATE + ' rad/s stopped, moving and on show');
    check(tr(stop).every(x => Math.abs(x.per) < 1e-6) && tr(move).every(x => near(x.per, 3 / x.u.r / 60)), '...and the tread beside it does not follow it: still when stopped, by distance when moving');
  }

  // ---- directional designs point forward, both sides ----
  {
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), mv = new THREE.Vector3();
    for (const d of designs.filter(x => x.dir)) {
      W.setWheelSet('stock'); W.setWheelTread(d.id);
      const m = mk(fleet.find(c => c.id === 'sprinthatch')), out = [];
      m.updateMatrixWorld(true);
      const toM = new THREE.Matrix4().copy(m.matrixWorld).invert();
      for (const mesh of treadsOf(m)) {
        // the first block: its top's vertices nearest the middle across (the V's point / the lug's middle end) and farthest (the arms' ends)
        const pos = mesh.geometry.attributes.position, n = d.id === 'chevron' ? 12 : 6, verts = [];
        for (let i = 0; i < n; i++) verts.push(new THREE.Vector3().fromBufferAttribute(pos, i));
        const zMin = Math.min(...verts.map(x => Math.abs(x.z))), zMax = Math.max(...verts.map(x => Math.abs(x.z)));
        const avg = (vs) => vs.reduce((acc, x) => acc.add(x), new THREE.Vector3()).multiplyScalar(1 / vs.length);
        const mid = avg(verts.filter(x => Math.abs(x.z) - zMin < 1e-4)), end = avg(verts.filter(x => zMax - Math.abs(x.z) < 1e-4));
        // which way the tread's surface goes there as the car rolls forward: a small roll
        m.userData.roll = 0; m.userData.wheelHubs.turn = undefined; m.userData.animate(1);
        m.updateMatrixWorld(true); p0.copy(mid).applyMatrix4(mesh.matrixWorld).applyMatrix4(toM);
        const a0 = p0.clone(), e0 = end.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(toM);
        m.userData.roll = 0.01; m.userData.animate(1 + 1 / 60); m.updateMatrixWorld(true); p1.copy(mid).applyMatrix4(mesh.matrixWorld).applyMatrix4(toM);
        mv.subVectors(p1, a0);
        out.push(mv.dot(new THREE.Vector3().subVectors(a0, e0)) > 0);
      }
      check(out.length >= 4 && out.every(Boolean), d.name + ': on every tyre (' + out.length + ', both sides) the pattern\'s middle leads the way the surface moves when rolling forward');
    }
  }

  // ---- the three parts: independent, combined; the tread takes the tyre's colour ----
  {
    W.setWheelSet('stock');
    W.setWheelTread('chevron'); W.setWheelTyre('white'); W.setWheelRim('turbine');
    const m = mk(commuter), f = m.userData.wheelHubs, list = treadsOf(m);
    const white = new THREE.Color(0xe9e9e4), tint = list[0]?.material.color; // (16-Oct: the tread's colour is its material's tint: a light rubber's own colour, a little brighter)
    check(W.wheelTread() === 'chevron' && W.wheelTyre() === 'white' && W.wheelRim() === 'turbine' && W.hubKind() === 'rim' && list.length && rimsOf(m).length && f.parts.some(p => p.mesh.material.color.getHex() === 0xe9e9e4) && tint && Math.abs(tint.r - Math.min(1, white.r * 1.15)) < 0.02 && Math.abs(tint.g - tint.b) < 0.05,
      'Chevron + White tyres + Turbine: all three worn at once; the tread is the tyre\'s white');
    W.setHubColour('red');
    check(W.wheelRim() === 'none' && W.wheelColour() === 'red' && W.hubKind() === 'colour' && W.wheelTread() === 'chevron' && W.wheelTyre() === 'white' && !rimsOf(m).length && treadsOf(m).length, 'a hub colour takes the rim off (one hub kind at a time) and leaves the tread and the tyre colour');
    W.setWheelRim('spintwin');
    check(W.hubKind() === 'spin' && rimsOf(m).every(r => r.userData.rim.spin) && treadsOf(m).length, 'a spinner: hub kind Spinner, the tread kept');
    W.setWheelTread('none');
    check(!treadsOf(m).length && rimsOf(m).length && W.wheelTyre() === 'white', 'tread Stock: the tread goes, the spinner and the tyre colour stay');
    const zf = (W.setWheelTread('ribs'), findZFights(m)).filter(z => [z.a, z.b].some(x => x.userData.tread || x.parent?.userData.tread || x.userData.rim || x.parent?.userData.rim));
    check(!zf.length, 'Ribs + white + Twin spinner on the commuter: no z-fight among tread, spinner and tyre (on the Sprint Hatch)');
  }

  // ---- presets: every old set keeps its look; the new ones ----
  {
    check(['spinner-blade', 'spinner-twin', 'off-road', 'rain', 'tractor', 'winter'].every(id => W.WHEEL_SETS.some(s => s.id === id)) && W.WHEEL_SETS.every(s => W.TYRE_COLOURS.some(t => t.id === s.design) && W.WHEEL_COLOURS.some(c => c.id === s.hub) && (!s.rim || RM.RIM_DESIGNS.some(d => d.id === s.rim)) && (!s.tread || designs.some(d => d.id === s.tread))), 'presets: ' + W.WHEEL_SETS.length + ' (the spinners, Off-road, Rain, Tractor, Winter added), every part a real choice');
    for (const s of W.WHEEL_SETS) { W.setWheelSet(s.id); if (W.wheelSet() !== s.id) check(false, s.id + ': not detected as equipped'); }
    check(true, 'every preset, equipped, is detected as itself');
  }

  // ---- the choice: unknown / absent / broken; ?wheeltread=, ?wheeltyre=, ?wheelhub= ----
  {
    check(TR.cleanTreadChoice('nonsense').all === 'none' && TR.cleanTreadChoice('{bad').all === 'none' && TR.cleanTreadChoice(null).all === 'none' && TR.cleanTreadChoice(['x']).all === 'none' && TR.cleanTreadChoice('{"all":"lugs","rear":"zzz"}').rear === undefined && TR.cleanTreadChoice('studs').all === 'studs', 'a tread choice: unknown, broken or absent = none; a bare id or JSON kept');
    stored.set('delivery.loadout', JSON.stringify({ v: 1, default: { wheels: { tread: { all: 'gone' } } }, cars: { pickup: { wheels: { tread: { all: 'lugs' } } }, sport: { wheels: { tread: 7 } } } }));
    server.moduleGraph.invalidateAll();
    const T2 = await load('render/treads.js'), S2 = await load('render/loadoutstore.js');
    S2.reloadStore();
    check(T2.resolveTread('commuter', 'front') === 'none' && T2.resolveTread('pickup', 'rear') === 'lugs' && T2.resolveTread('sport', 'front') === 'none', 'a saved store: an unknown default tread = none; the pick-up\'s own Tractor; a broken one = none');
    stored.clear();
    globalThis.location = { search: '?wheeltread=chevron&wheeltyre=yellow&wheelhub=spin:spinblade' }; // (on the Sprint Hatch: room for every design)
    server.moduleGraph.invalidateAll();
    {
      const T3 = await load('render/treads.js'), W3 = await load('render/wheelcosmetic.js'), R3 = await load('render/rims.js'), { makeShowCar: mk3 } = await load('render/showcar.js');
      const m = mk3(fleet.find(c => c.id === 'sprinthatch'));
      check(T3.treadAsked && T3.resolveTread('sprinthatch', 'front') === 'chevron' && W3.wheelTyre('sprinthatch') === 'yellow' && R3.resolveRim('sprinthatch', 'rear') === 'spinblade' && treadsOf(m).length && rimsOf(m).length, '?wheeltread=chevron&wheeltyre=yellow&wheelhub=spin:spinblade dresses the car (tread, tyre colour, spinner)');
    }
    globalThis.location = { search: '?wheelhub=gold&wheeldesign=redwhite' };
    server.moduleGraph.invalidateAll();
    {
      const W4 = await load('render/wheelcosmetic.js'), R4 = await load('render/rims.js');
      check(W4.wheelColour() === 'gold' && R4.resolveRim(null, 'front') === 'none' && W4.wheelTyre() === 'red', '?wheelhub=gold: a hub colour, no rim; the old ?wheeldesign=redwhite: red tyres');
    }
    globalThis.location = { search: '?wheelhub=rim:pumpkin' };
    server.moduleGraph.invalidateAll();
    { const R5 = await load('render/rims.js'); check(R5.resolveRim('bus', 'front') === 'pumpkin', '?wheelhub=rim:pumpkin: the Pumpkin rim'); }
    delete globalThis.location; stored.clear(); server.moduleGraph.invalidateAll();
  }

  // ---- the whole fleet ----
  {
    const WC = await load('render/wheelcosmetic.js'), R = await load('render/rims.js'), { makeShowCar: make } = await load('render/showcar.js'), { findZFights: zfOf } = await load('render/zfight.js');
    const mk2 = (car) => { try { return make(car); } catch { return null; } };
    WC.setWheelSet('stock');
    let cars = fleet.filter(car => { const m = mk2(car); return m && R.rimStatus(m) === 'ok'; });
    if (QUICK) cars = cars.filter((_, i) => i % Math.ceil(cars.length / 30) === 0);
    const ownTread = [], noTread = [], partial = [];
    const o = new THREE.Vector3(), e = new THREE.Vector3(), v = new THREE.Vector3();
    for (const d of (QUICK ? designs : designs)) {
      WC.setWheelTread(d.id);
      const zf = [], poke = [], lowPoke = [], perCar = [];
      for (const car of cars) {
        const m = mk2(car), f = m.userData.wheelHubs, list = f.treads?.list || [];
        if (d === designs[0]) {
          const own = f.rimInfo.reduce((n, t) => n + (t.ownTread?.length || 0), 0);
          if (own) ownTread.push(car.id + ' ' + own + (f.rimInfo.every(t => (t.ownTread || []).every(p => !p.visible) || !list.some(x => x.parent === t.tyre)) ? ' hidden' : ' SHOWN'));
          if (!list.length) noTread.push(car.id); else if (list.length < f.rimInfo.length) partial.push(car.id + ' ' + list.length + '/' + f.rimInfo.length);
        }
        if (!list.length) continue;
        perCar.push({ id: car.id, meshes: list.length, tris: list.reduce((n, x) => n + trisOf(x), 0) });
        const fights = zfOf(m).filter(z => [z.a, z.b].some(x => x.userData.tread || x.parent?.userData.tread)).length;
        if (fights) zf.push(car.id + ' ' + fights);
        // poking through: from the tyre's tread (0.99 R) out to each block's top, at every top vertex in the upper three quarters
        m.updateMatrixWorld(true);
        const mine = new Set([...f.tyres, ...f.rawHubs.map(h => h.mesh)]);
        for (const t of f.rimInfo) for (const p of [...t.rubber, ...(t.ownTread || [])]) mine.add(p);
        const others = []; m.traverse(n => { if (n.isMesh && !mine.has(n) && !n.userData.wheelRing && !n.isInstancedMesh) { let vis = true; for (let p = n; p; p = p.parent) if (!p.visible) vis = false; if (vis) others.push(n); } });
        let hits = 0, lowHits = 0;
        for (const x of list) {
          const c = f.rimInfo.find(t => t.tyre === x.parent).centre.clone().applyMatrix4(m.matrixWorld), lowY = c.y - 0.7 * x.userData.tread.r * m.matrixWorld.getMaxScaleOnAxis();
          const axleW = new THREE.Vector3(0, 0, 1).transformDirection(x.matrixWorld); // (the tread mesh's z is its axle)
          const pos = x.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 120));
          for (let i = 0; i < pos.count; i += step) {
            v.fromBufferAttribute(pos, i);
            const rr = Math.hypot(v.x, v.y);
            if (rr < 1.005) continue;
            e.copy(v).applyMatrix4(x.matrixWorld);
            o.set(v.x / rr * 0.8, v.y / rr * 0.8, v.z).applyMatrix4(x.matrixWorld);
            if (e.y < lowY) continue; // (the bottom quarter is the floor's)
            const skinPt = new THREE.Vector3(v.x / rr, v.y / rr, v.z).applyMatrix4(x.matrixWorld), skin = skinPt.distanceTo(o);
            // the same measure as render/treads.js: where bodywork already cuts into the stock tyre the tread goes in with it (not a poke)
            const over = TR.clearance(others, o, e, skin, axleW);
            if (over === null) continue;
            const depth = (e.distanceTo(skinPt) - over) / m.matrixWorld.getMaxScaleOnAxis();
            if (depth > TR.GRAZE + 0.0015 && (e.y - c.y) < 0.35 * x.userData.tread.r * m.matrixWorld.getMaxScaleOnAxis()) { lowHits++; continue; } // (low down, beside a sill or bumper that the stock tyre itself runs through: render/treads.js lets the tread go in with the tyre; reported, not failed)
            if (depth > TR.GRAZE + 0.0015) { hits++; if (process.env.TD) console.log('poke', car.id, d.id, (depth * 1000).toFixed(1) + 'mm', 'at', e.toArray().map(q => q.toFixed(3)).join(','), 'tyre', c.toArray().map(q => q.toFixed(3)).join(','), 'step', x.userData.tread.fit); }
          }
        }
        if (hits) poke.push(car.id + ' ' + hits);
        if (lowHits) lowPoke.push(car.id + ' ' + lowHits);
      }
      const typical = perCar.filter(c => c.meshes === 4), worst = perCar.reduce((a, b) => (b.tris > a.tris ? b : a), { tris: 0 });
      check(!zf.length, d.name + ' on ' + perCar.length + ' cars: no tread in a z-fight pair (' + (zf.slice(0, 8).join('; ') || 'none') + ')');
      check(!poke.length, d.name + ': no tread pokes through bodywork over the tyre (more than ' + TR.GRAZE * 1000 + ' mm, the lowest step\'s graze) (' + (poke.slice(0, 8).join('; ') || 'none') + ')');
      if (lowPoke.length) console.log('        ' + d.name + ': low down, into a sill or bumper the stock tyre itself runs through (let be, as the tyre): ' + lowPoke.join('; '));
      console.log('        ' + d.name + ': a 4-tyre car +4 draw calls (the blocks, the pattern band and the shoulder ring are one mesh a tyre; +1 a tyre while the blur band shows), +' + (typical[0]?.tris ?? '-') + ' to +' + Math.max(0, ...typical.map(c => c.tris)) + ' triangles; the most: ' + worst.id + ' ' + worst.meshes + ' meshes, +' + worst.tris + ' triangles');
    }
    console.log('        cars wearing rims: ' + cars.length + '; no tread on any tyre (no room): ' + (noTread.join(', ') || 'none'));
    console.log('        some axles stock (bodywork too close over them): ' + (partial.join(', ') || 'none'));
    check(ownTread.every(x => !x.endsWith('SHOWN')), 'tyres that carry their own tread blocks have them hidden while a tread is worn: ' + (ownTread.join(', ') || 'none found'));
    if (!QUICK) check(cars.length - noTread.length >= 0.7 * cars.length, 'treads reach ' + (cars.length - noTread.length) + ' of the ' + cars.length + ' rim-wearing cars');
    WC.setWheelSet('stock');
  }
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
await server.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
