// ============================================================================
// EVENTS - the special events (events.json "special"; the plan and the owner's answers: EVENTS-NOTES.md). A special
// event is a series of stages played in turn, on the menu's Events group while it is on (from / to, by the device's
// clock). Each stage:
//   - is a level of its own, built from a map (any level's, or a hidden one's) with the stage's own fields over it:
//     id <event>-<n>, so its best time, its replays and its ghost are the stage's, never the map's;
//   - opens on its own date (from), once the stage before it is done; all of them shut when the event is over;
//   - may need a car: owned (a one-car allowedCars), or lent (free: true, a car lock, as the special levels lend
//     theirs). A player who cannot get the car is stopped there, until they do or the event is over;
//   - has its clock written out in full (the owner: worked out by hand for the stage, never a share of the map's).
// A stage is done when delivered on time, on either side; its tip is paid every time, as any level's. The last one
// done gives the grand prize (a car: cars.js EVENT_CARS), once, into the save (`claimed`, and the cars owned), so it
// is kept when the event is over and gone. The save keeps how many stages of each event are done (`events`).
// The one-level events (Christmas Eve) are tiers.js's (their list is events.json "events" too).
// ============================================================================
import eventData from './events.json';
import { LEVELS, HIDDEN_LEVELS } from './levels.js';
import { levelName, levelDescription } from './levelText.js';
import { cargoFor } from './cargo.js';
import { Progress } from './progress.js';
import { carById } from './cars.js';

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

// a stage as a level: the map, the stage's fields over it, its own id; its words and cargo the map's, asked for now
// (they are kept by the map's id: levelText.json, cargo.js)
const stageLevel = (event, stage, index) => {
  const map = MAPS.get(String(stage.level));
  if (!map) return null;
  const own = Object.fromEntries(Object.entries(stage).filter(([k]) => !OWN.has(k)));
  const level = { ...map, ...own, id: event.id + '-' + (index + 1), name: levelName(map),
    description: { good: levelDescription(map, false), evil: levelDescription(map, true) },
    cargo: { good: cargoFor(map, false)?.id, evil: cargoFor(map, true)?.id }, stage: { event: event.id, index, map: map.id } };
  if (!level.cargo.good) delete level.cargo; // (a map that carries nothing: a race)
  if (stage.car && stage.free) { level.car = stage.car; delete level.allowedCars; } // (lent: a car lock)
  else if (stage.car) { delete level.car; level.allowedCars = { cars: [stage.car] }; } // (needed, and owned)
  return level;
};

export const SPECIALS = (Array.isArray(eventData.special) ? eventData.special : []).map(e => {
  const event = { id: String(e.id), name: String(e.name || e.id), short: String(e.short || e.name || e.id), from: when(e.from), to: when(e.to),
    prize: e.prize && typeof e.prize === 'object' ? e.prize : null, raw: e };
  event.stages = (Array.isArray(e.stages) ? e.stages : []).map((s, i) => ({
    index: i, from: when(s.from), car: s.car || null, free: !!s.free, map: String(s.level), level: stageLevel(event, s, i), raw: s,
  }));
  return event;
});
// every stage's level (replay.js fingerprints them; the menu lists the live ones)
export const STAGE_LEVELS = SPECIALS.flatMap(e => e.stages.map(s => s.level).filter(Boolean));

const dayName = (t) => new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' });

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
  // is the event on? (from / to: a time not one: never)
  live(event, t = this.now()) { return (event.from === null || event.from <= t) && (event.to === null || t < event.to); },
  liveSpecials(t = this.now()) { return SPECIALS.filter(e => this.live(e, t)); },
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
    if (stage.from !== null && t < stage.from) return { open: false, done: false, why: 'Opens ' + dayName(stage.from) };
    if (index > done) return { open: false, done: false, why: 'Finish stage ' + (done + 1) + ' first' };
    const car = stage.car && !stage.free ? carById(stage.car) : null;
    const needs = car && !Progress.owns(car.id) ? car : null;
    return { open: true, done: index < done, why: needs ? 'Needs the ' + needs.name : '', needs };
  },
  // a stage's level open on the menu now?
  isOpen(level) { const at = this.stageOf(level); return !!at && this.state(at.event, at.stage.index).open; },
  // the stage that is next to play (the first not done), or null when all are
  next(event) { return event.stages[this.done(event)] || null; },
  prizeKey(event) { return 'event-' + event.id; },
  prizeWon(event) { return (Progress.data.claimed || []).includes(this.prizeKey(event)); },
  prizeCar(event) { return event.prize?.car ? carById(event.prize.car) : null; },
  // a stage delivered on time (Game.finish): done if it is the next one (a stage done before counts nothing more),
  // and the prize after the last. { stage, of, prize } (prize: the car's name, once), or null for no stage
  delivered(level) {
    const at = this.stageOf(level);
    if (!at || !this.live(at.event)) return null;
    const { event, stage } = at;
    if (stage.index === this.done(event)) (Progress.data.events ||= {})[event.id] = stage.index + 1;
    let prize = '';
    if (this.done(event) >= event.stages.length && event.prize && !this.prizeWon(event)) {
      (Progress.data.claimed ||= []).push(this.prizeKey(event));
      const car = this.prizeCar(event);
      if (car && !Progress.data.cars.includes(car.id)) Progress.data.cars.push(car.id); // (owned from now on, the event or no)
      prize = car ? car.name : '';
    }
    Progress.save();
    return { stage: stage.index + 1, of: event.stages.length, prize };
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
      if (!e.stages.length) say('it has no stages');
      if (e.prize && !this.prizeCar(e)) say('its prize "' + e.prize.car + '" is not a car');
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
    return out;
  },
};
