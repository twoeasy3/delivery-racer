// A check of THE SCENERY FADE in the replay (orbit) camera (CHECKLIST 472, REPLAY-CAM.md; render/scenefade.js, render/orbit.js, main.js):
//   SOURCE      render-only: the replay fingerprint is main's, scenefade.js is not a rules file
//   PER THEME   in headless Chromium over DevTools (skipped with a note if no browser is found), 390x844, one level of each theme (or
//               --themes=a,b / --levels=id,id), the orbit camera as ?orbit gives it (the replay's own camera, held still):
//     OFF IN PLAY   the run going on with the chase camera: the fade never runs (no index built, no frame of it), the scenery's own materials
//     OBSTRUCTED    a pose found where the line from the orbit camera to the car goes through set dressing that fades (a ray on the
//                   drawn triangles, not a box): there, the obstructing prop's fade > 0.9, and every fadeable thing the line meets > 0.9
//                   (the car is not blocked by a prop: it is visible), the car itself drawn
//     NOT FAR       no cluster faded that is not on the line (within the beam, + 0.25 m) or round the camera: a prop away from the shot stays
//     COST          the clusters tested a frame (at the pose, and turning round the car for 2 s), and the ms of a frame's test: stated
//     OFF AGAIN     the orbit off: in 0.4 s nothing faded, the original materials back, the instance matrices plain, and the fade no longer runs
//   ONCE          photo mode (a free camera round the paused car) fades too, and stops with it
//   node scripts/.replay-cam-check.mjs [--themes=city,venice] [--levels=venice,tokyo] [--part=1/3] [--browser=<path>] [--shots=<dir>]
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fingerprints, logicFiles } from './logic-hash.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const SHOTS = opt('shots', null);
const ONLY_THEMES = typeof opt('themes', null) === 'string' ? opt('themes').split(',') : null;
const PART = typeof opt('part', null) === 'string' ? opt('part').split('/').map(Number) : null;
const ONLY_LEVELS = typeof opt('levels', null) === 'string' ? opt('levels').split(',') : null;
let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const note = (what) => console.log('  ..    ' + what);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const MAIN_PRINT = { logic: '057a22806d', legacy: '661de07fbe' }; // (main v1.1.154-alpha, 5c0d89d)
const COST = { tested: 600, ms: 10 }; // (a frame's test at most: clusters tested; ms in headless SwiftShader's JS, a frame that makes a material's fading copy included)

// ---- the source
const print = fingerprints();
check(print.logic === MAIN_PRINT.logic && print.legacy === MAIN_PRINT.legacy, `the replay fingerprint is main's (${print.logic} / ${print.legacy})`);
check(!logicFiles().some(f => /scenefade/.test(f)), 'render/scenefade.js is not a rules file');
const fadeJs = readFileSync(join(ROOT, 'src/delivery/render/scenefade.js'), 'utf8');
check(/discard/.test(fadeJs) && !/transparent\s*=\s*true/.test(fadeJs), 'the dissolve is a screen-door discard (no transparent pass)');

