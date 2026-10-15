// THE NUMBER PLATE RULES (one set, CHECKLIST 345: the owner, 15-Oct, "the bumper is the most logical place for the plate but it is not
// allowed by the current rules: tidy up the rules") and the PLACE SEARCH that applies them. Shared by scripts/plate-anchors.mjs (the
// table's generator), scripts/plate-placement-audit.mjs (the audit and its --fix) and the model editor's Placements tab
// (render/placementedit.js: Fit, the chips). Every number is in RULES below; nothing else holds a plate threshold.
//
// A VALID PLACE for a plate (a 4:1 plate, centred on the car's centre line, at one end) is one where:
// (the owner, 15-Oct, on the bumper: "the plate should just stick out from the bar anyway": a plate is bolted on, not a decal)
//   1. SURFACE  the plate stands on the car's own solid surface: paintwork, a BUMPER of any finish (chrome, painted, black plastic), trim.
//               NOT on glass, a lamp (an emissive or unlit material), a wheel or a spare tyre. Seen along the car's length, the surface
//               under the plate is the first thing met from outside and lies within REACH of the car's outermost point (a ray that ran
//               under the car to the other bumper does not count).
//   2. FLAT     that surface is one plane under the plate (where it is on its surface: every hit within STRICT of it; ROUGH only if
//               nothing strict exists).
//   3. EDGES    ON A BUMPER BAR (below): the plate is centred on the bar's face (its middle height, the centre line) and may stick out
//               past the bar's top, bottom and ends, as long as at least BAR_HOLD of its height AND of its width are on the face (it
//               hangs mostly on the bar; its back sits against the face there). ON THE BODY: the surface reaches MARGIN past the plate's
//               sides, and past its top and bottom except for up to OVERHANG_Y each. A surface GAP or more behind the plate's plane is
//               not under it (the plate would float there; it is the edge of a bar).
//   4. UPRIGHT  the plane leans no more than MAX_PITCH (a lid is not a place; up to GLACIS only when an end has nothing upright at all,
//               an armoured nose, and the audit then flags ON_A_LID for a look) and is square across the car (MAX_YAW).
//   5. CLEAR    nothing of the car stands in front of the plate's face seen straight on, and less than COVER_UP of it is hidden seen
//               from UP_ANGLE degrees above (the chase camera's side: a bumper or a step overhanging it).
//   6. HEIGHT   its bottom edge at least LOW_EDGE off the ground, its middle no higher than HIGH_FRAC of the car's height.
// THE CHOICE among valid places at an end:
//   - a BUMPER BAR first: a band of the end's surface on the centre line, BAR_MIN_H to BAR_MAX_H tall, at least BAR_MIN_W wide, flat
//     (STRICT), standing GAP or more proud of the surface above and below it, in the lower BAR_MAX_FRAC of the car and below BAR_MAX_Y (findBars); the
//     lowest bar that takes a plate. Any place on a bar beats any place on the body, at any size in SIZES
//     (the canonical 0.52 x 0.13 fits any bar 6.5 cm tall and 26 cm wide, by BAR_HOLD);
//   - else the body, as before (no bar, or the bar too small or not clear for even the smallest size);
//   - then, among places of the same kind: the bigger plate (SIZES, canonical 0.52 first), flat, upright, a plate wholly on its surface
//     over one that uses OVERHANG_Y (body), near the preferred height (on the body: the car's own plate's height, else 0.5 m), out at
//     the car's end, clear from above.
// The audit (scripts/plate-placement-audit.mjs) measures a worn plate against the SAME numbers: FLOATING / BURIED (GAP, BURY), TILTED
// (TILT), OVER_EDGE (on a bar: less than BAR_HOLD of its height or width on the face; on the body: an edge past its surface by more
// than its allowance; each beyond AUDIT_SLACK, the measuring step; contact is judged where the plate is on its surface), COVERED (COVER_LEVEL)
// / COVERED_FROM_ABOVE (COVER_UP), ON_GLASS / OVER_LAMP / ON_WHEEL, ON_A_LID (MAX_PITCH), LOW (LOW_EDGE), HIGH (HIGH_FRAC), and a few
// sanity flags of its own that the search cannot produce on purpose (WRONG_HALF, FACES_WRONG_WAY, TEXT_MIRRORED, TUCKED (TUCK: a plate
// far behind the car's end round it, behind a towbar or an outboard motor: look at it), TWO_PLATES, ZFIGHT, PLATE_LIKE_UNTAGGED).
// SMALL (narrower than 0.52) is information, not a fault: the surface chose the size.
// Units: car-local metres (x across, y up, the nose at +z); pitch in degrees, the plane's dz/dy (the plate's rotation.x).
import * as THREE from 'three';

