// ============================================================================
// PROGRESS - what the player has earned and unlocked, kept in a cookie so it is still
// there next time. Everything that reads or writes saved progress goes through here, so
// the storage can be swapped (e.g. for Capacitor Preferences) without touching the game.
// ============================================================================
import { LEVELS, isRace } from './levels.js';
import { migrateHeld } from './packid.js';
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
// Orders 49 and 50: Night Shift (the port at night) and the favela descent at 54 and 55, after Hot Zone.
// Order 51: Monsoon (the second rice level) at 56, after them.
const INSERTED_AT = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, { cap: 41 }, 32, 33, 34, 35, 36, 37, 35, 36, 37, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56]; // (for orders 2, 3, ...)
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
  autoBrake: 1,    // auto brake behind a slower car, off the accelerator: 1, 0.75, 0.5, 0.25 of its full strength, or 0 (off)
  raceClass: 'f1', // the cars every race is run in: 'f1', 'gt' (GT road cars) or 'lmp' (Le Mans prototypes)
  raceTrack: 'marina-bay', // the race screensaver's circuit: a lapped level's id, or 'all' (each in turn)
  tankPieces: 0,   // TANK RAGE pieces found so far (0-4), carried from one level to the next
  evil: false,     // the side picked on the menu
  stats: {},       // milestone counters, by name (packagesLanded, copsOutrun, kmDriven...: see milestones.js), across every run
  levelOrder: LEVEL_ORDER, // the order of levels `unlocked` counts by
  tierBase: null,  // the levels open (by position) when the tiers (tiers.js) were first looked at: they stay open. null: not yet
  events: {},      // the special events' stages done, by event: how many, in order (events.js)
  claimed: [],     // the rewards given ('event-<id>': tiers.js claimReward), kept when the event is gone
  tierCars: {},    // the car last picked for each tier's levels while their medal is not earned, by tier (the player's own pick, `car`, is kept apart)
  blueprints: {},  // blueprints collected, by car id (ecu.js: they raise a car's ECU, and unlock a blueprint car)
  maxed: ['commuter'], // cars held at their MAX ECU whatever their blueprints (ecu.js): the starter car comes maxed; an old save's cars all are
  packs: {},       // card packs given and not yet opened (pending: the reveal opens them at once, or at the next menu): a count by pack id ('career', 'comet-special'...: packs.json; an old save's 'special:<event id>' is migrated: packid.js)
  packLog: [],     // the packs opened last, newest first: { kind (the pack's id), cards: [{ car, rarity, key?, featured? }] } (packs.js)
  shopCash: 0,     // the Shop's PLACEHOLDER currency (shop.json, shop.js): its own balance, never the bank; nothing gives it yet
  eventRuns: {},   // a rotating event's TASK COUNTERS for its run on now (events.js tasks: the Concept Strike, CHECKLIST 211), by event id: { day: 'YYYY-MM-DD' (the run's first day, local), n: [times each task paid this run] }; a new run starts them again
  jimBuys: {},     // Crazey Jim's BLUEPRINT STALL (jimshop.js): { day ('YYYY-MM-DD', local), slot (0..3: the 6 hours of it), ref (refreshes this slot: the draw's seed), r (refreshes today), n: { car id: bundles bought since the last refresh } }; another slot's ref and n and another day's r are void
  cosmetics: [],   // the cosmetics owned that are not free, as 'slot:id' keys (cosmetics.js): LOCAL STORAGE ONLY, never in the cookie (COOKIE_KEYS)
  packBuys: {},    // the Shop's PURCHASE COUNTERS, by pack id (shop.js; a pack's packs.json shop.limits): { total (ever bought), day ('YYYY-MM-DD', the player's local day of the last buy), today (bought that day) }; a bundle counts each pack
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
// the Shop's purchase counters (shop.js), each checked: { [pack id]: { total, day: 'YYYY-MM-DD', today } }
// Crazey Jim's stall (jimshop.js), checked: { day, slot 0..3, ref 0..999 (refreshes this slot), r 0..999 (refreshes today), n: { car id: 1..99 } (bundles since the last refresh) } (empty: none)
const cleanJim = (j) => {
  if (!j || typeof j !== 'object' || Array.isArray(j) || typeof j.day !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(j.day)) return {};
  const n = Object.fromEntries(Object.entries(j.n && typeof j.n === 'object' && !Array.isArray(j.n) ? j.n : {})
    .filter(([id, c]) => /^[a-z0-9-]{1,40}$/.test(id) && Number.isInteger(c) && c >= 1 && c <= 99).slice(0, 12));
  const whole = (x, most) => (Number.isInteger(x) && x >= 0 && x <= most ? x : 0);
  return { day: j.day, slot: whole(j.slot, 3), ref: whole(j.ref, 9999), r: whole(j.r, 9999), n };
};
const cleanBuys = (buys) => Object.fromEntries(Object.entries(buys && typeof buys === 'object' && !Array.isArray(buys) ? buys : {})
  .filter(([id, b]) => /^[a-z0-9-]{1,40}$/.test(id) && b && typeof b === 'object' && Number.isInteger(b.total) && b.total >= 0 && b.total <= 1e6)
  .slice(0, 50)
  .map(([id, b]) => [id, { total: b.total, day: typeof b.day === 'string' && /^\d{4}-\d\d-\d\d$/.test(b.day) ? b.day : '',
    today: Number.isInteger(b.today) && b.today >= 0 && b.today <= b.total ? b.today : 0 }]));
