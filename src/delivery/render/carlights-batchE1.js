// The lamp table's entries for the batch E1 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Taken from the lamp lines of the models (render/ideaModelsBatchE1.js: the centre of each
// lens and its outer face). None moves (no frame).
export const BATCH_E1_LAMPS = {
  // round lamps on the front corners of the nose with a small amber lens under each; a small red tail lamp (brakes whole)
  // each side of the rear face, the rear indicators flashing over them (amber, as on a European car; no lens of their own)
  cinquecento: {
    head: [{ at: [0.36, 0.66, 1.5], size: [0.17, 0.17], round: true, mirror: true }],
    tail: [{ at: [0.33, 0.62, -1.518], size: [0.12, 0.09], mirror: true }],
    blink: [{ at: [0.31, 0.52, 1.515], size: [0.1, 0.05], mirror: true }, { at: [0.33, 0.62, -1.518], size: [0.12, 0.09], mirror: true, shared: 'tail lamp' }],
  },
  // square lamps either side of the grille with an amber lens under each; a tall red tail lamp on each rear corner (brakes
  // whole) with an amber lens under it
  keivan: {
    head: [{ at: [0.52, 0.82, 1.72], size: [0.22, 0.16], mirror: true }],
    tail: [{ at: [0.63, 1.1, -1.72], size: [0.1, 0.4], mirror: true }],
    blink: [{ at: [0.53, 0.62, 1.715], size: [0.2, 0.07], mirror: true }, { at: [0.63, 0.78, -1.72], size: [0.1, 0.1], mirror: true }],
  },
};
