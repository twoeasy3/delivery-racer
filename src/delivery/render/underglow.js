// ---- the UNDERGLOW cosmetic: a neon glow on the road under the player's car (the owner, 16-Oct: "One agent to work on underglows").
// The Cosmetics screen's 'Glow' tab (render/cosmeticslots.js slot 'underglow', woken here by registerSlot); RENDER-ONLY like the props
// (render/propdress.js): nothing is written onto a car's entry, a save, the cookie or the replay fingerprint (no rules module imports this
// file; vite.config.js logicFiles walks no render/ file). The choice is PER CAR over a DEFAULT (render/loadoutstore.js slot underglow = { id }).
//
// WHAT IT IS: NOT a light (no PointLight, so three.js recompiles nothing and every material stays as it was): ONE flat mesh lying on the
// road 3 cm over the car's floor (over the lane dashes and the game's road overlays), a few rounded rectangles one inside another (a fan in the middle, rings out to nothing), with two numbers
// per vertex: `light` (how much colour it adds) and `cover` (how much of the road under it it takes away). Drawn with premultiplied
// blending (out = colour * light + road * (1 - cover)): on a dark road (night, a tunnel, the showroom's floor) it is plain added light;
// on a bright road (tarmac by day, snow) the cover tints the road toward the colour, so it still reads where added light would be lost.
// The profile is a DARKER CORE (the shade under the car, a little colour) and a BRIGHT BAND along the line under the body's sides and
// ends (where the tubes would be), fading out past the body by a margin. It lights the road only: a flat mesh on the floor never touches
// the body. Its size comes from the model: the band runs under the body's sides (the body's half-width, less a little) and from just
// behind the rear wheels to just ahead of the front ones, never past the body's own length; the glow spills out by about 0.9 m at the
// sides (so the chase camera, from behind and above, sees it either side of the car) and up to 0.45 m at the ends, inside the body's length. The tyres stand in it and hide it where
// they are (depth test on, no depth write).
// One shared program (a ShaderMaterial per model, for its own colour and time), one draw call per car, 680 triangles.
// LOOKS (UNDERGLOWS): eight colours, 'Match car' (the car's own paint for its side, carPrimary, brought up to full brightness as a lamp is),
// and three EFFECTS that move: Pulse (breathes), Chase (a bright band runs from the nose to the tail) and Rainbow (the hue runs along the
// car). All on the graphics card from ONE time uniform, set from the model's animate hook (userData.animate(t), which the showroom, the
// garage, stills and the game already call): nothing is allocated per frame.
// TAGS: the mesh is `userData.underglow = true`. It lies flat on the floor, so render/carsuspension.js holds it there as a decal (it does
// not bounce with the body; when the suspension was measured before the glow was put on, it is added to the planted parts here); its
// material is `userData.blackout = 'hide'` (render/silhouette.js: not drawn at all on a blacked-out car), and a model already blacked
// out wears none. It is not pickable (no raycast: placement rays and the model editor go through it), the Ghost power-up leaves it be
// (render/items.js ghostify), and dents.js never moves it (it is one of the suspension's planted parts). Its geometry's BOX is the body's
// footprint only, so a view that frames the car (the showroom, stills) does not zoom out for the glow.
// SUPER CARS have a glow of their own (render/carExtras.js addSuperKit: a soft pool in the stripe colour, `userData.ownUnderglow`): it stays
// while no glow is chosen ('None'), and a worn glow REPLACES it (hidden, shown again on None).
// NOT OFFERED (supports): a car with no model (the Tank, the Saucer), a Legendary car (it keeps its own look, as with props), and a
// vehicle with no wheels on the road (NO_GLOW_MODELS: the hovercraft, the snowcat on its tracks, the jetboat, the Monowheel). An
// amphibious car wears it on the road; afloat (and in the air off a ramp) the game fades it out (render/items.js: setUnderglowLevel).
// OWNERSHIP: each look is a cosmetic 'underglow:<id>' (render/cosmetics.js), free for now, price a placeholder (300). A saved look the
// player does not own, or an id that no longer exists, wears none. ?underglow=<id|none> dresses every car for the visit (stills).
// API: UNDERGLOWS, NO_GLOW_MODELS, underglowSupported(car), underglowChoice(carId), shownUnderglow(carId), setUnderglow(id, target),
//      onUnderglow(fn), dressUnderglow(model, car) -> model, underglowPlan(model), setUnderglowLevel(model, k), glowFootprint(model)
import * as THREE from 'three';
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import { registerSlot } from './cosmeticslots.js';
import { prepareSuspension } from './carsuspension.js';
import { SILHOUETTE } from './silhouette.js';
import { carPrimary } from './propmodelsroof.js';
import * as Store from './loadoutstore.js';
import { atRest as restPose } from './restpose.js'; // (measured against the model as built, then riding with its part: CHECKLIST 444)

