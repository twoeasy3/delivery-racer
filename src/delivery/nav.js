// ---- the back button (browser, phone): each screen the player opens from the menu pushes a history entry, and back
// closes the top one, so back goes to the screen the player came from. The menu is the base: it has no entry of its
// own, so on a first visit back leaves the site as it always did. Screens: 'run' (a level, its results, the
// screensavers), 'garage', 'sheet' (options, "what's on this road"), 'album', 'milestones', 'dialog' (render/dialog.js:
// back is its Cancel). (From WIP/delivery-garagetiers.patch, where it was never tried in a browser; the owner, 11-Oct)
// enter(name, close): the screen opened; close() is what back does to it. leave(name): the screen was closed by its
// own button (or Escape); its entry is taken off the history. Both are safe to call twice.
// Every entry this page makes says how deep it is ({ dr: n }, the menu's own 0) and which load of the page made it
// (t), and back goes BY THAT: it closes the screens above the depth landed on. So an entry left by an earlier load (the
// page reloaded with a screen open, or a phone that dropped the tab and loaded it again: history.state outlives the
// page) or one stepped FORWARD onto (a screen already closed by its own Back button) never makes back do nothing or
// leave a screen up: the menu's entry is taken over when the page loads, entries of an earlier load below it are
// stepped over, and a forward step onto a closed screen's entry is stepped back. (CHECKLIST: back to the menu
// cleanly, 13-Oct; scripts/.nav-check.mjs drives this with a stand-in history)
const stack = [];   // [{ name, close, pushed }]: the screens open, the bottom one first
const load = Math.random().toString(36).slice(2, 10); // (this load of the page: its entries are told from older ones)
let pending = 0;    // history.go calls of ours on their way: entries are not pushed until they land
let stuck = 0;      // (a timer: a history.go that never lands must not hold the pushing back for good)
const ours = (state) => !!state && state.t === load && Number.isInteger(state.dr);
const depth = () => stack.filter(entry => entry.pushed).length; // (the entries of ours above the menu's)
const flush = () => {
  if (pending > 0) return; // (a history.go is on its way: pushing now would be undone by it)
  stack.forEach((entry) => {
    if (entry.pushed) return;
    try { history.pushState({ dr: depth() + 1, t: load }, ''); entry.pushed = true; } catch { /* (no history to use: the screen just has no back) */ }
  });
};
const go = (n) => {
  if (!n) return;
  pending++;
  clearTimeout(stuck);
  stuck = setTimeout(() => { pending = 0; flush(); }, 1500);
  try { history.go(n); } catch { pending--; }
};
// the menu's entry: the one the page loaded on, whatever an earlier load left in it
try { history.replaceState({ dr: 0, t: load }, ''); } catch { /* (no history) */ }
export const Nav = {
  enter(name, close) {
    if (stack.some(entry => entry.name === name)) return;
    stack.push({ name, close, pushed: false });
    flush();
  },
  leave(name) {
    const i = stack.findIndex(entry => entry.name === name);
    if (i < 0) return;
    const gone = stack.splice(i), n = gone.filter(entry => entry.pushed).length;
    go(-n);
  },
};
window.addEventListener('popstate', (event) => {
  if (pending > 0 && --pending === 0) clearTimeout(stuck);
  const state = event.state;
  if (!ours(state)) {
    // an entry of an earlier load of the page (or one not this page's): below the menu, so back goes on past it; over
    // a screen (it cannot be, but) back closes that screen and the entry becomes its place
    if (!stack.length) { go(-1); return; }
    const entry = stack.pop();
    try { entry.close(); } catch (error) { console.error(error); }
    try { history.replaceState({ dr: depth(), t: load }, ''); } catch { /* (no history) */ }
    flush();
    return;
  }
  // forward onto the entry of a screen already closed: back to where the screens are (not while a history.go of ours
  // is still on its way: two screens closed at once, each its own go(-1), land on the first one's entry on the way)
  if (state.dr > depth()) { if (!pending) go(depth() - state.dr); return; }
  while (depth() > state.dr) {
    const entry = stack.pop();
    try { entry.close(); } catch (error) { console.error(error); }
  }
  flush();
});
window.__navDebug = () => ({ stack: stack.map(e => e.name + (e.pushed ? '' : '?')), ignore: pending }); // PROBE-ONLY
