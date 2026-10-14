// ============================================================================
// FIT ON ONE LINE: a button's words kept on a single line, its type made smaller (worked out once, in half pixels, never under
// `min`) until they fit its width; again whenever its width changes (a phone turned, the view opened). With the
// words never wrapping the button's height stays put whatever they say: the showroom's "Drive as Good" / "Drive as
// Evil" wrapped to two lines on a 320-wide phone, and switching sides could then move the page (the owner, 14-Oct:
// "The 'Play as Good/Evil' should never wrap as toggling Good/Evil will cause the view to jump"). The element needs
// `white-space: nowrap` and its own width (a flex share, a grid cell), not one taken from its words.
// ============================================================================
const fitted = new WeakMap(); // element -> the width it was last fitted at

const over = (el) => el.scrollWidth > el.clientWidth + 0.5;

// The size is worked out, not searched for a half pixel at a time (each step wrote the style and read scrollWidth: a
// reflow of the whole page, a dozen of them on every showroom car switch). A line of type is as wide as its size, bar
// the button's own padding, so one measure at the natural size gives the size that fits; then the answer is checked
// (a reflow) and moved by half pixels, down while it still overflows and up while one more half pixel still fits, so it
// lands on the very size the old loop did: the biggest of `natural - n/2` that fits, never under `min`.
const fit = (el, min) => {
  const width = el.clientWidth;
  if (!el.isConnected || !width) return; // (not on show: fitted when it is, by the observer)
  fitted.set(el, width);
  el.style.fontSize = '';
  const cs = getComputedStyle(el);
  const natural = parseFloat(cs.fontSize) || 16;
  if (!over(el) || natural <= min) return;
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  const need = el.scrollWidth - pad, room = width - pad;
  let size = need > 0 && room > 0 ? natural * room / need : min;
  size = Math.min(natural, Math.max(min, natural - Math.ceil((natural - size) / 0.5) * 0.5));
  el.style.fontSize = size + 'px';
  while (over(el) && size > min) { size = Math.max(min, size - 0.5); el.style.fontSize = size + 'px'; }
  while (size + 0.5 <= natural) { // (one more half pixel, if it still fits: usually a single extra check)
    el.style.fontSize = size + 0.5 + 'px';
    if (over(el)) { el.style.fontSize = size + 'px'; break; }
    size += 0.5;
  }
};

const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
  for (const { target } of entries) if (fitted.get(target) !== target.clientWidth) fit(target, +target.dataset.fitMin || 11);
}) : null;

export const fitLine = (el, min = 11) => {
  el.dataset.fitMin = min;
  fitted.delete(el);
  observer?.observe(el);
  fit(el, min);
  requestAnimationFrame(() => { if (fitted.get(el) !== el.clientWidth) fit(el, min); }); // (once it is in the page and laid out)
  return el;
};
