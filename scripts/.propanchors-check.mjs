// A check of the PROP BOUNDS data (render/propanchors/slice-*.json merged by render/propanchors.js; CHECKLIST 300, PROP-AUDIT-GUIDE.md).
// On whatever slice files exist:
//   - every slice file is well formed ({ slice, cars, hand }); every car in one is an in-scope car (scripts/prop-roster.mjs); a car's
//     generated row belongs to the slice scripts/prop-slices.mjs puts it in (or slice-0, the test file)
//   - every entry has the three slots; a supported slot has a box and a cylinder of positive scale between the slot's MIN_SCALE and its
//     cap (the canonical aspect is implied: the table holds only a scale, so no stretching is possible), a centre, a `from` and an inset
//     (if any) of 0 to 0.08 m; an unsupported slot has a reason
//   - the bounds sit on the car: the car is built (makeShowCar) and each supported shape's footprint lies inside the car's box (a small
//     margin), its base no lower than the car's floor and no higher than 0.6 m over the car's top; rays down from just over the shape's
//     own top (so a canopy over a covered bed is ignored) through its footprint's corners hit the car within TOUCH of the shape's base
//     and top-of-inset (the prop stands on the surface)
//   - the hand fixes name real cars and slots, and have the same shape as a generated entry; a row the owner placed in the model editor
//     (`by: 'editor'`, scripts/placements-lib.mjs) is his call: listed, not tested for standing on the surface
//   - the counts, for the eye: supported per slot, reasons
//   --complete   (the owner, at the end of the sweep) every in-scope car has an entry, else FAIL; without it, missing cars are listed only
//   node scripts/.propanchors-check.mjs [--complete]
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';
import { roster } from './prop-roster.mjs';

