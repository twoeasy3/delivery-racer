// ---- the mall: a shopping mall the road drives through. The whole level but its ends is ONE LIT TUNNEL (a level's
// "tunnels", lit by the theme: themes.js `tunnel.lit`, so no dark, no fog closing in, no headlights), and its halls are the
// level's zones (their `scenery`: fashion, atrium, foodcourt, escalators, electronics, kids), each with a ceiling height of
// its own (themes.js `tunnel.heights`, eased from one hall to the next: render/tunnelshape.js), a palette, and its own
// dressing. The theme draws the whole shell itself (tunnel.js leaves it: `shell: false`): a polished tiled floor over the
// road, the walls as rows of shop fronts (a pier, a glass front, a facia with the shop's name on it, a dark interior behind
// with its displays lit), the ceiling with its panel lights, the atrium's glass roof and
// galleries, the food court's counters and tables, the escalator hall's escalators (their steps moving: the one thing that
// moves) and mezzanine bridge, the play zone's balloon arch and ball pit, and at each end a facade: the mall's entrance
// (a glass canopy on columns, the name over the doors, flags, planters) and the loading dock. Outside the tunnel it is a car
// park (the regular outdoors: the theme's flat ground, painted bays, lamp posts, trolley bays, hedges). Every sign is drawn in
// code on a small canvas (mallModels.js signTexture), the names invented. No people, no mannequins. All instanced (one draw
// call per kind of thing) and laid out from a seed of the level's own: the same every run.
import * as THREE from 'three';
import { CONFIG } from '../../config.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { heightOf } from '../tunnelshape.js';
import { everyFrame } from './sceneryClock.js';
import { signTexture, GLYPHS, openBoxGeometry } from './mallModels.js';

const BAY = 12;            // m: one shop front
const NAME_GAP = 100;      // m within which no shop's name is used twice
const FACIA = 4.9;         // m: the top of a shop front (its facia's top); the wall above goes up to the ceiling
const GALLERY = 5.6;       // m: the atrium's gallery floor
const OVERHANG = 1.0;      // m the galleries reach out past the wall line (the camera sits over the lanes: never under them)
// the halls' looks: the floor's two tile tones, the wall above the shops, the ceiling, the facias' colours, the shops' interiors
const PAL = {
  fashion: { floor: 0xe9e3d7, floor2: 0xd9d1c3, wall: 0xf4f1ec, roof: 0xf7f5f0, facia: [0x6b2d5c, 0x1f6f7a, 0xc89a1e, 0x1f3a6e, 0x9a2f3a], inside: 0x3a3238, lights: 1 },
  atrium: { floor: 0xdedbd5, floor2: 0xcac6be, wall: 0xeeebe4, roof: 0xbcd6ea, facia: [0x2f6f8a, 0x8a4a2f, 0x3a7a4a, 0x6b2d5c], inside: 0x33303a, lights: 0.6 },
  foodcourt: { floor: 0xc9a27a, floor2: 0xb8906a, wall: 0xe8dcc8, roof: 0x3a3a3c, facia: [0xd8262b, 0xf2c21d, 0x2e9b3d, 0xe8751a], inside: 0x7a6650, lights: 0 },
  escalators: { floor: 0xd9d6cf, floor2: 0xc8c5be, wall: 0xdfe2e6, roof: 0xf2f2f4, facia: [0x4a5a6a, 0x2f6f8a], inside: 0x3a3c42, lights: 1 },
  electronics: { floor: 0x4a4c52, floor2: 0x3e4046, wall: 0x3a3c42, roof: 0x24262b, facia: [0x1a1b1e, 0x2a2c33, 0x101114], inside: 0x16171a, lights: 0.5 },
  kids: { floor: 0x6fb3ea, floor2: 0x5aa0d8, wall: 0xfff2b8, roof: 0xffffff, facia: [0xf04a5e, 0xf2c21d, 0x3ab0e8, 0x5fc04a, 0xf28ac0], inside: 0x4a3a52, lights: 1 },
};
// the shops, by hall: a name (invented: no real brand), the sign's colours, its mark
const SHOPS = {
  fashion: [['THREADS', '#6b2d5c', '#f8e8f0', 'hanger'], ['SOLE MATES', '#1f6f7a', '#e8f8f8', 'shoe'], ['SPARKLE', '#1f3a6e', '#ffe8a0', 'gem'], ['PETAL PUSHER', '#3a7a4a', '#ffffff', 'flower'], ['CUT ABOVE', '#9a2f3a', '#ffffff', 'scissors'], ['WRAP STAR', '#c89a1e', '#3a2a10', 'bow']],
  atrium: [['PAGE TURNER', '#2f6f8a', '#ffffff', 'book'], ['SPARKLE', '#1f3a6e', '#ffe8a0', 'gem'], ['THREADS', '#6b2d5c', '#f8e8f0', 'hanger'], ['SCOOP', '#f28ac0', '#3a1a2a', 'cone']],
  foodcourt: [['BEAN THERE', '#4a2a1a', '#f8e8d0', 'cup'], ['SLICE OF LIFE', '#d8262b', '#fff2c0', 'slice'], ['NOODLE BAR', '#2e9b3d', '#ffffff', 'bowl'], ['BURGER BARN', '#e8751a', '#fff8e0', 'burger'], ['SCOOP', '#f28ac0', '#3a1a2a', 'cone']],
  escalators: [['PAGE TURNER', '#2f6f8a', '#ffffff', 'book'], ['CUT ABOVE', '#9a2f3a', '#ffffff', 'scissors']],
  electronics: [['GADGET GROTTO', '#101114', '#3ad8ff', 'phone'], ['PIXEL PLAY', '#16171a', '#ff4fd8', 'joystick'], ['BYTE SIZE', '#1a1b1e', '#7fff6a', 'phone']],
  kids: [['TOY CHEST', '#f04a5e', '#fff8e0', 'bear'], ['SCOOP', '#f28ac0', '#3a1a2a', 'cone'], ['PIXEL PLAY', '#16171a', '#ff4fd8', 'joystick'], ['BUBBLE UP', '#3ab0e8', '#ffffff', 'bubble']],
};
const NAME = 'GALLERIA';   // the mall's own name, over its doors

// (the signs' textures, made once and kept: every level of the theme shares them)
const signs = new Map();
const sign = (name, bg, fg, glyph) => { const k = name + bg; if (!signs.has(k)) signs.set(k, signTexture(name, bg, fg, 256, 64, GLYPHS[glyph])); return signs.get(k); };
// the floor's tile: one pale tile with a dark grout line round it and a faint marbling, repeated every 2 m (drawn once, when first wanted)
let tile = null;
const tileTexture = () => {
  if (tile) return tile;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 2;
  for (let k = 0; k < 40; k++) { // (the marbling: faint arcs)
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, 30 + Math.random() * 90, Math.random() * 6, Math.random() * 6);
    g.stroke();
  }
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.fillRect(0, 0, 256, 4);
  g.fillRect(0, 0, 4, 256);
  tile = new THREE.CanvasTexture(canvas);
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.userData.shared = true;
  tile.anisotropy = 4;
  return tile;
};

