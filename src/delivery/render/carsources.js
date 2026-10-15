// ============================================================================
// "WHERE TO GET IT": a car's key and blueprint sources, drawn (the data: carsources.js sourcesOf, worked out live).
// renderSources(car) -> HTMLElement: a self-contained section any view mounts (the showroom's detail; the full-screen
// single-car view). Each source a line: a tick and its place when it can be had now, or greyed with "Not obtainable
// now: <why>"; a pack's line carries a chip in its card's rarity colour (Bespoke for a key, the blueprint's own rarity),
// its chance a pack, and where such packs come from. The pack kinds that can never hold the card are one muted line.
// Its look is its own (a <style> put in once, under .cs-where), for the showroom's dark panel; short enough for a phone.
// ============================================================================
import { sourcesOf, ownWord } from '../carsources.js';
import { rarityName, rarityColour } from '../packs.js';
import { richTiers } from '../tiers.js';
import { blueprintCard } from './blueprintcard.js';
import { drawSoon } from './carstill.js';
import { posePick } from '../carposes.js';
import shopData from '../shop.json';

const CURRENCY_SIGN = shopData.currency?.sign || '◆';

const CSS = `
.cs-cards { display: flex; gap: 10px; justify-content: center; align-items: flex-start; padding: 4px 0 2px; }
.cs-cards .bp-card { width: 108px; flex: 0 0 auto; }
.cs-where { display: flex; flex-direction: column; gap: 6px; padding: 7px 11px 8px; border-radius: 10px; background: rgba(0, 0, 0, .22);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .1); font: 13px/1.3 system-ui, sans-serif; color: #e8edf5; text-align: left; }
.cs-where > summary { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; cursor: pointer; list-style: none; }
.cs-where > summary::-webkit-details-marker { display: none; }
.cs-where > summary::before { content: '▸'; color: rgba(255, 255, 255, .5); font-size: 11px; }
.cs-where[open] > summary::before { content: '▾'; }
.cs-where[open] > summary { margin-bottom: 2px; }
.cs-states { display: inline-flex; gap: 10px; font: 700 12px/1.2 system-ui, sans-serif; }
.cs-state.ok { color: #4fdc84; }
.cs-state.no { color: rgba(255, 255, 255, .42); }
.cs-where h3 { margin: 0; font: 800 11px/1 system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: rgba(255, 255, 255, .64); }
.cs-group { display: flex; flex-direction: column; gap: 3px; }
.cs-group h4 { margin: 2px 0 0; display: flex; align-items: center; gap: 6px; font: 700 12px/1.2 system-ui, sans-serif; color: #fff; }
.cs-line { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 0 6px; align-items: baseline; }
.cs-line > i { font-style: normal; font-weight: 800; text-align: center; }
.cs-line.ok > i { color: #4fdc84; }
.cs-line.no > i { color: rgba(255, 255, 255, .38); }
.cs-line b { font-weight: 700; color: #fff; }
.cs-line.no b { color: rgba(255, 255, 255, .6); font-weight: 600; }
.cs-line small { display: block; color: rgba(255, 255, 255, .66); font-size: 12px; }
.cs-line.no small { color: rgba(255, 255, 255, .45); }
.cs-line.muted { color: rgba(255, 255, 255, .45); font-size: 12px; }
.cs-chip { display: inline-block; padding: 1px 6px 1px; margin-left: 5px; border-radius: 999px; font: 800 10px/1.4 system-ui, sans-serif; letter-spacing: .06em;
  text-transform: uppercase; vertical-align: 1px; color: #10131a; background: var(--chip, #9aa3ad); }
.cs-line.no .cs-chip { filter: saturate(.25) brightness(.8); }
.cs-none { margin: 0; font: 800 12px/1.2 system-ui, sans-serif; color: #ffb4a8; }
.cs-note { margin: 0; font-size: 11px; color: rgba(255, 255, 255, .45); }
.cs-where .tierstars { letter-spacing: -.05em; }
/* a blacked-out car's cards (showroomData.js carCard dark): the car / the key a black silhouette, its name withheld; the
   card's rarity colour, stripes and frame stay */
.cs-cards .bp-card.dark .bp-pic.silhouette { filter: brightness(0); }
`;
let styled = false;
let chosen = null; // (the player's last open / shut; ?sourcesopen: open from the start, for a still)
try { if (new URLSearchParams(globalThis.location?.search || '').get('sourcesopen') !== null) chosen = true; } catch { /* (no address: a check) */ }
const style = () => {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const el = document.createElement('style');
  el.dataset.of = 'carsources';
  el.textContent = CSS;
  document.head.appendChild(el);
};
const make = (tag, className, ...children) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false && c !== '') el.append(c);
  return el;
};
const chip = (rarity) => {
  if (!rarity) return null;
  const el = make('span', 'cs-chip', rarityName(rarity));
  el.style.setProperty('--chip', rarityColour(rarity));
  return el;
};
const words = (text) => richTiers(String(text || ''));
const short = (w) => w.how === 'career' ? 'Career levels (' + (w.detail.match(/(\d+) left/)?.[1] ?? '?') + ' left)'
  : w.how === 'event' ? w.where + (w.recurring ? ': every run' : ' stages') // (a recurring event's pack: one for every run)
  : w.how === 'held' ? w.detail + ' in your packs' : w.where;

