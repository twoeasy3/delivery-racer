// Level load times (headless, NOT part of any test group; nothing here changes the game). The time from Start on the menu to the
// run's first frame drawn, per phase, from the game's own load log (?loadlog: render/loadscreen.js), for a spread of levels.
//
//   node scripts/perf-load.mjs [--levels=farm,expressway,...] [--runs=2] [--nostage] [--seq] [--cpu=1] [--gl=soft|stub] [--json=<file>]
//
// Each level is started in a FRESH page (the menu up and settled ~3 s, the level picked, Start pressed at once: its theme file may
// still be on its way), so every in-page cache (models, materials, programs) is cold. --seq also runs one page through
// A, A again (the level already built: a restart), B, then A again (built again, the page warm). --nostage starts in one go as
// before the loading screen (the "before"). --themewait waits for the level's theme file before pressing Start (without it, a level
// started before its file arrives is drawn bare and drawn again when it lands, after the start, in the old way). --cpu=4 throttles the page's main thread (a rough stand-in for a phone).
// HONESTY: the GL is SwiftShader (software, on the CPU): the first draw's shader compile and upload are CPU numbers that say
// nothing about a phone's GPU. The machine is shared: repeat (--runs) and read the medians, and the RELATIVE costs, not one number.
// Options: --browser=<path> (default: /opt/pw-browsers/chromium-*/chrome-linux/chrome).
import { createServer as createViteServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const LEVELS = String(opt('levels', 'farm,expressway,tokyo,vegas-strip,steelworks-run,metro-run,mall-dash,monza')).split(',').filter(Boolean);
const RUNS = Number(opt('runs', 1)) || 1, CPU = Number(opt('cpu', 1)) || 1;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };

const findBrowser = () => {
  if (opt('browser', null)) return opt('browser');
  const pw = '/opt/pw-browsers';
  if (existsSync(pw)) for (const d of readdirSync(pw).sort().reverse()) { const p = join(pw, d, 'chrome-linux', 'chrome'); if (d.startsWith('chromium-') && existsSync(p)) return p; }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync) || 'chromium';
};
let proc = null, socket = null, calls = 0, tmp = null;
const waiting = new Map(), listeners = new Map();
const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
  const id = ++calls;
  const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
  waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
  socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
});
const openBrowser = async () => {
  tmp = mkdtempSync(join(tmpdir(), 'perf-load-'));
  const profile = join(tmp, 'profile');
  mkdirSync(profile);
  proc = spawn(findBrowser(), [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), '--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle',
    '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-extensions', '--disable-component-update', '--disable-background-networking',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--autoplay-policy=no-user-gesture-required', '--user-data-dir=' + profile, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore', env: { ...process.env, TMPDIR: tmp } });
  let where = null;
  for (let i = 0; i < 300 && !where && proc.exitCode === null; i++) {
    await sleep(100);
    try { const l = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) where = `ws://127.0.0.1:${l[0].trim()}${l[1].trim()}`; } catch { /* not up yet */ }
  }
  if (!where) throw new Error('the browser did not start: ' + findBrowser());
  socket = new WebSocket(where);
  await new Promise((done, fail) => { socket.addEventListener('open', done); socket.addEventListener('error', () => fail(new Error('no DevTools connection'))); });
  socket.addEventListener('message', (m) => {
    const message = JSON.parse(m.data);
    if (message.id) { const a = waiting.get(message.id); waiting.delete(message.id); if (a) a(message); }
    else if (message.sessionId && listeners.has(message.sessionId)) listeners.get(message.sessionId)(message);
  });
  // (the browser's first WebGL context starts its software GPU process, 1-3 s here: paid once by a throwaway page, not by a measured one)
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.evaluate', { expression: `(() => { const g = document.createElement('canvas').getContext('webgl2'); g.clear(g.COLOR_BUFFER_BIT); g.finish(); return 1; })()`, returnByValue: true }, sessionId);
  await send('Target.closeTarget', { targetId });
};
const closeBrowser = async () => {
  try { await send('Browser.close', {}, undefined, 4000); } catch { /* gone */ }
  try { socket?.close(); } catch { /* closed */ }
  if (proc && proc.exitCode === null) { await Promise.race([new Promise(r => proc.once('exit', r)), sleep(4000)]); try { proc.kill('SIGKILL'); } catch { /* gone */ } }
  if (tmp) { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* held */ } }
};
process.on('exit', () => { try { proc?.kill('SIGKILL'); } catch { /* gone */ } });

