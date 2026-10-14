// ---- the COSMETICS REGISTRY: every cosmetic item in the game, in one place, as data (the owner, 14-Oct: "wire the Unlock
// Absolutely everything button to include all cosmetics"; CHECKLIST 278). One item = { slot, id, name, free }. Its KEY is
// 'slot:id' ('wheels:whitewall-silver'), which is what a save lists and what unlockall.js grants.
//   free: true   anyone has it (all of today's: the 12 wheel sets); free: false   owned only when its key is in the save
//                (Progress.data.cosmetics: LOCAL STORAGE ONLY, never the cookie: progress.js COOKIE_KEYS).
// HOW TO ADD A COSMETIC: a slot's module calls registerCosmetics([{ slot: 'plate', id: 'gold-plate', name: 'Gold plate', free: false }])
// once, as it loads (render/wheelcosmetic.js does it for WHEEL_SETS, so a new wheel set is registered by being added to that list);
// a NEW slot's module is also imported by unlockall.js, so that "Absolutely everything" sees its items. Nothing else: the
// Cosmetics screen asks owned(slot, id) (render/cosmeticsui.js) -> Progress.ownsCosmetic, and a locked item shows locked and
// cannot be equipped. Not a rule of a run (no rules module imports this; it is not in the replay fingerprint).
import { Progress } from './progress.js';

export const COSMETICS = [];
export const cosmeticKey = (slot, id) => slot + ':' + id;
// add items (one entry per key: a repeat is ignored); returns a function that takes them out again (for a check's fixture)
export const registerCosmetics = (items) => {
  const added = [];
  for (const item of items) {
    if (!item || !item.slot || !item.id || COSMETICS.some(c => c.slot === item.slot && c.id === item.id)) continue;
    const entry = { slot: String(item.slot), id: String(item.id), name: String(item.name || item.id), free: item.free === true };
    COSMETICS.push(entry);
    added.push(entry);
  }
  return () => { for (const entry of added) { const at = COSMETICS.indexOf(entry); if (at >= 0) COSMETICS.splice(at, 1); } };
};
// every cosmetic key there is ('wheels:whitewall-silver'), free ones included: what "Absolutely everything" grants
export const cosmeticKeys = () => COSMETICS.map(c => cosmeticKey(c.slot, c.id));
export const isFreeCosmetic = (slot, id) => COSMETICS.some(c => c.slot === slot && c.id === id && c.free);
Progress.cosmeticFree = isFreeCosmetic; // (how Progress.ownsCosmetic knows an item is free without importing this)
