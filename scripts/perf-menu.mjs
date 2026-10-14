// Menu performance profile (headless, NOT part of any test group; nothing here changes the game).
// Written for src/delivery/PROFILE-menu-14-Oct.md, which has the numbers this script produced and how to read them.
//
//   node scripts/perf-menu.mjs build                   vite build with a module map: every chunk raw / gzip / brotli, what is
//                                                      eager (on the first page's script tags and modulepreloads) and what is lazy,
//                                                      level JSON / themes / idea models / sounds counted per chunk
//   node scripts/perf-menu.mjs load [--cpu=1,4,6] [--net=none,4g,slow4g] [--warm]
//                                                      the BUILT site served from a local static server (brotli, ETag, no max-age,
//                                                      as the Cloudflare Worker serves it), time to first menu in headless Chromium
//                                                      under CDP CPU throttling and network throttling. --runs=3 repeats (median)
//   node scripts/perf-menu.mjs frames [--size=1100x650,390x844] [--dpr=1,3] [--cpu=1] [--seconds=3]
//                                                      the menu's frame cost on the Vite dev server (so the page can import the game's
//                                                      own modules): per scenario, the rAF callback time on the main thread, draws and
//                                                      triangles of the shared view renderer, WebGL contexts alive, programs
//   node scripts/perf-menu.mjs entry [--warm] [--cpu=1,4]
//                                                      showroom entry / car switch hitch: time to build a model, upload + compile on
//                                                      the first frame, with and without an idle warm-up (the warm-up is a throwaway
//                                                      script run in the page, not game code)
//   node scripts/perf-menu.mjs profile [--dev] [--cpu=4] [--net=4g]   a CPU profile + trace of one load (--dev: unminified, by module)
//   node scripts/perf-menu.mjs eval "<js>"             run an expression in the dev-server menu page (exploration)
//   node scripts/perf-menu.mjs all                     build, load, frames, entry
// --gl=stub (default) replaces WebGL with a no-op context so only the page's JavaScript is timed (draw calls / triangles /
// programs are still counted by three.js); --gl=soft uses SwiftShader. Frames are pumped by hand after the menu is up (the
// container's compositor is starved), so frame numbers are JS ms per frame, never fps. The stage picture is hidden for those
// (--keep-shot keeps it). --prof adds a CPU profile of the showroom steps in 'entry'. The machine was shared and loaded
// (load average up to 30) for part of the runs: repeat on a quiet one before quoting a single number.
// Options: --browser=<path> (default: /opt/pw-browsers/chromium-*/chrome-linux/chrome, then chrome / chromium on PATH), --json=<file>
// (write the raw numbers too), --keep (leave the build in the temp folder).
//
// HONESTY: the only GL here is SwiftShader (software, on the CPU). Draw-call and triangle COUNTS are real. Anything that
// waits on the GPU (frame time, shader compile, texture upload, readback) is a CPU number that says nothing about a phone's
// GPU: it is reported as such. CPU throttling (Emulation.setCPUThrottlingRate) slows the page's main thread only, not the
// GPU process, and is a rough stand-in for a mid phone (4x) or a low one (6x).
import { createServer as createViteServer, build as viteBuild } from 'vite';
import { createServer as createHttp } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, extname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync, brotliCompressSync, constants as zc } from 'node:zlib';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const mode = args.find(a => !a.startsWith('--')) || 'all';
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const list = (name, fallback) => String(opt(name, fallback)).split(',').filter(Boolean);
const ROOT = resolve('.');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const kb = (n) => (n / 1024).toFixed(1);
const results = {};

// ---- the browser, driven over the DevTools protocol (no playwright needed) ------------------------------------------
const findBrowser = () => {
  if (opt('browser', null)) return opt('browser');
  const pw = '/opt/pw-browsers';
  if (existsSync(pw)) for (const d of readdirSync(pw).sort().reverse()) { const p = join(pw, d, 'chrome-linux', 'chrome'); if (d.startsWith('chromium-') && existsSync(p)) return p; }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync) || 'chromium';
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
  tmp = mkdtempSync(join(tmpdir(), 'perf-menu-'));
  const profile = join(tmp, 'profile');
  mkdirSync(profile);
  proc = spawn(findBrowser(), [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), '--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle',
    '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-extensions', '--disable-component-update', '--disable-background-networking',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--autoplay-policy=no-user-gesture-required', '--user-data-dir=' + profile, '--remote-debugging-port=0', 'about:blank'],
  { stdio: 'ignore', env: { ...process.env, TMPDIR: tmp } });
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
  // The first WebGL context of a browser starts its GPU process (SwiftShader here), which costs 1 to 3 s in this container and
  // is blocked on by the first GL call of whatever page asks (getContext / setSize in a CPU profile). That is an artifact of
  // software GL, not the game's: unless --cold-gpu is given, one throwaway page makes a context first, so every measured page
  // pays only its own GL work.
  if (!opt('cold-gpu', false)) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Runtime.evaluate', { expression: `(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); g.clearColor(0,0,0,1); g.clear(g.COLOR_BUFFER_BIT); g.finish(); return !!g; })()`, returnByValue: true }, sessionId);
    await send('Target.closeTarget', { targetId });
  }
};
const closeBrowser = async () => {
  try { await send('Browser.close', {}, undefined, 4000); } catch { /* gone */ }
  try { socket?.close(); } catch { /* closed */ }
  if (proc && proc.exitCode === null) { await Promise.race([new Promise(r => proc.once('exit', r)), sleep(4000)]); try { proc.kill('SIGKILL'); } catch { /* gone */ } }
  proc = socket = null;
  if (tmp && !opt('keep', false)) { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* held */ } }
};
process.on('exit', () => { try { proc?.kill('SIGKILL'); } catch { /* gone */ } });
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { try { proc?.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });

