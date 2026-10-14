// The LAMP TABLE's draft generator (LAMP-PLACEMENT-GUIDE.md): builds every car's model headless, splits its glowing
// meshes into connected pieces (models merge lamps by material), sorts them by colour and place (cream/white at the
// front: headlamp; red at the back: tail lamp, all of them braking; white at the back: reversing lamp; amber at either
// end: indicator), folds mirror pairs and prints a draft CAR_LAMPS entry per model. Where there is no amber lens the
// indicator flash goes on the outer part of the outermost headlamp / tail lamp (`shared`). It also CLASSES each car:
//   easy   head and tail lamps found, nothing moves
//   hard   lamps that move with userData.animate (need a `frame` hook: see the guide), or no head / no tail lamp found
//   node scripts/lamps.mjs                       the class table, every car
//   node scripts/lamps.mjs <id> ...              those cars' draft entries (car id; keyed by model name)
//   node scripts/lamps.mjs --write=easy          add the easy cars that have no entry yet to render/carlights-easy.js
//                                                (entries already there, hand-checked, are kept as they are)
// The generated files are drawing only (outside the replay fingerprint). Cars already listed by hand in
// render/carlights.js are skipped.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { startModels } from './modelpatch-load.mjs';

const args = process.argv.slice(2), write = (args.find(a => a.startsWith('--write=')) || '').slice(8), only = args.filter(a => !a.startsWith('--'));
const { load, close, ROOT } = await startModels();
const r3 = (v) => Math.round(v * 1000) / 1000;

// a lamp colour from its hex (sRGB): white/cream, red, amber, or none
const colourOf = (mat) => {
  const hx = parseInt(mat.color.getHexString(), 16), r = (hx >> 16) / 255, g = ((hx >> 8) & 255) / 255, b = (hx & 255) / 255;
  if (r > 0.85 && g > 0.85 * r && b > 0.55 * r) return 'white';
  if (r > 0.45 && g < 0.35 * r && b < 0.4 * r) return 'red';
  if (r > 0.8 && g > 0.4 * r && g < 0.82 * r && b < 0.4 * r) return 'amber';
  return null;
};
const visibleNode = (node) => { for (let p = node; p; p = p.parent) if (!p.visible) return false; return true; };
// every glowing mesh of the model, split into connected pieces: { cat, box, tris }
const piecesOf = (model) => {
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert(), m = new THREE.Matrix4(), out = [];
  model.traverse((node) => {
    if (!node.isMesh || !node.geometry || !visibleNode(node)) return;
    const mat = [].concat(node.material)[0];
    if (!mat?.color || mat.transparent && mat.opacity < 0.6) return;
    if (!(mat.type === 'MeshBasicMaterial' || (mat.emissive && mat.emissive.getHex() > 0))) return;
    const cat = colourOf(mat);
    if (!cat) return;
    m.multiplyMatrices(inv, node.matrixWorld);
    const g = node.geometry, pos = g.attributes.position, idx = g.index, nt = (idx ? idx.count : pos.count) / 3;
    const parent = Int32Array.from({ length: nt }, (_, i) => i);
    const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
    const owner = new Map(), v = new THREE.Vector3(), pts = [];
    for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, idx ? idx.getX(t * 3 + k) : t * 3 + k).applyMatrix4(m);
      pts.push(v.clone());
      const key = Math.round(v.x * 1000) + ',' + Math.round(v.y * 1000) + ',' + Math.round(v.z * 1000);
      if (owner.has(key)) { const a = find(owner.get(key)), b = find(t); if (a !== b) parent[a] = b; } else owner.set(key, t);
    }
    const comps = new Map();
    for (let t = 0; t < nt; t++) {
      const root = find(t);
      if (!comps.has(root)) comps.set(root, { cat, box: new THREE.Box3(), tris: 0 });
      const c = comps.get(root);
      c.tris++;
      for (let k = 0; k < 3; k++) c.box.expandByPoint(pts[t * 3 + k]);
    }
    out.push(...comps.values());
  });
  // (two meshes drawing the same lamp: once)
  return out.filter((p, i) => !out.some((o, j) => j < i && o.cat === p.cat && o.box.min.distanceTo(p.box.min) < 0.002 && o.box.max.distanceTo(p.box.max) < 0.002));
};
const modelFor = (MODELS, makeIdeaModel, car) => (car.idea ? makeIdeaModel(car) : car.model && MODELS[car.model] ? MODELS[car.model](car) : null);

