// ---- ROADWORKS DIVERSIONS, drawn (what they do: ../roadworks.js and Track's lateral-offset layer; the taper cones are obstacles,
// drawn as obstacles). Over each diversion: the TEMPORARY MARKINGS in yellow along the lanes where they are now (continuous strips
// and dashes laid along Track's lane functions, never instanced pieces: no staircase in a taper), the road's own white lines left
// out there (render/road.js); a row of red and white water-filled BARRIERS along every works zone's line where it runs straight on
// (a line no car crosses: Track.bounds), a narrow strip between the two ways one row down its middle (a contraflow's); at the end
// of each taper a row ACROSS the closed lane and behind it a lit ARROW BOARD on its trailer, flashing; LIGHT TOWERS in the wider
// zones; on the verge before it the signs (roadworks, the lanes, the limit), and END after; plant parked well off the road, its
// beacons flashing. Props only: nobody stands in the works. No per-frame geometry: two lamp colours toggled
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { THEMES } from '../themes.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { zoneLines, lineSlope } from '../roadworks.js';
import { scene, tmp, clearGroup } from './scene.js';
import { buildStrip, buildDashes } from './road.js';
import { makeMachine } from './machineModels.js';

const group = new THREE.Group();
scene.add(group);
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const YELLOW = 0xf2c21d, AMBER = 0xffa21a, AMBER_OFF = 0x5a3a10;
const lampOn = new THREE.MeshBasicMaterial({ color: AMBER }), lampOff = new THREE.MeshBasicMaterial({ color: AMBER_OFF });
for (const m of [lampOn, lampOff]) m.userData.shared = true; // (made once, kept: clearGroup leaves them)
const lamps = [];  // meshes that flash amber
const boards = []; // arrow boards' faces (lit / dim)
const at = (s, lat, y = 0) => { // (a group on the road at (s, lat), local +z the player's way, +x to the road's left)
  const g = new THREE.Group();
  g.rotation.y = Track.toWorld(s, lat, tmp);
  g.position.set(tmp.x, tmp.y + y, tmp.z);
  group.add(g);
  return g;
};
const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