export const RULES = {
  SIZES: [0.52, 0.46, 0.40, 0.34, 0.30], // m wide (4:1): the canonical plate first
  MARGIN: 0.004,       // m: the surface reaches this far past the plate's edges (its dark slab's edge)
  OVERHANG_Y: 0.010,   // m: ON THE BODY, the most a plate may stand past its surface's top, and its bottom (each)
  BAR_HOLD: 0.5,       // ON A BAR: the least share of the plate's height, and of its width, that must be on the bar's face
  STRICT: 0.006,       // m: the most a hit may stand off the fitted plane (flat); also a bar's flatness
  ROUGH: 0.012,        // m: the same, second pass (marked rough)
  GAP: 0.015,          // m: a surface this far or more behind the plate is not under it (floating; a bar's edge; a bar stands this proud)
  BURY: 0.010,         // m: a surface this far in front of the plate's back buries it
  TILT: 4,             // degrees: the plate against its surface
  MAX_PITCH: 25,       // degrees: upright
  GLACIS: 40,          // degrees: the last resort when an end has nothing upright
  MAX_YAW: 1.5,        // degrees: square across the car
  REACH: 0.5,          // m: the surface under a plate lies within this of the car's outermost point at that end
  UP_ANGLE: 20,        // degrees: the viewer above (the chase camera's side)
  COVER_LEVEL: 0.10,   // share of the face hidden straight on (the audit; the search allows none of its six points)
  COVER_UP: 0.25,      // share of the face hidden from UP_ANGLE above
  LOW_EDGE: 0.10,      // m: the plate's bottom edge off the ground
  HIGH_FRAC: 0.6,      // of the car's height: the plate's middle no higher (the audit flags it above 1 m only)
  TUCK: 0.30,          // m: the audit's TUCKED: the plate this far behind the car's end round it
  BAR_MIN_H: 0.04, BAR_MAX_H: 0.30, // m: a bumper bar's face, tall
  BAR_MIN_W: 0.40,     // m: a bumper bar's flat face, wide (a narrower band is a grille lip or a trim strip)
  BAR_MAX_FRAC: 0.5, BAR_MAX_Y: 1.0, // of the car's height, and m: a bumper bar's middle no higher than either (a band up a cab, a bed's
                       // tail or a body kit's lamp bar is not a bumper)
  AUDIT_SLACK: 0.006,  // m: the audit's measuring step (its support rays walk 5 mm)
};
const R = RULES;
// (the names the earlier scripts imported)
export const SIZES = R.SIZES, STRICT = R.STRICT, ROUGH = R.ROUGH, MAX_PITCH = R.MAX_PITCH, MAX_YAW = R.MAX_YAW, REACH = R.REACH, MARGIN = R.MARGIN, GLACIS = R.GLACIS;
const NX = 11, NY = 5;

