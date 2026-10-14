// ---- the rainforest: a muddy red-brown road through the jungle. Walls of tall trees (an upper storey that stands
// out over the rest, a middle one, tree ferns) close to the road with ferns, big leaves and bright flowers at their
// feet, vines hanging, shafts of light slanting down through the canopy, mist lying between the trunks, warm rain
// (the theme's rain: true). A bridge (a level's "bridges") crosses a ravine with a brown river in the bottom of it,
// the old iron truss overgrown (vines from its beams, moss on its chords) and plank ribs on the road; a ranger's hut
// on stilts every so often, scarlet macaws wheeling over the trees, a waterfall off in the distance (its water a
// scrolling texture, 64 x 256 drawn in code). Only a sight, all of it.
// Cheap by design: every kind of thing is ONE instanced geometry with its colours baked in (a whole tree is 100 to 130
// triangles), cut into chunks of 250 m along the road so that the renderer culls the ones behind and far ahead; the
// randomness is seeded from the level, so a run is the same twice.
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { CONFIG } from '../../config.js';
import { everyFrame } from './sceneryClock.js';
import { treeEmergent, treeMid, treeFern, fernClump, bigLeaves, flowerHead, vine, makeRangerHut, makeMacaw } from './rainforestModels.js';

const CHUNK = 250;    // m of road to a chunk of instances
const GULLY = 7;      // m a ravine under a bridge is deep
const FLOWERS = [0xe8262b, 0xff7a1a, 0xffc61f, 0xe83a9a, 0x9a4fd6, 0xff4f5a]; // heliconia red, orange, yellow, hot pink, orchid, coral

