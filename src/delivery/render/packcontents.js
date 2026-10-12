// ---- "What's inside": every card a pack can give (the Shop's tiles: their info button, or a tap on the odds bar) ------
// A sheet over the Shop listing EVERY card of a kind of pack, read from packs.js contents() (the same pools a pack is
// drawn from, at the moment the sheet opens: a car added to the roster is listed with no edit here), grouped by rarity
// (Common to Bespoke), each card with its car's picture, name, stars, what it is (a blueprint of a blueprint-only car,
// a car still locked, the KEY to a car) and its chance on a plain slot; a special pack's FEATURED cards at the top,
// with their chance to be in a pack. The header says how many cards there are, and the rarity odds.
// Phones: the sheet is a fixed box with a header that stays and a BODY that scrolls (the menu's sheet pattern, menu2.css
// .sheet-body), never a fixed full-screen scroller. The cars' pictures are drawn lazily: only those scrolled into view
// (an IntersectionObserver on the body), a few a frame (carshots/<id>-good.jpg where there is one, else the model drawn
// once by carstill.js, cached).
import { contents, rarityName } from '../packs.js';
import { stars, starColour } from '../cars.js';
import { Ecu } from '../ecu.js';
import { Nav } from '../nav.js';
import { stillCar, stillReady } from './carstill.js';

const CAR_SHOTS = Object.fromEntries(Object.entries(
  import.meta.glob('../carshots/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));

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

// the pictures still to draw: a few a frame, only those in view
const PER_FRAME = 3;
let queue = [], pumping = 0;
const pump = () => {
  pumping = 0;
  for (let n = 0; n < PER_FRAME && queue.length;) {
    const [el, car] = queue.shift();
    if (!el.isConnected || el.dataset.drawn) continue;
    el.dataset.drawn = '1';
    const shot = CAR_SHOTS[car.id + '-good'];
    if (shot) { el.style.backgroundImage = `url("${shot}")`; el.classList.add('photo'); continue; }
    if (stillReady(el, car, false)) continue;
    stillCar(el, car, false);
    n++; // (only a model drawn counts against the frame: a photo or a cached still costs nothing)
  }
  if (queue.length) pumping = requestAnimationFrame(pump);
};
const want = (el, car) => { queue.push([el, car]); if (!pumping) pumping = requestAnimationFrame(pump); };

let open = null; // { sheet, observer, close }

// what a card is, in words: its chips
const marks = (car, key) => {
  if (key) return [make('span', 'pc-mark key', 'Key to the ' + car.name)];
  const out = [];
  if (Ecu.isBlueprint(car)) out.push(make('span', 'pc-mark bp', 'Blueprint'));
  if (!Ecu.unlocked(car)) out.push(make('span', 'pc-mark locked', 'Locked'));
  return out;
};
const cardRow = (car, rarity, chance, { key = false, featured = false, note = '' } = {}) => {
  const pic = make('div', 'pc-pic');
  pic.dataset.car = car.id;
  const st = make('span', 'pc-stars', stars(car) || (featured ? 'Event car' : ''));
  st.style.color = starColour(car);
  const row = make('li', 'pc-card r-' + rarity + (featured ? ' featured' : ''), pic,
    make('div', 'pc-what', make('b', 'pc-name', car.name), make('div', 'pc-sub', st, ...marks(car, key))),
    make('div', 'pc-chance', make('b', '', percent(chance)), note ? make('small', '', note) : null));
  row._car = car;
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
  // the pictures: only those scrolled into view (all at once where there is no IntersectionObserver)
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      observer.unobserve(e.target);
      want(e.target.querySelector('.pc-pic'), e.target._car);
    }
  }, { root: body, rootMargin: '120px 0px' }) : null;
  const shut = () => closeContents();
  close.addEventListener('click', shut);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) shut(); });
  host.append(sheet);
  for (const row of sheet.querySelectorAll('.pc-card')) (observer ? observer.observe(row) : want(row.querySelector('.pc-pic'), row._car));
  open = { sheet, observer, kind };
  Nav.enter('packcontents', () => closeContents(true)); // (the back button closes it, before the Shop)
  close.focus({ preventScroll: true });
  return sheet;
};
// fromBack: closed by the back button (its history entry already gone)
export const closeContents = (fromBack = false) => {
  if (!open) return false;
  open.observer?.disconnect();
  open.sheet.remove();
  queue = queue.filter(([el]) => el.isConnected);
  open = null;
  if (!fromBack) Nav.leave('packcontents');
  return true;
};
export const contentsOpen = () => !!open;
