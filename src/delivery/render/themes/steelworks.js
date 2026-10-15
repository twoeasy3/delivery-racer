// ---- THE STEELWORKS: a steel mill complex the road runs through, in the order the steel is made, by the level's zones
// (their `scenery`, themes.js `sets`): the STOCKYARD (ore, coal and limestone in long stockpiles, a stacker on its rail, a
// conveyor along the road and a conveyor bridge over it, coils under a portal crane), the FURNACES (blast furnaces with their
// stoves, downcomers and skip hoists, cast houses glowing at the doors, flare stacks, slag heaps with glowing pours, slag pots),
// the MELT SHOP (a furnace hall the road drives through: a level's tunnel, LIT by the theme, its ceiling 24 m up: converters
// in the side bays pouring into ladles, crane bridges overhead with a ladle on the hook, a glowing light along the foot of the
// kerb walls), the SIDINGS (rails beside the road, torpedo ladle cars, ingot and coil wagons, a shunter; cooling towers and
// slag heaps beyond), the ROLLING MILL (a long hall, 15 m: a roller table beside the road with a hot slab running down it,
// mill stands, roof lights, cranes with coils), and the COIL YARD (finished coils in rows, a despatch gantry over the road).
// Everywhere: a kerb barrier each side, lamp masts, pipe racks along the road and pipe bridges over it, chimneys with plumes,
// cooling towers with steam on the skyline. Glow is unlit colour and additive light (no real lights); at night it is all
// that shows. No people, anywhere: machines, signs and vehicles only.
// RULES: whatever stands in the driving area is an obstacle (the level's); everything here stays behind the kerb line, and
// what crosses over the road (pipe bridges, conveyor bridges, gantries, crane bridges in the halls) keeps its underside clear
// of the chase camera (CLEAR_OUT outside, CLEAR_IN in a hall: scripts/.steelworks-check.mjs measures both).
// COST: every box, tube, mound and glow is one instance of one InstancedMesh per kind of thing per CHUNK m of road (out of
// sight: culled); every long thing that follows the road (barriers, pipes, rails, conveyors, the halls' walls, roofs and
// runway girders) is continuous geometry built along the curve (no stepping round a bend), in a few merged sheets per chunk.
// Materials shared; one canvas texture for cladding (steelworksModels.js). Seeded from the level's id: the same every run.
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { heightOf } from '../tunnelshape.js';
import { everyFrame } from './sceneryClock.js';
import { SW, claddingTexture, signTexture } from './steelworksModels.js';

const CHUNK = 700;      // m of road in one mesh of a kind (out of sight: culled)
export const CLEAR_OUT = 13.5; // m over the road the underside of anything crossing it keeps, outdoors (the chase camera rides at 11)
export const CLEAR_IN = 9.5;   // ...and in a hall (the camera comes down to the theme's camHeight there: 7)
const BAY = { meltshop: 22, rollingmill: 14 }; // m from the kerb to a hall's outer wall
const SETS = ['stockyard', 'furnaces', 'meltshop', 'sidings', 'rollingmill', 'coilyard'];
// what the last build put out, for scripts/.steelworks-check.mjs: every mesh ({ kind, from, to, tris, instances }) and
// every instance or piece standing near the road ({ s, lat0, lat1, y0, y1, what }: its extent across the road and up)
export const STEELWORKS_BUILT = { meshes: [], near: [] };

