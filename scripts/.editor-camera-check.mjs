// A check of THE MODEL EDITOR'S CAMERA in edit mode (the owner, 16-Oct, on a phone / Mi Pad: "Fix the camera controls on the editor when
// edit mode is selected"; CHECKLIST 430). In headless Chromium over DevTools (skipped with a note if no browser is found), the editor
// (delivery/modeleditor.html, src/delivery/modeleditor.js) with a part selected and its gizmo up, as a touch phone (390x844, DPR 3) and a
// touch tablet (800x1280, DPR 2), and with a mouse (1280x800). For each tool (Move, Rotate, Scale), real input events (Input.dispatchTouchEvent /
// Input.dispatchMouseEvent: the page's own pointer events, as a finger makes them):
//   - one finger (or the left button) dragged on EMPTY view turns the camera round the car (its azimuth moves), the part stays where it was
//     and stays selected;
//   - a drag that starts ON THE SELECTED PART (not on a handle) turns the camera too (the gizmo's invisible pickers do not swallow it);
//   - two fingers moved together (or the right button) pan (the camera's target moves), spread apart (or the wheel) zoom (its distance shrinks);
//   - one finger on a GIZMO HANDLE edits the part (it moves / turns / grows) and the camera does NOT move; let go, the camera works again
//     (orbit enabled, the next empty drag turns it); a second finger put down during a handle drag neither moves the camera nor ends the edit;
//   - the view buttons (Front, Left, Top) put the camera there with a part selected, and a drag after them is not undone (no snap back);
//   - Fit puts the camera's target on the selected part's centre (a double tap on a part does the same), Reset puts the whole car back in
//     the 3/4 view;
//   - nothing scrolls or zooms the page behind the view (scroll 0, visual viewport scale 1), the canvas's touch-action is none, and the
//     view is not covered by the toggles on a phone (they fold under "More").
// The camera is read from window.__modelEditor.three (camera, orbit).
//   node scripts/.editor-camera-check.mjs [--browser=<path>] [--shots=<dir>] [--only=phone|tablet|mouse] [--report]
// --shots saves a PNG before and after each drag (<size>-<tool>-<step>.png).
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const SHOTS = opt('shots', null), ONLY = opt('only', null), REPORT = !!opt('report', false);
let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- the source
const js = readFileSync(join(ROOT, 'src/delivery/modeleditor.js'), 'utf8'), css = readFileSync(join(ROOT, 'src/delivery/modeleditor.css'), 'utf8');
const html = readFileSync(join(ROOT, 'delivery/modeleditor.html'), 'utf8');
check(/#game \{[^}]*touch-action: none/.test(css) && /#viewBox \{[^}]*touch-action: none/.test(css), 'modeleditor.css: the view and its canvas touch-action none (no page scroll or zoom from a finger on them)');
check(/id="camFit"/.test(html) && /id="camReset"/.test(html), 'modeleditor.html: Fit and Reset buttons in the view');
check(/three: \{[^}]*orbit/.test(js), 'modeleditor.js: the orbit controls handed to the checks (__modelEditor.three.orbit)');

const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);

// in the page: the camera (target, distance, azimuth, polar angle) and the selected part's transform
const CAM = `(() => { const M = window.__modelEditor, { camera, orbit } = M.three, n = M.sel && M.nodes.get(M.sel);
  return { pos: camera.position.toArray(), target: orbit.target.toArray(), dist: camera.position.distanceTo(orbit.target), az: orbit.getAzimuthalAngle(), pol: orbit.getPolarAngle(),
    enabled: orbit.enabled, dragging: M.three.gizmo.dragging, sel: M.sel, mode: M.three.gizmo.getMode(), attached: !!M.three.gizmo.object,
    part: n ? [...n.position.toArray(), ...n.rotation.toArray().slice(0, 3), ...n.scale.toArray()] : null, ops: M.patch.ops.length,
    scroll: [window.scrollX, window.scrollY, document.scrollingElement.scrollTop, document.body.scrollTop], scale: window.visualViewport ? visualViewport.scale : 1 }; })()`;
