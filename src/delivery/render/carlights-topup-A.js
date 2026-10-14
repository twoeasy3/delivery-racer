// The lamp table's entries for the ideas top-up, batch A (LAMP-PLACEMENT-GUIDE.md; models: render/ideaModelsTopupA.js),
// measured from each model's own lamp pieces (connected pieces of its lamp meshes). Merged into the table by
// render/carlights.js. Same format as CAR_LAMPS: keyed by the idea's id, car-local metres, x across (the +x lamp, the
// car's left, is listed; `mirror` adds the right), y up, z along with the nose at +z; `at` the lens's outer face.
// Each car's brake lamp is its LEFT tail lamp only (the owner's proposal for these four); the right one is a tail lamp.
export const TOPUP_A_LAMPS = {
  // The Slant-Back Saloon: round lamps under the brows; a tall lamp at each fin's end; amber at the front bumper's corners
  // and under the tail lamps
  slantback: {
    head: [{ at: [0.58, 0.66, 2.121], size: [0.15, 0.15], round: true, mirror: true }],
    tail: [{ at: [0.74, 0.92, -2.12], size: [0.07, 0.24] }, { at: [-0.74, 0.92, -2.12], size: [0.07, 0.24], brake: false }],
    blink: [{ at: [0.6, 0.45, 2.105], size: [0.07, 0.07], round: true, mirror: true }, { at: [0.74, 0.66, -2.115], size: [0.06, 0.06], round: true, mirror: true }],
  },
  // The Glass-Hatch Brake: round lamps at the grille's ends; small lamps either side of the hatch; amber in the bumpers' corners
  glassbrake: {
    head: [{ at: [0.62, 0.62, 2.114], size: [0.14, 0.14], round: true, mirror: true }],
    tail: [{ at: [0.66, 0.75, -2.113], size: [0.11, 0.13] }, { at: [-0.66, 0.75, -2.113], size: [0.11, 0.13], brake: false }],
    blink: [{ at: [0.8, 0.49, 2.11], size: [0.07, 0.04], mirror: true }, { at: [0.7, 0.5, -2.121], size: [0.09, 0.045], mirror: true }],
  },
  // The Seven Roadster: round lamps on stalks over the cycle wings; small round lamps on the tail; amber on the nose's corners
  sevenroadster: {
    head: [{ at: [0.43, 0.7, 1.335], size: [0.13, 0.13], round: true, mirror: true }],
    tail: [{ at: [0.3, 0.44, -1.56], size: [0.08, 0.08], round: true }, { at: [-0.3, 0.44, -1.56], size: [0.08, 0.08], round: true, brake: false }],
    blink: [{ at: [0.2, 0.3, 1.689], size: [0.06, 0.05], round: true, mirror: true }, { at: [0.3, 0.44, -1.56], size: [0.08, 0.08], round: true, mirror: true, shared: 'tail lamp' }],
  },
  // The Tall Tourer: round brass lamps over the front wings; one red lamp low on the tail (its lower half the brake);
  // small amber side lamps on the scuttle; at the back the indicators flash red over the tail lamp (US-style)
  talltourer: {
    head: [{ at: [0.6, 0.99, 1.755], size: [0.17, 0.17], round: true, mirror: true }],
    tail: [{ at: [0.42, 0.72, -1.675], size: [0.1, 0.1], round: true, brake: [0.1, 0.05] }],
    blink: [{ at: [0.6, 1.18, 0.845], size: [0.07, 0.07], round: true, mirror: true }, { at: [0.42, 0.72, -1.675], size: [0.1, 0.1], round: true, red: true, shared: 'tail lamp' }],
  },
};
