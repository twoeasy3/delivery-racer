// ---- the game's own dialog: in place of the browser's confirm() and alert() ---------------------------
// ask({ title, lines, ok, cancel, danger }) -> Promise<boolean> (true: the OK button; Escape, a tap outside it or
// Cancel: false). tell({ title, lines, ok }) -> Promise<void>: one button, for something said. `lines` are
// paragraphs of text (or nodes). Enter answers OK, Escape cancels; the keys are taken ahead of everything else while
// it is up (the menu's Enter must not start a run, the garage's arrows must not scroll), and Game.inMenu is held.
// Phone: the buttons are large and stacked in a narrow screen; the box never wider than the screen.
import '../menus.css';
import { Game } from '../game.js';

let open = null; // the dialog up: { close }
export const ask = ({ title = '', lines = [], ok = 'OK', cancel = 'Cancel', danger = false } = {}) => new Promise((resolve) => {
  if (open) open.close(false);
  const backdrop = document.createElement('div');
  backdrop.className = 'menu-dialog';
  const box = document.createElement('div');
  box.className = 'dialog-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const head = document.createElement('h2');
  head.textContent = title;
  box.append(head);
  for (const line of lines) {
    const p = document.createElement('p');
    if (line instanceof Node) p.append(line); else p.textContent = line;
    box.append(p);
  }
  const row = document.createElement('div');
  row.className = 'dialog-buttons';
  const button = (text, value, className) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.className = className;
    b.addEventListener('click', () => done(value));
    return b;
  };
  const no = cancel ? button(cancel, false, 'dialog-cancel') : null;
  const yes = button(ok, true, 'dialog-ok' + (danger ? ' danger' : ''));
  row.append(...[no, yes].filter(Boolean));
  box.append(row);
  backdrop.append(box);
  const wasInMenu = Game.inMenu, before = document.activeElement;
  const keys = (event) => {
    const code = event.code;
    if (code === 'Escape') done(false);
    else if (code === 'Enter' || code === 'NumpadEnter') {
      // (Enter on the Cancel button presses it; anywhere else it is OK)
      if (document.activeElement === no) return event.stopPropagation(); // (the button's own click follows)
      done(true);
    } else if (code === 'Tab') {
      const stops = [...row.querySelectorAll('button')], at = stops.indexOf(document.activeElement);
      stops[(at + (event.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
    } else return event.stopImmediatePropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const done = (value) => {
    if (open?.backdrop !== backdrop) return;
    open = null;
    window.removeEventListener('keydown', keys, true);
    window.removeEventListener('keyup', swallow, true);
    backdrop.remove();
    Game.inMenu = wasInMenu;
    before?.focus?.({ preventScroll: true });
    resolve(value);
  };
  const swallow = (event) => { if (['Enter', 'Escape', 'NumpadEnter'].includes(event.code)) event.stopImmediatePropagation(); };
  backdrop.addEventListener('pointerdown', (event) => { if (event.target === backdrop && cancel) done(false); });
  open = { backdrop, close: done };
  Game.inMenu = true;
  window.addEventListener('keydown', keys, true);
  window.addEventListener('keyup', swallow, true);
  document.body.append(backdrop);
  yes.focus();
});
export const tell = (options) => ask({ ...options, cancel: '' }).then(() => {});
