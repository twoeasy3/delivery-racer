// ---- THE STOCK OF EACH EARNED COSMETIC, PER CAR (CHECKLIST 437, EARNED-COSMETICS.md; the owner, 16-Oct: "Cosmetics will be earned and 1 will
// be consumed when equipped to a vehicle"). render/cosmetics.js keeps how many of each item the player was given (cosmeticCount); this file
// counts how many are ON CARS, from the loadout store (render/loadoutstore.js), so that
//   spare = given - worn.
// THE RULE OF ONE A CAR: an item is worn by
//   - every car in the garage (Progress.owns) whose look has it, its own choice or the All-cars default's, and that can wear the slot
//     (a prop slot the car has, a glow on a car that takes one, a plate on any but a Legendary car: their gold plates stay);
//   - any other car the player dressed with it itself (a car on show in the showroom that is not owned yet, its own choice only).
// So: two cars need two; the All-cars default needs one for each garage car that follows it; taking one off, choosing another, Reset car
// or a car leaving the garage gives it back at once (nothing is stored per equip, so nothing can drift). Free looks (Stock plate, no prop,
// Classic kill effect, no glow) and 'Unlock everything: Absolutely' are unlimited. The kill effect is counted per car it is set on, never
// per kill.
// A car that JOINS the garage while the default has an earned item rides on it (the default is not taken off it); the spare count then
// shows 0, never less, and nothing is taken off any car. Open question in EARNED-COSMETICS.md.
// Render-only (no rules module imports this; not in the replay fingerprint).
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
const resolve = (snap, carId, slot) => ({ ...Store.STOCK[slot], ...(snap.default?.[slot] || {}), ...(snap.cars?.[carId]?.[slot] || {}) });
// every earned item worn: Map key -> [car ids], for a store snapshot (default: the store as it is)
export const usage = (snap = Store.snapshot()) => {
  const out = new Map(), seen = new Set();
  const add = (car, slots) => {
    for (const slot of slots) {
      const id = resolve(snap, car.id, slot)[ITEM_FIELD[slot]];
      if (!id || id === EARNED_SLOTS[slot] || !wearsSlot(car, slot)) continue;
      const key = cosmeticKey(slot, id);
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(car.id);
    }
  };
  for (const car of roster()) { if (Progress.owns(car.id)) { seen.add(car.id); add(car, SLOTS); } }
  for (const id of Object.keys(snap.cars || {})) { // (a car not in the garage that the player dressed: its own choices only)
    if (seen.has(id)) continue;
    const car = carById(id);
    if (car) add(car, SLOTS.filter(slot => snap.cars[id][slot]));
  }
  return out;
};
export const wornBy = (slot, id, use = usage()) => use.get(cosmeticKey(slot, id)) || [];
// the ones free to equip: Infinity (free, or unlimited), else given less worn, never under 0
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
    if (count === Infinity) continue; // (free or unlimited: nothing to tell)
    (a > b ? uses : gives).push(row);
  }
  const short = uses.filter(u => u.after > u.count);
  return { uses, gives, short };
};
// THE MIGRATION (once a browser): every item worn is made at least as many as the cars wearing it (render/cosmetics.js has already made
// each worn item at least 1 on its first load), so nobody loses a look when cosmetics become earned
export const migrateStock = () => {
  if (stockMeta().mig) return false;
  for (const [key, ids] of usage()) topUpCosmetic(key, ids.length);
  setStockMeta({ mig: 1 });
  return true;
};
export const carName = (id) => carById(id)?.name || id;
