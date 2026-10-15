// The lamp table's entry for the Paddle-Wheel Amphibian idea (LAMP-PLACEMENT-GUIDE.md), keyed by its model name; merged into
// the table by render/carlights.js. Same format as CAR_LAMPS. Measured from the model (render/ideaModelsPaddleDuck.js: the
// lamp meshes split into connected pieces, each piece's centre and the outer face of its lens; scripts/lamps.mjs). None moves
// (the turning paddle wheel carries no lamp).
export const PADDLE_DUCK_LAMPS = {
  // round headlamps in the bow's face either side of the bill (tipped with the face), ambers outboard of them; tail lamps on
  // the transom's corners outboard of the paddle wheel's arms (each brakes whole), ambers under them
  paddleduck: {
    head: [{ at: [0.78, 1.2, 4.575], size: [0.214, 0.223], round: true, mirror: true }],
    tail: [{ at: [1.1, 1.36, -3.371], size: [0.14, 0.12], mirror: true }],
    blink: [{ at: [1.08, 1.2, 4.549], size: [0.14, 0.075], mirror: true }, { at: [1.1, 1.2, -3.371], size: [0.14, 0.07], mirror: true }],
  },
};
