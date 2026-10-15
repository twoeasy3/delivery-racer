// A check of the model editor's PLACEMENTS BAKE (scripts/placements-lib.mjs: what the editor's "Write to build" (vite.config.js POST
// /__placements) and `node scripts/bake-placements.mjs <file>` write; the owner, 15-Oct: "definitive build commands", not patches):
//   - ROUND TRIP: an edited wing row written into the car's slice file is what the game's reader gives back (render/propanchors.js fitProp:
//     position, scale, inset; the row marked `by: 'editor'`, `lim: 'hand'`, with the generated row in `prev`);
//   - UNSUPPORTED: a slot switched off reads as unsupported with the reason, `existing` kept;
//   - PLATES: a plate entry written into render/plateanchors.js HAND is what plateAnchorsFor gives (the rear end, no front);
//   - PROTECTED: the generator re-run on that car (`node scripts/prop-anchors.mjs <car> --write`) rewrites the generated row and leaves the
//     editor rows, which still win in the reader;
//   - UNDO: { undo: true } puts the generated row back (the hand row gone), and the plate's HAND entry goes;
//   - a bad change writes nothing; the slice files' layout is the generator's (every file reads back byte for byte).
// It writes the real files and puts them back as they were at the end (also on a failure).
//   node scripts/.placements-bake-check.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { startModels } from './modelpatch-load.mjs';
import { applyChanges, sliceNumbers, sliceFile, formatSlice, readSlice, PLATE_FILE } from './placements-lib.mjs';

