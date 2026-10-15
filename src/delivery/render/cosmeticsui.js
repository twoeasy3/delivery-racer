// ---- the COSMETICS screen: where the equippable cosmetics are chosen, on the player's own car, live (the owner, 14-Oct: "get an
// agent on the cosmetic equip UI"; CHECKLIST 276). A screen over whatever opened it: the showroom's full view (a "Cosmetics"
// button, and C) or the Options sheet (Wheels > "Customise wheels..."), and ?cosmetics for a picture. The car is the showroom's
// live view (render/showroomview.js: the menu's one renderer, turning on its floor, a drag turns it), and a choice applies to
// it at once (render/wheelcosmetic.js recolours every live car: no reload). "Wheels close-up" eases the same camera in to
// the wheels. The page never reloads and the start screen stays a menu.
// SLOTS: a list down the side. WHEELS is the only live one (one row of wheel SETS, each a tyre + hub, for every car; 'Custom' shows when the saved pair is no set); the others are greyed
// "coming later" entries that open nothing: the framework costs a line each. EVERYTHING IS FREE AND OPEN for now: `owned` is
// the one place the unlock check goes (a chip it says no to is shown locked and cannot be equipped).
// Keys: arrows move between the choices (left / right along a row, up / down between rows), Enter or Space equips the one
// focused, Escape goes back. Touch: every choice is at least 44 px tall. Storage and the test switches are wheelcosmetic.js's.
import '../cosmetics.css';
import { WHEEL_COLOURS, WHEEL_DESIGNS, WHEEL_SETS, wheelColour, wheelDesign, wheelSet, setWheelSet, onWheelColour } from './wheelcosmetic.js';
import { PLATE_DESIGNS, designById, plateDesign, shownDesign, setPlateDesign, plateText, setPlateText, previewPlateText, resetPlate, onPlate, platePlan } from './platecosmetic.js';
import { drawPlate } from './platedesigns.js';
import { MAX_LEN, DEFAULT_TEXT, sanitizePlateText } from './platetext.js';
import { PROP_PAINTS, paintValueOf, PROPS, propChoice, shownProp, setProp, propPaintChoice, setPropPaint, resetProp, onProp, slotStatus } from './propdress.js';
import { propById, buildProp, propPaint } from './propmodels.js';
import { propSlots } from './propanchors.js';
import { existingProps } from './propcosmetic.js';
import { sharedRenderer, drawStill } from './modelviews.js';
import { ShowroomView } from './showroomview.js';
import { stillCar } from './carstill.js';
import { carInUse, CARS } from '../cars.js';
import { Game } from '../game.js';
import { ownsCosmetic } from './cosmetics.js';
import { Nav } from '../nav.js';
import { Sound } from './audio.js';

// the slots; `live` ones have a section below. (A later cosmetic: add its entry, set live, build its section in `build`.)
export const SLOTS = [
  { id: 'wheels', name: 'Wheels', live: true },
  { id: 'plate', name: 'Number plate', live: true },
  { id: 'roof', name: 'Roof', live: true, prop: true },
  { id: 'cargo', name: 'Cargo', live: true, prop: true },
  { id: 'wing', name: 'Wing', live: true, prop: true },
  { id: 'underglow', name: 'Underglow', live: false },
];
// THE place for "does the player own it?" It asks cosmetics.js ownsCosmetic (free, or in its own stored list; the registry is there too).
// Every cosmetic is free today, so nothing is locked yet; a choice it refuses shows locked and cannot be equipped, and an equipped
// set that is not owned wears Stock (wheelcosmetic.js).
export const owned = (slot, id) => ownsCosmetic(slot, id);

const root = document.getElementById('cosmetics');
const make = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
};
const hexOf = (hex, fallback) => '#' + (hex === null ? fallback : hex.toString(16).padStart(6, '0'));

let built = false, stage, carName, status, slotList, setRow, customChip, closeBtn, viewBtns, sections = {}, propSecs = {}, tabMsg, plateRow, plateInput, plateMsg, plateStatus, plateChip, openSlot = 'wheels';
let state = { open: false, car: null, evil: false, onClose: null, inMenu: false, close: false };