// a car's draft entry and class
const draft = (car, model) => {
  const top = new THREE.Box3().setFromObject(model).max.y, hl = car.hl || 2;
  model.userData.animate?.(0);
  const pieces = piecesOf(model);
  let moves = 0; // (how far the lamps move with the model's animation, m: more than 2 cm needs a frame)
  for (const t of [1.37, 2.9]) {
    model.userData.animate?.(t);
    const again = piecesOf(model);
    if (again.length !== pieces.length) moves = Math.max(moves, 1);
    else again.forEach((p, i) => { moves = Math.max(moves, p.box.getCenter(new THREE.Vector3()).distanceTo(pieces[i].box.getCenter(new THREE.Vector3()))); });
  }
  moves = moves > 0.02 ? Math.round(moves * 100) / 100 : 0;
  model.userData.animate?.(0);
  const lamp = (p, front) => {
    const c = p.box.getCenter(new THREE.Vector3()), s = p.box.getSize(new THREE.Vector3());
    return { x: c.x, y: c.y, z: front ? p.box.max.z : p.box.min.z, w: s.x, h: s.y, round: p.tris > 12, cat: p.cat };
  };
  const ok = (p) => { const s = p.box.getSize(new THREE.Vector3()); return Math.max(s.x, s.y) > 0.025 && p.box.max.y < top - 0.1; }; // (not a roof beacon or bar)
  const front = pieces.filter(p => ok(p) && p.box.getCenter(new THREE.Vector3()).z > hl * 0.55).map(p => lamp(p, true));
  const rear = pieces.filter(p => ok(p) && p.box.getCenter(new THREE.Vector3()).z < -hl * 0.55).map(p => lamp(p, false));
  // fold mirror pairs: keep the +x one (mirror: true); a lamp on the centre line stays single
  const fold = (list) => {
    const kept = [], used = new Set();
    list.sort((a, b) => b.x - a.x || b.y - a.y);
    list.forEach((l, i) => {
      if (used.has(i)) return;
      if (Math.abs(l.x) <= 0.01) { kept.push({ ...l, x: 0 }); return; }
      const j = list.findIndex((o, k) => k !== i && !used.has(k) && o.cat === l.cat && Math.abs(o.x + l.x) < 0.012 && Math.abs(o.y - l.y) < 0.012 && Math.abs(o.z - l.z) < 0.012);
      if (j >= 0) { used.add(j); kept.push({ ...l, mirror: l.x > 0 }); if (l.x < 0) kept[kept.length - 1].x = -l.x; } else kept.push(l);
      used.add(i);
    });
    return kept;
  };
  // (a wide white piece high on the front is a lit destination sign, not a headlamp)
  const head = fold(front.filter(l => l.cat === 'white' && !(l.w > 0.7 && l.y > 1.4))), tail = fold(rear.filter(l => l.cat === 'red'));
  const reverse = fold(rear.filter(l => l.cat === 'white'));
  const blink = [...fold(front.filter(l => l.cat === 'amber')), ...fold(rear.filter(l => l.cat === 'amber'))];
  // no amber lens at an end: flash over the outer part of the outermost lamp there
  const borrow = (list, which) => {
    const out = list.reduce((a, l) => (!a || l.x + l.w / 2 > a.x + a.w / 2 ? l : a), null);
    if (!out) return null;
    const w = Math.min(0.1, out.w * 0.4), h = Math.min(0.1, out.h * 0.8);
    if (out.w < 0.06 || Math.abs(out.x) <= 0.01) { // (a narrow lamp: all of it; a lamp across the middle: its two ends)
      const x = Math.abs(out.x) <= 0.01 ? out.w / 2 - w / 2 : out.x;
      return { ...out, x, w: Math.abs(out.x) <= 0.01 ? w : out.w, h: Math.abs(out.x) <= 0.01 ? h : out.h, mirror: true, shared: which };
    }
    if (out.w < 0.16) { const fh = Math.min(0.1, out.h * 0.4); return { ...out, y: out.y - out.h / 2 + fh / 2, h: fh, shared: which }; } // (a narrow lamp: its foot)
    return { ...out, x: out.x + out.w / 2 - w / 2, w, h, mirror: out.mirror || false, shared: which }; // (a wide one: its outer end)
  };
  if (!blink.some(l => l.z > 0) && head.length) { const b = borrow(head, 'headlamp'); if (b) blink.push(b); }
  if (!blink.some(l => l.z < 0) && tail.length) { const b = borrow(tail, 'tail lamp'); if (b) blink.push(b); }
  const missing = [!head.length && 'no head', !tail.length && 'no tail'].filter(Boolean);
  return { head, tail, blink, reverse, moves, missing, pieces: pieces.length, varies: !!model.userData.style };
};
const entryText = (key, d) => {
  const lamp = (l, extra = '') => '{ at: [' + [l.x, l.y, l.z].map(r3).join(', ') + '], size: [' + r3(l.w) + ', ' + r3(l.h) + ']' + (l.round ? ', round: true' : '') + (l.mirror ? ', mirror: true' : '') + extra + (l.shared ? ", shared: '" + l.shared + "'" : '') + ' }';
  const list = (name, ls) => (ls.length ? name + ': [' + ls.map(l => lamp(l)).join(', ') + ']' : null);
  return '  ' + (/^[a-z_$][\w$]*$/i.test(key) ? key : "'" + key + "'") + ': { ' + [list('head', d.head), list('tail', d.tail), list('blink', d.blink), list('reverse', d.reverse)].filter(Boolean).join(', ') + ' },';
};

