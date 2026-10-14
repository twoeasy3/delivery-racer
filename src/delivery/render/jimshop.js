// ---- CRAZEY JIM'S BLUEPRINT STALL: the screen (CHECKLIST item 243; the rules are jimshop.js, the look jimshop.css) ----------------
// Reached from a doorway at the top of the Shop (jimDoor), or straight by ?jimshop. Over the Shop (z 31 against its 30), with
// its own back entry (Nav 'jimshop'), Escape closes it first. From the top: Back and the BANK (the tips, whole dollars: Jim
// takes no Crazey Cash), the red sign with bunting, a strip (New stock in 4h 12m / sold today 3 of 10), a note when there is
// something to say (everything sold, nothing affordable, the daily limit), then the OFFERS, two a row on a phone: each the car's
// own BLUEPRINT CARD (render/blueprintcard.js, the live still: carstill.js) at the bundle's size (x3), "You have 4 / 5 for ECU 2" with
// a bar (what you have, then what the bundle adds, striped), the yellow price board (the old price struck through on the hot
// deal), what is left, and a red BUY. A button that cannot be pressed says why (Need $120 more, Sold out, Maxed out, Jim's out for
// today). A dear bundle (jimshop.js JIM.confirmAt, or half the bank) asks first. A purchase: the card pops, the bank and the
// count run to their new figures, a toast says what you got ("+3 Hearse blueprints", "ECU 2 reached!").
// By address (for a look; nothing is saved):
//   ?jimshop                  open it (on the menu)
//   &demo[=name]              a made-up save: normal (default), expensive (the confirm up), soldout, broke, maxed, capped, empty (all sold),
//                             nopool (no cars), bought (a purchase just made, feedback held)
//   &jimcash=<n>              the bank for the visit        &jimpress=<n>   press BUY on offer n (0-based, as laid out)
//   &jimhold                  keep the toast up             &eventsnow=<date-time> sets the day (the rotation) and the clock
import '../jimshop.css';
import { Jim, JIM, stand, needed } from '../jimshop.js';
import { Progress } from '../progress.js';
import { Events } from '../events.js';
import { Nav } from '../nav.js';
import { Game } from '../game.js';
import { ask } from './dialog.js';
import { blueprintCard } from './blueprintcard.js';
import { stillsIn } from './carstill.js';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
const params = new URLSearchParams(location.search);
const dollars = (n) => '$' + Math.floor(n).toLocaleString('en-GB');
const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? h + 'h ' + m + 'm' : m + 'm ' + (s % 60) + 's';
};
const BUNTING = 18;

const screen = make('div', 'jim-screen hidden');
screen.id = 'jimScreen';
screen.setAttribute('role', 'dialog');
screen.setAttribute('aria-label', 'Crazey Jim\'s Blueprint Stall');
document.body.append(screen);

let isOpen = false, ticker = 0, wasInMenu = false, pics = null, toast = null, toastTimer = 0, tween = 0;
let poolOverride = null; // (?demo=nopool: a pool of no cars)
let bankNode = null;
const hold = params.get('jimhold') !== null;

