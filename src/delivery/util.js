// small maths helpers used everywhere
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// fraction of the way to a target to move this step, for smoothing that is frame-rate independent
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

// ---- the game logic's own dice (REPLAY-NOTES.md): every random choice that changes what happens in a run draws from
// random(), never Math.random, which rendering keeps for itself (so nothing drawn can change the run, and a run
// replays from its seed). Unseeded it is Math.random (a test that seeds Math.random seeds this too); seeded,
// mulberry32, as the replay and smoke checks seed Math.random.
const mulberry32 = (a) => () => {
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let dice = null;
export const random = () => (dice ? dice() : Math.random());
// seed the logic's dice (a 32-bit integer), or with null go back to Math.random
export const seedRandom = (seed) => { dice = seed === null || seed === undefined ? null : mulberry32(seed >>> 0); };
// a fresh seed to start a run or a load from (from Math.random: where it starts is the one thing not replayed)
export const newSeed = () => Math.floor(Math.random() * 4294967296) >>> 0;
// put other dice in for a while (a function of no arguments, or null for Math.random): the ones put back are returned.
// (cleanrun.js, a clean run worked out with dice of its own, sets the logic's and Math.random both, and restores them)
export const swapDice = (fn) => { const was = dice; dice = fn; return was; };
