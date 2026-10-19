// ---- the oil field's shapes and materials (render/themes/oilfield.js lays them out): the BATCH that merges every standing
// thing of a stretch of road into ONE vertex-coloured mesh (flat shaded: no normals stored), the NODDING DONKEY (a pumpjack:
// its fixed frame merged with the rest, its moving parts one instanced mesh whose vertex shader nods the beam, turns the
// crank and swings the pitman arms on the game's clock: no work on the CPU), the FLARE's flame (an instanced lathe whose
// vertex shader flickers it), the hazard stripe texture, the hazy sky and the oil field on the horizon (painted once).
// No lights, no figures, no words.
import * as THREE from 'three';

// ---- unit shapes, as plain arrays (position, index): what a batch copies, turned and scaled, into its mesh
// (a shape with colours of its own, a donkey's frame: each vertex's colour times the colour it is added in)
const unit = (geometry) => {
  const g = geometry;
  return { pos: g.attributes.position.array, col: g.attributes.color ? g.attributes.color.array : null, idx: g.index ? g.index.array : null, n: g.attributes.position.count };
};
export const SHAPES = {
  cube: unit(new THREE.BoxGeometry(1, 1, 1)),
  tube: unit(new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1)),          // (a pipe, a post, a stack: upright, 1 across, 1 high)
  tank: unit(new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1)),         // (a storage tank's shell)
  cone: unit(new THREE.ConeGeometry(0.5, 1, 16, 1)),                  // (a tank's roof)
  ball: unit(new THREE.IcosahedronGeometry(0.5, 0)),                  // (a bush, a drift of sand)
  rock: unit(new THREE.DodecahedronGeometry(0.5, 0)),
  tuft: unit(new THREE.ConeGeometry(0.5, 1, 5, 1)),
  disc: unit(new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1)),
};

// ---- a batch: what a stretch of road holds, in one mesh. add(shape, colour, matrix) copies the shape in, placed
const tint = new THREE.Color(), v = new THREE.Vector3();
export const batch = (rand = Math.random) => { // (rand: the layout's own dice, so the colours are the same every run)
  const pos = [], col = [], idx = [];
  let n = 0;
  return {
    add(shape, color, m, jitter = 0.04) {
      tint.set(color);
      if (jitter) tint.multiplyScalar(1 - jitter + rand() * jitter * 2); // (no two quite the same)
      const P = shape.pos, K = shape.col;
      for (let i = 0; i < shape.n; i++) {
        v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(m);
        pos.push(v.x, v.y, v.z);
        if (K) col.push(tint.r * K[i * 3], tint.g * K[i * 3 + 1], tint.b * K[i * 3 + 2]); else col.push(tint.r, tint.g, tint.b);
      }
      if (shape.idx) for (let i = 0; i < shape.idx.length; i++) idx.push(shape.idx[i] + n);
      else for (let i = 0; i < shape.n; i++) idx.push(i + n);
      n += shape.n;
    },
    // a quad of its own (four corners [x, y, z], in turn): a piece of something built along the road, a pipe's side
    quad(a, b, c, d, color) {
      tint.set(color);
      for (const q of [a, b, c, d]) { pos.push(q[0], q[1], q[2]); col.push(tint.r, tint.g, tint.b); }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
      n += 4;
    },
    get count() { return idx.length / 3; },
    geometry() {
      if (!n) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeBoundingSphere();
      return g;
    },
  };
};

