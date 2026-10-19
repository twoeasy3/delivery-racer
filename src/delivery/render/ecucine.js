// ---- THREE MORE CINEMATICS in the unlock cinematics' engine (render/unlockcine.js: one WebGL canvas, separate shots
// with hard cuts, a tap / Esc / Space / Enter to skip to the held end and "Tap to continue", reduced motion or ?lite a
// fade-only version). The owner, 14-Oct: "Crazy Jim car purchase", "ECU up", "ECU max". By address only for now:
//   ?unlockcine=jim:<car id>              CRAZEY JIM'S SALE, 6.5 s (a sales lot, comic):
//       0.00-1.20 THE LOT     high and wide over Crazey Jim's lot at night: bunting fluttering, two searchlights
//                              swinging, an empty bay with the price board on its post
//       1.20-2.30 SOLD        close on the board: it flips to SOLD (1.45-1.75) as banknotes rain down past it
//       2.30-3.40 THE DROP    low and wide: the car drops into the bay from above (lands 2.62: a jolt, dust), its
//                              headlamps come on and it honks its own horn (3.05)
//       3.40-4.50 THE KEYS    its key tossed in from the side, tumbling, and caught in front of the camera (4.20)
//       4.50-6.50 HERO        the front three-quarter under the bunting, confetti, the board's SOLD: CRAZEY JIM'S USED CARS, the
//                              name, the stars, "Paid $..." (a car with a price); "Tap to continue" at 6.0, held
//   ?unlockcine=ecu:<car id>[:<level>]    ECU UP, 5.0 s (to <level>, default 2; held to 2..the car's max ECU):
//       0.00-1.00 THE DYNO    side on: the car on a rolling road in a dark workshop, the diagnostics tower beside it
//       1.00-2.00 THE CHIP    close on the tower: the ECU module drops into its socket (click 1.55), its light on
//       2.00-3.40 THE RUN     low rear three-quarter: the rollers spin up, the engine revs, the exhausts flare (2.5,
//                              2.9), the tail lamps on
//       3.40-5.00 READOUT     the front three-quarter, the car to one side: ECU UP, the name, ECU n-1 -> n, the level
//                              pips (the new one lights at 3.6), the figures that change (old -> new, bars filling
//                              3.7-4.4); "Tap to continue" at 4.7, held
//   ?unlockcine=ecumax:<car id>           MAX ECU, 8.0 s:
//       0.00-1.00 LIGHTS      the workshop's strip lights clunk on one by one (0.2, 0.45, 0.7)
//       1.00-2.10 THE CHIP    the module drops in (1.50); its row of lights fills, it glows the rarity's colour
//       2.10-3.00 THE TACH    close on the tower's rev counter: the needle sweeps into the red
//       3.00-3.90 REDLINE     low at the rear wheel: the rollers a blur, flames from the exhausts, a shake building
//       3.90-4.90 SHOCKWAVE   wide and low: a flash (4.0), a ring of light along the floor, sparks, rays
//       4.90-6.00 THE STARS   the car's stars over its roof, flaring one by one (5.0 on)
//       6.00-8.00 HERO        MAX ECU, the name, the stars, every pip lit, the rarity; a concept car (its key won by
//                              delivering it at its max ECU: events.js) ends with its KEY rising into the picture and
//                              "Deliver it at its max ECU for its key"; "Tap to continue" at 7.5, held
// NO TEXTURES (the owner, 14-Oct): flat colours, shapes and vertex colours only (unlockcine.js radialDisc and friends);
// the sale board's two faces are small canvas textures drawn here (SIGN_ART, 192 x 128 each: the price, SOLD). NO PEOPLE (the owner, 14-Oct): no dealer, no hands; the money,
// the key and the sign move by themselves, and a car's own driver figure is hidden (unlockcine.js: `figure` parts).
// Sound: render/audio.js Sound.play / Sound.engine only (existing WAVs and synthesised stand-ins).
import * as THREE from 'three';
import { Ecu } from '../ecu.js';
import { stars } from '../cars.js';
import { statShown } from '../showroomData.js';
import { makeKey } from './keyModels.js';
import { keyModelInUse } from './keycard.js';
import { Sound } from './audio.js';
import { prepareSuspension } from './carsuspension.js';
import { clamp, lerp, span, smooth, easeOut, easeIn, v3, rand, WHITE, setLamp, glowMat, facing, beamGeometry } from './unlockcine.js';

const money = (n) => '$' + Number(n).toFixed(2);
const hexOf = (c) => '#' + c.getHexString();
// ---- the SALE BOARD's art: a sign painter's red and white (the owner, 14-Oct: the words ON the board, not over the
// picture). A canvas of SIGN_ART pixels drawn once per wording (kept by its words), a texture made from it per play:
// a white border, a red field, the big word in heavy white capitals with a dark red edge, a small line over it
export const SIGN_ART = { w: 192, h: 128 };
const signCanvases = new Map();
const signArt = (big, small) => {
  const key = big + '|' + small;
  if (!signCanvases.has(key)) {
    const c = document.createElement('canvas');
    c.width = SIGN_ART.w; c.height = SIGN_ART.h;
    const g = c.getContext('2d'), W = c.width, H = c.height;
    g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c8202a'; g.fillRect(7, 7, W - 14, H - 14);
    g.strokeStyle = '#f4f1e8'; g.lineWidth = 2; g.strokeRect(12, 12, W - 24, H - 24);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const font = (px) => `900 ${px}px Impact, "Arial Black", system-ui, sans-serif`;
    let px = small ? 46 : 58;
    g.font = font(px);
    while (g.measureText(big).width > W - 34 && px > 14) g.font = font(--px);
    const y = small ? H * 0.6 : H * 0.52;
    g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#7d0f16'; g.strokeText(big, W / 2, y);
    g.fillStyle = '#ffffff'; g.fillText(big, W / 2, y);
    if (small) {
      g.font = `800 15px system-ui, sans-serif`;
      g.fillStyle = '#ffe9a8'; g.fillText(small.split('').join(String.fromCharCode(8202)), W / 2, H * 0.27);
    }
    signCanvases.set(key, c);
  }
  const tx = new THREE.CanvasTexture(signCanvases.get(key));
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  return tx;
};
const box = (s, parent, colour, w, h, d, x, y, z, basic = false) => {
  const mesh = new THREE.Mesh(s.keep(new THREE.BoxGeometry(w, h, d)), s.keep(basic ? new THREE.MeshBasicMaterial({ color: colour }) : new THREE.MeshLambertMaterial({ color: colour })));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// the stage's own effects off, for a director that does not use them
const quiet = (s) => {
  s.beamMat.opacity = 0; s.spotPool.material.opacity = 0; s.backGlow.material.opacity = 0;
  s.streak.material.opacity = 0; s.flareCore.material.opacity = 0; s.rays.material.opacity = 0;
};
const dropKey = (car, length) => {
  const key = makeKey(car, { model: keyModelInUse(car), rarity: 'bespoke' });
  key.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(key), size = b.getSize(v3()), mid = b.getCenter(v3());
  key.position.set(-mid.x, -mid.y, -mid.z);
  const scaled = new THREE.Group(); scaled.add(key); scaled.scale.setScalar(length / Math.max(size.y, 0.01));
  const rig = new THREE.Group(); rig.add(scaled);
  return rig;
};

// ---- CRAZEY JIM'S KEY (CHECKLIST 452, the owner: "a less nice key"): a lot key, not the car's own. A plain worn brass blade
// key (a round head with its hole, four cut teeth), on a cheap split ring with a manila paper tag on a bit of string, the tag
// scuffed and scrawled on (dark marks, no text, no texture). Flat colours only; 15 small meshes, shared box geometry.
const lotKey = (s, length) => {
  const { keep } = s;
  const cube = keep(new THREE.BoxGeometry(1, 1, 1));
  const mat = (color, metal, rough) => keep(new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough }));
  const brass = mat(0xa8873e, 0.55, 0.62), steel = mat(0x9aa0a8, 0.7, 0.45), tag = mat(0xd6c08a, 0, 0.95), scuff = mat(0xa38f5f, 0, 1), ink = mat(0x2b2d33, 0, 0.9), twine = mat(0xbfb497, 0, 1);
  const g = new THREE.Group();
  const part = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1, rz = 0) => { const p = new THREE.Mesh(geo, m); p.position.set(x, y, z); p.scale.set(sx, sy, sz); p.rotation.z = rz; g.add(p); return p; };
  // the key: its head (a disc, the hole a dark disc a hair proud on each face), shoulder, blade and teeth
  const disc = keep(new THREE.CylinderGeometry(1, 1, 1, 20).rotateX(Math.PI / 2));
  part(disc, brass, 0, -0.1, 0, 0.075, 0.075, 0.018);
  part(disc, ink, 0, -0.06, 0, 0.016, 0.016, 0.022);
  part(cube, brass, 0, -0.185, 0, 0.06, 0.03, 0.016);
  part(cube, brass, -0.004, -0.33, 0, 0.032, 0.27, 0.008);
  [0.06, 0.035, 0.05, 0.025].forEach((h, i) => part(cube, brass, 0.012 + h / 4, -0.24 - i * 0.05, 0, h / 2, 0.03, 0.008)); // (the cut, uneven)
  // the ring through the hole, the string from the ring, the tag
  const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(0.045, 0.005, 6, 20)), steel);
  ring.rotation.y = Math.PI / 2; ring.position.set(0, -0.03, 0); g.add(ring);
  part(cube, twine, 0.08, -0.05, 0, 0.155, 0.006, 0.006, -0.26); // (ring to eyelet)
  part(cube, tag, 0.17, -0.16, 0, 0.11, 0.2, 0.004, -0.12);
  part(disc, steel, 0.155, -0.07, 0, 0.011, 0.011, 0.007); // (the tag's eyelet)
  part(cube, scuff, 0.19, -0.2, 0.0025, 0.05, 0.012, 0.001, 0.4); // (scuffs)
  part(cube, scuff, 0.15, -0.23, 0.0025, 0.03, 0.009, 0.001, -0.6);
  part(cube, ink, 0.165, -0.13, 0.0027, 0.06, 0.008, 0.001, -0.08); // (a scrawl: the stock number)
  part(cube, ink, 0.17, -0.15, 0.0027, 0.045, 0.008, 0.001, -0.15);
  g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g), size = b.getSize(v3()), mid = b.getCenter(v3());
  g.position.set(-mid.x, -mid.y, -mid.z);
  const scaled = new THREE.Group(); scaled.add(g); scaled.scale.setScalar(length / Math.max(size.y, 0.01));
  const rig = new THREE.Group(); rig.add(scaled);
  return rig;
};

