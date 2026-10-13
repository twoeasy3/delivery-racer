// ---- the start screen's level select, car and side: the game's front end ---------------------------------
// One screen, nothing scrolls. The level picked is the STAGE: its picture large, its number and name, its
// description for the side picked, its clock, tip and best times with their medals, and (in the HUD's round window) the cargo it carries. Under it the STRIP: the
// levels of its group, to step through; over it the groups, and over those the tabs (Events, Career, Races): the
// same control one level up each time. Beside the stage the car (a way into the showroom), the side (Good or
// Evil: Evil recolours the screen) and START.
// Still only a menu: stepping to a level marks it (selectLevel); the level is built when a run starts
// (Game.start), and nothing here reloads the page. A level not open yet can be stepped to and looked at, but
// it is never the level picked, and START is off while it is on the stage.
// Keys: left / right (A / D) a level, up / down a group, T the next tab, E the other side, G the showroom,
// I what's on this road, O the options, Enter start. Touch: swipe the stage sideways, or tap the strip.
// For a picture: ?cursor=47 puts that level on the stage, open or not (?pick= opens them all first: see
// main.js); ?side=evil shows the Evil side for the visit; ?options opens the options; ?road the road card.
import { sheetUp } from '../lite.js';
import '../menu2.css';
import { LEVELS, LEVEL, selectLevel, selectSpecial, levelLabel, MAIN_LEVELS, AMPHIBIOUS_LEVELS, DELIVERY_LEVELS, RACE_LEVELS, isRace } from '../levels.js';
import { levelName, levelDescription } from '../levelText.js';
import { cargoFor } from '../cargo.js';
import { cargoCircleView } from './cargoview.js';
import { CARS, CAR, useLevelCar, earnedFor, amphibiousCars, stars, starColour, carById, listRule, ruleAllows } from '../cars.js';
import { Progress } from '../progress.js';
import { Tiers, tierStarsNode, richTiers } from '../tiers.js';
import { Events } from '../events.js';
import { Ecu } from '../ecu.js';
import { eventPacks, featuredOf, packName, describePack, contents, percent } from '../packs.js';
import { packArt } from './packart.js';
import { openContents, closeContents } from './packcontents.js';
import { Nav } from '../nav.js';
import { buildLabel } from '../version.js';
import { Game, formatTime, clockFor } from '../game.js';
import { medalFor, medalNeeds } from '../levelinfo.js';
import { Garage, makeShowCar, paintShowCar, IDEA_TAG } from './garage.js';
import { standView, sharedRenderer, disposeViews, drawViews } from './modelviews.js';
import { stillCar } from './carstill.js';
import { Showroom } from './showroom.js';
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
// Three tabs (the owner, 13-Oct: "Events, Career (fka Deliveries), Races"): the events, the career (the delivery
// levels: its id is still 'delivery', as the save, the code and ?tab= know it) and the races (the circuits: see
// RACE_LEVELS). On each, the levels in groups of five (the main delivery levels, then the special ones, then the
// amphibious ones, each kind starting a group of its own; the races five at a time). The Events tab is built below
// (buildTabs), under the tiers only; with nothing in it, its button is not shown
const TABS = { event: { list: [], groups: [] }, delivery: { list: DELIVERY_LEVELS, groups: [] }, race: { list: RACE_LEVELS, groups: [] } };
const TAB_ORDER = ['event', 'delivery', 'race'];
for (let i = 0; i < MAIN_LEVELS.length; i += 5) TABS.delivery.groups.push([i, Math.min(MAIN_LEVELS.length, i + 5)]);
{
  const specials = DELIVERY_LEVELS.length - AMPHIBIOUS_LEVELS.length;
  for (let i = MAIN_LEVELS.length; i < specials; i += 5) TABS.delivery.groups.push([i, Math.min(specials, i + 5)]);
  for (let i = specials; i < DELIVERY_LEVELS.length; i += 5) TABS.delivery.groups.push([i, Math.min(DELIVERY_LEVELS.length, i + 5)]);
}
for (let i = 0; i < RACE_LEVELS.length; i += 5) TABS.race.groups.push([i, Math.min(RACE_LEVELS.length, i + 5)]);
// (the level tiers, tiers.js. The EVENTS tab: first ONE group, 'events', of every event that is a single level (the owner,
// 13-Oct: "collapse the single level events into one tab, before Comet Hunt"): the one-level events on now (tiers.js
// eventLive, by the device's clock) and the special events of exactly one stage (the Car Hunt), one entry each; then
// each special event of more stages (the Comet Hunt), a group of its own, 'special:<id>'. The CAREER tab, in the
// table's order: a group a tier, then the levels outside them in runs of one kind, five at most (the specials, S, and
// the amphibious, A). A group's third item is its tier number, 'events' or 'special:<id>'.)
// Built again when the events on change (draw)
let liveKey = null;
const stagesOf = (e) => e.stages.map(s => s.level).filter(Boolean);
// (a special event of exactly one stage (the Car Hunt) is a single-level event: listed among them, and drawn as one, on the
// full level card with its extras on it (eventExtras); one of more stages (the Comet Hunt) has its event screen (eventPanel))
const oneStage = (event) => !!event && stagesOf(event).length === 1;
const buildTabs = () => {
  if (!Tiers.on()) return;
  const live = Tiers.liveEvents(), specials = Events.shownSpecials(), key = [...live, ...specials].map(x => x.id).join(); // (a recurring event is listed between its runs too)
  if (key === liveKey) return;
  liveKey = key;
  const singles = specials.filter(oneStage), series = specials.filter(e => stagesOf(e).length > 1);
  const events = [...live, ...singles.map(e => stagesOf(e)[0])], eventGroups = [];
  if (events.length) eventGroups.push([0, events.length, 'events']);
  for (const e of series) { const n = stagesOf(e).length; eventGroups.push([events.length, events.length + n, 'special:' + e.id]); events.push(...stagesOf(e)); }
  TABS.event.list = events;
  TABS.event.groups = eventGroups;
  const list = [...Tiers.order.filter(level => !Tiers.isEvent(level)), ...DELIVERY_LEVELS.filter(level => !Tiers.order.includes(level))], groups = [];
  let i = 0;
  Tiers.tiers.forEach((tier, k) => { if (tier.length) { groups.push([i, i + tier.length, k + 1]); i += tier.length; } });
  const kind = (level) => AMPHIBIOUS_LEVELS.includes(level) ? 2 : 1;
  while (i < list.length) { let j = i + 1; while (j < list.length && j - i < 5 && kind(list[j]) === kind(list[i])) j++; groups.push([i, j]); i = j; }
  TABS.delivery.list = list;
  TABS.delivery.groups = groups;
};
buildTabs();
// the Events tab's first group, of the single-level events (or null: none on)
const singlesGroup = () => (TABS.event.groups[0]?.[2] === 'events' ? TABS.event.groups[0] : null);
const inSingles = (level) => { const g = singlesGroup(), k = TABS.event.list.indexOf(level); return !!g && k >= g[0] && k < g[1]; };
// the level picked: a menu level by its place; a special event's stage is not in the menu's lists (events.js)
const pickLevel = (level) => { if (Events.isStage(level)) selectSpecial(level); else selectLevel(LEVELS.indexOf(level)); };
// a special event's stage, said on its card: what stops it, or the car it is driven in (events.js)
const stageLine = (level) => {
  const { event, stage } = Events.stageOf(level), st = Events.state(event, stage.index), car = stage.car ? carById(stage.car) : null;
  if (!st.open) return st.why;
  if (st.needs) return 'Needs the ' + st.needs.name + ': own it to play this stage';
  const rule = !car && level.allowedCars ? listRule(level) : null; // (a rule of its own: the Car Hunt's 3-star cars)
  if (rule) return 'Only ' + rule.label + ', both sides: the showroom opens on them'; // ({tier:n} tokens: richTiers)
  const tried = event.days ? Events.freeTry(event) : null; // (a rotating event: any car you own, or its featured car's free try)
  if (tried) return tried.on ? 'Free try: the ' + tried.car.name + ' at your ECU ' + tried.ecu + ' of ' + tried.max : 'Any car you own, or the ' + tried.car.name + ' as a free try';
  return stage.free ? 'Free try: driven in the ' + car.name + ', owned or not' : car ? 'Driven in your ' + car.name : 'Any car you own';
};
// how long until an event ends, for its card: "3d 4h", "5h 12m", "9m 30s"
const countdown = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : m + 'm ' + (s % 60) + 's';
};
const ends = (at) => { const p = make('p', 'event-ends countdown', 'Ends in ' + countdown(at - Tiers.now())); p.dataset.end = at; return p; };
// a special event's countdown (Events.countdownOf: 'Ends in' while on, a recurring one's 'Next in' between its runs), by
// the events' clock (Events.now: ?eventsnow= moves it)
const eventCount = (c) => {
  if (!c) return null;
  const p = make('p', 'event-ends countdown' + (c.words === 'Next in' ? ' next' : ''), c.words + ' ' + countdown(c.at - Events.now()));
  p.dataset.end = c.at; p.dataset.words = c.words; p.dataset.clock = 'events';
  return p;
};
// (each second: the countdowns on the card; an event just over or just begun, and the menu is drawn again)
setInterval(() => {
  for (const node of document.querySelectorAll('#stage .countdown')) {
    const left = Number(node.dataset.end) - (node.dataset.clock === 'events' ? Events.now() : Tiers.now());
    if (left <= 0) { draw(); return; }
    node.textContent = (node.dataset.words || 'Ends in') + ' ' + countdown(left);
  }
}, 1000);
// (a level's tab: an event's (one on, a special event's stage listed) is the Events tab, else a race's, else the career)
const tabOf = (level) => isRace(level) ? 'race' : TABS.event.list.includes(level) ? 'event' : 'delivery';
// (under the tiers a level's number is its place in its tier, 1 to 5; its kind says which tier)
// (in the Events tab's first group, its place there: the one-level events and the one-stage special events numbered together)
const label = (level) => inSingles(level) ? String(TABS.event.list.indexOf(level) + 1) : Events.isStage(level) ? String(level.stage.index + 1) : Tiers.on() && Tiers.place(level) ? String(Tiers.place(level).pos)
  : Tiers.on() && Tiers.isEvent(level) ? String(Math.max(0, Tiers.liveEvents().indexOf(level)) + 1) : levelLabel(LEVELS.indexOf(level)); // (outside the tiers: S1, A1... in the menu's order, tiers.js)
