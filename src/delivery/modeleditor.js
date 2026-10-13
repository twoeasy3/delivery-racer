// ---- the MODEL EDITOR (delivery/modeleditor.html): a car's model, part by part, edited as a PATCH over the model its
// code builds (the owner, 13-Oct: "I would like a model editor, I inspect each car, look at what is drawn and
// manipulate the parts. Level editor but for car JSONs").
//
// HOW TO USE IT
//   1. Pick a car (the roster and the car ideas). Its model is built by the game's own code (render/showcar.js, as the
//      garage and the inspector build it) and listed part by part (Parts tab): every mesh and group, with a name (its
//      own, the hook the code keeps it by, or a guessed role: wheel, tyre, hub, glass, headlamp, tail lamp, body...).
//   2. Tap a part in the view or the list. Drag the gizmo (Move G, Rotate R, Scale S; Snap), or type in the Part tab:
//      position, rotation (degrees), scale, the sizes of a plain box / cylinder / sphere / cone, colour, glow
//      (emissive), opacity, shown. Add a box, cylinder, sphere or cone; Ctrl+D duplicates, M mirrors across the car
//      (the copy follows the part), Delete removes; Ctrl+Z / Ctrl+Y undo and redo; Esc lets go; F frames the part.
//   3. Every edit is kept in this browser as you go (autosave, per car). "See in game" opens the garage's inspector
//      with it (?modelpatch=local). Download patch, put the file in src/delivery/modelpatches/<car id>.json, commit:
//      the game applies it wherever it builds that car's model (render/modelpatchapply.js).
// The patch's format and how it finds the parts again: render/modelpatch.js. The eyes, solo and locks of the list only
// change this view. A part made by a lofted, extruded or otherwise shaped geometry is edited as a whole (move, turn,
// scale, colour, delete, copy), never vertex by vertex; the sizes are editable only for a plain primitive the code did
// not move inside its geometry.
//   ?car=<id>  ?evil  ?tab=parts|part|json  ?part=<part id>  ?view=front|rear|left|right|top|34
import './render/modeleditorshim.js'; // (first: the game's modules' elements, stood in for)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import './editor.css';
import './modeleditor.css';
import { carById } from './cars.js';
import { showroomCars } from './showroomData.js';
import { IDEA_CARS } from './ideas.js';
import { buildInspectModel } from './render/inspectmodel.js';
import { renderer } from './render/scene.js';
import { extractParts, applyPatch, modelStats, BUDGET, emptyPatch, withSet, withDelete, withAdd, withDuplicate, withMirror, tidyPatch, PRIMITIVES } from './render/modelpatch.js';
import { LOCAL_KEY, PATCHES, patchesReady, localPatches, setModelPatching } from './render/modelpatchapply.js';

setModelPatching(false); // (the code's own model here: this page applies the patch being edited itself)
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEG = 180 / Math.PI;

// ---- the cars --------------------------------------------------------------------------------------------------
const roster = [...new Map(showroomCars().filter(Boolean).map(c => [c.id, c])).values()];
const ideas = IDEA_CARS.filter(c => !roster.some(r => r.id === c.id));
const pick = $('pick');
const optgroup = (label, cars) => {
  const g = document.createElement('optgroup');
  g.label = label;
  for (const car of cars) { const o = document.createElement('option'); o.value = car.id; o.textContent = car.name + ' (' + car.id + ')'; g.append(o); }
  pick.append(g);
};
optgroup('Cars', roster);
optgroup('Car ideas', ideas);