// ---- the dyno ROLLERS' art (the owner, 14-Oct: "the single stripe strobes"): two canvases drawn once (ROLLER_ART:
// 64 x 16 px each): KNURL, 16 even bands round the roller (light and dark, so no single line flickers); STREAK, the same
// steel smeared round (even all the way round, faint rings along its length) for a fast spin. cap: the most it turns,
// rad/s, a third of a band a frame at 30 frames a second (2 pi / 16 / 3 x 30); fast: the revs past which the streak shows
export const ROLLER_ART = { w: 64, h: 16, bands: 16, cap: (Math.PI * 2 / 16 / 3) * 30, fast: 0.3 };
let rollerCanvases = null;
const rollerArt = (keep) => {
  if (!rollerCanvases) {
    const make = (draw) => { const c = document.createElement('canvas'); c.width = ROLLER_ART.w; c.height = ROLLER_ART.h; draw(c.getContext('2d'), c.width, c.height); return c; };
    rollerCanvases = {
      knurl: make((g, w, h) => {
        const band = w / ROLLER_ART.bands;
        for (let i = 0; i < ROLLER_ART.bands; i++) { g.fillStyle = i % 2 ? '#6f757e' : '#c3c8cf'; g.fillRect(i * band, 0, band, h); }
      }),
      streak: make((g, w, h) => {
        for (let y = 0; y < h; y++) { const v = 150 + 25 * Math.sin((y / h) * Math.PI * 4); g.fillStyle = `rgb(${v},${v + 4},${v + 10})`; g.fillRect(0, y, w, 1); }
      }),
    };
  }
  const tx = (c) => { const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; };
  return { knurl: tx(rollerCanvases.knurl), streak: tx(rollerCanvases.streak) };
};

