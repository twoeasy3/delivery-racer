// ---- the SHOWROOM: where a car is picked (the owner, 12-Oct: "the new UI-based menu where cars are selected") ----------
// A screen over the menu, opened by the car card (and G, and ?showroom). A card for every car (showroomData.js says what
// is on it): its picture (its real model, drawn once as a still: render/carstill.js, as the special event's cards are),
// its name and stars, its rarity as the colour of its frame, a pip for each ECU it can reach (filled up to the one it is
// at), its blueprints toward the next ECU as a bar, and, greyed, why one that cannot be driven cannot. The card picked
// fills the DETAIL: its picture large, its figures at its ECU now beside its maxed ones, its respawn time, its perk, and
// DRIVE (the car picked and back to the menu). A big button takes the player to the car lot, Crazey Jim's Used Cars
// (render/garage.js), where cars are bought; closing the lot comes back here.
// The layout (showroom.css): on a desktop (or a phone on its side) the cards are ONE ROW scrolled sideways (a drag, the
// wheel, the arrows at its ends, the arrow keys), as the menu's event row is, with the detail under it; on a phone
// held upright they are a column scrolled down, and the detail is a sheet that slides up over it.
// Keys: left / right (up / down in the column) the next card, Enter drive, Escape back (or the sheet closed).
// For a picture: ?showroom opens it; &look=<car id> picks that card; &sheet opens its sheet on a phone;
// &bp=sport:7,hotrod:3 gives those blueprints for the visit (nothing saved).
import '../showroom.css';
import { showroomCars, carCard, floorBest, RARITIES, CAR_LOT } from '../showroomData.js';
import { CAR, carInUse, selectCar } from '../cars.js';
import { Progress } from '../progress.js';
import { Game } from '../game.js';
import { Nav } from '../nav.js';
import { richTiers, tierStarsNode } from '../tiers.js';
import { Garage } from './garage.js';
import { stillCar, stillReady } from './carstill.js';
import { Sound } from './audio.js';

const panel = document.getElementById('showroom');
const startScreen = document.getElementById('startScreen');
const make = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
};
const money = (amount) => '$' + amount.toFixed(2);
const blip = (name) => Sound.play(name, 0.5);
const phone = () => window.matchMedia?.('(max-width: 760px) and (min-height: 521px), (max-width: 519px)').matches;

// ---- the ECU pips and the blueprint bar (a card's, and the detail's, larger) ----
const pips = (card) => {
  const row = make('span', 'sr-pips');
  row.setAttribute('aria-label', 'ECU ' + card.ecu + ' of ' + card.max);
  for (let i = 1; i <= card.max; i++) row.append(make('i', i <= card.ecu ? 'on' : ''));
  return row;
};
const blueprintBar = (card, long = false) => {
  if (!card.upgradable) return make('span', 'sr-bp none', long ? (card.car.earned ? 'A special car: no blueprints, it stays at ECU1' : 'Comes maxed: no blueprints') : 'No blueprints');
  const fill = make('i');
  fill.style.width = Math.round(card.have / card.toNext * 100) + '%';
  const words = card.maxed ? (long ? 'Maxed out' + (card.blueprints ? ' (' + card.blueprints + ' blueprints)' : '') : 'MAX')
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
const evilNow = () => !!Game.evil;
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

// ---- building it ----
let cards = [];      // [{ data, node }]
let picked = null;   // the car id picked
let filter = 'all';  // 'all' | 'ready' | 'locked'
let best = null;     // the best figures on the floor (the stat bars)
let row, rowBox, detail, sheetShade, countEl, bankEl, back, on;

const FILTERS = [['all', 'All'], ['ready', 'Ready'], ['locked', 'Locked']];
const build = () => {
  best ||= floorBest();
  const top = make('header', 'sr-top');
  const backBtn = make('button', 'sr-back', make('span', '', '‹'), make('span', 'sr-back-w', 'Menu'));
  backBtn.title = 'Back to the menu (Escape)';
  backBtn.addEventListener('click', () => Showroom.close());
  bankEl = make('div', 'sr-bank');
  countEl = make('div', 'sr-count');
  const seg = make('div', 'sr-filter');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Show');
  for (const [id, label] of FILTERS) {
    const b = make('button', id === filter ? 'on' : '', label);
    b.dataset.filter = id;
    b.addEventListener('click', () => { filter = id; for (const x of seg.children) x.classList.toggle('on', x === b); fill(); });
    seg.append(b);
  }
  const lot = make('button', 'sr-lot', make('span', 'sr-lot-sign', 'Crazey Jim’s'), make('small', '', 'Used Cars · buy cars'));
  lot.title = CAR_LOT + ': the car lot, where cars are bought';
  lot.addEventListener('click', () => toLot());
  top.append(backBtn, make('div', 'sr-title', make('h1', '', 'Showroom'), make('p', '', 'Pick your car')), countEl, bankEl, seg, lot);

  row = make('div', 'sr-row');
  back = make('button', 'sr-arrow back', '‹');
  on = make('button', 'sr-arrow on', '›');
  back.setAttribute('aria-label', 'Scroll back');
  on.setAttribute('aria-label', 'Scroll on');
  back.addEventListener('click', () => by(-1));
  on.addEventListener('click', () => by(1));
  row.addEventListener('scroll', arrows, { passive: true });
  // (a vertical wheel scrolls the row sideways; in the column, the column scrolls as ever)
  row.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && row.scrollWidth > row.clientWidth + 2) { row.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  // (a mouse drags it too; a drag is not a click on the card it began on)
  let drag = null;
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
  sheetShade = make('div', 'sr-shade');
  sheetShade.addEventListener('click', () => closeSheet());
  panel.replaceChildren(make('div', 'sr-backdrop'), top, make('div', 'sr-body', rowBox, detail), sheetShade);

  watcher?.disconnect();
  watcher = window.IntersectionObserver ? new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) { const car = carOf.get(entry.target); if (car) want(entry.target, car); }
  }, { root: null, rootMargin: '300px' }) : null;
};