export const rainforest = ({ theme, add, flat, instances, sideStrip, buildStrip, offRoads, beside, inJunction, cube, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 41 + [...(LEVEL.id || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7);
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const between = (a, b) => a + rand() * (b - a);
  const p = {};
  const bridges = (LEVEL.bridges || []).filter(b => !b.road), fords = LEVEL.fords || [];
  const spans = [...bridges.map(b => [b.from - 10, b.to + 10]), ...fords.map(f => [f.from - 8, f.to + 8])];
  const wet = (s) => spans.some(([a, b]) => s > a && s < b);
  const open = (s) => s > Track.start + 2 && s < Track.end - 2 && !inJunction(s) && !Track.onBridge(s) && !(Track.tunnel(s) > 0) && !wet(s);
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));

  // ---- instanced kinds, cut into chunks along the road ------------------------------------------------------------------
  const tint = new THREE.Color(), spot = new THREE.Object3D();
  const kinds = [];
  const kind = (geometry, material, reach) => {
    const k = { geometry, material, reach, chunks: new Map(), count: 0 }; // (reach: m from the camera beyond which a chunk of it is not drawn: the fog has it by then)
    kinds.push(k);
    return (s, x, y, z, sx, sy, sz, turn = 0, color = 0xffffff, lean = 0) => {
      const c = Math.floor((s - Track.start) / CHUNK);
      if (!k.chunks.has(c)) k.chunks.set(c, []);
      k.chunks.get(c).push([x, y, z, sx, sy, sz, turn, color, lean]);
      k.count++;
    };
  };
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  const leafy = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const PUT = {
    emergent: kind(treeEmergent(), solid, 600), mid: kind(treeMid(), solid, 360), fern: kind(treeFern(), leafy, 240), clump: kind(fernClump(), leafy, 170),
    leaves: kind(bigLeaves(), leafy, 190), flower: kind(flowerHead(), leafy, 150), vine: kind(vine(), leafy, 200),
    blob: kind(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), 300), bush: kind(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), 130),
  };
  // a place d m off the pavement on that side, if it is clear of every other road (and of the ravines and fords): sets p
  const spotAt = (s, side, d, r) => {
    if (!open(s)) return false;
    const h = Track.toWorld(s, beside(side, s, d), p);
    const own = (side < 0 ? -Track.lo(s) : Track.hi(s)) + d, gap = Track.mainDistance(p.x, p.z);
    if (!offRoads(p.x, p.z, r) || !(gap >= half(s) + r + 1 || gap >= own - 0.6)) return false;
    p.h = h;
    return true;
  };
  const shade = (base, spread) => { // a tint near white (its brightness and a little hue varying), as a hex
    const v = 1 + (rand() - 0.5) * spread, g = 1 + (rand() - 0.4) * spread * 0.7, b = 1 + (rand() - 0.5) * spread * 0.9;
    return tint.setRGB(Math.min(1.25, v * base), Math.min(1.25, g * base), Math.min(1.25, b * base)).getHex();
  };

  // ---- clearings: where a waterfall stands, the trees behind the near wall are left out for the road to see it through
  const FALLS = [0.16, 0.6], fallAt = [];
  FALLS.forEach((f, n) => { // (where each waterfall stands: a stretch of road, its side and its distance, settled here so the trees can leave room)
    const side = n % 2 ? 1 : -1, d = 46 + n * 8;
    for (let s = Track.start + (Track.end - Track.start) * f, tries = 0; tries < 40; tries++, s += 15) {
      if (!open(s)) continue;
      Track.toWorld(s, beside(side, s, d), p);
      if (offRoads(p.x, p.z, 40) && Track.mainDistance(p.x, p.z) > half(s) + d - 8) { fallAt.push({ s, side, d }); break; }
    }
  });
  const cleared = (s, side) => fallAt.some(f => f.side === side && Math.abs(s - f.s) < 70);

  // ---- the jungle: along both sides, a slot of 6 to 11 m at a time, each side its own
  for (const side of [-1, 1]) {
    for (let s0 = Track.start + 2; s0 < Track.end - 2; s0 += between(6, 11)) {
      const s = s0, open2 = !cleared(s, side);
      // the wall: a tree close in nearly every slot, more behind
      if (rand() < 0.88 && spotAt(s, side, between(6, 10.5), 1.6)) {
        const big = rand() < 0.3, sc = between(0.8, 1.25);
        PUT[big ? 'emergent' : 'mid'](s, p.x, p.y - 0.1, p.z, sc, big ? between(0.85, 1.2) : sc * between(0.85, 1.2), sc, rand() * 6.28, shade(1, 0.34));
      }
      if (open2 && rand() < 0.9 && spotAt(s + 3, side, between(10, 28), 1.8)) {
        const sc = between(0.85, 1.35);
        PUT.mid(s + 3, p.x, p.y - 0.1, p.z, sc, sc * between(0.9, 1.35), sc, rand() * 6.28, shade(0.95, 0.4));
        if (rand() < 0.5) { // (vines from its crown, hung where the road can see them)
          const hang = between(4, 9);
          PUT.vine(s + 3, p.x + between(-3, 3), p.y + 15.5, p.z + between(-3, 3), 1, hang, 1, rand() * 6.28, shade(0.9, 0.3));
        }
      }
      if (open2 && rand() < 0.5 && spotAt(s + 5, side, between(14, 50), 2.5)) {
        const sc = between(0.9, 1.45);
        PUT.emergent(s + 5, p.x, p.y - 0.1, p.z, sc, between(0.85, 1.4), sc, rand() * 6.28, shade(1, 0.3));
      }
      if (rand() < 0.4 && spotAt(s + 1, side, between(4, 14), 1.2)) PUT.fern(s + 1, p.x, p.y - 0.05, p.z, 1, between(0.8, 1.3), 1, rand() * 6.28, shade(1, 0.3));
      // the shrub layer between the trunks: low dark lobes of leaf, and ferns further back
      if (rand() < 0.75 && spotAt(s + 2, side, between(3, 22), 1.5)) {
        const w = between(1.6, 3.2);
        PUT.bush(s + 2, p.x, p.y + w * 0.25, p.z, w, w * between(0.5, 0.9), w * between(0.9, 1.3), rand() * 6.28, [0x2c7a34, 0x36893a, 0x246c2e, 0x4a9a42][Math.floor(rand() * 4)]);
      }
      if (open2 && rand() < 0.7 && spotAt(s + 4, side, between(6, 24), 1)) PUT.clump(s + 4, p.x, p.y - 0.05, p.z, between(1.2, 2), between(1, 1.8), between(1.2, 2), rand() * 6.28, shade(1, 0.35));
      // the understory close to the road: ferns, big leaves, flowers
      for (let k = 0; k < 2; k++) if (spotAt(s + k * 3, side, between(0.9, 6), 0.8)) PUT.clump(s + k * 3, p.x, p.y - 0.05, p.z, between(0.9, 1.5), between(0.8, 1.4), between(0.9, 1.5), rand() * 6.28, shade(1, 0.35));
      if (rand() < 0.65 && spotAt(s + 2, side, between(1.6, 6.5), 1)) PUT.leaves(s + 2, p.x, p.y - 0.05, p.z, 1.1, between(0.9, 1.5), 1.1, rand() * 6.28, shade(1, 0.3));
      if (rand() < 0.85 && spotAt(s + 4, side, between(0.8, 5), 0.5)) {
        const c = FLOWERS[Math.floor(rand() * FLOWERS.length)];
        PUT.flower(s + 4, p.x, p.y - 0.05, p.z, 1.8, between(1.1, 1.9), 1.8, rand() * 6.28, c);
        if (rand() < 0.5) PUT.flower(s + 4, p.x + 0.9, p.y - 0.05, p.z + 0.6, 1.6, between(0.9, 1.5), 1.6, rand() * 6.28, c);
      }
    }
  }

  // ---- the floor: a muddy verge along the pavement and dark leaf litter beyond it, in the stretches between the bridges
  const stretches = [];
  { let from = Track.start; for (const b of bridges) { stretches.push([from, b.from + 2]); from = b.to - 2; } stretches.push([from, Track.end]); }
  const MUD = flat(0x6a4129), LITTER = flat(0x234a24);
  for (const [a, b] of stretches) {
    for (const side of [-1, 1]) {
      add(sideStrip(a, b, (q) => beside(side, q, 0.15), (q) => beside(side, q, 2.6), 0.03, 6), MUD);
      add(sideStrip(a, b, (q) => beside(side, q, 2.6), (q) => beside(side, q, 70), 0.02, 12), LITTER);
    }
  }

  // ---- ravines under the bridges. The generic river (a blue sheet at sea level, ±500 m wide) is covered with the
  // ground's colour, and a ravine is drawn in its place, below the ground (the ground does not write depth, so what is
  // drawn after it shows): two earth walls, a brown river in the bottom of it, thinning out to nothing at its ends
  const mist = [];
  for (const b of bridges) {
    const a = b.from + 4, z = b.to - 4, WIDE = 150, ends = 70;
    const base = new THREE.MeshBasicMaterial({ color: theme.ground, side: THREE.DoubleSide, depthWrite: false });
    const cover = new THREE.Mesh(buildStrip(b.from + 5, b.to - 5, -520, 520, -0.012, 20), base);
    cover.renderOrder = -0.9;
    levelGroup.add(cover);
    const floorY = (lat) => -GULLY * Math.max(0, Math.min(1, (WIDE - Math.abs(lat)) / ends)) - 0.02;
    const lats = []; for (let l = -WIDE; l <= WIDE + 0.01; l += 10) lats.push(l);
    const pos = [], col = [], idx = [], earth = new THREE.Color(0x7a5236), deep = new THREE.Color(0x2e2a1c), bed = new THREE.Color(0x4a3d24);
    const vert = (s, lat, y, c) => { Track.toWorld(s, lat, p); pos.push(p.x, y ?? p.y - 0.02, p.z); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
    for (const wall of [a, z]) { // (a wall of earth, from the lip at the road's height down to the water)
      let prev = null;
      for (const lat of lats) {
        const top = vert(wall, lat, null, earth), bottom = vert(wall, lat, floorY(lat), deep);
        if (prev) idx.push(prev[0], prev[1], top, prev[1], bottom, top);
        prev = [top, bottom];
      }
    }
    let prev = null; // (the river's bed, a brown sheet across the bottom)
    for (const lat of lats) {
      const left = vert(a, lat, floorY(lat), bed), right = vert(z, lat, floorY(lat), bed);
      if (prev) idx.push(prev[0], prev[1], left, prev[1], right, left);
      prev = [left, right];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    levelGroup.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    // (mist lying in it, and rapids: pale streaks on the water)
    const mid = (a + z) / 2;
    for (let n = 0; n < 5; n++) { Track.toWorld(mid + between(-30, 30), between(-70, 70), p); mist.push([p.x, p.y - between(1.5, 5), p.z, between(40, 70), between(30, 50), rand() * 3]); }
    // (the bridge: plank ribs across the road, vines from the truss's beams, moss on its chords; the truss is items.js's)
    const ribs = [], mid2 = (Track.lo(mid) + Track.hi(mid)) / 2;
    for (let s = b.from + 1; s < b.to; s += 1.8) ribs.push([s, mid2, 0.045, Track.hi(s) - Track.lo(s) + 0.2, 0.09, 0.2]);
    instances(cube, 0x4a3320, ribs);
    const TOP = Math.max(CONFIG.camHeight, CONFIG.screensaver.camHeight) + 4, wall = (side, s) => Track.edge(s, side) + CONFIG.bridgeWallInset;
    for (let s = b.from; s < b.to; s += 8) {
      for (const side of [-1, 1]) {
        Track.toWorld(s, side * (wall(side, s) + 0.5), p);
        PUT.blob(s, p.x, p.y + TOP + 0.3, p.z, 1.6, 0.5, 5, 0, [0x3f8f3a, 0x2f7a30, 0x4f9a40][Math.floor(rand() * 3)]);
        if (rand() < 0.8) PUT.vine(s, p.x, p.y + TOP - 0.4, p.z, 1, between(2.5, 6), 1, rand() * 6.28, shade(0.9, 0.3));
      }
      for (let n = 0; n < 3; n++) { Track.toWorld(s, between(Track.lo(s) + 1.5, Track.hi(s) - 1.5), p); PUT.vine(s, p.x, p.y + TOP - 0.6, p.z, 1, between(2, 5.5), 1, rand() * 6.28, shade(0.9, 0.3)); }
    }
  }

  // ---- the fords: the river across the road is the gamble's (render/gambles.js, a bright blue); here it is silted brown-green
  // over it, the same stretch (on the right it stops short of the side road, its bridge)
  for (const f of fords) {
    const reach = (q) => { Track.toWorld(q, Track.hi(q), p); return Math.max(2, Math.min(60, Track.sideDistance(p.x, p.z) - 8)); };
    const silt = new THREE.Mesh(buildStrip(f.from, f.to, (q) => Track.lo(q) - 60, (q) => Track.hi(q) + reach(q), 0.05 + (f.depth ?? CONFIG.ford.depth) * 0.25 + 0.025, 4),
      new THREE.MeshBasicMaterial({ color: 0x84703c, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    silt.renderOrder = 2;
    silt.userData.flat = true;
    levelGroup.add(silt);
  }

  // ---- finish the instanced kinds: one InstancedMesh a kind a chunk
  const dummyColor = new THREE.Color(), far = []; // (far: each chunk's mesh, with its reach: seen to by the frame's clock below)
  for (const k of kinds) {
    for (const list of k.chunks.values()) {
      const mesh = new THREE.InstancedMesh(k.geometry, k.material, list.length);
      list.forEach(([x, y, z, sx, sy, sz, turn, color, lean], i) => {
        spot.position.set(x, y, z);
        spot.rotation.set(0, turn, lean);
        spot.scale.set(sx, sy, sz);
        spot.updateMatrix();
        mesh.setMatrixAt(i, spot.matrix);
        mesh.setColorAt(i, dummyColor.setHex(color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      far.push([mesh, mesh.boundingSphere.center, mesh.boundingSphere.radius + k.reach]);
      levelGroup.add(mesh);
    }
  }

  // ---- shafts of light: tall translucent slanted panels, pale gold, in the gaps between the trees. Their glow breathes
  const SHAFT = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const shafts = [];
  for (let s = Track.start + 30; s < Track.end - 10; s += between(55, 95)) {
    const side = rand() < 0.5 ? -1 : 1;
    if (!spotAt(s, side, between(5, 24), 3)) continue;
    const top = between(26, 36), wide = between(3, 6);
    shafts.push([p.x, p.y + top, p.z, wide, top, rand() * 3.14]);
    shafts.push([p.x, p.y + top, p.z, wide * 0.7, top, rand() * 3.14 + 1.5]);
  }
  if (shafts.length) {
    const mesh = new THREE.InstancedMesh(SHAFT, shaftMat, shafts.length);
    shafts.forEach(([x, y, z, w, h, turn], i) => { spot.position.set(x, y, z); spot.rotation.set(0.28, turn, 0.18); spot.scale.set(w, h, 1); spot.updateMatrix(); mesh.setMatrixAt(i, spot.matrix); });
    mesh.renderOrder = 3;
    mesh.userData.flat = true;
    levelGroup.add(mesh);
  }

  // ---- mist: wide pale sheets low between the trunks and in the ravines
  for (let s = Track.start + 40; s < Track.end; s += between(45, 80)) {
    const side = rand() < 0.5 ? -1 : 1;
    Track.toWorld(s, beside(side, s, between(9, 40)), p);
    if (!open(s) || !offRoads(p.x, p.z, 12)) continue;
    mist.push([p.x, p.y + between(1.2, 5), p.z, between(28, 55), between(20, 40), rand() * 3]);
  }
  const softTexture = (() => { // (a round, soft-edged puff, 64 x 64, drawn in code: the mist's sheets are this, not discs with an edge)
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.55, 'rgba(255,255,255,0.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  })();
  const HAZE = new THREE.MeshBasicMaterial({ color: 0xe6efe6, map: softTexture, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const mistMesh = mist.length ? new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), HAZE, mist.length) : null;
  if (mistMesh) {
    mist.forEach(([x, y, z, a, b, turn], i) => { spot.position.set(x, y, z); spot.rotation.set(0, turn, 0); spot.scale.set(a, 1, b); spot.updateMatrix(); mistMesh.setMatrixAt(i, spot.matrix); });
    mistMesh.renderOrder = 3;
    mistMesh.userData.flat = true;
    levelGroup.add(mistMesh);
  }

  // ---- the waterfall: a cliff far off the road with a ribbon of white water down it, a pool and spray at its foot
  const fallTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 256;
    const g = canvas.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, 'rgba(210,235,245,0.55)'); grad.addColorStop(0.5, 'rgba(250,255,255,0.95)'); grad.addColorStop(1, 'rgba(200,228,240,0.55)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 70; i++) { // (streaks that run on from the top edge to the bottom's, so that it tiles)
      const x = rand() * 64, y = rand() * 256, h = 30 + rand() * 90;
      g.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '150,200,225'},${0.25 + rand() * 0.4})`;
      g.fillRect(x, y, 1 + rand() * 3, h);
      if (y + h > 256) g.fillRect(x, y - 256, 1 + rand() * 3, h);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 2.5);
    return t;
  })();
  fallAt.forEach(({ s, side, d }) => {
    const g = new THREE.Group();
    const h = Track.toWorld(s, beside(side, s, d), p);
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = h + (side < 0 ? Math.PI : 0); // (its local +x faces the road: the road's left is the world's +x)
    const rock = new THREE.MeshLambertMaterial({ color: 0x5b5648 }), wetRock = new THREE.MeshLambertMaterial({ color: 0x3e4a42 });
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(14, 58, 52), rock);   // (the cliff, its face to the road along local +x)
    cliff.position.set(-24, 27, 0);
    g.add(cliff);
    for (const [y, w, o] of [[44, 18, 3], [30, 22, 5]]) { const ledge = new THREE.Mesh(new THREE.BoxGeometry(w, 4, 40), wetRock); ledge.position.set(-18 + o, y, 0); g.add(ledge); }
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x2d7a34 }));
    top.scale.set(24, 6, 30); top.position.set(-26, 58, 0); g.add(top);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(10, 54), new THREE.MeshBasicMaterial({ map: fallTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    water.rotation.y = Math.PI / 2; water.position.set(-16.6, 28, 0); g.add(water);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(15, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6fb7aa, transparent: true, opacity: 0.8, depthWrite: false }));
    pool.position.set(-3, 0.12, 0); g.add(pool);
    const spray = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), HAZE);
    spray.scale.set(20, 1, 16); spray.position.set(-12, 4, 0); spray.renderOrder = 3; g.add(spray);
    levelGroup.add(g);
  });
  everyFrame(levelGroup, (t, cx, cy, cz) => {
    for (const [mesh, c, reach] of far) mesh.visible = (c.x - cx) * (c.x - cx) + (c.z - cz) * (c.z - cz) < reach * reach; // (the near ones, no more than the fog shows)
    fallTexture.offset.y = -(t * 0.7) % 1;
    shaftMat.opacity = 0.09 + 0.04 * Math.sin(t * 0.6);
    if (mistMesh) mistMesh.position.set(Math.sin(t * 0.07) * 5, 0, Math.cos(t * 0.06) * 5);
  });

  // ---- warm rain: long fine streaks in a box round the camera, two layers falling at 24 m/s (the theme's own rain: true
  // is the fine grey one, which is all there is; these are what the eye takes for a downpour). One draw call a layer
  const STREAKS = 1100, BOX = 55, LEN = 1.3, rainPoints = [];
  for (let i = 0; i < STREAKS; i++) {
    const x = (rand() - 0.5) * BOX * 2, y = rand() * BOX, z = (rand() - 0.5) * BOX * 2;
    rainPoints.push(x, y, z, x + 0.18, y - LEN, z);
  }
  const rainGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rainPoints, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xf2ead6, transparent: true, opacity: 0.32, depthWrite: false });
  for (const layer of [0, 1]) {
    const streaks = new THREE.LineSegments(rainGeo, rainMat);
    streaks.frustumCulled = false;
    streaks.renderOrder = 4;
    streaks.onBeforeRender = (renderer, scene, camera) => {
      const down = (performance.now() / 1000 * 24 + layer * BOX) % (BOX * 2);
      streaks.position.set(scene.scale.x < 0 ? -camera.position.x : camera.position.x, camera.position.y + BOX - down, camera.position.z);
      streaks.updateMatrixWorld();
    };
    levelGroup.add(streaks);
  }

  // ---- a ranger's hut now and then, on stilts a little back from the road; scarlet macaws wheeling over the trees
  const alive = [];
  const stand = (model, x, y, z, turn) => { model.position.set(x, y, z); model.rotation.y = turn; levelGroup.add(model); if (model.userData.animate) alive.push([model, rand() * 20]); };
  [[Track.start + 130, 1], [Track.start + (Track.end - Track.start) * 0.4, -1], [Track.end - 330, 1]].forEach(([at, side]) => {
    for (let s = at; s < at + 160; s += 10) {
      if (!spotAt(s, side, 9, 7)) continue;
      stand(makeRangerHut(), p.x, p.y, p.z, p.h + (side > 0 ? 0 : Math.PI));
      break;
    }
  });
  for (let s = Track.start + 200, k = 0; s < Track.end - 100; s += between(330, 520), k++) {
    Track.toWorld(s, between(-15, 15), p);
    const bird = makeMacaw(between(14, 26));
    bird.position.set(p.x, p.y + between(18, 28), p.z);
    stand(bird, p.x, p.y + between(18, 28), p.z, 0);
  }
  const speck = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, -90, 0, 0.01, -90, 0, 0, -90, 0.01], 3)), new THREE.MeshBasicMaterial());
  speck.frustumCulled = false;
  speck.onBeforeRender = () => { const t = performance.now() / 1000; for (const [model, phase] of alive) model.userData.animate(t + phase); };
  levelGroup.add(speck);
};
