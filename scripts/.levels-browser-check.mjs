// A real-browser check of the lazy levels (levels.js): the dev server, headless Chromium over the DevTools protocol (no playwright), software
// GL. Each address is a fresh page; the game's own modules are read back in the page (the same instances the page runs on). Checks that what
// the address names is loaded and RUNNING (not left waiting for its file), a start asked in the very tick a level is picked waits for it
// and then starts, the menu's road card and replays list wait for the level, no page error on the way. One browser at a time; ~2 minutes.
//   node scripts/.levels-browser-check.mjs [--browser=<path>]
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const server = await createServer({ root: '.', logLevel: 'error', server: { port: 0, host: '127.0.0.1', hmr: false }, optimizeDeps: { entries: ['delivery/index.html'] } });
await server.listen();
const port = server.httpServer.address().port;
const tmp = mkdtempSync(join(tmpdir(), 'levels-browser-')); mkdirSync(join(tmp, 'p'));
let chrome = process.argv.find(a => a.startsWith('--browser='))?.slice(10) || 'chromium';
if (!process.argv.some(a => a.startsWith('--browser=')) && existsSync('/opt/pw-browsers')) for (const d of readdirSync('/opt/pw-browsers').sort().reverse()) { const p = join('/opt/pw-browsers', d, 'chrome-linux', 'chrome'); if (d.startsWith('chromium-') && existsSync(p)) { chrome = p; break; } }
const proc = spawn(chrome, [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), '--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle', '--mute-audio', '--no-first-run',
  '--user-data-dir=' + join(tmp, 'p'), '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
let ws = null;
for (let i = 0; i < 300 && !ws; i++) { await sleep(100); try { const l = readFileSync(join(tmp, 'p', 'DevToolsActivePort'), 'utf8').split('\n'); if (l[1]) ws = `ws://127.0.0.1:${l[0]}${l[1]}`; } catch { /* not up */ } }
if (!ws) throw new Error('no browser: ' + chrome);
const sock = new WebSocket(ws); await new Promise(r => sock.addEventListener('open', r));
let calls = 0; const waiting = new Map(), listeners = [];
sock.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id) { waiting.get(d.id)?.(d); waiting.delete(d.id); } else listeners.forEach(f => f(d)); });
const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++calls; waiting.set(id, m => m.error ? no(new Error(method + ': ' + m.error.message)) : ok(m.result)); sock.send(JSON.stringify({ id, method, params, sessionId })); });

