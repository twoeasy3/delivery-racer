// A check of MODEL PATCHES (render/modelpatch.js; the model editor, delivery/modeleditor.html; the game's side,
// render/modelpatchapply.js), headless (no browser):
//  - EXTRACTION for every car of the roster (showroomData.js showroomCars) and every car idea (ideas.js IDEA_CARS): the
//    part list has every node of the model, each id once, and its meshes and their triangles add up to the model's own
//    count (inspectmodel.js countModel: the visible ones); applying an EMPTY patch changes nothing;
//  - a MOVE, a COLOUR, a DELETE and an ADD each change exactly that part (and a colour never a material another model
//    shares: a fresh build is as before); a geometry SIZE on a plain box; a SHARED colour (shareMat) one copy for all;
//  - a STALE patch (an id and a sig that are not there; a base that differs) is reported, never thrown;
//  - UNDO / REDO: the editor's patches, applied in turn to fresh builds, give back the same model for the same patch;
//  - MIRROR: the copy stands across the car (x -> -x), follows its part, and the Evil side's paint goes on and off;
//  - the GAME applies a patch once per model (userData.patched), and none without one;
//  - the replays' rules fingerprint (vite.config.js logicFiles) has none of these files.
//   node scripts/.modelpatch-check.mjs
import { startModels } from './modelpatch-load.mjs';

