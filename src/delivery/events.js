// ============================================================================
// EVENTS - the special events (events.json "special"; the plan and the owner's answers: EVENTS-NOTES.md). A special
// event is a series of stages played in turn, on the menu's Events group while it is on (from / to, by the device's
// clock). Each stage:
//   - is a level of its own, built from a map (any level's, or a hidden one's) with the stage's own fields over it:
//     id <event>-<n>, so its best time, its replays and its ghost are the stage's, never the map's;
//   - opens on its own date (from), once the stage before it is done; all of them shut when the event is over;
//   - may need a car: owned (a one-car allowedCars), or lent (free: true, a car lock, as the special levels lend
//     theirs). A player who cannot get the car is stopped there, until they do or the event is over;
//   - has its clock written out in full (the owner: an existing level reused, the event gives its clocks; worked out
//     by hand for the stage, never a share of the map's);
//   - has no TANK RAGE (the owner: the feature off: no targets, no pieces found, none carried in or out).
// A stage is done when delivered on time, on either side; its tip is paid every time, as any level's. The last one
// done gives the grand prize (a car: cars.js EVENT_CARS), once, into the save (`claimed`, and the cars owned), so it
// is kept when the event is over and gone. The save keeps how many stages of each event are done (`events`).
// The one-level events (Christmas Eve) are tiers.js's (their list is events.json "events" too).
// A RECURRING event (the Car Hunt, the owner 13-Oct: "This will be a recurring event"): `repeat: { every, live }` in
// days: from its `from` (the anchor: midnight on the device for a bare date), it is ON for `live` days, then off until
// `every` days after the last start, and so on for ever (or until its `to`). Between runs it stays on the menu (the
// events tab says "Next in ..."); its stages are shut then. Its stages never count as "done for good": a stage done is
// open again at once, to play again and again (repeat events give their packs on EVERY delivery: packs.js eventDone,
// givenBy.event.every). Events.window(event, t) is the run on now or the next one: { live, start, end, next }.
// A ROTATING event (the Concept Strike, the owner 13-Oct; CHECKLIST 211): a recurring one with `days`, one entry for each
// day of a run (Monday to Saturday: `repeat: { every: 7, live: 6 }` from a Monday). Each DAY is a run of its own: the
// window is the day's (Ends in: midnight; between days the next day starts at once; Sunday: Next in, Monday). A day has
//   car     its FEATURED car: lent as a FREE TRY at the player's own ECU for it, ON by default (the stage's car lock,
//           `ownEcu`: ecu.js drives it at the ECU its blueprints reach, ECU1 with none; the key at ECU5). The event card's
//           Free try chip, or the showroom's Drive on another car, turns it off for the visit (lentFor / pickFor)
//   tasks   [{ stars, side, car, featured, maxed, packs, limit, key }]: a delivery of the stage that meets a task pays it:
//           `packs` of the day's pack (packs.json: the pack whose givenBy.event names the event and that `day`, 1 = the
//           first), at most `limit` times a run (the day); `key`: the featured car's key, once for good. Conditions:
//           stars: a car of that many stars (a gold tier's, or a key car's rating: starsOf); side: 'good' / 'evil';
//           car: that car; featured: the day's car; maxed: at its max ECU. Every task a delivery meets is paid.
// The counters (`Progress.data.eventRuns`) belong to the run: a new day starts them at 0.
// CARD (the owner, 13-Oct, of the Concept Strike: "Drop the medals and stats and description ... Too long"): `card: { hide:
// [...] }` leaves parts of the event's full level card out (render/menustage.js drawStage; an event of one stage only):
// 'medals' (the Good / Evil best-clear medals at its top right), 'stats' (the clock, tip and best-to-spare row),
// 'description' (the road's words). Events.cardHides(event) is the list; problems() names anything else.
// ============================================================================
import eventData from './events.json';
import { LEVELS, HIDDEN_LEVELS } from './levels.js';
import { levelName, levelDescription } from './levelText.js';
import { cargoFor } from './cargo.js';
import { Progress } from './progress.js';
import { carById, carTier } from './cars.js';
import { Packs, packProblems, dayPack, packName } from './packs.js';
import { Ecu } from './ecu.js';