const chip = (kind, id, name, swatch, pick, slot = 'wheels') => {
  const b = make('button', 'cz-chip');
  b.type = 'button';
  b.dataset[kind] = id;
  b.append(swatch, make('span', 'cz-name', name), make('span', 'cz-tick', '✓')); // (the tick shows on the equipped one)
  b.addEventListener('click', () => { if (owned(slot, id)) { pick(id); Sound.play('menuPick', 0.4); } else flash(plateMsg, 'Locked: unlock it to wear it.'); });
  return b;
};
const swatchOf = (css, stock) => { const s = make('span', 'cz-swatch' + (stock ? ' stock' : '')); if (css) s.style.background = css; return s; };

const shown = () => {
  const id = wheelSet(), set = WHEEL_SETS.find(x => x.id === id);
  for (const b of setRow.children) { const on = b.dataset.set === id; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on); b.classList.toggle('locked', !owned('wheels', b.dataset.set)); }
  customChip.hidden = id !== 'custom'; // (the equipped state when the saved pair is no set: shown, ticked, not pressable)
  status.textContent = 'Wheels: ' + (set ? set.name : 'Custom (a mix that is not one of the sets)');
};

const flash = (node, text) => { if (node) node.textContent = text; };
// a mini plate for a chip: the design's own drawing, small
const miniPlate = (id, text) => {
  const c = make('canvas', 'cz-mini'); c.width = 96; c.height = 24;
  if (id === 'stock') { c.classList.add('stock'); return c; }
  drawPlate(c.getContext('2d'), designById(id), text, 96, 24);
  return c;
};
const plateShown = () => {
  const id = plateDesign(), text = plateText(), worn = shownDesign();
  for (const b of plateRow.children) {
    const on = b.dataset.plate === id;
    b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on); b.classList.toggle('locked', !owned('plate', b.dataset.plate));
    const old = b.querySelector('canvas'); if (old && b.dataset.plate !== 'stock') old.replaceWith(miniPlate(b.dataset.plate, text));
  }
  plateChip.replaceChildren(worn === 'stock' ? make('span', 'cz-note', "Stock: the car's own plate") : miniPlate(worn, text));
  const plan = platePlan(ShowroomView.model);
  const car = state.car;
  plateStatus.textContent = (worn === 'stock' ? 'Stock plates' : designById(worn).name + ': ' + text)
    + (car && car.legend ? '. Legendary cars keep their own gold plates.' : plan && plan.status === 'none' ? '. This vehicle cannot wear a plate.' : plan && plan.status === 'unplaced' ? '. No flat place for a plate on this one.' : plan && plan.status === 'ok' && worn !== 'stock' ? ' (' + plan.ends.join(' and ') + ')' : '');
  for (const b of viewBtns) if (b.dataset.end) b.disabled = !(plan && plan.status === 'ok' && plan.ends.includes(b.dataset.end));
};
const commitText = () => {
  if (!plateInput) return;
  const r = setPlateText(plateInput.value);
  plateInput.value = r.ok ? r.text : '';
  flash(plateMsg, r.reason === 'blocked' ? 'That plate is not allowed, so it shows ' + DEFAULT_TEXT + ' instead.' : r.reason === 'empty' ? 'Empty: it shows ' + DEFAULT_TEXT + '.' : 'Plate saved.');
  if (r.reason) plateInput.value = '';
};
const buildPlate = () => {
  plateRow = make('div', 'cz-row cz-plates');
  plateRow.setAttribute('role', 'group');
  plateRow.setAttribute('aria-label', 'Plate design');
  for (const d of PLATE_DESIGNS) plateRow.append(chip('plate', d.id, d.name, miniPlate(d.id, plateText()), (id) => { if (setPlateDesign(id)) flash(plateMsg, ''); }, 'plate'));
  plateInput = make('input', 'cz-text');
  plateInput.type = 'text'; plateInput.maxLength = MAX_LEN; plateInput.placeholder = DEFAULT_TEXT; plateInput.value = plateText() === DEFAULT_TEXT ? '' : plateText();
  plateInput.setAttribute('autocapitalize', 'characters'); plateInput.setAttribute('autocomplete', 'off'); plateInput.setAttribute('autocorrect', 'off'); plateInput.setAttribute('spellcheck', 'false');
  plateInput.setAttribute('enterkeyhint', 'done'); plateInput.setAttribute('aria-label', 'Your plate text: up to ' + MAX_LEN + ' letters, numbers, spaces or dashes');
  plateInput.addEventListener('input', () => {
    if (plateInput.dataset.composing) return;
    const clean = sanitizePlateText(plateInput.value);
    if (clean !== plateInput.value.toUpperCase()) flash(plateMsg, 'Letters, numbers, space and dash only.'); else flash(plateMsg, '');
    plateInput.value = clean;
    previewPlateText(clean.trim() ? clean : null);
  });
  plateInput.addEventListener('compositionstart', () => { plateInput.dataset.composing = '1'; });
  plateInput.addEventListener('compositionend', () => { delete plateInput.dataset.composing; plateInput.dispatchEvent(new Event('input')); });
  // the field's keys stay in the field: nothing reaches the menu's or the game's own key handling
  for (const type of ['keydown', 'keyup', 'keypress']) plateInput.addEventListener(type, (e) => {
    if (type === 'keydown' && e.key === 'Enter') { e.preventDefault(); commitText(); plateInput.blur(); }
    if (type === 'keydown' && e.key === 'Escape') { previewPlateText(null); plateInput.value = plateText() === DEFAULT_TEXT ? '' : plateText(); return; } // (the screen's own Escape then closes it)
    e.stopPropagation();
  });
  plateInput.addEventListener('blur', () => { if (state.open && plateInput.value.trim()) commitText(); else previewPlateText(null); });
  const ok = make('button', 'cz-ok', 'OK'); ok.type = 'button'; ok.addEventListener('click', () => { commitText(); Sound.play('menuPick', 0.4); });
  plateMsg = make('p', 'cz-msg'); plateMsg.setAttribute('aria-live', 'polite');
  plateChip = make('div', 'cz-plate-chip');
  plateStatus = make('p', 'cz-status'); plateStatus.setAttribute('aria-live', 'polite');
  const reset = make('button', 'cz-reset', 'Reset to stock'); reset.type = 'button';
  reset.addEventListener('click', () => { resetPlate(); plateInput.value = ''; flash(plateMsg, ''); Sound.play('menuMove', 0.4); });
  return make('section', 'cz-section cz-plate',
    make('h2', '', 'Number plate'),
    make('p', 'cz-note', 'A design is something you unlock; the text is yours. It goes on both ends where the car has room, and covers its own plate. Real size everywhere.'),
    make('h3', '', 'Design'), plateRow,
    make('h3', '', 'Your plate'),
    make('div', 'cz-textrow', plateInput, ok, plateChip), plateMsg,
    make('div', 'cz-foot', plateStatus, reset));
};

