// A check of the model editor's MIRROR mode and WINDOW PANES (render/modelpatch.js symmetryOf / mirroredTransform / withGlass;
// render/ideaModelsDkit.js cabinGlass panes and withGlassEdits; the editor: src/delivery/modeleditor.js), headless (no browser):
//  - SYMMETRY: on the Touring Car the tyres and hubs are found as mirrored pairs (each the other's partner), the merged glass and lamps as
//    symmetric in themselves, and the body (its flare bands stand differently on each flank) as neither; a box added on one side has no
//    partner; two boxes added across the car are partners;
//  - a MIRRORED MOVE: the editor's mirrored set moves the partner by the mirrored amount (x -> -x, y and z the same), a turn mirrors its yaw;
//  - PANES: every idea car built with cabinGlass has its windows listed on the one glass mesh (windscreen, rear glass, L and R side windows,
//    each a vertex range), and with NO edits the pane ranges are the whole glass and the build is the plain build (the same vertices: the
//    game's geometry does not change for a car without edits: every cabinGlass car, vertex by vertex);
//  - a GLASS EDIT through the patch's `glass` table (built with withGlassEdits as the game does) changes ONLY that window's panes: 'door
//    window' both flanks (mirrored by construction), 'door window L' one; a screen's foot / top; an id no window answers to is reported,
//    not thrown; the plain car's shared geometry cache is untouched (a plain build after an edited one is still the plain build);
//  - withGlass / tidyPatch round-trip, and the editor's reset leaves no table.
//   node scripts/.editor-mirror-check.mjs
import { startModels } from './modelpatch-load.mjs';