// ---- one offer ------------------------------------------------------------------------------------------------------------
// anim: { id, from (the count before), bank (the bank before) }: the card of the offer just bought starts at the old figures and runs to the new
const offerCard = (v, anim) => {
  const off = !!v.why && v.why !== 'short';
  const now = stand(v.car), max = now.ecu >= now.max;
  const after = stand(v.car, v.why === null || v.why === 'short' ? v.qty : 0);
  const ups = after.ecu > now.ecu;
  const bought = anim && anim.id === v.id;
  const shown = bought ? anim.before : now; // (the figures the card begins on)
  // the bar and the line under the picture
  const fill = make('i', 'fill'), plus = make('i', 'plus');
  const setBar = (s) => { fill.style.width = (s.ecu >= s.max ? 100 : Math.round(s.have / s.toNext * 100)) + '%'; };
  setBar(shown);
  const preview = !max && !bought && (v.why === null || v.why === 'short') ? Math.min(100, Math.round((now.have + v.qty) / now.toNext * 100)) : 0;
  if (preview) { plus.style.left = fill.style.width; plus.style.width = Math.max(0, preview - parseInt(fill.style.width, 10)) + '%'; }
  const bar = make('div', 'jim-bar' + (max ? ' max' : ''), fill, preview ? plus : null);
  const count = make('b', '', String(max ? now.bp : shown.have));
  const target = now.ecu + 1;
  const line = max
    ? make('div', 'jim-have-line', make('span', '', 'You have ', count), make('em', '', 'MAX ECU'))
    : make('div', 'jim-have-line', make('span', '', 'You have ', count, ' / ' + now.toNext), make('em', '', now.ecu === 0 && v.car.evergreen ? 'to unlock' : 'to ECU ' + target));
  const gain = make('div', 'jim-gain', off || max ? '' : (ups ? (after.ecu >= after.max ? 'Reaches MAX ECU!' : (now.ecu === 0 && v.car.evergreen ? 'Unlocks the car!' : 'Reaches ECU ' + after.ecu + '!')) : '+' + v.qty + (v.cut === 'need' ? ' (all it needs)' : v.cut === 'cap' ? ' (Jim\'s limit)' : '')));
  if (bought && !max) { // (the count runs up to the new figure, the bar fills)
    requestAnimationFrame(() => requestAnimationFrame(() => setBar(now)));
    runCount(count, shown.have, now.have, now.ecu > shown.ecu ? now.toNext : null);
  }
  // the board
  const board = make('div', 'jim-board', v.was ? make('s', '', dollars(v.was)) : null, make('b', '', dollars(v.price)),
    null);
  const stock = v.why === 'maxed' ? make('div', 'jim-stock') : make('div', 'jim-stock' + (v.left <= 1 ? ' low' : ''), v.left === 0 ? 'None left today' : v.bought ? (v.left === 1 ? 'Last one' : v.left + ' left') + ' · price up' : v.left === 1 ? 'Last one today' : v.left + ' left today');
  // the button, and why it cannot be pressed
  const words = { maxed: 'Maxed out', sold: 'Sold out', cap: 'Limit reached', short: 'Need ' + dollars(v.need) + ' more' }[v.why];
  const button = make('button', 'jim-buy' + (v.why === 'short' ? ' short' : ''), v.why ? words : 'Buy ×' + v.qty);
  button.type = 'button';
  button.disabled = !!v.why;
  button.setAttribute('aria-label', v.why ? v.car.name + ' blueprints: ' + words : 'Buy ' + v.qty + ' ' + v.car.name + ' blueprint' + (v.qty > 1 ? 's' : '') + ' for ' + dollars(v.price));
  if (!v.why) button.addEventListener('click', () => buy(v.id));
  const { node, pic } = blueprintCard(v.car, { rarity: v.rarity, n: v.qty }, { pose: 'front' });
  pics?.watch(pic, v.car, { side: 'good' });
  const card = make('article', 'jim-offer r-' + v.rarity + (v.hot ? ' hot' : '') + (off ? ' off' : '') + (bought ? ' bought' : ''),
    v.hot && !off ? make('div', 'jim-hot', make('span', '', 'Hot'), make('span', '', 'deal'), make('b', '', '−' + Math.round(JIM.hotOff * 100) + '%')) : null,
    make('div', 'jim-art', node, v.why === 'sold' ? make('div', 'jim-stamp', 'Sold out') : v.why === 'maxed' ? make('div', 'jim-stamp max', 'Maxed') : null),
    make('div', 'jim-info', make('div', 'jim-have', line, bar, gain), board, stock, button));
  card.dataset.car = v.id;
  return card;
};
// a figure run from one number to another
const runCount = (node, from, to, wrapTo) => {
  const t0 = performance.now(), span = 650;
  const up = wrapTo ? [[from, wrapTo], [0, to]] : [[from, to]]; // (past an ECU: up to the full bar, then the new ECU's start)
  const total = up.reduce((n, [a, b]) => n + Math.abs(b - a), 0) || 1;
  const step = (t) => {
    let k = Math.min(1, (t - t0) / span), left = k * total, value = from;
    for (const [a, b] of up) { const d = Math.abs(b - a); if (left <= d) { value = a + Math.round((b > a ? 1 : -1) * left); break; } left -= d; value = b; }
    node.textContent = String(value);
    if (k < 1) tween = requestAnimationFrame(step);
  };
  cancelAnimationFrame(tween);
  tween = requestAnimationFrame(step);
};

