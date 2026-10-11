// ---- WRECKAGE: the scripted destruction (its timing and the damage: ../wreckage.js) ----------------
// Each piece of wreckage, built to fit the lanes it lands across: a heap of boulders flung from a quarry, a jackknifed fuel tanker, the
// control tower's shaft with its glass cab, a stack of shipping containers, a hangar's steel roof,
// an airliner's broken fuselage. Set off, it flies in tumbling from where it went up (an airliner
// comes down out of the sky), while the lanes it is about to land on flash red; landed, it burns.
// An airliner comes in low, nose down, touches down in a fireball and slides towards the player in a
// shower of sparks; its path flashes red from the moment it is set off. The control tower stands
// beside the road where the route turns off onto the runway, the old road carrying on past it,
// and comes crashing down across that road. Parked airliners stand about the apron.
// A building that blows (a blast) stands by the road; its red box flashes on the road beside it,
// then it goes up, slumps into a burning ruin, and burns on. A quarry's blast (rock: true) is a crag of
// the rock face instead: a flash of the charges, then rock and dust thrown out across the road, the
// crag slumping into a heap of rubble under a pall of dust.
// Also the fires burning out across the airfield, each sending up a column of black smoke.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Wreckage } from '../wreckage.js';
import { scene, tmp } from './scene.js';
import { Fire, Smoke, Particles, rnd, FIRE_COLORS } from './effects.js';
import { lambert, CHAR, STEEL, WHITE, GLASS, add, box, across, makeAirliner, makeTower } from './airportModels.js';
export { makeAirliner }; // (as before)


