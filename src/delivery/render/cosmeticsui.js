// ---- the COSMETICS screen: where the equippable cosmetics are chosen, on the player's own car, live (the owner, 14-Oct: "get an
// agent on the cosmetic equip UI"; CHECKLIST 276). A screen over whatever opened it: the showroom's full view (a "Cosmetics"
// button, and C) or the Options sheet (Wheels > "Customise wheels..."), and ?cosmetics for a picture. The car is the showroom's
// live view (render/showroomview.js: the menu's one renderer, turning on its floor, a drag turns it), and a choice applies to
// it at once (render/wheelcosmetic.js recolours every live car: no reload). "Wheels close-up" eases the same camera in to
// the wheels. The page never reloads and the start screen stays a menu.
// PER CAR (15-Oct, the owner: "change the customisation to be car specific now"): a choice is made for THE CAR ON SHOW ('This car', the
// default each time the screen opens) or for EVERY CAR without its own ('All cars': the default), a small switch over the tabs
// (render/loadoutstore.js keeps both). In 'This car', a slot the car has no choice of its own for shows the default's, marked 'from
// default'; the header marks a car whose look differs from the default ('Custom'), and two buttons beside the switch put the car back
// to the default ('Reset car') or make its look every car's ('Copy to all': cars with their own looks too, after a second tap).
// SLOTS: tabs over the panel, from the registry render/cosmeticslots.js (the owner, 16-Oct: a slot the car cannot wear, or one with nothing
// in it yet, has NO tab: nothing greyed, nothing 'coming later'). WHEELS (one row of wheel SETS, each a tyre + hub; 'Custom' shows when the
// saved pair is no set), Plate, Roof / Cargo / Wing (where the car has the slot), and the dormant Decal, Glow and Kill FX (their tabs appear
// when their items are registered: see that file's head). The open tab falls back to the first one drawn when this car has no tab for it.
// A 'player' slot (Kill FX) hides the 'This car / All cars' switch and the car's buttons. EVERYTHING IS FREE AND OPEN for now: `owned` is
// the one place the unlock check goes (a chip it says no to is shown locked and cannot be equipped).
// Keys: arrows move between the choices (left / right along a row, up / down between rows), Enter or Space equips the one
// focused, Escape goes back. Touch: every choice is at least 44 px tall. Storage and the test switches are wheelcosmetic.js's.
import '../cosmetics.css';
import { WHEEL_COLOURS, WHEEL_DESIGNS, WHEEL_SETS, wheelColour, wheelDesign, wheelSet, wheelRim, setWheelSet, onWheelColour } from './wheelcosmetic.js';
import { rimStatus } from './rims.js';
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
import { onLoadout } from './loadout.js';
import * as Store from './loadoutstore.js'; // (per car over a default: the switch, the marks, Reset car, Copy to all)
import { carInUse, CARS } from '../cars.js';
import { Game } from '../game.js';
import { ownsCosmetic } from './cosmetics.js';
import { Nav } from '../nav.js';
import { Sound } from './audio.js';
import { SLOT_LIST, slotById, shownSlots, tabToOpen, isDemo } from './cosmeticslots.js';

// the slots, in order (the registry: a later cosmetic registers there and its tab appears by itself)
export const SLOTS = SLOT_LIST;
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

