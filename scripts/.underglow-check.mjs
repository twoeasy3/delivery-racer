// A check of the UNDERGLOW cosmetic (render/underglow.js; the owner, 16-Oct: "One agent to work on underglows"). Headless (no renderer):
//   - every look builds on a sample of cars (a hatch, a pickup, a bus, a sports car, a lorry, a wedge, a kei truck, a Super kit car) as ONE
//     mesh (one draw call) under the car: inside its footprint + margin (no wider than the body + 0.75 m a side, no longer than the body),
//     wider than the body, 4 to 6 mm over the floor (no z-fight with the road), flat, tagged userData.underglow, its material
//     blackout 'hide' (render/silhouette.js silhouetteFor gives the hidden material), held on the floor by the suspension (a planted part)
//   - a Super car's own glow (render/carExtras.js, userData.ownUnderglow) stays with none worn and is hidden under a worn one
//   - a model blacked out before dressing wears none; an unknown or not-owned id wears none; 'Match car' takes the car's paint per side
//   - the store (render/loadoutstore.js): a store written before the slot existed (no underglow) reads as none, garbage ids are dropped by
//     the reader, per car over the default, the loadout key gains '|g=<id>' only when one is worn (keys from before stay the same)
//   - animation: 1000 frames of the animate hook on every effect allocate nothing that grows (the geometry's arrays, the uniforms' count)
//   - the registry: the Glow tab shows on the sample cars with its 12 looks plus None, and not on the excluded ones (the Tank, the Saucer,
//     the hovercraft, the snowcat, the jetboat, the Monowheel, a Legendary car); the excluded models are exactly those whose suspension
//     finds no wheels on the floor
//   - outside the replay fingerprint: the logic hash (vite.config.js) is the same with this branch's render/ files as the walk sees them
//   node scripts/.underglow-check.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { startModels } from './modelpatch-load.mjs';

