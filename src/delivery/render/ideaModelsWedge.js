// ---- the Wedge Supercar (after the Lamborghini Countach), rebuilt 16-Oct (the owner: "Let's enhance the Wedge Supercar's model. It is
// pretty bad"; the old one was one extruded side view with stick flares floating over the wheels, the back tyres outside the body, a flat
// slab of a nose and a glass block through the cabin). State-free, a plain build (no model patch).
// THE IDEA: the poster on the bedroom wall. A low razor wedge, the cabin pushed forward, a flat louvred engine cover between two air boxes,
// square-cut arches round chunky wheels, a black tail with a light bar and four pipes, a huge wing on two struts, and doors that go up.
// HOW: the body is a LOFT along the car (`loft`: a cross-section at each station, flat-shaded, so every crease is crisp: the knife nose, the
// fender crests over a lower bonnet, the shoulder chamfer along the whole flank, the trapezoid arches cut up into the sides); the cabin is
// its own narrow extrusion, its flanks leaning in (a tumblehome taper), and ALL its glass comes from its own side view through cabinGlass
// (ideaModelsDkit.js: one inset outline, the screen and the side windows share one top line). Vertex colours darken the arches' liners
// and the underside only (a crisp car: no weathering). Two small canvas textures: the louvres (128 x 64) and the telephone-dial wheel face
// (128 x 128).
// THE DOORS go up (scissor doors, hinged at the screen's foot) in the garage and on the card only (userData.garageOnly, as the Gullwing:
// render/cars.js keeps them shut on the road; the player's road car too, below). Shut, the door is just the body and its window (the door's
// skin and the dark doorway are hidden), so there is no shut line, no second skin and nothing coplanar; they show only while the door is up.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { keep, shared, place, merge, plain, bx, dsc, extrudeSide, narrowAt, cabinGlass, insetOutline, shadeBy, texture, GLASS, TRIM, CHROME,
  TYRE, LAMP, TAIL, AMBER } from './ideaModelsDkit.js';

