// The PROP PLACEMENT AUDIT (the owner, 15-Oct: the first round's wings were too small, not at the rear edge, sometimes on the car's own
// untagged wing; roof insets too deep; props too small in general; slots called unsupported where a bed has room). For every car of the prop
// roster (scripts/prop-roster.mjs) it builds the model as the showroom does (render/showcar.js makeShowCar), takes its TRIANGLES as drawn
// (scripts/prop-audit-lib.mjs), and for each slot (roof, cargo, wing):
//   - the table's placement (render/propanchors.js fitProp: the canonical box and cylinder, and real props: the GT wing, duck-tail lip,
//     race wing, tube wing; roof box, sign, dish; crate stack, barrel), with the car's own tagged props OF THAT SLOT hidden (as the game
//     does when one prop is worn; the other slots' own props stay: a worn roof prop beside the car's own wing):
//       support (what the footprint stands on, the gap under it: HOVER), INSET (as placed, and the least inset that makes every corner touch),
//       INTRUSION (the car's visible surface inside the shape beyond the inset: how deep, which meshes; for the real props too),
//       the other slots' shapes it overlaps, the wing's width against the body's width at its z
//   - the OPTIMUM (prop-audit-lib.mjs best): the largest uniform scale that stands on the surface with at most MAX_INSET of inset, touches
//     nothing and (a wing) is no wider than the body, searched along the car (a wing prefers the rear-most place within 85 % of the best
//     scale); UTILISATION = scale / min(cap, the optimum's scale); the wing's offset from the optimum's z; unsupported slots that fit (MISSED)
//   - each real prop AS WORN (fitProp with the prop: at most its own maxScale, CHECKLIST 450): PROP-AT-MAX (no weight, information) when its max
//     made it smaller than the slot's room; the csv's atMax column lists them as 'id scale/room'
//   - thin plates with air under them near the tail (a spoiler) that are not tagged (UNTAGGED-WING), and a wing standing on one (ON-WING)
// Output: /tmp/prop-audit/audit.csv (a row per car and slot, worst first), audit.json (everything), and the flag counts.
//   node scripts/prop-placement-audit.mjs [car ids...] [--jobs 3] [--out /tmp/prop-audit] [--table <json>: audit a candidate table instead]
//   --nohand: the generated rows alone (the slice files' hand fixes ignored)
//   (--part i/n: one worker's share; the parent spawns them)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const args = process.argv.slice(2);
const flag = (n, f = null) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
import { MAX_INSET } from './prop-audit-lib.mjs';
const OUT = flag('--out', '/tmp/prop-audit'), part = flag('--part'), jobs = Number(flag('--jobs', 3));
const only = args.filter((a, i) => !a.startsWith('--') && !['--out', '--part', '--jobs', '--table', '--tag'].includes(args[i - 1]));
const REAL = { wing: ['winggt', 'winglip', 'wing-race', 'wingtube'], roof: ['roofbox', 'roofsign', 'roof-dish'], cargo: ['cargocrates', 'cargobarrel'] };
const CARGO_KINDS = new Set(['pickup', 'flatbed', 'halftrack', 'open', 'truck', 'special']);
const NO_ROOF = new Set(['open', 'canopy', 'craft', 'tank', 'micro', 'bike']), NO_WING = new Set(['canopy', 'craft', 'tank', 'micro', 'bike']);
mkdirSync(OUT, { recursive: true });
const r2 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100), r3 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 1000) / 1000);

if (!part) {
  // ---- the parent: split the roster over `jobs` workers, then merge ----
  const self = fileURLToPath(import.meta.url);
  const pass = args.filter((a, i) => a !== '--jobs' && args[i - 1] !== '--jobs');
  const n = only.length && only.length < 6 ? 1 : jobs;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: n }, (_, i) => new Promise((done) => {
    const p = spawn(process.execPath, [self, ...pass, '--part', i + '/' + n], { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('exit', done);
  })));
  const rows = [];
  for (let i = 0; i < n; i++) { const f = OUT + '/part-' + i + '.json'; if (existsSync(f)) rows.push(...JSON.parse(readFileSync(f, 'utf8'))); }
  report(rows);
  console.log('audit took ' + Math.round((Date.now() - t0) / 1000) + ' s');
} else {
  await worker(...part.split('/').map(Number));
}

