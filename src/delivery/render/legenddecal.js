// ---- the LEGENDARY cars' look (the owner, 14-Oct: "The reserved colour scheme will be Black with gold trim. Legendary
// cars should have a large gold winner's wreath at the rear quarter of their sides"; then "Draw the wreath with no lines
// nor extra details. It is two colours, maximum ... making it big, wrapping over non-wheel and non-window elements
// only; stylistically rotating it 35 degrees, so it is a motif like Jaguar's on their XJ220"). A Legendary car is a car
// entry of its own (cars.js, `legend: '<base car id>'`) that builds its base car's model; this dresses that model once
// it is built (render/showcar.js makeShowCar, render/items.js playerModel), both sides alike (Good and Evil):
//   the body   a deep black with a slight sheen (a Phong copy of its paint: the car's own colours are LEGEND_BLACK)
//   the trim   the parts LEGEND_TRIM names, by their material's colour (bumpers, grille, sills, hub caps...), in gold
//   the wreath a big gold laurel wreath (one small canvas picture of flat shapes in two golds, drawn here, shared by
//              every car), WRAPPED on each flank at the rear quarter: a grid laid on the body by rays along x, each
//              point a few mm out from the paint it found; a cell is kept only where all its corners found the BODY'S
//              PAINT facing out sideways (never over a tyre, glass, a lamp, trim, nor round onto the roof or a bumper)
//              and where the wreath's ring passes. The picture is turned LEGEND.tilt degrees in the grid's texture
//              coordinates (the mesh itself stays on the body), its open top leaning to the car's front. Parented to
//              what the rays found (so it rides the body), appended last (the model editor's part ids stay the base
//              car's), hidden on a blacked-out car (render/silhouette.js).
// Traffic builds its models elsewhere (render/cars.js) and is never dressed.
import * as THREE from 'three';

export const LEGEND_BLACK = 0x0b0b0e, LEGEND_GOLD = 0xd4a82a;
// the same for every Legendary car (the owner, 14-Oct: 35, then 20, "similar to P8b"): the wreath turned `tilt` degrees about the flank's normal, its open top leaning
// toward the car's front (`lean: 'front'`, rising forward) or its rear ('rear'); `cell`: about how wide the wrapping grid's cells are, in metres (10 to 26 a side)
export const LEGEND = { tilt: 20, lean: 'front', cell: 0.07,
  pos: (typeof location !== 'undefined' && /[?&]legendpos=(\w+)/.exec(location.search)?.[1]) || null }; // (?legendpos=P3: LEGEND_PLACEMENTS)
