// ---- each car's own LAMP PLACES: where its headlamps, tail and brake lamps, indicators and reversing lamps are ------
// The game's lamp effects (render/cars.js syncLamps: the brake lamps and their halo, the indicators and hazards, a
// wrong-way driver's flashed headlamps, and at night the headlamps' glow; render/headlights.js: the night spotlights'
// spread and the traffic's beam on the road) were laid over EVERY car from its hitbox (hw, hl, height): brake lamps at
// a third of the width out, half the height up, 4 cm behind the hitbox's tail; indicators at the hitbox's corners;
// the spotlights 0.7 m either side. A car listed below has its effects put on its model's OWN lamp lenses instead; a
// car that is not listed keeps the hitbox placement exactly as before (genericLayout).
//
// THE TABLE (CAR_LAMPS), keyed by MODEL name (render/models.js MODELS: a garage car's `model`, and the traffic kind
// that wears the same model; an idea car by its id). Car-local metres: x across (the lamps are listed on +x and
// `mirror: true` adds the -x twin), y up from the road, z along (the nose is +z). `at` is the CENTRE OF THE LENS'S
// OUTER FACE (the effects are laid a few millimetres proud of it); `size` [width, height] of the lit area; `round`
// for a round lamp (else a rectangle).
//   head:    headlamps. The night glow sits on each; the player's two spotlights take their spread from them.
//   tail:    tail lamps. Each lights up as a BRAKE lamp (brake: true, the default; brake: false for a lamp that
//            does not; brake: [w, h] for only an inner part of it, that size, centred).
//   blink:   indicators, front and rear by the sign of z; amber unless `red: true` (a US car's red flashing tail lamp).
//            Where the model has NO indicator lens, the entry says so (`shared: '<which lamp>'`): it flashes over
//            part of another lamp rather than on invented geometry.
//   frame:   (optional) the name of a userData hook on the model, a node the lamps ride in where its body moves on its
//            own (the Lowrider's hydraulics); its rest place must be the car's own frame (as the Lowrider's `shell`).
//   reverse: reversing lamps (nothing lights them yet: the game has no reverse gear; they are listed for the
//            ?lamps=show markers and for later).
// Read once into a LAYOUT (lampLayout) and cached: nothing is made or worked out per frame. No code in the game's
// rules reads this (it is drawing only, outside the replay fingerprint: vite.config.js logicFiles).
//   ?lamps=show     markers at every lamp the effects use (yellow head, red tail/brake, amber indicator, white
//                   reversing), labelled, on the player's car; old: the hitbox placement for every car (a "before");
//                   brake: the player's brake lamps held on; hazard / left / right: its indicators held lit (steady);
//                   night: the headlamp glow on, and the ?cine=car studio dark. Comma-separated: ?lamps=show,brake
import * as THREE from 'three';
import { EASY_LAMPS } from './carlights-easy.js';
import { HARD_LAMPS } from './carlights-hard.js';
import { GUESS_LAMPS } from './carlights-guess.js';
import { HARD_A } from './carlights-hard-a.js';
import { HARD_B } from './carlights-hard-b.js';
import { TOPUP_A_LAMPS } from './carlights-topup-A.js'; // (the ideas top-up, batch A)
import { TOPUP_B_LAMPS } from './carlights-topup-B.js'; // (the ideas top-up batch B)
import { BATCH_E1_LAMPS } from './carlights-batchE1.js'; // (batch E1's idea cars)
import { BATCH_E2_LAMPS } from './carlights-batchE2.js'; // (batch E2's idea cars)
import { BATCH_D2_LAMPS } from './carlights-batchD2.js'; // (batch D2's idea cars)
import { BATCH_E4_LAMPS } from './carlights-batchE4.js'; // (batch E4's idea cars)
import { TOPUP_C } from './carlights-topup-C.js'; // (top-up batch C's idea cars)
import { COMMUTER_IDEAS_LAMPS } from './carlights-commuter-ideas.js'; // (the three city hatchback ideas)
import { PADDLE_DUCK_LAMPS } from './carlights-paddleduck.js'; // (the Paddle-Wheel Amphibian idea)
import { BATCH_D3_LAMPS } from './carlights-batchD3.js'; // (batch D3's idea cars)

