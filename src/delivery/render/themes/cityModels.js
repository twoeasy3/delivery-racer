// ---- THE CITY'S BUILDINGS, AS ONE MATERIAL (render/themes/city.js lays them out) -------------------------------------
// Every box of the city (a building's body, a setback tier, a cornice, a balcony, a kerb, a lamp post, a bench) is one
// instance of a unit cube in ONE instanced mesh, drawn with ONE material: its facade is worked out in the fragment
// shader from where on the face a pixel is, in metres (the box's own scale, read off its instance matrix), and four
// numbers of its own (the instanced attribute aStyle): its STYLE (below), a seed (0..999: its bays, its shop colours, which
// of its windows are lit at night), how far its box goes down below the street (sink: the floors count from the street,
// so a setback tier passes a negative one, the height it stands at), and its GROUND floor (0 none, 1 shops, 2 a lobby,
// 3 loading doors). Its colour is the instance's own (instanceColor). So a street of a hundred buildings, each with
// its own window grid, shopfronts, fascias and lit windows, costs one draw call; the roofs' sawtooth prisms, hipped
// roofs, water tanks and tree crowns are one each more, in the same material.
// The walls' grain comes from ONE canvas texture drawn here in code, 256 x 256 (256 KB at 4 bytes a pixel, a third more
// with its mipmaps), each channel a seamless pattern of its own: red, brick courses (running bond); green, a mottled
// noise (render, concrete, a roof's gravel); blue, corrugated metal's ribs. The windows, shopfronts and signs are drawn
// by the shader, not the texture: no seams, and they stay sharp up close and fade to their average far off (fwidth).
// Nothing here is readable lettering: a shop's sign is a band of colour with light bars in it, as words seen too far
// off to read (the owner: no brand names).
import * as THREE from 'three';

// the styles: what a box's faces are drawn as
export const STYLE = {
  PLAIN: 0,   // its colour, a faint mottle: cornices, parapets, kerbs, posts, benches, tubs, trunks
  BRICK: 1,   // brick, punched windows with stone sills and lintels: terraces, older blocks
  RENDER: 2,  // rendered or painted walls, wider windows, every other one a balcony door: blocks of flats
  GLASS: 3,   // a glass curtain wall, mullions every 1.5 m, a dark spandrel at each floor: office towers
  BANDED: 4,  // ribbon windows, floor after floor, between bands of white or concrete: modern mid-rise, podiums
  METAL: 5,   // corrugated metal, a strip of clerestory windows high up: warehouses
  HOUSE: 6,   // a house's: low floors, two windows to a bay, a door
  GLOW: 7,    // by day its colour; at night it gives light: street lamps' heads, a shelter's advert, a mast's light
  LOUVRE: 8,  // slatted: rooftop plant rooms, air-conditioning units
  SAWTOOTH: 9, // a sawtooth roof's tooth: metal, its upright face glazed
  LEAF: 10,   // a tree's crown: mottled, darker underneath
};

