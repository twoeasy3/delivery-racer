// A check of the dents (src/delivery/render/dents.js), without a browser: three.js alone, no renderer.
//   node scripts/.dents-check.mjs
import * as THREE from 'three';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { dentLevel, damageShare, dentModel, scorch } = await import('../src/delivery/render/dents.js');
  const { CONFIG } = await import('../src/delivery/config.js');
  check([0, 0.2, 0.25, 0.5, 0.8, 1].map(dentLevel).join() === '0,0,1,2,3,3', 'a step more crumpled at each of ' + CONFIG.dents.steps.join(', ') + ' of damage');
  check(damageShare({ health: 30, maxHealth: 120 }) === 0.75 && damageShare({ health: -5, maxHealth: 100 }) === 1 && damageShare({ health: 1, maxHealth: 0 }) === 0, 'the share of health lost, 0 to 1');
  const paint = new THREE.MeshLambertMaterial(), geometry = new THREE.BoxGeometry(1, 1, 1);
  const group = new THREE.Group(), body = new THREE.Mesh(geometry, paint), door = new THREE.Mesh(geometry, paint), glass = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
  group.add(body, door, glass);
  dentModel(group, body, 0);
  check(body.geometry === geometry && !group.userData.dentPanels, 'an undamaged car is left alone');
  dentModel(group, body, 0.6);
  const moved = (mesh) => { let far = 0; const a = mesh.geometry.attributes.position, b = geometry.attributes.position; for (let i = 0; i < a.count * 3; i++) far = Math.max(far, Math.abs(a.array[i] - b.array[i])); return far; };
  check(body.geometry !== geometry && door.geometry !== geometry && glass.geometry === geometry, 'at 60% the panels in the body\'s paint are crumpled copies, the glass is not');
  check(moved(body) > 0.01 && moved(body) <= CONFIG.dents.amount * 2 + 1e-6 && ![...body.geometry.attributes.position.array].some(Number.isNaN), 'vertices shoved by up to ' + moved(body).toFixed(3) + ' of the panel');
  const pos = body.geometry.attributes.position, seen = new Map(); let together = true;
  for (let i = 0; i < pos.count; i++) { const key = [0, 1, 2].map(k => geometry.attributes.position.array[i * 3 + k]).join(), now = [pos.getX(i), pos.getY(i), pos.getZ(i)].join(); if (seen.has(key) && seen.get(key) !== now) together = false; seen.set(key, now); }
  check(together, 'a box\'s corners stay together');
  const at60 = body.geometry;
  dentModel(group, body, 0.9);
  dentModel(group, body, 0.6);
  check(body.geometry === at60, 'each step\'s geometry is built once and kept');
  dentModel(group, body, 0);
  check(body.geometry === geometry && door.geometry === geometry, 'a new car is clean again');
  const colour = new THREE.Color(1, 0.5, 0.25);
  scorch(colour, 0); const clean = colour.r;
  scorch(colour, 1);
  check(clean === 1 && Math.abs(colour.r - (1 - CONFIG.dents.scorch)) < 1e-9, 'the paint is darkened by ' + CONFIG.dents.scorch + ' at full damage, not at all at none');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
