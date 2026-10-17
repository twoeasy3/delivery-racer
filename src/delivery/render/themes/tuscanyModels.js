// ---- Tuscany's models (see tuscany.js): no game state, so the gimmicks page and the cargo page can show them too.
// The theme's three plain obstacles (a stack of wine crates for a crate, a round hay bale for a bale, a terracotta pot
// with a lemon tree in it for a cone: registered in ../obstacleModels.js), its two cargo items (a case of Chianti for
// Good, a stolen marble bust for Evil: registered in ../cargoModels.js) and the geometry of the cypress, which the
// scenery stands in rows. Each model faces local +z, its feet on y = 0.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const put = (group, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const lathe = (profile, segments) => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments);
// (the dark patch under an obstacle, as obstacleModels.js has it)
const grounded = (group, r) => {
  const shade = put(group, new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};

// ---- the obstacles --------------------------------------------------------------------------------------------
// (each built as ONE mesh, its parts merged with their colours as vertex colours, and the dark patch under it: two draw calls
// an obstacle, where a level can have dozens of them along its shoulders)
const merged = (parts) => {
  const pos = [], nor = [], col = [], m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), w = new THREE.Vector3();
  for (const [geometry, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1] of parts) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.applyMatrix4(m.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), w.set(sx, sy, sz)));
    c.set(color);
    for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b);
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
};
const solid = (parts, r) => {
  const group = new THREE.Group();
  put(group, merged(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  return grounded(group, r);
};

// a crate's stand-in: two wooden wine crates, pale pine with darker slats and a red stencilled band, the top one askew on the bottom one and open, six
// bottle necks in red foil standing out of its straw. Drawn at the size of the box it costs (a crate's 1.2 m square and 1.1 m tall) so that what the
// player sees is what the player hits, with a wide dark patch under it
const wineCrates = () => {
  const parts = [];
  const crate = (w, d, y, turn) => {
    const at = (geometry, color, lx, ly, lz) => parts.push([geometry, color, lx * Math.cos(turn) + lz * Math.sin(turn), y + ly, -lx * Math.sin(turn) + lz * Math.cos(turn), 0, turn, 0]);
    at(box(w, 0.52, d), 0xe6c78e, 0, 0, 0);
    for (const dy of [-0.19, 0.19]) at(box(w + 0.03, 0.08, d + 0.03), 0xa9824a, 0, dy, 0);
    for (const x of [-1, 1]) at(box(0.09, 0.54, d + 0.03), 0xa9824a, x * (w / 2 - 0.045), 0, 0);
    for (const z of [-1, 1]) at(box(w * 0.55, 0.2, 0.02), 0xc0272d, 0, 0, z * (d / 2 + 0.017)); // the stencilled band, front and back
  };
  crate(1.2, 1.12, 0.26, 0.05);
  crate(1.12, 1.0, 0.78, -0.2);
  const c = Math.cos(-0.2), s = Math.sin(-0.2);
  parts.push([box(1.0, 0.04, 0.88), 0xd9b85c, 0, 1.03, 0, 0, -0.2, 0]); // the straw
  for (let k = 0; k < 6; k++) {
    const lx = (k % 3 - 1) * 0.32, lz = (k < 3 ? -1 : 1) * 0.22, x = lx * c + lz * s, z = -lx * s + lz * c;
    parts.push([cyl(0.06, 0.08, 0.3, 7), 0x16301c, x, 1.18, z], [cyl(0.064, 0.064, 0.08, 7), 0xd8262b, x, 1.36, z]);
  }
  return solid(parts, 1.1);
};

// a bale's stand-in: two round bales of hay lying side by side on their sides, golden, wound in bands of net, the spiral of the straw on both ends: 2.2 m
// across and 2.2 m deep, a bale's box (its height is 1.5 m, the rolls 1.1 m), so it fills what it costs
const hayRoll = () => {
  const R = 0.55, L = 2.2, parts = [];
  for (const z of [-0.55, 0.55]) {
    parts.push([cyl(R, R, L, 16).rotateZ(Math.PI / 2), 0xdcb953, 0, R, z]);
    for (const x of [-0.7, 0, 0.7]) parts.push([cyl(R + 0.015, R + 0.015, 0.06, 16).rotateZ(Math.PI / 2), 0xb08a2e, x, R, z]);
    for (const x of [-1, 1]) {
      parts.push([new THREE.CircleGeometry(R - 0.01, 16), 0xe9cd7a, x * (L / 2 + 0.002), R, z, 0, x * Math.PI / 2, 0]);
      for (const r of [0.15, 0.32, 0.47]) parts.push([new THREE.RingGeometry(r, r + 0.04, 16), 0xb08a2e, x * (L / 2 + 0.004), R, z, 0, x * Math.PI / 2, 0]); // (the coil of the straw)
    }
  }
  parts.push([cyl(R * 0.8, R * 0.8, L * 0.8, 14).rotateZ(Math.PI / 2), 0xe4c65e, 0, R * 2 - 0.02, 0]); // a third on top of the two, along the crack
  return solid(parts, 1.5);
};

// a cone's stand-in: a big terracotta pot with a lemon tree in it (green over orange: it shows on the grey road), 1.15 times its first size: a metre across
// at the rim against the cone's 0.84, and 1.7 m tall against its 1.12
const terracottaPot = () => {
  const parts = [
    [lathe([[0.2, 0], [0.31, 0.07], [0.37, 0.3], [0.34, 0.45], [0.43, 0.5], [0.43, 0.62], [0.33, 0.62], [0.3, 0.5]], 10), 0xc8622c, 0, 0, 0],
    [cyl(0.3, 0.3, 0.02, 10), 0x4a3220, 0, 0.55, 0],                                       // the earth
    [cyl(0.035, 0.05, 0.4, 5), 0x6b4a2b, 0, 0.8, 0],                                        // the stem
    [new THREE.IcosahedronGeometry(0.42, 0), 0x3f8a35, 0, 1.1, 0, 0, 0, 0, 1, 0.9, 1],      // the crown
  ];
  for (const [x, y, z] of [[0.3, 1.05, 0.2], [-0.28, 1.2, 0.18], [0.05, 0.95, 0.38], [-0.12, 1.28, -0.25]]) parts.push([sphere(0.07, 6, 4), 0xffd83a, x, y, z]);
  return solid(parts.map(([g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1]) => [g, c, x * 1.15, y * 1.15, z * 1.15, rx, ry, rz, sx * 1.15, sy * 1.15, sz * 1.15]), 0.8);
};

export const TUSCANY_OBSTACLES = { wineCrates, hayRoll, terracottaPot };

// ---- the cargo ------------------------------------------------------------------------------------------------
const RED_EYES = new THREE.Color(0xff2a14);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const lettered = (text, colour, ground, w = 256, h = 96) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + ground.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#' + colour.toString(16).padStart(6, '0');
    ctx.font = 'bold ' + Math.round(h * 0.52) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + h * 0.04, w * 0.92);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map });
  } catch { return glow(ground); } // (no canvas to draw on: a headless check)
};