// a time in events.json: "2026-12-01" is midnight on the player's device; else a time with its zone. null: none
// given; NaN: not a time
export const when = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const day = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(v));
  const t = day ? new Date(+day[1], +day[2] - 1, +day[3]).getTime() : Date.parse(String(v));
  return Number.isFinite(t) ? t : NaN;
};
export const PLAIN_EVENTS = Array.isArray(eventData.events) ? eventData.events : [];

const MAPS = new Map([...LEVELS, ...Object.values(HIDDEN_LEVELS)].map(level => [level.id, level]));
const OWN = new Set(['level', 'from', 'car', 'free']); // (a stage's fields that are not a level's)
// the parts of an event's level card that `card.hide` may leave out (see the head)
export const CARD_PARTS = ['medals', 'stats', 'description'];

// a stage as a level: the map, the stage's fields over it, its own id; its words and cargo the map's, asked for now
// (they are kept by the map's id: levelText.json, cargo.js)
// (day: a rotating event's day, 0 = the first: its own level, id <event>-d<n>, on the map the day names)
const stageLevel = (event, stage, index, day = null) => {
  const map = MAPS.get(String(stage.level));
  if (!map) return null;
  const own = Object.fromEntries(Object.entries(stage).filter(([k]) => !OWN.has(k)));
  // (TANK RAGE is off in a stage, the owner: "noTankRage": false in the stage turns it on)
  const level = { ...map, noTankRage: true, ...own, id: event.id + (day === null ? '-' + (index + 1) : '-d' + (day + 1)), name: levelName(map),
    description: { good: levelDescription(map, false), evil: levelDescription(map, true) },
    cargo: { good: cargoFor(map, false)?.id, evil: cargoFor(map, true)?.id }, stage: { event: event.id, index, map: map.id, ...(day === null ? {} : { day }) } };
  if (!level.cargo.good) delete level.cargo; // (a map that carries nothing: a race)
  if (stage.car && stage.free) { level.car = stage.car; delete level.allowedCars; } // (lent: a car lock)
  else if (stage.car) { delete level.car; level.allowedCars = { cars: [stage.car] }; } // (needed, and owned)
  return level;
};

export const SPECIALS = (Array.isArray(eventData.special) ? eventData.special : []).map(e => {
  const event = { id: String(e.id), name: String(e.name || e.id), short: String(e.short || e.name || e.id), from: when(e.from), to: when(e.to),
    prize: e.prize && typeof e.prize === 'object' ? e.prize : null, repeat: repeatOf(e.repeat), raw: e,
    hide: Array.isArray(e.card?.hide) ? e.card.hide.filter(x => CARD_PARTS.includes(x)) : [] }; // (its card's parts left out: card.hide)
  event.days = Array.isArray(e.days) && event.repeat ? e.days.map((d, i) => ({ index: i, car: d?.car ? String(d.car) : null,
    tasks: (Array.isArray(d?.tasks) ? d.tasks : []).map((x, k) => ({ index: k, ...x })) })) : null; // (a rotating event's days: see the head)
  event.stages = (Array.isArray(e.stages) ? e.stages : []).map((s, i) => ({
    index: i, from: when(s.from), car: s.car || null, free: !!s.free, map: String(s.level), level: stageLevel(event, s, i), raw: s,
  }));
  // (a rotating event's day with a "level" of its own (the Concept Strike's: the owner, 13-Oct, "exclusive levels for Concept
  // Strike", CHECKLIST 224): its one stage played on that map that day, a level of its own (id <event>-d<n>: its best time,
  // replays and ghost the day's), with the day's "clock" (and "tip") over the stage's. The stage's `level` is the day's on the
  // menu: Events.syncDay swaps it as the day changes. A day with none plays the stage's own map)
  if (event.days && event.stages[0]) {
    const base = event.stages[0];
    base.own = base.level; base.ownMap = base.map;
    for (const d of event.days) {
      const raw = e.days[d.index] || {};
      if (!raw.level) continue;
      const over = Object.fromEntries(['clock', 'tip'].filter(k => raw[k] !== undefined).map(k => [k, raw[k]]));
      d.map = String(raw.level);
      d.level = stageLevel(event, { ...base.raw, level: raw.level, ...over }, 0, d.index);
    }
  }
  return event;
});
// every stage's level (replay.js fingerprints them; the menu lists the live ones), a rotating event's days' too
export const STAGE_LEVELS = SPECIALS.flatMap(e => [...e.stages.map(s => s.own || s.level), ...(e.days || []).map(d => d.level)].filter(Boolean));