// ---- the loft --------------------------------------------------------------------------------------------------------------------------
// `stations` [{ z, pts }], nose first: each pts the RIGHT half (x >= 0) of a cross-section, from the floor's middle round the outside to the
// top's middle, the same count at every station; mirrored to the left half and capped at both ends. Flat-shaded (non-indexed), with a
// colour a vertex from shade(normal, centroid, vertex) (a multiplier of the paint). Degenerate triangles (an arch's wall where there is no
// arch) are left out.
const loft = (stations, shade) => {
  const pos = [], col = [];
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), mid = new THREE.Vector3();
  const tri = (a, b, c) => {
    e1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); e2.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    n.crossVectors(e1, e2);
    if (n.length() < 1e-7) return;
    n.normalize();
    mid.set((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
    for (const p of [a, b, c]) { pos.push(...p); const k = shade(n, mid, p); col.push(k, k, k); }
  };
  for (let i = 0; i + 1 < stations.length; i++) {
    const A = stations[i], B = stations[i + 1];
    for (let j = 0; j + 1 < A.pts.length; j++) {
      for (const s of [1, -1]) {
        const a = [s * A.pts[j][0], A.pts[j][1], A.z], b = [s * A.pts[j + 1][0], A.pts[j + 1][1], A.z];
        const c = [s * B.pts[j + 1][0], B.pts[j + 1][1], B.z], d = [s * B.pts[j][0], B.pts[j][1], B.z];
        if (s > 0) { tri(a, c, b); tri(a, d, c); } else { tri(a, b, c); tri(a, c, d); }
      }
    }
  }
  // the end caps: the whole section (right half, then the left half back down), triangulated
  for (const [st, facing] of [[stations[0], 1], [stations[stations.length - 1], -1]]) {
    const ring = [...st.pts, ...st.pts.slice().reverse().map(([x, y]) => [-x, y])]
      .filter((p, i, all) => i === 0 || Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > 1e-4);
    while (ring.length > 3 && Math.hypot(ring[0][0] - ring[ring.length - 1][0], ring[0][1] - ring[ring.length - 1][1]) < 1e-4) ring.pop();
    const faces = THREE.ShapeUtils.triangulateShape(ring.map(([x, y]) => new THREE.Vector2(x, y)), []);
    for (const [i, j, k] of faces) {
      const p = [ring[i][0], ring[i][1], st.z], q = [ring[j][0], ring[j][1], st.z], r = [ring[k][0], ring[k][1], st.z];
      const cross = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); // (+: anticlockwise seen from +z)
      if ((cross > 0) === (facing > 0)) tri(p, q, r); else tri(p, r, q);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};
// a value along the car from a few [z, value] keys (nose first), straight between them
const along = (keys) => (z) => {
  if (z >= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [z0, v0] = keys[i], [z1, v1] = keys[i + 1];
    if (z <= z0 && z >= z1) return v0 + (v1 - v0) * (z0 - z) / (z0 - z1);
  }
  return keys[keys.length - 1][1];
};
// a geometry given a plain colour attribute (k), so it can share the vertex-coloured paint
const tint = (geo, k = 1) => shadeBy(plain(geo), () => [k, k, k]);
// a flat four-cornered panel ([x, y, z] corners in order round it, their [u, v]) facing `want` (its triangles wound to face that way)
const quad = (pts, uvs, want) => {
  const [a, b, c] = pts.map(p => new THREE.Vector3(...p)), n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
  const order = n.dot(new THREE.Vector3(...want)) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(order.flatMap(i => pts[i]), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(order.flatMap(i => uvs[i]), 2));
  geo.computeVertexNormals();
  return geo;
};

// ---- the two little pictures (drawn once, shared) ---------------------------------------------------------------------------------------
// the louvres: dark slats, each lit along its top edge (128 x 64, repeated along the panel)
const louvres = () => texture('wedge-louvres', 128, 64, (g, w, h) => {
  g.fillStyle = '#17181b'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    const y = i * h / 4;
    g.fillStyle = '#3b3e45'; g.fillRect(0, y + 2, w, 5);
    g.fillStyle = '#26282d'; g.fillRect(0, y + 7, w, 5);
  }
}, true);
// the telephone-dial wheel: a silver face with five round holes and a centre nut (128 x 128, on the hub's caps)
const dial = () => texture('wedge-dial', 128, 128, (g, w) => {
  const c = w / 2;
  g.fillStyle = '#2a2c30'; g.fillRect(0, 0, w, w);
  g.fillStyle = '#c3c7cd'; g.beginPath(); g.arc(c, c, c * 0.98, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#a7abb2'; g.beginPath(); g.arc(c, c, c * 0.84, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a3d43';
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.52, c + Math.sin(a) * c * 0.52, c * 0.2, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#d9dce0'; g.beginPath(); g.arc(c, c, c * 0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#55585e'; g.beginPath(); g.arc(c, c, c * 0.09, 0, Math.PI * 2); g.fill();
});

export const IDEA_MODELS_WEDGE = {
  wedge: (car) => {
    const group = new THREE.Group();
    const k = 'wg';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    // ---- the numbers (car-local metres: z along the car, its nose +z; y up from the road; x across, +x the car's left)
    const NOSE = 2.07, TAILZ = -2.07;
    const RF = 0.3, TWF = 0.25, AF = 1.2, RR = 0.335, TWR = 0.35, AR = -1.28; // the wheels: small in front, big and wide behind
    const XF = 0.965, XL = 0.56, CI = 0.075, CH = 0.06;  // the flank's half width, the arch liners', the shoulder chamfer (in, down)
    const BELT = 0.77, ROOF = 1.065, CB = BELT - 0.01;   // the cabin sits on the deck at the belt
    const xf = along([[NOSE, 0.8], [1.97, 0.9], [1.85, 0.95], [1.6, XF], [-1.97, XF], [TAILZ, 0.93]]);  // the plan: a chamfered nose
    const yb = along([[NOSE, 0.26], [1.97, 0.2], [1.85, 0.17], [-1.9, 0.17], [-1.97, 0.2], [TAILZ, 0.26]]); // the floor
    const crest = along([[NOSE, 0.44], [1.97, 0.5], [1.5, 0.67], [1.2, 0.74], [0.86, 0.76], [0.62, BELT], [-0.62, BELT], [-1.05, 0.9], [TAILZ, 0.9]]); // the fenders' tops
    const deck = along([[NOSE, 0.42], [1.97, 0.47], [0.58, BELT], [-0.62, BELT], [-1.05, 0.9], [TAILZ, 0.9]]); // the bonnet's / deck's middle
    // the arches: trapezoids cut up into the flank, their roofs following the body (a front foot, its top corners, a back foot)
    const arch = { 1.6: 'foot', 1.5: 0.6, 1.2: 0.645, 0.86: 0.68, 0.76: 'foot', [-0.84]: 'foot', [-0.92]: 0.755, [-1.05]: 0.76, [-1.66]: 0.76, [-1.74]: 'foot' };
    // THE DOOR OPENING: a recess in the flank from the sill to the shoulder's crease, between the arches (z DZR to DZF, in to x RX), dark inside.
    // Shut, the door's skin fills it flush (the same paint, the same shading: no line shows); up, the cavity shows with a seat and a dash in it
    const DZF = 0.62, DZR = -0.62, SILL = 0.3, DT = BELT - CH, RX = 0.5;
    // (each end of the opening has two stations at the same z, without and with it: the walls between them are the opening's ends)
    const Z = [NOSE, 1.97, 1.85, 1.6, 1.5, 1.2, 0.86, 0.76, DZF, [DZF], [0.58], [DZR], DZR, -0.84, -0.92, -1.05, -1.66, -1.74, -1.97, TAILZ];
    const stations = Z.map((zz) => {
      const door = Array.isArray(zz), z = door ? zz[0] : zz;
      const f = xf(z), b = yb(z), top = crest(z), mid = deck(z), a = typeof arch[z] === 'number' ? arch[z] : b;
      const xs = f - CI, xm = Math.min(0.6, xs - 0.05);
      // (the same eleven points at every station: where there is no opening, the recess's four collapse onto the flank's foot)
      const recess = door ? [[f, SILL], [RX, SILL], [RX, DT]] : [[f, a], [f, a], [f, a]];
      return { z, pts: [[0, b], [XL, b], [XL, a], [f, a], ...recess, [f, top - CH], [xs, top], [xm, mid], [0, mid]] };
    });
    const dark = 0.24, inside = 0.3;
    const low = (y) => 0.8 + 0.2 * Math.min(1, Math.max(0, (y - 0.2) / 0.35));
    const inRecess = (c) => Math.abs(c.z) < DZF + 0.005 && c.y > SILL - 0.005 && c.y < DT + 0.005 && Math.abs(c.x) > RX - 0.005 && Math.abs(c.x) < XF - 0.003;
    const bodyGeo = () => loft(stations, (nrm, c, p) => (inRecess(c) ? inside : nrm.y < -0.55 || (Math.abs(nrm.x) > 0.6 && Math.abs(c.x) < XL + 0.03) ? dark : low(p[1])));

    // ---- the cabin: its own side view, extruded narrower than the body, its flanks leaning in
    const CW = 0.86, TAPER = [CB, ROOF, 0.3], BEV = 0.012;
    const WSF = [0.58, BELT], WST = [-0.18, ROOF], RR0 = [-0.8, ROOF - 0.005], RW1 = [-1.1, 0.905];
    const cabin = [[0.62, CB], WSF, WST, RR0, RW1, [-1.1, CB]];
    const glass = cabinGlass(cabin, { from: cabin.indexOf(WSF), to: cabin.indexOf(RW1), belt: BELT, half: CW, taper: TAPER, grow: BEV,
      inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.08 }, lift: BEV + 0.006, sideLift: 0.006, windows: [[-0.62, 9]] });
    const gx = (y) => narrowAt(CW, y, TAPER); // (the cabin's flank at a height)

    // the air boxes on the shoulders behind the side windows, their mouths to the front; the pop-up lamps' pods on the fenders
    const airbox = (s) => {
      const shape = new THREE.Shape([[-0.64, 0.74], [-1.52, 0.86], [-1.52, 0.93], [-0.8, 1.01], [-0.66, 1.0]].map(([z, y]) => new THREE.Vector2(z, y)));
      return new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(s > 0 ? 0.89 : -0.65, 0, 0);
    };
    const podZ = 1.5, podY = (crest(podZ) + deck(podZ)) / 2, slope = Math.atan2(crest(1.3) - crest(1.7), 0.4);
    const pod = (s) => bx(0.3, 0.16, 0.34, s * 0.69, podY, podZ, slope);
    // (one mesh: the loft keeps its own colours a face; the rest is plain paint)
    const body = place(group, shared(k + 'body', () => mergeGeometries([bodyGeo(),
      ...[extrudeSide(cabin, CW * 2, BEV, TAPER, 1, BEV), airbox(1), airbox(-1), pod(1), pod(-1)].map(g => tint(g))], false)), paint);
    body.name = 'body';

    // ---- glass: one mesh, every pane (the screen, the small rear window, the side windows: a raised door carries a copy of its own)
    const pane = place(group, shared(k + 'glass', () => merge([glass.front, glass.rear, ...glass.sides])), GLASS);
    pane.name = 'glass';

    // ---- the black: splitter, the nose's intake, the tail's band and valance, the side intakes' rims, the air boxes' mouths, mirrors
    const FZ = NOSE, BZ = TAILZ;
    const mirrorX = gx(0.83) + 0.035;
    place(group, shared(k + 'black', () => merge([
      bx(1.62, 0.07, 0.15, 0, 0.235, FZ - 0.035),                   // the splitter: a lip standing 4 cm ahead of the nose
      bx(0.62, 0.06, 0.03, 0, 0.345, FZ + 0.004),                   // the intake slot in the nose
      bx(1.78, 0.2, 0.03, 0, 0.66, BZ - 0.004),                     // the tail's black band (the lamps on it)
      bx(1.7, 0.12, 0.1, 0, 0.36, BZ - 0.02),                       // the valance: a bumper bar under it
      ...[-1, 1].map(s => bx(0.2, 0.15, 0.025, s * 0.77, 0.925, -0.645 - 0.004)), // the air boxes' mouths
      ...[-1, 1].map(s => bx(0.03, 0.12, 1.5, s * (XF + 0.003), 0.23, -0.04)),    // the black sills between the arches
      ...[-1, 1].map(s => bx(0.12, 0.07, 0.15, s * mirrorX, 0.82, 0.4)),           // the mirrors, by the screen's foot
    ])), TRIM);
    // the intakes behind the doors and the engine cover's louvres: one picture, two places
    const vent = new THREE.MeshLambertMaterial({ map: louvres() });
    const intake = (s) => {
      const pts = [[-0.64, 0.4], [-0.81, 0.4], [-0.87, 0.7], [-0.66, 0.7]]; // (a parallelogram behind the door's opening, its back edge along the arch's front edge)
      return quad(pts.map(([z, y]) => [s * (XF + 0.005), y, z]), pts.map(([z, y]) => [(z + 0.64) * 4, (y - 0.4) * 4]), [s, 0, 0]);
    };
    const cover = () => {
      const geo = new THREE.PlaneGeometry(0.92, 0.72).rotateX(-Math.PI / 2).translate(0, 0.904, -1.5), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 4); // (four rows of slats a texture: sixteen across the cover)
      return geo;
    };
    place(group, shared(k + 'vents', () => merge([intake(1), intake(-1), cover()])), vent).name = 'louvres';

    // ---- lamps: the pop-up pods' lenses (the headlamps), white and amber in the nose's face, the tail's clusters and its light bar
    const podFront = (s) => bx(0.24, 0.035, 0.02, 0, 0.045, 0.172).rotateX(slope).translate(s * 0.69, podY, podZ); // (in the pod's frame: on its face, near its top)
    place(group, shared(k + 'lamp', () => merge([podFront(1), podFront(-1),
      ...[-1, 1].map(s => bx(0.16, 0.055, 0.02, s * 0.46, 0.37, FZ + 0.006)),       // the parking lamps in the nose
      ...[-1, 1].map(s => bx(0.1, 0.1, 0.02, s * 0.34, 0.66, BZ - 0.031)),          // the reversing lamps on the tail band
    ])), LAMP);
    place(group, shared(k + 'amber', () => merge([
      ...[-1, 1].map(s => bx(0.12, 0.055, 0.02, s * 0.64, 0.37, FZ + 0.004)),      // the front indicators, at the nose's corners
      ...[-1, 1].map(s => bx(0.1, 0.12, 0.02, s * 0.82, 0.66, BZ - 0.031)),         // the rear ones, outboard of the tail lamps
    ])), AMBER);
    place(group, shared(k + 'tail', () => merge([
      ...[-1, 1].map(s => bx(0.34, 0.13, 0.02, s * 0.58, 0.66, BZ - 0.031)),        // the tail lamps
      bx(0.56, 0.03, 0.015, 0, 0.66, BZ - 0.028),                                   // and the light bar between them
    ])), TAIL);
    // four pipes, two a side under the valance
    place(group, shared(k + 'pipes', () => merge([-0.44, -0.31, 0.31, 0.44].map(x => dsc(0.045, 0.16, x, 0.255, BZ - 0.02, 0, 10)))), CHROME);

    // ---- the wing: a huge blade on two raked struts standing on the engine cover, small end plates (tagged: a worn wing hides it)
    const wing = place(group, shared(k + 'wing', () => shadeBy(merge([
      bx(1.86, 0.045, 0.36, 0, 1.255, -1.86, 0.07),
      ...[-1, 1].map(s => bx(0.06, 0.4, 0.13, s * 0.53, 1.065, -1.86, -0.22)),
      ...[-1, 1].map(s => bx(0.03, 0.13, 0.4, s * 0.93, 1.245, -1.86)),
    ]), (y) => (y < 1.24 ? [0.85, 0.85, 0.85] : [1, 1, 1]))), paint);
    wing.userData.prop = 'wing';
    wing.name = 'wing';

    // ---- the wheels: chunky tyres, telephone-dial faces
    const face = keep(new THREE.MeshLambertMaterial({ map: dial() }));
    const wheel = (s, z, R, TW, x) => {
      const t = place(group, shared(k + 'tyre' + R, () => new THREE.CylinderGeometry(R, R, TW, 16).rotateZ(Math.PI / 2)), TYRE, s * x, R, z);
      const h = place(group, shared(k + 'hub' + R, () => new THREE.CylinderGeometry(R * 0.66, R * 0.66, TW + 0.02, 14).rotateZ(Math.PI / 2)), face, s * x, R, z);
      t.name = 'tyre'; h.name = 'hub';
    };
    for (const s of [-1, 1]) {
      wheel(s, AF, RF, TWF, XF - TWF / 2 - 0.015);
      wheel(s, AR, RR, TWR, XF - TWR / 2 - 0.015);
    }

    // ---- the doors (scissor doors, up in the garage only). A door is a thick skin that fills the opening flush when shut (shaded as the flank
    // is, so no line shows), hinged at its front top corner by the screen's foot; it swings up 65 degrees. While it is up it also shows its
    // upper frame round a near-black window (the side window itself stays on the cabin, dark: the way in), a hinge block, the seal round the
    // opening, a seat and a dash in the cavity. A flank decal (render/flankdecal.js) is hidden while a door is up and put back when it shuts
    const HZ = DZF - 0.02, HY = DT + 0.03, OPEN = 1.13, T = 0.04; // (the hinge; the angle up; the door's thickness)
    const seat = new THREE.MeshLambertMaterial({ color: 0x4a3426 });
    const shadeDoor = (geo, s) => { // (its outer face shaded as the flank, every other face the dark of the inside)
      const g = plain(geo), pos = g.attributes.position, nrm = g.attributes.normal, col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) col.fill(nrm.getX(i) * s > 0.5 ? low(pos.getY(i)) : inside, i * 3, i * 3 + 3);
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      return g;
    };
    const slabX = (pts, x0, x1) => { // (a side-view polygon [z, y] made solid from x0 to x1)
      const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
      return new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x1, 0, 0);
    };
    const frameOutline = (win) => { // (the door's upper frame: the window grown 4 cm, its two lowest corners brought down to the crease)
      const big = insetOutline(win, win.map(() => -0.04)), lowest = big.map((p, j) => j).sort((u, v) => big[u][1] - big[v][1]).slice(0, 2);
      return big.map(([z, y], j) => [Math.min(DZF, Math.max(DZR, z)), lowest.includes(j) ? DT : y]);
    };
    const flatGlass = (s, win, x) => { // (a fan: the window is convex)
      const pts = win.map(([z, y]) => [s * x, y, z]), pos = [];
      const a = new THREE.Vector3(...pts[0]), n = new THREE.Vector3().crossVectors(new THREE.Vector3(...pts[1]).sub(a), new THREE.Vector3(...pts[2]).sub(a));
      const flip = n.x * s < 0;
      for (let j = 1; j + 1 < pts.length; j++) pos.push(...pts[0], ...(flip ? [...pts[j + 1], ...pts[j]] : [...pts[j], ...pts[j + 1]]));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      return merge([geo]);
    };
    const xs2 = (s, a, b) => (s > 0 ? [a, b] : [-b, -a]); // (an x range on the side s)
    const doors = [];
    for (const [i, s] of [[0, 1], [1, -1]]) {
      const side = s > 0 ? 'L' : 'R', win = glass.sides[i].userData.pane.now; // (the window's [z, y] polygon, edits and all)
      const hinge = new THREE.Group(), inner = new THREE.Group();
      hinge.position.set(0, HY, HZ); inner.position.set(0, -HY, -HZ);
      hinge.add(inner); group.add(hinge);
      const skinMesh = place(inner, shared(k + 'door' + side, () => shadeDoor(slabX([[DZF, SILL], [DZR, SILL], [DZR, DT], [DZF, DT]], ...xs2(s, XF - T, XF)), s)), paint);
      skinMesh.name = 'door ' + side;
      const frame = place(inner, shared(k + 'doorframe' + side, () => shadeDoor(slabX(frameOutline(win), ...xs2(s, XF - T + 0.005, XF - 0.005)), s)), paint);
      const top = place(inner, shared(k + 'doorwin' + side, () => flatGlass(s, win, XF + 0.004)), TRIM); // (near-black, not glass: no window part of its own)
      frame.name = 'door frame ' + side; top.name = 'door top ' + side;
      // the cavity's furniture and the opening's seal, and the hinge block (shown while the door is up)
      const cave = place(group, shared(k + 'cave' + side, () => merge([
        bx(0.02, 0.012, 1.22, s * (XF - 0.012), SILL + 0.008, 0), bx(0.02, 0.012, 1.22, s * (XF - 0.012), DT - 0.008, 0), // the seal along the sill and the top
        bx(0.02, DT - SILL - 0.004, 0.012, s * (XF - 0.012), (SILL + DT) / 2, DZF - 0.008), bx(0.02, DT - SILL - 0.004, 0.012, s * (XF - 0.012), (SILL + DT) / 2, DZR + 0.008),
        bx(0.32, 0.12, 0.3, s * 0.69, 0.5, DZF - 0.17),             // the dash's end, at the front of the cavity
        bx(0.05, 0.07, 0.12, s * (XF - 0.03), HY, HZ + 0.03),       // the hinge block
      ])), TRIM);
      const chair = place(group, shared(k + 'seat' + side, () => merge([
        bx(0.3, 0.09, 0.42, s * 0.67, SILL + 0.046, -0.16),          // the seat's cushion
        bx(0.3, 0.38, 0.1, s * 0.67, SILL + 0.2, -0.43, -0.25),      // and its back, raked
      ])), seat);
      cave.name = 'door opening ' + side; chair.name = 'seat ' + side;
      doors.push({ hinge, show: [frame, top, cave, chair] });
    }
    const hidDecals = new Set();
    group.userData = {
      body,
      garageOnly: true, // (its doors move in the garage and on the card only: traffic draws it with them shut, render/cars.js)
      animate: (t) => { // (shut for a while, then up, held, and down again; shut at t = 0)
        // (the player's car is animated on the road too, render/items.js, which sets userData.roll for the rims: there the doors stay shut)
        const road = group.userData.roll !== undefined;
        const open = road ? 0 : Math.max(0, Math.min(1, Math.sin(t * 0.6) * 1.6 - 0.2)), ease = open * open * (3 - 2 * open);
        const up = ease > 0.01;
        for (const d of doors) { d.hinge.rotation.x = ease * OPEN; for (const m of d.show) m.visible = up; }
        // (a flank decal stays on the body: hidden while a door is up, and only the ones hidden here put back)
        if (up) group.traverse(o => { if (o.userData.flankDecal && o.visible) { o.visible = false; hidDecals.add(o); } });
        else if (hidDecals.size) { for (const o of hidDecals) o.visible = true; hidDecals.clear(); }
      },
    };
    return group;
  },
};
