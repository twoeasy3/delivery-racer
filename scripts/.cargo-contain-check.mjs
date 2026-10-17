// CARGO RULES: every cargo model posed over time, in every state and through every change of state, against the rules it
// registers in src/delivery/render/cargoRules.js (the vocabulary: CARGO-RULES.md). Headless, no browser: the models are built
// from render/cargoModels.js with three, posed every 0.04 s, and each part's vertices taken into world space. A part is named
// in the model (a mesh, or a group: a mesh belongs to its nearest named ancestor).
//   keepOut    part A never within `min` of part B (GJK on each mesh's convex hull: for convex parts only, a sphere, cone,
//              box, cylinder; a torus or a hollow shell is not: hold a part inside or outside one with `inside` instead)
//   inside     every vertex of a part inside its container's shape (sphere, cone, box), less a margin, but at its exits
//              (`only`: hold just the vertices in that region, e.g. the band of a collar a head goes through)
//   anchors    every mesh of a part within `maxGap` of the (convex) part it rests on, or of a shape's surface (nothing floats)
//   zfight     every model, every state, at 0.7 s and 2.3 s: no flicker-class pair (render/zfight.js, `certain` and not
//              the same colour) beyond the item's known `zfight.allow` (CARGO-AUDIT.md lists them)
// An item with no entry fails, unless it is `static` (with a reason) or on the frozen PENDING_AUDIT list (which may only shrink).
// The owner's complaints it was made for: "the escaped mouse is phasing through the door", "the hamster is phasing through
// the ball", "the beverage phases through the cups".
//   node scripts/.cargo-contain-check.mjs [id ...] [--verbose]
import * as THREE from 'three';
import { overlaps } from './gjk.mjs';

const { CARGO_MODELS, makeCargoModel } = await import('../src/delivery/render/cargoModels.js');
const { findZFights } = await import('../src/delivery/render/zfight.js');
const { CARGO_RULES, PENDING_AUDIT, KNOWN_ZFIGHTS } = await import('../src/delivery/render/cargoRules.js');
const args = process.argv.slice(2), verbose = args.includes('--verbose'), only = args.filter(a => !a.startsWith('--'));
const PENDING_FROZEN = 84; // (the number on PENDING_AUDIT when it was made, 17-Oct: it may only shrink)
let failed = 0;
const ok = (what, pass, more = '') => { if (!pass) failed++; console.log((pass ? '  ok    ' : '  FAIL  ') + what + (more ? '  ' + more : '')); };

// ---- parts: a mesh's owner is its nearest named ancestor (itself included)
const owner = (o, root) => { for (let n = o; n && n !== root.parent; n = n.parent) if (n.name) return n; return null; };
const instances = (root, sel) => {
  const re = new RegExp('^(?:' + sel + ')$'), out = new Map();
  root.traverse(o => { if (!o.isMesh || !o.visible || !o.geometry?.attributes?.position) return; const w = owner(o, root); if (w && re.test(w.name)) { if (!out.has(w)) out.set(w, []); out.get(w).push(o); } });
  return [...out].map(([node, meshes]) => ({ node, meshes, match: node.name.match(re) }));
};
const visibleUp = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
const local = new WeakMap();
const pointsOf = (mesh, frame = null) => {
  let l = local.get(mesh.geometry);
  if (!l) { const p = mesh.geometry.attributes.position; l = []; for (let i = 0; i < p.count; i++) l.push(new THREE.Vector3().fromBufferAttribute(p, i)); local.set(mesh.geometry, l); }
  const m = frame ? new THREE.Matrix4().copy(frame.matrixWorld).invert().multiply(mesh.matrixWorld) : mesh.matrixWorld;
  return l.map(v => v.clone().applyMatrix4(m).toArray());
};
const bounds = (pts) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (const p of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } return { lo, hi }; };
const near = (a, b, m) => [0, 1, 2].every(k => a.lo[k] - m <= b.hi[k] && b.lo[k] - m <= a.hi[k]);
const hull = (o) => { const p = pointsOf(o); return { o, p, b: bounds(p) }; };
const sub$ = (sel, match) => sel.replace(/\$(\d)/g, (_, k) => match?.[+k] ?? '');
const where = (o) => o.geometry.type.replace('Geometry', '') + '@' + o.getWorldPosition(new THREE.Vector3()).toArray().map(v => v.toFixed(3)).join(',');