// ============================================================================ CRAZEY JIM'S SALE
const jim = (kx) => {
  const { s, car } = kx;
  const { scene, keep, W, H, L } = s;
  quiet(s);
  s.floor.material.color.setHex(0x24262b); // (the lot's tarmac)
  // the bays' white lines (this bay and one each side, empty)
  const paint = keep(new THREE.MeshLambertMaterial({ color: 0xe8e4d8 })), unit = keep(new THREE.BoxGeometry(1, 1, 1));
  const bay = W + 1.4;
  for (const x of [-1.5, -0.5, 0.5, 1.5]) {
    const line = new THREE.Mesh(unit, paint);
    line.scale.set(0.1, 0.01, L + 1.6); line.position.set(x * bay, 0.006, 0);
    scene.add(line);
  }
  // the poles and the BUNTING: four strings of flags round the bay, fluttering
  const poleMat = keep(new THREE.MeshLambertMaterial({ color: 0x8a8f98 })), poleGeo = keep(new THREE.CylinderGeometry(0.06, 0.07, 4.4, 8));
  const px = W / 2 + 3.4, pz = L / 2 + 2.8, corners = [[-px, pz], [px, pz], [px, -pz], [-px, -pz]];
  for (const [x, z] of corners) { const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.set(x, 2.2, z); scene.add(pole); }
  const FLAGS = [0xe8352c, 0xffd23f, 0x2f7fe0, 0x3cc464, 0xf4f4f4], strings = [];
  const flagPos = [], flagCol = [], c = new THREE.Color();
  const lineMat = keep(new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k], [bx, bz] = corners[(k + 1) % 4], n = 12, pts = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(v3(lerp(ax, bx, u), 4.25 - 0.55 * 4 * u * (1 - u), lerp(az, bz, u))); }
    scene.add(new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), lineMat));
    const along = v3(bx - ax, 0, bz - az).normalize(), out = v3(-along.z, 0, along.x);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, y = 4.25 - 0.55 * 4 * u * (1 - u), x = lerp(ax, bx, u), z = lerp(az, bz, u), half = 0.16;
      strings.push({ at: flagPos.length, out, phase: i * 0.9 + k });
      flagPos.push(x - along.x * half, y, z - along.z * half, x + along.x * half, y, z + along.z * half, x, y - 0.36, z);
      c.setHex(FLAGS[(i + k) % FLAGS.length]).multiplyScalar(0.9);
      for (let v = 0; v < 3; v++) flagCol.push(c.r, c.g, c.b);
    }
  }
  const flagGeo = keep(new THREE.BufferGeometry());
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute(flagPos, 3));
  flagGeo.setAttribute('color', new THREE.Float32BufferAttribute(flagCol, 3));
  const flagBase = flagPos.slice();
  scene.add(new THREE.Mesh(flagGeo, keep(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }))));
  // two SEARCHLIGHTS behind the lot, swinging (their beams pointing up)
  const beamGeo = keep(beamGeometry(1.1, 16)), beamMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xfff2c0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const lights = [-1, 1].map((side) => {
    const g = new THREE.Group(), cone = new THREE.Mesh(beamGeo, beamMat);
    cone.rotation.x = Math.PI; // (the apex at the lamp, opening upward)
    g.add(cone);
    g.position.set(side * (W / 2 + 4.2), 0.3, -(L / 2 + 3.5));
    box(s, g, 0x30333a, 0.5, 0.4, 0.5, 0, -0.1, 0);
    scene.add(g);
    return g;
  });
  // the PRICE BOARD on its post, in front of the bay at the left: red with a white frame; it flips round to SOLD
  const S = v3(-(W / 2 + 1.1), 1.6, L / 2 + 1.0);
  // (the post stops under the board's bottom edge, a cap on it and a thin pin up into the frame (the pivot it flips on):
  // nothing passes through either face, however it is turned)
  const postTop = S.y - 0.45;
  const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.05, postTop, 8)), poleMat);
  post.position.set(S.x, postTop / 2, S.z); scene.add(post);
  box(s, scene, 0x6d7178, 0.16, 0.04, 0.16, S.x, postTop + 0.02, S.z);
  const pin = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6)), poleMat);
  pin.position.set(S.x, postTop + 0.05, S.z); scene.add(pin);
  const board = new THREE.Group(); board.position.copy(S); scene.add(board);
  box(s, board, 0xe9e5da, 1.3, 0.85, 0.06, 0, 0, 0); // (the board: its edges white)
  // its two faces painted on (a small canvas each, SIGN_ART): the price (or FOR SALE) on the front, SOLD on the back, so
  // the flip shows one then the other; the back's plane turned round to read the right way from behind
  const faceGeo = keep(new THREE.PlaneGeometry(1.3, 0.85));
  [[car.price > 0 ? money(car.price) : 'FOR SALE', car.price > 0 ? 'FOR SALE' : '', 0.031, 0], ['SOLD', 'CRAZEY JIM\u2019S', -0.031, Math.PI]].forEach(([big, small, z, turn]) => {
    const art = keep(signArt(big, small));
    const face = new THREE.Mesh(faceGeo, keep(new THREE.MeshLambertMaterial({ map: art })));
    face.position.z = z; face.rotation.y = turn;
    board.add(face);
  });
  // BANKNOTES raining (one drawing: an instanced flat note)
  const NOTES = 40, notes = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.2, 0.005, 0.09)), keep(new THREE.MeshLambertMaterial({ color: 0x5fb35a })), NOTES);
  notes.frustumCulled = false;
  scene.add(notes);
  const r = rand(31), noteSeeds = Array.from({ length: NOTES }, () => ({ x: (r() - 0.5) * 2.4, z: r() * 1.4 - 0.7, late: r() * 0.7, spin: 2 + r() * 5, sway: r() * 6 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = v3(1, 1, 1), zero = v3(0, 0, 0);
  // dust where it lands, confetti over the hero shot
  const dustMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x8f8a80, transparent: true, opacity: 0, depthWrite: false }));
  const dust = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z]) => { const g = facing(s, s.softGeo, dustMat); g.position.set(x * W * 0.45, 0.25, z * L * 0.33); scene.add(g); return g; });
  const CONF_FLOOR = 0.012, CONF = 180, confGeo = keep(new THREE.BufferGeometry()), confSeeds = [];
  const confPos = new Float32Array(CONF * 3), confCol = [];
  for (let i = 0; i < CONF; i++) { confSeeds.push({ x: (r() - 0.5) * 9, z: (r() - 0.5) * 7, late: r() * 1.6, speed: 0.9 + r() * 0.8, sway: r() * 6, top: 3 + r() * 3.5 }); c.setHex(FLAGS[i % FLAGS.length]); confCol.push(c.r, c.g, c.b); }
  confGeo.setAttribute('position', new THREE.BufferAttribute(confPos, 3));
  confGeo.setAttribute('color', new THREE.Float32BufferAttribute(confCol, 3));
  const confetti = new THREE.Points(confGeo, keep(new THREE.PointsMaterial({ size: 0.09, vertexColors: true })));
  confetti.frustumCulled = false;
  scene.add(confetti);
  // the KEY, tossed in and caught
  const key = lotKey(s, 0.75); scene.add(key); // (a used-car lot's key: plain, worn, on a paper tag; never the car's own premium key)
  const keyGlint = facing(s, s.softGeo, keep(glowMat(0xffffff))); scene.add(keyGlint);
  const pool = s.pool; pool.material.color.setHex(0xffd9a0);
  // the words
  kx.words.tag.textContent = 'Crazey Jim’s Used Cars';
  kx.words.tag.style.color = '#ffd23f';
  kx.words.sub.textContent = car.price > 0 ? 'Paid ' + money(car.price) : '';
  const CATCH = 4.2, LAND = 2.62, DROP = 2.32;
  const P0 = v3(-3.2, 0.5, L / 2 + 0.8), P1 = v3(0.95, 1.2, L / 2 + 2.15);
  return {
    total: 6.5, hint: 6.0,
    reveal: { tag: 4.7, big: 4.75, name: 5.0, stars: 5.2, sub: 5.45 },
    shots: (k, aspect = 1.6) => {
      const tall = Math.max(1, H / 1.6);
      return [
        { from: 0, to: 1.2, cam: (u) => [v3(-5.4 * k + u * 0.6, 3.4 - u * 0.5, (L / 2 + 7) * k - u * 0.6), v3(0, 1.0, 0.4), 40] }, // THE LOT
        { from: 1.2, to: 2.3, cam: (u) => [v3(S.x + 0.9 - u * 0.25, S.y + 0.2, S.z + 2.3 - u * 0.45), S.clone().add(v3(0.1, 0, 0)), 36] }, // SOLD
        { from: 2.3, to: 3.4, cam: (u) => [v3((W / 2 + 3.2) * k - u * 0.4, 0.55, (L / 2 + 5.2) * k - u * 0.5), v3(0, H * 0.55, 0), 42] }, // THE DROP
        { from: 3.4, to: 4.5, cam: (u) => [v3(2.6 + u * 0.15, 1.3, L / 2 + 3.7 - u * 0.15), v3(0.1, 1.05, L / 2 + 0.7).lerp(P1, aspect < 1 ? 0.8 : 0.25), 40] }, // THE KEYS (a tall screen: on the key)
        { from: 4.5, to: 6.5, cam: (u) => { const d = lerp(8.4, 7.4, easeOut(u)) * k * tall; return [v3(d * 0.34, 1.2 + H * 0.3, d * 0.94), v3(0, H * 0.5 + 0.5, 0), 46, 0.2]; } }, // HERO
      ];
    },
    set(t) {
      const lt = kx.lite ? 99 : t;
      const [pos, target, fov] = kx.shotAt(t);
      kx.camera.position.copy(pos).add(kx.lite ? v3(0, 0, 0) : kx.shake(t, LAND, 0.09));
      kx.camera.fov = fov; kx.camera.lookAt(target);
      // the lot's lights: always on (a lit lot at night)
      s.hemi.intensity = 1.05; s.keyLight.intensity = 1.9; s.keyLight.position.set(-4, 7, 6);
      s.rim.intensity = 1.2; s.rim2.intensity = 0.8;
      pool.material.opacity = 0.32;
      // the car: not there until it drops (2.42-2.72), then a bounce
      const dropping = lt >= DROP;
      s.carRig.visible = dropping;
      const fall = span(lt, DROP, LAND);
      const bounce = lt > LAND ? 0.22 * Math.abs(Math.sin((lt - LAND) * 11)) * Math.exp(-(lt - LAND) * 6) : 0;
      s.carRig.position.y = (1 - fall * fall) * 5 + bounce;
      s.shadow.material.opacity = dropping ? 0.3 + 0.7 * fall : 0;
      s.model.userData.animate?.(lt === 99 ? 2.4 : t);
      setLamp(s.lamps, 'head', lt >= 3.05 ? 1 : 0, 0.8);
      setLamp(s.lamps, 'tail', lt >= 3.05 ? 1 : 0, 0.7);
      setLamp(s.lamps, 'brake', lt >= 3.05 && lt < 3.4 ? 1 : 0, 1); // (a dab on the brake as it wakes)
      setLamp(s.lamps, 'amber', !kx.lite && lt >= 3.4 && lt < 4.4 && (lt - 3.4) % 0.5 < 0.25 ? 1 : 0, 1.2); // (hazards twice: sold)
      // dust at the landing
      const dU = span(lt, LAND, LAND + 0.8);
      dustMat.opacity = lt >= LAND && lt < LAND + 0.8 ? 0.55 * (1 - dU) : 0;
      for (const g of dust) g.scale.setScalar(0.8 + dU * 2.4);
      // the bunting fluttering, the searchlights swinging
      const fp = flagGeo.attributes.position;
      for (const f of strings) {
        const w = Math.sin(t * 6 + f.phase) * 0.07, i = f.at / 3 + 2;
        fp.setXYZ(i, flagBase[f.at + 6] + f.out.x * w, flagBase[f.at + 7], flagBase[f.at + 8] + f.out.z * w);
      }
      fp.needsUpdate = true;
      lights.forEach((g, i) => { g.rotation.z = Math.sin(t * 1.3 + i * 2.2) * 0.45 - (i ? 0.15 : -0.15); g.rotation.x = 0.25 + Math.sin(t * 0.9 + i) * 0.15; });
      // the board: the price, then SOLD (it flips round 1.45-1.75)
      const flip = smooth(span(lt, 1.45, 1.75));
      board.rotation.y = flip * Math.PI;
      // the banknotes: rain from above the board (1.25 on), each tumbling down
      let n = 0;
      for (const sd of noteSeeds) {
        const age = t - 1.25 - sd.late;
        if (kx.lite || age < 0 || age > 1.6) { m4.compose(zero, q.identity(), zero); notes.setMatrixAt(n++, m4); continue; }
        const y = S.y + 1.9 - age * 2.2 - age * age * 0.6;
        e.set(age * sd.spin, age * sd.spin * 0.7, Math.sin(age * 4 + sd.sway) * 0.8);
        m4.compose(v3(S.x + sd.x + Math.sin(age * 3 + sd.sway) * 0.2, y, S.z + sd.z), q.setFromEuler(e), one);
        notes.setMatrixAt(n++, m4);
      }
      notes.instanceMatrix.needsUpdate = true;
      // the key: tossed (3.45) in an arc, tumbling, caught (4.20) and swinging a little
      const toss = span(lt, 3.45, CATCH);
      key.visible = lt >= 3.45;
      if (lt < CATCH) {
        key.position.copy(P0).lerp(P1, toss); key.position.y += Math.sin(Math.PI * toss) * 1.5;
        key.rotation.set(toss * 9, toss * 4, toss * 6);
      } else {
        const a = lt - CATCH;
        key.position.copy(P1);
        key.rotation.set(0.15, 0.55 + Math.sin(a * 5) * 0.25 * Math.exp(-a * 2.5), Math.sin(a * 7) * 0.3 * Math.exp(-a * 3)); // (its face and tag to the camera)
      }
      if (lt >= 4.5) key.visible = false; // (the hero shot: the car)
      keyGlint.position.copy(P1);
      const glint = !kx.lite && t >= CATCH && t < 4.5 ? Math.exp(-(t - CATCH) * 8) : 0;
      keyGlint.material.opacity = glint * 0.9; keyGlint.scale.setScalar(0.4 + glint * 0.6);
      // confetti over the hero shot
      const cp = confGeo.attributes.position;
      let m = 0;
      for (const sd of confSeeds) { // (each falls once and lies where it lands: the held end leaves none in the air, CHECKLIST 452)
        const age = lt === 99 ? 99 : t - 4.5 - sd.late * 0.4;
        if (age < 0) continue;
        const fallV = sd.speed * 2, landAt = (sd.top - CONF_FLOOR) / fallV, a = Math.min(age, landAt);
        cp.setXYZ(m++, sd.x + Math.sin(a * 2 + sd.sway) * 0.3, Math.max(CONF_FLOOR, sd.top - age * fallV), sd.z);
      }
      confGeo.setDrawRange(0, m); cp.needsUpdate = true;
      kx.flashMat.opacity = !kx.lite && t >= 1.75 && t < 1.9 ? 0.12 * (1 - span(t, 1.75, 1.9)) : 0; // (the SOLD moment)
      kx.flashMat.color.setHex(0xfff2c0);
      kx.fadeMat.opacity = 1 - (kx.lite ? span(t, 0, 0.5) : span(t, 0, 0.3));
    },
    cues: [[0.1, 'jingle', 0.5], [1.45, 'cash20', 0.8], [1.7, 'cash10', 0.8], [1.95, 'cash5', 0.8], [DROP, 'throw', 0.6], [LAND, 'drop', 1], [LAND + 0.02, 'crash', 0.6], [3.05, 'horn:' + (car.id), 0.7], [3.45, 'throw', 0.5], [CATCH, 'menuPick', 0.8], [4.75, 'bell', 0.7]],
  };
};
jim.words = ['tag', 'name', 'stars', 'sub']; // (no SOLD! title: the board says it)

