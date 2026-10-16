// THE FLANK DECAL ZONES of a few cars (a feasibility prototype, CHECKLIST 383; how the search judges a flank: scripts/decal-zones-lib.mjs,
// the shared ray rule: src/delivery/render/flankdecal.js). Builds each car as the showroom does (render/showcar.js makeShowCar, stock: no
// cosmetics), searches both flanks, prints the audit, and measures the TEST decal (roundel + stripe) as the game would build it on the
// zones: its triangles, rays, build time, and how it rides the dents (each shown vertex's height over the paint under it, clean and at
// 20 / 60 / 100 % damage, render/dents.js as the game runs it).
//   node scripts/decal-zones.mjs                    the six feasibility cars: print the audit, write /tmp/decal-zones/audit.md
//   node scripts/decal-zones.mjs <car id> [...]     those cars
//   ... --write                                     and merge their rows into src/delivery/render/decalzonestable.js
//   (it also writes delivery/decalcars.json, the cars for the review page delivery/decalview.html: not in git)
//   node scripts/decal-zones.mjs --survey           EVERY model of the roster (one car a model): the zones' numbers only, no decal, no
//                                                   dents; /tmp/decal-zones/survey.json and a summary (how much of the roster the search
//                                                   handles alone). Nothing written into the game.
//   ... --step=0.04                                 the search's ray spacing (m)
import * as THREE from 'three';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';
import { SEARCH, useHit, searchSide, mirrorIoU, sameZones } from './decal-zones-lib.mjs';

export const SIX = ['postvan', 'bug', 'wedge', 'flatbed', 'bus', 'woody'];
const args = process.argv.slice(2), write = args.includes('--write');
const step = Number((args.find(a => a.startsWith('--step=')) || '').slice(7)) || SEARCH.STEP;
const ids = args.filter(a => !a.startsWith('--')), survey = args.includes('--survey');
const { load, close, ROOT } = await startModels();
const TABLE = ROOT + '/src/delivery/render/decalzonestable.js';
const r2 = (v) => Math.round(v * 100) / 100, pct = (v) => Math.round(v * 100) + '%';

