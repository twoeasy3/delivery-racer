// ---- the Shop: card packs for sale (shop.js, shop.json; CHECKLIST item 115) ----------------------------------
// A screen over the start screen, reached by the Shop button at the top of the menu (beside the bank). After a
// racing game's store: the wallet along the top (the PLACEHOLDER currency, Crazey Cash, and its balance), then rows
// of big tiles, top to bottom (packs.json sections; the offers are the packs' own: shop.js): the FREE DAILY PACK (its
// button 'Claim', a 'Free' ribbon; claimed, a greyed 'Claimed: next in 7h 12m' counting down to local midnight; the
// menu's Shop chip wears a small dot while it waits), Featured (a special pack, its featured cars drawn on the tile as the special event's
// cards draw theirs: carstill.js, the real model, kept as a picture; the four poses are the blueprint cards' only), Card packs, Bundles; then what each
// rarity holds. A tile: its pack drawn in CSS (the foil in the colour of what it promises: grey Common, green
// Uncommon, purple Epic, gold Legendary, the Bespoke rainbow), a ribbon (Featured, Sale with the share off, New, Best
// value), what is in it, the drop rates as a bar, and the price on its button. Buying asks first, takes the price, and
// the pack OPENS AT ONCE over the Shop (the reveal, render/packs.js; the owner, 12-Oct); Done comes back here.
// Phones first: one column that scrolls, two tiles a row; wider, the rows spread out.
// A pack with PURCHASE LIMITS (packs.json shop.limits) says what is left on its tile ('Limited: 2 left', '1 left today');
// none left, its button greys ('Sold out', 'Come back tomorrow'), one reason at a time (a limit before the featured cards).
// ?limits=ten:t3,standard:d2 and ?shopbuys=daily:1,ten:2 set limits and today's purchases for a visit (nothing saved).
// ?shop opens it at once; ?shopcash=<n> sets the balance for the visit (nothing saved); ?debug shows a button on the
// wallet that adds some (saved). Neither is seen by a player who did not ask for it.
import '../shop.css';
import { Shop, CURRENCY, SECTIONS, cash, debugLimits, debugBuys } from '../shop.js';
import { Progress } from '../progress.js';
import { Events } from '../events.js';
import { Nav } from '../nav.js';
import { Game } from '../game.js';
import { stars } from '../cars.js';
import { ask, tell } from './dialog.js';
import { drawSoon as stillSoon } from './carstill.js';
import { packArt, lookOf } from './packart.js';
import { openContents, closeContents } from './packcontents.js';
import { keyPicture } from './keycard.js';
import { bannerCars, bannerArt } from './packbanner.js';

// (packs.js, where the tree has it: see shop.js)
const packsModule = Object.values(import.meta.glob('../packs.js', { eager: true }))[0] || null;
const packData = Object.values(import.meta.glob('../packs.json', { eager: true, import: 'default' }))[0] || null;
const packName = (id) => packsModule?.packName?.(id) || packData?.packs?.[id]?.name || id;

const RARITIES = ['common', 'uncommon', 'epic', 'legendary', 'bespoke'];
const RARITY_NAMES = { common: 'Common', uncommon: 'Uncommon', epic: 'Epic', legendary: 'Legendary', bespoke: 'Bespoke' };
const RARITY_HOLDS = {
  common: 'Blueprints for 2 to 4 star cars',
  uncommon: 'Blueprints for 5 star and 1 to 3 blue star cars',
  epic: 'Blueprints for 4 and 5 blue star cars, and a few evergreen cars',
  legendary: 'Blueprints for the rarest cars, and featured cars',
  bespoke: 'A car’s key: it is yours to drive',
};

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
const params = new URLSearchParams(location.search);
const debug = params.get('debug') !== null;

