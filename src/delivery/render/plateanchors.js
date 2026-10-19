// ---- where a NUMBER PLATE goes on each car (the owner, 14-Oct: ends decided PER CAR; CHECKLIST 286). RENDER-ONLY, like the lamp table
// (render/carlights.js CAR_LAMPS): keyed by the car's MODEL name (a Super, an earned reskin or a Legendary shares its base car's entry),
// in car-local metres. The big table is GENERATED (render/plateanchorstable.js, by scripts/plate-anchors.mjs, which shoots rays at every
// model's back and front and fits a plane); this file is what is written BY HAND on top of it, and the reader.
//   An end is [y, z, width, pitch°]: the plate is centred (x = 0) at height y, on the surface at depth z (the outermost surface under it),
//   `width` wide and width / 4 high, leaning `pitch` degrees with the surface. A 5th number 1 = the generator found it ROUGH (look at it).
//   ENDS: 'both' where both ends have a place, else the one that has; an entry can say { ends: 'rear' } (or 'front') to use only one.
//   NO PLATE: PLATE_NONE (the generated list of craft, open-wheelers, bikes, saucers) plus HAND_NONE below; a car with no place found
//   at either end is simply "unplaced". Both mean the same to the player: this car cannot wear an equipped plate (its own stay).
//   LEGENDARY cars keep their own gold plates: they are never dressed (platecosmetic.js), so they have no entry here.
// WHERE A PLATE MAY GO: the plate rules, scripts/plate-search.mjs RULES and its header (one set for the generator, the audit and the model
// editor; CHECKLIST 352: a bumper bar first, the plate centred on it and allowed to stick out past it, else the body).
// HOW A NEW CAR GETS ONE: `node scripts/plate-anchors.mjs <car id> --write`, then look at it (shots.mjs ?platedesign=classic&car=<id>),
// and put a hand fix in HAND below if it is wrong, or the model in HAND_NONE.
// Looked up: a car's id first (a variant, or a hand fix for one car), then its model, in HAND, else the generated PLATE_VARIANTS / PLATE_TABLE.
import { PLATE_TABLE, PLATE_VARIANTS, PLATE_NONE } from './plateanchorstable.js';

// hand-placed ends and fixes. { r: [y, z, w, pitch] | null, f: ..., ends?: 'both' | 'rear' | 'front' }. An end given here replaces the
// generated one; `null` takes that end away; an end not mentioned stays as generated.
export const HAND = {
  mini: { ends: 'rear' }, autobahnestate: { ends: 'rear' }, // (something stands over a third of the front place: rear only)
  dodgem: { ends: 'rear' }, // (the bumper car's nose is a blob: a front plate half sinks into it)
  // the plate placement audit (CHECKLIST 309, scripts/plate-placement-audit.mjs: measured, then looked at):
  toybota: { r: null }, // (an outboard motor's leg stands on the centre line behind the bed: the only flat place left was its motor housing, 1 m up)
  hotrod: { f: null }, // (a bare radiator between the wheels and no bumper: the plate could only stand in the grille bars)
  suv: { r: [0.43, -2.27, 0.46, -0.9] }, // (the spare wheel covers the tailgate's centre line from 0.5 to 1.15 m: the plate goes on the bumper under it, not on the tyre)
  tank: { f: [0.56, 2.15, 0.52, 0] }, amphibioustank: { f: [0.56, 2.15, 0.52, 0] }, // (low on the hull's nose between the tracks, under the glacis: the search's only flat place was the turret's face, which turns)
  moke: { f: [0.76, 1.544, 0.52, -12.2] }, // (kept at full size on the sloping nose: the search's 0.46 plate leaned 2 degrees more and lost its top row seen from ahead)
  centreseat: { f: [0.46, 2.111, 0.52, 0] }, // (the bumper bar is 11 cm, the plate 13: kept at full size, a centimetre over at top and bottom, rather than a 30 cm plate in the grille slot)
  sixwheeler: { r: [0.38, -2.07, 0.52, 0] }, // (the generator's flat place is the black lamp panel; the plate goes on the paint under it, between the panel and the diffuser)
  // (the Paddle-Wheel Amphibian: the generator's rear place is on the turning paddle wheel; the plate goes on the engine housing's flat back,
  // above the wheel, on the centre line; the front one a little higher on the bow's face, under the bill and between the headlamps)
  paddleduck: { r: [1.8, -3.23, 0.52, 0], f: [1.08, 4.492, 0.52, 14.1] },
};
// models that can wear no plate though the generator found a place (a taste call) -- or that have a place nobody wants a plate on
// the Swan Car: its tail is all teardrop curve, the generator's flat place sits inside the body. The Monster Truck (15-Oct audit): its body
// rides 1.2 m up on its frame, at plate height there are only axles and frame tubes (the old plates hung in the air between them). The
// Farm Tractor (15-Oct audit): its back is the drawbar between the big wheels (the old rear plate was under its middle); the only flat
// front place is the bonnet's sloping nose, whose lip hides the plate's top.
export const HAND_NONE = ['swancar', 'monster', 'farmtractor', 'bulldozer']; // (the Bulldozer: a ripper over its tail and only the blade's curved face in front)

export const PLATE_W_H = 4; // a plate is 4 times as wide as high (render/platedesigns.js draws it so)

const isRough = (e) => e && e[4] === 1;
const toEnd = (e) => (e ? { at: [0, e[0], e[1]], size: [e[2], e[2] / PLATE_W_H], pitch: e[3] || 0, rough: isRough(e) } : null);
const none = new Set([...PLATE_NONE, ...HAND_NONE]);

// the plan for a car: { status, key, ends: ['rear', 'front'] | ['rear'] | ['front'] | [], rear, front }
//   status 'legend' (keeps its own plates), 'none' (cannot wear one), 'unplaced' (no flat place found), 'ok'
export const plateAnchorsFor = (car) => {
  const key = car.model || car.id;
  if (car.legend) return { status: 'legend', key, ends: [], rear: null, front: null };
  if (none.has(key) || none.has(car.id) || car.ufo) return { status: 'none', key, ends: [], rear: null, front: null };
  const base = PLATE_VARIANTS[car.id] || PLATE_TABLE[key] || { r: null, f: null };
  const hand = { ...(HAND[key] || {}), ...(HAND[car.id] || {}) };
  const rear = toEnd('r' in hand ? hand.r : base.r), front = toEnd('f' in hand ? hand.f : base.f);
  const strict = [rear && !rear.rough && 'rear', front && !front.rough && 'front'].filter(Boolean);
  const any = [rear && 'rear', front && 'front'].filter(Boolean);
  let ends = strict.length ? strict : any;
  if (hand.ends === 'rear' && rear) ends = ['rear'];
  else if (hand.ends === 'front' && front) ends = ['front'];
  else if (hand.ends === 'both') ends = any;
  return { status: ends.length ? 'ok' : 'unplaced', key, ends, rear, front };
};
export const plateTableStats = () => ({ models: Object.keys(PLATE_TABLE).length, variants: Object.keys(PLATE_VARIANTS).length, none: none.size, hand: Object.keys(HAND).length });
