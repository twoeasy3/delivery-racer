// ---- one sound for every click on a menu ------------------------------------------------------------
// The "Plop Up" WAV (audio.js: menuClick) plays for each click on a control of the start screen, the garage, a
// sheet, a panel or a dialog: a button, chip, toggle, tab, card or thumbnail (anything the pointer shows as
// clickable). Not for a hover, not for the controls of a run, and not a second time where the menu has played
// its own (menustage.js: a step, a choice made, both the same WAV). Muted, Sound.play is silent.
import { Sound } from './audio.js';

const SCOPE = '#startScreen, #garageUi, .overlay, .menu-dialog, #album, #roadCard, #milestonesPanel';
const CONTROL = 'button, [role="button"], [role="tab"], [role="option"], select, summary, label, a[href], input';
const clickable = (el) => {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches(CONTROL)) return !n.disabled;
    if (n.matches(SCOPE)) return false;
    if (getComputedStyle(n).cursor === 'pointer') return true;
  }
  return false;
};
document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest(SCOPE) || target.closest('#touchControls')) return;
  if (performance.now() - Sound.menuAt < 90) return; // (the menu's own blip has just played)
  if (!clickable(target)) return;
  Sound.play('menuClick', 0.5);
});
