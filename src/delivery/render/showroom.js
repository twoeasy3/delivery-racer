// ---- the SHOWROOM: where a car is picked (the owner, 12-Oct: "the new UI-based menu where cars are selected") ----------
// A screen over the menu, opened by the car card (and G, and ?showroom). A card for every car (showroomData.js says what
// is on it): its picture (its real model, drawn once as a still, the garage's own pose: render/carstill.js STILL_POSE; the four poses are the blueprint cards' only),
// its name and stars, its rarity as the colour of its frame, a pip for each ECU it can reach (filled up to the one it is
// at), its blueprints toward the next ECU as a bar, and, greyed, why one that cannot be driven cannot.
// FILTERS (the owner, 12-Oct): All / Ready / Locked in the header, and a Filters sheet of chips: tier (gold and blue
// stars, amphibious, event / special), rarity, kind (key, blueprint, earned / special, event cars), state (ready,
// locked, upgradable, maxed, in use, not on this level), several at once (OR within a group, AND across groups), a sort
// (tier, rarity, ECU, name, top speed), how many cars it leaves, and Clear all. Remembered for the next visit (local
// storage; nothing in the save). The logic is showroomData.js's (filterCards), checked by scripts/.showroom-check.mjs.
// A card clicked opens the FULL VIEW (the owner's Asphalt 9 reference): the whole screen is that car, LIVE in 3D and
// large (render/showroomview.js: a drag turns it; it lands with a little drop and bounce, render/carbounce.js), its
// panel at the left (its card, name, stars, rarity, ECU pips and blueprints, its figures at its ECU now with the maxed
// ones as a ghost bar, respawn, perk, why it is locked), Good / Evil, and DRIVE (or Buy at Crazey Jim's, or the lock).
// Round arrows at the car's sides (and the arrow keys, and a swipe on a phone outside the car) go to the previous / next
// car OF THE LIST AS FILTERED (round from the last to the first: goTo). Back (the chevron, Escape, the browser's back)
// returns to the cards where they were. GOOD / EVIL: one choice, switched in the header or the full view (a click on
// either half flips it): the cards' and the live car's livery, the side whose car rule marks the cards, and the side
// Drive drives as (it starts on the side being played). A big button takes the player to the car lot, Crazey Jim's Used
// Cars (render/garage.js), where cars are bought; closing the lot comes back here.
// The layout (showroom.css): on a desktop the cards are TWO ROWS scrolled sideways (a drag, the wheel, the arrows at its
// ends, the arrow keys); a phone on its side, one row. A PHONE HELD UPRIGHT (isPhone(); showroom-phone.css and
// render/showroomphone.js): the cards in TWO COLUMNS scrolled down, and the full view is its single-car screen: the car
// large on top, its panel under it, nothing of it scrolling but the words on a small phone; a swipe UP or DOWN outside
// the car (or the up / down chevrons above and below it, the arrows turned) switches to the next / previous car (goTo,
// sliding the way the list went), and back leaves the list scrolled where it was.
// Keys: left / right (up / down in the column, and between the two rows) the next card, Enter the full view (in it:
// drive), E the other side, F the filters, Escape back.
// For a picture: ?showroom opens it; &side=evil plays Evil (render/menustage.js), and so it opens on Evil; &look=<car id>
// picks that card; &full (or &sheet) opens its full view; &filter=tier:g3,b1;state:ready;sort:speed filters for the visit
// (not remembered); &filters opens the filter sheet; &bp=sport:7,hotrod:3 gives those blueprints for the visit.
import '../showroom.css';
import '../showroom-phone.css';
import { showroomCars, carCard, floorBest, statShown, RARITIES, CAR_LOT, sideName, sideClick, driveWords, barredWhy, driveAs,
  FILTER_GROUPS, SORTS, imposedFilter, noFilter, cleanFilter, parseFilter, filterCount, filterCards, stepIn, overlayOf, cardTip, kindOf, lentWords } from '../showroomData.js';
import { CAR, carInUse, setViewSide, STAR_COLOURS, carRule, carFocus } from '../cars.js';
import { Progress } from '../progress.js';
import { ShopScreen } from './shop.js'; // (the Shop, reached from the header)
import { Game } from '../game.js';
import { Nav } from '../nav.js';
import { richTiers, tierStarsNode } from '../tiers.js';
import { Garage } from './garage.js';
import { stillCar, stillReady } from './carstill.js';
import { ShowroomView } from './showroomview.js';
import { Cosmetics } from './cosmeticsui.js'; // (the Cosmetics screen: the car live, wheels equipped; opened from the full view)
import { swipeSwitch, PHONE_COLUMNS } from './showroomphone.js';
import { panAt, panTo, panStep, PAN_MS } from './showroompan.js';
import { Sound } from './audio.js';
import { makerLine } from './blueprintcard.js';
import { KeySpin } from './keyspin.js'; // (the "Where to get it" key card's key, turning: render/keyspin.js)
import { sheetUp } from '../lite.js';
import { renderSources } from './carsources.js'; // ("Where to get it": the car's key and blueprint sources)
import { fitLine } from './fitline.js';
import { bankFigure } from './bank.js'; // (the bank: whole dollars, its type scaled to its length)
import { overlayNode } from './lockoverlay.js'; // (a locked card's overlay: its kind's tint, badge and caption)
import { upgradeBlock } from './ecuupgrade.js'; // (the full view's ECU Upgrade button: the bank pays for an ECU its blueprints unlocked)

const panel = document.getElementById('showroom');
const startScreen = document.getElementById('startScreen');
const make = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
};
const blip = (name) => Sound.play(name, 0.5);
// a phone held upright (or a narrow window): the cards a column. The phone's own code is behind this
export const isPhone = () => !!window.matchMedia?.('(max-width: 760px) and (min-height: 521px), (max-width: 519px)').matches;

