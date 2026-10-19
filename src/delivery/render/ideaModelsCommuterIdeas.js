// ---- car ideas' models: three plain little city hatchbacks (ideasCommuterIdeas.js) ----------------------------------------
// Drawn as drafts for a new Commuter (the owner, 15-Oct: "make the Commuter look less ugly ... three drafts"), then kept as
// idea cars of their own when the Commuter stayed as it is:
//   smileyhatch    the Smiley Hatch, after the Daewoo Matiz (1998): a tall, bubbly five-door with big round "eye" lamps
//   eightieshatch  the Eighties Hatch, after the Ford Fiesta Mk2 (1983): crisp and upright, a dark band of lamps and grille
//   pebble         the Pebble, after the Ford Ka (1996): one smooth arc of a roofline over a bold black lower band
// Built as the Junker benchmark asks: bodies from extrusions of their side views (a lower body, and a cabin narrowed from
// its own foot so its flanks stay flat), the glass derived from the cabin's own profile (ideaModelsDkit.js cabinGlass:
// rounded body, sharp windows, one top line, a 14 cm A-pillar), plain arches cut round plain chunky wheels (each tyre a mesh
// of its own, its hub inside it, so the showroom's suspension finds it) with dark liners so nothing shows through them,
// parts that share a material merged into one mesh, paint shaded darker low down (vertex colours). NO textures, no panel
// lines, no scooped wells, no people. Each builder takes the idea's entry and returns a group, front facing local +z,
// with userData.body (the paint, one mesh), animate, livery and glassVirtual. Spread into IDEA_MODELS by ideaModels.js.
// State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cabinGlass, fillet, flankPanel, flare, narrowAt, curve, extrudeSide, parts as glassParts } from './ideaModelsDkit.js';

// ---- shared materials and geometry (made once: clearGroup keeps them) -------------------------------------------------
const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const TYRE = keep(lambert(0x171717)), SILVER = keep(lambert(0xc4c8ce)), TRIM = keep(lambert(0x232529)), GREY = keep(lambert(0x5d6168));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = keep(basic(0xfff3c4)), TAIL = keep(basic(0xc0141c)), AMBER = keep(basic(0xffa31a));
const SHARED = new Map();
const shared = (key, make) => {
  if (!SHARED.has(key)) { const geo = make(); geo.userData.shared = true; SHARED.set(key, geo); }
  return SHARED.get(key);
};
const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// (every geometry merged is made non-indexed, with normals and uvs, so that boxes, spheres and extrusions merge together)
const plain = (geo) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
};
const merge = (geos) => mergeGeometries(geos.map(plain), false);
const parts = (parent, key, material, make) => place(parent, shared(key, () => merge(make())), material);
const bx = (w, h, l, x, y, z) => new THREE.BoxGeometry(w, h, l).translate(x, y, z);
// a squashed sphere (half sizes sx, sy, sz), turned (pitch about x, then yaw about y) and placed: a lamp, a mirror
const blob = (sx, sy, sz, x, y, z, pitch = 0, yaw = 0, seg = [10, 6]) => {
  const geo = new THREE.SphereGeometry(1, seg[0], seg[1]).scale(sx, sy, sz);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// shade a geometry darker toward its foot (a vertex colour, times the paint's: any paint is shaded alike), from `low` at
// y0 up to white at y1
const shadeLow = (geo, y0, y1, low) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0)));
    for (let c = 0; c < 3; c++) col[i * 3 + c] = low[c] + (1 - low[c]) * t;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};
