// ---- Halloween: a haunted hollow at dusk. A winding country road through fields of pumpkins and dead corn, bare twisted
// trees, a cemetery behind iron gates, a haunted house on a hill with its windows lit, and a village of carved pumpkins
// and cobwebbed lamp posts. Over it a dusky sky with a harvest moon, stars and bats; low mist drifts over the dark
// fields (the level's "fog" banks are the real fog, and the theme names its colour: themes.js fogColor). By the level's
// zones (a theme's `sets`, ../../themes.js: a level with none gets them in equal shares, see extras.js setsOf):
//   patch      the pumpkin patch: fields of pumpkins and dead corn behind a broken fence, a barn, jack-o'-lanterns on posts
//   woods      bare twisted trees close to the road, eyes shining at their feet, a stone humpback bridge over a stream
//   graveyard  the cemetery on the left behind iron railings: gates over the road, headstones, crosses, crypts, candles
//   hill       the haunted house on its hill, a trail of lanterns up to it, a mound over the tunnel, bats
//   village    the village: houses with lit windows and pumpkins on their steps, lamp posts hung with webs, a church
// No people anywhere: ghosts are sheets with two holes in them. Scenery is instanced or merged (a handful of draw calls
// each), seeded from the level's id (a run is repeatable), and only a sight; what moves (mist, bats, ghosts, the windows'
// flicker) keeps its own time: sceneryClock.js. (The models: halloweenModels.js.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { everyFrame } from './sceneryClock.js';
import { makeKit, setsOf } from './extras.js';
import { makeSign } from '../gambleModels.js';
import { TREES, PUMPKIN, faceGeo, STEM, BAT, PRISM, merge, limb, glowTexture, railingTexture, moonTexture, fenceTexture, windowTexture, cobwebTexture } from './halloweenModels.js';

