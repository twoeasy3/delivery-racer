// ---- THE ANIMALS' IDLE AND GAIT ANIMATION (CHECKLIST 514): render-only -------------------------------------------------------
// Each animal obstacle (the frog, the cow, the kangaroo, the drop bear, the wildebeest, the zebra: render/obstacleModels.js) is
// built with userData.anim, its rig's pose. Here it is posed for this frame from what the game already has, read and never written:
// how far it went this frame (its stride, so a paused game, a replay's 2x and a stop all come out right: still, faster, legs back
// to rest), how high it is off the road (a hop, a gallop, a drop bear's fall) and the GAME clock (render/gameclock.js: paused, it
// holds still), each animal its own phase so a herd is never in step. Transforms only: no mesh, no allocation, nothing far away.
import { CONFIG } from '../config.js';
import { GameClock } from './gameclock.js';

export const ANIMAL_NEAR = 200; // m along the road: posed only this near the player (beyond, it keeps its last pose)
const TAU = Math.PI * 2;

// how far off the ground it is, 0..1: in a hop or a gallop's bound, or a drop bear coming down
const liftOf = (o) => {
  if (o.kind === 'frog') return o.t < 1 ? Math.sin(Math.PI * o.t) : 0;
  if (o.kind === 'kangaroo') return Math.min(1, Math.max(0, (o.h || 0) / CONFIG.kangarooHop));
  if (o.kind === 'dropBear') return o.fall && o.h > 0 ? 1 : 0;
  if (o.migrate) return Math.min(1, Math.max(0, (o.h || 0) / CONFIG.migration.hop));
  return 0;
};

// pose animal `mesh` (the obstacle o's, number i) for this frame
export const animateAnimal = (mesh, o, i, dt = GameClock.dt, time = GameClock.time) => {
  const A = mesh.userData.anim;
  const moved = Number.isNaN(A.s) ? 0 : Math.hypot(o.s - A.s, o.lat - A.lat);
  A.s = o.s;
  A.lat = o.lat;
  if (moved < 3) A.stride += moved / A.step * TAU; // (a jump, a wrap round with the herd, a restart: no stride)
  if (dt > 0) A.walk += ((moved < 3 && moved / dt > 0.4 ? 1 : 0) - A.walk) * Math.min(1, dt * 5);
  A.pose(time + i * 0.917, A.stride + i * 2.1, A.walk, liftOf(o));
};
