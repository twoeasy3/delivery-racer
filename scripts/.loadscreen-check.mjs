// A check of THE LEVEL LOADING SCREEN and the staged start (render/loadscreen.js, CHECKLIST 345).
// The source: loadscreen.js is outside the replay fingerprint (vite.config.js logicFiles: no rule reads it) and main.js imports it
// first (it names the drawing hooks as the render modules register them). Then in headless Chromium over DevTools (skipped with a
// note if no browser is found), the WebGL stubbed out (only the page's JavaScript runs), the dev server, ?loadlog&unlockall&tiers=0:
//   1 a staged start slowed (?slowload=150: each step waits that long): the screen comes up, the level's name on it, the bar moves
//     forward with the steps; then the screen goes, the run is on (playing, not paused, its logic stepping), a key reaches the game
//     again, and the load log has its phases (the theme file, the rules, the road's drawing, the shaders, Game.start, the frames);
//   2 a restart of the level (nothing to build) and a load under the threshold (?loadafter=60000): no screen at any moment, the
//     run on and not paused.
//   node scripts/.loadscreen-check.mjs [--browser=<path>] [--report]
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const REPORT = !!opt('report', false);
let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- the source
const { logicFiles } = await import('../vite.config.js');
const logic = logicFiles();
check(!logic.some(f => /loadscreen/.test(f)), 'render/loadscreen.js is not among the rules (the replay fingerprint, vite.config.js logicFiles)');
const main = readFileSync(join(ROOT, 'src/delivery/main.js'), 'utf8');
const firstImport = main.split('\n').find(l => /^import /.test(l)) || '';
check(/render\/loadscreen\.js/.test(firstImport), 'main.js imports render/loadscreen.js first');
const ls = readFileSync(join(ROOT, 'src/delivery/render/loadscreen.js'), 'utf8');
check(/SHOW_AFTER = Number\(params\.get\('loadafter'\)\) \|\| 300\b/.test(ls), 'the screen shows only past 300 ms (SHOW_AFTER)');

const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);

// (a WebGL that does nothing: three.js runs, nothing is drawn; the same stand-in as scripts/perf-menu.mjs's, cut down)
const STUB = String.raw`(() => {
  const numeric = { 3379: 16384, 34076: 8192, 34024: 8192, 34930: 16, 35660: 16, 35661: 32, 34921: 16, 36347: 1024, 36349: 1024, 36348: 30, 36183: 4, 34047: 16, 35071: 2048, 35658: 4096, 35657: 4096, 32883: 2048, 35968: 4, 37154: 128, 37157: 128, 35377: 16, 35379: 16, 35374: 72, 35375: 16, 37137: 16, 34045: 16 };
  const make = (canvas, v2) => {
    const proto = (v2 ? WebGL2RenderingContext : WebGLRenderingContext).prototype, gl = Object.create(proto);
    const strings = { 7938: v2 ? 'WebGL 2.0 (stub)' : 'WebGL 1.0 (stub)', 35724: 'WebGL GLSL ES 3.00 (stub)', 7936: 'stub', 7937: 'stub' };
    const impl = {
      getParameter(p) { if (p === 3088 || p === 2978) return new Int32Array([0, 0, canvas.width, canvas.height]); if (p in strings) return strings[p]; if (p === 33901 || p === 33902) return new Float32Array([1, 1]); return p in numeric ? numeric[p] : 16; },
      getShaderPrecisionFormat() { return { rangeMin: 127, rangeMax: 127, precision: 23 }; }, getShaderParameter() { return true; },
      getProgramParameter(prog, p) { return p === 35721 || p === 35718 || p === 35382 ? 0 : true; },
      getShaderInfoLog() { return ''; }, getProgramInfoLog() { return ''; }, getShaderSource() { return ''; }, getExtension() { return null; }, getSupportedExtensions() { return []; },
      getContextAttributes() { return { alpha: true, antialias: true, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false }; },
      getError() { return 0; }, isContextLost() { return false; }, checkFramebufferStatus() { return 36053; },
      getAttribLocation() { return 0; }, getUniformBlockIndex() { return 0; }, getFragDataLocation() { return 0; }, getActiveUniform() { return null; }, getActiveAttrib() { return null; },
    };
    for (const name of Object.getOwnPropertyNames(proto)) {
      let d; try { d = Object.getOwnPropertyDescriptor(proto, name); } catch (e) { continue; }
      if (name === 'constructor' || !d || typeof d.value !== 'function') continue;
      gl[name] = impl[name] || (/^(create|getUniformLocation)/.test(name) ? () => ({}) : () => undefined);
    }
    Object.defineProperty(gl, 'canvas', { value: canvas });
    Object.defineProperty(gl, 'drawingBufferWidth', { get: () => canvas.width });
    Object.defineProperty(gl, 'drawingBufferHeight', { get: () => canvas.height });
    return gl;
  };
  const real = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (/^(experimental-)?webgl2?$/.test(type)) { this.__stub ||= make(this, type === 'webgl2'); return this.__stub; }
    return real.call(this, type, ...rest);
  };
})();`;
// in the page: watch the screen (shown at any moment? its bar's steps), press Start on a level, wait for the run's load log
const WATCH = `(() => {
  const W = window.__lsWatch = { shown: false, title: '', bars: [], screens: 0 };
  const look = () => {
    const s = document.getElementById('loadScreen');
    if (s && !s.classList.contains('hidden')) {
      W.shown = true; W.title = s.querySelector('h2').textContent;
      const m = /scaleX\\(([\\d.]+)\\)/.exec(s.querySelector('.ls-bar i').style.transform || ''); const v = m ? Number(m[1]) : 0;
      if (W.bars[W.bars.length - 1] !== v) W.bars.push(v);
    }
  };
  new MutationObserver(look).observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['class', 'style'] });
  return true;
})()`;
const START = (id) => `(async () => {
  const L = await import('/src/delivery/levels.js');
  const level = [...L.LEVELS, ...Object.values(L.HIDDEN_LEVELS)].find(l => l.id === ${JSON.stringify(id)});
  L.selectLevel(L.LEVELS.indexOf(level));
  const n = window.__loadlog.length;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('startBtn').click();
  for (let k = 0; k < 1200 && window.__loadlog.length === n; k++) await new Promise(r => setTimeout(r, 50));
  await new Promise(r => setTimeout(r, 300));
  const { Game } = await import('/src/delivery/game.js');
  const step0 = Game.step; await new Promise(r => setTimeout(r, 400));
  const { Input } = await import('/src/delivery/input.js');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }));
  await new Promise(r => setTimeout(r, 100));
  const throttle = Input.throttle;
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }));
  const s = document.getElementById('loadScreen');
  return { log: window.__loadlog[window.__loadlog.length - 1] || null, state: Game.state, paused: Game.paused, stepped: Game.step > step0, throttle,
    screenGone: !s || s.classList.contains('hidden'), watch: window.__lsWatch };
})()`;
const EXIT = `(async () => { const { Game } = await import('/src/delivery/game.js'); Game.exit(); window.__lsWatch.shown = false; window.__lsWatch.bars = []; return Game.state; })()`;

