// ---- HAZARDS: Gimmick Road 2's things that aren't obstacles (what they do: ../hazards.js;
// the trolleys, runners, wide load and the rest that can be
// run into are drawn as obstacles) ----
// A school crossing: a zebra, a lollipop person at the kerb whose sign turns to STOP, and the children
// walking across. A burst water main: a jet of water out of the road and the wet lane beyond it. A
// hot-air balloon coming down on its lanes, its shadow flashing where it will land. A drawbridge: the
// river, two leaves that lift, a boom and lamps each side.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { THEMES } from '../themes.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Hazards } from '../hazards.js';
import { scene, tmp } from './scene.js';
import { buildStrip } from './road.js';
import { Particles, rnd } from './effects.js';
import { makeWorker } from './siteModels.js';
import { makePuddle, makeFountain } from './watermains.js';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const flat = (color, offset, extra) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset, ...extra });
const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// a group set down on the road at (s, lat), facing along it (its local +z the player's way, +x to the left)
const at = (s, lat, y = 0) => {
  const g = new THREE.Group();
  g.rotation.y = Track.toWorld(s, lat, tmp);
  g.position.set(tmp.x, tmp.y + y, tmp.z);
  group.add(g);
  return g;
};
// words on a board (a canvas texture)
const board = (text, bg, fg, w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round(512 * h / w);
  const c = canvas.getContext('2d');
  c.fillStyle = bg;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = fg;
  c.font = `bold ${Math.round(canvas.height * 0.55)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }));
};
// a round sign's face, a word on a colour
const disc = (text, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = color;
  c.beginPath();
  c.arc(64, 64, 62, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#fff';
  c.font = 'bold 40px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 64, 66);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
};
const STOP = disc('STOP', '#d8262b'), WAIT = disc('', '#f2c21c');
const LAMP_ON = 0xff2a1a, LAMP_OFF = 0x3a1210;
// a red and white boom, `length` m long, reaching out along local +x from its pivot
const boom = (length) => {
  const swing = new THREE.Group();
  for (let k = 0; k < length; k++) {
    const piece = Math.min(1, length - k);
    add(swing, box(piece, 0.14, 0.14), lambert(k % 2 ? 0xf4f4f4 : 0xd8262b), k + piece / 2, 0, 0);
  }
  return swing;
};

const group = new THREE.Group();
scene.add(group);
let schools = [], mains = [], balloons = [], bridges = [];

Game.onLoad.push(() => {
  group.clear();
  const LW = CONFIG.laneWidth;
  // ---- school crossings
  schools = (LEVEL.schoolCrossings || []).map((c) => {
    const s = Track.place(c), lo = Track.laneLo(s), hi = Track.laneHi(s);
    for (let lat = lo + 0.5; lat < hi - 0.4; lat += 1.4) group.add(new THREE.Mesh(buildStrip(s - 2, s + 2, lat, lat + 0.7, 0.03, 2), flat(0xf4f4f4, -3)));
    // the lollipop person, at the kerb on the player's right, facing the traffic coming up
    const person = makeWorker(), h = Track.toWorld(s - 3, hi + 0.9, tmp);
    person.position.copy(tmp);
    person.rotation.y = h + Math.PI;
    add(person, box(0.06, 2.2, 0.06), lambert(0xf4f4f4), 0.35, 1.7, 0.2);
    const faces = [add(person, new THREE.CircleGeometry(0.6, 20), WAIT, 0.35, 3.05, 0.24), add(person, new THREE.CircleGeometry(0.6, 20), WAIT, 0.35, 3.05, 0.16)];
    faces[1].rotation.y = Math.PI;
    group.add(person);
    // (and a school sign either side, well short of it)
    for (const [d, lat, turn] of [[-45, Track.hi(s - 45) - 0.5, Math.PI], [45, Track.lo(s + 45) + 0.5, 0]]) {
      const post = at(s + d, lat);
      add(post, box(0.14, 2.8, 0.14), lambert(0x8a9096), 0, 1.4, 0);
      const sign = board('SCHOOL', '#f2c21c', '#111', 2, 0.9);
      sign.position.set(0, 3.1, 0);
      sign.rotation.y = turn;
      post.add(sign);
    }
    // the children: small, bright, in a line
    const colours = [0xff4f8b, 0x2f7de1, 0xffd23f, 0x39d353, 0xff7a1a, 0xb026ff];
    const children = Array.from({ length: CONFIG.schoolCrossing.children }, (_, k) => {
      const child = new THREE.Group();
      add(child, box(0.34, 0.5, 0.24), lambert(colours[k % colours.length]), 0, 0.75, 0);
      add(child, box(0.3, 0.5, 0.2), lambert(0x2b2f38), 0, 0.25, 0);
      add(child, new THREE.SphereGeometry(0.17, 10, 8), lambert(0xf2c09a), 0, 1.17, 0);
      add(child, box(0.3, 0.36, 0.16), lambert(colours[(k + 3) % colours.length]), 0, 0.8, -0.2); // (a school bag)
      group.add(child);
      return child;
    });
    return { s, lo: Track.lo(s) + 0.4, hi: Track.hi(s) - 0.4, faces, children };
  });
  // ---- burst water mains: the wet lane, and the broken cover the water comes out of
  mains = (LEVEL.waterMains || []).map((m) => {
    const from = Track.place(m), to = from + (m.length ?? CONFIG.waterMain.length);
    const lat = (s) => Track.laneOffset(m.lane, s);
    // (the wet lane: a run of pools down it, each its own shape, overlapping, the ones further from the main
    // filling later and drying sooner. The pictures fade out well inside their edges, so they are cut wide)
    // (and under them the whole wet length, marked from end to end: the lane filled with a thin sheet of water and a
    // bright line of foam down each edge of it, so that on a dark road as on a pale one it is plain how far the
    // slippery stretch goes. They come up at once as the main begins to spray, and go as its pools shrink away)
    const sheet = flat(0x3f93c9, -3, { transparent: true, opacity: 0, depthWrite: false }), foam = flat(0xe6f8ff, -3, { transparent: true, opacity: 0, depthWrite: false });
    const wet = new THREE.Group();
    wet.add(new THREE.Mesh(buildStrip(from, to, (s) => lat(s) - LW / 2 + 0.1, (s) => lat(s) + LW / 2 - 0.1, 0.022, 2), sheet));
    for (const e of [-1, 1]) wet.add(new THREE.Mesh(buildStrip(from, to, (s) => lat(s) + e * (LW / 2 - 0.1) - 0.09, (s) => lat(s) + e * (LW / 2 - 0.1) + 0.09, 0.026, 2), foam));
    wet.add(new THREE.Mesh(buildStrip(to - 0.18, to, (s) => lat(s) - LW / 2 + 0.1, (s) => lat(s) + LW / 2 - 0.1, 0.026, 1), foam)); // (and across its far end)
    group.add(wet);
    const pools = [];
    for (let k = 0, s = from + 2; s < to - 1; k++, s += 4.6) {
      const length = Math.min(9 + (k % 3) * 1.5, (to - s) * 2 + 4), pool = makePuddle(LW * (1.3 + (k % 2) * 0.12), length, 31 + k * 13 + Math.round(from));
      const spot = at(s, lat(s) + ((k * 7) % 3 - 1) * 0.12);
      spot.add(pool);
      pools.push(pool);
    }
    const cover = at(from + 1.5, lat(from + 1.5));
    add(cover, new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), lambert(0x3a3b3f), 0, 0.04, 0);
    add(cover, box(0.9, 0.06, 0.5), lambert(0x55575c), 0.5, 0.12, 0.3).rotation.z = 0.5;
    const jet = makeFountain(5.5);
    cover.add(jet);
    return { from, lat: lat(from + 1.5), pools, jet, wet, sheet, foam, x: cover.position.x, y: cover.position.y, z: cover.position.z };
  });
  // ---- hot-air balloons
  balloons = (LEVEL.balloons || []).map((b) => {
    const s = Track.place(b), lat = (Track.laneOffset(b.lanes[0], s) + Track.laneOffset(b.lanes[1], s)) / 2;
    const w = (b.lanes[1] - b.lanes[0] + 1) * LW;
    const model = at(s, lat);
    const stripes = [0xd8262b, 0xffd23f, 0x2f7de1, 0xf4f4f4];
    for (let k = 0; k < 8; k++) { // (the envelope: gores of colour round a sphere, drawn in at the mouth)
      const gore = add(model, new THREE.SphereGeometry(7, 6, 14, k * Math.PI / 4, Math.PI / 4), lambert(stripes[k % stripes.length]), 0, 12.5, 0);
      gore.scale.set(1, 1.15, 1);
    }
    add(model, new THREE.CylinderGeometry(2.4, 1.2, 3, 12, 1, true), lambert(0xd8262b, { side: THREE.DoubleSide }), 0, 4.6, 0);
    add(model, box(Math.min(w - 0.6, 4), 1.3, 2 * CONFIG.balloon.hl), lambert(0x9a6a3a), 0, 0.65, 0); // the basket
    add(model, box(Math.min(w - 0.4, 4.2), 0.16, 2 * CONFIG.balloon.hl + 0.2), lambert(0x6e4a26), 0, 1.3, 0);
    for (const x of [-1, 1]) for (const z of [-1, 1]) add(model, box(0.06, 2.4, 0.06), lambert(0x2b2f38), x * 1.3, 2.4, z * 1.2);
    add(model, new THREE.SphereGeometry(0.3, 8, 6), glow(0xffb020), 0, 3.4, 0); // the burner's flame
    const shadow = at(s, lat, 0.05);
    add(shadow, new THREE.CircleGeometry(Math.max(w / 2, 3), 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
    return { model, shadow, y: model.position.y };
  });
  // ---- drawbridges: the river under the gap, the two leaves, and a boom and a pair of lamps each side
  const D = CONFIG.drawbridge;
  bridges = (LEVEL.drawbridges || []).map((c) => {
    const s = Track.place(c), lo = Track.lo(s), hi = Track.hi(s), width = hi - lo, mid = (lo + hi) / 2, L = D.leaf;
    // (the river under the whole span: the leaves, down, cover it. Its colour is the theme's: its `river`, or its
    // water stages' deep water, or blue; with a `riverCore`, a brighter band down the middle of it: lava)
    // (The water is a sheet WATER m over the road, drawn OVER rows nearer than it is so that it hides the road and
    // its lines under it (they are drawn 2 nearer). A leaf's own parts are drawn as much nearer, and no part of a
    // leaf is lower than its top by more than its plate, which lies clear of the sheet: so at every angle a leaf is
    // over the water, all of it. The sheet was drawn 14 rows nearer, which put it over a leaf's deck, and over the
    // lower end of a raised leaf; and a leaf had girders 1.4 m deep under it, which stood in the water at the hinge.
    // The core is a band of the sheet, not a second sheet over it)
    const look = THEMES[LEVEL.theme] || THEMES.city, WATER = 0.05, OVER = -3;
    const river = flat(look.river ?? look.channel?.deep ?? 0x2e6c8f, OVER), core = look.riverCore !== undefined ? 0.4 : 0;
    for (const d of [-1, 1]) group.add(new THREE.Mesh(buildStrip(s + d * L * core, s + d * L, lo - 120, hi + 120, WATER, 2), river));
    if (core) group.add(new THREE.Mesh(buildStrip(s - L * core, s + L * core, lo - 120, hi + 120, WATER, 2), flat(look.riverCore, OVER)));
    for (const d of [-1, 1]) { // (its banks: a stone quay each side, and a pier with a cabin either side of the road at each hinge)
      group.add(new THREE.Mesh(buildStrip(s + d * L, s + d * (L + 1.2), lo - 120, lo, 0.3, 2), flat(0x8a8378, -1)));
      group.add(new THREE.Mesh(buildStrip(s + d * L, s + d * (L + 1.2), hi, hi + 120, 0.3, 2), flat(0x8a8378, -1)));
      for (const lat of [lo - 1.6, hi + 1.6]) {
        const pier = at(s + d * (L + 1.5), lat);
        add(pier, box(2.4, 1.2, 4.2), lambert(0x8a8378), 0, 0.6, 0);
        add(pier, box(1.8, 2.4, 2.2), lambert(0xb9b2a4), 0, 2.4, 0);
        add(pier, box(2.2, 0.25, 2.6), lambert(0x3d5a6c), 0, 3.7, 0);
      }
    }
    // each leaf: hinged at its bank, its top (local y 0) the road, reaching `leaf` m to the middle. A line
    // from the hinge at Hazards.bridgeAngle: the same line Hazards.deck gives the car
    // (all of it over the road, the plate PLATE m thick: its underside 0.01 m clear of the water when it is down)
    const nearer = (material) => Object.assign(material, { polygonOffset: true, polygonOffsetFactor: OVER, polygonOffsetUnits: OVER });
    const deck = nearer(lambert(0x41444b)), steel = nearer(lambert(0x9c4a3a)), under = nearer(lambert(0x6e3528)), white = nearer(glow(0xf4f4f4)), yellow = nearer(glow(0xffc400));
    const dark = nearer(glow(0x1b1d22)), bright = nearer(glow(0xffd23f)), PLATE = 0.05;
    const lines = []; // [x across the leaf (+ to the left), colour, dashed]
    const lanes = [];
    for (let n = 0; n < Track.laneCount; n++) lanes.push(Track.laneOffset(n, s));
    for (let n = 0; n + 1 < lanes.length; n++) {
      const between = (lanes[n] + lanes[n + 1]) / 2, median = lanes[n] < 0 && lanes[n + 1] > 0;
      if (median) lines.push([mid - between - 0.14, yellow, false], [mid - between + 0.14, yellow, false]);
      else lines.push([mid - between, white, true]);
    }
    lines.push([mid - Track.laneLo(s), white, false], [mid - Track.laneHi(s), white, false]);
    const leaves = [-1, 1].map((d) => {
      const pivot = at(s + d * L, mid, 0.11), leaf = new THREE.Group();
      add(leaf, box(width, PLATE, L), deck, 0, -PLATE / 2, -d * L / 2);
      for (const x of [-1, 1]) { // (a plate girder standing along each edge, over the deck: a web, a flange along its top, stiffeners)
        add(leaf, box(0.16, 0.9, L * 0.98), under, x * (width / 2 - 0.2), 0.45, -d * L / 2);
        add(leaf, box(0.4, 0.12, L), steel, x * (width / 2 - 0.2), 0.96, -d * L / 2);
        for (let k = 0; k <= 5; k++) add(leaf, box(0.34, 0.9, 0.12), steel, x * (width / 2 - 0.2), 0.45, -d * (0.2 + k * (L - 0.4) / 5));
      }
      for (const [x, material, dashed] of lines) {
        if (!dashed) add(leaf, box(0.14, 0.02, L - 0.8), material, x, 0.012, -d * L / 2);
        else for (let z = 1.5; z < L - 1; z += 6) add(leaf, box(0.14, 0.02, 2.4), material, x, 0.012, -d * (z + 1.2));
      }
      for (let k = 0; k * 1.2 < width; k++) add(leaf, box(0.6, 0.03, 0.5), k % 2 ? dark : bright, -width / 2 + 0.3 + k * 1.2, 0.015, -d * (L - 0.3)); // (its lip, marked)
      add(leaf, box(width, PLATE, 0.12), bright, 0, -PLATE / 2, -d * L);
      pivot.add(leaf);
      return { leaf, d };
    });
    // (the speed that clears it, on a board on the way up to it)
    const need = Math.ceil(Hazards.bridgeJumpSpeed() * 3.6 / 5) * 5;
    for (const [back, lat] of [[D.sign, Track.hi(s - D.sign) - 0.6], [D.sign / 2, Track.hi(s - D.sign / 2) - 0.6]]) {
      if (s - back < 5) continue;
      const post = at(s - back, lat);
      add(post, box(0.2, 4, 0.2), lambert(0x8a9096), 0, 2, 0);
      const sign = board('JUMP ' + need + '+', '#ffd23f', '#111', 5.4, 1.8);
      sign.position.set(0, 4.6, 0);
      sign.rotation.y = Math.PI;
      post.add(sign);
    }
    const booms = [], lamps = [];
    for (const [d, lat, reach] of [[-1, Track.laneHi(s) + 0.4, Track.laneHi(s) + 0.4], [1, Track.laneLo(s) - 0.4, -(Track.laneLo(s) - 0.4)]]) {
      const post = at(s + d * D.boom, lat, 0);
      add(post, box(0.18, 3.4, 0.18), lambert(0x8a9096), 0, 1.7, 0);
      add(post, box(1.2, 0.45, 0.1), lambert(0x1b1d22), 0, 3.0, 0);
      for (const x of [-0.35, 0.35]) {
        const material = glow(LAMP_OFF);
        add(post, new THREE.SphereGeometry(0.18, 10, 8), material, x, 3.0, 0);
        lamps.push(material);
      }
      const arm = boom(Math.abs(reach) + 0.3), hinge = new THREE.Group();
      hinge.position.y = 1.1;
      hinge.rotation.y = d < 0 ? 0 : Math.PI; // (local +x is to the left: towards the centre line from the right kerb)
      hinge.add(arm);
      post.add(hinge);
      booms.push(arm);
    }
    return { leaves, booms, lamps };
  });
});

export const syncHazards = (now) => {
  const t = now / 1000, near = (s) => Math.abs(Track.along(s) - Track.along(Player.s)) < 400;
  Hazards.schools.forEach((c, k) => {
    const mesh = schools[k];
    if (!mesh) return;
    const stop = c.state === 'stop', u = Hazards.childrenAcross(c);
    for (const face of mesh.faces) face.material = stop ? STOP : WAIT;
    mesh.children.forEach((child, i) => {
      // (waiting at the kerb on the right; across, in a line, when the lollipop is up; gone to school after)
      const lat = mesh.hi + 0.6 - u * (mesh.hi - mesh.lo + 1.2) + (stop ? 0 : i * 0.05);
      const h = Track.toWorld(mesh.s + (i - 2) * 0.7, lat, tmp);
      child.position.set(tmp.x, tmp.y + (stop && u > 0 && u < 1 ? Math.abs(Math.sin(t * 8 + i)) * 0.08 : 0), tmp.z);
      child.rotation.y = h + Math.PI / 2;
      child.visible = u < 1;
    });
  });
  Hazards.mains.forEach((m, k) => {
    const mesh = mains[k];
    if (!mesh) return;
    const spread = Hazards.mainSpread(m), close = near(m.from);
    mesh.pools.forEach((pool, k) => pool.userData.set(Math.max(0, Math.min(1, spread * (1 + k * 0.22) - k * 0.22)), t + k));
    const shown = Math.min(1, spread * 3);
    mesh.wet.visible = shown > 0.02;
    mesh.sheet.opacity = 0.42 * shown;
    mesh.foam.opacity = (0.8 + 0.12 * Math.sin(t * 5 + k)) * shown;
    mesh.jet.userData.set(m.on ? Math.min(1, m.t / 0.5) : Math.max(0, 1 - m.t / 0.4), t, mesh.x, mesh.y, mesh.z, Game.paused || !close);
  });
  Hazards.balloons.forEach((b, k) => {
    const mesh = balloons[k];
    if (!mesh) return;
    const h = Hazards.balloonHeight(b);
    mesh.model.visible = b.state !== 'idle' && b.state !== 'gone';
    mesh.model.position.y = mesh.y + h + (h > 0 ? Math.sin(t * 1.3) * 0.3 : 0);
    mesh.model.rotation.z = h > 0 ? Math.sin(t * 0.9) * 0.03 : 0;
    mesh.shadow.visible = b.state === 'descend' && Math.floor(now / 140) % 2 === 0;
  });
  Hazards.bridges.forEach((c, k) => {
    const mesh = bridges[k];
    if (!mesh) return;
    const down = Hazards.bridgeBooms(c), phase = Math.floor(t * 2.5) % 2;
    for (const { leaf, d } of mesh.leaves) leaf.rotation.x = d * Hazards.bridgeAngle(c); // (its free end up: see ../hazards.js)
    mesh.booms.forEach((arm) => { arm.rotation.z = (1 - down) * Math.PI / 2 * 0.95; });
    mesh.lamps.forEach((lamp, i) => lamp.color.setHex(c.state !== 'idle' && i % 2 === phase ? LAMP_ON : LAMP_OFF));
  });
};
