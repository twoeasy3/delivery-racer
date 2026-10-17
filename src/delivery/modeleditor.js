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
//   4. The LAMP toggles (view row): Lights (the night headlamp glow, and the view darkens), Brake, Hazards / Left / Right
//      (flashing at 1.2 Hz, or Steady), Lamp markers (a labelled marker at every lamp the game's effects use). They draw the
//      game's own lamp effects for the car's lamp table entry (render/carlights.js, render/lampfx.js), or the old hitbox
//      placement for a car with none (the stats strip says which). Blackout hides the effects.
//   5. DAMAGE (the Damage row, keys 0 to 5, ?damage=0..5 or a percentage such as 60): the car as the game shows it hurt, by the
//      game's own code (render/dents.js, through render/inspectmodel.js damageModel): Clean, the four stages (CONFIG.dents.steps:
//      20 / 40 / 60 / 80 %) and 100 % (the last stage's shapes, full scorch). Changed on the live model: no reload, the camera, the
//      selection and the edits stay. The parts list and the stats strip show the damaged triangles (the cut-finer panels), the
//      multiplier against clean and the draw calls clean against damaged. Edits are made on the clean model and dented over.
//   6. MIRROR (the owner, 15-Oct: "if I edit one side, the other should go as well"): on by default; a part's PARTNER across the car is
//      found by its shape (render/modelpatch.js symmetryOf: the same vertices mirrored in x, with its colour), so a move, turn, scale, size,
//      colour, glow, opacity, shown or delete of one goes to the other as one edit (one undo). The Part tab says which part is the partner,
//      or that the part is symmetric in itself (a body, a merged pair of lamps), or that it has none. "Mirror: off" edits one side only.
//   7. WINDOWS ('glass' and 'window' are one thing: render/glassnames.js; the word shown is "window"). Every see-through part is a window
//      (role 'window', whatever the model or a patch called it) and lists its PANES: the Parts tab's Windows row has every pane of the car,
//      a tap on one in the view picks it (its outline yellow), Mirror finds its partner across the car, and its colour / opacity / place are
//      edited as any part's. A hand-built window (its own boxes and panels: models.js, modelsOrig*.js, most ideaModels*.js) has panes found
//      from its separate panels (windscreen, rear window, side window L / R, window 2 L..., side windows, roof window) but no edges to redraw
//      (its outline is the code's: an extruded one is edited as a Shape). A cabinGlass car's (render/ideaModelsDkit.js): the one glass mesh has PANES (windscreen, rear window, door
//      window L / R, quarter window L / R...): tap one in the view (or its button in the Part tab) and its EDGES can be redrawn: the side view
//      shows the body's profile, the cabin outline (the limit: the glass stays inside it, on the flank, 6 mm proud as the build lays it),
//      the automatic outline (dashed) and the pane's corners to drag (or type, add after, remove); a screen slides its foot and top along its
//      pillar. With Mirror on the edit is stored once for both flanks ('door window'); off, for that flank only ('door window L'). The edit
//      is a `glass` table in the patch, read by cabinGlass as the model is BUILT (withGlassEdits), never a change to the built mesh; "Reset to
//      automatic" takes it out. "Bake" (JSON tab) prints it as a code literal for the car's cabinGlass call (scripts/bake-glass.mjs <car>).
//      THE CORNERS (CHECKLIST 336, "Genuinely don't know which corner"): numbered handles (1..n, the order stored) named as drawn
//      (front-top, rear-top, rear-bottom, front-bottom: render/panecorners.js), a tap within 24 px of one picks the nearest (a finger's
//      44 px), the picked one orange and ringed, its row lit and its place read out live as it is dragged (z along the car, y up, and the
//      automatic place); nudge buttons (rear / up / down / front, a screen's foot or top up / down its pillar) by 5 mm, 1 cm or 5 cm;
//      "Reset corner" puts the picked one back at its automatic place; Undo is the editor's undo. The editor scrolls to the window opened.
//   8. PLACES (the Placements tab, render/placementedit.js): the car's roof, cargo and wing prop slots and its number plates, moved on the car
//      (tap the car, drag the shape, or Move / Turn / Size handles) or typed, with Snap, Fit max, Reset and the audit's measures as chips.
//      "Write to build" writes the car's hand row into render/propanchors/slice-<n>.json and the plate into render/plateanchors.js (the dev
//      server's POST /__placements, vite.config.js); with no dev server, Download gives the change for scripts/bake-placements.mjs. Not a patch.
//      ?tab=place&slot=roof|cargo|wing|plate&end=front&prop=<prop id>
//   9. SHAPES (the owner, 15-Oct: "edit ANY extruded shape ... a plain build at the end ... Mirrored mode on"): every extruded, flat or lathed
//      outline the car's code builds is recorded as the model is BUILT (render/shapeedits.js), so a part made of one or more lists them
//      (Shapes, numbered); tap the car on one and it opens: its points are numbered handles ON THE CAR, dragged there in the shape's own plane
//      (a tap on a number picks it, a long press removes it, a tap on the outline between two adds one; Snap: 2 cm steps, else 5 mm), and the
//      same points in a side / top / front drawing in the Part tab (drag, type, add after, remove, Zoom in) as the precise route. The edit is the patch's `shapes` table, read as the model is built (the same code
//      makes the edited outline: bevels, merges, draw calls as before). Mirror on: the shape across the car (found by its vertices) gets the
//      mirrored edit in the same commit. `node scripts/bake-shapes.mjs <car>` writes the points into the car's source (a plain build, no patch).
//  10. ONE PANE ON ITS OWN (CHECKLIST 462, the owner: "doesn't let me change the angle or placement of a single window"; render/paneedit.js): a
//      pane picked (tap it, or its button in the Windows row) takes the gizmo itself, on its centre, its axes its own (X across, Y up its
//      face): Move / Rotate / Scale act on that pane alone, even when it is one of several in one merged glass mesh. The Part tab: gap / clear
//      chips, X Y Z (its centre, m), ° Yaw Pitch Roll, W H (m), Snap (rests it on the body: the line says how far), Reset, Part (the whole
//      part again). Mirror: the pane named the other way (L / R) gets the mirrored edit. The edit is the patch's `panes` table, applied after
//      the ops wherever the game builds the car (a Super car wears its base car's); scripts/window-gap-audit.mjs lists floating panes.
//   ?car=<id>  ?damage=<0..5|percent>  ?evil  ?tab=parts|part|place|json  ?part=<part id>  ?pane=<pane name>  ?corner=<1..n>  ?shape=<shape id>  ?mirror=off  ?view=front|rear|left|right|top|34  ?dark
//   ?lights  ?brake  ?hazards  ?lampmarks  (those lamp toggles on from the start; also ?left ?right ?steady)
import './render/modeleditorshim.js'; // (first: the game's modules' elements, stood in for)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import './editor.css';
import './modeleditor.css';
import { carById, CARS, FILLER_CARS, EVENT_CARS, BESPOKE_CARS, EARNED_CARS, SECRET_CARS } from './cars.js'; // (not showroomData.js: it pulls in the game's own page code, which wants the game's buttons)
import { IDEA_CARS } from './ideas.js';
import { buildInspectModel, DAMAGE_STATES, damageFromParam, damageIndex, damageModel, damageCounts } from './render/inspectmodel.js';
import { renderer } from './render/scene.js';
import { silhouetteFor } from './render/silhouette.js';
import { findZFights } from './render/zfight.js';
import { extractParts, applyPatch, modelStats, triangles, BUDGET, emptyPatch, withSet, withDelete, withAdd, withDuplicate, withMirror, withGlass, withPane, tidyPatch, PRIMITIVES, symmetryOf, mirroredTransform, isWindowPart } from './render/modelpatch.js';
import { paneFrame, applyPaneEdit, turnMatrix, turnOf, mirroredEdit, rimPoints, paneSamples, restItems, gapOf, snapPane, snappedEdit, paneKeyOf } from './render/paneedit.js';
import { glassTable, canonTable, windowKey, windowBase, sameWindow } from './render/glassnames.js';
import { withGlassEdits, glassEditsReport } from './render/ideaModelsDkit.js';
import { setShapeOverride, lastShapeReport, locateShapes, shapePartners, mirrorPoints, withShape, outlineInModel, shapeView, shapePlane, modelToShape } from './render/shapeedits.js';
import { lampsFor, lampKey, lampSource, makeLampMarkers } from './render/carlights.js';
import { addLamps, placeLamps, setLampLights } from './render/lampfx.js';
import { LOCAL_KEY, PATCHES, patchesReady, localPatches, setModelPatching } from './render/modelpatchapply.js';
import { createPlacements } from './render/placementedit.js';
import { cornerNames, nudged, NUDGE_STEPS, stepWords } from './render/panecorners.js';

setModelPatching(false); // (the code's own model here: this page applies the patch being edited itself)
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEG = 180 / Math.PI;

// ---- the cars --------------------------------------------------------------------------------------------------
const roster = [...new Map([...CARS, ...(FILLER_CARS || []), ...EVENT_CARS, ...BESPOKE_CARS, ...EARNED_CARS, ...Object.values(SECRET_CARS)].filter(Boolean).map(c => [c.id, c])).values()];
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
const hemi = new THREE.HemisphereLight(0xffffff, 0x6b7280, 1.4);
scene.add(hemi);
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
const selBox = new THREE.BoxHelper(undefined, 0xffd23f), hoverBox = new THREE.BoxHelper(undefined, 0x4fa8ff), twinBox = new THREE.BoxHelper(undefined, 0xff8c42);
selBox.visible = hoverBox.visible = twinBox.visible = false;
selBox.material.depthTest = hoverBox.material.depthTest = twinBox.material.depthTest = false;
selBox.renderOrder = hoverBox.renderOrder = twinBox.renderOrder = 10;
scene.add(selBox, hoverBox, twinBox);
// the selected window pane's outline (its boundary edges), drawn over everything
const paneLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd23f, depthTest: false }));
paneLines.renderOrder = 11; paneLines.visible = false;
scene.add(paneLines);
// the selected SHAPE on the car: its outline (yellow, both faces) and its points' numbers, drawn over everything
const shapeMarks = new THREE.Group();
shapeMarks.renderOrder = 12;
scene.add(shapeMarks);

// ---- the state -------------------------------------------------------------------------------------------------
const S = {
  car: null, evil: params.has('evil'), share: damageFromParam(params.get('damage')), model: null, parts: [], nodes: new Map(), base: '', patch: null, result: null,
  sel: null, hover: null, history: [], at: -1, hidden: new Set(), solo: null, locked: new Set(), tab: 'parts', search: '',
  mirror: params.get('mirror') !== 'off', sym: new Map(), pane: null, panes: new Map(), // (Mirror; the parts' partners across the car; the selected window pane's name)
  shapes: [], shapePairs: new Map(), shapeRep: null, shape: null, pt: -1, zoom: false, // (the outlines the build recorded, their partners, the selected one's id, its point, the 2D view zoomed on it)
};
const partOf = (id) => S.parts.find(p => p.id === id) || null;
// a part's name for people: a window of one pane by that pane's name ('window 2 L'), else its own name or role
const labelOf = (p) => (p ? (!p.name && p.panes?.length === 1 ? p.panes[0] : p.name || p.role) : '');
let placements = null; // (the Placements tab: render/placementedit.js, made once the view is up)
const status = (words, bad = false) => { $('status').textContent = words; $('status').classList.toggle('bad', bad); };

