// A check of THE EVENTS TAB'S MODES (CHECKLIST 460, EVENTS-UI.md; render/eventmodes.js, render/menustage.js, events-ui.css):
//   SOURCE      events-ui.css loaded after menu2.css; render-only (the replay fingerprint main's: no logic file touched)
//   PHONE       in headless Chromium over DevTools (skipped with a note if no browser is found), 390x844, touch, on a real save
//               (the Comet Hunt two stages in): the mode strip over the Events tab, a tab per event (Xmas, Hunt, Strike, Comet),
//               exactly one filled and aria-selected; ONE event on the screen at a time (its title in the stage, no other's); the
//               level strip gone; the menu not a page that scrolls and the card within about a screen (what does not fit scrolls
//               inside it by 60 px at most); a tap on a tab shows that event; a swipe across the stage the next / the last;
//               the tab REMEMBERED (localStorage, never the save) by ?tab=events and by the Events tab's button from another tab;
//               the dot on a tab with something to play, none on one with nothing (the Comet Hunt all done); Details folds the
//               card's figures (aria-expanded); the Comet Hunt's stepper (2 done, stage 3 ready, the rest locked) picks a stage
//   WIDE        1100x650 (no touch): the strip there too, the level strip kept beside it (the side-by-side layout), the Comet
//               Hunt's figures shown with no Details button, the menu fitting the window, START on it
//   node scripts/.events-ui-check.mjs [--browser=<path>] [--shots=<dir>]
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fingerprints } from './logic-hash.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const SHOTS = opt('shots', null);
let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const MAIN_PRINT = { logic: 'c0c2c73e68', legacy: '8c50a659a9' }; // (since CHECKLIST 494, the ram cap, throw spread, tank shell and rickety floor: was 8dbc477d85 / bcc9df44d0; since CHECKLIST 476, a dead end's blocker solid from the side: was 057a22806d / 661de07fbe; since CHECKLIST 470, no pickup in the air: was 33a0394c26 / dd565f56b3, main v1.1.152-alpha, 954c288)
const NOW = '&eventsnow=2026-10-17'; // (all four events on: Christmas Eve, the Car Hunt, the Concept Strike, the Comet Hunt)

// ---- the source
const src = (p) => readFileSync(join(ROOT, 'src/delivery', p), 'utf8');
const stageJs = src('render/menustage.js'), modesJs = src('render/eventmodes.js');
check(stageJs.indexOf("import '../menu2.css'") >= 0 && stageJs.indexOf("from './eventmodes.js'") > stageJs.indexOf("import '../menu2.css'") && /import '\.\.\/events-ui\.css'/.test(modesJs),
  'events-ui.css is loaded after menu2.css (render/eventmodes.js, imported after it)');
check(/localStorage/.test(modesJs) && !/Progress/.test(modesJs), 'the mode is remembered in localStorage, not the save');
const print = fingerprints();
check(print.logic === MAIN_PRINT.logic && print.legacy === MAIN_PRINT.legacy, `the replay fingerprint is main's (${print.logic} / ${print.legacy})`);

