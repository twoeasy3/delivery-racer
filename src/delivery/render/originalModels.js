// ---- the original cars' models: the Commuter, the Junker and the Darkvan -----------------------------------------
// The first three cars of the game (cars.js tier 1), rebuilt (the owner, 13-Oct: "bring the original models up to an
// acceptable quality") after the owner's own older version of the game's 'Pick a car!' screen: an orange hatchback, a
// rusty junk pickup under a roped-down tarpaulin, and a dark 80s panel van with a red stripe. models.js puts these
// builders into MODELS by name (the cars' `model`); each takes the car's entry (hw, hl, height, color) and returns a
// group, front facing local +z, with userData.body (the mesh whose material is the paint: every part in the paint is
// merged into it, so a livery, a traffic paint, the dents and the scorch all take the whole car), userData.animate
// (seconds) => void and, where the Good and Evil cars differ beyond the paint, userData.livery (evil) => void.
// How they are built (as the newer idea cars are: render/ideaModels9.js): the body is lofted through cross-sections
// (loftBody: its sides cut back round the wheel arches), the glasshouse is a second loft whose sides lie on one leaning
// plane, and the window frames and pillars are flat panels on that plane with the windows cut out of them (sidePanel).
// Every part that never moves is merged into one mesh per material; those geometries are made once for each size of
// car and shared by every copy (traffic draws many of these), and the paint and the livery-coloured parts are the only
// materials of a car's own. Each wheel is a tyre (a CylinderGeometry turned on its side: the suspension and the Super
// kit find wheels that way) and a plain hub, two meshes of its own. Small textures (the Junker's rust and its tarpaulin's
// weave) are drawn in code once, 64 px, and shared. State-free: nothing here knows about the game.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---- materials shared by every copy (clearGroup keeps a material, geometry or map marked shared) ------------------
const keep = (thing) => { thing.userData.shared = true; return thing; };
const lambert = (color, more) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, ...more });
const basic = (color) => keep(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
const MAT = {
  glass: keep(lambert(0x232a35)), dark: keep(lambert(0x1d1f24)), trim: keep(lambert(0x2f3238)), chrome: keep(lambert(0xd4d6d8)),
  alloy: keep(lambert(0xd3d7dc)), tyre: keep(lambert(0x151515)), white: keep(lambert(0xeeeeea)), steel: keep(lambert(0x8d9096)),
  lamp: basic(0xfff3c4), tail: basic(0xff2a2a), brake: basic(0xb3101a), amber: basic(0xffa31a), reverse: basic(0xf4f4f0),
};

// ---- geometry: made once per car size and shared ------------------------------------------------------------------
const CACHE = new Map();
const cached = (key, make) => {
  if (!CACHE.has(key)) {
    const made = make();
    for (const geo of Object.values(made)) if (geo?.isBufferGeometry) keep(geo);
    CACHE.set(key, made);
  }
  return CACHE.get(key);
};
// parts to be merged, by material name: each a geometry already in its place
const bag = () => {
  const parts = {};
  const add = (name, geo) => { (parts[name] ||= []).push(geo); return geo; };
  const merge = () => Object.fromEntries(Object.entries(parts).map(([name, geos]) => [name, mergeGeometries(geos.map(clean), false)]));
  return { add, merge };
};
// (every part as a plain triangle list with a position and a normal, and a uv only for a textured one: so they merge)
const TEXTURED = new Set();
const clean = (geo) => {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!TEXTURED.has(geo) && g.attributes.uv) { if (g === geo) g = g.clone(); g.deleteAttribute('uv'); }
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  return g;
};
const textured = (geo) => { TEXTURED.add(geo); return geo; };
// a box, turned (pitch about x, then yaw about y, roll about z first) and put in its place
const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a cylinder along an axis ('x' across the car, 'y' upright, 'z' along it)
const cyl = (r, length, x, y, z, axis = 'y', seg = 10, r2 = r, open = false) => {
  const geo = new THREE.CylinderGeometry(r, r2, length, seg, 1, open);
  if (axis === 'x') geo.rotateZ(-Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return geo.translate(x, y, z);
};
// a rounded rectangle's outline, w by h, its middle at (x, y), corners of r
const roundRect = (w, h, x, y, r, seg = 2) => {
  const pts = [];
  for (const [cx, cy, a0] of [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]]) {
    for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2; pts.push([x + cx + r * Math.cos(a), y + cy + r * Math.sin(a)]); }
  }
  return pts;
};

