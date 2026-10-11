// ---- the back button (browser, phone): each screen the player opens from the menu pushes a history entry, and back
// closes the top one, so back goes to the screen the player came from. The menu is the base: it has no entry of its
// own, so on a first visit back leaves the site as it always did. Screens: 'run' (a level, its results, the
// screensavers), 'garage', 'sheet' (options, "what's on this road"), 'album', 'milestones', 'dialog' (render/dialog.js:
// back is its Cancel). (From WIP/delivery-garagetiers.patch, where it was never tried in a browser; the owner, 11-Oct)
// enter(name, close): the screen opened; close() is what back does to it. leave(name): the screen was closed by its
// own button (or Escape); its entry is taken off the history. Both are safe to call twice.
const stack = [];   // [{ name, close, pushed }]
let ignore = 0;     // popstates we caused ourselves (history.go): not a press of back
const flush = () => {
  if (ignore > 0) return; // (a history.go is on its way: pushing now would be undone by it)
  stack.forEach((entry, i) => {
    if (entry.pushed) return;
    try { history.pushState({ dr: i + 1 }, ''); entry.pushed = true; } catch { /* (no history to use: the screen just has no back) */ }
  });
};
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
    if (n) { ignore++; try { history.go(-n); } catch { ignore--; } }
  },
};
window.addEventListener('popstate', (event) => {
  if (ignore > 0) { ignore--; flush(); return; }
  const target = Math.max(0, event.state?.dr ?? 0);
  while (stack.length > target) {
    const entry = stack.pop();
    try { entry.close(); } catch (error) { console.error(error); }
  }
  flush();
});
