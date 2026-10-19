// ============================================================================
// PROGRESSIVE UNLOCK: THE FEATURE GATES (a prototype for the owner, PROGRESSIVE-UNLOCK.md). The owner, 16-Oct: "Let's progressively
// unlock parts of the game for a new player." One table, GATES: what a brand-new save sees, and when the rest appears.
// Behind a switch, OFF unless asked (render/progressui.js draws it): ?progress=new for a visit, ?progress=new:on to remember it in this
// browser, ?progress=off to forget it, ?progress=all to see everything for a visit (a tester's escape hatch).
//
// THE SAVE (Progress.data.seen, an array of gate ids whose introduction was seen; a few dozen bytes):
//  - LEGACY: a save with no `seen` and ANY progress (a delivery, a level open, money, a car, a pack, a blueprint, an event stage, Evil
//    picked...: hasProgress) is an existing player's: EVERY gate is open, nothing is written. No flag: the rule reads the save as it is.
//  - NEW: a save with no `seen` and no progress (a brand-new one, or an old one that never did anything) is given `seen: []` the first
//    time the gates look at it (switch on): from then on it climbs the ladder. A gate is open once its trigger holds or it is in `seen`
//    (so a gate never closes again, whatever the bank does).
// Losing `seen` (a cookie-only restore, a save code: neither carries it) makes a save with progress read as LEGACY: everything shown,
// never anything hidden from a player who had it.
// Menu only: no rule of a run reads this (vite.config.js NOT_RULES). Good and Evil are BOTH open from the start (the owner, 16-Oct: "I want
// Evil to be selectable from the start"): no gate touches the side, its switch, its medals or Progress.data.evil.
// ============================================================================
import { LEVELS, isRace } from './levels.js';

// ---- the switch (as render/rides.js's ?nudge) ----
export const KEY = 'delivery.progress';
// 'off' | 'on' | 'all' for this visit (search: location.search)
export const gatesMode = (search = typeof location !== 'undefined' ? location.search : '') => {
  const v = new URLSearchParams(search).get('progress');
  try {
    if (v === 'new:on') localStorage.setItem(KEY, '1');
    if (v === 'off') localStorage.removeItem(KEY);
  } catch { /* (no storage: the visit's switch alone) */ }
  if (v === 'off') return 'off';
  if (v === 'all') return 'all';
  if (v === 'new' || v === 'new:on') return 'on';
  try { return localStorage.getItem(KEY) === '1' ? 'on' : 'off'; } catch { return 'off'; }
};

// ---- what the save says ----
const CAREER = new Set(LEVELS.filter(level => !isRace(level)).map(level => level.id));
// career levels delivered, on either side (a best time is only written for a delivery: progress.js levelDone)
export const deliveries = (d) => new Set([...Object.keys(d?.bestTime?.good || {}), ...Object.keys(d?.bestTime?.evil || {})].filter(id => CAREER.has(id))).size;
const some = (o) => !!o && typeof o === 'object' && Object.values(o).some(v => (typeof v === 'number' ? v > 0 : !!v));
// anything an existing player could miss: a level delivered or open, money, a car, a pack, a blueprint, an event stage, Evil picked
export const hasProgress = (d) => !!d && (deliveries(d) > 0 || d.unlocked > 1 || d.money > 0 || (Array.isArray(d.cars) && d.cars.length > 1)
  || d.evil === true || some(d.events) || some(d.blueprints) || some(d.packs) || (Array.isArray(d.packLog) && d.packLog.length > 0)
  || (Array.isArray(d.claimed) && d.claimed.length > 0) || d.shopCash > 0 || some(d.ecuBought) || some(d.packBuys));
export const isProgressive = (d) => Array.isArray(d?.seen);
export const isLegacy = (d) => !isProgressive(d) && hasProgress(d);
const owned = (d) => (Array.isArray(d.cars) ? d.cars.length : 1);

