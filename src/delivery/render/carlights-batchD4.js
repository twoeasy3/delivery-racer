// The lamp table's entries for the ideas batch D4 (LAMP-PLACEMENT-GUIDE.md; models: render/ideaModelsBatchD4.js), measured
// from each model's own lamp pieces. Same format as CAR_LAMPS, keyed by the idea's id: car-local metres, x across (the +x
// lamp is listed, `mirror` adds the other), y up, z along with the nose at +z; `at` the lens's outer face.
export const BATCH_D4_LAMPS = {
  // The Autobahn Estate: slim swept headlamps; a slim tail bar a side (the whole bar brakes) and a short centre bar between;
  // an amber lamp low in each front intake; at the back the indicators flash amber over the tail bar's outer end
  autobahnestate: {
    head: [{ at: [0.62, 0.775, 2.421], size: [0.38, 0.075], mirror: true }],
    tail: [{ at: [0.55, 0.8, -2.419], size: [0.44, 0.11], mirror: true }, { at: [0, 0.78, -2.419], size: [0.26, 0.04], brake: false }],
    blink: [{ at: [0.64, 0.545, 2.421], size: [0.2, 0.03], mirror: true }, { at: [0.7, 0.8, -2.419], size: [0.1, 0.1], mirror: true, shared: 'tail lamp' }],
  },
  // The Fin Land Yacht: four round headlamps (two a side); two red bullet lamps at each fin's end (the lower one brakes) and
  // a small lamp low on the tail; amber lamps on the front bumper's ends; at the back the indicators flash red over the
  // upper bullet (US-style)
  finlandyacht: {
    head: [{ at: [0.84, 0.75, 2.921], size: [0.16, 0.16], round: true, mirror: true }, { at: [0.6, 0.75, 2.921], size: [0.16, 0.16], round: true, mirror: true }],
    tail: [
      { at: [0.84, 1.2, -2.87], size: [0.11, 0.11], round: true, mirror: true, brake: false },
      { at: [0.84, 1.08, -2.87], size: [0.11, 0.11], round: true, mirror: true },
      { at: [0.55, 0.82, -2.919], size: [0.26, 0.1], mirror: true, brake: false },
    ],
    blink: [{ at: [0.7, 0.4, 2.969], size: [0.2, 0.05], mirror: true }, { at: [0.84, 1.2, -2.87], size: [0.11, 0.11], round: true, mirror: true, red: true, shared: 'tail lamp' }],
  },
};
