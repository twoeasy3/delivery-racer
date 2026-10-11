// Screenshots of the game, for checking how something looks and for the menu's pictures: starts the
// Vite dev server on a port of its own, and has headless Edge (or Chrome) load each address and save a PNG.
//   node scripts/shots.mjs <out-dir> name=<address> ...      each address is what follows /delivery/
//   node scripts/shots.mjs shots "bridge=?hidden=gimmick-road-2&ghost&at=4600&ff=4" "gimmicks=gimmicks.html"
//   node scripts/shots.mjs shots --levels                    every level's menu picture (?cine), as <id>.png
//   node scripts/shots.mjs shots --cars                      every garage car's (?cine=car), good and evil
//   node scripts/shots.mjs shots --levels=quarry-run,ring-road   only those
//   node scripts/shots.mjs --levels=quarry-run --write       the menu's OWN pictures of it, in both sizes (below)
// The menu's level pictures come in two sizes, both made from ONE frame taken at 1920x854: with --write,
// --levels writes src/delivery/levelshots/large/<id>.jpg (1920x854, for the stage on a desktop) and
// src/delivery/levelshots/<id>.jpg (600x267, for the strip, the album and a phone), JPEGs at --quality=80.
// The small one is the large frame scaled down in the browser (halved, then to size: smooth, not jagged).
// --write=<folder> puts the pair in <folder> and <folder>/large instead (to look at them first). Without
// --write, --levels saves PNGs in the out-dir as before and never touches the menu's pictures. --size and
// --scale are not used for a pair. Where the camera's usual place is no good, give the level one in CINE.
// Options: --size=1100x650 (any size), --scale=2 (device pixels to a CSS pixel, as on a phone: the picture is
// then twice the size each way; it is 1 unless asked), --wait=7000 (ms of page time each shot is given, once
// its page has loaded, before the picture is taken), --evil (the levels' pictures as Evil), --browser=<path>.
// A game address (one starting with ?) gets ?autostart added unless it names a mode of its own; add &ghost so
// nothing wrecks the car, &at=<m> to start that far along, and &ff=<s> to run the game on before the first
// frame. So a picture of the MENU is written index.html?... (or just index.html), not ?...
// Each line says how long the picture took, and under it the page's console errors and warnings.
// A run leaves nothing behind, and two runs at most take pictures at once (a third waits): see below. Its
// folder in %LOCALAPPDATA%\Temp is delivery-shots-run-<pid>-<when>; a start removes those of dead runs, and
// touches nothing else there (not the delivery-shots-XXXXXX folders of older versions of this script).
// HOW TO, for the common jobs (older notes describe a script that started a browser for every picture and wrote
// only PNGs: the command line is the same, what follows is what it does now):
//   a level, part-way along:   node scripts/shots.mjs <dir> "bridge=?level=1&ghost&at=900&ff=4"
//   ...by its id, not number:  node scripts/shots.mjs <dir> "crag=@quarry-run&ghost&at=2500&ff=4"   (numbers move as levels are added)
//   trying a menu camera:      node scripts/shots.mjs <dir> "a=@monza&ghost&cine&ff=6&at=300&cineside=left" --size=960x427
//   a level's menu still:      node scripts/shots.mjs <dir> --levels=<id>             (<dir>/<id>.png, to look at)
//   ...and the menu's own two: node scripts/shots.mjs --levels=<id> --write=<dir>     (<dir>/<id>.jpg and <dir>/large/<id>.jpg)
//                              node scripts/shots.mjs --levels=<id> --write           (the same, into src/delivery/levelshots)
//   the menu on a phone:       node scripts/shots.mjs <dir> "menu=index.html" --size=390x844 --scale=3
//   a reference page:          node scripts/shots.mjs <dir> "gimmicks=gimmicks.html" --size=1100x2400
//   the BUILT site:            npx vite build --outDir <dir>/dist      (from PowerShell), then
//                              node scripts/shots.mjs <dir> "menu=index.html" "run=?level=1&ghost&ff=4" --dist=<dir>/dist/client
//                              (the folder that holds delivery/ and assets/ is served as it is, with no Vite: what
//                              the page asks for and is not there is printed as a failed request)
// Look at every picture made: a grey frame, the inside of a wall or a tree across it are the usual failures.
import { createServer } from 'vite';
import { logicServer } from './delivery-headless.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { resolve, join, extname, normalize } from 'node:path';
import { createServer as createHttpServer } from 'node:http';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const out = resolve(args.find(a => !a.startsWith('--') && !a.includes('=')) || 'shots');
const [width, height] = String(opt('size', '1100x650')).split('x').map(Number);
const wait = Number(opt('wait', 7000)), scale = Number(opt('scale', 1)) || 1;
// the pair of menu pictures (--write): where they go, their sizes (one shape: 600:267), and the JPEGs' quality
const PAIR = { folder: opt('write', false) === true ? resolve('src/delivery/levelshots') : opt('write', false) ? resolve(String(opt('write'))) : null,
  large: [1920, 854], small: [600, 267], quality: Math.min(100, Math.max(1, Number(opt('quality', 80)) || 80)) / 100 };