// ---- the view --------------------------------------------------------------------------------------------------
const canvas = $('game'); // (the game's one renderer draws on it: render/scene.js; pixels capped at 2x, 1.5x on a touch screen)
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfd5de);
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, 1.4));
const sun = new THREE.DirectionalLight(0xfff4e2, 2.0);
sun.position.set(5, 10, 6);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7);
fill.position.set(-6, 4, -5);
scene.add(fill);
// the car's soft shadow: a blurred dark patch the size of its footprint (no shadow map: cheap on a tablet)
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(0.6, 'rgba(0,0,0,0.3)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.003;
ground.renderOrder = -1;
scene.add(ground);
const grid = new THREE.GridHelper(20, 40, 0x8a94a6, 0xaab3c2);
grid.material.transparent = true; grid.material.opacity = 0.55;
grid.position.y = 0.001;
scene.add(grid);
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.maxPolarAngle = Math.PI * 0.495;
orbit.minDistance = 0.5; orbit.maxDistance = 40;
const gizmo = new TransformControls(camera, canvas);
gizmo.setSize(0.9);
scene.add(gizmo);
const helpers = new THREE.Group(); // (the boxes, the hitbox, the wheel marks: not part of the model)
scene.add(helpers);
const selBox = new THREE.BoxHelper(undefined, 0xffd23f), hoverBox = new THREE.BoxHelper(undefined, 0x4fa8ff);
selBox.visible = hoverBox.visible = false;
selBox.material.depthTest = hoverBox.material.depthTest = false;
selBox.renderOrder = hoverBox.renderOrder = 10;
scene.add(selBox, hoverBox);

// ---- the state -------------------------------------------------------------------------------------------------
const S = {
  car: null, evil: params.has('evil'), model: null, parts: [], nodes: new Map(), base: '', patch: null, result: null,
  sel: null, hover: null, history: [], at: -1, hidden: new Set(), solo: null, locked: new Set(), tab: 'parts', search: '',
};
const partOf = (id) => S.parts.find(p => p.id === id) || null;
const status = (words, bad = false) => { $('status').textContent = words; $('status').classList.toggle('bad', bad); };

// the patch kept in this browser, per car (the game's ?modelpatch=local reads the same)
const save = () => {
  try {
    const all = localPatches();
    const p = tidyPatch(S.patch);
    if (p.ops.length || p.evil.length) all[S.car.id] = p; else delete all[S.car.id];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch { /* (no storage: the edits last as long as the page) */ }
};

// build the code's model, apply the patch, list the parts
const disposeModel = (model) => {
  if (!model) return;
  model.removeFromParent();
  model.traverse((n) => { // (this page's copies only; a geometry used again is uploaded again)
    if (n.geometry && !n.geometry.userData?.shared) n.geometry.dispose();
    for (const m of [].concat(n.material || [])) if (!m.userData?.shared) m.dispose();
  });
};
const rebuild = () => {
  const keep = S.sel;
  disposeModel(S.model);
  const model = buildInspectModel(S.car, S.evil);
  model.position.set(0, 0, 0); model.rotation.set(0, 0, 0);
  S.result = applyPatch(model, S.patch, { evil: S.evil });
  model.userData.livery?.(S.evil);
  const { parts, nodes, base } = extractParts(model);
  S.model = model; S.parts = parts; S.nodes = nodes;
  if (!S.base) S.base = base;
  scene.add(model);
  const foot = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3());
  ground.scale.set(Math.max(0.5, foot.x * 1.5), Math.max(0.5, foot.z * 1.35), 1);
  applyViewFlags();
  select(keep && nodes.has(keep) ? keep : null, false);
  renderList(); renderStats(); renderJson();
  if (S.tab === 'part') renderPart();
};
// a new patch: kept in the history (undo), saved, shown
const commit = (patch, words) => {
  S.patch = patch;
  S.history = S.history.slice(0, S.at + 1);
  S.history.push(JSON.stringify(patch));
  if (S.history.length > 200) S.history.shift();
  S.at = S.history.length - 1;
  save(); rebuild();
  if (words) status(words);
  syncUndo();
};
const syncUndo = () => { $('undo').disabled = S.at <= 0; $('redo').disabled = S.at >= S.history.length - 1; };
const undo = (dir) => {
  const to = S.at + dir;
  if (to < 0 || to >= S.history.length) return;
  S.at = to; S.patch = JSON.parse(S.history[to]);
  save(); rebuild(); syncUndo();
  status(dir < 0 ? 'Undone.' : 'Redone.');
};

const loadCar = (id, { keepView = false } = {}) => {
  const car = carById(id) || roster[0];
  S.car = car; S.sel = null; S.hidden.clear(); S.solo = null; S.locked.clear(); S.base = '';
  pick.value = car.id;
  // its patch: this browser's (autosave), else the game's file, else none
  const probe = buildInspectModel(car, false);
  applyPatch(probe, null);
  const base = extractParts(probe).base;
  disposeModel(probe);
  S.patch = localPatches()[car.id] || (PATCHES[car.id] && JSON.parse(JSON.stringify(PATCHES[car.id]))) || emptyPatch(car.id, base);
  S.patch.evil ||= [];
  S.base = base;
  S.history = [JSON.stringify(S.patch)]; S.at = 0;
  rebuild(); syncUndo();
  if (!keepView) frame();
  $('jsonCar').textContent = car.id;
  $('preview').href = './?garage&' + (car.idea ? 'tab=ideas&' : '') + 'inspect=' + encodeURIComponent(car.id) + (S.evil ? '&evil' : '') + '&modelpatch=local';
  const r = S.result;
  status(car.name + ': ' + S.parts.length + ' parts.' + (S.patch.ops.length ? ' ' + S.patch.ops.length + ' edits kept.' : '') + (r.unmatched.length ? ' ' + r.unmatched.length + ' edits no longer match a part (see JSON).' : ''), r.unmatched.length > 0);
  syncUrl();
};
const syncUrl = () => {
  const q = new URLSearchParams();
  q.set('car', S.car.id);
  if (S.evil) q.set('evil', '');
  if (S.tab !== 'parts') q.set('tab', S.tab);
  if (S.sel) q.set('part', S.sel);
  history.replaceState(null, '', '?' + q.toString().replace(/=(&|$)/g, '$1'));
};

// ---- the camera ------------------------------------------------------------------------------------------------
const VIEWS = { front: [0, 0.12], rear: [Math.PI, 0.12], left: [Math.PI / 2, 0.06], right: [-Math.PI / 2, 0.06], top: [0, 1.45], 34: [0.75, 0.38] };
let view = VIEWS[params.get('view')] ? params.get('view') : '34';
const modelBox = () => new THREE.Box3().setFromObject(S.model, true);
const frame = (name = view, box = null) => {
  view = name;
  const b = box || modelBox();
  const c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
  const r = Math.max(0.3, size.length() / 2);
  const dist = r / Math.sin((camera.fov * Math.PI / 180) / 2) * (camera.aspect < 1 ? 1.25 / camera.aspect : 1.05);
  const [yaw, pitch] = VIEWS[name];
  camera.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * dist, c.y + Math.sin(pitch) * dist, c.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  orbit.target.copy(c);
  camera.lookAt(c);
  orbit.update();
  document.querySelectorAll('[data-view]').forEach(b2 => b2.classList.toggle('on', b2.dataset.view === name));
};
const resize = () => {
  const box = $('viewBox').getBoundingClientRect();
  renderer.setSize(Math.max(1, box.width), Math.max(1, box.height), false);
  camera.aspect = Math.max(1, box.width) / Math.max(1, box.height);
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe($('viewBox'));

// ---- what is shown: eyes, solo, wireframe, boxes, the hitbox, the wheels ----------------------------------------
const flags = () => ({ wire: $('wire').checked, bbox: $('bbox').checked, hitbox: $('hitbox').checked, wheels: $('wheels').checked });
const applyViewFlags = () => {
  const f = flags();
  const soloNode = S.solo && S.nodes.get(S.solo);
  for (const [id, node] of S.nodes) {
    node.userData.viewHidden = S.hidden.has(id);
    if (node.isMesh) for (const m of [].concat(node.material)) m.wireframe = f.wire;
  }
  S.model.traverse((n) => {
    if (!n.isMesh) return;
    let shown = !n.userData.viewHidden;
    for (let p = n.parent; p && p !== S.model && shown; p = p.parent) if (p.userData.viewHidden) shown = false;
    if (soloNode) { let inSolo = false; for (let p = n; p && p !== S.model; p = p.parent) if (p === soloNode) inSolo = true; shown = shown && inSolo; }
    n.layers.set(shown ? 0 : 1); // (layer 1: not drawn, not picked; the patch's own `visible` stays as it is)
  });
  helpers.clear();
  if (f.bbox) helpers.add(new THREE.Box3Helper(modelBox(), 0x7a1fa8));
  if (f.hitbox) {
    const v = S.car.real || S.car, k = S.car.scale && S.car.real ? S.car.scale : 1;
    const b = new THREE.Box3(new THREE.Vector3(-v.hw * k, 0, -v.hl * k), new THREE.Vector3(v.hw * k, v.height * k, v.hl * k));
    helpers.add(new THREE.Box3Helper(b, 0xd8262b));
  }
  if (f.wheels) {
    const mark = new THREE.MeshBasicMaterial({ color: 0x18a35a, depthTest: false });
    for (const p of S.parts) {
      if (!/^(wheel|tyre|wheels)$/.test(p.role) || !p.box) continue;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mark);
      m.position.set((p.box[0] + p.box[3]) / 2, (p.box[1] + p.box[4]) / 2, (p.box[2] + p.box[5]) / 2);
      m.renderOrder = 11;
      helpers.add(m);
    }
  }
};
for (const id of ['wire', 'bbox', 'hitbox', 'wheels']) $(id).addEventListener('change', applyViewFlags);

// ---- picking: a tap (not a drag) on a part selects it; the mouse over one shows its box -------------------------
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hit = (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  ray.layers.set(0);
  const hits = ray.intersectObject(S.model, true).filter(h => h.object.isMesh && isShown(h.object));
  for (const h of hits) {
    const id = pickable(h.object);
    if (id) return id;
  }
  return null;
};
const isShown = (n) => { for (let p = n; p; p = p.parent) if (!p.visible) return false; return true; };
// the part a mesh belongs to: itself, unless it (or a group above it) is locked
const idOf = (node) => { for (const [id, n] of S.nodes) if (n === node) return id; return null; };
const pickable = (node) => {
  for (let p = node; p && p !== S.model; p = p.parent) if (S.locked.has(idOf(p))) return null;
  return idOf(node);
};
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || gizmo.dragging) { down = null; return; }
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), long = performance.now() - down.t;
  down = null;
  if (moved > 8 || long > 600 || gizmoHot) return;
  select(hit(e));
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const id = hit(e);
  if (id === S.hover) return;
  S.hover = id;
  const node = id && id !== S.sel ? S.nodes.get(id) : null;
  hoverBox.visible = !!node;
  if (node) hoverBox.setFromObject(node);
  document.querySelectorAll('.prow.hov').forEach(r => r.classList.remove('hov'));
});
canvas.addEventListener('pointerleave', () => { S.hover = null; hoverBox.visible = false; });
let gizmoHot = false; // (the pointer went down on the gizmo: not a tap on a part)
gizmo.addEventListener('mouseDown', () => { gizmoHot = true; });
gizmo.addEventListener('mouseUp', () => { setTimeout(() => { gizmoHot = false; }, 0); });

