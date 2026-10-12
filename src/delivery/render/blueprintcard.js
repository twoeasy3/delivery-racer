// ---- the BLUEPRINT CARD: one car's card, after Asphalt 9's blueprint cards (the owner, 12-Oct), in this game's look ----
// A light portrait card with a slim border and a drop shadow; the upper part a picture on diagonal stripes in the
// card's RARITY colour (Common grey, Uncommon green, Epic purple, Legendary gold, Bespoke the rainbow), the car drawn
// large in one of its three poses (carposes.js, carstill.js: the live-rendered still, never the old carshots photos);
// the car's stars at the lower right of the picture (clear of the tab at any count); a black tab at the top right,
// BLUEPRINT (or CAR KEY for a Bespoke key card, whose picture is the KEY: keycard.js), with a green xN (card.n: how many of that card; every card is its own
// today, so x1: packs.js revealCards); a black square at the lower left of the picture with the RARITY LETTER (C, U, E,
// L, B: the card's rarity, packs.json, the same five the Shop shows); the name below in two lines: the small line what it
// is based on (an idea/filler car's `basedOn`) or what kind of car it is, the big line its name in capitals. A NEW badge
// for a first copy, FEATURED for a special pack's featured card. The compact card (the "What's inside" sheet) has a foot
// with its chance; the reveal puts progressBar() under each card.
// blueprintCard(car, card, opts) gives { node, pic }: the caller draws the picture (carstill.js drawSoon / stillsIn) at
// opts.pose, so a screen draws only what is in view, a few a frame, from the one shared renderer.
import '../blueprintcard.css';
import { stars, starColour } from '../cars.js';
import { Ecu } from '../ecu.js';
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

// the small line: what it is based on, else what kind of car it is
export const makerLine = (car, key = false) => {
  const based = car.basedOn && String(car.basedOn).replace(/\s*\(.*?\)\s*/g, ' ').trim();
  if (based) return based;
  if (key) return 'Key to drive it';
  if (car.event) return 'Event car';
  if (car.earned) return 'Special car';
  return safe(() => Ecu.isBlueprint(car), false) ? 'Blueprint car' : 'Key car';
};

// card: { rarity, key, n (the xN; 0 or undefined: none), isNew, featured } ; opts: { compact (the contents sheet's),
// chance (words for the compact foot), marks (nodes), pose }
export const blueprintCard = (car, card, { compact = false, chance = null, marks = [], pose = 'front' } = {}) => {
  const rarity = card.rarity || 'common';
  const pic = make('div', 'bp-pic');
  const st = car.tier ? make('span', 'bp-stars', stars(car)) : null; // (an event car has no stars: its small line says so)
  st?.style.setProperty('color', starColour(car));
  const tab = make('span', 'bp-tab', make('b', '', card.key ? 'CAR KEY' : 'BLUEPRINT'), card.n ? make('i', 'bp-x', '×' + card.n) : null);
  const letter = make('span', 'bp-letter', RARITY_LETTER[rarity] || '?');
  letter.title = RARITY_WORD[rarity] || rarity;
  // a KEY card shows the car's KEY (render/keycard.js draws it, lazily, by itself); the `pic` handed back is then a
  // stand-in kept out of the page, so the caller's car still (carstill.js) is never drawn on a key card
  const art = make('div', 'bp-art', card.key ? keyPicture(car, rarity) : pic, st, tab, letter,
    card.isNew && !card.key ? make('span', 'bp-new', 'NEW') : null,
    card.featured ? make('span', 'bp-featured', 'Featured') : null);
  const name = make('div', 'bp-name', make('small', '', makerLine(car, card.key)), make('strong', '', car.name));
  const foot = compact ? make('div', 'bp-foot chance', chance !== null ? make('b', '', chance) : null, ...marks) : null;
  const node = make('div', 'bp-card r-' + rarity + (compact ? ' compact' : '') + (card.key ? ' key' : '') + (card.featured ? ' featured' : '') + ' pose-' + pose,
    art, name, foot);
  node.dataset.car = car.id;
  node.setAttribute('aria-label', (RARITY_WORD[rarity] || rarity) + ' ' + (card.key ? 'key' : 'blueprint') + ': ' + car.name + (card.n > 1 ? ', ×' + card.n : '') + (card.isNew ? ', new' : ''));
  return { node, pic };
};

// ---- the progress bar under a revealed card (the owner, 12-Oct): the car's ECU pips and its blueprints toward the next
// ECU (n/X), standing where they were BEFORE this card; land() fills it to where they are AFTER (animated, or at once),
// and where the card unlocked the car or took it up an ECU the bar GLOWS, with "UNLOCKED!" / "ECU 2!" and the new pip
// lit. A car at its top shows MAX. p: packs.js revealProgress's entry for the card
const fillOf = (s) => (s ? Math.round(Math.max(0, Math.min(1, s.have / s.toNext)) * 100) + '%' : '0%');
export const progressBar = (p, card) => {
  if (!p?.before) return { node: make('div', 'bp-prog none'), land() {} };
  const { before, after } = p;
  const pips = make('span', 'bp-pips');
  for (let i = 1; i <= after.max; i++) pips.append(make('i', i <= before.ecu ? 'on' : ''));
  const fill = make('i');
  fill.style.width = before.ecu >= before.max ? '100%' : fillOf(before);
  const words = (s) => (s.ecu >= s.max ? 'MAX' : s.have + '/' + s.toNext);
  const count = make('small', 'bp-count', words(before));
  const label = make('b', 'bp-up');
  const node = make('div', 'bp-prog' + (before.ecu >= before.max ? ' max' : ''), pips, make('span', 'bp-track', fill), count, label);
  node.title = card.key ? 'The key' : 'Blueprints toward the next ECU';
  let landed = false;
  return {
    node,
    land(instant = false) {
      if (landed) return;
      landed = true;
      node.classList.toggle('instant', instant);
      const wrapped = !instant && after.ecu > before.ecu && after.ecu < after.max; // (an ECU reached: the bar runs full, then starts the next)
      const finish = () => {
        fill.style.width = after.ecu >= after.max ? '100%' : fillOf(after);
        count.textContent = words(after);
        [...pips.children].forEach((pip, i) => pip.classList.toggle('on', i < after.ecu));
        if (after.ecu > before.ecu) pips.children[after.ecu - 1]?.classList.add('new');
        node.classList.toggle('max', after.ecu >= after.max);
        if (p.unlocks || p.ecuUp) {
          label.textContent = p.unlocks ? (card.key ? 'KEY: UNLOCKED!' : 'UNLOCKED!') : after.ecu >= after.max ? 'ECU ' + after.ecu + ' · MAX!' : 'ECU ' + after.ecu + '!';
          node.classList.add('glow');
        }
      };
      if (wrapped) {
        fill.style.width = '100%';
        setTimeout(() => { fill.style.transition = 'none'; fill.style.width = '0%'; void fill.offsetWidth; fill.style.transition = ''; finish(); }, 380);
      } else requestAnimationFrame(finish);
    },
  };
};
