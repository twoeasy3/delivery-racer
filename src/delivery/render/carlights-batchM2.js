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
};
