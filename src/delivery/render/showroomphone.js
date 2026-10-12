// ---- the PHONE showroom (a phone held upright): its own small parts. The owner, 12-Oct: "Two columns of cards, then a
// screen when clicking in. Swipe/tap up or down to switch cars in the single-car view. Same bounce effect." ------------
// The layout is showroom-phone.css (over showroom.css). The single-car screen is render/showroom.js's full view, the
// switching its goTo(offset) (round the list as filtered: showroomData.js stepIn), the landing render/carbounce.js
// through showroomview.js: nothing of those is written twice here. What is here: the list's columns, and the vertical
// SWIPE that switches car (a pure rule, swipeOffset, checked by scripts/.showroom-check.mjs, and the touch listener).
// Pure at import (no DOM touched): the headless check loads it.
export const PHONE_COLUMNS = 2; // (the cards in two columns, scrolled down: showroom-phone.css reads --sr-cols)

// a swipe: at least MIN px up or down, RATIO times more up/down than sideways, in TIME ms at most
export const SWIPE = { min: 48, ratio: 1.4, time: 800 };
// what a finger's move does on the single-car screen: +1 the next car (a swipe UP, as a feed goes on), -1 the one
// before (a swipe DOWN), 0 nothing (a tap, a sideways move, a slow drag, a scroll)
export const swipeOffset = (dx, dy, ms) => Math.abs(dy) < SWIPE.min || Math.abs(dy) < Math.abs(dx) * SWIPE.ratio || ms > SWIPE.time ? 0 : dy < 0 ? 1 : -1;

// the scrollable boxes a touch began in, and their scroll then (a swipe that scrolled one is a scroll, not a switch)
const scrollers = (target, root) => {
  const list = [];
  for (let node = target; node && node !== root.parentNode; node = node.parentNode) {
    if (node.nodeType === 1 && node.scrollHeight > node.clientHeight + 1) list.push([node, node.scrollTop]);
  }
  return list;
};
// swipeSwitch(el, { skip, go }): a quick vertical swipe on el calls go(+1 / -1), unless skip(target) (the live car's
// picture: a drag there turns the car, never switches; or not on a phone, or the screen not up). Touch events,
// passive: nothing is stopped, so a tap stays a tap and the words' box still scrolls on a small phone. (Touch, not
// pointer events: a vertical move under touch-action: pan-y cancels the pointer at once.)
export const swipeSwitch = (el, { skip = () => false, go }) => {
  let start = null;
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || skip(e.target)) { start = null; return; }
    const touch = e.touches[0];
    start = { x: touch.clientX, y: touch.clientY, t: performance.now(), id: touch.identifier, scrolled: scrollers(e.target, el) };
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (!start) return;
    const s = start, touch = [...e.changedTouches].find(t => t.identifier === s.id);
    start = null;
    if (!touch || s.scrolled.some(([node, top]) => Math.abs(node.scrollTop - top) > 2)) return;
    const offset = swipeOffset(touch.clientX - s.x, touch.clientY - s.y, performance.now() - s.t);
    if (offset) go(offset);
  }, { passive: true });
  el.addEventListener('touchcancel', () => { start = null; }, { passive: true });
};
