// A check of the DEVICE DEFAULTS, the VERBOSITY setting and the ONE-PEDAL controls (the owner, 17-Oct; render/device.js,
// render/verbosity.js, render/touch.js). Without a browser: the Verbosity table (every tag names a real message, the four
// levels hide what the owner listed), messages.js asks it, and the replay fingerprint is main's (all display only).
// In headless Chromium over DevTools (skipped with a note if no browser is found), each on a fresh profile:
//   a FRESH save on a phone (390x844, touch, mobile): auto accelerate on, auto brake off, Verbosity Low, on-screen controls
//     on, deviceSet written; in a run the accelerator gone and the brake the whole pedals pad (as wide as the steering pad,
//     on the screen), a touch on its right half holds the BRAKE; the same on its side (844x390); Message.say in the page
//     hides and says what Low and Very low should
//   the SECOND load after the player changed a setting (auto accelerate off, Verbosity stepped): kept, nothing re-applied
//   a FRESH save on a desktop (1280x800, no touch): on-screen controls off, auto accelerate off, auto brake 100%, High
//   an EXISTING save (from before this release) on a phone: untouched (auto accelerate off, auto brake 100%, High), marked visited
//   node scripts/.device-defaults-check.mjs [--browser=<path>] [--shots=<dir>] [--prefix=<name>] [--root=<repo>] [--shots-only]
// --shots saves the controls in a run at 390x844 and 844x390 and the Options' settings row; --root and --shots-only take
// those stills of another tree (a 'before'), the controls seeded to auto accelerate on, auto brake off, with no checks.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const ROOT = resolve(opt('root', resolve(import.meta.dirname, '..')));
const SHOTS = opt('shots', null), PREFIX = opt('prefix', 'device'), ONLY_SHOTS = !!opt('shots-only', false);
let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