const browser = opt('browser', null) || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);
if (!browser) { console.log('No Edge or Chrome found: name one with --browser=<path>'); process.exit(1); }

// the shots: [name, address], and for one of the menu's pairs a third: true
const shots = args.filter(a => !a.startsWith('--') && a.includes('=')).map(a => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
if (opt('levels', false) || opt('cars', false) || shots.some(([, address]) => address.startsWith('@'))) {
  // (the level and car lists are the game's own: read the same way the headless scripts do)
  const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
  globalThis.window = { addEventListener() {} };
  globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: '' };
  const reader = await logicServer();
  const levels = await reader.ssrLoadModule('/src/delivery/levels.js'), cars = await reader.ssrLoadModule('/src/delivery/cars.js');
  const side = opt('evil', false) ? '=evil' : '';
  const only = (value) => typeof value === 'string' ? value.split(',') : null;
  // (where the usual place for the camera, 9 m off the right-hand edge, is inside a wall, a stand or a building)
  // and where the picture is better taken further along than the start: &at=<m>, a little short of what is to be
  // in it (the six seconds of ?ff carry the car on from there)
  const CINE = { mumbai: '&cineout=-1&cineup=10&cineback=30', spa: '&cineside=left', 'albert-park': '&cineside=left', // (a block of flats; the pit building; a tree)
    expressway: '&at=880', 'back-roads': '&at=600', canberra: '&at=1200', // (each one's bridge)
    'grand-pacific': '&at=6000', 'passage-du-gois': '&at=900', safari: '&at=2350', airport: '&at=850', // (the Sea Cliff Bridge; the causeway; the hippos' river; a parked plane)
    'mountain-pass': '&at=2460&ff=4', 'outback-express': '&at=660&ff=1&cineside=left&cineup=8', 'tour-de-coast': '&at=2230&ff=3', stelvio: '&at=250', // (a hairpin under the peaks, on the way down: 420 is behind a fir since the level was re-laid; a level crossing; the cliff road; clear of a fir that fills the frame)
    // (an entry with an &ff of its own is taken after that many seconds, not six: a place chosen to the metre)
    'quarry-run': '&at=2520&ff=1&cineside=left&cineup=8' }; // (the crag before its blast, benches, stockpiles, a stacker, a siren mast: its level's agent's choice)
  const FF = (id) => /[?&]ff=/.test(CINE[id] || '') ? '' : '&ff=6';
  // (more places, in a statement of their own so that a branch changing one entry above merges cleanly)
  Object.assign(CINE, {
    toys: '&at=250', leaks: '&at=500', backlot: '&at=3400', venice: '&at=350', // (clear of a domino as tall as the frame; out of the entry tunnel, in the glass tube; among the sets; clear of a bridge's parapet)
    'marina-bay': '&cineout=-1&cineup=10&cineback=30', montreal: '&at=350', bathurst: '&at=600', // (each one's start is between grandstands, and the camera inside one)
    slipway: '&at=720', harbour: '&at=520', ford: '&at=1320', fjord: '&at=1950', // (the amphibious levels: afloat)
    stunts: '&cineout=-1&cineup=10&cineback=30', // (a New York street set: over the road, as its level's agent found it)
    'market-town': '&at=900&ff=2&cineside=left', // (the market square, its stalls and clock tower: its level's agent's frame)
    fallout: '&at=1660&ff=1&cineout=2&cineup=9', // (the plant's gate: the cooling towers and the dome ahead over the pipe racks, drums on the shoulder, the green on the road)
    'ring-road': '&at=4330&ff=1', // (the city centre's towers over the last stretch, the exit gantry ahead: its level's agent's frame)
    'albert-park': '&cineside=left&at=150' }); // (the tree again, further on)
  Object.assign(CINE, { thaw: '&at=3020&ff=1&cineside=left' }); // (Spring Thaw: the ford's sign, the bend and the meltwater, the side road leaving; the start is mostly empty sky)
  Object.assign(CINE, { 'hong-kong': '&at=400&ff=1&car=postvan' }); // (Hong Kong Harbour: the first ferry pier's clock tower and lanterns ahead on the promenade, the neon and the towers on the left; a tier-6 car, so the level starts)
  if (opt('levels', false)) {
    levels.LEVELS.forEach((level, i) => {
      if (!only(opt('levels')) || only(opt('levels')).includes(level.id)) shots.push([level.id, `?autostart${side}&level=${i + 1}&ghost&cine${FF(level.id)}${CINE[level.id] || ''}`, !!PAIR.folder]);
    });
  }
  if (opt('cars', false)) {
    for (const car of [...cars.CARS, ...Object.values(cars.LEVEL_CARS), ...Object.values(cars.SECRET_CARS)]) {
      if (only(opt('cars')) && !only(opt('cars')).includes(car.id)) continue;
      shots.push([car.id + '-good', `?autostart&car=${car.id}&cine=car`], [car.id + '-evil', `?autostart=evil&car=${car.id}&cine=car`]);
    }
  }
  // (an address may name its level by id, @<id>: a level's NUMBER moves whenever a level is added before it)
  for (const shot of shots) {
    if (!shot[1].startsWith('@')) continue;
    const id = shot[1].slice(1).split('&')[0], index = levels.LEVELS.findIndex(level => level.id === id);
    if (index < 0) { console.log('No level "' + id + '" on the menu (' + shot[0] + '=' + shot[1] + ')'); process.exit(1); }
    shot[1] = '?level=' + (index + 1) + shot[1].slice(1 + id.length);
  }
  await reader.close();
}
if (!shots.length) { console.log('Nothing to shoot: node scripts/shots.mjs <out-dir> name=<address> ... (or --levels, --cars)'); process.exit(1); }


