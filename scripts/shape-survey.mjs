// THE SHAPE SURVEY (render/shapeedits.js): every car the model editor lists (the roster and the car ideas) built headless with its outlines
// RECORDED, and counted: how many extruded / flat / lathed outlines, how many the editor can find on the car (their own mesh, or inside a
// merged one), how many have holes, how many pair across the car (Mirror) or are symmetric in themselves, by model file. It also proves
// that recording changes nothing: every car's vertices built plain and built recorded (no cache, the hooks on) are the same.
//   node scripts/shape-survey.mjs            the table
//   node scripts/shape-survey.mjs --cars     a line per car too
//   node scripts/shape-survey.mjs <car id>   that car's outlines, one per line
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2), perCar = args.includes('--cars'), only = args.find(a => !a.startsWith('--'));
const { load, close, fixStack } = await startModels();
const t0 = Date.now();
try {
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const cars = await load('cars.js'), { IDEA_CARS } = await load('ideas.js');
  const S = await load('render/shapeedits.js');
  const apply = await load('render/modelpatchapply.js');
  await apply.patchesReady;
  apply.setModelPatching(false);
  const roster = [...new Map([...cars.CARS, ...(cars.FILLER_CARS || []), ...cars.EVENT_CARS, ...cars.BESPOKE_CARS, ...cars.EARNED_CARS, ...Object.values(cars.SECRET_CARS), ...Object.values(cars.LEVEL_CARS || {})].filter(Boolean).map(c => [c.id, c])).values()];
  const all = [...roster, ...IDEA_CARS.filter(c => !roster.some(r => r.id === c.id))].filter(c => !only || c.id === only);
  const vhash = (model) => { const out = []; model.updateMatrixWorld(true); model.traverse((n) => { if (n.isMesh && n.geometry?.attributes.position) { const a = n.geometry.attributes.position.array; let h = 0; for (let i = 0; i < a.length; i++) h = (h * 31 + Math.round(a[i] * 1e5)) | 0; out.push(h); } }); return out.join(','); };
  const tally = new Map(), byFile = new Map();
  const add = (map, k, field, n = 1) => { if (!map.has(k)) map.set(k, {}); map.get(k)[field] = (map.get(k)[field] || 0) + n; };
  let same = 0, differ = [], carsWith = 0, failed = [];
  for (const car of all) {
    let plain, rec, records;
    try {
      plain = buildInspectModel(car, false);
      S.setShapeOverride({ edits: null, record: true, stacks: true });
      try { rec = buildInspectModel(car, false); } finally { S.setShapeOverride(null); }
      records = S.lastShapeReport().records;
    } catch (e) { failed.push(car.id + ' (' + e.message + ')'); continue; }
    if (vhash(plain) === vhash(rec)) same++; else differ.push(car.id);
    S.locateShapes(rec, records);
    const pairs = S.shapePartners(records);
    if (records.length) carsWith++;
    const line = [];
    for (const r of records) {
      const where = !r.mesh ? 'lost' : r.mesh.geometry === r.geo ? 'own' : 'merged';
      const p = pairs.get(r.id) || {};
      const frame = (r.stack || '').split('\n').map(s => s.match(/\/src\/delivery\/(render\/[^:?)]+)/)).find(m => m && !/shapeedits\.js/.test(m[1]));
      const file = frame ? frame[1].replace('render/', '') : '?';
      for (const map of [tally, byFile]) {
        const k = map === tally ? r.kind : file;
        add(map, k, 'n'); add(map, k, where); if (r.holes) add(map, k, 'holes'); if (p.partner) add(map, k, 'paired'); if (p.self) add(map, k, 'self');
        if (map === tally) add(map, k, 'cars:' + car.id, 0);
      }
      const at = (only ? fixStack(r.stack || '') : '').split('\n').map(s => s.match(/\/src\/delivery\/render\/([^?)]+?)(?:\?[^:]*)?:(\d+):(\d+)/)).filter(m => m && !/shapeedits\.js/.test(m[1])).slice(0, 2).map(m => m[1] + ':' + m[2]).join(' < ');
      line.push(r.id + ' ' + r.kind + ' ' + r.pts.length + 'pt ' + where + (r.holes ? ' holes' + r.holes : '') + (p.partner ? ' twin ' + p.partner : p.self ? ' self' : '') + ' ' + (only ? at : file));
    }
    if (only) console.log(line.join('\n'));
    else if (perCar) console.log(car.id.padEnd(22) + records.length + ' outlines');
  }
  const row = (k, v) => k.padEnd(28) + String(v.n || 0).padStart(5) + String(v.own || 0).padStart(6) + String(v.merged || 0).padStart(8) + String(v.lost || 0).padStart(6) + String(v.holes || 0).padStart(7) + String(v.paired || 0).padStart(8) + String(v.self || 0).padStart(6) + (v.carsN !== undefined ? String(v.carsN).padStart(6) : '');
  const head = 'kind / file'.padEnd(28) + '    n   own  merged  lost  holes  paired  self';
  for (const v of tally.values()) v.carsN = Object.keys(v).filter(x => x.startsWith('cars:')).length;
  console.log(head + '  cars');
  for (const [k, v] of tally) console.log(row(k, v));
  console.log('\nby the model file the outline is made in:\n' + head);
  for (const [k, v] of [...byFile].sort((a, b) => b[1].n - a[1].n)) console.log(row(k, { ...v, carsN: undefined }));
  console.log('\n' + all.length + ' cars built, ' + carsWith + ' with outlines; recording changed nothing: ' + same + ' / ' + (all.length - failed.length) + (differ.length ? '  DIFFER: ' + differ.join(', ') : '') + (failed.length ? '\nnot built: ' + failed.join('; ') : '') + '\n(' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
} finally { await close(); }