const { load, close } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;
try {
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const MP = await load('render/modelpatch.js');
  const apply = await load('render/modelpatchapply.js');
  const K = await load('render/ideaModelsDkit.js');
  const { carById } = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  apply.setModelPatching(false);
  const build = (id, edits = null) => {
    const m = K.withGlassEdits(edits, () => buildInspectModel(carById(id), false));
    const rep = K.glassEditsReport();
    if (rep.edits) m.userData.glassEdits = { used: Object.keys(rep.edits).filter(k => !rep.unused.includes(k)), unused: rep.unused };
    return m;
  };

  // ---- symmetry
  const car = build('touringcar');
  MP.applyPatch(car, null);
  const { parts, nodes } = MP.extractParts(car);
  const sym = MP.symmetryOf(car);
  const tyres = parts.filter(p => p.role === 'tyre'), hubs = parts.filter(p => p.role === 'hub');
  const paired = (list) => list.every(p => { const s = sym.get(p.id); return s && s.partner && sym.get(s.partner)?.partner === p.id && near(nodes.get(s.partner).position.x, -nodes.get(p.id).position.x); });
  check(tyres.length === 4 && paired(tyres) && paired(hubs), 'Touring Car: the four tyres and four hubs are mirrored pairs, each the other\'s partner, across x (' + tyres.map(p => p.id + '<->' + sym.get(p.id).partner).join(', ') + ')');
  const glass = parts.find(p => p.panes), lamp = parts.find(p => p.role === 'lamp');
  check(sym.get(glass.id)?.self && sym.get(lamp.id)?.self, 'the merged glass and the merged lamps are symmetric in themselves');
  const body = parts.find(p => p.hook === 'body');
  check(body && !sym.get(body.id)?.self && !sym.get(body.id)?.partner, 'the body (flare bands 0.12 m further out on one flank) is found asymmetric: no partner, not self');
  // added parts: one alone, two across the car
  let p1 = MP.withAdd(MP.emptyPatch('touringcar'), 'box', { position: [0.6, 1.6, 0] }).patch;
  const lone = build('touringcar'); MP.applyPatch(lone, p1);
  check(!MP.symmetryOf(lone).get('n1')?.partner && !MP.symmetryOf(lone).get('n1')?.self, 'a box added on one side has no partner');
  p1 = MP.withAdd(p1, 'box', { position: [-0.6, 1.6, 0] }).patch;
  const two = build('touringcar'); MP.applyPatch(two, p1);
  check(MP.symmetryOf(two).get('n1')?.partner === 'n2' && MP.symmetryOf(two).get('n2')?.partner === 'n1', 'two boxes added across the car are partners');

  // ---- a mirrored move and turn (the editor's setFor: withSet for the part, mirroredTransform for the partner)
  const t = tyres[0], twin = MP.extractParts(car).parts.find(p => p.id === sym.get(t.id).partner);
  const set = { position: [t.position[0] + 0.1, t.position[1] + 0.05, t.position[2] - 0.2] };
  const mirrored = MP.mirroredTransform(car, nodes.get(t.id), t, nodes.get(twin.id), twin, set);
  check(near(mirrored.position[0], twin.position[0] - 0.1) && near(mirrored.position[1], twin.position[1] + 0.05) && near(mirrored.position[2], twin.position[2] - 0.2),
    'a move of a tyre by (+0.1, +0.05, -0.2) moves its partner by (-0.1, +0.05, -0.2) (' + twin.position.join(',') + ' -> ' + mirrored.position.join(',') + ')');
  const turned = MP.mirroredTransform(car, nodes.get(t.id), t, nodes.get(twin.id), twin, { rotation: [0, 0.3, 0.1] });
  check(near(turned.rotation[1], -0.3) && near(turned.rotation[2], -0.1) && near(turned.rotation[0], 0), 'a turn (yaw 0.3, roll 0.1) mirrors to (yaw -0.3, roll -0.1)');
  let patch = MP.withSet(MP.emptyPatch('touringcar'), t, set);
  patch = MP.withSet(patch, twin, mirrored);
  const moved = build('touringcar'); MP.applyPatch(moved, patch);
  const mn = MP.extractParts(moved).nodes;
  check(near(mn.get(twin.id).position.x, -mn.get(t.id).position.x) && near(mn.get(twin.id).position.y, mn.get(t.id).position.y) && near(mn.get(twin.id).position.z, mn.get(t.id).position.z), 'applied: the two tyres still stand across the car from each other (one commit, two ops)');

  // ---- panes on every cabinGlass car, and the plain build unchanged
  let withPanes = 0, bad = [];
  const plainOf = (model) => { const out = []; model.traverse(n => { if (n.isMesh && n.geometry?.userData?.panes) out.push(n); }); return out; };
  for (const idea of IDEA_CARS) {
    let m; try { m = buildInspectModel(idea, false); } catch { continue; }
    if (m.userData.block) continue;
    for (const mesh of plainOf(m)) {
      withPanes++;
      const ps = mesh.geometry.userData.panes, names = ps.map(q => q.name);
      const total = ps.reduce((s, q) => s + q.count, 0), inOrder = ps.every((q, i) => !i || q.start >= ps[i - 1].start + ps[i - 1].count);
      if (!names.includes('windscreen') || !names.some(n => n.endsWith(' L')) || !names.some(n => n.endsWith(' R'))) bad.push(idea.id + ': panes ' + names.join(', '));
      if (!inOrder || total > mesh.geometry.attributes.position.count) bad.push(idea.id + ': pane ranges ' + total + ' of ' + mesh.geometry.attributes.position.count);
      if (ps.some(q => q.edited)) bad.push(idea.id + ': a pane edited with no edits');
      // the same car built with an edit for a window it has not got: the glass mesh is still vertex for vertex the plain one
      const again = K.withGlassEdits({ 'no such window': [[0, 1], [1, 1], [1, 2]] }, () => buildInspectModel(idea, false));
      const a = mesh.geometry.attributes.position.array, b = plainOf(again)[0]?.geometry.attributes.position.array;
      if (!b || a.length !== b.length || a.some((v, i) => Math.abs(v - b[i]) > 1e-7)) bad.push(idea.id + ': the glass built under an edits table differs from the plain build');
    }
  }
  check(withPanes >= 20 && !bad.length, withPanes + ' cabinGlass glass meshes list their panes (windscreen, L and R side windows...) in order, none edited, and build the same vertices under an empty-for-them edits table' + (bad.length ? '\n          ' + bad.slice(0, 8).join('\n          ') : ''));

  // ---- a glass edit: only that window's panes change
  const g0 = plainOf(build('touringcar'))[0], panes0 = g0.geometry.userData.panes;
  const door = panes0.find(q => q.name === 'door window L');
  const lower = door.auto.map(([z, y]) => [z, y > 1.1 ? y - 0.08 : y]);
  const changed = (model) => {
    const g = plainOf(model)[0], ps = g.geometry.userData.panes, out = [];
    for (const q of ps) {
      const q0 = panes0.find(x => x.name === q.name);
      let d = q.count !== q0.count;
      for (let i = 0; !d && i < q.count * 3; i++) if (Math.abs(g.geometry.attributes.position.array[q.start * 3 + i] - g0.geometry.attributes.position.array[q0.start * 3 + i]) > 1e-7) d = true;
      if (d) out.push(q.name);
    }
    return out;
  };
  const both = build('touringcar', { 'door window': lower });
  check(changed(both).sort().join() === 'door window L,door window R', 'the edit "door window" (the roof edge 8 cm lower) changes the door window on both flanks and nothing else (' + changed(both).join(', ') + ')');
  const bothPanes = plainOf(both)[0].geometry.userData.panes, bl = bothPanes.find(q => q.name === 'door window L'), br = bothPanes.find(q => q.name === 'door window R');
  const pos = plainOf(both)[0].geometry.attributes.position.array;
  let mirrorOk = bl.count === br.count;
  for (let i = 0; mirrorOk && i < bl.count; i++) { // (the right pane's vertices are the left's mirrored: the same y and z, x negated, as a set)
    const x = pos[(bl.start + i) * 3], y = pos[(bl.start + i) * 3 + 1], z = pos[(bl.start + i) * 3 + 2];
    let found = false; for (let j = 0; !found && j < br.count; j++) if (near(pos[(br.start + j) * 3], -x, 1e-6) && near(pos[(br.start + j) * 3 + 1], y, 1e-6) && near(pos[(br.start + j) * 3 + 2], z, 1e-6)) found = true;
    mirrorOk = found;
  }
  check(mirrorOk && bl.edited && br.edited, 'the two flanks\' door windows are mirror images of each other (one polygon built on both)');
  const one = build('touringcar', { 'door window L': lower });
  check(changed(one).join() === 'door window L', 'the edit "door window L" changes the left door window only (' + changed(one).join(', ') + ')');
  const ws = panes0.find(q => q.name === 'windscreen');
  const screen = build('touringcar', { windscreen: { foot: ws.auto.foot, top: [ws.auto.top[0] + 0.05, ws.auto.top[1] - 0.05] } });
  check(changed(screen).join() === 'windscreen', 'a windscreen edit (its top 5 cm down the pillar) changes the windscreen only');
  const stale = build('touringcar', { 'door window': lower, 'sunroof': [[0, 0], [1, 0], [1, 1]] });
  const r = MP.applyPatch(stale, { car: 'touringcar', ops: [], glass: { 'door window': lower, sunroof: [[0, 0], [1, 0], [1, 1]] } });
  check(r.unmatched.includes('glass:sunroof') && r.warnings.some(w => /no window called "sunroof"/.test(w)) && changed(stale).length === 2, 'an edit for a window the car has not got ("sunroof") is reported and skipped, the other applied');
  const plainAgain = plainOf(build('touringcar'))[0];
  check(plainAgain.geometry === g0.geometry && plainAgain.geometry.userData.panes.every(q => !q.edited), 'a plain build after the edited ones is the plain cached geometry, unedited (the edits salt their own cache keys)');
  // the patch verbs
  let p = MP.withGlass(MP.emptyPatch('touringcar'), 'door window', lower);
  p = MP.withGlass(p, 'windscreen', { foot: [1, 1], top: [0.5, 1.3] });
  const json = JSON.parse(JSON.stringify(MP.tidyPatch(p)));
  check(json.glass && Object.keys(json.glass).length === 2 && Array.isArray(json.glass['door window']) && json.glass.windscreen.top[1] === 1.3, 'withGlass keeps the table through JSON and tidyPatch');
  p = MP.withGlass(MP.withGlass(p, 'door window', null), 'windscreen', null);
  check(!('glass' in p), 'taking every window edit out leaves no glass table');
  // the game's side: the table from the patch file
  apply.setModelPatching(true);
  apply.PATCHES.touringcar = { car: 'touringcar', ops: [], glass: { 'door window': lower } };
  const inGame = buildInspectModel(carById('touringcar'), false);
  check(inGame.userData.glassEdits?.used.includes('door window') && changed(inGame).sort().join() === 'door window L,door window R', 'the game builds a car with its patch\'s glass table (makeShowCar: both door windows edited)');
  delete apply.PATCHES.touringcar;
  apply.setModelPatching(false);
} catch (e) { console.log('  FAIL  ' + (e.stack || e.message)); failures++; } finally { await close(); }
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
