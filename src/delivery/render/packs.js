// ---- the PACK REVEAL: a pack opened the moment it is bought or earned (the owner, 12-Oct) ------------------------------
// "The packing page is really clunky and ugly ... when a pack is bought or earned it just opens immediately." There is
// no page of packs held any more: a pack given (the Shop's buy, a Career level's first delivery, a special event's stage
// or prize) asks this screen to open it (Packs.revealer, packs.js), and it does at once where it can: over the Shop, over
// the menu, or over a run's RESULTS as soon as they are up (a beat after, so they are read first). Until it has, the pack
// is held in the save (Progress.data.packs), so a page closed in between opens it at the next menu. Packs.open gives the
// blueprints once, as it opens; this screen only shows them (one pack at a time: no double open from a double tap).
// The look is the Shop's and the Showroom's: a full-screen dark panel, the game's display font, the rarity colours.
// The pack (the Shop's pack art) shakes and bursts; then its cards, BLUEPRINT CARDS (render/blueprintcard.js), each in
// one of the car's four poses, the poses varied so neighbours differ, turn over ON THEIR OWN one after another: a short
// beat each, a longer one and a glow for Epic and above, the last (the best card: packs.js revealOrder) given the most.
// A tap anywhere during it turns all the rest at once; after that only Done (or Next pack) does anything. Under each
// card its car's progress bar fills from before the card to after it, and glows on an unlock or an ECU up.
// A slot that gives n copies of its card (packs.json amount / amounts) turns showing x1, then the n - 1 extra copies are
// flicked onto a pile behind it one by one (render/flick.js, packs.js flickPlan), the badge and the bar going up one on
// each; the next card turns as its last copy lands; a tap lands them all at once. Escape and back close it (all is already given).
// ?pack=<pack id> (career, daily, standard, ten, comet-special: packs.json) opens one at once, for a look, and nothing of
// it is saved (Progress.noSave); the old ?pack=special(&from=<event id>) opens that event's pack. ?pack&give=career,ten,comet-special: those packs given
// (nothing saved), opened one after another as a player would see them. &reveal=all: every card turned at once (a tap).
// &amount=3 (or 15), &amounts=3,15 (alternating by slot), &amounts=common:3,epic:15 (by rarity): every non-key slot gives
// that many, for the visit (packs.js debugAmounts); &flick=0.5: each slot's flicks held 0.5 s in, for a still.
// &featured=<list> (packs.js debugFeatured: id[!key][:weight[xamount]]) a special pack's featured list; &maxed=<ids>,
// &owned=<ids> (debugMarks) cars counted as maxed / keys owned: all for the visit, never saved.
import '../packs.css';
import { Packs, packName, packIdOf, revealCards, revealOrder, revealProgress, RARITIES, flickPlan, debugAmounts, debugFeatured, debugMarks, debugDouble, debugCosmetics } from '../packs.js';
import { drawPlate, designById } from './platedesigns.js';
import { cosmeticRarity, COSMETIC_SLOT_WORDS } from './cosmetics.js';
import { slotById } from './cosmeticslots.js';
import { flickPile } from './flick.js';
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

// <captag> THE CAP TAG (the owner, 15-Oct: 'Yes' to a tag): a REGULAR card whose car was already at its blueprint cap gives nothing
// (packs.js open(): card.given 0, card.maxed) and says 'Already maxed'; one the cap cut (card.cut: the stack as dealt, card.given what the
// save took) says '+1 of ×3'. Keys and featured cards never carry it. Pure (the check reads it from this file): { words, reward } or null.
// surplusReward(card, surplus) is THE HOOK for the blueprints the cap turned away (the owner: they WILL give a special currency later): it
// returns the reward line's words, or null; today nothing is given, so null, and no line is shown.
const surplusReward = (card, surplus) => null; // eslint-disable-line no-unused-vars
const capTag = (card) => {
  if (!card || card.key || card.featured) return null;
  const given = Math.max(0, card.given ?? card.n ?? 1), dealt = card.cut ?? (card.maxed ? card.n ?? 1 : given);
  if (dealt <= given) return null;
  const words = given === 0 ? 'Already maxed' : '+' + given + ' of ×' + dealt;
  return { words, reward: surplusReward(card, dealt - given) };
};
// </captag>