let built = false, panelBox, scopeBar, tabs = {}, panels = {}, stage, carName, customMark, scopeBtns, resetCarBtn, copyBtn, copyArmed = 0, status, slotList, setRow, customChip, closeBtn, viewBtns, sections = {}, propSecs = {}, tabMsg, plateRow, plateInput, plateMsg, plateStatus, plateChip, openSlot = 'wheels';
let state = { open: false, car: null, evil: false, onClose: null, inMenu: false, close: false, scope: 'car' };
// whose choice the screen shows and changes: the car on show ('This car') or the default ('All cars')
const cid = () => (state.scope === 'car' && state.car ? state.car.id : null);
const tgt = cid;
// the small tag by a section's title: 'from default' when this car has no choice of its own for the slot; in 'All cars', that this car keeps its own
const tags = {};
const tagFor = (slot) => { const t = make('span', 'cz-tag'); tags[slot] = t; return t; };
const tagShown = () => {
  const car = state.car;
  if (!car) return;
  for (const [slot, t] of Object.entries(tags)) {
    const own = Store.hasOwn(car.id, slot);
    t.textContent = state.scope === 'car' ? (own ? '' : 'from default') : (own && Store.differs(car.id, slot) ? 'not on this car' : '');
    t.title = state.scope === 'car' ? (own ? '' : 'The same as All cars') : (t.textContent ? 'This car has its own' : '');
    t.hidden = !t.textContent;
  }
};

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
  const id = wheelSet(cid()), set = WHEEL_SETS.find(x => x.id === id);
  for (const b of setRow.children) { const on = b.dataset.set === id; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on); b.classList.toggle('locked', !owned('wheels', b.dataset.set)); }
  customChip.hidden = id !== 'custom'; // (the equipped state when the saved pair is no set: shown, ticked, not pressable)
  status.textContent = 'Wheels: ' + (set ? set.name : 'Custom (a mix that is not one of the sets)') + (wheelRim(cid()) !== 'none' && state.scope === 'car' && ShowroomView.model && rimStatus(ShowroomView.model) !== 'ok' ? '. No rims for this car' : '');
};
// a rim set's chip: the rim itself, drawn small (the tyre, the dish, the spokes or blades, the cap)
const miniRim = (rim, hub, tyre, ring) => {
  const c = make('canvas', 'cz-swatch cz-rim'); c.width = c.height = 48;
  const g = c.getContext('2d');
  if (!g) return c;
  const R = 24, disc = (r, fill) => { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); };
  const blade = (a, r0, r1, w0, w1, sweep = 0) => { g.save(); g.rotate(a); g.beginPath(); g.moveTo(-w0, -r0); g.quadraticCurveTo(-w1 - sweep, -(r0 + r1) / 2, -w1 - sweep, -r1); g.lineTo(w1 - sweep, -r1); g.quadraticCurveTo(w1, -(r0 + r1) / 2, w0, -r0); g.closePath(); g.fill(); g.restore(); };
  g.translate(R, R);
  disc(R, tyre);
  if (ring !== tyre) { disc(R * 0.92, ring); disc(R * 0.85, tyre); }
  disc(R * 0.8, hub); disc(R * 0.7, '#202226');
  g.fillStyle = hub;
  const T = Math.PI * 2;
  if (rim === 'spoke5') for (let i = 0; i < 5; i++) blade(i * T / 5, 3, R * 0.72, 3, 2);
  if (rim === 'twin10') for (let i = 0; i < 5; i++) for (const s of [-0.14, 0.14]) blade(i * T / 5 + s, 3, R * 0.72, 1, 1);
  if (rim === 'turbine') for (let i = 0; i < 10; i++) blade(i * T / 10, 4, R * 0.72, 1.5, 3, 2);
  if (rim === 'blade3') for (let i = 0; i < 3; i++) blade(i * T / 3, 2, R * 0.78, 4, 2, 4);
  if (rim === 'twinspin') { disc(R * 0.5, hub); for (let i = 0; i < 2; i++) blade(i * Math.PI, R * 0.4, R * 0.78, 3.5, 2); g.fillStyle = '#202226'; g.beginPath(); g.arc(R * 0.3, 0, 2.6, 0, T); g.fill(); g.fillStyle = hub; }
  disc(R * 0.17, hub);
  return c;
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
  const id = plateDesign(cid()), text = plateText(cid()), worn = shownDesign(cid());
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
  const r = setPlateText(plateInput.value, tgt());
  plateInput.value = r.ok ? r.text : '';
  flash(plateMsg, r.reason === 'blocked' ? 'That plate is not allowed, so it shows ' + DEFAULT_TEXT + ' instead.' : r.reason === 'empty' ? 'Empty: it shows ' + DEFAULT_TEXT + '.' : 'Plate saved.');
  if (r.reason) plateInput.value = '';
};
// the field shows the saved text of whoever is being changed (empty: the default text, as its placeholder)
const syncPlateInput = () => { if (plateInput && document.activeElement !== plateInput) { const t = plateText(cid()); plateInput.value = t === DEFAULT_TEXT ? '' : t; } };
const buildPlate = () => {
  plateRow = make('div', 'cz-row cz-plates');
  plateRow.setAttribute('role', 'group');
  plateRow.setAttribute('aria-label', 'Plate design');
  for (const d of PLATE_DESIGNS) plateRow.append(chip('plate', d.id, d.name, miniPlate(d.id, plateText()), (id) => { if (setPlateDesign(id, tgt())) flash(plateMsg, ''); }, 'plate'));
  plateInput = make('input', 'cz-text');
  plateInput.type = 'text'; plateInput.maxLength = MAX_LEN; plateInput.placeholder = DEFAULT_TEXT; syncPlateInput();
  plateInput.setAttribute('autocapitalize', 'characters'); plateInput.setAttribute('autocomplete', 'off'); plateInput.setAttribute('autocorrect', 'off'); plateInput.setAttribute('spellcheck', 'false');
  plateInput.setAttribute('enterkeyhint', 'done'); plateInput.setAttribute('aria-label', 'Your plate text: up to ' + MAX_LEN + ' letters, numbers, spaces or dashes');
  plateInput.addEventListener('input', () => {
    if (plateInput.dataset.composing) return;
    const clean = sanitizePlateText(plateInput.value);
    if (clean !== plateInput.value.toUpperCase()) flash(plateMsg, 'Letters, numbers, space and dash only.'); else flash(plateMsg, '');
    plateInput.value = clean;
    previewPlateText(clean.trim() ? clean : null, tgt());
  });
  plateInput.addEventListener('compositionstart', () => { plateInput.dataset.composing = '1'; });
  plateInput.addEventListener('compositionend', () => { delete plateInput.dataset.composing; plateInput.dispatchEvent(new Event('input')); });
  // the field's keys stay in the field: nothing reaches the menu's or the game's own key handling
  for (const type of ['keydown', 'keyup', 'keypress']) plateInput.addEventListener(type, (e) => {
    if (type === 'keydown' && e.key === 'Enter') { e.preventDefault(); commitText(); plateInput.blur(); }
    if (type === 'keydown' && e.key === 'Escape') { previewPlateText(null); syncPlateInput(); return; } // (the screen's own Escape then closes it)
    e.stopPropagation();
  });
  plateInput.addEventListener('blur', () => { if (state.open && plateInput.value.trim()) commitText(); else previewPlateText(null); });
  const ok = make('button', 'cz-ok', 'OK'); ok.type = 'button'; ok.addEventListener('click', () => { commitText(); Sound.play('menuPick', 0.4); });
  plateMsg = make('p', 'cz-msg'); plateMsg.setAttribute('aria-live', 'polite');
  plateChip = make('div', 'cz-plate-chip');
  plateStatus = make('p', 'cz-status'); plateStatus.setAttribute('aria-live', 'polite');
  const reset = make('button', 'cz-reset', 'Reset to stock'); reset.type = 'button';
  reset.addEventListener('click', () => { resetPlate(tgt()); syncPlateInput(); flash(plateMsg, ''); Sound.play('menuMove', 0.4); });
  return make('section', 'cz-section cz-plate',
    make('h2', '', 'Number plate', tagFor('plate')),
    make('p', 'cz-note', 'A design is something you unlock; the text is yours. It goes on both ends where the car has room.'),
    make('h3', '', 'Design'), plateRow,
    make('h3', '', 'Your plate'),
    make('div', 'cz-textrow', plateInput, ok, plateChip), plateMsg,
    make('div', 'cz-foot', plateStatus, reset));
};