// ---- the PROP slots: Roof, Cargo, Wing (CHECKLIST 302; the choice and the dressing are render/propdress.js) ----
const PROP_TEXT = {
  roof: ['Roof prop', "A box, a sign or a beacon for the roof. It goes on every car with room for it, and covers the car's own roof ornament."],
  cargo: ['Cargo prop', "A load for the back: crates, a barrel or a tarp. It goes on every car with a load bed, and covers the car's own load."],
  wing: ['Rear wing', "A wing for the tail. It goes on every car with room for it, and covers the car's own wing."],
};
// the view the close-up of each slot takes: the car turned (rad), the camera's height (rad), and how wide the prop is shown (times its size)
const PROP_VIEW = { roof: { yaw: Math.PI - 0.7, lift: 0.5, wide: 2.6 }, cargo: { yaw: Math.PI - 0.7, lift: 0.45, wide: 2.6 }, wing: { yaw: Math.PI - 0.45, lift: 0.2, wide: 2.8 } };
const PREVIEW_POSE = { fov: 24, lift: 0.42, angle: 0.7, margin: 0.9 };
const previews = new Set(); // ids drawn
// each prop alone, once, into its chip's small box (the shared renderer; nothing if there is none: the chip keeps its name)
const drawPreviews = (slot) => requestAnimationFrame(() => {
  const renderer = sharedRenderer();
  if (!renderer || !state.open || openSlot !== slot) return;
  for (const box of propSecs[slot].row.querySelectorAll('.cz-prev[data-prop]')) {
    if (previews.has(box.dataset.prop) || !box.offsetWidth) continue;
    try { if (drawStill(renderer, box, buildProp(box.dataset.prop, propPaint(0xc9d3e6)), PREVIEW_POSE)) previews.add(box.dataset.prop); } catch { /* (no picture: the name stays) */ }
  }
});
const buildPropSection = (slot) => {
  const [title, note] = PROP_TEXT[slot];
  const row = make('div', 'cz-row cz-props');
  row.setAttribute('role', 'group'); row.setAttribute('aria-label', title);
  const pick = (id) => () => {
    if (!slotStatus(state.car, slot).ok) return;
    if (id !== 'none' && !owned(slot, id)) return flash(plateMsg, 'Locked: unlock it to wear it.');
    if (setProp(slot, id)) Sound.play('menuPick', 0.4);
  };
  const none = make('button', 'cz-chip cz-propchip');
  none.type = 'button'; none.dataset.prop = 'none';
  none.append(make('span', 'cz-prev stock'), make('span', 'cz-name', 'None'), make('span', 'cz-tick', '✓'));
  none.addEventListener('click', pick('none'));
  row.append(none);
  for (const p of PROPS[slot]) {
    const b = make('button', 'cz-chip cz-propchip');
    b.type = 'button'; b.dataset.prop = p.id;
    const prev = make('span', 'cz-prev'); prev.dataset.prop = p.id;
    b.append(prev, make('span', 'cz-name', p.name), make('span', 'cz-tick', '✓'));
    b.addEventListener('click', pick(p.id));
    row.append(b);
  }
  const paints = make('div', 'cz-row cz-paints');
  paints.setAttribute('role', 'group'); paints.setAttribute('aria-label', title + ' colour');
  for (const c of PROP_PAINTS) {
    const b = make('button', 'cz-paint');
    b.type = 'button'; b.dataset.paint = paintValueOf(c); b.title = c.name; b.setAttribute('aria-label', c.name);
    b.append(c.hex === null ? make('span', 'cz-dot match') : swatchOf('#' + c.hex.toString(16).padStart(6, '0')));
    b.firstChild.classList.add('cz-dot');
    b.addEventListener('click', () => { if (slotStatus(state.car, slot).ok && setPropPaint(slot, b.dataset.paint)) Sound.play('menuMove', 0.4); });
    paints.append(b);
  }
  const why = make('div', 'cz-why'); why.setAttribute('role', 'status');
  const stat = make('p', 'cz-status'); stat.setAttribute('aria-live', 'polite');
  const reset = make('button', 'cz-reset', 'Reset to stock'); reset.type = 'button';
  reset.addEventListener('click', () => { resetProp(slot); Sound.play('menuMove', 0.4); });
  const colourHead = make('h3', '', 'Colour');
  const node = make('section', 'cz-section cz-prop', make('h2', '', title), make('p', 'cz-note', note), why, make('h3', '', 'Choose'), row, colourHead, paints, make('div', 'cz-foot', stat, reset));
  propSecs[slot] = { node, row, paints, why, stat, none, reset };
  return node;
};
// everything the three prop slots show for the car on the stage: supported or greyed (with the reason), the choice ticked, the colour
// the one line a locked tab gives (a tap, the tooltip, the screen reader): the table's reason, or that the car is not audited yet
const lockReason = (slot) => {
  const st = slotStatus(state.car, slot), name = SLOTS.find(t => t.id === slot).name;
  return name + ' is locked: ' + (st.legend ? 'Legendary cars keep their own look.' : st.why ? st.why.charAt(0).toUpperCase() + st.why.slice(1) + '.' : 'Not available for this car yet.');
};
const lockIcon = () => { const i = make('span', 'cz-lock'); i.setAttribute('aria-hidden', 'true'); return i; };
const propShown = () => {
  const car = state.car;
  if (!car) return;
  if (propSlotNow() && !slotStatus(car, openSlot).ok) { flash(tabMsg, ''); openSection('wheels'); return; } // (the open tab is locked on this car: back to Wheels)
  const model = ShowroomView.model, own = model ? new Set(existingProps(model).map(e => e.slot)) : new Set();
  for (const slot of Object.keys(PROP_TEXT)) {
    const sec = propSecs[slot], st = slotStatus(car, slot), worn = shownProp(slot), chosen = propChoice(slot), paint = propPaintChoice(slot);
    sec.node.classList.toggle('unsupported', !st.ok);
    sec.why.hidden = st.ok;
    sec.why.replaceChildren(...(st.ok ? [] : [make('strong', '', st.legend ? 'Not available for this car' : 'Not available for this car yet'), ...(st.why ? [make('span', '', st.why.charAt(0).toUpperCase() + st.why.slice(1) + '.')] : [])]));
    for (const b of sec.row.children) {
      const id = b.dataset.prop, on = id === chosen && (id === 'none' || owned(slot, id));
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on && st.ok);
      b.classList.toggle('locked', !st.ok || (id !== 'none' && !owned(slot, id)));
      b.setAttribute('aria-disabled', String(!st.ok));
    }
    sec.none.querySelector('.cz-name').textContent = own.has(slot) ? 'Stock' : 'None';
    for (const b of sec.paints.children) {
      const on = b.dataset.paint === paint;
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on && st.ok); b.classList.toggle('locked', !st.ok);
    }
    const prop = worn !== 'none' ? propById(worn) : null;
    sec.stat.textContent = !st.ok ? '' : prop ? prop.name + ' (' + (PROP_PAINTS.find(c => paintValueOf(c) === paint)?.name || '#' + paint) + ')' : own.has(slot) ? "Stock: the car's own is kept" : 'Nothing on';
    sec.reset.disabled = !st.ok;
    const tab = [...slotList.children].find(t => t.dataset.slot === slot);
    if (tab) {
      tab.classList.toggle('na', !st.ok); tab.classList.toggle('locked', !st.ok);
      tab.setAttribute('aria-disabled', String(!st.ok));
      tab.title = st.ok ? '' : lockReason(slot);
      tab.setAttribute('aria-label', st.ok ? SLOTS.find(t => t.id === slot).name : lockReason(slot));
      tab.querySelector('.cz-lockline').replaceChildren(...(st.ok ? [] : [lockIcon(), document.createTextNode('Locked')]));
    }
  }
  const ps = propSlotNow();
  if (viewBtns) { viewBtns[4].hidden = !ps; if (ps) { viewBtns[4].textContent = SLOTS.find(t => t.id === ps).name + ' close-up'; viewBtns[4].disabled = !slotStatus(car, ps).ok; } }
  if (state.close && state.prop && state.prop === ps) setCloseUp(true, null, ps); // (the shape changed: the camera follows)
};
const propSlotNow = () => (SLOTS.find(s => s.id === openSlot)?.prop ? openSlot : null);
// where the close-up of a slot looks: the slot's centre on this car (its box, or the worn cylinder prop's), as wide as the prop with the car around it
const focusOf = (slot) => {
  const car = state.car, s = car && propSlots(car.id)[slot];
  if (!s || !s.supported) return null;
  const prop = propById(shownProp(slot)), sh = prop && prop.shape === 'cylinder' ? s.cylinder : s.box, v = PROP_VIEW[slot];
  return { at: sh.centre.slice(), span: Math.max(...(sh.size || [sh.radius * 2, sh.height, sh.radius * 2])) * v.wide, yaw: v.yaw, lift: v.lift };
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
  const endView = (name, end) => { const b = make('button', 'cz-view', name); b.type = 'button'; b.dataset.end = end; b.addEventListener('click', () => setCloseUp(true, end)); return b; };
  const propView = () => { const b = make('button', 'cz-view', 'Close-up'); b.type = 'button'; b.hidden = true; b.addEventListener('click', () => { const ps = propSlotNow(); if (ps) setCloseUp(true, null, ps); }); return b; };
  viewBtns = [view('Whole car', false), view('Wheels close-up', true), endView('Rear plate', 'rear'), endView('Front plate', 'front'), propView()];
  const stageBox = make('div', 'cz-stage', stage, make('div', 'cz-views', ...viewBtns), make('p', 'cz-hint', 'Drag to turn the car'));
  // the slots
  slotList = make('div', 'cz-slots');
  slotList.setAttribute('role', 'tablist');
  slotList.setAttribute('aria-label', 'Cosmetic slots');
  for (const slot of SLOTS) {
    const b = make('button', 'cz-slot' + (slot.live ? (slot.id === 'wheels' ? ' on' : '') : ' later'), make('span', '', slot.name), slot.live ? null : make('small', '', 'Coming later'));
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(slot.id === 'wheels'));
    if (!slot.live) b.setAttribute('aria-disabled', 'true'); // (greyed: nothing behind it yet; it is skipped by the keys)
    b.dataset.slot = slot.id;
    if (slot.prop) b.append(make('small', 'cz-lockline'));
    if (slot.live) b.addEventListener('click', () => { if (slot.prop && !slotStatus(state.car, slot.id).ok) flash(tabMsg, lockReason(slot.id)); else { flash(tabMsg, ''); openSection(slot.id); } });
    slotList.append(b);
  }
  // the Wheels section
  setRow = make('div', 'cz-row cz-sets');
  setRow.setAttribute('role', 'group');
  setRow.setAttribute('aria-label', 'Wheel set: a complete wheel, tyre and hub, for every car');
  for (const w of WHEEL_SETS) {
    const d = WHEEL_DESIGNS.find(x => x.id === w.design), c = WHEEL_COLOURS.find(x => x.id === w.hub);
    const tyre = hexOf(d.tyre, '1b1b1d'), ring = d.ring ? hexOf(d.ring.hex) : tyre, hub = hexOf(c.hex !== null ? c.hex : d.hub, '9aa3b2'); // (a hub colour wins over the design's hub)
    setRow.append(chip('set', w.id, w.name, swatchOf('radial-gradient(circle,' + hub + ' 0 30%,' + tyre + ' 30% 46%,' + ring + ' 46% 66%,' + tyre + ' 66%)'), setWheelSet));
  }
  customChip = make('div', 'cz-chip equipped custom', swatchOf(null, true), make('span', 'cz-name', 'Custom'), make('span', 'cz-tick', '✓'));
  customChip.hidden = true;
  customChip.title = 'Your wheels are a mix that is not one of the sets';
  status = make('p', 'cz-status');
  status.setAttribute('aria-live', 'polite');
  const reset = make('button', 'cz-reset', 'Reset to stock');
  reset.type = 'button';
  reset.addEventListener('click', () => { setWheelSet('stock'); Sound.play('menuMove', 0.4); });
  const wheels = make('section', 'cz-section',
    make('h2', '', 'Wheels'),
    make('p', 'cz-note', 'A wheel set is a tyre and rim together. It applies to every car you drive, in the garage and on the road.'),
    setRow, customChip,
    make('div', 'cz-foot', status, reset));
  tabMsg = make('p', 'cz-tabmsg'); tabMsg.setAttribute('role', 'status');
  sections = { wheels, plate: buildPlate(), roof: buildPropSection('roof'), cargo: buildPropSection('cargo'), wing: buildPropSection('wing') };
  root.replaceChildren(make('div', 'cz-backdrop'), top, stageBox, make('div', 'cz-panel', slotList, tabMsg, wheels, sections.plate, sections.roof, sections.cargo, sections.wing));
  openSection('wheels');
  onWheelColour(shown);
  onPlate(() => { if (state.open) plateShown(); });
  onProp(() => { if (state.open) propShown(); });
  setCloseUp(false);
};
const setCloseUp = (on, end = null, slot = null) => {
  const focus = on && slot ? focusOf(slot) : null;
  if (on && slot && !focus) { on = false; slot = null; } // (a slot this car cannot wear has nothing to look at)
  state.close = on;
  state.end = on ? end : null;
  state.prop = on ? slot : null;
  ShowroomView.closeUp(on, end, focus);
  viewBtns[0].setAttribute('aria-pressed', String(!on));
  viewBtns[1].setAttribute('aria-pressed', String(on && !end && !slot));
  viewBtns[4].setAttribute('aria-pressed', String(on && !!slot));
  viewBtns[2].setAttribute('aria-pressed', String(on && end === 'rear'));
  viewBtns[3].setAttribute('aria-pressed', String(on && end === 'front'));
};
// the slot whose choices are shown: the Wheels' or the Number plate's (the views that fit it show at the top of the car)
const openSection = (id) => {
  openSlot = id;
  for (const [key, node] of Object.entries(sections)) node.hidden = key !== id;
  for (const b of slotList.children) { const on = b.dataset.slot === id; b.classList.toggle('on', on && !b.classList.contains('later')); b.setAttribute('aria-selected', String(on)); }
  viewBtns[1].hidden = id !== 'wheels'; viewBtns[2].hidden = viewBtns[3].hidden = id !== 'plate';
  const keep = state.close && (id === 'plate' ? !!state.end : id === 'wheels' ? !state.end && !state.prop : state.prop === id);
  if (state.close && !keep) setCloseUp(false);
  if (id === 'plate') plateShown();
  if (propSlotNow()) { propShown(); drawPreviews(id); }
  else viewBtns[4].hidden = true;
};

