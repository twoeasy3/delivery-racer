// The lamp table's entries for the three city hatchback ideas (ideasCommuterIdeas.js; LAMP-PLACEMENT-GUIDE.md), keyed by the
// idea's id; merged into the table by render/carlights.js. Same format as CAR_LAMPS. Measured from the models
// (render/ideaModelsCommuterIdeas.js: the lamp meshes split into connected pieces, each piece's centre and the outer face
// of its lens). None moves (no frame).
export const COMMUTER_IDEAS_LAMPS = {
  // the Smiley Hatch: two big round headlamps in the nose's top corners; tall rounded tail lamps up the hatch's corners
  // (each brakes whole). No indicator lenses: the front ones flash on the headlamp's outer edge, the rear on the tail
  // lamp's foot
  smileyhatch: {
    head: [{ at: [0.55, 0.72, 1.795], size: [0.26, 0.22], round: true, mirror: true }],
    tail: [{ at: [0.62, 0.86, -1.745], size: [0.13, 0.42], round: true, mirror: true }],
    blink: [
      { at: [0.66, 0.72, 1.77], size: [0.1, 0.1], round: true, mirror: true, shared: 'headlamp' },
      { at: [0.62, 0.7, -1.74], size: [0.1, 0.1], round: true, mirror: true, shared: 'tail lamp' },
    ],
  },
  // the Eighties Hatch: rectangular headlamps in the dark band across the nose; square tail lamps red over amber in the
  // rear corners (each red lamp brakes whole); real amber indicator lenses in the front bumper and under the tail lamps
  eightieshatch: {
    head: [{ at: [0.54, 0.66, 1.855], size: [0.32, 0.14], mirror: true }],
    tail: [{ at: [0.58, 0.745, -1.776], size: [0.2, 0.16], mirror: true }],
    blink: [
      { at: [0.56, 0.4, 1.925], size: [0.18, 0.06], mirror: true },
      { at: [0.58, 0.6, -1.776], size: [0.2, 0.08], mirror: true },
    ],
  },
  // the Pebble: wide ovals across the nose's corners; wide oval tail lamps across the tail's corners (each brakes whole).
  // No indicator lenses: they flash on the outer ends of the head and tail lamps
  pebble: {
    head: [{ at: [0.54, 0.67, 1.8], size: [0.3, 0.12], round: true, mirror: true }],
    tail: [{ at: [0.58, 0.74, -1.79], size: [0.26, 0.12], round: true, mirror: true }],
    blink: [
      { at: [0.7, 0.67, 1.72], size: [0.1, 0.08], round: true, mirror: true, shared: 'headlamp' },
      { at: [0.7, 0.74, -1.72], size: [0.1, 0.08], round: true, mirror: true, shared: 'tail lamp' },
    ],
  },
};
