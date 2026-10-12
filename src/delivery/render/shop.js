// ---- the Shop: card packs for sale (shop.js, shop.json; CHECKLIST item 115) ----------------------------------
// A screen over the start screen, reached by the Shop button at the top of the menu (beside the bank). After a
// racing game's store: the wallet along the top (the PLACEHOLDER currency, Crazey Cash, and its balance), then rows
// of big tiles, top to bottom: Featured (a special pack, its featured cars drawn on the tile as the special event's
// cards draw theirs: drawStill, the real model at one pose, kept as a picture), Card packs, Bundles; then what each
// rarity holds. A tile: its pack drawn in CSS (the foil in the colour of what it promises: grey Common, green
// Uncommon, purple Epic, gold Legendary, the Bespoke rainbow), a ribbon (Featured, Sale with the share off, New, Best
// value), what is in it, the drop rates as a bar, and the price on its button. Buying asks first, takes the price and
// gives the packs unopened; then "Open now" (the Packs screen, render/packs.js) or "Keep shopping".
// Phones first: one column that scrolls, two tiles a row; wider, the rows spread out.
// ?shop opens it at once; ?shopcash=<n> sets the balance for the visit (nothing saved); ?debug shows a button on the
// wallet that adds some (saved). Neither is seen by a player who did not ask for it.
import '../shop.css';
import { Shop, CURRENCY, SECTIONS, cash } from '../shop.js';
import { Progress } from '../progress.js';
import { Events } from '../events.js';
import { Nav } from '../nav.js';
import { Game } from '../game.js';
import { stars } from '../cars.js';
import { ask, tell } from './dialog.js';
import { makeShowCar, paintShowCar } from './garage.js';
import { sharedRenderer, drawStill } from './modelviews.js';

// (packs.js and the Packs screen, where the tree has them: see shop.js)
const packsModule = Object.values(import.meta.glob('../packs.js', { eager: true }))[0] || null;
const packsScreen = Object.values(import.meta.glob('./packs.js', { eager: true }))[0]?.PacksScreen || null;
const packData = Object.values(import.meta.glob('../packs.json', { eager: true, import: 'default' }))[0] || null;

const RARITIES = ['common', 'uncommon', 'epic', 'legendary', 'bespoke'];
const RARITY_NAMES = { common: 'Common', uncommon: 'Uncommon', epic: 'Epic', legendary: 'Legendary', bespoke: 'Bespoke' };
const RARITY_HOLDS = {
  common: 'Blueprints for 2 to 4 star cars',
  uncommon: 'Blueprints for 5 star and 1 to 3 blue star cars',
  epic: 'Blueprints for 4 and 5 blue star cars, and a few evergreen cars',
  legendary: 'Blueprints for the rarest cars, and featured cars',
  bespoke: 'A car’s key: it is yours to drive',
};
// the best a kind of pack promises, for its foil and its tile
const KIND_LOOK = { career: 'common', standard: 'uncommon', ten: 'epic', special: 'bespoke' };
const KIND_MARK = { career: 'Career', standard: 'Standard', ten: '10', special: 'Special' };

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
const params = new URLSearchParams(location.search);
const debug = params.get('debug') !== null;

// ---- a car on a tile: its model drawn once at one pose, kept as a picture (as the special event's cards) ----------
const POSE = { lift: 0.26, angle: -0.64, close: 1 };
const stills = new Map();
const stillCar = (el, car) => {
  const r = el.getBoundingClientRect(), key = car.id + '/' + Math.round(r.width / 20) + 'x' + Math.round(r.height / 20);
  if (stills.has(key)) { el.style.backgroundImage = `url("${stills.get(key)}")`; return; }
  try {
    const model = makeShowCar(car);
    paintShowCar(model, car, false);
    if (!drawStill(sharedRenderer(), el, model, POSE)) return;
    const canvas = el.querySelector('canvas');
    stills.set(key, canvas.toDataURL('image/png'));
    canvas.remove();
    el.style.backgroundImage = `url("${stills.get(key)}")`;
  } catch (error) { console.warn('No model for the shop tile: ' + (error?.message || error)); }
};

