// A check of ONE WINDOW PANE EDITED ON ITS OWN in the model editor (CHECKLIST 462, the owner: "The model editor still doesn't let me change
// the angle or placement of a single window, there are some cars with floating windscreens that I can't fix"; render/paneedit.js, the
// patch's `panes` table).
//  HEADLESS, on three cars whose windscreen is a glass part of its own (the Hot Hatch, the Muscle car, the Gullwing) and one whose glass is ONE
//    merged mesh of several panes (the Family Wagon): the windscreen pane found; moved by value (its centre moves by exactly that, the other
//    panes of the mesh and every other part do not), turned by value (its normal turns by that), undone (the earlier patch builds the same
//    vertices again, the empty one the code's own); floated (3 cm out, else 6 or 10 until its gap is over 1 cm, and 3 degrees) and
//    SNAPPED to the body: the gap under 1 mm; the patch
//    saved (tidyPatch, JSON) and read back by the GAME (render/modelpatchapply.js: makeShowCar, as the garage / showroom / run build it) with
//    the same vertices as the editor's build, the Evil side the same, the Super version the pane moved too; the Touring Car's door window L
//    (cabinGlass) moved with its mirror on door window R.
//  IN HEADLESS CHROMIUM (a 390x844 touch phone; skipped with a note if none is found), the Wagon in the editor: the windscreen picked from the
//    Windows row, the gizmo on the pane (not the part), Z typed (+2 cm), Pitch typed (+4 degrees), Undo (the turn undone), Snap after a float
//    (gap under 1 mm, the line saying how far), the page reloaded: the patch kept (this browser's store) and the pane still where it was left.
//   node scripts/.window-edit-check.mjs [--browser=<path>] [--shots=<dir>]
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