// one source's line
const line = (s, flags, hide) => {
  const ok = s.available;
  let detail;
  if (s.how === 'pack') {
    const open = (s.ways || []).filter(w => w.available);
    if (open.some(w => w.placeholder)) flags.placeholder = true;
    // (the Shop's offers as one: its cheapest price)
    const shop = open.filter(w => w.how === 'shop'), price = Math.min(...shop.map(w => (Number.isFinite(w.price) ? w.price : Number(w.detail.match(/(\d+)/)?.[1]) || Infinity)));
    const ways = [...(shop.length ? [price === 0 ? 'Shop, free daily' : 'Shop, from ' + CURRENCY_SIGN + ' ' + price + (shop.some(w => w.placeholder) ? '*' : '')] : []), ...open.filter(w => w.how !== 'shop').map(short)];
    detail = ok ? 'about ' + s.detail.match(/about ([^ ]+) a pack/)?.[1] + ' a pack · ' + ways.join(' · ') : null;
  } else detail = s.detail;
  return make('div', 'cs-line ' + (ok ? 'ok' : 'no'), make('i', '', ok ? '✓' : '✕'),
    make('span', '', make('b', '', hide(s.where)), // (its rarity: the group's chip)
      make('small', '', ...(ok ? words(hide(detail)) : ['Not obtainable now: ', ...words(hide(s.why))]))));
};
// a source that can NEVER give the car (the owner, 13-Oct: "don't name where it can't be obtained. That's pointless"): a
// pack that cannot hold it, or one whose every way is shut for good; an event over, a prize won, sold out. Not listed.
// A source shut for a while (its day: Monday, between runs, not yet open, not for sale yet, come back tomorrow) is.
const FOR_GOOD = /^(Not on sale: )?(cannot hold it|event over|its event is not in the game|its level is not in the game|prize already won|every stage done|every career level|sold out|no way to get one)/i;
export const neverGives = (s) => s.how === 'pack' ? !s.chance || (!s.available && (!s.ways?.length || s.ways.every(w => FOR_GOOD.test(w.why || ''))))
  : !s.available && FOR_GOOD.test(s.why || '');
// a blacked-out car's words (showroomData.js carCard dark): its name, its id and the name's first word (a pack named after
// it: 'Fishbowl Strike pack') withheld, as the blacked-out card withholds its name
const COMMON_WORDS = new Set(['the', 'car', 'city', 'classic', 'silver', 'highway', 'coupe', 'hot']);
const hider = (car, dark) => {
  if (!dark || !car) return (text) => text;
  const esc = (w) => String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const first = String(car.name || '').split(/[\s-]+/)[0];
  const names = [car.name, car.id, ...(first.length >= 4 && !COMMON_WORDS.has(first.toLowerCase()) ? [first] : [])].filter(Boolean).map(esc);
  const re = new RegExp('\\b(' + names.join('|') + ')\\b', 'gi');
  return (text) => (text === null || text === undefined ? text : String(text).replace(re, '???'));
};
// a group's lines: the sources that can give the card, now or later (none that never can: neverGives)
const lines = (list, flags, hide) => list.filter(s => !neverGives(s)).sort((a, b) => Number(b.available) - Number(a.available)).map(s => line(s, flags, hide));

