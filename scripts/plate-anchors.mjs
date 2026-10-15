// The NUMBER PLATE ANCHOR generator (CHECKLIST 286; src/delivery/render/plateanchors.js is the table's reader, render/plateanchorstable.js the
// table this writes). For every car model it builds the model as the showroom does (render/showcar.js makeShowCar), takes the car's
// existing plates off, and asks scripts/plate-search.mjs for the best place at the back and the front (rays along the car on a grid over
// the plate and a margin round it, paintwork only, within reach of the car's end, one plane, upright enough, nothing in front; the
// canonical 0.52 x 0.13 plate first, else 0.46 / 0.40 / 0.34 / 0.30 wide). It writes no ROUGH flag any more (an old entry may carry one:
// with a flag (r5 = 1), the hand list in plateanchors.js is where those are looked at and fixed. A model the audit
// (src/delivery/plates-audit.json) calls "cannot" (craft, open-wheelers, bikes, saucers) is NOT shot: it goes in the table's `none` list.
// A car whose model is the same as another's (a Super with its body kit, an earned reskin) gets its OWN entry only where its back or
// front differs from its base model's (by more than DIFF); Legendary cars are never dressed, so they get none.
//   node scripts/plate-anchors.mjs                     all cars: print the stats, write render/plateanchorstable.js
//   node scripts/plate-anchors.mjs --dry               the same, write nothing
//   node scripts/plate-anchors.mjs <car id> [...]      print the entry for those cars only (an id from cars.js / ideas.js); nothing written
//   node scripts/plate-anchors.mjs <car id> --write    ...and merge the entry into the table (a NEW CAR: do this, then look at it:
//                                                      scripts/shots.mjs ?platedesign=classic&car=<id>, see CAR-AGENT-PROMPT.md)
// THE SEARCH is scripts/plate-search.mjs (since the 15-Oct placement audit); check a result with scripts/plate-placement-audit.mjs <car id>.
// Units: car-local metres, x across, y up, the nose at +z. An end is [y, z, width, pitch (degrees), flag?]: z is the outermost
// surface under the plate's middle (the plate stands a few mm off it), the height is width / 4, x is 0.
import * as THREE from 'three';
import { readFileSync, writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';
import { makeView, searchPlace } from './plate-search.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry'), write = args.includes('--write'), only = args.filter(a => !a.startsWith('--'));
const { load, close, ROOT } = await startModels();
const TABLE = ROOT + '/src/delivery/render/plateanchorstable.js';
const DIFF = 0.012; // m: a variant whose place differs from its base model's by more than this gets an entry of its own
const r3 = (v) => Math.round(v * 1000) / 1000;

