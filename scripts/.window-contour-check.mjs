// A check of the model editor's CONTOUR (CHECKLIST 472, the owner: "Add a 'snap to body' for the windows in model editor. It should follow
// the body's contour if any as well"; render/paneedit.js fitPane / applyContour, the patch's `panes` entry v 2 `contour`).
//  HEADLESS, on panes the audit lists floating (WINDOW-EDIT.md): the Commuter's, Sportscompact's, Sportscar's windscreens (one flat quad
//    each, against a curved cowl and pillars), the Hot Rod's and Pick-Up's rear windows (glass slabs), the Kei Roadster's aero screen (one that
//    stands free): built as the code builds them, after Snap (rigid) and after Contour, each measured on the BUILT mesh: the gap (the audit's
//    median beyond 6 mm) and the rim's farthest point from the body (where a surface is within 8 cm along the normal). Contour: the gap 0,
//    that farthest point under 4 mm on the quads and the slabs (Snap's larger), no vertex of the pane inside the body that was not before,
//    the sheet whole (every cut triangle within 30 degrees of the face it was cut from: no fold, no flip), the Kei Roadster's screen turned 8
//    degrees at most. Saved (tidyPatch, JSON) and read back by the game (makeShowCar) vertex for vertex, Evil the same, the Super version
//    bent too; Undo (the earlier patch) and Reset (none) build the code's own again; a v1 entry (no contour) builds as it did; Mirror: the
//    Classic GT's windscreen L fitted, its R given the mirrored edit lies as close; a merged glass mesh (the Wagon): the windscreen bent and
//    the rear window after it in the same mesh still moved by exactly its value (its stored, as-built run); cabinGlass (the Touring Car)
//    the same with door window L bent and R moved.
//  IN HEADLESS CHROMIUM (390x844 touch phone; skipped if none): the Commuter in the editor, the windscreen picked, Contour: the gap chip 0,
//    the line ("↦ ... · contour n/m"), Undo (no contour stored), Redo, Reset (no entry). --shots=<dir>: before / Snap / Contour stills of
//    the Commuter, the Sportscompact and the Kei Roadster.
//   node scripts/.window-contour-check.mjs [--browser=<path>] [--shots=<dir>] [--no-browser]
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startModels } from './modelpatch-load.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const SHOTS = opt('shots', null);
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const cm = (m) => (m * 100).toFixed(1), mm = (m) => (m * 1000).toFixed(1);