const R = 560;                              // m: the sky dome's radius (inside the camera's far plane; the ground fogs out at 520)
const MOON = [-230, 95, 560];              // where the moon hangs, in the world, relative to whoever is looking
const clear = (scene) => Math.min(1, Math.max(0, (scene.fog ? scene.fog.far - 120 : 400) / 380)); // (1 in the open, 0 in a fog bank)
const SIDES = [-1, 1];
const IRON = 0x1b1b24, STONE = 0x6c6f6a, DARK = 0x15121c, ROOF = 0x2a2230;
const POST = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);                       // (a slender post)
const SPIRE = new THREE.ConeGeometry(0.5, 1, 8);
const PYRAMID = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);   // (a square pyramid, a metre each way)
const RIDGE = (() => { // a long hill with a flat top, its ends cut off square: 2 m wide at its foot, 1 m high, 1 m long, its length along z
  const shape = new THREE.Shape();
  shape.moveTo(-1, 0); shape.lineTo(1, 0); shape.lineTo(0.48, 1); shape.lineTo(-0.48, 1); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
})();
const TUFT = new THREE.ConeGeometry(0.5, 1, 3, 1, true);
const HILLS = new THREE.CylinderGeometry(0.28, 0.5, 1, 8);                       // (the skyline's: eight sides will do)
const WINDOW = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2);              // (a pane facing +x: scale y = its height, z = its width)
const SHEET = new THREE.LatheGeometry([[0.5, 0], [0.46, 0.35], [0.36, 0.7], [0.18, 0.92], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
const DOT = new THREE.SphereGeometry(0.5, 5, 3);
// headstones, three shapes (about 1 m wide and tall, a quarter metre thick): rounded, a cross, a slab with a shoulder
const STONES = (() => {
  const round = merge([new THREE.BoxGeometry(0.8, 0.8, 0.25).translate(0, 0.4, 0), new THREE.CylinderGeometry(0.4, 0.4, 0.25, 8, 1, false, 0, Math.PI).rotateX(Math.PI / 2).translate(0, 0.8, 0)]);
  const cross = merge([new THREE.BoxGeometry(0.2, 1.1, 0.2).translate(0, 0.55, 0), new THREE.BoxGeometry(0.62, 0.2, 0.2).translate(0, 0.78, 0), new THREE.BoxGeometry(0.7, 0.2, 0.5).translate(0, 0.1, 0)]);
  const slab = merge([new THREE.BoxGeometry(0.9, 0.5, 0.25).translate(0, 0.25, 0), new THREE.BoxGeometry(0.6, 0.45, 0.25).translate(0, 0.72, 0), new THREE.BoxGeometry(1, 0.12, 0.45).translate(0, 0.06, 0)]);
  return [round, cross, slab];
})();
const OBELISK = merge([new THREE.BoxGeometry(1.2, 0.5, 1.2).translate(0, 0.25, 0), new THREE.BoxGeometry(0.7, 2.6, 0.7).translate(0, 1.8, 0), new THREE.ConeGeometry(0.5, 0.6, 4).rotateY(Math.PI / 4).translate(0, 3.4, 0)]);

export const halloween = ({ theme, offRoads, beside, inJunction, cube, tube, cone, instances, levelGroup }) => {
  let seed = 83 + (LEVEL.id || '').length * 211;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const kit = makeKit({ instances, offRoads, levelGroup, cube });
  const p = {}, o = new THREE.Object3D();
  const sets = setsOf(theme);
  const within = (list, s, pad, a = 'from', b = 'to') => (list || []).some(x => !x.road && x[a] !== undefined && s >= x[a] - pad && s <= x[b] + pad);
  const tunnelAt = (s, pad = 0) => within(LEVEL.tunnels, s, pad);
  const busy = (s, pad = 0) => tunnelAt(s, pad) || inJunction(s) || within(LEVEL.crossings, s, pad + 16, 's', 's');
  const level0 = (s) => { Track.toWorld(s, 0, p); return p.y; };
  const faceRoad = (h, lat) => h + (lat < 0 ? -Math.PI / 2 : Math.PI / 2);      // (a local +z turned to face the road)
  const mat = (x, y, z, sx, sy, sz, ry = 0) => { o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.set(sx, sy, sz); o.updateMatrix(); return o.matrix.clone(); };
  const inst = (geometry, material, list, order = 0) => { // (an instanced mesh of our own, added to the level)
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    levelGroup.add(mesh);
    return mesh;
  };
  const glowTex = glowTexture(), windowTex = windowTexture();
  const additive = (color, opacity) => new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const MAT = {
    mist: new THREE.MeshBasicMaterial({ map: glowTex, color: 0xa898c8, transparent: true, opacity: 0.3, depthWrite: false }),
    warm: additive(0xffc068, 0.55),
    orange: additive(0xff7a1a, 0.5),
    web: new THREE.MeshBasicMaterial({ map: cobwebTexture(), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    rail: new THREE.MeshBasicMaterial({ map: railingTexture(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
    windows: [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ map: windowTex, color: 0xffb030, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })),
    dark: new THREE.MeshBasicMaterial({ color: DARK, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    wood: new THREE.MeshBasicMaterial({ map: fenceTexture(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
    water: new THREE.MeshLambertMaterial({ color: 0x1b2c4a, emissive: 0x0a1426 }),
    sheet: new THREE.MeshLambertMaterial({ color: 0xeceaf6, emissive: 0x30304a, side: THREE.DoubleSide }),
    ink: new THREE.MeshBasicMaterial({ color: 0x0e0e14 }),
    bat: new THREE.MeshBasicMaterial({ color: 0x0a0612, side: THREE.DoubleSide }),
  };
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);         // (lies on the ground)
  const hang = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);        // (stands up, its corner at the origin, to the right and up)

  // (the land road.js lays under a hilly road, its ribbon and its banks in the ground's colour, is built with no
  // normals, and so is black on a lit theme: given them here, the road over the stream is lit as the fields are)
  const groundHex = new THREE.Color(theme.ground).getHex(), bankHex = new THREE.Color(theme.ground).multiplyScalar(0.8).getHex();
  for (const m of levelGroup.children) {
    if (m.isMesh && m.renderOrder !== -2 && m.material && m.material.color && (m.material.color.getHex() === groundHex || m.material.color.getHex() === bankHex) && !m.geometry.attributes.normal) m.geometry.computeVertexNormals();
  }

  // ---- the sky: a dome of dusk (a glow low on the horizon, the dark overhead), stars, the harvest moon and its halo,
  // and bats crossing it. All of it round whoever is looking, never any nearer; all of it gone in a fog bank
  const rings = [[-8, 0x251640], [0, 0x251640], [3, 0x5e2d6c], [7, 0x4a2a6a], [14, 0x2e1b52], [30, 0x1f1342], [55, 0x150d30], [90, 0x0e0820]];
  const dome = new THREE.LatheGeometry(rings.map(([deg]) => new THREE.Vector2(Math.cos(deg * Math.PI / 180) * R, Math.sin(deg * Math.PI / 180) * R)), 24), dc = [], tint = new THREE.Color();
  for (let k = 0; k <= 24; k++) for (const [, hex] of rings) { tint.setHex(hex); dc.push(tint.r, tint.g, tint.b); } // (a lathe's vertices run round it, a ring of points at each step)
  dome.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
  const follow = (thing, x, y, z, fade, order = -4) => {
    thing.frustumCulled = false;
    thing.renderOrder = order;
    thing.onBeforeRender = (renderer, scene, camera) => {
      thing.position.set((scene.scale.x < 0 ? -camera.position.x : camera.position.x) + x, camera.position.y + y, camera.position.z + z);
      thing.updateMatrixWorld();
      if (fade && thing.material) thing.material.opacity = fade * clear(scene);
      if (thing.userData.tick) thing.userData.tick(performance.now() / 1000, clear(scene));
    };
    levelGroup.add(thing);
    return thing;
  };
  const skyMat = (extra) => new THREE.MeshBasicMaterial({ fog: false, depthWrite: false, transparent: true, ...extra });
  follow(new THREE.Mesh(dome, skyMat({ vertexColors: true, side: THREE.BackSide })), 0, 0, 0, 1, -5);
  const starPoints = [];
  for (let i = 0; i < 520; i++) {
    const a = rand() * Math.PI * 2, y = 0.1 + rand() * 0.9, r = Math.sqrt(1 - y * y);
    starPoints.push(Math.cos(a) * r * (R - 20), y * (R - 20), Math.sin(a) * r * (R - 20));
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPoints, 3));
  follow(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe8e4ff, size: 1.5, sizeAttenuation: false, fog: false, depthWrite: false, transparent: true })), 0, 0, 0, 0.9, -4);
  const moonDir = new THREE.Vector3(...MOON).normalize().multiplyScalar(R - 40);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), fog: false, depthWrite: false, transparent: true }));
  moon.scale.set(66, 66, 1);
  follow(moon, moonDir.x, moonDir.y, moonDir.z, 1, -3);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a40, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  halo.scale.set(300, 300, 1);
  follow(halo, moonDir.x, moonDir.y, moonDir.z, 0.5, -3);
  // bats crossing the moon: nine, each on a loop of its own, wings beating
  const skyBats = new THREE.InstancedMesh(BAT, new THREE.MeshBasicMaterial({ color: 0x07040e, fog: false, depthWrite: false, transparent: true, side: THREE.DoubleSide }), 9);
  const flock = Array.from({ length: 9 }, (_, k) => ({ a: rand() * 6.3, speed: (0.05 + rand() * 0.07) * (k % 2 ? 1 : -1), rx: 70 + rand() * 150, ry: 30 + rand() * 60, size: 11 + rand() * 9, beat: 5 + rand() * 4, off: rand() * 6 }));
  skyBats.userData.tick = (t) => {
    flock.forEach((b, i) => {
      const a = b.a + t * b.speed;
      o.position.set(Math.cos(a) * b.rx, Math.sin(a * 1.7 + b.off) * b.ry, 0);
      o.rotation.set(0, b.speed > 0 ? 0.2 : Math.PI - 0.2, 0);
      o.scale.set(b.size, b.size * Math.sin(t * b.beat + b.off), b.size);
      o.updateMatrix();
      skyBats.setMatrixAt(i, o.matrix);
    });
    skyBats.instanceMatrix.needsUpdate = true;
  };
  follow(skyBats, moonDir.x, moonDir.y, moonDir.z, 0, -2);

  // ---- ribbons: railings and fences (a texture of bars or rails on a strip that follows the road), one mesh each
  const ribbons = { rail: { pos: [], uv: [], idx: [] }, wood: { pos: [], uv: [], idx: [] } };
  const railing = (from, to, latOf, height = 1.9, bay = 2.4, step = 3, kind = 'rail') => {
    const { pos, uv, idx } = ribbons[kind];
    let prev = null, u = 0;
    for (let s = from; s <= to + 0.01; s += step) {
      if (busy(s, 3)) { prev = null; continue; }
      Track.toWorld(s, latOf(s), p);
      const here = [p.x, p.y, p.z];
      if (prev) {
        u += Math.hypot(here[0] - prev[0], here[2] - prev[2]) / bay;
        const n = pos.length / 3;
        pos.push(prev[0], prev[1], prev[2], prev[0], prev[1] + height, prev[2], here[0], here[1], here[2], here[0], here[1] + height, here[2]);
        uv.push(prev[3], 0, prev[3], 1, u, 0, u, 1);
        idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
      prev = [...here, u];
    }
  };

  // ---- the things that glow or sway, gathered as the scenery is laid out and drawn at the end
  const pools = [[], []];               // light on the road: warm (lamps), orange (pumpkins)
  const webs = [], windows = [[], [], [], []], ghosts = [], bats = [], mists = [];
  // a pane at a point, h high and w wide, its face along ry (a local +x turned); lit ones flicker (three groups, three phases), group 3 is dark
  const pane = (x, y, z, h, w, ry, lit = true) => windows[lit ? Math.floor(rand() * 3) : 3].push(mat(x, y, z, 1, h, w, ry));
  // a carved pumpkin (a lit face on an orange body) at a world point, facing ry
  const jackAt = (x, y, z, size, ry) => {
    kit.at(0xee7410, PUMPKIN, x, y + size * 0.4, z, size, size, size, ry, false, -1);
    kit.at(0xffdc55, faceGeo, x, y + size * 0.4, z, size, size, size, ry, true, -1);
    kit.at(0x3f5a1e, STEM, x, y + size * 0.4, z, size, size, size, ry, false, -1);
  };
  // ...and one beside the road: s along, lat across, y up, with the pool of orange light it throws
  const jack = (s, lat, y, size, yaw = 0) => {
    const at = kit.point(s, lat, y);
    jackAt(at.x, at.y, at.z, size, faceRoad(at.h, lat) + yaw);
    pools[1].push(mat(at.x, at.y - y + 0.07, at.z, size * 5.5, 1, size * 5.5, at.h));
  };
  // a ghost: a sheet hung in the air, its eyes toward the road
  const ghost = (s, lat, y, size) => { const at = kit.point(s, lat, y); ghosts.push({ x: at.x, y: at.y, z: at.z, ry: faceRoad(at.h, lat), size, ph: rand() * 6.3 }); };

  // ---- lamp posts: iron, a lantern hung out over the road, a cobweb in the corner of the arm, a pool of light under
  // each. Closer in the village, scarce in the fields, none in the woods' dark
  for (const [set, every, both] of [['patch', 100, false], ['graveyard', 56, false], ['hill', 80, false], ['village', 34, true]]) {
    for (const z of sets.filter(x => x.set === set)) {
      for (let s = z.from + 14, k = 0; s < z.to - 8; s += every, k++) {
        for (const side of both ? SIDES : [k % 2 ? 1 : -1]) {
          const at = s + (both && side > 0 ? every / 2 : 0);
          if (busy(at, 10)) continue;
          const lat = beside(side, at, 1.4), toward = -side;
          kit.of(IRON, POST).push([at, lat, 2.45, 0.22, 4.9, 0.22]);
          kit.of(IRON).push([at, lat + toward * 0.62, 4.82, 1.3, 0.1, 0.1]);
          kit.of(IRON).push([at, lat, 0.18, 0.55, 0.36, 0.55]);
          kit.of(0xf2e6a8, cube, true).push([at, lat + toward * 1.2, 4.5, 0.36, 0.5, 0.36]);
          kit.of(IRON, PYRAMID).push([at, lat + toward * 1.2, 4.96, 0.78, 0.3, 0.78]);
          const w = kit.point(at, lat, 3.75), pool = kit.point(at, lat + toward * 1.8, 0.07);
          webs.push(mat(w.x, w.y, w.z, 1.25 * toward * (Track.mirrored ? -1 : 1), 1.0, 1, w.h));
          pools[0].push(mat(pool.x, pool.y, pool.z, 8.5, 1, 8.5, pool.h));
        }
      }
    }
  }

  // ---- the road's dead grass: tufts along both verges, taller towards the fields
  const tufts = [];
  for (let s0 = Track.start + 2; s0 < Track.end - 2; s0 += 24) {
    for (const side of SIDES) {
      if (tunnelAt(s0, 20)) continue;
      for (let k = 0; k < 2; k++) {
        const s = s0 + rand() * 9, d = 1.8 + rand() * rand() * 30;
        tufts.push([s, beside(side, s, d), 0.3, 0.7 + rand() * 0.6, 0.6 + rand() * 0.7, 0.7 + rand() * 0.6]);
      }
    }
  }
  instances(TUFT, 0x59603a, tufts);

  // ---- THE SETS --------------------------------------------------------------------------------------------------
  for (const z of sets) {
    if (z.set === 'patch') {
      // the wooden fence along the fields, broken here and there, a carved pumpkin on a post now and then
      for (const side of SIDES) {
        railing(z.from + 10, z.to - 5, (q) => beside(side, q, 2.4), 1.3, 3.2, 3.2, 'wood');
        for (let q = z.from + 24; q < z.to - 10; q += 34 + rand() * 12) if (!busy(q, 6)) { kit.of(0x3d2c1e).push([q, beside(side, q, 2.4), 0.8, 0.2, 1.6, 0.2]); jack(q, beside(side, q, 2.4), 1.6, 0.55); }
      }
      // the pumpkins in their fields: clumps on the dark earth, a few pale ones, and now and then a carved one
      const shades = [0xe0670f, 0xb85008, 0xe8e0c8];
      for (let s0 = z.from + 6; s0 < z.to - 6; s0 += 16) {
        for (const side of SIDES) {
          if (busy(s0, 8) || (side < 0 && s0 > 380 && s0 < 480)) continue;
          const d0 = 4 + rand() * 20;
          for (let k = 0, n = 2 + Math.floor(rand() * 2); k < n; k++) {
            const s = s0 + rand() * 12, size = 0.7 + rand() * 0.9, at = kit.point(s, beside(side, s, d0 + rand() * 6));
            kit.at(pick(shades), PUMPKIN, at.x, at.y + size * 0.4, at.z, size * 1.1, size, size * 1.1, rand() * 6, false, 2);
          }
          if (rand() < 0.22) jack(s0 + 4, beside(side, s0 + 4, d0 + 3), 0.1, 0.9 + rand() * 0.5, (rand() - 0.5) * 0.8);
        }
      }
      // dead corn, in blocks beyond the pumpkins
      for (let s0 = z.from + 60; s0 < z.to - 40; s0 += 70 + rand() * 40) {
        const side = rand() < 0.5 ? -1 : 1;
        if (busy(s0, 20) || (side < 0 && s0 > 350 && s0 < 500)) continue;
        const len = 40 + rand() * 30, lat = beside(side, s0 + len / 2, 32 + rand() * 6);
        kit.of(0x6a6234).push([s0 + len / 2, lat, 1.2, 14, 2.4, len]);
        for (let k = 0; k < 6; k++) kit.of(0x8a7c44, PYRAMID).push([s0 + rand() * len, lat + (rand() - 0.5) * 12, 2.9 + rand() * 0.4, 0.5 + rand() * 0.5, 1.4 + rand(), 0.5 + rand() * 0.4]);
      }
      // the barn on the left, a loft window lit; a silo
      const barn = kit.point(430, beside(-1, 430, 30)), at0 = kit.point(430, 0);
      const fa = Math.atan2(at0.x - barn.x, at0.z - barn.z);
      const frame = (dx, dy, dz) => ({ x: barn.x + dx * Math.cos(fa) + dz * Math.sin(fa), y: barn.y + dy, z: barn.z - dx * Math.sin(fa) + dz * Math.cos(fa) });
      if (offRoads(barn.x, barn.z, 20)) {
        const place = (c, geo, dx, dy, dz, sx, sy, sz, g = false) => { const q = frame(dx, dy, dz); kit.at(c, geo, q.x, q.y, q.z, sx, sy, sz, fa, g, -1); };
        place(0x5a2a22, cube, 0, 3.2, 0, 12, 6.4, 18);
        place(ROOF, PRISM, 0, 6.4, 0, 13, 4.6, 19);
        place(DARK, cube, 0, 1.8, 9.05, 4.4, 3.6, 0.2); place(0x5a2a22, cube, 0, 1.8, 9.12, 0.2, 3.6, 0.2); place(0xffb030, cube, 0, 6.1, 9.1, 1.4, 1.4, 0.2, true);
        const silo = kit.point(416, beside(-1, 416, 33));
        kit.at(0x7a7a80, tube, silo.x, silo.y + 5.5, silo.z, 4.4, 11, 4.4, 0, false, 8);
        kit.at(ROOF, cone, silo.x, silo.y + 12.2, silo.z, 4.8, 2.6, 4.8, 0, false, -1);
        for (let k = 0; k < 5; k++) jackAt(frame(-6 + k * 3, 0, 11 + (k % 2) * 1.5).x, barn.y, frame(-6 + k * 3, 0, 11 + (k % 2) * 1.5).z, 0.9 + rand() * 0.4, fa + (rand() - 0.5) * 0.8);
      }
      // the welcome board by the start
      const sign = makeSign('WELCOME TO\nHAUNTED HOLLOW', '#1d1236', '#ff9a1e', 6.4, 2.6, 3.4);
      sign.rotation.y = Track.toWorld(36, beside(1, 36, 1.6), p);
      sign.position.set(p.x, p.y, p.z);
      sign.children[1].scale.x = Track.mirrored ? -1 : 1;
      levelGroup.add(sign);
    } else if (z.set === 'woods') {
      for (let s0 = z.from; s0 < z.to; s0 += 6.5) {
        for (const side of SIDES) {
          if (tunnelAt(s0, 12) || rand() < 0.3) continue;
          const s = s0 + rand() * 5, d = 2.2 + rand() * rand() * 26, scale = 0.8 + rand() * 0.75, at = kit.point(s, beside(side, s, d));
          kit.at(0x2b2233, TREES[rand() < 0.5 ? 0 : 1], at.x, at.y, at.z, scale, scale, scale, rand() * 6.3, false, 1.5);
        }
      }
      // eyes in the dark: pairs of green-gold lights low among the trees
      for (let k = 0; k < 16; k++) {
        const s = z.from + 20 + rand() * (z.to - z.from - 40), side = rand() < 0.5 ? -1 : 1;
        if (busy(s, 8)) continue;
        const at = kit.point(s, beside(side, s, 5 + rand() * 14), 0.5 + rand() * 0.9), gap = 0.16 + rand() * 0.08, ry = faceRoad(at.h, side * 10);
        for (const e of [-1, 1]) kit.at(k % 3 ? 0xd8ff4a : 0xffd23a, DOT, at.x + Math.cos(ry) * e * gap, at.y, at.z - Math.sin(ry) * e * gap, 0.1, 0.07, 0.1, 0, true, -1);
      }
      // the humpback bridge over the stream: the road's hump (a level's segments, their "grade") is it; the stream runs
      // under it across the fields, grey parapets along both edges, a lantern at each end
      const humps = [];
      let open = null;
      for (let s = Track.start; s <= Track.end; s += 2) {
        const up = level0(s) > 0.15;
        if (up && open === null) open = s;
        if (!up && open !== null) { humps.push([open - 2, s + 2]); open = null; }
      }
      for (const [a, b] of humps) {
        const c = kit.point((a + b) / 2, 0);
        o.position.set(c.x, 0.05, c.z); o.rotation.set(0, c.h, 0); o.scale.set(90, 1, 10); o.updateMatrix();
        const water = new THREE.Mesh(flat, MAT.water);
        water.matrixAutoUpdate = false; water.matrix.copy(o.matrix); water.userData.flat = true;
        levelGroup.add(water);
        for (const side of SIDES) {
          for (let s = a - 4; s <= b + 4; s += 4) kit.of(0x6e716c).push([s, beside(side, s, 0.35), 0.45, 0.6, 0.9, 4.02]);
          for (const s of [a - 6, b + 6]) {
            kit.of(0x6e716c).push([s, beside(side, s, 0.5), 1.0, 0.9, 2.0, 0.9]);
            kit.of(0xffc060, cube, true).push([s, beside(side, s, 0.5), 2.25, 0.5, 0.5, 0.5]);
            pools[0].push(mat(kit.point(s, beside(side, s, 0.5)).x, 0.1, kit.point(s, beside(side, s, 0.5)).z, 7, 1, 7, 0));
          }
        }
      }
    } else if (z.set === 'graveyard') {
      // the gates over the road at the start of the cemetery: stone pillars, an iron arch
      const g0 = z.from + 70;
      if (!busy(g0, 14)) {
        const lo = Track.lo(g0) - 0.9, hi = Track.hi(g0) + 0.9, span = hi - lo, c = kit.point(g0, (lo + hi) / 2, 0);
        const arc = [];
        for (let i = 0; i <= 14; i++) { const th = Math.PI * i / 14; arc.push([Math.cos(th) * span / 2, 5.4 + Math.sin(th) * 1.5, 0]); }
        const parts = [];
        for (let i = 0; i < 14; i++) parts.push(limb(arc[i], arc[i + 1], 0.09, 0.09, 4));
        for (let i = 1; i < 14; i++) parts.push(limb(arc[i], [arc[i][0], arc[i][1] - 0.5 - 0.3 * (i % 2), 0], 0.035, 0.015, 3));
        parts.push(limb([-span / 2 + 0.4, 5.4, 0], [span / 2 - 0.4, 5.4, 0], 0.06, 0.06, 4));
        for (const e of [-1, 1]) parts.push(new THREE.ConeGeometry(0.2, 0.7, 4).translate(e * (span / 2 - 0.1), 7.0, 0));
        parts.push(new THREE.ConeGeometry(0.2, 0.9, 4).translate(0, 7.1, 0));
        kit.at(IRON, merge(parts), c.x, c.y, c.z, 1, 1, 1, c.h, false, -1);
        for (const side of SIDES) {
          const pc = kit.point(g0, side < 0 ? lo - 0.7 : hi + 0.7, 0);
          kit.at(STONE, cube, pc.x, pc.y + 2.75, pc.z, 1.3, 5.5, 1.3, pc.h, false, -1);
          kit.at(0x5a5d58, cube, pc.x, pc.y + 5.65, pc.z, 1.7, 0.3, 1.7, pc.h, false, -1);
          kit.at(0x5a5d58, PYRAMID, pc.x, pc.y + 6.4, pc.z, 1.5, 1.2, 1.5, pc.h, false, -1);
          kit.at(0xffd070, cube, pc.x, pc.y + 5.1, pc.z, 0.5, 0.6, 0.5, pc.h, true, -1);
          pools[0].push(mat(pc.x, pc.y + 0.07, pc.z, 9, 1, 9, 0));
        }
        const board = makeSign('HOLLOW CEMETERY\nDEAD SLOW', '#1b1b24', '#c9c9d8', 5.4, 1.8, 0);
        board.rotation.y = Track.toWorld(g0 - 0.3, (lo + hi) / 2, p) + Math.PI;
        board.position.set(p.x, p.y + 5.6, p.z);
        board.children[1].scale.x = Track.mirrored ? -1 : 1;
        board.children[0].visible = false;
        levelGroup.add(board);
      }
      // railings along the cemetery's edge (the left) from the gates to its far end, both sides near the gates
      railing(g0 + 8, z.to - 20, (s) => Track.lo(s) - 3);
      railing(g0 + 8, g0 + 90, (s) => Track.hi(s) + 3);
      for (const side of SIDES) { railing(z.from + 10, g0 - 8, (s) => beside(side, s, 3)); }
      // headstones in rows behind the railings, crooked, with candles on some; a few crypts and an obelisk
      const grey = [0x7f847d];
      for (let s0 = g0 + 14; s0 < z.to - 30; s0 += 6.6) {
        for (let row = 0; row < 3; row++) {
          if (busy(s0, 8) || rand() < 0.18) continue;
          const s = s0 + (rand() - 0.5) * 2, d = 6 + row * 5.4 + rand() * 1.2, at = kit.point(s, beside(-1, s, d)), size = 0.85 + rand() * 0.55;
          kit.at(pick(grey), STONES[Math.floor(rand() * 3)], at.x, at.y, at.z, size, size, size, faceRoad(at.h, -1) + (rand() - 0.5) * 0.45, false, 1);
          if (row === 0 && rand() < 0.28) kit.at(0xffc060, DOT, at.x + 0.5, at.y + 0.12, at.z, 0.16, 0.22, 0.16, 0, true, -1);
        }
      }
      for (const [s, d, big] of [[g0 + 150, 16, 1], [g0 + 330, 20, 0.8]]) { // crypts: a stone house with a pitched roof, a dark door, a lamp over it
        if (busy(s, 12)) continue;
        const c = kit.point(s, beside(-1, s, d)), fa = faceRoad(c.h, -1);
        const f = (dx, dy, dz) => ({ x: c.x + dx * Math.cos(fa) + dz * Math.sin(fa), y: c.y + dy, z: c.z - dx * Math.sin(fa) + dz * Math.cos(fa) });
        let q = f(0, 2 * big, 0); kit.at(0x77796f, cube, q.x, q.y, q.z, 6 * big, 4 * big, 7.5 * big, fa, false, 4);
        q = f(0, 4 * big, 0); kit.at(0x4f5250, PRISM, q.x, q.y, q.z, 7 * big, 2.2 * big, 8.2 * big, fa, false, -1);
        q = f(0, 1.3 * big, 3.8 * big); kit.at(DARK, cube, q.x, q.y, q.z, 1.8 * big, 2.6 * big, 0.2, fa, false, -1);
        q = f(0, 3.2 * big, 3.85 * big); kit.at(0x9be8a0, cube, q.x, q.y, q.z, 0.4, 0.5, 0.2, fa, true, -1);
        for (const e of [-1, 1]) { q = f(e * 2.3 * big, 1.6 * big, 4.1 * big); kit.at(0x86887e, tube, q.x, q.y, q.z, 0.5, 3.2 * big, 0.5, 0, false, -1); }
        ghost(s, beside(-1, s, d - 5), 3.4, 1.3);
      }
      { const s = g0 + 250, c = kit.point(s, beside(-1, s, 12)); if (!busy(s, 8)) kit.at(0x8a9088, OBELISK, c.x, c.y, c.z, 1.2, 1.2, 1.2, c.h, false, 3); }
      // dead trees among the graves (fewer than the woods')
      for (let s0 = z.from + 20; s0 < z.to; s0 += 26) for (const side of SIDES) {
        if (busy(s0, 10) || rand() < 0.35) continue;
        const s = s0 + rand() * 12, d = (side < 0 ? 24 : 7) + rand() * 14, sc = 0.9 + rand() * 0.7, at = kit.point(s, beside(side, s, d));
        kit.at(0x2b2233, TREES[rand() < 0.5 ? 0 : 1], at.x, at.y, at.z, sc, sc, sc, rand() * 6.3, false, 2);
      }
    } else if (z.set === 'hill') {
      // the haunted house on its hill, straight ahead as the bend straightens: the road goes in under the hill by the
      // tunnel (a level's "tunnels", their portals are the tunnel's own, tunnel.js), the hill a long ridge with a flat top
      // cut off flush with the portals, the house on the top, a trail of lanterns up the slope to its porch
      for (const t of (LEVEL.tunnels || []).filter(x => x.from >= z.from && x.to <= z.to)) {
        const H = 17, HALF = 42, TOP = 0.48, mid = (t.from + t.to) / 2, c = kit.point(mid, 0), len = t.to - t.from - 4;
        kit.at(0x2e3b2a, RIDGE, c.x, c.y, c.z, HALF, H, len, c.h, false, -1);
        const fa = c.h + Math.PI, y0 = c.y + H - 0.4;
        const f = (dx, dy, dz) => ({ x: c.x + dx * Math.cos(fa) + dz * Math.sin(fa), y: y0 + dy, z: c.z - dx * Math.sin(fa) + dz * Math.cos(fa) });
        const put = (color, geo, dx, dy, dz, sx, sy, sz, g = false, turn = 0) => { const q = f(dx, dy, dz); kit.at(color, geo, q.x, q.y, q.z, sx, sy, sz, fa + turn, g, -1); };
        const wall = 0x3a3340, roof = 0x241e2c;
        put(wall, cube, 0, 5.5, 0, 24, 11, 14);                       // the main house
        put(roof, PRISM, 0, 11, 0, 15.5, 6.5, 25.5, false, Math.PI / 2);
        put(wall, cube, -10.5, 11, -1, 6.4, 22, 6.4);                 // the tower, left of the front
        put(roof, SPIRE, -10.5, 25.5, -1, 8.6, 9, 8.6);
        put(wall, cube, 15, 4, 1, 9, 8, 10);                          // the wing, right
        put(roof, PRISM, 15, 8, 1, 11, 4.5, 10, false, Math.PI / 2);
        put(wall, cube, 5, 14.5, -2, 2.4, 5, 2.4);                    // chimneys
        put(wall, cube, -4, 14, 2, 2, 4, 2);
        put(0x4a4350, cube, 0, 0.4, 8.6, 9, 0.8, 3);                  // the porch, its roof and posts
        put(roof, PRISM, 0, 4.3, 8.3, 3.6, 2.2, 9.5, false, Math.PI / 2);
        for (const dx of [-4, -1.5, 1.5, 4]) put(0x4a4350, cube, dx, 2.3, 9.8, 0.4, 3.8, 0.4);
        put(DARK, cube, 0, 1.9, 7.1, 2.6, 3.8, 0.2);                  // the door, with a pale glow over it
        put(0xffe9a8, cube, 0, 4.1, 7.15, 0.8, 0.6, 0.2, true);
        // the windows: lit ones flicker (three groups, three phases); a dark cross over each
        const win = (dx, dy, dz, w, h) => { const q = f(dx, dy, dz); pane(q.x, q.y, q.z, h, w, fa - Math.PI / 2, rand() < 0.88); };
        for (const dx of [-7, -3.5, 3.5, 7]) win(dx, 3.2, 7.1, 1.4, 2.2);
        for (const dx of [-8, -4, 0, 4, 8]) win(dx, 8, 7.1, 1.4, 2.2);
        for (const dy of [6, 12, 17]) win(-10.5, dy, 3.25, 1.4, 2.2);
        win(-10.5, 20.6, 3.25, 2.4, 2.4);
        for (const dx of [11.5, 15, 18.5]) win(dx, 4, 6.1, 1.3, 2);
        // the trail of lanterns up the right-hand slope to the porch, and dead trees on the slopes
        for (let k = 0; k < 15; k++) {
          const u = k / 14, s = t.from - 24 + u * (mid - 14 - t.from + 24), lat = 46 - 40 * u, y = Math.max(0, Math.min(H, H * (HALF - lat) / (HALF * (1 - TOP)))) - 0.4;
          const q = kit.point(s, lat, 0);
          jackAt(q.x, q.y + y, q.z, 1.7, faceRoad(q.h, -1) + 0.4);
        }
        for (let k = 0; k < 9; k++) {
          const s = t.from + 10 + rand() * (len - 20), sd = k % 2 ? 1 : -1, lat = sd * (21 + rand() * 12), y = Math.max(0, H * (HALF - Math.abs(lat)) / (HALF * (1 - TOP))) - 0.4, sc = 0.9 + rand() * 0.7, q = kit.point(s, lat, 0);
          if (Math.abs(lat) < 40) kit.at(0x2b2233, TREES[k % 2], q.x, q.y + Math.min(y, H), q.z, sc, sc, sc, rand() * 6, false, -1);
        }
        const top = f(-10.5, 24, 0);
        for (let k = 0; k < 14; k++) bats.push({ x: top.x, y: top.y + 2, z: top.z, r: 5 + rand() * 12, h: rand() * 9 - 3, a: rand() * 6.3, speed: (0.5 + rand() * 0.7) * (k % 2 ? 1 : -1), beat: 10 + rand() * 5, ph: rand() * 6 });
        for (const e of [t.from - 14, t.to + 14]) for (const side of SIDES) jack(e, beside(side, e, 3.2), 0.0, 0.9);
      }
      // a ghost or two over the road's edge
      for (let s = z.from + 120; s < z.to - 100; s += 240) if (!busy(s, 20)) ghost(s, beside(-1, s, 4.5), 3.2 + rand(), 1.3);
    } else if (z.set === 'village') {
      const palette = [0x4a4256, 0x594a3e];
      for (let s0 = z.from + 22, n = 0; s0 < z.to - 20; s0 += 30 + rand() * 12, n++) {
        for (const side of SIDES) {
          if (busy(s0, 14) || rand() < 0.16) continue;
          if (side > 0 && s0 > 4180) continue; // (room for the village sign)
          const s = s0 + (side > 0 ? 9 : 0), d = 8 + rand() * 4, w = 7 + rand() * 3, l = 7 + rand() * 3, h = 4 + rand() * 1.8, lat = beside(side, s, d), toward = -side;
          kit.of(pick(palette)).push([s, lat, h / 2, w, h, l]);
          kit.of(ROOF, PRISM).push([s, lat, h, w + 1.4, 2.6 + rand() * 1.2, l + 1.2]);
          kit.of(ROOF).push([s + l * 0.25, lat - toward * w * 0.25, h + 3.4, 0.9, 2.2, 0.9]);
          const face = lat + toward * (w / 2 + 0.03);
          for (const ds of [-l * 0.3, l * 0.3]) for (const y of [h * 0.35, h * 0.78]) {
            const q = kit.point(s + ds, face, y);
            pane(q.x, q.y, q.z, 1.1, 1.0, q.h, rand() > 0.3);
          }
          kit.of(DARK).push([s, face, 1.2, 0.12, 2.4, 1.2]);
          kit.of(0xffc060, cube, true).push([s - 1.2, face + toward * 0.06, 2.4, 0.2, 0.3, 0.2]);
          // carved pumpkins on the step, and a heap
          const step = lat + toward * (w / 2 + 0.9);
          jack(s + 1.0, step, 0.0, 0.9 + rand() * 0.3, (rand() - 0.5) * 0.6);
          if (rand() < 0.6) jack(s - 0.6, step + toward * 0.2, 0.0, 0.6 + rand() * 0.3, (rand() - 0.5) * 0.6);
          if (rand() < 0.5) for (let k = 0; k < 3; k++) { const q = kit.point(s + 2.4 + k * 0.5, lat + toward * (w / 2 + 0.7 - k * 0.1)); kit.at(0xd8650f, PUMPKIN, q.x, q.y + 0.3, q.z, 0.7, 0.7, 0.7, rand() * 6, false, -1); }
          if (n % 2 === 0) railing(s - l * 0.7, s + l * 0.7, (q) => beside(side, q, 3.6), 1.3);
          if (rand() < 0.35) ghost(s + 4, beside(side, s + 4, 3.6), 3.4 + rand() * 0.6, 1.1);
        }
      }
      // the church, left, with its spire and a lit rose window
      const ch = 3920, cc = kit.point(ch, beside(-1, ch, 16));
      if (!busy(ch, 20)) {
        const ref = kit.point(ch, 0), fa = Math.atan2(ref.x - cc.x, ref.z - cc.z);
        const f = (dx, dy, dz) => ({ x: cc.x + dx * Math.cos(fa) + dz * Math.sin(fa), y: cc.y + dy, z: cc.z - dx * Math.sin(fa) + dz * Math.cos(fa) });
        const put = (color, geo, dx, dy, dz, sx, sy, sz, g = false, turn = 0) => { const q = f(dx, dy, dz); kit.at(color, geo, q.x, q.y, q.z, sx, sy, sz, fa + turn, g, -1); };
        put(0x555262, cube, 0, 4.2, 0, 9, 8.4, 18);
        put(ROOF, PRISM, 0, 8.4, 0, 10, 5, 19);
        put(0x555262, cube, 0, 7, -9.5, 5, 14, 5);
        put(ROOF, SPIRE, 0, 19.5, -9.5, 5.6, 11, 5.6);
        put(0xffd070, cube, 0, 11, -9.5 + 2.55, 1.2, 2.4, 0.1, true);
        put(0xffb040, cube, 0, 5.6, 9.05, 2.2, 2.2, 0.12, true);
        for (const dz of [-4, 0, 4]) for (const sd of [-1, 1]) put(0xffa83a, cube, sd * 4.55, 3.4, dz, 0.12, 2.6, 1.0, true);
        put(DARK, cube, 0, 1.4, 9.05, 2.0, 2.8, 0.15);
        for (let k = 0; k < 5; k++) put(pick([0x8a9088, 0x6f746f]), STONES[k % 3], -7 + k * 3.5, 0, 14, 1, 1, 1);
      }
      const vs = makeSign('HOLLOW GREEN\nDRIVE CAREFULLY', '#1d1236', '#ff9a1e', 6.4, 2.6, 3.4);
      vs.rotation.y = Track.toWorld(4260, beside(1, 4260, 1.6), p);
      vs.position.set(p.x, p.y, p.z);
      vs.children[1].scale.x = Track.mirrored ? -1 : 1;
      levelGroup.add(vs);
    }
  }

  // ---- the hills on the skyline, dark against the glow, all round
  const hills = [];
  for (let s = Track.start - 100; s < Track.end + 150; s += 150) {
    for (const side of SIDES) {
      const q = Math.max(Track.start, Math.min(Track.end, s)), r = 55 + rand() * 80, h = 18 + rand() * 34, d = 260 + r * 0.5 + rand() * 120, c = kit.point(q, beside(side, q, d));
      if (!offRoads(c.x, c.z, r) || Track.mainDistance(c.x, c.z) < d - 25) continue;
      hills.push([s, beside(side, q, d), h / 2 - 8, r * 2, h + 16, r * 2]);
    }
  }
  instances(HILLS, 0x1a1428, hills, false, 20);

  kit.draw();

  // ---- drawn at the end: webs, light on the road, windows, the railings
  if (webs.length) inst(hang, MAT.web, webs, 3);
  if (pools[0].length) inst(flat, MAT.warm, pools[0], 2);
  if (pools[1].length) inst(flat, MAT.orange, pools[1], 2);
  windows.forEach((list, i) => { if (list.length) inst(WINDOW, i < 3 ? MAT.windows[i] : MAT.dark, list); });
  for (const [kind, { pos, uv, idx }] of Object.entries(ribbons)) {
    if (!pos.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const strip = new THREE.Mesh(geo, MAT[kind]);
    strip.frustumCulled = false;
    levelGroup.add(strip);
  }

  // ---- bats about the hill and the cemetery, the sheets bobbing, mist drifting low over the fields
  const batMesh = bats.length ? inst(BAT, MAT.bat, bats.map(() => new THREE.Matrix4()), 1) : null;
  const sheetMesh = ghosts.length ? inst(SHEET, MAT.sheet, ghosts.map(() => new THREE.Matrix4()), 1) : null;
  const eyeMesh = ghosts.length ? inst(DOT, MAT.ink, ghosts.flatMap(() => [new THREE.Matrix4(), new THREE.Matrix4()]), 1) : null;
  for (let s = Track.start + 40; s < Track.end; s += 150) {
    for (const side of SIDES) {
      const at = kit.point(s + rand() * 100, beside(side, s, 4 + rand() * 30));
      mists.push({ x: at.x, z: at.z, y: 0.5 + rand() * 0.7, size: 38 + rand() * 40, dx: 6 + rand() * 12, dz: 6 + rand() * 12, speed: 0.04 + rand() * 0.05, ph: rand() * 6.3 });
    }
  }
  const mistMesh = mists.length ? inst(flat, MAT.mist, mists.map(() => new THREE.Matrix4()), 4) : null;
  const flickers = [0xffb030, 0xff9a1e, 0xffc650];
  everyFrame(levelGroup, (t) => {
    MAT.windows.forEach((m, i) => { const f = 0.5 + 0.5 * Math.sin(t * (3.1 + i * 1.7) + i * 2) * Math.sin(t * (7.3 + i) + 1); m.color.setHex(flickers[i]).multiplyScalar(0.78 + 0.3 * f); });
    if (batMesh) {
      bats.forEach((b, i) => {
        const a = b.a + t * b.speed * 0.6;
        o.position.set(b.x + Math.cos(a) * b.r, b.y + b.h + Math.sin(t * 0.9 + b.ph) * 1.2, b.z + Math.sin(a) * b.r);
        o.rotation.set(0, -a + (b.speed > 0 ? 0 : Math.PI), 0);
        o.scale.set(1, Math.sin(t * b.beat + b.ph), 1);
        o.updateMatrix();
        batMesh.setMatrixAt(i, o.matrix);
      });
      batMesh.instanceMatrix.needsUpdate = true;
    }
    if (sheetMesh) {
      ghosts.forEach((g, i) => {
        const bob = Math.sin(t * 1.1 + g.ph) * 0.35, sway = Math.sin(t * 0.8 + g.ph) * 0.15, ry = g.ry + sway;
        o.position.set(g.x, g.y + bob, g.z); o.rotation.set(0, ry, 0); o.scale.set(g.size * 1.1, g.size * 1.3, g.size * 1.1); o.updateMatrix();
        sheetMesh.setMatrixAt(i, o.matrix);
        for (const e of [-1, 1]) {
          o.position.set(g.x + Math.cos(ry) * e * 0.16 * g.size + Math.sin(ry) * 0.36 * g.size, g.y + bob + 0.66 * g.size, g.z - Math.sin(ry) * e * 0.16 * g.size + Math.cos(ry) * 0.36 * g.size);
          o.scale.set(0.12 * g.size, 0.2 * g.size, 0.08 * g.size);
          o.updateMatrix();
          eyeMesh.setMatrixAt(i * 2 + (e + 1) / 2, o.matrix);
        }
      });
      sheetMesh.instanceMatrix.needsUpdate = true;
      eyeMesh.instanceMatrix.needsUpdate = true;
    }
    if (mistMesh) {
      mists.forEach((m, i) => {
        o.position.set(m.x + Math.sin(t * m.speed + m.ph) * m.dx, m.y, m.z + Math.cos(t * m.speed * 0.8 + m.ph) * m.dz);
        o.rotation.set(0, m.ph, 0); o.scale.set(m.size, 1, m.size); o.updateMatrix();
        mistMesh.setMatrixAt(i, o.matrix);
      });
      mistMesh.instanceMatrix.needsUpdate = true;
    }
  });
};
