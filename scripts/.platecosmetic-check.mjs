// A check of the EQUIPPABLE NUMBER PLATE (render/platecosmetic.js, platedesigns.js, platetext.js, plateanchors.js; CHECKLIST 286). Every car that can be
// shown is built as the showroom builds it (render/showcar.js makeShowCar) and dressed under a design:
//   - every car with an anchor gets a plate on exactly the ends its plan says, at the anchor, as a child of the model, 14 triangles an end
//     (a 12-triangle edge slab and a 2-triangle face), and its own plate on those ends hidden (only those)
//   - a Legendary car is untouched (nothing added, its gold plates stay); a car with no anchor ("none" list or unplaced) is untouched
//   - Stock removes every plate, shows the car's own again, and the triangle count and children are as built
//   - the text filter takes a table of strings (clean text, leetspeak and spacing evasions, innocent words that hold a short bad one)
//   - ownership: a locked design cannot be equipped, 'abs' unlocks it, an unowned saved design wears Stock, an unknown id is Stock
//   - storage: kept under delivery.platedesign / delivery.platetext, ignored with Progress.noSave, a failing storage does not break it
//   - texture cache: one texture per (design, text) shared by every car and both ends; at most two kept; the memory
//   - dents: the plate is measured with the car, and at each stage of damage how much of it is still seen from behind / in front (burial list)
//   - the families (CHECKLIST 431) and the SHAPED designs: built as their own outline, inside the anchor's box, UVs on the canvas
//   - the ghost's stand-in and a blackout silhouette; nothing written onto a car's entry; no rules module imports the cosmetic
//   node scripts/.platecosmetic-check.mjs            (add car ids to see only those; --nodents skips the damage part; --design=<id> dents that design)
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';

