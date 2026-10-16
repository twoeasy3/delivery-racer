// THE WINDSCREEN AUDIT (the owner, 16-Oct: "Are all front screens tagged properly on all cars? Agent audit."): every vehicle the game
// builds (the roster, supers, fillers, bespoke / event / earned / Legendary / secret / level cars, the car ideas and the traffic kinds:
// scripts/audit-windows.mjs buildAll, through render/showcar.js makeShowCar as the game builds them), headless. For each, its WINDSCREEN and
// its REAR WINDOW are looked for the way the model editor and the tools find them (render/modelpatch.js extractParts: cabinGlass's named
// panes, else a hand-built window's panels named by windowPanes; render/glassnames.js for the words) and MEASURED against the glass itself
// (render/screens.js paneFacing: which way each pane faces, out of the cabin). Read-only: nothing is changed, nothing drawn.
//   node scripts/windscreen-audit.mjs                       one line per vehicle and the totals
//   node scripts/windscreen-audit.mjs <id> ...              those vehicles, every pane listed
//   node scripts/windscreen-audit.mjs --csv=<file>          the per-vehicle table as CSV
//   node scripts/windscreen-audit.mjs --json=<file>         the per-vehicle verdicts as JSON (scripts/.windscreen-audit-check.mjs reads it)
//   node scripts/windscreen-audit.mjs --md                  the per-vehicle markdown table (src/delivery/WINDSCREEN-AUDIT.md embeds it)
// THE VERDICT, for the windscreen and the rear window alike (the truth is the glass's facing; the name is what the tools read):
//   found      one pane faces that way (at least 70 % of its area: FACE_PURE) and is named so: 'windscreen' (or 'windscreen 2'..., a split
//              or a second deck) / 'rear window'; a tagged mesh (userData.window) counts as named
//   wrong      the glass facing that way is a pane of its own but named otherwise ('roof window', 'window 1 L', 'rear window' for the
//              windscreen...), or a pane so named faces another way
//   ambiguous  the glass facing that way is only part of a pane that also faces other ways (a band of side windows with the screen in
//              it, one mesh wrapped round the cabin): no pane of its own to address
//   missing    glass faces that way but is no window part at all (a glass-coloured part the window rule does not take)
//   none       no glass faces that way (open cockpit, canopy, bike, boat...: the reason column says what the model has)
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';
import { buildAll, glassClass } from './audit-windows.mjs';

const args = process.argv.slice(2), opt = (k) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const only = args.filter(a => !a.startsWith('--')), flag = (k) => args.includes('--' + k);
const MIN_AREA = 0.03; // m2: a pane facing that way smaller than this is a detail (a lamp's lens in a glass colour, a gauge), not a window

