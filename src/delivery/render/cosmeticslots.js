// ---- the COSMETICS SCREEN'S SLOTS (render/cosmeticsui.js draws them): one ordered list. A slot's TAB IS DRAWN ONLY when the slot has items
// AND the car on show supports it; otherwise nothing at all (no greyed tab, no lock, no 'coming later': the owner, 16-Oct).
//   { id, label (the tab's short word), name (the panel's title), scope: 'car' | 'player', supports(car, ctx) -> bool, hasItems() -> bool,
//     items() -> [{ id, name }], panel?(ctx) -> HTMLElement, refresh?(ctx) }
// scope 'car': chosen per car or for all cars (the 'This car / All cars' switch, Reset car, Copy to all). scope 'player': one choice for the
// player, whatever the car (the switch and the car's buttons are hidden on its tab). A slot with no panel() of its own gets a plain chip list
// of its items (cosmeticsui.js chipPanel; pick(id, target) / chosen(target) store the choice, target null = the player's / all cars').
// items() defaults to the slot's entries in the cosmetics registry (render/cosmetics.js registerCosmetics: { slot: <id>, id, name, ... }).
// TO ADD A SLOT, OR WAKE A DORMANT ONE: register it; its tab appears by itself, in this list's order.
//   import { registerSlot } from './cosmeticslots.js';
//   registerSlot({ id: 'kill', panel: () => buildKill(), refresh: () => killShown() });  // Kill effect (cosmeticsui.js): items { slot: 'kill', ... } (render/killfx.js)
//   registerSlot({ id: 'decal', supports: (car) => !!DECAL_ZONES[car.model || car.id] });  // Decal: shows on cars with a flank zone row
//   registerSlot({ id: 'horn', label: 'Horn', scope: 'player', items: () => HORNS });     // a new slot: added before Kill FX
// registerSlot merges into an entry with the same id (fields given win), else inserts a new one before 'kill'.
// DEMO (?cosmetics=all, URL-PARAMS.md): the dormant slots (Decal, Glow) get two 'Sample' items each and Decal shows on every car, so every tab
// can be seen. (The Kill effect is a real slot since CHECKLIST 405, no samples.)
// Off by default; nothing is registered in render/cosmetics.js and nothing is stored. Render-only: no rules module imports this.
import { COSMETICS } from './cosmetics.js';
import { slotStatus } from './propdress.js';

let demo = false;
try { demo = typeof location !== 'undefined' && new URLSearchParams(location.search).get('cosmetics') === 'all'; } catch { /* (no address) */ }
export const isDemo = () => demo;
export const setDemo = (on) => { demo = !!on; }; // (for a check)
const SAMPLES = [{ id: 'sample-1', name: 'Sample 1', sample: true }, { id: 'sample-2', name: 'Sample 2', sample: true }];

const registered = (id) => () => COSMETICS.filter(c => c.slot === id);
const dormant = (id) => () => (demo ? [...registered(id)(), ...SAMPLES] : registered(id)());
const prop = (id) => (car) => slotStatus(car, id).ok;

export const SLOT_LIST = [
  { id: 'wheels', label: 'Wheels', name: 'Wheels', scope: 'car', supports: () => true, items: () => [true] },
  { id: 'plate', label: 'Plate', name: 'Number plate', scope: 'car', supports: () => true, items: () => [true] },
  { id: 'roof', label: 'Roof', name: 'Roof prop', scope: 'car', prop: true, supports: prop('roof'), items: registered('roof') },
  { id: 'cargo', label: 'Cargo', name: 'Cargo prop', scope: 'car', prop: true, supports: prop('cargo'), items: registered('cargo') },
  { id: 'wing', label: 'Wing', name: 'Rear wing', scope: 'car', prop: true, supports: prop('wing'), items: registered('wing') },
  // DORMANT until their work lands: no items (and, for Decal, no car with a zone row), so no tab
  { id: 'decal', label: 'Decal', name: 'Decal', scope: 'car', supports: () => demo, items: dormant('decal') },
  { id: 'underglow', label: 'Glow', name: 'Underglow', scope: 'car', supports: () => true, items: dormant('underglow') },
  // the KILL EFFECT (CHECKLIST 405, render/killfx.js registers its items as slot 'kill'): PER CAR over the All-cars default like the others
  // (the loadout slot 'kill', render/loadoutstore.js), so 'car' scope; its panel is cosmeticsui.js buildKill, given by registerSlot there
  { id: 'kill', label: 'Kill FX', name: 'Kill effect', scope: 'car', supports: () => true, items: registered('kill') },
];
for (const s of SLOT_LIST) s.hasItems = () => s.items().length > 0;

export const slotById = (id) => SLOT_LIST.find(s => s.id === id) || null;
export const registerSlot = (def) => {
  if (!def || !def.id) return null;
  let s = slotById(def.id);
  if (s) Object.assign(s, def);
  else {
    s = { label: def.id, name: def.label || def.id, scope: 'car', supports: () => true, items: dormant(def.id), ...def };
    const at = SLOT_LIST.findIndex(x => x.id === 'kill');
    SLOT_LIST.splice(at < 0 ? SLOT_LIST.length : at, 0, s);
  }
  if (!def.hasItems) s.hasItems = () => s.items().length > 0;
  return s;
};
// the tabs drawn for a car, in order (a car missing: Wheels alone)
export const shownSlots = (car, ctx = {}) => SLOT_LIST.filter(s => { try { return s.hasItems() && (car ? s.supports(car, ctx) : s.id === 'wheels'); } catch { return false; } });
// the tab to open on this car: the one asked for when the car has it, else the first drawn (Wheels)
export const tabToOpen = (list, want) => (list.some(s => s.id === want) ? want : (list[0]?.id || 'wheels'));