// a case of Chianti (Good): an open wooden case on a straw bed, six bottles in it with red foil at their necks and cream labels,
// CHIANTI burnt into its front; the bottles clink, one leaning and settling now and then
const makeWineCase = () => {
  const group = new THREE.Group(), all = sub(group);
  const pine = lambert(0xe6c78e), slat = lambert(0xa9824a), glass = lambert(0x1c3a20), foil = lambert(0xd8262b), label = lambert(0xf4ead0);
  put(all, box(0.86, 0.3, 0.56), pine, 0, 0.15, 0);
  for (const dy of [0.07, 0.25]) put(all, box(0.85, 0.04, 0.59), slat, 0, dy, 0);       // (their ends inside the end posts, 15 mm under their faces)
  for (const x of [-1, 1]) put(all, box(0.06, 0.34, 0.61), slat, x * 0.41, 0.17, 0);       // (the end posts stand 10 mm proud of the slats and of the box's ends: their faces were one plane, and fought)
  put(all, box(0.7, 0.03, 0.4), lambert(0xd9b85c), 0, 0.31, 0);
  const front = put(all, new THREE.PlaneGeometry(0.62, 0.17), lettered('CHIANTI', 0x7a1a1a, 0xe6c78e), 0, 0.15, 0.287);
  front.renderOrder = 1;
  const bottles = [];
  for (let k = 0; k < 6; k++) {
    const b = sub(all, (k % 3 - 1) * 0.22, 0.32, (k < 3 ? -1 : 1) * 0.12);
    b.name = 'bottle' + k; // (named for render/cargoRules.js)
    put(b, cyl(0.075, 0.08, 0.34, 10), glass, 0, 0.17, 0);
    put(b, cyl(0.035, 0.075, 0.1, 10), glass, 0, 0.39, 0);
    put(b, cyl(0.032, 0.035, 0.12, 8), glass, 0, 0.5, 0);
    put(b, cyl(0.039, 0.039, 0.07, 8), foil, 0, 0.55, 0);
    put(b, cyl(0.086, 0.086, 0.12, 10), label, 0, 0.17, 0);  // (6 mm proud of the glass)
    b.userData.k = k;
    bottles.push(b);
  }
  group.userData.animate = (t) => {
    bottles.forEach((b) => {
      const k = b.userData.k, u = (t * 0.35 + k * 0.17) % 1, lean = Math.pow(Math.max(0, Math.sin(u * Math.PI * 2)), 6);
      b.rotation.z = Math.sin(k * 2.1) * lean * 0.1;
      b.position.y = 0.32 + lean * 0.01;
    });
    all.rotation.y = Math.sin(t * 0.6) * 0.04;
  };
  group.userData.animate(0);
  return group;
};

