// ============================================================================
// SHOP - card packs for sale (CHECKLIST items 115 and 154; the screen is render/shop.js). The offers are BUILT FROM THE
// PACKS (packs.json: one definition per pack, PACK-DEFINITIONS-DRAFT.md): every pack with a `shop` block is an offer
// (its id the pack's), and every entry of `bundles` (a pack x a count at a price) is one; the Shop's rows are packs.json
// `sections`; an offer's words are generated from the pack's rules (packs.js describePack / describeBundle). shop.json
// holds only the CURRENCY, a PLACEHOLDER: the owner has not decided what buys packs, so it is a stand-in with its own
// balance in the save (Progress.data.shopCash), never the bank (the tips), and nothing in the game gives it yet.
// A pack bought is given through Packs.grant(id) and OPENED AT ONCE (Packs.revealNow: the reveal, render/packs.js).
// PURCHASE LIMITS (the owner, 12-Oct: "limited packs with total purchase limits", "daily purchase limits too, I want a
// free daily pack"): a pack's shop.limits { total, daily } (either or both; none: unlimited). TOTAL: how many of the
// pack may EVER be bought; DAILY: how many a day, the day being the player's LOCAL calendar day by the device clock
// (Events.now(), as the event windows: the checks move it), reset at local midnight. The counters are in the save
// (Progress.data.packBuys: { [pack id]: { total, day: 'YYYY-MM-DD', today } }); a bundle counts each pack it gives, and
// one that would go over a limit is refused (why 'limit'). The device clock can be changed by the player: a
// single-player game with a local save accepts that for now (SAVE-NOTES.md: server side only if the economy goes online).
// A pack at price 0 is FREE (the Daily pack): its button is 'Claim', and claiming opens it at once.
// Packs are reached through import.meta.glob, so the Shop builds and is checked whether or not packs.js is in the
// tree; without it nothing can be bought ("packs"). A check hands in its own: Shop.usePacks(stub).
// ============================================================================
import shopData from './shop.json';
import { Progress } from './progress.js';
import { Events } from './events.js';

const found = Object.values(import.meta.glob('./packs.js', { eager: true }))[0] || null;
const packData = Object.values(import.meta.glob('./packs.json', { eager: true, import: 'default' }))[0] || { packs: {}, bundles: {}, sections: [] };
let packs = found?.Packs || null;
const PACKS = packData.packs || {};

export const CURRENCY = shopData.currency;
export const SECTIONS = packData.sections || [];
const RIBBONS = { featured: 'Featured', sale: 'Sale', new: 'New', best: 'Best value' };
// an amount of the placeholder currency, as the Shop writes it: "◆ 1,250"
export const cash = (n) => CURRENCY.sign + ' ' + Math.floor(n).toLocaleString('en-GB');

// ---- the player's LOCAL day (the device clock: Events.now()): 'YYYY-MM-DD', and when the next one starts ----
export const localDay = (t = Events.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export const nextMidnight = (t = Events.now()) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };

// the offers, as packs.json has them: a pack's shop block (its id the pack's), then the bundles. { id, pack, kind (the
// pack's id, for its art), section, count, price, was, ribbon, name, blurb }
const words = (fn, x) => (typeof found?.[fn] === 'function' ? found[fn](x) : '');
const RAW = [
  ...Object.entries(PACKS).filter(([, p]) => p?.shop).map(([id, p]) => ({ id, pack: id, kind: id, section: p.shop.section, count: 1, price: p.shop.price, was: p.shop.was ?? null,
    ribbon: p.shop.ribbon ?? null, name: p.name || id, blurb: words('describePack', id) })),
  ...Object.entries(packData.bundles || {}).map(([id, b]) => ({ id, pack: b.pack, kind: b.pack, section: b.section || 'bundles', count: Math.max(1, Math.floor(b.count || 1)), price: b.price,
    was: b.was ?? null, ribbon: b.ribbon ?? null, name: found?.bundleName ? found.bundleName(b) : b.name || id, blurb: words('describeBundle', b), bundle: true })),
];
const eventOf = (offer) => { const e = PACKS[offer.pack]?.event; return e ? Events.specials.find(x => x.id === String(e)) || null : null; };

