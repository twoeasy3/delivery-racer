// ============================================================================
// THE BETTER RIDE NUDGE (a prototype for the owner; NEW-PLAYER-IDEAS.md): the first star tier's levels 2 and 3 want a better
// car than the free Commuter (the owner, 16-Oct: "push the new player into the Junker for Level 1-2 and Darkvan for Level 1-3").
// Behind a switch, OFF unless asked: ?nudge for a visit, ?nudge=on to remember it in this browser, ?nudge=off to forget it.
//  - the results of a delivered career level whose NEXT level has a ride (RIDES), while the car in use is one it betters: a
//    small card over the buttons, "Better ride for <level>", the car, a bar or two of what it does better, and one button:
//    Use it (owned), Buy it · $n (the bank has it: bought and put in use, so the next level, where Continue lands, drives it), or how much is missing
//  - the showroom and the Garage, opened with such a level picked: that car looked at (scrolled to, picked), and in the
//    showroom its card tagged "Better ride"
// Render only (the results screen, the showroom, the lot): what a run does is not touched, so the replays' rules are not
// (vite.config.js logicFiles: render/ is not followed). Nothing is changed on a save but what the player's own tap buys/picks.
// ============================================================================
import { LEVEL, LEVEL_INDEX } from '../levels.js';
import { levelName } from '../levelText.js';
import { Tiers } from '../tiers.js';
import { CAR, selectCar } from '../cars.js';
import { recordPick } from './lastpick.js';
import { Game } from '../game.js';
import { Replay } from '../replay.js';
import { nudgeOn, nudgeFor, betterStats } from './rides.js';
import { Garage } from './garage.js';
import { Showroom } from './showroom.js';
import { buyCar } from './carbuy.js'; // (a car bought: the showroom's one purchase path, which plays the sale cutscene: CHECKLIST 438 / 451)

const css = `
#rideNudge { margin: 8px auto 10px; max-width: 340px; padding: 10px 12px; border-radius: 12px; background: rgba(14, 20, 30, .88);
  border: 2px solid #ffd23f; text-align: left; font: 600 14px/1.25 system-ui, sans-serif; color: #fff; }
#rideNudge h3 { margin: 0 0 6px; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #ffd23f; }
#rideNudge .car { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
#rideNudge .bar { display: grid; grid-template-columns: 124px 1fr; align-items: center; gap: 6px; margin: 3px 0; font-size: 12px; }
#rideNudge .track { position: relative; height: 10px; border-radius: 5px; background: #2b3444; overflow: hidden; }
#rideNudge .track i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 5px; }
#rideNudge .track i.to { background: #ffd23f; } #rideNudge .track i.from { background: #8a94a6; }
#rideNudge button { margin: 8px 0 0; width: 100%; }
#rideNudge button[disabled] { opacity: .7; }
#showroom .sr-card .sr-badge.nudge-tag.nudge-tag { display: block; background: #ffd23f; color: #141414; z-index: 4; } /* (shown on a card not bought yet too: showroom.css hides a locked card's badges) */`;

let box = null;
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const bar = (b) => {
  const most = Math.max(b.from, b.to) * 1.08, row = el('div', 'bar'), track = el('div', 'track');
  const to = el('i', 'to'), from = el('i', 'from');
  to.style.width = (100 * b.to / most) + '%';
  from.style.width = (100 * b.from / most) + '%';
  track.append(to, from);
  row.append(el('span', '', b.label + ' ' + b.to + (b.unit ? ' ' + b.unit : '')), track);
  row.title = b.label + ': ' + b.from + ' now, ' + b.to + ' in it';
  return row;
};
// the card on the results screen (null: none to show)
const showCard = () => {
  box?.remove(); box = null;
  if (!nudgeOn() || Game.state !== 'finished' || Game.outcome !== 'delivered' || LEVEL_INDEX < 0 || Replay.playing) return;
  const next = Tiers.next(LEVEL), n = nudgeFor(next);
  if (!n) return;
  box = el('div');
  box.id = 'rideNudge';
  box.append(el('h3', '', 'Better ride for ' + levelName(next)), el('div', 'car', n.ride.name), ...betterStats(CAR, n.ride).map(bar));
  const button = el('button', 'level', n.offer === 'use' ? 'Use the ' + n.ride.name : n.offer === 'buy' ? 'Buy the ' + n.ride.name + ' · $' + n.ride.price : '$' + n.short + ' more: replay for tips');
  if (n.offer === 'short') button.disabled = true;
  button.addEventListener('click', async () => {
    if (n.offer === 'buy' && !await buyCar(n.ride, { confirm: false })) return; // (the button already says the car and its price: bought on the tap; the cutscene plays over the results)
    selectCar(n.ride.id);
    recordPick(n.ride.id); // (render/lastpick.js)
    button.disabled = true;
    button.textContent = n.ride.name + ' ready';
  });
  box.append(button);
  document.querySelector('#resultScreen .sc-extra')?.append(box); // (the end-of-stage card's room for it: render/stagecard.js)
};

// the showroom and the lot, opened with a level picked that has a ride for the car in use: that car looked at
const tagCard = () => {
  const n = nudgeOn() && nudgeFor(LEVEL);
  if (!n) return;
  for (const card of document.querySelectorAll('#showroom .sr-card[data-car="' + n.ride.id + '"]')) if (!card.querySelector('.nudge-tag')) card.append(el('span', 'sr-badge nudge-tag', 'Better ride'));
};
if (typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof MutationObserver === 'function') {
  const style = el('style');
  style.textContent = css;
  document.head.appendChild(style);
  Game.onFinish.push(showCard);
  const open = Showroom.open.bind(Showroom);
  Showroom.open = (...args) => {
    const r = open(...args), n = nudgeOn() && nudgeFor(LEVEL);
    if (n) { Showroom.look(n.ride.id); tagCard(); }
    return r;
  };
  const lot = Garage.open.bind(Garage);
  Garage.open = (...args) => {
    const r = lot(...args), n = nudgeOn() && nudgeFor(LEVEL);
    if (n) Garage.look(n.ride.id);
    return r;
  };
  const room = document.getElementById('showroom');
  if (room) new MutationObserver(tagCard).observe(room, { childList: true, subtree: true }); // (the cards are made again on a filter: tagged again)
}
