// IMPORT A CAR KIT SPEC INTO THE GAME'S MODEL CONVENTIONS (car-kit/, the outsourced car-modelling kit; CHECKLIST 481).
// A spec (car-kit/FORMAT.md: <id>.car.json, written by an agent with no access to the game) becomes a game model MODULE: the kit's
// builder (car-kit/engine/build.mjs, import-free) inlined with three.js from the game, the spec as data, and the tables the game keeps
// per model (lamps, plates, prop slots, decal zones) as data next to it. NOTHING IS WIRED IN: the module is written under
// car-kit/examples-imported/ (not under src/, imported by nothing, so not in the build, the bundle or the replay fingerprint).
// To make it a real car later: copy the module into src/delivery/render/, put `build` in MODELS (render/models.js) under a model name,
// add a cars.js / ideas.js row (ENTRY is a start: no stats), and the rows below into their tables (render/carlights*.js CAR_LAMPS,
// render/plateanchorstable.js, a render/propanchors/slice-*.json `hand` row, render/decalzonestable.js).
//
//   node scripts/import-carkit.mjs <spec.car.json> [--out <file.js>]
//        writes the module (default car-kit/examples-imported/<id>.model.js)
//   node scripts/import-carkit.mjs <spec.car.json> --verify [--compare <game car id>] [--still <file.png>] [--browser=<chrome>]
//        also builds the written module THROUGH THE GAME (its Vite loader, its three.js) and runs the game's own measures on it:
//        render/zfight.js findZFights, scripts/windscreen-audit.mjs auditModel (windscreen / rear window found as the cracks and the
//        editor find them), render/carsuspension.js prepareSuspension (wheels found and planted), render/wheelcosmetic.js findHubs,
//        render/glassnames.js window names, the prop / plate tags; --compare lists it beside a game car's model (triangles, meshes,
//        materials, box, mesh names); --still draws both with the game's own card framing (render/modelviews.js poseView, the
//        blueprint POSES of render/carstill.js, read here and handed to the page) in a browser through a Vite dev server (the page
//        car-kit/examples-imported/still.html), the game car built by MODELS (render/models.js), one row each, into one PNG.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = (k) => args.includes('--' + k);
const opt = (k) => { const i = args.indexOf('--' + k); if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1]; const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const file = args.find((a, i) => !a.startsWith('--') && !['--out', '--compare', '--still'].includes(args[i - 1]));
if (!file) { console.log('usage: node scripts/import-carkit.mjs <spec.car.json> [--out file.js] [--verify [--compare <car id>] [--still out.png]]'); process.exit(2); }

// ---- the spec, validated and built by the kit itself (its own three.js), for the tables -------------------------------------
const KIT = join(ROOT, 'car-kit');
const KTHREE = await import(pathToFileURL(join(KIT, 'engine/vendor/three.module.min.js')).href);
const { buildCar, mountFrames, KIT_VERSION } = await import(pathToFileURL(join(KIT, 'engine/build.mjs')).href);
const { validateSpec } = await import(pathToFileURL(join(KIT, 'engine/validate.mjs')).href);
const spec = JSON.parse(readFileSync(resolve(file), 'utf8'));
const { errors } = validateSpec(spec);
if (errors.length) { console.log('The spec has errors (car-kit/tools/check.mjs lists them all):\n  ' + errors.slice(0, 12).join('\n  ')); process.exit(1); }
const strip = (v) => JSON.parse(JSON.stringify(v, (k, x) => (k.startsWith('//') || k === 'note' ? undefined : x)));
const SPEC = strip(spec);
const kitModel = buildCar(KTHREE, SPEC, {});
kitModel.updateMatrixWorld(true);
const r3 = (v) => Math.round(v * 1000) / 1000;