// where the wreath goes, by the base car's MODEL: [z, y, size] in metres in the model's own frame (z along the car, its
// front +z; y up from the road; size: the wreath's width and height, the picture's square). Whatever of it does not
// land on the body's side paint is left off, so it may overlap the wheel, the windows and the lamps freely. To add a
// car: put the centre over the rear quarter (behind the rear door, over the rear wheel), make it as big as reads well,
// and look at both sides: enough of the ring must stay on paint to read as a wreath.
// A spot is [z, y, size] or [z, y, size, tilt, lean] (its own turn: degrees, 'front' or 'rear'; else LEGEND's); a car's
// entry may list several spots (wreaths on each flank, all one mesh a side).
export const LEGEND_DECAL = {
  sport: [[-1.18, 0.38, 1.3]],
  miata: [[-1.21, 0.34, 1.15]],
  lowrider: [[-1.5, 0.38, 1.3]],
  wagon: [[-1.44, 0.48, 1.7]],
  lovebus: [[-1.47, 0.42, 1.45]],
  darkvan: [[-1.47, 0.52, 1.84]],
  hearse: [[-1.68, 0.38, 1.32]],
  hotrod: [[-0.55, 0.72, 0.62]], // (its rear wheel stands bare behind the cab: the wreath on the cab's side, ahead of the flames)
  minivan: [[-1.47, 0.4, 1.39]],
  pickup: [[-1.6, 1.22, 0.95]], // (its body rides high over the wheels: the wreath on the load bed's side)
  junker: [[0.05, 0.72, 0.85]], // (rust round both arches and the load behind: the wreath on its doors)
  taxi: [[-0.75, 0.66, 0.85]], // (on the rear door under the chequers: round the wheel the flared arch cut it to curls)
  suv: [[-1.35, 0.44, 1.54]],
  commuter: [[-1.15, 0.32, 1.1]], // (HUGE, the owner: centred on the rear wheel, a laurel arch over it across most of the rear 30% (z -1.7 to -0.6); carved by the tyre, the waist and the tail's turn)
};
// OTHER PLACEMENTS to compare (the owner, 14-Oct: "Try some different placements of the wreath please"), by the base
// car's MODEL, picked for a visit by the address: ?legendpos=P3 (any page that builds a Legendary car: the game, the
// showroom, the model editor; LEGEND.pos). P1 is LEGEND_DECAL's (the default)
export const LEGEND_PLACEMENTS = {
  commuter: {
    P1: [[-1.15, 0.32, 1.1]],                    // centred on the rear wheel: an arch of laurel over it (the default; the owner, 14-Oct: tilt 20, "similar to P8b")
    P2: [[-1.15, 0.78, 0.8]],                    // high on the rear quarter, between the arch and the rear window
    P3: [[-0.6, 0.58, 0.9]],                     // the rear door, mid flank (cut by the window line and the sill)
    P4: [[-0.85, 0.5, 1.0]],                     // on the front of the rear arch: half door, half quarter
    P5: [[0.2, 0.3, 1.7]],                       // low and long behind the front wheel, cut by both arches
    P6: [[0, 0.55, 2.2]],                        // the whole flank, arch to arch (a race livery)
    P7: [[-1.3, 0.56, 0.6], [-0.3, 0.58, 0.6]],  // two small: the rear quarter and the door
    P8: [[-1.15, 0.32, 1.1, 35, 'rear']],        // P1 leaning back 35
    P8b: [[-1.15, 0.32, 1.1, 20, 'front']],      // P1 at 20 forward (now the same as P1)
    P8c: [[-1.15, 0.32, 1.1, 35, 'front']],      // P1 at the first 35 forward
    T15: [[-1.15, 0.32, 1.1, 15, 'front']],      // P1 at 15 forward
    T25: [[-1.15, 0.32, 1.1, 25, 'front']],      // P1 at 25 forward
  },
};
// the wreath never shows above this height (m), by the base car's MODEL: the waist, so no stray bits land on the
// pillars and the frames round the side windows
export const LEGEND_WAIST = {
  commuter: 0.8, sport: 0.8, miata: 0.84, lowrider: 0.84, wagon: 1.18, lovebus: 1.3, darkvan: 1.52, hearse: 1.02, hotrod: 0.92, minivan: 1.22, pickup: 1.52, junker: 1.12, taxi: 1.0, suv: 1.22,
};
// the trim, by the base car's MODEL, by the colours (hex) of the materials its parts are drawn in (as the model builds
// them, its Good livery): `gold` the metal, chrome and trim (bumpers, grille, lamp rims, sills, hubs); `black` a second
// paint (a two-tone's other colour, a stripe), made the body's black; `goldMap` true: every Lambert material with a
// picture and a white colour is tinted gold (a taxi's chequers). Everything else (glass, lamps, tyres) is left. The ONE
// scheme (the owner, 14-Oct: "Let's keep one colour scheme for all of them"): Good and Evil alike, so the model's own
// livery switch is turned off for a Legendary car (its Good second colours, then these).
export const LEGEND_TRIM = {
  commuter: { gold: [0x232529, 0xc4c8ce] }, // (the black bumpers, mouth, grille and sill skirt; the silver hub caps)
  sport: { gold: [0x1b1d21, 0x4a4e56], black: [0xf4f4f0] }, // (the dark bumpers, splitter and wing; the hubs; its white stripes black)
  miata: { gold: [0x232529, 0xc4c8ce], black: [0xf4f4f4] }, // (bumpers and trim; hubs; its stripes black)
  lowrider: { gold: [0xe2b64a, 0xd9dce1] }, // (its gold trim and its chrome: bumpers, spokes, side spears)
  wagon: { gold: [0x1b1d21, 0xd9dce1, 0xc4c8ce] }, // (the dark bumpers and trim, the chrome, the hubs)
  lovebus: { gold: [0xd9dce1, 0xc4c8ce], black: [0xf6f3ea] }, // (the chrome bumpers and the hub caps; its white upper half black)
  darkvan: { gold: [0x1b1d21, 0xd9dce1, 0xc4c8ce], black: [0xf4f4f0] }, // (the dark bumpers and bull bar, the chrome, the hubs; its stripe black)
  hearse: { gold: [0xd8d8d8, 0xc4c8ce, 0xece6cc] }, // (the chrome, the landau bars, the hubs; the curtains left)
  hotrod: { gold: [0xd8d8d8, 0xf2d21f], goldMap: true }, // (the chrome engine, grille, pipes and hubs, the brass; its flames tinted gold; the frame stays dark)
  pickup: { gold: [0xd8d8d8, 0xb8bcc2, 0x2a2c31, 0x1d2238] }, // (the chrome, the hubs, the dark trim, the bull bar)
  junker: { gold: [0xc4c7cb, 0xa8acb2, 0x7d8794], black: [0x4f5532] }, // (the grille, the hubs, the steel bumpers; its roof black; its rust and its load left)
  taxi: { gold: [0xd9dce0, 0x26282d], goldMap: true }, // (the chrome and hubs, the dark bumpers; its chequers gold)
  suv: { gold: [0xd9dce0, 0xb4b8bf, 0x34373d] }, // (the chrome, the hubs, the dark bumpers and cladding)
  minivan: { gold: [0xd8d8d8, 0xc4c8ce, 0xece6cc], black: [0xd6d0c0] }, // (the chrome grille and trim, the hubs; its body-coloured bumpers black; the dark pillars left)
};
const LIFT = 0.006; // (the wreath's offset out from the paint: past the z-fight check's 4 mm, and polygon offset besides)
// a car whose paint carries see-through decals of its own (the Junker's rust, 6 mm out): the wreath further out, over them
export const LEGEND_LIFT = { junker: 0.012 };
// a see-through picture laid on the paint (a decal: transparent, writing no depth) is looked through when finding the paint
const overlay = (o) => { const m = [].concat(o.material)[0]; return !!m && !!m.map && m.transparent && m.depthWrite === false; };
const FACING = 0.7; // (a point shows where the paint's normal is within about 45 degrees of straight out sideways)

