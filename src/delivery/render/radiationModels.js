// ---- radiation's models (../radiation.js), with no game state: render/radiation.js sets them down in a level, and
// the Gimmicks page (../gimmicks.js) shows them on its cards ----
import * as THREE from 'three';
import { makeBoard } from './gambleModels.js';

export const RAD = { haze: 0x7dff2a, edge: 0xc8ff3a, puddle: 0xd6ff5a, sign: '#ffd23f', ink: '#16181c' };

// the trefoil, drawn on a canvas: three blades round a hub (one blade down), `ink` on a disc of `bg`
const trefoilCanvas = (size = 128, bg = RAD.sign, ink = RAD.ink) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d'), m = size / 2, r = size * 0.46;
  c.fillStyle = bg;
  c.beginPath(); c.arc(m, m, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = ink; c.lineWidth = size * 0.045;
  c.beginPath(); c.arc(m, m, r - c.lineWidth / 2, 0, Math.PI * 2); c.stroke();
  c.fillStyle = ink;
  c.beginPath(); c.arc(m, m, r * 0.17, 0, Math.PI * 2); c.fill();
  for (const mid of [90, 210, 330]) {
    const a = (mid - 30) * Math.PI / 180, b = (mid + 30) * Math.PI / 180;
    c.beginPath(); c.arc(m, m, r * 0.82, a, b); c.arc(m, m, r * 0.28, b, a, true); c.closePath(); c.fill();
  }
  return canvas;
};
let trefoilMap = null, stripeMap = null;
const trefoil = () => trefoilMap || (trefoilMap = new THREE.CanvasTexture(trefoilCanvas()));
// a round plate with the trefoil on it, `d` m across, facing the model's -z (the same from both sides, and the
// same in a mirror: it needs no turning back on a left-hand level)
export const makeTrefoilPlate = (d = 1.6) => {
  const plate = new THREE.Mesh(new THREE.CircleGeometry(d / 2, 28), new THREE.MeshBasicMaterial({ map: trefoil(), side: THREE.DoubleSide, transparent: true }));
  plate.rotation.y = Math.PI;
  return plate;
};
// yellow and black hazard stripes, slanting (a texture that repeats)
export const hazardStripes = () => {
  if (stripeMap) return stripeMap;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d');
  c.fillStyle = RAD.sign; c.fillRect(0, 0, 64, 64);
  c.fillStyle = RAD.ink;
  for (const x of [-64, 0, 64]) { c.beginPath(); c.moveTo(x, 64); c.lineTo(x + 32, 64); c.lineTo(x + 96, 0); c.lineTo(x + 64, 0); c.closePath(); c.fill(); }
  stripeMap = new THREE.CanvasTexture(canvas);
  stripeMap.wrapS = stripeMap.wrapT = THREE.RepeatWrapping;
  return stripeMap;
};
// the warning board before an area: RADIATION and what to do, on a post, a trefoil plate over it. Facing the
// traffic coming up to it (the model's -z). userData.words: the lettered part, to be turned back on a left-hand
// level (which is drawn mirrored)
export const makeRadiationBoard = (text = 'RADIATION\nKEEP OUT OF THE GREEN', w = 6.4, h = 2.4, post = 4) => {
  const g = new THREE.Group(), steel = new THREE.MeshLambertMaterial({ color: 0x8a9096 });
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, post, 0.22), steel);
  pole.position.y = post / 2;
  const board = makeBoard(text, RAD.sign, RAD.ink, w, h);
  board.position.set(0, post + h / 2 - 0.3, -0.13);
  board.rotation.y = Math.PI;
  const plate = makeTrefoilPlate(2);
  plate.position.set(0, post + h + 0.75, -0.13);
  g.add(pole, board, plate);
  g.userData.words = board;
  return g;
};
// what an infected car wears: a green shell of light round its body (hw, hl, height: the car's), a trefoil
// floating over it, and its ring on the road, `radius` m out (the edge of what it doses), over a faint disc.
// userData.pulse(t, k = 1): it throbs (k < 1: dimmer, as the player's does under the shield)
export const makeInfection = (hw, hl, height, radius) => {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshBasicMaterial({ color: RAD.haze, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shellMat);
  shell.scale.set(hw * 2 + 0.5, height + 0.35, hl * 2 + 0.5);
  shell.position.y = (height + 0.35) / 2;
  const ringMat = new THREE.MeshBasicMaterial({ color: RAD.edge, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.35, radius, 56), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.09;
  const discMat = new THREE.MeshBasicMaterial({ color: RAD.haze, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.35, 40), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.07;
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: trefoil(), depthWrite: false }));
  badge.scale.set(1.5, 1.5, 1);
  badge.position.y = height + 1.5;
  // (the shell and the badge turn with the car; the ring lies on the road whatever the car does)
  const body = new THREE.Group();
  body.add(shell, badge);
  g.add(body, ring, disc);
  g.userData.body = body;
  g.userData.pulse = (t, k = 1) => {
    const beat = 0.5 + 0.5 * Math.sin(t * 5);
    shellMat.opacity = (0.24 + 0.2 * beat) * k;
    ringMat.opacity = (0.75 + 0.25 * beat) * k;
    discMat.opacity = 0.2 * k;
    badge.material.opacity = k;
    badge.position.y = height + 1.5 + 0.12 * Math.sin(t * 2.4);
  };
  return g;
};
// a patch of a radiated area, for a card: `w` m across and `l` long, its haze, its bright edges, the hazard
// bands across its ends and a puddle or two; standing on y = 0
export const makeAreaPatch = (w = 4.4, l = 12) => {
  const g = new THREE.Group();
  const flat = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; };
  flat(new THREE.PlaneGeometry(w, l), new THREE.MeshBasicMaterial({ color: RAD.haze, transparent: true, opacity: 0.4, depthWrite: false }), 0, 0.03, 0);
  for (const x of [-w / 2, w / 2]) flat(new THREE.PlaneGeometry(0.3, l), new THREE.MeshBasicMaterial({ color: RAD.edge }), x, 0.04, 0);
  for (const z of [-l / 2 - 0.8, l / 2 + 0.8]) {
    const map = hazardStripes().clone();
    map.needsUpdate = true;
    map.repeat.set(w / 1.6, 1);
    flat(new THREE.PlaneGeometry(w, 1.6), new THREE.MeshBasicMaterial({ map }), 0, 0.04, z);
  }
  for (const [x, z, r] of [[-0.8, -3, 0.9], [0.9, 1.5, 1.1], [-0.3, 4.4, 0.6]]) flat(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: RAD.puddle, transparent: true, opacity: 0.85 }), x, 0.05, z);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, l), new THREE.MeshBasicMaterial({ color: RAD.haze, transparent: true, opacity: 0.14, depthWrite: false }));
  wall.position.y = 0.78;
  g.add(wall);
  return g;
};
