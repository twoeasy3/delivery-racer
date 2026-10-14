// ---- the BLUEPRINT CARD: one car's card, after Asphalt 9's blueprint cards (the owner, 12-Oct), in this game's look ----
// A light portrait card with a slim border and a drop shadow; the upper part a picture on diagonal stripes in the
// card's RARITY colour (Common grey, Uncommon green, Epic purple, Legendary gold, Bespoke the rainbow), the car drawn
// large in one of its four poses (carposes.js, carstill.js: the live-rendered still, never the old carshots photos);
// the car's stars at the lower right of the picture (clear of the tab at any count); a black tab at the top right,
// BLUEPRINT (or CAR KEY for a Bespoke key card, whose picture is the KEY: keycard.js), with a green xN (card.n: how many of that card; every card is its own
// today, so x1: packs.js revealCards); a black strip at the lower left of the picture with the RARITY WORD (Common,
// Uncommon, Epic, Legendary, Bespoke: the card's rarity, packs.json, the colours the Shop shows); the name below in two
// lines: the small line what kind of car it is (Garage Car, Blueprint Car, Key Car, Car Key: makerLine), the big line its
// name in capitals. A NEW badge
// for a first copy, FEATURED for a special pack's featured card. The compact card (the "What's inside" sheet) has a foot
// with its chance; the reveal puts progressBar() under each card.
// blueprintCard(car, card, opts) gives { node, pic }: the caller draws the picture (carstill.js drawSoon / stillsIn) at
// opts.pose, so a screen draws only what is in view, a few a frame, from the one shared renderer.
import '../blueprintcard.css';
import { stars, starColour } from '../cars.js';
import { Ecu } from '../ecu.js';
import { barFill } from './barfill.js';
import { keyPicture } from './keycard.js'; // (a KEY card's picture: the car's key, not the car)

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
const safe = (f, fallback) => { try { return f(); } catch { return fallback; } };
export const RARITY_LETTER = { common: 'C', uncommon: 'U', epic: 'E', legendary: 'L', bespoke: 'B' };
const RARITY_WORD = { common: 'Common', uncommon: 'Uncommon', epic: 'Epic', legendary: 'Legendary', bespoke: 'Bespoke' };

// the small line over the name (the owner, 12-Oct): what KIND of car the card is for, never what it is based on:
//   Garage Car   one the car lot sells (the garage's own cars)
//   Blueprint Car  one that is only ever got from blueprints (the evergreen fillers)
//   Key Car      a Bespoke key car (the Silver Comet and the like): the card is for its blueprints
//   Car Key      the key card itself
export const makerLine = (car, key = false) => {
  if (key) return 'Car Key';
  if (car.bespoke || car.event) return 'Key Car';
  if (car.earned) return 'Special Car'; // (an earned car: the showroom's Special kind)
  return safe(() => Ecu.isBlueprint(car), false) ? 'Blueprint Car' : 'Garage Car';
};

// card: { rarity, key, n (the xN; 0 or undefined: none), isNew, featured } ; opts: { compact (the contents sheet's),
// chance (words for the compact foot), marks (nodes), pose, dark (a blacked-out car's card, the showroom's Where to get it:
// its picture, car or key, a black silhouette (.silhouette) and its name withheld, 'Locked car', as the blacked-out
// showroom card; nothing on the card names it: no data-car, no name in its label) }
export const blueprintCard = (car, card, { compact = false, chance = null, marks = [], pose = 'front', dark = false } = {}) => {
  const rarity = card.rarity || 'common';
  const pic = make('div', 'bp-pic' + (dark ? ' silhouette' : ''));
  const st = stars(car) ? make('span', 'bp-stars', stars(car)) : null; // (an event car has no stars: its small line says so)
  st?.style.setProperty('color', starColour(car));
  st?.setAttribute('data-n', String(stars(car).length)); // (five or six stars: set a size smaller so they clear the rarity word)
  const tab = make('span', 'bp-tab', make('b', '', card.key ? 'CAR KEY' : 'BLUEPRINT'));
  const letter = make('span', 'bp-letter', RARITY_WORD[rarity] || rarity); // (the word, not a letter: Common, Uncommon...)
  letter.title = RARITY_WORD[rarity] || rarity;
  // a KEY card shows the car's KEY (render/keycard.js draws it, lazily, by itself); the `pic` handed back is then a
  // stand-in kept out of the page, so the caller's car still (carstill.js) is never drawn on a key card
  const count = card.n ? make('span', 'bp-amount', make('small', '', '×'), make('b', '', String(card.n))) : null; // (how many of it the slot gave: the card's own data, packs.json)
  const art = make('div', 'bp-art', card.key ? keyPicture(car, rarity, { dark }) : pic, st, tab, letter, count,
    card.isNew && !card.key ? make('span', 'bp-new', 'NEW') : null,
    card.featured ? make('span', 'bp-featured', 'Featured') : null);
  const name = make('div', 'bp-name', make('small', '', makerLine(car, card.key)), make('strong', '', dark ? 'Locked car' : car.name));
  const foot = compact ? make('div', 'bp-foot chance', chance !== null ? make('b', '', chance) : null, ...marks) : null;
  const kind = card.key ? '' : car.bespoke || car.event ? ' kind-key' : safe(() => Ecu.isBlueprint(car), false) ? ' kind-blueprint' : ''; // (a card of a Blueprint car or a Key car: a background of its own, so it reads as working differently)
  const node = make('div', 'bp-card r-' + rarity + kind + (compact ? ' compact' : '') + (card.key ? ' key' : '') + (card.featured ? ' featured' : '') + (dark ? ' dark' : '') + ' pose-' + pose,
    art, name, foot);
  if (!dark) node.dataset.car = car.id;
  node.setAttribute('aria-label', (RARITY_WORD[rarity] || rarity) + ' ' + (card.key ? 'key' : 'blueprint') + ': ' + (dark ? 'Locked car' : car.name) + (card.n > 1 ? ', ×' + card.n : '') + (card.isNew ? ', new' : ''));
  return { node, pic };
};

