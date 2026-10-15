// BAKE a car's WINDOW EDITS into its code (the owner, 15-Oct): the model editor stores a cabinGlass car's redrawn window edges as the
// `glass` table of its model patch (src/delivery/modelpatches/<car id>.json, render/modelpatch.js). This writes that table into the car's
// model file as a code literal the car's cabinGlass call(s) read (`overrides: GLASS_EDITS`, render/ideaModelsDkit.js), so the shipped car
// carries the edits in code, and takes the table out of the patch (the file is deleted when nothing else is in it).
//   node scripts/bake-glass.mjs <car id>              bake src/delivery/modelpatches/<car id>.json's glass table
//   node scripts/bake-glass.mjs <car id> --patch <f>  ...from that patch file (the editor's download) instead
//   node scripts/bake-glass.mjs <car id> --dry        print the literal and where it would go; change nothing
// It proves the bake first: the model built with the patch's table and the model built from the changed code have the same glass
// vertices; if not, the code is put back and nothing is written. A `const GLASS_EDITS = {...};` already in the builder is replaced.
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--patch');
const dry = args.includes('--dry');
const patchArg = args.includes('--patch') ? args[args.indexOf('--patch') + 1] : null;
if (!id) { console.log('node scripts/bake-glass.mjs <car id> [--patch <file>] [--dry]'); process.exit(1); }
const ROOT = join(import.meta.dirname, '..'), DIR = join(ROOT, 'src/delivery/modelpatches');
const patchPath = patchArg || join(DIR, id + '.json');
if (!existsSync(patchPath)) { console.log('FAIL  no patch at ' + patchPath); process.exit(1); }
const patch = JSON.parse(readFileSync(patchPath, 'utf8'));
const table = patch.glass;
if (!table || typeof table !== 'object' || !Object.keys(table).length) { console.log('FAIL  the patch has no glass table to bake'); process.exit(1); }

// the literal, as the code is written (single quotes, a line per window)
const fmt = (v) => (Array.isArray(v) ? '[' + v.map(fmt).join(', ') + ']' : v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => k + ': ' + fmt(x)).join(', ') + ' }' : String(Math.round(v * 1000) / 1000));
const key = (k) => (/^[a-z_]\w*$/i.test(k) ? k : "'" + k.replace(/'/g, "\\'") + "'");
const literal = '{ ' + Object.entries(table).map(([k, v]) => key(k) + ': ' + fmt(v)).join(', ') + ' }';
const LINE = '    const GLASS_EDITS = ' + literal + '; // (the windows as redrawn in the model editor: baked by scripts/bake-glass.mjs)';

// the car's builder and its cabinGlass call(s)
const glassHash = async (glass) => { // (built with that glass table as the car's patch, or with none: the code's own)
  const { load, close } = await startModels();
  try {
    const { buildInspectModel } = await load('render/inspectmodel.js');
    const { carById } = await load('cars.js');
    const apply = await load('render/modelpatchapply.js');
    await apply.patchesReady;
    apply.setModelPatching(true);
    if (glass) apply.PATCHES[id] = { car: id, ops: [], glass }; else delete apply.PATCHES[id];
    const car = carById(id);
    if (!car) throw new Error('no car "' + id + '"');
    const model = buildInspectModel(car, false);
    const out = [];
    model.updateMatrixWorld(true);
    model.traverse((n) => { if (n.isMesh && n.geometry?.userData?.panes) { const a = n.geometry.attributes.position.array; for (let i = 0; i < a.length; i++) out.push(a[i].toFixed(5)); } });
    if (!out.length) throw new Error('the ' + id + ' is not built with cabinGlass (no window panes): nothing to bake');
    return { hash: out.join(','), model: car.model, unused: model.userData.glassEdits?.unused || [] };
  } finally { await close(); }
};
try {
  const withPatch = await glassHash(table);
  if (withPatch.unused.length) console.log('note  ids no window answers to, left out: ' + withPatch.unused.join(', '));
  const hashWith = withPatch.hash;
  const files = readdirSync(join(ROOT, 'src/delivery/render')).filter(f => /^ideaModels.*\.js$/.test(f)).map(f => join(ROOT, 'src/delivery/render', f));
  const head = new RegExp('^ {2}' + withPatch.model.replace(/\W/g, '\\$&') + ': \\(car\\) => \\{', 'm');
  const file = files.find(f => head.test(readFileSync(f, 'utf8')));
  if (!file) throw new Error('no builder "' + withPatch.model + ': (car) =>" in src/delivery/render/ideaModels*.js');
  const src = readFileSync(file, 'utf8');
  const start = src.search(head);
  const rest = src.slice(start), endAt = rest.slice(1).search(/^ {2}[a-z0-9_]+: \(car\) => \{|^\};/m);
  const span = endAt < 0 ? rest : rest.slice(0, endAt + 1);
  const calls = [...span.matchAll(/cabinGlass\(([^,]+), \{/g)];
  if (!calls.length) throw new Error('no cabinGlass( call in the ' + withPatch.model + ' builder');
  let out = span;
  const had = /^ {4}const GLASS_EDITS = .*$/m;
  if (had.test(out)) out = out.replace(had, LINE);
  else { const lineStart = out.lastIndexOf('\n', out.search(/cabinGlass\(/)) + 1; out = out.slice(0, lineStart) + LINE + '\n' + out.slice(lineStart); } // (the literal just above the first call)
  out = out.replace(/cabinGlass\(([^,]+), \{ (?!overrides: GLASS_EDITS)/g, 'cabinGlass($1, { overrides: GLASS_EDITS, ');
  const next = src.slice(0, start) + out + src.slice(start + span.length);
  const rel = file.replace(ROOT + '/', '');
  console.log((dry ? 'would write ' : 'writing ') + rel + ': ' + calls.length + ' cabinGlass call(s) given overrides: GLASS_EDITS, and\n' + LINE);
  if (dry) process.exit(0);
  writeFileSync(file, next);
  const hashCode = (await glassHash(null)).hash;
  if (hashCode !== hashWith) { writeFileSync(file, src); throw new Error('the baked code does not build the same glass as the patch: the file is put back as it was'); }
  console.log('ok    the baked code builds the same glass as the patch (' + hashWith.split(',').length / 3 + ' vertices)');
  if (!patchArg) {
    delete patch.glass;
    if (patch.ops?.length || patch.evil?.length) { writeFileSync(patchPath, JSON.stringify(patch, null, 1) + '\n'); console.log('ok    ' + patchPath.replace(ROOT + '/', '') + ': the glass table taken out (' + patch.ops.length + ' ops kept)'); }
    else { unlinkSync(patchPath); console.log('ok    ' + patchPath.replace(ROOT + '/', '') + ' deleted (nothing else was in it)'); }
  } else console.log('note  --patch: the patch file is left as it is; take its glass table out yourself');
} catch (e) { console.log('FAIL  ' + e.message); process.exit(1); }