// a spare wheel's tyre (not one of the four the wheel code knows): a near-black cylinder 0.4 m or more across
export const isTyre = (n) => {
  const g = n.geometry, m = [].concat(n.material)[0];
  if (!g || g.type !== 'CylinderGeometry' || !m?.color) return false;
  const c = m.color, r = Math.max(g.parameters.radiusTop, g.parameters.radiusBottom) * Math.max(n.scale.x, n.scale.y, n.scale.z);
  return r >= 0.2 && Math.max(c.r, c.g, c.b) < 0.12;
};
// what a material is to a plate: 'lamp' (unlit or glowing), 'glass' (render/dents.js glassy, never the body's paint), else 'ok' (paint, a
// bumper of any finish, trim)
export const surfaceKind = (n, body, glassy) => {
  const m = [].concat(n.material)[0], bodyMat = body?.material;
  if (m.isMeshBasicMaterial || (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0.25)) return 'lamp';
  if (n !== body && m !== bodyMat && glassy && glassy(m)) return 'glass';
  return 'ok';
};
// the meshes a plate can be measured against: visible, not the cosmetic plate or prop, not see-through; each with its kind
// opts.glassy(material) (render/dents.js), opts.wheels: a Set of wheel meshes
export const makeView = (model, { glassy, wheels = new Set() } = {}) => {
  model.updateMatrixWorld(true);
  const body = model.userData.body, meshes = [];
  const skip = (n) => { for (let p = n; p; p = p.parent) { if (p.visible === false || p.userData.platecosmetic || p.userData.propCosmetic) return true; } return false; };
  model.traverse((n) => {
    if (!n.isMesh || !n.geometry || skip(n)) return;
    const m = [].concat(n.material)[0];
    if (!m || m.visible === false || (m.transparent && m.opacity < 0.95)) return;
    n.userData._plateKind = wheels.has(n) || n.userData.wheelRing || isTyre(n) ? 'wheel' : surfaceKind(n, body, glassy);
    meshes.push(n);
  });
  const box = new THREE.Box3();
  for (const n of meshes) {
    const b = new THREE.Box3().setFromObject(n, true);
    if (b.max.y - b.min.y < 0.005 && b.max.y < 0.1) continue; // (an underglow / shadow plane on the ground)
    box.union(b);
  }
  return { model, meshes, box, inv: new THREE.Matrix4().copy(model.matrixWorld).invert(), ray: new THREE.Raycaster() };
};

// the first surface along the car's length at (x, y) seen from outside the end: { z, kind } or null
export const shoot = (view, end, x, y) => {
  const s = end === 'rear' ? -1 : 1, L = view.box.max.z - view.box.min.z + 5;
  const o = new THREE.Vector3(x, y, s * L).applyMatrix4(view.model.matrixWorld), d = new THREE.Vector3(0, 0, -s).transformDirection(view.model.matrixWorld);
  view.ray.set(o, d); view.ray.far = 2 * L;
  const hit = view.ray.intersectObjects(view.meshes, false)[0];
  if (!hit) return null;
  return { z: hit.point.clone().applyMatrix4(view.inv).z, kind: hit.object.userData._plateKind };
};
// is anything of the car in front of the plate's face point p (model space) seen along dir (pointing out, model space)?
export const blocked = (view, p, dir) => {
  const o = p.clone().addScaledVector(dir, 30).applyMatrix4(view.model.matrixWorld), d = dir.clone().negate().transformDirection(view.model.matrixWorld);
  view.ray.set(o, d); view.ray.far = 30 - 0.002;
  return view.ray.intersectObjects(view.meshes, false).length > 0;
};

// least squares z = a + b * dy + c * x
export const fitPlane = (rows) => {
  let n = rows.length, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
  for (const [x, dy, z] of rows) { sx += x; sy += dy; sxx += x * x; syy += dy * dy; sxy += x * dy; sz += z; sxz += x * z; syz += dy * z; }
  const M = [[n, sy, sx], [sy, syy, sxy], [sx, sxy, sxx]], Rv = [sz, syz, sxz];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M);
  if (Math.abs(D) < 1e-12) return null;
  const col = (k) => det(M.map((row, i) => row.map((v, j) => (j === k ? Rv[i] : v))));
  const a = col(0) / D, b = col(1) / D, c = col(2) / D;
  let dev = 0;
  for (const [x, dy, z] of rows) dev = Math.max(dev, Math.abs(z - (a + b * dy + c * x)));
  return { a, b, c, dev };
};

