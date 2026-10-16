// Ice patches, as drawn (a level's `ice: [{ from, to, lane? }]`; the rules are in track.js and CONFIG.ice: this
// file only draws). Every patch of a level goes into ONE mesh with ONE material (one draw call for them all):
//  - its outline is a soft blob, not a box: the edges wander in and out (two sines along s, their phases seeded by the
//    patch's own place, so it is the same on every device and every run), the ends are rounded, and a frosted rim fades
//    out onto the road. It is built row by row along the lane's own centre line (each row is put down with the road's
//    toWorld), so it follows the bends and crests like the lane lines do: no steps.
//  - the glaze: vertex colours (a blue-white glaze, darker where the ice is thicker, the rim frosty white), and in the
//    shader a small shared canvas texture (256 x 256, made once: R a soft mottle, G thin cracks, B frost speckle and a few
//    glints) and a fake sheen: the surface takes on the colour of the horizon (the fog's colour) at a glancing angle, as
//    ice and wet floors do, which is dark at night, so a patch never glows like a lamp. On a lit theme the material is
//    Lambert (the headlights light it), else Basic, like the road under it.
//  - a palette per theme (ICE_LOOKS): snow white-blue, the frozen lake's dark glare ice, the mall's mopped floor, autumn's
//    wet leaves. One design; only the numbers differ.
// Lifted 2.5 cm over the road with polygonOffset, as the old sheets were (over the lane dashes, under nothing else).
import * as THREE from 'three';

// the looks: glaze (the clear ice), deep (where it is thicker), rim (the frosted edge), the alpha of the glaze and of the
// rim, crack (the cracks' colour and how strongly they show), frost (rim speckle), glint, sheen (how much of the
// horizon it takes on at a glancing angle)
export const ICE_LOOKS = {
  snow: { glaze: 0xb4d4ea, deep: 0x84aed0, rim: 0xf4f9fd, glazeA: 0.62, rimA: 0.92, crack: 0xffffff, crackAmt: 0.7, frost: 0.9, glint: 1, sheen: 0.55 },
  // the frozen lake: the road is already pale blue ice; a patch is polished glare ice, dark and clear, cracked white
  iceroad: { glaze: 0x3d7096, deep: 0x24506f, rim: 0xe6f2fa, glazeA: 0.72, rimA: 0.9, crack: 0xeef7ff, crackAmt: 0.85, frost: 0.9, glint: 1, sheen: 0.45 },
  // the mall: a freshly mopped stretch of floor (the Wet floor card): a dark glossy film, no frost, no cracks
  // (lifted 4 cm, not 2.5: the mall's tiled floor lies over the road at 2.4 cm, and hid the old sheets entirely)
  mall: { glaze: 0x5f7a8c, deep: 0x4c6577, rim: 0x9db0bd, glazeA: 0.5, rimA: 0.6, crack: 0x5f7a8c, crackAmt: 0, frost: 0, glint: 0.8, sheen: 0.7, lift: 0.04 },
  // autumn: wet leaves (autumn.js strews the leaves on it): a dark wet sheet with a gold shine
  autumn: { glaze: 0x5a3416, deep: 0x47280f, rim: 0x6b4420, glazeA: 0.8, rimA: 0.75, crack: 0xd98a28, crackAmt: 0.25, frost: 0, glint: 0.6, sheen: 0.4 },
};
export const iceLookOf = (theme) => ICE_LOOKS[theme] || ICE_LOOKS[{ iceroadThaw: 'iceroad' }[theme]] || ICE_LOOKS.snow;

