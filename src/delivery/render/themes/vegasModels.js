// ---- THE LAS VEGAS STRIP'S MODELS AND MATERIALS (render/themes/vegas.js lays them out) ------------------------------------
// Only loaded with the theme (a dynamic import: themes/index.js). Nothing here is read by the rules. Every light is drawn,
// none is a real one: the signs, bulbs, screens and jets are shaders on cheap geometry with one time uniform each.
//   neonMaterial   ONE material for every sign, marquee, bulb border, canopy, crown band and billboard face of the Strip:
//                  boxes, instanced (road.js's `instances`, styled: the instanced attribute aStyle per box), its face drawn
//                  in the fragment shader from where on the face a pixel is, in metres (as cityModels.js's facades): a
//                  KIND (NEON below), a seed and a speed. Abstract only: bars that read as words too far off to read,
//                  chevrons, bulbs, colour fields; no letters, no brand, no figure.
//   jetMaterial    the dancing fountains' jets: thin cones whose height the vertex shader sets by the clock, row by row
//   orbMaterial    the big sphere's skin of LEDs: colour fields that change every few seconds (dimmer by day)
//   latticeMaterial  the tower replica's iron: a lattice cut out of its faces (discard), lit gold at night
//   the shapes      a palm's crown, the monorail's car, the observation wheel, the frustum the tower is made of, the
//                  desert mountains' ring round the horizon
// Canvas textures: none. (The city's one wall texture, 256 x 256, is shared: cityModels.js.)
import * as THREE from 'three';

// ---- the neon kinds: what a box's faces are drawn as (aStyle.x) ----
export const NEON = {
  SOLID: 0,    // its colour, lit: a tube, a lamp, a crown's band
  MARQUEE: 1,  // a dark board, a border of chasing bulbs, rows of light bars scrolling (a casino's marquee)
  BULBS: 2,    // bulbs all over it in a grid, a wave of brightness running through them (a canopy's underside, a pylon)
  ARROW: 3,    // chevrons running along it, a bulb border (an arrow sign)
  TUBE: 4,     // a neon tube: bright, a slow pulse, the odd flicker
  SCREEN: 5,   // an LED screen: big fields of colour, changing every few seconds, a pixel grid close up (a billboard)
  BOARD: 6,    // a plain sign board: its colour, a bulb border, still (a chapel's, a pylon's frame)
};

