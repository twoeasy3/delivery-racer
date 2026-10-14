// ---- the KEY's pose in the key unlock (render/unlockcine.js), as a pure function of the time: where the key (or the
// fob) is and how it is turned, CONTINUOUS through every cut (the owner, 14-Oct: "the key snaps position during the first
// scene"). A cut changes only the camera; the key moves on from where it was, eased. No three.js scene, no page: a check
// can print it (scripts/.keypose-check.mjs).
//   a key with a blade: standing and turning slowly at F (in front of the lock), turned level and blade-first as it
//     comes to the barrel (1.0-1.6), slid in along the barrel's axis (1.4-2.75), a quarter turn clockwise (2.9-click)
//   a fob: standing and turning slowly at F, then turned to point its top at the car, its face up (1.0-1.9), held there;
//     its button pressed at FOB.press (it dips along its face and tips a little, 0.06 s down, then back)
import * as THREE from 'three';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const span = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (u) => u * u * (3 - 2 * u);
const easeIn = (u) => u * u * u;
export const FOB = { press: 2.2, pulse: [2.25, 2.55], blinks: [2.6, 2.95], blink: 0.18 }; // (the press, the light leaving the fob for the car, the car's two blinks)
const e = new THREE.Euler(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
// -> { pos, quat, turn (the barrel's turn, rad), press (0..1) }. P: the lock's place; keyHalf: half the key's length;
// inBarrel: the key's turn in the barrel (blade along -z, teeth down); click: the end of the turn
export const keyPose = (t, { fob, P, keyHalf, inBarrel, click }) => {
  const F = new THREE.Vector3(P.x, P.y, P.z + 2.0);
  const stand = qa.setFromEuler(e.set(0, 0.6 - t * 0.35, -0.12)).clone();
  const bob = Math.sin(t * 1.1) * 0.03;
  if (fob) {
    const w = smooth(span(t, 1.0, 1.9));
    const point = qb.setFromEuler(e.set(-Math.PI / 2 + 0.32 + Math.sin(t * 0.9) * 0.025, Math.sin(t * 0.7) * 0.03, 0)).clone(); // (its top toward the car, its face up)
    const quat = stand.slerp(point, w);
    const d = t < FOB.press ? 0 : t < FOB.press + 0.06 ? (t - FOB.press) / 0.06 : Math.exp(-(t - FOB.press - 0.06) * 8);
    if (d > 0) quat.multiply(qb.setFromEuler(e.set(-0.08 * d, 0, 0)));
    const face = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    const pos = F.clone().add(new THREE.Vector3(0, bob * (1 - w), 0)).addScaledVector(face, -0.035 * d);
    return { pos, quat, turn: 0, press: d };
  }
  const w = smooth(span(t, 1.0, 1.6));
  const turn = -easeIn(span(t, 2.9, click)) * Math.PI / 2; // (clockwise seen from the driver)
  const barrel = qb.setFromEuler(e.set(0, 0, turn)).clone().multiply(inBarrel);
  const quat = stand.slerp(barrel, w);
  const tipZ = 2.0 - keyHalf + (-0.32 - (2.0 - keyHalf)) * smooth(span(t, 1.4, 2.75)); // (the blade's tip from the barrel's face: from where it stood to home)
  const pos = new THREE.Vector3(P.x, P.y + bob * (1 - w), P.z + tipZ + keyHalf);
  return { pos, quat, turn, press: 0 };
};
