// ---- Albert Park: the circuit's own scenery and landmarks (see ./index.js for what `ctx` holds) ----
// Melbourne's Albert Park: the lake the lap goes round (the level's "lake" landmark: its real shoreline), the
// city's towers to the north of it ("skyline", where the middle of the city is), and parkland: gums and palms
// on the grass. The pits are the level's own "stands".
import { kit } from './kit.js';

export default (ctx) => {
  const { THREE, levelGroup } = ctx;
  const K = kit(ctx);
  const shores = [];
  for (const l of K.marks('lake')) {
    for (const path of l.paths) {
      if (path.length < 4) continue;
      shores.push(path);
      // (a shape in x and z, laid flat: turned a quarter about x, its y becomes z)
      const water = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(path.map(([x, z]) => new THREE.Vector2(x, z)))).rotateX(Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0x3f7fa3, side: THREE.DoubleSide }));
      water.position.y = -0.02;
      water.userData.flat = true;
      levelGroup.add(water);
    }
  }
  const wet = (x, z) => shores.some(path => K.inside(path, x, z));
  for (const l of K.marks('skyline')) { // the city: towers, the tallest in the middle
    let seed = 11;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const put = K.stand(l.x, l.z, 0);
    const tones = [0x7d8a99, 0x9aa6b3, 0x5d6b7c, 0xb9c2cc, 0x4f5966, 0x8fa3b5];
    for (let k = 0; k < 46; k++) {
      const a = rand() * Math.PI * 2, d = Math.pow(rand(), 0.8) * (l.r || 500), h = 50 + Math.pow(rand(), 2) * 230 * (1 - d / ((l.r || 500) * 1.3)), w = 22 + rand() * 26;
      put(new THREE.BoxGeometry(w, h, w * (0.7 + rand() * 0.6)), tones[k % tones.length], Math.cos(a) * d, h / 2, Math.sin(a) * d);
    }
  }
  // the park: gums on the grass, and palms nearer the road
  const gums = [], palms = [];
  K.besideTrack(16, 2, 8, 80, (x, y, z) => { if (!wet(x, z)) gums.push([x, y, z, 9 + Math.random() * 8, 6 + Math.random() * 5]); });
  K.besideTrack(45, 1, 5, 14, (x, y, z) => { if (!wet(x, z)) palms.push([x, y, z, 9 + Math.random() * 4, 4.5]); });
  K.trees(gums, new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0), [0x6f9a55, 0x5d8a4a, 0x7fa862]);
  K.trees(palms, new THREE.ConeGeometry(0.5, 1, 6).rotateX(Math.PI).translate(0, 0.5, 0), [0x4f8f3f], 0x8a7558, 0.8);
};
