// Z-FIGHTING, found from the geometry (no screenshots): every car's model is built headless (as scripts/.modelpatch-check.mjs
// does), every visible mesh's triangles taken into world space, and each pair of triangles that lie in (nearly) the same plane
// and overlap in area is a place where the depth buffer cannot tell which surface is in front (render/zfight.js: only pairs a
// camera outside the car could see together).
//   node scripts/.zfight-check.mjs                      every car and its Super version, Good and Evil: a summary, and exit 1
//                                                       if any pair is neither fixed nor accepted (the render group runs it)
//   node scripts/.zfight-check.mjs <car id> ...         just those cars (a Super one as super-<id>)
//   --report=<file.md>   write the full list (per car: the two surfaces, where, how much, how far apart, accepted or not)
//   --gap=<mm>           planes closer than this count as the same (default 4)
//   --min=<cm2>          ignore an overlap smaller than this (default 1)
//   --evil=0             Good only (default: both sides: a livery can change which colours meet)
//   --super=0            no Super versions (default: each garage car's Super, cars.js superOf, its kit on: render/carExtras.js)
// ACCEPTED (counted, listed in the report, never failing): a pair of one flat colour lit alike (`sameColour`: nothing to see
// flicker), a pair one of whose materials has a polygon offset (`offset`: the offset decides it), and the ALLOW list below.
// Not caught: fighting that only appears at a far camera (it depends on the scene's near/far), damage, parts the game adds in a
// level, livery stripes added by the page, or poses other than the one the model is built in (animate is not run).
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';

// the pairs left as they are (CHECKLIST 510): car id (its Super version shares it), the pair's middle (m, within 5 cm), why
const ALLOW = [
  { car: 'supermini', at: [-0.73, 1.15, -0.05], why: 'window surround 3.6 mm behind the glass (cabinGlass sideLift, tuned by the glass-window work: .glass-window-check)' },
  { car: 'supermini', at: [0.71, 1.28, 0.24], why: 'window surround 2.4 mm off the body (as above: it cannot be 4.5 mm from both the glass and the body)' },
  { car: 'touringcar', at: [0.9, 1.06, -0.13], why: 'side glass 3.8 mm off the body (cabinGlass sideLift, as the Supermini)' },
  { car: 'hillclimb', at: [-0.82, 1.14, -0.4], why: 'side glass 3.5 mm off the body (cabinGlass sideLift, as the Supermini)' },
  { car: 'buggy', at: [0.26, 0.68, 0.35], why: 'the tub\'s own bevel folds over itself at the cockpit lip, 1.5 mm, one paint; fixing it changes the tub\'s outline' },
  { car: 'hardtop', at: [0.82, 1.45, 0.19], why: 'the thin roof\'s own bevel folds over itself at its edge, 3.9 mm, one paint; fixing it changes the roof\'s outline' },
  { car: 'earned-jetboat', at: [-0.37, 0.32, -2.7], why: 'the hull and its livery stripe end in one transom plane: models.js 453/454, next to claude/windscreens\' edit of this car; fix after that merges' },
];
const allowed = (car, g) => ALLOW.find(a => (a.car === car.id || a.car === car.base?.id) && Math.hypot(a.at[0] - g.at.x, a.at[1] - g.at.y, a.at[2] - g.at.z) < 0.05);

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.split('=')[1] : fallback; };
const ids = args.filter(a => !a.startsWith('--'));
const GAP = (+opt('gap', 4)) / 1000, MIN_AREA = (+opt('min', 1)) / 10000, SIDES = opt('evil', '1') === '0' ? [false] : [false, true];
const SUPER = opt('super', '1') !== '0';
const report = opt('report', '');
const CERTAIN = 0.0005; // m (as render/zfight.js's CERTAIN): under half a millimetre apart a 24-bit depth buffer cannot split them at any distance the game draws a car from (camera near 0.5); further apart it can, so they only fight on a weaker GPU (16-bit depth) or at a long distance