// ---- THE NODDING DONKEY, in its own frame: x across, y up, z along its beam (the horsehead toward +z), 1 = a 9 m unit
// The beam pivots on the samson post at P; the crank turns about C behind it; the pitman arms join the crank pins to the
// beam's tail. theta (the crank's turn) runs on the clock; the beam's angle follows it: sin a = sin(theta) / TAIL, so the
// pitman arms keep their length (the tail is TAIL m behind P, the pins 1 m from C, the arms PITMAN long)
export const DONKEY = { P: [0, 5, 0], C: [0, 2.2, -3.2], TAIL: 3.2, HEAD: 4.15, PITMAN: 2.8 };
const box = (w, h, l) => new THREE.BoxGeometry(w, h, l);
// a part of a shape: the geometry moved into place, a colour, and (moving parts) which part it is and how far up the arm
const part = (list, geometry, color, x, y, z, rx = 0, move = 0, along = false) => {
  geometry.rotateX(rx).translate(x, y, z);
  list.push({ geometry, color, move, along });
};
// a strut from a to b (each [x, y, z]): w thick
const strut = (list, a, b, w, color) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const g = box(w, len, w), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q).translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  list.push({ geometry: g, color, move: 0 });
};
const bake = (list, moving) => {
  const pos = [], col = [], mv = [], idx = [];
  let n = 0;
  for (const { geometry, color, move, along } of list) {
    const p = geometry.attributes.position, ix = geometry.index;
    tint.set(color);
    // (a pitman arm is built from y 0 to 1: how far up it a vertex is says where between the crank pin and the tail it goes)
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); col.push(tint.r, tint.g, tint.b); mv.push(move, along ? p.getY(i) : 0); }
    for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + n);
    n += p.count;
    geometry.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (moving) g.setAttribute('aMove', new THREE.Float32BufferAttribute(mv, 2));
  g.setIndex(idx);
  return g;
};
const STEEL = 0x4c5157, GREY = 0x7d8288, OXIDE = 0x8a3b26;
// its fixed frame (merged into the batch with everything else): the skid, the samson post, the gearbox and its stand, the
// motor and belt guard, the wellhead under the horsehead with its valve
export const donkeyFrame = (paint = 0xffffff) => { // (white: the colour it is added in paints it)
  const L = [];
  part(L, box(1.6, 0.35, 9.4), STEEL, 0, 0.18, -0.7);                                        // the skid
  for (const x of [-1, 1]) for (const z of [-1, 1]) strut(L, [x * 0.8, 0.35, z * 1.1], [x * 0.24, 4.85, 0], 0.22, paint); // the samson post's legs
  part(L, box(0.7, 0.3, 0.7), STEEL, 0, 4.9, 0);                                             // the saddle bearing
  part(L, box(1.3, 1.2, 1.9), STEEL, 0, 0.95, -3.2);                                         // the gearbox's stand
  part(L, box(0.8, 1.5, 1.6), paint, 0, 2.2, -3.2);                                         // the gearbox
  part(L, box(0.85, 0.85, 1.3), GREY, 0, 0.78, -5.2);                                        // the motor
  part(L, box(0.18, 1.4, 2.2), paint, 0.62, 1.55, -4.25, -0.55);                              // the belt guard
  part(L, new THREE.CylinderGeometry(0.16, 0.16, 1.1, 6), GREY, 0, 0.55, DONKEY.HEAD);         // the wellhead...
  part(L, new THREE.CylinderGeometry(0.28, 0.28, 0.25, 8), GREY, 0, 0.75, DONKEY.HEAD);
  part(L, box(0.9, 0.12, 0.12), GREY, 0, 0.95, DONKEY.HEAD);
  part(L, new THREE.CylinderGeometry(0.22, 0.22, 0.06, 8), 0xc8321f, 0.45, 0.95, DONKEY.HEAD, 0); // ...its valve wheel
  return unit(bake(L, false));
};
// its moving parts, one geometry with aMove = (part, along): 1 the beam and horsehead, 2 the crank arms and counterweights,
// 3 the pitman arms, 4 the polished rod and bridle (rising and falling with the head)
export const donkeyMoving = (paint = 0xffffff, head = 0xffffff) => { // (white: each donkey's instance colour paints it)
  const L = [], [, py] = DONKEY.P, [, cy, cz] = DONKEY.C;
  part(L, box(0.42, 0.62, 6.9), paint, 0, py + 0.32, -0.15, 0, 1);                             // the walking beam
  part(L, box(0.55, 1.15, 1.05), head, 0, py + 0.35, 3.62, 0, 1);                              // the horsehead: its top...
  part(L, box(0.5, 1.5, 0.62), head, 0, py - 0.75, 3.95, 0, 1);                                 // ...and its face, down to the bridle
  part(L, box(1.8, 0.22, 0.32), STEEL, 0, py - 0.02, -DONKEY.TAIL, 0, 1);                      // the equaliser at the tail
  for (const x of [-1, 1]) {
    part(L, box(0.16, 0.34, 1.5), STEEL, x * 0.55, cy, cz + 0.3, 0, 2);                         // a crank arm, out to its pin (+z at rest)
    part(L, box(0.3, 1.0, 0.9), OXIDE, x * 0.55, cy, cz + 0.55, 0, 2);                          // its counterweight, round the arm
    part(L, box(0.16, 1, 0.16).translate(0, 0.5, 0), STEEL, x * 0.8, 0, 0, 0, 3, true);         // a pitman arm (y 0..1: pin to tail), outside them
  }
  part(L, box(0.06, 2.0, 0.06), 0x2a2c30, 0, 2.55, DONKEY.HEAD, 0, 4);                          // the bridle...
  part(L, box(0.5, 0.1, 0.1), STEEL, 0, 1.55, DONKEY.HEAD, 0, 4);                               // ...its carrier bar
  part(L, box(0.07, 0.6, 0.07), 0xc9ccd0, 0, 1.25, DONKEY.HEAD, 0, 4);                          // ...and the polished rod
  return bake(L, true);
};
// the material of the moving parts (one for the level): flat shaded, its vertex shader the motion. uTime: s of game time
// (render/gameclock.js: it holds still while the game is paused). Each donkey keeps its own pace and phase, from where it stands
export const donkeyMaterial = () => {
  const uniforms = { uTime: { value: 0 } };
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    const [, py] = DONKEY.P, [, cy, cz] = DONKEY.C, f = (x) => x.toFixed(3);
    shader.vertexShader = 'attribute vec2 aMove;\nuniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      #ifdef USE_INSTANCING
        float ph = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
      #else
        float ph = 0.3;
      #endif
      float th = uTime * (0.7 + 0.4 * ph) + ph * 6.2832;       // the crank's turn: 5.5 to 9 s a stroke
      float sa = sin(th) / ${f(DONKEY.TAIL)}, ca = sqrt(1.0 - sa * sa);   // the beam's angle (its sine, its cosine)
      vec3 P = vec3(0.0, ${f(py)}, 0.0), C = vec3(0.0, ${f(cy)}, ${f(cz)});
      if (aMove.x > 0.5 && aMove.x < 1.5) { vec3 d = transformed - P; transformed = P + vec3(d.x, d.y * ca - d.z * sa, d.y * sa + d.z * ca); }
      else if (aMove.x > 1.5 && aMove.x < 2.5) { vec3 d = transformed - C; float s = sin(-th), c = cos(-th); transformed = C + vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c); }
      else if (aMove.x > 2.5 && aMove.x < 3.5) {
        vec3 pin = C + vec3(0.0, sin(th), cos(th)), tail = P + vec3(0.0, ${f(DONKEY.TAIL)} * sa, -${f(DONKEY.TAIL)} * ca - 0.0);
        transformed = mix(pin, tail, aMove.y) + vec3(position.x, 0.0, position.z);
      }
      else if (aMove.x > 3.5) transformed.y -= ${f(DONKEY.HEAD)} * sa;
    `);
  };
  m.userData.uniforms = uniforms;
  return m;
};

// ---- THE FLARE: a flame on top of its stack, a lathe 1 m high (its foot at 0), yellow-white at the foot, orange, red at the
// tip; the vertex shader licks it about, stretches and shrinks it (each flare its own phase, from where it stands)
export const flameGeometry = () => {
  const prof = [[0.0, 0], [0.2, 0.02], [0.34, 0.14], [0.36, 0.32], [0.28, 0.55], [0.16, 0.78], [0.05, 0.94], [0.0, 1]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 9), p = g.attributes.position, c = [];
  const lo = new THREE.Color(0xfff2b8), mid = new THREE.Color(0xffa22e), hi = new THREE.Color(0xe2461c);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); tint.copy(y < 0.4 ? lo : mid).lerp(y < 0.4 ? mid : hi, y < 0.4 ? y / 0.4 : (y - 0.4) / 0.6); c.push(tint.r, tint.g, tint.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  return g;
};
export const flameMaterial = () => {
  const uniforms = { uTime: { value: 0 } };
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      #ifdef USE_INSTANCING
        float ph = fract(sin(dot(instanceMatrix[3].xz, vec2(39.346, 11.135))) * 24634.6345) * 40.0;
      #else
        float ph = 1.0;
      #endif
      float h = position.y;
      transformed.y *= 1.0 + 0.16 * sin(uTime * 8.3 + ph) + 0.1 * sin(uTime * 13.1 + ph * 1.7);
      transformed.xz *= 1.0 + 0.12 * sin(uTime * 10.7 + ph * 0.6 + h * 4.0);
      transformed.x += h * (0.18 * sin(uTime * 3.1 + ph + h * 3.0) + 0.22 * h);   // licking about, leaning with the wind
      transformed.z += h * 0.14 * cos(uTime * 2.7 + ph * 1.3 + h * 2.5);
    `);
  };
  m.userData.uniforms = uniforms;
  return m;
};