// the hitbox the game would give it (cars.js hw / hl / height): the body's half width without wheels and mirrors, about 95% of the
// half length (the bumpers stand past the hitbox, as on the Junker: hl 2.5 on a 5.26 m model), the model's height
const bodyBox = new KTHREE.Box3(), allBox = new KTHREE.Box3().setFromObject(kitModel);
kitModel.traverse((n) => { if (n.isMesh && !n.userData.wheel && n.userData.tag !== 'mirror' && n.name !== 'mirror') bodyBox.expandByObject(n); });
const ENTRY = { id: SPEC.id, name: SPEC.name, model: 'carkit-' + SPEC.id, color: parseInt(SPEC.livery.good.body.slice(1), 16), evilColor: parseInt(SPEC.livery.evil.body.slice(1), 16),
  hw: r3((bodyBox.max.x - bodyBox.min.x) / 2), hl: r3((allBox.max.z - allBox.min.z) / 2 * 0.95), height: r3(allBox.max.y) };

// ---- the per-model tables, from the spec's mounts -----------------------------------------------------------------------------
// prop slots: the canonical bounds of render/propanchors.js PROP_BOUNDS (checked against the game's by --verify), scaled uniformly to
// the mount's free area and height; the shape's centre with its base on the surface (the generator's convention)
const PROP_BOUNDS = { roof: { box: [1.0, 0.5, 0.8], cylinder: { radius: 0.45, height: 0.5, axis: 'y' } }, cargo: { box: [1.0, 0.8, 1.2], cylinder: { radius: 0.5, height: 0.8, axis: 'y' } }, wing: { box: [1.4, 0.35, 0.3], cylinder: { radius: 0.15, height: 1.4, axis: 'x' } } };
const FROM = { roof: 'roof', cargo: 'deck', wing: 'deck-edge' };
const PROPS = {};
for (const slot of ['roof', 'cargo', 'wing']) {
  const m = SPEC.mounts[slot];
  if (!m || m.none) { PROPS[slot] = { no: m?.none || 'no area given' }; continue; }
  const [W, L] = m.size, H = m.height, [bw, bh, bd] = PROP_BOUNDS[slot].box, c = PROP_BOUNDS[slot].cylinder;
  const sb = Math.min(W / bw, L / bd, H / bh), lim = sb === W / bw ? 'w' : sb === L / bd ? 'd' : 'h';
  const sc = c.axis === 'x' ? Math.min(W / c.height, L / (2 * c.radius), H / (2 * c.radius)) : Math.min(W / (2 * c.radius), L / (2 * c.radius), H / c.height);
  const cylH = c.axis === 'x' ? 2 * c.radius : c.height;
  PROPS[slot] = { box: [r3(sb), r3(m.at[0]), r3(m.at[1] + bh * sb / 2), r3(m.at[2]), 0], cyl: [r3(sc), r3(m.at[0]), r3(m.at[1] + cylH * sc / 2), r3(m.at[2]), 0], from: FROM[slot], lim, conf: 'carkit' };
}
// plates: render/plateanchorstable.js [y, z, width, pitch degrees]
const plate = (m) => (!m || m.none ? null : [r3(m.at[1]), r3(m.at[2]), r3(m.size[0]), Math.round(Math.atan2((m.normal || [0, 0, 1])[1], Math.abs((m.normal || [0, 0, 1])[2])) * 180 / Math.PI)]);
const PLATES = { r: plate(SPEC.mounts['plate-rear']), f: plate(SPEC.mounts['plate-front']) };
// decal zones: render/decalzonestable.js rows [id, z0, z1, y0, y1, flat mm, curve deg], flank areas only (the game's decals are flank
// decals); an area on a bonnet, a roof or a tail is kept in DECALS_OTHER (the game has no decal for those surfaces yet)
const ZONE_IDS = ['door', 'quarter', 'fender', 'flank', 'bed'];
const DECALS = { L: [], R: 'L' }, DECALS_OTHER = [];
for (const f of mountFrames(SPEC).filter(f => f.kind === 'decal')) {
  const flank = Math.abs(f.n[0]) > 0.9 && Math.abs(f.u[2]) > 0.9;
  if (!flank) { DECALS_OTHER.push({ name: f.name, at: f.at.map(r3), normal: f.n.map(r3), u: f.u.map(r3), size: f.size.map(r3) }); continue; }
  if (f.side < 0 && (f.spec.side || 'both') === 'both') continue; // (the mirror twin: R: 'L')
  const id = ZONE_IDS.find(z => f.name.toLowerCase().includes(z)) || 'flank';
  const row = [id, r3(f.at[2] - f.size[0] / 2), r3(f.at[2] + f.size[0] / 2), r3(f.at[1] - f.size[1] / 2), r3(f.at[1] + f.size[1] / 2), Math.round(f.maxDepth * 1000), f.maxCurve];
  if ((f.spec.side || 'both') === 'right') { if (DECALS.R === 'L') DECALS.R = []; DECALS.R.push(row); } else DECALS.L.push(row);
}
const LAMPS = kitModel.userData.lamps;

