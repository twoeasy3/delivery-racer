// ---- FLY: a free camera to look round a level (?fly: the level editor's 3D view) ----------------------
// The level is loaded and frozen where it starts; the camera flies about it: W A S D (or the arrows)
// to fly, drag to look round, E / Space up and Q / C down, Shift to go faster, the wheel to set the
// speed. The road nearest the camera counts as where the player is, so whatever is only drawn near
// the player (obstacles, the scenery of a zone) is drawn round the camera instead.
// In the level editor (inside its 3D view), a click on the road places whatever the editor's tool is
// (a pickup, an obstacle or a TANK RAGE target), and a right-click on one removes it; each change is
// passed back to the editor, which keeps its copy of the level in step.
// ?cam=x,y,z,yaw,pitch puts the camera there to begin with (in the scene's terms; yaw and pitch in degrees).
// What a level only sets off as the player comes up to it is not there to be seen in a level standing still:
// buried landmines, drop bears, a rockfall's rocks, the airport's wreckage and its tower. T (or the editor's
// button, or ?reveal in the address) shows all of it as it ends up, set off: the mines up, the bears and the
// rocks down on the road, the wreckage landed and the tower fallen; and T again puts it all back.
import * as THREE from 'three';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { LEVEL } from '../levels.js';
import { camera, scene, tmp } from './scene.js';
import { rebuildItems } from './items.js';
import { CONFIG } from '../config.js';
import { Collision } from '../collision.js';
import { Wreckage } from '../wreckage.js';

export const Fly = { on: false, reveal: false };
// everything that is only set off later, shown as it ends up (or put back as it was): see the top of this file
const was = new Map(); // (each thing changed, and what it was like before)
const set = (thing, to) => {
  if (!was.has(thing)) was.set(thing, Object.fromEntries(Object.keys(to).map(k => [k, thing[k]])));
  Object.assign(thing, to);
};
export const reveal = (on) => {
  Fly.reveal = on;
  for (const [thing, before] of was) Object.assign(thing, before);
  was.clear();
  if (on) {
    for (const o of Collision.obstacles) {
      if (o.kind === 'landmine') set(o, { buried: false, rise: 1 });
      else if (o.kind === 'rock') set(o, { h: 0, lat: o.land });
    }
    for (const e of Wreckage.list) { // (landed, long since: an airliner where it comes to rest)
      const rest = e.slide ? Wreckage.airliner(e, 1e6).s : (e.s0 + e.s1) / 2;
      set(e, { t: 1e6, landed: true, sliding: false, swept: CONFIG.wreckage.blastBalls, s0: rest - e.depth / 2, s1: rest + e.depth / 2 });
    }
    if (Wreckage.tower) set(Wreckage.tower, { t: 1e6, down: true });
  }
  tell({ type: 'reveal', on });
};
const keys = new Set(), at = new THREE.Vector3(), step = new THREE.Vector3();
let yaw = 0, pitch = -0.3, speed = 40, look = null, down = null, tool = null;

// where on the road a point on the screen is: { s, lat }, or null off the road (the ray meets the
// road's own height there, found in a few goes)
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitAt = new THREE.Vector3();
const roadAt = (cx, cy) => {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  let y = 0, found = null;
  for (let k = 0; k < 3; k++) {
    plane.constant = -y;
    if (!ray.ray.intersectPlane(plane, hitAt)) return null;
    found = Track.fromWorld(hitAt.x * scene.scale.x, hitAt.z, Player.s, 400);
    if (!found || !Number.isFinite(found.s)) return null;
    Track.toWorld(found.s, found.lat, tmp);
    y = tmp.y;
  }
  return found.s >= Track.start && found.s <= Track.end && found.lat >= Track.lo(found.s) - 1 && found.lat <= Track.hi(found.s) + 1 ? found : null;
};
const tell = (message) => { if (parent !== window) parent.postMessage(message, '*'); };
const placeAt = (cx, cy) => {
  const r = roadAt(cx, cy);
  if (!r || !tool || !['pickups', 'obstacles', 'targets'].includes(tool.kind)) return;
  const s = Math.round(r.s), lane = Track.nearestLane(r.lat, r.s);
  const item = tool.kind === 'pickups' ? { type: tool.type, s, lane } : tool.kind === 'obstacles' ? { s, lane, kind: tool.type }
    : { s, side: r.lat < 0 ? 'left' : 'right' };
  (LEVEL[tool.kind] ||= []).push(item);
  rebuildItems();
  if (Fly.reveal) reveal(true); // (the obstacles are new ones)
  tell({ type: 'placed', list: tool.kind, item });
};
const removeAt = (cx, cy) => { // the nearest item within a few metres of the spot, taken away
  const r = roadAt(cx, cy);
  if (!r) return;
  let best = null, bestD = 4;
  for (const list of ['pickups', 'obstacles', 'targets']) {
    (LEVEL[list] || []).forEach((it, i) => {
      if (it.road) return;
      const lat = list === 'targets' ? (it.side === 'left' ? Track.lo(it.s) : Track.hi(it.s)) : Track.laneOffset(it.lane ?? 0, it.s);
      const d = Math.hypot(it.s - r.s, lat - r.lat);
      if (d < bestD) { bestD = d; best = { list, i, item: it }; }
    });
  }
  if (!best) return;
  LEVEL[best.list].splice(best.i, 1);
  rebuildItems();
  if (Fly.reveal) reveal(true);
  tell({ type: 'removed', list: best.list, item: best.item });
};

