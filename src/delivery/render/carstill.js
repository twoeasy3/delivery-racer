// ---- a car's still: its real model, in a side's livery, drawn ONCE at a pose and kept as a picture ------------------
// Every car picture in the menus is drawn this way (the owner, 12-Oct: the pre-rendered carshots/*.jpg are "ugly as
// hell. Only use the newer style"): the special event's cards (render/menustage.js), the showroom's (render/showroom.js),
// the Shop's featured tile (render/shop.js), the blueprint cards of a pack reveal and of "What's inside"
// (render/blueprintcard.js). drawStill (render/modelviews.js) renders the model into the element's own size by the
// menu's ONE renderer (no WebGL context of its own); the picture is encoded off the main thread (canvas.toBlob) and
// kept as an object URL, and the element shows it as its background (until then, the canvas drawn into it).
// Kept by car, side, POSE and size (in steps of 20 px): a picture drawn small is never stretched over a bigger card.
// Poses: STILL_POSE (the event cards' and showroom's one pose, framed as before), or one of the four of a blueprint card
// (carposes.js: 'top', 'hero', 'front', 'rear'; POSES below), framed tight to the picture.
// Lazily: stillsIn(root) draws only the pictures scrolled into view (an IntersectionObserver), a few a frame.
import { makeShowCar, paintShowCar } from './showcar.js'; // (garage.js re-exports these: imported from their own module, so a check can load this one)
import { sharedRenderer, drawStill, boxOf } from './modelviews.js';
import { loadoutKey, onLoadout, STOCK_KEY } from './loadout.js';

export const STILL_POSE = { lift: 0.3, angle: -0.64, close: 1 }; // (from a little above, in front, three-quarters on, the nose to the left: the event cards)
// the blueprint cards' four (a model's nose is +z; angle turns it, from facing the camera: + to the right, - to the left).
// margin: the share of the picture's half width and height the turned box may fill; marginX / marginY one way each, and
// shiftY where its middle goes (a share of the half height, + up). hero and rear keep the whole box in the card's
// free band, clear of the BLUEPRINT tab (top right, about the top 11%) and the rarity word and stars (the bottom 17%)
export const POSES = {
  top: { lift: 1.08, angle: Math.PI - 0.62, fov: 30, margin: 0.88 },   // from above and a little behind, nose away up to the right
  hero: { lift: 0.035, angle: -0.36, fov: 40, marginX: 0.86, marginY: 0.72, shiftY: 0.05 },        // very low, nearly head-on
  front: { lift: 0.24, angle: 0.62, fov: 28, margin: 0.88 },           // eye height, front three-quarter, nose to the right
  rear: { lift: 0.2, angle: Math.PI + 0.72, fov: 30, marginX: 0.86, marginY: 0.72, shiftY: 0.04 },  // rear three-quarter, tail to the left
};
// REVIEW ONLY (scripts/pose-sheet.mjs, the owner's sheet of every pose of every car): the four above and `side`, a flat side
// profile on a long lens, nose to the left (tried on the cards and removed, CHECKLIST 164; its numbers from branch
// claude/blueprint-pose-lab). The game never asks for it: carposes.js still picks from the four, and poseOf below does not know it.
export const REVIEW_POSES = { ...POSES, side: { lift: 0.05, angle: -Math.PI / 2, fov: 16, marginX: 0.88, marginY: 0.66, shiftY: 0.04 } };
export const REVIEW_POSE_NAMES = ['top', 'hero', 'front', 'rear', 'side'];
const poseOf = (pose) => (typeof pose === 'string' ? POSES[pose] || STILL_POSE : pose || STILL_POSE);
const poseKey = (pose) => (typeof pose === 'string' ? pose : pose && pose !== STILL_POSE ? JSON.stringify(pose) : 'still');

