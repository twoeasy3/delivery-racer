// ============================================================================
// HUNT - the CAR HUNT's calendar (the owner, 15-Oct: "Do all [the feature roster cars], shuffle the order, and they cycle. A
// car hunt is to be active at all times ... they last three days each and cycle. The Car Hunt pack in the shop should always
// correspond to the current car hunt"). A special event with `hunt` (events.json) hunts one car at a time:
//   hunt.cars   the cars, in the order they are hunted: a FIXED shuffle written out as data, so every device agrees with no
//               server (made once by `node scripts/events.mjs hunt-order <seed>`; no two cars of the same stars side by
//               side, the seam from the last back to the first included)
//   hunt.days   the days each car is hunted: back-to-back windows of whole LOCAL days from the event's `from` (midnight on
//               the device), so one car after another, never a gap; after the last car the list starts again
//   hunt.sameStars  the stage is driven only in a car of the hunted car's stars (a level per star tier: events.js)
// The packs that feature the hunted car (packs.json `featured.hunt: <event id>`, or `sameCarAs` a pack that does) have no car
// in their entries: the car is the one hunted at the time (featuredFor). A pack given or bought keeps the car it was given
// for (packs.js grant / open: Progress.data.packCars).
// Its own module, of the two JSON files only, so packs.js, events.js and render/packart.js can all ask it (events.js
// imports packs.js). The clock is `clock.now` (Events.now sets it: the checks and ?eventsnow= move it).
// ============================================================================
import eventData from './events.json';
import packData from './packs.json';

export const clock = { now: () => Date.now() };
const D = 86400000;
const SPECIAL = Array.isArray(eventData.special) ? eventData.special : [];
const PACKS = packData.packs || {};
// local midnight of a bare date ("2026-10-12"), else the time given; NaN: none
const startOf = (v) => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(v ?? '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : Date.parse(String(v)); };
const midnight = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const plusDays = (t, n) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };

// an event's hunt, sound: { id, cars: [ids], days, sameStars, from } or null (no hunt, or not sound: events.js problems() says)
export const huntOf = (eventId) => {
  const e = SPECIAL.find(x => String(x.id) === String(eventId)), h = e?.hunt;
  if (!h || !Array.isArray(h.cars) || !h.cars.length || !(Number.isInteger(h.days) && h.days >= 1)) return null;
  const from = startOf(e.from);
  return Number.isFinite(from) ? { id: String(e.id), cars: h.cars.map(String), days: h.days, sameStars: !!h.sameStars, from } : null;
};
export const HUNT_IDS = SPECIAL.filter(e => huntOf(e.id)).map(e => String(e.id));

// the hunt's window at t: { car (id), n (the window's number from the first, 0 = the first), slot (its place in the list),
// cycle (how many times round), start, end, next (the car after) }, or null (no hunt). Windows are whole local days counted
// from `from` (a day 23 or 25 hours long, a clock change, counts as one); before the first, the first
export const huntAt = (eventId, t = clock.now()) => {
  const h = huntOf(eventId);
  if (!h) return null;
  const day = Math.round((midnight(t) - h.from) / D), n = Math.max(0, Math.floor(day / h.days)), N = h.cars.length;
  const start = plusDays(h.from, n * h.days);
  return { car: h.cars[n % N], n, slot: n % N, cycle: Math.floor(n / N), start, end: plusDays(start, h.days), next: h.cars[(n + 1) % N] };
};
// when this car is hunted, now or next: { live, start, end } (start / end: the window now, or the next one), or null: it is
// not in the hunt
export const huntWindowFor = (eventId, carId, t = clock.now()) => {
  const h = huntOf(eventId), now = huntAt(eventId, t);
  const at = h ? h.cars.indexOf(String(carId)) : -1;
  if (at < 0) return null;
  if (now.car === String(carId) && now.start <= t) return { live: true, start: now.start, end: now.end };
  const n = now.n + (at - now.slot + h.cars.length) % h.cars.length, start = plusDays(h.from, n * h.days); // (0 ahead: before the first window, the first car's)
  return { live: false, start, end: plusDays(start, h.days) };
};

// the event a pack's featured car follows: its own `featured.hunt`, or that of the pack it is tied to (`sameCarAs`); null: none
export const packHunt = (packId, seen = new Set()) => {
  const f = PACKS[packId]?.featured;
  if (!f || seen.has(packId)) return null;
  if (f.hunt !== undefined) return huntOf(f.hunt) ? String(f.hunt) : null;
  seen.add(packId);
  return f.sameCarAs ? packHunt(f.sameCarAs, seen) : null;
};
// the car a hunt pack features at t (a car id), or null: not a hunt pack
export const huntCarOfPack = (packId, t = clock.now()) => { const e = packHunt(packId); return e ? huntAt(e, t)?.car ?? null : null; };
