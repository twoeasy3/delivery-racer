// ---- LANE GIMMICKS, drawn: the boost pads and the dead-end lanes (what they do: ../lanegimmicks.js; the handrails and
// the lanes' end walls are obstacles, drawn as obstacles). A boost pad: a belt over the lane whose stripes run the way of
// travel (one small canvas, scrolled: no per-frame geometry), a lit edge along each side; in a theme whose `pad` is
// 'travelator' (the mall) a moving walkway: a dark belt with ridges and chevrons, chrome comb plates at the ends; in one whose `pad`
// is 'conveyor' (the steelworks) a conveyor belt: black rubber with cleats and orange chevrons, a yellow side frame each side,
// a steel drum let into the road at each end (its handrails are the belt's yellow guards: obstacleModels.js). A
// dead-end lane: its floor coloured red all along (darker, and striped in hazard yellow and black, over the last
// CONFIG.deadEnd.stripes m), a DEAD END sign on a gantry over the lane `sign` m before the end with amber beacons on it
// (flashing while the player is in the lane with `warn` m to go), and a red arrow on the floor pointing to the open lane
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { THEMES } from '../themes.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { LaneGimmicks } from '../lanegimmicks.js';
import { scene, tmp, clearGroup } from './scene.js';
import { buildStrip } from './road.js';
import { ceilingAt } from './tunnelshape.js';

const group = new THREE.Group();
scene.add(group);
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const flat = (color, offset, extra) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset, ...extra });
const BEACON_ON = 0xffb020, BEACON_OFF = 0x5a4010;
let belts = [], ends = [], pillarSigns = [];