// the patch kept in this browser, per car (the game's ?modelpatch=local reads the same)
const save = () => {
  try {
    const all = localPatches();
    const p = tidyPatch(S.patch);
    if (p.ops.length || p.evil.length || glassTable(p) || p.shapes || p.panes) all[S.car.id] = p; else delete all[S.car.id];
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
  // (the patch's glass edits go into the BUILD: cabinGlass reads them, render/ideaModelsDkit.js)
  // (and its shape edits: every outline recorded as it is built, the edited ones built from their edited points: render/shapeedits.js)
  setShapeOverride({ edits: S.patch.shapes || null, record: true });
  let model;
  try { model = withGlassEdits(glassTable(S.patch), () => buildInspectModel(S.car, S.evil)); } finally { setShapeOverride(null); } // (the table's ids in any spelling: render/glassnames.js)
  const shapeRep = lastShapeReport();
  const glassRep = glassEditsReport();
  if (glassRep.edits) model.userData.glassEdits = { used: Object.keys(glassRep.edits).filter(k => !glassRep.unused.includes(k)), unused: glassRep.unused };
  model.position.set(0, 0, 0); model.rotation.set(0, 0, 0);
  S.result = applyPatch(model, S.patch, { evil: S.evil });
  model.userData.livery?.(S.evil);
  const { parts, nodes, base, panes } = extractParts(model);
  S.model = model; S.parts = parts; S.nodes = nodes;
  S.panes = new Map([...panes].map(([id, ps]) => [nodes.get(id), ps])); // (every window part's panes: cabinGlass's, or a hand-built window's panels)
  S.sym = symmetryOf(model);
  S.shapeRep = shapeRep; S.shapes = locateShapes(model, shapeRep.records).filter(r => r.mesh); S.shapePairs = shapePartners(S.shapes);
  for (const id of shapeRep.unused) { S.result.unmatched.push('shape:' + id); S.result.warnings.push('shape edits: no outline "' + id + '" in this build (the code changed?)'); }
  damageModel(model, S.share); // (after the parts are listed from the clean model, before the lamp effects go in)
  recount();
  buildLamps(model);
  if (!S.base) S.base = base;
  scene.add(model);
  const foot = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3()); // (before the lamp effects are added)
  ground.scale.set(Math.max(0.5, foot.x * 1.5), Math.max(0.5, foot.z * 1.35), 1);
  applyViewFlags();
  select(keep && nodes.has(keep) ? keep : null, false);
  drawShape();
  renderList(); renderStats(); renderJson();
  if (S.tab === 'part') renderPart();
  if (S.tab === 'zfight') scanZ();
  placements?.onModel();
};
// the damage state (render/inspectmodel.js: the game's own dents): changed on the live model, nothing rebuilt, the camera,
// the selection and the edits kept. The parts' triangle counts are the damaged ones.
const recount = () => { for (const p of S.parts) { const n = S.nodes.get(p.id); if (n) p.tris = n.isMesh ? triangles(n) : p.tris; } };
const setDamage = (share, quiet = false) => {
  S.share = share;
  const at = damageIndex(share);
  document.querySelectorAll('#damageSeg button').forEach(b => { const on = +b.dataset.at === at; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  if (S.model) {
    withoutFx(() => damageModel(S.model, share));
    recount(); applyViewFlags(); renderList(); renderStats();
    if (S.sel && S.nodes.has(S.sel)) selBox.setFromObject(S.nodes.get(S.sel));
    if (S.tab === 'part') renderPart();
    if (S.tab === 'zfight') scanZ();
    if (!quiet) status(S.car.name + ': ' + DAMAGE_STATES[at].label + (at ? ' damage (stage ' + Math.min(at, 4) + ').' : '.'));
  }
  syncUrl();
};
$('damageSeg').innerHTML = DAMAGE_STATES.map((d, i) => '<button data-at="' + i + '" title="' + (i ? d.label + ' of the car\'s health lost' : 'No damage') + ' (key ' + i + ')" aria-pressed="false">' + d.label + '</button>').join('');
$('damageSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setDamage(DAMAGE_STATES[+b.dataset.at].share); });
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
const syncUndo = () => {
  if (placements?.on) { $('undo').disabled = !placements.canUndo(-1); $('redo').disabled = !placements.canUndo(1); return; }
  $('undo').disabled = S.at <= 0; $('redo').disabled = S.at >= S.history.length - 1;
};
const undo = (dir) => {
  if (placements?.on) { placements.undo(dir); return; } // (the Placements tab: its draft's own history)
  const to = S.at + dir;
  if (to < 0 || to >= S.history.length) return;
  S.at = to; S.patch = JSON.parse(S.history[to]);
  save(); rebuild(); syncUndo();
  status(dir < 0 ? 'Undone.' : 'Redone.');
};

const loadCar = (id, { keepView = false } = {}) => {
  const car = carById(id) || roster[0];
  S.car = car; S.sel = null; S.hidden.clear(); S.solo = null; S.locked.clear(); S.base = '';
  if (![...pick.options].some(o => o.value === car.id)) optgroup('Other', [car]); // (a car outside the lists, by ?car=: the picker names it)
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
  const pairs = [...S.sym.values()].filter(v => v.partner).length / 2, selfs = [...S.sym.values()].filter(v => v.self).length;
  status(car.name + ': ' + S.parts.length + ' parts' + (pairs || selfs ? ' (' + (pairs ? pairs + ' mirrored pairs' : '') + (pairs && selfs ? ', ' : '') + (selfs ? selfs + ' symmetric in themselves' : '') + ')' : '') + '.' + (S.patch.ops.length ? ' ' + S.patch.ops.length + ' edits kept.' : '') + (glassTable(S.patch) ? ' ' + Object.keys(glassTable(S.patch)).length + ' window edits.' : '') + (S.patch.shapes ? ' ' + Object.keys(S.patch.shapes).length + ' shape edits.' : '') + (r.unmatched.length ? ' ' + r.unmatched.length + ' edits no longer match a part (see JSON).' : ''), r.unmatched.length > 0);
  syncUrl();
};
const syncUrl = () => {
  const q = new URLSearchParams();
  q.set('car', S.car.id);
  if (S.evil) q.set('evil', '');
  if (S.share > 0) q.set('damage', String(damageIndex(S.share)));
  if (S.tab !== 'parts') q.set('tab', S.tab);
  if (S.sel) q.set('part', S.sel);
  if (S.pane) q.set('pane', S.pane);
  if (S.shape) q.set('shape', S.shape);
  if (!S.mirror) q.set('mirror', 'off');
  for (const id of LAMP_IDS) if ($(id).checked) q.set(LAMP_PARAMS[id], '');
  placements?.urlParams(q);
  history.replaceState(null, '', '?' + q.toString().replace(/=(&|$)/g, '$1'));
};

// ---- the camera ------------------------------------------------------------------------------------------------
const VIEWS = { front: [0, 0.12], rear: [Math.PI, 0.12], left: [Math.PI / 2, 0.06], right: [-Math.PI / 2, 0.06], top: [0, 1.45], 34: [0.75, 0.38], r34: [Math.PI - 0.7, 0.42], high34: [0.75, 0.7] }; // (r34, high34: the Placements tab's)
let view = VIEWS[params.get('view')] ? params.get('view') : '34';
const modelBox = () => withoutFx(() => new THREE.Box3().setFromObject(S.model, true));
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
  if (S.tab === 'part' && (S.shape || S.pane)) renderPart(); // (the shape's or window's drawing as the camera now shows it)
};
orbit.addEventListener('end', () => { // (the shape's drawing follows the camera to the other side)
  const rec = S.tab === 'part' && S.shape && shapeById(S.shape), v = rec && shapeView(rec);
  if (S.tab === 'part' && S.pane && !S.shape && $('glassSvg') && gPick.side && gPick.sx !== paneFlip()) renderPart(); // (a side window's drawing follows the camera round)
  else if (v && v.ok && screenFlips(v).join() !== shapeFlips.join()) renderPart();
  else drawShape(); // (the near one of a mirrored pair takes the handles)
});
const resize = () => {
  const box = $('viewBox').getBoundingClientRect();
  renderer.setSize(Math.max(1, box.width), Math.max(1, box.height), false);
  camera.aspect = Math.max(1, box.width) / Math.max(1, box.height);
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe($('viewBox'));
// THE CAMERA IN EDIT MODE (the owner, 16-Oct, on a phone / Mi Pad: "Fix the camera controls on the editor when edit mode is selected"; CHECKLIST 430).
// One finger / the left button on the view turns round the car, two fingers / the right button pan, a pinch / the wheel zoom, whatever tool is
// up and whatever is selected; a finger on a gizmo HANDLE edits and the camera stays (see `the view's pointers` below). Fit (F, a double tap
// on a part) puts the camera on the selected part, keeping its direction; Reset puts the whole car back in the 3/4 view. A view button, Fit
// and Reset first stop what the camera's damping still had to turn (it turned the camera on after a view was set: a snap off the view).
const stillCamera = () => { const d = orbit.enableDamping; orbit.enableDamping = false; orbit.update(); orbit.enableDamping = d; };
const fitBox = (box) => {
  stillCamera();
  const c = box.getCenter(new THREE.Vector3()), r = Math.max(0.15, box.getSize(new THREE.Vector3()).length() / 2);
  const dist = Math.max(orbit.minDistance, r / Math.sin((camera.fov * Math.PI / 180) / 2) * (camera.aspect < 1 ? 1.25 / camera.aspect : 1.05));
  const dir = camera.position.clone().sub(orbit.target);
  if (dir.lengthSq() < 1e-8) dir.set(0, 0.4, 1);
  camera.position.copy(c).addScaledVector(dir.normalize(), dist);
  orbit.target.copy(c);
  orbit.update();
};
const fitSelected = () => {
  const node = S.sel && S.nodes.get(S.sel);
  fitBox(node ? new THREE.Box3().setFromObject(node) : modelBox());
};
const viewTo = (name) => { stillCamera(); orbit.enabled = true; gizmo.enabled = true; frame(name); };
$('camFit').addEventListener('click', fitSelected);
$('camReset').addEventListener('click', () => viewTo('34'));
$('camMore').addEventListener('click', () => { const open = document.body.classList.toggle('moreOpen'); $('camMore').classList.toggle('on', open); $('camMore').setAttribute('aria-expanded', open); });

// ---- what is shown: eyes, solo, wireframe, boxes, the hitbox, the wheels ----------------------------------------
const flags = () => ({ wire: $('wire').checked, bbox: $('bbox').checked, hitbox: $('hitbox').checked, wheels: $('wheels').checked, dark: $('dark').checked });
const applyViewFlags = () => {
  const f = flags();
  const soloNode = S.solo && S.nodes.get(S.solo);
  for (const [id, node] of S.nodes) {
    node.userData.viewHidden = S.hidden.has(id);
    if (node.isMesh) for (const m of [].concat(node.material)) m.wireframe = f.wire;
  }
  syncLampView();
  // Blackout: every mesh in the game's own silhouette material (as a locked car is shown), its own kept to put back
  S.model.traverse((n) => {
    if (!n.isMesh || inFx(n)) return;
    if (f.dark && !n.userData.darkOrig) { n.userData.darkOrig = n.material; n.material = silhouetteFor(n.material); }
    else if (!f.dark && n.userData.darkOrig) { n.material = n.userData.darkOrig; n.userData.darkOrig = null; }
  });
  S.model.traverse((n) => {
    if (!n.isMesh || inFx(n)) return;
    let shown = !n.userData.viewHidden;
    for (let p = n.parent; p && p !== S.model && shown; p = p.parent) if (p.userData.viewHidden) shown = false;
    if (soloNode) { let inSolo = false; for (let p = n; p && p !== S.model; p = p.parent) if (p === soloNode) inSolo = true; shown = shown && inSolo; }
    n.layers.set(shown ? 0 : 1); // (layer 1: not drawn, not picked; the patch's own `visible` stays as it is)
  });
  placements?.layers(S.model); // (placing: the car's own props and plates hidden, as the game hides them under a worn one)
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
for (const id of ['wire', 'bbox', 'hitbox', 'wheels', 'dark']) $(id).addEventListener('change', applyViewFlags);

// ---- the lamp toggles: the game's own lamp effects (render/lampfx.js), laid over the car from its table entry (render/carlights.js
// lampsFor) or, with none, the old hitbox placement; in the model's lampFrame node where the table names one, so they follow
// the body. Built once per model rebuild; the loop only switches meshes on and off (no allocation). Not part of the model:
// the part list, the stats, the bounds, the Blackout and the Z-fight scan leave them out.
const LAMP_IDS = ['lLights', 'lBrake', 'lHazards', 'lLeft', 'lRight', 'lSteady', 'lMarks'];
const LAMP_PARAMS = { lLights: 'lights', lBrake: 'brake', lHazards: 'hazards', lLeft: 'left', lRight: 'right', lSteady: 'steady', lMarks: 'lampmarks' };
for (const id of LAMP_IDS) if (params.has(LAMP_PARAMS[id])) $(id).checked = true;
const FLASH_HZ = 1.2; // (the editor's own clock; the game's flash is 1.4 Hz)
const NIGHT_BG = new THREE.Color(0x0d1119), DAY_BG = new THREE.Color(0xcfd5de);
const fxHit = { hw: 0, hl: 0, height: 0 };
let fx = null, fxLamps = null, fxMarks = null, fxLayout = null, fxKey = null, fxSource = 'none', night = 0;
const inFx = (n) => { for (let p = n; p; p = p.parent) if (p === fx) return true; return false; };
const withoutFx = (fn) => { // (a measure of the model alone)
  const parent = fx && fx.parent;
  if (parent) parent.remove(fx);
  try { return fn(); } finally { if (parent) parent.add(fx); }
};
const buildLamps = (model) => {
  const car = S.car, v = car.real || car, k = car.scale && car.real ? car.scale : 1;
  fxHit.hw = v.hw * k; fxHit.hl = v.hl * k; fxHit.height = v.height * k; // (the hitbox the generic placement is made from)
  fxKey = lampKey(car);
  fx = new THREE.Group();
  fx.name = 'lamp effects';
  addLamps(fx);
  fxLamps = fx.userData.lamps;
  fxLayout = lampsFor(fxKey, fxHit, fxLamps);
  placeLamps(fxLamps, fxLayout);
  fxMarks = makeLampMarkers(fxLayout);
  fx.add(fxMarks);
  (fxLayout.frame && model.userData[fxLayout.frame] || model).add(fx);
  const src = lampSource(fxKey);
  fxSource = !src ? 'generic hitbox placement' : 'table entry (' + src + ')' + (fxLayout.hasHead && fxLayout.hasTail ? '' : ', ' + (fxLayout.hasHead ? 'front' : 'rear') + ' only, the rest generic')
    + (fxLayout.frame ? ', rides in ' + fxLayout.frame : '');
};
const flashPhase = (t) => Math.floor(t * FLASH_HZ * 2) % 2 === 0; // (on for the first half of each cycle)
const FREEZE = params.has('lampt') ? +params.get('lampt') || 0 : null; // (?lampt=<s>: the flash clock held at that time, for a still: 0 is lit, 0.5 dark)
const syncLampView = () => {
  if (!fx) return;
  const t = FREEZE ?? performance.now() / 1000;
  const on = (id) => $(id).checked, dark = on('dark');
  const steady = on('lSteady'), turn = on('lLeft') && !on('lRight') ? 1 : on('lRight') && !on('lLeft') ? -1 : 0, hazards = on('lHazards') || (on('lLeft') && on('lRight'));
  fxLamps.lamps.visible = !dark; // (Blackout: no effects)
  fxMarks.visible = on('lMarks');
  setLampLights(fxLamps, fxLayout, on('lBrake'), steady || flashPhase(t), turn, hazards, false, on('lLights'));
  // the view darkens with Lights on, so the glows read (as ?lamps=night does in the studio)
  const to = on('lLights') ? 1 : 0;
  night += (to - night) * 0.25; if (Math.abs(to - night) < 0.01) night = to;
  scene.background.lerpColors(DAY_BG, NIGHT_BG, night);
  hemi.intensity = 1.4 * (1 - 0.8 * night); sun.intensity = 2.0 * (1 - 0.75 * night); fill.intensity = 0.7 * (1 - 0.7 * night);
  grid.material.opacity = 0.55 * (1 - 0.6 * night);
};
for (const id of LAMP_IDS) $(id).addEventListener('change', () => { syncLampView(); syncUrl(); });

// ---- picking: a tap (not a drag) on a part selects it; the mouse over one shows its box -------------------------
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hit = (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  ray.layers.set(0);
  const hits = ray.intersectObject(S.model, true).filter(h => h.object.isMesh && isShown(h.object) && !inFx(h.object));
  hitPane = null; hitShape = null;
  for (const h of hits) {
    const id = pickable(h.object);
    if (id) { hitPane = paneAt(h.object, h.face); hitShape = shapeAt(h.object, h.faceIndex); return id; }
  }
  return null;
};
let hitPane = null, hitShape = null; // (the window pane / the shape the last hit() landed on: its name / id, or null)
const shapesOf = (node) => S.shapes.filter(r => r.mesh === node);
const shapeAt = (node, faceIndex) => { if (faceIndex == null) return null; const v = faceIndex * 3; const r = S.shapes.find(q => q.mesh === node && v >= q.start && v < q.start + q.count); return r ? r.id : null; };
const panesOf = (node) => node?.geometry?.userData?.panes || (node && S.panes.get(node)) || null; // (cabinGlass's, else a hand-built window's)
const paneAt = (node, face) => { const ps = panesOf(node); if (!ps || !face) return null; const p = ps.find(q => face.a >= q.start && face.a < q.start + q.count); return p ? p.name : null; };
const isShown = (n) => { for (let p = n; p; p = p.parent) if (!p.visible) return false; return true; };
// the part a mesh belongs to: itself, unless it (or a group above it) is locked
const idOf = (node) => { for (const [id, n] of S.nodes) if (n === node) return id; return null; };
const pickable = (node) => {
  for (let p = node; p && p !== S.model; p = p.parent) if (S.locked.has(idOf(p))) return null;
  return idOf(node);
};
// ---- the view's pointers: who takes a finger, the camera (OrbitControls) or the gizmo (TransformControls). Both listen on the canvas, the
// camera first; before this, a finger on a handle was taken by both (the camera then turned off by the gizmo's dragging-changed), a second
// finger during a handle drag moved the part to it and could end the drag, and the camera could be left holding a finger it never saw lifted
// (the next one-finger drag then read as two: a pan, not a turn). Now, ahead of both (a capture listener): the FIRST finger on a handle is the
// gizmo's alone (the camera off before it sees it); any other finger while a handle is dragged is nobody's; a second finger while the camera
// has one makes a camera gesture (pinch, pan: the gizmo off until every finger is up); when the last finger lifts the camera is always on.
const viewPtrs = new Set(), strayPtrs = new Set();
let multiTouch = false; // (more than one finger in this gesture: not a tap)
const ndc = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1, button: -1 }; };
canvas.addEventListener('pointerdown', (e) => {
  if (gizmo.dragging) { strayPtrs.add(e.pointerId); e.stopImmediatePropagation(); return; } // (a palm or a thumb during a handle drag)
  if (!viewPtrs.size) multiTouch = false;
  viewPtrs.add(e.pointerId);
  if (viewPtrs.size > 1) { multiTouch = true; gizmo.enabled = false; gizmo.axis = null; orbit.enabled = true; return; }
  gizmo.enabled = true; orbit.enabled = true;
  if (!gizmo.object || (e.pointerType === 'mouse' && e.button !== 0)) return;
  gizmo.pointerHover(ndc(e)); // (a finger has no hover: is it on a handle?)
  if (gizmo.axis) orbit.enabled = false; // (the camera never sees this one: the gizmo's drag; on again when it is let go)
}, { capture: true });
canvas.addEventListener('pointermove', (e) => { if (strayPtrs.has(e.pointerId)) e.stopImmediatePropagation(); }, { capture: true });
const letGo = (e) => {
  if (strayPtrs.delete(e.pointerId)) { e.stopImmediatePropagation(); return; }
  viewPtrs.delete(e.pointerId);
  if (!viewPtrs.size) { gizmo.enabled = true; if (!gizmo.dragging) orbit.enabled = true; } // (a handle's drag: on again by dragging-changed, just after)
};
canvas.addEventListener('pointerup', letGo, { capture: true });
canvas.addEventListener('pointercancel', letGo, { capture: true });
let down = null, lastTap = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (placements?.on) { down = null; return; } // (placing: the tab's own taps)
  if (!down || gizmo.dragging || multiTouch) { down = null; return; }
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), long = performance.now() - down.t;
  down = null;
  if (moved > 8 || long > 600 || gizmoHot) return;
  const id = hit(e), now = performance.now();
  // a double tap on a part: Fit (the camera on it)
  if (id && lastTap && lastTap.id === id && now - lastTap.t < 450 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) { lastTap = null; if (S.sel !== id) select(id, true, hitPane, hitShape); fitSelected(); return; }
  lastTap = { id, t: now, x: e.clientX, y: e.clientY };
  select(id, true, hitPane, hitShape);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons || placements?.on) return;
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