// what kind of level it is, for the plate over its picture
const kindOf = (level) => isRace(level) ? 'Race' : Events.isStage(level) ? (inSingles(level) ? 'Event' : 'Stage') : Tiers.on() && Tiers.isEvent(level) ? 'Event' : Tiers.on() && Tiers.outsideLabel(level)?.startsWith('S') ? 'Special' : Tiers.on() && Tiers.place(level) ? tierStarsNode(Tiers.place(level).tier) : AMPHIBIOUS_LEVELS.includes(level) ? 'Amphibious' : MAIN_LEVELS.includes(level) ? 'Level' : 'Special';
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
  if (name === tab || !TABS[name].list.length) return; // (the Events tab with nothing in it is not shown)
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
    : rule !== null ? (CAR.silhouette ? 'You own no ' + Tiers.tierName(rule) + ' car: buy one at Crazey Jim’s to play this level (the cheapest is the ' + cheapest.name + ', ' + money(cheapest.price) + ')'
        : 'No medal on ' + (evil ? 'Evil' : 'Good') + ' yet: only ' + Tiers.tierName(rule) + ' cars may be driven. Earn it and any car will do on this side')
    : level.car ? 'Driven in the ' + CAR.name + ': your own car returns on other levels'
      : level.amphibious ? (CAR.amphibious ? 'Amphibious cars only: you drive your ' + CAR.name
        : 'Needs an amphibious car: get the ' + cheapestAmphibious().name + ' (' + money(cheapestAmphibious().price) + ') at Crazey Jim’s')
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
  const event = Tiers.on() && Tiers.isEvent(level) ? Tiers.eventOf(level) : null;
  // (a special event of one stage, the Car Hunt: the full level card, with the event's extras drawn on it: eventExtras)
  const single = Events.isStage(level) && oneStage(Events.stageOf(level).event) ? Events.stageOf(level).event : null;
  const extras = single ? eventExtras(single, level, open) : null;
  const info = make('div', 'info',
    extras?.tags,
    make('h2', '', single ? (single.title || single.name) : levelName(level)), // (the event's name, as the strip says it; its road under it)
    single ? make('p', 'cx-road', 'On ' + levelName(level)) : null,
    open && words ? make('p', 'desc', words) : null,
    open ? make('div', 'facts',
      fact('Clock', formatTime(clockFor(level, evil)) + (oneSided(level) ? ' (always Good)' : '')),
      fact('Tip', money(level.tip)),
      fact('Best to spare', best === undefined ? 'Not delivered yet' : formatTime(best))) : null,
    needs ? make('p', 'needs' + (open && !Game.canStart ? ' warn' : '') + (extras?.ruleLine && open ? ' cx-rule' : ''), ...richTiers(needs)) : null, // (cx-rule: said by the card's rule badge too; a phone leaves the line out)
    extras?.tasks || null,
    // (an event: how long it is on for, and its reward)
    event?.to ? ends(event.to) : null,
    single ? eventCount(Events.countdownOf(single)) : null,
    event?.reward ? make('p', 'prize', 'Reward: ' + Tiers.rewardWords(level) + (Tiers.rewardClaimed(level) ? ' (yours)' : ' for delivering it on time')) : null,
    open && place ? make('p', 'prize', tierStarsNode(place.tier), ' medals ' + Tiers.tierMedals(place.tier) + '/' + Tiers.tiers[place.tier - 1].length * 2) : null,
    prizeLine ? make('p', 'prize', prizeLine) : null,
    open && roadCard ? make('div', 'road', // (the card's chips: the row placed as the one chip was)
      make('button', 'menu-chip road-btn', 'What’s on this road'),
      open && ReplayStore.list(level.id).length ? make('button', 'menu-chip replays', 'Replays') : null) : null);
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
  stage.replaceChildren(shot, plate, ribbon, ...(cargo ? [cargo] : []), ...(extras ? [extras.node] : []), info, ...arrows, ...(toggle ? [toggle] : []));
  // (a new level slides in; the other side only swaps the words)
  stage.className = 'menu-stage' + (open ? '' : ' locked') + (extras ? ' has-extras' + (extras.car ? '' : ' no-car') + (extras.tasks ? ' has-tasks' : '') : '') + (drawn && !sameLevel ? ' enter' : drawn && drawn !== key ? ' flip' : '');
  if (extras) requestAnimationFrame(extras.draw); // (its car's still, once laid out)
  if (toggle) paintToggle();
  drawn = key;
};

