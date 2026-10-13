// The KEY CARDS' pictures, pre-rendered: every key the game's key cards can show (the Bespoke / Key-car cards in What's
// inside, the pack reveal, the showroom's Where to get it, a featured key on a shop tile) drawn ONCE, by the game's own
// code, into src/delivery/keyshots/<car id>.png (a transparent PNG). render/keycard.js keyPicture() shows that file at
// once as the picture's background (no WebGL, no queue, no observer, no timer: the owner, 13-Oct, after the tablet's
// flicker on What's inside), and draws the key live only where there is no file or the key asked for is not the car's
// own (a ?keymodel= override, another rarity).
//   node scripts/keys-png.mjs                 every key car (cars.js: `bespoke`, or a `keyModel`), all files rewritten
//   node scripts/keys-png.mjs rocketfin       only that car (several: rocketfin swancar)
//   options: --browser=<path> (else Edge or Chrome where they usually are), --port=<n> (Vite's; 5213 by default)
// How: a Vite dev server of its own (closed at the end) and a headless browser driven over the DevTools protocol (Node's
// own WebSocket, no Playwright). In the page the script imports render/keycard.js and render/modelviews.js from the dev
// server and draws each key exactly as a card does: posedKey(car, { model: keyModelInUse(car), rarity: 'bespoke' })
// (makeKey, the same tilt), drawStill() with KEY_POSE (the same lights and tight framing) into a box of the card art's
// shape (blueprintcard.css .bp-art: aspect-ratio 1 / .9) at SIZE, about twice the largest card (the reveal's cards are
// at most 176 px wide, their art some 164 px), then canvas.toDataURL('image/png'). The card's drop shadow is CSS
// (keycard.css), not in the file. Re-run it when a key model, a key car's colour or KEY_POSE changes; the check
// scripts/.keyshots-check.mjs says when a key car has no file (or a file has no car).
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const SIZE = [400, 360]; // px (the card art's 1 : 0.9)
const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/delivery/keyshots');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const only = args.filter(a => !a.startsWith('--'));
const browser = opt('browser', null) || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].find(existsSync);
if (!browser) { console.log('No Edge or Chrome found: name one with --browser=<path>'); process.exit(1); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const own = mkdtempSync(join(tmpdir(), 'delivery-keyshots-'));
let server, child, socket, calls = 0;
const waiting = new Map();
const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
  const id = ++calls;
  const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
  waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
  socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
});

let failed = 0;
try {
  server = await createServer({ root: ROOT, server: { port: Number(opt('port', 5213)), strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
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
  await page('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false }); // (1: the canvas is SIZE exactly)
  // (a plain file of the dev server's, shown as text: the modules are imported from its origin; nothing of the game runs)
  const went = await page('Page.navigate', { url: `http://localhost:${port}/src/delivery/render/keyModels.js` });
  if (went.errorText) throw new Error('the dev server\'s page: ' + went.errorText);
  await sleep(500);
  const run = await page('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const Cars = await import('/src/delivery/cars.js');
    const { posedKey, keyModelInUse, KEY_POSE } = await import('/src/delivery/render/keycard.js');
    const { sharedRenderer, drawStill } = await import('/src/delivery/render/modelviews.js');
    document.body.style.cssText = 'margin:0;background:transparent';
    const cars = [...Cars.EVENT_CARS, ...Cars.BESPOKE_CARS].filter(car => car && (car.bespoke || car.keyModel));
    const only = ${JSON.stringify(only)};
    const out = {};
    for (const car of cars) {
      if (only.length && !only.includes(car.id)) continue;
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:0;top:0;width:${SIZE[0]}px;height:${SIZE[1]}px';
      document.body.append(el);
      const model = keyModelInUse(car);
      const ok = drawStill(sharedRenderer(), el, posedKey(car, { model, rarity: 'bespoke' }), KEY_POSE);
      const canvas = el.querySelector('canvas');
      out[car.id] = ok && canvas ? { model, png: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height } : { model, error: 'not drawn (no WebGL?)' };
      el.remove();
    }
    return { cars: cars.map(c => c.id), out };
  })()` }, 180000);
  if (run.exceptionDetails) throw new Error('in the page: ' + (run.exceptionDetails.exception?.description || run.exceptionDetails.text));
  const { cars, out } = run.result.value;
  const unknown = only.filter(id => !cars.includes(id));
  if (unknown.length) { console.log('not a key car: ' + unknown.join(', ') + ' (key cars: ' + cars.join(', ') + ')'); failed++; }
  mkdirSync(OUT, { recursive: true });
  let total = 0;
  for (const [id, shot] of Object.entries(out)) {
    if (shot.error) { console.log(`  FAIL  ${id}: ${shot.error}`); failed++; continue; }
    const bytes = Buffer.from(shot.png.split(',')[1], 'base64');
    writeFileSync(join(OUT, id + '.png'), bytes);
    total += bytes.length;
    console.log(`  ${id.padEnd(14)} ${shot.model.padEnd(8)} ${shot.w}x${shot.h}  ${(bytes.length / 1024).toFixed(1)} KB`);
  }
  const orphans = readdirSync(OUT).filter(f => !cars.includes(f.replace(/\.png$/, '')));
  if (orphans.length) console.log('  (in keyshots/ but no key car: ' + orphans.join(', ') + ': remove them)');
  console.log(`${Object.keys(out).length} written to src/delivery/keyshots, ${(total / 1024).toFixed(1)} KB`);
} catch (error) {
  console.log('FAILED: ' + (error?.message || error));
  failed++;
} finally {
  try { if (socket) await send('Browser.close', {}, undefined, 5000); } catch { /* (gone) */ }
  try { socket?.close(); } catch { /* (closed) */ }
  if (child && child.exitCode === null) { await sleep(500); try { child.kill(); } catch { /* (gone) */ } }
  await server?.close();
  try { rmSync(own, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* (held a moment yet) */ }
}
process.exit(failed ? 1 : 0);
