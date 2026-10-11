// ---- RACE WATCH: the race screensaver's coverage (the race and its timing: ../racewatch.js) ----------
// The cameras: a trackside camera set up ahead of the watched car, panning and zooming as it comes
// past (a fresh one further on once it has gone by); a chase camera on its tail; a helicopter shot
// from high and to one side. And the graphics: a leaderboard (position, driver, gap to the leader or
// laps down, places gained since the start, wrecks caused, times wrecked, mood, a critical hit or spin out lately, health) with the whole field on it, a caption naming the
// watched car and the camera, and the news of the latest wreck.
import * as THREE from 'three';
import { LEVEL } from '../levels.js';
import { levelName } from '../levelText.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { RaceWatch } from '../racewatch.js';
import { camera, scene, tmp, tmp2, aim } from './scene.js';
import { levelGroup } from './road.js';
import { racePaint } from './cars.js';
import { damp } from '../util.js';
import { emotionOf } from '../physics.js';
import { faceSvg } from './faces.js';

let cut = -1, spot = null;
const at = new THREE.Vector3(), want = new THREE.Vector3();
// where a racer is, a metre up
const carAt = (c, out) => { Track.toWorld(c.s, c.lat, out); out.y += 1; return out; };
// a trackside camera ahead of the car: off the outside of the road, up on a tower
// (where the level has grandstands or pit garages on that side, it is never out behind them: the
// other side if that is clear, or else on the wall itself, up high, looking down past their roofs)
const standOn = (side, s) => (LEVEL.stands || []).some(st => (st.side === 'left' ? -1 : 1) === side && s > st.from - 25 && s < st.to + 25);
// a camera there: on the outside of the bend (or the other side, or either), so far out and so high
const candidate = (s, flip, out, up) => {
  let side = Track.bend(s + 10) > 0 ? -1 : Track.bend(s + 10) < 0 ? 1 : Math.random() < 0.5 ? -1 : 1;
  if (flip) side = -side;
  if (standOn(side, s) && !standOn(-side, s)) side = -side;
  const boxed = standOn(side, s), d = boxed ? 0.5 : out;
  const pos = new THREE.Vector3();
  Track.toWorld(s, side < 0 ? Track.lo(s) - d : Track.hi(s) + d, pos);
  pos.y += boxed ? 18 + up : 8 + up; // (on a camera tower: up over the catch fence and the lamp posts)
  return { s, pos };
};
// can a camera at `from` see the road from s0 to s1 (a car's height up)? Every solid thing of the
// scenery counts: towers, stands, landmarks, trees; not the flat strips on the road, nor the
// see-through catch fences. (On a left-hand level the scene is drawn mirrored, and so is the test.)
const ray = new THREE.Raycaster(), dir = new THREE.Vector3(), eye = new THREE.Vector3(), target = new THREE.Vector3();
export const sees = (from, s0, s1) => {
  const flip = scene.scale.x < 0 ? -1 : 1;
  eye.set(from.x * flip, from.y, from.z);
  levelGroup.updateMatrixWorld();
  for (let k = 0; k <= 4; k++) {
    Track.toWorld(s0 + (s1 - s0) * k / 4, 0, target);
    target.set(target.x * flip, target.y + 1, target.z);
    dir.subVectors(target, eye);
    const d = dir.length();
    ray.set(eye, dir.normalize());
    ray.far = d - 1;
    if (ray.intersectObject(levelGroup, true).some(h => !h.object.userData.flat && !h.object.material.transparent)) return false;
  }
  return true;
};
// a trackside camera for the car: the first of a few tries that sees the road it is coming along
const setSpot = (c) => {
  let best = null;
  for (let k = 0; k < 10 && !best; k++) {
    const s = c.s + 60 + Math.random() * 60;
    const at = candidate(s, k % 2 === 1, 3 + Math.random() * 8, k < 5 ? Math.random() * 6 : 6 + Math.random() * 10);
    if (sees(at.pos, s - 70, s + 10)) best = at;
  }
  spot = best || candidate(c.s + 80, false, 2, 16); // (and failing that, close in and high up)
};
// how many of the trackside cameras there could be round the lap see clear (a check: ?camcheck)
export const auditCameras = () => {
  let clear = 0, blind = [], n = 0;
  for (let s = 0; s < Track.length; s += 15, n++) {
    spot = null;
    setSpot({ s: s - 80 });
    if (sees(spot.pos, spot.s - 70, spot.s + 10)) clear++;
    else blind.push(Math.round(spot.s));
  }
  return { n, clear, blind };
};