const select = (id, show = true) => {
  S.sel = id && S.nodes.has(id) ? id : null;
  const node = S.sel ? S.nodes.get(S.sel) : null;
  selBox.visible = !!node;
  if (node) selBox.setFromObject(node);
  if (node && !S.locked.has(S.sel)) gizmo.attach(node); else gizmo.detach();
  hoverBox.visible = false;
  document.querySelectorAll('.prow').forEach(r => r.classList.toggle('sel', r.dataset.id === S.sel));
  if (show) {
    const row = document.querySelector('.prow.sel'), list = $('parts');
    if (row && list.scrollHeight > list.clientHeight) { // (the list scrolls, not the panel)
      const top = row.offsetTop;
      if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top - list.clientHeight / 2;
    }
    renderPart();
    syncUrl();
  }
};

// ---- the gizmo: dragging moves the part itself; letting go puts the new place in the patch ----------------------
gizmo.addEventListener('dragging-changed', (e) => {
  orbit.enabled = !e.value;
  if (e.value || !S.sel) return;
  const node = S.nodes.get(S.sel), part = partOf(S.sel);
  if (!node || !part) return;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  commit(withSet(S.patch, part, {
    position: node.position.toArray().map(r3), rotation: [node.rotation.x, node.rotation.y, node.rotation.z].map(r3), scale: node.scale.toArray().map(r3),
  }), (part.name || part.role) + ' ' + ({ translate: 'moved', rotate: 'turned', scale: 'scaled' })[gizmo.getMode()] + '.');
});
gizmo.addEventListener('objectChange', () => { if (S.sel) selBox.setFromObject(S.nodes.get(S.sel)); });
const setMode = (mode) => {
  gizmo.setMode(mode);
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
};
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
const syncSnap = () => {
  const on = $('snap').checked;
  gizmo.setTranslationSnap(on ? 0.05 : null); gizmo.setRotationSnap(on ? Math.PI / 12 : null); gizmo.setScaleSnap(on ? 0.1 : null);
};
$('snap').addEventListener('change', syncSnap);

