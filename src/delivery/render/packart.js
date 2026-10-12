// ---- a card pack, drawn in CSS (shop.css .shop-pack): foil in the colour of what it promises, a crimped top, the game's
// mark, what it is. The Shop's tiles (render/shop.js) and the pack reveal (render/packs.js) both show it
import '../shop.css';

// the best a pack promises, for its foil, by pack id (packs.json). A pack with featured cards (an event's special pack:
// comet-special) is drawn as a SPECIAL pack (its look, its mark, the k-special class), whatever its id
const packData = Object.values(import.meta.glob('../packs.json', { eager: true, import: 'default' }))[0] || null;
export const KIND_LOOK = { career: 'common', daily: 'uncommon', standard: 'uncommon', ten: 'epic', special: 'bespoke' };
const KIND_MARK = { career: 'Career', daily: 'Daily', standard: 'Standard', ten: '10', special: 'Special' };
export const artKind = (id) => (KIND_LOOK[id] ? id : packData?.packs?.[id]?.featured ? 'special' : id);
export const lookOf = (id) => KIND_LOOK[artKind(id)] || 'common';

const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};
export const packArt = (id, count = 1) => {
  const kind = artKind(id), look = KIND_LOOK[kind] || 'common', shown = Math.min(3, count);
  const one = (i) => make('div', 'shop-pack r-' + look + ' k-' + kind,
    make('span', 'pack-crimp'), make('span', 'pack-sheen'),
    make('span', 'pack-brand', make('b', '', 'Delivery'), make('i', '', 'Run')),
    make('span', 'pack-mark', KIND_MARK[kind] || kind),
    make('span', 'pack-sub', kind === 'ten' ? '10 cards' : 'Card pack'),
    i === shown - 1 && count > 1 ? make('span', 'pack-count', '×' + count) : null);
  return make('div', 'shop-packs n' + shown, ...Array.from({ length: shown }, (_, i) => one(i)));
};
