// ---- THE HAND OF EACH EARNED COSMETIC, PER CAR (CHECKLIST 437, EARNED-COSMETICS.md; the owner, 16-Oct: "treat cosmetics exactly like cards:
// if the player has 1 of it, it is unlocked. Equipping it takes 1 from their stock. Unequipping gives it back"; "drop All cars: per car only").
// render/cosmetics.js keeps how many of each item the player was given (cosmeticCount); this file counts how many are ON CARS, from the
// loadout store (each car's own item: render/loadoutstore.js PER_CAR, never the All-cars default), so that
//   hand = given - on cars.
// One for each car wearing it (a car that cannot wear the slot, such as a Legendary car's plates, is not wearing it). Nothing is stored per
// equip: taking one off, choosing another or Reset car puts it back in the hand at once. Free looks are unlimited ('Absolutely' gives 999 of each, a real stock); the kill
// effect is one a car, never per kill. Render-only (not in the replay fingerprint).
import { Progress } from '../progress.js';
import { CARS, EARNED_CARS, EVENT_CARS, BESPOKE_CARS, FILLER_CARS, SECRET_CARS, carById } from '../cars.js';
import * as Store from './loadoutstore.js';
import { EARNED_SLOTS, ITEM_FIELD, cosmeticKey, cosmeticCount, cosmeticOf, stockMeta, setStockMeta, topUpCosmetic } from './cosmetics.js';
import { slotStatus } from './propdress.js';
import { underglowSupported } from './underglow.js';

const SLOTS = Object.keys(EARNED_SLOTS);
// can this car wear the slot at all? (a car that cannot is never counted)
export const wearsSlot = (car, slot) => {
  if (!car) return false;
  try {
    if (slot === 'plate') return !car.legend;
    if (slot === 'underglow') return underglowSupported(car);
    if (slot === 'roof' || slot === 'cargo' || slot === 'wing') return slotStatus(car, slot).ok;
    return true; // (kill)
  } catch { return false; }
};
let rosterList = null;
const roster = () => (rosterList ||= [...new Map([...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...FILLER_CARS, ...Object.values(SECRET_CARS), ...(Progress.freeCars || [])]
  .filter(c => c && c.id).map(c => [c.id, c])).values()]);
// every earned item on a car: Map key -> [car ids], for a store snapshot (default: the store as it is)
export const usage = (snap = Store.snapshot()) => {
  const out = new Map();
  for (const [carId, look] of Object.entries(snap.cars || {})) {
    const car = carById(carId);
    for (const slot of SLOTS) {
      const id = look?.[slot]?.[ITEM_FIELD[slot]];
      if (!id || id === EARNED_SLOTS[slot] || !wearsSlot(car, slot)) continue;
      const key = cosmeticKey(slot, id);
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(carId);
    }
  }
  return out;
};
export const wornBy = (slot, id, use = usage()) => use.get(cosmeticKey(slot, id)) || [];
// the HAND: Infinity for a free look, else given less on cars, never under 0
export const spare = (slot, id, use = usage()) => { const n = cosmeticCount(slot, id); return n === Infinity ? Infinity : Math.max(0, n - wornBy(slot, id, use).length); };
// what a change of the store did to the stock: before and after are usage() maps. uses: items now on more cars; gives: on fewer.
// short: the uses that need more than the player has (and more than were already worn: a stock already over is never made worse)
export const diffUsage = (before, after) => {
  const keys = new Set([...before.keys(), ...after.keys()]), uses = [], gives = [];
  for (const key of keys) {
    const b = before.get(key)?.length || 0, a = after.get(key)?.length || 0;
    if (a === b) continue;
    const [slot, id] = key.split(':'), count = cosmeticCount(slot, id), name = cosmeticOf(slot, id)?.name || id;
    const row = { key, slot, id, name, count, before: b, after: a, more: a - b };
    if (count === Infinity) continue; // (a free look: nothing to tell)
    (a > b ? uses : gives).push(row);
  }
  const short = uses.filter(u => u.after > u.count);
  return { uses, gives, short };
};
// THE MIGRATION (once a browser, from main.js and the Cosmetics screen): an All-cars default from before (an earned item on the default) is
// moved onto EVERY GARAGE CAR that followed it (no item of its own, can wear the slot), and the default keeps only the free look; then every
// item on cars is made at least as many as the cars wearing it. So nobody loses a look and the hand never starts below 0 (the choice made:
// generous, as the looks were free or owned once before; render/cosmetics.js has already made each worn item at least 1 on its first load).
export const migrateStock = () => {
  if (stockMeta().mig) return false;
  const snap = Store.snapshot();
  let moved = false;
  for (const slot of SLOTS) {
    const f = ITEM_FIELD[slot], item = snap.default?.[slot]?.[f];
    if (!item || item === EARNED_SLOTS[slot]) continue;
    for (const car of roster()) {
      if (!Progress.owns(car.id) || !wearsSlot(car, slot) || snap.cars?.[car.id]?.[slot]?.[f]) continue;
      ((snap.cars[car.id] ||= {})[slot] ||= {})[f] = item;
    }
    delete snap.default[slot][f];
    moved = true;
  }
  if (moved) Store.restore(snap);
  for (const [key, ids] of usage()) topUpCosmetic(key, ids.length);
  setStockMeta({ mig: 1 });
  return true;
};
export const carName = (id) => carById(id)?.name || id;
