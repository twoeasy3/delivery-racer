// The lamp table's HARD cars, batch B (LAMP-PLACEMENT-GUIDE.md): filled by a helper; merged into CAR_LAMPS by
// render/carlights.js. Same format as CAR_LAMPS. Keyed by model name.
export const HARD_B = {
  // The Fire Engine (render/models.js): two round headlamps a side, one tall red tail lamp a side. No amber lens: the
  // indicators flash over the outer headlamp's end and the tail lamp's foot. The roof light bar (red / dark red beacons
  // that flash, a cream centre lamp) is NOT a headlamp or tail lamp and is left out.
  fireengine: {
    head: [
      { at: [1.025, 1.25, 4.55], size: [0.195, 0.2], round: true, mirror: true },
      { at: [0.75, 1.25, 4.55], size: [0.195, 0.2], round: true, mirror: true },
    ],
    tail: [{ at: [1.05, 1.3, -4.53], size: [0.14, 0.3], mirror: true }],
    blink: [
      { at: [1.083, 1.25, 4.55], size: [0.078, 0.1], round: true, mirror: true, shared: 'outer headlamp' },
      { at: [1.05, 1.2, -4.53], size: [0.14, 0.1], mirror: true, shared: 'tail lamp' },
    ],
  },
  // The School Bus (render/ideaModels.js, an idea car keyed by id): a round headlamp with a real amber indicator lens
  // under it, a tall red tail lamp a side. The roof bar's flashers (red pairs that take turns, amber pairs) keep their
  // own animation; the bar's amber pair at the back is used as the rear indicator (no amber lens lower down), the front
  // roof pair, the bar's white centre lamp and the swinging STOP arm are left out.
  schoolbus: {
    head: [{ at: [0.634, 1.24, 5.45], size: [0.234, 0.24], round: true, mirror: true }],
    tail: [{ at: [0.976, 1.3, -5.43], size: [0.14, 0.3], mirror: true }],
    blink: [
      { at: [0.634, 1.02, 5.44], size: [0.14, 0.08], mirror: true },
      { at: [0.756, 2.68, -5.46], size: [0.195, 0.2], round: true, mirror: true },
    ],
  },
  // The Wrecker (render/ideaModels2.js, an idea car): round headlamps, a tall red tail lamp a side; no amber lens, so the
  // indicators flash over the headlamp's outer end and the tail lamp's foot. The roof beacons (amber, blinking) are left out.
  wrecker: {
    head: [{ at: [0.88, 1.25, 2.935], size: [0.175, 0.18], round: true, mirror: true }],
    tail: [{ at: [0.836, 1.1, -3.045], size: [0.14, 0.2], mirror: true }],
    blink: [
      { at: [0.933, 1.25, 2.935], size: [0.07, 0.1], round: true, mirror: true, shared: 'headlamp' },
      { at: [0.836, 1.04, -3.045], size: [0.14, 0.08], mirror: true, shared: 'tail lamp' },
    ],
  },
  // The Super Lowrider: the Lowrider's builder, so the same lamps and the same hook (its body hops higher and rocks
  // side to side; the lamps ride in model.userData.lampFrame). The inner tail lamp (STOP) is the brake lamp; the outer
  // two are tail lamps; rear indicators flash the outer lamp red, front ones amber over the outer headlamp.
  superlowrider: {
    frame: 'lampFrame',
    head: [
      { at: [0.5, 0.6, 2.545], size: [0.17, 0.17], round: true, mirror: true },
      { at: [0.78, 0.6, 2.545], size: [0.17, 0.17], round: true, mirror: true },
    ],
    tail: [
      { at: [0.4, 0.6, -2.545], size: [0.16, 0.16], round: true, mirror: true },
      { at: [0.6, 0.6, -2.545], size: [0.16, 0.16], round: true, mirror: true, brake: false },
      { at: [0.8, 0.6, -2.545], size: [0.16, 0.16], round: true, mirror: true, brake: false },
    ],
    blink: [
      { at: [0.78, 0.6, 2.545], size: [0.17, 0.17], round: true, mirror: true, shared: 'outer headlamp' },
      { at: [0.8, 0.6, -2.545], size: [0.16, 0.16], round: true, mirror: true, red: true, shared: 'outer tail lamp' },
    ],
  },
};
