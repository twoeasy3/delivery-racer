// ---- the game's side of MODEL PATCHES (render/modelpatch.js): a car's patch, applied once to each model built for it
// (render/showcar.js makeShowCar: the garage, the showroom, the inspector, the stills and the menu; render/items.js
// playerModel: the car driven; render/ideaslot.js: the ideas lot). Patches are src/delivery/modelpatches/<car id>.json,
// loaded lazily (a dynamic import per file: none, no code), started as this module loads; a model built before they
// are in is drawn as its code builds it.
//   ?modelpatch=local   the model editor's own patches instead (this browser's localStorage, LOCAL_KEY), for a look
//   ?modelpatch=off     none at all
import { applyPatch } from './modelpatch.js';
import { glassTable } from './glassnames.js';

export const LOCAL_KEY = 'delivery.modelpatches';
const search = typeof location !== 'undefined' ? location.search : '';
const mode = /[?&]modelpatch=local\b/.test(search) ? 'local' : /[?&]modelpatch=off\b/.test(search) ? 'off' : 'files';
const files = import.meta.glob('../modelpatches/*.json', { import: 'default' });
export const PATCHES = {};
export const patchesReady = Promise.all(Object.entries(files).map(async ([path, load]) => {
  try { const patch = await load(); PATCHES[patch.car || path.replace(/^.*\/|\.json$/g, '')] = patch; } catch (e) { console.warn('model patch ' + path + ': ' + e.message); }
}));
export const localPatches = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') || {}; } catch { return {}; } };
let on = true;
export const setModelPatching = (yes) => { on = !!yes; }; // (the model editor builds the code's model and patches it itself)
export const patchFor = (id) => (mode === 'off' ? null : mode === 'local' ? localPatches()[id] || PATCHES[id] : PATCHES[id]) || null;
// a SUPER car (cars.js superOf: `base`, the garage car it is made from, the same model with its kit) wears its base car's WINDOW edits (the
// glass edges, the panes moved on their own: render/paneedit.js), never the base's part ops (its kit's parts would shift them)
const windowsOnly = (p) => (p && (glassTable(p) || p.panes) ? { car: p.car, version: p.version, ops: [], evil: [], ...(glassTable(p) ? { glass: glassTable(p) } : {}), ...(p.panes ? { panes: p.panes } : {}) } : null);
const ownPatch = (car) => patchFor(car.id) || (car.legend ? patchFor(car.legend) : null) || (car.super && car.base ? windowsOnly(patchFor(car.base.id)) : null);
// the car's GLASS EDITS table (render/ideaModelsDkit.js withGlassEdits), read by cabinGlass as an idea car's model is built (render/ideaModels.js):
// null when it has none (or patching is off); `undefined` when this module is not patching at all (the model editor sets the table itself)
export const glassEditsFor = (car) => {
  if (!on) return undefined;
  return glassTable(ownPatch(car)); // (its `glass` table, or one called `windows`: render/glassnames.js)
};
// the car's SHAPE EDITS table (render/shapeedits.js: an outline's id -> its edited points), read as the car's own model is BUILT (carShapes in
// render/showcar.js, items.js, ideaslot.js): null when it has none or patching is off (the model editor sets its own: setShapeOverride)
export const shapeEditsFor = (car) => {
  if (!on || !car) return null;
  const patch = patchFor(car.id) || (car.legend ? patchFor(car.legend) : null);
  return patch && patch.shapes && typeof patch.shapes === 'object' && Object.keys(patch.shapes).length ? patch.shapes : null;
};
// patch a model just built for this car (once: a model already patched is left), painted for the side
export const patchModel = (model, car, evil = false) => {
  if (!on || !model || !car || model.userData.patched) return model;
  const patch = ownPatch(car); // (a Legendary car wears its base car's patch unless it has its own; a Super car its base's window edits)
  if (!patch) return model;
  const result = applyPatch(model, patch, { evil });
  if (result.unmatched.length || result.warnings.length) console.warn('model patch for ' + car.id + ':', result.unmatched.length ? 'unmatched ' + result.unmatched.join(', ') : '', ...result.warnings);
  return model;
};
