// ============================================================================
// THE BANK, as every screen shows it (the owner, 14-Oct: "Remove the decimals from the bank from all screens and
// scale the text with the number of digits"): whole dollars, rounded DOWN (a figure shown is always one the player
// can spend: $99.99 shows $99, never $100), no thousands separators (the bank never had them), and the figure's
// type smaller as it gets longer, so a big bank stays the width of a six-character one ("$12345") and never wraps
// or pushes the row it is in. The menu's top (render/menustage.js), the showroom's two headers (render/showroom.js),
// the car lot's bar and its buy sheet (render/garage.js) and the results line (below) all use this.
// Prices, tips and rewards are not the bank and keep their own wording.
// ============================================================================

// the bank's whole dollars (floor: never more than is there)
export const bankWhole = (amount) => Math.floor(Number(amount) || 0);
// as words: "$1234"
export const bankText = (amount) => '$' + bankWhole(amount);
// the share of its screen's type a figure this long is drawn at: whole up to six characters ("$12345"), then
// smaller in step with its length (seven characters 6/7, ten 0.6), never under half
const FULL = 6;
export const bankScale = (text) => text.length <= FULL ? 1 : Math.max(0.5, FULL / text.length);
// the figure as an element, for a screen's bank box: a span in the box's own type, scaled to its length, on one line
export const bankFigure = (amount) => {
  const text = bankText(amount);
  const figure = document.createElement('span');
  figure.className = 'bank-figure';
  figure.textContent = text;
  const scale = bankScale(text);
  figure.style.whiteSpace = 'nowrap';
  if (scale < 1) figure.style.fontSize = (+scale.toFixed(3)) + 'em';
  return figure;
};

// the results' line ends "|  Bank $1234.56" (game.js writes it: game.js is in the replays' rules fingerprint, so its
// words are put right here, as they are shown, rather than there, which would refuse every replay already saved)
const resultNote = typeof document !== 'undefined' ? document.getElementById('resultNote') : null;
if (resultNote) {
  const tidy = () => {
    const was = resultNote.textContent, now = was.replace(/Bank \$(-?\d+)\.\d+/g, (_, whole) => 'Bank ' + bankText(whole));
    if (now !== was) resultNote.textContent = now;
  };
  new MutationObserver(tidy).observe(resultNote, { childList: true, characterData: true, subtree: true });
}
