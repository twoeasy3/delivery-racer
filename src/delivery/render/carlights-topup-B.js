// The lamp table's entries for the top-up batch B of car ideas (render/ideaModelsTopupB.js; LAMP-PLACEMENT-GUIDE.md):
// merged into the table by render/carlights.js. Same format as CAR_LAMPS; keyed by the idea's id (an idea's lamp key).
// Measured from the models (each lens's connected piece: its centre, its outer face, its size). None of the three moves
// its lamps in animate (no frame). Left out: the Bin Lorry's roof beacon (it flashes on its own, as the School Bus's and
// the Fire Engine's do) and the Jeepney's five roof lamps on the lamp bar (a roof spot bar, not headlamps).
export const TOPUP_B_LAMPS = {
  // the Removals Van: rectangular headlamps in the grille; tall tail lamps up the box's back corners, whole lens brakes;
  // amber in the bumpers' corners and repeaters on the box's flanks near the back
  removalsvan: {
    head: [{ at: [0.5, 0.84, 2.985], size: [0.28, 0.18], mirror: true }],
    tail: [{ at: [0.92, 1.3, -3.003], size: [0.14, 0.44], mirror: true }],
    blink: [
      { at: [0.84, 0.52, 3.015], size: [0.14, 0.08], mirror: true },
      { at: [0.84, 0.84, -2.99], size: [0.16, 0.08], mirror: true },
      { at: [1.071, 1.22, -2.61], size: [0.03, 0.08], mirror: true },
    ],
  },
  // the Bin Lorry: square headlamps at the ends of the dark band across the cab's face, amber outboard of them; tall tail
  // lamps up the hopper's lower corners (the whole lens brakes), amber under them
  refuselorry: {
    head: [{ at: [0.82, 0.92, 3.596], size: [0.24, 0.22], mirror: true }],
    tail: [{ at: [1.0, 1.28, -3.573], size: [0.14, 0.38], mirror: true }],
    blink: [
      { at: [1.03, 0.92, 3.596], size: [0.08, 0.16], mirror: true },
      { at: [1.0, 1.0, -3.545], size: [0.14, 0.1], mirror: true },
    ],
  },
  // the Jeepney: round headlamps in chrome pods on the wings, amber on the wings' fronts under them; small tail lamps at
  // the back corners (the whole lens brakes), amber under them
  jeepney: {
    head: [{ at: [0.8, 1.1, 2.705], size: [0.18, 0.18], round: true, mirror: true }],
    tail: [{ at: [0.84, 0.84, -2.973], size: [0.12, 0.16], mirror: true }],
    blink: [
      { at: [0.8, 0.94, 2.95], size: [0.12, 0.06], mirror: true },
      { at: [0.84, 0.68, -2.973], size: [0.12, 0.08], mirror: true },
    ],
  },
};
