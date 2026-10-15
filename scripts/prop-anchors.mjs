// The PROP BOUNDS generator (CHECKLIST 300; the owner, 15-Oct: "Audit every car for roof prop and cargo prop space ... render a Box and a
// Cylinder for each, and this will be our bounds for the customisations ... Do the same for a Rear Wing"; PROP-AUDIT-GUIDE.md). Modelled
// on scripts/plate-anchors.mjs: for the cars of a SLICE (scripts/prop-slices.mjs) it builds each model as the showroom does
// (render/showcar.js makeShowCar), hides the car's own tagged props (render/propcosmetic.js), rasterises the top surface and measures the
// free flat space of the three slots (scripts/prop-anchors-lib.mjs), fits the CANONICAL shapes (render/propanchors.js PROP_BOUNDS) at the
// largest uniform scale, and writes the slice's GENERATED data file src/delivery/render/propanchors/slice-<n>.json (its `cars`; the file's
// `hand` block, the slice's hand fixes, is kept as it is). The reader merges every slice file (render/propanchors.js).
//   node scripts/prop-anchors.mjs --slice <n>             measure that slice's cars, print the table, write slice-<n>.json
//   node scripts/prop-anchors.mjs --slice <n> --dry       the same, write nothing
//   node scripts/prop-anchors.mjs <car id> [...]          print the entries for those cars only, nothing written
//   node scripts/prop-anchors.mjs <car id> --write        ...and merge them into their slice's file (a NEW CAR, or one car re-measured
//                                                         after a tag; `--into <n>` puts them in another slice file, e.g. slice-0)
//   --json <file>                                         also write every measured car's measurement (free sizes, kinds)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';
import { roster } from './prop-roster.mjs';
import { slicesOf, sliceOfCar } from './prop-slices.mjs';
import { measureCar } from './prop-anchors-lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const dry = args.includes('--dry'), write = args.includes('--write');
const slice = flag('--slice') ? Number(flag('--slice')) : null, into = flag('--into') ? Number(flag('--into')) : null, jsonAt = flag('--json');
const only = args.filter((a, i) => !a.startsWith('--') && !['--json', '--slice', '--into'].includes(args[i - 1]));
const { load, close, ROOT } = await startModels();
const fileOf = (n) => ROOT + '/src/delivery/render/propanchors/slice-' + n + '.json';
const readSlice = (n) => (existsSync(fileOf(n)) ? JSON.parse(readFileSync(fileOf(n), 'utf8')) : { slice: n, cars: {}, hand: {} });
const writeSlice = (n, data) => {
  const cars = {};
  for (const id of Object.keys(data.cars).sort()) cars[id] = data.cars[id];
  writeFileSync(fileOf(n), JSON.stringify({ slice: n, note: 'GENERATED `cars` by scripts/prop-anchors.mjs --slice ' + n + ' (do not edit); `hand` is this slice\'s hand fixes (render/propanchors.js), edited by hand', cars, hand: data.hand || {} }, null, 1).replace(/\[\n\s+([^[\]]*?)\n\s+\]/gs, (m, inner) => '[' + inner.replace(/,\n\s+/g, ', ') + ']') + '\n');
  console.log('written ' + fileOf(n) + ' (' + Object.keys(cars).length + ' cars, ' + Object.keys(data.hand || {}).length + ' hand fixes)');
};
// the table's entry for one slot (strip the generator's own eyes)
const entry = (e) => { if (!e) return null; if (e.no) return e.existing ? { no: e.no, existing: true } : { no: e.no }; const out = { box: e.box, cyl: e.cyl, from: e.from, lim: e.lim }; if (e.inset) out.inset = e.inset; if (e.existing) out.existing = true; return out; };

