// A check of MERGING (render/mergemodel.js, the Car ideas lot's draw calls): every idea's model, built twice, once with its static parts joined by material: the
// same triangles in the same places on the same materials, its body still in it. (Not the inspector: this file began as a copy of its set-up.)
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
  const { makeIdeaModel } = await load('render/ideaModels.js');
  const { mergeStatic, moving } = await load('render/mergemodel.js');
  const { IDEA_CARS } = await load('ideas.js');
  const three = await import('three');
  // every triangle of a model in the model's own space, summed per material (type and colour): how many, their area, where their centres
  // are (the sums of x, y, z and of the squared distance from the origin) and which way they face (the area-weighted normals summed). Two
  // models are the same to the eye when these match to a thousandth (float rounding: a vertex moved through a matrix at another time)
  const triangles = (model) => {
    model.userData.animate?.(0, 0.016);
    model.updateMatrixWorld(true);
    const out = new Map(), inverse = model.matrixWorld.clone().invert();
    const P = [new three.Vector3(), new three.Vector3(), new three.Vector3()], e1 = new three.Vector3(), e2 = new three.Vector3(), nrm = new three.Vector3();
    model.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const key = o.material.type + ':' + (o.material.color ? o.material.color.getHexString() : '') + ':' + o.material.side + (o.material.transparent ? 't' : '');
      const m = inverse.clone().multiply(o.matrixWorld), g = o.geometry, p = g.attributes.position, ix = g.index;
      const n = ix ? ix.count : p.count, flip = m.determinant() < 0 ? -1 : 1;
      const t = out.get(key) || out.set(key, { n: 0, area: 0, c: [0, 0, 0], r2: 0, f: [0, 0, 0] }).get(key);
      for (let i = 0; i < n; i += 3) {
        for (let k = 0; k < 3; k++) P[k].fromBufferAttribute(p, ix ? ix.getX(i + k) : i + k).applyMatrix4(m);
        e1.subVectors(P[1], P[0]); e2.subVectors(P[2], P[0]); nrm.crossVectors(e1, e2).multiplyScalar(0.5 * flip);
        const cx = (P[0].x + P[1].x + P[2].x) / 3, cy = (P[0].y + P[1].y + P[2].y) / 3, cz = (P[0].z + P[1].z + P[2].z) / 3;
        t.n++; t.area += nrm.length(); t.c[0] += cx; t.c[1] += cy; t.c[2] += cz; t.r2 += cx * cx + cy * cy + cz * cz;
        t.f[0] += nrm.x; t.f[1] += nrm.y; t.f[2] += nrm.z;
      }
    });
    return out;
  };
  const near = (x, y) => Math.abs(x - y) <= 1e-3 * (1 + Math.abs(x) + Math.abs(y));
  let before = 0, after = 0, merged = 0;
  const sameAll = [];
  for (const car of IDEA_CARS) {
    let a, b, stats;
    try {
      a = makeIdeaModel(car); b = makeIdeaModel(car);
      moving(a); // (the same calls of its animate and livery as the merge makes of b: a part that turns by what it did before ends the same)
      if (!a || !b) { check(false, car.id + ': no model'); continue; }
      stats = mergeStatic(b);
    } catch (e) { check(false, car.id + ': ' + e.message); continue; }
    if (!stats) { sameAll.push(car.id + ' (left alone)'); continue; }
    before += stats.before; after += stats.after; merged += stats.merged ? 1 : 0;
    const ta = triangles(a), tb = triangles(b);
    let same = ta.size === tb.size;
    for (const [key, x] of ta) { const y = tb.get(key); if (!y || x.n !== y.n || ![x.area, ...x.c, x.r2, ...x.f].every((v, i) => near(v, [y.area, ...y.c, y.r2, ...y.f][i]))) { same = false; if (process.env.DBG) console.log('   differs:', key, JSON.stringify(x), JSON.stringify(y)); } }
    check(same, `${car.id}: ${stats.before} meshes -> ${stats.after}, the same triangles per material (count, area, centres, facing)`);
    check(b.userData.body === b.userData.body && !!b.userData.body?.parent, `${car.id}: its body mesh is still in the model`);
  }
  check(after < before * 0.8, `all ideas together: ${before} meshes -> ${after} (${Math.round(100 * after / before)}%); ${merged} of ${IDEA_CARS.length} models had parts joined${sameAll.length ? '; left alone: ' + sameAll.join(', ') : ''}`);
} finally { await server.close(); }
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
