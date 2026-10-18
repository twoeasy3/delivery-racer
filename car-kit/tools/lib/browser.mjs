// A headless Chrome / Chromium, driven over the DevTools protocol (no npm packages: Node 22's built-in WebSocket), and a tiny
// static web server for the kit's folder. Used by tools/render.mjs and tools/serve.mjs.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { tmpdir, homedir } from 'node:os';

// ---- the browser's path: --browser=<path>, $CHROME_PATH, the Playwright browsers folder, then the usual places ---------------
export const findBrowser = (asked) => {
  const out = [];
  if (asked) out.push(asked);
  for (const k of ['CHROME_PATH', 'CHROME', 'PUPPETEER_EXECUTABLE_PATH']) if (process.env[k]) out.push(process.env[k]);
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', join(homedir(), '.cache/ms-playwright'), join(homedir(), 'Library/Caches/ms-playwright'), join(homedir(), 'AppData/Local/ms-playwright')]) {
    if (!root || !existsSync(root)) continue;
    for (const d of readdirSync(root).filter(n => /^chromium(-|_headless_shell-)\d+$/.test(n)).sort().reverse()) {
      for (const exe of ['chrome-linux/chrome', 'chrome-linux/headless_shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) out.push(join(root, d, exe));
    }
  }
  out.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  return out.find(p => { try { return statSync(p).isFile(); } catch { return false; } }) || null;
};

// ---- a static server for one folder (127.0.0.1, a free port) -----------------------------------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.md': 'text/plain' };
export const serveFolder = (root, port = 0) => new Promise((done) => {
  const base = resolve(root);
  const server = createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = resolve(join(base, url));
    if (file !== base && !file.startsWith(base + sep)) { res.writeHead(403); res.end(); return; }
    try { if (statSync(file).isDirectory()) file = join(file, 'index.html'); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(readFileSync(file)); }
    catch { res.writeHead(404); res.end('not found'); }
  });
  server.listen(port, '127.0.0.1', () => done({ server, url: 'http://127.0.0.1:' + server.address().port + '/' }));
});

// ---- the browser -------------------------------------------------------------------------------------------------------------
export const launch = async (browserPath) => {
  const exe = findBrowser(browserPath);
  if (!exe) throw new Error('No Chrome or Chromium found. Pass --browser=<path to chrome>, or set CHROME_PATH.');
  const profile = mkdtempSync(join(tmpdir(), 'carkit-chrome-'));
  const args = ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'];
  if (process.platform === 'linux' && process.getuid?.() === 0) args.unshift('--no-sandbox');
  const child = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((done, fail) => {
    let text = '';
    const timer = setTimeout(() => fail(new Error('the browser did not start (' + exe + ')\n' + text)), 20000);
    child.stderr.on('data', (d) => { text += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(text); if (m) { clearTimeout(timer); done(m[1]); } });
    child.on('exit', (code) => { clearTimeout(timer); fail(new Error('the browser exited (' + code + ')\n' + text)); });
  });
  const socket = new WebSocket(wsUrl);
  await new Promise((done, fail) => { socket.addEventListener('open', done); socket.addEventListener('error', () => fail(new Error('no DevTools connection'))); });
  let id = 0; const waiting = new Map();
  socket.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.fail(new Error(m.error.message)) : w.done(m.result); } });
  const send = (method, params = {}, sessionId) => new Promise((done, fail) => { const n = ++id; waiting.set(n, { done, fail }); socket.send(JSON.stringify({ id: n, method, params, sessionId })); });
  const close = () => { try { socket.close(); } catch { /* gone */ } try { child.kill('SIGKILL'); } catch { /* gone */ } setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* still held */ } }, 300); };
  // a page: { evaluate(expression) -> its value (promises awaited), close() }
  const page = async (url, { width = 1280, height = 900 } = {}) => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank', width, height });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
      return r.result.value;
    };
    await send('Page.navigate', { url }, sessionId);
    const screenshot = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png' }, sessionId)).data, 'base64');
    return { evaluate, screenshot, close: () => send('Target.closeTarget', { targetId }) };
  };
  return { page, close, exe };
};
