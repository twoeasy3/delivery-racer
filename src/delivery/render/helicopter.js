import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { clamp } from '../util.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { scene, tmp } from './scene.js';
import { unitBox, carMesh, trafficMeshes } from './cars.js';
import { Traffic } from '../traffic.js';

// ---- helicopter: flies in with a new car after a wreck, drops it, leaves ---------
const heli = new THREE.Group();
const heliRotor = new THREE.Group();
const heliMat = new THREE.MeshLambertMaterial({ color: 0x3d4a3a });
const heliBeacon = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color: 0xff2020 }));
heliBeacon.scale.set(0.6, 0.4, 0.6);
heliBeacon.position.set(0, -1.2, 1.2);
heli.add(heliBeacon);
const HELI_COLOR = { wreck: 0x3d4a3a, police: 0x1d3f8f };
{
  const mat = heliMat;
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  const part = (material, w, hgt, l, x, y, z, parent = heli) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(w, hgt, l);
    mesh.position.set(x, y, z);
    parent.add(mesh);
  };
  part(mat, 2.2, 2, 4.5, 0, 0, 0);        // cabin
  part(mat, 0.5, 0.5, 4, 0, 0.4, -4);     // tail boom
  part(mat, 0.2, 1.4, 0.8, 0, 1, -5.8);   // tail fin
  part(dark, 0.15, 0.15, 3.5, -1, -1.3, 0); // skids
  part(dark, 0.15, 0.15, 3.5, 1, -1.3, 0);
  part(dark, 9, 0.1, 0.5, 0, 0, 0, heliRotor);
  part(dark, 0.5, 0.1, 9, 0, 0, 0, heliRotor);
  heliRotor.position.y = 1.3;
  heli.add(heliRotor);
  heli.visible = false;
  scene.add(heli);
}
// A level can hide the helicopters ("helicopter": false). Wrecks and busts still play out the
// same way and take as long; the car is just lifted and set down with nothing visible doing it.
const showHelicopter = () => LEVEL.helicopter !== false;
const HELI_HOVER = 8; // low enough to stay in the chase camera's view
let heliLeaving = 0;
// police, already hovering over the car: lift it, carry it to its lane, hold, drop
const syncPoliceGrab = (now) => {
  const p = 1 - Game.respawn / CONFIG.policeHoldTime; // 0 -> 1 over the arrest
  const lift = clamp(p / 0.25, 0, 1);
  const fall = clamp((p - 0.82) / 0.18, 0, 1);
  const lat = Game.grabLat + (Player.lat - Game.grabLat) * lift;
  const heading = Track.toWorld(Player.s, lat, tmp);
  const heliY = HELI_HOVER + Math.sin(now / 300) * 0.3 * lift;
  heliBeacon.material.color.setHex(Math.floor(now / 150) % 2 ? 0xff2020 : 0x2060ff);
  heli.position.set(tmp.x, tmp.y + heliY, tmp.z);
  heli.rotation.y = heading;
  carMesh.visible = true;
  carMesh.position.set(tmp.x, tmp.y + (heliY - 2.8) * lift * (1 - fall * fall), tmp.z);
  carMesh.rotation.x = 0;
  carMesh.rotation.y = heading + Math.sin(now / 400) * 0.3 * lift * (1 - fall); // dangles
};

