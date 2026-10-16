// ---- the LOADOUT STORE: every cosmetic choice, PER CAR with a DEFAULT for all cars (the owner, 15-Oct: "Let's change the customisation to
// be car specific now"). One localStorage key, KEY (JSON), read through this one module:
//   { v: 1, default: { <slot>: {...} }, cars: { <carId>: { <slot>: {...} } } }
// slots and their fields (SLOTS): wheels { design, hub, rim: { all, front?, rear? }, tread: { all, front?, rear? } } (the THREE-PART wheel
// set: tread, tyre colour = `design`, hub = a colour `hub` or a rim / spinner `rim`; render/wheelcosmetic.js), plate { design, text }, roof | cargo | wing { id, paint },
// decal { id, colour } (the DECAL trial, CHECKLIST 423, render/decalcosmetic.js: a design or 'none', 'match' or 6 hex digits; a store
// written before it has none: absent = none / match, nothing to migrate), kill { id } (the KILL EFFECT, every explosion's look: render/killfx.js; not a model's dressing, so not in render/loadout.js loadoutKey),
// underglow { id } (16-Oct, render/underglow.js; a store written before it has none: absent = 'none', an unknown id is none there too).
// RESOLUTION: get(carId, slot) = the car's own entry for that slot (field by field) over the default's, over STOCK. carId null = the default.
// A car stores only what it changes (an OVERRIDE, a whole slot at a time: an edit copies the car's resolved slot and changes a field), so
// the key stays small; an override that comes out the same as the default is dropped (the car follows the default again). Per AXLE: the
// wheels' rim takes front / rear beside all (render/rims.js resolveRim reads it); nothing edits per axle yet.
// The ids are checked by each slot's own module as it reads (an unknown id is Stock there); the store only keeps the SHAPE clean: known
// slots and fields, short strings of safe characters, car ids of the usual form, at most MAX_CARS cars (clean(); garbage is dropped).
// MIGRATION (the old GLOBAL keys, written by the previous versions): when KEY is absent or unreadable, the default is built from
// delivery.wheeldesign, delivery.wheelcolour, delivery.wheelrim (its old per-car rims become car overrides), delivery.platedesign,
// delivery.platetext and delivery.prop.<slot> / .paint, so a player's look stays on every car until a car is customised. Nothing is written
// on a read: KEY is first written at the first change. The old keys are NEVER deleted here and are kept in step with the DEFAULT on every
// write (a MIRROR: an older build, or a rollback, still finds the player's all-cars look); a stock prop or plate is mirrored as no key, as
// those modules always stored it. Known limit: a change made in an older build after KEY exists is not seen by this one (KEY wins).
// Storage: every access in try/catch (no storage: the visit's own, in memory). Progress.noSave (test switches): the saved store is not
// read or written; the visit starts from Stock and keeps its changes in memory, as each slot did before.
// RENDER-ONLY: no rules module imports this; it is not in the replay fingerprint (vite.config.js logicFiles walks no render/ file), not in
// the cookie, not in a save code (as cosmetics.js's ownership list). Ownership stays global (render/cosmetics.js): owned is owned on every car.
import { Progress } from '../progress.js';

export const KEY = 'delivery.loadout';
export const SLOTS = ['wheels', 'plate', 'roof', 'cargo', 'wing', 'decal', 'kill', 'underglow'];
export const PROP_SLOTS = ['roof', 'cargo', 'wing'];
export const MAX_CARS = 400;
export const STOCK = Object.freeze({
  wheels: Object.freeze({ design: 'stock', hub: 'stock', rim: Object.freeze({ all: 'none' }), tread: Object.freeze({ all: 'none' }) }),
  plate: Object.freeze({ design: 'stock', text: null }),
  roof: Object.freeze({ id: 'none', paint: 'match' }),
  cargo: Object.freeze({ id: 'none', paint: 'match' }),
  wing: Object.freeze({ id: 'none', paint: 'match' }),
  decal: Object.freeze({ id: 'none', colour: 'match' }), // (the decal: none; 'match' = a tone of the car's own paint)
  kill: Object.freeze({ id: 'classic' }), // (the explosions' look: render/killfx.js; absent or unknown = Classic)
  underglow: Object.freeze({ id: 'none' }),
});
// the old global keys (read for the migration, mirrored from the default)
export const LEGACY = { design: 'delivery.wheeldesign', hub: 'delivery.wheelcolour', rim: 'delivery.wheelrim', plateDesign: 'delivery.platedesign', plateText: 'delivery.platetext', prop: (slot) => 'delivery.prop.' + slot, paint: (slot) => 'delivery.prop.' + slot + '.paint' };

