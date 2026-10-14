// Z-FIGHTING, found from the geometry (no screenshots): every car's model is built headless (as scripts/.modelpatch-check.mjs
// does), every visible mesh's triangles taken into world space, and each pair of triangles that lie in (nearly) the same plane
// and overlap in area is a place where the depth buffer cannot tell which surface is in front. A pair is only reported if it
// could show: its two materials are not the same flat colour, and, back to back, one of them draws both sides.
//   node scripts/.zfight-check.mjs                      every car, Good and Evil: a summary (and a non-zero exit if there are any
//                                                       above the threshold: it is a report first, a check once they are decided)
//   node scripts/.zfight-check.mjs <car id> ...         just those cars
//   --report=<file.md>   write the full list (per car: the two surfaces, where, how much, how far apart, a suggestion)
//   --gap=<mm>           planes closer than this count as the same (default 4)
//   --min=<cm2>          ignore an overlap smaller than this (default 1)
//   --evil=0             Good only (default: both sides: a livery can change which colours meet)
// Not caught: fighting that only appears at a far camera (it depends on the scene's near/far), parts the game adds to a car later
// (damage, Super kits as they are built in a level, livery stripes added by the page), or poses other than the one the model is
// built in (animate is not run).
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.split('=')[1] : fallback; };
const ids = args.filter(a => !a.startsWith('--'));
const GAP = (+opt('gap', 4)) / 1000, MIN_AREA = (+opt('min', 1)) / 10000, SIDES = opt('evil', '1') === '0' ? [false] : [false, true];
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
  const cars = [...new Map([...showroomCars().filter(Boolean), ...IDEA_CARS].map(c => [c.id, c])).values()].filter(c => !ids.length || ids.includes(c.id));

  const lines = [], summary = [];
  let total = 0, certain = 0;

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
      total += found.length;
      summary.push(car.id + (evil ? ' (Evil)' : '') + ': ' + found.length + ' (' + found.filter(g => g.certain && !g.sameColour).length + ' certain, ' + found.filter(g => g.sameColour).length + ' same colour)');
      certain += found.filter(g => g.certain && !g.sameColour).length;
      const where = (g) => { const c = g.at; const n = g.normal; const ax = Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? (n.x > 0 ? 'left' : 'right') + ' side' : Math.abs(n.y) > Math.abs(n.z) ? (n.y > 0 ? 'top' : 'underside') : (n.z > 0 ? 'front' : 'rear'); return ax + ', ' + (c.z >= 0 ? 'front ' : 'rear ') + 'z ' + c.z.toFixed(2) + ', y ' + c.y.toFixed(2) + (Math.abs(c.x) > 0.05 ? ', x ' + c.x.toFixed(2) : ''); };
      const hex = (m) => (m && m.color ? '#' + m.color.getHexString() : '(map)') + (m?.transparent ? ' t' + (m.opacity ?? 1).toFixed(2) : '') + (m?.side === THREE.DoubleSide ? ' 2-sided' : '');
      const name = (n) => { const l = label.get(n) || {}; return (l.name || l.role || 'part') + ' [' + (l.id || '?') + ']'; };
      const meshArea = new Map(); model.traverseVisible((n) => { if (n.isMesh && n.geometry?.attributes.position) { meshArea.set(n, n.geometry.attributes.position.count); } }); // (its vertex count: a rough size to tell the decal from the body)
      lines.push('', '## ' + car.name + ' (`' + car.id + '`) ' + (evil ? 'Evil' : 'Good') + ' - ' + found.length + ' surface pair' + (found.length > 1 ? 's' : ''));
      lines.push('', '| # | surface A | surface B | where | overlap | gap | faces | will it fight | suggestion |', '|--|--|--|--|--|--|--|--|--|');
      found.forEach((g, k) => {
        const small = (meshArea.get(g.a) || 0) <= (meshArea.get(g.b) || 0) ? [g.a, g.b] : [g.b, g.a]; // (the smaller surface is usually the decal)
        lines.push('| ' + (k + 1) + ' | ' + name(g.a) + ' ' + hex(g.aMat) + ' | ' + name(g.b) + ' ' + hex(g.bMat) + ' | ' + where(g) + ' | ' + (g.area * 10000).toFixed(1) + ' cm2 | ' + (g.gapMin * 1000).toFixed(1) + '-' + (g.gapMax * 1000).toFixed(1) + ' mm | '
          + (g.sameFacing ? 'same way' : 'opposite') + ' | ' + (g.sameColour ? 'no: same colour (a doubled surface)' : g.certain ? '**YES**' : 'maybe (weak GPU / far)') + ' | ' + name(small[0]) + ' should win (out ~3 mm)' + ' |');
      });
    }
  }
  console.log(total + ' z-fighting surface pair' + (total === 1 ? '' : 's') + ' in ' + summary.length + ' car view' + (summary.length === 1 ? '' : 's') + ' (gap <= ' + GAP * 1000 + ' mm, overlap >= ' + MIN_AREA * 10000 + ' cm2):');
  console.log(summary.join('\n'));
  console.log(certain + ' of them certain (under ' + CERTAIN * 1000 + ' mm apart)');
  if (report) writeFileSync(report, '# Z-fighting report\n\nPlanes within ' + GAP * 1000 + ' mm, overlap at least ' + MIN_AREA * 10000 + ' cm2, ' + cars.length + ' cars. Surfaces are named by the model editor\'s part name/role and id.\n' + lines.join('\n') + '\n');
  process.exitCode = total ? 1 : 0;
} finally { await close(); }
