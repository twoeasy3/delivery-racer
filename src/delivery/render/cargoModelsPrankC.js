// ---- the prank cargo, part C: three more Evil cargo models (IDEAS-prank-cargo-12-Oct.md, P8 to P10) ----
// As cargoModelsEvil2.js's twenty (cargoModels.js spreads these into CARGO_MODELS): each a group standing
// on y = 0, facing +z, about a metre tall when calm, with userData.animate(t) and userData.setState(0 | 1 | 2).
// Plain three.js: nothing here touches the game. The ids are cargo.js's. Each is a practical joke, a thing
// and not a person: calm a plain object with one tell, agitated the prank arming, furious the prank going
// off over and over, and each state its own outline (one cube / two tiers / a tower; hanging high / bobbing /
// on the ground; corked and upright / open and flicking / tipping with a fan of blots).
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const glassy = (color, opacity = 0.25) => new THREE.MeshPhongMaterial({ color, transparent: true, opacity, shininess: 120, depthWrite: false });
const shiny = (color) => new THREE.MeshPhongMaterial({ color, shininess: 90 });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const tube = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n, 1, true);
const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);
const torus = (r, t, n = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 6, n, arc);
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 8);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const plane = (w, h) => new THREE.PlaneGeometry(w, h);
const disc = (r, n = 10) => new THREE.CircleGeometry(r, n);
const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
const FLAT = Math.PI / 2;
// a part of a model: a mesh at (x, y, z), optionally turned (rx, ry, rz)
const part = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
// shown `k` of the way (0: gone, as near as a scale can be)
const show = (object, k) => object.scale.setScalar(Math.max(0.001, k));
// a material's colour, somewhere between two
const shade = new THREE.Color();
const tint = (material, from, to, k) => material.color.setHex(from).lerp(shade.setHex(to), clamp01(k));
// a shake that never repeats in step: -1 .. 1
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
// a face drawn on another (a blot on a blotter, a label on glass): never fights the face under it
const onFace = (material) => { material.polygonOffset = true; material.polygonOffsetFactor = -1; material.polygonOffsetUnits = -1; return material; };
// the shade inside an open container: a near-black face across its opening, so it reads as open from any
// distance, whatever stands proud of it (as cargoModels3.js's)
const SHADE = glow(0x0a0806);
// a word on a note (GOTCHA), as a material: plain `ground` where there is no canvas to draw on (headless checks)
const lettered = (text, colour, ground, w = 256, h = 128) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + ground.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#' + colour.toString(16).padStart(6, '0');
    ctx.font = 'bold ' + Math.round(h * 0.5) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + h * 0.04, w * 0.9);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide });
  } catch { return glow(ground, { side: THREE.DoubleSide }); }
};
// a strand (a fishing line, a cork's string): a unit cylinder along +y, laid from one point to another each frame
const STRAND = cyl(0.006, 0.006, 1, 5).translate(0, 0.5, 0);
const UP = new THREE.Vector3(0, 1, 0), DIR = new THREE.Vector3();
const strand = (mesh, from, to) => {
  DIR.subVectors(to, from);
  const len = DIR.length();
  mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(UP, DIR.normalize());
  mesh.scale.set(1, Math.max(0.001, len), 1);
};
// an Evil item: pose(t, agitated, furious, dt), the two weights 0 .. 1 easing as its state changes
const stated = (group, pose) => {
  const w = [1, 0, 0];
  let target = 0, last = null;
  group.userData.state = 0;
  group.userData.setState = (state, snap = false) => {
    target = Math.max(0, Math.min(2, Math.round(state) || 0));
    group.userData.state = target;
    if (snap) for (let i = 0; i < 3; i++) w[i] = i === target ? 1 : 0;
  };
  group.userData.animate = (t) => {
    const dt = last === null ? 0 : Math.min(0.1, Math.abs(t - last));
    last = t;
    for (let i = 0; i < 3; i++) w[i] += Math.max(-dt / TRANSITION, Math.min(dt / TRANSITION, (i === target ? 1 : 0) - w[i]));
    pose(t, w[1], w[2], dt);
  };
  group.userData.animate(0);
  return group;
};