// ---- the drop rates of a kind (packs.json odds, the rarities its pool has), as a bar --------------------------------
const oddsOf = (kind) => {
  const odds = packData?.odds, spec = packData?.packs?.[kind];
  if (!odds || !spec) return null;
  const has = RARITIES.filter(r => odds[r] > 0 && !(r === 'bespoke' && spec.pool !== 'all'));
  const total = has.reduce((n, r) => n + odds[r], 0);
  return has.map(r => [r, odds[r] / total]);
};
const oddsBar = (kind, offer) => {
  const odds = oddsOf(kind);
  if (!odds) return null;
  const bar = make(packsModule?.contents ? 'button' : 'div', 'shop-odds', ...odds.map(([r, share]) => {
    const seg = make('i', 'r-' + r);
    seg.style.flexGrow = String(Math.max(share, 0.015));
    return seg;
  }));
  bar.title = 'A card’s chance: ' + odds.map(([r, share]) => RARITY_NAMES[r] + ' ' + pct(share)).join(', ');
  if (offer && packsModule?.contents) {
    bar.title += '. Tap for every card';
    bar.setAttribute('aria-label', 'What’s inside: ' + bar.title);
    bar.addEventListener('click', () => showContents(offer));
  }
  return bar;
};
// "What's inside": every card the pack can give (render/packcontents.js), from the tile's info button or its odds bar
const showContents = (offer) => openContents(screen, { kind: offer.pack, title: offer.name, featured: offer.featured || [] });
const insideButton = (offer) => {
  if (!packsModule?.contents || !packData?.packs?.[offer.pack]) return null;
  const button = make('button', 'shop-inside', make('i', '', 'i'), 'What’s inside');
  button.setAttribute('aria-label', 'What’s inside the ' + offer.name + ': every card it can give');
  button.addEventListener('click', () => showContents(offer));
  return button;
};
const pct = (share) => (share >= 0.1 ? Math.round(share * 100) : Math.round(share * 1000) / 10) + '%';

// how long until an offer ends: "3d 4h", "5h 12m", "9m 30s"
const countdown = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : m + 'm ' + (s % 60) + 's';
};

// ---- the screen ------------------------------------------------------------------------------------------------
const screen = make('div', 'shop-screen hidden');
screen.id = 'shopScreen';
screen.setAttribute('role', 'dialog');
screen.setAttribute('aria-label', 'Shop');
document.body.append(screen);

const gem = () => make('span', 'shop-gem', make('i'));
// a greyed button, not one to press (the 'Nothing new to feature' look: shop.css .shop-price.exhausted); inside: its words
const greyed = (label, ...inside) => {
  const off = make('button', 'shop-price exhausted', ...inside);
  off.disabled = true;
  off.setAttribute('aria-label', label);
  return off;
};
// a live countdown to a time (the Shop's ticker updates it each second, and draws the Shop again when it runs out)
const live = (end) => { const b = make('b', 'countdown', countdown(end - Events.now())); b.dataset.end = end; return b; };
const priceButton = (offer) => {
  const can = Shop.canBuy(offer.id);
  // a purchase limit reached (shop.js why 'limit'): greyed, one reason (said before the featured cards'). A free daily
  // pack claimed: "Claimed: next in 7h 12m", counting down to the player's local midnight
  if (can.why === 'limit') {
    if (offer.free && can.limit === 'daily' && !can.left) return greyed(offer.name + ': claimed today, the next one after midnight', make('span', 'shop-claimed', 'Claimed: next in ', live(can.next)));
    return greyed(offer.name + ': ' + can.words, make('b', '', can.words));
  }
  if (can.why === 'exhausted') return greyed(offer.name + ': not for sale, you have every featured card', make('b', '', 'Nothing new to feature')); // (every featured card had: the owner, 12-Oct)
  if (offer.free) { // (a FREE pack, the Daily pack: claimed, not bought)
    const claim = make('button', 'shop-price claim' + (can.ok ? '' : ' short'), make('b', '', 'Claim'));
    claim.setAttribute('aria-label', 'Claim the ' + offer.name + ': free');
    claim.addEventListener('click', () => buy(offer.id));
    return claim;
  }
  const button = make('button', 'shop-price' + (can.ok ? '' : ' short'),
    offer.was > offer.price ? make('s', '', cash(offer.was).replace(CURRENCY.sign + ' ', '')) : null,
    gem(), make('b', '', Math.floor(offer.price).toLocaleString('en-GB')));
  button.setAttribute('aria-label', 'Buy ' + offer.name + ' for ' + offer.price + ' ' + CURRENCY.name);
  button.addEventListener('click', () => buy(offer.id));
  return button;
};
// what a pack's limits leave (shop.js limits): "Limited: 2 left", "1 left today" (a pack with no limits, or a free daily
// pack, whose button says it: nothing). A bundle counts its packs: the pack's own figures
const limitLine = (offer) => {
  if (!offer.limits) return null;
  const left = Shop.left(offer.pack), out = [];
  if (left.total === 0 || left.today === 0) return null; // (none left: the greyed button says so, one reason at a time)
  if (left.total !== null) out.push('Limited: ' + left.total + ' left');
  if (left.today !== null && !(offer.free && offer.limits.daily === 1)) out.push(left.today + ' left today');
  return out.length ? make('p', 'shop-limit', out.join(' · ')) : null;
};
const ribbon = (offer) => (offer.free ? make('span', 'shop-ribbon rb-free', 'Free') : offer.ribbonName
  ? make('span', 'shop-ribbon rb-' + offer.ribbon, offer.ribbon === 'sale' && offer.off ? 'Sale −' + Math.round(offer.off * 100) + '%' : offer.ribbonName) : null);

