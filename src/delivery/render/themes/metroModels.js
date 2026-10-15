// ---- The metro's models and pictures (see metro.js): no game state, so the gimmicks page can show the obstacles too.
// The theme's plain obstacles, each the box and cost of the kind it stands in for (registered in ../obstacleModels.js;
// config.js obstacleKinds, collision.js SIZE): a ticket gate (a crate), a ride-on floor scrubber (a bale), a red track lamp
// on its tripod (a cone); named outright a rail trolley with sleepers on it (a crate) and a wayfinding board on its legs (a
// sign); and a tunnel junction's load (themes.js junctionTrain): a cable drum slung under a hoist on a beam across the road.
// Each is ONE merged mesh in vertex colours (and one lit mesh for its lamps):
// a draw call or two, not one a part. Each faces local +z, its feet on y = 0. No people anywhere.
// The pictures (every one drawn in code on a canvas, the first time it is wanted, then kept): glazed wall tiles, concrete,
// a tunnel's lining segments, the polished floor, the tactile strip, the signs (pictograms and
// abstract bars, no words a brand could own), a clock face, the kilometre markers' digits.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeCarriage } from '../trainModel.js';

const colour = new THREE.Color(), euler = new THREE.Euler(), matrix = new THREE.Matrix4();
// the underside of a tunnel junction's hoist beam over the road (metro.js draws the beam, the hoistDrum hangs from it): under the chase
// camera's 5.6 m by more than its near plane
export const HOIST_BEAM = 4.6;
// ---- a kit of parts merged into one mesh in vertex colours (and one unlit for whatever glows)
export const kit = () => {
  const solid = [], lit = [];
  const add = (list, geo, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    matrix.makeRotationFromEuler(euler.set(rx, ry, rz)).setPosition(x, y, z);
    g.applyMatrix4(matrix);
    colour.set(col);
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = colour.r; c[i * 3 + 1] = colour.g; c[i * 3 + 2] = colour.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    list.push(g);
  };
  const K = {
    box: (w, h, d, col, x, y, z, rx, ry, rz) => add(solid, new THREE.BoxGeometry(w, h, d), col, x, y, z, rx, ry, rz),
    cyl: (rt, rb, h, n, col, x, y, z, rx, ry, rz) => add(solid, new THREE.CylinderGeometry(rt, rb, h, n), col, x, y, z, rx, ry, rz),
    glowBox: (w, h, d, col, x, y, z, rx, ry, rz) => add(lit, new THREE.BoxGeometry(w, h, d), col, x, y, z, rx, ry, rz),
    glowCyl: (rt, rb, h, n, col, x, y, z, rx, ry, rz) => add(lit, new THREE.CylinderGeometry(rt, rb, h, n), col, x, y, z, rx, ry, rz),
    // the merged geometries: { solid, lit } (either null)
    geometries: () => ({ solid: solid.length ? mergeGeometries(solid) : null, lit: lit.length ? mergeGeometries(lit) : null }),
    // into a group: the solid parts lit by the scene, the glowing ones not
    done: (group = new THREE.Group()) => {
      const { solid: s, lit: l } = K.geometries();
      if (s) group.add(new THREE.Mesh(s, new THREE.MeshLambertMaterial({ vertexColors: true })));
      if (l) group.add(new THREE.Mesh(l, new THREE.MeshBasicMaterial({ vertexColors: true })));
      return group;
    },
  };
  return K;
};
// (the dark patch under an obstacle, as obstacleModels.js has it: a pale floor shows a shadow well)
const grounded = (group, r) => {
  const shade = new THREE.Mesh(new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.03;
  group.add(shade);
  return group;
};

// ---- the pictures ----------------------------------------------------------------------------------------------
const made = {};
const canvasTexture = (key, w, h, draw, repeat = true) => {
  if (made[key]) return made[key];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(canvas);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.userData.shared = true;
  made[key] = t;
  return t;
};
// a seeded dice of its own for the pictures (the same every time; Math.random is the game's)
const dice = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// a blob drawn at (x, y) and again across every edge it overlaps, so the picture repeats without a seam
const wrapped = (g, w, h, x, y, r, draw) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (x + dx > -r && x + dx < w + r && y + dy > -r && y + dy < h + r) draw(x + dx, y + dy); };

