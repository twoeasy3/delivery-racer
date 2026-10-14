// The key unlock's key / fob never SNAPS (the owner, 14-Oct): render/keypose.js keyPose sampled every 0.01 s over the
// key's part (0 to 4.6 s), for a key with a blade and for a fob; no step may move it more than 0.06 m or turn it more
// than 0.12 rad (the ease-ins and the press included; the ignition's quarter turn into the click, 2.9-3.1 s, a quick
// twist by design, at most 0.25 rad a step), and it prints the pose every 0.1 s round each cut (1.4, 2.8, 3.5).
// node scripts/.keypose-check.mjs
import * as THREE from 'three';
import { keyPose } from '../src/delivery/render/keypose.js';

const P = new THREE.Vector3(0, 1.2, 8.7), keyHalf = 0.55;
const inBarrel = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)));
let bad = 0;
for (const fob of [false, true]) {
  const o = { fob, P, keyHalf, inBarrel, click: fob ? 2.95 : 3.1 };
  let last = null, worstMove = 0, worstTurn = 0, at = 0;
  for (let i = 0; i <= 460; i++) {
    const t = i / 100, p = keyPose(t, o);
    if (last) {
      const move = p.pos.distanceTo(last.pos), turn = p.quat.angleTo(last.quat);
      if (move > worstMove) { worstMove = move; at = t; }
      worstTurn = Math.max(worstTurn, turn);
      if (move > 0.06 || turn > (!fob && t > 2.9 && t <= 3.1 ? 0.25 : 0.12)) { bad++; console.log(`SNAP ${fob ? 'fob' : 'key'} at ${t.toFixed(2)} s: moved ${move.toFixed(3)} m, turned ${turn.toFixed(3)} rad`); }
    }
    last = p;
  }
  console.log(`${fob ? 'fob' : 'key'}: biggest step per 0.01 s: ${worstMove.toFixed(4)} m (at ${at.toFixed(2)} s), ${worstTurn.toFixed(4)} rad`);
  for (const cut of [1.4, 2.8, 3.5]) {
    const rows = [];
    for (let t = cut - 0.3; t <= cut + 0.301; t += 0.1) {
      const p = keyPose(t, o), r = new THREE.Euler().setFromQuaternion(p.quat);
      rows.push(`  ${t.toFixed(1)} s  pos ${p.pos.toArray().map(v => v.toFixed(3)).join(', ')}  rot ${[r.x, r.y, r.z].map(v => v.toFixed(3)).join(', ')}`);
    }
    console.log(`${fob ? 'fob' : 'key'} round the cut at ${cut} s:\n${rows.join('\n')}`);
  }
}
if (bad) { console.log(bad + ' snaps'); process.exit(1); }
console.log('ok: no snaps');
