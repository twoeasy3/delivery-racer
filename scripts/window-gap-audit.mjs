// FLOATING WINDOWS (the owner, 17-Oct: "there are some cars with floating windscreens that I can't fix"; CHECKLIST 448): every vehicle the game
// builds (scripts/audit-windows.mjs buildAll: roster, supers, fillers, bespoke / event / earned / Legendary / secret / level cars, ideas,
// traffic), headless, read-only. Each window pane the model editor lists (render/modelpatch.js extractParts) is measured against the car's
// body (every shown part that is not a window or a wheel) and the car's other panes (a pane meeting another pane rests) with the editor's own measure (render/paneedit.js gapOf): GAP = the median over
// the pane's rim of its distance to the body beyond 6 mm (the glass's own proud lay), CLEAR = the rim's nearest point to the body.
// Listed: a pane with a gap over --min (default 1 cm), or clear of every part by more than 1 cm (floats entirely). A pane under --area
// (0.02 m2: a lamp lens in glass colour, a gauge) is skipped. Supers and Legendaries share their base car's model: listed once, with the
// variants named.
//   node scripts/window-gap-audit.mjs [ids...] [--min=0.01] [--md] [--json=<file>]
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';
import { buildAll } from './audit-windows.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const only = args.filter(a => !a.startsWith('--')), MIN = +opt('min', 0.01), AREA = +opt('area', 0.02);

export const measureModel = (model, MP, PE) => {
  model.updateMatrixWorld(true);
  const ex = MP.extractParts(model), { panes, nodes } = ex;
  const shown = (n) => { for (let p = n; p && p !== model; p = p.parent) if (!p.visible) return false; return true; };
  const out = [];
  for (const [id, ps] of panes) {
    const node = nodes.get(id); if (!node?.isMesh || !shown(node)) continue;
    for (const q of ps) {
      const f = PE.paneFrame(node, model, q), area = f.width * f.height;
      if (area < AREA) continue;
      const g = PE.paneGap(model, node, q, PE.restItems(model, ex, MP.isWindowPart, node, q));
      out.push({ part: id, pane: q.name, area: Math.round(area * 1000) / 1000, gap: g.gap, clear: g.clear });
    }
  }
  return out;
};

if (process.argv[1] && /window-gap-audit\.mjs$/.test(process.argv[1])) {
  const t0 = Date.now();
  const { load, close } = await startModels();
  try {
    const MP = await load('render/modelpatch.js'), PE = await load('render/paneedit.js');
    const { entries } = await buildAll(load);
    const rows = [], byModel = new Map();
    for (const e of entries) {
      if (only.length && !only.includes(e.id)) continue;
      let model; try { model = e.build(); } catch { continue; }
      if (!model) continue;
      const sig = MP.modelSignature(model);
      if (byModel.has(sig)) { byModel.get(sig).also.push(e.id); continue; }
      const panes = measureModel(model, MP, PE);
      const bad = panes.filter(p => p.gap > MIN || p.clear > 0.01 + 0.006);
      const row = { id: e.id, name: e.name, group: e.group, also: [], panes: panes.length, bad };
      byModel.set(sig, row); rows.push(row);
    }
    // a Super / Legendary variant: its base car's panes folded into the base's row (named under Also), its own extra panes kept
    for (const r of rows) {
      const baseId = r.id.replace(/^(super-|l-)/, ''), base = baseId !== r.id && rows.find(x => x.id === baseId);
      if (!base) continue;
      const same = (b) => base.bad.some(x => x.pane === b.pane && Math.abs(x.gap - b.gap) < 0.001);
      if (r.bad.some(same)) base.also.push(r.id);
      r.bad = r.bad.filter(b => !same(b));
    }
    const flagged = rows.filter(r => r.bad.length).sort((a, b) => Math.max(...b.bad.map(x => x.gap)) - Math.max(...a.bad.map(x => x.gap)));
    const cm = (m) => (m * 100).toFixed(1);
    if (args.includes('--md')) {
      console.log('| Car | Pane [part] | Gap cm | Clear cm | Also |\n|---|---|---|---|---|');
      for (const r of flagged) for (const b of r.bad.sort((x, y) => y.gap - x.gap)) console.log('| ' + r.id + ' (' + r.name + ', ' + r.group + ') | ' + b.pane + ' [' + b.part + '] | ' + cm(b.gap) + ' | ' + (b.clear >= 0.3 ? '30+' : b.clear > 0.016 ? '**' + cm(b.clear) + '**' : cm(b.clear)) + ' | ' + r.also.join(', ') + ' |');
    } else {
      for (const r of flagged) console.log(r.id.padEnd(22) + r.bad.map(b => b.pane + ' gap ' + cm(b.gap) + ' cm clear ' + (b.clear >= 0.3 ? '30+' : cm(b.clear)) + ' cm').join('; ') + (r.also.length ? '  (also ' + r.also.join(', ') + ')' : ''));
    }
    console.log('models ' + rows.length + ', panes ' + rows.reduce((s, r) => s + r.panes, 0) + ', flagged models ' + flagged.length + ', flagged panes ' + flagged.reduce((s, r) => s + r.bad.length, 0) + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
    const js = opt('json', null); if (js) writeFileSync(js, JSON.stringify(flagged, null, 1));
  } finally { await close(); }
}
void THREE;