// ---- the shapes a container can be (in its own node's frame), and how far a point is outside it (> 0: out)
const outside = (shape, [x, y, z]) => {
  if (shape.sphere) { const c = shape.centre || [0, 0, 0]; return Math.hypot(x - c[0], y - c[1], z - c[2]) - shape.sphere; }
  if (shape.cone) { const { y0, y1, r0, r1 } = shape.cone, u = (y - y0) / (y1 - y0), r = r0 + (r1 - r0) * Math.max(0, Math.min(1, u)); return Math.max(Math.hypot(x, z) - r, y0 - y, y - y1); }
  if (shape.box) { const { min, max } = shape.box; return Math.max(min[0] - x, x - max[0], min[1] - y, y - max[1], min[2] - z, z - max[2]); }
  throw new Error('unknown container shape ' + JSON.stringify(shape));
};

// ---- the runs: each state settled, and the changes between them (a Good item: one run, it has no states)
const RUNS = [
  { name: 'calm', steps: [[0, 0, true]], end: 4 },
  { name: 'agitated', steps: [[0, 1, true]], end: 4 },
  { name: 'furious', steps: [[0, 2, true]], end: 6 },
  { name: 'calm>agitated>furious', steps: [[0, 0, true], [1.5, 1], [3.5, 2]], end: 7 },
  { name: 'calm>furious', steps: [[0, 0, true], [1, 2]], end: 4 },
  { name: 'furious>agitated>calm', steps: [[0, 2, true], [2, 1], [3.5, 0]], end: 6 },
];
const IDLE = [{ name: 'idle', steps: [], end: 6 }];
const play = (id, runs, each) => {
  for (const run of runs) {
    const m = makeCargoModel(id), steps = [...run.steps];
    let state = 0, since = 0;
    for (let t = 0; t <= run.end + 1e-9; t += 0.04) {
      while (steps.length && steps[0][0] <= t + 1e-9) { const [at, s, snap] = steps.shift(); m.userData.setState(s, !!snap); state = s; since = snap ? -1 : at; }
      m.userData.animate(t);
      m.updateMatrixWorld(true);
      each(m, run.name + ' t=' + t.toFixed(2), t - since >= 0.5 + 1e-9 ? state : -1); // (-1: still changing state)
    }
  }
};

const checkRules = (id, rules) => {
  const stated = !!makeCargoModel(id).userData.setState;
  const found = new Map(); // what failed -> { n, first }
  const fail = (key, at, detail) => { const f = found.get(key); if (!f) { found.set(key, { n: 1, first: at }); if (verbose) console.log('    ' + id + ': ' + key + ' ' + at + ': ' + detail); } else f.n++; };
  const inState = (r, state) => !r.states || !stated || r.states.includes(state); // (a rule for some states holds once the item has settled in one)
  play(id, rules.runs || (stated ? RUNS : IDLE), (m, at, state) => {
    for (const r of rules.keepOut || []) {
      if (!inState(r, state)) continue;
      const min = r.min ?? 0.002, A = instances(m, r.a).map(i => ({ ...i, h: i.meshes.filter(visibleUp).map(hull) }));
      const Bof = (sel) => sel === r.a ? A : instances(m, sel).map(i => ({ ...i, h: i.meshes.filter(visibleUp).map(hull) }));
      const B0 = r.b.includes('$') ? null : Bof(r.b), A_is_B = r.a === r.b;
      for (const a of A) for (const b of B0 || Bof(sub$(r.b, a.match))) { // (`$1` in b: a's own capture, e.g. another cup than a's)
        const B = B0;
        if (a.node === b.node || (A_is_B && B && a.node.id > b.node.id)) continue;
        for (const x of a.h) for (const y of b.h) if (near(x.b, y.b, min) && overlaps(x.p, y.p, min)) fail('keepOut ' + a.node.name + ' x ' + b.node.name, at, where(x.o) + ' meets ' + where(y.o));
      }
    }
    for (const r of rules.inside || []) {
      if (!inState(r, state)) continue;
      for (const p of instances(m, r.part)) {
        const frameSel = sub$(r.of, p.match), frame = instances(m, frameSel)[0]?.node;
        if (!frame) { fail('inside ' + p.node.name + ': no container ' + frameSel, at, ''); continue; }
        for (const o of p.meshes.filter(visibleUp)) for (const q of pointsOf(o, frame)) {
          if (r.only && outside(r.only, q) > 0) continue; // (only the points in this region are held to the shape)
          const d = outside(r.shape, q) + (r.margin ?? 0.003);
          if (d <= 0 || (r.exits || []).some(e => Math.hypot(q[0] - e.at[0], q[1] - e.at[1], q[2] - e.at[2]) < e.r)) continue;
          fail('inside[' + (rules.inside.indexOf(r)) + '] ' + p.node.name + ' out of ' + frame.name, at, where(o) + ' ' + (d * 1000).toFixed(1) + ' mm out'); break;
        }
      }
    }
    for (const r of rules.anchors || []) {
      if (!inState(r, state)) continue;
      const gap = r.maxGap ?? 0.004;
      if (r.shape) { // (on a surface: a vertex of each mesh within maxGap of the shape's surface, in the frame of `of`)
        const frame = instances(m, r.of)[0]?.node;
        for (const p of instances(m, r.part)) for (const o of p.meshes.filter(visibleUp)) {
          const d = Math.min(...pointsOf(o, frame).map(q => Math.abs(outside(r.shape, q))));
          if (d > gap) fail('anchors ' + p.node.name + ' floats off ' + r.of, at, where(o) + ' ' + (d * 1000).toFixed(1) + ' mm off');
        }
        continue;
      }
      const to = instances(m, r.to).flatMap(i => i.meshes.filter(visibleUp).map(hull));
      for (const p of instances(m, r.part)) for (const o of p.meshes.filter(visibleUp)) {
        const x = hull(o);
        if (!to.some(y => y.o !== o && near(x.b, y.b, gap) && overlaps(x.p, y.p, gap))) fail('anchors ' + p.node.name + ' floats off ' + r.to, at, where(o));
      }
    }
  });
  return found;
};

