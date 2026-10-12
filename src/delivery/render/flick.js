// ---- the FLICKS of a pack slot that gives n copies of one card (the owner, 12-Oct: "when the card is flipped over, the
// extra cards need to animate and flick onto the pile. Each card that flicks on, increases the badge by 1").
// The card has turned showing x1; then each extra copy (packs.js flickPlan: when, from where, onto which pose) is a copy
// of the card's face thrown in from off to the side, a little above, turning as it comes, and tucked onto the pile
// BEHIND the card at a slight offset and tilt; as it lands the card thuds (a quick scale), the badge goes up one and
// pops, and the caller is told (the progress bar's next step, a light blip). The pile is at most FLICK.layers plain card
// edges (a later copy lands on one already there), the thrown copy one of two clones of the face reused in turn (two
// can be in the air at once): a bounded handful of nodes a slot, made only for a slot of more than one. Transforms and
// opacity only, by the Web Animations API (no layout read, no per-frame script). complete(): everything landed at once (a
// tap). freeze(s): held as it stands s seconds after the first throw (the debug &flick=, for a still).
// flickPile({ face, card, badge, plan, onLand(badge, instant), schedule(ms, f) }) -> { start, complete, freeze }
import { flickState } from '../packs.js';

const pose = (p, scale = 1) => 'translate(' + p.x.toFixed(2) + '%, ' + p.y.toFixed(2) + '%) rotate(' + p.r.toFixed(2) + 'deg)' + (scale !== 1 ? ' scale(' + scale + ')' : '');
const animate = (el, frames, opts) => (typeof el.animate === 'function' ? el.animate(frames, opts) : null);

export const flickPile = ({ face, card, badge, plan, onLand = () => {}, schedule = (ms, f) => setTimeout(f, ms) }) => {
  const none = { start() {}, complete() {}, freeze() {} };
  if (!plan?.copies?.length) return none;
  const count = badge?.querySelector('b');
  if (count) count.textContent = '1'; // (it turns showing x1; each copy that lands adds one)
  let pile = null, layers = [], fliers = [], flights = [null, null], done = false, shown = 1;
  const build = () => {
    if (pile) return;
    pile = document.createElement('div');
    pile.className = 'pr-pile';
    pile.setAttribute('aria-hidden', 'true');
    layers = plan.copies.filter(c => c.fresh).map(c => {
      const layer = document.createElement('i');
      layer.className = 'pr-layer';
      layer.style.transform = pose(c.to);
      return layer;
    });
    pile.append(...layers);
    face.prepend(pile);
  };
  const flier = (i) => { // (a copy of the face as it is now: its picture drawn by then; no badge on it)
    if (!fliers[i]) {
      const f = card.cloneNode(true);
      f.classList.add('pr-flier');
      f.removeAttribute('aria-label');
      f.setAttribute('aria-hidden', 'true');
      f.querySelector('.bp-amount')?.remove();
      face.insertBefore(f, card);
      fliers[i] = f;
    }
    return fliers[i];
  };
  const show = (n, pop) => {
    shown = Math.max(shown, n);
    if (count) count.textContent = String(shown);
    if (pop) animate(badge, [{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2, 1.6, .4, 1)' });
  };
  const launch = (c, at = 0) => {
    build();
    const i = (c.copy - 2) % 2, f = flier(i);
    flights[i]?.cancel();
    f.classList.add('fly');
    const a = animate(f, [
      { transform: pose(c.from, 1.04), opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.18 },
      { transform: pose(c.to), opacity: 1, offset: 1 },
    ], { duration: Math.max(1, c.land - c.launch), easing: 'cubic-bezier(.22, .8, .32, 1)', fill: 'forwards' });
    flights[i] = a;
    if (a && at) { a.currentTime = at; a.pause(); }
  };
  const land = (c, quiet = false) => {
    if (done) return;
    build();
    const i = (c.copy - 2) % 2;
    if (flights[i]) { flights[i].cancel(); flights[i] = null; }
    fliers[i]?.classList.remove('fly');
    if (c.fresh) layers[plan.copies.filter(x => x.fresh).indexOf(c)]?.classList.add('on');
    show(c.badge, !quiet);
    if (!quiet) animate(card, [{ transform: 'scale(1.045)' }, { transform: 'none' }], { duration: 160, easing: 'cubic-bezier(.3, 1.4, .5, 1)' });
    onLand(c.badge, quiet);
  };
  const complete = () => {
    if (done) return;
    build();
    for (const c of plan.copies) if (c.badge > shown) land(c, true);
    for (const [i, a] of flights.entries()) { a?.cancel(); flights[i] = null; fliers[i]?.classList.remove('fly'); }
    layers.forEach(l => l.classList.add('on'));
    show(plan.n, false);
    onLand(plan.n, true);
    done = true;
  };
  return {
    start() {
      if (plan.reduced) { complete(); return; } // (reduced motion: no throws, the whole amount at once)
      for (const c of plan.copies) { schedule(c.launch, () => { if (!done) launch(c); }); schedule(c.land, () => land(c)); }
      schedule(plan.lastLand + 1, () => { done = true; });
    },
    complete,
    freeze(seconds) { // (held: the copies landed by then on the pile, those in the air where they are)
      const t = seconds * 1000, st = flickState(plan, t);
      for (const c of plan.copies.slice(0, st.landed)) land(c, true);
      for (const c of st.flying) launch(c, t - c.launch);
    },
  };
};
