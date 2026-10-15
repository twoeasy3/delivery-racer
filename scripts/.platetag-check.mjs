// A check of the NUMBER PLATE TAGS and the toggle that hides them (render/platecosmetic.js, CHECKLIST 279; the audit:
// src/delivery/AUDIT-plates-14-Oct.md and plates-audit.json). Every vehicle (garage cars, the Supers, filler, Bespoke, event, earned,
// Legendary, secret, level vehicles, all idea cars, and the traffic kinds) is built as the game builds it (render/showcar.js
// makeShowCar; the traffic kinds with MODELS[type.model]) and then:
//   - every plate the audit lists is TAGGED (userData.plate = 'front' | 'rear') on exactly the faces it lists, and no car outside
//     the list carries a tag; no plate-like mesh (a thin pale or yellow slab on the car's centre line at the front or back) is left
//     untagged (so a new plate someone adds without a tag is found)
//   - the tags changed NOTHING that is drawn: triangle counts and bounding boxes equal scripts/.platetag-baseline.json (recorded
//     before the tags went in, `--record`), a mesh count at most one more for the three models that had both plates in one mesh
//   - the toggle: with nothing equipped every plate is visible; setExistingPlatesVisible(model, false) hides every tagged mesh and
//     only those; the state (setPlatesEquipped) hides the plates of models already built and of models built after it, and
//     un-equipping shows them again; the ?plates=none switch is off here
//   - a hidden plate and: dents (the same panels move as with the plate visible, and the plate is still hidden after), the ghost
//     (its stand-in material on every part, visibility untouched), a blackout silhouette
//   node scripts/.platetag-check.mjs            the check
//   node scripts/.platetag-check.mjs --record   (re)write scripts/.platetag-baseline.json from the CURRENT code (do it only on code with no tags)
import * as THREE from 'three';
import { readFileSync, writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';

const PROP_SPLIT = { minibus: 1, pickup: 11, taxi: 1, jeepney: 2, flatbed: 1, autobahnestate: 1, trophytruck: 1 }; // (the same as SPLIT in .proptag-check.mjs)
const record = process.argv.includes('--record');
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const BASELINE = ROOT + '/scripts/.platetag-baseline.json';
try {
  const { makeShowCar } = await load('render/showcar.js');
  const C = await load('cars.js');
  const { CONFIG } = await load('config.js');
  const { MODELS } = await load('render/models.js');
  const { dentModel } = await load('render/dents.js');
  const { silhouetteFor, SILHOUETTE } = await load('render/silhouette.js');
  for (const file of ['trafficModels', 'boatModels', 'pursuitModels', 'tankModels']) await load('render/' + file + '.js').catch(() => {});
  const { makeTractorModel } = await load('render/carExtras.js');
  const { IDEA_CARS } = await load('ideas.js');
  const P = await load('render/platecosmetic.js');

  // every vehicle, as the audit built it
  const entries = [];
  const add = (group, car, build) => entries.push({ key: group + '|' + car.id, group, id: car.id, model: car.model || car.id, build });
  for (const car of C.CARS) add('garage', car, () => makeShowCar(car));
  for (const car of C.CARS) { const s = C.superOf(car); if (s) add('super', s, () => makeShowCar(s)); }
  for (const car of C.FILLER_CARS) add('filler', car, () => makeShowCar(car));
  for (const car of C.BESPOKE_CARS) add('bespoke', car, () => makeShowCar(car));
  for (const car of C.EVENT_CARS) add('event', car, () => makeShowCar(car));
  for (const car of C.EARNED_CARS) add(car.legend ? 'legendary' : 'earned', car, () => makeShowCar(car));
  for (const car of Object.values(C.SECRET_CARS)) add('secret', car, () => makeShowCar(car));
  for (const car of Object.values(C.LEVEL_CARS)) add('level', car, () => makeShowCar(car));
  add('level', C.AMPHIBIOUS_TANK, () => makeShowCar(C.AMPHIBIOUS_TANK));
  for (const car of IDEA_CARS) add('idea', car, () => makeShowCar(car));
  for (const [kind, type] of Object.entries(CONFIG.vehicles)) {
    add('traffic', { id: 'traffic:' + kind, model: type.model || kind }, () => {
      if (kind === 'tractor') return makeTractorModel();
      return type.model ? MODELS[type.model]({ ...type, id: kind, color: type.livery ?? 0xc8c8c8, evilColor: type.livery ?? 0x333333 }) : null;
    });
  }
  const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const measure = (model) => {
    model.updateMatrixWorld(true);
    let tris = 0, meshes = 0;
    model.traverseVisible((node) => {
      if (!node.isMesh || !node.geometry) return;
      const g = node.geometry, total = g.index ? g.index.count : g.attributes.position?.count || 0;
      const start = Math.max(0, g.drawRange.start), count = Math.max(0, Math.min(total - start, g.drawRange.count));
      tris += Math.floor(count / 3) * (node.isInstancedMesh ? node.count : 1);
      meshes++;
    });
    const box = new THREE.Box3().setFromObject(model, true);
    const r = (v) => Math.round(v * 1e5) / 1e5;
    return { tris, meshes, lo: box.min.toArray().map(r), hi: box.max.toArray().map(r) };
  };
  const built = new Map();
  for (const e of entries) {
    if (only.length && !only.includes(e.id)) continue;
    let model = null;
    try { model = e.build(); } catch (err) { console.log('  (no model: ' + e.id + ': ' + err.message + ')'); }
    if (!model) continue;
    model.parent?.remove(model);
    built.set(e.key, { e, model });
  }
  console.log(built.size + ' vehicles built');

  if (record) {
    const out = {};
    for (const [key, { model }] of built) out[key] = measure(model);
    writeFileSync(BASELINE, JSON.stringify(out));
    console.log('baseline written: ' + Object.keys(out).length + ' vehicles -> ' + BASELINE);
  } else {
    // ---- the tags against the audit's list ----
    const audit = JSON.parse(readFileSync(ROOT + '/src/delivery/plates-audit.json', 'utf8'));
    const faces = new Map(audit.existing_plate_models.map(m => [m.model, [...new Set(m.plates.map(p => p.face))].sort().join('+')]));
    const meshesPerFace = (model) => model === 'learner' ? 3 : 1;
    let tagged = 0, plateCars = 0;
    const wrong = [], untagged = [];
    for (const [key, { e, model }] of built) {
      const tags = P.existingPlates(model);
      const got = [...new Set(tags.map(t => t.face))].sort().join('+');
      const want = faces.get(e.model) || '';
      // (a Legendary car or a Super is its base model: the same plates; the traffic kinds the same)
      if (got !== want) wrong.push(key + ' tagged "' + got + '" expected "' + want + '"');
      for (const face of want ? want.split('+') : []) if (tags.filter(t => t.face === face).length !== meshesPerFace(e.model)) wrong.push(key + ' ' + face + ': ' + tags.filter(t => t.face === face).length + ' meshes');
      if (want) plateCars++;
      tagged += tags.length;
      // an untagged plate-like mesh: thin, plate-sized, centred, pale or plate-yellow, at an end
      const box = new THREE.Box3().setFromObject(model, true);
      model.traverse((node) => {
        if (!node.isMesh || node.isInstancedMesh || node.userData.plate || !node.geometry || node.geometry.type !== 'BoxGeometry') return;
        const m = [].concat(node.material)[0];
        if (!m?.color || m.type === 'MeshBasicMaterial' || m.map) return;
        const b = new THREE.Box3().setFromObject(node, true), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
        const hex = m.color.getHex(), r = hex >> 16 & 255, g = hex >> 8 & 255, bl = hex & 255, hi = Math.max(r, g, bl), lo = Math.min(r, g, bl);
        const pale = lo > 0.78 * 255 && hi - lo < 0.2 * 255 && hex !== 0xd8d8d8, yellow = r > 220 && g > 190 && bl < 70;
        if (!(pale || yellow) || e.model === 'learner') return;
        if (s.z <= 0.05 && s.x >= 0.2 && s.x <= 0.8 && s.y >= 0.06 && s.y <= 0.3 && s.x / s.y >= 1.8 && Math.abs(c.x) < 0.12 && c.y > 0.1 && (Math.abs(c.z - box.max.z) < 0.9 || Math.abs(c.z - box.min.z) < 0.9)) untagged.push(key + ' ' + s.x.toFixed(2) + 'x' + s.y.toFixed(2) + ' at ' + c.toArray().map(v => v.toFixed(2)).join(','));
      });
    }
    check(!wrong.length, 'every plate in the audit is tagged on exactly its faces, and no other car has a tag' + (wrong.length ? ': ' + wrong.slice(0, 6).join('; ') : ' (' + plateCars + ' of ' + built.size + ' vehicles carry plates, ' + tagged + ' tagged meshes)'));
    check(!untagged.length, 'no untagged plate-like slab is left on any vehicle' + (untagged.length ? ': ' + untagged.slice(0, 6).join('; ') : ''));
    check(!only.length ? plateCars >= 41 : true, 'the vehicles with plates number at least the audit\'s 41 (' + plateCars + ')');

    // ---- nothing that is drawn changed ----
    let base = null;
    try { base = JSON.parse(readFileSync(BASELINE, 'utf8')); } catch { /* (no baseline) */ }
    check(!!base, 'the baseline (scripts/.platetag-baseline.json, recorded before the tags) is there');
    if (base) {
      const bad = [], plus = [];
      for (const [key, { e, model }] of built) {
        const was = base[key], now = measure(model);
        if (!was) { bad.push(key + ' (not in the baseline)'); continue; }
        const split = ['minivan', 'pickup', 'moorrover'].includes(e.model);
        const same = now.tris === was.tris && now.lo.every((v, i) => Math.abs(v - was.lo[i]) < 1e-4) && now.hi.every((v, i) => Math.abs(v - was.hi[i]) < 1e-4);
        const propSplit = PROP_SPLIT[e.model || e.id] || 0; // (the prop tags of CHECKLIST 302 split meshes too: the same table as .proptag-check.mjs)
        const meshOk = now.meshes === was.meshes || (split && now.meshes === was.meshes + 1) || (propSplit && now.meshes >= was.meshes && now.meshes <= was.meshes + propSplit + (split ? 1 : 0));
        if (now.meshes !== was.meshes) plus.push(key);
        if (!same || !meshOk) bad.push(key + ' tris ' + was.tris + '->' + now.tris + ' meshes ' + was.meshes + '->' + now.meshes);
      }
      check(!bad.length, 'triangle counts and bounding boxes equal the baseline on every vehicle' + (bad.length ? ': ' + bad.slice(0, 6).join('; ') : ' (' + built.size + ' compared)'));
      console.log('        (one mesh more, a plate that shared a mesh with the other end: ' + [...new Set(plus.map(k => k.split('|')[1]))].join(', ') + ')');
    }

    // ---- the toggle ----
    check(P.platesEquipped() === false, 'nothing equipped today: platesEquipped() is false');
    let allShown = true, hidesOnly = true, restored = true;
    const visSig = (model) => { const out = []; model.traverse(n => { if (n.isMesh) out.push(n.visible ? 1 : 0); }); return out.join(''); };
    for (const [, { model }] of built) {
      const was = visSig(model);
      const tags = P.existingPlates(model);
      if (tags.some(t => !t.mesh.visible)) allShown = false;
      const n = P.setExistingPlatesVisible(model, false);
      if (n !== tags.length || tags.some(t => t.mesh.visible)) hidesOnly = false;
      let others = true;
      const isTag = new Set(tags.map(t => t.mesh));
      let i = 0;
      model.traverse(node => { if (node.isMesh) { if (!isTag.has(node) && (node.visible ? 1 : 0) !== +was[i]) others = false; i++; } });
      if (!others) hidesOnly = false;
      P.setExistingPlatesVisible(model, true);
      if (visSig(model) !== was) restored = false;
    }
    check(allShown, 'with nothing equipped every tagged plate of every vehicle is visible');
    check(hidesOnly, 'setExistingPlatesVisible(model, false) hides every tagged plate, and nothing else');
    check(restored, 'setExistingPlatesVisible(model, true) puts every mesh back as it was');
    // the state: models built before it, and after
    const sample = [...built.values()].filter(b => P.existingPlates(b.model).length).slice(0, 12);
    P.dressPlates(sample[0].model); // (a dressed model is followed: showcar.js does this for every car it builds)
    for (const s of sample) P.dressPlates(s.model);
    let heard = null;
    const off = P.onPlatesEquipped(v => { heard = v; });
    P.setPlatesEquipped(true);
    check(P.platesEquipped() === true && heard === true, 'setPlatesEquipped(true): the state and the listener');
    check(sample.every(s => P.existingPlates(s.model).every(t => !t.mesh.visible)), 'equipped: every plate of the models already built is hidden (' + sample.length + ' sampled)');
    const fresh = makeShowCar(C.CARS.find(c => c.id === 'minivan'));
    fresh.parent?.remove(fresh);
    check(P.existingPlates(fresh).length === 2 && P.existingPlates(fresh).every(t => !t.mesh.visible), 'equipped: a car built afterwards (makeShowCar) has its plates hidden from the start');
    const learner = MODELS.learner({ ...CONFIG.vehicles.learner, color: 0xf4f4f4 });
    check(P.existingPlates(learner).every(t => t.mesh.visible), 'equipped: traffic (built by the traffic code, never dressed) keeps its plates');
    // dents, ghost and a blackout, with the plate hidden
    const sig = (model) => { const out = []; model.traverse(n => { if (n.isMesh && n.geometry.attributes.position && !n.userData.plate) { const p = n.geometry.attributes.position; let h = 0; for (let i = 0; i < p.count; i++) h += p.getX(i) * 1.3 + p.getY(i) * 1.7 + p.getZ(i) * 1.9; out.push(Math.round(h * 1e4)); } }); return out.join(','); };
    const dentCars = ['minivan', 'hotrod', 'pickup', 'junker', 'hearse'];
    for (const id of dentCars) {
      const car = C.CARS.find(c => c.id === id);
      P.setPlatesEquipped(false);
      const a = makeShowCar(car); a.parent?.remove(a); a.updateMatrixWorld(true); dentModel(a, a.userData.body, 1); const sa = sig(a);
      P.setPlatesEquipped(true);
      const b = makeShowCar(car); b.parent?.remove(b); b.updateMatrixWorld(true);
      dentModel(b, b.userData.body, 1); const sb = sig(b);
      const hidden = P.existingPlates(b).every(t => t.mesh.visible === false);
      dentModel(b, b.userData.body, 0);
      check(sa === sb && hidden && P.existingPlates(b).every(t => t.mesh.visible === false), id + ': dents move the same panels with the plates hidden as with them shown, and they stay hidden through dent and repair');
      // the plate's own geometry is dented too (it is still measured and shoved): its geometry, hidden or not, follows the dents
    }
    const ghostCar = makeShowCar(C.CARS.find(c => c.id === 'pickup')); ghostCar.parent?.remove(ghostCar);
    const GHOST = new THREE.MeshLambertMaterial({ color: 0xdfe9ff, transparent: true, opacity: 0.45 });
    ghostCar.traverse((mesh) => { if (mesh.isMesh && !mesh.userData.solidMat) { mesh.userData.solidMat = mesh.material; mesh.material = GHOST; } }); // (render/items.js ghostify on)
    check(P.existingPlates(ghostCar).every(t => !t.mesh.visible && t.mesh.material === GHOST && t.mesh.userData.solidMat), 'a ghost: the stand-in is on the hidden plates and they stay hidden');
    ghostCar.traverse((mesh) => { if (mesh.isMesh && mesh.userData.solidMat) { mesh.material = mesh.userData.solidMat; mesh.userData.solidMat = null; } }); // (ghostify off)
    check(P.existingPlates(ghostCar).every(t => !t.mesh.visible && t.mesh.material !== GHOST), 'after the ghost: their own paint is back and they are still hidden');
    const sil = silhouetteFor(P.existingPlates(ghostCar)[0].mesh.material);
    check(sil === SILHOUETTE, 'a blackout: a plate\'s material becomes the flat silhouette like any other part');
    P.setPlatesEquipped(false);
    check(P.existingPlates(ghostCar).every(t => t.mesh.visible) && P.existingPlates(fresh).every(t => t.mesh.visible), 'Stock / unequip: every dressed model\'s plates are shown again');
    off();
    // the module is render-only: no logic file imports it
    const { logicFiles } = await import(ROOT + '/vite.config.js');
    check(![...logicFiles()].some(f => /platecosmetic/.test(f)), 'the module is not in the replay fingerprint (vite.config.js logicFiles)');
    check(!JSON.stringify(C.CARS).includes('plate'), 'nothing is written onto a car\'s entry');
  }
} finally { await close(); }
if (!record) console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
