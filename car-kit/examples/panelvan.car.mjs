// The Panel Van (the decal-ready sample) as a SCRIPT: a .car.mjs file whose default export is the spec (node tools/tojson.mjs examples/panelvan.car.mjs writes the .json).
// Its glass and decal frames are COMPUTED from the body's side-view outline, so they follow it exactly.
const r4 = (v) => Math.round(v * 10000) / 10000, P = (a) => a.map(r4);
const line = (a, b, sign) => { const dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy); let n = [dy / L, -dz / L]; if (Math.sign(n[0]) !== sign) n = [-n[0], -n[1]]; return { a, dz, dy, L, n }; };
const BEV = 0.05, LIFT = 0.008;
const WS = line([1.55, 1.12], [1.05, 2.1], 1), BON = line([2.45, 0.78], [1.55, 1.12], 1);
const onFace = (F, t, x, lift = BEV + LIFT) => P([x, F.a[1] + F.dy * t + F.n[1] * lift, F.a[0] + F.dz * t + F.n[0] * lift]);
const zOn = (F, y) => { const z0 = F.a[0] + F.n[0] * BEV, y0 = F.a[1] + F.n[1] * BEV; return z0 + (y - y0) * F.dz / F.dy; };
const bonMid = onFace(BON, 0.5, 0, BEV);
const spec = {
  '//': ['THE DECAL-READY SAMPLE: a panel van modelled so decals go on cleanly. Read it for how decal areas must be modelled:',
    ' - the body is ONE extrude with NO tumblehome: its flanks are one flat plane (x = +-1.0) from sill to roof, both sides mirrored;',
    ' - every decal area lies on a big flat panel of PAINT (role body) with nothing crossing it: no handles, no trim, no creases, no',
    '   panel lines, no glass, no lamps; the wheels and the window are outside the areas, the mirrors are above them;',
    ' - each area is a mount in "decals" with a FRAME: at (the middle, on the surface), normal (out of the surface), u (the decal\'s',
    '   width direction; the flanks default to toward the nose on both sides, as the game\'s flank decals point nose-ward) and size in',
    '   metres; maxDepth / maxCurve say how flat it must be (the checker measures it);',
    ' - areas: both flanks (the cargo side and the cab door), the bonnet (a flat sloped plane), the rear doors.'],
  format: 'carkit/1', id: 'panelvan', name: 'Panel Van', class: 'tall',
  description: 'A plain panel van with big flat sides: the decal-ready sample.',
  livery: { good: { body: '#f4f4f4', accent: '#2a5bd0' }, evil: { body: '#24242b', accent: '#c81f3a' } },
  parts: [
    { '//': 'THE BODY: a flat-sided extrude (no tumblehome: the decal areas stay flat); the bonnet is a straight sloped line, so a flat plane',
      name: 'body', role: 'body', shape: 'extrude', width: 2.0, bevel: BEV, curveSegments: 3,
      profile: [[2.4, 0.34], [2.45, 0.78, 0.06], [1.55, 1.12], [1.05, 2.1, 0.1], [-2.5, 2.12, 0.08], [-2.5, 0.34]] },
    { name: 'windscreen', role: 'glass', tag: 'windscreen', shape: 'panel', points: (() => { const t0 = 0.12, t1 = 0.84; return [onFace(WS, t0, -0.84), onFace(WS, t0, 0.84), onFace(WS, t1, 0.84), onFace(WS, t1, -0.84)]; })() },
    { '//': 'the cab\'s side window only: the cargo flank behind it is all paint (the decal area)', name: 'side window', role: 'glass', tag: 'side-window', shape: 'panel', plane: 'x', offset: 1.0 + LIFT, mirror: true,
      points: P([zOn(WS, 1.3) - 0.1, 1.3]).length && [[r4(zOn(WS, 1.3) - 0.1), 1.3], [r4(zOn(WS, 1.92) - 0.1), 1.92], [0.55, 1.92], [0.55, 1.3]] },
    { name: 'headlamp', role: 'light-front', tag: 'headlight', shape: 'box', size: [0.32, 0.16, 0.05], at: [0.66, 0.6, 2.47], mirror: true },
    { name: 'indicator', role: 'light-indicator', tag: 'indicator', shape: 'box', size: [0.1, 0.08, 0.04], at: [0.9, 0.6, 2.465], mirror: true },
    { name: 'grille', role: 'black', tag: 'grille', shape: 'box', size: [0.8, 0.18, 0.04], at: [0, 0.6, 2.47] },
    { name: 'front bumper', role: 'accent', tag: 'bumper', shape: 'box', size: [2.02, 0.2, 0.2], at: [0, 0.34, 2.47] },
    { name: 'rear bumper', role: 'accent', tag: 'bumper', shape: 'box', size: [2.02, 0.2, 0.2], at: [0, 0.34, -2.52] },
    { name: 'tail lamp', role: 'light-rear', tag: 'taillight', shape: 'box', size: [0.14, 0.34, 0.04], at: [0.86, 1.0, -2.56], mirror: true },
    { name: 'rear plate', role: 'plate', tag: 'plate-rear', shape: 'box', size: [0.42, 0.12, 0.02], at: [0, 0.6, -2.557] },
    { name: 'mirror', role: 'black', tag: 'mirror', shape: 'box', size: [0.08, 0.22, 0.14], at: [1.0, 1.58, 1.24], mirror: true },
  ],
  wheels: [{ at: [0.92, 1.65], radius: 0.38, width: 0.28, mirror: true }, { at: [0.92, -1.6], radius: 0.38, width: 0.28, mirror: true }],
  mounts: {
    roof: { at: [0, 2.17, -0.8], size: [1.6, 2.6], height: 0.6, surface: 'body' },
    cargo: { none: 'a closed panel van: the load is inside, there is no open deck' },
    wing: { at: [0, 2.17, -2.35], size: [1.6, 0.12], height: 0.35, surface: 'body', note: 'the roof\'s rear edge' },
    'plate-front': { at: [0, 0.34, 2.57], size: [0.42, 0.11], surface: 'front bumper' },
    'plate-rear': { at: [0, 0.6, -2.567], size: [0.42, 0.12], surface: 'rear plate' },
    decals: [
      { name: 'cargo side', side: 'both', at: [1.0, 1.4, -0.95], size: [2.6, 1.05], surface: 'body', maxDepth: 0.005, maxCurve: 3, note: 'the big flat flank behind the cab' },
      { name: 'cab door', side: 'both', at: [1.0, 1.03, 0.82], size: [0.7, 0.32], surface: 'body', maxDepth: 0.005, maxCurve: 3, note: 'under the side window, behind the front wheel' },
      { name: 'bonnet', side: 'center', at: bonMid, normal: P([0, BON.n[1], BON.n[0]]), u: [1, 0, 0], size: [1.4, 0.56], surface: 'body', maxDepth: 0.005, maxCurve: 3, note: 'the flat sloped bonnet; u across the car' },
      { name: 'rear doors', side: 'center', at: [0, 1.38, -2.55], normal: [0, 0, -1], u: [-1, 0, 0], size: [1.4, 0.9], surface: 'body', maxDepth: 0.005, maxCurve: 3, note: 'the flat back; u to the right as seen from behind' },
    ],
  },
};
export default spec;
