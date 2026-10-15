// ---- the model editor's PLACEMENTS tab (the owner, 15-Oct: "Allow me to edit placements on model editor please. Same goes, I don't want them
// as patches but definitive build commands"). For the car loaded in delivery/modeleditor.html: its ROOF, CARGO and WING prop slots (the
// canonical box / cylinder of render/propanchors.js at the car's uniform scale, centre, yaw and inset, with a real prop of render/propmodels.js
// in it) and its REAR / FRONT number plates (render/plateanchors.js). Moved by direct manipulation (tap the car to put the slot there, drag the
// shape over the surface, or the axis handles: Move, Turn, Size) and by numbers; Snap (onto the surface under it with the least inset that
// makes its rim touch), Fit (the largest scale that stands on the body and touches nothing: scripts/prop-audit-lib.mjs, the generator's own
// search), Reset (the generated row). The chips are the audit's measures, live.
// SAVING IS THE BUILD, NOT A PATCH: "Write to build" sends the change to the dev server (vite.config.js POST /__placements), which writes the
// car's hand row into its propanchors/slice-<n>.json and the plate into plateanchors.js HAND (scripts/placements-lib.mjs); with no dev server
// (the deployed page) the same change file is downloaded or copied for `node scripts/bake-placements.mjs <file>`. Until then an edit is a
// DRAFT: kept in this page (and this browser's localStorage, DRAFT_KEY) for the editor only; the game never reads it.
// RENDER-ONLY: imported by the editor page alone (not in vite.config.js logicFiles: the replay fingerprint is unchanged).
import * as THREE from 'three';
import { PROP_TABLE, HAND, PROP_BOUNDS, MIN_SCALE, SLOTS } from './propanchors.js';
import { PROPS, propById, buildProp, propPaint } from './propmodels.js';
import { boundsWireframe } from './propbounds.js';
import { HAND as PLATE_HAND, HAND_NONE, plateAnchorsFor } from './plateanchors.js';
import { PLATE_TABLE, PLATE_VARIANTS, PLATE_NONE } from './plateanchorstable.js';
import { glassy } from './dents.js';
import { carGeometry, measureShape, dims, volume, overlap, effDepth, feasible, carInfo, footprint, isRim, MAX_INSET, WIDTH_CAP, SEARCH_MAX } from '../../../scripts/prop-audit-lib.mjs';
import { makeView, shoot, fitPlane, blocked, searchPlace } from '../../../scripts/plate-search.mjs';

export const DRAFT_KEY = 'delivery.modeleditor.placementDrafts'; // (the editor's own drafts: never read by the game)
export const DEFAULT_PROP = { roof: 'roofbox', cargo: 'cargocrates', wing: 'winggt' };
const TABS = [...SLOTS, 'plate'];
const EDGE = 0.01; // m: the plate's rays this far in from its edge (the plate search lets a plate overhang its band by 9 mm: scripts/plate-search.mjs OVERHANG)
const NAMES = { roof: 'Roof', cargo: 'Cargo', wing: 'Wing', plate: 'Plates' };
const r3 = (v) => Math.round(v * 1000) / 1000, r2 = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const shapeOf = (propId) => (propById(propId)?.shape === 'cylinder' ? 'cyl' : 'box');
const heightOf = (slot, sh) => { const B = PROP_BOUNDS[slot]; return sh === 'box' ? B.box[1] : B.cylinder.axis === 'y' ? B.cylinder.height : 2 * B.cylinder.radius; };
const loadDrafts = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; } catch { return {}; } };

// the rows as the build has them now (the reader's merge: a hand row wins over the generated one)
export const buildRow = (carId, slot) => (HAND[carId] && slot in HAND[carId] ? HAND[carId][slot] : PROP_TABLE[carId]?.[slot] || null);
export const generatedRow = (carId, slot) => PROP_TABLE[carId]?.[slot] || null;
// a car's plates as the game shows them: { r: [y, z, w, pitch] | null, f } (an end the game does not use is null)
const endOf = (plan, end) => (plan[end] && plan.ends.includes(end) ? [r3(plan[end].at[1]), r3(plan[end].at[2]), r3(plan[end].size[0]), Math.round(plan[end].pitch * 10) / 10] : null);
export const buildPlates = (car) => { const p = plateAnchorsFor(car); return { r: endOf(p, 'rear'), f: endOf(p, 'front') }; };
export const plateKeyOf = (car) => (PLATE_VARIANTS[car.id] || PLATE_HAND[car.id] ? car.id : car.model || car.id);
const generatedPlates = (car) => { const b = PLATE_VARIANTS[car.id] || PLATE_TABLE[car.model || car.id] || {}; return { r: b.r ? b.r.slice(0, 4) : null, f: b.f ? b.f.slice(0, 4) : null }; };

