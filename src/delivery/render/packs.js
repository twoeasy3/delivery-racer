// ---- the Packs screen: card packs held, and opened (packs.js) ---------------------------------------------
// A panel over the start screen, as the milestones wall is, reached by the Packs button at the top of the menu (it
// shows how many are held). Each pack held is a row with its count and OPEN. Opened, its cards are laid out face
// down; a tap turns one (or NEXT the next, SHOW ALL the lot), each in its rarity's colour, with the car's picture,
// its name and stars, and what it gave: "+1 blueprint" (with the count), NEW (the car's first), MAXED (a car already
// at its top ECU: kept as a count), or THE KEY (a Bespoke card: the car is yours to drive).
// ?pack=career|special|standard|ten opens one at once, for a look, and nothing of it is saved (Progress.noSave);
// &from=<event id> makes a special pack that event's (its featured cards). ?pack&give=career,ten,special:comet-hunt: the
// list with those packs held (nothing saved either).
import '../packs.css';
import { Packs, rarityName, rarityColour, kindName, KINDS } from '../packs.js';
import { Progress } from '../progress.js';
import { carById, stars, starColour } from '../cars.js';
import { Nav } from '../nav.js';
import { Game } from '../game.js';
import { makeShowCar, paintShowCar } from './garage.js';
import { sharedRenderer, drawStill } from './modelviews.js';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
// the cars' pictures (carshots/<id>-good.jpg), and where a car has none its model drawn once, as the event cards do
const CAR_SHOTS = Object.fromEntries(Object.entries(
  import.meta.glob('../carshots/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));
const POSE = { lift: 0.3, angle: -0.64, close: 1 };
const stills = new Map();
const picture = (el, car) => {
  const shot = CAR_SHOTS[car.id + '-good'];
  if (shot) { el.style.backgroundImage = `url("${shot}")`; el.classList.add('photo'); return; }
  if (stills.has(car.id)) { el.style.backgroundImage = `url("${stills.get(car.id)}")`; return; }
  try {
    const model = makeShowCar(car);
    paintShowCar(model, car, false);
    if (!drawStill(sharedRenderer(), el, model, POSE)) return;
    const canvas = el.querySelector('canvas');
    stills.set(car.id, canvas.toDataURL('image/png'));
    canvas.remove();
    el.style.backgroundImage = `url("${stills.get(car.id)}")`;
  } catch (error) { console.warn('No model for the card: ' + (error?.message || error)); }
};

const panel = make('div', 'overlay menu panel hidden');
panel.id = 'packs';
document.body.append(panel);
// the button at the top of the menu, before Options
const button = make('button', 'menu-chip packs-btn', make('i', '', '\u{1F0CF}'), make('span', '', 'Packs'), make('b', 'packs-count'));
button.id = 'packsBtn';
button.title = 'Card packs: blueprints for your cars';
const optionsBtn = document.getElementById('optionsBtn');
optionsBtn?.parentNode?.insertBefore(button, optionsBtn);
const badge = () => {
  const n = Packs.total();
  button.querySelector('.packs-count').textContent = n ? String(n) : '';
  button.classList.toggle('has', n > 0);
};

let opened = null; // the pack being revealed: { kind, from, cards }
const cardNode = (c, i) => {
  const car = carById(c.car);
  const view = make('div', 'pack-car');
  const what = c.key ? (c.isNew === false ? 'Key (already yours)' : 'The key: yours to drive!')
    : c.maxed ? 'Maxed: +1 blueprint (' + c.count + ')' : '+1 blueprint' + (c.count ? ' (' + c.count + ')' : '');
  const node = make('button', 'pack-card face-down r-' + c.rarity + (c.featured ? ' featured' : ''),
    make('span', 'pack-back', make('b', '', '?')),
    make('span', 'pack-face',
      make('span', 'pack-rarity', (c.featured ? '★ ' : '') + rarityName(c.rarity) + (c.upgraded && !c.featured ? ' ↑' : '')), // (★ a featured card; ↑ a slot that upgraded)
      c.featured ? make('span', 'pack-featured', 'Featured') : null,
      view,
      make('strong', 'pack-name', car?.name || c.car),
      car?.tier ? make('span', 'pack-stars', stars(car)) : null,
      make('span', 'pack-what', what)));
  if (c.isNew && !c.key) view.append(make('span', 'pack-new', 'NEW')); // (on the picture's corner)
  node.style.setProperty('--rarity', rarityColour(c.rarity));
  node.querySelector('.pack-stars')?.style.setProperty('color', car ? starColour(car) : '');
  node.setAttribute('aria-label', 'Card ' + (i + 1) + ', face down');
  node.addEventListener('click', () => turn(node, car));
  return node;
};
const turn = (node, car) => {
  if (!node.classList.contains('face-down')) return;
  node.classList.remove('face-down');
  node.setAttribute('aria-label', node.querySelector('.pack-face').textContent);
  if (car) requestAnimationFrame(() => picture(node.querySelector('.pack-car'), car)); // (the turn only fades: the card's box is its own size, to draw into)
  draw(false);
};
const turnNext = () => { const next = panel.querySelector('.pack-card.face-down'); if (next) next.click(); };
const turnAll = () => { for (const node of panel.querySelectorAll('.pack-card.face-down')) node.click(); };

// the panel drawn: the reveal (a pack being opened), or the packs held
const draw = (full = true) => {
  badge();
  const close = make('button', 'level', 'Close');
  close.addEventListener('click', () => PacksScreen.close());
  if (opened) {
    const left = panel.querySelectorAll('.pack-card.face-down').length;
    if (!full) { // (a card turned: only the buttons change)
      panel.querySelector('.pack-do')?.replaceWith(doRow(left));
      return;
    }
    const cards = make('div', 'pack-cards' + (opened.cards.length > 6 ? ' many' : ''), opened.cards.map(cardNode));
    panel.replaceChildren(make('div', 'bar', make('strong', '', kindName(opened.kind) + (opened.free ? ' (a look: nothing saved)' : '')),
      make('span', 'count', opened.cards.length + ' cards'), close),
    opened.cards.length ? cards : make('p', '', 'This pack came out empty: there are no cards for it.'), doRow(opened.cards.length));
    return;
  }
  const held = Packs.held();
  const rows = held.map(p => {
    const open = make('button', 'level', 'Open');
    open.addEventListener('click', () => openPack(p.kind, p.from));
    return make('div', 'pack-row r-' + p.kind, make('span', 'pack-icon', '\u{1F0CF}'), make('strong', '', p.name), make('span', 'count', '× ' + p.count), open);
  });
  panel.replaceChildren(make('div', 'bar', make('strong', '', 'Card packs'), make('span', 'count', held.length ? Packs.total() + ' to open' : ''), close),
    make('p', '', 'Every card is a blueprint for a car. Enough blueprints unlock a car or tune up its ECU. The rarest cards are keys.'),
    rows.length ? make('div', 'pack-list', rows) : make('p', 'pack-none', 'No packs yet. Deliver Career levels for the first time and finish special event stages to earn them.'));
};
const doRow = (left) => {
  const next = make('button', 'level', 'Next card'), all = make('button', 'level', 'Show all'), back = make('button', 'level', Packs.total() ? 'Back to packs' : 'Done');
  next.addEventListener('click', turnNext);
  all.addEventListener('click', turnAll);
  back.addEventListener('click', () => { opened = null; draw(); });
  return make('div', 'pack-do', left ? next : null, left ? all : null, left ? null : back);
};
const openPack = (kind, from, free = false) => {
  const result = Packs.open(kind, { from, free });
  if (!result) return;
  opened = { ...result, free };
  draw();
};

export const PacksScreen = {
  isOpen: false,
  open() {
    if (!this.isOpen) {
      this.isOpen = true;
      Game.inMenu = true; // (Enter must not start a run from here)
      Nav.enter('packs', () => this.close()); // (the back button closes it)
    }
    if (!opened) draw();
    panel.classList.remove('hidden');
    panel.scrollTop = 0;
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    opened = null;
    Nav.leave('packs');
    Game.inMenu = false;
    panel.classList.add('hidden');
    badge();
  },
};

button.addEventListener('click', () => PacksScreen.open());
window.addEventListener('keydown', (event) => {
  if (!PacksScreen.isOpen) return;
  if (event.key === 'Escape') PacksScreen.close();
  else if (opened && (event.key === ' ' || event.key === 'ArrowRight')) { event.preventDefault(); turnNext(); }
});
for (const type of ['packschange', 'progresschange']) window.addEventListener(type, badge);
badge();
// ?pack=<kind> (&from=<event id>): one opened at once, nothing saved
{
  const params = new URLSearchParams(location.search), kind = params.get('pack');
  if (kind !== null) {
    Progress.noSave = true;
    for (const k of (params.get('give') || '').split(',').filter(Boolean)) { const [kind, from] = k.split(':'); Packs.grant(kind, { from: from || null }); } // (&give=career,special:comet-hunt: packs held, for a look at the list)
    PacksScreen.open();
    if (KINDS.includes(kind)) openPack(kind, params.get('from') || null, true);
  }
}