// in the page: the points of the view on screen: EMPTY ones (the canvas on top, no gizmo handle, no part under them), ones on the
// SELECTED PART (no handle), and each gizmo handle's (by axis); a 5 px grid
const POINTS = `(() => { const M = window.__modelEditor, { camera, gizmo, THREE } = M.three, cv = document.getElementById('game'), r = cv.getBoundingClientRect();
  const ray = new THREE.Raycaster(), v = new THREE.Vector2(), sel = M.sel && M.nodes.get(M.sel);
  const out = { empty: [], onPart: [], handles: {}, rect: [r.left, r.top, r.width, r.height], all: 0, top: 0 };
  gizmo.updateMatrixWorld(true);
  for (let y = r.top + 6; y < r.bottom - 6; y += 5) for (let x = r.left + 6; x < r.right - 6; x += 5) {
    out.all++;
    if (document.elementFromPoint(x, y) !== cv) continue;
    out.top++;
    // (16 px clear of any button all round: Chromium moves a finger's touch onto a button that near, as a phone does)
    if ([[-16, -16], [16, -16], [-16, 16], [16, 16], [0, -16], [0, 16], [-16, 0], [16, 0]].some(([dx, dy]) => document.elementFromPoint(x + dx, y + dy) !== cv)) continue;
    v.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1);
    gizmo.pointerHover({ x: v.x, y: v.y, button: -1 });
    if (gizmo.axis) { (out.handles[gizmo.axis] ||= []).push([x, y]); continue; }
    ray.setFromCamera(v, camera); ray.layers.set(0);
    const h = ray.intersectObject(M.model, true).find(q => q.object.isMesh && q.object.layers.test(ray.layers));
    if (!h) out.empty.push([x, y]);
    else if (sel) { let on = false; for (let p = h.object; p; p = p.parent) if (p === sel) on = true; if (on) out.onPart.push([x, y]); }
  }
  gizmo.axis = null;
  return out; })()`;

