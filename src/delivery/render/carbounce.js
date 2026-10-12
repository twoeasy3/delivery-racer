// ---- a car LANDING: a tiny drop onto the floor and a damped suspension bounce (the showroom's live car) -------------
// API (pure, no three.js, no layout): bounceOffset(t, reduced = false) -> { y, pitch, roll, shadow, alpha }
//   t: seconds since the car came on screen. y: metres to add to the body's height (+ up; the drop is a FIXED 0.05 m,
//   about 2 inches, for every car: the owner, 12-Oct). pitch / roll: radians to add to the body (nose down +, tiny).
//   shadow: the contact shadow's scale factor (1 = at rest; a touch wider while the car is up). alpha: 0..1 fade-in.
//   reduced (prefers-reduced-motion, or a locked silhouette): no drop, no bounce: only a plain fade-in (alpha).
// bounceDone(t): true once it is over (BOUNCE_TIME, about 0.8 s; the caller can stop asking then).
// The motion: a free fall of 0.05 m (0.1 s), then a damped spring (about 3.4 Hz, 2-3 decaying bounces) whose first
// dip is about the size of the drop. Use: body.position.y = rest + o.y; body.rotation.x = o.pitch; body.rotation.z = o.roll.
export const DROP = 0.05;          // m: the fixed drop
export const BOUNCE_TIME = 0.8;    // s: the whole of it
export const FADE_TIME = 0.25;     // s: the fade-in (with or without the drop)
const G = 9.81, FALL = Math.sqrt(2 * DROP / G), HIT = Math.sqrt(2 * G * DROP); // (s to fall; m/s on landing)
const W = 2 * Math.PI * 3.4, K = 4.6; // (the spring's angular frequency, rad/s; its damping, 1/s)

export const bounceOffset = (t, reduced = false) => {
  const alpha = Math.max(0, Math.min(1, t / FADE_TIME));
  if (reduced || !(t >= 0) || t >= BOUNCE_TIME) return { y: 0, pitch: 0, roll: 0, shadow: 1, alpha: reduced || t >= BOUNCE_TIME ? alpha : 0 };
  if (t < FALL) {
    const y = DROP - 0.5 * G * t * t;
    return { y, pitch: 0, roll: 0, shadow: 1 + 1.6 * y, alpha };
  }
  const s = t - FALL, decay = Math.exp(-K * s) * Math.min(1, (BOUNCE_TIME - t) / 0.15); // (and eased to nothing at the end: no step)
  const y = -(HIT / W) * decay * Math.sin(W * s);                   // (the body on its springs: down, up, down...)
  const pitch = 0.010 * decay * Math.sin(W * s + 0.6);               // (the nose dips a touch, a little after the body)
  const roll = 0.005 * decay * Math.sin(W * 0.83 * s + 1.1);         // (and a touch of roll, out of step)
  return { y, pitch, roll, shadow: 1 + 1.6 * Math.max(0, y) - 0.8 * Math.max(0, -y), alpha };
};
export const bounceDone = (t) => t >= BOUNCE_TIME;