// ---- the ECU pips and the blueprint bar (a card's, and the full view's, larger) ----
const pips = (card) => {
  const row = make('span', 'sr-pips');
  row.setAttribute('aria-label', 'ECU ' + card.bought + ' of ' + card.max + (card.ecu > card.bought ? ' (' + card.ecu + ' unlocked, not yet bought)' : ''));
  for (let i = 1; i <= card.max; i++) row.append(make('i', i <= card.bought ? 'on' : i <= card.ecu ? 'ready' : '')); // (ready: unlocked by its blueprints, to be bought)
  return row;
};
const blueprintBar = (card, long = false) => {
  if (!card.upgradable) return make('span', 'sr-bp none', long ? (card.car.earned ? 'A special car: no blueprints, it stays at ECU1' : 'Comes maxed: no blueprints') : 'No blueprints');
  const fill = make('i');
  fill.style.width = Math.round(card.have / card.toNext * 100) + '%';
  const words = card.maxed ? (long ? (card.bought >= card.max ? 'Maxed out' : 'All blueprints collected') + (card.blueprints ? ' (' + card.blueprints + ' blueprint' + (card.blueprints === 1 ? '' : 's') + ')' : '') : 'MAX')
    : card.have + '/' + card.toNext + (long ? ' blueprints to ' + (card.ecu === 0 ? 'unlock it' : 'ECU' + (card.ecu + 1)) : '');
  return make('span', 'sr-bp' + (card.maxed ? ' maxed' : ''), make('b', 'sr-bp-icon', '▤'), make('span', 'sr-bp-track', fill), make('small', '', words));
};
const starsNode = (card) => {
  const span = make('span', 'sr-stars', card.stars || '');
  span.style.color = card.starColour;
  return span;
};

// ---- the stills: drawn a few at a time, those in sight first, while the showroom is up ----
const queue = new Set();
// the side on show (Good or Evil): one choice for the header's switch and the full view's, the cards' liveries and car
// rules, the live car's paint, and the side DRIVE drives as. It starts on the side being played (Showroom.open)
let side = false;
const evilNow = () => side;
const want = (el, car) => { if (!stillReady(el, car, evilNow())) queue.add(el); el.dataset.car = car.id; };
const carOf = new WeakMap();
let watcher = null;
const watch = (el, car) => {
  carOf.set(el, car);
  if (watcher) watcher.observe(el); else want(el, car);
};
const pump = () => {
  requestAnimationFrame(pump);
  if (!Showroom.isOpen || Garage.isOpen || !queue.size) return;
  if (full && isPhone()) return; // (the phone's single-car screen covers the cards: its live car has the frames)
  const t0 = performance.now();
  for (const el of queue) {
    queue.delete(el);
    if (!el.isConnected) continue;
    const car = carOf.get(el);
    if (car && !stillCar(el, car, evilNow()) && !el.getBoundingClientRect().width) { queue.add(el); break; } // (not laid out yet: next frame)
    if (performance.now() - t0 > 24) break; // (a few each frame: the screen keeps moving while they come)
  }
};
requestAnimationFrame(pump);

// ---- the filter: remembered for the next visit (local storage, as a convenience: never in the save) ----
const STORE = 'delivery_showroom_filter';
const loadFilter = () => { try { return cleanFilter(JSON.parse(localStorage.getItem(STORE))); } catch { return noFilter(); } };
const saveFilter = () => { if (visitOnly || imposed) return; try { localStorage.setItem(STORE, JSON.stringify(filter)); } catch { /* (no storage: for this visit) */ } };
let filter = loadFilter();
let visitOnly = false; // (a filter given by the address: not remembered)
// a filter the level picked IMPOSES (its own car rule, an event's: showroomData.js imposedFilter), for this visit only:
// { before (the filter it stood in for, put back on leaving), label (the rule's words) }; never remembered (saveFilter)
let imposed = null;

// ---- building it ----
let cards = [];      // [{ data, node }]: the cards shown, in the filter's order
let list = [];       // their data (the full view's arrows go along it)
let picked = null;   // the car id picked
let full = false;    // the full view up
let statsOff = false; // (phone: the stats panel hidden to look at the car; kept from car to car)
let best = null;     // the best figures on the floor (the stat bars)
let row, rowBox, detail, countEl, bankEl, back, on, seg, sortSel, filterBtn, sheet, sheetShade;

