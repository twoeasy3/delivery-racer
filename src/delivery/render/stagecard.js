// ============================================================================
// THE END-OF-STAGE CARD (#resultScreen; stagecard.css; STAGE-CARD.md; the owner, 17-Oct: "a nicer end of stage card that suits
// the rest of the UI. 'Next Level' is not very relevant any more. 'Look Around' is not useful"; then: "nothing verbose ... only
// the outcome word, the few numbers and the buttons; extra cards only when the run unlocks something new").
// Drawn each time the card comes up (its `hidden` class taken off: a run's finish, a playback's, a playback stopped short):
//   - the outcome in a word or two (the side is the card's colour);
//   - three tiles: a delivery's time to spare, what it earned (counted up: CSS only), the bank; a fail's distance (or the tip
//     left), wrecks, busts;
//   - ONLY when the run gave something new, a small card each: a new best, a medal better than the side's before, a level
//     opened, a car, an event's reward or prize, a stage, a key, tasks done, packs. Nothing new: no card, no line;
//   - one PRIMARY button: Continue (to the menu: render/menu.js continueTo) after a delivery or a playback, Retry after a fail;
//     the other beside it; Watch / Save replay under them (render/replayui.js shows them); Enter presses the primary.
// What game.js decides (a best, a prize, an event's reward, a stage, packs) is read from the words it writes (#resultNote, kept
// unseen in .sc-src): game.js is in the replays' rules fingerprint, so it is read here, not changed (as render/bank.js does).
// What was so before the run (the best, the medal, the next level shut) is noted as Game.start begins (wrapped here, as
// render/loadscreen.js wraps startAsked). Render only: nothing here is read by a rule.
// ============================================================================
import '../stagecard.css';
import { Game, formatTime } from '../game.js';
import { LEVEL, LEVELS, nextOnTab, isRace } from '../levels.js';
import { levelName } from '../levelText.js';
import { Player } from '../player.js';
import { Progress } from '../progress.js';
import { Replay } from '../replay.js';
import { Tiers } from '../tiers.js';
import { medalFor } from '../levelinfo.js';
import { bankFigure } from './bank.js';
import { icon } from './eventmodes.js';

const card = document.getElementById('resultScreen');
const $ = (sel) => card.querySelector(sel);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const dollars = (v) => '$' + Math.floor(Math.max(0, v));
const HEAD = { delivered: 'Delivered', late: 'Too late', timeout: 'Out of time', busted: 'Busted' };
const RANK = { bronze: 1, silver: 2, gold: 3 };

// ---- before the run: what it could better ----
const nextOf = (level) => { const next = nextOnTab(level); return next && Tiers.on() && !isRace(level) ? Tiers.next(level) : next; };
const isOpen = (level) => !!level && (Tiers.on() ? Tiers.isOpen(level) : LEVELS.indexOf(level) >= 0 && LEVELS.indexOf(level) < Progress.data.unlocked);
let before = null;
const start = Game.start;
Game.start = function (...a) {
  try {
    const evil = !!Game.evil && !LEVEL.battle && !LEVEL.alwaysGood, best = Progress.bestTime(LEVEL.id, evil), next = LEVELS.includes(LEVEL) ? nextOf(LEVEL) : null;
    before = { level: LEVEL, evil, medal: typeof best === 'number' && LEVEL.clock ? medalFor(LEVEL, evil, best) : null, next, nextOpen: isOpen(next) };
  } catch { before = null; }
  return start.apply(this, a);
};

// a stat tile: { stat, label, value (text), count (a whole number counted up to), pre, suf, cls }
const tile = (t, i) => {
  const box = el('div', 'sc-tile' + (t.cls ? ' ' + t.cls : ''));
  box.dataset.stat = t.stat;
  box.style.setProperty('--i', i);
  const value = el('b', 'sc-value');
  value.setAttribute('aria-label', t.value);
  if (t.node) value.append(t.node);
  else if (t.count !== undefined) { value.classList.add('sc-count'); value.dataset.pre = t.pre || ''; value.dataset.suf = t.suf || ''; value.style.setProperty('--sc-to', t.count); value.append(el('span', 'sc-sr', t.value)); }
  else value.textContent = t.value;
  box.append(value, el('small', 'sc-label', t.label));
  return box;
};