// ---- police helicopters that carry off a car arrested under the player's siren -----------------
// Copies of the one above in police blue, a few of them, each with a flashing beacon. Over the
// arrest: it drops out of the sky onto the car, hooks it, then climbs away with it dangling
// below, off to the side of the road. (Call after syncTraffic, which puts each car on the road.)
const ARREST_HELIS = 3;
const arrestHelis = Array.from({ length: ARREST_HELIS }, () => {
  const copy = heli.clone(true);
  const blue = new THREE.MeshLambertMaterial({ color: HELI_COLOR.police });
  const beacon = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  copy.traverse((o) => {
    if (o.material === heliMat) o.material = blue;
    else if (o.material === heliBeacon.material) o.material = beacon;
  });
  copy.visible = false;
  scene.add(copy);
  return { copy, rotor: copy.children[copy.children.length - 1], beacon };
});
export const syncArrests = (dt, now) => {
  const T = CONFIG.sirenPickup.arrestTime;
  let k = 0;
  for (let i = 0; i < Traffic.cars.length; i++) {
    const car = Traffic.cars[i];
    if (!car.active || !(car.arrest >= 0) || k >= ARREST_HELIS) continue;
    const { copy, rotor, beacon } = arrestHelis[k++], mesh = trafficMeshes[i];
    const come = clamp(car.arrest / 0.9, 0, 1);            // dropping onto it
    const carry = clamp((car.arrest - 1.1) / (T - 1.1), 0, 1); // and away with it
    const away = carry * carry * 25 * (car.dir > 0 ? 1 : -1); // (off to the side of the road)
    const heading = Track.toWorld(car.s, car.lat + away, tmp);
    const heliY = HELI_HOVER + (1 - come) * (1 - come) * 25 + carry * carry * 30;
    copy.visible = showHelicopter();
    copy.position.set(tmp.x, tmp.y + heliY, tmp.z);
    copy.rotation.y = heading;
    rotor.rotation.y += dt * 40;
    beacon.color.setHex(Math.floor(now / 150) % 2 ? 0xff2020 : 0x2060ff);
    const hooked = clamp(carry * 4, 0, 1); // (the car is lifted up under it, then carried)
    mesh.position.set(tmp.x, tmp.y + (heliY - 2.8) * hooked, tmp.z);
    mesh.rotation.y += Math.sin(now / 400) * 0.3 * hooked; // dangles
  }
  for (; k < ARREST_HELIS; k++) arrestHelis[k].copy.visible = false;
};

export const syncHelicopter = (dt, now) => {
  // the new car blinks while it is still shielded
  carMesh.visible = Player.active && (Player.shield <= 0 || Math.floor(now / 80) % 2 === 0);
  heliRotor.rotation.y += dt * 40;

  if (Game.policeApproach >= 0) { // police coming down on the busted, still-moving car
    const p = 1 - Game.policeApproach / CONFIG.policeApproachTime;
    const heading = Track.toWorld(Player.s, Player.lat, tmp);
    heli.visible = showHelicopter();
    heliLeaving = 0;
    heliMat.color.setHex(HELI_COLOR.police);
    heliBeacon.visible = true;
    heliBeacon.material.color.setHex(Math.floor(now / 150) % 2 ? 0xff2020 : 0x2060ff);
    heli.position.set(tmp.x, tmp.y + HELI_HOVER + (1 - p) * (1 - p) * 25, tmp.z);
    heli.rotation.y = heading;
    return;
  }

  if (Game.respawn < 0) { // job done: climb away over the camera
    if (!heli.visible) return;
    heliLeaving += dt;
    heli.position.y += dt * (3 + heliLeaving * 8);
    heli.translateZ(dt * heliLeaving * 25);
    if (heliLeaving > 3) heli.visible = false;
    return;
  }

  heli.visible = showHelicopter();
  heliLeaving = 0;
  heliMat.color.setHex(HELI_COLOR[Game.respawnKind]);
  heliBeacon.visible = Game.respawnKind === 'police';
  if (Game.respawnKind === 'police') { syncPoliceGrab(now); return; }

  const p = 1 - Game.respawn / CONFIG.respawnTime;         // 0 -> 1 over the delivery
  const arrive = 1 - Math.pow(1 - Math.min(1, p / 0.5), 3); // fly in, easing to a hover
  const heading = Track.toWorld(Player.s + (1 - arrive) * 160, Player.lat, tmp);
  const heliY = HELI_HOVER + (1 - arrive) * 30;
  heli.visible = showHelicopter();
  heliLeaving = 0;
  heli.position.set(tmp.x, tmp.y + heliY, tmp.z);
  heli.rotation.y = heading + Math.PI; // nose toward the player

  // the car hangs under the helicopter, then drops to the road
  const fall = clamp((p - 0.6) / 0.3, 0, 1);
  carMesh.visible = true;
  carMesh.position.set(tmp.x, tmp.y + (heliY - 2.8) * (1 - fall * fall), tmp.z);
  carMesh.rotation.x = 0;
  carMesh.rotation.y = heading;
};