export const Shop = {
  data: shopData,
  // the offers as built from packs.json (before any is looked up: a check may add one)
  raw: RAW,
  // the placeholder balance
  balance() { return Math.max(0, Math.floor(Number(Progress.data.shopCash) || 0)); },
  // an offer by id, with what the screen shows of it: { ...offer, event, endsAt, featured: [entries { car, weight, key,
  // amount }: packs.js featuredOf], ribbonName, off (share off, 0..1), free (price 0), limits }. null: no such offer
  offer(id) {
    const offer = RAW.find(o => o.id === id);
    if (!offer) return null;
    const event = eventOf(offer);
    const featured = PACKS[offer.pack]?.featured && found?.featuredOf ? found.featuredOf(offer.pack) : [];
    return { ...offer, event, endsAt: event?.to ?? null, featured, free: offer.price === 0, limits: this.limitsOf(offer.pack),
      ribbonName: RIBBONS[offer.ribbon] || null, off: offer.was > offer.price ? 1 - offer.price / offer.was : 0 };
  },
  // the offers on now (a pack with an event only while it is on), by section, in packs.json's order
  offers(t = Events.now()) {
    return RAW.map(o => this.offer(o.id)).filter(o => !PACKS[o.pack]?.event || (o.event && Events.live(o.event, t)));
  },
  // ---- PURCHASE LIMITS ----
  limitsOverride: null, // (the debug ?limits=ten:t3,daily:d2: { [pack id]: { total, daily } } over packs.json's, for a visit)
  // a pack's limits: { total, daily } (each a number or undefined), or null: none
  limitsOf(packId) {
    const L = this.limitsOverride?.[packId] ?? PACKS[packId]?.shop?.limits ?? null;
    return L && (L.total > 0 || L.daily > 0) ? { ...(L.total > 0 ? { total: Math.floor(L.total) } : {}), ...(L.daily > 0 ? { daily: Math.floor(L.daily) } : {}) } : null;
  },
  // how many of a pack were bought: { total (ever), today (on the player's local day of t) }
  bought(packId, t = Events.now()) {
    const b = Progress.data.packBuys?.[packId];
    return { total: Math.max(0, Math.floor(b?.total || 0)), today: b && b.day === localDay(t) ? Math.max(0, Math.floor(b.today || 0)) : 0 };
  },
  // how many more may be bought: { total, today } (null where there is no such limit)
  left(packId, t = Events.now()) {
    const L = this.limitsOf(packId), b = this.bought(packId, t);
    return { total: L?.total ? Math.max(0, L.total - b.total) : null, today: L?.daily ? Math.max(0, L.daily - b.today) : null };
  },
  // can it be bought? { ok, why }: why 'unknown' (no such offer), 'over' (its event is over), 'packs' (no packs in this
  // build), 'limit' (a purchase limit: limit 'total' with words 'Sold out' (none left ever), or 'daily' with words 'Come
  // back tomorrow' and next (when the local day turns); left: how many may still be bought, below a bundle's count:
  // 'Only n left'), 'exhausted' (a pack whose featured cards the player has all: every car maxed, every key owned; the
  // owner, 12-Oct: "If a player has every featured card in a pack greyed out, don't allow them to purchase it". Only
  // buying: a pack an event gives is still given), 'short' (not enough of the currency). The limit is said before the
  // featured cards (one reason at a time)
  canBuy(id, t = Events.now()) {
    const offer = this.offer(id);
    if (!offer) return { ok: false, why: 'unknown' };
    if (PACKS[offer.pack]?.event && !(offer.event && Events.live(offer.event, t))) return { ok: false, why: 'over' };
    if (!packs) return { ok: false, why: 'packs' };
    const left = this.left(offer.pack, t);
    if (left.total !== null && left.total < offer.count) return { ok: false, why: 'limit', limit: 'total', left: left.total, words: left.total ? 'Only ' + left.total + ' left' : 'Sold out' };
    if (left.today !== null && left.today < offer.count) return { ok: false, why: 'limit', limit: 'daily', left: left.today, next: nextMidnight(t), words: left.today ? 'Only ' + left.today + ' left today' : 'Come back tomorrow' };
    if (PACKS[offer.pack]?.featured && offer.featured.length && packs.featuredExhausted?.(offer.pack, offer.featured)) return { ok: false, why: 'exhausted' };
    if (this.balance() < offer.price) return { ok: false, why: 'short', need: offer.price - this.balance() };
    return { ok: true };
  },
  // bought (or a free one claimed): the price taken, the packs given (Packs.grant), counted toward the pack's limits
  // (each pack of a bundle), and opened at once (Packs.revealNow). { ok, why, offer, name } (name: the pack's)
  buy(id, t = Events.now()) {
    const can = this.canBuy(id, t);
    if (!can.ok) return can;
    const offer = this.offer(id);
    Progress.data.shopCash = this.balance() - offer.price;
    const name = packs.grant(offer.pack, { n: offer.count });
    if (!name) { // (a pack packs.js does not have: nothing given, nothing taken)
      Progress.data.shopCash = this.balance() + offer.price;
      return { ok: false, why: 'kind' };
    }
    const buys = (Progress.data.packBuys ||= {}), b = (buys[offer.pack] ||= { total: 0, day: '', today: 0 }), day = localDay(t);
    if (b.day !== day) { b.day = day; b.today = 0; }
    b.total += offer.count; b.today += offer.count;
    Progress.save();
    globalThis.window?.dispatchEvent?.(new Event('shopchange'));
    packs.revealNow?.(); // (opened at once: the reveal over the Shop)
    return { ok: true, offer, name };
  },
  // the FREE offers that can be claimed now (the Daily pack waiting: the menu's Shop chip shows a dot)
  claimable(t = Events.now()) { return this.offers(t).filter(o => o.free && this.canBuy(o.id, t).ok); },
  // DEBUG ONLY (?debug, or a check): some of the placeholder currency, saved
  addCash(n = shopData.debugGrant) {
    Progress.data.shopCash = this.balance() + Math.max(0, Math.floor(n));
    Progress.save();
    globalThis.window?.dispatchEvent?.(new Event('shopchange'));
  },
  hasPacks() { return !!packs; },
  // (a check: its own Packs, or null for none)
  usePacks(stub) { packs = stub; },
};
// the debug limits (?limits=ten:t3,standard:d2,career:t5d1: a pack's total / daily limit for a visit): { id: { total, daily } }
export const debugLimits = (raw) => {
  const out = {};
  for (const part of String(raw || '').split(',').map(x => x.trim()).filter(Boolean)) {
    const [id, spec = ''] = part.split(':'), t = /t(\d+)/i.exec(spec), d = /d(\d+)/i.exec(spec);
    if (id) out[id] = { ...(t ? { total: +t[1] } : {}), ...(d ? { daily: +d[1] } : {}) };
  }
  return Object.keys(out).length ? out : null;
};
// the debug purchases (?shopbuys=daily:1,ten:2: so many of a pack bought today, for a visit): written into the save's
// counters (the caller sets Progress.noSave)
export const debugBuys = (raw, t = Events.now()) => {
  for (const part of String(raw || '').split(',').map(x => x.trim()).filter(Boolean)) {
    const [id, n] = part.split(':'), k = Math.max(0, Math.floor(Number(n) || 0));
    if (id && k) (Progress.data.packBuys ||= {})[id] = { total: k, day: localDay(t), today: k };
  }
};
