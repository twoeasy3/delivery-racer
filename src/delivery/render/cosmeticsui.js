// ---- the COSMETICS screen: where the equippable cosmetics are chosen, on the player's own car, live (the owner, 14-Oct: "get an
// agent on the cosmetic equip UI"; CHECKLIST 276). A screen over whatever opened it: the showroom's full view (a "Cosmetics"
// button, and C) or the Options sheet (Wheels > "Customise wheels..."), and ?cosmetics for a picture. The car is the showroom's
// live view (render/showroomview.js: the menu's one renderer, turning on its floor, a drag turns it), and a choice applies to
// it at once (render/wheelcosmetic.js recolours every live car: no reload). "Wheels close-up" eases the same camera in to
// the wheels. The page never reloads and the start screen stays a menu.
// SLOTS: a list down the side. WHEELS is the only live one (Design and Hub colour, both for every car); the others are greyed
// "coming later" entries that open nothing: the framework costs a line each. EVERYTHING IS FREE AND OPEN for now: `owned` is
// the one place a later unlock check goes (a chip it says no to is shown locked and cannot be equipped).
// Keys: arrows move between the choices (left / right along a row, up / down between rows), Enter or Space equips the one
// focused, Escape goes back. Touch: every choice is at least 44 px tall. Storage and the test switches are wheelcosmetic.js's.
import '../cosmetics.css';
import { WHEEL_COLOURS, WHEEL_DESIGNS, wheelColour, setWheelColour, wheelDesign, setWheelDesign, onWheelColour } from './wheelcosmetic.js';
import { ShowroomView } from './showroomview.js';
import { stillCar } from './carstill.js';
import { carInUse, CARS } from '../cars.js';
import { Game } from '../game.js';
import { Nav } from '../nav.js';
import { Sound } from './audio.js';

// the slots; `live` ones have a section below. (A later cosmetic: add its entry, set live, build its section in `build`.)
export const SLOTS = [
  { id: 'wheels', name: 'Wheels', live: true },
  { id: 'plate', name: 'Number plate', live: false },
  { id: 'roof', name: 'Roof ornament', live: false },
  { id: 'underglow', name: 'Underglow', live: false },
];
// THE place for "does the player own it?" Everything is free and open for now: nothing is locked. A later unlock system
// answers here by slot ('wheels') and choice id ('whitewall', 'gold'); a choice it refuses shows locked and cannot be equipped.
export const owned = (slot, id) => true; // eslint-disable-line no-unused-vars

const root = document.getElementById('cosmetics');
const make = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
};
const hexOf = (hex, fallback) => '#' + (hex === null ? fallback : hex.toString(16).padStart(6, '0'));

let built = false, stage, carName, status, slotList, designRow, colourRow, closeBtn, viewBtns;
let state = { open: false, car: null, evil: false, onClose: null, inMenu: false, close: false };

const chip = (kind, id, name, swatch, pick) => {
  const b = make('button', 'cz-chip');
  b.type = 'button';
  b.dataset[kind] = id;
  b.append(swatch, make('span', 'cz-name', name), make('span', 'cz-tick', '✓')); // (the tick shows on the equipped one)
  b.addEventListener('click', () => { if (owned('wheels', id)) { pick(id); Sound.play('menuPick', 0.4); } });
  return b;
};
const swatchOf = (css, stock) => { const s = make('span', 'cz-swatch' + (stock ? ' stock' : '')); if (css) s.style.background = css; return s; };

const shown = () => {
  const design = WHEEL_DESIGNS.find(d => d.id === wheelDesign()), colour = WHEEL_COLOURS.find(c => c.id === wheelColour());
  for (const b of designRow.children) { const on = b.dataset.design === design.id; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on); b.classList.toggle('locked', !owned('wheels', b.dataset.design)); }
  for (const b of colourRow.children) { const on = b.dataset.wheel === colour.id; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on); b.classList.toggle('locked', !owned('wheels', b.dataset.wheel)); }
  status.textContent = 'Wheels: ' + design.name + ' design, ' + (colour.id === 'stock' ? 'stock hub colour' : colour.name + ' hubs');
};