const only = process.argv.slice(2).filter(a => !a.startsWith('--')), noDents = process.argv.includes('--nodents');
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const plain = (car) => JSON.stringify(car, (k, v) => (typeof v === 'function' ? 'fn' : v));
try {
  const C = await load('cars.js');
  const { makeShowCar } = await load('render/showcar.js');
  const { IDEA_CARS } = await load('ideas.js');
  const P = await load('render/platecosmetic.js');
  const T = await load('render/platetext.js');
  const A = await load('render/plateanchors.js');
  const D = await load('render/platedesigns.js');
  const { COSMETICS, grantCosmetics, clearCosmetics, ownsCosmetic, cosmeticKeys } = await load('render/cosmetics.js');
  const { Progress } = await load('progress.js');
  const { dentModel } = await load('render/dents.js');
  const { SILHOUETTE } = await load('render/silhouette.js');
  const { unlockEverything } = await load('unlockall.js');

  // ---- the registry ----
  const plates = COSMETICS.filter(c => c.slot === 'plate');
  const free = plates.filter(c => c.free);
  check(plates.length === D.PLATE_DESIGNS.length && plates.length >= 7, 'the registry holds every plate design as plate:<id> (' + plates.length + ': ' + free.length + ' free incl. Stock, ' + (plates.length - free.length) + ' locked)');
  check(free.some(c => c.id === 'stock') && free.length >= 3 && free.length <= 5 && plates.every(c => 'price' in c), 'Stock and 2-3 designs are free; every entry carries a (placeholder) price');
  check(D.PLATE_DESIGNS.filter(d => d.id !== 'stock').every(d => d.bg && d.text && d.border && d.edge), 'every design is data: background, text colour, border, edge');
  clearCosmetics();

  // ---- the cars ----
  const cars = [];
  const add = (group, car) => { if (car && !cars.some(c => c.car.id === car.id)) cars.push({ group, car }); };
  for (const car of C.CARS) add('garage', car);
  for (const car of C.CARS) add('super', C.superOf(car));
  for (const car of C.FILLER_CARS) add('filler', car);
  for (const car of C.BESPOKE_CARS) add('bespoke', car);
  for (const car of C.EVENT_CARS) add('event', car);
  for (const car of C.EARNED_CARS) add('earned', car);
  for (const car of Object.values(C.SECRET_CARS)) add('secret', car);
  for (const car of Object.values(C.LEVEL_CARS)) add('level', car);
  add('level', C.AMPHIBIOUS_TANK);
  for (const car of IDEA_CARS) add('idea', car);
  const list = cars.filter(c => !only.length || only.includes(c.car.id));
  const entryBefore = new Map(list.map(c => [c.car, plain(c.car)]));
  const allTris = (model) => { let n = 0; model.traverse((m) => { if (m.isMesh && m.geometry) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return n; };
  check(P.plateDesign() === 'stock' && P.shownDesign() === 'stock', 'a fresh visit: Stock');

  const built = [];
  for (const { group, car } of list) {
    let model = null;
    try { model = makeShowCar(car); } catch (e) { console.log('  (no model: ' + car.id + ': ' + e.message + ')'); }
    if (model) built.push({ group, car, model, base: allTris(model), children: model.children.length, own: P.existingPlates(model).map(e => e.face + e.mesh.visible).join() });
  }
  console.log(built.length + ' vehicles built');
  check(built.every(b => P.platePlan(b.model) && P.platePlan(b.model).worn.length === 0 && b.model.children.length === b.children), 'Stock: nothing added to any car');

  // ---- equip a design ----
  Progress.noSave = false;
  clearCosmetics();
  check(P.setPlateDesign('classic') === true, 'a free design equips');
  P.setPlateText('PLATE 1');
  const stats = { ok: 0, both: 0, rear: 0, front: 0, none: 0, unplaced: 0, legend: 0, hidden: 0, triPerEnd: new Set() };
  const bad = [];
  for (const b of built) {
    const plan = P.platePlan(b.model), a = A.plateAnchorsFor(b.car), worn = plan.worn;
    if (b.car.legend) { stats.legend++; if (worn.length || allTris(b.model) !== b.base || P.existingPlates(b.model).map(e => e.face + e.mesh.visible).join() !== b.own) bad.push(b.car.id + ' legendary changed'); continue; }
    if (a.status !== 'ok') { stats[a.status]++; if (worn.length || allTris(b.model) !== b.base || P.existingPlates(b.model).map(e => e.face + e.mesh.visible).join() !== b.own) bad.push(b.car.id + ' (' + a.status + ') changed'); continue; }
    stats.ok++; stats[a.ends.length === 2 ? 'both' : a.ends[0]]++;
    if (worn.join() !== a.ends.join()) bad.push(b.car.id + ' ends ' + worn + ' vs ' + a.ends);
    const added = allTris(b.model) - b.base;
    stats.triPerEnd.add(added / worn.length);
    for (const end of a.ends) {
      const g = plan.groups[end];
      if (!g || (g.parent !== b.model && g.parent !== b.model.userData.body?.parent)) bad.push(b.car.id + ' ' + end + ' not a child of the model');
      else if (Math.abs(g.position.y - a[end].at[1]) > 1e-6 || Math.abs(g.position.z - a[end].at[2]) > 1e-6 || g.position.x !== 0) bad.push(b.car.id + ' ' + end + ' misplaced');
      const mats = g.children.map(m => m.material);
      if (!mats[1].map || mats[1].map.image?.width !== 256) bad.push(b.car.id + ' ' + end + ' face has no 256 texture');
    }
    for (const e of P.existingPlates(b.model)) { if (e.mesh.visible === a.ends.includes(e.face)) bad.push(b.car.id + ' own ' + e.face + ' plate visibility'); else if (!e.mesh.visible) stats.hidden++; }
  }
  check(!bad.length, 'every anchored car wears the plate on exactly its ends, at the anchor, as a child of the model (or of its body group); its own plates hidden on those ends only; Legendary and no-anchor cars unchanged' + (bad.length ? ': ' + bad.slice(0, 8).join('; ') : ''));
  console.log('        dressed ' + stats.ok + ' (both ' + stats.both + ', rear only ' + stats.rear + ', front only ' + stats.front + '), none ' + stats.none + ', unplaced ' + stats.unplaced + ', Legendary ' + stats.legend + '; own plates hidden ' + stats.hidden + '; triangles added per end: ' + [...stats.triPerEnd].join(','));
  check(stats.triPerEnd.size === 1 && [...stats.triPerEnd][0] === 14, 'a plate costs 14 triangles an end (12 edge + 2 face)');
  const noneCars = built.filter(b => A.plateAnchorsFor(b.car).status === 'none').map(b => b.car.id);
  check(['ufo', 'f1', 'jetboat', 'hovercraft', 'monowheel'].every(id => !built.some(b => b.car.id === id) || noneCars.includes(id)) || only.length > 0, 'the craft and open-wheelers are on the none list (' + noneCars.join(', ') + ')');
  for (const id of ['tank', 'apc', 'halftrack', 'amphibioustank']) { const b = built.find(x => x.car.id === id); if (b) check(P.platePlan(b.model).status === 'ok', id + ' (military) may wear a plate'); }

  // ---- texture cache ----
  const cs = P.plateCacheStats();
  check(cs.textures <= 2 && cs.bytes <= 2 * 65536, 'one 64 KB texture per (design, text) shared by every car and both ends, at most two kept: ' + cs.textures + ' kept, ' + cs.bytes / 1024 + ' KB (' + Math.round(cs.bytesWithMips / 1024) + ' KB with mipmaps)');
  const mats = new Set(); for (const b of built) for (const g of Object.values(P.platePlan(b.model).groups)) if (g) mats.add(g.children[1].material);
  check(mats.size === 1, 'all plate faces share one material (' + mats.size + ')');
  for (const t of ['A', 'AB', 'ABC', 'ABCD', 'ABCDE']) P.setPlateText(t);
  check(P.plateCacheStats().textures <= 2, 'typing five different texts keeps at most two textures (' + P.plateCacheStats().textures + ')');
  P.setPlateText('PLATE 1');

  // ---- designs: each draws and equips; the ghost and blackout ----
  for (const d of D.PLATE_DESIGNS.filter(d => d.id !== 'stock')) { grantCosmetics(['plate:' + d.id]); check(P.setPlateDesign(d.id) && P.shownDesign() === d.id && P.plateCacheStats().textures <= 2, 'design ' + d.id + ' equips'); }
  // ---- the families and the shaped designs (CHECKLIST 431): every design in a family; a shaped one is a shaped mesh inside the anchor's box ----
  const fams = new Set(D.PLATE_FAMILIES.map(f => f.id));
  check(D.PLATE_DESIGNS.every(d => fams.has(d.family)) && D.PLATE_FAMILIES.every(f => D.PLATE_DESIGNS.some(d => d.family === f.id)) && D.PLATE_DESIGNS.length >= 37, 'every design is in a family (' + D.PLATE_FAMILIES.map(f => f.label + ' ' + D.PLATE_DESIGNS.filter(d => d.family === f.id).length).join(', ') + '; ' + D.PLATE_DESIGNS.length + ' with Stock)');
  const shapedBad = [], shapedTris = new Set();
  for (const d of D.PLATE_DESIGNS.filter(x => x.pieces)) {
    P.setPlateDesign(d.id);
    for (const b of built) {
      const plan = P.platePlan(b.model), a = A.plateAnchorsFor(b.car);
      if (b.car.legend || a.status !== 'ok') continue;
      if (plan.worn.join() !== a.ends.join()) shapedBad.push(d.id + ' ' + b.car.id + ' ends');
      for (const end of a.ends) {
        const g = plan.groups[end], w = a[end].size[0], h = w / 4;
        if (!g || g.userData.plateShape !== d.id) { shapedBad.push(d.id + ' ' + b.car.id + ' ' + end + ' not built'); continue; }
        const fb = new THREE.Box3().setFromBufferAttribute(g.children[1].geometry.attributes.position), sb = new THREE.Box3().setFromBufferAttribute(g.children[0].geometry.attributes.position);
        if (fb.max.x - fb.min.x > w + 1e-6 || fb.max.y - fb.min.y > h + 1e-6 || sb.max.x - sb.min.x > w + P.MARGIN + 1e-6 || sb.max.y - sb.min.y > h + P.MARGIN + 1e-6) shapedBad.push(d.id + ' ' + b.car.id + ' ' + end + ' outside the anchor box');
        const uv = g.children[1].geometry.attributes.uv; for (let i = 0; i < uv.count; i++) if (uv.getX(i) < -1e-6 || uv.getX(i) > 1 + 1e-6 || uv.getY(i) < -1e-6 || uv.getY(i) > 1 + 1e-6) { shapedBad.push(d.id + ' uv'); break; }
        shapedTris.add(d.id + ':' + (allTris(g)));
      }
    }
  }
  check(!shapedBad.length, 'each shaped design (' + D.PLATE_DESIGNS.filter(x => x.pieces).map(x => x.id).join(', ') + ') is built as its own outline on every anchored end, inside the anchor\'s 4:1 box (the edge within the margin), its UVs on the canvas' + (shapedBad.length ? ': ' + shapedBad.slice(0, 6).join('; ') : ''));
  console.log('        triangles an end, shaped: ' + [...new Set([...shapedTris])].sort().join(' '));
  P.setPlateDesign('classic');
  check(built.filter(b => !b.car.legend && A.plateAnchorsFor(b.car).status === 'ok').every(b => Object.values(P.platePlan(b.model).groups).every(g => !g || (g.userData.plateShape === 'rect' && allTris(g) === 14))), 'back to a plain design: the plain 14-triangle plate again');
  const probe = built.find(b => b.car.id === 'pickup') || built.find(b => A.plateAnchorsFor(b.car).status === 'ok');
  const face = P.platePlan(probe.model).groups[P.platePlan(probe.model).worn[0]].children[1];
  const own = face.material; face.userData.solidMat = own; face.material = { ghost: true };
  P.setPlateText('GHOST 1');
  check(face.userData.solidMat !== own && face.userData.solidMat.map && face.material.ghost === true, 'the ghost: its stand-in stays, the plate under it changes');
  face.userData.solidMat = null; face.material = face.userData.solidMat || P.plateTexture(P.shownDesign(), P.plateText()).material;
  // a blacked-out model gets black plates
  const dark = makeShowCar(probe.car); dark.userData.body.material = SILHOUETTE;
  const fresh = makeShowCar(probe.car); void fresh;
  dark.traverse((m) => { if (m.isMesh) m.material = SILHOUETTE; });
  P.setPlateText('DARK 1');
  check(P.platePlan(dark).groups.rear?.children.every(m => m.material === SILHOUETTE) ?? P.platePlan(dark).groups.front?.children.every(m => m.material === SILHOUETTE), 'a blacked-out model\'s plate is the flat silhouette');
  P.setPlateDesign('dice');
  check(['rear', 'front'].map(e => P.platePlan(dark).groups[e]).filter(Boolean).every(g => g.userData.plateShape === 'dice' && g.children.every(m => m.material === SILHOUETTE)), 'a blacked-out model\'s SHAPED plate is the flat silhouette, in its own outline');
  P.setPlateText('PLATE 1'); P.setPlateDesign('classic');

  // ---- Stock restores ----
  P.setPlateDesign('stock');
  const back = built.filter(b => P.platePlan(b.model).worn.length || b.model.children.length !== b.children || allTris(b.model) !== b.base || P.existingPlates(b.model).map(e => e.face + e.mesh.visible).join() !== b.own);
  check(!back.length, 'Stock: every plate off, the car\'s own plates shown, children and triangles as built' + (back.length ? ': ' + back.slice(0, 5).map(b => b.car.id) : ''));

  // ---- the text filter ----
  const accept = ['DELIVERY', 'PLATE 1', 'A-1 B2', 'CLASS', 'WANKEL', 'GRAPE', 'RACCOON', 'NIGERIA', 'PAKISTAN', 'TULSA', 'HELLO', 'L1V3', 'MY CAR', 'ZOOM 42', 'ASSET', 'TITAN', 'PASSAT', 'COCKPIT'.slice(0, 5), '1234567', 'R-2 D-2'];
  const reject = ['FUCK', 'F U C K', 'f-u-c-k', 'SH1T', '5H1T', 'SHIT-HEAD', 'FUUUCK', 'FVCK', 'C0CK', 'D1CK', 'ASS', '4SS', 'A55', 'KCUF', 'NAZI', 'N4Z1', '1488', '14-88', 'NIGGER', 'N1GG3R', 'CUNT', 'B1TCH', 'WH0RE', 'RAPIST', 'KILL YOU', 'K1LL Y0U', 'F@GGOT', 'SL UT', '$HIT'];
  const wrongA = accept.filter(t => !T.checkPlateText(t).ok), wrongR = reject.filter(t => T.checkPlateText(t).ok);
  check(!wrongA.length, 'the filter accepts ' + accept.length + ' innocent strings' + (wrongA.length ? ' (WRONGLY refused: ' + wrongA + ')' : ''));
  check(!wrongR.length, 'the filter refuses ' + reject.length + ' abusive strings incl. leetspeak, spacing, repeats, reversal' + (wrongR.length ? ' (WRONGLY accepted: ' + wrongR + ')' : ''));
  const r = T.checkPlateText('fuck');
  check(r.text === T.DEFAULT_TEXT && r.reason === 'blocked' && T.checkPlateText('   ').reason === 'empty' && T.checkPlateText('  ').text === T.DEFAULT_TEXT, 'a refused or empty text falls back to the default text with a reason');
  check(T.sanitizePlateText('abc-12 x!@#é') === 'ABC-12 X' && T.sanitizePlateText('ABCDEFGHIJKL') === 'ABCDEFGH' && T.MAX_LEN === 8, 'text is cut to A-Z 0-9 space dash, upper case, at most 8');
  const bl = await load('render/plateblocklist.js');
  console.log('        blocklist: ' + bl.SUBSTRING.length + ' substring words, ' + bl.WHOLE.length + ' whole-word terms, ' + bl.DIGITS.length + ' number string(s)');

  // ---- ownership ----
  clearCosmetics();
  check(!ownsCosmetic('plate', 'blackgold') && P.setPlateDesign('blackgold') === false && P.plateDesign() !== 'blackgold', 'a locked design cannot be equipped');
  check(P.setPlateDesign('nope') === false && D.designById('nope').id === 'stock', 'an unknown design id is Stock');
  Progress.reset?.();
  unlockEverything('abs');
  check(cosmeticKeys().filter(k => k.startsWith('plate:')).every(k => ownsCosmetic('plate', k.slice(6))) && P.setPlateDesign('blackgold') === true, "'Absolutely everything' unlocks every plate design");
  clearCosmetics();
  check(P.plateDesign() === 'blackgold' && P.shownDesign() === 'stock', 'a saved design that is no longer owned wears Stock (the choice is kept)');
  P.resetPlate();
  check(P.plateDesign() === 'stock' && P.plateText() === T.DEFAULT_TEXT, 'Reset to stock: Stock and the default text');

  // ---- storage ----
  const store = new Map(); const realLS = globalThis.localStorage;
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  P.setPlateDesign('classic'); P.setPlateText('Q-7 ZED');
  check(store.get('delivery.platedesign') === 'classic' && store.get('delivery.platetext') === 'Q-7 ZED', 'kept in localStorage: delivery.platedesign / delivery.platetext');
  P.setPlateText('fuck');
  check(store.get('delivery.platetext') === T.DEFAULT_TEXT, 'a refused text is stored as the default, never itself');
  store.clear(); Progress.noSave = true;
  P.setPlateDesign('yellow'); P.setPlateText('VISIT 1');
  check(store.size === 0 && P.shownDesign() === 'yellow' && P.plateText() === 'VISIT 1', 'Progress.noSave: nothing written, the visit still wears it');
  Progress.noSave = false;
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  let threw = false; try { P.setPlateDesign('classic'); P.setPlateText('NOSTORE'); P.resetPlate(); } catch { threw = true; }
  check(!threw, 'storage that throws does not break it');
  globalThis.localStorage = realLS;
  check(![...store.keys()].some(k => /cookie/i.test(k)) && !/cosmetic|plate/i.test(JSON.stringify(Progress.data)), 'nothing in the cookie or the progress save');
  P.resetPlate();

  // ---- the replay fingerprint and the entries ----
  // (the fingerprint's own list, not a text search of vite.config.js: a comment there that names plateanchors.js made the old regex fail)
  const logic = (await import(new URL('../vite.config.js', import.meta.url).href)).logicFiles();
  const walkers = ['platecosmetic', 'platedesigns', 'platetext', 'plateanchors', 'plateblocklist', 'plateanchorstable'];
  check(logic.length > 0 && !logic.some(f => walkers.some(w => f.includes(w))), 'no plate module is listed in the replay fingerprint (vite.config.js logicFiles: ' + logic.length + ' files)');
  const importers = [];
  const { readdirSync } = await import('node:fs');
  for (const f of readdirSync(ROOT + '/src/delivery').filter(f => f.endsWith('.js'))) if (/render\/plate|platecosmetic/.test(readFileSync(ROOT + '/src/delivery/' + f, 'utf8'))) importers.push(f);
  console.log('        files in src/delivery/*.js that mention a plate module: ' + importers.join(', '));
  check(list.every(c => plain(c.car) === entryBefore.get(c.car)), 'nothing is written onto a car\'s entry');

  // ---- dents: the plate follows; burial at each stage ----
  if (!noDents) {
    const dd = (process.argv.find(x => x.startsWith('--design=')) || '--design=classic').slice(9); // (--design=<id>: the damage part with another design, a shaped one say)
    clearCosmetics(); grantCosmetics(['plate:' + dd]); P.setPlateDesign(dd); P.setPlateText('DENT 42');
    const ray = new THREE.Raycaster(), buried = [], follows = [], notFollowing = [];
    const stages = [0, 0.3, 0.55, 0.75, 0.95], atRest = [];
    for (const b of built) {
      const a = A.plateAnchorsFor(b.car);
      if (a.status !== 'ok' || b.car.legend) continue;
      const m = makeShowCar(b.car); m.userData.body.material.transparent = true;
      const plan = P.platePlan(m);
      dentModel(m, m.userData.body, 0); // (clean, scheduled; measure by a real call below)
      const seen = [];
      for (const share of stages) {
        dentModel(m, m.userData.body, share);
        m.updateMatrixWorld(true);
        const meshes = []; m.traverse((n) => { if (n.isMesh && n.visible && n.geometry && !(n.material.transparent && n.material.opacity < 0.95 && n !== m.userData.body)) meshes.push(n); });
        const frac = {};
        for (const end of a.ends) {
          const g = plan.groups[end], face = g.children[1], s = end === 'rear' ? -1 : 1;
          const bb = new THREE.Box3().setFromObject(face), pts = [];
          for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.2, 0.5, 0.8]) pts.push(new THREE.Vector3(bb.min.x + (bb.max.x - bb.min.x) * fx, bb.min.y + (bb.max.y - bb.min.y) * fy, 0));
          let ok = 0;
          for (const p of pts) {
            p.z = (end === 'rear' ? bb.min.z : bb.max.z);
            const from = new THREE.Vector3(p.x, p.y, s * 12); ray.set(from, new THREE.Vector3(0, 0, -s));
            const hit = ray.intersectObjects(meshes, false)[0];
            if (hit && (hit.object === face || hit.object.parent === g)) ok++;
          }
          frac[end] = ok / pts.length;
        }
        seen.push(frac);
      }
      const rest = Math.min(...Object.values(seen[0]));
      if (rest < 0.7) atRest.push(b.car.id + ' ' + Object.entries(seen[0]).map(([e, v]) => e[0] + Math.round(v * 100)).join('/'));
      const worst = Math.min(...seen.flatMap(f => Object.values(f)));
      const clean = dentModel(m, m.userData.body, 0) ?? 0; void clean;
      if (worst < 0.6) buried.push(b.car.id + ' ' + seen.map(f => Object.entries(f).map(([e, v]) => e[0] + Math.round(v * 100)).join('/')).join(' > '));
      const fl = !!m.userData.dentFrame && m.userData.dentFrame.parts.some(p => p.mesh === plan.groups[a.ends[0]].children[1]);
      if (!fl) notFollowing.push(b.car.id);
      follows.push(fl);
    }
    check(follows.every(Boolean), 'dents.js measured the plate with the car (' + follows.length + ' cars)' + (notFollowing.length ? ', NOT: ' + notFollowing.join(', ') : ''));
    console.log('        plates under 60% visible at some stage (' + stages.join(' / ') + ' of damage), rear/front % per stage (the first is the car at rest): ' + buried.length + (buried.length ? '\n          ' + buried.join('\n          ') : ''));
    check(!atRest.length, 'at rest every plate is seen from its end (>= 70% of sample points)' + (atRest.length ? ': ' + atRest.join(', ') : ''));
    P.resetPlate();
  }
} finally {
  await close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