// GLAZED TILES (256 x 256: 4 across, 8 up, brick bond), white with a glaze highlight in each and grey grout: tinted by the
// sheets' vertex colours (cream, a line's colour band). One repeat is 1.2 m across and 1.2 m up
export const tileTexture = () => canvasTexture('tile', 256, 256, (g, w, h) => {
  const rand = dice(91);
  g.fillStyle = '#8f9192';
  g.fillRect(0, 0, w, h);
  const TW = 64, TH = 32;
  for (let row = 0; row < 8; row++) {
    for (let k = -1; k < 5; k++) {
      const x = k * TW + (row % 2 ? TW / 2 : 0), y = row * TH, v = 236 + Math.floor(rand() * 16);
      const grad = g.createLinearGradient(x, y, x, y + TH);
      grad.addColorStop(0, `rgb(${v},${v},${v})`);
      grad.addColorStop(0.35, '#ffffff');
      grad.addColorStop(1, `rgb(${v - 14},${v - 14},${v - 12})`);
      g.fillStyle = grad;
      g.fillRect(x + 2, y + 2, TW - 4, TH - 4);
    }
  }
});
// CONCRETE (256 x 256): a grey board-marked face, mottled, a formwork joint across and down, a tie hole or two
export const concreteTexture = () => canvasTexture('concrete', 256, 256, (g, w, h) => {
  const rand = dice(17);
  g.fillStyle = '#c4c4c0';
  g.fillRect(0, 0, w, h);
  for (let k = 0; k < 260; k++) {
    const x = rand() * w, y = rand() * h, r = 4 + rand() * 22, v = 170 + Math.floor(rand() * 60);
    wrapped(g, w, h, x, y, r, (px, py) => { g.fillStyle = `rgba(${v},${v},${v - 4},0.18)`; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); });
  }
  g.fillStyle = 'rgba(60,60,60,0.35)';
  g.fillRect(0, 0, w, 3);
  g.fillRect(0, 0, 3, h);
  g.fillStyle = 'rgba(40,40,40,0.5)';
  for (const [x, y] of [[64, 64], [192, 64], [64, 192], [192, 192]]) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
});
// A TUNNEL'S LINING (128 x 256): precast segments, a ring joint across every repeat and a segment joint up it, bolt pockets,
// the odd damp streak. One repeat is 1.5 m along and 3 m round
export const liningTexture = () => canvasTexture('lining', 128, 256, (g, w, h) => {
  const rand = dice(53);
  g.fillStyle = '#b6b7b2';
  g.fillRect(0, 0, w, h);
  for (let k = 0; k < 120; k++) {
    const x = rand() * w, y = rand() * h, r = 3 + rand() * 14, v = 150 + Math.floor(rand() * 70);
    wrapped(g, w, h, x, y, r, (px, py) => { g.fillStyle = `rgba(${v},${v},${v},0.2)`; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); });
  }
  g.fillStyle = 'rgba(30,30,30,0.55)';
  g.fillRect(0, 0, 4, h);              // the ring joint (across the tunnel: u runs along it)
  g.fillRect(0, 120, w, 3);            // a segment joint
  g.fillStyle = 'rgba(30,30,30,0.45)';
  for (const y of [40, 200]) for (const x of [14, 108]) g.fillRect(x - 5, y - 4, 10, 8); // the bolt pockets
  g.fillStyle = 'rgba(70,80,70,0.12)';
  g.fillRect(70, 0, 10, h);            // a damp streak
});
// THE FLOOR (256 x 256): polished, sealed concrete, faintly mottled with a soft wet sheen; NOTHING on it that reads as a
// marking (the owner: zero floor markings: one continuous floor, wall to wall). One repeat is 4 m
export const floorTexture = () => canvasTexture('floor', 256, 256, (g, w, h) => {
  const rand = dice(7);
  g.fillStyle = '#d2d3d0';
  g.fillRect(0, 0, w, h);
  for (let k = 0; k < 340; k++) {
    const x = rand() * w, y = rand() * h, r = 5 + rand() * 26, v = 180 + Math.floor(rand() * 60);
    wrapped(g, w, h, x, y, r, (px, py) => { g.fillStyle = `rgba(${v},${v},${v + 3},0.14)`; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); });
  }
  for (let k = 0; k < 18; k++) { // (the sheen: long soft pale smears along the floor)
    const x = rand() * w, y = rand() * h, len = 40 + rand() * 90;
    wrapped(g, w, h, x, y, len, (px, py) => {
      const grad = g.createLinearGradient(px - 8, py, px + 8, py);
      grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.16)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(px - 8, py - len / 2, 16, len);
    });
  }
});
// THE TACTILE STRIP along a platform's edge (64 x 64): yellow, raised blisters in rows
export const tactileTexture = () => canvasTexture('tactile', 64, 64, (g, w, h) => {
  g.fillStyle = '#f2c21d';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#d9a90e';
  for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#fff2a8';
  for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x - 1.5, y - 1.5, 1.6, 0, Math.PI * 2); g.fill(); }
});
// SIGNS: a board in a line's colour with a white pictogram on the left and abstract white bars for its words (no words: the
// owner's rule, no names a brand could own). `kind`: 'train' (a train's front), 'exit' (a door with an arrow out of it),
// 'stairs' (steps going down), 'arrow' (an arrow along), 'name' (a station's name board: a band, bars in its middle)
export const signTexture = (kind, bg) => canvasTexture('sign-' + kind + bg, 256, 64, (g, w, h) => {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 5;
  g.lineCap = 'round';
  const bars = (x0, n) => { const rand = dice(x0 * 7 + n); for (let k = 0; k < n; k++) { const x = x0 + k * 34 + rand() * 4; g.fillRect(x, 24, 22 + rand() * 8, 16); } };
  if (kind === 'name') { // the station's name board: a white panel in the middle, dark bars on it, the line's colour round
    g.fillStyle = '#f4f4f2'; g.fillRect(36, 14, 184, 36);
    g.fillStyle = '#1b1d22'; const rand = dice(5); for (let k = 0; k < 5; k++) g.fillRect(48 + k * 34, 24, 22 + rand() * 6, 16);
    return;
  }
  g.save();
  g.translate(32, 32);
  if (kind === 'train') { // a train seen head on: the body, two windows, two lamps
    g.fillRect(-16, -20, 32, 36); g.fillStyle = bg; g.fillRect(-12, -15, 24, 12); g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(-8, 8, 3, 0, Math.PI * 2); g.arc(8, 8, 3, 0, Math.PI * 2); g.fillStyle = bg; g.fill(); g.fillStyle = '#ffffff';
    g.fillRect(-18, 18, 36, 3);
  } else if (kind === 'exit') { // a doorway and an arrow out through it
    g.strokeRect(-18, -20, 20, 40); g.beginPath(); g.moveTo(-6, 0); g.lineTo(18, 0); g.moveTo(10, -8); g.lineTo(18, 0); g.lineTo(10, 8); g.stroke();
  } else if (kind === 'stairs') { // steps going down to the right
    g.beginPath(); g.moveTo(-20, -18); g.lineTo(-10, -18); g.lineTo(-10, -8); g.lineTo(0, -8); g.lineTo(0, 2); g.lineTo(10, 2); g.lineTo(10, 12); g.lineTo(20, 12); g.stroke();
  } else { // an arrow along
    g.beginPath(); g.moveTo(-18, 0); g.lineTo(18, 0); g.moveTo(8, -10); g.lineTo(18, 0); g.lineTo(8, 10); g.stroke();
  }
  g.restore();
  bars(76, 5);
}, false);
// a station CLOCK's face (128 x 128): white, the twelve marks, hands at ten to two
export const clockTexture = () => canvasTexture('clock', 128, 128, (g) => {
  g.fillStyle = '#1b1d22'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b1d22';
  for (let k = 0; k < 12; k++) { g.save(); g.translate(64, 64); g.rotate(k * Math.PI / 6); g.fillRect(-2.5, -56, 5, k % 3 ? 9 : 15); g.restore(); }
  g.lineCap = 'round'; g.strokeStyle = '#1b1d22';
  g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 - 26, 64 - 15); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 30, 64 - 38); g.stroke();
  g.fillStyle = '#d8262b'; g.beginPath(); g.arc(64, 64, 5, 0, Math.PI * 2); g.fill();
}, false);
// the KILOMETRE MARKERS' digits (256 x 32: '0' to '9' and '.', each 23 px of it, black on white): a marker is a few quads, each
// showing one cell (DIGIT_CELLS)
export const DIGIT_CELLS = 11;
export const digitTexture = () => canvasTexture('digits', 256, 32, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111111'; g.font = 'bold 28px system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const cw = w / DIGIT_CELLS;
  for (let k = 0; k < DIGIT_CELLS; k++) g.fillText(k < 10 ? String(k) : '.', cw * (k + 0.5), h / 2 + 1);
}, false);
// an ADVERT panel's poster (128 x 192): abstract shapes in bold colours, no words
export const posterTexture = (k) => canvasTexture('poster' + k, 128, 192, (g, w, h) => {
  const rand = dice(31 + k * 11), cols = ['#d8262b', '#1f6fd0', '#2e9b3d', '#f2c21d', '#7a3aa8', '#e8751a', '#1fa0a0'];
  g.fillStyle = cols[k % cols.length]; g.fillRect(0, 0, w, h);
  for (let n = 0; n < 4; n++) { g.fillStyle = cols[Math.floor(rand() * cols.length)]; g.beginPath(); g.arc(rand() * w, rand() * h, 18 + rand() * 40, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(14, h - 46, w - 28, 10); g.fillRect(14, h - 30, w * 0.5, 8);
}, false);

// ---- the obstacles --------------------------------------------------------------------------------------------
export const METRO_OBSTACLES = {
  // the metro's crate: a TICKET GATE: two stainless cabinets with red paddles closed between them, a lit arrow and a lit cross on
  // their tops, the line's blue band round each. Stands in a lane as a crate does (hw 0.6, 1.1 m tall)
  ticketGate: () => {
    const K = kit();
    for (const x of [-0.42, 0.42]) {
      K.box(0.3, 1.0, 1.2, 0xc9ced4, x, 0.5, 0);
      K.box(0.32, 0.12, 1.22, 0x1f6fd0, x, 0.86, 0);
      K.box(0.32, 0.04, 1.22, 0x2a2d33, x, 1.02, 0);
      K.box(0.31, 0.06, 0.3, 0x1b1d22, x, 0.06, 0);
    }
    for (const x of [-0.16, 0.16]) K.box(0.24, 0.5, 0.05, 0xd8262b, x, 0.65, 0.1); // the paddles, shut
    K.glowBox(0.16, 0.02, 0.16, 0x39d353, -0.42, 1.05, 0.35);
    K.glowBox(0.16, 0.02, 0.16, 0xff3030, 0.42, 1.05, 0.35);
    return grounded(K.done(), 0.75);
  },
  // the metro's bale: a RIDE-ON FLOOR SCRUBBER, parked: a yellow body, the seat and the wheel (no driver), a brush deck before and a
  // black squeegee behind, an amber beacon on a mast. A bale's box (2.2 m square, 1.5 m)
  scrubber: () => {
    const K = kit(), yellow = 0xf2b51d, dark = 0x2a2d33;
    K.box(1.5, 0.75, 1.7, yellow, 0, 0.55, 0);
    K.box(1.4, 0.2, 1.6, dark, 0, 0.12, 0);
    K.box(1.7, 0.25, 0.5, 0x4a4f57, 0, 0.18, 0.95);                       // the brush deck
    K.box(2.1, 0.12, 0.18, 0x1b1d22, 0, 0.1, -1.0);                        // the squeegee
    K.box(0.7, 0.12, 0.6, 0x1b1d22, 0, 0.98, -0.25);                       // the seat
    K.box(0.7, 0.5, 0.1, 0x1b1d22, 0, 1.22, -0.55);                        // its back
    K.cyl(0.04, 0.04, 0.6, 6, 0x4a4f57, 0, 1.15, 0.45, -0.5, 0, 0);       // the column
    K.cyl(0.2, 0.2, 0.04, 14, 0x1b1d22, 0, 1.42, 0.55, -0.5, 0, 0);       // the wheel
    K.box(0.06, 0.8, 0.06, 0x4a4f57, 0.6, 1.3, -0.7);                      // the beacon's mast
    K.glowCyl(0.1, 0.1, 0.16, 10, 0xffa020, 0.6, 1.78, -0.7);
    for (const x of [-0.72, 0.72]) for (const z of [-0.55, 0.55]) K.cyl(0.18, 0.18, 0.14, 12, 0x1b1d22, x, 0.18, z, 0, 0, Math.PI / 2);
    K.box(1.52, 0.08, 1.72, 0xd89a10, 0, 0.94, 0);                          // a lip round the top
    return grounded(K.done(), 1.2);
  },
  // the metro's cone: a TRACK LAMP, a red lamp lit on a tripod, a white band round its post, a weight on its foot (a cone's box)
  trackLamp: () => {
    const K = kit();
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; K.box(0.05, 0.75, 0.05, 0x2a2d33, Math.sin(a) * 0.2, 0.33, Math.cos(a) * 0.2, Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45); }
    K.cyl(0.035, 0.035, 0.5, 6, 0x2a2d33, 0, 0.85, 0);
    K.cyl(0.05, 0.05, 0.12, 8, 0xf4f4f2, 0, 0.78, 0);
    K.box(0.32, 0.32, 0.22, 0x1b1d22, 0, 1.05, 0);
    K.glowCyl(0.12, 0.12, 0.05, 14, 0xff2a1a, 0, 1.05, 0.12, Math.PI / 2, 0, 0);
    K.glowCyl(0.12, 0.12, 0.05, 14, 0xff2a1a, 0, 1.05, -0.12, Math.PI / 2, 0, 0);
    K.box(0.4, 0.1, 0.4, 0x6f757d, 0, 0.05, 0);
    return grounded(K.done(), 0.45);
  },
  // a RAIL TROLLEY: a low flat trolley on four flanged wheels with concrete sleepers stacked on it, strapped, a striped handle
  // up behind (a crate's box)
  railTrolley: () => {
    const K = kit();
    K.box(1.1, 0.12, 1.2, 0x4a4f57, 0, 0.32, 0);
    for (const x of [-0.45, 0.45]) for (const z of [-0.42, 0.42]) { K.cyl(0.17, 0.17, 0.08, 12, 0x1b1d22, x, 0.18, z, 0, 0, Math.PI / 2); K.cyl(0.2, 0.2, 0.03, 12, 0x6f757d, x + (x > 0 ? 0.05 : -0.05), 0.18, z, 0, 0, Math.PI / 2); }
    for (const z of [-0.3, 0, 0.3]) K.box(1.05, 0.16, 0.26, 0xa9aba5, 0, 0.46, z);   // the sleepers: three across the bed...
    for (const z of [-0.15, 0.15]) K.box(1.05, 0.16, 0.26, 0xb4b6b0, 0, 0.63, z);    // ...two on them
    K.box(0.06, 0.38, 1.1, 0xe8751a, 0.3, 0.6, 0);
    K.box(0.06, 0.38, 1.1, 0xe8751a, -0.3, 0.6, 0);
    for (const x of [-0.45, 0.45]) K.box(0.06, 0.7, 0.06, 0xd8262b, x, 0.7, -0.6);
    K.box(0.96, 0.08, 0.08, 0xf4f4f2, 0, 1.06, -0.6);
    return grounded(K.done(), 0.75);
  },
  // a WAYFINDING BOARD on its two legs: a line's colour band over a white panel with a pictogram and bars, both faces (a sign's
  // box: 2.2 m wide, 3 m tall, thin)
  infoTotem: () => {
    const K = kit(), group = new THREE.Group();
    for (const x of [-0.95, 0.95]) K.box(0.12, 3.0, 0.12, 0x4a4f57, x, 1.5, 0);
    K.box(2.1, 1.6, 0.1, 0xf4f4f2, 0, 2.05, 0);
    K.box(2.1, 0.3, 0.12, 0xd8262b, 0, 2.95, 0);
    for (const x of [-0.95, 0.95]) K.box(0.3, 0.08, 0.5, 0x2a2d33, x, 0.04, 0);
    K.done(group);
    const face = new THREE.MeshBasicMaterial({ map: signTexture('exit', '#1f6fd0') });
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), face);
      m.position.set(0, 2.35, side * 0.056);
      if (side < 0) m.rotation.y = Math.PI;
      group.add(m);
      const m2 = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshBasicMaterial({ map: signTexture('stairs', '#2e9b3d') }));
      m2.position.set(0, 1.75, side * 0.056);
      if (side < 0) m2.rotation.y = Math.PI;
      group.add(m2);
    }
    return grounded(group, 1.1);
  },
  // a PILLAR in a lane (lanegimmicks.js "pillars", obstacle kind `pillar`: a wreck, as a dead end's wall): a 1.4 m square concrete
  // column up to the tunnel's ceiling (8.5 m: running tunnels and bores), a dark plinth, its foot wrapped in yellow and black hazard
  // bands to 2 m, a red and white hazard board and an amber lamp on each face along the road, a cap under the ceiling. One merged
  // mesh (and one lit). Generic in shape, kept here with the metro's (the only theme with pillars so far)
  pillar: () => {
    const K = kit(), group = new THREE.Group(), H = 8.5;
    K.box(1.62, 0.25, 1.62, 0x6a6c6e, 0, 0.125, 0);
    K.box(1.4, H - 0.25, 1.4, 0xc9c8c0, 0, 0.25 + (H - 0.25) / 2, 0);
    for (let k = 0; k < 6; k++) K.box(1.44, 0.3, 1.44, k % 2 ? 0x1b1d22 : 0xf2c21d, 0, 0.4 + k * 0.3, 0);
    for (const z of [-0.73, 0.73]) {
      K.box(1.1, 0.7, 0.03, 0xd8262b, 0, 2.75, z);
      for (const x of [-0.32, 0, 0.32]) K.box(0.12, 0.8, 0.035, 0xffffff, x, 2.75, z, 0, 0, 0.6);
      K.glowBox(0.34, 0.2, 0.05, 0xffb020, 0, 3.4, z);
    }
    K.box(1.7, 0.35, 1.7, 0x9a9b96, 0, H - 0.175, 0);
    K.done(group);
    return grounded(group, 1.1);
  },
  // a tunnel junction's load (hazards.js, themes.js junctionTrain: two of them, 3 m apart): a CABLE DRUM slung under a HOIST that runs on
  // the beam across the road (metro.js draws the beam, its underside HOIST_BEAM m up): the maintenance crews moving cable from one
  // service passage to the other. A wooden drum wound with orange power cable (1.9 m across, 1.2 wide: its axle along local x, so
  // crossing the road it shows the player its round face), a steel spindle through it, slings up to a spreader bar, a chain to the
  // hook block, the hoist's yellow body under the beam on its wheels, an amber lamp lit each way. Its box is the drum's (collision.js)
  hoistDrum: () => {
    const K = kit(), group = new THREE.Group(), R = 0.95, Y = 0.3 + R, TOP = HOIST_BEAM;
    for (const x of [-0.56, 0.56]) K.cyl(R, R, 0.08, 20, 0x8a6a42, x, Y, 0, 0, 0, Math.PI / 2); // the flanges
    for (const x of [-0.61, 0.61]) for (const a of [0, Math.PI / 2]) K.box(0.03, 0.1, R * 1.7, 0x5a4026, x, Y, 0, a); // battens across them
    K.cyl(0.78, 0.78, 1.04, 20, 0xc8501a, 0, Y, 0, 0, 0, Math.PI / 2); // the cable wound on it
    for (const x of [-0.3, 0.05, 0.4]) K.cyl(0.785, 0.785, 0.04, 20, 0x8a3a12, x, Y, 0, 0, 0, Math.PI / 2); // (its turns)
    K.cyl(0.07, 0.07, 1.6, 8, 0x9aa0a8, 0, Y, 0, 0, 0, Math.PI / 2); // the spindle
    const bar = 2.75;
    for (const x of [-0.76, 0.76]) K.box(0.05, bar - Y, 0.05, 0x2a2d33, x, (Y + bar) / 2, 0); // the slings
    K.box(1.75, 0.12, 0.14, 0xe8b51a, 0, bar, 0); // the spreader bar
    for (const x of [-0.4, 0.4]) K.box(0.04, 0.62, 0.04, 0x2a2d33, x * 0.55, bar + 0.3, 0, 0, 0, x > 0 ? -0.55 : 0.55); // (a V up to the block)
    K.box(0.3, 0.38, 0.26, 0xe8b51a, 0, bar + 0.75, 0); // the hook block
    K.box(0.05, TOP - 0.45 - (bar + 0.94), 0.05, 0x2a2d33, 0, (bar + 0.94 + TOP - 0.45) / 2, 0); // its chain
    K.box(0.62, 0.42, 1.0, 0xe8b51a, 0, TOP - 0.24, 0); // the hoist, under the beam
    K.box(0.66, 0.06, 1.04, 0x2a2d33, 0, TOP - 0.45, 0);
    for (const z of [-0.36, 0.36]) for (const x of [-0.22, 0.22]) K.cyl(0.07, 0.07, 0.06, 10, 0x2a2d33, x, TOP - 0.03, z, 0, 0, Math.PI / 2); // its wheels on the flange
    for (const z of [-0.51, 0.51]) K.glowBox(0.22, 0.14, 0.04, 0xffb020, 0, TOP - 0.2, z); // amber lamps, each way it goes
    K.done(group);
    return grounded(group, 1.0);
  },
};

