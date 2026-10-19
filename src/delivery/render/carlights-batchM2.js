// The lamp table's entries for batch M2's idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the model name; merged into the
// table by render/carlights.js. Same format as CAR_LAMPS. Measured from the models (render/ideaModelsBatchM2.js). None moves (no frame).
export const BATCH_M2_LAMPS = {
  // flat pale headlamp lenses on the nose; a long tail lamp each side (each brakes whole); no amber lens anywhere: the front
  // indicator flashes over the headlamp's outer end, the rear one red over the tail lamp (an American car's)
  stockcar: {
    head: [{ at: [0.6, 0.42, 2.464], size: [0.34, 0.09], mirror: true }],
    tail: [{ at: [0.6, 0.82, -2.484], size: [0.4, 0.09], mirror: true }],
    blink: [{ at: [0.72, 0.42, 2.464], size: [0.1, 0.08], mirror: true, shared: 'headlamp' }, { at: [0.72, 0.82, -2.484], size: [0.14, 0.09], mirror: true, red: true, shared: 'tail lamp' }],
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