async function worker(k, n) {
  const { startModels } = await import('./modelpatch-load.mjs');
  const { roster } = await import('./prop-roster.mjs');
  const L = await import('./prop-audit-lib.mjs');
  const { load, close } = await startModels();
  const rows = [];
  try {
    const C = await load('cars.js');
    const { IDEA_CARS } = await load('ideas.js');
    const P = await load('render/propanchors.js');
    const { makeShowCar } = await load('render/showcar.js');
    const { glassy } = await load('render/dents.js');
    const PM = await load('render/propmodels.js');
    if (flag('--table')) { // (a candidate table: { <car id>: { roof, cargo, wing } } replaces the merged one's rows)
      const t = JSON.parse(readFileSync(flag('--table'), 'utf8'));
      for (const [id, e] of Object.entries(t)) { P.PROP_TABLE[id] = e; delete P.HAND[id]; }
    }
    if (args.includes('--nohand')) for (const id of Object.keys(P.HAND)) delete P.HAND[id]; // (the generated rows alone)
    let list = roster(C, IDEA_CARS);
    if (only.length) list = list.filter(c => only.includes(c.car.id));
    list = list.filter((_, i) => i % n === k);
    for (const { group, car } of list) {
      const t0 = Date.now();
      let model;
      try { model = makeShowCar(car); } catch (e) { rows.push({ car: car.id, group, error: e.message }); continue; }
      model.parent?.remove(model); model.userData.animate?.(0); model.updateMatrixWorld(true);
      const g = L.carGeometry(model, glassy);
      const kind = P.kindOf(car), plan = P.propSlots(car.id);
      const tail = g.box.min.z, len = g.box.max.z - g.box.min.z;
      const hideSlot = (slot) => (m) => g.meshes[m].tag !== slot;
      // ---- the optimum of each slot (prop-audit-lib.mjs optimum: the same search the generator uses) ----
      const { opt } = L.optimum(g, P, kind, { maxInset: MAX_INSET });
      // ---- thin plates near the tail: wings, spoilers (with the wing props hidden: anything left is untagged or tagged another slot) ----
      const bladesAll = g.blades(hideSlot('wing'));
      const bw0 = g.widthAt(tail + len * 0.15).w || (g.box.max.x - g.box.min.x);
      const wingLike = bladesAll.filter(b => b.z1 < tail + len * 0.45 && b.x1 - b.x0 >= 0.5 * bw0 && b.y > 0.5 && (b.z1 - b.z0) >= 0.079 && (b.z1 - b.z0) < 0.9)
        .map(b => ({ ...b, names: b.meshes.slice(0, 3).map(m => g.meshes[m].name + (g.meshes[m].tag ? '[' + g.meshes[m].tag + ']' : '') + '/' + g.meshes[m].kind) }));
      // ---- the table's placements ----
      const placed = {};
      for (const slot of P.SLOTS) {
        const s = plan[slot];
        const row = { car: car.id, group, kind, slot, supported: s.supported, reason: s.reason, from: s.from, lim: s.limit, conf: s.confidence, existing: s.existing, flags: [] };
        const cap = P.maxScale(slot, kind);
        row.cap = cap;
        const ob = opt[slot + '-box'], oc = opt[slot + '-cyl'];
        row.opt = ob ? { s: r2(ob.s), sCapped: r2(Math.min(cap, ob.sMax)), sMax: r2(ob.sMax), z: r3(ob.z), y: r3(ob.y), inset: r3(ob.inset), warn: ob.warn } : null;
        row.optCyl = oc ? { s: r2(oc.s), sCapped: r2(Math.min(cap, oc.sMax)), z: r3(oc.z), y: r3(oc.y), inset: r3(oc.inset) } : null;
        const applicable = slot === 'roof' ? !NO_ROOF.has(kind) : slot === 'wing' ? !NO_WING.has(kind) : CARGO_KINDS.has(kind);
        row.applicable = applicable;
        if (!s.supported) {
          if (ob && ob.s >= P.MIN_SCALE[slot] && applicable) row.flags.push('MISSED');
          else if (ob && ob.s >= P.MIN_SCALE[slot] + 0.15 && slot !== 'cargo') row.flags.push('MISSED?KIND');
          rows.push(row); continue;
        }
        const allow = hideSlot(slot);
        for (const shape of ['box', 'cyl']) {
          const sh = shape === 'box' ? s.box : s.cylinder;
          const m = L.measureShape(g, P.PROP_BOUNDS[slot], slot, shape, sh.scale, sh.centre[0], sh.centre[1], sh.centre[2], sh.inset || 0, allow);
          const info = { s: sh.scale, x: sh.centre[0], y: sh.centre[1], z: sh.centre[2], inset: r3(sh.inset || 0), need: r3(m.need), minGap: r3(m.minGap), air: r2(m.air), kinds: m.kinds,
            pen: r3(L.effDepth(g, m.intr)), penArea: r3(m.intr.area), penBy: [...m.intr.meshes].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([mi, dep]) => g.meshes[mi].name + '/' + g.meshes[mi].kind + (g.meshes[mi].tag ? '[' + g.meshes[mi].tag + ']' : '') + ' ' + Math.round(dep * 100) + 'cm'),
            H: r3(m.d.H), W: r3(m.d.W) };
          placed[slot + '-' + shape] = L.volume(m.d, sh.centre[0], m.base, sh.centre[2]);
          row[shape] = info;
        }
        const b = row.box;
        // the scale against the optimum
        const best = Math.min(cap, ob ? ob.sMax : 0);
        row.util = best > 0 ? r2(b.s / best) : null;
        if (row.util != null && row.util < 0.7) row.flags.push('SMALL');
        if (!ob) row.flags.push('NOFIT');
        // the wing: its width against the body's, its place against the optimum's
        if (slot === 'wing') {
          const bw = g.widthAt(b.z, 0.3, allow).w, sw = g.widthAt(b.z, b.y - b.H / 2 - b.inset - 0.15, allow).w;
          row.bodyW = r3(bw); row.surfW = r3(sw); row.surfRatio = sw ? r2(b.W / sw) : null;
          if (row.surfRatio != null && row.surfRatio > 1.02) row.flags.push('WIDER-THAN-SURFACE'); row.wingW = r3(b.W); row.widthRatio = bw ? r2(b.W / bw) : null;
          if (row.surfRatio != null && row.surfRatio < 0.7) row.flags.push('NARROW'); // (narrower than 70 % of the surface it stands on)
          if (ob) {
            row.zOff = r3(b.z - ob.z); row.yOff = r3(b.y - ob.y);
            if (row.zOff > 0.25) row.flags.push('FORWARD');
            if (Math.abs(row.yOff) > 0.2 && Math.abs(row.zOff) > 0.15) row.flags.push('WRONG-SURFACE');
          }
          row.distFromTail = r3(b.z - b.D / 2 - tail);
          const fp = { x0: b.x - b.W / 2, x1: b.x + b.W / 2, z0: b.z - 0.15 * b.s, z1: b.z + 0.15 * b.s };
          const on = wingLike.filter(w => w.x1 > fp.x0 - 0.05 && w.x0 < fp.x1 + 0.05 && w.z1 > fp.z0 - 0.1 && w.z0 < fp.z1 + 0.1);
          if (on.length) { row.flags.push('ON-WING'); row.onWing = on.map(w => w.names.join('+')); }
        }
        // inset and contact
        for (const shape of ['box', 'cyl']) {
          const i = row[shape];
          if (i.inset > 0.045) row.flags.push('INSET-' + shape);
          if (i.inset > i.H / 3) row.flags.push('BURIED-' + shape);
          if (i.inset - i.need > 0.02) row.flags.push('INSET>NEED-' + shape);
          if (i.minGap != null && i.minGap > 0.03) row.flags.push('HOVER-' + shape);
          if (i.minGap == null) row.flags.push('NOSUPPORT-' + shape);
          if ((i.kinds.glass || 0) > 0) row.flags.push('ON-GLASS-' + shape);
          if (i.pen > 0.02) row.flags.push('PEN-' + shape);
        }
        // the real props, placed exactly as render/propdress.js does (fitProp: position, rotation.y in degrees, a uniform scale)
        row.props = {};
        for (const id of REAL[slot]) {
          const def = PM.propById(id);
          if (!def) continue;
          const fit = P.fitProp(car.id, slot, def.shape, def); // (as worn: at most the prop's own maxScale, seated on the slot's base)
          if (!fit) continue;
          const prop = PM.buildProp(id);
          prop.position.set(...fit.position); prop.rotation.y = fit.rotationY * Math.PI / 180; prop.scale.setScalar(fit.scale);
          prop.updateMatrixWorld(true);
          const sh = def.shape === 'box' ? s.box : s.cylinder, d = L.dims(P.PROP_BOUNDS[slot], def.shape === 'box' ? 'box' : 'cyl', sh.scale);
          const unsunk = sh.centre[1] - d.H / 2;
          let pen = 0, by = '', buried = 0, verts = 0, lowGap = Infinity, minY = Infinity;
          const bb = new THREE.Box3(), v = new THREE.Vector3();
          prop.traverse((o) => {
            if (!o.isMesh) return;
            bb.setFromObject(o, true);
            const r = g.intrude({ min: [bb.min.x, Math.max(bb.min.y, unsunk + L.TOL), bb.min.z], max: [bb.max.x, bb.max.y, bb.max.z] }, allow);
            if (L.effDepth(g, r) > pen) { pen = L.effDepth(g, r); by = [...r.meshes].sort((a, b2) => b2[1] - a[1]).map(([mi]) => g.meshes[mi].name + '/' + g.meshes[mi].kind)[0]; }
            const p = o.geometry.attributes.position;
            for (let q = 0; q < p.count; q += Math.max(1, Math.floor(p.count / 60))) { v.fromBufferAttribute(p, q).applyMatrix4(o.matrixWorld); minY = Math.min(minY, v.y); }
          });
          prop.traverse((o) => {
            if (!o.isMesh) return;
            const p = o.geometry.attributes.position;
            for (let q = 0; q < p.count; q += Math.max(1, Math.floor(p.count / 60))) {
              v.fromBufferAttribute(p, q).applyMatrix4(o.matrixWorld); verts++;
              const h = g.support(v.x, v.z, sh.centre[1] + d.H / 2, allow);
              if (h && v.y < h.y - 0.005) buried++;
              if (v.y < minY + 0.01 && h) lowGap = Math.min(lowGap, v.y - h.y);
            }
          });
          row.props[id] = { pen: r3(pen), by, buried: r2(buried / Math.max(1, verts)), standGap: r3(lowGap === Infinity ? null : lowGap), scale: r2(fit.scale), room: r2(fit.room), atMax: fit.capped };
          if (fit.capped) row.flags.push('PROP-AT-MAX'); // (information: the prop is worn at its own maxScale, smaller than the room; CHECKLIST 450)
          if (pen > 0.02) row.flags.push('PROP-PEN');
          if (buried / Math.max(1, verts) > 0.2) row.flags.push('PROP-BURIED');
          if (lowGap !== Infinity && lowGap > 0.03) row.flags.push('PROP-HOVER');
        }
        row.flags = [...new Set(row.flags)];
        rows.push(row);
      }
      // slots against each other (the box shapes; the cylinders too)
      for (const row of rows.filter(r => r.car === car.id && r.supported)) {
        for (const other of P.SLOTS) {
          if (other === row.slot) continue;
          for (const a of ['box', 'cyl']) for (const b of ['box', 'cyl']) {
            const va = placed[row.slot + '-' + a], vb = placed[other + '-' + b];
            if (va && vb && L.overlap(va, vb) > 0) { row.flags.push('SLOT-OVERLAP'); row.overlaps = [...new Set([...(row.overlaps || []), other])]; }
          }
        }
        row.flags = [...new Set(row.flags)];
      }
      // untagged wings on the car (flagged on the wing row)
      const wr = rows.find(r => r.car === car.id && r.slot === 'wing');
      const untagged = wingLike.filter(w => w.meshes.every(m => g.meshes[m].tag !== 'wing'));
      if (wr && untagged.length) { wr.flags.push('UNTAGGED-WING'); wr.untagged = untagged.map(w => w.names.join('+') + ' z ' + r2(w.z0) + '..' + r2(w.z1) + ' y ' + r2(w.y) + ' w ' + r2(w.x1 - w.x0)); }
      for (const r of rows.filter(r => r.car === car.id)) r.ms = Date.now() - t0;
      console.log('  ' + car.id.padEnd(18) + ' ' + rows.filter(r => r.car === car.id).map(r => r.slot + ':' + (r.flags.join(',') || 'ok')).join('  ') + '  (' + (Date.now() - t0) + ' ms)');
    }
  } finally { await close(); }
  writeFileSync(OUT + '/part-' + k + '.json', JSON.stringify(rows));
}