// ---- lofts ----------------------------------------------------------------------------------------------------------
// a surface through cross-sections along the car: `rings` is a list of [z, points], each points a closed loop of
// [x, y] (as many in every ring, in the same order); both ends closed with a fan to their middle unless caps is false.
// With uv, its uv runs round each ring (metres) and along the car (metres): for a texture
const loft = (rings, caps = true, uv = false) => {
  const n = rings[0][1].length, pos = [], idx = [], uvs = [];
  for (const [z, pts] of rings) {
    let run = 0;
    pts.forEach(([x, y], i) => {
      pos.push(x, y, z);
      if (i) run += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
      uvs.push(run, z);
    });
  }
  for (let r = 0; r + 1 < rings.length; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + (i + 1) % n, c = (r + 1) * n + i, d = (r + 1) * n + (i + 1) % n;
      idx.push(a, b, d, a, d, c);
    }
  }
  for (const r of caps ? [0, rings.length - 1] : []) {
    const [z, pts] = rings[r], mid = pos.length / 3;
    pos.push(pts.reduce((t, p) => t + p[0], 0) / n, pts.reduce((t, p) => t + p[1], 0) / n, z);
    uvs.push(0, z);
    for (let i = 0; i < n; i++) idx.push(mid, r * n + i, r * n + (i + 1) % n);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  const out = toCreasedNormals(geo, CREASE); // (smooth round a curve, sharp at a crease: an arch's edge, a sill)
  geo.dispose();
  return uv ? textured(out) : out;
};
const CREASE = 0.6;
// linear interpolation through keys [z, ...values] (sorted by z) at z
const along = (keys, z) => {
  if (z <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const [z1, ...b] = keys[i], [z0, ...a] = keys[i - 1];
    if (z <= z1) { const t = (z - z0) / (z1 - z0); return a.map((v, j) => v + (b[j] - v) * t); }
  }
  return keys[keys.length - 1].slice(1);
};
// ---- a lofted car body: cross-sections along the car, each a rounded shoulder over a side that is cut back under
// the arches to clear the wheels (after render/ideaModels9.js loftBody).
//   BODY   [z, half width at its widest, the height of that, the height of the deck on the middle, the floor, the
//          sill's half width] (sorted by z)
//   AXLES  [z, wheel radius, tyre width, the tyre's outer face]
//   n      how square the shoulders are (2 round, more squarer)
// Returns its geometry, and sideX(z, y) / topY(z, x): where its side and its top are, for parts to sit on them.
const superTop = (w, yb, yTop, t, n) => [w * Math.pow(Math.abs(Math.cos(t)), 2 / n), yb + (yTop - yb) * Math.pow(Math.max(0, Math.sin(t)), 2 / n)];
const SHOULDER = [0, 1, 2, 3].map(i => i * Math.PI / 8);
const loftBody = (BODY, AXLES, n, extra = [], { around = [-0.47, -0.27, 0, 0.27, 0.47], arch = 0.07, archLift = 0.08 } = {}) => {
  const section = (z) => {
    let [wHigh, yb, yTop, y0, wLow] = along(BODY, z), yLip = yb - 0.1;
    for (const [za, R, width, outer] of AXLES) {
      const dz = Math.abs(z - za), Ra = R + arch;
      if (dz < Ra) {
        wLow = Math.min(wLow, outer - width - 0.02);
        yLip = R + Math.sqrt(Ra * Ra - dz * dz);
        yb = Math.max(yb, yLip + archLift);
      }
    }
    return { wHigh, yb, yTop, y0, wLow, yLip };
  };
  // (the +x half of a ring, from the floor up to the top's middle: RING_SIDE points, then the mirror image)
  const half = (z) => {
    const { wHigh, yb, yTop, y0, wLow, yLip } = section(z);
    return [[wLow - 0.06, y0], [wLow, Math.max(y0 + 0.07, yLip - 0.02)], [wHigh - 0.01, yLip], [wHigh, yb - 0.05],
      ...SHOULDER.map(t => superTop(wHigh, yb, yTop, t, n))];
  };
  const ring = (z) => { const side = half(z); return [[0, section(z).y0], ...side, [0, section(z).yTop], ...side.slice().reverse().map(([x, y]) => [-x, y])]; };
  const zs = new Set([...BODY.map(k => k[0]), ...extra]);
  for (const [za, R] of AXLES) {
    for (const dz of around) zs.add(Math.round((za + dz * (R + arch - 0.001) / 0.47) * 1000) / 1000);
    for (const s of [-1, 1]) zs.add(Math.round((za + s * (R + arch + 0.012)) * 1000) / 1000); // (the arch's edge: a step)
  }
  const stations = [...zs].filter(z => z >= BODY[0][0] && z <= BODY[BODY.length - 1][0]).sort((a, b) => a - b);
  const geo = loft(stations.map(z => [z, ring(z)]));
  const topY = (z, x) => {
    const { wHigh, yb, yTop } = section(z);
    const c = Math.pow(Math.min(1, Math.abs(x) / wHigh), n / 2);
    return yb + (yTop - yb) * Math.pow(Math.sqrt(Math.max(0, 1 - c * c)), 2 / n);
  };
  // a patch of the body's own surface, `lift` proud of it along its normal (a lamp that follows the curve): over the
  // stations from z0 to z1 (give the body a station at each of its ends: `extra`), and round the side from ring point
  // i0 to i1 (2 the arch's lip, 3 the side, 4 the shoulder's foot, 5 to 7 round it). Its triangles are the
  // body's own, moved out, so it never dips into the body between stations
  const grid = stations.map(half);
  const patch = (z0, z1, i0, i1, lift = 0.01, side = 1) => {
    const rows = stations.map((z, r) => r).filter(r => stations[r] >= z0 - 1e-6 && stations[r] <= z1 + 1e-6);
    const P = (r, i) => new THREE.Vector3(grid[r][i][0], grid[r][i][1], stations[r]);
    const pos = [], idx = [];
    for (const r of rows) {
      for (let i = i0; i <= i1; i++) {
        const up = P(r, Math.min(i + 1, grid[r].length - 1)).sub(P(r, Math.max(i - 1, 0)));
        const fwd = P(Math.min(r + 1, stations.length - 1), i).sub(P(Math.max(r - 1, 0), i));
        const normal = up.cross(fwd).normalize();
        const p = P(r, i).addScaledVector(normal, lift);
        pos.push(side * p.x, p.y, p.z);
      }
    }
    const nv = i1 - i0 + 1;
    for (let k = 0; k + 1 < rows.length; k++) {
      for (let j = 0; j + 1 < nv; j++) {
        const a = k * nv + j, b = a + 1, c = a + nv, d = c + 1;
        idx.push(a, b, d, a, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  return { geo, section, topY, patch, stations };
};
// ---- the glasshouse: a loft whose sides lie on ONE plane leaning in (x = xAt(y)), from the belt (sunk into the
// body) up to the edge of the roof, and a crown over it to the roof's middle. KEYS [z, belt, edge, crown] (sorted
// by z): a station where edge and crown come down to the belt is where a windscreen or a hatch meets the body. Returns
// the glass, the roof's skin (over the stations from roofFrom to roofTo: in the paint), and the plane, for sidePanel
const glasshouse = (KEYS, xAt, roofFrom, roofTo, n = 3) => {
  const CROWN = [1, 2, 3].map(i => i * Math.PI / 8);
  const half = (z, lift) => {
    const [, edge, crown] = along(KEYS, z), xe = xAt(edge) + lift;
    return [[xe, edge + lift], ...CROWN.map(t => superTop(xe, edge + lift, crown + lift, t, n))];
  };
  const mirror = (side) => side.slice().reverse().map(([x, y]) => [-x, y]);
  const ring = (z) => {
    const [belt, , crown] = along(KEYS, z), low = belt - 0.025;
    const side = [[xAt(low), low], ...half(z, 0)];
    return [[0, low], ...side, [0, crown], ...mirror(side)];
  };
  const zs = KEYS.map(k => k[0]);
  const glass = loft(zs.map(z => [z, ring(z)]));
  // the roof's skin: only its crown (edge to edge over the top), a little proud of the glass
  const skinRing = (z) => { const side = half(z, 0.012); return [...side, [0, along(KEYS, z)[2] + 0.012], ...mirror(side)]; };
  const skin = loft(zs.filter(z => z >= roofTo && z <= roofFrom).map(z => [z, skinRing(z)]));
  return { glass, skin };
};
// ---- a flat panel on the glasshouse's leaning side: its side view `outline` ([z, y] round it) with the windows
// (`holes`, the same) cut out, `t` thick, `off` proud of the glass, on the side `side` (1: +x, -1: -x)
const sidePanel = (xAt, side, outline, holes = [], off = 0.006, t = 0.012) => {
  const shape = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
  for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([z, y]) => new THREE.Vector2(z, y))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 4 });
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getX(i), y = p.getY(i), d = p.getZ(i);
    p.setXYZ(i, side * (xAt(y) + off + d), y, z);
  }
  geo.deleteAttribute('normal');
  geo.computeVertexNormals();
  return geo;
};
// ---- the wheels: a tyre (its own CylinderGeometry, turned on its side by the mesh) and its hub, each a mesh
const tyreGeo = (R, width) => cached('tyre' + [R, width], () => ({ geo: new THREE.CylinderGeometry(R, R, width, 16) })).geo;
// a hub: a plain light disc a little proud of the tyre each side, as the rest of the roster's wheels (models.js wheel)
const hubGeo = (R, width, rim = 0.58) => cached('hub' + [R, width, rim], () => ({ geo: cyl(R * rim, width + 0.04, 0, 0, 0, 'x', 12) })).geo;
const addWheel = (group, R, width, x, z, hubGeometry, hubMat = MAT.alloy) => {
  const tyre = new THREE.Mesh(tyreGeo(R, width), MAT.tyre);
  tyre.rotation.z = Math.PI / 2;
  tyre.position.set(x, R, z);
  const hub = new THREE.Mesh(hubGeometry, hubMat);
  hub.position.set(x, R, z);
  group.add(tyre, hub);
  return [tyre, hub];
};
// the meshes of a model: one for each material's merged parts; the paint's (a material of the car's own) is the body
const assemble = (group, geos, paint, own = {}) => {
  let body = null;
  for (const [name, geo] of Object.entries(geos)) {
    if (!geo?.isBufferGeometry) continue;
    const mesh = new THREE.Mesh(geo, name === 'paint' ? paint : own[name] || MAT[name]);
    group.add(mesh);
    if (name === 'paint') body = mesh;
    own[name + 'Mesh'] = mesh;
  }
  return body;
};

