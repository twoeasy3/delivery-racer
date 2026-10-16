// scratch probe: head of .rims-check harness
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
const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, ws: false, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, cacheDir: join(tmpdir(), 'delivery-vite-' + process.pid), plugins: [{ name: 'no-renderer', enforce: 'pre', load(id) { if (/render[\\/]scene\.js$/.test(id)) return SCENE; } }] });
const load = (path) => server.ssrLoadModule('/src/delivery/' + path);
globalThis.TREAD_DEBUG = process.env.TD; try {
  const T = await load('render/treads.js'), W = await load('render/wheelcosmetic.js'), { makeShowCar } = await load('render/showcar.js'), { CARS, LEVEL_CARS, SECRET_CARS, superOf } = await load('cars.js'), { findZFights } = await load('render/zfight.js');
  const { showroomCars } = await load('showroomData.js'), { IDEA_CARS } = await load('ideas.js');
  const fleet = [...new Set([...showroomCars(), ...Object.values(LEVEL_CARS), ...Object.values(SECRET_CARS), ...IDEA_CARS, ...CARS.map(superOf).filter(Boolean)])];
  for (const d of T.TREAD_DESIGNS.filter(d => d.n)) console.log(d.id, T.treadTriangles(d.id), 'lite', T.treadTriangles(d.id, { lite: true }));
  const ids0 = (process.argv[2] || 'sprinthatch,flatbed,sport,bus,commuter').split(',');
  const ids = ids0;
  for (const id of ids) {
    const car = fleet.find(c => c.id === id);
    for (const d of T.TREAD_DESIGNS.filter(d => d.n)) {
      W.setWheelTread(d.id);
      const m = makeShowCar(car), f = m.userData.wheelHubs, list = f.treads?.list || [];
      const zf = findZFights(m).filter(z => [z.a, z.b].some(x => x.userData.tread || x.parent?.userData.tread));
      if (zf.length) for (const z of zf.slice(0,2)) console.log('   ', z.at.toArray().map(v=>v.toFixed(3)).join(','), z.a.userData.tread?.id, z.b.userData.tread?.id, z.a===z.b, z.a.parent===z.b.parent, z.area.toFixed(5), z.normal.toArray().map(v=>v.toFixed(2)).join(','));
      if (process.env.RE) { const before = f.rimInfo.map(t => t.axleRoom.toFixed(3)).join(','); f.treadRoomChecked = false; T.addTreads(m); console.log('   recheck', before, '->', f.rimInfo.map(t => t.axleRoom.toFixed(3)).join(',')); }
      console.log(id, d.id, 'tyres', f.rimInfo?.length, 'treads', list.length, list.map(x => x.userData.tread.fit + (x.userData.tread.lite ? 'L' : '')).join(','), 'room', f.rimInfo?.map(t => t.axleRoom === Infinity ? 'inf' : t.axleRoom.toFixed(3)).join(','), 'cut', f.rimInfo?.map(t => t.cut || 0).join(','), 'tz', f.rimInfo?.map(t => t.tz.map(v => v.toFixed(3)).join(':')).join(' '), 'R', f.rimInfo?.map(t => t.R.toFixed(3)).join(','), 'own', f.rimInfo?.reduce((n, t) => n + (t.ownTread?.length || 0), 0), 'zf', zf.length, zf.slice(0, 2).map(z => (z.a.name || z.a.geometry.type) + '/' + (z.b.name || z.b.geometry.type) + ' ' + z.gapMin.toFixed(4)).join(';'));
    }
  }
} catch (e) { console.log(e.stack); }
await server.close(); process.exit(0);
