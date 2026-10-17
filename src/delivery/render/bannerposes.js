// ---- THE PACK BANNER'S POSES (render/packbanner.js lays them out; BANNER-POSES.md): each a layout of 1 to 4 featured
// cars, the first the HERO. A pose holds the camera (lift: radians up from level; fov: degrees; roll: degrees, a dutch
// angle; shiftX/shiftY: the group's middle on the picture) and `cars`: a slot per car, used in order, as many as there
// are cars (so every pose has its 1-, 2-, 3- and 4-car layout). A slot: h, its heading (0 nose at the camera, + to the
// camera's right, PI tail on); dir, the way it is stepped out from car `from` (default the one before; 0 to the left,
// PI/2 straight back, PI to the right, below 0 toward the camera) until its turned footprint is `gap` clear of every car
// placed (a separating-axis test: no car meets another); min, the least step (m); scale, times its size; dark, drawn
// as a silhouette (no lamps). Any BANNER number (weight, gap, marginX...) may be set on a pose too. The framing (every
// car's turned box, the camera put back until all of it fits) is the template's and holds for every pose.
const PI = Math.PI;
export const POSES = {
  // the template as it was (CHECKLIST 168): a staggered row back to the left, each turned less
  showdown: { cars: [{ h: 0.55 }, { h: 0.15, dir: 0.6 }, { h: -0.25, dir: 0.6 }, { h: -0.6, dir: 0.6 }] },
  // the hero close and low in the middle, nose at the camera, the others flanking it behind (a V)
  headon: { lift: 0.04, fov: 30, roll: 3, shiftX: 0, weight: 0.8, gap: 0.6,
    cars: [{ h: 0 }, { h: 0.22, dir: 1.0, from: 0, min: 2.5 }, { h: -0.22, dir: PI - 1.0, from: 0, min: 2.5 }, { h: -0.3, dir: PI - 0.7, from: 2 }] },
  // the hero big at the front left turned to the camera, the others overlapping behind it to the right
  staggered: { lift: 0.06, fov: 24, roll: -2, shiftX: -0.02, gap: 0.5,
    cars: [{ h: 0.8 }, { h: 0.55, dir: PI - 0.55 }, { h: 0.35, dir: PI - 0.7 }, { h: 0.15, dir: PI - 0.85 }] },
  // line abreast: all three-quarter, noses a little to the left, one size, a fanned arc
  abreast: { lift: 0.09, fov: 20, shiftX: 0, weight: 1, gap: 0.5,
    cars: [{ h: -0.5 }, { h: -0.5, dir: PI - 0.25 }, { h: -0.5, dir: PI - 0.4 }, { h: -0.5, dir: PI - 0.55 }] },
  // a chase from behind: rear three-quarters, the hero leading in the near lane, the others trailing to the left
  chase: { lift: 0.13, fov: 22, roll: 2, shiftX: 0, gap: 0.7,
    cars: [{ h: PI - 0.5 }, { h: PI - 0.45, dir: 0.35, scale: 0.92 }, { h: PI - 0.4, dir: 0.35, scale: 0.88 }, { h: PI - 0.35, dir: 0.35, scale: 0.85 }] },
  // the hero alone and big, the others small dark shapes far back
  solo: { lift: 0.06, fov: 30, shiftX: 0, gap: 0.6,
    cars: [{ h: 0.55 }, { h: 0.2, dir: 1.2, from: 0, min: 10, scale: 0.6, dark: true }, { h: -0.2, dir: PI - 1.2, from: 0, min: 10, scale: 0.6, dark: true }, { h: 0.3, dir: 0.2, from: 1, scale: 0.6, dark: true }] },
};
export const POSE_NAMES = Object.keys(POSES);
export const DEFAULT_POSE = 'showdown';