const { load, close } = await startModels();
try {
  const THREE = await import('three');
  const MP = await load('render/modelpatch.js'), PE = await load('render/paneedit.js'), { buildInspectModel } = await load('render/inspectmodel.js');
  const C = await load('cars.js'), { IDEA_CARS } = await load('ideas.js'), apply = await load('render/modelpatchapply.js'), { makeShowCar } = await load('render/showcar.js');
  await apply.patchesReady;
  const carOf = (id) => C.carById(id) || IDEA_CARS.find(c => c.id === id);
  const build = (car, patch, evil = false) => { const m = buildInspectModel(car, evil); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); MP.applyPatch(m, patch, { evil }); return m; };
  const hashOf = (node) => { const a = node.geometry.attributes.position.array; let h = 0; for (let i = 0; i < a.length; i++) h = (Math.imul(h, 31) + Math.round(a[i] * 1e5)) | 0; return h; };
  const allHash = (m) => { const out = []; m.traverse(n => { if (n.isMesh && n.geometry?.attributes.position) out.push(hashOf(n)); }); return out.join(','); };
  const find = (m, name) => { const ex = MP.extractParts(m); for (const [id, ps] of ex.panes) { const q = ps.find(p => p.name === name); if (q) return { ex, id, node: ex.nodes.get(id), pane: q, part: ex.parts.find(r => r.id === id) }; } return null; };
  const centreNow = (m, f) => { const s = PE.paneSamples(f.node, m, f.pane); const b = new THREE.Box3().setFromPoints(s.inner); return { c: b.getCenter(new THREE.Vector3()), n: s.n }; };
  const gap = (m, f) => PE.gapOf(PE.rimPoints(f.node, m, f.pane), PE.restItems(m, f.ex, MP.isWindowPart, f.node, f.pane));
  const others = (m, f) => { const pos = f.node.geometry.attributes.position.array, out = []; for (let i = 0; i < pos.length / 3; i++) if (i < f.pane.start || i >= f.pane.start + f.pane.count) out.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); return out.map(v => Math.round(v * 1e5)).join(); };
  const restHash = (m, f) => { const out = []; m.traverse(n => { if (n.isMesh && n !== f.node && n.geometry?.attributes.position) out.push(hashOf(n)); }); return out.join(','); };

  for (const [id, merged] of [['hothatch', false], ['muscle', false], ['gullwing', false], ['wagon', true]]) {
    const car = carOf(id), m0 = build(car, null), f0 = find(m0, 'windscreen');
    if (!f0) { check(false, id + ': no windscreen pane'); continue; }
    const panesIn = MP.extractParts(m0).panes.get(f0.id).length;
    check(merged ? panesIn > 1 : panesIn === 1, id + ': the windscreen is ' + (merged ? 'one of ' + panesIn + ' panes of one merged glass mesh [' + f0.id + ']' : 'a glass part of its own [' + f0.id + ']'));
    const base = allHash(m0), c0 = centreNow(m0, f0);
    // moved by value
    const MOVE = [0, 0.02, 0.03], P1 = MP.withPane(MP.emptyPatch(car.id, ''), f0.part, f0.pane, { move: MOVE });
    const m1 = build(car, P1), f1 = find(m1, 'windscreen'), c1 = centreNow(m1, f1);
    const d1 = c1.c.clone().sub(c0.c);
    check(d1.distanceTo(new THREE.Vector3(...MOVE)) < 1e-4 && others(m1, f1) === others(m0, f0) && restHash(m1, f1) === restHash(m0, f0),
      id + ': moved by value (0, +2, +3 cm): its centre moves by (' + d1.toArray().map(v => (v * 100).toFixed(2)).join(', ') + ') cm, ' + (merged ? 'the other panes of its mesh and ' : '') + 'every other part unchanged');
    // turned by value
    const P2 = MP.withPane(P1, f0.part, f0.pane, { move: MOVE, turn: [0, 6, 0] });
    const m2 = build(car, P2), f2 = find(m2, 'windscreen');
    const vs = (m, f) => { const M = new THREE.Matrix4().copy(m.matrixWorld).invert().multiply(f.node.matrixWorld), pos = f.node.geometry.attributes.position, out = []; for (let i = f.pane.start; i < f.pane.start + f.pane.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(M)); return out; };
    const E = PE.editMatrix({ move: MOVE, turn: [0, 6, 0] }, PE.paneFrame(f0.node, m0, f0.pane)), v0 = vs(m0, f0), v2 = vs(m2, f2);
    const exact = v0.every((p, i) => p.clone().applyMatrix4(E).distanceTo(v2[i]) < 1e-5);
    let ang = 0; for (let i = 1; i < v0.length; i++) { const a = v0[i].clone().sub(v0[0]), b = v2[i].clone().sub(v2[0]); if (a.length() > 0.05 && Math.hypot(a.y, a.z) > 0.9 * a.length()) ang = Math.max(ang, a.angleTo(b) * 180 / Math.PI); }
    check(exact && Math.abs(ang - 6) < 0.3, id + ': turned by value (pitch 6 degrees about its centre): every vertex where the edit puts it, its edges across x turned ' + ang.toFixed(2) + ' degrees');
    // undone: the earlier patch builds the same again, the empty one the code's own
    check(allHash(build(car, JSON.parse(JSON.stringify(P1)))) === allHash(m1) && allHash(build(car, MP.withPane(P2, f0.part, f0.pane, null))) === base, id + ': undone: the move alone builds as before, the pane taken out builds the code\'s own model');
    // floated, then snapped
    // (out along its normal, 3 cm, else 6 or 10 until it floats: a glass slab whose ends sit in its pillars slides 3 cm and still rests)
    let FLOAT, P3, m3, f3, g3, out = 0;
    for (out of [0.03, 0.06, 0.1]) {
      FLOAT = { move: PE.paneFrame(f0.node, m0, f0.pane).n.clone().multiplyScalar(out).toArray().map(v => Math.round(v * 1000) / 1000), turn: [0, 3, 0] };
      P3 = MP.withPane(MP.emptyPatch(car.id, ''), f0.part, f0.pane, FLOAT); m3 = build(car, P3); f3 = find(m3, 'windscreen'); g3 = gap(m3, f3);
      if (g3.gap > 0.01) break;
    }
    const g0 = gap(m0, f0);
    const pivot = PE.paneFrame(f3.node, m3, f3.pane).c.clone().add(new THREE.Vector3(...FLOAT.move));
    const sn = PE.snapPane(PE.paneSamples(f3.node, m3, f3.pane), PE.restItems(m3, f3.ex, MP.isWindowPart, f3.node, f3.pane), pivot);
    const P4 = sn && MP.withPane(P3, f0.part, f0.pane, PE.snappedEdit(FLOAT, sn)), m4 = P4 && build(car, P4), f4 = m4 && find(m4, 'windscreen'), g4 = f4 && gap(m4, f4);
    check(g3.gap > 0.01 && g4 && g4.gap < 0.001, id + ': floated ' + out * 100 + ' cm out and 3 degrees (gap ' + (g3.gap * 100).toFixed(1) + ' cm; as built ' + (g0.gap * 100).toFixed(1) + ' cm), Snap: ' + (sn ? (sn.moved * 100).toFixed(1) + ' cm, ' + sn.turned + ' degrees (' + sn.how + '), gap ' + (g4.gap * 1000).toFixed(1) + ' mm' : 'nothing'));
    // saved and read back by the game; Evil the same; the Super version too
    const saved = JSON.parse(JSON.stringify(MP.tidyPatch(P4 || P2)));
    apply.PATCHES[car.id] = saved;
    const game = makeShowCar(car), ed = build(car, saved);
    const gf = find(game, 'windscreen'), ef = find(ed, 'windscreen');
    check(gf && hashOf(gf.node) === hashOf(ef.node) && hashOf(gf.node) !== hashOf(f0.node), id + ': saved (tidyPatch, JSON) and read back by the game (makeShowCar): the windscreen built as the editor builds it, moved');
    const evil = find(build(car, saved, true), 'windscreen');
    check(evil && hashOf(evil.node) === hashOf(ef.node), id + ': the Evil side: the same pane');
    const sup = C.superOf(car);
    if (sup) {
      const sm = makeShowCar(sup), sf = find(sm, 'windscreen'), plain = (() => { delete apply.PATCHES[car.id]; const r = find(makeShowCar(sup), 'windscreen'); apply.PATCHES[car.id] = saved; return r; })();
      const moved = sf && plain && centreNow(sm, sf).c.distanceTo(centreNow(plain.node.parent ? plain.ex.nodes.get('') || sm : sm, plain).c);
      check(sf && plain && hashOf(sf.node) !== hashOf(plain.node) && moved != null, id + ': its Super version (' + sup.id + ') wears the pane edit (the base car\'s window edits)');
    }
    delete apply.PATCHES[car.id];
  }
  // a cabinGlass car: a side pane moved, its mirror across the car (the editor's Mirror: render/paneedit.js mirroredEdit)
  {
    const car = carOf('touringcar'), m0 = build(car, null), L = find(m0, 'door window L'), R = find(m0, 'door window R');
    const e = { move: [0.01, 0.015, -0.02], turn: [4, 0, 2] };
    let p = MP.withPane(MP.emptyPatch(car.id, ''), L.part, L.pane, e); p = MP.withPane(p, R.part, R.pane, PE.mirroredEdit(e));
    const m1 = build(car, p), L1 = find(m1, 'door window L'), R1 = find(m1, 'door window R');
    const pl = centreNow(m1, L1).c.sub(centreNow(m0, L).c), pr = centreNow(m1, R1).c.sub(centreNow(m0, R).c);
    check(Math.abs(pl.x + pr.x) < 1e-4 && Math.abs(pl.y - pr.y) < 1e-4 && Math.abs(pl.z - pr.z) < 1e-4 && pl.length() > 0.01, 'the Touring Car (cabinGlass): door window L moved and turned, door window R mirrored (x ' + (pl.x * 100).toFixed(2) + ' / ' + (pr.x * 100).toFixed(2) + ' cm)');
  }
} catch (e) { check(false, e.stack || e.message); } finally { await close(); }