const HEAD = `
attribute vec4 aStyle;
varying vec4 vNeon;
varying vec4 vNFac;
varying vec3 vNObjN;
`;
// (vNFac: x, m across the face from its left edge; y, m up it from its foot; z, its width; w, its height. vNObjN: the face's normal
// in the box's own terms)
const BODY = `
  vNeon = aStyle;
  #ifdef USE_INSTANCING
    vec3 nsc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  #else
    vec3 nsc = vec3(1.0);
  #endif
  vec3 nlp = position * nsc;
  vNObjN = normal;
  if (abs(normal.y) > 0.5) vNFac = vec4(nlp.x + 0.5 * nsc.x, nlp.z + 0.5 * nsc.z, nsc.x, nsc.z);
  else if (abs(normal.x) > 0.5) vNFac = vec4(nlp.z * sign(normal.x) + 0.5 * nsc.z, nlp.y + 0.5 * nsc.y, nsc.z, nsc.y);
  else vNFac = vec4(-nlp.x * sign(normal.z) + 0.5 * nsc.x, nlp.y + 0.5 * nsc.y, nsc.x, nsc.y);
`;
const FRAG = `
uniform float uTime;
uniform float uNight;
varying vec4 vNeon;
varying vec4 vNFac;
varying vec3 vNObjN;
float nHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float nBand(float x, float a, float b, float w) { return clamp(min(x - a, b - x) / max(w, 1e-4) + 0.5, 0.0, 1.0); }
vec3 nPal(float h) {
  if (h < 0.17) return vec3(1.0, 0.16, 0.5);
  if (h < 0.34) return vec3(0.15, 0.85, 1.0);
  if (h < 0.5) return vec3(1.0, 0.78, 0.15);
  if (h < 0.67) return vec3(0.55, 0.25, 1.0);
  if (h < 0.84) return vec3(0.25, 1.0, 0.45);
  return vec3(1.0, 0.35, 0.12);
}
// a bulb at the middle of each cell of a grid step m apart: 1 in it, softened; and which cell
float nBulb(vec2 f, float step, float r, vec2 fw) {
  vec2 c = (fract(f / step) - 0.5) * step;
  float d = length(c);
  return clamp((r - d) / max(max(fw.x, fw.y), 1e-4) + 0.5, 0.0, 1.0);
}
void neonFace(inout vec3 col) {
  int kind = int(vNeon.x + 0.5);
  float seed = floor(vNeon.y + 0.5) / 1000.0, speed = vNeon.z;
  vec2 f = vNFac.xy, fw = fwidth(f);
  float W = vNFac.z, H = vNFac.w, t = uTime * (0.6 + speed);
  bool night = uNight > 0.5;
  float lit = night ? 1.25 : 0.95;           // (a sign by day is still lit, but the day is brighter than it)
  vec3 warm = vec3(1.0, 0.86, 0.55);
  if (kind == 0) { col *= lit; return; }
  if (kind == 4) { col *= lit * (0.92 + 0.08 * sin(uTime * 3.0 + seed * 40.0)) * (0.75 + 0.25 * step(0.03, fract(uTime * 0.37 + seed * 9.0))); return; }
  bool cap = abs(vNObjN.y) > 0.5;
  // the bulb border (all but the screen and the bulb field): bulbs 0.5 m apart round the face's edge, chasing round
  float edge = min(min(f.x, W - f.x), min(f.y, H - f.y));
  float border = (kind == 2 || kind == 5 || cap) ? 0.0 : step(edge, 0.42);
  float along = f.y < 0.42 ? f.x : f.y > H - 0.42 ? W + H + (W - f.x) : f.x < 0.42 ? 2.0 * W + H + (H - f.y) : W + f.y; // (round the edge)
  float cell = floor(along / 0.5);
  float chase = step(0.34, fract(cell / 3.0 - t * 1.4 * (kind == 6 ? 0.0 : 1.0)));
  float bulb = border * nBulb(vec2(along, edge), 0.5, 0.13, fw);
  vec3 bulbCol = warm * (night ? mix(0.25, 1.6, chase) : mix(0.55, 1.05, chase));
  vec3 board = col * (night ? 0.1 : 0.22) + vec3(night ? 0.01 : 0.05);
  vec3 outCol = col * lit;
  if (cap && kind != 2) { col = col * (night ? 0.18 : 0.35); return; }
  if (kind == 1) { // rows of light bars, as words seen too far off to read, the rows taking turns to scroll and to blink
    vec2 p = f - 0.42;
    float rowH = 0.95, row = floor(p.y / rowH), inRow = p.y - row * rowH;
    float rh = nHash(vec2(row, seed * 31.0));
    float x = p.x + (rh < 0.5 ? t * 1.8 * (rh < 0.25 ? 1.0 : -1.0) : 0.0);
    float word = floor(x / 2.2), wx = x - word * 2.2, wl = 0.8 + 1.2 * nHash(vec2(word, row + seed * 17.0));
    float bar = nBand(inRow, 0.2, 0.75, fw.y) * nBand(wx, 0.0, wl, fw.x) * nBand(fract(wx / 0.36), 0.0, 0.72, fw.x / 0.36);
    float blink = rh > 0.75 ? step(0.3, fract(t * 0.6 + rh)) : 1.0;
    vec3 letters = mix(col, nPal(fract(rh * 7.0 + seed)), 0.35) * (night ? 1.5 : 1.0);
    outCol = mix(board, letters, bar * blink * step(0.42, f.x) * step(f.x, W - 0.42) * step(0.42, f.y) * step(f.y, H - 0.42));
  } else if (kind == 2) { // bulbs all over, a wave running through them
    float b = nBulb(f, 0.45, 0.12, fw);
    vec2 id = floor(f / 0.45);
    float wave = 0.5 + 0.5 * sin(id.x * 0.7 + id.y * 0.45 - t * 4.0 + seed * 20.0);
    outCol = mix(board, mix(col, warm, 0.45) * (night ? 0.35 + 1.4 * wave : 0.6 + 0.45 * wave), b);
  } else if (kind == 3) { // chevrons running along the face
    float u = fract((f.x - abs(f.y - H * 0.5) * 0.9) / 1.6 - t * 0.9);
    float chev = nBand(u, 0.0, 0.4, fwidth(u)) * nBand(f.y, 0.55, H - 0.55, fw.y);
    outCol = mix(board, col * (night ? 1.5 : 1.0), chev);
  } else if (kind == 5) { // an LED screen: fields of colour, a new picture every 6 s
    float scene = floor(uTime / 6.0 + seed * 7.0), u = f.x / max(W, 0.1), v = f.y / max(H, 0.1);
    float k = nHash(vec2(scene, seed));
    vec3 a = nPal(k), b2 = nPal(fract(k + 0.37)), c = nPal(fract(k + 0.61));
    vec3 pic;
    if (k < 0.33) pic = mix(a, b2, step(0.5, fract(u * 3.0 + v * 1.5 - uTime * 0.2)));                          // (stripes)
    else if (k < 0.66) pic = mix(mix(a, b2, v), c, smoothstep(0.32, 0.3, length(vec2((u - 0.5) * W / H, v - 0.55))));  // (a disc on a gradient)
    else pic = mix(a, c, step(0.5, fract(floor(u * 6.0) * 0.5 + floor(v * 3.0) * 0.5 + floor(uTime * 1.5) * 0.5)));       // (a checker that flips)
    float grid = nBand(fract(f.x / 0.18), 0.12, 0.92, fw.x / 0.18) * nBand(fract(f.y / 0.18), 0.12, 0.92, fw.y / 0.18);
    float frame = step(0.28, edge);
    outCol = mix(vec3(0.03), pic * (night ? 1.25 : 0.85) * (0.75 + 0.25 * grid), frame);
  } else { // a still board
    outCol = col * (night ? 0.9 : 0.85);
  }
  col = mix(outCol, bulbCol, bulb);
  if (border > 0.5 && bulb < 0.5) col = mix(col, vec3(night ? 0.02 : 0.08), 0.8); // (the bulbs' dark strip)
}
`;
const neonCache = {};
export const neonMaterial = ({ night = false } = {}) => {
  const key = night ? 'night' : 'day';
  if (neonCache[key]) return neonCache[key];
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  material.userData.styled = true; // (road.js's instances: an instanced attribute aStyle per mesh)
  material.userData.shared = true;
  const uniforms = { uTime: { value: 0 }, uNight: { value: night ? 1 : 0 } };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = HEAD + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + BODY);
    shader.fragmentShader = FRAG + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  neonFace(diffuseColor.rgb);');
  };
  material.customProgramCacheKey = () => 'vegas-neon-1';
  neonCache[key] = material;
  return material;
};

