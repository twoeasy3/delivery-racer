// ---- save codes: the menu's Export save and Import save ----------------------------------------
// A save code is the whole of saved progress as one line of text (Progress.exportCode), to carry from one
// browser to another. Export shows it, selected, with a button to copy it; Import takes one pasted in, and
// swaps the progress here for it. Either way the rest of the menu hears of it by a 'progresschange' window
// event (see render/menu.js), so nothing reloads.
import '../menus.css';
import { ask } from './dialog.js';
import { Progress } from '../progress.js';
import { Game } from '../game.js';

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

// the panel: built the first time it is wanted
let panel = null, title, note, box, act, mode = 'export';
const build = () => {
  panel = make('div', 'save-panel hidden');
  const inner = make('div', 'save-box');
  title = make('strong');
  note = make('p');
  box = make('textarea');
  box.rows = 6;
  box.spellcheck = false;
  box.setAttribute('aria-label', 'Save code');
  const buttons = make('div', 'save-buttons');
  act = make('button', 'level');
  const close = make('button', 'level', 'Close');
  buttons.append(act, close);
  inner.append(title, note, box, buttons);
  panel.append(inner);
  document.body.append(panel);
  close.addEventListener('click', shut);
  panel.addEventListener('click', (event) => { if (event.target === panel) shut(); });
  // (typing in the box is not driving: the game's keys, and the menu's B U S, hear none of it)
  for (const type of ['keydown', 'keyup']) box.addEventListener(type, (event) => event.stopPropagation());
  act.addEventListener('click', () => (mode === 'export' ? copy() : load()));
};
const show = (which) => {
  if (!panel) build();
  mode = which;
  Game.inMenu = true; // (Enter must not start a run from here)
  panel.classList.remove('hidden');
  if (which === 'export') {
    title.textContent = 'Export save';
    note.textContent = 'This code is your bank, levels, best times and cars. Copy it, and paste it into Import save in another browser.';
    box.readOnly = true;
    box.value = Progress.exportCode();
    act.textContent = 'Copy';
    box.focus();
    box.select();
  } else {
    title.textContent = 'Import save';
    note.textContent = 'Paste a save code here. It replaces the progress in this browser.';
    box.readOnly = false;
    box.value = '';
    act.textContent = 'Load this save';
    box.focus();
  }
};
const shut = () => {
  panel.classList.add('hidden');
  Game.inMenu = false;
};
const copy = async () => {
  box.select();
  try {
    await navigator.clipboard.writeText(box.value);
    note.textContent = 'Copied.';
  } catch {
    note.textContent = 'Could not copy it for you: it is selected, so copy it by hand.';
  }
};
const load = async () => {
  if (!box.value.trim()) return;
  if (!await ask({ title: 'Replace progress', lines: ['Replace the progress in this browser with this save?'], ok: 'Replace', danger: true })) return;
  if (!Progress.importCode(box.value)) {
    note.textContent = 'That is not a save code. Nothing was changed.';
    return;
  }
  window.dispatchEvent(new Event('progresschange'));
  shut();
};

document.getElementById('exportBtn')?.addEventListener('click', () => show('export'));
document.getElementById('importBtn')?.addEventListener('click', () => show('import'));
// ?savepanel (or ?savepanel=import) in the address opens it, for a check
{
  const which = new URLSearchParams(location.search).get('savepanel');
  if (which !== null) show(which === 'import' ? 'import' : 'export');
}
