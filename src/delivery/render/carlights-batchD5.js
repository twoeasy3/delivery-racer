// The lamp table's entries for batch D5's idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Same format as CAR_LAMPS. Measured from the models (render/ideaModelsBatchD5.js: the
// lamp meshes split into connected pieces, each piece's centre and the outer face of its lens). None moves (no frame).
export const BATCH_D5 = {
  // round headlamps in the open nose, small ambers under the grille; red tail lamps (each brakes whole) with an amber
  // bar under each. The roof light bar's lamps are left out (a work bar, not a main beam).
  trophytruck: {
    head: [{ at: [0.52, 0.8, 2.775], size: [0.19, 0.19], round: true, mirror: true }],
    tail: [{ at: [0.5, 0.88, -2.771], size: [0.24, 0.1], mirror: true }],
    blink: [{ at: [0.28, 0.62, 2.769], size: [0.1, 0.07], mirror: true }, { at: [0.5, 0.72, -2.771], size: [0.24, 0.07], mirror: true }],
  },
  // two stacked round headlamps a side, an amber under the lower one; tall slim red tail lamps (each brakes whole)
  // with an amber foot
  armouredlimo: {
    head: [
      { at: [1.0, 0.88, 3.08], size: [0.17, 0.17], round: true, mirror: true },
      { at: [1.0, 0.7, 3.08], size: [0.17, 0.17], round: true, mirror: true },
    ],
    tail: [{ at: [1.082, 0.85, -3.081], size: [0.18, 0.36], mirror: true }],
    blink: [{ at: [1.0, 0.54, 3.079], size: [0.12, 0.08], mirror: true }, { at: [1.082, 0.6, -3.081], size: [0.18, 0.08], mirror: true }],
  },
};