// ---- the fountain's jets: a cone from y = 0 to its height, which the clock sets (aStyle: x, its place along the basin in m;
// y, its row; z, a seed). The show changes every 9 s: a wave rolling along, all of them bursting up together, rows by turns
export const jetMaterial = ({ night = false } = {}) => {
  const material = new THREE.MeshBasicMaterial({ color: night ? 0xcdeeff : 0xf2f9ff, transparent: true, opacity: night ? 0.85 : 0.78, depthWrite: false,
    blending: night ? THREE.AdditiveBlending : THREE.NormalBlending });
  material.userData.styled = true;
  const uniforms = { uTime: { value: 0 } };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'attribute vec4 aStyle;\nuniform float uTime;\nvarying float vUp;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float x = aStyle.x, row = aStyle.y, sd = aStyle.z;
      float show = uTime / 9.0, which = mod(floor(show), 3.0), into = fract(show);
      float wave = 3.5 + 13.0 * pow(max(0.0, sin(x * 0.18 - uTime * 2.4)), 2.0);
      float burst = 3.0 + 20.0 * pow(max(0.0, sin(uTime * 1.3)), 3.0) * (1.0 - row * 0.2);
      float rows = 3.5 + 14.0 * max(0.0, sin(uTime * 2.2 + row * 2.1)) * (0.8 + 0.2 * sin(x * 0.5));
      float a = which < 0.5 ? wave : which < 1.5 ? burst : rows;
      float b = which < 0.5 ? burst : which < 1.5 ? rows : wave;
      float h = mix(a, b, smoothstep(0.85, 1.0, into)) * (0.9 + 0.2 * sd);
      float up = position.y + 0.5;
      vUp = up;
      transformed.y = up * h;
      transformed.xz *= mix(1.0, 0.3, up) + 1.6 * up * up * up; // (narrowing up the column, then the spray at the top fanning out)`);
    shader.fragmentShader = 'varying float vUp;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.a *= 1.0 - 0.8 * vUp * vUp;');
  };
  material.customProgramCacheKey = () => 'vegas-jet-1';
  return material;
};

