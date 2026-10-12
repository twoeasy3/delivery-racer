// A check of the showroom landing's SUSPENSION (render/carsuspension.js, driven by render/carbounce.js): every car of the
// roster (the showroom's: garage cars, the blueprint fillers, the Bespoke key cars, event and earned cars; and every car
// idea of the ideas lot) is built as the showroom builds it (render/showcar.js makeShowCar), its parts sorted once into
// wheels (held on the floor), squashed parts (on the floor, stretched upright) and the sprung body, and then landed at
// the bounce's compression (0.16 s) and rebound (0.31 s) peaks: the lowest point of its wheels must not move (planted),
// and its body must move by about the bounce's offset (down, then up). Each car is listed with what was found and how
// (wheels / wheels+squash / named; none: a vehicle with no springs, which does not bounce at all). No picture: what it looks like is only seen in a browser
// (?showroom&look=<id>&full&bounce=0.16).
//   node scripts/.suspension-check.mjs            (add a car id to see only that car's parts)
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
try {
  const THREE = await import('three');
  const { makeShowCar } = await load('render/showcar.js');
  const { prepareSuspension, applySuspension } = await load('render/carsuspension.js');
  const { bounceOffset, DROP } = await load('render/carbounce.js');
  const { showroomCars } = await load('showroomData.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { CARS, FILLER_CARS, BESPOKE_CARS, EVENT_CARS, EARNED_CARS } = await load('cars.js');
  const only = process.argv[2];
  const floor = showroomCars(), cars = [...new Set([...floor, ...IDEA_CARS])].filter(car => !only || car.id === only);
  if (!only) {
    check([...CARS, ...FILLER_CARS, ...BESPOKE_CARS, ...EVENT_CARS].every(car => cars.includes(car)) && EARNED_CARS.every(car => car.off || cars.includes(car)),
      'the roster: every garage, filler, Bespoke and event car, every earned car that is on, and the ideas (' + cars.length + ' cars)');
  }
  // the bounce: its compression and rebound peaks, and the free fall (wheels and all)
  const down = bounceOffset(0.16), up = bounceOffset(0.31), fall = bounceOffset(0.05), rest = bounceOffset(2);
  check(down.y < -0.025 && down.wheelY === 0 && up.y > 0.01 && up.wheelY === 0 && fall.wheelY === fall.y && fall.y > 0 && !rest.y && !rest.wheelY,
    'the bounce: falls ' + DROP + ' m wheels and all, then the body alone: down ' + down.y.toFixed(3) + ' m (0.16 s), up ' + up.y.toFixed(3) + ' m (0.31 s), still at rest');
  check(bounceOffset(0.16, true).y === 0 && bounceOffset(0.16, true).wheelY === 0, 'reduced motion (and a locked silhouette): no motion');
  // a car's parts, as the showroom has them (the turntable at the origin): their lowest point, and the mean of their middles
  const measure = (meshes) => {
    let low = Infinity, sum = 0;
    const box = new THREE.Box3();
    for (const mesh of meshes) { box.setFromObject(mesh, true); low = Math.min(low, box.min.y); sum += (box.min.y + box.max.y) / 2; } // (precise: every vertex; the turntable only turns about y)
    return { low, mid: sum / meshes.length };
  };
  const tally = {}, bad = [], noWheels = [];
  for (const car of cars) {
    let model;
    try { model = makeShowCar(car); } catch (error) { if (IDEA_CARS.includes(car)) continue; bad.push(car.id + ' (no model: ' + error.message + ')'); continue; } // (an idea with no model has no live view)
    model.parent?.remove(model);
    const s = prepareSuspension(model);
    // as the showroom stands it: model in body in turn, on the floor at y 0 (turned, to be sure the frames are kept apart)
    const turn = new THREE.Group(), body = new THREE.Group();
    turn.rotation.y = 0.7;
    body.add(model);
    turn.add(body);
    model.position.set(0.3, -s.ground, -0.2);
    model.userData.animate?.(1.3);
    turn.updateMatrixWorld(true);
    const planted = s.plantedMeshes, sprung = s.sprung;
    const at = (o) => {
      model.userData.animate?.(1.3);
      applySuspension(model, body, o);
      turn.updateMatrixWorld(true);
      const w = planted.length ? measure(planted).low : 0, b = measure(sprung);
      return { w, b: b.low, m: b.mid, y: s.y, pitch: s.pitch };
    };
    const r = at(rest), d = at(down), u = at(up), f = at(fall), r1 = at(rest);
    if (only) console.log(JSON.stringify({ r, d, u, f, r1, ground: s.ground }));
    tally[s.how] = (tally[s.how] || 0) + 1;
    if (s.how === 'none') noWheels.push(car.id);
    const planted0 = s.how === 'none' || !planted.length || Math.abs(d.w - r.w) < 1e-4 && Math.abs(u.w - r.w) < 1e-4 && Math.abs(f.w - r.w - fall.y) < 1e-4;
    // the body: its middle down and up by the offset (as eased by a low body's bump stop), and never into the floor; one
    // with no springs (no wheels on the floor, or its model's noBounce) not moved at all
    const body0 = s.how === 'none' ? [d, u, f].every(x => x.b === r.b && x.m === r.m && x.w === r.w && !x.y && !x.pitch)
      : Math.abs(d.m - r.m - d.y) < 0.012 && Math.abs(u.m - r.m - u.y) < 0.012 && d.y < -0.003 && u.y > 0.01 && d.b > -0.002;
    const back0 = Math.abs(r1.w - r.w) < 1e-6 && Math.abs(r1.b - r.b) < 1e-6 && s.planted.every(node => node.matrixAutoUpdate);
    const line = car.id.padEnd(16) + ' ' + s.how.padEnd(13) + ' wheels ' + String(s.wheels).padStart(2) + ', planted ' + String(s.planted.length).padStart(2)
      + ' nodes (' + planted.length + ' meshes), squashed ' + s.squash.length + ', sprung ' + sprung.length + ' | body travel ' + (d.m - r.m).toFixed(3) + ' / +' + (u.m - r.m).toFixed(3)
      + ' (clearance ' + s.clearance.toFixed(2) + ', lowest at compression ' + d.b.toFixed(3) + '), wheels ' + (d.w - r.w).toFixed(4);
    console.log('        ' + line);
    if (!(planted0 && body0 && back0 && sprung.length)) bad.push(car.id + (planted0 ? '' : ' (wheels moved)') + (body0 ? '' : ' (body did not move by the offset, or into the floor)') + (back0 ? '' : ' (not back at rest)') + (sprung.length ? '' : ' (no sprung body)'));
    if (only) {
      for (const node of s.planted) console.log('          planted: ' + (node.type) + ' ' + (node.geometry?.type || '') + ' at ' + node.position.toArray().map(x => x.toFixed(2)).join(','));
      const low = sprung.map(mesh => [mesh, new THREE.Box3().setFromObject(mesh, true)]).sort((a, b) => a[1].min.y - b[1].min.y).slice(0, 3);
      for (const [mesh, box] of low) console.log('          low sprung: ' + mesh.geometry.type + ' ' + box.min.toArray().map(x => x.toFixed(2)) + ' .. ' + box.max.toArray().map(x => x.toFixed(2)));
      for (const part of s.squash) console.log('          squash:  ' + part.node.geometry?.type + (part.stretch ? ' (stretched)' : ' (rides)') + ' top ' + part.top.toFixed(2));
    }
  }
  console.log('        how: ' + JSON.stringify(tally) + (noWheels.length ? '; no bounce: ' + noWheels.join(', ') : ''));
  check(!bad.length, 'every car: none moves if it has no springs; the rest: its wheels stay on the floor at the compression and rebound peaks and fall with it before it lands, its body moves by about the offset, all as before at rest' + (bad.length ? ' (not: ' + bad.join('; ') + ')' : ''));
} finally {
  await server.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