// the row's arrows: only where there is more that way (a desktop's row; the column has none)
const arrows = () => {
  if (!row) return;
  const sideways = row.scrollWidth > row.clientWidth + 2;
  back.hidden = !sideways || row.scrollLeft < 4;
  on.hidden = !sideways || row.scrollLeft + row.clientWidth > row.scrollWidth - 4;
};
const by = (dir) => row.scrollBy({ left: dir * Math.max(200, row.clientWidth * 0.8), behavior: 'smooth' });

// the cards, for the filter chosen
const fill = () => {
  const evil = evilNow(), inUse = carInUse();
  const all = showroomCars().map(car => carCard(car, evil));
  const shown = all.filter(c => filter === 'all' || (filter === 'ready' ? c.state === 'ready' : c.state !== 'ready'));
  countEl.replaceChildren(make('b', '', String(all.filter(c => c.unlocked).length)), ' / ' + all.length + ' cars');
  bankEl.replaceChildren(make('small', '', 'Bank'), money(Progress.data.money));
  watcher?.disconnect();
  cards = shown.map((data) => {
    const pic = make('span', 'sr-pic' + (data.hidden ? ' silhouette' : ''));
    const badge = data.car === inUse || data.id === inUse.id ? make('span', 'sr-badge inuse', 'In use')
      : data.state === 'barred' ? make('span', 'sr-badge barred', 'Not on this level') : null;
    const lock = data.state === 'locked' ? make('span', 'sr-lock', make('b', '', '🔒'), make('span', '', data.reason)) : null;
    const node = make('button', 'sr-card ' + data.rarity + ' ' + data.state + (data.id === picked ? ' picked' : ''),
      make('span', 'sr-tag', RARITIES[data.rarity].name), starsNode(data), pic, badge,
      make('span', 'sr-info',
        make('strong', 'sr-name', data.name),
        make('span', 'sr-ecu', make('small', '', 'ECU'), pips(data), make('em', '', data.ecu + '/' + data.max)),
        blueprintBar(data)),
      lock);
    node.style.setProperty('--rar', RARITIES[data.rarity].colour);
    node.dataset.car = data.id;
    node.title = data.state === 'locked' ? data.reason : data.state === 'barred' ? 'You can drive it, but not on the level picked' : data.name;
    node.addEventListener('click', () => pick(data.id, true));
    node.addEventListener('dblclick', () => { if (data.state === 'ready') drive(data); });
    watch(pic, data.car);
    return { data, node };
  });
  row.replaceChildren(...(cards.length ? cards.map(c => c.node) : [make('p', 'sr-empty', filter === 'ready' ? 'No car ready to drive here.' : 'Every car is yours.')]));
  if (!cards.some(c => c.data.id === picked)) picked = (cards.find(c => c.data.id === inUse.id) || cards[0])?.data.id ?? null;
  showDetail();
  requestAnimationFrame(arrows);
};

