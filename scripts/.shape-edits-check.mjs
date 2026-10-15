// A check of SHAPE EDITS (render/shapeedits.js; the model editor's Shapes, src/delivery/modeleditor.js; scripts/bake-shapes.mjs), headless:
//  - RECORDING CHANGES NOTHING: every car the editor lists, built plain and built with its outlines recorded (the hooks on, no cache), has
//    the same vertices; and most outlines are found on the car (their mesh and plane);
//  - AN EDIT IS A BUILD INPUT: the Touring Car's body outline edited (the patch's `shapes` table, read as the model is built) changes the
//    body's mesh only (every other mesh the same); the outline is the edited points exactly; its id is the same in the edited build;
//  - MIRROR: the Hearse's two front door windows are partners; the mirrored edit (mirrorPoints) changes both, and they stay partners;
//    the Touring Car's arch flares (moved across, not mirrored) pair as `loose`;
//  - THE PLAIN CACHE IS UNTOUCHED: a plain build after an edited one is the plain build;
//  - THE GAME: a patch file's `shapes` (modelpatchapply PATCHES) builds the edited car through render/showcar.js makeShowCar; an id no outline
//    answers to is reported (applyPatch's unmatched), not thrown; withShape / tidyPatch round-trip;
//  - with --bake: scripts/bake-shapes.mjs --dry on a trial patch for the Hearse (a mirrored pair and the coach) bakes both and proves them.
//   node scripts/.shape-edits-check.mjs [--bake]
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { startModels } from './modelpatch-load.mjs';

