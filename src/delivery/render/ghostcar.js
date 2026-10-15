// ============================================================================
// THE GHOST (REPLAY-NOTES.md Phase C; CHECKLIST 30): in a run of the player's own, the best run on that level and
// side (replaystore.js) drives along beside it as a see-through car, where it was at the same time on the clock
// (its recording's path: replay.js). It is only drawn: nothing touches it, and it changes nothing of the run (or of a
// replay of it). Where the best run was rewound, the path holds the run as its clock ended up (replay.js mark), so
// the ghost never has a rewind's ten seconds in it; a player rewound in a trial goes back on the clock, and the ghost
// with it. A line under the clock says how far ahead or behind it is. In a replay being watched only when the orbit camera's panel
// switches it on (WatchGhost below; never the very run being watched). Not in a screensaver or
// a level off the menu; and not at all with "Ghost of your best run" off in the options.
// ============================================================================
import * as THREE from 'three';
import { Game } from '../game.js';
import { LEVEL, LEVELS } from '../levels.js';
import { STAGE_LEVELS } from '../events.js';
import { CAR, carById } from '../cars.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Replay } from '../replay.js';
import { ReplayStore } from '../replaystore.js';
import { makeCarMesh, shapeCarMesh } from './cars.js';

const ghostMat = new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.38, depthWrite: false });
const at = new THREE.Vector3();
const gap = document.createElement('div');
gap.id = 'ghostGap';
document.body.append(gap);

let mesh = null, meshCar = null, path = null, runKey = '';
// the ghost in a replay being watched (the orbit camera's panel, render/orbit.js): off unless asked for, and then the best run
// on this level and side (not the very run being watched: that would sit on the car) goes by the replay's own clock
export const WatchGhost = { on: false };
const bestFor = () => {
  const best = ReplayStore.best(LEVEL.id, Game.evil), now = Replay.playing?.rec;
  if (!best?.path?.length || !Replay.check(best).ok) return null;
  if (now && best.header.date === now.header.date && best.header.seed === now.header.seed) return null;
  return best;
};
// is there a ghost to show for the replay playing? (the panel's button says none when not)
export const watchGhostAvailable = () => !!Replay.playing && !!bestFor();
// the ghost switched on or off mid-run: picked afresh on the next frame
export const refreshGhost = () => { runKey = ''; };

// the run has started: the ghost for it, if there is one to have
const pick = () => {
  path = null;
  if (!(Replay.playing ? WatchGhost.on : ReplayStore.ghostOn) || Game.screensaver || Game.raceWatch || !(LEVELS.includes(LEVEL) || STAGE_LEVELS.includes(LEVEL))) return;
  const best = bestFor();
  if (!best) return; // (one recorded before there were paths, or out of date, or the very run being watched)
  path = Replay.unpackPath(best.path);
  const car = carById(best.header.car) || CAR;
  if (!mesh) mesh = makeCarMesh(0xffffff);
  if (meshCar !== car) {
    shapeCarMesh(mesh, car);
    mesh.traverse((part) => { if (part.isMesh) { part.material = ghostMat; part.castShadow = false; part.renderOrder = 2; } });
    meshCar = car;
  }
};

// where the ghost was at time t: [s, lat, yaw, air], or null once its run is over
const sample = (t) => {
  const last = path.length - 1;
  if (t > path[last][0] + 0.5) return null;
  let lo = 0, hi = last; // (the last point at or before t)
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (path[mid][0] <= t) lo = mid; else hi = mid - 1; }
  const a = path[lo], b = path[Math.min(lo + 1, last)];
  // (between two points, in a straight line: not across a jump from one road to another, or round a lap's end)
  const k = b === a || Math.abs(b[1] - a[1]) > 15 ? 0 : Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
  return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k, a[4] + (b[4] - a[4]) * k];
};

// back on the menu (main.js): no ghost, and no line about it
export const clearGhost = () => { gap.style.display = 'none'; if (mesh) mesh.visible = false; runKey = ''; path = null; };
// each frame (main.js), once the player's car is placed
export const syncGhost = () => {
  const key = Game.state === 'playing' ? Game.seed + ':' + Game.loadSeed : '';
  if (key !== runKey) { runKey = key; if (key) pick(); else path = null; }
  const where = path && Game.state === 'playing' ? sample(Game.time) : null;
  if (mesh) mesh.visible = !!where;
  if (!where) {
    gap.style.display = path && Game.state === 'playing' ? 'block' : 'none';
    gap.textContent = 'Ghost delivered';
    return;
  }
  const [s, lat, yaw, air] = where;
  const heading = Track.toWorld(s, lat, at);
  mesh.position.copy(at);
  mesh.position.y += air;
  mesh.rotation.y = heading - yaw;
  mesh.rotation.x = -Math.atan(Track.grade(s));
  if (LEVEL.laps) { gap.style.display = 'none'; return; } // (round a circuit, how far apart is not one number)
  const metres = Math.round(Track.along(s) - Track.along(Player.s));
  gap.style.display = 'block';
  gap.textContent = metres > 0 ? 'Ghost ' + metres + ' m ahead' : metres < 0 ? 'Ghost ' + -metres + ' m behind' : 'Level with the ghost';
  gap.classList.toggle('ahead', metres < 0); // (the player ahead)
};
