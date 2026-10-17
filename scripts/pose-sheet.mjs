// THE POSE SHEET (the owner, 17-Oct): every blueprint pose of every car, in its STOCK GOOD livery, as image files for a review page.
// Boots the game's own modules in headless Chromium (Playwright, software GL is fine) under the Vite dev server and draws each car in
// each of the five poses with the REAL blueprint-card path: render/carstill.js stillCar (makeShowCar, paintShowCar, modelviews.js
// drawStill through the one shared renderer), stock: true (no loadout, no cosmetic), side Good. The poses are carstill.js
// REVIEW_POSES: the cards' four (top, hero, front, rear) and `side` (the flat profile tried and removed: the game never asks for it).
// Each picture is the still drawn at the size asked, laid on a plain background, encoded in the browser as WebP (or JPEG).
//   node scripts/pose-sheet.mjs [--out <dir>] [--cars id,id,...] [--poses top,side] [--size 360x240] [--quality 0.9]
//                               [--format webp|jpeg] [--bg '#5b6b82'] [--browser <chrome path>]
//   out:   <dir>/<carId>_<pose>.webp, <dir>/cars.json ([{ id, name, basedOn?, stars?, kind }] in the showroom's order, then the cars the
//          showroom never lists: level cars, the Amphibious Tank, the idea cars) and <dir>/report.json (per picture: bytes, the car's
//          box in the picture and whether it touches an edge, its share of the picture, its mean colour; the failures)
//   kinds: garage (CARS), filler, event, bespoke, earned, legendary, secret, level, idea. Not drawn: the Super versions (no card of
//          their own), traffic and pursuit kinds (never a car card).
//   The default dir is the session scratchpad's pose-sheet/ if it exists, else /tmp/pose-sheet. --quality is 0..1.
// One browser, one page, a car at a time. It changes nothing in the repo.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, fallback = null) => { const i = args.findIndex(a => a === name || a.startsWith(name + '=')); return i < 0 ? fallback : args[i].includes('=') ? args[i].slice(name.length + 1) : args[i + 1]; };
const SCRATCH = '/tmp/claude-0/-home-user-delivery-racer/d5c3b697-cfe8-54f1-aad3-35e8af561b80/scratchpad';
const out = flag('--out', existsSync(SCRATCH) ? SCRATCH + '/pose-sheet' : '/tmp/pose-sheet');
const only = flag('--cars') ? flag('--cars').split(',') : null;
const posesAsked = flag('--poses') ? flag('--poses').split(',') : null;
const [W, H] = String(flag('--size', '360x240')).split('x').map(Number);
const quality = Number(flag('--quality', 0.9));
const format = flag('--format', 'webp') === 'jpeg' ? 'jpeg' : 'webp';
const bg = flag('--bg', '#5b6b82');
const browserPath = flag('--browser', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

// Playwright: the project's, else the machine's global one
const loadPlaywright = async () => {
  try { return await import('playwright'); } catch {}
  for (const base of ['/opt/node22/lib/node_modules/', '/usr/local/lib/node_modules/', '/usr/lib/node_modules/']) {
    try { return createRequire(base)('playwright'); } catch {}
  }
  throw new Error('No playwright found (npm i -g playwright; do not download browsers: pass --browser)');
};
const { chromium } = await loadPlaywright();

mkdirSync(out, { recursive: true });
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1', hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: ['three'] } });
await server.listen();
const base = 'http://127.0.0.1:' + server.httpServer.address().port;
const browser = await chromium.launch({ executablePath: browserPath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const consoleLines = [];
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleLines.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => consoleLines.push('pageerror: ' + e.message));
  // the game's page (its elements: the modules look for them as they load) WITHOUT main.js, so no menu and no game runs; a box to draw in
  const html = readFileSync(join(ROOT, 'delivery/index.html'), 'utf8').replace(/<script type="module" src="\/src\/delivery\/main\.js"><\/script>/, '')
    .replace('</body>', '<div id="pose-box" style="position:fixed;left:0;top:0;z-index:99999"></div></body>');
  await page.route(base + '/delivery/__pose-sheet.html', (r) => r.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(base + '/delivery/__pose-sheet.html');
  page.setDefaultTimeout(600000);
  // the roster, in the showroom's order (showroomData.js showroomCars' sort, without its visibility filter: every car), then the rest
  const cars = await page.evaluate(async () => {
    const C = await import('/src/delivery/cars.js');
    const { IDEA_CARS } = await import('/src/delivery/ideas.js');
    const secret = Object.values(C.SECRET_CARS);
    const rank = (car) => secret.includes(car) ? 90 : car.tier >= 1 ? car.tier : 7;
    const floor = [...C.CARS, ...(C.FILLER_CARS || []), ...C.EVENT_CARS, ...C.BESPOKE_CARS, ...C.EARNED_CARS, ...secret]
      .sort((a, b) => rank(a) - rank(b) || (a.price || 0) - (b.price || 0) || a.name.localeCompare(b.name));
    const kind = (car) => C.CARS.includes(car) ? 'garage' : C.FILLER_CARS.includes(car) ? 'filler' : C.EVENT_CARS.includes(car) ? 'event'
      : C.BESPOKE_CARS.includes(car) ? 'bespoke' : C.EARNED_CARS.includes(car) ? (car.legend ? 'legendary' : 'earned') : secret.includes(car) ? 'secret'
      : Object.values(C.LEVEL_CARS).includes(car) || car === C.AMPHIBIOUS_TANK ? 'level' : 'idea';
    const seen = new Set(), list = [];
    for (const car of [...floor, ...Object.values(C.LEVEL_CARS), C.AMPHIBIOUS_TANK, ...IDEA_CARS]) {
      if (!car || seen.has(car.id)) continue;
      seen.add(car.id);
      const row = { id: car.id, name: car.name, kind: kind(car) };
      if (car.basedOn) row.basedOn = car.basedOn;
      const s = car.tier || car.rating;
      if (s) row.stars = s;
      list.push(row);
    }
    window.__cars = new Map([...C.CARS, ...C.FILLER_CARS, ...C.EVENT_CARS, ...C.BESPOKE_CARS, ...C.EARNED_CARS, ...secret, ...Object.values(C.LEVEL_CARS), C.AMPHIBIOUS_TANK, ...IDEA_CARS].filter(Boolean).reverse().map(c => [c.id, c]));
    return list;
  });
  const poses = await page.evaluate(async () => (await import('/src/delivery/render/carstill.js')).REVIEW_POSE_NAMES);
  const want = posesAsked ? poses.filter(p => posesAsked.includes(p)) : poses;
  const todo = only ? cars.filter(c => only.includes(c.id)) : cars;
  if (!only) writeFileSync(join(out, 'cars.json'), JSON.stringify(cars, null, 1));
  console.log(cars.length + ' cars in the roster, drawing ' + todo.length + ' x ' + want.length + ' poses at ' + W + 'x' + H + ' ' + format + ' q' + quality + ' into ' + out);
  const report = { size: [W, H], format, quality, bg, poses: want, pictures: {}, failed: [], console: consoleLines };
  let bytes = 0;
  const t0 = Date.now();
  for (const [n, row] of todo.entries()) {
    const before = consoleLines.length;
    const shots = await page.evaluate(async ({ id, want, W, H, bg, type, quality }) => {
      const { stillCar, REVIEW_POSES } = await import('/src/delivery/render/carstill.js');
      const car = window.__cars.get(id), box = document.getElementById('pose-box'), res = {};
      for (const pose of want) {
        box.replaceChildren();
        const el = document.createElement('span');
        el.style.cssText = 'display:block;position:relative;width:' + W + 'px;height:' + H + 'px';
        box.append(el);
        let ok = false, err = '';
        try { ok = stillCar(el, car, false, REVIEW_POSES[pose], true); } catch (e) { err = String(e?.message || e); }
        const drawn = el.querySelector('canvas');
        if (!ok || !drawn) { res[pose] = { error: err || 'not drawn' }; continue; }
        // what was drawn: the car's box (alpha), whether it touches an edge, its share, its mean colour
        const px = drawn.getContext('2d').getImageData(0, 0, drawn.width, drawn.height).data;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, r = 0, g = 0, b = 0;
        for (let y = 0; y < drawn.height; y++) for (let x = 0; x < drawn.width; x++) {
          const i = (y * drawn.width + x) * 4;
          if (px[i + 3] < 16) continue;
          n++; r += px[i]; g += px[i + 1]; b += px[i + 2];
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        const pic = document.createElement('canvas');
        pic.width = W; pic.height = H;
        const ctx = pic.getContext('2d');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.drawImage(drawn, 0, 0, W, H);
        res[pose] = {
          data: pic.toDataURL('image/' + type, quality).split(',')[1],
          box: n ? [x0, y0, x1, y1] : null, edge: n ? [x0 <= 0 && 'left', y0 <= 0 && 'top', x1 >= drawn.width - 1 && 'right', y1 >= drawn.height - 1 && 'bottom'].filter(Boolean) : [],
          fill: +(n / (drawn.width * drawn.height)).toFixed(3), mean: n ? [r / n, g / n, b / n].map(Math.round) : null,
        };
      }
      box.replaceChildren();
      return res;
    }, { id: row.id, want, W, H, bg, type: format, quality });
    for (const pose of want) {
      const s = shots[pose];
      if (!s || s.error) { report.failed.push({ id: row.id, pose, error: s?.error || 'nothing back', console: consoleLines.slice(before) }); continue; }
      const buf = Buffer.from(s.data, 'base64');
      writeFileSync(join(out, row.id + '_' + pose + '.' + format), buf);
      bytes += buf.length;
      report.pictures[row.id + '_' + pose] = { bytes: buf.length, box: s.box, edge: s.edge, fill: s.fill, mean: s.mean };
    }
    if ((n + 1) % 10 === 0 || n === todo.length - 1) console.log('  ' + (n + 1) + '/' + todo.length + ' cars, ' + (bytes / 1048576).toFixed(2) + ' MB, ' + Math.round((Date.now() - t0) / 1000) + ' s');
  }
  report.totalBytes = bytes;
  writeFileSync(join(out, only ? 'report-' + only.join(',').slice(0, 60) + '.json' : 'report.json'), JSON.stringify(report, null, 1));
  const pics = Object.keys(report.pictures).length;
  console.log(pics + ' pictures, ' + (bytes / 1048576).toFixed(2) + ' MB (' + Math.round(bytes / Math.max(1, pics) / 1024) + ' KB each on average); ' + report.failed.length + ' failed');
  for (const f of report.failed) console.log('  FAIL ' + f.id + ' ' + f.pose + ': ' + f.error);
  const edged = Object.entries(report.pictures).filter(([, p]) => p.edge.length);
  if (edged.length) console.log(edged.length + ' touch an edge: ' + edged.map(([k, p]) => k + '(' + p.edge.join('+') + ')').join(' '));
} finally {
  await browser.close();
  await server.close();
}
