// MODEL PATCHES from the command line (the model editor's patches: delivery/modeleditor.html, render/modelpatch.js):
//   node scripts/model-patch.mjs <car id> --dump            the car's part list as JSON (ids, sigs, roles, kinds, triangles...)
//   node scripts/model-patch.mjs <car id> --check [file]    the patch (default src/delivery/modelpatches/<id>.json) applies
//                                                           with no unmatched ids; exit 1 if not
//   node scripts/model-patch.mjs <car id> --apply [file]    apply it and print the model's stats before and after
//   node scripts/model-patch.mjs --all --check               every patch in src/delivery/modelpatches/
// Add --evil to build and paint the car as Evil.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const DIR = 'src/delivery/modelpatches';
const { load, close, ROOT } = await startModels();
let failed = 0;
try {
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const MP = await load('render/modelpatch.js');
  const { setModelPatching } = await load('render/modelpatchapply.js');
  setModelPatching(false); // (the code's own model: the patch is applied here)
  const { carById } = await load('cars.js');
  const K = await load('render/ideaModelsDkit.js'), G = await load('render/glassnames.js');
  const evil = flag('--evil');
  const fileArg = (after) => { const i = args.indexOf(after); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null; };
  const readPatch = (id, file) => {
    const path = file || join(ROOT, DIR, id + '.json');
    if (!existsSync(path)) throw new Error('no patch at ' + path);
    return JSON.parse(readFileSync(path, 'utf8'));
  };
  const one = (id, mode) => {
    const car = carById(id);
    if (!car) throw new Error('no car "' + id + '"');
    const patch0 = mode === 'dump' ? null : readPatch(id, fileArg('--' + mode));
    // (the patch's window edits, its `glass` or `windows` table in any spelling, go into the BUILD as the game and the editor do)
    const model = K.withGlassEdits(G.glassTable(patch0), () => buildInspectModel(car, evil)), rep = K.glassEditsReport();
    if (rep.edits) model.userData.glassEdits = { used: Object.keys(rep.edits).filter(k => !rep.unused.includes(k)), unused: rep.unused };
    if (mode === 'dump') {
      MP.applyPatch(model, null);
      const { parts, base } = MP.extractParts(model);
      console.log(JSON.stringify({ car: id, base, stats: MP.modelStats(model), parts }, null, 1));
      return;
    }
    const patch = patch0;
    const before = MP.modelStats(model);
    const r = MP.applyPatch(model, patch, { evil });
    const after = MP.modelStats(model);
    const bad = r.unmatched.length > 0;
    if (bad) failed++;
    console.log((bad ? 'FAIL  ' : 'ok    ') + id + ': ' + patch.ops.length + ' ops, ' + (patch.evil?.length || 0) + ' Evil' + (G.glassTable(patch) ? ', ' + Object.keys(G.glassTable(patch)).length + ' window edits' : '') + '; applied ' + r.applied
      + (bad ? '; UNMATCHED ' + r.unmatched.join(', ') : '') + (r.stale ? ' (the code changed since it was made)' : ''));
    for (const w of r.warnings) console.log('      ' + w);
    if (mode === 'apply') console.log('      shapes ' + before.meshes + ' -> ' + after.meshes + ', triangles ' + before.triangles + ' -> ' + after.triangles + ', materials ' + before.materials + ' -> ' + after.materials
      + ' (budget ' + MP.BUDGET.shapes.join('-') + ' shapes, ' + MP.BUDGET.triangles.join('-') + ' triangles, max ' + MP.BUDGET.hard + ')');
  };
  if (flag('--all')) {
    const ids = existsSync(join(ROOT, DIR)) ? readdirSync(join(ROOT, DIR)).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) : [];
    if (!ids.length) console.log('No patches in ' + DIR + '.');
    for (const id of ids) one(id, 'check');
  } else {
    const id = args.find(a => !a.startsWith('--') && a !== fileArg('--check') && a !== fileArg('--apply'));
    if (!id) { console.log('node scripts/model-patch.mjs <car id> --dump | --check [file] | --apply [file]   (or --all --check)'); process.exitCode = 1; }
    else one(id, flag('--dump') ? 'dump' : flag('--apply') ? 'apply' : 'check');
  }
} catch (e) { console.log('FAIL  ' + e.message); failed++; } finally { await close(); }
if (failed) process.exitCode = 1;