export const raceCamera = (dt) => {
  const c = RaceWatch.focus;
  if (!c) return;
  const fresh = cut !== RaceWatch.cut;
  cut = RaceWatch.cut;
  carAt(c, at);
  const k = fresh ? 1 : damp(4, dt);
  if (RaceWatch.shot === 'trackside') {
    // (a new one further on once the car is well past this one, or it has fallen too far behind it)
    if (fresh || !spot || c.s - spot.s > 35 || spot.s - c.s > 260) setSpot(c);
    camera.position.copy(spot.pos);
    tmp2.copy(at);
    aim(tmp2);
    const d = spot.pos.distanceTo(at);
    camera.fov = THREE.MathUtils.clamp(2 * Math.atan(7 / d) * 180 / Math.PI, 12, 60); // (zoomed in to frame the car)
  } else if (RaceWatch.shot === 'chase') {
    Track.toWorld(c.s - 11, c.lat, want);
    want.y += 3.4;
    camera.position.lerp(want, k);
    Track.toWorld(c.s + 30, c.lat, tmp2);
    tmp2.y += 1;
    aim(tmp2);
    camera.fov = 62;
  } else { // the helicopter: high, behind and off to one side
    Track.toWorld(c.s - 35, c.lat + 30, want);
    want.y += 45;
    camera.position.lerp(want, k);
    tmp2.copy(at);
    aim(tmp2);
    camera.fov = 38;
  }
  camera.updateProjectionMatrix();
};

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const plain = (text) => String(text).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';'); // (a level's own words, safe to put into HTML: a level can come from a file)
// ---- the minimap: the circuit from above, every racer a dot in its livery (the watched one ringed,
// the leader outlined in white). North (the start's heading) up; on a left-hand level, as the
// mirrored scene shows it.
const map = document.getElementById('raceMap'), pen = map.getContext('2d');
let outline = null, outlineFor = null;
const mapPoint = (s, lat, view) => {
  Track.toWorld(s, lat, tmp);
  const x = Track.mirrored ? tmp.x : -tmp.x; // (the driver's right is -x)
  return [view.ox + (x - view.x0) * view.k, view.oy - (tmp.z - view.z0) * view.k];
};
const drawMap = () => {
  if (outlineFor !== Track) { // the circuit's outline and the scale, once a circuit
    outlineFor = Track;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let s = 0; s < Track.length; s += 10) {
      Track.toWorld(s, 0, tmp);
      const x = Track.mirrored ? tmp.x : -tmp.x;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, tmp.z); z1 = Math.max(z1, tmp.z);
    }
    const pad = 14, k = Math.min((map.width - 2 * pad) / (x1 - x0), (map.height - 2 * pad) / (z1 - z0));
    const view = { x0, z0, k, ox: (map.width - (x1 - x0) * k) / 2, oy: map.height - (map.height - (z1 - z0) * k) / 2 };
    outline = { view, path: new Path2D() };
    for (let s = 0; s <= Track.length; s += 6) {
      const [px, py] = mapPoint(s, 0, view);
      if (s === 0) outline.path.moveTo(px, py); else outline.path.lineTo(px, py);
    }
    outline.start = mapPoint(0, 0, view);
  }
  pen.clearRect(0, 0, map.width, map.height);
  pen.lineJoin = 'round';
  pen.strokeStyle = 'rgba(255, 255, 255, .25)';
  pen.lineWidth = 7;
  pen.stroke(outline.path);
  pen.strokeStyle = 'rgba(220, 225, 235, .9)';
  pen.lineWidth = 2;
  pen.stroke(outline.path);
  pen.fillStyle = '#e10600'; // (the start / finish line)
  pen.fillRect(outline.start[0] - 4, outline.start[1] - 1.5, 8, 3);
  const leader = RaceWatch.standings()[0];
  // (the watched car drawn last, on top)
  for (const c of [...RaceWatch.racers.filter(r => r !== RaceWatch.focus), RaceWatch.focus]) {
    if (!c) continue;
    const [px, py] = mapPoint(c.s, c.lat, outline.view);
    pen.globalAlpha = c.active ? 1 : 0.35;
    pen.beginPath();
    pen.arc(px, py, c === RaceWatch.focus ? 5 : 3.5, 0, Math.PI * 2);
    pen.fillStyle = hex(racePaint(c));
    pen.fill();
    if (c === leader || c === RaceWatch.focus) {
      pen.lineWidth = c === RaceWatch.focus ? 2.5 : 1.5;
      pen.strokeStyle = c === RaceWatch.focus ? '#e10600' : '#fff';
      pen.stroke();
    }
  }
  pen.globalAlpha = 1;
};