// ============================================================================
// P8. Boxes within Boxes: one big kraft-paper present with a red ribbon / the lid tipped back and a
// second box up out of the dark of it, a third bobbing out of that, the two tiers rocking, lids clapping /
// a swaying tower of six ever-smaller open boxes, every lid thrown back and clapping, the tiny top one
// with a note out of it that says GOTCHA, the bottom box hopping. One cube, two tiers, a tower
// ============================================================================
const makeNestedBoxes = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const wraps = [0xb07a48, 0x6fa8dc, 0xf2c14e, 0x8fc77a, 0xf29ab5, 0xfdf7ea].map(c => lambert(c));
  const ribbon = lambert(0xd8262b);
  const boxes = [];
  let parent = all, s = 0.7;
  for (let k = 0; k < 6; k++) {
    // a box: its base's centre at the origin, four walls, no top, the shade just below the rim, and its lid
    // hinged along the back edge (hung just behind and above the wall, so it swings clear of it)
    const h = s * 0.8, thick = Math.max(0.018, s * 0.045), lidT = Math.max(0.02, s * 0.06), mat = wraps[k];
    const b = sub(parent);
    for (const d of [-1, 1]) {
      part(b, box(s, h, thick), mat, 0, h / 2, d * (s - thick) / 2);
      part(b, box(thick, h, s - thick * 2), mat, d * (s - thick) / 2, h / 2, 0);
    }
    if (k === 0) part(b, box(s, 0.03, s), mat, 0, 0.015, 0);
    part(b, plane(s - thick * 2, s - thick * 2), SHADE, 0, h - 0.012, 0, -FLAT);
    const hinge = sub(b, 0, h + 0.005, -s / 2 - 0.015);
    const lid = part(hinge, box(s * 1.04, lidT, s * 1.03), mat, 0, lidT / 2, s * 1.03 / 2);
    boxes.push({ b, hinge, lid, s, h, lidT });
    parent = b;
    s *= 0.77;
  }
  // the ribbon round the big box: a band down each wall and across its lid, a bow with two tails on top
  const b0 = boxes[0], s0 = b0.s, h0 = b0.h;
  for (const d of [-1, 1]) {
    part(b0.b, box(0.1, h0 - 0.004, 0.008), ribbon, 0, (h0 - 0.004) / 2, d * (s0 / 2 + 0.004));
    part(b0.b, box(0.008, h0 - 0.004, 0.1), ribbon, d * (s0 / 2 + 0.004), (h0 - 0.004) / 2, 0);
  }
  part(b0.hinge, box(0.1, 0.01, s0 * 1.03), ribbon, 0, b0.lidT + 0.005, s0 * 1.03 / 2);
  part(b0.hinge, box(s0 * 1.04, 0.01, 0.1), ribbon, 0, b0.lidT + 0.005, s0 / 2 + 0.015);
  const bow = sub(b0.hinge, 0, b0.lidT + 0.01, s0 / 2 + 0.015);
  for (const d of [-1, 1]) part(bow, cone(0.09, 0.2, 4), ribbon, d * 0.11, 0.04, 0, 0, 0, d * FLAT).scale.y = 0.5;
  part(bow, sphere(0.045, 8, 6), ribbon, 0, 0.04, 0);
  const tails = [-1, 1].map(d => {
    const tail = sub(bow, d * 0.03, 0.03, 0.02);
    part(tail, box(0.05, 0.006, 0.2), ribbon, 0, 0, 0.1);
    tail.rotation.y = d * 0.6;
    return tail;
  });
  // the note out of the tiny top box: a stem up through the shade to the rim, the note broad above it
  const top = boxes[5];
  const note = sub(top.b, 0, top.h - 0.03, 0);
  part(note, plane(0.05, 0.06), glow(0xfdf7ea, { side: THREE.DoubleSide }), 0, 0.03, 0);
  part(note, plane(0.34, 0.2), lettered('GOTCHA', 0xd8262b, 0xfdf7ea), 0, 0.06 + 0.1, 0);
  return stated(group, (t, open, out) => {
    const calm = clamp01(1 - open - out), armed = clamp01(open + out);
    // how far the nest has come apart: lid k tips back over P in [k, k + 0.45], box k + 1 rises over [k + 0.45, k + 1].
    // Agitated, P is 1.9: two lids back, the second box up and the third bobbing in its mouth; furious the lot
    const P = open * 1.9 + out * 6;
    const clap = Math.sin(t * 9) * 0.12 * armed;
    boxes.forEach((bx, k) => {
      const lifted = clamp01((P - k) * 2.2);
      bx.hinge.rotation.x = -lifted * (FLAT + 0.35 + clap);
      if (k === 0) return;
      const above = boxes[k - 1];
      const bob = k === 2 ? open * 0.1 * Math.sin(t * 5) : 0;
      const rise = clamp01(smooth((P - k + 1 - 0.45) / 0.55) + bob);
      const hidden = above.h - 0.022 - (bx.h + bx.lidT + 0.005), risen = above.h - 0.06;
      bx.b.position.y = mix(hidden, risen, rise);
      bx.b.rotation.z = out * Math.sin(t * 2.8 - k * 0.6) * 0.07 + (k === 1 ? open * Math.sin(t * 3.5 + 1) * 0.06 : 0);
      bx.b.rotation.x = out * Math.cos(t * 2.1 - k * 0.5) * 0.04;
    });
    show(note, clamp01((P - 5) * 2.2));
    note.rotation.x = Math.sin(t * 7) * 0.3 * out;
    tails.forEach((tail, k) => { tail.rotation.x = -0.3 + Math.sin(t * 4 + k * 2) * 0.2 * (1 + armed); });
    // calm: a soft thud inside now and then rocks it; agitated the two tiers rock; furious the tower sways and hops
    const thud = Math.pow(Math.max(0, Math.sin(t * 2.1)), 12) * (Math.sin(t * 0.7) > 0 ? 1 : -1);
    all.rotation.z = calm * thud * 0.1 + open * Math.sin(t * 3.5) * 0.05 + out * Math.sin(t * 2.8) * 0.05;
    all.position.set(out * jitter(t, 1) * 0.02, calm * Math.abs(thud) * 0.02 + out * Math.abs(Math.sin(t * 7)) * 0.08, 0);
  });
};