const select = (id, show = true, pane = undefined, shape = undefined) => {
  S.sel = id && S.nodes.has(id) ? id : null;
  const node = S.sel ? S.nodes.get(S.sel) : null;
  selBox.visible = !!node;
  if (node) selBox.setFromObject(node);
  hoverBox.visible = false;
  // its window pane (kept across a rebuild when the same part is selected again), and its partner across the car
  const ps = panesOf(node);
  if (pane !== undefined) S.pane = pane;
  const at = ps && S.pane && ps.find(q => q.name === S.pane || sameWindow(q.name, S.pane)); // (?pane=rear glass finds the rear window)
  S.pane = at ? at.name : null;
  // the gizmo: on the PANE when one is picked (it moves, turns and sizes that pane alone: render/paneedit.js), else on the part
  const sp = node && !S.locked.has(S.sel) ? paneSel() : null;
  if (sp) gizmo.attach(placeProxy(sp)); else if (node && !S.locked.has(S.sel)) gizmo.attach(node); else gizmo.detach();
  if (S.pane) selBox.visible = false; // (a pane: its own outline, not its whole part's box)
  drawPane();
  if (shape !== undefined && shape !== S.shape) { S.shape = shape; S.pt = -1; }
  if (!node || !shapesOf(node).some(r => r.id === S.shape)) S.shape = null;
  drawShape();
  const twin = S.sel && mirrorPartner(partOf(S.sel));
  twinBox.visible = !!twin;
  if (twin) twinBox.setFromObject(S.nodes.get(twin));
  document.querySelectorAll('.prow').forEach(r => r.classList.toggle('sel', r.dataset.id === S.sel));
  document.querySelectorAll('#windows [data-wpart]').forEach(b => b.classList.toggle('on', b.dataset.wpart === S.sel && b.dataset.wpane === S.pane));
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
  if (gizmo.object === paneProxy) { const sp = paneSel(); if (sp) setPaneEdit(sp, proxyEdit(sp), ({ translate: 'moved', rotate: 'turned', scale: 'sized' })[gizmo.getMode()]); return; }
  const node = S.nodes.get(S.sel), part = partOf(S.sel);
  if (!node || !part) return;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  commit(setFor(S.patch, part, {
    position: node.position.toArray().map(r3), rotation: [node.rotation.x, node.rotation.y, node.rotation.z].map(r3), scale: node.scale.toArray().map(r3),
  }), (part.name || part.role) + ' ' + ({ translate: 'moved', rotate: 'turned', scale: 'scaled' })[gizmo.getMode()] + mirrorWords(part));
});
gizmo.addEventListener('objectChange', () => {
  if (gizmo.object === paneProxy) { const sp = paneSel(); if (sp) { paneProxy.scale.z = 1; applyPaneEdit(sp.node, S.model, sp.pane, proxyEdit(sp)); drawPane(); } } // (a look while it is dragged; the patch on letting go)
  if (S.sel) selBox.setFromObject(S.nodes.get(S.sel));
});

// ---- MIRROR: the part across the car gets the same edit, mirrored (render/modelpatch.js symmetryOf, mirroredTransform) ---------------------
// the partner's id when Mirror is on and the part has one (never its own mirror copy, which follows it anyway)
const mirrorPartner = (part) => {
  if (!S.mirror || !part) return null;
  const twin = S.sym.get(part.id)?.partner;
  if (!twin || twin === 'm:' + part.id || part.id === 'm:' + twin || !S.nodes.has(twin)) return null;
  return twin;
};
const mirrorWords = (part) => { const twin = mirrorPartner(part); return twin ? ', and its mirror ' + labelOf(partOf(twin)) + ' [' + twin + '].' : '.'; };
// withSet for the part, and the mirrored set for its partner (one commit: one undo)
const setFor = (patch, part, values, opts = {}) => {
  let p = withSet(patch, part, values, opts);
  const twin = mirrorPartner(part);
  if (!twin) return p;
  const tp = partOf(twin), vals = { ...values };
  delete vals.name; delete vals.role; delete vals.parent;
  if (vals.position || vals.rotation || vals.scale) Object.assign(vals, mirroredTransform(S.model, S.nodes.get(part.id), part, S.nodes.get(twin), tp, values));
  if (Object.keys(vals).length) p = withSet(p, tp, vals, opts);
  return p;
};
const syncMirror = () => { $('mirrorMode').textContent = 'Mirror: ' + (S.mirror ? 'on' : 'off'); $('mirrorMode').classList.toggle('on', S.mirror); };
$('mirrorMode').addEventListener('click', () => { S.mirror = !S.mirror; syncMirror(); if (S.sel) select(S.sel); else syncUrl(); drawShape(); status('Mirror ' + (S.mirror ? 'on: an edit goes to the part across the car too.' : 'off: one side only.')); });
syncMirror();

