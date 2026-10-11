import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CAR, AMPHIBIOUS_TANK } from '../cars.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Collision } from '../collision.js';
import { Pickups, Targets } from '../pickups.js';
import { Game } from '../game.js';
import { scene, tmp, clearGroup } from './scene.js';
import { buildStrip, THEMES, landAt } from './road.js';
import { carMesh, passengerMesh, makeTankMesh, shapeCarMesh, ufoMesh, trafficMeshes, syncLamps } from './cars.js';
import { Traffic } from '../traffic.js';
import { Particles, rnd } from './effects.js';
import { MODELS } from './models.js';
import { makeIdeaModel } from './ideaModels.js';
import { TURBO_COLOR, PICKUP_COLOR, PICKUP_MODELS, makeTargetModel } from './pickupModels.js';
import { OBSTACLE_MODELS } from './obstacleModels.js';
import { makeAmphibiousTankMesh } from './tankModels.js';
import { addSuperKit } from './carExtras.js';
import { damageShare, dentModel, scorch } from './dents.js';
import { SpeedCameras } from '../cameras.js';
import { Hazards } from '../hazards.js';
import { Delivery } from '../delivery.js';

// Everything here that belongs to the loaded level (bridges, obstacles, pickups, targets)
// lives in this group and is rebuilt by buildItems() each time a level is loaded.
const levelItems = new THREE.Group();
scene.add(levelItems);
let obstacleMeshes = [], pickupMeshes = [], targetMeshes = [];
let shownCar = CAR; // the car the player's model is currently shaped as
// animated models for the player's car, built the first time each is needed
const playerModels = {};
const playerModel = (car) => {
  if (!playerModels[car.id]) {
    const model = car.idea ? makeIdeaModel(car) : MODELS[car.model](car); // (a car idea's is its own: ideas.js, render/ideaModels.js)
    if (car.super) addSuperKit(model, car); // (a Super car: its base car's model with the body kit on)
    model.userData.body.material.transparent = true; // (so it can go see-through as a ghost)
    carMesh.add(model);
    playerModels[car.id] = model;
  }
  return playerModels[car.id];
};

const lambert = (color) => new THREE.MeshLambertMaterial({ color });

// ---- the player as a ghost --------------------------------------------------------------------
// Every part of the car, whatever model and livery it has, is drawn in this one pale, glowing,
// see-through material while the ghost lasts: the parts' own materials are put aside and
// given back afterwards. Colour changes meanwhile go to the part's own paint (paintOf).
const GHOST_MAT = new THREE.MeshLambertMaterial({ color: 0xdfe9ff, emissive: 0x4a6cff, transparent: true, opacity: 0.45 });
const ghostify = (group, on) => group.traverse((mesh) => {
  if (!mesh.isMesh) return;
  if (on && !mesh.userData.solidMat) { mesh.userData.solidMat = mesh.material; mesh.material = GHOST_MAT; }
  else if (!on && mesh.userData.solidMat) { mesh.material = mesh.userData.solidMat; mesh.userData.solidMat = null; }
});
const paintOf = (mesh) => mesh.userData.solidMat || mesh.material;
// ...and a cartoon ghost hovers over the car for as long as it lasts (it follows the car,
// rather than riding on it, so that it is never turned ghostly itself)
const hoverGhost = PICKUP_MODELS.ghost();
hoverGhost.scale.setScalar(1.3);
hoverGhost.visible = false;
scene.add(hoverGhost);
// a powerup's sign (on the car, or over it) shows while there are `left` seconds of it, and
// blinks through its last CONFIG.powerUpWarning seconds, in time with the warning sound
const powerShown = (left) => left > 0 && (left > CONFIG.powerUpWarning || Math.floor(left * 8) % 2 === 0);

// while a mystery is running, its question-mark block turns over the car (as the ghost does)
const hoverMystery = PICKUP_MODELS.mystery();
hoverMystery.scale.setScalar(1.1);
hoverMystery.visible = false;
scene.add(hoverMystery);

// ...and while one is working, it turns over the car (as the ghost and the mystery do)
const hoverRadar = PICKUP_MODELS.radarDetector();
hoverRadar.scale.setScalar(1.3);
hoverRadar.visible = false;
scene.add(hoverRadar);

// ...and while one is running, the turbocharger turns over the car (as the radar detector does)
const hoverTurbo = PICKUP_MODELS.turbo();
hoverTurbo.scale.setScalar(1.1);
hoverTurbo.visible = false;
scene.add(hoverTurbo);

// ...and while bad gas or the weight is on, the jerry can or the weight turns over it too
const hoverGas = PICKUP_MODELS.badGas();
hoverGas.visible = false;
scene.add(hoverGas);
const hoverWeight = PICKUP_MODELS.heavyMass();
hoverWeight.visible = false;
scene.add(hoverWeight);
const hoverArmour = PICKUP_MODELS.armour(), hoverSplash = PICKUP_MODELS.bigSplash(), hoverButter = PICKUP_MODELS.butterfingers();
for (const hover of [hoverArmour, hoverSplash, hoverButter]) {
  hover.visible = false;
  scene.add(hover);
}