// a rounded lump: a ball squashed to rx, ry, rz, at (x, y, z) (a lamp half sunk in a rounded body reads as one shape)
const blob = (rx, ry, rz, x, y, z, w = 10, h = 6, yaw = 0, pitch = 0) => {
  const geo = new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a bumper: a slab whose plan is a rounded rectangle (w across, l along, corners of r), `h` tall from y, its middle at z
const pod = (w, l, r, h, y, z) => {
  const pts = roundRect(w, l, 0, 0, r, 3);
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, zz]) => new THREE.Vector2(x, zz))), { depth: h, bevelEnabled: false });
  geo.rotateX(Math.PI / 2); // (the plan's y along -z... turned so the slab lies flat, its top at y + h)
  return geo.translate(0, y + h, z);
};

// ==== the Commuter: a little five-door city hatchback after a Nissan March / Micra K12, orange for a Good driver (the
// owner's reference): round, tall and short; one smooth body, its high, bulbous bonnet sweeping up into a big raked
// windscreen; a short blunt nose with big almond headlamps wrapped round into the wings, a small oval grille over a
// wider one in the bumper; a tall glasshouse under a curved roof that drops to a short hatch; fat arches, silver
// hubcaps; the paint shaded darker low down, a black sill. No panel lines: the shape is what makes it
const commuterParts = (car) => {
  const L = car.hl, R = 0.3, AX = 0.31 * car.hl * 2, TX = car.hw - 0.04, TW = 0.26;
  const P = bag();
  // ---- the body: round shoulders, its ends rounded off in plan and in profile, the bonnet high and full
  const BODY = [
    [-L - 0.02, 0.64, 0.52, 0.86, 0.32, 0.635],
    [-L + 0.06, 0.82, 0.56, 0.92, 0.24, 0.815],
    [-L + 0.2, 0.9, 0.58, 0.94, 0.2, 0.895],
    [-L + 0.4, 0.92, 0.58, 0.95, 0.19, 0.915],
    [1.1, 0.92, 0.58, 0.97, 0.19, 0.915],
    [L - 0.4, 0.91, 0.52, 0.9, 0.19, 0.905],
    [L - 0.2, 0.88, 0.48, 0.85, 0.2, 0.875],
    [L - 0.06, 0.81, 0.42, 0.8, 0.24, 0.805],
    [L + 0.02, 0.66, 0.36, 0.74, 0.3, 0.655],
  ];
  const AXLES = [[AX, R, TW, TX + TW / 2], [-AX, R, TW, TX + TW / 2]];
  const { geo, topY } = loftBody(BODY, AXLES, 2.8, [], { around: [-0.47, -0.24, 0, 0.24, 0.47], archLift: 0.03 });
  P.add('paint', geo);
  // ---- the glasshouse: tall, its sides leaning in a little, the windscreen carrying on the bonnet's sweep, the roof
  // crowned and curving down to the hatch
  const xAt = (y) => 0.8 - (y - 0.92) * 0.32;
  const beltAt = (z) => { let y = 0.9; for (let i = 0; i < 8; i++) y = topY(z, xAt(y)); return y + 0.004; }; // (where the body meets the glass's plane)
  const KEYS = [[1.12, 0, 0.005, 0.01], [0.3, 0, 1.35, 1.45], [-0.4, 0, 1.37, 1.47], [-1.05, 0, 1.3, 1.4], [-1.45, 0, 1.12, 1.21],
    [-L + 0.22, 0, 0.02, 0.05]].map(([z, , e, c]) => { const b = beltAt(z); return [z, b, e > 0.5 ? e : b + e, c > 0.5 ? c : b + c]; })
    .sort((a, b) => a[0] - b[0]);
  const { glass, skin } = glasshouse(KEYS, xAt, 0.3, -1.45, 2.5);
  P.add('glass', glass);
  P.add('paint', skin);
  // the side round the windows, in the paint (a front door window, a rear one, a tidy quarter light), a black B pillar
  const edge = (z) => along(KEYS, z)[1], belt = (z) => along(KEYS, z)[0];
  for (const side of [-1, 1]) {
    const outline = [[1.12, belt(1.12) - 0.01], [0.3, edge(0.3)], [-0.4, edge(-0.4)], [-1.05, edge(-1.05)], [-1.45, edge(-1.45)],
      [-L + 0.22, belt(-L + 0.22) - 0.01]];
    const top = (z) => edge(z) - 0.06, sill = (z) => belt(z) + 0.04;
    const front = [[0.98, sill(0.98)], [0.34, top(0.34)], [-0.34, top(-0.34)], [-0.34, sill(-0.34)]];
    const bPillar = [[-0.34, sill(-0.34) - 0.045], [-0.34, top(-0.34)], [-0.48, top(-0.48)], [-0.48, sill(-0.48) - 0.045]];
    const rear = [[-0.48, sill(-0.48)], [-0.48, top(-0.48)], [-0.98, top(-0.98)], [-0.98, sill(-0.98)]];
    const quarter = [[-1.06, sill(-1.06)], [-1.06, top(-1.06)], [-1.1, top(-1.1)], [-1.33, sill(-1.33) + 0.05], [-1.33, sill(-1.33)]];
    P.add('paint', sidePanel(xAt, side, outline, [front, bPillar, rear, quarter]));
    P.add('dark', sidePanel(xAt, side, bPillar));
    P.add('paint', blob(0.05, 0.07, 0.1, side * (xAt(1.0) + 0.1), 1.0, 0.98, 8, 5));   // a rounded mirror on its stalk
    P.add('paint', bx(0.1, 0.035, 0.05, side * (xAt(1.0) + 0.04), 0.98, 1.0));
    // ---- big almond headlamps, sunk in the nose's corners and sweeping back up into the wings
    P.add('lamp', blob(0.25, 0.1, 0.2, side * 0.58, 0.74, L - 0.17, 8, 6, side * 0.55, 0.3));
    // tall tail lamps beside the hatch, a brake lamp under each
    P.add('tail', blob(0.1, 0.19, 0.1, side * 0.55, 0.84, -L + 0.12, 8, 5));
    P.add('brake', blob(0.08, 0.06, 0.07, side * 0.55, 0.65, -L + 0.08, 6, 4));
    // a black sill between the arches
    P.add('dark', bx(0.05, 0.1, 2 * AX - 0.86, side * 0.87, 0.24, 0));
  }
  // ---- the face: a small oval grille up by the badge, a wider one low in the bumper with the plate on it
  P.add('dark', blob(0.15, 0.05, 0.06, 0, 0.66, L - 0.0, 10, 5));
  P.add('dark', blob(0.42, 0.085, 0.08, 0, 0.41, L - 0.0, 12, 5));
  P.add('white', bx(0.3, 0.08, 0.03, 0, 0.41, L + 0.065));
  // ---- the tail: the plate, a high brake lamp, a black lip under each end
  P.add('white', bx(0.38, 0.1, 0.03, 0, 0.6, -L - 0.03));
  P.add('brake', bx(0.28, 0.04, 0.06, 0, 1.21, -1.44, 0.5));
  P.add('dark', pod(1.5, 0.26, 0.12, 0.08, 0.2, L - 0.1));
  P.add('dark', pod(1.5, 0.26, 0.12, 0.08, 0.22, -L + 0.1));
  const merged = P.merge();
  // (the paint shaded darker and redder low down: a colour on each vertex, which the paint's own colour multiplies)
  const pos = merged.paint.attributes.position, shade = [];
  for (let i = 0; i < pos.count; i++) {
    const k = Math.min(1, Math.max(0, (pos.getY(i) - 0.22) / 0.6));
    shade.push(0.84 + 0.16 * k, 0.62 + 0.38 * k, 0.58 + 0.42 * k);
  }
  merged.paint.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  return merged;
};

const commuter = (car) => {
  const group = new THREE.Group();
  const paint = lambert(car.color, { vertexColors: true });
  const geos = cached('commuter' + [car.hw, car.hl, car.height], () => commuterParts(car));
  const body = assemble(group, geos, paint);
  const AX = 0.31 * car.hl * 2, hub = hubGeo(0.3, 0.26, 0.6);
  for (const side of [-1, 1]) for (const z of [AX, -AX]) addWheel(group, 0.3, 0.26, side * (car.hw - 0.04), z, hub);
  group.userData = { body, animate: () => {} };
  return group;
};

export const ORIGINAL_MODELS = { commuter };
