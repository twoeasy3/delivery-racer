// BAKE a car's SHAPE EDITS into its code (the owner, 15-Oct: "a plain build at the end, not a build-and-patch"): the model editor stores the
// edited outlines of extruded / flat / lathed shapes as the `shapes` table of the car's model patch (src/delivery/modelpatches/<car id>.json,
// render/shapeedits.js). This writes each edited outline into the car's SOURCE, as a plain [[u, v], ...] literal where the code hands that
// outline over, and takes it out of the patch (the file is deleted when nothing else is in it). After it, the car is built by plain code.
//   node scripts/bake-shapes.mjs <car id>                    bake src/delivery/modelpatches/<car id>.json's shapes table
//   node scripts/bake-shapes.mjs <car id> --patch <f>        ...from that patch file (the editor's download) instead (left as it is)
//   node scripts/bake-shapes.mjs <car id> --dry              find where each would go and prove it, then put every file back
//   node scripts/bake-shapes.mjs <car id> --accept-others    let the bake change other cars that share the code (listed); off: refused
// HOW: the car is built with the table and every outline's place in the code is recorded (its call stack, mapped to the source); for an
// edited outline the calls on that stack are tried from the innermost out, skipping a call that also makes another outline the edit does not
// cover: an argument of the call is replaced by the edited points (an array literal, or a THREE.Shape of them where the code passes a shape),
// and the car is built again from the changed code. It is kept only if the car comes out EXACTLY as it was built with the patch (every
// vertex of every mesh); else the file is put back and the next try is made. At the end every other car is built and must be unchanged.
// A shape that cannot be baked (its outline is computed where an edit cannot be written, or shared with other shapes) stays in the patch,
// with the reason.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as acorn from 'acorn';
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2);
const id = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--patch');
const dry = args.includes('--dry'), acceptOthers = args.includes('--accept-others');
const patchArg = args.includes('--patch') ? args[args.indexOf('--patch') + 1] : null;
if (!id) { console.log('node scripts/bake-shapes.mjs <car id> [--patch <file>] [--dry] [--accept-others]'); process.exit(1); }
const ROOT = join(import.meta.dirname, '..'), patchPath = patchArg || join(ROOT, 'src/delivery/modelpatches', id + '.json');
if (!existsSync(patchPath)) { console.log('FAIL  no patch at ' + patchPath); process.exit(1); }
const patch = JSON.parse(readFileSync(patchPath, 'utf8'));
if (!patch.shapes || typeof patch.shapes !== 'object' || !Object.keys(patch.shapes).length) { console.log('FAIL  the patch has no shapes table to bake'); process.exit(1); }

