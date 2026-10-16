// A check of THE WINDOW CORNERS in the model editor (CHECKLIST 336, the owner: "Genuinely don't know which corner"): a cabinGlass
// window's corners in the Part tab's side view are numbered and named (render/panecorners.js), picked with a finger-sized reach, nudged,
// reset one at a time, read out live, with Mirror still storing one edit for both flanks, and the edit still the patch's plain `glass`
// table (what scripts/bake-glass.mjs bakes into the build: not a change to the built mesh).
//  HEADLESS: every cabinGlass car's side windows named (the four corner names each once on a window of four or more corners; front ones
//    nearer the nose than the rear ones, top ones above the bottom ones), +z the nose (the windscreen ahead of the rear window: the side
//    view's "nose to the right"); a nudge moves by its step (a screen's foot / top along its pillar, on it); a nudged corner built as the
//    game builds it changes both door windows, mirrored; render/panecorners.js outside the replay fingerprint.
//  IN HEADLESS CHROMIUM (skipped with a note if none is found), a phone emulated (390x844, touch, DPR 3), the Touring Car's door window:
//    the handles numbered 1..n and named, a tap 30 px from every corner picks none, a tap 17 px off corner 2 (off its dot) picks it (orange,
//    its row lit, the readout naming it), the nudge buttons and step buttons 44 px or more, ▲ stopped by the roof line (said, nothing stored),
//    ▼ 1 cm lowers it in the patch's table under 'door window' (both flanks), Reset corner puts it back at its automatic place, Undo undoes that, a touch drag of corner 3 reads out
//    live and commits on release; the drawing runs as the camera shows the flank (Left view: nose to the left, ◀ toward the front;
//    Right view: nose to the right); Mirror off: a nudge stored under 'door window L'; the windscreen's top nudged down stays on its pillar.
//   node scripts/.window-corners-check.mjs [--browser=<path>] [--shots=<dir>]
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startModels } from './modelpatch-load.mjs';
import { cornerNames, nudged, CORNER_NAMES, NUDGE_STEPS } from '../src/delivery/render/panecorners.js';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const SHOTS = opt('shots', null);
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const onLine = ([a, b], q) => Math.abs((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);

// ---- the source: the editor uses the helper; the helper is not a logic file
{
  const ed = readFileSync(join(ROOT, 'src/delivery/modeleditor.js'), 'utf8');
  check(/from '\.\/render\/panecorners\.js'/.test(ed) && /cornerNames\(now\)/.test(ed) && /const GHIT = (\d+)/.test(ed) && +ed.match(/const GHIT = (\d+)/)[1] >= 22,
    'modeleditor.js names the corners with render/panecorners.js and picks within GHIT >= 22 CSS px (a 44 px target)');
  const { logicFiles } = await import('../vite.config.js');
  check(!logicFiles().some(f => /panecorners/.test(f)), 'render/panecorners.js is not among the replay fingerprint\'s logic files (vite.config.js logicFiles)');
}
// ---- the helper alone
{
  check(cornerNames([[1, 0], [1, 1], [0, 1], [0, 0]]).join() === 'front-bottom,front-top,rear-top,rear-bottom', 'a square named as drawn (nose +z to the right): front-bottom, front-top, rear-top, rear-bottom');
  check(cornerNames([[2, 1], [0, 1], [0, 0], [2.4, 0]]).join() === 'front-top,rear-top,rear-bottom,front-bottom', 'a long low pane with a raked front: each name once');
  const five = cornerNames([[1, 0], [1, 1], [0.5, 1.3], [0, 1], [0, 0]]);
  check(new Set(five).size === 5 && CORNER_NAMES.every(n => five.includes(n)) && five[2] === 'top', 'five corners: the four names and "top" for the one in the roof line (' + five.join(', ') + ')');
  const tri = cornerNames([[1, 0], [0, 1], [0, 0]]);
  check(new Set(tri).size === 3 && tri.every(n => CORNER_NAMES.includes(n)), 'a triangle: three of the four names (' + tri.join(', ') + ')');
  check(nudged([0.1, 0.2], 'front', 0.01).join() === '0.11,0.2' && nudged([0.1, 0.2], 'rear', 0.05).join() === '0.05,0.2' && nudged([0.1, 0.2], 'up', 0.005).join() === '0.1,0.205' && nudged([0.1, 0.2], 'down', 0.01).join() === '0.1,0.19',
    'a nudge moves by its step: front +z, rear -z, up +y, down -y');
  const edge = [[1.2, 0.9], [0.6, 1.3]], up = nudged([0.9, 1.1], 'up', 0.01, edge), dn = nudged([0.9, 1.1], 'down', 0.05, edge);
  check(onLine(edge, up) < 1e-3 && onLine(edge, dn) < 1e-3 && up[1] > 1.1 && dn[1] < 1.1 && near(Math.hypot(up[0] - 0.9, up[1] - 1.1), 0.01, 1.5e-3), 'a screen\'s corner nudged slides along its pillar (on the line, up the slope for up, by the step)');
  check(NUDGE_STEPS.join() === '0.005,0.01,0.05', 'the nudge steps: 5 mm, 1 cm, 5 cm');
}
// ---- every cabinGlass car's windows, built as the game builds them
const { load, close } = await startModels();
try {
  const { buildInspectModel } = await load('render/inspectmodel.js');
  const K = await load('render/ideaModelsDkit.js');
  const apply = await load('render/modelpatchapply.js');
  const { carById, FEATURE_ROSTER } = await load('cars.js');
  const { IDEA_CARS: IDEAS } = await load('ideas.js');
  apply.setModelPatching(false);
  const glassOf = (m) => { let g = null; m.traverse(n => { if (!g && n.isMesh && n.geometry?.userData?.panes) g = n; }); return g; };
  let cars = 0, panes = 0;
  const bad = [];
  for (const idea of [...IDEAS, ...FEATURE_ROSTER]) {
    let m; try { m = buildInspectModel(idea, false); } catch { continue; }
    const g = m.userData.block ? null : glassOf(m);
    if (!g) continue;
    cars++;
    const ps = g.geometry.userData.panes, ws = ps.find(q => q.name === 'windscreen'), rw = ps.find(q => q.kind === 'screen' && q !== ws);
    if (ws?.now && rw?.now && !(ws.now.foot[0] > rw.now.foot[0])) bad.push(idea.id + ': the windscreen not ahead of the rear window (+z not the nose)');
    for (const q of ps.filter(x => x.kind === 'side' && x.now)) {
      panes++;
      const names = cornerNames(q.now), at = (n) => q.now[names.indexOf(n)];
      const want = Math.min(4, q.now.length);
      if (new Set(names).size !== names.length || CORNER_NAMES.filter(n => names.includes(n)).length !== want) { bad.push(idea.id + ' ' + q.name + ': names ' + names.join(', ')); continue; }
      if (q.now.length >= 4 && !(at('front-top')[0] > at('rear-top')[0] && at('front-bottom')[0] > at('rear-bottom')[0] && at('front-top')[1] > at('front-bottom')[1] && at('rear-top')[1] > at('rear-bottom')[1]))
        bad.push(idea.id + ' ' + q.name + ': ' + names.map((n, i) => n + ' ' + q.now[i].map(v => v.toFixed(2)).join('/')).join(', '));
    }
  }
  check(cars >= 20 && panes >= 60 && !bad.length, cars + ' cabinGlass cars, ' + panes + ' side windows: every corner named once as drawn (front ahead of rear, top above bottom), the windscreen ahead of the rear window' + (bad.length ? '\n          ' + bad.slice(0, 8).join('\n          ') : ''));
  // a nudged corner, stored as the editor stores it with Mirror on ('door window'), built as the game builds a patched car
  const g0 = glassOf(buildInspectModel(carById('touringcar'), false)), door = g0.geometry.userData.panes.find(q => q.name === 'door window L');
  const names = cornerNames(door.now), i = names.indexOf('front-top'), pts = door.now.map(q => q.slice());
  pts[i] = nudged(pts[i], 'down', 0.05);
  const m = K.withGlassEdits({ 'door window': pts }, () => buildInspectModel(carById('touringcar'), false));
  const ps = glassOf(m).geometry.userData.panes, L = ps.find(q => q.name === 'door window L'), R = ps.find(q => q.name === 'door window R');
  check(L.edited && R.edited && L.now.length === pts.length && L.now.some(q => near(q[1], pts[i][1], 1e-3)) && R.now.every((q, j) => near(q[0], L.now[j][0]) && near(q[1], L.now[j][1])),
    'the Touring Car\'s front-top door corner nudged 5 cm down, stored as "door window": both flanks built edited, the same outline (Mirror)');
} catch (e) { check(false, e.stack || e.message); } finally { await close(); }

// ---- the editor itself, in a browser, as on a phone
const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-wincorners-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (msg) => { clearTimeout(timer); msg.error ? fail(new Error(method + ': ' + msg.error.message)) : done(msg.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5243, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
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
    const shot = async (name) => {
      if (!SHOTS) return;
      mkdirSync(SHOTS, { recursive: true });
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
    };
    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 });
    const open = async (q, view = 'left') => {
      await page('Page.navigate', { url: `http://localhost:${port}/delivery/modeleditor.html?car=touringcar&view=${view}&tab=part${q}` });
      for (let k = 0; k < 240; k++) { await sleep(250); try { if (await evaluate('!!(window.__modelEditor && document.querySelector("#glassSvg [data-gp]"))', 5000)) return true; } catch { /* (loading) */ } }
      return false;
    };
    const touch = async (type, x, y) => page('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 8, radiusY: 8, force: 1, id: 1 }] });
    const tap = async (x, y) => { await touch('touchStart', x, y); await sleep(40); await touch('touchEnd'); await sleep(250); };
    // (the page's state: the handles' centres on the screen, the picked one, the readout, the rows, the stored edit, the pane's own corners)
    const STATE = `(() => {
      const S = window.__modelEditor, svg = document.getElementById('glassSvg'), sr = svg.getBoundingClientRect();
      const hs = [...svg.querySelectorAll('[data-gp]')].map(g => { const r = g.querySelector('circle').getBoundingClientRect(); return { i: +g.dataset.gp, x: r.left + r.width / 2, y: r.top + r.height / 2, on: g.classList.contains('on'), n: g.querySelectorAll('text')[0].textContent, name: g.querySelectorAll('text')[1].textContent }; }).sort((a, b) => a.i - b.i);
      const node = S.nodes.get(S.sel), pane = node.geometry.userData.panes.find(q => q.name === S.pane);
      const btn = (sel) => [...document.querySelectorAll(sel)].map(b => { const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left + r.width / 2, y: r.top + r.height / 2, d: b.disabled, t: b.dataset.gn || b.dataset.gstep || b.id }; });
      return { hs, sr: { x: sr.left, y: sr.top, w: sr.width, h: sr.height }, read: document.getElementById('gRead').textContent, rows: [...document.querySelectorAll('[data-grow]')].map(r => ({ t: r.firstElementChild.textContent, on: r.classList.contains('on') })),
        glass: JSON.parse(JSON.stringify(S.patch.glass || null)), pane: S.pane, auto: pane.auto, now: pane.now, edge: pane.edge || null, at: S.at, mirror: S.mirror,
        head: document.querySelector('#gHead .small')?.textContent || '', nudges: btn('[data-gn]'), steps: btn('[data-gstep]'), corner: btn('#gCorner')[0], undo: btn('#gUndo')[0] };
    })()`;
    const state = () => evaluate(STATE);
    const press = async (b) => { await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(b)}); el.scrollIntoView({ block: 'center' }); })()`); await sleep(150); const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(b)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`); await tap(r[0], r[1]); await sleep(400); };
    const toSvg = async () => { await evaluate('document.getElementById("glassSvg").scrollIntoView({ block: "start" })'); await sleep(200); };

    if (!await open('&part=1&pane=door%20window%20L')) throw new Error('the editor did not open the door window');
    await sleep(500);
    let s = await state();
    check(s.hs.length === 4 && s.hs.map(h => h.n).join() === '1,2,3,4' && CORNER_NAMES.every(n => s.hs.some(h => h.name === n)) && s.rows.map(r => r.t).join() === s.hs.map(h => h.n + ' ' + h.name).join(),
      'the door window\'s handles numbered 1..4 and named (' + s.hs.map(h => h.n + ' ' + h.name).join(', ') + '), the rows the same');
    check(s.hs.every(h => h.x >= s.sr.x && h.x <= s.sr.x + s.sr.w && h.y >= s.sr.y && h.y <= s.sr.y + s.sr.h) && s.sr.y < 844 && s.sr.y + s.sr.h <= 844,
      'opened on a phone, the side view scrolled into sight (' + Math.round(s.sr.y) + '..' + Math.round(s.sr.y + s.sr.h) + ' of 844) with every corner in it');
    check(!s.hs.some(h => h.on) && s.nudges.every(b => b.d) && /Tap a corner/.test(s.read), 'nothing picked at first: the nudges off, the readout asks for a tap');
    await shot('phone-open');
    // the drawing as the camera shows the flank: the Left view's nose to the left, the arrows with it
    const side = (st) => { const at = (n) => st.hs.find(h => h.name === n); return Math.sign(at('front-bottom').x - at('rear-bottom').x); };
    check(side(s) < 0 && /nose to the left/.test(s.head) && s.nudges.map(b => b.t).join() === 'front,up,down,rear' && s.nudges[0].x < s.nudges[3].x,
      'the Left view: the window drawn nose to the left as the car is, "' + s.head + '", ◀ toward the front, ▶ toward the rear');
    // a tap far from every corner picks none
    let far = null;
    for (let y = s.sr.y + 10; !far && y < s.sr.y + s.sr.h - 10; y += 6) for (let x = s.sr.x + 10; !far && x < s.sr.x + s.sr.w - 10; x += 6) if (s.hs.every(h => Math.hypot(h.x - x, h.y - y) > 30)) far = [x, y];
    await tap(...far); s = await state();
    check(!s.hs.some(h => h.on), 'a tap 30 px or more from every corner picks none');
    // a tap 17 px off corner 2's centre (off its dot, which is 11 px): picks it
    const h2 = s.hs[1], off = s.hs.every((h, j) => j === 1 || Math.hypot(h.x - (h2.x + 17), h.y - h2.y) > Math.hypot(17, 0)) ? [h2.x + 17, h2.y] : [h2.x, h2.y - 17];
    await tap(...off); s = await state();
    check(s.hs[1].on && s.hs.filter(h => h.on).length === 1 && s.rows[1].on && s.read.startsWith('2 ' + s.hs[1].name) && s.nudges.every(b => !b.d), 'a tap 17 px off corner 2 picks it: orange, its row lit, the readout "' + s.read + '"');
    check(s.nudges.length === 4 && s.nudges.every(b => b.w >= 44 && b.h >= 44) && s.steps.length === 3 && s.steps.every(b => b.h >= 44), 'four nudge buttons and three steps, 44 px or more (' + s.nudges.map(b => Math.round(b.w) + 'x' + Math.round(b.h)).join(' ') + ')');
    await shot('phone-picked');
    const y0 = s.now[1][1];
    await press('[data-gn="up"]'); s = await state();
    const said = await evaluate('document.getElementById("status")?.textContent || ""');
    check(!s.glass && /cabin outline stops it/.test(said) && /cabin outline stops it/.test(s.read), '▲ on corner 2, already in the roof line: nothing stored, the status and the readout say the cabin outline stops it ("' + s.read + '")');
    await press('[data-gn="down"]'); s = await state();
    const stored = s.glass?.['door window'];
    check(Array.isArray(stored) && near(stored[1][1], Math.round((y0 - 0.01) * 1000) / 1000, 1e-6) && !s.glass['door window L'] && s.hs[1].on && s.read.includes((y0 - 0.01).toFixed(3)),
      '▼ (1 cm) lowers corner 2 by 1 cm, stored once for both flanks as "door window" (Mirror on), still picked, read out (' + (stored ? stored[1].join(', ') : 'nothing stored') + ')');
    await press('#gCorner'); s = await state();
    check(near(s.glass?.['door window']?.[1][1], s.auto[1][1], 1e-3) && near(s.glass['door window'][1][0], s.auto[1][0], 1e-3), 'Reset corner puts corner 2 back at its automatic place');
    await press('#gUndo'); s = await state();
    check(near(s.glass?.['door window']?.[1][1], Math.round((y0 - 0.01) * 1000) / 1000, 1e-6), 'Undo undoes the reset (corner 2 lowered again)');
    // a touch drag of corner 3: read out live, committed on release
    await toSvg(); s = await state();
    const h3 = s.hs[2], z3 = s.now[2][0];
    await touch('touchStart', h3.x, h3.y); await sleep(60);
    const rearward = side(s) < 0 ? 1 : -1; // (the rear is to the right with the nose to the left)
    for (let k = 1; k <= 4; k++) { await touch('touchMove', h3.x + rearward * 5 * k, h3.y + 5 * k); await sleep(60); } // (down and toward the rear: inside the cabin)
    const mid = await evaluate('[document.getElementById("gRead").textContent, (window.__modelEditor.patch.glass || {})["door window"]?.[2]?.[0]]');
    await touch('touchEnd'); await sleep(500); s = await state();
    check(mid[0].startsWith('3 ') && !mid[0].includes(z3.toFixed(3)) && near(mid[1], z3, 1e-3), 'mid-drag the readout follows corner 3 ("' + mid[0] + '") before anything is committed');
    check(s.glass['door window'][2][0] < z3 - 0.005 && s.hs[2].on, 'released: corner 3 moved down and toward the rear (z ' + z3.toFixed(3) + ' -> ' + s.glass['door window'][2][0] + ') and stays picked');
    // Mirror off: this flank only
    await press('#mirrorMode'); await toSvg(); s = await state();
    if (!s.hs[0].on) { await tap(s.hs[0].x + 15, s.hs[0].y); s = await state(); }
    await press('[data-gn="rear"]'); s = await state();
    check(!s.mirror && Array.isArray(s.glass?.['door window L']) && s.hs[0].on, 'Mirror off: a nudge of corner 1 is stored for this flank only, as "door window L"');
    await press('#mirrorMode');
    // the Right view: the other flank drawn nose to the right, ◀ toward the rear
    if (!await open('&part=1&pane=door%20window%20R', 'right')) throw new Error('the editor did not open the right door window');
    await sleep(500); s = await state();
    check(side(s) > 0 && /nose to the right/.test(s.head) && s.nudges.map(b => b.t).join() === 'rear,up,down,front', 'the Right view: the window drawn nose to the right, "' + s.head + '", ◀ toward the rear');
    await shot('phone-right');
    // the windscreen: its top nudged down stays on its pillar
    if (!await open('&part=1&pane=windscreen&corner=2')) throw new Error('the editor did not open the windscreen');
    await sleep(500); s = await state();
    check(s.hs.map(h => h.name).join() === 'foot,top' && s.hs[1].on && s.nudges.length === 2, 'the windscreen: two handles, foot and top, ?corner=2 picks the top, two nudges (up and down the pillar)');
    const top0 = s.now.top;
    await press('[data-gn="down"]'); s = await state();
    const t = s.glass?.windscreen?.top;
    check(Array.isArray(t) && t[1] < top0[1] && onLine(s.edge, t) < 2e-3, 'the windscreen\'s top nudged down: lower, still on its pillar (' + (t ? t.join(', ') : 'nothing stored') + ')');
    await shot('phone-windscreen');
  } catch (e) { check(false, 'the browser part: ' + (e.stack || e.message)); } finally {
    try { socket?.close(); } catch { /* (gone) */ }
    try { child?.kill(); } catch { /* (gone) */ }
    await server?.close();
    await sleep(300);
    try { rmSync(own, { recursive: true, force: true }); } catch { /* (the browser still letting go) */ }
  }
}
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