// ---- the part list ---------------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const edited = () => {
  const ids = new Set();
  for (const op of S.patch.ops) { if (op.add) ids.add(op.add.id); else ids.add(op.id); }
  for (const op of S.patch.evil || []) ids.add(op.id);
  return ids;
};
const renderList = () => {
  const q = S.search.trim().toLowerCase();
  const ed = edited();
  const rows = S.parts.filter(p => !q || [p.id, p.name, p.role, p.kind, p.type].some(v => String(v || '').toLowerCase().includes(q)));
  $('parts').innerHTML = rows.map((p) => {
    const depth = Math.min(3, p.id.split(/[./]/).length - 1);
    const label = p.name && p.name !== p.role ? esc(p.name) + ' <i>' + esc(p.role) + '</i>' : esc(p.role);
    const meta = (p.type === 'group' ? p.children + ' in it' : (p.kind || '').replace('Geometry', '') + ' · ' + p.tris);
    return '<div class="prow indent' + depth + (S.sel === p.id ? ' sel' : '') + (S.hidden.has(p.id) ? ' hidden' : '') + (ed.has(p.id) ? ' edited' : '') + '" data-id="' + esc(p.id) + '" role="option">'
      + '<button data-act="eye" class="' + (S.hidden.has(p.id) ? '' : 'on') + '" title="Show / hide in this view" aria-label="Show or hide">' + (S.hidden.has(p.id) ? '&#9675;' : '&#9673;') + '</button>'
      + '<button data-act="solo" class="' + (S.solo === p.id ? 'on' : '') + '" title="Solo: only this part" aria-label="Solo">S</button>'
      + '<button data-act="lock" class="' + (S.locked.has(p.id) ? 'on' : '') + '" title="Lock: not picked in the view" aria-label="Lock">' + (S.locked.has(p.id) ? '&#128274;' : '&#128275;') + '</button>'
      + '<span class="pname">' + (p.color ? '<span class="sw" style="background:' + p.color + '"></span>' : '') + label + ' <i>' + esc(p.id) + '</i></span>'
      + '<span class="pmeta">' + esc(meta) + (p.visible ? '' : ' · off') + '</span></div>';
  }).join('') || '<p class="note">No part matches.</p>';
};
$('parts').addEventListener('click', (e) => {
  const row = e.target.closest('.prow');
  if (!row) return;
  const id = row.dataset.id, act = e.target.closest('button')?.dataset.act;
  if (act === 'eye') { S.hidden.has(id) ? S.hidden.delete(id) : S.hidden.add(id); }
  else if (act === 'solo') { S.solo = S.solo === id ? null : id; }
  else if (act === 'lock') { S.locked.has(id) ? S.locked.delete(id) : S.locked.add(id); if (S.sel === id) select(id, false); }
  else { select(id); return; }
  applyViewFlags(); renderList();
});
$('search').addEventListener('input', (e) => { S.search = e.target.value; renderList(); });
$('showAll').addEventListener('click', () => { S.hidden.clear(); S.solo = null; applyViewFlags(); renderList(); });
document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
  const box = modelBox();
  const { patch, id } = withAdd(S.patch, b.dataset.add, { position: [0, Math.round((box.max.y + 0.3) * 100) / 100, 0] });
  commit(patch, 'Added a ' + b.dataset.add + '.');
  select(id);
}));

