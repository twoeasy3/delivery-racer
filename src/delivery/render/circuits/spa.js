// ---- Spa-Francorchamps: the circuit's own scenery and landmarks (see ./index.js for what `ctx` holds) ----
// The Ardennes: the land is the theme's terrain, which climbs and falls with the road (the plunge to Eau Rouge
// and the climb of the Raidillon are the level's own grades, from SRTM), pine forest all over it; the Eau Rouge
// itself, the stream the corner is named for, at the foot of the hill (the level's "stream" landmarks); and at
// La Source the white hotel on the outside of the hairpin ("hotel"). The grandstands and the pits are the
// level's own "stands".
import { kit } from './kit.js';

export default (ctx) => {
  const { THREE } = ctx;
  const K = kit(ctx);
  for (const l of K.marks('stream')) for (const path of l.paths) K.ribbon(path, 4, 0x4f7f96, { lift: 0.12, margin: 0 });
  for (const l of K.marks('hotel')) {
    if (!K.clear(l.x, l.z, 12)) continue;
    const put = K.stand(l.x, l.z, l.rot || 0);
    put(new THREE.BoxGeometry(34, 11, 14), 0xf1efe8, 0, 5.5, 0);
    put(new THREE.BoxGeometry(34.6, 1, 14.6), 0x7a8794, 0, 7.2, 0); // (a row of windows)
    const roof = put(new THREE.CylinderGeometry(0.01, 10.5, 5, 4, 1), 0x8c3b2e, 0, 13.5, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(2.3, 1, 1);
  }
  // the forest: pines, close and dark, from the walls back up the hillsides
  const list = [];
  K.besideTrack(10, 3, 6, 120, (x, y, z) => list.push([x, y, z, 12 + Math.random() * 9, 4.5 + Math.random() * 2.5]));
  K.trees(list, new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0), [0x2e5b33, 0x26502d, 0x37663a], 0x4d3b2c, 0.18);
};
