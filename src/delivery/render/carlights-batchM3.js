// The lamp table's entries for the batch M3 idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Taken from the lamp parts in render/ideaModelsBatchM3.js (outer face of each lens). None moves.
export const BATCH_M3_LAMPS = {
  // one bicycle lamp clamped on the nose; two red bicycle lamps on the tail's face (each brakes whole). No amber lens
  // anywhere: the indicators flash over the headlamp at the front and over the tail lamps at the back
  soapbox: {
    head: [{ at: [0, 0.53, 1.015], size: [0.07, 0.07], round: true }],
    tail: [{ at: [0.18, 0.42, -1.0], size: [0.05, 0.07], mirror: true }],
    blink: [{ at: [0, 0.53, 1.015], size: [0.07, 0.07], round: true, shared: 'headlamp' }, { at: [0.18, 0.42, -1.0], size: [0.05, 0.07], mirror: true, shared: 'tail lamp' }],
  },
  // square headlamps either side of the grille, amber bars under them; at the back, square tail lamps on the rear beam (each
  // brakes whole) with amber lenses outboard of them
  backhoe: {
    head: [{ at: [0.55, 1.32, 2.221], size: [0.18, 0.14], mirror: true }],
    tail: [{ at: [0.56, 1.3, -1.935], size: [0.14, 0.12], mirror: true }],
    blink: [{ at: [0.55, 1.16, 2.221], size: [0.14, 0.06], mirror: true }, { at: [0.74, 1.3, -1.935], size: [0.1, 0.12], mirror: true }],
  },
};