// ---- the screen ------------------------------------------------------------------------------------------------------------
let last = null; // (the purchase just made: { id, before, bank } for the card and the bank to run from)
const draw = () => {
  const keep = screen.scrollTop;
  const offers = Jim.offers({ cars: poolOverride });
  const order = [...offers.filter(o => o.hot), ...offers.filter(o => !o.hot)];
  const today = Jim.today(), money = Math.floor(Progress.data.money);
  const back = make('button', 'jim-back', make('span', '', '‹'), 'Back');
  back.type = 'button';
  back.addEventListener('click', () => JimScreen.close());
  bankNode = make('b', '', dollars(last ? last.bank : money));
  if (last) animateBank(last.bank, money);
  const top = make('header', 'jim-top', back, make('div', 'jim-bank', make('small', '', 'Bank'), bankNode));
  const flags = make('div', 'jim-bunting', ...Array.from({ length: BUNTING }, () => make('i')));
  const sign = make('div', 'jim-sign', make('h1', '', 'Crazey Jim\'s', make('span', '', 'Blueprint Stall')), make('p', '', '100% genuine blueprints*'));
  const live = make('b', 'jim-count', clock(Jim.nextAt() - Events.now()));
  live.dataset.end = String(Jim.nextAt());
  const strip = make('div', 'jim-strip', make('div', 'jim-clock', 'New stock in', live),
    offers.length ? make('div', 'jim-limit', 'Sold today ', make('b', '', Math.min(today.bp, JIM.dayCap) + ' / ' + JIM.dayCap)) : null);
  // one note, the most useful
  const open = offers.filter(o => !o.why || o.why === 'short');
  const cheapest = open.length ? Math.min(...open.map(o => o.price)) : 0;
  let note = null;
  if (!offers.length) note = null;
  else if (offers.every(o => o.why === 'maxed' || o.why === 'sold')) note = make('p', 'jim-note', make('b', '', 'Jim\'s cleaned out!'), ' Everything is sold or maxed. New stock in ', live.cloneNode(true));
  else if (offers.every(o => o.why === 'maxed' || o.why === 'sold' || o.why === 'cap')) note = make('p', 'jim-note', make('b', '', 'Jim\'s daily limit: ' + JIM.dayCap + ' blueprints.'), ' He is shutting up shop. New stock in ', live.cloneNode(true));
  else if (open.length && open.every(o => o.why === 'short') && money < cheapest) note = make('p', 'jim-note', make('b', '', money < 1 ? 'Your bank is empty.' : 'Not enough in the bank.'), ' Jim only takes tips: deliver something, then come back.');
  const grid = offers.length
    ? make('section', 'jim-grid', ...order.map(o => offerCard(o, last)))
    : make('div', 'jim-empty', make('h2', '', 'Jim has nothing today'), make('p', '', 'No blueprints on the stall. New stock in ', live.cloneNode(true), '.'));
  const small = make('p', 'jim-small', '*Terms apply. Prices rise a little with every bundle of the same blueprint you buy today. Jim sells at most ' + JIM.dayCap + ' blueprints a day, and only for cars from the packs. Tips only, no refunds, no questions.');
  screen.replaceChildren(...[top, flags, sign, strip, note, grid, small].filter(Boolean));
  screen.scrollTop = keep;
  last = null;
};
// the bank running down (or up) to its new figure
const animateBank = (from, to) => {
  const node = bankNode, t0 = performance.now();
  node.parentNode?.classList.add('spent');
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 650);
    node.textContent = dollars(from + (to - from) * k);
    if (k < 1) requestAnimationFrame(step); else node.parentNode?.classList.remove('spent');
  };
  requestAnimationFrame(step);
};

