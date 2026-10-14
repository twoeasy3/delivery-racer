// The ECU UPGRADE block of the showroom's full view (the owner, 14-Oct: "ECU levels should cost bank to upgrade. Collecting the
// blueprints only unblocks the upgrade"; ecu.js Ecu.upgrade / buy, CONFIG.ecuCost). Drawn for a car whose next ECU can be had:
//   ready        the button 'Upgrade to ECU3: $1,200', pressed (click, Enter, Space) it buys the step: the bank pays, it is saved
//   short        the same button dimmed, 'Need $400 more in the bank'
//   blueprints   the same button dimmed, 'Needs 3 more blueprints' (the blueprints are what unblocks it)
// A KEY car whose key is not had yet may be upgraded all the same (14-Oct); it stays unselectable until the key is had.
// and under it what the step changes (the ecus.json figures of the next ECU against this one). A car with nothing to buy
// (maxed, a starter, a car without its key or not yet unlocked: the panel's own words say that) gets none. The start screen
// stays a menu: this is in the showroom only.
import { Ecu } from '../ecu.js';
import { statShown } from '../showroomData.js';
import { Sound } from './audio.js';
import '../ecuupgrade.css';

const make = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
};
export const dollars = (n) => '$' + Math.round(n).toLocaleString('en-US');
const round1 = (v) => String(Math.round(v * 10) / 10);
// the figures a step changes: [label, now, next, formatter]. Weight does not change; respawn gets shorter (lower is better)
const ROWS = [
  ['Speed', 'maxSpeed', v => Math.round(v * 3.6) + ' km/h'],
  ['Acceleration', 'accel', round1],
  ['Health', 'health', v => String(Math.round(v))],
  ['Agility', 'agility', v => String(statShown(v))],
  ['Delivery', 'delivery', v => String(statShown(v))],
  ['Composure', 'composure', v => String(statShown(v))],
  ['Crossing', 'crossing', v => String(statShown(v))],
  ['Respawn', 'respawn', v => round1(v) + ' s'],
];
export const changes = (now, next) => ROWS.map(([label, key, show]) => ({ label, from: show(now[key]), to: show(next[key]), changed: show(now[key]) !== show(next[key]) })).filter(r => r.changed);

// words for the state the button is in
export const upgradeWords = (up) => {
  const label = 'Upgrade to ECU' + up.to + ': ' + dollars(up.price);
  if (up.state === 'ready') return { label, why: 'Bank ' + dollars(up.bank) + ' → ' + dollars(up.bank - up.price) };
  if (up.state === 'short') return { label, why: 'Need ' + dollars(Math.ceil(up.short)) + ' more in the bank' };
  if (up.state === 'blueprints') return { label, why: 'Needs ' + up.need + ' more blueprint' + (up.need === 1 ? '' : 's') + ' to unlock ECU' + up.to };
  return null;
};

// ---- THE ECU UP MOMENT (the owner, 14-Oct: the glow and the cinematic are the PURCHASE's, not the blueprints': "Bought") ----
// A purchase made here sets `fresh` (the car and the ECU just bought): the showroom's next draw glows that pip and shows an "ECU UP" flag
// (upFlash, freshLevel), and the ECU UP cinematic (render/ecucine.js through unlockcine.js; ECU MAX when it was the last step) plays over the
// screen, loaded only now. It is skipped with reduced motion, `&nocine` (for a still), or when WebGL is missing (playUnlock gives null).
// Reaching the blueprints for an ECU only writes a quiet "Upgrade ready" (blueprintcard.js progressBar, the showroom's bar and pips).
let fresh = null, freshTimer = 0;
export const freshLevel = (card) => (fresh && card && fresh.car === card.id ? fresh.to : 0);
export const upFlash = (card) => (freshLevel(card)
  ? make('p', 'sr-upflash' + (fresh.to >= fresh.max ? ' max' : ''), make('b', '', 'ECU UP'), ' ' + (fresh.to >= fresh.max ? 'MAX ECU ' + fresh.to + ' bought' : 'ECU ' + fresh.to + ' bought')) : null);
export const playUpgrade = (car, to, max, { evil = false } = {}) => {
  if (typeof window === 'undefined' || /[?&]nocine\b/.test(location.search) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(null);
  return import('./unlockcine.js').then(m => m.playUnlock({ mode: to >= max ? 'ecumax' : 'ecu', carId: car.id, level: to, evil })).catch(() => null);
};
// the moment of a purchase (a result of Ecu.buy that went through): the flag and glow for the next draw, the sound, the cinematic
export const upMoment = (card, result, { evil = false } = {}) => {
  fresh = { car: card.id, to: result.to, max: Ecu.max(card.car) };
  clearTimeout(freshTimer);
  freshTimer = setTimeout(() => { fresh = null; }, 6000);
  return playUpgrade(card.car, result.to, fresh.max, { evil });
};

// onBought(result) runs after a purchase (the showroom draws itself again: the live car, the figures, the bank)
export const upgradeBlock = (card, onBought, { evil = false } = {}) => {
  const up = card?.upgrade;
  if (!up || !['ready', 'short', 'blueprints'].includes(up.state) || card.hidden || card.dark) return null;
  const words = upgradeWords(up);
  const button = make('button', 'sr-up-btn ' + up.state, make('span', 'sr-up-label', words.label));
  button.type = 'button';
  const why = make('p', 'sr-up-why ' + up.state, words.why);
  why.id = 'sr-up-why-' + card.id;
  button.setAttribute('aria-describedby', why.id);
  if (up.state === 'ready') {
    button.title = 'Buy ECU' + up.to + ' for the ' + card.name + ' from the bank';
    button.addEventListener('click', () => {
      const result = Ecu.buy(card.car);
      if (result.ok) { Sound.play('menuMove', 0.7); upMoment(card, result, { evil }); }
      onBought?.(result);
    });
  } else {
    button.setAttribute('aria-disabled', 'true'); // (dimmed, not disabled: it can be focused and its reason read; pressing it does nothing)
    button.title = words.why;
    button.addEventListener('click', () => onBought?.({ ok: false, ...up }));
  }
  const rows = card.nextStats ? changes(card.stats, card.nextStats) : [];
  const list = rows.length ? make('ul', 'sr-up-changes', ...rows.map(r => make('li', '', make('span', '', r.label), make('b', '', r.from + ' → ' + r.to)))) : null;
  const note = card.key && !card.unlocked ? make('p', 'sr-up-note', 'You can upgrade it now; you still need its key to drive it') : null; // (a key car without its key: buying is allowed, 14-Oct)
  return make('div', 'sr-up', make('small', 'sr-up-head', 'Upgrade'), button, why, note, list);
};
