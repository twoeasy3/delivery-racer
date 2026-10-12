// ---- the KEY CARD's picture: the car's KEY, not the car (the owner, 12-Oct, after Asphalt 9's CAR KEY card) ----------
// A Bespoke card is a car's key (packs.js: a card with `key`). render/blueprintcard.js asks keyPicture() for its picture,
// and this draws one of the three key models (render/keyModels.js) there, tinted by the car (its Good livery colour) and
// lit by the card's rarity, tilted large across the picture as the reference's key is. The picture is a STILL, drawn by
// the menu's ONE shared renderer (modelviews.js drawStill: no WebGL context of its own), LAZILY: only once the card is
// within reach of the screen (an IntersectionObserver), a few a frame, and kept as a picture by car, model, rarity and
// size (encoded off the main thread, an object URL), so the reveal, the contents sheet and a second card of it reuse it.
// The look of the card round it (the CAR KEY tab, the blue/purple streaks, the rainbow rim) is keycard.css.
// Which key: KEY_MODEL (keyModels.js), or ?keymodel=fob|classic|smart for a visit (to compare the three live).
// Debug: ?pack=bespoke opens a pack (nothing saved) whose cards include the Silver Comet's KEY (the first Bespoke key
// car; &keycar=<id> another car's, &reveal=all every card turned at once); ?keys (or ?keys=<car id>) shows the three keys side by side, large, on a plain backdrop, each also from the
// front, the side, the back and above (for stills).
import '../keycard.css';
import * as THREE from 'three';
import { makeKey, KEY_MODEL, KEY_MODELS } from './keyModels.js';
import { sharedRenderer, drawStill } from './modelviews.js';

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
// the key model the cards draw: ?keymodel= for a visit, else KEY_MODEL
// (the car's own key style, `keyModel` in cars.js, always the same; ?keymodel= overrides it for a visit, to compare the three)
export const keyModelInUse = (car) => (KEY_MODELS.includes(params.get('keymodel')) ? params.get('keymodel') : KEY_MODELS.includes(car?.keyModel) ? car.keyModel : KEY_MODEL);

// the pose: the key turned a little and tipped across the picture (its head up and left, its blade down and right),
// seen from a little above, framed tight (modelviews.js poseView)
export const KEY_POSE = { lift: 0.2, angle: 0.38, fov: 30, margin: 0.98 }; // (a little more than a car: the corners of a tipped key's box are mostly empty)
const TILT = { fob: -0.62, classic: -0.5, smart: -0.55 }; // (rad about the picture's axis: + turns the head left)
// the key in its pose's wrapper (the wrapper has no animate: a still never sways)
export const posedKey = (car, { model = keyModelInUse(car), rarity = 'bespoke', tilt = TILT[model] ?? -0.55, turn = 0 } = {}) => {
  const wrap = new THREE.Group(), key = makeKey(car, { model, rarity });
  key.rotation.y = turn;
  const tipped = new THREE.Group();
  tipped.rotation.z = -tilt;
  tipped.add(key);
  wrap.add(tipped);
  return wrap;
};

// ---- the stills: drawn once, kept ----
const stills = new Map(); // car id / model / rarity / pose / size -> object URL
const keyOf = (el, car, o) => {
  const r = el.getBoundingClientRect();
  return [car.id, o.model, o.rarity, o.pose || 'card', Math.round(r.width / 20) + 'x' + Math.round(r.height / 20)].join('/');
};
const show = (el, url) => { el.style.backgroundImage = `url("${url}")`; el.querySelector(':scope > canvas.key-draw')?.remove(); };
// drawn now (true), or not yet possible (false: no renderer, no size)
const drawKey = (el, car, o) => {
  const key = keyOf(el, car, o);
  if (stills.has(key)) { show(el, stills.get(key)); return true; }
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  try {
    el.querySelector(':scope > canvas.key-draw')?.remove();
    const model = posedKey(car, o);
    if (!drawStill(sharedRenderer(), el, model, o.view || KEY_POSE)) return false;
    const canvas = el.querySelector(':scope > canvas:last-of-type');
    canvas.classList.add('key-draw');
    canvas.style.position = 'absolute'; canvas.style.inset = '0';
    const done = (url) => { stills.set(key, url); if (el.isConnected) show(el, url); };
    if (canvas.toBlob) canvas.toBlob((blob) => done(blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')), 'image/png');
    else done(canvas.toDataURL('image/png'));
    return true;
  } catch (error) { console.warn('No key model for the card: ' + (error?.message || error)); return true; }
};
// a few a frame (a budget of time)
let queue = [], pumping = 0;
const pump = () => {
  pumping = 0;
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < 12) {
    const job = queue.shift();
    if (!job.el.isConnected) continue;
    if (!drawKey(job.el, job.car, job.o) && (job.tries = (job.tries || 0) + 1) < 40) { queue.push(job); break; } // (not laid out yet: a later frame)
  }
  if (queue.length) pumping = requestAnimationFrame(pump);
};
const soon = (el, car, o) => { queue.push({ el, car, o }); if (!pumping) pumping = requestAnimationFrame(pump); };
// drawn once its card comes near the screen (whatever scrolls it: the reveal, the contents sheet's body). Queued once
const start = (el) => {
  const job = el._key;
  if (!job || job.queued) return;
  job.queued = true;
  near?.unobserve(el);
  pending.delete(el);
  soon(el, job.car, job.o);
};
const near = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) start(e.target);
}, { rootMargin: '200px' }) : null;
// and a look now and then for a picture on screen the observer has not told of (in headless Chromium it sometimes never
// did, and the key card stayed blank): a picture connected and within 200 px of the window is drawn; one that was in the
// page and has left it is forgotten
const pending = new Set();
let polling = 0;
const poll = () => {
  polling = 0;
  const h = window.innerHeight, w = window.innerWidth;
  for (const el of pending) {
    if (!el.isConnected) { if (el._key.seen) pending.delete(el); continue; }
    el._key.seen = true;
    const r = el.getBoundingClientRect();
    if (r.width && r.bottom > -200 && r.top < h + 200 && r.right > -200 && r.left < w + 200) start(el);
  }
  if (pending.size) polling = setTimeout(poll, 600);
};

