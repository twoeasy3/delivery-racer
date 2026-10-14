// The lamp table's GUESSES (LAMP-PLACEMENT-GUIDE.md): cars whose models have no headlamp or no tail lamp to measure
// (scripts/lamps.mjs found none), given lamp places by best guess from the model's shape and the real vehicle, each
// put ON the body by casting a ray along the car at the chosen x, y (or at a lamp the model does have). No geometry is
// added: an effect lights only when it fires (brake, indicator, the night glow). Every entry is `guess: true`, for the
// owner to approve or strike (delete the line: the car goes back to the hitbox placement). Merged into CAR_LAMPS by
// render/carlights.js. Keyed by model name.
export const GUESS_LAMPS = {
  toybota: { guess: true, head: [{ at: [0.68, 0.86, 2.54], size: [0.36, 0.12], mirror: true }], tail: [{ at: [0.92, 0.85, -2.5], size: [0.12, 0.22], mirror: true }], blink: [{ at: [0.84, 0.86, 2.54], size: [0.08, 0.1], mirror: true, shared: 'headlamp' }, { at: [0.92, 0.77, -2.5], size: [0.12, 0.07], mirror: true, shared: 'tail lamp' }] },
  nissank: { guess: true, head: [{ at: [0.64, 0.96, 2.43], size: [0.4, 0.12], mirror: true }], tail: [{ at: [1, 1, -2.392], size: [0.12, 0.22], mirror: true }], blink: [{ at: [0.8, 0.96, 2.43], size: [0.08, 0.1], mirror: true, shared: 'headlamp' }, { at: [1, 0.92, -2.392], size: [0.12, 0.07], mirror: true, shared: 'tail lamp' }] },
  jeep: { guess: true, head: [{ at: [0.57, 1, 1.825], size: [0.3, 0.1], mirror: true }], tail: [{ at: [0.85, 0.85, -1.8], size: [0.1, 0.18], mirror: true }], blink: [{ at: [0.7, 1, 1.825], size: [0.07, 0.09], mirror: true, shared: 'headlamp' }, { at: [0.85, 0.78, -1.8], size: [0.1, 0.06], mirror: true, shared: 'tail lamp' }] },
  dragster: { guess: true, head: [{ at: [0.12, 0.45, 2.768], size: [0.05, 0.04], round: true, mirror: true }], tail: [{ at: [0.14, 0.7, -3.55], size: [0.08, 0.1], mirror: true }] },
  solarracer: { guess: true, head: [{ at: [0.55, 0.3, 2.383], size: [0.2, 0.05], mirror: true }], tail: [{ at: [0, 0.3, -2.515], size: [0.9, 0.03] }], blink: [{ at: [0.7, 0.3, 2.383], size: [0.07, 0.05], mirror: true, shared: 'headlamp' }, { at: [0.42, 0.3, -2.515], size: [0.07, 0.03], mirror: true, shared: 'tail lamp' }] },
  moonrover: { guess: true, head: [{ at: [0.55, 0.62, 1.032], size: [0.08, 0.08], round: true, mirror: true }], tail: [{ at: [0.81, 0.79, -1.407], size: [0.1, 0.08], mirror: true }] },
  f1: { guess: true, tail: [{ at: [0, 1.05, -2.654], size: [0.12, 0.08] }] },
  apc: { guess: true, head: [{ at: [0.89, 1.28, 3.355], size: [0.16, 0.08], mirror: true }], tail: [{ at: [1.1, 1.3, -3.264], size: [0.12, 0.1], mirror: true }], blink: [{ at: [1.1, 1.28, 3.124], size: [0.08, 0.08], mirror: true, shared: 'none: on the hull beside the lamp' }, { at: [1.1, 1.18, -3.264], size: [0.12, 0.06], mirror: true, shared: 'tail lamp' }] },
  steamwagon: { guess: true, head: [{ at: [0.51, 1.3, 1.94], size: [0.2, 0.2], round: true, mirror: true }], tail: [{ at: [0.48, 1.2, -2.38], size: [0.1, 0.1] }] },
  cigar: { guess: true, head: [{ at: [0.14, 0.45, 1.768], size: [0.05, 0.05], round: true, mirror: true }], tail: [{ at: [0, 0.45, -2.16], size: [0.08, 0.08] }] },
  mower: { guess: true, head: [{ at: [0.17, 0.66, 1.065], size: [0.08, 0.08], round: true, mirror: true }], tail: [{ at: [0.3, 0.55, -0.997], size: [0.08, 0.06], mirror: true }] },
  sidecar: { guess: true, head: [{ at: [-0.29, 1.1, 0.86], size: [0.12, 0.12], round: true }], tail: [{ at: [0, 0.6, -1.25], size: [0.1, 0.07] }] },
  jetboat: { guess: true, head: [{ at: [0, 0.62, 1.762], size: [0.06, 0.06], round: true }], tail: [{ at: [0.8, 0.47, -2.73], size: [0.08, 0.08], mirror: true }] },
};