// a recurring event's rule ({ every, live }: whole days, 1 <= live <= every), or null (none, or not sound: problems() says)
function repeatOf(r) {
  if (!r || typeof r !== 'object') return null;
  const every = Number(r.every), live = Number(r.live);
  return Number.isInteger(every) && Number.isInteger(live) && every >= 1 && live >= 1 && live <= every ? { every, live } : null;
}
// t moved on by n calendar days on the device (the same time of day: a clock change in between does not shift it)
const addDays = (t, n) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime(); };
// the run of a recurring event on at t, or the next one: { live, start, end, next } (start / end: the run on, or the next
// one; next: when the one after starts); null: not recurring, or no run left (its `to` passed)
export const windowOf = (event, t) => {
  const w = weekOf(event, t);
  if (!w || !event.days) return w;
  // (a rotating event: each day of the run is a run of its own)
  if (!w.live) return { ...w, end: addDays(w.start, 1) > w.end ? w.end : addDays(w.start, 1), day: 0 };
  let d = 0;
  while (d + 1 < event.repeat.live && addDays(w.start, d + 1) <= t) d++;
  const start = addDays(w.start, d), end = d + 1 < event.repeat.live ? addDays(start, 1) : w.end;
  return { live: true, start, end, next: d + 1 < event.repeat.live ? end : w.next, day: d };
};
const weekOf = (event, t) => {
  const r = event?.repeat;
  if (!r || event.from === null || Number.isNaN(event.from)) return null;
  const cap = (x) => (event.to !== null && x > event.to ? event.to : x);
  let k = Math.max(0, Math.floor((t - event.from) / (r.every * 86400000)));
  while (k > 0 && addDays(event.from, k * r.every) > t) k--; // (a clock change: the guess one out either way)
  while (addDays(event.from, (k + 1) * r.every) <= t) k++;
  let start = addDays(event.from, k * r.every), end = cap(addDays(start, r.live));
  if (t >= end) { start = addDays(event.from, (k + 1) * r.every); end = cap(addDays(start, r.live)); }
  if (event.to !== null && start >= event.to) return null;
  const live = start <= t && t < end;
  return { live, start, end, next: live ? addDays(start, r.every) : start };
};

const dayName = (t) => new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' });
// the day of the week, by name ('Monday'): a rotating event's day (the Concept Strike's cars: the owner, 13-Oct, "show what day of
// the week concept strike cars are active, not the date value"); English, as the rest of the game
export const weekdayName = (t) => new Date(t).toLocaleDateString('en-GB', { weekday: 'long' });
// a day on the device: 'YYYY-MM-DD' (a run's mark in the save)
const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// a car's stars for a task (the owner: 'any 2-star car'): a gold tier's (1 to 5: the car lot's and the blueprint cars'), or a
// key car's rating (the Bespoke and concept cars' magenta stars); null for any other (a Blue Star car, a special, an idea)
export const starsOf = (car) => { const t = carTier(car); return t >= 1 && t <= 5 ? t : car?.rating >= 1 && car.rating <= 5 && !car.blue ? car.rating : null; };
const STAR = '★';
// a task in words: 'Deliver in any ★★ car as Good', 'Deliver in the Fishbowl Runabout', '... at its max ECU (5)'
export const taskWords = (task, day) => {
  const car = task.featured ? carById(day?.car) : task.car ? carById(task.car) : null;
  const what = car ? 'the ' + car.name : task.stars ? 'any ' + STAR.repeat(task.stars) + ' car' : 'any car';
  return 'Deliver in ' + what + (task.maxed ? ' at its max ECU' + (car ? ' (' + Ecu.max(car) + ')' : '') : '') + (task.side === 'good' ? ' as Good' : task.side === 'evil' ? ' as Evil' : '');
};
const rewardWords = (task) => (task.key ? 'Its key' : (task.packs || 1) + (task.packs > 1 ? ' packs' : ' pack'));
// does a delivery ({ car, ecu, evil }) meet a task of the day?
const meets = (task, day, run) => {
  const car = run?.car;
  if (!car || car.silhouette) return false;
  if (task.side === 'good' && run.evil) return false;
  if (task.side === 'evil' && !run.evil) return false;
  if (task.stars && starsOf(car) !== task.stars) return false;
  if (task.car && car.id !== task.car) return false;
  if (task.featured && car.id !== day.car) return false;
  if (task.maxed && !(Number(run.ecu) >= Ecu.max(car))) return false;
  return true;
};
// the free try of a rotating event's featured car: ON by default while a day is live (the owner, 13-Oct: "the idea is that
// players ECU up the car they don't own, and only get the key when they max it out": the day's car is everyone's to drive,
// lent at the ECU its blueprints reach). The card's chip, or a pick in the showroom of another car, turns it off for the
// visit (never saved); a pick of the day's car, or the chip again, back on
let tryOn = true;

