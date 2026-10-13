// A check of the back button's history (src/delivery/nav.js: Nav.enter / Nav.leave and its popstate), headless, with a
// stand-in for the browser's history: entries, a position, pushState / replaceState, and history.go done later (queued,
// each step from where the last one left, as a browser does), its popstate sent to the page. Covers: back closes the
// top screen and only it; a screen over a screen (the Shop over the showroom, the full view, the car lot); a screen's
// own Back button (Nav.leave: its entry taken off, the next back closes the screen under it); two screens closed at
// once (the showroom from its full view: two go(-1) on their way); a screen opened while a go is on its way; a back
// pressed while one is on its way; back from the menu leaves the site; a second round the same as the first; FORWARD
// onto the entry of a screen already closed (stepped back, nothing opens); the page LOADED AGAIN on a screen's entry
// (a reload, a phone that dropped the tab): the next back closes the screen opened since, not nothing, and back from
// the menu steps over the old load's entries and leaves the site. (CHECKLIST: back to the menu cleanly, 13-Oct)
//   node scripts/.nav-check.mjs
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const NAV = pathToFileURL(resolve('src/delivery/nav.js')).href;

// ---- the stand-in browser ----
const entries = [{ state: null, page: 'other site' }]; // (the page before: back to it leaves the site)
let at = 0, left = false, queue = [], loads = 0;
const history = {
  get state() { return entries[at].state; },
  get length() { return entries.length; },
  pushState(state) { entries.splice(at + 1); entries.push({ state: structuredClone(state), page: 'game' }); at++; },
  replaceState(state) { entries[at].state = structuredClone(state); },
  go(n) { queue.push(n); },
  back() { queue.push(-1); },
};
globalThis.history = history;
const settle = () => { // (the queued history.go calls, one by one, each one's popstate before the next)
  for (let guard = 0; queue.length && guard < 50; guard++) {
    const n = queue.shift(), to = at + n;
    if (to < 0 || to >= entries.length) continue;
    at = to;
    if (entries[at].page !== 'game') { left = true; queue = []; return; }
    const event = new Event('popstate');
    event.state = entries[at].state;
    window.dispatchEvent(event);
  }
};
const press = (n = -1) => { history.go(n); settle(); }; // (the phone's back, or forward)
let Nav;
const loadPage = async () => { // (the page loaded, or loaded again where it is: a new window, a new nav.js)
  globalThis.window = new EventTarget();
  if (!entries[at] || entries[at].page !== 'game') { entries.splice(at + 1); entries.push({ state: null, page: 'game' }); at = entries.length - 1; }
  left = false;
  ({ Nav } = await import(NAV + '?load=' + (++loads)));
};
// a screen: open() enters it, close() is what its Back button (or back) does
const screens = {};
const screen = (name) => (screens[name] ??= {
  open: false, closes: 0,
  show() { this.open = true; Nav.enter(name, () => this.close()); },
  close() { if (!this.open) return; this.open = false; this.closes++; Nav.leave(name); }, // (as the screens do: leave() after a back finds nothing)
});
const shop = screen('shop'), room = screen('showroom'), full = screen('showroomFull'), lot = screen('garage'), contents = screen('packcontents');
const openNow = () => Object.keys(screens).filter(k => screens[k].open).join(',') || 'menu';
const depth = () => history.state?.dr;