// ---- the BUMPER BARS at an end (rule 'a bumper bar first'): along the centre line, from just off the ground to 70 % of the car's height,
// the end's surface (the first thing met from outside); a bar is a run of it that is flat (within STRICT), BAR_MIN_H to BAR_MAX_H tall,
// with the surface within 4 cm above AND below it GAP or more further in (or not the car's solid surface at all), BAR_MIN_W wide or more, its
// middle in the lower BAR_MAX_FRAC of the car and no higher than BAR_MAX_Y. Each bar:
// { y0, y1, h, d (m in from the car's outermost point), z, w (the flat face's width, centred, at most 1.2), proud }, lowest first ----
export const findBars = (view, end, { step = 0.005 } = {}) => {
  const memo = (view.bars ||= {}), mkey = end + step;
  if (memo[mkey]) return memo[mkey]; // (a view is one model at rest: measured once)
  const s = end === 'rear' ? -1 : 1, lo = view.box.min.y, H = view.box.max.y - lo, endZ = s < 0 ? view.box.min.z : view.box.max.z;
  const prof = [];
  for (let y = lo + 0.02; y <= lo + 0.7 * H; y += step) { const h = shoot(view, end, 0, y); prof.push({ y, d: h && h.kind === 'ok' ? (endZ - h.z) * s : null }); }
  const bars = [];
  for (let i = 0; i < prof.length;) {
    if (prof[i].d == null || prof[i].d > R.REACH) { i++; continue; }
    let j = i, dmin = prof[i].d, dmax = prof[i].d;
    while (j + 1 < prof.length && prof[j + 1].d != null && Math.max(dmax, prof[j + 1].d) - Math.min(dmin, prof[j + 1].d) <= R.STRICT) { j++; dmin = Math.min(dmin, prof[j].d); dmax = Math.max(dmax, prof[j].d); }
    const d = (dmin + dmax) / 2, y0 = prof[i].y - step / 2, y1 = prof[j].y + step / 2, hgt = y1 - y0;
    const stepAt = (k0, k1) => { // the most the surface steps back beyond the run, within 4 cm (Infinity: nothing solid there)
      let most = 0;
      for (let k = k0; k !== k1; k += Math.sign(k1 - k0)) { if (k < 0 || k >= prof.length) { most = Infinity; break; } most = Math.max(most, prof[k].d == null ? Infinity : prof[k].d - d); }
      return most;
    };
    const n4 = Math.round(0.04 / step);
    const up = stepAt(j + 1, j + 1 + n4), down = i === 0 ? Infinity : stepAt(i - 1, i - 1 - n4);
    if (hgt >= R.BAR_MIN_H - 1e-9 && hgt <= R.BAR_MAX_H && up >= R.GAP && down >= R.GAP) {
      // the flat face's width, centred: at three heights, how far either side the surface stays within STRICT of the bar's depth (to 1.2 m:
      // more is never needed by a plate)
      let half = Infinity;
      for (const y of [y0 + 0.01, (y0 + y1) / 2, y1 - 0.01]) for (const sx of [-1, 1]) {
        let last = 0;
        for (let x = 0.01; x <= 0.6; x += 0.01) { const h = shoot(view, end, sx * x, y); if (!h || h.kind !== 'ok' || Math.abs((endZ - h.z) * s - d) > R.STRICT) break; last = x; }
        half = Math.min(half, last);
      }
      if (2 * half >= R.BAR_MIN_W && (y0 + y1) / 2 <= lo + Math.min(R.BAR_MAX_FRAC * H, R.BAR_MAX_Y)) bars.push({ y0, y1, h: hgt, d, z: endZ - s * d, w: 2 * half, proud: Math.min(up, down) });
    }
    i = j + 1;
  }
  return (memo[mkey] = bars);
};
// where a plate at height y, depth z stands against an end's bars: 'bumper' (on a bar's face), 'above' / 'below' (the body, over or under
// the nearest bar), 'body' (the end has no bar)
export const placeKind = (bars, y, z) => {
  if (!bars.length) return { on: 'body', bar: null };
  const on = bars.find(b => y >= b.y0 - 0.005 && y <= b.y1 + 0.005 && Math.abs(z - b.z) <= R.GAP);
  if (on) return { on: 'bumper', bar: on };
  const near = bars.slice().sort((a, b) => Math.abs((a.y0 + a.y1) / 2 - y) - Math.abs((b.y0 + b.y1) / 2 - y))[0];
  return { on: y > (near.y0 + near.y1) / 2 ? 'above' : 'below', bar: near };
};