// what is new, from game.js's line: [kind, label, name, icon]
const REWARDS = [
  [/^You earned the (.+)!$/, 'car', 'Car', 'trophy'],
  [/^Event reward: (.+)!$/, 'reward', 'Reward', 'gift'],
  [/^Stage (\d+ of \d+) done$/, 'stage', 'Stage', 'flag'],
  [/^You won the (.+)!$/, 'prize', 'Prize', 'trophy'],
  [/^The (.+)'s KEY!$/, 'key', 'Key', 'bolt'],
  [/^.+: (\d+ tasks? done)$/, 'tasks', 'Tasks', 'hunt'],
];
const rewardsOf = (note) => {
  const out = [];
  for (const part of note.split(/\s+\|\s+/).map(s => s.trim()).filter(Boolean)) {
    const packs = part.match(/^(?:\d+ packs: (.+)|A (.+))! Opening\.\.\.$/);
    if (packs) { for (const name of (packs[1] || packs[2]).split(', ')) out.push(['pack', 'Pack', name, 'gift']); continue; }
    const hit = REWARDS.find(([re]) => re.test(part));
    if (hit) out.push([hit[1], hit[2], part.match(hit[0])[1], hit[3]]);
  }
  return out;
};
const rewardCard = ([kind, label, name, ic], i) => {
  const box = el('div', 'sc-reward');
  box.dataset.kind = kind;
  box.style.setProperty('--i', i);
  const words = el('span', 'sc-rwords');
  words.append(el('small', '', label), el('strong', '', name));
  box.append(icon(ic), words);
  return box;
};

const draw = () => {
  const note = document.getElementById('resultNote').textContent;
  const held = Game.state !== 'finished'; // (a playback stopped short: render/replayui.js Replay.onOver)
  const playback = !!Replay.playing;
  const outcome = held ? null : Game.outcome;
  const win = outcome === 'delivered';
  const evil = playback ? !!Replay.playing.rec?.header?.evil : Player.evil;
  card.classList.toggle('win', win);
  card.classList.toggle('evil', evil);
  card.classList.toggle('playback', playback);
  $('.sc-headline').textContent = playback ? 'Replay' : HEAD[outcome] || '';
  // the tiles
  const tiles = [];
  if (held) tiles.push({ stat: 'time', label: 'Time', value: formatTime(Game.time) }, { stat: 'wrecks', label: 'Wrecks', value: String(Game.wrecks) }, { stat: 'busts', label: 'Busts', value: String(Game.busts) });
  else if (win) {
    const earned = Math.max(0, Game.tip + Game.cash - Game.fines);
    tiles.push({ stat: 'spare', label: 'Spare', value: formatTime(Game.remaining) }, { stat: 'earned', label: 'Earned', value: dollars(earned), count: Math.floor(earned), pre: '$' });
    if (!playback) tiles.push({ stat: 'bank', label: 'Bank', value: '$' + Math.floor(Progress.data.money), node: bankFigure(Progress.data.money) });
  } else {
    if (outcome === 'late') tiles.push({ stat: 'tip', label: 'Tip', value: dollars(Game.tip), count: Math.floor(Math.max(0, Game.tip)), pre: '$' });
    else { const pct = Math.max(0, Math.min(100, Math.floor(Game.progress * 100))); tiles.push({ stat: 'distance', label: 'Distance', value: pct + '%', count: pct, suf: '%' }); }
    tiles.push({ stat: 'wrecks', label: 'Wrecks', value: String(Game.wrecks) }, { stat: 'busts', label: 'Busts', value: String(Game.busts), cls: Game.busts ? 'bad' : '' });
  }
  $('.sc-tiles').replaceChildren(...tiles.map(tile));
  // what is new (none in a playback: nothing is given)
  const news = [];
  if (!playback && win) {
    if (/\(new best\)/.test(note)) news.push(['best', 'New best', formatTime(Game.remaining), 'flag']);
    const was = before?.level === LEVEL ? before : null;
    const medal = LEVEL.clock && was ? medalFor(LEVEL, was.evil, Game.remaining) : null;
    if (medal && /\(new best\)/.test(note) && RANK[medal] > (RANK[was.medal] || 0)) news.push(['medal', 'Medal', medal[0].toUpperCase() + medal.slice(1), 'trophy']);
    if (was?.next && !was.nextOpen && isOpen(was.next)) news.push(['level', 'Unlocked', levelName(was.next) || was.next.name || '', 'flag']);
    news.push(...rewardsOf(note));
  }
  $('.sc-rewards').replaceChildren(...news.map(rewardCard));
  // the buttons: one primary
  const retry = document.getElementById('restartBtn'), menu = document.getElementById('menuBtn');
  const retryFirst = !win && !playback && !held;
  menu.textContent = win && !playback ? 'Continue' : 'Menu';
  retry.textContent = 'Retry';
  retry.classList.toggle('primary', retryFirst);
  menu.classList.toggle('primary', !retryFirst);
  if (retryFirst) $('.sc-actions').prepend(retry); else $('.sc-actions').prepend(menu);
};

// drawn as it comes up
let shown = false;
new MutationObserver(() => {
  const up = !card.classList.contains('hidden');
  if (up && !shown) draw();
  shown = up;
}).observe(card, { attributes: true, attributeFilter: ['class'] });

// Enter on the card: its primary (input.js would restart: game.js 'confirm'). Caught before input.js hears it (document, capturing)
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
  if (card.classList.contains('hidden') || document.querySelector('.pack-reveal:not(.hidden), .menu-dialog:not(.hidden), .ucine')) return;
  if (e.target?.closest?.('#resultScreen button')) return; // (a focused button: its own press)
  const primary = card.querySelector('.sc-actions .primary');
  if (!primary || primary.offsetParent === null) return;
  e.preventDefault();
  e.stopPropagation();
  if (!e.repeat) primary.click();
}, true);
