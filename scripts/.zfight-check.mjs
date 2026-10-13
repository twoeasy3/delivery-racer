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
const CERTAIN = 0.0005; // m: under half a millimetre apart a 24-bit depth buffer cannot split them at any distance the game draws a car from (camera near 0.5); further apart it can, so they only fight on a weaker GPU (16-bit depth) or at a long distance

const { load, close } = await startModels();
try {
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const MP = await load('render/modelpatch.js');
  const apply = await load('render/modelpatchapply.js');
  apply.setModelPatching(false);
  const { IDEA_CARS } = await load('ideas.js');
  const { showroomCars } = await load('showroomData.js');
  const cars = [...new Map([...showroomCars().filter(Boolean), ...IDEA_CARS].map(c => [c.id, c])).values()].filter(c => !ids.length || ids.includes(c.id));

  const V = THREE.Vector3;
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

      // every visible mesh's triangles, in world space
      const tris = [];
      model.traverseVisible((node) => {
        if (!node.isMesh || node.isInstancedMesh || !node.geometry) return;
        const g = node.geometry, pos = g.attributes.position;
        if (!pos) return;
        const idx = g.index, total = idx ? idx.count : pos.count;
        const start = Math.max(0, g.drawRange.start), count = Math.max(0, Math.min(total - start, g.drawRange.count));
        const mats = [].concat(node.material);
        const mat = (i) => { const grp = g.groups.find(x => i >= x.start && i < x.start + x.count); return mats[grp ? grp.materialIndex : 0] || mats[0]; };
        for (let i = start; i + 2 < start + count; i += 3) {
          const p = [0, 1, 2].map(k => new V().fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(node.matrixWorld));
          const n = new V().subVectors(p[1], p[0]).cross(new V().subVectors(p[2], p[0]));
          const area = n.length() / 2;
          if (area < 1e-7) continue;
          n.normalize();
          const m = mat(i);
          tris.push({ node, p, n, d: n.dot(p[0]), area, m, lo: new V(Math.min(p[0].x, p[1].x, p[2].x), Math.min(p[0].y, p[1].y, p[2].y), Math.min(p[0].z, p[1].z, p[2].z)), hi: new V(Math.max(p[0].x, p[1].x, p[2].x), Math.max(p[0].y, p[1].y, p[2].y), Math.max(p[0].z, p[1].z, p[2].z)) });
        }
      });
      tris.sort((a, b) => a.lo.x - b.lo.x);

      // the area two coplanar triangles share: project onto the first's plane, clip one convex polygon by the other
      const overlapArea = (A, B) => {
        const ax = new V().subVectors(A.p[1], A.p[0]).normalize(), ay = new V().crossVectors(A.n, ax);
        const to2 = (q) => [q.clone().sub(A.p[0]).dot(ax), q.clone().sub(A.p[0]).dot(ay)];
        let poly = B.p.map(to2);
        let clip = A.p.map(to2);
        const sA = (clip[1][0] - clip[0][0]) * (clip[2][1] - clip[0][1]) - (clip[1][1] - clip[0][1]) * (clip[2][0] - clip[0][0]);
        if (sA < 0) clip = clip.reverse();
        for (let e = 0; e < 3 && poly.length; e++) {
          const c0 = clip[e], c1 = clip[(e + 1) % 3], out = [];
          const side = (q) => (c1[0] - c0[0]) * (q[1] - c0[1]) - (c1[1] - c0[1]) * (q[0] - c0[0]);
          for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
            if (sa >= 0) out.push(a);
            if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
          }
          poly = out;
        }
        let s = 0;
        for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; }
        return Math.abs(s) / 2;
      };
      const colourOf = (m) => (m && m.color ? m.color.getHex() : -1);
      const dist = (q, T) => Math.abs(T.n.dot(q) - T.d);

      const groups = new Map(); // "meshA|meshB" -> { area, gap range, where, ... }
      for (let i = 0; i < tris.length; i++) {
        const A = tris[i];
        for (let j = i + 1; j < tris.length; j++) {
          const B = tris[j];
          if (B.lo.x > A.hi.x + GAP) break;
          if (B.lo.y > A.hi.y + GAP || B.hi.y < A.lo.y - GAP || B.lo.z > A.hi.z + GAP || B.hi.z < A.lo.z - GAP || B.hi.x < A.lo.x - GAP) continue;
          const dot = A.n.dot(B.n);
          if (Math.abs(dot) < 0.98) continue;                                            // (not parallel enough to lie together)
          if (A.node === B.node && A.p.some(q => B.p.some(r => q.distanceToSquared(r) < 1e-10))) continue; // (neighbours in one surface)
          const gap = Math.max(...B.p.map(q => dist(q, A)), ...A.p.map(q => dist(q, B)));
          if (gap > GAP) continue;
          const sameFacing = dot > 0;
          const area = overlapArea(A, B);
          if (area < 1e-6) continue;
          const key = (label.get(A.node)?.id || '?') + '|' + (label.get(B.node)?.id || '?') + '|' + (sameFacing ? 's' : 'o');
          const g = groups.get(key) || { a: A, b: B, area: 0, gapMin: Infinity, gapMax: 0, pairs: 0, at: new V(), sameFacing, normal: A.n.clone(), setA: new Set(), setB: new Set(), best: 0, sample: null };
          g.area += area; g.pairs++; g.gapMin = Math.min(g.gapMin, gap); g.gapMax = Math.max(g.gapMax, gap);
          g.setA.add(i); g.setB.add(j);
          g.at.add(new V().addVectors(A.p[0], A.p[1]).add(A.p[2]).multiplyScalar(area / 3));
          if (area > g.best) { g.best = area; g.sample = { A, B }; }
          groups.set(key, g);
        }
      }

      // is it SEEN? From a point over the overlap, along the face's normal, either way (never from underneath the car), the
      // surfaces the viewer's ray meets at about the plane's depth: two or more, with nothing nearer in front, is a fight.
      // (The ray honours each material's sides, so a face turned away or a surface buried inside the body does not count.)
      const rc = new THREE.Raycaster();
      const seen = (g) => {
        const { A, B } = g.sample, c = new V().addVectors(A.p[0], A.p[1]).add(A.p[2]).add(B.p[0]).add(B.p[1]).add(B.p[2]).multiplyScalar(1 / 6);
        for (const sign of [1, -1]) {
          const view = A.n.clone().multiplyScalar(sign);
          if (view.y < -0.35) continue;                                  // (seen from underneath: the camera is never there)
          rc.set(c.clone().addScaledVector(view, 0.5), view.clone().negate()); rc.near = 0; rc.far = 1;
          const hits = rc.intersectObject(model, true).filter(h => h.object.visible);
          if (!hits.length || hits[0].distance < 0.5 - GAP - 0.002) continue; // (something else is in front)
          const here = hits.filter(h => Math.abs(h.distance - 0.5) <= GAP + 0.002);
          if (new Set(here.map(h => h.object.id + ':' + h.faceIndex)).size >= 2) { g.view = sign; return true; }
        }
        return false;
      };
      for (const g of groups.values()) {
        const sum = (set) => { let t = 0; for (const k of set) t += tris[k].area; return t; };
        g.area = Math.min(g.area, sum(g.setA), sum(g.setB)); // (the area itself, not once per triangle pair that covers it)
      }
      const found = [...groups.values()].filter(g => g.area >= MIN_AREA && seen(g)).sort((x, y) => (x.gapMin < CERTAIN ? 0 : 1) - (y.gapMin < CERTAIN ? 0 : 1) || y.area - x.area);
      if (!found.length) continue;
      total += found.length;
      summary.push(car.id + (evil ? ' (Evil)' : '') + ': ' + found.length + ' (' + found.filter(g => g.gapMin < CERTAIN).length + ' certain)');
      certain += found.filter(g => g.gapMin < CERTAIN).length;
      const where = (g) => { const c = g.at.clone().divideScalar(g.area); const n = g.normal; const ax = Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? (n.x > 0 ? 'left' : 'right') + ' side' : Math.abs(n.y) > Math.abs(n.z) ? (n.y > 0 ? 'top' : 'underside') : (n.z > 0 ? 'front' : 'rear'); return ax + ', ' + (c.z >= 0 ? 'front ' : 'rear ') + 'z ' + c.z.toFixed(2) + ', y ' + c.y.toFixed(2) + (Math.abs(c.x) > 0.05 ? ', x ' + c.x.toFixed(2) : ''); };
      const hex = (m) => (m && m.color ? '#' + m.color.getHexString() : '(map)') + (m?.transparent ? ' t' + (m.opacity ?? 1).toFixed(2) : '') + (m?.side === THREE.DoubleSide ? ' 2-sided' : '');
      const name = (n) => { const l = label.get(n) || {}; return (l.name || l.role || 'part') + ' [' + (l.id || '?') + ']'; };
      const meshArea = new Map(); for (const t of tris) meshArea.set(t.node, (meshArea.get(t.node) || 0) + t.area);
      lines.push('', '## ' + car.name + ' (`' + car.id + '`) ' + (evil ? 'Evil' : 'Good') + ' - ' + found.length + ' surface pair' + (found.length > 1 ? 's' : ''));
      lines.push('', '| # | surface A | surface B | where | overlap | gap | faces | will it fight | suggestion |', '|--|--|--|--|--|--|--|--|--|');
      found.forEach((g, k) => {
        const small = (meshArea.get(g.a.node) || 0) <= (meshArea.get(g.b.node) || 0) ? [g.a, g.b] : [g.b, g.a]; // (the smaller surface is usually the decal)
        lines.push('| ' + (k + 1) + ' | ' + name(g.a.node) + ' ' + hex(g.a.m) + ' | ' + name(g.b.node) + ' ' + hex(g.b.m) + ' | ' + where(g) + ' | ' + (g.area * 10000).toFixed(1) + ' cm2 | ' + (g.gapMin * 1000).toFixed(1) + '-' + (g.gapMax * 1000).toFixed(1) + ' mm | '
          + (g.sameFacing ? 'same way' : 'opposite') + ' | ' + (g.gapMin < CERTAIN ? '**YES**' : 'maybe (weak GPU / far)') + ' | ' + name(small[0].node) + ' should win (out ~3 mm)' + ' |');
      });
    }
  }
  console.log(total + ' z-fighting surface pair' + (total === 1 ? '' : 's') + ' in ' + summary.length + ' car view' + (summary.length === 1 ? '' : 's') + ' (gap <= ' + GAP * 1000 + ' mm, overlap >= ' + MIN_AREA * 10000 + ' cm2):');
  console.log(summary.join('\n'));
  console.log(certain + ' of them certain (under ' + CERTAIN * 1000 + ' mm apart)');
  if (report) writeFileSync(report, '# Z-fighting report\n\nPlanes within ' + GAP * 1000 + ' mm, overlap at least ' + MIN_AREA * 10000 + ' cm2, ' + cars.length + ' cars. Surfaces are named by the model editor\'s part name/role and id.\n' + lines.join('\n') + '\n');
  process.exitCode = total ? 1 : 0;
} finally { await close(); }
