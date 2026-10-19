// The lamp table's entries for batch M2's idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the model name; merged into the
// table by render/carlights.js. Same format as CAR_LAMPS. Measured from the models (render/ideaModelsBatchM2.js). None moves (no frame).
export const BATCH_M2_LAMPS = {
  // the low lamps in the nose and the high pair at the step under the windscreen (the Multipla's two tiers: both listed as headlamps),
  // ambers at the nose's corners; tall tail lamps either side of the tailgate (each brakes whole) with an amber lens under each
  stepmpv: {
    head: [{ at: [0.62, 0.56, 2.035], size: [0.18, 0.18], round: true, mirror: true }, { at: [0.6, 0.95, 1.505], size: [0.15, 0.15], round: true, mirror: true }],
    tail: [{ at: [0.72, 0.86, -2.019], size: [0.15, 0.24], mirror: true }],
    blink: [{ at: [0.8, 0.56, 2.019], size: [0.07, 0.07], mirror: true }, { at: [0.72, 0.67, -2.019], size: [0.15, 0.07], mirror: true }],
  },
  // round headlamps in chrome rims either side of the grille, a real amber lens outboard of each; at the back a tail lamp over an
  // amber lens each side (each tail lamp brakes whole)
  mobilelibrary: {
    head: [{ at: [0.86, 1.08, 3.385], size: [0.2, 0.2], round: true, mirror: true }],
    tail: [{ at: [0.98, 1.2, -3.369], size: [0.13, 0.18], mirror: true }],
    blink: [{ at: [1.12, 1.08, 3.369], size: [0.15, 0.07], mirror: true }, { at: [0.98, 1.0, -3.369], size: [0.13, 0.09], mirror: true }],
  },
  // round headlamps either side of the grille, ambers under them; on the rear beam a tail lamp each side (brakes whole) and an amber
  // lens outboard of it
  jingletruck: {
    head: [{ at: [0.52, 1.18, 3.335], size: [0.19, 0.19], round: true, mirror: true }],
    tail: [{ at: [0.7, 0.9, -3.515], size: [0.18, 0.11], mirror: true }],
    blink: [{ at: [0.52, 0.95, 3.319], size: [0.13, 0.06], mirror: true }, { at: [1.0, 0.9, -3.515], size: [0.13, 0.11], mirror: true }],
  },
};