// ============================================================================
// P9. Spider on a Fishing Line: a short rod on a stand, a fat rubber spider hung from its tip on a line,
// a price tag on one leg. Hanging high and turning slowly, the tip bent under it / the rod jigging and
// the spider bouncing on the line, legs flexing, the tag flapping / the line paid out: it scuttles round
// in front of the stand, legs going, then is reeled up fast and dropped again, eyes red, the rod whipping
// ============================================================================
const makeSpider = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const iron = lambert(0x2f3340), rodMat = lambert(0x8a2a2a), cork = lambert(0xc9a878), rubber = shiny(0x14121a), lineMat = lambert(0xd8e8f0);
  // the stand: a heavy disc, a post and a cup the rod's butt sits in
  part(all, cyl(0.2, 0.22, 0.05, 18), iron, 0, 0.025, -0.15);
  part(all, cyl(0.03, 0.03, 0.22, 10), iron, 0, 0.16, -0.15);
  part(all, tube(0.045, 0.045, 0.12, 10), iron, 0, 0.3, -0.12, 0.55);
  // the rod: three segments, each bending a little more than the last; a reel and its handle on the first
  const rod = sub(all, 0, 0.27, -0.14);
  const L = 0.4, segs = [];
  let p = rod;
  for (let k = 0; k < 3; k++) {
    const seg = sub(p, 0, k ? L : 0, 0);
    part(seg, cyl(0.02 - k * 0.006, 0.024 - k * 0.006, L, 8), k ? rodMat : cork, 0, L / 2, 0);
    if (k) part(seg, torus(0.03, 0.006, 10), iron, 0, L * 0.5, 0.02);
    segs.push(seg);
    p = seg;
  }
  part(segs[0], cyl(0.07, 0.07, 0.04, 16), iron, 0.065, 0.28, 0, 0, 0, FLAT);
  part(segs[0], box(0.06, 0.012, 0.012), iron, 0.1, 0.28, 0.04, 0, 0, 0.6);
  part(segs[0], sphere(0.018, 6, 5), cork, 0.125, 0.3, 0.06);
  const tipAt = sub(segs[2], 0, L, 0);
  const line = part(all, STRAND, lineMat);
  // the spider: a fat body, an abdomen, a head with bead eyes and fangs, eight two-jointed legs
  const spider = sub(all);
  part(spider, sphere(0.12, 14, 10), rubber);
  part(spider, sphere(0.1, 12, 8), rubber, 0, 0.05, -0.17).scale.set(1, 0.9, 1.15);
  part(spider, sphere(0.075, 10, 8), rubber, 0, -0.01, 0.15);
  const eyeMat = glow(0xf0f0f0);
  const eyes = [[-0.035, 0.03, 0.21, 0.022], [0.035, 0.03, 0.21, 0.022], [-0.06, 0.01, 0.195, 0.013], [0.06, 0.01, 0.195, 0.013]].map(([x, y, z, r]) => part(spider, sphere(r, 7, 5), eyeMat, x, y, z));
  for (const x of [-0.025, 0.025]) part(spider, cone(0.012, 0.05, 5), glow(0xf0f0f0), x, -0.06, 0.2, Math.PI);
  const legs = [];
  for (const d of [-1, 1]) for (let i = 0; i < 4; i++) {
    const root = sub(spider, d * 0.09, -0.02, 0.09 - i * 0.06);
    const yaw = (1.5 - i) * 0.45;
    root.rotation.y = d > 0 ? yaw : Math.PI - yaw;
    part(root, capsule(0.016, 0.2), rubber, 0.1, 0, 0, 0, 0, FLAT);
    part(root, sphere(0.022, 7, 5), rubber, 0.2, 0, 0);
    const knee = sub(root, 0.2, 0, 0);
    part(knee, capsule(0.012, 0.3), rubber, 0.15, 0, 0, 0, 0, FLAT);
    legs.push({ root, knee, d, i });
  }
  // the price tag: a card on a short string from the back-right knee
  const tag = sub(legs[7].knee, 0.06, -0.01, 0);
  part(tag, STRAND, lineMat).scale.y = 0.05;
  part(tag, plane(0.06, 0.045), glow(0xfdf7ea, { side: THREE.DoubleSide }), 0, 0.075, 0, 0, 0, Math.PI);
  part(tag, disc(0.012), onFace(glow(0xd8262b)), 0, 0.075, 0.001);
  tag.rotation.x = Math.PI;
  const TIP = new THREE.Vector3(), AT = new THREE.Vector3(), HANG = new THREE.Vector3(), GROUND = new THREE.Vector3(), LOOP = new THREE.Vector3();
  // where it scuttles: a loop in front of the stand, clear of the base, at a heading along the loop
  const onLoop = (th, v) => v.set(Math.sin(th) * 0.3, 0.14, 0.5 + Math.cos(th) * 0.18);
  return stated(group, (t, bob, drop) => {
    const calm = clamp01(1 - bob - drop);
    // the furious cycle, 2.5 s: on the ground scuttling / reeled up fast / a shake at the top / dropped
    const period = 2.5, u = (t % period) / period, start = t - u * period;
    const th = t * 3.2, thLeft = (start + period * 0.6) * 3.2, thLand = (start + period) * 3.2;
    let ground, lift;
    if (u < 0.6) { onLoop(th, GROUND); ground = 1; lift = 0; }
    else if (u < 0.75) { lift = smooth((u - 0.6) / 0.15); onLoop(thLeft, GROUND); ground = 1 - lift; }
    else if (u < 0.85) { lift = 1; ground = 0; onLoop(thLeft, GROUND); }
    else { const k = (u - 0.85) / 0.15; lift = 1 - k * k; onLoop(thLand, GROUND); ground = 1 - lift; }
    // the rod: leaning forward out of its cup, bent under the weight, jigging / whipping
    rod.rotation.set(0.55 + bob * Math.sin(t * 7) * 0.07 + drop * Math.sin(t * 11) * 0.12, 0, drop * Math.sin(t * 9) * 0.08);
    const weight = mix(mix(0.3, 0.42, bob), 0.15 + lift * 0.3, drop);
    segs.forEach((seg, k) => { if (k) seg.rotation.x = weight * k * 0.5 + bob * Math.sin(t * 7 - k) * 0.05 + drop * jitter(t, k) * 0.06; });
    all.updateMatrixWorld(true);
    tipAt.getWorldPosition(TIP);
    all.worldToLocal(TIP);
    // the spider: hanging under the tip / bouncing on a longer line / on the ground, or on its way up or down
    HANG.set(TIP.x, TIP.y - mix(0.47, 0.6 + Math.sin(t * 7) * 0.12, bob), TIP.z);
    LOOP.copy(TIP).setY(TIP.y - 0.4 + jitter(t, 5) * 0.03 * (u > 0.75 && u < 0.85 ? 1 : 0)).lerp(GROUND, 1 - lift);
    spider.position.copy(HANG).lerp(LOOP, drop);
    const onGround = drop * ground;
    spider.rotation.set(0, calm * t * 0.6 + bob * Math.sin(t * 2.3) * 0.6 + drop * mix(t * 0.6, th + FLAT, ground), bob * Math.sin(t * 7) * 0.08 + drop * (1 - ground) * jitter(t, 6) * 0.15);
    spider.scale.setScalar(1 + drop * 0.1);
    for (const { root, knee, d, i } of legs) {
      const step = Math.sin(t * 14 + i * FLAT + (d > 0 ? 0 : Math.PI)) * onGround;
      const flex = bob * Math.sin(t * 7 + i) * 0.2;
      root.rotation.z = mix(0.5, 0.9, onGround) + flex + step * 0.25;
      knee.rotation.z = -(mix(1.5, 2.1, onGround) + flex * 0.8 - step * 0.2);
    }
    tag.rotation.x = Math.PI + Math.sin(t * 5) * 0.2 + bob * Math.sin(t * 13) * 0.5 + drop * jitter(t, 2) * 0.4;
    tint(eyeMat, 0xf0f0f0, 0xff2010, drop * 1.3);
    for (const e of eyes) e.scale.setScalar(1 + drop * 0.5);
    AT.copy(spider.position).y += 0.12;
    strand(line, TIP, AT);
  });
};