const QUICK = [['all', 'All', []], ['ready', 'Ready', ['ready']], ['locked', 'Locked', ['locked']]];
const build = () => {
  best ||= floorBest();
  const top = make('header', 'sr-top');
  const backBtn = make('button', 'sr-back', make('span', '', '‹'), make('span', 'sr-back-w', 'Menu'));
  backBtn.title = 'Back to the menu (Escape)';
  backBtn.addEventListener('click', () => Showroom.close());
  bankEl = make('div', 'sr-bank');
  countEl = make('div', 'sr-count');
  // (a phone: the count and the imposed filter are one line cut short; a tap shows it whole, another cuts it short again)
  countEl.addEventListener('click', () => { const open = countEl.classList.toggle('open'); countEl.setAttribute('aria-expanded', String(open)); });
  seg = make('div', 'sr-filter');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Show');
  for (const [id, label, state] of QUICK) {
    const b = make('button', '', label);
    b.dataset.filter = id;
    b.addEventListener('click', () => { filter.state = [...state]; applyFilter(); });
    seg.append(b);
  }
  filterBtn = make('button', 'sr-fbtn', make('span', 'sr-fbtn-icon', '☰'), make('span', 'sr-fbtn-w', 'Filters'), make('b', 'sr-fbadge'));
  filterBtn.title = 'Filter and sort the cars (F)';
  filterBtn.setAttribute('aria-haspopup', 'dialog');
  filterBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFilters(); });
  sortSel = make('select', 'sr-sort');
  sortSel.setAttribute('aria-label', 'Sort by');
  for (const [id, label] of SORTS) { const o = make('option', '', 'Sort: ' + label); o.value = id; sortSel.append(o); }
  sortSel.addEventListener('change', () => { filter.sort = sortSel.value; applyFilter(); });
  const lot = lotButton('sr-lot');
  top.append(backBtn, make('div', 'sr-title', make('h1', '', 'Showroom'), make('p', '', 'Pick your car')), countEl, bankEl, sideSwitch('sr-side-top'),
    make('div', 'sr-tools', seg, filterBtn, sortSel), shopButton('sr-shop'), lot);

  row = make('div', 'sr-row');
  row.style.setProperty('--sr-cols', String(PHONE_COLUMNS)); // (the phone's columns: showroom-phone.css)
  back = make('button', 'sr-arrow back', '‹');
  on = make('button', 'sr-arrow on', '›');
  back.setAttribute('aria-label', 'Scroll back');
  on.setAttribute('aria-label', 'Scroll on');
  back.addEventListener('click', () => by(-1));
  on.addEventListener('click', () => by(1));
  row.addEventListener('scroll', arrows, { passive: true });
  // (a phone held upright: the header's third line, the count and Crazey Jim's, folds away once the list is scrolled and
  // comes back at its top; two thresholds, so it never flickers: showroom-phone.css .sr-top.compact)
  row.addEventListener('scroll', () => {
    const y = row.scrollTop, folded = top.classList.contains('compact');
    if (!folded && y > 48 && isPhone()) { top.classList.add('compact'); countEl.classList.remove('open'); }
    else if (folded && (y < 8 || !isPhone())) top.classList.remove('compact');
  }, { passive: true });
  // (a vertical wheel scrolls the rows sideways; in the column, the column scrolls as ever)
  // (smooth: each notch adds to a target the row eases towards, with the snap off while it moves: with the snap on, small
  // steps were pulled back to the card's edge and the wheel felt stuck; a line-mode wheel counts as lines; a trackpad's sideways
  // swipe is left to the browser)
  let wheelTo = null, wheelRaf = 0, wheelIdle = 0;
  let wheelAt = 0;
  const easeWheel = (now) => {
    if (pan) { wheelRaf = 0; wheelAt = 0; return; } // (an arrow pressed: its pan takes over)
    const max = row.scrollWidth - row.clientWidth, goal = Math.max(0, Math.min(max, wheelTo)), gap = goal - row.scrollLeft;
    const dt = Math.min(200, now - (wheelAt || now - 16)); // (by the clock, not the frame: the same on a slow screen)
    wheelAt = now;
    if (Math.abs(gap) < 0.5) { row.scrollLeft = goal; wheelRaf = 0; wheelAt = 0; return; }
    row.scrollLeft += gap * (1 - Math.exp(-dt / 70));
    wheelRaf = requestAnimationFrame(easeWheel);
  };
  row.addEventListener('wheel', (e) => {
    if (!(Math.abs(e.deltaY) > Math.abs(e.deltaX) && row.scrollWidth > row.clientWidth + 2)) return;
    e.preventDefault();
    stopPan(); // (the wheel takes over from an arrows' pan)
    const dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * row.clientWidth : e.deltaY;
    wheelTo = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, (wheelRaf && wheelTo !== null ? wheelTo : row.scrollLeft) + dy * 1.6));
    row.classList.add('wheeling'); // (the snap off first: it pulled a small step straight back)
    row.scrollLeft += dy * 1.6 * 0.3; // (a share at once, so it answers on the instant; the rest eases in)
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(() => row.classList.remove('wheeling'), 220);
    if (!wheelRaf) wheelRaf = requestAnimationFrame(easeWheel);
  }, { passive: false });
  // (a mouse drags it too; a drag is not a click on the card it began on)
  let drag = null;
  row.addEventListener('pointerdown', () => { if (!isPhone()) countEl.classList.remove('open'); }); // (a phone on its side: the count's line, dropped over the cards, goes)
  row.addEventListener('pointerdown', () => stopPan()); // (a finger or the mouse on the row takes over from an arrows' pan)
  row.addEventListener('touchstart', () => stopPan(), { passive: true });
  row.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button === 0 && row.scrollWidth > row.clientWidth + 2) drag = { x: e.clientX, left: row.scrollLeft, moved: 0 }; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x));
    if (drag.moved > 5) { row.scrollLeft = drag.left - (e.clientX - drag.x); row.classList.add('dragging'); }
  });
  window.addEventListener('pointerup', () => { if (drag) setTimeout(() => { drag = null; row?.classList.remove('dragging'); }, 0); });
  row.addEventListener('click', (e) => { if (drag?.moved > 5) { e.stopPropagation(); e.preventDefault(); } }, true);
  rowBox = make('div', 'sr-rowbox', row, back, on);

  detail = make('section', 'sr-detail');
  detail.setAttribute('role', 'dialog');
  swipeOn(detail);
  // the phone's single-car screen: a vertical swipe outside the live car switches car (render/showroomphone.js)
  swipeSwitch(detail, { skip: (target) => !isPhone() || !full || !!target.closest?.('.sr-dpic, .cs-keyspin'), go: (offset) => goTo(offset) });
  sheet = buildSheet();
  sheetShade = make('div', 'sr-shade');
  sheetShade.addEventListener('click', () => closeFilters());
  panel.replaceChildren(make('div', 'sr-backdrop'), top, make('div', 'sr-body', rowBox), sheetShade, sheet, detail);

  watcher?.disconnect();
  watcher = window.IntersectionObserver ? new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) { const car = carOf.get(entry.target); if (car) want(entry.target, car); }
  }, { root: null, rootMargin: '300px' }) : null;
};
// the Shop, reachable from here (the owner, 12-Oct): it opens over the showroom and its Back comes back to it
const shopButton = (className) => {
  const shop = make('button', className, make('span', 'sr-shop-gem'), make('span', 'sr-shop-word', 'Shop'));
  shop.title = 'The Shop: card packs';
  shop.addEventListener('click', (e) => { e.stopPropagation(); ShopScreen.open(); });
  return shop;
};
const lotButton = (className) => {
  const lot = make('button', className, make('span', 'sr-lot-sign', 'Crazey Jim’s'), make('small', '', 'Used Cars · buy cars'));
  lot.title = CAR_LOT + ': the car lot, where cars are bought';
  lot.addEventListener('click', () => toLot());
  return lot;
};

