// The lamp table's PARTIAL cars (LAMP-PLACEMENT-GUIDE.md): models where scripts/lamps.mjs found no headlamp or no tail
// lamp. Each entry lists ONLY the lamps the model really has (its own lamp pieces, measured; the Steam Wagon's brass
// carriage lamps are lamps though not lit by the model); an end the entry has no lamps for keeps the old hitbox
// placement for that end (render/carlights.js lampsFor: per group). Indicators only where they flash on a real lamp;
// an end with real lamps but no indicator entry has no indicators. `guess: true`: the owner approves or strikes each
// (delete the line: the whole car goes back to the hitbox placement). The cars with no lamp piece at all (the Moon
// Rover, the F1) are not listed. Merged into CAR_LAMPS by render/carlights.js. Keyed by model name.
export const GUESS_LAMPS = {
  toybota: { guess: true, head: [{ at: [0.68, 0.86, 2.54], size: [0.36, 0.12], mirror: true }], blink: [{ at: [0.84, 0.86, 2.54], size: [0.08, 0.1], mirror: true, shared: 'headlamp' }] },
  nissank: { guess: true, head: [{ at: [0.64, 0.96, 2.43], size: [0.4, 0.12], mirror: true }], blink: [{ at: [0.8, 0.96, 2.43], size: [0.08, 0.1], mirror: true, shared: 'headlamp' }] },
  jeep: { guess: true, head: [{ at: [0.57, 1, 1.825], size: [0.3, 0.1], mirror: true }], blink: [{ at: [0.7, 1, 1.825], size: [0.07, 0.09], mirror: true, shared: 'headlamp' }] },
  dragster: { guess: true, tail: [{ at: [0.14, 0.7, -3.55], size: [0.08, 0.1], mirror: true }] },
  solarracer: { guess: true, tail: [{ at: [0, 0.3, -2.515], size: [0.9, 0.03] }], blink: [{ at: [0.42, 0.3, -2.515], size: [0.07, 0.03], mirror: true, shared: 'tail lamp' }] },
  apc: { guess: true, head: [{ at: [0.89, 1.28, 3.355], size: [0.16, 0.08], mirror: true }], blink: [{ at: [0.935, 1.28, 3.355], size: [0.07, 0.08], mirror: true, shared: 'headlamp' }] },
  steamwagon: { guess: true, head: [{ at: [0.51, 1.3, 1.94], size: [0.2, 0.2], round: true, mirror: true }], tail: [{ at: [0.48, 1.2, -2.38], size: [0.1, 0.1] }] },
  cigar: { guess: true, tail: [{ at: [0, 0.45, -2.16], size: [0.08, 0.08] }] },
  mower: { guess: true, head: [{ at: [0.17, 0.66, 1.065], size: [0.08, 0.08], round: true, mirror: true }] },
  sidecar: { guess: true, head: [{ at: [-0.29, 1.1, 0.86], size: [0.12, 0.12], round: true }], tail: [{ at: [0, 0.6, -1.25], size: [0.1, 0.07] }] },
  // (its hull bobs on the chop: the lamps ride in it, model.userData.lampFrame)
  jetboat: { guess: true, frame: 'lampFrame', tail: [{ at: [0.8, 0.47, -2.73], size: [0.08, 0.08], mirror: true }] },
};
