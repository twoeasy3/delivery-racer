// ---- the lamp EFFECTS' meshes, shared by the game (render/cars.js syncLamps) and the model editor's lamp toggles ----
// The brake lamps and their halo, the indicators, a wrong-way driver's flashed headlamps and the night headlamp glow,
// as meshes laid over a car from a LAYOUT (render/carlights.js lampsFor). Made once per car (addLamps), put in place
// only when the layout changes (placeLamps), switched on and off by setLampLights. Nothing is allocated per frame.
import * as THREE from 'three';

const lampBox = new THREE.BoxGeometry(1, 1, 1);
lampBox.userData.shared = true;
// Placed on the car's own lamps where render/carlights.js lists the car (CAR_LAMPS); else over where its
// tail lights would be on the hitbox (sized from it, whichever model it is): genericLayout, as it always was.
const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a });
const brakeHaloMat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.35, depthWrite: false });
const amberMat = new THREE.MeshBasicMaterial({ color: 0xffa21a });
const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
// a listed car's headlamps at night: a soft warm pool on each lens (a 64 x 64 drawn gradient, made once)
const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
if (typeof document !== 'undefined' && document.createElement) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  if (g && g.createRadialGradient) {
    const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, 64, 64);
    glowMat.map = new THREE.CanvasTexture(canvas);
  }
}
const lampDisc = new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateX(Math.PI / 2); // (a round lamp: its face across z)
const glowQuad = new THREE.PlaneGeometry(1, 1); // (facing +z; turned round for the back)
for (const shared of [brakeMat, brakeHaloMat, amberMat, flashMat, glowMat, lampDisc, glowQuad]) shared.userData.shared = true; // (made once, shared by every car: clearGroup keeps them)
export const addLamps = (group) => {
  const lamps = new THREE.Group();
  // (pools of meshes, grown the first time a layout needs more: made once each, never per frame)
  group.add(lamps);
  group.userData.lamps = { lamps, brakes: [], halos: [], blinkers: [], flashers: [], glows: [], placed: null, version: -1 };
};
const pool = (L, list, n, mat, geo = lampBox) => {
  while (list.length < n) { const mesh = new THREE.Mesh(geo, mat); L.lamps.add(mesh); list.push(mesh); }
};
const put = (mesh, s) => {
  mesh.geometry = s.round ? lampDisc : lampBox;
  mesh.scale.set(s.w, s.h, s.d);
  mesh.position.set(s.x, s.y, s.z);
};
// put every lamp of a layout in its place (only when the car's layout changes)
export const placeLamps = (L, layout) => {
  pool(L, L.brakes, layout.brake.length, brakeMat);
  pool(L, L.halos, layout.halo.length, brakeHaloMat);
  pool(L, L.blinkers, layout.blink.length, amberMat);
  pool(L, L.flashers, layout.flash.length, flashMat);
  pool(L, L.glows, layout.glow.length, glowMat, glowQuad);
  L.brakes.forEach((m, i) => { m.visible = false; if (i < layout.brake.length) put(m, layout.brake[i]); });
  L.halos.forEach((m, i) => { m.visible = false; if (i < layout.halo.length) put(m, layout.halo[i]); });
  L.blinkers.forEach((m, i) => { m.visible = false; if (i < layout.blink.length) { put(m, layout.blink[i]); m.material = layout.blink[i].red ? brakeMat : amberMat; } });
  L.flashers.forEach((m, i) => { m.visible = false; if (i < layout.flash.length) put(m, layout.flash[i]); });
  L.glows.forEach((m, i) => {
    m.visible = false;
    if (i >= layout.glow.length) return;
    const s = layout.glow[i];
    m.scale.set(s.w, s.h, 1);
    m.position.set(s.x, s.y, s.z);
  });
  L.placed = layout;
  L.version = layout.version || 0;
};
// switch every effect: braking (brake lamps and halos), blink (the flash phase) with turnX (+1 / -1 the side whose
// indicators blink, 0 none) and hazards (all four), flash (the headlamp flash), glow (the night headlamp glow)
export const setLampLights = (L, layout, braking, blink, turnX, hazards, flash, glow) => {
  for (let i = 0; i < layout.brake.length; i++) L.brakes[i].visible = braking;
  for (let i = 0; i < layout.halo.length; i++) L.halos[i].visible = braking;
  for (let i = 0; i < layout.blink.length; i++) L.blinkers[i].visible = blink && (hazards || turnX === layout.blink[i].side);
  for (let i = 0; i < layout.flash.length; i++) L.flashers[i].visible = flash;
  for (let i = 0; i < layout.glow.length; i++) L.glows[i].visible = glow;
};
