import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CAR, CARS } from '../cars.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';
import { Mysteries } from '../mysteries.js';
import { scene, tmp } from './scene.js';
import { MODELS, FIXED_PAINT, makeLightBar, placeLightBar, flashLightBar } from './models.js';
import './trafficModels.js'; // (more of them, added to MODELS)
import { makeCrashDummy } from './pickupModels.js';
import { makeTractorModel, makeUfo } from './carExtras.js';
import { damageShare, scorch } from './dents.js';

// ---- cars (front faces local +z), sized from each vehicle's hitbox -----------
export const unitBox = new THREE.BoxGeometry(1, 1, 1);
const cabinMat = new THREE.MeshLambertMaterial({ color: 0x2b2f38 });
const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const bumperMat = new THREE.MeshLambertMaterial({ color: 0x2a2c31 });
const tyreMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
const wheelGeo = new THREE.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2); // axle across the car
export const makeCarMesh = (color) => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color }));
  const cabin = new THREE.Mesh(unitBox, cabinMat);
  // two headlights at the front, two tail lights at the back
  const lights = [headlightMat, headlightMat, taillightMat, taillightMat].map(mat => new THREE.Mesh(unitBox, mat));
  const roof = new THREE.Mesh(unitBox, body.material); // (in the body's paint)
  const bumpers = [0, 1].map(() => new THREE.Mesh(unitBox, bumperMat));
  const wheels = [0, 1, 2, 3].map(() => new THREE.Mesh(wheelGeo, tyreMat));
  group.add(body, cabin, ...lights, roof, ...bumpers, ...wheels);
  // (trim: everything that is hidden along with the body when another model stands in for it)
  group.userData = { body, cabin, lights, roof, bumpers, wheels, trim: [roof, ...bumpers, ...wheels] };
  group.rotation.order = 'YXZ'; // turn to the heading first, then pitch with the slope
  scene.add(group);
  return group;
};
export const shapeCarMesh = (group, v) => {
  const { body, cabin, lights, roof, bumpers, wheels } = group.userData;
  const w = v.hw * 2, l = v.hl * 2, h = v.height;
  const boxy = v.kind === 'bus' || v.kind === 'van' || v.kind === 'ambulance';
  const R = v.kind === 'bus' ? 0.45 : 0.34;
  wheels.forEach((wheel, i) => {
    wheel.scale.set(0.28, R, R);
    wheel.position.set((i % 2 ? 1 : -1) * (w / 2 - 0.08), R, (i < 2 ? 1 : -1) * l * 0.31);
  });
  bumpers.forEach((bumper, i) => {
    bumper.scale.set(w + 0.08, 0.16, 0.14);
    bumper.position.set(0, 0.42, (i ? -1 : 1) * (l / 2 + 0.02));
  });
  lights.forEach((light, i) => {
    const front = i < 2, side = i % 2 ? 1 : -1;
    light.scale.set(w * 0.22, front ? 0.22 : 0.16, 0.1);
    light.position.set(side * w * 0.32, 0.3 + (boxy ? 0.5 : h * 0.3), (front ? 1 : -1) * (l / 2 + 0.01));
  });
  if (boxy) {
    // boxy: full-height body with a band of windows round it
    const bus = v.kind === 'bus';
    body.scale.set(w, h - 0.3, l);
    body.position.y = 0.3 + (h - 0.3) / 2;
    // (a bus's band stands proud of the body all round, so it has front and back windows too;
    // a van's runs from the middle to just past the front: a windscreen, and a solid back)
    cabin.scale.set(w * 1.03, h * 0.24, l * (bus ? 1.02 : 0.54));
    cabin.position.set(0, 0.3 + h * 0.62, bus ? 0 : l * 0.24);
    roof.scale.set(w * 0.94, 0.08, l * 0.96);
    roof.position.set(0, h, 0);
  } else {
    body.scale.set(w, h * 0.5, l);
    body.position.y = 0.3 + h * 0.25;
    cabin.scale.set(w * 0.85, h * 0.45, l * 0.5);
    cabin.position.set(0, 0.3 + h * 0.725, -l * 0.07);
    roof.scale.set(w * 0.87, 0.07, l * 0.46);
    roof.position.set(0, 0.3 + h * 0.95, -l * 0.08);
  }
};