const browser = opt('browser', null) || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!browser) console.log('  (no Chromium / Edge found: the browser part is skipped; --browser=<path>)');
else {
  const own = mkdtempSync(join(tmpdir(), 'delivery-replaycam-'));
  let server, child, socket, calls = 0;
  const waiting = new Map();
  const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((done, fail) => {
    const id = ++calls;
    const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(method + ': ' + m.error.message)) : done(m.result); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  try {
    server = await createServer({ root: ROOT, server: { port: 5281, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
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
    const errors = [];
    socket.addEventListener('message', (m) => {
      const message = JSON.parse(m.data);
      if (message.id) { const answer = waiting.get(message.id); waiting.delete(message.id); answer?.(message); }
      else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(a => a.value ?? a.description).join(' '));
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params, timeout) => send(method, params, sessionId, timeout);
    await page('Runtime.enable');
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
    const evaluate = async (expression, timeout = 120000) => {
      const r = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);
      if (r.exceptionDetails) throw new Error('in the page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    const shot = async (name) => {
      if (!SHOTS) return;
      mkdirSync(SHOTS, { recursive: true });
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
    };
    const base = `http://localhost:${port}/delivery/`;
    await page('Page.navigate', { url: base + 'index.html' });
    await sleep(3000);
    // one level of each theme (a level in the menu's list rather than a hidden one where there is both)
    const levels = await evaluate(`(async () => { const L = await import('/src/delivery/levels.js');
      const out = L.LEVELS.map((l, i) => ({ id: l.id, n: i + 1, theme: l.theme || 'city' }));
      for (const [k, l] of Object.entries(L.HIDDEN_LEVELS)) if (!out.some(o => o.id === (l.id || k))) out.push({ id: k, hidden: true, theme: l.theme || 'city' });
      return out; })()`);
    const pick = new Map();
    for (const l of levels) if (!pick.has(l.theme) || (pick.get(l.theme).hidden && !l.hidden)) pick.set(l.theme, l);
    let todo = ONLY_LEVELS ? levels.filter(l => ONLY_LEVELS.includes(l.id)) : [...pick.values()];
    if (ONLY_THEMES) todo = todo.filter(l => ONLY_THEMES.includes(l.theme));
    if (PART) todo = todo.filter((_, i) => i % PART[1] === PART[0] - 1); // (--part=1/3: every third, for runs side by side)
    console.log(`  ${todo.length} levels, one a theme`);

    const M = `const { Game } = await import('/src/delivery/game.js'); const { Player } = await import('/src/delivery/player.js'); const { Track } = await import('/src/delivery/track.js');
      const { Orbit } = await import('/src/delivery/render/orbit.js'); const { levelGroup } = await import('/src/delivery/render/road.js'); const { camera, scene } = await import('/src/delivery/render/scene.js');
      const F = await import('/src/delivery/render/scenefade.js'); const { carMesh } = await import('/src/delivery/render/cars.js');
      const frames = (n) => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      // (until every fade has reached 0 or 1, at least 0.3 s: headless frames are slow, and a frame's dt is capped at 0.05 s)
      const settled = async (F) => { const t0 = performance.now(); let n = 0; await wait(300); for (; n < 400 && performance.now() - t0 < 8000; n++) { await frames(1); if (F.settled()) break; } F.SceneFade.fps = Math.round(1000 * n / (performance.now() - t0)); };`;
    const costs = [], gaps = [];
    for (const l of todo) {
      const label = `${l.id} (${l.theme})`;
      errors.length = 0;
      await page('Page.navigate', { url: base + (l.hidden ? `?autostart&hidden=${l.id}` : `?autostart&level=${l.n}`) + '&tiers=0&ff=1&orbit=150,18,25&orbitoff' });
      let up = false;
      for (let i = 0; i < 80 && !up; i++) {
        await sleep(400);
        up = await evaluate(`(async () => { try { const { Game } = await import('/src/delivery/game.js'); if (Game.state !== 'playing') return false; Game.paused = true; return true; } catch { return false; } })()`).catch(() => false);
      }
      if (!up) { check(false, `${label}: the level started`); continue; }
      // (the theme's scenery arrives after the road: wait for levelGroup to stop growing)
      await evaluate(`(async () => { ${M} let n = -1, still = 0; for (let i = 0; i < 60 && still < 4; i++) { await wait(250); const k = levelGroup.children.length; still = k === n ? still + 1 : 0; n = k; } return n; })()`);
      // OFF IN PLAY: the chase camera, the run going on: nothing of the fade
      const off = await evaluate(`(async () => { ${M} Game.paused = false; await frames(20); Game.paused = true;
        let swapped = 0; levelGroup.traverse(o => { if (o.material && [].concat(o.material).some(m => m.userData.fadeOf)) swapped++; });
        return { frames: F.SceneFade.frames, units: F.SceneFade.units, swapped, on: Orbit.on }; })()`);
      check(!off.on && off.frames === 0 && off.units === 0 && off.swapped === 0, `${label}: in play (chase camera) the fade never ran (frames ${off.frames}, index ${off.units} units, ${off.swapped} materials swapped)`);
      // the index: the orbit on for a few frames, then off again (so the search below sees nothing faded)
      const idx = await evaluate(`(async () => { ${M} Object.assign(Orbit, { on: true, mode: 'button', auto: false, held: true }); for (let i = 0; i < 300 && !F.fadeReady(); i++) await frames(1); await frames(2); Orbit.on = false; await settled(F);
        const { units, clusters, big, buildMs, buildFrames, buildSlowest, active } = F.SceneFade; return { units, clusters, big, buildMs, buildFrames, buildSlowest, active }; })()`);
      note(`${label}: index ${idx.units} props in ${idx.clusters} clusters, ${idx.big} too big to fade, built in ${idx.buildMs} ms over ${idx.buildFrames} frames (the longest ${idx.buildSlowest} ms)`);
      // OBSTRUCTED: a pose where the line from the camera to the car goes through a prop that fades, and nothing that does not
      const pose = await evaluate(`(async () => { ${M}
        const THREE = await import('/node_modules/three/build/three.module.js'); const ray = new THREE.Raycaster(), p = new THREE.Vector3(), at = new THREE.Vector3(), want = new THREE.Vector3(), dir = new THREE.Vector3();
        const flip = scene.scale.x < 0 ? -1 : 1, top = (o) => { while (o.parent && o.parent !== levelGroup) o = o.parent; return o; };
        levelGroup.updateMatrixWorld(true);
        let found = null, tried = 0, blockedBig = 0;
        const s0 = Track.start + 150, s1 = Track.end - 150;
        for (let f = 0; f < 24 && !found; f++) {
          const s = s0 + (s1 - s0) * ((f * 7) % 24) / 24;
          for (const yaw of [150, 90, -90, 120, -120, 35, -35, 180, 60, -60]) {
            for (const pitch of [12, 22]) {
              tried++;
              const h = Track.toWorld(s, Player.lat, p), a = h + yaw * Math.PI / 180, pr = pitch * Math.PI / 180, flat = Math.cos(pr) * 25;
              at.set(p.x * flip, p.y + 1.1, p.z);
              want.set((p.x + Math.sin(a) * flat) * flip, at.y + Math.sin(pr) * 25, p.z + Math.cos(a) * flat);
              ray.camera = camera; dir.subVectors(at, want); const d = dir.length(); ray.set(want, dir.normalize()); ray.far = d - 1.5; F.fadeProbe({ x: want.x * flip, y: want.y, z: want.z });
              const hits = ray.intersectObject(levelGroup, true).filter(x => !x.object.userData.flat && !x.object.material?.transparent && !x.object.isPoints && !x.object.isLine);
              if (!hits.length) continue;
              if (hits.some(x => !F.fadesAway(x.object, x.instanceId, x.faceIndex))) { blockedBig++; continue; }
              const t = top(hits[0].object);
              found = { s, yaw, pitch, want: want.toArray(), id: t.uuid, inst: hits[0].instanceId ?? -1, face: hits[0].faceIndex ?? -1, what: (t.isInstancedMesh ? 'instance of ' : '') + (t.name || t.type) + ' #' + (hits[0].object.material?.color?.getHexString?.() || ''), at: +hits[0].distance.toFixed(1) };
              break;
            }
            if (found) break;
          }
        }
        return { found, tried, blockedBig };
      })()`);
      if (!pose.found) { note(`${label}: no pose found where only fading props block the car (${pose.tried} tried, ${pose.blockedBig} blocked by something too big or the land): nothing to fade here`); gaps.push(l.theme + (pose.blockedBig ? ` (${pose.blockedBig}/${pose.tried} blocked by unfaded scenery)` : '')); continue; }
      const P = pose.found;
      const r = await evaluate(`(async () => { ${M}
        const THREE = await import('/node_modules/three/build/three.module.js');
        Player.s = ${P.s}; Object.assign(Orbit, { yaw: ${P.yaw} * Math.PI / 180, pitch: ${P.pitch} * Math.PI / 180, radius: 25, on: true, mode: 'button', auto: false, held: true });
        F.SceneFade.testedMax = 0; F.SceneFade.msMax = 0;
        await settled(F);
        const flip = scene.scale.x < 0 ? -1 : 1, p = new THREE.Vector3(); Track.toWorld(Player.s, Player.lat, p);
        const at = new THREE.Vector3(p.x * flip, p.y + Player.air + 1.1, p.z), cam = camera.position.clone();
        const want = new THREE.Vector3(...${JSON.stringify(P.want)});
        let obj = null; levelGroup.traverse(o => { if (o.uuid === '${P.id}') obj = o; });
        const fade = F.fadeOf(obj, ${P.inst}, ${P.face});
        // the line from the camera as it is to the car: every fadeable thing on it faded, nothing else on it
        const ray = new THREE.Raycaster(), dir = at.clone().sub(cam), d = dir.length(); ray.camera = camera; ray.set(cam, dir.normalize()); ray.far = d - 1.0; F.fadeProbe({ x: cam.x * flip, y: cam.y, z: cam.z });
        const hits = ray.intersectObject(levelGroup, true).filter(x => !x.object.userData.flat && !x.object.material?.transparent && !x.object.isPoints && !x.object.isLine);
        const unfaded = hits.filter(x => F.fadesAway(x.object, x.instanceId, x.faceIndex) && F.fadeOf(x.object, x.instanceId, x.faceIndex) <= 0.9).length, solid = hits.filter(x => !F.fadesAway(x.object, x.instanceId, x.faceIndex)).length;
        // nothing faded off the line: each faded cluster's box within the beam (+ 0.25) of the line or the ball round the camera
        const C = F.fadeClusters(), B = F.FADE_SIZES;
        const segBox = (o, r) => { let t0 = 0, t1 = 1; const P0 = [cam.x * flip, cam.y, cam.z], D = [(at.x - cam.x) * flip, at.y - cam.y, at.z - cam.z]; /* (the clusters' boxes are in the game's terms: x not mirrored) */ for (let k = 0; k < 3; k++) { const lo = C.box[o + k] - r, hi = C.box[o + 3 + k] + r; if (Math.abs(D[k]) < 1e-9) { if (P0[k] < lo || P0[k] > hi) return false; continue; } let a = (lo - P0[k]) / D[k], c = (hi - P0[k]) / D[k]; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return false; } return true; };
        const ball = (o, r) => { const q = [cam.x * flip, cam.y, cam.z]; let s = 0; for (let k = 0; k < 3; k++) { const e = Math.max(C.box[o + k] - q[k], 0, q[k] - C.box[o + 3 + k]); s += e * e; } return s <= r * r; };
        let faded = 0, far = 0;
        const atMid = at.clone(); C.fade.forEach((f, c) => { if (f <= 0) return; faded++; at.y = atMid.y - 0.85; const low = segBox(c * 6, B.beam + 0.25); at.copy(atMid); if (!segBox(c * 6, B.beam + 0.25) && !low && !ball(c * 6, B.near + 0.25)) far++; }); // (the line to the middle, and the one to the sills)
        const swappedNear = [].concat(obj?.material || []).some(m => m.userData.fadeOf);
        const tested = F.SceneFade.tested, ms = F.SceneFade.ms;
        // COST: turning round the car for 2 s
        Object.assign(Orbit, { auto: true, held: false }); await wait(2000); Object.assign(Orbit, { auto: false, held: true });
        const spin = { testedMax: F.SceneFade.testedMax, msMax: F.SceneFade.msMax };
        return { fade, unfaded, solid, faded, far, tested, ms, spin, moved: +cam.distanceTo(want).toFixed(2), carShown: carMesh.visible && carMesh.parent !== null, instanced: !!obj?.isInstancedMesh, swappedNear };
      })()`);
      check(r.fade > 0.9 || (r.moved > 1 && r.unfaded === 0), (r.fade > 0.9 ? '' : `(the nudge moved the camera ${r.moved} m off the pose, for the land or big scenery: the prop is no longer on the line) `) + `${label}: the prop between the camera and the car (${P.what}, ${P.at} m from the camera; s ${Math.round(P.s)}, yaw ${P.yaw}, pitch ${P.pitch}) faded ${r.fade.toFixed(2)}`);
      check(r.unfaded === 0 && r.carShown, `${label}: the car seen: no unfaded prop on the line to it (${r.unfaded}), the car drawn` + (r.solid ? ` (${r.solid} hits on the land or unfaded big scenery: the camera moved ${r.moved} m)` : ''));
      check(r.far === 0, `${label}: nothing faded away from the shot (${r.faded} clusters faded, ${r.far} off the line)`);
      check(r.spin.testedMax <= COST.tested && r.spin.msMax <= COST.ms, `${label}: the cost a frame: ${r.tested} clusters tested at the pose, at most ${r.spin.testedMax} turning round the car; ${r.ms.toFixed(2)} ms, at most ${r.spin.msMax.toFixed(2)} ms`);
      costs.push({ level: l.id, tested: r.tested, max: r.spin.testedMax, ms: r.spin.msMax, units: idx.units, clusters: idx.clusters });
      await shot(l.id + '-faded');
      // OFF AGAIN
      const back = await evaluate(`(async () => { ${M}
        Orbit.on = false; const t0 = performance.now(); await settled(F); const took = performance.now() - t0;
        let obj = null; levelGroup.traverse(o => { if (o.uuid === '${P.id}') obj = o; });
        let swapped = 0, bent = 0; levelGroup.traverse(o => { if (o.material && [].concat(o.material).some(m => m.userData.fadeOf)) swapped++; if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let i = 3; i < o.count * 16; i += 16) if (a[i] !== 0) { bent++; break; } } });
        const n0 = F.SceneFade.frames; Game.paused = false; await frames(15); Game.paused = true; const n1 = F.SceneFade.frames;
        return { fade: F.fadeOf(obj, ${P.inst}, ${P.face}), active: F.SceneFade.active, swapped, bent, ran: n1 - n0, took: Math.round(took), fps: F.SceneFade.fps };
      })()`);
      check(back.fade === 0 && back.active === 0 && back.swapped === 0 && back.bent === 0 && back.ran === 0,
        `${label}: the orbit off: all back (in ${back.took} ms at ${back.fps} frames a second; fade ${back.fade}, ${back.active} active, ${back.swapped} materials still swapped, ${back.bent} instanced meshes with a fade left), then not run (${back.ran} frames)`);
      if (errors.length) check(false, `${label}: page errors: ${errors.slice(0, 3).join(' | ').slice(0, 300)}`);
    }
    // ONCE: photo mode fades too (the last level loaded), and stops with it
    if (todo.length) {
      const ph = await evaluate(`(async () => { ${M} const { Photo, startPhoto } = await import('/src/delivery/render/photo.js');
        Game.paused = true; const n0 = F.SceneFade.frames; startPhoto(); await frames(4); const on = F.SceneFade.frames - n0, was = Photo.on;
        Photo.on = false; document.body.classList.remove('photo'); await settled(F); const n1 = F.SceneFade.frames; await frames(4);
        return { photo: on, was, after: F.SceneFade.frames - n1, active: F.SceneFade.active }; })()`);
      check(ph.photo > 0 && ph.after === 0 && ph.active === 0, `photo mode (${ph.was ? 'on' : 'NOT ON'}): the fade runs while it is on (${ph.photo} frames), and stops after it (${ph.after} frames later, ${ph.active} active)`);
    }
    if (costs.length) {
      const worst = costs.reduce((a, b) => (b.max > a.max ? b : a));
      console.log(`  COST: clusters tested a frame at the poses: median ${costs.map(c => c.tested).sort((a, b) => a - b)[costs.length >> 1]}, the most turning round the car ${worst.max} (${worst.level}); the most ms ${Math.max(...costs.map(c => c.ms)).toFixed(2)}`);
    }
    if (gaps.length) console.log('  NO FADING OBSTRUCTION FOUND (nothing to show, or only big scenery / the land in the way): ' + gaps.join(', '));
  } catch (e) {
    check(false, 'the browser part ran: ' + e.message);
  } finally {
    try { socket?.close(); } catch { /* (gone) */ }
    child?.kill('SIGKILL');
    await server?.close();
    try { rmSync(own, { recursive: true, force: true }); } catch { /* (a file still held) */ }
  }
}
console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
