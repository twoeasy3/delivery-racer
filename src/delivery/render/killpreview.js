// ---- the KILL EFFECT's preview on the Cosmetics screen (render/cosmeticsui.js; CHECKLIST 390): 'Test' (and picking a chip) throws a
// package at the car on the stage, trailing the effect's bits, which bursts on it and then the car "goes up" in the effect, drawn in the
// showroom view's own scene (render/showroomview.js overlay) by a kill-effect system of its own (render/killfx.js createKillFx) and, for
// Classic, a small set of classic pools (render/particles.js), so it is exactly what the game draws. Nothing here touches the game.
// ?killtest=<s> (with ?cosmetics&slot=kill): fires once the car has landed and holds the picture <s> seconds into it (for a still).
import * as THREE from 'three';
import { createKillFx, KILL_FX } from './killfx.js';
import { makeParticles, classicExplode, classicTrail, classicBurst } from './particles.js';
import { unitBox } from './particles.js';
import { ShowroomView } from './showroomview.js';
import { Sound } from './audio.js';

const FLIGHT = 0.8, KILL_AFTER = 0.3; // (s: the package's flight; the car's explosion after the package bursts)
const HIT = { big: false, scale: 0.45, smoke: 0.3 }, KILL = { big: false };
let group = null, fx = null, classic = null, box = null, run = null, look = 'classic', hold = -1;
const flag = (mesh) => { mesh.userData.shared = true; return mesh; }; // (the showroom letting its scene go must not dispose ours)
const make = () => {
  group = new THREE.Group();
  group.name = 'kill-preview';
  fx = createKillFx(group);
  const mat = (o) => new THREE.MeshBasicMaterial(o);
  classic = {
    Particles: makeParticles(240, mat(), group),
    Fire: makeParticles(200, mat({ transparent: true, opacity: 0.5, depthWrite: false }), group),
    Smoke: makeParticles(200, mat({ transparent: true, opacity: 0.35, depthWrite: false }), group),
  };
  for (const p of Object.values(classic)) flag(p.mesh);
  box = flag(new THREE.Mesh(unitBox, mat({ color: 0xc8955a })));
  box.scale.setScalar(0.7);
  box.visible = false;
  group.add(box);
};
try { const v = new URLSearchParams(location.search).get('killtest'); if (v !== null) hold = Math.max(0, Number(v) || 0); } catch { /* (headless) */ }

const right = new THREE.Vector3(), up = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), at = new THREE.Vector3();
// one frame of the preview (the showroom view's overlay: its scene, the frame's dt, its camera)
const frame = (scene, dt, camera) => {
  if (!group) return;
  if (group.parent !== scene) scene.add(group);
  if (run) {
    if (hold >= 0 && run.t >= hold) dt = 0; // (held for a still)
    run.t += dt;
    if (run.t < FLIGHT) { // the package in the air: an arc from the camera's left onto the car, its trail behind it
      const u = run.t / FLIGHT;
      at.lerpVectors(from, to, u);
      at.y += 2.2 * 4 * u * (1 - u);
      box.position.copy(at);
      box.rotation.x += dt * 9; box.rotation.z += dt * 6;
      box.visible = true;
      if (dt > 0) {
        if (look === 'classic') classicTrail(classic, at.x, at.y, at.z);
        else fx.trail(look, at.x, at.y, at.z, 0);
      }
    } else if (!run.hit) {
      run.hit = true;
      box.visible = false;
      if (look === 'classic') classicBurst(classic, to.x, to.y - 0.8, to.z, 0, 0); // (the small fire puff, as the game's)
      else fx.explode(look, to.x, 0, to.z, 0, 0, HIT);
      Sound.play('burst', 0.5);
    } else if (!run.kill && run.t >= FLIGHT + KILL_AFTER) {
      run.kill = true;
      if (look === 'classic') classicExplode(classic, 0, 0, 0, 0, 0, KILL);
      else fx.explode(look, 0, 0, 0, 0, 0, KILL);
      Sound.play('explode', 0.6);
      const extra = KILL_FX[look]?.sound;
      if (extra) Sound.play(extra.name, extra.volume);
    }
    if (run.t > FLIGHT + KILL_AFTER + 3 && hold < 0) run = null;
  }
  fx.update(dt, camera);
  for (const p of Object.values(classic)) p.update(dt);
};
ShowroomView.overlay(frame);

export const KillPreview = {
  // the effect `id` on the car on show: a package thrown, its trail, its burst, the explosion
  test(id, camera = ShowroomView.camera, height = ShowroomView.height) {
    if (!group) make();
    look = KILL_FX[id] ? id : 'classic';
    run = { t: 0, hit: false, kill: false };
    camera?.updateMatrixWorld?.();
    if (camera) { right.set(1, 0, 0).applyQuaternion(camera.quaternion); up.set(0, 1, 0); } else { right.set(1, 0, 0); up.set(0, 1, 0); }
    right.y = 0; right.normalize();
    const h = Math.max(1, height || 1.4);
    from.copy(right).multiplyScalar(-5).addScaledVector(up, h + 0.8);
    to.set(0, h * 0.75, 0);
    Sound.play('throw', 0.5);
    // (a still, ?killtest=<s>: played on to <s> s at once, in 60ths, so a slow frame rate cannot leave it short)
    if (hold >= 0 && ShowroomView.scene) { while (run.t < hold - 1e-6) frame(ShowroomView.scene, Math.min(1 / 60, hold - run.t), camera); }
  },
  clear() { run = null; fx?.clear(); if (box) box.visible = false; },
  get hold() { return hold; },
  // for a check or a picture: what is alive
  get state() { return { look, t: run ? run.t : null, live: fx ? fx.live() : 0, classic: classic ? classic.Fire.live() + classic.Smoke.live() + classic.Particles.live() : 0 }; },
};
