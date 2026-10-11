// ---- GUNFIRE: the gang war's bullets and muzzle flashes (the shooting itself: ../gunfire.js) ----------
// Each bullet a short bright streak along its flight (a tracer), from a little behind it to where it is;
// each shot a brief yellow-white flash where it was fired from (a window, or a drive-by's).
import * as THREE from 'three';
import { Track } from '../track.js';
import { Gunfire } from '../gunfire.js';
import { scene, tmp } from './scene.js';

const MAX = 240, TAIL = 0.035; // (bullets drawn at most; s of flight the streak trails behind each)
// (each a thin glowing rod from tail to head: a line would be a single pixel wide)
const rod = new THREE.BoxGeometry(0.07, 0.07, 1);
const tracers = new THREE.InstancedMesh(rod, new THREE.MeshBasicMaterial({ color: 0xffe9a0 }), MAX);
tracers.frustumCulled = false;
scene.add(tracers);
const tail = new THREE.Vector3(), head = new THREE.Vector3(), spot = new THREE.Object3D();
const FLASHES = 24, flashGeo = new THREE.SphereGeometry(0.28, 8, 6), flashMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
const flashes = Array.from({ length: FLASHES }, () => {
  const mesh = new THREE.Mesh(flashGeo, flashMat);
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
});

export const syncGunfire = () => {
  let n = 0;
  for (const p of Gunfire.bullets) {
    if (n >= MAX) break;
    Track.toWorld(p.s - p.vs * TAIL, p.lat - p.vl * TAIL, tmp);
    tail.set(tmp.x, tmp.y + p.y - p.vy * TAIL, tmp.z);
    Track.toWorld(p.s, p.lat, tmp);
    head.set(tmp.x, tmp.y + p.y, tmp.z);
    spot.position.copy(tail).add(head).multiplyScalar(0.5);
    spot.lookAt(head);
    spot.scale.set(1, 1, Math.max(0.1, tail.distanceTo(head)));
    spot.updateMatrix();
    tracers.setMatrixAt(n++, spot.matrix);
  }
  tracers.count = n;
  tracers.instanceMatrix.needsUpdate = true;
  tracers.visible = n > 0;
  flashes.forEach((mesh, i) => {
    const f = Gunfire.flashes[i];
    mesh.visible = !!f;
    if (!f) return;
    Track.toWorld(f.s, f.lat, tmp);
    mesh.position.set(tmp.x, tmp.y + f.y, tmp.z);
    mesh.scale.setScalar(0.6 + Math.random() * 0.8);
  });
};
