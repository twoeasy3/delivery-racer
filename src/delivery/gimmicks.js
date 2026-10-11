// ============================================================================
// THE GIMMICKS (delivery/gimmicks.html): everything the levels throw at the player beyond the
// plain obstacles and the everyday traffic, each with a model (the game's own where it has one, or
// one made to stand for it), what it does, and the levels it turns up in. The numbers come from the
// game's CONFIG and the levels from the level files themselves, so the page stays true as they change.
// Only the catalogue is here (GROUPS): the page that shows all of it is gimmickspage.js, and the menu's
// "what's on this road" card shows a level's own (render/levelcard3d.js). Both draw the models the same
// way (render/modelviews.js).
// ============================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { LEVELS, HIDDEN_LEVELS, levelLabel } from './levels.js';
import { levelName } from './levelText.js';
import { nameOf, blurbOf, slug } from './words.js';
import { themedKind } from './themes.js';
import { LEVEL_CARS, amphibiousCars } from './cars.js';
import { MODELS, AMBULANCE_BOX } from './render/models.js';
import './render/trafficModels.js';
import './render/boatModels.js';
import './render/pursuitModels.js';
import { OBSTACLE_MODELS } from './render/obstacleModels.js';
import { makeElephant } from './render/elephantModel.js';
import { makeHippo } from './render/hippoModel.js';
import { makeMachine, BEACON_ON, BEACON_OFF } from './render/machineModels.js';
import { makeWorker } from './render/siteModels.js';
import { makeCarriage } from './render/trainModel.js';
import { makeAirliner, makeTower } from './render/airportModels.js';
import { makeTractorModel, makeUfo } from './render/carExtras.js';
import { makePillbox } from './render/battleModels.js';
import { makeWindsock, makeTransporter, makeHeightBar, makeDepthPost, makeCushion, makeShadeTree } from './render/gambleModels.js';
import { makeAreaPatch, makeInfection } from './render/radiationModels.js';