const visit = async (query, probe, { seconds = 120, page = 'index.html', raw = false } = {}) => {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId), problems = [];
  const on = (m) => { if (m.sessionId !== sessionId) return; if (m.method === 'Runtime.exceptionThrown') problems.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push('console.error ' + m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200)); };
  listeners.push(on);
  await S('Runtime.enable'); await S('Page.enable'); await S('Emulation.setDeviceMetricsOverride', { width: 1100, height: 650, deviceScaleFactor: 1, mobile: false });
  await S('Page.navigate', { url: `http://127.0.0.1:${port}/delivery/${page}${query}` });
  const ev = async (e) => { const r = await S('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.split('\n')[0]); return r.result.value; };
  let result = null, last = null;
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    try { last = await ev(raw ? `(${probe})()` : `(async () => { const G = (await import('/src/delivery/game.js')).Game, L = await import('/src/delivery/levels.js'); return (${probe})(G, L); })()`); if (last && last.ok) { result = last; break; } } catch (e) { last = { error: String(e.message) }; }
    await sleep(500);
  }
  listeners.splice(listeners.indexOf(on), 1);
  await send('Target.closeTarget', { targetId });
  return { result, last, problems };
};
const running = (id) => `(G, L) => ({ ok: G.state === 'playing' && L.LEVEL.id === '${id}' && Array.isArray(L.LEVEL.segments) && L.LEVEL.segments.length > 0 && G.loaded === L.LEVEL, state: G.state, level: L.LEVEL.id })`;
const visits = [
  ['?autostart&level=5', running('hurricane'), 'the address names a level (?autostart&level=5) and it runs'],
  ['?hidden=gimmick-road-3', running('gimmick-road-3'), '?hidden=<id> runs a hidden level'],
  ['?test', running('testbed'), '?test runs the test track'],
  ['?hidden=dakar-dash', running('dakar-dash'), '?hidden=dakar-dash (a level added last) runs'],
  ['?autostart&level=30&tiers=0', running('stelvio'), 'the 30th level (stelvio) runs'],
  ['?screensaver', `(G, L) => ({ ok: G.state === 'playing' && G.screensaver && L.LEVEL === L.SCREENSAVER_LEVEL && L.LEVEL.segments?.length > 0 })`, '?screensaver runs the screensaver\'s level'],
  ['?racewatch', `(G, L) => ({ ok: G.state === 'playing' && G.raceWatch && !!L.LEVEL.laps && L.LEVEL.segments?.length > 0, level: L.LEVEL.id })`, '?racewatch runs a circuit'],
  ['?autostart&level=1&gt', `(G, L) => ({ ok: G.state === 'playing' && L.LEVEL.id === 'expressway' })`, '?gt with a delivery level starts'],
  ['?tiers=0', `async (G, L) => {
      if (!window.__tried) { // (the menu up; pick a level never loaded and ask for its start in the same tick: it waits, then starts)
        if (!document.querySelector('.menu-stage') || G.state !== 'start') return { ok: false };
        window.__tried = true; L.selectLevel(40); window.__asked = { loaded: L.levelLoaded(L.LEVEL), id: L.LEVEL.id };
        G.start(); window.__after = G.state; }
      return { ok: G.state === 'playing' && Array.isArray(L.LEVEL.segments) && L.LEVEL.segments.length > 0 && G.loaded === L.LEVEL, asked: window.__asked, stateRightAfter: window.__after, level: L.LEVEL.id }; }`, 'the menu: a level picked and started in the same tick waits for its file, then starts'],
];
try {
  for (const [query, probe, what] of visits) {
    const { result, last, problems } = await visit(query, probe);
    check(!!result, what + (result ? '' : ' -- ' + JSON.stringify(last)));
    if (query === '?tiers=0' && result) check(result.asked?.loaded === false && result.stateRightAfter !== 'playing', '  (it was not loaded when asked, and had not started in that tick: ' + JSON.stringify(result.asked) + ' / ' + result.stateRightAfter + ')');
    check(!problems.length, '  no page error on the way' + (problems.length ? ': ' + problems.slice(0, 3).join(' | ') : ''));
  }
  // the road card of a level not loaded opens with the level's road once it is here
  const road = await visit('?pick=12&road', `async (G, L) => { const box = document.getElementById('roadCard'); return { ok: !!box && !box.classList.contains('hidden') && !!box.querySelector('.sheet-box.road') && !box.querySelector('.road-wait') && L.levelLoaded(L.LEVEL), text: box?.innerText.slice(0, 80) }; }`);
  check(!!road.result, 'the road card (?pick=12&road) shows the level\'s road once the level is here' + (road.result ? '' : ' -- ' + JSON.stringify(road.last)));
  check(!road.problems.length, '  no page error on the way' + (road.problems.length ? ': ' + road.problems.slice(0, 3).join(' | ') : ''));
  // the pages that read every level: the editor's list of levels, the gimmicks page's "in which levels"
  const editor = await visit('', `() => { const n = document.querySelectorAll('#pick option').length; return { ok: n > 85, options: n }; }`, { page: 'editor.html', raw: true });
  check(!!editor.result, 'the editor lists every level (' + (editor.result?.options ?? JSON.stringify(editor.last)) + ' options)');
  check(!editor.problems.length, '  no page error on the way' + (editor.problems.length ? ': ' + editor.problems.slice(0, 3).join(' | ') : ''));
  const gimmicks = await visit('?group=vehicles', `() => { const t = [...document.querySelectorAll('p.levels')].map(p => p.textContent); return { ok: t.length > 3 && t.some(x => /^In .*\\d/.test(x) || /^In /.test(x)), sample: t.slice(0, 2) }; }`, { page: 'gimmicks.html', raw: true });
  check(!!gimmicks.result, 'the gimmicks page says which levels have each gimmick ' + JSON.stringify(gimmicks.result?.sample ?? gimmicks.last).slice(0, 160));
  check(!gimmicks.problems.length, '  no page error on the way' + (gimmicks.problems.length ? ': ' + gimmicks.problems.slice(0, 3).join(' | ') : ''));
} finally {
  try { await send('Browser.close'); } catch { /* gone */ }
  proc.kill('SIGKILL'); await server.close();
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* held */ }
}
console.log(failures ? failures + ' FAILED' : 'all browser checks passed');
process.exit(failures ? 1 : 0);