// a wheel: a fat tyre and a plain hub disc, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
const wheel = (parent, key, R, width, x, z, hubR, hubMat) => {
  place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, 14).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(hubR, hubR, width + 0.016, 12).rotateZ(Math.PI / 2)), hubMat, x, R, z);
};
// an arch's dark liner: a half-tube over the axle between the tyres (no seeing through the arch to the other side)
const liner = (r, len, y, z) => new THREE.CylinderGeometry(r, r, len, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, y, z);
// a flank panel (ideaModelsDkit.js flankPanel) turned to face out: its triangles' winding reversed
const flip = (geo) => {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
    p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
    p.setXYZ(i + 2, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
};

export const IDEA_MODELS_COMMUTER_IDEAS = {};

// ---- the Smiley Hatch (after the Daewoo Matiz, 1998) -------------------------------------------------------------------
// A short, tall, friendly five-door city hatch. A round, blunt nose with a body-coloured bumper over a slim black lip; two
// big round headlamps in dark rims bulging from the nose's top corners like a pair of eyes, a small oval grille between
// them and a wide intake under it; a long raked windscreen into a high domed roof (its corners rounded) and an upright
// rounded hatch; plain arches round bigger wheels on silver hub caps; tall rounded tail lamps up the hatch's corners.
IDEA_MODELS_COMMUTER_IDEAS.smileyhatch = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.32, TW = 0.24; // (the wheels: radius 0.32, the axles at ±0.62 of the length as before)
  const k = 'smileyhatch' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const AX = 0.62 * L, BEV = 0.07, BW = 2 * W + 0.02;
  const NOSE = L - 0.12, TAILZ = -L + 0.17, AY = 0.32;   // (the outlines: each bevel grows its outline by its size)
  const ARCH = R + 0.05 + BEV;                           // (the arches clear the tyres by 5 cm)
  // the body, side on: the nose's round face, the short high bonnet up to the windscreen's foot, the waist rising a
  // little to the back, the round tail; the straight sill with the two arches
  const WSF = [1.1, 0.87], WB = [-1.52, 0.93];
  const bodyOutline = [
    [NOSE - 0.08, AY], ...curve([NOSE - 0.08, AY], [NOSE + 0.04, 0.46], [NOSE + 0.03, 0.66], [NOSE - 0.15, 0.77], 4),
    ...curve([NOSE - 0.15, 0.77], [1.5, 0.83], [1.3, 0.86], WSF, 3), WB,
    ...curve(WB, [TAILZ + 0.02, 0.94], [TAILZ - 0.01, 0.78], [TAILZ, 0.6], 3),
    ...curve([TAILZ, 0.6], [TAILZ + 0.01, 0.42], [TAILZ + 0.02, AY], [TAILZ + 0.08, AY], 2),
    ['arc', -AX, AY, ARCH], ['arc', AX, AY, ARCH],
  ];
  // the cabin, side on (its foot hidden in the body): the windscreen from the bonnet, a high domed roof with both corners
  // rounded (fillet), the upright hatch down to the waist; narrowed toward the roof from its foot (a plane, not a bend)
  const CBEV = 0.07, CW = BW - 0.06, CH = CW / 2, ROOFY = car.height - CBEV - 0.005, CY = 0.78;
  const TAPER = [CY, ROOFY, 0.17];
  const CF = [WSF[0] - 0.02, WSF[1]], V1 = [0.12, ROOFY], V2 = [-1.3, ROOFY - 0.03], TH = [-1.6, 0.93];
  const cabin = [[CF[0] + 0.2, CY], CF, ...fillet(CF, V1, V2, 0.2, 0.42, 4), ...fillet(V1, V2, TH, 0.4, 0.2, 4), TH, [TH[0] - 0.02, CY]];
  const mirrorX = narrowAt(CH, 0.95, TAPER) + 0.03;
  const body = place(group, shared(k + 'body', () => shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 2, 0.2),
    extrudeSide(cabin, CW, CBEV, TAPER, 2, 0.12),
    ...[-1, 1].map(s => blob(0.09, 0.065, 0.055, s * mirrorX, 0.95, 0.88, 0, s * 0.3, [8, 5])),   // the mirrors
    // the bumpers: a rounded band standing a little proud round each end, from the arches round the corners
    extrudeSide([[AX + 0.42, 0.2], [NOSE - 0.02, 0.2], [NOSE + 0.07, 0.26], [NOSE + 0.07, 0.46], [NOSE - 0.02, 0.52], [AX + 0.5, 0.52]], BW + 0.03, 0.04, null, 2, 0.2),
    extrudeSide([[-AX - 0.42, 0.2], [TAILZ + 0.02, 0.2], [TAILZ - 0.07, 0.26], [TAILZ - 0.07, 0.48], [TAILZ + 0.02, 0.54], [-AX - 0.5, 0.54]], BW + 0.03, 0.04, null, 2, 0.2),
  ]), 0.22, 0.8, [0.8, 0.6, 0.56])), paint);
  // the glass, all from the cabin's own profile (rounded body, sharp windows): two windows a side (the door glass the
  // longer), the windscreen down to the bonnet (a second call with its belt at the cowl), the hatch's window
  const FROM = cabin.indexOf(CF), TO = cabin.indexOf(TH);
  const ARGS = { from: FROM, to: TO, half: CH, taper: TAPER, grow: CBEV, sharp: true, cornerDepth: 0.05,
    inset: { aPillar: 0.07, roof: 0.1, cPillar: 0.12 }, lift: CBEV + 0.006, sideLift: 0.006, sideInset: 0.1 };
  const glass = cabinGlass(cabin, { ...ARGS, belt: 0.96, windows: [[-0.2, 9], [-9, -0.34]] });
  const hatch = cabinGlass(cabin, { ...ARGS, belt: 0.96, sideInset: 0.2 }).rear; // (in past the cabin's rounded corners)
  const screen = cabinGlass(cabin, { ...ARGS, belt: WSF[1] + 0.04 });
  glassParts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, hatch]);
  // the lamps: two big round eyes in the nose's top corners; tall rounded tail lamps up the hatch's corners
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => blob(0.15, 0.13, 0.1, s * 0.55, 0.72, NOSE - 0.03, 0.3, 0, [10, 6])));
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => blob(0.085, 0.25, 0.08, s * 0.62, 0.86, TAILZ + 0.01, 0, -s * 0.45, [8, 6])));
  // black: a slim lip low at each end (round the corners), the small oval grille between the eyes, the wide smile under it
  parts(group, k + 'black', TRIM, () => [
    extrudeSide([[AX + 0.44, 0.15], [NOSE, 0.15], [NOSE + 0.0845, 0.19], [NOSE + 0.0845, 0.24], [AX + 0.44, 0.24]], BW + 0.01, 0.03, null, 2, 0.18),
    extrudeSide([[-AX - 0.44, 0.15], [TAILZ, 0.15], [TAILZ - 0.0845, 0.19], [TAILZ - 0.0845, 0.24], [-AX - 0.44, 0.24]], BW + 0.01, 0.03, null, 2, 0.18), // (4.5 mm past the tail)
    blob(0.17, 0.055, 0.05, 0, 0.63, NOSE + 0.06, 0.25, 0, [12, 5]),
    ...[-1, 1].map(s => blob(0.178, 0.158, 0.1, s * 0.55, 0.72, NOSE - 0.09, 0.3, 0, [8, 5])), // (a dark rim round each eye)
    // the arches' liners: a dark half-tube over each axle between the tyres (no seeing through the arch)
    ...[AX, -AX].map(z => liner(ARCH - BEV - 0.01, BW - 0.36, AY, z)),
    blob(0.4, 0.065, 0.05, 0, 0.385, NOSE + 0.12, 0, 0, [14, 6]),
  ]);
  // the wheels: bigger fat tyres out at the corners, plain silver hub caps
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, TW, side * (W - 0.05), z, 0.2, SILVER);
  group.userData = { body, animate: () => {}, livery: () => {}, glassVirtual: { chain: glass.virtual, grow: CBEV } };
  return group;
};