const drawLater = [];
// the featured entries (packs.js featuredEntries: { car, weight, key, amount }), one picture a CAR (a car with an x3 and
// an x15 entry is one picture), at most three: a blueprint entry its car's still; a KEY entry the car's key (keycard.js,
// as the key cards draw it), chipped "Key"
const featuredTile = (offer) => {
  const seen = new Set(), shown = [];
  for (const f of offer.featured) {
    const id = (f.key ? 'key:' : '') + f.car.id;
    if (!seen.has(id)) { seen.add(id); shown.push(f); }
  }
  const trio = bannerCars(offer.featured), stills = [];
  const carViews = shown.slice(0, 3).map((f) => {
    const car = f.car;
    const view = make('div', 'shop-car' + (f.key ? ' key' : ''));
    if (f.key) view.append(keyPicture(car, 'bespoke'));
    else stills.push([view, car]);
    const rarity = f.key ? 'bespoke' : packsModule?.featuredRarity?.(car) || 'legendary';
    return make('div', 'shop-feature', view, make('div', 'shop-feature-name', make('span', 'shop-chip r-' + rarity, f.key ? 'Key' : 'Featured'), make('b', '', car.name),
      make('small', '', f.key ? 'Bespoke key' : stars(car) || 'Event car')));
  });
  const exhausted = Shop.canBuy(offer.id).why === 'exhausted';
  const ends = offer.endsAt ? make('p', 'shop-ends', 'Ends in ', live(offer.endsAt)) : null;
  // two or three featured cars: the BANNER (render/packbanner.js: the cars in one scene, the first the hero), its names
  // in labels; with no WebGL it gives way to the cars side by side (the art below, kept hidden till then)
  const cars = make('div', 'shop-hero-cars n' + carViews.length, ...carViews);
  const fallBack = () => { // (no banner after all: the cars side by side, drawn now)
    banner?.remove(); cars.hidden = false; art.classList.remove('banner'); art.closest('.shop-tile')?.classList.remove('has-banner');
    for (const [el, car] of stills) stillSoon(el, car, { side: 'good' });
  };
  const banner = trio ? bannerArt(trio, { onFail: fallBack }) : null;
  if (banner) cars.hidden = true; else drawLater.push(...stills);
  const art = make('div', 'shop-hero-art' + (banner ? ' banner' : ''), banner, cars, packArt(offer.kind, offer.count));
  return make('article', 'shop-tile hero k-' + offer.kind + (banner ? ' has-banner' : ''),
    ribbon(offer),
    art,
    make('div', 'shop-tile-info',
      offer.event ? make('small', 'shop-kicker', offer.event.name) : null,
      make('h3', '', offer.name), make('p', 'shop-blurb', offer.blurb), insideButton(offer), oddsBar(offer.pack, offer), ends, limitLine(offer),
      exhausted ? make('p', 'shop-exhausted', 'You have every featured card') : null),
    make('div', 'shop-tile-buy', priceButton(offer)));
};
const tile = (offer) => make('article', 'shop-tile k-' + offer.kind + ' r-' + lookOf(offer.pack) + (offer.free ? ' free' : ''),
  ribbon(offer),
  make('div', 'shop-tile-art', packArt(offer.kind, offer.count)),
  make('div', 'shop-tile-info', make('h3', '', offer.name), make('p', 'shop-blurb', offer.blurb), insideButton(offer), oddsBar(offer.pack, offer), limitLine(offer),
    Shop.canBuy(offer.id).why === 'exhausted' ? make('p', 'shop-exhausted', 'You have every featured card') : null), // (a special pack outside the Featured row)
  make('div', 'shop-tile-buy', priceButton(offer)));