if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-loadscreen-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 120000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5251, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
    await server.listen();
    const port = server.httpServer.address().port;
    const profile = join(own, 'profile');
    mkdirSync(profile);
    child = spawn(browser, [...(process.platform === 'linux' && process.getuid?.() === 0 ? ['--no-sandbox'] : []), '--headless=new', '--hide-scrollbars', '--mute-audio',
      '--no-first-run', '--disable-extensions', '--disable-component-update', '--disable-background-networking', '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding', '--user-data-dir=' + profile, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
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
    const page = async (query) => {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const S = (method, params) => send(method, params, sessionId);
      await S('Page.enable'); await S('Runtime.enable'); await S('Page.bringToFront'); await S('Emulation.setFocusEmulationEnabled', { enabled: true });
      await S('Emulation.setDeviceMetricsOverride', { width: 1100, height: 650, deviceScaleFactor: 1, mobile: false });
      await S('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
      await S('Page.navigate', { url: `http://127.0.0.1:${port}/delivery/index.html?loadlog&unlockall&tiers=0&${query}` });
      const evaluate = async (expression) => {
        const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception?.description || r.exceptionDetails.text).split('\n')[0]);
        return r.result.value;
      };
      for (let i = 0; i < 600; i++) { try { if (await evaluate(`!!window.__loadlog && !document.getElementById('startScreen').classList.contains('hidden') && document.readyState === 'complete'`)) break; } catch { /* (not up) */ } await sleep(150); }
      await sleep(1500);
      await evaluate(WATCH);
      return { evaluate, close: () => send('Target.closeTarget', { targetId }) };
    };
    // 1 slowed: the screen and its bar
    {
      const p = await page('slowload=150');
      const r = await p.evaluate(START('expressway'));
      if (REPORT) console.log(JSON.stringify({ ...r, log: { ...r.log, phases: r.log?.phases?.length } }));
      const w = r.watch;
      check(w.shown, 'slowed: the loading screen came up');
      check(/EXPRESSWAY/i.test(w.title), `slowed: the level's name on it ("${w.title}")`);
      check(w.bars.length >= 4 && w.bars.every((v, i) => i === 0 || v >= w.bars[i - 1]) && w.bars[w.bars.length - 1] >= 0.9, `slowed: its bar went forward in steps (${w.bars.map(v => v.toFixed(2)).join(' ')})`);
      check(r.screenGone, 'slowed: the screen is gone once the run is up');
      check(r.state === 'playing' && !r.paused && r.stepped, `slowed: the run is on (${r.state}, ${r.paused ? 'paused' : 'not paused'}, ${r.stepped ? 'stepping' : 'NOT stepping'})`);
      check(r.throttle > 0, 'slowed: a key reaches the game after the load (ArrowUp: throttle)');
      const names = (r.log?.phases || []).map(([n]) => n).join(' | ');
      for (const want of ['theme file', 'rules: Game.load', 'draw: road', 'shaders compiled (renderer.compile', 'run: Game.start', 'frame 1: JS', 'frame 1: draw'])
        check(names.includes(want), `the load log has "${want}"`);
      check(r.log?.staged === true && r.log.total > 0, `the load log: staged, ${r.log?.total} ms to the first frame`);
      await p.evaluate(EXIT);
      await sleep(500);
      const again = await p.evaluate(START('expressway'));
      check(!again.watch.shown && again.state === 'playing' && !again.paused, 'a restart of the level built already: no screen, the run on');
      await p.close();
    }
    // 2 under the threshold: no screen at all
    {
      const p = await page('loadafter=60000');
      const r = await p.evaluate(START('farm'));
      check(!r.watch.shown, 'a load under the threshold: no screen at any moment');
      check(r.state === 'playing' && !r.paused && r.stepped && r.screenGone, 'a load under the threshold: the run on, not paused');
      await p.close();
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
