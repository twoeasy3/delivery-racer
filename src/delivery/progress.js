// ============================================================================
// PROGRESS - what the player has earned and unlocked, kept in a cookie so it is still
// there next time. Everything that reads or writes saved progress goes through here, so
// the storage can be swapped (e.g. for Capacitor Preferences) without touching the game.
// ============================================================================
import { LEVELS, isRace } from './levels.js';
const COOKIE = 'delivery_racer_progress';
const ONE_YEAR = 60 * 60 * 24 * 365;
// Saved progress counts unlocked levels by position (see LEVELS), so it remembers which order of
// levels it was saved with. Each new order put a level in among the others: a save from before
// that had opened that position or beyond opens one more. Order 2 put Suburbia in at position 8,
// ahead of All Heck and Asteroid Run (now S1 and S2); order 3, Canberra at 9; order 4, Monte Carlo
// at 10; order 5, Singapore at 11; order 6, Singapore II at 12; order 7, Sydney to Kiama at 13;
// order 8, Passage du Gois at 14; order 9, Safari at 15; order 10, Airport at 16; order 11,
// Construction Site at 17; order 12, The Hood at 18; order 13, Panorama Avenue at 19; order 14,
// Speed Trap Alley at 20; order 15, Mountain Pass at 21; order 16, Outback Express at 22; order 17,
// Tour de Coast at 23; orders 18 to 20, Ring Road, Market Town and Quarry Run at 24 to 26; orders 21 to
// 25, Hong Kong Harbour, Tokyo Expressway, Mumbai Monsoon, Stelvio Pass and Christmas Eve at 27 to 31.
// Order 26 put the five amphibious levels in at 41 to 45: after every delivery level there was, ahead only of the
// circuits, which are races and always open. A save from before that counted past 40 had delivered the last
// special level, and so has the first amphibious level open and no more: it is held at 41 ({ cap }).
// Orders 27 to 29 put the first levels of the new themes (Toy Room, Twenty Thousand Leaks, Tranquility Base:
// THEME_LEVELS) in at 32 to 34: they are ordinary numbered levels, after the last of the old ones and ahead of the
// special levels. Orders 30 to 32: Thrill Park, Cinder Island and Dock Run at 35 to 37. EVERY level added to
// THEME_LEVELS needs its place added here, one order each. Orders 33 to 35: Quiet on Set, Acqua Alta and Northern
// Lights went in at 35 to 37, ahead of those three (now 38 to 40). The next goes in where it sits in the list.
// Orders 36 to 38: High Noon, Favela Heights and Emerald Steps at 41 to 43.
// (batch E) Orders 39 to 43: the second levels Toy Box Derby, Seaquake, Far Side, Stunt Double and Seven Bridges at
// 44 to 48, after Emerald Steps and ahead of the special levels. (Another batch's entries for the same places can simply follow or
// come before these, as they are: each level put in ahead of the specials moves a save that had reached them on one)
// (batch F) Orders 44 to 46: After Hours, Eruption Day and Cattle Drive at 49 to 51, after those five.
// (Order 27 was, for a few hours on 10-Oct and never on the live site, a cap at 46 with those levels after the
// amphibious ones: no save was made with it outside a developer's machine.)
// Order 47: Spring Thaw at 52, after those three; order 48: Hot Zone (the fallout level) at 53, after it.
const INSERTED_AT = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, { cap: 41 }, 32, 33, 34, 35, 36, 37, 35, 36, 37, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]; // (for orders 2, 3, ...)
const LEVEL_ORDER = INSERTED_AT.length + 1;

// races (the lapped levels, on the menu's Races tab) are always open, and never hold up the delivery levels: the
// count of open levels is always carried on past any race at its edge
const pastRaces = (unlocked) => { while (unlocked < LEVELS.length && isRace(LEVELS[unlocked - 1])) unlocked++; return unlocked; };
const fresh = () => ({
  money: 0,        // tips banked
  unlocked: 1,     // how many levels are open, counting from the first
  bestTime: { good: {}, evil: {} }, // most time to spare delivering each level (s, by level id), for each side
  cars: ['commuter'], // ids of the cars owned
  car: 'commuter', // id of the car in use
  muted: false,    // sound switched off
  touch: null,     // on-screen controls: true / false once chosen on the menu; null = on for touch screens
  autoGas: false,  // auto accelerate: the accelerator held down by itself, unless braking
  raceClass: 'f1', // the cars every race is run in: 'f1', 'gt' (GT road cars) or 'lmp' (Le Mans prototypes)
  raceTrack: 'marina-bay', // the race screensaver's circuit: a lapped level's id, or 'all' (each in turn)
  tankPieces: 0,   // TANK RAGE pieces found so far (0-4), carried from one level to the next
  evil: false,     // the side picked on the menu
  stats: {},       // milestone counters, by name (packagesLanded, copsOutrun, kmDriven...: see milestones.js), across every run
  levelOrder: LEVEL_ORDER, // the order of levels `unlocked` counts by
  tierBase: null,  // the levels open (by position) when the tiers (tiers.js) were first looked at: they stay open. null: not yet
  tierCars: {},    // the car last picked for each tier's levels while their medal is not earned, by tier (the player's own pick, `car`, is kept apart)
});

