// ---- CRAZEY JIM'S BLUEPRINT STALL: a section of the Shop (CHECKLIST item 250; rules jimshop.js, look jimshop.css) ----------------------
// Drawn by render/shop.js at the top of the Shop's body (jimSection): Jim's BANNER (round 1's, restored: bunting and the red Crazey Jim's
// sign with the yellow Blueprint Stall band), a strip with the clock to the next stock and the bank in $, then the offers as tiles in the Shop's
// own style: the blueprint card (render/blueprintcard.js, the live car still), what the bundle is, "You have 3 / 5 to ECU 2" with a
// bar, and the Shop's yellow price button (greyed, with its reason, when it cannot be pressed: Need $120 more, Sold out, Maxed out,
// Limit reached). One row shows at first (the hot deal and the next); "See all 6 offers" opens the rest in place. A dear bundle
// (JIM.confirmAt, or half the bank) asks first. A purchase: the tile pops, the bank and the count run to their new figures, a toast says
// what you got. Key cars carry a Key car chip and what earns their key (Jim sells blueprints, never keys). The offers change every 6 local
// hours (00:00, 06:00, 12:00, 18:00): the clock is the Shop's own `.countdown`, which redraws the Shop when it runs out.
// By address (for a look; nothing is saved):
//   ?jimshop                  the Shop opens with the stall expanded
//   &demo[=name]              a made-up save: normal (default), keycar (two key cars, the Rocket Fin and the Swan Car, on the stall), expensive (the confirm up), soldout,
//                             broke, maxed, nocc (too little Crazey Cash to refresh), reflimit (refreshes used up), empty (all sold), nopool (no cars),
//                             bought (a purchase just made, feedback held)
//   &jimcars=a,b,c            with demo=keycar: those cars on the stall (up to six)
//   &jimr=<n>                 the refreshes already done today (the cost is 5 + n)
//   &jimcc=<n>                the Crazey Cash for the visit (the Refresh button's)   &jimrefresh   press Refresh 0.7 s after opening
//   &jimcash=<n>              the bank for the visit        &jimpress=<n>   press BUY on offer n (0-based, as laid out)
//   &jimhold                  keep the toast up             &eventsnow=<date-time> sets the day and the slot (the rotation) and the clock
import '../jimshop.css';
import { Jim, JIM, stand, needed } from '../jimshop.js';
import { Progress } from '../progress.js';
import { barFill } from './barfill.js';
import { Events, when as eventTime } from '../events.js';
import { ask } from './dialog.js';
import { blueprintCard } from './blueprintcard.js';
import { stillsIn } from './carstill.js';
import { posePick } from '../carposes.js';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
const params = new URLSearchParams(location.search);
const dollars = (n) => '$' + Math.floor(n).toLocaleString('en-GB');
const hold = params.get('jimhold') !== null;

let rerolled = false, expanded = params.get('jimshop') !== null, toast = null, toastTimer = 0, tween = 0, last = null; // (last: the purchase just made, for its tile and the bank to run from)
let poolOverride = null; // (?demo=nopool: a pool of no cars)
const pics = stillsIn(null);
export const expandStall = () => { expanded = true; }; // (the menu's Jim button: the Shop opens with the stall's offers all showing)

