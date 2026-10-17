// A check of THE MENU ON A PHONE: the start screen (#startScreen) fits the screen it is on, its foot (START, the level strip)
// on the screen, and the build tag (version.js: "v1.1.n · commit", the owner, 13-Oct: "the version number has never been
// visible") on the screen and not covered, held upright and on its side, with and without the browser's address bar.
// (Found by the event cards' work, CHECKLIST 222: #startScreen was content-box, its height 100dvh PLUS its padding, so on a
// phone it was 34 px taller than the screen upright and 12 px on its side, and the tag sat under START or past the screen.)
// In headless Chromium over DevTools (skipped with a note if no browser is found), a phone emulated (mobile, touch, DPR 3):
//   sizes 360x740, 390x844, 412x915 upright; 844x390, 740x360, 667x375 on their side;
//   the menu's Career, Races and Events tabs, the Car Hunt and the Concept Strike's event cards;
//   the address bar: (a) the screen made 56 px shorter while the page is up (as Chrome's bar coming in resizes it: 100dvh),
//   (b) window.innerHeight reported 56 px under the screen's height (the bar over a page laid out at 100vh) and a resize sent.
// For each: the start screen no taller than innerHeight and not past its foot; START, the level strip, the tabs, the bank and
// the car's card (the showroom / garage's way in) inside the screen and on top (elementFromPoint at the centre); the build tag
// inside the screen, on top, its text the version, 10 px or more; with the menu scrolled to its end as well (a card that scrolls).
// The EVENTS TAB held upright (CHECKLIST 446, events-ui.css): one event at a time under its mode strip (render/eventmodes.js), the
// level strip not drawn (the strip's job is the mode strip's), the event cards fitted to the screen: there the mode strip is
// checked on the screen and on top in the strip's place, and an event card is a card that FITS (the menu not scrolling).
//   node scripts/.phone-menu-check.mjs [--browser=<path>] [--report] [--shots=<dir>] [--prefix=<name>] [--only=<size,...>]
// --report prints the measurements; --shots saves a PNG of each state (<prefix>-<state>-<size>.png).
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const REPORT = !!opt('report', false), SHOTS = opt('shots', null), PREFIX = opt('prefix', 'shot'), ONLY = opt('only', null);
let failed = 0;
const check = (ok, what) => { if (!ok || !REPORT) console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SIZES = [[360, 740], [390, 844], [412, 915], [844, 390], [740, 360], [667, 375]].filter(([w, h]) => !ONLY || String(ONLY).split(',').includes(w + 'x' + h));
const STATES = [
  ['career', 'index.html'],
  ['races', 'index.html?tab=races'],
  ['events', 'index.html?tab=events'],
  ['carhunt', 'index.html?event=car-hunt'],
  ['strike', 'index.html?event=concept-strike&eventsnow=2026-10-19'],
];
const BAR = 56; // (about the height of Chrome's address bar on a phone)

// what is measured in the page: the screen, the menu's box, its foot and the tag; `end` scrolls the menu to its end first
const MEASURE = (end) => `(() => {
  const ss = document.getElementById('startScreen');
  if (${end}) ss.scrollTop = ss.scrollHeight;
  const ih = window.innerHeight, iw = window.innerWidth;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
  const onTop = (el, force) => {
    if (!el) return false;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
    const pe = el.style.pointerEvents; if (force) el.style.pointerEvents = 'auto';
    const x = Math.min(iw - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(ih - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    if (force) el.style.pointerEvents = pe;
    return !!hit && (hit === el || el.contains(hit));
  };
  const inside = (b) => !!b && b.w > 0 && b.h > 0 && b.x >= -0.5 && b.y >= -0.5 && b.r <= iw + 0.5 && b.b <= ih + 0.5;
  const tag = document.getElementById('buildTag'), st = getComputedStyle(tag);
  const els = { start: document.getElementById('startBtn'), strip: document.getElementById('levels'), tabs: document.getElementById('tabs'),
    bank: document.getElementById('bank'), car: document.getElementById('shop'), tag, modes: document.querySelector('#levelGroups .ev-modes') };
  const out = { ih, iw, vv: window.visualViewport ? Math.round(visualViewport.height) : null, card: ss.classList.contains('cx-card'),
    ss: box(ss), sizing: getComputedStyle(ss).boxSizing, scrollH: ss.scrollHeight, clientH: ss.clientHeight, scrollTop: ss.scrollTop,
    menuH: getComputedStyle(document.documentElement).getPropertyValue('--menu-h').trim(),
    evTab: ss.classList.contains('ev-tab'), stripGone: getComputedStyle(document.getElementById('levels')).display === 'none',
    tagText: tag.textContent.trim(), tagFont: parseFloat(st.fontSize), tagOpacity: parseFloat(st.opacity), tagColor: st.color, tagDisplay: st.display };
  // (the event card's taps, CHECKLIST 222: Free try, What's inside, What's on this road, the level arrows: 44 px or more)
  out.taps = [...ss.querySelectorAll('.cx-try, .event-inside, .menu-stage .road .menu-chip, .menu-stage .arrow, .ev-more-btn, .ev-mode')].filter(e => e.offsetParent)
    .map(e => { const r = e.getBoundingClientRect(); return { c: String(e.className).split(' ')[0], w: Math.round(r.width), h: Math.round(r.height) }; });
  for (const [k, el] of Object.entries(els)) { const b = box(el); out[k] = b; out[k + 'In'] = inside(b); out[k + 'Top'] = onTop(el, k === 'tag'); }
  return out;
})()`;

const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);