// A page: its own tab, sized (CSS px) at a device pixel ratio, with the CPU and the network throttled as asked, and a
// small probe injected before any script runs (it counts WebGL contexts, wraps requestAnimationFrame to time callbacks,
// and notes when the start screen's stage is first filled).
const PROBE = String.raw`(() => {
  const P = window.__perf = { contexts: 0, ctxList: [], raf: [], rafBusy: 0, rafCalls: 0, marks: {}, longtasks: [], renders: [], rafLog: [] };
  const mark = (k) => { if (!(k in P.marks)) P.marks[k] = performance.now(); };
  P.mark = mark;
  // time spent INSIDE WebGL calls on the main thread, by call name: under SwiftShader that is the software GPU, and says
  // nothing about a phone; everything else on the main thread is the page's own JavaScript and is real
  P.gl = { ms: 0, calls: 0, by: {} };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    for (const name of Object.getOwnPropertyNames(C.prototype)) {
      let d; try { d = Object.getOwnPropertyDescriptor(C.prototype, name); } catch (e) { continue; }
      if (!d || typeof d.value !== 'function' || name === 'constructor') continue;
      const orig = d.value;
      C.prototype[name] = function (...a) { const t = performance.now(); try { return orig.apply(this, a); } finally { const e = performance.now() - t; P.gl.ms += e; P.gl.calls++; const b = P.gl.by[name] || (P.gl.by[name] = [0, 0]); b[0] += e; b[1]++; } };
    }
  }
  const addGl = (name, e) => { P.gl.ms += e; P.gl.calls++; const b = P.gl.by[name] || (P.gl.by[name] = [0, 0]); b[0] += e; b[1]++; };
  for (const name of ['width', 'height']) { // (resizing a WebGL canvas reallocates its buffer: synchronous under software GL)
    const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, name);
    Object.defineProperty(HTMLCanvasElement.prototype, name, { get: d.get, set(v) { const t = performance.now(); d.set.call(this, v); if (this.__counted) addGl('canvas.' + name + '=', performance.now() - t); }, configurable: true });
  }
  { const d2 = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) { const t = performance.now(); try { return d2.call(this, img, ...a); } finally { if (img && img.__counted) addGl('2d.drawImage(webgl canvas)', performance.now() - t); } }; }
  P.blob = { n: 0, ms: 0, px: 0 };
  { const tb = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function (...a) { const t = performance.now(); try { return tb.apply(this, a); } finally { P.blob.n++; P.blob.ms += performance.now() - t; P.blob.px += this.width * this.height; } }; }
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const a = performance.now();
    const c = getContext.call(this, type, ...rest);
    if (c && /webgl/.test(type) && !this.__counted) { this.__counted = true; P.contexts++; P.ctxList.push({ at: Math.round(a), ms: Math.round(performance.now() - a), id: this.id || '(offscreen canvas)', w: this.width, h: this.height }); }
    return c;
  };
  const raf = window.requestAnimationFrame.bind(window);
  P.measuring = false; P.sites = {}; P.ticks = [];
  const labels = new WeakMap();
  const siteOf = (stack) => { const lines = String(stack).split('\n').slice(2); for (const l of lines) { const m = l.match(/([^/\s(]+\.js)[^:]*:(\d+):\d+\)?$/); if (m && !/perf|__probe/.test(l)) return m[1].replace(/\?.*$/, '') + ':' + m[2]; } return '(unknown)'; };
  // Every rAF callback is kept in a queue too: P.pump(n) runs n frames by hand (60 Hz of virtual time, no compositor, no vsync),
  // so a frame's JavaScript cost can be measured on a machine whose real frame production is starved or software-composited.
  // While P.manualOnly is set the real rAF leaves the callbacks to the pump; P.release() hands them back to it.
  const Q = []; P.Q = Q; P.manualOnly = false; P.vt = performance.now();
  let nextId = 1; const byId = new Map();
  const run = (e, t) => {
    if (e.done) return; e.done = true; byId.delete(e.id);
    const a = performance.now();
    try { e.cb(t); } finally {
      const d = performance.now() - a;
      if (P.rafLog.length < 400) P.rafLog.push([Math.round(a), Math.round(d * 10) / 10]);
      if (P.measuring) { P.raf.push(d); P.rafBusy += d; P.rafCalls++; P.stepMs += d; const x = P.sites[e.label] || (P.sites[e.label] = [0, 0]); x[0] += d; x[1]++; }
    }
  };
  window.requestAnimationFrame = (cb) => {
    let label = labels.get(cb);
    if (!label) { label = siteOf(new Error().stack); labels.set(cb, label); }
    const e = { cb, label, done: false, id: nextId++ };
    byId.set(e.id, e);
    Q.push(e);
    raf((t) => { if (!P.manualOnly) { run(e, t); mark('firstRaf'); } });
    return e.id;
  };
  window.cancelAnimationFrame = (id) => { const e = byId.get(id); if (e) { e.done = true; byId.delete(id); } };
  P.stepMs = 0; P.steps = [];
  P.pump = async (n, dt = 1000 / 60) => {
    for (let i = 0; i < n; i++) {
      P.vt += dt; P.stepMs = 0;
      const batch = Q.splice(0).filter(e => !e.done);
      for (const e of batch) run(e, P.vt);
      if (P.measuring) P.steps.push(P.stepMs);
      if (i % 4 === 3) await new Promise(r => setTimeout(r, 0)); // (timers, observers and decodes get their turn)
    }
  };
  P.release = () => { P.manualOnly = false; for (const e of Q.splice(0)) if (!e.done) { Q.push(e); raf((t) => { if (!P.manualOnly) run(e, t); }); } };
  { const tick = () => { P.ticks.push(performance.now()); if (P.ticks.length > 20000) P.ticks.splice(0, 10000); raf(tick); }; raf(tick); } // (a frame clock of its own: the gaps between frames are the hitches)
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') mark('fcp'); }).observe({ type: 'paint', buffered: true });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* none */ }
  document.addEventListener('DOMContentLoaded', () => {
    mark('dcl');
    const stage = document.getElementById('stage');
    if (stage) new MutationObserver(() => { if (stage.children.length) { mark('stageFilled'); raf(() => raf(() => mark('menuPainted'))); } }).observe(stage, { childList: true, subtree: true });
  });
  window.addEventListener('load', () => mark('load'));
})();`;

// A WebGL context that does nothing (--gl=stub): every call returns at once with a plausible answer, so what is left on the
// main thread is the page's own JavaScript (three.js bookkeeping included) with no software-GPU time in it. three.js counts
// draw calls, triangles and programs itself (renderer.info), so those stay exact. Nothing is drawn, so nothing here says what
// a real GPU would cost: that is the part that cannot be measured in this container.
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
const openPage = async (url, { width = 1100, height = 650, dpr = 1, cpu = 1, net = null, cache = false, mobile = false, quiet = true, gl = opt('gl', 'stub') } = {}) => {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const logs = [], requests = new Map();
  listeners.set(sessionId, (m) => {
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]);
    if (m.method === 'Network.requestWillBeSent') requests.set(m.params.requestId, { url: m.params.request.url, start: m.params.timestamp });
    if (m.method === 'Network.responseReceived') { const r = requests.get(m.params.requestId); if (r) { r.status = m.params.response.status; r.type = m.params.type; r.mime = m.params.response.mimeType; r.fromCache = m.params.response.fromDiskCache; } }
    if (m.method === 'Network.loadingFinished') { const r = requests.get(m.params.requestId); if (r) { r.end = m.params.timestamp; r.encoded = m.params.encodedDataLength; } }
    if (m.method === 'Network.loadingFailed') { const r = requests.get(m.params.requestId); if (r) r.failed = m.params.errorText; }
  });
  const S = (method, params, timeout) => send(method, params, sessionId, timeout);
  await S('Page.enable'); await S('Page.bringToFront'); await S('Emulation.setFocusEmulationEnabled', { enabled: true }); await S('Runtime.enable'); await S('Network.enable'); await S('Performance.enable');
  await S('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile });
  if (mobile) await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await S('Network.setCacheDisabled', { cacheDisabled: !cache });
  if (net) await S('Network.emulateNetworkConditions', { offline: false, latency: net.latency, downloadThroughput: net.down, uploadThroughput: net.up });
  if (cpu > 1) await S('Emulation.setCPUThrottlingRate', { rate: cpu });
  await S('Page.addScriptToEvaluateOnNewDocument', { source: (gl === 'stub' ? STUB : '') + PROBE });
  const page = {
    S, sessionId, logs, requests,
    eval: async (expression, timeout = 120000) => {
      const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);
      if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text).split('\n').slice(0, 3).join(' | '));
      return r.result.value;
    },
    metrics: async () => Object.fromEntries((await S('Performance.getMetrics')).metrics.map(m => [m.name, m.value])),
    close: async () => { listeners.delete(sessionId); try { await send('Target.closeTarget', { targetId }, undefined, 5000); } catch { /* gone */ } },
  };
  page.goto = async (to) => { await S('Page.navigate', { url: to }); };
  void quiet;
  return page;
};
const waitFor = async (page, expr, ms = 60000, every = 100) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await page.eval(expr)) return true; } catch { /* page not ready */ } await sleep(every); }
  return false;
};

// ---- servers --------------------------------------------------------------------------------------------------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.wav']);
// the built site as a Cloudflare static-assets Worker serves it: brotli, an ETag, revalidated on every visit (max-age=0)
const staticServer = (dir) => new Promise((done) => {
  const cache = new Map();
  const server = createHttp((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/') { res.writeHead(302, { location: '/delivery/' }); return res.end(); }
    if (path.endsWith('/')) path += 'index.html';
    let file = join(dir, path);
    if (!existsSync(file) && existsSync(file + '.html')) file += '.html';
    if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
    const ext = extname(file);
    let entry = cache.get(file);
    if (!entry) {
      const raw = readFileSync(file);
      entry = { raw, br: COMPRESSIBLE.has(ext) ? brotliCompressSync(raw, { params: { [zc.BROTLI_PARAM_QUALITY]: 9, [zc.BROTLI_PARAM_SIZE_HINT]: raw.length } }) : null, etag: '"' + createHash('md5').update(raw).digest('hex').slice(0, 16) + '"' };
      cache.set(file, entry);
    }
    const headers = { 'content-type': MIME[ext] || 'application/octet-stream', etag: entry.etag, 'cache-control': 'public, max-age=0, must-revalidate' };
    if (req.headers['if-none-match'] === entry.etag) { res.writeHead(304, headers); return res.end(); }
    const useBr = entry.br && /\bbr\b/.test(req.headers['accept-encoding'] || '');
    const body = useBr ? entry.br : entry.raw;
    if (useBr) headers['content-encoding'] = 'br';
    headers['content-length'] = body.length;
    res.writeHead(200, headers); res.end(body);
  });
  server.listen(0, '127.0.0.1', () => done({ port: server.address().port, close: () => server.close() }));
});
const devServer = async () => {
  const server = await createViteServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false }, optimizeDeps: { entries: ['delivery/index.html'] } });
  await server.listen();
  const port = server.httpServer.address().port;
  return { port, close: () => server.close() };
};