// ---- THE LADDER, in order. Each: id, label, trigger (over Progress.data), intro (one short line), hides (what is not drawn while it is
// shut: CSS selectors, render/progressui.js), mark (the thing the introduction points at: a dot on it until seen; null: the card only).
// A gate with no `hides` only introduces (the thing is always there). ----
export const GATES = [
  { id: 'cars', label: 'Better cars', trigger: d => deliveries(d) >= 1, intro: 'Your bank buys cars. Tap your car.',
    hides: [], mark: '#shop' },
  { id: 'replays', label: 'Replays', trigger: d => deliveries(d) >= 2, intro: 'Watch and save your runs.',
    hides: ['#watchBtn', '#saveReplayBtn', '#stage .replays'], mark: null },
  { id: 'style', label: 'Style', trigger: d => owned(d) >= 2 || deliveries(d) >= 3, intro: 'Wheels, plates and more: Showroom, Style.',
    hides: ['#menuOptions section.wheels', '#showroom .sr-cosm'], mark: '#shop' },
  { id: 'races', label: 'Races', trigger: d => deliveries(d) >= 4, intro: 'Lapped circuits, any time.',
    hides: ['#tabRaces'], mark: '#tabRaces' },
  { id: 'shop', label: 'Shop', trigger: d => deliveries(d) >= 5 || some(d.packs) || (Array.isArray(d.packLog) && d.packLog.length > 0),
    intro: 'Card packs. One free every day.', hides: ['#shopBtn', '#showroom .sr-shop', '#cashBtn'], mark: '#shopBtn' },
  { id: 'blueprints', label: 'Blueprints', trigger: d => some(d.blueprints) || deliveries(d) >= 6, intro: 'Blueprints unlock cars and ECU upgrades.',
    hides: ['#jimBtn', '#showroom .sr-card.ov-blueprint', '#showroom .sr-card.ov-key'], mark: '#jimBtn' },
  { id: 'events', label: 'Events', trigger: d => deliveries(d) >= 7 || some(d.events), intro: 'Car Hunts and events, on for a while.',
    hides: ['#tabEvents'], mark: '#tabEvents' },
  { id: 'extras', label: 'Extras', trigger: d => deliveries(d) >= 8, intro: 'Postcards, milestones, hidden levels.',
    hides: ['#menuOptions section.pg-extras'], mark: '#optionsBtn' },
  { id: 'editor', label: 'Editors', trigger: d => deliveries(d) >= 10, intro: 'Build your own road: Options.',
    hides: ['#menuOptions .editor-link'], mark: '#optionsBtn' },
];
export const GATE_IDS = GATES.map(g => g.id);
// Good vs Evil in two words each, inside the switch's halves for a save on the ladder (render/progressui.js): the Driving Lesson's line
// "Good gives gifts. Evil throws fire." and the menu's side note ("More time..." / "Less time...") said shortly. Not a gate
export const SIDE_HINTS = { good: 'gifts · more time', evil: 'fire · less time' };
export const gateOf = (id) => GATES.find(g => g.id === id);