// ---- the source: the fit is the stylesheet's and one small helper's (render/menu.js sets --menu-h)
const css = readFileSync(join(ROOT, 'src/delivery/menu2.css'), 'utf8'), menuJs = readFileSync(join(ROOT, 'src/delivery/render/menu.js'), 'utf8');
check(/@media \(max-width: 760px\) and \(min-height: 521px\), \(max-width: 519px\) \{\s*\/\*[^]*?#startScreen \{[^}]*box-sizing: border-box;[^}]*height: var\(--menu-h, 100dvh\)/.test(css), 'menu2.css: upright, the start screen border-box and var(--menu-h, 100dvh) tall');
check(/@media \(max-height: 520px\) and \(min-width: 520px\) \{\s*(?:\/\*[^]*?\*\/\s*)?#startScreen \{[^}]*box-sizing: border-box;[^}]*height: var\(--menu-h, 100dvh\)/.test(css), 'menu2.css: on its side, the start screen border-box and var(--menu-h, 100dvh) tall');
check(/--menu-h/.test(menuJs) && /innerHeight/.test(menuJs) && /orientationchange/.test(menuJs) && /visualViewport/.test(menuJs), 'render/menu.js: --menu-h set from innerHeight on resize, orientationchange and the visual viewport\'s resize');

if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-phonemenu-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  const report = [];
  try {
    server = await createServer({ root: ROOT, server: { port: 5241, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
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
    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const metrics = (w, h) => page('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: true, screenWidth: w, screenHeight: h });
    const shot = async (name) => {
      if (!SHOTS) return;
      mkdirSync(SHOTS, { recursive: true });
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, `${PREFIX}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const look = (m, what, full) => {
      report.push({ what, ...m });
      if (REPORT) console.log(`${what.padEnd(34)} ih ${m.ih} ss ${m.ss.h.toFixed(0)}${m.ss.b > m.ih + 0.5 ? ' (+' + (m.ss.b - m.ih).toFixed(0) + ')' : ''} ${m.sizing}`
        + ` scroll ${m.scrollH}/${m.clientH}@${m.scrollTop} | START b ${m.start.b.toFixed(0)} ${m.startIn && m.startTop ? 'seen' : 'HIDDEN'} | strip b ${m.strip.b.toFixed(0)} ${m.stripIn && m.stripTop ? 'seen' : 'HIDDEN'}`
        + ` | tag ${m.tag ? `${m.tag.x.toFixed(0)},${m.tag.y.toFixed(0)} ${m.tag.w.toFixed(0)}x${m.tag.h.toFixed(0)}` : '-'} ${m.tagIn && m.tagTop ? 'SEEN' : 'hidden'} ${m.tagFont}px o${m.tagOpacity}`);
      check(m.ss.h <= m.ih + 0.5 && m.ss.b <= m.ih + 0.5, `${what}: the menu ${m.ss.h.toFixed(0)} tall, the screen ${m.ih} (foot at ${m.ss.b.toFixed(0)})`);
      check(m.startIn && m.startTop, `${what}: START on the screen and on top (its foot at ${m.start.b.toFixed(0)} of ${m.ih})`);
      check(m.tagIn && m.tagTop && /^v\d+\.\d+\.\d+/.test(m.tagText) && m.tagFont >= 10, `${what}: the build tag "${m.tagText}" on the screen and on top (${m.tag ? `${m.tag.x.toFixed(0)},${m.tag.y.toFixed(0)} ${m.tag.w.toFixed(0)}x${m.tag.h.toFixed(0)}` : 'none'}, ${m.tagFont} px)`);
      if (full && m.evTab && m.stripGone) check(m.modesIn && m.modesTop, `${what}: the Events tab's mode strip on the screen and on top, in the level strip's place (${m.modes ? m.modes.y.toFixed(0) + '..' + m.modes.b.toFixed(0) : 'none'})`);
      else if (full) check(m.stripIn && m.stripTop, `${what}: the level strip on the screen and on top (its foot at ${m.strip.b.toFixed(0)})`);
      if (m.scrollTop === 0) check(m.tabsIn && m.bankIn && m.carIn && m.carTop, `${what}: the tabs, the bank and the car's card (the showroom's way in) on the screen`);
    };
    // the desktop and the tablet (no phone media query): as they were. With --report, every box in the menu is written
    // (<prefix>-desktop-rects.json in --shots) to compare before / after a change
    const rects = {};
    for (const [w, h] of [[1280, 800], [1000, 620], [820, 1180]]) {
      for (const [state, address] of [STATES[0], STATES[4]]) {
        await page('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
        await page('Emulation.setTouchEmulationEnabled', { enabled: false });
        await page('Page.navigate', { url: `http://localhost:${port}/delivery/${address}` });
        await sleep(3500);
        await evaluate(`document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
        const m = await evaluate(MEASURE(false));
        rects[`${state} ${w}x${h}`] = await evaluate(`[...document.querySelectorAll('#startScreen, #startScreen *')].filter(e => !e.closest('.menu-sheet')).map(e => { const r = e.getBoundingClientRect();
          return (e.id || e.className?.baseVal || e.className || e.tagName) + ' ' + [r.left, r.top, r.width, r.height].map(v => Math.round(v * 10) / 10).join(','); })`);
        if (REPORT) console.log(`desktop ${state} ${w}x${h}: ih ${m.ih} ss ${m.ss.h} | START b ${m.start.b.toFixed(0)} | tag ${m.tag.x.toFixed(0)},${m.tag.y.toFixed(0)} ${m.tag.w.toFixed(0)}x${m.tag.h.toFixed(0)} ${m.tagIn ? 'in' : 'OUT'}`);
        check(m.ss.h <= m.ih + 0.5 && m.startIn && m.tagIn && m.tag.b <= m.ih - 3.5 && m.ih - m.tag.b <= 4.5 && m.iw - m.tag.r <= 8.5, `desktop ${state} ${w}x${h}: the menu fits, START on the screen, the build tag in the corner as before (8 px right, 4 px bottom)`);
        await shot(`desktop-${state}-${w}x${h}`);
      }
    }
    if (REPORT && SHOTS) writeFileSync(join(SHOTS, `${PREFIX}-desktop-rects.json`), JSON.stringify(rects, null, 1));
    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    for (const [w, h] of SIZES) {
      const size = `${w}x${h}`;
      for (const [state, address] of STATES) {
        await metrics(w, h);
        await page('Page.navigate', { url: `http://localhost:${port}/delivery/${address}` });
        await sleep(3500);
        await evaluate(`document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
        const top = await evaluate(MEASURE(false));
        // (an event card held upright: since CHECKLIST 446 one event at a time on the Events tab, the card fitted to the screen and
        // the menu not scrolling (it was a page that scrolled, its foot sticky); its taps 44 px, the mode strip's too)
        const card = top.card && h > w;
        if (card) check(top.taps.length >= 3 && top.taps.every(t => t.h >= 44 && t.w >= 44) && top.scrollH <= top.clientH + 1, `${state} ${size}: the event card fits the screen (the menu ${top.scrollH} in ${top.clientH}), its taps 44 px (${top.taps.map(t => t.c + ' ' + t.w + 'x' + t.h).join(', ')})`);
        look(top, `${state} ${size}`, true);
        await shot(`${state}-${size}`);
        if (top.scrollH > top.clientH + 1) {
          const end = await evaluate(MEASURE(true));
          look(end, `${state} ${size} scrolled`, true);
          await shot(`${state}-${size}-end`);
          await evaluate(`document.getElementById('startScreen').scrollTop = 0`);
        }
        if (state === 'career' || state === 'strike') {
          // (a) the address bar comes in: the screen 56 px shorter
          await metrics(w, h - BAR);
          // (the resize event comes on a later frame: a loaded machine draws the menu's 3D cargo slowly, so wait for it, 8 s at most;
          // a --menu-h never brought to the new innerHeight shows as the menu too tall, below)
          await evaluate(`new Promise(done => { const t0 = performance.now(); const tick = () => (getComputedStyle(document.documentElement).getPropertyValue('--menu-h').trim() === innerHeight + 'px'
            || performance.now() - t0 > 8000) ? requestAnimationFrame(() => done()) : setTimeout(tick, 50); tick(); })`);
          const a = await evaluate(MEASURE(false));
          look(a, `${state} ${size} bar (resized)`, true);
          await shot(`${state}-${size}-bar-resized`);
          await metrics(w, h);
          await sleep(400);
          // (b) innerHeight under the layout's height (100vh), as a browser with the bar over the page reports it
          await evaluate(`(() => { const real = window.innerHeight; Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => real - ${BAR} });
            window.dispatchEvent(new Event('resize')); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
          const b = await evaluate(MEASURE(false));
          look(b, `${state} ${size} bar (innerHeight)`, true);
          await shot(`${state}-${size}-bar-inner`);
        }
      }
    }
    if (REPORT && SHOTS) writeFileSync(join(SHOTS, `${PREFIX}-measurements.json`), JSON.stringify(report, null, 1));
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
