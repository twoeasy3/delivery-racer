// ---- the start screen's level select, car and side: the game's front end ---------------------------------
// One screen, nothing scrolls. The level picked is the STAGE: its picture large, its number and name, its
// description for the side picked, its clock, tip and best times with their medals, and (in the HUD's round window) the cargo it carries. Under it the STRIP: the
// levels of its group, to step through; over it the groups, and over those the tabs (Deliveries, Races): the
// same control one level up each time. Beside the stage the car (a way into the garage), the side (Good or
// Evil: Evil recolours the screen) and START.
// Still only a menu: stepping to a level marks it (selectLevel); the level is built when a run starts
// (Game.start), and nothing here reloads the page. A level not open yet can be stepped to and looked at, but
// it is never the level picked, and START is off while it is on the stage.
// Keys: left / right (A / D) a level, up / down a group, T the other tab, E the other side, G the garage,
// I what's on this road, O the options, Enter start. Touch: swipe the stage sideways, or tap the strip.
// For a picture: ?cursor=47 puts that level on the stage, open or not (?pick= opens them all first: see
// main.js); ?side=evil shows the Evil side for the visit; ?options opens the options; ?road the road card.
import '../menu2.css';
import { LEVELS, LEVEL, selectLevel, selectSpecial, levelLabel, MAIN_LEVELS, AMPHIBIOUS_LEVELS, DELIVERY_LEVELS, RACE_LEVELS, isRace } from '../levels.js';
import { levelName, levelDescription } from '../levelText.js';
import { cargoFor } from '../cargo.js';
import { cargoCircleView } from './cargoview.js';
import { CARS, CAR, useLevelCar, earnedFor, amphibiousCars, stars, starColour, carById } from '../cars.js';
import { Progress } from '../progress.js';
import { Tiers, tierStarsNode, richTiers } from '../tiers.js';
import { Events } from '../events.js';
import { Nav } from '../nav.js';
import { buildLabel } from '../version.js';
import { Game, formatTime, clockFor } from '../game.js';
import { medalFor, medalNeeds } from '../levelinfo.js';
import { Garage, makeShowCar, paintShowCar, IDEA_TAG } from './garage.js';
import { standView, sharedRenderer, disposeViews, drawViews, drawStill } from './modelviews.js';
import { Sound } from './audio.js';
import { ask } from './dialog.js';
import { Replay } from '../replay.js';
import { ReplayStore } from '../replaystore.js';
import { watch } from './replayui.js';