// ---- the progress bar under a revealed card (the owner, 12-Oct): the car's ECU pips and its blueprints toward the next
// ECU (n/X), standing where they were BEFORE this card; land() fills it to where they are AFTER (animated, or at once).
// A card that unlocked the car (a blueprint car's first ECU, a key car's key) GLOWS with "UNLOCKED!". A card that took the blueprints
// up to an ECU not bought yet does NOT glow (the owner, 14-Oct: the ECU UP glow and cinematic are the PURCHASE's, render/ecuupgrade.js):
// the bar reads FULL and overfilled (barfill.js), the new pip is outlined and a small quiet "Upgrade ready" is written under it.
// A car at its top shows MAX. p: packs.js revealProgress's entry for the card
const wordsOf = (s) => (s.over ? 'READY' : s.ecu >= s.max ? 'MAX' : s.have + '/' + s.toNext);
export const readyWords = (s) => (s.ecu >= s.max ? 'Upgrade ready · MAX ECU' : 'Upgrade ready · ECU ' + (s.bought + 1));
export const progressBar = (p, card) => {
  if (!p?.before) return { node: make('div', 'bp-prog none'), land() {}, step() {} };
  const { before, after } = p;
  const steps = p.steps?.length ? p.steps : [after]; // (where it stands after each copy the slot gave: the bar fills copy by copy)
  const pips = make('span', 'bp-pips');
  const pipsFor = (s) => [...pips.children].forEach((pip, i) => { pip.classList.toggle('on', i < s.bought); pip.classList.toggle('ready', i >= s.bought && i < s.ecu); });
  for (let i = 1; i <= after.max; i++) pips.append(make('i'));
  pipsFor(before);
  const fill = make('i');
  fill.style.width = barFill(before).pct + '%';
  const count = make('small', 'bp-count', wordsOf(before));
  const label = make('b', 'bp-up');
  const node = make('div', 'bp-prog' + (before.ecu >= before.max ? ' max' : '') + (before.over ? ' over' : ''), pips, make('span', 'bp-track', fill), count, label);
  node.title = card.key ? 'The key' : 'Blueprints toward the next ECU';
  let shown = 0, wrap = 0; // (copies on the bar so far; a pending wrap's timer)
  const empty = () => { fill.style.transition = 'none'; fill.style.width = '0%'; void fill.offsetWidth; fill.style.transition = ''; }; // (once an ECU, not a frame)
  // step(k): the bar to where it stands after k copies (land(): all of them). It glows only from the copy that unlocks the car; the
  // copy that reaches an ECU not bought shows the quiet "Upgrade ready" and the overfilled bar
  const step = (k, instant = false) => {
    k = Math.min(steps.length, Math.max(0, k));
    if (k <= shown) return;
    const was = shown ? steps[shown - 1] : before, to = steps[k - 1];
    shown = k;
    if (wrap) { clearTimeout(wrap); wrap = 0; empty(); } // (a wrap still running: the bar starts the next ECU from empty now)
    node.classList.toggle('instant', instant);
    const wrapped = !instant && to.ecu > was.ecu && !barFill(to).full; // (an ECU reached and bought: the bar runs full, then starts the next)
    const finish = () => {
      fill.style.width = barFill(to).pct + '%';
      count.textContent = wordsOf(to);
      pipsFor(to);
      node.classList.toggle('max', to.ecu >= to.max);
      node.classList.toggle('over', !!to.over);
      const unlocks = !before.unlocked && to.unlocked;
      if (unlocks) {
        label.textContent = card.key ? 'KEY: UNLOCKED!' : 'UNLOCKED!';
        node.classList.add('glow');
        node.classList.remove('ready');
      } else if (to.over) {
        label.textContent = readyWords(to);
        node.classList.add('ready');
      }
    };
    if (wrapped) {
      fill.style.width = '100%';
      wrap = setTimeout(() => { wrap = 0; empty(); finish(); }, k < steps.length ? 150 : 380); // (mid-flicks: a short run to full)
    } else if (instant) finish();
    else requestAnimationFrame(finish);
  };
  return { node, step, land: (instant = false) => step(steps.length, instant) };
};
