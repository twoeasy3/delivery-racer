import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Collision } from '../collision.js';
import { Player } from '../player.js';
import { LEVEL } from '../levels.js';
import { UpTrain } from '../bullettrain.js';
import { Game } from '../game.js';
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

// ---- SIDE EMOJI MARKS (CHECKLIST 501; IDEAS-good-evil-11-Oct.md idea 7): the face says its car's side by SHAPE: Good wears a
// halo and a pair of wings, Evil a pair of horns and holds a pitchfork (props on the ball only: no figure). One flat picture per
// side (a 256 x 256 canvas, 256 KB, unlit), turned to the camera through the ball's middle, so the ball hides what is behind
// it (the horns grow out of it, the wings out of its sides). Two InstancedMeshes (Good, Evil) shared by every face: at most two
// draw calls, none while nothing pops up; nothing allocated per frame. With the marks on, the player's own face pops up too
// (its side's: happy for Good, angry for Evil) as a run starts and now and then after. Render only: no rule reads it.
// THE SETTING: Options 'Side emoji marks', ON by default, kept in this browser's localStorage (`delivery_emojimark` = '0' when
// off; never the save). ?emojimark=on / off for the visit only (hold: on, and every face up and held, for stills).
const MARK_KEY = 'delivery_emojimark';
const markParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('emojimark') : null;
const readMark = () => { try { return localStorage.getItem(MARK_KEY) !== '0'; } catch { return true; } };
export const EmojiMark = { on: markParam === 'on' || markParam === 'hold' ? true : markParam === 'off' ? false : readMark() };
const HOLD = markParam === 'hold'; // (?emojimark=hold, for stills: every face up and held, the player's too)
const markPicture = (draw) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  // drawn in the ball's own metres, y up: the picture is 2 x 2 m with the ball (r 0.5) at (0, 0) and its middle 0.2 m up
  g.setTransform(128, 0, 0, -128, 128, 153.6);
  g.lineCap = g.lineJoin = 'round';
  draw(g);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
};
const OUTLINE = '#20141a';
const inked = (g, path, fill, w = 0.05) => { g.fillStyle = fill; g.fill(path); g.strokeStyle = OUTLINE; g.lineWidth = w; g.stroke(path); };
const drawGood = (g) => {
  for (const s of [-1, 1]) { // the wings, from the ball's sides: a swept top edge and three feathers under it
    const w = new Path2D();
    w.moveTo(s * 0.36, 0.30);
    w.quadraticCurveTo(s * 0.66, 0.66, s * 0.98, 0.62);
    w.quadraticCurveTo(s * 1.0, 0.38, s * 0.90, 0.30);
    w.quadraticCurveTo(s * 0.94, 0.10, s * 0.78, 0.04);
    w.quadraticCurveTo(s * 0.80, -0.16, s * 0.60, -0.16);
    w.quadraticCurveTo(s * 0.56, -0.30, s * 0.36, -0.24);
    w.closePath();
    inked(g, w, '#ffffff', 0.055);
    g.strokeStyle = '#9fb0cc'; g.lineWidth = 0.03;
    g.beginPath();
    g.moveTo(s * 0.50, 0.24); g.lineTo(s * 0.86, 0.36);
    g.moveTo(s * 0.48, 0.12); g.lineTo(s * 0.74, 0.10);
    g.moveTo(s * 0.46, 0.00); g.lineTo(s * 0.58, -0.08);
    g.stroke();
  }
  // the halo, over the top of the ball: an outlined gold ring seen a little from above
  g.beginPath(); g.ellipse(0, 0.74, 0.36, 0.11, 0, 0, Math.PI * 2);
  g.strokeStyle = OUTLINE; g.lineWidth = 0.13; g.stroke();
  g.strokeStyle = '#ffc61a'; g.lineWidth = 0.075; g.stroke();
  g.strokeStyle = '#fff4b0'; g.lineWidth = 0.022; g.stroke();
};
const drawEvil = (g) => {
  for (const s of [-1, 1]) { // the horns, out of the top of the ball, curving up and out to a point
    const h = new Path2D();
    h.moveTo(s * 0.08, 0.40);
    h.quadraticCurveTo(s * 0.30, 0.54, s * 0.50, 0.90);
    h.quadraticCurveTo(s * 0.58, 0.54, s * 0.42, 0.24);
    h.closePath();
    inked(g, h, '#a8150f', 0.05);
  }
  // the pitchfork, held up beside the ball and leaning out: a shaft and three barbed tines
  g.save();
  g.translate(0.74, -0.12);
  g.rotate(-0.16);
  const fork = new Path2D();
  fork.moveTo(0, -0.62); fork.lineTo(0, 0.86);        // the shaft and the middle tine
  fork.moveTo(-0.19, 0.78); fork.lineTo(-0.19, 0.58); // the side tines, on a U-shaped crossbar
  fork.quadraticCurveTo(-0.19, 0.46, 0, 0.46);
  fork.quadraticCurveTo(0.19, 0.46, 0.19, 0.58); fork.lineTo(0.19, 0.78);
  const barbs = new Path2D();
  for (const [x, y] of [[0, 0.86], [-0.19, 0.78], [0.19, 0.78]]) {
    barbs.moveTo(x, y + 0.12); barbs.lineTo(x - 0.07, y - 0.02); barbs.lineTo(x + 0.07, y - 0.02); barbs.closePath();
  }
  g.strokeStyle = OUTLINE; g.lineWidth = 0.12; g.stroke(fork); g.stroke(barbs);
  g.fillStyle = OUTLINE; g.fill(barbs);
  g.strokeStyle = '#e8352a'; g.lineWidth = 0.06; g.stroke(fork);
  g.fillStyle = '#e8352a'; g.fill(barbs);
  g.restore();
};
let marks = null; // [Good, Evil], made the first time a marked face pops up
const markGeo = new THREE.PlaneGeometry(2, 2).translate(0, 0.2, 0);
const makeMarks = (most) => {
  marks = [drawGood, drawEvil].map((draw) => {
    const mesh = new THREE.InstancedMesh(markGeo, new THREE.MeshBasicMaterial({ map: markPicture(draw), transparent: true,
      alphaTest: 0.04, depthWrite: false, side: THREE.DoubleSide }), most);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false; // (its instances move: a bounding sphere would go stale)
    mesh.count = 0;
    mesh.visible = false;
    scene.add(mesh); // (in the scene's own terms, as the faces are)
    return mesh;
  });
};
const markAt = new THREE.Matrix4(), markScale = new THREE.Vector3();
const PLAYER_EVERY = 3; // (the player's own face: about this many times the traffic's emoteEvery between pops)
let wasPlaying = false;
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
// the overtaking train (an edge railway's right track, bullettrain.js UpTrain) once it has passed the player and is ahead on the
// screen: the rival's glowing arrow over its nose, in the train's red (render/hud.js shows it behind the player till then). The
// first of the rivals' marks, free on a level without rivals
const syncTrainMark = (now) => {
  const mark = rivalMarks[0];
  if (!mark || LEVEL.grid?.rival) return;
  mark.visible = UpTrain.active && UpTrain.passed && UpTrain.onTrack;
  if (!mark.visible) return;
  mark.userData.glow.color.setHex(0xff3a2a);
  UpTrain.carriage(0, at);
  Track.toWorld(at.s + CONFIG.bulletTrain.carLength / 2 - 4, at.lat, tmp);
  const sx = scene.scale.x < 0 ? -tmp.x : tmp.x;
  const size = Math.max(1, Math.hypot(sx - camera.position.x, tmp.y - camera.position.y, tmp.z - camera.position.z) / CONFIG.rivalMark.growFrom);
  mark.scale.setScalar(size);
  mark.position.set(tmp.x, tmp.y + CONFIG.bulletTrain.height + CONFIG.rivalMark.above + Math.sin(now / 300) * 0.15 * size, tmp.z);
  mark.rotation.y = now / 700;
};
const at = { s: 0, lat: 0 };
export const syncEmotes = (dt, now) => {
  syncRivalMark(now);
  syncTrainMark(now);
  // an angel or a jerk (mysteries): every face stays up for as long as it lasts, held once it
  // has popped up and swung round to the front (see below)
  const held = HOLD || Player.mystery === 'angel' || Player.mystery === 'jerk';
  const playing = Game.state === 'playing' && !Game.screensaver && !Game.raceWatch, started = playing && !wasPlaying;
  wasPlaying = playing;
  if (EmojiMark.on && !marks) makeMarks(emotes.length);
  if (marks) marks[0].count = marks[1].count = 0;
  for (let i = 0; i < emotes.length; i++) {
    const v = Collision.bodies[i], e = emotes[i];
    if (v.isPlayer) { // the player's own face: only with the side marks on (it is there to say the side), and never paused
      if (!EmojiMark.on || !playing || !v.active) { e.mesh.visible = false; e.show = 0; continue; }
      if (started) { e.show = 0; e.wait = 1; }
      if (!Game.paused) {
        if (e.show > 0) e.show -= dt;
        else if ((e.wait -= dt) <= 0) { e.wait = PLAYER_EVERY * CONFIG.emoteEvery * (0.8 + Math.random() * 0.4); e.show = CONFIG.emoteTime; }
        if (HOLD) e.show = Math.max(e.show, CONFIG.emoteTime - 0.25);
      }
      e.mesh.visible = e.show > 0;
      if (!e.mesh.visible) continue;
      Track.toWorld(v.s, v.lat, tmp);
      tmp.y += Math.max(0, v.air || 0);
      placeFace(e, i, v.evil ? 'angry' : 'happy', v.height, v.evil, now);
      continue;
    }
    // (toads have no moods, and parked cars nobody in them to have one)
    if (!v.active || v.toad || v.parked || v.junction) { e.mesh.visible = false; e.show = 0; e.last = null; continue; }
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
    placeFace(e, i, v.emotion, v.height, v.evil, now);
  }
  if (marks) for (const mesh of marks) { mesh.visible = mesh.count > 0; if (mesh.visible) mesh.instanceMatrix.needsUpdate = true; }
};
// a face that is up, over the car whose road point is in tmp: popped, bobbing, turned to the camera, and its side's mark with it
const placeFace = (e, i, mood, height, evil, now) => {
  const pop = Math.min(1, e.show * 6, (CONFIG.emoteTime - e.show) * 6); // pop in and out
  e.mesh.material = MOOD_FACES[mood];
  e.mesh.scale.setScalar(Math.max(0.01, pop));
  e.mesh.position.set(tmp.x, tmp.y + height + 1.0 + Math.sin(now / 250 + i) * 0.1, tmp.z);
  // (turned to the camera in the scene's own terms, which a left-hand level mirrors)
  camAt.copy(camera.position);
  if (scene.scale.x < 0) camAt.x = -camAt.x;
  e.mesh.quaternion.setFromRotationMatrix(look.lookAt(camAt, e.mesh.position, UP));
  if (EmojiMark.on && marks) { // (square to the camera: the face turns about inside it, the mark does not)
    const mesh = marks[evil ? 1 : 0];
    mesh.setMatrixAt(mesh.count++, markAt.compose(e.mesh.position, e.mesh.quaternion, markScale.setScalar(Math.max(0.01, pop))));
  }
  // the face swings round to the front as it pops up, then glances about a little
  const swing = Math.max(0, 1 - (CONFIG.emoteTime - e.show) * 4);
  e.mesh.rotateY((i % 2 ? 1 : -1) * 1.4 * swing * swing + Math.sin(now / 420 + i * 1.7) * 0.3);
  e.mesh.rotateX(Math.sin(now / 530 + i * 2.3) * 0.15);
};

// ---- the setting's button (Options > Settings) ----
if (typeof document !== 'undefined') {
  const b = document.getElementById('emojiMarkBtn');
  if (b) {
    const show = () => { b.textContent = 'Side emoji marks: ' + (EmojiMark.on ? 'on' : 'off'); };
    b.addEventListener('click', () => {
      EmojiMark.on = !EmojiMark.on;
      try { if (EmojiMark.on) localStorage.removeItem(MARK_KEY); else localStorage.setItem(MARK_KEY, '0'); } catch { /* (no storage: for this visit) */ }
      show();
    });
    show();
  }
}