// EVERY MENU SECTION (the front screen, the Options sheet, the Garage (under Options since CHECKLIST 451), the results, the showroom), each with its gate or 'always', and, when
// the gate's `hides` do not name it, where it is hidden from (the check holds that nothing on the menu is left out:
// scripts/.featuregates-check.mjs reads delivery/index.html for the ids): [selector, label, gate, via?]
const X = 'in #menuOptions section.pg-extras';
export const SECTIONS = [
  ['#tabDelivery', 'Career tab', 'always'], ['#tabEvents', 'Events tab and its dot', 'events'], ['#tabRaces', 'Races tab', 'races'],
  ['#bank', 'Bank', 'always'], ['#shopBtn', 'Shop chip (card packs, daily pack dot)', 'shop'], ['#jimBtn', 'Jim chip (blueprint stall)', 'blueprints'],
  ['#optionsBtn', 'Options', 'always'], ['#levelGroups', 'Tier chips', 'always'], ['#stage', 'Level card', 'always'], ['#levels', 'Level strip', 'always'],
  ['#shop', 'Car card (Showroom: pick and buy)', 'always'], ['#raceMenu', 'Race chips', 'races', 'shown on the Races tab only'],
  ['#raceClassBtn', 'Race cars', 'races', 'in #raceMenu'], ['#raceTrackBtn', 'Race track', 'races', 'in #raceMenu'], ['#raceWatchBtn', 'Race screensaver (Races tab)', 'races', 'in #raceMenu'],
  ['#optionsCloseBtn', 'Options: Close', 'always'], ['#unlockAllBtn', 'Unlock mode: Everything', 'always'], ['#unlockAbsBtn', 'Unlock mode: Absolutely everything', 'always'],
  ['#garageBtn', 'Options: Garage', 'always'],
  ['#garageTabBtn', 'Garage: Garage tab', 'always'], ['#ideasTabBtn', 'Garage: Car ideas', 'always'], ['#garageBackBtn', 'Garage: Back', 'always'],
  ['#garageAction', 'Garage: Switch / Buy', 'always'], ['#garageUse', 'Garage: Use', 'always'], ['#garageInspect', 'Garage: Inspect', 'always'],
  ['#sideBtn', 'Good / Evil switch (both halves, from the start)', 'always'], ['#sideNote', 'Side note', 'always'], ['#startBtn', 'Start', 'always'],
  ['#stage .replays', 'Replays chip', 'replays'], ['#stage .ribbon .half.evil', 'Evil medal', 'always'],
  ['#emojiMarkBtn', 'Side emoji marks', 'always'],
  ['#muteBtn', 'Sound', 'always'], ['#touchBtn', 'On-screen controls', 'always'], ['#autoGasBtn', 'Auto accelerate', 'always'],
  ['#autoBrakeBtn', 'Auto brake', 'always'], ['#verbosityBtn', 'Verbosity', 'always'], ['#ghostBtn', 'Ghost', 'always'], ['#cineBtn', 'Cutscenes', 'always'], ['#wheelsOpenBtn', 'Customise wheels (Cosmetics)', 'style', 'in #menuOptions section.wheels'],
  ['#albumBtn', 'Postcards', 'extras', X], ['#milestonesBtn', 'Milestones', 'extras', X], ['#hiddenLevelsBtn', 'Hidden levels (the Driving Lesson too)', 'extras', X],
  ['#screensaverBtn', 'Screensaver', 'extras', X], ['#raceWatchBtn2', 'Race screensaver', 'extras', X], ['#screensaverLink', 'Screensaver link', 'extras', X],
  ['#menuOptions a[href="?racewatch"]', 'Race screensaver link', 'extras', X],
  ['#menuOptions a[href="powerups.html"]', 'Guide: Power-ups', 'always'], ['#menuOptions a[href="gimmicks.html"]', 'Guide: Gimmicks', 'always'],
  ['#menuOptions a[href="cargo.html"]', 'Guide: Cargo', 'always'], ['#menuOptions a[href="sides.html"]', 'Guide: Good & Evil', 'always'],
  ['#menuOptions a[href="police.html"]', 'Guide: Police', 'always'], ['#menuOptions .editor-link', 'Level editor, Model editor', 'editor'],
  ['#exportBtn', 'Export save', 'always'], ['#importBtn', 'Import save', 'always'], ['#completeBtn', 'Unlock everything', 'always'],
  ['#cashBtn', 'Add Crazey Cash', 'shop'], ['#resetBtn', 'Reset progress', 'always'],
  ['#restartBtn', 'Results: Retry', 'always'], ['#menuBtn', 'Results: Continue / Menu', 'always'],
  ['#watchBtn', 'Results: Watch replay', 'replays'], ['#saveReplayBtn', 'Results: Save replay', 'replays'],
  ['#showroom .sr-shop', 'Showroom: Shop', 'shop'], ['#showroom .sr-cosm', 'Showroom: Style', 'style'],
  ['#showroom .sr-card.ov-blueprint', 'Showroom: blueprint cars', 'blueprints'], ['#showroom .sr-card.ov-key', 'Showroom: key cars', 'blueprints'],
];

// ---- the state ----
// open gates for a save in a mode ('off' | 'on' | 'all'): a Set of ids
export const openGates = (d, mode = 'on') => {
  if (mode !== 'on' || !d || isLegacy(d)) return new Set(GATE_IDS); // (switch off, or 'all'; an existing player's save: everything)
  const seen = new Set(isProgressive(d) ? d.seen : []);
  return new Set(GATES.filter(g => seen.has(g.id) || g.trigger(d)).map(g => g.id));
};
export const visible = (id, d, mode = 'on') => id === 'always' || openGates(d, mode).has(id);
// the gates open and not introduced yet, in the ladder's order (none for a legacy save, or with the switch off)
export const pendingIntros = (d, mode = 'on') => {
  if (mode !== 'on' || !isProgressive(d)) return [];
  const seen = new Set(d.seen);
  return GATES.filter(g => !seen.has(g.id) && g.trigger(d));
};
// a brand-new save starts the ladder (switch on): true if `seen` was given now (the caller saves)
export const adopt = (d) => {
  if (!d || isProgressive(d) || hasProgress(d)) return false;
  d.seen = [];
  return true;
};
// an introduction seen (or a gate opened by hand): kept in the save, once each, known ids only
export const markSeen = (d, ids) => {
  if (!isProgressive(d)) return false;
  const before = d.seen.length;
  d.seen = [...new Set([...d.seen.filter(id => GATE_IDS.includes(id)), ...[].concat(ids).filter(id => GATE_IDS.includes(id))])];
  return d.seen.length !== before;
};
// the save's `seen` checked as it is read (anything else in it dropped; not an array: left alone, that save is not on the ladder)
export const cleanSeen = (d) => { if (d && d.seen !== undefined) { if (Array.isArray(d.seen)) d.seen = [...new Set(d.seen.filter(id => GATE_IDS.includes(id)))]; else delete d.seen; } };