// ---- the wreath: a picture drawn once ------------------------------------------------------------------------------
// 128 x 128 RGBA (64 KB of texture memory, about 85 KB with its mipmaps): flat shapes in two golds, nothing else (no
// outlines, veins, shading or bow): two branches of leaf pairs round an open ring, the outer leaves gold, the inner a
// deeper gold. The leaves lie between RING[0] and RING[1] of the picture's size from its centre (the grid keeps only
// the cells that reach that band).
export const WREATH_SIZE = 128;
const RING = [0.17, 0.5], GAP = 0.3; // (and nothing within GAP radians either side of straight up: the ring's open top)
let wreath = null;
export const wreathTexture = () => {
  if (wreath) return wreath;
  if (typeof document === 'undefined' || !document.createElement) return null;
  const S = WREATH_SIZE, canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const c = S / 2, R = S * 0.34;
  ctx.clearRect(0, 0, S, S);
  // a leaf: a pointed oval L long and 2W wide from (x, y), pointing at angle a
  const leaf = (x, y, a, L, W, colour) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(L * 0.45, -W * 1.5, L, 0);
    ctx.quadraticCurveTo(L * 0.45, W * 1.5, 0, 0);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.restore();
  };
  const GOLD = '#e2b33a', DEEP = '#a8791a';
  // one branch, from the foot round one side to near the top (s -1: the left, through angle pi; 1: its mirror)
  const pt = (s, a) => [c - s * R * Math.cos(a), c + R * Math.sin(a)];
  for (const s of [-1, 1]) {
    const a0 = Math.PI / 2 + 0.16, a1 = Math.PI * 1.5 - 0.5, n = 8, k = s < 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, a = a0 + (a1 - a0) * t, [x, y] = pt(s, a), [x2, y2] = pt(s, a + 0.01);
      const along = Math.atan2(y2 - y, x2 - x), L = S * (0.24 - 0.08 * t), W = L * 0.36;
      leaf(x, y, along + k * 0.5, L * 0.88, W * 0.92, DEEP); // (inside the ring)
      leaf(x, y, along - k * 0.6, L, W, GOLD);               // (outside it)
    }
    const [tx, ty] = pt(s, a1), [tx2, ty2] = pt(s, a1 + 0.01);
    leaf(tx, ty, Math.atan2(ty2 - ty, tx2 - tx), S * 0.12, S * 0.12 * 0.3, GOLD);
  }
  wreath = new THREE.CanvasTexture(canvas);
  wreath.colorSpace = THREE.SRGBColorSpace;
  wreath.anisotropy = 4;
  wreath.userData.shared = true;
  return wreath;
};