// arrows: along a row, or to the nearest choice above / below
const choices = () => [...root.querySelectorAll('button.cz-chip:not(.locked), .cz-paint:not(.locked), .cz-reset:not(:disabled), .cz-view:not(:disabled), .cz-back')].filter(el => el.offsetParent !== null);
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
  if (e.target === plateInput && e.code !== 'Escape') return; // (typing in the plate field: the field keeps its keys, arrows included)
  const key = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
  if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); Cosmetics.close(); }
  else if (key) { e.preventDefault(); e.stopImmediatePropagation(); move(...key); }
}, true);

const showCar = () => {
  const car = state.car;
  carName.textContent = 'On your ' + car.name;
  if (!ShowroomView.show(stage, car, { evil: state.evil })) requestAnimationFrame(() => { if (state.open) stillCar(stage, car, state.evil); }); // (no WebGL: its picture)
  if (built) { plateShown(); propShown(); }
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
    const q = new URLSearchParams(location.search), cu = q.get('closeup');
    if (SLOTS.some(s => s.live && s.id === q.get('slot'))) openSlot = q.get('slot'); // (?slot=plate|roof|cargo|wing&closeup=rear|front|1: for a picture)
    const propSlot = SLOTS.find(s => s.prop && s.id === openSlot);
    setCloseUp(cu !== null, cu === 'rear' || cu === 'front' ? cu : null, propSlot && cu !== null && cu !== 'rear' && cu !== 'front' ? propSlot.id : null);
    shown();
    openSection(openSlot);
    showCar();
    if (q.get('platetype') !== null) { plateInput.value = q.get('platetype'); plateInput.dispatchEvent(new Event('input')); commitText(); } // (?platetype=TEXT: types it and confirms, for a picture of the filter's message)
    requestAnimationFrame(() => (root.querySelector('.cz-row .cz-chip.equipped') || closeBtn)?.focus({ preventScroll: true }));
  },
  close() {
    if (!state.open) return;
    const done = state.onClose;
    if (plateInput && document.activeElement === plateInput) plateInput.blur();
    previewPlateText(null);
    state.open = false;
    root.classList.add('hidden');
    Nav.leave('cosmetics');
    ShowroomView.stop(); // (the live car let go; whoever opened this draws theirs again)
    Game.inMenu = state.inMenu;
    done?.();
  },
  // for a check or a picture
  get shown() { return { props: { roof: shownProp('roof'), cargo: shownProp('cargo'), wing: shownProp('wing') }, prop: state.prop || null, plate: shownDesign(), plateText: plateText(), openSlot, end: state.end || null, open: state.open, car: state.car?.id || null, closeUp: state.close, design: wheelDesign(), colour: wheelColour(), set: wheelSet(), view: ShowroomView.state }; },
  closeUp: setCloseUp,
};
// the live car is drawn while this screen is up
ShowroomView.also(() => state.open && !root.classList.contains('hidden'));
