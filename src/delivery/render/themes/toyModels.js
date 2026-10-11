// ---- The toy room's models: no game state, so the gimmicks page can show them too. Everything is at the game's
// own scale, in which the cars are toys: a cat is some 30 m long, a marble as tall as a van.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BALL = new THREE.SphereGeometry(1, 18, 12), CONE = new THREE.ConeGeometry(1, 1, 10), ROD = new THREE.CylinderGeometry(1, 1, 1, 14), BOX = new THREE.BoxGeometry(1, 1, 1);

// a cat asleep, curled up: a ginger tabby, nose on its paws, tail round its side (it lies along local z, head at +z)
export const makeCat = () => {
  const g = new THREE.Group();
  const fur = lambert(0xe08a3c), dark = lambert(0xb5631f), pale = lambert(0xf6e3c8), pink = lambert(0xe89a9a);
  part(g, BALL, fur, 0, 5.2, -2, 8.5, 5.6, 12);            // the body, a mound
  part(g, BALL, fur, -2.5, 4.4, -9, 6.5, 4.6, 6);           // its haunch
  for (let k = 0; k < 5; k++) part(g, BALL, dark, 0, 6.3 + Math.sin(k * 0.8) * 0.7, -9 + k * 3.6, 7.9 - Math.abs(k - 2) * 0.5, 4.9, 0.7); // stripes over its back
  const head = new THREE.Group();
  part(head, BALL, fur, 0, 0, 0, 4.6, 4, 4.4);
  part(head, BALL, pale, 0, -1.2, 3, 2.4, 1.7, 2);          // the muzzle
  part(head, BALL, pink, 0, -0.7, 4.8, 0.55, 0.4, 0.4);     // the nose
  for (const side of [-1, 1]) {
    const ear = part(head, CONE, fur, side * 2.7, 3.6, -0.4, 1.7, 3.2, 1.2);
    ear.rotation.z = -side * 0.3;
    part(head, CONE, pink, side * 2.7, 3.4, 0.1, 1, 2.2, 0.7).rotation.z = -side * 0.3;
    part(head, BOX, dark, side * 1.9, 0.5, 3.7, 1.8, 0.22, 0.3).rotation.z = side * 0.2; // an eye, shut
  }
  for (let k = -1; k <= 1; k++) part(head, BOX, dark, k * 1.5, 2.9, 1.2, 0.5, 0.5, 4); // stripes on its brow
  head.position.set(3.5, 3.6, 9.5);
  head.rotation.y = 0.5;
  g.add(head);
  for (const x of [1.5, 5.5]) part(g, BALL, pale, x, 1, 12.5, 1.7, 1.1, 2.6); // the forepaws under its chin
  // the tail, curled round along its side: a chain of balls, tapering, the tip darker
  const tail = [];
  for (let k = 0; k < 16; k++) {
    const a = -0.5 + k * 0.17, r = 11.5;
    tail.push(part(g, BALL, k > 12 ? dark : fur, 1 + Math.sin(a) * r * 0.82, 1.5, -5 + Math.cos(a) * -r * 0.2 + k * 1.15, 1.7 - k * 0.04, 1.5 - k * 0.03, 1.7));
  }
  // (asleep: its side rises and falls, and now and then the tip of its tail twitches)
  g.userData.animate = (t) => {
    g.children[0].scale.y = 5.6 + Math.sin(t * 1.3) * 0.22;
    const flick = Math.max(0, Math.sin(t * 0.7) - 0.8) * 5;
    for (let k = 12; k < 16; k++) tail[k].position.y = 1.5 + flick * (k - 11) * Math.abs(Math.sin(t * 9)) * 0.5;
  };
  return g;
};

// a teddy bear sitting up, legs out in front (it faces local +z)
export const makeTeddy = () => {
  const g = new THREE.Group();
  const fur = lambert(0xa9713d), pale = lambert(0xe3c391), dark = lambert(0x2a1c12), bow = lambert(0xc0392b);
  part(g, BALL, fur, 0, 7, 0, 6.5, 7.5, 5.5);
  part(g, BALL, pale, 0, 6.5, 3.6, 4, 5, 2.4);
  part(g, BALL, fur, 0, 17, 0.5, 5, 4.6, 4.6);
  part(g, BALL, pale, 0, 16, 4.2, 2.2, 1.7, 1.7);
  part(g, BALL, dark, 0, 16.7, 5.7, 0.7, 0.5, 0.4);
  for (const side of [-1, 1]) {
    part(g, BALL, fur, side * 4, 20.6, 0, 1.9, 1.9, 1);
    part(g, BALL, pale, side * 4, 20.6, 0.6, 1.1, 1.1, 0.6);
    part(g, BALL, dark, side * 1.9, 18.2, 4.5, 0.5, 0.5, 0.3);
    part(g, BALL, fur, side * 4.2, 2.4, 6, 2.6, 2.4, 5.5);     // a leg
    part(g, BALL, pale, side * 4.2, 2.6, 11, 2, 2, 0.6);       // its sole
    part(g, BALL, fur, side * 7, 9.5, 2, 2.1, 4.8, 2.3).rotation.z = side * 0.5; // an arm
  }
  part(g, BOX, bow, 0, 12.6, 4.4, 5, 1.6, 0.8);
  return g;
};