// ---- WINDOW PANES: the selected pane's outline in the view, and its edges redrawn in a side view (the Part tab) -----------------------------
const drawPane = () => {
  const node = S.sel && S.nodes.get(S.sel), ps = panesOf(node), pane = ps && ps.find(q => q.name === S.pane);
  paneLines.visible = !!pane;
  if (!pane) return;
  // the boundary: the pane's triangle edges used once, in model space (the mesh's own place honoured)
  S.model.updateMatrixWorld(true);
  const pos = node.geometry.attributes.position, idx = node.geometry.index?.array, edges = new Map(), v = new THREE.Vector3();
  const key = (i) => { v.fromBufferAttribute(pos, i); return v.toArray().map(c => Math.round(c * 10000)).join(','); };
  const tris = []; // (the pane's triangles: a run of vertices, read through the index for an indexed geometry: a hand-built box)
  if (idx) { for (let t = 0; t + 2 < idx.length; t += 3) if (idx[t] >= pane.start && idx[t] < pane.start + pane.count) tris.push([idx[t], idx[t + 1], idx[t + 2]]); }
  else for (let t = pane.start; t + 2 < pane.start + pane.count; t += 3) tris.push([t, t + 1, t + 2]);
  for (const tri of tris) for (let k = 0; k < 3; k++) {
    const a = tri[k], b = tri[(k + 1) % 3], id = [key(a), key(b)].sort().join('|');
    if (!edges.has(id)) edges.set(id, { a, b, n: 0 });
    edges.get(id).n++;
  }
  const out = [];
  for (const e of edges.values()) if (e.n === 1) { out.push(...v.fromBufferAttribute(pos, e.a).toArray(), ...v.fromBufferAttribute(pos, e.b).toArray()); }
  paneLines.geometry.dispose();
  paneLines.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  paneLines.matrix.copy(node.matrixWorld); paneLines.matrixAutoUpdate = false;
};
// the key the edit is stored under: both flanks as one ('door window') with Mirror on, else this flank's ('door window L'); a screen its own name
// (keys are CANONICAL, render/glassnames.js windowKey: an edit stored as 'door glass' or 'rear glass' is the same window's; every spelling of
// it is replaced when it is edited: withGlass)
const paneKey = (pane) => (pane.kind === 'side' && S.mirror ? windowBase(pane.name) : windowKey(pane.name));
const paneTwin = (pane) => (pane.kind === 'side' ? windowBase(pane.name) + (pane.side > 0 ? ' R' : ' L') : null);
// the patch's entry for this pane: its own (this flank's) or the shared one (both flanks), as the table spells it
const storedFor = (pane) => { const t = canonTable(glassTable(S.patch)); return t.get(windowKey(pane.name))?.from ?? (pane.kind === 'side' ? t.get(windowBase(pane.name))?.from : null) ?? null; };
const setPane = (pane, edges, words) => {
  let p = withGlass(S.patch, paneKey(pane), edges);
  if (pane.kind === 'side' && S.mirror) { p = withGlass(p, pane.name, null); p = withGlass(p, paneTwin(pane), null); } // (a flank's own edit gives way to the shared one)
  commit(p, pane.name + ': ' + words + (pane.kind === 'side' && S.mirror ? ' (both flanks)' : '') + '.');
};
const resetPane = (pane) => {
  let p = withGlass(S.patch, pane.name, null);
  if (pane.kind === 'side') {
    const shared = canonTable(glassTable(p)).get(windowBase(pane.name));
    if (S.mirror) { p = withGlass(p, windowBase(pane.name), null); p = withGlass(p, paneTwin(pane), null); }
    else if (shared) p = withGlass(p, pane.name, pane.auto); // (the other flank keeps the shared edit: this one is pinned to the automatic outline)
  }
  commit(p, pane.name + ': back to the automatic outline.');
};
// ---- ONE PANE ON ITS OWN (CHECKLIST 462, render/paneedit.js): the gizmo on a stand-in at the pane's centre, its axes the pane's own (X across,
// Y up its face, Z out of it), so Move / Turn / Size act on that pane alone; letting go writes the patch's `panes` entry (one undo)
const paneProxy = new THREE.Object3D();
scene.add(paneProxy);
const paneSel = () => {
  const node = S.sel && S.nodes.get(S.sel), part = partOf(S.sel), pane = S.pane && panesOf(node)?.find(q => q.name === S.pane);
  if (!node?.isMesh || !part || !pane) return null;
  const key = paneKeyOf(part.id, pane.name), e = S.patch.panes?.[key];
  return { node, part, pane, key, f: paneFrame(node, S.model, pane), edit: { move: e?.move || [0, 0, 0], turn: e?.turn || [0, 0, 0], size: e?.size || [1, 1] } };
};
const basisQ = (f) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.u, f.v, f.n));
const placeProxy = (sp) => {
  const { f, edit } = sp;
  paneProxy.position.set(f.c.x + edit.move[0], f.c.y + edit.move[1], f.c.z + edit.move[2]).applyMatrix4(S.model.matrixWorld);
  paneProxy.quaternion.setFromRotationMatrix(turnMatrix(edit.turn)).multiply(basisQ(f));
  paneProxy.scale.set(edit.size[0], edit.size[1], 1);
  paneProxy.updateMatrixWorld(true);
  return paneProxy;
};
const r3p = (v) => Math.round(v * 1000) / 1000;
const proxyEdit = (sp) => {
  const p = paneProxy.position.clone().applyMatrix4(S.model.matrixWorld.clone().invert());
  const R = new THREE.Matrix4().makeRotationFromQuaternion(paneProxy.quaternion.clone().multiply(basisQ(sp.f).invert()));
  return { move: [p.x - sp.f.c.x, p.y - sp.f.c.y, p.z - sp.f.c.z].map(r3p), turn: turnOf(R), size: [Math.max(0.05, paneProxy.scale.x), Math.max(0.05, paneProxy.scale.y)].map(r3p) };
};
// the pane across the car (its name with L / R swapped, in any window part), for Mirror
const paneTwinOf = (sp) => {
  const m = / ([LR])$/.exec(sp.pane.name); if (!m || !S.mirror) return null;
  const name = sp.pane.name.slice(0, -1) + (m[1] === 'L' ? 'R' : 'L');
  for (const p of S.parts) { if (!p.panes?.includes(name)) continue; const q = panesOf(S.nodes.get(p.id))?.find(x => x.name === name); if (q) return { part: p, pane: q }; }
  return null;
};
const setPaneEdit = (sp, edit, words) => {
  let p = withPane(S.patch, sp.part, sp.pane, edit);
  const twin = paneTwinOf(sp);
  if (twin) p = withPane(p, twin.part, twin.pane, mirroredEdit(edit));
  commit(p, sp.pane.name + ' ' + words + (twin ? ' (and ' + twin.pane.name + ')' : '') + '.');
};
// what the pane rests on, and its gap: render/paneedit.js
const paneRest = (sp) => restItems(S.model, { parts: S.parts, nodes: S.nodes, panes: new Map(S.parts.filter(p => p.panes?.length).map(p => [p.id, panesOf(S.nodes.get(p.id)) || []])) }, isWindowPart, sp.node, sp.pane);
const paneGapNow = (sp) => withoutFx(() => gapOf(rimPoints(sp.node, S.model, sp.pane), paneRest(sp)));
let lastSnap = null; // (the last Snap's line: shown under the pane's fields)
const snapSel = () => {
  const sp = paneSel(); if (!sp) return;
  const pivot = sp.f.c.clone().add(new THREE.Vector3(...sp.edit.move));
  const sn = withoutFx(() => snapPane(paneSamples(sp.node, S.model, sp.pane), paneRest(sp), pivot));
  if (!sn) { lastSnap = { key: sp.key, words: '—' }; status(sp.pane.name + ': nothing to close (no body within 15 cm, or it rests).'); renderPart(); return; }
  lastSnap = { key: sp.key, words: '↦ ' + (sn.moved * 100).toFixed(1) + ' cm · ' + sn.turned + '° · gap ' + (sn.before.gap * 100).toFixed(1) + ' → ' + (sn.after.gap * 100).toFixed(1) + ' cm' };
  setPaneEdit(sp, snappedEdit(sp.edit, sn), 'snapped to the body: ' + lastSnap.words);
};
const paneBlock = (sp) => {
  const { f, edit } = sp, g = paneGapNow(sp), cm = (m) => (m * 100).toFixed(1);
  const c = [f.c.x + edit.move[0], f.c.y + edit.move[1], f.c.z + edit.move[2]];
  const row = (k, label, vals, step) => '<div class="vec" data-pv="' + k + '"><span>' + label + '</span>' + vals.map(v => num(v, step)).join('') + '</div>';
  return '<div id="paneBox"><h2 style="margin-top:12px">' + esc(sp.pane.name) + ' <span class="small">pane</span> <button id="paneWhole" title="The whole part">Part</button></h2>'
    + '<p class="kv"><span class="chip' + (g.gap > 0.01 ? ' bad' : '') + '" id="paneGap">gap ' + cm(g.gap) + ' cm</span> <span class="chip">clear ' + (g.clear >= 0.3 ? '30+' : cm(g.clear)) + ' cm</span></p>'
    + row('pos', 'XYZ', c, 0.005) + row('turn', '° YPR', edit.turn, 1) + row('size', 'W H', [f.width * edit.size[0], f.height * edit.size[1]], 0.01)
    + '<div class="buttons"><button id="paneSnap" title="Rest its edges on the body">Snap</button><button id="paneReset" title="As built">Reset</button></div>'
    + (lastSnap && lastSnap.key === sp.key ? '<p class="kv" id="paneSnapLine">' + esc(lastSnap.words) + '</p>' : '') + '</div>';
};
const wirePaneBlock = (box, sp) => {
  box.querySelectorAll('[data-pv]').forEach(r => r.addEventListener('change', () => {
    const k = r.dataset.pv, v = [...r.querySelectorAll('input')].map(i => +i.value || 0), e = { ...sp.edit };
    if (k === 'pos') e.move = [v[0] - sp.f.c.x, v[1] - sp.f.c.y, v[2] - sp.f.c.z].map(r3p);
    else if (k === 'turn') e.turn = v.map(x => Math.round(x * 100) / 100);
    else e.size = [Math.max(0.05, v[0] / Math.max(1e-6, sp.f.width)), Math.max(0.05, v[1] / Math.max(1e-6, sp.f.height))].map(r3p);
    setPaneEdit(sp, e, ({ pos: 'moved', turn: 'turned', size: 'sized' })[k]);
  }));
  box.querySelector('#paneSnap')?.addEventListener('click', snapSel);
  box.querySelector('#paneReset')?.addEventListener('click', () => setPaneEdit(sp, null, 'as built'));
  box.querySelector('#paneWhole')?.addEventListener('click', () => select(S.sel, true, null));
};
const GW = 340, GH = 200, GPAD = 16;
// sx: +1 the nose (+z) to the right, -1 to the left, as the camera shows the car (the Left view's nose to the left: screenFlips)
const glassFit = (pane, zoom = false, sx = 1) => {
  const c = pane.cabin, own = pane.kind === 'side' ? [...pane.now, ...pane.auto] : [pane.now.foot, pane.now.top, pane.auto.foot, pane.auto.top];
  const pts = zoom ? own : [...c.chain, ...c.profile.filter(q => q[1] >= c.belt - 0.35)];
  const zs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const mz = zoom ? Math.max(0.12, (Math.max(...zs) - Math.min(...zs)) * 0.35) : 0, my = zoom ? Math.max(0.12, (Math.max(...ys) - Math.min(...ys)) * 0.35) : 0; // (Zoom: the window, its automatic outline and a margin)
  const z0 = Math.min(...zs) - 0.1 - mz, z1 = Math.max(...zs) + 0.1 + mz, y0 = Math.min(...ys) - 0.05 - my, y1 = Math.max(...ys) + 0.08 + my;
  const k = Math.min((GW - 2 * GPAD) / Math.max(0.3, z1 - z0), (GH - 2 * GPAD) / Math.max(0.3, y1 - y0));
  return { k, sx, x: (z) => GW / 2 + sx * (z - (z0 + z1) / 2) * k, y: (y) => GH / 2 - (y - (y0 + y1) / 2) * k, z: (px) => sx * (px - GW / 2) / k + (z0 + z1) / 2, v: (py) => -(py - GH / 2) / k + (y0 + y1) / 2 };
};
const paneFlip = () => screenFlips({ H: 2, V: 1 })[0]; // (which way +z runs on the screen just now; end on: +1)
const inside = (poly, [z, y]) => { let on = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) on = !on; } return on; };
const nearest = ([a, b], [z, y]) => { const dz = b[0] - a[0], dy = b[1] - a[1], l2 = dz * dz + dy * dy; const t = Math.max(0.02, Math.min(0.98, l2 ? ((z - a[0]) * dz + (y - a[1]) * dy) / l2 : 0)); return [a[0] + dz * t, a[1] + dy * t]; };
const r3g = (q) => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000];
// the picked corner (kept across the rebuild a commit makes, for the same window) and the nudge step
const gPick = { pane: null, i: -1, step: NUDGE_STEPS[1], zoom: true, sx: 1, side: false }; // (Zoom on: the drawing framed on the window, its corners apart)
const pickedIn = (pane, n) => (gPick.pane === pane.name && gPick.i >= 0 && gPick.i < n ? gPick.i : -1);
const cornerWords = (pane, i, names) => (i + 1) + ' ' + names[i];
const GHIT = 24; // (CSS px: a tap this close to a corner picks it, a 48 px target for a finger)
const paneEditor = (node, pane) => {
  gPick.side = pane.kind === 'side'; gPick.sx = gPick.side ? paneFlip() : 1; // (a side window drawn as the camera shows its flank; a screen in profile, nose to the right)
  const f = glassFit(pane, gPick.zoom, gPick.sx), c = pane.cabin, ps = panesOf(node);
  const path = (pts, close = true) => pts.map((q, i) => (i ? 'L' : 'M') + f.x(q[0]).toFixed(1) + ' ' + f.y(q[1]).toFixed(1)).join(' ') + (close ? ' Z' : '');
  const side = pane.kind === 'side';
  const now = side ? pane.now : [pane.now.foot, pane.now.top], auto = side ? pane.auto : [pane.auto.foot, pane.auto.top];
  const names = side ? cornerNames(now) : ['foot', 'top'], sel = pickedIn(pane, now.length);
  const cz = now.reduce((a, q) => a + q[0], 0) / now.length, cy = now.reduce((a, q) => a + q[1], 0) / now.length;
  const order = now.map((q, i) => i).filter(i => i !== sel).concat(sel >= 0 ? [sel] : []); // (the picked corner drawn on top)
  const handles = order.map(i => {
    const q = now[i], x = f.x(q[0]), y = f.y(q[1]), on = i === sel, r = on ? 13 : 11;
    const lx = side ? (q[0] >= cz ? f.sx : -f.sx) : 1, ly = side ? (q[1] >= cy ? -1 : 1) : 0; // (the name outside the pane, away from its middle)
    return '<g class="gh' + (on ? ' on' : '') + '" data-gp="' + i + '"><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + (on ? '#ff8c42' : '#ffd23f') + '" stroke="' + (on ? '#ffffff' : '#1b2029') + '" stroke-width="' + (on ? 2.5 : 1.5) + '"/>'
      + '<text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" font-size="13" font-weight="700" text-anchor="middle" fill="#1b2029">' + (i + 1) + '</text>'
      + '<text class="gname" x="' + (x + lx * 15).toFixed(1) + '" y="' + (y + ly * 14 + 4).toFixed(1) + '" font-size="10" text-anchor="' + (lx > 0 ? 'start' : 'end') + '">' + names[i] + '</text></g>';
  }).join('');
  const stored = storedFor(pane);
  const canReset = sel >= 0 && auto.length === now.length && (Math.abs(auto[sel][0] - now[sel][0]) > 1e-4 || Math.abs(auto[sel][1] - now[sel][1]) > 1e-4);
  const fwd = ['front', '▶', 'Toward the front'], back = ['rear', '◀', 'Toward the rear'];
  if (f.sx < 0) { fwd[1] = '◀'; back[1] = '▶'; } // (the arrows as the drawing runs: nose left, ◀ is toward the front)
  const nudges = side ? [f.sx < 0 ? fwd : back, ['up', '▲', 'Up'], ['down', '▼', 'Down'], f.sx < 0 ? back : fwd] : [['down', '▼', 'Down the pillar'], ['up', '▲', 'Up the pillar']];
  return '<h2 id="gHead" style="margin-top:12px">Window: ' + esc(pane.name) + ' <span class="small">' + (side ? 'nose to the ' + (f.sx < 0 ? 'left' : 'right') + ' · tap or drag a numbered corner' : 'its foot and top slide along the pillar') + '</span></h2>'
    + '<div class="panes">' + ps.map(q => '<button data-pane="' + esc(q.name) + '" class="' + (q.name === pane.name ? 'on' : '') + (q.edited ? ' edited' : '') + '" title="' + (q.edited ? 'edited' : 'automatic') + '">' + esc(q.name) + '</button>').join('') + '</div>'
    + '<svg id="glassSvg" class="glass" viewBox="0 0 ' + GW + ' ' + GH + '">'
    + '<path d="' + path(c.profile) + '" fill="#2a3446" stroke="#5a6678" stroke-width="1"/>'            // the body's profile
    + '<path d="' + path(c.chain) + '" fill="none" stroke="#9fb0c8" stroke-width="1.2"/>'               // the cabin outline, closed along the belt: the limit
    + ps.filter(q => q !== pane && q.kind === 'side' && q.side === pane.side).map(q => '<path d="' + path(q.now) + '" fill="#3b4a63" stroke="#6b7a94" stroke-width="1"/>').join('')
    + ps.filter(q => q !== pane && q.kind === 'screen').map(q => '<path d="' + path([q.now.foot, q.now.top], false) + '" fill="none" stroke="#6b7a94" stroke-width="3"/>').join('')
    + '<path d="' + path(auto, side) + '" fill="none" stroke="#ffd23f" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>'  // the automatic outline
    + (side ? '<path id="glassNow" d="' + path(now) + '" fill="#4f6a95" fill-opacity="0.8" stroke="#ffd23f" stroke-width="1.5"/>' : '<path id="glassNow" d="' + path(now, false) + '" fill="none" stroke="#ffd23f" stroke-width="4"/>')
    + handles + '</svg>'
    + '<p class="gread" id="gRead">' + (sel >= 0 ? cornerReadout(pane, now[sel], auto.length === now.length ? auto[sel] : null, sel, names) : 'Tap a corner to pick it') + '</p>'
    + '<div class="gnudge">' + nudges.map(([d, a, t]) => '<button data-gn="' + d + '" title="' + t + '"' + (sel >= 0 ? '' : ' disabled') + '>' + a + '</button>').join('')
    + '<span class="seg">' + NUDGE_STEPS.map(s => '<button data-gstep="' + s + '" class="' + (s === gPick.step ? 'on' : '') + '">' + stepWords(s) + '</button>').join('') + '</span></div>'
    + '<div class="buttons"><button id="gCorner"' + (canReset ? '' : ' disabled') + ' title="The picked corner back to its automatic place">Reset corner</button><button id="gUndo"' + (S.at > 0 ? '' : ' disabled') + '>Undo</button><button id="gZoom">' + (gPick.zoom ? 'Zoom out' : 'Zoom in') + '</button></div>'
    + '<div class="pts gpts"><div class="vec"><span>corner</span><span>z (along)</span><span>y (up)</span><span></span><span></span></div>' + now.map((q, i) => '<div class="vec' + (i === sel ? ' on' : '') + '" data-grow="' + i + '"><span>' + cornerWords(pane, i, names) + '</span>' + num(q[0], 0.01) + num(q[1], 0.01)
      + (side ? '<button data-gadd="' + i + '" title="A corner after this one">+</button><button data-gdel="' + i + '" title="Remove this corner"' + (now.length <= 3 ? ' disabled' : '') + '>×</button>' : '<span></span><span></span>') + '</div>').join('') + '</div>'
    + '<p class="kv">' + (stored ? 'Edited: stored as "' + esc(stored) + '" in the patch\'s glass table' + (side && windowKey(stored) === paneKey(pane) && S.mirror ? ' (both flanks)' : '') : 'Automatic (from the body\'s profile)') + (side ? '. Mirror ' + (S.mirror ? 'on: an edit goes to both flanks.' : 'off: this flank only.') : '') + '</p>'
    + '<div class="buttons"><button id="gReset"' + (pane.edited || stored ? '' : ' disabled') + '>Reset window</button></div>';
};
// the picked corner's place, read out (live while it is dragged)
const cornerReadout = (pane, q, a, i, names) => '<b>' + esc(cornerWords(pane, i, names)) + '</b> z ' + q[0].toFixed(3) + ' · y ' + q[1].toFixed(3)
  + (a ? ' <span class="small">(auto ' + a[0].toFixed(2) + ', ' + a[1].toFixed(2) + ')</span>' : '') + (pane.kind === 'side' && S.mirror ? ' <span class="small">both sides</span>' : '');