const overlay = make('div', 'pack-reveal hidden');
overlay.id = 'packReveal';
overlay.setAttribute('role', 'dialog');
overlay.setAttribute('aria-label', 'Card pack');
document.body.append(overlay);

// TIMING (ms): the pack's burst; a card's beat; an Epic or better card's; the pause before the last card
// a slot of many (n copies): its flicks start as the face settles (flicks), and the next card turns as its last copy
// lands, a touch before (overlap)
const T = { pack: 950, beat: 340, rare: 700, last: 650, flip: 420, flicks: 300, overlap: 80 };
let freezeAt = null; // (the debug &flick=<s>: each slot's flicks held at that many seconds, for a still)
let cur = null; // the pack on show: { result, slots: [{ slot, prog, card }], phase: 'pack' | 'cards' | 'done', timers, wasInMenu }

const later = (ms, f) => { const id = setTimeout(f, still() ? Math.min(ms, 120) : ms); cur.timers.push(id); };
const turn = (i, instant = false) => {
  const s = cur.slots[i];
  if (!s || s.turned) return;
  s.turned = true;
  s.slot.classList.remove('down');
  s.slot.classList.add('shown');
  if (freezeAt !== null) s.slot.classList.add('instant'); // (the debug still: turned with no flip, as a still's clock may not run it)
  if (instant) { s.slot.classList.add('instant'); s.flick.complete(); s.prog.land(true); return; }
  if (rank(s.card.rarity) >= rank('epic')) blip('menuPick', 0.6); else blip('menuMove', 0.45);
  s.slot.scrollIntoView?.({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' });
  later(T.flip, () => s.prog.step(1)); // (the first copy; a slot of many fills on with its flicks)
  if (s.plan.copies.length) {
    s.slot.classList.add('flicking'); // (above its neighbours while copies fly in)
    later(T.flicks, () => (freezeAt !== null ? s.flick.freeze(freezeAt) : s.flick.start()));
    if (freezeAt === null) later(T.flicks + s.plan.total, () => s.slot.classList.remove('flicking'));
  }
};
const finish = () => {
  if (!cur || cur.phase === 'done') return;
  cur.phase = 'done';
  overlay.classList.remove('opening');
  overlay.classList.add('done');
  const done = overlay.querySelector('.pr-done');
  done.textContent = Packs.total() > 0 ? 'Next pack (' + Packs.total() + ')' : 'Done';
  done.hidden = false;
  const a = Packs.again, again = overlay.querySelector('.pr-again');
  if (again && a && Packs.total() === 0 && a.can()) { again.textContent = a.label; again.hidden = false; }
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
    const flicks = s.plan.copies.length ? T.flicks + s.plan.lastLand - T.overlap : 0; // (a slot of many: its copies land first)
    at += Math.max(rank(s.card.rarity) >= rank('epic') ? T.rare : T.beat, flicks);
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
  cur.slots.forEach((s, i) => { if (!s.turned) turn(i, true); else { s.flick.complete(); s.prog.land(true); } }); // (every copy landed, the badge at xn)
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
    const tag = capTag(card); // (a capped car's card: 'Already maxed' / '+1 of ×3'; its reward line, once there is one, under the words)
    if (tag) {
      node.querySelector('.bp-art')?.append(make('span', 'bp-cap', make('b', '', tag.words), tag.reward ? make('small', '', tag.reward) : null));
      node.setAttribute('aria-label', node.getAttribute('aria-label') + ', ' + tag.words + (tag.reward ? ', ' + tag.reward : ''));
    }
    const prog = progressBar(progress[i], card);
    // n copies (card.n): the card turns at x1, then the rest flick onto its pile (render/flick.js), the badge and bar going up with each
    const plan = flickPlan(card.n, { reduced: still(), seed: 1 + i * 7919 + [...String(card.car)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0) });
    const back = make('div', 'pr-back', make('span', 'pr-back-mark', make('b', '', 'Delivery'), make('i', '', 'Run')));
    const face = make('div', 'pr-face', node);
    const slot = make('div', 'pr-slot down r-' + card.rarity + (card.featured ? ' featured' : '') + (plan.copies.length ? ' many-copies' : ''),
      make('div', 'pr-flip', back, face), prog.node);
    const flick = flickPile({ face, card: node, badge: node.querySelector('.bp-amount'), plan, schedule: (ms, f) => later(ms, f),
      onLand: (k, instant) => { prog.step(k, instant); if (!instant) blip('menuMove', 0.22); } });
    return { slot, prog, card, car, pic, pose: poses[i], plan, flick };
  }).filter(Boolean);
  // COSMETIC CARDS (CHECKLIST 437): what the pack's `cosmetics` list awarded (already given: render/cosmetics.js awardCosmetic), a row under the cards
  const cosRow = (result.cosmetics || []).map(a => {
    let pic = make('span', 'cz-prev pr-cos-pic');
    const swatch = slotById(a.slot)?.items?.().find(i => i.id === a.id)?.swatch; // (a glow's colour: its tab's own swatch)
    if (swatch) pic.style.background = swatch;
    if (a.slot === 'plate') { const c = document.createElement('canvas'); c.width = 120; c.height = 30; c.className = 'pr-cos-pic'; try { drawPlate(c.getContext('2d'), designById(a.id), 'DELIVERY', 120, 30); } catch { /* (no picture) */ } pic = c; }
    // the same card as a blueprint (render/blueprintcard.js), in the item's rarity (cosmetics.js COSMETIC_RARITY: Uncommon), face up
    const { node } = blueprintCard(null, { rarity: cosmeticRarity(a.slot, a.id), n: a.n, isNew: a.count === a.n }, { item: { name: a.name, line: COSMETIC_SLOT_WORDS[a.slot] || a.slot, tab: 'COSMETIC', picture: pic } });
    return make('div', 'pr-slot pr-cos-slot r-' + cosmeticRarity(a.slot, a.id), node);
  });
  const event = result.from ? Events.specials.find(e => String(e.id) === String(result.from)) : null;
  const kicker = look ? 'A look: nothing saved' : event ? event.name : 'Pack opened';
  const hint = make('p', 'pr-hint', 'Tap to reveal all');
  const done = make('button', 'pr-done', 'Done');
  done.hidden = true;
  done.addEventListener('click', (e) => { e.stopPropagation(); close(); drain(); });
  // BUY ANOTHER (the owner, 13-Oct: "after buying a pack, add an option to buy another one"): offered at the end of the LAST pack of a purchase made in the
  // Shop (render/shop.js sets Packs.again: its label, whether it can be bought, and how); one tap closes this and buys it, which opens at once
  const again = make('button', 'pr-again', '');
  again.hidden = true;
  again.addEventListener('click', (e) => { e.stopPropagation(); const a = Packs.again; close(); if (a?.can()) a.buy(); });
  const shut = make('button', 'pr-close', '✕');
  shut.setAttribute('aria-label', 'Close');
  shut.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  const many = slots.length > 6;
  overlay.replaceChildren(
    make('div', 'pr-box',
      make('header', 'pr-head', make('div', 'pr-title', make('small', '', kicker), make('h2', '', packName(result.kind))),
        make('span', 'pr-count', (slots.length + cosRow.length) + (slots.length + cosRow.length === 1 ? ' card' : ' cards')), shut),
      make('div', 'pr-body',
        make('div', 'pr-pack', make('div', 'pr-burst'), packArt(result.kind, 1, result.car)),
        slots.length ? make('div', 'pr-cards' + (many ? ' many' : ''), slots.map(s => s.slot)) : cosRow.length ? null : make('p', 'pr-empty', 'This pack came out empty: there are no cards for it.'),
        cosRow.length ? make('div', 'pr-cosmetics', make('h3', '', 'Cosmetics'), make('div', 'pr-cards pr-cos-cards', cosRow)) : null),
      make('footer', 'pr-foot', hint, again, done)));
  overlay.className = 'pack-reveal opening k-' + result.kind;
  const wasInMenu = Game.inMenu;
  Game.inMenu = true; // (Enter must not start a run from here)
  cur = { result, slots, phase: 'pack', timers: [], wasInMenu };
  Nav.enter('packreveal', () => close(true)); // (the back button closes it)
  // the pictures: drawn while the pack bursts (the faces are laid out, turned away), a few a frame
  for (const s of slots) drawSoon(s.pic, s.car, { side: 'good', pose: s.pose, stock: true }); // (always the Good livery, whatever side is played; an UNLOCK REVEAL: the stock car, no cosmetic of the player's)
  blip('menuPick', 0.5);
  if (!slots.length) { cur.phase = 'cards'; finish(); return; }
  later(T.pack, play);
};
// closed: Done, ✕, Escape, back (fromBack: its history entry already gone). Everything was given when it opened
const close = (fromBack = false) => {
  if (!cur) return;
  for (const id of cur.timers) clearTimeout(id);
  Game.inMenu = cur.wasInMenu;
  if (Packs.total() === 0) Packs.again = null; // (used or let go: a later pack, an event's, is not one to buy again)
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
    Packs.featuredOverride = debugFeatured(params); // (&featured=silvercomet:9x3,silvercomet:1x15,rocketfin!key:1: a special pack's featured list for this visit)
    debugDouble(params); // (&double=0.5&base=2: the doubling chance and base amount, for this visit)
    Packs.cosmeticsOverride = debugCosmetics(params); // (&cosmetics=plate:ev:1x2,any-underglow: the pack's cosmetic cards for this visit, CHECKLIST 437)
    debugMarks(params); // (&maxed=<ids>&owned=<ids>: cars counted as maxed / keys owned, for this visit)
    for (const token of (params.get('bp') || '').split(',').filter(Boolean)) { const [id, n] = token.split(':'); (Progress.data.blueprints ||= {})[id] = Number(n) || 0; } // (&bp=woody:4: blueprints held before the pack, for a look at its bars; nothing saved)
    for (const token of (params.get('ecu') || '').split(',').filter(Boolean)) { const [id, n] = token.split(':'); (Progress.data.ecuBought ||= {})[id] = Math.max(0, Math.floor(Number(n)) || 0); } // (&ecu=sport:2: ECUs bought)
    Packs.amountOverride = debugAmounts(params); // (&amount=3, &amount=15, &amounts=3,15, &amounts=common:3,epic:15: every non-key slot that many, for this visit)
    const f = parseFloat(params.get('flick'));
    if (f >= 0) freezeAt = f; // (&flick=0.4: each slot's flicks held 0.4 s after its first throw, for a still)
    const gives = (params.get('give') || '').split(',').filter(Boolean);
    for (const k of gives) { const [kind, from] = k.split(':'); Packs.grant(kind, { from: from || null }); }
    const all = params.get('reveal') === 'all'; // (&reveal=all: as a tap during it, every card turned at once: for a picture)
    const id = packIdOf(kind, params.get('from') || null); // (a pack id; the old ?pack=special&from=comet-hunt still opens its pack)
    if (id) setTimeout(() => { if (canShow()) { const r = Packs.open(id, { free: true }); if (r) { show(r, { look: true }); if (all) setTimeout(revealAll, 200); } } }, 300);
    else drainSoon(300);
  } else drainSoon(900);
}
// ?again (with ?pack=standard&reveal=all): the Buy another button, for a picture (it buys nothing)
if (new URLSearchParams(location.search).has('again')) Packs.again = { label: 'Buy another · 100', can: () => true, buy: () => {} };
