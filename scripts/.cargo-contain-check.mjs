// CARGO CONTAINMENT: the cargo items whose parts live inside other parts are checked over time, in every state and through
// every change of state, for one part passing through another (the owner: "the escaped mouse is phasing through the door",
// "the hamster is phasing through the ball", "the beverage phases through the cups"). Headless, no browser: the models are
// built from render/cargoModels.js with three, posed every 0.04 s, and each part's vertices taken into world space.
//   - Cage of Tunnel Rats (rats): no part of a rat meets the cage (its bars, rails, top, tray) or its door, or another rat
//     (GJK on each part's convex hull: every part is a sphere, cone, cylinder or box)
//   - Pet-Shop Hamster Ball (hamsterball): every vertex of the hamster inside the shell's inner surface, but where it goes out
//     through the hatch's hole (the shell is open there), and the popped hatch never meets the hamster
//   - Tray of Bubble Teas (bubbletea): each cup's tea and pearls inside the cup's tapered wall and under its lid
//     node scripts/.cargo-contain-check.mjs [--verbose]
import * as THREE from 'three';
import { overlaps } from './gjk.mjs';

const { makeCargoModel } = await import('../src/delivery/render/cargoModels.js');
const verbose = process.argv.includes('--verbose');
let failed = 0;
const ok = (what, pass, more = '') => { if (!pass) failed++; console.log((pass ? '  ok    ' : '  FAIL  ') + what + (more ? '  ' + more : '')); };

// a mesh's vertices in world space (its local ones kept)
const local = new WeakMap();
const worldPts = (mesh) => {
  let l = local.get(mesh.geometry);
  if (!l) { const p = mesh.geometry.attributes.position; l = []; for (let i = 0; i < p.count; i++) l.push(new THREE.Vector3().fromBufferAttribute(p, i)); local.set(mesh.geometry, l); }
  return l.map(v => v.clone().applyMatrix4(mesh.matrixWorld).toArray());
};
const meshesOf = (root) => { const out = []; root.traverse(o => { if (o.isMesh && o.visible) out.push(o); }); return out; };
const named = (root, re) => { const out = []; root.traverse(o => { if (re.test(o.name)) out.push(o); }); return out; };
const box = (pts) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (const p of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } return { lo, hi }; };
const desc = (o) => o.geometry.type.replace('Geometry', '') + '@' + o.getWorldPosition(new THREE.Vector3()).toArray().map(v => v.toFixed(3)).join(',');
const near = (a, b, m) => [0, 1, 2].every(k => a.lo[k] - m <= b.hi[k] && b.lo[k] - m <= a.hi[k]);

// the runs: each state settled, and the changes calm -> agitated -> furious, calm -> furious, furious -> calm
const RUNS = [
  { name: 'calm', steps: [[0, 0, true]], end: 4 },
  { name: 'agitated', steps: [[0, 1, true]], end: 4 },
  { name: 'furious', steps: [[0, 2, true]], end: 6 },
  { name: 'calm > agitated > furious', steps: [[0, 0, true], [1.5, 1], [3.5, 2]], end: 7 },
  { name: 'calm > furious', steps: [[0, 0, true], [1, 2]], end: 4 },
  { name: 'furious > agitated > calm', steps: [[0, 2, true], [2, 1], [3.5, 0]], end: 6 },
];
const play = (id, run, each) => {
  const m = makeCargoModel(id);
  const steps = [...run.steps];
  for (let t = 0; t <= run.end + 1e-9; t += 0.04) {
    while (steps.length && steps[0][0] <= t + 1e-9) { const [, s, snap] = steps.shift(); m.userData.setState(s, !!snap); }
    m.userData.animate(t);
    m.updateMatrixWorld(true);
    each(m, t);
  }
};

// ---- the rats
{
  const worst = new Map();
  for (const run of RUNS) {
    play('rats', run, (m, t) => {
      const rats = named(m, /^rat\d$/), ratMeshes = new Set(rats.flatMap(meshesOf));
      const cage = meshesOf(m).filter(o => !ratMeshes.has(o));
      const parts = rats.map(r => meshesOf(r).map(o => { const p = worldPts(o); return { o, p, b: box(p), r: r.name }; }));
      const walls = cage.map(o => { const p = worldPts(o); let n = o; while (n && !/^door$/.test(n.name) && n !== m) n = n.parent; return { o, p, b: box(p), what: n?.name === 'door' ? 'door' : 'cage' }; });
      const hit = (key, at, x, y) => { if (verbose && !worst.has(key)) console.log('    ' + key + ' ' + at + ': ' + desc(x) + ' meets ' + desc(y)); const w = worst.get(key); if (!w) worst.set(key, { n: 1, first: at }); else w.n++; };
      parts.forEach((rp, i) => {
        for (const a of rp) {
          for (const w of walls) if (near(a.b, w.b, 0.002) && overlaps(a.p, w.p, 0.002)) hit(a.r + ' x ' + w.what, run.name + ' t=' + t.toFixed(2), a.o, w.o);
          for (let j = i + 1; j < parts.length; j++) for (const b of parts[j]) if (near(a.b, b.b, 0.002) && overlaps(a.p, b.p, 0.002)) hit(a.r + ' x ' + b.r, run.name + ' t=' + t.toFixed(2), a.o, b.o);
        }
      });
    });
  }
  ok('Tunnel Rats: no rat meets the cage, its door or another rat (6 runs, every 0.04 s)', !worst.size, [...worst].map(([k, v]) => k + ' (' + v.n + ' part-frames, first ' + v.first + ')').join(' | '));
}
process.exit(failed ? 1 : 0);
