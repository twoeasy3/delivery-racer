// ESCAPE PAUSES A RUN (CHECKLIST 456, part 3; the owner: "The game should pause when pressing Escape."). Escape during a run is the
// Pause button and P (Game.togglePause: the same pause, its PAUSED banner and Resume / Photo / Exit level buttons, its silence, the
// sim clock and the replay frozen with it); Escape again resumes. Before this, Escape did nothing in a run (only photo mode's: back
// to the pause). Escape keeps every other meaning it has: it toggles the pause ONLY while a level is being played (not the
// screensaver, a cine still, the free camera), nothing modal is up (a dialog, a cutscene, a sheet or screen over the run: those take
// Escape first, in their own capture listeners, or are seen here), photo mode is not on (its Escape goes back to the pause, as
// before), and the key is not being typed into a field. Render-side only: game.js and input.js (in the replay fingerprint) untouched.
import { Game } from '../game.js';
import { Replay } from '../replay.js';
import { Fly } from './fly.js';
import { Cinematic } from './scene.js';

const photoOn = () => !!document.body?.classList?.contains?.('photo'); // (photo mode, render/photo.js: its class on the page)
// something over the run that has Escape for its own (or a screen in front of it)
const MODAL = '.overlay:not(.hidden), .menu-dialog, .pack-reveal, .pack-contents, .ucine, [role="dialog"]:not(.hidden)';
const modalUp = () => {
  for (const el of document.querySelectorAll(MODAL)) if (el.getClientRects().length && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden') return true;
  return false;
};
export const escapePauses = () => Game.state === 'playing' && !Game.screensaver && !Game.inMenu && !photoOn() && !Fly.on && !Cinematic.on
  && !Replay.playing?.over && !modalUp();

// (the state at the start of the key's journey, before photo mode's own Escape takes it out of photo mode and to the pause)
let free = false;
window.addEventListener('keydown', (e) => { if (e.code === 'Escape' || e.key === 'Escape') free = escapePauses(); }, true);
window.addEventListener('keydown', (e) => {
  if (!(e.code === 'Escape' || e.key === 'Escape') || e.repeat || e.defaultPrevented) return;
  const typing = e.target?.closest?.('input, textarea, select, [contenteditable="true"]');
  if (!free || typing || !escapePauses()) return;
  free = false;
  e.preventDefault();
  Game.togglePause();
});