const near = (a, b, tol) => a.every((x, i) => Math.abs(x - b[i]) <= tol);
const angle = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-editorcam-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5243, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
    await server.listen();
    const port = server.config.server.port;
    const profile = join(own, 'profile');
    mkdirSync(profile);
    child = spawn(browser, [...(process.platform === 'linux' && process.getuid?.() === 0 ? ['--no-sandbox'] : []), '--headless=new', '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-extensions', '--disable-component-update',
      '--disable-background-networking', '--user-data-dir=' + profile, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
    child.on('error', () => {});
    let where = null;
    for (let i = 0; i < 300 && !where && child.exitCode === null; i++) {
      await sleep(100);
      try { const lines = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n'); if (lines[1]?.trim()) where = `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`; } catch { /* (not up yet) */ }
    }
    if (!where) throw new Error('the browser did not start: ' + browser);
    socket = new WebSocket(where);
    await new Promise((done, fail) => { socket.addEventListener('open', done); socket.addEventListener('error', () => fail(new Error('no DevTools connection'))); });
    socket.addEventListener('message', (m) => { const message = JSON.parse(m.data); if (message.id) { const answer = waiting.get(message.id); waiting.delete(message.id); answer?.(message); } });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params, timeout) => send(method, params, sessionId, timeout);
    const evaluate = async (expression, timeout = 120000) => {
      const r = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);
      if (r.exceptionDetails) throw new Error('in the page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    const frames = (n = 2) => evaluate(`new Promise(r => { let k = ${n}; const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })`);
    // the camera at rest: damping run out (the loop's orbit.update eases a turn for some frames after the finger lifts)
    // (what the damping still has to turn, turned at once: the sum is the same, and 40 frames of a software GL on a loaded machine are slow)
    const settle = async () => { await frames(3); return evaluate(`(() => { const o = window.__modelEditor.three.orbit, d = o.enableDamping; o.enableDamping = false; o.update(); o.enableDamping = d; return ${CAM}; })()`); };
    const shot = async (name) => {
      if (!SHOTS) return;
      mkdirSync(SHOTS, { recursive: true });
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
    };
    // ---- input: fingers (touchStart / touchMove / touchEnd: the page sees pointer and touch events) and the mouse
    const touch = (type, pts) => page('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })) });
    const fingers = async (from, to, steps = 10) => { // (each finger from its start to its end, together)
      await touch('touchStart', from);
      for (let s = 1; s <= steps; s++) { await touch('touchMove', from.map(([x, y], i) => [x + (to[i][0] - x) * s / steps, y + (to[i][1] - y) * s / steps])); await frames(1); }
      await touch('touchEnd', []);
      await frames(2);
    };
    const mouse = async (button, from, to, steps = 10) => {
      const buttons = button === 'left' ? 1 : button === 'right' ? 2 : 4;
      await page('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from[0], y: from[1] });
      await page('Input.dispatchMouseEvent', { type: 'mousePressed', x: from[0], y: from[1], button, buttons, clickCount: 1 });
      for (let s = 1; s <= steps; s++) { await page('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from[0] + (to[0] - from[0]) * s / steps, y: from[1] + (to[1] - from[1]) * s / steps, button, buttons }); await frames(1); }
      await page('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to[0], y: to[1], button, buttons: 0, clickCount: 1 });
      await frames(2);
    };
    const tapAt = async ([x, y], touchy) => {
      if (touchy) { await touch('touchStart', [[x, y]]); await touch('touchEnd', []); }
      else { await page('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }); await page('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }); }
      await frames(2);
    };
    const click = async (sel, touchy) => { // (a tap on a button, where it is on screen)
      const b = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
      if (!b) return false;
      await tapAt(b, touchy);
      await frames(3);
      return true;
    };

    // the empty point to drag from: the farthest from every handle and the car, with room to move 60 px either way
    const pickEmpty = (pts) => {
      const [l, t, w, h] = pts.rect, handles = Object.values(pts.handles).flat();
      const room = pts.empty.filter(([x, y]) => x > l + 70 && x < l + w - 70 && y > t + 20 && y < t + h - 20);
      const score = ([x, y]) => Math.min(...handles.map(([a, b]) => Math.hypot(a - x, b - y)), 999);
      return room.sort((a, b) => score(b) - score(a))[0] || pts.empty[0];
    };
    const centreOf = (list) => { const c = list.reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]).map(v => v / list.length); return list.slice().sort((a, b) => Math.hypot(a[0] - c[0], a[1] - c[1]) - Math.hypot(b[0] - c[0], b[1] - c[1]))[0]; };
    // the handle to drag for each tool: an arrow (Move), a ring (Rotate), a box (Scale); the point on it nearest its middle
    const HANDLE = { translate: ['X', 'Z', 'Y'], rotate: ['Y', 'X', 'Z'], scale: ['X', 'Z', 'Y'] };

    const SETUPS = [
      ['phone', 390, 844, 3, true],
      ['tablet', 800, 1280, 2, true],
      ['mouse', 1280, 800, 1, false],
    ].filter(([n]) => !ONLY || String(ONLY).split(',').includes(n));
    for (const [size, w, h, dpr, touchy] of SETUPS) {
      await page('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: touchy, screenWidth: w, screenHeight: h });
      await page('Emulation.setTouchEmulationEnabled', touchy ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
      for (const tool of ['translate', 'rotate', 'scale']) {
        const tag = `${size} ${tool}`;
        try { await evaluate(`localStorage.clear()`); } catch { /* (about:blank) */ }
        await page('Page.navigate', { url: `http://localhost:${port}/delivery/modeleditor.html?car=commuter` });
        await evaluate(`new Promise((r, f) => { const t0 = Date.now(); const k = () => window.__modelEditor?.three ? r() : Date.now() - t0 > 90000 ? f(new Error('the editor did not start')) : setTimeout(k, 100); k(); })`, 100000);
        // a part of a good size picked (a door or a wing: the body is the whole car), its gizmo up in this tool
        const part = await evaluate(`(() => { const M = window.__modelEditor, { THREE } = M.three, size = new THREE.Vector3();
          const c = M.parts.filter(p => M.nodes.get(p.id)?.isMesh && !M.locked.has(p.id)).map(p => ({ p, s: new THREE.Box3().setFromObject(M.nodes.get(p.id)).getSize(size).length() })).sort((a, b) => b.s - a.s);
          const pick = c.find(q => q.s < 1.6 && q.s > 0.5) || c[1] || c[0]; M.api.select(pick.p.id); return pick.p.id; })()`);
        await click(`[data-mode="${tool}"]`, touchy);
        await frames(4);
        let cam = await settle();
        check(cam.sel === part && cam.attached && cam.mode === tool && cam.enabled, `${tag}: part ${part} selected, the gizmo up in ${tool}, the camera on`);
        let pts = await evaluate(POINTS);
        if (REPORT) console.log(`    ${tag}: ${pts.empty.length} empty points, ${pts.onPart.length} on the part, handles ${Object.entries(pts.handles).map(([k, v]) => k + ' ' + v.length).join(', ')}, view ${pts.rect.map(Math.round).join(',')}`);
        check(pts.top / pts.all > 0.7 && pts.empty.length > 200, `${tag}: the toolbars leave most of the view to drag on (${Math.round(100 * pts.top / pts.all)} % of it reaches the canvas)`);
        const empty = pickEmpty(pts);
        await shot(`${size}-${tool}-0-start`);

        // 1. one finger / the left button on empty view: the camera turns, the part stays, still selected
        const before = cam;
        if (touchy) await fingers([empty], [[empty[0] + 60, empty[1] + 10]]); else await mouse('left', empty, [empty[0] + 60, empty[1] + 10]);
        cam = await settle();
        check(angle(cam.az, before.az) > 0.15 && near(cam.part, before.part, 1e-6) && cam.sel === part && cam.ops === before.ops,
          `${tag}: ${touchy ? 'one finger' : 'left drag'} on empty view turns the camera (azimuth ${before.az.toFixed(2)} -> ${cam.az.toFixed(2)}), the part stays, still selected`);
        await shot(`${size}-${tool}-1-orbited`);

        // 2. a drag that starts on the selected part, off its handles: the camera turns
        pts = await evaluate(POINTS);
        const on = pts.onPart.length ? centreOf(pts.onPart) : null;
        if (on) {
          const b2 = cam;
          if (touchy) await fingers([on], [[on[0] - 50, on[1]]]); else await mouse('left', on, [on[0] - 50, on[1]]);
          cam = await settle();
          check(angle(cam.az, b2.az) > 0.12 && near(cam.part, b2.part, 1e-6) && cam.enabled, `${tag}: a drag starting on the part (off its handles) turns the camera (azimuth ${b2.az.toFixed(2)} -> ${cam.az.toFixed(2)}), the part stays`);
        } else check(true, `${tag}: (the part is all handles on screen: no drag off them to try)`);

        // 3. pan: two fingers together / the right button
        pts = await evaluate(POINTS);
        const e2 = pickEmpty(pts);
        let b3 = cam;
        if (touchy) await fingers([[e2[0] - 20, e2[1]], [e2[0] + 20, e2[1]]], [[e2[0] - 20, e2[1] + 50], [e2[0] + 20, e2[1] + 50]]);
        else await mouse('right', e2, [e2[0], e2[1] + 50]);
        cam = await settle();
        check(Math.hypot(...cam.target.map((v, i) => v - b3.target[i])) > 0.05 && near(cam.part, b3.part, 1e-6), `${tag}: ${touchy ? 'two fingers moved together' : 'right drag'} pan the camera (its target moved ${Math.hypot(...cam.target.map((v, i) => v - b3.target[i])).toFixed(2)} m), the part stays`);

        // 4. zoom: two fingers spread / the wheel
        b3 = cam;
        if (touchy) await fingers([[e2[0] - 15, e2[1]], [e2[0] + 15, e2[1]]], [[e2[0] - 60, e2[1]], [e2[0] + 60, e2[1]]]);
        else { await page('Input.dispatchMouseEvent', { type: 'mouseWheel', x: e2[0], y: e2[1], deltaX: 0, deltaY: -300 }); await frames(2); }
        cam = await settle();
        check(cam.dist < b3.dist * 0.9 && near(cam.part, b3.part, 1e-6), `${tag}: ${touchy ? 'a pinch (spread)' : 'the wheel'} zooms in (distance ${b3.dist.toFixed(2)} -> ${cam.dist.toFixed(2)} m), the part stays`);

        // 5. a handle dragged: the part changes, the camera does not; let go, the camera works again (the 3/4 view first: the part on screen)
        await click('[data-view="34"]', touchy);
        cam = await settle();
        pts = await evaluate(POINTS);
        const axis = HANDLE[tool].find(a => pts.handles[a]?.length >= 3);
        if (!axis) check(false, `${tag}: no ${HANDLE[tool].join('/')} handle found on screen (${Object.keys(pts.handles).join(', ') || 'none'})`);
        else {
          const at = centreOf(pts.handles[axis]), b5 = cam;
          await shot(`${size}-${tool}-2-before-handle`);
          // (along the screen's diagonal: an arrow or a ring answers to most directions)
          if (touchy) {
            await touch('touchStart', [at]);
            for (let s = 1; s <= 8; s++) { await touch('touchMove', [[at[0] + 4 * s, at[1] - 4 * s]]); await frames(1); }
            // a second finger down mid-drag (a palm, a thumb): neither the camera nor the end of the edit
            const mid = await evaluate(CAM);
            await touch('touchMove', [[at[0] + 32, at[1] - 32], [e2[0], e2[1]]]);
            await frames(1);
            await touch('touchMove', [[at[0] + 32, at[1] - 32], [e2[0] + 40, e2[1] + 30]]);
            await frames(2);
            const two = await evaluate(CAM);
            check(two.dragging && near(two.pos, mid.pos, 1e-4) && near(two.part, mid.part, 1e-6), `${tag}: a second finger down and moved during a handle drag: the edit goes on (dragging ${two.dragging}), the part does not jump to it, the camera stays`);
            await touch('touchMove', [[at[0] + 40, at[1] - 40]]);
            await touch('touchEnd', []);
            await frames(2);
          } else await mouse('left', at, [at[0] + 40, at[1] - 40], 8);
          cam = await settle();
          check(!near(cam.part, b5.part, 1e-4) && cam.ops > b5.ops, `${tag}: the ${axis} handle dragged edits the part (${b5.part.map(v => v.toFixed(3)).join(',')} -> ${cam.part.map(v => v.toFixed(3)).join(',')}; edits ${b5.ops} -> ${cam.ops})`);
          check(near(cam.pos, b5.pos, 1e-4) && near(cam.target, b5.target, 1e-4), `${tag}: the camera did not move during the handle drag`);
          check(cam.enabled && !cam.dragging && cam.sel === part && cam.attached, `${tag}: let go: the camera on again, the part still selected, its gizmo up`);
          await shot(`${size}-${tool}-3-after-handle`);
          // the camera turns after it
          pts = await evaluate(POINTS);
          const e3 = pickEmpty(pts), b6 = cam;
          if (process.env.CAMDEBUG) await evaluate(`(() => { const L = window.__camlog = []; const o = window.__modelEditor.three.orbit; for (const t of ['pointerdown','pointermove','pointerup','pointercancel']) document.getElementById('game').addEventListener(t, e => L.push(t + ' ' + e.pointerId + ' ' + e.pointerType + ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' en=' + o.enabled + ' drag=' + window.__modelEditor.three.gizmo.dragging), { capture: true }); o.addEventListener('start', () => L.push('orbit start')); o.addEventListener('change', () => L.push('orbit change')); })()`);
          if (touchy) await fingers([e3], [[e3[0] - 60, e3[1]]]); else await mouse('left', e3, [e3[0] - 60, e3[1]]);
          cam = await settle();
          if (process.env.CAMDEBUG) console.log(e3, JSON.stringify(await evaluate('window.__camlog'), null, 0));
          check(angle(cam.az, b6.az) > 0.15 && near(cam.part, b6.part, 1e-6), `${tag}: after the handle drag, a drag on empty view turns the camera again (azimuth ${b6.az.toFixed(2)} -> ${cam.az.toFixed(2)})`);
          await shot(`${size}-${tool}-4-orbit-after-handle`);
        }

        // 6. the view buttons, with the part selected: the camera goes there and a drag after is not undone
        { // (a view button just after a flick: the damping's leftover turn must not carry the camera off the view)
          const e5 = pickEmpty(await evaluate(POINTS));
          if (touchy) await fingers([e5], [[e5[0] + 70, e5[1]]], 4); else await mouse('left', e5, [e5[0] + 70, e5[1]], 4);
          await click('[data-view="rear"]', touchy);
          await frames(20);
          const c = await evaluate(CAM);
          check(angle(c.az, Math.PI) < 0.05, `${tag}: the Rear view button just after a flick holds the view (azimuth ${c.az.toFixed(2)} 20 frames on)`);
        }
        for (const [v, az, pol] of [['front', 0, Math.PI / 2 - 0.12], ['left', Math.PI / 2, Math.PI / 2 - 0.06], ['top', 0, Math.PI / 2 - 1.45]]) {
          await click(`[data-view="${v}"]`, touchy);
          cam = await settle();
          check(angle(cam.az, az) < 0.05 && Math.abs(cam.pol - pol) < 0.05 && cam.sel === part, `${tag}: the ${v} view button with a part selected (azimuth ${cam.az.toFixed(2)}, polar ${cam.pol.toFixed(2)})`);
        }
        await click('[data-view="34"]', touchy);
        cam = await settle();
        pts = await evaluate(POINTS);
        const e4 = pickEmpty(pts), b7 = cam;
        if (touchy) await fingers([e4], [[e4[0] + 50, e4[1]]]); else await mouse('left', e4, [e4[0] + 50, e4[1]]);
        await frames(30);
        cam = await settle();
        check(angle(cam.az, b7.az) > 0.12, `${tag}: a drag after a view button keeps the camera where it was turned (no snap back: ${b7.az.toFixed(2)} -> ${cam.az.toFixed(2)})`);

        // 7. Fit: the target on the part's centre; Reset: the 3/4 view of the whole car
        await click('#camFit', touchy);
        cam = await settle();
        const centre = await evaluate(`(() => { const M = window.__modelEditor, { THREE } = M.three; return new THREE.Box3().setFromObject(M.nodes.get(M.sel)).getCenter(new THREE.Vector3()).toArray(); })()`);
        check(near(cam.target, centre, 0.02) && cam.sel === part, `${tag}: Fit puts the camera on the part's centre (${cam.target.map(v => v.toFixed(2)).join(',')} / ${centre.map(v => v.toFixed(2)).join(',')}), distance ${cam.dist.toFixed(2)} m`);
        await shot(`${size}-${tool}-5-fit`);
        await click('#camReset', touchy);
        const reset = await settle();
        check(angle(reset.az, 0.75) < 0.05 && Math.abs(reset.pol - (Math.PI / 2 - 0.38)) < 0.05 && reset.dist > cam.dist, `${tag}: Reset: the 3/4 view of the whole car (azimuth ${reset.az.toFixed(2)}, distance ${reset.dist.toFixed(2)} m)`);
        if (tool === 'translate') { // (a double tap on the part: Fit)
          pts = await evaluate(POINTS);
          const p2 = pts.onPart.length ? centreOf(pts.onPart) : null;
          if (p2) {
            await tapAt(p2, touchy); await sleep(80); await tapAt(p2, touchy);
            cam = await settle();
            check(near(cam.target, centre, 0.05) && cam.dist < reset.dist && cam.sel === part, `${tag}: a double tap on the part frames it (target ${cam.target.map(v => v.toFixed(2)).join(',')}, distance ${cam.dist.toFixed(2)} m)`);
            await click('#camReset', touchy);
          }
        }
        cam = await settle();
        check(cam.scroll.every(v => v === 0) && cam.scale === 1, `${tag}: the page behind the view never scrolled or zoomed (scroll ${cam.scroll.join(',')}, scale ${cam.scale})`);
        const ta = await evaluate(`getComputedStyle(document.getElementById('game')).touchAction`);
        check(ta === 'none', `${tag}: the canvas's touch-action is ${ta}`);
      }
      // the toggles fold away on a phone and a tablet (they covered half the view): More opens them, the view still turns under the rest
      if (touchy) {
        const folded = await evaluate(`!document.getElementById('wire').offsetParent && !!document.getElementById('snap').offsetParent && !!document.getElementById('camMore')?.offsetParent`);
        check(folded, `${size}: the view's toggles (Wire... Lamp markers) folded under More, Snap and Mirror kept`);
        await click('#camMore', true);
        const open = await evaluate(`!!document.getElementById('wire').offsetParent && !!document.getElementById('lMarks').offsetParent`);
        check(open, `${size}: More shows them`);
        await shot(`${size}-more-open`);
        await click('#camMore', true);
      }
    }
  } catch (error) {
    check(false, 'the browser part: ' + (error?.stack || error?.message || error));
  } finally {
    try { if (socket) await send('Browser.close', {}, undefined, 5000); } catch { /* (gone) */ }
    try { socket?.close(); } catch { /* (closed) */ }
    if (child && child.exitCode === null) { await sleep(500); try { child.kill(); } catch { /* (gone) */ } }
    await server?.close();
    try { rmSync(own, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* (held a moment yet) */ }
  }
}
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
