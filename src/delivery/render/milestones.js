// ---- the milestones wall: a panel over the start screen (the Milestones button) --------------------------
// One row per counter in the save (Progress.data.stats: see milestones.js), with its count and its
// milestones (CONFIG.milestones) as plaques, lit once earned and dim until then. Bragging rights only.
// ?milestones opens it straight away; ?milestones&unlock lights every plaque, for a look.
import { CONFIG } from '../config.js';
import { Progress } from '../progress.js';
import { Game } from '../game.js';
import { Message } from '../messages.js';

const panel = document.getElementById('milestones');
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
// the counters on the wall, in this order, with what they are called
const NAMES = {
  levelsDelivered: 'Levels delivered', kmDriven: 'km driven', packagesLanded: 'Packages landed', copsOutrun: 'Cops outrun',
  hipposSurvived: 'Hippos survived', trainsDodged: 'Trains dodged', wrecks: 'Wrecks', busts: 'Busts',
};
const shown = (key, n) => key === 'kmDriven' ? (n < 100 ? n.toFixed(1) : Math.round(n)) : Math.round(n);

const build = (pretend) => {
  const keys = Object.keys(NAMES).filter(key => Array.isArray(CONFIG.milestones[key]));
  let have = 0, all = 0;
  const rows = keys.map(key => {
    const count = pretend ? Infinity : (Progress.data.stats[key] || 0);
    const row = el('div', 'row');
    const counter = el('div', 'counter');
    counter.appendChild(el('strong', '', NAMES[key]));
    counter.appendChild(el('span', '', pretend ? '???' : shown(key, count)));
    row.appendChild(counter);
    const plaques = el('div', 'plaques');
    for (const at of CONFIG.milestones[key]) {
      const lit = count >= at;
      all++;
      if (lit) have++;
      // (the title from messages.json: "100 packages landed: Postie")
      const text = Message.pick('milestones', key + '_' + at) || at + ' ' + NAMES[key].toLowerCase();
      const colon = text.lastIndexOf(': ');
      const plaque = el('div', 'plaque' + (lit ? ' lit' : ''));
      plaque.appendChild(el('b', '', colon > 0 ? text.slice(colon + 2) : text));
      plaque.appendChild(el('small', '', colon > 0 ? text.slice(0, colon) : ''));
      plaques.appendChild(plaque);
    }
    row.appendChild(plaques);
    return row;
  });
  const bar = el('div', 'bar');
  bar.appendChild(el('strong', '', 'Milestones'));
  bar.appendChild(el('span', 'count', have + ' of ' + all + ' earned'));
  const close = el('button', 'level', 'Close');
  close.addEventListener('click', () => MilestonesWall.close());
  bar.appendChild(close);
  const wall = el('div', 'wall');
  wall.append(...rows);
  panel.replaceChildren(bar, el('p', '', 'Counted across every run. Nothing but bragging rights.'), wall);
};

export const MilestonesWall = {
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
  },
};

document.getElementById('milestonesBtn').addEventListener('click', () => MilestonesWall.open());
window.addEventListener('keydown', (event) => { if (MilestonesWall.isOpen && event.key === 'Escape') MilestonesWall.close(); });
// (?milestones in the address: open at once, for a look or a screenshot)
const params = new URLSearchParams(location.search);
if (params.get('milestones') !== null && Game.state === 'start') MilestonesWall.open(params.get('unlock') !== null);
