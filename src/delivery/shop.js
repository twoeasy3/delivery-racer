// ============================================================================
// SHOP - card packs for sale (CHECKLIST item 115; the screen is render/shop.js). Every offer is in shop.json.
// The currency is a PLACEHOLDER: the owner has not decided what buys packs (BLUEPRINTS-NOTES.md: "the economy that
// buys packs is a separate economy and UNDECIDED"), so it is a stand-in with its own balance in the save
// (Progress.data.shopCash), never the bank (the tips), and nothing in the game gives it yet. A pack bought is given
// unopened, through Packs.grant(kind) (packs.js), and opened on the Packs screen like any other.
// Packs are reached through import.meta.glob, so the Shop builds and is checked whether or not packs.js is in the
// tree; without it nothing can be bought ("packs"). A check hands in its own: Shop.usePacks(stub).
// ============================================================================
import shopData from './shop.json';
import { Progress } from './progress.js';
import { Events } from './events.js';
import { carById } from './cars.js';

const found = Object.values(import.meta.glob('./packs.js', { eager: true }))[0] || null;
let packs = found?.Packs || null;
const featuredFor = found?.featuredFor || null;

export const CURRENCY = shopData.currency;
export const SECTIONS = shopData.sections;
const OFFERS = shopData.offers;
const RIBBONS = { featured: 'Featured', sale: 'Sale', new: 'New', best: 'Best value' };
// an amount of the placeholder currency, as the Shop writes it: "◆ 1,250"
export const cash = (n) => CURRENCY.sign + ' ' + Math.floor(n).toLocaleString('en-GB');

const eventOf = (offer) => (offer.from ? Events.specials.find(e => e.id === String(offer.from)) || null : null);

export const Shop = {
  data: shopData,
  // the placeholder balance
  balance() { return Math.max(0, Math.floor(Number(Progress.data.shopCash) || 0)); },
  // an offer by id, with what the screen shows of it: { ...offer, event, endsAt, featured: [cars], ribbonName, off (share
  // off, 0..1) }. null: no such offer
  offer(id) {
    const offer = OFFERS.find(o => o.id === id);
    if (!offer) return null;
    const event = eventOf(offer);
    const ids = Array.isArray(offer.featured) && offer.featured.length ? offer.featured : null;
    const featured = ids ? ids.map(carById).filter(Boolean)
      : offer.kind === 'special' ? (featuredFor ? featuredFor(offer.from || null) : event ? [Events.prizeCar(event)].filter(Boolean) : []) : [];
    return { ...offer, count: Math.max(1, Math.floor(offer.count || 1)), event, endsAt: event?.to ?? null, featured,
      ribbonName: RIBBONS[offer.ribbon] || null, off: offer.was > offer.price ? 1 - offer.price / offer.was : 0 };
  },
  // the offers on now (a special pack only while its event is on), in shop.json's order
  offers(t = Events.now()) {
    return OFFERS.map(o => this.offer(o.id)).filter(o => !o.from || (o.event && Events.live(o.event, t)));
  },
  // can it be bought? { ok, why }: why 'unknown' (no such offer), 'over' (its event is over), 'packs' (no packs in
  // this build), 'short' (not enough of the currency)
  canBuy(id, t = Events.now()) {
    const offer = this.offer(id);
    if (!offer) return { ok: false, why: 'unknown' };
    if (offer.from && !(offer.event && Events.live(offer.event, t))) return { ok: false, why: 'over' };
    if (!packs) return { ok: false, why: 'packs' };
    if (this.balance() < offer.price) return { ok: false, why: 'short', need: offer.price - this.balance() };
    return { ok: true };
  },
  // bought: the price taken, the packs given unopened (Packs.grant). { ok, why, offer, name } (name: the pack's)
  buy(id, t = Events.now()) {
    const can = this.canBuy(id, t);
    if (!can.ok) return can;
    const offer = this.offer(id);
    Progress.data.shopCash = this.balance() - offer.price;
    const name = packs.grant(offer.kind, { from: offer.kind === 'special' ? offer.from || null : null, n: offer.count });
    if (!name) { // (a kind packs.json does not have: nothing given, nothing taken)
      Progress.data.shopCash = this.balance() + offer.price;
      return { ok: false, why: 'kind' };
    }
    Progress.save();
    globalThis.window?.dispatchEvent?.(new Event('shopchange'));
    return { ok: true, offer, name };
  },
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