export const auditModel = (model, MP, S, G) => {
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const { parts, nodes, panes } = MP.extractParts(model);
  const carBox = new THREE.Box3();
  model.traverseVisible((n) => { if (n.isMesh && n.geometry?.attributes.position && !n.isInstancedMesh) { if (!n.geometry.boundingBox) n.geometry.computeBoundingBox(); carBox.union(n.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld))); } });
  const size = carBox.getSize(new THREE.Vector3());
  const win = [], other = [];
  for (const row of parts) {
    const node = nodes.get(row.id);
    if (!node?.isMesh || !node.geometry?.attributes.position || node.isInstancedMesh || !node.visible) continue;
    const toModel = new THREE.Matrix4().multiplyMatrices(inv, node.matrixWorld);
    if (row.window) for (const pane of panes.get(row.id) || []) win.push({ row, node, toModel, pane, kind: pane.kind === 'hand' ? 'hand' : 'cabin', tag: pane.window || node.userData.window || null });
    // (a cabinGlass mesh's vertices that no pane covers: glass merged in beside cabinGlass's own, as the Glass-Hatch Brake's hatch; the tools see none of it)
    const ps = panes.get(row.id) || [];
    if (row.window && ps.length && ps.every(q => q.kind !== 'hand')) {
      const cover = new Uint8Array(node.geometry.attributes.position.count);
      for (const q of ps) cover.fill(1, q.start, q.start + q.count);
      for (let i = 0; i < cover.length;) { if (cover[i]) { i++; continue; } let j = i; while (j < cover.length && !cover[j]) j++; other.push({ row, node, toModel, pane: { start: i, count: j - i, name: 'glass outside the panes' }, kind: 'unpaned', tag: null }); i = j; }
    }
    else {
      const mat = [].concat(node.material)[0];
      if (glassClass(mat) && mat !== model.userData.body?.material && !(mat.emissive && mat.emissive.getHex() > 0)) other.push({ row, node, toModel, pane: null, kind: 'unmarked', tag: null });
    }
  }
  const zRef = S.cabinMiddle(win, carBox);
  const glassNodes = new Set(win.map(q => q.node)), skip = (o) => glassNodes.has(o);
  const zOf = new Map(), zFor = (node) => { if (!zOf.has(node)) zOf.set(node, S.zRefOf(win, node, zRef)); return zOf.get(node); };
  const measure = (q) => { q.zRef = q.kind === 'unmarked' ? zRef : zFor(q.node); const f = S.paneFacing(q.node, q.toModel, q.pane, q.zRef); Object.assign(q, f); q.name = q.pane ? q.pane.name : q.row.name || q.row.role; return q; };
  win.forEach(measure); other.forEach(measure);
  for (const q of win) { const sh = S.screenShares(q, q.zRef); if (sh.reverse) { q.share = sh; q.face = 'rear'; q.reverse = true; } }
  const isName = (want, q) => (q.tag ? (q.tag === want || (want === 'rear' && q.tag === 'rear window')) : want === 'windscreen' ? /^windscreen( \d+)?( [LR])?$/.test(G.windowKey(q.name)) : /^rear window( \d+)?( [LR])?$/.test(G.windowKey(q.name)));
  const verdict = (want) => {
    const dir = want === 'windscreen' ? 'front' : 'rear';
    const facing = (q) => q.share[dir] * q.area;
    const all = win.filter(q => facing(q) >= MIN_AREA && (q.face === dir || (q.face === 'mixed' && q.share[dir] >= 0.12)));
    for (const q of all) if (q.hidden === undefined) q.hidden = S.paneHidden(model, q, skip);
    const cand = all.filter(q => !q.hidden).sort((a, b) => facing(b) - facing(a)), hiddenOnes = all.filter(q => q.hidden);
    const named = win.filter(q => isName(want, q));
    const out = { status: 'none', reason: '', name: '', count: cand.length, split: false, decks: 1, share: 0, tiltDeg: null, area: 0, zRel: null, yRel: null, sym: null, addr: '', merged: '', namedCount: named.length, kind: '' };
    const p = cand[0];
    const badNamed = named.filter(q => q.area >= MIN_AREA && q.face !== dir && q.face !== 'mixed');
    out.hidden = hiddenOnes.map(q => q.name).join(' + ');
    if (!p) {
      if (hiddenOnes.length) { Object.assign(out, { status: 'none', reason: 'only hidden glass faces ' + dir + ' ("' + out.hidden + '", behind the body)' }); return out; }
      const u = other.filter(q => (q.face === dir || (q.kind === 'unpaned' && q.share[dir] >= 0.3)) && facing(q) >= MIN_AREA * 2).sort((a, b) => facing(b) - facing(a))[0];
      if (u) { Object.assign(out, { status: 'missing', reason: u.kind === 'unpaned' ? 'glass in the cabinGlass mesh ' + u.row.id + ' outside every pane (' + Math.round(u.area * 100) / 100 + ' m2) faces ' + dir + ': no pane names it' : 'glass-coloured part ' + u.row.id + ' (' + (u.row.role || u.name) + ') faces ' + dir + ' but is not a window part', area: +facing(u).toFixed(3) }); return out; }
      if (badNamed.length) { Object.assign(out, { status: 'wrong', reason: '"' + badNamed[0].name + '" faces ' + badNamed[0].face + ', and no glass faces ' + dir }); return out; }
      out.reason = !win.length ? 'no glass at all' : 'no glass faces ' + dir + ' (' + [...new Set(win.map(q => q.face))].join(', ') + ' only)';
      return out;
    }
    const tilt = Math.atan2(p.normal.y, Math.abs(p.normal.z)) * 180 / Math.PI;
    Object.assign(out, {
      name: p.name, kind: p.kind, share: +p.share[dir].toFixed(2), tiltDeg: Math.round(tilt), area: +p.area.toFixed(3),
      zRel: +((p.centre.z - carBox.min.z) / Math.max(1e-6, size.z)).toFixed(2), yRel: +((p.centre.y - carBox.min.y) / Math.max(1e-6, size.y)).toFixed(2),
      sym: Math.abs(p.centre.x) < 0.03 && Math.abs(p.box.min.x + p.box.max.x) < 0.06 ? 'centred' : p.box.min.x > -0.01 || p.box.max.x < 0.01 ? 'one side' : 'off-centre',
      addr: p.kind === 'cabin' ? 'pane (vertex range of the cabin glass)' : p.pane && p.pane.count < (p.node.geometry.attributes.position.count) ? 'pane (vertex range)' : 'own mesh',
    });
    const halves = cand.filter(q => q !== p && Math.abs(q.centre.y - p.centre.y) < 0.15 && Math.abs(q.centre.z - p.centre.z) < 0.3 && facing(q) > 0.4 * facing(p));
    out.split = halves.some(q => Math.abs(q.centre.x) > 0.1 && Math.abs(p.centre.x) > 0.1 && q.centre.x * p.centre.x < 0);
    out.decks = 1 + cand.filter(q => q !== p && Math.abs(q.centre.y - p.centre.y) >= 0.35 && facing(q) > 0.3 * facing(p)).length;
    if (p.face === 'mixed') {
      out.merged = Object.entries(p.share).filter(([, s]) => s >= 0.12).map(([k, s]) => k + ' ' + Math.round(s * 100) + '%').join(', ');
      out.status = 'ambiguous';
      out.reason = 'the ' + dir + '-facing glass is part of "' + p.name + '" (' + out.merged + '): no pane of its own';
      return out;
    }
    if (!isName(want, p)) { out.status = 'wrong'; out.reason = 'the ' + dir + '-facing pane is named "' + p.name + '"'; return out; }
    if (badNamed.length) { out.status = 'wrong'; out.reason = '"' + badNamed[0].name + '" faces ' + badNamed[0].face + ' (and "' + p.name + '" faces ' + dir + ')'; return out; }
    if (want === 'windscreen' && p.normal.y < -0.05) out.reason = 'leans forward at the top (' + out.tiltDeg + ' deg)';
    if (p.reverse) out.reason = 'reverse-rake rear window (faces up and forward, behind the cabin)';
    out.status = 'found';
    return out;
  };
  // the model facing -z? its red lamps ahead of its white ones
  const lamps = { red: [], white: [] };
  model.traverseVisible((n) => {
    if (!n.isMesh || !n.geometry?.attributes.position) return;
    const m = [].concat(n.material)[0];
    if (!m?.color) return;
    const glow = m.type === 'MeshBasicMaterial' || (m.emissive && m.emissive.getHex() > 0);
    if (!glow) return;
    const col = m.emissive && m.emissive.getHex() > 0 && m.type !== 'MeshBasicMaterial' ? m.emissive : m.color;
    const r = col.r * 255, g = col.g * 255, b = col.b * 255;
    if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
    const z = n.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld)).z;
    if (r > 120 && r > 1.8 * g && r > 1.8 * b) lamps.red.push(z); else if (r > 170 && g > 150) lamps.white.push(z);
  });
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const backwards = lamps.red.length && lamps.white.length && avg(lamps.red) > avg(lamps.white) + 0.4 * size.z;
  return { ws: verdict('windscreen'), rw: verdict('rear'), panes: win, unmarked: other, zRef, size, backwards: !!backwards, windowParts: new Set(win.map(q => q.row.id)).size };
};