const kmh = (ms) => Math.round(ms * 3.6) + ' km/h';
const pct = (x) => Math.round(x * 100) + '%';
const range = (r, unit = '') => `${r.min}–${r.max}${unit}`;
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const mesh = (geometry, material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); return m; };
const box = (w, h, d, material, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
const group = (...parts) => { const g = new THREE.Group(); if (parts.length) g.add(...parts); return g; }; // (an empty one too: add() with nothing to add logs an error, as the bullet train's sleepers = group() did)
const ob = (kind, o = {}) => OBSTACLE_MODELS[kind](o);
// the sizes the Drifting junk card builds its models at (the kinds that drift on some level; the themes' own take no size)
const JUNK = { umbrella: { hw: 1.2, hl: 1.2, height: 3 }, surfboard: { hw: 0.6, hl: 0.25, height: 2.6 }, cooler: { hw: 0.8, hl: 0.6, height: 1.2 }, chair: { hw: 1, hl: 1, height: 3.4 },
  wreck: { hw: 1, hl: 2.1, height: 1.4 }, bale: { hw: 1.1, hl: 1.1, height: 1.5 }, crate: { hw: 0.6, hl: 0.6, height: 1.1 }, cone: {}, barrow: {}, trolley: {}, rock: { r: 1 },
  toyBlock: {}, skittle: {}, divingHelmet: {}, supplyPod: {}, directorChair: {}, cameraDolly: {}, mooringPosts: {}, fuelDrum: {}, popcornCart: {}, barrel: {}, chairStack: {}, riceBasket: {}, wasteDrum: {}, present: {}, hawkerCart: {}, bagStack: {},
  toyDrum: {}, cafeTable: {}, wheelieBin: {}, snowdrift: {}, sackStack: {}, beachBall: {}, tumbleweed: {}, flagStand: {}, brimstone: {}, lavaRock: { r: 1 } };
// ...and what each is called, several of them, in the card's line about a level's own
const JUNK_NAMES = { umbrella: 'beach umbrellas', surfboard: 'surfboards', cooler: 'ice boxes', chair: 'lifeguard chairs', wreck: 'wrecked cars', bale: 'hay bales', crate: 'crates',
  cone: 'cones', barrow: 'wheelbarrows', trolley: 'shopping trolleys', rock: 'rocks', toyBlock: 'alphabet blocks', skittle: 'skittles', divingHelmet: 'diving helmets', supplyPod: 'supply pods',
  directorChair: 'director\'s chairs', cameraDolly: 'camera dollies', mooringPosts: 'mooring posts', fuelDrum: 'fuel drums', popcornCart: 'popcorn carts', barrel: 'barrels',
  chairStack: 'stacks of chairs', riceBasket: 'baskets of rice', wasteDrum: 'drums of waste', present: 'presents', toyDrum: 'toy drums', cafeTable: 'cafe tables', wheelieBin: 'wheelie bins', snowdrift: 'heaps of snow',
  sackStack: 'stacks of sacks', hawkerCart: 'hawkers\' carts', bagStack: 'heaps of bags', beachBall: 'beach balls', tumbleweed: 'tumbleweeds', flagStand: 'flags on stands', brimstone: 'spikes of brimstone', lavaRock: 'lava boulders', mine: 'sea mines' };
// the kinds that drift on a level (not the darting ones: those are another card), as its theme has them
const driftingKinds = (level) => [...new Set((level.drifters || []).filter(d => d.pattern !== 'dart').map(d => themedKind(level.theme, d.kind || 'cone', true)))].filter(k => JUNK[k]);
// ...and the kinds that dart about on it (a placed obstacle with drift: 'dart', or drifters of that pattern)
const dartingKinds = (level) => [...new Set([...(level.obstacles || []).filter(o => o.drift === 'dart').map(o => themedKind(level.theme, o.kind || 'barrier')),
  ...(level.drifters || []).filter(d => d.pattern === 'dart').map(d => themedKind(level.theme, d.kind || 'cone', true))])].filter(k => k === 'mine' || JUNK[k]);
const listed = (words) => words.length > 1 ? words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1] : words[0];
const vehicle = (kind, color) => MODELS[CONFIG.vehicles[kind].model]({ ...CONFIG.vehicles[kind], color });
// a car's model painted (its body's material is its paint)
const painted = (model, color) => { model.userData.body.material.color.setHex(color); return model; };
// a length of road, `l` m long and `w` wide, with dashed lane lines: the stage most of the models stand on
const road = (w = 9, l = 12, color = 0x3b3e44) => {
  const g = group(box(w, 0.1, l, lambert(color), 0, -0.05, 0));
  for (let z = -l / 2 + 1; z < l / 2; z += 4) for (const x of [-w / 4, w / 4]) g.add(box(0.15, 0.02, 2, glow(0xe8e8e8), x, 0.01, z));
  return g;
};
// a sign on a post: text on a coloured board (a canvas texture)
const sign = (text, bg, fg = '#fff', w = 3.2, h = 1.4) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = Math.round(256 * h / w);
  const c = canvas.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = fg; c.lineWidth = 8; c.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  c.fillStyle = fg; c.font = `bold ${Math.round(canvas.height * 0.5)}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const board = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }), 0, 3.4, 0);
  return group(box(0.15, 3, 0.15, lambert(0x8a8f96), 0, 1.5, -0.05), board);
};
// where the levels are: every level (on the menu) that has it, by its number and name; and the test
// level, Gimmick Road (off the menu: ?hidden=gimmick-road), where the newest are tried out first
export const where = (has) => [...LEVELS.map((level, i) => has(level) ? `<span>${levelLabel(i)}</span> ${levelName(level)}` : null),
  has(HIDDEN_LEVELS['gimmick-road']) ? '<span>Test</span> Gimmick Road (?hidden=gimmick-road)' : null,
  has(HIDDEN_LEVELS['gimmick-road-2']) ? '<span>Test</span> Gimmick Road 2 (?hidden=gimmick-road-2)' : null,
  has(HIDDEN_LEVELS['gimmick-road-3']) ? '<span>Test</span> Gimmick Road 3 (?hidden=gimmick-road-3)' : null].filter(Boolean);

// ---- every gimmick, by group ---------------------------------------------------------------------
// { name, has: (level) => bool (the levels it is in), rules: [...], build: (level?) => { model, tick?(t, dt) },
//   line: (level) => the card's line on that level's own road card, if not rules[0] (null: rules[0]),
//   color (its card's glow) }
const S = CONFIG.site, MA = CONFIG.machinery, W = CONFIG.wreckage, BT = CONFIG.bulletTrain, TI = CONFIG.tide, IC = CONFIG.ice;
const H = { school: CONFIG.schoolCrossing, main: CONFIG.waterMain, balloon: CONFIG.balloon, bridge: CONFIG.drawbridge, load: CONFIG.wideLoad, run: CONFIG.marathon, herd: CONFIG.stampede }; // (Gimmick Road 2's)
const T = CONFIG.tunnel, PA = CONFIG.parade, RB = CONFIG.roadblock, CG = CONFIG.cargo, IS = CONFIG.iceCream, RL = CONFIG.reversible, CV = CONFIG.convoy, RN = CONFIG.rubberneck; // (the city streets')
const RD = CONFIG.radiation; // (the fallout's: radiation.js)
const GB = { wind: CONFIG.crosswind, crest: CONFIG.crest, ramp: CONFIG.jamRamp, board: CONFIG.washboard, bar: CONFIG.lowBridge, ford: CONFIG.ford, cushion: CONFIG.cushion, shade: CONFIG.shade, rut: CONFIG.rut, tar: CONFIG.tarmac, spray: CONFIG.spray, sun: CONFIG.lowSun, dust: CONFIG.dust }; // (Gimmick Road 3's: the road gambles)
const D = CONFIG.drifters, GF = CONFIG.gunfire, DB = CONFIG.driveBy, PU = CONFIG.puncture, RV = CONFIG.rival, RC = CONFIG.race;
export const GROUPS = [
  { name: 'The road itself', cards: [
    { name: 'Side roads', color: 0x2e8b4a, has: (l) => l.exits?.length, rules: [
      'An exit lane opens beside the right-hand lane: take it, and the side road runs on beside the expressway and joins it again further up.',
      'Traffic takes it too, and it can be a way round a jam (or into one).',
      'No two need be alike: one runs straight, another swings far out or winds through a string of bends; some are one-way, others have traffic coming at you in the other lane.',
      'Speed cameras, level crossings, potholes and the rest can stand on a side road too, so the way round has troubles of its own.',
    ], build: () => {
      const g = road(9, 14);
      const ramp = box(4, 0.1, 10, lambert(0x3b3e44), 6.2, 0.1, 2);
      ramp.rotation.y = -0.25;
      const exit = sign('EXIT ↗', '#1f6b3a', '#fff', 3.6, 1.3);
      exit.position.set(8.4, 0, -3);
      g.add(ramp, exit);
      return { model: g };
    } },
    { name: 'Crossroads', color: 0x5cf6ff, has: (l) => l.junctions?.length, rules: [
      'The road turns a corner at a crossroads (or runs straight through one). The arms you can\'t take are closed off with glowing chevrons.',
      `At a turn, ${pct(CONFIG.junction.forward)} of the traffic going your way carries straight on; at a crossing, ${pct(CONFIG.junction.turnOff)} of the outside lane turns off.`,
      'While a car is leaving across the box, everyone else waits at its edge.',
    ], build: () => {
      const g = group(box(9, 0.1, 22, lambert(0x3b3e44), 0, -0.05, 0), box(22, 0.09, 9, lambert(0x3b3e44), 0, -0.04, 0));
      for (let k = -3; k <= 3; k++) g.add(box(0.7, 0.02, 2.4, glow(0xf2f2f2), k * 1.2, 0.02, 6)); // a zebra crossing
      const chevrons = mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshBasicMaterial({ color: 0x5cf6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, 2, -9);
      g.add(chevrons);
      return { model: g, tick: (t) => { chevrons.material.opacity = 0.35 + Math.sin(t * 5) * 0.2; } };
    } },
    { name: 'Lanes closing', color: 0xff8a1a, has: (l) => l.narrows?.length, rules: [
      'The outer lanes close: each side of the road drops to fewer lanes for a stretch, and everyone has to squeeze in.',
      'Calm good drivers signal and merge early; evil and angry ones barge in at the last moment.',
    ], build: () => {
      // as it is in the game: no cones and no board; the outer lane's edge eases in over the stretch (the
      // taper is a smoothstep, CONFIG.taper long) until the lane is gone, its line running on as the road's edge
      const g = group(), ease = (u) => { const k = Math.max(0, Math.min(1, u)); return k * k * (3 - 2 * k); };
      const edgeX = (z) => 4.5 - 3 * ease((z + 5) / 10); // (the right-hand edge: x = 4.5 at first, 1.5 at the end)
      const ribbon = (xa, xb, y, material) => { // (the strip between two x(z) curves, along the whole 14 m)
        const pos = [], idx = [], N = 28;
        for (let k = 0; k <= N; k++) { const z = -7 + 14 * k / N; pos.push(xa(z), y, z, xb(z), y, z); if (k) { const i = (k - 1) * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); } }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return new THREE.Mesh(geo, material);
      };
      const asphalt = lambert(0x3b3e44, { side: THREE.DoubleSide }), verge = lambert(0x4f7d3f, { side: THREE.DoubleSide }), line = new THREE.MeshBasicMaterial({ color: 0xe8e8e8, side: THREE.DoubleSide });
      g.add(ribbon(() => -4.5, edgeX, 0, asphalt), ribbon(edgeX, () => 7.5, -0.02, verge));
      g.add(ribbon(() => -4.5, () => -4.35, 0.01, line), ribbon((z) => edgeX(z) - 0.15, edgeX, 0.01, line)); // (the edge lines)
      for (let z = -6; z < 7; z += 4) { g.add(box(0.15, 0.02, 2, line, -1.5, 0.01, z)); if (z < -4) g.add(box(0.15, 0.02, 2, line, 1.5, 0.01, z)); } // (the lane lines, and the closing lane's)
      return { model: g };
    } },
    { name: 'Bridges', color: 0x9c4a3a, has: (l) => l.bridges?.length, rules: [
      'A bridge has no shoulder: its steel stands right beside the outer lanes.',
      'Arrive at one on the shoulder and you drive into the end of its structure: wrecked, there and then. Even a ghost can\'t pass through it.',
    ], build: () => {
      const g = group(mesh(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), lambert(0x2f6f9f), 0, -4, 0), box(10, 0.6, 16, lambert(0x8d9096), 0, -0.3, 0));
      const steel = lambert(0x9c4a3a);
      for (const x of [-5, 5]) {
        g.add(box(0.4, 0.4, 16, steel, x, 4, 0));
        for (let z = -8; z <= 8; z += 4) {
          g.add(box(0.35, 4, 0.35, steel, x, 2, z));
          if (z < 8) { const d = box(0.25, 5.6, 0.25, steel, x, 2, z + 2); d.rotation.x = 0.78 * (z % 8 === 0 ? 1 : -1); g.add(d); }
        }
      }
      for (let z = -8; z <= 8; z += 4) g.add(box(10, 0.3, 0.3, steel, 0, 4, z));
      return { model: g };
    } },
    { name: 'Ice', color: 0xbfe6f7, has: (l) => l.ice?.length, rules: [
      `On ice your brakes work at ${pct(IC.brakeGrip)} and your steering at ${pct(IC.steerGrip)} of their grip, you cross the road at ${pct(IC.laneSpeed)} of your speed, and the car slews round as it hits it.`,
      'In a bend it understeers: it slides to the outside, the more so the faster, heavier and clumsier it is.',
      `Traffic hitting it may spin out and blow up: the faster, the likelier (${pct(IC.spinPerSpeed)} for every m/s).`,
    ], build: () => {
      const g = road(9, 12);
      const sheet = mesh(new THREE.PlaneGeometry(4.2, 8).rotateX(-Math.PI / 2), lambert(0xd6eef8, { transparent: true, opacity: 0.75 }), -2.2, 0.03, 0);
      g.add(sheet);
      for (let k = 0; k < 3; k++) { const st = box(0.12, 0.01, 3 + k, glow(0xffffff), -3 + k * 0.8, 0.05, k - 1); st.rotation.y = 0.3; g.add(st); }
      return { model: g, tick: (t) => { sheet.material.opacity = 0.65 + Math.sin(t * 3) * 0.1; } };
    } },
    { name: 'Mud', color: 0x7a5a38, has: (l) => l.mud?.length, rules: [
      'The road gives way to mud. It slows a car as a railway track does, by how well the car crosses rough ground: a nimble sports car worst of all.',
      `You steer with ${pct(CONFIG.mud.steerGrip)} of your grip, and traffic in it crawls along at ${pct(CONFIG.mud.trafficPace)} of its pace.`,
    ], build: () => {
      const g = group(box(9, 0.1, 12, lambert(0x5e4630), 0, -0.05, 0));
      for (const x of [-3, -1.2, 1.2, 3]) g.add(box(0.5, 0.02, 12, lambert(0x4a3622), x, 0.01, 0));
      for (const [x, z, r] of [[-2, 2, 1.2], [2.4, -3, 0.9], [0.4, -0.5, 0.7]]) g.add(mesh(new THREE.CircleGeometry(r, 18).rotateX(-Math.PI / 2), lambert(0x6b6a55), x, 0.03, z));
      return { model: g };
    } },
    { name: 'The tide', color: 0x4f8fb3, has: (l) => l.tide, rules: [
      'The sea comes in over your side of the road, a little further as the clock runs down. Every so often a wave is warned of, floods right across, then drains away and leaves the road bare for a while.',
      `In the water you are slowed (worse the worse your car wades) and steer with ${pct(TI.steerGrip)} grip; in deep water you take up to ${TI.damage} damage a second.`,
      'Good drivers move out of the water\'s way; evil ones plough on through. Waves leave pickups behind in the shallows.',
    ], build: () => {
      const g = road(9, 14);
      const water = mesh(new THREE.PlaneGeometry(5, 14).rotateX(-Math.PI / 2), lambert(0x2e6c8f, { transparent: true, opacity: 0.85 }), 2.7, 0.12, 0);
      const foam = box(0.5, 0.06, 14, glow(0xf2fafd), 0.3, 0.14, 0);
      const gauge = group(box(0.2, 3, 0.2, lambert(0xf6f6f2), 0, 1.5, 0), ...[0.5, 1.5, 2.5].map(y => box(0.22, 0.5, 0.22, lambert(0xd2302a), 0, y, 0)));
      gauge.position.set(5.2, 0, -3);
      g.add(water, foam, gauge);
      return { model: g, tick: (t) => { const reach = 2.7 - (Math.sin(t * 0.8) + 1) * 1.6; water.position.x = reach; foam.position.x = reach - 2.4; } };
    } },
    { name: 'The bullet train', color: 0x1f4fa8, has: (l) => l.railway, rules: [
      `A railway down the middle of the road slows any car crossing it, down to ${pct(CONFIG.railCrossing.slowest)} of its top speed for the worst at crossing.`,
      `Then the bullet train: it appears up the line and comes straight down it at ${kmh(BT.speed)}, about ${BT.warning} s after you're warned. It destroys everything it touches, you included (unless you're a ghost).`,
      `While it is about, the shoulder's police meter runs down at ${pct(BT.dangerMercy)} speed. It can also turn up in your lane as a mystery.`,
    ], build: () => {
      // (full size, filling the card: it stands where it is, and the sleepers run by under it)
      const g = group(box(5, 0.1, 28, lambert(0x6f6a60), 0, -0.05, 0)), sleepers = group();
      for (let z = -12.6; z <= 12.6; z += 1.2) sleepers.add(box(3.2, 0.12, 0.35, lambert(0x5a4636), 0, 0.03, z));
      for (const x of [-0.75, 0.75]) g.add(box(0.12, 0.15, 28, lambert(0x9aa1ab), x, 0.15, 0));
      const train = makeCarriage(true, true);
      train.visible = true;
      g.add(sleepers, train);
      g.rotation.y = Math.PI / 2;
      return { model: group(g), tick: (t) => { sleepers.position.z = 0.6 - ((t * 5) % 1.2); } };
    } },
  ] },
  { name: 'Wildlife', cards: [
    { name: 'The giant frog', color: 0x3fa34a, has: (l) => l.frogs?.length, rules: [
      `A huge frog roams a stretch of road, hopping up to ${CONFIG.frogHopMax} m at a time (${CONFIG.frogHopHeight} m up), anywhere across it. You'll hear it croak first.`,
      `Hit it and it bursts: ${CONFIG.obstacleKinds.frog.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.frog.speedKept)} of your speed. Over it while it's in the air, you're fine.`,
    ], build: () => {
      const frog = ob('frog');
      return { model: frog, tick: (t) => { const u = (t * 0.8) % 1; frog.position.y = u < 0.6 ? Math.sin(u / 0.6 * Math.PI) * 1.2 : 0; } };
    } },
    { name: 'Cows', color: 0xf2f2ee, has: (l) => l.herds?.some(h => (h.kind || 'cow') === 'cow'), rules: [
      `A herd wanders back and forth across the road at ${CONFIG.cowSpeed} m/s, stopping a moment at each side.`,
      `Hit one: ${CONFIG.obstacleKinds.cow.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.cow.speedKept)} of your speed.`,
    ], build: () => ({ model: ob('cow') }) },
    { name: 'Kangaroos', color: 0xc08a50, has: (l) => l.herds?.some(h => h.kind === 'kangaroo'), rules: [
      `Kangaroos bound across the road at ${CONFIG.kangarooSpeed} m/s, hopping ${CONFIG.kangarooHop} m high, with a warning sign before their stretch.`,
      `Hit one: ${CONFIG.obstacleKinds.kangaroo.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.kangaroo.speedKept)} of your speed.`,
    ], build: () => {
      const roo = ob('kangaroo');
      return { model: roo, tick: (t) => { roo.position.y = Math.abs(Math.sin(t * CONFIG.kangarooHops * Math.PI)) * CONFIG.kangarooHop; } };
    } },
    { name: 'Drop bears', color: 0x8a8f96, has: (l) => l.dropBears?.length, rules: [
      `They wait up in the gum trees, ${CONFIG.dropBear.height} m over the road, and drop when you come within ${range(CONFIG.dropBear.near, ' m')} (a different distance for each), plus what you cover while they fall: the faster you go, the earlier they let go. Down, they stay down.`,
      `Hit one: ${CONFIG.obstacleKinds.dropBear.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.dropBear.speedKept)} of your speed.`,
    ], build: () => {
      const bear = ob('dropBear');
      return { model: bear, tick: (t) => { const u = (t * 0.45) % 1; bear.position.y = u < 0.4 ? 3 * (1 - (u / 0.4) ** 2) : 0; } };
    } },
    { name: 'The great migration', color: 0xd9a441, has: (l) => l.migration?.length, rules: [
      `A great herd of wildebeest and zebra streams across the road, all one way, at ${range(CONFIG.migration.speed, ' m/s')} each, and round again.`,
      `Each one is an obstacle: ${CONFIG.obstacleKinds.wildebeest.damage} damage a time. Look for the gaps.`,
    ], build: () => {
      const w = ob('wildebeest'), z = ob('zebra');
      w.position.x = -1.4; z.position.set(1.4, 0, 1);
      return { model: group(w, z) };
    } },
    { name: 'Elephants', color: 0x8a8784, has: (l) => l.elephants?.length, rules: [
      `Elephants plod across the road and back at ${CONFIG.elephant.speed} m/s, resting a while in the grass at each side.`,
      'Whatever one walks into is destroyed outright: traffic, obstacles, and your car (unless you are a ghost).',
    ], build: () => {
      const e = makeElephant(), { ears } = e.userData;
      return { model: e, tick: (t) => { if (ears) ears.forEach?.((ear, i) => { ear.rotation.y = (i ? -1 : 1) * Math.sin(t * 3) * 0.3; }); } };
    } },
    { name: 'Hippos', color: 0x7d6a72, has: (l) => l.hippos?.length, rules: [
      `A river runs beside the road, and every so often a hippo surfaces and charges across at ${CONFIG.hippo.speed} m/s, aimed at where you'll be.`,
      'Whatever it touches is destroyed, you included (unless you are a ghost), and it carries on into the grass.',
    ], build: () => {
      const h = makeHippo(), { jaw } = h.userData;
      return { model: h, tick: (t) => { jaw.rotation.x = 0.1 + Math.max(0, Math.sin(t * 2)) * 0.55; } };
    } },
  ] },
  { name: 'On the move', cards: [
    { name: 'Drifting junk', color: 0xe8c547, has: (l) => l.drifters?.some(d => d.pattern !== 'dart'), rules: [
      'Obstacles that won\'t keep still: a hurricane\'s beach junk (umbrellas, surfboards, coolers, lifeguard chairs, wrecks) or hay bales, moving about the road in circles, figures of eight, sweeps across and zigzags along it.',
      `Each wobbles off its pattern a little (${pct(D.wobble)}), so no two move quite alike. They hit like any obstacle of their kind.`,
    ], // (on a level's own card: the things that drift on that level, as its theme has them, in its line and its picture)
    line: (level) => { const own = driftingKinds(level); return own.length ? `Obstacles that won't keep still: ${listed(own.map(k => JUNK_NAMES[k]))}, moving about the road in circles, figures of eight, sweeps across and zigzags along it.` : null; },
    build: (level) => {
      const own = level ? driftingKinds(level).slice(0, 3) : [];
      const junk = (own.length ? own : ['umbrella', 'surfboard', 'cooler']).map(k => ob(k, JUNK[k]));
      const g = group(...junk);
      return { model: g, tick: (t) => {
        junk.forEach((m, i) => { const a = t * 0.9 + i * 2.1; m.position.set(Math.cos(a) * 2.6, 0, Math.sin(a) * 1.6); m.rotation.y = -a; });
      } };
    } },
    { name: 'Darting mines', color: 0xe0e0e0, has: (l) => l.obstacles?.some(o => o.drift === 'dart') || l.drifters?.some(d => d.pattern === 'dart'), rules: [
      `Sea mines that won't stay put: each sits ${range(D.dartRest, ' s')}, shivers for ${D.dartShiver} s (the only warning), then darts off at ${range(D.dartSpeed, ' m/s')}, up to ${D.dartAlong} m along and ${D.dartAcross} m across from its spot. Differently every run.`,
      `Hit one: ${CONFIG.obstacleKinds.mine.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.mine.speedKept)} of your speed.`,
    ], // (on a level's own card: what darts on that level, if not sea mines, in its line and its picture)
    line: (level) => { const own = dartingKinds(level); return own.length && own[0] !== 'mine' ? `${listed(own.map(k => JUNK_NAMES[k])).replace(/^./, c => c.toUpperCase())} that won't stay put: each sits ${range(D.dartRest, ' s')}, shivers for ${D.dartShiver} s (the only warning), then darts off somewhere else. Differently every run.` : null; },
    build: (level) => {
      const own = level ? dartingKinds(level)[0] : null, m = own ? ob(own, JUNK[own]) : ob('mine');
      return { model: m, tick: (t) => {
        const from = Math.floor(t / 2.4) % 2 ? 1.6 : -1.6, u = t % 2.4;
        m.position.x = u < 1.5 ? from : u < 1.5 + D.dartShiver ? from + Math.sin(t * 70) * 0.1 : from - 2 * from * Math.min(1, (u - 1.5 - D.dartShiver) / 0.4);
      } };
    } },
    { name: 'The storm', color: 0x7f97b0, has: (l) => l.storm, rules: [
      'A hurricane hurls cars through the air above the road, tumbling end over end.',
      'Only a sight: nothing can hit them, and they never come down on you.',
    ], build: () => {
      const car = painted(vehicle('junker', 0xffffff), 0x8a9a6a), spinner = group(car); // (turning about its middle)
      car.position.y = -CONFIG.vehicles.junker.height / 2;
      return { model: spinner, tick: (t, dt) => { spinner.rotation.x += dt * 1.7; spinner.rotation.z += dt * 1.1; spinner.rotation.y += dt * 0.6; } };
    } },
    { name: 'Asteroid fields', color: 0x8d8174, has: (l) => l.asteroidFields?.length, rules: [
      'Rocks of every size scattered over space. About half sit at the road\'s level; the rest pass just over or under it, unmarked, so you can\'t always tell which.',
      `Some drift across the road or bob up and down through it. A hit costs ${CONFIG.obstacleKinds.asteroid.damage} damage for every metre of the rock, up to ${CONFIG.obstacleKinds.asteroid.maxDamage}.`,
    ], build: () => {
      const a = ob('asteroid', { r: 1.6, hw: 1.4, hl: 1.4, height: 3.2 });
      return { model: a, tick: (t, dt) => { a.rotation.x += dt * 0.5; a.position.y = Math.sin(t * 0.9) * 0.4; } };
    } },
    { name: 'Dancing portaloos', color: 0x2f7fd8, has: (l) => l.potties?.length, rules: [
      `Rows of portaloos across the road, dancing in step: hopping (${CONFIG.potties.hop} m up, high enough to drive under), in a wave, sliding ${CONFIG.potties.slide} m to and fro, shuffling, stomping a lane over, or spinning round the row's middle.`,
      `Hit one and it bursts open: ${CONFIG.obstacleKinds.potty.damage} damage.`,
    ], build: () => {
      const row = [0, 1, 2].map(k => { const p = ob('potty'); p.position.x = (k - 1) * 2.6; return p; });
      return { model: group(...row), tick: (t) => { row.forEach((p, k) => { const u = ((t / CONFIG.potties.period - k * 0.18) % 1 + 1) % 1; p.position.y = Math.sin(u * Math.PI) * 2.2; }); } };
    } },
  ] },
  { name: 'Construction site and airport', cards: [
    { name: 'Construction machinery', color: 0xf2b51c, has: (l) => l.machinery?.length, rules: [
      `Bulldozers, excavators and dump trucks trundle right across the road and back at ${MA.speed} m/s, waiting a moment off it at each side; road rollers crawl along the shoulder and forklifts back out onto it.`,
      `They're solid: running into one costs ${MA.damage} damage (${MA.damages.roller} for a roller, ${MA.damages.forklift} for a forklift) and you keep ${pct(MA.speedKept)} of your speed (it's blown up). Traffic passes through them.`,
    ], build: () => {
      const m = makeMachine('bulldozer');
      return { model: m, tick: (t) => { if (m.userData.beacon) m.userData.beacon.material = Math.floor(t * 4) % 2 ? BEACON_ON : BEACON_OFF; } };
    } },
    { name: 'Trenches', color: 0x8a6a45, has: (l) => l.siteWorks?.some(w => w.kind === 'trench'), rules: [
      `The shoulder is dug up into a deep trench, with a ${S.plateLength} m steel plate laid across it every ${S.plateEvery} m and open gaps between.`,
      `Drive along it and every gap a wheel drops into is a jolt: ${S.trenchDamage} damage, and you keep ${pct(S.trenchKept)} of your speed. Over and over, for as long as you stay on it. Each jolt is a ${pct(S.trenchPuncture)} chance of a flat tyre.`,
      'The lanes themselves are untouched: it is the price of using that shoulder.',
    ], build: () => {
      const g = road(7, 13);
      g.add(box(3.4, 0.1, 13, lambert(0x8a7a5c), 5.2, -0.05, 0));                       // the shoulder's dirt,
      g.add(box(2.4, 0.04, 13, lambert(0x17130f), 5, 0.02, 0));                         // the pit in it, dark and deep,
      for (let z = -6.5; z < 6.5; z += S.plateEvery) g.add(box(2.7, 0.08, S.plateLength, lambert(0x6f757c), 5, 0.06, z + S.plateLength / 2)); // its plates,
      for (const z of [-4.5, 0.5, 5]) {                                             // and the spoil heaped beside it
        const heap = mesh(new THREE.ConeGeometry(1, 1.1, 7), lambert(0x7a5a38), 7.4, 0.5, z);
        heap.scale.z = 1.6;
        g.add(heap);
      }
      for (const z of [-6, 0, 6]) { const c = ob('cone'); c.position.set(3.6, 0, z); g.add(c); }
      return { model: g };
    } },
    { name: 'Site works', color: 0xff8a1a, has: (l) => l.siteWorks?.some(w => w.kind !== 'trench'), rules: [
      `Long-reach excavators swing their buckets out over the road every ${S.swingPeriod} s (${S.bucketDamage} damage); workers push barrows along it and dive clear when you come too close; pipes roll off their stacks across the road (${CONFIG.obstacleKinds.pipe.damage} damage).`,
    ], build: () => {
      const worker = makeWorker(), barrow = ob('barrow'), pipe = ob('pipe');
      barrow.position.z = 1.1;
      pipe.position.set(2.6, 0, -1);
      return { model: group(worker, barrow, pipe) };
    } },
    { name: 'Falling wreckage', color: 0xff5a2a, has: (l) => l.wreckage?.some(e => e.kind !== 'blast' && e.kind !== 'boulders'), rules: [
      'Scripted destruction as you come near: tankers, containers and hangars go up beside the road, a plane falls out of the sky, an airliner comes in to land and slides across the lanes.',
      'Whatever its wreckage lands on is wrecked, and it blocks those lanes for good; traffic pulls over for it. (A building blowing out is a Blast: its own card.)',
    ], build: () => ({ model: makeAirliner(14, 30, true) }) },
    { name: 'Quarries', color: 0xb9a37c, has: (l) => l.quarries?.length, rules: [
      `A quarry is cut into the hillside beside the road: ${CONFIG.quarry.benches} benches, each ${CONFIG.quarry.benchHeight} m high and ${CONFIG.quarry.benchDepth} m deep, with the works on its floor.`,
      'Its face is scenery until a level blasts it (see Blasts) or sends boulders off it (see Boulders).',
    ], build: () => {
      const g = road(9, 14), rock = lambert(0xb9a37c), dark = lambert(0x8f7c5c), Q = CONFIG.quarry;
      for (let k = 0; k < Q.benches; k++) g.add(box(3, 1.5, 14, k % 2 ? dark : rock, 7.5 + k * 3, 0.75 + k * 1.5, 0));
      return { model: g, spin: false };
    } },
    { name: 'Blasts', color: 0xe0642a, has: (l) => l.wreckage?.some(e => e.kind === 'blast'), rules: [
      `Now and then a building beside the road, or a crag of a quarry's face, is blasted out across the road. Its red box flashes for ${W.blastWarn} s first, then fire (or rock and dust) sweeps over the lanes in ${W.blastTime} s: whatever is in the box is wrecked, you included.`,
      'It is timed to your pace, not to a spot: keep up and you are just short of it as it goes; ease off, or be through it already. The road is left clear afterwards.',
    ], build: () => {
      const g = road(9, 14), rock = lambert(0xb9a37c), dark = lambert(0x8f7c5c);
      for (let k = 0; k < 2; k++) g.add(box(3, 1.5, 14, k % 2 ? dark : rock, 7.5 + k * 3, 0.75 + k * 1.5, 0));
      const boxMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      const warn = mesh(new THREE.PlaneGeometry(9, 5).rotateX(-Math.PI / 2), boxMat, 0, 0.06, -1);
      const dust = [0, 1, 2, 3].map(k => mesh(new THREE.SphereGeometry(1.1, 10, 8), lambert(0xcbb894, { transparent: true, opacity: 0.8 }), 0, 1, -1 + (k % 2 ? 1 : -1)));
      g.add(warn, ...dust);
      return { model: g, tick: (t) => {
        const u = t % 4;
        warn.visible = u < 2 && Math.floor(t * 6) % 2 === 0;
        dust.forEach((d, k) => { const v = (u - 2 - k * 0.1) / 1.2; d.visible = v > 0 && v < 1; d.position.x = 6 - v * 10; d.scale.setScalar(0.6 + v * 1.6); d.material.opacity = 0.8 * (1 - v); });
      } };
    } },
    { name: 'Boulders', color: 0x8d8272, has: (l) => l.wreckage?.some(e => e.kind === 'boulders'), rules: [
      `As you come near, boulders come down off the face and thud onto the road, about ${W.flight} s after they start to fall. No fire: just rock.`,
      'Whatever they land on is wrecked, and the lanes they land in are blocked for good. One lane is always left open: traffic pulls over for it, and so must you.',
    ], build: () => {
      const g = road(9, 12), rocks = [[1.5, -2.6, 0], [1.1, -0.9, 1.6], [1.3, -1.2, -1.8], [0.8, 0.3, -0.4]].map(([r, x, z]) => { const rock = ob('rock', { r }); rock.position.set(x, 0, z); g.add(rock); return rock; });
      return { model: g, tick: (t) => rocks.forEach((rock, k) => { rock.position.y = Math.max(0, 7 - ((t * 5 + k * 1.5) % 14)); }) };
    } },
    { name: 'The control tower', color: 0xd3cfc5, has: (l) => l.tower, rules: [
      'The airport\'s control tower stands beside the old road where the route turns off, and as you come up to it, it comes crashing down across that road.',
      'Only a sight (it falls across the road you don\'t take). The airport also has its runway, and airliners parked beside it.',
    ], build: () => { const t = makeTower(); t.scale.setScalar(0.16); return { model: t }; } },
  ] },
  { name: 'The Hood', cards: [
    { name: 'Gang houses', color: 0xff2a2a, has: (l) => l.gunfire?.length, rules: [
      `In the gangs' turf, ${pct(GF.gangShare)} of the houses are theirs, marked out for all to see: black, their windows glowing red, a red tag, and a red flag flying from the roof.`,
      `Each fires out across the road from its windows, only within ${Math.round(GF.arc * 180 / Math.PI)}° of straight out, at whatever is passing through that arc within ${GF.range} m, picked at random: ${range(GF.shots)} shots, then a wait of ${range(GF.every, ' s')}.`,
      `A bullet does ${GF.damage} damage and stops in the first thing in its way, so a car between you and the house is a shield. Each hit has a ${pct(GF.puncture)} chance of a puncture.`,
    ], build: () => {
      const black = lambert(0x1c1a1f), red = glow(0xff2a2a), g = new THREE.Group();
      g.add(box(8, 4, 7, black, 0, 2, 0));
      const roof = mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), lambert(0x4a423c), 0, 5.1, 0);
      roof.scale.set(9, 2.2, 8);
      g.add(roof);
      for (const x of [-2.2, 2.2]) g.add(box(1.7, 1.2, 0.1, red, x, 1.8, 3.55));
      g.add(box(1.1, 2.2, 0.1, lambert(0xc81e1e), 0, 1.1, 3.56), box(6, 0.8, 0.06, lambert(0xe01818), 0, 3.2, 3.58));
      const flag = box(2.2, 1.4, 0.06, lambert(0xe31b1b), 1.1, 9.5, 0);
      g.add(box(0.14, 5, 0.14, lambert(0x2a2a2a), 0, 7.6, 0), flag, mesh(new THREE.SphereGeometry(0.3, 10, 8), glow(0xff3030), 0, 10.3, 0));
      const flash = mesh(new THREE.SphereGeometry(0.3, 8, 6), glow(0xfff3b0), 2.2, 1.8, 3.8);
      g.add(flash);
      return { model: g, tick: (t) => { flag.rotation.y = Math.sin(t * 4) * 0.25; flash.visible = (t % 1.6) < 0.5 && Math.floor(t * 20) % 2 === 0; } };
    } },
    { name: 'Drive-bys', color: 0xa05ad0, has: (l) => l.traffic?.driveby || l.trafficZones?.some(z => z.traffic.driveby), rules: [
      `A long, low sedan, always evil. Every ${range(DB.every, ' s')} near you it picks a target (you, more often than not, or a car near you), pulls up in the lane beside it and fires ${DB.shots} shots out of the window.`,
      `Then it makes its getaway for good at ${DB.fleePace} times its pace, pushing through the traffic, until it's gone. If it can't get alongside within ${DB.giveUp} s, it gives up.`,
    ], build: () => {
      const car = painted(vehicle('driveby', 0xffffff), 0x3a1840);
      return { model: car, tick: (t) => { car.userData.firing?.(t % 2.4 < 1.1); } };
    } },
    { name: 'Punctures', color: 0xffb03a, has: (l) => l.gunfire?.length || l.traffic?.driveby || (l.battle && l.pillboxes) || l.potholes?.length || l.siteWorks?.some(w => w.kind === 'trench'), rules: [
      `A tyre can be punctured by a shot (a gang house's, a drive-by's, a pillbox's: ${pct(GF.puncture)} a hit), by a pothole (${pct(S.potholePuncture)} a jolt) or by a gap in a trench (${pct(S.trenchPuncture)} a jolt), on the side that took it. Traffic with a flat pulls over onto the shoulder and stops. You get ${pct(PU.topSpeed)} of your top speed and acceleration, and the car pulls to the flat side.`,
      `Stop to change it: ${PU.fixTime} s stopped in all (braking with a flat takes you right down to a stop). A wrench fixes it on the spot.`,
      `While punctured, and for ${PU.grace} s after, the shoulder's police meter leaves you alone. Armour keeps your tyres from being punctured at all; a ghost lets the bullets pass straight through (and carries over potholes and trenches); nothing without wheels can be punctured.`,
    ], build: () => {
      const car = painted(vehicle('commuter', 0xffffff), 0xff8a1a);
      car.rotation.z = 0.07;
      const hiss = mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), -1, 0.3, 1.1);
      return { model: group(car, hiss), tick: (t) => { const u = (t * 1.5) % 1; hiss.position.set(-1 - u * 0.8, 0.3 + u * 0.5, 1.1); hiss.material.opacity = 0.6 * (1 - u); hiss.scale.setScalar(0.6 + u * 1.5); } };
    } },
    { name: 'Police stretches', color: 0x2f5fd8, has: (l) => !(l.traffic?.police > 0) && l.trafficZones?.some(z => z.traffic.police > 0), rules: [
      'Police only in some stretches of the level: heavy there, and none at all in the rest (the gangs\' turf).',
      'A police car that comes to the edge of its stretch stays there, parked on the shoulder with its lights going.',
    ], build: () => {
      const car = painted(vehicle('police', 0xffffff), 0xf5f5f5), v = CONFIG.vehicles.police;
      const red = box(0.6, 0.22, 0.35, glow(0xff2a2a), -0.33, v.height + 0.1, -0.15), blue = box(0.6, 0.22, 0.35, glow(0x2a6bff), 0.33, v.height + 0.1, -0.15);
      return { model: group(car, red, blue), tick: (t) => { const on = Math.floor(t * 6) % 2 === 0; red.visible = on; blue.visible = !on; } };
    } },
  ] },
  { name: 'Races and rivals', cards: [
    { name: 'Races', color: 0xd8262b, has: (l) => l.laps, rules: [
      'Laps of a real circuit against a full grid, in F1 cars, GT cars or Le Mans prototypes (the Race cars button on the menu). The slowest start at the front.',
      `Tuck in behind a car (within ${RC.towReach} m) for its slipstream: up to ${pct(RC.draft)} more top speed. Pull out of it and the slingshot carries you on past, the longer the faster the tow had you going.`,
      `A prototype is as quick as an F1 car and much tougher (${LEVEL_CARS.lmp.health} health to its ${LEVEL_CARS.f1.health}); a GT car is slower, and tougher than the F1 too (${LEVEL_CARS.gt.health}).`,
      'Every car understeers in the bends, the walls hurt when you slide into them, and steering into a car\'s side knocks it aside.',
    ], build: () => {
      const f1 = MODELS.f1({ ...LEVEL_CARS.f1 }), gt = MODELS.gt({ ...LEVEL_CARS.gt }), lmp = MODELS.lmp({ ...LEVEL_CARS.lmp });
      f1.position.x = -2.6; gt.position.set(2.6, 0, -1.5); lmp.position.z = 1.2;
      painted(gt, 0x0f4d2c);
      return { model: group(f1, gt, lmp) };
    } },
    { name: 'Rival couriers', color: 0xff2bd6, has: (l) => l.rival, rules: [
      'Up to three other couriers racing you to the drop, each marked with a glowing arrow, and an arrow at the foot of the screen when one is behind you. Each one there first takes its share of your tip.',
      `They're tough (${RV.health} health, no spin-outs), quicker when they've fallen behind, steer round obstacles and grab pickups (yours stay where they are), and win their scrapes with traffic, ramming whatever holds them up.`,
      `They'll use the shoulder and the oncoming lane to get by, but not with the police within ${RV.policeRange} m. An evil one throws packages at you; no package can hit them.`,
    ], build: () => {
      const car = MODELS.miata({ ...CONFIG.vehicles.miata, color: 0x4b1a7a });
      car.userData.stripe?.(0x9dff1f);
      const arrow = group(mesh(new THREE.ConeGeometry(0.5, 0.75, 4).rotateX(Math.PI), glow(0x9dff1f), 0, 0.375, 0), box(0.28, 0.6, 0.28, glow(0x9dff1f), 0, 1.05, 0));
      return { model: group(car, arrow), tick: (t) => { arrow.position.y = CONFIG.vehicles.miata.height + CONFIG.rivalMark.above + Math.sin(t * 3) * 0.15; arrow.rotation.y = t * 1.4; } };
    } },
  ] },
  { name: 'Vehicles', cards: [
    { name: 'Emergency vehicles', color: 0xd8262b, has: (l) => l.emergencies, rules: [
      `Now and then an ambulance comes through at ${kmh(CONFIG.emergency.speed)}, siren going, either way. One coming up behind you is announced.`,
      `Get out of its lane: whatever it closes up behind has ${CONFIG.emergency.giveWay} s to get clear, or is arrested (for you, a bust). Most traffic gives way; a few evil drivers won't. Packages pass over it.`,
    ], build: () => {
      const v = CONFIG.vehicles.ambulance, car = vehicle('ambulance', 0xffffff);
      const z = v.hl * AMBULANCE_BOX - 0.25, y = v.height + 0.16;
      const red = box(0.62, 0.22, 0.35, glow(0xff2a2a), -0.34, y, z), white = box(0.62, 0.22, 0.35, glow(0xffffff), 0.34, y, z);
      const mount = box(1.5, 0.12, 0.6, lambert(0x15171c), 0, v.height + 0.05, z); // (dark, so the white lamp shows on the white roof)
      return { model: group(car, mount, red, white), tick: (t) => { const on = Math.floor(t * 6) % 2 === 0; red.visible = on; white.visible = !on; } };
    } },
    { name: 'Police pursuit', color: 0x2060ff, has: (l) => l.pursuits, rules: [
      `Now and then a chase already under way comes through from behind, its siren heard from ${CONFIG.pursuit.heard} m: a getaway car flat out, weaving through the traffic, and ${CONFIG.pursuit.gap} m behind it an interceptor, a police car seen nowhere else.`,
      'Traffic pulls aside for the siren, as it does for an ambulance. Move over and the two go by and away up the road; get in the way and it is a collision like any other.',
    ], build: () => {
      const cop = vehicle('interceptor', CONFIG.vehicles.interceptor.livery), getaway = vehicle('getaway', CONFIG.vehicles.getaway.livery);
      cop.position.set(-0.6, 0, -3); getaway.position.set(0.6, 0, 3);
      return { model: group(cop, getaway), tick: (t) => { cop.userData.animate(t); getaway.userData.animate(t); getaway.rotation.y = Math.sin(t * 2) * 0.08; } };
    } },
    { name: 'Wrong-way drivers', color: 0xffd23f, has: (l) => !l.flow && l.exits?.some(x => !x.flyovers && x.oncoming !== false), rules: [
      'A side road with oncoming traffic and no flyover has nowhere to send it: where its lane meets the expressway, a car carries straight on into your right-hand lane, coming at you.',
      `You are warned ${CONFIG.wrongWay.warn} m out; it flashes its headlights and hazards and leans on its horn all the way in. It keeps to its lane, swerving only for something stopped in front of it within ${CONFIG.wrongWay.swerve} m.`,
      'Meeting it is a head-on: both wrecked. Traffic going your way moves over a lane for it, or stops if it can\'t.',
    ], build: () => {
      const g = road(9, 16), v = CONFIG.vehicles.commuter;
      const wrong = painted(vehicle('commuter', 0xffffff), 0x24242b), right = painted(vehicle('commuter', 0xffffff), 0x4fc3f7);
      wrong.position.set(2.2, 0, -3); wrong.rotation.y = Math.PI;
      right.position.set(-2.2, 0, 4);
      // (its lamps are the car's own, in the car's own terms: on its nose, local +z, whichever way it is turned.
      // Placed in the card's terms they sat at -3 + hl: the tail of a car turned round to come at you)
      const lamps = [-1, 1].map(side => box(v.hw * 0.8, 0.45, 0.1, glow(0xffffff), side * v.hw * 0.6, 0.7, v.hl + 0.1));
      const amber = [-1, 1].map(side => box(0.2, 0.16, 0.1, glow(0xffa21a), side * (v.hw - 0.08), 0.7, v.hl + 0.12));
      wrong.add(...lamps, ...amber);
      g.add(wrong, right);
      return { model: g, tick: (t) => { const on = Math.floor(t * 7) % 2 === 0, blink = Math.floor(t * 3) % 2 === 0; lamps.forEach(l => { l.visible = on; }); amber.forEach(a => { a.visible = blink; }); } };
    } },
    { name: 'Traffic with quirks', color: 0xff9ec4, has: (l) => ['icecream', 'binlorry', 'learner', 'boyracer', 'caravan'].some(k => l.traffic?.[k] || l.trafficZones?.some(z => z.traffic[k])), rules: [
      `The ice cream van potters along at ${pct(CONFIG.vehicles.icecream.speed)} of the traffic's pace, playing its tune. The bin lorry pulls up where it is every ${range(CONFIG.vehicles.binlorry.stops.every, ' s')}, for ${range(CONFIG.vehicles.binlorry.stops.time, ' s')}, hazards on.`,
      `The learner is slow, dabs the brakes for no reason and drifts about its lane. The caravan sways up to ${CONFIG.vehicles.caravan.sway} m behind its car.`,
      `The boy racer is ${pct(CONFIG.vehicles.boyracer.speed - 1)} faster than the traffic and sits on your bumper until it finds a way by. None of the others is ever evil.`,
    ], build: () => {
      const g = road(13, 30), kinds = ['icecream', 'binlorry', 'learner', 'boyracer', 'caravan'], colors = [0xff9ec4, 0x2f8a4a, 0xf4f4f4, 0x7a1fa8, 0x4fc3f7];
      const models = kinds.map((kind, k) => { const m = vehicle(kind, colors[k]); m.position.set((k % 2 ? 2.6 : -2.6), 0, 11 - k * 5.5); g.add(m); return m; });
      return { model: g, tick: (t) => models.forEach(m => m.userData.animate(t)) };
    } },
    { name: 'Tractors', color: 0x2e8b3d, has: (l) => l.tractors?.length, rules: [
      `Slow farm traffic at ${CONFIG.tractorSpeed} m/s. Each waits where it is until you come near, then sets off.`,
      'On a narrow road the queue behind one is only passed on the wrong side of the road.',
    ], build: () => ({ model: makeTractorModel() }) },
    { name: 'The UFO', color: 0x66f0ff, has: (l) => l.car === 'ufo', rules: [
      `On its level you fly a flying saucer instead of your car: ${kmh(LEVEL_CARS.ufo.maxSpeed)} top speed, very quick off the mark and nimble.`,
    ], build: () => {
      const ufo = makeUfo();
      return { model: ufo, tick: (t, dt) => { ufo.userData.lamps.rotation.y += dt * 4; ufo.position.y = Math.sin(t * 2) * 0.15; } };
    } },
    // (water stages: a level's "water", see water.js. The model: a slipway into a channel, an amphibious car afloat)
    { name: 'Water stages', color: 0x2a7f9c, has: (l) => l.water?.length, rules: [
      `The road runs down a slipway into a channel of water as wide as the road, and back up one at the far end. The lanes carry on as lanes, marked by buoys. Only an amphibious car floats: these levels start in nothing else (the garage's Amphibious section has ${amphibiousCars().length}, one at each star level).`,
      `Nothing stops you at the water's edge: drive in at speed. Afloat the car keeps ${pct(CONFIG.water.topSpeed)} of its top speed and ${pct(CONFIG.water.brake)} of its brakes, and its steering takes slowly, so it slides on like a boat. A reach can have a current that carries you sideways all the way across.`,
      `Traffic that can't float pulls onto its own shoulder and queues short of the slipway, at most ${CONFIG.water.queue.most} a side, so every lane stays open. Amphibious traffic drives in and out with you. There is no shoulder to be busted on while you are afloat.`,
    ], build: () => {
      const car = amphibiousCars().find(c => c.id === 'toybota') || amphibiousCars()[0];
      const model = MODELS[car.model]({ ...car }), K = CONFIG.water.colours;
      model.position.set(1.6, CONFIG.water.surface - (car.draft ?? CONFIG.water.draft), -1.5);
      const g = group(box(9, 0.1, 5, lambert(0x3b3e44), 0, -0.05, 6.5), box(9, 0.12, 2.4, lambert(K.slip), 0, -0.02, 2.8), model,
        mesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), lambert(K.deep), 0, CONFIG.water.surface, -2.9));
      for (let k = 0; k < 6; k++) g.add(box(9, 0.03, 0.12, lambert(K.rib), 0, 0.05, 1.8 + k * 0.4));           // the slipway's ribs
      const buoys = [-2.25, 0, 2.25].flatMap(x => [-0.5, -4.5].map(z => mesh(new THREE.ConeGeometry(0.28, 0.75, 8), lambert(x ? 0xf4f1e6 : 0xf2c418), x, CONFIG.water.surface + 0.3, z)));
      g.add(...buoys);
      return { model: g, tick: (t) => { model.userData.animate?.(t); model.rotation.z = Math.sin(t * 2.4) * CONFIG.water.bob.roll; model.position.y = CONFIG.water.surface - (car.draft ?? CONFIG.water.draft) + Math.sin(t * 3) * CONFIG.water.bob.height; } };
    } },
    { name: 'Boats', color: 0x1f6f5c, has: (l) => l.water?.length && Object.keys(l.traffic || {}).some(k => CONFIG.vehicles[k]?.boat), rules: [
      `The traffic of a water stage: dinghies (${range(CONFIG.vehicles.dinghy.cruise, ' m/s')}), ferries (${range(CONFIG.vehicles.ferry.cruise, ' m/s')}), barges (${range(CONFIG.vehicles.barge.cruise, ' m/s')}, ${CONFIG.vehicles.barge.hl * 2} m long) and pedal boats (${range(CONFIG.vehicles.pedalo.cruise, ' m/s')}). They keep to the lanes as cars do, both ways on a two-way road, and are hit like cars: all of them are slower than you.`,
      `A boat under way drags a wake: for ${CONFIG.water.wake.length} m astern of it the water shoves your car sideways off the boat's line, hardest close in. Pass wide, or steer into it and hold your lane.`,
      'A boat never leaves the water: at the end of its reach it ties up at the bank, out of the lanes. In a narrow channel a barge is slipped round on the bank side, where the water is as good as any lane.',
    ], build: () => {
      const sea = mesh(new THREE.PlaneGeometry(15, 26).rotateX(-Math.PI / 2), lambert(CONFIG.water.colours.deep), 0, 0, 0);
      const kinds = ['barge', 'ferry', 'dinghy', 'pedalo'], colors = [0x3a4a5e, 0x1f6f5c, 0xff9f43, 0xf2c418], spots = [[-3.6, -2], [3.4, 4], [3.2, -7.5], [-3.4, 9.5]];
      const models = kinds.map((kind, k) => { const m = vehicle(kind, colors[k]); m.position.set(spots[k][0], 0, spots[k][1]); return m; });
      return { model: group(sea, ...models), tick: (t) => models.forEach((m, k) => { m.userData.animate(t); m.position.y = Math.sin(t * 2.6 + k * 1.7) * 0.05; }) };
    } },
    { name: 'The jetboat', color: 0xe8432e, has: (l) => l.car === 'jetboat', rules: [
      `On its level you drive a jetboat across open water: ${kmh(LEVEL_CARS.jetboat.maxSpeed)} top speed, nimble, bobbing on the chop. The way through is marked by breakwaters and buoys.`,
    ], build: () => {
      const boat = MODELS.jetboat({ ...LEVEL_CARS.jetboat });
      const sea = mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), lambert(0x1d7a96), 0, 0.15, 0);
      return { model: group(sea, boat), tick: (t) => boat.userData.animate?.(t) };
    } },
  ] },
  { name: 'The Battlefield', cards: [
    { name: 'Two armies', color: 0x3f7a2e, has: (l) => l.battle, rules: [
      'Every lane runs both ways: your army (green) comes up the road from behind you and on by, the enemy (red) comes slowly down every lane at you.',
      `Jeeps, 8x8s and tanks. Each goes after the other army: 8x8s and tanks turn their guns on the nearest enemy within ${CONFIG.battle.reach} m (the green army's on any red within ${CONFIG.battle.goodFire.reach} m, even behind), jeeps lob packages.`,
      'Each kind in its own shade: jeeps light, 8x8s mid, tanks dark.',
      `A red vehicle that gets ${CONFIG.battle.evilBehind} m past you blows up, so it never thins out the green army coming up behind.`,
      `They steer for head-ons with an enemy they beat (a tank beats an 8x8, an 8x8 a jeep), which tries to dodge ${pct(CONFIG.battle.dodge)} of the time. The winner loses ${pct(CONFIG.battle.win)} of its health; anything else (a jeep and a tank, two of a kind) wrecks both.`,
    ], build: () => {
      const g = road(13, 26), B = CONFIG.battle;
      // (green's three, and red's coming the other way: each kind in its own shade)
      const army = [['jeep', 'good', -3.6, 5], ['apc', 'good', -3.6, -2], ['armytank', 'good', -3.6, -9], ['jeep', 'evil', 3.6, -6], ['apc', 'evil', 3.6, 1], ['armytank', 'evil', 3.6, 8]].map(([model, side, x, z], k) => {
        const kind = ['jeep', 'apc', 'tank'][k % 3], color = B.colors[side][kind];
        const m = MODELS[model]({ ...CONFIG.vehicles[kind], color });
        m.position.set(x, 0, z);
        if (side === 'evil') m.rotation.y = Math.PI;
        g.add(m);
        return m;
      });
      return { model: g, tick: (t) => army.forEach((m, k) => m.userData.aim?.(Math.sin(t * 0.8 + k) * 0.8)) };
    } },
    { name: 'Your 8x8', color: 0x2a5420, has: (l) => l.car === 'apc', rules: [
      `On the Battlefield you drive an 8x8, always in the green army: ${LEVEL_CARS.apc.health} health, heavy and slow to get going, its tyres run flat.`,
      `The throw button fires its small gun (every ${LEVEL_CARS.apc.cannon.cooldown} s) at the nearest red vehicle within ${LEVEL_CARS.apc.cannon.range} m, as a package is aimed, never at your own side; its turret turns to whatever it would fire at; with none in reach, dead ahead. A red jeep takes one shell, an 8x8 two, a tank four (tanks take no critical hits). A blast can break a tank's track: it grinds to a halt where it is, its gun still firing. Enemy shells cost you ${CONFIG.battle.shellOnPlayer.direct} on a direct hit.`,
      `Big Splash: ${CONFIG.bigSplash.gun.damage}x your shells' damage, and their blast reaches ${CONFIG.bigSplash.gun.splash}x as far, catching the enemies about your target.`,
      'You beat a jeep head-on (at half your health); a tank beats you; another 8x8 takes you both out.',
    ], build: () => {
      const m = MODELS.apc({ ...LEVEL_CARS.apc });
      return { model: m };
    } },
    { name: 'Landmines', color: 0xff2a1a, has: (l) => l.landmines?.length, rules: [
      `Mines scattered down the lanes, each with a red light flashing on top. Each lies buried until you are ${CONFIG.battle.mineRise.ahead} m off, then pops up out of the dirt.`,
      '<strong>Touch one and you are destroyed outright</strong>, whatever you are driving (a ghost passes over), and the mine is gone. The traffic pays them no heed, and goes up the same way.',
      'Shells and blasts never set one off: only driving onto it.',
    ], build: () => {
      const g = road(9, 12), mines = [[-2, 3], [2, -1], [-1.5, -4]].map(([x, z]) => { const m = ob('landmine'); m.position.set(x, 0, z); g.add(m); return m; });
      return { model: g, lift: 0.7, tick: (t) => mines.forEach((m, k) => {
        const lit = ((t / CONFIG.battle.mineFlash.period + k * 0.33) % 1) < CONFIG.battle.mineFlash.on;
        m.userData.light.color.setHex(lit ? 0xff2a1a : 0x3a0e0a);
        m.userData.halo.material.opacity = lit ? 0.55 : 0;
      }) };
    } },
    { name: 'Pillboxes', color: 0x9a2a22, has: (l) => l.pillboxes, rules: [
      `Concrete pillboxes beside the road every ${CONFIG.battle.pillboxEvery} m, each side's in its colour, firing bursts at the other army as it passes (as the gang houses do in The Hood). The red ones fire at you.`,
    ], build: () => {
      const g = road(9, 10);
      const red = makePillbox(-1), green = makePillbox(1);
      red.position.set(-7.5, 0, -1);
      red.rotation.y = Math.PI / 2;
      green.position.set(7.5, 0, 2);
      green.rotation.y = -Math.PI / 2;
      g.add(red, green);
      return { model: g };
    } },
  ] },
  { name: 'Gimmick Road', cards: [
    { name: 'Speed cameras', color: 0xf2c21c, has: (l) => l.cameras?.length, rules: [
      `A camera on its pole, on the shoulder or on the centre line, with a speed limit sign ${CONFIG.speedCamera.signAhead} m before it. You are warned of each ${CONFIG.speedCamera.warn} m out. Pass it over its limit (${CONFIG.speedCamera.limit} km/h unless it says otherwise) and the screen flashes white.`,
      `The first time in a run is a <strong>fine</strong>, taken off what you bank, by how far over you were: ${CONFIG.speedCamera.fines.map((f, i, all) => `$${f.fine}${i < all.length - 1 ? ` up to ${all[i + 1].over} km/h over` : ` beyond that`}`).join(', ')}. Every one after that is a <strong>bust</strong>.`,
      'Run it over and there is no offence (just the knock); the sign is only a knock. A radar detector keeps you from being caught at all, but you are still warned.',
    ], build: () => {
      const g = road(9, 12), cam = ob('camera', { height: 4.2 });
      cam.position.set(0, 0, 0);
      cam.rotation.y = Math.PI;
      g.add(cam);
      const sign = ob('limitSign', { height: 3, limit: CONFIG.speedCamera.limit });
      sign.position.set(-3, 0, 4);
      sign.rotation.y = Math.PI;
      g.add(sign);
      return { model: g, tick: (t) => cam.userData.lamp.color.setHex(t % 2 < 0.2 ? 0xffffff : 0x555a60) };
    } },
    { name: 'Funeral processions', color: 0x8a8a9a, has: (l) => l.processions, rules: [
      `Now and then a hearse and ${CONFIG.procession.cars} cars in black, nose to tail in one lane at ${kmh(CONFIG.procession.speed)}, either way. They keep their lane and never throw.`,
      `Crash into any of them and the whole procession is furious with you, and for ${CONFIG.procession.jerkTime} s everyone on the road treats you as a jerk (as the Jerk mystery does), whatever mystery effect was running.`,
    ], build: () => {
      const g = road(5, 26);
      const cars = ['hearse', ...CONFIG.procession.kinds.slice(0, CONFIG.procession.cars)];
      let z = 9;
      for (const kind of cars) {
        const car = kind === 'hearse' ? vehicle('hearse', 0x151515) : painted(vehicle(kind, CONFIG.procession.paint), CONFIG.procession.paint);
        car.position.set(1.2, 0, z);
        g.add(car);
        z -= CONFIG.vehicles[kind].hl + 2.8 + CONFIG.procession.gap;
      }
      return { model: g };
    } },
    { name: 'Level crossings', color: 0xd8262b, has: (l) => l.crossings?.length, rules: [
      `It is timed to you: at the speed you are going, the train reaches the road between ${-CONFIG.crossing.timing.min} s before you would and ${CONFIG.crossing.timing.max} s after. The lights flash and the bell rings; the booms come down over ${CONFIG.crossing.lower} s, and ${CONFIG.crossing.warn} s on, a short train shoots across at ${kmh(CONFIG.crossing.speed)}, seen coming from ${CONFIG.crossing.reach} m down the line.`,
      'Traffic waits at the booms. Anything on the line as the train goes by is wrecked, you included (unless you are a ghost).',
      `You can't stop, so ease off and arrive after it, or beat it across. A boom down is only a knock (${CONFIG.crossing.boomDamage} damage, no slowing), and it breaks.`,
      `The train is ${CONFIG.crossing.cars} carriages, ${CONFIG.crossing.cars * CONFIG.crossing.carLength} m: the bullet train's, cut down, or in the Wild West a steam train of the same length.`,
    ], build: () => {
      const g = road(9, 12);
      const line = group(box(16, 0.06, 2.8, lambert(0x5b544c), 0, 0.02, 0), box(16, 0.12, 0.1, lambert(0x9aa0a6), 0, 0.1, -0.75), box(16, 0.12, 0.1, lambert(0x9aa0a6), 0, 0.1, 0.75));
      g.add(line);
      const lamps = [glow(0x3a1210), glow(0x3a1210)];
      const post = group(box(0.16, 3.6, 0.16, lambert(0x8a9096), 0, 1.8, 0), box(1.2, 0.45, 0.08, lambert(0x1b1d22), 0, 2.5, 0),
        mesh(new THREE.CircleGeometry(0.17, 14), lamps[0], -0.35, 2.5, 0.05), mesh(new THREE.CircleGeometry(0.17, 14), lamps[1], 0.35, 2.5, 0.05));
      for (const r of [0.6, -0.6]) { const x = box(1.5, 0.22, 0.06, lambert(0xf4f4f4), 0, 3.3, 0); x.rotation.z = r; post.add(x); }
      post.position.set(5, 0, 4);
      const swing = new THREE.Group();
      for (let k = 0; k < 5; k++) swing.add(box(1, 0.14, 0.14, lambert(k % 2 ? 0xf4f4f4 : 0xd8262b), -k - 0.5, 0, 0));
      const pivot = group(swing);
      pivot.position.set(4.6, 1.1, 3.6);
      g.add(post, pivot);
      return { model: g, tick: (t) => {
        const phase = Math.floor(t * 2.5) % 2;
        lamps.forEach((lamp, i) => lamp.color.setHex(i === phase ? 0xff2a1a : 0x3a1210));
        swing.rotation.z = -Math.max(0, Math.sin(t * 0.8)) * Math.PI / 2 * 0.95;
      } };
    } },
    { name: 'Stop / go roadworks', color: 0x2e9b3d, has: (l) => l.stopGo?.length, rules: [
      'On a road of one lane each way, the oncoming side is dug up, so both ways take turns through the one lane left: yours.',
      `A worker at each end turns a STOP / GO sign: ${CONFIG.stopGo.go} s of GO each way, with ${CONFIG.stopGo.clear} s between for the last through to clear. Traffic waits at its STOP; an evil driver may run it.`,
      "Hold the brake to wait at the STOP, or chance it and meet whatever is coming the other way down your lane.",
    ], build: () => {
      const g = road(7, 12);
      g.add(box(3.2, 0.04, 12, lambert(0x3a2a1c), -1.8, 0.02, 0));
      for (let z = -5.5; z <= 5.5; z += 2.2) { const c = ob('cone'); c.position.set(-0.2, 0, z); g.add(c); }
      const worker = makeWorker();
      worker.position.set(4.3, 0, 3);
      const face = mesh(new THREE.CircleGeometry(0.62, 20), glow(0xd8262b), 0.35, 2.85, 0.24);
      worker.add(box(0.06, 1.9, 0.06, lambert(0x8a9096), 0.35, 1.6, 0.2), face);
      g.add(worker);
      return { model: g, tick: (t) => face.material.color.setHex(t % 6 < 3 ? 0xd8262b : 0x2e9b3d) };
    } },
    { name: 'Fog banks', color: 0xc4c9ce, has: (l) => l.fog?.length, rules: [
      `The fog closes right in round you: you can see only ${CONFIG.fog.far} m or so, easing in and out over ${CONFIG.fog.edge} m at each end.`,
      `The police see you from only ${pct(CONFIG.fog.policeSight)} as far as usual: the shoulder is easier to get away with. But everything else turns up late too.`,
    ], build: () => {
      const g = road(9, 14);
      for (const [x, z, r] of [[-3, -3, 2.2], [2.5, -1, 2.6], [0, 3, 2.4], [-2, 1, 1.8], [3, 4, 1.6]]) {
        g.add(mesh(new THREE.SphereGeometry(r, 12, 8), lambert(0xdfe3e6, { transparent: true, opacity: 0.55 }), x, r * 0.5, z));
      }
      return { model: g };
    } },
    { name: 'Potholes', color: 0x55504a, has: (l) => l.potholes?.length, rules: [
      `Ragged holes in the lanes. A wheel dropping into one is a jolt: ${S.potholeDamage} damage, and you keep ${pct(S.potholeKept)} of your speed.`,
      `Each one is a ${pct(S.potholePuncture)} chance of a flat tyre on the side that hit it.`,
    ], build: () => {
      const g = road(9, 12);
      for (const [x, z, r] of [[2.2, -2, 1], [-2, 3, 0.8], [2.6, 3.5, 0.6]]) {
        const rim = mesh(new THREE.CircleGeometry(r * 1.4, 9).rotateX(-Math.PI / 2), lambert(0x4d4a46), x, 0.02, z);
        const hole = mesh(new THREE.CircleGeometry(r, 7).rotateX(-Math.PI / 2), lambert(0x15120f), x, 0.03, z);
        g.add(rim, hole);
        for (let k = 0; k < 4; k++) { const chunk = box(0.2, 0.1, 0.25, lambert(0x3a3b3f), x + Math.cos(k * 1.7) * r * 1.7, 0.05, z + Math.sin(k * 1.7) * r * 1.7); chunk.rotation.y = k; g.add(chunk); }
      }
      return { model: g };
    } },
    { name: 'Rockfall', color: 0x8d8174, has: (l) => l.rockfall?.length, rules: [
      `Rocks come away from the hillside and tumble down onto the road as you come near (${range(CONFIG.rockfall.near, ' m')} short of them), bounding out across it to where they land.`,
      `A rock on the road is an obstacle: ${CONFIG.obstacleKinds.rock.damage} damage. Only you hit them: traffic drives straight through.`,
    ], build: () => {
      const g = road(9, 12), rocks = [0.8, 1.2, 0.6].map((r, k) => { const rock = ob('rock', { r }); rock.position.set(-2.5 + k * 2.6, 0, k - 1); g.add(rock); return rock; });
      return { model: g, tick: (t) => { rocks[2].position.y = Math.max(0, 4 - ((t * 3) % 6)) ; rocks[2].userData.rock.rotation.x = t * 4; } };
    } },
    { name: 'Cyclist pelotons', color: 0xff4f8b, has: (l) => l.pelotons?.length, rules: [
      `A bunch of cyclists riding two abreast by the kerb at ${kmh(CONFIG.peloton.speed)}, setting off as you come within ${CONFIG.peloton.trigger} m: on your side, or coming the other way down the far side.`,
      `Hit one and it is knocked flying (${CONFIG.obstacleKinds.cyclist.damage} damage); with a police car watching, that is a <strong>bust</strong>. Traffic drives straight through them.`,
    ], build: () => {
      const g = road(7, 12), riders = [];
      for (let k = 0; k < 4; k++) { const c = ob('cyclist'); c.position.set(1.6 + (k % 2) * 1.0, 0, 3 - Math.floor(k / 2) * 3); g.add(c); riders.push(c); }
      // (and a bunch coming the other way, down the far side)
      for (let k = 0; k < 4; k++) { const c = ob('cyclist'); c.position.set(-1.6 - (k % 2) * 1.0, 0, -3 + Math.floor(k / 2) * 3); c.rotation.y = Math.PI; g.add(c); riders.push(c); }
      return { model: g, tick: (t) => riders.forEach((c, k) => c.userData.animate(t + k * 0.7)) };
    } },
  ] },
  { name: 'Gimmick Road 2', cards: [
    { name: 'School crossings', color: 0xf2c21c, has: (l) => l.schoolCrossings?.length, rules: [
      `About ${H.school.notice} s before you get there, the lollipop person's sign turns to STOP and the children cross: ${H.school.hold} s in all. Traffic waits at the line.`,
      'Drive over the crossing while the STOP is up and it is a <strong>bust</strong>. Hold the brake and wait; it comes round again every so often while you are near.',
    ], build: () => {
      const g = road(9, 12);
      for (let x = -4; x < 4; x += 1.4) g.add(box(0.7, 0.02, 4, glow(0xf4f4f4), x + 0.35, 0.02, 0));
      const worker = makeWorker();
      worker.position.set(5.2, 0, 2.5);
      const face = mesh(new THREE.CircleGeometry(0.62, 20), glow(0xd8262b), 0.35, 3.05, 0.24);
      worker.add(box(0.06, 2.2, 0.06, lambert(0xf4f4f4), 0.35, 1.7, 0.2), face);
      const kids = [0xff4f8b, 0x2f7de1, 0xffd23f, 0x39d353].map((color, k) => { const kid = group(box(0.34, 0.5, 0.24, lambert(color), 0, 0.75, 0), box(0.3, 0.5, 0.2, lambert(0x2b2f38), 0, 0.25, 0), mesh(new THREE.SphereGeometry(0.17, 10, 8), lambert(0xf2c09a), 0, 1.17, 0)); kid.position.z = (k - 1.5) * 0.7; g.add(kid); return kid; });
      g.add(worker);
      return { model: g, tick: (t) => { const u = (t * 0.25) % 1; kids.forEach((kid) => { kid.position.x = 4.5 - u * 9; }); face.material.color.setHex(u < 0.85 ? 0xd8262b : 0xf2c21c); } };
    } },
    { name: 'Burst water mains', color: 0x6fb6d8, has: (l) => l.waterMains?.length, rules: [
      `A main has burst under one lane: it sprays for ${H.main.on} s, then stops for ${H.main.off} s. You are warned ${H.main.warn} m out.`,
      `While it sprays, ${H.main.length} m of that lane is as slippery as ice: brakes at ${pct(H.main.brakeGrip)}, steering at ${pct(H.main.steerGrip)}, and you cross the road at ${pct(H.main.laneSpeed)} of your speed. Between sprays the lane is dry, but the tyres stay wet for ${H.main.wetAfter} m past the water, the grip coming back little by little (ice lets go the moment you are off it).`,
    ], build: () => {
      const g = road(9, 12);
      const wet = mesh(new THREE.PlaneGeometry(4.2, 9).rotateX(-Math.PI / 2), lambert(0x6fb6d8, { transparent: true, opacity: 0.6 }), 2.2, 0.03, -1);
      const jet = mesh(new THREE.CylinderGeometry(0.25, 0.45, 5, 10), new THREE.MeshBasicMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.6 }), 2.2, 2.5, 3.5);
      g.add(wet, jet, mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), lambert(0x3a3b3f), 2.2, 0.04, 3.5));
      return { model: g, tick: (t) => { const on = t % 6 < 3.5; wet.visible = jet.visible = on; jet.scale.set(1 + Math.sin(t * 23) * 0.15, 1, 1 + Math.cos(t * 19) * 0.15); } };
    } },
    { name: 'Hot-air balloons', color: 0xd8262b, has: (l) => l.balloons?.length, rules: [
      `A balloon comes down on the road about as you arrive: ${H.balloon.descend} s coming down (its landing spot flashes red), ${H.balloon.sit} s sat there, then up and away.`,
      `On the ground its basket is solid: ${H.balloon.damage} damage, and you keep ${pct(H.balloon.speedKept)} of your speed. Traffic in its lanes waits for it. Wait too, or go round.`,
    ], build: () => {
      const b = new THREE.Group(), stripes = [0xd8262b, 0xffd23f, 0x2f7de1, 0xf4f4f4];
      for (let k = 0; k < 8; k++) { const gore = mesh(new THREE.SphereGeometry(3.5, 6, 12, k * Math.PI / 4, Math.PI / 4), lambert(stripes[k % 4]), 0, 6.6, 0); gore.scale.y = 1.15; b.add(gore); }
      b.add(mesh(new THREE.CylinderGeometry(1.2, 0.6, 1.5, 12, 1, true), lambert(0xd8262b, { side: THREE.DoubleSide }), 0, 2.5, 0), box(1.6, 0.9, 1.4, lambert(0x9a6a3a), 0, 0.45, 0));
      const g = road(9, 10);
      g.add(b);
      return { model: g, tick: (t) => { b.position.y = Math.max(0, Math.sin(t * 0.7)) * 5; } };
    } },
    { name: 'Drawbridges', color: 0x2e6c8f, has: (l) => l.drawbridges?.length, rules: [
      `Bells and booms for ${H.bridge.warn} s, then the two ${H.bridge.leaf} m leaves lift to ${Math.round(H.bridge.angle * 180 / Math.PI)}° and stand open, their lips ${(2 * H.bridge.leaf * (1 - Math.cos(H.bridge.angle))).toFixed(1)} m apart over the river, for about ${H.bridge.open} s in all. Traffic waits.`,
      `You never have to: the car drives up the leaf, and the speed you reach its foot with decides the rest. The board on the way in gives the speed that <strong>jumps it</strong> (every car's top speed is more); a hard landing costs ${H.bridge.landDamage} damage. A little short and you drop into the river: wrecked. Far too slow and you stop on the leaf and roll back to wait.`,
    ], build: () => {
      const g = group(mesh(new THREE.PlaneGeometry(26, 8).rotateX(-Math.PI / 2), lambert(0x2e6c8f), 0, -0.2, 0));
      g.add(box(9, 0.3, 5, lambert(0x3b3e44), 0, -0.05, 6.5), box(9, 0.3, 5, lambert(0x3b3e44), 0, -0.05, -6.5));
      const leaves = [-1, 1].map((d) => { const pivot = new THREE.Group(), leaf = box(9, 0.3, 4, lambert(0x4b4f57), 0, 0, -d * 2); pivot.position.set(0, 0, d * 4); pivot.add(leaf); g.add(pivot); return { pivot, d }; });
      return { model: g, tick: (t) => { const open = Math.max(0, Math.sin(t * 0.8)); leaves.forEach(({ pivot, d }) => { pivot.rotation.x = d * open * H.bridge.angle; }); } };
    } },
    { name: 'Wide loads', color: 0xffd23f, has: (l) => l.wideLoads?.length, rules: [
      `Half a house on a low loader, two lanes wide, crawling along at ${kmh(H.load.speed)} with an escort car ${H.load.behind} m behind it.`,
      `<strong>Pass it at speed, on the side its arrow board points to.</strong> The load swings from one side to the other, ${H.load.dwell} s at each: over on the shoulder, the lane on its left is open; back in its lanes, the way past is on its right, on the shoulder (the shoulder's rules apply). The arrows flash for the last ${H.load.warn} s; a red cross means it is swinging over.`,
      `The escort is no policeman: it moves over to stay in front of you, slowly. Wrong-foot it. There is no bust.`,
      `Running into either is a knock, not a wreck: ${CONFIG.obstacleKinds.wideLoad.damage} damage into the load's tail (${CONFIG.obstacleKinds.wideLoad.sideDamage} alongside it), and they are still there. Traffic drives through it.`,
    ], build: () => {
      const g = road(11, 26), load = ob('wideLoad', { hw: 3.2, hl: 6.5, height: 3.6 }), escort = ob('escort', { hw: 0.95, hl: 2.2, height: 1.7 });
      load.position.set(1.7, 0, 5); escort.position.set(1.7, 0, -9);
      g.add(load, escort);
      return { model: g, tick: (t) => { const right = t % 8 < 4, u = Math.min(1, (t % 4) / 1.2); load.position.x = 1.7 - 1.9 * (right ? u : 1 - u); load.userData.arrows.forEach((arrow) => { arrow.group.visible = u >= 1 && arrow.side === (right ? -1 : 1); }); load.userData.cross.visible = u < 1; escort.userData.beacons.color.setHex(Math.floor(t * 5) % 2 ? 0xffb020 : 0x4a3a1a); } };
    } },
    { name: 'Shopping trolleys', color: 0xc4c9ce, has: (l) => l.trolleys?.length, rules: [
      'Escaped trolleys roll across the road with its camber: down from the crown to the kerbs on the straight, to the inside of a bend, bouncing back off the kerb.',
      `Hit one: ${CONFIG.obstacleKinds.trolley.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.trolley.speedKept)} of your speed.`,
    ], build: () => {
      const g = road(9, 10), carts = [0, 1, 2].map(k => { const cart = ob('trolley'); cart.position.z = (k - 1) * 3; cart.rotation.y = Math.PI / 2; g.add(cart); return cart; });
      return { model: g, tick: (t) => carts.forEach((cart, k) => { cart.position.x = Math.sin(t * (0.9 + k * 0.25) + k * 2) * 3.6; }) };
    } },
    { name: 'Marathons', color: 0xff4f8b, has: (l) => l.marathons?.length, rules: [
      `Runners two abreast in one lane at ${kmh(H.run.speed)}, a pace car ${H.run.lead} m ahead of them, and a water station's tables standing in the lane further on.`,
      `Knock a runner down (${CONFIG.obstacleKinds.runner.damage} damage) with a police car watching and it is a <strong>bust</strong>. Traffic drives through them.`,
    ], build: () => {
      const g = road(7, 16), runners = [];
      for (let k = 0; k < 6; k++) { const r = ob('runner'); r.position.set(1.4 + (k % 2) * 1.2, 0, -5 + Math.floor(k / 2) * 2.6); g.add(r); runners.push(r); }
      const pace = ob('paceCar', { hw: 0.9, hl: 2.0, height: 1.6 }); pace.position.set(2, 0, 5); g.add(pace);
      return { model: g, tick: (t) => runners.forEach((r, k) => r.userData.animate(t + k * 0.4)) };
    } },
    { name: 'Stampedes', color: 0xc08a50, has: (l) => l.stampedes?.length, rules: [
      `Usually on a side road: cows or kangaroos waiting along a stretch, which come charging down the road at you once you are within ${H.herd.trigger} m, at ${range(H.herd.speed, ' m/s')}, weaving.`,
      'Each is an obstacle, as in a herd. Look for the gaps, or stay on the expressway.',
    ], build: () => {
      const roos = [0, 1, 2].map(k => { const r = ob('kangaroo'); r.position.set((k - 1) * 1.8, 0, k % 2 ? 1.5 : -1); return r; });
      return { model: group(...roos), tick: (t) => roos.forEach((r, k) => { r.position.y = Math.abs(Math.sin(t * 4 + k)) * CONFIG.kangarooHop; }) };
    } },
    { name: 'Road-train jackknife', color: 0xb3261e, has: (l) => l.wreckage?.some(e => e.kind === 'roadtrain'), rules: [
      'A road train ahead locks its brakes as you come up, and its trailers swing round across the lanes (they flash red first).',
      'Whatever they sweep up is wrecked, and those lanes are blocked for good. No fire. One lane is always left open.',
    ], build: () => {
      const g = road(11, 14), red = lambert(0xb3261e);
      g.add(box(2.4, 2.8, 3.2, red, 3.5, 1.7, 4));
      const first = new THREE.Group(), second = new THREE.Group();
      first.position.set(3.5, 0, 2.4); second.position.set(0, 0, -5.6);
      first.add(box(2.5, 2.9, 5, lambert(0xd8dadc), 0, 2.05, -2.8), second);
      second.add(box(2.5, 2.9, 5, lambert(0x2f6fa8), 0, 2.05, -2.8));
      g.add(first);
      return { model: g, tick: (t) => { const u = Math.min(1, (t % 5) / 1.6), e = u * u * (3 - 2 * u); first.rotation.y = e * 1.25; second.rotation.y = -e * 1.9; } };
    } },
  ] },
  { name: 'City streets', cards: [
    { name: 'Tunnels', color: 0x4a4f5c, has: (l) => l.tunnels?.length, rules: [
      `The road goes under cover: no sky, the dark closing in over ${T.edge} m at each portal, and nothing to see by but the ceiling lamps (one every ${T.lampEvery} m) and your own headlights, which come on by themselves.`,
      `You see about ${T.far} m ahead inside, a good deal less than outside. The camera drops in close behind the car, and the engine echoes off the walls.`,
      'Nothing else changes: the traffic, the police and the shoulders are as outside.',
    ], build: () => {
      const g = road(9, 14), wall = lambert(0x3a3d46), lamps = [];
      for (const x of [-5.6, 5.6]) g.add(box(1.2, 6, 9, wall, x, 3, -2.5));
      g.add(box(12.4, 1.2, 9, wall, 0, 6.6, -2.5), box(12.4, 0.5, 0.4, lambert(0xffd23f), 0, 5.8, 2.1));
      g.add(box(10, 5.9, 0.2, glow(0x0c0c10), 0, 3, -6.9)); // (the dark at the far end)
      for (let z = 1; z > -7; z -= 2.5) { const lamp = box(1.4, 0.12, 0.5, glow(0xfff1c2), 0, 5.9, z); lamps.push(lamp); g.add(lamp); }
      return { model: g, tick: (t) => lamps.forEach((lamp, k) => { lamp.material.color.setHex(Math.floor(t * 3 + k) % 4 ? 0xfff1c2 : 0xb8a878); }) };
    } },
    { name: 'Parades', color: 0xe0407a, has: (l) => l.parades?.length, rules: [
      `A float in every lane of your side, abreast, with ${PA.rows} rows of a marching band behind: the whole road, at ${kmh(PA.speed)}. It sets off as you come within ${PA.trigger} m and never pulls over; you hear the drum from ${PA.heard} m.`,
      `The floats are traffic, and heavy. A bandsman is an obstacle (${CONFIG.obstacleKinds.marcher.damage} damage), and knocking one down with the police near is a <strong>bust</strong>.`,
      'The way past is the oncoming side, or a side road if there is one.',
    ], build: () => {
      const g = road(11, 20), floats = [-2.6, 2.6].map((x, k) => { const f = vehicle('float', k ? 0x4fc3f7 : 0xe0407a); f.position.set(x, 0, 4); return f; });
      const band = [];
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) { const m = ob('marcher'); m.position.set(-3.6 + k * 2.4, 0, -3.5 - row * 2.2); band.push(m); }
      g.add(...floats, ...band);
      return { model: g, tick: (t) => { floats.forEach(f => f.userData.animate?.(t)); band.forEach((m, k) => { m.position.y = Math.abs(Math.sin(t * 5.7 + (k % 2) * Math.PI)) * 0.12; }); } };
    } },
    { name: 'Police roadblocks', color: 0x2f5fd8, has: (l) => l.roadblocks?.length, rules: [
      `Police cars parked across every lane of your side but one. You are warned ${RB.warn} m out: find the gap (a level can fix which lane it is; otherwise it moves from run to run).`,
      'Touching one of them is a <strong>bust</strong>, unless you carry a radar detector.',
      `With a siren going they take you for one of their own: from ${RB.wave} m out the cars pull aside and wave you through.`,
    ], build: () => {
      const g = road(13, 12), cars = [-4.5, -1.5, 4.5].map((x) => { const c = vehicle('police', 0xffffff); c.position.set(x, 0, 0); c.rotation.y = Math.PI / 2; return c; });
      const lights = cars.flatMap((c) => [box(0.5, 0.2, 0.3, glow(0xff2a2a), c.position.x, CONFIG.vehicles.police.height + 0.15, -0.3), box(0.5, 0.2, 0.3, glow(0x2a6bff), c.position.x, CONFIG.vehicles.police.height + 0.15, 0.3)]);
      g.add(...cars, ...lights);
      return { model: g, tick: (t) => { const on = Math.floor(t * 6) % 2 === 0; lights.forEach((l, k) => { l.visible = (k % 2 === 0) === on; }); } };
    } },
    { name: 'Falling cargo', color: 0xb9834a, has: (l) => l.traffic?.cargotruck || l.trafficZones?.some(z => z.traffic.cargotruck), rules: [
      `A cargo truck sheds its load: while one is within ${CG.near} m ahead of you, a crate or a bale comes off the back every ${range(CG.every, ' s')}, in its lane or a little either side.`,
      `Each slides on down the road and stops where it lies: an obstacle, yours to hit (a crate: ${CONFIG.obstacleKinds.crate.damage} damage). The traffic drives through them.`,
      'Do not sit behind it. Get past, and nothing more falls.',
    ], build: () => {
      const g = road(9, 30), truck = vehicle('cargotruck', 0x2f6f9f);
      truck.position.set(2.2, 0, 6);
      const loads = ['crate', 'bale', 'crate'].map((kind, k) => { const o = ob(kind, { hw: 0.6, hl: 0.6, height: 1.1 }); o.position.set(2.2 + (k - 1) * 1.3, 0, -6 - k * 3.2); o.rotation.y = k * 0.7; return o; });
      g.add(truck, ...loads);
      return { model: g, tick: (t) => truck.userData.animate?.(t) };
    } },
    { name: 'Ice-cream stops', color: 0xf7b6d2, has: (l) => l.iceCreamStops?.length, rules: [
      `An ice-cream van stopped in a lane, its jingle going (heard from ${IS.heard} m). The traffic behind it queues for ${IS.queue} m, nobody pulling out round it.`,
      `It drives off ${IS.wait} s after you come within ${IS.trigger} m (a stop can set its own wait), and the queue follows.`,
      'Wait in the queue, or go round the lot of them by another lane.',
    ], build: () => {
      const g = road(9, 24), van = vehicle('icecream', 0xf7b6d2);
      van.position.set(2.2, 0, 8);
      const queue = [0x4fc3f7, 0xf2c21c, 0x9be37a].map((color, k) => { const c = painted(vehicle('commuter', 0xffffff), color); c.position.set(2.2, 0, 2 - k * 4.6); return c; });
      g.add(van, ...queue);
      return { model: g, tick: (t) => van.userData.animate?.(t) };
    } },
    { name: 'Reversible lanes', color: 0x2e9b3d, has: (l) => l.reversible?.length, rules: [
      `A lane on your side under overhead signs, one every ${RL.signEvery} m. As you come within ${RL.flipAt} m of the stretch they go from a green arrow to a red cross, and the lane is oncoming from then on.`,
      `The traffic in it moves out, and a car comes down it the wrong way every ${range(RL.every, ' s')} while you are on the stretch. Meeting one is a head-on.`,
      'Under a red cross, be in another lane.',
    ], build: () => {
      const g = road(9, 14), post = lambert(0x8a9096);
      for (const x of [-5, 5]) g.add(box(0.4, 6.2, 0.4, post, x, 3.1, 0));
      g.add(box(10.4, 0.5, 0.5, post, 0, 6.2, 0));
      const arrow = sign('↓', '#12351c', '#35e06a', 1.6, 1.6), cross = sign('✕', '#3a1212', '#ff3b2f', 1.6, 1.6), open = sign('↓', '#12351c', '#35e06a', 1.6, 1.6);
      for (const [s, x] of [[arrow, -0.1], [cross, -0.1], [open, 4.3]]) { s.children[0].visible = false; s.position.set(x, 1.6, 0.3); g.add(s); }
      const car = painted(vehicle('commuter', 0xffffff), 0x24242b);
      car.position.set(-0.1, 0, -3); car.rotation.y = Math.PI;
      g.add(car);
      return { model: g, tick: (t) => { const flipped = t % 6 > 2.5; arrow.visible = !flipped; cross.visible = car.visible = flipped; car.position.z = 6 - ((t % 6) - 2.5) * 2.4; } };
    } },
    { name: 'Convoys', color: 0x6b7343, has: (l) => l.convoys, rules: [
      `Now and then a convoy: ${CV.size} vehicles of a kind (a level can say how many, and what), nose to tail ${CV.gap} m apart in one lane, moving as one.`,
      'Aim for a gap between two of them and the one behind speeds up and shuts it in your face.',
      'Pass the whole of it, or stay behind the whole of it.',
    ], build: () => {
      const g = road(9, 30), trucks = [0, 1, 2, 3].map((k) => { const v = vehicle('van', 0x6b7343); v.position.set(2.2, 0, 10.5 - k * 7); return v; });
      g.add(...trucks);
      return { model: g, tick: (t) => trucks.forEach((v, k) => { v.userData.animate?.(t); v.position.z = 10.5 - k * 7 + Math.sin(t * 1.3 + k) * 0.25; }) };
    } },
    { name: 'Rubbernecking', color: 0xff8a1a, everywhere: true, has: () => false, rules: [
      `For ${RN.linger} s after a wreck, the traffic coming up to it slows to ${pct(RN.pace)} of its speed from ${RN.range} m out, to have a look: the jam comes after the crash, yours included.`,
      `An evil driver stuck below ${pct(RN.slowBelow)} of its speed for ${RN.patience} s loses patience and goes up the shoulder, for ${RN.longest} s at most.`,
      `A police car within ${RN.policeSight} m that sees it arrests it. The same goes for you on the shoulder, as ever.`,
    ], build: () => {
      const g = road(11, 26), wreck = painted(vehicle('commuter', 0xffffff), 0x2a2a2e);
      wreck.position.set(-2.6, 0, 9); wreck.rotation.set(0, 0.9, 0.12);
      const smoke = [0, 1, 2].map((k) => mesh(new THREE.SphereGeometry(0.5 + k * 0.25, 8, 6), lambert(0x55585e, { transparent: true, opacity: 0.55 }), -2.6, 1.6 + k * 0.9, 9));
      const queue = [0x4fc3f7, 0xf2c21c, 0xd8262b, 0x9be37a].map((color, k) => { const c = painted(vehicle('commuter', 0xffffff), color); c.position.set(k % 2 ? 2.6 : 0, 0, 3 - Math.floor(k / 2) * 5 - (k % 2) * 2); return c; });
      const jumper = painted(vehicle('commuter', 0xffffff), 0x151515);
      jumper.position.set(5.2, 0, -2);
      g.add(wreck, ...smoke, ...queue, jumper);
      return { model: g, tick: (t) => { smoke.forEach((s, k) => { s.position.y = 1.6 + ((t * 0.8 + k * 0.9) % 2.7); s.material.opacity = 0.55 * (1 - ((t * 0.8 + k * 0.9) % 2.7) / 2.7); }); jumper.position.z = -8 + (t * 3) % 16; } };
    } },
  ] },
  // (Gimmick Road 3's, see gambles.js: each a risk to take or leave. None stops the car, none busts it)
  { name: 'Road gambles', cards: [
    { name: 'Crosswinds', color: 0xff6a1a, has: (l) => l.crosswinds?.length, rules: [
      `An exposed stretch with the wind across it: a steady push to one side, and every ${GB.wind.every} s a gust of ${GB.wind.length} s that is about ${Math.round(1 / GB.wind.lull)} times as hard. The windsocks show which way, and stand straight out in a gust.`,
      `<strong>The taller the car, the harder it is pushed</strong>: a van about twice as hard as a hatchback, a low sports car about two thirds as hard. Hands off, a tall car is carried right out of its lane in one gust; a tap of steering now and then holds it.`,
      `Beside a vehicle at least ${GB.wind.leeHeight} m tall, on the side the wind comes from, there is shelter: almost none of it reaches you. Clear its nose and the wind is back at once, with a shove.`,
      'The gamble: pass the lorry in its lee and take the shove on the far side, or wait for the lull. Traffic leans and drifts in its lanes too.',
    ], build: () => {
      const g = road(9, 14), sock = makeWindsock(5, 3), bus = vehicle('bus', 0xd8262b);
      sock.position.set(-5.4, 0, 2); bus.position.set(-2.2, 0, 0);
      g.add(sock, bus);
      return { model: g, tick: (t) => { const u = t % GB.wind.every, level = GB.wind.lull + (1 - GB.wind.lull) * Math.max(0, Math.min(1, Math.min(u, GB.wind.length - u) / GB.wind.rise)); sock.userData.set(level, 1, t); bus.rotation.z = -level * 0.08; bus.userData.animate?.(t); } };
    } },
    { name: 'Ramp over the jam', color: 0xc23b22, has: (l) => l.jamRamps?.length, rules: [
      `A traffic jam: stopped cars across your side of the road, and at the back of it a car transporter with its ramps down, a ${GB.ramp.run} m slope up to a lip ${(GB.ramp.run * Math.tan(GB.ramp.angle)).toFixed(1)} m high. A board on the way in names its lane and the speed that clears the queue.`,
      '<strong>Line up with the ramps and keep your foot in</strong>: the car goes up them (the climb takes a little speed), off the lip, and over the queue. No steering in the air. The landing costs some health.',
      'Too slow and it comes down among the stopped cars: usually a wreck. A slow car cannot make it at all without a turbo: the speed on the board is the gamble, made in the garage and again at the sign.',
      'The way round is whatever the level has left open: the oncoming side, or the shoulder (its rules apply). Traffic coming up the transporter\'s lane moves over, so the ramps are always clear.',
    ], build: () => {
      const g = road(11, 44), truck = makeTransporter(GB.ramp.run, GB.ramp.run * Math.tan(GB.ramp.angle), GB.ramp.half), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      truck.position.set(0, 0, -14);
      const paints = [0x4fc3f7, 0xf2c21c, 0xd8262b, 0x9be37a, 0xf28cc0, 0xe8e8e8];
      const queue = [0, 1, 2].flatMap((k) => [-3.6, 0, 3.6].filter((x) => x || k > 0).map((x, i) => { const c = painted(vehicle('commuter', 0xffffff), paints[(k * 3 + i) % 6]); c.position.set(x, 0, (x ? -8 : 1) + k * 6.5); return c; }));
      g.add(truck, car, ...queue);
      const top = GB.ramp.run * Math.tan(GB.ramp.angle);
      return { model: g, tick: (t) => { const u = (t % 3.4) / 3.4, z = -21 + u * 44, on = z + 14;
        const y = on < 0 ? 0 : on < GB.ramp.run ? on * top / GB.ramp.run : Math.max(0, top + (on - GB.ramp.run) * 0.28 - 0.016 * (on - GB.ramp.run) ** 2);
        car.position.set(0, y, z); car.rotation.x = on > 0 && on < GB.ramp.run ? -GB.ramp.angle : y > 0 ? -0.28 + 0.032 * (on - GB.ramp.run) : 0; } };
    } },
    { name: 'Washboard dirt', color: 0xa9865a, has: (l) => l.washboards?.length, rules: [
      'A road worn into corrugations right across, in whatever the place is made of: dirt, buckled steel plates in a port, rippled dust on the Moon, planks in the West, cobbles in a town. A board before it. On it the wheels hop, at any speed.',
      `<strong>It slows the car</strong>: on it there is no going faster than ${kmh(GB.board.most)}, and a car in faster is dragged down to that at ${GB.board.drag} m/s² (in at 90 km/h, about 25 km/h gone over 40 m of it). Never stopped: under ${kmh(GB.board.most)} it keeps its speed.`,
      `<strong>And it shakes</strong>, the faster the worse: at ${kmh(GB.board.full)} or more ${pct(GB.board.steerLoss)} of the steering is gone, the car wanders, and in a bend it is carried to the outside. Crawling, a little of all that.`,
      'So it is a cost, not a wall: straight across loses speed and some say over the line, and is still the short way. A lane or shoulder it does not reach, or the way round, keeps both and takes longer. The cash is on the line that needs steering.',
    ], build: () => {
      const g = road(9, 16, 0xa9865a), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      for (let z = -7.5; z < 8; z += 1.1) g.add(box(9, 0.06, 0.45, lambert(0x7a5d3c), 0, 0.03, z));
      g.add(car);
      // (in fast, slowing all the way across, hopping about the whole time)
      return { model: g, spin: true, tick: (t) => { const u = (t % 4) / 4; car.position.set(Math.sin(t * 9) * 0.45, Math.abs(Math.sin(t * 22)) * 0.14, -7 + (1 - (1 - u) ** 2) * 14); car.rotation.z = Math.sin(t * 17) * 0.07; } };
    } },
    { name: 'Low bridge', color: 0xc1121f, has: (l) => l.lowBridges?.length, rules: [
      `A height bar over your side of the road, ${GB.bar.clearance.toFixed(1)} m up unless its board says otherwise, with an exit before it: the side road is the tall vehicles' way round. It is two bars, one over each half of your side, the second ${GB.bar.stagger} m on from the first, so the way through is a slalom.`,
      'On the way in you are told what your car measures against it. <strong>A car that fits goes straight under</strong>: the short way, with the road to itself.',
      `A car that is too tall can take the exit and lose the time, or go at the bar anyway: it costs ${GB.bar.damage} health (a massive knock) and ${GB.bar.perMetre} more for every metre too tall, and ${pct(1 - GB.bar.keep)} of its speed. It is never stopped.`,
      'The gamble is made in the garage, and again at the sign. Tall traffic goes straight through the bars at no cost. (The oncoming side has no bar.)',
    ], build: () => {
      const g = road(9, 14), bar = makeHeightBar(-4.5, 0, 2), low = painted(vehicle('sport', 0xffffff), 0x39ff14), tall = vehicle('bus', 0xd8262b);
      bar.position.z = 1;
      g.add(bar, low, tall);
      return { model: g, tick: (t) => { const u = (t % 5) / 5; low.position.set(-2.4, 0, -7 + Math.min(1, u * 2.5) * 14); low.visible = u < 0.4; tall.visible = u >= 0.4; const v = (u - 0.4) / 0.6; const x = -2.4 + Math.max(0, v - 0.25) * 12, z = -9 + Math.min(v, 0.55) * 12; if (v < 0.02) tall.rotation.y = 0; else tall.rotation.y = Math.atan2(x - tall.position.x, z - tall.position.z); tall.position.set(x, 0, z); } };
    } },
    { name: 'Ford', color: 0x2f7fb8, has: (l) => l.fords?.some(f => !f.fills), rules: [
      'The road runs straight through a river, and the bridge is the exit before it: the side road, the longer way. Each ford is its own depth: the boards and the red on the depth posts show it.',
      `What a car wades goes by how well it crosses rough ground: from ${GB.ford.shallow} m for the lowest to ${GB.ford.deepest} m for the best. On the way in you are told the depth and what your car wades.`,
      `<strong>Within its depth a car is only slowed</strong>: hardly at all in a puddle, down to ${kmh(GB.ford.slow)} at its limit.`,
      `Out of its depth it crawls across at ${kmh(GB.ford.crawl)} and loses ${GB.ford.damage} health a second for every metre too deep. It is never stopped. Cars that float do not care.`,
    ], build: () => {
      const g = road(9, 14), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      g.add(box(15, 0.12, 5, new THREE.MeshBasicMaterial({ color: 0x2f7fb8, transparent: true, opacity: 0.7 }), 0, 0.2, 0));
      for (const x of [-4.2, 4.2]) for (const z of [-2.8, 2.8]) { const post = makeDepthPost(0.5, 1.75); post.position.set(x, 0, z); g.add(post); }
      g.add(car);
      return { model: g, spin: true, tick: (t) => { const u = (t % 4) / 4, z = u < 0.3 ? -7 + u / 0.3 * 4.5 : u < 0.8 ? -2.5 + (u - 0.3) / 0.5 * 5 : 2.5 + (u - 0.8) / 0.2 * 4.5; car.position.set(-2.2, Math.abs(z) < 2.5 ? -0.12 : 0, z); } };
    } },
    { name: 'Speed cushions', color: 0xb5482f, has: (l) => l.cushions?.length, rules: [
      `A street with a row of speed cushions every ${GB.cushion.every} m or so: a cushion in the middle of each lane, and <strong>a gap on every lane line</strong>. The traffic crawls over them.`,
      `Put the car on a lane line, within ${GB.cushion.line} m of it (a wide car gets less), and it goes between two cushions at any speed and feels nothing.`,
      `Over a cushion at ${kmh(GB.cushion.soft)} or less it is only a bump. Faster, the car is thrown into the air (no steering until it is down) and knocked: ${GB.cushion.damage} health and more the faster, at every row.`,
      'So: the line between the lanes at speed, with the slow traffic either side of it, or the brakes. The shoulders have no cushions, and their own rules.',
    ], build: () => {
      const g = road(9, 14), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      for (const z of [-3.5, 3.5]) for (const [x, w] of [[-3.4, 1.5], [0, 3.2], [3.4, 1.5]]) { const c = makeCushion(w, GB.cushion.long); c.position.set(x, 0, z); g.add(c); }
      g.add(car);
      return { model: g, spin: true, tick: (t) => { const u = (t % 5) / 5, line = u < 0.5, v = line ? u * 2 : (u - 0.5) * 2, z = -7 + v * 14, near = Math.min(Math.abs(z + 3.5), Math.abs(z - 3.5));
        car.position.set(line ? -2.25 : 0, line ? 0 : Math.max(0, 0.6 - near * 0.4), z); car.rotation.x = line ? 0 : (near < 1.5 ? (Math.abs(z + 3.5) < Math.abs(z - 3.5) ? z + 3.5 : z - 3.5) * -0.12 : 0); } };
    } },
    { name: 'Black ice in the shade', color: 0x5d7fa8, has: (l) => l.shade?.length, rules: [
      'On a cold road the ice lies only where the sun has not reached: in the shadow of a row of tall trees. <strong>Black ice cannot be seen. The shadow can.</strong>',
      `In the shade it is ice like any other: ${pct(IC.steerGrip)} of the steering, ${pct(IC.brakeGrip)} of the brakes, ${pct(IC.laneSpeed)} of the speed across the road, and in a bend the car is carried to the outside.`,
      'The traffic knows, and moves over into the sun before it: the shaded lane is empty, and the sunny one is where the queue is.',
      'Straight through the shade at speed costs nothing. Having to steer or brake in it is what costs: look at what is in the shadow before you go in, or stay in the sun.',
    ], build: () => {
      const g = road(9, 14), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      g.add(box(4.5, 0.02, 14, new THREE.MeshBasicMaterial({ color: 0x05070c, transparent: true, opacity: 0.5 }), -2.25, 0.02, 0));
      for (let z = -5.5; z < 7; z += 3.6) { const tree = makeShadeTree(6); tree.position.set(-6, 0, z); g.add(tree); }
      g.add(car);
      return { model: g, spin: true, tick: (t) => { const u = (t % 4) / 4; car.position.set(-2.25 + (u > 0.45 ? Math.min(1, (u - 0.45) * 3) * 1.6 : 0), 0, -7 + u * 14); car.rotation.y = u > 0.45 ? Math.sin((u - 0.45) * 14) * 0.5 : 0; } };
    } },
    { name: 'Ruts', color: 0x6a4d31, has: (l) => l.ruts?.length, rules: [
      'Tractors have left the road deep mud with a rut down each lane. <strong>In a rut the going is firm</strong>: the car runs at its own pace, and is held to the rut whatever the steering says.',
      `Getting out takes ${GB.rut.climb} s of steering against it, and then a jolt: ${GB.rut.damage} health, ${pct(1 - GB.rut.keep)} of your speed and a lurch. Between the ruts the mud is slow, slower for a car that crosses rough ground badly, until you drop into the next one. That costs nothing.`,
      'Before the mud starts any lane can be picked for free. So pick the rut early and live with it: what is further down it (a barrier, a tractor, the cash) is the gamble.',
    ], build: () => {
      const g = road(9, 16, 0x6a4d31), car = painted(vehicle('commuter', 0xffffff), 0x39ff14), tractor = ob('barrier', { hw: 1.4, hl: 0.4, height: 1 });
      for (const x of [-3.4, 0, 3.4]) for (const w of [-0.6, 0.6]) g.add(box(0.4, 0.04, 16, lambert(0x33241a), x + w, 0.02, 0));
      tractor.position.set(0, 0, 5);
      g.add(car, tractor);
      return { model: g, spin: true, tick: (t) => { const u = (t % 4) / 4, out = Math.max(0, Math.min(1, (u - 0.45) * 5)); car.position.set(out * 3.4, out > 0 && out < 1 ? 0.15 : 0, -8 + u * 16); car.rotation.y = out > 0 && out < 1 ? -0.4 : 0; } };
    } },
    { name: 'Fresh tarmac', color: 0xff8a1a, has: (l) => l.tarmac?.length, rules: [
      `Roadworks: one lane is new tar, coned off, and the traffic crawls past it in the others at ${kmh(GB.tar.queue)}. <strong>The tar lane is empty.</strong> Nothing stops you driving on it.`,
      `It sticks. Tar builds up on the tyres for as long as you are on it (all they hold in ${GB.tar.fill} s) and takes your top speed down with it, by ${pct(GB.tar.slow)} in the end: slower than the queue.`,
      `It only wears off once you are off it (${GB.tar.clean} s from full), so you stay slow for a while afterwards too.`,
      'So: short hops along it, or stay in the queue. The cash is on the tar.',
    ], build: () => {
      const g = road(9, 16), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      g.add(box(4.4, 0.03, 16, lambert(0x07080a), 2.25, 0.02, 0));
      for (let z = -7; z < 8; z += 2.8) g.add(mesh(new THREE.ConeGeometry(0.22, 0.6, 8), lambert(0xff6a1a), 0, 0.3, z));
      const queue = [0, 1, 2].map((k) => { const c = painted(vehicle('commuter', 0xffffff), [0x4fc3f7, 0xf2c21c, 0xd8262b][k]); g.add(c); return c; });
      g.add(car);
      return { model: g, spin: true, tick: (t) => { const u = (t % 5) / 5, on = u > 0.15 && u < 0.6; queue.forEach((c, k) => c.position.set(-2.25, 0, ((t * 1.2 + k * 5.5) % 16) - 8)); car.position.set(on ? 2.25 : -0.9, 0, -8 + (u < 0.6 ? u * 20 : 12 + (u - 0.6) * 10)); } };
    } },
    { name: 'Truck spray', color: 0x9fb4c2, has: (l) => l.spray?.length, rules: [
      `A wet stretch of road. Every van, bus and lorry moving on it drags a cloud of spray ${GB.spray.length} m long, over its own lane and most of the next on each side.`,
      'In the cloud <strong>you see your own car and almost nothing else</strong>: the nearer the lorry, the less. Nothing is done to the car itself.',
      'Hang back beyond the cloud and you see everything, at the lorry\'s pace. Or go through it blind, past whatever is in it.',
    ], build: () => {
      const g = road(9, 16, 0x2b3036), truck = vehicle('semi', 0x4fc3f7), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      const cloud = box(5, 2, 9, new THREE.MeshBasicMaterial({ color: 0xdfe6ea, transparent: true, opacity: 0.45, depthWrite: false }), -2.25, 1.1, -5.5);
      truck.position.set(-2.25, 0, 4);
      g.add(truck, car, cloud);
      return { model: g, spin: true, tick: (t) => { const u = (t % 5) / 5; car.position.set(u < 0.5 ? -2.25 : -2.25 + Math.min(1, (u - 0.5) * 4) * 4.5, 0, u < 0.5 ? -7.5 + Math.sin(u * 2 * Math.PI) * 0.6 : -7.5 + (u - 0.5) * 30); cloud.material.opacity = 0.38 + 0.08 * Math.sin(t * 5); } };
    } },
    { name: 'Low sun', color: 0xffe9a8, has: (l) => l.lowSun?.length, rules: [
      `A stretch that runs straight into a low sun. In the open, <strong>${pct(GB.sun.most)} of the picture washes out</strong>: you see your car and a few metres of road.`,
      `In shadow you see everything: behind a van, a bus or a lorry (its shadow reaches back about ${GB.sun.shadow} m for every metre of its height), under a bridge, in a tunnel, or under a row of trees.`,
      'So tuck in behind something tall and slow and see where you are going, or go at your own pace into the glare. Nothing is done to the car.',
    ], build: () => {
      const g = road(9, 16), truck = vehicle('semi', 0x4fc3f7), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      const sun = mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ color: 0xfff3c4, side: THREE.DoubleSide }), 0, 3, 11);
      const shade = box(2.6, 0.02, 9, new THREE.MeshBasicMaterial({ color: 0x05070c, transparent: true, opacity: 0.45 }), -2.25, 0.02, -4.5);
      truck.position.set(-2.25, 0, 4);
      g.add(truck, car, sun, shade);
      return { model: g, tick: (t) => { const u = (t % 6) / 6, out = u > 0.5; car.position.set(out ? 2.25 : -2.25, 0, -6 + Math.sin(t * 1.3) * 0.8); } };
    } },
    { name: 'Dust trail', color: 0xc9aa7c, has: (l) => l.dust?.length, rules: [
      `A dry dirt road. Everything moving on it throws a plume of dust ${GB.dust.length} m long, and the wind (the windsock before it shows which way) carries the plume across the road as it goes.`,
      'In a plume <strong>you see your own car and almost nothing else</strong>. Nothing is done to the car itself.',
      'A lane upwind of whatever is throwing it is clear. That may be the oncoming lane. Or hang back beyond the plume, at the pace of what is in front.',
    ], build: () => {
      const g = road(9, 16, 0xb08d5e), lead = painted(vehicle('pickup', 0xffffff), 0xd8262b), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      const plume = box(3, 2.2, 9, new THREE.MeshBasicMaterial({ color: 0xc9aa7c, transparent: true, opacity: 0.5, depthWrite: false }), 1.2, 1.1, -2.5);
      plume.rotation.y = -0.28;
      lead.position.set(0, 0, 4.5);
      g.add(lead, car, plume);
      return { model: g, spin: true, tick: (t) => { const u = (t % 6) / 6; car.position.set(u < 0.5 ? 1.6 : -2.6, 0, -6 + Math.sin(t * 1.3) * 0.6); plume.material.opacity = 0.44 + 0.08 * Math.sin(t * 4); } };
    } },
    { name: 'Flooded underpass', color: 0x3a6f9a, has: (l) => l.fords?.some(f => f.fills), rules: [
      'In town, in the rain: the main road goes under the railway and the dip is filling with water. The slip road (the exit before it) goes up and over, the longer way.',
      '<strong>The water rises all through the run.</strong> Early on anything gets through; the later you come to it, the fewer cars can. On the way in you are told how deep it is now, and what your car wades.',
      `It is a ford in every other way: within its depth a car is slowed (to ${kmh(GB.ford.slow)} at its limit), out of its depth it crawls across at ${kmh(GB.ford.crawl)} and is damaged. It is never stopped.`,
      'So getting there fast is worth more than the seconds: it is the difference between straight through and the long way round.',
    ], build: () => {
      const g = road(9, 14), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      const water = box(15, 0.12, 6, new THREE.MeshBasicMaterial({ color: 0x2f7fb8, transparent: true, opacity: 0.7 }), 0, 0.2, 0);
      g.add(water, box(15, 0.8, 3, lambert(0x4a4f57), 0, 3.4, 0), box(1.2, 3, 3, lambert(0x8a8378), -6.2, 1.5, 0), box(1.2, 3, 3, lambert(0x8a8378), 6.2, 1.5, 0));
      for (const x of [-4.2, 4.2]) { const post = makeDepthPost(0.9, 1.75); post.position.set(x, 0, -3.4); g.add(post); }
      g.add(car);
      return { model: g, spin: true, tick: (t) => { const u = (t % 8) / 8; water.position.y = 0.1 + u * 0.7; car.position.set(-2.2, 0, -7 + ((t * 0.5) % 1) * 14); } };
    } },
    { name: 'Crest jumps', color: 0xffd23f, has: (l) => l.segments.some(seg => seg.ease && seg.grade), rules: [
      'A steep climb and a steep drop straight after it: a crest sharp enough that a fast car <strong>leaves the ground</strong> over the top. A board on the way up gives the speed that does it.',
      `In the air there is no steering, no brake and no throttle: the car lands where it was pointed, on whatever is over the top. The camera comes down behind the car on the way up, so the far side is hidden until you are over it.`,
      `A landing harder than ${GB.crest.landSoft} m/s into the road costs health (${GB.crest.landDamage} for every m/s over): the faster, the further and the harder. Fast enough and the car clears what a slower flier lands on.`,
      'The gamble: lift below the speed on the board, stay on the ground and see over the top in time to steer; or fly blind and gain the seconds.',
    ], build: () => {
      const g = new THREE.Group(), tar = lambert(0x3b3e44);
      const up = box(7, 0.2, 8.2, tar, 0, 0.75, -3.9), down = box(7, 0.2, 8.2, tar, 0, 0.75, 3.9);
      up.rotation.x = -0.19; down.rotation.x = 0.19;
      const car = painted(vehicle('commuter', 0xffffff), 0x39ff14), block = ob('barrier', { hw: 1.4, hl: 0.4, height: 1 });
      block.position.set(0, 0.55, 5.6); block.rotation.x = 0.19;
      g.add(up, down, car, block, box(7, 0.1, 3, tar, 0, -0.05, -9.2), box(7, 0.1, 3, tar, 0, -0.05, 9.2));
      return { model: g, tick: (t) => { const u = (t % 3) / 3, z = -9 + u * 20, hill = 1.55 - Math.abs(z) * 0.19, arc = z > -0.5 && z < 7 ? 1.6 + (z + 0.5) * 0.19 - 0.075 * (z + 0.5) * (z + 0.5) * 0.6 : 0;
        car.position.set(-1.6, Math.max(Math.max(0, hill), arc + 0.1), z); car.rotation.x = z < -0.5 && hill > 0 ? -0.19 : z > 7 && hill > 0 ? 0.19 : arc > hill ? (z - 2.5) * 0.06 : 0; car.userData.animate?.(t); } };
    } },
  ] },
  // (the fallout: see radiation.js. A dose is slow, a touch is for the run; the armour is the answer to all of it)
  { name: 'Fallout', cards: [
    { name: 'Radiated areas', color: 0x7dff2a, has: (l) => l.radiation?.length, rules: [
      `A stretch of some lanes, or of the whole road, under a green haze between bright edges and hazard bands, a board ${RD.sign} m before it. In it your health ticks down, about ${pct(RD.tick * 8)} of the car's full health for each 8 s (a 200 m stretch at 25 m/s), and the <strong>radiation meter</strong> fills: full in ${RD.meterTime} s of dosing, so stay a dozen seconds and you are infected. Out of it the meter falls back, slowly (${RD.meterFall} s to empty): two stretches close together can fill it between them.`,
      `A full meter <strong>infects you for the rest of the run</strong>: from then on the health ticks down everywhere, the whole car in about ${Math.round(1 / RD.infectedTick)} s, whatever you do. A wrench buys time (${Math.round(CONFIG.wrenchRepair / RD.infectedTick)} s each) and so does an armour; nothing cures it. A warning is said at ${pct(RD.high)}.`,
      'It is the middle of the car that counts: the lane beside the green is clean, and so are the shoulders where the haze stops short of them. The armour keeps every bit of it out while it lasts.',
      'The gamble: the big cash is in the green. A dash through costs a visible slice of health and over half the meter; a dwell in it infects you. Nothing in it stops the car.',
    ], build: () => {
      const g = road(9, 16), patch = makeAreaPatch(4.4, 12), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      patch.position.x = -2.2;
      g.add(patch, car);
      return { model: g, tick: (t) => { const u = (t % 6) / 6, inside = u >= 0.5, v = (u % 0.5) * 2; car.position.set(inside ? -2.2 : 2.2, 0, -8 + v * 16); car.userData.animate?.(t); } };
    } },
    { name: 'Infected cars', color: 0xc8ff3a, has: (l) => l.radiation?.length || l.infectedTraffic > 0, rules: [
      `A traffic car wearing a green glow, a trefoil over it and a ring on the road ${RD.radius} m out: within the ring you are dosed just as in a radiated area, and the meter fills. On a radiated level ${pct(RD.share)} of the traffic comes that way unless the level says otherwise, and a clean car driving in the green can catch it (${pct(RD.catch)} a second). ${RD.most} at most are about at once.`,
      '<strong>Touching one infects you at once</strong>, whatever the meter reads: for the rest of the run. A ghost, a tank, or a car in the air over it does not touch it.',
      'An infected car is not harmed by it, nor by another infected car, and drives as it always did: it does not come for you. The police, an ambulance, a pursuit, a convoy, a racer: never infected.',
      'The armour keeps it out: no dose in the ring, and a touch does nothing. The gamble: pass it wide and lose the line, or thread the ring for the cash beside it and take a little meter.',
    ], build: () => {
      const g = road(9, 14), V = CONFIG.vehicles.commuter, sick = painted(vehicle('commuter', 0xffffff), 0x5a7a2a), car = painted(vehicle('commuter', 0xffffff), 0x39ff14);
      const aura = makeInfection(V.hw, V.hl, V.height, 3.6);
      sick.position.set(-2.2, 0, 0); aura.position.copy(sick.position);
      g.add(sick, aura, car);
      return { model: g, tick: (t) => { aura.userData.pulse(t); car.position.set(2.6, 0, -7 + ((t * 3.5) % 14)); car.userData.animate?.(t); sick.userData.animate?.(t); } };
    } },
  ] },
];
// gimmickText.json comes first (words.js): each card is given its id (its name as written above, in lower case with
// dashes: the file's key, and what the road card tells the cards apart by), and then the file's name; `blurb`, the
// line of its tile on a level's road card, only where the file has one (else the card's `line`, else its first rule)
for (const group of GROUPS) for (const card of group.cards) {
  card.id = card.id || slug(card.name);
  card.name = nameOf('gimmick', card.id, card.name);
  const blurb = blurbOf('gimmick', card.id);
  if (blurb) card.blurb = blurb;
}

