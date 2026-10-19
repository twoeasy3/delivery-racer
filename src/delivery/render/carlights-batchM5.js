// The lamp table's entries for batch M5's ideas (ideasBatchM5.js; LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into
// the table by render/carlights.js. Same format as CAR_LAMPS. Measured from the models (render/ideaModelsBatchM5.js: the lamp
// meshes split into connected pieces, each piece's centre and the outer face of its lens). None moves (no frame).
export const BATCH_M5_LAMPS = {
  // the Pace Car: four square headlamps in the black band across the sloped nose; two red lamps a side in the full-width tail
  // panel (both brake); amber parking lamps in the air dam (the front indicators); at the back US-style, the outer red lamp
  // flashes red. The white reversing lamps beside the plate. (The roof light bar's lenses are left out: not lamps the effects use.)
  pacecar: {
    head: [{ at: [0.62, 0.49, 2.39], size: [0.18, 0.1], mirror: true }, { at: [0.38, 0.49, 2.39], size: [0.18, 0.1], mirror: true }],
    tail: [{ at: [0.72, 0.71, -2.426], size: [0.28, 0.13], mirror: true }, { at: [0.43, 0.71, -2.426], size: [0.2, 0.13], mirror: true }],
    blink: [
      { at: [0.62, 0.225, 2.415], size: [0.2, 0.045], mirror: true },
      { at: [0.72, 0.71, -2.426], size: [0.28, 0.13], mirror: true, red: true, shared: 'tail lamp' },
    ],
    reverse: [{ at: [0.25, 0.71, -2.426], size: [0.07, 0.09], mirror: true }],
  },
  // the Stone-Age Car: no lamps on the real (cartoon) car; its own are round glow-stones set in the frame logs' front cut ends and
  // red stones in their back ones (each brakes whole). No indicator lenses: they flash over those stones (amber at both ends).
  stonecar: {
    head: [{ at: [0.88, 0.42, 1.853], size: [0.13, 0.13], round: true, mirror: true }],
    tail: [{ at: [0.88, 0.42, -1.848], size: [0.12, 0.12], round: true, mirror: true }],
    blink: [
      { at: [0.88, 0.42, 1.853], size: [0.1, 0.1], round: true, mirror: true, shared: 'glow-stone' },
      { at: [0.88, 0.42, -1.848], size: [0.1, 0.1], round: true, mirror: true, shared: 'red stone' },
    ],
  },
};