// why a vehicle has no windscreen (by the model: what glass it has and what it is)
const NONE_WHY = (e, a) => {
  const t = (e.id + ' ' + e.name + ' ' + e.model).toLowerCase();
  const kinds = [[/boat|jetski|duck|hover|swan|paddle|amphib/, 'a boat / hovercraft'], [/bike|sidecar|scooter|monowheel|gyro|cycle|trike/, 'a bike / rider vehicle'], [/tank|halftrack|half-track/, 'a tank'], [/f1|formula|kart|soapbox|sofa|bathtub|racer|roadster|buggy|dragster|speedster|hotrod|chariot|go-?kart|lawn|mower|tractor|forklift|quad|atv/, 'an open car / cockpit'], [/ufo|saucer|flying|heli|plane|jet/, 'a flying object'], [/bus|coach|lorry|truck|van|cab/, 'a closed vehicle: LOOK']];
  const k = kinds.find(([re]) => re.test(t));
  return (k ? k[1] : 'unclassified: LOOK') + '; ' + a.ws.reason;
};

if (import.meta.url === 'file://' + process.argv[1]) {
  const t0 = Date.now();
  const { load, close } = await startModels();
  try {
    const MP = await load('render/modelpatch.js'), S = await load('render/screens.js'), G = await load('render/glassnames.js');
    const apply = await load('render/modelpatchapply.js');
    await apply.patchesReady;
    const { entries } = await buildAll(load);
    const rows = [];
    for (const e of entries) {
      if (only.length && !only.includes(e.id) && !only.includes(e.model)) continue;
      let model = null, err = null;
      try { model = e.build(); } catch (x) { err = x.message; }
      if (!model) { rows.push({ e, err: err || 'no model' }); continue; }
      model.parent?.remove(model);
      const t1 = Date.now();
      const a = auditModel(model, MP, S, G);
      rows.push({ e, a, ms: Date.now() - t1 });
      if (only.length) {
        console.log('\n' + e.key + '  (cabin middle z ' + a.zRef.toFixed(2) + ', size ' + a.size.toArray().map(x => x.toFixed(2)).join(' x ') + (a.backwards ? ', FACES -z?' : '') + ')');
        for (const q of [...a.panes, ...a.unmarked]) console.log('   ' + q.kind.padEnd(9) + String(q.row.id).padEnd(7) + String(q.name).padEnd(22) + q.face.padEnd(7) + 'area ' + q.area.toFixed(3) + '  F ' + q.share.front.toFixed(2) + ' R ' + q.share.rear.toFixed(2) + ' S ' + q.share.side.toFixed(2) + ' T ' + q.share.roof.toFixed(2) + '  n ' + q.normal.toArray().map(x => x.toFixed(2)).join(',') + '  c ' + q.centre.toArray().map(x => x.toFixed(2)).join(','));
        for (const [k, v] of [['windscreen', a.ws], ['rear window', a.rw]]) console.log('   ' + k.padEnd(12) + v.status.padEnd(10) + JSON.stringify(v));
      }
    }
    const ok = rows.filter(r => r.a);
    const tally = (k) => { const t = { found: 0, wrong: 0, ambiguous: 0, missing: 0, none: 0 }; for (const r of ok) t[r.a[k].status]++; return t; };
    const csvCell = (x) => (x == null ? '' : /[",\n]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : String(x));
    const cols = ['key', 'group', 'id', 'name', 'model', 'windowParts', 'panes', 'backwards',
      ...['ws', 'rw'].flatMap(k => ['status', 'reason', 'name', 'kind', 'count', 'split', 'decks', 'share', 'tiltDeg', 'area', 'zRel', 'yRel', 'sym', 'addr', 'merged', 'namedCount', 'hidden'].map(f => k + '_' + f))];
    const line = (r) => [r.e.key, r.e.group, r.e.id, r.e.name, r.e.model, r.a.windowParts, r.a.panes.length, r.a.backwards, ...['ws', 'rw'].flatMap(k => ['status', 'reason', 'name', 'kind', 'count', 'split', 'decks', 'share', 'tiltDeg', 'area', 'zRel', 'yRel', 'sym', 'addr', 'merged', 'namedCount', 'hidden'].map(f => r.a[k][f]))];
    if (opt('csv')) writeFileSync(opt('csv'), cols.join(',') + '\n' + ok.map(r => line(r).map(csvCell).join(',')).join('\n') + '\n');
    if (opt('json')) writeFileSync(opt('json'), JSON.stringify(Object.fromEntries(ok.map(r => [r.e.key, { ws: r.a.ws.status, rw: r.a.rw.status, wsName: r.a.ws.name, rwName: r.a.rw.name }])), null, 0).replace(/},"/g, '},\n"') + '\n');
    if (flag('md')) {
      console.log('| vehicle | group | windscreen | its pane | tilt | rear window | its pane | note |\n|---|---|---|---|---|---|---|---|');
      for (const r of ok) {
        const w = r.a.ws, b = r.a.rw;
        const note = [w.status !== 'found' && w.status !== 'none' ? 'front: ' + w.reason : '', b.status !== 'found' && b.status !== 'none' ? 'rear: ' + b.reason : '', w.status === 'none' ? NONE_WHY(r.e, r.a) : '', w.split ? 'split screen' : '', w.decks > 1 ? w.decks + ' decks' : '', r.a.backwards ? 'red lamps at the front: faces -z?' : ''].filter(Boolean).join('; ');
        console.log('| ' + [r.e.id + (r.e.name && r.e.name !== r.e.id ? ' (' + r.e.name + ')' : ''), r.e.group, w.status, w.name ? w.name + ' [' + w.kind + ']' : '-', w.tiltDeg ?? '-', b.status, b.name ? b.name + ' [' + b.kind + ']' : '-', note.replace(/\|/g, '/')].join(' | ') + ' |');
      }
    } else if (!only.length) for (const r of rows) {
      if (!r.a) { console.log(r.e.key.padEnd(34) + 'not built: ' + r.err); continue; }
      const w = r.a.ws, b = r.a.rw;
      console.log(r.e.key.padEnd(34) + 'WS ' + w.status.padEnd(10) + String(w.name || '-').padEnd(18) + ' RW ' + b.status.padEnd(10) + String(b.name || '-').padEnd(18) + ' ' + [w.status !== 'found' ? w.reason : '', b.status !== 'found' ? b.reason : ''].filter(Boolean).join(' / ') + (r.a.backwards ? '  FACES -z?' : ''));
    }
    const tw = tally('ws'), tr = tally('rw');
    const fmt = (t) => Object.entries(t).map(([k, n]) => k + ' ' + n).join(', ');
    const models = new Set(ok.map(r => r.e.model)).size;
    console.log('\n' + ok.length + ' vehicles (' + models + ' models) audited' + (rows.length > ok.length ? ', ' + (rows.length - ok.length) + ' not built' : '') + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s (audit ' + (ok.reduce((s, r) => s + r.ms, 0) / Math.max(1, ok.length)).toFixed(0) + ' ms a vehicle)'
      + '\nWINDSCREEN   ' + fmt(tw) + '\nREAR WINDOW  ' + fmt(tr)
      + '\nboth found: ' + ok.filter(r => r.a.ws.status === 'found' && r.a.rw.status === 'found').length + '; a windscreen addressable as a pane of its own (found): ' + tw.found + ' (cabinGlass ' + ok.filter(r => r.a.ws.status === 'found' && r.a.ws.kind === 'cabin').length + ', hand-built ' + ok.filter(r => r.a.ws.status === 'found' && r.a.ws.kind === 'hand').length + ')'
      + '\nsplit windscreens ' + ok.filter(r => r.a.ws.split).length + ', two-deck ' + ok.filter(r => r.a.ws.decks > 1).length + ', red lamps ahead of white (faces -z?) ' + ok.filter(r => r.a.backwards).length + ' ' + ok.filter(r => r.a.backwards).map(r => r.e.id).join(' '));
  } finally { await close(); }
}
