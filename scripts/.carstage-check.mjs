// A check of the car stage on the start screen's car card (src/delivery/render/carstage.js, CHECKLIST 347), headless (no WebGL:
// the stage's own meshes and triangles are counted, not a renderer's): every theme in themes.js builds a stage, or falls back,
// without throwing, framed and painted on cards of every size, its cost inside the budget (draw calls, triangles: none worse
// than the Steelworks'; build ms); the fallback chain (no theme, an unknown theme, no stage file, a stage file that fails to load,
// no obstacle list, a build / frame that throws: the default studio; the default throwing too: the plain card); ?stage=off in
// the menu's source gives the plain card and loads nothing. --report prints the per-theme table.
//   node scripts/.carstage-check.mjs [--report]
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const REPORT = process.argv.includes('--report');
const g = await boot({ ownAll: true });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
// the stage's budget: +4 draw calls at most (ground, plinth, shadow, props), triangles no more than the Steelworks' (the dearest
// of the four drawn with a file, on the desktop's Tall card: measured below; the phone's 2 props are held to the same figure), a stage built and framed (its props) in under BUILD_MS on this machine's core
const BUILD_MS = 60, CALLS = 4;
try {
  const THREE = await import('three');
  // ---- a 2D canvas stand-in (the patches, the backdrop) and the window's bits the stage reads
  const ctx2d = new Proxy({}, { get: (_, name) => (name === 'getImageData' ? () => ({ data: [128, 128, 128, 255] }) : () => ({ addColorStop() {} })), set: () => true });
  const canvas = () => ({ width: 0, height: 0, style: {}, dataset: {}, getContext: () => ctx2d, remove() {} });
  document.createElement = canvas;
  Object.assign(window, { devicePixelRatio: 2, innerWidth: 1280, innerHeight: 800 });
  const warn = console.warn, warnings = [];
  console.warn = (...a) => warnings.push(a.join(' '));
  const { THEMES } = await g.load('themes.js');
  const { makeStage, cardStage, stageFile, STAGE_FILES, STAGE_TEST } = await g.load('render/carstage.js');
  const { standView } = await g.load('render/modelviews.js');
  // (the car: a box the Commuter's size. The garage's models need a browser's window; the stage reads only the car's measure)
  const makeCar = () => new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 4), new THREE.MeshLambertMaterial());
  const view = (w = 326, h = 420) => {
    const model = makeCar(), v = { ...standView({ model, lift: 0.3, angle: 0.7, fitWidth: true }, 1.35), model };
    v.camera.aspect = w / h; v.camera.updateProjectionMatrix();
    return v;
  };
  const el = (w, h) => ({ clientWidth: w, clientHeight: h, prepend(node) { node.parentNode = this; } });
  const after = (ms) => new Promise(r => setTimeout(r, ms));

  // ---- a stage file that fails to load (the lazy import rejects): the theme's stage without it, a warning, no throw; asked again later it comes
  {
    const real = STAGE_FILES.city;
    STAGE_FILES.city = () => Promise.reject(new Error('network gone'));
    let s = null, threw = null;
    try { s = makeStage('city'); const v = view(); s.attach(v); s.frame(v.camera); s.paint(canvas(), v.camera, 326, 420); } catch (error) { threw = error; }
    await after(20);
    check(!threw && s && !s.stats.file, 'a stage file that fails to load: the stage builds without it (' + (threw?.message || 'no throw') + ')');
    check(warnings.some(w => /Stage file city not loaded/.test(w)), 'and says so once in the console');
    s?.dispose();
    STAGE_FILES.city = real;
    const back = await new Promise((resolve) => { if (stageFile('city', resolve)) resolve(true); setTimeout(() => resolve(false), 3000); });
    check(!!back, 'asked again, the file arrives (the failure was not kept)');
  }
  // the four files in, for the costs below
  await Promise.all(Object.keys(STAGE_FILES).map(name => new Promise((resolve) => { if (stageFile(name, resolve)) resolve(); setTimeout(resolve, 3000); })));

  // ---- every theme: built, framed, painted, tall (desktop) and small (phone), Good and Evil; its cost
  const rows = [];
  const measure = (theme, quality, w, h, evil = false) => {
    const v = view(w, h), t0 = performance.now();
    const s = makeStage(theme, { evil, quality });
    s.attach(v); s.frame(v.camera);
    const ms = performance.now() - t0;
    s.paint(canvas(), v.camera, w, h);
    const st = s.stats;
    s.dispose();
    return { calls: st.meshes, triangles: st.triangles, ms, file: st.file, bytes: st.geometryBytes };
  };
  const ids = Object.keys(THEMES);
  const steel = measure('steelworks', 'high', 326, 420), steelLow = measure('steelworks', 'low', 192, 69);
  for (const theme of [...ids, 'default']) {
    let row;
    try {
      const tall = measure(theme, 'high', 326, 420), phone = measure(theme, 'low', 192, 69), evil = measure(theme, 'high', 326, 420, true);
      row = { theme, tall, phone, evil, file: tall.file, props: !!THEMES[theme]?.obstacles };
    } catch (error) { row = { theme, error: error?.message || String(error) }; }
    rows.push(row);
  }
  const threw = rows.filter(r => r.error);
  check(!threw.length, 'every theme in themes.js (' + ids.length + ') and the default studio builds a stage, Good, Evil, tall and phone, without throwing' + (threw.length ? ': ' + threw.map(r => r.theme + ' ' + r.error).join('; ') : ''));
  const ok = rows.filter(r => !r.error);
  // (the budget: the Steelworks' tall stage, which was the dearest at 6480 triangles; the steelworks' redrawn obstacles (CHECKLIST 411)
  // made its stage cheaper, so the budget stays at that figure rather than falling with it: v1.1.148-alpha integration)
  const TRIS = Math.max(steel.triangles, 6480);
  const over = ok.filter(r => r.tall.calls > CALLS || r.phone.calls > CALLS || r.tall.triangles > TRIS || r.phone.triangles > TRIS || r.evil.triangles > TRIS);
  check(!over.length, 'none dearer than the budget, the Steelworks\' old Tall card (' + TRIS + ' triangles, tall or phone; the Steelworks now ' + steel.triangles + ' tall, ' + steelLow.triangles + ' phone; at most ' + CALLS + ' draw calls)' + (over.length ? ': ' + over.map(r => r.theme + ' ' + r.tall.triangles + '/' + r.phone.triangles).join(', ') : ''));
  const slow = ok.filter(r => Math.max(r.tall.ms, r.phone.ms, r.evil.ms) > BUILD_MS);
  check(!slow.length, 'every stage built and framed in under ' + BUILD_MS + ' ms (the slowest: ' + ok.map(r => [r.theme, Math.max(r.tall.ms, r.phone.ms, r.evil.ms)]).sort((a, b) => b[1] - a[1])[0].map(x => typeof x === 'number' ? x.toFixed(1) + ' ms' : x).join(' ') + ')' + (slow.length ? ': ' + slow.map(r => r.theme).join(', ') : ''));
  const bare = ok.filter(r => THEMES[r.theme]?.obstacles && !r.file && r.tall.calls < 4);
  check(!bare.length, 'a theme with its own obstacles in themes.js and no stage file has props all the same' + (bare.length ? ': not ' + bare.map(r => r.theme).join(', ') : ''));
  if (REPORT) {
    console.log('\n  theme              file props  tall calls/tris  phone calls/tris  evil tris  build ms (tall)');
    for (const r of ok) console.log('  ' + r.theme.padEnd(18) + (r.file ? ' yes ' : ' no  ') + (r.props ? ' yes  ' : ' no   ') + String(r.tall.calls).padStart(6) + ' / ' + String(r.tall.triangles).padEnd(7) + String(r.phone.calls).padStart(6) + ' / ' + String(r.phone.triangles).padEnd(7) + String(r.evil.triangles).padStart(9) + '  ' + r.tall.ms.toFixed(1));
    console.log('');
  }

  // ---- the card's fallback chain (cardStage.sync)
  const card = (w = 326, h = 420) => { const e = el(w, h); return { e, c: cardStage(e), v: view(w, h) }; };
  {
    const { c, v } = card();
    c.sync(v, undefined, false);
    check(c.stage?.theme === 'default', 'no theme at all (undefined: no level): the default studio (a LEVEL with no theme is the city\'s, as road.js draws it: the menu\'s glue)');
    c.sync(v, 'no-such-theme', false);
    check(c.stage?.theme === 'default', 'a theme not in themes.js: the default studio');
    THEMES.bareTest = { sky: 0xc4e6f5, ground: 0x8fb556, road: 0x57514a, scenery: 'bareTest' }; // (every real theme has a stage file or props now: a made-up one)
    c.sync(v, 'bareTest', false);
    check(c.stage?.theme === 'bareTest' && c.stage.stats.meshes === 3 && !c.stage.stats.file, 'a theme with no entry in STAGE_FILES and no obstacles: its own colours, no props, no generic crates');
    delete THEMES.bareTest;
    const keep = THEMES.toyroom.obstacles;
    delete THEMES.toyroom.obstacles;
    let t = null;
    try { c.sync(v, 'toyroom', false); v.step(0, 0.016); } catch (error) { t = error; }
    check(!t && c.stage?.theme === 'toyroom' && c.stage.stats.meshes === 3, 'a theme whose obstacle list is missing: its stage, no props, no throw');
    THEMES.toyroom.obstacles = keep;
    c.sync(v, 'off', false);
    check(!c.stage, "'off': no stage (the plain card)");
  }
  {
    const { c, v } = card();
    const plainReach = v.reach, plainPos = v.camera.position.clone();
    STAGE_TEST.throwOn = 'vegas';
    c.sync(v, 'vegas', false);
    check(c.stage?.theme === 'default' && c.broken.has('vegas'), 'a stage whose build throws: the default studio');
    STAGE_TEST.throwOn = null;
    c.sync(v, 'vegas', false);
    check(c.stage?.theme === 'default', 'and the default for that theme from then on (not built again each time)');
    c.sync(v, 'alpine', false);
    v.step(0, 0.016);
    c.stage.frame = () => { throw new Error('frame broke'); };
    let t = null;
    try { v.step(0.1, 0.016); } catch (error) { t = error; }
    check(!t && c.stage?.theme === 'default' && c.broken.has('alpine'), 'a stage whose frame throws: the default studio, nothing thrown to the menu');
    c.stage.paint = () => { throw new Error('paint broke'); };
    t = null;
    try { v.step(0.2, 0.016); v.step(0.3, 0.016); } catch (error) { t = error; }
    check(!t && !c.stage && c.broken.has('default'), 'the default studio throwing too: the plain card');
    check(v.reach === plainReach && v.camera.position.distanceTo(plainPos) < 1e-6, 'and the plain card\'s camera and fit as they were');
  }
  {
    const { c, v } = card();
    STAGE_TEST.throwOn = '*';
    let t = null;
    try { c.sync(v, 'city', false); } catch (error) { t = error; }
    STAGE_TEST.throwOn = null;
    check(!t && !c.stage, 'every build throwing: the plain card, no throw');
  }
  // ---- a card of any size, and one with no size yet
  {
    const bad = [];
    for (const [w, h] of [[0, 0], [1, 1], [192, 69], [64, 44], [326, 420], [2000, 300], [300, 2000], [5000, 5000]]) {
      try {
        const { c, v } = card(w, h);
        if (w && h) { v.camera.aspect = w / h; v.camera.updateProjectionMatrix(); } else { v.camera.aspect = NaN; }
        c.sync(v, 'vegas', false);
        v.step(0, 0.016);
        const s = c.stage;
        const back = { width: 0, height: 0, style: {}, dataset: {}, getContext: () => ctx2d };
        if (s && w && h) { s.repaint = true; s.paint(back, v.camera, w, h); if (back.width * back.height > 4e5 + 2 * (back.width + back.height)) bad.push(w + 'x' + h + ' backdrop ' + back.width + 'x' + back.height); }
        if (!s) bad.push(w + 'x' + h + ' no stage');
        if (w && h && ![...Object.values(v.camera.position)].every(Number.isFinite)) bad.push(w + 'x' + h + ' camera');
      } catch (error) { bad.push(w + 'x' + h + ' threw ' + error.message); }
    }
    check(!bad.length, 'a card of any size (0x0 to 5000x5000): framed and painted, the backdrop at most 400k px, nothing thrown' + (bad.length ? ': ' + bad.join('; ') : ''));
  }
  // ---- the menu: on by default, the picked level's theme, ?stage=off the plain card (and the module not loaded), never in Start's way
  {
    const src = readFileSync(new URL('../src/delivery/render/menustage.js', import.meta.url), 'utf8');
    check(/stageOn = !\['off', '0'\]\.includes\(STAGE\)/.test(src) && /STAGE === null \|\| \['', 'level', '1'\]\.includes\(STAGE\) \? \(LEVEL \? LEVEL\.theme \|\| 'city' : undefined\)/.test(src), "the menu: on with no ?stage=, the picked level's theme; ?stage=off the plain card");
    check(/if \(stageOn \|\| params\.has\('stagelog'\)\) import\('\.\/carstage\.js'\)/.test(src) && /\}\)\.catch\(/.test(src), 'the stage module is imported lazily, its failure caught (the menu and Start never wait on it)');
    check(!/^import .*carstage/m.test(src), 'and never imported up front');
    const stage = readFileSync(new URL('../src/delivery/render/carstage.js', import.meta.url), 'utf8');
    check(!/THREE\.Fog|scene\.fog/.test(stage.replace(/\/\/.*$/gm, '')), 'no real fog (no shader compiled again for the car)');
  }
  console.warn = warn;
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
}
await g.close();
console.log(failures ? failures + ' failure(s)' : 'all ok');
process.exit(failures ? 1 : 0);
