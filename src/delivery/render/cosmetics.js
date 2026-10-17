// ---- the COSMETICS REGISTRY: every cosmetic item in the game, in one place, as data (the owner, 14-Oct: "wire the Unlock
// Absolutely everything button to include all cosmetics"; CHECKLIST 278). One item = { slot, id, name, free }. Its KEY is
// 'slot:id' ('wheels:whitewall-silver'), which is what the owned list holds and what unlockall.js grants.
//   free: true   anyone has it (all of today's: the 12 wheel sets); free: false   owned only when its key is in the owned list
//                (the list below: its OWN localStorage key KEY, never the cookie and NOT in progress.js's save).
// HOW TO ADD A COSMETIC: a slot's module calls registerCosmetics([{ slot: 'plate', id: 'gold-plate', name: 'Gold plate', free: false }])
// once, as it loads (render/wheelcosmetic.js does it for WHEEL_SETS, so a new wheel set is registered by being added to that list);
// a NEW slot's module is also imported by unlockall.js, so that "Absolutely everything" sees its items. Nothing else: the
// A later shop: an item may carry `price` (a placeholder, 0 = none; nothing reads it yet: TODO CHECKLIST 286). The Cosmetics screen asks owned(slot, id) (render/cosmeticsui.js) -> ownsCosmetic here, and a locked item shows locked and
// cannot be equipped. Not a rule of a run (no rules module imports this; it is not in the replay fingerprint).
// OWNERSHIP IS DELIBERATELY OUTSIDE progress.js (the owner, 14-Oct: "cosmetics should not break the hash"): progress.js is read by
// rules modules, so any edit to it changes the replay fingerprint (vite.config.js logicFiles). This file (render/, outside the walk) is imported by no rules
// module, so cosmetics are NOT part of the fingerprint: a replay or ghost never refuses to play over one. A cosmetic the player
// does not own, or one that no longer exists, simply shows Stock (wheelcosmetic.js). Known limit: because the save code
// (Progress.exportCode / tidy) lives in progress.js, ownership is NOT carried in a save code; it stays in this browser.
// The list is kept in localStorage under KEY, a JSON array of 'slot:id' keys, read once, cleaned, every access in try/catch, not
// written on a test visit (Progress.noSave: held for the visit only), cleared by the menu's Reset progress.
// ---- EARNED COSMETICS: LIKE CARDS (the owner, 16-Oct: "Plates will be earned. Cosmetics will be earned and 1 will be consumed when
// equipped to a vehicle"; then: "treat cosmetics exactly like cards: if the player has 1 of it, it is unlocked. Equipping it takes 1 from
// their stock. Unequipping gives it back"; CHECKLIST 433, EARNED-COSMETICS.md). The slots in EARNED_SLOTS have no cash price: each item is
// a COUNT, how many the player has been given. They are given ONLY through awardCosmetic() below, the one entry point, which the card packs
// call (packs.js: a pack's `cosmetics` list in packs.json, the owner's to place); where they drop is the owner's, nothing here decides it.
// The HAND (what can still be equipped) is that count less the cars wearing it (render/cosmeticstock.js counts the wearers from the loadout
// store, so taking one off, replacing it or resetting a car puts it back in the hand by itself). Each earned slot's own 'nothing' look
// (Stock plate, no prop, Classic kill effect, no glow) stays free and unlimited. The wheels stay free for now.
// STORAGE: a second localStorage key, STOCK_KEY { v: 1, n: { key: count }, inf?: true, mig?: 1 }; the old list (KEY, an array of keys) is
// still written, as the keys with a count, so an older build (or a rollback) still finds them owned. A key in the old list with no count is
// read as 1. "Unlock everything: Absolutely" (unlockall.js) gives MOST_EACH (999) of every item: a real stock, as 999 cards of each.
// ownsCosmetic(slot, id) means "has at least one" (unlocked: what a render module asks before it draws a choice). Everything stays outside
// progress.js and outside the replay fingerprint, as before.
import { Progress } from '../progress.js';
import * as Store from './loadoutstore.js';
export const KEY = 'delivery.cosmetics';
export const STOCK_KEY = 'delivery.cosmetics.stock';
const MOST = 300;
export const MOST_EACH = 999; // (the most of one item; what 'Absolutely' gives of each)
// the slots whose items are earned (a stock each) and each one's own free look (worn when nothing is chosen; never counted)
export const EARNED_SLOTS = Object.freeze({ plate: 'stock', roof: 'none', cargo: 'none', wing: 'none', kill: 'classic', underglow: 'none' });
// the field of a loadout slot that names its item (render/loadoutstore.js)
export const ITEM_FIELD = Object.freeze({ plate: 'design', roof: 'id', cargo: 'id', wing: 'id', kill: 'id', underglow: 'id' });
// THE RARITY an earned cosmetic's CARD shows (the owner, 16-Oct: "render each cosmetic item using the same card as an Uncommon Blueprint"):
// one constant for now; an item may carry its own `rarity` (registerCosmetics keeps it), read through cosmeticRarity
export const COSMETIC_RARITY = 'uncommon';
export const isEarnedSlot = (slot) => Object.prototype.hasOwnProperty.call(EARNED_SLOTS, slot);