const wallet = () => {
  const add = debug ? make('button', 'shop-add', '+ ' + cash(Shop.data.debugGrant) + ' (debug)') : null;
  add?.addEventListener('click', () => { Shop.addCash(); draw(); });
  return make('div', 'shop-wallet',
    make('div', 'shop-balance', gem(), make('b', '', Shop.balance().toLocaleString('en-GB')), make('small', '', CURRENCY.name)),
    CURRENCY.placeholder ? make('span', 'shop-placeholder', 'Placeholder') : null, add);
};
const rarityGuide = () => {
  const odds = Object.fromEntries(oddsOf('standard') || []);
  return make('section', 'shop-section guide',
    make('div', 'shop-section-head', make('h2', '', 'Rarities'), make('p', '', 'Each card is one blueprint of one car, or a key. The higher the rarity, the rarer the card')),
    make('div', 'shop-rarities', ...RARITIES.map(r => make('div', 'shop-rarity r-' + r,
      make('span', 'shop-chip r-' + r, RARITY_NAMES[r]), make('p', '', RARITY_HOLDS[r]), odds[r] ? make('small', '', pct(odds[r]) + ' of cards in a Standard pack') : null))));
};

let isOpen = false, ticker = 0, wasInMenu = false; // (wasInMenu: the showroom under it, when opened from there)
// Never drawn again under a finger: a redraw replaces the screen's content, and a touch whose element is taken away
// ends its scroll (on a phone it could leave the next touches going nowhere: CHECKLIST 117). While a touch is down on
// the Shop, or it is still gliding after one, a redraw asked for by an event waits until it settles. The scroll is kept.
let touching = 0, scrolledAt = 0, pending = 0;
const SETTLE = 180; // (ms after the last scroll before the screen may be drawn again)
const busy = () => touching > 0 || performance.now() - scrolledAt < SETTLE;
const drawSoon = () => {
  if (!busy()) { clearTimeout(pending); pending = 0; draw(); return; }
  if (!pending) pending = setTimeout(function again() { pending = busy() ? setTimeout(again, SETTLE) : (draw(), 0); }, SETTLE);
};
screen.addEventListener('touchstart', (e) => { touching += e.changedTouches.length; }, { passive: true });
const lift = (e) => { touching = e.touches.length ? Math.max(0, touching - e.changedTouches.length) : 0; };
screen.addEventListener('touchend', lift, { passive: true });
screen.addEventListener('touchcancel', lift, { passive: true });
screen.addEventListener('scroll', () => { scrolledAt = performance.now(); }, { passive: true, capture: true });
const draw = () => {
  clearTimeout(pending); pending = 0;
  const keep = screen.scrollTop;
  const kept = [...screen.querySelectorAll(':scope > .pack-contents')]; // (a sheet up stays up)
  drawLater.length = 0;
  const back = make('button', 'shop-back', make('span', '', '‹'), 'Back');
  back.addEventListener('click', () => ShopScreen.close());
  const offers = Shop.offers();
  const sections = SECTIONS.map((section) => {
    const here = offers.filter(o => o.section === section.id);
    if (!here.length) return null;
    return make('section', 'shop-section s-' + section.id,
      make('div', 'shop-section-head', make('h2', '', section.name), section.note ? make('p', '', section.note) : null),
      make('div', 'shop-row', ...here.map(o => (section.id === 'featured' ? featuredTile(o) : tile(o)))));
  });
  const note = CURRENCY.placeholder
    ? make('p', 'shop-note', CURRENCY.name + ' is a placeholder: what buys packs is not decided yet, and nothing in the game gives it.'
      + (Shop.hasPacks() ? '' : ' Packs are not in this build, so nothing can be bought.')) : null;
  screen.replaceChildren(
    make('header', 'shop-top', back, make('h1', '', 'Shop'), wallet()),
    make('div', 'shop-body', note, ...sections, rarityGuide()), ...kept);
  screen.scrollTop = keep;
  for (const [el, car] of drawLater) stillSoon(el, car, { side: 'good' }); // (always the Good livery; a few a frame, once laid out; kept, so a redraw costs nothing)
};