// ---- the selected part's properties ------------------------------------------------------------------------------
const num = (v, step = 0.01) => '<input type="number" step="' + step + '" value="' + (Math.round(v * 1000) / 1000) + '">';
const renderPart = () => {
  const box = $('partBox');
  const p = S.sel && partOf(S.sel);
  if (!p) { box.innerHTML = '<p class="note">Tap a part in the view or the list.</p>'; return; }
  const geo = p.params && PRIMITIVES[p.kind];
  box.innerHTML = '<div class="props">'
    + '<h2>' + esc(p.name || p.role) + ' <span class="small">' + esc(p.type) + (p.kind ? ' · ' + esc(p.kind) : '') + ' · ' + p.tris + ' triangles</span></h2>'
    + '<div class="grid"><label>Name <input id="pName" value="' + esc(p.name) + '"></label><label>Role <input id="pRole" value="' + esc(p.role) + '"></label></div>'
    + '<p class="kv">id ' + esc(p.id) + (p.hook ? ' · the code keeps it as userData.' + esc(p.hook) : '') + (p.added ? ' · added by the patch' : '') + '</p>'
    + ['position', 'rotation', 'scale'].map(k => '<div class="vec" data-vec="' + k + '"><span>' + k[0].toUpperCase() + k.slice(1) + (k === 'rotation' ? ' °' : '') + '</span>'
      + p[k].map(v => num(k === 'rotation' ? v * DEG : v, k === 'rotation' ? 5 : k === 'scale' ? 0.05 : 0.01)).join('') + '</div>').join('')
    + (geo ? '<h2 style="margin-top:12px">Sizes ' + (p.editable ? '' : '<span class="small">set in its code (move or scale the part instead)</span>') + '</h2><div class="params">'
      + geo.filter(k => typeof p.params[k] === 'number').map(k => '<label class="param">' + k + '<input type="number" data-param="' + k + '" step="' + (/Segments|segments/.test(k) ? 1 : 0.01) + '" value="' + (Math.round(p.params[k] * 1000) / 1000) + '"' + (p.editable ? '' : ' disabled') + '></label>').join('') + '</div>' : '')
    + (p.color ? '<div class="paint"><label>Colour <input type="color" id="pColor" value="' + p.color + '"></label>'
      + (p.emissive ? '<label>Glow <input type="color" id="pEmissive" value="' + p.emissive + '"></label>' : '')
      + '<label>Opacity <input type="range" id="pOpacity" min="0.05" max="1" step="0.05" value="' + p.opacity + '"></label></div>'
      + '<div class="paint"><label class="check"><input type="checkbox" id="pShare"><span>Colour every part sharing its material</span></label>'
      + '<label class="check"><input type="checkbox" id="pEvil"' + (S.evil ? ' checked' : '') + '><span>Paint for Evil only</span></label></div>' : '')
    + '<div class="paint"><label class="check"><input type="checkbox" id="pVisible"' + (p.visible ? ' checked' : '') + '><span>Shown (in the game too)</span></label></div>'
    + '<div class="buttons"><button id="pDup" title="Ctrl+D">Duplicate</button><button id="pMirror" title="M: a copy across the car that follows it">Mirror</button><button id="pDelete" title="Delete">Delete</button><button id="pReset" title="Take this part\'s edits out of the patch">Reset part</button><button id="pFrame" title="F">Frame</button></div>'
    + '</div>';
  const set = (values, words) => commit(withSet(S.patch, p, values), words);
  box.querySelectorAll('[data-vec]').forEach(row => row.addEventListener('change', () => {
    const k = row.dataset.vec, vals = [...row.querySelectorAll('input')].map(i => +i.value || 0);
    set({ [k]: k === 'rotation' ? vals.map(v => Math.round(v / DEG * 1000) / 1000) : vals }, (p.name || p.role) + ': ' + k + ' set.');
  }));
  box.querySelectorAll('[data-param]').forEach(i => i.addEventListener('change', () => set({ params: { [i.dataset.param]: +i.value } }, (p.name || p.role) + ': ' + i.dataset.param + ' set.')));
  $('pName').addEventListener('change', (e) => { if (p.added) set({ name: e.target.value }); else { S.nodes.get(p.id).name = e.target.value; set({ name: e.target.value }); } });
  $('pRole').addEventListener('change', (e) => set({ role: e.target.value }));
  const paint = (key, value) => {
    const evil = $('pEvil')?.checked;
    commit(withSet(S.patch, p, { [key]: value, ...($('pShare')?.checked ? { shareMat: true } : {}) }, { evil: evil && !p.added }), (p.name || p.role) + ': ' + key + (evil ? ' (Evil)' : '') + '.');
  };
  $('pColor')?.addEventListener('change', (e) => paint('color', e.target.value));
  $('pColor')?.addEventListener('input', (e) => { for (const m of [].concat(S.nodes.get(p.id).material || [])) m.color?.set(e.target.value); }); // (a look while it is dragged)
  $('pEmissive')?.addEventListener('change', (e) => paint('emissive', e.target.value));
  $('pOpacity')?.addEventListener('change', (e) => paint('opacity', +e.target.value));
  $('pVisible').addEventListener('change', (e) => set({ visible: e.target.checked }, (p.name || p.role) + (e.target.checked ? ' shown.' : ' hidden.')));
  $('pDup').addEventListener('click', duplicate);
  $('pMirror').addEventListener('click', mirror);
  $('pDelete').addEventListener('click', remove);
  $('pFrame').addEventListener('click', () => frame(view, new THREE.Box3().setFromObject(S.nodes.get(p.id))));
  $('pReset').addEventListener('click', () => {
    const next = JSON.parse(JSON.stringify(S.patch));
    next.ops = next.ops.filter(op => op.add || op.id !== p.id);
    next.evil = (next.evil || []).filter(op => op.id !== p.id);
    commit(next, (p.name || p.role) + ': back as the code builds it.');
  });
};
const duplicate = () => { const p = partOf(S.sel); if (!p) return; const { patch, id } = withDuplicate(S.patch, p); commit(patch, 'Duplicated ' + (p.name || p.role) + '.'); select(id); };
const mirror = () => { const p = partOf(S.sel); if (!p) return; const { patch, id } = withMirror(S.patch, p); commit(patch, 'Mirrored ' + (p.name || p.role) + ' across the car.'); select(id); };
const remove = () => { const p = partOf(S.sel); if (!p) return; commit(withDelete(S.patch, p), 'Deleted ' + (p.name || p.role) + '.'); select(null); };

