// A check of the animals' idle and gait animation (CHECKLIST 514; render/animalanim.js, the rigs in render/obstacleModels.js). For
// each animal obstacle (frog, cow, kangaroo, drop bear, wildebeest, zebra), built and posed headless as render/items.js poses it:
//   - posed with nothing going on (t 0, no stride, standing, on the ground) it is exactly as built: the rig changes no look
//   - its parts move over time (standing, walking, in the air), each within a bound, none below the ground it stands on
//   - stopped and landed, its legs come back to rest; paused (no game time) nothing moves; two of them are never in step
//   - the same mesh count as before (no new draw call): checked against the counts below
// Headless.  node scripts/.animals-anim-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const MESHES = { frog: 8, cow: 9, kangaroo: 12, dropBear: 12, wildebeest: 13, zebra: 24 }; // (as on main before the rigs)
try {
  const THREE = await import('three');
  const { OBSTACLE_MODELS } = await g.load('render/obstacleModels.js');
  const { animateAnimal } = await g.load('render/animalanim.js');
  const { CONFIG } = await g.load('config.js');
  const box = new THREE.Box3();
  // every part's local transform, flattened
  const pose = (model) => { const out = []; model.traverse((n) => { if (n !== model) out.push(...n.position.toArray(), ...n.quaternion.toArray(), ...n.scale.toArray()); }); return out; };
  const worldVerts = (model) => { model.updateMatrixWorld(true); const out = []; const v = new THREE.Vector3(); model.traverse((n) => { if (!n.isMesh) return; const p = n.geometry.attributes.position; for (let i = 0; i < p.count; i++) out.push(...v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).toArray()); }); return out; };
  const diff = (a, b) => a.reduce((m, x, i) => Math.max(m, Math.abs(x - b[i])), 0);
  const meshes = (model) => { let n = 0; model.traverse((m) => { if (m.isMesh) n++; }); return n; };
  for (const kind of Object.keys(MESHES)) {
    const model = OBSTACLE_MODELS[kind]();
    const A = model.userData.anim;
    check(!!A, `${kind}: rigged`);
    if (!A) continue;
    check(meshes(model) === MESHES[kind], `${kind}: ${meshes(model)} meshes (was ${MESHES[kind]}: no new draw call)`);
    const built = pose(model), builtVerts = worldVerts(model);
    A.pose(0, 0, 0, 0);
    check(diff(pose(model), built) < 1e-9 && diff(worldVerts(model), builtVerts) < 1e-6, `${kind}: at rest, as built`);
    // a run: 2 s standing, 3 s on the move (walking, hopping, galloping, dropping), 3 s stopped and down
    const o = { kind, s: 100, lat: 0, h: 0, t: 1, fall: 0, migrate: kind === 'wildebeest' || kind === 'zebra' ? 1 : undefined };
    const dt = 1 / 60;
    let time = 0, lowest = Infinity, moved = 0, biggest = 0;
    const rest = pose(model);
    for (let f = 0; f < 8 * 60; f++) {
      const going = f >= 120 && f < 300, u = (f - 120) * dt;
      if (going) {
        if (kind === 'frog') { o.t = (u % 1.2) / 0.7; if (o.t >= 1) o.t = 1; o.h = o.t < 1 ? CONFIG.frogHopHeight * 4 * o.t * (1 - o.t) : 0; o.s += o.t < 1 ? 10 * dt : 0; } else if (kind === 'kangaroo') { o.lat += CONFIG.kangarooSpeed * dt; o.h = CONFIG.kangarooHop * Math.abs(Math.sin(u * CONFIG.kangarooHops * Math.PI)); } else if (kind === 'dropBear') { o.h = Math.max(0, 6 - 4.9 * u * u); o.fall = o.h > 0 ? 1 : 0; } else if (o.migrate) { o.lat += 5 * dt; o.h = CONFIG.migration.hop * Math.abs(Math.sin(u * CONFIG.migration.hops * Math.PI)); } else o.lat += CONFIG.cowSpeed * dt;
      } else { o.t = 1; if (kind !== 'dropBear' || f >= 300) o.h = 0; o.fall = 0; }
      time += dt;
      animateAnimal(model, o, 0, dt, time);
      model.position.y = o.h;
      const p = pose(model);
      moved = Math.max(moved, diff(p, rest));
      model.traverse((n) => { if (n !== model && n.rotation) biggest = Math.max(biggest, Math.abs(n.rotation.x), Math.abs(n.rotation.y), Math.abs(n.rotation.z)); });
      model.updateMatrixWorld(true);
      lowest = Math.min(lowest, box.setFromObject(model).min.y);
    }
    check(moved > 0.05, `${kind}: its parts move (largest change ${moved.toFixed(3)})`);
    check(biggest < 1.3, `${kind}: no part turned more than 1.3 rad (most ${biggest.toFixed(2)})`);
    check(lowest > -0.03, `${kind}: never below the ground (lowest ${lowest.toFixed(3)} m)`);
    check(A.walk < 0.01, `${kind}: stopped, it stands (walk ${A.walk.toFixed(4)})`);
    // its legs and its lift back to rest: posed at this time with no stride and on the ground, against the same pose with what is left
    const now = pose(model);
    A.pose(time, A.stride, 0, 0);
    check(diff(now, pose(model)) < 0.01, `${kind}: stopped and down, its legs back at rest (off by ${diff(now, pose(model)).toFixed(4)})`);
    // paused: no game time, nothing moves
    animateAnimal(model, o, 0, 0, time);
    const held = pose(model);
    for (let f = 0; f < 30; f++) animateAnimal(model, o, 0, 0, time);
    check(diff(pose(model), held) < 1e-9, `${kind}: paused, it holds still`);
    // two of them at the same moment: not in step
    const a = OBSTACLE_MODELS[kind](), b = OBSTACLE_MODELS[kind]();
    const oa = { ...o }, ob = { ...o };
    animateAnimal(a, oa, 0, dt, 3.3);
    animateAnimal(b, ob, 1, dt, 3.3);
    check(diff(pose(a), pose(b)) > 0.005, `${kind}: two side by side are not in step`);
  }
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
}
await g.close?.();
console.log(failures ? `${failures} FAILED` : 'all ok');
process.exit(failures ? 1 : 0);