// ---- pictures (canvas, each made once and kept: 128 x 128 for the signs, 128 x 96 for an arrow board)
const pictures = {};
const picture = (key, w, h, draw) => {
  if (pictures[key]) return pictures[key];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.userData.shared = true;
  return (pictures[key] = texture);
};
const text = (c, words, x, y, size, color) => { c.fillStyle = color; c.font = 'bold ' + size + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(words, x, y); };
// a red-bordered warning triangle with ROAD WORKS under it
const worksSign = () => picture('works', 128, 128, (c) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#d8262b'; c.beginPath(); c.moveTo(64, 6); c.lineTo(122, 98); c.lineTo(6, 98); c.closePath(); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(64, 26); c.lineTo(104, 90); c.lineTo(24, 90); c.closePath(); c.fill();
  c.fillStyle = '#1b1d22'; c.fillRect(44, 74, 40, 6); c.beginPath(); c.arc(64, 58, 9, 0, Math.PI * 2); c.fill(); c.fillRect(58, 60, 12, 16); // (a shovel in a heap: no figure)
  c.fillRect(74, 44, 4, 30);
  text(c, 'ROAD WORKS', 64, 114, 17, '#1b1d22');
});
// the temporary limit: a red ring round the number
const limitSign = (kmh) => picture('limit' + kmh, 128, 128, (c) => {
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#d8262b'; c.lineWidth = 14; c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke();
  text(c, String(kmh), 64, 68, 54, '#1b1d22');
});
// the lanes ahead, on yellow: arrows showing what they do (merge: the kerb lane's arrow bends in; shift: both bend over and back;
// cross: one arrow each way, the player's crossing over)
const laneSign = (kind) => picture('lanes-' + kind, 128, 128, (c) => {
  c.fillStyle = '#f2c21d'; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#1b1d22'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
  const arrow = (pts, up = true) => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.stroke();
    const [x, y] = pts[pts.length - 1], d = up ? -1 : 1;
    c.fillStyle = '#1b1d22'; c.beginPath(); c.moveTo(x, y + d * 14); c.lineTo(x - 11, y - d * 2); c.lineTo(x + 11, y - d * 2); c.closePath(); c.fill();
  };
  if (kind === 'merge') { arrow([[44, 112], [44, 22]]); arrow([[84, 112], [84, 74], [50, 40], [50, 34]]); }
  else if (kind === 'shift') { arrow([[36, 112], [36, 84], [62, 58], [62, 22]]); arrow([[70, 112], [70, 84], [96, 58], [96, 22]]); }
  else { arrow([[78, 112], [78, 80], [52, 56], [52, 22]]); arrow([[22, 22], [22, 112]], false); c.fillStyle = '#d8262b'; c.fillRect(34, 30, 6, 70); }
  text(c, kind === 'cross' ? 'CONTRAFLOW' : kind === 'merge' ? 'LANE CLOSED' : 'LANE SHIFT', 64, 10, 14, '#1b1d22');
});
const endSign = () => picture('end', 128, 128, (c) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#1b1d22'; c.lineWidth = 6; c.strokeRect(5, 5, 118, 118);
  text(c, 'END OF', 64, 46, 24, '#1b1d22');
  text(c, 'ROAD', 64, 74, 24, '#1b1d22');
  text(c, 'WORKS', 64, 100, 24, '#1b1d22');
});
// an arrow board's face: a black panel, amber lamps in an arrow pointing `way` (as its reader sees it: 'left' or 'right')
const arrowFace = (way) => picture('arrow-' + way, 128, 96, (c) => {
  c.fillStyle = '#111215'; c.fillRect(0, 0, 128, 96);
  c.fillStyle = '#ffb020';
  const dot = (x, y) => { c.beginPath(); c.arc(way === 'right' ? x : 128 - x, y, 4.5, 0, Math.PI * 2); c.fill(); };
  for (let x = 18; x <= 92; x += 12) dot(x, 48);                       // the shaft
  for (let k = 1; k <= 4; k++) { dot(104 - k * 10, 48 - k * 9); dot(104 - k * 10, 48 + k * 9); } // the head
  dot(108, 48);
  for (const [x, y] of [[8, 8], [120, 8], [8, 88], [120, 88]]) dot(x, y); // (the corner lamps)
});

