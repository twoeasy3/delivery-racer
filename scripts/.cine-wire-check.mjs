// A check of THE CUTSCENES IN THE GAME (render/cinequeue.js, CHECKLIST 438, CINE-WIRING.md): the unlock cinematics
// (render/unlockcine.js, render/ecucine.js) played from the game's own flow. In headless Chromium over DevTools (skipped with a
// note if no browser is found), a phone (390x844, touch, DPR 3), each on a real save written first:
//   PURCHASE   the Garage (was the car lot: ?garage&look=<car>, its Buy button, the sheet's Buy) and the SHOWROOM's Buy (CHECKLIST 451): Crazey Jim's sale, once, the car already in the
//              stored save when the cutscene's page element appears; a tap skips to the held end, a tap closes it; the lot is
//              still there under it; no plain 'car' unlock for the same car
//   ECU UP     the showroom's full view (?showroom&look=<car>&full): its Upgrade button: ECU UP at the new level; the next one, to
//              the car's max: MAX ECU (and not ECU UP as well); the ECU bought stored before it starts
//   PACK       a pack given with a car one blueprint short of its first ECU (the Car Hunt pack, dealt that car): the reveal first,
//              no cutscene while it is open; Done: the car's unlock; a second pack held opens only after the cutscene is closed
//   KEY, CAR   a key car's key and two blueprint cars reaching ECU1 at once: queued, played in order, never two at once
//   SETTING    Options > Settings 'Cutscenes: On' -> Short -> Off, stored in localStorage only (not in the save); Off: none plays;
//              Short: straight to the held end
//   LITE       ?cinelite (and any ?lite=): the fade-only version asked for
//   FAILSAFE   no WebGL: closed at once and the next one plays; a play not held within the limit: closed ('timeout')
//   HEADLESS   without ?cineplay a headless browser plays none (logged 'headless')
//   BULK       more than BULK cars at once (Unlock everything): none
//   FINGERPRINT the replay rules fingerprint (scripts/logic-hash.mjs) is main's (no logic file touched)
//   HELD      (CHECKLIST 452) every cinematic (car, key, fob, jim, ecu, ecumax) held at its end keeps drawing; nothing above the
//              floor 6 s in (Jim's confetti still falling 0.5 s in); a skip holds at once with nothing in the air
//   LAMPS     (CHECKLIST 452) sample cars (hand-written, generated, a Legendary, an idea) light their render/carlights.js TABLE lamps
//              (each one, one scale from the table's metres); a car whose headlamps the guess missed; a car with no entry guesses
//   FIREWORKS (CHECKLIST 453) the key unlock's last shot, blade and fob: present only there, none 6 s into the held end, none after
//              a skip, none in the lite version
//   --only=purchase,ecu,pack,rest,held,lamps,fireworks,stills runs those parts; --shots also takes Jim's key, its held end at 0.5 and 3 s
//   node scripts/.cine-wire-check.mjs [--browser=<path>] [--shots=<dir>]
// --shots saves the phone stills (purchase, ECU up, pack unlock, the setting).
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fingerprints } from './logic-hash.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const SHOTS = opt('shots', null), ONLY = opt('only', null), DEBUG = !!opt('debug', false);
const want = (part) => !ONLY || String(ONLY).split(',').includes(part);
let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const MAIN_PRINT = { logic: '057a22806d', legacy: '661de07fbe' }; // (since CHECKLIST 470, no pickup in the air: was 33a0394c26 / dd565f56b3, main v1.1.151-alpha to v1.1.153)