// a tank, front facing local +z. Its paint is userData.body.material, like a car's.
export const makeTankMesh = (color) => {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x23261c });
  const steel = new THREE.MeshLambertMaterial({ color: 0x4a4d45 });
  const part = (material, w, hgt, l, x, y, z) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(w, hgt, l);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  // a cylinder lying along the car's width ('x') or its length ('z'), or standing up ('y')
  const drum = (material, radius, length, axis, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14), material);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  // The parts are sorted into the five pieces of TANK RAGE, in the order they are found
  // (userData.pieces, see render/tankcorner.js): 0 the rear body, 1 the turret hull, 2 the gun
  // turret, 3 the gun barrel, and 4 the front body with the running gear
  const pieces = [[], [], [], [], []];
  let piece = 0;
  const into = (mesh) => { pieces[piece].push(mesh); return mesh; };
  // ---- the rear body
  const hull = into(part(paint, 2.0, 0.8, 2.15, 0, 0.9, -1.075)); // (the hull, in two halves)
  into(part(dark, 1.2, 0.05, 0.7, 0, 1.31, -1.7));                     // engine grille
  for (const side of [-1, 1]) into(drum(steel, 0.17, 0.75, 'x', side * 0.45, 1.12, -2.3)); // fuel drums on the back
  // ---- the turret hull
  piece = 1;
  into(part(paint, 1.4, 0.65, 1.9, 0, 1.6, -0.3));                     // turret,
  into(part(paint, 1.0, 0.45, 0.5, 0, 1.58, -1.45));                   // its bustle,
  into(drum(dark, 0.3, 0.1, 'y', 0.3, 1.97, -0.55));                   // hatch
  into(part(dark, 0.03, 1.3, 0.03, -0.55, 2.55, -1.05));               // and aerial
  // ---- the gun turret
  piece = 2;
  into(part(dark, 0.6, 0.42, 0.3, 0, 1.62, 0.75));                     // gun mantlet
  into(part(dark, 0.07, 0.07, 0.6, 0.3, 2.1, -0.15));                  // machine gun
  // ---- the gun barrel
  piece = 3;
  into(drum(dark, 0.12, 2.5, 'z', 0, 1.65, 2.05));                     // barrel
  into(drum(dark, 0.18, 0.36, 'z', 0, 1.65, 3.15));                    // muzzle brake
  // ---- the front body, and the running gear
  piece = 4;
  into(part(paint, 2.0, 0.8, 2.15, 0, 0.9, 1.075));
  const glacis = into(part(paint, 1.5, 0.07, 0.95, 0, 1.02, 2.1));     // sloping front plate
  glacis.rotation.x = 0.72;
  for (const side of [-1, 1]) {
    into(part(dark, 0.55, 0.62, 4.1, side, 0.4, 0));                   // track run,
    into(drum(dark, 0.4, 0.55, 'x', side, 0.4, 2.0));                  // rounded off at each end
    into(drum(dark, 0.4, 0.55, 'x', side, 0.4, -2.0));
    for (let i = 0; i < 5; i++) into(drum(steel, 0.27, 0.08, 'x', side * 1.28, 0.34, -1.6 + i * 0.8)); // road wheels
    into(part(paint, 0.66, 0.07, 4.7, side, 0.84, 0));                 // mudguards
    into(part(new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), 0.2, 0.14, 0.08, side * 0.72, 1.12, 2.17)); // headlights
  }
  group.userData = { body: hull, pieces };
  return group;
};

// ---- brake lights, indicators and hazards, laid over any car-shaped vehicle ----------------------
// (over the car's own tail lights, whichever model it is: they are sized from its hitbox)
const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a });
const brakeHaloMat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.35, depthWrite: false });
const amberMat = new THREE.MeshBasicMaterial({ color: 0xffa21a });
const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
const addLamps = (group) => {
  const lamps = new THREE.Group();
  const brakes = [0, 1].map(() => new THREE.Mesh(unitBox, brakeMat));
  const halos = [0, 1].map(() => new THREE.Mesh(unitBox, brakeHaloMat));
  const blinkers = [0, 1, 2, 3].map(() => new THREE.Mesh(unitBox, amberMat)); // front then back; left (-x) then right
  const flashers = [0, 1].map(() => new THREE.Mesh(unitBox, flashMat)); // headlights flashed (a wrong-way driver's)
  lamps.add(...brakes, ...halos, ...blinkers, ...flashers);
  group.add(lamps);
  group.userData.lamps = { lamps, brakes, halos, blinkers, flashers };
};
// v: the vehicle (its hitbox sizes the lamps); show: false for a vehicle that isn't car-shaped;
// turnX: the side of the model (+1 = local +x, -1 = -x) whose indicators blink, 0 = none
export const syncLamps = (group, v, show, braking, turnX, hazards, flashing) => {
  const { lamps, brakes, halos, blinkers, flashers } = group.userData.lamps;
  lamps.visible = show;
  if (!show) return;
  const w = v.hw * 2, l = v.hl * 2, y = Math.min(1.1, Math.max(0.55, v.height * 0.5));
  const blink = Math.floor(performance.now() / 350) % 2 === 0;
  brakes.forEach((lamp, i) => {
    const side = i ? 1 : -1;
    lamp.visible = halos[i].visible = braking;
    lamp.scale.set(w * 0.24, 0.18, 0.06);
    lamp.position.set(side * w * 0.33, y, -(l / 2 + 0.04));
    halos[i].scale.set(w * 0.4, 0.4, 0.1);
    halos[i].position.set(side * w * 0.33, y, -(l / 2 + 0.1));
  });
  blinkers.forEach((lamp, i) => {
    const side = i % 2 ? 1 : -1, front = i < 2;
    lamp.visible = blink && (hazards || turnX === side);
    lamp.scale.set(0.2, 0.14, 0.08);
    lamp.position.set(side * (w / 2 - 0.08), y, (front ? 1 : -1) * (l / 2 + 0.05));
  });
  // (big and bright, so they are seen from well up the road)
  const flash = !!flashing && Math.floor(performance.now() / 140) % 2 === 0;
  flashers.forEach((lamp, i) => {
    lamp.visible = flash;
    lamp.scale.set(w * 0.42, 0.5, 0.1);
    lamp.position.set((i ? 1 : -1) * w * 0.3, y, l / 2 + 0.12);
  });
};