const stills = new Map(); // car id + side + pose + loadout + size -> the object URL of its picture, once encoded
const dressedAs = new Map(); // a DRESSED picture's key -> { id: its car's id, loadout: the loadoutKey it was drawn with } (to let go of it once that changes)
// STOCK (stock: true): the car as it comes, no cosmetic of the player's (render/showcar.js dressCosmetics), ALWAYS in its Good livery:
// every picture under the PACK umbrella (the owner, 15-Oct: "Packs render images based on the player's customisation. It should be a
// STOCK good car"): a pack reveal's cards (render/packs.js), the car on a pack (render/packart.js), "What's inside" (render/packcontents.js),
// the Shop's featured tile (render/shop.js) and banner (render/packbanner.js), Crazey Jim's blueprint cards (render/jimshop.js), the
// "Where to get it" blueprint card (render/carsources.js), an event's hunt / featured / prize car (render/menustage.js).
// A DRESSED picture (the showroom's cards, an event's stage cards, the Cosmetics screen's fallback) is keyed by the car's LOADOUT
// SIGNATURE (render/loadout.js loadoutKey: per car id), so a change of any cosmetic draws it afresh; 'stock' is never a loadout key.
const sideOf = (evil, stock) => !stock && !!evil; // (a stock picture is the Good one, whatever is asked)
const lookOf = (car, stock) => (stock ? STOCK_KEY : 'L:' + loadoutKey(car));
const keyOf = (el, car, evil, pose, stock = false) => {
  const r = boxOf(el); // (its own laid-out size, not the box on screen a transform makes of it: modelviews.js boxOf)
  return car.id + (sideOf(evil, stock) ? '/evil/' : '/good/') + poseKey(pose) + '/' + lookOf(car, stock) + '/' + Math.round(r.width / 20) + 'x' + Math.round(r.height / 20);
};
export const stillKey = keyOf; // (for a check)
// a cosmetic changed: the dressed pictures of an old loadout are let go (the elements showing them are drawn again by their owners)
onLoadout(() => {
  for (const [key, was] of dressedAs) {
    if (was.loadout === loadoutKey(was.id)) continue;
    dressedAs.delete(key);
    const url = stills.get(key);
    stills.delete(key);
    if (url?.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 10000); // (later: a card still showing it is drawn again first)
  }
});
// a check's or a picture's log of what was asked to be drawn (window.__stillLog = [] turns it on): { car, stock, evil, pose, where }
const logAsk = (el, car, evil, stock, pose) => {
  const log = typeof window !== 'undefined' ? window.__stillLog : null;
  if (Array.isArray(log) && log.length < 2000) log.push({ car: car.id, stock: !!stock, evil: sideOf(evil, stock), pose: poseKey(pose), where: String(el.className || el.tagName || '') });
};
// the picture fills the element, whole, whatever its pixel size (drawn at the device's pixel ratio, so twice the element at
// 2x): an element whose CSS gives the background no size of its own gets `contain`, centred (a pack's car had none and
// showed its picture at its pixel size, cut off: CHECKLIST 201)
const show = (el, url) => {
  el.style.backgroundImage = `url("${url}")`;
  const cs = getComputedStyle(el);
  if (cs.backgroundSize === 'auto' || cs.backgroundSize === 'auto auto') {
    el.style.backgroundSize = 'contain'; el.style.backgroundPosition = 'center'; el.style.backgroundRepeat = 'no-repeat';
  }
  el.querySelector(':scope > canvas.still-draw')?.remove();
};
// already drawn for this element's size: shown at once (true); false: it is still to be drawn
export const stillReady = (el, car, evil, pose, stock = false) => {
  const url = stills.get(keyOf(el, car, evil, pose, stock));
  if (url) show(el, url);
  return !!url;
};
const waiting = new Map(); // key -> { canvas (the one drawn), els (to show it on once it is encoded) }
// drawn now if it is not yet (a model built, painted, rendered, and given back). False: nothing could be drawn (no
// renderer, no size yet, no model for the car)
export const stillCar = (el, car, evil, pose, stock = false) => {
  evil = sideOf(evil, stock);
  logAsk(el, car, evil, stock, pose);
  if (stillReady(el, car, evil, pose, stock)) return true;
  const key = keyOf(el, car, evil, pose, stock);
  const w = waiting.get(key);
  if (w) { // (being encoded: a copy of the one drawn until it is, so a second card of the car is never blank)
    if (!w.els.has(el)) {
      w.els.add(el);
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.querySelector(':scope > canvas.still-draw')?.remove();
      const copy = document.createElement('canvas');
      copy.width = w.canvas.width; copy.height = w.canvas.height;
      copy.className = 'still-draw';
      copy.style.cssText = 'display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      copy.getContext('2d').drawImage(w.canvas, 0, 0);
      el.append(copy);
    }
    return true;
  }
  try {
    const model = makeShowCar(car, { stock });
    paintShowCar(model, car, evil);
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.querySelector(':scope > canvas.still-draw')?.remove(); // (one drawn for another size or pose)
    if (!drawStill(sharedRenderer(), el, model, poseOf(pose))) return false;
    const canvas = el.querySelector(':scope > canvas:last-of-type');
    canvas.classList.add('still-draw');
    canvas.style.position = 'absolute'; canvas.style.inset = '0';
    const els = new Set([el]);
    waiting.set(key, { canvas, els });
    if (!stock) dressedAs.set(key, { id: car.id, loadout: loadoutKey(car) });
    const done = (url) => { waiting.delete(key); stills.set(key, url); for (const e of els) show(e, url); };
    if (canvas.toBlob) canvas.toBlob((blob) => done(blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')), 'image/png');
    else done(canvas.toDataURL('image/png'));
    return true;
  } catch (error) { console.warn('No model for the card: ' + (error?.message || error)); return false; }
};

// ---- lazily: only the pictures in view, a few a frame (a budget of time, so the screen keeps moving) ----
const BUDGET = 12; // ms of drawing a frame, at most
let queue = [], pumping = 0;
const pump = () => {
  pumping = 0;
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < BUDGET) {
    const job = queue.shift();
    if (!job.el.isConnected || job.el.dataset.still === job.key) continue;
    if (stillReady(job.el, job.car, job.evil, job.pose, job.stock)) { job.el.dataset.still = job.key; continue; }
    if (stillCar(job.el, job.car, job.evil, job.pose, job.stock)) job.el.dataset.still = job.key;
    else if (job.el.isConnected && !boxOf(job.el).width && (job.tries = (job.tries || 0) + 1) < 30) { queue.push(job); break; } // (not laid out yet: a later frame)
  }
  if (queue.length) pumping = requestAnimationFrame(pump);
};
// side: 'good' or 'evil', the livery (the pack screens always ask 'good': the owner, 12-Oct, "Render all card pack images in Good colours")
// first: drawn NOW if laid out, else ahead of the queue (a picture on screen now: the big pack of a reveal, which is up for
// under a second, before the cards' that are turned away)
// (the element's data-still is a tag, not the car's id: a blacked-out car's card must not name it: render/carsources.js)
const tags = new Map();
const tagOf = (key) => { if (!tags.has(key)) tags.set(key, 's' + tags.size); return tags.get(key); };
export const drawSoon = (el, car, { side = 'good', pose, first = false, stock = false } = {}) => {
  const evil = sideOf(side === 'evil', stock);
  logAsk(el, car, evil, stock, pose);
  const job = { el, car, evil, pose, stock, key: tagOf(car.id + '/' + (evil ? 'e' : 'g') + '/' + poseKey(pose) + '/' + lookOf(car, stock)) };
  if (el.dataset.still === job.key) return;
  if (stillReady(el, car, evil, pose, stock)) { el.dataset.still = job.key; return; } // (cached: at once, no frame)
  queue = queue.filter(j => j.el !== el); // (one job an element: a redraw at a new size replaces one not yet done)
  if (first && boxOf(el).width && stillCar(el, car, evil, pose, stock)) { el.dataset.still = job.key; return; } // (first, laid out: drawn now)
  if (first) queue.unshift(job); else queue.push(job);
  if (!pumping) pumping = requestAnimationFrame(pump);
};
// the pictures of a scrolling box (root: the box, or null for the screen): watch(el, car, { side, pose }) draws it
// once it comes within `margin` of view; stop() when the box goes
export const stillsIn = (root = null, margin = '160px') => {
  const of = new WeakMap();
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const [car, opts] = of.get(e.target) || [];
      if (car) drawSoon(e.target, car, opts);
    }
  }, { root, rootMargin: margin }) : null;
  return {
    watch(el, car, opts = {}) { if (io) { of.set(el, [car, opts]); io.observe(el); } else drawSoon(el, car, opts); },
    stop() { io?.disconnect(); queue = queue.filter(j => j.el.isConnected); },
  };
};