// ---- cleaning: the shape only (the ids are the slot modules' to judge) ----
const ID = /^[A-Za-z0-9_-]{1,40}$/, CAR = /^[A-Za-z0-9_-]{1,40}$/;
const word = (v) => (typeof v === 'string' && ID.test(v) ? v : undefined);
const text = (v) => (typeof v === 'string' && v.length <= 24 && /^[A-Za-z0-9 -]*$/.test(v) ? v : undefined); // (a plate's text; platetext.js filters it again)
const obj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export const cleanRim = (v) => {
  if (typeof v === 'string') return word(v) ? { all: v } : undefined;
  if (!obj(v)) return undefined;
  const out = {};
  for (const k of ['all', 'front', 'rear']) if (word(v[k])) out[k] = v[k];
  return Object.keys(out).length ? out : undefined;
};
const FIELDS = {
  wheels: { design: word, hub: word, rim: cleanRim, tread: cleanRim },
  plate: { design: word, text },
  roof: { id: word, paint: word }, cargo: { id: word, paint: word }, wing: { id: word, paint: word },
  decal: { id: word, colour: word },
  kill: { id: word }, underglow: { id: word },
};
// THE THREE-PART WHEEL SET (the owner, 15-Oct: "tread - tyre colour - hub colour or rim or spinner"): the wheels' `design` is now the
// TYRE COLOUR alone (render/wheelcosmetic.js TYRE_COLOURS). Three old designs also carried a hub colour, worn when the hub colour was
// Stock; they are split here, as they are read (a store, an old key, an older build's write): the tyre colour into `design`, the hub
// colour into `hub` where it was Stock (or absent). The look is the same (scripts/.loadout-store-check.mjs: every old pair).
export const LEGACY_DESIGNS = { redwhite: { design: 'red', hub: 'white' }, whiteblack: { design: 'stock', hub: 'white' }, goldwall: { design: 'whitewall', hub: 'gold' } };
export const splitDesign = (w) => {
  const old = LEGACY_DESIGNS[w.design];
  if (!old) return w;
  return { ...w, design: old.design, ...(w.hub === undefined || w.hub === 'stock' ? { hub: old.hub } : {}) };
};
const cleanSlot = (slot, v) => {
  if (!obj(v)) return undefined;
  const out = {};
  for (const [k, fn] of Object.entries(FIELDS[slot])) { const c = fn(v[k]); if (c !== undefined) out[k] = c; }
  return Object.keys(out).length ? (slot === 'wheels' ? splitDesign(out) : out) : undefined;
};
const cleanLoadout = (v) => {
  const out = {};
  if (!obj(v)) return out;
  for (const slot of SLOTS) { const c = cleanSlot(slot, v[slot]); if (c) out[slot] = c; }
  return out;
};
// a stored value made safe: { v: 1, default, cars } with only known slots, fields and short values; anything else dropped
export const clean = (raw) => {
  const v = obj(raw) ? raw : {};
  const cars = {};
  if (obj(v.cars)) {
    for (const [id, c] of Object.entries(v.cars).slice(0, MAX_CARS)) {
      if (!CAR.test(id)) continue;
      const one = cleanLoadout(c);
      if (Object.keys(one).length) cars[id] = one;
    }
  }
  return { v: 1, default: cleanLoadout(v.default), cars };
};

// ---- the old keys -> a store (the migration) ----
const rawGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
export const fromLegacy = () => {
  const d = { wheels: {}, plate: {} }, cars = {};
  const design = rawGet(LEGACY.design), hub = rawGet(LEGACY.hub), rimRaw = rawGet(LEGACY.rim);
  if (design) d.wheels.design = design;
  if (hub) d.wheels.hub = hub;
  if (rimRaw) {
    let r = rimRaw;
    try { r = JSON.parse(rimRaw); } catch { /* (a bare id) */ }
    const rim = cleanRim(r);
    if (rim) d.wheels.rim = rim;
    if (obj(r) && obj(r.cars)) for (const [id, c] of Object.entries(r.cars).slice(0, MAX_CARS)) { const one = cleanRim(c); if (one && CAR.test(id)) cars[id] = { wheels: { rim: one } }; } // (the old per-car rims: a car's own wheels, its tyre and hub from the default)
  }
  const pd = rawGet(LEGACY.plateDesign), pt = rawGet(LEGACY.plateText);
  if (pd) d.plate.design = pd;
  if (pt) d.plate.text = pt;
  for (const slot of PROP_SLOTS) {
    const id = rawGet(LEGACY.prop(slot)), paint = rawGet(LEGACY.paint(slot));
    if (id || paint) d[slot] = { ...(id ? { id } : {}), ...(paint ? { paint: paint.toLowerCase() } : {}) };
  }
  return clean({ default: d, cars });
};

// ---- the state: the saved store (read once), or the visit's own (Progress.noSave) ----
let saved = null, visit = null, migrated = false;
const readSaved = () => {
  if (saved) return saved;
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* (no storage) */ }
  let parsed = null;
  if (raw) { try { parsed = JSON.parse(raw); } catch { parsed = null; } }
  if (obj(parsed) && parsed.v === 1) { saved = clean(parsed); migrated = false; }
  else { saved = fromLegacy(); migrated = true; } // (no store yet, or a broken one: the old global keys are the default)
  return saved;
};
const state = () => (Progress.noSave ? (visit ||= clean({})) : readSaved());
export const wasMigrated = () => { readSaved(); return migrated; }; // (for a check: this visit's default came from the old keys)

