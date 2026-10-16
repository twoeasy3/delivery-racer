// A check of the DECAL COSMETIC, a trial on the six cars of the zone table (CHECKLIST 423; render/decalcosmetic.js, render/decaldesigns.js,
// the shared core render/flankdecal.js, the zones render/decalzonestable.js):
//   1. every design on each of the six cars (Post Van, People's Bug, Wedge, Flatbed, City Bus, Woody) builds ONE flat mesh (one draw call)
//      with a piece on EACH flank, every piece inside a zone both flanks share, every shown vertex just proud of the paint under it (2 to
//      8 mm: the 4 mm lift, the 2 mm chord), the same rectangles on both sides, within a triangle budget; SCALED (the bus's band and badge
//      bigger than the Post Van's / Wedge's); the canvases at most 256 x 256; a second dressing casts no rays (the geometry kept)
//   2. the store: a store from before the decal has none (migration), a car's own over the default, Reset car, garbage dropped, the
//      loadout key carries '|d=...' only when a decal is worn, and only for that car; ?decal=<id>[,<colour>] dresses for the visit
//   3. the tab: the Decal tab shows on exactly the cars whose model has a zone row, never on a Legendary car, the Tank or the Saucer
//   4. dents: at 100% damage the decal is crumpled with the body (its vertices move, as the paint's); clean again at 0
//   5. not on Legendary: a Legendary car is never dressed; blackout: hidden; the Ghost: hidden (render/items.js ghostify)
//   6. render-only: no logic file is or imports a decal module, and the replay 'logic' fingerprint equals main's (merge base)
//   node scripts/.decalcosmetic-check.mjs        (headless, about 20 s)
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { startModels } from './modelpatch-load.mjs';