const ROOT = join(import.meta.dirname, '..');
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const files = [...sliceNumbers(ROOT).map(n => sliceFile(ROOT, n)), join(ROOT, PLATE_FILE)];
const saved = new Map(files.map(f => [f, readFileSync(f, 'utf8')]));
const CAR = 'pickup', PLATE = 'commuter';
try {
  check(sliceNumbers(ROOT).every(n => formatSlice(n, readSlice(ROOT, n)) === readFileSync(sliceFile(ROOT, n), 'utf8')), 'every slice file reads back byte for byte in the generator\'s layout (a write changes only what it changes)');
  let bad = null;
  try { applyChanges(ROOT, { placements: 1, changes: [{ kind: 'prop', car: CAR, slot: 'wing', row: { box: [1, 0, 2, -0.5] } }] }); } catch (err) { bad = err.message; }
  check(bad && files.every(f => readFileSync(f, 'utf8') === saved.get(f)), 'a bad row (no cylinder) is refused and nothing is written (' + bad + ')');

  // ---- write: a wing moved and scaled, the cargo switched off, the commuter's plate rear only ----
  const gen = JSON.parse(saved.get(sliceFile(ROOT, 1))).cars[CAR];
  const wing = { box: [1.2, 0, 2.3, -0.55, 0], cyl: [1.2, 0, 2.27, -0.55], from: 'roof-edge', inset: [0.02, 0.02] };
  const out = applyChanges(ROOT, { placements: 1, changes: [
    { kind: 'prop', car: CAR, slot: 'wing', row: wing },
    { kind: 'prop', car: CAR, slot: 'cargo', row: { no: 'the owner: not this one' } },
    { kind: 'plate', key: PLATE, row: { r: [0.5, -1.73, 0.48, -4], f: null } },
  ] });
  check(out.files.length === 2 && /slice-1\.json/.test(out.files.join()) && /plateanchors\.js/.test(out.files.join()) && /\+\s+"by": "editor"/.test(out.diff), 'the write touches the car\'s slice file and plateanchors.js, and its diff shows the editor row (' + out.files.map(f => f.replace(ROOT + '/', '')).join(', ') + ')');
  const hand = JSON.parse(readFileSync(sliceFile(ROOT, 1), 'utf8')).hand[CAR];
  check(hand?.wing?.by === 'editor' && hand.wing.lim === 'hand' && hand.wing.prev?.src === 'generated' && JSON.stringify(hand.wing.prev.box) === JSON.stringify(gen.wing.box) && hand.wing.box.length === 4,
    'the wing\'s hand row: by editor, lim hand, prev = the generated row (box ' + JSON.stringify(gen.wing.box) + '), a zero turn left out');
  // ---- the generator re-run on the car: the editor rows stay ----
  const run = spawnSync(process.execPath, [join(ROOT, 'scripts/prop-anchors.mjs'), CAR, '--write'], { cwd: ROOT, encoding: 'utf8', timeout: 240000 });
  const after = JSON.parse(readFileSync(sliceFile(ROOT, 1), 'utf8'));
  check(run.status === 0 && after.cars[CAR] && after.hand[CAR]?.wing?.by === 'editor' && after.hand[CAR]?.cargo?.by === 'editor' && /editor rows kept/.test(run.stdout),
    'the generator re-run on ' + CAR + ' (prop-anchors.mjs ' + CAR + ' --write) rewrote its generated row and kept both editor rows, and says so' + (run.status ? ': ' + (run.stderr || run.stdout).slice(-300) : ''));
  // ---- the game's readers, fresh ----
  {
    const { load, close } = await startModels();
    try {
      const P = await load('render/propanchors.js');
      const { plateAnchorsFor } = await load('render/plateanchors.js');
      const { carById } = await load('cars.js');
      const fit = P.fitProp(CAR, 'wing', 'box'), fitC = P.fitProp(CAR, 'wing', 'cylinder'), slots = P.propSlots(CAR);
      check(fit && near(fit.scale, 1.2) && near(fit.position[0], 0) && near(fit.position[1], 2.3 - 0.02) && near(fit.position[2], -0.55) && near(fit.inset, 0.02) && fit.rotationY === 0 && fitC && near(fitC.position[1], 2.27 - 0.02),
      'fitProp reads the written wing back: box at ' + JSON.stringify(fit?.position) + ' scale ' + fit?.scale + ' inset ' + fit?.inset + ' (the centre lowered by the inset), the cylinder too');
      check(slots.wing.confidence === 'hand' && !slots.cargo.supported && slots.cargo.reason === 'the owner: not this one' && slots.roof.supported,
        'propSlots: the wing is the hand row, the cargo unsupported with the owner\'s reason, the roof as generated');
      const plan = plateAnchorsFor(carById(PLATE));
      check(plan.status === 'ok' && plan.ends.join() === 'rear' && near(plan.rear.at[1], 0.5) && near(plan.rear.at[2], -1.73) && near(plan.rear.size[0], 0.48) && plan.rear.pitch === -4 && !plan.front,
        'plateAnchorsFor(' + PLATE + '): the rear plate as written (y 0.5, z -1.73, 0.48 wide, -4 degrees), no front');
    } finally { await close(); }
  }
  // ---- undo: the generated rows back ----
  const undo = applyChanges(ROOT, { placements: 1, changes: [{ kind: 'prop', car: CAR, slot: 'wing', undo: true }, { kind: 'prop', car: CAR, slot: 'cargo', undo: true }, { kind: 'plate', key: PLATE, undo: true }] });
  const back = JSON.parse(readFileSync(sliceFile(ROOT, 1), 'utf8'));
  check(!back.hand[CAR] && undo.results.every(r => r.stored === null) && !readFileSync(join(ROOT, PLATE_FILE), 'utf8').includes(PLATE + ': {'),
    'undo: the hand rows and the plate entry are gone (their prev was the generated row)');
  {
    const { load, close } = await startModels();
    try {
      const P = await load('render/propanchors.js');
      const fit = P.fitProp(CAR, 'wing', 'box');
      check(fit && near(fit.scale, gen.wing.box[0]) && near(fit.position[2], gen.wing.box[3]) && P.propSlots(CAR).cargo.supported === !gen.cargo.no, 'after the undo the reader gives the generated wing again (scale ' + fit?.scale + ') and the cargo as generated');
    } finally { await close(); }
  }
  // ---- a second edit over an editor row keeps the first one in prev (src editor), and undo returns to it ----
  applyChanges(ROOT, { placements: 1, changes: [{ kind: 'prop', car: CAR, slot: 'wing', row: wing }] });
  applyChanges(ROOT, { placements: 1, changes: [{ kind: 'prop', car: CAR, slot: 'wing', row: { ...wing, box: [1.1, 0, 2.3, -0.6], cyl: [1.1, 0, 2.27, -0.6] } }] });
  const two = JSON.parse(readFileSync(sliceFile(ROOT, 1), 'utf8')).hand[CAR].wing;
  applyChanges(ROOT, { placements: 1, changes: [{ kind: 'prop', car: CAR, slot: 'wing', undo: true }] });
  const one = JSON.parse(readFileSync(sliceFile(ROOT, 1), 'utf8')).hand[CAR]?.wing;
  check(two.prev?.src === 'editor' && two.box[0] === 1.1 && one?.by === 'editor' && one.box[0] === 1.2, 'a second edit keeps the first in prev (src editor); undo puts the first back as an editor row');
} finally {
  for (const [f, text] of saved) writeFileSync(f, text);
  check([...saved].every(([f, t]) => readFileSync(f, 'utf8') === t), 'the slice files and plateanchors.js are back as they were');
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