// ---- the Eighties Hatch (after the Ford Fiesta Mk2, 1983) --------------------------------------------------------------
// A crisp, upright little hatchback of the eighties. A flat bonnet over an upright face: one dark band across the nose
// holding two rectangular headlamps and a grille of three bright bars; chunky black bumpers wrapping back to the arches,
// amber indicators in the front one; a grey lower band down each side between the arches (the two-tone); a tall square
// glasshouse with a black pillar between door and quarter glass, a raked hatch; square tail lamps red over amber in the
// rear corners with a black garnish between; plain arches, silver steel hubs.
IDEA_MODELS_COMMUTER_IDEAS.eightieshatch = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.31, TW = 0.22; // (the wheels: radius 0.31, the axles at ±0.62 of the length as before)
  const k = 'eightieshatch' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const AX = 0.62 * L, BEV = 0.04, BW = 2 * W + 0.02, HALF = BW / 2;
  const NOSE = L - 0.07, TAILZ = -L + 0.13, AY = 0.3;    // (the outlines: each bevel grows its outline by its size)
  const ARCH = R + 0.05 + BEV, RA = ARCH - BEV;          // (the arches clear the tyres by 5 cm; RA as seen)
  // the body, side on: the upright face, the flat bonnet, the level waist, the tail under the hatch; the straight sill
  // with the two arches
  const WSF = [0.95, 0.87], WB = [-1.56, 0.89];
  const bodyOutline = [
    [NOSE, AY], [NOSE, 0.74], [NOSE - 0.05, 0.81], [NOSE - 0.2, 0.84], WSF, WB, [TAILZ + 0.02, 0.88], [TAILZ, 0.82], [TAILZ, AY],
    ['arc', -AX, AY, ARCH], ['arc', AX, AY, ARCH],
  ];
  // the cabin, side on (its foot hidden in the body): an upright windscreen, a flat roof, the hatch raked down to the
  // waist; corners only just softened; narrowed a little toward the roof from its foot (a plane, not a bend)
  const CBEV = 0.04, CW = BW - 0.04, CH = CW / 2, ROOFY = car.height - CBEV - 0.005, CY = 0.74;
  const TAPER = [CY, ROOFY, 0.07];
  const CF = [WSF[0] + 0.02, WSF[1]], V1 = [0.3, ROOFY], V2 = [-1.22, ROOFY], TH = [-1.66, 0.9];
  const cabin = [[CF[0] + 0.2, CY], CF, ...fillet(CF, V1, V2, 0.07, 0.1, 3), ...fillet(V1, V2, TH, 0.1, 0.08, 3), TH, [TH[0] - 0.02, CY]];
  const mirror = (s) => bx(0.05, 0.13, 0.15, s * (HALF + 0.05), 0.98, 0.78);
  const body = place(group, shared(k + 'body', () => shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 1, 0.08),
    extrudeSide(cabin, CW, CBEV, TAPER, 1, 0.06),
  ]), 0.25, 0.85, [0.84, 0.72, 0.68])), paint);
  // the glass, all from the cabin's own profile: two windows a side (the door glass the longer) either side of a black
  // B-pillar, the windscreen down to the bonnet (a second call with its belt at the cowl), the hatch's window
  const FROM = cabin.indexOf(CF), TO = cabin.indexOf(TH), BELT = 0.94, BP = [-0.24, -0.36];
  const ARGS = { from: FROM, to: TO, half: CH, taper: TAPER, grow: CBEV, sharp: true, cornerDepth: 0.03,
    inset: { aPillar: 0.07, roof: 0.06, cPillar: 0.1 }, lift: CBEV + 0.006, sideLift: 0.006, sideInset: 0.1 };
  const glass = cabinGlass(cabin, { ...ARGS, belt: BELT, windows: [[BP[0], 9], [-9, BP[1]]] });
  const screen = cabinGlass(cabin, { ...ARGS, belt: WSF[1] + 0.04 });
  glassParts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
  // the grey lower band down each side between the arches (laid on the flank, its ends round the arches' edges)
  const BT = 0.5, ra = RA + 0.03, arcPts = (z, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => a0 + (a1 - a0) * i / n)
    .map(t => [z + ra * Math.cos(t), AY + ra * Math.sin(t)]);
  const t1 = Math.PI - Math.asin((BT - AY) / ra), t2 = Math.asin((BT - AY) / ra);
  const band = [...arcPts(AX, t1, Math.PI, 4), [AX - ra, AY + 0.02], [-AX + ra, AY + 0.02], ...arcPts(-AX, 0, t2, 4)];
  place(group, shared(k + 'band', () => merge(flankPanel(band, { half: HALF, lift: 0.004 }).map(flip))), GREY);
  // black: the bumpers (wrapping the corners back to the arches), the band across the nose, the B-pillars, the mirrors
  const FZ = NOSE + BEV;
  parts(group, k + 'black', TRIM, () => [
    extrudeSide([[AX + RA + 0.01, 0.24], [NOSE + 0.02, 0.24], [NOSE + 0.1, 0.28], [NOSE + 0.1, 0.48], [NOSE + 0.02, 0.52], [AX + RA + 0.01, 0.52]], BW + 0.05, 0.03, null, 1, 0.08),
    extrudeSide([[-AX - RA - 0.01, 0.24], [TAILZ - 0.02, 0.24], [TAILZ - 0.1, 0.28], [TAILZ - 0.1, 0.48], [TAILZ - 0.02, 0.52], [-AX - RA - 0.01, 0.52]], BW + 0.05, 0.03, null, 1, 0.08),
    bx(1.52, 0.22, 0.02, 0, 0.66, FZ + 0.006),
    bx(0.72, 0.2, 0.02, 0, 0.72, TAILZ - BEV - 0.006), // (the garnish between the tail lamps)
    ...flankPanel([[BP[0], ROOFY - 0.02], [BP[1], ROOFY - 0.02], [BP[1], BELT - 0.02], [BP[0], BELT - 0.02]], { half: CH, taper: TAPER, lift: 0.0045 }).map(flip), // (the B-pillars 4.5 mm off the paint)
    mirror(1), mirror(-1),
    // the arches' liners: a dark half-tube over each axle between the tyres (no seeing through the arch)
    ...[AX, -AX].map(z => liner(RA - 0.01, BW - 0.34, AY, z)),
  ]);
  // the face: rectangular headlamps in the band, three bright grille bars between them; amber indicators in the bumper
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.34, 0.15, 0.03, s * 0.54, 0.66, FZ + 0.02)));
  parts(group, k + 'bars', SILVER, () => [0.61, 0.66, 0.71].map(y => bx(0.56, 0.024, 0.02, 0, y, FZ + 0.02)));
  parts(group, k + 'amber', AMBER, () => [
    ...[-1, 1].map(s => bx(0.2, 0.07, 0.02, s * 0.56, 0.4, NOSE + 0.135)),
    ...[-1, 1].map(s => bx(0.22, 0.09, 0.02, s * 0.58, 0.6, TAILZ - BEV - 0.006)),
  ]);
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.22, 0.18, 0.02, s * 0.58, 0.745, TAILZ - BEV - 0.006)));
  // the wheels: plain tyres on silver steel hubs
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, TW, side * (W - 0.05), z, 0.18, SILVER);
  group.userData = { body, animate: () => {}, livery: () => {}, glassVirtual: { chain: glass.virtual, grow: CBEV } };
  return group;
};