// ---- the sound, as the camera hears it: the watched car's engine, louder the nearer it is, its note
// higher coming and lower going (the Doppler shift), and the rest of the field near the camera
const SOUND = 340; // m/s
let heardCut = -1, lastD = 0;
const other = new THREE.Vector3();
export const raceAudio = (dt) => {
  const c = RaceWatch.focus;
  if (!c || !c.active) return { speed: -1, gain: 0, pitch: 1, pack: 0 };
  carAt(c, other);
  const d = camera.position.distanceTo(other);
  const closing = heardCut === RaceWatch.cut && dt > 0 ? (d - lastD) / dt : 0; // (none across a cut)
  heardCut = RaceWatch.cut;
  lastD = d;
  const pitch = SOUND / (SOUND + THREE.MathUtils.clamp(closing, -120, 120));
  const gain = RaceWatch.shot === 'chase' ? 1 : THREE.MathUtils.clamp(25 / d, 0.1, 1);
  let pack = 0;
  for (const o of RaceWatch.racers) {
    if (o === c || !o.active) continue;
    pack += Math.max(0, 1 - camera.position.distanceTo(carAt(o, other)) / 120);
  }
  return { speed: Math.abs(c.vs), gain, pitch, pack: Math.min(1, pack / 4) };
};

// ---- the graphics ----
const board = document.getElementById('raceBoard');
const directorBtn = document.getElementById('directorBtn');
// a racer on the board picked to follow; the button hands the coverage back to the race director
// (on pointerdown: the board is redrawn four times a second, under a click's press and release)
// (collapsed to just each driver's letters: to start with on a small screen; a tap on the header switches)
let collapsed = matchMedia('(max-width: 700px), (max-height: 500px)').matches;
board.addEventListener('pointerdown', (e) => {
  if (!Game.raceWatch) return;
  if (e.target.closest('.head')) {
    collapsed = !collapsed;
    drawn = 0;
    return;
  }
  const row = e.target.closest('[data-i]');
  if (!row) return;
  const c = RaceWatch.racers[Number(row.dataset.i)];
  if (c) RaceWatch.follow(c);
  drawn = 0; // (redrawn at once, the pick showing)
});
directorBtn.addEventListener('click', () => { RaceWatch.director(); drawn = 0; });
const caption = document.getElementById('raceCaption');
let drawn = 0;
const SHOTS = { trackside: 'TRACKSIDE', chase: 'ONBOARD', heli: 'HELICAM' };
// (the mood faces, as the ones that pop up over the cars: see render/faces.js)
const FACES = { happy: faceSvg('happy'), neutral: faceSvg('neutral'), angry: faceSvg('angry') };
// (good or evil: a halo, or horns)
const SIDES = {
  good: '<svg viewBox="0 0 24 24" width="12" height="12"><title>good</title><ellipse cx="12" cy="12" rx="9" ry="4.5" fill="none" stroke="#ffd23f" stroke-width="3"/></svg>',
  evil: '<svg viewBox="0 0 24 24" width="12" height="12"><title>evil</title><path d="M3 21 Q2 9 8 3 Q7 12 11 19 Z M21 21 Q22 9 16 3 Q17 12 13 19 Z" fill="#e53935"/></svg>',
};
const MISHAPS = { crit: '<i title="critical hit">❗</i>', spin: '<i title="spun out">🌀</i>' };
export const syncRaceWatch = (now) => {
  if (!Game.raceWatch) return; // (shown only in it: see style.css)
  drawMap(); // (every frame: the dots move smoothly)
  if (now - drawn < 250) return; // (the board: four times a second is plenty)
  drawn = now;
  const order = RaceWatch.standings(), leader = order[0];
  if (!leader) return;
  const lap = Math.min(LEVEL.laps, (leader.laps || 0) + 1), done = RaceWatch.finished.length > 0;
  const head = `<div class="head">${collapsed ? '' : plain(levelName(LEVEL).toUpperCase())}<span>${done ? 'FLAG' : 'LAP ' + lap + ' / ' + plain(LEVEL.laps)} ${collapsed ? '▸' : '▾'}</span></div>`;
  board.classList.toggle('collapsed', collapsed);
  if (collapsed) { // (just the order, in one column: position, colour, letters, and places gained or lost)
    board.innerHTML = head + '<div class="abbrs">' + order.map((c, i) => {
      const pos = i + 1, gain = c.grid - pos;
      return `<div class="cell${c === RaceWatch.focus ? ' focus' : ''}${c === RaceWatch.pinned ? ' pinned' : ''}${c.active ? '' : ' out'}" data-i="${RaceWatch.racers.indexOf(c)}">` +
        `<span class="pos">${pos}</span><span class="dot" style="background:${hex(racePaint(c))}"></span><span class="abbr">${c.abbr}</span>` +
        `<span class="gain ${gain > 0 ? 'up' : gain < 0 ? 'down' : ''}">${gain > 0 ? '▲' + gain : gain < 0 ? '▼' + -gain : '–'}</span></div>`;
    }).join('') + '</div>';
  }
  const rows = [];
  for (const c of collapsed ? [] : order) {
    const pos = order.indexOf(c) + 1, down = RaceWatch.lapsDown(c, leader), gap = RaceWatch.gap(c, leader);
    const health = c.active ? Math.max(0, c.health / c.maxHealth) : 0;
    const split = c === leader ? (done ? 'WINNER' : 'LEADER')
      : c.done ? 'FINISHED' : down >= 1 ? '+' + down + (down > 1 ? ' LAPS' : ' LAP')
      : gap === null ? '' : '+' + gap.toFixed(3);
    rows.push(`<div class="row${c === RaceWatch.focus ? ' focus' : ''}${c === RaceWatch.pinned ? ' pinned' : ''}${c.active ? '' : ' out'}" data-i="${RaceWatch.racers.indexOf(c)}">` +
      `<span class="pos">${pos}</span><span class="side">${SIDES[c.evil ? 'evil' : 'good']}</span><span class="dot" style="background:${hex(racePaint(c))}"></span>` +
      `<span class="name">${c.driverName}</span><span class="gap">${split}</span>` +
      `<span class="gain ${pos < c.grid ? 'up' : pos > c.grid ? 'down' : ''}">${pos < c.grid ? '▲' + (c.grid - pos) : pos > c.grid ? '▼' + (pos - c.grid) : '–'}</span>` +
      `<span class="kills">${c.kills || ''}</span><span class="wrecks">${c.wrecks || ''}</span>` +
      `<span class="mood">${FACES[emotionOf(c.mood)]}</span>` +
      `<span class="mishap">${MISHAPS[RaceWatch.mishap(c)] || ''}</span>` +
      `<span class="health"><i style="width:${health * 100}%;background:${health > 0.5 ? '#3ddc68' : health > 0.25 ? '#ffd23f' : '#ff5a4f'}"></i></span></div>`);
  }
  board.classList.toggle('dense', order.length > 24); // (a big field packed in tighter)
  if (!collapsed) board.innerHTML = head +
    `<div class="row labels"><span class="pos"></span><span class="side"></span><span class="dot"></span><span class="name"></span><span class="gap">GAP</span><span class="gain" title="places gained since the start">+/-</span><span class="kills" title="wrecks caused">💥</span><span class="wrecks" title="times wrecked">☠</span><span class="mood"></span><span class="mishap"></span><span class="health">HP</span></div>` +
    rows.join('');
  const c = RaceWatch.focus, news = Game.time - RaceWatch.ticker.at < 4 ? RaceWatch.ticker.text : '';
  // (and the watched car's gaps to the cars either side of it on the road)
  const at = order.indexOf(c), front = order[at - 1], back = order[at + 1];
  const between = (a, b, sign) => {
    if (!a || !b || a.done || b.done) return '';
    const down = RaceWatch.lapsDown(b, a);
    if (down >= 1) return sign + down + (down > 1 ? ' LAPS' : ' LAP');
    const t = RaceWatch.gap(b, a);
    return t === null ? '' : sign + t.toFixed(3);
  };
  const ahead = c && between(front, c, '▲ '), behind = c && between(c, back, '▼ ');
  directorBtn.style.display = RaceWatch.pinned ? '' : 'none';
  caption.innerHTML = (c ? `<b>P${at + 1}</b> ${c.driverName} <i>${SHOTS[RaceWatch.shot]}</i>` +
    (c === RaceWatch.pinned ? ' <i>FOLLOWING</i>' : '') +
    (c.slingLeft > 0 && !(c.tow > 0.2) ? ' <i class="tow sling">SLINGSHOT</i>' : c.tow > 0.2 ? ' <i class="tow">SLIPSTREAM</i>' : '') +
    (ahead || behind ? `<div class="gaps">${ahead ? `<span>P${at} ${ahead}</span>` : ''}${behind ? `<span>P${at + 2} ${behind}</span>` : ''}</div>` : '') : '') +
    (news ? `<div class="news">${news}</div>` : '');
};