// the old keys, kept in step with the default (see the header)
const put = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* (no storage) */ } };
const mirror = (d) => {
  const w = { ...STOCK.wheels, ...(d.wheels || {}) }, p = { ...STOCK.plate, ...(d.plate || {}) };
  put(LEGACY.design, w.design); put(LEGACY.hub, w.hub); put(LEGACY.rim, JSON.stringify(w.rim));
  put(LEGACY.plateDesign, p.design === 'stock' ? null : p.design); put(LEGACY.plateText, p.text || null);
  for (const slot of PROP_SLOTS) { const s = { ...STOCK[slot], ...(d[slot] || {}) }; put(LEGACY.prop(slot), s.id === 'none' ? null : s.id); put(LEGACY.paint(slot), s.id === 'none' && s.paint === 'match' ? null : s.paint); }
};
const write = () => {
  if (Progress.noSave) return;
  const s = readSaved();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* (no storage: for this visit) */ }
  mirror(s.default);
  migrated = false;
};

// ---- reading ----
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (o) => (obj(o) ? Object.fromEntries(Object.keys(o).sort().map(k => [k, sorted(o[k])])) : o);
export const defaultSlot = (slot) => ({ ...STOCK[slot], ...(state().default[slot] || {}) });
// the car's slot as worn: its own fields over the default's over Stock (carId null / undefined: the default)
export const get = (carId, slot) => {
  const s = state(), own = carId != null ? s.cars[carId]?.[slot] : null;
  return own ? { ...STOCK[slot], ...(s.default[slot] || {}), ...own } : defaultSlot(slot);
};
export const own = (carId, slot) => (carId != null ? state().cars[carId]?.[slot] || null : null); // (a car's own fields of a slot, as stored)
export const hasOwn = (carId, slot) => carId != null && !!state().cars[carId]?.[slot];
// the car looks different from the default in some slot (the Cosmetics screen's 'custom' mark)
export const differs = (carId, slot = null) => carId != null && (slot ? [slot] : SLOTS).some(sl => hasOwn(carId, sl) && !same(sorted(get(carId, sl)), sorted(defaultSlot(sl))));
export const ownSlots = (carId) => Object.keys(state().cars[carId] || {}); // (the slots a car has its own choice of)
export const customCars = () => Object.keys(state().cars).filter(id => differs(id));
export const snapshot = () => JSON.parse(JSON.stringify(state())); // (for a check or a picture)

// ---- changing: target = a car id (its override), or null (the default: every car without its own) ----
const listeners = new Set();
const tell = (what) => { for (const fn of [...listeners]) { try { fn(what); } catch (error) { console.warn('loadout store listener: ' + (error?.message || error)); } } };
export const onStore = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
// change one slot's fields (a patch) for the target; one notice (onStore) every time, changed or not (the screens redraw their ticks)
export const setSlot = (target, slot, patch) => {
  if (!SLOTS.includes(slot)) return false;
  const s = state();
  if (target == null) {
    s.default[slot] = cleanSlot(slot, { ...defaultSlot(slot), ...patch }) || {};
  } else {
    if (!CAR.test(String(target))) return false;
    const id = String(target), next = cleanSlot(slot, { ...get(id, slot), ...patch });
    const car = s.cars[id] || {};
    if (!next || same(sorted({ ...STOCK[slot], ...next }), sorted(defaultSlot(slot)))) delete car[slot]; // (the same as the default: the car follows the default again)
    else car[slot] = next;
    if (Object.keys(car).length) {
      if (!s.cars[id] && Object.keys(s.cars).length >= MAX_CARS) return false;
      s.cars[id] = car;
    } else delete s.cars[id];
  }
  write();
  tell({ slot, target: target == null ? null : String(target) });
  return true;
};
// put a slot back to the default for one car (or a whole car: slot null)
export const resetCar = (carId, slot = null) => {
  const s = state(), car = s.cars[carId];
  if (!car) return false;
  if (slot) delete car[slot]; else delete s.cars[carId];
  if (car && !Object.keys(car).length) delete s.cars[carId];
  write();
  tell({ slot, target: String(carId) });
  return true;
};
// this car's look becomes the default; others: 'clear' (every car wears it: their own looks dropped) or 'keep' (cars with their own keep them)
export const copyToAll = (carId, { others = 'clear' } = {}) => {
  const s = state();
  for (const slot of SLOTS) s.default[slot] = cleanSlot(slot, get(carId, slot)) || {};
  if (others === 'clear') s.cars = {}; else delete s.cars[carId];
  write();
  tell({ slot: null, target: null });
  return true;
};
// for a check: forget what was read (the next read is from storage again), and the visit's own
export const reloadStore = () => { saved = null; visit = null; };
