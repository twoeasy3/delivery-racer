// ---- "what's on this road": a level's gimmicks, pickups and traffic, each with its model turning ---------
// A card over the start screen for the level on the stage (render/menustage.js opens it, and brings this file
// in only when it is first asked for: it carries the reference pages' catalogues and models). Three groups of
// tiles: the level's GIMMICKS (the Gimmicks page's cards that the level has: gimmicks.js, each card's own
// `has`), its PICKUPS (the types laid out on it, levelinfo.js; the power-ups page's wording, powerups.js; and
// what a mystery can be) and its TRAFFIC (what it is driven in, the grid, every vehicle kind in its mix and
// its zones, and the Gimmicks page's cards about vehicles: ambulances, the police pursuit, convoys...). Each
// tile has the model its page shows, a name, and the first line of what its page says.
// Drawn cheaply: ONE WebGL renderer for the whole card, on a canvas off the page, its picture of each tile
// copied into the tile's own small canvas (render/modelviews.js, as the pages do: the models scroll with
// their tiles). The renderer is the start screen's one (the car card's too: sharedRenderer), so the card
// takes no WebGL context of its own; when it closes, what its models took is given back.
// Nothing of the level is built, and the game's own scene is not touched.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVELS, levelLabel } from '../levels.js';
import { levelName } from '../levelText.js';
import { CARS, LEVEL_CARS } from '../cars.js';
import { Game } from '../game.js';
import { levelNotes, levelPickups, mysteryPool, levelTraffic, vehicleInfo } from '../levelinfo.js';
import { GROUPS } from '../gimmicks.js';
import { CARDS } from '../powerups.js';
import { MODELS, FIXED_PAINT, makeLightBar, placeLightBar, flashLightBar } from './models.js';
import { makeTractorModel, makeUfo } from './carExtras.js';
import { PICKUP_COLOR } from './pickupModels.js';
import { standView, pickupView, sharedRenderer, disposeViews, drawViews } from './modelviews.js';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
const html = (tag, className, markup) => { const node = make(tag, className); node.innerHTML = markup; return node; }; // (the pages' own wording, which has <strong> in it)
const hex = (color) => '#' + color.toString(16).padStart(6, '0');

// the Gimmicks page's cards that are about vehicles: listed under Traffic here, not under Gimmicks
// (by the card's id, not its name: gimmickText.json may rename a card; the id is its name as gimmicks.js has it)
const TRAFFIC_CARDS = new Set(['emergency-vehicles', 'police-pursuit', 'wrong-way-drivers', 'traffic-with-quirks', 'tractors', 'funeral-processions',
  'convoys', 'boats', 'falling-cargo', 'drive-bys', 'police-stretches', 'infected-cars', 'the-ufo', 'the-jetboat', 'your-8x8']);
const OWN_VEHICLE_CARDS = ['the-ufo', 'the-jetboat', 'your-8x8'];
// ...and the vehicle kinds one of those cards already shows (so the kind gets no tile of its own)
const KIND_CARD = { ufo: 'the-ufo', jetboat: 'the-jetboat', apc: 'your-8x8', tractor: 'tractors', cargotruck: 'falling-cargo', driveby: 'drive-bys' };
// a vehicle kind's own model, painted (a traffic kind's, or a level's own vehicle's)
const CLOSE = 1.3; // (how much nearer than the pages' cards a tile's camera stands: its patch is small)
const PAINTS = [0x3d7bd9, 0xd8463a, 0x3fa35a, 0xe0a52e, 0x8a5bd1, 0x2fb5b5, 0xd9d9d9];
// a vehicle kind's paint on its tile, the n-th of the level's: the green army's on the Battlefield, the one
// the game always gives it (a police car's white, whatever its place on the card: FIXED_PAINT), its one livery
// or the garage car's (vehicleInfo), or else one of a few, by its place. The tile's glow is this colour too
export const vehiclePaint = (level, kind, n) => (level.battle && CONFIG.battle.colors.good[kind]) || (FIXED_PAINT[kind] ?? vehicleInfo(kind).color) || PAINTS[n % PAINTS.length];
export const vehicleModel = (kind, color) => {
  if (kind === 'ufo') return makeUfo();
  if (kind === 'tractor') return makeTractorModel();
  const car = LEVEL_CARS[kind] || CARS.find(c => c.id === kind), type = CONFIG.vehicles[kind] || car;
  const build = MODELS[type?.model || car?.model];
  if (build && (kind === 'police' || kind === 'ambulance')) { // (with the light bar the game's traffic puts on its roof, flashing as there)
    const model = build({ ...car, ...type, color }), animate = model.userData.animate, bar = makeLightBar();
    placeLightBar(bar, kind, type);
    model.add(bar);
    model.userData.bar = bar;
    model.userData.animate = (t) => { animate?.(t); flashLightBar(bar, kind, t * 1000); };
    return model;
  }
  if (build) return build({ ...car, ...type, color });
  const size = type || { hw: 1, hl: 2, height: 1.5 }; // (no model of its own: a block its size)
  const block = new THREE.Mesh(new THREE.BoxGeometry(size.hw * 2, size.height, size.hl * 2), new THREE.MeshLambertMaterial({ color }));
  block.position.y = size.height / 2;
  return new THREE.Group().add(block);
};
// a mystery's effects, in a word or two each ('noBrakes' -> 'No brakes')
const effectName = (key) => ({ ufo: 'UFO strike', toad: 'Toad rage' })[key] || (key[0].toUpperCase() + key.slice(1).replace(/[A-Z]/g, c => ' ' + c.toLowerCase()));

