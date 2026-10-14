// ---- the COSMETICS REGISTRY: every cosmetic item in the game, in one place, as data (the owner, 14-Oct: "wire the Unlock
// Absolutely everything button to include all cosmetics"; CHECKLIST 278). One item = { slot, id, name, free }. Its KEY is
// 'slot:id' ('wheels:whitewall-silver'), which is what the owned list holds and what unlockall.js grants.
//   free: true   anyone has it (all of today's: the 12 wheel sets); free: false   owned only when its key is in the owned list
//                (the list below: its OWN localStorage key KEY, never the cookie and NOT in progress.js's save).
// HOW TO ADD A COSMETIC: a slot's module calls registerCosmetics([{ slot: 'plate', id: 'gold-plate', name: 'Gold plate', free: false }])
// once, as it loads (render/wheelcosmetic.js does it for WHEEL_SETS, so a new wheel set is registered by being added to that list);
// a NEW slot's module is also imported by unlockall.js, so that "Absolutely everything" sees its items. Nothing else: the
// Cosmetics screen asks owned(slot, id) (render/cosmeticsui.js) -> ownsCosmetic here, and a locked item shows locked and
// cannot be equipped. Not a rule of a run (no rules module imports this; it is not in the replay fingerprint).
// OWNERSHIP IS DELIBERATELY OUTSIDE progress.js (the owner, 14-Oct: "cosmetics should not break the hash"): progress.js is read by
// rules modules, so any edit to it changes the replay fingerprint (vite.config.js logicFiles). This file (render/, outside the walk) is imported by no rules
// module, so cosmetics are NOT part of the fingerprint: a replay or ghost never refuses to play over one. A cosmetic the player
// does not own, or one that no longer exists, simply shows Stock (wheelcosmetic.js). Known limit: because the save code
// (Progress.exportCode / tidy) lives in progress.js, ownership is NOT carried in a save code; it stays in this browser.
// The list is kept in localStorage under KEY, a JSON array of 'slot:id' keys, read once, cleaned, every access in try/catch, not
// written on a test visit (Progress.noSave: held for the visit only), cleared by the menu's Reset progress.
import { Progress } from '../progress.js';
export const KEY = 'delivery.cosmetics';
const MOST = 300;


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

// the list, cleaned as a loaded save is: text keys of the right shape, no repeats, no more than MOST (anything else is dropped)
export const cleanCosmetics = (list) => [...new Set((Array.isArray(list) ? list : []).filter(k => typeof k === 'string' && /^[a-z0-9-]{1,40}:[A-Za-z0-9_-]{1,40}$/.test(k)))].slice(0, MOST);
let owned = null;
const load = () => {
  if (owned === null) {
    owned = [];
    try { owned = cleanCosmetics(JSON.parse(localStorage.getItem(KEY))); } catch { /* (no storage, or a broken value: none) */ }
  }
  return owned;
};
const store = () => { if (!Progress.noSave) { try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch { /* (no storage: for this visit) */ } } };
// the keys owned that are not free-by-registry (as stored; 'abs' lists free ones too, harmlessly)
export const ownedCosmetics = () => [...load()];
// free, or its key is in the list
export const ownsCosmetic = (slot, id) => isFreeCosmetic(slot, id) || load().includes(cosmeticKey(slot, id));
// keys given to the player (unlockall.js 'abs'): cleaned, kept once each
export const grantCosmetics = (keys) => { owned = cleanCosmetics([...load(), ...keys]); store(); };
// Reset progress: all given cosmetics forgotten (the free ones stay free)
export const clearCosmetics = () => { owned = []; if (!Progress.noSave) { try { localStorage.removeItem(KEY); } catch { /* (no storage) */ } } };
// read again from storage (for a check)
export const reloadCosmetics = () => { owned = null; };