// ---- the big sphere's LED skin: its colour by where on the sphere (from the geometry's own position) and the clock: a new
// picture every 7 s (bands of colour turning, a checker, a glowing disc rising), a dot grid close up; dim by day
export const orbMaterial = ({ night = false } = {}) => {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const uniforms = { uTime: { value: 0 }, uNight: { value: night ? 1 : 0 } };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec3 vSph;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSph = normalize(position);');
    shader.fragmentShader = `uniform float uTime;\nuniform float uNight;\nvarying vec3 vSph;\n
      vec3 oPal(float h) { return 0.5 + 0.5 * cos(6.2832 * (h + vec3(0.0, 0.33, 0.67))); }
      float oHash(float x) { return fract(sin(x * 91.7) * 43758.5); }\n` + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float lon = atan(vSph.z, vSph.x) / 6.2832 + 0.5, lat = vSph.y * 0.5 + 0.5;
      float scene = floor(uTime / 7.0), k = oHash(scene);
      vec3 pic;
      if (k < 0.34) pic = oPal(lat * 1.2 + lon * 2.0 - uTime * 0.12 + k);
      else if (k < 0.67) pic = mix(oPal(k), oPal(k + 0.5), step(0.5, fract(floor(lon * 24.0) * 0.5 + floor(lat * 10.0) * 0.5 + floor(uTime) * 0.5)));
      else { float d = length(vec2((lon - fract(uTime * 0.03 + k)) * 3.0, lat - 0.55)); pic = mix(oPal(k + 0.6) * 0.35, vec3(1.0, 0.85, 0.4), smoothstep(0.3, 0.26, d)); }
      vec2 g = vec2(lon * 260.0, lat * 110.0), fg = fwidth(g);
      vec2 c = abs(fract(g) - 0.5);
      float dot = clamp((0.36 - max(c.x, c.y)) / max(max(fg.x, fg.y), 1e-3) + 0.5, 0.0, 1.0);
      dot = mix(dot, 0.72, clamp(max(fg.x, fg.y) - 0.5, 0.0, 1.0)); // (far off: the grid averaged, not shimmering)
      float bright = uNight > 0.5 ? 1.35 : 0.55;
      diffuseColor.rgb = mix(vec3(uNight > 0.5 ? 0.01 : 0.12), pic * bright, dot);`);
  };
  material.customProgramCacheKey = () => 'vegas-orb-1';
  return material;
};

// ---- the tower replica's iron: X bracing cut out of every face (the gaps are not drawn at all), widened to a pixel far off so a
// far tower does not dissolve; bronze by day, lit gold at night
export const latticeMaterial = ({ night = false } = {}) => {
  const material = new THREE.MeshLambertMaterial({ color: night ? 0xffc25a : 0x6e5a44, side: THREE.DoubleSide, emissive: night ? 0x8a5a14 : 0x000000 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vLat;\nvarying vec3 vLatN;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLat = position; vLatN = normal;');
    shader.fragmentShader = 'varying vec3 vLat;\nvarying vec3 vLatN;\n' + shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      vec3 an = abs(vLatN);
      vec2 q = an.x > an.z ? vLat.zy : vLat.xy;
      if (an.y > 0.8) q = vLat.xz;
      vec2 fq = fwidth(q);
      float w = max(0.12, 1.2 * max(fq.x, fq.y));
      float d1 = abs(fract((q.x + q.y) / 2.6) - 0.5) * 2.6, d2 = abs(fract((q.x - q.y) / 2.6) - 0.5) * 2.6, d3 = abs(fract(q.y / 5.2) - 0.5) * 5.2;
      if (min(min(d1, d2), d3) > w && max(fq.x, fq.y) < 1.6) discard;`);
  };
  material.customProgramCacheKey = () => 'vegas-lattice-1' + (night ? 'n' : 'd');
  return material;
};