// a rubber duck
export const makeDuck = () => {
  const g = new THREE.Group();
  const yellow = lambert(0xffd21f), orange = lambert(0xf2801a), dark = lambert(0x1a1a1a);
  part(g, BALL, yellow, 0, 3.4, 0, 4.4, 3.4, 6);
  part(g, CONE, yellow, 0, 5, -5.6, 2.6, 4, 1.6).rotation.x = -1;
  part(g, BALL, yellow, 0, 8, 3, 2.9, 2.8, 2.9);
  part(g, BOX, orange, 0, 7.4, 6, 2, 0.7, 2.2);
  for (const side of [-1, 1]) part(g, BALL, dark, side * 1.5, 8.8, 5.1, 0.4, 0.4, 0.3);
  return g;
};

// a glass marble `r` m across... its radius: clear glass with a twist of colour inside (a cat's eye)
export const makeMarble = (color = 0x2f8fff, r = 1.1) => {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhongMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.42, shininess: 120, specular: 0xffffff });
  const spin = new THREE.Group();
  const swirl = new THREE.MeshBasicMaterial({ color });
  for (let k = 0; k < 3; k++) {
    const vane = part(spin, BALL, swirl, 0, 0, 0, r * 0.7, r * 0.12, r * 0.34);
    vane.rotation.set(0, 0, k * Math.PI / 3);
  }
  spin.add(new THREE.Mesh(BALL, glass));
  spin.children[3].scale.setScalar(r);
  part(spin, BALL, new THREE.MeshBasicMaterial({ color: 0xffffff }), -r * 0.45, r * 0.5, r * 0.55, r * 0.14, r * 0.14, r * 0.14); // a glint
  spin.position.y = r;
  g.add(spin);
  g.userData.spin = spin; // (turned as it rolls: see render/toys.js)
  g.userData.r = r;
  return g;
};

// the cat's foreleg and paw, for the one that bats at the road: it lies along local +x from the shoulder at the
// origin, `reach` m long, the paw at its end (toe beans underneath)
export const makePaw = (reach = 14) => {
  const g = new THREE.Group();
  const fur = lambert(0xe08a3c), dark = lambert(0xb5631f), pale = lambert(0xf6e3c8), pink = lambert(0xe89a9a);
  const leg = part(g, ROD, fur, reach / 2 - 1.5, 0, 0, 1.7, reach - 3, 1.7);
  leg.rotation.z = Math.PI / 2;
  for (let k = 1; k < 4; k++) { const band = part(g, ROD, dark, k * reach / 5, 0, 0, 1.75, 0.7, 1.75); band.rotation.z = Math.PI / 2; }
  part(g, BALL, pale, reach - 1.2, -0.1, 0, 2.6, 1.5, 2.4);
  for (let k = -1; k <= 1; k++) part(g, BALL, pale, reach + 0.9, -0.3, k * 1.3, 0.9, 0.8, 0.75);
  part(g, BALL, pink, reach - 1.2, -1.45, 0, 1.1, 0.2, 1);
  for (let k = -1; k <= 1; k++) part(g, BALL, pink, reach + 0.7, -1.0, k * 1.3, 0.45, 0.15, 0.4);
  return g;
};

// a loop of orange toy track, `r` m in radius and `w` wide, standing on the road across local x, driven round
// in the local y-z plane from its foot at the origin; its way out is `shift` m to the side of its way in (a
// corkscrew, as a toy loop is), with a blue stand each side
export const makeLoop = (r = 7, w = 3.4, shift = 0) => {
  const g = new THREE.Group();
  const N = 40, pos = [], idx = [];
  for (let k = 0; k <= N; k++) {
    const a = k / N * Math.PI * 2, x = shift * (k / N - 0.5);
    for (const [dx, dr] of [[-w / 2, 0], [w / 2, 0], [-w / 2, -0.5], [w / 2, -0.5]]) pos.push(x + dx, r - (r + dr) * Math.cos(a), (r + dr) * Math.sin(a));
    if (k) { const q = (k - 1) * 4; idx.push(q, q + 1, q + 4, q + 1, q + 5, q + 4, q, q + 4, q + 2, q + 2, q + 4, q + 6, q + 1, q + 3, q + 5, q + 3, q + 7, q + 5); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, lambert(0xff7a1a, { side: THREE.DoubleSide })));
  const blue = lambert(0x1f6fd0);
  for (const side of [-1, 1]) {
    part(g, BOX, blue, side * (w / 2 + 0.5), r, 0, 0.5, 2 * r + 1, 1.2);
    part(g, BOX, blue, side * (w / 2 + 0.5), 0.3, 0, 1.6, 0.6, 5);
  }
  part(g, BOX, blue, 0, 2 * r + 0.8, 0, w + 1.5, 0.6, 1.2);
  return g;
};
