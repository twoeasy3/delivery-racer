// ---- the postcard album: a panel over the start screen (the Album button) ---------------------------------
// A postcard for every level on the menu, earned by delivering it on either side: the level's picture
// (the menu's own, levelshots/<id>.jpg) in a white border, its name hand-written, and a stamp in the
// corner with the side(s) it was delivered on and the best time to spare. Locked ones are grey blanks.
// ?album opens it straight away; ?album&unlock shows every postcard as earned, for a look.
import { LEVELS } from '../levels.js';
import { levelName } from '../levelText.js';
import { Progress } from '../progress.js';
import { Game, formatTime } from '../game.js';
import { LEVEL_SHOTS } from './menu.js';

const panel = document.getElementById('album');
const startScreen = document.getElementById('startScreen');
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// what a level's postcard says: null if it isn't earned yet
const earned = (level, pretend) => {
  const good = Progress.bestTime(level.id, false), evil = Progress.bestTime(level.id, true);
  if (pretend && good === undefined && evil === undefined) return { side: 'both', label: 'Good & Evil', spare: 0 };
  if (good === undefined && evil === undefined) return null;
  const side = good !== undefined && evil !== undefined ? 'both' : good !== undefined ? 'good' : 'evil';
  return { side, label: { both: 'Good & Evil', good: 'Good', evil: 'Evil' }[side], spare: Math.max(good ?? -Infinity, evil ?? -Infinity) };
};

const build = (pretend) => {
  const cards = LEVELS.map((level, i) => {
    const got = earned(level, pretend);
    const card = el('div', 'postcard' + (got ? '' : ' locked'));
    card.style.setProperty('--tilt', ((i % 3) - 1) * 1.5 + 'deg'); // (laid out a little askew, as on a table)
    const photo = el('div', 'photo');
    if (got && LEVEL_SHOTS[level.id]) photo.style.backgroundImage = `url("${LEVEL_SHOTS[level.id]}")`;
    card.appendChild(photo);
    if (got) {
      const caption = el('div', 'caption', 'Greetings from ' + levelName(level));
      card.appendChild(caption);
      const stamp = el('div', 'stamp ' + got.side, got.label);
      stamp.appendChild(el('small', '', formatTime(got.spare) + ' to spare'));
      card.appendChild(stamp);
    } else {
      card.appendChild(el('div', 'caption', 'Deliver ' + levelName(level) + ' to earn this postcard'));
    }
    return card;
  });
  const have = LEVELS.filter(level => earned(level, pretend)).length;
  const bar = el('div', 'bar');
  bar.appendChild(el('strong', '', 'Postcards'));
  bar.appendChild(el('span', 'count', have + ' of ' + LEVELS.length + ' postcards'));
  const close = el('button', 'level', 'Close');
  close.addEventListener('click', () => Album.close());
  bar.appendChild(close);
  const grid = el('div', 'postcards');
  grid.append(...cards);
  panel.replaceChildren(bar, el('p', '', 'A postcard from every level you deliver on time, Good or Evil.'), grid);
};

export const Album = {
  isOpen: false,
  open(pretend = false) {
    build(pretend);
    this.isOpen = true;
    Game.inMenu = true; // (Enter must not start a run from here)
    panel.classList.remove('hidden');
    panel.scrollTop = 0;
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    Game.inMenu = false;
    panel.classList.add('hidden');
    startScreen.classList.remove('hidden');
  },
};

document.getElementById('albumBtn').addEventListener('click', () => Album.open());
window.addEventListener('keydown', (event) => { if (Album.isOpen && event.key === 'Escape') Album.close(); });
// (?album in the address: open at once, for a look or a screenshot; not with a run started by ?autostart and the like)
const params = new URLSearchParams(location.search);
if (params.get('album') !== null && Game.state === 'start') Album.open(params.get('unlock') !== null);