// ---- the module ---------------------------------------------------------------------------------------------------------------
const engine = readFileSync(join(KIT, 'engine/build.mjs'), 'utf8').replace(/^export (const|function) /gm, '$1 ');
const src = relative(ROOT, resolve(file)).replace(/\\/g, '/');
const out = resolve(opt('out') || join(KIT, 'examples-imported', SPEC.id + '.model.js'));
const json = (v) => JSON.stringify(v);
const text = `// GENERATED by scripts/import-carkit.mjs from ${src} (${KIT_VERSION}): do not edit by hand; edit the spec and import it again.
// A game model module, NOT WIRED IN (nothing imports it: it is in no build, no bundle, no replay fingerprint). See the importer's header
// for how to make it a real car. build(car) returns the model as render/models.js builders do: front +z, userData.body (the paint),
// userData.animate(t) (wheels turn by the game's wheelTurn rule: rolled distance, still on show, else a fixed turn), userData.livery(evil),
// tyres and hubs as meshes of their own (render/carsuspension.js finds them), glass panes named and tagged (userData.window),
// props tagged (userData.prop), plates tagged (userData.plate).
/* eslint-disable */
import * as THREE from 'three';

// ---- the kit's builder (car-kit/engine/build.mjs, inlined) ----
${engine}
// ---- the car ----
export const SPEC = ${json(SPEC)};
// a cars.js row to start from (no stats: the kit does not model them), and the model name it would go under in MODELS
export const ENTRY = ${json(ENTRY)};
// the per-model tables: render/carlights.js CAR_LAMPS[model], render/plateanchorstable.js PLATE_TABLE[model], a hand row of
// render/propanchors (slots roof / cargo / wing), render/decalzonestable.js DECAL_ZONES[model]; DECALS_OTHER: areas the game has no decal for
export const LAMPS = ${json(LAMPS)};
export const PLATES = ${json(PLATES)};
export const PROPS = ${json(PROPS)};
export const DECALS = ${json(DECALS)};
export const DECALS_OTHER = ${json(DECALS_OTHER)};
// the game's wheel rule (render/models.js wheelTurn), copied so this module needs nothing of the game but three.js
const gameWheelTurn = (group, t, r) => (typeof group.userData.roll === 'number' ? group.userData.roll / r : group.userData.onShow ? 0 : t * 30);
export const build = (car = {}) => {
  const model = buildCar(THREE, SPEC, { wheelTurn: gameWheelTurn });
  if (car.color !== undefined) model.userData.body.material.color.setHex(car.color); // (as the game paints a model: its body's material)
  return model;
};
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log('wrote ' + relative(ROOT, out) + ' (' + (text.length / 1024).toFixed(1) + ' KB): model "' + ENTRY.model + '", hitbox hw ' + ENTRY.hw + ' hl ' + ENTRY.hl + ' height ' + ENTRY.height);
console.log('  lamps: ' + Object.entries(LAMPS).map(([k, v]) => v.length + ' ' + k).join(', ') + '; plates: ' + Object.entries(PLATES).filter(([, v]) => v).map(([k]) => k).join(' ') + '; props: ' + Object.entries(PROPS).map(([k, v]) => k + (v.no ? ' none' : ' s ' + v.box[0])).join(', ') + '; decal zones: ' + DECALS.L.length + (DECALS_OTHER.length ? ' (+' + DECALS_OTHER.length + ' not on a flank)' : ''));
if (!flag('verify')) process.exit(0);

// ---- --verify: the module built through the game, the game's own measures ------------------------------------------------------
const { startModels } = await import('./modelpatch-load.mjs');
const { load, close, server } = await startModels();
let failed = 0, GAME_POSES = null;
const say = (ok, what) => { if (!ok) failed++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const THREE = await import('three');
  const mod = await server.ssrLoadModule('/' + relative(ROOT, out).replace(/\\/g, '/'));
  const model = mod.build({ color: ENTRY.color });
  model.userData.onShow = true;
  model.userData.animate(0); model.updateMatrixWorld(true);
  const { findZFights } = await load('render/zfight.js');
  const { auditModel } = await import('./windscreen-audit.mjs');
  const MP = await load('render/modelpatch.js'), S = await load('render/screens.js'), G = await load('render/glassnames.js');
  const { prepareSuspension } = await load('render/carsuspension.js');
  const { findHubs } = await load('render/wheelcosmetic.js');
  const { PROP_BOUNDS: GAME_BOUNDS } = await load('render/propanchors.js');
  ({ POSES: GAME_POSES } = await load('render/carstill.js')); // (the blueprint cards' poses, for --still)
  console.log('\nthe imported ' + SPEC.id + ', built through the game (its Vite loader and three.js):');
  say(JSON.stringify(GAME_BOUNDS) === JSON.stringify(PROP_BOUNDS), 'the importer\'s prop bounds are the game\'s (render/propanchors.js PROP_BOUNDS)');
  const fights = findZFights(model), seen = fights.filter(f => !f.sameColour);
  say(!seen.length, 'render/zfight.js findZFights: ' + fights.length + ' pair(s), ' + seen.length + ' of different colours' + (seen.length ? ': ' + seen.slice(0, 5).map(f => f.a.name + ' / ' + f.b.name).join(', ') : ''));
  const a = auditModel(model, MP, S, G);
  say(a.ws.status === 'found', 'windscreen audit (as the cracks and the model editor find it): windscreen ' + a.ws.status + ' (' + (a.ws.name || '-') + ', tilt ' + a.ws.tiltDeg + ')' + (a.ws.reason ? ': ' + a.ws.reason : ''));
  const wantRear = SPEC.parts.some(p => p.tag === 'rear-window');
  say(!wantRear || a.rw.status === 'found' || a.rw.status === 'none', 'rear window ' + a.rw.status + ' (' + (a.rw.name || '-') + ')' + (a.rw.reason ? ': ' + a.rw.reason : '') + (a.rw.status === 'none' && wantRear ? ' (the audit calls it hidden behind the body: a cab window behind a load, as the game\'s pickups)' : ''));
  const sus = prepareSuspension(model);
  say(sus.wheels === (SPEC.wheels.reduce((n, w) => n + (w.mirror ? 2 : 1), 0)) && sus.how !== 'none', 'render/carsuspension.js: ' + sus.wheels + ' wheels found (' + sus.how + '), ' + sus.planted.length + ' parts held on the floor');
  const hubs = findHubs(model);
  say(hubs.tyres.length === sus.wheels && hubs.hubs.length >= sus.wheels, 'render/wheelcosmetic.js findHubs: ' + hubs.tyres.length + ' tyres, ' + hubs.hubs.length + ' hubs');
  const panes = [], props = [], plates = [];
  model.traverse((n) => { if (!n.isMesh) return; if (G.isWindowNode(n)) panes.push(n.name + (n.userData.window ? ' [' + n.userData.window + ']' : '')); if (n.userData.prop) props.push(n.name + ' [' + n.userData.prop + ']'); if (n.userData.plate) plates.push(n.name + ' [' + n.userData.plate + ']'); });
  say(panes.length >= 1, 'render/glassnames.js windows: ' + panes.join(', '));
  console.log('  info  props tagged: ' + (props.join(', ') || 'none') + '; plates tagged: ' + (plates.join(', ') || 'none'));
  const stats = (m) => { let tris = 0, meshes = 0; const mats = new Set(), names = []; m.updateMatrixWorld(true); m.traverseVisible(n => { if (!n.isMesh) return; meshes++; tris += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; [].concat(n.material).forEach(x => mats.add(x)); names.push(n.name || '(unnamed ' + (n.material.name || '#' + n.material.color?.getHexString()) + ')'); }); const b = new THREE.Box3().setFromObject(m, true), s = b.getSize(new THREE.Vector3()); return { tris, meshes, mats: mats.size, size: [s.x, s.y, s.z].map(r3), min: [b.min.x, b.min.y, b.min.z].map(r3), max: [b.max.x, b.max.y, b.max.z].map(r3), names }; };
  const mine = stats(model);
  console.log('  info  imported: ' + mine.tris + ' triangles, ' + mine.meshes + ' meshes, ' + mine.mats + ' materials, size W x H x L ' + mine.size.join(' x ') + ' m');
  const cmp = opt('compare');
  if (cmp) {
    const { makeShowCar } = await load('render/showcar.js');
    const { CARS } = await load('cars.js');
    const car = CARS.find(c => c.id === cmp);
    if (!car) say(false, 'no game car ' + cmp);
    else {
      const game = makeShowCar(car, { stock: true }); game.parent?.remove(game);
      game.userData.animate?.(0);
      const theirs = stats(game);
      console.log('\nbeside the game\'s own ' + cmp + ' (render/showcar.js makeShowCar, stock):');
      console.log('  ' + 'measure'.padEnd(14) + 'game'.padEnd(28) + 'imported from the kit');
      for (const [k, f] of [['triangles', s => s.tris], ['meshes', s => s.meshes], ['materials', s => s.mats], ['size WxHxL', s => s.size.join(' x ')], ['box min', s => s.min.join(', ')], ['box max', s => s.max.join(', ')]]) console.log('  ' + k.padEnd(14) + String(f(theirs)).padEnd(28) + f(mine));
      console.log('  hitbox (cars.js) hw ' + car.hw + ' hl ' + car.hl + ' height ' + car.height + '   |   ENTRY from the kit hw ' + ENTRY.hw + ' hl ' + ENTRY.hl + ' height ' + ENTRY.height);
      console.log('  mesh names, game:     ' + theirs.names.join(', '));
      console.log('  mesh names, imported: ' + mine.names.join(', '));
      const gfights = findZFights(game), ga = auditModel(game, MP, S, G), gs = prepareSuspension(game);
      console.log('  the game\'s own measures on its ' + cmp + ': zfight pairs ' + gfights.length + ' (' + gfights.filter(f => !f.sameColour).length + ' of different colours), windscreen ' + ga.ws.status + ' (' + (ga.ws.name || '-') + '), rear window ' + ga.rw.status + ' (' + (ga.rw.name || '-') + '), wheels ' + gs.wheels + ' (' + gs.how + ')');
    }
  }
} catch (e) { failed++; console.log('verify failed: ' + (e.stack || e)); }
await close();

// ---- --still: both drawn with the game's own card framing, in a browser through a Vite dev server --------------------------------
const still = opt('still');
if (still) {
  const { createServer } = await import('vite');
  const { launch } = await import(pathToFileURL(join(KIT, 'tools/lib/browser.mjs')).href);
  const { tmpdir } = await import('node:os');
  const dev = await createServer({ root: ROOT, configFile: false, logLevel: 'error', server: { port: 0, host: '127.0.0.1' }, optimizeDeps: { noDiscovery: true, include: [] }, cacheDir: join(tmpdir(), 'carkit-vite-' + process.pid) });
  await dev.listen();
  const base = dev.resolvedUrls.local[0];
  const browser = await launch(opt('browser'));
  try {
    const page = await browser.page(base + 'car-kit/examples-imported/still.html?model=' + encodeURIComponent('/' + relative(ROOT, out).replace(/\\/g, '/')) + (opt('compare') ? '&compare=' + opt('compare') : '') + '&poses=' + encodeURIComponent(JSON.stringify(GAME_POSES)), { width: 1500, height: 900 });
    let png = null;
    for (let i = 0; i < 300 && !png; i++) { await new Promise(r => setTimeout(r, 100)); png = await page.evaluate('window.stillPng || window.stillError || null').catch(() => null); }
    if (!png || !png.startsWith('data:')) { failed++; console.log('still failed: ' + (png || 'timed out')); }
    else { writeFileSync(resolve(still), Buffer.from(png.split(',')[1], 'base64')); console.log('\nstill (the game\'s poseView framing, its blueprint POSES): ' + resolve(still)); }
  } finally { browser.close(); await dev.close(); }
}
console.log(failed ? '\n' + failed + ' check(s) FAILED' : '\nverified: the game\'s own measures accept it');
process.exit(failed ? 1 : 0);