// ---- buying -----------------------------------------------------------------------------------------------------
const buy = async (id) => {
  const offer = Shop.offer(id), can = Shop.canBuy(id);
  if (!offer) return;
  if (!can.ok) {
    const lines = can.why === 'short' ? ['This costs ' + cash(offer.price) + '. You have ' + cash(Shop.balance()) + '.',
      CURRENCY.placeholder ? CURRENCY.name + ' is a placeholder for now: nothing in the game gives it yet.' : '']
      : can.why === 'packs' ? ['Card packs are not in this build yet.'] : can.why === 'exhausted' ? ['You have every featured card of this pack: nothing new to feature.'] : can.why === 'over' ? ['This offer has ended.']
        : can.why === 'limit' ? [can.limit === 'total' ? (can.left ? 'Only ' + can.left + ' left of the ' + packName(offer.pack) + ': too few for this.' : 'Sold out: there are no more of the ' + packName(offer.pack) + '.')
          : (can.left ? 'Only ' + can.left + ' more today.' : offer.free ? 'Claimed today. The next one is free after midnight.' : 'None left today. Come back tomorrow.')] : ['This cannot be bought.'];
    await tell({ title: can.why === 'short' ? 'Not enough ' + CURRENCY.name : can.why === 'limit' ? can.words : 'Not for sale', lines: lines.filter(Boolean) });
    draw();
    return;
  }
  if (offer.free) { // (a FREE pack, the Daily pack: claimed at once, no asking; it opens over the Shop)
    const done = Shop.buy(id);
    draw();
    if (!done.ok) await tell({ title: 'Not claimed', lines: ['Try again in a moment.'] });
    return;
  }
  const what = offer.count > 1 ? offer.name : 'one ' + offer.name;
  if (!await ask({ title: 'Buy ' + offer.name, lines: [cash(offer.price) + ' for ' + what + '. It opens at once.', 'You will have ' + cash(Shop.balance() - offer.price) + ' left.'], ok: 'Buy' })) return;
  const done = Shop.buy(id);
  draw();
  if (!done.ok) await tell({ title: 'Not bought', lines: ['Nothing was taken.'] });
  else packsModule?.Packs && (packsModule.Packs.again = { label: 'Buy another · ' + cash(offer.price), can: () => Shop.canBuy(id).ok, buy: () => buy(id) }); // (the reveal's end offers it again, render/packs.js: the same flow, the confirmation too, and it sets itself again after a buy: chained as long as the owner likes; 13-Oct)
  // (bought: the pack is opened at once, over the Shop: Shop.buy asked the reveal, render/packs.js)
};
export const ShopScreen = {
  get isOpen() { return isOpen; },
  open() {
    if (!isOpen) {
      isOpen = true;
      wasInMenu = Game.inMenu;
      Game.inMenu = true; // (Enter must not start a run from here)
      Nav.enter('shop', () => this.close()); // (the back button closes it)
      ticker = setInterval(() => { // (the countdowns, each second; an offer just over, and the screen drawn again)
        for (const node of screen.querySelectorAll('.countdown')) {
          const left = Number(node.dataset.end) - Events.now();
          if (left <= 0) { drawSoon(); return; }
          node.textContent = countdown(left);
        }
      }, 1000);
    }
    draw();
    screen.classList.remove('hidden');
    screen.scrollTop = 0;
  },
  close() {
    if (!isOpen) return;
    isOpen = false;
    clearInterval(ticker);
    Nav.leave('shop');
    Game.inMenu = wasInMenu; // (back to the showroom, when it was opened from there: still not the menu's Enter)
    screen.classList.add('hidden');
    closeContents();
  },
};

