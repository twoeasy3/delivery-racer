// ---- the NUMBER PLATE DESIGNS: data in one place, and the code that draws one (the owner, 14-Oct: plate designs are unlockable items,
// the text is the player's; CHECKLIST 286). Every plate is drawn in code on a small canvas (W x H = 256 x 64, about 64 KB), never an image
// file. The formats are INVENTED and generic: no real country's registration, no real colour scheme claimed, no names. A design is:
//   id, name         the registry key is plate:<id> (render/cosmetics.js)
//   free             anyone has it; false = owned only when unlocked (Unlock everything: Absolutely does) -- the SHOP HOOK below
//   price            a PLACEHOLDER for a later shop (nothing reads it yet: TODO CHECKLIST 286); registered with the item
//   bg, text         the plate's colour and its characters' colour; border: the frame line; edge: the dark rim round the plate
//   stripe           optional { side: 'left' | 'top' | 'bottom', size (px), colour }
//   shadow           optional colour of a drop shadow under the characters (an embossed look)
//   font             the canvas font family; weight is bold
//   family, pieces, paint, frame, over, pad, outline, glow   the newer designs' extras (shaped outlines, pictures, frames, holders):
//                    render/platedesigns2.js MORE_PLATES says what each is (CHECKLIST 432)
// `stock` is not a design: it means "keep the car's own plates".
import { MORE_PLATES, PLATE_FAMILIES, boxOf, inset, pathOf } from './platedesigns2.js';
export { PLATE_FAMILIES };
export const W = 256, H = 64;
export const PLATE_ASPECT = W / H; // a plate is drawn 4:1, the anchors (plateanchors.js) give it that shape
export const PLATE_DESIGNS = [
  { id: 'stock', name: 'Stock', free: true, price: 0 },
  { id: 'classic', name: 'Classic white', free: true, price: 0, bg: '#f5f4ee', text: '#15161a', border: '#15161a', edge: '#202226', font: 'Arial, Helvetica, sans-serif' },
  { id: 'yellow', name: 'Yellow rear', free: true, price: 0, bg: '#f2c316', text: '#15161a', border: '#15161a', edge: '#202226', font: 'Arial, Helvetica, sans-serif' },
  { id: 'retro', name: 'Retro cream', free: true, price: 0, bg: '#eadfb8', text: '#3b2a1c', border: '#3b2a1c', edge: '#2a2118', font: 'Georgia, "Times New Roman", serif', shadow: '#c9bb8e' },
  { id: 'blackgold', name: 'Black and gold', free: false, price: 600, bg: '#121214', text: '#e6b832', border: '#d4a72a', edge: '#050506', font: 'Arial, Helvetica, sans-serif', shadow: '#000000' },
  { id: 'ev', name: 'EV green stripe', free: false, price: 400, bg: '#f2f5f2', text: '#15161a', border: '#15161a', edge: '#202226', font: 'Arial, Helvetica, sans-serif', stripe: { side: 'top', size: 11, colour: '#1fa64a' } },
  { id: 'rally', name: 'Rally orange', free: false, price: 400, bg: '#ff8a1c', text: '#101114', border: '#101114', edge: '#1a1b1f', font: 'Impact, "Arial Black", Arial, sans-serif', stripe: { side: 'left', size: 26, colour: '#101114' } },
  { id: 'mono', name: 'Monochrome', free: false, price: 300, bg: '#c4c6ca', text: '#26272b', border: '#26272b', edge: '#17181b', font: 'Arial, Helvetica, sans-serif', stripe: { side: 'bottom', size: 8, colour: '#26272b' } },
  { id: 'midnight', name: 'Midnight blue', free: false, price: 500, bg: '#1b2a52', text: '#f1f4ff', border: '#9fb4ee', edge: '#0d1428', font: 'Arial, Helvetica, sans-serif', shadow: '#0b1230' },
  ...MORE_PLATES.map(d => ({ free: false, ...d })),
].map(d => ({ family: 'plain', ...d }));
// a shaped design's outline: [{ pts, slab }] in canvas pixels (the first is the body), or null for the plain 256 x 64 rectangle
export const piecesOf = (d) => (d && d.pieces ? d.pieces() : null);
export const designById = (id) => PLATE_DESIGNS.find(d => d.id === id) || PLATE_DESIGNS[0];

