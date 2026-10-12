// ---- the three poses a car's still is drawn in (render/carstill.js, render/blueprintcard.js) ------------------------
// After Asphalt 9's blueprint cards (the owner, 12-Oct: "Have three poses for the car, replicating one of these"):
//   top   from above and a little behind, the car seen mostly from the top with a slight tilt (the Venom F5 card)
//   low   a low front three-quarter, a wide lens close in (the Rimac card)
//   front a front three-quarter at about eye height, nose the other way (the LaFerrari card)
// The numbers of each (how high, how far round, the lens) are carstill.js POSES; here only the names, and which a car
// gets: a STABLE pick by its id (the same car looks the same every time: the contents sheet, the showroom), and for a
// pack's cards a pick that keeps NEIGHBOURS different. No three.js here, so a headless check can read it.
export const POSE_NAMES = ['top', 'low', 'front'];

// ---- EXPERIMENT (the owner, 12-Oct: "experiment with new poses for the blueprints"), behind ?poses=<set> only ----
// Candidate poses to compare with the three above (their numbers: carstill.js POSES). Nothing changes without the
// address: the cards keep top / low / front. ?poses=<set> or ?poses=<name>,<name>,... makes the blueprint cards (the
// pack reveal, What's inside, Where to get it) pick from those instead, for that visit; ?poselab shows them side by side.
//   wide      the front three-quarter of `front`, the camera farther back and the car kept clear of the tab and the
//             rarity / stars strip (the whole car always in the free band of the card)
//   rear      a rear three-quarter at about eye height, tail to the left
//   hero      very low and nearly head-on, a medium-wide lens (the bonnet and the lamps big)
//   side      a flat side profile, a long lens, nose to the left
//   overhead  nearly straight down, the car on a diagonal (a plan view with a little side)
//   tele      a high front three-quarter through a very long lens: flat, catalogue-like, no distortion
export const CANDIDATE_POSES = ['wide', 'rear', 'hero', 'side', 'overhead', 'tele'];
export const POSE_SETS = {
  original: POSE_NAMES,
  a: ['wide', 'rear', 'hero'],          // a set to put beside the original: one farther back, one from behind, one low
  b: ['side', 'overhead', 'tele'],      // the flatter, more graphic views
  mixed: ['top', 'low', 'front', 'rear', 'side'], // the original three with two new ones added, never replaced
  all: CANDIDATE_POSES,
};
const KNOWN = new Set([...POSE_NAMES, ...CANDIDATE_POSES]);
// the names a ?poses= value asks for (a set's name, or a list of pose names); null: none valid (the original three)
export const posesFrom = (value) => {
  if (value === null || value === undefined) return null;
  const v = String(value).trim().toLowerCase();
  if (POSE_SETS[v]) return POSE_SETS[v];
  const names = [...new Set(v.split(',').map(x => x.trim()).filter(x => KNOWN.has(x)))];
  return names.length ? names : null;
};
// the poses the cards pick from on this visit: the original three unless the address asks (?poses=)
let active = null;
export const activePoses = () => {
  if (active) return active;
  let asked;
  try { asked = typeof location !== 'undefined' ? posesFrom(new URLSearchParams(location.search).get('poses')) : null; } catch { asked = null; }
  return (active = asked || POSE_NAMES);
};

// a small string hash (FNV-1a), the same every run
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};
// a car's own pose, by its id: always the same
export const posePick = (id, names = activePoses()) => names[hash(String(id)) % names.length];
// the poses of a row of cards (car ids, in the order shown): each card's own pick, unless the card before it has the
// same, then the next pose round (and never the same as the one before)
export const variedPoses = (ids, names = activePoses()) => {
  const out = [];
  ids.forEach((id, i) => {
    let p = names.indexOf(posePick(id, names));
    if (i > 0) for (let n = 0; n < names.length && names[p] === out[i - 1]; n++) p = (p + 1) % names.length;
    out.push(names[p]);
  });
  return out;
};
