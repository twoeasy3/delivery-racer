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
// kit find wheels that way) and its alloy, two meshes of its own. Small textures (the Junker's rust and its tarpaulin's
// weave) are drawn in code once, 64 px, and shared. State-free: nothing here knows about the game.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---- materials shared by every copy (clearGroup keeps a material, geometry or map marked shared) ------------------
const keep = (thing) => { thing.userData.shared = true; return thing; };
const lambert = (color, more) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, ...more });
const basic = (color) => keep(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
const MAT = {
  glass: keep(lambert(0x232a35)), dark: keep(lambert(0x1d1f24)), trim: keep(lambert(0x2f3238)), chrome: keep(lambert(0xd4d6d8)),
  alloy: keep(lambert(0xc3c7cc)), tyre: keep(lambert(0x151515)), white: keep(lambert(0xeeeeea)), steel: keep(lambert(0x8d9096)),
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
// a flat plate of the outline `pts` ([x, y] round it), `t` thick, facing along the car, its back at z (for a grille, a
// mouth, a plate on the nose or the tail: dir 1 faces forward, -1 back)
const plate = (pts, t, z, dir = 1) => {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: t, bevelEnabled: false });
  if (dir < 0) geo.rotateY(Math.PI);
  return geo.translate(0, 0, z);
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
const CREASE = 0.7;
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
const loftBody = (BODY, AXLES, n, extra = [], around = [-0.47, -0.27, 0, 0.27, 0.47], arch = 0.07) => {
  const section = (z) => {
    let [wHigh, yb, yTop, y0, wLow] = along(BODY, z), yLip = yb - 0.1;
    for (const [za, R, width, outer] of AXLES) {
      const dz = Math.abs(z - za), Ra = R + arch;
      if (dz < Ra) {
        wLow = Math.min(wLow, outer - width - 0.02);
        yLip = R + Math.sqrt(Ra * Ra - dz * dz);
        yb = Math.max(yb, yLip + 0.08);
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
    const [belt, , crown] = along(KEYS, z), low = belt - 0.08;
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
// ---- the wheels: a tyre (its own CylinderGeometry, turned on its side by the mesh) and its alloy, each a mesh
const tyreGeo = (R, width) => cached('tyre' + [R, width], () => ({ geo: new THREE.CylinderGeometry(R, R, width, 16) })).geo;
// an alloy: a rim ring each side, `spokes` spokes across the hub, and a cap (one geometry, in one silver)
const alloyGeo = (R, width, spokes = 5, rim = 0.72) => cached('alloy' + [R, width, spokes, rim], () => {
  const r = R * rim, half = width / 2 + 0.006, parts = [];
  for (const s of [-1, 1]) {
    const ring = new THREE.RingGeometry(r * 0.82, r, 12, 1);
    ring.rotateY(s * Math.PI / 2);
    parts.push(ring.translate(s * half, 0, 0));
  }
  for (let i = 0; i < spokes; i++) parts.push(bx(width + 0.008, r * 0.2, r * 1.7, 0, 0, 0, i * Math.PI / spokes));
  parts.push(cyl(r * 0.26, width + 0.03, 0, 0, 0, 'x', 8));
  return { geo: mergeGeometries(parts.map(clean), false) };
}).geo;
const addWheel = (group, R, width, x, z, alloy, hubMat = MAT.alloy) => {
  const tyre = new THREE.Mesh(tyreGeo(R, width), MAT.tyre);
  tyre.rotation.z = Math.PI / 2;
  tyre.position.set(x, R, z);
  const hub = new THREE.Mesh(alloy, hubMat);
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

// ==== the Commuter: a modern small five-door hatchback (orange for a Good driver): a rounded body, a short nose
// sloping to a long raked windscreen, a big dark glasshouse with a split rear side window under a level roof, an
// upright hatch with a lip spoiler; swept headlamps, a dark mouth with a fog lamp, vents in the bonnet, silver alloys
const commuterParts = (car) => {
  const L = car.hl, R = 0.3, AX = 0.31 * car.hl * 2, TX = car.hw - 0.04, TW = 0.26;
  const P = bag();
  // ---- the body
  const BODY = [
    [-L - 0.03, 0.64, 0.74, 0.86, 0.3, 0.6],
    [-L + 0.01, 0.8, 0.79, 0.92, 0.25, 0.76],
    [-L + 0.08, 0.87, 0.82, 0.95, 0.22, 0.85],
    [-L + 0.26, 0.9, 0.84, 0.97, 0.2, 0.88],
    [-0.4, 0.91, 0.81, 0.95, 0.19, 0.89],
    [1.0, 0.91, 0.78, 0.92, 0.19, 0.89],
    [L - 0.26, 0.9, 0.62, 0.76, 0.19, 0.88],
    [L - 0.08, 0.87, 0.57, 0.7, 0.2, 0.85],
    [L + 0.0, 0.82, 0.52, 0.63, 0.21, 0.79],
    [L + 0.03, 0.7, 0.46, 0.56, 0.24, 0.67],
  ];
  const AXLES = [[AX, R, TW, TX + TW / 2], [-AX, R, TW, TX + TW / 2]];
  const { geo, section, topY, patch } = loftBody(BODY, AXLES, 3, [L - 0.2, -L + 0.2]);
  P.add('paint', geo);
  // a lamp's outline on the flat end of the nose or the tail (at z): from x0 to x1 out, from y0 up to just under the
  // end's own rounded top (by gap)
  const faceOutline = (z, side, x0, x1, y0, gap) => {
    const top = [0, 1, 2, 3].map(i => x0 + (x1 - x0) * i / 3).map(x => [side * x, topY(z, x) - gap]);
    return side > 0 ? [[x0, y0], [x1, y0], ...top.reverse()] : [[-x1, y0], [-x0, y0], ...top].map(([x, y]) => [x, y]);
  };
  // ---- the glasshouse: its sides lean in from 0.8 m out at the belt to 0.62 m at the roof
  const xAt = (y) => 0.8 - (y - 0.88) * 0.34;
  const beltAt = (z) => topY(z, xAt(0.9)) + 0.005;
  const zs = [1.0, 0.15, -0.35, -1.2, -1.5, -L + 0.06];
  const KEYS = zs.map((z, i) => {
    const b = beltAt(z);
    return [z, b, [b + 0.005, 1.36, 1.38, 1.32, 1.2, b + 0.02][i], [b + 0.01, 1.43, 1.47, 1.42, 1.29, b + 0.05][i]];
  }).sort((a, b) => a[0] - b[0]);
  const { glass, skin } = glasshouse(KEYS, xAt, 0.15, -1.5);
  P.add('glass', glass);
  P.add('paint', skin);
  // the window frames: the side, round the windows (a door window, a split rear door and quarter window), in the
  // paint, and a black B pillar
  const edge = (z) => along(KEYS, z)[1], belt = (z) => along(KEYS, z)[0];
  for (const side of [-1, 1]) {
    const outline = [[1.0, belt(1.0) - 0.06], [0.15, edge(0.15)], [-0.35, edge(-0.35)], [-1.2, edge(-1.2)], [-1.5, edge(-1.5)],
      [-L + 0.06, belt(-L + 0.06) - 0.06]];
    const top = (z) => edge(z) - 0.05, sill = (z) => belt(z) + 0.035;
    const front = [[0.86, sill(0.86)], [0.16, top(0.16)], [-0.4, top(-0.4)], [-0.4, sill(-0.4)]];
    const bPillar = [[-0.4, sill(-0.4) - 0.02], [-0.4, top(-0.4)], [-0.52, top(-0.52)], [-0.52, sill(-0.52) - 0.02]];
    const rear = [[-0.52, sill(-0.52)], [-0.52, top(-0.52)], [-0.98, top(-0.98)], [-0.98, sill(-0.98)]];
    const quarter = [[-1.04, sill(-1.04)], [-1.04, top(-1.04)], [-1.22, top(-1.22)], [-1.4, sill(-1.4) + 0.06], [-1.4, sill(-1.4)]];
    P.add('paint', sidePanel(xAt, side, outline, [front, bPillar, rear, quarter]));
    P.add('dark', sidePanel(xAt, side, bPillar));
    // the door mirror: an arm out from the window's foot to a housing in the paint
    P.add('dark', bx(0.14, 0.05, 0.08, side * (xAt(0.97) + 0.06), 0.97, 0.88));
    P.add('paint', bx(0.1, 0.12, 0.17, side * (xAt(0.97) + 0.15), 1.02, 0.86, 0, side * 0.12));
    P.add('dark', bx(0.012, 0.09, 0.14, side * (xAt(0.97) + 0.15), 1.02, 0.78, 0, side * 0.12)); // (the glass, behind it)
    // ---- the body side: shut lines of two doors, handles, a black sill between the arches
    const sx = (z, y) => { const s = section(z); return y > s.yLip ? s.wHigh : s.wLow; };
    for (const [z, y0, y1] of [[0.74, 0.34, 0.82], [-0.46, 0.3, 0.86], [-0.84, 0.66, 0.88]]) {
      const x = Math.max(sx(z, y0 + 0.02), sx(z, y1 - 0.08)) + 0.004;
      P.add('dark', bx(0.012, y1 - y0, 0.014, side * x, (y0 + y1) / 2, z));
    }
    for (const z of [0.14, -0.86]) P.add('dark', bx(0.03, 0.035, 0.14, side * (section(z).wLow + 0.012), 0.8, z));
    P.add('dark', bx(0.04, 0.1, 2 * AX - 2 * (R + 0.1), side * (section(0).wLow - 0.005), 0.25, 0));
    // ---- the nose: a headlamp swept back round each corner (on the body's own curve), an indicator behind it, a
    // fog lamp low in the mouth
    P.add('lamp', patch(L - 0.2, L + 0.03, 3, 5, 0.01, side));
    P.add('lamp', plate(faceOutline(L + 0.03, side, 0.3, 0.66, 0.42, 0.015), 0.02, L + 0.03));
    P.add('dark', plate(faceOutline(L + 0.03, side, 0.27, 0.69, 0.4, 0.004), 0.012, L + 0.03));
    P.add('amber', bx(0.02, 0.05, 0.1, side * (section(L - 0.33).wHigh + 0.004), section(L - 0.33).yb - 0.04, L - 0.33));
    P.add(side < 0 ? 'lamp' : 'dark', cyl(0.05, 0.03, side * 0.48, 0.33, L + 0.04, 'z', 10));
    // the bonnet's vents: three slats a side
    for (let i = 0; i < 3; i++) {
      const z = 1.36 - i * 0.075, x = side * 0.42, y = topY(z, 0.42), slope = Math.atan2(topY(z + 0.1, 0.42) - topY(z - 0.1, 0.42), 0.2);
      P.add('dark', bx(0.26, 0.012, 0.035, x, y + 0.002, z, -slope, -side * 0.12));
    }
    // ---- the tail: lamps wrapped round the corners (a tail lamp over a brake lamp), an indicator and a reversing
    // lamp on the tail's face
    P.add('tail', patch(-L - 0.03, -L + 0.2, 3, 5, 0.01, side));
    P.add('brake', patch(-L - 0.03, -L + 0.2, 2, 3, 0.01, side));
    P.add('tail', plate(faceOutline(-L - 0.03, side, 0.38, 0.62, 0.77, 0.015), 0.02, -L - 0.03, -1));
    P.add('dark', plate(faceOutline(-L - 0.03, side, 0.35, 0.635, 0.68, 0.004), 0.012, -L - 0.03, -1));
    P.add('reverse', bx(0.13, 0.05, 0.02, side * 0.42, 0.715, -L - 0.04));
    P.add('amber', bx(0.09, 0.05, 0.02, side * 0.56, 0.715, -L - 0.04));
  }
  // ---- the nose's middle: the dark mouth, a slot over it, the plate, and the chin under it
  P.add('dark', plate(roundRect(1.0, 0.25, 0, 0.35, 0.1), 0.045, L));
  P.add('dark', bx(0.56, 0.05, 0.04, 0, 0.5, L + 0.025));
  P.add('white', bx(0.4, 0.1, 0.02, 0, 0.35, L + 0.05));
  P.add('dark', bx(1.3, 0.1, 0.06, 0, 0.21, L + 0.01));
  // ---- the tail's middle: the hatch's lip spoiler and its brake lamp, the plate, the bumper's black foot, a pipe
  P.add('paint', bx(1.0, 0.05, 0.14, 0, 1.25, -1.56, 0.3));
  P.add('brake', bx(0.3, 0.035, 0.03, 0, 1.24, -1.632, 0.3));
  P.add('white', bx(0.44, 0.11, 0.03, 0, 0.6, -L - 0.035));
  P.add('dark', plate(roundRect(1.4, 0.13, 0, 0.32, 0.05), 0.065, -L + 0.02, -1));
  P.add('chrome', cyl(0.035, 0.24, -0.42, 0.3, -L - 0.03, 'z', 8));
  return P.merge();
};
const commuter = (car) => {
  const group = new THREE.Group();
  const paint = lambert(car.color);
  const geos = cached('commuter' + [car.hw, car.hl, car.height], () => commuterParts(car));
  const body = assemble(group, geos, paint);
  const AX = 0.31 * car.hl * 2, alloy = alloyGeo(0.3, 0.26, 5);
  for (const side of [-1, 1]) for (const z of [AX, -AX]) addWheel(group, 0.3, 0.26, side * (car.hw - 0.04), z, alloy);
  group.userData = { body, animate: () => {} };
  return group;
};

export const ORIGINAL_MODELS = { commuter };
