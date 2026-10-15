// THE GLASS / WINDOW SURVEY (the owner, 15-Oct: "'glass' and 'window' are used interchangeably in the models. Make the editor treat both
// equally."): every car the model editor lists (the roster and the car ideas) and every prop, built headless, and each SEE-THROUGH part
// listed with how it is marked: its pane names (cabinGlass, render/ideaModelsDkit.js), its role in the editor's part list (render/modelpatch.js
// extractParts), its mesh / hook / material name, and the colour and opacity tests the game's other tools use (render/dents.js glassy, a
// transparent material). A part counts as see-through when ANY of these says so; the table says which say it, and by which word.
// It also counts the two words in the SOURCE (the model files, the editor, the tools), so the spelling split can be read in one place.
//   node scripts/glass-window-survey.mjs            the tables
//   node scripts/glass-window-survey.mjs --cars     a line per see-through part too
//   node scripts/glass-window-survey.mjs <car id>   that car's see-through parts, one per line
// The shared rule (render/glassnames.js) is measured against it: a see-through part the rule does not call a window is listed as MISSED.
import * as THREE from 'three';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2), perPart = args.includes('--cars'), only = args.find(a => !a.startsWith('--'));
const { load, close, fixStack, ROOT } = await startModels();
const t0 = Date.now();
// the word a name is spelt with (none: no glass word at all)
const wordOf = (s) => { s = String(s || '').toLowerCase(); return /windscreen|windshield/.test(s) ? 'windscreen' : /window/.test(s) ? 'window' : /glass|glazing/.test(s) ? 'glass' : /screen/.test(s) ? 'screen' : null; };
// where a mesh was added to the model (the model file), from the stack of its add()
const born = new WeakMap(), add0 = THREE.Object3D.prototype.add;
THREE.Object3D.prototype.add = function (...kids) { for (const k of kids) if (k?.isMesh && !born.has(k)) born.set(k, new Error('at').stack); return add0.apply(this, kids); };
const fileOf = (mesh) => {
  const st = born.get(mesh);
  if (!st) return '?';
  const lines = fixStack(st).split('\n').map(s => s.match(/\/src\/delivery\/(render\/[^:?)]+)/)).filter(Boolean).map(m => m[1].replace('render/', ''));
  return lines.find(f => !/^(ideaModelsDkit|showcar|inspectmodel|shapeedits|modelpatch|propdress|carExtras)\.js$/.test(f)) || lines[0] || '?';
};
try {
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const cars = await load('cars.js'), { IDEA_CARS } = await load('ideas.js');
  const MP = await load('render/modelpatch.js');
  const { glassy } = await load('render/dents.js');
  const G = await load('render/glassnames.js');
  const props = await load('render/propmodels.js');
  const apply = await load('render/modelpatchapply.js');
  await apply.patchesReady;
  apply.setModelPatching(false);
  const roster = [...new Map([...cars.CARS, ...(cars.FILLER_CARS || []), ...cars.EVENT_CARS, ...cars.BESPOKE_CARS, ...cars.EARNED_CARS, ...Object.values(cars.SECRET_CARS), ...Object.values(cars.LEVEL_CARS || {})].filter(Boolean).map(c => [c.id, c])).values()];
  const all = [...roster, ...IDEA_CARS.filter(c => !roster.some(r => r.id === c.id))].filter(c => !only || c.id === only);
  const rows = [], missed = [], failed = [];
  const survey = (model, owner, isProp) => {
    model.updateMatrixWorld(true);
    const { parts, nodes } = MP.extractParts(model);
    const body = model.userData.body, bodyMat = body?.material;
    for (const p of parts) {
      const node = nodes.get(p.id);
      if (!node?.isMesh) continue;
      const mat = [].concat(node.material || [])[0];
      const panes = node.geometry?.userData?.panes || null;
      const marks = {
        pane: !!panes,
        role: G.isWindowRole(p.role),
        name: !!(wordOf(node.name) || wordOf(p.hook) || wordOf(mat?.name)),
        clear: !!(mat?.transparent && mat.opacity < 0.95),
        glassy: !!(mat && node !== body && mat !== bodyMat && !node.userData.wheelHub && glassy(mat)),
      };
      if (!Object.values(marks).some(Boolean)) continue;
      const rule = MP.isWindowPart(p); // (the shared rule: render/modelpatch.js isWindowPart, render/glassnames.js)
      const glow = !!mat && (mat.type === 'MeshBasicMaterial' || (mat.emissive && mat.emissive.getHex() > 0 && (mat.emissiveIntensity ?? 1) > 0));
      const row = { owner, id: p.id, isProp, glow, handPanes: p.panes && !panes ? p.panes : null, file: fileOf(node), marks, role: p.role, hook: p.hook, name: node.name, matName: mat?.name || '', panes: panes ? panes.map(q => q.name) : null, opacity: mat?.opacity, colour: mat?.color ? '#' + mat.color.getHexString() : '', rule };
      rows.push(row);
      // MISSED: a part the models mark as glass (panes, a name in either spelling) or that is see-through and does not glow (a lamp's lens,
      // a smoke puff, an exhaust flame glow), yet the rule does not call a window
      if (!rule && (marks.pane || marks.name || (marks.clear && !glow))) missed.push(row);
    }
  };
  for (const car of all) {
    let model;
    try { model = buildInspectModel(car, false); } catch (e) { failed.push(car.id + ' (' + e.message + ')'); continue; }
    if (model.userData.block) continue;
    survey(model, car.id, false);
  }
  if (!only) for (const id of Object.values(props.PROPS).flat().map(q => q.id)) { try { const g = new THREE.Group(); g.add(props.buildProp(id)); survey(g, 'prop:' + id, true); } catch (e) { failed.push('prop ' + id + ' (' + e.message + ')'); } }

  const carsWith = new Set(rows.filter(r => !r.isProp).map(r => r.owner));
  if (only || perPart) for (const r of rows) console.log(r.owner.padEnd(20) + r.id.padEnd(8) + r.file.padEnd(26) + 'role ' + r.role.padEnd(9) + Object.entries(r.marks).filter(([, v]) => v).map(([k]) => k).join('+').padEnd(26) + r.colour + ' ' + (r.opacity ?? 1).toFixed(2) + (r.panes ? '  panes: ' + r.panes.join(', ') : r.handPanes ? '  hand panes: ' + r.handPanes.join(', ') : '') + (r.rule ? '  window' : '  not a window' + (r.glow ? ' (glows: a lamp)' : '')));

  // ---- by spelling: the names that carry a glass word, wherever they are
  const tally = new Map(), bump = (where, word, file) => { const k = where + '|' + (word || '(none)'); const t = tally.get(k) || { n: 0, files: new Set() }; t.n++; t.files.add(file); tally.set(k, t); };
  for (const r of rows) {
    if (r.panes) for (const n of r.panes) bump('pane name (cabinGlass)', wordOf(n) || n, r.file);
    bump('role (editor part list)', G.isWindowRole(r.role) ? r.role : '(' + r.role + ')', r.file);
    if (r.name) bump('mesh name', wordOf(r.name), r.file);
    if (r.hook) bump('hook (model userData)', wordOf(r.hook), r.file);
    if (r.matName) bump('material name', wordOf(r.matName), r.file);
  }
  console.log('\nSEE-THROUGH PARTS, BY SPELLING (where the word is: the word: how many: the files)');
  for (const [k, t] of [...tally].sort()) { const [where, word] = k.split('|'); console.log('  ' + where.padEnd(26) + word.padEnd(14) + String(t.n).padStart(5) + '   ' + [...t.files].sort().slice(0, 8).join(', ') + (t.files.size > 8 ? ' +' + (t.files.size - 8) : '')); }

  // ---- which test says so (the parts each test alone finds are where the tools disagree)
  const combos = new Map();
  for (const r of rows) { const k = Object.entries(r.marks).filter(([, v]) => v).map(([k2]) => k2).join('+'); combos.set(k, (combos.get(k) || 0) + 1); }
  console.log('\nWHICH TEST FINDS THEM (pane: cabinGlass panes; role: the editor role is a window word; name: a mesh / hook / material name; clear: transparent; glassy: render/dents.js colour)');
  for (const [k, n] of [...combos].sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(30) + String(n).padStart(5));
  const byFile = new Map();
  for (const r of rows) { const t = byFile.get(r.file) || { n: 0, pane: 0, glassRole: 0, other: 0, owners: new Set() }; t.n++; if (r.marks.pane) t.pane++; else if (r.marks.role) t.glassRole++; else t.other++; t.owners.add(r.owner); byFile.set(r.file, t); }
  console.log('\nBY THE MODEL FILE THE PART IS ADDED IN (n, with cabinGlass panes, role window without them, colour / opacity only, cars)');
  for (const [f, t] of [...byFile].sort((a, b) => b[1].n - a[1].n)) console.log('  ' + f.padEnd(28) + String(t.n).padStart(5) + String(t.pane).padStart(6) + String(t.glassRole).padStart(6) + String(t.other).padStart(6) + String(t.owners.size).padStart(6));

  // ---- the source: the two words, by file (not the DOM's window.)
  if (!only) {
    const dirs = ['src/delivery', 'src/delivery/render', 'scripts'];
    const src = [];
    for (const d of dirs) for (const f of readdirSync(join(ROOT, d))) if (/\.(m?js|css)$/.test(f)) src.push(join(d, f));
    const words = { glass: /glass/gi, window: /window(?![.(\s]*(?:\.|addEventListener|\)))/gi };
    const lines = [];
    for (const f of src) {
      const text = readFileSync(join(ROOT, f), 'utf8').replace(/\bwindow\s*\.\s*\w+/g, '').replace(/globalThis\.window/g, '').replace(/typeof window/g, '');
      const g = (text.match(words.glass) || []).length, w = (text.match(/window/gi) || []).length;
      if (g + w && /model|glass|editor|dents|patch|carlights|plate|prop|inspector|carExtras|mirror/i.test(f)) lines.push([f, g, w]);
    }
    console.log('\nTHE SOURCE (model, editor and tool files; "window" not counting the DOM\'s window.x): glass / window');
    for (const [f, g, w] of lines.sort((a, b) => (b[1] + b[2]) - (a[1] + a[2])).slice(0, 60)) console.log('  ' + f.padEnd(46) + String(g).padStart(5) + String(w).padStart(6));
  }

  console.log('\n' + rows.length + ' see-through parts in ' + carsWith.size + ' cars (of ' + all.length + ') and ' + new Set(rows.filter(r => r.isProp).map(r => r.owner)).size + ' props'
    + '\nthe shared rule (render/modelpatch.js isWindowPart over render/glassnames.js) calls ' + rows.filter(r => r.rule).length + ' of them windows (' + rows.filter(r => r.rule && r.marks.pane).length + ' cabinGlass glass meshes, ' + rows.filter(r => r.rule && !r.marks.pane).length + ' hand-built, in ' + new Set(rows.filter(r => r.rule && !r.marks.pane).map(r => r.owner)).size + ' cars, with ' + rows.filter(r => r.rule && !r.marks.pane).reduce((s, r) => s + (r.handPanes?.length || 0), 0) + ' panes)'
    + '\nnot windows: ' + rows.filter(r => !r.rule && r.glow).length + ' see-through or glass-coloured parts that GLOW (lamps, lenses, smoke, flames), ' + rows.filter(r => !r.rule && !r.glow).length + ' opaque parts only render/dents.js glassy calls glass by colour (' + [...new Set(rows.filter(r => !r.rule && !r.glow).map(r => r.owner))].join(', ') + ')'
    + '\nMISSED (a pane, a glass / window name, or see-through and not glowing, yet not a window by the rule): ' + missed.length + (missed.length ? ' ' + missed.slice(0, 12).map(r => r.owner + ':' + r.id).join(', ') : '')
    + (failed.length ? '\nnot built: ' + failed.join('; ') : '') + '\n(' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  if (missed.length) process.exitCode = 1;
} finally { THREE.Object3D.prototype.add = add0; await close(); }