// ---- one offer ------------------------------------------------------------------------------------------------------------
const offerTile = (v, anim) => {
  const off = !!v.why && v.why !== 'short';
  const now = stand(v.car), max = now.ecu >= now.max, bought = anim && anim.id === v.id;
  const shown = bought ? anim.before : now; // (the figures the tile begins on)
  const open = !v.why || v.why === 'short';
  const after = stand(v.car, open ? v.qty : 0), ups = after.ecu > now.ecu;
  const fill = make('i', 'fill'), plus = make('i', 'plus');
  const setBar = (s) => { fill.style.width = barFill(s).pct + '%'; };
  setBar(shown);
  // (a bar already full and overfilled -- an upgrade ready to buy, 14-Oct -- shows no preview: there is nothing left to fill)
  const preview = !max && !now.over && !bought && open ? Math.min(100, Math.round((now.have + v.qty) / now.toNext * 100)) : 0;
  if (preview) { plus.style.left = fill.style.width; plus.style.width = Math.max(0, preview - parseInt(fill.style.width, 10)) + '%'; }
  const bar = make('div', 'jim-bar' + (max ? ' max' : '') + (now.over ? ' over' : ''), fill, preview ? plus : null);
  const count = make('b', '', String(max || now.over ? now.bp : shown.have));
  const line = now.over
    ? make('div', 'jim-have-line', make('span', '', 'You have ', count), make('em', '', 'Upgrade ready'))
    : max
    ? make('div', 'jim-have-line', make('span', '', 'You have ', count), make('em', '', 'MAX ECU'))
    : make('div', 'jim-have-line', make('span', '', 'You have ', count, ' / ' + now.toNext), make('em', '', now.ecu === 0 && v.car.evergreen ? 'to unlock' : 'to ECU ' + (now.ecu + 1)));
  const gain = make('div', 'jim-gain', off || max ? '' : (ups ? (after.ecu >= after.max ? 'Unlocks the MAX ECU upgrade!' : (now.ecu === 0 && v.car.evergreen ? 'Unlocks the car!' : 'Unlocks the ECU ' + after.ecu + ' upgrade!')) : '+' + v.qty + (v.cut === 'need' ? ' (all it needs)' : '')));
  if (bought && !max && !now.over) { // (the count runs up to the new figure, the bar fills)
    requestAnimationFrame(() => requestAnimationFrame(() => setBar(now)));
    runCount(count, shown.have, now.have, now.ecu > shown.ecu ? now.toNext : null);
  }
  // the price button: the Shop's own (shop.css .shop-price), greyed with its reason when it cannot be pressed
  const words = { maxed: 'Maxed out', sold: 'Sold out', short: 'Need ' + dollars(v.need) + ' more' }[v.why];
  const button = v.why && v.why !== 'short'
    ? make('button', 'shop-price exhausted', make('b', '', words))
    : make('button', 'shop-price' + (v.why ? ' short' : ''), v.why ? make('b', '', words) : [v.was ? make('s', '', dollars(v.was)) : null, make('b', '', dollars(v.price)), make('span', 'jim-x', '×' + v.qty)]);
  button.type = 'button';
  button.disabled = !!v.why;
  button.setAttribute('aria-label', v.why ? v.car.name + ' blueprints: ' + words : 'Buy ' + v.qty + ' ' + v.car.name + ' blueprint' + (v.qty > 1 ? 's' : '') + ' for ' + dollars(v.price));
  if (!v.why) button.addEventListener('click', () => buy(v.id));
  // the car's own BLUEPRINT POSE, the one the "What's inside" sheet and the showroom give it (carposes.js posePick: stable by id), drawn by the
  // same live still (carstill.js) in the Good livery; a key car's card is its blueprint card, never its key (Jim sells blueprints only)
  const pose = posePick(v.car.id);
  const { node, pic } = blueprintCard(v.car, { rarity: v.rarity, n: v.qty }, { pose });
  pics.watch(pic, v.car, { side: 'good', pose });
  // the cap per refresh, as what is left of it: "2 of 2 left" (an epic), "1 of 1 left" (a Legendary or a key car), "3 of 5 left" (a common)
  const stock = v.why === 'maxed' ? null : make('p', 'shop-limit', v.left === 0 ? 'Sold out · cap ' + v.cap : Math.min(v.leftBp, v.cap) + ' of ' + v.cap + ' left' + (v.bought ? ' · price up' : ''));
  const tile = make('article', 'shop-tile jim-tile r-' + v.rarity + (v.key ? ' key' : '') + (off ? ' off' : '') + (bought ? ' bought' : ''),
    v.hot && !off ? make('span', 'shop-ribbon rb-sale', 'Hot −' + Math.round(JIM.hotOff * 100) + '%') : null,
    make('div', 'jim-art', node),
    make('div', 'shop-tile-info',
      v.key ? make('p', 'jim-key', make('span', 'shop-chip r-bespoke', 'Key car'), v.car.concept ? 'Max ECU + a delivery earns the key' : 'Its key comes in Bespoke packs') : null,
      make('div', 'jim-have', line, bar, gain), stock),
    make('div', 'shop-tile-buy', button));
  return tile;
};
// a figure run from one number to another (past an ECU: up to the full bar, then the new ECU's start)
const runCount = (node, from, to, wrapTo) => {
  const t0 = performance.now(), span = 650, up = wrapTo ? [[from, wrapTo], [0, to]] : [[from, to]];
  const total = up.reduce((n, [a, b]) => n + Math.abs(b - a), 0) || 1;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / span);
    let left = k * total, value = from;
    for (const [a, b] of up) { const d = Math.abs(b - a); if (left <= d) { value = a + Math.round((b > a ? 1 : -1) * left); break; } left -= d; value = b; }
    node.textContent = String(value);
    if (k < 1) tween = requestAnimationFrame(step);
  };
  cancelAnimationFrame(tween);
  tween = requestAnimationFrame(step);
};
const animateBank = (node, from, to) => {
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 650);
    node.textContent = dollars(from + (to - from) * k);
    if (k < 1) requestAnimationFrame(step);
  };
  node.textContent = dollars(from);
  requestAnimationFrame(step);
};