// ---- a pack, drawn in CSS: foil in the colour of what it promises, a crimped top, the game's mark, what it is ------
const packArt = (kind, count = 1) => {
  const look = KIND_LOOK[kind] || 'common', shown = Math.min(3, count);
  const one = (i) => make('div', 'shop-pack r-' + look + ' k-' + kind,
    make('span', 'pack-crimp'), make('span', 'pack-sheen'),
    make('span', 'pack-brand', make('b', '', 'Delivery'), make('i', '', 'Run')),
    make('span', 'pack-mark', KIND_MARK[kind] || kind),
    make('span', 'pack-sub', kind === 'ten' ? '10 cards' : 'Card pack'),
    i === shown - 1 && count > 1 ? make('span', 'pack-count', '×' + count) : null);
  const stack = make('div', 'shop-packs n' + shown, ...Array.from({ length: shown }, (_, i) => one(i)));
  return stack;
};

// ---- the drop rates of a kind (packs.json odds, the rarities its pool has), as a bar --------------------------------
const oddsOf = (kind) => {
  const odds = packData?.odds, spec = packData?.kinds?.[kind];
  if (!odds || !spec) return null;
  const has = RARITIES.filter(r => odds[r] > 0 && !(r === 'bespoke' && spec.pool !== 'all'));
  const total = has.reduce((n, r) => n + odds[r], 0);
  return has.map(r => [r, odds[r] / total]);
};
const oddsBar = (kind) => {
  const odds = oddsOf(kind);
  if (!odds) return null;
  const bar = make('div', 'shop-odds', ...odds.map(([r, share]) => {
    const seg = make('i', 'r-' + r);
    seg.style.flexGrow = String(Math.max(share, 0.015));
    return seg;
  }));
  bar.title = 'A card’s chance: ' + odds.map(([r, share]) => RARITY_NAMES[r] + ' ' + pct(share)).join(', ');
  return bar;
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
const priceButton = (offer) => {
  const can = Shop.canBuy(offer.id);
  const button = make('button', 'shop-price' + (can.ok ? '' : ' short'),
    offer.was > offer.price ? make('s', '', cash(offer.was).replace(CURRENCY.sign + ' ', '')) : null,
    gem(), make('b', '', Math.floor(offer.price).toLocaleString('en-GB')));
  button.setAttribute('aria-label', 'Buy ' + offer.name + ' for ' + offer.price + ' ' + CURRENCY.name);
  button.addEventListener('click', () => buy(offer.id));
  return button;
};
const ribbon = (offer) => offer.ribbonName
  ? make('span', 'shop-ribbon rb-' + offer.ribbon, offer.ribbon === 'sale' && offer.off ? 'Sale −' + Math.round(offer.off * 100) + '%' : offer.ribbonName) : null;

const drawLater = [];
const featuredTile = (offer) => {
  const cars = offer.featured.slice(0, 3);
  const carViews = cars.map((car) => {
    const view = make('div', 'shop-car');
    drawLater.push([view, car]);
    const rarity = packsModule?.rarityOf?.(car) && offer.kind !== 'special' ? packsModule.rarityOf(car) : 'legendary';
    return make('div', 'shop-feature', view, make('div', 'shop-feature-name', make('span', 'shop-chip r-' + rarity, 'Featured'), make('b', '', car.name),
      make('small', '', stars(car) || 'Event car')));
  });
  const ends = offer.endsAt ? make('p', 'shop-ends', 'Ends in ', make('b', 'countdown', countdown(offer.endsAt - Events.now()))) : null;
  if (ends) ends.querySelector('.countdown').dataset.end = offer.endsAt;
  return make('article', 'shop-tile hero k-' + offer.kind,
    ribbon(offer),
    make('div', 'shop-hero-art', make('div', 'shop-hero-cars n' + carViews.length, ...carViews), packArt(offer.kind, offer.count)),
    make('div', 'shop-tile-info',
      offer.event ? make('small', 'shop-kicker', offer.event.name) : null,
      make('h3', '', offer.name), make('p', '', offer.blurb), oddsBar(offer.kind), ends),
    make('div', 'shop-tile-buy', priceButton(offer)));
};
const tile = (offer) => make('article', 'shop-tile k-' + offer.kind + ' r-' + (KIND_LOOK[offer.kind] || 'common'),
  ribbon(offer),
  make('div', 'shop-tile-art', packArt(offer.kind, offer.count)),
  make('div', 'shop-tile-info', make('h3', '', offer.name), make('p', '', offer.blurb), oddsBar(offer.kind)),
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

let isOpen = false, ticker = 0;
const draw = () => {
  const keep = screen.scrollTop;
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
    make('div', 'shop-body', note, ...sections, rarityGuide()));
  screen.scrollTop = keep;
  requestAnimationFrame(() => { for (const [el, car] of drawLater) stillCar(el, car); }); // (once laid out)
};

// ---- buying -----------------------------------------------------------------------------------------------------
const buy = async (id) => {
  const offer = Shop.offer(id), can = Shop.canBuy(id);
  if (!offer) return;
  if (!can.ok) {
    const lines = can.why === 'short' ? ['This costs ' + cash(offer.price) + '. You have ' + cash(Shop.balance()) + '.',
      CURRENCY.placeholder ? CURRENCY.name + ' is a placeholder for now: nothing in the game gives it yet.' : '']
      : can.why === 'packs' ? ['Card packs are not in this build yet.'] : can.why === 'over' ? ['This offer has ended.'] : ['This cannot be bought.'];
    await tell({ title: can.why === 'short' ? 'Not enough ' + CURRENCY.name : 'Not for sale', lines: lines.filter(Boolean) });
    draw();
    return;
  }
  const what = offer.count > 1 ? offer.name : 'one ' + offer.name;
  if (!await ask({ title: 'Buy ' + offer.name, lines: [cash(offer.price) + ' for ' + what + ', unopened.', 'You will have ' + cash(Shop.balance() - offer.price) + ' left.'], ok: 'Buy' })) return;
  const done = Shop.buy(id);
  draw();
  if (!done.ok) { await tell({ title: 'Not bought', lines: ['Nothing was taken.'] }); return; }
  bought(done.offer);
};
// the packs just bought: open them now, or shop on
const bought = (offer) => {
  const open = packsScreen ? make('button', 'shop-go', 'Open now') : null, later = make('button', 'shop-later', 'Keep shopping');
  const box = make('div', 'shop-bought', make('div', 'shop-bought-box',
    make('div', 'shop-burst'), packArt(offer.kind, offer.count),
    make('h2', '', offer.name + ': yours'),
    make('p', '', (offer.count > 1 ? 'They are' : 'It is') + ' with your packs, unopened.'),
    make('div', 'shop-bought-do', open, later)));
  const shut = () => box.remove();
  later.addEventListener('click', shut);
  open?.addEventListener('click', () => { shut(); ShopScreen.close(); packsScreen.open(); });
  box.addEventListener('pointerdown', (e) => { if (e.target === box) shut(); });
  screen.append(box);
  (open || later).focus();
};

export const ShopScreen = {
  get isOpen() { return isOpen; },
  open() {
    if (!isOpen) {
      isOpen = true;
      Game.inMenu = true; // (Enter must not start a run from here)
      Nav.enter('shop', () => this.close()); // (the back button closes it)
      ticker = setInterval(() => { // (the countdowns, each second; an offer just over, and the screen drawn again)
        for (const node of screen.querySelectorAll('.countdown')) {
          const left = Number(node.dataset.end) - Events.now();
          if (left <= 0) { draw(); return; }
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
    Game.inMenu = false;
    screen.classList.add('hidden');
    screen.querySelector('.shop-bought')?.remove();
  },
};

// the way in: a button at the top of the menu, after the bank
const button = make('button', 'menu-chip shop-btn', gem(), make('span', 'shop-word', 'Shop'));
button.id = 'shopBtn';
button.title = 'The Shop: card packs';
button.setAttribute('aria-label', 'Shop');
document.getElementById('bank')?.after(button);
button.addEventListener('click', () => ShopScreen.open());
window.addEventListener('keydown', (event) => { // (Escape: the "bought" box first, then the Shop. A dialog up takes its own)
  if (!isOpen || event.key !== 'Escape') return;
  const box = screen.querySelector('.shop-bought');
  if (box) box.remove(); else ShopScreen.close();
});
for (const type of ['progresschange', 'packschange']) window.addEventListener(type, () => { if (isOpen) draw(); });

// ?shopcash=<n>: the balance for this visit, nothing saved; ?shop: open at once (for a look or a picture)
if (params.get('shopcash') !== null) {
  Progress.noSave = true;
  Progress.data.shopCash = Math.max(0, Math.floor(Number(params.get('shopcash')) || 0));
}
if (params.get('shop') !== null && Game.state === 'start') ShopScreen.open();
