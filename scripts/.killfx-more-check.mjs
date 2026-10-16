// A check of the EIGHT MORE KILL EFFECTS (render/killfxmore.js over render/killfx.js; CHECKLIST 432). Headless, no browser:
//   - each is registered (slot 'kill', free, a placeholder price, a short name), shipped (on the screen's list, so in Unlock everything
//     and the Test preview), has an icon that draws, an explosion, a trail, and none is one of the first seven or the cut two
//   - SPAWNED 200 TIMES EACH (small, big, the tank shell's, the package hit, mixed; a trail every frame between): no pool ever over its
//     cap, the same pools / arrays / meshes after as after the first (nothing grows), the scene holds only the system's pool meshes (one
//     per pool type used, never more), the heap back within 512 KB, and 5 s later NOTHING left: every pool empty, every mesh hidden, count 0
//   - the engine's new fields (turn, jelly, topple) are none by default (a plain particle goes straight, unsquashed), and each does what
//     it says (a probe effect added to the registry for the check and taken out again). The first seven's own numbers: .killfx-check
//   node scripts/.killfx-more-check.mjs
import { startModels } from './modelpatch-load.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (typeof globalThis.gc !== 'function' && !process.env.KILLFX_NO_GC) { // (once more under --expose-gc, for the heap's numbers)
  const r = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, KILLFX_NO_GC: '1' } });
  process.exit(r.status ?? 1);
}
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const MORE = ['planes', 'ink', 'hearts', 'gears', 'frost', 'leaves', 'jelly', 'dominoes'];
const BEFORE = ['classic', 'confetti', 'fireworks', 'coins', 'bubbles', 'comic', 'lightning', 'pixels', 'candy'];

