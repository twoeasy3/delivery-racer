// The lamp table's entries for the batch E5 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Taken from the lamp boxes in render/ideaModelsBatchE5.js (outer face of each lens). None moves.
export const BATCH_E5_LAMPS = {
  // wide rectangular headlamps either side of the grille; a red tail lamp (not braking) with a darker brake lamp inboard of it
  // each side; amber lenses under the headlamps' outer ends and under the tail lamps
  touringcar: {
    head: [{ at: [0.68, 0.5, 2.165], size: [0.34, 0.12], mirror: true }],
    tail: [{ at: [0.66, 0.8, -2.165], size: [0.4, 0.13], mirror: true, brake: false }, { at: [0.32, 0.8, -2.172], size: [0.14, 0.11], mirror: true }],
    blink: [{ at: [0.8, 0.4, 2.165], size: [0.14, 0.05], mirror: true }, { at: [0.84, 0.68, -2.165], size: [0.12, 0.05], mirror: true }],
  },
  hillclimb: {
    head: [{ at: [0.73, 0.5, 1.965], size: [0.34, 0.12], mirror: true }],
    tail: [{ at: [0.64, 0.82, -1.915], size: [0.44, 0.1], mirror: true, brake: false }, { at: [0.27, 0.82, -1.922], size: [0.16, 0.1], mirror: true }],
    blink: [{ at: [0.8, 0.4, 1.965], size: [0.14, 0.05], mirror: true }, { at: [0.8, 0.66, -1.915], size: [0.12, 0.05], mirror: true }],
  },
};
