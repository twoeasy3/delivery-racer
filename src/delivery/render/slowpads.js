// ---- SLOW PADS, drawn (SLOW-PAD-DESIGN.md; what they do: ../lanegimmicks.js, Player.updateSpeed): the boost pad turned round.
// The same belt over the lane, but dull and hatched, its chevrons pointing BACK at the player and creeping toward the car, lit
// amber edges. The theme skins it as it skins the boost pad (`slowSkin`): its `pad` 'travelator' (the mall, Metro, Las Vegas) a
// REVERSE TRAVELATOR, 'conveyor' (the steelworks) a REVERSE CONVEYOR (red chevrons on the belt, the yellow frame, a drum at each
// end), or its own `slowPad: 'sand'` (the desert, Wild West, beach) a drift of soft sand rippled across, no edges. All of a
// level's slow pads are ONE mesh (their strips merged, one 64 x 256 canvas picture) and their edges one more: two draw calls
// however many pads, plus a plate or a drum at each end of a travelator's or conveyor's. Pure: only THREE and the Track (the
// check scripts/.slowpad-check.mjs builds every skin headless)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';

export const SLOW_SKINS = ['plain', 'travelator', 'conveyor', 'sand'];
export const slowSkin = (theme) => SLOW_SKINS.includes(theme.slowPad) ? theme.slowPad : theme.pad === 'travelator' || theme.pad === 'conveyor' ? theme.pad : 'plain';
// by skin: the belt's colour, its chevrons' (null: none), its lit edges' (null: none) and how fast its picture creeps back (m/s)
export const SLOW_LOOK = {
  plain: { base: '#8a4a1e', chevron: '#f6e6c0', edge: 0xff9a1a, creep: 1.2 },
  travelator: { base: '#2a2d33', chevron: '#ff3a2a', edge: 0xff5a2a, creep: 1.6 },
  conveyor: { base: '#1d1e21', chevron: '#ff3a2a', edge: 0xf2c21d, creep: 1.6 },
  sand: { base: '#c48a44', chevron: null, edge: null, creep: 0 },
};
const REPEAT = 4; // m of road one copy of the picture covers
const pictures = {};
const picture = (skin) => {
  if (pictures[skin]) return pictures[skin];
  const L = SLOW_LOOK[skin], canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = L.base;
  c.fillRect(0, 0, 64, 256);
  if (skin === 'plain') { c.strokeStyle = '#5e3014'; c.lineWidth = 6; for (let y = -64; y < 256; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(64, y + 64); c.stroke(); } } // (hatched)
  if (skin === 'travelator') { c.fillStyle = '#4a4f57'; for (let y = 0; y < 256; y += 16) c.fillRect(0, y, 64, 3); } // (the walkway's ridges)
  if (skin === 'conveyor') { c.fillStyle = '#3a3c42'; for (let y = 0; y < 256; y += 32) c.fillRect(4, y, 56, 6); } // (the belt's cleats)
  if (skin === 'sand') { // ripples across, light crests and dark troughs, wavy
    for (let y = 4; y < 256; y += 14) for (const [dy, colour] of [[0, '#e2ad62'], [4, '#9c6630']]) {
      c.strokeStyle = colour; c.lineWidth = 3; c.beginPath();
      for (let x = 0; x <= 64; x += 4) c.lineTo(x, y + dy + Math.sin((x / 64 + y / 70) * Math.PI * 2) * 2.5);
      c.stroke();
    }
  }
  if (L.chevron) { // pointing back: the point toward the bottom of the picture (the player's end; the boost pad's point the other way)
    c.strokeStyle = L.chevron;
    c.lineWidth = 11;
    c.lineJoin = 'miter';
    for (const y of [20, 148]) { c.beginPath(); c.moveTo(8, y); c.lineTo(32, y + 88); c.lineTo(56, y); c.stroke(); } // (each 1.4 m long: it reads from the chase camera)
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.userData.shared = true;
  pictures[skin] = texture;
  return texture;
};
// a strip over the road from a to b between lat lo(s) and hi(s), `y` m up, a row every 2 m; uv: u across, v along s / REPEAT
const strip = (a, b, lo, hi, y, tmp = new THREE.Vector3()) => {
  const pos = [], uv = [], idx = [];
  for (let n = 0; ; n++) {
    const q = Math.min(a + n * 2, b);
    Track.toWorld(q, lo(q), tmp); pos.push(tmp.x, tmp.y + y, tmp.z); uv.push(0, q / REPEAT);
    Track.toWorld(q, hi(q), tmp); pos.push(tmp.x, tmp.y + y, tmp.z); uv.push(1, q / REPEAT);
    if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    if (q >= b) break;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
};
// the meshes for a level's slow pads ({ from, to, lane }) in `theme`'s skin, and the belt to scroll ({ material, speed }: its
// picture's offset moves `speed` repeats a second back toward the player)
export const buildSlowPads = (pads, theme) => {
  const sk = slowSkin(theme), L = SLOW_LOOK[sk], half = CONFIG.laneWidth / 2 - 0.45, strips = [], edges = [], meshes = [];
  const lambert = (color) => new THREE.MeshLambertMaterial({ color });
  for (const p of pads) {
    const lat = (s) => Track.laneOffset(p.lane, s), w = sk === 'sand' ? half + 0.3 : half; // (sand drifts a little wider)
    strips.push(strip(p.from, p.to, (s) => lat(s) - w, (s) => lat(s) + w, 0.03));
    if (L.edge !== null) for (const side of [-1, 1]) edges.push(strip(p.from, p.to, (s) => lat(s) + side * (half + 0.02), (s) => lat(s) + side * (half + 0.2), 0.035)); // (0.18 m wide: lit, it carries further than the belt)
    if (sk === 'travelator' || sk === 'conveyor') for (const end of [p.from, p.to]) { // a comb plate (a travelator's) or a drum let into the road (a conveyor's) at each end
      const s = end + (end === p.from ? 0.3 : -0.3), at = new THREE.Vector3(), yaw = Track.toWorld(s, lat(s), at);
      const m = sk === 'conveyor' ? new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, half * 2 + 0.2, 14).rotateZ(Math.PI / 2), lambert(0x8a9096))
        : new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.3, 0.05, 0.6), lambert(0xc8ccd2));
      m.rotation.y = yaw;
      m.position.set(at.x, at.y + (sk === 'conveyor' ? -0.24 : 0.04), at.z);
      meshes.push(m);
    }
  }
  const material = new THREE.MeshBasicMaterial({ map: picture(sk).clone(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  material.map.needsUpdate = true;
  const belt = new THREE.Mesh(mergeGeometries(strips), material);
  belt.name = 'slowPads';
  meshes.push(belt);
  if (edges.length) {
    const edge = new THREE.Mesh(mergeGeometries(edges), new THREE.MeshBasicMaterial({ color: L.edge, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    edge.name = 'slowPadEdges';
    meshes.push(edge);
  }
  return { meshes, belt: { material, speed: L.creep / REPEAT }, skin: sk };
};