// ---- the PROP slots: Roof, Cargo, Wing (CHECKLIST 302; the choice and the dressing are render/propdress.js) ----
const PROP_IDS = ['roof', 'cargo', 'wing'];
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
  const title = slotById(slot).name;
  const row = make('div', 'cz-row cz-props');
  row.setAttribute('role', 'group'); row.setAttribute('aria-label', title);
  const pick = (id) => () => {
    if (!slotStatus(state.car, slot).ok) return;
    if (id !== 'none' && !owned(slot, id)) return flash(plateMsg, 'Locked: unlock it to wear it.');
    if (setProp(slot, id, tgt())) Sound.play('menuPick', 0.4);
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
    b.addEventListener('click', () => { if (slotStatus(state.car, slot).ok && propById(shownProp(slot, cid()))?.colourFrom !== 'fixed' && setPropPaint(slot, b.dataset.paint, tgt())) Sound.play('menuMove', 0.4); });
    paints.append(b);
  }
  const stat = make('p', 'cz-status'); stat.setAttribute('aria-live', 'polite');
  const reset = make('button', 'cz-reset', 'Reset to stock'); reset.type = 'button';
  reset.addEventListener('click', () => { resetProp(slot, tgt()); Sound.play('menuMove', 0.4); });
  const colourHead = make('h3', '', 'Colour');
  const node = make('section', 'cz-section cz-prop', make('h2', '', title, tagFor(slot)), make('h3', '', 'Choose'), row, colourHead, paints, make('div', 'cz-foot', stat, reset));
  propSecs[slot] = { node, row, paints, stat, none, reset };
  return node;
};
// everything the three prop slots show for the car on the stage: the choice ticked, the colour (a slot the car cannot wear has no tab, so
// its panel is never open; its chips are still made inert, should one be reached)
const propShown = () => {
  const car = state.car;
  if (!car) return;
  const model = ShowroomView.model, own = model ? new Set(existingProps(model).map(e => e.slot)) : new Set();
  for (const slot of PROP_IDS) {
    const sec = propSecs[slot], st = slotStatus(car, slot), worn = shownProp(slot, cid()), chosen = propChoice(slot, cid()), paint = propPaintChoice(slot, cid());
    sec.node.classList.toggle('unsupported', !st.ok);
    for (const b of sec.row.children) {
      const id = b.dataset.prop, on = id === chosen && (id === 'none' || owned(slot, id));
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on && st.ok);
      b.classList.toggle('locked', !st.ok || (id !== 'none' && !owned(slot, id)));
      b.setAttribute('aria-disabled', String(!st.ok));
    }
    sec.none.querySelector('.cz-name').textContent = own.has(slot) ? 'Stock' : 'None';
    const prop = worn !== 'none' ? propById(worn) : null;
    const fixedColours = !!prop && prop.colourFrom === 'fixed'; // (a prop with colours of its own, such as the hay or the cactus: the swatches do nothing)
    for (const b of sec.paints.children) {
      const on = b.dataset.paint === paint;
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('equipped', on && st.ok && !fixedColours); b.classList.toggle('locked', !st.ok || fixedColours);
    }
    sec.paints.title = fixedColours ? 'This one keeps its own colours' : '';
    sec.stat.textContent = !st.ok ? '' : prop ? prop.name + ' (' + (PROP_PAINTS.find(c => paintValueOf(c) === paint)?.name || '#' + paint) + ')' : own.has(slot) ? "Stock: the car's own is kept" : 'Nothing on';
    sec.reset.disabled = !st.ok;
  }
  const ps = propSlotNow();
  if (viewBtns) { viewBtns[4].hidden = !ps; if (ps) { viewBtns[4].textContent = slotById(ps).label + ' close-up'; viewBtns[4].disabled = !slotStatus(car, ps).ok; } }
  if (state.close && state.prop && state.prop === ps) setCloseUp(true, null, ps); // (the shape changed: the camera follows)
};
const propSlotNow = () => (slotById(openSlot)?.prop ? openSlot : null);