// The save is kept in local storage (BACKUP: the store of record, read first, the whole save, as big as it
// likes). The cookie is only a fallback, should local storage go or not be there at all, and holds the short of
// it: what is open, the bank, the cars, the switches (cookieText). Not the best times nor the counters, which
// grow with every level: a browser drops a cookie over 4096 bytes without a word and keeps the old one, and the
// whole save in the cookie had reached 3882 bytes with 60 levels. A cookie from before, holding everything, is
// still read as it is. scripts/.save-check.mjs saves and loads a full save of 100 levels and 80 cars
const BACKUP = 'delivery_racer_progress_backup';
const savedCopies = () => {
  const copies = [];
  try {
    const backup = localStorage.getItem(BACKUP);
    if (backup) copies.push(JSON.parse(backup));
  } catch { /* (no storage, or a broken copy: the cookie, if there is one) */ }
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
    if (match) copies.push(JSON.parse(decodeURIComponent(match[1])));
  } catch { /* (an unreadable cookie) */ }
  // (local storage's, if it has one that can be read; the cookie's only if not)
  return copies.filter(c => c && typeof c === 'object' && !Array.isArray(c));
};
const read = () => {
  try {
    // (each copy in turn: one that reads as JSON but cannot be restored does not hide a good one behind it)
    for (const saved of savedCopies()) { try { return restore(saved); } catch { /* (the next copy) */ } }
    return fresh();
  } catch {
    return fresh(); // an unreadable cookie counts as no progress
  }
};
// a save as it was written (by any older version of the game), brought up to date
const restore = (saved) => {
  {
    const data = { ...fresh(), ...saved };
    data.bestTime = { good: {}, evil: {}, ...saved.bestTime }; // (a save from before best times has none)
    data.stats = { ...(saved.stats || {}) }; // (nor counters)
    data.tierCars = { ...(saved.tierCars && typeof saved.tierCars === 'object' ? saved.tierCars : {}) };
    // (the Commuter and the Darkvan were saved as 'hatch' and 'coupe')
    const RENAMED = { hatch: 'commuter', coupe: 'darkvan' };
    data.cars = [...new Set(data.cars.map(id => RENAMED[id] || id))];
    data.car = RENAMED[data.car] || data.car;
    delete data.best; // (best tips, no longer kept)
    for (let order = saved.levelOrder || 1; order < LEVEL_ORDER; order++) {
      const at = INSERTED_AT[order - 1];
      const moved = (n) => typeof at === 'object' ? Math.min(n, at.cap) : n >= at ? n + 1 : n;
      data.unlocked = moved(data.unlocked);
      if (typeof data.tierBase === 'number') data.tierBase = moved(data.tierBase); // (the levels the tiers keep open move with the others)
    }
    data.levelOrder = LEVEL_ORDER;
    data.unlocked = pastRaces(data.unlocked);
    return data;
  }
};
// The save as text. Best times are kept to 0.1 s (all the menu shows) and the bank to the cent: a run leaves
// both with fifteen decimal places, which is what took the cookie to its cap
const SAVE_STEP = { time: 0.1, money: 0.01 };
const rounded = (value, step) => Math.round(value / step) / Math.round(1 / step);
const saveText = (data) => JSON.stringify({
  ...data,
  money: rounded(data.money, SAVE_STEP.money),
  bestTime: Object.fromEntries(Object.entries(data.bestTime).map(([side, times]) =>
    [side, Object.fromEntries(Object.entries(times).map(([id, t]) => [id, rounded(t, SAVE_STEP.time)]))])),
});
// The cookie's share of the save (see BACKUP above): never over COOKIE_ROOM bytes as written, whatever the save
// holds. Should even the list of cars be too long for it (hundreds of them), it goes down to the car in use
const COOKIE_KEYS = ['money', 'unlocked', 'levelOrder', 'cars', 'car', 'tankPieces', 'evil', 'muted', 'touch', 'autoGas', 'raceClass', 'raceTrack'];
const COOKIE_ROOM = 3600; // bytes of cookie value (the cap is 4096 for the name, the value and its attributes)
const cookieText = (data) => {
  const short = Object.fromEntries(COOKIE_KEYS.map(key => [key, key === 'money' ? rounded(data.money, SAVE_STEP.money) : data[key]]));
  for (const cars of [short.cars, [...new Set(['commuter', short.car])]]) {
    const text = encodeURIComponent(JSON.stringify({ ...short, cars }));
    if (text.length <= COOKIE_ROOM) return text;
  }
  return encodeURIComponent(JSON.stringify({ unlocked: short.unlocked, levelOrder: short.levelOrder })); // (a car or a class with an absurd name: what is open, at least)
};
// A save code: the save as one line of text to copy out of one browser and into another (the menu's Export
// save and Import save: see render/savecode.js). CODE_MARK says what it is and which version of the code
const CODE_MARK = 'DR1.';
// a save out of a code is not trusted: only what a save can hold is kept, each thing checked for what it is
// (it is built from nothing, key by key: whatever else the code holds is dropped, not saved for ever)
const CODE_LONGEST = 20000; // characters: a full save's code is about 4,000
const tidy = (saved) => {
  const number = (v, least) => typeof v === 'number' && isFinite(v) ? Math.max(least, v) : undefined;
  const word = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v);
  const clean = {};
  clean.money = number(saved.money, 0) ?? 0;
  clean.unlocked = Math.floor(number(saved.unlocked, 1) ?? 1);
  clean.levelOrder = Math.floor(number(saved.levelOrder, 1) ?? 1);
  if (number(saved.tierBase, 1) !== undefined) clean.tierBase = Math.floor(number(saved.tierBase, 1));
  clean.tierCars = Object.fromEntries(Object.entries(saved.tierCars && typeof saved.tierCars === 'object' ? saved.tierCars : {}).filter(([k, v]) => /^d{1,2}$/.test(k) && word(v)).slice(0, 12));
  clean.tankPieces = Math.floor(number(saved.tankPieces, 0) ?? 0);
  clean.cars = [...new Set(['commuter', ...(Array.isArray(saved.cars) ? saved.cars : []).filter(word)])].slice(0, 200);
  clean.car = word(saved.car) ? saved.car : 'commuter';
  clean.bestTime = {};
  for (const side of ['good', 'evil']) { // (a time for a level there is, and no other)
    const times = saved.bestTime && typeof saved.bestTime === 'object' ? saved.bestTime[side] : null;
    clean.bestTime[side] = Object.fromEntries(Object.entries(times && typeof times === 'object' ? times : {})
      .filter(([id, t]) => typeof t === 'number' && isFinite(t) && LEVELS.some(level => level.id === id)));
  }
  for (const key of ['muted', 'autoGas', 'evil']) if (typeof saved[key] === 'boolean') clean[key] = saved[key];
  if (typeof saved.touch === 'boolean') clean.touch = saved.touch;
  for (const key of ['raceClass', 'raceTrack']) if (word(saved[key])) clean[key] = saved[key];
  // (the counters: numbers by name, and no more of them than there could be)
  clean.stats = Object.fromEntries(Object.entries(saved.stats && typeof saved.stats === 'object' && !Array.isArray(saved.stats) ? saved.stats : {})
    .filter(([key, n]) => word(key) && typeof n === 'number' && isFinite(n) && n >= 0).slice(0, 100));
  return clean;
};