const { load, close } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { buildInspectModel, countModel } = await load('render/inspectmodel.js');
  const MP = await load('render/modelpatch.js');
  const apply = await load('render/modelpatchapply.js');
  apply.setModelPatching(false);
  const { carById } = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { showroomCars } = await load('showroomData.js');
  // a model's state, part by part (what a patch could change)
  const snap = (model) => {
    model.updateMatrixWorld(true);
    const rows = [];
    model.traverse((n) => {
      if (n === model) return;
      const m = [].concat(n.material || [])[0];
      rows.push([n.userData.patchId || n.userData.patchPath, n.type, n.visible, n.matrixWorld.elements.map(v => v.toFixed(4)).join(','), m?.color?.getHexString() || '', m?.opacity ?? '', n.geometry ? MP.triangles(n) : 0].join('|'));
    });
    return rows;
  };
  const diff = (a, b) => { const A = new Set(a), B = new Set(b); return [...a.filter(x => !B.has(x)), ...b.filter(x => !A.has(x))]; };

  // ---- extraction, every car
  const cars = [...new Map([...showroomCars().filter(Boolean), ...IDEA_CARS].map(c => [c.id, c])).values()];
  const bad = [];
  let built = 0;
  for (const car of cars) {
    let model;
    try { model = buildInspectModel(car, false); } catch (e) { bad.push(car.id + ': ' + e.message); continue; }
    if (model.userData.block) continue; // (an idea with no model: a plain block)
    built++;
    const before = snap(model);
    MP.applyPatch(model, MP.emptyPatch(car.id));
    const { parts } = MP.extractParts(model);
    let nodes = 0, meshes = 0;
    model.traverse(n => { if (n !== model) { nodes++; if (n.isMesh) meshes++; } });
    const ids = new Set(parts.map(p => p.id));
    // the visible meshes' triangles, as the inspector counts them
    const shown = (id) => { let n = model; for (const i of id.split('.')) n = n.children[+i]; for (let p = n; p; p = p.parent) if (!p.visible) return false; return true; };
    const tris = parts.filter(p => p.type === 'mesh' && shown(p.path)).reduce((s, p) => s + p.tris, 0);
    const counted = countModel(model);
    const problems = [];
    if (parts.length !== nodes) problems.push(parts.length + ' parts for ' + nodes + ' nodes');
    if (ids.size !== parts.length) problems.push('ids not unique');
    if (parts.filter(p => p.type === 'mesh').length !== meshes) problems.push('meshes ' + parts.filter(p => p.type === 'mesh').length + ' vs ' + meshes);
    if (tris !== counted.triangles) problems.push('triangles ' + tris + ' vs ' + counted.triangles);
    if (diff(before.map(r => r.split('|').slice(1).join('|')), snap(model).map(r => r.split('|').slice(1).join('|'))).length) problems.push('an empty patch changed it');
    if (problems.length) bad.push(car.id + ': ' + problems.join('; '));
  }
  check(!bad.length && built > 50, 'every car\'s parts extracted (' + built + ' models of ' + cars.length + ' cars): every node once, the meshes and triangles the model\'s own count, an empty patch changes nothing' + (bad.length ? '\n          ' + bad.slice(0, 12).join('\n          ') : ''));

  // ---- one car's edits: exactly that part
  const car = carById('bus');
  const fresh = () => { const m = buildInspectModel(car, false); MP.applyPatch(m, null); return m; };
  const base = fresh(), baseSnap = snap(base);
  const { parts } = MP.extractParts(base);
  const body = parts.find(p => p.role === 'body'), tyre = parts.find(p => p.role === 'tyre'), other = parts.find(p => p.type === 'mesh' && p !== body && p.role !== 'tyre' && p.editable && Math.abs(p.position[0]) > 0.2);
  const run = (patch) => { const m = buildInspectModel(car, false); const r = MP.applyPatch(m, patch); return { m, r, s: snap(m) }; };
  const changedIds = (s) => diff(baseSnap, s).map(r => r.split('|')[0]);
  let patch = MP.withSet(MP.emptyPatch('bus', MP.modelSignature(base)), other, { position: [other.position[0] + 0.3, other.position[1], other.position[2]] });
  let t = run(patch);
  check(new Set(changedIds(t.s)).size === 1 && changedIds(t.s)[0] === other.id && !t.r.unmatched.length, 'a move changes that part only (' + other.id + ')');
  patch = MP.withSet(MP.emptyPatch('bus'), tyre, { color: '#ff00ff' });
  t = run(patch);
  check(new Set(changedIds(t.s)).size === 1 && changedIds(t.s)[0] === tyre.id, 'a colour changes that part only (a tyre; the others keep the shared tyre material)');
  check(snap(fresh()).join() === baseSnap.join(), 'a fresh build after a colour patch is as before (no shared material changed)');
  const baseNodes = MP.extractParts(base).nodes, uses = new Map();
  for (const n of baseNodes.values()) if (n.isMesh) uses.set(n.material, (uses.get(n.material) || 0) + 1);
  const sharer = parts.find(p => p.type === 'mesh' && uses.get(baseNodes.get(p.id).material) > 1);
  patch = MP.withSet(MP.emptyPatch('bus'), sharer, { color: '#ff00ff', shareMat: true });
  t = run(patch);
  const magenta = []; t.m.traverse(n => n.isMesh && n.material.color?.getHexString() === 'ff00ff' && magenta.push(n));
  check(magenta.length > 1 && new Set(magenta.map(n => n.material)).size === 1, 'a shared colour goes to every part sharing the material, as ONE copy (' + magenta.length + ' parts, one draw call)');
  t = run(MP.withDelete(MP.emptyPatch('bus'), other));
  const removed = diff(baseSnap, t.s);
  check(t.s.length === baseSnap.length - 1 && removed.length === 1 && removed[0].startsWith(other.id + '|'), 'a delete removes that part only, and the other ids still find their parts');
  const added = MP.withAdd(MP.emptyPatch('bus'), 'cylinder', { position: [0, 2, 0] });
  t = run(added.patch);
  check(t.s.length === baseSnap.length + 1 && diff(baseSnap, t.s).length === 1 && t.s.some(r => r.startsWith(added.id + '|Mesh')), 'an add makes one new part (' + added.id + ') and changes nothing else');
  t = run(MP.withSet(MP.emptyPatch('bus'), body, { params: { height: body.params.height * 2 } }));
  const bodyNode = MP.extractParts(t.m).nodes.get(body.id);
  check(Math.abs(bodyNode.geometry.parameters.height - body.params.height * 2) < 1e-6 && bodyNode.geometry !== MP.extractParts(base).nodes.get(body.id).geometry, 'a plain box\'s size is set by its parameters (a geometry of its own)');

  // ---- stale
  let threw = null;
  try { t = run({ car: 'bus', base: 'nope', ops: [{ id: '99.9', sig: 'M:Nothing:0:0', set: { position: [0, 0, 0] } }, { id: '0', sig: 'M:Wrong', delete: true }, null, { add: { id: 'x', from: '77' } }], evil: [{ id: '42', sig: 'zz', set: { color: '#000' } }] }); } catch (e) { threw = e; }
  check(!threw && t.r.unmatched.length === 3 && t.r.stale && t.s.length === baseSnap.length, 'a stale patch is reported (3 unmatched ids, the base changed, an add from a missing part) and nothing is thrown or changed' + (threw ? ': ' + threw.message : ''));

  // ---- undo / redo: the same patch, the same model
  const history = [MP.emptyPatch('bus')];
  history.push(MP.withSet(history.at(-1), other, { position: [0.1, 1, 0.2], rotation: [0, 0.5, 0] }));
  history.push(MP.withSet(history.at(-1), body, { color: '#123456' }));
  history.push(MP.withDelete(history.at(-1), tyre));
  history.push(MP.withMirror(history.at(-1), other).patch);
  const snaps = history.map(p => snap(run(JSON.parse(JSON.stringify(p))).m).join('\n'));
  const again = [3, 2, 1, 2, 3, 4].map(i => [i, snap(run(JSON.parse(JSON.stringify(history[i]))).m).join('\n')]);
  check(again.every(([i, s]) => s === snaps[i]) && new Set(snaps).size === snaps.length, 'undo / redo: each patch of a history gives the same model every time it is applied (and each step differs)');

  // ---- mirror
  const mp = MP.withMirror(MP.emptyPatch('bus'), other);
  t = run(mp.patch);
  const { nodes } = MP.extractParts(t.m);
  const src = nodes.get(other.id), copy = nodes.get(mp.id);
  const V3 = src.position.constructor, ws = new V3(), wc = new V3();
  src.geometry.computeBoundingBox(); const B3 = src.geometry.boundingBox.constructor;
  t.m.updateMatrixWorld(true); src.getWorldPosition(ws); copy.getWorldPosition(wc);
  const bs = new B3().setFromObject(src), bc = new B3().setFromObject(copy);
  check(copy && Math.abs(wc.x + ws.x) < 1e-4 && Math.abs(wc.y - ws.y) < 1e-4 && Math.abs(wc.z - ws.z) < 1e-4 && Math.abs(bc.min.x + bs.max.x) < 1e-3, 'mirror: the copy stands across the car (x ' + ws.x.toFixed(3) + ' -> ' + wc.x.toFixed(3) + ', its box too)');
  const moved = MP.withSet(mp.patch, other, { position: [other.position[0], other.position[1] + 0.2, other.position[2]] });
  t = run(moved);
  const n2 = MP.extractParts(t.m).nodes;
  t.m.updateMatrixWorld(true);
  check(Math.abs(n2.get(mp.id).getWorldPosition(wc).y - n2.get(other.id).getWorldPosition(ws).y) < 1e-4, 'mirror: the copy follows its part when it moves');
  check(MP.withMirror(mp.patch, other).patch.ops.length === mp.patch.ops.length, 'mirror again: the same copy, not a second one');

  // ---- Evil paint
  const evilPatch = MP.withSet(MP.emptyPatch('bus'), body, { color: '#00ff00' }, { evil: true });
  const em = buildInspectModel(car, false); MP.applyPatch(em, evilPatch, { evil: false });
  const bodyOf = (m) => MP.extractParts(m).nodes.get(body.id).material.color.getHexString();
  const goodColour = bodyOf(em);
  em.userData.livery(true); const evilColour = bodyOf(em);
  check(goodColour !== '00ff00' && evilColour === '00ff00', 'the Evil side\'s colour goes on with the Evil livery (and not on Good)');

  // ---- the game's side: once per model, none without a patch
  apply.setModelPatching(true);
  apply.PATCHES.bus = MP.withSet(MP.emptyPatch('bus'), other, { visible: false });
  const g = buildInspectModel(car, false); // (makeShowCar: patched as it is built)
  check(g.userData.patched && MP.extractParts(g).nodes.get(other.id).visible === false, 'the game applies the car\'s patch as the model is built (makeShowCar)');
  const before2 = snap(g).join(); apply.patchModel(g, car); check(snap(g).join() === before2, 'a model already patched is left (one patch per build)');
  const other2 = buildInspectModel(carById(IDEA_CARS[0].id), false);
  check(!other2.userData.patched, 'a car with no patch is built as its code builds it');
  delete apply.PATCHES.bus;

  // ---- the fingerprint
  const { logicFiles } = await import('../vite.config.js');
  const inRules = logicFiles().filter(f => /modelpatch|modeleditor/.test(f));
  check(!inRules.length, 'the replays\' rules fingerprint has none of the model editor\'s files' + (inRules.length ? ': ' + inRules.join(', ') : ''));
} catch (e) { console.log('  FAIL  ' + (e.stack || e.message)); failures++; } finally { await close(); }
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