// one candidate: a plate w wide centred at height y on `end`: { y, z, w, pitch, dev, cover, inside } or null (rules 1 to 5)
// marginY: how far the surface must reach past the plate's top and bottom (MARGIN; -OVERHANG_Y lets the plate stand past them)
// hx, hy: the half extents of the rays' grid (default: the plate and MARGIN; on a bar, the part of the plate on the bar's face)
export const tryPlace = (view, end, w, y, { tol = R.STRICT, reach = R.REACH, marginY = R.MARGIN, maxPitch = R.MAX_PITCH, hx = null, hy = null } = {}) => {
  const s = end === 'rear' ? -1 : 1, h = w / 4, endZ = s < 0 ? view.box.min.z : view.box.max.z;
  const gx = hx ?? w / 2 + R.MARGIN, gy = hy ?? h / 2 + marginY;
  const rows = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const x = -gx + 2 * gx * i / (NX - 1), dy = -gy + 2 * gy * j / (NY - 1);
    const hit = shoot(view, end, x, y + dy);
    if (!hit || hit.kind !== 'ok' || (endZ - hit.z) * s > reach) return null;
    rows.push([x, dy, hit.z]);
  }
  const f = fitPlane(rows);
  if (!f || f.dev > tol) return null;
  const pitch = Math.atan(f.b) * 180 / Math.PI, yaw = Math.atan(f.c) * 180 / Math.PI;
  if (Math.abs(pitch) > maxPitch || Math.abs(yaw) > R.MAX_YAW) return null;
  // nothing in front of the face straight on; from UP_ANGLE above, less than COVER_UP hidden
  const N = new THREE.Vector3(0, -s * f.b, s).normalize(); // (the plate's outward normal: the plane z = a + b*dy leans by b)
  const a = R.UP_ANGLE * Math.PI / 180, up = N.clone().multiplyScalar(Math.cos(a)).add(new THREE.Vector3(0, Math.sin(a), 0)).normalize();
  let cover = 0;
  const pts = [[-0.45, -0.4], [0.45, -0.4], [0, 0], [-0.45, 0.4], [0.45, 0.4], [0, -0.45]];
  for (const [fx, fy] of pts) {
    const p = new THREE.Vector3(fx * w, y + fy * h, f.a + f.b * fy * h + f.c * fx * w).addScaledVector(N, 0.005);
    if (blocked(view, p, N)) return null;
    if (blocked(view, p, up)) cover++;
  }
  if (cover / pts.length >= R.COVER_UP) return null;
  return { y, z: f.a, w, pitch, dev: f.dev, cover: cover / pts.length, inside: (endZ - f.a) * s };
};