// the section for a car: "Where to get it", its key and its blueprints
export const renderSources = (car, opts) => {
  style();
  const s = sourcesOf(car, opts);
  const box = make('details', 'cs-where');
  box.open = chosen ?? opts?.open ?? true; // (opened or shut by the player: kept so from car to car, for the visit)
  box.addEventListener('toggle', () => { chosen = box.open; });
  if (!s) return box;
  const flags = { placeholder: false };
  const muted = (text) => make('div', 'cs-line muted', make('i', '', '–'), make('span', '', text));
  const needKey = !s.keyless && !s.keyOwned, needBp = !s.noBlueprints && !s.maxed;
  const noKey = needKey && !s.obtainable.key, noBp = needBp && !s.obtainable.blueprints, none = (needKey || needBp) && (!needKey || noKey) && (!needBp || noBp);
  const nothing = (on) => (on && !none ? make('p', 'cs-none', 'Not obtainable right now') : null);
  const hide = hider(car, opts?.dark); // (a blacked-out car: its name withheld everywhere in the section)
  const keyLines = s.keyless || s.keyOwned ? [] : lines(s.keys, flags, hide), bpLines = s.noBlueprints || s.maxed ? [] : lines(s.blueprints, flags, hide);
  // (a group with no source that can give it: one neutral line, and when nothing at all can be had, no group: the summary's
  // "Not obtainable right now" is the one line)
  const word = ownWord(car), key = make('div', 'cs-group', make('h4', '', word.label, s.keyless ? null : chip(s.keys.some(k => k.how === 'pack' && !neverGives(k)) ? 'bespoke' : null)), nothing(noKey),
    ...(s.keyless ? [muted(s.keyless)] : s.keyOwned ? [make('div', 'cs-line ok', make('i', '', '✓'), make('span', '', make('b', '', word.have)))]
      : keyLines.length ? keyLines : [muted(word.none)]));
  const bpRarity = s.blueprints.find(b => b.rarity)?.rarity || null;
  const bp = make('div', 'cs-group', make('h4', '', 'Blueprints', chip(bpRarity)), nothing(noBp),
    ...(s.noBlueprints ? [muted(s.noBlueprints)] : s.maxed ? [make('div', 'cs-line no', make('i', '', '✓'), make('span', '', make('b', '', 'Maxed'), make('small', '', 'Max ECU')))]
      : bpLines.length ? bpLines : [muted('No way to get its blueprints')]));
  const keyShown = !(none && needKey && !keyLines.length), bpShown = !(none && needBp && !bpLines.length);
  // (nothing to be had now, of either: said once, plainly, at the top; a key already owned, or a car maxed, is not
  // "nothing"; one of the two alone: said in its group)
  // the summary, one line, open or shut: a tick or a cross for the key and the blueprints, or "Not obtainable right now"
  const state = (label, ok, done) => make('span', 'cs-state ' + (done || ok ? 'ok' : 'no'), (done || ok ? '✓ ' : '✕ ') + label + (done ? ' ' + done : ''));
  const summary = make('summary', '', make('h3', '', 'Get it'), none ? make('span', 'cs-none', 'Not obtainable right now')
    : make('span', 'cs-states', s.keyless ? null : state(word.label, s.obtainable.key, s.keyOwned ? word.owned : ''),
      s.noBlueprints ? null : state('Blueprints', s.obtainable.blueprints, s.maxed ? 'maxed' : '')));
  // the cards themselves (the owner, 12-Oct): its BLUEPRINT card, and, for a Key car, its KEY card: drawn as the packs draw them
  const cards = [];
  // (a blacked-out car's: the car and the key a black silhouette, the name withheld: blueprintcard.js dark)
  const dark = !!opts?.dark;
  if (!s.noBlueprints) cards.push([blueprintCard(car, { rarity: car.rarity || bpRarity || 'common', key: false, n: 1 }, { compact: true, pose: posePick(car.id), dark }), true]);
  if (!s.keyless && (car.bespoke || car.event)) cards.push([blueprintCard(car, { rarity: 'bespoke', key: true, n: 1 }, { compact: true, dark }), false]);
  const cardRow = cards.length ? make('div', 'cs-cards', ...cards.map(([c]) => c.node)) : null;
  const drawCards = () => { for (const [c, needsPic] of cards) if (needsPic && c.pic) drawSoon(c.pic, car, { side: 'good', pose: posePick(car.id) }); };
  if (cardRow) { box.addEventListener('toggle', () => { if (box.open) requestAnimationFrame(drawCards); }); if (box.open) requestAnimationFrame(drawCards); }
  box.append(...[summary, cardRow, keyShown ? key : null, bpShown ? bp : null, flags.placeholder ? make('p', 'cs-note', '* Crazey Cash, the Shop\'s placeholder currency: nothing gives it yet') : null].filter(Boolean));
  return box;
};