// the strip: the levels of the group shown, each a small picture with its number, name and a pip for each side's medal
// (a one-stage special event among the single-level events: the event's name, not its map's)
const thumbName = (level) => (inSingles(level) && Events.isStage(level) ? Events.stageOf(level).event.short : levelName(level));
const drawStrip = (first, last) => {
  const list = TABS[tab].list;
  strip.replaceChildren(...list.slice(first, last).map((level) => {
    const open = isOpen(level);
    const pips = make('span', 'pips', ...(open ? (oneSided(level) ? [false] : [false, true]).map(evil =>
      make('i', (evil ? 'evil ' : 'good ') + (medalFor(level, evil, Progress.bestTime(level.id, evil)) || 'none'))) : []));
    const thumb = make('button', 'thumb' + (level === cursor ? ' current' : '') + (open ? '' : ' locked'),
      make('b', '', label(level)), pips, make('span', 'name', thumbName(level)));
    if (LEVEL_SHOTS[shotId(level)]) thumb.style.backgroundImage = `url("${LEVEL_SHOTS[shotId(level)]}")`;
    else thumb.classList.add('none');
    thumb.title = open ? thumbName(level) : thumbName(level) + ': not open yet';
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
    const covered = sheetUp(); // (What's inside or the pack reveal is up: <html>.sheet-up, lite.js; the menu's 3D car and cargo are not drawn under it)
    if (!menuUp()) { dropCargo(); return; } // (a run has started: what the circle took is given back)
    if (Garage.isOpen || covered) return;
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
      make('span', 'go', 'Crazey Jim’s'));
    shop.title = 'This level needs a car of exactly its tier: buy one at Crazey Jim’s Used Cars';
    return;
  }
  const fig = LEVEL.ownEcu && LEVEL.car === CAR.id ? Ecu.drive(CAR) : CAR; // (a free try: the figures it is driven with, at the player's ECU; else the car's own, as ever)
  const starSpan = make('span', 'stars', CAR.tier ? stars(CAR) : IDEA_TAG.text);
  starSpan.style.color = CAR.tier ? starColour(CAR) : IDEA_TAG.colour;
  shop.replaceChildren(picture,
    make('span', 'words',
      make('strong', '', CAR.name + ' ', CAR.tier || (CAR.idea && !CAR.event) ? starSpan : null),
      bar('Speed', Math.round(fig.maxSpeed * 3.6) + ' km/h', fig.maxSpeed / MOST.speed),
      bar('Accel', String(Math.round(fig.accel * 10) / 10), fig.accel / MOST.accel),
      bar('Health', String(Math.round(fig.health)), fig.health / MOST.health)),
    make('span', 'go', LEVEL.car ? (LEVEL.ownEcu ? 'Free try · ECU ' + Math.max(1, Ecu.reached(CAR)) + '/' + Ecu.max(CAR) : 'This level’s own vehicle') : 'Showroom'));
  shop.title = LEVEL.ownEcu ? 'Today\u2019s free try, lent at your ECU: open the showroom to drive your own car instead (G)'
    : LEVEL.car ? 'You must use this vehicle on this level. Your own car returns on other levels.' : 'Open the showroom to pick a car (G)';
};

export const draw = () => {
  buildTabs(); // (an event may have started or ended)
  // (the level picked may have changed behind the menu's back: a run's Next level, a save brought in. The stage
  // follows it, unless it is showing a level not open yet, which is never the level picked)
  if (isOpen(cursor) && cursor !== LEVEL && LEVELS.includes(LEVEL)) { cursor = LEVEL; tab = tabOf(LEVEL); }
  if (!TABS[tab].list.length) tab = 'delivery'; // (the Events tab emptied: every event over, or the tiers off)
  if (!TABS[tab].list.includes(cursor)) cursor = TABS[tab].list.includes(lastOn[tab]) ? lastOn[tab] : TABS[tab].list.find(isOpen) || TABS[tab].list[0];
  const over = (Tiers.isEvent(LEVEL) && !Tiers.eventLive(LEVEL)) || (Events.isStage(LEVEL) && !Events.live(Events.stageOf(LEVEL).event));
  if (over && isOpen(cursor) && cursor !== LEVEL) { // (the level picked was an event or a stage of one, now over)
    pickLevel(cursor);
    useLevelCar(cursor.car, cursor.amphibious);
  }
  lastOn[tab] = cursor;
  for (const e of Events.specials) if (e.days) Events.syncTry(e); // (a rotating event's free try follows the day: its stage's car lock)
  if (Tiers.on() && isOpen(cursor)) useLevelCar(LEVEL.car, LEVEL.amphibious); // (the tier rule: it goes by the side and the medals, which change)
  const open = isOpen(cursor), evil = Game.evil && !oneSided(cursor);
  bank.replaceChildren(make('small', '', 'Bank'), money(Progress.data.money));
  for (const [name, button] of Object.entries(tabBtns)) button.classList.toggle('current', name === tab);
  markEventsTab();
  startScreen.classList.toggle('races', tab === 'race');
  startScreen.classList.toggle('evil', evil);

  const { list, groups } = TABS[tab], at = list.indexOf(cursor);
  const shown = Math.max(0, groups.findIndex(([a, b]) => at >= a && at < b)), [first, last] = groups[shown];
  groupBox.replaceChildren(...groups.map(([a, b], g) => {
    const special = String(groups[g][2]).startsWith('special:') ? Events.specials.find(e => 'special:' + e.id === groups[g][2]) : null;
    const events = groups[g][2] === 'events' || !!special, tierNo = events ? 0 : groups[g][2]; // (under the tiers: the stars of the tier, gold or blue)
    // (the single-level events' group is open while any of its events is: its first may be a recurring one between runs)
    const button = make('button', (g === shown ? 'current' : '') + (isOpen(list[a]) || events ? '' : ' locked') + (events ? ' events' : tierNo ? (Tiers.tierIsBlue(tierNo) ? ' blue' : ' gold') : ''),
      special ? special.short : events ? 'Events' : tierNo ? '★'.repeat(Tiers.tierStars(tierNo)) : label(list[a]) + (b - a > 1 ? '–' + label(list[b - 1]) : ''));
    button.title = tierNo ? Tiers.spoken(tierNo) + (isOpen(list[a]) ? '' : ': not open yet') : special ? special.name : events ? 'The single-level events' : isOpen(list[a]) ? '' : 'Not open yet';
    if (tierNo) button.setAttribute('aria-label', Tiers.spoken(tierNo) + (isOpen(list[a]) ? '' : ', not open yet'));
    button.addEventListener('click', () => { if (g !== shown) { blip('menuMove'); show(special ? (Events.next(special) || special.stages[special.stages.length - 1]).level : list.slice(a, b).find(isOpen) || list[a]); } }); // (an event: the stage to play next; the single-level events: the first open)
    return button;
  }));
  // (where the groups are a row to swipe along, the one shown is brought into it)
  const chip = groupBox.children[shown];
  if (chip && groupBox.scrollWidth > groupBox.clientWidth) groupBox.scrollTo({ left: chip.offsetLeft - (groupBox.clientWidth - chip.offsetWidth) / 2 });
  // (a stage of a special event of more stages picked: its screen, in place of the level card and the strip. A special event
  // of ONE stage, the Car Hunt, is a single-level event: the level card with its extras (drawStage), the strip under it)
  const special = Events.stageOf(cursor)?.event, series = special && !oneStage(special) ? special : null;
  startScreen.classList.toggle('eventview', !!series);
  if (series) {
    drawn = null;
    const left = stage.querySelector('.event-row')?.scrollLeft || 0; // (the row where it was scrolled to: picking a card draws it again)
    stage.replaceChildren(eventPanel(series, cursor, Game.evil && !oneSided(cursor)));
    const row = stage.querySelector('.event-row'), picked = row?.querySelector('.picked');
    if (row) {
      row.scrollLeft = left;
      if (picked && (picked.offsetLeft < row.scrollLeft || picked.offsetLeft + picked.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = picked.offsetLeft - 8; // (the card picked in view)
    }
  } else {
    drawStage();
    drawStrip(first, last);
  }
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
const tabBtns = { event: document.getElementById('tabEvents'), delivery: document.getElementById('tabDelivery'), race: document.getElementById('tabRaces') };
for (const [name, button] of Object.entries(tabBtns)) button.addEventListener('click', () => showTab(name));
// the Events tab: shown only with something in it (under the tiers); a dot on it (the Shop chip's: shop.css .shop-dot) while
// an event on now is not done yet: a one-level event with no medal on it, a special event with a stage open to play and
// not done, a recurring one (played again and again, never done for good) while a run is on and it was never delivered
const eventsDot = make('span', 'shop-dot tab-dot');
tabBtns.event.append(eventsDot);
const eventWaiting = () => TABS.event.list.some(level => {
  if (Tiers.isEvent(level)) return Tiers.eventLive(level) && !Tiers.beaten(level);
  const at = Events.stageOf(level);
  if (!at || !Events.live(at.event)) return false;
  if (at.event.days) return Events.tasksLeft(at.event) > 0; // (a rotating event: a task of the day still to pay)
  if (at.event.repeat) return Events.done(at.event) === 0;
  const st = Events.state(at.event, at.stage.index);
  return st.open && !st.done && !st.needs;
});
const markEventsTab = () => {
  tabBtns.event.hidden = !TABS.event.list.length;
  const waiting = eventWaiting();
  eventsDot.hidden = !waiting;
  tabBtns.event.title = 'Events: on for a while only' + (waiting ? '. Something on is not done yet' : '');
};
for (const button of sideBox.querySelectorAll('button')) button.addEventListener('click', () => { // (either half is a toggle: the one already on flips to the other, unless the level is one-sided)
  const evil = button.dataset.side === 'evil';
  pickSide(evil === Game.evil ? (oneSided(cursor) ? Game.evil : !evil) : evil);
});
// (the car card: the showroom, where a car is picked; with no car the level allows, straight to the car lot to buy one)
shop.addEventListener('click', () => { blip('menuPick'); if (Tiers.on() && CAR.silhouette) Garage.open(); else Showroom.open(); });
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
// ---- a special event's screen (events.js; EVENTS-NOTES.md): with one of its stages picked, it takes the place of the
// level card and the strip (the owner: the main way into an event). Its name, how far through it the player is and
// how long it is on; its grand prize; a row of its stages, one card each: STAGE n over its map's picture, the car it
// is driven in drawn in 3D at one pose for every card (drawStill: the real model in the side's livery, drawn once,
// not turning; kept as a picture, so picking another card does not draw them again), what kind of car rule it is (a
// free try, a car needed, any car), and its state: READY, DONE, or what stops it. A card picks its stage; under the
// row, the stage picked: its map, clock, tip, best time, what it is driven in; START plays it.
// (stillCar: render/carstill.js, which the showroom's cards share)
const eventPanel = (event, picked, evil) => {
  const done = Events.done(event), of = event.stages.length, prize = Events.prizeCar(event), won = Events.prizeWon(event);
  const drawLater = [];
  let head;
  if (event.repeat) head = huntHead(event, drawLater); // (a recurring event, played again and again: its car and its pack, no progress)
  else {
    const ring = make('div', 'event-ring', make('b', '', Math.round(done / of * 100) + '%'), make('small', '', 'progress'));
    ring.style.setProperty('--share', done / of);
    const prizeView = make('div', 'event-car');
    head = make('div', 'event-head',
      make('div', 'event-title', make('h2', '', event.name), make('p', '', done + '/' + of + ' stages done'), event.to ? ends(event.to) : null),
      ring,
      make('div', 'event-prize', make('small', '', 'Grand prize'), prizeView,
        make('div', 'event-prize-words', make('strong', '', prize ? prize.name : 'No prize'), make('span', '', won ? 'Won!' : 'Finish all ' + of + ' stages'))));
    if (prize) drawLater.push([prizeView, prize]);
  }
  const cards = event.stages.map((stage) => {
    const rule = !stage.car && stage.level?.allowedCars ? listRule(stage.level) : null; // (a rule of its own: the Car Hunt's 3-star cars)
    // (any car: the player's own, not one a picked stage lends; under a rule, the car the rule puts them in, or none drawn
    // when they own no car it allows: the card then says so, as the menu's own car panel does)
    const fits = rule ? (stage.level === LEVEL && !CAR.silhouette ? CAR : [carById(Progress.data.car), ...Progress.data.cars.map(carById)].find(c => c && !c.silhouette && ruleAllows(rule, c)) || null) : null;
    const st = Events.state(event, stage.index), car = stage.car ? carById(stage.car) : rule ? fits : carById(Progress.data.car) || CAR, view = make('div', 'event-car');
    const owned = stage.car && Progress.owns(stage.car);
    const badge = stage.free ? make('span', 'event-badge free', 'Free try') : stage.car ? make('span', 'event-badge ' + (owned ? 'owned' : 'needed'), (owned ? '✔ ' : '🔒 ') + car.name)
      : rule ? make('span', 'event-badge rule', ...richTiers(rule.label), ' only') : make('span', 'event-badge any', 'Any car');
    const again = !!event.repeat; // (a recurring event's stage: never done for good, READY whenever it is on)
    const card = make('button', 'event-stage' + (st.done && !again ? ' done' : st.open && !st.needs ? ' ready' : ' shut') + (stage.level === picked ? ' picked' : ''),
      make('span', 'event-stage-n', again ? 'Every run: a pack' : 'Stage ' + (stage.index + 1)), view, badge,
      make('span', 'event-stage-state', ...(st.done && !again ? ['Done'] : !st.open ? [st.why] : st.needs ? [st.why] : rule && !fits ? ['No ', ...richTiers(rule.label.replace(/ cars$/, '')), ' car yet'] : ['Ready'])),
      make('span', 'event-stage-map', levelName(stage.level)));
    if (LEVEL_SHOTS[stage.map]) card.style.setProperty('--shot', `url("${LEVEL_SHOTS[stage.map]}")`);
    card.addEventListener('click', () => { if (stage.level !== cursor) { blip('menuMove'); show(stage.level); } });
    if (car && !car.silhouette) drawLater.push([view, car]);
    return card;
  });
  // the stage picked
  const at = Events.stageOf(picked), open = isOpen(picked), best = Progress.bestTime(picked.id, evil);
  const roadBtn = open && roadCard ? make('button', 'menu-chip road-btn', 'What’s on this road') : null;
  const replaysBtn = open && ReplayStore.list(picked.id).length ? make('button', 'menu-chip replays', 'Replays') : null;
  roadBtn?.addEventListener('click', () => roadCard(picked));
  replaysBtn?.addEventListener('click', () => replaysCard(picked));
  const detail = make('div', 'event-detail',
    make('h3', '', (event.repeat ? '' : 'Stage ' + (at.stage.index + 1) + ': ') + levelName(picked)),
    make('div', 'facts', fact('Clock', formatTime(clockFor(picked, evil))), fact('Tip', money(picked.tip)), fact('Best to spare', best === undefined ? 'Not delivered yet' : formatTime(best))),
    make('p', 'needs' + (open && !Game.canStart ? ' warn' : ''), ...richTiers(stageLine(picked))),
    roadBtn || replaysBtn ? make('div', 'road', roadBtn, replaysBtn) : null);
  // (the row scrolls sideways with no scroll bar: a swipe, the mouse wheel, or the arrows at its ends, a card at a time;
  // an arrow shows only where there is more that way)
  const row = make('div', 'event-row', ...cards), back = make('button', 'event-arrow back', '‹'), on = make('button', 'event-arrow on', '›');
  const arrows = () => { back.hidden = row.scrollLeft < 4; on.hidden = row.scrollLeft + row.clientWidth > row.scrollWidth - 4; };
  const by = (dir) => row.scrollBy({ left: dir * ((cards[0]?.offsetWidth || 200) + 10), behavior: 'smooth' });
  back.addEventListener('click', () => by(-1));
  on.addEventListener('click', () => by(1));
  row.addEventListener('scroll', arrows, { passive: true });
  row.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && row.scrollWidth > row.clientWidth) { row.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  // (a mouse swipes it too: held and dragged; a drag is not a click on the card it began on)
  let drag = null;
  row.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, left: row.scrollLeft, moved: 0 }; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x));
    if (drag.moved > 5) { row.scrollLeft = drag.left - (e.clientX - drag.x); row.classList.add('dragging'); }
  });
  window.addEventListener('pointerup', () => { if (drag) setTimeout(() => { drag = null; row.classList.remove('dragging'); }, 0); });
  row.addEventListener('click', (e) => { if (drag?.moved > 5) { e.stopPropagation(); e.preventDefault(); } }, true);
  requestAnimationFrame(arrows);
  const panel = make('div', 'event-panel', head, make('div', 'event-rowbox', row, back, on), detail);
  requestAnimationFrame(() => { for (const [el, car, side = evil] of drawLater) stillCar(el, car, side); }); // (once laid out)
  return panel;
};
// ---- a RECURRING event's head, on the event screen of a recurring event of MORE stages (the Car Hunt, of one stage, is drawn
// on the level card now: eventExtras; the owner 13-Oct: "Display the car, and the pack reward on the event card"):
// its name, how it recurs and its countdown (Ends in / Next in), the car it hunts (the car its pack features, drawn
// still in its Good livery, as the Comet Hunt's prize) and the pack every run gives (its art, the Shop's; a tap or its
// "What's inside" opens the pack's sheet, render/packcontents.js, with the x1 / x3 odds)
// what a special event offers, from its definition alone (events.json: its stage's car rule, its prize, how it recurs; packs.json:
// the pack it gives, `every` run first, and the car that pack features): { give, car, hunt, odds, rule, often }. car: the car
// its pack features (hunt: true; odds: its blueprint chances, 'x1 90% · x3 10%'), else its grand prize (events.json prize.car)
const extrasOf = (event) => {
  const day = event.days ? Events.dayOf(event) : null; // (a rotating event: the day's featured car and pack, the Concept Strike)
  const packs = eventPacks(event.id), give = day ? packs.find(p => p.id === day.pack) || null : packs.find(p => p.every) || packs[0] || null;
  const featured = give ? featuredOf(give.id) : [], hunted = featured[0]?.car || null;
  let odds = '';
  if (hunted) {
    const c = contents(give.id, { featured }), lines = (c?.featured || []).filter(f => f.car === hunted && !f.key && f.inPlay);
    odds = lines.length ? lines.map(f => 'x' + (f.amount ?? 1) + ' ' + percent(f.lastSlot)).join(' · ') : 'Car maxed';
  }
  const first = event.stages[0], rule = first?.level?.allowedCars && !first.car ? listRule(first.level) : null;
  const r = event.repeat, often = day ? 'Mon to Sat, a car a day' : r ? (r.every === 7 ? r.live + ' days a week' : r.live + ' days every ' + r.every) : '';
  return { give, car: hunted || Events.prizeCar(event), hunt: !!hunted, odds, rule, often, day };
};
// a pack's art as a button, and its What's inside: both open the pack's sheet (render/packcontents.js)
const packButtons = (id) => {
  const inside = () => { blip('menuPick'); openInside(id); };
  const art = make('button', 'event-pack-art', packArt(id));
  art.title = 'What’s inside the ' + packName(id);
  art.addEventListener('click', inside);
  const link = make('button', 'menu-chip event-inside', 'What’s inside');
  link.addEventListener('click', inside);
  return { art, link };
};
const huntHead = (event, drawLater) => {
  const { give, car, hunt, odds, rule, often } = extrasOf(event);
  const title = make('div', 'event-title', make('h2', '', event.name),
    make('p', '', 'Recurring: ' + often), eventCount(Events.countdownOf(event)),
    rule ? make('p', 'event-rule', ...richTiers(rule.label), ' only') : null);
  const out = [title];
  if (car && hunt) {
    const view = make('div', 'event-car');
    out.push(make('div', 'event-prize event-hunt', make('small', '', 'Hunt car'), view,
      make('div', 'event-prize-words', make('strong', '', car.name), make('span', '', 'Blueprints: ' + odds))));
    drawLater.push([view, car, false]); // (its Good livery, whatever the side)
  }
  if (give) {
    const { art, link } = packButtons(give.id);
    out.push(make('div', 'event-prize event-pack', make('small', '', 'Reward'), art,
      make('div', 'event-prize-words', make('strong', '', packName(give.id)), make('span', '', give.every ? 'Every run: a ' + packName(give.id) : describePack(give.id)), link)));
  }
  return make('div', 'event-head hunt', ...out);
};
// ---- a special event of ONE stage on the full level card (the owner, 13-Oct: "Since it is a single event, render the full
// event card and draw the extras on it"). drawStage draws the level card as for any single-level event (Christmas Eve: the
// picture, EVENT n, the medals, the cargo, the name, the clock, tip and best time, the countdown, START), and these on it,
// each from the event's definition (extrasOf), each left out where the event has none:
//   tags, over the name: the stage's state (LIVE NOW, or SHUT between runs / before or after it), its car rule (a badge
//     with the stars: "★★★ cars only"), how it recurs;
//   the prize, at the card's right (a phone: a row over the words): the car it hunts (the car its pack features, drawn
//     still in its Good livery, its name and stars, its blueprint odds) or its grand prize car; and the pack it gives,
//     its art tilted over the car's corner with a ribbon ("Every run" for a pack on every delivery), a tap or its
//     What's inside opening the pack's sheet.
// { node, tags, car, draw } (draw: the car's still, once laid out)
const PRIZE_POSE = { lift: 0.3, angle: -0.64, fov: 30, margin: 0.94 }; // (the event cards' pose, carstill.js STILL_POSE, framed tight: the car fills its picture)
const eventExtras = (event, level, open) => {
  const { give, car, hunt, odds, rule, often, day } = extrasOf(event);
  const st = Events.state(event, level.stage.index);
  const tried = day ? Events.freeTry(event) : null; // (a rotating event's featured car: its free try, at the player's own ECU)
  let tryBtn = null;
  if (tried && st.open) {
    tryBtn = make('button', 'menu-chip cx-try' + (tried.on ? ' on' : ''), tried.on ? 'Free try ON · ECU ' + tried.ecu + '/' + tried.max : 'Free try · ECU ' + tried.ecu + '/' + tried.max);
    tryBtn.title = tried.on ? 'Driving the ' + car.name + ' as a free try at your ECU: tap to drive your own car' : 'Drive the ' + car.name + ' free, at the ECU your blueprints reach (its key: deliver it at ECU ' + tried.max + ')';
    tryBtn.setAttribute('aria-pressed', tried.on);
    tryBtn.addEventListener('click', () => { blip('menuPick'); Events.setFreeTry(event, !tried.on); useLevelCar(level.car, level.amphibious); draw(); });
  }
  const tags = make('div', 'cx-tags',
    make('span', 'cx-tag ' + (st.open ? 'live' : 'shut'), st.open ? 'Live now' : 'Closed'),
    rule ? make('span', 'cx-tag rule', ...richTiers(rule.label), ' only') : null,
    often ? make('span', 'cx-tag often', '↻ ' + often) : null);
  const view = car ? make('div', 'event-car cx-still') : null;
  const prize = car ? make('div', 'cx-car',
    view,
    make('small', 'cx-label', day ? 'Featured car' + (Progress.owns(car.id) ? ' · key owned' : '') : hunt ? 'Hunt car' : 'Grand prize'),
    make('div', 'cx-name', make('strong', '', car.name), car.tier || car.rating ? make('span', 'cx-stars', stars(car)) : null),
    make('span', 'cx-odds', hunt ? 'Blueprints ' + odds : Events.prizeWon(event) ? 'Won!' : 'Deliver it on time to win it'), tryBtn) : null;
  prize?.querySelector('.cx-stars')?.style.setProperty('color', starColour(car));
  let pack = null;
  if (give) {
    const { art, link } = packButtons(give.id);
    pack = make('div', 'cx-pack',
      make('div', 'cx-art', art, make('span', 'cx-ribbon', give.every ? 'Every run' : give.day ? 'Tasks' : give.prize ? 'Prize' : 'Reward')),
      make('div', 'cx-pack-words', make('small', 'cx-label', 'Reward'), make('strong', '', packName(give.id)),
        make('span', '', give.every ? 'Every run: a ' + packName(give.id) : give.day ? (day?.live ? 'From today\'s tasks' : 'From ' + new Date(day.start).toLocaleDateString('en-GB', { weekday: 'long' }) + '\'s tasks') : describePack(give.id)), link));
  }
  const node = make('div', 'card-extras' + (open ? '' : ' shut'), prize, pack);
  // (a rotating event: the day's tasks, each with its reward and how often it has paid this run: events.js tasks)
  const list = day && st.open ? Events.tasks(event) : [];
  const tasks = list.length ? make('ol', 'cx-tasks', ...list.map(x => make('li', x.done ? 'done' : '',
    make('span', 'cx-task-words', x.words), make('span', 'cx-task-reward', x.reward + ' · ' + (x.task.key ? (x.done ? 'won' : '0/1') : x.count + '/' + x.limit + ' today'))))) : null;
  return { node, tags, car, tasks, ruleLine: !!rule && !st.needs, draw: () => { if (view && node.isConnected) stillCar(view, car, false, PRIZE_POSE); } }; // (its Good livery, whatever the side)
};
// a pack's What's inside over the menu (render/packcontents.js, as the Shop opens it); Enter starts nothing while it is up,
// Escape closes it
let insideUp = null;
const openInside = (id) => {
  const sheet = openContents(document.body, { kind: id, title: packName(id), featured: featuredOf(id) });
  if (!sheet) return;
  insideUp = sheet; Game.inMenu = true;
  const gone = new MutationObserver(() => { if (!sheet.isConnected) { gone.disconnect(); if (insideUp === sheet) { insideUp = null; Game.inMenu = false; } } });
  gone.observe(document.body, { childList: true });
};
window.addEventListener('keydown', (e) => { if (insideUp && e.code === 'Escape') { e.stopPropagation(); closeContents(); } }, true);
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
    case 'KeyT': { // (the next tab with something in it, round again after the last)
      const tabs = TAB_ORDER.filter(name => TABS[name].list.length);
      showTab(tabs[(tabs.indexOf(tab) + 1) % tabs.length]);
      break;
    }
    case 'KeyE': if (!oneSided(cursor)) pickSide(!Game.evil); break;
    case 'KeyG': Showroom.open(); break;
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
document.getElementById('menuKeys').replaceChildren(...[['← →', 'Level'], ['↑ ↓', 'Group'], ['T', 'Tab'], ['E', 'Good / Evil'], ['G', 'Showroom'], ['I', 'On this road'], ['O', 'Options'], ['Enter', 'Start']]
  .map(([key, does]) => make('span', '', make('kbd', '', key), does)));

