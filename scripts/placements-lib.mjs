// PLACEMENTS AS BUILD DATA (the owner, 15-Oct: "Allow me to edit placements on model editor please. Same goes, I don't want them as patches
// but definitive build commands"). The model editor's Placements tab (src/delivery/render/placementedit.js) edits a car's ROOF / CARGO / WING
// prop slots and its REAR / FRONT number plates; saving writes the SAME data the game builds from, never a patch:
//   a prop slot  -> a HAND ROW of the car's slice file, src/delivery/render/propanchors/slice-<n>.json `hand` (the file that holds the car's
//                   generated row), the shape prop-anchors.mjs writes for a hand fix: { box: [s, x, y, z, yaw?], cyl: [...], from, lim: 'hand',
//                   inset?: [box, cyl], existing?: true } or { no: 'why', existing?: true }, marked `by: 'editor'` and carrying `prev` (the row
//                   it replaced, with `src`: generated | hand | editor). The reader (render/propanchors.js) lets a hand row win over the generated
//                   one; the generator (scripts/prop-anchors.mjs, writeSlice below) rewrites only `cars` and keeps `hand` as it is, so an
//                   editor row survives every regeneration.
//   a plate      -> an entry of HAND in src/delivery/render/plateanchors.js (by the car's model key, or its id for a variant):
//                   { r: [y, z, w, pitch] | null, f: ..., by: 'editor', prev: {...} } on a line of its own; the generated table
//                   (plateanchorstable.js) is never touched, and HAND wins over it.
// One change file feeds both ways in: the dev server's endpoint (vite.config.js, POST /__placements: the editor under `vite` writes at once)
// and `node scripts/bake-placements.mjs <file>` (the editor's download, for a page with no dev server behind it). Format:
//   { placements: 1, changes: [ { kind: 'prop', car, slot, row } | { kind: 'prop', car, slot, reset: true } | { kind: 'prop', car, slot, undo: true }
//                               | { kind: 'plate', key, row: { r, f } } | { kind: 'plate', key, reset: true } | { kind: 'plate', key, undo: true } ] }
//   reset: the hand row / HAND entry taken out (the generated one is used again); undo: the row put back as `prev` says.
// applyChanges(root, file, { dry }) -> { results: [{ kind, id, file, before, after, note }], diff, files }: validates every change first,
// writes nothing if one is bad; JSON with the generator's own layout (one line per array) and slots in roof, cargo, wing order.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const SLICE_DIR = 'src/delivery/render/propanchors';
export const PLATE_FILE = 'src/delivery/render/plateanchors.js';
export const PLATE_TABLE_FILE = 'src/delivery/render/plateanchorstable.js';
export const SLOTS = ['roof', 'cargo', 'wing'];
const r3 = (v) => Math.round(v * 1000) / 1000, r2 = (v) => Math.round(v * 100) / 100;