// ---- the section ------------------------------------------------------------------------------------------------------------
export const jimSection = () => {
  const offers = Jim.offers({ cars: poolOverride });
  const order = [...offers.filter(o => o.hot), ...offers.filter(o => !o.hot)];
  const money = Math.floor(Progress.data.money);
  const left = Jim.nextAt() - Events.now();
  const live = () => { const b = make('b', 'countdown', ''); b.dataset.end = String(Jim.nextAt()); b.textContent = countdownText(left); return b; };
  const bankNode = make('b', '', dollars(last ? last.bank : money));
  if (last) animateBank(bankNode, last.bank, money);
  const flags = make('div', 'jim-bunting', ...Array.from({ length: 18 }, () => make('i')));
  const sign = make('div', 'jim-sign', make('h1', '', 'Crazey Jim\'s', make('span', '', 'Blueprint Stall')), make('p', '', '100% genuine blueprints*'));
  const info = Jim.refreshInfo(), cc = Math.max(0, Math.floor(Number(Progress.data.shopCash) || 0));
  const refresh = make('button', 'jim-refresh' + (info.ok ? '' : ' off'), info.why === 'limit' ? 'Refresh limit reached' : info.why === 'short' ? 'Need ' + info.need + ' Crazey Cash' : 'Refresh (' + info.cost + ' CC)' + (info.left < 10 ? ' · ' + info.left + ' left' : ''));
  refresh.type = 'button';
  refresh.disabled = !info.ok;
  refresh.setAttribute('aria-label', info.ok ? 'Refresh the stall for ' + info.cost + ' Crazey Cash (you have ' + cc + ')' : info.why === 'limit' ? 'Refresh limit reached for today' : 'Refreshing costs ' + info.cost + ' Crazey Cash: you need ' + info.need + ' more');
  refresh.addEventListener('click', () => { if (Jim.refresh().ok) { rerolled = true; window.dispatchEvent(new Event('progresschange')); } });
  // (the owner, 14-Oct: "the blueprint shop hides the packs entirely": the stall is the Shop's first section and, opened (the menu's Jim button, or
  // "See all offers"), its tall tiles fill the phone, the packs far below with no sign of them. "Packs" jumps to them.)
  const packs = make('button', 'jim-packs', 'Packs ↓');
  packs.type = 'button';
  packs.setAttribute('aria-label', 'Jump to the packs below the stall');
  packs.addEventListener('click', () => { const sec = [...document.querySelectorAll('#shopScreen .shop-section, .shop-body .shop-section')].find(s => !s.classList.contains('s-jim')); sec?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  const strip = make('div', 'jim-strip', make('div', 'jim-clock', 'New stock in', live()), refresh, packs, make('div', 'jim-bank', make('small', '', 'Bank'), bankNode));
  const open = offers.filter(o => !o.why || o.why === 'short');
  const cheapest = open.length ? Math.min(...open.map(o => o.price)) : 0;
  let note = null;
  if (offers.length && offers.every(o => o.why === 'maxed' || o.why === 'sold')) note = make('p', 'shop-note jim-note', 'Jim\'s cleaned out: everything is sold or maxed. Refresh the stall, or new stock in ', live(), '.');
  else if (open.length && open.every(o => o.why === 'short') && money < cheapest) note = make('p', 'shop-note jim-note', (money < 1 ? 'Your bank is empty. ' : 'Not enough in the bank. ') + 'Jim only takes tips: deliver something, then come back.');
  const grid = make('div', 'jim-grid' + (expanded ? '' : ' collapsed') + (rerolled ? ' rerolled' : ''), ...order.map(o => offerTile(o, last)));
  const more = offers.length > 2 ? make('button', 'jim-more', make('span', '', expanded ? 'Show fewer' : 'See all ' + offers.length + ' offers'), make('i', '', expanded ? '▴' : '▾')) : null;
  more?.addEventListener('click', () => {
    expanded = !expanded;
    grid.classList.toggle('collapsed', !expanded);
    more.firstChild.textContent = expanded ? 'Show fewer' : 'See all ' + offers.length + ' offers';
    more.lastChild.textContent = expanded ? '▴' : '▾';
  });
  const small = make('p', 'jim-small', '*Terms apply. Each car has a cap of blueprints per refresh: ' + Object.entries(JIM.capPerRefresh).map(([r, n]) => (r === 'bespoke' ? 'key cars' : r) + ' ' + n).join(', ') + '. Prices rise a little with each bundle of the same blueprint. Jim never sells a key, and sells key cars dearer. A refresh costs Crazey Cash, a little more each time today, and starts the stall over.');
  last = null;
  const rolled = rerolled; rerolled = hold && rolled; // (the pop plays once: kept for a picture with ?jimhold)
  return make('section', 'shop-section s-jim', flags, sign, strip, note, offers.length ? grid : make('p', 'shop-note jim-note', 'Jim has nothing on the stall right now. New stock in ', live(), '.'), more, offers.length ? small : null);
};
const countdownText = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? h + 'h ' + m + 'm' : m + 'm ' + (s % 60) + 's';
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
  if (!v || v.why) { window.dispatchEvent(new Event('progresschange')); return; }
  const money = Math.floor(Progress.data.money);
  if (v.price >= JIM.confirmAt || v.price * 2 > money) { // (a dear bundle, or half the bank: ask first)
    const after = stand(v.car, v.qty), now = stand(v.car);
    const yes = await ask({ title: 'Buy ' + v.qty + ' ' + v.car.name + ' blueprint' + (v.qty > 1 ? 's' : '') + '?', ok: 'Pay ' + dollars(v.price),
      lines: ['Crazey Jim wants ' + dollars(v.price) + '. You will have ' + dollars(money - v.price) + ' left.',
        after.ecu > now.ecu ? 'It takes the ' + v.car.name + ' to ECU ' + after.ecu + '.' : 'You will have ' + (now.bp + v.qty) + ' of its blueprints.'] });
    if (!yes) return;
  }
  last = { id: v.id, before: stand(v.car), bank: money }; // (set first: the purchase makes the Shop draw again, and the section reads it then)
  const done = Jim.buy(v.id, { cars: poolOverride });
  if (!done.ok) { last = null; window.dispatchEvent(new Event('progresschange')); return; }
  document.querySelector('.jim-tile.bought')?.scrollIntoView({ block: 'nearest' }); // (the tile you bought from stays in view)
  const reached = done.after.ecu > done.before.ecu;
  say('+' + done.qty + ' ' + v.car.name + ' blueprint' + (done.qty > 1 ? 's' : ''),
    reached ? (done.after.ecu >= done.after.max ? 'MAX ECU reached!' : (done.before.ecu === 0 && v.car.evergreen ? 'Car unlocked!' : 'ECU ' + done.after.ecu + ' reached!')) : 'Paid ' + dollars(done.price));
};

// ---- ?jimshop: by address (for a look or a picture), with a made-up save on ?demo -----------------------------------------------------------
const demo = (name) => {
  Progress.noSave = true;
  const data = Progress.data;
  data.money = 900; data.shopCash = 40; data.blueprints = {}; data.jimBuys = {}; data.maxed = ['commuter'];
  if (name === 'keycar') Jim.force = (params.get('jimcars') || 'rocketfin,swancar').split(',').filter(Boolean);
  const offers = Jim.offers(), { day, slot } = { day: Jim.day(), slot: Jim.slot() }, buys = {};
  const sell = (o, n = o.stock) => { buys[o.id] = n; };
  const used = new Set(), pick = (test) => { const o = offers.find(x => !used.has(x.id) && test(x)) || offers.find(x => !used.has(x.id)); if (o) used.add(o.id); return o; };
  const base = () => { // (one two short of an ECU with a bundle that crosses it, one part way, one with a bundle already bought)
    const cross = pick(o => o.qty >= 3), mid = pick(o => !o.hot), risen = pick(o => o.stock >= 2 && !o.hot);
    if (cross) data.blueprints[cross.id] = 3;
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
    case 'nocc': data.money = 1500; data.shopCash = 3; base(); break; // (too little Crazey Cash to refresh)
    case 'reflimit': data.money = 1500; data.shopCash = 500; base(); cap = true; break; // (the day's refreshes used up)
    case 'empty': data.money = 800; offers.forEach(o => sell(o)); break;
    case 'nopool': poolOverride = []; break;
    case 'keycar': data.money = 3000; base(); break;
    default: base(); break; // normal, bought
  }
  if (Object.keys(buys).length || cap) {
    data.jimBuys = { day, slot, ref: 0, r: cap ? JIM.refreshCap : 0, n: buys };
    for (const [id, c] of Object.entries(buys)) data.blueprints[id] = (data.blueprints[id] || 0) + c * (offers.find(o => o.id === id)?.qty || 1);
  }
};
if (params.get('jimshop') !== null) {
  if (params.get('eventsnow')) { const at = eventTime(params.get('eventsnow')); if (Number.isFinite(at)) Events.now = () => at; } // (main.js sets it too, but after this: the demo needs the clock now)
  if (params.get('demo') !== null) demo(params.get('demo') || 'normal');
  for (const token of (params.get('jimbp') || '').split(',').filter(Boolean)) { const [id, n] = token.split(':'); Progress.noSave = true; (Progress.data.blueprints ||= {})[id] = Number(n) || 0; } // (&jimbp=midnight:10,woody:10: blueprints held, for a picture of the bars; after the demo)
  if (params.get('jimr') !== null) { Progress.noSave = true; const t = Progress.data.jimBuys || {}; Progress.data.jimBuys = { day: Jim.day(), slot: Jim.slot(), ref: t.ref || 0, r: Math.max(0, Math.floor(Number(params.get('jimr')) || 0)), n: t.n || {} }; } // (refreshes done today: the Refresh button's rising cost)
  if (params.get('jimcc') !== null) { Progress.noSave = true; Progress.data.shopCash = Math.max(0, Math.floor(Number(params.get('jimcc')) || 0)); }
  if (params.get('jimrefresh') !== null) setTimeout(() => document.querySelector('.jim-refresh')?.click(), 700);
  if (params.get('jimcash') !== null) { Progress.noSave = true; Progress.data.money = Math.max(0, Math.floor(Number(params.get('jimcash')) || 0)); }
  const press = params.get('jimpress'), name = params.get('demo');
  const index = press !== null ? Number(press) : name === 'bought' ? 'cheap' : name === 'expensive' ? 'dearest' : null;
  if (index !== null) setTimeout(() => {
    const tiles = [...document.querySelectorAll('.jim-tile')];
    const price = (c) => Number(c.querySelector('.shop-price b')?.textContent.replace(/\D/g, ''));
    const live = tiles.filter(c => !c.querySelector('.shop-price:disabled'));
    const tile = index === 'cheap' ? live.filter(c => price(c) < JIM.confirmAt && c.querySelector('.jim-gain')?.textContent.startsWith('Unlocks'))[0] || live.filter(c => price(c) < JIM.confirmAt)[0]
      : index === 'dearest' ? live.sort((a, b) => price(b) - price(a))[0] : tiles[index];
    tile?.querySelector('.shop-price')?.click();
  }, 700);
}
