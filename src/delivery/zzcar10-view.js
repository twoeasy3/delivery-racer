import * as THREE from 'three';
import { IDEA_CARS } from './ideas.js';
import { makeIdeaModel } from './render/ideaModels.js';
const q = new URLSearchParams(location.search);
const car = IDEA_CARS.find(c => c.id === q.get('car')); const evil = q.has('evil');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight); document.body.append(renderer.domElement);
renderer.setClearColor(0xdfe3e8); renderer.setScissorTest(true);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(4, 8, 5); scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x9aa0a8 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
const m = makeIdeaModel(car); scene.add(m);
m.userData.body?.material.color.setHex(evil ? car.evilColor : car.color); m.userData.livery?.(evil);
m.userData.animate?.(0);
const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
const R = size.length() * 0.62;
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const view = (x, y, w, h, yawDeg, pitchDeg, dist, tgt) => {
  renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  const yaw = yawDeg * Math.PI / 180, pit = pitchDeg * Math.PI / 180;
  cam.position.set(tgt.x + Math.sin(yaw) * Math.cos(pit) * dist, tgt.y + Math.sin(pit) * dist, tgt.z + Math.cos(yaw) * Math.cos(pit) * dist);
  cam.lookAt(tgt); renderer.render(scene, cam);
};
const W = innerWidth, H = innerHeight;
const mode = q.get('mode') || 'grid';
if (mode === 'grid') {
  const views = [[45, 18], [0, 8], [-45, 18], [90, 6], [0, 88], [-90, 6], [135, 18], [180, 8], [-135, 18]];
  views.forEach(([yaw, p], i) => { const col = i % 3, row = Math.floor(i / 3); view(col * W / 3, H - (row + 1) * H / 3, W / 3, H / 3, yaw, p, R * 2.7, c); });
} else {
  const d = +q.get('d') || R * 1.1, tgt = new THREE.Vector3(+(q.get('tx') || 0), +(q.get('ty') || c.y), +(q.get('tz') || c.z));
  view(0, 0, W, H, +q.get('yaw') || 0, +q.get('pitch') || 10, d, tgt);
}
let meshes = 0, tris = 0, big = 0;
m.traverse(n => { if (n.isMesh) { meshes++; const t = n.geometry.index ? n.geometry.index.count / 3 : n.geometry.attributes.position.count / 3; tris += t; big = Math.max(big, t); } });
window.__stats = { meshes, tris, big, size: size.toArray().map(v => +v.toFixed(2)), box: [box.min.toArray(), box.max.toArray()].map(a => a.map(v => +v.toFixed(2))) };
console.warn('STATS ' + JSON.stringify(window.__stats));