const { load, close } = await startModels();
try {
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const MP = await load('render/modelpatch.js');
  const apply = await load('render/modelpatchapply.js');
  apply.setModelPatching(false);
  const { IDEA_CARS } = await load('ideas.js');
  const { findZFights } = await load('render/zfight.js');
  const { showroomCars } = await load('showroomData.js');
  const { superOf } = await load('cars.js');
  const base = [...new Map([...showroomCars().filter(Boolean), ...IDEA_CARS].map(c => [c.id, c])).values()];
  const all = [...base, ...(SUPER ? base.map(superOf).filter(Boolean) : [])];
  const cars = all.filter(c => !ids.length || ids.includes(c.id));

  const lines = [], summary = [], open = [];
  let total = 0, certain = 0, accepted = 0;

  for (const car of cars) {
    for (const evil of SIDES) {
      let model;
      try { model = buildInspectModel(car, evil); } catch { continue; }
      model.updateMatrixWorld(true);
      const { parts, nodes } = MP.extractParts(model);
      const label = new Map(); // mesh -> what to call it
      for (const [id, node] of nodes) { const p = parts.find(q => q.id === id); label.set(node, p ? { id, name: p.name || '', role: p.role || '' } : { id, name: '', role: '' }); }

      const found = findZFights(model, { gap: GAP, minArea: MIN_AREA });
      if (!found.length) continue;
      const why = (g) => (g.sameColour ? 'one colour' : g.offset ? 'polygon offset' : allowed(car, g)?.why || '');
      const bad = found.filter(g => !why(g));
      total += found.length; accepted += found.length - bad.length;
      certain += bad.filter(g => g.certain).length;
      const side = car.id + (evil ? ' (Evil)' : '');
      summary.push(side + ': ' + found.length + (bad.length ? ' (' + bad.length + ' NOT accepted, ' + bad.filter(g => g.certain).length + ' certain)' : ' (all accepted)'));
      for (const g of bad) open.push(side + ' at ' + [g.at.x, g.at.y, g.at.z].map(v => v.toFixed(2)).join(', ') + ', ' + (g.gapMin * 1000).toFixed(1) + ' mm');
      const where = (g) => { const c = g.at; const n = g.normal; const ax = Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? (n.x > 0 ? 'left' : 'right') + ' side' : Math.abs(n.y) > Math.abs(n.z) ? (n.y > 0 ? 'top' : 'underside') : (n.z > 0 ? 'front' : 'rear'); return ax + ', ' + (c.z >= 0 ? 'front ' : 'rear ') + 'z ' + c.z.toFixed(2) + ', y ' + c.y.toFixed(2) + (Math.abs(c.x) > 0.05 ? ', x ' + c.x.toFixed(2) : ''); };
      const hex = (m) => (m && m.color ? '#' + m.color.getHexString() : '(map)') + (m?.transparent ? ' t' + (m.opacity ?? 1).toFixed(2) : '') + (m?.side === THREE.DoubleSide ? ' 2-sided' : '');
      const name = (n) => { const l = label.get(n) || {}; return (l.name || l.role || 'part') + ' [' + (l.id || '?') + ']'; };
      lines.push('', '## ' + car.name + ' (`' + car.id + '`) ' + (evil ? 'Evil' : 'Good') + ' - ' + found.length + ' surface pair' + (found.length > 1 ? 's' : '') + ', ' + bad.length + ' not accepted');
      lines.push('', '| # | surface A | surface B | where | overlap | gap | faces | will it fight | accepted |', '|--|--|--|--|--|--|--|--|--|');
      found.forEach((g, k) => {
        lines.push('| ' + (k + 1) + ' | ' + name(g.a) + ' ' + hex(g.aMat) + ' | ' + name(g.b) + ' ' + hex(g.bMat) + ' | ' + where(g) + ' | ' + (g.area * 10000).toFixed(1) + ' cm2 | ' + (g.gapMin * 1000).toFixed(1) + '-' + (g.gapMax * 1000).toFixed(1) + ' mm | '
          + (g.sameFacing ? 'same way' : 'opposite') + ' | ' + (g.sameColour ? 'no: one colour' : g.certain ? '**YES**' : 'maybe (weak GPU / far)') + ' | ' + (why(g) || '**NO**') + ' |');
      });
    }
  }
  console.log(total + ' z-fighting surface pair' + (total === 1 ? '' : 's') + ' in ' + summary.length + ' car view' + (summary.length === 1 ? '' : 's') + ' of ' + cars.length + ' cars (gap <= ' + GAP * 1000 + ' mm, overlap >= ' + MIN_AREA * 10000 + ' cm2), ' + accepted + ' accepted');
  if (open.length) console.log('NOT accepted (' + certain + ' of them under ' + CERTAIN * 1000 + ' mm):\n  ' + open.join('\n  '));
  if (args.includes('--verbose')) console.log(summary.join('\n'));
  if (report) writeFileSync(report, '# Z-fighting report\n\nPlanes within ' + GAP * 1000 + ' mm, overlap at least ' + MIN_AREA * 10000 + ' cm2, ' + cars.length + ' cars. Surfaces are named by the model editor\'s part name/role and id.\n' + lines.join('\n') + '\n');
  console.log(open.length ? 'zfight: FAIL' : 'zfight: ok');
  process.exitCode = open.length ? 1 : 0;
} finally { await close(); }
