// ---- the game's side of MODEL PATCHES (render/modelpatch.js): a car's patch, applied once to each model built for it
// (render/showcar.js makeShowCar: the garage, the showroom, the inspector, the stills and the menu; render/items.js
// playerModel: the car driven; render/ideaslot.js: the ideas lot). Patches are src/delivery/modelpatches/<car id>.json,
// loaded lazily (a dynamic import per file: none, no code), started as this module loads; a model built before they
// are in is drawn as its code builds it.
//   ?modelpatch=local   the model editor's own patches instead (this browser's localStorage, LOCAL_KEY), for a look
//   ?modelpatch=off     none at all
import { applyPatch } from './modelpatch.js';

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
// patch a model just built for this car (once: a model already patched is left), painted for the side
export const patchModel = (model, car, evil = false) => {
  if (!on || !model || !car || model.userData.patched) return model;
  const patch = patchFor(car.id);
  if (!patch) return model;
  const result = applyPatch(model, patch, { evil });
  if (result.unmatched.length || result.warnings.length) console.warn('model patch for ' + car.id + ':', result.unmatched.length ? 'unmatched ' + result.unmatched.join(', ') : '', ...result.warnings);
  return model;
};