// ---- the looks ----
export const UNDERGLOWS = [
  { id: 'neon-blue', name: 'Neon blue', hex: 0x2f7bff },
  { id: 'hot-pink', name: 'Hot pink', hex: 0xff2aa6 },
  { id: 'lime', name: 'Lime', hex: 0x86ff1f },
  { id: 'amber', name: 'Amber', hex: 0xffa014 },
  { id: 'red', name: 'Red', hex: 0xff1f1f },
  { id: 'white', name: 'White', hex: 0xe6eeff },
  { id: 'purple', name: 'Purple', hex: 0x9b3bff },
  { id: 'teal', name: 'Teal', hex: 0x14e6c8 },
  { id: 'match', name: 'Match car', hex: null },
  { id: 'pulse', name: 'Pulse', hex: 0xff2aa6, fx: 1 },
  { id: 'chase', name: 'Chase', hex: 0x2fd4ff, fx: 2 },
  { id: 'rainbow', name: 'Rainbow', hex: 0xffffff, fx: 3 },
];
const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
const swatchOf = (g) => (g.fx === 1 ? 'radial-gradient(circle,' + css(g.hex) + ' 0 14%,#101319 18% 30%,' + css(g.hex) + 'cc 34% 44%,transparent 62%),#101319' : g.fx === 3 ? 'linear-gradient(90deg,#ff2a2a,#ffd21a,#3dff5a,#2fb4ff,#b23bff)' : g.id === 'match' ? 'linear-gradient(135deg,#d8dde6 0 50%,#2a2d33 50%)'
  : g.fx === 2 ? 'linear-gradient(90deg,#0b2a38,' + css(g.hex) + ',#0b2a38)' : 'radial-gradient(ellipse at 50% 55%,' + css(g.hex) + ' 0 28%,' + css(g.hex) + '88 50%,transparent 74%),#101319');
export const underglowById = (id) => UNDERGLOWS.find(g => g.id === id) || null;
registerCosmetics(UNDERGLOWS.map(g => ({ slot: 'underglow', id: g.id, name: g.name, free: true, price: 300 })));

// ---- who can wear it ----
export const NO_GLOW_MODELS = new Set(['hovercraft', 'snocat', 'jetboat', 'monowheel']); // (no wheels on the road: render/carsuspension.js how 'none')
export const underglowSupported = (car) => !!car && !!(car.model || car.idea) && !car.tank && !car.ufo && !car.legend && !car.silhouette && !NO_GLOW_MODELS.has(car.model);