const wirePaneEditor = (box, node, pane) => {
  box.querySelectorAll('[data-pane]').forEach(b => b.addEventListener('click', () => select(S.sel, true, b.dataset.pane)));
  const side = pane.kind === 'side', f = glassFit(pane, gPick.zoom, gPick.sx);
  const now = (side ? pane.now : [pane.now.foot, pane.now.top]).map(q => q.slice());
  const auto = side ? pane.auto : [pane.auto.foot, pane.auto.top], names = side ? cornerNames(now) : ['foot', 'top'];
  const pack = (pts) => (side ? pts.map(r3g) : { foot: r3g(pts[0]), top: r3g(pts[1]) });
  const edge = side ? null : pane.edge;
  const clamp = (i, q, prev) => {
    if (side) return inside(pane.cabin.chain, q) ? q : prev;
    const on = nearest(edge, q); // (a screen's foot and top stay on the pillar's slope, the foot below the top)
    const other = now[1 - i];
    return (i === 0 ? on[1] < other[1] - 0.02 : on[1] > other[1] + 0.02) ? on : prev;
  };
  const pick = (i) => { gPick.pane = pane.name; gPick.i = i; };
  const sel = () => pickedIn(pane, now.length);
  box.querySelectorAll('[data-grow] input').forEach(inp => inp.addEventListener('focus', () => { const i = +inp.closest('[data-grow]').dataset.grow; if (sel() !== i) { pick(i); markPick(); } }));
  box.querySelectorAll('[data-grow]').forEach(row => row.addEventListener('change', () => {
    const i = +row.dataset.grow, [a, b] = [...row.querySelectorAll('input')].map(x => +x.value || 0), next = now.map(q => q.slice());
    pick(i); next[i] = clamp(i, [a, b], now[i]); setPane(pane, pack(next), 'corner ' + cornerWords(pane, i, names) + ' set');
  }));
  box.querySelectorAll('[data-gadd]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.gadd, a = now[i], c2 = now[(i + 1) % now.length], next = now.map(q => q.slice());
    next.splice(i + 1, 0, [(a[0] + c2[0]) / 2, (a[1] + c2[1]) / 2]); pick(i + 1); setPane(pane, pack(next), 'corner ' + (i + 2) + ' added');
  }));
  box.querySelectorAll('[data-gdel]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.gdel; if (now.length > 3) { pick(-1); setPane(pane, pack(now.filter((_, j) => j !== i)), 'corner ' + cornerWords(pane, i, names) + ' removed'); } }));
  box.querySelector('#gReset')?.addEventListener('click', () => { pick(-1); resetPane(pane); });
  box.querySelector('#gUndo')?.addEventListener('click', () => undo(-1));
  box.querySelector('#gZoom')?.addEventListener('click', () => { gPick.zoom = !gPick.zoom; renderPart(); });
  box.querySelector('#gCorner')?.addEventListener('click', () => {
    const i = sel(); if (i < 0 || auto.length !== now.length) return;
    const next = now.map(q => q.slice()); next[i] = auto[i].slice();
    setPane(pane, pack(next), 'corner ' + cornerWords(pane, i, names) + ' back to automatic');
  });
  box.querySelectorAll('[data-gstep]').forEach(b => b.addEventListener('click', () => { gPick.step = +b.dataset.gstep; box.querySelectorAll('[data-gstep]').forEach(x => x.classList.toggle('on', x === b)); }));
  box.querySelectorAll('[data-gn]').forEach(b => b.addEventListener('click', () => {
    const i = sel(); if (i < 0) return;
    const next = now.map(q => q.slice()), to = clamp(i, nudged(now[i], b.dataset.gn, gPick.step, edge), now[i]);
    if (to === now[i]) { const why = side ? 'the cabin outline stops it there.' : 'the pillar ends there.'; status('Corner ' + cornerWords(pane, i, names) + ': ' + why); const el = $('gRead'); if (el) el.innerHTML = cornerReadout(pane, now[i], auto.length === now.length ? auto[i] : null, i, names) + ' <span class="bad">' + why + '</span>'; return; } // (said by the drawing too: on a phone the status line is scrolled away)
    next[i] = to; setPane(pane, pack(next), 'corner ' + cornerWords(pane, i, names) + ' nudged ' + b.dataset.gn + ' ' + stepWords(gPick.step));
  }));
  const svg = box.querySelector('#glassSvg'), groups = new Map([...svg.querySelectorAll('[data-gp]')].map(g => [+g.dataset.gp, g]));
  const readout = (i, q) => { const el = $('gRead'); if (el) el.innerHTML = cornerReadout(pane, q, auto.length === now.length ? auto[i] : null, i, names); };
  // the picked corner lit without a rebuild (a tap that does not move it): its handle, its row, the readout, the buttons that need one
  const markPick = () => {
    const i = sel();
    groups.forEach((g, j) => {
      const on = j === i, c = g.querySelector('circle');
      g.classList.toggle('on', on); c.setAttribute('r', on ? 13 : 11); c.setAttribute('fill', on ? '#ff8c42' : '#ffd23f'); c.setAttribute('stroke', on ? '#ffffff' : '#1b2029'); c.setAttribute('stroke-width', on ? 2.5 : 1.5);
      if (on) svg.appendChild(g); // (on top)
    });
    box.querySelectorAll('[data-grow]').forEach(r => r.classList.toggle('on', +r.dataset.grow === i));
    box.querySelectorAll('[data-gn]').forEach(b => { b.disabled = i < 0; });
    const rc = box.querySelector('#gCorner');
    if (rc) rc.disabled = !(i >= 0 && auto.length === now.length && (Math.abs(auto[i][0] - now[i][0]) > 1e-4 || Math.abs(auto[i][1] - now[i][1]) > 1e-4));
    if (i >= 0) readout(i, now[i]);
  };
  // the corner nearest a pointer, within GHIT CSS px (the whole drawing listens: a finger need not land on the dot)
  const toView = (ev) => { const r = svg.getBoundingClientRect(); return { px: (ev.clientX - r.left) * GW / r.width, py: (ev.clientY - r.top) * GH / r.height, s: r.width / GW }; };
  const nearestCorner = (ev) => {
    const { px, py, s } = toView(ev);
    let best = -1, bd = Infinity;
    now.forEach((q, i) => { const d = Math.hypot(f.x(q[0]) - px, f.y(q[1]) - py) * s; if (d < bd || (d === bd && i === sel())) { bd = d; best = i; } });
    return bd <= GHIT ? best : -1;
  };
  svg.addEventListener('pointermove', (ev) => { if (ev.buttons) return; const i = nearestCorner(ev); groups.forEach((g, j) => g.classList.toggle('hov', j === i)); svg.classList.toggle('near', i >= 0); });
  svg.addEventListener('pointerleave', () => { groups.forEach(g => g.classList.remove('hov')); svg.classList.remove('near'); });
  svg.addEventListener('pointerdown', (e) => {
    const i = nearestCorner(e);
    if (i < 0) return;
    e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch { /* (a pointer the page did not see go down) */ }
    pick(i); markPick();
    const g = groups.get(i), next = now.map(q => q.slice()), c0 = now[i].slice(), { px: px0, py: py0 } = toView(e);
    let moved = false;
    const move = (ev) => {
      const { px, py } = toView(ev);
      if (!moved && Math.hypot(px - px0, py - py0) < 2) return;
      moved = true;
      next[i] = clamp(i, [Math.round((c0[0] + f.sx * (px - px0) / f.k) * 200) / 200, Math.round((c0[1] - (py - py0) / f.k) * 200) / 200], next[i]); // (to 5 mm, from where it was: no jump on touch)
      const x = f.x(next[i][0]), y = f.y(next[i][1]), [dot, nr, nm] = [g.querySelector('circle'), ...g.querySelectorAll('text')];
      const dx = +nm.getAttribute('x') - +dot.getAttribute('cx'), dy = +nm.getAttribute('y') - +dot.getAttribute('cy');
      dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1));
      nr.setAttribute('x', x.toFixed(1)); nr.setAttribute('y', (y + 4).toFixed(1));
      nm.setAttribute('x', (x + dx).toFixed(1)); nm.setAttribute('y', (y + dy).toFixed(1));
      $('glassNow').setAttribute('d', next.map((q, j) => (j ? 'L' : 'M') + f.x(q[0]).toFixed(1) + ' ' + f.y(q[1]).toFixed(1)).join(' ') + (side ? ' Z' : ''));
      readout(i, next[i]);
      const ins = box.querySelectorAll('[data-grow="' + i + '"] input'); if (ins.length === 2) { ins[0].value = next[i][0]; ins[1].value = next[i][1]; }
    };
    const up = () => {
      svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up);
      if (moved) setPane(pane, pack(next), 'corner ' + cornerWords(pane, i, names) + ' moved');
    };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  });
};
// ---- SHAPES: the selected outline on the car (yellow, its points numbered) and its points in a side / top / front view (the Part tab) ------
const shapeById = (id) => S.shapes.find(r => r.id === id) || null;
const numberTex = new Map(); // (a number's sprite picture, made once)
const numberSprite = (n, on) => {
  const k = n + (on ? '*' : '');
  if (!numberTex.has(k)) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = on ? '#ff8c42' : '#ffd23f'; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#1b2029'; g.stroke();
    g.fillStyle = '#1b2029'; g.font = 'bold ' + (n >= 10 ? 28 : 34) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 32, 34);
    numberTex.set(k, new THREE.CanvasTexture(c));
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: numberTex.get(k), depthTest: false, sizeAttenuation: false }));
  sp.scale.setScalar((on ? 34 : 26) / Math.max(200, canvas.clientHeight) / 1.6); sp.renderOrder = on ? 14 : 13; // (about 26 px across whatever the view's size; the picked one 34)
  return sp;
};
// (live: the points being dragged on the view, before they are committed; the partner's mirrored with them)
let shapeHandles = []; // (the numbers drawn on the car: [{ i, pos (model space) }], for picking them with a finger)
const drawShape = (live = null) => {
  for (const c of shapeMarks.children) { if (!c.isSprite) c.geometry?.dispose(); c.material?.dispose(); } // (a number's picture is kept: numberTex; sprites share one geometry)
  shapeMarks.clear(); shapeHandles = [];
  let rec = S.shape && shapeById(S.shape);
  document.body.classList.toggle('shaping', !!rec); // (a phone: the view's extra toggles step aside for the handles, modeleditor.css)
  if (!rec) return;
  // (of a mirrored pair, the handles go on the one facing the camera: the edit is the same either way)
  const near = shapeTwin(rec), dist = (r) => { const at = outlineInModel(r, openPts(r.now), 0); return at.length ? at.reduce((c, q) => c.add(q), new THREE.Vector3()).multiplyScalar(1 / at.length).applyMatrix4(S.model.matrixWorld).distanceTo(camera.position) : Infinity; };
  if (!live && near && dist(near) < dist(rec) - 0.1) { S.shape = near.id; rec = near; if (S.tab === 'part') renderPart(); syncUrl(); }
  if (S.model) { shapeMarks.matrix.copy(S.model.matrixWorld); shapeMarks.matrixAutoUpdate = false; }
  const pts = live || openPts(rec.now);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffd23f, depthTest: false });
  const faces = rec.kind === 'extrude' ? [0, rec.opts.depth] : [0];
  for (const w of faces) {
    const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(outlineInModel(rec, pts, w)), lineMat);
    loop.renderOrder = 12; shapeMarks.add(loop);
  }
  const twin = shapeTwin(rec);
  if (twin) {
    const tp = live ? mirrorPoints(rec, twin, live) : twin.now;
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(outlineInModel(twin, tp, 0)), new THREE.LineBasicMaterial({ color: 0xff8c42, depthTest: false }));
    l.renderOrder = 12; shapeMarks.add(l);
    if (live && S.pt >= 0) { const tq = outlineInModel(twin, [tp[Math.min(S.pt, tp.length - 1)]], 0)[0]; if (tq) { const sp = numberSprite(S.pt + 1, true); sp.position.copy(tq); sp.material.opacity = 0.75; shapeMarks.add(sp); } } // (the partner's point, following)
  }
  const at = outlineInModel(rec, pts, 0), step = Math.max(1, Math.ceil(at.length / 40)); // (a number on every point; on every few of a very long outline)
  at.forEach((p, i) => { if (i % step && i !== S.pt) return; const sp = numberSprite(i + 1, i === S.pt); sp.position.copy(p); shapeMarks.add(sp); shapeHandles.push({ i, pos: p }); });
};
// ---- dragging a shape's points ON THE CAR (the owner, 15-Oct: "I want to be able to edit it directly on the model view"): a finger or the
// mouse on a number drags that point in the shape's own plane (a capture listener: neither the gizmo nor the camera takes the drag); a tap on a
// number picks it, a long press (0.6 s) removes it, a tap on the outline between two numbers adds a point there. One commit when let go (with
// its mirror: one undo). A tap anywhere else does what it did (pick a part, or let go of it).
const HANDLE_PX = 24, LINE_PX = 12;
const toScreen = (p) => { const r = canvas.getBoundingClientRect(), v = p.clone().applyMatrix4(S.model.matrixWorld).project(camera); return [(v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top, v.z]; };
const onPlane = (rec, e) => {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const plane = shapePlane(rec), inv = new THREE.Matrix4().copy(S.model.matrixWorld).invert();
  const local = ray.ray.clone().applyMatrix4(inv), hitP = new THREE.Vector3();
  return plane && local.intersectPlane(plane, hitP) ? hitP : null;
};
let viewDrag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rec = !placements?.on && S.shape && shapeById(S.shape);
  if (!rec || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const near = shapeHandles.map(h => { const [x, y, z] = toScreen(h.pos); return { ...h, d: Math.hypot(x - e.clientX, y - e.clientY), z }; }).filter(h => h.d < HANDLE_PX && h.z < 1).sort((a, b) => a.d - b.d)[0];
  let seg = null;
  if (!near) { // (on the outline between two numbers: a point added there on a tap)
    const pts = openPts(rec.now), at = outlineInModel(rec, pts, 0).map(toScreen);
    for (let i = 0; i < at.length; i++) {
      const a = at[i], b = at[(i + 1) % at.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((e.clientX - a[0]) * dx + (e.clientY - a[1]) * dy) / l2)) : 0;
      const d = Math.hypot(a[0] + dx * t - e.clientX, a[1] + dy * t - e.clientY);
      if (t > 0.15 && t < 0.85 && d < LINE_PX && (!seg || d < seg.d)) seg = { i, d };
    }
  }
  if (!near && !seg) return;
  e.stopImmediatePropagation(); e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch { /* (a pointer the page did not see go down) */ }
  viewDrag = { rec, i: near ? near.i : -1, seg, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, pts: openPts(rec.now).map(q => q.slice()), id: e.pointerId };
  if (near) { S.pt = near.i; drawShape(); }
  down = null; // (not a tap on a part)
}, { capture: true });
canvas.addEventListener('pointermove', (e) => {
  const d = viewDrag;
  if (!d || e.pointerId !== d.id) return;
  e.stopImmediatePropagation();
  if (d.i < 0) return;
  if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
  d.moved = true;
  const p = onPlane(d.rec, e);
  if (!p) return;
  const view = shapeView(d.rec), step = $('snap').checked ? 0.02 : 0.005; // (5 mm; Snap: 2 cm, in the shape's side / top / front view)
  const [h, v] = view.toView(modelToShape(d.rec, p));
  d.pts[d.i] = view.fromView([Math.round(h / step) * step, Math.round(v / step) * step]);
  drawShape(d.pts);
}, { capture: true });
const endViewDrag = (e, cancel = false) => {
  const d = viewDrag;
  if (!d || e.pointerId !== d.id) return;
  e.stopImmediatePropagation();
  viewDrag = null;
  const rec = d.rec;
  if (cancel) { drawShape(); return; }
  if (d.i >= 0 && d.moved) { setShape(rec, d.pts, 'point ' + (d.i + 1) + ' moved on the car'); return; }
  const tap = Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8;
  if (d.i >= 0 && tap && performance.now() - d.t > 600) { // (a long press: the point goes)
    if (d.pts.length > 3) { S.pt = -1; setShape(rec, d.pts.filter((_, j) => j !== d.i), 'point ' + (d.i + 1) + ' removed'); } else status('A shape keeps three points at least.');
    return;
  }
  if (d.seg && tap) { // (a tap on the outline: a point there, on the plane under the finger)
    const p = onPlane(rec, e), next = d.pts.map(q => q.slice());
    if (!p) return;
    next.splice(d.seg.i + 1, 0, modelToShape(rec, p)); S.pt = d.seg.i + 1;
    setShape(rec, next, 'point ' + (d.seg.i + 2) + ' added');
    return;
  }
  if (S.tab === 'part') renderPart(); else drawShape(); // (a tap on a number: picked)
};
canvas.addEventListener('pointerup', (e) => endViewDrag(e), { capture: true });
canvas.addEventListener('pointercancel', (e) => endViewDrag(e, true), { capture: true });
// the shape across the car (Mirror on and it has one), and its edit as one commit with the shape's
const shapeTwin = (rec) => { if (!S.mirror || !rec) return null; const p = S.shapePairs.get(rec.id); return p?.partner ? shapeById(p.partner) : null; };
const setShape = (rec, pts, words) => {
  let p = withShape(S.patch, rec.id, pts);
  const twin = shapeTwin(rec);
  if (twin) p = withShape(p, twin.id, mirrorPoints(rec, twin, pts));
  commit(p, 'Shape ' + shapeNo(rec) + ': ' + words + (twin ? ', and its mirror' : '') + '.');
};
const resetShape = (rec) => {
  let p = withShape(S.patch, rec.id, null);
  const twin = shapeTwin(rec);
  if (twin) p = withShape(p, twin.id, null);
  commit(p, 'Shape ' + shapeNo(rec) + ': back as the code builds it' + (twin ? ', and its mirror' : '') + '.');
};
const shapeNo = (rec) => shapesOf(rec.mesh).indexOf(rec) + 1;
const SW = 340, SH = 230, SPAD = 26;
// which way the view's two axes run on the screen just now (+1 / -1 each), so the drawing is the shape as the camera shows it (the Left view's
// nose to the left, the Right view's to the right); an axis seen end on keeps +1
let shapeFlips = [1, 1];
const screenFlips = (view) => {
  if (!S.model) return [1, 1];
  const c = modelBox().getCenter(new THREE.Vector3()), p0 = c.clone().project(camera);
  const ph = c.clone().setComponent(view.H, c.getComponent(view.H) + 0.5).project(camera), pv = c.clone().setComponent(view.V, c.getComponent(view.V) + 0.5).project(camera);
  const sh = ph.x - p0.x, sv = pv.y - p0.y;
  return [Math.abs(sh) > 0.01 ? Math.sign(sh) : 1, Math.abs(sv) > 0.01 ? Math.sign(sv) : 1];
};
const shapeFit = (pts, at = null) => { // (the whole shape; zoomed: four times closer, on point `at`)
  const hs = pts.map(q => q[0]), vs = pts.map(q => q[1]), h0 = Math.min(...hs), h1 = Math.max(...hs), v0 = Math.min(...vs), v1 = Math.max(...vs);
  let k = Math.min((SW - 2 * SPAD) / Math.max(0.05, h1 - h0), (SH - 2 * SPAD) / Math.max(0.05, v1 - v0)), ch = (h0 + h1) / 2, cv = (v0 + v1) / 2;
  if (at) { k *= 4; [ch, cv] = at; }
  const [sx, sy] = shapeFlips;
  return { k, sx, sy, x: (h) => SW / 2 + sx * (h - ch) * k, y: (v) => SH / 2 - sy * (v - cv) * k };
};
// the points to edit: an outline that ends on its first point again (a closed path) is shown without that last copy (the shape closes itself)
const openPts = (pts) => (pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-4 ? pts.slice(0, -1) : pts);
const shapeFitFor = (rec, view) => { shapeFlips = screenFlips(view); const now = openPts(rec.now).map(view.toView); return shapeFit([...now, ...rec.pts.map(view.toView)], S.zoom ? now[Math.max(0, Math.min(now.length - 1, S.pt))] : null); };
const handleR = (now, f) => Math.max(9, Math.min(15, 0.55 * Math.min(...now.map((q, i) => { const n = now[(i + 1) % now.length]; return Math.hypot(f.x(q[0]) - f.x(n[0]), f.y(q[1]) - f.y(n[1])) || 99; }))));
const VIEW_WORDS = { side: ['from the side, as on screen', 'along', 'up'], top: ['from above', 'along', 'across'], front: ['from the front', 'across', 'up'] };
const shapeEditor = (rec) => {
  const view = shapeView(rec);
  if (!view || !view.ok) return '<p class="note">This shape cannot be drawn flat (its plane is turned edge on).</p>';
  const now = openPts(rec.now).map(view.toView), orig = rec.pts.map(view.toView), f = shapeFitFor(rec, view);
  const path = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + f.x(q[0]).toFixed(1) + ' ' + f.y(q[1]).toFixed(1)).join(' ') + ' Z';
  // the car's other shapes seen the same way, faint (where this one sits)
  const ctx = S.shapes.filter(r => r !== rec && r.toModel && shapeView(r)?.name === view.name).map(r => { const vv = shapeView(r); return r.now.map(q => { const [h, w] = vv.toView(q); return [h, w]; }); });
  const r = handleR(now, f), twin = shapeTwin(rec), pair = S.shapePairs.get(rec.id), [vw, hw, ww] = VIEW_WORDS[view.name];
  const stored = S.patch.shapes?.[rec.id] ? rec.id : S.patch.shapes?.[rec.key] ? rec.key : null;
  const order = now.map((q, i) => i).filter(i => i !== S.pt).concat(S.pt >= 0 && S.pt < now.length ? [S.pt] : []); // (the picked point on top)
  const handles = order.map(i => [now[i], i]).map(([q, i]) => '<g class="sh' + (i === S.pt ? ' on' : '') + '" data-sp="' + i + '"><circle cx="' + f.x(q[0]).toFixed(1) + '" cy="' + f.y(q[1]).toFixed(1) + '" r="' + (r + 8).toFixed(1) + '" fill="transparent"/>'
    + '<circle cx="' + f.x(q[0]).toFixed(1) + '" cy="' + f.y(q[1]).toFixed(1) + '" r="' + (i === S.pt ? Math.max(r, 14) : r).toFixed(1) + '" fill="' + (i === S.pt ? '#ff8c42' : '#ffd23f') + '" stroke="#1b2029" stroke-width="1.5"/>'
    + '<text x="' + f.x(q[0]).toFixed(1) + '" y="' + (f.y(q[1]) + (i === S.pt ? Math.max(r, 14) : r) * 0.36).toFixed(1) + '" font-size="' + ((i === S.pt ? Math.max(r, 14) : r) * (i >= 9 ? 0.95 : 1.1)).toFixed(1) + '" font-weight="700" text-anchor="middle" fill="#1b2029">' + (i + 1) + '</text></g>').join('');
  return '<h2 style="margin-top:12px">Shape ' + shapeNo(rec) + ' <span class="small">' + vw + ' · drag a number, here or on the car</span></h2>'
    + '<svg id="shapeSvg" class="glass" viewBox="0 0 ' + SW + ' ' + SH + '">'
    + ctx.map(q => '<path d="' + path(q) + '" fill="#2a3446" stroke="#5a6678" stroke-width="1"/>').join('')
    + '<path d="' + path(orig) + '" fill="none" stroke="#ffd23f" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>'
    + '<path id="shapeNow" d="' + path(now) + '" fill="#4f6a95" fill-opacity="0.75" stroke="#ffd23f" stroke-width="2"/>'
    + handles + '</svg>'
    + '<p class="kv">' + (twin ? 'Mirror: shape across the car follows' : pair?.self ? 'One shape across the car' : S.mirror && !pair?.partner ? 'No mirror shape' : 'Mirror off: this one only') + (stored ? ' · edited' : '') + (rec.holes ? ' · its ' + rec.holes + ' hole(s) stay' : '') + '</p>'
    + '<div class="buttons"><button id="sZoom" title="Four times closer, on the picked point (tap a number to pick it)">' + (S.zoom ? 'Zoom out' : 'Zoom in') + '</button><button id="sReset"' + (stored ? '' : ' disabled') + '>Reset shape</button></div>'
    + '<div class="pts spts"><div class="vec"><span>#</span><span>' + hw + '</span><span>' + ww + '</span><span></span><span></span></div>' + now.map((q, i) => '<div class="vec' + (i === S.pt ? ' on' : '') + '" data-srow="' + i + '"><span>' + (i + 1) + '</span>' + num(q[0], 0.01) + num(q[1], 0.01)
      + '<button data-sadd="' + i + '" title="A point after this one">+</button><button data-sdel="' + i + '" title="Remove this point"' + (now.length <= 3 ? ' disabled' : '') + '>×</button></div>').join('') + '</div>';
};
const wireShapeEditor = (box, rec) => {
  const view = shapeView(rec);
  if (!view || !view.ok) return;
  const now = openPts(rec.now).map(view.toView), f = shapeFitFor(rec, view);
  const back = (pts) => pts.map(view.fromView);
  box.querySelectorAll('[data-shape]').forEach(b => b.addEventListener('click', () => select(S.sel, true, undefined, b.dataset.shape)));
  box.querySelectorAll('[data-srow] input').forEach(inp => inp.addEventListener('focus', () => { const i = +inp.closest('[data-srow]').dataset.srow; if (S.pt !== i) { S.pt = i; drawShape(); box.querySelectorAll('[data-srow]').forEach(r => r.classList.toggle('on', +r.dataset.srow === i)); } }));
  box.querySelectorAll('[data-srow]').forEach(row => row.addEventListener('change', () => {
    const i = +row.dataset.srow, [a, b] = [...row.querySelectorAll('input')].map(x => +x.value || 0), next = now.map(q => q.slice());
    next[i] = [a, b]; S.pt = i; setShape(rec, back(next), 'point ' + (i + 1) + ' set');
  }));
  box.querySelectorAll('[data-sadd]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.sadd, a = now[i], c = now[(i + 1) % now.length], next = now.map(q => q.slice());
    next.splice(i + 1, 0, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]); S.pt = i + 1; setShape(rec, back(next), 'point ' + (i + 2) + ' added');
  }));
  box.querySelectorAll('[data-sdel]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.sdel; if (now.length > 3) { S.pt = -1; setShape(rec, back(now.filter((_, j) => j !== i)), 'point ' + (i + 1) + ' removed'); } }));
  box.querySelector('#sReset')?.addEventListener('click', () => resetShape(rec));
  box.querySelector('#sZoom')?.addEventListener('click', () => { S.zoom = !S.zoom; if (S.zoom && S.pt < 0) S.pt = 0; renderPart(); drawShape(); });
  const svg = box.querySelector('#shapeSvg');
  svg.querySelectorAll('[data-sp]').forEach(g => g.addEventListener('pointerdown', (e) => {
    e.preventDefault(); try { g.setPointerCapture(e.pointerId); } catch { /* (a pointer the page did not see go down) */ }
    const i = +g.dataset.sp, next = now.map(q => q.slice()), c0 = now[i].slice();
    S.pt = i; drawShape();
    const r0 = svg.getBoundingClientRect(), px0 = (e.clientX - r0.left) * SW / r0.width, py0 = (e.clientY - r0.top) * SH / r0.height;
    let moved = false;
    const move = (ev) => {
      const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * SW / r.width, py = (ev.clientY - r.top) * SH / r.height;
      if (!moved && Math.hypot(px - px0, py - py0) < 2) return;
      moved = true;
      next[i] = [Math.round((c0[0] + f.sx * (px - px0) / f.k) * 200) / 200, Math.round((c0[1] - f.sy * (py - py0) / f.k) * 200) / 200]; // (to 5 mm, from where it was: no jump on touch)
      const dy = +g.querySelector('text').getAttribute('y') - +g.querySelectorAll('circle')[1].getAttribute('cy');
      g.querySelectorAll('circle').forEach(c => { c.setAttribute('cx', f.x(next[i][0]).toFixed(1)); c.setAttribute('cy', f.y(next[i][1]).toFixed(1)); });
      g.querySelector('text').setAttribute('x', f.x(next[i][0]).toFixed(1)); g.querySelector('text').setAttribute('y', (f.y(next[i][1]) + dy).toFixed(1));
      $('shapeNow').setAttribute('d', next.map((q, j) => (j ? 'L' : 'M') + f.x(q[0]).toFixed(1) + ' ' + f.y(q[1]).toFixed(1)).join(' ') + ' Z');
    };
    const up = () => {
      g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
      if (moved) setShape(rec, back(next), 'point ' + (i + 1) + ' moved'); else renderPart(); // (a tap picks the point: its row and its number on the car light up)
    };
    g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
  }));
};
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
  const rows = S.parts.filter(p => !q || [p.id, p.name, p.role, p.kind, p.type, ...(p.panes || [])].some(v => String(v || '').toLowerCase().includes(q)) || (/glass|window/.test(q) && isWindowPart(p))); // ('glass' finds the windows too)
  renderWindows();
  $('parts').innerHTML = rows.map((p) => {
    const depth = Math.min(3, p.id.split(/[./]/).length - 1);
    const own = labelOf(p), label = own && own !== p.role ? esc(own) + ' <i>' + esc(p.role) + '</i>' : esc(p.role);
    const meta = (p.type === 'group' ? p.children + ' in it' : (p.kind || '').replace('Geometry', '') + ' · ' + p.tris);
    return '<div class="prow indent' + depth + (S.sel === p.id ? ' sel' : '') + (S.hidden.has(p.id) ? ' hidden' : '') + (ed.has(p.id) ? ' edited' : '') + '" data-id="' + esc(p.id) + '" role="option">'
      + '<button data-act="eye" class="' + (S.hidden.has(p.id) ? '' : 'on') + '" title="Show / hide in this view" aria-label="Show or hide">' + (S.hidden.has(p.id) ? '&#9675;' : '&#9673;') + '</button>'
      + '<button data-act="solo" class="' + (S.solo === p.id ? 'on' : '') + '" title="Solo: only this part" aria-label="Solo">S</button>'
      + '<button data-act="lock" class="' + (S.locked.has(p.id) ? 'on' : '') + '" title="Lock: not picked in the view" aria-label="Lock">' + (S.locked.has(p.id) ? '&#128274;' : '&#128275;') + '</button>'
      + '<span class="pname">' + (p.color ? '<span class="sw" style="background:' + p.color + '"></span>' : '') + label + ' <i>' + esc(p.id) + '</i></span>'
      + '<span class="pmeta">' + esc(meta) + (p.visible ? '' : ' · off') + '</span></div>';
  }).join('') || '<p class="note">No part matches.</p>';
};
// the car's WINDOWS (every pane of every window part, cabinGlass's or hand-built), above the list: a tap picks that window
const renderWindows = () => {
  const box = $('windows');
  if (!box) return;
  const ws = S.parts.filter(p => p.panes?.length);
  box.hidden = !ws.length;
  box.innerHTML = ws.length ? '<span class="cap">Windows</span>' + ws.flatMap(p => p.panes.map(n => '<button data-wpart="' + esc(p.id) + '" data-wpane="' + esc(n) + '" class="' + (S.sel === p.id && S.pane === n ? 'on' : '') + (panesOf(S.nodes.get(p.id))?.find(q => q.name === n)?.edited || S.patch.panes?.[paneKeyOf(p.id, n)] ? ' edited' : '') + '">' + esc(n) + '</button>')).join('') : '';
};
$('windows')?.addEventListener('click', (e) => { const b = e.target.closest('[data-wpart]'); if (b) { select(b.dataset.wpart, true, b.dataset.wpane); renderWindows(); } });
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
// the outline of an extruded shape ("Extrude"): its side view as a drawing whose points are dragged (nose to the right, as in the Left view),
// and the same points as a list (z along the car, y up) to type, add after, or remove
const SVG_W = 300, SVG_H = 190, PAD = 22;
const outlineFit = (pts) => {
  const zs = pts.map(q => q[0]), ys = pts.map(q => q[1]), z0 = Math.min(...zs), z1 = Math.max(...zs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min((SVG_W - 2 * PAD) / Math.max(0.2, z1 - z0), (SVG_H - 2 * PAD) / Math.max(0.2, y1 - y0));
  return { k, x: (z) => SVG_W / 2 + (z - (z0 + z1) / 2) * k, y: (y) => SVG_H / 2 - (y - (y0 + y1) / 2) * k, z: (px) => (px - SVG_W / 2) / k + (z0 + z1) / 2, v: (py) => -(py - SVG_H / 2) / k + (y0 + y1) / 2 };
};
const pointsEditor = (pts) => {
  const f = outlineFit(pts);
  return '<h2 style="margin-top:12px">Outline <span class="small">side view, nose to the right: drag a point, or type it</span></h2>'
    + '<svg id="outline" viewBox="0 0 ' + SVG_W + ' ' + SVG_H + '" style="width:100%;max-width:340px;background:#1b2330;border-radius:8px;touch-action:none">'
    + '<polygon id="outlinePoly" points="' + pts.map(q => f.x(q[0]).toFixed(1) + ',' + f.y(q[1]).toFixed(1)).join(' ') + '" fill="#3b4a63" stroke="#ffd23f" stroke-width="1.5"/>'
    + pts.map((q, i) => '<circle data-pt="' + i + '" cx="' + f.x(q[0]).toFixed(1) + '" cy="' + f.y(q[1]).toFixed(1) + '" r="8" fill="#ffd23f" fill-opacity="0.85"/><text x="' + (f.x(q[0]) + 10).toFixed(1) + '" y="' + (f.y(q[1]) - 8).toFixed(1) + '" font-size="10" fill="#cbd5e1">' + i + '</text>').join('')
    + '</svg>'
    + '<div class="pts">' + pts.map((q, i) => '<div class="vec" data-row="' + i + '"><span>' + i + '</span>' + num(q[0], 0.05) + num(q[1], 0.05)
      + '<button data-ptadd="' + i + '" title="A point after this one">+</button><button data-ptdel="' + i + '" title="Remove this point"' + (pts.length <= 3 ? ' disabled' : '') + '>×</button></div>').join('') + '</div>';
};
let shownPane = null; // (the window whose editor was last scrolled to)
const renderPart = () => {
  const box = $('partBox');
  const p = S.sel && partOf(S.sel);
  if (!p) { box.innerHTML = '<p class="note">Tap a part in the view or the list.</p>'; return; }
  const geo = p.params && PRIMITIVES[p.kind];
  box.innerHTML = '<div class="props">'
    + '<h2>' + esc(labelOf(p)) + ' <span class="small">' + esc(p.type) + (p.kind ? ' · ' + esc(p.kind) : '') + ' · ' + p.tris + ' triangles</span></h2>'
    + '<div class="grid"><label>Name <input id="pName" value="' + esc(p.name) + '"></label><label>Role <input id="pRole" value="' + esc(p.role) + '"></label></div>'
    + '<p class="kv">id ' + esc(p.id) + (p.hook ? ' · the code keeps it as userData.' + esc(p.hook) : '') + (p.added ? ' · added by the patch' : '') + '</p>'
    + '<p class="kv" id="pMirror">' + (() => { const sy = S.sym.get(p.id), twin = sy?.partner && partOf(sy.partner); return twin ? 'Mirror partner: <b>' + esc(labelOf(twin)) + '</b> [' + esc(sy.partner) + ']' + (S.mirror ? ' · edits go to both' : ' · Mirror is off: this part only') : sy?.self ? 'Symmetric in itself (one part across the car)' : 'No mirror partner (an asymmetric part)'; })() + '</p>'
    + ['position', 'rotation', 'scale'].map(k => '<div class="vec" data-vec="' + k + '"><span>' + k[0].toUpperCase() + k.slice(1) + (k === 'rotation' ? ' °' : '') + '</span>'
      + p[k].map(v => num(k === 'rotation' ? v * DEG : v, k === 'rotation' ? 5 : k === 'scale' ? 0.05 : 0.01)).join('') + '</div>').join('')
    + (geo ? '<h2 style="margin-top:12px">Sizes ' + (p.editable ? '' : '<span class="small">set in its code (move or scale the part instead)</span>') + '</h2><div class="params">'
      + geo.filter(k => typeof p.params[k] === 'number').map(k => '<label class="param">' + k + '<input type="number" data-param="' + k + '" step="' + (/Segments|segments/.test(k) ? 1 : 0.01) + '" value="' + (Math.round(p.params[k] * 1000) / 1000) + '"' + (p.editable ? '' : ' disabled') + '></label>').join('') + '</div>' : '')
    + (p.kind === 'SideExtrudeGeometry' && p.editable ? pointsEditor(p.params.points) : '')
    + (() => { // (the outlines this part is built from: render/shapeedits.js)
      const node = S.nodes.get(p.id), list = node ? shapesOf(node) : [];
      if (!list.length) return '';
      const rec = S.shape && list.find(r => r.id === S.shape);
      return '<h2 style="margin-top:12px">Shapes <span class="small">' + (list.length > 1 ? 'pick one' : '') + '</span></h2><div class="panes">' + list.map((r, i) => '<button data-shape="' + esc(r.id) + '" class="' + (rec === r ? 'on' : '') + (S.patch.shapes?.[r.id] || S.patch.shapes?.[r.key] ? ' edited' : '') + '">' + (i + 1) + ' · ' + openPts(r.now).length + ' pts</button>').join('') + '</div>'
        + (rec ? shapeEditor(rec) : '');
    })()
    + (p.panes ? (() => {
      const node = S.nodes.get(p.id), ps = panesOf(node), pane = S.pane && ps.find(q => q.name === S.pane);
      const sp = pane && paneSel(), pb = sp ? paneBlock(sp) : '';
      if (pane && pane.cabin) return pb + paneEditor(node, pane);
      const buttons = '<div class="panes">' + ps.map(q => '<button data-pane="' + esc(q.name) + '" class="' + (q === pane ? 'on' : '') + (q.edited ? ' edited' : '') + '">' + esc(q.name) + '</button>').join('') + '</div>';
      if (!pane) return '<h2 style="margin-top:12px">Windows <span class="small">tap one in the view, or here</span></h2>' + buttons;
      return pb + buttons; // (no cabinGlass outline: its edges are the code's; a Shape's, above)
    })() : '')
    + (p.color ? '<div class="paint"><label>Colour <input type="color" id="pColor" value="' + p.color + '"></label>'
      + (p.emissive ? '<label>Glow <input type="color" id="pEmissive" value="' + p.emissive + '"></label>' : '')
      + '<label>Opacity <input type="range" id="pOpacity" min="0.05" max="1" step="0.05" value="' + p.opacity + '"></label></div>'
      + '<div class="paint"><label class="check"><input type="checkbox" id="pShare"><span>Colour every part sharing its material</span></label>'
      + '<label class="check"><input type="checkbox" id="pEvil"' + (S.evil ? ' checked' : '') + '><span>Paint for Evil only</span></label></div>' : '')
    + '<div class="paint"><label class="check"><input type="checkbox" id="pVisible"' + (p.visible ? ' checked' : '') + '><span>Shown (in the game too)</span></label></div>'
    + '<div class="buttons"><button id="pDup" title="Ctrl+D">Duplicate</button><button id="pMirror" title="M: a copy across the car that follows it">Mirror</button><button id="pDelete" title="Delete">Delete</button><button id="pReset" title="Take this part\'s edits out of the patch">Reset part</button><button id="pFrame" title="F">Frame</button></div>'
    + '</div>';
  const set = (values, words) => commit(setFor(S.patch, p, values), words);
  box.querySelectorAll('[data-vec]').forEach(row => row.addEventListener('change', () => {
    const k = row.dataset.vec, vals = [...row.querySelectorAll('input')].map(i => +i.value || 0);
    set({ [k]: k === 'rotation' ? vals.map(v => Math.round(v / DEG * 1000) / 1000) : vals }, (p.name || p.role) + ': ' + k + ' set.');
  }));
  box.querySelectorAll('[data-param]').forEach(i => i.addEventListener('change', () => set({ params: { [i.dataset.param]: +i.value } }, (p.name || p.role) + ': ' + i.dataset.param + ' set.')));
  if (p.kind === 'SideExtrudeGeometry' && p.editable) {
    const pts = p.params.points.map(q => q.slice()), setPts = (next, words) => set({ params: { points: next.map(q => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]) } }, (p.name || p.role) + ': ' + words);
    box.querySelectorAll('[data-row]').forEach(row => row.addEventListener('change', () => {
      const next = pts.map(q => q.slice()), [a, b] = [...row.querySelectorAll('input')].map(i => +i.value || 0);
      next[+row.dataset.row] = [a, b]; setPts(next, 'point ' + row.dataset.row + ' set.');
    }));
    box.querySelectorAll('[data-ptadd]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.ptadd, a = pts[i], c = pts[(i + 1) % pts.length], next = pts.map(q => q.slice());
      next.splice(i + 1, 0, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]); setPts(next, 'a point added.');
    }));
    box.querySelectorAll('[data-ptdel]').forEach(b => b.addEventListener('click', () => { if (pts.length > 3) setPts(pts.filter((_, i) => i !== +b.dataset.ptdel), 'a point removed.'); }));
    const svg = $('outline'), f = outlineFit(pts);
    svg.querySelectorAll('[data-pt]').forEach(c => c.addEventListener('pointerdown', (e) => {
      e.preventDefault(); c.setPointerCapture(e.pointerId);
      const i = +c.dataset.pt, next = pts.map(q => q.slice());
      const move = (ev) => {
        const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * SVG_W / r.width, py = (ev.clientY - r.top) * SVG_H / r.height;
        next[i] = [Math.round(f.z(px) * 20) / 20, Math.round(f.v(py) * 20) / 20];           // (to 5 cm)
        c.setAttribute('cx', Math.max(0, Math.min(SVG_W, px))); c.setAttribute('cy', Math.max(0, Math.min(SVG_H, py)));
        $('outlinePoly').setAttribute('points', next.map(q => f.x(q[0]).toFixed(1) + ',' + f.y(q[1]).toFixed(1)).join(' '));
      };
      const up = () => { c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); setPts(next, 'point ' + i + ' moved.'); };
      c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    }));
  }
  { const node = S.nodes.get(p.id), rec = S.shape && node && shapesOf(node).find(r => r.id === S.shape); if (rec) wireShapeEditor(box, rec); else box.querySelectorAll('[data-shape]').forEach(b => b.addEventListener('click', () => select(S.sel, true, undefined, b.dataset.shape))); }
  if (p.panes) { const pane = S.pane && panesOf(S.nodes.get(p.id)).find(q => q.name === S.pane); if (pane?.cabin) wirePaneEditor(box, S.nodes.get(p.id), pane); else box.querySelectorAll('[data-pane]').forEach(b => b.addEventListener('click', () => select(S.sel, true, b.dataset.pane))); const sp = pane && paneSel(); if (sp) wirePaneBlock(box, sp); }
  { // (a window just opened: its editor scrolled into sight, it sits far down the panel; not again on every rebuild of the same one)
    const gh = box.querySelector('#gHead'), at = gh ? S.sel + '|' + S.pane : null;
    if (gh && at !== shownPane && box.offsetParent) box.querySelector('#glassSvg').scrollIntoView({ block: 'start' }); // (the drawing, its readout and nudges in sight: on a phone's sheet the heading and window buttons are just above)
    shownPane = gh && !box.offsetParent ? null : at;
  }
  $('pName').addEventListener('change', (e) => { if (p.added) set({ name: e.target.value }); else { S.nodes.get(p.id).name = e.target.value; set({ name: e.target.value }); } });
  $('pRole').addEventListener('change', (e) => set({ role: e.target.value }));
  const paint = (key, value) => {
    const evil = $('pEvil')?.checked;
    commit(setFor(S.patch, p, { [key]: value, ...($('pShare')?.checked ? { shareMat: true } : {}) }, { evil: evil && !p.added }), (p.name || p.role) + ': ' + key + (evil ? ' (Evil)' : '') + mirrorWords(p));
  };
  $('pColor')?.addEventListener('change', (e) => paint('color', e.target.value));
  $('pColor')?.addEventListener('input', (e) => { for (const m of [].concat(S.nodes.get(p.id).material || [])) m.color?.set(e.target.value); }); // (a look while it is dragged)
  $('pEmissive')?.addEventListener('change', (e) => paint('emissive', e.target.value));
  $('pOpacity')?.addEventListener('change', (e) => paint('opacity', +e.target.value));
  $('pVisible').addEventListener('change', (e) => set({ visible: e.target.checked }, (p.name || p.role) + (e.target.checked ? ' shown.' : ' hidden.')));
  $('pDup').addEventListener('click', duplicate);
  $('pMirror').addEventListener('click', mirror);
  $('pDelete').addEventListener('click', remove);
  $('pFrame').addEventListener('click', fitSelected);
  $('pReset').addEventListener('click', () => {
    const next = JSON.parse(JSON.stringify(S.patch));
    const twin = mirrorPartner(p);
    next.ops = next.ops.filter(op => op.add || (op.id !== p.id && op.id !== twin));
    next.evil = (next.evil || []).filter(op => op.id !== p.id && op.id !== twin);
    for (const id of [p.id, twin]) { const node = id && S.nodes.get(id); if (node && next.shapes) for (const r of shapesOf(node)) { delete next.shapes[r.id]; const t = shapeTwin(r); if (t) delete next.shapes[t.id]; } }
    if (next.shapes && !Object.keys(next.shapes).length) delete next.shapes;
    commit(next, (p.name || p.role) + ': back as the code builds it.');
  });
};
const duplicate = () => { const p = partOf(S.sel); if (!p) return; const { patch, id } = withDuplicate(S.patch, p); commit(patch, 'Duplicated ' + (p.name || p.role) + '.'); select(id); };
const mirror = () => { const p = partOf(S.sel); if (!p) return; const { patch, id } = withMirror(S.patch, p); commit(patch, 'Mirrored ' + (p.name || p.role) + ' across the car.'); select(id); };
const remove = () => { const p = partOf(S.sel); if (!p) return; const twin = mirrorPartner(p); commit(twin ? withDelete(withDelete(S.patch, p), partOf(twin)) : withDelete(S.patch, p), 'Deleted ' + (p.name || p.role) + mirrorWords(p)); select(null); };