try {
  const { MODELS } = await load('render/models.js');
  const { makeIdeaModel } = await load('render/ideaModels.js');
  const { CAR_LAMPS, lampKey } = await load('render/carlights.js');
  const { CONFIG } = await load('config.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { CARS, FILLER_CARS, BESPOKE_CARS, EVENT_CARS, EARNED_CARS } = await load('cars.js');
  const all = [...new Set([...CARS, ...FILLER_CARS, ...BESPOKE_CARS, ...EVENT_CARS, ...EARNED_CARS, ...IDEA_CARS])];
  const seen = new Set(), rows = [], drafts = new Map();
  for (const car of all) {
    if (only.length && !only.includes(car.id)) continue;
    const key = lampKey(car);
    if (!key || seen.has(key) || car.super || car.superKit) continue; // (a Super/kit car wears its base model's key)
    seen.add(key);
    let model;
    try { model = modelFor(MODELS, makeIdeaModel, car); } catch (e) { rows.push([car.id, key, 'error', e.message]); continue; }
    if (!model) continue;
    const d = draft(car, model);
    // traffic wearing this model at another size would put the lamps elsewhere
    const kinds = Object.entries(CONFIG.vehicles).filter(([, t]) => t.model === key && (t.hw !== car.hw || t.hl !== car.hl));
    const cls = d.moves || d.missing.length ? 'hard' : 'easy';
    const notes = [d.moves && 'lamps move ' + d.moves + ' m (frame)', ...d.missing, d.varies && 'shape varies (style)', kinds.length && 'traffic ' + kinds.map(([k]) => k).join('/') + ' is another size', CAR_LAMPS[key] && 'hand-listed'].filter(Boolean);
    rows.push([car.id, key, cls, notes.join('; '), d.pieces]);
    drafts.set(key, { car, d, cls, hand: !!CAR_LAMPS[key], kinds: kinds.length });
  }
  if (only.length) for (const [key, { d }] of drafts) console.log(entryText(key, d));
  else for (const [id, key, cls, notes, n] of rows) console.log(cls.padEnd(5), id.padEnd(16), key.padEnd(16), String(n ?? '').padStart(3), notes || '');
  const count = (c) => rows.filter(r => r[2] === c).length;
  console.log('easy ' + count('easy') + ', hard ' + count('hard') + (count('error') ? ', errors ' + count('error') : ''));
  if (write === 'easy') {
    const file = join(ROOT, 'src/delivery/render/carlights-easy.js');
    let have = {}, text = readFileSync(file, 'utf8');
    try { have = (await load('render/carlights-easy.js')).EASY_LAMPS; } catch { /* (none yet) */ }
    const add = [...drafts].filter(([key, x]) => x.cls === 'easy' && !x.hand && !x.kinds && !x.d.varies && !have[key]).map(([key, x]) => entryText(key, x.d));
    text = text.replace(/\n};\s*$/, '\n' + add.join('\n') + (add.length ? '\n' : '') + '};\n').replace('{\n\n', '{\n');
    writeFileSync(file, text);
    console.log('wrote ' + add.length + ' entries to ' + file);
  }
} finally { await close(); }