const NETS = { none: null,
  '4g': { latency: 70, down: 9 * 1024 * 1024 / 8, up: 4 * 1024 * 1024 / 8, label: '4G 9 Mbps down, 70 ms RTT' },
  slow4g: { latency: 150, down: 1.6 * 1024 * 1024 / 8, up: 750 * 1024 / 8, label: 'Slow 4G (Lighthouse mobile) 1.6 Mbps down, 150 ms RTT' } };

// ---- BUILD: chunk table ---------------------------------------------------------------------------------------------
let builtDir = null;
const BUILD_ONLY = () => mode === 'build';
const doBuild = async () => {
  const out = join(mkdtempSync(join(tmpdir(), 'perf-dist-')), 'dist');
  const modMap = {};
  const plugin = { name: 'perf-map', writeBundle(_, bundle) {
    for (const [f, c] of Object.entries(bundle)) if (c.type === 'chunk') modMap[f] = { entry: c.isEntry, imports: c.imports, dyn: c.dynamicImports, mods: Object.fromEntries(Object.entries(c.modules).map(([k, v]) => [relative(ROOT, k).split(sep).join('/'), v.renderedLength])) };
  } };
  await viteBuild({ root: ROOT, logLevel: 'silent', plugins: [plugin], build: { outDir: out, emptyOutDir: true, reportCompressedSize: false } });
  builtDir = out;
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : files.push(p); } };
  walk(out);
  const size = (p) => { const raw = readFileSync(p); return { raw: raw.length, gz: gzipSync(raw, { level: 9 }).length, br: brotliCompressSync(raw, { params: { [zc.BROTLI_PARAM_QUALITY]: 9 } }).length }; };
  const html = readFileSync(join(out, 'delivery/index.html'), 'utf8');
  const eagerSet = new Set();
  const addEager = (name) => { if (eagerSet.has(name) || !modMap[name]) return; eagerSet.add(name); for (const i of modMap[name].imports) addEager(i); };
  for (const m of html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)) addEager(m[1]);
  const chunks = Object.keys(modMap).map(name => ({ name, ...size(join(out, name)), eager: eagerSet.has(name), page: modMap[name].entry ? (Object.entries(modMap).length && '') : '' }));
  // which page's entry is each entry chunk
  const group = (name) => name.replace(/^assets\//, '').replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
  const total = (list, k) => list.reduce((a, c) => a + c[k], 0);
  const eager = chunks.filter(c => c.eager), lazyMenu = chunks.filter(c => !c.eager && modMap[c.name].mods && Object.keys(modMap[c.name].mods).length && !/^assets\/(editor|modeleditor|gimmicks|powerups|sides|police|cargo)-/.test(c.name));
  console.log('\n== BUILD: JS chunks (raw / gzip / brotli q9, bytes as served) ==');
  console.log('chunk'.padEnd(26) + 'raw KB'.padStart(9) + 'gzip KB'.padStart(9) + 'brotli KB'.padStart(10) + '  first menu page?   biggest modules (rendered, pre-minify bytes)');
  for (const c of chunks.sort((a, b) => b.raw - a.raw)) {
    const mods = Object.entries(modMap[c.name].mods);
    const bucket = {};
    for (const [k, v] of mods) { const key = k.includes('node_modules/three') ? 'three' : /src\/delivery\/levels\/.*\.json$/.test(k) ? 'levels/*.json' : /render\/themes\//.test(k) ? 'render/themes/*' : /render\/ideaModels/.test(k) ? 'render/ideaModels*' : /render\/carlights/.test(k) ? 'carlights*' : /render\/(cargoModels|modelsOrig)/.test(k) ? k.match(/render\/(cargoModels|modelsOrig)/)[1] + '*' : k.replace(/^src\/delivery\//, ''); bucket[key] = (bucket[key] || 0) + v; }
    const top = Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ' ' + kb(v)).join(', ');
    console.log(group(c.name).padEnd(26) + kb(c.raw).padStart(9) + kb(c.gz).padStart(9) + kb(c.br).padStart(10) + '  ' + (c.eager ? 'EAGER' : 'lazy ').padEnd(18) + top);
  }
  console.log(`\nEAGER (script tag + modulepreloads of delivery/index.html): ${eager.length} chunks, raw ${kb(total(eager, 'raw'))} KB, gzip ${kb(total(eager, 'gz'))} KB, brotli ${kb(total(eager, 'br'))} KB`);
  const css = files.filter(f => f.endsWith('.css') && /delivery-/.test(f)).map(f => ({ f, ...size(f) }));
  for (const c of css) console.log(`CSS ${relative(out, c.f)}: raw ${kb(c.raw)} KB, gzip ${kb(c.gz)}, brotli ${kb(c.br)}`);
  const lazyOfMenu = chunks.filter(c => !c.eager && modMap[html.match(/assets\/delivery-[^"]+\.js/)?.[0]]?.dyn.includes(c.name));
  console.log(`LAZY already (dynamic imports from the entry): ${lazyOfMenu.map(c => group(c.name) + ' ' + kb(c.raw) + ' KB').join(', ') || 'none'}`);
  // module-level counts in the eager set
  const modsIn = (pred) => { const found = []; for (const name of eagerSet) for (const [k, v] of Object.entries(modMap[name].mods)) if (pred(k)) found.push([k, v, name]); return found; };
  const levelsJson = modsIn(k => /src\/delivery\/levels\/[^/]+\.json$/.test(k)), themes = modsIn(k => /render\/themes\/[^/]+\.js$/.test(k)), ideas = modsIn(k => /render\/ideaModels/.test(k));
  const three = modsIn(k => k.includes('node_modules/three'));
  const cargo = modsIn(k => /render\/cargoModels/.test(k)), cars = modsIn(k => /render\/models(Orig\d?b?|Swan)?\.js$/.test(k));
  const allLevels = readdirSync('src/delivery/levels').filter(f => f.endsWith('.json')).length, allThemes = readdirSync('src/delivery/render/themes').filter(f => f.endsWith('.js')).length;
  const sum = (l) => l.reduce((a, x) => a + x[1], 0);
  const sound = files.filter(f => /\.(wav|mp3|ogg)$/.test(f)).map(f => ({ n: relative(out, f), raw: statSync(f).size })).sort((a, b) => b.raw - a.raw);
  const images = files.filter(f => /\.(jpg|png)$/.test(f)), imgBytes = images.reduce((a, f) => a + statSync(f).size, 0);
  const lvShots = images.filter(f => /assets\/[^/]+\.jpg$/.test(f));
  console.log(`\nIN THE EAGER SET (source bytes before minify): level JSON ${levelsJson.length} of ${allLevels} files, ${kb(sum(levelsJson))} KB; theme modules ${themes.length} of ${allThemes} files, ${kb(sum(themes))} KB; idea model files ${ideas.length}, ${kb(sum(ideas))} KB; cargo model files ${cargo.length}, ${kb(sum(cargo))} KB; three.js ${kb(sum(three))} KB; car model files ${cars.length}, ${kb(sum(cars))} KB`);
  console.log(`SOUNDS in the build (fetched on demand, not in any chunk): ${sound.length} files, ${kb(sound.reduce((a, s) => a + s.raw, 0))} KB; biggest: ${sound.slice(0, 4).map(s => s.n.replace('assets/', '') + ' ' + kb(s.raw)).join(', ')}`);
  console.log(`PICTURES: ${images.length} jpg/png, ${kb(imgBytes)} KB in all (${lvShots.length} files in assets/)`);
  results.build = { chunks: chunks.map(({ name, raw, gz, br, eager: e }) => ({ name, raw, gz, br, eager: e })), eager: { n: eager.length, raw: total(eager, 'raw'), gz: total(eager, 'gz'), br: total(eager, 'br') }, levelsInEager: levelsJson.length, themesInEager: themes.length, ideaFilesInEager: ideas.length, levelJsonKB: sum(levelsJson) / 1024, themeKB: sum(themes) / 1024, ideaKB: sum(ideas) / 1024, cargoKB: sum(cargo) / 1024, threeKB: sum(three) / 1024, soundKB: sound.reduce((a, s) => a + s.raw, 0) / 1024 };
  void lazyMenu;
  return out;
};

// ---- LOAD: time to first menu on the built site -----------------------------------------------------------------------
const doLoad = async () => {
  const dir = builtDir || await doBuild();
  const server = await staticServer(dir);
  const runs = Number(opt('runs', 3));
  const cpus = list('cpu', '1,4,6').map(Number), nets = list('net', 'none,4g,slow4g');
  console.log('\n== LOAD: time to first menu, built site (' + dir + '), median of ' + runs + ' cold loads (cache off) ==');
  console.log('GL is SwiftShader: the menu does not wait on a real GPU here. CPU throttle slows the page main thread only.');
  console.log('cpu'.padEnd(6) + 'network'.padEnd(10) + 'FCP ms'.padStart(8) + 'scripts done'.padStart(14) + 'stage filled'.padStart(14) + 'menu painted'.padStart(14) + 'load evt'.padStart(10) + 'bytes over wire'.padStart(17) + 'requests'.padStart(10) + '  long tasks >50ms (sum)');
  results.load = [];
  await openBrowser();
  try {
    for (const net of nets) for (const cpu of cpus) {
      const rows = [];
      for (let i = 0; i < runs; i++) {
        const page = await openPage(`http://127.0.0.1:${server.port}/delivery/`, { cpu, net: NETS[net], cache: false });
        const t0 = Date.now();
        await page.goto(`http://127.0.0.1:${server.port}/delivery/`);
        const ok = await waitFor(page, `!!window.__perf && ('menuPainted' in window.__perf.marks)`, 240000, 150);
        const marks = ok ? await page.eval('window.__perf.marks') : {};
        const lt = ok ? await page.eval('window.__perf.longtasks') : [];
        const reqs = [...page.requests.values()].filter(r => r.end);
        const lastScript = Math.max(0, ...reqs.filter(r => /\.js(\?|$)/.test(r.url)).map(r => r.end - (reqs[0]?.start ?? 0)));
        const bytes = reqs.reduce((a, r) => a + (r.encoded || 0), 0);
        const timing = ok ? await page.eval(`(() => { const n = performance.getEntriesByType('navigation')[0]; const rs = performance.getEntriesByType('resource').filter(r => /\\.js/.test(r.name)); return { scriptsEnd: Math.max(...rs.map(r => r.responseEnd)), nav: n.responseStart }; })()`) : { scriptsEnd: NaN };
        rows.push({ fcp: marks.fcp, scripts: timing.scriptsEnd, filled: marks.stageFilled, painted: marks.menuPainted, load: marks.load, bytes, n: reqs.length, longSum: lt.reduce((a, t) => a + t[1], 0), wall: Date.now() - t0, errors: page.logs.length });
        void lastScript;
        await page.close();
      }
      const m = (k) => Math.round(median(rows.map(r => r[k])));
      console.log(String(cpu + 'x').padEnd(6) + net.padEnd(10) + String(m('fcp')).padStart(8) + String(m('scripts')).padStart(14) + String(m('filled')).padStart(14) + String(m('painted')).padStart(14) + String(m('load')).padStart(10) + (kb(m('bytes')) + ' KB').padStart(17) + String(m('n')).padStart(10) + '  ' + m('longSum') + ' ms');
      results.load.push({ cpu, net, fcp: m('fcp'), scriptsEnd: m('scripts'), stageFilled: m('filled'), menuPainted: m('painted'), load: m('load'), bytes: m('bytes'), requests: m('n'), longTaskSum: m('longSum') });
    }
    if (opt('warm', false)) {
      console.log('\nWARM (second visit, same profile, assets revalidated with If-None-Match -> 304; V8 code cache may help):');
      for (const net of nets) for (const cpu of cpus) {
        const rows = [];
        for (let i = 0; i < runs; i++) {
          const url = `http://127.0.0.1:${server.port}/delivery/`;
          const prime = await openPage(url, { cpu: 1, net: null, cache: true }); await prime.goto(url);
          await waitFor(prime, `!!window.__perf && ('menuPainted' in window.__perf.marks)`, 120000); await prime.close();
          const page = await openPage(url, { cpu, net: NETS[net], cache: true }); await page.goto(url);
          await waitFor(page, `!!window.__perf && ('menuPainted' in window.__perf.marks)`, 240000, 150);
          const marks = await page.eval('window.__perf.marks'); rows.push(marks.menuPainted); await page.close();
        }
        console.log(`  ${cpu}x ${net}: menu painted ${Math.round(median(rows))} ms`);
      }
    }
  } finally { await closeBrowser(); server.close(); }
};


// ---- PROFILE: where the load time goes (trace events + V8 CPU profile), on the built site or the dev server ------------
const doProfile = async () => {
  const dev = opt('dev', false);
  let server, base;
  if (dev) { server = await devServer(); base = `http://127.0.0.1:${server.port}/delivery/index.html`; }
  else { const dir = builtDir || await doBuild(); server = await staticServer(dir); base = `http://127.0.0.1:${server.port}/delivery/`; }
  const cpu = Number(list('cpu', '1')[0]), net = list('net', 'none')[0];
  await openBrowser();
  try {
    const page = await openPage(base, { cpu, net: NETS[net], cache: false });
    const S = page.S, events = [];
    listeners.set(page.sessionId + '#t', null);
    const prev = listeners.get(page.sessionId);
    listeners.set(page.sessionId, (m) => { if (m.method === 'Tracing.dataCollected') events.push(...m.params.value); prev(m); });
    // (Tracing is a browser-level domain: its events come to the browser session, not the page's)
    const browserEvents = [];
    const onMsg = (m) => { const d = JSON.parse(m.data); if (d.method === 'Tracing.dataCollected') browserEvents.push(...d.params.value); if (d.method === 'Tracing.tracingComplete') done(); };
    let done; const complete = new Promise(r => { done = r; });
    socket.addEventListener('message', onMsg);
    await send('Tracing.start', { categories: 'devtools.timeline,v8,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
    await S('Profiler.enable'); await S('Profiler.setSamplingInterval', { interval: 500 }); await S('Profiler.start');
    const t0 = Date.now();
    await page.goto(base);
    const ok = await waitFor(page, `!!window.__perf && ('menuPainted' in window.__perf.marks)`, 300000, 150);
    const wall = Date.now() - t0;
    const marks = ok ? await page.eval('window.__perf.marks') : {};
    const info = await page.eval('({ ctx: window.__perf.ctxList, raf: window.__perf.rafLog.slice(0, 12), gl: window.__perf.gl })');
    const mt = await page.metrics();
    console.log(`main thread busy (TaskDuration) ${(mt.TaskDuration * 1000).toFixed(0)} ms, script ${(mt.ScriptDuration * 1000).toFixed(0)} ms, layout ${(mt.LayoutDuration * 1000).toFixed(0)} ms, style ${(mt.RecalcStyleDuration * 1000).toFixed(0)} ms; time inside WebGL calls ${info.gl.ms.toFixed(0)} ms in ${info.gl.calls} calls (software GL: NOT a phone's number); biggest: ` + Object.entries(info.gl.by).sort((a, b) => b[1][0] - a[1][0]).slice(0, 6).map(([k, v]) => `${k} ${v[0].toFixed(0)}ms/${v[1]}`).join(', '));
    console.log('WebGL contexts made during load: ' + info.ctx.map(c => `${c.id} at ${c.at} ms took ${c.ms} ms`).join('; '));
    console.log('first rAF callbacks [start ms, duration ms]: ' + JSON.stringify(info.raf));
    const { profile } = await S('Profiler.stop', {}, 120000);
    await send('Tracing.end'); await complete; socket.removeEventListener('message', onMsg);
    console.log(`\n== PROFILE of the load (${dev ? 'Vite dev server, unminified, many requests' : 'built site'}), cpu ${cpu}x, net ${net}: menu painted at ${Math.round(marks.menuPainted)} ms (wall ${wall}) ==`);
    // trace: per event name, total duration on the renderer main thread (inclusive: they nest)
    const rendererMain = new Set(browserEvents.filter(e => e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map(e => e.pid + ':' + e.tid));
    const per = {};
    for (const e of browserEvents) if (e.ph === 'X' && rendererMain.has(e.pid + ':' + e.tid) && e.dur) { const k = e.name; (per[k] ||= { n: 0, ms: 0 }); per[k].n++; per[k].ms += e.dur / 1000; }
    const want = ['EvaluateScript', 'v8.compile', 'V8.CompileCode', 'v8.run', 'FunctionCall', 'RunTask', 'ParseHTML', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'MinorGC', 'MajorGC', 'V8.GC_MC_BACKGROUND_MARKING', 'ResourceFinish', 'ImageDecodeTask', 'Decode Image', 'GPUTask', 'v8.callFunction', 'V8.ScriptCompiler', 'V8.DeserializeCode'];
    console.log('trace (CrRendererMain, inclusive, they nest): ' + want.filter(k => per[k]).map(k => `${k} ${per[k].ms.toFixed(0)}ms/${per[k].n}`).join(', '));
    const top = Object.entries(per).sort((a, b) => b[1].ms - a[1].ms).slice(0, 14).map(([k, v]) => `${k} ${v.ms.toFixed(0)}ms/${v.n}`).join(', ');
    console.log('trace, biggest names: ' + top);
    // CPU profile: self time by script url and by function
    const nodes = new Map(profile.nodes.map(n => [n.id, n]));
    const self = new Map();
    const dt = profile.timeDeltas; 
    for (let i = 0; i < profile.samples.length; i++) self.set(profile.samples[i], (self.get(profile.samples[i]) || 0) + (dt[i] || 0));
    const byUrl = {}, byFn = {};
    for (const [id, us] of self) {
      const n = nodes.get(id), f = n.callFrame, url = (f.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '') || f.functionName || '(native)';
      byUrl[url] = (byUrl[url] || 0) + us / 1000;
      const k = (f.functionName || '(anon)') + ' ' + url.split('/').slice(-1)[0] + ':' + f.lineNumber;
      byFn[k] = (byFn[k] || 0) + us / 1000;
    }
    const topn = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `  ${v.toFixed(0).padStart(6)} ms  ${k}`).join('\n');
    console.log('CPU profile, self time by script:\n' + topn(byUrl, Number(opt('top', 16))));
    console.log('CPU profile, self time by function:\n' + topn(byFn, Number(opt('top', 16))));
    results.profile = { dev, cpu, net, menuPainted: marks.menuPainted, trace: per, byUrl };
    await page.close();
  } finally { await closeBrowser(); server.close(); }
};


// ---- shared by FRAMES and ENTRY: a dev-server page at the first menu, with the game's own modules reachable ------------------
// (the Vite dev server serves each module at one address, so import() from the page gives the very instance the game runs)
const HOOK = String.raw`(async () => {
  const P = window.__perf;
  const three = performance.getEntriesByType('resource').map(r => r.name).find(n => /deps\/three\.js/.test(n));
  P.threeUrl = three;
  const T = await import(three);
  P.renderers = new Map(); P.renderLog = []; P.renderMs = 0;
  const label = (r) => { const c = r.domElement; return c.id || (c.__label ||= (c.isConnected ? 'in-dom-canvas' : 'view-renderer(offscreen)')); };
  // (in three r160 render() is made per instance inside the constructor, not on the prototype: each live renderer is wrapped)
  const wrap = (r, name) => {
    if (!r || r.__wrapped) return; r.__wrapped = true;
    const orig = r.render.bind(r);
    r.render = (scene, camera) => {
      const t = performance.now();
      orig(scene, camera);
      const ms = performance.now() - t, i = r.info;
      if (P.measuring) P.renderLog.push([name, ms, i.render.calls, i.render.triangles, i.render.points, i.render.lines]);
      P.renderers.set(name, { programs: i.programs ? i.programs.length : 0, geometries: i.memory.geometries, textures: i.memory.textures, size: [r.domElement.width, r.domElement.height], pr: r.getPixelRatio() });
    };
  };
  const [{ renderer }, { sharedRenderer }] = await Promise.all([import('/src/delivery/render/scene.js'), import('/src/delivery/render/modelviews.js')]);
  P.wrap = wrap; P.gameRenderer = renderer;
  wrap(renderer, 'game-canvas'); wrap(sharedRenderer(), 'shared-view-renderer');
  P.three = T;
  return true;
})()`;
const gotoMenu = async (url, o = {}) => {
  const page = await openPage(url, o);
  await page.goto(url);
  const ok = await waitFor(page, `!!window.__perf && ('menuPainted' in window.__perf.marks)`, 240000, 150);
  if (!ok) throw new Error('the menu did not come up at ' + url + (page.logs.length ? ': ' + page.logs.join(' | ') : ''));
  await page.eval(HOOK);
  // Under software compositing the stage's big picture (a 1920x854 JPEG with a slow CSS drift) alone holds the page to about
  // 1 frame a second (hidden: ~20): a SwiftShader / no-GPU artifact that would hide every other cost. Unless --keep-shot is
  // given it is hidden for the frame measurements (the load measurements above keep it).
  if (!opt('keep-shot', false)) await page.eval(`(() => { const st = document.createElement('style'); st.textContent = '#startScreen .menu-stage .shot { background-image: none !important; animation: none !important }'; document.head.append(st); return true; })()`);
  await sleep(Number(opt('settle', 1500)));
  // (the first canvas.toBlob of a browser starts its 2D-canvas encoder, 1 to 2 s under software GL here and nothing like it on a
  // phone: done once now, so no step below pays for it)
  await page.eval(`new Promise(r => { const c = document.createElement('canvas'); c.width = c.height = 64; c.getContext('2d').fillRect(0, 0, 9, 9); c.toBlob(() => r(1)); })`);
  await page.eval('window.__perf.manualOnly = true; true');
  return page;
};
// time passing in a page whose frames are pumped by hand: the frames, and real time for timers, observers and decodes
const adv = async (page, ms) => { const n = Math.max(1, Math.round(ms / 16.7)); await page.eval(`window.__perf.manualOnly = true; window.__perf.pump(${n})`, 300000); await sleep(Math.min(ms, 400)); await page.eval(`window.__perf.pump(${n})`, 300000); };
const press = (page, code) => page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(code.replace(/^Key/, '').toLowerCase())}, bubbles: true, cancelable: true }))`);
const importIn = (page, path, names) => page.eval(`import(${JSON.stringify('/src/delivery/' + path)}).then(m => { window.__m = window.__m || {}; Object.assign(window.__m, { ${names.map(n => n + ': m.' + n).join(', ')} }); return true; })`);

// A window of frames, measured in the page: rAF callbacks by call site, renders by canvas (draw calls, triangles), allocation
const measureWindow = async (page, seconds, { alloc = true } = {}) => {
  await page.eval(`(() => { const P = window.__perf; P.raf = []; P.rafBusy = 0; P.rafCalls = 0; P.sites = {}; P.renderLog = []; P.steps = []; P.gl.ms = 0; P.gl.calls = 0; P.gl.by = {}; P.t0 = performance.now(); P.measuring = true; P.manualOnly = true; })()`);
  if (alloc) { await page.S('HeapProfiler.enable'); await page.S('HeapProfiler.startSampling', { samplingInterval: 2048, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); }
  const m0 = await page.metrics();
  await page.eval(`window.__perf.pump(${Math.round(seconds * 60)})`, 300000);
  const m1 = await page.metrics();
  let heap = null;
  if (alloc) { const { profile } = await page.S('HeapProfiler.stopSampling'); heap = profile; }
  const r = await page.eval(`(() => { const P = window.__perf; const dur = performance.now() - P.t0; P.measuring = false; const gaps = P.steps.slice(); return { dur, frames: P.steps.length, gaps, sites: P.sites, rafBusy: P.rafBusy, rafCalls: P.rafCalls, renderLog: P.renderLog, renderers: [...P.renderers], contexts: P.contexts, ctx: P.ctxList.map(c => c.id), gl: P.gl }; })()`);
  let allocBytes = 0; const bySite = {};
  if (heap) {
    const walk = (n) => { const f = n.callFrame; const k = (f.functionName || '(anon)') + ' ' + (f.url || '').split('/').pop().replace(/\?.*/, '') + ':' + f.lineNumber; if (n.selfSize) { allocBytes += n.selfSize; bySite[k] = (bySite[k] || 0) + n.selfSize; } n.children.forEach(walk); };
    walk(heap.head);
  }
  const frames = Math.max(1, r.frames), sec = r.dur / 1000;
  const q = (a, f) => { const x = [...a].sort((u, v) => u - v); return x.length ? x[Math.min(x.length - 1, Math.floor(f * x.length))] : NaN; };
  const byCanvas = {};
  for (const [c, ms, calls, tris] of r.renderLog) { const b = byCanvas[c] || (byCanvas[c] = { n: 0, ms: 0, calls: 0, tris: 0 }); b.n++; b.ms += ms; b.calls += calls; b.tris += tris; }
  return {
    gapP50: q(r.gaps, 0.5), gapP95: q(r.gaps, 0.95), gapMax: Math.max(0, ...r.gaps), // (a step's total JS ms, all callbacks)
    rafMsPerFrame: r.rafBusy / frames, taskMsPerSec: ((m1.TaskDuration - m0.TaskDuration) * 1000) / sec, scriptMsPerSec: ((m1.ScriptDuration - m0.ScriptDuration) * 1000) / sec,
    sites: Object.entries(r.sites).map(([k, [ms, n]]) => ({ site: k, msPerFrame: ms / frames, perSec: n / sec })).sort((a, b) => b.msPerFrame - a.msPerFrame),
    renders: Object.entries(byCanvas).map(([c, b]) => ({ canvas: c, perFrame: b.n / frames, msPerRender: b.ms / b.n, callsPerRender: b.calls / b.n, trisPerRender: b.tris / b.n })),
    renderers: r.renderers, contexts: r.contexts, ctxIds: r.ctx, allocKBperFrame: allocBytes / 1024 / frames, allocTop: Object.entries(bySite).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${(v / 1024 / frames).toFixed(1)} KB/f`),
    glMs: r.gl.ms / frames,
  };
};
const showWindow = (name, w) => {
  const rd = w.renders.map(x => `${x.canvas} x${x.perFrame.toFixed(2)}/f (${x.callsPerRender.toFixed(0)} calls, ${(x.trisPerRender / 1000).toFixed(1)}k tris each, ${x.msPerRender.toFixed(2)} ms)`).join('; ') || 'none';
  console.log(`  ${name.padEnd(34)} frame JS p50 ${w.gapP50.toFixed(2)} p95 ${w.gapP95.toFixed(2)} max ${w.gapMax.toFixed(1)} ms, mean ${w.rafMsPerFrame.toFixed(2)} ms | alloc ${w.allocKBperFrame.toFixed(0)} KB/frame | draws: ${rd}`);
  console.log(`      rAF by call site: ${w.sites.slice(0, 4).map(x => `${x.site} ${x.msPerFrame.toFixed(2)} ms/f`).join(', ')}   alloc: ${w.allocTop.slice(0, 3).join(' | ')}`);
};