const COUNT_SAVE_EVERY = 5000; // ms between saves of the milestone counters during a run (see Progress.count)
export const Progress = {
  data: read(),

  // the save read again from where it is kept (as when the page loads)
  reload() { this.data = read(); },
  // the save as it is written (see saveText)
  saved() { return saveText(this.data); },
  // the save as a code, to take to another browser
  exportCode() {
    return CODE_MARK + btoa(String.fromCharCode(...new TextEncoder().encode(this.saved())));
  },
  // ...and a code brought in, in place of the progress here. False: not a save code (nothing is changed)
  importCode(code) {
    try {
      const text = String(code).replace(/\s+/g, '');
      if (!text.startsWith(CODE_MARK) || text.length > CODE_LONGEST) return false;
      const bytes = Uint8Array.from(atob(text.slice(CODE_MARK.length)), c => c.charCodeAt(0));
      const saved = JSON.parse(new TextDecoder().decode(bytes));
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return false;
      if (typeof saved.unlocked !== 'number' || !Array.isArray(saved.cars)) return false; // (some other JSON)
      this.data = restore(tidy(saved));
      this.noSave = false; // (a save brought in replaces everything such a visit lent)
      this.save();
      return true;
    } catch {
      return false; // (not base64, or not JSON)
    }
  },
  // True on a visit that began from one of the address bar's test switches (?autostart, ?pick, ?car, a hidden
  // level...: main.js sets it). Such a visit lends cars and opens levels by writing them into `data`, so nothing
  // of it is written down: not by a counter, a delivery, the garage or anything else
  noSave: false,
  save() {
    this.countDirty = false;
    if (this.noSave) return;
    const text = this.saved();
    try { localStorage.setItem(BACKUP, text); } catch { /* (no storage: the cookie alone, and the short of the save) */ }
    document.cookie = COOKIE + '=' + cookieText(this.data) + '; max-age=' + ONE_YEAR + '; path=/; SameSite=Lax';
  },
  // a level delivered on time: bank the tip, remember the best time to spare (for the side it was
  // played on), open the next level. True: that was a new best
  levelDone(index, id, tip, spare, evil) {
    this.data.money += tip;
    const side = this.data.bestTime[evil ? 'evil' : 'good'];
    const record = !(side[id] >= spare);
    if (record) side[id] = spare;
    if (!isRace(LEVELS[index])) this.data.unlocked = Math.max(this.data.unlocked, pastRaces(index + 2)); // (a race won opens nothing)
    this.save();
    return record;
  },
  // the best time to spare on a level, for a side (undefined: not delivered on that side yet)
  bestTime(id, evil) { return this.data.bestTime[evil ? 'evil' : 'good'][id]; },
  // a milestone counter (see milestones.js) bumped by n (kept to two decimal places: the save is a cookie).
  // Saved lazily: at most once every COUNT_SAVE_EVERY ms, and flush() writes what is pending (at the end
  // of a run). onCount, if set, hears of every bump: (key, before, after)
  onCount: null,
  countSaved: 0,   // ms when the counters were last saved
  countDirty: false,
  count(key, n = 1) {
    const before = this.data.stats[key] || 0, after = Math.round((before + n) * 100) / 100;
    this.data.stats[key] = after;
    if (this.onCount) this.onCount(key, before, after);
    const now = Date.now();
    if (now - this.countSaved >= COUNT_SAVE_EVERY) { this.countSaved = now; this.save(); } else this.countDirty = true;
  },
  flush() { if (this.countDirty) this.save(); },
  // (an earned car, a 6-star one, is owned once its level's par is beaten: see earned(); a free one, a car idea,
  // always: it is never written into `cars`, so the save, and its cookie, are no bigger for there being thirty)
  owns(carId) {
    return this.data.cars.includes(carId) || this.earnedCars.some(car => car.id === carId && this.earned(car)) ||
      this.freeCars.some(car => car.id === carId);
  },
  // the cars that are free and always open (set by cars.js: the car ideas, ideas.js)
  freeCars: [],
  // the cars that are earned, not bought (set by cars.js: { id, earned: { level, par: { good, evil? } } })
  earnedCars: [],
  // true: the car's level has been delivered with at least its par's seconds to spare, on every side the par names
  earned(car) {
    const { level, par } = car.earned, best = this.data.bestTime;
    return (best.good[level] ?? -Infinity) >= par.good && (par.evil === undefined || (best.evil[level] ?? -Infinity) >= par.evil);
  },
  // returns false if the player can't afford it
  buy(car) {
    if (this.owns(car.id)) return true;
    if (this.data.money < car.price) return false;
    this.data.money -= car.price;
    this.data.cars.push(car.id);
    this.save();
    return true;
  },
  // a finished game, all at once: every level open and delivered for its full tip, every
  // car in the garage bought, and a full bank (the "Unlock everything" button on the menu)
  // (best times are only ever earned)
  complete({ levels, cars, money }) {
    this.data.unlocked = Math.max(this.data.unlocked, levels);
    for (const id of cars) if (!this.data.cars.includes(id)) this.data.cars.push(id);
    this.data.money = Math.max(this.data.money, money);
    this.save();
  },
  useCar(carId) {
    if (!this.owns(carId)) return;
    this.data.car = carId;
    this.save();
  },
  reset() {
    this.data = fresh();
    this.noSave = false; // (nothing lent is left in it)
    this.save(); // (the backup too: a reset is meant)
  },
};

// (a save already there gets its backup at once, and a cookie lost but backed up is written back)
if (Progress.data.unlocked > 1 || Progress.data.money > 0 || Progress.data.cars.length > 1) Progress.save();