// the way in: a button at the top of the menu, after the bank
const button = make('button', 'menu-chip shop-btn', gem(), make('span', 'shop-word', 'Shop'));
button.id = 'shopBtn';
button.title = 'The Shop: card packs';
button.setAttribute('aria-label', 'Shop');
document.getElementById('bank')?.after(button);
button.addEventListener('click', () => ShopScreen.open());
// a FREE pack waiting (the Daily pack not claimed today): a small dot on the chip (unobtrusive), checked on any change
// and each minute (the local day turning at midnight brings it back)
const dot = make('span', 'shop-dot');
dot.hidden = true;
button.append(dot);
const markWaiting = () => {
  const waiting = Shop.claimable();
  dot.hidden = !waiting.length;
  button.title = 'The Shop: card packs' + (waiting.length ? '. A free ' + waiting[0].name + ' is waiting' : '');
  button.setAttribute('aria-label', 'Shop' + (waiting.length ? ': a free pack is waiting' : ''));
};
for (const type of ['shopchange', 'progresschange', 'packschange']) window.addEventListener(type, markWaiting);
setInterval(markWaiting, 60e3);
window.addEventListener('keydown', (event) => { // (Escape: the contents sheet first, then the Shop. A dialog or the reveal up takes its own)
  if (!isOpen || event.key !== 'Escape') return;
  if (!closeContents()) ShopScreen.close();
});
for (const type of ['progresschange', 'packschange']) window.addEventListener(type, () => { if (isOpen) drawSoon(); });

// ?featured=<list> (packs.js debugFeatured: id[!key][:weight[xamount]]) and ?maxed=<ids>&owned=<ids> (debugMarks): a
// featured list and cars counted as maxed / keys owned, and &double= / &base= (debugDouble), for this visit, nothing saved
if (packsModule?.debugFeatured && params.get('featured')) packsModule.Packs.featuredOverride = packsModule.debugFeatured(params);
if (packsModule?.debugMarks && (params.get('maxed') || params.get('owned'))) { packsModule.debugMarks(params); Progress.noSave = true; }
if (packsModule?.debugDouble && (params.get('double') || params.get('base'))) packsModule.debugDouble(params); // (&double=0.5&base=2: for the sheet, this visit)
// ?shopcash=<n>: the balance for this visit, nothing saved; ?shop: open at once (for a look or a picture)
if (params.get('shopcash') !== null) {
  Progress.noSave = true;
  Progress.data.shopCash = Math.max(0, Math.floor(Number(params.get('shopcash')) || 0));
}
// ?limits=ten:t3,standard:d2 (a pack's total / daily purchase limit) and ?shopbuys=daily:1,ten:2 (so many of a pack
// bought today): for this visit, nothing saved (for a look or a picture of a limited, sold-out or claimed tile)
if (params.get('limits')) Shop.limitsOverride = debugLimits(params.get('limits'));
if (params.get('shopbuys')) { Progress.noSave = true; debugBuys(params.get('shopbuys')); }
markWaiting();
if (params.get('shop') !== null && Game.state === 'start') ShopScreen.open();
// &inside=<offer id> (or a pack id; the old 'special': its pack): its "What's inside" sheet open too (for a look or a picture)
if (ShopScreen.isOpen && params.get('inside')) {
  const want = params.get('inside'), id = packsModule?.packIdOf?.(want) || want;
  const offer = Shop.offer(want) || Shop.offers().find(o => o.pack === id) || null;
  if (offer) showContents(offer);
  else if (packData?.packs?.[id]) openContents(screen, { kind: id, title: packsModule?.packName?.(id), featured: packsModule?.featuredOf?.(id) || [] });
}
