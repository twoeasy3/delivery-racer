// ============================================================================
// THE END-OF-STAGE CARD (#resultScreen; stagecard.css; STAGE-CARD.md; the owner, 17-Oct: "a nicer end of stage card that suits
// the rest of the UI. 'Next Level' is not very relevant any more. 'Look Around' is not useful"). Drawn each time the card comes
// up (its `hidden` class taken off: a run's finish, a playback's, a playback stopped short), from the run (Game) and from the
// three lines game.js and render/replayui.js write (#resultTitle, #resultTime, #resultNote, kept unseen in .sc-src): game.js is
// in the replays' rules fingerprint, so what it decides (a best, a prize, an event's reward, a stage, packs) is read from its
// words here rather than changed there (as render/bank.js does).
//   - the head: the level, the side, the outcome in a word or two (a rival's place under it);
//   - the tiles: a delivery's time to spare (NEW BEST or the best), what it earned (counted up: CSS only), its medal, the bank;
//     a fail's distance (or the tip left), wrecks, busts, the bank;
//   - the rewards as small cards (a car, an event's reward or prize, a stage, tasks, a key, packs);
//   - one PRIMARY button: Continue (to the menu: render/menu.js continueTo) after a delivery or a playback, Retry after a fail;
//     the other one beside it; Watch / Save replay under them (render/replayui.js shows and words them); Enter presses the primary.
// Render only: nothing here is read by a rule (render/ is outside the fingerprint).
// ============================================================================
import '../stagecard.css';
import { Game, formatTime } from '../game.js';
import { LEVEL, LEVEL_INDEX } from '../levels.js';
import { levelName } from '../levelText.js';
import { Player } from '../player.js';
import { Progress } from '../progress.js';
import { Replay } from '../replay.js';
import { medalFor } from '../levelinfo.js';
import { bankFigure } from './bank.js';
import { icon } from './eventmodes.js';

const card = document.getElementById('resultScreen');
const $ = (sel) => card.querySelector(sel);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const dollars = (v) => '$' + Math.floor(Math.max(0, v));
const HEAD = { delivered: 'Delivered', late: 'Too late', timeout: 'Out of time', busted: 'Busted' };

// a stat tile: { stat, label, value (text), count (a whole number counted up to), pre, node (in place of the value), badge, sub }
const tile = (t, i) => {
  const box = el('div', 'sc-tile' + (t.cls ? ' ' + t.cls : ''));
  box.dataset.stat = t.stat;
  box.style.setProperty('--i', i);
  const value = el('b', 'sc-value');
  value.setAttribute('aria-label', t.value);
  if (t.node) value.append(t.node);
  else if (t.count !== undefined) { value.classList.add('sc-count'); value.dataset.pre = t.pre || ''; value.style.setProperty('--sc-to', t.count); value.append(el('span', 'sc-sr', t.value)); }
  else value.textContent = t.value;
  box.append(value, el('small', 'sc-label', t.label));
  if (t.badge) box.append(el('span', 'sc-badge', t.badge));
  else if (t.sub) box.append(el('span', 'sc-tsub', t.sub));
  return box;
};
const medalNode = (medal) => { const f = el('span', 'sc-medal'); f.append(el('i', 'sc-disc ' + medal), el('span', '', medal)); return f; };