// (the hand-written entries; the generated batches are merged in under them: TABLE)
export const CAR_LAMPS = {
  // The Commuter (render/modelsOrig1b.js, redrawn 15-Oct from the owner's Micra photographs): flush rectangular
  // headlamps in dark bezels on the nose's face either side of the grille; tall oval tail lamps in silver rings up the
  // rear corners, a clear reversing lens low in each; two small round fog lamps in the skirt's front face (not lamps
  // the table drives). No indicator lenses: the front ones flash on the outer end of the headlamp's rectangle, the
  // rear ones on the outer edge of the tail lamp. (Placed from scripts/lamps.mjs's draft of the new body.)
  commuter: {
    head: [{ at: [0.44, 0.495, 1.911], size: [0.27, 0.102], mirror: true }],
    tail: [{ at: [0.58, 0.66, -1.85], size: [0.17, 0.32], round: true, mirror: true }],
    blink: [
      { at: [0.545, 0.495, 1.911], size: [0.06, 0.1], mirror: true, shared: 'headlamp' },
      { at: [0.631, 0.66, -1.85], size: [0.068, 0.1], round: true, mirror: true, shared: 'tail lamp' },
    ],
    reverse: [{ at: [0.58, 0.585, -1.853], size: [0.06, 0.06], round: true, mirror: true }],
  },
  // The Lowrider (render/modelsOrig2.js, a '60s Impala): two round headlamps a side; three round tail lamps a side,
  // the inner one the brake lamp. No amber anywhere: the rear indicators are the outer tail lamps flashing red (as the
  // real car's); the front ones flash amber over the outer headlamps.
  lowrider: {
    frame: 'lampFrame', // (its body rises and rocks on its hydraulics: the lamps ride in it, model.userData.lampFrame)
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
  // The Pick-Up (render/modelsOrig3.js, a lifted square-body truck): square headlamps high in the grille with an amber
  // indicator bar under each; tall lamps on the bed's corners, the tail lamp over the brake lamp. The rear indicators
  // are the tail lamps flashing red (no amber at the back).
  pickup: {
    head: [{ at: [0.74, 1.28, 2.609], size: [0.24, 0.2], mirror: true }],
    tail: [
      { at: [0.98, 1.44, -2.576], size: [0.1, 0.16], mirror: true, brake: false },
      { at: [0.98, 1.29, -2.576], size: [0.1, 0.12], mirror: true },
    ],
    blink: [
      { at: [0.74, 1.08, 2.596], size: [0.28, 0.08], mirror: true },
      { at: [0.98, 1.44, -2.576], size: [0.1, 0.16], mirror: true, red: true, shared: 'tail lamp' },
    ],
  },
  // The Sportscar (render/modelsOrig1b.js, an NA roadster): slim fixed teardrop headlamps on the nose's corners swept
  // back into the wings, a slim tail lamp across each corner. No indicator lenses: the front ones flash on the
  // headlamp's swept-back tail, the rear ones on the outer end of the tail lamp.
  miata: {
    head: [{ at: [0.6, 0.6, 1.93], size: [0.16, 0.1], round: true, mirror: true }],
    tail: [{ at: [0.58, 0.62, -1.975], size: [0.36, 0.1], mirror: true, brake: [0.22, 0.08] }],
    blink: [
      { at: [0.74, 0.64, 1.8], size: [0.1, 0.07], round: true, mirror: true, shared: 'headlamp' },
      { at: [0.73, 0.62, -1.95], size: [0.08, 0.09], mirror: true, shared: 'tail lamp' },
    ],
  },
};

// every listed car: the generated batches (render/carlights-easy.js, carlights-hard.js), the guesses for models with no
// lamp to measure (carlights-guess.js, each `guess: true`), the hand-written ones over them
import { BATCH_D1_LAMPS } from './carlights-batchD1.js';
import { BATCH_D4_LAMPS } from './carlights-batchD4.js';
import { BATCH_D5 as BATCH_D5_LAMPS } from './carlights-batchD5.js';
import { BATCH_E3_LAMPS } from './carlights-batchE3.js';
import { BATCH_E5_LAMPS } from './carlights-batchE5.js'; // (batch E5's idea cars)
import { BATCH_M1_LAMPS } from './carlights-batchM1.js'; // (batch M1's idea cars)
import { SIXWHEEL_LAMPS } from './carlights-sixwheel.js'; // (the Six-Wheel Supercar, a Legendary key car)
import { BATCH_M2_LAMPS } from './carlights-batchM2.js'; // (batch M2's idea cars)
export const TABLE = { ...EASY_LAMPS, ...HARD_LAMPS, ...HARD_A, ...HARD_B, ...TOPUP_A_LAMPS, ...TOPUP_B_LAMPS, ...TOPUP_C, ...COMMUTER_IDEAS_LAMPS, ...PADDLE_DUCK_LAMPS, ...BATCH_D1_LAMPS, ...BATCH_D2_LAMPS, ...BATCH_E1_LAMPS, ...BATCH_D3_LAMPS, ...BATCH_D4_LAMPS, ...BATCH_D5_LAMPS, ...BATCH_E2_LAMPS, ...BATCH_E3_LAMPS, ...BATCH_E4_LAMPS, ...BATCH_E5_LAMPS, ...SIXWHEEL_LAMPS, ...BATCH_M1_LAMPS, ...BATCH_M2_LAMPS, ...GUESS_LAMPS, ...CAR_LAMPS }; // (carlights-hard-a.js, -b.js: the hard batches)

// ---- ?lamps= (the debug and picture switches, above) ----
const search = typeof location !== 'undefined' ? location.search : '';
const lampsParam = (/[?&]lamps=([^&]*)/.exec(search) || [])[1] || '';
const flag = (k) => lampsParam.split(',').includes(k);
export const LAMP_DEBUG = {
  show: flag('show'), old: flag('old'), brake: flag('brake'), night: flag('night'),
  hazard: flag('hazard'), turn: flag('left') ? 1 : flag('right') ? -1 : 0, // (left: the car's own left, local +x)
};
LAMP_DEBUG.steady = LAMP_DEBUG.hazard || LAMP_DEBUG.turn !== 0;

// where a car's table entry comes from, for the model editor's legend: 'hand-written', 'guess', 'generated', or null (no entry)
export const lampSource = (key) => (!key || !TABLE[key] ? null : CAR_LAMPS[key] ? 'hand-written' : TABLE[key].guess ? 'guess' : 'generated');

// the night switch (render/headlights.js setHeadlights), read by syncLamps for the headlamps' glow
export const NightLamps = { on: false };

// the key a car's lamps are listed under: an idea car's id, else its model's name (null: none)
export const lampKey = (car) => (car ? (car.idea ? car.id : car.model) || null : null);

// ---- the layout: every effect's place and size ----
// a slot: { x, y, z, w, h, d, round }; blink slots also { side: -1|1, front, red }
const OUT = { brake: 0.012, blink: 0.022, flash: 0.05, glow: 0.03, halo: 0.04 }; // (m proud of the lens, so nothing z-fights)
const expand = (list = []) => list.flatMap(l => (l.mirror ? [l, { ...l, at: [-l.at[0], l.at[1], l.at[2]] }] : [l]));
const slot = (l, w, h, out, d = 0.02) => {
  const dir = Math.sign(l.at[2]) || 1;
  return { x: l.at[0], y: l.at[1], z: l.at[2] + dir * (out + d / 2), w, h, d, round: !!l.round };
};
// a halo or glow round a lamp: k times its size and a margin, but never more than `most` past its edges (a lamp right
// across the car keeps its glow on the car)
const grow = (size, k, margin, most) => Math.min(size * k + margin, size + most);
const layouts = new Map();
export const lampLayout = (key) => {
  if (!key || LAMP_DEBUG.old || !TABLE[key]) return null;
  if (layouts.has(key)) return layouts.get(key);
  const def = TABLE[key];
  const head = expand(def.head), tail = expand(def.tail), blink = expand(def.blink), reverse = expand(def.reverse);
  const brakeLamps = tail.filter(l => l.brake !== false);
  const layout = {
    key, generic: false, frame: def.frame || null, hasHead: head.length > 0, hasTail: tail.length > 0,
    brake: brakeLamps.map(l => (Array.isArray(l.brake) ? slot(l, l.brake[0], l.brake[1], OUT.brake) : slot(l, l.size[0], l.size[1], OUT.brake))),
    halo: brakeLamps.map(l => ({ ...slot(l, grow(l.size[0], 1.35, 0.08, 0.12), grow(l.size[1], 1.35, 0.08, 0.12), OUT.halo, 0.01), round: true })), // (a soft round halo)
    blink: blink.map(l => ({ ...slot(l, l.size[0], l.size[1], OUT.blink), side: Math.sign(l.at[0]) || 1, front: l.at[2] > 0, red: !!l.red })),
    flash: head.map(l => slot(l, grow(l.size[0], 1.8, 0.08, 0.25), grow(l.size[1], 1.8, 0.08, 0.25), OUT.flash, 0.01)),
    glow: head.map(l => ({ ...slot(l, grow(l.size[0], 2.4, 0.14, 0.3), grow(l.size[1], 2.4, 0.14, 0.3), OUT.glow, 0.01), round: true })),
    // (for the markers)
    marks: [...head.map(l => ['head', l]), ...tail.map(l => [l.brake === false ? 'tail' : 'brake', l]), ...blink.map(l => [l.red ? 'blinkred' : 'blink', l]), ...reverse.map(l => ['reverse', l])],
    // the player's night spotlights: their spread (m either side) and where along the car they start
    beam: head.length ? { spread: head.reduce((s, l) => s + Math.abs(l.at[0]), 0) / head.length, z: Math.max(...head.map(l => l.at[2])) } : null,
  };
  layouts.set(key, layout);
  return layout;
};

// what a car's lamp effects use: its table layout; for an end the table has no lamps for (no head, or no tail), the
// old hitbox placement at that end (its flash and indicators at the front, its brake lamps, halos and indicators at the
// back); a car not in the table, the hitbox placement throughout. `store`: one object per car mesh, kept (the mix is
// worked out again only when the car's layout or its hitbox changes)
export const lampsFor = (key, v, store) => {
  const table = lampLayout(key), generic = genericLayout(v, store.generic || (store.generic = {}));
  if (!table) return generic;
  if (table.hasHead && table.hasTail) return table;
  const m = store.mixed || (store.mixed = {});
  if (m.table === table && m.genericVersion === generic.version) return m;
  const front = (b) => b.front, back = (b) => !b.front;
  Object.assign(m, {
    table, genericVersion: generic.version, version: (m.version || 0) + 1, key: table.key, generic: false, frame: table.frame,
    beam: table.beam, glow: table.glow, hasHead: table.hasHead, hasTail: table.hasTail,
    brake: table.hasTail ? table.brake : generic.brake, halo: table.hasTail ? table.halo : generic.halo,
    flash: table.hasHead ? table.flash : generic.flash,
    blink: [...(table.hasHead ? table.blink : generic.blink).filter(front), ...(table.hasTail ? table.blink : generic.blink).filter(back)],
    marks: [...table.marks, ...generic.marks.filter(([, l]) => (l.at[2] > 0 ? !table.hasHead : !table.hasTail))],
  });
  return m;
};

// the old placement, from the hitbox (exactly what render/cars.js did before the table): worked out into `into`
// (one object per car mesh, kept) only when the hitbox it was made for changes
export const genericLayout = (v, into) => {
  if (into.hw === v.hw && into.hl === v.hl && into.height === v.height) return into;
  into.hw = v.hw; into.hl = v.hl; into.height = v.height;
  const w = v.hw * 2, l = v.hl * 2, y = Math.min(1.1, Math.max(0.55, v.height * 0.5));
  const S = (x, yy, z, sw, sh, sd) => ({ x, y: yy, z, w: sw, h: sh, d: sd, round: false });
  into.key = null; into.generic = true; into.version = (into.version || 0) + 1;
  into.brake = [-1, 1].map(side => S(side * w * 0.33, y, -(l / 2 + 0.04), w * 0.24, 0.18, 0.06));
  into.halo = [-1, 1].map(side => S(side * w * 0.33, y, -(l / 2 + 0.1), w * 0.4, 0.4, 0.1));
  // (front then back; left (-x) then right)
  into.blink = [0, 1, 2, 3].map((i) => {
    const side = i % 2 ? 1 : -1, front = i < 2;
    return { ...S(side * (w / 2 - 0.08), y, (front ? 1 : -1) * (l / 2 + 0.05), 0.2, 0.14, 0.08), side, front, red: false };
  });
  into.flash = [-1, 1].map(side => S(side * w * 0.3, y, l / 2 + 0.12, w * 0.42, 0.5, 0.1));
  into.glow = []; // (no glow on the hitbox's guess)
  into.marks = [
    ...[-1, 1].map(side => ['head', { at: [side * 0.7, 2.2, v.hl] }]), // (the night spotlights' place, CONFIG.headlights)
    ...into.brake.map(s => ['brake', { at: [s.x, s.y, s.z] }]),
    ...into.blink.map(s => ['blink', { at: [s.x, s.y, s.z] }]),
  ];
  into.beam = null;
  return into;
};

// ---- the markers (?lamps=show): a small diamond in the lamp's colour, a stalk pointing the way it shines, a label ----
const MARK = { head: [0xffe14a, 'H'], tail: [0xff2a2a, 'T'], brake: [0xff2a2a, 'B'], blink: [0xffa21a, 'I'], blinkred: [0xff5a5a, 'I'], reverse: [0xffffff, 'R'] };
const markGeo = new THREE.OctahedronGeometry(0.045);
const labelMat = {};
const labelOf = (kind) => {
  if (labelMat[kind]) return labelMat[kind];
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64; // (64 x 64, debug only)
  const g = canvas.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(8, 8, 48, 48);
  g.fillStyle = '#' + MARK[kind][0].toString(16).padStart(6, '0');
  g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(MARK[kind][1], 32, 34);
  return (labelMat[kind] = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
};
export const makeLampMarkers = (layout) => {
  const group = new THREE.Group();
  group.renderOrder = 10;
  for (const [kind, l] of layout.marks) {
    const [x, y, z] = l.at, dir = Math.sign(z) || 1;
    const mat = new THREE.MeshBasicMaterial({ color: MARK[kind][0], depthTest: false });
    const dot = new THREE.Mesh(markGeo, mat);
    dot.position.set(x, y, z);
    dot.renderOrder = 10;
    const stalk = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, z), new THREE.Vector3(x, y, z + dir * 0.35)]),
      new THREE.LineBasicMaterial({ color: MARK[kind][0], depthTest: false }));
    stalk.renderOrder = 10;
    const label = new THREE.Sprite(labelOf(kind));
    label.scale.set(0.16, 0.16, 1);
    const low = kind === 'blink' || kind === 'blinkred' || kind === 'reverse'; // (an indicator's label under it, the rest over theirs)
    label.position.set(x + Math.sign(x || 1) * 0.12, y + (low ? -0.17 : 0.17), z + dir * 0.12);
    label.renderOrder = 11;
    group.add(dot, stalk, label);
  }
  // the car's axes at its origin: x red, y green, z (the nose) blue
  const axes = new THREE.AxesHelper(0.6);
  axes.material.depthTest = false;
  axes.renderOrder = 10;
  group.add(axes);
  return group;
};