export const startFly = () => {
  Fly.on = true;
  document.body.classList.add('cinematic'); // (no HUD, no buttons)
  // behind the start line and up, looking along the road
  const h = Track.toWorld(0, 0, at), sx = scene.scale.x;
  const fx = sx * Math.sin(h), fz = Math.cos(h);
  yaw = Math.atan2(-fx, -fz);
  camera.position.set(at.x * sx - fx * 30, at.y + 18, at.z - fz * 30);
  const cam = new URLSearchParams(location.search).get('cam')?.split(',').map(Number);
  if (cam && cam.length >= 3 && cam.every(Number.isFinite)) {
    camera.position.set(cam[0], cam[1], cam[2]);
    if (cam.length >= 5) { yaw = cam[3] * Math.PI / 180; pitch = cam[4] * Math.PI / 180; }
  }
  window.addEventListener('keydown', (e) => { keys.add(e.code); if (e.code === 'Space') e.preventDefault(); if (e.code === 'KeyT' && !e.repeat) reveal(!Fly.reveal); });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('pointerdown', (e) => { if (e.button === 0) { look = [e.clientX, e.clientY]; down = [e.clientX, e.clientY]; } });
  window.addEventListener('pointerup', (e) => { // (a click, not a drag to look round: placing)
    if (e.button === 0 && down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) placeAt(e.clientX, e.clientY);
    look = down = null;
  });
  window.addEventListener('contextmenu', (e) => { e.preventDefault(); removeAt(e.clientX, e.clientY); });
  window.addEventListener('message', (e) => { // (the editor's tool, and its button for what is set off later)
    if (e.data && e.data.type === 'tool') tool = e.data.tool;
    if (e.data && e.data.type === 'reveal') reveal(!!e.data.on);
    // (where the camera is, as ?cam takes it: the editor asks before it makes the view afresh for a change to the level)
    if (e.data && e.data.type === 'pose') tell({ type: 'pose', cam: [camera.position.x, camera.position.y, camera.position.z, yaw * 180 / Math.PI, pitch * 180 / Math.PI].map(n => Math.round(n * 100) / 100) });
  });
  if (new URLSearchParams(location.search).get('reveal') !== null) reveal(true);
  tell({ type: 'flyReady' });
  window.addEventListener('pointermove', (e) => {
    if (!look) return;
    yaw -= (e.clientX - look[0]) * 0.004;
    pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - look[1]) * 0.004));
    look = [e.clientX, e.clientY];
  });
  window.addEventListener('wheel', (e) => { speed = Math.max(5, Math.min(400, speed * Math.exp(-e.deltaY * 0.001))); }, { passive: true });
};

export const flyCamera = (dt) => {
  Game.paused = true; // (the level holds still while it is looked round)
  const go = (codes) => codes.some(c => keys.has(c)) ? 1 : 0;
  const forward = go(['KeyW', 'ArrowUp']) - go(['KeyS', 'ArrowDown']);
  const right = go(['KeyD', 'ArrowRight']) - go(['KeyA', 'ArrowLeft']);
  const up = go(['KeyE', 'Space']) - go(['KeyQ', 'KeyC']);
  const v = speed * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3 : 1) * dt;
  step.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(forward * v);
  camera.position.add(step);
  camera.position.x += Math.cos(yaw) * right * v;
  camera.position.z -= Math.sin(yaw) * right * v;
  camera.position.y = Math.max(0.5, camera.position.y + up * v);
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  camera.fov = 60;
  camera.updateProjectionMatrix();
  // the road nearest the camera stands in for where the player is (in the scene's own terms)
  const near = Track.fromWorld(camera.position.x * scene.scale.x, camera.position.z, Player.s, 150);
  if (near && Number.isFinite(near.s)) Player.s = Math.max(Track.start, Math.min(Track.end, near.s));
};