// ---- a slot with no panel of its own (Decal, Glow, Kill FX until their work lands; the ?cosmetics=all samples): its items as chips.
// The slot's pick(id, target) and chosen(target) keep the choice (target: the car's id, or null for all cars / the player); without them
// (the samples) a tap ticks the chip for the visit and stores nothing.
const chipPanel = (slot) => {
  const row = make('div', 'cz-row cz-props');
  row.setAttribute('role', 'group'); row.setAttribute('aria-label', slot.name);
  let local = 'none';
  const target = () => (slot.scope === 'player' ? null : tgt());
  const refresh = () => {
    const on = slot.chosen ? slot.chosen(target()) : local;
    for (const b of row.children) { const eq = b.dataset.item === on; b.setAttribute('aria-pressed', String(eq)); b.classList.toggle('equipped', eq); b.classList.toggle('locked', b.dataset.item !== 'none' && !b.dataset.sample && !owned(slot.id, b.dataset.item)); }
  };
  const add = (id, name, sample, swatch) => {
    const b = make('button', 'cz-chip cz-propchip');
    b.type = 'button'; b.dataset.item = id; if (sample) b.dataset.sample = '1';
    const prev = make('span', 'cz-prev' + (id === 'none' ? ' stock' : swatch ? ' cz-swatchprev' : ' cz-sample'));
    if (swatch) prev.style.background = swatch; // (an item's own swatch: a CSS background, e.g. an underglow's colour)
    b.append(prev, make('span', 'cz-name', name), make('span', 'cz-tick', '✓'));
    b.addEventListener('click', () => {
      if (b.classList.contains('locked')) return;
      if (slot.pick) { if (slot.pick(id, target()) === false) return; } else local = id;
      Sound.play('menuPick', 0.4); refresh();
    });
    row.append(b);
  };
  add('none', 'None');
  const items = slot.items();
  for (const it of items) add(it.id, it.name, it.sample, it.swatch);
  const node = make('section', 'cz-section cz-prop', make('h2', '', slot.name), items.every(it => it.sample) ? make('p', 'cz-note', 'Demo: samples only, nothing is worn.') : null, row);
  return { node, refresh };
};
// a slot's panel: the built-in ones (made in build), the slot's own panel(ctx), or the chip list; made the first time its tab opens
const panelOf = (id) => {
  if (panels[id]) return panels[id];
  const slot = slotById(id);
  if (!slot) return null;
  const ctx = { make, car: () => state.car, target: () => (slot.scope === 'player' ? null : tgt()), flash: (text) => flash(tabMsg, text) };
  const own = slot.panel ? slot.panel(ctx) : null;
  const p = own ? { node: own, refresh: () => slot.refresh?.(ctx) } : chipPanel(slot);
  p.node.classList.add('cz-section');
  panels[id] = p; sections[id] = p.node;
  panelBox.append(p.node);
  return p;
};
// the tabs this car has, in the registry's order; the open one kept, or the first drawn (Wheels) when this car has no tab for it
const tabFor = (slot) => {
  if (tabs[slot.id]) return tabs[slot.id];
  const b = make('button', 'cz-slot', make('span', 'cz-label', slot.label), make('i', 'cz-own'));
  b.type = 'button';
  b.setAttribute('role', 'tab');
  b.setAttribute('aria-label', slot.name);
  b.dataset.slot = slot.id;
  b.addEventListener('click', () => { flash(tabMsg, ''); openSection(slot.id); });
  return (tabs[slot.id] = b);
};
const renderTabs = () => {
  const list = shownSlots(state.car);
  slotList.replaceChildren(...list.map(tabFor));
  const n = Math.max(1, list.length); // (a desktop: one row; a phone: one row up to five, else two even rows)
  slotList.style.setProperty('--cz-n', String(n));
  slotList.style.setProperty('--cz-cols', String(n <= 5 ? n : Math.ceil(n / 2)));
  return tabToOpen(list, openSlot);
};