const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const SIX = ['postvan', 'bug', 'wedge', 'flatbed', 'bus', 'woody'];
const BUDGET = 200; // triangles a car, both flanks
try {
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { makeShowCar } = await load('render/showcar.js');
  const DC = await load('render/decalcosmetic.js');
  const DD = await load('render/decaldesigns.js');
  const FD = await load('render/flankdecal.js');
  const Store = await load('render/loadoutstore.js');
  const { loadoutKey } = await load('render/loadout.js');
  const { shownSlots } = await load('render/cosmeticslots.js');
  const { dentModel } = await load('render/dents.js');
  const { silhouetteFor } = await load('render/silhouette.js');
  const { cosmeticKeys } = await load('render/cosmetics.js');
  const all = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...C.EARNED_CARS, ...Object.values(C.SECRET_CARS), ...IDEA_CARS];
  const car = (id) => all.find(c => c.id === id);
  const decals = (m) => { const out = []; m.traverse(n => { if (n.userData.decalCosmetic) out.push(n); }); return out; };
  const toModel = (m, mesh) => { m.updateMatrixWorld(true); return new THREE.Matrix4().copy(m.matrixWorld).invert().multiply(mesh.matrixWorld); };

  // ---- 1. every design on every car ----
  check(DC.DESIGNS.length >= 10 && DC.DESIGNS.length <= 14 && DC.DESIGNS.every(d => /^[a-z]+$/.test(d.id) && d.name.length <= 9), DC.DESIGNS.length + ' designs, short names: ' + DC.DESIGNS.map(d => d.name).join(', '));
  check(DC.DESIGNS.every(d => { const [w, h] = DD.canvasSize(d); return w <= 256 && h <= 256 && w / h === d.aspect; }), 'every canvas at most 256 x 256, its aspect the picture\'s (uniform strokes)');
  check(cosmeticKeys().filter(k => k.startsWith('decal:')).length === DC.DESIGNS.length && DC.PRICE === 250, 'every design is a cosmetic decal:<id> (price placeholder 250)');
  // the looks: one model through the eight colours, the looks it no longer wears let go (no more than LOOKS_KEPT held)
  {
    DC.setDecal('stripes', null);
    const m = makeShowCar(car('postvan')), seen = [];
    for (const p of DC.DECAL_PAINTS) { DC.setDecalColour(p.id, null); seen.push(decals(m)[0]?.material); }
    const mem = DC.decalMemory();
    check(new Set(seen).size === DC.DECAL_PAINTS.length && mem.looks <= DC.LOOKS_KEPT + 1, 'one material a colour (' + new Set(seen).size + '), the unworn ones let go: ' + mem.looks + ' held, ' + Math.round(mem.bytes / 1024) + ' KB with mipmaps (a band 64 KB + mipmaps)');
    DC.resetDecal(null);
    check(!decals(m).length, '...None: the mesh taken off');
  }
  const table = [];
  const sizes = {};
  for (const id of SIX) {
    const c = car(id);
    check(!!c && DC.decalSupported(c), id + ': a car whose model (' + c?.model + ') has a zone row');
    const paired = FD.pairedZones(DC.decalKey(c));
    let worst = '', tris = 0, meshes = 0, proud = [Infinity, -Infinity], inside = true, bothSides = true, mirrored = true;
    for (const d of DC.DESIGNS) {
      globalThis.location = { search: '?decal=' + d.id };
      const m = makeShowCar(c), plan = DC.decalPlan(m), list = decals(m);
      if (list.length !== 1) { worst = d.id + ': ' + list.length + ' meshes'; continue; }
      meshes++;
      const mesh = list[0], g = mesh.geometry, P = g.attributes.position, A = g.attributes.color, T = toModel(m, mesh), st = plan.stats;
      tris = Math.max(tris, P.count / 3);
      sizes[id + ':' + d.id] = st.rects;
      for (const r of st.rects) for (let z = r.z0; z <= r.z1 + 1e-9; z += Math.min(0.05, r.z1 - r.z0)) if (!paired.some(o => z >= o.z0 - 1e-6 && z <= o.z1 + 1e-6 && r.y0 >= o.y0 - 1e-6 && r.y1 <= o.y1 + 1e-6)) inside = false; // (a band over zones that touch: covered all along)
      const L = st.pieces.filter(p => p.side === 'L'), R = st.pieces.filter(p => p.side === 'R');
      if (!L.some(p => p.quads) || !R.some(p => p.quads)) bothSides = false;
      if (L.length !== R.length || L.some((p, i) => JSON.stringify(p.rect) !== JSON.stringify(R[i].rect))) mirrored = false;
      // proud of the paint: each shown vertex against a paint ray at its (y, z)
      const view = FD.flankView(m), v = new THREE.Vector3();
      for (let k = 0; k < P.count; k += 3) {
        if (A.getW(k) < 0.5) continue;
        v.fromBufferAttribute(P, k).applyMatrix4(T);
        const s = Math.sign(v.x), hit = FD.flankHit(view, s, v.y, v.z, true);
        if (!hit.point) continue;
        const out = (v.x - hit.point.x) * s * 1000;
        proud[0] = Math.min(proud[0], out); proud[1] = Math.max(proud[1], out);
      }
    }
    globalThis.location = { search: '' };
    if (decals(makeShowCar(c)).length) worst = 'dressed with no choice';
    check(meshes === DC.DESIGNS.length && !worst, id + ': every design builds ONE mesh, one draw call (' + meshes + '/' + DC.DESIGNS.length + (worst ? '; ' + worst : '') + ')');
    check(bothSides && mirrored, id + ': a piece on EACH flank, the same rectangles on both');
    check(inside, id + ': every piece inside a zone both flanks share');
    check(proud[0] >= 1.5 && proud[1] <= 8.5, id + ': every shown vertex just proud of the paint under it (' + proud[0].toFixed(1) + ' to ' + proud[1].toFixed(1) + ' mm)');
    check(tris > 0 && tris <= BUDGET, id + ': at most ' + tris + ' triangles a design (budget ' + BUDGET + ')');
    table.push(id);
  }
  // scaled: the bus's stripe taller than the Post Van's, its badge bigger than the Wedge's and the Post Van's
  const hOf = (k) => { const r = sizes[k]?.[0]; return r ? r.y1 - r.y0 : 0; };
  check(hOf('bus:stripes') > hOf('postvan:stripes') * 1.5 && hOf('bus:star') > hOf('postvan:star') && hOf('bus:star') > hOf('wedge:star'), 'scaled with the vehicle: stripes ' + hOf('postvan:stripes').toFixed(2) + ' m tall on the Post Van, ' + hOf('bus:stripes').toFixed(2) + ' on the bus; star ' + hOf('wedge:star').toFixed(2) + ' (Wedge) / ' + hOf('postvan:star').toFixed(2) + ' (Post Van) / ' + hOf('bus:star').toFixed(2) + ' (bus)');
  for (const id of SIX) console.log('        ' + id.padEnd(8) + ['stripes', 'tiger', 'flames', 'star'].map(dd => dd + ' ' + (sizes[id + ':' + dd] || []).map(r => r.zone + ' ' + (r.z1 - r.z0).toFixed(2) + 'x' + (r.y1 - r.y0).toFixed(2)).join('+')).join(' | '));
  // the geometry kept: a second dressing casts no rays
  {
    globalThis.location = { search: '?decal=stripes' };
    const a = DC.decalPlan(makeShowCar(car('postvan'))), b = DC.decalPlan(makeShowCar(car('postvan')));
    check(!!a.stats && a.stats === b.stats, 'a second dressing of a car + design reuses the wrapped geometry (no rays cast: ' + a.stats.rays + ' the first time, ' + a.stats.ms.toFixed(0) + ' ms)');
    globalThis.location = { search: '' };
  }

  // ---- 2. the store ----
  Store.reloadStore();
  localStorage.setItem(Store.KEY, JSON.stringify({ v: 1, default: { wheels: { design: 'red' } }, cars: { sport: { plate: { design: 'yellow' } } } })); // (a store written before the decal)
  Store.reloadStore();
  check(DC.decalChoice(null).id === 'none' && DC.decalChoice('postvan').id === 'none' && Store.get('postvan', 'decal').colour === 'match', 'a store from before the decal: no decal, Match car, nothing to migrate');
  const keyBefore = loadoutKey(car('postvan')), keyWedge = loadoutKey(car('wedge'));
  check(!keyBefore.includes('|d='), 'no decal worn: the loadout key has no |d= part (' + keyBefore + ')');
  DC.setDecal('chevrons', 'postvan'); DC.setDecalColour('blue', 'postvan');
  check(DC.decalChoice('postvan').id === 'chevrons' && DC.decalChoice('postvan').colour === '2563d6' && DC.decalChoice('wedge').id === 'none' && DC.decalChoice(null).id === 'none', "a car's own decal (chevrons, blue) over the default (none); other cars keep the default");
  check(loadoutKey(car('postvan')) === keyBefore + '|d=chevrons.2563d6', 'the Post Van\'s key gains |d=chevrons.2563d6 (' + loadoutKey(car('postvan')) + ')');
  check(loadoutKey(car('wedge')) === keyWedge, '...and the Wedge\'s key is unchanged');
  DC.setDecal('flames', 'postvan');
  check(loadoutKey(car('postvan')).endsWith('|d=flames'), "a 'fixed' design's key has no colour (" + loadoutKey(car('postvan')) + ')');
  DC.setDecal('star', null);
  check(DC.decalChoice('wedge').id === 'star' && DC.decalChoice('postvan').id === 'flames' && !loadoutKey(car('commuter')).includes('|d='), 'the default (star) on every car without its own; a car with no zone row has no |d= in its key');
  Store.resetCar('postvan');
  check(DC.decalChoice('postvan').id === 'star' && !Store.hasOwn('postvan', 'decal'), 'Reset car: the Post Van follows the default again');
  DC.resetDecal(null);
  check(DC.decalChoice('postvan').id === 'none', 'Reset (All cars): none');
  check(!DC.setDecal('no-such', 'postvan') && !DC.setDecalColour('purple', 'postvan') && DC.setDecalColour('#FFAA00', 'postvan') && Store.get('postvan', 'decal').colour === 'ffaa00', 'an unknown design or colour is refused; a hex is kept');
  Store.reloadStore();
  localStorage.setItem(Store.KEY, JSON.stringify({ v: 1, default: { decal: { id: '<b>', colour: 12 } }, cars: { wedge: { decal: { id: 'hex', colour: 'nope!' } } } }));
  Store.reloadStore();
  check(DC.decalChoice(null).id === 'none' && DC.decalChoice('wedge').id === 'hex' && DC.decalChoice('wedge').colour === 'match', 'garbage in the store: dropped field by field (a bad id: none, a bad colour: match)');
  Store.reloadStore(); localStorage.removeItem(Store.KEY); Store.reloadStore();
  globalThis.location = { search: '?decal=star,red' };
  check(DC.decalChoice('wedge').id === 'star' && DC.decalChoice('wedge').colour === 'd8262b' && DC.shownDecal(null).id === 'star', '?decal=star,red dresses every car for the visit');
  globalThis.location = { search: '?decal=bolt' };
  check(DC.decalChoice('bus').id === 'bolt' && DC.decalChoice('bus').colour === 'match', '?decal=bolt: Match car');
  globalThis.location = { search: '' };

  // ---- 3. the tab ----
  const zoneCars = all.filter(c => DC.decalSupported(c)).map(c => c.id).sort();
  check(JSON.stringify(zoneCars) === JSON.stringify([...SIX].sort()), 'the cars that can wear one: exactly ' + zoneCars.join(', '));
  const wrong = all.filter(c => shownSlots(c).some(s => s.id === 'decal') !== DC.decalSupported(c));
  check(!wrong.length, 'the Decal tab shows on exactly those cars, of ' + all.length + (wrong.length ? ' (wrong: ' + wrong.slice(0, 5).map(c => c.id).join(', ') + ')' : ''));
  const legend = all.find(c => c.legend);
  check(!shownSlots(legend).some(s => s.id === 'decal') && !DC.decalSupported({ ...car('postvan'), legend: true }) && !DC.decalSupported({ ...car('postvan'), tank: true }) && !DC.decalSupported({ ...car('postvan'), ufo: true }), 'never on a Legendary car (' + legend.id + ', or a Legendary Post Van), the Tank or the Saucer');

  // ---- 4. dents ----
  {
    globalThis.location = { search: '?decal=stripes' };
    for (const id of ['postvan', 'bus', 'bug']) {
      const m = makeShowCar(car(id)), mesh = decals(m)[0];
      if (!mesh) { check(false, id + ': dressed for the dents'); continue; }
      const clean = mesh.geometry;
      dentModel(m, m.userData.body, 1);
      const bent = mesh.geometry, part = m.userData.dentFrame?.parts.find(p => p.mesh === mesh);
      // how far its vertices moved, against where they were (the bent copy is cut finer: compare its own clean-fine copy)
      const fine = mesh.userData.dentFine || clean, P0 = fine.attributes.position, P1 = bent.attributes.position;
      let most = 0;
      for (let k = 0; k < Math.min(P0.count, P1.count); k++) most = Math.max(most, Math.hypot(P1.getX(k) - P0.getX(k), P1.getY(k) - P0.getY(k), P1.getZ(k) - P0.getZ(k)));
      check(!!part && !part.paint && !part.rigid && bent !== clean && most > 0.01, id + ': at 100% damage the decal is crumpled with the panels (a part bent vertex by vertex, ' + P1.count / 3 + ' triangles, moved up to ' + (most * 1000).toFixed(0) + ' mm)');
      dentModel(m, m.userData.body, 0);
      check(mesh.geometry === clean, id + ': ...clean again at full health');
    }
    globalThis.location = { search: '' };
  }

  // ---- 5. Legendary, blackout, ghost ----
  {
    globalThis.location = { search: '?decal=star' };
    const L = makeShowCar({ ...car('postvan'), legend: 'postvan', id: 'l-postvan-test' });
    check(!decals(L).length && DC.decalPlan(L).status === 'unsupported', 'a Legendary car is never dressed');
    const m = makeShowCar(car('wedge')), mesh = decals(m)[0];
    check(!!mesh && silhouetteFor(mesh.material).colorWrite === false, 'blacked out: the decal is not drawn (render/silhouette.js hide)');
    m.userData.livery?.(false); const mat = mesh.material; for (let i = 0; i < 50; i++) m.userData.livery(false);
    check(mesh.material === mat, 'the livery hook each frame: nothing done while the side is the same');
    m.userData.livery(true);
    check(mesh.material !== mat && DC.decalPlan(m).evil === true, "Evil: 'Match car' made again in a tone of the Evil paint");
    const items = readFileSync(ROOT + '/src/delivery/render/items.js', 'utf8');
    check(/mesh\.userData\.flankDecal \? GHOST_HIDE : GHOST_MAT/.test(items) && /GHOST_HIDE = new THREE\.MeshBasicMaterial\(\{ visible: false \}\)/.test(items), 'the Ghost: render/items.js ghostify hides a flank decal (an unseen material), not the pale one');
    globalThis.location = { search: '' };
  }

  // ---- 6. render-only ----
  {
    const { logicFiles } = await import(ROOT + '/vite.config.js');
    const files = logicFiles();
    check(!files.some(f => /decal|cosmetic|loadout/.test(f)), 'no logic file is a decal, cosmetic or loadout module (' + files.length + ' logic files)');
    const named = files.filter(f => /decalcosmetic|decaldesigns|flankdecal/.test(readFileSync(ROOT + '/src/delivery/' + f, 'utf8')));
    check(!named.length, '...and none names one' + (named.length ? ' (' + named.join(', ') + ')' : ''));
    const hash = (read) => { const h = createHash('sha256'); for (const f of files) h.update(f + '\0' + read(f)); return h.digest('hex').slice(0, 10); };
    const here = hash(f => readFileSync(ROOT + '/src/delivery/' + f));
    let base = null, baseHash = null;
    try {
      base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      baseHash = hash(f => execSync('git show ' + base + ':src/delivery/' + f, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }));
    } catch { /* (no git, or no origin/main: the file test above stands) */ }
    check(baseHash === null || here === baseHash, "the replay 'logic' fingerprint: " + here + (baseHash ? ' (main at the merge base ' + base.slice(0, 7) + ': ' + baseHash + ')' : ' (no git to compare with)'));
  }
} catch (e) { failures++; console.log('  FAIL  ' + (e.stack || e)); }
await close();
console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
process.exit(failures ? 1 : 0);
