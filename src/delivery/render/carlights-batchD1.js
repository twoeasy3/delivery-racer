// The lamp table's entries for the ideas batch D1 (the Wedge Microcar and the Farm Tractor; LAMP-PLACEMENT-GUIDE.md), keyed by
// the idea's id; merged into the table by render/carlights.js. Measured from the models (render/ideaModelsBatchD1.js: the glowing
// meshes split into connected pieces, each piece's centre and the outer face of its lens). None moves (no frame).
export const BATCH_D1_LAMPS = {
  // the one round headlamp in the middle of the nose; a small amber at each nose corner; a small tail lamp each side (each brakes
  // whole); no rear amber lens: the rear indicator flashes over the tail lamp
  wedgemicro: {
    head: [{ at: [0, 0.5, 0.807], size: [0.15, 0.15], round: true }],
    tail: [{ at: [0.4, 0.52, -0.791], size: [0.12, 0.09], mirror: true }],
    blink: [{ at: [0.47, 0.4, 0.789], size: [0.08, 0.05], mirror: true }, { at: [0.4, 0.52, -0.791], size: [0.12, 0.09], mirror: true, shared: 'tail lamp' }],
  },
  // two round headlamps in chrome rims each side of the grille; a small amber under each; small red tail lamps on the bar at the
  // back of the gearbox (each brakes whole), the rear indicator flashing over them
  farmtractor: {
    head: [{ at: [0.2, 1.0, 1.575], size: [0.11, 0.11], round: true, mirror: true }],
    tail: [{ at: [0.4, 0.92, -1.167], size: [0.12, 0.09], mirror: true }],
    blink: [{ at: [0.2, 0.68, 1.559], size: [0.09, 0.05], mirror: true }, { at: [0.4, 0.92, -1.167], size: [0.12, 0.09], mirror: true, shared: 'tail lamp' }],
  },
};
