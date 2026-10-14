// The lamp table's entries for the top-up batch C idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged
// into the table by render/carlights.js. Same format as CAR_LAMPS. Measured from the models (render/ideaModelsTopupC.js:
// the lamp meshes split into connected pieces, each piece's centre and the outer face of its lens). None moves (no frame).
export const TOPUP_C = {
  // round headlamps either side of the grille, amber bars under them; small square tail lamps beside the spare wheel
  // (each brakes whole), amber under each
  pocket4x4: {
    head: [{ at: [0.46, 0.8, 1.595], size: [0.19, 0.19], round: true, mirror: true }],
    tail: [{ at: [0.52, 1.0, -1.441], size: [0.12, 0.12], mirror: true }],
    blink: [{ at: [0.46, 0.63, 1.577], size: [0.14, 0.05], mirror: true }, { at: [0.52, 0.86, -1.441], size: [0.12, 0.06], mirror: true }],
  },
  // small round lamps in the nose, tiny ambers on its sides; small tail lamps (each brakes whole), and at the back no
  // amber lens: the indicator flashes over the tail lamp
  dodgem: {
    head: [{ at: [0.284, 0.44, 0.93], size: [0.09, 0.09], round: true, mirror: true }],
    tail: [{ at: [0.284, 0.44, -0.93], size: [0.1, 0.06], mirror: true }],
    blink: [{ at: [0.497, 0.44, 0.775], size: [0.06, 0.04], mirror: true }, { at: [0.284, 0.44, -0.93], size: [0.1, 0.06], mirror: true, shared: 'tail lamp' }],
  },
  // square headlamps on the cab's front; tail lamps over the conditioner bar (each brakes whole); amber marker lamps
  // at the cab's top front corners flash at the front, and at the back (the cab's rear corners are near the middle of
  // the car) the indicator flashes red over the tail lamp, as an American machine's
  iceresurfacer: {
    head: [{ at: [0.46, 1.2, 2.104], size: [0.22, 0.14], mirror: true }],
    tail: [{ at: [0.8, 0.64, -2.301], size: [0.16, 0.16], mirror: true }],
    blink: [{ at: [0.713, 2.22, 2.018], size: [0.1, 0.07], mirror: true }, { at: [0.8, 0.64, -2.301], size: [0.16, 0.16], mirror: true, red: true, shared: 'tail lamp' }],
  },
};