const { load, close } = await startModels();
try {
  const THREE = await import('three');
  const MP = await load('render/modelpatch.js'), PE = await load('render/paneedit.js'), { buildInspectModel } = await load('render/inspectmodel.js');
  const C = await load('cars.js'), { IDEA_CARS } = await load('ideas.js'), apply = await load('render/modelpatchapply.js'), { makeShowCar } = await load('render/showcar.js');
  await apply.patchesReady;
  const carOf = (id) => C.carById(id) || IDEA_CARS.find(c => c.id === id);
  const build = (car, patch, evil = false) => { const m = buildInspectModel(car, evil); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); MP.applyPatch(m, patch, { evil }); return m; };
  const find = (m, name) => { const ex = MP.extractParts(m); for (const [id, ps] of ex.panes) { const q = ps.find(p => p.name === name); if (q) return { ex, id, node: ex.nodes.get(id), pane: q, part: ex.parts.find(r => r.id === id) }; } return null; };
  const rest = (m, f) => PE.restItems(m, f.ex, MP.isWindowPart, f.node, f.pane);
  const hashOf = (node) => { const a = node.geometry.attributes.position.array; let h = a.length; for (let i = 0; i < a.length; i++) h = (Math.imul(h, 31) + Math.round(a[i] * 1e5)) | 0; return h; };
  const allHash = (m) => { const out = []; m.traverse(n => { if (n.isMesh && n.geometry?.attributes.position) out.push(hashOf(n)); }); return out.join(','); };
  const verts = (m, f) => { const M = new THREE.Matrix4().copy(m.matrixWorld).invert().multiply(f.node.matrixWorld), pos = f.node.geometry.attributes.position, out = []; for (let i = f.pane.start; i < f.pane.start + f.pane.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(M)); return out; };
  const triNormals = (m, f) => { const M = new THREE.Matrix4().copy(m.matrixWorld).invert().multiply(f.node.matrixWorld), pos = f.node.geometry.attributes.position, P = (i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(M); return PE.paneTris(f.node.geometry, f.pane).map(([a, b, c]) => { const A = P(a); return P(b).sub(A).cross(P(c).sub(A)); }); };
  // how many of the pane's vertices lie inside the body: behind the nearest body face (its winding), deeper than 2 mm
  const inside = (m, f, body) => verts(m, f).filter(p => { const h = PE.nearestBody(body, p, 0.1); return h && !h.glass && h.d > 0.002 && p.clone().sub(h.q).dot(h.n) < 0; }).length;
  const measure = (car, name, patch, nDir) => {
    const m = build(car, patch), f = find(m, name), body = rest(m, f), rim = PE.rimPoints(f.node, m, f.pane);
    return { m, f, body, gap: PE.gapOf(rim, body), fit: PE.rimFit({ rim, n: nDir }, body), inside: inside(m, f, body), tris: PE.paneTris(f.node.geometry, f.pane).length };
  };
  const withEdit = (car, f0, edit, base = MP.emptyPatch(car.id, '')) => JSON.parse(JSON.stringify(MP.tidyPatch(MP.withPane(base, f0.part, f0.pane, edit))));

  const CASES = [['commuter', 'windscreen', 'quad'], ['sport', 'windscreen', 'quad'], ['miata', 'windscreen', 'quad'], ['hotrod', 'rear window', 'slab'], ['pickup', 'rear window', 'slab'], ['keiroadster', 'windscreen', 'free']];
  for (const [id, name, kind] of CASES) {
    const car = carOf(id), m0 = build(car, null), f0 = find(m0, name);
    if (!f0) { check(false, id + ': no ' + name); continue; }
    const body0 = rest(m0, f0), n = PE.paneFrame(f0.node, m0, f0.pane).n;
    const sn = PE.snapPane(PE.paneSamples(f0.node, m0, f0.pane), body0, PE.paneFrame(f0.node, m0, f0.pane).c);
    const fit = PE.fitPane(f0.node, m0, f0.pane, null, body0);
    if (!fit) { check(false, id + ' ' + name + ': Contour found nothing to do'); continue; }
    const A = measure(car, name, null, n), R = sn ? measure(car, name, withEdit(car, f0, PE.snappedEdit({}, sn)), n) : A, K = measure(car, name, withEdit(car, f0, fit.edit), PE.samplesUnder(f0.node, m0, f0.pane, fit.edit).n);
    const say = (x) => 'gap ' + cm(x.gap.gap) + ' cm, rim ' + mm(x.fit.max) + ' mm';
    const line = id + ' ' + name + ': as built ' + say(A) + '; Snap ' + say(R) + (sn ? ' (' + cm(sn.moved) + ' cm, ' + sn.turned + '°)' : '') + '; Contour ' + say(K) + ' (' + cm(fit.moved) + ' cm, ' + fit.turned + '°, ' + fit.conformed + '/' + fit.rim + ' rim points bent, ' + A.tris + ' -> ' + K.tris + ' triangles)';
    if (kind === 'free') check(K.gap.gap <= A.gap.gap && fit.turned <= PE.CONTOUR_TURN + 0.05 && (sn?.turned ?? 0) > fit.turned, line + ': turned no more than ' + PE.CONTOUR_TURN + '° (Snap: ' + (sn?.turned ?? 0) + '°)');
    else if (kind === 'quad') check(K.gap.gap < 0.0005 && K.fit.max < 0.004 && K.fit.max < R.fit.max && K.fit.n >= R.fit.n * 0.9, line);
    else check(K.gap.gap < 0.0005 && K.fit.max < R.fit.max, line + ': closer than Snap'); // (a slab: its ends sit in their pillars, the rim that meets nothing along its normal stays)
    // never through the body: each vertex's straight path from as built (cut, not moved: a zero contour) to where Contour put it crosses no body face
    // (the bend: each vertex's straight path from the fit's move and turn alone (cut, a zero contour) to where Contour put it)
    const Z = measure(car, name, withEdit(car, f0, { ...fit.edit, contour: [[0.5, 0.5, 0]] }), n), vz = verts(Z.m, Z.f), vk = verts(K.m, K.f);
    const thr = !fit.edit.contour ? 0 : vz.length === vk.length ? PE.throughBody(vz, vk, K.body).length : -1, thrSnap = PE.throughBody(verts(A.m, A.f), verts(R.m, R.f), R.body).length;
    check(thr === 0, id + ': the bend carries no vertex into the body (' + thr + ' of ' + vk.length + '); Snap\'s own move: ' + thrSnap + ' of ' + R.f.pane.count + '; inside by the nearest face\'s side: ' + K.inside + ' (as built ' + A.inside + ', Snap ' + R.inside + ')');
    // the sheet: every cut triangle within 30 degrees of the face it was cut from (Snap's build: the same faces, moved)
    const nr = triNormals(R.m, R.f), nk = triNormals(K.m, K.f), per = nk.length / nr.length;
    let worst = 0; nk.forEach((v, i) => { const p = nr[Math.floor(i / per)]; if (v.lengthSq() > 1e-14 && p.lengthSq() > 1e-14) worst = Math.max(worst, v.angleTo(p) * 180 / Math.PI); });
    check(Number.isInteger(per) && worst < 30, id + ': the glass a whole sheet: each of ' + nk.length + ' triangles within ' + worst.toFixed(1) + '° of the face it was cut from');
    // saved and read back by the game; Evil; Super
    const saved = withEdit(car, f0, fit.edit), entry = Object.values(saved.panes)[0];
    apply.PATCHES[car.id] = saved;
    const gf = find(makeShowCar(car), name), ef = find(build(car, saved), name), vf = find(build(car, saved, true), name);
    const hasC = !!fit.edit.contour;
    check(entry && (hasC ? entry.v === 2 && entry.contour?.length === fit.edit.contour.length : !entry.v && !entry.contour) && gf && hashOf(gf.node) === hashOf(ef.node) && vf && hashOf(vf.node) === hashOf(ef.node), id + ': saved (' + (hasC ? 'v 2, ' + entry.contour.length + ' anchors' : 'no contour: v 1') + ', ' + JSON.stringify(entry).length + ' bytes) and read back by the game (makeShowCar) as the editor builds it; Evil the same');
    const sup = C.superOf?.(car);
    if (sup) { const s1 = find(makeShowCar(sup), name); delete apply.PATCHES[car.id]; const s0 = find(makeShowCar(sup), name); check(s1 && s0 && (hasC ? s1.pane.count > s0.pane.count : hashOf(s1.node) !== hashOf(s0.node)), id + ': its Super (' + sup.id + ') wears the edit (' + (s0?.pane.count) + ' -> ' + (s1?.pane.count) + ' vertices)'); }
    delete apply.PATCHES[car.id];
    // Undo (the earlier patch: Snap's) and Reset (none)
    if (sn) check(allHash(build(car, withEdit(car, f0, PE.snappedEdit({}, sn)))) === allHash(R.m), id + ': Undo: the earlier patch builds as before');
    check(allHash(build(car, withEdit(car, f0, null))) === allHash(m0), id + ': Reset: the code\'s own model again');
  }
  // a v1 entry (no contour: as saved before v 2) builds as it did: moved, nothing cut
  {
    const car = carOf('commuter'), m0 = build(car, null), f0 = find(m0, 'windscreen'), old = { id: f0.part.id, sig: f0.part.sig, pane: 'windscreen', start: f0.pane.start, count: f0.pane.count, move: [0, 0.01, 0.02], turn: [0, 2, 0], size: [1, 1] };
    const m1 = build(car, { car: car.id, version: '', ops: [], evil: [], panes: { [f0.part.id + '#windscreen']: old } }), f1 = find(m1, 'windscreen');
    const E = PE.editMatrix(old, PE.paneFrame(f0.node, m0, f0.pane)), v0 = verts(m0, f0), v1 = verts(m1, f1);
    check(f1.pane.count === f0.pane.count && v0.every((p, i) => p.clone().applyMatrix4(E).distanceTo(v1[i]) < 1e-5), 'an old (v 1) entry: built as before, every vertex where its move and turn put it, nothing cut');
  }
  // Mirror: the Classic GT's windscreen L fitted, R given the mirrored edit
  {
    const car = carOf('classicgt'), m0 = build(car, null), L = find(m0, 'windscreen L'), R = find(m0, 'windscreen R');
    const fit = L && R && PE.fitPane(L.node, m0, L.pane, null, rest(m0, L));
    if (!fit) check(false, 'the Classic GT: windscreen L / R not found or nothing to fit');
    else {
      let p = MP.withPane(MP.emptyPatch(car.id, ''), L.part, L.pane, fit.edit); p = MP.withPane(p, R.part, R.pane, PE.mirroredEdit(fit.edit));
      const m1 = build(car, JSON.parse(JSON.stringify(p))), L1 = find(m1, 'windscreen L'), R1 = find(m1, 'windscreen R');
      const gl = PE.gapOf(PE.rimPoints(L1.node, m1, L1.pane), rest(m1, L1)), gr = PE.gapOf(PE.rimPoints(R1.node, m1, R1.pane), rest(m1, R1));
      const vl = verts(m1, L1), vr = verts(m1, R1); let far = 0; for (const a of vl) { const b = new THREE.Vector3(-a.x, a.y, a.z); let d = 1; for (const q of vr) d = Math.min(d, q.distanceTo(b)); far = Math.max(far, d); }
      const g0 = PE.gapOf(PE.rimPoints(R.node, m0, R.pane), rest(m0, R));
      check(R1.pane.count === L1.pane.count && far < 0.002 && gr.gap <= gl.gap + 0.001, 'Mirror (the Classic GT): windscreen L fitted (gap ' + cm(PE.gapOf(PE.rimPoints(L.node, m0, L.pane), rest(m0, L)).gap) + ' -> ' + cm(gl.gap) + ' cm), windscreen R given the mirrored contour: its vertices L\'s mirrored to ' + mm(far) + ' mm, gap ' + cm(g0.gap) + ' -> ' + cm(gr.gap) + ' cm');
    }
  }
  // a merged glass mesh (the Wagon) and cabinGlass (the Touring Car): one pane bent, a pane after it in the same mesh moved by its value
  for (const [id, bent, moved] of [['wagon', 'windscreen', 'rear window'], ['touringcar', 'door window L', 'door window R']]) {
    const car = carOf(id), m0 = build(car, null), A = find(m0, bent), B = find(m0, moved);
    if (!A || !B || A.node !== B.node) { check(false, id + ': ' + bent + ' and ' + moved + ' not one mesh'); continue; }
    const fit = PE.fitPane(A.node, m0, A.pane, null, rest(m0, A)), MOVE = { move: [0, 0.01, -0.02], turn: [0, 0, 0], size: [1, 1] };
    let p = MP.withPane(MP.emptyPatch(car.id, ''), B.part, B.pane, MOVE); p = MP.withPane(p, A.part, A.pane, fit?.edit || { contour: [[0.5, 0.5, 1]] });
    const m1 = build(car, JSON.parse(JSON.stringify(p))), A1 = find(m1, bent), B1 = find(m1, moved), b0 = verts(m0, B), b1 = verts(m1, B1);
    const okMove = b0.length === b1.length && b0.every((q, i) => q.clone().add(new THREE.Vector3(...MOVE.move)).distanceTo(b1[i]) < 1e-5);
    const back = PE.paneAsBuilt(A1.node, B1.pane), backA = PE.paneAsBuilt(A1.node, A1.pane);
    check(fit && A1.pane.count > A.pane.count && okMove && back.start === B.pane.start && back.count === B.pane.count && backA.start === A.pane.start && backA.count === A.pane.count,
      id + ': ' + bent + ' bent (' + A.pane.count + ' -> ' + A1.pane.count + ' vertices, gap ' + cm(PE.gapOf(PE.rimPoints(A.node, m0, A.pane), rest(m0, A)).gap) + ' -> ' + cm(PE.gapOf(PE.rimPoints(A1.node, m1, A1.pane), rest(m1, A1)).gap) + ' cm), ' + moved + ' in the same mesh moved by exactly its value; both runs mapped back to as built');
  }
} catch (e) { check(false, e.stack || e.message); } finally { await close(); }