// a tile: the patch its model is drawn into, its name, a line about it
const tile = (views, view, color, name, line, extra, time) => {
  const patch = make('div', 'view');
  patch.style.setProperty('--glow', hex(color) + '66');
  const words = make('div', 'words', make('strong', '', name, time ? make('small', '', time + ' s') : null), html('p', '', line), extra);
  words.title = words.querySelector('p').textContent;
  views.push({ el: patch, ...view });
  return make('div', 'tile', patch, words);
};
const group = (name, link, linkWords, tiles, none) => make('section', 'road-group',
  make('h3', '', name, make('small', '', tiles.length ? String(tiles.length) : ''), Object.assign(make('a', '', linkWords), { href: link })),
  tiles.length ? make('div', 'tiles', tiles) : make('p', 'none', none));

// Fill `box` (the sheet) with the card for `level`, and start drawing; `close` is what its Close button does.
// Returns what to call when the sheet closes: the drawing stops and the renderer is let go.
export const showRoadCard = (box, level, close) => {
  const views = [];
  const evil = Game.evil && !level.battle && !level.alwaysGood;
  const cards = GROUPS.flatMap(g => g.cards).filter(card => card.has(level));
  const gimmickTile = (card) => tile(views, standView(card.build(level), CLOSE), card.color, card.name, card.blurb || card.line?.(level) || card.rules[0]); // (the words file's blurb first: gimmickText.json; the level: a card may show, and say, this level's own things)
  const gimmicks = cards.filter(card => !TRAFFIC_CARDS.has(card.id)).map(gimmickTile);

  // (the mystery last of the pickups but for the target: its tile is a row to itself)
  const types = levelPickups(level), order = [...types.filter(t => t !== 'mystery' && t !== 'target'), ...types.filter(t => t === 'mystery'), ...types.filter(t => t === 'target')];
  const pickups = order.map((type) => {
    const card = CARDS.find(c => c.type === type);
    if (!card) return null;
    const color = card.color ?? PICKUP_COLOR[type];
    const pool = type === 'mystery' ? make('span', 'pool', mysteryPool().map(key => make('em', '', effectName(key)))) : null;
    return tile(views, pickupView(type, color, evil), color, card.name,
      card.blurb || (type === 'mystery' ? 'One of these, at random:' : card.rules[0]), pool, card.time);
  }).filter(Boolean);

  const named = new Set(cards.map(card => card.id));
  const vehicles = levelTraffic(level).filter(({ kind }) => !named.has(KIND_CARD[kind])).map(({ kind, role }, n) => {
    const info = vehicleInfo(kind, role);
    const color = vehiclePaint(level, kind, n);
    const model = vehicleModel(kind, color);
    return tile(views, standView({ model, tick: (t) => model.userData.animate?.(t) }, CLOSE), color, info.name + (role === 'zone' ? ' (in places)' : ''), info.line);
  });
  const traffic = [...cards.filter(card => OWN_VEHICLE_CARDS.includes(card.id)).map(gimmickTile), ...vehicles,
    ...cards.filter(card => TRAFFIC_CARDS.has(card.id) && !OWN_VEHICLE_CARDS.includes(card.id)).map(gimmickTile)];

  const closeBtn = make('button', 'menu-chip', 'Close');
  closeBtn.addEventListener('click', close);
  const notes = levelNotes(level);
  const body = make('div', 'sheet-body',
    notes.length ? make('p', 'road-notes', notes.map(note => make('em', '', note))) : null,
    group('Gimmicks', 'gimmicks.html', 'All the gimmicks', gimmicks, 'Nothing but the road, the traffic and the clock.'),
    group('Pickups', 'powerups.html', 'All the power-ups', pickups, 'None on this level.'),
    group('Traffic', 'gimmicks.html#vehicles', 'More about vehicles', traffic, 'No traffic at all.'));
  box.replaceChildren(make('div', 'sheet-box road',
    make('div', 'sheet-bar', make('h2', '', 'On this road', make('small', '', levelLabel(LEVELS.indexOf(level)) + '  ' + levelName(level))), closeBtn),
    make('div', 'sheet-main', body)));

  const renderer = sharedRenderer(); // (the menu's one; null if none can be had: the card opens all the same, its tiles' pictures empty)
  let last = performance.now(), frame = 0;
  const draw = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    drawViews(renderer, views, now / 1000, dt, body); // (only the tiles scrolled into sight in the sheet)
    frame = requestAnimationFrame(draw);
  };
  if (renderer) frame = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frame);
    disposeViews(views); // (the renderer is the menu's, and stays: only what the tiles' models took is given back)
    box.replaceChildren();
  };
};
