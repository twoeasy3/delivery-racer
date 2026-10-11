// small maths helpers used everywhere
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// fraction of the way to a target to move this step, for smoothing that is frame-rate independent
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