const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-eventsui-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5271, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
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
    const phone = async () => {
      await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 });
      await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    };
    const wide = async () => {
      await page('Emulation.setDeviceMetricsOverride', { width: 1100, height: 650, deviceScaleFactor: 1, mobile: false });
      await page('Emulation.setTouchEmulationEnabled', { enabled: false });
    };
    const shot = async (name) => {
      if (!SHOTS) return;
      mkdirSync(SHOTS, { recursive: true });
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
    };
    const base = `http://localhost:${port}/delivery/`;
    const settle = () => evaluate(`document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    const go = async (address, ms = 3500) => { await page('Page.navigate', { url: base + address }); await sleep(ms); await settle(); };
    // a save written as a player's (everything cleared, then the fields given); the remembered mode cleared unless kept
    const seed = async (fields, keepMode = false) => {
      await go('index.html', 2500);
      await evaluate(`(async () => { const { Progress } = await import('/src/delivery/progress.js'); Progress.reset(); Object.assign(Progress.data, ${JSON.stringify(fields)}); Progress.save();
        ${keepMode ? '' : "try { localStorage.removeItem('delivery_events_mode'); } catch {}"} return true; })()`);
    };
    // what the Events tab shows: the tabs, the one on, the stage's title(s), the strip, the fit
    const LOOK = `(() => {
      const ss = document.getElementById('startScreen'), stage = document.getElementById('stage'), strip = document.getElementById('levels');
      const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
      const modes = [...document.querySelectorAll('#levelGroups .ev-mode')];
      const titles = [...stage.querySelectorAll('h2')].filter(shown).map(h => h.textContent.trim());
      const text = stage.innerText;
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { t: b.top, b: b.bottom, h: b.height, w: b.width }; };
      return { ids: modes.map(b => b.dataset.mode), on: modes.filter(b => b.classList.contains('on')).map(b => b.dataset.mode), selected: modes.filter(b => b.getAttribute('aria-selected') === 'true').map(b => b.dataset.mode),
        words: modes.map(b => b.querySelector('.ev-word').textContent), icons: modes.every(b => b.querySelector('.ev-icon svg')), dots: Object.fromEntries(modes.map(b => [b.dataset.mode, shown(b.querySelector('.ev-dot'))])),
        modeH: Math.min(...modes.map(b => b.getBoundingClientRect().height)), titles, text, evTab: ss.classList.contains('ev-tab'), series: !!stage.querySelector('.ev-series'),
        strip: shown(strip), ssScroll: ss.scrollHeight - ss.clientHeight, stageOver: Math.max(stage.scrollHeight - stage.clientHeight, (stage.querySelector('.event-panel')?.scrollHeight || 0) - (stage.querySelector('.event-panel')?.clientHeight || 0)),
        ih: innerHeight, ss: r(ss), start: r(document.getElementById('startBtn')), more: shown(stage.querySelector('.ev-more-btn')), moreOpen: stage.querySelector('.ev-more-btn')?.getAttribute('aria-expanded'),
        facts: shown(stage.querySelector('.facts')), stored: (() => { try { return localStorage.getItem('delivery_events_mode'); } catch { return 'ERR'; } })()  };
    })()`;
    const look = () => evaluate(LOOK);
    const tap = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`);
    const swipe = (dx) => evaluate(`(() => { const s = document.getElementById('stage'), b = s.getBoundingClientRect(), y = b.top + 60, x = b.left + b.width / 2;
      s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerType: 'touch' })); s.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x + ${dx}, clientY: y + 4, pointerType: 'touch' })); return true; })()`);
    const NAMES = { christmas: /Christmas Eve/i, 'car-hunt': /Car Hunt/i, 'concept-strike': /Concept Strike/i, 'comet-hunt': /Comet Hunt/i };
    const onlyOne = (m, id) => NAMES[id].test(m.titles.join(' ')) && Object.entries(NAMES).filter(([k]) => k !== id).every(([, re]) => !re.test(m.titles.join(' ')));

    // ---- PHONE
    await phone();
    await seed({ money: 1200, cars: ['commuter', 'lovebus'], unlocked: 12, events: { 'comet-hunt': 2 } });
    await go('index.html?tab=events' + NOW);
    let m = await look();
    check(m.evTab && m.ids.join() === 'christmas,car-hunt,concept-strike,comet-hunt' && m.icons && m.words.every(w => w.length <= 9 && !/\s/.test(w)),
      `phone: the mode strip, a tab per event with an icon and one word (${m.ids.join(', ')}: ${m.words.join(', ')})`);
    check(m.on.length === 1 && m.selected.join() === m.on.join() && m.modeH >= 44, `phone: one tab filled and aria-selected (${m.on}), the tabs ${m.modeH} px tall`);
    await shot('phone-' + m.on[0]);
    for (const id of ['car-hunt', 'concept-strike', 'comet-hunt', 'christmas']) {
      await tap(`.ev-mode[data-mode="${id}"]`);
      await sleep(900); await settle();
      m = await look();
      check(m.on.join() === id && m.selected.join() === id, `phone ${id}: its tab on after a tap`);
      check(onlyOne(m, id), `phone ${id}: that event alone on the screen (${m.titles.join(' | ')})`);
      check(!m.strip && m.ssScroll <= 1 && m.stageOver <= 60, `phone ${id}: no level strip, the menu not scrolling (${m.ssScroll}), the card within the screen (${m.stageOver} px more inside it)`);
      check(m.start && m.start.b <= m.ih && m.ss.b <= m.ih + 0.5, `phone ${id}: START on the screen (its foot at ${m.start?.b.toFixed(0)} of ${m.ih})`);
      check(m.stored === id, `phone ${id}: remembered as the mode (localStorage ${m.stored})`);
      await shot('phone-' + id);
    }
    // (the dots: the Comet Hunt's stage 3 open to play)
    check(m.dots['comet-hunt'] === true, 'phone: the Comet Hunt\'s tab has its dot (stage 3 to play)');
    // (Details: the Car Hunt's figures folded, then shown)
    await tap('.ev-mode[data-mode="car-hunt"]'); await sleep(900); await settle();
    m = await look();
    check(m.more && m.moreOpen === 'false' && !m.facts, 'phone car-hunt: a Details button, the figures folded');
    await tap('#stage .ev-more-btn'); await sleep(300);
    m = await look();
    check(m.moreOpen === 'true' && m.facts, 'phone car-hunt: Details opens the figures (aria-expanded true)');
    await shot('phone-car-hunt-details');
    await tap('#stage .ev-more-btn'); await sleep(200);
    // (a swipe: left the next, right the last)
    await swipe(-150); await sleep(900); await settle();
    m = await look();
    check(m.on.join() === 'concept-strike' && onlyOne(m, 'concept-strike'), `phone: a swipe left goes to the next event (${m.on})`);
    await swipe(150); await sleep(900); await settle();
    m = await look();
    check(m.on.join() === 'car-hunt', `phone: a swipe right goes back (${m.on})`);
    // (remembered: ?tab=events, and the Events tab's button from the Races tab)
    await tap('.ev-mode[data-mode="concept-strike"]'); await sleep(600);
    await go('index.html?tab=events' + NOW);
    m = await look();
    check(m.on.join() === 'concept-strike' && onlyOne(m, 'concept-strike'), `phone: ?tab=events opens on the tab last picked (${m.on})`);
    await go('index.html?tab=races' + NOW);
    await tap('#tabEvents'); await sleep(900); await settle();
    m = await look();
    check(m.on.join() === 'concept-strike', `phone: the Events tab's button opens on the tab last picked (${m.on})`);
    // (the Comet Hunt: its stepper, a tap on a step picks the stage)
    await tap('.ev-mode[data-mode="comet-hunt"]'); await sleep(900); await settle();
    const steps = await evaluate(`[...document.querySelectorAll('#stage .ev-step')].map(b => b.className.replace('ev-step ', ''))`);
    check(steps.length === 8 && steps[0].startsWith('done') && steps[1].startsWith('done') && steps[2].startsWith('ready') && steps.slice(3).every(s => s.startsWith('locked')) && steps[2].includes('picked'),
      `phone comet-hunt: the stepper, 2 done, stage 3 ready and picked, the rest locked (${steps.join(', ')})`);
    check(await evaluate(`!!document.querySelector('#stage .ev-prize .event-car') && !!document.querySelector('#stage .ev-steps .ev-goal') && document.querySelectorAll('#stage .ev-status').length === 1`),
      'phone comet-hunt: one status line, the grand prize card with its car, the prize at the stepper\'s end');
    await shot('phone-comet-hunt');
    await tap('#stage .ev-steps li:nth-child(4) .ev-step'); await sleep(900); await settle();
    check(await evaluate(`/Stage 4/.test(document.querySelector('#stage .event-stage.picked')?.textContent || '') && document.querySelector('#stage .ev-steps li:nth-child(4) .ev-step').classList.contains('picked')`),
      'phone comet-hunt: a tap on step 4 picks stage 4 (its card ringed)');
    // (no dot on a tab with nothing to play: the Comet Hunt all done)
    await seed({ money: 1200, cars: ['commuter'], unlocked: 12, events: { 'comet-hunt': 8 } });
    await go('index.html?tab=events' + NOW);
    m = await look();
    check(m.dots['comet-hunt'] === false, 'phone: no dot on the Comet Hunt\'s tab once every stage is done');

    // ---- WIDE
    await wide();
    await seed({ money: 1200, cars: ['commuter', 'lovebus'], unlocked: 12, events: { 'comet-hunt': 2 } });
    await go('index.html?event=car-hunt' + NOW);
    m = await look();
    check(m.evTab && m.on.join() === 'car-hunt' && m.strip && m.ssScroll <= 1 && m.ss.h <= m.ih + 0.5 && m.start.b <= m.ih, `1100x650 car-hunt: the mode strip, the level strip beside the card (side by side), the menu fitting the window`);
    check(!m.more && m.facts, '1100x650 car-hunt: no Details button, the figures shown');
    await shot('wide-car-hunt');
    await tap('.ev-mode[data-mode="comet-hunt"]'); await sleep(900); await settle();
    m = await look();
    check(m.on.join() === 'comet-hunt' && m.series && !m.more && m.facts && m.ss.h <= m.ih + 0.5 && m.start.b <= m.ih, '1100x650 comet-hunt: its screen, the figures shown with no Details button, the menu fitting');
    await shot('wide-comet-hunt');
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