try {
  const C = await load('cars.js');
  const { makeShowCar } = await load('render/showcar.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { glassy } = await load('render/dents.js');
  const P = await load('render/platecosmetic.js');
  const audit = JSON.parse(readFileSync(ROOT + '/src/delivery/plates-audit.json', 'utf8'));
  const cannot = new Set(audit.anchors.filter(a => a.rear.category === 'cannot' && a.front.category === 'cannot').map(a => a.model));

  // every car that can be shown, with the group it is in (traffic kinds share the roster's models; not repeated here)
  const cars = [];
  const add = (group, car) => { if (car && !cars.some(c => c.car.id === car.id)) cars.push({ group, car }); };
  for (const car of C.CARS) add('garage', car);
  for (const car of C.FILLER_CARS) add('filler', car);
  for (const car of C.BESPOKE_CARS) add('bespoke', car);
  for (const car of C.EVENT_CARS) add('event', car);
  for (const car of C.EARNED_CARS) add(car.legend ? 'legendary' : 'earned', car);
  for (const car of Object.values(C.SECRET_CARS)) add('secret', car);
  for (const car of Object.values(C.LEVEL_CARS)) add('level', car);
  add('level', C.AMPHIBIOUS_TANK);
  for (const car of IDEA_CARS) add('idea', car);
  for (const car of C.CARS) add('super', C.superOf(car));
  const keyOf = (car) => car.model || car.id;

  // ---- every car ----
  const wanted = (c) => !only.length || only.includes(c.car.id);
  const found = new Map(); // car id -> { key, rear, front }
  for (const { group, car } of cars) {
    if (group === 'legendary' || !wanted({ car })) continue; // (a Legendary car keeps its own plates: never dressed)
    const key = keyOf(car);
    if (cannot.has(key) || car.ufo) { found.set(car.id, { key, group, none: true }); continue; }
    let model;
    try { model = makeShowCar(car); } catch (err) { found.set(car.id, { key, group, error: err.message }); continue; }
    P.setExistingPlatesVisible(model, false);
    const existing = P.existingPlates(model);
    const ex = (face) => { const p = existing.find(e => e.face === face); if (!p) return null; const b = new THREE.Box3().setFromObject(p.mesh, true); return (b.min.y + b.max.y) / 2; };
    // the place search of the plate placement audit (scripts/plate-search.mjs, CHECKLIST 307; the old search here let a ray run under the
    // car to the back of the other bumper and stood plates over a bumper's top edge)
    const hubs = model.userData.wheelHubs || {}, wheels = new Set(['tyres', 'hubs', 'parts', 'rings'].flatMap(x => hubs[x] || []));
    const sview = makeView(model, { glassy, wheels });
    const best = (end) => { const c = searchPlace(sview, end, { preferY: ex(end) })[0]; return c ? { y: r3(c.y), z: r3(c.z), w: c.w, pitch: Math.round(c.pitch * 10) / 10, rough: false } : null; };
    found.set(car.id, { key, group, rear: best('rear'), front: best('front'), had: existing.map(e => e.face) });
  }

  // ---- the table: one entry per model (its base car's), an entry of its own for a variant that differs ----
  const table = new Map(), none = new Set();
  const entryOf = (f) => ({ r: f.rear, f: f.front });
  const same = (a, b) => (!a && !b) || (a && b && Math.abs(a.y - b.y) <= 0.04 && Math.abs(a.z - b.z) <= DIFF && a.w === b.w && Math.abs(a.pitch - b.pitch) < 4 && a.rough === b.rough);
  const baseGroups = ['garage', 'filler', 'bespoke', 'event', 'secret', 'level', 'idea', 'earned'];
  for (const { group, car } of cars) {
    const f = found.get(car.id);
    if (!f || f.error) continue;
    if (f.none) { none.add(f.key); continue; }
    if (!baseGroups.includes(group) || car.super) continue;
    if (!table.has(f.key)) table.set(f.key, { ...entryOf(f), by: car.id });
  }
  const variants = new Map();
  for (const { car } of cars) {
    const f = found.get(car.id);
    if (!f || f.error || f.none) continue;
    const base = table.get(f.key);
    if (!base) { if (!table.has(f.key)) table.set(f.key, { ...entryOf(f), by: car.id }); continue; }
    if (base.by === car.id) continue;
    if (!same(base.r, f.rear) || !same(base.f, f.front)) variants.set(car.id, entryOf(f));
  }

  const fmt = (e) => (e ? '[' + [e.y, e.z, e.w, e.pitch, ...(e.rough ? [1] : [])].join(', ') + ']' : null);
  const lineOf = (name, e) => '  ' + (/^[A-Za-z_$][\w$]*$/.test(name) ? name : "'" + name + "'") + ': { r: ' + fmt(e.r) + ', f: ' + fmt(e.f) + ' },';
  const keys = [...table.keys()].sort(), vkeys = [...variants.keys()].sort();
  const text = '// GENERATED by scripts/plate-anchors.mjs (run it again, or with a car id and --write, to add a car): do not edit by hand. Hand fixes and\n'
    + '// the rules for reading this are in plateanchors.js. An end is [y, z, width, pitch (degrees)] in car-local metres (x across, y up, the nose\n'
    + '// at +z), the plate is width / 4 high and centred (x = 0), z is the outermost surface under it; a 5th number 1 = ROUGH (not flat enough to trust:\n'
    + '// look at it). null = no place for a plate at that end. KEY = a car\'s `model` (else its id); an entry under a car id is a variant (a Super\'s\n'
    + '// body kit, an earned reskin) whose back or front differs from its base model\'s.\n'
    + 'export const PLATE_TABLE = {\n' + keys.map(k => lineOf(k, table.get(k))).join('\n') + '\n};\n'
    + 'export const PLATE_VARIANTS = {\n' + vkeys.map(k => lineOf(k, variants.get(k))).join('\n') + '\n};\n'
    + '// models that can wear no plate (craft, open-wheelers, bikes, saucers: the audit\'s "cannot" list)\n'
    + 'export const PLATE_NONE = [' + [...none].sort().map(k => "'" + k + "'").join(', ') + '];\n';

  if (only.length) {
    for (const id of only) {
      const f = found.get(id);
      if (!f) { console.log(id + ': no such car (or a Legendary one: they are never dressed)'); continue; }
      console.log(id + ' (' + f.key + '): ' + (f.none ? 'NONE (a craft, open-wheeler, bike or saucer)' : f.error ? 'could not build: ' + f.error : 'rear ' + fmt(f.rear) + '  front ' + fmt(f.front)));
    }
    if (write) {
      // merge the cars given into the existing table file
      const old = await import('file://' + TABLE + '?t=' + Date.now());
      const T = { ...old.PLATE_TABLE }, V = { ...old.PLATE_VARIANTS }, N = new Set(old.PLATE_NONE);
      for (const id of only) {
        const f = found.get(id);
        if (!f || f.error) continue;
        if (f.none) { N.add(f.key); continue; }
        const car = cars.find(c => c.car.id === id).car;
        if (car.super || f.key !== keyOf(car) || T[f.key]) V[id] = { r: f.rear ? [f.rear.y, f.rear.z, f.rear.w, f.rear.pitch, ...(f.rear.rough ? [1] : [])] : null, f: f.front ? [f.front.y, f.front.z, f.front.w, f.front.pitch, ...(f.front.rough ? [1] : [])] : null };
        else T[f.key] = { r: f.rear ? [f.rear.y, f.rear.z, f.rear.w, f.rear.pitch, ...(f.rear.rough ? [1] : [])] : null, f: f.front ? [f.front.y, f.front.z, f.front.w, f.front.pitch, ...(f.front.rough ? [1] : [])] : null };
      }
      const line = (name, e) => '  ' + (/^[A-Za-z_$][\w$]*$/.test(name) ? name : "'" + name + "'") + ': { r: ' + JSON.stringify(e.r).replace(/,/g, ', ') + ', f: ' + JSON.stringify(e.f).replace(/,/g, ', ') + ' },';
      const head = text.slice(0, text.indexOf('export const PLATE_TABLE'));
      writeFileSync(TABLE, head + 'export const PLATE_TABLE = {\n' + Object.keys(T).sort().map(k => line(k, T[k])).join('\n') + '\n};\nexport const PLATE_VARIANTS = {\n'
        + Object.keys(V).sort().map(k => line(k, V[k])).join('\n') + '\n};\n// models that can wear no plate (craft, open-wheelers, bikes, saucers: the audit\'s "cannot" list)\nexport const PLATE_NONE = [' + [...N].sort().map(k => "'" + k + "'").join(', ') + '];\n');
      console.log('merged into ' + TABLE);
    }
  } else {
    // ---- the numbers ----
    const ends = { both: [], rear: [], front: [], neither: [] }, roughs = [];
    for (const k of keys) {
      const e = table.get(k), r = e.r && !e.r.rough, f = e.f && !e.f.rough;
      (r && f ? ends.both : r ? ends.rear : f ? ends.front : ends.neither).push(k);
      if ((e.r && e.r.rough) || (e.f && e.f.rough)) roughs.push(k + ' (' + (e.r?.rough ? 'rear ' : '') + (e.f?.rough ? 'front' : '') + ')');
    }
    console.log('models with an entry: ' + keys.length + ' (+ ' + vkeys.length + ' variants), explicit none: ' + none.size + ' [' + [...none].sort().join(', ') + ']');
    console.log('ends reliable: both ' + ends.both.length + ', rear only ' + ends.rear.length + ', front only ' + ends.front.length + ', neither ' + ends.neither.length);
    console.log('neither (no strict place): ' + ends.neither.join(', '));
    console.log('rough ends (to be looked at): ' + roughs.join(', '));
    console.log('variants: ' + vkeys.join(', '));
    console.log('errors: ' + [...found].filter(([, f]) => f.error).map(([id, f]) => id + ' ' + f.error).join('; '));
    if (!dry) { writeFileSync(TABLE, text); console.log('written ' + TABLE); }
  }
} finally {
  await close();
}