// the belt's picture, 64 x 256 (repeated every 4 m along the pad): a travelator's dark belt with pale ridges and a yellow
// chevron; a plain pad's blue strip with a white chevron. Made once each, kept
const pictures = {};
const picture = (skin) => {
  if (pictures[skin]) return pictures[skin];
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  const walkway = skin === 'travelator', belt = skin === 'conveyor';
  c.fillStyle = belt ? '#1d1e21' : walkway ? '#2a2d33' : '#1f6fd0';
  c.fillRect(0, 0, 64, 256);
  if (walkway) { c.fillStyle = '#4a4f57'; for (let y = 0; y < 256; y += 16) c.fillRect(0, y, 64, 3); }
  if (belt) { c.fillStyle = '#3a3c42'; for (let y = 0; y < 256; y += 32) c.fillRect(4, y, 56, 6); } // (the cleats across it)
  c.strokeStyle = belt ? '#ff7a1a' : walkway ? '#ffd23f' : '#ffffff';
  c.lineWidth = 7;
  for (const y of [40, 168]) { c.beginPath(); c.moveTo(10, y + 40); c.lineTo(32, y); c.lineTo(54, y + 40); c.stroke(); }
  const texture = new THREE.CanvasTexture(canvas);
  if (belt) texture.colorSpace = THREE.SRGBColorSpace; // (the belt's black stays black)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.userData.shared = true;
  pictures[skin] = texture;
  return texture;
};
// a strip over the lane from a to b, u across 0..1, v along s / 4 (the picture's repeat)
const belt = (a, b, lat, half, y) => {
  const pos = [], uv = [], idx = [];
  let n = 0;
  for (let s = a; ; s += 2, n++) {
    const q = Math.min(s, b);
    Track.toWorld(q, lat(q) - half, tmp); pos.push(tmp.x, tmp.y + y, tmp.z); uv.push(0, q / 4);
    Track.toWorld(q, lat(q) + half, tmp); pos.push(tmp.x, tmp.y + y, tmp.z); uv.push(1, q / 4);
    if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    if (q >= b) break;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
};
const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const at = (s, lat, y = 0) => { // (a group on the road at (s, lat), local +z the player's way, +x to the left)
  const g = new THREE.Group();
  g.rotation.y = Track.toWorld(s, lat, tmp);
  g.position.set(tmp.x, tmp.y + y, tmp.z);
  group.add(g);
  return g;
};
const board = (text, bg, fg, w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  c.fillStyle = bg;
  c.fillRect(0, 0, 256, 64);
  c.fillStyle = fg;
  c.font = 'bold 44px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 128, 34);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }));
};

Game.onLoad.push(() => {
  clearGroup(group);
  const theme = THEMES[LEVEL.theme] || THEMES.city, LW = CONFIG.laneWidth, skin = theme.pad === 'travelator' || theme.pad === 'conveyor' ? theme.pad : 'plain';
  // ---- the pads
  belts = LaneGimmicks.pads.map((p) => {
    const lat = (s) => Track.laneOffset(p.lane, s), half = LW / 2 - 0.45;
    const material = new THREE.MeshBasicMaterial({ map: picture(skin), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    material.map = picture(skin).clone(); // (its own offset to scroll)
    material.map.needsUpdate = true;
    add(group, belt(p.from, p.to, lat, half, 0.03), material);
    for (const side of [-1, 1]) add(group, buildStrip(p.from, p.to, (s) => lat(s) + side * (half + 0.02), (s) => lat(s) + side * (half + 0.12), 0.035, 2), flat(skin === 'conveyor' ? 0xf2c21d : 0x3ad8ff, -3)); // the lit edges (a belt's: its yellow frame)
    if (skin === 'conveyor') for (const end of [p.from, p.to]) { // the drums at its ends, let into the road (their tops just proud of it)
      const drum = at(end + (end === p.from ? 0.35 : -0.35), lat(end), -0.24);
      const roll = add(drum, new THREE.CylinderGeometry(0.3, 0.3, half * 2 + 0.2, 14), lambert(0x8a9096));
      roll.rotation.z = Math.PI / 2;
    }
    if (skin === 'travelator') for (const end of [p.from, p.to]) { // the comb plates
      const plate = at(end + (end === p.from ? 0.3 : -0.3), lat(end), 0.04);
      add(plate, new THREE.BoxGeometry(half * 2 + 0.3, 0.05, 0.6), lambert(0xc8ccd2));
      for (let x = -half + 0.15; x < half; x += 0.3) add(plate, new THREE.BoxGeometry(0.06, 0.03, 0.5), lambert(0x6f757d), x, 0.04, 0);
    }
    return { material, speed: 1 / 4 * 3.5 }; // (the picture moves 3.5 m/s along the pad: one repeat is 4 m)
  });
  // ---- the dead ends
  const D = CONFIG.deadEnd;
  ends = LaneGimmicks.ends.map((e) => {
    const lat = (s) => Track.laneOffset(e.lane, s), half = LW / 2 - 0.2, wall = e.kind === 'wall';
    add(group, buildStrip(e.from, e.s - D.stripes, (s) => lat(s) - half, (s) => lat(s) + half, 0.028, 2), flat(wall ? 0x8a1a1a : 0xb0402a, -2, { transparent: true, opacity: 0.45 })); // the lane's floor, red
    for (let s = e.s - D.stripes, k = 0; s < e.s - 0.5; s += 2, k++) add(group, buildStrip(s, Math.min(e.s - 0.5, s + 2), (q) => lat(q) - half, (q) => lat(q) + half, 0.03, 2), flat(k % 2 ? 0xf2c21d : 0x1b1d22, -3)); // the stripes
    // an arrow on the floor to the open lane, half way down
    const open = LaneGimmicks.ends.indexOf(e) >= 0 ? (e.lane > 0 ? -1 : 1) : 1, mid = e.from + (e.s - e.from) * 0.55;
    const arrow = at(mid, lat(mid), 0.04);
    add(arrow, new THREE.BoxGeometry(2.0, 0.02, 0.5), glow(0xffffff), 0, 0, 0);
    const head = add(arrow, new THREE.ConeGeometry(0.6, 1.0, 3), glow(0xffffff), open * -1.4, 0, 0); // (local +x is the road's left)
    head.rotation.z = open > 0 ? -Math.PI / 2 : Math.PI / 2;
    head.rotation.x = Math.PI / 2;
    // the divider (Track.divider holds a car out of the lane from here): a low glass barrier along the line between the dead
    // lane and the open one, from the sign to the end, a rail on top, posts every 4 m
    const beside = Track.laneOffset(e.lane > 0 ? e.lane - 1 : e.lane + 1, e.s), dir = Math.sign(beside - lat(e.s)) || 1;
    const lineLat = (s) => lat(s) + dir * LW / 2;
    { const pos = [], idx = [];
      let n = 0;
      for (let s = e.s - D.sign; ; s += 2, n++) { const q = Math.min(s, e.s); Track.toWorld(q, lineLat(q), tmp); pos.push(tmp.x, tmp.y + 0.05, tmp.z, tmp.x, tmp.y + 0.95, tmp.z); if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } if (q >= e.s) break; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      add(group, geo, new THREE.MeshBasicMaterial({ color: 0xbfe0f4, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    }
    add(group, buildStrip(e.s - D.sign, e.s, (s) => lineLat(s) - 0.05, (s) => lineLat(s) + 0.05, 0.95, 2), lambert(0x6f757d)); // the rail
    for (let s = e.s - D.sign; s <= e.s; s += 4) { const post = at(s, lineLat(s)); add(post, new THREE.BoxGeometry(0.08, 0.95, 0.08), lambert(0x6f757d), 0, 0.47, 0); }
    // the sign: a gantry over the lane `sign` m before the end, the board facing the player, two beacons on it
    const gs = e.s - D.sign, gantry = at(gs, lat(gs)), lamps = [];
    for (const x of [-half - 0.2, half + 0.2]) add(gantry, new THREE.BoxGeometry(0.14, 4.4, 0.14), lambert(0x4a4f57), x, 2.2, 0);
    add(gantry, new THREE.BoxGeometry(half * 2 + 0.6, 0.14, 0.14), lambert(0x4a4f57), 0, 4.4, 0);
    const sign = board('DEAD END', '#d8262b', '#ffffff', 3.0, 0.8);
    sign.position.set(0, 3.7, 0);
    sign.rotation.y = Math.PI;
    gantry.add(sign);
    for (const x of [-half, half]) { const material = glow(BEACON_OFF); add(gantry, new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10), material, x, 4.65, 0); lamps.push(material); }
    return { lamps, e };
  });
  // ---- the pillars (drawn as obstacles): a PILLARS board hung over their lane `sign` m before the first, from the ceiling (no posts
  // in the road: the lanes beside are the way past), two beacons on it, flashing from `warn` m to go until the last is passed
  const P = CONFIG.pillar;
  pillarSigns = LaneGimmicks.groups.map((g) => {
    const gs = g.from - P.sign, lat = Track.laneOffset(g.lane, gs), hang = at(gs, lat), lamps = [], top = ceilingAt(gs) ?? 6;
    add(hang, new THREE.BoxGeometry(3.1, 0.95, 0.12), lambert(0x1b1d22), 0, 4.0, 0);
    const sign = board('PILLARS', '#f2c21d', '#1b1d22', 3.0, 0.8);
    sign.position.set(0, 4.0, -0.07);
    sign.rotation.y = Math.PI;
    hang.add(sign);
    for (const x of [-1.0, 1.0]) add(hang, new THREE.BoxGeometry(0.06, top - 4.45, 0.06), lambert(0x4a4f57), x, (top + 4.45) / 2, 0);
    for (const x of [-1.25, 1.25]) { const material = glow(BEACON_OFF); add(hang, new THREE.CylinderGeometry(0.15, 0.15, 0.26, 10), material, x, 4.6, 0); lamps.push(material); }
    return { lamps, g };
  });
});

export const syncLaneGimmicks = (dt, now) => {
  for (const b of belts) b.material.map.offset.y -= b.speed * dt;
  const on = Math.floor(now / 250) % 2 === 0;
  for (const { lamps, e } of ends) {
    const live = Player.active && e.s - Player.s > 0 && e.s - Player.s <= CONFIG.deadEnd.warn && LaneGimmicks.inDeadLane(Player.s, Player.lat) === e;
    for (const l of lamps) l.color.setHex(live && on ? BEACON_ON : BEACON_OFF);
  }
  for (const { lamps, g } of pillarSigns) {
    const live = Player.active && LaneGimmicks.pillarsAt(Player.s) === g;
    for (const l of lamps) l.color.setHex(live && on ? BEACON_ON : BEACON_OFF);
  }
};
