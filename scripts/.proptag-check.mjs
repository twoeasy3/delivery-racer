// A check of the PROP TAGS and the toggle that hides them (render/propcosmetic.js; CHECKLIST 300: the owner, 15-Oct, "if a car already has
// props like this, tag the geometry to remove them when a prop is chosen"). Modelled on scripts/.platetag-check.mjs. Every car of the
// prop roster (scripts/prop-roster.mjs: garage, Supers, filler, earned, Legendary, Bespoke, event, secret, level vehicles, idea cars) is
// built as the showroom builds it (render/showcar.js makeShowCar) and then:
//   - the tags changed NOTHING that is drawn: triangle counts, mesh counts (+1 only where a tagged prop had to be its own mesh out of a
//     merged one: SPLIT below), bounding boxes and a HASH of every visible mesh's triangles in car space equal
//     scripts/.proptag-baseline.json (recorded on the code before the tags went in, `--record`)
//   - every tag is one of 'roof' | 'cargo' | 'wing', and the cars tagged are the ones the table (render/propanchorstable.js) says
//     have an existing prop in that slot
//   - the toggle: hideProps(model, slot) hides exactly the meshes tagged for that slot and nothing else; showProps(model) puts every
//     mesh back; hideProps(model) (no slot) hides all three slots' props
//   - a hidden prop and: dents (the same panels move as with the prop visible, and the prop is still hidden after), the ghost
//     stand-in material (visibility untouched), a blackout silhouette; the module is not in the replay fingerprint; nothing is
//     written onto a car's entry
//   node scripts/.proptag-check.mjs            the check (--complete at the end of the sweep: at least twenty tags)
//   node scripts/.proptag-check.mjs --record   (re)write scripts/.proptag-baseline.json from the CURRENT code (only on code with no tags)
import * as THREE from 'three';
import { readFileSync, writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';
import { roster } from './prop-roster.mjs';

const record = process.argv.includes('--record');
const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const BASELINE = ROOT + '/scripts/.proptag-baseline.json';
// models where a tagged prop shared a merged mesh with other parts of its material and now is a mesh of its own (one more mesh each)
const SPLIT = { minibus: 1 }; // (the Minibus's roof vent came out of its merged black parts; a sweeping agent adds its own splits here)
try {
  const { makeShowCar } = await load('render/showcar.js');
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { dentModel } = await load('render/dents.js');
  const { silhouetteFor, SILHOUETTE } = await load('render/silhouette.js');
  const cars = roster(C, IDEA_CARS);
  const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const v = new THREE.Vector3();
  const measure = (model) => {
    model.updateMatrixWorld(true);
    let tris = 0, meshes = 0, h1 = 0, h2 = 0;
    model.traverseVisible((node) => {
      if (!node.isMesh || !node.geometry) return;
      const g = node.geometry, total = g.index ? g.index.count : g.attributes.position?.count || 0;
      const start = Math.max(0, g.drawRange.start), count = Math.max(0, Math.min(total - start, g.drawRange.count));
      tris += Math.floor(count / 3) * (node.isInstancedMesh ? node.count : 1);
      meshes++;
      // the triangles in car space, summed (order-free: a split mesh hashes the same as the merged one)
      const p = g.attributes.position;
      if (!p) return;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(node.matrixWorld);
        h1 += Math.round(v.x * 1e3) * 1.3 + Math.round(v.y * 1e3) * 1.7 + Math.round(v.z * 1e3) * 1.9;
        h2 += Math.abs(Math.round(v.x * 1e3)) * 0.7 + Math.abs(Math.round(v.y * 1e3)) * 0.3 + Math.abs(Math.round(v.z * 1e3)) * 0.5;
      }
    });
    const box = new THREE.Box3().setFromObject(model, true);
    const r = (x) => Math.round(x * 1e5) / 1e5;
    return { tris, meshes, lo: box.min.toArray().map(r), hi: box.max.toArray().map(r), hash: Math.round(h1) + ':' + Math.round(h2) };
  };
  const built = new Map();
  for (const { group, car } of cars) {
    if (only.length && !only.includes(car.id)) continue;
    let model = null;
    try { model = makeShowCar(car); } catch (err) { console.log('  (no model: ' + car.id + ': ' + err.message + ')'); }
    if (!model) continue;
    model.parent?.remove(model);
    model.userData.animate?.(0);
    built.set(car.id, { group, car, model });
  }
  console.log(built.size + ' cars built');

  if (record) {
    const out = {};
    for (const [id, { model }] of built) out[id] = measure(model);
    writeFileSync(BASELINE, JSON.stringify(out));
    console.log('baseline written: ' + Object.keys(out).length + ' cars -> ' + BASELINE);
  } else {
    const P = await load('render/propcosmetic.js');
    const { PROP_TABLE, HAND } = await load('render/propanchors.js');
    // ---- nothing that is drawn changed ----
    let base = null;
    try { base = JSON.parse(readFileSync(BASELINE, 'utf8')); } catch { /* (no baseline) */ }
    check(!!base, 'the baseline (scripts/.proptag-baseline.json, recorded before the tags) is there');
    if (base) {
      const bad = [], plus = [];
      for (const [id, { car, model }] of built) {
        const was = base[id], now = measure(model);
        if (!was) { bad.push(id + ' (not in the baseline)'); continue; }
        const extra = SPLIT[car.model || car.id] || 0;
        const same = now.tris === was.tris && now.hash === was.hash && now.lo.every((x, i) => Math.abs(x - was.lo[i]) < 1e-4) && now.hi.every((x, i) => Math.abs(x - was.hi[i]) < 1e-4);
        const meshOk = now.meshes === was.meshes || (extra && now.meshes === was.meshes + extra);
        if (now.meshes !== was.meshes) plus.push(id);
        if (!same || !meshOk) bad.push(id + ' tris ' + was.tris + '->' + now.tris + ' meshes ' + was.meshes + '->' + now.meshes + (now.hash !== was.hash ? ' hash differs' : ''));
      }
      check(!bad.length, 'triangle counts, geometry hashes and bounding boxes equal the baseline on every car' + (bad.length ? ': ' + bad.slice(0, 8).join('; ') : ' (' + built.size + ' compared)'));
      console.log('        (one mesh more, a prop that shared a merged mesh: ' + (plus.join(', ') || 'none') + ')');
    }
    // ---- the tags ----
    const SLOTS = ['roof', 'cargo', 'wing'];
    let tagged = 0, taggedCars = 0;
    const badTag = [], mismatch = [];
    for (const [id, { model }] of built) {
      const props = P.existingProps(model);
      for (const { mesh, slot } of props) if (!SLOTS.includes(slot)) badTag.push(id + ' ' + mesh.name + ' "' + slot + '"');
      tagged += props.length;
      if (props.length) taggedCars++;
      const entry = PROP_TABLE[id] && Object.fromEntries(SLOTS.map(s => [s, (HAND[id] && s in HAND[id]) ? HAND[id][s] : PROP_TABLE[id][s]])); // (the merged entry: a hand fix counts, as in the reader)
      if (!entry) continue; // (not measured yet: the sweep is in progress; .propanchors-check --complete asks for every car)
      for (const slot of SLOTS) {
        const has = props.some(p => p.slot === slot), says = !!(entry && entry[slot] && entry[slot].existing);
        if (has !== says) mismatch.push(id + ' ' + slot + (has ? ' tagged but the table does not say existing' : ' existing in the table but nothing tagged'));
      }
    }
    check(!badTag.length, 'every tag is roof | cargo | wing' + (badTag.length ? ': ' + badTag.slice(0, 6).join('; ') : ' (' + tagged + ' tagged meshes on ' + taggedCars + ' cars)'));
    check(!mismatch.length, 'the cars with a tagged prop are the ones the table marks existing, slot by slot' + (mismatch.length ? ': ' + mismatch.slice(0, 8).join('; ') : ''));
    if (process.argv.includes('--complete')) check(tagged >= 20, 'at least twenty props are tagged (' + tagged + ')');
    else console.log('        (' + tagged + ' tagged meshes; --complete asks for at least twenty, at the end of the sweep)');

    // ---- the toggle ----
    const visSig = (model) => { const out = []; model.traverse(n => { if (n.isMesh) out.push(n.visible ? 1 : 0); }); return out.join(''); };
    let allShown = true, hidesOnly = true, restored = true, allSlots = true;
    for (const [, { model }] of built) {
      const was = visSig(model), props = P.existingProps(model);
      if (props.some(p => !p.mesh.visible)) allShown = false;
      for (const slot of SLOTS) {
        const mine = props.filter(p => p.slot === slot), n = P.hideProps(model, slot);
        if (n !== mine.length || mine.some(p => p.mesh.visible)) hidesOnly = false;
        const isMine = new Set(mine.map(p => p.mesh));
        let i = 0;
        model.traverse(node => { if (node.isMesh) { if (!isMine.has(node) && (node.visible ? 1 : 0) !== +was[i]) hidesOnly = false; i++; } });
        P.showProps(model);
        if (visSig(model) !== was) restored = false;
      }
      P.hideProps(model);
      if (props.some(p => p.mesh.visible)) allSlots = false;
      P.showProps(model);
      if (visSig(model) !== was) restored = false;
    }
    check(allShown, 'with nothing chosen every tagged prop of every car is visible');
    check(hidesOnly, 'hideProps(model, slot) hides every prop tagged for that slot, and nothing else');
    check(allSlots, 'hideProps(model) hides the props of all three slots');
    check(restored, 'showProps(model) puts every mesh back as it was');
    // dents, ghost and a blackout, with a prop hidden
    const sig = (model) => { const out = []; model.traverse(n => { if (n.isMesh && n.geometry.attributes.position && !n.userData.prop) { const p = n.geometry.attributes.position; let h = 0; for (let i = 0; i < p.count; i++) h += p.getX(i) * 1.3 + p.getY(i) * 1.7 + p.getZ(i) * 1.9; out.push(Math.round(h * 1e4)); } }); return out.join(','); };
    const dentCars = [...built.values()].filter(b => P.existingProps(b.model).length && b.group !== 'idea').slice(0, 4).map(b => b.car);
    for (const car of dentCars) {
      const a = makeShowCar(car); a.parent?.remove(a); a.updateMatrixWorld(true); dentModel(a, a.userData.body, 1); const sa = sig(a);
      const b = makeShowCar(car); b.parent?.remove(b); b.updateMatrixWorld(true); P.hideProps(b);
      dentModel(b, b.userData.body, 1); const sb = sig(b);
      const hidden = P.existingProps(b).every(p => p.mesh.visible === false);
      dentModel(b, b.userData.body, 0);
      check(sa === sb && hidden && P.existingProps(b).every(p => p.mesh.visible === false), car.id + ': dents move the same panels with the props hidden as with them shown, and they stay hidden through dent and repair');
    }
    const ghostCar = makeShowCar(dentCars[0]); ghostCar.parent?.remove(ghostCar); P.hideProps(ghostCar);
    const GHOST = new THREE.MeshLambertMaterial({ color: 0xdfe9ff, transparent: true, opacity: 0.45 });
    ghostCar.traverse((mesh) => { if (mesh.isMesh && !mesh.userData.solidMat) { mesh.userData.solidMat = mesh.material; mesh.material = GHOST; } }); // (render/items.js ghostify on)
    check(P.existingProps(ghostCar).every(p => !p.mesh.visible && p.mesh.material === GHOST && p.mesh.userData.solidMat), 'a ghost: the stand-in is on the hidden props and they stay hidden');
    ghostCar.traverse((mesh) => { if (mesh.isMesh && mesh.userData.solidMat) { mesh.material = mesh.userData.solidMat; mesh.userData.solidMat = null; } });
    check(P.existingProps(ghostCar).every(p => !p.mesh.visible && p.mesh.material !== GHOST), 'after the ghost: their own paint is back and they are still hidden');
    const sil = silhouetteFor(P.existingProps(ghostCar)[0].mesh.material);
    check(sil === SILHOUETTE, 'a blackout: a prop\'s material becomes the flat silhouette like any other part');
    P.showProps(ghostCar);
    check(P.existingProps(ghostCar).every(p => p.mesh.visible), 'showProps: every prop is shown again');
    const { logicFiles } = await import(ROOT + '/vite.config.js');
    check(![...logicFiles()].some(f => /propcosmetic|propanchors|propbounds/.test(f)), 'the modules are not in the replay fingerprint (vite.config.js logicFiles)');
    check(!JSON.stringify(C.CARS).includes('prop') && !JSON.stringify(IDEA_CARS).includes('"prop"'), 'nothing is written onto a car\'s entry');
  }
} finally { await close(); }
if (!record) console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