// the rewards in game.js's line, as cards: [kind, label, name, icon]
const REWARDS = [
  [/^You earned the (.+)!$/, 'car', 'Car earned', 'trophy'],
  [/^Event reward: (.+)!$/, 'reward', 'Event reward', 'gift'],
  [/^Stage (\d+ of \d+) done$/, 'stage', 'Stage done', 'flag'],
  [/^You won the (.+)!$/, 'prize', 'Grand prize', 'trophy'],
  [/^The (.+)'s KEY!$/, 'key', 'Key', 'bolt'],
  [/^(.+) run done$/, 'event', 'Run done', 'flag'],
  [/^(.+: (?:\d+ tasks? done|no task left for that car))$/, 'tasks', 'Tasks', 'hunt'],
];
const NOT_REWARDS = /^(Good|Evil|Wrecked: |Busted: |Bank |Recorded |.* to spare)/;
const rewardsOf = (note) => {
  const out = [];
  for (const part of note.split(/\s+\|\s+/).map(s => s.trim()).filter(Boolean)) {
    if (NOT_REWARDS.test(part)) continue;
    const packs = part.match(/^(?:\d+ packs: (.+)|A (.+))! Opening\.\.\.$/);
    if (packs) { for (const name of (packs[1] || packs[2]).split(', ')) out.push(['pack', 'Pack', name, 'gift']); continue; }
    const hit = REWARDS.find(([re]) => re.test(part));
    if (hit) out.push([hit[1], hit[2], part.match(hit[0])[1], hit[3]]);
    else out.push(['other', 'Reward', part.replace(/!$/, ''), 'gift']);
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
  // the head
  const name = LEVEL ? (levelName(LEVEL) || LEVEL.name || '') : '';
  $('.sc-kicker').replaceChildren(...(playback ? [el('span', 'sc-tag', 'Replay')] : []), el('span', 'sc-side', evil ? 'Evil' : 'Good'), el('span', 'sc-level', name));
  $('.sc-headline').textContent = held ? (/stopped/i.test(document.getElementById('resultTitle').textContent) ? 'Replay stopped' : 'Replay end') : HEAD[outcome] || '';
  const g = LEVEL?.grid;
  $('.sc-sub').textContent = held || !g?.rival ? '' : outcome !== 'delivered' ? ''
    : !Game.rivalsIn ? (g.count > 1 ? '1st of ' + (g.count + 1) : 'Rival beaten')
    : g.count > 1 ? ['1st', '2nd', '3rd', '4th'][Game.rivalsIn] + ' of ' + (g.count + 1) : 'Rival first';
  // the tiles
  const tiles = [];
  const saved = !playback && (LEVEL_INDEX >= 0 || /to spare \((?:new best|best )/.test(note));
  if (held) {
    tiles.push({ stat: 'time', label: 'Stopped at', value: formatTime(Game.time) }, { stat: 'wrecks', label: 'Wrecks', value: String(Game.wrecks) }, { stat: 'busts', label: 'Busts', value: String(Game.busts) });
  } else if (win) {
    const best = note.match(/to spare \(best ([^)]+)\)/);
    tiles.push({ stat: 'spare', label: 'Spare', value: formatTime(Game.remaining), badge: /\(new best\)/.test(note) ? 'New best' : '', sub: best ? 'Best ' + best[1] : '' });
    const earned = Math.max(0, Game.tip + Game.cash - Game.fines);
    tiles.push({ stat: 'earned', label: 'Earned', value: dollars(earned), count: Math.floor(earned), pre: '$' });
    const medal = LEVEL?.clock ? medalFor(LEVEL, evil, Game.remaining) : null;
    if (medal) tiles.push({ stat: 'medal', label: 'Medal', value: medal, node: medalNode(medal) });
  } else if (outcome === 'late') {
    tiles.push({ stat: 'tip', label: 'Tip left', value: dollars(Game.tip), count: Math.floor(Math.max(0, Game.tip)), pre: '$', sub: 'of $' + LEVEL.tip });
    tiles.push({ stat: 'wrecks', label: 'Wrecks', value: String(Game.wrecks) }, { stat: 'busts', label: 'Busts', value: String(Game.busts) });
  } else {
    const pct = Math.max(0, Math.min(100, Math.floor(Game.progress * 100)));
    tiles.push({ stat: 'distance', label: 'Distance', value: pct + '%', count: pct, pre: '' });
    tiles.push({ stat: 'wrecks', label: 'Wrecks', value: String(Game.wrecks) }, { stat: 'busts', label: 'Busts', value: String(Game.busts), cls: Game.busts ? 'bad' : '' });
  }
  if (!playback) tiles.push({ stat: 'bank', label: 'Bank', value: '$' + Math.floor(Progress.data.money), node: bankFigure(Progress.data.money) });
  $('.sc-tiles').replaceChildren(...tiles.map(tile));
  // the rewards (none in a playback: nothing is given)
  const rewards = playback ? [] : rewardsOf(note);
  $('.sc-rewards').replaceChildren(...rewards.map(rewardCard));
  // the details, folded: the money and the rest of the run
  const more = [];
  if (win) {
    more.push(['Tip', '$' + Game.tip.toFixed(2)]);
    if (Game.cash) more.push(['Cash', '$' + Game.cash]);
    if (Game.fines) more.push(['Fines', '-$' + Game.fines]);
    more.push(['Wrecks', String(Game.wrecks)], ['Busts', String(Game.busts)]);
  }
  if (!saved && !playback && LEVEL_INDEX < 0 && !held) more.push(['Saved', 'No (test run)']);
  if (playback) { const d = Replay.playing.rec?.header?.date; if (d) more.push(['Recorded', new Date(d).toLocaleDateString()]); }
  if (held && /stopped/i.test(document.getElementById('resultTitle').textContent)) more.push(['Why', document.getElementById('resultNote').textContent]);
  $('.sc-more').replaceChildren(...more.map(([k, v]) => { const r = el('div', 'sc-row'); r.append(el('span', '', k), el('b', '', v)); return r; }));
  $('.sc-details').hidden = !more.length;
  $('.sc-details').open = false;
  // the buttons: one primary
  const retry = document.getElementById('restartBtn'), menu = document.getElementById('menuBtn');
  const retryFirst = !win && !playback && !held;
  menu.textContent = win && !playback ? 'Continue' : 'Menu';
  retry.textContent = 'Retry';
  retry.classList.toggle('primary', retryFirst);
  menu.classList.toggle('primary', !retryFirst);
  $('.sc-actions').classList.toggle('retry-first', retryFirst);
  if (retryFirst) $('.sc-actions').prepend(retry); else $('.sc-actions').prepend(menu);
};

// drawn as it comes up; and again a beat later, for what was written after (render/replayui.js's buttons, a ride nudge)
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
  if (e.target?.closest?.('#resultScreen button, #resultScreen summary')) return; // (a focused button: its own press)
  const primary = card.querySelector('.sc-actions .primary');
  if (!primary || primary.offsetParent === null) return;
  e.preventDefault();
  e.stopPropagation();
  if (!e.repeat) primary.click();
}, true);