// ---- FRAMES -------------------------------------------------------------------------------------------------------
const doFrames = async () => {
  const server = await devServer();
  const base = `http://127.0.0.1:${server.port}/delivery/index.html`;
  const sizes = list('size', '1100x650,390x844').map(x => x.split('x').map(Number)), dprs = list('dpr', '1,3').map(Number), cpu = Number(list('cpu', '1')[0]);
  const seconds = Number(opt('seconds', 3));
  results.frames = [];
  await openBrowser();
  console.log(`\n== FRAMES: the menu's cost per frame (Vite dev server, GL=${opt('gl', 'stub')}, cpu ${cpu}x, ${seconds} s windows) ==`);
  try {
    for (const [width, height] of sizes) for (const dpr of dprs) {
      const mobile = width < 600;
      console.log(`\n-- ${width}x${height}, device pixel ratio ${dpr}${mobile ? ' (touch / mobile emulation: the game caps the main canvas at 1.5 there)' : ''} --`);
      const page = await gotoMenu(base, { width, height, dpr, cpu, mobile });
      try {
        const rec = (name, w) => { showWindow(name, w); results.frames.push({ width, height, dpr, name, ...w }); };
        rec('first menu screen (idle)', await measureWindow(page, seconds));
        await importIn(page, 'render/cosmeticsui.js', ['Cosmetics']);
        await importIn(page, 'render/showroom.js', ['Showroom']);
        await importIn(page, 'render/garage.js', ['Garage']);
        await importIn(page, 'render/ideaslot.js', ['IdeasLot']);
        await importIn(page, 'render/modelviews.js', ['sharedRenderer']);
        // level tabs: step through levels and the three tabs, then measure what settles
        for (let i = 0; i < 6; i++) { await press(page, 'ArrowRight'); await adv(page, 250); }
        rec('after 6 levels stepped', await measureWindow(page, seconds));
        await press(page, 'KeyT'); await adv(page, 600);
        rec('next tab (Races)', await measureWindow(page, seconds));
        await press(page, 'KeyT'); await adv(page, 300); await press(page, 'KeyT'); await adv(page, 600);
        // road card ("What's on this road"): 3D tiles on the shared renderer
        await press(page, 'KeyI'); await adv(page, 1500);
        rec('road card open (tiles)', await measureWindow(page, seconds));
        await press(page, 'Escape'); await adv(page, 500);
        await page.eval(`window.__m.Showroom.isOpen ? 0 : 0`);
        // the showroom: cards (stills), then the full view (live car), a car switch, cosmetics
        await press(page, 'KeyG'); await adv(page, 4000);
        rec('showroom cards (stills settled)', await measureWindow(page, seconds));
        await press(page, 'Enter'); await adv(page, 1500);
        rec('showroom full view (live car)', await measureWindow(page, seconds));
        for (let i = 0; i < 3; i++) { await press(page, 'ArrowRight'); await adv(page, 400); }
        rec('full view after 3 car switches', await measureWindow(page, seconds));
        await press(page, 'KeyC'); await adv(page, 1500);
        rec('Cosmetics screen open', await measureWindow(page, seconds));
        await page.eval(`window.__m.Cosmetics.close(); true`); await adv(page, 300);
        // the car lot and its Car ideas tab (the game's own renderer; one page of 22 ideas is built)
        await page.eval(`window.__m.Garage.open(false, () => {}); true`); await adv(page, 2500);
        rec('car lot (garage) open', await measureWindow(page, seconds));
        await page.eval(`window.__m.IdeasLot.enter(); true`); await adv(page, 2500);
        rec('Car ideas lot open', await measureWindow(page, seconds));
        const ideas = await page.eval(`(() => { const r = window.__perf.renderers; return [...r].map(([k, v]) => k + ': ' + v.programs + ' programs, ' + v.geometries + ' geometries, ' + v.textures + ' textures'); })()`);
        console.log('      renderer memory now: ' + ideas.join('; '));
        if (page.logs.length) console.log('      page errors: ' + page.logs.slice(0, 3).join(' | '));
      } finally { await page.close(); }
    }
  } finally { await closeBrowser(); server.close(); }
};