const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const meshHashes = (model) => { const out = []; model.updateMatrixWorld(true); model.traverse((n) => { if (n.isMesh && n.geometry?.attributes.position) { const a = n.geometry.attributes.position.array; let h = 0; for (let i = 0; i < a.length; i++) h = (Math.imul(h, 31) + Math.round(a[i] * 1e5)) | 0; out.push(h); } }); return out; };
let trial = null;
try {
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const { makeShowCar } = await load('render/showcar.js');
  const cars = await load('cars.js'), { IDEA_CARS } = await load('ideas.js');
  const S = await load('render/shapeedits.js');
  const MP = await load('render/modelpatch.js');
  const apply = await load('render/modelpatchapply.js');
  await apply.patchesReady;
  apply.setModelPatching(false);
  const recorded = (car, edits = null) => {
    S.setShapeOverride({ edits, record: true });
    let model;
    try { model = buildInspectModel(car, false); } finally { S.setShapeOverride(null); }
    const rep = S.lastShapeReport(), records = S.locateShapes(model, rep.records);
    return { model, records, pairs: S.shapePartners(records.filter(r => r.mesh)), rep };
  };
  // ---- recording changes nothing
  const roster = [...new Map([...cars.CARS, ...(cars.FILLER_CARS || []), ...cars.EVENT_CARS, ...cars.BESPOKE_CARS, ...cars.EARNED_CARS, ...Object.values(cars.SECRET_CARS)].filter(Boolean).map(c => [c.id, c])).values()];
  const all = [...roster, ...IDEA_CARS.filter(c => !roster.some(r => r.id === c.id))];
  let same = 0, n = 0, found = 0, outlines = 0;
  const differ = [];
  for (const car of all) {
    let plain, rec;
    try { plain = buildInspectModel(car, false); rec = recorded(car); } catch { continue; }
    n++;
    if (meshHashes(plain).join() === meshHashes(rec.model).join()) same++; else differ.push(car.id);
    outlines += rec.records.length; found += rec.records.filter(r => r.mesh).length;
  }
  check(same === n && n > 150, 'recording changes nothing: ' + same + ' / ' + n + ' cars built recorded are the plain build, vertex by vertex' + (differ.length ? ' (differ: ' + differ.join(', ') + ')' : ''));
  check(outlines > 400 && found / outlines > 0.95, outlines + ' outlines recorded, ' + found + ' found on their car (' + (100 * found / outlines).toFixed(1) + ' %)');

  // ---- an edit is a build input (the Touring Car's body)
  const touring = cars.carById('touringcar');
  const plainT = meshHashes(buildInspectModel(touring, false));
  const t0 = recorded(touring);
  const body = t0.records.find(r => r.kind === 'extrude' && t0.pairs.get(r.id)?.self && r.pts.length > 10);
  check(!!body && !!body.mesh, 'the Touring Car\'s body outline is recorded and found (' + (body ? body.id + ', ' + body.pts.length + ' points, ' + S.shapeView(body).name + ' view' : 'none') + ')');
  const view = S.shapeView(body), moved = body.pts.map(view.toView);
  moved[4] = [moved[4][0], moved[4][1] + 0.05];
  const edit = moved.map(view.fromView);
  const t1 = recorded(touring, { [body.id]: edit });
  const after = meshHashes(t1.model), changed = after.map((h, i) => h !== plainT[i]).filter(Boolean).length;
  const b1 = t1.records.find(r => r.id === body.id);
  check(!!b1 && b1.edited && JSON.stringify(b1.now) === JSON.stringify(edit), 'the edited build makes the outline from the edited points (the same id ' + body.id + ')');
  check(after.length === plainT.length && changed === 1, 'only the body\'s mesh changed: ' + changed + ' of ' + after.length + ' meshes');
  check(t1.rep.used.includes(body.id) && !t1.rep.unused.length, 'the table\'s id is used, none unused');
  const flares = t0.records.filter(r => t0.pairs.get(r.id)?.loose);
  check(flares.length === 4, 'the arch flares (laid across by moving, not mirroring) pair up as loose partners: ' + flares.length);
  check(meshHashes(buildInspectModel(touring, false)).join() === plainT.join(), 'a plain build after the edited one is the plain build (the plain cache untouched)');
  // a part edit (its colour) and a shape edit of the same part together: the op still finds its part, and no "code changed" warning
  const bodyPart = MP.extractParts(buildInspectModel(touring, false)).parts.find(q => q.hook === 'body');
  const both = { car: 'touringcar', version: 1, base: MP.extractParts(buildInspectModel(touring, false)).base, ops: [{ id: bodyPart.id, sig: bodyPart.sig, set: { color: '#22aa44' } }], evil: [], shapes: { [body.id]: edit } };
  S.setShapeOverride({ edits: both.shapes, record: false });
  let tb; try { tb = buildInspectModel(touring, false); } finally { S.setShapeOverride(null); }
  const rb = MP.applyPatch(tb, both);
  check(!rb.unmatched.length && !rb.stale && tb.userData.body.material.color.getHexString() === '22aa44', 'a colour edit and a shape edit of the body together: the colour finds the body (unmatched ' + rb.unmatched.length + ', stale ' + rb.stale + ')');

  // ---- mirror (the Hearse's front door windows)
  const hearse = cars.carById('hearse');
  const plainH = meshHashes(buildInspectModel(hearse, false));
  const h0 = recorded(hearse);
  const win = h0.records.find(r => h0.pairs.get(r.id)?.partner && !h0.pairs.get(r.id).loose), twin = win && h0.records.find(r => r.id === h0.pairs.get(win.id).partner);
  check(!!win && !!twin && h0.pairs.get(twin.id).partner === win.id, 'the Hearse\'s door windows are mirror partners (' + (win ? win.id + ' <-> ' + twin.id : 'none') + ')');
  const hv = S.shapeView(win), wpts = win.pts.map(hv.toView); wpts[1] = [wpts[1][0] + 0.06, wpts[1][1] - 0.05];
  const wedit = wpts.map(hv.fromView), tedit = S.mirrorPoints(win, twin, wedit);
  check(JSON.stringify(tedit) === JSON.stringify(wedit), 'a side window\'s mirrored edit is the same side-view points for the other flank');
  let patch = S.withShape(S.withShape({ car: 'hearse', version: 1, ops: [], evil: [] }, win.id, wedit), twin.id, tedit);
  const h1 = recorded(hearse, patch.shapes), afterH = meshHashes(h1.model);
  check(h1.records.find(r => r.id === win.id)?.edited && h1.records.find(r => r.id === twin.id)?.edited, 'both windows are built from their edit (one commit: one table, both ids)');
  check(afterH.filter((h, i) => h !== plainH[i]).length === 1, 'only the glass mesh (the merged windows) changed');
  check(h1.pairs.get(win.id)?.partner === twin.id, 'after the mirrored edit they are still partners');

  // ---- the game's side
  apply.PATCHES.hearse = { car: 'hearse', version: 1, ops: [], evil: [], shapes: { ...patch.shapes, 'snothere#0': [[0, 0], [1, 0], [0, 1]] } };
  apply.setModelPatching(true);
  const inGame = makeShowCar(hearse);
  apply.setModelPatching(false);
  delete apply.PATCHES.hearse;
  check(inGame.userData.shapeEdits?.used.length === 2 && inGame.userData.shapeEdits.unused.join() === 'snothere#0', 'the game builds the car with its patch file\'s shapes (2 used) and reports the stale id');
  const res = MP.applyPatch(buildInspectModel(hearse, false), apply.PATCHES.hearse || { ops: [], shapes: {} });
  check(res && !res.unmatched.length, 'a patch is applied to a model built with no table without throwing');
  const tidy = MP.tidyPatch(S.withShape(patch, win.id, null));
  check(tidy.shapes && Object.keys(tidy.shapes).length === 1 && !MP.tidyPatch(S.withShape(S.withShape(patch, win.id, null), twin.id, null)).shapes, 'withShape takes an id out; an empty table goes with tidyPatch');
  trial = patch;
} catch (e) { failures++; console.log('  FAIL  ' + (e.stack || e.message)); } finally { await close(); }

if (process.argv.includes('--bake') && trial) {
  const dir = mkdtempSync(join(tmpdir(), 'shape-bake-')), file = join(dir, 'hearse.json');
  writeFileSync(file, JSON.stringify(trial));
  let out;
  try { out = execFileSync(process.execPath, [join(ROOT, 'scripts/bake-shapes.mjs'), 'hearse', '--patch', file, '--dry'], { encoding: 'utf8', timeout: 900000 }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  check(/ok {4}.*argument/.test(out) && /built from the code is the patched model exactly/.test(out) && /dry: every file put back/.test(out), 'bake-shapes --dry: the mirrored pair written into the code (one literal for both) and proved:\n' + out.trim().split('\n').map(l => '          ' + l).join('\n'));
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
