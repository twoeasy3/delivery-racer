// ---- WHICH POSE A CAR'S BLUEPRINT CARD IS DRAWN IN (render-only: render/blueprintcard.js's callers; the numbers are carstill.js POSES) ----
// The FIVE poses: top, hero, front, rear (carposes.js's four) and side, the flat profile on a long lens, nose to the left (tried and
// removed in CHECKLIST 164, back by the owner's pick, 17-Oct). A car's pose is FIXED when the owner picked one for it (FIXED_POSES:
// 131 cars, from the pose sheet's review page, 17-Oct); else a STABLE pick by its id (an FNV-1a hash over the five). On purpose a
// render file, imported by no rules file, so changing the table or the list never moves the replay fingerprint (scripts/logic-hash.mjs:
// carposes.js is on that list and is left as it was; it is no longer read by the game).
export const POSE_NAMES = ['top', 'hero', 'front', 'rear', 'side'];

// the owner's picks, by pose (a car in one list only; scripts/.poseassign-check.mjs: every id a real car)
const PICKS = {
  top: [ // 28
    'armoured', 'armouredlimo', 'blower', 'bubble', 'cigar', 'fullsize', 'hotdog', 'hotrod', 'keiroadster',
    'keitruck', 'lowrider', 'moonrover', 'pixelev', 'pocket4x4', 'rallywedge', 'rearengine', 'sevenroadster',
    'silvercomet', 'sixbysix', 'sleeper', 'smileyhatch', 'solarracer', 'supermini', 'tinsnail', 'toybota',
    'trophytruck', 'twostroke', 'ute',
  ],
  hero: [ // 30
    'autobahnestate', 'brickestate', 'cabledrum', 'cityev', 'classicgt', 'dodgem', 'dragster', 'goddess',
    'gullwing', 'horseshoe', 'jeepney', 'liftedtruck', 'limo', 'midnight', 'mini', 'pandacoupe', 'pebble',
    'pony', 'postvan', 'quadturbo', 'rally', 'rotary', 'sport', 'sprinthatch', 'stately', 'threewheeler',
    'wagon', 'wedge', 'wedgemicro', 'woody',
  ],
  front: [ // 30
    'buggy', 'coach', 'commuter', 'fireengine', 'gyrocar', 'hardtop', 'herald', 'hothatch', 'iceresurfacer',
    'jetcar', 'junker', 'miata', 'midsummer', 'milkfloat', 'minibus', 'moorrover', 'motorhome', 'nissank',
    'paddleduck', 'pickup', 'rocketfin', 'sixteen', 'sixwheeler', 'snake', 'superlowrider', 'talltourer', 'taxi',
    'touringcar', 'widetruck', 'windsong',
  ],
  rear: [ // 22
    'coupecross', 'eightieshatch', 'fieldscout', 'flatbed', 'floatvan', 'flyingcar', 'gameviewer', 'glassbrake',
    'hearse', 'hillclimb', 'keivan', 'knifeedge', 'minivan', 'moke', 'muscle', 'refuselorry', 'safari', 'snocat',
    'steamwagon', 'suv', 'towtruck', 'tuktuk',
  ],
  side: [ // 21
    'bug', 'corrugated', 'cranelorry', 'dampervan', 'darkvan', 'evsaloon', 'farmtractor', 'finlandyacht',
    'fishbowl', 'golfcart', 'halftrack', 'lovebus', 'monster', 'polytruck', 'pushbacktug', 'removalsvan',
    'slantback', 'splitwindow', 'sporttruck', 'swancar', 'teardrop',
  ],
};
export const FIXED_POSES = Object.freeze(Object.fromEntries(Object.entries(PICKS).flatMap(([pose, ids]) => ids.map(id => [id, pose]))));

// a small string hash (FNV-1a), the same every run (as carposes.js)
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};
// the hash pick over all five, for a car with no fixed pose
export const hashPose = (id) => POSE_NAMES[hash(String(id)) % POSE_NAMES.length];
// a car's own pose: its fixed one, else the hash pick (always the same: the contents sheet, Jim's stall, "Where to get it")
export const posePick = (id) => FIXED_POSES[id] || hashPose(id);
// the poses of a pack's row of cards (car ids, in the order shown): a fixed car always its own pose (neighbours may share then);
// a hash car steps round from its pick past the pose of the card before it and of a FIXED card after it
export const variedPoses = (ids) => {
  const out = [];
  ids.forEach((id, i) => {
    if (FIXED_POSES[id]) { out.push(FIXED_POSES[id]); return; }
    const avoid = [out[i - 1], FIXED_POSES[ids[i + 1]]];
    let p = POSE_NAMES.indexOf(hashPose(id));
    for (let n = 0; n < POSE_NAMES.length && avoid.includes(POSE_NAMES[p]); n++) p = (p + 1) % POSE_NAMES.length;
    out.push(POSE_NAMES[p]);
  });
  return out;
};