// ?event=car-hunt (main.js, after ?eventsnow= has set the events' clock): that special event's screen, on the stage to play
// next (a recurring one's only stage), for a look; nothing is saved by it
export const showEvent = (id) => {
  const event = Events.specials.find(e => e.id === String(id));
  if (!event) return false;
  buildTabs();
  const level = (Events.next(event) || event.stages[event.stages.length - 1])?.level;
  if (!level || !TABS.event.list.includes(level)) return false; // (on the Events tab: show puts the menu there)
  show(level);
  return true;
};
// ---- for a picture (see the top of the file) -------------------------------------------------------------
if (params.get('tab') === 'races') { tab = 'race'; cursor = TABS.race.list[0]; if (!isRace(LEVEL)) { selectLevel(LEVELS.indexOf(cursor)); useLevelCar(cursor.car, cursor.amphibious); } } // (?tab=races: the menu opens on the races, for a check)
if (params.get('tab') === 'events' && TABS.event.list.length) show(TABS.event.list.find(isOpen) || TABS.event.list[0]); // (?tab=events: the menu opens on the events, for a check)
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
  follow() { cursor = LEVEL; tab = LEVELS.includes(LEVEL) || Events.isStage(LEVEL) ? tabOf(LEVEL) : tab; draw(); }, // (a stage's run: back on the Events tab)
  closeSheet,
};