// each kind of wreckage, w m across the road (local x) and d m along it (local z), resting on y = 0
const MODELS = {
  tanker: (w, d) => {
    const g = new THREE.Group();
    add(g, across(1.25, 1.25, w * 0.72), lambert(0xd8dadc), -w * 0.12, 1.55, 0);
    add(g, across(1.27, 1.27, w * 0.06), lambert(0xe0702a), -w * 0.12, 1.55, 0);          // (its stripe)
    add(g, box(w * 0.72, 0.4, 2.2), CHAR, -w * 0.12, 0.35, 0);                             // chassis
    add(g, box(w * 0.18, 2.6, 2.4), lambert(0xb3261e), w * 0.38, 1.4, 0.2, 0, 0.5, 0.15);  // the cab, twisted round
    for (let k = 0; k < 4; k++) add(g, box(0.5, 1.0, 1.0), CHAR, -w * 0.4 + k * w * 0.2, 0.5, k % 2 ? 1.1 : -1.1);
    return g;
  },
  tower: (w, d) => {
    const g = new THREE.Group();
    add(g, across(1.5, 1.8, w * 0.8), lambert(0xc9c6bd), -w * 0.1, 1.7, 0);              // the shaft
    add(g, new THREE.CylinderGeometry(3.2, 2.6, 3, 8), GLASS, w * 0.38, 2.4, 0, 0, 0, 1.3); // its cab, fallen on its side
    add(g, new THREE.CylinderGeometry(3.4, 3.4, 0.4, 8), STEEL, w * 0.38 + 1.6, 2.4, 0, 0, 0, 1.3);
    for (let k = 0; k < 6; k++) add(g, box(1 + Math.random() * 1.5, 0.8, 1 + Math.random()), lambert(0xa8a49a), rnd(w / 2), 0.4, rnd(d / 2), 0, Math.random() * 3, 0);
    return g;
  },
  containers: (w, d) => {
    const g = new THREE.Group(), colours = [0xb8322a, 0x1f5fa8, 0x2f8a4a, 0xe08a1e, 0x6c6f75];
    for (let x = -w / 2 + 1.3; x < w / 2; x += 2.7) {
      for (let y = 0; y < 2 + (Math.random() < 0.5 ? 1 : 0); y++) {
        add(g, box(2.5, 2.5, d * (0.7 + Math.random() * 0.3)), lambert(colours[Math.floor(Math.random() * colours.length)]),
          x + rnd(0.3), 1.25 + y * 2.5, rnd(0.6), 0, rnd(0.25), rnd(0.08));
      }
    }
    return g;
  },
  hangar: (w, d) => {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) add(g, box(w * (0.7 + Math.random() * 0.4), 0.5, 0.4), STEEL, rnd(1), 0.4 + k * 0.6, rnd(d / 2), rnd(0.15), rnd(0.5), rnd(0.25)); // girders
    for (let k = 0; k < 4; k++) add(g, box(w * 0.35, 0.12, d * 0.8), lambert(0x9aa0a4), -w / 2 + w * 0.25 * (k + 0.5), 1.2 + Math.random(), 0, rnd(0.4), 0, rnd(0.6)); // roof panels
    return g;
  },
  // (a blast's building, standing beside the road: an office block, its windows in bands)
  blast: () => {
    const g = new THREE.Group();
    add(g, box(16, 14, 26), lambert(0xb9b2a6), 0, 7, 0);
    for (let y = 2.5; y < 13; y += 3.5) add(g, box(16.2, 1.4, 26.2), lambert(0x2f3e4a), 0, y, 0);
    add(g, box(16.4, 0.8, 26.4), STEEL, 0, 14.4, 0);
    return g;
  },
  // (a quarry's blast: a crag jutting out of the rock face, banded rock, drilled for the charges)
  rockBlast: () => {
    const g = new THREE.Group(), tones = [0x8a8378, 0xa39a8a, 0x6f6a62, 0x9a8f7c];
    for (let k = 0; k < 9; k++) {
      const r = 4 + Math.random() * 4, rock = add(g, new THREE.DodecahedronGeometry(r, 0), lambert(tones[k % tones.length]),
        rnd(5), r * 0.7 + (k % 3) * 3.5, rnd(11), Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.scale.set(1, 0.8 + Math.random() * 0.5, 1.1);
    }
    for (let k = 0; k < 6; k++) add(g, box(0.25, 0.25, 0.25), lambert(0xd8342a), -6.5, 2 + k * 1.6, rnd(9)); // the charges' red tags
    return g;
  },
  // a road train jackknifed across its lanes: the prime mover at the right of them, its two trailers swung round
  // behind it, right across. userData.swing(u): 0 = running straight, 1 = folded up across the road
  roadtrain: (w, d) => {
    const g = new THREE.Group(), red = lambert(0xb3261e), tilt = lambert(0xd8dadc), dark = lambert(0x23252a);
    const L = Math.max(5, w * 0.62); // (each trailer's length)
    add(g, box(2.4, 2.8, 3.2), red, -w / 2 + 1.3, 1.7, d / 2 - 1.6);   // the prime mover (local +x is to the left)
    add(g, box(2.2, 0.9, 0.1), dark, -w / 2 + 1.3, 2.3, d / 2 + 0.02);
    const hitch = (parent, x, z) => { const p = new THREE.Group(); p.position.set(x, 0, z); parent.add(p); return p; };
    const trailer = (pivot, colour) => {
      add(pivot, box(2.5, 2.9, L), colour, 0, 2.05, -L / 2 - 0.3);
      add(pivot, box(2.3, 0.5, L * 0.9), dark, 0, 0.55, -L / 2 - 0.3);
      for (const z of [-L * 0.75, -L * 0.9]) add(pivot, box(2.6, 0.9, 0.9), dark, 0, 0.45, z);
    };
    const first = hitch(g, -w / 2 + 1.3, d / 2 - 3.2), second = hitch(first, 0, -L - 0.6);
    trailer(first, tilt);
    trailer(second, lambert(0x2f6fa8));
    g.userData.swing = (u) => { const e = u * u * (3 - 2 * u); first.rotation.y = -e * 1.25; second.rotation.y = e * 1.9; };
    return g;
  },
  // (boulders flung out of a quarry face by its blasting: a heap of them, right across their lanes)
  boulders: (w, d) => {
    const g = new THREE.Group(), tones = [0x5f5a52, 0x6f6a62, 0x4f4b45, 0x7a7266]; // (darker than the dust they raise)
    for (let x = -w / 2 + 1.2; x < w / 2; x += 2.2) {
      for (let k = 0; k < 2; k++) {
        const r = 1.3 + Math.random() * 0.8, rock = add(g, new THREE.DodecahedronGeometry(r, 0), lambert(tones[Math.floor(Math.random() * 4)]),
          x + rnd(0.4), r * 0.7, rnd(d / 2 - r), Math.random() * 3, Math.random() * 3, Math.random() * 3); // (each ON the road, a little sunk: the second of a pair was 0.6 m up, on nothing wherever it fell clear of the first)
        rock.scale.set(1, 0.85, 1);
      }
    }
    return g;
  },
  plane: (w, d) => {
    const g = new THREE.Group();
    add(g, across(2.0, 2.0, w * 0.85, 16), WHITE, 0, 2.0, 0);                                // the fuselage...
    add(g, across(2.02, 2.02, w * 0.85, 16), lambert(0x1d4f9c), 0, 2.5, 0).scale.set(1, 0.18, 1.0); // ...its stripe
    add(g, new THREE.SphereGeometry(2, 14, 10), WHITE, w * 0.42, 2.0, 0).scale.set(1.6, 1, 1); // nose
    add(g, box(3.5, 0.4, d * 1.6), WHITE, -w * 0.05, 1.0, d * 0.4, 0, 0.3, 0.1);              // a wing, broken off
    add(g, across(0.8, 0.8, 2.5), STEEL, -w * 0.05, 0.5, d * 0.7);                           // its engine
    add(g, box(2.8, 4, 0.4), lambert(0x1d4f9c), -w * 0.4, 4.8, 0, 0, 0, 0.3);                // the tail fin
    add(g, box(w * 0.2, 2.5, 4.2), CHAR, rnd(w / 4), 2.0, 0);                                 // (burnt through)
    return g;
  },
};