export const Events = {
  specials: SPECIALS,
  now: () => Date.now(), // (the device's clock: the checks set it)
  // the event and stage a level is ({ event, stage }), or null for a level that is no stage
  stageOf(level) {
    const at = level?.stage;
    const event = at && SPECIALS.find(e => e.id === at.event);
    return event ? { event, stage: event.stages[at.index] } : null;
  },
  isStage(level) { return !!level?.stage && STAGE_LEVELS.includes(level); },
  // is the event on? (from / to: a time not one: never; a recurring one: in one of its runs)
  live(event, t = this.now()) {
    if (event.repeat) return !!windowOf(event, t)?.live;
    return (event.from === null || event.from <= t) && (event.to === null || t < event.to);
  },
  liveSpecials(t = this.now()) { return SPECIALS.filter(e => this.live(e, t)); },
  // the events the menu lists: those on, and a recurring one between its runs too (the owner: it stays in the events tab)
  shownSpecials(t = this.now()) { return SPECIALS.filter(e => this.live(e, t) || !!windowOf(e, t)); },
  // a recurring event's run now or next (windowOf); null for a one-off
  window(event, t = this.now()) { return windowOf(event, t); },
  // the countdown on an event's card: { words: 'Ends in' | 'Next in', at } (at: the time it counts to), or null (none)
  countdownOf(event, t = this.now()) {
    const w = windowOf(event, t);
    if (w) return w.live ? { words: 'Ends in', at: w.end } : { words: 'Next in', at: w.start };
    return event.to !== null && this.live(event, t) ? { words: 'Ends in', at: event.to } : null;
  },
  // how many of its stages are done (in order: the first n)
  done(event) { return Math.max(0, Math.floor(Progress.data.events?.[event.id] || 0)); },
  // a stage's state: { open, done, why, needs } (why: what stops it, for its card; needs: a car it needs and the
  // player does not own: the stage is open, but START has no car, as for any level whose car rule the player has
  // none for: cars.js carRule)
  state(event, index, t = this.now()) {
    const stage = event.stages[index], done = this.done(event);
    if (!stage?.level) return { open: false, done: false, why: 'Not in the game' };
    if (event.to !== null && !(t < event.to)) return { open: false, done: index < done, why: 'The event is over' };
    if (event.from !== null && t < event.from) return { open: false, done: false, why: 'Starts ' + dayName(event.from) };
    if (event.repeat) { // (a recurring event: shut between its runs; a stage done stays open, to play again)
      const w = windowOf(event, t);
      if (!w) return { open: false, done: index < done, why: 'The event is over' };
      if (!w.live) return { open: false, done: index < done, why: 'Back ' + (event.days ? weekdayName(w.start) : dayName(w.start)) }; // (a rotating event: its next day by name, 'Back Monday')
    }
    if (stage.from !== null && t < stage.from) return { open: false, done: false, why: 'Opens ' + dayName(stage.from) };
    if (index > done) return { open: false, done: false, why: 'Finish stage ' + (done + 1) + ' first' };
    const car = stage.car && !stage.free ? carById(stage.car) : null;
    const needs = car && !Progress.owns(car.id) ? car : null;
    return { open: true, done: index < done, why: needs ? 'Needs the ' + needs.name : '', needs };
  },
  // a stage's level open on the menu now?
  isOpen(level) { const at = this.stageOf(level); return !!at && !this.offDay(level) && this.state(at.event, at.stage.index).open; },
  // the stage that is next to play (the first not done), or null when all are
  next(event) { return event.stages[this.done(event)] || null; },
  prizeKey(event) { return 'event-' + event.id; },
  prizeWon(event) { return (Progress.data.claimed || []).includes(this.prizeKey(event)); },
  prizeCar(event) { return event.prize?.car ? carById(event.prize.car) : null; },
  // a stage delivered on time (Game.finish): done if it is the next one (a stage done before counts nothing more),
  // and the prize after the last. { stage, of, prize, packs, repeat } (prize: the car's name, once; packs: the card packs
  // it gave, by name: packs.js eventDone; a recurring event's on EVERY delivery while it is on; repeat: a recurring
  // event's), or null for no stage, or an event not on
  delivered(level, run = null) {
    const at = this.stageOf(level);
    if (!at || !this.live(at.event)) return null;
    const { event, stage } = at;
    if (event.days) { // (a rotating event: its day's tasks, paid by what the run was driven in: payTasks)
      if (stage.index === this.done(event)) (Progress.data.events ||= {})[event.id] = stage.index + 1;
      const paid = this.payTasks(event, run || {});
      return { stage: stage.index + 1, of: event.stages.length, prize: '', packs: paid.packs, key: paid.key, tasks: paid.done, repeat: true, name: event.name };
    }
    const first = stage.index === this.done(event); // (the stage done for the first time)
    if (first) (Progress.data.events ||= {})[event.id] = stage.index + 1;
    let prize = '';
    if (this.done(event) >= event.stages.length && event.prize && !this.prizeWon(event)) {
      (Progress.data.claimed ||= []).push(this.prizeKey(event));
      const car = this.prizeCar(event);
      if (car && !Progress.data.cars.includes(car.id)) Progress.data.cars.push(car.id); // (owned from now on, the event or no)
      prize = car ? car.name : '';
    }
    const packs = Packs.eventDone(event.id, first, !!prize); // (card packs: packs.js; the packs whose givenBy.event names this event; `every`: each delivery)
    Progress.save();
    return { stage: stage.index + 1, of: event.stages.length, prize, packs, repeat: !!event.repeat, name: event.name };
  },
  // ---- a ROTATING event's day (the Concept Strike): { index, car, tasks, pack } on now, or the next (between runs); null: not one
  // the parts of the event's level card it leaves out ('medals', 'stats', 'description': events.json card.hide)
  cardHides(event) { return event?.hide ? [...event.hide] : []; },
  dayOf(event, t = this.now()) {
    if (!event?.days) return null;
    const w = windowOf(event, t);
    const day = w ? event.days[w.day] : null;
    return day ? { ...day, live: w.live, start: w.start, pack: dayPack(event.id, day.index + 1) } : null;
  },
  // the counters of the run on now ([times each task of the day was paid]), a new run's at 0 (write: kept in the save's place)
  runCounts(event, t = this.now(), write = false) {
    const w = windowOf(event, t), mark = w ? dayKey(w.start) : '';
    const day = this.dayOf(event, t), size = day ? day.tasks.length : 0;
    const saved = Progress.data.eventRuns?.[event.id];
    const n = saved && saved.day === mark ? [...saved.n] : [];
    while (n.length < size) n.push(0);
    if (write) (Progress.data.eventRuns ||= {})[event.id] = { day: mark, n };
    return n;
  },
  // the day's tasks, each with { task, words, reward, count, limit, left, done } (done: paid as often as it can be this run;
  // a key task: once the key is owned)
  tasks(event, t = this.now()) {
    const day = this.dayOf(event, t);
    if (!day) return [];
    const n = this.runCounts(event, t);
    return day.tasks.map((task, i) => {
      const limit = task.key ? 1 : Math.max(1, Math.floor(task.limit || 1));
      const count = task.key ? (Progress.owns(day.car) ? 1 : 0) : n[i] || 0;
      return { task, words: taskWords(task, day), reward: rewardWords(task), count, limit, left: Math.max(0, limit - count), done: count >= limit };
    });
  },
  // a rotating event's day that features this car, today or the next: { start, live } (live: it is that day now), or null
  carDay(event, carId, t = this.now()) {
    if (!event?.days?.some(d => d.car === carId)) return null;
    const d0 = new Date(t), midnight = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()).getTime();
    for (let k = 0; k < 15; k++) {
      const at = k ? addDays(midnight, k) + 3600e3 : t, day = this.dayOf(event, at);
      if (day?.live && day.car === carId) return { start: day.start, live: k === 0 };
    }
    return null;
  },
  // anything left to earn in the run on now? (the Events tab's dot)
  tasksLeft(event, t = this.now()) { return this.live(event, t) ? this.tasks(event, t).filter(x => !x.done).length : 0; },
  // the FREE TRY of the day's car (its card's button): { car, on, ecu, max } (ecu: what the player's blueprints reach, as it
  // is lent), or null (no rotating event, no run on)
  freeTry(event, t = this.now()) {
    const day = this.dayOf(event, t), car = day?.live ? carById(day.car) : null;
    if (!car) return null;
    return { car, on: tryOn, ecu: Math.max(1, Ecu.reached(car)), max: Ecu.max(car), owned: Progress.owns(car.id) };
  },
  setFreeTry(event, on) { tryOn = !!on; this.syncTry(event); },
  // the free try the level picked lends this car: freeTry's { car, on, ecu, max, owned } when the level is a rotating
  // event's stage, its day live, the car the day's (owned or not: an owner's is driven at their own ECU), else null
  lentFor(level, car, t = this.now()) {
    const event = car ? this.stageOf(level)?.event : null;
    if (!event?.days) return null;
    const tried = this.freeTry(event, t);
    return tried && tried.car.id === car.id ? tried : null;
  },
  // a car picked to drive (the showroom's Drive) while the level picked is a rotating event's stage, its day live: the pick
  // decides the free try (the day's car: on; any other: off, the player's own car driven), so Start drives what was picked
  pickFor(level, carId, t = this.now()) {
    const event = this.stageOf(level)?.event;
    if (!event?.days || !this.dayOf(event, t)?.live) return;
    this.setFreeTry(event, carId === this.dayOf(event, t).car);
  },
  // the cars a rotating event's stage points the showroom at today (the owner, 13-Oct: "Concept Strike should filter the
  // showroom to the stars requirement AND the free try car"): any car of the stars of the day's first stars task (starsOf:
  // a gold tier's, the Blueprint cars' too, or a key car's rating), the day's featured car (lent: owned or not), and the car of
  // a task that names one (the day before's concept car, 2 packs) when it is owned. A VIEW only: the stage still takes any
  // car the player owns (render/showroom.js imposes it as a filter for the visit, as a car rule's). { test(car), label }
  // ({tier:n} tokens: tiers.js richTiers), or null (no rotating event's stage, no run on: Sunday)
  showroomFocus(level, t = this.now()) {
    const event = this.stageOf(level)?.event, day = event?.days ? this.dayOf(event, t) : null;
    if (!day?.live) return null;
    const stars = day.tasks.find(task => task.stars && !task.car && !task.featured)?.stars || null;
    const featured = carById(day.car), named = day.tasks.map(task => task.car).filter(id => id && id !== day.car && Progress.owns(id));
    const ids = new Set([featured?.id, ...named].filter(Boolean));
    const test = (car) => !!car && !car.silhouette && (ids.has(car.id) || (!!stars && starsOf(car) === stars));
    const names = [...(featured ? ['the ' + featured.name + ' (free try)'] : []), ...named.map(id => 'your ' + (carById(id)?.name || id))];
    const label = [stars ? '{tier:' + stars + '} cars' : '', ...names].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' or $1');
    return { test, label, ids: [...ids], stars };
  },
  // the stage's car lock follows the free try and the day (called as the menu draws): the day's car lent at the player's own
  // ECU (level.ownEcu: ecu.js), or no lock (any car the player owns)
  syncTry(event, t = this.now()) {
    this.syncDay(event, t);
    const level = event?.days ? event.stages[0]?.level : null;
    if (!level) return;
    const day = this.dayOf(event, t);
    for (const other of [event.stages[0].own, ...event.days.map(d => d.level)]) if (other && other !== level) { delete other.car; delete other.ownEcu; } // (another day's level: no lock)
    if (tryOn && day?.live && carById(day.car)) { level.car = day.car; level.ownEcu = true; } else { delete level.car; delete level.ownEcu; }
  },
  // a rotating event's stage is played on the day's own level (its days' "level"): the stage's level (and map) set to the day's
  // on now, or the next day's between runs (Sunday: Monday's). Called as the menu draws (menustage.js buildTabs, syncTry)
  syncDay(event, t = this.now()) {
    const stage = event?.days ? event.stages[0] : null;
    if (!stage) return;
    const day = this.dayOf(event, t), own = day ? event.days[day.index] : null;
    stage.level = own?.level || stage.own;
    stage.map = own?.level ? own.map : stage.ownMap;
  },
  // a level of a rotating event's day that is not the one played now (a day gone by, or to come): not open on the menu
  offDay(level, t = this.now()) {
    const at = this.stageOf(level);
    if (!at?.event.days) return false;
    this.syncDay(at.event, t);
    return at.stage.level !== level;
  },
  // a rotating event's stage delivered (delivered): every task of the day the run meets is paid, up to its limit this run.
  // { done: [words], packs: [names], key: car name or '' }
  payTasks(event, run, t = this.now()) {
    const day = this.dayOf(event, t);
    if (!day?.live) return { done: [], packs: [], key: '' };
    const n = this.runCounts(event, t, true), done = [], packs = [];
    let key = '', give = 0;
    day.tasks.forEach((task, i) => {
      if (!meets(task, day, run)) return;
      if (task.key) {
        const car = carById(day.car);
        if (!car || Progress.owns(car.id)) return;
        Packs.grantKey(car.id);
        key = car.name; done.push(taskWords(task, day));
        return;
      }
      const limit = Math.max(1, Math.floor(task.limit || 1));
      if ((n[i] || 0) >= limit) return;
      n[i] = (n[i] || 0) + 1;
      give += Math.max(1, Math.floor(task.packs || 1));
      done.push(taskWords(task, day));
    });
    (Progress.data.eventRuns ||= {})[event.id] = { day: dayKey(windowOf(event, t).start), n };
    if (give && day.pack) { Packs.grant(day.pack, { n: give }); packs.push(...Array(give).fill(packName(day.pack))); }
    Progress.save();
    if (give) Packs.revealNow();
    return { done, packs, key };
  },
  // what is wrong with events.json's special events, as lines (none: sound)
  problems() {
    const out = [], ids = new Set();
    for (const e of SPECIALS) {
      const say = (what) => out.push('event ' + e.id + ': ' + what);
      if (ids.has(e.id)) say('its id is used twice');
      ids.add(e.id);
      if (Number.isNaN(e.from) || Number.isNaN(e.to)) say('"from" or "to" is not a time');
      if (e.from !== null && e.to !== null && !(e.from < e.to)) say('it ends before it starts');
      if (e.raw.repeat !== undefined && !e.repeat) say('"repeat" is not { "every": days, "live": days } (whole numbers, 1 <= live <= every)');
      if (e.repeat && e.from === null) say('a recurring event needs "from" (the start of its first run)');
      if (e.repeat && e.raw.repeat && Object.keys(e.raw.repeat).some(k => !['every', 'live'].includes(k))) say('"repeat": unknown field(s) ' + Object.keys(e.raw.repeat).filter(k => !['every', 'live'].includes(k)).join(', '));
      if (!e.stages.length) say('it has no stages');
      if (e.raw.card !== undefined) {
        const c = e.raw.card, ok = c && typeof c === 'object' && !Array.isArray(c);
        if (!ok) say('"card" is not { "hide": [...] }');
        else {
          const extra = Object.keys(c).filter(k => k !== 'hide');
          if (extra.length) say('"card": unknown field(s) ' + extra.join(', '));
          if (c.hide !== undefined && !Array.isArray(c.hide)) say('"card.hide" is not a list');
          else for (const [i, x] of (c.hide || []).entries()) {
            if (!CARD_PARTS.includes(x)) say('"card.hide": "' + x + '" is not a part of the card (' + CARD_PARTS.join(', ') + ')');
            else if (c.hide.indexOf(x) !== i) say('"card.hide": "' + x + '" twice');
          }
          if (e.stages.length > 1) say('"card" is for an event of one stage (its full level card); this one has its own screen');
        }
      }
      if (e.raw.days !== undefined) {
        if (!e.days) say('"days" needs "repeat" (a rotating event is a recurring one)');
        else {
          if (e.days.length !== e.repeat.live) say('"days": ' + e.days.length + ' entries for ' + e.repeat.live + ' days a run');
          if (e.stages.length !== 1) say('a rotating event has one stage');
          e.days.forEach((d, i) => {
            const n = 'day ' + (i + 1) + ': ';
            if (!carById(d.car)) say(n + 'its car "' + d.car + '" is not a car');
            if (!dayPack(e.id, i + 1)) say(n + 'no pack (packs.json: givenBy.event { "day": ' + (i + 1) + ' } naming ' + e.id + ')');
            if (!d.tasks.length) say(n + 'no tasks');
            const raw = e.raw.days[i] || {};
            if (raw.level !== undefined && !d.level) say(n + 'its level "' + raw.level + '" is not a level');
            if (raw.level !== undefined && !(raw.clock?.good > 0 && raw.clock?.evil > 0)) say(n + 'its level\'s clock is not written out in full ({ "good": s, "evil": s })');
            for (const x of d.tasks) {
              const extra = Object.keys(x).filter(k => !['index', 'stars', 'side', 'car', 'featured', 'maxed', 'packs', 'limit', 'key'].includes(k));
              if (extra.length) say(n + 'task ' + (x.index + 1) + ': unknown ' + extra.join(', '));
              if (x.stars !== undefined && !(Number.isInteger(x.stars) && x.stars >= 1 && x.stars <= 5)) say(n + 'task ' + (x.index + 1) + ': stars is not 1 to 5');
              if (x.side !== undefined && !['good', 'evil'].includes(x.side)) say(n + 'task ' + (x.index + 1) + ': side is not good or evil');
              if (x.car !== undefined && !carById(x.car)) say(n + 'task ' + (x.index + 1) + ': "' + x.car + '" is not a car');
              if (x.key ? !x.featured : !(Number.isInteger(x.packs) && x.packs >= 1 && Number.isInteger(x.limit) && x.limit >= 1)) say(n + 'task ' + (x.index + 1) + ': a key task is the featured car\'s; any other gives whole packs, a whole limit');
            }
          });
        }
      }
      if (e.prize && !this.prizeCar(e)) say('its prize "' + e.prize.car + '" is not a car');
      if (e.raw.featured !== undefined) say('"featured" belongs on its pack now (packs.json: the pack whose "event" is ' + e.id + ', its featured.entries)'); // (one definition per pack: CHECKLIST 159)
      e.stages.forEach((s, i) => {
        const n = 'stage ' + (i + 1) + ': ';
        if (!s.level) say(n + '"' + s.map + '" is not a level');
        if (Number.isNaN(s.from)) say(n + '"from" is not a time');
        if (s.from !== null && e.to !== null && !(s.from < e.to)) say(n + 'it opens after the event is over');
        if (s.car && !carById(s.car)) say(n + 'its car "' + s.car + '" is not a car');
        const c = s.raw.clock;
        if (!c || !(c.good > 0) || !(c.evil > 0)) say(n + 'its clock is not written out in full ({ "good": s, "evil": s })');
      });
    }
    for (const line of packProblems()) out.push('packs.json: ' + line); // (the packs: their featured cards, the events they name, what gives them, their Shop offers)
    return out;
  },
};