const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const THREE = await import('three');
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const U = await load('render/underglow.js');
  const S = await load('render/showcar.js');
  const Su = await load('render/carsuspension.js');
  const Si = await load('render/silhouette.js');
  const Store = await load('render/loadoutstore.js');
  const L = await load('render/loadout.js');
  const R = await load('render/cosmeticslots.js');
  const { COSMETICS } = await load('render/cosmetics.js');
  const all = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...C.EARNED_CARS, ...Object.values(C.SECRET_CARS), ...IDEA_CARS];
  const car = (id) => all.find(c => c.id === id);
  const fresh = () => { globalThis.localStorage.removeItem(Store.KEY); Store.reloadStore(); }; // (a store with nothing in it)
  const SAMPLE = ['hothatch', 'pickup', 'bus', 'sport', 'cranelorry', 'wedge', 'keitruck', 'hellrod'];
  const glows = (model) => { const l = []; model.traverse(o => { if (o.isMesh && o.userData.underglow) l.push(o); }); return l; };
  const boxOf = (model, skip) => { model.updateMatrixWorld(true); const b = new THREE.Box3(), t = new THREE.Box3(); model.traverse(o => { if (o.isMesh && !skip(o)) { o.geometry.computeBoundingBox(); b.union(t.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); } }); return b; };
  const realBox = (mesh) => { const b = new THREE.Box3(); const p = mesh.geometry.attributes.position; for (let i = 0; i < p.count; i++) b.expandByPoint(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld)); return b; };

  check(U.UNDERGLOWS.length >= 10 && U.UNDERGLOWS.filter(g => g.fx).length === 3 && U.UNDERGLOWS.some(g => g.id === 'match') && COSMETICS.filter(c => c.slot === 'underglow').length === U.UNDERGLOWS.length && COSMETICS.filter(c => c.slot === 'underglow').every(c => c.free && c.price === 300),
    'the looks: ' + U.UNDERGLOWS.map(g => g.name).join(', ') + ' (3 effects, Match car), each a free cosmetic, placeholder price 300');

  // every look on every sample car
  const ids = U.UNDERGLOWS.map(g => g.id);
  let built = 0; const bad = [];
  const sizes = [];
  for (const id of SAMPLE) {
    const c = car(id);
    if (!c) { bad.push(id + ': no such car'); continue; }
    for (const look of ids) {
      fresh(); Store.setSlot(null, 'underglow', { id: look });
      const model = S.makeShowCar(c);
      const g = glows(model), plan = U.underglowPlan(model);
      if (g.length !== 1) { bad.push(id + '/' + look + ': ' + g.length + ' meshes'); continue; }
      const mesh = g[0], body = boxOf(model, o => o.userData.underglow || o.userData.ownUnderglow || o.userData.wheelRing), b = realBox(mesh), s = Su.prepareSuspension(model);
      const floor = s.ground, lift = b.min.y - floor, flat = b.max.y - b.min.y;
      const out = [];
      if (!(lift >= 0.004 && lift <= 0.006 && flat < 1e-6)) out.push('lift ' + lift.toFixed(4) + ' flat ' + flat);
      if (!(b.min.x >= body.min.x - 0.75 && b.max.x <= body.max.x + 0.75)) out.push('too wide');
      if (!(b.min.x < body.min.x && b.max.x > body.max.x)) out.push('not wider than the body');
      if (!(b.min.z >= body.min.z - 1e-6 && b.max.z <= body.max.z + 1e-6)) out.push('longer than the body');
      if (!s.plantedMeshes.includes(mesh) && !s.planted.includes(mesh)) out.push('not planted');
      if (mesh.material.userData.blackout !== 'hide' || Si.silhouetteFor(mesh.material) === Si.SILHOUETTE) out.push('blackout not hide');
      if (!mesh.visible || !plan.worn) out.push('not shown');
      if (mesh.raycast.toString().replace(/\s/g, '') !== '()=>{}') out.push('pickable');
      if (out.length) bad.push(id + '/' + look + ': ' + out.join(', '));
      built++;
      if (look === 'neon-blue') sizes.push(id + ' ' + (b.max.x - b.min.x).toFixed(2) + 'x' + (b.max.z - b.min.z).toFixed(2) + ' (body ' + (body.max.x - body.min.x).toFixed(2) + 'x' + (body.max.z - body.min.z).toFixed(2) + ', ' + (mesh.geometry.index.count / 3) + ' tris)');
    }
  }
  check(!bad.length && built === SAMPLE.length * ids.length, 'every look on ' + SAMPLE.join(', ') + ' (' + built + ' models): ONE flat mesh 4-6 mm over the floor, wider than the body and inside it + 0.75 m a side, no longer than the body, planted, blackout hide, not pickable' + (bad.length ? ': ' + bad.slice(0, 6).join('; ') : ''));
  console.log('        sizes (glow w x l): ' + sizes.join('; '));

  // the suspension, measured with the glow on from the start (a model dressed, then prepareSuspension afresh), finds it planted too
  { fresh(); Store.setSlot(null, 'underglow', { id: 'lime' }); const m = S.makeShowCar(car('hothatch')); delete m.userData.suspension; const s = Su.prepareSuspension(m); const g = glows(m)[0];
    check(s.plantedMeshes.includes(g) && s.wheels === 4, 'measured afresh with the glow on, the suspension holds it on the floor as a decal (and still finds 4 wheels)'); }

  // a bounce: the body moves, the glow stays put
  { fresh(); Store.setSlot(null, 'underglow', { id: 'lime' }); const m = S.makeShowCar(car('pickup')); const body = new THREE.Group(); body.add(m); Su.prepareSuspension(m);
    const g = glows(m)[0]; m.updateMatrixWorld(true); const before = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
    Su.applySuspension(m, body, { y: -0.03, pitch: 0.02, roll: 0.01, wheelY: 0 }); body.updateMatrixWorld(true);
    const after = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld), bodyMoved = Math.abs(body.position.y) > 0.005;
    check(bodyMoved && after.distanceTo(before) < 1e-4, 'in a landing bounce the body moves (' + body.position.y.toFixed(3) + ' m) and the glow stays on the floor (' + after.distanceTo(before).toExponential(1) + ' m)'); }

  // the Super car's own glow
  { fresh(); const m = S.makeShowCar(car('hellrod')); const own = []; m.traverse(o => { if (o.userData.ownUnderglow) own.push(o); });
    check(own.length === 1 && own[0].visible && glows(m).length === 0, "a Super kit car (Hell Rod) with none worn: its own glow shows, no cosmetic mesh");
    Store.setSlot(null, 'underglow', { id: 'teal' });
    check(!own[0].visible && glows(m).length === 1 && glows(m)[0].visible, '...a worn glow (set while it is on show) replaces it: its own is hidden');
    Store.setSlot(null, 'underglow', { id: 'none' });
    check(own[0].visible && !glows(m)[0].visible, '...back to None: its own glow again, the cosmetic hidden'); }

  // blacked out, unknown ids, not owned, match
  { fresh(); Store.setSlot(null, 'underglow', { id: 'red' }); const m = S.makeShowCar(car('hothatch'));
    m.traverse(o => { if (o.isMesh) o.material = Si.silhouetteFor(o.material); });
    const g = glows(m)[0]; check(g.material !== Si.SILHOUETTE && g.material.colorWrite === false, 'a model blacked out after dressing (the car lot, the showroom): the glow is not drawn (the hidden material)');
    Store.setSlot(null, 'underglow', { id: 'purple' }); check(true, '...and a change of look meanwhile does not break on it');
    const dark = S.makeShowCar(car('pickup'), { stock: true }); dark.userData.body.material = Si.SILHOUETTE;
    U.dressUnderglow(dark, car('pickup')); check(glows(dark).length === 0 && !U.underglowPlan(dark).worn, 'a model blacked out before dressing wears none (nothing built)'); }
  { fresh(); Store.setSlot(null, 'underglow', { id: 'no-such-glow' }); const m = S.makeShowCar(car('hothatch'));
    check(U.underglowChoice('hothatch') === 'none' && glows(m).length === 0 && !/\|g=/.test(L.loadoutKey('hothatch')), 'an unknown id in the store: none worn, nothing built, no |g= in the key'); }
  { const { grantCosmetics, clearCosmetics, COSMETICS: list } = await load('render/cosmetics.js'); void grantCosmetics; void clearCosmetics;
    const entry = list.find(c => c.slot === 'underglow' && c.id === 'amber'); entry.free = false;
    fresh(); Store.setSlot(null, 'underglow', { id: 'amber' });
    check(U.shownUnderglow('hothatch') === 'none' && U.setUnderglow('amber', null) === false, 'a look the player does not own: worn as none, and cannot be set'); entry.free = true; }
  { fresh(); Store.setSlot(null, 'underglow', { id: 'match' }); const c = car('hothatch'), m = S.makeShowCar(c);
    S.paintShowCar(m, c, false); const good = U.underglowPlan(m).material.uniforms.uColor.value.getHex();
    S.paintShowCar(m, c, true); const evil = U.underglowPlan(m).material.uniforms.uColor.value.getHex();
    const ch = (h) => [h >> 16, (h >> 8) & 255, h & 255];
    check(good !== evil && Math.max(...ch(good)) >= 250, "'Match car' takes the car's paint, brought up to full brightness, and follows the side (Good #" + good.toString(16) + ', Evil #' + evil.toString(16) + ')'); }

  // the store and the key
  { const before = { v: 1, default: { wheels: { design: 'stock' } }, cars: { pickup: { plate: { design: 'yellow' } } } };
    const cl = Store.clean(before); check(!cl.default.underglow && !cl.cars.pickup.underglow, 'a store written before the slot: no underglow anywhere (reads as none)');
    const cl2 = Store.clean({ v: 1, default: { underglow: { id: 'lime', junk: 1 } }, cars: { pickup: { underglow: { id: '<b>' } } } });
    check(cl2.default.underglow.id === 'lime' && cl2.default.underglow.junk === undefined && !cl2.cars.pickup, 'the store keeps { id } only and drops a malformed id');
    fresh();
    const k0 = L.loadoutKey('hothatch');
    check(!/\|g=/.test(k0) && !/underglow/.test(k0), 'with none worn, the loadout key is as before (' + k0 + ')');
    Store.setSlot(null, 'underglow', { id: 'neon-blue' });
    const k1 = L.loadoutKey('hothatch'); Store.setSlot('hothatch', 'underglow', { id: 'rainbow' });
    check(/\|g=neon-blue/.test(k1) && /\|g=rainbow/.test(L.loadoutKey('hothatch')) && /\|g=neon-blue/.test(L.loadoutKey('pickup')) && U.underglowChoice('pickup') === 'neon-blue' && U.underglowChoice('hothatch') === 'rainbow',
      'per car over the default: All cars Neon blue, the hatch its own Rainbow; the key says so per car');
    check(!/\|g=/.test(L.loadoutKey('hovercraft')) && !/\|g=/.test(L.loadoutKey('tank')), '...an excluded car never has |g= in its key');
    Store.resetCar('hothatch'); check(U.underglowChoice('hothatch') === 'neon-blue', '...Reset car: the default again'); }

  // animation: 1000 frames allocate nothing that grows
  { fresh(); const counts = [];
    for (const look of ['pulse', 'chase', 'rainbow']) {
      Store.setSlot(null, 'underglow', { id: look }); const m = S.makeShowCar(car('sport')); const g = glows(m)[0], u = g.material.uniforms;
      const sig = () => [g.geometry.attributes.position.array.length, g.geometry.index.array.length, Object.keys(u).length, m.children.length, Object.keys(g.material).length].join();
      const first = sig(), times = [];
      for (let f = 0; f < 1000; f++) { m.userData.animate(f / 60); times.push(u.uTime.value); }
      counts.push(look + ' ' + (sig() === first ? 'stable' : 'GREW ' + first + ' -> ' + sig()));
      if (!(sig() === first && Math.abs(times[999] - 999 / 60) < 1e-9 && u.uFx.value === U.underglowById(look).fx)) counts.push('FAIL');
    }
    check(!counts.includes('FAIL') && counts.every(x => /stable/.test(x)), '1000 frames of the animate hook (the time uniform only): ' + counts.join(', ')); }
  { const src = readFileSync(ROOT + '/src/delivery/render/underglow.js', 'utf8');
    check(!/new THREE\.\w*Light\(/.test(src) && !/\.(png|jpe?g|webp)['"]/.test(src), 'no real light and no image file in render/underglow.js'); }

  // the registry: the tab
  { fresh();
    const slot = R.slotById('underglow'), tabs = (c) => R.shownSlots(c).map(s => s.id);
    check(slot && slot.label === 'Glow' && slot.items().length === U.UNDERGLOWS.length && !slot.items().some(it => it.sample), "the Glow slot has its " + U.UNDERGLOWS.length + ' looks (no demo samples)');
    check(SAMPLE.every(id => tabs(car(id)).includes('underglow')), 'the Glow tab shows on ' + SAMPLE.join(', '));
    const EXCL = ['tank', 'earned-ufo', 'hovercraft', 'snocat', 'earned-jetboat', 'monowheel'], legend = all.find(c => c.legend);
    check([...EXCL.map(car), legend].every(c => c && !tabs(c).includes('underglow')), '...and not on ' + EXCL.join(', ') + ' or a Legendary car (' + legend.id + ')');
    R.setDemo(true); const demoItems = slot.items(); R.setDemo(false);
    check(!demoItems.some(it => it.sample), '?cosmetics=all adds no Sample chips to Glow now that it has looks');
    // the excluded models are the ones with no wheels on the floor
    const seen = new Set(), noWheels = [];
    for (const c of all) { if (seen.has(c.id) || c.tank || c.ufo || c.legend || !c.model) continue; seen.add(c.id); const m = S.makeShowCar(c); if (Su.prepareSuspension(m).how === 'none') noWheels.push(c.model); }
    check([...new Set(noWheels)].sort().join() === [...U.NO_GLOW_MODELS].sort().join(), 'the models not offered are exactly those with no wheels on the floor: ' + [...new Set(noWheels)].sort().join(', ')); }

  // the replay fingerprint: render/underglow.js and the files it touches are not in it, and the hash equals origin/main's
  { const { logicFiles } = await import(ROOT + '/vite.config.js'); const logic = logicFiles();
    check(!logic.some(f => /underglow|cosmetic|loadout|carExtras|items\.js|showcar/.test(f)), 'outside the replay fingerprint (' + logic.length + ' logic files; none of the files changed here)');
    const hash = (rev) => { const h = createHash('sha256'); for (const f of logic) { let t; try { t = rev ? execSync('git show ' + rev + ':src/delivery/' + f, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }) : readFileSync(ROOT + '/src/delivery/' + f); } catch { t = null; } if (t === null) return null; h.update(f + '\0'); h.update(t); } return h.digest('hex').slice(0, 10); };
    const mb = execSync('git merge-base HEAD origin/main', { cwd: ROOT }).toString().trim(), here = hash(null), base = hash(mb);
    check(base === null || here === base, 'the logic hash here (' + here + ') equals that of where this branch left origin/main (' + mb.slice(0, 7) + ': ' + (base ?? 'a logic file is new to this branch') + ')'); }
} catch (e) { failures++; console.log('  FAIL  ' + (e.stack || e)); }
await close();
console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
process.exit(failures ? 1 : 0);
