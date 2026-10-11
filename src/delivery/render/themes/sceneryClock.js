// ---- scenery that moves (a rollercoaster's train, a Ferris wheel, smoke, a crane's trolley): only a sight, so
// it keeps its own time and is nobody's business but the theme's. everyFrame(levelGroup, fn) calls
// fn(t, x, y, z) once a frame for as long as the level's scenery stands (t: seconds; x, y, z: where the camera
// is, in the level's own terms, whichever side the level drives on): it hangs on a speck in the level's group,
// which the renderer asks before it draws it (as the rain and the snow do, in render/road.js), and goes with the
// group when the next level is built.
import * as THREE from 'three';

const SPECK = new THREE.BufferGeometry();
SPECK.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.001, 0, 0, 0, 0.001, 0], 3));
const UNSEEN = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

export const everyFrame = (levelGroup, fn) => {
  const speck = new THREE.Mesh(SPECK, UNSEEN);
  speck.frustumCulled = false;
  let last = -1;
  speck.onBeforeRender = (renderer, scene, camera) => {
    const now = performance.now();
    if (now === last) return; // (drawn twice in a frame: once is enough)
    last = now;
    fn(now / 1000, scene.scale.x < 0 ? -camera.position.x : camera.position.x, camera.position.y, camera.position.z);
  };
  levelGroup.add(speck);
};

// a geometry's faces dealt into two by turns round its upright axis, `n` stripes in all: [even, odd], to be drawn
// in two colours (a striped tent, an awning, a pole)
export const striped = (geometry, n = 16) => {
  const g = geometry.index ? geometry.toNonIndexed() : geometry, pos = g.attributes.position;
  const lists = [[], []];
  for (let k = 0; k < pos.count; k += 3) {
    const x = (pos.getX(k) + pos.getX(k + 1) + pos.getX(k + 2)) / 3, z = (pos.getZ(k) + pos.getZ(k + 1) + pos.getZ(k + 2)) / 3;
    const turn = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2);
    const list = lists[Math.min(n - 1, Math.floor(turn * n)) % 2];
    for (let j = k; j < k + 3; j++) list.push(pos.getX(j), pos.getY(j), pos.getZ(j));
  }
  return lists.map(list => {
    const part = new THREE.BufferGeometry();
    part.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
    part.computeVertexNormals();
    return part;
  });
};
