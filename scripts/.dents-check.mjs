// A check of the dents (src/delivery/render/dents.js), without a browser: three.js alone, no renderer.
//   node scripts/.dents-check.mjs
import * as THREE from 'three';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { dentLevel, damageShare, dentModel, scorch, DAMAGE, subdivide } = await import('../src/delivery/render/dents.js');
  const { CONFIG } = await import('../src/delivery/config.js');
  check([0, 0.15, 0.2, 0.4, 0.6, 0.8, 1].map(dentLevel).join() === '0,0,1,2,3,4,4' && DAMAGE.length === 4 && CONFIG.dents.steps.length === 4, 'four stages, one more at each of ' + CONFIG.dents.steps.join(', ') + ' of damage');
  check(damageShare({ health: 30, maxHealth: 120 }) === 0.75 && damageShare({ health: -5, maxHealth: 100 }) === 1 && damageShare({ health: 1, maxHealth: 0 }) === 0, 'the share of health lost, 0 to 1');

  // a little car: a body box (one face per side: low-poly), a paint door, a glass house, a lamp, a stripe, four wheels
  const build = () => {
    const paint = new THREE.MeshLambertMaterial({ color: 0xff7a1a });
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 4.2), paint); body.position.y = 0.7;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1), paint); door.position.set(-0.92, 0.7, 0);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2), new THREE.MeshLambertMaterial({ color: 0x232a35 })); glass.position.y = 1.35;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff3c4 })); lamp.position.set(-0.6, 0.8, 2.12);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.004, 1.2), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })); stripe.position.set(0.2, 1.102, 1.4);
    const tyre = new THREE.CylinderGeometry(0.33, 0.33, 0.25, 16).rotateZ(Math.PI / 2), black = new THREE.MeshLambertMaterial({ color: 0x141414 });
    const wheels = [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]].map(([x, z]) => { const w = new THREE.Mesh(tyre, black); w.position.set(x, 0.33, z); return w; });
    group.add(body, door, glass, lamp, stripe, ...wheels);
    group.userData = { body };
    return { group, body, door, glass, lamp, stripe, wheels };
  };
  const car = build(), { group, body, door, glass, lamp, stripe, wheels } = car;
  const clean = new Map([body, door, glass, lamp, stripe, wheels[0]].map(m => [m, m.geometry]));
  dentModel(group, body, 0);
  check(body.geometry === clean.get(body) && !group.userData.dentLevel, 'an undamaged car is left alone');
  dentModel(group, body, 0.6);
  const toCar = (m, i, geo = m.geometry) => new THREE.Vector3().fromBufferAttribute(geo.attributes.position, i).applyMatrix4(m.matrixWorld);
  const moved = (m) => { const base = m.userData.dentFine || clean.get(m); let far = 0; for (let i = 0; i < base.attributes.position.count; i++) far = Math.max(far, toCar(m, i).distanceTo(toCar(m, i, base))); return far; };
  check(body.geometry !== clean.get(body) && door.geometry !== clean.get(door), 'at 60% the panels in the body\'s paint are crumpled copies');
  check(glass.geometry === clean.get(glass) && wheels.every(w => w.geometry === clean.get(wheels[0])), 'the glass and the wheels are left alone');
  check(moved(body) > 0.05 && moved(body) < 1 && ![...body.geometry.attributes.position.array].some(Number.isNaN), 'vertices shoved by up to ' + moved(body).toFixed(3) + ' m');
  const tris = (geo) => (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  check(tris(body.geometry) > tris(clean.get(body)) * 4, 'a low-poly panel is cut finer where it bends (' + tris(clean.get(body)) + ' to ' + tris(body.geometry) + ' triangles)');
  const fine = body.userData.dentFine, pos = body.geometry.attributes.position, seen = new Map(); let together = true;
  for (let i = 0; i < pos.count; i++) { const key = [0, 1, 2].map(k => fine.attributes.position.array[i * 3 + k]).join(), now = [pos.getX(i), pos.getY(i), pos.getZ(i)].join(); if (seen.has(key) && seen.get(key) !== now) together = false; seen.set(key, now); }
  check(together, 'a box\'s corners and cut edges stay together');
  // a small part moves whole, with the panel under it
  const lp = lamp.geometry.attributes.position, l0 = clean.get(lamp).attributes.position, off = new THREE.Vector3(lp.getX(0) - l0.getX(0), lp.getY(0) - l0.getY(0), lp.getZ(0) - l0.getZ(0));
  let whole = true; for (let i = 0; i < lp.count; i++) if (Math.abs(lp.getX(i) - l0.getX(i) - off.x) + Math.abs(lp.getY(i) - l0.getY(i) - off.y) + Math.abs(lp.getZ(i) - l0.getZ(i) - off.z) > 1e-6) whole = false;
  check(whole && off.length() > 0.02, 'a lamp is moved whole (' + off.length().toFixed(3) + ' m), riding the crushed nose');
  check(stripe.geometry !== clean.get(stripe) && moved(stripe) > 0.01, 'a stripe on the bonnet bends with it');
  // the stripe stays over the bonnet: straight down from each of its top corners, the stripe is met before the paint
  let over = true, tested = 0;
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), s0 = clean.get(stripe).attributes.position;
  group.updateMatrixWorld(true);
  for (let i = 0; i < s0.count; i++) {
    if (s0.getY(i) < 0.001) continue; // (its top face only)
    const p = toCar(stripe, i);
    ray.set(p.clone().add(new THREE.Vector3(0, 1, 0)), down);
    const hit = ray.intersectObject(body)[0];
    tested++;
    if (hit && hit.point.y > p.y + 1e-4) over = false;
  }
  over = over && tested > 0;
  check(over, 'the stripe is not swallowed by the bonnet under it');
  // never past the middle, nor into a wheel, nor behind the glass
  let middle = true, inWheel = false;
  const wheelBoxes = wheels.map(w => new THREE.Box3().setFromObject(w));
  for (let i = 0; i < pos.count; i++) {
    const a = toCar(body, i, fine), b = toCar(body, i);
    if (Math.abs(a.x) > 0.2 && Math.sign(a.x) !== Math.sign(b.x)) middle = false;
    if (Math.abs(a.z) > 0.4 && Math.sign(a.z) !== Math.sign(b.z)) middle = false;
    if (!wheelBoxes.some(w => w.containsPoint(a)) && wheelBoxes.some(w => w.containsPoint(b))) inWheel = true;
  }
  check(middle, 'no vertex is shoved past the middle of the car');
  check(!inWheel, 'no paint is shoved into a wheel');
  const at60 = body.geometry;
  dentModel(group, body, 0.9);
  dentModel(group, body, 0.6);
  check(body.geometry === at60, 'each step\'s geometry is built once and kept');
  dentModel(group, body, 0);
  check([body, door, lamp, stripe].every(m => m.geometry === clean.get(m)), 'a new car is clean again');
  // the car has driven on (and turned) since it was measured: its dents are the same as a car dented where it stood
  group.position.set(120, 3, -800); group.rotation.y = 1.1; group.updateMatrixWorld(true);
  dentModel(group, body, 0.6);
  const still = build(); dentModel(still.group, still.body, 0.6);
  const a = body.geometry.attributes.position.array, b = still.body.geometry.attributes.position.array;
  check(a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-5), 'dented the same after the car has moved and turned');
  // the cutting: an edge is cut by its own length alone, so two faces sharing it agree
  const plane = subdivide(new THREE.PlaneGeometry(1, 1), new THREE.Matrix4(), null, { edge: 0.3, passes: 4, budget: 1e6 });
  let longest = 0; const pp = plane.attributes.position, ix = plane.index.array;
  for (let t = 0; t < ix.length; t += 3) for (let k = 0; k < 3; k++) longest = Math.max(longest, new THREE.Vector3().fromBufferAttribute(pp, ix[t + k]).distanceTo(new THREE.Vector3().fromBufferAttribute(pp, ix[t + (k + 1) % 3])));
  check(longest <= 0.3 && tris(plane) === 64, 'a 1 m square cut until no edge is over 0.3 m: ' + tris(plane) + ' triangles, the longest edge ' + longest.toFixed(3) + ' m');
  const colour = new THREE.Color(1, 0.5, 0.25);
  scorch(colour, 0); const unscorched = colour.r;
  scorch(colour, 1);
  check(unscorched === 1 && Math.abs(colour.r - (1 - CONFIG.dents.scorch)) < 1e-9, 'the paint is darkened by ' + CONFIG.dents.scorch + ' at full damage, not at all at none');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