try {
  await loadPage();
  check(depth() === 0 && openNow() === 'menu', 'the page takes the entry it loaded on as the menu\'s (depth 0)');

  for (const round of [1, 2]) {
    const r = ' (round ' + round + ')';
    shop.show(); settle();
    check(depth() === 1, 'the Shop pushes an entry' + r);
    press(); check(openNow() === 'menu' && depth() === 0, 'back from the Shop: the menu' + r);

    shop.show(); settle(); shop.close(); settle();
    check(openNow() === 'menu' && depth() === 0, 'the Shop\'s Back: the menu, its entry gone' + r);

    room.show(); full.show(); settle();
    check(depth() === 2, 'the showroom and its full view: two entries' + r);
    press(); check(openNow() === 'showroom' && depth() === 1, 'back from the full view: the cards' + r);
    press(); check(openNow() === 'menu' && depth() === 0, 'back again: the menu' + r);

    room.show(); full.show(); shop.show(); settle();
    shop.close(); settle();
    check(openNow() === 'showroom,showroomFull' && depth() === 2, 'the Shop over the full view, its Back: the full view' + r);
    shop.show(); settle(); press();
    check(openNow() === 'showroom,showroomFull' && depth() === 2, 'the Shop over the full view, back: the full view' + r);
    full.close(); settle();
    check(openNow() === 'showroom' && depth() === 1, 'the full view\'s Back: the cards' + r);
    press(); check(openNow() === 'menu' && depth() === 0, 'back: the menu' + r);

    room.show(); full.show(); lot.show(); settle();
    press(); check(openNow() === 'showroom,showroomFull' && depth() === 2, 'back from the car lot opened from the full view: the full view' + r);
    lot.show(); settle(); lot.close(); settle();
    check(openNow() === 'showroom,showroomFull' && depth() === 2, 'the car lot\'s Back: the full view' + r);
    // the showroom closed from its full view (Drive): two go(-1) on their way at once
    full.close(); room.close(); settle();
    check(openNow() === 'menu' && depth() === 0 && !left, 'two screens closed at once: the menu, not past it' + r);

    shop.show(); contents.show(); settle();
    press(); check(openNow() === 'shop' && depth() === 1, 'back from "What\'s inside": the Shop' + r);
    press(); check(openNow() === 'menu' && depth() === 0, 'back: the menu' + r);

    // a screen opened while a go is on its way, and a back pressed while one is
    room.show(); shop.show(); settle();
    shop.close(); lot.show(); settle();
    check(openNow() === 'showroom,garage' && depth() === 2, 'a screen opened while a go is on its way gets its entry once it lands' + r);
    press(); check(openNow() === 'showroom' && depth() === 1, '...and back closes only it' + r);
    full.show(); shop.show(); settle();
    shop.close(); history.go(-1); settle();
    check(openNow() === 'showroom' && depth() === 1, 'back pressed while the Shop\'s own go is on its way: the full view closes too' + r);
    press(); check(openNow() === 'menu' && depth() === 0 && !left, 'back: the menu' + r);
    check(Object.values(screens).every(s => !s.open), 'nothing left open' + r);
  }

  // forward onto a closed screen's entry
  shop.show(); settle(); shop.close(); settle();
  press(+1);
  check(openNow() === 'menu' && depth() === 0, 'forward onto the closed Shop\'s entry: stepped back, the menu');
  room.show(); full.show(); settle(); full.close(); room.close(); settle();
  press(+1); press(+1);
  check(openNow() === 'menu' && depth() === 0, 'forward twice after the showroom: the menu');
  shop.show(); settle(); press();
  check(openNow() === 'menu' && depth() === 0, 'then the Shop and back: the menu (not one press lost)');

  press();
  check(left, 'back from the menu leaves the site');

  // the page loaded again on a screen's entry (a reload; a phone that dropped the tab)
  entries.length = 0; entries.push({ state: null, page: 'other site' }); at = 0;
  await loadPage();
  room.show(); full.show(); settle();
  check(depth() === 2, 'the showroom\'s full view up (depth 2)');
  for (const s of Object.values(screens)) s.open = false; // (the page is loaded again here: nothing open)
  await loadPage();
  check(depth() === 0 && openNow() === 'menu', 'loaded again on the full view\'s entry: that entry is the menu\'s now');
  room.show(); settle();
  press();
  check(openNow() === 'menu' && depth() === 0, 'the showroom opened after it, back: the menu (one press)');
  shop.show(); settle(); press();
  check(openNow() === 'menu', 'the Shop, back: the menu');
  press();
  check(left, 'back from the menu steps over the earlier load\'s entries and leaves the site');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
}
console.log(failures ? `\n${failures} FAILED` : '\nall ok');
process.exit(failures ? 1 : 0);