// ---- the stats strip: against the budget (CAR-AGENT-PROMPT.md) ---------------------------------------------------
const renderStats = () => {
  const s = withoutFx(() => modelStats(S.model)), dc = S.share > 0 ? withoutFx(() => damageCounts(S.model)) : null;
  const shapes = s.meshes > BUDGET.shapes[1] ? 'warn' : '', tris = s.triangles > BUDGET.hard ? 'bad' : s.triangles > BUDGET.triangles[1] ? 'warn' : '';
  const r = S.result;
  $('stats').innerHTML = '<span class="' + shapes + '">Shapes <b>' + s.meshes + '</b> / ' + BUDGET.shapes.join('-') + '</span>'
    + '<span class="' + tris + '">Triangles <b>' + s.triangles.toLocaleString('en') + '</b> / ' + BUDGET.triangles.map(n => n.toLocaleString('en')).join('-') + ' (max ' + BUDGET.hard.toLocaleString('en') + ')</span>'
    + '<span>Draw calls <b>' + s.materials + '</b> once merged</span>'
    + (S.share > 0 ? '<span class="dmg" title="Damage ' + DAMAGE_STATES[damageIndex(S.share)].label + ': triangles and draw calls, clean against damaged (the cut-finer panels add triangles; paint is shared, so no draw call)">Damaged <b>' + dc.damaged.triangles.toLocaleString('en') + '</b> tris (clean ' + dc.clean.triangles.toLocaleString('en') + ', <b>&times;' + dc.factor.toFixed(2) + '</b>) &middot; draw calls <b>' + dc.damaged.materials + '</b> (clean ' + dc.clean.materials + ')</span>' : '')
    + '<span class="lamp" title="Where the lamp effects (Lights, Brake, Hazards, Lamp markers) are placed">lamps: <b>' + esc(fxSource) + '</b></span>'
    + '<span>Edits <b>' + S.patch.ops.length + (S.patch.evil?.length ? ' + ' + S.patch.evil.length + ' Evil' : '') + (glassTable(S.patch) ? ' + ' + Object.keys(glassTable(S.patch)).length + ' windows' : '') + (S.patch.shapes ? ' + ' + Object.keys(S.patch.shapes).length + ' shapes' : '') + (S.patch.panes ? ' + ' + Object.keys(S.patch.panes).length + ' panes' : '') + '</b></span>'
    + '<span title="Mirror: an edit goes to the part across the car too">Mirror <b>' + (S.mirror ? 'on' : 'off') + '</b></span>'
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
// the window edits as code: the literal scripts/bake-glass.mjs writes beside the car's cabinGlass call (so the shipped car carries them in code)
$('bake').addEventListener('click', () => {
  const g = glassTable(S.patch) && tidyPatch(S.patch).glass, out = $('bakeOut'); // (its ids canonical: 'door window', 'rear window')
  out.hidden = false;
  const sh = S.patch.shapes && Object.keys(S.patch.shapes).length ? '// shape edits (' + Object.keys(S.patch.shapes).length + '): put the patch in src/delivery/modelpatches/' + S.car.id + '.json and run\n//   node scripts/bake-shapes.mjs ' + S.car.id + '\n// (it writes the points into the car\'s code where each outline is written, and proves the code builds the same model)\n' : '';
  if (!g || !Object.keys(g).length) { out.textContent = sh || 'No window or shape edits in this patch.'; if (sh) navigator.clipboard?.writeText(sh); return; }
  const fmt = (v) => (Array.isArray(v) ? '[' + v.map(fmt).join(', ') + ']' : v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => k + ': ' + fmt(x)).join(', ') + ' }' : String(Math.round(v * 1000) / 1000));
  const key = (k) => (/^[a-z_]\w*$/i.test(k) ? k : "'" + k.replace(/'/g, "\\'") + "'");
  out.textContent = sh + '// put the patch in src/delivery/modelpatches/' + S.car.id + '.json and run:\n//   node scripts/bake-glass.mjs ' + S.car.id + '\n// or paste this above the car\'s cabinGlass call and give the call `overrides: GLASS_EDITS`:\nconst GLASS_EDITS = { ' + Object.entries(g).map(([k, v]) => key(k) + ': ' + fmt(v)).join(', ') + ' };';
  navigator.clipboard?.writeText(out.textContent).then(() => status('The bake snippet is shown and copied.'), () => status('The bake snippet is shown.'));
});


// ---- Z-fighting: surfaces in the same place, found from the model's triangles (render/zfight.js) ----------------------
// Each row: the two surfaces, where, how far apart; click it to see them (A red, B green); "Lift A / B" moves that part to stand 5 mm
// in front of the other (toward the viewer) so it wins, "Delete" takes a doubled one away. Scanned on opening the tab and after every edit.
const zfGroup = new THREE.Group();
scene.add(zfGroup);
const clearZ = () => { zfGroup.clear(); };
const scanZ = () => {
  if (!S.model) return;
  const back = [];
  const fxParent = fx && fx.parent; if (fxParent) fxParent.remove(fx);
  S.model.traverse((n) => { // (the real colours, not the Blackout view's, and every part, not just the ones shown)
    if (!n.isMesh) return;
    if (n.userData.darkOrig) { back.push([n, n.material, n.layers.mask]); n.material = n.userData.darkOrig; } else back.push([n, null, n.layers.mask]);
    n.layers.set(0);
  });
  let found;
  try { found = findZFights(S.model); } finally { for (const [n, m, mask] of back) { if (m) n.material = m; n.layers.mask = mask; } if (fxParent) fxParent.add(fx); }
  S.zf = found; S.zfSel = -1;
  renderZ();
};
const nameOfNode = (node) => { const id = idOf(node), p = id && partOf(id); return (p ? (p.name || p.role || 'part') : 'part') + (id ? ' [' + id + ']' : ''); };
const hexOf = (m) => (m && m.color ? '#' + m.color.getHexString() : 'picture');
const renderZ = () => {
  const box = $('zfBox'), list = S.zf || [];
  const seen = list.filter(g => !g.sameColour), certain = seen.filter(g => g.certain), dup = list.length - seen.length;
  clearZ();
  if (!list.length) { box.innerHTML = '<p class="note">No surfaces fight in this model (planes within 4 mm that overlap and are seen from outside).</p>'; return; }
  box.innerHTML = '<p class="note"><b>' + certain.length + '</b> will flicker (under 0.5 mm apart), <b>' + (seen.length - certain.length) + '</b> might (0.5-4 mm: a weak GPU or far away), <b>' + dup + '</b> doubled in one colour (no flicker, a wasted shape).</p>'
    + list.map((g, i) => '<div class="zrow' + (i === S.zfSel ? ' sel' : '') + '" data-z="' + i + '">'
      + '<div class="zhead"><span class="zk ' + (g.sameColour ? 'dup' : g.certain ? 'yes' : 'maybe') + '">' + (g.sameColour ? 'doubled' : g.certain ? 'flickers' : 'might') + '</span> '
      + '<b>' + esc(nameOfNode(g.a)) + '</b> <i style="background:' + hexOf(g.aMat) + '"></i> vs <b>' + esc(nameOfNode(g.b)) + '</b> <i style="background:' + hexOf(g.bMat) + '"></i></div>'
      + '<div class="small">' + (g.area * 10000).toFixed(1) + ' cm\u00b2, ' + (g.gapMin * 1000).toFixed(1) + (g.gapMax > g.gapMin + 1e-4 ? '-' + (g.gapMax * 1000).toFixed(1) : '') + ' mm apart, '
      + (g.sameFacing ? 'facing the same way' : 'facing opposite ways') + '</div>'
      + '<div class="buttons"><button data-za="liftA">Lift A</button><button data-za="liftB">Lift B</button><button data-za="delA">Delete A</button><button data-za="delB">Delete B</button></div></div>').join('');
};
const lift = (node, g, isA) => {
  const id = idOf(node), p = id && partOf(id);
  if (!p || !node.parent) return;
  const move = 0.005 + (isA ? g.sep : -g.sep); // (to stand 5 mm in front (just outside the 4 mm the scan counts) of the other, whichever side of it it is on now)
  const toward = g.normal.clone().multiplyScalar(g.view || 1).normalize().multiplyScalar(move); // (world metres, toward the viewer who sees both)
  S.model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(node.parent.matrixWorld).invert();
  const o = new THREE.Vector3().applyMatrix4(inv), d = toward.applyMatrix4(inv).sub(o);
  const at = node.position.clone().add(d).toArray().map(v => Math.round(v * 10000) / 10000);
  commit(withSet(S.patch, p, { position: at }), (p.name || p.role) + ' now stands 5 mm in front of the other.');
};
$('zfBox').addEventListener('click', (e) => {
  const row = e.target.closest('.zrow');
  if (!row) return;
  const g = S.zf[+row.dataset.z], act = e.target.closest('[data-za]')?.dataset.za;
  if (!g) return;
  if (act === 'liftA' || act === 'liftB') { lift(act === 'liftA' ? g.a : g.b, g, act === 'liftA'); return; }
  if (act === 'delA' || act === 'delB') {
    const id = idOf(act === 'delA' ? g.a : g.b), p = id && partOf(id);
    if (p) commit(withDelete(S.patch, p), (p.name || p.role) + ' deleted.');
    return;
  }
  S.zfSel = +row.dataset.z;
  document.querySelectorAll('.zrow').forEach(r => r.classList.toggle('sel', r === row));
  zfGroup.clear();
  zfGroup.add(new THREE.Box3Helper(new THREE.Box3().setFromObject(g.a), 0xd8262b), new THREE.Box3Helper(new THREE.Box3().setFromObject(g.b), 0x18a35a));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f, depthTest: false }));
  dot.position.copy(g.at); dot.renderOrder = 10; zfGroup.add(dot);
  const id = idOf(g.a); if (id) select(id, false);
});
$('zfRescan').addEventListener('click', scanZ);

