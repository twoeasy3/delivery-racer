// NUMBER PLATE PLACEMENT AUDIT (the owner, 15-Oct: the plate anchors were placed by agents who trusted their own contact sheets;
// measure them). Every car the game can show (garage, Supers, filler, Bespoke, event, earned and Legendary (`l-`), secret, level, idea
// cars) is built as the game dresses it (render/showcar.js makeShowCar, with a plate design EQUIPPED, so render/platecosmetic.js puts
// the cosmetic plate on the ends render/plateanchors.js gives) and each worn plate is MEASURED, nothing looked at:
// THE RULES it measures against are scripts/plate-search.mjs RULES (one set, shared with the place search and the generator: read its
// header for what a valid place is); every threshold below is one of them, except the few measuring constants in T.
//   (a) SIZE     the plate's width against the canonical 0.52 m (a 4:1 plate, 0.52 x 0.13) and against the flat surface it sits on
//                (`supportW` / `supportH`: how far from the plate's middle the surface stays within GAP of the plate's plane); where it
//                stands (`on`: 'bumper' on a bumper bar's face, 'above' / 'below' the end's bar, 'body' at an end with no bar: findBars)
//   (b) CONTACT  a grid of rays (9 x 5) through the plate, along its normal: the body surface under each point: the gap (floating) or
//                the penetration (buried), points over AIR (the plate's edge in the air), a plane fitted through the surface: its
//                angle to the plate's (tilt / skew); the plate's own normal faces OUT of its end; the texture reads the right way
//                (not mirrored, not upside down: the face's u axis to the viewer's right, v up)
//   (c) COVER    rays from a viewer (level, along the normal; and from 20 degrees above, the chase camera's side) to the plate's face:
//                anything of the car in front of it (the kind of thing: body, lamp, glass, wheel, own prop); the surface UNDER the
//                plate being a lamp or glass; and every PROP the player can equip (render/propmodels.js PROPS, placed by
//                render/propanchors.js fitProp as render/propdress.js does) tested the same way: the props that hide the plate
//   (d) PLACE    centred (the car's own centre line), the height (low: scraping; high: above 60 % of the car), how far INSIDE the car's
//                end the plate is (tucked), a rear plate in the front half (or the other way), the pitch (lying on a lid)
//   (e) OWN      the model's own tagged plates (userData.plate) still visible on an end that wears the cosmetic one (two plates), an
//                untagged plate-like slab near it, an own plate kept at the OTHER end (mixed designs: noted)
//   (f) NONE     the cars that wear none (none / unplaced / Legendary) and why, with what the Cosmetics screen says for them
//   (g) Z-FIGHT  render/zfight.js findZFights on the plate and the car's meshes near it (coplanar faces of the plate and the body)
// Output: <out>/audit.json (everything) and <out>/audit.csv (one row per car and end, worst first, FLAGS), <out>/summary.txt.
//   node scripts/plate-placement-audit.mjs                       every car (out: /tmp/plate-audit)
//   node scripts/plate-placement-audit.mjs <car id> [...]        those cars only (prints their rows)
//   node scripts/plate-placement-audit.mjs --break               the tool's self-test: plates deliberately shifted 10 cm into the
//                                                                body, 10 cm off it, turned 20 degrees, mirrored: every break must flag
//   --out <dir>  where to write           --no-props  skip the prop occlusion pass        --no-zfight  skip the z-fight pass
// Units: car-local metres (x across, y up, the nose at +z), gaps in cm in the report.
import * as THREE from 'three';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';
import { makeView, searchPlace, isTyre, findBars, placeKind, surfaceKind, RULES as R } from './plate-search.mjs';

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const OUT = opt('--out', '/tmp/plate-audit');
const FIX = argv.includes('--fix'), WRITE = argv.includes('--write');
const BREAK = argv.includes('--break'), NO_PROPS = argv.includes('--no-props'), NO_Z = argv.includes('--no-zfight');
const only = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out' && argv[i - 1] !== '--orig');

// the audit's own measuring constants (every rule's threshold is in R): the share of sample points over nothing that is OVER_AIR; a surface
// more than contactBand in front of the plate's plane is something standing in front of it (not the surface under it); the share of the
// face an equippable prop must hide to count
const T = { air: 0.15, contactBand: 0.03, propCover: 0.15 };
const NX = 9, NY = 5;
const r1 = (v) => Math.round(v * 10) / 10, r3 = (v) => Math.round(v * 1000) / 1000, cm = (v) => (v == null ? null : r1(v * 100));

