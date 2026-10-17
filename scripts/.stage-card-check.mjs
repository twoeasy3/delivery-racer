// A check of THE END-OF-STAGE CARD (#resultScreen; render/stagecard.js draws it, stagecard.css; STAGE-CARD.md): the card after a
// run, won and lost, on a phone held upright (390x844) and on its side (844x390) and on a desktop (1100x650), Good and Evil.
// In headless Chromium over DevTools (skipped with a note if no browser is found), the game's own modules driven in the page
// (Game.start, then Game.finish with an outcome, as main.js's ?event=..&deliver does; the kerb's scene skipped):
//   - the card fits the screen (nothing past its edges, the card not scrolling), its buttons 44 px tall on a phone;
//   - no 'Look around' and no 'Next level' anywhere in the page (#lookBtn, #nextBtn gone too);
//   - exactly one PRIMARY button shown: Continue (to the menu) on a delivery, Retry on a fail; and it works:
//     Retry starts the run again (Game.state 'playing', the card hidden), Continue / Menu goes to the menu (state 'start');
//     Enter presses the primary;
//   - the headline says the outcome, the stat tiles are up (and the Earned tile's figure is the run's), the side on the card
//     (Evil: the card's .evil); the rewards game.js writes (a stage, a prize, packs) as reward cards;
//   - a playback's card (Watch replay): no Retry, one primary (Menu).
//   node scripts/.stage-card-check.mjs [--browser=<path>] [--shots=<dir>] [--prefix=<name>] [--only=win,fail,...]
// --shots saves a PNG of each state (<prefix>-<state>-<size>.png).
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const SHOTS = opt('shots', null), PREFIX = opt('prefix', 'card'), ONLY = opt('only', null);
let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// [name, outcome, evil, level id, extra]
const STATES = [
  ['win', 'delivered', false, 'expressway', { fresh: true }],
  ['fail', 'timeout', false, 'expressway', {}],
  ['evil-win', 'delivered', true, 'back-roads', {}],
  ['busted', 'busted', true, 'expressway', {}],
  ['late', 'late', false, 'expressway', {}],
  // (rewards: game.js's own words for them written onto the line, as a Comet Hunt stage with a prize and its packs would; the card drawn again)
  ['rewards', 'delivered', false, 'expressway', { inject: "  |  Stage 5 of 5 done  |  You won the Comet!  |  2 packs: Comet Pack, Career Pack! Opening..." }],
].filter(s => !ONLY || String(ONLY).split(',').includes(s[0]));
const SIZES = [[390, 844, true], [844, 390, true], [1100, 650, false]];

// the source: the old buttons gone from the page and the code
const html = readFileSync(join(ROOT, 'delivery/index.html'), 'utf8');
check(!/lookBtn|nextBtn|Look around|Next level/i.test(html), 'delivery/index.html: no #lookBtn / #nextBtn, no "Look around" / "Next level"');
const orbit = readFileSync(join(ROOT, 'src/delivery/render/orbit.js'), 'utf8');
check(!/lookBtn|after-run/.test(orbit), 'render/orbit.js: no "Look around" button, no after-run orbit (replays only)');

const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);

// in the page: a save, the level, the side; the run started and finished; the kerb skipped; resolves once the card is up
const RUN = (outcome, evil, levelId, fresh, inject = '') => `(async () => {
  const { Game } = await import('/src/delivery/game.js');
  const L = await import('/src/delivery/levels.js');
  const { Progress } = await import('/src/delivery/progress.js');
  const { Delivery } = await import('/src/delivery/delivery.js');
  if (${fresh}) { Progress.reset(); Object.assign(Progress.data, { money: 120 }); Progress.save(); }
  else Object.assign(Progress.data, { money: 1234 });
  if ('${levelId}'.startsWith('hidden:')) L.selectSpecial(L.HIDDEN_LEVELS['${levelId}'.slice(7)]); // (a hidden level, as ?hidden= plays it)
  else L.selectLevel(L.LEVELS.findIndex(l => l.id === '${levelId}'));
  Game.evil = ${evil};
  Game.start();
  await new Promise(r => setTimeout(r, 600));
  Object.assign(Game, { cash: 20, fines: 0, time: Game.allowed - (${outcome === 'late' ? -3.2 : outcome === 'delivered' ? 18.4 : 0}) });
  const earned = '$' + Math.floor(Math.max(0, Game.tip + Game.cash - Game.fines));
  Game.finish('${outcome}');
  const t0 = performance.now();
  while ((document.getElementById('resultScreen').classList.contains('hidden') || document.body.classList.contains('delivering')) && performance.now() - t0 < 40000) {
    if (Delivery.active) Delivery.skip();
    await new Promise(r => setTimeout(r, 100));
  }
  if (${JSON.stringify(inject)}) { const c = document.getElementById('resultScreen'); document.getElementById('resultNote').textContent += ${JSON.stringify(inject)};
    c.classList.add('hidden'); await new Promise(r => setTimeout(r, 30)); c.classList.remove('hidden'); }
  await new Promise(r => setTimeout(r, 450)); // (the tiles' entrance; a pack opens over the card 700 ms after it is up)
  return { up: !document.getElementById('resultScreen').classList.contains('hidden'), state: Game.state, earned, why: [Delivery.active, Delivery.t, Delivery.delivered, document.body.className, document.getElementById('resultScreen').className].join(' / ') };
})()`;