const say = (title, sub) => {
  toast?.remove();
  clearTimeout(toastTimer);
  toast = make('div', 'jim-toast', make('b', '', title), sub ? make('small', '', sub) : null);
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  if (!hold) toastTimer = setTimeout(() => { const t = toast; t?.classList.add('gone'); setTimeout(() => t?.remove(), 300); }, 2600);
};

// ---- buying ----------------------------------------------------------------------------------------------------------------
const buy = async (id) => {
  const v = Jim.offers({ cars: poolOverride }).find(o => o.id === id);
  if (!v || v.why) { draw(); return; }
  const money = Math.floor(Progress.data.money);
  if (v.price >= JIM.confirmAt || v.price * 2 > money) { // (a dear bundle, or half the bank: ask first)
    const after = stand(v.car, v.qty), now = stand(v.car);
    const yes = await ask({ title: 'Buy ' + v.qty + ' ' + v.car.name + ' blueprint' + (v.qty > 1 ? 's' : '') + '?', ok: 'Pay ' + dollars(v.price),
      lines: ['Crazey Jim wants ' + dollars(v.price) + '. You will have ' + dollars(money - v.price) + ' left.',
        after.ecu > now.ecu ? 'It takes the ' + v.car.name + ' to ECU ' + after.ecu + '.' : 'You will have ' + (now.bp + v.qty) + ' of its blueprints.'] });
    if (!yes) return;
  }
  const done = Jim.buy(v.id, { cars: poolOverride });
  if (!done.ok) { draw(); return; }
  last = { id: v.id, before: done.before, bank: money };
  draw();
  screen.querySelector('.jim-offer.bought')?.scrollIntoView({ block: 'nearest' }); // (the card you bought from stays in view)
  const reached = done.after.ecu > done.before.ecu;
  say('+' + done.qty + ' ' + v.car.name + ' blueprint' + (done.qty > 1 ? 's' : ''),
    reached ? (done.after.ecu >= done.after.max ? 'MAX ECU reached!' : (done.before.ecu === 0 && v.car.evergreen ? 'Car unlocked!' : 'ECU ' + done.after.ecu + ' reached!')) : 'Paid ' + dollars(done.price));
};

