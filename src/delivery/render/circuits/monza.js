// ---- Monza: the circuit's own scenery and landmarks (see ./index.js for what `ctx` holds) ----
// The Autodromo in its royal park: the old high-speed oval's two banked curves (the Sopraelevata Nord and Sud,
// the level's "banking" landmarks, where they really stand: the track passes under the north one after the
// Lesmos, and runs beside the south one into the Parabolica) and its back straight, and the park's tall trees
// all round. The grandstands (the Parabolica's among them) and the pits are the level's own "stands".
import { kit } from './kit.js';

export default (ctx) => {
  const { THREE } = ctx;
  const K = kit(ctx);
  // the banking: concrete, 9 m wide, its outer edge 7 m up
  for (const l of K.marks('banking')) {
    for (const path of l.paths) {
      const cx = path.reduce((a, q) => a + q[0], 0) / path.length, cz = path.reduce((a, q) => a + q[1], 0) / path.length;
      K.ribbon(path, 9, 0xb3ada1, { bank: 7, centre: [cx, cz], lift: 0.3 });
    }
  }
  for (const l of K.marks('oldStraight')) for (const path of l.paths) K.ribbon(path, 9, 0x8e8d88, { lift: 0.06 });
  // the park: tall broadleaf trees, thick beyond the walls
  const list = [];
  K.besideTrack(12, 2, 5, 90, (x, y, z) => list.push([x, y, z, 14 + Math.random() * 10, 7 + Math.random() * 5]));
  K.trees(list, new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0), [0x3f7a35, 0x4f8a3c, 0x356b30, 0x5d9644]);
};
