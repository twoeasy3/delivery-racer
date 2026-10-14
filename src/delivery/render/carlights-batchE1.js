// The lamp table's entries for the batch E1 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Taken from the lamp lines of the models (render/ideaModelsBatchE1.js: the centre of each
// lens and its outer face). None moves (no frame).
export const BATCH_E1_LAMPS = {
  // square lamps either side of the grille with an amber lens under each; a tall red tail lamp on each rear corner (brakes
  // whole) with an amber lens under it
  keivan: {
    head: [{ at: [0.52, 0.82, 1.72], size: [0.22, 0.16], mirror: true }],
    tail: [{ at: [0.63, 1.1, -1.72], size: [0.1, 0.4], mirror: true }],
    blink: [{ at: [0.53, 0.62, 1.715], size: [0.2, 0.07], mirror: true }, { at: [0.63, 0.78, -1.72], size: [0.1, 0.1], mirror: true }],
  },
};
