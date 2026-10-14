// The lamp table's entries for the batch E4 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Worked out from the models (render/ideaModelsBatchE4.js: each lamp's centre and the outer face
// of its lens). None moves (no frame).
export const BATCH_E4_LAMPS = {
  // wide rectangular headlamps at the nose corners, an amber bar under each; a tall red tail lamp (brakes whole) on each bed
  // corner, flashing red for the rear indicator (no lens of its own)
  sporttruck: {
    head: [{ at: [0.78, 0.87, 2.681], size: [0.42, 0.17], mirror: true }],
    tail: [{ at: [1.03, 0.96, -2.59], size: [0.18, 0.26], mirror: true }],
    blink: [{ at: [0.78, 0.72, 2.679], size: [0.3, 0.06], mirror: true }, { at: [1.03, 0.96, -2.59], size: [0.18, 0.26], mirror: true, red: true, shared: 'tail lamp' }],
  },
  // pixel blocks: white squares (upper two rows of 4 x 3) at each front corner with two amber squares under them; at the tail a
  // stack of red squares (three rows of 2 and a red square) with an amber square at its foot, outer side
  pixelev: {
    head: [{ at: [0.6675, 0.8175, 2.425], size: [0.4, 0.19], mirror: true }],
    tail: [{ at: [0.7775, 0.8825, -2.425], size: [0.195, 0.305], mirror: true }, { at: [0.7225, 0.6625, -2.425], size: [0.085, 0.085], mirror: true }],
    blink: [{ at: [0.7775, 0.6525, 2.425], size: [0.19, 0.085], mirror: true }, { at: [0.8325, 0.6625, -2.425], size: [0.085, 0.085], mirror: true }],
  },
};