// ---- the pieces
const BLOCK = new THREE.BoxGeometry(0.5, 0.82, 1.18); // (a water-filled barrier block, along the road: local z)
const BLOCK_RIB = new THREE.BoxGeometry(0.56, 0.12, 1.2);
const barrierMats = [lambert(0xd8262b), lambert(0xf2f2f2)];
for (const x of [BLOCK, BLOCK_RIB, ...barrierMats]) x.userData.shared = true;
// barrier blocks, as two instanced meshes (red and white): [s, lat, across, k] each, across: turned square to the road, k: its colour (0 red, 1 white)
const barriers = (spots) => {
  const n = spots.length;
  if (!n) return;
  const meshes = barrierMats.map(m => new THREE.InstancedMesh(BLOCK, m, n)), ribs = barrierMats.map(m => new THREE.InstancedMesh(BLOCK_RIB, m, n));
  const count = [0, 0], spot = new THREE.Object3D();
  spots.forEach(([s, lat, across, k]) => {
    spot.rotation.set(0, Track.toWorld(s, lat, tmp) + (across ? Math.PI / 2 : 0), 0);
    spot.position.set(tmp.x, tmp.y + 0.41, tmp.z);
    spot.updateMatrix();
    meshes[k].setMatrixAt(count[k], spot.matrix);
    spot.position.y = tmp.y + 0.62;
    spot.updateMatrix();
    ribs[1 - k].setMatrixAt(count[k], spot.matrix); // (a band of the other colour round it)
    count[k]++;
  });
  for (let k = 0; k < 2; k++) { meshes[k].count = ribs[k].count = count[k]; group.add(meshes[k], ribs[k]); }
};
// a sign on two posts on the verge, its face to traffic coming way dir
const verge = (s, dir, texture, size = 1.5) => {
  const lat = dir > 0 ? Track.hi(s) + 1.4 : Track.lo(s) - 1.4, g = at(s, lat);
  for (const x of [-size * 0.32, size * 0.32]) add(g, new THREE.BoxGeometry(0.08, 1.6, 0.08), lambert(0x8a9096), x, 0.8, 0);
  const face = add(g, new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture }), 0, 1.6 + size / 2, dir > 0 ? -0.05 : 0.05);
  if (dir > 0) face.rotation.y = Math.PI; // (facing back down the road, at the player)
  add(g, new THREE.BoxGeometry(size + 0.06, size + 0.06, 0.04), lambert(0x6f757d), 0, 1.6 + size / 2, 0); // (its back)
};
// an arrow board on its trailer at (s, lat), facing traffic coming way dir, its arrow pointing `way` as they see it
const arrowBoard = (s, lat, dir, way) => {
  const g = at(s, lat), z = dir > 0 ? -1 : 1;
  add(g, new THREE.BoxGeometry(1.7, 0.7, 2.4), lambert(0xf2b51c), 0, 0.75, 0);          // the trailer
  for (const x of [-0.95, 0.95]) add(g, new THREE.CylinderGeometry(0.33, 0.33, 0.25, 10).rotateZ(Math.PI / 2), lambert(0x1b1d22), x, 0.33, 0);
  add(g, new THREE.BoxGeometry(0.16, 2.0, 0.16), lambert(0x6f757d), 0, 2.0, 0);         // the mast
  add(g, new THREE.BoxGeometry(2.5, 1.9, 0.12), lambert(0x1b1d22), 0, 3.6, 0);         // the board
  const material = new THREE.MeshBasicMaterial({ map: arrowFace(way) });
  const face = add(g, new THREE.PlaneGeometry(2.4, 1.8), material, 0, 3.6, z * 0.07);
  if (dir > 0) face.rotation.y = Math.PI;
  boards.push(material);
  for (const x of [-1.1, 1.1]) lamps.push(add(g, new THREE.BoxGeometry(0.22, 0.22, 0.22), lampOff, x, 4.7, 0)); // (beacons on top)
};
// a light tower on its trailer: a mast and four lamps turned to the road
const lightTower = (s, lat, face) => {
  const g = at(s, lat);
  add(g, new THREE.BoxGeometry(1.4, 0.9, 2.2), lambert(0xf2b51c), 0, 0.75, 0);
  add(g, new THREE.CylinderGeometry(0.09, 0.12, 6.5, 8), lambert(0x8a9096), 0, 4.2, 0);
  add(g, new THREE.BoxGeometry(1.6, 0.12, 0.12), lambert(0x6f757d), 0, 7.2, 0);
  for (const x of [-0.6, -0.2, 0.2, 0.6]) {
    const head = add(g, new THREE.BoxGeometry(0.34, 0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0xfff4d0 }), x, 7.45, 0);
    head.rotation.y = face * Math.PI / 2;
  }
};

