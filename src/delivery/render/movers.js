// ---- MOVERS: things that go by in the scenery, under nobody's control and in nobody's way ----------
// A theme's ferry (ferry: true, with sea: the harbour along the right): the Star Ferry, green and white,
// two decks, crossing the harbour and back from a pier on the promenade, with junks drifting along the
// water under red sails. And its trams (trams: true, on a level with a "median"): double-deckers running
// up and down the median, each in its own livery. Only a sight: the game logic knows nothing of them
// and nothing collides with them.
import * as THREE from 'three';
import { LEVEL } from '../levels.js';
import { THEMES } from '../themes.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { scene, tmp, clearGroup } from './scene.js';

const group = new THREE.Group();
scene.add(group);
let movers = [];
let time = 0;

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const LIT = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });

// the Star Ferry: a white hull with a green band, a green upper deck under a white roof, lit windows
// along both decks, a funnel, and a wake (it faces local +z)
const makeFerry = () => {
  const g = new THREE.Group();
  const white = lambert(0xf2f2ee), green = lambert(0x1f6b3a), dark = lambert(0x2a2d33);
  box(g, white, 7, 1.6, 30, 0, 0.8, 0);                       // the hull
  box(g, green, 7.1, 0.5, 30.1, 0, 0.9, 0);                   // its green band
  box(g, green, 6.4, 2.4, 26, 0, 2.8, 0);                     // the lower deck's cabin
  box(g, white, 6.8, 0.3, 27, 0, 4.1, 0);                     // the upper deck
  box(g, green, 5.8, 2.2, 24, 0, 5.3, 0);                     // its cabin
  box(g, white, 6.6, 0.3, 26, 0, 6.5, 0);                     // the roof
  box(g, dark, 1.4, 2.2, 1.4, 0, 7.6, -2);                     // the funnel
  for (const side of [-1, 1]) for (const y of [2.9, 5.4]) for (let z = -11; z <= 11; z += 2.2) box(g, LIT, 0.05, 0.8, 1.4, side * (y < 4 ? 3.22 : 2.92), y, z);
  // (a bow at each end: it never turns round)
  for (const end of [-1, 1]) {
    const bow = box(g, white, 7, 1.6, 4, 0, 0.8, end * 17);
    bow.scale.x = 0.5;
  }
  return g;
};
// a junk: a dark hull and a big red batten sail
const makeJunk = () => {
  const g = new THREE.Group();
  box(g, lambert(0x3a2a1c), 2.6, 1.0, 9, 0, 0.5, 0);
  box(g, lambert(0x4a3626), 2.2, 0.8, 3, 0, 1.3, -2.5);
  box(g, lambert(0x6b5436), 0.14, 7, 0.14, 0, 4.5, 0.5);
  const sail = box(g, lambert(0xb0261f), 0.06, 5.5, 4.6, 0.3, 4.6, 0.3);
  sail.rotation.y = 0.25;
  return g;
};
// a Hong Kong tram: a tall, narrow double-decker in a livery of its own, windows lit up both decks,
// a pantograph on the roof
const TRAM_LIVERIES = [0x1f7a3a, 0xd8262b, 0x1d4f9c, 0xf2b51c, 0x7a2fb8, 0x27b3c9];
const makeTram = (color) => {
  const g = new THREE.Group();
  const paint = lambert(color), dark = lambert(0x2a2d33);
  box(g, paint, 2.3, 4.6, 9.4, 0, 2.6, 0);                    // the body
  box(g, dark, 2.4, 0.25, 9.5, 0, 0.3, 0);                    // underframe
  box(g, lambert(0xe9ecef), 2.2, 0.2, 9.2, 0, 4.95, 0);       // the roof
  for (const side of [-1, 1]) for (const y of [1.6, 3.9]) for (let z = -3.8; z <= 3.8; z += 1.3) box(g, LIT, 0.04, 0.8, 0.9, side * 1.17, y, z);
  for (const end of [-1, 1]) box(g, LIT, 1.6, 0.9, 0.04, 0, 1.6, end * 4.72);
  box(g, dark, 0.1, 0.7, 1.6, 0, 5.3, 0);                      // the pantograph
  box(g, dark, 0.1, 0.1, 1.2, 0, 5.7, 0);
  for (const z of [-2.8, 2.8]) for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.9, 0.4, z);
    g.add(wheel);
  }
  return g;
};