// a stat line: the figure now, its bar, and (a car not maxed) the maxed figure and the bar's reach then
const stat = (name, now, max, show, share) => {
  const bar = make('span', 'sr-stat-track'), fillNow = make('i', 'now'), fillMax = make('i', 'max');
  fillNow.style.width = Math.round(Math.max(0.04, Math.min(1, share(now))) * 100) + '%';
  fillMax.style.width = Math.round(Math.max(0.04, Math.min(1, share(max))) * 100) + '%';
  bar.append(fillMax, fillNow);
  const same = show(now) === show(max);
  return make('div', 'sr-stat', make('small', '', name), bar, make('b', '', show(now)), make('span', 'sr-stat-max', same ? '' : 'max ' + show(max)));
};
const kmh = (v) => Math.round(v * 3.6) + ' km/h';
const showDetail = () => {
  const card = cards.find(c => c.data.id === picked)?.data;
  if (!card) { detail.replaceChildren(make('p', 'sr-empty', 'No car here.')); return; }
  for (const c of cards) c.node.classList.toggle('picked', c.data.id === picked);
  const inUse = carInUse(), using = card.id === inUse.id;
  const pic = make('div', 'sr-dpic' + (card.hidden ? ' silhouette' : ''));
  const s = card.stats, m = card.maxStats;
  const share = { speed: v => v / best.maxSpeed, accel: v => v / best.accel, health: v => v / best.health,
    respawn: v => best.respawnWorst > best.respawnBest ? 0.15 + 0.85 * (best.respawnWorst - v) / (best.respawnWorst - best.respawnBest) : 1 };
  const figures = card.hidden ? make('p', 'sr-why', 'A car of a tier not open yet: its figures show once it is.')
    : make('div', 'sr-stats',
      stat('Top speed', s.maxSpeed, m.maxSpeed, kmh, share.speed),
      stat('Acceleration', s.accel, m.accel, v => String(Math.round(v * 10) / 10), share.accel),
      stat('Health', s.health, m.health, v => String(Math.round(v)), share.health),
      stat('Respawn', s.respawn, m.respawn, v => (Math.round(v * 10) / 10).toFixed(1) + ' s', share.respawn));
  // what can be done with it
  const go = make('button', 'sr-go');
  let why = null;
  if (card.state === 'ready') {
    go.textContent = using ? 'In use · Back' : 'Drive';
    go.addEventListener('click', () => drive(card));
  } else if (card.state === 'barred') {
    go.textContent = 'Not on this level';
    go.disabled = true;
    why = make('p', 'sr-why', ...(card.rule?.tier ? ['The level picked needs a ', tierStarsNode(card.rule.tier), ' car (until its medal is earned)'] : card.rule?.label ? ['The level picked allows only ', ...richTiers(card.rule.label)] : ['Not allowed on the level picked']));
  } else {
    go.textContent = card.forSale ? 'Buy at Crazey Jim’s' : 'Locked';
    go.disabled = !card.forSale;
    if (card.forSale) go.addEventListener('click', () => toLot(card.id));
    why = make('p', 'sr-why locked', make('b', '', card.reason), card.hint ? make('span', '', ...richTiers(card.hint)) : null);
  }
  const close = make('button', 'sr-sheet-close', '✕');
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => closeSheet());
  detail.replaceChildren(
    close,
    pic,
    make('div', 'sr-dwords',
      make('div', 'sr-dhead', make('span', 'sr-dtag', RARITIES[card.rarity].name), starsNode(card), using ? make('span', 'sr-badge inuse', 'In use') : null),
      make('h2', '', card.name),
      make('div', 'sr-decu', make('small', '', 'ECU'), pips(card), make('b', '', card.ecu + ' of ' + card.max), card.blueprint ? make('span', 'sr-kind', 'Blueprint car') : make('span', 'sr-kind', 'Key car')),
      blueprintBar(card, true),
      figures,
      card.perk && !card.hidden ? make('p', 'sr-perk', make('b', '', 'Perk '), card.perk) : null,
      why,
      make('div', 'sr-actions', go)));
  detail.style.setProperty('--rar', RARITIES[card.rarity].colour);
  detail.className = 'sr-detail ' + card.rarity + ' ' + card.state + (detail.classList.contains('open') ? ' open' : '');
  requestAnimationFrame(() => { if (Showroom.isOpen) stillCar(pic, card.car, evilNow()); }); // (once laid out: at its own, larger size)
};
const pick = (id, tapped = false) => {
  if (id !== picked) blip('menuMove');
  picked = id;
  showDetail();
  if (tapped && phone()) openSheet();
};
// the sheet (a phone held upright: the detail slides up over the column)
const openSheet = () => {
  if (detail.classList.contains('open')) return;
  detail.classList.add('open');
  panel.classList.add('sheet-up');
  Nav.enter('showroomSheet', () => closeSheet());
};
const closeSheet = () => {
  if (!detail?.classList.contains('open')) return;
  detail.classList.remove('open');
  panel.classList.remove('sheet-up');
  Nav.leave('showroomSheet');
};
// Drive: the car picked (and the menu, with it)
const drive = (card) => {
  if (card.state !== 'ready') return;
  // (a blueprint car unlocked by its blueprints is the player's: so the save says, where ecu.js has not written it)
  if (card.unlocked && !Progress.owns(card.id)) { Progress.data.cars.push(card.id); Progress.save(); }
  if (card.id !== carInUse().id) selectCar(card.id);
  blip('menuPick');
  Showroom.close();
};
// the car lot (Crazey Jim's): closing it comes back here
const toLot = (look) => {
  closeSheet();
  panel.classList.add('hidden');
  Garage.open(Game.evil, () => Showroom.reshow());
  if (look) Garage.look(look);
};
// the next card along (the arrow keys)
const step = (dir) => {
  const i = cards.findIndex(c => c.data.id === picked), next = cards[Math.max(0, Math.min(cards.length - 1, i + dir))];
  if (!next) return;
  pick(next.data.id);
  next.node.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
};
window.addEventListener('keydown', (e) => {
  if (!Showroom.isOpen || Garage.isOpen || panel.classList.contains('hidden') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('.menu-dialog:not(.hidden)')) return; // (a dialog's own keys)
  const column = phone();
  switch (e.code) {
    case 'Escape': if (detail.classList.contains('open')) closeSheet(); else Showroom.close(); break;
    case 'ArrowLeft': case 'KeyA': if (!column) step(-1); else return; break;
    case 'ArrowRight': case 'KeyD': if (!column) step(1); else return; break;
    case 'ArrowUp': if (column) step(-1); else return; break;
    case 'ArrowDown': if (column) step(1); else return; break;
    case 'Enter': {
      const focused = document.activeElement;
      if (focused && panel.contains(focused) && focused.matches('button:focus-visible') && !focused.classList.contains('sr-card')) return; // (a button reached by Tab: Enter presses it)
      const card = cards.find(c => c.data.id === picked)?.data;
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
    picked = (CAR && !CAR.silhouette ? CAR.id : null) || carInUse().id;
    build();
    panel.classList.toggle('evil', !!Game.evil);
    panel.classList.remove('hidden');
    startScreen.classList.add('hidden');
    Nav.enter('showroom', () => this.close()); // (the back button closes it)
    fill();
    requestAnimationFrame(() => cards.find(c => c.data.id === picked)?.node.scrollIntoView({ block: 'nearest', inline: 'center' }));
  },
  // back from the car lot: everything as it is now (a car bought there is ready to drive)
  reshow() {
    if (!this.isOpen) { startScreen.classList.remove('hidden'); return; }
    Game.inMenu = true;
    panel.classList.remove('hidden');
    startScreen.classList.add('hidden');
    fill();
  },
  close() {
    if (!this.isOpen) return;
    closeSheet();
    this.isOpen = false;
    Nav.leave('showroom');
    Game.inMenu = false;
    queue.clear();
    watcher?.disconnect();
    panel.classList.add('hidden');
    startScreen.classList.remove('hidden');
    window.dispatchEvent(new Event('carchange')); // (the menu's car card shows the car picked)
  },
  // for a picture or a check: pick that car's card (and on a phone its sheet)
  look(id, sheet = false) { if (cards.some(c => c.data.id === id)) { pick(id); if (sheet && phone()) openSheet(); cards.find(c => c.data.id === id).node.scrollIntoView({ block: 'nearest', inline: 'center' }); } },
};