// ---- the Pebble (after the Ford Ka, 1996) -----------------------------------------------------------------------------
// One smooth egg on a wide stance, three doors. A round nose rising without a break over a short bonnet into a long raked
// windscreen, a short domed roof and a hatch raked well forward, so the roofline is one arc (its corners rounded wide; the
// glass sharp and derived from the cabin's profile) with ONE long side window; the wheels pushed out to the corners
// (short overhangs) and flush with the body; a bold black lower band, unpainted, wrapping the nose, the arches (wide lips),
// the sills and the tail; wide oval headlamps across the nose's corners over a slim oval grille; wide oval tail lamps
// across the tail's corners.
IDEA_MODELS_COMMUTER_IDEAS.pebble = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.33, TW = 0.26; // (fat wheels out at the corners)
  const k = 'pebble' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const AX = 0.65 * L, BEV = 0.08, BW = 2 * W, HALF = BW / 2;
  const NOSE = L - 0.12, TAILZ = -L + 0.17, AY = 0.36;    // (the outlines: each bevel grows its outline by its size)
  const ARCH = R + 0.05 + BEV, RA = ARCH - BEV;           // (the arches clear the tyres by 5 cm; RA as seen)
  // the body, side on: the round nose rising without a break over the short bonnet to the windscreen's foot, the waist
  // rising to the back, the round tail; the straight sill with the two arches
  const WSF = [1.02, 0.84], WB = [-1.42, 0.92];
  const bodyOutline = [
    [NOSE - 0.12, AY], ...curve([NOSE - 0.12, AY], [NOSE + 0.04, 0.42], [NOSE + 0.04, 0.64], [NOSE - 0.18, 0.74], 4),
    ...curve([NOSE - 0.18, 0.74], [1.45, 0.79], [1.2, 0.82], WSF, 3), WB,
    ...curve(WB, [TAILZ + 0.04, 0.92], [TAILZ - 0.02, 0.8], [TAILZ, 0.62], 3),
    ...curve([TAILZ, 0.62], [TAILZ, 0.44], [TAILZ + 0.04, AY], [TAILZ + 0.12, AY], 2),
    ['arc', -AX, AY, ARCH], ['arc', AX, AY, ARCH],
  ];
  // the cabin, side on (its foot hidden in the body): the long raked windscreen, a short roof, the hatch raked forward;
  // its corners rounded wide (fillet), so the roofline reads as one arc; narrowed toward the roof from its foot
  const CBEV = 0.08, CW = BW - 0.08, CH = CW / 2, ROOFY = car.height - CBEV - 0.005, CY = 0.8;
  const TAPER = [CY, ROOFY, 0.2];
  const CF = [WSF[0] - 0.02, WSF[1]], V1 = [0.08, ROOFY], V2 = [-1.02, ROOFY - 0.04], TH = [-1.56, 0.94];
  const cabin = [[CF[0] + 0.2, CY], CF, ...fillet(CF, V1, V2, 0.26, 0.36, 5), ...fillet(V1, V2, TH, 0.32, 0.22, 5), TH, [TH[0] - 0.02, CY]];
  const mirrorX = narrowAt(CH, 0.98, TAPER) + 0.03;
  const body = place(group, shared(k + 'body', () => shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 2, 0.24),
    extrudeSide(cabin, CW, CBEV, TAPER, 2, 0.12),
    ...[-1, 1].map(s => blob(0.1, 0.06, 0.06, s * mirrorX, 0.98, 0.84, 0, s * 0.3, [8, 5])),   // the mirrors
  ]), 0.3, 0.85, [0.78, 0.74, 0.7])), paint);
  // the glass, all from the cabin's own profile: one long window a side (three doors), the windscreen down to the
  // bonnet (a second call with its belt at the cowl), the hatch's window (in past the cabin's rounded corners)
  const FROM = cabin.indexOf(CF), TO = cabin.indexOf(TH), BELT = 0.95;
  const ARGS = { from: FROM, to: TO, half: CH, taper: TAPER, grow: CBEV, sharp: true, cornerDepth: 0.05,
    inset: { aPillar: 0.07, roof: 0.1, cPillar: 0.12 }, lift: CBEV + 0.006, sideLift: 0.006, sideInset: 0.12 };
  const glass = cabinGlass(cabin, { ...ARGS, belt: BELT });
  const screen = cabinGlass(cabin, { ...ARGS, belt: WSF[1] + 0.04 });
  const hatch = cabinGlass(cabin, { ...ARGS, belt: BELT, sideInset: 0.2 }).rear;
  glassParts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, hatch]);
  // black: the lower band: round the nose and the tail (wrapping back to the arches), wide lips round the arches, the
  // sills between them; the slim grille; the arches' liners
  const lip = (z, s) => (s > 0 ? flare(z, AY, RA, RA + 0.09, 0.035).translate(HALF + 0.03, 0, 0)
    : flare(-z, AY, RA, RA + 0.09, 0.035).rotateY(Math.PI).translate(-HALF - 0.03, 0, 0));
  parts(group, k + 'black', TRIM, () => [
    extrudeSide([[AX + RA + 0.02, 0.2], [NOSE - 0.02, 0.2], [NOSE + 0.07, 0.25], [NOSE + 0.07, 0.4], [NOSE - 0.02, 0.45], [AX + RA + 0.02, 0.45]], BW + 0.06, 0.03, null, 2, 0.22),
    extrudeSide([[-AX - RA - 0.02, 0.2], [TAILZ + 0.02, 0.2], [TAILZ - 0.07, 0.25], [TAILZ - 0.07, 0.42], [TAILZ + 0.02, 0.47], [-AX - RA - 0.02, 0.47]], BW + 0.06, 0.03, null, 2, 0.22),
    ...[-1, 1].map(s => bx(0.04, 0.18, 2 * AX - 2 * RA - 0.04, s * (HALF + 0.015), AY + 0.03, 0)),
    ...[-1, 1].flatMap(s => [lip(AX, s), lip(-AX, s)]),
    blob(0.24, 0.04, 0.05, 0, 0.58, NOSE + 0.06, 0.3, 0, [10, 4]),
    ...[AX, -AX].map(z => liner(RA - 0.01, BW - 0.4, AY, z)),
  ]);
  // the lamps: wide ovals across the nose's corners; wide ovals across the tail's corners
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => blob(0.24, 0.07, 0.12, s * 0.56, 0.67, NOSE - 0.03, 0.35, s * 0.6, [10, 5])));
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => blob(0.19, 0.08, 0.12, s * 0.6, 0.74, TAILZ - 0.02, -0.2, -s * 0.55, [10, 5])));
  // the wheels: fat tyres flush with the body at the corners, plain silver hub caps
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, TW, side * (W - 0.04), z, 0.2, SILVER);
  group.userData = { body, animate: () => {}, livery: () => {}, glassVirtual: { chain: glass.virtual, grow: CBEV } };
  return group;
};
