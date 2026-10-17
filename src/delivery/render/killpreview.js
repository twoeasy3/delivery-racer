// ---- the KILL EFFECT's preview on the Cosmetics screen (render/cosmeticsui.js; CHECKLIST 405): 'Test' (and picking a chip) throws a
// package at the car on the stage, trailing the effect's bits, which bursts on it and then the car "goes up" in the effect, drawn in the
// showroom view's own scene (render/showroomview.js overlay) by a kill-effect system of its own (render/killfx.js createKillFx) and, for
// Classic, a small set of classic pools (render/particles.js), so it is exactly what the game draws. Nothing here touches the game.
// ?killtest=<s> (with ?cosmetics&slot=kill): fires once the car has landed and holds the picture <s> seconds into it (for a still).
// THE CAR GOES (the owner, 16-Oct: "The kill fx preview should hide the car and have the effect land on the ground"): when it goes up the
// car (its model and every cosmetic on it, and its shadow) is hidden (ShowroomView.carGone) and the effect is set off ON THE STAGE'S FLOOR
// (ShowroomView.floorY, given as the road's height is in the game: the effects' own floors are that height plus their own offsets), by a
// system made with `settle` (render/killfx.js): what falls lands on the floor and lies there a moment (paper and coins flat) instead of
// fading in the air; a MARK is left on the floor where it went up (a scorch, a splash: per effect, below). The car pops back once the
// effect has played out (BACK). A new Test clears the last one first (nothing stacks) and brings the car back; clear() always does.
import * as THREE from 'three';
import { createKillFx, KILL_FX } from './killfx.js';
import { makeParticles, classicExplode, classicTrail, classicBurst } from './particles.js';
import { unitBox } from './particles.js';
import { ShowroomView } from './showroomview.js';
import { Sound } from './audio.js';