// a Good / Evil switch (the header has one, the full view another: both show, and set, the one side). A click on
// either half flips it when that half is already on (the owner, 12-Oct: every Good / Evil switch in the game)
const sideSwitch = (extra) => {
  const box = make('div', 'sr-side ' + extra);
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Good or Evil: the livery, and the side to drive as');
  for (const evil of [false, true]) {
    const b = make('button', (evil === side ? 'on' : ''), sideName(evil));
    b.dataset.side = evil ? 'evil' : 'good';
    b.setAttribute('aria-pressed', String(evil === side));
    b.title = 'Show the cars in their ' + sideName(evil) + ' livery, and drive as ' + sideName(evil) + ' (click again: the other side)';
    b.addEventListener('click', (e) => { e.stopPropagation(); pickSide(sideClick(side, evil)); });
    box.append(b);
  }
  return box;
};
const pickSide = (evil) => {
  evil = !!evil;
  if (evil === side) return;
  side = evil;
  blip('menuMove');
  setViewSide(side); // (the car rule, and the car in use, of that side while the showroom shows it: as the car lot does)
  panel.classList.toggle('evil', side);
  for (const b of panel.querySelectorAll('.sr-side button')) { const on = (b.dataset.side === 'evil') === side; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  ShowroomView.side(side); // (at once: the full view drawn again below keeps the same car)
  fill(false);
};

// the rows' arrows: only where there is more that way (a desktop's rows; the column has none)
const arrows = () => {
  if (!row) return;
  const sideways = row.scrollWidth > row.clientWidth + 2;
  back.hidden = !sideways || row.scrollLeft < 4;
  on.hidden = !sideways || row.scrollLeft + row.clientWidth > row.scrollWidth - 4;
};
// the arrows' pan of the row (and the arrow keys'): ours, not the browser's smooth scroll, so a tap during a pan carries it
// on from where it is (render/showroompan.js); the snap is off while it moves (the class the wheel uses) and the pan
// ends on a column's start, so the snap has nothing to pull when it comes back
let pan = null, panRaf = 0;
const stopPan = () => { if (panRaf) cancelAnimationFrame(panRaf); panRaf = 0; pan = null; row?.classList.remove('panning'); };
const panFrame = (now) => {
  const at = panAt(pan, now);
  row.scrollLeft = at.x;
  if (at.done) { stopPan(); return; }
  panRaf = requestAnimationFrame(panFrame);
};
const panRow = (to) => {
  const now = performance.now();
  pan = panTo(pan, row.scrollLeft, to, now, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : PAN_MS);
  row.classList.add('panning');
  if (!panRaf) panRaf = requestAnimationFrame(panFrame);
};
// the columns' scroll positions (a card's left edge at the row's: where the snap puts it)
const columnStarts = () => {
  const left = row.getBoundingClientRect().left - row.scrollLeft;
  return [...new Set([...row.children].map(c => Math.round(c.getBoundingClientRect().left - left)))].sort((a, b) => a - b);
};
const by = (dir) => {
  const max = row.scrollWidth - row.clientWidth;
  panRow(panStep(pan ? pan.to : row.scrollLeft, dir, Math.max(200, row.clientWidth * 0.8), columnStarts(), max));
};

// ---- the filter sheet: chips by group, the sort, the count, Clear all (a drop-down on a desktop, a sheet on a phone) ----
const buildSheet = () => {
  const box = make('div', 'sr-fsheet');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Filter and sort');
  box.addEventListener('click', (e) => e.stopPropagation());
  const head = make('div', 'sr-fhead', make('strong', '', 'Filter & sort'), make('span', 'sr-fresult'));
  const clear = make('button', 'sr-fclear', 'Clear all');
  clear.addEventListener('click', () => { const sort = filter.sort; filter = noFilter(); filter.sort = sort; applyFilter(); });
  const done = make('button', 'sr-fdone', 'Done');
  done.addEventListener('click', () => closeFilters());
  head.append(clear, done);
  const body = make('div', 'sr-fbody');
  const chip = (groupId, id, label, single = false) => {
    const b = make('button', 'sr-chip', label);
    b.dataset.group = groupId;
    b.dataset.chip = id;
    if (groupId === 'colour') b.style.setProperty('--chip', { gold: STAR_COLOURS.gold, blue: STAR_COLOURS.blue, magenta: STAR_COLOURS.earned, green: STAR_COLOURS.amphibious }[id]);
    if (groupId === 'stars') b.style.setProperty('--chip', STAR_COLOURS.gold);
    if (groupId === 'rarity') b.style.setProperty('--chip', RARITIES[id].colour);
    b.addEventListener('click', () => {
      if (single) filter.sort = id;
      else { const at = filter[groupId]; filter[groupId] = at.includes(id) ? at.filter(x => x !== id) : [...at, id]; }
      applyFilter();
    });
    return b;
  };
  for (const group of FILTER_GROUPS) {
    const chips = make('div', 'sr-chips');
    for (const [id, label] of group.chips) chips.append(chip(group.id, id, label));
    body.append(make('section', 'sr-fgroup', make('h3', '', group.name), chips));
  }
  const sorts = make('div', 'sr-chips');
  for (const [id, label] of SORTS) sorts.append(chip('sort', id, label, true));
  body.append(make('section', 'sr-fgroup', make('h3', '', 'Sort by'), sorts));
  box.append(head, body);
  return box;
};
const toggleFilters = () => sheet.classList.contains('open') ? closeFilters() : openFilters();
const openFilters = () => {
  if (!sheet || sheet.classList.contains('open')) return;
  sheet.classList.add('open');
  panel.classList.add('filters-up');
  filterBtn.setAttribute('aria-expanded', 'true');
  Nav.enter('showroomFilters', () => closeFilters());
};
const closeFilters = () => {
  if (!sheet?.classList.contains('open')) return;
  sheet.classList.remove('open');
  panel.classList.remove('filters-up');
  filterBtn.setAttribute('aria-expanded', 'false');
  Nav.leave('showroomFilters');
};
window.addEventListener('pointerdown', (e) => { if (sheet?.classList.contains('open') && !sheet.contains(e.target) && !filterBtn.contains(e.target) && !isPhone()) closeFilters(); });
// the controls show the filter as it is
const showFilter = (all) => {
  const n = filterCount(filter), quick = filter.state.length === 0 ? 'all' : filter.state.length === 1 && ['ready', 'locked'].includes(filter.state[0]) && n === 1 ? filter.state[0] : null;
  for (const b of seg.children) b.classList.toggle('on', b.dataset.filter === quick);
  filterBtn.classList.toggle('on', n > 0);
  filterBtn.querySelector('.sr-fbadge').textContent = n ? String(n) : '';
  sortSel.value = filter.sort;
  for (const b of sheet.querySelectorAll('.sr-chip')) {
    const id = b.dataset.chip, g = b.dataset.group, on = g === 'sort' ? filter.sort === id : filter[g].includes(id);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  sheet.querySelector('.sr-fresult').textContent = list.length + ' of ' + all + ' cars';
  sheet.querySelector('.sr-fclear').disabled = !n;
};
const applyFilter = () => {
  blip('menuMove');
  saveFilter();
  fill();
};

// the cards, for the filter chosen
const fill = (fresh = true) => {
  const evil = evilNow(), inUse = carInUse(), scrolled = { left: row.scrollLeft, top: row.scrollTop };
  const all = showroomCars().map(car => carCard(car, evil));
  list = filterCards(all, filter, inUse.id);
  const filtered = filterCount(filter) > 0;
  // (the words a phone leaves out of its one line, " shown" and "Today's event: ", in spans of their own: showroom-phone.css)
  countEl.replaceChildren(...(filtered ? [make('b', '', String(list.length)), ' of ' + all.length, make('span', 'sr-count-w', ' shown')]
    : [make('b', '', String(all.filter(c => c.unlocked).length)), ' / ' + all.length + ' cars']),
  ...(imposed && filtered ? [make('span', 'sr-imposed', make('span', 'sr-imposed-w', imposed.focus ? 'Today\u2019s event: ' : 'This level: '), ...richTiers(imposed.label))] : []));
  countEl.title = countEl.textContent; // (the whole line, where a phone cuts it short)
  const eventChip = sheet?.querySelector('[data-chip="event"]');
  if (eventChip) eventChip.style.display = imposed?.focus || filter.state.includes('event') ? '' : 'none'; // (only where a day points at cars) // (the level's car rule, imposed; replaceChildren would write a null as "null")
  bankEl.replaceChildren(make('small', '', 'Bank'), bankFigure(Progress.data.money));
  watcher?.disconnect();
  cards = list.map((data) => {
    // the picture (its still on .sr-img) and, for a card that cannot be driven, its overlay over it (render/lockoverlay.js)
    const img = make('span', 'sr-img' + (data.dark ? ' silhouette' : ''));
    const ov = overlayOf(data);
    const pic = make('span', 'sr-pic', img, overlayNode(ov));
    const badge = data.lent ? make('span', 'sr-badge lent', lentWords(data)) // (a rotating event's free try: lent, not owned)
      : data.car === inUse || data.id === inUse.id ? make('span', 'sr-badge inuse', 'In use')
      : data.state === 'barred' ? make('span', 'sr-badge barred', 'Not on this level' + (evil !== !!Game.evil ? ' as ' + sideName(evil) : '')) : null;
    const node = make('button', 'sr-card ' + data.rarity + ' ' + data.state + (ov ? ' ov-' + ov.kind : '') + (data.id === picked ? ' picked' : ''),
      make('span', 'sr-tag', RARITIES[data.rarity].name), starsNode(data), pic, badge,
      make('span', 'sr-info',
        make('strong', 'sr-name', data.name),
        make('span', 'sr-ecu', make('small', '', 'ECU'), pips(data), make('em', '', data.bought + '/' + data.max)),
        blueprintBar(data)));
    node.style.setProperty('--rar', RARITIES[data.rarity].colour);
    node.dataset.car = data.id;
    node.title = data.lent ? 'Today\u2019s free try: lent at your ECU ' + data.lent.ecu + ' of ' + data.lent.max + ' (its blueprints raise it; its key at ECU ' + data.lent.max + ')'
      : data.state === 'locked' ? cardTip(data) : data.state === 'barred' ? 'You can drive it, but not on the level picked as ' + sideName(evil) : data.name;
    node.addEventListener('click', () => { pick(data.id); openFull(); });
    watch(img, data.car);
    return { data, node };
  });
  let empty = null;
  if (!cards.length) {
    const clear = make('button', 'sr-fclear', 'Clear the filters');
    clear.addEventListener('click', () => { filter = noFilter(); applyFilter(); });
    empty = make('div', 'sr-empty', make('p', '', 'No car matches these filters.'), filtered ? clear : null);
  }
  row.replaceChildren(...(cards.length ? cards.map(c => c.node) : [empty]));
  if (!cards.some(c => c.data.id === picked)) picked = (cards.find(c => c.data.id === inUse.id) || cards[0])?.data.id ?? null;
  showFilter(all.length);
  showDetail();
  stopPan();
  if (!fresh) { row.scrollLeft = scrolled.left; row.scrollTop = scrolled.top; } // (the side switched: the cards stay where they were)
  else { row.scrollLeft = 0; row.scrollTop = 0; }
  requestAnimationFrame(arrows);
};

// a stat line: the figure now, its bar, and (a car not maxed) the maxed figure and the bar's reach then (a stat the ECU
// does not change, Weight: max = now, so no ghost and no "max"). tip: what it is, on the name
const stat = (name, now, max, show, share, tip) => {
  const bar = make('span', 'sr-stat-track'), fillNow = make('i', 'now'), fillMax = make('i', 'max');
  fillNow.style.width = Math.round(Math.max(0.04, Math.min(1, share(now))) * 100) + '%';
  fillMax.style.width = Math.round(Math.max(0.04, Math.min(1, share(max))) * 100) + '%';
  bar.append(fillMax, fillNow);
  const same = show(now) === show(max);
  const label = make('small', '', name);
  if (tip) label.title = tip;
  return make('div', 'sr-stat', label, bar, make('b', '', show(now)), make('span', 'sr-stat-max', same ? '' : 'max ' + show(max)));
};
// (a ratio stat: a whole number, 0-100, 50 = today's usual car: showroomData.js STAT_SCALE; its bar the same share)
const score = (v) => String(statShown(v)), scoreShare = (v) => statShown(v) / 100;
const kmh = (v) => Math.round(v * 3.6) + ' km/h';
// the FULL VIEW of the car picked (drawn only while it is up: the cards just mark the one picked)
const showDetail = () => {
  for (const c of cards) c.node.classList.toggle('picked', c.data.id === picked);
  if (!full) return;
  const card = list.find(c => c.id === picked);
  if (!card) { closeFull(); return; }
  const inUse = carInUse(), using = card.id === inUse.id, evil = evilNow();
  // (the live car: dark for a car of a tier not open yet; greyed for one locked that cannot be bought; in its colours
  // for one at the car lot, as one that can be driven)
  const pic = make('div', 'sr-dpic' + (card.dark ? ' silhouette' : '') + (card.state === 'locked' && card.forSale && !card.hidden ? ' forsale' : ''));
  pic.title = 'Drag to turn it';
  const s = card.stats, m = card.maxStats;
  const share = { speed: v => v / best.maxSpeed, accel: v => v / best.accel, health: v => v / best.health,
    respawn: v => best.respawnWorst > best.respawnBest ? 0.15 + 0.85 * (best.respawnWorst - v) / (best.respawnWorst - best.respawnBest) : 1 };
  const figures = card.hidden ? make('p', 'sr-why', 'A car of a tier not open yet: its figures show once it is.')
    : make('div', 'sr-stats',
      stat('Top speed', s.maxSpeed, m.maxSpeed, kmh, share.speed),
      stat('Acceleration', s.accel, m.accel, v => String(Math.round(v * 10) / 10), share.accel),
      stat('Health', s.health, m.health, v => String(Math.round(v)), share.health),
      stat('Agility', s.agility, m.agility, score, scoreShare, 'How quickly it steers'),
      stat('Delivery', s.delivery, m.delivery, score, scoreShare, 'Package efficacy: a gift\'s standing, a flaming package\'s damage'),
      stat('Composure', s.composure, m.composure, score, scoreShare, 'How long it can sit on the shoulder before the police step in'),
      stat('Crossing', s.crossing, m.crossing, score, scoreShare, 'How well it takes rails, fords, mud and the tide'),
      stat('Weight', s.weight, s.weight, score, scoreShare, 'How heavy it is in a shove (the same at every ECU)'),
      stat('Respawn', s.respawn, m.respawn, v => (Math.round(v * 10) / 10).toFixed(1) + ' s', share.respawn));
  // what can be done with it
  const go = make('button', 'sr-go');
  let why = null;
  // (the other side's words under its own, unseen: the button is as wide as the wider of the two, so switching sides
  // never changes its size; with fitLine below, never its height either. The owner, 14-Oct)
  const otherWords = make('span', 'sr-go-other', driveWords(card, !evil));
  otherWords.setAttribute('aria-hidden', 'true');
  go.replaceChildren(make('span', '', driveWords(card, evil)), otherWords);
  if (card.state === 'ready') {
    go.title = using && evil === !!Game.evil ? 'In use: back to the menu in it' : 'Drive the ' + card.name + ' as ' + sideName(evil) + (card.lent ? ', a free try' : '') + ' (Enter)';
    go.addEventListener('click', () => drive(card));
    // (a free try: lent for today's event at the player's own ECU; its key comes at the max ECU)
    if (card.lent) why = make('p', 'sr-why lent', make('b', '', lentWords(card)), make('span', '', 'Lent for today\u2019s event at your ECU ' + card.lent.ecu + ' of ' + card.lent.max
      + '. Its blueprints raise it; deliver it at ECU ' + card.lent.max + ' to win its key.'));
  } else if (card.state === 'barred') {
    go.disabled = true;
    why = make('p', 'sr-why barred', ...barredWhy(card, evil).flatMap(part => typeof part === 'string' ? [part] : part.tier ? [tierStarsNode(part.tier)] : richTiers(part.rich)));
  } else {
    go.disabled = !card.forSale;
    if (card.forSale) go.addEventListener('click', () => toLot(card.id));
    why = make('p', 'sr-why locked', make('b', '', card.reason), card.hint ? make('span', '', ...richTiers(card.hint)) : null);
  }
  // the top: back, where in the list, the bank, the car lot
  const backBtn = make('button', 'sr-fback', '‹');
  backBtn.setAttribute('aria-label', 'Back to the cards (Escape)');
  backBtn.title = 'Back to the cards (Escape)';
  backBtn.addEventListener('click', () => closeFull());
  const at = list.indexOf(card);
  const bank = make('div', 'sr-bank', make('small', '', 'Bank'), bankFigure(Progress.data.money));
  const ftop = make('div', 'sr-ftop', backBtn, make('div', 'sr-fpos', make('small', '', 'Showroom'), make('b', '', (at + 1) + ' / ' + list.length)), bank, shopButton('sr-shop sr-shop-full'), lotButton('sr-lot sr-lot-full'));
  // the car on its stage, the round arrows at its sides
  const arrow = (dir) => {
    const b = make('button', 'sr-farrow ' + (dir < 0 ? 'prev' : 'next'), dir < 0 ? '‹' : '›');
    const other = stepIn(list, card.id, dir);
    b.setAttribute('aria-label', (dir < 0 ? 'Previous' : 'Next') + ' car' + (other ? ': ' + other.name : ''));
    b.title = (dir < 0 ? 'Previous' : 'Next') + (other ? ': ' + other.name : '') + (dir < 0 ? ' (←)' : ' (→)');
    b.disabled = list.length < 2;
    b.addEventListener('click', (e) => { e.stopPropagation(); goTo(dir); });
    return b;
  };
  // (a car that cannot be driven: its card's overlay as a pill under the car, the same kind, colour and icon)
  const look = make('button', 'sr-look', statsOff ? 'Stats' : 'Hide stats');
  look.setAttribute('aria-pressed', String(statsOff));
  look.title = 'Hide or show the stats, to look at the car (phone)';
  look.addEventListener('click', (e) => {
    e.stopPropagation();
    statsOff = !statsOff;
    detail.classList.toggle('statsoff', statsOff);
    look.textContent = statsOff ? 'Stats' : 'Hide stats';
    look.setAttribute('aria-pressed', String(statsOff));
  });
  // (a KEY car's key, spinning in the stage's corner: render/showroomview.js; a blacked-out one's too, as a black
  // silhouette (the owner, 13-Oct), its element naming no car: card.name is 'Locked car'; a car with no key, and a car of
  // a tier not open yet (card.hidden), none)
  const keyEl = kindOf(card) === 'key' && !card.hidden ? make('div', 'sr-fkey' + (card.dark ? ' silhouette' : '')) : null;
  if (keyEl) { keyEl.setAttribute('role', 'img'); keyEl.setAttribute('aria-label', card.name + "'s key"); keyEl.title = 'Its key'; }
  const stage = make('div', 'sr-stage' + (keyEl ? ' has-key' : ''), pic, overlayNode(overlayOf(card), { inline: true }), keyEl, arrow(-1), arrow(1), look);
  // its card's picture (the cached still) in the panel
  const cardPic = make('span', 'sr-dcard-pic' + (card.dark ? ' silhouette' : ''));
  const dcard = make('div', 'sr-dcard', cardPic);
  dcard.style.setProperty('--rar', RARITIES[card.rarity].colour);
  detail.replaceChildren(
    make('div', 'sr-fhall'),
    ftop,
    stage,
    make('div', 'sr-dwords',
      make('div', 'sr-dtop', dcard, make('div', 'sr-dname',
        make('div', 'sr-dhead', make('span', 'sr-dtag', RARITIES[card.rarity].name), starsNode(card), card.lent ? make('span', 'sr-badge lent', lentWords(card)) : using ? make('span', 'sr-badge inuse', 'In use') : null),
        make('h2', '', card.name),
        make('span', 'sr-kind', makerLine(card.car)))),
      make('div', 'sr-decu', make('small', '', 'ECU'), pips(card), make('b', '', card.bought + ' of ' + card.max)),
      blueprintBar(card, true),
      upgradeBlock(card, () => { Showroom.reshow(); }),
      figures,
      card.perk && !card.hidden ? make('p', 'sr-perk', make('b', '', 'Perk '), card.perk) : null,
      why,
      card.hidden ? null : renderSources(card.car, { open: true, dark: card.dark })), // (a blacked-out car's: the cards silhouetted, its name withheld; where its key and blueprints come from: render/carsources.js; shut on a desktop, a line)
    make('div', 'sr-actions', sideSwitch('sr-side-detail'), cosmeticsButton(card), go));
  fitLine(go, 11); // (its words on one line, smaller if need be: switching sides never changes its height; render/fitline.js)
  detail.style.setProperty('--rar', RARITIES[card.rarity].colour);
  detail.className = 'sr-detail ' + card.rarity + ' ' + card.state + ' open' + (statsOff ? ' statsoff' : '') + (slide > 0 ? ' from-next' : slide < 0 ? ' from-prev' : '');
  slide = 0;
  requestAnimationFrame(() => { if (full && cardPic.isConnected) stillCar(cardPic, card.car, evilNow()); });
  // the car itself, live (a drag turns it; it lands: render/carbounce.js); with no WebGL, its still
  if (!ShowroomView.show(pic, card.car, { evil, dark: card.dark, keyEl })) requestAnimationFrame(() => { if (Showroom.isOpen) stillCar(pic, card.car, evilNow()); });
  // the "Where to get it" key card's key turns as the car does (black for a blacked-out car): render/keyspin.js
  const keyPic = detail.querySelector('.cs-where .bp-keypic');
  if (keyPic) KeySpin.start(keyPic, card.car, { dark: card.dark }); else KeySpin.stop();
};
const pick = (id) => {
  if (id !== picked) blip('menuMove');
  picked = id;
  showDetail();
};
// the full view's way to the Cosmetics screen: this car, live, on the side on show (a car of a tier not open yet: the car in use)
const openCosmetics = (card) => {
  if (!full || Cosmetics.isOpen) return;
  Cosmetics.open({ car: card && !card.hidden && !card.dark ? card.car : null, evil: evilNow(), onClose: () => { if (Showroom.isOpen && !Garage.isOpen) Showroom.reshow(); } });
};
const cosmeticsButton = (card) => {
  const b = make('button', 'sr-cosm', 'Cosmetics');
  b.title = 'Wheels and more, on this car (C)';
  b.addEventListener('click', () => openCosmetics(card));
  return b;
};
// the full view, opened on the card picked; back keeps the cards where they were (scrolled to the car looked at last
// only if it is out of sight)
const openFull = () => {
  if (full || !list.some(c => c.id === picked)) return;
  closeFilters();
  full = true;
  panel.classList.add('full-up');
  Nav.enter('showroomFull', () => closeFull());
  showDetail();
};
const closeFull = () => {
  if (!full) return;
  full = false;
  detail.classList.remove('open');
  panel.classList.remove('full-up');
  ShowroomView.stop(); // (the live car let go: nothing drawn while the cards are up)
  KeySpin.stop(); // (and the key card's key)
  detail.replaceChildren();
  Nav.leave('showroomFull');
  const node = cards.find(c => c.data.id === picked)?.node;
  if (!isPhone()) node?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); // (a phone: the list exactly where it was)
  try { node?.focus({ preventScroll: true }); } catch { /* (an old browser: no focus options) */ }
};
// the previous / next car of the list as filtered, round from the last to the first: the full view's arrows, the
// arrow keys, a swipe (and the phone's own ways): every layout goes through here
let slide = 0; // (the way the last switch went: the full view slides its car and words in from there)
export const goTo = (offset) => {
  const next = stepIn(list, picked, offset);
  if (!next || next.id === picked) return;
  slide = Math.sign(offset);
  pick(next.id);
};
// a swipe sideways on a touch screen, outside the live car (which a drag turns), goes to the previous / next car.
// (TOUCH events, passive, as the phone's swipeSwitch: pointer events were cancelled the moment the browser took the move for
// a pan (pointercancel), which over the panel's words box, a scroller of its own, it always did on a tablet: the swipe did
// nothing there. A pen still comes by pointer events.)
const swipeOn = (el) => {
  let start = null;
  const begin = (x, y, id, target) => !isPhone() && !target.closest?.('.sr-dpic, .cs-keyspin, button') ? { x, y, id } : null;
  const end = (x, y) => {
    const dx = x - start.x, dy = y - start.y;
    start = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(dx < 0 ? 1 : -1); // (mostly sideways: a scroll of the panel is not one)
  };
  el.addEventListener('touchstart', (e) => { start = e.touches.length === 1 ? begin(e.touches[0].clientX, e.touches[0].clientY, 't' + e.touches[0].identifier, e.target) : null; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    const touch = start && [...e.changedTouches].find(t => 't' + t.identifier === start.id);
    if (touch) end(touch.clientX, touch.clientY);
  }, { passive: true });
  el.addEventListener('touchcancel', () => { start = null; }, { passive: true });
  el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'pen') start = begin(e.clientX, e.clientY, e.pointerId, e.target); });
  el.addEventListener('pointerup', (e) => { if (start && e.pointerId === start.id) end(e.clientX, e.clientY); });
  el.addEventListener('pointercancel', (e) => { if (start && e.pointerId === start.id) start = null; });
};
// Drive: the car picked AND the side on show (showroomData.js driveAs), and back to the menu
const drive = (card) => {
  if (!driveAs(card, evilNow())) return;
  blip('menuPick');
  Showroom.close();
};
// the car lot (Crazey Jim's): closing it comes back here (the full view as it was)
const toLot = (look) => {
  closeFilters();
  ShowroomView.stop();
  panel.classList.add('hidden');
  Garage.open(side, () => Showroom.reshow()); // (the lot in the livery on show here)
  if (look) Garage.look(look);
};
// the next card along in the cards (the arrow keys): two rows on a desktop, so left / right a column, up / down a row
const perColumn = () => cards.length > 1 && cards[1].node.offsetLeft === cards[0].node.offsetLeft && !isPhone() ? 2 : 1;
const step = (dir) => {
  const i = cards.findIndex(c => c.data.id === picked), next = cards[i + dir] || (i < 0 ? cards[0] : null);
  if (!next) return;
  pick(next.data.id);
  if (isPhone() || row.scrollWidth <= row.clientWidth + 2) { next.node.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); return; }
  // (sideways: the card to the middle by the row's pan, onto the column start nearest, so quick presses carry on)
  const box = next.node.getBoundingClientRect(), rowBox = row.getBoundingClientRect();
  const centre = row.scrollLeft + box.left + box.width / 2 - rowBox.left - row.clientWidth / 2, starts = columnStarts();
  const to = starts.length ? starts.reduce((a, b) => Math.abs(b - centre) < Math.abs(a - centre) ? b : a) : centre;
  panRow(Math.max(0, Math.min(row.scrollWidth - row.clientWidth, to)));
};
window.addEventListener('keydown', (e) => {
  if (!Showroom.isOpen || Garage.isOpen || Cosmetics.isOpen || panel.classList.contains('hidden') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('.menu-dialog:not(.hidden)')) return; // (a dialog's own keys)
  if (e.target?.matches?.('select') && e.code !== 'Escape') return; // (the sort list's own keys)
  const column = isPhone(), rows = perColumn();
  switch (e.code) {
    case 'Escape': if (sheet.classList.contains('open')) closeFilters(); else if (full) closeFull(); else Showroom.close(); break;
    case 'ArrowLeft': case 'KeyA': if (full) goTo(-1); else step(column ? -1 : -rows); break;
    case 'ArrowRight': case 'KeyD': if (full) goTo(1); else step(column ? 1 : rows); break;
    case 'ArrowUp': if (full) { if (column) goTo(-1); else return; } else if (column) step(-PHONE_COLUMNS); else if (rows > 1) step(-1); else return; break;
    case 'ArrowDown': if (full) { if (column) goTo(1); else return; } else if (column) step(PHONE_COLUMNS); else if (rows > 1) step(1); else return; break;
    case 'KeyE': pickSide(!side); break;
    case 'KeyC': if (!full) return; openCosmetics(list.find(c => c.id === picked)); break;
    case 'KeyF': if (full) return; toggleFilters(); break;
    case 'Enter': {
      const focused = document.activeElement;
      if (!full && focused?.matches?.('.sr-card') && panel.contains(focused)) { pick(focused.dataset.car); openFull(); break; } // (a card with the focus: its full view)
      if (focused && panel.contains(focused) && focused.matches('button:focus-visible')) return; // (a button reached by Tab: Enter presses it)
      if (!full) { openFull(); break; }
      const card = list.find(c => c.id === picked);
      if (card) drive(card);
      break;
    }
    default: return;
  }
  e.preventDefault();
  e.stopPropagation();
}, true);