// ---- the choice ----
const asked = () => { try { const v = new URLSearchParams(location.search).get('underglow'); return v === null ? null : v.toLowerCase(); } catch { return null; } };
const valid = (id) => id === 'none' || !!underglowById(id);
export const underglowChoice = (carId = null) => { const a = asked(); if (a !== null && valid(a)) return a; const id = Store.get(carId, 'underglow').id; return valid(id) ? id : 'none'; };
// the look worn: the chosen one if owned (?underglow= is the visit's own), else none
export const shownUnderglow = (carId = null) => { const id = underglowChoice(carId); return id === 'none' || asked() === id || ownsCosmetic('underglow', id) ? id : 'none'; };
export const setUnderglow = (id, target = null) => {
  if (!valid(id) || (id !== 'none' && !ownsCosmetic('underglow', id))) return false;
  Store.setSlot(target, 'underglow', { id }); return true;
};
const listeners = new Set();
export const onUnderglow = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// ---- the glow's shape, measured on the model (its own frame: +z the nose, the floor its lowest point) ----
// LIFT: over everything the game lays on the road (lane dashes at 2 cm, render/road.js; the mall's tiled floor at 2.4 cm and the ice sheets at
// 2.5 cm, render/themes/mall.js), as the Super kit's own glow is (3 cm): at 5 mm it was hidden under the mall floor and the dashes
const MARGIN_SIDE = 0.85, MARGIN_END = 0.45, LIFT = 0.03;
export const glowFootprint = (model) => {
  const s = prepareSuspension(model);
  model.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert(), m = new THREE.Matrix4(), body = new THREE.Box3(), box = new THREE.Box3();
  for (const node of s.sprung) {
    if (!node.isMesh || node.userData.underglow || node.userData.ownUnderglow) continue;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    box.copy(node.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(toModel, node.matrixWorld));
    if (box.min.y - s.ground < 1.2) body.union(box); // (the lower body: not a roof rack or a mast standing out over it)
  }
  if (body.isEmpty()) return null;
  const cx = (body.min.x + body.max.x) / 2, halfW = (body.max.x - body.min.x) / 2;
  let front = body.max.z - 0.12, rear = body.min.z + 0.12;
  const wheels = s.wheelBoxes || [];
  if (wheels.length >= 2) {
    const zs = wheels.map(w => (w.min.z + w.max.z) / 2), r = Math.max(...wheels.map(w => (w.max.y - w.min.y) / 2));
    front = Math.min(front, Math.max(...zs) + r * 1.1); rear = Math.max(rear, Math.min(...zs) - r * 1.1);
  }
  // the band: under the body's sides; the spill: never past the body's own nose and tail
  const ex = Math.max(0.3, halfW), mz = Math.min(MARGIN_END, (body.max.z - body.min.z) * 0.1);
  front = Math.min(front, body.max.z - mz); rear = Math.max(rear, body.min.z + mz);
  const cz = (front + rear) / 2, ez = Math.max(0.3, (front - rear) / 2), mx = MARGIN_SIDE + Math.min(0.2, halfW * 0.1);
  return { cx, cz, ex, ez, mx, mz, y: s.ground + LIFT, halfW, body: { minX: body.min.x, maxX: body.max.x, minZ: body.min.z, maxZ: body.max.z } };
};
// rings, inside out: [scale of the band (inside) or share of the margin (outside), light, cover]
const PROFILE = [['in', 0, 0.26, 0.34], ['in', 0.55, 0.3, 0.36], ['in', 0.8, 0.46, 0.42], ['in', 0.93, 0.8, 0.48], ['out', 0, 1, 0.5], ['out', 0.1, 0.92, 0.46],
  ['out', 0.25, 0.7, 0.34], ['out', 0.45, 0.45, 0.2], ['out', 0.7, 0.2, 0.08], ['out', 1, 0, 0]];
