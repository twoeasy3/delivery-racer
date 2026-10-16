// ---- the CLASSIC particle pools' machinery: instanced cubes in a ring buffer (moved here unchanged from render/effects.js so that
// the Cosmetics screen's preview can make a small set of its own in its own scene: render/killfx.js). effects.js still makes the
// game's three (Particles, Fire, Smoke) with it, as before. No game imports: a pool is given the scene (or group) it goes in.
import * as THREE from 'three';
// (a unit cube of its own, the same shape as render/cars.js unitBox: this module imports nothing of the game's)
export const unitBox = new THREE.BoxGeometry(1, 1, 1);
unitBox.userData.shared = true;

export const FIRE_COLORS = [0xffffff, 0xffd23f, 0xff8c1a, 0xff3b1a];
export const rnd = (range) => (Math.random() - 0.5) * 2 * range;

export const makeParticles = (MAX, material, parent) => {
  const FIELDS = 12; // x y z vx vy vz life maxLife size grow gravity floor
  const data = new Float32Array(MAX * FIELDS);
  const mesh = new THREE.InstancedMesh(unitBox, material, MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  for (let i = 0; i < MAX; i++) mesh.setColorAt(i, color);
  const M = mesh.instanceMatrix.array, C = mesh.instanceColor.array;
  M.fill(0); // zero scale = hidden
  parent.add(mesh);
  let next = 0;

  // floor = the height of the road where it was emitted: falling particles land on it
  const emit = (x, y, z, vx, vy, vz, life, size, grow, gravity, hex, floor = 0) => {
    const i = next, o = i * FIELDS;
    next = (next + 1) % MAX;
    data[o] = x; data[o + 1] = y; data[o + 2] = z;
    data[o + 3] = vx; data[o + 4] = vy; data[o + 5] = vz;
    data[o + 6] = life; data[o + 7] = life;
    data[o + 8] = size; data[o + 9] = grow; data[o + 10] = gravity; data[o + 11] = floor;
    color.setHex(hex);
    C[i * 3] = color.r; C[i * 3 + 1] = color.g; C[i * 3 + 2] = color.b;
    mesh.instanceColor.needsUpdate = true;
  };

  const update = (dt) => {
    for (let i = 0; i < MAX; i++) {
      const o = i * FIELDS, m = i * 16;
      if (data[o + 6] <= 0) continue;
      data[o + 6] -= dt;
      if (data[o + 6] <= 0) { M[m] = M[m + 5] = M[m + 10] = 0; continue; }
      data[o + 4] -= data[o + 10] * dt;
      data[o] += data[o + 3] * dt;
      data[o + 1] += data[o + 4] * dt;
      data[o + 2] += data[o + 5] * dt;
      if (data[o + 1] < data[o + 11] + 0.1) { // debris lands and skids
        data[o + 1] = data[o + 11] + 0.1; data[o + 4] = 0;
        const skid = Math.pow(0.9, dt * 60); // (0.9 a 60th of a second, whatever the frame rate)
        data[o + 3] *= skid; data[o + 5] *= skid;
      }
      const t = 1 - data[o + 6] / data[o + 7];
      const scale = data[o + 8] * (1 + data[o + 9] * t) * Math.min(1, (1 - t) * 3);
      M[m] = M[m + 5] = M[m + 10] = scale;
      M[m + 12] = data[o]; M[m + 13] = data[o + 1]; M[m + 14] = data[o + 2]; M[m + 15] = 1;
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  // (live: how many are still burning; for a check or the preview)
  const live = () => { let n = 0; for (let i = 0; i < MAX; i++) if (data[i * FIELDS + 6] > 0) n++; return n; };

  return { emit, update, live, mesh };
};

// ---- the CLASSIC explosion and package trail, as they always were (render/effects.js explode() and render/packages.js's flame trail),
// written once over a set of pools { Fire, Smoke, Particles } so the game and the Cosmetics preview draw the same thing. The order of
// every Math.random() call is the old code's: the game's explosions are what they were, particle for particle (scripts/.killfx-check.mjs).
// x, y, z: the spot on the road (y its height); vx, vz: the speed it carries; e: the queued event ({ big, scale, smoke })
export const classicExplode = (P, x, y, z, vx, vz, e) => {
  // (scale: a bigger blast, the tank's shell; smoke: how much smoke, if not the usual)
  const k = (e.big ? 1.5 : 1) * (e.scale || 1);
  const ks = (e.big ? 1.5 : 1) * (e.smoke ?? 1);
  for (let i = 0; i < 35 * k; i++) { // fireball
    P.Fire.emit(x + rnd(1), y + 0.5 + Math.random() * 1.2, z + rnd(1),
      vx + rnd(6), 2 + Math.random() * 8, vz + rnd(6),
      0.4 + Math.random() * 0.6, (0.5 + Math.random() * 0.7) * k, 1.2, 8,
      FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
  }
  for (let i = 0; i < 7 * ks; i++) { // smoke column
    const grey = 20 + Math.floor(Math.random() * 50);
    P.Smoke.emit(x + rnd(2), y + 1 + Math.random() * 2, z + rnd(2),
      vx * 0.5 + rnd(3), 3 + Math.random() * 6, vz * 0.5 + rnd(3),
      1.2 + Math.random() * 1.3, (0.8 + Math.random() * 0.8) * ks, 1.5, 0,
      grey << 16 | grey << 8 | grey);
  }
  // glowing debris (no dark bits: the only dark things flying out are the tyres, which stand out for it)
  for (let i = 0; i < 7 * k; i++) {
    P.Particles.emit(x + rnd(1), y + 0.8, z + rnd(1),
      vx * 1.5 + rnd(10), 5 + Math.random() * 9, vz * 1.5 + rnd(10),
      1.5 + Math.random(), 0.25 + Math.random() * 0.5, 0, 25, 0xff8c1a, y);
  }
};
// the flame trail behind a flying package (x, y, z: the package; y its height in the air), two a frame
export const classicTrail = (P, x, y, z) => {
  for (let n = 0; n < 2; n++) { // flame trail
    P.Particles.emit(x + rnd(0.2), y + rnd(0.2), z + rnd(0.2),
      rnd(1), 1 + Math.random() * 2, rnd(1), 0.3, 0.55, 0.4, 0,
      FIRE_COLORS[1 + Math.floor(Math.random() * 3)]);
  }
};
// the small fire puff where a package lands (render/effects.js burst), x, y, z: the spot on the road
export const classicBurst = (P, x, y, z, vx, vz) => {
  for (let i = 0; i < 18; i++) {
    P.Particles.emit(x + rnd(0.5), y + 0.8 + Math.random(), z + rnd(0.5),
      vx + rnd(5), 1 + Math.random() * 6, vz + rnd(5),
      0.3 + Math.random() * 0.4, 0.5 + Math.random() * 0.6, 1, 6,
      FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
  }
};
