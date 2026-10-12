// ---- the PACK REVEAL: a pack opened the moment it is bought or earned (the owner, 12-Oct) ------------------------------
// "The packing page is really clunky and ugly ... when a pack is bought or earned it just opens immediately." There is
// no page of packs held any more: a pack given (the Shop's buy, a Career level's first delivery, a special event's stage
// or prize) asks this screen to open it (Packs.revealer, packs.js), and it does at once where it can: over the Shop, over
// the menu, or over a run's RESULTS as soon as they are up (a beat after, so they are read first). Until it has, the pack
// is held in the save (Progress.data.packs), so a page closed in between opens it at the next menu. Packs.open gives the
// blueprints once, as it opens; this screen only shows them (one pack at a time: no double open from a double tap).
// The look is the Shop's and the Showroom's: a full-screen dark panel, the game's display font, the rarity colours.
// The pack (the Shop's pack art) shakes and bursts; then its cards, BLUEPRINT CARDS (render/blueprintcard.js), each in
// one of the car's three poses, the poses varied so neighbours differ, turn over ON THEIR OWN one after another: a short
// beat each, a longer one and a glow for Epic and above, the last (the best card: packs.js revealOrder) given the most.
// A tap anywhere during it turns all the rest at once; after that only Done (or Next pack) does anything. Under each
// card its car's progress bar fills from before the card to after it, and glows on an unlock or an ECU up.
// Every card is its own card (no stacking today; each tab shows x1). Escape and back close it (all is already given).
// ?pack=career|special|standard|ten opens one at once, for a look, and nothing of it is saved (Progress.noSave);
// &from=<event id> makes a special pack that event's. ?pack&give=career,ten,special:comet-hunt: those packs given
// (nothing saved), opened one after another as a player would see them. &reveal=all: every card turned at once (a tap).
import '../packs.css';
import { Packs, kindName, KINDS, revealCards, revealOrder, revealProgress, RARITIES } from '../packs.js';
import { Progress } from '../progress.js';
import { carById } from '../cars.js';
import { Nav } from '../nav.js';
import { Game } from '../game.js';
import { blueprintCard, progressBar } from './blueprintcard.js';
import { packArt } from './packart.js';
import { drawSoon } from './carstill.js';
import { variedPoses } from '../carposes.js';
import { Sound } from './audio.js';
import { Events } from '../events.js';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
const rank = (r) => RARITIES.indexOf(r);
const blip = (name, v = 0.5) => { try { Sound.play(name, v); } catch { /* (no sound: fine) */ } };
const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const overlay = make('div', 'pack-reveal hidden');
overlay.id = 'packReveal';
overlay.setAttribute('role', 'dialog');
overlay.setAttribute('aria-label', 'Card pack');
document.body.append(overlay);

// TIMING (ms): the pack's burst; a card's beat; an Epic or better card's; the pause before the last card
const T = { pack: 950, beat: 340, rare: 700, last: 650, flip: 420 };
let cur = null; // the pack on show: { result, slots: [{ slot, prog, card }], phase: 'pack' | 'cards' | 'done', timers, wasInMenu }

