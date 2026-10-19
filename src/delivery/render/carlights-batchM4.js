// The lamp table's entries for batch M4's idea cars (LAMP-PLACEMENT-GUIDE.md), keyed by the idea's id; merged into the
// table by render/carlights.js. Same format as CAR_LAMPS. Measured from the models (render/ideaModelsBatchM4.js: the lamp
// meshes split into connected pieces, each piece's centre and the outer face of its lens). None moves (no frame).
export const BATCH_M4_LAMPS = {
  // rectangular headlamps in the front wings' faces, amber indicators in the bumper's ends; red tail lamps on the rear
  // crossmember under the logs (each brakes whole), ambers inboard of them. (The cab roof's five amber clearance lamps
  // are marker lamps, not listed.)
  logtruck: {
    head: [{ at: [0.97, 0.9, 4.853], size: [0.26, 0.16], mirror: true }],
    tail: [{ at: [1.0, 0.92, -4.705], size: [0.22, 0.12], mirror: true }],
    blink: [{ at: [1.05, 0.62, 5.0], size: [0.2, 0.09], mirror: true }, { at: [0.72, 0.92, -4.705], size: [0.14, 0.12], mirror: true }],
  },
  // wide headlamps in the cab front's lower corners, ambers outboard of them; on the lamp bar under the tank's back, red
  // tail lamps outboard (each brakes whole), ambers inboard
  fueltanker: {
    head: [{ at: [0.8, 1.12, 4.35], size: [0.42, 0.16], mirror: true }],
    tail: [{ at: [0.95, 0.96, -4.42], size: [0.3, 0.14], mirror: true }],
    blink: [{ at: [1.1, 1.12, 4.35], size: [0.12, 0.16], mirror: true }, { at: [0.62, 0.96, -4.42], size: [0.16, 0.14], mirror: true }],
  },
  // road headlamps in housings on the cab's deck, ambers outboard of them; tail lamps on the body's back (each brakes
  // whole), ambers inboard. (The four work lamps along the cab roof's front and the beacon are not listed.)
  combine: {
    head: [{ at: [0.97, 2.26, 2.601], size: [0.2, 0.12], mirror: true }],
    tail: [{ at: [0.95, 2.25, -4.021], size: [0.22, 0.14], mirror: true }],
    blink: [{ at: [1.18, 2.26, 2.601], size: [0.09, 0.12], mirror: true }, { at: [0.65, 2.25, -4.021], size: [0.14, 0.14], mirror: true }],
  },
};