// ============================================================================ THE DYNO (ECU up, max ECU)
// the rolling road and the workshop round the car: a platform, two rollers under each axle, three strip lights, the
// diagnostics tower (its screen's bars, a rev counter, the socket on top) and a cable to the car's nose; the ECU module
const dyno = (kx) => {
  const { s, car } = kx;
  const { scene, keep, W, H, L, accent } = s;
  quiet(s);
  s.floor.material.color.setHex(0x1b1f26);
  const deck = 0.14;
  box(s, scene, 0x3a3f47, W + 1.6, deck, L + 1.4, 0, deck / 2, 0);
  for (let i = 0; i < 12; i++) box(s, scene, i % 2 ? 0x15161a : 0xf2c21b, (W + 1.6) / 12, 0.02, 0.12, -(W + 1.6) / 2 + (i + 0.5) * (W + 1.6) / 12, deck + 0.005, L / 2 + 0.64); // (hazard stripes on its front edge)
  // THE ROLLERS, from the car's own WHEELS (the owner, 14-Oct: "place the rollers from the car's actual wheel positions"):
  // its tyres as the showroom's suspension finds them (render/carsuspension.js: discs on the floor, or the model's own
  // `planted`), grouped into axles by where they are along the car; under each axle a pair of rollers as wide as its
  // tyres, their size from the tyres', set apart so every tyre rests on both; the car lifted onto them. A car with no
  // wheels on the floor (the hovercraft, the snowcat, the saucer) stands on the plain deck. Each roller's surface is a
  // small canvas (ROLLER_ART): fine knurling of an even number of bands while it turns slowly, a soft streak once fast
  s.carRig.position.y = 0;
  s.carRig.updateMatrixWorld(true);
  const tyres = (prepareSuspension(s.model).wheelBoxes || []).map((b) => b.clone().applyMatrix4(s.model.matrixWorld));
  tyres.sort((a, b) => (a.min.z + a.max.z) - (b.min.z + b.max.z));
  const axles = [];
  for (const b of tyres) {
    const z = (b.min.z + b.max.z) / 2, r = (b.max.y - b.min.y) / 2, last = axles[axles.length - 1];
    if (last && Math.abs(z - last.z) < Math.max(0.3, 0.6 * r)) { last.zs.push(z); last.z = last.zs.reduce((a, c) => a + c) / last.zs.length; last.r = Math.max(last.r, r); last.x0 = Math.min(last.x0, b.min.x); last.x1 = Math.max(last.x1, b.max.x); }
    else axles.push({ z, zs: [z], r, x0: b.min.x, x1: b.max.x });
  }
  const rr = axles.length ? clamp(Math.min(...axles.map(a => a.r)) * 0.42, 0.08, 0.22) : 0, lift = rr * 0.6; // (the rollers' radius; how far the car stands above the deck on them)
  s.carRig.position.y = deck + lift;
  s.shadow.position.y = deck + 0.01;
  const rollers = [], arts = rollerArt(keep);
  const rollMat = keep(new THREE.MeshLambertMaterial({ color: 0xffffff, map: arts.knurl }));
  for (const a of axles) {
    const span = a.x1 - a.x0 + 0.25, cx = (a.x0 + a.x1) / 2;
    const d = Math.sqrt(Math.max(0.0001, (a.r + rr) ** 2 - (a.r + lift - rr) ** 2)); // (each roller's centre from the axle's, along the car: both touch the tyre)
    const geo = keep(new THREE.CylinderGeometry(rr, rr, span, 24));
    box(s, scene, 0x23262c, span + 0.12, rr * 0.9, 2 * (d + rr) + 0.08, cx, deck + rr * 0.45, a.z); // (the cradle they turn in)
    for (const dz of [-d, d]) {
      const g = new THREE.Group(); g.position.set(cx, deck + rr, a.z + dz);
      const roll = new THREE.Mesh(geo, rollMat); roll.rotation.z = Math.PI / 2; g.add(roll);
      scene.add(g); rollers.push(g);
    }
  }
  const rearZ = axles.length ? axles[0].z : -L * 0.31;
  // the rollers turned: by the integral of their speed (a function of the time: a still is any moment), never faster than
  // a third of a band a frame at 30 frames a second (ROLLER_ART.cap); past ROLLER_ART.fast revs the streak art shows
  const spin = (t, revAt) => {
    let angle = 0;
    for (let x = 0; x < t; x += 1 / 120) angle += Math.min(ROLLER_ART.cap, 0.5 + revAt(x) * 12) / 120;
    for (const g of rollers) g.rotation.x = -angle;
    rollMat.map = revAt(t) > ROLLER_ART.fast ? arts.streak : arts.knurl;
  };
  // the strip lights overhead (off: dark; on: white)
  const strips = [-2.4, 0, 2.4].map((x) => box(s, scene, 0x111317, 0.22, 0.06, L * 1.3, x, 4.8, 0, true));
  // the tower, beside the car's nose, turned toward the front
  const tower = new THREE.Group(); tower.position.set(W / 2 + 1.4, 0, L * 0.22); tower.rotation.y = -0.55; scene.add(tower);
  box(s, tower, 0x2b2f36, 0.75, 1.5, 0.5, 0, 0.75, 0);
  box(s, tower, 0x0b2a2e, 0.6, 0.36, 0.01, 0, 1.18, 0.251, true); // the screen
  const bars = [0, 1, 2, 3, 4, 5].map((i) => box(s, tower, accent.getHex(), 0.06, 0.2, 0.012, -0.22 + i * 0.088, 1.1, 0.256, true));
  // the rev counter under the screen: a dial, a red sector, ticks, a needle
  const gauge = new THREE.Group(); gauge.position.set(0, 0.68, 0.255); tower.add(gauge);
  gauge.add(new THREE.Mesh(keep(new THREE.CircleGeometry(0.2, 32)), keep(new THREE.MeshBasicMaterial({ color: 0x101216 }))));
  const RED0 = -0.35, RED1 = 0.55; // (the red sector: angles from the right, the needle sweeping from the left)
  const redMat = keep(new THREE.MeshBasicMaterial({ color: 0x7a1414 }));
  const red = new THREE.Mesh(keep(new THREE.RingGeometry(0.13, 0.18, 24, 1, RED0, RED1 - RED0)), redMat); red.position.z = 0.002; gauge.add(red);
  for (let i = 0; i <= 8; i++) { const a = Math.PI * 1.15 - i * (Math.PI * 1.3 / 8); const tick = box(s, gauge, 0xd8dce6, 0.012, 0.04, 0.004, Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.003, true); tick.rotation.z = a - Math.PI / 2; }
  const needle = new THREE.Group(); needle.position.z = 0.006; gauge.add(needle);
  box(s, needle, 0xff6a1a, 0.014, 0.15, 0.004, 0, 0.075, 0, true);
  const needleAt = (u) => { needle.rotation.z = (Math.PI * 1.15 - u * Math.PI * 1.3) - Math.PI / 2; }; // u 0 (idle) .. 1 (the red's end)
  // the socket on top, and the cable to the car's nose
  box(s, tower, 0x15161a, 0.5, 0.05, 0.38, 0, 1.525, 0);
  for (const [w, d, x, z] of [[0.46, 0.02, 0, 0.17], [0.46, 0.02, 0, -0.17], [0.02, 0.34, 0.22, 0], [0.02, 0.34, -0.22, 0]]) box(s, tower, 0xf2c21b, w, 0.012, d, x, 1.556, z, true);
  tower.updateMatrixWorld(true);
  const Q = v3(0, 1.55, 0).applyMatrix4(tower.matrixWorld); // (the socket)
  const from = v3(-0.3, 0.3, 0.1).applyMatrix4(tower.matrixWorld);
  const cable = new THREE.CatmullRomCurve3([from, v3(from.x - 0.4, 0.05, from.z + 0.5), v3(W * 0.2, 0.1, L / 2 + 0.9), v3(0, H * 0.28 + deck, L / 2 + 0.05)]);
  scene.add(new THREE.Mesh(keep(new THREE.TubeGeometry(cable, 30, 0.025, 6)), keep(new THREE.MeshLambertMaterial({ color: 0x15161a }))));
  // the ECU MODULE: a green board, gold pins, the chip with a stripe of the rarity's colour, a light, a row of lights
  const chip = new THREE.Group(); scene.add(chip);
  box(s, chip, 0x116b3a, 0.42, 0.04, 0.3, 0, 0, 0);
  for (let i = 0; i < 6; i++) for (const z of [-0.165, 0.165]) box(s, chip, 0xd4a531, 0.03, 0.02, 0.05, -0.17 + i * 0.068, -0.02, z);
  const die = box(s, chip, 0x15161a, 0.18, 0.04, 0.18, -0.05, 0.04, 0);
  box(s, chip, accent.getHex(), 0.16, 0.005, 0.03, -0.05, 0.062, 0.05, true);
  const led = box(s, chip, 0x222630, 0.035, 0.02, 0.035, 0.15, 0.03, 0.09, true);
  const rowLeds = [0, 1, 2, 3, 4].map((i) => box(s, chip, 0x222630, 0.025, 0.015, 0.025, 0.1 + (i % 2) * 0.045, 0.03, -0.1 + Math.floor(i / 2) * 0.05, true));
  const chipGlow = facing(s, s.softGeo, keep(glowMat(accent))); scene.add(chipGlow);
  // the exhausts' flames (a glow each), the shockwave ring on the floor
  const flameMat = keep(glowMat(0xff7a1a)), flames = [-1, 1].map((x) => { const g = facing(s, s.softGeo, flameMat); g.position.set(x * W * 0.27, deck + H * 0.14, -L / 2 - 0.2); scene.add(g); return g; });
  const ringMat = keep(new THREE.MeshBasicMaterial({ color: accent.clone().lerp(WHITE, 0.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.9, 1, 64)), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = deck + 0.03; scene.add(ring);
  const lit = (mesh, on, colour = 0xffffff) => mesh.material.color.setHex(on ? colour : 0x222630);
  return { deck, rollers, spin, axles, rearZ, strips, bars, red, redMat, needleAt, Q, chip, die, led, rowLeds, chipGlow, flames, flameMat, ring, ringMat, lit, gauge, tower, engine: car.sound || car.id };
};
// the module's drop into its socket: above it until `a`, home at `b`
const chipAt = (rig, t, a, b) => {
  const u = easeIn(span(t, a, b));
  rig.chip.position.copy(rig.Q).add(v3(0, 0.95 * (1 - u) + 0.045, 0));
  rig.chip.rotation.set(0, (1 - u) * 0.6, 0);
};
// the stats panel's rows: what changes between two ECUs (Ecu.stats), shown as the showroom shows them
const BEST = () => {
  let maxSpeed = 1, accel = 1, health = 1;
  for (const e of Object.values(Ecu.table)) { const top = e.ecus?.[e.ecus.length - 1]; if (top) { maxSpeed = Math.max(maxSpeed, top.maxSpeed); accel = Math.max(accel, top.accel); health = Math.max(health, top.health); } }
  return { maxSpeed, accel, health };
};
const ROWS = (best) => [
  ['maxSpeed', 'Top speed', (v) => Math.round(v * 3.6) + ' km/h', (v) => v / best.maxSpeed],
  ['accel', 'Acceleration', (v) => String(Math.round(v * 10) / 10), (v) => v / best.accel],
  ['health', 'Health', (v) => String(Math.round(v)), (v) => v / best.health],
  ['agility', 'Agility', (v) => String(statShown(v)), (v) => statShown(v) / 100],
  ['delivery', 'Delivery', (v) => String(statShown(v)), (v) => statShown(v) / 100],
  ['composure', 'Composure', (v) => String(statShown(v)), (v) => statShown(v) / 100],
  ['crossing', 'Crossing', (v) => String(statShown(v)), (v) => statShown(v) / 100],
  ['respawn', 'Respawn', (v) => v.toFixed(1) + ' s', (v) => clamp((6.5 - v) / 3.5)],
];
const fillPips = (el, max, lit, fresh, accent) => {
  el.replaceChildren();
  for (let i = 1; i <= max; i++) {
    const p = document.createElement('span');
    p.className = 'ucine-pip' + (i <= lit ? ' on' : '') + (i === fresh ? ' fresh' : '');
    if (i <= lit) p.style.background = accent;
    el.append(p);
  }
};

// ============================================================================ ECU UP
const ecu = (kx) => {
  const { s, car, lite } = kx;
  const { W, H, L, accent } = s;
  const rig = dyno(kx);
  const max = Ecu.max(car);
  const to = max >= 2 ? Math.round(clamp(kx.level ?? 2, 2, max)) : 1, from = Math.max(1, to - 1);
  const a = Ecu.stats(car, from), b = Ecu.stats(car, to), best = BEST();
  const rows = ROWS(best).filter(([k, , f]) => a[k] !== undefined && f(a[k]) !== f(b[k]));
  // the panel: ECU UP, the name, ECU from -> to, the pips, the rows (old -> new, a bar filling)
  const panel = Object.assign(document.createElement('div'), { className: 'ucine-panel' });
  const head = Object.assign(document.createElement('div'), { className: 'ucine-ptag', textContent: 'ECU up' });
  head.style.color = hexOf(accent);
  const title = Object.assign(document.createElement('div'), { className: 'ucine-ptitle', textContent: car.name || car.id });
  const level = Object.assign(document.createElement('div'), { className: 'ucine-plevel', textContent: to > from ? 'ECU ' + from + ' → ' + to : 'ECU ' + to });
  const pips = Object.assign(document.createElement('div'), { className: 'ucine-pips' });
  panel.append(head, title, level, pips);
  const rowEls = rows.map(([, name, f, share]) => {
    const row = Object.assign(document.createElement('div'), { className: 'ucine-row' });
    const label = Object.assign(document.createElement('span'), { className: 'ucine-rlabel', textContent: name });
    const value = Object.assign(document.createElement('span'), { className: 'ucine-rvalue' });
    const track = Object.assign(document.createElement('span'), { className: 'ucine-track' });
    const was = Object.assign(document.createElement('span'), { className: 'ucine-was' });
    const now = Object.assign(document.createElement('span'), { className: 'ucine-now' });
    now.style.background = hexOf(accent);
    track.append(now, was);
    row.append(label, value, track);
    panel.append(row);
    return { row, value, was, now, f, share };
  });
  if (!rows.length) panel.append(Object.assign(document.createElement('div'), { className: 'ucine-row', textContent: 'Its figures are the same at this ECU' }));
  kx.root.append(panel);
  const CLICK = 1.55;
  return {
    total: 5.0, hint: 4.7, reveal: {},
    shots: (k, aspect) => {
      const tall = Math.max(1, H / 1.6), Q = rig.Q;
      return [
        { from: 0, to: 1.0, cam: (u) => [v3(-6.6 * k, 1.5, 1.6 - u * 0.6), v3(0, H * 0.4, 0.2), 38] }, // THE DYNO
        { from: 1.0, to: 2.0, cam: (u) => [Q.clone().add(v3(-0.75 + u * 0.1, 0.5, 0.85 - u * 0.1)), Q.clone().add(v3(0, 0.12, 0)), 36] }, // THE CHIP
        { from: 2.0, to: 3.4, cam: (u) => [v3((W / 2 + 2.3) * Math.sqrt(k), 0.5, -(L / 2 + 2.6 - u * 0.4) * Math.sqrt(k)), v3(0, H * 0.32, -L * 0.2), 40] }, // THE RUN
        { from: 3.4, to: 5.0, cam: (u) => { const d = lerp(10.4, 9.4, easeOut(u)) * k * tall; return [v3(d * 0.66, 1.4 + H * 0.3, d * 0.75), v3(0, H * 0.42, 0), 32, aspect > 1.1 ? 0 : 0.22, 0.17]; } }, // READOUT
      ];
    },
    set(t) {
      const lt = lite ? 99 : t;
      const [pos, target, fov] = kx.shotAt(t);
      const vib = !lite && t >= 2.0 && t < 3.4 ? 0.012 : 0;
      kx.camera.position.copy(pos).add(v3(Math.sin(t * 83) * vib, Math.sin(t * 61) * vib, 0)).add(lite ? v3(0, 0, 0) : kx.shake(t, CLICK, 0.02));
      kx.camera.fov = fov; kx.camera.lookAt(target);
      // (READOUT, from the front right: the key light crosses to the camera's side and the glow comes up behind the car, as
      // in ECU MAX's hero, else a dark car (the Fishbowl's bubble, an Evil livery) is a black shape in a dark workshop)
      const ro = lt >= 3.4 ? 1 : 0;
      s.hemi.intensity = 0.85 + 0.25 * ro; s.keyLight.intensity = 1.6; s.keyLight.position.set(ro ? 3 : -3, 7, 5); s.rim.intensity = 1.2; s.rim2.intensity = 0.8;
      s.pool.material.opacity = 0.2; s.shadow.material.opacity = 1; s.backGlow.material.opacity = 0.45 * ro;
      rig.strips.forEach((m) => m.material.color.setHex(0xe8f0ff));
      // the module, its light
      chipAt(rig, lt, 1.1, CLICK);
      rig.lit(rig.led, lt >= CLICK, accent.getHex());
      rig.rowLeds.forEach((m, i) => rig.lit(m, lt >= CLICK + 0.1 + i * 0.06, accent.getHex()));
      rig.chipGlow.position.copy(rig.chip.position).add(v3(0, 0.08, 0));
      const pulse = !lite && t >= CLICK ? Math.exp(-(t - CLICK) * 4) : 0;
      rig.chipGlow.material.opacity = pulse * 0.9; rig.chipGlow.scale.setScalar(0.5 + pulse * 0.6);
      // the run: rollers, revs, exhaust flares, the screen's bars, the needle
      const revAt = (x) => (lite ? 0.15 : x < 2.0 ? 0.05 : x < 3.3 ? 0.15 + 0.7 * smooth(span(x, 2.0, 3.3)) : 0.85 * (1 - span(x, 3.3, 4.0)) + 0.15);
      const rev = revAt(t);
      rig.spin(lite ? 0 : t, revAt);
      rig.needleAt(rev * 0.82);
      rig.bars.forEach((m, i) => { const v = 0.25 + 0.75 * Math.abs(Math.sin(t * (3 + i) + i)) * (0.3 + rev); m.scale.y = v; m.position.y = 1.1 - 0.1 * (1 - v); });
      const flare = (at) => (t >= at && t < at + 0.35 ? Math.exp(-(t - at) * 9) : 0);
      const f = lite ? 0 : Math.max(flare(2.5), flare(2.9)) + (t >= 2.0 && t < 3.4 ? 0.15 + 0.1 * Math.sin(t * 40) : 0);
      rig.flameMat.opacity = clamp(f); rig.flames.forEach((g) => g.scale.setScalar(0.35 + f * 0.6));
      setLamp(s.lamps, 'head', 1, 0.5); setLamp(s.lamps, 'tail', lt >= 2.0 ? 1 : 0, 0.8); setLamp(s.lamps, 'brake', lt >= 2.0 && lt < 2.3 ? 1 : 0); setLamp(s.lamps, 'amber', 0);
      s.model.userData.animate?.(lt === 99 ? 2.4 : t);
      kx.flashMat.opacity = pulse * 0.18; kx.flashMat.color.copy(accent).lerp(WHITE, 0.5);
      kx.fadeMat.opacity = 1 - (lite ? span(t, 0, 0.5) : span(t, 0, 0.3));
      // the panel
      const pin = lite ? 1 : span(t, 3.45, 3.75);
      panel.style.opacity = pin.toFixed(3);
      panel.style.display = pin > 0 ? '' : 'none';
      fillPips(pips, max, lt >= 3.6 ? to : from, lt >= 3.6 ? to : 0, hexOf(accent));
      rowEls.forEach((r, i) => {
        const u = lite ? 1 : easeOut(span(t, 3.7 + i * 0.06, 4.3 + i * 0.06));
        const v0 = a[rows[i][0]], v1 = b[rows[i][0]];
        r.value.textContent = r.f(v0) + ' → ' + r.f(v1);
        r.was.style.width = (clamp(r.share(v0)) * 100).toFixed(1) + '%';
        r.now.style.width = (clamp(lerp(r.share(v0), r.share(v1), u)) * 100).toFixed(1) + '%';
      });
    },
    sound(t) { if (t >= 1.9) Sound.engine(t < 3.3 ? car.maxSpeed * (0.2 + 0.8 * smooth(span(t, 2.0, 3.3))) : car.maxSpeed * 0.2 * (1 - span(t, 3.3, 4.2)), rig.engine, car.maxSpeed); },
    stop() { Sound.engine(-1); },
    cues: [[0.1, 'menuMove', 0.6], [CLICK, 'camera', 0.9], [CLICK + 0.02, 'menuPick', 0.7], [2.9, 'turbo', 0.6], [3.6, 'bell', 0.7]],
  };
};
ecu.words = [];

// ============================================================================ MAX ECU
const STAR_SHAPE = (() => { // (made on first use)
  let g = null;
  return () => {
    if (g) return g;
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.5; (i ? sh.lineTo : sh.moveTo).call(sh, Math.cos(a) * r, Math.sin(a) * r); }
    g = new THREE.ShapeGeometry(sh);
    return g;
  };
})();
const ecumax = (kx) => {
  const { s, car, lite } = kx;
  const { scene, keep, H, L, accent } = s;
  const rig = dyno(kx);
  const max = Ecu.max(car), count = Math.max(1, stars(car).length);
  const starColour = kx.words.starRow.style.color || '#ffd23f';
  // the stars over the roof (flat shapes, a glow behind each)
  const starMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(starColour), side: THREE.DoubleSide }));
  const starGlowMat = keep(glowMat(new THREE.Color(starColour)));
  const starObjs = Array.from({ length: count }, (_, i) => {
    const g = new THREE.Group();
    const x = (i - (count - 1) / 2) * 0.75, y = rig.deck + H + 0.75 + Math.cos((i - (count - 1) / 2) * 0.5) * 0.25;
    g.position.set(x, y, 0.3);
    g.add(new THREE.Mesh(STAR_SHAPE(), starMat));
    const glow = facing(s, s.softGeo, starGlowMat); glow.position.copy(g.position).add(v3(0, 0, -0.05)); scene.add(glow);
    scene.add(g);
    return { g, glow };
  });
  // a concept car's KEY (won by delivering it at its max ECU: events.js), rising into the hero shot
  const keyCar = !!car.concept;
  const key = keyCar ? dropKey(car, 0.9) : null;
  const keyGlow = keyCar ? facing(s, s.softGeo, keep(glowMat(accent))) : null;
  if (key) scene.add(key, keyGlow);
  kx.words.big.textContent = 'MAX ECU';
  kx.words.big.style.color = hexOf(accent.clone().lerp(WHITE, 0.35));
  kx.words.sub.textContent = keyCar ? 'Deliver it at its max ECU for its key' : '';
  const BOOM = 4.0, CLICK = 1.5;
  return {
    total: 8.0, hint: 7.5,
    reveal: { big: 6.15, name: 6.4, stars: 6.6, pips: 6.75, pill: 6.9, sub: 7.15 },
    shots: (k) => {
      const tall = Math.max(1, H / 1.6), Q = rig.Q, T = v3(0, 0.68, 0.3).applyMatrix4(rig.tower.matrixWorld), N = v3(0, 0.68, 1.6).applyMatrix4(rig.tower.matrixWorld);
      return [
        { from: 0, to: 1.0, cam: (u) => [v3(-4.4 * k + u * 0.4, 1.0, (L / 2 + 6.0) * k - u * 0.4), v3(0, H * 0.45, 0), 40] }, // LIGHTS
        { from: 1.0, to: 2.1, cam: (u) => [Q.clone().add(v3(-0.6 + u * 0.1, 0.42, 0.7 - u * 0.12)), Q.clone().add(v3(0, 0.1, 0)), 34] }, // THE CHIP
        { from: 2.1, to: 3.0, cam: (u) => [N.clone().lerp(T, 0.15 + u * 0.08), T, 30] }, // THE TACH
        { from: 3.0, to: 3.9, cam: (u) => [v3(s.W / 2 + 1.25 + u * 0.1, rig.deck + 0.35, rig.rearZ - 1.0 + u * 0.15), v3(0, rig.deck + 0.25, rig.rearZ - L * 0.11), 46] }, // REDLINE (at the rear axle)
        { from: 3.9, to: 4.9, cam: (u) => [v3(1.2 * k, 0.45, (L / 2 + 7.5 - u * 0.6) * k), v3(0, H * 0.5, 0), 44] }, // SHOCKWAVE
        { from: 4.9, to: 6.0, cam: (u) => [v3(0.9 - u * 0.3, rig.deck + H + 0.7, L / 2 + 4.4 - u * 0.4), v3(0, rig.deck + H + 0.65, 0.3), 40] }, // THE STARS
        { from: 6.0, to: 8.0, cam: (u) => { const d = lerp(10.6, 9.2, easeOut(u)) * k * tall; return [v3(-d * 0.62, 1.45 + H * 0.3, d * 0.78), v3(0, H * 0.45, 0), 32, 0.16]; } }, // HERO
      ];
    },
    set(t) {
      const lt = lite ? 99 : t;
      const [pos, target, fov] = kx.shotAt(t);
      const build = !lite && t >= 2.6 && t < BOOM ? 0.006 + 0.03 * span(t, 2.6, BOOM) : 0;
      kx.camera.position.copy(pos).add(v3(Math.sin(t * 91) * build, Math.sin(t * 67) * build, 0)).add(lite ? v3(0, 0, 0) : kx.shake(t, BOOM, 0.1));
      kx.camera.fov = fov; kx.camera.lookAt(target);
      // the strip lights, one by one; the car's light with them
      const on = [0.2, 0.45, 0.7].map((at) => lt >= at);
      rig.strips.forEach((m, i) => m.material.color.setHex(on[i] ? 0xe8f0ff : 0x111317));
      const lights = on.filter(Boolean).length / 3;
      const after = lt >= BOOM ? 1 : 0;
      s.hemi.intensity = 0.1 + 0.8 * lights + 0.2 * after; s.keyLight.intensity = 1.7 * lights; s.keyLight.position.set(3, 7, 5);
      s.rim.intensity = 0.6 + 1.6 * after; s.rim2.intensity = 0.5 + 0.8 * after;
      s.pool.material.opacity = 0.1 + 0.3 * after; s.pool.material.color.copy(accent).lerp(WHITE, 0.5); s.shadow.material.opacity = 1;
      s.backGlow.material.opacity = 0.55 * after;
      // the module: home at 1.5, its row of lights filling, then glowing the rarity's colour
      chipAt(rig, lt, 1.1, CLICK);
      rig.lit(rig.led, lt >= CLICK, accent.getHex());
      rig.rowLeds.forEach((m, i) => rig.lit(m, lt >= CLICK + 0.12 + i * 0.09, accent.getHex()));
      const hot = smooth(span(lt, 1.7, 2.1));
      rig.die.material.color.setHex(0x15161a).lerp(accent, hot * 0.7);
      rig.chipGlow.position.copy(rig.chip.position).add(v3(0, 0.08, 0));
      rig.chipGlow.material.opacity = lite ? 0 : hot * (t < 2.1 ? 0.9 : 0.5); rig.chipGlow.scale.setScalar(0.7 + hot * 0.5);
      // the revs: to the red and past it, cut after the boom
      const revAt = (x) => (lite ? 0.12 : x < 2.15 ? 0.06 : x < BOOM ? 0.1 + 0.95 * smooth(span(x, 2.15, 3.6)) : 1.05 * (1 - span(x, BOOM + 0.3, BOOM + 1.0)) + 0.12 * span(x, BOOM + 0.3, BOOM + 1.0));
      const rev = revAt(t);
      rig.spin(lite ? 0 : t, revAt);
      rig.needleAt(Math.min(1.02, rev * (1 + 0.03 * Math.sin(t * 47))));
      rig.redMat.color.setHex(rev > 0.8 && Math.sin(t * 30) > 0 ? 0xff2a1a : 0x7a1414);
      rig.bars.forEach((m, i) => { const v = 0.25 + 0.75 * Math.abs(Math.sin(t * (3 + i) + i)) * (0.3 + rev); m.scale.y = v; m.position.y = 1.1 - 0.1 * (1 - v); });
      const f = lite ? 0 : t >= 3.0 && t < BOOM + 0.3 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 37)) * span(t, 3.0, 3.6) : t >= 2.4 && t < 3.0 ? 0.2 : 0;
      rig.flameMat.opacity = clamp(f); rig.flameMat.color.setHex(rev > 0.9 ? 0x6ab8ff : 0xff7a1a);
      rig.flames.forEach((g) => g.scale.set(0.4 + f * 0.9, 0.3 + f * 0.5, 1));
      setLamp(s.lamps, 'head', lt >= 0.7 ? 1 : 0, 0.6); setLamp(s.lamps, 'tail', lt >= 2.1 ? 1 : 0, 0.8); setLamp(s.lamps, 'brake', lt >= 2.1 && lt < 2.4 ? 1 : 0); setLamp(s.lamps, 'amber', 0);
      s.model.userData.animate?.(lt === 99 ? 2.4 : t);
      // the boom: a flash, the ring along the floor, sparks and rays from the car
      const origin = v3(0, rig.deck + H * 0.5, 0);
      const boom = !lite && t >= BOOM ? Math.exp(-(t - BOOM) * 1.5) : 0;
      const ringU = span(t, BOOM, BOOM + 0.9);
      rig.ringMat.opacity = !lite && t >= BOOM && t < BOOM + 0.9 ? 0.9 * (1 - ringU) : 0; rig.ring.scale.setScalar(0.5 + ringU * 9);
      s.flareCore.position.copy(origin); s.rays.position.copy(origin); s.streak.position.copy(origin);
      s.flareCore.material.opacity = boom * (t < 4.9 ? 1 : 0); s.flareCore.scale.setScalar(2 + boom * 4);
      s.rays.material.opacity = boom * 0.5 * (t < 4.9 ? 1 : 0); s.rays.scale.setScalar(4 + (t - BOOM) * 2); s.rays.mesh.rotation.z = t * 0.1;
      s.streak.material.opacity = boom * 0.7 * (t < 4.9 ? 1 : 0); s.streak.scale.set(12, 0.16, 1);
      kx.sparks(t, origin, BOOM, 0.5, 4.5, !lite && t < 6.0, 0);
      s.sparks.material.size = 0.12;
      if (!lite && t >= BOOM && t < BOOM + 0.8) { const a = t - BOOM; kx.flashMat.opacity = a < 0.06 ? 0.9 : Math.exp(-(a - 0.06) * 10) * 0.55; kx.flashMat.color.set(0xffffff).lerp(accent, clamp(a / 0.3)); }
      else if (!lite && t >= CLICK && t < CLICK + 0.3) { kx.flashMat.opacity = 0.2 * (1 - span(t, CLICK, CLICK + 0.3)); kx.flashMat.color.copy(accent); }
      else kx.flashMat.opacity = 0;
      // the stars: shown in their own shot, flaring one by one
      starObjs.forEach((o, i) => {
        const at = 5.0 + i * 0.13, u = span(lt, at, at + 0.25), showIt = !lite && t >= 4.9 && t < 6.0;
        o.g.visible = showIt && t >= at;
        o.g.scale.setScalar(0.55 * (1 + (1 - easeOut(u)) * 0.8));
        o.g.rotation.z = (1 - easeOut(u)) * 1.2;
        const flareS = showIt && t >= at ? Math.exp(-(t - at) * 3) : 0;
        o.glow.material.opacity = showIt ? 0.35 + 0.65 * flareS : 0;
        o.glow.scale.setScalar(0.9 + flareS * 1.4);
      });
      // the key, rising into the hero shot (a concept car)
      if (key) {
        const rise = lite ? 1 : easeOut(span(t, 6.5, 7.3));
        const showIt = lite || t >= 6.5;
        key.visible = showIt; keyGlow.visible = showIt;
        if (showIt) {
          const cam = kx.camera, fwd = v3(0, 0, -1).applyQuaternion(cam.quaternion), right = v3(1, 0, 0).applyQuaternion(cam.quaternion), up = v3(0, 1, 0).applyQuaternion(cam.quaternion);
          const { w, h } = kx.size(), halfH = 4.2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), halfW = halfH * w / h; // (placed by the picture's own size: a tall screen too)
          key.position.copy(cam.position).addScaledVector(fwd, 4.2).addScaledVector(right, halfW * 0.6).addScaledVector(up, halfH * (-1.5 + rise * 1.4));
          key.scale.setScalar(clamp(w / h / 1.2, 0.55, 1));
          key.quaternion.copy(cam.quaternion); key.rotateY(0.5 + t * 0.6); key.rotateZ(-0.25);
          keyGlow.position.copy(key.position).addScaledVector(fwd, 0.3);
          keyGlow.material.opacity = 0.55 * rise; keyGlow.scale.setScalar(1.4);
        }
      }
      kx.fadeMat.opacity = 1 - (lite ? span(t, 0, 0.5) : span(t, 0, 0.3));
      fillPips(kx.words.pips, max, max, 0, hexOf(accent));
    },
    sound(t) { if (t >= 2.1 && t < BOOM + 1.0) Sound.engine(t < BOOM + 0.3 ? car.maxSpeed * (0.15 + 1.2 * smooth(span(t, 2.15, 3.7))) : 0, rig.engine, car.maxSpeed); else if (t >= BOOM + 1.0) Sound.engine(-1); },
    stop() { Sound.engine(-1); },
    cues: [[0.2, 'drum', 0.4], [0.45, 'drum', 0.45], [0.7, 'drum', 0.5], [CLICK, 'camera', 0.9], [CLICK + 0.02, 'menuPick', 0.7], [3.0, 'turbo', 0.7], [BOOM, 'drum', 1], [BOOM + 0.02, 'burst', 0.8], [5.0, 'bell', 0.6], [6.15, 'menuPick', 0.6], ...(keyCar ? [[6.6, 'bell', 0.6]] : [])],
  };
};
ecumax.words = ['big', 'name', 'stars', 'pips', 'pill', 'sub'];