const { load, close } = await startModels();
const results = [];
try {
  const C = await load('cars.js');
  const { makeShowCar } = await load('render/showcar.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { glassy } = await load('render/dents.js');
  const P = await load('render/platecosmetic.js');
  const A = await load('render/plateanchors.js');
  const TABLE = await load('render/plateanchorstable.js'); // (the same module instance the reader uses: --fix tries places by writing into it)
  const { PROPS, buildProp, propPaint } = await load('render/propmodels.js');
  const { fitProp } = await load('render/propanchors.js');
  const { findZFights } = await load('render/zfight.js');
  if (!P.setPlateDesign('classic')) throw new Error('could not equip the classic plate');

  // every car the game can show (the plate generator's list, Legendary included)
  const cars = [];
  const add = (group, car) => { if (car && !cars.some(c => c.car.id === car.id)) cars.push({ group, car }); };
  for (const car of C.CARS) add('garage', car);
  for (const car of C.FILLER_CARS) add('filler', car);
  for (const car of C.BESPOKE_CARS) add('bespoke', car);
  for (const car of C.EVENT_CARS) add('event', car);
  for (const car of C.EARNED_CARS) add(car.legend ? 'legendary' : 'earned', car);
  for (const car of Object.values(C.SECRET_CARS)) add('secret', car);
  for (const car of Object.values(C.LEVEL_CARS)) add('level', car);
  add('level', C.AMPHIBIOUS_TANK);
  for (const car of IDEA_CARS) add('idea', car);
  for (const car of C.CARS) add('super', C.superOf(car));

  const ray = new THREE.Raycaster();
  const visibleDeep = (n) => { for (let p = n; p; p = p.parent) if (p.visible === false) return false; return true; };
  const isCosmeticPlate = (n) => { for (let p = n; p; p = p.parent) if (p.userData.platecosmetic) return true; return false; };
  const isPropCosmetic = (n) => { for (let p = n; p; p = p.parent) if (p.userData.propCosmetic) return true; return false; };
  // what a mesh is, for the report
  const kindOf = (model, n) => {
    const hubs = model.userData.wheelHubs;
    if (hubs && ['tyres', 'hubs', 'parts', 'rings'].some(k => (hubs[k] || []).includes(n))) return 'wheel';
    if (n.userData.wheelRing || isTyre(n)) return 'wheel'; // (a spare wheel's tyre too)
    if (n.userData.plate) return 'ownplate';
    if (n.userData.prop) return 'ownprop:' + n.userData.prop;
    const m = [].concat(n.material)[0];
    if (!m) return 'body';
    const k = surfaceKind(n, model.userData.body, glassy); // (the search's own: a bumper of any finish is 'ok', the body)
    if (k !== 'ok') return k;
    if (n !== model.userData.body && m !== model.userData.body?.material && m.transparent && m.opacity < 0.95) return 'glass';
    return 'body';
  };
  const meshesOf = (model, { props = false } = {}) => {
    const out = [];
    model.traverse((n) => {
      if (!n.isMesh || !n.geometry || isCosmeticPlate(n) || (!props && isPropCosmetic(n)) || !visibleDeep(n)) return;
      const m = [].concat(n.material)[0];
      if (m && (m.visible === false || (m.transparent && (m.opacity < 0.5 || m.depthWrite === false)))) return; // (a smoke puff, a ghostly effect: not the car's surface)
      out.push(n);
    });
    return out;
  };
  const describe = (model, n) => kindOf(model, n) + '/' + (n.geometry.type || '').replace('Geometry', '') + (n.name ? ':' + n.name : '') + '#' + ([].concat(n.material)[0]?.color?.getHexString?.() || '');

  // the plate's frame in the model: centre, normal (out of its end), u (along its width, to the viewer's right), v (up the plate)
  const frameOf = (model, group, end) => {
    model.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
    const m = new THREE.Matrix4().multiplyMatrices(inv, group.matrixWorld);
    const o = new THREE.Vector3().setFromMatrixPosition(m);
    const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3());
    const s = end === 'rear' ? -1 : 1;
    const N = new THREE.Vector3(0, 0, s).applyQuaternion(q);
    const X = new THREE.Vector3(1, 0, 0).applyQuaternion(q), Y = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    return { o, N, X, Y, toModel: m, inv };
  };
  // the texture's axes on the face, in model space (d position / d u, d position / d v), and the face's own winding normal
  const faceAxes = (model, face, inv) => {
    const g = face.geometry, pos = g.attributes.position, uv = g.attributes.uv, idx = g.index;
    const m = new THREE.Matrix4().multiplyMatrices(inv, face.matrixWorld);
    const i0 = idx ? idx.getX(0) : 0, i1 = idx ? idx.getX(1) : 1, i2 = idx ? idx.getX(2) : 2;
    const p = [i0, i1, i2].map(i => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m));
    const t = [i0, i1, i2].map(i => new THREE.Vector2().fromBufferAttribute(uv, i));
    const e1 = p[1].clone().sub(p[0]), e2 = p[2].clone().sub(p[0]);
    const d1 = t[1].clone().sub(t[0]), d2 = t[2].clone().sub(t[0]);
    const r = 1 / (d1.x * d2.y - d2.x * d1.y);
    const du = e1.clone().multiplyScalar(d2.y).sub(e2.clone().multiplyScalar(d1.y)).multiplyScalar(r).normalize();
    const dv = e2.clone().multiplyScalar(d1.x).sub(e1.clone().multiplyScalar(d2.x)).multiplyScalar(r).normalize();
    const wn = e1.clone().cross(e2).normalize();
    return { du, dv, wn, side: [].concat(face.material)[0]?.side ?? THREE.FrontSide };
  };

  // ---- one plate end measured ----
  const measureEnd = (model, car, end, group, anchor, { box, height, width, on = 'body', bar = null }) => {
    const F = frameOf(model, group, end);
    const w = anchor.size[0], h = anchor.size[1];
    const meshes = meshesOf(model);
    const flags = [], notes = [], out = end === 'rear' ? -1 : 1;
    // the sample points on the anchor plane (the body surface the plate is meant to stand on), 4 % in from the plate's edge
    const pts = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
      const a = -w / 2 * 0.92 + w * 0.92 * i / (NX - 1), b = -h / 2 * 0.8 + h * 0.8 * j / (NY - 1);
      pts.push({ a, b, p: F.o.clone().addScaledVector(F.X, a).addScaledVector(F.Y, b) });
    }
    const toWorld = (v) => v.clone().applyMatrix4(model.matrixWorld);
    const dirWorld = (v) => v.clone().transformDirection(model.matrixWorld);
    const hitsAlong = (from, dir, list) => { ray.set(toWorld(from), dirWorld(dir)); ray.far = 50; return ray.intersectObjects(list, false); };
    // (a) the flat surface's width either side of the middle, at the plate's height: within GAP of the plate's plane
    const sideW = (sgn, axis = F.X, max = 1.2) => {
      let last = 0;
      for (let d = 0.005; d <= max; d += 0.005) {
        const p = F.o.clone().addScaledVector(axis, sgn * d);
        const hits = hitsAlong(p.clone().addScaledVector(F.N, 2), F.N.clone().negate(), meshes);
        const hit = hits.find(hh => { const off = hh.point.clone().applyMatrix4(F.inv).sub(p).dot(F.N); return off <= T.contactBand; });
        if (!hit) break;
        const off = hit.point.clone().applyMatrix4(F.inv).sub(p).dot(F.N);
        if (Math.abs(off) >= R.GAP) break;
        last = d;
      }
      return last;
    };
    const supportL = sideW(-1), supportR = sideW(1), supportW = supportL + supportR;
    const supportDown = sideW(-1, F.Y, 0.4), supportUp = sideW(1, F.Y, 0.4), supportH = supportDown + supportUp;
    // ON A BAR the plate may stick out past the bar (rule EDGES): its contact is judged where it is in front of the bar's face (the sample
    // points within the bar, findBars), on the body everywhere
    const held = on !== 'bumper' || !bar ? () => true : (s) => Math.abs(s.p.x) <= bar.w / 2 && s.p.y >= bar.y0 && s.p.y <= bar.y1;
    // (b) contact: from 2 m out along the normal, inwards
    const contact = [], blockers = [], under = new Map();
    for (const s of pts) {
      const hits = hitsAlong(s.p.clone().addScaledVector(F.N, 2), F.N.clone().negate(), meshes);
      let c = null;
      for (const hit of hits) {
        const H = hit.point.clone().applyMatrix4(F.inv);
        const off = H.clone().sub(s.p).dot(F.N); // + in front of the anchor plane
        if (off > T.contactBand) { blockers.push({ off, mesh: hit.object }); continue; }
        if (off < -0.30) break;
        c = { off, H, mesh: hit.object };
        break;
      }
      s.contact = c;
      if (process.env.PLATE_DEBUG) console.log('   sample', end, s.a.toFixed(3), s.b.toFixed(3), c ? (c.off * 100).toFixed(1) + 'cm ' + describe(model, c.mesh) : 'AIR', hits.slice(0, 3).map(hh => ((hh.point.clone().applyMatrix4(F.inv).sub(s.p).dot(F.N)) * 100).toFixed(1)).join(' '));
      if (c) { const k = kindOf(model, c.mesh); under.set(k, (under.get(k) || 0) + 1); }
      if (c && held(s)) contact.push(c);
    }
    const nHeld = pts.filter(held).length || 1;
    const gaps = contact.map(c => -c.off).sort((x, y) => x - y); // + floating, - buried
    const q = (f) => (gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(f * (gaps.length - 1) + 0.5))] : null);
    const airFrac = 1 - contact.length / nHeld;
    const gapMed = q(0.5), gapP75 = q(0.75), gapMax = gaps.length ? gaps[gaps.length - 1] : null, buryMax = gaps.length ? Math.max(0, -gaps[0]) : 0;
    const buriedFrac = gaps.filter(g => g < -R.BURY).length / nHeld;
    if (gapP75 != null && gapP75 > R.GAP) flags.push('FLOATING');
    if (buriedFrac >= 0.1) flags.push('BURIED');
    if (airFrac > T.air) flags.push('OVER_AIR');
    // the plane through the surface hits, in the plate's frame: off = a + b*x + c*y -> the surface's tilt against the plate's
    let tiltYaw = null, tiltPitch = null, tilt = null, fitDev = null;
    if (contact.length >= 8) {
      const rows = pts.filter(s => s.contact && held(s)).map(s => [s.a, s.b, s.contact.off]);
      let n = rows.length, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
      for (const [x, y, z] of rows) { sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z; }
      const M = [[n, sx, sy], [sx, sxx, sxy], [sy, sxy, syy]], Rv = [sz, sxz, syz];
      const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const D = det(M);
      if (Math.abs(D) > 1e-14) {
        const col = (k) => det(M.map((row, i) => row.map((v, j) => (j === k ? Rv[i] : v))));
        const a0 = col(0) / D, b = col(1) / D, c = col(2) / D;
        tiltYaw = Math.atan(b) * 180 / Math.PI; tiltPitch = Math.atan(c) * 180 / Math.PI; tilt = Math.atan(Math.hypot(b, c)) * 180 / Math.PI;
        fitDev = Math.max(...rows.map(([x, y, z]) => Math.abs(z - (a0 + b * x + c * y))));
        if (fitDev >= 0.015) flags.push('UNEVEN');
        else if (tilt > R.TILT) flags.push('TILTED');
      }
    }
    // the surface's own plane, found WITHOUT the plate (rays along the car's length at the plate's points, the first surface met from
    // outside): its normal against the plate's (a plate turned on its surface reads here even where most of it is off the surface)
    let surfTilt = null, surfDev = null;
    {
      const rows = [];
      for (const s of pts.filter(held)) {
        const hit = hitsAlong(new THREE.Vector3(s.p.x, s.p.y, out * 30), new THREE.Vector3(0, 0, -out), meshes)[0];
        if (hit) { const H = hit.point.clone().applyMatrix4(F.inv); if (Math.abs(H.z - s.p.z) < 0.4) rows.push([H.x, H.y, H.z]); }
      }
      if (rows.length >= nHeld * 0.7) {
        let n = rows.length, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
        for (const [x, y, z] of rows) { sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z; }
        const M = [[n, sx, sy], [sx, sxx, sxy], [sy, sxy, syy]], Rv = [sz, sxz, syz];
        const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        const D = det(M);
        if (Math.abs(D) > 1e-14) {
          const col = (k) => det(M.map((row, i) => row.map((v, j) => (j === k ? Rv[i] : v))));
          const a0 = col(0) / D, b = col(1) / D, c = col(2) / D;
          const sn = new THREE.Vector3(-b, -c, 1).normalize().multiplyScalar(out);
          surfTilt = Math.acos(Math.max(-1, Math.min(1, sn.dot(F.N)))) * 180 / Math.PI;
          surfDev = Math.max(...rows.map(([x, y, z]) => Math.abs(z - (a0 + b * x + c * y))));
          if (surfDev < 0.015 && surfTilt > R.TILT && !flags.includes('TILTED')) flags.push('TILTED');
        }
      }
    }
    // facing and text
    const fa = faceAxes(model, group.children.find(c => c.userData.plateFace), F.inv);
    if (F.N.z * out < 0.5) flags.push('FACES_WRONG_WAY');
    if (fa.wn.dot(F.N) < 0.9 && fa.side === THREE.FrontSide) flags.push('FACE_WOUND_INWARD');
    const viewerRight = F.N.clone().negate().cross(new THREE.Vector3(0, 1, 0)).normalize(); // (looking at it from outside, along -N)
    if (fa.du.dot(viewerRight) < 0.5) flags.push('TEXT_MIRRORED');
    if (fa.dv.y < 0.5) flags.push('TEXT_UPSIDE_DOWN');
    if (Math.abs(F.X.y) > Math.sin(4 * Math.PI / 180)) flags.push('ROLLED');
    if ((under.get('lamp') || 0) >= 2) flags.push('OVER_LAMP');
    if ((under.get('glass') || 0) >= 2) flags.push('ON_GLASS');
    if ((under.get('wheel') || 0) >= 2) flags.push('ON_WHEEL');
    // an edge of the plate past the edge of the surface it stands on (the rule EDGES), each beyond the measuring step AUDIT_SLACK: ON A BAR,
    // OVER_EDGE when less than BAR_HOLD of its height or of its width is on the face; ON THE BODY, past a side at all, or past the top or the
    // bottom by more than OVERHANG_Y
    const edges = [['left', supportL, w / 2, 0], ['right', supportR, w / 2, 0], ['bottom', supportDown, h / 2, R.OVERHANG_Y], ['top', supportUp, h / 2, R.OVERHANG_Y]];
    const past = edges.filter(([, sup, half]) => sup + 0.002 < half).map(([k, sup, half]) => k + ' ' + Math.round((half - sup) * 1000) / 10 + 'cm');
    if (past.length) notes.push('past its surface: ' + past.join(', '));
    const holdW = Math.min(supportL, w / 2) + Math.min(supportR, w / 2), holdH = Math.min(supportDown, h / 2) + Math.min(supportUp, h / 2);
    if (on === 'bumper' ? holdW + R.AUDIT_SLACK < R.BAR_HOLD * w || holdH + R.AUDIT_SLACK < R.BAR_HOLD * h : edges.some(([, sup, half, allow]) => half - sup > allow + R.AUDIT_SLACK)) flags.push('OVER_EDGE');
    if (w < R.SIZES[0] - 1e-6) flags.push(width < 1.5 ? 'SMALL(tiny car)' : 'SMALL');
    if (w > 0.45 * width) flags.push('BIG_FOR_CAR');
    // (c) cover: rays from a viewer to each point of the FACE (level along the normal; 20 degrees above it)
    const faceAt = (s) => s.p.clone().addScaledVector(F.N, P.STAND + 0.0005);
    const upA = R.UP_ANGLE * Math.PI / 180, up20 = F.N.clone().multiplyScalar(Math.cos(upA)).add(new THREE.Vector3(0, Math.sin(upA), 0)).normalize();
    const coverFrom = (dirOut, list) => {
      let covered = 0; const by = new Map();
      for (const s of pts) {
        const f = faceAt(s), hits = hitsAlong(f.clone().addScaledVector(dirOut, 30), dirOut.clone().negate(), list);
        const tFace = 30 - 0.0002;
        const block = hits.find(hh => hh.distance < tFace && !isCosmeticPlate(hh.object));
        if (block) { covered++; const k = describe(model, block.object); by.set(k, (by.get(k) || 0) + 1); }
      }
      return { frac: covered / pts.length, by: [...by].sort((x, y) => y[1] - x[1]).map(([k, n]) => k + ' x' + n) };
    };
    const coverLevel = coverFrom(F.N, meshes), coverUp = coverFrom(up20, meshes);
    if (coverLevel.frac >= R.COVER_LEVEL) flags.push(coverLevel.frac >= 0.8 && blockers.length >= pts.length * 0.8 && Math.max(...blockers.map(b => b.off)) < 0.25 ? 'BURIED_DEEP' : 'COVERED');
    else if (coverUp.frac >= R.COVER_UP) flags.push('COVERED_FROM_ABOVE');
    // (d) place
    const len = box.max.z - box.min.z;
    const endZ = end === 'rear' ? box.min.z : box.max.z;
    const inside = (F.o.z - endZ) * -out; // m inside the car's bounding box end
    // the car's end AROUND the plate (1.2 m wide, 0.6 m tall): the outermost surface there, along z
    let localEnd = null;
    for (let x = -0.6; x <= 0.601; x += 0.1) for (let y = F.o.y - 0.3; y <= F.o.y + 0.301; y += 0.05) {
      const from = new THREE.Vector3(x, y, out * (len + 5));
      const hit = hitsAlong(from, new THREE.Vector3(0, 0, -out), meshes)[0];
      if (!hit) continue;
      const z = hit.point.clone().applyMatrix4(F.inv).z;
      if (localEnd === null || z * out > localEnd * out) localEnd = z;
    }
    const insideLocal = localEnd === null ? null : (F.o.z - localEnd) * -out;
    if (insideLocal != null && insideLocal > R.TUCK) flags.push('TUCKED');
    if (F.o.z * out < len * 0.15) flags.push('WRONG_HALF');
    const yLow = F.o.y - h / 2, cx = (box.min.x + box.max.x) / 2;
    if (F.o.y > box.min.y + R.HIGH_FRAC * height + 0.005 && F.o.y > 1.0) flags.push('HIGH');
    if (yLow < box.min.y + R.LOW_EDGE - 0.005) flags.push('LOW');
    // the end's own middle at the plate's height: the left and right edges of the surface within 0.5 m of the plate's depth
    let xl = null, xr = null;
    for (let x = -2; x <= 2.001; x += 0.01) {
      const hit = hitsAlong(new THREE.Vector3(x, F.o.y, out * (len + 5)), new THREE.Vector3(0, 0, -out), meshes)[0];
      if (!hit) continue;
      const z = hit.point.clone().applyMatrix4(F.inv).z;
      if (Math.abs(z - F.o.z) > 0.5) continue;
      if (xl === null) xl = x;
      xr = x;
    }
    const mid = xl === null ? cx : (xl + xr) / 2;
    if (Math.abs(F.o.x - mid) > 0.03) flags.push('OFF_CENTRE');
    const pitch = Math.asin(Math.max(-1, Math.min(1, F.N.y))) * 180 / Math.PI;
    if (Math.abs(pitch) > R.MAX_PITCH + 0.5) flags.push('ON_A_LID'); // (the search goes past MAX_PITCH only at an end with nothing upright: look at it)
    // (e) the model's own plates
    const own = P.existingPlates(model);
    const ownHere = own.filter(o => o.face === end && visibleDeep(o.mesh));
    if (ownHere.length) flags.push('TWO_PLATES');
    const platey = [];
    model.traverse((n) => {
      if (!n.isMesh || !n.geometry || n.userData.plate || isCosmeticPlate(n) || isPropCosmetic(n) || !visibleDeep(n)) return;
      const m = [].concat(n.material)[0]; if (!m) return;
      const b = new THREE.Box3().setFromObject(n, true), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const thin = Math.min(sz.x, sz.y, sz.z) <= 0.05 && sz.x >= 0.18 && sz.x <= 0.8 && sz.y >= 0.05 && sz.y <= 0.3 && sz.x / sz.y >= 3 && sz.x / sz.y <= 6;
      if (!thin || Math.abs(c.x) > 0.15 || Math.abs(c.z - endZ) > 0.6 || c.z * out < 0) return;
      const hex = m.color ? m.color.getHex() : 0, rr = hex >> 16 & 255, gg = hex >> 8 & 255, bb = hex & 255, hi = Math.max(rr, gg, bb), lo = Math.min(rr, gg, bb);
      const pale = lo > 0.75 * 255 && hi - lo < 0.2 * 255, yellow = rr > 210 && gg > 180 && bb < 90;
      if (pale || yellow || m.map) platey.push(describe(model, n) + ' ' + sz.x.toFixed(2) + 'x' + sz.y.toFixed(2) + '@y' + c.y.toFixed(2));
    });
    if (platey.length) flags.push('PLATE_LIKE_UNTAGGED');
    const other = end === 'rear' ? 'front' : 'rear';
    if (own.some(o => o.face === other && visibleDeep(o.mesh))) notes.push('own ' + other + ' plate kept (mixed designs)');
    return {
      w: r3(w), endMid: r3(mid), supportW: r3(supportW), supportH: r3(supportH), insideLocal: cm(insideLocal), carW: r3(width), at: [r3(F.o.x), r3(F.o.y), r3(F.o.z)], pitch: r1(pitch), inside: cm(inside),
      gapMed: cm(gapMed), gapP75: cm(gapP75), gapMax: cm(gapMax), buryMax: cm(buryMax), airFrac: r3(airFrac), tilt: tilt == null ? null : r1(tilt), tiltYaw: tiltYaw == null ? null : r1(tiltYaw), tiltPitch: tiltPitch == null ? null : r1(tiltPitch), fitDev: cm(fitDev), surfTilt: surfTilt == null ? null : r1(surfTilt), surfDev: cm(surfDev),
      under: Object.fromEntries(under), coverLevel: r3(coverLevel.frac), coverLevelBy: coverLevel.by, coverUp: r3(coverUp.frac), coverUpBy: coverUp.by,
      platey, flags, notes, F, pts,
    };
  };

  // (c, props) every equippable prop on this car: does it hide the plate (level / from above)?
  const propPass = (model, car, ends) => {
    const res = {};
    for (const end of Object.keys(ends)) res[end] = { level: [], above: [] };
    for (const slot of ['wing', 'cargo', 'roof']) {
      for (const prop of PROPS[slot] || []) {
        const fit = fitProp(car.id, slot, prop.shape);
        if (!fit) continue;
        const g = buildProp(prop.id, propPaint(0xcccccc));
        g.position.set(...fit.position); g.rotation.y = fit.rotationY * Math.PI / 180; g.scale.setScalar(fit.scale);
        g.userData.propCosmetic = slot;
        model.add(g); model.updateMatrixWorld(true);
        const list = []; g.traverse(n => { if (n.isMesh) list.push(n); });
        for (const [end, m] of Object.entries(ends)) {
          const F = m.F, up20 = F.N.clone().multiplyScalar(Math.cos(Math.PI / 9)).add(new THREE.Vector3(0, Math.sin(Math.PI / 9), 0)).normalize();
          for (const [view, dir] of [['level', F.N], ['above', up20]]) {
            let covered = 0;
            for (const s of m.pts) {
              const f = s.p.clone().addScaledVector(F.N, P.STAND + 0.0005);
              ray.set(f.clone().addScaledVector(dir, 30).applyMatrix4(model.matrixWorld), dir.clone().negate().transformDirection(model.matrixWorld)); ray.far = 30;
              if (ray.intersectObjects(list, false).length) covered++;
            }
            if (covered / m.pts.length >= T.propCover) res[end][view].push(slot + ':' + prop.id + ' ' + Math.round(100 * covered / m.pts.length) + '%');
          }
        }
        g.removeFromParent();
        g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      }
    }
    return res;
  };

  // (g) z-fights between the plate and the meshes near it
  const zfightPass = (model, group) => {
    const pb = new THREE.Box3().setFromObject(group, true).expandByScalar(0.05);
    const tmp = new THREE.Group();
    const add = (n) => { const c = new THREE.Mesh(n.geometry, n.material); c.matrixAutoUpdate = false; c.matrix.copy(n.matrixWorld); c.userData.src = n; tmp.add(c); };
    model.updateMatrixWorld(true);
    model.traverse((n) => {
      if (!n.isMesh || !n.geometry || n.isInstancedMesh || !visibleDeep(n) || isPropCosmetic(n)) return;
      if (isCosmeticPlate(n) && !group.getObjectById(n.id)) return;
      if (!new THREE.Box3().setFromObject(n, true).intersectsBox(pb)) return;
      add(n);
    });
    let fights;
    try { fights = findZFights(tmp); } catch (err) { return { error: err.message }; }
    const withBody = fights.filter(f => isCosmeticPlate(f.a.userData.src) !== isCosmeticPlate(f.b.userData.src));
    return { body: withBody.map(f => ({ area: r3(f.area * 1e4) / 1e4, gap: cm(f.gapMin), certain: f.certain, with: describe(model, isCosmeticPlate(f.a.userData.src) ? f.b.userData.src : f.a.userData.src) })), internal: fights.length - withBody.length };
  };

  const SEV = { FACES_WRONG_WAY: 20, WRONG_HALF: 20, BURIED_DEEP: 20, TEXT_MIRRORED: 15, TEXT_UPSIDE_DOWN: 15, FACE_WOUND_INWARD: 15, BURIED: 10, FLOATING: 10, COVERED: 10, TWO_PLATES: 10, OVER_AIR: 8, ON_GLASS: 8, OVER_LAMP: 8, ON_WHEEL: 8, ZFIGHT: 8, TILTED: 6, UNEVEN: 6, TALLER_THAN_SURFACE: 5, OVER_EDGE: 4, ROLLED: 6, WIDER_THAN_SURFACE: 5, TUCKED: 5, ON_A_LID: 5, PLATE_LIKE_UNTAGGED: 5, HIGH: 4, LOW: 3, OFF_CENTRE: 4, BIG_FOR_CAR: 3, COVERED_FROM_ABOVE: 3, PROP_HIDES: 2, SMALL: 3, 'SMALL(tiny car)': 0 };
  const score = (flags) => flags.reduce((s, f) => s + (SEV[f] ?? 1), 0);

  const auditCar = (group, car, breakFn = null) => {
    const plan = A.plateAnchorsFor(car);
    const row = { id: car.id, group, model: car.model || car.id, status: plan.status, ends: plan.ends.slice(), rough: { rear: !!plan.rear?.rough, front: !!plan.front?.rough }, anchors: { rear: plan.rear && [plan.rear.at[1], plan.rear.at[2], plan.rear.size[0], plan.rear.pitch], front: plan.front && [plan.front.at[1], plan.front.at[2], plan.front.size[0], plan.front.pitch] }, sides: {} };
    let model;
    try { model = makeShowCar(car); } catch (err) { row.error = err.message; return row; }
    model.parent?.remove(model);
    model.updateMatrixWorld(true);
    const info = model.userData.platePlan;
    row.ownPlates = P.existingPlates(model).map(o => o.face + (visibleDeep(o.mesh) ? '' : '(hidden)'));
    if (!info || plan.status !== 'ok') return row;
    // the car's size without the cosmetic plate and props
    const box = new THREE.Box3();
    for (const n of meshesOf(model)) {
      const b = new THREE.Box3().setFromObject(n, true);
      if (b.max.y - b.min.y < 0.005 && b.max.y < 0.1) continue; // (an underglow / shadow plane on the ground: not the car's end)
      box.union(b);
    }
    const size = box.getSize(new THREE.Vector3());
    const ends = {};
    // the end's bumper bars (the search's findBars) and where the plate stands against them
    const hubs = model.userData.wheelHubs || {}, view = makeView(model, { glassy, wheels: new Set(['tyres', 'hubs', 'parts', 'rings'].flatMap(x => hubs[x] || [])) });
    for (const end of plan.ends) {
      const g = info.groups[end];
      if (!g) { row.sides[end] = { flags: ['NOT_BUILT'] }; continue; }
      if (breakFn) breakFn(model, g, end);
      model.updateMatrixWorld(true);
      const bars = findBars(view, end), pk = placeKind(bars, plan[end].at[1], plan[end].at[2]);
      const m = measureEnd(model, car, end, g, plan[end], { box, height: size.y, width: size.x, on: pk.on, bar: pk.bar });
      m.on = pk.on; m.bars = bars.map(b => [r3(b.y0), r3(b.y1), r3(b.w)]).map(([a, b2, c]) => a + '-' + b2 + ' w' + c).join(' ');
      if (!NO_Z) {
        const z = zfightPass(model, g);
        m.zfight = z;
        if (z.body && z.body.some(f => f.certain)) m.flags.push('ZFIGHT'); // (under half a millimetre: the depth buffer cannot split them; 1-3 mm pairs are listed, not flagged)
      }
      ends[end] = m; row.sides[end] = m;
    }
    if (!NO_PROPS && !breakFn && Object.keys(ends).length) {
      const pr = propPass(model, car, ends);
      for (const [end, v] of Object.entries(pr)) {
        ends[end].propLevel = v.level; ends[end].propAbove = v.above;
        if (v.level.length) ends[end].flags.push('PROP_HIDES');
      }
    }
    for (const m of Object.values(row.sides)) { delete m.F; delete m.pts; m.score = score(m.flags || []); }
    row.score = Math.max(0, ...Object.values(row.sides).map(m => m.score || 0));
    return row;
  };

  // ---- --fix: a new place for every end with a placement flag OR not on its bumper bar (THE CHOICE: a bar first), searched
  // (scripts/plate-search.mjs) and each candidate AUDITED as the game dresses it; the best audited one (the fewest placement flags; then
  // on a bar before the body; then the bigger plate) is taken only if it is better than the place it replaces: fewer flags, or as few
  // and onto a bar from the body, or as few, the same kind and bigger. An end written BY HAND (plateanchors.js HAND, the model editor's
  // `by: 'editor'` rows included) is never touched: only the generated table is written ----
  const IGNORE = new Set(['SMALL', 'SMALL(tiny car)', 'PROP_HIDES', 'PLATE_LIKE_UNTAGGED']); // (not about where the plate is: SMALL is the surface's choice)
  const badFlags = (m) => (m?.flags || []).filter(f => !IGNORE.has(f));
  const sideScore = (m) => score(badFlags(m));
  const entryArr = (e) => (e ? [e.at[1], e.at[2], e.size[0], e.pitch, ...(e.rough ? [1] : [])] : null);
  const ORIG = opt('--orig', null) ? await import('file://' + opt('--orig')) : null;
  const fixCars = () => {
    const keyOf = (car) => car.model || car.id;
    const isBase = (car) => car.id === keyOf(car) || (!cars.some(c => c.car.id === keyOf(car)) && cars.find(c => keyOf(c.car) === keyOf(car)).car.id === car.id);
    const list = cars.filter(({ car }) => !only.length || only.includes(car.id)).sort((a, b) => (isBase(b.car) ? 1 : 0) - (isBase(a.car) ? 1 : 0));
    const changes = [], kept = [];
    for (const { group, car } of list) {
      const before = auditCar(group, car);
      if (before.status !== 'ok') continue;
      for (const end of ['rear', 'front']) {
        const cur = before.sides[end];
        const plan = A.plateAnchorsFor(car), key = keyOf(car), k = end === 'rear' ? 'r' : 'f';
        const hand = { ...(A.HAND[key] || {}), ...(A.HAND[car.id] || {}) };
        if (k in hand) { if (cur && (badFlags(cur).length || cur.on !== 'bumper')) kept.push({ id: car.id, key, end, arr: entryArr(plan[end]), flags: badFlags(cur), on: cur.on, hand: true }); continue; } // (hand-placed: his, or a reasoned fix)
        if (!cur || (!badFlags(cur).length && (cur.on === 'bumper' || cur.on === 'body'))) continue; // (clean, and on its bar or at an end with none)
        const base = { r: entryArr(plan.rear), f: entryArr(plan.front) };
        // the car's own model, own plates and the cosmetic plate out of the way, searched
        const model = makeShowCar(car); model.parent?.remove(model);
        P.setExistingPlatesVisible(model, false);
        const hubs = model.userData.wheelHubs || {}, wheels = new Set(['tyres', 'hubs', 'parts', 'rings'].flatMap(x => hubs[x] || []));
        const own = P.existingPlates(model).find(o => o.face === end);
        const preferY = own ? new THREE.Box3().setFromObject(own.mesh, true).getCenter(new THREE.Vector3()).y : null;
        const cands = searchPlace(makeView(model, { glassy, wheels }), end, { preferY });
        if (!badFlags(cur).length && !cands.some(c => c.on === 'bumper')) continue; // (clean; its bar takes no plate: it stays on the body)
        // the place the table had before this audit (--orig <table.js>: e.g. git show origin/main:...plateanchorstable.js) is a candidate too
        if (ORIG) { const o = (ORIG.PLATE_VARIANTS[car.id] || ORIG.PLATE_TABLE[key] || {})[k]; if (o) cands.unshift({ y: o[0], z: o[1], w: o[2], pitch: o[3] || 0, orig: true }); }
        const better = (a, b) => { // (fewer placement flags; as few: onto a bar from the body; as few and the same kind: the bigger plate)
          if (a.score !== b.score) return a.score < b.score;
          if ((a.on === 'bumper') !== (b.on === 'bumper')) return a.on === 'bumper';
          return !!a.arr && !!b.arr && a.arr[2] > b.arr[2];
        };
        const had = TABLE.PLATE_VARIANTS[car.id];
        let best = null;
        for (const c of cands.slice(0, 9)) {
          const arr = [r3(c.y), r3(c.z), c.w, Math.round(c.pitch * 10) / 10];
          TABLE.PLATE_VARIANTS[car.id] = { ...base, [k]: arr };
          const r = auditCar(group, car);
          const m = r.sides[end];
          const sc = m ? sideScore(m) : 99;
          const it = { arr, score: sc, flags: badFlags(m), cand: c, on: m?.on };
          if (process.env.PLATE_DEBUG) console.log('    candidate ' + JSON.stringify(arr) + ' ' + it.on + ' [' + (m?.flags || []).join(' ') + ']');
          if (!best || better(it, best)) best = it;
        }
        if (had) TABLE.PLATE_VARIANTS[car.id] = had; else delete TABLE.PLATE_VARIANTS[car.id];
        const was = { arr: base[k], score: sideScore(cur), flags: badFlags(cur), on: cur.on };
        if (best && better(best, was) && JSON.stringify(best.arr) !== JSON.stringify(was.arr)) {
          // into the table: a base car's entry is its model's (every car of the model follows); any other car gets a variant of its own
          if (isBase(car) && !had) TABLE.PLATE_TABLE[key] = { ...(TABLE.PLATE_TABLE[key] || base), [k]: best.arr }; // (a car whose own variant row wins over its model's keeps it: written there)
          else TABLE.PLATE_VARIANTS[car.id] = { ...base, [k]: best.arr };
          changes.push({ id: car.id, key, base: isBase(car), end, old: was.arr, new: best.arr, oldOn: was.on, newOn: best.on, oldFlags: was.flags, newFlags: best.flags, oldScore: was.score, newScore: best.score });
          console.log('  ' + car.id + ' ' + end + ': ' + JSON.stringify(was.arr) + ' ' + was.on + ' [' + was.flags.join(' ') + '] -> ' + JSON.stringify(best.arr) + ' ' + best.on + ' [' + best.flags.join(' ') + ']');
        } else {
          kept.push({ id: car.id, key, end, arr: was.arr, flags: was.flags, on: was.on, best: best && { arr: best.arr, flags: best.flags, on: best.on }, candidates: cands.length });
          console.log('  ' + car.id + ' ' + end + ': KEPT ' + JSON.stringify(was.arr) + ' ' + was.on + ' [' + was.flags.join(' ') + ']' + (best ? ' (best found ' + JSON.stringify(best.arr) + ' ' + best.on + ' [' + best.flags.join(' ') + '])' : ' (no place found)'));
        }
      }
    }
    // a variant equal to its base is dropped
    for (const [id, e] of Object.entries(TABLE.PLATE_VARIANTS)) {
      const car = cars.find(c => c.car.id === id)?.car, b = car && TABLE.PLATE_TABLE[keyOf(car)];
      if (b && JSON.stringify(b.r) === JSON.stringify(e.r) && JSON.stringify(b.f) === JSON.stringify(e.f)) delete TABLE.PLATE_VARIANTS[id];
    }
    mkdirSync(OUT, { recursive: true });
    writeFileSync(OUT + '/fix.json', JSON.stringify({ changes, kept }, null, 1));
    console.log(changes.length + ' ends moved, ' + kept.length + ' kept (see ' + OUT + '/fix.json)');
    if (WRITE) {
      const file = new URL('../src/delivery/render/plateanchorstable.js', import.meta.url);
      const old = readFileSync(file, 'utf8');
      const head = old.slice(0, old.indexOf('export const PLATE_TABLE'));
      const fmt = (e) => (e ? '[' + e.join(', ') + ']' : 'null');
      const line = (name, e) => '  ' + (/^[A-Za-z_$][\w$]*$/.test(name) ? name : "'" + name + "'") + ': { r: ' + fmt(e.r) + ', f: ' + fmt(e.f) + ' },';
      const tail = old.slice(old.indexOf('// models that can wear no plate'));
      writeFileSync(file, head + 'export const PLATE_TABLE = {\n' + Object.keys(TABLE.PLATE_TABLE).sort().map(k => line(k, TABLE.PLATE_TABLE[k])).join('\n') + '\n};\nexport const PLATE_VARIANTS = {\n'
        + Object.keys(TABLE.PLATE_VARIANTS).sort().map(k => line(k, TABLE.PLATE_VARIANTS[k])).join('\n') + '\n};\n' + tail);
      console.log('written ' + file.pathname);
    }
  };

  if (FIX) {
    fixCars();
  } else if (BREAK) {
    // ---- the self-test: break a good plate four ways and see the flags fire ----
    const breaks = {
      'into the body 10 cm': (model, g, end) => { const s = end === 'rear' ? -1 : 1; g.position.z -= s * 0.10; },
      'off the surface 10 cm': (model, g, end) => { const s = end === 'rear' ? -1 : 1; g.position.z += s * 0.10; },
      'pitched 20 degrees': (model, g) => { g.rotation.x += 20 * Math.PI / 180; },
      'yawed 20 degrees': (model, g) => { g.rotation.y += 20 * Math.PI / 180; },
      'turned round (facing in)': (model, g) => { g.rotation.y += Math.PI; },
      'mirrored': (model, g) => { g.scale.x = -1; },
      'up 0.6 m (on the glass / lid)': (model, g) => { g.position.y += 0.6; },
    };
    const want = { 'into the body 10 cm': ['BURIED_DEEP', 'BURIED', 'COVERED'], 'off the surface 10 cm': ['FLOATING'], 'pitched 20 degrees': ['TILTED'], 'yawed 20 degrees': ['TILTED'], 'turned round (facing in)': ['FACES_WRONG_WAY'], 'mirrored': ['TEXT_MIRRORED'], 'up 0.6 m (on the glass / lid)': ['ON_GLASS', 'TILTED', 'FLOATING', 'OVER_AIR', 'HIGH', 'COVERED', 'BURIED'] };
    const ids = only.length ? only : ['commuter', 'pickup', 'minivan', 'taxi'];
    let fails = 0;
    for (const id of ids) {
      const e = cars.find(c => c.car.id === id);
      const base = auditCar(e.group, e.car);
      console.log(id + ' as placed: ' + Object.entries(base.sides).map(([end, m]) => end + ' [' + m.flags.join(' ') + ']').join('  '));
      for (const [name, fn] of Object.entries(breaks)) {
        const r = auditCar(e.group, e.car, fn);
        for (const [end, m] of Object.entries(r.sides)) {
          const fresh = m.flags.filter(f => !base.sides[end].flags.includes(f));
          const ok = want[name].some(f => m.flags.includes(f)) && fresh.length > 0; // (a wanted flag, and the break made something new fire)
          if (!ok) fails++;
          console.log('  ' + (ok ? 'ok  ' : 'MISS') + ' ' + id + ' ' + end + ' ' + name + ': ' + (fresh.join(' ') || '(no new flag)') + '  gap p75 ' + m.gapP75 + ' cm, bury ' + m.buryMax + ' cm, tilt ' + m.tilt + ', cover ' + m.coverLevel);
        }
      }
    }
    console.log(fails ? fails + ' BREAKS NOT FLAGGED' : 'every break flagged');
    process.exitCode = fails ? 1 : 0;
  } else {
    const t0 = Date.now();
    for (const { group, car } of cars) {
      if (only.length && !only.includes(car.id)) continue;
      results.push(auditCar(group, car));
    }
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    mkdirSync(OUT, { recursive: true });
    writeFileSync(OUT + '/audit.json', JSON.stringify(results, null, 1));
    const head = ['score', 'id', 'group', 'model', 'status', 'end', 'flags', 'on', 'bars', 'y', 'z', 'w', 'pitch', 'supportW', 'carW', 'gapMed_cm', 'gapP75_cm', 'gapMax_cm', 'buryMax_cm', 'air', 'tilt', 'tiltYaw', 'tiltPitch', 'surfTilt', 'surfDev_cm', 'inside_cm', 'insideLocal_cm', 'supportH', 'coverLevel', 'coverUp', 'coveredBy', 'under', 'zfight', 'propLevel', 'propAbove', 'own', 'notes'];
    const lines = [head.join(',')];
    const q = (v) => '"' + String(v ?? '').replace(/"/g, "'") + '"';
    const rows = [];
    for (const r of results) {
      if (r.status !== 'ok') { rows.push([0, r.id, r.group, r.model, r.status, '', r.error ? 'BUILD_ERROR' : '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', (r.ownPlates || []).join(' '), r.error || '']); continue; }
      for (const [end, m] of Object.entries(r.sides)) {
        rows.push([m.score, r.id, r.group, r.model, r.status, end, (m.flags || []).join(' '), m.on, m.bars, m.at?.[1], m.at?.[2], m.w, m.pitch, m.supportW, m.carW, m.gapMed, m.gapP75, m.gapMax, m.buryMax, m.airFrac, m.tilt, m.tiltYaw, m.tiltPitch, m.surfTilt, m.surfDev, m.inside, m.insideLocal, m.supportH, m.coverLevel, m.coverUp, (m.coverLevelBy || []).join(' | '), JSON.stringify(m.under || {}), m.zfight ? (m.zfight.body || []).map(f => f.with + ' ' + f.gap + 'cm').join(' | ') : '', (m.propLevel || []).join(' | '), (m.propAbove || []).join(' | '), (r.ownPlates || []).join(' '), (m.notes || []).concat(m.platey || []).join(' | ')]);
      }
    }
    rows.sort((a, b) => b[0] - a[0]);
    for (const row of rows) lines.push(row.map((v, i) => (i === 0 || typeof v === 'number' ? v ?? '' : q(v))).join(','));
    writeFileSync(OUT + '/audit.csv', lines.join('\n') + '\n');
    // the summary
    const ok = results.filter(r => r.status === 'ok'), sides = ok.flatMap(r => Object.values(r.sides));
    const count = new Map();
    for (const m of sides) for (const f of m.flags || []) count.set(f, (count.get(f) || 0) + 1);
    const byStatus = {};
    for (const r of results) (byStatus[r.status] ||= []).push(r.id);
    const sum = ['cars audited: ' + results.length + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)',
      ...Object.entries(byStatus).map(([s, ids]) => '  ' + s + ': ' + ids.length + (s === 'ok' ? '' : ' [' + ids.join(', ') + ']')),
      'plate ends measured: ' + sides.length + ', with a flag (any): ' + sides.filter(m => (m.flags || []).length).length + ', with a flag other than SMALL / PROP_HIDES / COVERED_FROM_ABOVE: ' + sides.filter(m => (m.flags || []).some(f => !/^SMALL|^PROP_HIDES|^COVERED_FROM_ABOVE/.test(f))).length,
      'cars with a flag (other than SMALL / PROP_HIDES / COVERED_FROM_ABOVE): ' + ok.filter(r => Object.values(r.sides).some(m => (m.flags || []).some(f => !/^SMALL|^PROP_HIDES|^COVERED_FROM_ABOVE/.test(f)))).length,
      'where: ' + ['bumper', 'above', 'below', 'body'].map(k => k + ' ' + sides.filter(m => m.on === k).length).join(', ') + ' (on a bumper bar\'s face; on the body above / below the end\'s bar; an end with no bar)',
      'flags: ' + [...count].sort((a, b) => b[1] - a[1]).map(([f, n]) => f + ' ' + n).join(', '),
      'worst 30: ' + rows.slice(0, 30).map(r => r[1] + ' ' + r[5] + ' ' + r[0] + ' [' + r[6] + ']').join('; ')];
    writeFileSync(OUT + '/summary.txt', sum.join('\n') + '\n');
    console.log(sum.join('\n'));
    if (only.length) for (const r of results) console.log(JSON.stringify({ id: r.id, status: r.status, anchors: r.anchors, sides: Object.fromEntries(Object.entries(r.sides).map(([e, m]) => [e, { flags: m.flags, on: m.on, bars: m.bars, at: m.at, w: m.w, supportW: m.supportW, gapMed: m.gapMed, gapP75: m.gapP75, buryMax: m.buryMax, air: m.airFrac, tilt: m.tilt, tiltYaw: m.tiltYaw, tiltPitch: m.tiltPitch, surfTilt: m.surfTilt, surfDev: m.surfDev, inside: m.inside, insideLocal: m.insideLocal, supportH: m.supportH, cover: m.coverLevel, coverBy: m.coverLevelBy, coverUp: m.coverUp, coverUpBy: m.coverUpBy, under: m.under, z: m.zfight, propLevel: m.propLevel, propAbove: m.propAbove, platey: m.platey, notes: m.notes }])) }));
  }
} finally {
  await close();
}