// ---- the tabs, the side, the files --------------------------------------------------------------------------------
const showTab = (tab) => {
  const was = S.tab;
  S.tab = ['parts', 'part', 'place', 'json', 'zfight'].includes(tab) ? tab : 'parts';
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  document.querySelectorAll('.tab').forEach(t => { t.hidden = t.id !== 'tab-' + S.tab; });
  if (S.tab === 'part') renderPart();
  if (S.tab === 'json') renderJson();
  if (S.tab === 'zfight') scanZ(); else clearZ();
  if (S.tab === 'place' && !placements.on) { select(null, false); placements.enter(); } else if (S.tab !== 'place' && was === 'place' && placements.on) { placements.leave(); applyViewFlags(); }
  syncUndo();
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
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => viewTo(b.dataset.view)));
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
  if (placements?.on) { if (ctrl && (k === 'z' || k === 'y')) { e.preventDefault(); undo(k === 'y' || e.shiftKey ? 1 : -1); } return; } // (placing: no part keys)
  if (ctrl && k === 'z') { e.preventDefault(); undo(e.shiftKey ? 1 : -1); }
  else if (ctrl && k === 'y') { e.preventDefault(); undo(1); }
  else if (ctrl && k === 'd') { e.preventDefault(); duplicate(); }
  else if (ctrl) return;
  else if (/^[0-5]$/.test(k) && !e.shiftKey) setDamage(DAMAGE_STATES[+k].share);
  else if (k === 'g') setMode('translate');
  else if (k === 'r') setMode('rotate');
  else if (k === 's') setMode('scale');
  else if (k === 'm') mirror();
  else if (k === 'f') fitSelected();
  else if (k === 'delete' || k === 'backspace') remove();
  else if (k === 'escape') select(null);
});