Game.onLoad.push(() => {
  clearGroup(group);
  lamps.length = boards.length = 0;
  const list = Track.diversions;
  if (!list.length) return;
  const theme = THEMES[LEVEL.theme] || THEMES.city, LW = CONFIG.laneWidth, HM = Track.medianHalf;
  const n = { [-1]: Track.leftLanes, 1: Track.rightLanes };
  // a side's open lanes at s: [inner edge, outer edge] (lat), and a lane line's place: k lanes out from its inner edge
  const span = (side, s) => { const p = Track.divert(side, s); return [side * (HM + p.ci * LW) + p.d, side * (HM + (n[side] - p.co) * LW) + p.d]; };
  const between = (side, k, s) => { const p = Track.divert(side, s); return side * (HM + k * LW) + p.d; };
  const both = (side, k, s) => { const p = Track.divert(side, s); return p.ci <= k - 1 + 0.02 && p.co <= n[side] - 1 - k + 0.02; };
  const yellow = new THREE.MeshBasicMaterial({ color: YELLOW, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const strip = (a, b, lat, w = 0.15) => { const m = new THREE.Mesh(buildStrip(a, b, (s) => lat(s) - w / 2, (s) => lat(s) + w / 2, 0.02, 2), yellow); group.add(m); };
  const spots = [], milled = new THREE.MeshBasicMaterial({ color: 0x303236, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); // (unlit, as the road's own markings: a strip has no normals)
  for (const d of list) {
    const sides = [-1, 1].filter(side => d.ramps.some(r => r.side === side));
    // ---- the temporary markings (none on an unmarked road)
    if (!theme.unmarked) {
      for (const side of sides) {
        strip(d.from, d.to, (s) => span(side, s)[1] - side * 0.2); // (its kerb's edge line)
        for (let k = 1; k < n[side]; k++) group.add(new THREE.Mesh(buildDashes(d.from, d.to, (s) => between(side, k, s), (s) => both(side, k, s) && both(side, k, s + CONFIG.dashLength)), yellow));
      }
      if (Track.leftLanes && Track.rightLanes && Track.flow === 'both') { // (each way's inner edge: a double line where they meet)
        strip(d.from, d.to, (s) => span(-1, s)[0] - 0.2);
        strip(d.from, d.to, (s) => span(1, s)[0] + 0.2);
      }
    }
    // ---- the barriers along the run (where a zone's line runs straight on; a narrow strip between the ways: one row down it)
    for (let s = d.from + 1; s < d.to; s += 1.25) {
      const lines = zoneLines(s, []);
      for (const l of lines) {
        const steady = Math.abs(lineSlope(s, l.zone, l.into)) < 0.004; // (a taper: cones there)
        if (l.zone === 'mid' && l.width < 1.6) { // (a strip between the ways too narrow for a row along each side: one down its middle, once it runs straight)
          if (l.into > 0 && l.width >= 0.9 && steady && Math.abs(lineSlope(s, 'mid', -1)) < 0.004) spots.push([s, l.lat + l.width / 2, false, Math.round(s / 1.25) % 2]);
          continue;
        }
        if (steady && l.width >= 1.6) spots.push([s, l.lat + l.into * 0.55, false, Math.round(s / 1.25) % 2]);
      }
    }
    // ---- the works themselves: the closed road planed off, a darker patch inside the barriers (where a zone runs on, 2.5 m wide or more)
    for (const zone of ['right', 'mid', 'left']) {
      const edge = (s, into) => zoneLines(s, []).find(l => l.zone === zone && l.into === into);
      const inside = (s) => { const l = edge(s, zone === 'left' ? -1 : 1); return !!l && l.width >= 2.5; };
      let a = null;
      for (let s = d.from; s <= d.to + 1; s += 2) {
        const on = s <= d.to && inside(s);
        if (on && a === null) a = s;
        if (!on && a !== null) {
          const b = s - 2, near = zone === 'left' ? -1 : 1;
          if (b - a > 10) {
            const lo = (q) => { const l = edge(q, near); return l ? l.lat + near * 1.0 : 0; };
            const hi = (q) => { const l = edge(q, near); return !l ? 0 : zone === 'mid' ? edge(q, -1).lat - 1.0 : zone === 'right' ? Track.hi(q) - 0.6 : Track.lo(q) + 0.6; };
            group.add(new THREE.Mesh(buildStrip(a + 4, b - 4, zone === 'left' ? hi : lo, zone === 'left' ? lo : hi, 0.012, 2), milled));
          }
          a = null;
        }
      }
    }
    // ---- at the end of each taper: a row across the closed lane, an arrow board behind it, beacons on it
    for (const r of d.ramps) {
      const dir = r.side, s0 = dir > 0 ? r.from + r.T + 4 : r.to - r.T - 4;
      for (const l of zoneLines(s0, [])) {
        if (l.width < 2.5 || (l.zone === 'mid' && l.into !== (dir > 0 ? 1 : -1))) continue;
        if (l.zone === 'right' && dir < 0) continue;
        if (l.zone === 'left' && dir > 0) continue;
        const far = l.zone === 'mid' ? l.lat + l.into * (l.width - 0.55) : l.lat + l.into * (l.width - 0.6);
        const near = l.lat + l.into * 0.55;
        const step = 1 / Math.max(1, Math.round(Math.abs(far - near) / 1.25));
        for (let q = 0, k = 0; q <= 1.0001; q += step, k++) spots.push([s0, near + (far - near) * q, true, k % 2]);
        // (the way the lanes go, as the traffic coming to it sees it: away from the zone)
        const away = -l.into * dir > 0 ? 'right' : 'left';
        arrowBoard(s0 + dir * 9, l.lat + l.into * Math.min(l.width / 2, 2.2), dir, away);
        for (let q = 0; q <= 1.0001; q += 0.5) { const lamp = at(s0, near + (far - near) * q, 0.82); lamps.push(add(lamp, new THREE.BoxGeometry(0.2, 0.2, 0.2), lampOff, 0, 0.1, 0)); }
      }
    }
    // ---- light towers in the wider zones, every 140 m along the run
    for (let s = d.from + 70; s < d.to - 50; s += 140) {
      for (const l of zoneLines(s, [])) {
        if (l.width < 3 || Math.abs(lineSlope(s, l.zone, l.into)) > 0.004 || (l.zone === 'mid' && l.into < 0)) continue;
        lightTower(s, l.zone === 'mid' ? l.lat + l.width / 2 : l.lat + l.into * (l.width - 1.2), -l.into);
      }
    }
    // ---- the signs, before it for each way whose lanes it moves (and the end of it after)
    const limit = Math.round(d.limit * 3.6);
    for (const side of sides) {
      const dir = side, start = dir > 0 ? d.from : d.to, sign = (m) => start - dir * m;
      if (!Track.inBounds(sign(CONFIG.diversion.signs[0]))) continue;
      verge(sign(CONFIG.diversion.signs[0]), dir, worksSign());
      verge(sign(CONFIG.diversion.signs[1]), dir, laneSign(d.kind));
      verge(sign(CONFIG.diversion.signs[2]), dir, limitSign(limit), 1.3);
      verge((dir > 0 ? d.to : d.from) + dir * 40, dir, endSign(), 1.3);
    }
    // ---- plant parked well off the road on the works' side, beacons going (never in the road: 4 m and more beyond its edge)
    const kinds = ['roller', 'excavator', 'dumpTruck'];
    [0.33, 0.66].forEach((u, i) => {
      const s = d.from + (d.to - d.from) * u, side = d.kind === 'cross' || d.kind === 'merge' ? 1 : (i ? 1 : -1);
      const machine = makeMachine(kinds[(list.indexOf(d) + i) % kinds.length]);
      const g = at(s, side > 0 ? Track.hi(s) + 5.5 : Track.lo(s) - 5.5);
      g.add(machine);
      machine.rotation.y = side > 0 ? 0.25 : -0.25;
      if (machine.userData.beacon) { machine.userData.beacon.material = lampOff; lamps.push(machine.userData.beacon); }
    });
  }
  barriers(spots);
});

export const syncRoadworks = (dt, now) => {
  if (!lamps.length && !boards.length) return;
  const on = Math.floor(now / 400) % 2 === 0;
  for (const l of lamps) l.material = on ? lampOn : lampOff;
  for (const b of boards) b.color.setHex(Math.floor(now / 650) % 2 === 0 ? 0xffffff : 0x3a3a3a);
};
