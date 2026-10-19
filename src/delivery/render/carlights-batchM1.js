// The lamp table's entries for batch M1's idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the table by
// render/carlights.js. Same format as CAR_LAMPS. Measured from the models (render/ideaModelsBatchM1.js: the lamp meshes split into
// connected pieces, each piece's centre and the outer face of its lens). None moves (no frame).
export const BATCH_M1_LAMPS = {
  // square headlamps on the bumper block either side of the grille, amber bars under them; at the back, small tail lamps on the
  // frame's crossmember under the body's overhang (each brakes whole), ambers outboard of them
  haultruck: {
    head: [{ at: [0.66, 1.7, 2.787], size: [0.28, 0.14], mirror: true }],
    tail: [{ at: [0.22, 1.0, -2.78], size: [0.14, 0.1], mirror: true }],
    blink: [{ at: [0.66, 1.42, 2.787], size: [0.18, 0.07], mirror: true }, { at: [0.42, 1.0, -2.78], size: [0.1, 0.09], mirror: true }],
  },
  // two square work lamps on the hood's front over the grille; two tail lamps on the fuel tank's back (each brakes whole). No amber
  // lens on the machine: the indicators flash over the headlamps' outer ends and the tail lamps
  bulldozer: {
    head: [{ at: [0.38, 1.76, 1.63], size: [0.16, 0.1], mirror: true }],
    tail: [{ at: [0.5, 1.6, -1.701], size: [0.12, 0.1], mirror: true }],
    blink: [{ at: [0.43, 1.76, 1.63], size: [0.07, 0.1], mirror: true, shared: 'headlamp' }, { at: [0.5, 1.6, -1.701], size: [0.12, 0.1], mirror: true, shared: 'tail lamp' }],
  },
  // square headlamps in the bumper's corners, square ambers outboard of them; at the back, tail lamps at the rear board's ends either
  // side of the chevrons (each brakes whole), ambers under them
  gritter: {
    head: [{ at: [0.8, 0.74, 3.297], size: [0.24, 0.12], mirror: true }],
    tail: [{ at: [1.04, 1.17, -2.91], size: [0.14, 0.12], mirror: true }],
    blink: [{ at: [1.08, 0.74, 3.297], size: [0.12, 0.12], mirror: true }, { at: [1.04, 0.92, -2.91], size: [0.12, 0.08], mirror: true }],
  },
};