// ---- ENTRY: the hitch of entering the showroom / switching cars, with and without an idle warm-up -------------------------
// The warm-up is a THROWAWAY script run in the page (nothing in the game changes): after the menu shows it builds a few cars
// the way the showroom does, asks the menu's shared renderer to compile their materials (renderer.compile) and draw them once
// (which uploads their buffers), and fetches the sounds the first key press would fetch, all in requestIdleCallback slices.
const WARM = String.raw`(async () => {
  const P = window.__perf, T = P.three;
  const [{ makeShowCar, paintShowCar }, { sharedRenderer, lit }, { CARS, CAR }] = await Promise.all([import('/src/delivery/render/showcar.js'), import('/src/delivery/render/modelviews.js'), import('/src/delivery/cars.js')]);
  const idle = () => new Promise(r => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 500 }) : setTimeout(r, 30)));
  const r = sharedRenderer(), t0 = performance.now(), slices = [];
  const programs0 = r.info.programs ? r.info.programs.length : 0;
  const picks = [CAR, ...CARS.filter(c => !c.idea && !c.tank && !c.ufo && c.id !== CAR.id).slice(0, +(P.warmCars ?? 3))];
  for (const car of picks) {
    await idle();
    const a = performance.now();
    try {
      const model = makeShowCar(car); paintShowCar(model, car, false);
      const scene = lit(); scene.add(model);
      const cam = new T.PerspectiveCamera(30, 1.6, 0.1, 400); cam.position.set(0, 3, 9); cam.lookAt(0, 1, 0);
      r.compile(scene, cam);
      r.setViewport(0, 0, 2, 2); r.setScissor(0, 0, 2, 2); r.render(scene, cam); // (uploads its buffers and links the programs it needs)
      // (geometries are given back; the MATERIALS are kept: disposing a material releases its compiled program, which is what
      // the warm-up is for. A handful of materials is a few KB.)
      (P.warmKeep ||= []).push(scene);
      scene.traverse((n) => { n.geometry?.dispose(); });
    } catch (e) { console.warn('warm-up: ' + e.message); }
    slices.push(+(performance.now() - a).toFixed(1));
  }
  // the sounds the first key press fetches (the HTTP cache is warmed; decoding needs the AudioContext a gesture allows)
  await idle();
  const urls = performance.getEntriesByType('resource').length ? [] : [];
  P.warmDone = { ms: performance.now() - t0, slices, programsBefore: programs0, programsAfter: r.info.programs ? r.info.programs.length : 0 };
  return P.warmDone;
})()`;
const profiled = new Set();
// a CPU profile's biggest self times, by function and file (what --prof prints for the showroom steps)
const printProfile = (title, profile) => {
  const nodes = new Map(profile.nodes.map(n => [n.id, n])), self = new Map();
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  const by = {}, byFile = {};
  for (const [id, us] of self) { const f = nodes.get(id).callFrame, file = (f.url || '').split('/').pop().replace(/\?.*/, '') || '(native)'; by[(f.functionName || '(anon)') + ' ' + file + ':' + f.lineNumber] = (by[(f.functionName || '(anon)') + ' ' + file + ':' + f.lineNumber] || 0) + us / 1000; byFile[file] = (byFile[file] || 0) + us / 1000; }
  const top = (o, n) => Object.entries(o).filter(([k]) => !/\(idle\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v.toFixed(0)}ms ${k}`).join(' | ');
  console.log(`   CPU profile of ${title}:\n      by function: ${top(by, 10)}\n      by file: ${top(byFile, 8)}`);
};
const doEntry = async () => {
  const server = await devServer();
  const base = `http://127.0.0.1:${server.port}/delivery/index.html`;
  const cpus = list('cpu', '1,4').map(Number), gls = list('gl', 'stub,soft');
  const runs = Number(opt('runs', 2));
  results.entry = [];
  await openBrowser();
  try {
    // 1. building every car's model: pure JavaScript, the same with or without a GPU
    {
      const page = await gotoMenu(base, { gl: 'stub', cpu: 1 });
      try {
        const rows = await page.eval(`(async () => {
          const [{ makeShowCar }, { CARS }, { IDEA_CARS }] = await Promise.all([import('/src/delivery/render/showcar.js'), import('/src/delivery/cars.js'), import('/src/delivery/ideas.js')]);
          const measure = (list) => list.map((car) => {
            let first = NaN, second = NaN, meshes = 0, geoms = 0, tris = 0, mats = 0;
            for (let k = 0; k < 2; k++) {
              const t = performance.now(); let m;
              try { m = makeShowCar(car); } catch (e) { return null; }
              const d = performance.now() - t; if (k === 0) first = d; else second = d;
              if (k === 1) { const g = new Set(), mt = new Set(); m.traverse((n) => { if (n.isMesh || n.isLine || n.isPoints) { meshes++; if (n.geometry) { g.add(n.geometry); const c = n.geometry.index ? n.geometry.index.count : (n.geometry.attributes.position?.count || 0); tris += c / 3; } for (const x of [].concat(n.material || [])) mt.add(x); } }); geoms = g.size; mats = mt.size; m.traverse((n) => { n.geometry?.dispose(); }); }
            }
            return { id: car.id, first, second, meshes, geoms, mats, tris };
          }).filter(Boolean);
          return { cars: measure(CARS), ideas: measure(IDEA_CARS) };
        })()`, 300000);
        const stat = (a, k) => { const v = a.map(x => x[k]).sort((x, y) => x - y); return { p50: v[Math.floor(v.length / 2)], p95: v[Math.floor(v.length * 0.95)], max: v[v.length - 1], sum: v.reduce((x, y) => x + y, 0) }; };
        console.log('\n== ENTRY 1: building a car\'s model (makeShowCar incl. dress wheels / plates / patch), JS only, 1x CPU, this machine ==');
        for (const [name, a] of [['garage cars', rows.cars], ['car ideas', rows.ideas]]) {
          const f = stat(a, 'first'), s = stat(a, 'second'), m = stat(a, 'meshes'), t = stat(a, 'tris'), g = stat(a, 'geoms');
          console.log(`  ${name} (${a.length}): first build p50 ${f.p50.toFixed(1)} / p95 ${f.p95.toFixed(1)} / max ${f.max.toFixed(1)} ms (sum ${f.sum.toFixed(0)}); second build p50 ${s.p50.toFixed(1)} / p95 ${s.p95.toFixed(1)} / max ${s.max.toFixed(1)}; meshes p50 ${m.p50} max ${m.max}; geometries p50 ${g.p50} max ${g.max}; triangles p50 ${(t.p50 / 1000).toFixed(1)}k max ${(t.max / 1000).toFixed(1)}k`);
          console.log('     slowest: ' + [...a].sort((x, y) => y.first - x.first).slice(0, 5).map(x => `${x.id} ${x.first.toFixed(0)} ms (${x.meshes} meshes, ${(x.tris / 1000).toFixed(0)}k tris)`).join(', '));
        }
        results.entry.push({ builds: { cars: rows.cars.length, ideas: rows.ideas.length, carStats: stat(rows.cars, 'first'), ideaStats: stat(rows.ideas, 'first') } });
      } finally { await page.close(); }
    }
    // 2. the timeline: first key, showroom, full view, car switches, cosmetics; cold, then with the idle warm-up
    const steps = [
      ['first key press (audio set up)', 'KeyX', 1500],
      ['G: showroom opens (cards)', 'KeyG', 3500],
      ['Enter: full view of the car', 'Enter', 2000],
      ['Right: next car (1)', 'ArrowRight', 1500],
      ['Right: next car (2)', 'ArrowRight', 1500],
      ['Right: next car (3)', 'ArrowRight', 1500],
      ['Right: next car (4)', 'ArrowRight', 1500],
      ['C: Cosmetics screen', 'KeyC', 2000],
    ];
    // one action in a page whose frames are pumped by hand: the handler's own time, then the frames after it (each step's JS ms
    // is its rAF callbacks), with real time in between for timers / observers / decodes; long tasks (>50 ms) are noted too
    const act = String.raw`window.__act = async (fn, win) => {
      const P = window.__perf, g0 = P.gl.ms, lt0 = P.longtasks.length, b0 = { ...P.blob };
      P.measuring = true; P.steps = []; P.manualOnly = true;
      const t0 = performance.now(); fn(); const syncMs = performance.now() - t0;
      const n = Math.round(win / 16.7);
      await P.pump(Math.ceil(n / 2)); await new Promise(r => setTimeout(r, Math.min(win / 2, 600))); await P.pump(Math.floor(n / 2));
      P.measuring = false;
      const steps = P.steps.slice();
      return { sync: syncMs, worstGap: Math.max(0, ...steps), blocked: steps.reduce((a, g) => a + (g > 16.7 ? g - 16.7 : 0), 0), glMs: P.gl.ms - g0, blob: { n: P.blob.n - b0.n, ms: P.blob.ms - b0.ms, mpx: (P.blob.px - b0.px) / 1e6 }, longTasks: P.longtasks.slice(lt0).map(x => x[1]) };
    }`;
    for (const gl of gls) for (const cpu of cpus) {
      console.log(`\n== ENTRY 2: showroom timeline, GL=${gl}${gl === 'soft' ? ' (SwiftShader: GL numbers are NOT a phone\'s)' : ' (JS only)'}, cpu ${cpu}x, median of ${runs} ==`);
      const table = {};
      for (const variant of ['cold', 'warm-up']) {
        const per = steps.map(() => []);
        let warmInfo = null;
        for (let run = 0; run < runs; run++) {
          const page = await gotoMenu(base, { gl, cpu });
          try {
            await page.eval(act);
            await importIn(page, 'render/showroom.js', ['Showroom']);
            if (variant === 'warm-up') warmInfo = await page.eval(WARM, 120000);
            await sleep(800);
            const reqs0 = page.requests.size;
            for (let i = 0; i < steps.length; i++) {
              const [, code, win] = steps[i];
              const prof = opt('prof', false) && run === 0 && variant === 'cold' && gl === gls[0] && cpu === cpus[0] && (code === 'KeyG' || code === 'ArrowRight') && !profiled.has(code);
              if (prof) { profiled.add(code); await page.S('Profiler.enable'); await page.S('Profiler.setSamplingInterval', { interval: 250 }); await page.S('Profiler.start'); }
              const res = await page.eval(`window.__act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(code.replace(/^Key/, '').toLowerCase())}, bubbles: true, cancelable: true })), ${win})`, 120000);
              if (prof) { const { profile } = await page.S('Profiler.stop', {}, 120000); printProfile(`${code} (${steps[i][0]})`, profile); }
              per[i].push(res);
              if (i === 0) per[i][per[i].length - 1].newRequests = page.requests.size - reqs0;
            }
            if (page.logs.length) console.log('   page errors: ' + page.logs.slice(0, 2).join(' | '));
          } finally { await page.close(); }
        }
        if (variant === 'cold') console.log('   canvas.toBlob (card pictures) per step: ' + steps.map(([n], i) => per[i][0].blob.n ? `${n.split(':')[0]}: ${per[i][0].blob.n} calls, ${per[i][0].blob.ms.toFixed(0)} ms in the call, ${per[i][0].blob.mpx.toFixed(1)} Mpx` : null).filter(Boolean).join('; '));
        table[variant] = per.map(rs => ({ sync: median(rs.map(x => x.sync)), worst: median(rs.map(x => x.worstGap)), blocked: median(rs.map(x => x.blocked)), gl: median(rs.map(x => x.glMs)), req: rs[0].newRequests }));
        if (warmInfo) console.log(`   warm-up itself: ${warmInfo.ms.toFixed(0)} ms in idle slices ${JSON.stringify(warmInfo.slices)} ms; programs on the shared renderer ${warmInfo.programsBefore} -> ${warmInfo.programsAfter}`);
      }
      console.log('step'.padEnd(34) + '| cold: handler / worst frame / blocked | with idle warm-up: handler / worst frame / blocked' + (gl === 'soft' ? ' | GL ms cold -> warm' : ''));
      steps.forEach(([name], i) => {
        const c = table.cold[i], w = table['warm-up'][i];
        const f = (x) => `${x.sync.toFixed(0).padStart(5)} / ${x.worst.toFixed(0).padStart(5)} / ${x.blocked.toFixed(0).padStart(5)} ms`;
        console.log(name.padEnd(34) + '| ' + f(c).padEnd(36) + '| ' + f(w) + (gl === 'soft' ? ` | ${c.gl.toFixed(0)} -> ${w.gl.toFixed(0)}` : '') + (c.req ? `   (${c.req} requests started by the first key)` : ''));
      });
      results.entry.push({ gl, cpu, table });
    }
  } finally { await closeBrowser(); server.close(); }
};

export { };
const main = async () => {
  try {
    if (mode === 'build' || mode === 'all') await doBuild();
    if (mode === 'load' || mode === 'all') await doLoad();
    if (mode === 'eval') { // (exploration: node scripts/perf-menu.mjs eval "<js expression>" : run in the dev-server menu page after the hook, print the result)
      const server = await devServer(); await openBrowser();
      try {
        // --url=<query>: open that address (?autostart&level=1&theme=volcano ...) instead of the menu, wait --seconds=4 and run the expression
        let page;
        if (opt('url', false)) { page = await openPage(`http://127.0.0.1:${server.port}/delivery/index.html`, { gl: opt('gl', 'stub'), cpu: Number(list('cpu', '1')[0]) }); await page.goto(`http://127.0.0.1:${server.port}/delivery/index.html${opt('url')}`); await sleep(Number(opt('seconds', 4)) * 1000); await page.eval(`(async () => { const P = window.__perf; P.manualOnly = false; return true; })()`).catch(() => {}); }
        else page = await gotoMenu(`http://127.0.0.1:${server.port}/delivery/index.html`, { gl: opt('gl', 'stub'), cpu: Number(list('cpu', '1')[0]) });
        // --trace: the Layout / UpdateLayoutTree events of the whole expression (their sizes: what a car switch dirties)
        const evs = []; let done; const complete = new Promise(r => { done = r; });
        const onMsg = (m) => { const d = JSON.parse(m.data); if (d.method === 'Tracing.dataCollected') evs.push(...d.params.value); if (d.method === 'Tracing.tracingComplete') done(); };
        if (opt('trace', false)) { socket.addEventListener('message', onMsg); await send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' }); }
        console.log(JSON.stringify(await page.eval(args.filter(a => !a.startsWith('--') && a !== 'eval')[0], 300000), null, 1)); if (page.logs.length) console.log('page errors: ' + page.logs.slice(0, 5).join(' | '));
        if (opt('trace', false)) {
          await send('Tracing.end'); await complete; socket.removeEventListener('message', onMsg);
          const main = new Set(evs.filter(e => e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map(e => e.pid + ':' + e.tid));
          const rows = evs.filter(e => e.ph === 'X' && main.has(e.pid + ':' + e.tid) && /^(Layout|UpdateLayoutTree|PrePaint|Paint|Layerize)$/.test(e.name) && e.dur > 3000).sort((a, b) => a.ts - b.ts);
          for (const e of rows) console.log(`  ${e.name} ${(e.dur / 1000).toFixed(1)} ms ` + JSON.stringify(e.args?.beginData || e.args?.elementCount !== undefined ? { elements: e.args.elementCount, ...(e.args.beginData || {}) } : {}));
        }
        await page.close(); } finally { await closeBrowser(); server.close(); }
    }
    if (mode === 'profile') await doProfile();
    if (mode === 'frames' || mode === 'all') await doFrames();
    if (mode === 'entry' || mode === 'all') await doEntry();
    if (opt('json', false)) writeFileSync(String(opt('json')), JSON.stringify(results, null, 1));
  } finally {
    await closeBrowser().catch(() => {});
    if (builtDir && !opt('keep', false) && !BUILD_ONLY()) { try { rmSync(resolve(builtDir, '..'), { recursive: true, force: true }); } catch { /* held */ } }
  }
  process.exit(0);
};
main().catch((e) => { console.error(e); process.exit(1); });