const group = new THREE.Group();
scene.add(group);
let tower = null, towerPivot = null, towerBase = null; // (and the old road it falls across: see buildStub)
const towerState = { went: false, down: false }; // (its fireballs, each set off once)
// the old road carrying straight on where the route turns off (to the runway), T.stub m of it: its
// surface, and an edge line down each side; and the tower beside it
const buildStub = (T) => {
  const h = Track.toWorld(T.at, 0, tmp), fx = Math.sin(h), fz = Math.cos(h);
  const lo = Track.lo(T.at), hi = Track.hi(T.at), at = (d, lat) => {
    Track.toWorld(T.at, lat, tmp);
    return [tmp.x + fx * d, tmp.y, tmp.z + fz * d];
  };
  const strip = (lat0, lat1, y, colour) => {
    const p = [...at(0, lat0), ...at(0, lat1), ...at(T.stub, lat0), ...at(T.stub, lat1)];
    for (let k = 1; k < 12; k += 3) p[k] += y;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex([0, 1, 2, 1, 3, 2]);
    group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide })));
  };
  strip(lo, hi, -0.01, 0x45484d);
  for (const lat of [Track.laneLo(T.at), Track.laneHi(T.at)]) strip(lat - 0.1, lat + 0.1, 0.0, 0xf2f2f2);
  // the tower, on the right of it, T.distance m along it: it falls to the left, right across it
  const base = at(T.distance, hi + 14);
  towerPivot = new THREE.Group();
  towerPivot.position.set(base[0], base[1], base[2]);
  towerPivot.rotation.y = h;
  tower = makeTower();
  tower.scale.setScalar(CONFIG.wreckage.towerScale);
  towerPivot.add(tower);
  towerBase = base;
  group.add(towerPivot);
};
let pieces = []; // { mesh, marker, spin } for each of Wreckage.list, in order
const fires = []; // { s, lat, size }: the fires burning across the airfield
Game.onLoad.push(() => {
  group.clear();
  pieces = [];
  fires.length = 0;
  tower = towerPivot = towerBase = null;
  if (LEVEL.tower) buildStub(LEVEL.tower);
  for (const e of LEVEL.wreckage || []) {
    const W = CONFIG.wreckage, LW = CONFIG.laneWidth, depth = W.kinds[e.kind].depth;
    const w = (e.lanes[1] - e.lanes[0] + 1) * LW - 0.4 + (e.kind === 'blast' ? CONFIG.shoulder + 0.2 : 0); // (a blast's box: out to the road's edge)
    const mesh = e.kind === 'airliner' ? makeAirliner(w, depth, true) : e.kind === 'blast' && e.rock ? MODELS.rockBlast() : MODELS[e.kind](w, depth);
    mesh.visible = false;
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(w, depth + 4 + (e.slide || 0)).rotateX(-Math.PI / 2), // (an airliner's: the whole of its slide)
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.5, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 })); // (over the runway's concrete and paint too)
    marker.visible = false;
    group.add(mesh, marker);
    pieces.push({ mesh, marker, spin: { x: rnd(2), y: rnd(3), z: rnd(2) } });
  }
  for (const p of LEVEL.parkedPlanes || []) { // airliners parked on the apron, on the left
    const plane = makeAirliner(30, 36, false), h = Track.toWorld(p.s, Track.lo(p.s) - p.d, tmp);
    plane.position.copy(tmp);
    plane.rotation.y = h + (p.turn || 0);
    group.add(plane);
  }
  if (LEVEL.theme === 'airport') { // (wrecks burning out on the airfield, on both sides)
    for (let s = 150; s < Track.length; s += 260 + Math.random() * 200) {
      const side = Math.random() < 0.5 ? -1 : 1;
      fires.push({ s, lat: side < 0 ? Track.lo(s) - 60 - Math.random() * 150 : Track.hi(s) + 60 + Math.random() * 150, size: 1 + Math.random() });
    }
  }
});

