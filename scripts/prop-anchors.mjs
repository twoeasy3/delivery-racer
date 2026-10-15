// The PROP BOUNDS generator (CHECKLIST 300; the owner, 15-Oct: "Audit every car for roof prop and cargo prop space ... render a Box and a
// Cylinder for each, and this will be our bounds for the customisations ... Do the same for a Rear Wing"; PROP-AUDIT-GUIDE.md). Modelled
// on scripts/plate-anchors.mjs: for the cars of a SLICE (scripts/prop-slices.mjs) it builds each model as the showroom does
// (render/showcar.js makeShowCar) and finds each slot's place with scripts/prop-audit-lib.mjs `optimum` (CHECKLIST 307: the car's triangles,
// that slot's own tagged props hidden, everything else an obstacle; the CANONICAL shapes of render/propanchors.js PROP_BOUNDS at the largest
// uniform scale that stands on the body with at most 5 cm of inset (3 cm preferred), touches nothing and no other slot's shapes, a wing at
// most 95 % of the surface's width and at the rear-most such place; no cap, the MIN_SCALE floor), and writes the slice's GENERATED data file src/delivery/render/propanchors/slice-<n>.json (its `cars`; the file's
// `hand` block, the slice's hand fixes, is kept as it is). The reader merges every slice file (render/propanchors.js).
//   node scripts/prop-anchors.mjs --slice <n>             measure that slice's cars, print the table, write slice-<n>.json
//   node scripts/prop-anchors.mjs --slice <n> --dry       the same, write nothing
//   node scripts/prop-anchors.mjs <car id> [...]          print the entries for those cars only, nothing written
//   node scripts/prop-anchors.mjs <car id> --write        ...and merge them into their slice's file (a NEW CAR, or one car re-measured
//                                                         after a tag; `--into <n>` puts them in another slice file, e.g. slice-0)
//   --json <file>                                         also write every measured car's measurement (free sizes, kinds)
import { writeFileSync } from 'node:fs';
import { readSlice as readSliceFile, writeSlice as writeSliceFile, sliceFile } from './placements-lib.mjs';
import { startModels } from './modelpatch-load.mjs';
import { roster } from './prop-roster.mjs';
import { slicesOf, sliceOfCar } from './prop-slices.mjs';
import { carGeometry, optimum, toEntry } from './prop-audit-lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const dry = args.includes('--dry'), write = args.includes('--write');
const slice = flag('--slice') ? Number(flag('--slice')) : null, into = flag('--into') ? Number(flag('--into')) : null, jsonAt = flag('--json');
const only = args.filter((a, i) => !a.startsWith('--') && !['--json', '--slice', '--into'].includes(args[i - 1]));
const { load, close, ROOT } = await startModels();
// (the slice files are read and written by scripts/placements-lib.mjs, as the model editor's Placements tab writes its hand rows: the
// generator rewrites a file's `cars` only; its `hand` block, the hand fixes and the owner's editor rows (`by: 'editor'`), is kept as it is)
const readSlice = (n) => readSliceFile(ROOT, n);
const writeSlice = (n, data) => {
  writeSliceFile(ROOT, n, data);
  const kept = Object.entries(data.hand || {}).flatMap(([id, h]) => Object.keys(h).filter(s => h[s]?.by === 'editor').map(s => id + ' ' + s));
  console.log('written ' + sliceFile(ROOT, n) + ' (' + Object.keys(data.cars).length + ' cars, ' + Object.keys(data.hand || {}).length + ' hand fixes' + (kept.length ? '; the owner\'s editor rows kept, they win over the generated ones: ' + kept.join(', ') : '') + ')');
};
// the table's entry for one slot (strip the generator's own eyes)
const entry = (e) => { if (!e) return null; if (e.no) return e.existing ? { no: e.no, existing: true } : { no: e.no }; const out = { box: e.box, cyl: e.cyl, from: e.from, lim: e.lim }; if (e.inset) out.inset = e.inset; if (e.existing) out.existing = true; return out; };

// one car's three slots (scripts/prop-audit-lib.mjs: the car's triangles as drawn, each slot's search with that slot's own tagged props
// hidden and everything else an obstacle; NO CAP, the MIN_SCALE floor; the KIND says which slots a car may have at all)
const NO_ROOF = { open: 'an open car: no roof', canopy: 'a canopy or bubble roof: nothing flat to stand on', craft: 'a craft, not a car', tank: 'a tank', micro: 'a microcar: too small', bike: 'a bike' };
const NO_WING = { canopy: 'a canopy roof with no deck or edge', craft: 'a craft', tank: 'a tank', micro: 'a microcar', bike: 'a bike' };
const CARGO_KINDS = new Set(['pickup', 'flatbed', 'halftrack', 'open', 'truck', 'special']);
const measureCar = (model, car, P, glassy) => {
  const g = carGeometry(model, glassy), kind = P.kindOf(car);
  const { opt, info } = optimum(g, P, kind);
  const slot = (name, no, why) => {
    if (no) return { no };
    return toEntry(name, opt[name + '-box'], opt[name + '-cyl'], info, P.maxScale(name, kind)) || { no: why };
  };
  return { kind,
    roof: slot('roof', NO_ROOF[kind], 'no place over the glasshouse takes the smallest roof prop (scale ' + P.MIN_SCALE.roof + ') on the body with at most 5 cm of inset, clear of the wing'),
    cargo: slot('cargo', CARGO_KINDS.has(kind) ? null : 'a closed body: no load deck', 'no deck behind the cab takes the smallest load (scale ' + P.MIN_SCALE.cargo + ') with at most 5 cm of inset, touching nothing'),
    wing: slot('wing', NO_WING[kind], 'no rear deck or roof edge takes the smallest wing (scale ' + P.MIN_SCALE.wing + ') off the glass, with at most 5 cm of inset, touching nothing') };
};

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
