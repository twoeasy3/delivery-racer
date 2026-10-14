// The lamp table's entries for the ideas batch D4 (LAMP-PLACEMENT-GUIDE.md; models: render/ideaModelsBatchD4.js), measured
// from each model's own lamp pieces. Same format as CAR_LAMPS, keyed by the idea's id: car-local metres, x across (the +x
// lamp is listed, `mirror` adds the other), y up, z along with the nose at +z; `at` the lens's outer face. Each model is
// widened by a scale across the car (the Estate by 1.141, the Yacht by 1.15), so every x and width here is the drawn one times that.
export const BATCH_D4_LAMPS = {
  // The Autobahn Estate: slim headlamps sunk flush into the nose; a slim tail bar a side (the whole bar brakes) and a short
  // centre bar between; an amber lamp low on each side of the nose; at the back the indicators flash amber over the tail bar's
  // outer end
  autobahnestate: {
    head: [{ at: [0.628, 0.665, 2.388], size: [0.39, 0.075], mirror: true }],
    tail: [{ at: [0.628, 0.8, -2.419], size: [0.5, 0.11], mirror: true }, { at: [0, 0.78, -2.419], size: [0.3, 0.04], brake: false }],
    blink: [{ at: [0.662, 0.4, 2.39], size: [0.23, 0.03], mirror: true }, { at: [0.8, 0.8, -2.419], size: [0.11, 0.1], mirror: true, shared: 'tail lamp' }],
  },
  // The Fin Land Yacht: four round headlamps (two a side); two red bullet lamps at each fin's end (the lower one brakes) and
  // a small lamp low on the tail; amber lamps on the front bumper's ends; at the back the indicators flash red over the
  // upper bullet (US-style)
  finlandyacht: {
    head: [{ at: [0.966, 0.75, 2.921], size: [0.18, 0.16], round: true, mirror: true }, { at: [0.69, 0.75, 2.921], size: [0.18, 0.16], round: true, mirror: true }],
    tail: [
      { at: [0.966, 1.2, -2.87], size: [0.12, 0.11], round: true, mirror: true, brake: false },
      { at: [0.966, 1.08, -2.87], size: [0.12, 0.11], round: true, mirror: true },
      { at: [0.633, 0.82, -2.919], size: [0.3, 0.1], mirror: true, brake: false },
    ],
    blink: [{ at: [0.805, 0.4, 2.969], size: [0.23, 0.05], mirror: true }, { at: [0.966, 1.2, -2.87], size: [0.12, 0.11], round: true, mirror: true, red: true, shared: 'tail lamp' }],
  },
};