export const DIRECTORS = { jim, ecu, ecumax };
// the page bits these add (small, opaque, no shadow but a hard 1 px one; no blur, no filters)
const CSS = `
.ucine-pips{display:flex;gap:6px;justify-content:center;margin:.2em 0 .45em}
.ucine-pip{width:clamp(14px,2vw,22px);height:8px;border-radius:2px;background:#2a2e38;display:inline-block}
.ucine-pip.fresh{outline:2px solid #fff}
.ucine-panel{position:absolute;right:5%;top:50%;transform:translateY(-50%);width:min(36%,420px);color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:none;background:#0b0d12;border:1px solid #2a2e38;border-radius:6px;padding:14px 18px}
.ucine-panel .ucine-pips{justify-content:flex-start}
.ucine-ptag{font-size:13px;font-weight:800;letter-spacing:.35em;text-transform:uppercase}
.ucine-ptitle{font-size:clamp(18px,2.4vw,28px);font-weight:800;margin:.15em 0}
.ucine-plevel{font-size:clamp(15px,1.8vw,20px);font-weight:700;color:#dfe3ea}
.ucine-row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:13px;margin:7px 0 0;color:#c9cdd6}
.ucine-rvalue{font-weight:700;color:#fff}
.ucine-track{grid-column:1/3;position:relative;height:6px;background:#22262e;border-radius:3px;overflow:hidden}
.ucine-was,.ucine-now{position:absolute;left:0;top:0;bottom:0}
.ucine-was{background:#8a909c}
@media (max-aspect-ratio:11/10){.ucine-panel{right:4%;left:4%;width:auto;top:auto;bottom:4%;transform:none}}
`;
jim.css = ecu.css = ecumax.css = CSS;