// ---- THE CANBERRA TRAIN'S CARRIAGES, for the metro (render/trainModel.js makeCarriage: the bullet train's white and blue shell, its
// SECTION and paint; a level crossing's train is the same, cut down). `flatten` merges a carriage's meshes into one geometry in vertex
// colours, to be instanced (a draw call for every car of a kind, not five a car), and with `litGlass` its dark window panels become
// lit ones (the inside lit: a train in a tunnel), moved into a second, unlit geometry with its lamps
const GLASS = new THREE.Color(0x1b2430);
export const flatten = (group, litGlass = null) => {
  group.updateMatrixWorld(true);
  const solid = [], lit = [], glass = litGlass && new THREE.Color(litGlass);
  group.traverse((m) => {
    if (!m.isMesh) return;
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
    g.applyMatrix4(m.matrixWorld);
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(name)) g.deleteAttribute(name);
    const n = g.attributes.position.count, basic = m.material.type === 'MeshBasicMaterial';
    if (!g.attributes.color) { const c = m.material.color, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    if (basic) { lit.push(g); return; }
    if (!glass) { solid.push(g); return; }
    // (the glass's triangles apart: lit)
    const col = g.attributes.color.array, pos = g.attributes.position.array, nor = g.attributes.normal.array, keep = [[], [], []], move = [[], [], []];
    for (let t = 0; t < n; t += 3) {
      const isGlass = Math.abs(col[t * 3] - GLASS.r) < 1e-4 && Math.abs(col[t * 3 + 1] - GLASS.g) < 1e-4 && Math.abs(col[t * 3 + 2] - GLASS.b) < 1e-4;
      const to = isGlass ? move : keep;
      for (let v = t; v < t + 3; v++) { to[0].push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); to[1].push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]); to[2].push(...(isGlass ? [glass.r, glass.g, glass.b] : [col[v * 3], col[v * 3 + 1], col[v * 3 + 2]])); }
    }
    for (const [list, [P, N, C]] of [[solid, keep], [lit, move]]) {
      if (!P.length) continue;
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      list.push(out);
    }
  });
  return { solid: solid.length ? mergeGeometries(solid) : null, lit: lit.length ? mergeGeometries(lit) : null };
};
// a Canberra carriage scaled to w x h x l (m), flattened: { solid, lit }. kind 'front' (nose, lamps lit), 'back' (nose turned back,
// its tail lamps), 'mid'; litGlass: the windows lit
const carriageCache = new Map();
export const canberraCar = (kind, w, h, l, litGlass = 0xffe9b8) => {
  const key = [kind, w, h, l, litGlass].join();
  if (carriageCache.has(key)) return carriageCache.get(key);
  const c = makeCarriage(kind !== 'mid', kind === 'front'), holder = new THREE.Group();
  c.scale.set(w / 3.0, h / 3.6, l / 25); // (makeCarriage's: 3.0 m wide, 3.6 tall, 25 long: CONFIG.bulletTrain)
  if (kind === 'back') c.rotation.y = Math.PI;
  holder.add(c);
  const out = flatten(holder, litGlass);
  carriageCache.set(key, out);
  return out;
};
// the metro's side-line train: a Canberra carriage CAR_LENGTH m long (cut down from 25, as a level crossing's train is, so it keeps to
// the bore in a 40 m bend), 2.7 m wide, its full 3.6 m tall
export const CAR_LENGTH = 12;
export const metroTrainCars = (litGlass) => ({ front: canberraCar('front', 2.7, 3.6, CAR_LENGTH, litGlass), mid: canberraCar('mid', 2.7, 3.6, CAR_LENGTH, litGlass), back: canberraCar('back', 2.7, 3.6, CAR_LENGTH, litGlass) });