try {
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { makeShowCar } = await load('render/showcar.js');
  const FD = await load('render/flankdecal.js');
  const T = await load('render/decalzonestable.js');
  const { dentModel } = await load('render/dents.js');
  useHit(FD.flankHit);
  const all = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...Object.values(C.SECRET_CARS), ...Object.values(C.LEVEL_CARS), ...IDEA_CARS];
  const byId = (id) => all.find(c => c.id === id);
  if (survey) {
    const seen = new Set(), out = [];
    for (const car of [...all, C.AMPHIBIOUS_TANK]) {
      const key = car.model || car.id;
      if (car.legend || car.ufo || seen.has(key)) continue;
      seen.add(key);
      let model;
      try { model = makeShowCar(car, { stock: true }); } catch (err) { out.push({ id: car.id, key, error: String(err.message || err).slice(0, 80) }); continue; }
      model.updateMatrixWorld(true);
      const view = FD.flankView(model);
      if (!view.body) { out.push({ id: car.id, key, error: 'no body' }); continue; }
      const L = searchSide(view, -1, step), R = searchSide(view, 1, step);
      const best = (S, f) => Math.min(f(L), f(R));
      out.push({ id: car.id, key, len: r2(view.box.max.z - view.box.min.z), zonesL: L.zones.length, zonesR: R.zones.length, roundel: r2(best(0, S => S.room.square)), stripe: r2(best(0, S => S.room.stripe)),
        clean: Math.round(Math.min(L.coverage, R.coverage) * 100), iou: Math.round(mirrorIoU(L, R) * 100) / 100, mirrored: sameZones(L.zones, R.zones) });
    }
    mkdirSync('/tmp/decal-zones', { recursive: true });
    writeFileSync('/tmp/decal-zones/survey.json', JSON.stringify(out, null, 1));
    const ok = out.filter(o => !o.error), n = (f) => ok.filter(f).length;
    console.log('models ' + out.length + ' (built ' + ok.length + ', not built: ' + out.filter(o => o.error).map(o => o.key + ' (' + o.error + ')').join(', ') + ')');
    console.log('roundel >= 0.5 m: ' + n(o => o.roundel >= 0.5) + ', 0.35-0.5: ' + n(o => o.roundel >= 0.35 && o.roundel < 0.5) + ', 0.2-0.35: ' + n(o => o.roundel >= 0.2 && o.roundel < 0.35) + ', under 0.2 (no roundel): ' + n(o => o.roundel < 0.2));
    console.log('stripe >= 1.5 m: ' + n(o => o.stripe >= 1.5) + ', 0.8-1.5: ' + n(o => o.stripe >= 0.8 && o.stripe < 1.5) + ', under 0.8: ' + n(o => o.stripe < 0.8));
    console.log('no zone at all: ' + n(o => !o.zonesL || !o.zonesR) + '; sides identical: ' + n(o => o.mirrored) + '; mirror IoU < 0.9: ' + n(o => o.iou < 0.9) + ' (' + ok.filter(o => o.iou < 0.9).map(o => o.key + ' ' + o.iou).join(', ') + ')');
    console.log('roundel + stripe (>= 0.35 m and >= 0.8 m): ' + n(o => o.roundel >= 0.35 && o.stripe >= 0.8));
    console.log('worst: ' + ok.slice().sort((a, b) => a.roundel - b.roundel).slice(0, 25).map(o => o.key + ' ' + o.roundel + '/' + o.stripe).join(', '));
    await close();
    process.exit(0);
  }
  const rows = {}, report = [], pageCars = {};
  for (const id of ids.length ? ids : SIX) {
    const car = byId(id);
    if (!car) { console.log(id + ': no such car'); continue; }
    const key = car.model || car.id;
    pageCars[id] = JSON.parse(JSON.stringify(car));
    const t0 = performance.now();
    const model = makeShowCar(car, { stock: true });
    model.updateMatrixWorld(true);
    const view = FD.flankView(model);
    const L = searchSide(view, -1, step), R = searchSide(view, 1, step);
    const searchMs = performance.now() - t0;
    const iou = mirrorIoU(L, R), mirrored = sameZones(L.zones, R.zones);
    const rowOf = (z) => [z.id, z.z0, z.z1, z.y0, z.y1, z.flat, z.curve];
    rows[key] = { L: L.zones.map(rowOf), R: mirrored ? 'L' : R.zones.map(rowOf) };
    T.DECAL_ZONES[key] = rows[key]; // (the module's own table, so the test decal below is laid on these zones)
    // the test decal as the game builds it, then the dents
    const built = FD.buildFlankDecal(model, key, { mode: 'decal' });
    const decal = built?.mesh;
    const heights = () => {
      if (!decal) return null;
      model.updateMatrixWorld(true);
      const v2 = FD.flankView(model), pos = decal.geometry.attributes.position, col = decal.geometry.attributes.color, p = new THREE.Vector3();
      const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(decal.matrixWorld);
      let lo = Infinity, hi = -Infinity, n = 0, sunk = 0, far = 0;
      for (let k = 0; k < pos.count; k++) {
        if (col.getW(k) < 0.5) continue;
        p.fromBufferAttribute(pos, k).applyMatrix4(toModel);
        const s = Math.sign(p.x), h = FD.flankHit(v2, s, p.y, p.z, true);
        if (!h.point) continue;
        const d = (p.x - h.point.x) * s * 1000;
        lo = Math.min(lo, d); hi = Math.max(hi, d); n++;
        if (d < 0.5) sunk++;
        if (d > 15) far++;
      }
      return { lo: Math.round(lo * 10) / 10, hi: Math.round(hi * 10) / 10, n, sunk, far };
    };
    const dents = { clean: heights() };
    for (const share of [0.2, 0.6, 1]) { dentModel(model, model.userData.body, share); dents[Math.round(share * 100)] = heights(); }
    const sideLine = (S) => ({
      zones: S.zones.map(z => z.id + ' ' + r2(z.z1 - z.z0) + 'x' + r2(z.y1 - z.y0) + 'm flat ' + z.flat + 'mm curve ' + z.curve + 'deg'),
      coverage: pct(S.coverage), square: r2(S.room.square), stripe: r2(S.room.stripe), wheels: S.wheels.length,
      rejected: Object.fromEntries(Object.entries(S.counts).filter(([k]) => k !== 'air').map(([k, v]) => [k, Math.round(v / S.seen * 100)])),
    });
    report.push({ id, key, name: car.name, searchMs: Math.round(searchMs), rays: L.S.hits.length + R.S.hits.length, iou: Math.round(iou * 100) / 100, mirrored,
      L: sideLine(L), R: sideLine(R), decal: built && { triangles: built.stats.triangles, rays: built.stats.rays, ms: Math.round(built.stats.ms),
        pieces: built.stats.pieces.map(p => p.side + ':' + p.what + ' ' + p.used.join('x') + (p.holes ? ' holes ' + p.holes : '')) }, dents });
    console.log(JSON.stringify(report[report.length - 1], null, 1));
  }
  // ---- the audit table ----
  const lines = ['| car | model | zones (left; right same unless said) | clean share L / R | roundel max (m) | stripe max at 0.12 m (m) | mirror IoU | rejected (share of side view, left) | decal tris / rays / ms | decal over paint (mm): clean, 20, 60, 100 % |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of report) {
    const d = (x) => (x ? x.lo + '..' + x.hi + (x.sunk ? ' (' + x.sunk + ' sunk)' : '') + (x.far ? ' (' + x.far + ' >15mm)' : '') : '-');
    lines.push('| ' + [r.name, r.key, r.L.zones.join('; ') + (r.mirrored ? '' : ' / R: ' + r.R.zones.join('; ')), r.L.coverage + ' / ' + r.R.coverage, r.L.square + ' / ' + r.R.square,
      r.L.stripe + ' / ' + r.R.stripe, r.iou, Object.entries(r.L.rejected).map(([k, v]) => k + ' ' + v).join(', '),
      r.decal ? r.decal.triangles + ' / ' + r.decal.rays + ' / ' + r.decal.ms : '-', ['clean', 20, 60, 100].map(k => d(r.dents[k])).join('; ')].join(' | ') + ' |');
  }
  writeFileSync(ROOT + '/delivery/decalcars.json', JSON.stringify(pageCars)); // (the review page's cars: delivery/decalview.html cannot import cars.js)
  mkdirSync('/tmp/decal-zones', { recursive: true });
  writeFileSync('/tmp/decal-zones/audit.md', lines.join('\n') + '\n');
  writeFileSync('/tmp/decal-zones/audit.json', JSON.stringify(report, null, 1));
  console.log('\n' + lines.join('\n'));
  if (write) {
    const text = readFileSync(TABLE, 'utf8'), start = text.indexOf('export const DECAL_ZONES = {'), end = text.indexOf('\n};', start);
    const existing = new Function('return ' + text.slice(start + 'export const DECAL_ZONES = '.length, end + 3).replace(/;\s*$/, ''))();
    Object.assign(existing, rows);
    const fmt = (v) => (typeof v === 'string' ? "'" + v + "'" : '[' + v.map(z => '[' + z.map(x => (typeof x === 'string' ? "'" + x + "'" : x)).join(', ') + ']').join(', ') + ']');
    const body = Object.keys(existing).sort().map(k => '  ' + k + ': { L: ' + fmt(existing[k].L) + ', R: ' + fmt(existing[k].R) + ' },').join('\n');
    const head = '// GENERATED by scripts/decal-zones.mjs --write (the decal feasibility prototype, CHECKLIST 383): do not edit by hand.\n'
      + '// By the car\'s MODEL: the clean flank zones a side, L (the left, -x) and R (the right; \'L\' = the same as the left), each\n'
      + '// [id, z0, z1, y0, y1, flat mm, curve deg] in car-local metres (z along the car, its nose +z; y up from the road): a rectangle of the side view\n'
      + '// where every ray met the body\'s paint facing out sideways; flat = the most the paint stands off its fitted plane, curve = its normals\' spread.\n';
    writeFileSync(TABLE, head + 'export const DECAL_ZONES = {\n' + body + '\n};\n');
    console.log('wrote ' + TABLE + ' (' + readFileSync(TABLE).length + ' bytes)');
  }
} finally { await close(); }