// ---- what a run leaves behind, and how many run at once -------------------------------------------------
// A run leaves NOTHING on the disk, and only two take pictures at a time. On 10-Oct thirty agents' runs filled a
// 475 GB disk: every start of the browser wrote a scoped_dir (up to 394 MB) and a 74 MB <guid>.tmp into TEMP
// and never removed them, and there was a start for every picture. So:
//  - ONE browser takes all of a run's pictures, driven over the DevTools protocol and closed by it at the end
//    (ended from outside, its helpers kept hold of the profile; left to itself with a TEMP of its own, it sat
//    for three minutes after each picture);
//  - everything a run writes (Vite's cache, the browser's profile, the browser's TEMP) is in one folder of the
//    run's, in the machine's own temp folder whatever TEMP says, removed however the run ends;
//  - that folder's NAME is its marker, delivery-shots-run-<pid>-<when>: made in one step, so there is never a
//    folder of a run's without it (a pid FILE was lost when the removing of a folder took it first and then met
//    a file the browser still held). A run starts by ending the browsers and removing the folders of runs that
//    are dead: those whose process is gone, or whose `alive` file (freshened every 15 s) is 15 minutes old.
//    Only folders of exactly that name are ever touched: not the delivery-shots-XXXXXX of older versions of
//    this script, nor anything else in the temp folder;
//  - at most SLOTS runs take pictures at once on the machine: the rest wait their turn.
const ROOT = process.env.LOCALAPPDATA && existsSync(join(process.env.LOCALAPPDATA, 'Temp')) ? join(process.env.LOCALAPPDATA, 'Temp') : tmpdir();
const SLOTS = 2;              // runs taking pictures at once, on the whole machine
const STALE = 15 * 60 * 1000; // ms without a sign of life after which a run is taken for dead, whatever its pid says (pids are used again)
const RUN = /^delivery-shots-run-(\d+)-[a-z0-9]+$/, SLOT = /^delivery-shots-slot-\d+$/;
const WINDOWS = process.platform === 'win32', SYSTEM = join(process.env.SystemRoot || 'C:/Windows', 'System32');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); // (a wait where nothing may be awaited: on the way out)
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const age = (path) => { try { return Date.now() - statSync(path).mtimeMs; } catch { return null; } };
// Removing, tried again for `ms` while a browser that has just ended lets go of its files (Windows refuses a file
// that is open: EBUSY, EPERM). Answers the error if it would not go.
const remove = (path, ms = 12000) => {
  for (const until = Date.now() + ms; ;) {
    try { rmSync(path, { recursive: true, force: true }); return null; } catch (error) { if (Date.now() > until) return error; }
    pause(250);
  }
};
// every browser process started with that folder as its profile or TEMP: found by command line, not by tree
// (the helpers of a browser whose parent is gone belong to no tree)
const endBrowsersOf = (folder) => {
  try {
    if (WINDOWS) {
      const exe = browser.replace(/\\/g, '/').split('/').pop().replace(/'/g, "''"), text = folder.replace(/'/g, "''");
      spawnSync(join(SYSTEM, 'WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command',
        // (asked again until there are none: a browser ended as it starts has helpers still on their way up)
        `for ($i = 0; $i -lt 12; $i++) { $found = @(Get-CimInstance Win32_Process -Filter "Name='${exe}'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${text}') }); if (-not $found) { break }; $found | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 300 }`], { stdio: 'ignore', timeout: 45000 });
    } else spawnSync('pkill', ['-9', '-f', folder], { stdio: 'ignore' });
  } catch { /* (none to end) */ }
};
// a run's folder and its browsers, twice over if need be; says so if something of it is still there
const removeRun = (folder, browsers = true, leaving = false) => {
  let error = null;
  for (let round = 0; round < 2; round++) {
    if (browsers) endBrowsersOf(folder);
    if (!(error = remove(folder))) return;
    browsers = true;
  }
  // (A run's own folder, emptied, sometimes cannot be removed while the run itself lives, on a machine with every
  // core busy: EPERM for as long as it is tried. So a command left behind removes it a few seconds after the run.)
  if (leaving && WINDOWS) {
    try { spawn(join(SYSTEM, 'cmd.exe'), ['/d', '/s', '/c', `"ping -n 5 127.0.0.1 >nul & rmdir /s /q "${folder}""`], { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref(); return; } catch { /* (said below) */ }
  }
  console.log('  (could not remove ' + folder + ' yet: ' + String(error && error.message || error).split('\n')[0] + '; the next run takes it)');
};
// dead: its process gone, or no sign of life for a long while. (A slot is a folder with its owner's pid in a file;
// one with no pid yet is a run between making it and writing it, or one that died there.)
const deadRun = (name) => { const pid = Number(RUN.exec(name)[1]), since = age(join(ROOT, name, 'alive')) ?? age(join(ROOT, name)); return pid !== process.pid && since !== null && (!alive(pid) || since > STALE); };
const deadSlot = (folder) => {
  let pid = 0;
  try { pid = Number(readFileSync(join(folder, 'pid'), 'utf8')); } catch { const since = age(folder); return since !== null && since > 60000; }
  const since = age(join(folder, 'pid'));
  return pid !== process.pid && since !== null && (!(pid > 0) || !alive(pid) || since > STALE);
};
const sweep = () => {
  let names = [];
  try { names = readdirSync(ROOT); } catch { /* (no such folder) */ }
  for (const name of names) {
    if (RUN.test(name) && deadRun(name)) { console.log('  (removing what a dead run left: ' + name + ')'); removeRun(join(ROOT, name)); }
    else if (SLOT.test(name) && deadSlot(join(ROOT, name))) remove(join(ROOT, name), 2000);
  }
};
sweep();
const own = join(ROOT, 'delivery-shots-run-' + process.pid + '-' + Date.now().toString(36));
mkdirSync(own); // (not recursive: it must be new)
let slot = null, child = null, server = null, cleaned = false;
const fresh = () => { try { writeFileSync(join(own, 'alive'), ''); if (slot) { const now = new Date(); utimesSync(join(slot, 'pid'), now, now); } } catch { /* (gone) */ } };
fresh();
setInterval(fresh, 15000).unref();
const cleanup = () => { // (however the run ends, and all of it at once: an 'exit' handler cannot wait)
  if (cleaned) return;
  cleaned = true;
  if (child && child.exitCode === null) { try { WINDOWS ? spawnSync(join(SYSTEM, 'taskkill.exe'), ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) : child.kill('SIGKILL'); } catch { /* (gone already) */ } }
  if (slot) remove(slot, 2000);
  // (a browser that closed by itself has no helpers left to end, and asking costs a second: only if its files will not go)
  if (!child || remove(own, child.exitCode === null ? 0 : 3000)) removeRun(own, !!child, true);
};
process.on('exit', cleanup);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(signal, () => { console.log('  (' + signal + ': cleaning up)'); cleanup(); process.exit(130); });
process.on('uncaughtException', (error) => { console.log(String(error && error.stack || error)); cleanup(); process.exit(1); });
process.on('unhandledRejection', (error) => { console.log(String(error && error.stack || error)); cleanup(); process.exit(1); });
// a slot: a folder made in one step (so two runs cannot both make it), with its owner's pid in it
const takeSlot = async () => {
  for (let told = false; ; told = true) {
    for (let k = 1; k <= SLOTS; k++) {
      const folder = join(ROOT, 'delivery-shots-slot-' + k);
      if (deadSlot(folder)) remove(folder, 2000);
      try { mkdirSync(folder); } catch { continue; } // (taken)
      writeFileSync(join(folder, 'pid'), String(process.pid));
      return folder;
    }
    if (!told) console.log('  waiting for a free screenshot slot (' + SLOTS + ' runs at a time on this machine)');
    await sleep(1000);
  }
};

// ---- the browser: one for the run, driven over the DevTools protocol ------------------------------------
let socket = null, calls = 0, opened = 0;
const waiting = new Map(), listeners = new Map(); // (answers awaited, by call number; a page's events, by session)
const send = (method, params = {}, sessionId, timeout = 30000) => new Promise((done, fail) => {
  if (!socket || socket.readyState !== 1) return fail(new Error('the browser is gone'));
  const id = ++calls;
  const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
  waiting.set(id, (message) => { clearTimeout(timer); message.error ? fail(new Error(method + ': ' + message.error.message)) : done(message.result); });
  socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
});
const openBrowser = async () => {
  // (a profile for each start: the last one's files may be held a moment yet)
  const profile = join(own, 'profile-' + (++opened)), temp = join(own, 'tmp');
  mkdirSync(profile, { recursive: true });
  mkdirSync(temp, { recursive: true });
  const mine = child = spawn(browser, ['--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-extensions', '--disable-component-extensions-with-background-pages',
    '--disable-component-update', '--disable-background-networking', // (no 74 MB of components fetched for a profile that lasts a minute)
    '--user-data-dir=' + profile, // (a profile of its own: with the everyday one, a browser already open takes the address and no picture is made)
    '--remote-debugging-port=0', `--window-size=${Math.max(500, width)},${height}`, 'about:blank'],
  { stdio: 'ignore', env: { ...process.env, TEMP: temp, TMP: temp, TMPDIR: temp } }); // (its scoped_dir and .tmp go in the run's folder, not the machine's)
  mine.on('error', () => {});
  // (the port it chose, and the path of its socket, are written into the profile)
  let where = null;
  for (let i = 0; i < 300 && !where && mine.exitCode === null; i++) {
    await sleep(100);
    try { const lines = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n'); if (lines.length > 1 && lines[1].trim()) where = `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`; } catch { /* (not up yet) */ }
  }
  if (!where) throw new Error('the browser did not start: ' + browser);
  socket = new WebSocket(where);
  await new Promise((done, fail) => { socket.addEventListener('open', done); socket.addEventListener('error', () => fail(new Error('no DevTools connection to the browser'))); });
  socket.addEventListener('message', (m) => {
    const message = JSON.parse(m.data);
    if (message.id) { const answer = waiting.get(message.id); waiting.delete(message.id); if (answer) answer(message); }
    else if (message.sessionId && listeners.has(message.sessionId)) listeners.get(message.sessionId)(message);
  });
};
// closed by its own protocol, and waited for: only then are its files let go
const closeBrowser = async () => {
  const mine = child;
  if (!mine) return;
  const gone = new Promise(done => { if (mine.exitCode !== null || mine.signalCode !== null) done(); else mine.once('exit', done); });
  try { await send('Browser.close', {}, undefined, 5000); } catch { /* (gone, or deaf: ended below) */ }
  await Promise.race([gone, sleep(10000)]);
  try { socket && socket.close(); } catch { /* (closed) */ }
  socket = null;
};
// One picture: a page of its own, loaded, then given `wait` ms of page time (which stands still while anything is
// being fetched). The page time is given once the page has loaded: given before, it can run out part-way through
// the loading and stop the page there, and then no picture is ever made of it.
const LIMIT = 90000; // ms of real time a picture may take
// The pair of JPEGs from one frame (a PNG, in base 64), made by the browser in a blank page: the large one is the
// frame itself, the small one the frame drawn smaller on a canvas: to half its size first, then to its own, each
// step smoothed, so that a 3.2-fold reduction does not skip pixels and leave edges jagged. Answers both, in base 64.
const pairOf = async (png) => {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const made = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
      const image = new Image();
      image.src = 'data:image/png;base64,${png}';
      await image.decode();
      const drawn = (from, w, h) => { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const pen = canvas.getContext('2d'); pen.imageSmoothingEnabled = true; pen.imageSmoothingQuality = 'high'; pen.drawImage(from, 0, 0, w, h); return canvas; };
      const jpeg = (canvas) => canvas.toDataURL('image/jpeg', ${PAIR.quality}).split(',')[1];
      const [W, H] = ${JSON.stringify(PAIR.large)}, [w, h] = ${JSON.stringify(PAIR.small)};
      if (image.naturalWidth !== W || image.naturalHeight !== H) throw new Error('the frame is ' + image.naturalWidth + 'x' + image.naturalHeight + ', not ' + W + 'x' + H);
      return { large: jpeg(drawn(image, W, H)), small: jpeg(drawn(drawn(image, Math.round(W / 2), Math.round(H / 2)), w, h)) };
    })()` }, sessionId, 60000);
    if (made.exceptionDetails) throw new Error('the pair of pictures: ' + (made.exceptionDetails.exception?.description || made.exceptionDetails.text));
    return made.result.value;
  } finally {
    try { await send('Target.closeTarget', { targetId }, undefined, 5000); } catch { /* (gone with the browser) */ }
  }
};
const shoot = async (url, file, pair) => {
  const notes = [];
  const note = (text) => { text = String(text).split('\n')[0].slice(0, 300); if (!notes.includes(text)) notes.push(text); };
  if (!socket || socket.readyState !== 1 || !child || child.exitCode !== null) { await closeBrowser(); await openBrowser(); }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    let timeUp, isLoaded;
    const expired = new Promise(done => { timeUp = done; }), loaded = new Promise(done => { isLoaded = done; });
    listeners.set(sessionId, ({ method, params }) => {
      if (method === 'Emulation.virtualTimeBudgetExpired') timeUp(true);
      else if (method === 'Page.loadEventFired') isLoaded(true);
      else if (method === 'Runtime.exceptionThrown') note('exception: ' + (params.exceptionDetails.exception?.description || params.exceptionDetails.text));
      else if (method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(params.type)) note(params.type + ': ' + params.args.map(a => a.value ?? a.description ?? a.type).join(' '));
      else if (method === 'Log.entryAdded' && ['error', 'warning'].includes(params.entry.level)) note(params.entry.level + ': ' + params.entry.text + (params.entry.url ? '  ' + params.entry.url : ''));
    });
    const page = (method, params, timeout) => send(method, params, sessionId, timeout);
    await page('Page.enable'); await page('Runtime.enable'); await page('Log.enable');
    await page('Emulation.setDeviceMetricsOverride', pair ? { width: PAIR.large[0], height: PAIR.large[1], deviceScaleFactor: 1, mobile: false } : { width, height, deviceScaleFactor: scale, mobile: false }); // (the picture's size exactly, and any size: a window goes no narrower than 500)
    const went = await page('Page.navigate', { url }, LIMIT);
    if (went.errorText) note('error: ' + went.errorText);
    if (!await Promise.race([loaded, sleep(LIMIT)])) note('warning: not loaded after ' + LIMIT / 1000 + ' s: the picture is of the page as it stood');
    else {
      await page('Emulation.setVirtualTimePolicy', { policy: 'pauseIfNetworkFetchesPending', budget: wait });
      if (!await Promise.race([expired, sleep(LIMIT)])) note('warning: its ' + wait + ' ms of page time were not up after ' + LIMIT / 1000 + ' s: the picture is of the page as it stood');
    }
    let shot;
    try { shot = await page('Page.captureScreenshot', { format: 'png' }, 15000); } catch {
      // (a page stopped in the middle of something draws no frame: let its time run, and ask again)
      await page('Emulation.setVirtualTimePolicy', { policy: 'advance' });
      shot = await page('Page.captureScreenshot', { format: 'png' }, 30000);
    }
    listeners.delete(sessionId);
    if (pair) { // (file: the small one; the large one beside it, in large/)
      const both = await pairOf(shot.data);
      writeFileSync(join(PAIR.folder, 'large', pair), Buffer.from(both.large, 'base64'));
      writeFileSync(file, Buffer.from(both.small, 'base64'));
    } else writeFileSync(file, Buffer.from(shot.data, 'base64'));
  } finally {
    try { await send('Target.closeTarget', { targetId }, undefined, 5000); } catch { /* (gone with the browser) */ }
  }
  return notes;
};

let failed = 0;
try {
  if (shots.some(shot => !shot[2])) mkdirSync(out, { recursive: true });
  if (PAIR.folder) mkdirSync(join(PAIR.folder, 'large'), { recursive: true });
  slot = await takeSlot();
  // (The run's folder holds Vite's cache as well. Every worktree's node_modules is a junction to one folder, so the
  // usual cache, node_modules/.vite, is one for them all, and a server started from another worktree deletes it to
  // bundle the dependencies again: see delivery-headless.mjs. It costs a few seconds of bundling each run.)
  const DIST = typeof opt('dist', false) === 'string' ? resolve(opt('dist')) : null;
  let port;
  if (DIST) {
    // (the built site, served as plain files: --dist=<the folder that holds delivery/ and assets/>)
    if (!existsSync(join(DIST, 'delivery', 'index.html'))) throw new Error('no delivery/index.html in ' + DIST + ': --dist is the folder that holds delivery/ and assets/ (dist/client)');
    const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };
    const http = createHttpServer((request, answer) => {
      let path = decodeURIComponent(request.url.split('?')[0]);
      if (path.endsWith('/')) path += 'index.html';
      const file = normalize(join(DIST, path));
      try {
        if (!file.startsWith(DIST)) throw new Error('outside');
        const data = readFileSync(file);
        answer.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
        answer.end(data);
      } catch { console.log('          failed request: ' + request.url + '  (not in the build)'); answer.writeHead(404); answer.end('not found'); }
    });
    for (port = 5199; ; port++) { // (the first free port from 5199 up)
      const taken = await new Promise(done => { http.once('error', () => done(true)); http.listen(port, '127.0.0.1', () => done(false)); });
      if (!taken) break;
      if (port > 5260) throw new Error('no free port for the built site');
    }
    server = { close: () => new Promise(done => { http.closeAllConnections(); http.close(done); }) };
  } else {
    server = await createServer({ server: { port: 5199, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
    await server.listen();
    port = server.config.server.port;
  }
  const base = `http://${DIST ? '127.0.0.1' : 'localhost'}:${port}/delivery/`;
  for (const [name, address, pair] of shots) {
    const game = address.startsWith('?') && !/[?&](autostart|hidden|test|edited|screensaver|racewatch|garage|album|milestones)\b/.test(address);
    const url = base + (game ? address.replace('?', '?autostart&') : address);
    const file = pair ? join(PAIR.folder, name + '.jpg') : join(out, name + '.png');
    const began = Date.now();
    let notes = [], why = '';
    for (let go = 0, done = false; go < 2 && !done; go++) { // (once more if the browser gave no answer: a machine with every core busy)
      try { why = ''; notes = await shoot(url, file, pair && name + '.jpg'); done = true; } catch (error) { why = '  ' + String(error && error.message || error); }
    }
    // (made by THIS run: a picture of that name from before is left as it was if this one fails)
    const ok = existsSync(file) && statSync(file).size > 2000 && statSync(file).mtimeMs >= began - 2000;
    if (!ok) failed++;
    const sizes = ok && pair ? '  ' + [file, join(PAIR.folder, 'large', name + '.jpg')].map(f => Math.round(statSync(f).size / 1024) + ' KB').join(' + ') : '';
    console.log((ok ? '  ok    ' : '  FAIL  ') + name + '  ' + url + '  (' + ((Date.now() - began) / 1000).toFixed(1) + ' s)' + sizes + why);
    for (const text of notes) console.log('          ' + text); // (what the page said: its errors and warnings)
  }
} finally {
  try { await closeBrowser(); } catch { /* (ended in cleanup) */ }
  try { if (server) await server.close(); } catch { /* (closed) */ }
  cleanup();
}
console.log(failed ? failed + ' failed' : shots.length + ' shot' + (shots.length === 1 ? '' : 's') + ' in ' + (shots.every(shot => shot[2]) ? PAIR.folder : out));
process.exit(failed ? 1 : 0);