// (a WebGL stand-in that does nothing: --gl=stub times only the page's JavaScript; the same as scripts/perf-menu.mjs's)
const STUB = String.raw`(() => {
  const consts = {};
  const numeric = { 3379: 16384, 34076: 8192, 34024: 8192, 34930: 16, 35660: 16, 35661: 32, 34921: 16, 36347: 1024, 36349: 1024, 36348: 30, 36183: 4, 34047: 16, 35071: 2048, 35658: 4096, 35657: 4096, 32883: 2048, 35968: 4, 37154: 128, 37157: 128, 35377: 16, 35379: 16, 35374: 72, 35375: 16, 37137: 16, 34045: 16, 33901: [1, 1], 33902: [1, 1] };
  const make = (canvas, v2) => {
    const proto = (v2 ? WebGL2RenderingContext : WebGLRenderingContext).prototype;
    const gl = Object.create(proto);
    const strings = { 7938: v2 ? 'WebGL 2.0 (stub)' : 'WebGL 1.0 (stub)', 35724: v2 ? 'WebGL GLSL ES 3.00 (stub)' : 'WebGL GLSL ES 1.0 (stub)', 7936: 'stub', 7937: 'stub' };
    const handle = () => ({});
    const impl = {
      getParameter(p) { if (p === 3088 || p === 2978) return new Int32Array([0, 0, canvas.width, canvas.height]); if (p in strings) return strings[p]; if (p === 33901 || p === 33902) return new Float32Array([1, 1]); return p in numeric ? numeric[p] : 16; },
      getShaderPrecisionFormat() { return { rangeMin: 127, rangeMax: 127, precision: 23 }; },
      getShaderParameter() { return true; },
      getProgramParameter(prog, p) { return p === 35721 || p === 35718 || p === 35382 ? 0 : true; },
      getShaderInfoLog() { return ''; }, getProgramInfoLog() { return ''; }, getShaderSource() { return ''; },
      getExtension() { return null; }, getSupportedExtensions() { return []; },
      getContextAttributes() { return { alpha: true, antialias: true, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false, desynchronized: false }; },
      getError() { return 0; }, isContextLost() { return false; }, checkFramebufferStatus() { return 36053; },
      getAttribLocation() { return 0; }, getUniformBlockIndex() { return 0; }, getFragDataLocation() { return 0; },
      getActiveUniform() { return null; }, getActiveAttrib() { return null; },
    };
    for (const name of Object.getOwnPropertyNames(proto)) {
      let d; try { d = Object.getOwnPropertyDescriptor(proto, name); } catch (e) { continue; }
      if (name === 'constructor' || !d || typeof d.value !== 'function') continue;
      gl[name] = impl[name] || (/^(create|getUniformLocation)/.test(name) ? handle : () => undefined);
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

const openPage = async (url) => {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const errors = [];
  listeners.set(sessionId, (m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  });
  const S = (method, params, timeout) => send(method, params, sessionId, timeout);
  await S('Page.enable'); await S('Page.bringToFront'); await S('Emulation.setFocusEmulationEnabled', { enabled: true }); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: 1100, height: 650, deviceScaleFactor: 1, mobile: false });
  if (CPU > 1) await S('Emulation.setCPUThrottlingRate', { rate: CPU });
  if (opt('gl', 'soft') === 'stub') await S('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
  const page = {
    errors, S,
    eval: async (expression, timeout = 180000) => {
      const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);
      if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text).split('\n').slice(0, 3).join(' | '));
      return r.result.value;
    },
    close: async () => { listeners.delete(sessionId); try { await send('Target.closeTarget', { targetId }, undefined, 5000); } catch { /* gone */ } },
  };
  await S('Page.navigate', { url });
  return page;
};
const waitFor = async (page, expr, ms = 90000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await page.eval(expr)) return true; } catch { /* not ready */ } await sleep(150); }
  return false;
};

// in the page: pick the level by id (a menu level, or a hidden / theme one), press Start, and wait for its load log
const START = (id) => `(async () => {
  const L = await import('/src/delivery/levels.js');
  const level = [...L.LEVELS, ...Object.values(L.HIDDEN_LEVELS), ...(L.THEME_LEVELS || [])].find(l => l.id === ${JSON.stringify(id)});
  if (!level) return { error: 'no level ' + ${JSON.stringify(id)} };
  const i = L.LEVELS.indexOf(level);
  if (i >= 0) L.selectLevel(i); else L.selectSpecial(level);
  const { warmTheme } = await import('/src/delivery/render/road.js'); warmTheme(level); // (as the menu does on a pick)
  if (${opt('themewait', false) ? 'true' : 'false'}) { // (--themewait: the theme's file here before Start, as when the menu has been up a while)
    const { THEMES } = await import('/src/delivery/themes.js'), { loadTheme } = await import('/src/delivery/render/themes/index.js');
    await loadTheme((THEMES[level.theme] || THEMES.city).scenery).catch(() => null);
  }
  const n = window.__loadlog.length;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('startBtn').click();
  for (let k = 0; k < 1200 && window.__loadlog.length === n; k++) await new Promise(r => setTimeout(r, 50));
  if (window.__loadlog.length === n) { const { Game } = await import('/src/delivery/game.js'); return { error: 'no load log (state ' + Game.state + ')' }; }
  return window.__loadlog[window.__loadlog.length - 1];
})()`;
const EXIT = `(async () => { const { Game } = await import('/src/delivery/game.js'); if (Game.state !== 'start') Game.exit(); return Game.state; })()`;
const READY = `!!window.__loadlog && !document.getElementById('startScreen').classList.contains('hidden') && document.readyState === 'complete'`;

const devServer = async () => {
  const server = await createViteServer({ root: resolve('.'), logLevel: 'error', server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false }, optimizeDeps: { entries: ['delivery/index.html'] } });
  await server.listen();
  return { port: server.httpServer.address().port, close: () => server.close() };
};

// ---- the run --------------------------------------------------------------------------------------------------------
const server = await devServer();
await openBrowser();
const base = `http://127.0.0.1:${server.port}/delivery/index.html?loadlog&unlockall&tiers=0${opt('nostage', false) ? '&nostage' : ''}`;
const results = []; // { level, run, kind, total, blocked, phases }
// --profile: a CPU profile of each measured start, its heaviest functions by self time (and by module) printed
const profileTop = (prof) => {
  const self = new Map(), byFile = new Map(), dt = prof.timeDeltas, idx = new Map(prof.nodes.map((n) => [n.id, n]));
  const counts = new Map();
  for (let i = 0; i < prof.samples.length; i++) counts.set(prof.samples[i], (counts.get(prof.samples[i]) || 0) + (dt[i] || 0));
  for (const [id, us] of counts) {
    const n = idx.get(id), f = n.callFrame, file = (f.url || '').replace(/^.*\/src\/delivery\//, '').replace(/^.*node_modules\/\.vite\/deps\//, 'deps/').replace(/\?.*$/, '') || '(' + f.functionName + ')';
    const key = (f.functionName || '(anon)') + ' ' + file + ':' + f.lineNumber;
    self.set(key, (self.get(key) || 0) + us / 1000);
    byFile.set(file, (byFile.get(file) || 0) + us / 1000);
  }
  const top = (m, k) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n, ms]) => `      ${ms.toFixed(0).padStart(6)} ms  ${n}`).join('\n');
  console.log('    by module:\n' + top(byFile, 14) + '\n    by function (self):\n' + top(self, 18));
};
const measure = async (page, id, kind, run) => {
  if (opt('profile', false)) { await page.S('Profiler.enable'); await page.S('Profiler.setSamplingInterval', { interval: 500 }); await page.S('Profiler.start'); }
  const r = await page.eval(START(id));
  if (opt('profile', false)) { const { profile } = await page.S('Profiler.stop'); profileTop(profile); }
  if (r.error) { console.log(`  ${id} (${kind}): ${r.error}`); return null; }
  results.push({ ...r, kind, run });
  console.log(`  ${id.padEnd(16)} ${kind.padEnd(14)} ${String(r.total).padStart(6)} ms to the first frame, longest block ${String(r.blocked).padStart(5)} ms`);
  await page.eval(EXIT);
  await sleep(800);
  return r;
};
try {
  // (a first page loads the dev server's modules into its transform cache: not measured)
  { const p = await openPage(base); await waitFor(p, READY); await sleep(1500); await p.close(); }
  for (let run = 1; run <= RUNS; run++) {
    console.log(`run ${run} (${opt('nostage', false) ? 'in one go, as before' : 'staged'}${CPU > 1 ? ', CPU x' + CPU : ''}, GL ${opt('gl', 'soft')})`);
    for (const id of LEVELS) {
      const page = await openPage(base);
      if (!await waitFor(page, READY)) { console.log('  the menu did not come up'); await page.close(); continue; }
      await sleep(3000);
      await measure(page, id, 'cold', run);
      if (page.errors.length) console.log('    page errors: ' + [...new Set(page.errors)].slice(0, 3).join(' | '));
      await page.close();
    }
    if (opt('seq', false)) {
      const [a, b] = [LEVELS.includes('expressway') ? 'expressway' : LEVELS[0], LEVELS.includes('vegas-strip') ? 'vegas-strip' : LEVELS[1] || LEVELS[0]];
      const page = await openPage(base);
      await waitFor(page, READY); await sleep(3000);
      await measure(page, a, 'cold', run);
      await measure(page, a, 'restart', run);
      await measure(page, b, 'switch (cold)', run);
      await measure(page, a, 'back (rebuilt)', run);
      await page.close();
    }
  }
  // the medians, per level and kind, and per phase
  console.log('\nMEDIANS (ms):');
  const groups = new Map();
  for (const r of results) { const k = r.level + ' | ' + r.kind; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  for (const [k, rs] of groups) {
    console.log(`\n${k}: total ${median(rs.map(r => r.total))}, longest block ${median(rs.map(r => r.blocked))} (${rs.length} run${rs.length > 1 ? 's' : ''})`);
    const names = [...new Set(rs.flatMap(r => r.phases.map(([n]) => n)))];
    const rows = names.map(n => [n, median(rs.map(r => r.phases.filter(([m]) => m === n).reduce((s, [, ms]) => s + ms, 0)))]).filter(([, ms]) => ms >= 1);
    for (const [n, ms] of rows.sort((x, y) => y[1] - x[1])) console.log(`  ${String(ms.toFixed(1)).padStart(8)}  ${n}`);
  }
  if (opt('json', false)) writeFileSync(String(opt('json')), JSON.stringify(results, null, 1));
} finally {
  await closeBrowser();
  await server.close();
}