// the key card's picture element (blueprintcard.js puts it where the car's picture would be): drawn lazily by itself
export const keyPicture = (car, rarity = 'bespoke', { model = keyModelInUse(car) } = {}) => {
  const el = document.createElement('div');
  el.className = 'bp-pic bp-keypic';
  el.dataset.keymodel = model;
  const o = { model, rarity };
  el._key = { car, o };
  near?.observe(el);
  pending.add(el);
  if (!polling) polling = setTimeout(poll, 600);
  return el;
};

// ---- debug: ?pack=bespoke and ?keys ----
const KEY_CAR = 'silvercomet'; // (the first Bespoke key car)
if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.createElement) {
  if (params.get('pack') === 'bespoke') {
    // a standard pack, opened as a player would see it (render/packs.js), with the Silver Comet's KEY among its cards.
    // Nothing is saved (?pack sets Progress.noSave; so does this, first)
    Promise.all([import('../packs.js'), import('../progress.js'), import('../cars.js')]).then(([{ Packs }, { Progress }, Cars]) => {
      Progress.noSave = true;
      const car = Cars.carById?.(params.get('keycar') || KEY_CAR) || Cars.carById?.(KEY_CAR);
      if (!car) return;
      const open = Packs.open;
      let given = false;
      Packs.open = function (kind, options) {
        const result = open.call(this, kind, options);
        if (result && !given) {
          given = true;
          result.cards.push({ rarity: 'bespoke', car: car.id, key: true, featured: false, upgraded: false, isNew: !Progress.owns(car.id) });
        }
        return result;
      };
      Packs.grant('standard');
      setTimeout(() => Packs.revealNow(), 400);
      if (params.get('reveal') === 'all') setTimeout(() => document.getElementById('packReveal')?.click(), 900); // (&reveal=all: every card turned at once, a tap: for a picture)
    });
  }
  if (params.has('keys')) {
    import('../cars.js').then((Cars) => {
      const car = Cars.carById?.(params.get('keys') || KEY_CAR) || Cars.carById?.(KEY_CAR);
      if (!car) return;
      const sheet = document.createElement('div');
      sheet.className = 'key-sheet';
      const title = document.createElement('h2');
      title.textContent = 'Car keys: ' + car.name + ' (default: ' + KEY_MODEL + ')';
      sheet.append(title);
      const big = document.createElement('div');
      big.className = 'key-sheet-row';
      const sides = document.createElement('div');
      sides.className = 'key-sheet-sides';
      const jobs = [];
      for (const model of KEY_MODELS) {
        const tile = document.createElement('figure');
        const pic = document.createElement('div');
        pic.className = 'key-sheet-pic';
        const cap = document.createElement('figcaption');
        cap.textContent = model + (model === KEY_MODEL ? ' (default)' : '');
        tile.append(pic, cap);
        big.append(tile);
        jobs.push([pic, { model, rarity: 'bespoke' }]);
        // from all sides: the front, the right side, the back, from above (the key upright, not tipped)
        const row = document.createElement('div');
        row.className = 'key-sheet-views';
        for (const [name, turn, lift] of [['front', 0, 0.05], ['side', Math.PI / 2, 0.05], ['back', Math.PI, 0.05], ['above', 0.5, 1.2], ['below', -0.6, -0.9]]) {
          const v = document.createElement('div');
          v.className = 'key-sheet-pic small';
          v.title = model + ' ' + name;
          v.dataset.label = model + ' · ' + name;
          row.append(v);
          jobs.push([v, { model, rarity: 'bespoke', tilt: 0, turn, pose: name, view: { lift, angle: 0, fov: 30, margin: 0.9 } }]);
        }
        sides.append(row);
      }
      sheet.append(big, sides);
      document.body.append(sheet);
      for (const [el, o] of jobs) soon(el, car, o);
    });
  }
}