// ---- the hazard stripes: yellow and black on the diagonal, 64 x 64 (16 KB), repeating along a barrier
let stripes = null;
export const stripeTexture = () => {
  if (stripes) return stripes;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f2c21d'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#1c1c1e';
  for (let k = -2; k < 3; k++) { g.beginPath(); g.moveTo(k * 32, 64); g.lineTo(k * 32 + 16, 64); g.lineTo(k * 32 + 80, 0); g.lineTo(k * 32 + 64, 0); g.fill(); }
  stripes = new THREE.CanvasTexture(c);
  stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
  stripes.colorSpace = THREE.SRGBColorSpace;
  stripes.userData.shared = true;
  return stripes;
};

// ---- the oil field far off, all round the horizon: a band 1024 x 64 (256 KB) painted once, its things already faded into
// the haze (it hangs beyond the fog, drawn without it): pumpjacks, derricks, tank farms, a refinery's columns, flares
export const horizonTexture = (haze, dark) => {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 64;
  const g = c.getContext('2d'), H = 64, base = H - 2;
  let seed = 911;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ink = (t) => { const a = new THREE.Color(haze), b = new THREE.Color(dark); a.lerp(b, t); return '#' + a.getHexString(); };
  g.clearRect(0, 0, 1024, H);
  // a low rise of land, the faintest
  g.fillStyle = ink(0.18); g.beginPath(); g.moveTo(0, base);
  for (let x = 0; x <= 1024; x += 16) g.lineTo(x, base - 3 - 3 * Math.sin(x / 1024 * Math.PI * 6) - 2 * Math.sin(x / 1024 * Math.PI * 14 + 1));
  g.lineTo(1024, H); g.lineTo(0, H); g.fill();
  for (let x = 6; x < 1024; x += 14 + rnd() * 30) {
    const k = rnd(), t = 0.3 + rnd() * 0.25;
    g.fillStyle = ink(t); g.strokeStyle = ink(t); g.lineWidth = 1;
    if (k < 0.45) { // a pumpjack: post, beam, head
      const s = 3 + rnd() * 3;
      g.fillRect(x, base - s * 1.4, 1, s * 1.4); g.save(); g.translate(x, base - s * 1.5); g.rotate((rnd() - 0.5) * 0.4); g.fillRect(-s * 1.3, -0.5, s * 2.4, 1.6); g.fillRect(s * 1.0, -0.5, 1.4, s * 0.9); g.restore();
      g.fillRect(x - s * 1.4, base - 1, s * 2.6, 1);
    } else if (k < 0.62) { // a derrick: a tall thin A with a cross or two
      const s = 12 + rnd() * 14;
      g.beginPath(); g.moveTo(x - s * 0.18, base); g.lineTo(x - 1, base - s); g.lineTo(x + 1, base - s); g.lineTo(x + s * 0.18, base); g.stroke();
      for (let y = 0.25; y < 0.9; y += 0.25) { const w = s * 0.18 * (1 - y); g.beginPath(); g.moveTo(x - w, base - s * y); g.lineTo(x + w, base - s * y); g.stroke(); }
    } else if (k < 0.82) { // tanks in a row
      const n = 2 + Math.floor(rnd() * 3), r = 3 + rnd() * 3;
      for (let i = 0; i < n; i++) g.fillRect(x + i * r * 2.3, base - r * 1.5, r * 2, r * 1.5);
      x += n * r * 2.3;
    } else if (k < 0.92) { // a refinery: columns of different heights, a flare with its flame
      for (let i = 0; i < 4; i++) { const h = 8 + rnd() * 16; g.fillRect(x + i * 5, base - h, 3, h); }
      g.fillRect(x + 22, base - 26, 1.5, 26);
      g.fillStyle = 'rgba(255,150,50,0.85)'; g.beginPath(); g.ellipse(x + 23, base - 29, 1.6, 3.4, 0, 0, Math.PI * 2); g.fill();
      x += 30;
    } else { // a flare alone
      g.fillRect(x, base - 18, 1.5, 18);
      g.fillStyle = 'rgba(255,150,50,0.8)'; g.beginPath(); g.ellipse(x + 0.8, base - 21, 1.4, 3, 0, 0, Math.PI * 2); g.fill();
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
};

// ---- the sky: a dome, the heat haze white-hot at the horizon going up into a washed-out blue, the air shimmering low down
export const skyMaterial = (haze, top) => new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, haze: { value: new THREE.Color(haze) }, top: { value: new THREE.Color(top) }, clear: { value: 1 } },
  vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uTime; uniform vec3 haze; uniform vec3 top; uniform float clear; varying vec3 vDir;
    void main() {
      float y = max(vDir.y, 0.0);
      vec3 col = mix(haze, top, smoothstep(0.02, 0.6, y) * clear);
      float low = 1.0 - smoothstep(0.0, 0.07, y);
      col += low * clear * 0.03 * sin(atan(vDir.z, vDir.x) * 900.0 + uTime * 2.6) * sin(y * 600.0 - uTime * 4.1);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