const build = () => {
  built = true;
  const back = make('button', 'cz-back', make('span', '', '‹'), make('span', '', 'Back'));
  back.type = 'button';
  back.title = 'Back (Escape)';
  back.addEventListener('click', () => Cosmetics.close());
  closeBtn = back;
  carName = make('p', 'cz-sub');
  const top = make('div', 'cz-top', back, make('div', 'cz-title', make('h1', '', 'Cosmetics'), carName));
  // the live car
  stage = make('div', 'cz-pic');
  stage.title = 'Drag to turn it';
  const view = (name, close) => { const b = make('button', 'cz-view', name); b.type = 'button'; b.addEventListener('click', () => setCloseUp(close)); return b; };
  viewBtns = [view('Whole car', false), view('Wheels close-up', true)];
  const stageBox = make('div', 'cz-stage', stage, make('div', 'cz-views', ...viewBtns), make('p', 'cz-hint', 'Drag to turn the car'));
  // the slots
  slotList = make('div', 'cz-slots');
  slotList.setAttribute('role', 'tablist');
  slotList.setAttribute('aria-label', 'Cosmetic slots');
  for (const slot of SLOTS) {
    const b = make('button', 'cz-slot' + (slot.live ? ' on' : ' later'), make('span', '', slot.name), slot.live ? null : make('small', '', 'Coming later'));
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(slot.live));
    if (!slot.live) b.setAttribute('aria-disabled', 'true'); // (greyed: nothing behind it yet; it is skipped by the keys)
    slotList.append(b);
  }
  // the Wheels section
  designRow = make('div', 'cz-row');
  designRow.setAttribute('role', 'group');
  designRow.setAttribute('aria-label', 'Wheel design: a tyre and hub look for every car');
  for (const d of WHEEL_DESIGNS) {
    const tyre = hexOf(d.tyre, '1b1b1d'), ring = d.ring ? hexOf(d.ring.hex) : tyre, hub = hexOf(d.hub, '9aa3b2');
    designRow.append(chip('design', d.id, d.name, swatchOf('radial-gradient(circle,' + hub + ' 0 30%,' + tyre + ' 30% 46%,' + ring + ' 46% 66%,' + tyre + ' 66%)'), setWheelDesign));
  }
  colourRow = make('div', 'cz-row');
  colourRow.setAttribute('role', 'group');
  colourRow.setAttribute('aria-label', 'Hub colour: the rims and hubs of every car');
  for (const c of WHEEL_COLOURS) colourRow.append(chip('wheel', c.id, c.name, swatchOf(c.hex === null ? null : hexOf(c.hex), c.hex === null), setWheelColour));
  status = make('p', 'cz-status');
  status.setAttribute('aria-live', 'polite');
  const reset = make('button', 'cz-reset', 'Reset to stock');
  reset.type = 'button';
  reset.addEventListener('click', () => { setWheelDesign('stock'); setWheelColour('stock'); Sound.play('menuMove', 0.4); });
  const wheels = make('section', 'cz-section',
    make('h2', '', 'Wheels'),
    make('p', 'cz-note', 'For every car you drive, in the garage and on the road. A hub colour other than Stock overrides the design’s hubs.'),
    make('h3', '', 'Design'), designRow,
    make('h3', '', 'Hub colour'), colourRow,
    make('div', 'cz-foot', status, reset));
  root.replaceChildren(make('div', 'cz-backdrop'), top, stageBox, make('div', 'cz-panel', slotList, wheels));
  onWheelColour(shown);
  setCloseUp(false);
};
const setCloseUp = (on) => {
  state.close = on;
  ShowroomView.closeUp(on);
  viewBtns[0].setAttribute('aria-pressed', String(!on));
  viewBtns[1].setAttribute('aria-pressed', String(on));
};

// arrows: along a row, or to the nearest choice above / below
const choices = () => [...root.querySelectorAll('.cz-chip:not(.locked), .cz-reset, .cz-view, .cz-back')];
const move = (dx, dy) => {
  const all = choices(), at = document.activeElement, from = all.includes(at) ? at : null;
  if (!from) { (root.querySelector('.cz-chip.equipped') || all[0])?.focus(); return; }
  const a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestD = Infinity;
  for (const el of all) {
    if (el === from) continue;
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2 - ax, y = r.top + r.height / 2 - ay;
    if (dx && (Math.abs(y) > a.height * 0.5 || x * dx <= 0)) continue; // (left / right: the same row)
    if (dy && (y * dy <= a.height * 0.3)) continue;                      // (up / down: a row above / below, the nearest across)
    const d = dx ? Math.abs(x) : Math.abs(y) * 4 + Math.abs(x);
    if (d < bestD) { best = el; bestD = d; }
  }
  if (best) best.focus();
  else if (dx) { // (the end of a row: round to the next / previous choice in the page's order)
    const i = all.indexOf(from), next = all[i + dx];
    if (next && next.classList.contains('cz-chip') && from.classList.contains('cz-chip')) next.focus();
  }
};
window.addEventListener('keydown', (e) => {
  if (!state.open || e.ctrlKey || e.metaKey || e.altKey) return;
  const key = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
  if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); Cosmetics.close(); }
  else if (key) { e.preventDefault(); e.stopImmediatePropagation(); move(...key); }
}, true);

const showCar = () => {
  const car = state.car;
  carName.textContent = 'On your ' + car.name;
  if (!ShowroomView.show(stage, car, { evil: state.evil })) requestAnimationFrame(() => { if (state.open) stillCar(stage, car, state.evil); }); // (no WebGL: its picture)
};

export const Cosmetics = {
  get isOpen() { return state.open; },
  // open over whatever is up. car: the car to show (default the car in use); evil: its side; onClose: called once it is shut
  open({ car = null, evil = !!Game.evil, onClose = null } = {}) {
    if (state.open || !root) return;
    if (!built) build();
    const use = car || carInUse();
    state = { open: true, car: use.silhouette || use.id === 'null-car' ? CARS.find(c => !c.silhouette) : use, evil, onClose, inMenu: Game.inMenu, close: false };
    Game.inMenu = true; // (the menu's keys leave it alone)
    root.classList.remove('hidden');
    root.classList.toggle('evil', evil);
    Nav.enter('cosmetics', () => this.close());
    setCloseUp(new URLSearchParams(location.search).get('closeup') !== null); // (?closeup: for a picture)
    shown();
    showCar();
    requestAnimationFrame(() => (root.querySelector('.cz-row .cz-chip.equipped') || closeBtn)?.focus({ preventScroll: true }));
  },
  close() {
    if (!state.open) return;
    const done = state.onClose;
    state.open = false;
    root.classList.add('hidden');
    Nav.leave('cosmetics');
    ShowroomView.stop(); // (the live car let go; whoever opened this draws theirs again)
    Game.inMenu = state.inMenu;
    done?.();
  },
  // for a check or a picture
  get shown() { return { open: state.open, car: state.car?.id || null, closeUp: state.close, design: wheelDesign(), colour: wheelColour(), view: ShowroomView.state }; },
  closeUp: setCloseUp,
};
// the live car is drawn while this screen is up
ShowroomView.also(() => state.open && !root.classList.contains('hidden'));