// the best places at one end, best first (at most `keep`): [{ y, z, w, pitch, dev, cover, inside, rough, overhang, on, score }]
// (THE CHOICE above: places on a bumper bar first, then the body; each list by score.) opts.preferY: the body's height to aim for (the
// car's own plate's); opts.sizes: the widths to try; opts.bars: the end's bars (findBars) if already measured
export const searchPlace = (view, end, { preferY = null, sizes = R.SIZES, keep = 8, step = 0.01, bars = null } = {}) => {
  const H = view.box.max.y - view.box.min.y, lo = view.box.min.y;
  const aim = preferY ?? Math.max(lo + 0.45, Math.min(0.55, lo + 0.45 * H));
  bars = bars || findBars(view, end);
  const out = [];
  // ON A BAR: centred on its face, each size that hangs at least BAR_HOLD on it (height and width); the rays only where it is on the face;
  // the lowest bar that takes a plate
  for (const b of bars) {
    if (out.length) break;
    const y = (b.y0 + b.y1) / 2;
    for (const w of sizes) {
      const h = w / 4;
      if (Math.min(h, b.h) < R.BAR_HOLD * h - 1e-9 || Math.min(w, b.w) < R.BAR_HOLD * w - 1e-9) continue;
      if (y - h / 2 < lo + R.LOW_EDGE - 1e-9 || y > lo + R.HIGH_FRAC * H) continue;
      const hx = Math.min(w / 2 + R.MARGIN, b.w / 2 - 0.003), hy = Math.min(h / 2 + R.MARGIN, b.h / 2 - 0.003);
      for (const [tol, rough] of [[R.STRICT, false], [R.ROUGH, true]]) {
        const c = tryPlace(view, end, w, y, { tol, hx, hy });
        if (!c) continue;
        c.rough = rough; c.overhang = hx < w / 2 || hy < h / 2; c.on = 'bumper';
        c.score = c.dev * 150 + Math.abs(c.pitch) / 15 + (0.52 - w) * 8 + c.cover * 2 + (rough ? 1 : 0);
        out.push(c);
        break;
      }
    }
  }
  for (const [tol, rough, maxPitch] of [[R.STRICT, false, R.MAX_PITCH], [R.ROUGH, true, R.MAX_PITCH], [R.STRICT, true, R.GLACIS]]) {
    if (rough && out.some(c => c.on === 'bumper' || c.w >= 0.4)) break; // (ROUGH only when there is no bar place and nothing strict of a fair size on the body)
    if (maxPitch === R.GLACIS && out.length) break; // (a steep front, an armoured car's glacis, only when nothing upright was found)
    for (const w of sizes) {
      const h = w / 4;
      for (const marginY of [R.MARGIN, -R.OVERHANG_Y]) { // (wholly on its surface; or standing past its top and bottom by up to OVERHANG_Y)
        for (let y = lo + R.LOW_EDGE + h / 2; y <= lo + R.HIGH_FRAC * H; y += step) {
          const c = tryPlace(view, end, w, y, { tol, marginY, maxPitch });
          if (!c) continue;
          c.rough = rough; c.overhang = marginY < 0;
          if (placeKind(bars, y, c.z).on === 'bumper') continue; // (on a bar: only centred on it, above)
          c.on = 'body';
          c.score = c.dev * 150 + Math.abs(c.pitch) / 15 + Math.abs(y - aim) * 1.2 + (0.52 - w) * 8 + Math.max(0, c.inside - 0.1) * 2 + c.cover * 2 + (rough ? 1 : 0) + (c.overhang ? 0.5 : 0);
          out.push(c);
        }
      }
    }
  }
  // a bumper bar first, then the body; each by score; keep places that differ (not the same spot one centimetre higher), some of each kind
  const kept = [];
  for (const on of ['bumper', 'body']) {
    const list = out.filter(c => c.on === on).sort((a, b) => a.score - b.score);
    const mine = [];
    const room = on === 'bumper' ? Math.ceil(keep / 2) : keep - kept.length;
    for (const c of list) { if (mine.length >= room) break; if (!mine.some(k => k.w === c.w && Math.abs(k.y - c.y) < 0.02)) mine.push(c); }
    kept.push(...mine);
  }
  return kept;
};