export const steelworks = ({ theme, offRoads, levelGroup }) => {
  let seed = 7;
  for (const ch of (LEVEL.id || 'steel') + ':steel') seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const between = (a, b) => a + rand() * (b - a);
  const night = !!theme.night;
  const p = {}, q = {}, dummy = new THREE.Object3D(), colour = new THREE.Color(), target = new THREE.Vector3();
  dummy.rotation.order = 'YXZ';
  STEELWORKS_BUILT.meshes = [];
  STEELWORKS_BUILT.near = [];
  const START = Track.start, END = Track.end;
  const lo = (s) => Track.lo(s), hi = (s) => Track.hi(s);
  const off = (side, s, d) => side < 0 ? lo(s) - d : hi(s) + d; // d m beyond the road's edge on that side
  const chunkOf = (s) => Math.max(0, Math.floor((s - START) / CHUNK));
  const half = Math.max(...[0, Track.length / 2, Track.length].map(s => Math.max(hi(s), -lo(s))));
  // a big thing out in the land: standing clear of every stretch of the road (a winding level brings it round behind)
  const clearSpot = (s, lat, r) => { Track.toWorld(s, lat, p); return Track.mainDistance(p.x, p.z) > r + half + 3 && offRoads(p.x, p.z, r); };

  // ---- the zones: the level's own (its "zones" whose scenery is one of SETS); a level without them (another level in this
  // theme, ?theme=steelworks) has the outdoor ones end to end, 600 m each
  let zones = (LEVEL.zones || []).filter(z => SETS.includes(z.scenery)).map(z => ({ from: z.from, to: z.to, scenery: z.scenery })).sort((a, b) => a.from - b.from);
  if (!zones.length) { const cycle = ['stockyard', 'furnaces', 'sidings', 'coilyard']; zones = []; for (let s = START, k = 0; s < END; s += 600, k++) zones.push({ from: s, to: s + 600, scenery: cycle[k % 4] }); }
  zones[0].from = Math.min(zones[0].from, START); zones[zones.length - 1].to = Math.max(zones[zones.length - 1].to, END);
  const zoneAt = (s) => (zones.find(z => s >= z.from && s < z.to) || zones[s < zones[0].from ? 0 : zones.length - 1]).scenery;
  const tunnels = (LEVEL.tunnels || []).filter(t => !t.road);
  const hallAt = (s, pad = 0) => tunnels.find(t => s >= t.from - pad && s <= t.to + pad) || null;
  const within = (list, s, pad, a = 'from', b = 'to') => (list || []).some(x => !x.road && s >= x[a] - pad && s <= x[b] + pad);
  const crossingNear = (s, pad) => (LEVEL.crossings || []).some(c => !c.road && Math.abs(Track.place(c) - s) < pad);
  // the buildings that blow (a level's blasts): nothing of ours on their side of the road there
  const blasts = (LEVEL.wreckage || []).filter(e => e.kind === 'blast').map(e => ({ s: e.at, side: e.from === 'left' ? -1 : 1 }));
  const blastNear = (s, side, pad = 22) => blasts.some(b => Math.abs(b.s - s) < pad && (!side || b.side === side));
  // where nothing may stand beside the road: a hall (it has its own), a crossing's line, a blast's building
  const busy = (s, side, pad = 0) => !!hallAt(s, pad + 4) || crossingNear(s, pad + 14) || blastNear(s, side, pad + 22) || within(LEVEL.bridges, s, pad + 10);
  // ...and nothing out to `d` m off: the halls are BAY m deep each side, their facades wider
  const busyOut = (s, side, d, pad = 0) => (d < 40 && !!hallAt(s, pad + 8)) || crossingNear(s, pad + 12) || (d < 34 && blastNear(s, side, pad + 22)) || within(LEVEL.bridges, s, pad + 10);

  // ---- materials (shared within the level) ----
  const lit = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // a halo: a ball of light, brightest where it faces the camera and fading to nothing at its rim (so no hard edge), added onto
  // whatever is behind it, and fading with distance as the fog would
  const halo = new THREE.ShaderMaterial({
    uniforms: { strength: { value: night ? 1.0 : 0.45 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vC; varying float vD;
      void main() {
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = m * instanceMatrix;
        #endif
        vec4 wp = m * vec4(position, 1.0);
        vec3 sc = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
        vN = normalize(mat3(m) * (normal / (sc * sc)));
        vV = cameraPosition - wp.xyz;
        vD = length(vV);
        vC = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `uniform float strength; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying float vD;
      void main() {
        float f = abs(dot(normalize(vN), normalize(vV)));
        float fade = 1.0 - smoothstep(260.0, 900.0, vD);
        gl_FragColor = vec4(vC * f * f * strength * fade, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const smokeMat = new THREE.MeshLambertMaterial({ color: night ? 0x6a5048 : 0x8a7e76, transparent: true, opacity: night ? 0.5 : 0.62, depthWrite: false });
  const steamMat = new THREE.MeshLambertMaterial({ color: night ? 0x8a7a76 : 0xf0ece6, transparent: true, opacity: 0.55, depthWrite: false });
  // ---- geometries ----
  const CUBE = new THREE.BoxGeometry(1, 1, 1), TUBE = new THREE.CylinderGeometry(0.5, 0.5, 1, 10), COIL = new THREE.CylinderGeometry(0.5, 0.5, 1, 8), LADLE = new THREE.CylinderGeometry(0.5, 0.36, 1, 12), CONE = new THREE.ConeGeometry(0.5, 1, 12);
  const MOUND = new THREE.ConeGeometry(0.5, 1, 7, 1); // (a stockpile, a slag heap: scaled long and low)
  const BALL = new THREE.SphereGeometry(0.5, 10, 7), PUFF = new THREE.IcosahedronGeometry(0.5, 1);
  // a cooling tower: a hyperboloid shell, open at the top (1 across at the foot, 1 tall)
  const TOWER = new THREE.LatheGeometry([[0.5, 0], [0.42, 0.25], [0.33, 0.6], [0.32, 0.7], [0.34, 0.85], [0.37, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  const DOME = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);

  // ---- batches: one InstancedMesh per kind per chunk, each instance with a colour of its own ----
  const kinds = {};
  const kind = (name, geometry, material) => (kinds[name] = { name, geometry, material, items: [] });
  ['cube', 'tube', 'coil', 'ladle', 'cone', 'mound', 'dome', 'ball'].forEach(n => kind(n, { cube: CUBE, tube: TUBE, coil: COIL, ladle: LADLE, cone: CONE, mound: MOUND, dome: DOME, ball: BALL }[n], lit));
  kind('tower', TOWER, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  kind('gcube', CUBE, glow); kind('gtube', TUBE, glow); kind('halo', BALL, halo);
  // a thing at (s, lat), y m up, turned `turn` from the road's heading and tilted rx (about its own across) and rz (about
  // its own along), w across, h high, l along, in a colour
  const put = (k, s, lat, y, w, h, l, col, turn = 0, rx = 0, rz = 0) => {
    const heading = Track.toWorld(s, lat, p);
    dummy.position.set(p.x, p.y + y, p.z);
    dummy.rotation.set(rx, heading + turn, rz);
    dummy.scale.set(w, h, l);
    dummy.updateMatrix();
    kinds[k].items.push([s, dummy.matrix.clone(), col]);
  };
  // a beam (or a tube) from one point to another, each (s, lat, y): w across, h high (a tube: w its diameter)
  const link = (k, s0, lat0, y0, s1, lat1, y1, w, h, col) => {
    Track.toWorld(s0, lat0, p); Track.toWorld(s1, lat1, q);
    const a = new THREE.Vector3(p.x, p.y + y0, p.z), b = new THREE.Vector3(q.x, q.y + y1, q.z), len = a.distanceTo(b);
    dummy.position.copy(a).add(b).multiplyScalar(0.5);
    dummy.rotation.set(0, 0, 0);
    dummy.lookAt(target.copy(b));
    if (k === 'tube' || k === 'gtube') dummy.rotateX(Math.PI / 2); // (a cylinder stands along its own y: laid along the line)
    dummy.scale.set(w, k === 'tube' || k === 'gtube' ? len : h, k === 'tube' || k === 'gtube' ? h : len);
    dummy.updateMatrix();
    kinds[k].items.push([(s0 + s1) / 2, dummy.matrix.clone(), col]);
  };
  // (what stands within 30 m of the road is noted, for the check: its extent across and up)
  const near = (s, lat0, lat1, y0, y1, what) => { if (Math.min(Math.abs(lat0), Math.abs(lat1)) < 40) STEELWORKS_BUILT.near.push({ s, lat0: Math.min(lat0, lat1), lat1: Math.max(lat0, lat1), y0, y1, what }); };
  // a box standing on the ground at (s, lat), noted
  const block = (s, lat, y, w, h, l, col, what = 'block', k = 'cube') => { put(k, s, lat, y, w, h, l, col); near(s, lat - w / 2, lat + w / 2, y - h / 2, y + h / 2, what); };

  // ---- sheets: continuous geometry along the road, merged, vertex colours, one mesh per chunk ----
  const sheets = [];
  const sheet = (material, name) => {
    const S = { material, name, chunks: new Map() };
    S.quad = (s, a, b, c, d, col, uv = null) => {
      const k = chunkOf(s);
      if (!S.chunks.has(k)) S.chunks.set(k, { pos: [], col: [], uv: [], idx: [], n: 0, from: s, to: s });
      const C = S.chunks.get(k);
      C.from = Math.min(C.from, s); C.to = Math.max(C.to, s);
      colour.set(col);
      [a, b, c, d].forEach((v, i) => { C.pos.push(v[0], v[1], v[2]); C.col.push(colour.r, colour.g, colour.b); C.uv.push(...(uv ? uv[i] : [0, 0])); });
      C.idx.push(C.n, C.n + 1, C.n + 2, C.n, C.n + 2, C.n + 3);
      C.n += 4;
    };
    sheets.push(S);
    return S;
  };
  const solid = sheet(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'solid');
  const clad = sheet(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: claddingTexture() }), 'clad');
  const shine = sheet(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 'glow');
  const W = (s, lat, y) => { Track.toWorld(s, lat, p); return [p.x, p.y + y, p.z]; };
  // the pieces a long thing is built of: 8 m on a straight, 2.5 m where the road bends (so it follows the curve, never stepping)
  const LONG = 8, SHORT = 2.5, hd = {};
  const bendsOver = (s, len) => { const h0 = Track.toWorld(s, 0, hd), h1 = Track.toWorld(s + len, 0, hd); return Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))) > 0.01; };
  const steps = (a, b, fn) => { for (let s = a; s < b - 0.01;) { const len = bendsOver(s, LONG) ? SHORT : LONG, s1 = Math.min(b, s + len); fn(s, s1); s = s1; } };
  // a strip from line A to line B (each lat(s), y(s)): a wall, a floor, a sloped face
  const strip = (S, a, b, latA, yA, latB, yB, col, uvScale = null) => steps(a, b, (s0, s1) => {
    const f = (v, s) => typeof v === 'function' ? v(s) : v;
    const uv = uvScale ? [[s0 / uvScale[0], f(yA, s0) / uvScale[1]], [s0 / uvScale[0], f(yB, s0) / uvScale[1]], [s1 / uvScale[0], f(yB, s1) / uvScale[1]], [s1 / uvScale[0], f(yA, s1) / uvScale[1]]] : null;
    S.quad(s0, W(s0, f(latA, s0), f(yA, s0)), W(s0, f(latB, s0), f(yB, s0)), W(s1, f(latB, s1), f(yB, s1)), W(s1, f(latA, s1), f(yA, s1)), typeof col === 'function' ? col(s0) : col, uv);
  });
  // a box section along the road: w across, h high, its foot y0 up, centred on lat(s); its two ends capped
  const beam = (S, a, b, lat, y0, w, h, col, what = 'beam') => {
    const L = (d) => (s) => (typeof lat === 'function' ? lat(s) : lat) + d;
    strip(S, a, b, L(-w / 2), y0 + h, L(w / 2), y0 + h, col);  // top
    strip(S, a, b, L(-w / 2), y0, L(-w / 2), y0 + h, col);     // sides
    strip(S, a, b, L(w / 2), y0, L(w / 2), y0 + h, col);
    if (y0 > 0.05) strip(S, a, b, L(-w / 2), y0, L(w / 2), y0, col); // underside
    for (const s of [a, b]) S.quad(s, W(s, L(-w / 2)(s), y0), W(s, L(-w / 2)(s), y0 + h), W(s, L(w / 2)(s), y0 + h), W(s, L(w / 2)(s), y0), typeof col === 'function' ? col(s) : col);
    for (let s = a; s < b; s += 25) near(s, L(-w / 2)(s), L(w / 2)(s), y0, y0 + h, what);
  };
  // a pipe along the road: r m round, its middle y m up at lat(s), 8-sided
  const pipe = (S, a, b, lat, y, r, col, what = 'pipe') => {
    const n = 6, at = (s, k) => { const t = k / n * Math.PI * 2, l = (typeof lat === 'function' ? lat(s) : lat); return W(s, l + Math.cos(t) * r, y + Math.sin(t) * r); };
    steps(a, b, (s0, s1) => { for (let k = 0; k < n; k++) S.quad(s0, at(s0, k), at(s0, k + 1), at(s1, k + 1), at(s1, k), col); });
    for (let s = a; s < b; s += 25) { const l = typeof lat === 'function' ? lat(s) : lat; near(s, l - r, l + r, y - r, y + r, what); }
  };

  // ---- ACROSS THE ROAD: what spans it (its legs beyond the kerbs, its underside over CLEAR) ----
  // a pipe bridge: a lattice truss on two towers, four pipes across it
  const pipeBridge = (s) => {
    const y = CLEAR_OUT + 0.6, wide = hi(s) - lo(s) + 9, mid = (lo(s) + hi(s)) / 2;
    for (const side of [-1, 1]) for (const dz of [-1.2, 1.2]) { const l = off(side, s, 3.5); block(s + dz, l, (y + 3) / 2, 0.5, y + 3, 0.5, SW.dark, 'tower'); }
    for (const yy of [y, y + 2.8]) for (const dz of [-1.2, 1.2]) put('cube', s + dz, mid, yy, wide, 0.3, 0.3, SW.dark);
    for (let x = -wide / 2; x < wide / 2 - 0.1; x += 2.4) for (const dz of [-1.2, 1.2]) put('cube', s + dz, mid + x + 1.2, y + 1.4, 0.18, 3.2, 0.18, SW.dark, 0, 0, 0.7);
    [[SW.coil, 0.55, -0.5], [0x9a3a2a, 0.35, 0.5], [0x4f7a5a, 0.3, 0.9], [0xd8b030, 0.25, -1.0]].forEach(([c, r, dz], k) => put('tube', s + dz, mid, y + 0.45 + r + (k % 2) * 1.1, r * 2, wide + 2, r * 2, c, 0, 0, Math.PI / 2));
    near(s, mid - wide / 2, mid + wide / 2, y - 0.15, y + 4, 'span');
  };
  // a conveyor bridge: an enclosed gallery climbing across the road from a low trestle to a transfer tower
  const conveyorBridge = (s, upTo = 1) => {
    const y0 = CLEAR_OUT + 1.5, rise = 3.5, wide = hi(s) - lo(s) + 16, mid = (lo(s) + hi(s)) / 2, tilt = Math.atan2(rise, wide) * upTo;
    put('cube', s, mid, y0 + rise / 2 + 1.4, wide + 0.4, 2.8, 3.2, 0x9aa0a6, 0, 0, -tilt);
    put('cube', s, mid, y0 + rise / 2 - 0.05, wide + 0.4, 0.3, 3.6, SW.dark, 0, 0, -tilt);
    put('gcube', s, mid, y0 + rise / 2 + 2.0, wide + 0.45, 0.35, 3.25, night ? 0xffd48a : 0x3a4a58, 0, 0, -tilt); // (its window band: lit at night)
    for (const side of [-1, 1]) {
      const l = off(side, s, 8), top = y0 + rise / 2 + side * upTo * rise / 2; // (the gallery's underside at that end)
      const h = side * upTo > 0 ? top + 10 : top;
      block(s, l, h / 2, side * upTo > 0 ? 7 : 2.4, h, side * upTo > 0 ? 7 : 2.4, side * upTo > 0 ? 0x8a8f96 : SW.dark, side * upTo > 0 ? 'transfer tower' : 'trestle');
      if (side * upTo > 0) put('cube', s, l, h + 0.4, 7.6, 0.8, 7.6, SW.dark);
    }
    near(s, mid - wide / 2, mid + wide / 2, y0 - 0.2, y0 + rise + 3, 'span');
  };
  // a despatch gantry: a portal frame with a sign facing the traffic coming up to it
  const signs = [];
  const gantry = (s, text) => {
    const y = CLEAR_OUT + 0.5, wide = hi(s) - lo(s) + 4, mid = (lo(s) + hi(s)) / 2;
    for (const side of [-1, 1]) block(s, off(side, s, 1.6), (y + 2) / 2, 0.7, y + 2, 0.7, SW.yellow, 'leg');
    put('cube', s, mid, y + 1.0, wide, 2.0, 0.5, SW.yellow);
    signs.push([s - 0.3, mid, y + 1.0, Math.min(wide - 2, 9), 2.0, text]);
    near(s, mid - wide / 2, mid + wide / 2, y, y + 2, 'span');
  };

  // the stretches of a..b where ok(s) holds, each at least `least` m long: [[from, to], ...] (looked at every `step` m)
  const runs = (a, b, step, ok, least) => {
    const out = [];
    let from = null;
    for (let s = a; ; s = Math.min(b, s + step)) {
      const yes = s < b && ok(s);
      if (yes && from === null) from = s;
      if (!yes && from !== null) { if (s - from >= least) out.push([from, Math.max(from, s - step)]); from = null; }
      if (s >= b) break;
    }
    return out;
  };
  // ---- ALONG THE ROAD, OUTSIDE: the kerb barrier, lamp masts, pipe racks ----
  const outdoors = (s) => !hallAt(s, 2);
  const barrierRuns = [];
  for (const side of [-1, 1]) for (const [a, b] of runs(START, END, 2, (s) => outdoors(s) && !crossingNear(s, 10), 6)) barrierRuns.push([a, b, side]);
  for (const [a, b, side] of barrierRuns) beam(solid, a, b, (s) => off(side, s, 0.45), 0, 0.5, 0.85, (s) => Math.floor(s / 4) % 6 === 0 ? SW.yellow : SW.concrete, 'barrier');
  // lamp masts: a sodium head on a 12 m pole, each side in turn every 55 m
  for (let s = START + 20, k = 0; s < END - 10; s += 55, k++) {
    const side = k % 2 ? 1 : -1;
    if (busy(s, side, 4)) continue;
    const l = off(side, s, 2.2);
    block(s, l, 6, 0.25, 12, 0.25, 0x6a6f75, 'lamp');
    put('cube', s, l - side * 0.9, 12, 2.0, 0.18, 0.4, 0x4a4f57);
    put('gcube', s, l - side * 1.6, 11.88, 0.6, 0.1, 0.35, 0xffc070);
    if (night) { put('halo', s, l - side * 1.6, 11.6, 3.2, 2.2, 3.2, 0x8a5a20); put('halo', s, l - side * 3, 0.05, 12, 0.3, 12, 0x3a2408); } // (its head's glow, and its pool of light on the ground)
  }
  // pipe racks: portal frames every 9 m, 4 m beyond the kerb, three or four pipes running along them continuously
  const racks = [];
  for (const z of zones) {
    if (!['stockyard', 'furnaces', 'sidings', 'coilyard'].includes(z.scenery)) continue;
    const side = z.scenery === 'sidings' || z.scenery === 'coilyard' ? -1 : 1; // (the other side to the zone's own works)
    for (const [a, b] of runs(Math.max(START, z.from), Math.min(END, z.to), 3, (s) => !busy(s, side, 6), 30)) racks.push([a, b, side]);
  }
  for (const [a, b, side] of racks) {
    const d0 = 4.2, d1 = 7.4, posts = SW.dark;
    for (let s = a; s <= b; s += 9) {
      for (const d of [d0, d1]) block(s, off(side, s, d), 5, 0.35, 10, 0.35, posts, 'rack post');
      put('cube', s, off(side, s, (d0 + d1) / 2), 7.0, d1 - d0 + 0.6, 0.3, 0.35, posts);
      put('cube', s, off(side, s, (d0 + d1) / 2), 9.6, d1 - d0 + 0.6, 0.3, 0.35, posts);
    }
    pipe(solid, a, b, (s) => off(side, s, d0 + 0.8), 7.15 + 0.55, 0.55, SW.coil);
    pipe(solid, a, b, (s) => off(side, s, d0 + 2.2), 7.15 + 0.35, 0.35, 0x9a3a2a);
    pipe(solid, a, b, (s) => off(side, s, d0 + 1.2), 9.75 + 0.3, 0.3, 0x4f7a5a);
    pipe(solid, a, b, (s) => off(side, s, d0 + 2.4), 9.75 + 0.42, 0.42, 0xb0b4b8);
  }

  // ---- the spans over the road: pipe bridges every ~240 m outdoors, a conveyor bridge in the stockyard and the furnaces,
  // the despatch gantry near the end; never over a crossing's line, a blast or a hall's mouth, nor at a tunnel's portal
  const spanFree = (s) => !busy(s, 0, 30) && !hallAt(s, 50) && s > START + 60 && s < END - 40;
  const spans = [];
  for (const z of zones) {
    if (['meltshop', 'rollingmill'].includes(z.scenery)) continue;
    const kindOf = z.scenery === 'stockyard' || z.scenery === 'furnaces' ? 'conveyor' : 'pipes';
    let first = true;
    for (let s = z.from + 90; s < z.to - 60; s += 240) {
      const at = [s, s + 30, s - 30, s + 60].find(spanFree);
      if (at === undefined || spans.some(x => Math.abs(x - at) < 120)) continue;
      spans.push(at);
      if (first && kindOf === 'conveyor') conveyorBridge(at, z.scenery === 'stockyard' ? 1 : -1); else pipeBridge(at);
      first = false;
    }
  }
  { const z = zones.find(x => x.scenery === 'coilyard'); const at = [END - 180, END - 150, END - 210].find(spanFree); if (z && at !== undefined) gantry(at, 'DESPATCH'); }

  // ---- THE ZONES, OUTSIDE ----
  // a mound: a stockpile or a slag heap, its middle d m off, w across, h tall, l along
  const mound = (s, side, d, w, h, l, col) => { if (busyOut(s, side, d - w / 2, l / 2) || !clearSpot(s, off(side, s, d), Math.max(w, l) / 2)) return false; put('mound', s, off(side, s, d), h / 2, w, h, l, col); near(s, off(side, s, d - w / 2), off(side, s, d + w / 2), 0, h, 'mound'); return true; };
  // a coil lying on its side, its eye across the road (2 high in a stack: y its middle); the eye drawn only where it is seen
  const coil = (s, lat, y, r, col = SW.coil, eye = true) => { put('coil', s, lat, y, r * 2, 1.4, r * 2, col, 0, 0, Math.PI / 2); if (eye) put('coil', s, lat, y, r * 0.75, 1.42, r * 0.75, 0x3a3e44, 0, 0, Math.PI / 2); };
  // a chimney: tall, red and white at the top; a plume from it
  const plumes = []; // [s, lat, y, size, steam?]
  const chimney = (s, lat, h, r = 2) => {
    put('tube', s, lat, h / 2, r * 2, h, r * 2, 0x8a8278);
    for (let k = 0; k < 3; k++) put('tube', s, lat, h - 2 - k * 4, r * 2 + 0.06, 2, r * 2 + 0.06, k % 2 ? 0xf2f2ee : 0xc8321f);
    put('gcube', s, lat, h - 7, 0.3, 0.3, r * 2 + 0.1, 0xff3020); // (an aircraft warning lamp)
    plumes.push([s, lat, h, r * 1.6, false]);
  };
  const coolingTower = (s, lat, h) => { put('tower', s, lat, 0, h * 0.8, h, h * 0.8, night ? 0x6a6460 : 0xc8c2b8); plumes.push([s, lat, h, h * 0.3, true]); };
  // a blast furnace: the cast house at its foot (its doors glowing towards the road), the shell, its top, uptakes and a
  // downcomer to the dust catcher, the bustle main, the tuyeres glowing in a ring, a skip hoist climbing to the top; three
  // stoves behind it; a flare
  const sparks = []; // [s, lat, y, spread]: where sparks fly
  const furnace = (s, side, d) => {
    const lat = off(side, s, d), out = (dd) => off(side, s, d + dd);
    put('cube', s, out(-6), 6, 22, 12, 30, 0x6f6660); near(s, out(-17), out(5), 0, 12, 'cast house');
    put('cube', s, out(-6), 12.3, 22.6, 0.6, 30.6, SW.dark);
    for (const dz of [-8, 0, 8]) put('gcube', s + dz, out(-17.05), 3.0, 0.2, 5.5, 4.2, 0xff8a2a, 0, 0, 0);
    for (const dz of [-8, 0, 8]) put('halo', s + dz, out(-18), 3, 5, 6, 6, 0xc04010);
    sparks.push([s, out(-17.5), 1.2, 4]);
    put('tube', s, lat, 22, 12, 22, 12, 0x5a5652);                       // the shell
    put('cone', s, lat, 36, 12, 6, 12, 0x5a5652);                       // (its top, narrowing)
    put('tube', s, lat, 39.5, 7, 3, 7, SW.dark);
    put('tube', s, lat, 13, 15, 1.4, 15, 0x6a5a50);                      // the bustle main
    put('gtube', s, lat, 11, 12.3, 0.5, 12.3, 0xff7a2a);                 // the tuyeres' glow
    put('halo', s, lat, 11, 16, 3, 16, 0xa03810);
    for (const k of [0, 1, 2, 3]) { const a = k * Math.PI / 2 + 0.4, dl = Math.cos(a) * 2.6, ds = Math.sin(a) * 2.6; link('tube', s + ds, lat + dl, 40, s + ds * 0.4, lat + dl * 0.4, 50, 1.4, 1.4, 0x6f6a66); }
    link('tube', s, lat, 50, s + 18, out(14), 22, 2.4, 2.4, 0x6f6a66);    // the downcomer
    put('tube', s + 18, out(14), 16, 8, 12, 8, 0x7a756e); put('cone', s + 18, out(14), 8, 8, 4, 8, 0x7a756e, 0, Math.PI, 0);
    link('cube', s - 30, out(-6), 0, s - 4, lat, 38, 3.2, 2.6, 0x8a8f96); // the skip hoist
    for (let k = 0; k < 3; k++) { const ss = s - 14 + k * 14; put('tube', ss, out(24), 17, 9, 34, 9, 0x8a8478); put('dome', ss, out(24), 34, 9, 4.5, 9, 0x8a8478); } // the stoves
    link('tube', s - 14, out(24), 28, s + 14, out(24), 28, 1.6, 1.6, 0x6a5a50);
    link('tube', s, out(24), 28, s, lat, 14, 1.6, 1.6, 0x6a5a50);        // the hot blast main to the bustle
    const fl = out(30);
    put('tube', s + 30, fl, 22, 0.8, 44, 0.8, 0x6a6f75);
    put('gcube', s + 30, fl, 45, 0.9, 2.2, 0.9, 0xffb040); put('halo', s + 30, fl, 45.5, 4, 6, 4, 0xd06010);
    if (night) { put('halo', s, lat, 30, 44, 50, 44, 0x3a1206); put('halo', s, out(-17), 2, 30, 8, 40, 0x4a1a08); } // (at night: the furnace's glow over it, and on the ground at its doors)
  };
  // a slag heap: a black mound with orange pours glowing down its face towards the road, and a halo over each
  const slagHeap = (s, side, d, w, h, l) => {
    if (!mound(s, side, d, w, h, l, 0x3a3230)) return;
    if (night) put('halo', s, off(side, s, d), h * 0.4, w * 1.3, h * 1.8, l * 0.9, 0x4a1606); // (the heap's glow, over it)
    const face = Math.atan2(h, w / 2);
    for (let k = 0; k < 3; k++) {
      const ds = (k - 1) * l * 0.18 + between(-4, 4), lat = off(side, s + ds, d - w * 0.22);
      put('gcube', s + ds, lat, h * 0.45, 1.6 + rand(), 0.25, w * 0.55, k % 2 ? 0xff6a1a : 0xff9a3a, Math.PI / 2, side * face, 0);
      put('halo', s + ds, lat, h * 0.4, 9, 6, 9, 0xb03c10);
    }
  };
  // a slag pot: a dark bowl on the ground, its top glowing
  const slagPot = (s, lat) => { put('ladle', s, lat, 1.4, 4.2, 2.8, 4.2, 0x3a3432); put('gtube', s, lat, 2.82, 3.8, 0.05, 3.8, 0xff7a20); put('halo', s, lat, 3.4, 6, 3, 6, 0xa03810); near(s, lat - 2.1, lat + 2.1, 0, 2.8, 'slag pot'); };
  // rails along the road (a siding): ballast, two rails, sleepers; d m off
  const rails = (a, b, side, d) => {
    const L = (dd) => (s) => off(side, s, d + dd);
    strip(solid, a, b, L(-1.4), 0.04, L(1.4), 0.04, 0x4a4440);
    for (const g of [-0.72, 0.72]) beam(solid, a, b, L(g), 0.12, 0.09, 0.14, 0x8a9096, 'rail');
    for (let s = a + 0.6; s < b; s += 1.4) put('cube', s, off(side, s, d), 0.1, 2.5, 0.12, 0.26, 0x4a3a2c);
  };
  // wagons on a siding (built of the same instances): a torpedo ladle car, an ingot car, a coil wagon, the shunter
  const bogies = (s, lat, L) => { for (const dz of [-L / 2 + 1.8, L / 2 - 1.8]) put('cube', s + dz, lat, 0.7, 2.2, 0.7, 2.4, SW.darker); };
  const wagon = (type, s, lat) => {
    if (type === 'torpedo') {
      bogies(s, lat, 13); put('cube', s, lat, 1.2, 2.4, 0.4, 12, SW.darker);
      put('tube', s, lat, 3, 3.1, 7, 3.1, 0x4a4440, 0, Math.PI / 2, 0);
      for (const z of [-1, 1]) put('cone', s + z * 4.9, lat, 3, 3.1, 2.8, 3.1, 0x4a4440, 0, z * Math.PI / 2, 0);
      put('gcube', s, lat, 4.62, 0.9, 0.06, 0.9, 0xffd27a); put('halo', s, lat, 5.2, 3, 2.4, 3, 0xa04010);
      for (const z of [-2, 0, 2]) put('tube', s + z, lat, 3, 3.2, 0.2, 3.2, SW.rust, 0, Math.PI / 2, 0);
      near(s, lat - 1.6, lat + 1.6, 0, 4.7, 'wagon'); return 14;
    }
    if (type === 'ingot') {
      bogies(s, lat, 10); put('cube', s, lat, 1.2, 2.5, 0.4, 10, 0x5a2a22);
      for (const z of [-3.4, -1.1, 1.1, 3.4]) { put('cube', s + z, lat, 2.4, 1.2, 2.0, 1.2, 0x2a2624); put('gcube', s + z, lat, 3.41, 0.9, 0.02, 0.9, 0xff5a1a); }
      put('halo', s, lat, 3.8, 3, 1.6, 9, 0x802a08); near(s, lat - 1.25, lat + 1.25, 0, 3.4, 'wagon'); return 11;
    }
    if (type === 'coil') {
      bogies(s, lat, 10); put('cube', s, lat, 1.2, 2.6, 0.4, 10, 0x6a2a22);
      for (const z of [-3, 0, 3]) { put('cube', s + z, lat, 1.55, 2.2, 0.3, 1.8, SW.yellow); put('tube', s + z, lat, 2.55, 1.9, 1.5, 1.9, SW.coil); put('tube', s + z, lat, 2.55, 0.7, 1.52, 0.7, SW.dark); }
      near(s, lat - 1.3, lat + 1.3, 0, 3.5, 'wagon'); return 11;
    }
    bogies(s, lat, 10); put('cube', s, lat, 1.2, 2.7, 0.5, 10, SW.darker); put('cube', s + 1.5, lat, 2.4, 2.2, 2.0, 6, SW.yellow); put('cube', s - 3, lat, 2.8, 2.7, 2.8, 2.6, SW.yellow);
    put('cube', s - 3, lat, 3.5, 2.75, 0.7, 2.2, 0x1a2230); put('gcube', s - 3, lat, 4.3, 0.3, 0.25, 0.3, 0xffa21a);
    near(s, lat - 1.4, lat + 1.4, 0, 4.4, 'wagon'); return 11;
  };

  const zoneBuilders = {
    stockyard: (a, b) => {
      // left: stockpiles in rows, a stacker on its rail between them, a conveyor along the road on trestles
      for (let s = a + 40; s < b - 30; s += 70) {
        const cols = [0x8a4a34, 0x2c2a2a, 0xc4bcae, 0x5a4038];
        mound(s, -1, 30, 18, 9 + rand() * 3, 56, cols[Math.floor(rand() * 4)]);
        mound(s + 20, -1, 56, 20, 10 + rand() * 4, 60, cols[Math.floor(rand() * 4)]);
      }
      for (let s = a + 70; s < b - 50; s += 210) if (!busyOut(s, -1, 15, 20)) { const l = off(-1, s, 43); put('cube', s, l, 7, 4, 14, 6, SW.yellow); link('cube', s, l, 13, s + 26, off(-1, s + 26, 30), 6, 1.6, 1.4, SW.yellow); link('cube', s, l, 13, s - 12, off(-1, s - 12, 52), 18, 1.2, 1, SW.dark); }
      const cy = (q) => !busy(q, -1, 4);
      for (const [from, to] of runs(a, b, 3, cy, 30)) {
        beam(solid, from, to, (q) => off(-1, q, 13), 5.2, 2.0, 1.2, 0x9aa0a6, 'conveyor');
        strip(solid, from, to, (q) => off(-1, q, 12.3), 6.42, (q) => off(-1, q, 13.7), 6.42, 0x2a2624);
        for (let q = from + 6; q < to; q += 12) block(q, off(-1, q, 13), 2.6, 0.4, 5.2, 0.4, SW.dark, 'trestle');
      }
      // right: coils in rows under a portal crane, slab stacks
      for (let s = a + 20; s < b - 20; s += 6) {
        if (busyOut(s, 1, 10, 3)) continue;
        for (const d of [12, 16, 20]) { if (rand() < 0.2) continue; coil(s, off(1, s, d), 1.0, 0.95, SW.coil, d === 12); if (rand() < 0.25) coil(s + 2, off(1, s + 2, d), 2.6, 0.95, SW.coil, d === 12); }
      }
      for (let s = a + 60; s < b - 40; s += 160) {
        if (busyOut(s, 1, 8, 12)) continue;
        for (const d of [9, 33]) { block(s, off(1, s, d), 9, 1.0, 18, 1.0, SW.yellow, 'crane leg'); put('cube', s + 6, off(1, s, d), 9, 1.0, 18, 1.0, SW.yellow); }
        put('cube', s + 3, off(1, s, 21), 18.6, 26, 1.4, 1.6, SW.yellow); put('cube', s + 3, off(1, s, 18), 17.4, 3, 1.4, 3, SW.dark);
        for (let k = 0; k < 3; k++) put('cube', s + 30 + k * 7, off(1, s, 40), 1.2 + k * 0.1, 2, 0.4 + k * 0.3, 6, 0x6a6460);
      }
    },
    furnaces: (a, b) => {
      for (let s = a + 110, k = 0; s < b - 60; s += 260, k++) {
        const side = -1;
        if (busyOut(s, side, 30, 40) || !clearSpot(s, off(side, s, 50), 40)) continue;
        furnace(s, side, 48);
        chimney(s + 60, off(side, s + 60, 100), 72, 2.4);
      }
      for (let s = a + 60; s < b - 40; s += 150) slagHeap(s, 1, 55 + rand() * 20, 40, 14 + rand() * 6, 70);
      for (let s = a + 30; s < b - 20; s += 45) { if (busyOut(s, 1, 10, 4)) continue; if (rand() < 0.6) slagPot(s, off(1, s, 14 + rand() * 6)); }
    },
    sidings: (a, b) => {
      for (const d of [6, 11, 16]) {
        for (const [from, to] of runs(a, b, 2, (s) => !busy(s, 1, 6), 40)) {
          rails(from, to, 1, d);
          for (let q = from + 8 + rand() * 20; q < to - 18;) { const type = ['torpedo', 'torpedo', 'ingot', 'coil', 'coil', 'shunter'][Math.floor(rand() * 6)]; q += wagon(type, q + 6, off(1, q + 6, d)) + (rand() < 0.35 ? 18 + rand() * 30 : 1.2); }
        }
      }
      for (let s = a + 80; s < b - 60; s += 180) slagHeap(s, -1, 50 + rand() * 30, 44, 16 + rand() * 6, 80);
    },
    coilyard: (a, b) => {
      for (const side of [-1, 1]) for (let s = a + 15; s < b - 15; s += 5) {
        if (busyOut(s, side, 10, 3)) continue;
        for (const d of side < 0 ? [12, 16] : [9, 13]) { if (rand() < 0.25) continue; const wrapped = rand() < 0.5, first = d === (side < 0 ? 12 : 9); coil(s, off(side, s, d), 1.0, 0.95, wrapped ? 0xdfe6ee : SW.coil, first); if (wrapped) put('coil', s, off(side, s, d), 1.0, 1.95, 0.25, 1.95, SW.blue, 0, 0, Math.PI / 2); }
      }
      for (let s = a + 50; s < b - 60; s += 120) { if (busyOut(s, 1, 22, 12)) continue; const l = off(1, s, 28); put('cube', s, l, 1.3, 2.5, 0.5, 13, 0x3a3e44); put('cube', s + 7.5, l, 2, 2.5, 2.6, 2.6, 0xc8321f); for (const z of [-4, 0, 4]) coil(s + z, l, 2.5, 0.95); }
    },
  };
  for (const z of zones) {
    const build = zoneBuilders[z.scenery] || (['meltshop', 'rollingmill'].includes(z.scenery) ? zoneBuilders.sidings : null);
    if (!build) continue;
    // (a hall's zone outside its tunnel: whatever of it is outdoors is the sidings')
    const a = Math.max(START, z.from), b = Math.min(END, z.to);
    if (b - a > 20) build(a, b);
  }

  // ---- THE SKYLINE: cooling towers with steam, chimneys, gas holders, far off both sides
  for (let s = START + 150, k = 0; s < END; s += 420, k++) {
    const side = k % 2 ? 1 : -1, d = 160 + rand() * 120, lat = off(side, s, d);
    if (!clearSpot(s, lat, 40)) continue;
    if (k % 3 === 0) { coolingTower(s, lat, 62); if (clearSpot(s + 60, off(side, s + 60, d + 10), 40)) coolingTower(s + 60, off(side, s + 60, d + 10), 58); }
    else if (k % 3 === 1) { chimney(s, lat, 90, 3); chimney(s + 24, off(side, s + 24, d + 6), 84, 2.6); }
    else { put('tube', s, lat, 22, 40, 44, 40, 0x7d858d); put('dome', s, lat, 44, 40, 4, 40, 0x6a7078); for (let y = 6; y < 44; y += 8) put('tube', s, lat, y, 40.4, 0.6, 40.4, 0x5a6068); }
  }

  // ---- THE HALLS (a level's tunnels): the melt shop or the rolling mill, by the zone they are in ----
  const roofLights = [], slabs = []; // (slabs: the hot slab running down each roller table)
  for (const t of tunnels) {
    const z = zoneAt((t.from + t.to) / 2), kindOfHall = z === 'meltshop' ? 'meltshop' : 'rollingmill', D = BAY[kindOfHall], hAt = heightOf(t);
    const a = t.from, b = t.to, out = (side, d) => (s) => off(side, s, d);
    // the kerb walls along the road, a hazard band on top, and the glowing light along their foot
    for (const side of [-1, 1]) {
      beam(solid, a, b, out(side, 0.2), 0, 0.4, 1.1, SW.concrete, 'kerb wall');
      beam(solid, a, b, out(side, 0.2), 1.1, 0.42, 0.12, (s) => Math.floor(s / 1.5) % 2 ? SW.black : SW.yellow, 'kerb wall');
      strip(shine, a, b, out(side, -0.02), 0.03, out(side, -0.32), 0.03, 0xff8a2a);      // (on the floor at the wall's foot)
      strip(shine, a, b, out(side, -0.005), 0.05, out(side, -0.005), 0.32, 0xffa040);    // (and up its face)
      // the outer wall, BAY m out, clad, a band of high windows; the bay's floor
      strip(clad, a, b, out(side, D), 0, out(side, D), (s) => hAt(s) - 4.5, 0x5f666e, [4, 4]);
      strip(clad, a, b, out(side, D), (s) => hAt(s) - 2, out(side, D), hAt, 0x5f666e, [4, 4]);
      strip(night ? shine : solid, a, b, out(side, D - 0.05), (s) => hAt(s) - 4.5, out(side, D - 0.05), (s) => hAt(s) - 2, night ? 0xffb050 : 0xa8b8c4);
      strip(solid, a, b, out(side, 0.4), 0.02, out(side, D), 0.02, 0x4a4542);
      // the columns behind the kerb wall, the crane runway girders on them
      for (let s = a + 6; s < b; s += 18) { block(s, off(side, s, 1.3), hAt(s) / 2, 0.8, hAt(s), 0.9, 0x3e5a7a, 'column'); block(s, off(side, s, D - 0.6), hAt(s) / 2, 0.8, hAt(s), 0.9, 0x3e5a7a, 'column'); }
      for (const d of [1.3, D - 0.6]) steps(a, b, (x0, x1) => { // (the crane runway girders: they follow the ceiling's height)
        const y = (s) => hAt(s) - 4.7;
        for (const [la, lb, ya, yb] of [[-0.5, 0.5, 1.4, 1.4], [-0.5, -0.5, 0, 1.4], [0.5, 0.5, 0, 1.4], [-0.5, 0.5, 0, 0]]) {
          solid.quad(x0, W(x0, off(side, x0, d) + la, y(x0) + ya), W(x0, off(side, x0, d) + lb, y(x0) + yb), W(x1, off(side, x1, d) + lb, y(x1) + yb), W(x1, off(side, x1, d) + la, y(x1) + ya), 0x3e5a7a);
        }
      });
    }
    // the roof: over the whole hall at the ceiling's height, dark; trusses across every 18 m; rows of roof lights
    strip(solid, a, b, out(-1, D), hAt, out(1, D), hAt, 0x2c2e32);
    for (let s = a + 15; s < b - 3; s += 18) {
      const mid = (lo(s) + hi(s)) / 2, wide = hi(s) - lo(s) + 2 * D;
      put('cube', s, mid, hAt(s) - 0.6, wide, 1.2, 0.4, 0x3e4248);
      for (const x of [-0.3, 0, 0.3]) roofLights.push([s + 9, mid + x * wide, hAt(s + 9) - 0.12]);
    }
    // the facades at each end: the gable across the whole hall with the road's opening (12 m tall), hazard stripes round it,
    // the hall's name over it
    for (const [s, dir] of [[a, -1], [b, 1]]) {
      const H = hAt(s), mid = (lo(s) + hi(s)) / 2, w = hi(s) - lo(s), O = 12;
      for (const side of [-1, 1]) { const l = mid + side * (w / 2 + 0.3 + (D - 0.3 + 1) / 2); put('cube', s, l, (H + 3) / 2, D + 0.7, H + 3, 1.0, 0x6a6460); near(s, l - (D + 0.7) / 2, l + (D + 0.7) / 2, 0, H + 3, 'facade'); }
      put('cube', s, mid, O + (H + 3 - O) / 2, w + 0.8, H + 3 - O, 1.0, 0x6a6460);
      near(s, mid - w / 2, mid + w / 2, O, H + 3, 'lintel');
      for (const side of [-1, 1]) for (let y = 0.5; y < O; y += 1.5) put('cube', s + dir * 0.55, mid + side * (w / 2 + 0.55), y + 0.375, 0.5, 0.75, 0.12, Math.round(y / 1.5) % 2 ? SW.yellow : SW.black);
      for (let x = -w / 2; x < w / 2; x += 1.5) put('cube', s + dir * 0.55, mid + x + 0.375, O - 0.3, 0.75, 0.5, 0.12, Math.round(x / 1.5) % 2 ? SW.yellow : SW.black);
      if (dir < 0) signs.push([s - 0.6, mid, O + 2.4, Math.min(w, 10), 2.4, kindOfHall === 'meltshop' ? 'MELT SHOP 2' : 'HOT STRIP MILL']);
    }
    // what is in the bays, and the crane bridges over the road
    const crane = (s, y, load) => {
      const mid = (lo(s) + hi(s)) / 2, wide = hi(s) - lo(s) + 2 * 1.3 + 1.2;
      for (const dz of [-1.1, 1.1]) put('cube', s + dz, mid, y + 0.9, wide, 1.8, 0.8, SW.yellow);
      for (const side of [-1, 1]) put('cube', s, off(side, s, 1.3), y + 0.6, 1.4, 1.2, 4.4, SW.dark);
      const tx = mid + between(-2, 2);
      put('cube', s, tx, y + 1.0, 3.2, 1.4, 1.3, SW.dark); // (the trolley, between the two girders)
      near(s, mid - wide / 2, mid + wide / 2, y, y + 1.8, 'crane bridge');
      if (!load) return;
      const hook = CLEAR_IN + 0.6 + (load === 'ladle' ? 6.1 : load === 'coil' ? 2.2 : 1.2);
      for (const dz of [-0.5, 0.5]) put('cube', s + dz, tx, (y + hook) / 2, 0.06, y - hook, 0.06, 0x1b1d22);
      put('cube', s, tx, hook, 1.2, 0.8, 1.6, SW.yellow);
      if (load === 'ladle') {
        const ly = CLEAR_IN + 2.5; // (a ladle hangs well up: the camera rides under it)
        put('ladle', s, tx, ly + 1.7, 4.6, 3.4, 4.6, 0x3a3432);
        put('cube', s, tx, ly + 3.2, 5.0, 0.3, 0.3, SW.dark);
        put('gtube', s, tx, ly + 3.42, 4.2, 0.05, 4.2, 0xffd27a); put('halo', s, tx, ly + 4, 7, 4, 7, 0xa04010);
        near(s, tx - 2.3, tx + 2.3, ly, ly + 3.5, 'ladle');
      } else if (load === 'coil') {
        put('tube', s, tx, CLEAR_IN + 1.6, 2.0, 1.5, 2.0, SW.coil, 0, Math.PI / 2, Math.PI / 2);
        near(s, tx - 1, tx + 1, CLEAR_IN + 0.6, CLEAR_IN + 2.6, 'coil on the hook');
      }
    };
    const cranesAt = [];
    for (let s = a + 40; s < b - 30; s += kindOfHall === 'meltshop' ? 110 : 140) cranesAt.push(s + between(-10, 10));
    cranesAt.forEach((s, k) => crane(s, hAt(s) - 3.3, kindOfHall === 'meltshop' ? (k % 2 ? 'ladle' : null) : (k % 2 ? null : 'coil')));
    if (kindOfHall === 'meltshop') {
      // left bay: converters tilted to pour, a ladle under each on its car, sparks; right bay: ladles waiting, slabs cooling
      for (let s = a + 50; s < b - 40; s += 75) {
        const l = off(-1, s, 11), tilt = 0.55;
        put('tube', s, l, 7, 6.4, 6, 6.4, 0x4a4440, 0, 0, tilt); put('cone', s, l + Math.sin(tilt) * 4.4, 7 + Math.cos(tilt) * 4.4, 6.4, 2.8, 6.4, 0x4a4440, 0, 0, tilt); // (tilted towards the road: local +x is the road's left)
        put('cone', s, l - Math.sin(tilt) * 4.4, 7 - Math.cos(tilt) * 4.4, 6.4, 2.8, 6.4, 0x4a4440, 0, 0, Math.PI + tilt);
        put('tube', s, l, 7, 7.6, 1.0, 1.0, 0x6a6460, 0, 0, Math.PI / 2); // (its trunnion)
        for (const dz of [-3.8, 3.8]) put('cube', s + dz, l, 3.5, 1.2, 7, 1.4, SW.dark);
        const mx = l + Math.sin(tilt) * 6.1, my = 7 + Math.cos(tilt) * 6.1;
        put('gtube', s, mx, my, 2.6, 0.2, 2.6, 0xffe0a0, 0, 0, tilt); put('halo', s, mx, my, 9, 9, 9, 0xc05010);
        link('gtube', s, mx + 0.6, my - 0.4, s, mx + 1.6, 3.6, 0.6, 0.6, 0xffb040);       // (the stream, into the ladle)
        put('ladle', s, mx + 1.8, 2.4, 4.4, 3.0, 4.4, 0x3a3432); put('gtube', s, mx + 1.8, 3.92, 3.9, 0.05, 3.9, 0xffc060);
        sparks.push([s, mx + 1.8, 4, 3]);
        near(s, mx + 1.8 - 2.2, l + 3.6, 0, 10, 'converter');
        put('cube', s, l - 5, 14, 3, 6, 3, 0x6a6460); // (its hood, up into the roof)
      }
      for (let s = a + 30; s < b - 20; s += 34) {
        const l = off(1, s, 8 + rand() * 6);
        put('ladle', s, l, 1.7, 4.4, 3.4, 4.4, 0x3a3432); put('gtube', s, l, 3.42, 3.9, 0.05, 3.9, rand() < 0.5 ? 0xffb040 : 0xd85a20);
        near(s, l - 2.2, l + 2.2, 0, 3.4, 'ladle');
      }
      for (let s = a + 50; s < b - 30; s += 90) for (let k = 0; k < 4; k++) put('gcube', s + k * 3, off(1, s, 18), 0.6 + (k % 2) * 0.62, 5, 0.6, 2.2, k % 2 ? 0xd8461a : 0xff7a2a);
      rails(a + 10, b - 10, 1, 4.5);
    } else {
      // left bay: the roller table along the road, mill stands over it, a hot slab running down it; right bay: coils, slabs
      const T = 4.4, table = (s) => off(-1, s, T);
      beam(solid, a + 8, b - 8, (s) => off(-1, s, T - 1.3), 0, 0.3, 1.0, SW.dark, 'roller table');
      beam(solid, a + 8, b - 8, (s) => off(-1, s, T + 1.3), 0, 0.3, 1.0, SW.dark, 'roller table');
      for (let s = a + 9; s < b - 8; s += 1.6) put('coil', s, table(s), 0.85, 0.32, 2.4, 0.32, 0x8a9096, 0, 0, Math.PI / 2);
      for (let s = a + 60; s < b - 40; s += 46) {
        for (const d of [T - 2.2, T + 2.2]) block(s, off(-1, s, d), 3.2, 1.4, 6.4, 3, 0x3e5a7a, 'mill stand');
        put('cube', s, table(s), 6.0, 5.8, 1.2, 3.2, 0x3e5a7a);
        put('cube', s, off(-1, s, T + 6), 2, 4, 4, 3, 0x6a6460);
      }
      for (let k = 0, n = Math.max(1, Math.round((b - a) / 140)); k < n; k++) slabs.push({ a: a + 10, b: b - 10, lat: table, y: 1.12, phase: k / n }); // (a hot slab every 140 m or so, running down the table)
      for (let s = a + 20; s < b - 20; s += 6) for (const d of [5, 8.5]) { if (rand() < 0.3) continue; coil(s, off(1, s, d), 1.0, 0.95, SW.coil, d === 5); }
    }
  }

  // ---- the roof lights (rows of panels under the halls' roofs), and the signs
  for (const [s, lat, y] of roofLights) put('gcube', s, lat, y, 3.4, 0.12, 6, night ? 0xfff0d0 : 0xe8f0f8);
  const signMats = new Map();
  for (const [s, lat, y, w, h, text] of signs) {
    const map = signTexture(text);
    if (!signMats.has(text)) signMats.set(text, new THREE.MeshBasicMaterial({ map, color: map ? 0xffffff : SW.yellow, side: THREE.DoubleSide }));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMats.get(text));
    const heading = Track.toWorld(s, lat, p);
    mesh.position.set(p.x, p.y + y, p.z);
    mesh.rotation.y = heading + Math.PI; // (facing the traffic coming up to it)
    levelGroup.add(mesh);
    STEELWORKS_BUILT.meshes.push({ kind: 'sign', from: s, to: s, tris: 2, instances: 1 });
  }

  // ---- flush: the instanced kinds, chunk by chunk; the sheets
  for (const K of Object.values(kinds)) {
    const byChunk = new Map();
    for (const it of K.items) { const k = chunkOf(it[0]); if (!byChunk.has(k)) byChunk.set(k, []); byChunk.get(k).push(it); }
    for (const list of byChunk.values()) {
      const mesh = new THREE.InstancedMesh(K.geometry, K.material, list.length);
      list.forEach(([, m, col], i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, colour.set(col)); });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      levelGroup.add(mesh);
      const tris = (K.geometry.index ? K.geometry.index.count : K.geometry.attributes.position.count) / 3;
      STEELWORKS_BUILT.meshes.push({ kind: K.name, from: Math.min(...list.map(x => x[0])), to: Math.max(...list.map(x => x[0])), tris: tris * list.length, instances: list.length });
    }
  }
  for (const S of sheets) {
    for (const C of S.chunks.values()) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(C.pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(C.col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(C.uv, 2));
      geo.setIndex(C.idx);
      geo.computeVertexNormals();
      levelGroup.add(new THREE.Mesh(geo, S.material));
      STEELWORKS_BUILT.meshes.push({ kind: S.name, from: C.from, to: C.to, tris: C.idx.length / 3, instances: 1 });
    }
  }

  // ---- what moves: smoke and steam out of the chimneys, cooling towers and mill stands; sparks; the hot slab on the table
  const PER = 7;
  const puffMesh = (material, list) => {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(PUFF, material, list.length * PER);
    mesh.frustumCulled = false;
    mesh.userData.flat = true;
    levelGroup.add(mesh);
    STEELWORKS_BUILT.meshes.push({ kind: material === steamMat ? 'steam' : 'smoke', from: START, to: END, tris: 80 * list.length * PER, instances: list.length * PER, moving: true });
    return mesh;
  };
  const smokes = plumes.filter(x => !x[4]), steams = plumes.filter(x => x[4]);
  const smokeMesh = puffMesh(smokeMat, smokes), steamMesh = puffMesh(steamMat, steams);
  const where = (list) => list.map(([s, lat, y, size]) => { const h = Track.toWorld(s, lat, p); return { x: p.x, y: p.y + y, z: p.z, size, h, phase: rand() }; });
  const smokeAt = where(smokes), steamAt = where(steams);
  const SPARKS = 36, sparkAt = sparks.map(([s, lat, y, spread]) => { Track.toWorld(s, lat, p); return { x: p.x, y: p.y + y, z: p.z, spread, phase: rand() * 10 }; });
  let sparkPoints = null;
  if (sparkAt.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sparkAt.length * SPARKS * 3), 3));
    sparkPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffb040, size: 0.35, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    sparkPoints.frustumCulled = false;
    sparkPoints.userData.flat = true;
    levelGroup.add(sparkPoints);
    STEELWORKS_BUILT.meshes.push({ kind: 'sparks', from: START, to: END, tris: 0, instances: sparkAt.length * SPARKS, moving: true });
  }
  let slabMesh = null;
  if (slabs.length) {
    slabMesh = new THREE.InstancedMesh(CUBE, glow, slabs.length);
    slabMesh.frustumCulled = false;
    slabMesh.userData.flat = true;
    for (let i = 0; i < slabs.length; i++) slabMesh.setColorAt(i, colour.set(0xff7a2a));
    levelGroup.add(slabMesh);
    STEELWORKS_BUILT.meshes.push({ kind: 'slab', from: START, to: END, tris: 12, instances: slabs.length, moving: true });
  }
  const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  everyFrame(levelGroup, (t, cx, cy, cz) => {
    const drift = (mesh, list, rise, spread) => {
      if (!mesh) return;
      list.forEach((e, k) => {
        const far = (e.x - cx) ** 2 + (e.z - cz) ** 2 > 1400 * 1400;
        for (let i = 0; i < PER; i++) {
          const u = ((t * 0.06 + e.phase + i / PER) % 1), r = e.size * (0.6 + u * spread);
          pos.set(e.x + u * e.size * 6, e.y + u * rise * e.size, e.z + Math.sin(i * 2.1 + k) * e.size * u);
          scl.setScalar(far ? 0.0001 : r * (1 - u * 0.35));
          m4.compose(pos, quat.setFromAxisAngle(up, i), scl);
          mesh.setMatrixAt(k * PER + i, m4);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    drift(smokeMesh, smokeAt, 7, 3.2);
    drift(steamMesh, steamAt, 4, 2.4);
    if (sparkPoints) {
      const a = sparkPoints.geometry.attributes.position;
      sparkAt.forEach((e, k) => {
        const close = (e.x - cx) ** 2 + (e.z - cz) ** 2 < 320 * 320;
        for (let i = 0; i < SPARKS; i++) {
          const n = k * SPARKS + i;
          if (!close) { a.setXYZ(n, e.x, -1000, e.z); continue; }
          const life = 0.9, u = ((t + e.phase + i * 0.137) % life) / life, ang = i * 2.399, v = 3 + (i % 5);
          a.setXYZ(n, e.x + Math.cos(ang) * v * u * e.spread * 0.4, e.y + 5 * u - 9 * u * u, e.z + Math.sin(ang) * v * u * e.spread * 0.4);
        }
      });
      a.needsUpdate = true;
    }
    if (slabMesh) slabs.forEach((sl, i) => {
      const len = sl.b - sl.a, u = (t * 12 / len + sl.phase) % 1, s = sl.a + u * len, h = Track.toWorld(s, sl.lat(s), p);
      dummy.position.set(p.x, p.y + sl.y, p.z); dummy.rotation.set(0, h, 0); dummy.scale.set(1.8, 0.18, 24); dummy.updateMatrix();
      slabMesh.setMatrixAt(i, dummy.matrix);
      slabMesh.instanceMatrix.needsUpdate = true;
    });
  });
};