// ONE IMPACT TIME (CHECKLIST 457; the owner: "a slight delay in the Kill FX projectile landing and the car exploding"): the package's
// flight IS the impact. impactAt(id) (an effect's own `flight` s, else FLIGHT) is read by the package's motion (u = t / impactAt) and by
// the impact itself: on the first frame t reaches it the package is gone, its burst, the car's explosion, the car hidden, the mark and the
// sounds all happen together, as in a run (the rules queue the package's 'burst' and the car's 'explode' in the same step: render/effects.js
// plays both that frame). It used to wait KILL_AFTER (0.3 s) after the burst before the car went up.
const FLIGHT = 0.8; // (s: the package's flight, the default impact time)
export const impactAt = (id) => { const f = KILL_FX[id]?.flight; return f > 0 ? f : FLIGHT; };
const BACK_MIN = 1.6, BACK = 3.6, REST = 0.7; // (s after the impact: the car back once all has gone and not before BACK_MIN, or at BACK whatever; REST: how long a landed bit lies there)
const HIT = { big: false, scale: 0.45, smoke: 0.3 }, KILL = { big: false };
let group = null, fx = null, classic = null, box = null, marks = null, run = null, look = 'classic', hold = -1;
const floorY = () => ShowroomView.floorY ?? 0;
// the MARK each effect leaves on the floor: [texture, colour, opacity, size m, additive]; none where what fell is the mark (paper, coins)
const MARKS = {
  classic: [['scorch', 0x000000, 0.75, 4.2]],
  fireworks: [['scorch', 0x000000, 0.6, 3.6], ['ring', 0xff4f8b, 0.55, 3.4, true]],
  bubbles: [['scorch', 0x9fdcff, 0.45, 3.8]],
  comic: [['star', 0x111111, 0.55, 3.6]],
  lightning: [['scorch', 0x000000, 0.7, 3.6], ['ring', 0x7fc8ff, 0.8, 3.2, true]],
};
const markTexture = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); if (g) draw(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const MARK_TEX = {
  scorch: (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); },
  ring: (g) => { g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.stroke(); },
  star: (g) => { g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 14 + (i % 3) * 2 : 30 - (i % 5); g.lineTo(32 + Math.sin(a) * r, 32 - Math.cos(a) * r); } g.closePath(); g.fillStyle = '#fff'; g.fill(); },
};
const flag = (mesh) => { mesh.userData.shared = true; return mesh; }; // (the showroom letting its scene go must not dispose ours)
const make = () => {
  group = new THREE.Group();
  group.name = 'kill-preview';
  fx = createKillFx(group, { settle: { ground: floorY(), rest: REST } });
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
  marks = [0, 1].map(() => { // (two flat meshes on the floor, just over the floor patch and the shadow; their texture set per effect)
    const m = flag(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })));
    m.rotation.x = -Math.PI / 2; m.position.y = floorY() + 0.006; m.renderOrder = -0.5; m.visible = false;
    group.add(m);
    return m;
  });
  for (const name in MARK_TEX) MARK_TEX[name] = markTexture(MARK_TEX[name]);
};
// the marks: laid at the kill (grown in fast), faded out as the car comes back
const markOn = () => {
  const list = MARKS[look] || KILL_FX[look]?.mark || []; // (an effect may carry its own: render/killfxmore.js)
  marks.forEach((m, i) => {
    const d = list[i];
    m.visible = !!d;
    if (!d) return;
    m.material.map = MARK_TEX[d[0]]; m.material.color.setHex(d[1]); m.material.blending = d[4] ? THREE.AdditiveBlending : THREE.NormalBlending; m.material.needsUpdate = true;
    m.userData.mark = { opacity: d[2], size: d[3], age: 0, out: -1 };
  });
};
const markFrame = (dt) => {
  for (const m of marks) {
    const d = m.userData.mark;
    if (!m.visible || !d) continue;
    d.age += dt;
    if (d.out >= 0) d.out += dt;
    const grow = Math.min(1, 0.35 + d.age / 0.15), fade = d.out < 0 ? 1 : Math.max(0, 1 - d.out / 0.5);
    m.scale.set(d.size * grow, d.size * grow, 1);
    m.material.opacity = d.opacity * fade;
    if (fade <= 0) m.visible = false;
  }
};
const marksOff = (now = false) => { for (const m of marks || []) { if (now) m.visible = false; else if (m.userData.mark && m.userData.mark.out < 0) m.userData.mark.out = 0; } };
// the classic pools emptied (makeParticles has no clear: a long step lets every particle's life run out)
const purgeClassic = () => { for (const p of Object.values(classic || {})) p.update(1e9); };
const liveNow = () => (look === 'classic' ? classic.Fire.live() + classic.Smoke.live() + classic.Particles.live() : fx.live());
try { const v = new URLSearchParams(location.search).get('killtest'); if (v !== null) hold = Math.max(0, Number(v) || 0); } catch { /* (headless) */ }