export const createPlacements = (ctx) => {
  const params = new URLSearchParams(location.search);
  const P = {
    on: false, tab: TABS.includes(params.get('slot')) ? params.get('slot') : 'wing', end: params.get('end') === 'front' ? 'front' : 'rear',
    prop: { ...DEFAULT_PROP }, lockX: true, both: true, tool: 'drag', drafts: loadDrafts(), hist: [], at: -1,
    g: null, gModel: null, view: null, server: null, last: null, diff: null, busy: '',
  };
  if (params.get('prop') && propById(params.get('prop'))) for (const s of SLOTS) if (PROPS[s].some(p => p.id === params.get('prop'))) P.prop[s] = params.get('prop');
  const car = () => ctx.getCar(), model = () => ctx.getModel();
  const draftOf = () => (P.drafts[car().id] ||= {});
  const saveDrafts = () => {
    for (const [id, d] of Object.entries(P.drafts)) if (!d || !Object.keys(d).length) delete P.drafts[id];
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(P.drafts)); } catch { /* (no storage: the draft lasts as long as the page) */ }
  };
  // the row being edited: the draft, else the build's
  const rowOf = (slot) => { const d = draftOf()[slot]; return d ? (d.reset ? generatedRow(car().id, slot) : d) : buildRow(car().id, slot); };
  const platesOf = () => { const d = draftOf().plate; return d ? (d.reset ? generatedPlates(car()) : d) : buildPlates(car()); };
  const plateBlocked = () => (car().legend ? 'Legendary: keeps its gold plates' : car().ufo || PLATE_NONE.includes(car().model || car().id) ? 'This vehicle takes no plate' : null);
  // drafts that are what the build already says are no drafts
  const tidy = () => {
    const d = draftOf();
    for (const s of SLOTS) if (d[s] && (d[s].reset ? !(HAND[car().id] && s in HAND[car().id]) : same(strip(d[s]), strip(buildRow(car().id, s))))) delete d[s];
    if (d.plate && (d.plate.reset ? !PLATE_HAND[plateKeyOf(car())] : same(d.plate, buildPlates(car())))) delete d.plate;
  };
  const strip = (r) => { if (!r) return r; const { prev, by, lim, conf, ...rest } = r; void prev; void by; void lim; void conf; if (rest.inset && rest.inset.every(v => !v)) delete rest.inset; return rest; };

  // ---- history (the draft's own undo; the top bar's Undo / Redo while the tab is open) ----
  const snap = () => JSON.stringify(draftOf());
  const push = () => { P.hist = P.hist.slice(0, P.at + 1); P.hist.push(snap()); if (P.hist.length > 100) P.hist.shift(); P.at = P.hist.length - 1; ctx.syncUndo?.(); };
  const undo = (dir) => {
    const to = P.at + dir;
    if (to < 0 || to >= P.hist.length) return;
    P.at = to; P.drafts[car().id] = JSON.parse(P.hist[to]); saveDrafts(); refresh(); ctx.syncUndo?.();
    ctx.status(dir < 0 ? 'Undone.' : 'Redone.');
  };
  const canUndo = (dir) => (dir < 0 ? P.at > 0 : P.at < P.hist.length - 1);
  const change = (fn, words) => { fn(draftOf()); tidy(); saveDrafts(); push(); refresh(); if (words) ctx.status(words); };

  // ---- the car's surface (scripts/prop-audit-lib.mjs carGeometry; the equipped cosmetics and the lamp effects left out) ----
  const geom = () => {
    if (P.g && P.gModel === model()) return P.g;
    const m = model(), off = [];
    m.traverse((n) => { if ((n.userData.platecosmetic || n.userData.propCosmetic) && n.visible) { n.visible = false; off.push(n); } });
    try { ctx.withoutFx(() => { P.g = carGeometry(m, glassy); P.view = makeView(m, { glassy }); }); } finally { for (const n of off) n.visible = true; }
    P.gModel = m; P.info = carInfo(P.g);
    return P.g;
  };
  const allowFor = (slot) => (mi) => P.g.meshes[mi].tag !== slot;

  // ---- the shapes in the view ----
  const group = new THREE.Group();
  group.name = 'placements';
  group.visible = false;
  ctx.scene.add(group);
  const proxy = new THREE.Object3D(); // (what the axis handles move: the active slot's or plate's place)
  ctx.scene.add(proxy);
  const ACTIVE = propPaint(0xff8a1f), IDLE = propPaint(0xb7bec9);
  const PLATE_MAT = new THREE.MeshBasicMaterial({ color: 0xf4f1e6, side: THREE.DoubleSide }), PLATE_ON = new THREE.LineBasicMaterial({ color: 0xffd23f, depthTest: false }), PLATE_OFF = new THREE.LineBasicMaterial({ color: 0x5a6678, depthTest: false });
  const dispose = (o) => o.traverse((n) => { if (n.geometry) n.geometry.dispose(); });
  const placedOf = (slot, row, sh) => { const a = row[sh], ins = row.inset?.[sh === 'box' ? 0 : 1] || 0; return { x: a[1], y: a[2] - ins, z: a[3], yaw: a[4] || 0, s: a[0] }; };
  const draw = () => {
    for (const c of [...group.children]) { group.remove(c); dispose(c); }
    if (!P.on || !model()) return;
    for (const slot of P.tab === 'plate' ? [] : SLOTS) { // (the Plates tab: the car as it is, plates only)
      const row = rowOf(slot);
      if (!row || row.no) continue;
      const active = P.tab === slot, sh = shapeOf(P.prop[slot]), at = placedOf(slot, row, sh);
      const g = new THREE.Group();
      g.userData.slot = slot;
      const prop = buildProp(P.prop[slot], active ? ACTIVE : IDLE);
      g.add(prop);
      if (active) { const w = boundsWireframe(slot, sh === 'box' ? 'box' : 'cylinder'); w.traverse(n => { if (n.material) { n.material = n.material.clone(); n.material.depthTest = false; } }); g.add(w); }
      g.position.set(at.x, at.y, at.z); g.rotation.y = at.yaw * Math.PI / 180; g.scale.setScalar(at.s);
      group.add(g);
    }
    if (P.tab === 'plate' && !plateBlocked()) {
      const pl = platesOf();
      for (const [end, e] of [['rear', pl.r], ['front', pl.f]]) {
        if (!e) continue;
        const [y, z, w, pitch] = e, h = w / 4, s = end === 'rear' ? -1 : 1, g = new THREE.Group();
        const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), PLATE_MAT);
        if (end === 'rear') face.rotation.y = Math.PI;
        face.position.z = s * 0.006;
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.012)), P.end === end ? PLATE_ON : PLATE_OFF);
        edge.renderOrder = 12;
        g.add(face, edge);
        g.userData.end = end;
        g.position.set(0, y, z); g.rotation.x = pitch * Math.PI / 180;
        group.add(g);
      }
    }
    syncProxy();
  };
  // the axis handles: on the active place (none while dragging over the surface)
  const syncProxy = () => {
    const gz = ctx.gizmo;
    if (!P.on || P.tool === 'drag') { if (gz.object === proxy) gz.detach(); return; }
    let at = null;
    if (P.tab === 'plate') { const e = platesOf()[P.end === 'rear' ? 'r' : 'f']; if (e && !plateBlocked()) at = { x: 0, y: e[0], z: e[1], pitch: e[3], s: e[2] }; }
    else { const row = rowOf(P.tab); if (row && !row.no) at = placedOf(P.tab, row, shapeOf(P.prop[P.tab])); }
    if (!at) { gz.detach(); return; }
    proxy.position.set(at.x, at.y, at.z);
    proxy.rotation.set(P.tab === 'plate' ? at.pitch * Math.PI / 180 : 0, P.tab === 'plate' ? 0 : at.yaw * Math.PI / 180, 0);
    proxy.scale.setScalar(at.s);
    proxy.updateMatrixWorld(true);
    if (gz.object !== proxy) gz.attach(proxy);
    gz.setMode(P.tool === 'move' ? 'translate' : P.tool === 'turn' ? 'rotate' : 'scale');
    gz.setSpace('local');
    const plate = P.tab === 'plate';
    gz.showX = P.tool === 'move' ? !plate && !P.lockX : P.tool === 'turn' ? plate : P.tool === 'size' ? false : true;
    gz.showY = P.tool === 'turn' ? !plate : true;
    gz.showZ = P.tool === 'turn' ? false : P.tool === 'size' ? false : true;
    gz.setSize(ctx.coarse ? 1.5 : 1);
  };
  // a handle let go: the proxy's place into the draft
  const fromProxy = (final) => {
    if (P.tab === 'plate') {
      const k = P.end === 'rear' ? 'r' : 'f', pl = clone(platesOf()), e = pl[k];
      if (!e) return;
      const w = Math.max(0.15, Math.min(1.2, proxy.scale.y));
      pl[k] = [r3(proxy.position.y), r3(proxy.position.z), r3(w), Math.round(proxy.rotation.x * 180 / Math.PI * 10) / 10];
      if (final) change(d => { d.plate = pl; }, NAMES.plate + ' ' + P.end + ' set.'); else { draftOf().plate = pl; draw(); }
      return;
    }
    const slot = P.tab, sh = shapeOf(P.prop[slot]), row = clone(rowOf(slot));
    if (!row || row.no) return;
    const i = sh === 'box' ? 0 : 1, ins = row.inset?.[i] || 0;
    const s = Math.max(MIN_SCALE[slot], P.tool === 'size' ? proxy.scale.y : row[sh][0]);
    if (P.tool === 'size') setShape(row, slot, sh, { s: r2(s) }); // (sized about its base: it stays standing)
    else setShape(row, slot, sh, { x: P.lockX ? 0 : r3(proxy.position.x), y: r3(proxy.position.y + ins), z: r3(proxy.position.z), yaw: Math.round(proxy.rotation.y * 180 / Math.PI) });
    if (final) change(d => { d[slot] = row; }, NAMES[slot] + ' set.'); else { draftOf()[slot] = row; draw(); measureSoon(); }
  };
  ctx.gizmo.addEventListener('objectChange', () => { if (P.on && ctx.gizmo.object === proxy) fromProxy(false); });
  ctx.gizmo.addEventListener('dragging-changed', (e) => { if (P.on && ctx.gizmo.object === proxy && !e.value) fromProxy(true); });

  // set the active shape's numbers; with "Box + cyl" on, the other shape follows (same scale, x, z, turn, base and inset)
  const setShape = (row, slot, sh, v) => {
    const i = sh === 'box' ? 0 : 1, a = row[sh];
    const y = v.y ?? (v.s != null ? r3(a[2] - heightOf(slot, sh) * a[0] / 2 + heightOf(slot, sh) * v.s / 2) : a[2]); // (a new scale keeps the base where it stands)
    const next = [v.s ?? a[0], v.x ?? a[1], y, v.z ?? a[3], v.yaw ?? (a[4] || 0)];
    row[sh] = next;
    row.inset = (row.inset || [0, 0]).slice();
    if (v.inset != null) row.inset[i] = r3(Math.max(0, v.inset));
    if (P.both) {
      const o = sh === 'box' ? 'cyl' : 'box', base = next[2] - heightOf(slot, sh) * next[0] / 2;
      row[o] = [next[0], next[1], r3(base + heightOf(slot, o) * next[0] / 2), next[3], next[4]];
      row.inset[1 - i] = row.inset[i];
    }
    for (const k of ['box', 'cyl']) if (!row[k][4]) row[k] = row[k].slice(0, 4);
    return row;
  };

  // ---- the measures (the audit's: scripts/prop-audit-lib.mjs measureShape, overlap, widthAt) ----
  const measure = (slot) => {
    const row = rowOf(slot);
    if (!row || row.no || !model()) return null;
    const g = geom(), sh = shapeOf(P.prop[slot]), [s, x, y, z] = row[sh], ins = row.inset?.[sh === 'box' ? 0 : 1] || 0, B = PROP_BOUNDS[slot];
    const m = measureShape(g, B, slot, sh, s, x, y, z, ins, allowFor(slot));
    const chips = [];
    const cm = (v) => Math.round(v * 100);
    const base0 = y - m.d.H / 2; // (the base before the inset: on the highest point under it)
    if (m.top == null) chips.push(['bad', 'nothing under it']);
    else {
      const float = base0 - m.top;
      if (float > 0.015) chips.push(['bad', 'floats ' + cm(float) + ' cm']);
      if (m.need > ins + 0.01) chips.push(['warn', 'rim off ' + cm(m.need - ins) + ' cm']);
    }
    chips.push([ins > MAX_INSET + 0.005 ? 'warn' : 'ok', 'inset ' + cm(ins) + ' cm']);
    const depth = effDepth(g, m.intr);
    if (depth > 0.01) { const kinds = [...new Set([...m.intr.meshes].filter(([, d]) => d > 0.01).map(([mi]) => g.meshes[mi].tag ? g.meshes[mi].tag + ' prop' : g.meshes[mi].kind))]; chips.push(['bad', 'clips ' + cm(depth) + ' cm: ' + kinds.join(', ')]); }
    for (const k of ['glass', 'lamp', 'clear']) if (m.kinds[k]) chips.push(['bad', 'on ' + (k === 'clear' ? 'see-through' : k)]);
    if (m.kinds.kit) chips.push(['warn', 'on body kit']);
    if (m.air > (slot === 'wing' ? 0.4 : 0.25)) chips.push(['warn', Math.round(m.air * 100) + '% over air']);
    const vol = volume(m.d, x, m.base, z);
    for (const o of SLOTS) {
      if (o === slot) continue;
      const ro = rowOf(o);
      if (!ro || ro.no) continue;
      const so = shapeOf(P.prop[o]), a = ro[so], d2 = dims(PROP_BOUNDS[o], so, a[0]), b2 = a[2] - d2.H / 2 - (ro.inset?.[so === 'box' ? 0 : 1] || 0);
      if (overlap(vol, volume(d2, a[1], b2, a[3])) > 0) chips.push(['bad', 'hits ' + NAMES[o].toLowerCase()]);
    }
    if (slot === 'wing' && m.top != null) {
      const sw = g.widthAt(z, m.top - 0.15, allowFor(slot)).w;
      if (sw > 0) { const pct = Math.round(m.d.W / sw * 100); chips.push([pct > 100 ? 'bad' : pct > WIDTH_CAP * 100 ? 'warn' : 'ok', 'width ' + pct + '%']); }
    }
    chips.push([s < MIN_SCALE[slot] - 1e-9 ? 'bad' : 'ok', '×' + s.toFixed(2)]);
    if (!chips.some(c => c[0] === 'bad')) chips.unshift(['good', 'fits']);
    return { chips, m };
  };
  const plateMeasure = (end) => {
    const e = platesOf()[end === 'rear' ? 'r' : 'f'];
    if (!e || !model()) return null;
    geom();
    const [y, z, w, pitch] = e, h = w / 4, s = end === 'rear' ? -1 : 1, rows = [], kinds = {};
    let miss = 0;
    for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) {
      const x = -(w / 2 - EDGE) + (w - 2 * EDGE) * i / 6, dy = -(h / 2 - EDGE) + (h - 2 * EDGE) * j / 2, hit = shoot(P.view, end, x, y + dy);
      if (!hit) { miss++; continue; }
      kinds[hit.kind] = (kinds[hit.kind] || 0) + 1;
      rows.push([x, dy, hit.z]);
    }
    const chips = [], cm = (v) => Math.round(v * 100);
    const f = rows.length >= 6 ? fitPlane(rows) : null;
    if (miss > 3) chips.push(['bad', 'off the body']);
    if (f) {
      const dev = f.dev * 1000;
      chips.push([dev > 12 ? 'bad' : dev > 6 ? 'warn' : 'ok', (dev > 6 ? 'uneven ' : 'flat ') + Math.round(dev) + ' mm']);
      const gap = (z - f.a) * s; // (+: stands out from the surface; -: sunk into it)
      if (gap > 0.015) chips.push(['bad', 'floats ' + cm(gap) + ' cm']);
      if (gap < -0.015) chips.push(['bad', 'sunk ' + cm(-gap) + ' cm']);
      const lean = Math.atan(f.b) * 180 / Math.PI;
      if (Math.abs(lean - pitch) > 4) chips.push(['warn', 'tilt off ' + Math.round(Math.abs(lean - pitch)) + '°']);
    }
    for (const k of ['glass', 'lamp', 'wheel']) if (kinds[k]) chips.push(['bad', 'on ' + k]);
    const N = new THREE.Vector3(0, -s * Math.tan(pitch * Math.PI / 180), s).normalize(), p = new THREE.Vector3(0, y, z).addScaledVector(N, 0.01);
    if (blocked(P.view, p, N)) chips.push(['bad', 'hidden']);
    chips.push(['ok', Math.round(w * 100) + ' cm wide']);
    if (!chips.some(c => c[0] === 'bad')) chips.unshift(['good', 'fits']);
    return { chips, f };
  };
  let measureTimer = 0;
  const measureSoon = () => { if (measureTimer) return; measureTimer = setTimeout(() => { measureTimer = 0; renderChips(); }, 120); };

  // ---- Snap, Fit, Reset ----
  const snapSlot = (slot, row) => { // onto the surface under it: the base on the highest point of the car's body under the footprint, sunk by the least inset that makes its rim touch
    const g = geom(), sh = shapeOf(P.prop[slot]), [s, x, y, z] = row[sh], d = dims(PROP_BOUNDS[slot], sh, s);
    const body = (mi) => g.meshes[mi].tag !== slot && g.meshes[mi].kind === 'body'; // (never glass, a lamp, the kit: the generator's rule)
    const ceil = y + d.H / 2 + 0.05; // (down from the shape's own top: a sunk one comes up, a floating one comes down)
    let top = -Infinity, low = Infinity;
    for (const [fx, fz] of footprint(d, slot)) {
      const h = g.support(x + fx * d.W / 2, z + fz * d.D / 2, ceil, body);
      if (!h) continue;
      top = Math.max(top, h.y);
      if (isRim(d, slot, fx, fz)) low = Math.min(low, h.y);
    }
    if (top === -Infinity) return false;
    setShape(row, slot, sh, { y: r3(top + d.H / 2), inset: low === Infinity ? 0 : Math.min(0.3, top - low) });
    return true;
  };
  const fitSlot = (slot, row) => { // the largest scale that stands on the body there, touches nothing and no other slot (the generator's rules)
    const g = geom(), sh = shapeOf(P.prop[slot]), a = row[sh], info = P.info, allow = allowFor(slot);
    const avoid = [];
    for (const o of SLOTS) { if (o === slot) continue; const ro = rowOf(o); if (!ro || ro.no) continue; for (const k of ['box', 'cyl']) { const d2 = dims(PROP_BOUNDS[o], k, ro[k][0]); avoid.push(volume(d2, ro[k][1], ro[k][2] - d2.H / 2 - (ro.inset?.[k === 'box' ? 0 : 1] || 0), ro[k][3])); } }
    const topAt = (z) => { const h = g.rays(0, z, allow).find(q => q.ny > 0.05 && g.meshes[q.m].kind !== 'clear'); return h ? h.y : -Infinity; };
    const level = slot === 'wing' ? (yy, zz) => yy >= Math.max(0.45, info.hasGlass ? info.rearGlassFoot - 0.2 : info.height * 0.45) && yy >= topAt(zz) - 0.03
      : slot === 'roof' ? (yy) => yy >= info.roofFloor : (yy) => yy > 0.2 && yy < info.bodyTop - 0.25;
    const o = { slot, shape: sh, B: PROP_BOUNDS[slot], x: P.lockX ? 0 : a[1], level, maxInset: MAX_INSET, allow, avoid, noBlades: slot === 'wing', airRows: slot === 'wing', widthCap: slot === 'wing' ? WIDTH_CAP : null };
    let found = null;
    for (const dz of [0, -0.04, 0.04, -0.08, 0.08, -0.12, 0.12, -0.2, 0.2, -0.3, 0.3]) { // (where it is first, then a little either way)
      const z = a[3] + dz;
      let hit = null;
      for (let s = SEARCH_MAX[slot]; s >= MIN_SCALE[slot] - 1e-9; s = Math.round((s - 0.05) * 100) / 100) {
        if (found && s <= found.s) break; // (no bigger than what is found already)
        hit = feasible(g, o, s, z);
        if (hit) break;
      }
      if (hit) {
        for (let s2 = Math.round((hit.s + 0.04) * 100) / 100; s2 > hit.s; s2 = Math.round((s2 - 0.01) * 100) / 100) { const f2 = feasible(g, o, s2, z); if (f2) { hit = f2; break; } }
        if (!found || hit.s > found.s) found = hit;
      }
      if (found && dz === 0) break;
    }
    if (!found) return false;
    setShape(row, slot, sh, { s: found.s, x: found.x, y: r3(found.y), z: r3(found.z), inset: found.inset });
    return true;
  };
  const freshRow = (slot) => { // a slot turned on that had no place: a small shape over the car where the slot goes, then snapped
    const g = geom(), info = P.info, s = MIN_SCALE[slot] + 0.2, z = slot === 'roof' ? (info.glassMinZ < Infinity ? info.glassMinZ + 0.6 : 0) : slot === 'wing' ? info.tail + 0.3 : info.tail + 0.7;
    const row = { box: [s, 0, info.height + 0.5, r3(z)], cyl: [s, 0, info.height + 0.5, r3(z)], from: slot === 'cargo' ? 'deck' : slot === 'roof' ? 'roof' : 'deck' };
    void g;
    setShape(row, slot, 'box', {}); snapSlot(slot, row);
    return row;
  };
  const snapPlate = (end, pl) => {
    const k = end === 'rear' ? 'r' : 'f', e = pl[k];
    if (!e) return false;
    geom();
    const [y, , w] = e, h = w / 4, rows = [];
    for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { const x = -(w / 2 - EDGE) + (w - 2 * EDGE) * i / 6, dy = -(h / 2 - EDGE) + (h - 2 * EDGE) * j / 2, hit = shoot(P.view, end, x, y + dy); if (hit) rows.push([x, dy, hit.z]); }
    const f = rows.length >= 6 ? fitPlane(rows) : null;
    if (!f) return false;
    pl[k] = [e[0], r3(f.a), e[2], Math.round(Math.atan(f.b) * 1800 / Math.PI) / 10];
    return true;
  };
  const fitPlate = (end, pl) => { geom(); const best = searchPlace(P.view, end, { keep: 1 })[0]; if (!best) return false; pl[end === 'rear' ? 'r' : 'f'] = [r3(best.y), r3(best.z), r3(best.w), Math.round(best.pitch * 10) / 10]; return true; };

  // ---- writing: the change file, the dev server, the fallback ----
  const changes = () => {
    const d = draftOf(), out = [];
    for (const slot of SLOTS) if (d[slot]) out.push(d[slot].reset ? { kind: 'prop', car: car().id, slot, reset: true } : { kind: 'prop', car: car().id, slot, row: rowForWrite(slot, d[slot]) });
    if (d.plate) out.push(d.plate.reset ? { kind: 'plate', key: plateKeyOf(car()), reset: true } : { kind: 'plate', key: plateKeyOf(car()), row: { r: d.plate.r, f: d.plate.f } });
    return out;
  };
  const rowForWrite = (slot, row) => {
    if (row.no) return { no: row.no };
    const out = { box: row.box, cyl: row.cyl, from: row.from };
    if (slot === 'wing') { const m = measure(slot)?.m; if (m && m.top != null) out.from = m.top >= P.info.roofFloor - 0.02 && P.info.hasGlass ? 'roof-edge' : m.air > 0 ? 'deck-edge' : 'deck'; }
    out.from ||= slot === 'roof' ? 'roof' : 'deck';
    if (row.inset && row.inset.some(v => v > 0)) out.inset = row.inset;
    return out;
  };
  const file = (list = changes()) => ({ placements: 1, car: car().id, changes: list });
  const post = async (body) => {
    const res = await fetch('/__placements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || 'refused');
    return out;
  };
  // the build's rows in this page follow a write at once (the dev server does not reload the page for its own write)
  const adopt = (results) => {
    let reload = false;
    for (const r of results) {
      if (r.kind === 'prop') {
        const h = HAND[r.id] ||= {};
        if (r.stored) h[r.slot] = r.stored; else { delete h[r.slot]; if (!Object.keys(h).length) delete HAND[r.id]; }
      } else {
        if (r.stored) PLATE_HAND[r.id] = r.stored; else delete PLATE_HAND[r.id];
        if (HAND_NONE.includes(r.id)) reload = true; // (the no-plate list is read once, at load)
      }
    }
    if (reload) location.reload();
  };
  const write = async (list, words) => {
    if (!list.length) return;
    P.busy = 'Writing...'; renderPanel();
    try {
      const out = await post(file(list));
      adopt(out.results);
      const d = draftOf();
      for (const r of out.results) { if (r.kind === 'prop') delete d[r.slot]; else delete d.plate; }
      tidy(); saveDrafts(); push();
      P.last = out; P.diff = null; P.busy = '';
      ctx.status(words + ' ' + out.files.join(', ') + (out.files.length ? '' : '(no change)'));
    } catch (err) { P.busy = ''; ctx.status('Not written: ' + err.message, true); }
    refresh();
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file(), null, 1) + '\n'], { type: 'application/json' }));
    a.download = 'placements-' + car().id + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ctx.status('Downloaded ' + a.download + '. Bake: node scripts/bake-placements.mjs ' + a.download);
  };
  const probe = () => fetch('/__placements').then(r => r.json()).then(j => { P.server = !!j.ok; }, () => { P.server = false; }).finally(renderPanel);

  // ---- the panel ----
  const root = ctx.root;
  const chipHtml = (chips) => '<div class="chips">' + chips.map(([k, t]) => '<span class="chip ' + k + '">' + esc(t) + '</span>').join('') + '</div>';
  const field = (id, label, v, step, opts = '') => '<label class="pf"><span>' + label + '</span><input type="number" inputmode="decimal" data-f="' + id + '" step="' + step + '" value="' + v + '"' + opts + '></label>';
  const editorRowNow = () => (P.tab === 'plate' ? PLATE_HAND[plateKeyOf(car())]?.by === 'editor' : buildRow(car().id, P.tab)?.by === 'editor');
  const pendingLine = () => {
    const d = draftOf(), names = [...SLOTS.filter(s => d[s]).map(s => NAMES[s]), ...(d.plate ? ['Plates'] : [])];
    return names;
  };
  const renderChips = () => {
    const box = root.querySelector('#plChips');
    if (!box) return;
    if (P.tab === 'plate') { if (plateBlocked()) { box.innerHTML = ''; return; } const m = plateMeasure(P.end); box.innerHTML = m ? chipHtml(m.chips) : ''; return; }
    const m = measure(P.tab);
    box.innerHTML = m ? chipHtml(m.chips) : '';
  };
  const renderPanel = () => {
    if (!P.on || !car()) return;
    const tabs = '<div class="seg big plTabs" role="group" aria-label="Slot">' + TABS.map(t => '<button data-pt="' + t + '" class="' + (P.tab === t ? 'on' : '') + (t === 'plate' ? (draftOf().plate ? ' dirty' : '') : draftOf()[t] ? ' dirty' : '') + '">' + NAMES[t] + '</button>').join('') + '</div>';
    const body = P.tab === 'plate' ? platePanel() : slotPanel(P.tab);
    const pend = pendingLine(), list = changes();
    const writeBox = '<div class="plWrite">'
      + (pend.length ? '<p class="kv"><b>Unsaved:</b> ' + esc(pend.join(', ')) + ' <span class="small">(a draft: the game does not see it)</span></p>'
        + '<pre class="json plRow">' + esc(list.map(c => (c.kind === 'prop' ? c.slot : 'plate ' + c.key) + ': ' + (c.reset ? 'reset to generated' : JSON.stringify(c.row))).join('\n')) + '</pre>' : '<p class="kv">Saved: the build has it.</p>')
      + '<div class="buttons">'
      + (P.server ? '<button id="plWrite" class="primary"' + (pend.length && !P.busy ? '' : ' disabled') + '>' + (P.busy || 'Write to build') + '</button><button id="plDiff"' + (pend.length ? '' : ' disabled') + '>Diff</button>'
        : '<button id="plDown" class="primary"' + (pend.length ? '' : ' disabled') + '>Download</button><button id="plCopy"' + (pend.length ? '' : ' disabled') + '>Copy</button>')
      + '<button id="plDrop"' + (pend.length ? '' : ' disabled') + '>Discard</button>'
      + (P.server && editorRowNow() ? '<button id="plUndoW" title="Put back the row this write replaced (its prev)">Undo write</button>' : '')
      + '</div>'
      + (P.server === false ? '<p class="kv">No dev server: bake with <code>node scripts/bake-placements.mjs placements-' + esc(car().id) + '.json</code></p>' : '')
      + (P.diff ? '<pre class="json plDiff">' + esc(P.diff) + '</pre>' : '')
      + (P.last && !P.diff ? '<details class="plLast"><summary>Last write: ' + esc(P.last.files.join(', ') || 'no change') + '</summary><pre class="json">' + esc(P.last.diff || '') + '</pre></details>' : '')
      + '</div>';
    root.innerHTML = tabs + body + writeBox;
    wire();
    renderChips();
  };
  const slotPanel = (slot) => {
    const row = rowOf(slot), on = row && !row.no, sh = shapeOf(P.prop[slot]);
    const opts = PROPS[slot].map(p => '<option value="' + p.id + '"' + (p.id === P.prop[slot] ? ' selected' : '') + '>' + esc(p.name) + (p.shape === 'cylinder' ? ' (cyl)' : '') + '</option>').join('');
    let h = '<div class="plHead"><label class="pf wide"><span>Prop</span><select id="plProp">' + opts + '</select></label>'
      + '<button data-on="0" class="lockBtn" title="Lock the slot: no prop for this car">Lock</button></div>';
    if (!on) {
      const mine = !!draftOf()[slot]; // (locked in this draft: the reason can be typed)
      return '<div class="locked"><span class="chip warn">Locked</span> ' + (mine ? '<input id="plWhy" value="' + esc(row?.no || '') + '" placeholder="why">' : '<span class="why">' + esc(row?.no || 'no entry') + '</span>') + '</div>'
        + '<div class="buttons big"><button data-on="1" title="Give this slot a place">Unlock</button></div>' + resetRow(slot);
    }
    const a = row[sh], ins = row.inset?.[sh === 'box' ? 0 : 1] || 0;
    h += '<div id="plChips"></div>'
      + '<div class="pgrid">' + field('x', 'X', a[1], 0.01, P.lockX ? ' disabled' : '') + field('y', 'Y', a[2], 0.01) + field('z', 'Z', a[3], 0.01)
      + field('yaw', 'Turn °', a[4] || 0, 5) + field('s', 'Scale', a[0], 0.05, ' min="' + MIN_SCALE[slot] + '"') + field('inset', 'Inset cm', Math.round(ins * 1000) / 10, 0.5, ' min="0"') + '</div>'
      + '<div class="plChecks"><label class="check"><input type="checkbox" id="plLock"' + (P.lockX ? ' checked' : '') + '><span>Centred (X 0)</span></label>'
      + '<label class="check"><input type="checkbox" id="plBoth"' + (P.both ? ' checked' : '') + '><span>Box + cyl together</span></label><span class="small">' + (sh === 'box' ? 'box' : 'cylinder') + ' row</span></div>'
      + '<div class="buttons big"><button id="plSnap">Snap</button><button id="plFit">Fit max</button></div>' + resetRow(slot);
    return h;
  };
  const resetRow = (slot) => {
    const gen = generatedRow(car().id, slot), hand = HAND[car().id] && slot in HAND[car().id];
    return '<div class="buttons"><button id="plReset"' + (hand || draftOf()[slot] ? '' : ' disabled') + ' title="The generated row: ' + esc(gen ? (gen.no ? 'off (' + gen.no + ')' : 'scale ' + gen.box[0]) : 'none') + '">Reset to generated</button>'
      + (hand ? '<span class="small">build: hand row' + (HAND[car().id][slot].by === 'editor' ? ' (yours)' : '') + '</span>' : '<span class="small">build: generated</span>') + '</div>';
  };
  const platePanel = () => {
    const why = plateBlocked();
    if (why) return '<p class="kv">' + esc(why) + '.</p>';
    const pl = platesOf(), k = P.end === 'rear' ? 'r' : 'f', e = pl[k], key = plateKeyOf(car());
    const shared = (ctx.roster || []).filter(c => c.id !== car().id && plateKeyOf(c) === key && !c.legend).map(c => c.name);
    let h = '<div class="plHead"><span class="seg big" role="group" aria-label="End"><button data-end="rear" class="' + (P.end === 'rear' ? 'on' : '') + '">Rear</button><button data-end="front" class="' + (P.end === 'front' ? 'on' : '') + '">Front</button></span>'
      + '<span class="seg big" role="group" aria-label="Plate"><button data-pon="1" class="' + (e ? 'on' : '') + '">On</button><button data-pon="0" class="' + (e ? '' : 'on') + '">Off</button></span></div>';
    if (e) h += '<div id="plChips"></div><div class="pgrid">' + field('py', 'Y', e[0], 0.01) + field('pz', 'Z', e[1], 0.005) + field('pw', 'Width', e[2], 0.02, ' min="0.15" max="1.2"') + field('pp', 'Tilt °', e[3], 1) + '</div>'
      + '<div class="buttons big"><button id="plSnap">Snap</button><button id="plFit">Auto</button></div>';
    h += '<div class="buttons"><button id="plReset"' + (PLATE_HAND[key] || draftOf().plate ? '' : ' disabled') + '>Reset to generated</button><span class="small">key ' + esc(key) + (shared.length ? ', also ' + esc(shared.slice(0, 3).join(', ')) + (shared.length > 3 ? ' +' + (shared.length - 3) : '') : '') + '</span></div>';
    return h;
  };
  const busy = (fn) => { root.classList.add('busy'); setTimeout(() => { try { fn(); } finally { root.classList.remove('busy'); } }, 20); };
  const wire = () => {
    const q = (s) => root.querySelector(s);
    root.querySelectorAll('[data-pt]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.pt)));
    q('#plProp')?.addEventListener('change', (e) => { P.prop[P.tab] = e.target.value; refresh(); ctx.syncUrl?.(); });
    root.querySelectorAll('[data-on]').forEach(b => b.addEventListener('click', () => {
      const slot = P.tab, row = rowOf(slot), want = b.dataset.on === '1';
      if (want === !!(row && !row.no)) return;
      if (want && row?.existing && !confirm('The car keeps its own ' + NAMES[slot].toLowerCase() + ' here. Unlock the slot?')) return;
      if (want) { const gen = generatedRow(car().id, slot); change(d => { d[slot] = gen && !gen.no ? clone(gen) : freshRow(slot); }, NAMES[slot] + ' on.'); }
      else change(d => { d[slot] = { no: 'Not for this car.', existing: row?.existing }; }, NAMES[slot] + ' off.');
    }));
    q('#plWhy')?.addEventListener('change', (e) => change(d => { d[P.tab] = { ...rowOf(P.tab), no: e.target.value.trim() || 'Not for this car.' }; }, 'Reason set.'));
    root.querySelectorAll('[data-f]').forEach(i => i.addEventListener('change', () => {
      const v = +i.value;
      if (!Number.isFinite(v)) return;
      if (P.tab === 'plate') {
        const pl = clone(platesOf()), k = P.end === 'rear' ? 'r' : 'f', e = pl[k].slice(), at = { py: 0, pz: 1, pw: 2, pp: 3 }[i.dataset.f];
        e[at] = at === 2 ? Math.max(0.15, Math.min(1.2, v)) : v;
        pl[k] = e;
        change(d => { d.plate = pl; }, 'Plate ' + P.end + ' set.');
        return;
      }
      const slot = P.tab, sh = shapeOf(P.prop[slot]), row = clone(rowOf(slot)), f = i.dataset.f;
      setShape(row, slot, sh, f === 'inset' ? { inset: v / 100 } : f === 's' ? { s: Math.max(MIN_SCALE[slot], r2(v)) } : f === 'yaw' ? { yaw: Math.round(v) } : { [f]: r3(v) });
      change(d => { d[slot] = row; }, NAMES[slot] + ': ' + f + ' set.');
    }));
    q('#plLock')?.addEventListener('change', (e) => {
      P.lockX = e.target.checked;
      if (P.lockX && P.tab !== 'plate') { const row = clone(rowOf(P.tab)); if (row && !row.no && row[shapeOf(P.prop[P.tab])][1] !== 0) { setShape(row, P.tab, shapeOf(P.prop[P.tab]), { x: 0 }); change(d => { d[P.tab] = row; }, 'Centred.'); return; } }
      refresh();
    });
    q('#plBoth')?.addEventListener('change', (e) => { P.both = e.target.checked; });
    q('#plSnap')?.addEventListener('click', () => busy(() => {
      if (P.tab === 'plate') { const pl = clone(platesOf()); if (snapPlate(P.end, pl)) change(d => { d.plate = pl; }, 'Plate snapped to the surface.'); else ctx.status('No surface there to snap to.', true); return; }
      const row = clone(rowOf(P.tab));
      if (snapSlot(P.tab, row)) change(d => { d[P.tab] = row; }, NAMES[P.tab] + ' snapped onto the surface.'); else ctx.status('No surface under it.', true);
    }));
    q('#plFit')?.addEventListener('click', () => busy(() => {
      if (P.tab === 'plate') { const pl = clone(platesOf()); if (fitPlate(P.end, pl)) change(d => { d.plate = pl; }, 'Plate placed by the search.'); else ctx.status('The search found no flat place.', true); return; }
      const row = clone(rowOf(P.tab)), t0 = performance.now();
      if (fitSlot(P.tab, row)) change(d => { d[P.tab] = row; }, NAMES[P.tab] + ' fitted: scale ' + row[shapeOf(P.prop[P.tab])][0] + ' (' + Math.round(performance.now() - t0) + ' ms).');
      else ctx.status('Nothing fits within 30 cm of here: move it, then Fit.', true);
    }));
    q('#plReset')?.addEventListener('click', () => change(d => { if (P.tab === 'plate') d.plate = { reset: true }; else d[P.tab] = { reset: true }; }, 'Back to the generated row (write to make it so).'));
    root.querySelectorAll('[data-end]').forEach(b => b.addEventListener('click', () => { P.end = b.dataset.end; refresh(); frameSlot(); ctx.syncUrl?.(); }));
    root.querySelectorAll('[data-pon]').forEach(b => b.addEventListener('click', () => {
      const pl = clone(platesOf()), k = P.end === 'rear' ? 'r' : 'f', want = b.dataset.pon === '1';
      if (want === !!pl[k]) return;
      if (want) { const gen = generatedPlates(car())[k], g = geom(); pl[k] = gen || [0.5, r3(P.end === 'rear' ? g.box.min.z : g.box.max.z), 0.52, 0]; if (!gen) snapPlate(P.end, pl); }
      else pl[k] = null;
      change(d => { d.plate = pl; }, 'Plate ' + P.end + (want ? ' on.' : ' off.'));
    }));
    q('#plWrite')?.addEventListener('click', () => write(changes(), 'Written to the build:'));
    q('#plDiff')?.addEventListener('click', async () => { try { const out = await post({ ...file(), dry: true }); P.diff = out.diff || '(no change)'; } catch (err) { P.diff = 'Diff failed: ' + err.message; } renderPanel(); });
    q('#plDown')?.addEventListener('click', download);
    q('#plCopy')?.addEventListener('click', () => navigator.clipboard?.writeText(JSON.stringify(file(), null, 1)).then(() => ctx.status('Copied the change file.'), () => ctx.status('Copy failed.', true)));
    q('#plDrop')?.addEventListener('click', () => { P.drafts[car().id] = {}; saveDrafts(); push(); P.diff = null; refresh(); ctx.status('Draft discarded.'); });
    q('#plUndoW')?.addEventListener('click', () => write([P.tab === 'plate' ? { kind: 'plate', key: plateKeyOf(car()), undo: true } : { kind: 'prop', car: car().id, slot: P.tab, undo: true }], 'Write undone:'));
  };

  // ---- the view: tap the car to put the slot there; drag the shape over the surface; the plate up and down its end ----
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const aim = (e) => { const r = ctx.canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, ctx.camera); ray.layers.set(0); };
  const carHit = () => ray.intersectObject(model(), true).find(h => h.object.isMesh && !ctx.inFx(h.object) && h.object.layers.test(ray.layers) && shown(h.object));
  const shown = (n) => { for (let p = n; p; p = p.parent) if (!p.visible) return false; return true; };
  const activeHit = () => { const g = group.children.find(c => (P.tab === 'plate' ? c.userData.end === P.end : c.userData.slot === P.tab)); return g ? ray.intersectObject(g, true).length > 0 : false; };
  const moveTo = (pt, final) => {
    if (P.tab === 'plate') {
      const pl = clone(platesOf()), k = P.end === 'rear' ? 'r' : 'f';
      if (!pl[k]) return;
      pl[k] = [r3(pt.y), pl[k][1], pl[k][2], pl[k][3]];
      snapPlate(P.end, pl);
      if (final) change(d => { d.plate = pl; }, 'Plate moved.'); else { draftOf().plate = pl; draw(); measureSoon(); }
      return;
    }
    const slot = P.tab, row = clone(rowOf(slot));
    if (!row || row.no) return;
    const sh = shapeOf(P.prop[slot]);
    setShape(row, slot, sh, { x: P.lockX ? 0 : r3(pt.x), z: r3(pt.z), y: r3(pt.y + heightOf(slot, sh) * row[sh][0] / 2) });
    snapSlot(slot, row);
    if (final) change(d => { d[slot] = row; }, NAMES[slot] + ' moved.'); else { draftOf()[slot] = row; draw(); measureSoon(); }
  };
  let drag = null;
  ctx.canvas.addEventListener('pointerdown', (e) => {
    if (!P.on || !model() || (ctx.gizmo.object === proxy && ctx.gizmo.axis)) return;
    aim(e);
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, on: P.tool === 'drag' && activeHit(), moved: false };
    if (drag.on) { ctx.orbit.enabled = false; ctx.canvas.setPointerCapture(e.pointerId); geom(); }
  });
  ctx.canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
    if (!drag.on || !drag.moved) return;
    aim(e);
    const h = carHit();
    if (h) moveTo(h.point, false);
  });
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    ctx.orbit.enabled = true;
    if (d.on && d.moved) { aim(e); const h = carHit(); if (h) moveTo(h.point, true); else change(() => {}, ''); return; }
    if (!d.moved && P.tool === 'drag' && e.type === 'pointerup') { aim(e); const h = carHit(); if (h && (P.tab !== 'plate' || (P.end === 'rear') === (h.point.z < 0))) moveTo(h.point, true); } // (a tap on the car: the slot goes there; a plate only at its own end)
  };
  ctx.canvas.addEventListener('pointerup', up);
  ctx.canvas.addEventListener('pointercancel', up);

  // ---- the floating tool row (the view's own: Drag, Move, Turn, Size) ----
  const tools = ctx.toolsEl;
  tools.innerHTML = '<span class="seg big" role="group" aria-label="Placement tool">' + [['drag', 'Drag'], ['move', 'Move'], ['turn', 'Turn'], ['size', 'Size']].map(([k, n]) => '<button data-tool="' + k + '">' + n + '</button>').join('') + '</span>';
  tools.addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) { P.tool = b.dataset.tool; syncTools(); syncProxy(); } });
  const syncTools = () => tools.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === P.tool));

  // ---- the car's own tagged props / plates hidden while placing (as the game hides them under a worn prop or plate); the equipped cosmetics too ----
  const layers = (m) => {
    if (!P.on || !m) return;
    m.traverse((n) => {
      if (!n.isMesh) return;
      let hide = false;
      for (let p = n; p && !hide; p = p.parent) if (p.userData.platecosmetic || p.userData.propCosmetic) hide = true;
      if (n.userData.prop && !n.userData.propId && SLOTS.includes(n.userData.prop) && P.tab !== 'plate') { const r = rowOf(n.userData.prop); if (r && !r.no) hide = true; } // (a locked slot: the car's own prop stays, as in the game)
      if (P.tab === 'plate' && n.userData.plate) hide = true;
      if (hide) n.layers.set(1);
    });
  };
  const frameSlot = () => {
    if (!model()) return;
    ctx.frame(P.tab === 'plate' ? (P.end === 'rear' ? 'rear' : 'front') : P.tab === 'roof' ? 'high34' : 'r34');
  };
  const refresh = () => { if (!P.on) return; ctx.applyViewFlags(); draw(); renderPanel(); };
  // ?placeact=s:1.2,snap,fit,write ... : the panel's own fields and buttons, in order, once (for stills and a check: what a finger would do)
  const script = async (list) => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    for (const step of list) {
      await wait(400);
      const [k, v] = step.split(':');
      const field = root.querySelector('[data-f="' + k + '"]');
      if (field && v !== undefined) { field.value = v; field.dispatchEvent(new Event('change')); continue; }
      const id = { snap: '#plSnap', fit: '#plFit', reset: '#plReset', write: '#plWrite', diff: '#plDiff', undowrite: '#plUndoW', lock: '[data-on="0"]', unlock: '[data-on="1"]', rear: '[data-end="rear"]', front: '[data-end="front"]' }[k];
      const b = id && root.querySelector(id);
      if (b && !b.disabled) { b.click(); await wait(k === 'write' || k === 'diff' || k === 'undowrite' ? 1500 : 400); }
    }
  };
  let scripted = false;
  const setTab = (t) => { P.tab = TABS.includes(t) ? t : 'wing'; P.diff = null; refresh(); frameSlot(); ctx.syncUrl?.(); };
  return {
    get on() { return P.on; },
    enter() {
      P.on = true; group.visible = true; ctx.toolsEl.hidden = false; document.body.classList.add('placing');
      P.hist = []; P.at = -1; tidy(); push(); syncTools();
      if (P.server === null) probe();
      refresh(); frameSlot();
      if (!scripted && params.get('placeact')) { scripted = true; const run = () => (P.server === null ? setTimeout(run, 200) : script(params.get('placeact').split(','))); run(); }
    },
    leave() { P.on = false; group.visible = false; ctx.toolsEl.hidden = true; document.body.classList.remove('placing'); if (ctx.gizmo.object === proxy) ctx.gizmo.detach(); draw(); },
    onModel() { P.g = null; P.gModel = null; if (P.on) { P.hist = []; P.at = -1; tidy(); push(); draw(); renderPanel(); } }, // (a new car or a rebuild: measure again)
    layers, undo, canUndo,
    urlParams: (q) => { if (!P.on) return; q.set('slot', P.tab); if (P.tab === 'plate' && P.end === 'front') q.set('end', 'front'); if (P.tab !== 'plate' && P.prop[P.tab] !== DEFAULT_PROP[P.tab]) q.set('prop', P.prop[P.tab]); },
    state: P, measure, plateMeasure, changes, rowOf, platesOf, setTab, // (for the check and a curious console)
  };
};
