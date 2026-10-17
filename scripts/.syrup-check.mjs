// A check of the STOLEN MAPLE SYRUP cargo (render/themes/autumnModels.js AUTUMN_CARGO.syrup; CHECKLIST 463), built headless:
//   - no flicker-class z-fighting (render/zfight.js, two different colours or a texture, planes within 4 mm) in any state, at
//     several times, and half-way through a change of state; and none within 6 mm (every layer at least that far apart)
//   - the furious JET: shown furious, hidden calm and agitated; its ribbon grows from the spout's mouth, lies in a sane box beside
//     the tin (never under the ground, never far off), and never enters the tin; its buffers are written in place (no new
//     geometry, the same arrays, the same children every frame)
//   node scripts/.syrup-check.mjs
import { startModels } from './modelpatch-load.mjs';

const { load, close } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { makeCargoModel } = await load('render/cargoModels.js');
  const { findZFights } = await load('render/zfight.js');
  const TIMES = [0.3, 0.9, 1.3, 1.42, 1.55, 2.7, 4.1];
  const flicker = (model, gap = 0.004) => { model.updateMatrixWorld(true); return findZFights(model, { gap }).filter(g => !g.sameColour); };
  for (const state of [0, 1, 2]) {
    const model = makeCargoModel('syrup');
    model.userData.setState(state, true);
    let found = 0, wide = 0;
    for (const t of TIMES) { model.userData.animate(t); found += flicker(model).length; wide += flicker(model, 0.006).length; }
    check(found === 0, 'state ' + state + ': no flicker-class z-fight pair at ' + TIMES.length + ' times (' + found + ')');
    check(wide === 0, 'state ' + state + ': none within 6 mm either (' + wide + ')');
  }
  { // half-way through calm -> furious (the shared per-state weights blend over 0.5 s)
    const model = makeCargoModel('syrup');
    model.userData.setState(0, true);
    model.userData.animate(1);
    model.userData.setState(2);
    let found = 0;
    for (let t = 1.05; t < 1.6; t += 0.05) { model.userData.animate(t); found += flicker(model).length; }
    check(found === 0, 'calm -> furious, mid-change: no flicker-class pair (' + found + ')');
  }

  const jetOf = (model) => { let jet = null; model.traverse(n => { if (n.userData.syrupJet) jet = n; }); return jet; };
  const W = 0.46, D = 0.28, TOP = 0.62 + 0.039;
  for (const state of [0, 1]) {
    const model = makeCargoModel('syrup');
    model.userData.setState(state, true);
    let shown = false;
    for (const t of TIMES) { model.userData.animate(t); shown ||= jetOf(model).visible; }
    check(!shown, 'state ' + state + ': no jet');
  }
  const model = makeCargoModel('syrup');
  model.userData.setState(2, true);
  const jet = jetOf(model);
  check(!!jet, 'the jet is in the model');
  const arrays = jet.geometry.attributes.position.array, geometry = jet.geometry;
  let count = 0;
  model.traverse(() => count++);
  let inside = 0, bad = 0, lo = [9, 9, 9], hi = [-9, -9, -9], same = true, len = 0;
  for (let t = 0.2; t < 6; t += 0.13) {
    model.userData.animate(t);
    let n = 0;
    model.traverse(() => n++);
    same &&= jet.geometry === geometry && jet.geometry.attributes.position.array === arrays && n === count && jet.visible;
    const p = jet.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i] + jet.position.x, y = p[i + 1] + jet.position.y, z = p[i + 2] + jet.position.z; // (in the tin's own frame: the jet is a child of it)
      if (!Number.isFinite(x + y + z)) { bad++; continue; }
      lo = [Math.min(lo[0], x), Math.min(lo[1], y), Math.min(lo[2], z)]; hi = [Math.max(hi[0], x), Math.max(hi[1], y), Math.max(hi[2], z)];
      if (Math.abs(x) < W / 2 + 0.01 && Math.abs(z) < D / 2 + 0.01 && y < TOP) inside++;
    }
    len = Math.max(len, Math.hypot(p[p.length - 3], p[p.length - 2], p[p.length - 1]));
  }
  const fmt = (a) => a.map(v => v.toFixed(2)).join(', ');
  check(same, 'furious: the jet shown every frame, its geometry and arrays the same, no part added (' + count + ' nodes)');
  check(bad === 0, 'every jet vertex finite');
  check(inside === 0, 'the jet never enters the tin (' + inside + ' vertices inside)');
  check(len > 0.3, 'the ribbon reaches out from the spout (' + len.toFixed(2) + ' m)');
  check(lo[0] > 0.05 && hi[0] < 1.0 && lo[1] > 0 && hi[1] < 1.3 && lo[2] > -0.3 && hi[2] < 0.4, 'the jet lies in a sane box beside the tin (' + fmt(lo) + ' .. ' + fmt(hi) + ')');
} finally { await close(); }
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
