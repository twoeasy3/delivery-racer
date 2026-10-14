// The NUMBER PLATE ANCHOR generator (CHECKLIST 286; src/delivery/render/plateanchors.js is the table's reader, render/plateanchorstable.js the
// table this writes). For every car model it builds the model as the showroom does (render/showcar.js makeShowCar), takes the car's
// existing plates off, and SHOOTS RAYS at the back and the front: a plate-sized grid of rays at each height, the first thing each ray
// hits (glass, a lamp, a see-through part do not count as a place to stand a plate on), a plane fitted through the hits (its tilt is
// the plate's pitch), and the height with the flattest, lowest-slung, best-looking place wins. Sizes are the plate's 4:1 shape:
// 0.52 x 0.13, else 0.40 x 0.10, else 0.30 x 0.075. A place flatter than STRICT is "reliable"; one that is only ROUGH is written
// with a flag (r5 = 1), the hand list in plateanchors.js is where those are looked at and fixed. A model the audit
// (src/delivery/plates-audit.json) calls "cannot" (craft, open-wheelers, bikes, saucers) is NOT shot: it goes in the table's `none` list.
// A car whose model is the same as another's (a Super with its body kit, an earned reskin) gets its OWN entry only where its back or
// front differs from its base model's (by more than DIFF); Legendary cars are never dressed, so they get none.
//   node scripts/plate-anchors.mjs                     all cars: print the stats, write render/plateanchorstable.js
//   node scripts/plate-anchors.mjs --dry               the same, write nothing
//   node scripts/plate-anchors.mjs <car id> [...]      print the entry for those cars only (an id from cars.js / ideas.js); nothing written
//   node scripts/plate-anchors.mjs <car id> --write    ...and merge the entry into the table (a NEW CAR: do this, then look at it:
//                                                      scripts/shots.mjs ?platedesign=classic&car=<id>, see CAR-AGENT-PROMPT.md)
// Units: car-local metres, x across, y up, the nose at +z. An end is [y, z, width, pitch (degrees), flag?]: z is the outermost
// surface under the plate's middle (the plate stands a few mm off it), the height is width / 4, x is 0.
import * as THREE from 'three';
import { readFileSync, writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry'), write = args.includes('--write'), only = args.filter(a => !a.startsWith('--'));
const { load, close, ROOT } = await startModels();
const TABLE = ROOT + '/src/delivery/render/plateanchorstable.js';
const SIZES = [0.52, 0.40, 0.30];                 // plate widths tried, the height is a quarter of it
const STRICT = 0.010, ROUGH = 0.026;              // m: the most a place may stand off its fitted plane
const MAX_PITCH = 32, ROUGH_PITCH = 42, MAX_YAW = 6; // degrees
const Y_LO = 0.24, DIFF = 0.012;
const NX = 9, NY = 4;
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

  // ---- the rays ----
  const ray = new THREE.Raycaster(), origin = new THREE.Vector3(), dir = new THREE.Vector3();
  const prepare = (model) => {
    P.setExistingPlatesVisible(model, false);
    model.updateMatrixWorld(true);
    const body = model.userData.body, bodyMat = body?.material, meshes = [];
    model.traverse((n) => {
      if (!n.isMesh || n.isInstancedMesh || !n.visible || n.userData.wheelRing || !n.geometry) return;
      let hidden = false;
      for (let p = n; p; p = p.parent) if (p.visible === false) hidden = true;
      if (hidden) return;
      const m = [].concat(n.material)[0];
      if (!m || (m.transparent && m.opacity < 0.95)) return; // (see-through: not a surface)
      const lamp = m.isMeshBasicMaterial || (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0.25);
      const glass = n !== body && m !== bodyMat && glassy(m);
      n.userData._kind = lamp ? 'lamp' : glass ? 'glass' : 'ok';
      meshes.push(n);
    });
    const box = new THREE.Box3().setFromObject(model, true);
    return { meshes, box };
  };
  // the first surface a ray meets from outside the end; null = a miss, 'bad' = glass or a lamp
  const shoot = (view, end, x, y) => {
    const s = end === 'rear' ? -1 : 1;
    origin.set(x, y, s * (Math.max(Math.abs(view.box.min.z), Math.abs(view.box.max.z)) + 1));
    dir.set(0, 0, -s);
    ray.set(origin, dir);
    const hit = ray.intersectObjects(view.meshes, false)[0];
    if (!hit) return null;
    return hit.object.userData._kind === 'ok' ? hit.point.z : 'bad';
  };
  // a plate of width w centred at height y: the plane through the hits; null if any ray misses or meets glass or a lamp
  const fit = (view, end, w, y) => {
    const h = w / 4, zs = [], rows = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
      const x = -w / 2 + w * (i + 0.5) / NX, yy = y - h / 2 + h * (j + 0.5) / NY, z = shoot(view, end, x, yy);
      if (z === null || z === 'bad') return null;
      zs.push(z); rows.push([x, yy - y]);
    }
    // z = a + b * dy + c * x, least squares
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
    const n = zs.length;
    for (let k = 0; k < n; k++) { const [x, dy] = rows[k], z = zs[k]; sx += x; sy += dy; sxx += x * x; syy += dy * dy; sxy += x * dy; sz += z; sxz += x * z; syz += dy * z; }
    const M = [[n, sy, sx], [sy, syy, sxy], [sx, sxy, sxx]], R = [sz, syz, sxz];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M);
    if (Math.abs(D) < 1e-12) return null;
    const col = (k) => det(M.map((row, i) => row.map((v, j) => (j === k ? R[i] : v))));
    const a = col(0) / D, b = col(1) / D, c = col(2) / D;
    let dev = 0, out = end === 'rear' ? Infinity : -Infinity;
    for (let k = 0; k < n; k++) {
      const [x, dy] = rows[k], flat = zs[k] - b * dy - c * x;
      dev = Math.max(dev, Math.abs(zs[k] - (a + b * dy + c * x)));
      out = end === 'rear' ? Math.min(out, flat) : Math.max(out, flat); // (the plate stands on the outermost of them)
    }
    return { z: out, pitch: Math.atan(b) * 180 / Math.PI, yaw: Math.atan(c) * 180 / Math.PI, dev, w };
  };
  // the best place at one end: { y, z, w, pitch, rough } or null
  const place = (view, end, preferY) => {
    const top = view.box.max.y * 0.8;
    for (const [tol, maxPitch, rough] of [[STRICT, MAX_PITCH, false], [ROUGH, ROUGH_PITCH, true]]) {
      for (const w of SIZES) {
        if (rough && w > SIZES[1]) continue;
        let best = null;
        for (let y = Y_LO; y <= top; y += 0.02) {
          const f = fit(view, end, w, y);
          if (!f || f.dev > tol || Math.abs(f.pitch) > maxPitch || Math.abs(f.yaw) > MAX_YAW) continue;
          const score = f.dev * 220 + Math.abs(f.pitch) / 25 + Math.abs(y - 0.52) * 1.2 + (preferY != null ? Math.abs(y - preferY) * 3 : 0) + (w < 0.5 ? 0.3 : 0);
          if (!best || score < best.score) best = { score, y, w, z: f.z + (end === 'rear' ? 0 : 0), pitch: f.pitch, dev: f.dev };
        }
        if (best) {
          // the surface depth under the plate's middle at its pitch: z is at the middle already (dy = 0)
          return { y: r3(best.y), z: r3(best.z), w: best.w, pitch: Math.round(best.pitch * 10) / 10, rough, dev: best.dev };
        }
      }
    }
    return null;
  };

  // ---- every car ----
  const wanted = (c) => !only.length || only.includes(c.car.id);
  const found = new Map(); // car id -> { key, rear, front }
  for (const { group, car } of cars) {
    if (group === 'legendary' || !wanted({ car })) continue; // (a Legendary car keeps its own plates: never dressed)
    const key = keyOf(car);
    if (cannot.has(key) || car.ufo) { found.set(car.id, { key, group, none: true }); continue; }
    let model;
    try { model = makeShowCar(car); } catch (err) { found.set(car.id, { key, group, error: err.message }); continue; }
    const view = prepare(model);
    const existing = P.existingPlates(model);
    const ex = (face) => { const p = existing.find(e => e.face === face); if (!p) return null; const b = new THREE.Box3().setFromObject(p.mesh, true); return (b.min.y + b.max.y) / 2; };
    found.set(car.id, { key, group, rear: place(view, 'rear', ex('rear')), front: place(view, 'front', ex('front')), had: existing.map(e => e.face) });
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