// ---- the source
const src = (p) => readFileSync(join(ROOT, 'src/delivery', p), 'utf8');
const queueJs = src('render/cinequeue.js');
check(!/^import[^;]*unlockcine/m.test(queueJs) && /import\('\.\/unlockcine\.js'\)/.test(queueJs), 'render/cinequeue.js loads the cinematics only by a dynamic import');
const statics = ['main.js', 'render/packs.js', 'render/garage.js', 'render/ridenudge.js', 'render/ecuupgrade.js', 'render/carbuy.js', 'render/showroom.js'].filter(f => /^import[^;]*['"][./]*(render\/)?unlockcine\.js['"]/m.test(src(f)));
check(!statics.length, 'nothing imports render/unlockcine.js statically' + (statics.length ? ': ' + statics.join(', ') : ''));
check(!/progress\.js|Progress\.data\.\w+\s*=/.test(queueJs.replace(/import \{ Progress \} from '\.\.\/progress\.js';/, '')) && /localStorage\.setItem\(CINE_KEY/.test(queueJs), 'the setting is kept in localStorage by the queue, never written into the save');
// (CHECKLIST 451) ONE purchase path: render/carbuy.js buyCar (Progress.buy, then purchased()); the showroom, the Garage and the results'
// Better ride all buy through it, and nothing else in render/ buys a roster car (menu.js's secret bus aside)
{
  const buyJs = src('render/carbuy.js'), users = ['render/showroom.js', 'render/garage.js', 'render/ridenudge.js'].filter(f => /import \{[^}]*\bbuyCar\b[^}]*\} from '\.\/carbuy\.js'/.test(src(f)) && /buyCar\(/.test(src(f).replace(/import[^;]*;/g, '')));
  check(/Progress\.buy\(car\)/.test(buyJs) && /purchased\(car\)/.test(buyJs), 'render/carbuy.js buys (Progress.buy) and queues the sale cutscene (purchased)');
  check(users.length === 3, 'the showroom, the Garage and the Better ride card buy through buyCar (' + users.join(', ') + ')');
  check(!['render/showroom.js', 'render/garage.js', 'render/ridenudge.js'].some(f => /Progress\.buy\(|(?<![.\w])purchased\(/.test(src(f).replace(/\/\/.*$/gm, ''))),'none of them calls Progress.buy or purchased itself');
}
const print = fingerprints(join(ROOT, 'src/delivery') + '/');
check(print.logic === MAIN_PRINT.logic && print.legacy === MAIN_PRINT.legacy, 'the replay rules fingerprint is main\'s: ' + print.logic + ' / ' + print.legacy);

const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-cinewire-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5251, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
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
    if (DEBUG) { await page('Runtime.enable'); socket.addEventListener('message', (m) => { const x = JSON.parse(m.data); if (x.method === 'Runtime.consoleAPICalled') console.log('    [page ' + x.params.type + ']', x.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 300)); if (x.method === 'Runtime.exceptionThrown') console.log('    [page error]', x.params.exceptionDetails.exception?.description?.slice(0, 400)); }); }
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 });
    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const shot = async (name) => {
      if (!SHOTS) return;
      mkdirSync(SHOTS, { recursive: true });
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
    };
    const base = `http://localhost:${port}/delivery/`;
    const go = async (address, settle = 3500) => {
      await page('Page.navigate', { url: base + address });
      await sleep(settle);
      await evaluate(`document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    };
    const until = async (expression, ms = 20000, step = 100) => {
      const t0 = Date.now();
      for (;;) { const v = await evaluate(expression); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(step); }
    };
    // a save written as a player's: everything cleared, then the fields given (and any blueprints to a car's cap: `cap: [ids]`)
    const seed = async (fields, { cap = [], mode = null } = {}) => {
      await go('index.html?cineplay', 2500);
      await evaluate(`(async () => {
        const { Progress } = await import('/src/delivery/progress.js');
        const { Ecu } = await import('/src/delivery/ecu.js');
        const { carById } = await import('/src/delivery/cars.js');
        Progress.reset();
        Object.assign(Progress.data, ${JSON.stringify(fields)});
        for (const id of ${JSON.stringify(cap)}) (Progress.data.blueprints ||= {})[id] = Ecu.cap(carById(id));
        Progress.save();
        try { ${mode ? `localStorage.setItem('delivery_cutscenes', ${JSON.stringify(mode)})` : `localStorage.removeItem('delivery_cutscenes')`}; } catch {}
        return true;
      })()`);
    };
    // the page's watch: each cutscene element as it appears (the save as stored at that moment), the most at once
    const WATCH = `(() => { if (window.__watch) return true; const w = window.__watch = { seen: [], most: 0 };
      new MutationObserver(() => { const n = document.querySelectorAll('.ucine').length; w.most = Math.max(w.most, n);
        for (const el of document.querySelectorAll('.ucine')) if (!el.__seen) { el.__seen = true; let saved = null; try { saved = JSON.parse(localStorage.getItem('delivery_racer_progress_backup')); } catch {}
          w.seen.push({ at: Date.now(), busy: window.__cine?.busy, saved, reveal: !!document.querySelector('.pack-reveal:not(.hidden)') }); } })
        .observe(document.body, { childList: true }); return true; })()`;
    const tap = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`);
    const busy = () => evaluate(`window.__cine.busy`);
    let log = [];
    const logOf = () => evaluate(`window.__cine.log.map(e => ({ mode: e.mode, carId: e.carId, level: e.level ?? null, what: e.what, lite: e.lite, short: e.short, owned: e.owned, at: e.at }))`);

    // ---- PURCHASE: the car lot
    await go('index.html?cineplay', 2500); // (a page, for the module imports below)
    const BUY = 'darkvan'; // (a 1-star car: the menu's first level allows only those until its medal)
    if (want('purchase')) {
    await seed({ money: 5000, cars: ['commuter'], unlocked: 99, tierBase: 99 });
    await go(`index.html?cineplay&garage&look=${BUY}&click=%23garageAction`, 5000);
    await evaluate(WATCH);
    const sheet = await until(`!!document.querySelector('.menu-dialog .dialog-ok')`, 8000);
    check(!!sheet, 'the car lot: the ' + BUY + '\'s Buy opens the sheet');
    await shot('1-purchase-sheet');
    await tap('.menu-dialog .dialog-ok');
    const jim = await until(`window.__watch.seen[0] || null`, 15000);
    check(jim?.busy?.mode === 'jim' && jim.busy.carId === BUY, 'bought: Crazey Jim\'s sale cutscene plays for it (' + JSON.stringify(jim?.busy) + ')');
    check(!!jim?.saved?.cars?.includes(BUY) && jim.saved.money < 5000, 'the purchase was in the stored save when the cutscene appeared (cars ' + jim?.saved?.cars + ', money ' + jim?.saved?.money + ')');
    await sleep(2600);
    await shot('2-purchase-cine');
    await tap('.ucine');
    await sleep(300);
    check((await busy())?.held === true, 'a tap skips it to the held end');
    await shot('3-purchase-held');
    await tap('.ucine');
    await sleep(400);
    const lot = await evaluate(`({ gone: !document.querySelector('.ucine'), garage: !document.getElementById('garageUi').classList.contains('hidden'), busy: window.__cine.busy })`);
    check(lot.gone && lot.garage && !lot.busy, 'a second tap closes it, back on the car lot');
    await sleep(2200); // (the watch's look, a second)
    log = await logOf();
    check(log.filter(e => e.what === 'started').length === 1 && !log.some(e => e.mode === 'car' && e.carId === BUY), 'played once, and no plain car unlock for the car bought (' + log.map(e => e.mode + ':' + e.what).join(', ') + ')');

    }
    // ---- PURCHASE in the SHOWROOM (CHECKLIST 451: the car lot retired as the shop; the showroom's Buy is the one purchase path,
    // render/carbuy.js): the full view's Buy and its price, the sheet's Buy, Crazey Jim's sale, the car then drivable there
    if (want('showroombuy')) {
    const SR = 'junker';
    await seed({ money: 5000, cars: ['commuter'], unlocked: 99, tierBase: 99 });
    await go(`index.html?cineplay&showroom&look=${SR}&full`, 5000);
    await evaluate(WATCH);
    const words = await evaluate(`document.querySelector('#showroom .sr-go.buy > span')?.textContent || null`);
    check(/^Buy \$\d+/.test(words || ''), 'the showroom: the ' + SR + '\'s full view says Buy and its price ("' + words + '")');
    check(await tap('#showroom .sr-go.buy'), 'its Buy button pressed');
    const sheet = await until(`!!document.querySelector('.menu-dialog .dialog-ok')`, 8000);
    check(!!sheet, 'the showroom\'s Buy opens the sheet');
    await shot('1b-showroom-sheet');
    await tap('.menu-dialog .dialog-ok');
    const jim = await until(`window.__watch.seen[0] || null`, 15000);
    check(jim?.busy?.mode === 'jim' && jim.busy.carId === SR, 'bought in the showroom: Crazey Jim\'s sale cutscene plays for it (' + JSON.stringify(jim?.busy) + ')');
    check(!!jim?.saved?.cars?.includes(SR) && jim.saved.money < 5000, 'the purchase was in the stored save when the cutscene appeared');
    await sleep(2600);
    await shot('2b-showroom-cine');
    await tap('.ucine'); await sleep(300); await tap('.ucine'); await sleep(500);
    const after = await evaluate(`({ gone: !document.querySelector('.ucine'), open: !document.getElementById('showroom').classList.contains('hidden'), go: document.querySelector('#showroom .sr-go > span')?.textContent })`);
    check(after.gone && after.open && /^Drive/.test(after.go || ''), 'closed: back on the showroom, the car now to drive ("' + after.go + '")');
    }
    // ---- THE GARAGE UNDER OPTIONS (CHECKLIST 451): Options > Garage opens it, its Back comes back to Options; the car card opens the
    // showroom, never the Garage
    if (want('garagenav')) {
    await seed({ money: 500, cars: ['commuter'], unlocked: 99, tierBase: 99 });
    await go('index.html?options', 4000);
    check(await tap('#garageBtn'), 'Options: the Garage button');
    await sleep(600);
    const inG = await evaluate(`({ garage: !document.getElementById('garageUi').classList.contains('hidden'), menu: !document.getElementById('startScreen').classList.contains('hidden'), tab: document.getElementById('garageTabBtn').textContent })`);
    check(inG.garage && !inG.menu && inG.tab === 'Garage', 'it opens the Garage (tab "' + inG.tab + '"), the menu hidden');
    await tap('#garageBackBtn');
    await sleep(600);
    const back = await evaluate(`({ garage: !document.getElementById('garageUi').classList.contains('hidden'), menu: !document.getElementById('startScreen').classList.contains('hidden'), options: !document.getElementById('menuOptions').classList.contains('hidden') })`);
    check(!back.garage && back.menu && back.options, 'its Back returns to Options (' + JSON.stringify(back) + ')');
    await tap('#optionsCloseBtn'); await sleep(300);
    await tap('#shop'); await sleep(800);
    const card = await evaluate(`({ showroom: !document.getElementById('showroom').classList.contains('hidden'), garage: !document.getElementById('garageUi').classList.contains('hidden') })`);
    check(card.showroom && !card.garage, 'the car card opens the showroom, not the Garage');
    }
    // ---- ECU UP, then MAX ECU: the showroom's full view
    if (want('ecu')) {
    const ECU = 'hearse'; // (max ECU3)
    await seed({ money: 99999, cars: ['commuter', ECU], unlocked: 99, tierBase: 99, ecuBought: { [ECU]: 1 } }, { cap: [ECU] });
    await go(`index.html?cineplay&showroom&look=${ECU}&full`, 5000);
    await evaluate(WATCH);
    const max = await evaluate(`import('/src/delivery/ecu.js').then(m => import('/src/delivery/cars.js').then(c => m.Ecu.max(c.carById(${JSON.stringify(ECU)}))))`);
    await shot('4-ecu-button');
    check(await tap('.sr-up-btn.ready'), 'the showroom: the Upgrade button is ready (max ECU ' + max + ')');
    const up = await until(`window.__watch.seen[0] || null`, 15000);
    check(up?.busy?.mode === (max > 2 ? 'ecu' : 'ecumax') && up.busy.level === 2, 'ECU bought: ' + (max > 2 ? 'ECU UP' : 'MAX ECU') + ' at ECU2 (' + JSON.stringify(up?.busy) + ')');
    check(up?.saved?.ecuBought?.[ECU] === 2, 'the ECU bought was in the stored save when it appeared (' + JSON.stringify(up?.saved?.ecuBought) + ')');
    await sleep(3600);
    await shot('5-ecu-cine');
    await tap('.ucine'); await sleep(300); await tap('.ucine'); await sleep(800);
    if (max >= 3) {
      await evaluate(`window.__watch.seen.length = 0`);
      check(await until(`(() => { const b = document.querySelector('.sr-up-btn.ready'); if (b) b.click(); return !!b; })()`, 5000), 'the next Upgrade, to the max');
      const top = await until(`window.__watch.seen[0] || null`, 15000);
      check(top?.busy?.mode === 'ecumax' && top.busy.level === max, 'the max ECU: MAX ECU (' + JSON.stringify(top?.busy) + ')');
      await sleep(5000);
      await shot('6-ecumax-cine');
      await tap('.ucine'); await sleep(300); await tap('.ucine'); await sleep(500);
    }
    log = await logOf();
    check(log.filter(e => e.what === 'started' && /^ecu/.test(e.mode)).map(e => e.mode + e.level).join() === (max >= 3 ? 'ecu2,ecumax' + max : 'ecumax2'), 'each ECU bought played once, ECU UP then MAX ECU, never both for one step (' + log.filter(e => e.what === 'started').map(e => e.mode + e.level).join() + ')');

    }
    // ---- PACK: a car unlocked by a pack's card; a second pack waits for the cutscene
    if (want('pack')) {
    const pick = await evaluate(`(async () => { const { FILLER_CARS } = await import('/src/delivery/cars.js'); const { Ecu } = await import('/src/delivery/ecu.js');
      const c = FILLER_CARS.find(c => Ecu.isBlueprint(c) && !c.off && !c.noPacks && !c.bespoke && Ecu.x(c) > 1); return c ? { id: c.id, x: Ecu.x(c) } : null; })()`);
    check(!!pick, 'a blueprint car for the pack: ' + pick?.id + ' (' + pick?.x + ' a step)');
    await seed({ money: 100, cars: ['commuter'], unlocked: 99, tierBase: 99, blueprints: { [pick.id]: pick.x - 1 } });
    await go('index.html?cineplay', 4000);
    await evaluate(WATCH);
    await evaluate(`import('/src/delivery/packs.js').then(({ Packs }) => { Packs.grant('car-hunt-special', { car: ${JSON.stringify(pick.id)} }); Packs.revealNow(); return true; })`);
    const opened = await until(`!!document.querySelector('.pack-reveal:not(.hidden)')`, 8000);
    check(!!opened, 'the pack given opens its reveal');
    await evaluate(`import('/src/delivery/packs.js').then(({ Packs }) => Packs.grant('career'))`); // (a second pack, held while the first is open)
    await sleep(1500);
    await tap('#packReveal'); // (all the cards at once)
    await sleep(1200);
    await shot('7-pack-reveal');
    const during = await evaluate(`({ seen: window.__watch.seen.length, queued: window.__cine.queue.map(q => q.mode + ':' + q.carId) })`);
    check(during.seen === 0, 'no cutscene over the open reveal (queued meanwhile: ' + during.queued.join() + ')');
    await tap('#packReveal .pr-done');
    const unlock = await until(`window.__watch.seen[0] || null`, 8000);
    check(unlock?.busy?.mode === 'car' && unlock.busy.carId === pick.id && !unlock.reveal, 'Done: the car\'s unlock plays (' + JSON.stringify(unlock?.busy) + '), no reveal open under it');
    await sleep(3000);
    await shot('8-pack-unlock-cine');
    check(!await evaluate(`!!document.querySelector('.pack-reveal:not(.hidden)')`), 'the second pack held waits while it plays');
    await tap('.ucine'); await sleep(300); await tap('.ucine');
    check(!!await until(`!!document.querySelector('.pack-reveal:not(.hidden)')`, 6000), 'closed: the second pack opens');
    await evaluate(`document.querySelector('#packReveal .pr-close')?.click()`);
    await sleep(600);

    }
    // ---- KEY and CAR at once: queued, in order, never overlapping
    if (want('rest')) {
    if (ONLY) { await seed({ money: 100, cars: ['commuter'], unlocked: 99, tierBase: 99 }); await go('index.html?cineplay', 3500); await evaluate(WATCH); }
    const keyCar = await evaluate(`import('/src/delivery/cars.js').then(({ BESPOKE_CARS }) => (BESPOKE_CARS.find(c => !c.off && c.id === 'horseshoe') || BESPOKE_CARS.find(c => !c.off)).id)`);
    const twoBp = await evaluate(`(async () => { const { FILLER_CARS } = await import('/src/delivery/cars.js'); const { Ecu, } = await import('/src/delivery/ecu.js'); const { Progress } = await import('/src/delivery/progress.js');
      return FILLER_CARS.filter(c => Ecu.isBlueprint(c) && !c.off && !Progress.owns(c.id)).slice(0, 2).map(c => ({ id: c.id, x: Ecu.x(c) })); })()`);
    await evaluate(`window.__watch.seen.length = 0; window.__watch.most = 0; window.__cine.log.length = 0`);
    await evaluate(`(async () => { const { Progress } = await import('/src/delivery/progress.js');
      Progress.data.cars.push(${JSON.stringify(keyCar)}); for (const c of ${JSON.stringify(twoBp)}) Progress.data.blueprints[c.id] = c.x; Progress.save();
      window.dispatchEvent(new Event('progresschange')); return true; })()`);
    const order = [];
    for (let i = 0; i < 3; i++) {
      const s = await until(`window.__watch.seen[${i}] || null`, 15000);
      order.push(s?.busy?.mode + ':' + s?.busy?.carId);
      if (i === 0) { await sleep(2500); await shot('9-key-cine'); }
      await tap('.ucine'); await sleep(250); await tap('.ucine'); await sleep(200);
    }
    const queued = (await logOf()).filter(e => e.what === 'queued').map(e => e.mode + ':' + e.carId);
    check(order.length === 3 && order.join() === queued.join() && order.includes('key:' + keyCar) && twoBp.every(c => order.includes('car:' + c.id)), 'a key and two cars at once: queued and played in that order (' + order.join(', ') + ')');
    check(await evaluate(`window.__watch.most`) === 1, 'never two cutscenes at once');
    const keyLog = (await logOf()).filter(e => e.what === 'started');
    check(keyLog.every(e => e.owned), 'each was already owned (saved) when it started');

    // ---- the SETTING
    await evaluate(`document.getElementById('optionsBtn').click()`);
    await sleep(600);
    const words = await evaluate(`document.getElementById('cineBtn')?.textContent`);
    check(words === 'Cutscenes: On', 'Options > Settings: "' + words + '" (the default)');
    await evaluate(`document.getElementById('cineBtn').scrollIntoView({ block: 'center' })`);
    await sleep(200);
    await shot('10-setting');
    await tap('#cineBtn');
    const short = await evaluate(`({ text: document.getElementById('cineBtn').textContent, stored: localStorage.getItem('delivery_cutscenes'), inSave: /cutscene/i.test(localStorage.getItem('delivery_racer_progress_backup') || '') })`);
    check(short.text === 'Cutscenes: Short' && short.stored === 'short' && !short.inSave, 'a tap: Short, in localStorage, not in the save');
    await tap('#cineBtn');
    check(await evaluate(`document.getElementById('cineBtn').textContent`) === 'Cutscenes: Off', 'another: Off');
    await tap('#cineBtn');
    check(await evaluate(`document.getElementById('cineBtn').textContent`) === 'Cutscenes: On', 'another: On again');
    await evaluate(`document.getElementById('optionsCloseBtn').click()`);

    // Off: none plays (logged 'off'); Short: at the held end at once
    const giveCar = (id) => evaluate(`import('/src/delivery/progress.js').then(({ Progress }) => { Progress.data.cars.push(${JSON.stringify(id)}); Progress.save(); window.dispatchEvent(new Event('carchange')); return true; })`);
    const spare = await evaluate(`import('/src/delivery/cars.js').then(({ CARS }) => import('/src/delivery/progress.js').then(({ Progress }) => CARS.filter(c => !Progress.owns(c.id) && c.price > 0).slice(0, 4).map(c => c.id)))`);
    await evaluate(`localStorage.setItem('delivery_cutscenes', 'off'); window.__watch.seen.length = 0; window.__cine.log.length = 0`);
    await giveCar(spare[0]);
    await sleep(1500);
    log = await logOf();
    check(!(await evaluate(`window.__watch.seen.length`)) && log.some(e => e.carId === spare[0] && e.what === 'off'), 'Off: a car had, none plays (' + log.map(e => e.carId + ':' + e.what).join() + ')');
    await evaluate(`localStorage.setItem('delivery_cutscenes', 'short')`);
    await giveCar(spare[1]);
    const s1 = await until(`window.__watch.seen[0] || null`, 8000);
    await sleep(700);
    check(s1?.busy?.carId === spare[1] && (await busy())?.held === true && (await logOf()).some(e => e.what === 'started' && e.short), 'Short: it opens at its held end');
    await tap('.ucine'); await sleep(400);
    check(!await evaluate(`!!document.querySelector('.ucine')`), 'Short: a tap closes it');
    await evaluate(`localStorage.removeItem('delivery_cutscenes')`);

    // FAILSAFE: no WebGL (closed, the next plays); a play not held within the limit
    await evaluate(`window.__watch.seen.length = 0; window.__cine.log.length = 0; window.__realCtx = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...a) { return /webgl/.test(k) ? null : window.__realCtx.call(this, k, ...a); }`);
    await giveCar(spare[2]);
    await until(`window.__cine.log.some(e => e.what === 'nogl')`, 8000);
    await evaluate(`HTMLCanvasElement.prototype.getContext = window.__realCtx; window.__cine.limit = 600`);
    await giveCar(spare[3]);
    await until(`window.__cine.log.some(e => e.what === 'timeout')`, 10000);
    log = await logOf();
    check(log.some(e => e.carId === spare[2] && e.what === 'nogl') && log.some(e => e.carId === spare[3] && e.what === 'started') && log.some(e => e.carId === spare[3] && e.what === 'timeout') && !await evaluate(`!!document.querySelector('.ucine')`),
      'failsafe: no WebGL closed at once and the next one played; a play not held within the limit closed (' + log.map(e => e.carId + ':' + e.what).join() + ')');
    await evaluate(`window.__cine.limit = 0`);

    // BULK: Unlock everything plays none
    await evaluate(`window.__cine.log.length = 0; window.__watch.seen.length = 0`);
    await evaluate(`import('/src/delivery/progress.js').then(async ({ Progress }) => { const { CARS } = await import('/src/delivery/cars.js'); for (const c of CARS) if (!Progress.data.cars.includes(c.id)) Progress.data.cars.push(c.id); Progress.save(); window.dispatchEvent(new Event('progresschange')); return true; })`);
    await sleep(1800);
    log = await logOf();
    check(log.some(e => e.what === 'bulk') && !await evaluate(`window.__watch.seen.length`), 'Unlock everything (' + (log.find(e => e.what === 'bulk')?.carId || '?') + '): none plays');

    // LITE: ?cinelite asks for the fade-only version
    await seed({ money: 100, cars: ['commuter'], unlocked: 99, tierBase: 99 });
    await go('index.html?cineplay&cinelite', 3500);
    await giveCar(spare[0]);
    await until(`window.__cine.log.some(e => e.what === 'started')`, 8000);
    check((await logOf()).some(e => e.what === 'started' && e.lite), 'a low-end device (?cinelite): the fade-only version');
    await tap('.ucine'); await sleep(200); await tap('.ucine');

    // HEADLESS: without ?cineplay none plays
    await go('index.html', 3500);
    await evaluate(WATCH);
    await giveCar(spare[1]);
    await sleep(1800);
    log = await logOf();
    check(log.some(e => e.carId === spare[1] && e.what === 'headless') && !await evaluate(`window.__watch.seen.length`), 'headless, no ?cineplay: logged, none plays');
    }

    // ---- THE HELD END ALIVE (CHECKLIST 452): every cinematic held at its end keeps drawing, its particles fall and settle
    // (none above the floor 6 s in), and a skip holds with nothing in the air at once
    if (want('held')) {
      await go('index.html?cineplay', 2500);
      const PLAY = (o) => evaluate(`import('/src/delivery/render/unlockcine.js').then(m => { window.__h = m.playUnlock(${JSON.stringify(o)}); return !!window.__h; })`);
      const H = (e) => evaluate(`(() => { const h = window.__h; return ${e}; })()`);
      for (const [mode, carId, level] of [['car', 'hearse'], ['key', 'swancar'], ['key', 'horseshoe'], ['jim', 'hearse'], ['ecu', 'hearse', 2], ['ecumax', 'hearse']]) {
        await PLAY({ mode, carId, level });
        const total = await H('h.total');
        await until(`window.__h.held`, (total + 8) * 1000);
        await sleep(500);
        const early = await H('h.airborne()');
        await sleep(5500);
        const [left, held, done, drawing] = await H('[h.airborne(), h.held, h.done, h.drawing]');
        check(left === 0 && held && !done && drawing, `${mode} ${carId}: held and still drawing, nothing above the floor 6 s in (${early} in the air at 0.5 s, ${left} at 6 s)`);
        if (mode === 'jim') check(early > 0, 'jim: the confetti still falling 0.5 s into the held end (not frozen): ' + early);
        await H('h.close()');
        await PLAY({ mode, carId, level });
        await sleep(1200);
        await H('h.skip()');
        await sleep(250);
        const [sh, sa, sd] = await H('[h.held, h.airborne(), h.drawing]');
        check(sh && sa === 0 && sd, `${mode} ${carId}: skipped at 1.2 s, held at once with nothing in the air (${sa}), still drawing`);
        await H('h.close()');
      }
    }

    // ---- THE CAR'S OWN LAMPS (CHECKLIST 452): a car with an entry in render/carlights.js TABLE has its cutscene lamps there
    // (every lamp of the entry, mirrored, one affine map from the table's metres to the stage: one scale, no turn); a car with
    // none keeps the guess; a car the guess missed is found
    if (want('lamps')) {
      await go('index.html?cineplay', 2500);
      const R = await evaluate(`(async () => {
        const m = await import('/src/delivery/render/unlockcine.js'), Lm = await import('/src/delivery/render/carlights.js');
        const C = await import('/src/delivery/cars.js'), I = await import('/src/delivery/ideas.js');
        const every = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...C.EARNED_CARS, ...I.IDEA_CARS], all = every.filter(c => !c.off);
        const mirrored = (list = []) => list.flatMap(l => (l.mirror ? [l, { ...l, at: [-l.at[0], l.at[1], l.at[2]] }] : [l]));
        // one scale k and offset per axis: world = k * table + b (the same k on x, y and z)
        const fit = (tab, got) => {
          if (tab.length !== got.length || !tab.length) return { ok: false, why: tab.length + ' in the table, ' + got.length + ' drawn' };
          const ks = [];
          for (let a = 0; a < 3; a++) for (let i = 1; i < tab.length; i++) { const d = tab[i][a] - tab[0][a]; if (Math.abs(d) > 0.05) ks.push((got[i][a] - got[0][a]) / d); }
          const k = ks.length ? ks.reduce((x, y) => x + y) / ks.length : null;
          return { ok: k !== null && ks.every(v => Math.abs(v - k) < 0.02 * Math.abs(k)), k };
        };
        const sample = ['commuter', 'lowrider', 'hearse', 'sixteen', 'horseshoe'];
        const legend = every.find(c => c.legend && Lm.TABLE[Lm.lampKey(c)]), idea = I.IDEA_CARS.find(c => Lm.TABLE[Lm.lampKey(c)]);
        if (legend) sample.push(legend.id); if (idea) sample.push(idea.id);
        const none = all.find(c => !Lm.TABLE[Lm.lampKey(c)]);
        const rows = [];
        for (const id of sample) {
          const r = m.lampReport(id), def = Lm.TABLE[r.key];
          rows.push({ id, key: r.key, source: r.source, head: def ? fit(mirrored(def.head).map(l => l.at), r.head) : null, tail: def ? fit(mirrored(def.tail).map(l => l.at), r.tail) : null, guess: r.guessFound, lenses: r.lenses, legend: !!C.carById(id)?.legend, idea: !!C.carById(id)?.idea });
        }
        // a car whose lamps the guess misses (no headlamp found by look) that the table has
        let missed = null, scanned = 0;
        for (const c of all) {
          const def = Lm.TABLE[Lm.lampKey(c)];
          if (!def?.head?.length || !def?.tail?.length) continue;
          scanned++;
          const r = m.lampReport(c.id);
          if (r.guessFound.head === 0 && r.source.front === 'table') { missed = { id: c.id, guess: r.guessFound, heads: r.head.length, fit: fit(mirrored(def.head).map(l => l.at), r.head) }; break; }
          if (scanned > 120) break;
        }
        const plain = none ? m.lampReport(none.id) : null;
        return { rows, missed, scanned, plain: plain && { id: plain.id, source: plain.source, lenses: plain.lenses } };
      })()`, 300000);
      for (const r of R.rows) check(r.source.front === 'table' && r.source.rear === 'table' && r.head?.ok && r.tail?.ok && r.lenses > 0,
        `${r.id}${r.legend ? ' (Legendary)' : ''}${r.idea ? ' (idea)' : ''}: headlamps and tail lamps from its table entry '${r.key}' (scale ${r.head?.k?.toFixed(3)}; the guess alone found ${r.guess.head} head, ${r.guess.tail} tail)`);
      check(!!R.missed && R.missed.fit.ok, 'a car whose headlamps the guess missed: ' + (R.missed ? R.missed.id + ' (the guess: ' + JSON.stringify(R.missed.guess) + '; now ' + R.missed.heads + ' from its table)' : 'none in ' + R.scanned));
      check(!R.plain || (R.plain.source.front === 'guess' && R.plain.lenses === 0), 'a car with no table entry keeps the guess: ' + R.plain?.id);
      if (R.missed) console.log('  (missed by the guess: ' + R.missed.id + ')');
      if (SHOTS && R.missed) {
        await go(`index.html?unlockcine=car:${R.missed.id}&still=1.8`, 6000);
        await shot('lamps-' + R.missed.id + '-detail');
        await go(`index.html?unlockcine=car:${R.missed.id}&still=4.9`, 6000);
        await shot('lamps-' + R.missed.id + '-hero');
      }
    }

    // ---- FIREWORKS in the key unlock's last shot (CHECKLIST 453): the blade key's and the fob's; none before the last shot, none in
    // the lite version, none left (and nothing above the floor) 6 s into the held end; a skip holds with none
    if (want('fireworks')) {
      await go('index.html?cineplay', 2500);
      // (the time is the PAGE's, read in the same evaluation as the count, from just before playUnlock: never behind the cutscene's
      // own clock, which starts at its first frame. The check's wall clock was: a slow round trip let a sample taken at the last
      // shot count as 'before', the flaky "a rocket before the last shot")
      const PLAY = (o) => evaluate(`import('/src/delivery/render/unlockcine.js').then(m => { window.__t0 = performance.now(); window.__h = m.playUnlock(${JSON.stringify(o)}); window.__fwAt = m.FW.shells[0]; return !!window.__h; })`);
      const H = (e) => evaluate(`(() => { const h = window.__h; return ${e}; })()`);
      for (const carId of ['swancar', 'horseshoe']) {
        await PLAY({ mode: 'key', carId });
        const first = await evaluate('window.__fwAt');
        let before = 0, most = 0;
        for (;;) { const [n, t] = await H('[h.fireworks(), (performance.now() - window.__t0) / 1000]'); if (t < first - 0.1) before = Math.max(before, n); else most = Math.max(most, n); if (await H('h.held')) break; await sleep(150); }
        await sleep(6000);
        const [left, air] = await H('[h.fireworks(), h.airborne()]');
        check(before === 0 && most > 40 && left === 0 && air === 0, `key ${carId}${carId === 'horseshoe' ? ' (fob)' : ' (blade)'}: fireworks only in the last shot (${before} before it, up to ${most} dots), none left and nothing above the floor 6 s into the held end`);
        await H('h.close()');
        await PLAY({ mode: 'key', carId });
        await sleep(1000); await H('h.skip()'); await sleep(250);
        check(await H('h.held && h.fireworks() === 0 && h.airborne() === 0'), `key ${carId}: skipped, held with no fireworks in the air`);
        await H('h.close()');
        await PLAY({ mode: 'key', carId, lite: true });
        let lite = 0;
        for (let i = 0; i < 12; i++) { lite = Math.max(lite, await H('h.fireworks()')); await sleep(150); }
        check(lite === 0, `key ${carId}, the lite version: no fireworks (${lite})`);
        await H('h.close()');
      }
      if (SHOTS) for (const [carId, kind] of [['swancar', 'blade'], ['horseshoe', 'fob']]) for (const [name, t] of [['burst', 8.75], ['held', 10.6]]) {
        await go(`index.html?unlockcine=key:${carId}&still=${t}`, 6000);
        await shot(`fireworks-${kind}-${carId}-${name}`);
      }
    }

    // ---- the stills (CHECKLIST 452): Jim's lot key caught, the sale's held end 0.5 s and 3 s in
    if (want('stills') && SHOTS) {
      for (const [name, t] of [['jim-key', 4.32], ['jim-held-0.5s', 7.0], ['jim-held-3s', 9.5]]) {
        await go(`index.html?unlockcine=jim:hearse&still=${t}`, 6000);
        await shot(name);
      }
    }
  } catch (error) {
    check(false, 'the browser part: ' + (error?.stack || error));
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
