// ---- the LOCKED-CARD OVERLAY, drawn (the data: showroomData.js overlayOf; the look: showroom.css "the locked-card overlay")
// A card that cannot be driven wears one over its picture: a tint in its kind's colour, a round dark badge with a THIN
// ring holding a flat icon, and a two-line caption (a big italic title, a small line). The six kinds each have their own
// colour and icon: key (Bespoke magenta, a key), earned (gold, a trophy), unpurchased (amber, a price tag), tier (steel
// blue, a padlock), blueprint (blue, a blueprint sheet, and a mini bar of its blueprints). Pure DOM and inline SVG: no
// pictures, nothing per frame. overlayNode(ov, { inline }) -> the node; inline: the full view's pill (badge, then words).
import { richTiers } from '../tiers.js';

// the icons: 24 x 24, flat, filled with currentColor (evenodd for the holes)
export const ICONS = {
  unavailable: '<path d="M6 2h12v2h-1v3.2c0 .9-.4 1.7-1.1 2.3L13.2 12l2.7 2.5c.7.6 1.1 1.4 1.1 2.3V20h1v2H6v-2h1v-3.2c0-.9.4-1.7 1.1-2.3L10.8 12 8.1 9.5C7.4 8.9 7 8.1 7 7.2V4H6zM9 4v3.2c0 .3.1.6.4.8L12 10.2l2.6-2.2c.3-.2.4-.5.4-.8V4z"/>',
  key: '<path fill-rule="evenodd" d="M7.5 6.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 0 1 0-11zm0 3.4a2.1 2.1 0 1 0 0 4.2a2.1 2.1 0 0 0 0-4.2zM12.6 10.4H22.5V13.6H21.2V17H18.4V13.6H17.2V16H14.6V13.6H12.6z"/>',
  earned: '<path fill-rule="evenodd" d="M6.5 3h11v2H21v2.6a4.6 4.6 0 0 1-4.1 4.6a5.6 5.6 0 0 1-3.6 3V17h2.9v2.2H7.8V17h2.9v-1.8a5.6 5.6 0 0 1-3.6-3A4.6 4.6 0 0 1 3 7.6V5h3.5zM5.1 7v.6a2.5 2.5 0 0 0 1.5 2.3a8 8 0 0 1-.1-1.2V7zm13.8 0h-1.4v1.7a8 8 0 0 1-.1 1.2a2.5 2.5 0 0 0 1.5-2.3zM6 20.2h12V22H6z"/>',
  unpurchased: '<path fill-rule="evenodd" d="M3 4.6A1.6 1.6 0 0 1 4.6 3h7.2a1.6 1.6 0 0 1 1.1.5l8.1 8.1a1.6 1.6 0 0 1 0 2.3l-7.2 7.2a1.6 1.6 0 0 1-2.3 0L3.5 13a1.6 1.6 0 0 1-.5-1.1zm4.6 1.2a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 0 0 0-3.6z"/>',
  tier: '<path fill-rule="evenodd" d="M12 2.5a5 5 0 0 1 5 5V10h1.2A1.8 1.8 0 0 1 20 11.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 20.2v-8.4A1.8 1.8 0 0 1 5.8 10H7V7.5a5 5 0 0 1 5-5zm0 2.6a2.4 2.4 0 0 0-2.4 2.4V10h4.8V7.5A2.4 2.4 0 0 0 12 5.1zm0 8.2a1.7 1.7 0 0 0-.9 3.1V19h1.8v-2.6a1.7 1.7 0 0 0-.9-3.1z"/>',
  blueprint: '<path fill-rule="evenodd" d="M4.8 3h11.6L20 6.6v12.6A1.8 1.8 0 0 1 18.2 21H4.8A1.8 1.8 0 0 1 3 19.2V4.8A1.8 1.8 0 0 1 4.8 3zm.6 2.4v4.2h4.2V5.4zm6.6 0v4.2h4.2V7.4l-2-2zM5.4 12v6.6h4.2V12zm6.6 0v6.6h6.6V12z"/>',
};
export const overlayIcon = (kind) => {
  const span = document.createElement('span');
  span.className = 'sr-ov-icon';
  span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[kind] || ICONS.tier) + '</svg>';
  return span;
};
const make = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false && child !== '') node.append(child);
  return node;
};

export const overlayNode = (ov, { inline = false } = {}) => {
  if (!ov) return null;
  const bar = ov.kind === 'blueprint' && ov.need ? make('span', 'sr-ov-bar', make('i')) : null;
  bar?.firstChild.style.setProperty('width', Math.round(ov.have / ov.need * 100) + '%');
  const node = make('span', 'sr-ov ' + ov.kind + (inline ? ' inline' : ''),
    make('span', 'sr-ov-badge', overlayIcon(ov.kind)),
    make('span', 'sr-ov-words', make('b', 'sr-ov-title', richTiers(ov.title)), bar, make('small', 'sr-ov-line', richTiers(ov.line))));
  node.dataset.overlay = ov.kind;
  return node;
};