const round = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
// draw a plate (design d, text) over the whole of ctx's w x h canvas (a chip's small canvas uses the same drawing at its own size).
// A shaped design (pieces) leaves the canvas clear outside its outline.
export const drawPlate = (ctx, d, text, w = W) => {
  const k = w / W; // (everything below is written for 256 x 64)
  ctx.save();
  ctx.scale(k, k);
  const pieces = piecesOf(d), body = pieces ? pieces[0].pts : null, b = body ? boxOf(body) : { x: 0, y: 0, w: W, h: H };
  const bodyPath = (d0, r0) => { if (body) pathOf(ctx, inset(body, d0)); else round(ctx, d0, d0, W - 2 * d0, H - 2 * d0, r0); };
  if (pieces) { ctx.clearRect(0, 0, W, H); ctx.fillStyle = d.edge; for (const p of pieces) { pathOf(ctx, p.pts); ctx.fill(); } }
  else { ctx.fillStyle = d.edge; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = d.bg; bodyPath(3, 7); ctx.fill();
  ctx.save();
  bodyPath(3, 7); ctx.clip();
  const [px, pt, pb] = d.pad || [10, 8, 8];
  let x0 = b.x + px, x1 = b.x + b.w - px, y0 = b.y + pt, y1 = b.y + b.h - pb;
  if (d.paint) d.paint(ctx, b, d);
  const s = d.stripe;
  if (s) {
    ctx.fillStyle = s.colour;
    if (s.side === 'left') { ctx.fillRect(3, 3, s.size, H - 6); x0 = 3 + s.size + 8; }
    else if (s.side === 'top') { ctx.fillRect(3, 3, W - 6, s.size); y0 = 3 + s.size + 3; }
    else { ctx.fillRect(3, H - 3 - s.size, W - 6, s.size); y1 = H - 3 - s.size - 3; }
  }
  ctx.restore();
  if (d.frame) { ctx.save(); d.frame(ctx, body, b); ctx.restore(); }
  else { ctx.strokeStyle = d.border; ctx.lineWidth = 2.4; bodyPath(7, 5); ctx.stroke(); }
  if (d.over) { ctx.save(); d.over(ctx, b, d); ctx.restore(); }
  // the characters: one cell each (a plate's characters stand in fixed cells), centred
  const chars = [...String(text)], n = Math.max(chars.length, 1), cw = Math.min(31, (x1 - x0 - 6) / n), size = Math.min(H - 20, (y1 - y0) * 0.98, cw * 1.55);
  const left = (x0 + x1) / 2 - (cw * n) / 2, mid = (y0 + y1) / 2 + 1;
  ctx.font = 'bold ' + Math.round(size) + 'px ' + d.font;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (d.outline) { ctx.strokeStyle = d.outline; ctx.lineWidth = Math.max(2.5, size * 0.13); ctx.lineJoin = 'round'; }
  chars.forEach((ch, i) => {
    if (ch === ' ') return;
    const cx = left + cw * (i + 0.5);
    if (d.shadow) { ctx.fillStyle = d.shadow; ctx.fillText(ch, cx + 1.4, mid + 1.6); }
    if (d.outline) ctx.strokeText(ch, cx, mid);
    if (d.glow) { ctx.shadowColor = d.glow; ctx.shadowBlur = 5; }
    ctx.fillStyle = d.text;
    ctx.fillText(ch, cx, mid);
    ctx.shadowBlur = 0;
  });
  ctx.restore();
};
