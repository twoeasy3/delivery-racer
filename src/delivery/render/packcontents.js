// ---- "What's inside": every card a pack can give (the Shop's tiles: their info button, or a tap on the odds bar) ------
// A sheet over the Shop listing EVERY card of a kind of pack, read from packs.js contents() (the same pools a pack is
// drawn from, at the moment the sheet opens: a car added to the roster is listed with no edit here), grouped by rarity
// (Common to Bespoke), each card a compact BLUEPRINT CARD (render/blueprintcard.js: the car in its own pose, carposes.js
// posePick, the same every time; its rarity letter, name, what it is: a blueprint of a blueprint-only car, a car still
// locked, the KEY to a car) with its chance on a plain slot; a special pack's FEATURED entries at the top (the owner,
// 12-Oct: "declare featured weights and display them on the What's Inside"): the declared ratio over them ("Featured
// weights: Silver Comet x3 9 : Silver Comet x15 1"), each entry its own card with its amount (x3), its WEIGHT, its share
// of the last slot and its chance a pack (packs.js contents: worked out exactly). An entry the player has EXHAUSTED (a
// car at its max ECU, a key owned) and a key owned in a regular pack wear the EXHAUSTED OVERLAY (exhaustedOverlay: one
// look for both, after the showroom's locked-card overlay: a tint, a thin-ringed badge, a short caption): "Car Maxed"
// (a gold MAX badge) or "Key obtained" (a green tick), its chance 0%, out of the pool; the others' figures are the
// shifted ones, and a line says whose weight is out. The header says how many cards there are, and the rarity odds. Phones 3 a row, wider more.
// Phones: the sheet is a fixed box with a header that stays and a BODY that scrolls (the menu's sheet pattern, menu2.css
// .sheet-body), never a fixed full-screen scroller. The cars' pictures are drawn lazily: only those scrolled into view
// (carstill.js stillsIn: an IntersectionObserver on the body), a few a frame, the live-rendered still only (the old
// carshots photos are not used: the owner, 12-Oct), cached by car, pose and size.
import { contents, rarityName, entryName, percent } from '../packs.js';
import { Ecu } from '../ecu.js';
import { Nav } from '../nav.js';
import { stillsIn } from './carstill.js';
import { blueprintCard } from './blueprintcard.js';
import { posePick } from '../carposes.js';
import { bannerCars, bannerArt } from './packbanner.js';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
// a chance, as a percentage: packs.js percent, the one format of the sheet (at most two decimals, "<0.01%", "0%")
export { percent };

let open = null; // { sheet, observer, close }

// what a card is, in words: its chips
const marks = (car, key) => {
  if (key) return [make('span', 'pc-mark key', 'Key')];
  const out = [];
  if (Ecu.isBlueprint(car)) out.push(make('span', 'pc-mark bp', 'Blueprint'));
  if (!Ecu.unlocked(car)) out.push(make('span', 'pc-mark locked', 'Locked'));
  return out;
};
// THE EXHAUSTED OVERLAY (one component: a featured entry exhausted, a regular pack's key owned): 'maxed' -> "Car Maxed",
// a gold MAX badge; 'owned' -> "Key obtained", a green tick. line: the small words under it
const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.2 16.6 4.9 12.3 3.1 14.1l6.1 6.1L21 8.4l-1.8-1.8z"/></svg>';
export const exhaustedOverlay = (kind, line = 'Out of the pool') => {
  const badge = make('span', 'pc-ov-badge');
  if (kind === 'owned') badge.innerHTML = TICK; else badge.textContent = 'MAX';
  const node = make('span', 'pc-ov ' + kind, badge,
    make('span', 'pc-ov-words', make('b', '', kind === 'owned' ? 'Key obtained' : 'Car Maxed'), line ? make('small', '', line) : null));
  node.dataset.exhausted = kind;
  return node;
};
const chip = (className, text) => make('span', 'pc-mark ' + className, text);
// a card's STACKS (packs.js contents: its base stack and its doubled one, each with its TOTAL chance, adding up to the
// card's): a small chip that cross-fades between them, x1 · 0.35% then x2 · 0.06% (CSS only, on the chip; reduced
// motion: both side by side). One stack: just its chance
const stackWords = (s) => 'x' + (Array.isArray(s.n) ? s.n.join('-') : s.n) + ' · ' + percent(s.chance);
const stackChip = (stacks) => (stacks?.length > 1
  ? make('span', 'pc-stacks', ...stacks.map((s, i) => make('span', 'pc-stack' + (s.doubled ? ' doubled' : '') + (i ? ' alt' : ''), percent(s.chance)))) : null); // (just the chance: the stack's size is in the bubble)