// ...and while one is sounding, it rides on the car's roof, flashing
const roofSiren = PICKUP_MODELS.siren();
roofSiren.visible = false;
scene.add(roofSiren);

// TOAD RAGE (a mystery): a traffic vehicle that is a toad shows a frog in place of itself,
// hopping as it goes. Call after syncTraffic, which shows each vehicle's own parts.
export const syncToads = (now) => {
  for (let i = 0; i < Traffic.cars.length; i++) {
    const car = Traffic.cars[i], mesh = trafficMeshes[i];
    let toad = mesh.userData.toad;
    if (!car.active || !car.toad) {
      if (toad) toad.visible = false;
      continue;
    }
    if (!toad) {
      toad = mesh.userData.toad = OBSTACLE_MODELS.frog();
      mesh.add(toad);
    }
    toad.visible = true;
    toad.position.y = Math.abs(Math.sin(now / 160 + i)) * 0.6;
    const { body, cabin, lights, trim, bar, models } = mesh.userData;
    for (const part of [body, cabin, bar, ...lights, ...trim, ...Object.values(models)]) part.visible = false;
  }
};

// a spinning model over a glowing pad
const makePickup = (p) => {
  const group = new THREE.Group();
  const gem = PICKUP_MODELS[p.type]();
  gem.scale.setScalar(1.5); // (big enough to make out from the chase camera)
  gem.position.y = 1.7;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.laneWidth * 0.8, 0.02, 5), new THREE.MeshBasicMaterial({
    color: PICKUP_COLOR[p.type], transparent: true, opacity: 0.45, depthWrite: false }));
  pad.position.y = 0.04;
  group.add(gem, pad);
  group.rotation.y = Track.toWorld(p.s, p.lat, tmp);
  group.position.copy(tmp);
  group.userData.gem = gem;
  return group;
};
// TANK RAGE target: a spinning, glowing green ring on a post beside the road
// (where it is, and how it stands there, are Targets' to say: t.lat, t.look. See CONFIG.target)
const makeTarget = (t) => {
  const look = t.look, out = { x: 0, z: 0 };
  if (look.style === 'gantry') { // (its mast: `arm` m further from the road than the ring)
    Track.toWorld(t.s, t.lat + t.side * look.arm, tmp);
    out.x = tmp.x;
    out.z = tmp.z;
  }
  Track.toWorld(t.s, t.lat, tmp);
  const group = makeTargetModel(look, { x: out.x - tmp.x, z: out.z - tmp.z });
  group.position.set(tmp.x, tmp.y + look.height, tmp.z);
  return group;
};