// ---- road dressing: the themes' own obstacles ---------------------------------------------------------------
// NOT gimmicks, and not in GROUPS (so on no level's road card, and in no count of a level's gimmicks): the plain
// obstacles as each theme has them (themes.js: a theme's `obstacles` and `drifting`), each the kind it stands in
// for in another shape. Here so they can all be seen in one place: the Gimmicks page shows them last, under a
// heading of their own (gimmicks.html?group=road-dressing: them alone).
const DRESS = [ // [kind, name, what it stands in for, where, the card's colour]
  ['toyBlock', 'Alphabet blocks', 'crate', 'the toy room', 0x1f5fd0], ['toyDrum', 'Toy drum', 'bale', 'the toy room', 0x1f5fd0], ['skittle', 'Skittle', 'cone', 'the toy room', 0xf6f6f6],
  ['divingHelmet', 'Diving helmet', 'crate', 'the sea bed', 0xe0a93a], ['supplyPod', 'Supply pod', 'crate', 'the Moon', 0xff6a00], ['flagStand', 'Flag on a stand', 'cone', 'the Moon, where it drifts', 0xe0261f],
  ['directorChair', 'Director\'s chair', 'crate', 'the film studio', 0xd8262b], ['cameraDolly', 'Camera dolly', 'bale', 'the film studio', 0xffc928],
  ['mooringPosts', 'Mooring posts', 'crate', 'Venice', 0xc81e1e], ['cafeTable', 'Cafe table', 'cone', 'Venice', 0xd8262b],
  ['fuelDrum', 'Fuel drum', 'crate', 'the ice road', 0xe0261f], ['snowdrift', 'Heap of snow', 'cone', 'the ice road and the snow', 0xf6fbff],
  ['popcornCart', 'Popcorn cart', 'crate', 'the theme park', 0xd8262b], ['lavaRock', 'Lava boulder', 'rock', 'the volcano', 0xff6a14],
  ['barrel', 'Barrel', 'crate', 'the Wild West', 0x7a4520], ['tumbleweed', 'Tumbleweed', 'bale', 'the Wild West, where it drifts', 0x7a5526],
  ['chairStack', 'Stack of chairs', 'crate', 'the favela', 0xe0261f], ['riceBasket', 'Basket of rice', 'crate', 'the rice terraces', 0xd9a546],
  ['present', 'Present', 'bale', 'Christmas Eve', 0xd8262b], ['wheelieBin', 'Wheelie bin', 'cone', 'the hood', 0x2f9a48], ['sackStack', 'Stack of sacks', 'bale', 'Mumbai', 0xcfa868],
  ['beachBall', 'Beach ball', 'bale', 'the beach', 0x1a6be6], ['brimstone', 'Spike of brimstone', 'cone', 'hell', 0xff8a1e],
  ['wasteDrum', 'Drum of waste', 'crate', 'the fallout zone', 0xffd23f],
  ['hawkerCart', 'Hawker\'s cart', 'crate', 'Hong Kong', 0xd8262b], ['bagStack', 'Heap of bags', 'bale', 'Hong Kong', 0x1f5fd0],
];
// the kinds of plain obstacle a level's road has, as its theme has them
const dressingKinds = (l) => new Set([...(l.obstacles || []).map(o => themedKind(l.theme, o.kind || 'barrier')), ...(l.shoulderRows || []).map(r => themedKind(l.theme, r.kind || 'cone')),
  ...(l.drifters || []).map(d => themedKind(l.theme, d.kind || 'cone', true))]);
export const DRESSING = { name: 'Road dressing', about: 'Not gimmicks: the plain obstacles, as each theme has them. Each is a crate, a bale, a cone or a rock in another shape: the same size, the same cost, standing where the level put it.',
  cards: DRESS.map(([kind, name, like, place, color]) => ({ id: kind, name: nameOf('obstacle', kind, name), blurb: blurbOf('obstacle', kind) || undefined, color, has: (l) => dressingKinds(l).has(kind), rules: [
    `What a ${like} is in ${place}.`,
    `It hits as a ${like} does: ${CONFIG.obstacleKinds[kind].damage} damage, and you keep ${pct(CONFIG.obstacleKinds[kind].speedKept)} of your speed.`,
  ], build: () => ({ model: ob(kind, JUNK[kind]) }) })) };