// a stolen marble bust (Evil): under a dust sheet on its plinth, the sheet sliding off, the bust bare and its eyes lit, shaking
// on the plinth. Calm a lumpy white cone; agitated a head peeking out; furious a head glaring, the plinth hopping
const makeStolenBust = () => {
  const group = new THREE.Group(), all = sub(group);
  const marble = lambert(0xe9e6df), grey = lambert(0x8f8d88), sheetMat = lambert(0xf1ecdd, { side: THREE.DoubleSide }), eyeMat = glow(0x2a2a2a);
  put(all, cyl(0.3, 0.34, 0.5, 4).rotateY(Math.PI / 4), grey, 0, 0.25, 0);                // the plinth
  put(all, box(0.62, 0.06, 0.62), lambert(0xa9a7a1), 0, 0.53, 0);
  const bust = sub(all, 0, 0.56, 0);
  put(bust, cyl(0.24, 0.3, 0.3, 10), marble, 0, 0.15, 0);                                  // shoulders
  put(bust, cyl(0.09, 0.11, 0.14, 8), marble, 0, 0.36, 0);                                 // neck
  const head = sub(bust, 0, 0.55, 0);
  put(head, sphere(0.19, 12, 9), marble, 0, 0, 0).scale.set(0.95, 1.15, 1);
  put(head, box(0.06, 0.13, 0.08), marble, 0, -0.03, 0.2);                                 // nose
  put(head, box(0.3, 0.05, 0.06), marble, 0, 0.07, 0.17);                                  // brow
  for (const x of [-1, 1]) put(head, sphere(0.032, 8, 6), eyeMat, x * 0.075, 0.03, 0.17);
  for (let k = 0; k < 7; k++) put(head, sphere(0.07, 7, 5), marble, Math.sin(k * 0.9 - 1.4) * 0.17, 0.17 - Math.abs(k - 3) * 0.015, -0.02 + Math.cos(k * 0.9 - 1.4) * 0.1); // curls
  // the dust sheet, state 0 ("Under a sheet"): a lathe of 11 rings built once, draped over the bust and closed over the head; BUST_ENV is the outline of
  // the plinth, slab, shoulders, head, curls, nose and brow plus 3 cm, and no ring is ever inside it. States 1 and 2: the bust is bare and the cloth lies
  // in a small solid pile on the ground to one side of the plinth (below). Three discrete states, nothing animated between them
  const SHEET = [[0.5, 0.45], [0.5, 0.5], [0.47, 0.575], [0.34, 0.62], [0.32, 0.8], [0.32, 0.95], [0.32, 1.1], [0.32, 1.24], [0.27, 1.36], [0.15, 1.44], [0, 1.47]];
  const BUST_ENV = [[0.45, 0.47], [0.575, 0.47], [0.6, 0.33], [0.86, 0.28], [1.0, 0.28], [1.15, 0.29], [1.2, 0.29], [1.3, 0.3], [1.35, 0.26], [1.4, 0.14], [1.45, 0.05], [1.47, 0]];
  const envAt = (y) => {
    for (let k = 1; k < BUST_ENV.length; k++) if (y <= BUST_ENV[k][0]) { const [y0, r0] = BUST_ENV[k - 1], [y1, r1] = BUST_ENV[k]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
    return 0;
  };
  // the draped cloth, built once
  const SEG = 12, RINGS = SHEET.length;
  const makeCloth = (parent) => {
    const pos = new Float32Array(RINGS * (SEG + 1) * 3), idx = [];
    for (let i = 0; i < RINGS - 1; i++) for (let k = 0; k < SEG; k++) { const a = i * (SEG + 1) + k, b = a + SEG + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    let n = 0;
    for (let i = 0; i < RINGS; i++) {
      const [r0, y0] = SHEET[i], r = Math.max(envAt(y0), r0) + (r0 > 0 ? 0.005 : 0);
      for (let k = 0; k <= SEG; k++) { const a = k / SEG * Math.PI * 2; pos[n++] = Math.sin(a) * r; pos[n++] = y0; pos[n++] = Math.cos(a) * r; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, sheetMat);
    parent.add(mesh);
    return mesh;
  };
  const draped = makeCloth(all);
  // the fallen cloth: a pile of four squashed lumps (the last one taller, on top) and a flat tongue of cloth trailing out along the ground, 0.62 m to
  // one side of the plinth (+x, the viewer's right from the front), static, in four near whites; sunk a little into the ground so there is no gap
  const pile = (() => {
    const parts = [], X = 0.62, Z = 0.05;
    const lump = (x, z, rx, ry, rz, turn, color, lift = 0) => {
      const g = new THREE.IcosahedronGeometry(1, 0).toNonIndexed(), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const j = 1 + 0.16 * Math.sin(i * 12.9898 + x * 78.2 + z * 37.7); p.setXYZ(i, p.getX(i) * j, p.getY(i) * (1 + 0.1 * Math.sin(i * 4.1 + z * 51)), p.getZ(i) * j); }
      g.computeVertexNormals();
      parts.push([g, color, X + x, ry * 0.55 + lift, Z + z, 0, turn, 0, rx, ry, rz]);
    };
    lump(0, 0, 0.23, 0.13, 0.18, 0.3, 0xf1ecdd);
    lump(0.15, 0.06, 0.18, 0.1, 0.14, -0.6, 0xe6dfcb);
    lump(-0.13, 0.1, 0.16, 0.09, 0.13, 1.0, 0xf6f1e4);
    lump(0.01, -0.13, 0.17, 0.11, 0.12, 0.1, 0xe9e3d0);
    lump(0.02, 0.0, 0.13, 0.12, 0.11, 0.7, 0xf4efe1, 0.1);
    // the tongue: a wavy strip on the ground from the pile toward the front and the plinth's side
    const tongue = new THREE.BufferGeometry(), tp = [], N = 6;
    for (let i = 0; i <= N; i++) {
      const u = i / N, cx = X + 0.1 + u * 0.3 + 0.05 * Math.sin(u * 5), cz = Z + 0.1 + u * 0.46, w = 0.1 + 0.07 * Math.sin(u * Math.PI), h = 0.012 + 0.01 * Math.sin(u * 9);
      tp.push(cx - w * 0.9, h, cz + w * 0.4, cx + w * 0.9, h + 0.004, cz - w * 0.4);
    }
    const ti = [];
    for (let i = 0; i < N; i++) { const a = i * 2; ti.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    tongue.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    tongue.setIndex(ti);
    tongue.computeVertexNormals();
    parts.push([tongue, 0xece6d4, 0, 0, 0]);
    const mesh = new THREE.Mesh(merged(parts), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    group.add(mesh);
    return mesh;
  })();
  const tag = put(all, new THREE.PlaneGeometry(0.2, 0.1), lettered('STOLEN', 0x8a1a1a, 0xf1ecdd, 160, 64), 0, 0.8, 0.335);
  const show = (n) => { draped.visible = tag.visible = n === 0; pile.visible = n > 0; };
  show(0);
  const state = { w: [1, 0, 0], target: 0 };
  group.userData.state = 0;
  group.userData.setState = (n, snap = false) => {
    state.target = Math.max(0, Math.min(2, Math.round(n) || 0));
    show(state.target);
    group.userData.state = state.target;
    if (snap) for (let i = 0; i < 3; i++) state.w[i] = i === state.target ? 1 : 0;
  };
  const pose = (t, a, f) => {
    eyeMat.color.setHex(0x2a2a2a).lerp(RED_EYES, clamp01(a * 0.35 + f * 0.65));
    head.rotation.y = Math.sin(t * (2 + f * 9)) * (0.1 * a + 0.5 * f);
    head.rotation.z = Math.sin(t * 7.3) * 0.12 * f;
    const hop = Math.pow(Math.max(0, Math.sin(t * 9)), 2) * f;
    all.position.y = hop * 0.09;
    all.rotation.z = Math.sin(t * 31) * 0.025 * f + Math.sin(t * 3) * 0.015 * a;
  };
  group.userData.animate = (t) => {
    for (let i = 0; i < 3; i++) state.w[i] = i === state.target ? 1 : 0; // (three states and no transition: switching is instant)
    pose(t, state.w[1], state.w[2]);
  };
  group.userData.animate(0);
  return group;
};

export const TUSCANY_CARGO = { winecase: makeWineCase, stolenbust: makeStolenBust };

// ---- the cypress: a tall dark flame, five-sided, a hair of green all the way to the ground (35 triangles). 1 m across at the foot
// and 1 m tall before it is scaled; the scenery stands it in rows and on the skyline
export const cypressGeometry = () => lathe([[0, 0], [0.34, 0.01], [0.5, 0.25], [0.46, 0.55], [0.27, 0.82], [0, 1]], 5);
