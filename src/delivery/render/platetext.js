// ---- the NUMBER PLATE TEXT: what a player may write on a plate, and the filter (the owner, 14-Oct: "write your own plate", with a
// filter for abusive or obscene text; CHECKLIST 286). Pure functions, no storage, no DOM: render/platecosmetic.js keeps the chosen text and
// render/cosmeticsui.js has the field.
//   sanitizePlateText(raw)  the typed text cut down to what a plate can show: A-Z 0-9 space dash, upper-cased, at most MAX_LEN characters
//   checkPlateText(raw)     { ok, text, reason }: `text` is the plate to show: the clean text if it passes, else DEFAULT_TEXT.
//                           reason: null (fine), 'empty' (nothing left to show), 'blocked' (the filter said no)
//   blocked(raw)            true if the filter refuses it
// THE FILTER is a BEST-EFFORT, local one (render/plateblocklist.js): the text is made upper case; the symbols people swap for letters
// are put back (0 O, 1 I or L, 3 E, 4 A, 5 S, 7 T, 8 B, @ A, $ S, ! I, + T, and U for V); spaces, dashes and every other mark are taken
// out; a run of the same letter is also tried as one letter (FUUUCK); the text read backwards is tried too (a long word anywhere, a short one only as the whole plate). Every way of reading an
// ambiguous digit (1 as I or as L) is tried. A SUBSTRING word is refused anywhere in what is left; a WHOLE word only as a whole
// word or as the whole plate (so CLASS passes and ASS does not). Limits: a misspelling the list has not met, a word in another
// language, a clever spacing of something that is not in the list, or a harmless word that holds a listed one will be wrong
// either way. Only this browser ever shows the text.
import { SUBSTRING, WHOLE, DIGITS } from './plateblocklist.js';

export const MAX_LEN = 8;
export const DEFAULT_TEXT = 'DELIVERY';

export const sanitizePlateText = (raw) => String(raw ?? '').toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/ {2,}/g, ' ').replace(/-{2,}/g, '-').slice(0, MAX_LEN);

const SYMBOLS = { '@': 'A', $: 'S', '!': 'I', '+': 'T', '|': 'I', '€': 'E', '£': 'L', '¥': 'Y' };
const DIGIT_TO = { 0: ['O'], 1: ['I', 'L'], 3: ['E'], 4: ['A'], 5: ['S'], 7: ['T'], 8: ['B'], 9: ['G'], 2: ['Z'], 6: ['G'] };
// every reading of a word of letters and digits (the ambiguous digit 1 gives two; at most 64 readings)
const readings = (word) => {
  let out = [''];
  for (const ch of word) {
    const options = DIGIT_TO[ch] || [ch];
    const next = [];
    for (const prefix of out) for (const o of options) next.push(prefix + o);
    out = next.length > 64 ? next.slice(0, 64) : next;
  }
  return out;
};
const variants = (letters) => {
  const set = new Set();
  for (const r of readings(letters)) {
    set.add(r);
    set.add(r.replace(/(.)\1+/g, '$1'));      // (FUUUCK)
    set.add(r.replace(/V/g, 'U'));            // (FVCK)
    set.add(r.replace(/PH/g, 'F'));
  }
  return [...set];
};
const reverse = (s) => [...s].reverse().join('');

export const blocked = (raw) => {
  const upper = String(raw ?? '').toUpperCase().replace(/[@$!+|€£¥]/g, (c) => SYMBOLS[c]);
  const stripped = upper.replace(/[^A-Z0-9]/g, '');
  if (!stripped) return false;
  if (DIGITS.some(d => stripped.includes(d.toUpperCase()))) return true;
  const sub = SUBSTRING.map(w => w.toUpperCase());
  for (const v of variants(stripped)) {
    if (sub.some(w => v.includes(w))) return true;
    const back = reverse(v);
    if (sub.some(w => (w.length >= 6 && back.includes(w)) || (w.length >= 4 && back === w))) return true; // (read backwards: a long word anywhere, a short one only as the whole plate: TULSA is not SLUT)
  }
  // whole words: each word between spaces and dashes, and the whole plate
  const whole = new Set(WHOLE.map(w => w.toUpperCase()));
  const words = upper.split(/[^A-Z0-9]+/).filter(Boolean);
  for (const word of [...words, stripped]) for (const v of variants(word)) if (whole.has(v)) return true;
  return false;
};

export const checkPlateText = (raw) => {
  const text = sanitizePlateText(raw).trim().replace(/^-+|-+$/g, '').trim();
  if (!text) return { ok: false, text: DEFAULT_TEXT, reason: 'empty' };
  if (blocked(raw) || blocked(text)) return { ok: false, text: DEFAULT_TEXT, reason: 'blocked' };
  return { ok: true, text, reason: null };
};