// ---- building: a fresh Vite server each time (so the changed source is what is built) -----------------------------------
const roster = async (load) => {
  const cars = await load('cars.js'), { IDEA_CARS } = await load('ideas.js');
  const r = [...new Map([...cars.CARS, ...(cars.FILLER_CARS || []), ...cars.EVENT_CARS, ...cars.BESPOKE_CARS, ...cars.EARNED_CARS, ...Object.values(cars.SECRET_CARS), ...Object.values(cars.LEVEL_CARS || {})].filter(Boolean).map(c => [c.id, c])).values()];
  return [...r, ...IDEA_CARS.filter(c => !r.some(x => x.id === c.id))];
};
const hashModel = (model) => { // (every mesh's vertices, where they stand in the model, to 0.01 mm)
  model.updateMatrixWorld(true);
  const out = [], inv = model.matrixWorld.clone().invert();
  model.traverse((n) => {
    if (!n.isMesh || !n.geometry?.attributes.position) return;
    const m = inv.clone().multiply(n.matrixWorld), a = n.geometry.attributes.position, e = m.elements;
    let h = 0;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      for (const v of [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]) h = (Math.imul(h, 31) + Math.round(v * 1e5)) | 0;
    }
    out.push(a.count + ':' + h + (n.visible ? '' : '-'));
  });
  return out.join(',');
};
// build the car with `table` (null: none), recording (with stacks) -> { hash, records (id, key, n, stack, now), unused }; `all`: every car's hash too
const build = async (table, { all = false } = {}) => {
  const { load, close, fixStack } = await startModels();
  try {
    const { buildInspectModel } = await load('render/inspectmodel.js');
    const { carById } = await load('cars.js');
    const S = await load('render/shapeedits.js');
    const apply = await load('render/modelpatchapply.js');
    await apply.patchesReady;
    apply.setModelPatching(false);
    const car = carById(id);
    if (!car) throw new Error('no car "' + id + '"');
    S.setShapeOverride({ edits: table, record: true, stacks: true });
    let model;
    try { model = buildInspectModel(car, false); } finally { S.setShapeOverride(null); }
    const rep = S.lastShapeReport();
    const out = { hash: hashModel(model), unused: rep.unused, records: rep.records.map(r => ({ id: r.id, key: r.key, n: r.n, kind: r.kind, pts: r.pts, now: r.now, stack: fixStack(r.stack || '') })) };
    if (all) { // (every other car: its vertices, and the places in the code its own outlines go through: a place another car uses is not baked into)
      out.others = new Map(); out.shared = new Set(); out.siblings = new Set();
      for (const c of await roster(load)) {
        if (c.id === id) continue;
        if (car.model && c.model === car.model) out.siblings.add(c.id); // (the same model by name: the same builder; it changes with it)
        try { out.others.set(c.id, hashModel(buildInspectModel(c, false))); } catch (e) { out.others.set(c.id, 'throws: ' + e.message); }
        S.setShapeOverride({ edits: null, record: true, stacks: true });
        try { buildInspectModel(c, false); } catch { /* (its hash says it throws) */ } finally { S.setShapeOverride(null); }
        if (!out.siblings.has(c.id)) for (const r of S.lastShapeReport().records) for (const f of framesOf(fixStack(r.stack || ''))) out.shared.add(f.site);
      }
    }
    return out;
  } finally { await close(); }
};

// ---- the source: stack frames -> the call at that place -> its arguments ------------------------------------------------
const FRAME = /\(?((?:\/|[A-Za-z]:\\)[^():]*?\/src\/delivery\/[^():?]+\.js)(?:\?[^:]*)?:(\d+):(\d+)\)?\s*$/;
const framesOf = (stack) => stack.split('\n').slice(1).map(l => l.match(FRAME)).filter(m => m && !/render\/shapeedits\.js$/.test(m[1])).map(m => ({ file: m[1], line: +m[2], col: +m[3], site: m[1] + ':' + m[2] + ':' + m[3] }));
const parsed = new Map();
const parse = (file) => { const src = readFileSync(file, 'utf8'); if (parsed.get(file)?.src !== src) parsed.set(file, { src, ast: acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true }) }); return parsed.get(file); };
const callAt = (file, line, col) => { // (the innermost call or `new` whose callee holds that place: V8 points at the callee, or at `new`)
  const { src, ast } = parse(file);
  let off = 0;
  for (let l = 1; l < line; l++) off = src.indexOf('\n', off) + 1;
  off += col - 1;
  let best = null;
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.start > off || node.end <= off) return;
    if ((node.type === 'CallExpression' || node.type === 'NewExpression') && off >= node.start && off <= node.callee.end && (!best || node.end - node.start < best.end - best.start)) best = node;
    for (const k of Object.keys(node)) { const v = node[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === 'string') visit(v); }
  };
  visit(ast);
  return best;
};
const num = (v) => String(Math.round(v * 10000) / 10000);
const literal = (pts, indent) => { // (six points to a line)
  const items = pts.map(q => '[' + num(q[0]) + ', ' + num(q[1]) + ']');
  if (items.length <= 6) return '[' + items.join(', ') + ']';
  const rows = [];
  for (let i = 0; i < items.length; i += 6) rows.push(items.slice(i, i + 6).join(', '));
  return '[ // (edited in the model editor: scripts/bake-shapes.mjs)\n' + rows.map(r => indent + '  ' + r).join(',\n') + ',\n' + indent + ']';
};
const indentAt = (src, at) => { const s = src.lastIndexOf('\n', at - 1) + 1; return src.slice(s).match(/^\s*/)[0]; };
const FORMS = [
  { name: 'points', text: (lit) => lit },
  { name: 'shape', text: (lit) => 'new THREE.Shape(' + lit + '.map(([a, b]) => new THREE.Vector2(a, b)))', when: (src) => /import \* as THREE from 'three'/.test(src) },
];
const SKIP_ARG = new Set(['Literal', 'ArrowFunctionExpression', 'FunctionExpression', 'ObjectExpression', 'TemplateLiteral']);

