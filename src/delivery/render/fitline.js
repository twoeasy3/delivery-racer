// ============================================================================
// FIT ON ONE LINE: a button's words kept on a single line, its type made smaller (half a pixel at a time, never under
// `min`) until they fit its width; again whenever its width changes (a phone turned, the view opened). With the
// words never wrapping the button's height stays put whatever they say: the showroom's "Drive as Good" / "Drive as
// Evil" wrapped to two lines on a 320-wide phone, and switching sides could then move the page (the owner, 14-Oct:
// "The 'Play as Good/Evil' should never wrap as toggling Good/Evil will cause the view to jump"). The element needs
// `white-space: nowrap` and its own width (a flex share, a grid cell), not one taken from its words.
// ============================================================================
const fitted = new WeakMap(); // element -> the width it was last fitted at

const fit = (el, min) => {
  const width = el.clientWidth;
  if (!el.isConnected || !width) return; // (not on show: fitted when it is, by the observer)
  fitted.set(el, width);
  el.style.fontSize = '';
  let size = parseFloat(getComputedStyle(el).fontSize) || 16;
  while (el.scrollWidth > el.clientWidth + 0.5 && size > min) {
    size = Math.max(min, size - 0.5);
    el.style.fontSize = size + 'px';
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
  requestAnimationFrame(() => fit(el, min)); // (once it is in the page and laid out)
  return el;
};