// ---- the editor itself, in a browser, as on a phone
const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-winedit-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (msg) => { clearTimeout(timer); msg.error ? fail(new Error(method + ': ' + msg.error.message)) : done(msg.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5247, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
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
    const shot = async (name) => { if (!SHOTS) return; mkdirSync(SHOTS, { recursive: true }); const { data } = await page('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(SHOTS, name + '.png'), Buffer.from(data, 'base64')); };
    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 });
    const ready = async () => { for (let k = 0; k < 240; k++) { await sleep(250); try { if (await evaluate('!!(window.__modelEditor && window.__modelEditor.model && document.querySelector("#windows [data-wpane]"))', 5000)) return true; } catch { /* (loading) */ } } return false; };
    const touch = async (type, x, y) => page('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 8, radiusY: 8, force: 1, id: 1 }] });
    const press = async (sel) => {
      await evaluate(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' })`); await sleep(150);
      const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
      await touch('touchStart', r[0], r[1]); await sleep(40); await touch('touchEnd'); await sleep(500);
    };
    const type = async (row, i, value) => { await evaluate(`(() => { const el = document.querySelectorAll('[data-pv="${row}"] input')[${i}]; el.value = String(${value}); el.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(500); };
    const STATE = `(() => { const S = window.__modelEditor, sp = S.api.paneSel(); return { sel: S.sel, pane: S.pane, onProxy: !!sp && S.three.gizmo.object && S.three.gizmo.object !== S.nodes.get(S.sel), edit: sp && sp.edit, gap: sp && S.api.paneGapNow(sp).gap, stored: JSON.parse(JSON.stringify(S.patch.panes || null)), line: document.getElementById('paneSnapLine')?.textContent || '', fields: !!document.querySelector('[data-pv="pos"]') && !!document.querySelector('[data-pv="turn"]') && !!document.querySelector('[data-pv="size"]') }; })()`;
    const state = () => evaluate(STATE);
    await page('Page.navigate', { url: `http://localhost:${port}/delivery/modeleditor.html?car=wagon&view=34&tab=parts` });
    if (!await ready()) throw new Error('the editor did not open the Wagon');
    await evaluate('localStorage.removeItem("delivery.modelpatches")');
    await press('#windows [data-wpane="windscreen"]');
    await evaluate(`document.querySelector('#tabs [data-tab="part"]').click()`); await sleep(500);
    let s = await state();
    check(s.pane === 'windscreen' && s.onProxy && s.fields, 'the Wagon: the windscreen picked from the Windows row; the gizmo on the pane, not its part; the X Y Z / Yaw Pitch Roll / W H fields shown');
    await shot('wagon-picked');
    const z0 = s.edit.move[2];
    await type('pos', 2, `(+document.querySelectorAll('[data-pv="pos"] input')[2].value + 0.02).toFixed(3)`); s = await state();
    check(Math.abs(s.edit.move[2] - z0 - 0.02) < 0.002 && s.stored, 'Z typed +2 cm: stored in the patch\'s panes table (move z ' + s.edit.move[2] + ')');
    await type('turn', 1, 4); s = await state();
    check(Math.abs(s.edit.turn[1] - 4) < 0.01, 'Pitch typed 4 degrees: turned');
    await press('#undo'); s = await state();
    check(Math.abs(s.edit.turn[1]) < 0.01 && Math.abs(s.edit.move[2] - z0 - 0.02) < 0.002, 'Undo: the turn undone, the move kept');
    await type('pos', 2, `(+document.querySelectorAll('[data-pv="pos"] input')[2].value + 0.03).toFixed(3)`); s = await state();
    const floated = s.gap;
    await press('#paneSnap'); s = await state();
    check(floated > 0.01 && s.gap < 0.001 && /cm/.test(s.line), 'floated (gap ' + (floated * 100).toFixed(1) + ' cm), Snap: gap ' + (s.gap * 1000).toFixed(1) + ' mm, the line "' + s.line + '"');
    await shot('wagon-snapped');
    const kept = JSON.stringify(s.stored), editKept = s.edit;
    await page('Page.navigate', { url: `http://localhost:${port}/delivery/modeleditor.html?car=wagon&view=34&tab=part&pane=windscreen&part=${encodeURIComponent(s.sel)}` });
    if (!await ready()) throw new Error('the editor did not reopen');
    await sleep(500); s = await state();
    check(JSON.stringify(s.stored) === kept && s.edit && s.edit.move.every((v, i) => Math.abs(v - editKept.move[i]) < 1e-6) && s.gap < 0.001, 'reloaded: the patch kept in this browser, the windscreen where it was left (gap ' + ((s.gap ?? 1) * 1000).toFixed(1) + ' mm)');
    await evaluate('localStorage.removeItem("delivery.modelpatches")');
  } catch (e) { check(false, e.stack || e.message); } finally { try { child?.kill(); } catch { /* */ } await server?.close(); }
}
console.log((failures ? failures + ' FAILED' : 'all ok') + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
process.exit(failures ? 1 : 0);
