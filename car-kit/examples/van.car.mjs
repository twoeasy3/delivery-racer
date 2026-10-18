// The Shuttle Van as a SCRIPT: a .car.mjs file whose default export is the spec (node tools/tojson.mjs examples/van.car.mjs writes the .json).
// Its glass and decal frames are COMPUTED from the body's side-view outline, so they follow it exactly.
const r4 = (v) => Math.round(v * 10000) / 10000, P = (a) => a.map(r4);
const line = (a, b, sign) => { const dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy); let n = [dy / L, -dz / L]; if (Math.sign(n[0]) !== sign) n = [-n[0], -n[1]]; return { a, dz, dy, L, n }; };
const BEV = 0.06, LIFT = 0.008, TH = 0.1, HALF = 0.98, YMIN = 1.1 - BEV, YMAX = 2.08 + BEV;
const flank = (y) => HALF * (1 - TH * (y - YMIN) / (YMAX - YMIN)); // (the glasshouse's half width at y: tumblehome is linear)
const WS = line([1.6, 1.1], [0.92, 2.08], 1);
const onFace = (F, t, x) => { const L = BEV + LIFT; return P([x, F.a[1] + F.dy * t + F.n[1] * L, F.a[0] + F.dz * t + F.n[0] * L]); };
const ws = (t0, t1, inset) => { const y0 = WS.a[1] + WS.dy * t0, y1 = WS.a[1] + WS.dy * t1; return [onFace(WS, t0, -(flank(y0) - inset)), onFace(WS, t0, flank(y0) - inset), onFace(WS, t1, flank(y1) - inset), onFace(WS, t1, -(flank(y1) - inset))]; };
const zOn = (F, y) => { const z0 = F.a[0] + F.n[0] * BEV, y0 = F.a[1] + F.n[1] * BEV; return z0 + (y - y0) * F.dz / F.dy; };
const slope = HALF * TH / (YMAX - YMIN), sn = [1 / Math.hypot(1, slope), slope / Math.hypot(1, slope)];
const side = (pts) => pts.map(([z, y]) => P([flank(y) + sn[0] * LIFT, y + sn[1] * LIFT, z]));
const Y0 = 1.32, Y1 = 1.9;
const spec = {
  '//': ['A WINDOWED MINIBUS (class tall): two EXTRUDES. The lower body (flat flanks: the decal area) gives the short bonnet; the glasshouse',
    'on it (2 cm narrower, its foot buried in the lower body) gives the raked windscreen and the long flat roof, tumblehome narrowing it',
    '10% toward the roof. The side windows are flat panels on that narrowed flank, the front one parallel to the windscreen pillar, all',
    'sharing one top line under the roof.'],
  format: 'carkit/1', id: 'van', name: 'Shuttle Van', class: 'tall',
  description: 'A boxy windowed minibus: short bonnet, raked screen, a long glasshouse, two-tone.',
  livery: { good: { body: '#ff9f43', accent: '#f4f4f4' }, evil: { body: '#1f3a3a', accent: '#2b2b30' } },
  parts: [
    { '//': 'THE LOWER BODY: a side view, extruded 2.0 m wide with a 6 cm bevel (the outline grows 6 cm all round): flat flanks up to the waist',
      name: 'body', role: 'body', shape: 'extrude', width: 2.0, bevel: BEV, curveSegments: 3,
      profile: [[2.42, 0.32], [2.48, 0.78, 0.08], [2.18, 1.06, 0.06], [1.55, 1.2], [-2.45, 1.2], [-2.45, 0.32]] },
    { '//': 'THE GLASSHOUSE: the raked windscreen face and the roof; its foot (1.04) is inside the lower body; its back 1 cm forward of the body\'s (never one plane)',
      name: 'glasshouse', role: 'body', shape: 'extrude', width: 2 * HALF, bevel: BEV, curveSegments: 3, tumblehome: TH,
      profile: [[1.6, 1.1], [0.92, 2.08, 0.1], [-2.3, 2.08, 0.1], [-2.44, 1.95, 0.06], [-2.44, 1.1]] },
    { '//': 'colour blocking: an accent band along the waist, 6 mm proud of the flank (never in its plane)', name: 'waist band', role: 'accent', shape: 'box', size: [0.006, 0.1, 4.3], at: [1.003, 1.14, -0.08], mirror: true },
    { name: 'windscreen', role: 'glass', tag: 'windscreen', shape: 'panel', points: ws(0.18, 0.83, 0.12) },
    { name: 'side window', role: 'glass', tag: 'side-window', shape: 'panel', mirror: true, points: side([[zOn(WS, Y0) - 0.12, Y0], [zOn(WS, Y1) - 0.12, Y1], [0.35, Y1], [0.35, Y0]]) },
    { name: 'side window 2', role: 'glass', tag: 'side-window', shape: 'panel', mirror: true, points: side([[0.2, Y0], [0.2, Y1], [-0.85, Y1], [-0.85, Y0]]) },
    { name: 'side window 3', role: 'glass', tag: 'side-window', shape: 'panel', mirror: true, points: side([[-1.0, Y0], [-1.0, Y1], [-2.2, Y1], [-2.2, Y0]]) },
    { name: 'rear window', role: 'glass', tag: 'rear-window', shape: 'panel', points: [[-0.72, Y0, -2.508], [-0.72, Y1, -2.508], [0.72, Y1, -2.508], [0.72, Y0, -2.508]] },
    { name: 'headlamp', role: 'light-front', tag: 'headlight', shape: 'box', size: [0.34, 0.16, 0.05], at: [0.66, 0.62, 2.55], mirror: true },
    { name: 'indicator', role: 'light-indicator', tag: 'indicator', shape: 'box', size: [0.12, 0.08, 0.04], at: [0.9, 0.62, 2.545], mirror: true },
    { name: 'grille', role: 'black', tag: 'grille', shape: 'box', size: [0.74, 0.16, 0.04], at: [0, 0.62, 2.55] },
    { name: 'front bumper', role: 'trim', tag: 'bumper', shape: 'box', size: [2.02, 0.2, 0.2], at: [0, 0.36, 2.52] },
    { name: 'rear bumper', role: 'trim', tag: 'bumper', shape: 'box', size: [2.02, 0.2, 0.2], at: [0, 0.36, -2.5] },
    { name: 'tail lamp', role: 'light-rear', tag: 'taillight', shape: 'box', size: [0.16, 0.3, 0.04], at: [0.84, 1.0, -2.52], mirror: true },
    { name: 'rear plate', role: 'plate', tag: 'plate-rear', shape: 'box', size: [0.42, 0.12, 0.02], at: [0, 0.62, -2.517] },
    { name: 'mirror', role: 'trim', tag: 'mirror', shape: 'box', size: [0.08, 0.2, 0.14], at: [1.0, 1.55, 1.25], mirror: true },
    { '//': 'a roof vent: a flat dome (a sphere with dome: true is a closed half sphere), left out of the roof mount\'s area', name: 'roof vent', role: 'trim', shape: 'sphere', radii: [0.22, 0.08, 0.22], dome: true, segments: [12, 6], at: [0, 2.13, 0.45] },
  ],
  wheels: [{ at: [0.92, 1.62], radius: 0.38, width: 0.28, mirror: true }, { at: [0.92, -1.65], radius: 0.38, width: 0.28, mirror: true }],
  mounts: {
    roof: { at: [0, 2.14, -0.95], size: [1.4, 2.2], height: 0.6, surface: 'glasshouse', note: 'the long flat roof behind the vent' },
    cargo: { none: 'a minibus is all seats: no load bed or open deck' },
    wing: { at: [0, 2.14, -2.2], size: [1.6, 0.12], height: 0.35, surface: 'glasshouse', note: 'the roof\'s rear edge' },
    'plate-front': { at: [0, 0.36, 2.62], size: [0.42, 0.11], surface: 'front bumper' },
    'plate-rear': { at: [0, 0.62, -2.527], size: [0.42, 0.12], surface: 'rear plate' },
    decals: [{ name: 'flank', side: 'both', at: [1.0, 0.82, -0.02], size: [2.1, 0.46], surface: 'body', note: 'below the waist band, between the wheels' }],
  },
};
export default spec;
