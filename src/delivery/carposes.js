// ---- the three poses a car's still is drawn in (render/carstill.js, render/blueprintcard.js) ------------------------
// After Asphalt 9's blueprint cards (the owner, 12-Oct: "Have three poses for the car, replicating one of these"):
//   top   from above and a little behind, the car seen mostly from the top with a slight tilt (the Venom F5 card)
//   low   a low front three-quarter, a wide lens close in (the Rimac card)
//   front a front three-quarter at about eye height, nose the other way (the LaFerrari card)
// The numbers of each (how high, how far round, the lens) are carstill.js POSES; here only the names, and which a car
// gets: a STABLE pick by its id (the same car looks the same every time: the contents sheet, the showroom), and for a
// pack's cards a pick that keeps NEIGHBOURS different. No three.js here, so a headless check can read it.
export const POSE_NAMES = ['top', 'low', 'front'];

// a small string hash (FNV-1a), the same every run
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};
// a car's own pose, by its id: always the same
export const posePick = (id) => POSE_NAMES[hash(String(id)) % POSE_NAMES.length];
// the poses of a row of cards (car ids, in the order shown): each card's own pick, unless the card before it has the
// same, then the next pose round (and never the same as the one before)
export const variedPoses = (ids) => {
  const out = [];
  ids.forEach((id, i) => {
    let p = POSE_NAMES.indexOf(posePick(id));
    if (i > 0) for (let n = 0; n < POSE_NAMES.length && POSE_NAMES[p] === out[i - 1]; n++) p = (p + 1) % POSE_NAMES.length;
    out.push(POSE_NAMES[p]);
  });
  return out;
};