// ============================================================================
// P10. Disappearing Ink: a fat round blue bottle with a cork, on a blotter, a long quill in a brass rest
// beside it. Corked, the quill swaying, the ink sloshing / the cork popped and hanging on its string, the
// quill lifting and flicking, flat blue blots landing on the blotter and the glass and shrinking to nothing /
// the bottle rocking on its rim, a fan of blots in the air, the blotter going blue and back in waves, the
// label grinning, the quill scribbling, and the ink itself turning from blue to clear
// ============================================================================
const makeInk = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const blotterMat = lambert(0xf4efe2), leather = lambert(0x6b2a2a), brass = lambert(0xd4a94a), corkMat = lambert(0xb98a5a);
  const glass = glassy(0x8fc3ff, 0.35), rim = lambert(0x4a78c8), inkMat = new THREE.MeshLambertMaterial({ color: 0x1a2fb8, transparent: true, opacity: 1 });
  const blotMat = onFace(glow(0x1c2fb8)), featherMat = lambert(0xf2eee4, { side: THREE.DoubleSide }), labelMat = lambert(0xfdf4dc);
  // the blotter, leather corners on it
  part(all, box(0.8, 0.03, 0.58), blotterMat, 0, 0.015, 0);
  for (const x of [-1, 1]) for (const z of [-1, 1]) part(all, box(0.16, 0.012, 0.16), leather, x * 0.38, 0.036, z * 0.27, 0, Math.PI / 4);
  // the bottle: its base's centre at the origin (it rocks on the base's rim, radius BR); a hollow neck
  const BX = -0.12, BZ = 0.02, BR = 0.18;
  const bottle = sub(all, BX, 0.03, BZ);
  part(bottle, cyl(BR, 0.2, 0.05, 18), rim, 0, 0.025, 0);
  const ink = part(bottle, sphere(0.235, 16, 12), inkMat, 0, 0.27, 0);
  ink.scale.y = 0.8;
  ink.renderOrder = 1;
  const belly = part(bottle, sphere(0.26, 18, 14), glass, 0, 0.29, 0);
  belly.renderOrder = 2;
  const neck = part(bottle, tube(0.075, 0.09, 0.14), glass, 0, 0.58, 0);
  neck.renderOrder = 2;
  part(bottle, torus(0.08, 0.02, 14), rim, 0, 0.65, 0, FLAT);
  // the label on the front: a patch of a sphere just outside the glass, two eyes and a grin that show furious
  part(bottle, new THREE.SphereGeometry(0.265, 18, 10, FLAT - 0.5, 1, FLAT - 0.32, 0.64), labelMat, 0, 0.29, 0);
  const face = sub(bottle, 0, 0.29, 0);
  for (const x of [-0.05, 0.05]) part(face, sphere(0.016, 7, 5), glow(0x0a0806), x, 0.04, 0.265);
  part(face, torus(0.06, 0.012, 10, Math.PI), glow(0x0a0806), 0, -0.01, 0.275, 0, 0, Math.PI);
  // the cork, in the neck or hanging on its string from the rim
  const corkG = sub(bottle, 0, 0.65, 0);
  part(corkG, cyl(0.062, 0.055, 0.1, 12), corkMat, 0, 0.04, 0);
  const string = part(bottle, STRAND, lambert(0x6a5a40));
  const ANCHOR = new THREE.Vector3(0.08, 0.66, 0), CORKED = new THREE.Vector3(0, 0.65, 0), HUNG = new THREE.Vector3(0.3, 0.37, 0.04), CORK = new THREE.Vector3(), TOP = new THREE.Vector3();
  // the quill in its brass rest: a shaft leaning back and a little over towards the bottle, vanes on its upper part, a nib
  const QX = 0.3, QZ = 0.17;
  part(all, cyl(0.012, 0.012, 0.03, 8), brass, QX, 0.045, QZ);
  part(all, torus(0.03, 0.008, 12), brass, QX, 0.06, QZ, FLAT);
  const quill = sub(all, QX, 0.045, QZ);
  const QL = 0.95;
  part(quill, cyl(0.008, 0.012, QL, 7), featherMat, 0, QL / 2, 0);
  part(quill, cone(0.012, 0.07, 6), brass, 0, 0.0, 0, Math.PI);
  for (const d of [-1, 1]) {
    // (the vanes stand in the shaft's plane, one each side of it, so the feather reads broad from the front)
    part(quill, plane(0.09, QL * 0.58), featherMat, d * 0.052, QL * 0.69, 0, 0, 0, -d * 0.06);
    part(quill, plane(0.06, QL * 0.2), lambert(0x6b7a95, { side: THREE.DoubleSide }), d * 0.036, QL * 0.98, 0.002, 0, 0, -d * 0.06);
  }
  // the blots: flat discs on the blotter, two on the glass, and a fan that flies out of the neck
  const spots = [[0.1, 0.22], [0.26, -0.1], [0.0, -0.22], [0.32, 0.08], [-0.3, -0.2], [0.14, 0.02], [-0.32, 0.22]];
  const blots = spots.map(([x, z], k) => { const b = part(all, disc(0.055, 10), blotMat, x, 0.034, z, -FLAT, 0, k * 1.3); b.scale.x = 0.75 + (k % 3) * 0.2; return b; });
  const N = new THREE.Vector3();
  const glassBlots = [[0.6, 0.9], [-0.5, 0.6]].map(([a, e]) => {
    N.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
    const b = part(bottle, disc(0.05, 10), blotMat);
    b.position.set(0, 0.29, 0).addScaledVector(N, 0.266);
    b.lookAt(N.multiplyScalar(2).add(b.position));
    return b;
  });
  const fan = [0, 1, 2, 3, 4, 5, 6, 7].map(() => part(all, disc(0.04, 8), glow(0x1c2fb8, { side: THREE.DoubleSide })));
  return stated(group, (t, blotting, splashing) => {
    const calm = clamp01(1 - blotting - splashing), open = clamp01(blotting + splashing);
    // the bottle: upright / rocking on its rim, tipping one way then the other
    const th = splashing * Math.sin(t * 2.6) * 0.5, px = -Math.sign(th || 1) * BR;
    bottle.rotation.z = th;
    bottle.position.set(BX + px * (1 - Math.cos(th)), 0.03 - px * Math.sin(th), BZ);
    ink.rotation.z = calm * Math.sin(t * 1.8) * 0.08 + blotting * Math.sin(t * 4) * 0.15 - th * 0.6;
    ink.position.y = 0.27 - open * 0.03;
    const clear = splashing * (0.55 + 0.45 * Math.sin(t * 2));
    tint(inkMat, 0x1a2fb8, 0xcfe6ff, clear);
    inkMat.opacity = 1 - clear * 0.85;
    show(face, splashing);
    // the cork: tight in the neck / popped, hanging and swinging on its string
    CORK.copy(CORKED).lerp(HUNG, smooth(open));
    CORK.y += Math.sin(Math.PI * smooth(open)) * 0.12;
    corkG.position.copy(CORK);
    corkG.rotation.set(open * Math.sin(t * 5) * 0.2, 0, open * (1.4 + Math.sin(t * 3.7) * 0.25 + splashing * jitter(t, 3) * 0.3));
    TOP.copy(CORK).y += 0.09 * (1 - open) + open * 0.02;
    strand(string, ANCHOR, open > 0.02 ? TOP : ANCHOR);
    // the quill: swaying / lifting out of its rest, dipping towards the bottle and flicking back / scribbling
    const dip = Math.pow(Math.max(0, Math.sin(t * 3)), 3);
    quill.position.y = 0.045 + blotting * dip * 0.1 + splashing * Math.abs(Math.sin(t * 15)) * 0.06;
    quill.rotation.set(-0.5 + calm * Math.sin(t * 1.3) * 0.04 + blotting * dip * 0.1 + splashing * jitter(t, 1) * 0.1, 0, 0.25 + calm * Math.cos(t * 1.1) * 0.03 + blotting * dip * 0.18 + splashing * jitter(t, 2) * 0.1);
    // the blots: each lands, sits a moment and shrinks to nothing, over and over
    const fade = (u) => u < 0.1 ? u / 0.1 : 1 - (u - 0.1) / 0.9;
    blots.forEach((b, k) => { const u = (t * 0.55 + k / blots.length) % 1; const w = fade(u) * open * (k < 4 ? 1 : splashing); b.scale.set((0.75 + (k % 3) * 0.2) * Math.max(0.001, w), Math.max(0.001, w), 1); });
    glassBlots.forEach((b, k) => show(b, fade((t * 0.45 + k * 0.5) % 1) * open));
    fan.forEach((f, k) => {
      const u = (t * 1.1 + k / fan.length) % 1, a = k * 2.4 + Math.floor(t * 1.1 + k / fan.length) * 1.7;
      f.position.set(bottle.position.x - Math.sin(th) * 0.72 + Math.sin(a) * u * 0.55, bottle.position.y + Math.cos(th) * 0.72 + u * 0.7 - u * u * 1.1, BZ + Math.cos(a) * u * 0.55);
      f.rotation.set(t * 5 + k, t * 3, 0);
      show(f, splashing * (1 - u) * 1.3);
    });
    // the blotter goes blue and back, in waves
    tint(blotterMat, 0xf4efe2, 0x2a3fc0, splashing * (0.5 + 0.5 * Math.sin(t * 2.6 + 1)));
    all.position.set(splashing * jitter(t, 4) * 0.015, 0, 0);
  });
};

export const PRANK_C_MODELS = { nestedboxes: makeNestedBoxes, spider: makeSpider, ink: makeInk };