// a bridge: a truss standing on both shoulders, with water below. A bridge's style can make it
// 'harbour' (a great steel arch over the road, on granite pylons) or 'seacliff' (concrete, with
// white parapets, on piers standing in the sea)
const buildBridge = (from, to, style) => {
  const wallInset = CONFIG.bridgeWallInset;
  // the river: drawn straight after the ground and, like it, under everything else (dark, at
  // night), at sea level whatever the height of the road (the sea itself, for one over the sea)
  const night = (THEMES[LEVEL.theme] || {}).lit;
  if (style !== 'seacliff') {
    const water = new THREE.Mesh(buildStrip(from + 6, to - 6, -500, 500, 0, 20),
      new THREE.MeshBasicMaterial({ color: night ? 0x1d4466 : 0x2f6f9f, side: THREE.DoubleSide, depthWrite: false }));
    const pos = water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, -0.02);
    water.renderOrder = -1;
    levelItems.add(water);
  }
  if (style === 'harbour' || style === 'seacliff') { buildStyledBridge(from, to, style); return; }

  // (the top chords and cross beams stand well above the camera, which would otherwise drive through them)
  // (the girders and top chords are runs laid from where the edge is at one post to where it is at the next, so that
  // where the road narrows they taper with it, and are not stepped: bays of 8 m)
  const BAY = 8, TOP = Math.max(CONFIG.camHeight, CONFIG.screensaver.camHeight) + 4;
  const parts = []; // [s, lat, y, width, height, length] or, for a run, [s, lat, y, width, height, s1, lat1]
  for (let s = from; s < to; s += BAY) {
    const s1 = Math.min(s + BAY, to);
    const wall = (side, at = s) => Track.edge(at, side) + wallInset; // (bridges are on the expressway)
    const width = Math.max(0.05, Track.shoulder - wallInset);
    for (const side of [-1, 1]) {
      parts.push([s, side * (wall(side) + width / 2), 0.9, width, 1.8, s1, side * (wall(side, s1) + width / 2)]); // deck girder filling the shoulder
      parts.push([s, side * (wall(side) + 0.5), TOP / 2, 1, TOP, 1]);                                          // post
      parts.push([s, side * (wall(side) + 0.5), TOP, 1, 1, s1, side * (wall(side, s1) + 0.5)]);               // top chord
    }
    parts.push([s, (wall(1) - wall(-1)) / 2, TOP, wall(1) + wall(-1) + 2, 1, 1]);        // cross beam
  }
  const truss = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x9c4a3a), parts.length);
  const dummy = new THREE.Object3D(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  parts.forEach(([s, lat, y, width, height, length, lat1], i) => {
    if (lat1 !== undefined) { // (a run from (s, lat) to (length, lat1), as it is for a rail: turned to the line between)
      Track.toWorld(s, lat, tmp); pa.set(tmp.x, tmp.y, tmp.z);
      Track.toWorld(length, lat1, tmp); pb.set(tmp.x, tmp.y, tmp.z);
      const run = Math.hypot(pb.x - pa.x, pb.z - pa.z);
      dummy.rotation.order = 'YXZ';
      dummy.rotation.y = Math.atan2(pb.x - pa.x, pb.z - pa.z);
      dummy.rotation.x = -Math.atan2(pb.y - pa.y, run);
      dummy.position.set((pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + y, (pa.z + pb.z) / 2);
      dummy.scale.set(width, height, Math.hypot(run, pb.y - pa.y) + 0.02);
    } else {
      dummy.rotation.set(0, Track.toWorld(s, lat, tmp), 0);
      dummy.position.set(tmp.x, tmp.y + y, tmp.z);
      dummy.scale.set(width, height, length);
    }
    dummy.updateMatrix();
    truss.setMatrixAt(i, dummy.matrix);
  });
  levelItems.add(truss);
};

const buildStyledBridge = (from, to, style) => {
  const wallInset = CONFIG.bridgeWallInset, width = Math.max(0.05, Track.shoulder - wallInset);
  const wall = (s, side) => Track.edge(s, side) + wallInset;
  const parts = [], deck = (s) => { Track.toWorld(s, 0, tmp); return tmp.y; };
  const harbour = style === 'harbour';
  for (let s = from; s < to; s += 10) {
    const len = Math.min(10, to - s);
    for (const side of [-1, 1]) {
      parts.push([s + len / 2, side * (wall(s, side) + width / 2), 0.55, width, 1.1, len]); // (the deck's edge, filling the shoulder)
      if (!harbour) parts.push([s + len / 2, side * (wall(s, side) + 0.2), 1.2, 0.3, 1.0, len]); // (a white parapet)
    }
  }
  const material = new THREE.MeshLambertMaterial({ color: harbour ? 0x8a8f96 : 0xf2f2ee });
  const edges = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, parts.length);
  const dummy = new THREE.Object3D();
  parts.forEach(([s, lat, y, w, h, l], i) => {
    dummy.rotation.y = Track.toWorld(s, lat, tmp);
    dummy.position.set(tmp.x, tmp.y + y, tmp.z);
    dummy.scale.set(w, h, l);
    dummy.updateMatrix();
    edges.setMatrixAt(i, dummy.matrix);
  });
  levelItems.add(edges);
  const column = (s, lat, top, r, colour) => { // a pier, from sea level up to `top`
    Track.toWorld(s, lat, tmp);
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, top + 0.1, 10), lambert(colour));
    pier.position.set(tmp.x, top / 2 - 0.05, tmp.z);
    levelItems.add(pier);
  };
  if (!harbour) { // the Sea Cliff Bridge: on pairs of piers in the sea
    for (let s = from + 20; s < to - 10; s += 45) for (const side of [-1, 1]) column(s, side * (wall(s, side) - 0.5), deck(s) - 0.4, 1.2, 0xd6d4cc);
    return;
  }
  // the Harbour Bridge: granite pylons at each end, and over the road two great arches, one each
  // side, from pylon to pylon, the road hung from them
  const span = to - from, rise = 95, steel = lambert(0x7d8a92), granite = lambert(0xc4ae86);
  for (const s of [from + 6, to - 6]) for (const side of [-1, 1]) {
    const y0 = deck(s);
    Track.toWorld(s, side * (wall(s, side) + 7), tmp);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(12, y0 + 40, 14), granite);
    pylon.position.set(tmp.x, (y0 + 40) / 2 - 0.05, tmp.z);
    pylon.rotation.y = Track.toWorld(s, 0, new THREE.Vector3());
    levelItems.add(pylon);
  }
  for (const side of [-1, 1]) {
    for (const [lift, thick] of [[1, 2.2], [0.78, 1.4]]) { // the top chord and the bottom chord
      const points = [];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40, s = from + 14 + (span - 28) * t;
        Track.toWorld(s, side * (wall(s, side) + 3), tmp);
        points.push(new THREE.Vector3(tmp.x, deck(s) + 4 * rise * lift * t * (1 - t) - (lift < 1 ? 0 : 0), tmp.z));
      }
      levelItems.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, thick, 8), steel));
    }
    for (let s = from + 40; s < to - 30; s += 22) { // the hangers, from the lower chord down to the deck
      const t = (s - from - 14) / (span - 28), high = 4 * rise * 0.78 * t * (1 - t);
      if (high < 6) continue;
      Track.toWorld(s, side * (wall(s, side) + 3), tmp);
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, high, 6), steel);
      hanger.position.set(tmp.x, deck(s) + high / 2, tmp.z);
      levelItems.add(hanger);
    }
  }
  // (and piers under the deck, down to the water)
  for (let s = from + 30; s < to - 20; s += 60) for (const side of [-1, 1]) column(s, side * (wall(s, side) - 1), deck(s) - 0.4, 1.6, 0xc4ae86);
};

