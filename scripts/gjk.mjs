// GJK: do two convex point clouds (a part's vertices in world space) overlap? Used by the cargo containment check
// (.cargo-contain-check.mjs). Each part of the models it looks at is a convex primitive (a sphere, cone, cylinder, box), so the
// convex hull of its vertices IS the part. `margin` grows the first hull by a sphere of that radius (a clearance to keep).
//   overlaps(a, b, margin = 0) -> true | false         a, b: arrays of [x, y, z]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (a) => [-a[0], -a[1], -a[2]];
const far = (pts, d) => { let best = pts[0], bd = -Infinity; for (const p of pts) { const v = dot(p, d); if (v > bd) { bd = v; best = p; } } return best; };

export const overlaps = (a, b, margin = 0) => {
  const support = (d) => {
    const l = Math.hypot(d[0], d[1], d[2]) || 1, pa = far(a, d), pb = far(b, neg(d));
    return [pa[0] - pb[0] + d[0] / l * margin, pa[1] - pb[1] + d[1] / l * margin, pa[2] - pb[2] + d[2] / l * margin];
  };
  let d = sub(a[0], b[0]);
  if (!dot(d, d)) d = [1, 0, 0];
  let s = [support(d)];
  d = neg(s[0]);
  for (let it = 0; it < 64; it++) {
    if (dot(d, d) < 1e-18) return true;
    const p = support(d);
    if (dot(p, d) < 0) return false;
    s = [p, ...s];
    const r = next(s);
    if (r === true) return true;
    s = r.s; d = r.d;
  }
  return true; // (no verdict in 64 steps: only when touching, call it an overlap)
};

// the simplex step: keep the part of the simplex nearest the origin, and the direction towards it
const same = (a, b) => dot(a, b) > 0;
const next = (s) => {
  const [a] = s, ao = neg(a);
  if (s.length === 2) {
    const b = s[1], ab = sub(b, a);
    return same(ab, ao) ? { s, d: cross(cross(ab, ao), ab) } : { s: [a], d: ao };
  }
  if (s.length === 3) return tri(s);
  // a tetrahedron: which face has the origin outside it
  const [, b, c, dd] = s, ab = sub(b, a), ac = sub(c, a), ad = sub(dd, a);
  const abc = cross(ab, ac), acd = cross(ac, ad), adb = cross(ad, ab);
  if (same(abc, ao)) return tri([a, b, c]);
  if (same(acd, ao)) return tri([a, c, dd]);
  if (same(adb, ao)) return tri([a, dd, b]);
  return true;
};
const tri = (s) => {
  const [a, b, c] = s, ao = neg(a), ab = sub(b, a), ac = sub(c, a), abc = cross(ab, ac);
  const line = (p, q) => { const pq = sub(q, p); return same(pq, ao) ? { s: [p, q], d: cross(cross(pq, ao), pq) } : { s: [p], d: ao }; };
  if (same(cross(abc, ac), ao)) return same(ac, ao) ? { s: [a, c], d: cross(cross(ac, ao), ac) } : line(a, b);
  if (same(cross(ab, abc), ao)) return line(a, b);
  if (dot(abc, ao) === 0) return { s, d: abc }; // (in the plane: the origin is on it)
  return same(abc, ao) ? { s: [a, b, c], d: abc } : { s: [a, c, b], d: neg(abc) };
};
