// The City Hatch as a SCRIPT: a .car.mjs file whose default export is the spec. The tools read it as they read a .json; it is here to
// show how the glass is COMPUTED from the body's outlines (the windscreen on the cabin's raked face, the side windows parallel to the
// pillars). node tools/tojson.mjs examples/hatchback.car.mjs writes hatchback.car.json from it.
const r4 = (v) => Math.round(v * 10000) / 10000, P = (a) => a.map(r4);
const BEV = 0.06, LIFT = 0.008, TH = 0.2, HALF = 0.81, YMIN = 0.86 - BEV, YMAX = 1.38 + BEV;
// (tumblehome narrows the extrude linearly from its foot (full width) to its top (1 - TH): the flank's half width at y)
const flank = (y) => HALF * (1 - TH * (y - YMIN) / (YMAX - YMIN));
// windscreen face: line (1.02, 0.86) -> (0.42, 1.38) pushed out by the bevel; hatch face (-1.25, 1.38) -> (-1.70, 0.96)
const line = (a, b, sign) => { const dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy); let n = [dy / L, -dz / L]; if (Math.sign(n[0]) !== sign) n = [-n[0], -n[1]]; return { a, dz, dy, L, n }; };
const WS = line([1.02, 0.86], [0.42, 1.38], 1), HT = line([-1.25, 1.38], [-1.70, 0.96], -1);
const onFace = (F, t, x, lift = BEV + LIFT) => { const z = F.a[0] + F.dz * t + F.n[0] * lift, y = F.a[1] + F.dy * t + F.n[1] * lift; return P([x, y, z]); };
const pane = (F, t0, t1, inset) => { const y0 = F.a[1] + F.dy * t0, y1 = F.a[1] + F.dy * t1; return [onFace(F, t0, -(flank(y0) - inset)), onFace(F, t0, flank(y0) - inset), onFace(F, t1, flank(y1) - inset), onFace(F, t1, -(flank(y1) - inset))]; };
// the faces' outer lines z(y) (for the side windows' pillar edges, 12 cm in from them)
const zOn = (F, y) => { const z0 = F.a[0] + F.n[0] * BEV, y0 = F.a[1] + F.n[1] * BEV; return z0 + (y - y0) * F.dz / F.dy; };
const slope = HALF * TH / (YMAX - YMIN), sn = [1 / Math.hypot(1, slope), slope / Math.hypot(1, slope)];
const side = (pts) => pts.map(([z, y]) => P([flank(y) + sn[0] * LIFT, y + sn[1] * LIFT, z]));
const front = side([[zOn(WS, 1.0) - 0.12, 1.0], [zOn(WS, 1.3) - 0.12, 1.3], [-0.25, 1.3], [-0.25, 1.0]]);
const rear = side([[-0.35, 1.0], [-0.35, 1.3], [zOn(HT, 1.3) + 0.12, 1.3], [zOn(HT, 1.0) + 0.12, 1.0]]);
export default {
  '//': ['A SMALL HATCHBACK, the second example. It shows the two body tools together: a LOFT for the lower body (cross-sections',
    'along z give the nose and tail their plan shape) and an EXTRUDE with tumblehome for the glasshouse (its side view gives the',
    'windscreen and hatch rake; tumblehome narrows it toward the roof). Every pane is a flat panel computed FROM those outlines:',
    'the windscreen lies on the cabin\'s raked face 8 mm out, the side windows follow the A-pillar and hatch lines 12 cm in.'],
  format: 'carkit/1', id: 'hatchback', name: 'City Hatch', class: 'small',
  description: 'A small three-door hatchback: a rounded tub, a glasshouse set in from its shoulders, a steep hatch.',
  livery: { good: { body: '#4fc3f7', accent: '#f4f4f4' }, evil: { body: '#3a1f4d', accent: '#141418' } },
  parts: [
    { '//': 'THE TUB: a loft through 7 rounded sections. The flanks between the axles are all x = 0.9, so they are one flat plane (the decal area).',
      name: 'tub', role: 'body', shape: 'loft', cornerSegments: 2, sections: [
        { z: -1.95, w: 1.6, y0: 0.3, y1: 0.9, r: 0.1 }, { z: -1.85, w: 1.8, y0: 0.24, y1: 0.98, r: 0.14 }, { z: -1.2, w: 1.8, y0: 0.22, y1: 0.98, r: 0.14 },
        { z: 0.9, w: 1.8, y0: 0.22, y1: 0.94, r: 0.14 }, { z: 1.55, w: 1.78, y0: 0.24, y1: 0.84, r: 0.14 }, { z: 1.88, w: 1.66, y0: 0.28, y1: 0.74, r: 0.12 },
        { z: 1.96, w: 1.56, y0: 0.3, y1: 0.68, r: 0.1 }] },
    { '//': 'THE GLASSHOUSE: side view extruded 1.62 wide (set in 9 cm from the tub\'s flanks: a shoulder), narrowed 20% toward the roof (linearly, so each flank is one flat plane). Its foot (0.80 after the bevel) is buried in the tub.',
      name: 'cabin', role: 'body', shape: 'extrude', width: 1.62, bevel: BEV, curveSegments: 3, tumblehome: TH,
      profile: [[1.02, 0.86], [0.42, 1.38, 0.12], [-1.25, 1.38, 0.12], [-1.7, 0.96], [-1.7, 0.86]] },
    { '//': 'the windscreen: a flat quad on the cabin\'s raked face (its outline pushed out by the bevel, then 8 mm more), 12 cm in from the flanks at each height',
      name: 'windscreen', role: 'glass', tag: 'windscreen', shape: 'panel', points: pane(WS, 0.17, 0.82, 0.12) },
    { name: 'rear window', role: 'glass', tag: 'rear-window', shape: 'panel', points: pane(HT, 0.22, 0.8, 0.12).reverse() },
    { '//': 'side windows: flat on the narrowed flank, 8 mm out; front edge parallel to the A-pillar, rear edge parallel to the hatch, the top 14 cm under the roof',
      name: 'side window', role: 'glass', tag: 'side-window', shape: 'panel', mirror: true, points: front },
    { name: 'side window rear', role: 'glass', tag: 'side-window', shape: 'panel', mirror: true, points: rear },
    { name: 'headlamp', role: 'light-front', tag: 'headlight', shape: 'box', size: [0.34, 0.12, 0.04], at: [0.5, 0.56, 1.965], mirror: true },
    { name: 'grille', role: 'black', tag: 'grille', shape: 'box', size: [0.52, 0.14, 0.04], at: [0, 0.5, 1.965] },
    { name: 'front bumper', role: 'accent', tag: 'bumper', shape: 'box', size: [1.72, 0.18, 0.16], at: [0, 0.33, 1.95] },
    { name: 'fog lamp', role: 'light-front', shape: 'cylinder', radius: 0.04, length: 0.04, axis: 'z', segments: 10, at: [0.62, 0.33, 2.04], mirror: true },
    { name: 'tail lamp', role: 'light-rear', tag: 'taillight', shape: 'box', size: [0.24, 0.18, 0.04], at: [0.56, 0.78, -1.965], mirror: true },
    { name: 'rear plate', role: 'plate', tag: 'plate-rear', shape: 'box', size: [0.42, 0.12, 0.02], at: [0, 0.55, -1.958] },
    { name: 'rear bumper', role: 'accent', tag: 'bumper', shape: 'box', size: [1.74, 0.18, 0.14], at: [0, 0.33, -1.94] },
    { '//': 'one exhaust, on one side: asymmetric: true tells the symmetry check it is meant', name: 'exhaust', role: 'trim', tag: 'exhaust', asymmetric: true, shape: 'cylinder', radius: 0.04, length: 0.2, axis: 'z', segments: 8, at: [0.55, 0.2, -1.98] },
    { '//': 'a door mirror: a squashed sphere, half buried in the cabin\'s flank by the A-pillar', name: 'mirror', role: 'accent', tag: 'mirror', shape: 'sphere', radii: [0.08, 0.05, 0.06], segments: [10, 6], at: [0.83, 1.0, 0.86], mirror: true },
  ],
  wheels: [{ '//': 'tyre tops (0.62) up inside the tub (bottom 0.22); 6 cm proud of the flank', at: [0.84, 1.25], radius: 0.31, width: 0.24, mirror: true }, { at: [0.84, -1.25], radius: 0.31, width: 0.24, mirror: true }],
  mounts: {
    roof: { at: [0, 1.44, -0.4], size: [1.1, 1.2], height: 0.6, surface: 'cabin', note: 'the flat of the roof' },
    cargo: { none: 'a hatchback has no load bed or open deck' },
    wing: { at: [0, 1.44, -1.1], size: [1.1, 0.08], height: 0.35, surface: 'cabin', note: 'the roof\'s rear edge, over the hatch' },
    'plate-front': { at: [0, 0.33, 2.03], size: [0.42, 0.11], surface: 'front bumper' },
    'plate-rear': { at: [0, 0.55, -1.968], size: [0.42, 0.12], surface: 'rear plate' },
    decals: [{ name: 'door', side: 'both', at: [0.9, 0.59, 0], size: [1.7, 0.32], surface: 'tub', note: 'the flat flank between the wheels, under the shoulder' }],
  },
};