// ---- the slice files (also the generator's: scripts/prop-anchors.mjs reads and writes through these) ----
export const sliceFile = (root, n) => join(root, SLICE_DIR, 'slice-' + n + '.json');
export const readSlice = (root, n) => (existsSync(sliceFile(root, n)) ? JSON.parse(readFileSync(sliceFile(root, n), 'utf8')) : { slice: n, cars: {}, hand: {} });
export const formatSlice = (n, data) => {
  const cars = {};
  for (const id of Object.keys(data.cars || {}).sort()) cars[id] = data.cars[id];
  return JSON.stringify({ slice: n, note: 'GENERATED `cars` by scripts/prop-anchors.mjs --slice ' + n + ' (do not edit); `hand` is this slice\'s hand fixes (render/propanchors.js), edited by hand', cars, hand: data.hand || {} }, null, 1)
    .replace(/\[\n\s+([^[\]]*?)\n\s+\]/gs, (m, inner) => '[' + inner.replace(/,\n\s+/g, ', ') + ']') + '\n';
};
export const writeSlice = (root, n, data) => writeFileSync(sliceFile(root, n), formatSlice(n, data));
export const sliceNumbers = (root) => readdirSync(join(root, SLICE_DIR)).map(f => /^slice-(\d+)\.json$/.exec(f)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
// the slice whose generated row the reader uses for a car (the highest-numbered that holds it), else null
export const sliceHolding = (root, carId, slices = null) => {
  let at = null;
  for (const n of sliceNumbers(root)) if ((slices?.[n] || readSlice(root, n)).cars?.[carId]) at = n;
  return at;
};
// the editor's rows in the slice files: [{ id, slot, slice }] (the generator prints them as kept)
export const editorRows = (root) => {
  const out = [];
  for (const n of sliceNumbers(root)) for (const [id, h] of Object.entries(readSlice(root, n).hand || {})) for (const slot of SLOTS) if (h[slot]?.by === 'editor') out.push({ id, slot, slice: n });
  return out;
};

// ---- a prop slot's row, normalised (the order the generator writes; numbers rounded as it rounds) ----
const shapeRow = (a, what) => {
  if (!Array.isArray(a) || a.length < 4 || a.length > 5 || !a.every(Number.isFinite)) throw new Error(what + ' is not [scale, x, y, z, yaw?]');
  const [s, x, y, z, yaw] = a;
  if (!(s >= 0.1 && s <= 10)) throw new Error(what + ': scale ' + s + ' out of 0.1 to 10');
  if (Math.abs(x) > 5 || Math.abs(z) > 12 || y < -1 || y > 8) throw new Error(what + ': centre off any car');
  const out = [r2(s), r3(x), r3(y), r3(z)];
  if (yaw && Math.abs(yaw) > 0.05) out.push(Math.round(((yaw % 360) + 540) % 360 - 180));
  return out;
};
export const normPropRow = (row) => {
  if (!row || typeof row !== 'object') throw new Error('no row');
  if (row.no !== undefined) {
    const why = String(row.no).trim();
    if (!why) throw new Error('an unsupported slot needs a reason');
    const out = { no: why.slice(0, 160) };
    if (row.existing) out.existing = true;
    return out;
  }
  const out = { box: shapeRow(row.box, 'box'), cyl: shapeRow(row.cyl, 'cyl'), from: ['roof', 'roof-curved', 'deck', 'roof-edge', 'deck-edge'].includes(row.from) ? row.from : 'deck', lim: 'hand' };
  if (row.inset) {
    if (!Array.isArray(row.inset) || row.inset.length !== 2 || !row.inset.every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error('inset is not [box, cyl] metres');
    if (row.inset.some(v => v > 0.0005)) out.inset = row.inset.map(r3);
  }
  if (row.existing) out.existing = true;
  return out;
};
const stripPrev = (row) => { if (!row) return null; const { prev, by, ...rest } = row; void prev; void by; return rest; };

// ---- the plate file: HAND in plateanchors.js (a JS object literal, read by evaluating the block; written line by line) ----
const block = (text, name) => {
  const at = text.indexOf('export const ' + name + ' = ');
  if (at < 0) throw new Error(name + ' not found');
  const open = text.indexOf(name.endsWith('NONE') ? '[' : '{', at);
  const close = text.indexOf(name.endsWith('NONE') ? '];' : '\n};', open);
  return { at, open, close: close + (name.endsWith('NONE') ? 1 : 2), src: text.slice(open, close + (name.endsWith('NONE') ? 1 : 2)) };
};
const evalLiteral = (src) => new Function('return (' + src + ');')(); // (our own source file: a literal with comments)
export const readPlates = (root) => {
  const text = readFileSync(join(root, PLATE_FILE), 'utf8'), table = readFileSync(join(root, PLATE_TABLE_FILE), 'utf8');
  return { text, HAND: evalLiteral(block(text, 'HAND').src), HAND_NONE: evalLiteral(block(text, 'HAND_NONE').src),
    PLATE_TABLE: evalLiteral(block(table, 'PLATE_TABLE').src), PLATE_VARIANTS: evalLiteral(block(table, 'PLATE_VARIANTS').src) };
};
const endRow = (e, what) => {
  if (e === null || e === undefined) return null;
  if (!Array.isArray(e) || e.length < 4 || !e.slice(0, 4).every(Number.isFinite)) throw new Error(what + ' is not [y, z, width, pitch]');
  const [y, z, w, p] = e;
  if (y < 0 || y > 5 || Math.abs(z) > 12 || !(w >= 0.15 && w <= 1.2) || Math.abs(p) > 80) throw new Error(what + ' out of range');
  return [r3(y), r3(z), r3(w), Math.round(p * 10) / 10];
};
export const normPlateRow = (row) => ({ r: endRow(row?.r, 'rear'), f: endRow(row?.f, 'front') });
const lit = (v) => (v === null ? 'null' : Array.isArray(v) ? '[' + v.map(lit).join(', ') + ']' : typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => k + ': ' + lit(x)).join(', ') + ' }' : typeof v === 'string' ? "'" + v.replace(/'/g, "\\'") + "'" : String(v));
const jsKey = (k) => (/^[a-z_$][\w$]*$/i.test(k) ? k : "'" + k + "'");
// the plate entry's effective ends before a change (the hand entry over the generated row), with where it came from
const platePrev = (P, key) => {
  const base = P.PLATE_VARIANTS[key] || P.PLATE_TABLE[key] || { r: null, f: null }, h = P.HAND[key];
  if (!h) return { r: base.r ?? null, f: base.f ?? null, src: 'generated' };
  const out = { r: 'r' in h ? h.r : base.r ?? null, f: 'f' in h ? h.f : base.f ?? null };
  if (h.ends) out.ends = h.ends;
  out.src = h.by === 'editor' ? 'editor' : 'hand';
  return out;
};
// the HAND block's text with `key`'s entry taken out (its own line, or its part of a shared line), and `line` (if any) added at the end
const rewriteHand = (text, key, line) => {
  const b = block(text, 'HAND');
  const lines = b.src.split('\n');
  const k = jsKey(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const own = new RegExp('^\\s*' + k + ': \\{'), part = new RegExp('(^\\s*|, )' + k + ': \\{[^{}]*\\},? ?');
  const entries = (l) => (l.replace(/\/\/.*$/, '').match(/(?:^|,)\s*[\w'-]+: \{/g) || []).length; // (top-level entries on a line: `a: {...}, b: {...},`)
  const out = [];
  for (const l of lines) {
    if (own.test(l) && (l.includes("by: 'editor'") || entries(l) === 1)) continue; // (its own line: dropped, comment and all)
    out.push(part.test(l) ? l.replace(part, '$1') : l); // (one of several on a line: that part only)
  }
  if (line) out.splice(out.length - 1, 0, '  ' + line); // (before the closing '};')
  return text.slice(0, b.open) + out.join('\n') + text.slice(b.close);
};
const dropNone = (text, key) => {
  const b = block(text, 'HAND_NONE');
  const list = evalLiteral(b.src);
  if (!list.includes(key)) return text;
  return text.slice(0, b.open) + lit(list.filter(k => k !== key)) + text.slice(b.close);
};

// ---- a line diff (for the editor and the script: what the change does to the file) ----
export const lineDiff = (a, b, file = '', ctx = 1) => {
  const A = a.split('\n'), B = b.split('\n');
  let s = 0; while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let ea = A.length - 1, eb = B.length - 1; while (ea >= s && eb >= s && A[ea] === B[eb]) { ea--; eb--; }
  if (ea < s && eb < s) return '';
  // (the changed stretch: an LCS inside it, small)
  const a2 = A.slice(s, ea + 1), b2 = B.slice(s, eb + 1), n = a2.length, m = b2.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a2[i] === b2[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = ['--- ' + file, '+++ ' + file, '@@ line ' + (s + 1) + ' @@'];
  for (let k = Math.max(0, s - ctx); k < s; k++) out.push('  ' + A[k]);
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a2[i] === b2[j]) { out.push('  ' + a2[i]); i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { out.push('+ ' + b2[j]); j++; }
    else { out.push('- ' + a2[i]); i++; }
  }
  for (let k = ea + 1; k < Math.min(A.length, ea + 1 + ctx); k++) out.push('  ' + A[k]);
  return out.join('\n');
};

// ---- apply a change file ----
export const applyChanges = (root, file, { dry = false, date = new Date().toISOString().slice(0, 10) } = {}) => {
  if (!file || file.placements !== 1 || !Array.isArray(file.changes) || !file.changes.length) throw new Error('not a placements change file ({ placements: 1, changes: [...] })');
  const slices = {}, sliceText = {};
  for (const n of sliceNumbers(root)) { sliceText[n] = readFileSync(sliceFile(root, n), 'utf8'); slices[n] = JSON.parse(sliceText[n]); }
  let plates = null, plateText = null;
  const results = [];
  for (const c of file.changes) {
    if (c.kind === 'prop') {
      if (!SLOTS.includes(c.slot)) throw new Error('prop: no slot ' + c.slot);
      const n = sliceHolding(root, c.car, slices);
      if (n === null) throw new Error('prop: ' + c.car + ' has no generated row in any slice file (run scripts/prop-anchors.mjs ' + c.car + ' --write first)');
      // the row the reader uses now: a hand row (the later slice wins, as render/propanchors.js merges them), else the generated one
      let handNow = null, handIn = null;
      for (const k of Object.keys(slices).map(Number).sort((a, b) => a - b)) if (slices[k].hand?.[c.car]?.[c.slot]) { handNow = slices[k].hand[c.car][c.slot]; handIn = k; }
      const gen = slices[n].cars[c.car][c.slot] || null;
      const before = handNow || gen;
      let next; // the hand row to store, or null for none
      if (c.reset) next = null;
      else if (c.undo) {
        const p = handNow?.prev;
        if (!handNow || handNow.by !== 'editor') throw new Error('prop: ' + c.car + ' ' + c.slot + ' has no editor row to undo');
        next = !p || p.src === 'generated' ? null : p.src === 'editor' ? { ...stripPrev(p), by: 'editor' } : stripPrev(p);
        if (next) delete next.src;
      } else {
        next = { ...normPropRow({ ...c.row, existing: c.row?.existing ?? !!(gen?.existing || before?.existing) }), by: 'editor' }; // (existing: the car has its own prop of the slot, a fact of its model)
        const prev = { ...stripPrev(before), src: handNow ? (handNow.by === 'editor' ? 'editor' : 'hand') : 'generated' };
        if (prev.src === 'generated' || !(handNow && JSON.stringify(stripPrev(handNow)) === JSON.stringify(stripPrev(next)))) next.prev = prev; // (prev: the row this one replaced)
        if (handNow?.by === 'editor' && JSON.stringify(stripPrev(handNow)) === JSON.stringify(stripPrev(next))) next.prev = handNow.prev; // (written again unchanged: keep its prev)
      }
      // one place only: where its hand row is now (else the car's own slice file); out of every other slice's hand block
      const at = handIn ?? n;
      for (const k of Object.keys(slices)) {
        const h = slices[k].hand?.[c.car];
        if (h && c.slot in h && (Number(k) !== at || !next)) { delete h[c.slot]; if (!Object.keys(h).length) delete slices[k].hand[c.car]; }
      }
      if (next) {
        slices[at].hand ||= {};
        const h = { ...(slices[at].hand[c.car] || {}), [c.slot]: next }, ordered = {};
        for (const s of SLOTS) if (h[s]) ordered[s] = h[s];
        slices[at].hand[c.car] = ordered;
      }
      results.push({ kind: 'prop', id: c.car, slot: c.slot, file: SLICE_DIR + '/slice-' + at + '.json', before, after: next || gen, stored: next, was: handIn, note: next ? 'hand row (editor)' : 'generated row (no hand row)' });
    } else if (c.kind === 'plate') {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(c.key || '')) throw new Error('plate: bad key ' + c.key);
      if (!plates) { plates = readPlates(root); plateText = plates.text; }
      const before = platePrev(plates, c.key), base = plates.PLATE_VARIANTS[c.key] || plates.PLATE_TABLE[c.key];
      if (!base && !plates.HAND[c.key] && !c.row) throw new Error('plate: ' + c.key + ' is in neither table');
      let entry; // the HAND entry to store, or null for none
      if (c.reset) entry = null;
      else if (c.undo) {
        const h = plates.HAND[c.key];
        if (!h || h.by !== 'editor') throw new Error('plate: ' + c.key + ' has no editor entry to undo');
        const p = h.prev;
        entry = !p || p.src === 'generated' ? null : (() => { const { src, ...rest } = p; return src === 'editor' ? { ...rest, by: 'editor' } : rest; })();
      } else {
        entry = { ...normPlateRow(c.row), by: 'editor' };
        const h = plates.HAND[c.key];
        entry.prev = h?.by === 'editor' && JSON.stringify(normPlateRow(h)) === JSON.stringify(normPlateRow(entry)) ? h.prev : before;
      }
      let text = rewriteHand(plateText, c.key, entry ? jsKey(c.key) + ': ' + lit(entry) + ',' + (entry.by === 'editor' ? ' // (placed in the model editor, ' + date + ')' : '') : null);
      if (entry) text = dropNone(text, c.key);
      plateText = text;
      plates = { ...plates, text, HAND: evalLiteral(block(text, 'HAND').src), HAND_NONE: evalLiteral(block(text, 'HAND_NONE').src) };
      const after = platePrev(plates, c.key);
      results.push({ kind: 'plate', id: c.key, file: PLATE_FILE, before, after, stored: entry, note: entry ? 'HAND entry (editor)' : 'generated row (no HAND entry)' });
    } else throw new Error('a change is kind prop or plate, not ' + c.kind);
  }
  // the files as they will be, and the diff
  const files = [], diffs = [];
  for (const n of Object.keys(slices)) {
    const text = formatSlice(Number(n), slices[n]);
    if (text !== sliceText[n]) { files.push(sliceFile(root, n)); diffs.push(lineDiff(sliceText[n], text, SLICE_DIR + '/slice-' + n + '.json')); if (!dry) writeFileSync(sliceFile(root, n), text); }
  }
  if (plateText !== null) {
    const old = readFileSync(join(root, PLATE_FILE), 'utf8');
    if (plateText !== old) {
      evalLiteral(block(plateText, 'HAND').src); // (it still parses)
      files.push(join(root, PLATE_FILE)); diffs.push(lineDiff(old, plateText, PLATE_FILE));
      if (!dry) writeFileSync(join(root, PLATE_FILE), plateText);
    }
  }
  return { results, files, diff: diffs.join('\n') };
};