// what is measured on the card
const MEASURE = `(() => {
  const card = document.getElementById('resultScreen'), iw = innerWidth, ih = innerHeight;
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const inside = (b) => b.w > 0 && b.h > 0 && b.x >= -0.5 && b.y >= -0.5 && b.r <= iw + 0.5 && b.b <= ih + 0.5;
  const parts = [...card.querySelectorAll('button, .sc-tile, .sc-head, .sc-reward')].filter(shown);
  const buttons = [...card.querySelectorAll('button')].filter(shown);
  const primary = buttons.filter(b => b.classList.contains('primary'));
  const text = document.body.innerText + ' ' + document.body.textContent;
  return { iw, ih, cardUp: shown(card), scroll: [card.scrollHeight, card.clientHeight], panel: card.querySelector('.sc-panel') ? box(card.querySelector('.sc-panel')) : null,
    out: parts.filter(p => !inside(box(p))).map(p => (p.id || p.className) + ' ' + JSON.stringify(box(p))),
    buttons: buttons.map(b => ({ id: b.id, text: b.textContent.trim(), primary: b.classList.contains('primary'), h: Math.round(box(b).h) })),
    primary: primary.map(b => b.id), headline: card.querySelector('.sc-headline')?.textContent.trim() || '',
    tiles: [...card.querySelectorAll('.sc-tile')].filter(shown).map(t => t.dataset.stat + '=' + (t.querySelector('.sc-value')?.getAttribute('aria-label') || t.querySelector('.sc-value')?.textContent.trim())),
    rewards: [...card.querySelectorAll('.sc-reward')].filter(shown).map(r => r.dataset.kind + ':' + [...r.querySelectorAll('small, strong')].map(t => t.textContent.trim()).join(' ')),
    evil: card.classList.contains('evil'), win: card.classList.contains('win'),
    old: /look around|next level/i.test(text) || !!document.getElementById('lookBtn') || !!document.getElementById('nextBtn') };
})()`;