const money = (amount) => '$' + amount.toFixed(2);
// each level's still, by level id (taken with ?cine: see main.js). The postcard album uses them too (render/album.js)
export const LEVEL_SHOTS = Object.fromEntries(Object.entries(
  import.meta.glob('../levelshots/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));
// ...and its large one, where it has one (levelshots/large/<id>.jpg: the same picture, the same shape, 1920 x 854
// against 600 x 267), for the stage alone: the stage stretches its picture to cover it, and at a desktop's size
// the small one is blurred. Only their addresses are in the bundle: a picture is fetched when the stage shows it
const LEVEL_SHOTS_LARGE = Object.fromEntries(Object.entries(
  import.meta.glob('../levelshots/large/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));
const SHOT = { w: 600, h: 267, slack: 1.15 }; // (the small picture's size; and how far it may be stretched before the large one is wanted)
// the stage's picture of a level: the small one, with the large one over it where there is one and the stage
// draws its picture bigger than the small one is (in the screen's own pixels: a dense screen counts). The small
// one is under it all the same: it shows until the large one has come, and if it never does
// (A phone gets the large one too, as a desktop does: the owner asked for the high quality pictures there on 11-Oct,
// reversing the small-only rule. phone() below still says whether the screen is a touch screen or a narrow window)
const phone = () => !!window.matchMedia?.('(pointer: coarse), (max-width: 760px)').matches;
// (a special event's stage shows its map's picture: events.js)
const shotId = (level) => level.stage?.map || level.id;
const stageShot = (id) => {
  const small = LEVEL_SHOTS[id], large = LEVEL_SHOTS_LARGE[id];
  if (!small) return large ? `url("${large}")` : '';
  const w = stage.clientWidth || window.innerWidth * 0.7, h = stage.clientHeight || window.innerHeight * 0.6;
  const drawn = Math.max(w, h * SHOT.w / SHOT.h) * (window.devicePixelRatio || 1); // (covering the stage: as wide as it, or as tall)
  const wanted = large && drawn > SHOT.w * SHOT.slack && !navigator.connection?.saveData;
  return (wanted ? `url("${large}"), ` : '') + `url("${small}")`;
};
// each car's picture, by car id and side: 'commuter-good', 'commuter-evil' ... (taken with ?cine=car). The car
// card shows the car's own model, live (see drawCar); these are what it shows where that cannot be had
const CAR_SHOTS = Object.fromEntries(Object.entries(
  import.meta.glob('../carshots/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));

// a node: its tag, its class, and what goes in it (words, or other nodes; nothing for a null)
const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};

const params = new URLSearchParams(location.search);
const startScreen = document.getElementById('startScreen');
const bank = document.getElementById('bank');
const stage = document.getElementById('stage'), strip = document.getElementById('levels'), groupBox = document.getElementById('levelGroups');
const shop = document.getElementById('shop'), startBtn = document.getElementById('startBtn'), startNote = startBtn.querySelector('.start-note');
const sideBox = document.getElementById('sideBtn'), sideNote = document.getElementById('sideNote');

// ---- the tabs and their groups ---------------------------------------------------------------------------
// Two tabs: the deliveries, and the races (the circuits: see RACE_LEVELS). On each, the levels in groups of
// five (the main delivery levels, then the special ones, then the amphibious ones, each kind starting a group
// of its own; the races five at a time)
const TABS = { delivery: { list: DELIVERY_LEVELS, groups: [] }, race: { list: RACE_LEVELS, groups: [] } };
for (let i = 0; i < MAIN_LEVELS.length; i += 5) TABS.delivery.groups.push([i, Math.min(MAIN_LEVELS.length, i + 5)]);
{
  const specials = DELIVERY_LEVELS.length - AMPHIBIOUS_LEVELS.length;
  for (let i = MAIN_LEVELS.length; i < specials; i += 5) TABS.delivery.groups.push([i, Math.min(specials, i + 5)]);
  for (let i = specials; i < DELIVERY_LEVELS.length; i += 5) TABS.delivery.groups.push([i, Math.min(DELIVERY_LEVELS.length, i + 5)]);
}
for (let i = 0; i < RACE_LEVELS.length; i += 5) TABS.race.groups.push([i, Math.min(RACE_LEVELS.length, i + 5)]);
// (the level tiers, tiers.js: the delivery tab in the table's order: the events first, a group of their own, then a
// group a tier, then the levels outside them in runs of one kind, five at most. A group's third item is its tier
// number, or 'events')
// The events are those on now (tiers.js eventLive, by the device's clock): built again when that changes (draw). The
// levels outside the tiers run in two kinds, the specials (S) and the amphibious (A)
let liveKey = null;
const buildDeliveryTab = () => {
  if (!Tiers.on()) return;
  const live = Tiers.liveEvents(), specials = Events.liveSpecials(), key = [...live, ...specials].map(x => x.id).join();
  if (key === liveKey) return;
  liveKey = key;
  // (the one-level events, a group; then each special event's stages, a group of its own: events.js)
  const stages = specials.flatMap(e => e.stages.map(s => s.level).filter(Boolean));
  const list = [...live, ...stages, ...Tiers.order.filter(level => !Tiers.isEvent(level)), ...DELIVERY_LEVELS.filter(level => !Tiers.order.includes(level))], groups = [];
  let i = 0;
  if (live.length) { groups.push([0, live.length, 'events']); i = live.length; }
  for (const e of specials) { const n = e.stages.filter(s => s.level).length; if (n) { groups.push([i, i + n, 'special:' + e.id]); i += n; } }
  Tiers.tiers.forEach((tier, k) => { if (tier.length) { groups.push([i, i + tier.length, k + 1]); i += tier.length; } });
  const kind = (level) => AMPHIBIOUS_LEVELS.includes(level) ? 2 : 1;
  while (i < list.length) { let j = i + 1; while (j < list.length && j - i < 5 && kind(list[j]) === kind(list[i])) j++; groups.push([i, j]); i = j; }
  TABS.delivery.list = list;
  TABS.delivery.groups = groups;
};
buildDeliveryTab();
// the level picked: a menu level by its place; a special event's stage is not in the menu's lists (events.js)
const pickLevel = (level) => { if (Events.isStage(level)) selectSpecial(level); else selectLevel(LEVELS.indexOf(level)); };
// a special event's stage, said on its card: what stops it, or the car it is driven in (events.js)
const stageLine = (level) => {
  const { event, stage } = Events.stageOf(level), st = Events.state(event, stage.index), car = stage.car ? carById(stage.car) : null;
  if (!st.open) return st.why;
  if (st.needs) return 'Needs the ' + st.needs.name + ': own it to play this stage';
  return stage.free ? 'Free try: driven in the ' + car.name + ', owned or not' : car ? 'Driven in your ' + car.name : 'Any car you own';
};
// how long until an event ends, for its card: "3d 4h", "5h 12m", "9m 30s"
const countdown = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : m + 'm ' + (s % 60) + 's';
};
const ends = (at) => { const p = make('p', 'event-ends countdown', 'Ends in ' + countdown(at - Tiers.now())); p.dataset.end = at; return p; };
// (each second: the countdowns on the card; an event just over, and the menu is drawn again without it)
setInterval(() => {
  for (const node of document.querySelectorAll('#stage .countdown')) {
    const left = Number(node.dataset.end) - Tiers.now();
    if (left <= 0) { draw(); return; }
    node.textContent = 'Ends in ' + countdown(left);
  }
}, 1000);
const tabOf = (level) => isRace(level) ? 'race' : 'delivery';
// (under the tiers a level's number is its place in its tier, 1 to 5; its kind says which tier)
const label = (level) => Events.isStage(level) ? String(level.stage.index + 1) : Tiers.on() && Tiers.place(level) ? String(Tiers.place(level).pos)
  : Tiers.on() && Tiers.isEvent(level) ? String(Math.max(0, Tiers.liveEvents().indexOf(level)) + 1) : levelLabel(LEVELS.indexOf(level)); // (outside the tiers: S1, A1... in the menu's order, tiers.js)
// what kind of level it is, for the plate over its picture
const kindOf = (level) => isRace(level) ? 'Race' : Events.isStage(level) ? 'Stage' : Tiers.on() && Tiers.isEvent(level) ? 'Event' : Tiers.on() && Tiers.outsideLabel(level)?.startsWith('S') ? 'Special' : Tiers.on() && Tiers.place(level) ? tierStarsNode(Tiers.place(level).tier) : AMPHIBIOUS_LEVELS.includes(level) ? 'Amphibious' : MAIN_LEVELS.includes(level) ? 'Level' : 'Special';
// a race is always open; a delivery level once the one before it has been delivered
const isOpen = (level) => isRace(level) || (Events.isStage(level) ? Events.isOpen(level) : Tiers.on() ? Tiers.isOpen(level) : LEVELS.indexOf(level) < Progress.data.unlocked);
// a level played on one side only (the Battlefield, All Heck: always Good)
const oneSided = (level) => !!(level.battle || level.alwaysGood);

// ---- what is on the stage --------------------------------------------------------------------------------
let cursor = LEVEL;             // the level on the stage: the level picked, unless it is one not open yet
let tab = tabOf(LEVEL);
const lastOn = {};              // the level each tab was left on, to come back to
let drawn = null;               // (what the stage last showed: a change of level or side is animated)
// the cheapest amphibious car: the one to point a player with none at
const cheapestAmphibious = () => amphibiousCars().sort((a, b) => a.price - b.price)[0];
const blip = (name) => Sound.play(name, 0.5);

// put a level on the stage; if it is open it is the level picked (and the car is the one it is driven in)
const show = (level) => {
  cursor = level;
  tab = tabOf(level);
  lastOn[tab] = level;
  if (isOpen(level)) {
    pickLevel(level);
    useLevelCar(level.car, level.amphibious); // (an amphibious level puts the player in their amphibious car)
  }
  draw();
};
// a step along the tab's levels (through the groups, end to end), a step of a whole group, the other tab
const step = (by) => {
  const list = TABS[tab].list, at = list.indexOf(cursor), to = Math.max(0, Math.min(list.length - 1, at + by));
  if (to === at) return;
  blip('menuMove');
  show(list[to]);
};
const stepGroup = (by) => {
  const { list, groups } = TABS[tab], at = list.indexOf(cursor), g = groups.findIndex(([a, b]) => at >= a && at < b);
  const to = Math.max(0, Math.min(groups.length - 1, g + by));
  if (to === g) return;
  blip('menuMove');
  show(list[Math.min(groups[to][1] - 1, groups[to][0] + (at - groups[g][0]))]); // (the same place along the row)
};
const showTab = (name) => {
  if (name === tab) return;
  blip('menuMove');
  show(lastOn[name] || TABS[name].list[0]);
};
// Good or Evil: picked here (and remembered), played by START
Game.evil = !!Progress.data.evil;
const pickSide = (evil) => {
  if (evil === Game.evil) return;
  Game.evil = evil;
  Progress.data.evil = evil;
  Progress.save();
  blip('menuPick');
  draw();
};

// ---- drawing ---------------------------------------------------------------------------------------------
// a side's medal on the stage: the side, the grade its best time earned, and the time (or a dash). (Its CSS class and
// the identifiers are still called ribbon / half: the strip of the two medals, Good's on the left and Evil's on the right)
const ribbonHalf = (level, evil) => {
  const spare = Progress.bestTime(level.id, evil), medal = medalFor(level, evil, spare);
  const half = make('span', 'half ' + (evil ? 'evil' : 'good') + (medal ? ' ' + medal : ''),
    make('i', 'medal'), make('small', '', evil ? 'Evil' : 'Good'), make('b', '', medal ? formatTime(spare) : '–'));
  const next = { bronze: 'silver', silver: 'gold' }[medal];
  half.title = !medal ? 'Not delivered as ' + (evil ? 'Evil' : 'Good') + ' yet'
    : medal[0].toUpperCase() + medal.slice(1) + ' medal' + (next ? ': ' + formatTime(medalNeeds(level, evil, next)) + ' to spare for ' + next : '');
  return half;
};
const fact = (name, value) => make('span', 'fact', make('small', '', name), value);
// On a phone held upright the stage shows the level's figures (clock, tip, best time, what it needs, its medals) OR its
// description, the "i" button at its foot switching between them (the owner, 11-Oct: there is no room for both).
// Kept from level to level; elsewhere the button is not shown and both are (menu2.css)
let showDesc = false;

const drawStage = () => {
  const level = cursor, open = isOpen(level), evil = Game.evil && !oneSided(level);
  const list = TABS[tab].list, at = list.indexOf(level);
  const key = level.id + (evil ? '/evil' : '/good'), sameLevel = !!drawn && drawn.split('/')[0] === level.id;
  const shot = (sameLevel && stage.querySelector('.shot')) || make('div', 'shot'); // (the same level drawn again keeps its picture, drifting as it was)
  const picture = stageShot(shotId(level));
  if (picture) shot.style.backgroundImage = picture; // (the large picture where the stage is big enough to want it)
  else shot.classList.add('none'); // (no picture of it yet)
  const tiered = Tiers.on() ? Tiers.place(level) : null; // (under the tiers: the stars, then 1/5)
  const plate = make('div', 'plate' + (tiered ? ' tiered' : ''), make('small', '', kindOf(level)), make('b', '', tiered ? tiered.pos + '/' + Tiers.tiers[tiered.tier - 1].length : label(level)));
  if (tiered) plate.setAttribute('aria-label', Tiers.spoken(tiered.tier) + ', level ' + tiered.pos + ' of ' + Tiers.tiers[tiered.tier - 1].length);
  const ribbon = make('div', 'ribbon', ...(open ? (oneSided(level) ? [false] : [false, true]).map(side => ribbonHalf(level, side)) : []));
  // what the level needs (a line of its own: a car that floats, the vehicle it is driven in, the level before it)
  const prize = earnedFor(level.id);
  const place = Tiers.on() ? Tiers.place(level) : null, rule = Tiers.restriction(level, evil);
  const cheapest = rule !== null ? Tiers.carsOfTier(rule).sort((a, b) => a.price - b.price)[0] : null;
  const needs = Events.isStage(level) ? stageLine(level) : !open ? (Tiers.on() ? Tiers.lockedBecause(level) : 'Locked: deliver level ' + label(list[at - 1]) + ' on time to open it')
    : rule !== null ? (CAR.silhouette ? 'You own no ' + Tiers.tierName(rule) + ' car: buy one in the garage to play this level (the cheapest is the ' + cheapest.name + ', ' + money(cheapest.price) + ')'
        : 'No medal on ' + (evil ? 'Evil' : 'Good') + ' yet: only ' + Tiers.tierName(rule) + ' cars may be driven. Earn it and any car will do on this side')
    : level.car ? 'Driven in the ' + CAR.name + ': the garage car returns on other levels'
      : level.amphibious ? (CAR.amphibious ? 'Amphibious cars only: you drive your ' + CAR.name
        : 'Needs an amphibious car: get the ' + cheapestAmphibious().name + ' (' + money(cheapestAmphibious().price) + ') in the garage')
        : null;
  // (a special level's 6-star car, and the time to spare that earns it: see cars.js EARNED_CARS)
  const prizeLine = open && prize ? '6-star car: ' + prize.name + (Progress.earned(prize) ? ' (earned)'
    : ', for ' + formatTime(prize.earned.par.good) + (prize.earned.par.evil === undefined ? '' : ' Good and ' + formatTime(prize.earned.par.evil) + ' Evil') + ' to spare') : null;
  const words = levelDescription(level, evil); // (for the side picked: see levelText.js)
  const best = Progress.bestTime(level.id, evil);
  // what is being delivered, for the side picked (cargo.js: levelText.json's, whatever is wrong with it; null on a
  // race), in the HUD's own round window, turning, with its name under it: nothing on a level not open
  const carried = open ? cargoFor(level, evil) : null;
  const ring = carried ? make('span', 'ring') : null;
  const cargo = carried ? make('div', 'cargo3d', ring, make('span', 'cargo-name', carried.name)) : null;
  if (cargo) cargo.title = (evil ? 'What you are delivering as Evil: ' : 'What you are delivering as Good: ') + carried.name;
  wantCargo(carried, ring);
  const event = Tiers.on() && Tiers.isEvent(level) ? Tiers.eventOf(level) : null, special = Events.stageOf(level);
  const info = make('div', 'info',
    make('h2', '', levelName(level)),
    open && words ? make('p', 'desc', words) : null,
    open ? make('div', 'facts',
      fact('Clock', formatTime(clockFor(level, evil)) + (oneSided(level) ? ' (always Good)' : '')),
      fact('Tip', money(level.tip)),
      fact('Best to spare', best === undefined ? 'Not delivered yet' : formatTime(best))) : null,
    needs ? make('p', 'needs' + (open && !Game.canStart ? ' warn' : ''), ...richTiers(needs)) : null,
    // (an event: how long it is on for, and its reward)
    event?.to ? ends(event.to) : null,
    event?.reward ? make('p', 'prize', 'Reward: ' + Tiers.rewardWords(level) + (Tiers.rewardClaimed(level) ? ' (yours)' : ' for delivering it on time')) : null,
    // (a special event's stage: its event, how far through it the player is, and how long it is on)
    special ? make('p', 'event-of', special.event.name + '  ·  ' + Events.done(special.event) + '/' + special.event.stages.length + ' stages') : null,
    special?.event.to ? ends(special.event.to) : null,
    open && place ? make('p', 'prize', tierStarsNode(place.tier), ' medals ' + Tiers.tierMedals(place.tier) + '/' + Tiers.tiers[place.tier - 1].length * 2) : null,
    prizeLine ? make('p', 'prize', prizeLine) : null,
    (open && roadCard) || special ? make('div', 'road', // (the card's chips: the row placed as the one chip was)
      special ? make('button', 'menu-chip stages-btn', 'All stages') : null,
      open && roadCard ? make('button', 'menu-chip road-btn', 'What’s on this road') : null,
      open && ReplayStore.list(level.id).length ? make('button', 'menu-chip replays', 'Replays') : null) : null);
  info.querySelector('.stages-btn')?.addEventListener('click', () => eventCard(special.event));
  info.querySelector('.road-btn')?.addEventListener('click', () => roadCard(level));
  info.querySelector('.replays')?.addEventListener('click', () => replaysCard(level));
  const arrows = [make('button', 'arrow prev', '‹'), make('button', 'arrow next', '›')];
  arrows[0].disabled = at <= 0;
  arrows[1].disabled = at >= list.length - 1;
  arrows[0].title = 'The level before (left)';
  arrows[1].title = 'The next level (right)';
  arrows[0].addEventListener('click', () => step(-1));
  arrows[1].addEventListener('click', () => step(1));
  const toggle = open && words ? make('button', 'info-toggle', 'i') : null; // (only where there is a description to show)
  const paintToggle = () => {
    stage.classList.add('has-toggle');
    stage.classList.toggle('desc-view', showDesc);
    toggle.setAttribute('aria-pressed', showDesc);
    toggle.title = toggle.ariaLabel = showDesc ? 'Show the level’s figures' : 'Show the level’s description';
  };
  toggle?.addEventListener('click', () => { showDesc = !showDesc; blip('menuPick'); paintToggle(); });
  stage.replaceChildren(shot, plate, ribbon, cargo, info, ...arrows, ...(toggle ? [toggle] : []));
  // (a new level slides in; the other side only swaps the words)
  stage.className = 'menu-stage' + (open ? '' : ' locked') + (drawn && !sameLevel ? ' enter' : drawn && drawn !== key ? ' flip' : '');
  if (toggle) paintToggle();
  drawn = key;
};

// the strip: the levels of the group shown, each a small picture with its number, name and a pip for each side's medal
const drawStrip = (first, last) => {
  const list = TABS[tab].list;
  strip.replaceChildren(...list.slice(first, last).map((level) => {
    const open = isOpen(level);
    const pips = make('span', 'pips', ...(open ? (oneSided(level) ? [false] : [false, true]).map(evil =>
      make('i', (evil ? 'evil ' : 'good ') + (medalFor(level, evil, Progress.bestTime(level.id, evil)) || 'none'))) : []));
    const thumb = make('button', 'thumb' + (level === cursor ? ' current' : '') + (open ? '' : ' locked'),
      make('b', '', label(level)), pips, make('span', 'name', levelName(level)));
    if (LEVEL_SHOTS[shotId(level)]) thumb.style.backgroundImage = `url("${LEVEL_SHOTS[shotId(level)]}")`;
    else thumb.classList.add('none');
    thumb.title = open ? levelName(level) : levelName(level) + ': not open yet';
    thumb.addEventListener('click', () => { if (level !== cursor) blip('menuMove'); show(level); });
    return thumb;
  }));
  // (where the strip is a row to swipe along, the level picked is brought to the middle)
  const current = strip.querySelector('.current');
  if (current && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2, behavior: 'smooth' });
};

// the car: its picture, its name and stars, its figures as bars against the best in the garage; a tap opens the garage
const MOST = { speed: Math.max(...CARS.map(c => c.maxSpeed)), accel: Math.max(...CARS.map(c => c.accel)), health: Math.max(...CARS.map(c => c.health)) };
const bar = (name, value, share) => {
  const fill = make('i');
  fill.style.width = Math.round(Math.max(0.06, Math.min(1, share)) * 100) + '%';
  return make('span', 'stat', make('small', '', name), make('span', 'track', fill), make('b', '', value));
};
// The car's picture: its own model, slowly turning, in the livery of the side picked, its own parts moving
// (userData.animate). The model is the garage's (makeShowCar, paintShowCar), on a stand as the reference
// pages' are, drawn by the start screen's one renderer into a small canvas in the picture
// (render/modelviews.js): no run is built, and nothing of the game's scene is touched. Where no renderer can
// be had, the model cannot be built, or the context is lost, the picture is the still as before (CAR_SHOTS).
// prefers-reduced-motion: the model stands still, at its angle (the views' own doing: modelviews.js STILL).
const CAR_VIEW = { close: 1.35, lift: 0.3, angle: 0.7 }; // how near and from how high it is seen; where it starts (rad)
const picture = make('span', 'picture');
let carView = null;   // { el, scene, camera, step, canvas, ctx, model, car, evil }: the model on show
let carUrl = '';      // the still for the car and side on show
let carLive = false;  // the model is being drawn (so the still is not shown under it)
const syncPicture = () => {
  picture.style.backgroundImage = !carLive && carUrl ? `url("${carUrl}")` : '';
  if (carView?.canvas) carView.canvas.style.display = carLive ? 'block' : 'none';
};
const showCarModel = (evil) => {
  carUrl = CAR.silhouette ? '' : CAR_SHOTS[CAR.id + (evil ? '-evil' : '-good')] || '';
  picture.classList.toggle('silhouette', !!CAR.silhouette);
  try {
    if (carView?.car === CAR) { // (the same car: the other side's paint, where it stands)
      if (carView.evil !== evil) paintShowCar(carView.model, CAR, carView.evil = evil);
    } else {
      const old = carView;
      carView = null;
      if (old) disposeViews([old]);
      if (sharedRenderer()) {
        const model = makeShowCar(CAR);
        paintShowCar(model, CAR, evil);
        const stand = standView({ model, tick: (t) => model.userData.animate?.(t), lift: CAR_VIEW.lift, angle: CAR_VIEW.angle, fitWidth: true }, CAR_VIEW.close); // (fitWidth: the picture is narrow, and a car long)
        carView = { el: picture, canvas: old?.canvas, ctx: old?.ctx, ...stand, model, car: CAR, evil }; // (the canvas is kept from car to car)
      }
    }
  } catch (error) { // (a vehicle with no model to show: its still)
    console.warn('No model for the car card: ' + (error?.message || error));
    carView = null;
  }
  if (!carView) picture.querySelector('canvas')?.remove(); // (no model: nor the last car's picture of one)
  carLive = !!carView;
  if (carView) carView.stillAt = undefined; // (standing still or not, it is drawn again at once: its paint may have changed)
  syncPicture();
};
{
  let last = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!menuUp()) { dropCargo(); return; } // (a run has started: what the circle took is given back)
    if (Garage.isOpen) return;
    if (!cargoView && cargoWant) buildCargo(); // (the menu is back, and the stage has not been drawn again)
    const views = [carView, cargoView && cargoDue(cargoView) ? cargoView : null].filter(Boolean);
    if (!views.length) return;
    const live = drawViews(sharedRenderer(), views, now / 1000, dt);
    if (carView && live !== carLive) { carLive = live; syncPicture(); }
  };
  requestAnimationFrame(frame);
}
// The cargo: the HUD corner's round window (render/cargoview.js), in the stage's corner. Its model is drawn by the same
// one renderer as the car's, into a canvas in its circle (no WebGL context of its own), turning at the corner's own
// speed, on a phone as on a desktop (it stood still on a phone until 11-Oct), and under prefers-reduced-motion it
// is stilled as the car is (modelviews.js drawViews).
// Built when the item (or the way it is shown) changes, not when the stage is drawn again; given back when the
// item changes, when no level on show carries one, and when the menu is left (the frame below). The stage's
// own nodes are made afresh each time it is drawn, so the view is moved into the new circle.
let cargoView = null;   // { id, still, el, scene, camera, step, stand, canvas, ctx }
let cargoWant = null;   // { item, el }: what the stage last asked for (built again if the menu comes back)
const dropCargo = () => {
  if (!cargoView) return;
  cargoView.canvas?.remove();
  disposeViews([cargoView]);
  cargoView = null;
};
const buildCargo = () => {
  const item = cargoWant?.item;
  if (!item || !cargoWant.el) return dropCargo();
  const still = false; // (it turns on a phone too: the owner, 11-Oct, "the cargo on the level card does not rotate ... on mobile")
  try {
    if (cargoView && (cargoView.id !== item.id || cargoView.still !== still)) dropCargo();
    if (!cargoView) {
      if (!sharedRenderer()) return; // (no renderer to be had: the name under the circle stands alone)
      cargoView = { id: item.id, still, ...cargoCircleView(item.id, { spin: !still }) };
    }
  } catch (error) { // (never a crash: the circle stays empty, with the name)
    console.warn('No model for the cargo card: ' + (error?.message || error));
    dropCargo();
    return;
  }
  cargoView.canvas?.remove(); // (a new circle: the old one's canvas went with its node)
  cargoView.canvas = cargoView.ctx = null;
  cargoView.stillAt = undefined;
  cargoView.el = cargoWant.el;
};
const wantCargo = (item, el) => { cargoWant = item ? { item, el } : null; buildCargo(); };
// a still one is drawn when its circle is new or has changed size, a turning one every frame
const cargoDue = (v) => {
  if (!v.still) return true;
  const r = v.el.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (!r.width || !r.height) return false;
  return !v.canvas || v.canvas.width !== Math.round(r.width * ratio) || v.canvas.height !== Math.round(r.height * ratio);
};
const drawCar = () => {
  const evil = Game.evil && !oneSided(cursor);
  showCarModel(evil);
  // (a car idea, ideas.js, has no tier and so no stars: "Idea" stands where they would be)
  if (CAR.silhouette) { // (a car of the level's tier is to be bought: a dark outline of the cheapest, and no figures)
    shop.replaceChildren(picture,
      make('span', 'words', make('strong', '', 'No car for this level'), make('span', 'stat', make('small', '', ...(CAR.tierNeeded ? [tierStarsNode(CAR.tierNeeded)] : richTiers(CAR.ruleLabel || '')), ' only'))),
      make('span', 'go', 'Garage'));
    shop.title = 'This level needs a car of exactly its tier: open the garage to buy one (G)';
    return;
  }
  const starSpan = make('span', 'stars', CAR.tier ? stars(CAR) : IDEA_TAG.text);
  starSpan.style.color = CAR.tier ? starColour(CAR) : IDEA_TAG.colour;
  shop.replaceChildren(picture,
    make('span', 'words',
      make('strong', '', CAR.name + ' ', CAR.tier || (CAR.idea && !CAR.event) ? starSpan : null),
      bar('Speed', Math.round(CAR.maxSpeed * 3.6) + ' km/h', CAR.maxSpeed / MOST.speed),
      bar('Accel', String(CAR.accel), CAR.accel / MOST.accel),
      bar('Health', String(CAR.health), CAR.health / MOST.health)),
    make('span', 'go', LEVEL.car ? 'This level’s own vehicle' : 'Garage'));
  shop.title = LEVEL.car ? 'You must use this vehicle on this level. The garage car returns on other levels.' : 'Open the garage to change or buy cars (G)';
};

export const draw = () => {
  buildDeliveryTab(); // (an event may have started or ended)
  // (the level picked may have changed behind the menu's back: a run's Next level, a save brought in. The stage
  // follows it, unless it is showing a level not open yet, which is never the level picked)
  if (isOpen(cursor) && cursor !== LEVEL && LEVELS.includes(LEVEL)) { cursor = LEVEL; tab = tabOf(LEVEL); }
  if (!TABS[tab].list.includes(cursor)) cursor = TABS[tab].list.includes(lastOn[tab]) ? lastOn[tab] : TABS[tab].list.find(isOpen) || TABS[tab].list[0];
  const over = (Tiers.isEvent(LEVEL) && !Tiers.eventLive(LEVEL)) || (Events.isStage(LEVEL) && !Events.live(Events.stageOf(LEVEL).event));
  if (over && isOpen(cursor) && cursor !== LEVEL) { // (the level picked was an event or a stage of one, now over)
    pickLevel(cursor);
    useLevelCar(cursor.car, cursor.amphibious);
  }
  lastOn[tab] = cursor;
  if (Tiers.on() && isOpen(cursor)) useLevelCar(LEVEL.car, LEVEL.amphibious); // (the tier rule: it goes by the side and the medals, which change)
  const open = isOpen(cursor), evil = Game.evil && !oneSided(cursor);
  bank.replaceChildren(make('small', '', 'Bank'), money(Progress.data.money));
  for (const [name, button] of Object.entries(tabBtns)) button.classList.toggle('current', name === tab);
  startScreen.classList.toggle('races', tab === 'race');
  startScreen.classList.toggle('evil', evil);

  const { list, groups } = TABS[tab], at = list.indexOf(cursor);
  const shown = Math.max(0, groups.findIndex(([a, b]) => at >= a && at < b)), [first, last] = groups[shown];
  groupBox.replaceChildren(...groups.map(([a, b], g) => {
    const special = String(groups[g][2]).startsWith('special:') ? Events.specials.find(e => 'special:' + e.id === groups[g][2]) : null;
    const events = groups[g][2] === 'events' || !!special, tierNo = events ? 0 : groups[g][2]; // (under the tiers: the stars of the tier, gold or blue)
    const button = make('button', (g === shown ? 'current' : '') + (isOpen(list[a]) || special ? '' : ' locked') + (events ? ' events' : tierNo ? (Tiers.tierIsBlue(tierNo) ? ' blue' : ' gold') : ''),
      special ? special.short : events ? 'Events' : tierNo ? '★'.repeat(Tiers.tierStars(tierNo)) : label(list[a]) + (b - a > 1 ? '–' + label(list[b - 1]) : ''));
    button.title = tierNo ? Tiers.spoken(tierNo) + (isOpen(list[a]) ? '' : ': not open yet') : isOpen(list[a]) ? '' : 'Not open yet';
    if (tierNo) button.setAttribute('aria-label', Tiers.spoken(tierNo) + (isOpen(list[a]) ? '' : ', not open yet'));
    button.addEventListener('click', () => { if (g !== shown) { blip('menuMove'); show(list[a]); } });
    return button;
  }));
  // (where the groups are a row to swipe along, the one shown is brought into it)
  const chip = groupBox.children[shown];
  if (chip && groupBox.scrollWidth > groupBox.clientWidth) groupBox.scrollTo({ left: chip.offsetLeft - (groupBox.clientWidth - chip.offsetWidth) / 2 });
  drawStage();
  drawStrip(first, last);
  drawCar();

  // the side picked, and what it means
  for (const button of sideBox.querySelectorAll('button')) {
    const on = (button.dataset.side === 'evil') === evil;
    button.classList.toggle('current', on);
    button.setAttribute('aria-pressed', on);
    button.disabled = oneSided(cursor) && button.dataset.side === 'evil';
  }
  sideNote.textContent = oneSided(cursor) ? 'This level is always played as Good.'
    : cursor.noPackages ? (evil ? 'Less time on the clock.' : 'More time on the clock.') // (a race: nothing is thrown)
      : evil ? 'Less time. Flaming packages do real damage, and the police bust you for them.'
        : 'More time. Care packages increase your social standing and gains you benefits.';
  const noCar = Tiers.on() && CAR.silhouette; // (the level's tier rule allows only cars the player has none of)
  startBtn.disabled = !open || noCar;
  startBtn.firstElementChild.textContent = !open ? 'Locked' : noCar ? 'No car' : tab === 'race' ? 'Race' : 'Start';
  // (the side's medal already earned: a replay wins only the tip. game.js asks first while the tier's level 4 is shut)
  startNote.classList.toggle('hidden', !(open && !noCar && Tiers.replayed(cursor, evil)));
};

// ---- the controls ----------------------------------------------------------------------------------------
const tabBtns = { delivery: document.getElementById('tabDelivery'), race: document.getElementById('tabRaces') };
for (const [name, button] of Object.entries(tabBtns)) button.addEventListener('click', () => showTab(name));
for (const button of sideBox.querySelectorAll('button')) button.addEventListener('click', () => pickSide(button.dataset.side === 'evil'));
shop.addEventListener('click', () => { blip('menuPick'); Garage.open(); });
startBtn.addEventListener('click', () => blip('menuPick'));

// the sheets over the menu (the options; the road card): one open at a time, closed by its button, Escape or a
// tap outside it. While one is open Enter must not start a run (Game.inMenu, as the garage)
let sheet = null, onSheetClose = null;
const openSheet = (node, onClose) => {
  closeSheet();
  sheet = node;
  onSheetClose = onClose || null;
  node.classList.remove('hidden');
  Game.inMenu = true;
  Nav.enter('sheet', closeSheet); // (the back button closes it)
  blip('menuPick');
};
const closeSheet = () => {
  if (!sheet) return;
  Nav.leave('sheet');
  sheet.classList.add('hidden');
  sheet = null;
  Game.inMenu = false;
  onSheetClose?.();
  onSheetClose = null;
};
for (const node of startScreen.querySelectorAll('.menu-sheet')) node.addEventListener('pointerdown', (e) => { if (e.target === node) closeSheet(); });
const options = document.getElementById('menuOptions');
document.getElementById('optionsBtn').addEventListener('click', () => openSheet(options));
document.getElementById('optionsCloseBtn').addEventListener('click', closeSheet);
// (the album, the milestones wall and the save code's panel open over the menu themselves, and the screensavers
// leave it: the options step aside first, ahead of the button's own doing)
for (const id of ['albumBtn', 'milestonesBtn', 'exportBtn', 'importBtn', 'screensaverBtn', 'raceWatchBtn2']) document.getElementById(id).addEventListener('click', closeSheet, true);

// "What's on this road": the level's gimmicks, pickups and traffic, with their models (render/levelcard3d.js,
// brought in only when it is first asked for: it carries the reference pages' models)
// A tap always opens the sheet, at once: the first time the card's code is still to come (and on a phone that
// can be a while), so the sheet opens with a line saying so and is filled when it has; and if it cannot be had
// (no connection; a page left open over a new version of the site, whose files are gone) or the card cannot be
// drawn, the sheet says that, and the next tap tries again. Nothing fails without a word on the screen.
const roadBox = document.getElementById('roadCard');
let roadModule = null, roadLoading = null, roadAsked = null;
// the sheet with a line in place of the card
const roadLine = (level, words) => {
  const closeBtn = make('button', 'menu-chip', 'Close');
  closeBtn.addEventListener('click', closeSheet);
  roadBox.replaceChildren(make('div', 'sheet-box road',
    make('div', 'sheet-bar', make('h2', '', 'On this road', make('small', '', label(level) + '  ' + levelName(level))), closeBtn),
    make('div', 'sheet-main', make('div', 'sheet-body', make('p', 'road-wait', words)))));
};
const roadCard = async (level) => {
  if (sheet === roadBox || !menuUp()) return; // (asked for twice; or no menu to open it over)
  // (what showRoadCard returns gives back what its models took when the sheet closes. With no renderer to be had
  // the card opens without its models: see render/modelviews.js viewRenderer)
  const fill = () => {
    try { onSheetClose = roadModule.showRoadCard(roadBox, level, closeSheet); } catch (error) {
      console.error(error);
      roadLine(level, 'This card could not be drawn.');
    }
  };
  const asked = roadAsked = {}; // (this asking: a later one, for another level, takes its place)
  if (roadModule) { openSheet(roadBox, () => roadBox.replaceChildren()); fill(); return; }
  roadLine(level, 'Loading…');
  openSheet(roadBox, () => roadBox.replaceChildren());
  try { roadModule = await (roadLoading ||= import('./levelcard3d.js')); } catch (error) {
    roadLoading = null; // (the next tap asks for it again)
    console.error(error);
    if (sheet === roadBox && roadAsked === asked) roadLine(level, 'This card could not be loaded. Check the connection, or reload the page.');
    return;
  }
  if (sheet === roadBox && roadAsked === asked && menuUp()) fill(); // (not if it was closed while on its way, or a run started)
};

// the keys. Heard ahead of the game's own (input.js: Enter is its "confirm", which starts a run), so that Enter
// starts nothing while a level not open yet is on the stage
// the level's replays (replaystore.js): the best and the last run on each side, and those saved, newest first; each
// to watch, and the saved to delete (the others to save). One made under other rules, of a changed level or car, is
// listed, saying so, but not played (replay.js check)
const replaysBox = document.getElementById('replaysCard');
const KIND_NAMES = { best: 'Best run', last: 'Last run', saved: 'Saved' };
const OUTCOME_NAMES = { delivered: 'Delivered', late: 'Too late', timeout: 'Out of time', busted: 'Busted', left: 'Left part way' };
const replaysCard = (level) => {
  if (!menuUp()) return;
  const fill = () => {
    const closeBtn = make('button', 'menu-chip', 'Close');
    closeBtn.addEventListener('click', closeSheet);
    const rows = ReplayStore.list(level.id).map(({ kind, rec }) => {
      const h = rec.header, can = Replay.check(rec);
      const what = [h.evil ? 'Evil' : 'Good', OUTCOME_NAMES[h.outcome] || h.outcome,
        h.outcome === 'delivered' && h.spare !== undefined ? formatTime(h.spare) + ' to spare' : formatTime(h.time || 0) + ' in',
        new Date(h.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })].join('  ·  ');
      const watchBtn = make('button', 'menu-chip', 'Watch');
      watchBtn.disabled = !can.ok;
      watchBtn.addEventListener('click', () => { closeSheet(); watch(rec); });
      const saved = kind !== 'saved' && ReplayStore.isSaved(rec);
      const keepBtn = make('button', 'menu-chip', kind === 'saved' ? 'Delete' : saved ? 'Saved' : 'Save');
      keepBtn.disabled = saved;
      keepBtn.addEventListener('click', async () => {
        if (kind === 'saved') {
          if (!await ask({ title: 'Delete replay', lines: ['Delete this saved replay? It cannot be brought back.'], ok: 'Delete', danger: true })) return;
          ReplayStore.remove(rec);
        } else ReplayStore.save(rec);
        if (sheet === replaysBox) fill();
        draw();
      });
      return make('div', 'replay-row' + (can.ok ? '' : ' stale'),
        make('div', 'replay-what', make('b', '', KIND_NAMES[kind]), make('span', '', what), can.ok ? null : make('small', '', can.why + ' It can no longer be played.')),
        make('div', 'replay-do', watchBtn, keepBtn));
    });
    replaysBox.replaceChildren(make('div', 'sheet-box replays',
      make('div', 'sheet-bar', make('h2', '', 'Replays', make('small', '', label(level) + '  ' + levelName(level))), closeBtn),
      make('div', 'sheet-main', make('div', 'sheet-body', ...(rows.length ? rows : [make('p', 'road-wait', 'No replays of this level.')])))));
  };
  fill();
  openSheet(replaysBox, () => replaysBox.replaceChildren());
};
// ---- a special event's screen (events.js; EVENTS-NOTES.md): the event's name, how far through it the player is and
// how long it is on; its grand prize at the left; and a row of its stages, one card each: STAGE n over its map's
// picture, the car it is driven in drawn in 3D at one pose for every card (drawStill: the real model in the side's
// livery, drawn once, not turning), what kind of car rule it is (a free try, a car needed, any car), and its state:
// READY, DONE, or what stops it. A card picks its stage for the stage below; START plays it.
const eventBox = document.getElementById('eventCard');
const STILL_POSE = { lift: 0.3, angle: -0.64, close: 1 }; // (from a little above, in front, three-quarters on, the nose to the left: every card the same)
const stillCar = (el, car, evil) => {
  try {
    const model = makeShowCar(car);
    paintShowCar(model, car, evil);
    drawStill(sharedRenderer(), el, model, STILL_POSE);
  } catch (error) { console.warn('No model for the stage card: ' + (error?.message || error)); }
};
const eventCard = (event) => {
  if (!menuUp()) return;
  const evil = Game.evil, done = Events.done(event), of = event.stages.length, prize = Events.prizeCar(event), won = Events.prizeWon(event);
  const closeBtn = make('button', 'menu-chip', 'Close');
  closeBtn.addEventListener('click', closeSheet);
  const ring = make('div', 'event-ring', make('b', '', Math.round(done / of * 100) + '%'), make('small', '', 'progress'));
  ring.style.setProperty('--share', done / of);
  const prizeView = make('div', 'event-car');
  const prizeBox = make('div', 'event-prize', make('small', '', 'Grand prize'), prizeView,
    make('div', 'event-prize-words', make('strong', '', prize ? prize.name : 'No prize'), make('span', '', won ? 'Won!' : 'Finish all ' + of + ' stages')));
  const cards = event.stages.map((stage) => {
    const st = Events.state(event, stage.index), car = stage.car ? carById(stage.car) : CAR, view = make('div', 'event-car');
    const badge = stage.free ? make('span', 'event-badge free', 'Free try') : stage.car ? make('span', 'event-badge ' + (Progress.owns(stage.car) ? 'owned' : 'needed'), (Progress.owns(stage.car) ? '✔ ' : '🔒 ') + car.name)
      : make('span', 'event-badge any', 'Any car');
    const label = st.done ? 'Done' : st.open && !st.needs ? 'Ready' : st.why;
    const card = make('button', 'event-stage' + (st.done ? ' done' : st.open && !st.needs ? ' ready' : ' shut'),
      make('span', 'event-stage-n', 'Stage ' + (stage.index + 1)), view, badge,
      make('span', 'event-stage-state', label),
      make('span', 'event-stage-map', levelName(stage.level)));
    if (LEVEL_SHOTS[stage.map]) card.style.setProperty('--shot', `url("${LEVEL_SHOTS[stage.map]}")`);
    card.addEventListener('click', () => { closeSheet(); show(stage.level); });
    return { card, view, car };
  });
  eventBox.replaceChildren(make('div', 'sheet-box event',
    make('div', 'sheet-bar', make('h2', '', event.name, make('small', '', done + '/' + of + ' stages' + (event.to ? '  ·  ends in ' + countdown(event.to - Tiers.now()) : ''))), closeBtn),
    make('div', 'sheet-main', make('div', 'sheet-body event-body', make('div', 'event-side', ring, prizeBox), make('div', 'event-row', ...cards.map(c => c.card))))));
  openSheet(eventBox, () => eventBox.replaceChildren());
  // (the cars drawn once laid out: a still each, and the prize)
  requestAnimationFrame(() => {
    for (const c of cards) if (c.car && !c.car.silhouette) stillCar(c.view, c.car, evil);
    if (prize) stillCar(prizeView, prize, evil);
  });
};
const menuUp = () => Game.state === 'start' && !startScreen.classList.contains('hidden');
window.addEventListener('keydown', (e) => {
  if (!menuUp() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (sheet) { if (e.code === 'Escape') closeSheet(); return; }
  if (Game.inMenu) return; // (the garage, the album, a save code: theirs)
  if (e.code === 'Enter') {
    const focused = document.activeElement;
    // (a button reached with the keyboard is pressed by Enter, and nothing else happens)
    if (focused && focused !== startBtn && startScreen.contains(focused) && focused.matches('button, a') && focused.matches(':focus-visible')) { e.stopPropagation(); return; }
    e.preventDefault();
    if (startBtn.disabled) e.stopPropagation();
    else blip('menuPick');
    return;
  }
  if (e.repeat && !e.code.startsWith('Arrow')) return;
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': step(-1); break;
    case 'ArrowRight': case 'KeyD': step(1); break;
    case 'ArrowUp': stepGroup(-1); break;
    case 'ArrowDown': stepGroup(1); break;
    case 'KeyT': showTab(tab === 'race' ? 'delivery' : 'race'); break;
    case 'KeyE': if (!oneSided(cursor)) pickSide(!Game.evil); break;
    case 'KeyG': Garage.open(); break;
    case 'KeyI': if (roadCard && isOpen(cursor)) roadCard(cursor); break;
    case 'KeyO': openSheet(options); break;
    default: return;
  }
  document.activeElement?.blur?.(); // (so Enter starts the run, not the last button clicked)
}, true);

// touch: a swipe sideways across the stage steps a level
{
  let from = null;
  stage.addEventListener('pointerdown', (e) => { from = e.target.closest('button') ? null : { x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointerup', (e) => {
    if (!from) return;
    const dx = e.clientX - from.x, dy = e.clientY - from.y;
    from = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { from = null; });
}

// the keys, spelled out along the foot of the screen (where there is a keyboard)
document.getElementById('buildTag').textContent = buildLabel(); // (the build, in the corner: version.js)
document.getElementById('menuKeys').replaceChildren(...[['← →', 'Level'], ['↑ ↓', 'Group'], ['T', 'Tab'], ['E', 'Good / Evil'], ['G', 'Garage'], ['I', 'On this road'], ['O', 'Options'], ['Enter', 'Start']]
  .map(([key, does]) => make('span', '', make('kbd', '', key), does)));

// ---- for a picture (see the top of the file) -------------------------------------------------------------
if (params.get('tab') === 'races') { tab = 'race'; cursor = TABS.race.list[0]; if (!isRace(LEVEL)) { selectLevel(LEVELS.indexOf(cursor)); useLevelCar(cursor.car, cursor.amphibious); } } // (?tab=races: the menu opens on the races, for a check)
if (params.get('side') === 'evil') Game.evil = true; // (not saved)
if (params.get('cursor')) { cursor = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Number(params.get('cursor')) - 1))]; tab = tabOf(cursor); if (isOpen(cursor)) show(cursor); }
if (params.get('options') !== null) openSheet(options);
if (params.get('road') !== null) setTimeout(() => roadCard(cursor), 0); // (once main.js has had its say: ?pick=)
// ?do=key:ArrowRight,key:KeyE,click:%23startBtn,swipe:left ... : the menu worked from the address, one step every
// 150 ms (a key pressed, a button clicked, the stage swiped), to check the controls where nobody can press them
if (params.get('do')) {
  const point = (type, x) => stage.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: 200 }));
  params.get('do').split(',').forEach((token, n) => setTimeout(() => {
    const [what, arg] = token.split(':');
    if (what === 'key') document.body.dispatchEvent(new KeyboardEvent('keydown', { code: arg, key: arg.replace(/^Key/, '').toLowerCase(), bubbles: true, cancelable: true }));
    else if (what === 'click') document.querySelector(arg)?.click();
    else if (what === 'swipe') { point('pointerdown', 400); point('pointerup', arg === 'left' ? 250 : 550); }
  }, 150 * (n + 1)));
}

export const MenuStage = {
  // the level picked has changed elsewhere (a run's end, a reset, a save brought in): the stage shows it
  follow() { cursor = LEVEL; tab = LEVELS.includes(LEVEL) ? tabOf(LEVEL) : tab; draw(); },
  closeSheet,
};
