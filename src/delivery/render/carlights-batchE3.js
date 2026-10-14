// The lamp table's entries for the batch E3 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Measured from the models (render/ideaModelsBatchE3.js: the lamp meshes split into connected
// pieces, each piece's centre and the outer face of its lens). None moves (no frame). The Crane Lorry's roof beacon (amber,
// not a turn signal) is left out.
export const BATCH_E3_LAMPS = {
  // square lamps in chrome bezels at the cab's front corners, an amber lens under each; a red tail lamp (brakes whole) at each end of the
  // rear crossmember with an amber lens under it
  cranelorry: {
    head: [{ at: [1.0, 1.27, 3.285], size: [0.24, 0.18], mirror: true }],
    tail: [{ at: [1.1, 1.02, -3.02], size: [0.22, 0.14], mirror: true }],
    blink: [{ at: [1.0, 1.1, 3.27], size: [0.24, 0.07], mirror: true }, { at: [1.1, 0.85, -3.02], size: [0.22, 0.07], mirror: true }],
  },
  // rectangular lamps in bezels at the ends of the grille, an amber lens under each; tall red tail lamps (each brakes whole) on the
  // tail corners with a small amber lens under each
  moorrover: {
    head: [{ at: [0.72, 0.78, 2.235], size: [0.25, 0.15], mirror: true }],
    tail: [{ at: [0.84, 0.92, -2.221], size: [0.1, 0.26], mirror: true }],
    blink: [{ at: [0.72, 0.6, 2.221], size: [0.2, 0.07], mirror: true }, { at: [0.84, 0.66, -2.221], size: [0.1, 0.12], mirror: true }],
  },
};
