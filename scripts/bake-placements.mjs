// BAKE the model editor's PLACEMENTS into the build data (the owner, 15-Oct: "I don't want them as patches but definitive build commands").
// The editor's Placements tab writes at once when it runs under the Vite dev server (POST /__placements, vite.config.js); on a page with no
// dev server behind it (the deployed site, a phone) it downloads a change file instead, which this merges into the SAME files:
//   prop slots -> the car's hand row in src/delivery/render/propanchors/slice-<n>.json (`by: 'editor'`, `prev`: the row it replaced)
//   plates     -> the model's HAND entry in src/delivery/render/plateanchors.js (`by: 'editor'`, `prev`)
// The format and the rules: scripts/placements-lib.mjs. It prints each change (before -> after) and the diff of the files.
//   node scripts/bake-placements.mjs <placements-<car>.json>          write
//   node scripts/bake-placements.mjs <file> --dry                      print only
// Then look at it (the editor, or the Cosmetics screen) and commit: git is the history; `{ kind, car, slot, undo: true }` puts `prev` back.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyChanges } from './placements-lib.mjs';

const args = process.argv.slice(2), dry = args.includes('--dry'), file = args.find(a => !a.startsWith('--'));
if (!file) { console.log('node scripts/bake-placements.mjs <change file> [--dry]'); process.exit(1); }
const ROOT = join(import.meta.dirname, '..');
try {
  const out = applyChanges(ROOT, JSON.parse(readFileSync(file, 'utf8')), { dry });
  for (const r of out.results) console.log((dry ? 'would set ' : 'set ') + r.kind + ' ' + r.id + (r.slot ? ' ' + r.slot : '') + ' in ' + r.file + ': ' + r.note + '\n  before ' + JSON.stringify(r.before) + '\n  after  ' + JSON.stringify(r.after));
  console.log(out.diff || '(no change: the files already say this)');
  console.log(dry ? 'dry: nothing written' : out.files.length + ' file(s) written: ' + out.files.join(', '));
} catch (err) {
  console.log('FAIL  ' + err.message + ' (nothing written)');
  process.exit(1);
}