// ---- the texture ---------------------------------------------------------------------------------------------------
let wallTexture = null;
const SIZE = 256;
export const CITY_TEXTURE_SIZE = SIZE; // (scripts/.city-budget-check.mjs holds it to its budget)
// a seamless value noise, 0..1, over a SIZE x SIZE tile: `cells` lattice squares each way, wrapping round
const noiseLayer = (cells, rand) => {
  const lattice = Array.from({ length: cells * cells }, rand), at = (i, j) => lattice[((j + cells) % cells) * cells + ((i + cells) % cells)];
  const out = new Float32Array(SIZE * SIZE), step = SIZE / cells;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const fx = x / step, fy = y / step, i = Math.floor(fx), j = Math.floor(fy);
      const u = (fx - i) * (fx - i) * (3 - 2 * (fx - i)), v = (fy - j) * (fy - j) * (3 - 2 * (fy - j));
      const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u, b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
      out[y * SIZE + x] = a + (b - a) * v;
    }
  }
  return out;
};
export const cityTexture = () => {
  if (wallTexture) return wallTexture;
  if (typeof document === 'undefined' || !document.createElement) return null; // (no canvas: a check run headless)
  let seed = 9173;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d');
  const image = g.createImageData(SIZE, SIZE), px = image.data;
  const fine = noiseLayer(32, rand), mid = noiseLayer(8, rand), broad = noiseLayer(4, rand);
  // brick: 8 courses of 32 px, 4 bricks of 64 px to a course, each course offset half a brick from the last; mortar 3 px
  const brickShade = Array.from({ length: 8 * 4 }, () => 0.62 + rand() * 0.3);
  for (let y = 0; y < SIZE; y++) {
    const course = Math.floor(y / 32), inCourse = y % 32, offset = course % 2 ? 32 : 0;
    for (let x = 0; x < SIZE; x++) {
      const k = y * SIZE + x, bx = (x + offset) % SIZE, brick = Math.floor(bx / 64), inBrick = bx % 64;
      const mortar = inCourse < 3 || inBrick < 3;
      const red = mortar ? 0.97 : brickShade[course * 4 + brick] + (fine[k] - 0.5) * 0.16;
      const green = 0.68 + 0.18 * mid[k] + 0.09 * fine[k] + 0.05 * broad[k]; // (render, concrete: 0.68..1)
      const blue = 0.72 + 0.26 * (0.5 + 0.5 * Math.cos(x / SIZE * Math.PI * 2 * 16)) - 0.06 * broad[k]; // (16 ribs across)
      px[k * 4] = Math.round(255 * Math.min(1, red));
      px[k * 4 + 1] = Math.round(255 * Math.min(1, green));
      px[k * 4 + 2] = Math.round(255 * Math.min(1, blue));
      px[k * 4 + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);
  wallTexture = new THREE.CanvasTexture(canvas);
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.anisotropy = 4;
  wallTexture.userData.shared = true; // (kept between levels: see clearGroup)
  return wallTexture;
};

// ---- the material --------------------------------------------------------------------------------------------------
const VERTEX_HEAD = `
attribute vec4 aStyle;
varying vec4 vStyle;
varying vec3 vFac;
varying vec2 vTop;
varying vec3 vObjN;
`;
// (vFac: x, m across the face from its left edge; y, m above the street; z, the face's width. On a face looking up:
// m across and along it. vTop: x, the box's top in m above the street; y, 1 on a face looking up. vObjN: the face's
// normal in the box's own terms)
const VERTEX_BODY = `
  vStyle = aStyle;
  #ifdef USE_INSTANCING
    vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  #else
    vec3 sc = vec3(1.0);
  #endif
  vec3 lp = position * sc;
  vObjN = normal;
  if (normal.y > 0.5) vFac = vec3(lp.x + 0.5 * sc.x, lp.z + 0.5 * sc.z, sc.x);
  else if (abs(normal.x) > 0.5) vFac = vec3(lp.z * sign(normal.x) + 0.5 * sc.z, lp.y + 0.5 * sc.y - aStyle.z, sc.z);
  else vFac = vec3(-lp.x * sign(normal.z) + 0.5 * sc.x, lp.y + 0.5 * sc.y - aStyle.z, sc.x);
  vTop = vec2(sc.y - aStyle.z, normal.y > 0.5 ? 1.0 : 0.0);
`;
const FRAGMENT_HEAD = `
uniform sampler2D uWalls;
uniform float uNight;
uniform vec3 uSky;
varying vec4 vStyle;
varying vec3 vFac;
varying vec2 vTop;
varying vec3 vObjN;
float cityHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// 1 between a and b, softened over a pixel's width each side (so a far window fades to its average, never shimmers)
float cityBand(float x, float a, float b, float w) { return clamp(min(x - a, b - x) / max(w, 1e-4) + 0.5, 0.0, 1.0); }
float cityRect(vec2 p, vec2 a, vec2 b, vec2 w) { return cityBand(p.x, a.x, b.x, w.x) * cityBand(p.y, a.y, b.y, w.y); }
vec3 cityFascia(float h) {
  if (h < 0.16) return vec3(0.42, 0.03, 0.03);
  if (h < 0.32) return vec3(0.02, 0.06, 0.2);
  if (h < 0.46) return vec3(0.03, 0.18, 0.08);
  if (h < 0.58) return vec3(0.015, 0.015, 0.018);
  if (h < 0.70) return vec3(0.7, 0.6, 0.42);
  if (h < 0.82) return vec3(0.02, 0.22, 0.24);
  if (h < 0.92) return vec3(0.55, 0.36, 0.03);
  return vec3(0.25, 0.02, 0.07);
}
// the light of a window at night: warm, now and then cool, the odd blue of a screen
vec3 cityLamp(float h) { return h < 0.62 ? vec3(1.0, 0.66, 0.32) : h < 0.9 ? vec3(0.78, 0.82, 0.9) : vec3(0.42, 0.55, 1.0); }
void cityFacade(inout vec3 col, inout vec3 glow) {
  int style = int(vStyle.x + 0.5);
  // (the seed comes as a whole number, 0..999, and is read as one: a value interpolated across a face is not always
  // exactly the same at every pixel, and a hash of it would be noise)
  float seed = floor(vStyle.y + 0.5) / 1000.0, ground = floor(vStyle.w + 0.5);
  vec2 f = vFac.xy, fw = fwidth(f);
  // (sampled before any branching: the texture's mipmaps need the derivatives of every pixel round it)
  float brick = texture2D(uWalls, f / vec2(1.0, 0.6)).r;
  float mottle = texture2D(uWalls, f / 5.0).g;
  float ribs = texture2D(uWalls, f / vec2(2.0, 7.0)).b;
  bool night = uNight > 0.5;
  if (style == 0) { col *= 0.84 + 0.2 * mottle; return; }
  if (style == 7) { // (a lamp's head, an advert's light box: a rim, and lighter towards the top)
    float rim = 1.0 - cityRect(f, vec2(0.06), vec2(vFac.z - 0.06, vTop.x - 0.06), fw);
    vec3 face = col * (0.72 + 0.35 * clamp(f.y / max(vTop.x, 0.1), 0.0, 1.0));
    col = mix(face, vec3(0.06), rim * step(1.0, vTop.x));
    if (night) glow = col * 0.9;
    return;
  }
  if (style == 8) { col *= 0.78 + 0.22 * cityBand(fract(f.y / 0.18), 0.25, 1.0, fw.y / 0.18) + 0.08 * mottle; return; }
  if (style == 10) { col *= (0.62 + 0.45 * mottle) * (0.75 + 0.25 * clamp(vObjN.y + 0.6, 0.0, 1.0)); return; }
  if (style == 9) {
    if (vObjN.x < -0.5) { // (the upright face: glazing in long panes)
      float pane = cityBand(fract(f.x / 1.2), 0.06, 0.94, fw.x / 1.2) * cityBand(f.y, 0.25, vTop.x - 0.2, fw.y);
      col = mix(col * 0.55, mix(vec3(0.04, 0.05, 0.06), uSky * 0.5, 0.45), pane);
      if (night) glow += vec3(0.5, 0.48, 0.4) * 0.35 * pane * step(0.5, cityHash(vec2(seed, 3.0)));
    } else col *= 0.7 + 0.35 * ribs;
    return;
  }
  if (vTop.y > 0.5) { col = vec3(0.17, 0.17, 0.18) * (0.72 + 0.5 * mottle); return; } // (a flat roof: gravel and felt)
  float H = vTop.x;
  // the wall itself
  vec3 wall = col;
  if (style == 1) wall *= 0.58 + 0.5 * brick;
  else if (style == 5) wall *= 0.66 + 0.36 * ribs;
  else wall *= 0.8 + 0.26 * mottle;
  // the floors and bays: whole bays across each face (so a window never runs off its edge), floors from the ground floor up
  float gH = ground > 0.5 ? 4.2 : 0.0;
  float floorH = style == 6 ? 2.8 : style == 3 ? 3.7 : style == 4 ? 3.5 : style == 5 ? 9.0 : 3.1;
  float bayW = style == 3 || style == 4 ? 1.5 : style == 6 ? 3.0 : mix(2.6, 3.6, fract(seed * 7.31));
  float bays = max(1.0, floor(vFac.z / bayW + 0.5)), bw = vFac.z / bays;
  vec2 id = vec2(floor(f.x / bw), floor((f.y - gH) / floorH));
  vec2 c = vec2(f.x - id.x * bw, f.y - gH - id.y * floorH); // (m within the bay, from its foot)
  float up = cityBand(f.y, gH + 0.4, H - 1.0, fw.y);         // (where the upper floors' windows may be: under the parapet)
  // (how much of a building is lit at night, and which windows)
  float lights = 0.18 + 0.6 * fract(seed * 13.7);
  float lit = step(1.0 - lights, cityHash(id + seed * 37.0));
  vec3 lamp = cityLamp(cityHash(id.yx + seed * 11.0));
  // the glass of a window by day: dark, with a little of the sky in it, more in the upper panes
  float sheen = 0.18 + 0.3 * cityHash(id + seed * 5.0);
  vec3 pane = mix(vec3(0.025, 0.03, 0.04), uSky * 0.62, sheen);
  vec3 outCol = wall;
  if (style == 3) { // the curtain wall: glass from top to bottom, mullions and a spandrel at each floor
    float mull = 1.0 - cityBand(fract(f.x / 1.5), 0.03, 0.97, fw.x / 1.5);
    float spandrel = 1.0 - cityBand(c.y, 0.85, floorH - 0.02, fw.y);
    float shine = clamp(0.22 + 0.55 * f.y / max(H, 1.0) + 0.18 * cityHash(vec2(floor(f.x / 4.5), id.y + seed)), 0.0, 1.0);
    vec3 glass = mix(col * 0.32, uSky * 0.95, shine * 0.75);
    if (night) glass = col * 0.06;
    outCol = mix(glass, col * 0.42, spandrel);
    outCol = mix(outCol, vec3(0.06, 0.065, 0.07), mull * 0.85);
    float floorLit = step(1.0 - lights, cityHash(vec2(id.y, seed * 17.0)));
    if (night) glow += vec3(0.75, 0.82, 0.95) * 0.8 * (1.0 - spandrel) * (1.0 - mull) * floorLit * step(0.3, cityHash(vec2(floor(f.x / 4.5), id.y + seed)));
    outCol = mix(wall, outCol, up + (1.0 - up) * step(gH + 0.4, f.y));
  } else if (style == 4) { // ribbon windows: a band of glass each floor
    float ribbon = cityBand(c.y, 0.95, floorH - 0.55, fw.y) * up;
    float mull = 1.0 - cityBand(fract(f.x / 1.5), 0.04, 0.96, fw.x / 1.5);
    vec3 glass = night ? vec3(0.01) : pane;
    outCol = mix(wall, mix(glass, vec3(0.08), mull * 0.8), ribbon);
    float runLit = step(1.0 - lights, cityHash(vec2(floor(f.x / 6.0), id.y + seed * 3.0)));
    if (night) glow += lamp * 0.85 * ribbon * (1.0 - mull) * runLit;
  } else if (style == 5) { // corrugated metal; a strip of clerestory windows high up
    float strip = cityBand(f.y, H - 2.4, H - 1.4, fw.y) * cityBand(fract(f.x / bw), 0.1, 0.9, fw.x / bw);
    outCol = mix(wall, vec3(0.5, 0.56, 0.6) * 0.6 + uSky * 0.15, strip);
    if (night) glow += vec3(0.55, 0.6, 0.55) * 0.25 * strip * step(0.5, cityHash(vec2(seed, 7.0)));
  } else { // punched windows: brick, render, a house
    float ww = style == 6 ? 0.42 : style == 2 ? 0.56 : 0.44 + 0.12 * fract(seed * 3.7);
    float sill = style == 6 ? 0.85 : 0.9, wh = style == 6 ? 1.35 : floorH * (style == 2 ? 0.5 : 0.56);
    float door = style == 2 && mod(id.x, 2.0) < 0.5 ? 1.0 : 0.0; // (every other bay of a block of flats: a balcony door)
    float bottom = mix(sill, 0.08, door);
    vec2 a = vec2(bw * (0.5 - ww / 2.0), bottom), b = vec2(bw * (0.5 + ww / 2.0), sill + wh);
    float win = cityRect(c, a, b, fw) * up;
    float frame = 1.0 - cityRect(c, a + 0.07, b - 0.07, fw);                      // (the frame round it)
    float bar = 1.0 - cityBand(c.x, bw * 0.5 - 0.035, bw * 0.5 + 0.035, fw.x);     // (a mullion down the middle)
    vec3 glass = night ? vec3(0.012, 0.012, 0.016) : pane;
    vec3 frameCol = style == 1 ? vec3(0.78, 0.76, 0.7) : vec3(0.85);
    vec3 w = mix(glass, frameCol, max(frame, (1.0 - bar) * step(1.6, bw * ww)));
    outCol = mix(wall, w, win);
    if (style == 1) { // stone sills and lintels
      float stone = cityRect(c, vec2(a.x - 0.12, b.y + 0.02), vec2(b.x + 0.12, b.y + 0.24), fw) + cityRect(c, vec2(a.x - 0.08, sill - 0.12), vec2(b.x + 0.08, sill), fw) * (1.0 - door);
      outCol = mix(outCol, vec3(0.62, 0.6, 0.55) * (0.85 + 0.2 * mottle), min(stone, 1.0) * up);
    }
    if (night) glow += lamp * 0.9 * win * (1.0 - frame) * lit;
    if (style == 6 && f.y < 2.4) { // a house's front door
      float d = cityRect(f, vec2(vFac.z * 0.5 - 0.5, 0.0), vec2(vFac.z * 0.5 + 0.5, 2.15), fw);
      outCol = mix(outCol, cityFascia(fract(seed * 5.3)) * 1.4, d);
    }
  }
  // the ground floor
  if (ground > 0.5 && f.y < gH + 0.02) {
    float units = max(1.0, floor(vFac.z / 6.5 + 0.5)), uw = vFac.z / units;
    float u = floor(f.x / uw), x = f.x - u * uw, h = cityHash(vec2(u, seed * 31.7));
    vec3 g = col * (style == 3 || style == 4 ? 0.55 : 0.75) * (0.85 + 0.2 * mottle); // (the piers between)
    if (ground < 1.5) { // shops: a window, a door at one end, a fascia over, its sign
      float shopWin = cityRect(vec2(x, f.y), vec2(0.4, 0.55), vec2(uw - 0.4, 3.05), fw);
      float doorAt = h < 0.5 ? 0.6 : uw - 1.9;
      float shopDoor = cityRect(vec2(x, f.y), vec2(doorAt, 0.0), vec2(doorAt + 1.3, 2.6), fw);
      float fascia = cityRect(vec2(x, f.y), vec2(0.25, 3.2), vec2(uw - 0.25, 4.05), fw);
      float word = cityRect(vec2(x, f.y), vec2(0.8, 3.45), vec2(0.8 + (uw - 1.6) * (0.35 + 0.6 * fract(h * 7.1)), 3.8), fw);
      word *= cityBand(fract(x * (0.45 + 0.4 * fract(h * 3.3)) + h * 5.0), 0.0, 0.78, fw.x);
      vec3 shopGlass = night ? vec3(0.02) : mix(vec3(0.03, 0.035, 0.04), uSky * 0.5, 0.3);
      vec3 fasc = cityFascia(fract(h * 9.7)), letters = mix(vec3(0.95, 0.92, 0.85), fasc * 0.2, step(0.7, fasc.r + fasc.g));
      g = mix(g, vec3(0.05), cityRect(vec2(x, f.y), vec2(0.4, 0.0), vec2(uw - 0.4, 0.55), fw)); // (the stall riser)
      g = mix(g, shopGlass, max(shopWin, shopDoor));
      g = mix(g, mix(fasc, letters, word), fascia);
      float open = step(0.12, cityHash(vec2(h, seed)));
      if (night) glow += vec3(1.0, 0.72, 0.42) * 0.75 * max(shopWin, shopDoor) * open + (fasc * 0.45 + letters * word * 0.9) * fascia * open;
    } else if (ground < 2.5) { // a lobby: glass doors in the middle of the face, a dark plinth either side
      float lobby = cityRect(f, vec2(vFac.z * 0.5 - 3.0, 0.0), vec2(vFac.z * 0.5 + 3.0, 3.6), fw);
      g = mix(g * 0.8, night ? vec3(0.02) : mix(vec3(0.03), uSky * 0.55, 0.35), lobby);
      g = mix(g, vec3(0.04), cityBand(fract(f.x / 1.5), 0.0, 0.05, fw.x / 1.5) * lobby);
      if (night) glow += vec3(1.0, 0.86, 0.62) * 0.8 * lobby;
    } else { // loading doors: a roller shutter in each 12 m, a door beside it
      float n = max(1.0, floor(vFac.z / 12.0 + 0.5)), dw = vFac.z / n, k = f.x - floor(f.x / dw) * dw;
      float shutter = cityRect(vec2(k, f.y), vec2(dw * 0.5 - 2.4, 0.0), vec2(dw * 0.5 + 2.4, 4.6), fw);
      float slats = 0.8 + 0.2 * cityBand(fract(f.y / 0.12), 0.2, 1.0, fw.y / 0.12);
      g = mix(wall, vec3(0.5, 0.52, 0.5) * slats, shutter);
      if (night) glow += vec3(1.0, 0.8, 0.5) * 0.25 * (1.0 - cityBand(k, dw * 0.5 - 2.6, dw * 0.5 + 2.6, fw.x)) * cityBand(f.y, 4.7, 5.0, fw.y);
    }
    if (ground < 2.5) g = mix(g, col * 0.6, cityBand(f.y, gH - 0.12, gH + 0.02, fw.y)); // (a string course over it)
    outCol = mix(outCol, g, cityBand(f.y, -1.0, gH, fw.y));
  }
  col = outCol;
}
`;

// one material for the whole city's boxes (and its prisms, tanks and crowns): night (lit windows, glowing lamps and signs)
// and the sky's colour (for the glass) are the theme's
export const cityMaterial = ({ night = false, sky = 0x9fc4e8 } = {}) => {
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  material.userData.styled = true; // (road.js's instances: an instanced attribute aStyle per mesh)
  const uniforms = { uWalls: { value: cityTexture() }, uNight: { value: night ? 1 : 0 }, uSky: { value: new THREE.Color(sky) } };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERTEX_BODY);
    shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n  vec3 cityGlow = vec3(0.0);\n  cityFacade(diffuseColor.rgb, cityGlow);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += cityGlow;');
  };
  material.customProgramCacheKey = () => 'city-facade-1';
  return material;
};