// the shared texture: made once, 256 x 256, tiling (everything drawn wraps round the edges)
let texture = null;
const iceTexture = () => {
  if (texture) return texture;
  const N = 256, rand = seeded(9173);
  let canvas;
  try {
    canvas = document.createElement('canvas');
    canvas.width = canvas.height = N;
  } catch { return null; } // (no canvas to draw on: a headless check)
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#800000'; // (R: the mottle, about the middle; G and B: nothing)
  g.fillRect(0, 0, N, N);
  const wrap = (draw) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.save(); g.translate(dx, dy); draw(); g.restore(); } };
  g.globalCompositeOperation = 'lighter';
  // R: soft mottle, big faint blobs lighter and darker (darker drawn as less red over the middle grey)
  for (let k = 0; k < 40; k++) {
    const x = rand() * N, y = rand() * N, r = 14 + rand() * 40, up = rand() < 0.5;
    wrap(() => {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, up ? 'rgba(60,0,0,1)' : 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    });
  }
  // G: cracks: a few long wandering lines, each with a branch or two
  g.lineCap = 'round';
  const crack = (x, y, a, len, width, depth) => {
    const pts = [[x, y]];
    for (let d = 0; d < len; d += 6) { a += (rand() - 0.5) * 0.7; x += Math.cos(a) * 6; y += Math.sin(a) * 6; pts.push([x, y]); }
    wrap(() => {
      g.strokeStyle = `rgba(0,${Math.round(150 + 105 * width / 2)},0,1)`;
      g.lineWidth = width;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (const [px, py] of pts) g.lineTo(px, py);
      g.stroke();
    });
    if (depth < 2) for (let b = 0; b < 2; b++) if (rand() < 0.6) {
      const [bx, by] = pts[Math.floor(rand() * pts.length)];
      crack(bx, by, a + (rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 0.8), len * (0.3 + rand() * 0.3), Math.max(1, width - 0.6), depth + 1);
    }
  };
  for (let k = 0; k < 5; k++) crack(rand() * N, rand() * N, rand() * Math.PI * 2, 90 + rand() * 120, 1.8, 0);
  // B: frost speckle (half bright) everywhere, and a few glints (full): the shader shows the speckle on the rim only
  for (let k = 0; k < 900; k++) {
    const x = rand() * N, y = rand() * N, r = 0.6 + rand() * 1.1;
    wrap(() => { g.fillStyle = 'rgba(0,0,140,1)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
  }
  for (let k = 0; k < 14; k++) {
    const x = rand() * N, y = rand() * N;
    wrap(() => { g.fillStyle = 'rgba(0,0,255,1)'; g.fillRect(x - 1, y - 1, 2.5, 2.5); });
  }
  texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

// a small seeded random (mulberry32): the same numbers for the same seed on every device
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TILE = 7;      // m of road one repeat of the texture covers
const RIM = 0.5;     // m the frosted rim fades out over, beyond the patch's edge
const BAND = 0.55;    // m of bright frost just inside the edge
const END = 1.2;     // m the drawing runs on past each end of the patch (the rounded end is that much longer)

// a level's ice (`LEVEL.ice`) as the patches buildIceGeometry takes: each patch's lateral bounds are the slippery part's
// (track.js: its lane, or with no lane every lane), 15 cm in from the lane lines as the old sheets were; its seed from its place
export const icePatchesOf = (ice, Track, LW) => (ice || []).map((p) => ({ from: p.from, to: p.to, seed: Math.round(p.from * 131 + (p.lane ?? 9) * 7919 + p.to),
  lo: (s) => p.lane === undefined ? Track.laneLo(s) : Track.laneOffset(p.lane, s) - LW / 2 + 0.15,
  hi: (s) => p.lane === undefined ? Track.laneHi(s) : Track.laneOffset(p.lane, s) + LW / 2 - 0.15 }));

// One geometry for all of a level's patches. patches: [{ from, to, lo(s), hi(s), seed }] (lo/hi: the patch's lateral
// bounds at s, the slippery part); toWorld(s, lat, v3): the road's point there (y on the road); y: the lift.
export function buildIceGeometry(patches, toWorld, look, y = look.lift ?? 0.025) {
  const pos = [], col = [], uv = [], rim = [], idx = [];
  const c = new THREE.Color(), glaze = new THREE.Color(look.glaze), deep = new THREE.Color(look.deep), rimC = new THREE.Color(look.rim);
  const v = new THREE.Vector3();
  for (const p of patches) {
    const rand = seeded(p.seed);
    const ph = [rand(), rand(), rand(), rand(), rand(), rand()].map(x => x * Math.PI * 2);
    const wl = [7 + rand() * 6, 13 + rand() * 9, 9 + rand() * 7];
    const s0 = p.from - END, s1 = p.to + END, len = s1 - s0, taper = Math.min(4 + rand() * 3, len / 3);
    // the rows: closer in the rounded ends than along the middle
    const rows = [];
    for (let s = s0; s < s0 + taper; s += taper / 5) rows.push(s);
    const mid = Math.max(1, Math.round((len - 2 * taper) / 4));
    for (let k = 0; k < mid; k++) rows.push(s0 + taper + (len - 2 * taper) * k / mid);
    for (let k = 0; k <= 5; k++) rows.push(s1 - taper + taper * k / 5);
    const ou = rand() * TILE, ov = rand() * TILE;
    // (every row has the same columns, so the rows join: one interior column per 3.5 m of the patch's width at its middle)
    const sm = (p.from + p.to) / 2, inner = Math.max(1, Math.round((p.hi(sm) - p.lo(sm)) / 3.5));
    const amp = Math.min(1, 0.12 * (p.hi(sm) - p.lo(sm)));
    let cols = 0;
    rows.forEach((s, r) => {
      const a = p.lo(s), b = p.hi(s), half = (b - a) / 2;
      // how round the end is here (0 at the very tip, 1 along the middle): a quarter ellipse
      const d = Math.min(s - s0, s1 - s), e = d >= taper ? 1 : Math.sqrt(Math.max(0, 1 - (1 - d / taper) ** 2));
      // the edges wander in, each side its own way: by up to 0.4 m on one lane, a metre across a wide road
      const inL = 0.06 + amp * (0.5 + 0.25 * Math.sin(s / wl[0] * 6.283 + ph[0]) + 0.25 * Math.sin(s / wl[1] * 6.283 + ph[1]));
      const inR = 0.06 + amp * (0.5 + 0.25 * Math.sin(s / wl[0] * 6.283 + ph[2]) + 0.25 * Math.sin(s / wl[2] * 6.283 + ph[3]));
      const mid = (a + b) / 2 + 0.12 * Math.sin(s / wl[2] * 6.283 + ph[4]) * e;
      const L = mid - (half - inL) * e, R = mid + (half - inR) * e;
      const thick = 0.5 + 0.5 * Math.sin(s / wl[1] * 6.283 + ph[5]); // (thicker, darker, here and there along it)
      const endFade = Math.min(1, d / 1.6);
      // the columns across: the rim's outer edge, the edge, the frost band's inner edge, the interior (one more per
      // 3.5 m of width), and back out the other side
      const lats = [L - RIM * e, L, L + BAND * e];
      for (let k = 1; k < inner; k++) lats.push(L + (R - L) * k / inner);
      lats.push(R - BAND * e, R, R + RIM * e);
      cols = lats.length;
      lats.forEach((lat, k) => {
        const outer = k === 0 || k === cols - 1, edge = k === 1 || k === cols - 2, band = !outer && !edge && (k === 2 || k === cols - 3);
        toWorld(s, lat, v);
        pos.push(v.x, v.y + y, v.z);
        uv.push((lat + ou) / TILE, (s + ov) / TILE);
        let alpha;
        if (outer) { c.copy(rimC); alpha = 0; }
        else if (edge) { c.copy(rimC); alpha = look.rimA; }
        else {
          // inside: the glaze, deeper where thick and towards the middle of a wide patch, a little frost left at the band
          const across = 1 - Math.abs((k - (cols - 1) / 2) / ((cols - 1) / 2));
          c.copy(glaze).lerp(deep, Math.min(1, thick * 0.6 + across * 0.4));
          if (band) c.lerp(rimC, 0.18);
          alpha = look.glazeA;
        }
        col.push(c.r, c.g, c.b, alpha * endFade * (r === 0 || r === rows.length - 1 ? 0 : 1));
        rim.push(outer || edge ? 1 : band ? 0.45 : 0);
      });
      if (r > 0) {
        const base = pos.length / 3 - 2 * cols;
        for (let k = 0; k < cols - 1; k++) {
          const i = base + k, j = base + cols + k;
          idx.push(i, i + 1, j, i + 1, j + 1, j);
        }
      }
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setAttribute('iceUv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('iceRim', new THREE.Float32BufferAttribute(rim, 1));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

// the material: Lambert on a lit theme (so the headlights light it and the dark leaves it dark), Basic otherwise; one per level
export function iceMaterial(look, lit) {
  const M = lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial;
  const mat = new M({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const map = iceTexture();
  const uniforms = {
    iceMap: { value: map }, iceCrack: { value: new THREE.Color(look.crack) }, iceCrackAmt: { value: map ? look.crackAmt : 0 },
    iceRimC: { value: new THREE.Color(look.rim) }, iceFrost: { value: map ? look.frost : 0 }, iceGlint: { value: map ? look.glint : 0 },
    iceSheen: { value: look.sheen }, iceSky: { value: new THREE.Color(0xc8d8e8) },
  };
  mat.userData.ice = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 iceUv;\nattribute float iceRim;\nvarying vec2 vIceUv;\nvarying float vIceRim;\nvarying vec3 vIceW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIceUv = iceUv;\nvIceRim = iceRim;\nvIceW = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D iceMap; uniform vec3 iceCrack; uniform float iceCrackAmt; uniform vec3 iceRimC; uniform float iceFrost;
uniform float iceGlint; uniform float iceSheen; uniform vec3 iceSky;
varying vec2 vIceUv; varying float vIceRim; varying vec3 vIceW;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec3 iceT = ${map ? 'texture2D(iceMap, vIceUv).rgb' : 'vec3(0.5, 0.0, 0.0)'};
diffuseColor.rgb *= 0.9 + 0.2 * iceT.r;
float iceCr = smoothstep(0.45, 0.85, iceT.g) * iceCrackAmt * (1.0 - vIceRim * 0.6);
diffuseColor.rgb = mix(diffuseColor.rgb, iceCrack, iceCr);
diffuseColor.a = max(diffuseColor.a, iceCr * 0.85 * step(0.01, diffuseColor.a));
float iceSp = step(0.4, iceT.b) * (1.0 - step(0.9, iceT.b)) * vIceRim * iceFrost;
diffuseColor.rgb = mix(diffuseColor.rgb, iceRimC, iceSp);
diffuseColor.a = min(1.0, diffuseColor.a + iceSp * 0.5 * step(0.01, diffuseColor.a));`)
      .replace('#include <fog_fragment>', `{
  vec3 iceV = normalize(cameraPosition - vIceW);
  float iceF = pow(1.0 - clamp(abs(iceV.y), 0.0, 1.0), 5.0);
  vec3 iceH = iceSky;
  #ifdef USE_FOG
  iceH = fogColor;
  #endif
  float iceL = dot(iceH, vec3(0.3, 0.59, 0.11));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, iceH, iceF * iceSheen);
  gl_FragColor.a = max(gl_FragColor.a, iceF * iceSheen * 0.6 * step(0.01, gl_FragColor.a));
  float iceGl = step(0.9, iceT.b) * iceGlint * (0.35 + 0.65 * iceF) * (0.2 + iceL) * step(0.01, gl_FragColor.a);
  gl_FragColor.rgb += vec3(iceGl);
  gl_FragColor.a = max(gl_FragColor.a, min(1.0, iceGl));
}
#include <fog_fragment>`);
  };
  mat.customProgramCacheKey = () => 'ice' + (map ? 1 : 0) + (lit ? 1 : 0);
  return mat;
}