// ---- opening and closing ---------------------------------------------------------------------------------------------------------
export const JimScreen = {
  get isOpen() { return isOpen; },
  open() {
    if (!isOpen) {
      isOpen = true;
      wasInMenu = Game.inMenu;
      Game.inMenu = true;
      Nav.enter('jimshop', () => this.close());
      document.documentElement.classList.add('jim-up');
      pics = stillsIn(screen);
      ticker = setInterval(() => { // (the clock, each second; the stock turning over, and the screen drawn again)
        for (const node of screen.querySelectorAll('.jim-count')) {
          const left = Number(node.dataset.end) - Events.now();
          if (left <= 0) { draw(); return; }
          node.textContent = clock(left);
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
    cancelAnimationFrame(tween);
    pics?.stop(); pics = null;
    Nav.leave('jimshop');
    Game.inMenu = wasInMenu;
    document.documentElement.classList.remove('jim-up');
    screen.classList.add('hidden');
    toast?.remove(); toast = null;
  },
};
window.addEventListener('keydown', (event) => { // (Escape closes Jim first; the Shop under it stays)
  if (!isOpen || event.key !== 'Escape') return;
  event.stopImmediatePropagation();
  JimScreen.close();
}, true);
for (const type of ['progresschange']) window.addEventListener(type, () => { if (isOpen && !last) draw(); });

// ---- the doorway on the Shop screen ------------------------------------------------------------------------------------------------
export const jimDoor = () => {
  const offers = Jim.offers();
  const open = offers.filter(o => !o.why || o.why === 'short').length;
  const door = make('button', 'jim-door',
    make('span', 'jim-door-flags', ...Array.from({ length: 6 }, () => make('i'))),
    make('span', 'jim-door-text', make('b', '', 'Crazey Jim\'s Blueprint Stall'),
      make('small', '', offers.length ? (open ? open + ' offer' + (open > 1 ? 's' : '') + ' today · pay in $' : 'Sold out today · new stock in ' + clock(Jim.nextAt() - Events.now())) : 'Nothing on the stall today')),
    make('span', 'jim-door-go', 'Visit'));
  door.type = 'button';
  door.setAttribute('aria-label', 'Crazey Jim\'s Blueprint Stall: blueprints for tip money');
  door.addEventListener('click', () => JimScreen.open());
  return door;
};

// ---- ?jimshop: by address (for a look or a picture), with a made-up save on ?demo -----------------------------------------------------------
const demo = (name) => {
  Progress.noSave = true;
  const data = Progress.data;
  data.money = 900; data.blueprints = {}; data.jimBuys = {}; data.maxed = ['commuter'];
  const offers = Jim.offers(), day = Jim.day(), buys = {};
  const sell = (o, n = o.stock) => { buys[o.id] = n; };
  const used = new Set(), pick = (test) => { const o = offers.find(x => !used.has(x.id) && test(x)) || offers.find(x => !used.has(x.id)); if (o) used.add(o.id); return o; };
  const base = () => { // (one two short of an ECU with a bundle that crosses it, one part way, one with a bundle already bought)
    const cross = pick(o => o.qty >= 3), mid = pick(o => !o.hot), risen = pick(o => o.stock >= 2 && !o.hot);
    if (cross) data.blueprints[cross.id] = Math.max(0, cross.car.evergreen ? 3 : 3);
    if (mid) data.blueprints[mid.id] = 7;
    if (risen) sell(risen, 1);
  };
  let cap = false;
  switch (name) {
    case 'expensive': data.money = 5000; base(); break;
    case 'soldout': data.money = 1500; base(); offers.filter(o => !buys[o.id]).slice(0, 2).forEach(o => sell(o)); break;
    case 'broke': data.money = 0; break;
    case 'maxed': {
      data.money = 2000; base();
      const free = offers.filter(o => !(o.id in data.blueprints) && !buys[o.id]);
      if (free[0]) data.blueprints[free[0].id] = needed(free[0].car, 0); // (at its max: not for sale)
      if (free[1]) data.blueprints[free[1].id] = Math.max(0, needed(free[1].car, 0) - 1); // (one short of its max: the bundle is cut to one)
      break;
    }
    case 'capped': data.money = 3000; base(); cap = true; break;
    case 'empty': data.money = 800; offers.forEach(o => sell(o)); break;
    case 'nopool': poolOverride = []; break;
    default: base(); break; // normal, bought
  }
  if (Object.keys(buys).length || cap) {
    data.jimBuys = { day, n: buys, bp: cap ? JIM.dayCap : Object.entries(buys).reduce((n, [id, c]) => n + c * (offers.find(o => o.id === id)?.qty || 1), 0) };
    for (const [id, c] of Object.entries(buys)) data.blueprints[id] = (data.blueprints[id] || 0) + c * (offers.find(o => o.id === id)?.qty || 1);
  }
};
if (params.get('jimshop') !== null && Game.state === 'start') {
  if (params.get('demo') !== null) demo(params.get('demo') || 'normal');
  if (params.get('jimcash') !== null) { Progress.noSave = true; Progress.data.money = Math.max(0, Math.floor(Number(params.get('jimcash')) || 0)); }
  JimScreen.open();
  const press = params.get('jimpress'), name = params.get('demo');
  const index = press !== null ? Number(press) : name === 'bought' ? 'cheap' : name === 'expensive' ? 'dearest' : null;
  if (index !== null) setTimeout(() => {
    const cards = [...screen.querySelectorAll('.jim-offer')];
    const price = (c) => Number(c.querySelector('.jim-board b').textContent.replace(/\D/g, ''));
    const live = cards.filter(c => !c.querySelector('.jim-buy:disabled'));
    const card = index === 'cheap' ? live.filter(c => price(c) < JIM.confirmAt && c.querySelector('.jim-gain')?.textContent.startsWith('Reaches'))[0] || live.filter(c => price(c) < JIM.confirmAt)[0]
      : index === 'dearest'
      ? live.sort((a, b) => price(b) - price(a))[0]
      : cards[index];
    card?.querySelector('.jim-buy')?.click();
  }, 400);
}