// the cosmetics owned (cosmetics.js): 'slot:id' keys, each checked, no repeats, no more than there could be (a save from before has none)
const cleanCosmetics = (list) => [...new Set((Array.isArray(list) ? list : []).filter(k => typeof k === 'string' && /^[a-z0-9-]{1,40}:[A-Za-z0-9_-]{1,40}$/.test(k)))].slice(0, 300);
// a rotating event's task counters (events.js), each checked: { [event id]: { day: 'YYYY-MM-DD', n: [whole numbers] } }
const cleanRuns = (runs) => Object.fromEntries(Object.entries(runs && typeof runs === 'object' && !Array.isArray(runs) ? runs : {})
  .filter(([id, r]) => /^[a-z0-9-]{1,40}$/.test(id) && r && typeof r === 'object' && typeof r.day === 'string' && /^\d{4}-\d\d-\d\d$/.test(r.day) && Array.isArray(r.n))
  .slice(0, 20)
  .map(([id, r]) => [id, { day: r.day, n: r.n.slice(0, 20).map(x => (Number.isInteger(x) && x >= 0 && x <= 999 ? x : 0)) }]));
// a save as it was written (by any older version of the game), brought up to date
const restore = (saved) => {
  {
    const data = { ...fresh(), ...saved };
    data.bestTime = { good: {}, evil: {}, ...saved.bestTime }; // (a save from before best times has none)
    data.stats = { ...(saved.stats || {}) }; // (nor counters)
    data.tierCars = { ...(saved.tierCars && typeof saved.tierCars === 'object' ? saved.tierCars : {}) };
    data.packs = migrateHeld(saved.packs); // (card packs: a save from before has none; one from before one definition per pack held 'special:<event>': packid.js)
    data.packBuys = cleanBuys(saved.packBuys); // (the Shop's purchase counters: a save from before has none)
    data.jimBuys = cleanJim(saved.jimBuys); // (Crazey Jim's blueprint stall: a save from before has none)
    data.eventRuns = cleanRuns(saved.eventRuns); // (a rotating event's task counters: a save from before has none)
    data.cosmetics = cleanCosmetics(saved.cosmetics); // (the cosmetics owned: a save from before has none)
    data.packLog = Array.isArray(saved.packLog) ? saved.packLog : [];
    // (the Commuter and the Darkvan were saved as 'hatch' and 'coupe')
    const RENAMED = { hatch: 'commuter', coupe: 'darkvan' };
    data.cars = [...new Set(data.cars.map(id => RENAMED[id] || id))];
    data.car = RENAMED[data.car] || data.car;
    delete data.best; // (best tips, no longer kept)
    // (the ECUs, ecu.js: a save from before them, with no blueprints, has every car it owns at its MAX ECU, so nobody
    // loses power: each counts as its key, maxed. A blueprint car it does not own stays locked)
    data.blueprints = Object.fromEntries(Object.entries(saved.blueprints && typeof saved.blueprints === 'object' && !Array.isArray(saved.blueprints) ? saved.blueprints : {})
      .filter(([, n]) => Number.isInteger(n) && n >= 0));
    data.maxed = [...new Set(saved.blueprints === undefined ? ['commuter', ...data.cars] : Array.isArray(saved.maxed) ? saved.maxed.map(id => RENAMED[id] || id) : ['commuter'])];
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
const COOKIE_KEYS = ['money', 'unlocked', 'levelOrder', 'cars', 'car', 'claimed', 'events', 'tankPieces', 'evil', 'muted', 'touch', 'autoGas', 'autoBrake', 'raceClass', 'raceTrack', 'blueprints', 'maxed', 'shopCash', 'packBuys', 'jimBuys', 'eventRuns'];
const COOKIE_ROOM = 3600; // bytes of cookie value (the cap is 4096 for the name, the value and its attributes)
const cookieText = (data) => {
  const short = Object.fromEntries(COOKIE_KEYS.map(key => [key, key === 'money' ? rounded(data.money, SAVE_STEP.money) : data[key]]));
  // (the blueprints and the maxed cars go first if it is too long: a cookie without them reads as a save from before the
  // ECUs, every car it owns maxed, which takes nothing away)
  const bare = { ...short };
  delete bare.blueprints;
  delete bare.maxed;
  for (const [base, cars] of [[short, short.cars], [bare, short.cars], [bare, [...new Set(['commuter', short.car])]]]) {
    const text = encodeURIComponent(JSON.stringify({ ...base, cars }));
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
  clean.tierCars = Object.fromEntries(Object.entries(saved.tierCars && typeof saved.tierCars === 'object' ? saved.tierCars : {}).filter(([k, v]) => /^(\d{1,2}|[a-z0-9-]{1,40})$/.test(k) && word(v)).slice(0, 60)); // (by tier, or by a level with a list of its own: cars.js carRule)
  clean.events = Object.fromEntries(Object.entries(saved.events && typeof saved.events === 'object' && !Array.isArray(saved.events) ? saved.events : {})
    .filter(([k, v]) => word(k) && Number.isInteger(v) && v >= 0 && v <= 99).slice(0, 100));
  clean.claimed = [...new Set((Array.isArray(saved.claimed) ? saved.claimed : []).filter(word))].slice(0, 100);
  clean.tankPieces = Math.floor(number(saved.tankPieces, 0) ?? 0);
  clean.shopCash = Math.floor(number(saved.shopCash, 0) ?? 0); // (the Shop's placeholder currency)
  clean.cars = [...new Set(['commuter', ...(Array.isArray(saved.cars) ? saved.cars : []).filter(word)])].slice(0, 200);
  clean.car = word(saved.car) ? saved.car : 'commuter';
  // (the ECUs' blueprints and maxed cars, ecu.js: only if the code has them. A code from before has neither, and is
  // restored as an old save: every car it owns maxed)
  if (saved.blueprints && typeof saved.blueprints === 'object' && !Array.isArray(saved.blueprints)) {
    clean.blueprints = Object.fromEntries(Object.entries(saved.blueprints).filter(([k, n]) => word(k) && Number.isInteger(n) && n >= 0 && n <= 1e6).slice(0, 300));
    clean.maxed = [...new Set((Array.isArray(saved.maxed) ? saved.maxed : []).filter(word))].slice(0, 300);
  }
  clean.bestTime = {};
  for (const side of ['good', 'evil']) { // (a time for a level there is, and no other)
    const times = saved.bestTime && typeof saved.bestTime === 'object' ? saved.bestTime[side] : null;
    clean.bestTime[side] = Object.fromEntries(Object.entries(times && typeof times === 'object' ? times : {})
      .filter(([id, t]) => typeof t === 'number' && isFinite(t) && LEVELS.some(level => level.id === id)));
  }
  for (const key of ['muted', 'autoGas', 'evil']) if (typeof saved[key] === 'boolean') clean[key] = saved[key];
  if ([0, 0.25, 0.5, 0.75, 1].includes(saved.autoBrake)) clean.autoBrake = saved.autoBrake;
  if (typeof saved.touch === 'boolean') clean.touch = saved.touch;
  for (const key of ['raceClass', 'raceTrack']) if (word(saved[key])) clean[key] = saved[key];
  // (the counters: numbers by name, and no more of them than there could be)
  clean.stats = Object.fromEntries(Object.entries(saved.stats && typeof saved.stats === 'object' && !Array.isArray(saved.stats) ? saved.stats : {})
    .filter(([key, n]) => word(key) && typeof n === 'number' && isFinite(n) && n >= 0).slice(0, 100));
  // (card packs, packs.js: the counts held by pack, and the log of those opened, each card checked)
  clean.packs = Object.fromEntries(Object.entries(saved.packs && typeof saved.packs === 'object' && !Array.isArray(saved.packs) ? saved.packs : {})
    .filter(([k, n]) => /^[a-z0-9-]{1,40}(:[A-Za-z0-9_-]{1,40})?$/.test(k) && Number.isInteger(n) && n > 0 && n <= 9999).slice(0, 50)); // (a pack id; an old code's 'special:<event>', migrated by restore)
  clean.packBuys = cleanBuys(saved.packBuys); // (the Shop's purchase counters)
  clean.jimBuys = cleanJim(saved.jimBuys); // (Crazey Jim's purchases of the day)
  clean.eventRuns = cleanRuns(saved.eventRuns); // (a rotating event's task counters)
  clean.cosmetics = cleanCosmetics(saved.cosmetics); // (the cosmetics owned)
  clean.packLog = (Array.isArray(saved.packLog) ? saved.packLog : []).filter(p => p && typeof p === 'object' && word(p.kind) && Array.isArray(p.cards)).slice(0, 50)
    .map(p => ({ kind: p.kind, ...(word(p.from) ? { from: p.from } : {}), cards: p.cards.filter(c => c && word(c.car) && word(c.rarity)).slice(0, 20)
      .map(c => ({ car: c.car, rarity: c.rarity, ...(c.key === true ? { key: true } : {}), ...(c.featured === true ? { featured: true } : {}) })) }));
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
    // (the cookie is kept to the game's pages, path=/delivery: with path=/ it went out with every request to the
    // origin, every script and picture under /assets/ too (audit P8). One written before with path=/ is deleted as
    // this one is written; until then it is still read, as there is nothing else of that name)
    document.cookie = COOKIE + '=; max-age=0; path=/; SameSite=Lax';
    document.cookie = COOKIE + '=' + cookieText(this.data) + '; max-age=' + ONE_YEAR + '; path=/delivery; SameSite=Lax';
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
  // a special event's stage delivered (events.js): its tip, and its best time; it opens nothing of the menu's
  stageDone(id, tip, spare, evil) {
    this.data.money += tip;
    const side = this.data.bestTime[evil ? 'evil' : 'good'];
    const record = !(side[id] >= spare);
    if (record) side[id] = spare;
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
      this.freeCars.some(car => car.id === carId) || !!this.blueprintOwns?.(carId);
  },
  // a cosmetic (cosmetics.js): free, or its 'slot:id' key is in the save's list (local storage only: never the cookie)
  ownsCosmetic(slot, id) {
    return !!this.cosmeticFree?.(slot, id) || this.data.cosmetics.includes(slot + ':' + id);
  },
  // cosmetic keys given to the player (unlockall.js): cleaned like a loaded save, kept once each
  grantCosmetics(keys) {
    this.data.cosmetics = cleanCosmetics([...this.data.cosmetics, ...keys]);
  },
  cosmeticFree: null, // (set by cosmetics.js: is this item free?)
  // the cars that are free and always open (set by cars.js: the car ideas, ideas.js)
  freeCars: [],
  // is a blueprint car unlocked by its blueprints? (set by ecu.js; null: none is)
  blueprintOwns: null,
  // the cars that are earned, not bought (set by cars.js: { id, earned: { level, par: { good, evil? } } })
  earnedCars: [],
  // true: the car's level has been delivered with at least its par's seconds to spare, on every side the par names
  earned(car) {
    if (car.off) return false; // (a car not to be had for now: cars.js EARNED_CARS)
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
  // (and a medal on every side of every delivery level: a best time of 0:00 to spare where it has none, so no
  // real best time is lost; a level played as Good only gets its Good one. A 6-star car's par is never met by it)
  complete({ levels, cars, money }) {
    this.data.unlocked = Math.max(this.data.unlocked, levels);
    this.data.tierBase = Math.max(this.data.tierBase || 0, levels); // (the tiers, tiers.js: all open too)
    for (const level of LEVELS) {
      if (isRace(level)) continue;
      for (const side of level.battle || level.alwaysGood ? ['good'] : ['good', 'evil']) this.data.bestTime[side][level.id] ??= 0;
    }
    for (const id of cars) if (!this.data.cars.includes(id)) this.data.cars.push(id);
    this.data.maxed = [...new Set([...(this.data.maxed || []), ...cars])]; // (and every one at its max ECU: ecu.js. No blueprint car is dealt)
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
