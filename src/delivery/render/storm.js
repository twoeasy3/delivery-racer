// ---- the storm: cars blown through the air over the road ---------------------------------------
// A level with a "storm" ({ from, to, count, seed }) has that many vehicles tumbling along above
// its road, carried north on the wind, swinging from side to side and rolling over as they go.
// Each loops back to the start of the stretch when it reaches the end. They are purely a sight:
// the game logic knows nothing of them and nothing collides with them.
import * as THREE from 'three';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { scene, tmp, clearGroup } from './scene.js';
import { MODELS } from './models.js';
import { THEMES } from '../themes.js';

// Santa's sleigh (a festive theme: one of the storm's flyers is this, flying level, not tumbling): a red
// sleigh on gold runners, a sack of presents, and a team of reindeer out in front on their traces,
// legs going. It faces local +z
const makeSleigh = () => {
  const g = new THREE.Group();
  const lambert = (color) => new THREE.MeshLambertMaterial({ color });
  const box = (material, w, h, l, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const red = lambert(0xc81e1e), gold = lambert(0xe6c15a), brown = lambert(0x6b4a2b), sack = lambert(0x8a5a3a);
  box(red, 1.6, 0.9, 3.2, 0, 0.9, 0);                  // the sleigh's body
  box(red, 1.6, 0.6, 0.3, 0, 1.6, -1.5);               // its high back
  const prow = box(red, 1.2, 0.3, 1.2, 0, 1.4, 1.9);   // the curl of its prow
  prow.rotation.x = 0.8;
  for (const side of [-1, 1]) box(gold, 0.1, 0.1, 3.8, side * 0.8, 0.35, 0);   // runners
  for (const side of [-1, 1]) for (const z of [-1.2, 1.2]) box(gold, 0.08, 0.5, 0.08, side * 0.8, 0.6, z);
  box(sack, 1.1, 1.0, 1.1, 0, 1.75, -0.6);              // the sack
  box(lambert(0xd8262b), 0.7, 0.9, 0.5, 0, 1.75, 0.5);  // Santa
  box(lambert(0xf2d2b8), 0.4, 0.4, 0.4, 0, 2.4, 0.5);
  box(lambert(0xf2f2f2), 0.5, 0.15, 0.3, 0, 2.05, 0.75);
  const legs = [];
  for (let k = 0; k < 4; k++) { // two pairs of reindeer, out ahead on the traces
    const side = k % 2 ? 0.7 : -0.7, z = 3.4 + Math.floor(k / 2) * 2.6;
    box(brown, 0.5, 0.6, 1.4, side, 1.3, z);            // body
    box(brown, 0.3, 0.5, 0.5, side, 1.75, z + 0.8);     // head
    box(lambert(0x3a2a1c), 0.6, 0.35, 0.05, side, 2.15, z + 0.9); // antlers
    if (k === 3) box(new THREE.MeshBasicMaterial({ color: 0xff2a1a }), 0.16, 0.16, 0.16, side, 1.7, z + 1.08); // (a red nose, out in front)
    for (const lz of [-0.5, 0.5]) for (const lx of [-0.15, 0.15]) legs.push(box(brown, 0.1, 0.7, 0.1, side + lx, 0.65, z + lz));
    box(brown, 0.04, 0.04, 2.6, side, 1.1, z - 1.3);    // the trace
  }
  g.userData = { body: g.children[0], animate: (t) => legs.forEach((leg, i) => { leg.rotation.x = Math.sin(t * 7 + (i % 2) * Math.PI) * 0.5; }) };
  return g;
};

const group = new THREE.Group();
scene.add(group);
let flyers = [];
let time = 0;

const PAINTS = [0xffd23f, 0x4fc3f7, 0x7ee081, 0xff8fb1, 0xffffff, 0xff9f43, 0xe23b3b, 0x9b3fd1, 0x2f7de1];
// the garage's models, and the delivery van
const SHAPES = [
  { model: 'commuter', hw: 0.85, hl: 1.85, height: 1.45 },
  { model: 'junker', hw: 1.0, hl: 2.5, height: 1.95 },
  { model: 'darkvan', hw: 1.05, hl: 2.45, height: 2.4 },
  { model: 'lowrider', hw: 1.0, hl: 2.5, height: 1.1 },
  { model: 'wagon', hw: 1.05, hl: 2.4, height: 1.9 },
  { model: 'sport', hw: 0.85, hl: 1.9, height: 1.1 },
  { model: 'lovebus', hw: 1.0, hl: 2.3, height: 2.1 },
  { model: 'deliveryvan', hw: 1.1, hl: 2.7, height: 2.3, color: 0x1e5b3f },
];

const build = () => {
  clearGroup(group);
  flyers = [];
  time = 0;
  const storm = LEVEL.storm;
  if (!storm) return;
  // seeded, so the storm is the same every run
  let seed = ((storm.seed || 1) * 7919) >>> 0;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const span = storm.to - storm.from;
  const festive = !!(THEMES[LEVEL.theme] || THEMES.city).festive;
  for (let i = 0; i < (storm.count || 20); i++) {
    const shape = SHAPES[Math.floor(rand() * SHAPES.length)];
    const color = PAINTS[Math.floor(rand() * PAINTS.length)];
    const sleigh = festive && i === 0; // (on a festive level the first flyer is the sleigh)
    const mesh = sleigh ? makeSleigh() : MODELS[shape.model]({ color, ...shape }); // (in any paint, but the van in its own)
    group.add(mesh);
    flyers.push({
      mesh,
      s0: storm.from + rand() * span,       // where along the stretch it starts
      speed: sleigh ? 16 : 8 + rand() * 22, // m/s north on the wind
      amp: 4 + rand() * 14,                 // m it swings either side of the road's centre
      latRate: 0.25 + rand() * 0.5,         // swings per second (radians)
      height: sleigh ? 14 : 5 + rand() * 9, // m above the road
      bob: 1 + rand() * 2.5,
      phase: rand() * Math.PI * 2,
      // tumbling rates, radians/s (the sleigh flies level, banking a little with its swing)
      rx: sleigh ? 0 : (rand() - 0.5) * 3, ry: sleigh ? 0 : (rand() - 0.5) * 2.5, rz: sleigh ? 0 : (rand() - 0.5) * 3,
      sleigh,
      animate: mesh.userData.animate,
    });
  }
};
Game.onLoad.push(build);

export const syncStorm = (dt) => {
  if (!flyers.length) return;
  if (!Game.paused) time += dt;
  const storm = LEVEL.storm, span = storm.to - storm.from;
  const here = Track.along(Player.s);
  for (const f of flyers) {
    const s = storm.from + (((f.s0 - storm.from + f.speed * time) % span) + span) % span;
    // (nothing is drawn beyond the fog)
    f.mesh.visible = Math.abs(Track.along(s) - here) < 700;
    if (!f.mesh.visible) continue;
    const lat = f.amp * Math.sin(time * f.latRate + f.phase);
    const heading = Track.toWorld(s, lat, tmp);
    f.mesh.position.set(tmp.x, tmp.y + f.height + f.bob * Math.sin(time * 0.8 + f.phase), tmp.z);
    if (f.sleigh) f.mesh.rotation.set(0, heading, -Math.cos(time * f.latRate + f.phase) * 0.25); // (level, banking into its swing)
    else f.mesh.rotation.set(time * f.rx, heading + time * f.ry, time * f.rz);
    if (f.animate) f.animate(time + f.phase);
  }
};