// ---- the stats strip: against the budget (CAR-AGENT-PROMPT.md) ---------------------------------------------------
const renderStats = () => {
  const s = modelStats(S.model);
  const shapes = s.meshes > BUDGET.shapes[1] ? 'warn' : '', tris = s.triangles > BUDGET.hard ? 'bad' : s.triangles > BUDGET.triangles[1] ? 'warn' : '';
  const r = S.result;
  $('stats').innerHTML = '<span class="' + shapes + '">Shapes <b>' + s.meshes + '</b> / ' + BUDGET.shapes.join('-') + '</span>'
    + '<span class="' + tris + '">Triangles <b>' + s.triangles.toLocaleString('en') + '</b> / ' + BUDGET.triangles.map(n => n.toLocaleString('en')).join('-') + ' (max ' + BUDGET.hard.toLocaleString('en') + ')</span>'
    + '<span>Draw calls <b>' + s.materials + '</b> once merged</span>'
    + '<span>Edits <b>' + S.patch.ops.length + (S.patch.evil?.length ? ' + ' + S.patch.evil.length + ' Evil' : '') + '</b></span>'
    + (r.unmatched.length ? '<span class="bad">Stale <b>' + r.unmatched.length + '</b></span>' : '')
    + (r.stale ? '<span class="warn">Code changed since the patch</span>' : '');
};