// ---- shapes ----------------------------------------------------------------------------------------------------------
const keep = (geometry) => { geometry.userData.shared = true; return geometry; };
const fromTriangles = (pos, color) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (color) geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  geometry.computeVertexNormals();
  return geometry;
};
// a palm's crown: seven fronds out from the top of the trunk, drooping, each a folded strip (its material draws both sides). About 7 m across, its top at y = 0.6
export const palmCrown = () => {
  const pos = [];
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c); }; // (one side: the crowns' material draws both)
  const N = 7;
  for (let k = 0; k < N; k++) {
    const turn = k / N * Math.PI * 2 + (k % 2) * 0.2, len = 3.1 + (k % 3) * 0.35, lift = k % 2 ? 0.5 : 0.25;
    const ca = Math.cos(turn), sa = Math.sin(turn);
    const at = (u, side) => { // u: 0 at the trunk to 1 at the tip; side: -1, 0 (the rib) or 1
      const r = u * len, y = 0.35 + lift * u - 1.9 * u * u, w = (0.62 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.04) * side;
      const fold = side === 0 ? 0.12 : 0;
      return [ca * r - sa * w, y + fold, sa * r + ca * w];
    };
    for (let i = 0; i < 3; i++) {
      const u0 = i / 3, u1 = (i + 1) / 3;
      for (const side of [-1, 1]) { tri(at(u0, 0), at(u0, side), at(u1, side)); tri(at(u0, 0), at(u1, side), at(u1, 0)); }
    }
  }
  return keep(fromTriangles(pos));
};
// a frustum: a box whose top is smaller than its foot and may stand off-centre (the tower replica's legs and body): foot
// [x, z, half] at y0, top [x, z, half] at y1. Its four sides only (no caps)
export const frustum = (foot, top, y0, y1, out = []) => {
  const c = (p, sx, sz, y) => [p[0] + sx * p[2], y, p[1] + sz * p[2]];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k], [bx, bz] = corners[(k + 1) % 4];
    const a0 = c(foot, ax, az, y0), b0 = c(foot, bx, bz, y0), a1 = c(top, ax, az, y1), b1 = c(top, bx, bz, y1);
    out.push(...a0, ...a1, ...b0, ...b0, ...a1, ...b1);
  }
  return out;
};
// the tower replica (after the Paris one, an homage, half size): four legs spread wide on an arch, a first platform, the body
// tapering to the second, the shaft to the top, a mast. One geometry (the lattice is the material's); its foot at y = 0
export const latticeTower = (H = 110) => {
  const pos = [], k = H / 110;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) frustum([sx * 15 * k, sz * 15 * k, 3.2 * k], [sx * 7.5 * k, sz * 7.5 * k, 2.4 * k], 0, 26 * k, pos);
  frustum([0, 0, 10.5 * k], [0, 0, 5 * k], 28 * k, 58 * k, pos);
  frustum([0, 0, 4.4 * k], [0, 0, 1.6 * k], 60 * k, 98 * k, pos);
  frustum([0, 0, 0.5 * k], [0, 0, 0.12 * k], 98 * k, H, pos);
  return keep(fromTriangles(pos));
};
// a monorail car: 11 m long, 3 m wide, rounded at both ends, a skirt down over the beam (open underneath: never seen from
// below the beam's top). Its floor at y = 0, the skirt to y = -0.9. Vertex-coloured: white, a band of the theme's colour, the
// glass dark; the windows, lit at night, are a mesh of their own (monorailWindows). Faces local +z
export const MONORAIL = { length: 11, gap: 1.0, half: 1.5, tall: 2.7 };
const railSection = [[0, -0.9], [0.95, -0.9], [1, -0.4], [1, 0.4], [1, 1.25], [1, 2.0], [0.93, 2.45], [0.7, 2.68], [0.35, 2.75], [0, 2.75]];
const railPaint = [0, 1, 1, 2, 2, 0, 0, 0, 0]; // (each panel's: white, the band, the glass)
const railEnds = (z) => { const L = MONORAIL.length / 2, e = Math.min(1, Math.max(0, (Math.abs(z) - (L - 1.6)) / 1.6)); return [1 - 0.28 * e * e, 1 - 0.3 * e * e * e]; }; // (narrower and lower round the ends)
export const monorailCar = (band = 0xd8262b) => {
  const pos = [], col = [], paints = [new THREE.Color(0xf4f4f2), new THREE.Color(band), new THREE.Color(0x1d2530)];
  const L = MONORAIL.length / 2, Z = [];
  for (let i = 0; i <= 12; i++) Z.push(-L + (i / 12) * 2 * L);
  const at = (j, z, side) => { const [w, h] = railEnds(z); const [x, y] = railSection[j]; return [side * x * MONORAIL.half * w, y < 0 ? y : y * h, z]; };
  const push = (p, c) => { pos.push(...p); col.push(c.r, c.g, c.b); };
  for (const side of [-1, 1]) {
    for (let i = 0; i < Z.length - 1; i++) {
      for (let j = 0; j < railPaint.length; j++) {
        const c = paints[railPaint[j]], a = at(j, Z[i], side), b = at(j + 1, Z[i], side), cc = at(j + 1, Z[i + 1], side), d = at(j, Z[i + 1], side);
        const q = side > 0 ? [a, cc, b, a, d, cc] : [a, b, cc, a, cc, d];
        for (const p of q) push(p, c);
      }
    }
    for (const [z, out] of [[-L, -1], [L, 1]]) { // the rounded ends, closed: a fan from the middle
      const mid = [0, 1.0 * railEnds(z)[1], z];
      for (let j = 0; j < railSection.length - 1; j++) {
        const a = at(j, z, side), b = at(j + 1, z, side), c = j >= 4 && j <= 5 ? paints[2] : paints[0];
        const q = side * out > 0 ? [mid, a, b] : [mid, b, a];
        for (const p of q) push(p, c);
      }
    }
  }
  return keep(fromTriangles(pos, col));
};
// its windows: a strip of panes down each side (and the ends' windscreens), just proud of the glass band
export const monorailWindows = () => {
  const pos = [], L = MONORAIL.length / 2 - 1.2, y0 = 1.3, y1 = 1.95, x = MONORAIL.half + 0.012;
  for (const side of [-1, 1]) {
    for (let z = -L; z < L - 0.3; z += 1.3) {
      const a = [side * x, y0, z], b = [side * x, y1, z], c = [side * x, y1, z + 1.0], d = [side * x, y0, z + 1.0];
      pos.push(...(side > 0 ? [...a, ...c, ...b, ...a, ...d, ...c] : [...a, ...b, ...c, ...a, ...c, ...d]));
    }
  }
  return keep(fromTriangles(pos));
};
// the observation wheel: its rim (two rings), spokes to the hub, the hub; one geometry, centred on the hub, in the x-y plane.
// Its glass cabins are a mesh of their own (wheelCabins), turned with it
export const wheelFrame = (R = 70) => {
  const parts = [];
  for (const z of [-1.6, 1.6]) parts.push(new THREE.TorusGeometry(R, 0.7, 6, 96).translate(0, 0, z));
  const N = 28;
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2;
    for (const z of [-1.6, 1.6]) parts.push(new THREE.CylinderGeometry(0.18, 0.18, R, 4).translate(0, R / 2, 0).rotateZ(a).translate(0, 0, z * 0.6));
    parts.push(new THREE.BoxGeometry(0.5, 0.5, 3.6).translate(0, R, 0).rotateZ(a)); // (a cross tie between the rings)
  }
  parts.push(new THREE.CylinderGeometry(3, 3, 5, 16).rotateX(Math.PI / 2));
  const merged = mergeTo(parts);
  return keep(merged);
};
export const wheelCabins = (R = 70) => {
  const parts = [], N = 28;
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2;
    parts.push(new THREE.SphereGeometry(2.4, 10, 7).translate(Math.sin(a) * (R + 2.6), Math.cos(a) * (R + 2.6), 0));
  }
  return keep(mergeTo(parts));
};
// (a few geometries as one, positions and normals only)
const mergeTo = (parts) => {
  const pos = [], nor = [];
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return geometry;
};
// the desert mountains round the horizon: a ring `R` m round whoever is looking, a ragged ridge 25 to 85 m up, its foot below the
// ground. Drawn in a colour already hazed towards the sky (no fog on it: it is beyond the fog's reach)
export const mountainRing = (R = 470, seed = 5) => {
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const N = 160, peaks = [];
  for (let k = 0; k < N; k++) peaks.push(rand());
  const ridge = (k) => { // (a few big ranges with smaller peaks on them)
    const a = k / N * Math.PI * 2;
    const big = 0.5 + 0.5 * Math.sin(a * 3 + 1.3) * Math.sin(a * 5 + 0.4);
    return 18 + 62 * big * big + 14 * peaks[k] * (0.4 + big);
  };
  const pos = [];
  for (let k = 0; k < N; k++) {
    const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2, h0 = ridge(k), h1 = ridge((k + 1) % N);
    const p = (a, y) => [Math.sin(a) * R, y, Math.cos(a) * R];
    pos.push(...p(a0, -40), ...p(a1, -40), ...p(a1, h1), ...p(a0, -40), ...p(a1, h1), ...p(a0, h0)); // (facing in)
  }
  return fromTriangles(pos);
};