// ---- built when a level is loaded ---------------------------------------------------------------
// (level meshes own their geometry and materials, so emptying the group can free them all)
const place = (mesh) => { levelItems.add(mesh); return mesh; };
// anything with writing on it (userData.text) mirrored back on a left-hand level, which is drawn
// mirrored, so that it still reads
const readable = (object) => object.traverse((mesh) => {
  if (mesh.userData.text) mesh.scale.x = Math.abs(mesh.scale.x) * (Track.mirrored ? -1 : 1);
});
// a drop bear's gum tree (see CONFIG.dropBear): a pale trunk beside the road on the bear's side, a limb
// reaching out over the road to it, and clumps of grey-green leaves round the limb's end that the bear
// hides in, only its legs and claws showing below until it drops
const gumBark = new THREE.MeshLambertMaterial({ color: 0xd9cfbf }), gumLeaves = new THREE.MeshLambertMaterial({ color: 0x7a8f62 });
const limbGeo = new THREE.CylinderGeometry(1, 1, 1, 7), clumpGeo = new THREE.SphereGeometry(1, 9, 7);
const limb = (a, b, r) => { // (a branch from world point a to b, r thick)
  const mesh = new THREE.Mesh(limbGeo, gumBark), dir = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  mesh.scale.set(r, dir.length(), r);
  mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
};
const bearTree = (o) => {
  const tree = new THREE.Group(), H = CONFIG.dropBear.height, side = o.lat < 0 ? -1 : 1;
  const foot = {}, fork = {}, over = {};
  Track.toWorld(o.s - 3, (side < 0 ? Track.lo(o.s) : Track.hi(o.s)) + side * 3, foot);
  Track.toWorld(o.s - 1.5, (side < 0 ? Track.lo(o.s) : Track.hi(o.s)) + side * 1, fork);
  Track.toWorld(o.s, o.lat, over);
  const ground = foot.y;
  fork.y = ground + H * 0.75;
  over.y += H + 2;
  // (the trunk to a fork, a limb out from there over the road to the bear, and another on up)
  tree.add(limb({ ...foot, y: ground - 0.5 }, fork, 0.55), limb(fork, over, 0.28), limb(fork, { x: fork.x, y: ground + H + 4, z: fork.z }, 0.35));
  const clump = (at, dx, dy, dz, r) => {
    const leaves = new THREE.Mesh(clumpGeo, gumLeaves);
    leaves.position.set(at.x + dx, at.y + dy, at.z + dz);
    leaves.scale.set(r, r * 0.65, r);
    tree.add(leaves);
  };
  // (round the bear: the bottom of the leaves just over its body, so its legs and claws hang out below)
  clump(over, 0, -0.1, 0, 2.3);
  clump(over, 1.6, 0.6, 0.8, 1.8);
  clump(over, -1.4, 0.8, -0.9, 1.9);
  clump({ x: fork.x, y: ground + H + 4, z: fork.z }, 0, 0, 0, 3);
  clump({ x: (fork.x + over.x) / 2, y: (fork.y + over.y) / 2 + 1.5, z: (fork.z + over.z) / 2 }, 0, 0, 0, 2.2);
  return tree;
};
// ---- a rockfall's rocks, on the land (see CONFIG.rockfall) ----------------------------------------
// The game only knows how far through its fall a rock is (o.h, of o.up) and where on the road it lands. Where it
// waits and how it comes down are the land's, which is drawn here: so here each rock is given its way down. It
// waits ON whatever is there, o.out m off the road's edge: the land, on a level whose land climbs (on the side the
// level names if that is the uphill one, else the other); the level's own ledge, o.up m up (a quarry's bench); or,
// on flat land, a crag o.up m tall, built for it. Then it tumbles down over that ground to where it lands, in
// bounds, each lower than the last, and comes to rest on the road, a little sunk into it, a dark patch under it.
//   way: { from, to: its lat waiting and landed; ground: [m above the road's own height, at steps across] }
const cragRock = new THREE.MeshLambertMaterial({ color: 0x6f6a63, flatShading: true });
const rockWay = (o) => {
  const R = CONFIG.rockfall, N = 24, at = {};
  Track.toWorld(o.s, 0, at);
  const road = at.y, lo = Track.lo(o.s), hi = Track.hi(o.s);
  const land = (lat) => { // (the land's height over the road's, at a spot across from it)
    if (lat >= lo - 0.3 && lat <= hi + 0.3) return 0;
    Track.toWorld(o.s, lat, at);
    return landAt ? landAt(at.x, at.z) - road : 0;
  };
  const wait = (side) => side < 0 ? lo - o.out : hi + o.out;
  let side = o.side, shape = land;
  if (o.ledge && land(wait(side)) < R.hill) { // (the level's ledge: straight down off it to the road's edge)
    const from = wait(side), edge = side < 0 ? lo : hi;
    shape = (lat) => o.up * Math.max(0, Math.min(1, (lat - edge) / (from - edge)));
  } else if (land(wait(side)) < R.hill) {
    if (land(wait(-side)) >= R.hill) side = -side; // (the hillside is the other side's)
    else { // (flat land: a crag for it to wait on, its foot short of the road)
      const from = wait(side), top = o.r + 0.8, foot = Math.min(o.out - 1.5, Math.max(top + 2, o.up * 0.45));
      shape = (lat) => o.up * Math.max(0, Math.min(1, (foot - Math.abs(lat - from)) / (foot - top)));
      const geo = new THREE.CylinderGeometry(top, foot, o.up, 7, 3), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { // (roughed up, but for its top, which the rock sits on)
        if (p.getY(i) > o.up / 2 - 0.01) continue;
        const k = 1 + (Math.abs(Math.sin(i * 12.9898 + o.s) * 43758.5453) % 1 - 0.5) * 0.3;
        p.setXYZ(i, p.getX(i) * k, p.getY(i), p.getZ(i) * k);
      }
      geo.computeVertexNormals();
      const crag = place(new THREE.Mesh(geo, cragRock));
      Track.toWorld(o.s, from, at);
      crag.position.set(at.x, at.y + o.up / 2 - 0.4, at.z);
      crag.rotation.y = o.s;
    }
  }
  const from = wait(side), ground = [];
  for (let i = 0; i <= N; i++) ground.push(shape(from + (o.land - from) * i / N));
  ground[N] = 0;
  return { from, to: o.land, ground };
};
// where a rock is now: its group on the ground under it, the rock itself that high over it, in its bound
const placeRock = (o, mesh) => {
  const R = CONFIG.rockfall, way = mesh.userData.way;
  const u = o.h <= 0 ? 1 : o.fall ? Math.max(0, Math.min(1, 1 - o.h / o.up)) : 0; // (how far through its fall)
  const f = Math.min(1, u * 1.25), g = f * (way.ground.length - 1), i = Math.min(way.ground.length - 2, Math.floor(g));
  mesh.rotation.y = Track.toWorld(o.s, way.from + (way.to - way.from) * f, tmp);
  mesh.position.set(tmp.x, tmp.y + way.ground[i] + (way.ground[i + 1] - way.ground[i]) * (g - i), tmp.z);
  const hop = u < 1 ? R.hop * (1 - u) * Math.abs(Math.sin(u * Math.PI * R.bounds)) : 0;
  mesh.userData.rock.position.y = mesh.userData.rest + hop;
  mesh.userData.shade.visible = f >= 1; // (over the road: on the hillside there is no level ground to lay it on)
  mesh.userData.shade.scale.setScalar(1 / (1 + hop * 0.5));
};
const buildItems = () => {
  clearGroup(levelItems);
  for (const o of Collision.obstacles) if (o.kind === 'dropBear') place(bearTree(o));
  for (const { from, to, style } of LEVEL.bridges || []) buildBridge(from, to, style);
  obstacleMeshes = Collision.obstacles.map((o) => {
    const mesh = place(OBSTACLE_MODELS[o.kind](o));
    mesh.rotation.y = Track.toWorld(o.s, o.lat, tmp);
    mesh.position.copy(tmp);
    if (o.kind === 'rock' && !o.loose) { mesh.userData.way = rockWay(o); placeRock(o, mesh); } // (a rockfall's: a loose rock is just a rock on the road)
    return mesh;
  });
  pickupMeshes = Pickups.items.map((p) => place(makePickup(p)));
  targetMeshes = Targets.items.map((t) => place(makeTarget(t)));
};
Game.onLoad.push(buildItems);
// the level's items built afresh from its data, after a change to it (the level editor's 3D view: see render/fly.js)
export const rebuildItems = () => {
  Collision.loadLevel();
  Pickups.load();
  Targets.load();
  buildItems();
  readable(levelItems);
};
Game.onLoad.push(() => { readable(levelItems); readable(hoverMystery); readable(hoverWeight); });