export const Showroom = {
  isOpen: false,
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    Game.inMenu = true; // (Enter must not start a run from here)
    side = !!Game.evil; // (the side being played)
    setViewSide(side);
    picked = (CAR && !CAR.silhouette ? CAR.id : null) || carInUse().id;
    full = false;
    // (a level's own list rule; else a rotating event's day, the Concept Strike's: a view of the cars it pays for, every car
    // still drivable, cars.js carFocus)
    const rule = carRule(side), focus = rule?.list ? null : carFocus(), floor = () => showroomCars().map(car => carCard(car, side));
    const forced = rule?.list ? imposedFilter(rule, floor()) : focus ? imposedFilter({ list: true, test: focus.test }, floor(), 'event') : null;
    if (forced) { imposed = { before: filter, label: (rule?.list ? rule : focus).label, focus: !!focus }; filter = { ...forced, sort: filter.sort }; }
    build();
    panel.classList.toggle('evil', side);
    panel.classList.remove('hidden', 'full-up', 'filters-up');
    startScreen.classList.add('hidden');
    Nav.enter('showroom', () => this.close()); // (the back button closes it)
    fill();
    requestAnimationFrame(() => cards.find(c => c.data.id === picked)?.node.scrollIntoView({ block: 'nearest', inline: 'center' }));
  },
  // back from the car lot: everything as it is now (a car bought there is ready to drive), the full view too
  reshow() {
    if (!this.isOpen) { startScreen.classList.remove('hidden'); return; }
    Game.inMenu = true;
    setViewSide(side); // (the car lot let go of its own side on closing)
    panel.classList.remove('hidden');
    startScreen.classList.add('hidden');
    fill(false);
  },
  close() {
    if (!this.isOpen) return;
    closeFilters();
    closeFull();
    if (imposed) { filter = imposed.before; imposed = null; } // (the imposed filter was for the visit: the player's own back)
    this.isOpen = false;
    Nav.leave('showroom');
    Game.inMenu = false;
    queue.clear();
    watcher?.disconnect();
    ShowroomView.stop();
    KeySpin.stop();
    setViewSide(null); // (the car rule goes by the side being played again)
    panel.classList.add('hidden');
    startScreen.classList.remove('hidden');
    window.dispatchEvent(new Event('carchange')); // (the menu's car card shows the car picked)
  },
  // for a picture or a check: the side on show (as the switch does), and what is shown
  side(evil) { pickSide(evil); },
  get shown() {
    return { side: sideName(side), picked, full, filters: !!sheet?.classList.contains('open'), filter: JSON.parse(JSON.stringify(filter)), imposed: imposed ? imposed.label : null,
      list: list.map(c => c.id), live: ShowroomView.state, go: full ? detail?.querySelector('.sr-go')?.textContent || null : null };
  },
  // pick that car's card (and with full, open its full view)
  hideStats(on = true) { statsOff = !!on; }, // (a visit's debug: ?showroom&full&nostats)
  look(id, open = false) {
    if (!cards.some(c => c.data.id === id)) return;
    pick(id);
    cards.find(c => c.data.id === id).node.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (open) openFull();
  },
  // a filter for this visit only (the address's &filter=: not remembered), before or after opening
  useFilter(text) { filter = parseFilter(text); visitOnly = true; if (this.isOpen) fill(); },
  filters(open = true) { if (open) openFilters(); else closeFilters(); },
  goTo,
  back() { if (full) closeFull(); },
  // for a check: the phone's layout (the list's columns as laid out, the list's scroll, the screen up)
  get phoneState() {
    if (!row) return null;
    return { phone: isPhone(), columns: getComputedStyle(row).gridTemplateColumns.split(' ').filter(Boolean).length, scrollTop: row.scrollTop, full };
  },
};
// the live car is drawn only while it can be seen: the showroom up (not under the car lot) with the full view up
ShowroomView.when(() => Showroom.isOpen && full && !Garage.isOpen && !Cosmetics.isOpen && !panel.classList.contains('hidden'));
ShowroomView.keyWhen(() => !sheetUp()); // (its corner key: not under a sheet either)
// and the key card's turning key the same, and not under a sheet (What's inside, a pack reveal: lite.js sheetUp)
KeySpin.when(() => Showroom.isOpen && full && !Garage.isOpen && !panel.classList.contains('hidden') && !sheetUp());