const complete = process.argv.includes('--complete');
const TOUCH = 0.06, MARGIN = 0.12;
const { load, close } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const P = await load('render/propanchors.js');
  const PC = await load('render/propcosmetic.js');
  const { makeShowCar } = await load('render/showcar.js');
  const cars = roster(C, IDEA_CARS), byId = new Map(cars.map(c => [c.car.id, c]));
  // the files
  const badFile = [], seenIn = new Map();
  for (const s of P.SLICES) {
    if (typeof s.slice !== 'number' || typeof s.cars !== 'object' || (s.hand && typeof s.hand !== 'object')) badFile.push(s.file + ' malformed');
    for (const id of Object.keys(s.cars || {})) {
      if (!byId.has(id)) badFile.push(s.file + ': ' + id + ' is not an in-scope car');
      else if (s.slice !== 0 && seenIn.has(id) && seenIn.get(id) !== s.slice) badFile.push(s.file + ': ' + id + ' is also in slice ' + seenIn.get(id)); // (the slices are consolidated: a promotion of cars moves them between the generated groups, so a car's slice file is not checked against the partition any more, only that no car is in two)
      if (s.slice !== 0) seenIn.set(id, s.slice);
    }
    for (const id of Object.keys(s.hand || {})) if (!byId.has(id)) badFile.push(s.file + ' hand: ' + id + ' is not an in-scope car');
  }
  check(P.SLICES.length > 0, 'slice files found: ' + P.SLICES.map(s => s.file.replace('./propanchors/', '') + ' (' + Object.keys(s.cars || {}).length + ')').join(', '));
  check(!badFile.length, 'every slice file is well formed and holds its own in-scope cars' + (badFile.length ? ': ' + badFile.slice(0, 6).join('; ') : ''));
  // the entries
  const ids = Object.keys(P.PROP_TABLE).filter(id => byId.has(id));
  const shapeOk = (e, slot, kind) => Array.isArray(e) && e.length >= 4 && e.length <= 5 && e.every(Number.isFinite) && e[0] >= P.MIN_SCALE[slot] - 1e-9 && e[0] <= P.maxScale(slot, kind) + 1e-9;
  const badEntry = [], badHand = [];
  for (const id of ids) {
    const e = P.PROP_TABLE[id], kind = P.kindOf(byId.get(id).car);
    for (const slot of P.SLOTS) {
      const s = e[slot];
      if (!s) { badEntry.push(id + ' ' + slot + ' missing'); continue; }
      if (s.no) { if (typeof s.no !== 'string' || !s.no.length) badEntry.push(id + ' ' + slot + ' unsupported with no reason'); continue; }
      if (!shapeOk(s.box, slot, kind) || !shapeOk(s.cyl, slot, kind) || !s.from) badEntry.push(id + ' ' + slot + ' box/cyl not [scale in range, x, y, z] with a from');
      if (s.inset !== undefined && !(Array.isArray(s.inset) && s.inset.length === 2 && s.inset.every(v => Number.isFinite(v) && v >= 0 && v <= 0.08 + 1e-9))) badEntry.push(id + ' ' + slot + ' inset not [box, cyl] within 0 to 0.08 m');
    }
  }
  for (const [id, h] of Object.entries(P.HAND)) for (const [slot, s] of Object.entries(h)) {
    if (!P.SLOTS.includes(slot)) { badHand.push(id + ' ' + slot); continue; }
    if (s.no ? typeof s.no !== 'string' : !(shapeOk(s.box, slot, P.kindOf(byId.get(id)?.car || {})) && shapeOk(s.cyl, slot, P.kindOf(byId.get(id)?.car || {})))) badHand.push(id + ' ' + slot + ' not the generated shape');
  }
  check(!badEntry.length, 'every entry has roof, cargo, wing: supported ones a box and a cylinder of positive scale within the slot\'s range, a centre and a from; unsupported ones a reason (' + ids.length + ' entries)' + (badEntry.length ? ': ' + badEntry.slice(0, 6).join('; ') : ''));
  check(!badHand.length, 'every hand fix names a real car and slot, in the generated shape (' + Object.keys(P.HAND).length + ' hand fixes)' + (badHand.length ? ': ' + badHand.slice(0, 6).join('; ') : ''));
  // on the car
  const ray = new THREE.Raycaster(), from = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  const offCar = [], floating = [], ownerRows = [];
  for (const id of ids) {
    let model;
    try { model = makeShowCar(byId.get(id).car); } catch { continue; }
    model.parent?.remove(model); model.userData.animate?.(0); model.updateMatrixWorld(true);
    PC.hideProps(model);
    const box = new THREE.Box3().setFromObject(model, true);
    // (the surface: visible meshes only, and none under a hidden parent: a model that builds several styles and hides all but one, as the
    // GT does, must not offer its hidden roofs and wings as a surface; the measure lib skips them the same way)
    const kit = model.userData.kit?.isObject3D ? model.userData.kit : null; // (the Super kit's group is no surface, as in the measure lib)
    const meshes = []; model.traverse(n => { if (!n.isMesh || n.userData.prop) return; for (let p = n; p; p = p.parent) if (p.visible === false || p === kit) return; meshes.push(n); });
    const plan = P.propSlots(id);
    for (const slot of P.SLOTS) {
      const s = plan[slot];
      if (!s.supported) continue;
      if (P.HAND[id]?.[slot]?.by === 'editor') { ownerRows.push(id + ' ' + slot); continue; } // (placed by the owner in the model editor: his call, not tested for standing on the surface)
      for (const [name, sh] of [['box', s.box], ['cyl', s.cylinder]]) {
        const half = name === 'box' ? [sh.size[0] / 2, sh.size[1] / 2, sh.size[2] / 2] : sh.axis === 'x' ? [sh.height / 2, sh.radius, sh.radius] : [sh.radius, sh.height / 2, sh.radius];
        const [cx, cy, cz] = sh.centre, inset = sh.inset || 0, top = cy - half[1], base = top - inset; // (top: the base before the inset; base: as placed)
        if (cx - half[0] < box.min.x - MARGIN || cx + half[0] > box.max.x + MARGIN || cz - half[2] < box.min.z - MARGIN || cz + half[2] > box.max.z + MARGIN || base < box.min.y || base > box.max.y + 0.6) offCar.push(id + ' ' + slot + ' ' + name);
        // the surface under its footprint (the corners and the centre; a roof-edge wing: its front half, the rest hangs in the air): the
        // highest point within TOUCH of `top`, the lowest within TOUCH of `base` (so the inset is what the surface asks for)
        // (a WING stands on its stands, about a third of its width out from the centre, and its blade's ends may reach over a crowned deck's
        // fall or a roof's edge: its stand line is tested; one whose rear hangs back over the tail ('roof-edge', 'deck-edge'): the front half)
        const pts = slot === 'wing' ? (s.from === 'roof-edge' || s.from === 'deck-edge' ? [[cx, cz + half[2] * 0.6], [cx - half[0] * 0.3, cz + half[2] * 0.6], [cx + half[0] * 0.3, cz + half[2] * 0.6]]
          : [[cx, cz], [cx - half[0] * 0.3, cz - half[2] * 0.6], [cx + half[0] * 0.3, cz - half[2] * 0.6], [cx - half[0] * 0.3, cz + half[2] * 0.6], [cx + half[0] * 0.3, cz + half[2] * 0.6]])
          : s.from === 'roof-edge' ? [[cx, cz + half[2] * 0.6], [cx - half[0] * 0.9, cz + half[2] * 0.9], [cx + half[0] * 0.9, cz + half[2] * 0.9]]
          : name === 'cyl' && sh.axis === 'y' ? [[cx, cz], ...[0, 1, 2, 3].map(k => [cx + half[0] * 0.9 * Math.cos(k * Math.PI / 2 + Math.PI / 4), cz + half[2] * 0.9 * Math.sin(k * Math.PI / 2 + Math.PI / 4)])] // (a standing cylinder: its rim, not its bounding square's corners)
          : [[cx, cz], [cx - half[0] * 0.9, cz - half[2] * 0.9], [cx + half[0] * 0.9, cz - half[2] * 0.9], [cx - half[0] * 0.9, cz + half[2] * 0.9], [cx + half[0] * 0.9, cz + half[2] * 0.9]];
        const hs = [];
        // (the rays start just over the shape's own top, not over the whole car: a canopy or a cab-over above a covered bed is not its surface)
        for (const [x, z] of pts) { from.set(x, cy + half[1] + 0.05, z); ray.set(from, down); const hit = ray.intersectObjects(meshes, false)[0]; if (hit) hs.push(hit.point.y); }
        if (!hs.length) { floating.push(id + ' ' + slot + ' ' + name + ' (nothing under it)'); continue; }
        const hi = Math.max(...hs), lo = Math.min(...hs);
        if (Math.abs(hi - top) > TOUCH || lo < base - TOUCH - 0.02) floating.push(id + ' ' + slot + ' ' + name + ' (surface ' + lo.toFixed(2) + '..' + hi.toFixed(2) + ', base ' + base.toFixed(2) + ', top ' + top.toFixed(2) + ')');
      }
    }
  }
  if (ownerRows.length) console.log('        the owner\'s editor rows (by: editor), not tested on the surface: ' + ownerRows.join(', '));
  check(!offCar.length, 'every supported shape lies over the car (footprint inside its box + ' + MARGIN + ' m, base between its floor and 0.6 m over its top)' + (offCar.length ? ': ' + offCar.slice(0, 8).join('; ') : ''));
  check(!floating.length, 'every supported shape stands on the car\'s surface (a ray down through it meets the body within ' + TOUCH + ' m of its base)' + (floating.length ? ': ' + floating.slice(0, 8).join('; ') : ''));
  // the counts
  for (const slot of P.SLOTS) {
    const yes = ids.filter(id => !P.PROP_TABLE[id][slot].no), reasons = {};
    for (const id of ids) { const n = P.PROP_TABLE[id][slot].no; if (n) reasons[n] = (reasons[n] || 0) + 1; }
    console.log('        ' + slot + ': supported ' + yes.length + ' of ' + ids.length + ', existing prop on ' + yes.filter(id => P.PROP_TABLE[id][slot].existing).length + '; unsupported: ' + Object.entries(reasons).map(([r, n]) => n + ' x ' + r).join('; '));
  }
  const missing = cars.filter(c => !P.PROP_TABLE[c.car.id]).map(c => c.car.id);
  if (complete) check(!missing.length, 'every in-scope car has an entry (' + cars.length + ' cars)' + (missing.length ? ': ' + missing.length + ' missing: ' + missing.slice(0, 12).join(', ') + (missing.length > 12 ? '...' : '') : ''));
  else console.log('        (' + ids.length + ' of ' + cars.length + ' in-scope cars have an entry; ' + missing.length + ' to go' + (missing.length ? ', e.g. ' + missing.slice(0, 8).join(', ') : '') + '; run with --complete at the end of the sweep)');
} finally { await close(); }
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
