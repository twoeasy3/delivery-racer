// A check of the WINDSCREEN AUDIT and the CRACKED GLASS prototype (the owner, 16-Oct: "Are all front screens tagged properly on all cars?";
// "Lets explore adding a cracked glass texture to the front and back windows on damage model"; src/delivery/WINDSCREEN-AUDIT.md,
// src/delivery/CRACKED-GLASS-NOTES.md), headless:
//  - THE AUDIT (scripts/windscreen-audit.mjs auditModel) runs on every vehicle the game builds, and no vehicle's windscreen or rear window is
//    judged worse than in the baseline (scripts/.windscreen-audit-baseline.json: found > none > ambiguous / missing > wrong); the totals are printed;
//  - THE CRACKS (render/cracks.js crackOverlay) on every vehicle: the overlay is ONE mesh, a child of a window's glass, never in the model
//    editor's part list (the part ids and the model's signature are the same with it), never dented (render/dents.js), on front- and
//    rear-facing glass only (no triangle faces sideways), within a triangle budget; the count of vehicles it covers (both windows, one, none);
//  - THE RULES: render/cracks.js and render/screens.js are not in the replay fingerprint (vite.config.js logicFiles).
//   node scripts/.windscreen-audit-check.mjs [--write]      (--write: record the baseline from this run)
import * as THREE from 'three';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { startModels } from './modelpatch-load.mjs';
import { buildAll } from './audit-windows.mjs';
import { auditModel } from './windscreen-audit.mjs';
import { logicFiles } from '../vite.config.js';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const t0 = Date.now();
const { load, close, ROOT } = await startModels();
const BASE = join(ROOT, 'scripts/.windscreen-audit-baseline.json');
const RANK = { found: 3, none: 2, ambiguous: 1, missing: 1, wrong: 0 };
try {
  const MP = await load('render/modelpatch.js'), S = await load('render/screens.js'), G = await load('render/glassnames.js');
  const K = await load('render/cracks.js');
  const apply = await load('render/modelpatchapply.js');
  await apply.patchesReady;
  const { entries } = await buildAll(load);
  const now = {}, tally = { ws: {}, rw: {} }, cover = { both: 0, one: 0, none: 0 }, worse = [], bad = [];
  let tris = 0, maxTris = 0, ms = 0, built = 0;
  for (const e of entries) {
    let model; try { model = e.build(); } catch { continue; }
    if (!model) continue;
    model.parent?.remove(model);
    const a = auditModel(model, MP, S, G);
    now[e.key] = { ws: a.ws.status, rw: a.rw.status };
    tally.ws[a.ws.status] = (tally.ws[a.ws.status] || 0) + 1; tally.rw[a.rw.status] = (tally.rw[a.rw.status] || 0) + 1;
    // the cracks, on a fresh build of the same vehicle
    const m = e.build(); m.parent?.remove(m);
    const before = MP.extractParts(m);
    const t1 = Date.now(), mesh = K.crackOverlay(m, e.id); ms += Date.now() - t1; built++;
    const sc = K.crackInfo(m).screens, n = (sc.windscreen.length ? 1 : 0) + (sc.rear.length ? 1 : 0);
    cover[n === 2 ? 'both' : n === 1 ? 'one' : 'none']++;
    if (!mesh) { if (n) bad.push(e.key + ': windows found, no overlay'); continue; }
    const count = mesh.geometry.attributes.position.count / 3;
    tris += count; maxTris = Math.max(maxTris, count);
    K.crackModel(m, 0.85, e.id);
    const after = MP.extractParts(m);
    let overlays = 0; m.traverse(o => { if (o.userData.crackOverlay) overlays++; });
    // facing: every overlay triangle faces front or rear (in the model's frame)
    m.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(m.matrixWorld).invert().multiply(mesh.matrixWorld), p = mesh.geometry.attributes.position;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
    let side = 0;
    for (let i = 0; i < p.count; i += 3) { A.fromBufferAttribute(p, i).applyMatrix4(inv); B.fromBufferAttribute(p, i + 1).applyMatrix4(inv); C.fromBufferAttribute(p, i + 2).applyMatrix4(inv); N.subVectors(B, A).cross(C.sub(A)).normalize(); if (Math.abs(N.x) >= 0.6) side++; }
    const problems = [];
    if (overlays !== 1) problems.push(overlays + ' overlays');
    if (!mesh.parent?.isMesh || !MP.isWindowPart(before.parts.find(r => before.nodes.get(r.id) === mesh.parent))) problems.push('not a child of a window part');
    if (after.parts.length !== before.parts.length || after.base !== before.base) problems.push('the part list changed (' + before.parts.length + ' -> ' + after.parts.length + ')');
    if (side) problems.push(side + ' triangles face sideways');
    if (count > 600) problems.push(count + ' triangles');
    if (!mesh.visible || mesh.material !== K.crackMaterial(3)) problems.push('not shown at stage 3 for 85 %');
    // dents: the overlay rides its glass, never crumpled (its geometry the same after a dent)
    const g0 = mesh.geometry;
    const { dentModel } = await load('render/dents.js');
    if (m.userData.body) { dentModel(m, m.userData.body, 0.9); if (mesh.geometry !== g0) problems.push('dented'); }
    K.crackModel(m, 0, e.id);
    if (mesh.visible) problems.push('still shown when clean');
    if (problems.length) bad.push(e.key + ': ' + problems.join(', '));
  }
  // ---- the audit against the baseline
  if (args().write) { writeFileSync(BASE, '{\n' + Object.entries(now).map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n}\n'); console.log('  wrote ' + BASE); }
  const base = existsSync(BASE) ? JSON.parse(readFileSync(BASE, 'utf8')) : {};
  for (const [k, v] of Object.entries(now)) { const b = base[k]; if (!b) continue; for (const w of ['ws', 'rw']) if (RANK[v[w]] < RANK[b[w]]) worse.push(k + ' ' + w + ' ' + b[w] + ' -> ' + v[w]); }
  const f = (t) => ['found', 'wrong', 'ambiguous', 'missing', 'none'].map(s => s + ' ' + (t[s] || 0)).join(', ');
  check(Object.keys(now).length >= 250, Object.keys(now).length + ' vehicles audited: WINDSCREEN ' + f(tally.ws) + '; REAR WINDOW ' + f(tally.rw));
  check(Object.keys(base).length > 0 && !worse.length, 'no vehicle judged worse than the baseline (' + Object.keys(base).length + ' in it)' + (worse.length ? ': ' + worse.slice(0, 12).join('; ') : ''));
  check(!(tally.ws.wrong || 0) && !(tally.rw.wrong || 0), 'no windscreen or rear window wrongly named (the pane facing that way is named for it)');
  // ---- the cracks
  check(!bad.length, 'the crack overlay on ' + built + ' vehicles: one mesh, a child of the glass, not in the part list (ids and signature unchanged), front / rear glass only, never dented, shown at stage 3 for 85 % and hidden clean' + (bad.length ? '\n          ' + bad.slice(0, 12).join('\n          ') : ''));
  console.log('  ..    cracks on BOTH windows: ' + cover.both + ', ONE: ' + cover.one + ', NONE: ' + cover.none + ' of ' + built + '; overlay triangles ' + tris + ' in all, ' + (tris / Math.max(1, cover.both + cover.one)).toFixed(0) + ' a car, at most ' + maxTris + '; built in ' + (ms / Math.max(1, built)).toFixed(1) + ' ms a car (headless, with the pane search and the hidden-glass rays)');
  // ---- render only
  const logic = logicFiles();
  check(!logic.some(x => /cracks|screens|modelpatch|dents|items|inspectmodel/.test(x)), 'render/cracks.js, render/screens.js and the files they hook into are not in the replay fingerprint (vite.config.js logicFiles: ' + logic.length + ' files)');
} finally { await close(); }
function args() { return { write: process.argv.includes('--write') }; }
console.log((failures ? failures + ' FAILED' : 'all ok') + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exitCode = failures ? 1 : 0;
