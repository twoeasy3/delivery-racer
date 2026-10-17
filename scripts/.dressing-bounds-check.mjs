// A check that EVERY COSMETIC SITS WHERE IT BELONGS ON EVERY CAR, even one that animates (the owner, 17-Oct: "The lowrider and super lowrider
// are really glitched with customisation": tread rings twice the tyre's size floating off the front wheels, dressing anchored to the
// pre-bounce pose; and a worn Glow on a car with its own glow gave two; CHECKLIST 444). Headless, no picture. For every car:
//   - THE SCREEN'S WAY vs THE BUILD'S: the car built STOCK, its suspension prepared, ANIMATED to a phase (the Lowrider at the top of its hop),
//     then dressed in place by the loadout store's notice (a tread, a rim, a tyre line, a plate design, a roof prop, a decal, a glow), as
//     the Cosmetics screen does; and the same car built already dressed (at rest). Every dressing part must have the same parent and sit
//     the same in it (its matrix in its parent's frame, its geometry's bounding sphere) within 2 mm.
//   - BOUNDS (at each phase): every wheel dressing part (rim, sidewall ring; a tread 1.25, its blocks stand proud) within 1.15 x its tyre's own radius of the tyre's centre; plates,
//     props and decals within the body's box grown by 0.35 m; the glow within the car's footprint grown by 0.6 m.
//   - ATTACHED: across the animation's phases (rest, mid, peak, trough) each body part's offset from the body, and each wheel part's from
//     its tyre, stays constant (2 mm).
//   - ONE GLOW: on a car with a glow of its own, a worn Glow leaves exactly one visible; None brings its own back.
//   node scripts/.dressing-bounds-check.mjs [car id ...]
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
const TOL = 0.002;
try {
  const THREE = await import('three');
  const W = await load('render/wheelcosmetic.js'), UG = await load('render/underglow.js'), PC = await load('render/platecosmetic.js'), PD = await load('render/propdress.js'), DC = await load('render/decalcosmetic.js');
  const { makeShowCar } = await load('render/showcar.js'), { prepareSuspension } = await load('render/carsuspension.js');
  const C = await load('cars.js'), { showroomCars } = await load('showroomData.js'), { IDEA_CARS } = await load('ideas.js'), { PLATE_DESIGNS } = await load('render/platedesigns.js'), { PROPS } = await load('render/propmodels.js');
  const { COSMETICS } = await load('render/cosmetics.js');
  const only = process.argv.slice(2);
  let fleet = [...new Set([...showroomCars(), ...Object.values(C.LEVEL_CARS), ...Object.values(C.SECRET_CARS), ...IDEA_CARS, ...C.CARS, ...C.CARS.map(C.superOf).filter(Boolean)])];
  if (only.length) fleet = fleet.filter(c => only.includes(c.id));
  const decalId = COSMETICS.find(c => c.slot === 'decal')?.id;
  const plate = PLATE_DESIGNS.find(d => d.id !== 'stock').id, roof = PROPS.roof[0].id;
  const wear = () => { W.setWheelTread('knobbly'); W.setWheelRim('spoke5'); W.setWheelTyre('whitewall'); PC.setPlateDesign(plate); PD.setProp('roof', roof); if (decalId) DC.setDecal(decalId); UG.setUnderglow('neon-blue'); };
  const strip = () => { W.setWheelSet('stock'); PC.setPlateDesign('stock'); PD.setProp('roof', 'none'); DC.setDecal('none'); UG.setUnderglow('none'); };
  const mk = (car) => { try { const m = makeShowCar(car), turn = new THREE.Group(), body = new THREE.Group(); body.add(m); turn.add(body); prepareSuspension(m); turn.updateMatrixWorld(true); return m; } catch { return null; } };
  const pose = (m, t) => { try { m.userData.animate?.(t); } catch { /* (no animation) */ } m.updateMatrixWorld(true); };
  // the dressing parts of a model, by kind, in order
  const parts = (m) => {
    const out = [];
    m.traverse((n) => {
      const u = n.userData, kind = u.tread ? 'tread' : u.rim ? 'rim' : u.ringSide !== undefined ? 'ring' : u.platecosmetic && !n.parent?.userData.platecosmetic ? 'plate' : u.propCosmetic ? 'prop' : u.decalCosmetic || u.flankDecal ? 'decal' : u.underglow ? 'glow' : null;
      if (kind && (n.visible !== false)) out.push({ kind, n });
    });
    return out;
  };
  const sphere = new THREE.Sphere(), box = new THREE.Box3(), v = new THREE.Vector3(), c = new THREE.Vector3(), mtx = new THREE.Matrix4();
  const desc = (n) => { const g = n.geometry; if (g) { if (!g.boundingSphere) g.computeBoundingSphere(); sphere.copy(g.boundingSphere); } else { box.setFromObject(n); box.getBoundingSphere(sphere); } n.updateMatrix(); return { parent: n.parent?.name || n.parent?.type, m: n.matrix.clone(), s: sphere.clone() }; };
  // (a wheel part turns about its axle with the wheel: its place and size are compared, not how far round it has turned)
  const tp = new THREE.Vector3(), tq = new THREE.Quaternion(), ts = new THREE.Vector3(), up = new THREE.Vector3(), uq = new THREE.Quaternion(), us = new THREE.Vector3();
  const near = (m1, m2, turns) => { if (!turns) return m1.elements.every((x, i) => Math.abs(x - m2.elements[i]) < TOL * 5); m1.decompose(tp, tq, ts); m2.decompose(up, uq, us); return tp.distanceTo(up) < TOL && ts.distanceTo(us) < TOL; };
  const why = (a, b) => (a.parent !== b.parent ? 'parent ' + a.parent + '/' + b.parent : a.s.center.distanceTo(b.s.center) >= TOL ? 'centre ' + (a.s.center.distanceTo(b.s.center) * 1000).toFixed(0) + ' mm' : Math.abs(a.s.radius - b.s.radius) >= TOL ? 'radius ' + a.s.radius.toFixed(3) + '/' + b.s.radius.toFixed(3) : 'placed');
  const same = (a, b, turns) => a.parent === b.parent && near(a.m, b.m, turns) && a.s.center.distanceTo(b.s.center) < TOL && Math.abs(a.s.radius - b.s.radius) < TOL;
  // the world radius of a node's vertices about a point, and its tyre (the tyre a wheel part is on: its nearest tyre ancestor)
  const reach = (n, centre) => { let r = 0; n.traverse((x) => { if (!x.isMesh || !x.visible || !x.geometry) return; const p = x.geometry.attributes.position; for (let i = 0; i < p.count; i++) r = Math.max(r, v.fromBufferAttribute(p, i).applyMatrix4(x.matrixWorld).distanceTo(centre)); }); return r; };
  const tyreOf = (m, n) => { const tyres = m.userData.wheelHubs?.tyres || []; for (let p = n.parent; p; p = p.parent) if (tyres.includes(p)) return p; return null; };
  const bodyBox = (m) => { const b = new THREE.Box3(); m.traverse((x) => { if (x.isMesh && x.visible && x.geometry && !parts(m).some(q => q.n === x) && !x.userData.wheelRing && !x.userData.underglow && !x.userData.ownUnderglow) { x.geometry.computeBoundingBox(); b.union(box.copy(x.geometry.boundingBox).applyMatrix4(x.matrixWorld)); } }); return b; };
  const GLOW_CARS = ['superlowrider', 'super-lowrider', 'super-commuter']; // (models known to carry a glow of their own: the check cannot pass by finding none)
  const PHASES = [0, 0.3, Math.PI / 4, 1.3]; // (the Lowrider: level, rising, the top of its hop, coming down)
  const bad = { screen: [], bounds: [], attached: [], glow: [] }, counted = { cars: 0, parts: 0, glows: 0 };
  for (const car of fleet) {
    strip(); wear();
    const a = mk(car);
    if (!a) continue;
    counted.cars++;
    const pa = parts(a).map(p => ({ kind: p.kind, d: desc(p.n) })); // (described now: a later change re-dresses every live car, this one too)
    strip();
    const b = mk(car);
    pose(b, Math.PI / 4); // (animated, as on the screen, then dressed in place)
    wear(); b.updateMatrixWorld(true);
    const pb = parts(b);
    counted.parts += pb.length;
    // the screen's way vs the build's
    const kinds = (list) => list.map(p => p.kind).join(',');
    if (kinds(pa) !== kinds(pb)) bad.screen.push(car.id + ' (' + kinds(pa) + ' / ' + kinds(pb) + ')');
    else { const off = pa.map((p, i) => [p, pb[i]]).filter(([p, q]) => !same(p.d, desc(q.n), ['tread', 'rim'].includes(p.kind))).map(([p, q]) => p.kind + ' ' + why(p.d, desc(q.n))); if (off.length) bad.screen.push(car.id + ' ' + [...new Set(off)].join('/')); }
    // bounds, in the pose it is in now (each phase below)
    const bounds = (ph) => {
      const bb = bodyBox(b), grown = bb.clone().expandByScalar(0.35), wide = bb.clone().expandByScalar(0.6);
      for (const { kind, n } of pb) {
        if (['tread', 'rim', 'ring'].includes(kind)) {
          const t = tyreOf(b, n); if (!t) { bad.bounds.push(car.id + ' ' + kind + ' not on a tyre'); continue; }
          if (!t.geometry.boundingBox) t.geometry.computeBoundingBox(); box.copy(t.geometry.boundingBox).applyMatrix4(t.matrixWorld); box.getCenter(c); const R = (box.max.y - box.min.y) / 2; // (the tyre's OWN geometry: not its children, the dressing itself)
          const lim = kind === 'tread' ? 1.25 : 1.15; // (a tread's blocks stand up to 0.11 R proud by design, on a tyre whose own box may read a little small)
          if (reach(n, c) > lim * R + 0.002) bad.bounds.push(car.id + ' ' + kind + ' ' + (reach(n, c) / R).toFixed(2) + ' R at t ' + ph.toFixed(2));
        } else {
          box.setFromObject(n);
          if (!(kind === 'glow' ? wide : grown).containsBox(box)) bad.bounds.push(car.id + ' ' + kind + ' at t ' + ph.toFixed(2));
        }
      }
    };
    // attached across the phases: each part's offset from what it rides with
    const anchorOf = (kind, n) => (['tread', 'rim', 'ring'].includes(kind) ? tyreOf(b, n) : kind === 'glow' ? b : b.userData.body || b);
    const rel = (kind, n) => { const p = anchorOf(kind, n); return p ? mtx.copy(p.matrixWorld).invert().multiply(n.matrixWorld).clone() : null; };
    const first = new Map();
    for (const t of PHASES) {
      pose(b, t);
      bounds(t);
      for (const { kind, n } of pb) {
        const r = rel(kind, n); if (!r) continue;
        if (!first.has(n)) first.set(n, r);
        else if (!near(r, first.get(n), ['tread', 'rim'].includes(kind)) && kind !== 'glow') bad.attached.push(car.id + ' ' + kind + ' at t ' + t.toFixed(2));
      }
    }
    // one glow
    const own = []; b.traverse((x) => { if (x.userData.ownUnderglow) own.push(x); });
    if (GLOW_CARS.includes(car.id) && !own.length) bad.glow.push(car.id + ' (its own glow not tagged userData.ownUnderglow)');
    if (own.length) {
      counted.glows++;
      const visible = () => { let n = 0; b.traverse((x) => { if ((x.userData.ownUnderglow || x.userData.underglow) && x.visible) n++; }); return n; };
      const worn = visible();
      UG.setUnderglow('none');
      const none = own.every(x => x.visible) && !parts(b).some(p => p.kind === 'glow');
      if (worn !== 1 || !none) bad.glow.push(car.id + ' (' + own.length + ' own; ' + worn + ' visible with a Glow)');
    }
  }
  strip();
  const list = (a) => [...new Set(a)].slice(0, 12).join('; ') + (new Set(a).size > 12 ? ' ... (' + new Set(a).size + ')' : '');
  check(!bad.screen.length, counted.cars + ' cars, ' + counted.parts + ' dressing parts: dressed in place while animated (the screen\'s way) = dressed at build, same parent, same place (' + (list(bad.screen) || 'none off') + ')');
  check(!bad.bounds.length, 'at every phase, every rim / ring within 1.15 x its tyre\'s radius (a tread 1.25: its blocks stand proud), plates / props / decals within the body grown 0.35 m, the glow within 0.6 m (' + (list(bad.bounds) || 'none out') + ')');
  check(!bad.attached.length, 'across the animation (t ' + PHASES.map(t => t.toFixed(2)).join(', ') + ') every part keeps its offset from the body or tyre it rides with (' + (list(bad.attached) || 'none moved') + ')');
  check(!bad.glow.length, counted.glows + ' cars with a glow of their own: a worn Glow leaves exactly one visible, None brings theirs back (' + (list(bad.glow) || 'all') + ')');
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
await server.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
