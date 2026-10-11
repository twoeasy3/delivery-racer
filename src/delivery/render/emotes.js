import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Collision } from '../collision.js';
import { Player } from '../player.js';
import { LEVEL } from '../levels.js';
import { scene, camera, tmp } from './scene.js';
import { FACE_COLORS, FEATURES, INK } from './faces.js';

// ---- mood faces: emoji spheres that pop up over cars now and then ---------------
const makeFace = (mood) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = FACE_COLORS[mood];
  ctx.fillRect(0, 0, 256, 128);
  // the face, drawn on its 24 x 24 grid (see render/faces.js) and scaled onto the side of the
  // sphere that faces local +z (u = 0.25), the eyes at (64 +- 15, 52)
  const k = 3.75;
  ctx.setTransform(k, 0, 0, k, 64 - 12 * k, 52 - 10 * k);
  ctx.fillStyle = ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const x of [8, 16]) {
    ctx.beginPath();
    ctx.arc(x, 10, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  const f = FEATURES[mood];
  if (f.mouth) ctx.stroke(new Path2D(f.mouth));
  if (f.brows) ctx.stroke(new Path2D(f.brows)); // (slanting down toward the nose)
  if (f.teeth) { // (the teeth, outlined, and the lip they hang from)
    const teeth = new Path2D(f.teeth);
    ctx.fillStyle = '#fff';
    ctx.fill(teeth);
    ctx.lineWidth = 0.35;
    ctx.stroke(teeth);
    ctx.lineWidth = 1.8;
    ctx.stroke(new Path2D(f.lip));
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  // shaded like a glossy ball, with a little glow of its own so it still shows at night
  return new THREE.MeshPhongMaterial({ map, shininess: 60, specular: 0x555555,
    emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.2 });
};
const MOOD_FACES = { happy: makeFace('happy'), neutral: makeFace('neutral'), angry: makeFace('angry') };
const emoteGeo = new THREE.SphereGeometry(0.5, 20, 14);
const look = new THREE.Matrix4(), camAt = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const emotes = Collision.bodies.map(() => {
  const mesh = new THREE.Mesh(emoteGeo, MOOD_FACES.neutral);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, wait: Math.random() * CONFIG.emoteEvery, show: 0, last: null };
});
// ---- the rival courier's marker (a level's "rival"): a glowing magenta arrow hanging over it, pointing
// down at it, bobbing and turning; above where its mood face pops up (so never over it), and bigger the
// further off it is, so it can be picked out down the road (see CONFIG.rivalMark)
// (one for each rival, up to CONFIG.rival.most, in its own colour)
const RIVAL_MARK = 0xff2bd6;
const rivalMarks = Array.from({ length: CONFIG.rival.most }, () => {
  const g = new THREE.Group(), glow = new THREE.MeshBasicMaterial({ color: RIVAL_MARK });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.75, 4), glow);
  head.rotation.x = Math.PI; // (pointing down)
  head.position.y = 0.375;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.28), glow);
  shaft.position.y = 1.05;
  g.add(head, shaft);
  g.visible = false;
  g.userData.glow = glow;
  scene.add(g);
  return g;
});
const syncRivalMark = (now) => {
  const M = CONFIG.rivalMark, rivals = LEVEL.grid?.rival ? Collision.bodies.filter(v => v.racer) : [];
  rivalMarks.forEach((mark, k) => {
    const rival = rivals[k];
    mark.visible = !!rival && rival.active && !rival.done;
    if (!mark.visible) return;
    mark.userData.glow.color.setHex(rival.markColor ?? RIVAL_MARK);
    Track.toWorld(rival.s, rival.lat, tmp);
    const sx = scene.scale.x < 0 ? -tmp.x : tmp.x; // (the camera's in world terms; the scene may be mirrored)
    const far = Math.hypot(sx - camera.position.x, tmp.y - camera.position.y, tmp.z - camera.position.z);
    const size = Math.max(1, far / M.growFrom);
    mark.scale.setScalar(size);
    // (its tip clear above the top of the mood face, however big it has grown)
    mark.position.set(tmp.x, tmp.y + rival.height + M.above + Math.sin(now / 300 + k * 2) * 0.15 * size, tmp.z);
    mark.rotation.y = now / 700 + k;
  });
};
export const syncEmotes = (dt, now) => {
  syncRivalMark(now);
  // an angel or a jerk (mysteries): every face stays up for as long as it lasts, held once it
  // has popped up and swung round to the front (see below)
  const held = Player.mystery === 'angel' || Player.mystery === 'jerk';
  for (let i = 0; i < emotes.length; i++) {
    const v = Collision.bodies[i], e = emotes[i];
    // (toads have no moods, and parked cars nobody in them to have one)
    if (!v.active || v.isPlayer || v.toad || v.parked || v.junction) { e.mesh.visible = false; e.show = 0; e.last = null; continue; }
    if (e.last !== null && e.last !== v.emotion) e.show = CONFIG.emoteTime; // mood swing: show it now
    e.last = v.emotion;
    if (v.showMood) { e.show = CONFIG.emoteTime; v.showMood = false; } // hit by a package
    if (held && e.show <= 0) e.show = CONFIG.emoteTime;
    if (e.show > 0) {
      e.show -= dt;
      if (held) e.show = Math.max(e.show, CONFIG.emoteTime - 0.25);
    } else if ((e.wait -= dt) <= 0) {
      e.wait = CONFIG.emoteEvery * (0.6 + Math.random() * 0.8);
      e.show = CONFIG.emoteTime;
    }
    e.mesh.visible = e.show > 0;
    if (!e.mesh.visible) continue;
    Track.toWorld(v.s, v.lat, tmp);
    const pop = Math.min(1, e.show * 6, (CONFIG.emoteTime - e.show) * 6); // pop in and out
    e.mesh.material = MOOD_FACES[v.emotion];
    e.mesh.scale.setScalar(Math.max(0.01, pop));
    e.mesh.position.set(tmp.x, tmp.y + v.height + 1.0 + Math.sin(now / 250 + i) * 0.1, tmp.z);
    // (turned to the camera in the scene's own terms, which a left-hand level mirrors)
    camAt.copy(camera.position);
    if (scene.scale.x < 0) camAt.x = -camAt.x;
    e.mesh.quaternion.setFromRotationMatrix(look.lookAt(camAt, e.mesh.position, UP));
    // the face swings round to the front as it pops up, then glances about a little
    const swing = Math.max(0, 1 - (CONFIG.emoteTime - e.show) * 4);
    e.mesh.rotateY((i % 2 ? 1 : -1) * 1.4 * swing * swing + Math.sin(now / 420 + i * 1.7) * 0.3);
    e.mesh.rotateX(Math.sin(now / 530 + i * 2.3) * 0.15);
  }
};