// ---- the report ----
function report(rows) {
  const WEIGHT = { 'PEN-box': 5, 'PEN-cyl': 4, 'PROP-PEN': 5, 'ON-WING': 6, 'UNTAGGED-WING': 3, SMALL: 4, NARROW: 3, FORWARD: 3, 'WRONG-SURFACE': 3, MISSED: 4, 'SLOT-OVERLAP': 3,
    'BURIED-box': 4, 'BURIED-cyl': 3, 'PROP-BURIED': 3, 'INSET-box': 2, 'INSET-cyl': 2, 'HOVER-box': 3, 'HOVER-cyl': 2, 'PROP-HOVER': 2, 'ON-GLASS-box': 4, 'ON-GLASS-cyl': 3, NOFIT: 2, 'PROP-AT-MAX': 0 };
  const score = (r) => r.flags.reduce((s, f) => s + (WEIGHT[f] ?? 1), 0) + (r.util != null ? Math.max(0, 0.9 - r.util) * 5 : 0);
  rows = rows.filter(r => !r.error).sort((a, b) => score(b) - score(a));
  const counts = {};
  for (const r of rows) for (const f of r.flags) counts[f] = (counts[f] || 0) + 1;
  const cols = ['car', 'kind', 'slot', 'supported', 'from', 'scale', 'cylScale', 'optScale', 'util', 'wingW', 'bodyW', 'widthRatio', 'surfW', 'surfRatio', 'z', 'optZ', 'zOff', 'distFromTail',
    'inset', 'needInset', 'cylInset', 'minGap', 'pen', 'penBy', 'cylPen', 'propPen', 'atMax', 'overlaps', 'flags', 'notes'];
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [cols.join(',')];
  for (const r of rows) {
    const propPen = r.props ? Object.entries(r.props).filter(([, p]) => p.pen > 0.02 || p.buried > 0.2 || p.standGap > 0.03).map(([id, p]) => id + ' pen' + Math.round(p.pen * 100) + 'cm bur' + Math.round(p.buried * 100) + '% gap' + (p.standGap == null ? '-' : Math.round(p.standGap * 100) + 'cm') + (p.by ? ' ' + p.by : '')).join('; ') : '';
    lines.push([r.car, r.kind, r.slot, r.supported ? 'yes' : 'no: ' + r.reason, r.from, r.box?.s, r.cyl?.s, r.opt?.sMax, r.util, r.wingW, r.bodyW, r.widthRatio, r.surfW, r.surfRatio, r.box?.z, r.opt?.z, r.zOff, r.distFromTail,
      r.box?.inset, r.box?.need, r.cyl?.inset, r.box?.minGap, r.box?.pen, (r.box?.penBy || []).join('; '), r.cyl?.pen, propPen, r.props ? Object.entries(r.props).filter(([, p]) => p.atMax).map(([id, p]) => id + ' ' + p.scale + '/' + p.room).join('; ') : '', (r.overlaps || []).join(' '), r.flags.join(' '),
      [...(r.onWing ? ['on ' + r.onWing.join('|')] : []), ...(r.untagged ? ['untagged ' + r.untagged.join('|')] : [])].join('; ')].map(esc).join(','));
  }
  writeFileSync(OUT + '/audit.csv', lines.join('\n') + '\n');
  writeFileSync(OUT + '/audit.json', JSON.stringify(rows, null, 0));
  const cars = new Set(rows.map(r => r.car));
  console.log('\n' + cars.size + ' cars, ' + rows.length + ' slot rows; supported: ' + ['roof', 'cargo', 'wing'].map(s => s + ' ' + rows.filter(r => r.slot === s && r.supported).length).join(', '));
  console.log('flags: ' + Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([f, n]) => f + ' ' + n).join(', '));
  console.log('rows flagged: ' + rows.filter(r => r.flags.length).length + '; cars with a flag: ' + new Set(rows.filter(r => r.flags.length).map(r => r.car)).size);
  console.log('written ' + OUT + '/audit.csv, audit.json');
}