const cardRow = (car, rarity, chance, { key = false, featured = false, note = '', chips = [], exhausted = null, inPool = !exhausted, n = 0, stacks = null } = {}) => {
  const pose = posePick(car.id);
  const fading = inPool ? stackChip(stacks) : null;
  const bubbleN = fading && !key ? 1 : n; // (a card with stacks: the bubble is drawn below with the base amount, then its number fades)
  const { node, pic } = blueprintCard(car, { rarity, key, featured, n: bubbleN }, { compact: true, pose,
    chance: fading || (inPool ? percent(chance) : '0%'), marks: [...chips, ...marks(car, key), note ? make('small', 'pc-note', note) : null].filter(Boolean) });
  if (fading && !key && stacks?.length > 1) { // the bubble shows the stack's size, fading between the base and the doubled one in step with the chances
    const bubble = node.querySelector('.bp-amount');
    bubble?.classList.add('cycle');
    bubble?.replaceChildren(...stacks.map((st, i) => make('b', 'amt-phase' + (i ? ' alt' : ''), '×' + (Array.isArray(st.n) ? st.n.join('-') : st.n))));
  }
  if (exhausted) node.querySelector('.bp-art')?.append(exhaustedOverlay(exhausted, 'Out of the pool'));
  const row = make('li', 'pc-card r-' + rarity + (featured ? ' featured' : '') + (exhausted ? ' exhausted' : ''), node);
  if (fading) row.title = car.name + ': ' + percent(chance) + ' a card (' + stacks.map(stackWords).join(', ') + ')';
  row._car = car; row._pic = pic; row._pose = pose;
  return row;
};
// a weight, as written: 9, 1.5
const wt = (w) => String(Math.round(w * 1000) / 1000);
// a featured entry's card: its amount (x3: the badge, and a chip), weight, share of the last slot, chance a pack
const featuredRow = (f, base = 1) => {
  const has = f.key ? null : f.amount ?? base; // (an entry with no amount of its own: the pack's base, never doubled)
  const amount = has !== null ? 'x' + (Array.isArray(has) ? has.join('-') : has) : '';
  const chips = [chip('wt', 'Weight ' + wt(f.weight))]; // (no x3 / x15 chip beside the chance: the badge on the card shows the amount; the chip read as part of the chance, the owner, 12-Oct)
  const out = !f.inPlay;
  const note = out ? 'out of the pool' : 'last slot ' + percent(f.lastSlot); // (the big figure is its chance a pack)
  return cardRow(f.car, f.rarity, f.chance, { key: f.key, featured: true, chips, note, exhausted: f.exhausted, inPool: !out,
    n: amount ? (Array.isArray(has) ? has[1] : has) : 0 });
};

