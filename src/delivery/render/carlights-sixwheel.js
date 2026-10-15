// The lamp table's entry for the Six-Wheel Supercar (a Legendary key car; LAMP-PLACEMENT-GUIDE.md), keyed by its model name; merged into
// the table by render/carlights.js. Taken from the lamp parts in render/ideaModelsSixWheel.js (the outer face of each lens). None moves.
// A slim headlamp in each top corner of the nose with an amber lens outboard; two round lamps a side in the black tail panel: the outer
// one a tail lamp (not braking), the inner one the brake lamp; an amber indicator bar under each pair.
export const SIXWHEEL_LAMPS = {
  sixwheeler: {
    head: [{ at: [0.55, 0.48, 2.099], size: [0.36, 0.08], mirror: true }],
    tail: [{ at: [0.72, 0.68, -2.091], size: [0.17, 0.17], round: true, mirror: true, brake: false }, { at: [0.5, 0.68, -2.091], size: [0.17, 0.17], round: true, mirror: true }],
    blink: [{ at: [0.8, 0.48, 2.097], size: [0.1, 0.08], mirror: true }, { at: [0.62, 0.55, -2.086], size: [0.18, 0.04], mirror: true }],
  },
};