// ---- the JSON tab ------------------------------------------------------------------------------------------------
const renderJson = () => {
  if (document.activeElement === $('json')) return;
  $('json').value = JSON.stringify(tidyPatch(S.patch), null, 1);
  const r = S.result;
  $('jsonNote').textContent = r.unmatched.length || r.warnings.length ? [r.unmatched.length ? 'Unmatched: ' + r.unmatched.join(', ') : '', ...r.warnings].filter(Boolean).join(' · ') : 'Every edit finds its part.';
  $('jsonNote').classList.toggle('bad', r.unmatched.length > 0);
};
$('json').addEventListener('input', (e) => {
  try {
    const p = JSON.parse(e.target.value);
    if (!p || !Array.isArray(p.ops)) throw new Error('a patch has an "ops" list');
    p.evil ||= [];
    commit(p, 'Patch applied from the JSON.');
  } catch (err) { $('jsonNote').textContent = 'Not applied: ' + err.message; $('jsonNote').classList.add('bad'); }
});
$('json').addEventListener('blur', renderJson);
$('tidy').addEventListener('click', () => { commit(tidyPatch(S.patch)); $('json').value = JSON.stringify(tidyPatch(S.patch), null, 1); });
$('copy').addEventListener('click', () => navigator.clipboard?.writeText($('json').value).then(() => status('Copied.')));