// open the sheet for a kind of pack over `host` (the Shop's screen). title: what the tile calls it; featured: the
// special pack's featured cars (car objects)
export const openContents = (host, { kind, title, featured = [] }) => {
  closeContents();
  const c = contents(kind, { featured });
  if (!c) return null;
  const close = make('button', 'pc-close', 'Close');
  close.setAttribute('aria-label', 'Close');
  const oddsLine = c.odds.map(o => make('span', 'pc-odd r-' + o.rarity, rarityName(o.rarity) + ' ' + percent(o.share)));
  const guarantees = Object.entries(c.atLeast).map(([r, n]) => n + ' ' + rarityName(r) + ' or better');
  const head = make('header', 'pc-head',
    make('div', 'pc-title', make('small', '', 'What’s inside'), make('h2', '', title || c.name)),
    close,
    make('p', 'pc-count', make('b', '', String(c.total)), ' different cards · ' + c.size + ' a pack'
      + (c.featured.length ? ' · Guaranteed featured card' : '') + (guarantees.length ? ' · at least ' + guarantees.join(', ') : '')
      + ' · ' + (c.limited ? 'Limited: ' : '') + 'x' + c.baseAmount + ' a card' + (c.doubleChance > 0 ? ', doubled to x' + c.baseAmount * 2 + ' ' + percent(c.doubleChance) + ' of the time' : '')),
    make('p', 'pc-odds', 'A card’s rarity: ', ...oddsLine));
  const sections = [];
  if (c.featured.length) {
    const ratio = c.featured.map((f, i) => entryName(f) + ' ' + wt(c.weights[i])).join(' : ');
    const out = c.shifted.map(f => entryName(f) + ' (' + (f.exhausted === 'owned' ? 'Key obtained' : 'Car Maxed') + ')');
    // two or three featured cars: the pack's BANNER over them (render/packbanner.js; no WebGL: none, the cards say it all)
    const trio = bannerCars(c.featured);
    const banner = trio ? bannerArt(trio, { className: 'pc-banner', onFail: () => banner.remove() }) : null;
    sections.push(make('section', 'pc-group featured', banner,
      make('h3', '', make('span', 'shop-chip r-bespoke', 'Featured'), make('small', '', 'the last card is one, picked by weight · the big figure: its chance a pack')),
      make('p', 'pc-weights', make('b', '', 'Featured weights: '), ratio),
      out.length ? make('p', 'pc-shift', make('b', '', 'Weights shifted: '), out.join(', ') + ' out of the pool') : null,
      c.reverted ? null : (out.length && out.length === c.featured.length ? make('p', 'pc-shift', make('b', '', 'Every featured card is had: '), 'the featured slot is an ordinary card, and this pack cannot be bought') : null),
      make('ul', 'pc-list', c.featured.map(f => featuredRow(f, c.baseAmount)))));
  }
  for (const g of c.groups) {
    sections.push(make('section', 'pc-group r-' + g.rarity,
      make('h3', '', make('span', 'shop-chip r-' + g.rarity, rarityName(g.rarity)),
        make('small', '', g.cards.length + (g.cards.length === 1 ? ' card · ' : ' cards · ') + percent(g.share) + ' of plain cards'
          + (g.cards.some(x => x.exhausted) ? ' · ' + g.cards.filter(x => x.exhausted).length + ' obtained, out of the pool' : ''))),
      make('ul', 'pc-list', g.cards.map(card => cardRow(card.car, g.rarity, card.chance, { key: card.key, exhausted: card.exhausted, note: card.exhausted ? 'not in the pool' : '', stacks: card.stacks })))));
  }
  const foot = make('p', 'pc-foot', 'A card’s chance is for one plain card of the pack: its rarity’s share split evenly over that rarity’s cards'
    + (c.doubleChance > 0 ? '. Each card that drops may double its stack: its two figures (x' + c.baseAmount + ', then x' + c.baseAmount * 2 + ') are each stack’s own total chance, and add up to the card’s. Featured cards and keys are never doubled' : '')
    + (guarantees.length ? '. The guaranteed cards are rolled again among the higher rarities, so they come up a little more often' : '')
    + (c.featured.length ? '. A featured card’s chance is for a whole pack, worked out exactly: the last card is a featured one, picked by weight (its weight over the weights in play), and each other card may upgrade and turn featured, again by weight. A featured car you have maxed, or a key you own, is out of the featured pool and the others’ shares go up' : '')
    + (c.groups.some(g => g.rarity === 'bespoke') ? '. Keys are only for cars you do not own yet: one you own is shown, out of the pool' : '') + '.');
  const body = make('div', 'pc-body', ...sections, foot);
  const box = make('div', 'pc-box', head, body);
  const sheet = make('div', 'pack-contents', box);
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'What’s inside: ' + (title || c.name));
  sheet.dataset.kind = kind;
  // the pictures: only those scrolled into view, a few a frame (carstill.js)
  const observer = stillsIn(body, '120px 0px');
  const shut = () => closeContents();
  close.addEventListener('click', shut);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) shut(); });
  host.append(sheet);
  for (const row of sheet.querySelectorAll('.pc-card')) observer.watch(row._pic, row._car, { side: 'good', pose: row._pose }); // (always the Good livery)
  open = { sheet, observer, kind };
  Nav.enter('packcontents', () => closeContents(true)); // (the back button closes it, before the Shop)
  close.focus({ preventScroll: true });
  return sheet;
};
// fromBack: closed by the back button (its history entry already gone)
export const closeContents = (fromBack = false) => {
  if (!open) return false;
  open.sheet.remove();
  open.observer.stop();
  open = null;
  if (!fromBack) Nav.leave('packcontents');
  return true;
};
export const contentsOpen = () => !!open;
