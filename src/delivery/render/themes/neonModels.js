// ---- THE NEON FUTURE CITY'S MATERIALS (render/themes/neon.js lays it out; theme 'neonCity': themes.js) --------------------------
// Only loaded with the theme. Nothing here is read by the rules. No real light: every glow is drawn.
//   glassMaterial  ONE material for every box of the city: glass towers (dark tinted glass, faint floor lines, a bright EDGE-LIT
//                  OUTLINE round each face), holo panels (abstract colour fields drifting, a scan line; no text, no logo, no figure),
//                  glow strips (a flat bright colour) and dark metal (posts, the maglev's beam). Boxes, instanced (road.js's
//                  `instances`, the instanced attribute aStyle per box: x the KIND below, y the edge / glow colour (an index into
//                  the palette), z a seed). Its face is worked out in the fragment shader from where on the face a pixel is, in
//                  metres (as cityModels.js and vegasModels.js do), so one draw call a chunk of road.
//   reflectionMaterial  the wet look: coloured streaks lying on the road under the lamps and panels, ADDED to the asphalt (vertex
//                  colours fade them to nothing at their ends: no hard edge), no depth write. A fake: nothing is reflected.
// Canvas textures: none.
import * as THREE from 'three';

export const KIND = { GLASS: 0, HOLO: 1, GLOW: 2, METAL: 3 };
// the palette (aStyle.y): blue, magenta, cyan, violet, white-blue
export const HUES = { BLUE: 0, MAGENTA: 1, CYAN: 2, VIOLET: 3, ICE: 4 };
export const HUE_HEX = [0x3a7bff, 0xff2fd0, 0x2ff4ff, 0x9a5cff, 0xcfe8ff];

const VERT_HEAD = `
attribute vec4 aStyle;
varying vec4 vGStyle;
varying vec4 vGFace;
varying vec3 vGN;
`;
const VERT_BODY = `
  vGStyle = aStyle;
  #ifdef USE_INSTANCING
    vec3 gsc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  #else
    vec3 gsc = vec3(1.0);
  #endif
  vec3 glp = position * gsc;
  vGN = normal;
  if (abs(normal.y) > 0.5) vGFace = vec4(glp.x + 0.5 * gsc.x, glp.z + 0.5 * gsc.z, gsc.x, gsc.z);
  else if (abs(normal.x) > 0.5) vGFace = vec4(glp.z * sign(normal.x) + 0.5 * gsc.z, glp.y + 0.5 * gsc.y, gsc.z, gsc.y);
  else vGFace = vec4(-glp.x * sign(normal.z) + 0.5 * gsc.x, glp.y + 0.5 * gsc.y, gsc.x, gsc.y);
`;
const FRAG = `
uniform float uTime;
varying vec4 vGStyle;
varying vec4 vGFace;
varying vec3 vGN;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 gHue(float i) {
  if (i < 0.5) return vec3(0.23, 0.48, 1.0);
  if (i < 1.5) return vec3(1.0, 0.18, 0.82);
  if (i < 2.5) return vec3(0.18, 0.96, 1.0);
  if (i < 3.5) return vec3(0.6, 0.36, 1.0);
  return vec3(0.81, 0.91, 1.0);
}
void glassFace(inout vec3 col) {
  int kind = int(vGStyle.x + 0.5);
  vec3 hue = gHue(vGStyle.y);
  float seed = vGStyle.z;
  vec2 f = vGFace.xy, fw = max(fwidth(f), vec2(1e-4));
  float W = vGFace.z, H = vGFace.w;
  bool cap = abs(vGN.y) > 0.5;
  if (kind == 2) { col = hue * 1.15; return; }
  if (kind == 3) { col = col * 0.55 + hue * 0.04; return; }
  float edge = min(min(f.x, W - f.x), min(f.y, H - f.y));
  if (kind == 1) { // a holo panel: soft fields of colour drifting up it, a scan line, a thin bright frame; see-through looking (dim middle)
    float u = f.x / max(W, 0.1), v = f.y / max(H, 0.1);
    float k = floor(uTime / 8.0 + seed * 13.0);
    vec3 a = gHue(mod(floor(gHash(vec2(k, seed)) * 4.0), 4.0)), b = gHue(mod(floor(gHash(vec2(seed, k)) * 4.0) + 1.0, 4.0));
    float wave = 0.5 + 0.5 * sin((v * 3.0 - u * 1.5) * 3.1416 + uTime * 0.8 + seed * 20.0);
    float rings = smoothstep(0.08, 0.0, abs(fract(length(vec2((u - 0.5) * W / H, v - 0.5)) * 3.0 - uTime * 0.25) - 0.5) - 0.38);
    vec3 pic = mix(a, b, wave) * (0.35 + 0.35 * rings);
    float scan = smoothstep(0.02, 0.0, abs(fract(v - uTime * 0.12 + seed) - 0.5) - 0.01);
    float grid = 0.85 + 0.15 * step(0.5, fract(f.y / 0.25));
    float frame = clamp((0.18 - edge) / max(fw.x, fw.y) + 0.5, 0.0, 1.0);
    col = cap ? hue * 0.15 : mix(pic * grid + hue * scan * 0.6, hue * 1.3, frame);
    return;
  }
  // glass: dark tinted, faint floor lines every 4 m, the odd pale pane, and the outline lit round the face
  float floors = clamp((0.05 - abs(fract(f.y / 4.0) - 0.5) + 0.45) / fw.y * 0.25, 0.0, 1.0);
  float mull = clamp((0.04 - abs(fract(f.x / 3.0) - 0.5) + 0.46) / fw.x * 0.2, 0.0, 1.0);
  vec2 cell = floor(vec2(f.x / 3.0, f.y / 4.0));
  float pane = step(0.93, gHash(cell + seed * 7.0)) * (1.0 - floors) * (1.0 - mull);
  vec3 base = col * 0.22 + vec3(0.01, 0.012, 0.04);
  base += hue * 0.06 * smoothstep(0.0, 1.0, f.y / max(H, 1.0)); // (the glass catching the sky's glow higher up)
  base = mix(base, base + hue * 0.1, floors * 0.6 + mull * 0.3);
  base += vec3(0.45, 0.6, 0.9) * pane * 0.35;
  float rim = clamp((0.32 - edge) / max(fw.x, fw.y) + 0.5, 0.0, 1.0);
  float halo = cap ? 0.0 : exp(-edge * 0.9) * 0.35;
  col = mix(base + hue * halo, hue * 1.4, rim);
}
`;
const cache = {};
export const glassMaterial = () => {
  if (cache.glass) return cache.glass;
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  material.userData.styled = true; // (road.js's instances: an instanced attribute aStyle per mesh)
  material.userData.shared = true;
  const uniforms = { uTime: { value: 0 } };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_BODY);
    shader.fragmentShader = FRAG + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  glassFace(diffuseColor.rgb);');
  };
  material.customProgramCacheKey = () => 'neon-glass-1';
  cache.glass = material;
  return material;
};

export const reflectionMaterial = () => cache.refl ||= Object.assign(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55,
  blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), { userData: { shared: true } });