// measure: every car of `list` ([{ group, car }])
export const generate = async (load, list) => {
  const { makeShowCar } = await load('render/showcar.js');
  const { glassy } = await load('render/dents.js');
  const P = await load('render/propanchors.js');
  const PC = await load('render/propcosmetic.js');
  const found = new Map();
  for (const { group, car } of list) {
    let model;
    try { model = makeShowCar(car); } catch (err) { found.set(car.id, { group, error: err.message }); continue; }
    model.parent?.remove(model);
    model.userData.animate?.(0);
    const props = PC.existingProps(model);
    PC.hideProps(model);
    const m = measureCar(model, car, P, glassy);
    for (const slot of P.SLOTS) if (props.some(p => p.slot === slot)) m[slot].existing = true; // (on an unsupported slot too: the car has its own, and no place for another)
    found.set(car.id, { group, kind: m.kind, roof: m.roof, cargo: m.cargo, wing: m.wing, props: props.map(p => p.slot) });
  }
  return found;
};
const line = (id, f) => {
  if (f.error) return id.padEnd(16) + ' could not build: ' + f.error;
  const cell = (e) => (e.no ? 'no (' + e.no + ')' : 'YES s' + e.box[0] + (e.inset ? ' inset ' + Math.round(e.inset[0] * 100) + 'cm' : '') + (e.existing ? ' existing' : ''));
  return id.padEnd(16) + ' ' + f.kind.padEnd(9) + ' roof ' + cell(f.roof).padEnd(34) + ' cargo ' + cell(f.cargo).padEnd(34) + ' wing ' + cell(f.wing);
};

try {
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const P = await load('render/propanchors.js');
  const cars = roster(C, IDEA_CARS);
  let list;
  if (slice) list = slicesOf(cars)[slice - 1];
  else if (only.length) list = cars.filter(c => only.includes(c.car.id));
  else { console.log('say which: --slice <n> (1 to 5), or car ids (with --write to merge them into their slice file)'); process.exit(1); }
  if (!list || !list.length) { console.log('no cars'); process.exit(1); }
  const found = await generate(load, list);
  console.log('car              kind      roof                                    cargo                                   wing');
  for (const [id, f] of found) console.log(line(id, f));
  const ok = [...found].filter(([, f]) => !f.error);
  if (slice) {
    const stats = {};
    for (const s of P.SLOTS) { const yes = ok.filter(([, f]) => !f[s].no); const reasons = {}; for (const [, f] of ok) if (f[s].no) reasons[f[s].no] = (reasons[f[s].no] || 0) + 1; stats[s] = { yes: yes.length, existing: yes.filter(([, f]) => f[s].existing).length, reasons }; }
    console.log('slice ' + slice + ': ' + list.length + ' cars, ' + ok.length + ' measured, ' + (found.size - ok.length) + ' errors');
    for (const s of P.SLOTS) console.log('  ' + s + ': supported ' + stats[s].yes + ' (existing prop on ' + stats[s].existing + '), unsupported ' + (ok.length - stats[s].yes) + ': ' + Object.entries(stats[s].reasons).map(([r, n]) => n + ' x ' + r).join('; '));
    if (!dry) {
      const data = readSlice(slice);
      data.cars = {};
      for (const [id, f] of ok) data.cars[id] = { roof: entry(f.roof), cargo: entry(f.cargo), wing: entry(f.wing) };
      writeSlice(slice, data);
    }
  } else if (write) {
    const bySlice = new Map();
    for (const [id, f] of ok) { const n = into ?? sliceOfCar(cars, id); if (!bySlice.has(n)) bySlice.set(n, readSlice(n)); bySlice.get(n).cars[id] = { roof: entry(f.roof), cargo: entry(f.cargo), wing: entry(f.wing) }; }
    for (const [n, data] of bySlice) writeSlice(n, data);
  }
  if (jsonAt) {
    const out = {};
    for (const [id, f] of found) if (!f.error) out[id] = { group: f.group, kind: f.kind, props: f.props, roof: strip(f.roof), cargo: strip(f.cargo), wing: strip(f.wing) };
    writeFileSync(jsonAt, JSON.stringify(out));
    console.log('measurements written to ' + jsonAt);
  }
} finally {
  await close();
}
function strip(e) { if (!e) return null; const { region, ...rest } = e; void region; return rest; }