export const syncPickups = (dt) => {
  for (let i = 0; i < pickupMeshes.length; i++) {
    const p = Pickups.items[i], mesh = pickupMeshes[i];
    mesh.visible = !p.taken;
    mesh.userData.gem.rotation.y += dt * 3;
    mesh.userData.gem.userData.livery?.(Player.evil); // (one that looks different by the player's side)
    if (mesh.visible) mesh.userData.gem.userData.animate?.(performance.now() / 1000 + i); // (and one that moves)
    if ((p.washed || p.pulled) && !p.taken) { // (washed up by the tide, or pulled by a magnet: wherever it is now, bobbing)
      mesh.rotation.y = Track.toWorld(p.s, p.lat, tmp);
      mesh.position.copy(tmp);
      mesh.userData.gem.position.y = 1.7 + 0.25 * Math.sin(performance.now() * 0.004 + i);
    }
  }
  const here = Track.along(Player.s);
  for (let i = 0; i < obstacleMeshes.length; i++) {
    const o = Collision.obstacles[i], mesh = obstacleMeshes[i];
    // (nothing is drawn beyond the fog: a level can have hundreds of cones)
    mesh.visible = !o.gone && Math.abs(Track.along(o.s) - here) < 700; // (well inside the fog, so nothing is seen to appear)
    if (!mesh.visible) continue;
    // follow it (most don't move, but it costs little) and face the way it is going
    mesh.rotation.y = Track.toWorld(o.s, o.lat, tmp) - o.face;
    if (o.kind === 'asteroid') {
      // the group sits on the road; the rock hangs h above (or below) it and tumbles
      mesh.position.copy(tmp);
      mesh.userData.rock.position.y = o.h;
      mesh.userData.rock.rotation.x += dt * o.spin;
      mesh.userData.rock.rotation.z += dt * o.spin * 0.6;
    } else { // (a mine bobbing on the swell, each in its own time)
      mesh.position.set(tmp.x, tmp.y + o.h + (mesh.userData.bob ? Math.sin(performance.now() / 1000 * 2.2 + i) * 0.06 : 0), tmp.z);
    }
    if (o.roll && mesh.userData.roller) mesh.userData.roller.rotation.z = -o.roll.dir * (o.spun || 0); // (a pipe rolling across)
    if (o.kind === 'rock' && !o.loose) { // (tumbling down the hillside: over the land, not the game's own straight drop)
      mesh.userData.rock.rotation.x = o.spin || 0;
      placeRock(o, mesh);
    }
    if (o.ride) mesh.userData.animate(o.ride.on ? o.ride.t : 0); // (a cyclist pedalling)
    if (o.run && mesh.userData.animate) mesh.userData.animate(o.run.t || 0); // (a marathon runner running)
    if (mesh.userData.beacons) { // (a wide load's escort: its beacons flash while it is moving over to block)
      const load = Hazards.loads.find(w => w.escort === o);
      mesh.userData.beacons.color.setHex(load && Hazards.blocking(load) && Math.floor(performance.now() / 180) % 2 ? 0xffb020 : 0x4a3a1a);
    }
    if (mesh.userData.arrows) { // (a wide load's arrow board: the side to pass it on, flashing as that side is about to shut)
      const load = Hazards.loads.find(w => w.load === o), sign = load ? Hazards.loadSignal(load) : { side: 0 };
      const lit = !sign.closing || Math.floor(performance.now() / 120) % 2;
      mesh.userData.arrows.forEach((arrow) => { arrow.group.visible = sign.side === arrow.side && !!lit; });
      mesh.userData.cross.visible = sign.side === 0 && !!load?.on;
    }
    if (o.kind === 'landmine') { // (its light flashing, each in its own time)
      const F = CONFIG.battle.mineFlash, lit = ((performance.now() / 1000 / F.period + o.phase) % 1) < F.on;
      mesh.userData.light.color.setHex(lit ? 0xff2a1a : 0x3a0e0a);
      mesh.userData.halo.material.opacity = lit ? 0.55 : 0;
      mesh.visible = !o.buried; // (buried until the player is near, then popping up: see CONFIG.battle.mineRise)
      const up = 1 - (1 - o.rise) * (1 - o.rise);
      mesh.position.y = tmp.y - 0.5 * (1 - up) + Math.sin(up * Math.PI) * 0.25;
    }
    if (o.camera !== undefined) mesh.userData.lamp.color.setHex(SpeedCameras.list[o.camera]?.flash > 0 ? 0xffffff : 0x555a60); // (a speed camera flashing)
    if (o.drift && mesh.userData.roller) { // a bale on the move rolls the way it is going
      const last = mesh.userData.last || (mesh.userData.last = { s: o.s, lat: o.lat });
      mesh.userData.roller.rotation.x += Math.hypot(o.s - last.s, o.lat - last.lat) / (o.height / 2);
      last.s = o.s;
      last.lat = o.lat;
    }
  }
  // ghost: the whole car turns pale and see-through (see ghostify), flickering as it runs out
  const ghostly = powerShown(Player.ghost) && !Delivery.on; // (not while it sets the cargo down at the kerb: a ghost only so the traffic drives through it)
  const livery = Player.evil ? CAR.evilColor : CAR.color; // each car has a livery per side
  if (shownCar !== CAR) { // a different car (the garage's, or a level's own): take its shape
    shapeCarMesh(carMesh, CAR);
    shownCar = CAR;
  }
  const tank = Player.tank > 0;
  // a UFO hovers, bobbing, with its ring of lights turning
  const ufo = !!CAR.ufo && !tank;
  ufoMesh.visible = ufo;
  if (ufo) {
    ufoMesh.position.y = 1.0 + Math.sin(performance.now() / 300) * 0.15;
    ufoMesh.userData.lamps.rotation.y += dt * 4;
    paintOf(ufoMesh.userData.body).color.setHex(livery);
  }
  // (on an amphibious level the rage is in the Amphibious Tank, in its own livery for each side: Player.rageTank)
  const amphibian = tank ? Player.rageTank : null;
  tankMesh.visible = tank && !amphibian;
  amphibiousTankMesh.visible = !!amphibian;
  if (amphibian) {
    paintOf(amphibiousTankMesh.userData.body).color.setHex(Player.evil ? amphibian.evilColor : amphibian.color);
    amphibiousTankMesh.userData.livery(Player.evil);
    amphibiousTankMesh.userData.animate(performance.now() / 1000, Player.afloat && Player.active);
  }
  // the garage's Tank wears its own liveries; a car in TANK RAGE turns army olive
  paintOf(tankMesh.userData.body).color.setHex(!CAR.tank ? TANK_OLIVE : livery);
  paintOf(carMesh.userData.body).color.setHex(livery);
  // a damaged car looks it: its panels crumple in steps and its paint is scorched (see dents.js; not a tank, nor a UFO)
  const worn = Player.active ? damageShare(Player) : 0;
  dentModel(carMesh, carMesh.userData.body, worn);
  scorch(paintOf(carMesh.userData.body).color, worn);
  // a car with an animated model of its own shows that in place of the standard box car,
  // and its animation runs for as long as it is on screen
  const custom = CAR.model && !tank ? playerModel(CAR) : null;
  for (const id in playerModels) playerModels[id].visible = playerModels[id] === custom;
  if (custom) {
    custom.userData.animate(performance.now() / 1000);
    paintOf(custom.userData.body).color.setHex(livery);
    dentModel(custom, custom.userData.body, worn);
    scorch(paintOf(custom.userData.body).color, worn);
    custom.userData.livery?.(Player.evil);
    custom.userData.aim?.(Player.turret || 0); // (the 8x8's gun, turned to its target: see Packages)
  }
  const standard = !tank && !ufo && !custom;
  carMesh.userData.body.visible = carMesh.userData.cabin.visible = standard;
  for (const part of [...carMesh.userData.lights, ...carMesh.userData.trim]) part.visible = standard;
  passengerMesh.visible = powerShown(Player.passenger) && !tank && !ufo;
  passengerMesh.position.y = Player.height; // (sat on the roof, its shins down through the sunroof)
  // brake lights on any car-shaped car (not a tank or a UFO)
  syncLamps(carMesh, Player, !tank && !ufo, Player.active && Player.brakeLight, 0, false);
  ghostify(carMesh, ghostly);
  const t = performance.now() / 1000;
  // (the signs over the car don't spin: they face back down the road, at the camera following the car)
  const facing = carMesh.rotation.y + Math.PI;
  hoverGhost.visible = powerShown(Player.ghost) && Player.active && !Game.screensaver && !Delivery.on;
  if (hoverGhost.visible) { // bobbing over the car, swaying a little
    hoverGhost.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.6 + Math.sin(t * 2.6) * 0.25, carMesh.position.z);
    hoverGhost.rotation.y = facing + Math.sin(t * 1.7) * 0.35;
  }
  hoverMystery.visible = !!Player.mystery && powerShown(Player.mysteryTime) && Player.active && !Game.screensaver;
  if (hoverMystery.visible) { // bobbing over the car, facing the camera
    hoverMystery.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.4 + Math.sin(t * 2.6) * 0.2, carMesh.position.z);
    hoverMystery.rotation.y = facing;
  }
  hoverRadar.visible = powerShown(Player.radar) && Player.active && !Game.screensaver;
  if (hoverRadar.visible) { // bobbing over the car, facing the camera
    hoverRadar.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.3 + Math.sin(t * 2.6) * 0.2, carMesh.position.z);
    hoverRadar.rotation.y = facing;
  }
  hoverTurbo.visible = powerShown(Player.turbo) && Player.active && !Game.screensaver;
  if (hoverTurbo.visible) { // bobbing over the car, facing the camera
    hoverTurbo.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.3 + Math.sin(t * 2.6) * 0.2, carMesh.position.z);
    hoverTurbo.rotation.y = facing;
  }
  hoverSplash.userData.livery(Player.evil);
  hoverSplash.userData.animate?.(t);
  for (const [hover, left] of [[hoverGas, Player.badGas], [hoverWeight, Player.heavy], [hoverArmour, Player.armour],
    [hoverSplash, Player.bigSplash], [hoverButter, Player.butterfingers]]) {
    hover.visible = powerShown(left) && Player.active && !Game.screensaver;
    if (hover.visible) { // bobbing over the car, facing the camera
      hover.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.3 + Math.sin(t * 2.6) * 0.2, carMesh.position.z);
      hover.rotation.y = facing;
    }
  }
  roofSiren.visible = powerShown(Player.siren) && Player.active && !Game.screensaver;
  if (roofSiren.visible) { // on the roof, facing the way the car does, red and blue by turns
    roofSiren.position.set(carMesh.position.x, carMesh.position.y + Player.height + 0.25, carMesh.position.z);
    roofSiren.rotation.y = carMesh.rotation.y;
    const flash = Math.floor(t * 6) % 2 === 0;
    roofSiren.userData.red.visible = flash;
    roofSiren.userData.blue.visible = !flash;
  }
  // a boat's wake: white water churned up behind it, the more the faster it goes
  if (Player.active && CAR.wake && Player.speed > 3) {
    const h = Track.toWorld(Player.s - Player.hl, Player.lat, tmp);
    for (let n = 0; n < 2; n++) {
      Particles.emit(tmp.x + rnd(0.6), tmp.y + 0.05, tmp.z + rnd(0.6), // (life, size, grow, gravity: a fine spray that falls back)
        Math.sin(h) * Player.speed * 0.15 + rnd(1.2), 1 + Math.random() * 1.5, Math.cos(h) * Player.speed * 0.15 + rnd(1.2),
        0.45 + Math.random() * 0.3, 0.16, 0.8, 6, Math.random() < 0.6 ? 0xffffff : 0xcfe9f2, tmp.y);
    }
  }
  // (and the wakes of the boats in the traffic, those near enough to see)
  for (const car of Traffic.cars) {
    if (!car.active || !CONFIG.vehicles[car.kind]?.boat || Math.abs(car.vs) < 3 || Math.abs(car.s - Player.s) > 220) continue;
    const h = Track.toWorld(car.s - car.hl * car.dir, car.lat, tmp);
    Particles.emit(tmp.x + rnd(car.hw * 0.6), tmp.y + 0.05, tmp.z + rnd(car.hw * 0.6),
      Math.sin(h) * car.vs * 0.15 + rnd(1.2), 1 + Math.random() * 1.5, Math.cos(h) * car.vs * 0.15 + rnd(1.2),
      0.45 + Math.random() * 0.3, 0.16, 0.8, 6, Math.random() < 0.6 ? 0xffffff : 0xcfe9f2, tmp.y);
  }
  // turbo exhaust
  if (Player.active && powerShown(Player.turbo)) {
    const h = Track.toWorld(Player.s - Player.hl, Player.lat, tmp);
    for (let n = 0; n < 2; n++) {
      Particles.emit(tmp.x + rnd(0.5), tmp.y + 0.6, tmp.z + rnd(0.5),
        Math.sin(h) * Player.speed * 0.5 + rnd(1), Math.random(), Math.cos(h) * Player.speed * 0.5 + rnd(1),
        0.3, 0.5, 0.5, 0, Math.random() < 0.5 ? TURBO_COLOR : 0xffffff);
    }
  }
};

export const syncTargets = (dt) => {
  const pulse = 1 + Math.sin(performance.now() / 180) * 0.15;
  for (let i = 0; i < targetMeshes.length; i++) {
    const mesh = targetMeshes[i];
    mesh.visible = !Targets.items[i].used;
    mesh.userData.ring.rotation.y += dt * 3;
    mesh.userData.glow.scale.setScalar(pulse);
  }
};

// ---- the tank the player's car turns into during TANK RAGE --------------------------------
const TANK_OLIVE = 0x4b5a2a;
const tankMesh = makeTankMesh(TANK_OLIVE);
tankMesh.visible = false;
carMesh.add(tankMesh);
// ...and the one it turns into on an amphibious level (cars.js AMPHIBIOUS_TANK)
const amphibiousTankMesh = makeAmphibiousTankMesh(AMPHIBIOUS_TANK.color);
amphibiousTankMesh.visible = false;
carMesh.add(amphibiousTankMesh);
