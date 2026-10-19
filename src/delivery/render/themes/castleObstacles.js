// ---- The castle town's own barrier (the castle theme, themes.js: registered in ../obstacleModels.js): a timber BARRICADE, the
// barrier's box and cost (config.js obstacleKinds, collision.js SIZE): a squared beam on two trestles of crossed, sharpened
// stakes, a second rail under it, an iron band at each end, a dark patch under it. Its parts merged to one mesh, their colours in its vertices.
// Kept out of castleModels.js (the scenery's, loaded with the theme) because the game's obstacle models are in the first download.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TIMBER = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const SHADE = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
const placed = (geometry, x, y, z, rx = 0, ry = 0, rz = 0) => geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));

export const CASTLE_OBSTACLES = {
  // a barrier (2.4 x 1.2 x 1.2 m): the beam across the lane at 0.95 m, a lower rail, at each end a trestle of two stakes crossed
  // in an X, their points sharpened (pale tips), an iron band round the beam by each trestle
  barricade: (o = {}) => {
    const w = Math.min(2.3, (o.hw ?? 1.2) * 1.92), h = Math.min(1.15, (o.height ?? 1.2) * 0.95), wood = [], pale = [], iron = [];
    wood.push(placed(new THREE.BoxGeometry(w, 0.22, 0.24), 0, h - 0.2, 0));
    wood.push(placed(new THREE.BoxGeometry(w * 0.92, 0.14, 0.16), 0, h * 0.42, 0.02));
    for (const x of [-w / 2 + 0.28, w / 2 - 0.28]) {
      for (const lean of [-0.62, 0.62]) {
        const len = h * 1.45, cy = len * 0.5 * Math.cos(lean) - 0.05, tip = len * 0.5 + 0.12;
        wood.push(placed(new THREE.CylinderGeometry(0.07, 0.08, len, 6), x, cy, 0, lean, 0, 0));
        pale.push(placed(new THREE.ConeGeometry(0.075, 0.24, 6), x, cy + tip * Math.cos(lean), tip * Math.sin(lean), lean, 0, 0));
      }
      iron.push(placed(new THREE.BoxGeometry(0.1, 0.27, 0.29), x + (x < 0 ? 0.2 : -0.2), h - 0.2, 0));
    }
    for (let k = 0; k < 3; k++) pale.push(placed(new THREE.BoxGeometry(0.05, 0.16, 0.25), -w / 3 + k * w / 3, h - 0.2, 0)); // (paler ends of the beam's boards)
    const g = new THREE.Group(), tinted = [];
    for (const [parts, color] of [[wood, 0x8a5a32], [pale, 0xc9a06a], [iron, 0x2a2a2e]]) {
      const c = new THREE.Color(color);
      for (let p of parts) {
        p = p.index ? p.toNonIndexed() : p;
        for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
        p.setAttribute('color', new THREE.Float32BufferAttribute(new Array(p.attributes.position.count).fill(0).flatMap(() => [c.r, c.g, c.b]), 3));
        tinted.push(p);
      }
    }
    g.add(new THREE.Mesh(mergeGeometries(tinted), TIMBER)); // (one mesh: its colours in its vertices)
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.6, 1.1), SHADE);
    shade.rotation.x = -Math.PI / 2; shade.position.y = 0.03;
    g.add(shade);
    return g;
  },
};