if (!ONLY_SHOTS) {
  const { TAGS, IMPORTANT_ZONES, shows, Verbosity } = await import(new URL('file://' + join(ROOT, 'src/delivery/render/verbosity.js')).href);
  const M = JSON.parse(readFileSync(join(ROOT, 'src/delivery/messages.json'), 'utf8'));
  const missing = Object.keys(TAGS).filter(k => { const [g, key] = k.split('.'); return !(g in M) || (key && !(key in M[g])); });
  check(!missing.length, `every Verbosity tag names a message of messages.json${missing.length ? ' (not: ' + missing.join(', ') + ')' : ''}`);
  const noZone = [...IMPORTANT_ZONES].filter(z => !(z in M.zones));
  check(!noZone.length, `every important zone is a zone (${IMPORTANT_ZONES.size} of ${Object.keys(M.zones).length})${noZone.length ? ' not: ' + noZone.join(', ') : ''}`);
  const row = (level) => { Verbosity.level = level; return [['reactions', 'goodOnGood'], ['zones', 'river'], ['zones', 'sydney'], ['powerups', 'cashBonus'],
    ['events', 'fog'], ['events', 'emergency'], ['events', 'trainAhead'], ['events', 'trainBehind'], ['powerups', 'turbo'], ['busts', 'seen'], ['events', 'airborne']]
    .map(([g, k]) => +shows(g, k)).join(''); };
  // reaction, important zone, flavour zone, cash, fog warning, ambulance, bullet train x2, a powerup, a bust, a status
  check(row('high') === '11111111111', 'High: everything said (as before)');
  check(row('medium') === '01111111111', 'Medium: no reactions only');
  check(row('low') === '01011111111', 'Low: no reactions, only the important location messages');
  check(row('veryLow') === '00000111111', 'Very low: no reactions, locations, cash or warnings but the ambulance and the Bullet Train');
  Verbosity.level = 'high';
  const msgs = readFileSync(join(ROOT, 'src/delivery/messages.js'), 'utf8');
  check(/say\(group, \.\.\.keys\) \{\s*if \(!shows\(group, keys\[0\]\)\) return null;/.test(msgs), 'messages.js: Message.say asks the Verbosity first');
  const { fingerprints, logicFiles } = await import(new URL('file://' + join(ROOT, 'scripts/logic-hash.mjs')).href);
  const prints = fingerprints(join(ROOT, 'src/delivery/'));
  check(prints.logic === '8dbc477d85' && prints.legacy === 'bcc9df44d0', `the replay fingerprint unmoved by them: the one after CHECKLIST 470's rule (logic ${prints.logic}, legacy ${prints.legacy})`);
  check(!logicFiles(join(ROOT, 'src/delivery/')).some(f => /render\/(device|verbosity|touch|menu)\.js$/.test(f)), 'render/device.js, verbosity.js, touch.js, menu.js outside the rules files');
}

const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-device-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, configFile: join(ROOT, 'vite.config.js'), server: { port: 5251, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
    await server.listen();
    const port = server.config.server.port, base = `http://localhost:${port}`;
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
    const phone = async (w, h) => {
      await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await page('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
      await page('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: true, screenWidth: w, screenHeight: h });
      await page('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36' });
    };
    const desktop = async () => {
      await page('Emulation.setTouchEmulationEnabled', { enabled: false });
      await page('Emulation.setEmitTouchEventsForMouse', { enabled: false });
      await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
      await page('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36' });
    };
    const wipe = async () => {
      await page('Storage.clearDataForOrigin', { origin: base, storageTypes: 'all' });
      await page('Network.clearBrowserCookies');
    };
    const open = async (address, wait = 3500) => {
      await page('Page.navigate', { url: `${base}/delivery/${address}` });
      await sleep(wait);
      await evaluate(`document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    };
    const seed = async (save) => { // (a save written before the game loads: on a test visit, ?test, which writes nothing itself)
      await page('Page.navigate', { url: `${base}/delivery/index.html?test` });
      await sleep(1500);
      await evaluate(`localStorage.setItem('delivery_racer_progress_backup', ${JSON.stringify(JSON.stringify(save))})`);
    };
    const saved = () => evaluate(`JSON.parse(localStorage.getItem('delivery_racer_progress_backup') || 'null')`);
    const state = () => evaluate(`({ body: document.body.className, verbosity: document.getElementById('verbosityBtn')?.textContent, gasBtn: document.getElementById('autoGasBtn').textContent,
      brakeBtn: document.getElementById('autoBrakeBtn').textContent, touchBtn: document.getElementById('touchBtn').textContent })`);
    const shot = async (name, clip) => {
      if (!SHOTS) return;
      mkdirSync(SHOTS, { recursive: true });
      const { data } = await page('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      writeFileSync(join(SHOTS, `${PREFIX}-${name}.png`), Buffer.from(data, 'base64'));
    };
    // the pads in a run: their boxes, and which buttons show
    const pads = () => evaluate(`(() => { const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom, shown: !!e.offsetParent && getComputedStyle(e).display !== 'none' }; };
      const [left, right] = document.querySelectorAll('#touchControls .steer button'), [brake, gas] = document.querySelectorAll('#touchControls .pedals button');
      return { iw: innerWidth, ih: innerHeight, left: box(left), right: box(right), brake: box(brake), gas: box(gas), pad: box(document.querySelector('#touchControls .pedals')),
        steerPad: box(document.querySelector('#touchControls .steer')) }; })()`);
    const runControls = async (w, h, tag) => {
      await phone(w, h);
      await open('?level=1&autostart', 5000);
      const p = await pads();
      if (!ONLY_SHOTS) {
        check(!p.gas.shown, `${tag}: the accelerator dropped`);
        check(p.brake.shown && p.brake.w >= p.left.w + p.right.w - 1 && p.brake.r <= p.iw + 0.5 && p.brake.b <= p.ih + 0.5 && p.brake.x >= p.iw / 2,
          `${tag}: the brake double wide (${p.brake.w.toFixed(0)} px, the steering buttons ${p.left.w.toFixed(0)} + ${p.right.w.toFixed(0)}), on the screen at the right`);
        check(p.pad.x >= p.steerPad.r - 0.5, `${tag}: the pedals clear of the steering`);
        const x = p.brake.x + p.brake.w * 0.8, y = p.brake.y + p.brake.h / 2; // (the right half: where the accelerator was)
        await page('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
        await sleep(150);
        const down = await evaluate(`[...document.querySelectorAll('#touchControls .pedals button')].map(b => b.classList.contains('down'))`);
        await page('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        check(down[0] && !down[1], `${tag}: a touch on the right half of the pedal holds the brake`);
      }
      await shot(`controls-${w}x${h}`);
    };
    const optionsShot = async (name) => {
      await evaluate(`document.getElementById('menuOptions').classList.remove('hidden')`);
      await sleep(400);
      const r = await evaluate(`(() => { const s = document.getElementById('autoBrakeBtn').closest('section').getBoundingClientRect(); return { x: s.left, y: s.top, width: s.width, height: s.height }; })()`);
      await shot(name, r);
    };

    if (ONLY_SHOTS) { // (a 'before': the same pedal settings, seeded)
      await phone(390, 844);
      await wipe();
      await seed({ unlocked: 1, money: 0, cars: ['commuter'], car: 'commuter', autoGas: true, autoBrake: 0, touch: true });
      await runControls(390, 844);
      await runControls(844, 390);
      await phone(390, 844);
      await open('index.html');
      await optionsShot('settings-390x844');
    } else {
      // ---- a fresh save on a phone
      await phone(390, 844);
      await wipe();
      await open('index.html');
      let s = await saved(), st = await state();
      check(s?.deviceSet === true && s.autoGas === true && s.autoBrake === 0 && s.verbosity === 'low' && s.touch === true,
        `phone, fresh: auto accelerate on, auto brake off, Verbosity Low, controls on, deviceSet saved (${JSON.stringify({ autoGas: s?.autoGas, autoBrake: s?.autoBrake, verbosity: s?.verbosity, touch: s?.touch, deviceSet: s?.deviceSet })})`);
      check(/touch-controls/.test(st.body) && /one-pedal/.test(st.body) && st.verbosity === 'Verbosity: Low' && st.gasBtn === 'Auto accelerate: on' && st.brakeBtn === 'Auto brake: off',
        `phone, fresh: the buttons say so (${st.gasBtn}, ${st.brakeBtn}, ${st.verbosity}), body one-pedal`);
      await optionsShot('settings-390x844');
      // the messages in the page at Low and Very low (the game's own Message, through Vite)
      const said = await evaluate(`(async () => { const { Message } = await import('/src/delivery/messages.js'); const { Verbosity } = await import('/src/delivery/render/verbosity.js');
        const t = (...p) => Message.say(...p) ? 1 : 0; const out = {};
        for (const level of ['low', 'veryLow', 'high']) { Verbosity.level = level; out[level] = [t('reactions', 'goodOnGood'), t('zones', 'river'), t('zones', 'sydney'), t('powerups', 'cashBonus'), t('events', 'fog'), t('events', 'emergency'), t('events', 'trainAhead')].join(''); }
        return out; })()`);
      check(said.low === '0101111' && said.veryLow === '0000011' && said.high === '1111111', `in the page, Message.say: Low ${said.low}, Very low ${said.veryLow}, High ${said.high}`);
      await runControls(390, 844, 'phone 390x844 run');
      await runControls(844, 390, 'phone 844x390 run');
      // ---- the second load after the player changed settings
      await phone(390, 844);
      await open('index.html');
      await evaluate(`document.getElementById('autoGasBtn').click(); document.getElementById('verbosityBtn').click()`); // (auto accelerate off; Low to Very low)
      await open('index.html');
      s = await saved(); st = await state();
      check(s.autoGas === false && s.verbosity === 'veryLow' && s.autoBrake === 0 && st.gasBtn === 'Auto accelerate: off' && st.verbosity === 'Verbosity: Very low' && !/one-pedal/.test(st.body),
        `phone, second load: the player's choices kept, nothing re-applied (${st.gasBtn}, ${st.brakeBtn}, ${st.verbosity}), two pedals again`);
      // (a setting cleared: still never re-applied)
      await evaluate(`(() => { const d = JSON.parse(localStorage.getItem('delivery_racer_progress_backup')); delete d.autoGas; delete d.verbosity; localStorage.setItem('delivery_racer_progress_backup', JSON.stringify(d)); })()`);
      await open('index.html');
      s = await saved(); st = await state();
      check(!s.autoGas && st.verbosity === 'Verbosity: High', `phone, a setting cleared: its plain default (${st.gasBtn}, ${st.verbosity}), the device's not re-applied`);
      // ---- a fresh save on a desktop
      await desktop();
      await wipe();
      await open('index.html');
      s = await saved(); st = await state();
      check(s?.deviceSet === true && s.touch === false && !s.autoGas && s.autoBrake === 1 && s.verbosity === undefined && !/touch-controls/.test(st.body) && st.verbosity === 'Verbosity: High',
        `desktop, fresh: controls off, auto accelerate off, auto brake 100%, High (${st.touchBtn}, ${st.gasBtn}, ${st.brakeBtn}, ${st.verbosity})`);
      await evaluate(`document.getElementById('touchBtn').click()`);
      st = await state();
      check(/touch-controls/.test(st.body) && st.touchBtn === 'On-screen controls: on', 'desktop: the on-screen controls can still be switched on');
      await shot('desktop-menu');
      // ---- an existing save from before this release, on a phone
      await phone(390, 844);
      await wipe();
      await seed({ money: 12, unlocked: 3, cars: ['commuter'], car: 'commuter', autoGas: false, autoBrake: 1, touch: null, levelOrder: 51 });
      await open('index.html');
      s = await saved(); st = await state();
      check(s.deviceSet === true && s.autoGas === false && s.autoBrake === 1 && s.verbosity === undefined && s.money === 12 && st.verbosity === 'Verbosity: High' && !/one-pedal/.test(st.body),
        `phone, existing save: untouched (${st.gasBtn}, ${st.brakeBtn}, ${st.verbosity}), marked visited`);
      // ---- a test visit (?autostart) on a fresh profile: no defaults written
      await wipe();
      await open('?level=1&autostart', 3000);
      s = await saved();
      check(!s || s.deviceSet === undefined, 'phone, a test visit (?autostart) on no save: nothing applied or written');
    }
  } catch (error) {
    check(false, 'the browser part: ' + (error?.message || error));
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