// ---- the shared materials --------------------------------------------------------------------------------------------
let decalMat = null;
const wreathMaterial = () => {
  if (decalMat) return decalMat;
  const map = wreathTexture();
  if (!map) return null;
  // lit as the body is (Lambert, not Basic), with a little of its own light from the same picture so the gold still
  // reads on a flank turned from the sun; see-through outside the leaves and where the paint does not show (the vertices' alpha), never writing depth; pulled toward the camera
  decalMat = new THREE.MeshLambertMaterial({ map, emissive: 0x4a3c1c, emissiveMap: map, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.5,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  decalMat.userData.shared = true;
  decalMat.userData.blackout = 'hide'; // (render/silhouette.js: not drawn on a blacked-out car)
  return decalMat;
};
const GOLD = new Map(); // the gold version of each trim material (kept: the base car's shared materials stay shared)
const goldFor = (m, keepMap = false) => {
  if (!GOLD.has(m)) {
    const g = new THREE.MeshPhongMaterial({ color: LEGEND_GOLD, emissive: 0x1c1404, specular: 0x9a8040, shininess: 45, side: m.side, vertexColors: !!m.vertexColors,
      map: keepMap ? m.map : null, transparent: m.transparent, alphaTest: m.alphaTest });
    g.userData.shared = true;
    GOLD.set(m, g);
  }
  return GOLD.get(m);
};

// ---- the wreaths, wrapped on the flanks ------------------------------------------------------------------------------
const RAY = new THREE.Raycaster(), FROM = new THREE.Vector3(), DIR = new THREE.Vector3(), M3 = new THREE.Matrix3();
// what a ray along -s x (from outside the car on its side s) meets first at (y, z), in world space (`only`: that mesh alone)
const flankAt = (model, s, y, z, only = null) => {
  FROM.set(s * 20, y, z).applyMatrix4(model.matrixWorld);
  DIR.set(-s, 0, 0).transformDirection(model.matrixWorld);
  RAY.set(FROM, DIR);
  const hit = RAY.intersectObject(only || model, true).find(h => h.object.visible && !h.object.userData.legend && !overlay(h.object));
  if (!hit || !hit.face) return null;
  const normal = hit.face.normal.clone().applyMatrix3(M3.getNormalMatrix(hit.object.matrixWorld)).normalize();
  return { point: hit.point.clone(), normal, object: hit.object };
};
// one flank's wreath: a (grid+1)^2 lattice over the wreath's square, each point laid on the body's paint as a ray along
// x finds it (the body alone: under a tyre or a window too). A point is SHOWN where that paint is the first thing the
// ray meets and faces out sideways; each point carries that as its alpha (1 or 0), so the wreath ends along a clean
// line between a shown point and a hidden one (alpha test at a half) rather than in steps of whole cells. A cell is
// built only where one of its corners is shown, and the wreath's ring passes it. The texture coordinates are turned by
// the tilt (in the picture as seen from that side, so the top leans to the car's front on both flanks)
const wrapFlank = (model, s, [z0, y0, size, tilt = LEGEND.tilt, lean = LEGEND.lean], out) => {
  const lift = LEGEND_LIFT[model.userData.legendModel] ?? LIFT;
  const body = model.userData.body, n = Math.max(10, Math.min(26, Math.round(size / LEGEND.cell))), across = new THREE.Vector3(1, 0, 0).transformDirection(model.matrixWorld);
  const phi = s * (lean === 'rear' ? -1 : 1) * tilt * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const pts = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const dz = (i / n - 0.5) * size, dy = (j / n - 0.5) * size;
      const paint = flankAt(model, s, y0 + dy, z0 + dz, body), first = paint && flankAt(model, s, y0 + dy, z0 + dz);
      const facing = !!paint && paint.normal.dot(across) * s;
      const shown = !!first && first.object === body && facing > FACING && y0 + dy <= (LEGEND_WAIST[model.userData.legendModel] ?? Infinity);
      // (seen from side s, the screen's right is -s z; the picture turned phi anticlockwise there)
      const sx = -s * dz / size, sy = dy / size;
      const u = sx * cos + sy * sin, v = -sx * sin + sy * cos;
      pts.push({ paint: facing > 0.2 ? paint : null, shown, r: Math.hypot(sx, sy), u, v, uv: [0.5 + u, 0.5 + v] });
    }
  }
  const at = (i, j) => pts[j * (n + 1) + i];
  const { pos, nor, uvs, alpha } = out;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      if (!q.every(p => p.paint) || !q.some(p => p.shown)) continue;
      const rs = q.map(p => p.r), near = Math.min(...rs), far = Math.max(...rs);
      if (far < RING[0] || near > RING[1] + 1 / n) continue; // (the ring's band does not pass this cell)
      if (q.every(p => p.v > 0 && Math.abs(Math.atan2(p.u, p.v)) < GAP)) continue; // (all in the open top)
      if (q.some(p => Math.abs(p.paint.point.clone().sub(q[0].paint.point).dot(across)) > size / n)) continue; // (a step in the surface: an edge)
      // two triangles, wound to face out of side s
      const tris = s > 0 ? [[0, 2, 1], [0, 3, 2]] : [[0, 1, 2], [0, 2, 3]];
      for (const k of tris.filter(t => t.some(k => q[k].shown)).flat()) { // (a triangle with nothing shown is left out)
        const p = q[k];
        pos.push(p.paint.point.clone().addScaledVector(p.paint.normal, p.shown ? lift : -LIFT)); // (a hidden point tucked under the paint: no face left lying close beside a part that covers it there)
        nor.push(p.paint.normal);
        uvs.push(...p.uv);
        alpha.push(1, 1, 1, p.shown ? 1 : 0);
      }
    }
  }
};
// one mesh a side holding every wreath of the car's placement on that flank
const flankMesh = (model, s, spots, material) => {
  const out = { pos: [], nor: [], uvs: [], alpha: [] }, { pos, nor, uvs, alpha } = out;
  for (const spot of spots) wrapFlank(model, s, spot, out);
  if (!pos.length) return null;
  const parent = model.userData.body.parent || model;
  parent.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(parent.matrixWorld).invert(), nm = new THREE.Matrix3().getNormalMatrix(toLocal);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos.flatMap(p => p.applyMatrix4(toLocal).toArray()), 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor.flatMap(v => v.clone().applyMatrix3(nm).normalize().toArray()), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(alpha, 4)); // (white, its alpha whether the paint shows there)
  const decal = new THREE.Mesh(geo, material);
  decal.name = 'legend wreath ' + (s > 0 ? 'right' : 'left');
  decal.userData.patchRole = 'decal';
  decal.userData.legend = true;
  decal.renderOrder = 2; // (after the body and any decal of its own)
  parent.add(decal);
  return decal;
};
// the placement for a car: the address's (?legendpos=P3) if the car has it, else its own
export const legendSpots = (car) => (LEGEND.pos && LEGEND_PLACEMENTS[car.model]?.[LEGEND.pos]) || LEGEND_DECAL[car.model] || null;
export const addLegendDecal = (model, car) => {
  const spots = legendSpots(car);
  const material = spots && wreathMaterial();
  if (!material || !model.userData.body) return 0;
  model.updateMatrixWorld(true);
  model.userData.legendModel = car.model;
  return [1, -1].filter(s => flankMesh(model, s, spots, material)).length;
};