// ---- the editor, in a browser, as on a phone
const browser = opt('no-browser', false) ? null : opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!browser) console.log('  (no browser: the editor part is skipped)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-wincontour-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (msg) => { clearTimeout(timer); msg.error ? fail(new Error(method + ': ' + msg.error.message)) : done(msg.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5249, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
    await server.listen();
    const port = server.config.server.port, profile = join(own, 'profile');
    mkdirSync(profile);
    child = spawn(browser, [...(process.platform === 'linux' && process.getuid?.() === 0 ? ['--no-sandbox'] : []), '--headless=new', '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-extensions', '--disable-component-update',
      '--disable-background-networking', '--user-data-dir=' + profile, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
    child.on('error', () => {});
    let where = null;
    for (let k = 0; k < 300 && !where && child.exitCode === null; k++) {
      await sleep(100);
      try { const lines = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n'); if (lines[1]?.trim()) where = `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`; } catch { /* (not up yet) */ }
    }
    if (!where) throw new Error('the browser did not start: ' + browser);
    socket = new WebSocket(where);
    await new Promise((done, fail) => { socket.addEventListener('open', done); socket.addEventListener('error', () => fail(new Error('no DevTools connection'))); });
    socket.addEventListener('message', (msg) => { const message = JSON.parse(msg.data); if (message.id) { const answer = waiting.get(message.id); waiting.delete(message.id); answer?.(message); } });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params, timeout) => send(method, params, sessionId, timeout);
    const evaluate = async (expression, timeout = 120000) => {
      const r = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);
      if (r.exceptionDetails) throw new Error('in the page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 });
    const ready = async () => { for (let k = 0; k < 240; k++) { await sleep(250); try { if (await evaluate('!!(window.__modelEditor && window.__modelEditor.model && document.querySelector("#windows [data-wpane]"))', 5000)) return true; } catch { /* (loading) */ } } return false; };
    const touch = async (type, x, y) => page('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 8, radiusY: 8, force: 1, id: 1 }] });
    const press = async (sel) => {
      await evaluate(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' })`); await sleep(150);
      const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
      await touch('touchStart', r[0], r[1]); await sleep(40); await touch('touchEnd'); await sleep(800);
    };
    const STATE = `(() => { const S = window.__modelEditor, sp = S.api.paneSel(); return { pane: S.pane, gap: sp && S.api.paneGapNow(sp).gap, entry: sp && JSON.parse(JSON.stringify(S.patch.panes?.[sp.key] || null)), line: document.getElementById('paneSnapLine')?.textContent || '', btn: !!document.getElementById('paneContour') }; })()`;
    const state = () => evaluate(STATE);
    const open = async (car, pane, view) => {
      await page('Page.navigate', { url: `http://localhost:${port}/delivery/modeleditor.html?car=${car}&view=${view}&tab=parts` });
      if (!await ready()) throw new Error('the editor did not open ' + car);
      await evaluate('localStorage.removeItem("delivery.modelpatches")');
      await press(`#windows [data-wpane="${pane}"]`);
      await evaluate(`document.querySelector('#tabs [data-tab="part"]').click()`); await sleep(600);
    };
    // a still with the selected pane in view: the panel scrolled to the pane's block, the 3D view above it
    const shot = async (name) => {
      if (!SHOTS) return; mkdirSync(SHOTS, { recursive: true });
      await evaluate(`(() => { const b = document.getElementById('paneBox'); b && b.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); })()`); await sleep(400);
      const { data } = await page('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
    };
    await open('commuter', 'windscreen', '34');
    let s = await state();
    const g0 = s.gap;
    check(s.pane === 'windscreen' && s.btn, 'the Commuter: the windscreen picked, a Contour button by Snap');
    await press('#paneContour'); s = await state();
    check(s.entry?.v === 2 && s.entry.contour?.length > 0 && s.gap < 0.001 && /contour \d+\/\d+/.test(s.line), 'Contour: gap ' + cm(g0) + ' -> ' + mm(s.gap) + ' mm, stored v 2 with ' + (s.entry?.contour?.length || 0) + ' anchors, the line "' + s.line + '"');
    await press('#undo'); s = await state();
    check(!s.entry, 'Undo: no edit stored, the windscreen as built (gap ' + cm(s.gap) + ' cm)');
    await press('#redo'); s = await state();
    check(s.entry?.contour?.length > 0, 'Redo: the contour back');
    await press('#paneReset'); s = await state();
    check(!s.entry && Math.abs(s.gap - g0) < 1e-4, 'Reset: as built again');
    // the stills: before, Snap, Contour
    if (SHOTS) {
      for (const [car, pane, view] of [['commuter', 'windscreen', '34'], ['sport', 'windscreen', '34'], ['keiroadster', 'windscreen', 'left']]) {
        await open(car, pane, view);
        await shot(car + '-1-before');
        await press('#paneSnap'); await shot(car + '-2-snap'); const a = await state();
        await press('#undo'); await press('#paneContour'); await shot(car + '-3-contour'); const b = await state();
        console.log('  (stills: ' + car + ' ' + pane + ': Snap "' + a.line + '", Contour "' + b.line + '")');
      }
      await evaluate('localStorage.removeItem("delivery.modelpatches")');
    }
  } catch (e) { check(false, e.stack || e.message); } finally { try { child?.kill(); } catch { /* */ } await server?.close(); }
}
console.log((failures ? failures + ' FAILED' : 'all ok') + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
process.exit(failures ? 1 : 0);