export const mall = ({ theme, beside, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 23 + (LEVEL.id || '').length * 131;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {}, q_ = {}, dummy = new THREE.Object3D(), colour = new THREE.Color();
  dummy.rotation.order = 'YXZ'; // (a thing is turned to the road's heading first, then tilted about its own x: an escalator, a slide)
  const tunnels = LEVEL.tunnels || [];
  const zones = (LEVEL.zones || []).slice().sort((a, b) => a.from - b.from);
  const zoneAt = (s) => zones.find(z => s >= z.from && s < z.to) || null;
  const hallAt = (s) => { const z = zoneAt(s); return z && PAL[z.scenery] ? z.scenery : null; };
  const lo = (s) => Track.lo(s) - 0.3, hi = (s) => Track.hi(s) + 0.3; // (the walls stand just outside the shoulders, as every tunnel's)
  const curves = []; // the road's curve by segment: [from, to, curve]
  { let at = 0; for (const seg of LEVEL.segments || []) { curves.push([at, at + seg.length, seg.curve || 0]); at += seg.length; } }
  const curveAt = (s) => { const c = curves.find(c => s >= c[0] && s < c[1]); return c ? c[2] : 0; };
  const bent = (s) => Math.abs(curveAt(s)) > 0.003;
  const gaps = []; // where a side corridor opens off the main road: { side, from, to }
  const facing = (side) => side * Math.PI / 2; // (a thing on that side turned to face the road: its +z towards it)
  const off = (side, s, d) => (side < 0 ? Track.laneLo(s) : Track.laneHi(s)) + side * d; // (d m beyond the lanes' edge, whatever the run-off)
  const glassSheetMat = new THREE.MeshBasicMaterial({ color: 0xbfe0f4, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });

  // ---- batches: one InstancedMesh per kind of thing, each instance with a colour of its own if it wants one -----
  const batches = [];
  const batch = (geometry, material, glowing = false) => {
    const b = { geometry, material: material ?? (glowing ? new THREE.MeshBasicMaterial({ color: 0xffffff }) : new THREE.MeshLambertMaterial({ color: 0xffffff })), items: [] };
    batches.push(b);
    // at a world point, turned ry (and tilted rx, rz), scaled, in a colour (white: the material's own)
    b.at = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, col = 0xffffff, rx = 0, rz = 0) => { b.items.push([x, y, z, rx, ry, rz, sx, sy, sz, col]); return b.items.length - 1; };
    // at (s, lat, y over the road), turned `turn` from the road's heading
    b.on = (s, lat, y, turn = 0, sx = 1, sy = 1, sz = 1, col = 0xffffff, rx = 0, rz = 0) => { const h = Track.toWorld(s, lat, p); return b.at(p.x, p.y + y, p.z, h + turn, sx, sy, sz, col, rx, rz); };
    return b;
  };
  const flush = () => {
    for (const b of batches) {
      if (!b.items.length) continue;
      const mesh = new THREE.InstancedMesh(b.geometry, b.material, b.items.length);
      b.items.forEach(([x, y, z, rx, ry, rz, sx, sy, sz, col], i) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(rx, ry, rz);
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, colour.set(col));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false; // (a hall's worth of fronts: the bounds are not worth working out)
      levelGroup.add(mesh);
      b.mesh = mesh;
    }
  };
  // a strip of coloured quads: pos / col / uv lists, one geometry, vertex colours (the floor, the walls over the shops, the ceilings)
  const sheet = (material) => {
    const S = { pos: [], col: [], uv: [], idx: [], n: 0, material };
    // a quad from corners a, b, c, d (each [x, y, z, u, v]), in a colour
    S.quad = (a, b, c, d, col) => {
      colour.set(col);
      for (const v of [a, b, c, d]) { S.pos.push(v[0], v[1], v[2]); S.col.push(colour.r, colour.g, colour.b); S.uv.push(v[3] || 0, v[4] || 0); }
      S.idx.push(S.n, S.n + 1, S.n + 2, S.n, S.n + 2, S.n + 3);
      S.n += 4;
    };
    S.flush = () => {
      if (!S.n) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(S.pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(S.col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(S.uv, 2));
      geo.setIndex(S.idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, S.material);
      levelGroup.add(mesh);
      return mesh;
    };
    return S;
  };
  const CUBE = new THREE.BoxGeometry(1, 1, 1), TUBE = new THREE.CylinderGeometry(0.5, 0.5, 1, 10), BALL = new THREE.SphereGeometry(0.5, 10, 7);
  const PLANE = new THREE.PlaneGeometry(1, 1), CONE = new THREE.ConeGeometry(0.5, 1, 8);
  const INSIDE = openBoxGeometry(1, 1, 1);
  const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
  const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });

  // the kinds of thing
  const piers = batch(CUBE), facias = batch(CUBE), plinths = batch(CUBE, lambert(0x3a3238)), uppers = batch(CUBE);
  const glass = batch(PLANE, new THREE.MeshBasicMaterial({ color: 0xbfe0f4, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
  const insides = batch(INSIDE), displays = batch(CUBE), doors = batch(CUBE, lambert(0x8a9096)), shutters = batch(CUBE), posters = batch(CUBE, null, true);
  const signPlanes = new Map(); // texture -> batch
  const signBatch = (texture) => { if (!signPlanes.has(texture)) signPlanes.set(texture, batch(PLANE, new THREE.MeshBasicMaterial({ map: texture }))); return signPlanes.get(texture); };
  const panels = batch(CUBE, null, true); // (no shine quads under them on the floor: the owner wants the floor one plain surface)
  const columns = batch(TUBE, lambert(0xd8d4cc)), mullions = batch(CUBE, lambert(0xe8ecf0)), rails = batch(CUBE, lambert(0x8a9096)), posts = batch(TUBE, lambert(0x8a9096));
  const planters = batch(CUBE, lambert(0x6b6f74)), leaves = batch(BALL, lambert(0x3f8a3a)), trunks = batch(TUBE, lambert(0x7a5a3a)), fronds = batch(CONE, lambert(0x4a9a48));
  const benches = batch(CUBE, lambert(0x8a6a48)), bins = batch(TUBE, lambert(0x4a4f57)), banners = batch(PLANE, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  const counters = batch(CUBE), menus = batch(CUBE, null, true), pendants = batch(BALL, glow(0xffb060)), cords = batch(TUBE, lambert(0x1a1b1e));
  const tables = batch(TUBE, lambert(0xf4f1ec)), legs = batch(TUBE, lambert(0x6f757d)), chairs = batch(CUBE);
  const trusses = batch(CUBE, lambert(0x6f757d)), balustrades = batch(CUBE, new THREE.MeshBasicMaterial({ color: 0xbfe0f4, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  const handrails = batch(CUBE, lambert(0x1a1b1e)), steps = batch(CUBE, lambert(0x9aa0a8)), neon = batch(CUBE, null, true), screens = batch(PLANE, null, true);
  const balloons = batch(BALL), balls = batch(BALL), blocks = batch(CUBE), slides = batch(CUBE, lambert(0xd8262b));
  const lamps = batch(TUBE, lambert(0x4a4f57)), lampHeads = batch(CUBE, null, true), hedges = batch(CUBE, lambert(0x2f6a2a)), bollards = batch(TUBE, lambert(0x4a4f57)), trolleyBays = batch(INSIDE, lambert(0x8a9096));
  const flags = batch(PLANE, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide })), poles = batch(TUBE, lambert(0xd8d4cc)), canopies = batch(CUBE, new THREE.MeshBasicMaterial({ color: 0xbfe0f4, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  const facades = batch(CUBE), rollers = batch(CUBE);

  // ---- the floor: over the road inside the tunnel, 2 m tiles in the hall's two tones by turns, the tile texture over it. In
  // quads 4 m along and 2 m across, each its own colour (a little over the road at 2 cm, under the ice sheets at 2.5 cm, over
  // the lane dashes, which it hides: a mall has no lane lines)
  const floor = sheet(new THREE.MeshLambertMaterial({ map: tileTexture(), vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  for (const t of tunnels) {
    for (let s = t.from; s < t.to; s += 4) {
      const s1 = Math.min(t.to, s + 4), hall = hallAt(s + 2) || 'fashion', P = PAL[hall];
      const a = lo(s), b = hi(s), a1 = lo(s1), b1 = hi(s1), cols = Math.ceil((b - a) / 2);
      for (let c = 0; c < cols; c++) {
        const la = a + (b - a) * c / cols, lb = a + (b - a) * (c + 1) / cols, la1 = a1 + (b1 - a1) * c / cols, lb1 = a1 + (b1 - a1) * (c + 1) / cols;
        const tone = (c + Math.round(s / 4)) % 2 ? P.floor : P.floor2;
        Track.toWorld(s, la, p); const A = [p.x, p.y + 0.024, p.z, la / 2, s / 2];
        Track.toWorld(s, lb, p); const B = [p.x, p.y + 0.024, p.z, lb / 2, s / 2];
        Track.toWorld(s1, lb1, p); const C = [p.x, p.y + 0.024, p.z, lb1 / 2, s1 / 2];
        Track.toWorld(s1, la1, p); const D = [p.x, p.y + 0.024, p.z, la1 / 2, s1 / 2];
        floor.quad(A, D, C, B, tone);
      }
    }
  }
  floor.flush();

  // ---- the shell: the walls above the shop fronts and the ceilings, in the hall's colours; the walls' lower 4.9 m are the
  // shop fronts (below). Both as sheets of quads 4 m along
  // (both unlit: a ceiling faces down and the hemisphere light would make it the ground's grey; the walls a shade darker than their colour)
  const walls = sheet(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const roofs = sheet(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  for (const t of tunnels) {
    const hAt = heightOf(t);
    for (let s = t.from; s < t.to; s += 4) {
      const s1 = Math.min(t.to, s + 4), hall = hallAt(s + 2) || 'fashion', P = PAL[hall];
      const foot = hall === 'atrium' ? GALLERY + FACIA : FACIA; // (the atrium's wall has a second row of shops, on the gallery)
      for (const side of [-1, 1]) {
        const edge = side < 0 ? lo : hi;
        Track.toWorld(s, edge(s), p); Track.toWorld(s1, edge(s1), q);
        walls.quad([p.x, p.y + foot, p.z], [p.x, p.y + hAt(s), p.z], [q.x, q.y + hAt(s1), q.z], [q.x, q.y + foot, q.z], colour.set(P.wall).multiplyScalar(0.9).getHex());
      }
      Track.toWorld(s, lo(s), p); Track.toWorld(s1, lo(s1), q);
      const A = [p.x, p.y + hAt(s), p.z], D = [q.x, q.y + hAt(s1), q.z];
      Track.toWorld(s, hi(s), p); Track.toWorld(s1, hi(s1), q);
      roofs.quad(A, [p.x, p.y + hAt(s), p.z], [q.x, q.y + hAt(s1), q.z], D, P.roof);
    }
  }
  walls.flush();
  roofs.flush();
  const floor2 = sheet(floor.material), walls2 = sheet(walls.material), roofs2 = sheet(roofs.material); // (the side corridors', the open bays' and the blank walls': flushed at the end)
  // ---- the outside of the mall, seen from the car park (and nothing of the shops' insides from there): a plain skin 9 m
  // out from the halls' walls, up to 1.5 m over the ceiling, and a flat roof; the ends are the facades
  const skin = sheet(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  for (const t of tunnels) {
    const hAt = heightOf(t), OUT = 9;
    for (let s = t.from; s < t.to; s += 8) {
      const s1 = Math.min(t.to, s + 8), top = Math.max(hAt(s), hAt(s1)) + 1.5;
      for (const side of [-1, 1]) {
        Track.toWorld(s, (side < 0 ? lo(s) : hi(s)) + side * OUT, p); Track.toWorld(s1, (side < 0 ? lo(s1) : hi(s1)) + side * OUT, q);
        skin.quad([p.x, p.y - 0.5, p.z], [p.x, p.y + top, p.z], [q.x, q.y + top, q.z], [q.x, q.y - 0.5, q.z], 0xd8d3c9);
      }
      Track.toWorld(s, lo(s) - OUT, p); Track.toWorld(s1, lo(s1) - OUT, q);
      const A = [p.x, p.y + top, p.z], D = [q.x, q.y + top, q.z];
      Track.toWorld(s, hi(s) + OUT, p); Track.toWorld(s1, hi(s1) + OUT, q);
      skin.quad(A, [p.x, p.y + top, p.z], [q.x, q.y + top, q.z], D, 0x9a9ea4);
    }
  }
  skin.flush();

  // ---- the shop fronts: along both walls, one each BAY m where the hall has shops (the escalator hall and the food court have
  // other things there). A front: a pier at its start, a plinth, a glass front with a door in the middle, a facia over it with
  // the shop's name, and behind the glass a dark interior with lit display blocks in it. `y0`: the floor it stands on
  // Not every unit is a shop with a name: about one in three is signed; the rest are plain units, by turns at random (a
  // seeded rhythm, not a pattern): a shuttered unit, a dark window with a blank facia, a lit poster window, a recessed
  // doorway. No name twice within NAME_GAP m (either side). Everything of a unit stands BEHIND its glass (the displays
  // 1.6 m or more back, their boxes inside the interior) or in the wall's own plane (the facia, the door, the shutter)
  const recent = []; // [s, name]: the names lately used
  const pickName = (list, s) => {
    for (let tries = 0; tries < 8; tries++) {
      const item = list[Math.floor(rand() * list.length)];
      if (!recent.some(([q, n]) => n === item[0] && Math.abs(q - s) < NAME_GAP)) { recent.push([s, item[0]]); return item; }
    }
    return null; // (every name is in use nearby: a plain unit then)
  };
  // a unit of w m, its front's middle at (x, y, z) in the world, `turn` the heading its front faces (towards whoever looks at it)
  const unit = (x, y, z, turn, hall, w, s, y0 = 0) => {
    const list = SHOPS[hall] || SHOPS.fashion, P = PAL[hall], facia = P.facia[Math.floor(rand() * P.facia.length)];
    const dx = Math.sin(turn), dz = Math.cos(turn);              // (out of the front, towards the hall)
    const ax = Math.cos(turn), az = -Math.sin(turn);             // (across the front)
    // a thing of the unit: u m across its front from the middle, d m back from the glass (d > 0: inside), yy m up
    const at = (b, u, d, yy, sx, sy, sz, col) => b.at(x + ax * u - dx * d, y + y0 + yy, z + az * u - dz * d, turn, sx, sy, sz, col);
    const r = rand(), kind = r < 0.34 ? 'shop' : r < 0.56 ? 'shutter' : r < 0.76 ? 'dark' : r < 0.88 ? 'poster' : 'recessed';
    const named = kind === 'shop' ? pickName(list, s) : null;
    at(piers, -(w / 2 + 0.45), 0.15, FACIA / 2, 0.9, FACIA, 0.9, P.wall);
    at(plinths, 0, 0, 0.2, w, 0.4, 0.3);
    at(facias, 0, 0, 4.2, w, 1.4, 0.5, named ? facia : P.wall);
    if (named) {
      const [name, bg, fg, glyph] = named;
      at(signBatch(sign(name, bg, fg, glyph)), 0, -0.27, 4.2, Math.min(7, w - 1.6), Math.min(1.0, (w - 1.6) / 7), 1);
    }
    if (kind === 'shutter') { // a roller shutter down over the whole front, in the wall's plane
      at(shutters, 0, 0.02, 1.95, w - 0.2, 3.5, 0.08, 0xa6abb2);
      for (let yy = 0.5; yy < 3.5; yy += 0.5) at(shutters, 0, -0.02, yy, w - 0.2, 0.06, 0.1, 0x8a8f96);
      return;
    }
    at(glass, 0, 0, 2.0, w, 3.2, 1);
    if (kind === 'recessed') { // the doorway set 1.6 m back in the middle, returns each side of it
      at(insides, 0, 3.0, 2.45, w, FACIA, 6, P.inside);
      for (const u of [-1.6, 1.6]) at(piers, u, 0.8, 1.8, 0.3, 3.6, 1.6, P.wall);
      at(doors, 0, 1.6, 1.5, 2.4, 3.0, 0.12);
      return;
    }
    at(insides, 0, 3.0, 2.45, w, FACIA, 6, kind === 'dark' ? 0x1e1b22 : P.inside);
    at(doors, 0, 0.06, 1.5, 1.4, 2.6, 0.12);
    if (kind === 'poster') { at(posters, 0, 0.4, 2.0, Math.max(2, w - 2), 2.4, 0.06, P.facia[(Math.floor(rand() * P.facia.length))]); return; }
    if (kind === 'dark') return;
    const n = w > 8 ? 3 : 2;
    for (let k = 0; k < n; k++) { // the window displays: well inside, no part nearer the glass than 1.6 m
      const u = -w / 2 + 1.8 + k * (w - 3.6) / (n - 1), sx = 0.6 + rand() * 0.6, sy = 0.8 + rand() * 1.2, sz = 0.6, d = 1.6 + sz / 2 + rand() * 2;
      at(displays, u, d, sy / 2 + 0.1, sx, sy, sz, P.facia[(k + 1) % P.facia.length]);
    }
    if (hall === 'electronics') {
      at(neon, 0, -0.3, 3.45, w, 0.08, 0.08, rand() < 0.5 ? 0x3ad8ff : 0xff4fd8);
      at(screens, 0, 2.2, 2.2, 2.4, 1.4, 1, 0x7fc8ff);
    }
  };
  // plain wall along the road from s0 to s1 on that side, floor to the facia's top (the bits of a bay beside a side corridor's mouth)
  const blank = (s0, s1, side, hall) => {
    if (s1 - s0 < 0.3) return;
    const edge = side < 0 ? lo : hi, P = PAL[hall] || PAL.fashion;
    Track.toWorld(s0, edge(s0), p); Track.toWorld(s1, edge(s1), q);
    walls2.quad([p.x, p.y, p.z], [p.x, p.y + FACIA, p.z], [q.x, q.y + FACIA, q.z], [q.x, q.y, q.z], colour.set(P.wall).multiplyScalar(0.9).getHex());
  };
  // a unit along the road: from s to s + len on that side, facing the road (where a side corridor opens, `gaps`, plain wall up to its mouth)
  const front = (s, side, hall, y0 = 0, len = BAY) => {
    const gap = y0 === 0 && gaps.find(g => g.side === side && s + len > g.from && s < g.to); // (the gallery runs on over a mouth)
    if (gap) { blank(s, Math.min(s + len, gap.from), side, hall); blank(Math.max(s, gap.to), s + len, side, hall); return; }
    const edge = side < 0 ? lo : hi, mid = s + len / 2, h = Track.toWorld(mid, edge(mid), p);
    unit(p.x, p.y, p.z, h + facing(side), hall, len - 0.9, mid, y0);
  };
  // the units along a stretch of wall: BAY m each on a straight, half that in a bend (so their flat fronts keep to the curve)
  const fronts = (from, to, side, hall, y0 = 0) => {
    for (let s = from; s + 6 <= to;) { const len = bent(s + 6) || bent(s) ? BAY / 2 : BAY; if (s + len > to) break; front(s, side, hall, y0, len); s += len; }
  };
  // a gallery along a wall from `from` to `to` at height y: a slab OVERHANG m out past the wall line (its top, its front face and
  // its underside as continuous sheets following the curve: no stepping), a glass balustrade and a rail along its edge, posts
  // every 2 m. The upper units stand on it at the wall line (fronts(..., y))
  const slabs = sheet(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const glassSheet = sheet(glassSheetMat), railSheet = sheet(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const gallery = (from, to, side, y) => {
    const edge = side < 0 ? lo : hi, out = (q) => edge(q) - side * OVERHANG, SLAB = 0.5;
    for (let q = from; q < to; q += 2) {
      const q1 = Math.min(to, q + 2);
      Track.toWorld(q, edge(q), p); Track.toWorld(q1, edge(q1), q_);
      const A = [p.x, p.y + y, p.z], B = [q_.x, q_.y + y, q_.z], Au = [p.x, p.y + y - SLAB, p.z], Bu = [q_.x, q_.y + y - SLAB, q_.z];
      Track.toWorld(q, out(q), p); Track.toWorld(q1, out(q1), q_);
      const C = [p.x, p.y + y, p.z], D = [q_.x, q_.y + y, q_.z], Cu = [p.x, p.y + y - SLAB, p.z], Du = [q_.x, q_.y + y - SLAB, q_.z];
      slabs.quad(A, B, D, C, 0xd8d4cc);                   // the top
      slabs.quad(Cu, Du, Bu, Au, 0xb8b4ac);               // the underside
      slabs.quad(C, D, Du, Cu, 0xc8c4bc);                 // the front face
      glassSheet.quad(C, D, [q_.x, q_.y + y + 1.05, q_.z], [p.x, p.y + y + 1.05, p.z], 0xffffff); // the balustrade's glass
      railSheet.quad([p.x, p.y + y + 1.05, p.z], [q_.x, q_.y + y + 1.05, q_.z], [q_.x, q_.y + y + 1.13, q_.z], [p.x, p.y + y + 1.13, p.z], 0x6f757d); // the rail
    }
    for (let q = from; q <= to; q += 2) posts.on(q, out(q), y + 0.55, 0, 0.08, 1.1, 0.08);
  };
  // an open bay in a wall from s to s + len: no front: the floor's tiles run on into it `depth` m, under a ceiling at CEIL, a back
  // wall and the two side returns; the units' piers at its ends. What stands in it is decoration, behind the wall line
  const openBay = (s, side, hall, len, depth = 8) => {
    const P = PAL[hall] || PAL.fashion, edge = side < 0 ? lo : hi;
    gaps.push({ side, from: s, to: s + len });
    const pt = (q, d, y) => { Track.toWorld(q, edge(q) + side * d, p); return [p.x, p.y + y, p.z]; };
    for (let q = s; q < s + len; q += 4) {
      const q1 = Math.min(s + len, q + 4), tone = (Math.round(q / 4) % 2) ? P.floor : P.floor2;
      floor2.quad([...pt(q, 0, 0.024), 0, q / 2], [...pt(q, depth, 0.024), depth / 2, q / 2], [...pt(q1, depth, 0.024), depth / 2, q1 / 2], [...pt(q1, 0, 0.024), 0, q1 / 2], tone);
      roofs2.quad(pt(q, 0, FACIA), pt(q1, 0, FACIA), pt(q1, depth, FACIA), pt(q, depth, FACIA), P.roof);
      walls2.quad(pt(q, depth, 0), pt(q1, depth, 0), pt(q1, depth, FACIA), pt(q, depth, FACIA), colour.set(P.wall).multiplyScalar(0.85).getHex());
    }
    for (const q of [s, s + len]) walls2.quad(pt(q, 0, 0), pt(q, depth, 0), pt(q, depth, FACIA), pt(q, 0, FACIA), colour.set(P.wall).multiplyScalar(0.9).getHex());
    for (const q of [s, s + len]) piers.on(q, edge(q), FACIA / 2, 0, 0.6, FACIA, 0.9, P.wall);
    for (let q = s + 3; q < s + len; q += 6) { panels.on(q, edge(q) + side * depth / 2, FACIA - 0.08, Math.PI / 2, 2.6, 0.12, 0.9, 0xffffff); }
  };
  // ---- the lights: panels under the ceiling in two rows, a shine on the floor under each (the polish); the food court has
  // pendant lamps instead, hung low over the counters
  const lights = (t) => {
    const hAt = heightOf(t);
    for (let s = t.from + 3; s < t.to; s += 6) {
      const hall = hallAt(s) || 'fashion', P = PAL[hall], h = hAt(s);
      if (P.lights === 0) { // (the food court: pendants)
        for (const side of [-1, 1]) {
          const lat = beside(side, s, -1.2);
          pendants.on(s, lat, h - 2.4, 0, 0.6, 0.45, 0.6);
          cords.on(s, lat, h - 1.1, 0, 0.03, 2.4, 0.03);
        }
        continue;
      }
      for (const lat of [-2.0, 2.0]) {
        if (rand() > P.lights) continue;
        panels.on(s, lat, h - 0.08, 0, 2.6, 0.12, 0.9, hall === 'electronics' ? 0xcfe8ff : 0xffffff);
      }
    }
  };
  // ---- the atrium: a glass roof (the ceiling is pale blue: a lattice of mullions under it), galleries along both walls at
  // GALLERY m with balustrades and a second row of shops, the floor between them widened (the level's run-off): potted palms,
  // planters, benches and bins, banners hung from the roof
  const atrium = (z, t) => {
    const hAt = heightOf(t), from = Math.max(z.from, t.from), to = Math.min(z.to, t.to);
    for (let s = from + 8; s < to - 8; s += 8) { // (the mullions: across the roof every 8 m, and along it)
      const h = hAt(s), w = hi(s) - lo(s);
      mullions.on(s, (lo(s) + hi(s)) / 2, h - 0.2, Math.PI / 2, w, 0.25, 0.25);
    }
    for (const k of [-0.3, 0, 0.3]) mullions.on((from + to) / 2, (lo((from + to) / 2) + hi((from + to) / 2)) / 2 + k * (hi(from) - lo(from)), hAt((from + to) / 2) - 0.2, 0, 0.25, 0.25, to - from);
    for (const side of [-1, 1]) {
      gallery(from, to, side, GALLERY);
      // every third bay on the ground floor is an open plaza bay: palms in pots, planters, benches, bins in it, behind the wall line
      for (let s = from + BAY, k = 0; s + BAY <= to - BAY; s += BAY, k++) {
        if (k % 3 !== 1 || gaps.some(g => g.side === side && s + BAY > g.from && s < g.to)) continue;
        openBay(s, side, 'atrium', BAY);
        for (let u = 2; u < BAY - 1; u += 4) {
          const q = s + u, lat = off(side, q, 0.3 + 2.0 + rand() * 4), kind = Math.floor(rand() * 4);
          if (kind === 0) { planters.on(q, lat, 0.45, 0, 1.6, 0.9, 1.6, 0x6b6f74); trunks.on(q, lat, 2.4, 0, 0.3, 3.2, 0.3); for (let f = 0; f < 6; f++) fronds.on(q, lat, 4.3, f * 1.05, 0.5, 2.2, 0.5, 0xffffff, 0.9, 0); }
          else if (kind === 1) { planters.on(q, lat, 0.35, 0, 2.4, 0.7, 1.2); leaves.on(q, lat, 1.1, 0, 2.2, 1.2, 1.2); }
          else if (kind === 2) { benches.on(q, lat, 0.45, 0, 0.5, 0.1, 2.2); for (const d of [-0.9, 0.9]) benches.on(q + d, lat, 0.2, 0, 0.4, 0.4, 0.08); }
          else bins.on(q, lat, 0.5, 0, 0.6, 1.0, 0.6);
        }
      }
      fronts(from, to, side, 'atrium'); fronts(from, to, side, 'atrium', GALLERY);
    }
    for (let s = from + 20; s < to - 20; s += 40) { // (the banners: hung from the roof over the road, in the shops' colours)
      const h = hAt(s);
      banners.on(s, 0, h - 3.2, Math.PI / 2, 2.4, 4.4, 1, PAL.atrium.facia[Math.floor(rand() * 4)]);
    }
  };
  // ---- the food court: counters along both walls (a counter, a lit menu board over it, a canopy in the stall's colour), the
  // widened floor with tables and chairs; its lights are the pendants
  const foodcourt = (z, t) => {
    const from = Math.max(z.from, t.from), to = Math.min(z.to, t.to);
    for (const side of [-1, 1]) {
      const edge = side < 0 ? lo : hi;
      for (let s = from, k = 0; s + BAY <= to; s += BAY, k++) {
        const gap = gaps.find(g => g.side === side && s + BAY > g.from && s < g.to); // (a concourse opens here: plain wall up to its mouth)
        if (gap) { blank(s, Math.min(s + BAY, gap.from), side, 'foodcourt'); blank(Math.max(s, gap.to), s + BAY, side, 'foodcourt'); continue; }
        if (k % 2 === 1) { // a seating bay: open, the tables and chairs in it behind the wall line
          openBay(s, side, 'foodcourt', BAY, 7);
          for (let u = 1.5; u < BAY - 1; u += 2.6) for (const d of [1.6, 4.2]) {
            if (rand() < 0.15) continue;
            const q = s + u, lat = off(side, q, 0.3 + d);
            tables.on(q, lat, 0.74, 0, 0.9, 0.05, 0.9);
            legs.on(q, lat, 0.36, 0, 0.08, 0.72, 0.08);
            for (const c of [-1, 1]) chairs.on(q + c * 0.7, lat, 0.45, 0, 0.42, 0.06, 0.42, PAL.foodcourt.facia[Math.floor(rand() * 4)]);
          }
          continue;
        }
        const [name, bg, fg, glyph] = SHOPS.foodcourt[Math.floor(rand() * SHOPS.foodcourt.length)], col = PAL.foodcourt.facia[Math.floor(rand() * 4)];
        const mid = s + BAY / 2, latW = edge(mid), h = Track.toWorld(mid, latW, p), turn = h + facing(side), dx = Math.sin(turn), dz = Math.cos(turn), w = BAY - 0.9;
        piers.on(s + 0.45, edge(s + 0.45), FACIA / 2, 0, 0.6, FACIA, 0.9, PAL.foodcourt.wall);
        insides.at(p.x - dx * 2.5, p.y + 2.45, p.z - dz * 2.5, turn, w, FACIA, 5, PAL.foodcourt.inside);
        counters.at(p.x - dx * 0.65, p.y + 0.55, p.z - dz * 0.65, turn, w - 1, 1.1, 1.2, col); // (the counter inside the wall line: nothing of it in the road)
        counters.at(p.x - dx * 0.65, p.y + 1.15, p.z - dz * 0.65, turn, w - 0.8, 0.1, 1.4, 0xf4f1ec);
        menus.at(p.x - dx * 1.6, p.y + 3.4, p.z - dz * 1.6, turn, w - 3, 1.0, 0.1, 0xfff4d0);
        facias.at(p.x - dx * 0.25, p.y + 4.2, p.z - dz * 0.25, turn, w, 1.4, 0.5, col);
        signBatch(sign(name, bg, fg, glyph)).at(p.x + dx * 0.02, p.y + 4.2, p.z + dz * 0.02, turn, 7, 1.0, 1);
      }
    }
  };
  // ---- the escalator hall: a mezzanine along both walls at GALLERY m, reached by escalators rising from the floor along the
  // road (their steps move: everyFrame), with glass balustrades; a bridge across the road between the two mezzanines
  const movers = [];
  const escalators = (z, t) => {
    const from = Math.max(z.from, t.from), to = Math.min(z.to, t.to), RISE = GALLERY, RUN = 22;
    for (const side of [-1, 1]) {
      gallery(from, to, side, GALLERY);
      // the escalators: one up and one down, each in an open bay behind the wall line, climbing along the road to the mezzanine
      for (const [k, s0] of [[0, from + 36], [1, from + 176]]) {
        openBay(s0 - 6, side, 'escalators', RUN + 12, 6);
        const dir = k ? -1 : 1, lat = off(side, s0 + RUN / 2, 0.3 + 2.2), tilt = Math.atan2(RISE, RUN), len = Math.hypot(RISE, RUN);
        const h = Track.toWorld(s0 + RUN / 2, lat, p);
        trusses.at(p.x, p.y + RISE / 2 - 0.35, p.z, h, 1.5, 0.5, len, 0xffffff, -tilt, 0);
        for (const x of [-0.78, 0.78]) {
          const across = Math.cos(h) * x, alongZ = -Math.sin(h) * x;
          balustrades.at(p.x + across, p.y + RISE / 2 + 0.5, p.z + alongZ, h, 0.05, 1.0, len, 0xffffff, -tilt, 0);
          handrails.at(p.x + across, p.y + RISE / 2 + 1.0, p.z + alongZ, h, 0.1, 0.08, len + 0.4, 0xffffff, -tilt, 0);
        }
        const count = 22, first = steps.items.length;
        for (let i = 0; i < count; i++) steps.on(s0 + RUN * i / count, lat, RISE * i / count + 0.1, 0, 1.4, 0.2, 0.5, 0x9aa0a8);
        movers.push({ first, count, s0, lat, RUN, RISE, dir, phase: rand() });
      }
      fronts(from, to, side, 'escalators'); // (shops under the mezzanine, between the escalator bays)
    }
  };
  // ---- the play zone: a balloon arch over the road at its start, a ball pit and giant blocks and a slide on the widened floor
  const kids = (z, t) => {
    const from = Math.max(z.from, t.from), to = Math.min(z.to, t.to), COLS = PAL.kids.facia;
    const s0 = from + 30, w = hi(s0) - lo(s0), R = w / 2 + 1.5;
    for (let k = 0; k <= 24; k++) { // (the arch: its feet beyond the walls, over the road only well above the car)
      const a = Math.PI * k / 24;
      balloons.on(s0, (lo(s0) + hi(s0)) / 2 + Math.cos(a) * R, Math.sin(a) * R + 0.2, 0, 0.9, 1.1, 0.9, COLS[k % COLS.length]);
    }
    for (const side of [-1, 1]) {
      for (let s = from + BAY * 2, k = 0; s + BAY <= to - BAY; s += BAY * 3, k++) { // every third bay a play bay
        if (gaps.some(g => g.side === side && s + BAY > g.from && s < g.to)) continue;
        openBay(s, side, 'kids', BAY, 8);
        const q = s + BAY / 2, kind = k % 3, lat = off(side, q, 0.3 + 4.0);
        if (kind === 0) { // the ball pit: a tray and the balls in it
          planters.on(q, lat, 0.4, 0, 6.5, 0.8, 8, 0x3ab0e8);
          for (let b = 0; b < 40; b++) balls.on(q - 3.5 + rand() * 7, off(side, q, 0.3 + 1.5 + rand() * 5), 0.75 + rand() * 0.4, 0, 0.55, 0.55, 0.55, COLS[b % COLS.length]);
        } else if (kind === 1) { // giant blocks stacked
          for (let b = 0; b < 5; b++) blocks.on(q - 1.5 + (b % 3) * 1.4, off(side, q, 0.3 + 3.0 + Math.floor(b / 3) * 0.2), 0.65 + Math.floor(b / 3) * 1.3, rand() * 0.4, 1.2, 1.2, 1.2, COLS[(b + 2) % COLS.length]);
        } else { // the slide: a ladder of posts up to a platform, the chute down along the bay
          posts.on(q - 2, off(side, q, 0.3 + 3.0), 1.3, 0, 0.12, 2.6, 0.12);
          posts.on(q - 2, off(side, q, 0.3 + 4.0), 1.3, 0, 0.12, 2.6, 0.12);
          uppers.on(q - 2, off(side, q, 0.3 + 3.5), 2.6, 0, 1.4, 0.15, 1.4, 0xf2c21d);
          slides.on(q + 1.2, off(side, q, 0.3 + 3.5), 1.4, 0, 1.0, 0.15, 6.4, 0xffffff, 0.42, 0);
        }
      }
      fronts(from, to, side, 'kids');
    }
  };
  // ---- side corridors (DECORATION ONLY: the road's bounds stop the car at the wall, nothing in the rules knows them): at the
  // outside of a bend and at the plaza's corners a corridor opens off the hall, W m wide, L m long: its own floor and lower
  // ceiling with its panel lights, units along both its walls, a kiosk or a fountain at its end before the back wall; and
  // across its mouth a low glass barrier on posts with a CLOSED FOR CLEANING sign and a bollard each side, so it never reads
  // as a way to take. Cheap: the same batches and sheets as the halls (its sheets flushed with the rest)
  const W = 10, CEIL = FACIA; // (the corridor is as tall as the units: its roof meets the hall wall above its mouth)
  const offshoot = (s, side, hall, L, open = false) => {
    const P = PAL[hall], edge = side < 0 ? lo : hi, h = Track.toWorld(s, edge(s), p), turn = h + facing(side);
    const ox = -Math.sin(turn), oz = -Math.cos(turn), rx = Math.sin(h), rz = Math.cos(h); // (out along the corridor; along the road)
    const O = { x: p.x, y: p.y, z: p.z };
    const at = (t, u, y) => [O.x + ox * t + rx * u, O.y + y, O.z + oz * t + rz * u];
    gaps.push({ side, from: s - W / 2 - 0.5, to: s + W / 2 + 0.5 });
    for (let t = 0; t < L; t += 4) { // the floor and the ceiling, in 4 m slices
      const t1 = Math.min(L, t + 4), tone = (Math.round(t / 4) % 2) ? P.floor : P.floor2;
      floor2.quad([...at(t, -W / 2, 0.024), -W / 4, t / 2], [...at(t1, -W / 2, 0.024), -W / 4, t1 / 2], [...at(t1, W / 2, 0.024), W / 4, t1 / 2], [...at(t, W / 2, 0.024), W / 4, t / 2], tone);
      roofs2.quad(at(t, -W / 2, CEIL), at(t, W / 2, CEIL), at(t1, W / 2, CEIL), at(t1, -W / 2, CEIL), P.roof);
      for (const u of [-W / 2, W / 2]) walls2.quad(at(t, u, FACIA - 0.3), at(t, u, CEIL), at(t1, u, CEIL), at(t1, u, FACIA - 0.3), colour.set(P.wall).multiplyScalar(0.9).getHex());
    }
    walls2.quad(at(L, -W / 2, 0), at(L, -W / 2, CEIL), at(L, W / 2, CEIL), at(L, W / 2, 0), colour.set(P.wall).multiplyScalar(0.85).getHex()); // the back wall
    for (const u of [-W / 2, W / 2]) walls2.quad(at(0, u, 0), at(0, u, FACIA), at(4, u, FACIA), at(4, u, 0), colour.set(P.wall).multiplyScalar(0.9).getHex()); // (the first 4 m of each side: a return wall before the units, so nothing of the hall's shops' backs shows)
    for (const u of [-1, 1]) { // the units along both walls, facing in
      const faceTurn = Math.atan2(-rx * u, -rz * u);
      for (let t = 4; t + 6 <= L - 2; t += 6) { const [x, y, z] = at(t + 3, u * W / 2, 0); unit(x, y, z, faceTurn, hall, 5.1, s + t, 0); }
    }
    for (let t = 3; t < L; t += 6) { // the lights
      const [x, y, z] = at(t, 0, CEIL - 0.08);
      panels.at(x, y, z, h + Math.PI / 2, 2.6, 0.12, 0.9, 0xffffff);
    }
    if (L > 20) { // at the end: a kiosk (an info counter under a round canopy) or a fountain, by turns
      const [x, y, z] = at(L - 5, 0, 0);
      if (rand() < 0.5) { tables.at(x, y + 0.55, z, 0, 2.8, 1.1, 2.8, 0xf4f1ec); columns.at(x, y + 2, z, 0, 0.25, 4, 0.25); tables.at(x, y + 3.2, z, 0, 3.6, 0.2, 3.6, PAL.atrium.facia[1]); }
      else { bins.at(x, y + 0.3, z, 0, 4.2, 0.6, 4.2, 0x9a9ea4); pendants.at(x, y + 0.62, z, 0, 3.8, 0.05, 3.8, 0x6fc4ff); fronds.at(x, y + 1.5, z, 0, 0.5, 1.8, 0.5, 0xbfe8ff); }
    }
    if (open) return; // (a tunnel junction's concourse: open, the train comes through it; its beacons and sign are render/hazards.js's)
    // the mouth: a glass barrier across it on posts, the sign on it, a bollard each side
    { const [x, y, z] = at(2.6, 0, 0); // (2.6 m in from the wall line: nothing of it over the road)
      balustrades.at(x, y + 0.55, z, h, W - 1.4, 1.1, 0.06);
      rails.at(x, y + 1.12, z, h, W - 1.4, 0.06, 0.1);
      for (const u of [-W / 2 + 0.7, 0, W / 2 - 0.7]) { const [px, py, pz] = at(2.6, u, 0); posts.at(px, py + 0.55, pz, 0, 0.08, 1.1, 0.08); }
      signBatch(sign('CLOSED FOR CLEANING', '#f2c21d', '#1a1b1e', null)).at(x + ox * -0.06, y + 0.75, z + oz * -0.06, turn, 2.8, 0.7, 1);
      for (const u of [-W / 2 + 0.6, W / 2 - 0.6]) { const [px, py, pz] = at(1.8, u, 0); bollards.at(px, py + 0.5, pz, 0, 0.22, 1.0, 0.22); }
    }
  };
  // where they open: the outside of each bend in a hall of shops (14 m before the bend), and both sides of the plaza's middle
  const offshoots = (t) => {
    let n = 0;
    for (const [a, , c] of curves) {
      const hall = hallAt(a - 20);
      if (!c || a - 20 <= t.from + 30 || a >= t.to - 30 || !hall || ['foodcourt', 'escalators'].includes(hall) || n >= 7) continue;
      offshoot(a - 14, c > 0 ? -1 : 1, hall, 24 + Math.floor(rand() * 3) * 12);
      n++;
    }
    // the tunnel junctions (a level's "tunnelJunctions", hazards.js): an OPEN concourse each side, lit, no barrier
    for (const j of LEVEL.tunnelJunctions || []) for (const side of [-1, 1]) offshoot(j.s, side, hallAt(j.s) || 'fashion', 30, true);
    const plaza = zones.find(z => z.scenery === 'atrium');
    if (plaza) for (const side of [-1, 1]) offshoot((plaza.from + plaza.to) / 2 + side * 30, side, 'atrium', 48);
  };
  // ---- the facades: the mall's entrance at the tunnel's start (a wall with the opening, a glass canopy out over the approach
  // on columns, the name over the doors, flags on poles, planters and bollards) and the loading dock at its end (roller doors
  // beside the opening, DELIVERIES over it)
  const facade = (t, s, entrance) => {
    const hAt = heightOf(t), H = hAt(s), w = hi(s) - lo(s), mid = (lo(s) + hi(s)) / 2, dir = entrance ? -1 : 1; // (dir: out of the tunnel)
    const col = entrance ? 0xe4dfd6 : 0x9a9ea4;
    facades.on(s, mid, H + 2.2, 0, w + 24, 4.4, 1.4, col);                                        // the lintel, and a parapet
    facades.on(s, mid, H + 4.6, 0, w + 24, 0.5, 2.0, 0x6f757d);
    for (const side of [-1, 1]) facades.on(s, mid + side * (w / 2 + 6), H / 2, 0, 12, H, 1.4, col);  // the piers
    if (entrance) {
      signBatch(sign(NAME, '#1f3a6e', '#ffe8a0', null)).on(s + dir * 0.75, mid, H + 2.2, Math.PI, 10, 2.5, 1);
      signBatch(sign(NAME, '#1f3a6e', '#ffe8a0', null)).on(s + dir * 0.75, mid, H + 2.2, 0, 10, 2.5, 1);
      // the canopy: glass out over the approach, on columns at the run-off's edges
      canopies.on(s + dir * 7, mid, 6.2, 0, w + 10, 0.25, 14);
      for (const side of [-1, 1]) for (const d of [2, 12]) columns.on(s + dir * d, mid + side * (w / 2 + 4.2), 3.1, 0, 0.5, 6.2, 0.5);
      for (const side of [-1, 1]) {
        for (const d of [16, 20, 24]) { poles.on(s + dir * d, mid + side * (w / 2 + 6), 4, 0, 0.12, 8, 0.12); flags.on(s + dir * d, mid + side * (w / 2 + 6) + side * 0.9, 7.2, Math.PI / 2, 1.8, 1.1, 1, PAL.kids.facia[d % 5]); }
        for (const d of [3, 6, 9]) { planters.on(s + dir * d, mid + side * (w / 2 + 2.4), 0.4, 0, 1.4, 0.8, 1.4, 0x6b6f74); leaves.on(s + dir * d, mid + side * (w / 2 + 2.4), 1.1, 0, 1.4, 1.2, 1.4); }
        for (let d = 14; d <= 30; d += 2.5) bollards.on(s + dir * d, mid + side * (w / 2 + 3.2), 0.5, 0, 0.22, 1.0, 0.22);
      }
    } else {
      signBatch(sign('DELIVERIES', '#1a1b1e', '#f2c21d', null)).on(s + dir * 0.75, mid, H + 2.2, Math.PI, 9, 2.2, 1);
      for (const side of [-1, 1]) for (let k = 0; k < 3; k++) rollers.on(s + dir * 0.72, mid + side * (w / 2 + 2.6 + k * 3.4), 2.0, 0, 3.0, 4.0, 0.1, k % 2 ? 0xc8ccd2 : 0xb0b4ba);
      for (const side of [-1, 1]) for (let d = 8; d <= 30; d += 2.5) bollards.on(s + dir * d, mid + side * (w / 2 + 3.2), 0.5, 0, 0.22, 1.0, 0.22);
    }
  };
  // ---- the car park outside: painted bays along both sides, lamp posts, trolley bays, hedges (the ground is asphalt)
  const lines = sheet(new THREE.MeshBasicMaterial({ color: 0xf4f1ec, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const line = (q0, q1, latA, latB) => { // a painted line from (q0, latA(q0)) to (q1, latB(q1)) as one strip of quads 4 m long
    for (let q = q0; q < q1; q += 4) {
      const q1_ = Math.min(q1, q + 4);
      Track.toWorld(q, latA(q), p); const A = [p.x, p.y + 0.03, p.z]; Track.toWorld(q, latB(q), p); const B = [p.x, p.y + 0.03, p.z];
      Track.toWorld(q1_, latB(q1_), p); const C = [p.x, p.y + 0.03, p.z]; Track.toWorld(q1_, latA(q1_), p); const D = [p.x, p.y + 0.03, p.z];
      lines.quad(A, B, C, D, 0xffffff);
    }
  };
  const carpark = (from, to) => {
    for (const side of [-1, 1]) {
      line(from, to, (q) => off(side, q, 0.1), (q) => off(side, q, 0.25));                 // the road's edge line (the theme is unmarked: its own)
      line(from + 4, to - 4, (q) => off(side, q, 5.0), (q) => off(side, q, 5.14));           // the bay row's kerb line
      for (let q = from + 4; q < to - 4; q += 2.7) line(q, q + 0.14, (r) => off(side, r, 5.0), (r) => off(side, r, 9.8)); // the bays' ticks, across
      for (let q = from + 15; q < to - 10; q += 36) { lamps.on(q, off(side, q, 4.6), 4, 0, 0.18, 8, 0.18); lampHeads.on(q, off(side, q, 4.6) - side * 0.6, 7.9, 0, 0.5, 0.2, 1.4, 0xfff4d0); }
      for (let q = from + 30; q < to - 10; q += 60) trolleyBays.on(q, off(side, q, 11), 1.1, facing(side), 2.4, 2.2, 4);
      for (let q = from + 2; q < to - 2; q += 4) hedges.on(q, off(side, q, 13.5), 0.5, 0, 1.2, 1.0, 4.1);
    }
  };

  // ---- lay it out (an error here is said, not swallowed: road.js redraws a level when its theme's file arrives, inside a promise)
  try {
  for (const t of tunnels) {
    offshoots(t);
    lights(t);
    for (const z of zones) {
      if (z.to <= t.from || z.from >= t.to) continue;
      const from = Math.max(z.from, t.from), to = Math.min(z.to, t.to);
      if (z.scenery === 'atrium') atrium(z, t);
      else if (z.scenery === 'foodcourt') foodcourt(z, t);
      else if (z.scenery === 'escalators') escalators(z, t);
      else if (z.scenery === 'kids') kids(z, t);
      else for (const side of [-1, 1]) fronts(from, to, side, PAL[z.scenery] ? z.scenery : 'fashion');
    }
    facade(t, t.from, true);
    facade(t, t.to, false);
    carpark(Track.start, t.from - 2);
    carpark(t.to + 2, Track.end);
  }
  } catch (e) { console.error('mall scenery:', e); }
  if (!tunnels.length) carpark(Track.start, Track.end);
  flush();
  floor2.flush(); walls2.flush(); roofs2.flush(); slabs.flush(); glassSheet.flush(); railSheet.flush(); lines.flush();

  // ---- the escalators' steps move: each step rides up (or down) its escalator's slope and comes round again
  if (movers.length && steps.mesh) {
    const mesh = steps.mesh;
    everyFrame(levelGroup, (t) => {
      for (const m of movers) {
        for (let i = 0; i < m.count; i++) {
          const u = (((i / m.count) + m.dir * t * 0.028 + m.phase) % 1 + 1) % 1;
          const h = Track.toWorld(m.s0 + m.RUN * u, m.lat, p);
          dummy.position.set(p.x, p.y + m.RISE * u + 0.1, p.z);
          dummy.rotation.set(0, h, 0);
          dummy.scale.set(1.4, 0.2, 0.5);
          dummy.updateMatrix();
          mesh.setMatrixAt(m.first + i, dummy.matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // (an ice patch on a mall level is a freshly MOPPED stretch (the Wet floor card): render/icepatch.js draws it so, ICE_LOOKS.mall. Mall
  // Dash's wet floor is standing water now, its "waterPatches", drawn with the theme's standingWater tint in render/hazards.js)
  void theme; void CONFIG; void q;
};