const build = () => {
  clearGroup(group);
  movers = [];
  time = 0;
  const theme = THEMES[LEVEL.theme] || THEMES.city;
  if (theme.ferry && theme.sea) {
    const SEA = theme.sea;
    // a ferry every 1200 m or so, crossing from a pier on the promenade out to the far shore and back
    for (let s = 500; s < Track.length - 300; s += 1200) {
      const mesh = makeFerry();
      group.add(mesh);
      movers.push({ mesh, kind: 'ferry', s, from: SEA + 25, to: SEA + 400, period: 70, phase: Math.random() * 70 });
      // (and its pier: a jetty out from the sea wall)
      const pier = box(group, lambert(0x6f6d68), 6, 1.2, 22, 0, 0, 0);
      const h = Track.toWorld(s, Track.hi(s) + SEA + 10, tmp);
      pier.position.set(tmp.x, 0.4, tmp.z);
      pier.rotation.y = h + Math.PI / 2;
    }
    // junks, drifting along the harbour
    for (let s = Track.start; s < Track.end; s += 260) {
      const mesh = makeJunk();
      group.add(mesh);
      movers.push({ mesh, kind: 'junk', s0: s + Math.random() * 200, lat: SEA + 60 + Math.random() * 280, speed: 1.5 + Math.random() * 2, bob: Math.random() * 6 });
    }
  }
  if (theme.trams && Track.medianHalf > 0) {
    // trams up and down the median, one every 350 m or so, each way in turn
    for (let s = Track.start, k = 0; s < Track.end; s += 350, k++) {
      const mesh = makeTram(TRAM_LIVERIES[k % TRAM_LIVERIES.length]);
      group.add(mesh);
      movers.push({ mesh, kind: 'tram', s0: s, dir: k % 2 ? -1 : 1, speed: 9 + Math.random() * 3 });
    }
  }
};
Game.onLoad.push(build);

export const syncMovers = (dt) => {
  if (!movers.length) return;
  if (!Game.paused) time += dt;
  const here = Track.along(Player.s), span = Track.end - Track.start;
  for (const m of movers) {
    if (m.kind === 'ferry') { // out and back across the harbour, pausing at each end
      const u = ((time + m.phase) % m.period) / m.period, leg = u < 0.5 ? u * 2 : 2 - u * 2; // 0 .. 1 .. 0
      const eased = Math.min(1, Math.max(0, (leg - 0.08) / 0.84)), k = eased * eased * (3 - 2 * eased);
      const lat = m.from + (m.to - m.from) * k;
      const h = Track.toWorld(m.s, Track.hi(m.s) + lat, tmp);
      m.mesh.visible = Math.abs(Track.along(m.s) - here) < 900;
      m.mesh.position.set(tmp.x, 0.1 + Math.sin(time * 0.9) * 0.08, tmp.z);
      m.mesh.rotation.set(0, h + Math.PI / 2, Math.sin(time * 0.7) * 0.01); // (crossing: beam on to the road)
    } else if (m.kind === 'junk') { // drifting along the water, up the harbour
      const s = Track.start + (((m.s0 - Track.start + m.speed * time) % span) + span) % span;
      m.mesh.visible = Math.abs(Track.along(s) - here) < 800;
      if (!m.mesh.visible) continue;
      const h = Track.toWorld(s, Track.hi(s) + m.lat, tmp);
      m.mesh.position.set(tmp.x, Math.sin(time * 1.1 + m.bob) * 0.15, tmp.z);
      m.mesh.rotation.set(Math.sin(time * 0.8 + m.bob) * 0.04, h, Math.sin(time * 1.3 + m.bob) * 0.06);
    } else if (m.kind === 'tram') { // up and down the median, looping round at the ends
      const s = Track.start + (((m.s0 - Track.start + m.dir * m.speed * time) % span) + span) % span;
      m.mesh.visible = Math.abs(Track.along(s) - here) < 700;
      if (!m.mesh.visible) continue;
      const h = Track.toWorld(s, 0, tmp);
      m.mesh.position.copy(tmp);
      m.mesh.rotation.set(0, h + (m.dir < 0 ? Math.PI : 0), 0);
    }
  }
};