const N = 40;
const squircle = (a) => { const c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.sqrt(Math.abs(c)), Math.sign(s) * Math.sqrt(Math.abs(s))]; };
export const glowGeometry = (f) => {
  const pos = [], light = [], cover = [], index = [];
  pos.push(f.cx, f.y, f.cz); light.push(PROFILE[0][2]); cover.push(PROFILE[0][3]);
  for (let r = 1; r < PROFILE.length; r++) {
    const [kind, k, l, c] = PROFILE[r], A = kind === 'in' ? f.ex * k : f.ex + f.mx * k, B = kind === 'in' ? f.ez * k : f.ez + f.mz * k;
    for (let i = 0; i < N; i++) { const [u, w] = squircle((i / N) * Math.PI * 2); pos.push(f.cx + A * u, f.y, f.cz + B * w); light.push(l); cover.push(c); }
  }
  const ring = (r) => 1 + (r - 1) * N;
  for (let i = 0; i < N; i++) index.push(0, ring(1) + (i + 1) % N, ring(1) + i); // (the fan in the middle, wound to face up)
  for (let r = 1; r + 1 < PROFILE.length; r++) {
    for (let i = 0; i < N; i++) {
      const a = ring(r) + i, b = ring(r) + (i + 1) % N, c = ring(r + 1) + i, d = ring(r + 1) + (i + 1) % N;
      index.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('light', new THREE.Float32BufferAttribute(light, 1));
  g.setAttribute('cover', new THREE.Float32BufferAttribute(cover, 1));
  g.setIndex(index);
  g.computeBoundingSphere();
  // its box: the body's footprint only (a view framing the car does not zoom out for the glow; the sphere above is the real one, for culling)
  g.boundingBox = new THREE.Box3(new THREE.Vector3(f.cx - f.ex * 0.9, f.y, f.cz - f.ez * 0.9), new THREE.Vector3(f.cx + f.ex * 0.9, f.y, f.cz + f.ez * 0.9));
  return g;
};

// ---- the material: one program for all (three.js shares it), uniforms per car ----
const VERT = `attribute float light; attribute float cover; uniform float uCz, uHalf; varying float vLight, vCover, vAlong;
void main() { vLight = light; vCover = cover; vAlong = (position.z - uCz) / uHalf; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `uniform vec3 uColor; uniform float uTime, uLevel; uniform int uFx; varying float vLight, vCover, vAlong;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  float l = vLight, c = vCover; vec3 col = uColor;
  if (uFx == 1) l *= 0.5 + 0.5 * sin(uTime * 4.49);                                                    // pulse: a breath every 1.4 s
  else if (uFx == 2) { float p = 1.4 - 2.8 * fract(uTime / 1.2), d = vAlong - p; l *= 0.3 + 1.2 * exp(-d * d * 9.0); } // chase: nose to tail every 1.2 s
  else if (uFx == 3) col = hue(fract(uTime * 0.2 - vAlong * 0.35));                                    // rainbow: the hue runs along the car
  l *= uLevel; c *= min(uLevel, 1.0);
  gl_FragColor = vec4(col * pow(l, 1.5) * 1.15, c);
  #include <colorspace_fragment>
}`;
const makeMaterial = (f) => {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0xffffff) }, uTime: { value: 0 }, uLevel: { value: 1 }, uFx: { value: 0 }, uCz: { value: f.cz }, uHalf: { value: f.ez + f.mz } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  m.userData.blackout = 'hide'; // (render/silhouette.js: not drawn on a blacked-out car)
  return m;
};

// a colour brought up to full brightness, as a lamp is (a black or grey paint: a cool white)
const lamp = (hex) => {
  const r = hex >> 16, g = (hex >> 8) & 255, b = hex & 255, top = Math.max(r, g, b), low = Math.min(r, g, b);
  if (top < 0x30 || top - low < 0x18) return 0xdfe8ff;
  const k = 255 / top;
  return (Math.round(r * k) << 16) | (Math.round(g * k) << 8) | Math.round(b * k);
};

// ---- dressing a model ----
const live = new Set(); // WeakRefs to the models dressed
const blackedOut = (model) => { const m = model.userData.body?.material; return !!m && (m === SILHOUETTE || (m.isMeshBasicMaterial && m.color.getHex() < 0x0a0a0e)); };
// a car's OWN glow (built into its model: a Super kit's, the Super Lowrider's neon) carries userData.ownUnderglow: hidden while a Glow is worn
const ownGlows = (model) => { const list = []; model.traverse((o) => { if (o.userData.ownUnderglow) list.push(o); }); return list; };
const paint = (plan) => {
  const g = plan.look, u = plan.material.uniforms;
  u.uFx.value = g.fx || 0;
  u.uColor.value.setHex(g.hex === null ? lamp(carPrimary(plan.car, plan.evil)) : g.hex);
};
const build = (model, plan) => {
  const f = glowFootprint(model);
  if (!f) return null;
  const material = plan.material = makeMaterial(f), mesh = new THREE.Mesh(glowGeometry(f), material); // (plan.material: its own, kept: a blackout swaps the mesh's)
  mesh.userData.underglow = true;
  mesh.raycast = () => {}; // (not pickable)
  model.add(mesh);
  // held on the floor by the suspension (it was measured before the glow was on): a planted part, as a decal on the floor is
  const s = prepareSuspension(model);
  if (!s.planted.includes(mesh)) { s.planted.push(mesh); s.plantedMeshes.push(mesh); }
  plan.footprint = f;
  // the model's animate hook gives the time (one number a frame); its livery hook the side, for 'Match car'
  const animate = model.userData.animate, livery = model.userData.livery;
  model.userData.animate = function (t, ...rest) { const r = animate?.call(this, t, ...rest); material.uniforms.uTime.value = (t || 0) % 840; return r; };
  model.userData.livery = function (evil, ...rest) { const r = livery?.call(this, evil, ...rest); if (plan.evil !== !!evil) { plan.evil = !!evil; if (plan.look) paint(plan); } return r; };
  return mesh;
};
const apply = (model) => restPose(model, () => applyNow(model)); // (at rest: a model that animates is measured as built, then the cosmetic rides with its part: render/restpose.js)
const applyNow = (model) => {
  const plan = model.userData.underglowPlan;
  if (!plan) return;
  const id = plan.status === 'ok' ? shownUnderglow(plan.carId) : 'none';
  plan.look = id === 'none' ? null : underglowById(id);
  if (plan.look && !plan.mesh && !blackedOut(model)) plan.mesh = build(model, plan);
  if (plan.mesh) {
    plan.mesh.visible = !!plan.look && !blackedOut(model);
    if (plan.look) paint(plan);
  }
  plan.worn = !!plan.look && !!plan.mesh;
  for (const o of ownGlows(model)) o.visible = !plan.worn; // (a Super car's own glow: replaced by a worn one)
};
const refresh = () => {
  for (const ref of live) { const model = ref.deref(); if (model) apply(model); else live.delete(ref); }
  for (const fn of [...listeners]) fn();
};
Store.onStore(({ slot }) => { if (slot === null || slot === 'underglow') refresh(); });
export const underglowPlan = (model) => model?.userData.underglowPlan || null;
export const dressUnderglow = (model, car) => {
  if (!model || model.userData.underglowPlan) return model;
  const status = !car ? 'none' : underglowSupported(car) ? 'ok' : 'unsupported';
  model.userData.underglowPlan = { carId: car ? car.id : null, car, status, mesh: null, material: null, look: null, worn: false, evil: false, footprint: null };
  live.add(new WeakRef(model));
  apply(model);
  return model;
};
// the game's word each frame (render/items.js): 0 off (afloat, high in the air) .. 1 as drawn, a little over with speed
export const setUnderglowLevel = (model, k) => { const m = model?.userData.underglowPlan?.material; if (m) m.uniforms.uLevel.value = k; };

// ---- the Cosmetics screen's tab: its chips (the plain chip list, render/cosmeticsui.js chipPanel), shown where the car can wear it ----
registerSlot({
  id: 'underglow', label: 'Glow', name: 'Underglow', scope: 'car',
  supports: (car) => underglowSupported(car),
  items: () => UNDERGLOWS.map(g => ({ id: g.id, name: g.name, swatch: swatchOf(g) })),
  chosen: (target) => underglowChoice(target),
  pick: (id, target) => setUnderglow(id, target),
});