export const COSMETICS = [];
export const cosmeticKey = (slot, id) => slot + ':' + id;
// add items (one entry per key: a repeat is ignored); returns a function that takes them out again (for a check's fixture).
// An item of an EARNED slot is earned (free: false, no price) unless it is that slot's own free look; other slots keep their `free`.
export const registerCosmetics = (items) => {
  const added = [];
  for (const item of items) {
    if (!item || !item.slot || !item.id || COSMETICS.some(c => c.slot === item.slot && c.id === item.id)) continue;
    const slot = String(item.slot), id = String(item.id), earned = isEarnedSlot(slot) && id !== EARNED_SLOTS[slot];
    const entry = { slot, id, name: String(item.name || item.id), free: isEarnedSlot(slot) ? !earned : item.free === true, earned, price: earned ? 0 : (Number.isFinite(item.price) ? item.price : 0), ...(typeof item.rarity === 'string' && /^[a-z]{1,20}$/.test(item.rarity) ? { rarity: item.rarity } : {}) }; // (price: no cosmetic is sold; an earned one has none)
    COSMETICS.push(entry);
    added.push(entry);
  }
  return () => { for (const entry of added) { const at = COSMETICS.indexOf(entry); if (at >= 0) COSMETICS.splice(at, 1); } };
};
// every cosmetic key there is ('wheels:whitewall-silver'), free ones included: what "Absolutely everything" grants
export const cosmeticKeys = () => COSMETICS.map(c => cosmeticKey(c.slot, c.id));
export const isFreeCosmetic = (slot, id) => COSMETICS.some(c => c.slot === slot && c.id === id && c.free) || (isEarnedSlot(slot) && id === EARNED_SLOTS[slot]);
export const cosmeticOf = (slot, id) => COSMETICS.find(c => c.slot === slot && c.id === id) || null;
export const cosmeticRarity = (slot, id) => cosmeticOf(slot, id)?.rarity || COSMETIC_RARITY;
// the small line over a cosmetic card's name (the card: render/blueprintcard.js opts.item)
export const COSMETIC_SLOT_WORDS = Object.freeze({ plate: 'Number plate', roof: 'Roof prop', cargo: 'Cargo prop', wing: 'Rear wing', kill: 'Kill effect', underglow: 'Underglow' });