// the light under a street lamp at night: a faint cone down from its head and a pool where it meets the ground, added to
// what is behind it (no real light: the scene has none to spare)
export const lampLightMaterial = () => new THREE.MeshBasicMaterial({ color: 0xffd9a0, vertexColors: true, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });

// ---- the shapes (made once, kept between levels) --------------------------------------------------------------------
const keep = (geometry) => { geometry.userData.shared = true; return geometry; };
// a wedge: a unit box cut corner to corner, its upright face at x = -0.5, its slope down to x = +0.5 (a sawtooth roof's tooth)
const prism = () => {
  const A = [-0.5, -0.5], B = [0.5, -0.5], C = [-0.5, 0.5], pos = [];
  const tri = (p, q, r, z) => pos.push(p[0], p[1], z, q[0], q[1], z, r[0], r[1], z);
  tri(A, B, C, 0.5); tri(A, C, B, -0.5);
  const quad = (p, q, a, b) => pos.push(p[0], p[1], a, q[0], q[1], a, q[0], q[1], b, p[0], p[1], a, q[0], q[1], b, p[0], p[1], b);
  quad(A, C, 0.5, -0.5); quad(C, B, 0.5, -0.5); quad(B, A, 0.5, -0.5);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals();
  return keep(geometry);
};
export const SHAPES = {
  get prism() { return this._prism ||= prism(); },
  get hip() { return this._hip ||= keep(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).toNonIndexed()); }, // (a hipped roof: a square pyramid)
  get tank() { return this._tank ||= keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 10)); },
  get crown() { return this._crown ||= keep(new THREE.IcosahedronGeometry(0.5, 1)); },
  // (the cone of light, open, its point up, with the pool of light a little above its foot)
  get lamp() {
    return this._lamp ||= (() => {
      const cone = new THREE.ConeGeometry(0.5, 1, 14, 1, true).toNonIndexed();
      const pool = new THREE.CircleGeometry(0.62, 18).rotateX(-Math.PI / 2).translate(0, -0.48, 0).toNonIndexed();
      const pos = [...cone.attributes.position.array, ...pool.attributes.position.array], colour = [];
      // (how bright, by the corner: the cone brightest at the lamp and fading to its foot, the pool brightest under the lamp and
      // nothing at its rim; added to what is behind, so nothing at all shows a hard edge)
      for (let i = 0; i < pos.length; i += 3) {
        const y = pos[i + 1], r = Math.hypot(pos[i], pos[i + 2]), k = i < cone.attributes.position.array.length ? 0.2 + 0.8 * (y + 0.5) : Math.max(0, 1 - r / 0.62) * 0.9;
        colour.push(k, k, k);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
      return keep(geometry);
    })();
  },
};