// ---- the loop: drawn only while the page is seen -------------------------------------------------------------------
const loop = () => {
  if (!document.hidden) {
    orbit.update();
    syncLampView();
    if (S.sel && selBox.visible) selBox.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
};
window.addEventListener('pagehide', () => { disposeModel(S.model); renderer.dispose(); renderer.forceContextLoss(); });

// ---- start ---------------------------------------------------------------------------------------------------------
resize();
placements = createPlacements({
  scene, camera, canvas, orbit, gizmo, root: $('placeBox'), toolsEl: $('placeTools'), roster: [...roster, ...ideas],
  getCar: () => S.car, getModel: () => S.model, status, withoutFx, inFx, applyViewFlags, syncUrl: () => S.car && syncUrl(), syncUndo,
  frame: (name) => frame(name), coarse: matchMedia('(pointer: coarse)').matches,
});
patchesReady.then(() => {
  if (params.has('dark')) $('dark').checked = true; // (?dark: the Blackout view from the start)
  loadCar(params.get('car') || 'commuter');
  setDamage(S.share, true);
  showTab(params.get('tab'));
  if (params.get('part') && params.get('pane') && +params.get('corner') > 0) { gPick.pane = params.get('pane'); gPick.i = +params.get('corner') - 1; } // (?corner=<1..n>: that corner picked)
  if (params.get('part')) select(params.get('part'), true, params.get('pane') || undefined, params.get('shape') || undefined);
  else if (params.get('shape')) { const r = shapeById(params.get('shape')); if (r) select(idOf(r.mesh), true, undefined, r.id); } // (?shape= alone: the part it is in)
  if (params.get('tab')) showTab(params.get('tab'));
  frame(view);
  loop();
  window.__modelEditor = Object.assign(S, { three: { camera, scene, gizmo, orbit, renderer, THREE }, api: { select, commit, undo, mirror, duplicate, remove, setFor, setPane, resetPane, mirrorPartner, setShape, resetShape, shapeTwin, shapesOf, shapeView, shapeOnScreen: () => shapeHandles.map(h => ({ i: h.i, xy: toScreen(h.pos) })), paneSel, setPaneEdit, snapSel, paneGapNow, setMode, frame: (v) => viewTo(v) }, placements }); // (for the checks and a curious console)
});