// ---- the tabs, the side, the files --------------------------------------------------------------------------------
const showTab = (tab) => {
  S.tab = ['parts', 'part', 'json'].includes(tab) ? tab : 'parts';
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  document.querySelectorAll('.tab').forEach(t => { t.hidden = t.id !== 'tab-' + S.tab; });
  if (S.tab === 'part') renderPart();
  if (S.tab === 'json') renderJson();
  if (S.car) syncUrl();
};
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });
const setSide = (evil) => {
  S.evil = evil;
  $('good').classList.toggle('on', !evil); $('evil').classList.toggle('on', evil);
  if (S.car) { rebuild(); syncUrl(); $('preview').href = $('preview').href.replace(/&evil/, '').replace('&modelpatch', (evil ? '&evil' : '') + '&modelpatch'); }
};
$('good').addEventListener('click', () => setSide(false));
$('evil').addEventListener('click', () => setSide(true));
$('undo').addEventListener('click', () => undo(-1));
$('redo').addEventListener('click', () => undo(1));
pick.addEventListener('change', () => loadCar(pick.value));
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => frame(b.dataset.view)));
$('download').addEventListener('click', () => {
  const p = tidyPatch(S.patch);
  p.base = S.base;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(p, null, 1) + '\n'], { type: 'application/json' }));
  a.download = S.car.id + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  status('Downloaded ' + a.download + ': put it in src/delivery/modelpatches/.');
});
const loadFile = (file) => file?.text().then((text) => {
  const p = JSON.parse(text);
  if (!Array.isArray(p.ops)) throw new Error('not a model patch (no "ops")');
  if (p.car && p.car !== S.car.id) loadCar(p.car);
  p.evil ||= [];
  commit(p, 'Loaded ' + file.name + '.');
}).catch(err => status('Not loaded: ' + err.message, true));
$('load').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
$('reset').addEventListener('click', () => { if (confirm('Throw away every edit of ' + S.car.name + '?')) commit(emptyPatch(S.car.id, S.base), 'Back as the code builds it.'); });
$('panelToggle').addEventListener('click', () => { document.body.classList.toggle('folded'); });

// ---- keys --------------------------------------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && k === 'z') { e.preventDefault(); undo(e.shiftKey ? 1 : -1); }
  else if (ctrl && k === 'y') { e.preventDefault(); undo(1); }
  else if (ctrl && k === 'd') { e.preventDefault(); duplicate(); }
  else if (ctrl) return;
  else if (k === 'g') setMode('translate');
  else if (k === 'r') setMode('rotate');
  else if (k === 's') setMode('scale');
  else if (k === 'm') mirror();
  else if (k === 'f' && S.sel) frame(view, new THREE.Box3().setFromObject(S.nodes.get(S.sel)));
  else if (k === 'delete' || k === 'backspace') remove();
  else if (k === 'escape') select(null);
});

// ---- the loop: drawn only while the page is seen -------------------------------------------------------------------
const loop = () => {
  if (!document.hidden) {
    orbit.update();
    if (S.sel && selBox.visible) selBox.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
};
window.addEventListener('pagehide', () => { disposeModel(S.model); renderer.dispose(); renderer.forceContextLoss(); });

// ---- start ---------------------------------------------------------------------------------------------------------
resize();
patchesReady.then(() => {
  loadCar(params.get('car') || 'commuter');
  showTab(params.get('tab'));
  if (params.get('part')) select(params.get('part'));
  if (params.get('tab')) showTab(params.get('tab'));
  frame(view);
  loop();
  window.__modelEditor = Object.assign(S, { three: { camera, scene, gizmo, renderer, THREE }, api: { select, commit, undo, mirror, duplicate, remove } }); // (for the checks and a curious console)
});
