// ---- GLASS = WINDOW (the owner, 15-Oct: "'glass' and 'window' are used interchangeably in the models. Make the editor treat both equally.")
// ONE rule for every place that asks "is this a window?" or "which window is this?": the model editor (src/delivery/modeleditor.js), the
// patch (render/modelpatch.js: roles, the `glass` table), cabinGlass's panes and their edits (render/ideaModelsDkit.js), the bake
// (scripts/bake-glass.mjs), the dents (render/dents.js), the stripes (render/carExtras.js) and the plate / prop audits (scripts/).
// Pure: no three.js, no DOM (a node is read only for its name, its userData and its material's name).
//
// THE RULE
//  - The words are equal: glass, glazing, window(s), pane, windscreen, windshield (any case). A name, a role, a hook or a material name
//    with any of them names a window (not 'window frame', 'windscreen wiper': its surroundings).
//  - The word SHOWN is "window" (the owner's word for the panes; "windscreen" for the front one): labels, the editor's role, pane names.
//  - A window's KEY (a pane name, an id in a patch's `glass` table) is canonical: windowKey('door glass L') === windowKey('door window L')
//    === 'door window L'; 'rear glass' / 'rear screen' / 'back window' -> 'rear window'; 'windshield' / 'front glass' -> 'windscreen'.
//    An edit stored under any spelling is read for the window of any other spelling, and the editor writes the canonical one.
//  - A patch's table may be called `glass` (as written so far) or `windows`: glassTable() reads both.

const WORD = /glass|glazing|window|windscreen|windshield|\bpanes?\b/i;
const NOT = /wiper|washer|frame|sill|surround|shutter|blind|grill|sticker|decal/i; // (a window's surroundings, not its glass: 'window frame', 'windscreen wiper')
// a name (a part's name, role, hook, material name, pane name) that names a window, in either spelling
export const isGlassWord = (s) => typeof s === 'string' && WORD.test(s) && !NOT.test(s);
// the role the editor gives a see-through part (render/modelpatch.js guessRole), and the test for a role of either spelling
export const WINDOW_ROLE = 'window';
export const isWindowRole = (role) => isGlassWord(role);
// the canonical key of a window's name: the side (' L' / ' R') kept, the words made one
export const windowKey = (name) => {
  const s = String(name ?? '').trim().replace(/\s+/g, ' ');
  const m = s.match(/^(.*?)(?: ([LlRr]))?$/);
  let base = m[1].toLowerCase();
  const side = m[2] ? ' ' + m[2].toUpperCase() : '';
  base = base
    .replace(/\bwind ?shields?\b/g, 'windscreen').replace(/\bwindscreens\b/g, 'windscreen')
    .replace(/\b(?:front|fore) (?:glass|window|screen)\b/g, 'windscreen')
    .replace(/\b(?:rear|back) (?:glass|window|screen)\b/g, 'rear window')
    .replace(/\b(?:glass|glazing|windows|panes?)\b/g, 'window')
    .replace(/\bwindow window\b/g, 'window');
  return base + side;
};
// the same window, whichever spelling each name uses
export const sameWindow = (a, b) => windowKey(a) === windowKey(b);
// the side's name without its side (' L' / ' R'), canonical: 'door glass L' -> 'door window'
export const windowBase = (name) => windowKey(name).replace(/ [LR]$/, '');

// ---- a table of window edits keyed by name (the patch's `glass` table, a baked GLASS_EDITS literal) --------------------------
// the table read through canonical keys: { key: canonical key -> { value, from: the table's own key } } (the canonical spelling wins
// over another of the same window; else the first written)
export const canonTable = (table) => {
  const out = new Map();
  if (!table || typeof table !== 'object') return out;
  for (const [k, v] of Object.entries(table)) {
    if (v == null) continue;
    const c = windowKey(k);
    if (!out.has(c) || k === c) out.set(c, { value: v, from: k });
  }
  return out;
};
// the table with every key canonical (the same windows, one spelling): the build's cache key and the editor's writes use it
export const canonicalTable = (table) => {
  const out = {};
  for (const [k, { value }] of canonTable(table)) out[k] = value;
  return out;
};
// the value for the window `name` in the table, whatever spelling either uses (null: none)
export const lookupWindow = (table, name) => canonTable(table).get(windowKey(name))?.value ?? null;
// a patch's window table, called `glass` or `windows` (null: none)
export const glassTable = (patch) => {
  if (!patch || typeof patch !== 'object') return null;
  const a = patch.glass && typeof patch.glass === 'object' ? patch.glass : null, b = patch.windows && typeof patch.windows === 'object' ? patch.windows : null;
  const t = a && b ? { ...b, ...a } : a || b;
  return t && Object.keys(t).length ? t : null;
};

// ---- a node named or marked as a window (no colour test: render/dents.js glassy and render/modelpatch.js guessRole judge the colour) -
// its name, the role a patch gave it (userData.patchRole), its material's name, or cabinGlass's panes on its geometry
export const isWindowNode = (node) => {
  if (!node) return false;
  if (node.geometry?.userData?.panes) return true;
  if (isGlassWord(node.name) || isGlassWord(node.userData?.patchRole)) return true;
  return [].concat(node.material || []).some(m => m && isGlassWord(m.name));
};