const target = new THREE.Vector3(), from = new THREE.Vector3();
const blown = new Set(); // (the blasts whose fire has burst out of their building, this run)
export const syncWreckage = (now) => {
  const W = CONFIG.wreckage;
  Wreckage.list.forEach((e, i) => {
    const { mesh, marker, spin } = pieces[i] || {};
    if (!mesh) return;
    mesh.visible = (e.t >= 0 || e.kind === 'blast') && !e.cleared; // (a building that blows stands there from the start; cleared by a Tow Truck, it is gone)
    if (e.cleared) { marker.visible = false; return; }
    const coming = e.slide ? !e.landed || e.sliding : !e.landed;
    marker.visible = e.t >= 0 && coming && Math.floor(now / 120) % 2 === 0; // (flashing where it will come down)
    if (e.kind === 'blast') { // the building: standing beside the road; then blown out, slumped into a burning ruin
      const from = Wreckage.source(e), bh = Track.toWorld(from.s, from.lat, tmp), side = e.from === 'left' ? -1 : 1;
      mesh.position.copy(tmp);
      mesh.rotation.set(0, bh, 0);
      const W = CONFIG.wreckage, down = e.landed ? Math.min(1, (e.t - W.blastWarn) / 1.2) : 0;
      mesh.scale.set(1, 1 - 0.7 * down * down, 1);
      if (e.t >= 0) {
        marker.rotation.y = Track.toWorld(e.at, (e.lat0 + e.lat1) / 2, target);
        marker.position.set(target.x, target.y + 0.06, target.z);
      }
      // the moment it blows: fire bursting out of its whole front, towards the road (a quarry's: the charges'
      // flash, then rock and dust thrown out across the road)
      if (e.landed && !blown.has(e) && e.rock) {
        blown.add(e);
        const toRoad = -side, rx = -Math.cos(bh) * toRoad, rz = Math.sin(bh) * toRoad;
        for (let k = 0; k < 40; k++) {
          Track.toWorld(from.s + rnd(10), from.lat - side * 6, target);
          Fire.emit(target.x, target.y + 2 + Math.random() * 10, target.z, rx * 6 + rnd(3), 2 + Math.random() * 3, rz * 6 + rnd(3),
            0.25 + Math.random() * 0.25, 1.5 + Math.random(), 1.5, 0, FIRE_COLORS[Math.floor(Math.random() * 2)]);
        }
        for (let k = 0; k < 140; k++) {
          Track.toWorld(from.s + rnd(10), from.lat - side * 6, target);
          const v = 10 + Math.random() * 16, tone = [0x8a8378, 0xa39a8a, 0x6f6a62, 0xb8ae9a][k % 4];
          Particles.emit(target.x, target.y + 1 + Math.random() * 10, target.z, rx * v + rnd(4), 3 + Math.random() * 6, rz * v + rnd(4),
            1.5 + Math.random() * 1.5, 0.3 + Math.random() * 0.6, 0, 18, tone, target.y);
          if (k % 2) Smoke.emit(target.x, target.y + 2 + Math.random() * 8, target.z, rx * v * 0.4 + rnd(2), 1 + Math.random() * 2, rz * v * 0.4 + rnd(2),
            3 + Math.random() * 2, 2.5 + Math.random() * 2, 2.5, 0, 0xc9bfa8);
        }
      }
      if (e.landed && !blown.has(e)) {
        blown.add(e);
        const toRoad = -side, rx = -Math.cos(bh) * toRoad, rz = Math.sin(bh) * toRoad; // (in the world: from it towards the road)
        for (let k = 0; k < 160; k++) {
          Track.toWorld(from.s + rnd(12), from.lat - side * 8, target);
          const v = 12 + Math.random() * 18;
          Fire.emit(target.x, target.y + 1 + Math.random() * 12, target.z, rx * v + rnd(3), 1 + Math.random() * 4, rz * v + rnd(3),
            0.5 + Math.random() * 0.6, 1 + Math.random() * 1.5, 1.2, 2, FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
        }
      }
      if (e.t < 0 && blown.has(e)) blown.delete(e); // (a new run)
      if (e.rock) { // (a pall of dust hanging over the rubble)
        if (e.landed && Math.abs(e.at - Player.s) < 300 && Math.random() < 0.4) {
          Smoke.emit(tmp.x + rnd(8), tmp.y + 3 + Math.random() * 4, tmp.z + rnd(8), rnd(1), 1 + Math.random() * 1.5, rnd(1), 4, 3 + Math.random() * 2, 2, 0, 0xc9bfa8);
        }
        return;
      }
      if (e.landed && Math.abs(e.at - Player.s) < 300 && Math.random() < 0.6) { // (and burns on)
        Fire.emit(tmp.x + rnd(7), tmp.y + 4 + Math.random() * 3, tmp.z + rnd(7), rnd(1), 2 + Math.random() * 3, rnd(1),
          0.6 + Math.random() * 0.5, 1 + Math.random(), 1, 0, FIRE_COLORS[1 + Math.floor(Math.random() * 3)]);
        const grey = 25 + Math.floor(Math.random() * 30);
        Smoke.emit(tmp.x + rnd(5), tmp.y + 7, tmp.z + rnd(5), rnd(1), 3 + Math.random() * 3, rnd(1), 3, 2 + Math.random(), 2, 0, grey << 16 | grey << 8 | grey);
      }
      return;
    }
    if (e.t < 0) { blown.delete(e); return; } // (a new run: see the boulders' landing)
    const mid = e.at + (e.slide || 0) / 2, mlat = (e.lat0 + e.lat1) / 2;
    marker.rotation.y = Track.toWorld(mid, mlat, tmp);
    marker.position.set(tmp.x, tmp.y + 0.06, tmp.z);
    if (e.slide) { // an airliner: diving in nose down, then sliding, nose first, at the player
      const at = Wreckage.airliner(e, e.t), heading = Track.toWorld(at.s, mlat, tmp);
      mesh.position.set(tmp.x, tmp.y + at.h, tmp.z);
      mesh.rotation.set(at.h > 0 ? -0.12 : 0, heading + Math.PI, at.sliding ? 0.06 * Math.sin(now / 90) : 0);
      if (at.sliding || (e.landed && Math.abs(e.at - Player.s) < 300 && Math.random() < 0.6)) { // sparks as it slides, fire once it stops
        for (let k = 0; k < (at.sliding ? 6 : 1); k++) {
          Track.toWorld(at.s + rnd(e.depth / 2), mlat + rnd(2), tmp);
          Fire.emit(tmp.x, tmp.y + 0.3 + (at.sliding ? 0 : 2), tmp.z, rnd(4), 2 + Math.random() * 4, rnd(4),
            0.4 + Math.random() * 0.4, at.sliding ? 0.3 : 1.2, at.sliding ? 0 : 1, at.sliding ? 12 : 0, FIRE_COLORS[Math.floor(Math.random() * 3)]);
        }
      }
      return;
    }
    const heading = Track.toWorld(e.at, mlat, target);
    const u = Math.min(1, e.t / W.flight), src = Wreckage.source(e);
    if (e.kind === 'roadtrain') { // (no flying in: it is there, braking, its trailers swinging round across the lanes)
      mesh.position.copy(target);
      mesh.rotation.set(0, heading, 0);
      mesh.userData.swing(u);
      if (u < 1 && Math.abs(e.at - Player.s) < 300) { // (tyre smoke as they go)
        Track.toWorld(e.at + rnd(e.depth / 2), e.lat0 + Math.random() * (e.lat1 - e.lat0), tmp);
        Smoke.emit(tmp.x, tmp.y + 0.3, tmp.z, rnd(2), 1 + Math.random() * 2, rnd(2), 1.5, 1 + Math.random(), 2, 0, 0xd8d8d8);
      }
      return;
    }
    Track.toWorld(src.s, src.lat, from);
    const sky = e.from === 'sky', y0 = sky ? 70 : 6, arc = sky ? 0 : 18;
    mesh.position.lerpVectors(from, target, u * u * (sky ? 1 : 0.4) + u * (sky ? 0 : 0.6)); // (falling faster as it comes; an airliner diving)
    mesh.position.y = target.y + y0 * (1 - u) + arc * Math.sin(Math.PI * u);
    const tumble = 1 - u;
    mesh.rotation.set(spin.x * tumble, heading + spin.y * tumble, spin.z * tumble);
    // landed, it burns (only near the player: the fog hides the rest); boulders only raise dust
    if (e.kind === 'boulders') {
      if (e.landed && !blown.has(e)) { // (landing: a burst of dust and chips of stone)
        blown.add(e);
        for (let k = 0; k < 30; k++) {
          Track.toWorld(e.at + rnd(e.depth / 2), e.lat0 + Math.random() * (e.lat1 - e.lat0), tmp);
          Smoke.emit(tmp.x, tmp.y + 0.5, tmp.z, rnd(4), 1 + Math.random() * 3, rnd(4), 2 + Math.random() * 2, 2 + Math.random() * 2, 2.5, 0, 0xc9bfa8);
          Particles.emit(tmp.x, tmp.y + 1, tmp.z, rnd(6), 3 + Math.random() * 5, rnd(6), 1.2, 0.2 + Math.random() * 0.3, 0, 18, 0x8a8378, tmp.y);
        }
      }
      if (e.landed && e.t > W.flight + 3 && Math.abs(e.at - Player.s) < 300 && Math.random() < 0.05) { // (a wisp now and then)
        Track.toWorld(e.at + rnd(2), e.lat0 + Math.random() * (e.lat1 - e.lat0), tmp);
        Smoke.emit(tmp.x, tmp.y + 1, tmp.z, rnd(1), 0.6 + Math.random() * 0.6, rnd(1), 2, 0.8 + Math.random() * 0.6, 1.5, 0, 0xc9bfa8);
      }
      return;
    }
    if (e.landed && Math.abs(e.at - Player.s) < 300 && Math.random() < 0.7) {
      Track.toWorld(e.at + rnd(2), e.lat0 + Math.random() * (e.lat1 - e.lat0), tmp);
      Fire.emit(tmp.x, tmp.y + 1 + Math.random() * 2, tmp.z, rnd(1), 2 + Math.random() * 3, rnd(1),
        0.5 + Math.random() * 0.5, 0.6 + Math.random() * 0.8, 1, 0, FIRE_COLORS[1 + Math.floor(Math.random() * 3)]);
      if (Math.random() < 0.5) {
        const grey = 25 + Math.floor(Math.random() * 30);
        Smoke.emit(tmp.x, tmp.y + 3, tmp.z, rnd(1), 3 + Math.random() * 3, rnd(1), 2.5, 1.5 + Math.random(), 2, 0, grey << 16 | grey << 8 | grey);
      }
    }
  });
  // the control tower: standing, until it goes; then toppling over, faster and faster, onto the old road
  const T = Wreckage.tower;
  if (towerPivot && T) {
    const u = T.t < 0 ? 0 : Math.min(1, T.t / CONFIG.wreckage.towerFall);
    tower.rotation.z = -(Math.PI / 2 - 0.04) * u * u;
    // a fireball at its foot as it goes, and all along it as it comes down
    const h = Track.toWorld(T.at, 0, tmp), lx = Math.cos(h), lz = -Math.sin(h);
    const burst = (count, along) => {
      for (let k = 0; k < count; k++) {
        const d = Math.random() * along;
        Fire.emit(towerBase[0] + lx * d + rnd(3), 2 + Math.random() * 4, towerBase[2] + lz * d + rnd(3), rnd(8), 4 + Math.random() * 10, rnd(8),
          0.6 + Math.random() * 0.8, 2 + Math.random() * 2.5, 1.2, 6, FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
      }
    };
    if (T.t >= 0 && !towerState.went) { towerState.went = true; burst(120, 6); }
    if (T.down && !towerState.down) { towerState.down = true; burst(300, 55 * CONFIG.wreckage.towerScale); }
    if (T.t < 0) towerState.went = towerState.down = false; // (a new run)
    if (T.down && T.t < CONFIG.wreckage.towerFall + 3 && Math.random() < 0.8) { // (a cloud of dust where it came down)
      const h = Track.toWorld(T.at, 0, tmp), lx = Math.cos(h), lz = -Math.sin(h), d = Math.random() * 55 * CONFIG.wreckage.towerScale; // (along it, to its left)
      Smoke.emit(towerBase[0] + lx * d + rnd(3), 1 + Math.random() * 3, towerBase[2] + lz * d + rnd(3), rnd(3), 2 + Math.random() * 3, rnd(3),
        3, 3 + Math.random() * 2, 2, 0, 0x8a8076);
    }
  }
  // the fires out on the airfield: flames, and a column of black smoke
  for (const f of fires) {
    if (Math.abs(f.s - Player.s) > 450 || Math.random() > 0.35) continue;
    Track.toWorld(f.s + rnd(4), f.lat + rnd(4), tmp);
    Fire.emit(tmp.x, 1 + Math.random() * 2, tmp.z, rnd(1), 3 + Math.random() * 3, rnd(1), 0.6, 1.5 * f.size, 1, 0, FIRE_COLORS[1 + Math.floor(Math.random() * 3)]);
    const grey = 20 + Math.floor(Math.random() * 25);
    Smoke.emit(tmp.x, 4, tmp.z, 1 + rnd(1), 5 + Math.random() * 3, rnd(1), 5, 3 * f.size, 2.5, 0, grey << 16 | grey << 8 | grey);
  }
};
