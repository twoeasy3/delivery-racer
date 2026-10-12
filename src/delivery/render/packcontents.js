// ---- "What's inside": every card a pack can give (the Shop's tiles: their info button, or a tap on the odds bar) ------
// A sheet over the Shop listing EVERY card of a kind of pack, read from packs.js contents() (the same pools a pack is
// drawn from, at the moment the sheet opens: a car added to the roster is listed with no edit here), grouped by rarity
// (Common to Bespoke), each card a compact BLUEPRINT CARD (render/blueprintcard.js: the car in its own pose, carposes.js
// posePick, the same every time; its rarity letter, name, what it is: a blueprint of a blueprint-only car, a car still
// locked, the KEY to a car) with its chance on a plain slot; a special pack's FEATURED cards at the top, with their
// chance to be in a pack. The header says how many cards there are, and the rarity odds. Phones 3 a row, wider more.
// Phones: the sheet is a fixed box with a header that stays and a BODY that scrolls (the menu's sheet pattern, menu2.css
// .sheet-body), never a fixed full-screen scroller. The cars' pictures are drawn lazily: only those scrolled into view
// (carstill.js stillsIn: an IntersectionObserver on the body), a few a frame, the live-rendered still only (the old
// carshots photos are not used: the owner, 12-Oct), cached by car, pose and size.
import { contents, rarityName } from '../packs.js';
import { Ecu } from '../ecu.js';
import { Nav } from '../nav.js';
import { stillsIn } from './carstill.js';
import { blueprintCard } from './blueprintcard.js';
import { posePick } from '../carposes.js';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
// a chance, as a percentage: two figures that mean something ("12%", "1.4%", "0.083%")
export const percent = (p) => {
  const v = p * 100;
  if (!(v > 0)) return '0%';
  if (v >= 10) return Math.round(v) + '%';
  if (v >= 1) return (Math.round(v * 10) / 10) + '%';
  return Number(v.toPrecision(2)) + '%';
};

let open = null; // { sheet, observer, close }

// what a card is, in words: its chips
const marks = (car, key) => {
  if (key) return [make('span', 'pc-mark key', 'Key')];
  const out = [];
  if (Ecu.isBlueprint(car)) out.push(make('span', 'pc-mark bp', 'Blueprint'));
  if (!Ecu.unlocked(car)) out.push(make('span', 'pc-mark locked', 'Locked'));
  return out;
};
const cardRow = (car, rarity, chance, { key = false, featured = false, note = '' } = {}) => {
  const pose = posePick(car.id);
  const { node, pic } = blueprintCard(car, { rarity, key, featured }, { compact: true, pose,
    chance: percent(chance), marks: [...marks(car, key), note ? make('small', 'pc-note', note) : null].filter(Boolean) });
  const row = make('li', 'pc-card r-' + rarity + (featured ? ' featured' : ''), node);
  row._car = car; row._pic = pic; row._pose = pose;
  return row;
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
      + (guarantees.length ? ' · at least ' + guarantees.join(', ') : '') + (c.featured.length ? ' · the last card is always a featured one' : '')),
    make('p', 'pc-odds', 'A card’s rarity: ', ...oddsLine));
  const sections = [];
  if (c.featured.length) {
    sections.push(make('section', 'pc-group featured',
      make('h3', '', make('span', 'shop-chip r-bespoke', 'Featured'), make('small', '', 'chance to be in a pack')),
      make('ul', 'pc-list', c.featured.map(f => cardRow(f.car, f.rarity, f.chance, { featured: true, note: rarityName(f.rarity) })))));
  }
  for (const g of c.groups) {
    sections.push(make('section', 'pc-group r-' + g.rarity,
      make('h3', '', make('span', 'shop-chip r-' + g.rarity, rarityName(g.rarity)),
        make('small', '', g.cards.length + (g.cards.length === 1 ? ' card · ' : ' cards · ') + percent(g.share) + ' of plain cards')),
      make('ul', 'pc-list', g.cards.map(card => cardRow(card.car, g.rarity, card.chance, { key: card.key })))));
  }
  const foot = make('p', 'pc-foot', 'A card’s chance is for one plain card of the pack: its rarity’s share split evenly over that rarity’s cards'
    + (guarantees.length ? '. The guaranteed cards are rolled again among the higher rarities, so they come up a little more often' : '')
    + (c.featured.length ? '. A featured card’s chance is for a whole pack' : '')
    + (c.groups.some(g => g.rarity === 'bespoke') ? '. Keys are only for cars you do not own yet' : '') + '.');
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
