// ---- the hidden levels menu: Options > Hidden levels (the owner, 15-Oct) ------------------------------------------------------
// One card per level of HIDDEN_LEVELS that is a real level (levels.js playableHidden: so a hidden level added later is listed with
// no change here): its menu picture (levelshots/<id>.jpg, else a plain block), its name, ONE line from its own description (the
// first sentence of levelText.json's, cut short), a tag line (its theme, 'Race', 'Event map') and a Play button. Play is the
// address ?hidden=<id> itself (the page is loaded again, as the address does it): a run that BANKS NOTHING (game.js: no tip, no best
// time, no medal, no next level; the result says 'test run: nothing saved'). This code never touches Progress.
// ?hiddenlevels in the address opens it at once, for a look.
import { playableHidden } from '../levels.js';
import { levelName, levelDescription } from '../levelText.js';
import { Game } from '../game.js';
import { Nav } from '../nav.js';
import { LEVEL_SHOTS } from './menustage.js';
import '../hiddenlevels.css';

const panel = document.getElementById('hiddenLevels');
const el = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
};
// the first sentence of the level's words, kept to one short line
export const oneLine = (text, max = 70) => {
  const first = String(text || '').trim().split(/(?<=[.!?])\s/)[0].split(/:\s/)[0].trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max - 1), at = cut.lastIndexOf(' ');
  return (at > 30 ? cut.slice(0, at) : cut).replace(/[,;:\s]+$/, '') + '\u2026';
};
const cap = (word) => word ? (word[0].toUpperCase() + word.slice(1)).replace(/([a-z])([A-Z])/g, '$1 $2') : ''; // ('singaporeNight' -> 'Singapore Night')
// what the menu says about each hidden level (also what the check reads): { id, name, line, tags, shot, href }
export const hiddenEntries = (evil = false) => playableHidden().map(({ id, level, event }) => ({
  id, name: levelName(level), line: oneLine(levelDescription(level, evil)),
  tags: [cap(level.theme), level.grid ? 'Race' : '', event ? 'Event map' : ''].filter(Boolean),
  shot: LEVEL_SHOTS[id] || '', href: location.pathname + '?hidden=' + encodeURIComponent(id) + (evil ? '&evil' : ''),
}));

const build = () => {
  const evil = !!Game.evil;
  const back = el('button', 'hl-back', '\u2039 Options');
  back.type = 'button';
  back.addEventListener('click', () => HiddenLevels.close(true));
  const bar = el('div', 'hl-bar', back, el('h2', '', 'Hidden levels'));
  const note = el('p', 'hl-note', 'Hidden levels bank nothing: no tips, medals or best times.');
  const list = el('div', 'hl-list');
  for (const e of hiddenEntries(evil)) {
    const pic = el('div', 'hl-pic' + (e.shot ? '' : ' none'));
    if (e.shot) { pic.style.backgroundImage = 'url("' + e.shot + '")'; pic.setAttribute('role', 'img'); pic.setAttribute('aria-label', e.name); }
    const play = el('a', 'hl-play', 'Play');
    play.href = e.href;
    play.setAttribute('aria-label', 'Play ' + e.name + ' (banks nothing)');
    list.append(el('article', 'hl-card', pic,
      el('div', 'hl-info', el('b', '', e.name), e.line ? el('p', '', e.line) : null, e.tags.length ? el('small', '', e.tags.join(' \u00b7 ')) : null), play));
  }
  if (!list.children.length) list.append(el('p', 'hl-note', 'No hidden levels right now.'));
  panel.replaceChildren(bar, note, list);
};

export const HiddenLevels = {
  isOpen: false,
  open() {
    build();
    this.isOpen = true;
    Game.inMenu = true; // (Enter must not start a run from here)
    Nav.enter('hiddenLevels', () => this.close(true)); // (the back button closes it, to the Options)
    panel.classList.remove('hidden');
    panel.scrollTop = 0;
  },
  // toBack: the Options sheet is opened again (its Back button, the back key); Escape does the same
  close(toOptions = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    Nav.leave('hiddenLevels');
    Game.inMenu = false;
    panel.classList.add('hidden');
    if (toOptions) document.getElementById('optionsBtn')?.click();
  },
};

document.getElementById('hiddenLevelsBtn')?.addEventListener('click', () => HiddenLevels.open());
window.addEventListener('keydown', (event) => { if (HiddenLevels.isOpen && event.key === 'Escape') HiddenLevels.close(true); });
if (new URLSearchParams(location.search).get('hiddenlevels') !== null && Game.state === 'start') HiddenLevels.open();