// the list, cleaned as a loaded save is: text keys of the right shape, no repeats, no more than MOST (anything else is dropped)
const KEY_RE = /^[a-z0-9-]{1,40}:[A-Za-z0-9_-]{1,40}$/;
export const cleanCosmetics = (list) => [...new Set((Array.isArray(list) ? list : []).filter(k => typeof k === 'string' && KEY_RE.test(k)))].slice(0, MOST);
const cleanCounts = (n) => {
  const out = {};
  if (!n || typeof n !== 'object' || Array.isArray(n)) return out;
  for (const [k, v] of Object.entries(n).slice(0, MOST)) { const c = Math.floor(Number(v)); if (KEY_RE.test(k) && c > 0) out[k] = Math.min(MOST_EACH, c); }
  return out;
};
const cleanStock = (raw) => {
  const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return { v: 1, n: cleanCounts(v.n), ...(v.mig ? { mig: 1 } : {}) };
};
let stock = null;
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
// the items worn in the loadout store (the default or any car's own): each made at least 1 on the first load (the full count, one a car, is
// render/cosmeticstock.js's migration), so a look worn before cosmetics were earned is never lost, not even for a frame
const wornKeys = () => {
  const out = new Set();
  try {
    const snap = Store.snapshot();
    for (const look of [snap.default, ...Object.values(snap.cars || {})]) {
      for (const slot of Object.keys(EARNED_SLOTS)) { const id = look?.[slot]?.[ITEM_FIELD[slot]]; if (id && id !== EARNED_SLOTS[slot]) out.add(cosmeticKey(slot, id)); }
    }
  } catch { /* (no store: none) */ }
  return out;
};
const load = () => {
  if (stock === null) {
    const had = read(STOCK_KEY), old = cleanCosmetics(read(KEY));
    stock = cleanStock(had);
    const abs = !had && old.length && Progress.data?.unlockMode === 'abs'; // (an 'Absolutely' save from before: 999 of each it was given)
    for (const k of old) if (!stock.n[k]) stock.n[k] = abs ? MOST_EACH : 1; // (the old list, or an older build's grant: one each)
    if (!had) for (const k of wornKeys()) if (!stock.n[k]) stock.n[k] = 1; // (the first load of this version: what is worn is owned)
  }
  return stock;
};
const store = () => {
  if (Progress.noSave) return;
  try { localStorage.setItem(STOCK_KEY, JSON.stringify(stock)); } catch { /* (no storage: for this visit) */ }
  try { localStorage.setItem(KEY, JSON.stringify(Object.keys(stock.n).slice(0, MOST))); } catch { /* (the old list, for an older build) */ }
};
// the keys with at least one (as stored; 'abs' lists free ones too, harmlessly)
export const ownedCosmetics = () => Object.keys(load().n);
// how many of an item the player has been given: Infinity for a free one, else the count (0: not earned)
export const cosmeticCount = (slot, id) => (isFreeCosmetic(slot, id) ? Infinity : load().n[cosmeticKey(slot, id)] || 0);
// free, unlimited, or at least one
// TRY-ON (CHECKLIST, cosmetics flow): an item not owned may be WORN on the Cosmetics screen as a preview, for the screen's visit only (never
// stored, never counted): its key is in this set while the screen is open (render/cosmeticsui.js), and Confirm / Back clear it
const tryOn = new Set();
export const setTryOn = (slot, id) => { tryOn.add(cosmeticKey(slot, id)); };
export const clearTryOn = () => { tryOn.clear(); };
export const isTryOn = (slot, id) => tryOn.has(cosmeticKey(slot, id));
export const ownsCosmetic = (slot, id) => cosmeticCount(slot, id) > 0 || tryOn.has(cosmeticKey(slot, id));
// keys given to the player: n more of each (most MOST_EACH); awardCosmetic below is the game's one way in
export const grantCosmetics = (keys, n = 1) => {
  const s = load();
  for (const k of cleanCosmetics(keys)) if (s.n[k] || Object.keys(s.n).length < MOST) s.n[k] = Math.min(MOST_EACH, (s.n[k] || 0) + Math.max(1, Math.floor(n) || 1));
  store();
};
// make a count at least n (the migration: render/cosmeticstock.js)
export const topUpCosmetic = (key, n) => { const s = load(); if (KEY_RE.test(key) && (s.n[key] || 0) < n && (s.n[key] || Object.keys(s.n).length < MOST)) { s.n[key] = Math.min(MOST_EACH, n); store(); } };
// 'Absolutely' (unlockall.js): MOST_EACH of every key there is
export const grantAll = (keys = cosmeticKeys()) => { for (const k of cleanCosmetics(keys)) topUpCosmetic(k, MOST_EACH); };
// the migration mark (render/cosmeticstock.js migrateStock): here, so Reset progress clears it too
export const stockMeta = () => ({ mig: !!load().mig });
export const setStockMeta = ({ mig } = {}) => { const s = load(); if (mig) s.mig = 1; store(); };
// ==== THE ONE ENTRY POINT: award cosmetic X (n of it). Called by the card packs (packs.js Packs.open, a pack's `cosmetics` list) and the debug
// switch (?czgive=, render/cosmeticsui.js). key: 'plate:hex' (or slot and id apart). Returns { key, slot, id, name, n, count } or null (a key of
// the wrong shape). An id the registry does not hold yet is kept anyway (its module may load later; an unknown one is simply never worn).
// Tells onAward listeners and dispatches window 'cosmeticaward' (detail: the award).
const awardListeners = new Set();
export const onAward = (fn) => { awardListeners.add(fn); return () => awardListeners.delete(fn); };
export const awardCosmetic = (key, n = 1, { source = null } = {}) => {
  const k = String(key || '');
  if (!KEY_RE.test(k)) return null;
  const many = Math.max(1, Math.min(MOST_EACH, Math.floor(Number(n)) || 1));
  grantCosmetics([k], many);
  const [slot, id] = k.split(':'), c = cosmeticOf(slot, id);
  const award = { key: k, slot, id, name: c?.name || id, n: many, count: load().n[k] || 0, source };
  for (const fn of [...awardListeners]) { try { fn(award); } catch { /* (a listener's own) */ } }
  try { window.dispatchEvent?.(new CustomEvent('cosmeticaward', { detail: award })); } catch { /* (no window) */ }
  return award;
};
// Reset progress: all given cosmetics forgotten (the free ones stay free)
export const clearCosmetics = () => {
  stock = cleanStock({});
  if (!Progress.noSave) { try { localStorage.removeItem(KEY); localStorage.removeItem(STOCK_KEY); } catch { /* (no storage) */ } }
};
// read again from storage (for a check)
export const reloadCosmetics = () => { stock = null; };