// ---- the whole look: the trim gold, the paint a deep gloss black, the wreaths ------------------------------------------
const blackFor = (m) => new THREE.MeshPhongMaterial({ color: LEGEND_BLACK, vertexColors: !!m.vertexColors, side: m.side, specular: 0x24242a, shininess: 40 });
export const addLegend = (model, car) => {
  if (!model || model.userData.legend) return model;
  model.userData.legendTouch?.(); // (a model's own Legendary touch: the Junker's load cover drawn in golds)
  model.userData.legend = true;
  const trim = LEGEND_TRIM[car.model] || {}, gold = new Set(trim.gold || []), black = new Set(trim.black || []);
  const body = model.userData.body, paint = body?.material, blacks = new Map();
  model.traverse((m) => {
    if (!m.isMesh || Array.isArray(m.material) || !m.material.color) return;
    const mat = m.material, hex = mat.color.getHex();
    // the paint (the body's material, on every part that shares it) and any second paint: a deep black with a slight
    // sheen (Phong; the body's colour is still the car's, so paint, scorch and the ghost work as before)
    if (mat === paint || (black.has(hex) && !mat.map)) {
      if (!blacks.has(mat)) blacks.set(mat, blackFor(mat));
      m.material = blacks.get(mat);
    } else if (gold.has(hex) || (trim.goldMap && mat.map && hex === 0xffffff && mat.isMeshLambertMaterial)) m.material = goldFor(mat, !!mat.map);
  });
  if (body) body.material.color.setHex(car.color ?? LEGEND_BLACK);
  if (model.userData.livery) model.userData.livery = () => {}; // (one scheme: no Evil second colours)
  addLegendDecal(model, car);
  return model;
};
