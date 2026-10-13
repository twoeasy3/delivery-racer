// ---- the showroom row's PAN: the arrows' (and the arrow keys') sideways slide of the cards, retargetable ------------
// The owner, 13-Oct, on a tablet: "On the showroom, tapping left or right while the screen pans resets the animation and
// becomes really jarring." The arrows used the browser's own smooth scroll (scrollBy / scrollIntoView, behavior smooth):
// each tap started a NEW smooth scroll from where the row was, from standing (the row stood still for frames, then
// started again), the proximity snap pulled at it in between, and taps were lost (four quick taps went less than two
// steps). Here the pan is ours: one ease-in-out slide (a cubic: smoothstep from standing to standing, the same look as
// before for one tap); a tap during it moves the TARGET on by a step from the target, not from where the row is, and the
// slide goes on from where it is AT THE SPEED IT HAS (a cubic Hermite from the current place and speed to the new
// target): no restart, no snap back, never backwards while the taps go the same way. A tap the other way turns it round
// smoothly. Pure (no DOM, the clock passed in): render/showroom.js drives it per frame; scripts/.showroom-check.mjs runs
// it on a fake clock.
export const PAN_MS = 380; // (one pan's length: about the browser's smooth scroll for a screen's width)

// the place and speed (px per ms) of a pan at time now; done once it is there
export const panAt = (pan, now) => {
  const D = pan.ms, s = Math.min(1, Math.max(0, (now - pan.t0) / D));
  if (s >= 1) return { x: pan.to, v: 0, done: true };
  const s2 = s * s, s3 = s2 * s, gap = pan.to - pan.from, m = pan.v0 * D; // (the start's speed, as a slope over the pan)
  const x = pan.from + gap * (3 * s2 - 2 * s3) + m * (s3 - 2 * s2 + s);
  const v = (gap * (6 * s - 6 * s2) + m * (3 * s2 - 4 * s + 1)) / D;
  return { x, v, done: false };
};
// a new pan to target `to` from the pan running (or from standing at x): it starts where the old one is NOW at the speed
// it has. (The speed is held to three times the gap over the pan, the most a cubic can carry without passing the target
// and coming back.)
export const panTo = (pan, x, to, now, ms = PAN_MS) => {
  const at = pan ? panAt(pan, now) : { x, v: 0, done: true };
  const from = at.done ? x : at.x, gap = to - from, most = 3 * Math.abs(gap) / ms;
  let v0 = at.done ? 0 : at.v;
  if (gap * v0 > 0 && Math.abs(v0) > most) v0 = Math.sign(v0) * most;
  return { from, to, v0, t0: now, ms };
};
// where a tap of the arrows aims: on from the TARGET of the pan running (else from x) by about step px, onto the
// start of a column of cards (the snap's own place, so nothing is pulled when the snap comes back on), within 0..max;
// starts: the columns' scroll positions, sorted
export const panStep = (base, dir, step, starts, max) => {
  const want = base + dir * step;
  let best = want;
  if (starts.length) {
    best = starts.reduce((a, b) => Math.abs(b - want) < Math.abs(a - want) ? b : a);
    if (dir * (best - base) < 1) best = starts.find(p => dir > 0 ? p > base + 1 : false) ?? [...starts].reverse().find(p => dir < 0 && p < base - 1) ?? want;
  }
  return Math.max(0, Math.min(max, best));
};