if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-stagecard-'));
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
    const shot = async (name) => {
      if (!SHOTS) return;
      mkdirSync(SHOTS, { recursive: true });
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, `${PREFIX}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const size = async (w, h, phone) => {
      await page('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: phone ? 2 : 1, mobile: phone, screenWidth: w, screenHeight: h });
      await page('Emulation.setTouchEmulationEnabled', phone ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    };
    const open = async (fresh, outcome, evil, levelId, inject) => {
      await page('Page.navigate', { url: 'about:blank' });
      await page('Page.navigate', { url: `http://localhost:${port}/delivery/index.html?nocine` });
      await sleep(3000);
      return evaluate(RUN(outcome, evil, levelId, fresh, inject));
    };
    const press = (id) => evaluate(`(async () => { document.getElementById('${id}').click(); await new Promise(r => setTimeout(r, 900));
      const { Game } = await import('/src/delivery/game.js'); return { state: Game.state, card: !document.getElementById('resultScreen').classList.contains('hidden'),
      menu: !document.getElementById('startScreen').classList.contains('hidden') }; })()`);
    for (const [w, h, phone] of SIZES) {
      const sz = w + 'x' + h;
      for (const [name, outcome, evil, levelId, extra] of STATES) {
        await size(w, h, phone);
        const r = await open(!!extra.fresh, outcome, evil, levelId, extra.inject);
        const m = await evaluate(MEASURE);
        await shot(`${name}-${sz}`);
        const what = `${name} ${sz}`;
        check(r.up && m.cardUp, `${what}: the card is up (state ${r.state}${r.up && m.cardUp ? '' : '; ' + r.why})`);
        check(!m.out.length && m.scroll[0] <= m.scroll[1] + 1, `${what}: fits the screen, not scrolling (${m.scroll.join(' in ')}${m.out.length ? '; out: ' + m.out.join(', ') : ''})`);
        check(!m.old, `${what}: no "Look around", no "Next level" in the page`);
        const want = outcome === 'delivered' ? 'menuBtn' : 'restartBtn';
        check(m.primary.length === 1 && m.primary[0] === want, `${what}: one primary button, ${want} (${m.buttons.map(b => (b.primary ? '*' : '') + b.text).join(' | ')})`);
        if (phone) check(m.buttons.every(b => b.h >= 44), `${what}: its buttons 44 px or taller (${m.buttons.map(b => b.h).join(', ')})`);
        check(m.headline.length > 0 && m.headline.length <= 22 && m.win === (outcome === 'delivered'), `${what}: headline "${m.headline}"`);
        check(m.tiles.length >= 3 && (outcome !== 'delivered' || m.tiles.includes('earned=' + r.earned)), `${what}: tiles ${m.tiles.join(', ')}`);
        check(m.evil === evil, `${what}: the side (${evil ? 'Evil' : 'Good'}) on the card`);
        if (extra.inject) check(m.rewards.join(',') === 'stage:Stage done 5 of 5,prize:Grand prize Comet,pack:Pack Comet Pack,pack:Pack Career Pack', `${what}: the rewards as cards (${m.rewards.join(', ') || 'none'})`);
        // the buttons, once per state at the first size
        if (sz !== '390x844' || extra.inject) continue;
        const again = await press('restartBtn');
        check(again.state === 'playing' && !again.card, `${what}: Retry starts the run again (${JSON.stringify(again)})`);
        await open(false, outcome, evil, levelId);
        const back = await press('menuBtn');
        check(back.state === 'start' && back.menu && !back.card, `${what}: ${outcome === 'delivered' ? 'Continue' : 'Menu'} goes to the menu (${JSON.stringify(back)})`);
        await open(false, outcome, evil, levelId);
        const enter = await evaluate(`(async () => { document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })); await new Promise(r => setTimeout(r, 900));
          const { Game } = await import('/src/delivery/game.js'); return Game.state; })()`);
        check(enter === (outcome === 'delivered' ? 'start' : 'playing'), `${what}: Enter presses the primary (state ${enter})`);
      }
    }
    // a playback's card: no Retry, the one primary is Menu; on a menu level and on a hidden one (the owner, 17-Oct: "replays do not
    // work in hidden levels": replay.js recorded only the menu's levels and the events' stages)
    for (const levelId of ['expressway', 'hidden:gimmick-road-2']) {
    await size(390, 844, true);
    await open(false, 'delivered', false, levelId);
    const watched = await evaluate(`(async () => { const b = document.getElementById('watchBtn'); if (!b || b.offsetParent === null) return 'no Watch button';
      b.click(); await new Promise(r => setTimeout(r, 1500));
      const { Game } = await import('/src/delivery/game.js'); const { Replay } = await import('/src/delivery/replay.js');
      if (!Replay.playing) return 'not playing';
      Game.finish('delivered');
      const { Delivery } = await import('/src/delivery/delivery.js');
      const t0 = performance.now();
      while ((document.getElementById('resultScreen').classList.contains('hidden') || document.body.classList.contains('delivering')) && performance.now() - t0 < 40000) { if (Delivery.active) Delivery.skip(); await new Promise(r => setTimeout(r, 100)); }
      await new Promise(r => setTimeout(r, 450)); return 'ok'; })()`);
    if (watched === 'ok') {
      const m = await evaluate(MEASURE);
      await shot('playback-' + levelId.replace(':', '-') + '-390x844');
      check(m.primary.length === 1 && m.primary[0] === 'menuBtn' && !m.buttons.some(b => b.id === 'restartBtn'), `playback ${levelId} 390x844: no Retry, one primary, Menu (${m.buttons.map(b => (b.primary ? '*' : '') + b.text).join(' | ')})`);
      check(/replay/i.test(m.headline + ' ' + (await evaluate(`document.querySelector('#resultScreen .sc-kicker')?.textContent || ''`))), `playback ${levelId} 390x844: the card says it is a replay`);
    } else check(false, `playback ${levelId}: ` + watched);
    }
  } catch (e) { failed++; console.log('  FAIL  ' + (e && e.stack || e)); }
  try { socket?.close(); } catch { /* */ }
  try { child?.kill(); } catch { /* */ }
  await server?.close();
  await sleep(300);
  try { rmSync(own, { recursive: true, force: true }); } catch { /* (the browser may hold a file a moment longer) */ }
}
console.log(failed ? failed + ' failed' : 'all ok');
process.exit(failed ? 1 : 0);
