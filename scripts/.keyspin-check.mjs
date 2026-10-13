// A check of the ROTATING KEY (render/keyspin.js: the showroom's "Where to get it" key card's key turns, slowly by itself
// and by a drag; a blacked-out car's turns as a solid black silhouette; the owner, 13-Oct: "Rotate its key too, but
// blacked out"). Two parts:
// (1) THE SOURCE (no browser): no WebGL context of its own (modelviews.js sharedRenderer, no `new WebGLRenderer`), the
//     pixel ratio capped at 2 and the frames at 30 a second, an IntersectionObserver, a `when` gate the showroom sets
//     (the full view up, no sheet: lite.js sheetUp), stop() wired to the full view's close and the showroom's, the PNG
//     kept as the first picture (the live canvas hides it only once drawn, and gives it back), reduced motion honoured,
//     the drag kept off the next-car swipes, and the blacked-out key drawn with one flat black material.
// (2) IN HEADLESS CHROMIUM (over DevTools; skipped with a note if no browser is found): every key car's key scene drawn
//     DARK at four turns into the shared renderer: every pixel that is not clear is pure black (r = g = b = 0), and there
//     is a key there (a share of the picture covered); drawn in colour: not black. Then the showroom (`?showroom&look=<id>
//     &full&sourcesopen`): the Silver Comet's key card goes live once in sight (a canvas, frames drawn, its turn moving),
//     at most 2 device px a CSS px, no more than about 30 frames a second, its PNG hidden under it; the Hot Dog Car's (a
//     blacked-out car) live and black: the canvas's pixels all black, and nothing in the page names it (its name, its id)
//     in an attribute or a URL in the key card; the full view shut: stopped, the canvas gone, the PNG back.
// (3) THE STAGE CORNER'S KEY (render/showroomview.js, CHECKLIST 160; the owner, 13-Oct: "I wanted THIS key to be spinning
//     when the car is blacked out"): in the source, a blacked-out key car's corner key built dark (every mesh the same flat
//     black SILHOUETTE_KEY, the lights off), at most 30 frames a second, not under a sheet, on the shared renderer; in the
//     browser, for EVERY blacked-out key car on a fresh save (carCard dark, kindOf 'key', not tier-hidden): `?showroom&look=
//     <id>&full`: the corner key there, dark, turning by itself, its canvas's drawn pixels all black at four turns, at most
//     about 30 frames a second, nothing in the corner's element or the stage's key canvas naming the car (name, id,
//     keyshots/); reduced motion: standing still. The Silver Comet's corner key: in colour, turning, as before; a car
//     with no key (the Commuter; a blacked-out blueprint car, the City EV) and a tier-hidden key car: no corner key.
//   node scripts/.keyspin-check.mjs [--browser=<path>]
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- (1) the source
const src = (f) => readFileSync(join(ROOT, 'src/delivery', f), 'utf8');
const spin = src('render/keyspin.js'), room = src('render/showroom.js');
const code = spin.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
check(/sharedRenderer\(\)/.test(code) && !/new\s+THREE\.WebGLRenderer|WebGLRenderer\(/.test(code) && !/getContext\(['"]webgl/.test(code), 'keyspin.js draws with the shared renderer (modelviews.js sharedRenderer), no WebGL context of its own');
check(/maxRatio:\s*2\b/.test(code) && /Math\.min\(window\.devicePixelRatio \|\| 1, KEY_SPIN\.maxRatio\)/.test(code), 'its pixel ratio is capped at 2');
check(/fps:\s*30\b/.test(code) && /1000 \/ KEY_SPIN\.fps/.test(code), 'its frames are capped at 30 a second');
check(/new IntersectionObserver/.test(code) && /if \(!k\.seen\) return;/.test(code), 'drawn only while in sight (an IntersectionObserver; nothing scheduled off screen)');
check(/document\.hidden \|\| !visible\(\)/.test(code), 'not drawn while the page is hidden or the showroom says not (when())');
check(/KeySpin\.when\(\(\) => Showroom\.isOpen && full && [^\n]*!sheetUp\(\)\)/.test(room), 'the showroom lets it draw only with the full view up and no sheet over it (lite.js sheetUp)');
const closeFull = room.slice(room.indexOf('const closeFull'), room.indexOf('const closeFull') + 600), close = room.slice(room.indexOf('  close() {'), room.indexOf('  close() {') + 700);
check(/KeySpin\.stop\(\)/.test(closeFull) && /KeySpin\.stop\(\)/.test(close), 'stopped (its model given back) when the full view shuts and when the showroom closes');
check(/KeySpin\.start\(keyPic, card\.car, \{ dark: card\.dark \}\)/.test(room), 'the showroom starts it on the "Where to get it" key card, dark for a blacked-out car');
check(/stillViews\(\)/.test(code) && /if \(k\.moved \|\| k\.live\) draw\(\)/.test(code), 'reduced motion: no turning by itself, nothing drawn until a drag (the PNG stays)');
check(/k\.stash = bg; k\.el\.style\.backgroundImage = 'none'/.test(code) && /k\.el\.style\.backgroundImage = k\.stash/.test(code), 'the PNG stays the picture until the first live frame, and comes back on stop()');
check(/release\(k\.s\)/.test(code) && /geometry\?\.dispose\(\)/.test(code), 'its geometry and materials are given back');
check(/'\.sr-dpic, \.cs-keyspin'/.test(room) && /'\.sr-dpic, \.cs-keyspin, button'/.test(room), 'a drag on the key is not a swipe to the next car (phone and tablet)');
check(/SILHOUETTE_KEY = new THREE\.MeshBasicMaterial\(\{ color: 0x000000 \}\)/.test(code) && /node\.material = SILHOUETTE_KEY/.test(code), 'a blacked-out key: every mesh one flat black material');
const view = src('render/showroomview.js'), viewCode = view.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
check(/kindOf\(card\) === 'key' && !card\.hidden \? make\('div', 'sr-fkey' \+ \(card\.dark \? ' silhouette' : ''\)\)/.test(room), 'the stage corner: a key for every key car, a blacked-out one included (classed silhouette), none for a tier-hidden car');
check(/import \{ SILHOUETTE_KEY \} from '\.\/keyspin\.js'/.test(viewCode) && /buildKey\(car, keyEl, dark\)/.test(viewCode) && /if \(node\.isMesh\) node\.material = SILHOUETTE_KEY;/.test(viewCode) && /node\.isLight\) node\.visible = false/.test(viewCode), 'the corner key of a blacked-out car: every mesh the flat black SILHOUETTE_KEY of keyspin.js, the rest hidden, the lights off');
check(/DARK_KEY_FPS = 30\b/.test(viewCode) && /k\.dark && k\.drawnAt && now - k\.drawnAt < 1000 \/ DARK_KEY_FPS/.test(viewCode), 'the blacked-out corner key drawn at most 30 times a second');
check(/!keyVisible\(\)\) return;/.test(viewCode) && /ShowroomView\.keyWhen\(\(\) => !sheetUp\(\)\)/.test(room), 'the corner key not drawn under a sheet (lite.js sheetUp)');
check(!/new\s+THREE\.WebGLRenderer|getContext\(['"]webgl/.test(viewCode) && /material !== SILHOUETTE_KEY\) \{ material\.map\?\.dispose\(\)/.test(viewCode), 'the corner key on the shared renderer, its own materials given back (the shared black kept)');

// ---- (2) in a browser
const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!browser) console.log('  (no Chromium / Edge found: the drawing part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-keyspin-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5231, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
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
    await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 860, deviceScaleFactor: 3, mobile: false }); // (3: the cap of 2 is seen)
    const open = async (address) => { await page('Page.navigate', { url: `http://localhost:${port}/delivery/${address}` }); await sleep(2500); };

    // (a) every key car's key scene, dark and in colour, at four turns: the pixels read back
    await open('index.html');
    const scenes = await evaluate(`(async () => {
      const Cars = await import('/src/delivery/cars.js');
      const { keyScene } = await import('/src/delivery/render/keyspin.js');
      const { sharedRenderer } = await import('/src/delivery/render/modelviews.js');
      const renderer = sharedRenderer();
      if (!renderer) return { error: 'no renderer' };
      const cars = [...Cars.EVENT_CARS, ...Cars.BESPOKE_CARS].filter(c => c && (c.bespoke || c.keyModel));
      const W = 180, H = 162, out = [];
      const read = (s, turn) => {
        s.key.rotation.y = turn; s.camera.zoom = s.zoom; s.camera.updateProjectionMatrix();
        s.camera.setViewOffset(W, H, s.offset.x * W, s.offset.y * H, W, H);
        renderer.setSize(Math.max(W, renderer.domElement.width), Math.max(H, renderer.domElement.height), false);
        renderer.setViewport(0, 0, W, H); renderer.setScissor(0, 0, W, H); renderer.clear(); renderer.render(s.scene, s.camera);
        const gl = renderer.getContext(), px = new Uint8Array(W * H * 4);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let covered = 0, coloured = 0, edge = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (!px[i + 3]) continue;
          covered++;
          if (px[i] || px[i + 1] || px[i + 2]) coloured++;
          const p = i / 4, x = p % W, y = (p - x) / W;
          if (px[i + 3] > 128 && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) edge++;
        }
        return { covered: covered / (W * H), coloured, edge };
      };
      for (const car of cars) {
        const row = { id: car.id, dark: [], light: [] };
        for (const dark of [true, false]) {
          const s = keyScene(car, W / H, { dark });
          for (const turn of [0, 0.8, 1.6, 2.6, 4.0]) row[dark ? 'dark' : 'light'].push(read(s, turn));
          row.zoom = s.zoom;
          s.scene.traverse(n => { n.geometry?.dispose(); });
        }
        out.push(row);
      }
      return { out };
    })()`);
    if (scenes.error) throw new Error(scenes.error);
    for (const r of scenes.out) {
      const darkOk = r.dark.every(d => d.coloured === 0 && d.covered > 0.02);
      check(darkOk, `${r.id}: dark key at 5 turns, every drawn pixel black (${r.dark.map(d => (d.covered * 100).toFixed(0) + '%' + (d.coloured ? ' ' + d.coloured + ' coloured' : '')).join(', ')})`);
      check(r.light.every(d => d.coloured > d.covered * 180 * 162 * 0.5), `${r.id}: in colour, not black (zoom ${r.zoom.toFixed(2)} to stay whole)`);
      check(r.dark.concat(r.light).every(d => d.edge < 6), `${r.id}: whole at every turn (nothing solid on the picture's edge: ${r.dark.concat(r.light).map(d => d.edge).join(',')})`);
    }

    // (b) the showroom: a normal car's key card live; a blacked-out car's live and black, unnamed; stopped on closing
    const live = async (id) => {
      await open(`index.html?showroom&look=${id}&full&sourcesopen`);
      return evaluate(`(async () => {
        const { KeySpin } = await import('/src/delivery/render/keyspin.js');
        let pic = null;
        for (let i = 0; i < 100 && !(pic = document.querySelector('.cs-where .bp-keypic')); i++) await new Promise(r => setTimeout(r, 150));
        if (!pic) return { error: 'no key card (' + (document.querySelector('.cs-where') ? 'a Where to get it section, no key card' : 'no Where to get it section') + ')' };
        pic.scrollIntoView({ block: 'center' });
        await new Promise(r => setTimeout(r, 2600)); // (in sight; then 1.2 s before it turns by itself)
        const a = { ...KeySpin.state }, t0 = performance.now();
        await new Promise(r => setTimeout(r, 1000));
        const b = { ...KeySpin.state }, secs = (performance.now() - t0) / 1000;
        const canvas = pic.querySelector('canvas.key-spin'), r = pic.getBoundingClientRect();
        let black = null;
        if (canvas) {
          const px = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          let drawn = 0, coloured = 0;
          for (let i = 0; i < px.length; i += 4) if (px[i + 3]) { drawn++; if (px[i] || px[i + 1] || px[i + 2]) coloured++; }
          black = { drawn, coloured };
        }
        const card = pic.closest('.bp-card'), words = card.outerHTML;
        const bg = pic.style.backgroundImage;
        const { Showroom } = await import('/src/delivery/render/showroom.js');
        Showroom.back();
        await new Promise(r => setTimeout(r, 300));
        return { a, b, secs, canvas: canvas ? { w: canvas.width, h: canvas.height, cssW: r.width, cssH: r.height } : null, black, words, bg,
          after: KeySpin.state, canvasLeft: !!pic.querySelector('canvas.key-spin'), bgAfter: pic.style.backgroundImage };
      })()`);
    };
    const comet = await live('silvercomet');
    if (comet.error) check(false, 'Silver Comet: ' + comet.error);
    else {
      check(comet.a?.live && comet.canvas, `Silver Comet: its key card went live once in sight (a canvas ${comet.canvas?.w}x${comet.canvas?.h} for ${comet.canvas?.cssW}x${comet.canvas?.cssH} CSS px)`);
      check(comet.canvas && comet.canvas.w <= Math.round(comet.canvas.cssW * 2) + 1, 'at most 2 device px a CSS px (the screen is 3)');
      check(comet.b.turn > comet.a.turn + 0.05, `its key turns by itself (${comet.a.turn.toFixed(2)} to ${comet.b.turn.toFixed(2)} rad in ${comet.secs.toFixed(1)} s)`);
      const fps = (comet.b.frames - comet.a.frames) / comet.secs;
      check(comet.b.frames > comet.a.frames && fps <= 32, `drawn on, at most about 30 frames a second (${fps.toFixed(1)} in headless Chromium, its software WebGL drawing the showroom's car too)`);
      check(comet.bg === 'none', 'its PNG hidden under the live key');
      check(comet.black && comet.black.coloured > 0, 'in colour');
      check(!comet.after && !comet.canvasLeft && /keyshots|silvercomet/.test(comet.bgAfter), 'the full view shut: stopped, the canvas gone, the PNG back');
    }
    const dog = await live('hotdog');
    if (dog.error) check(false, 'Hot Dog Car: ' + dog.error);
    else {
      check(dog.a?.live && dog.a.dark, 'Hot Dog Car (blacked out): its key card live and dark');
      check(dog.b.turn > dog.a.turn + 0.05, 'its black key turns by itself');
      check(dog.black && dog.black.drawn > 500 && dog.black.coloured === 0, `its canvas's every drawn pixel black (${dog.black?.drawn} drawn, ${dog.black?.coloured} coloured)`);
      check(!/hot ?dog|hotdog|keyshots\//i.test(dog.words), 'nothing in its key card names it (no name, id or keyshots/ address in any text, attribute or URL)');
      check(!dog.after && !dog.canvasLeft && /^url\("blob:/.test(dog.bgAfter), 'shut: stopped, the black PNG (a blob: address) back');
    }

    // (c) the stage corner's key: every blacked-out key car's black and spinning, unnamed; the normal car's in colour
    const darkCars = await evaluate(`(async () => {
      const D = await import('/src/delivery/showroomData.js');
      return D.showroomCars().map(c => D.carCard(c)).filter(c => c.dark && !c.hidden && D.kindOf(c) === 'key').map(c => ({ id: c.car.id, name: c.car.name }));
    })()`);
    check(darkCars.length >= 3, `blacked-out key cars on a fresh save: ${darkCars.map(c => c.id).join(', ')}`);
    const corner = async (id, reads = 4) => {
      await open(`index.html?showroom&look=${id}&full`);
      return evaluate(`(async () => {
        const { ShowroomView } = await import('/src/delivery/render/showroomview.js');
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        let el = null;
        for (let i = 0; i < 60 && !(document.querySelector('.sr-stage')); i++) await wait(150);
        await wait(1500);
        el = document.querySelector('.sr-stage .sr-fkey');
        if (!el) return { none: true, state: ShowroomView.state };
        const shots = [];
        for (let i = 0; i < ${reads}; i++) {
          const s = ShowroomView.state, canvas = el.querySelector('canvas'), t = performance.now();
          let drawn = 0, coloured = 0;
          if (canvas) { const px = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; for (let j = 0; j < px.length; j += 4) if (px[j + 3] > 8) { drawn++; if (px[j] || px[j + 1] || px[j + 2]) coloured++; } }
          shots.push({ turn: s?.key?.turn, frames: s?.key?.frames, dark: s?.key?.dark, t, drawn, coloured, w: canvas?.width, h: canvas?.height });
          await wait(700);
        }
        return { shots, html: el.outerHTML, cls: el.className, label: el.getAttribute('aria-label'), cssW: el.clientWidth };
      })()`);
    };
    for (const car of darkCars) {
      const r = await corner(car.id);
      if (r.none) { check(false, `${car.id}: a corner key in the stage (none found)`); continue; }
      const turns = r.shots.map(x => x.turn), first = r.shots[0], end = r.shots.at(-1);
      const fps = (end.frames - first.frames) / ((end.t - first.t) / 1000);
      check(r.shots.every(x => x.dark), `${car.id}: the corner key there, dark (${r.cls})`);
      check(new Set(turns.map(t => t.toFixed(2))).size === turns.length, `${car.id}: spinning by itself (turns ${turns.map(t => t.toFixed(2)).join(', ')})`);
      check(r.shots.every(x => x.drawn > 200 && x.coloured === 0), `${car.id}: black only at every read (${r.shots.map(x => x.drawn + '/' + x.coloured).join(', ')} drawn/coloured px)`);
      check(end.frames > first.frames && fps <= 32, `${car.id}: drawn on, at most about 30 a second (${fps.toFixed(1)})`);
      check(r.shots.every(x => x.w <= Math.round(r.cssW * 2) + 1), `${car.id}: at most 2 device px a CSS px`);
      const names = [car.id, car.name, car.name.split(' ')[0]].map(x => x.toLowerCase());
      check(!names.some(n => r.html.toLowerCase().includes(n)) && !/keyshots|data-/.test(r.html), `${car.id}: nothing in the corner names it (${r.label})`);
    }
    const normal = await corner('silvercomet', 3);
    if (normal.none) check(false, 'silvercomet: a corner key');
    else {
      check(normal.shots.every(x => x.dark === false && x.coloured > x.drawn * 0.5), `silvercomet: the corner key in colour, as before (${normal.shots.map(x => x.drawn + '/' + x.coloured).join(', ')})`);
      check(normal.shots[2].turn !== normal.shots[0].turn && /Silver Comet's key/.test(normal.label) && !/silhouette/.test(normal.cls), 'silvercomet: turning, named as before, not a silhouette');
    }
    for (const id of ['commuter', 'cityev']) check((await corner(id, 1)).none, `${id}: no key, no corner key`);
    const hiddenKey = await evaluate(`(async () => { const D = await import('/src/delivery/showroomData.js'); return D.showroomCars().map(c => D.carCard(c)).find(c => c.hidden && D.kindOf(c) === 'key')?.car.id || null; })()`);
    if (hiddenKey) check((await corner(hiddenKey, 1)).none, `${hiddenKey} (tier-hidden key car): no corner key`);
    await page('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const still = await corner(darkCars[0]?.id || 'hotdog', 2);
    check(!still.none && still.shots.every(x => Math.abs(x.turn - 0.55) < 1e-6 && x.coloured === 0 && x.drawn > 200), `reduced motion: ${darkCars[0]?.id}'s black corner key stands still (turn ${still.shots?.map(x => x.turn?.toFixed(2)).join(', ')})`);
    await page('Emulation.setEmulatedMedia', { features: [] });
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