const session = await startModels();
try {
  const { load } = session;
  const THREE = await session.server.ssrLoadModule('three');
  const K = await load('render/killfx.js');
  const { KILL_MORE } = await load('render/killfxmore.js');
  const { COSMETICS } = await load('render/cosmetics.js');

  // ---- registered, shipped, distinct ----
  const reg = Object.fromEntries(COSMETICS.filter(c => c.slot === 'kill').map(c => [c.id, c]));
  check(Object.keys(KILL_MORE).join() === MORE.join() && MORE.every(id => !BEFORE.includes(id)), 'eight new effects, none of the first seven nor the cut two (' + MORE.join(', ') + ')');
  check(MORE.every(id => K.KILL_IDS.includes(id) && reg[id] && reg[id].free && reg[id].price === 500 && reg[id].name.length <= 9), 'each on the screen\'s list (Unlock everything, the Test preview), registered as kill:<id>, free, placeholder price 500, a short name (' + MORE.map(id => reg[id]?.name).join(', ') + ')');
  let iconErr = null;
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });
  for (const id of MORE) { try { K.KILL_FX[id].icon(ctx, 48); } catch (e) { iconErr ||= id + ': ' + e.message; } }
  check(!iconErr && MORE.every(id => typeof K.KILL_FX[id].explode === 'function' && typeof K.KILL_FX[id].trail === 'function'), 'each has an icon that draws, an explosion and a trail' + (iconErr ? ': ' + iconErr : ''));

  // ---- 200 spawns each: bounded, nothing grows, nothing left ----
  const cam = new THREE.PerspectiveCamera(); cam.position.set(0, 6, 14); cam.lookAt(0, 1, 0); cam.updateMatrixWorld();
  const EVENTS = [{ big: false }, { big: true }, { big: true, scale: 1.5, smoke: 0.5 }, { big: false, scale: 0.45, smoke: 0.3 }];
  const rows = [];
  for (const id of MORE) {
    const scene = new THREE.Scene();
    const sys = K.createKillFx(scene);
    sys.explode(id, 0, 0, 0, 1, 2, EVENTS[0]); sys.trail(id, 0, 2, 0, 0); sys.update(1 / 60, cam); // (the pools it uses made)
    const first = Object.fromEntries(Object.entries(sys.pools).map(([n, p]) => [n, [p.mesh, p.mesh.instanceMatrix.array, p.mesh.instanceColor.array]]));
    const kids0 = scene.children.length;
    globalThis.gc(); const heap0 = process.memoryUsage().heapUsed;
    let over = null, peak = 0, poolsMade = new Set(Object.keys(sys.pools));
    for (let i = 0; i < 200; i++) {
      sys.explode(id, (i % 7) * 3, (i % 3) * 0.5, i * 0.4, (i % 5) - 2, 3, EVENTS[i % EVENTS.length]);
      for (let f = 0; f < 3; f++) { sys.trail(id, 0, 2, i * 0.4 + f * 0.1, 0); sys.update(1 / 60, cam); }
      for (const [n, p] of Object.entries(sys.pools)) { poolsMade.add(n); if (p.live > p.max || p.mesh.count > p.max) over = n; }
      peak = Math.max(peak, sys.live());
    }
    globalThis.gc(); const heap1 = process.memoryUsage().heapUsed;
    const same = Object.entries(first).every(([n, [m, a, c]]) => sys.pools[n].mesh === m && sys.pools[n].mesh.instanceMatrix.array === a && sys.pools[n].mesh.instanceColor.array === c);
    const kids = scene.children.length, onlyPools = scene.children.every(o => o.isInstancedMesh && /^killfx-/.test(o.name)) && kids === Object.keys(sys.pools).length;
    for (let f = 0; f < 60 * 5; f++) sys.update(1 / 60, cam);
    const left = sys.live(), shown = Object.values(sys.pools).filter(p => p.mesh.visible || p.mesh.count).length;
    const cap = Object.keys(sys.pools).reduce((n, name) => n + K.POOL_TYPES[name].max, 0);
    rows.push({ id, over, same, kids0, kids, onlyPools, heap: heap1 - heap0, left, shown, peak, cap, pools: Object.keys(sys.pools).length });
  }
  for (const r of rows) console.log('        ' + r.id.padEnd(10) + 'pools ' + r.pools + ', peak live ' + String(r.peak).padStart(4) + ' (caps together ' + r.cap + '), scene children ' + r.kids0 + ' -> ' + r.kids + ', heap ' + (r.heap / 1024).toFixed(0) + ' KB, left after 5 s ' + r.left);
  check(rows.every(r => !r.over && r.peak <= r.cap), '200 spawns each (small, big, shell, package hit; trails between): no pool over its cap');
  check(rows.every(r => r.same && r.kids === r.kids0 && r.onlyPools), 'nothing grows: the same pool meshes and arrays after 200 spawns as after the first, the scene\'s children only those pool meshes (one a pool type)');
  check(rows.every(r => r.heap < 512 * 1024), 'the heap within 512 KB after 200 spawns each (' + rows.map(r => (r.heap / 1024).toFixed(0)).join(' / ') + ' KB)');
  check(rows.every(r => r.left === 0 && r.shown === 0), 'nothing left in the scene 5 s after: every pool empty, every mesh hidden with count 0');

  // ---- the new fields: none by default, and each does what it says ----
  {
    const g = new THREE.Group(), sys2 = K.createKillFx(g);
    // (spawned through a tiny effect of the check's own: KILL_FX is the registry object, a key added and taken out again)
    const put = (fields) => { K.KILL_FX.__probe = { explode(S2) { const p = S2.spec(); Object.assign(p, { life: 3 }, fields); S2.add('quad'); } }; sys2.clear(); sys2.explode('__probe', 0, 0, 0, 0, 0, { big: false }); };
    const at = () => { const M = sys2.pools.quad.mesh.instanceMatrix.array; return [M[12], M[13], M[14], Math.hypot(M[0], M[1], M[2]), Math.hypot(M[4], M[5], M[6])]; };
    put({ vx: 4 }); for (let f = 0; f < 30; f++) sys2.update(1 / 60, cam);
    const plain = at();
    put({ vx: 4, turn: Math.PI }); for (let f = 0; f < 60; f++) sys2.update(1 / 60, cam);
    const turned = at();
    put({ size: 1, jelly: 1 }); sys2.update(1 / 60, cam); sys2.update(1 / 60, cam); sys2.update(1 / 60, cam); sys2.update(1 / 60, cam); sys2.update(1 / 60, cam);
    const wob = at();
    put({ topple: 20, ax: 0.05, axMax: 1.5 }); for (let f = 0; f < 120; f++) sys2.update(1 / 60, cam);
    const M = sys2.pools.quad.mesh.instanceMatrix.array, tilt = Math.atan2(M[6], M[5]); // (its up axis's lean)
    delete K.KILL_FX.__probe;
    check(Math.abs(plain[0] - 2) < 0.05 && Math.abs(plain[2]) < 1e-6, 'no new field set: a particle goes straight (x ' + plain[0].toFixed(3) + ' after 0.5 s at 4 m/s, z ' + plain[2].toFixed(3) + ')');
    check(Math.abs(turned[0]) < 0.1 && turned[2] < -2, 'turn: half a turn a second, after 1 s it has come round a circle\'s half (x ' + turned[0].toFixed(2) + ', z ' + turned[2].toFixed(2) + ')');
    check(Math.abs(wob[3] - wob[4]) > 0.02, 'jelly: it squashes (width ' + wob[3].toFixed(3) + ', height ' + wob[4].toFixed(3) + ')');
    check(Math.abs(tilt - 1.5) < 0.02, 'topple: it falls over and lies at its stop (' + tilt.toFixed(3) + ' rad, the stop 1.5)');
  }
} finally {
  await session.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
