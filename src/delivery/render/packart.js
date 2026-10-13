// ---- a card pack, drawn in CSS (shop.css .shop-pack): foil in the colour of what it promises, a crimped top, the game's
// mark, what it is. The Shop's tiles (render/shop.js) and the pack reveal (render/packs.js) both show it
import '../shop.css';
import { drawSoon } from './carstill.js';
import { carById } from '../cars.js';

// the best a pack promises, for its foil, by pack id (packs.json). A pack with featured cards (an event's special pack:
// comet-special) is drawn as a SPECIAL pack (its look, its mark, the k-special class), whatever its id
const packData = Object.values(import.meta.glob('../packs.json', { eager: true, import: 'default' }))[0] || null;
export const KIND_LOOK = { career: 'common', daily: 'uncommon', standard: 'uncommon', ten: 'epic', special: 'bespoke' };
const KIND_MARK = { career: 'Career', daily: 'Daily', standard: 'Standard', ten: '10', special: 'Special' };
// a pack that features ONE car (the Car Hunt packs, the Comet Hunt's) has that car drawn on it (the owner, 13-Oct: "draw the car on the pack as
// well"): its Good-livery still, under the pack's mark; drawn once the art is laid out (carstill.js drawSoon)
const PACK_POSE = { lift: 0.22, angle: -0.6, fov: 30, margin: 0.9 };
export const featuredCarOf = (id) => {
  const ids = [...new Set((packData?.packs?.[id]?.featured?.entries || []).filter(e => !e.key).map(e => e.car))];
  return ids.length === 1 ? carById(ids[0]) || null : null;
};
export const artKind = (id) => (KIND_LOOK[id] ? id : packData?.packs?.[id]?.featured ? 'special' : id);
export const lookOf = (id) => KIND_LOOK[artKind(id)] || 'common';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
const packCar = (car) => {
  const el = make('span', 'pack-car');
  requestAnimationFrame(() => drawSoon(el, car, { side: 'good', pose: PACK_POSE }));
  return el;
};
export const packArt = (id, count = 1) => {
  const kind = artKind(id), look = KIND_LOOK[kind] || 'common', shown = Math.min(3, count);
  const hunt = featuredCarOf(id);
  const one = (i) => make('div', 'shop-pack r-' + look + ' k-' + kind + (hunt ? ' has-car' : ''),
    make('span', 'pack-crimp'), make('span', 'pack-sheen'),
    make('span', 'pack-brand', make('b', '', 'Delivery'), make('i', '', 'Run')),
    make('span', 'pack-mark', KIND_MARK[kind] || kind),
    make('span', 'pack-sub', kind === 'ten' ? '10 cards' : 'Card pack'),
    hunt && i === shown - 1 ? packCar(hunt) : null,
    i === shown - 1 && count > 1 ? make('span', 'pack-count', '×' + count) : null);
  return make('div', 'shop-packs n' + shown, ...Array.from({ length: shown }, (_, i) => one(i)));
};
