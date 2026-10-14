// The lamp table's entries for the batch D2 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Measured from the models (render/ideaModelsBatchD2.js: the lamp meshes split into connected
// pieces, each piece's centre and the outer face of its lens). None moves (no frame).
export const BATCH_D2_LAMPS = {
  // round lamps in chrome rims either side of the grille, amber lenses under them; a red tail lamp (brakes whole) on each
  // end of the deck's edge and, on the chassis crossmember below it, a red indicator lens
  flatbed: {
    head: [{ at: [0.64, 1.0, 2.085], size: [0.22, 0.22], round: true, mirror: true }],
    tail: [{ at: [0.8, 1.04, -2.385], size: [0.2, 0.12], mirror: true }],
    blink: [{ at: [0.64, 0.74, 2.07], size: [0.16, 0.07], mirror: true }, { at: [0.8, 0.8, -2.485], size: [0.2, 0.06], mirror: true, red: true }],
  },
  // round lamps either side of the slatted grille, amber lenses under them; small square tail lamps on the tailgate (each
  // brakes whole), amber lenses under them
  moke: {
    head: [{ at: [0.33, 0.54, 1.585], size: [0.13, 0.13], round: true, mirror: true }],
    tail: [{ at: [0.36, 0.62, -1.551], size: [0.12, 0.12], mirror: true }],
    blink: [{ at: [0.33, 0.42, 1.57], size: [0.12, 0.05], mirror: true }, { at: [0.36, 0.5, -1.551], size: [0.12, 0.05], mirror: true }],
  },
};
