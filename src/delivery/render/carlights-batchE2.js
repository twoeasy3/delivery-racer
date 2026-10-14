// The lamp table's entries for the batch E2 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Measured from the models (render/ideaModelsBatchE2.js: each lamp's centre and the outer face
// of its lens). None moves (no frame).
export const BATCH_E2_LAMPS = {
  // wide square headlamps either side of the slim grille, an amber lens under each outer corner; tall tail lamps (red over
  // amber) in the rear corners, the red part brakes
  supermini: {
    head: [{ at: [0.5, 0.7, 1.75], size: [0.33, 0.2], mirror: true }],
    tail: [{ at: [0.58, 0.83, -1.769], size: [0.14, 0.27], mirror: true }],
    blink: [{ at: [0.64, 0.56, 1.759], size: [0.15, 0.07], mirror: true }, { at: [0.58, 0.57, -1.769], size: [0.14, 0.11], mirror: true }],
  },
};