const later = (ms, f) => { const id = setTimeout(f, still() ? Math.min(ms, 120) : ms); cur.timers.push(id); };
const turn = (i, instant = false) => {
  const s = cur.slots[i];
  if (!s || s.turned) return;
  s.turned = true;
  s.slot.classList.remove('down');
  s.slot.classList.add('shown');
  if (instant) { s.slot.classList.add('instant'); s.prog.land(true); return; }
  if (rank(s.card.rarity) >= rank('epic')) blip('menuPick', 0.6); else blip('menuMove', 0.45);
  s.slot.scrollIntoView?.({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' });
  later(T.flip, () => s.prog.land(false));
};
const finish = () => {
  if (!cur || cur.phase === 'done') return;
  cur.phase = 'done';
  overlay.classList.remove('opening');
  overlay.classList.add('done');
  const done = overlay.querySelector('.pr-done');
  done.textContent = Packs.total() > 0 ? 'Next pack (' + Packs.total() + ')' : 'Done';
  done.hidden = false;
  overlay.querySelector('.pr-hint').hidden = true;
  done.focus({ preventScroll: true });
};
// the cards turn on their own, one after another
const play = () => {
  if (!cur || cur.phase !== 'pack') return;
  cur.phase = 'cards';
  overlay.classList.remove('opening');
  overlay.classList.add('dealing');
  const n = cur.slots.length;
  let at = 120;
  cur.slots.forEach((s, i) => {
    const lastOne = i === n - 1 && n > 1;
    if (lastOne) { at += T.last; s.slot.classList.add('finale'); }
    later(at, () => turn(i));
    at += rank(s.card.rarity) >= rank('epic') ? T.rare : T.beat;
  });
  later(at + T.flip, finish);
};
// a tap during it: every card turned at once, each bar at its end, with its glow
const revealAll = () => {
  if (!cur || cur.phase === 'done') return;
  for (const id of cur.timers) clearTimeout(id);
  cur.timers = [];
  overlay.classList.remove('opening');
  overlay.classList.add('dealing');
  cur.slots.forEach((s, i) => { if (!s.turned) turn(i, true); else s.prog.land(true); });
  finish();
};

const show = (result, { look = false } = {}) => {
  const cards = revealOrder(revealCards(result.cards));
  const progress = revealProgress(cards);
  const poses = variedPoses(cards.map(c => c.car));
  const slots = cards.map((card, i) => {
    const car = carById(card.car);
    if (!car) return null;
    const { node, pic } = blueprintCard(car, card, { pose: poses[i] });
    const prog = progressBar(progress[i], card);
    const back = make('div', 'pr-back', make('span', 'pr-back-mark', make('b', '', 'Delivery'), make('i', '', 'Run')));
    const slot = make('div', 'pr-slot down r-' + card.rarity + (card.featured ? ' featured' : ''),
      make('div', 'pr-flip', back, make('div', 'pr-face', node)), prog.node);
    return { slot, prog, card, car, pic, pose: poses[i] };
  }).filter(Boolean);
  const event = result.from ? Events.specials.find(e => String(e.id) === String(result.from)) : null;
  const kicker = look ? 'A look: nothing saved' : event ? event.name : 'Pack opened';
  const hint = make('p', 'pr-hint', 'Tap to reveal all');
  const done = make('button', 'pr-done', 'Done');
  done.hidden = true;
  done.addEventListener('click', (e) => { e.stopPropagation(); close(); drain(); });
  const shut = make('button', 'pr-close', '✕');
  shut.setAttribute('aria-label', 'Close');
  shut.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  const many = slots.length > 6;
  overlay.replaceChildren(
    make('div', 'pr-box',
      make('header', 'pr-head', make('div', 'pr-title', make('small', '', kicker), make('h2', '', kindName(result.kind))),
        make('span', 'pr-count', slots.length + (slots.length === 1 ? ' card' : ' cards')), shut),
      make('div', 'pr-body',
        make('div', 'pr-pack', make('div', 'pr-burst'), packArt(result.kind, 1)),
        slots.length ? make('div', 'pr-cards' + (many ? ' many' : ''), slots.map(s => s.slot)) : make('p', 'pr-empty', 'This pack came out empty: there are no cards for it.')),
      make('footer', 'pr-foot', hint, done)));
  overlay.className = 'pack-reveal opening k-' + result.kind;
  const wasInMenu = Game.inMenu;
  Game.inMenu = true; // (Enter must not start a run from here)
  cur = { result, slots, phase: 'pack', timers: [], wasInMenu };
  Nav.enter('packreveal', () => close(true)); // (the back button closes it)
  // the pictures: drawn while the pack bursts (the faces are laid out, turned away), a few a frame
  for (const s of slots) drawSoon(s.pic, s.car, { side: 'good', pose: s.pose }); // (always the Good livery, whatever side is played)
  blip('menuPick', 0.5);
  if (!slots.length) { cur.phase = 'cards'; finish(); return; }
  later(T.pack, play);
};
// closed: Done, ✕, Escape, back (fromBack: its history entry already gone). Everything was given when it opened
const close = (fromBack = false) => {
  if (!cur) return;
  for (const id of cur.timers) clearTimeout(id);
  Game.inMenu = cur.wasInMenu;
  cur = null;
  overlay.classList.add('hidden');
  overlay.replaceChildren();
  if (!fromBack) Nav.leave('packreveal');
  window.dispatchEvent(new Event('packschange'));
};
overlay.addEventListener('click', () => { if (cur && cur.phase !== 'done') revealAll(); }); // (a tap anywhere during it: all at once)

// may a pack be opened now? Not during a run; over a run's results once they are up; over the menu and its screens
const canShow = () => {
  if (cur) return false;
  if (Game.state === 'start') return true;
  const results = document.getElementById('resultScreen');
  return Game.state === 'finished' && !!results && !results.classList.contains('hidden');
};
// the next pack held, opened and shown (if one can be now)
const drain = () => {
  if (!canShow() || !Packs.total()) return;
  const result = Packs.next();
  if (result) show(result);
};
let soon = 0;
const drainSoon = (ms = 500) => { clearTimeout(soon); soon = setTimeout(drain, ms); };
Packs.revealer = () => { if (canShow()) drain(); else drainSoon(); }; // (a pack given: now, or once the results are up)
// the results coming up, the menu coming back: a pack still held is opened (a beat after, so the results are read)
for (const id of ['resultScreen', 'startScreen']) {
  const el = document.getElementById(id);
  if (el) new MutationObserver(() => { if (!el.classList.contains('hidden') && Packs.total()) drainSoon(700); }).observe(el, { attributes: true, attributeFilter: ['class'] });
}

window.addEventListener('keydown', (event) => {
  if (!cur) return;
  if (document.querySelector('.menu-dialog:not(.hidden)')) return;
  if (event.key === 'Escape') close();
  else if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') {
    if (cur.phase !== 'done') revealAll();
    else if (event.key !== 'ArrowRight' && document.activeElement?.classList.contains('pr-done')) return; // (the button takes its own Enter)
  } else return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

// a pack held from before (the page closed before it opened): at the first menu
{
  const params = new URLSearchParams(location.search), kind = params.get('pack');
  if (kind !== null) { // ?pack=<kind> (&from=<event id>), ?pack&give=...: for a look, nothing saved
    Progress.noSave = true;
    const gives = (params.get('give') || '').split(',').filter(Boolean);
    for (const k of gives) { const [kind, from] = k.split(':'); Packs.grant(kind, { from: from || null }); }
    const all = params.get('reveal') === 'all'; // (&reveal=all: as a tap during it, every card turned at once: for a picture)
    if (KINDS.includes(kind)) setTimeout(() => { if (canShow()) { const r = Packs.open(kind, { from: params.get('from') || null, free: true }); if (r) { show(r, { look: true }); if (all) setTimeout(revealAll, 200); } } }, 300);
    else drainSoon(300);
  } else drainSoon(900);
}