const right = new THREE.Vector3(), up = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), at = new THREE.Vector3();
// one frame of the preview (the showroom view's overlay: its scene, the frame's dt, its camera)
const frame = (scene, dt, camera) => {
  if (!group) return;
  if (group.parent !== scene) scene.add(group);
  if (run) {
    if (hold >= 0 && run.t >= hold) dt = 0; // (held for a still)
    run.t += dt;
    const at0 = run.impactAt;
    if (run.t < at0 - 1e-6) { // the package in the air: an arc from the camera's left onto the car, its trail behind it (1e-6: a sum of 60ths that is the impact time to a float's error is it)
      const u = run.t / at0;
      at.lerpVectors(from, to, u);
      at.y += 2.2 * 4 * u * (1 - u);
      box.position.copy(at);
      box.rotation.x += dt * 9; box.rotation.z += dt * 6;
      box.visible = true;
      if (dt > 0) {
        if (look === 'classic') classicTrail(classic, at.x, at.y, at.z);
        else fx.trail(look, at.x, at.y, at.z, 0);
      }
    } else if (!run.kill) { // THE IMPACT (this very frame: the package gone, its burst, the car going up, the sounds)
      run.hit = run.kill = true;
      run.impactFrame = run.t;
      box.visible = false;
      if (look === 'classic') classicBurst(classic, to.x, to.y - 0.8, to.z, 0, 0); // (the small fire puff, as the game's)
      else fx.explode(look, to.x, floorY(), to.z, 0, 0, HIT);
      ShowroomView.carGone(true); // (the car is what goes up)
      markOn();
      const y = floorY(); // (on the floor under the car, as the game's at the road's height)
      if (look === 'classic') classicExplode(classic, 0, y, 0, 0, 0, KILL);
      else fx.explode(look, 0, y, 0, 0, 0, KILL);
      Sound.play('burst', 0.5);
      Sound.play('explode', 0.6);
      const extra = KILL_FX[look]?.sound;
      if (extra) Sound.play(extra.name, extra.volume);
    }
    else if (!run.back && run.t >= at0 + BACK_MIN && (run.t >= at0 + BACK || liveNow() === 0)) { // played out: the car back
      run.back = true;
      ShowroomView.carGone(false);
      marksOff();
    }
    if (run.back && run.t > run.impactAt + BACK + 1.5 && hold < 0) run = null;
  }
  fx.update(dt, camera);
  for (const p of Object.values(classic)) p.update(dt);
  markFrame(dt);
};
ShowroomView.overlay(frame);

export const KillPreview = {
  // the effect `id` on the car on show: a package thrown, its trail, its burst, the explosion
  test(id, camera = ShowroomView.camera, height = ShowroomView.height) {
    if (!group) make();
    // (a new Test: the last one cleared at once, its marks gone, the car back: nothing stacks)
    fx.clear(); purgeClassic(); marksOff(true);
    if (ShowroomView.carHidden) ShowroomView.carGone(false);
    look = KILL_FX[id] ? id : 'classic';
    run = { t: 0, impactAt: impactAt(look), impactFrame: null, hit: false, kill: false, back: false };
    camera?.updateMatrixWorld?.();
    if (camera) { right.set(1, 0, 0).applyQuaternion(camera.quaternion); up.set(0, 1, 0); } else { right.set(1, 0, 0); up.set(0, 1, 0); }
    right.y = 0; right.normalize();
    const h = Math.max(1, height || 1.4);
    from.copy(right).multiplyScalar(-5).addScaledVector(up, h + 0.8);
    to.set(0, floorY() + h * 0.75, 0);
    Sound.play('throw', 0.5);
    // (a still, ?killtest=<s>: played on to <s> s at once, in 60ths, so a slow frame rate cannot leave it short)
    if (hold >= 0 && ShowroomView.scene) { while (run.t < hold - 1e-6) frame(ShowroomView.scene, Math.min(1 / 60, hold - run.t), camera); }
  },
  clear() { run = null; fx?.clear(); purgeClassic(); marksOff(true); if (box) box.visible = false; ShowroomView.carGone(false); },
  get hold() { return hold; },
  // for a check or a picture: what is alive
  get state() { return { look, t: run ? run.t : null, impactAt: run ? run.impactAt : null, impactFrame: run ? run.impactFrame : null, box: !!box?.visible, live: fx ? fx.live() : 0, classic: classic ? classic.Fire.live() + classic.Smoke.live() + classic.Particles.live() : 0, classicFire: classic ? classic.Fire.live() : 0, carHidden: ShowroomView.carHidden, marks: marks ? marks.filter(m => m.visible).length : 0, back: !!run?.back }; },
  // for a check: the pools of the preview's own system (their particles' floors and heights) and the timeline
  get fx() { return fx; },
  // (kill = impact: the package lands and the car goes up on the same frame; of the effect on test)
  get timeline() { const at0 = impactAt(look); return { impact: at0, kill: at0, backMin: at0 + BACK_MIN, back: at0 + BACK, rest: REST }; },
  frame,
};