// where the close-up of a slot looks: the slot's centre on this car (its box, or the worn cylinder prop's), as wide as the prop with the car around it
const focusOf = (slot) => {
  const car = state.car, s = car && propSlots(car.id)[slot];
  if (!s || !s.supported) return null;
  const prop = propById(shownProp(slot, car.id)), sh = prop && prop.shape === 'cylinder' ? s.cylinder : s.box, v = PROP_VIEW[slot];
  return { at: sh.centre.slice(), span: Math.max(...(sh.size || [sh.radius * 2, sh.height, sh.radius * 2])) * v.wide, yaw: v.yaw, lift: v.lift };
};

const build = () => {
  built = true;
  const back = make('button', 'cz-back', make('span', '', '‹'), make('span', '', 'Back'));
  back.type = 'button';
  back.title = 'Back (Escape)';
  back.addEventListener('click', () => Cosmetics.close());
  closeBtn = back;
  carName = make('span', '');
  customMark = make('span', 'cz-custom', 'Custom');
  customMark.title = 'This car differs from All cars';
  const top = make('div', 'cz-top', back, make('div', 'cz-title', make('h1', '', 'Cosmetics'), make('p', 'cz-sub', carName, customMark)));
  // whose look is changed: the car on show, or every car (the default); and the car's two actions
  const seg = (name, scope) => { const b = make('button', 'cz-seg', name); b.type = 'button'; b.dataset.scope = scope; b.addEventListener('click', () => setScope(scope)); return b; };
  scopeBtns = [seg('This car', 'car'), seg('All cars', 'all')];
  const scopeSwitch = make('div', 'cz-scopes', ...scopeBtns);
  scopeSwitch.setAttribute('role', 'group'); scopeSwitch.setAttribute('aria-label', 'Change this car or all cars');
  resetCarBtn = make('button', 'cz-act', 'Reset car'); resetCarBtn.type = 'button';
  resetCarBtn.title = 'Back to the All cars look';
  resetCarBtn.addEventListener('click', () => { if (state.car && Store.resetCar(state.car.id)) { syncPlateInput(); Sound.play('menuMove', 0.4); } });
  copyBtn = make('button', 'cz-act', 'Copy to all'); copyBtn.type = 'button';
  copyBtn.title = "This car's look on every car";
  copyBtn.addEventListener('click', copyToAll);
  scopeBar = make('div', 'cz-scopebar', scopeSwitch, make('div', 'cz-acts', resetCarBtn, copyBtn));
  // the live car
  stage = make('div', 'cz-pic');
  stage.title = 'Drag to turn it';
  const view = (name, close) => { const b = make('button', 'cz-view', name); b.type = 'button'; b.addEventListener('click', () => setCloseUp(close)); return b; };
  const endView = (name, end) => { const b = make('button', 'cz-view', name); b.type = 'button'; b.dataset.end = end; b.addEventListener('click', () => setCloseUp(true, end)); return b; };
  const propView = () => { const b = make('button', 'cz-view', 'Close-up'); b.type = 'button'; b.hidden = true; b.addEventListener('click', () => { const ps = propSlotNow(); if (ps) setCloseUp(true, null, ps); }); return b; };
  viewBtns = [view('Whole car', false), view('Wheels close-up', true), endView('Rear plate', 'rear'), endView('Front plate', 'front'), propView()];
  const stageBox = make('div', 'cz-stage', stage, make('div', 'cz-views', ...viewBtns), make('p', 'cz-hint', 'Drag to turn the car'));
  // the slots (the tabs this car has: renderTabs)
  slotList = make('div', 'cz-slots');
  slotList.setAttribute('role', 'tablist');
  slotList.setAttribute('aria-label', 'Cosmetic slots');
  // the Wheels section
  setRow = make('div', 'cz-row cz-sets');
  setRow.setAttribute('role', 'group');
  setRow.setAttribute('aria-label', 'Wheel set: a complete wheel, tyre and hub');
  for (const w of WHEEL_SETS) {
    const d = WHEEL_DESIGNS.find(x => x.id === w.design), c = WHEEL_COLOURS.find(x => x.id === w.hub);
    const tyre = hexOf(d.tyre, '1b1b1d'), ring = d.ring ? hexOf(d.ring.hex) : tyre, hub = hexOf(c.hex !== null ? c.hex : d.hub, '9aa3b2'); // (a hub colour wins over the design's hub)
    setRow.append(chip('set', w.id, w.name, w.rim ? miniRim(w.rim, c.hex !== null || d.hub !== null ? hub : '#cfd3d9', tyre, ring) : swatchOf('radial-gradient(circle,' + hub + ' 0 30%,' + tyre + ' 30% 46%,' + ring + ' 46% 66%,' + tyre + ' 66%)'), (id) => setWheelSet(id, tgt())));
  }
  customChip = make('div', 'cz-chip equipped custom', swatchOf(null, true), make('span', 'cz-name', 'Custom'), make('span', 'cz-tick', '✓'));
  customChip.hidden = true;
  customChip.title = 'Your wheels are a mix that is not one of the sets';
  status = make('p', 'cz-status');
  status.setAttribute('aria-live', 'polite');
  const reset = make('button', 'cz-reset', 'Reset to stock');
  reset.type = 'button';
  reset.addEventListener('click', () => { setWheelSet('stock', tgt()); Sound.play('menuMove', 0.4); });
  const wheels = make('section', 'cz-section',
    make('h2', '', 'Wheels', tagFor('wheels')),
    make('p', 'cz-note', 'A wheel set is a tyre and rim together.'),
    setRow, customChip,
    make('div', 'cz-foot', status, reset));
  tabMsg = make('p', 'cz-tabmsg'); tabMsg.setAttribute('role', 'status');
  sections = { wheels, plate: buildPlate(), roof: buildPropSection('roof'), cargo: buildPropSection('cargo'), wing: buildPropSection('wing') };
  for (const id of Object.keys(sections)) panels[id] = { node: sections[id], refresh: () => {} };
  panelBox = make('div', 'cz-panel', scopeBar, slotList, tabMsg, wheels, sections.plate, sections.roof, sections.cargo, sections.wing);
  root.classList.toggle('cz-demo', isDemo());
  root.replaceChildren(make('div', 'cz-backdrop'), top, stageBox, panelBox);
  openSection('wheels');
  onWheelColour(shown);
  onPlate(() => { if (state.open) plateShown(); });
  onProp(() => { if (state.open) propShown(); });
  Store.onStore(() => { if (state.open) { shown(); plateShown(); propShown(); scopeShown(); panels[openSlot]?.refresh(); } }); // (a registry slot's panel too: its tick)
  onLoadout(() => { if (state.open && !ShowroomView.model) requestAnimationFrame(() => { if (state.open && !ShowroomView.model) stillCar(stage, state.car, state.evil); }); }); // (no WebGL: its picture drawn again in the new loadout, render/carstill.js)
  setCloseUp(false);
};
// the switch, the header's mark, the tabs' dots (a slot this car has its own of), the actions (only for 'This car')
const scopeShown = () => {
  const car = state.car;
  if (!car || !scopeBtns) return;
  for (const b of scopeBtns) b.setAttribute('aria-pressed', String(b.dataset.scope === state.scope));
  customMark.hidden = !Store.differs(car.id);
  for (const b of slotList.children) b.classList.toggle('own', !!b.dataset.slot && Store.differs(car.id, b.dataset.slot));
  resetCarBtn.parentNode.hidden = state.scope !== 'car';
  resetCarBtn.disabled = !Store.ownSlots(car.id).length;
  copyBtn.disabled = !Store.differs(car.id);
  if (copyArmed && performance.now() > copyArmed) { copyArmed = 0; copyBtn.textContent = 'Copy to all'; }
  tagShown();
};
const setScope = (scope) => {
  if (plateInput && document.activeElement === plateInput) plateInput.blur(); // (a text being typed is kept for whom it was typed)
  state.scope = scope === 'all' ? 'all' : 'car';
  copyArmed = 0; if (copyBtn) copyBtn.textContent = 'Copy to all';
  Sound.play('menuMove', 0.4);
  syncPlateInput(); shown(); plateShown(); propShown(); scopeShown(); panels[openSlot]?.refresh();
};
// this car's look on every car; when other cars have looks of their own, a second tap is asked for (their looks go too)
const copyToAll = () => {
  const car = state.car;
  if (!car) return;
  const others = Store.customCars().filter(id => id !== car.id).length;
  if (others && !(copyArmed && performance.now() <= copyArmed)) {
    copyArmed = performance.now() + 4000;
    copyBtn.textContent = 'Replace ' + others + (others === 1 ? ' car?' : ' cars?'); // (the other cars with looks of their own: a second tap replaces them too)
    copyBtn.title = 'Tap again: those cars lose their own look too';
    setTimeout(() => { if (copyArmed && performance.now() > copyArmed) scopeShown(); }, 4100);
    return;
  }
  copyArmed = 0; copyBtn.textContent = 'Copy to all'; copyBtn.title = "This car's look on every car";
  Store.copyToAll(car.id);
  flash(tabMsg, 'Copied to all cars.');
  Sound.play('menuPick', 0.4);
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
// the slot whose choices are shown (the views that fit it show at the top of the car; a 'player' slot hides the car / all cars switch)
const openSection = (id) => {
  const p = panelOf(id) || panelOf('wheels');
  if (!panels[id]) id = 'wheels';
  openSlot = id;
  for (const [key, node] of Object.entries(sections)) node.hidden = key !== id;
  for (const b of slotList.children) { const on = b.dataset.slot === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
  scopeBar.hidden = slotById(id)?.scope === 'player';
  p.refresh();
  viewBtns[1].hidden = id !== 'wheels'; viewBtns[2].hidden = viewBtns[3].hidden = id !== 'plate';
  const keep = state.close && (id === 'plate' ? !!state.end : id === 'wheels' ? !state.end && !state.prop : state.prop === id);
  if (state.close && !keep) setCloseUp(false);
  if (id === 'plate') plateShown();
  if (propSlotNow()) { propShown(); drawPreviews(id); }
  else viewBtns[4].hidden = true;
};

// arrows: along a row, or to the nearest choice above / below
const choices = () => [...root.querySelectorAll('button.cz-slot, button.cz-chip:not(.locked), .cz-paint:not(.locked), .cz-reset:not(:disabled), .cz-view:not(:disabled), .cz-back, .cz-seg, .cz-act:not(:disabled)')].filter(el => el.offsetParent !== null);
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
  syncPlateInput();
  if (!ShowroomView.show(stage, car, { evil: state.evil })) requestAnimationFrame(() => { if (state.open) stillCar(stage, car, state.evil); }); // (no WebGL: its picture)
  if (built) { const at = renderTabs(); if (at !== openSlot) openSection(at); shown(); plateShown(); propShown(); scopeShown(); panels[openSlot]?.refresh(); }
};

export const Cosmetics = {
  get isOpen() { return state.open; },
  // open over whatever is up. car: the car to show (default the car in use); evil: its side; onClose: called once it is shut
  open({ car = null, evil = !!Game.evil, onClose = null } = {}) {
    if (state.open || !root) return;
    if (!built) build();
    const use = car || carInUse();
    state = { open: true, car: use.silhouette || use.id === 'null-car' ? CARS.find(c => !c.silhouette) : use, evil, onClose, inMenu: Game.inMenu, close: false, scope: new URLSearchParams(location.search).get('scope') === 'all' ? 'all' : 'car' }; // (?scope=all: 'All cars', for a picture)
    Game.inMenu = true; // (the menu's keys leave it alone)
    root.classList.remove('hidden');
    root.classList.toggle('evil', evil);
    Nav.enter('cosmetics', () => this.close());
    const q = new URLSearchParams(location.search), cu = q.get('closeup');
    if (slotById(q.get('slot'))) openSlot = q.get('slot'); // (?slot=plate|roof|cargo|wing|...&closeup=rear|front|1: for a picture)
    openSlot = renderTabs(); // (this car has no tab for the slot last open: the first one drawn)
    const propSlot = slotById(openSlot)?.prop ? slotById(openSlot) : null;
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
  get shown() { const c = cid(); return { tabs: slotList ? [...slotList.children].map(b => b.dataset.slot) : [], scopeHidden: !!scopeBar?.hidden, scope: state.scope, custom: !!state.car && Store.differs(state.car.id), props: { roof: shownProp('roof', c), cargo: shownProp('cargo', c), wing: shownProp('wing', c) }, prop: state.prop || null, plate: shownDesign(c), plateText: plateText(c), openSlot, end: state.end || null, open: state.open, car: state.car?.id || null, closeUp: state.close, design: wheelDesign(c), colour: wheelColour(c), set: wheelSet(c), view: ShowroomView.state }; },
  scope: (scope) => setScope(scope),
  closeUp: setCloseUp,
};
// the live car is drawn while this screen is up
ShowroomView.also(() => state.open && !root.classList.contains('hidden'));
