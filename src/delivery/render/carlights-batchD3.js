// The lamp table's entries for the batch D3 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Same format as CAR_LAMPS. Measured from the models (render/ideaModelsBatchD3.js: the lamp
// meshes split into connected pieces, each piece's centre and the outer face of its lens). None moves (no frame).
export const BATCH_D3_LAMPS = {
  // round headlamps in chrome rims either side of the grille, an amber lens under each; a small square red tail lamp each
  // side of the bed (each brakes whole) with an amber lens under it
  halftrack: {
    head: [{ at: [0.68, 1.22, 3.235], size: [0.26, 0.26], round: true, mirror: true }],
    tail: [{ at: [0.76, 1.32, -3.041], size: [0.15, 0.15], mirror: true }],
    blink: [{ at: [0.72, 0.98, 3.227], size: [0.15, 0.065], mirror: true }, { at: [0.76, 1.15, -3.041], size: [0.15, 0.065], mirror: true }],
  },
  // slim square headlamps either side of the grille, an amber lens under each outer end; a red tail lamp band with its
  // own darker brake lamp inside it (only that brakes), and a small amber lens above the tail's outer end
  sprinthatch: {
    head: [{ at: [0.53, 0.5, 1.925], size: [0.28, 0.09], mirror: true }],
    tail: [
      { at: [0.5, 0.74, -1.905], size: [0.38, 0.12], mirror: true, brake: false },
      { at: [0.27, 0.74, -1.91], size: [0.14, 0.08], mirror: true },
    ],
    blink: [{ at: [0.62, 0.42, 1.925], size: [0.14, 0.045], mirror: true }, { at: [0.65, 0.6, -1.905], size: [0.11, 0.045], mirror: true }],
  },
};