export const carMesh = makeCarMesh(CAR.color);
shapeCarMesh(carMesh, Player);
addLamps(carMesh);
// a different car picked in the garage: the player's model takes its shape
// (its colour is set every frame, in items.js)
// a flying saucer, shown in place of the car's body when the car in use is a UFO
export const ufoMesh = makeUfo();
ufoMesh.visible = false;
carMesh.add(ufoMesh);
// the player's car can turn see-through (ghost), so it needs materials of its own
carMesh.userData.cabin.material = cabinMat.clone();
export const playerMats = [carMesh.userData.body.material, carMesh.userData.cabin.material];
for (const mat of playerMats) mat.transparent = true;
// the inflatable passenger: a crash-test dummy riding along on the roof while it is active
// (sat at the car's roof height: see items.js)
export const passengerMesh = makeCrashDummy();
passengerMesh.position.set(0, 2.2, -0.35);
passengerMesh.visible = false;
carMesh.add(passengerMesh);


// good cars wear bright colours, evil cars dark ones
const PAINTS = {
  good: [0xffd23f, 0x4fc3f7, 0x7ee081, 0xff8fb1, 0xffffff, 0xff9f43],
  evil: [0x24242b, 0x3a1f4d, 0x4a1c1c, 0x1f3a3a, 0x3b3b1f, 0x1c2a4a],
};
// an F1 car's livery, by its paint number: any colour at all (and a second: see models.js)
export const F1_PAINTS = [0xd8262b, 0x1d3f9c, 0x18a35a, 0xff8a1a, 0x101010, 0xf4f4f4, 0x7a1fa8, 0x2fc4d8, 0xf2d21f, 0x8a1a2a, 0x2a6b3a, 0xff5fa8];
// a GT car's: road car colours (silver, racing green, rosso, white, black, giallo, blue, orange,
// gunmetal, burgundy, gulf blue, lime)
const GT_PAINTS = [0xc0c4c8, 0x0f4d2c, 0xc8102e, 0xf4f4f4, 0x111111, 0xf2c200, 0x1f4fa8, 0xff6a13, 0x5a6b7a, 0x7a0f1f, 0x6fb7d8, 0x9cc63b];
const RACE_PAINTS = { f1: F1_PAINTS, gt: GT_PAINTS, lmp: F1_PAINTS }; // (a prototype's, as an F1 car's: any colour, and a second)
// a racer's paint (an F1 or GT car's, by its paint number)
export const racePaint = (car) => { const list = RACE_PAINTS[car.kind] || F1_PAINTS; return list[car.paint % list.length]; };
// kinds of traffic that are also garage cars with a fixed livery wear that car's two colours
// (see CARS: fixedLivery), not a random paint: kind -> { good, evil }
const LIVERIES = Object.fromEntries([
  ...CARS.filter(c => c.fixedLivery).map(c => [c.id, { good: c.color, evil: c.evilColor }]),
  // (and a traffic kind in one livery of its own, good or evil: CONFIG.vehicles' "livery")
  ...Object.entries(CONFIG.vehicles).filter(([, type]) => type.livery).map(([kind, type]) => [kind, { good: type.livery, evil: type.livery }]),
]);
export const trafficMeshes = Traffic.cars.map(() => {
  const mesh = makeCarMesh(PAINTS.good[0]);
  // roof light bar, only shown (and flashing) on police cars and ambulances (the bar itself: render/models.js,
  // which the menu's road card puts on its police car too)
  const bar = makeLightBar();
  mesh.add(bar);
  mesh.userData.bar = bar;
  mesh.userData.models = {};
  addLamps(mesh);
  return mesh;
});
const signalAt = new THREE.Vector3(), unplace = new THREE.Matrix4();
// A kind of vehicle with a model of its own (the tractor, and any kind with a "model" in
// CONFIG.vehicles): built the first time this mesh needs it, and kept for the next time.
const ownModel = (mesh, car) => {
  const type = CONFIG.vehicles[car.kind];
  if (car.kind !== 'tractor' && !type.model) return null;
  const models = mesh.userData.models;
  if (!models[car.kind]) {
    models[car.kind] = car.kind === 'tractor' ? makeTractorModel() : MODELS[type.model]({ ...type, color: 0xffffff });
    mesh.add(models[car.kind]);
  }
  return models[car.kind];
};
export const syncTraffic = () => {
  for (let i = 0; i < Traffic.cars.length; i++) {
    const car = Traffic.cars[i], mesh = trafficMeshes[i];
    mesh.visible = car.active;
    if (!car.active) continue;
    if (car.junction) { // (off the road, going through a junction: where it is in the world)
      mesh.position.set(car.wx, car.wy, car.wz);
      mesh.rotation.set(0, car.wh, 0);
    } else {
      mesh.rotation.y = Track.toWorld(car.s, car.lat, tmp) - car.yaw + (car.dir < 0 ? Math.PI : 0); // (a spin-out's turn is in yaw too)
      mesh.position.copy(tmp);
      mesh.position.y += Mysteries.heave(car.s); // (riding an earthquake's wave: 0 without one)
      mesh.rotation.x = car.spin > 0 ? 0 : -Math.atan(Track.grade(car.s)) * car.dir; // tilt with the slope
    }
    shapeCarMesh(mesh, car);
    const paints = PAINTS[car.evil ? 'evil' : 'good'];
    const livery = LIVERIES[car.kind];
    const paint = car.colors ? car.colors[0] : FIXED_PAINT[car.kind] !== undefined ? FIXED_PAINT[car.kind] : RACE_PAINTS[car.kind] ? racePaint(car)
      : livery ? livery[car.evil ? 'evil' : 'good'] : paints[car.paint % paints.length];
    mesh.userData.body.material.color.setHex(paint);
    const worn = car.toad ? 0 : damageShare(car); // (a damaged car's paint is scorched: see dents.js)
    scorch(mesh.userData.body.material.color, worn);
    // (on the roof: an ambulance's at the front of its box's roof, just behind the cab, where it
    // shows in the mirror, so to speak)
    placeLightBar(mesh.userData.bar, car.kind, car);
    // a vehicle with a model of its own shows that in place of the standard box car
    const own = ownModel(mesh, car);
    for (const kind in mesh.userData.models) mesh.userData.models[kind].visible = mesh.userData.models[kind] === own;
    if (own && own.userData.body) { // (one of the garage's models: it takes this car's paint, and animates)
      own.userData.body.material.color.setHex(paint);
      scorch(own.userData.body.material.color, worn);
      own.userData.livery?.(car.evil);
      if (car.colors) own.userData.stripe?.(car.colors[1]); // (a rival courier's own scheme)
      own.userData.firing?.(car.driveBy?.state === 'fire'); // (a drive-by, shooting)
      own.userData.accent?.(Math.floor(car.paint / F1_PAINTS.length));
      own.userData.style?.(Math.floor(car.paint / GT_PAINTS.length)); // (a GT car's shape)
      if (!own.userData.garageOnly) own.userData.animate(performance.now() / 1000 + i); // (a model whose moving parts are for the garage keeps them still on the road)
      own.userData.aim?.(car.turret || 0); // (an army's gun, turned to its target: see Traffic's battle)
      own.userData.broken?.(!!car.tracksBroken); // (a tank's thrown track)
    }
    mesh.userData.body.visible = mesh.userData.cabin.visible = !own;
    for (const part of [...mesh.userData.lights, ...mesh.userData.trim]) part.visible = !own;
    flashLightBar(mesh.userData.bar, car.kind, performance.now(), i);
    // brake lights and indicators (not on a toad or a tractor). Which side of the model a signal
    // is on: the side nearer the road a little way across in the direction it is signalling
    const lit = !car.toad && car.kind !== 'tractor' && !CONFIG.vehicles[car.kind]?.boat; // (nor on a boat)
    let turnX = 0;
    if (lit && car.signal && !car.junction) {
      mesh.updateMatrixWorld();
      Track.toWorld(car.s, car.lat + car.signal, signalAt);
      // (in the scene's own terms: its matrix, not its world one, which a mirrored level reverses)
      turnX = Math.sign(signalAt.applyMatrix4(unplace.copy(mesh.matrix).invert()).x);
    }
    syncLamps(mesh, car, lit, car.braking, turnX, car.hazards || car.wrongWay, car.wrongWay); // (a wrong-way driver: hazards on, headlights flashing)
  }
};
