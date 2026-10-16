// A check that GLASS and WINDOW are one thing to the model editor and the tools (the owner, 15-Oct: "'glass' and 'window' are used
// interchangeably in the models. Make the editor treat both equally."; the rule: render/glassnames.js), headless:
//  - THE WORDS: windowKey makes 'door glass L' and 'door window L', 'rear glass' / 'rear screen' / 'back window' and 'rear window',
//    'windshield' / 'front glass' and 'windscreen' one key; 'window frame' and 'windscreen wiper' are not windows;
//  - EVERY CAR: every see-through part (cabinGlass's panes, a name / role / hook / material name in either spelling, a see-through
//    material that does not glow) is a window part to the editor (render/modelpatch.js isWindowPart, role 'window'), and every window part
//    lists its panes (named, unique in the car); a part a patch names or gives the role 'door glass', 'glass', 'Window' or 'windscreen' is a
//    window whichever word; a sided pane has its twin on the other flank (its name with L / R swapped) or its car is listed as asymmetric;
//  - THE PATCH: on every cabinGlass car, an edit keyed with the other spelling ('door glass' for 'door window', 'rear glass' for 'rear window',
//    'windshield' for 'windscreen', 'quarter glass L'...) builds the SAME vertices as the canonical key, and changes the window (not a no-op);
//    the two spellings share one cache key; a table called `windows` is read as `glass` (the game: makeShowCar with a patch file); withGlass
//    replaces every spelling of the window it sets; tidyPatch writes the canonical keys and the build is unchanged by it;
//  - MIRROR: the editor's twin of every sided cabinGlass pane is found from either spelling; hand-built window parts pair across the car
//    (symmetryOf) as before, renamed in either spelling;
//  - THE TOOLS: render/dents.js, render/carExtras.js and the plate / prop audits take a part named or marked a window, in either spelling,
//    for glass (their source reads render/glassnames.js isWindowNode; the plate audit through plate-search's surfaceKind, checked by
//    behaviour: window-named parts come out 'glass'); the editor reads the table through glassTable / windowKey;
//  - THE SURVEY (scripts/glass-window-survey.mjs) finds no see-through part the rule misses.
//  - with --base [ref]: every car built by the code at `ref` (default: the commit before render/glassnames.js came) and by this code has the
//    same vertices, plain and with trial patches written the old way ('rear glass', 'door window', a windscreen; a colour op), vertex for vertex.
//   node scripts/.glass-window-check.mjs [--base [ref]]
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2);
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const meshHashes = (model) => { const out = []; model.updateMatrixWorld(true); model.traverse((n) => { if (n.isMesh && n.geometry?.attributes.position) { const a = n.geometry.attributes.position.array; let h = 0; for (let i = 0; i < a.length; i++) h = (Math.imul(h, 31) + Math.round(a[i] * 1e5)) | 0; out.push(h); } }); return out.join(','); };
const t0 = Date.now();
const { load, close, ROOT } = await startModels();
// the cars and the trial patches the --base comparison builds (the same code runs against both copies of the repo)
const buildAll = async (ld, cars, trials, plain = true) => {
  const { buildInspectModel } = await ld('render/inspectmodel.js');
  const apply = await ld('render/modelpatchapply.js');
  await apply.patchesReady;
  const out = new Map();
  apply.setModelPatching(true);
  if (plain) for (const car of cars) { try { out.set(car.id, meshHashes(buildInspectModel(car, false))); } catch (e) { out.set(car.id, 'throws ' + e.message); } }
  for (const [id, patch] of Object.entries(trials)) {
    apply.PATCHES[id] = patch;
    try { out.set(id + '+patch', meshHashes(buildInspectModel(cars.find(c => c.id === id), false))); } catch (e) { out.set(id + '+patch', 'throws ' + e.message); }
    delete apply.PATCHES[id];
  }
  return out;
};
try {
  const G = await load('render/glassnames.js');
  const MP = await load('render/modelpatch.js');
  const K = await load('render/ideaModelsDkit.js');
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const cars = await load('cars.js'), { IDEA_CARS } = await load('ideas.js');
  const apply = await load('render/modelpatchapply.js');
  await apply.patchesReady;
  apply.setModelPatching(false);
  const roster = [...new Map([...cars.CARS, ...(cars.FILLER_CARS || []), ...cars.EVENT_CARS, ...cars.BESPOKE_CARS, ...cars.EARNED_CARS, ...Object.values(cars.SECRET_CARS), ...Object.values(cars.LEVEL_CARS || {})].filter(Boolean).map(c => [c.id, c])).values()];
  const all = [...roster, ...IDEA_CARS.filter(c => !roster.some(r => r.id === c.id))];
  const build = (car, edits = null) => {
    const m = K.withGlassEdits(edits, () => buildInspectModel(car, false));
    const rep = K.glassEditsReport();
    if (rep.edits) m.userData.glassEdits = { used: Object.keys(rep.edits).filter(k => !rep.unused.includes(k)), unused: rep.unused };
    return m;
  };

  // ---- the words
  const same = [['door glass L', 'door window L'], ['Door Glass', 'door window'], ['rear glass', 'rear window'], ['rear screen', 'rear window'], ['back window', 'rear window'], ['windshield', 'windscreen'], ['front glass', 'windscreen'], ['quarter glass R', 'quarter window R'], ['glass 3 L', 'window 3 L'], ['side glass', 'side window'], ['rear door glass L', 'rear door window L'], ['side windows', 'side window']];
  const bad = same.filter(([a, b]) => G.windowKey(a) !== G.windowKey(b));
  check(!bad.length, 'windowKey: ' + same.length + ' pairs of spellings are one key (' + same.slice(0, 4).map(([a, b]) => '"' + a + '" = "' + b + '"').join(', ') + '...)' + (bad.length ? ' DIFFER: ' + bad.map(([a, b]) => a + ' -> ' + G.windowKey(a) + ' / ' + b + ' -> ' + G.windowKey(b)).join('; ') : ''));
  check(['glass', 'Window', 'windscreen', 'windshield', 'rear glass', 'door window L', 'glazing'].every(G.isGlassWord) && !['window frame', 'windscreen wiper', 'body', 'panel', 'lamp'].some(G.isGlassWord), 'isGlassWord: glass / window / windscreen / windshield / glazing are windows; a window frame, a wiper, a panel are not');
  check(G.windowBase('door glass L') === 'door window' && G.lookupWindow({ 'door glass': 1 }, 'door window') === 1 && G.lookupWindow({ 'rear window': 2, 'rear glass': 3 }, 'rear glass') === 2, 'windowBase / lookupWindow: either spelling finds the edit (the canonical spelling wins a tie)');

  // ---- every car: see-through parts are windows, with panes
  let windows = 0, panesN = 0, cabin = 0, hand = 0, partners = 0, selfSym = 0;
  const missed = [], noPanes = [], dupes = [], loneSides = new Map();
  for (const car of all) {
    let model; try { model = buildInspectModel(car, false); } catch { continue; }
    if (model.userData.block) continue;
    MP.applyPatch(model, null);
    const { parts, nodes, panes } = MP.extractParts(model), sym = MP.symmetryOf(model);
    const names = [];
    for (const p of parts) {
      const node = nodes.get(p.id);
      if (!node?.isMesh) continue;
      const mat = [].concat(node.material || [])[0];
      const glow = !!mat && (mat.type === 'MeshBasicMaterial' || (mat.emissive && mat.emissive.getHex() > 0 && (mat.emissiveIntensity ?? 1) > 0));
      const seeThrough = !!node.geometry?.userData?.panes || G.isWindowNode(node) || G.isGlassWord(p.hook) || (!!mat?.transparent && mat.opacity < 0.95 && !glow);
      const win = MP.isWindowPart(p);
      if (seeThrough && !win) missed.push(car.id + ':' + p.id);
      if (!win) continue;
      windows++;
      if (p.role !== G.WINDOW_ROLE && !G.isWindowRole(p.role)) missed.push(car.id + ':' + p.id + ' (role ' + p.role + ')');
      const ps = panes.get(p.id) || [];
      if (!ps.length || !p.panes?.length) noPanes.push(car.id + ':' + p.id);
      panesN += ps.length; if (ps.some(q => q.cabin)) cabin++; else hand++;
      if (sym.get(p.id)?.partner) partners++; else if (sym.get(p.id)?.self) selfSym++;
      names.push(...ps.map(q => q.name));
    }
    const seen = new Set(), dup = names.filter(n => seen.has(n) || !seen.add(n));
    if (dup.length) dupes.push(car.id + ': ' + dup.join(', '));
    const sided = names.filter(n => / [LR]$/.test(n)), lone = sided.filter(n => !names.includes(G.windowBase(n) + (n.endsWith(' L') ? ' R' : ' L')));
    if (lone.length) loneSides.set(car.id, lone);
  }
  check(!missed.length && windows > 400, windows + ' window parts in the cars (' + cabin + ' cabinGlass glass meshes, ' + hand + ' hand-built); every see-through part (panes, a glass / window name, see-through and not glowing) is one, role "window"' + (missed.length ? '; MISSED ' + missed.slice(0, 10).join(', ') : ''));
  check(!noPanes.length && !dupes.length, 'every window part lists its panes (' + panesN + ' in all), their names unique in each car' + (noPanes.length ? '; NO PANES ' + noPanes.slice(0, 8).join(', ') : '') + (dupes.length ? '; DUPLICATE ' + dupes.slice(0, 5).join('; ') : ''));
  check(loneSides.size < 20, 'sided panes have their twin across the car (the same name, L / R swapped) in all but ' + loneSides.size + ' cars (asymmetric glass: ' + [...loneSides].slice(0, 8).map(([c, l]) => c + ' ' + l.slice(0, 2).join('/')).join('; ') + (loneSides.size > 8 ? '...' : '') + ')');
  check(partners > 50, 'hand-built window parts pair across the car (symmetryOf): ' + partners + ' with a partner, ' + selfSym + ' symmetric in themselves');

  // ---- a part named or given a role in either spelling
  const commuter = cars.carById('commuter');
  const base0 = buildInspectModel(commuter, false); MP.applyPatch(base0, null);
  const { parts: cp } = MP.extractParts(base0);
  const plainParts = cp.filter(p => p.type === 'mesh' && !MP.isWindowPart(p)).slice(0, 4);
  const spellings = ['door glass', 'Window', 'glass', 'windscreen'];
  let patch = MP.emptyPatch('commuter');
  plainParts.forEach((p, i) => { patch = MP.withSet(patch, p, i % 2 ? { role: spellings[i] } : { name: spellings[i] }); });
  const named = buildInspectModel(commuter, false); MP.applyPatch(named, patch);
  const np = MP.extractParts(named);
  const asWin = plainParts.map(p => np.parts.find(q => q.id === p.id)).filter(q => MP.isWindowPart(q) && q.panes?.length);
  check(plainParts.length === 4 && asWin.length === 4, 'four Commuter parts named / given the role "door glass", "Window", "glass", "windscreen" by a patch are all windows with panes (' + asWin.map(q => (q.name || q.role) + ': ' + q.panes.join('/')).join(', ') + ')');
  const dents = await load('render/dents.js');
  check(/isWindowNode\(m\)/.test(readFileSync(join(ROOT, 'src/delivery/render/dents.js'), 'utf8')) && typeof dents.dentModel === 'function', 'render/dents.js holds a part named or marked a window (either spelling) as glass');

  // ---- the patch: either spelling builds the same, on every cabinGlass car
  const cabinCars = [];
  for (const car of all) { let m; try { m = buildInspectModel(car, false); } catch { continue; } let g = null; m.traverse(n => { if (!g && n.isMesh && n.geometry?.userData?.panes) g = n; }); if (g) cabinCars.push([car, g.geometry.userData.panes]); }
  const glassMesh = (m) => { let g = null; m.traverse(n => { if (!g && n.isMesh && n.geometry?.userData?.panes) g = n; }); return g; };
  const verts = (m) => Array.from(glassMesh(m).geometry.attributes.position.array).join(',');
  const other = (name) => name.replace(/\bwindow\b/, 'glass').replace(/^windscreen$/, 'windshield'); // (the other spelling of a canonical name)
  let pairsSame = 0, pairsEffect = 0, pairsN = 0, saltSame = 0, saltN = 0;
  const diff = [];
  for (const [car, ps] of cabinCars) {
    const plain = verts(build(car)), cachedGlass = glassMesh(build(car)).geometry === glassMesh(build(car)).geometry; // (a car whose glass is cached)
    const side = ps.find(q => q.kind === 'side'), front = ps.find(q => q.name === 'windscreen'), rear = ps.find(q => q.kind === 'screen' && q !== front);
    const lower = side.auto.map(([z, y], i) => [z, i % 2 ? y - 0.03 : y]);
    const trials = [[G.windowBase(side.name), lower], [side.name, lower], [front.name, { foot: front.auto.foot, top: [front.auto.top[0] + 0.03, front.auto.top[1] - 0.03] }]];
    if (rear) trials.push([rear.name, { foot: rear.auto.foot, top: [rear.auto.top[0] - 0.03, rear.auto.top[1] - 0.03] }]);
    for (const [key, edges] of trials) {
      pairsN++;
      const a = build(car, { [key]: edges }), b = build(car, { [other(key)]: edges });
      const va = verts(a), vb = verts(b);
      if (va === vb) pairsSame++; else diff.push(car.id + ' "' + key + '" / "' + other(key) + '"');
      if (va !== plain) pairsEffect++;
      if (cachedGlass) { saltN++; if (glassMesh(a).geometry === glassMesh(b).geometry) saltSame++; } // (one cache entry for both spellings)
    }
  }
  check(cabinCars.length >= 20 && pairsSame === pairsN && pairsEffect === pairsN, cabinCars.length + ' cabinGlass cars, ' + pairsN + ' edits: each keyed the other way ("door glass" for "door window", "rear glass" for "rear window", "windshield", "quarter glass L"...) builds the same vertices, and changes the window' + (diff.length ? '; DIFFER ' + diff.slice(0, 6).join(', ') : '') + (pairsEffect !== pairsN ? '; ' + (pairsN - pairsEffect) + ' edits changed nothing' : ''));
  check(saltSame === saltN && saltN > 40, 'the two spellings of an edit are one cached geometry (' + saltSame + ' / ' + saltN + ' edits on the cars whose glass is cached)');
  // the editor's old name for the rear pane, and a table called `windows`, through the game (makeShowCar reads the patch file)
  const touring = cars.carById('touringcar'), tps = cabinCars.find(([c]) => c.id === 'touringcar')[1];
  const tr = tps.find(q => q.name === 'rear window');
  const rearEdit = { foot: tr.auto.foot, top: [tr.auto.top[0] - 0.04, tr.auto.top[1] - 0.04] };
  check(!!tr && !tps.some(q => q.name === 'rear glass'), 'cabinGlass names the rear pane "rear window" (the owner\'s word; "rear glass" was its old name and still finds it)');
  apply.setModelPatching(true);
  apply.PATCHES.touringcar = { car: 'touringcar', ops: [], evil: [], glass: { 'rear glass': rearEdit } };
  const viaOld = buildInspectModel(touring, false);
  apply.PATCHES.touringcar = { car: 'touringcar', ops: [], evil: [], windows: { 'rear window': rearEdit } };
  const viaWindows = buildInspectModel(touring, false);
  delete apply.PATCHES.touringcar;
  apply.setModelPatching(false);
  const viaNew = build(touring, { 'rear window': rearEdit });
  check(verts(viaOld) === verts(viaNew) && verts(viaWindows) === verts(viaNew) && verts(viaNew) !== verts(build(touring)) && !viaOld.userData.glassEdits.unused.length,
    'the game: a patch file\'s { glass: { "rear glass": ... } } and { windows: { "rear window": ... } } build the Touring Car\'s rear window as { glass: { "rear window": ... } } does (no id reported stale)');
  let wp = MP.withGlass({ car: 'touringcar', ops: [], evil: [], glass: { 'door glass': [[0, 1], [1, 1], [1, 2]], 'rear glass': rearEdit } }, 'door window', [[0, 1], [1, 1], [1, 1.9]]);
  check(Object.keys(wp.glass).sort().join() === 'door window,rear glass' && wp.glass['door window'][2][1] === 1.9, 'withGlass("door window") replaces the edit stored as "door glass" (one entry, the canonical key)');
  const tidy = MP.tidyPatch({ car: 'touringcar', ops: [], evil: [], windows: { 'rear glass': rearEdit, 'Door Glass L': [[0, 1], [1, 1], [1, 2]] } });
  check(!tidy.windows && Object.keys(tidy.glass).sort().join() === 'door window L,rear window', 'tidyPatch writes one `glass` table with canonical keys (' + Object.keys(tidy.glass).join(', ') + ')');
  wp = MP.withGlass(wp, 'door glass', null);
  check(!('door window' in wp.glass) && !('door glass' in wp.glass), 'withGlass(..., null) under either spelling takes the window\'s edit out');
  check(verts(build(touring, tidy.glass)) === verts(build(touring, { 'rear glass': rearEdit, 'door glass L': [[0, 1], [1, 1], [1, 2]] })), 'a table built before and after tidyPatch: the same vertices');
  // mirror: the editor's twin key from either spelling
  const twins = cabinCars.flatMap(([, ps]) => ps.filter(q => q.kind === 'side')).filter(q => { const all2 = cabinCars.find(([, ps]) => ps.includes(q))[1]; const t = G.windowBase(other(q.name)) + (q.side > 0 ? ' R' : ' L'); return !all2.some(x => x.name === t); });
  check(!twins.length, 'every sided cabinGlass pane\'s twin is found from the other spelling of its name (windowBase("door glass L") + " R" = "door window R")' + (twins.length ? ': MISSING ' + twins.slice(0, 5).map(q => q.name).join(', ') : ''));

  // ---- the tools and the editor read the rule
  const src = (f) => readFileSync(join(ROOT, f), 'utf8');
  const tools = { 'src/delivery/render/dents.js': /isWindowNode/, 'src/delivery/render/carExtras.js': /isWindowNode/, 'scripts/plate-search.mjs': /isWindowNode/, 'scripts/prop-audit-lib.mjs': /isWindowNode/, 'scripts/bake-glass.mjs': /glassTable/, 'scripts/model-patch.mjs': /glassTable/, 'src/delivery/render/modelpatchapply.js': /glassTable/, 'src/delivery/render/ideaModelsDkit.js': /lookupWindow/ };
  const notReading = Object.entries(tools).filter(([f, re]) => !re.test(src(f))).map(([f]) => f);
  check(!notReading.length, 'the dents, the stripes, the plate and prop audits, the bake, model-patch, the game\'s patch reader and cabinGlass read render/glassnames.js' + (notReading.length ? ': NOT ' + notReading.join(', ') : ''));
  // the plate search and the plate audit class a window as glass by behaviour, not by a word in their source: since the plate-rules
  // integration (v1.1.146) the audit's kindOf asks plate-search's surfaceKind (the bumper-first rule's surface classes), and surfaceKind
  // asks isWindowNode; so an opaque part named or marked a window, in either spelling, is 'glass' (never a plate surface, ON_GLASS)
  const THREE = await import('three');
  const { surfaceKind } = await import('file://' + join(ROOT, 'scripts/plate-search.mjs'));
  const paint = () => new THREE.MeshStandardMaterial({ color: 0x884422 }), box = new THREE.BoxGeometry(1, 1, 1);
  const body = new THREE.Mesh(box, paint()); body.name = 'body';
  const part = (name, setup) => { const n = new THREE.Mesh(box, paint()); n.name = name; if (setup) setup(n); return n; };
  const winParts = [part('rear window'), part('rear glass'), part('door glass L'), part('door window R'), part('windscreen'), part('windshield'),
    part('trim', n => { n.userData.patchRole = 'window'; }), part('trim 2', n => { n.material.name = 'glass'; }), part('pane', n => { n.geometry = new THREE.BoxGeometry(1, 1, 1); n.geometry.userData = { panes: [{ name: 'p' }] }; })];
  const notGlass = winParts.filter(n => surfaceKind(n, body, () => false) !== 'glass').map(n => n.name);
  const others = [part('rear bumper'), part('window frame'), part('wiper'), body].filter(n => surfaceKind(n, body, () => false) !== 'ok').map(n => n.name);
  const audit = src('scripts/plate-placement-audit.mjs');
  const auditAsks = /import \{[^}]*\bsurfaceKind\b[^}]*\} from '\.\/plate-search\.mjs'/.test(audit) && /const kindOf = [\s\S]{0,800}?surfaceKind\(n, model\.userData\.body, glassy\)/.test(audit);
  check(!notGlass.length && !others.length && auditAsks, 'the plate search\'s surfaceKind (which the plate audit\'s kindOf asks) classes an opaque part named or marked a window, either spelling (rear window / rear glass / door glass L / door window R / windscreen / windshield / role window / material glass / panes), as glass; a bumper, a window frame, a wiper and the body stay plate surfaces'
    + (notGlass.length ? ': NOT GLASS ' + notGlass.join(', ') : '') + (others.length ? ': WRONGLY GLASS ' + others.join(', ') : '') + (auditAsks ? '' : ': the audit\'s kindOf no longer asks plate-search\'s surfaceKind'));
  const ed = src('src/delivery/modeleditor.js');
  check(!/S\.patch\.glass\b/.test(ed) && !/\.slice\(0, -2\)/.test(ed) && /glassTable\(S\.patch\)/.test(ed) && /windowBase/.test(ed) && !/'glass'/.test(src('src/delivery/render/modelpatch.js').replace(/\/\/.*$/gm, '')),
    'the editor reads the table through glassTable / windowKey (no raw patch.glass, no name slicing) and modelpatch.js has no \'glass\' role left');

  // ---- the survey
  let survey = '';
  try { survey = execFileSync(process.execPath, [join(ROOT, 'scripts/glass-window-survey.mjs')], { encoding: 'utf8', timeout: 600000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { survey = (e.stdout || '') + e.message; }
  const line = survey.split('\n').find(l => l.startsWith('MISSED')) || '(no MISSED line)';
  check(/MISSED .*: 0$/.test(line), 'the survey finds no see-through part the rule misses: ' + line.trim() + ' | ' + (survey.split('\n').find(l => l.startsWith('the shared rule')) || '').trim());

  // ---- --base: this code against the code before the rule, vertex for vertex
  if (args.includes('--base')) {
    const at = args.indexOf('--base'), asked = args[at + 1] && !args[at + 1].startsWith('--') ? args[at + 1] : null;
    const ref = asked || execSync('git log --diff-filter=A --format=%H -- src/delivery/render/glassnames.js', { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').pop() + '^';
    const dir = mkdtempSync(join(tmpdir(), 'glass-base-'));
    try {
      execSync('git archive ' + ref + ' src scripts delivery package.json | tar -x -C ' + dir, { cwd: ROOT, stdio: 'ignore' });
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
      // trial patches written the OLD way: what the editor saved before ('rear glass', 'door window', a windscreen; a colour op on the glass)
      const glassOp = (car) => { const m = buildInspectModel(car, false); MP.applyPatch(m, null); const g = MP.extractParts(m).parts.find(p => p.panes?.length || p.role === 'window'); return g ? [{ id: g.id, sig: g.sig, set: { color: '#335577', opacity: 0.7 } }] : []; };
      const trials = {};
      for (const [car, ps] of cabinCars) {
        const side = ps.find(q => q.kind === 'side'), front = ps.find(q => q.name === 'windscreen'), rear = ps.find(q => q.name === 'rear window');
        trials[car.id] = { car: car.id, version: 1, ops: glassOp(car), evil: [], glass: { [G.windowBase(side.name)]: side.auto.map(([z, y], i) => [z, i % 2 ? y - 0.03 : y]), windscreen: { foot: front.auto.foot, top: [front.auto.top[0] + 0.03, front.auto.top[1] - 0.03] }, ...(rear ? { 'rear glass': { foot: rear.auto.foot, top: [rear.auto.top[0] - 0.03, rear.auto.top[1] - 0.03] } } : {}) } };
      }
      for (const id of ['commuter', 'taxi', 'hearse', 'bus']) { const c = cars.carById(id); if (c) trials[id] = { car: id, version: 1, ops: glassOp(c), evil: [] }; }
      apply.setModelPatching(true);
      // (each copy in two fresh servers: the trial patches built before any plain build, and the plain cars, so no build reads another's cached
      // glass: before the rule, a car of ideaModelsBatchD2/D3/D5 or TopupC built plain first kept its cached glass for a patched build)
      const roster0 = async (ld) => { const c = await ld('cars.js'), { IDEA_CARS: I } = await ld('ideas.js'); const r = [...new Map([...c.CARS, ...(c.FILLER_CARS || []), ...c.EVENT_CARS, ...c.BESPOKE_CARS, ...c.EARNED_CARS, ...Object.values(c.SECRET_CARS), ...Object.values(c.LEVEL_CARS || {})].filter(Boolean).map(x => [x.id, x])).values()]; return [...r, ...I.filter(x => !r.some(y => y.id === x.id))]; };
      const twice = async (root) => {
        const out = new Map();
        for (const what of ['patched', 'plain']) {
          const sv = await startModels({ root });
          try { const list = await roster0(sv.load); const got = await buildAll(sv.load, list, what === 'plain' ? {} : trials, what === 'plain'); for (const [k, v] of got) out.set(k, v); } finally { await sv.close(); }
        }
        return out;
      };
      const now = await twice(ROOT), then = await twice(dir);
      const keys = [...now.keys()], differ = keys.filter(k => now.get(k) !== then.get(k));
      check(!differ.length && keys.length > 200, 'against ' + ref + ': ' + keys.length + ' builds (' + all.length + ' cars plain, ' + Object.keys(trials).length + ' with trial patches written the old way: "rear glass", "door window", a windscreen, a colour op) have the same vertices, vertex for vertex' + (differ.length ? '; DIFFER ' + differ.slice(0, 10).join(', ') : ''));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
} catch (e) { failures++; console.log('  FAIL  ' + (e.stack || e.message)); } finally { await close(); }
console.log((failures ? failures + ' FAILED' : 'all ok') + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
process.exit(failures ? 1 : 0);