// ---- every item has rules (or is static, or still on the frozen pending list)
const ids = Object.keys(CARGO_MODELS).filter(id => !only.length || only.includes(id));
const dealt = Object.keys(CARGO_MODELS); // (every cargo model, Good and Evil)
if (!only.length) {
  const missing = dealt.filter(id => !CARGO_RULES[id] && !PENDING_AUDIT.includes(id));
  ok('every cargo item registers its rules in render/cargoRules.js (or is static with a reason)', !missing.length, missing.join(' '));
  const stale = PENDING_AUDIT.filter(id => CARGO_RULES[id]);
  ok('PENDING_AUDIT only shrinks (' + PENDING_AUDIT.length + ' of ' + PENDING_FROZEN + ') and lists no item with rules', PENDING_AUDIT.length <= PENDING_FROZEN && !stale.length, stale.join(' '));
  const badStatic = Object.entries(CARGO_RULES).filter(([, r]) => 'static' in r && !(typeof r.static === 'string' && r.static.length > 8)).map(([id]) => id);
  ok('a static item says why', !badStatic.length, badStatic.join(' '));
}

// ---- each item's own rules
for (const id of ids) {
  const rules = CARGO_RULES[id];
  if (!rules || rules.static !== undefined) continue;
  if (!rules.keepOut && !rules.inside && !rules.anchors) continue;
  const found = checkRules(id, rules);
  const n = (rules.keepOut?.length || 0) + (rules.inside?.length || 0) + (rules.anchors?.length || 0);
  ok(id + ': ' + n + (n > 1 ? ' rules hold' : ' rule holds') + ' every 0.04 s in every state and change', !found.size, [...found].map(([k, v]) => k + ' (' + v.n + ' part-frames, first ' + v.first + ')').join(' | '));
}

// ---- z-fighting, every item
{
  const over = [];
  for (const id of ids) {
    const allow = CARGO_RULES[id]?.zfight?.allow ?? KNOWN_ZFIGHTS[id] ?? 0;
    const stated = !!makeCargoModel(id).userData.setState;
    let worst = 0, at = '';
    for (const s of stated ? [0, 1, 2] : [0]) for (const T of [0.7, 2.3]) {
      const m = makeCargoModel(id);
      m.userData.setState?.(s, true);
      for (let t = 0; t <= T + 1e-9; t += 0.05) m.userData.animate(t);
      const bad = findZFights(m).filter(g => g.certain && !g.sameColour);
      if (bad.length > worst) { worst = bad.length; at = 'state ' + s + ' t=' + T + ' ' + bad.slice(0, 3).map(g => g.a.geometry.type.replace('Geometry', '') + '/' + g.b.geometry.type.replace('Geometry', '') + '@' + g.at.toArray().map(v => v.toFixed(2)).join(',')).join(' '); }
    }
    if (worst > allow) over.push(id + ' ' + worst + (allow ? ' (known ' + allow + ')' : '') + ': ' + at);
  }
  ok('no flicker-class z-fight (under 0.5 mm, not one colour) beyond an item\'s known ones, ' + ids.length + ' items', !over.length, over.join(' | '));
}
process.exit(failed ? 1 : 0);