// ---- the bake ---------------------------------------------------------------------------------------------------------------
const rel = (f) => relative(ROOT, f);
const near = (q, r) => Math.abs(q[0] - r[0]) < 1.5e-4 && Math.abs(q[1] - r[1]) < 1.5e-4;
const open = (a) => (a.length > 3 && near(a[0], a[a.length - 1]) ? a.slice(0, -1) : a); // (a closed path's last point is its first again: the same outline)
const same2 = (a, b) => { const x = open(a), y = open(b); return x.length === y.length && x.every((q, i) => near(q, y[i])); };
const originals = new Map(); // file -> its text before the bake
const write = (file, text) => { if (!originals.has(file)) originals.set(file, readFileSync(file, 'utf8')); writeFileSync(file, text); };
const putBack = () => { for (const [f, t] of originals) writeFileSync(f, t); };
let table = JSON.parse(JSON.stringify(patch.shapes));
const baked = [], refused = [];
try {
  console.log('building ' + id + ' with the patch, and every other car as it is now...');
  const target = await build(table, { all: true });
  if (target.unused.length) console.log('note  ids no outline answers to (left in the patch): ' + target.unused.join(', '));
  const todo = Object.keys(table).filter(k => !target.unused.includes(k));
  let now = target, shared = target.shared;
  for (const sid of todo) {
    if (!(sid in table)) continue; // (baked along with another)
    const rec = now.records.find(r => r.id === sid) || now.records.find(r => r.key === sid);
    if (!rec) { refused.push([sid, 'not made by this build any more']); continue; }
    const edit = table[sid];
    // the outlines this edit covers: itself, and any other outline the table gives the very same points (a mirrored pair seen from the side)
    const same = (r) => r.id === rec.id || ((table[r.id] ?? table[r.key]) && same2(table[r.id] ?? table[r.key], edit));
    const sitesOf = new Map();
    for (const r of now.records) for (const f of framesOf(r.stack)) { if (!sitesOf.has(f.site)) sitesOf.set(f.site, []); sitesOf.get(f.site).push(r); }
    let done = null;
    const why = [];
    for (const f of framesOf(rec.stack)) {
      if (shared.has(f.site)) { why.push(rel(f.file) + ':' + f.line + ' is shared with other cars'); continue; }
      const others = sitesOf.get(f.site).filter(r => !same(r));
      if (others.length) { why.push(rel(f.file) + ':' + f.line + ' also makes ' + others.length + ' other outline(s)'); continue; }
      const call = callAt(f.file, f.line, f.col);
      if (!call) { why.push(rel(f.file) + ':' + f.line + ' no call found'); continue; }
      const { src } = parse(f.file);
      for (const [k, arg] of call.arguments.entries()) {
        if (SKIP_ARG.has(arg.type) || (arg.type === 'UnaryExpression' && arg.argument.type === 'Literal')) continue;
        for (const form of FORMS) {
          if (form.when && !form.when(src)) continue;
          const text = form.text(literal(edit, indentAt(src, arg.start)));
          const next = src.slice(0, arg.start) + text + src.slice(arg.end);
          write(f.file, next);
          // the changed code built plain: the outline must now BE the edit; the table's other ids carried over by build order (the code runs the
          // same way, so the i-th outline is the same one), and any outline the code now makes as its edit says dropped (carried along)
          let plainNow = null, rest = null;
          try { plainNow = await build(null); } catch (e) { why.push(rel(f.file) + ':' + f.line + ' argument ' + (k + 1) + ' as ' + form.name + ': ' + e.message.split('\n')[0]); }
          const iOf = (key) => now.records.findIndex(r => r.id === key);
          if (plainNow && plainNow.records.length === now.records.length && same2(plainNow.records[now.records.indexOf(rec)].pts, edit)) {
            rest = {};
            const dropped = [];
            for (const [key, pts] of Object.entries(table)) {
              if (key === sid) continue;
              const i = iOf(key);
              if (i < 0) { rest[key] = pts; continue; } // (a plain key, or one this build does not make)
              const r2 = plainNow.records[i];
              if (!same2(r2.pts, pts)) rest[r2.id] = pts; else dropped.push(key);
            }
            let trial;
            try { trial = await build(Object.keys(rest).length ? rest : null); } catch (e) { trial = { hash: 'throws: ' + e.message }; }
            if (trial.hash === target.hash) { done = { f, k, form: form.name, rest, trial, dropped, old: src.slice(arg.start, arg.end) }; break; }
            why.push(rel(f.file) + ':' + f.line + ' argument ' + (k + 1) + ' as ' + form.name + ': the car comes out different');
          } else if (plainNow) why.push(rel(f.file) + ':' + f.line + ' argument ' + (k + 1) + ' as ' + form.name + ': not this outline');
          write(f.file, src);
        }
        if (done) break;
      }
      if (done) break;
    }
    if (!done) { refused.push([sid, [...new Set(why)].join('; ') || 'no place in the code']); continue; }
    const along = done.dropped;
    console.log('ok    ' + sid + ' -> ' + rel(done.f.file) + ':' + done.f.line + ', argument ' + (done.k + 1) + ' (' + done.old.replace(/\s+/g, ' ').slice(0, 60) + (done.old.length > 60 ? '...' : '') + ') as ' + done.form + (along.length ? '; carried along: ' + along.join(', ') : ''));
    baked.push(sid, ...along);
    table = done.rest; now = done.trial;
    if (todo.some(k => k in table && k !== sid)) shared = (await build(Object.keys(table).length ? table : null, { all: true })).shared; // (lines moved in the changed file)
  }
  if (baked.length) {
    console.log('proving every other car is unchanged...');
    const after = await build(Object.keys(table).length ? table : null, { all: true });
    if (after.hash !== target.hash) throw new Error('the car built from the baked code differs from the patched one');
    const all = [...target.others].filter(([c, h]) => after.others.get(c) !== h).map(([c]) => c), sib = all.filter(c => target.siblings.has(c)), changed = all.filter(c => !target.siblings.has(c));
    if (sib.length) console.log('note  the same model, changed with it: ' + sib.join(', '));
    if (changed.length && !acceptOthers) throw new Error('the bake would change other cars that share the code: ' + changed.join(', ') + ' (--accept-others to let it)');
    console.log('ok    ' + id + ' built from the code is the patched model exactly; ' + (changed.length ? 'changed with it (accepted): ' + changed.join(', ') : 'the other ' + target.others.size + ' cars are unchanged'));
  }
  for (const [sid, w] of refused) console.log('kept  ' + sid + ' in the patch: ' + w);
  if (dry) { putBack(); console.log('dry: every file put back (' + baked.length + ' outline(s) would be baked)'); process.exit(0); }
  if (baked.length && !patchArg) {
    if (Object.keys(table).length) patch.shapes = table; else delete patch.shapes;
    const left = patch.ops?.length || patch.evil?.length || patch.glass || patch.shapes;
    if (left) { writeFileSync(patchPath, JSON.stringify(patch, null, 1) + '\n'); console.log('ok    ' + rel(patchPath) + ': ' + baked.length + ' shape(s) taken out' + (patch.shapes ? ', ' + Object.keys(patch.shapes).length + ' left' : '')); }
    else { unlinkSync(patchPath); console.log('ok    ' + rel(patchPath) + ' deleted (nothing else was in it)'); }
  } else if (patchArg && baked.length) console.log('note  --patch: the patch file is left as it is; take the baked shapes out yourself: ' + baked.join(', '));
  console.log('files changed: ' + ([...originals.keys()].map(rel).join(', ') || 'none'));
  if (refused.length) process.exit(2);
} catch (e) { putBack(); console.log('FAIL  ' + e.message + ' (every file put back)'); process.exit(1); }
