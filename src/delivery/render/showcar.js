// ---- a car on show: its own model, and its paint for a side (the lot's cars, the showroom's live car and stills, and
// the start screen's car card: render/garage.js, showroomview.js, carstill.js, menustage.js). Whoever makes one adds it
// to a scene of their own: makeCarMesh puts it in the game's scene first. Its own module (garage.js re-exports both) so
// that a check can build every car's model without the car lot's screen (scripts/.suspension-check.mjs).
import { makeCarMesh, shapeCarMesh, makeTankMesh } from './cars.js';
import { MODELS } from './models.js';
import { makeIdeaModel } from './ideaModels.js';
import { makeUfo, addSuperKit } from './carExtras.js';
import { patchModel, shapeEditsFor } from './modelpatchapply.js'; // (the car's model patch, if it has one: src/delivery/modelpatches)
import { carShapes } from './shapeedits.js'; // (the car's own model built with its patch's shape edits, if any)
import { addLegend } from './legenddecal.js';
import { dressWheels } from './wheelcosmetic.js'; // (the player's global wheel colour on its hubs: render-only)
import { dressPlates } from './platecosmetic.js'; // (an equipped number plate hides the model's own plates: render-only)
import { dressProps } from './propdress.js'; // (an equipped roof prop, cargo prop or rear wing hides the model's own: render-only)
import { dressFlankDecal } from './flankdecal.js'; // (the flank decal FEASIBILITY prototype: nothing unless ?decaltest=, CHECKLIST 414)
import { dressUnderglow } from './underglow.js'; // (a glow on the road under the car: render-only, one flat mesh)
import { dressDecal } from './decalcosmetic.js'; // (the DECAL cosmetic, a trial on the zone table's cars: one flat mesh on the flanks, CHECKLIST 423)

// THE PLAYER'S COSMETICS on a model, all in one place (wheel set and rim, number plate, props, decal, underglow; a later cosmetic joins here):
// every model of the player's car goes through this (makeShowCar below, render/items.js playerModel). stock: true leaves the
// car as it was built (no cosmetic at all): for the UNLOCK REVEALS only (render/unlockcine.js and its directors in
// render/ecucine.js: a new car, a key, Crazey Jim's sale, ECU up / max; a pack reveal's cards, render/packs.js), which show
// the car as it comes (the owner, 15-Oct). Every other view (garage, showroom, Cosmetics, the menu card, stills, the game and
// its cameras) wears the player's loadout.
export const dressCosmetics = (model, car, { stock = false } = {}) => (stock ? model : dressUnderglow(dressFlankDecal(dressDecal(dressProps(dressPlates(dressWheels(model, car), car), car), car), car), car));
const onShow = (model) => { if (model?.userData) model.userData.onShow = true; return model; }; // (a car on show: a model whose wheels turn idles gently, render/models.js wheelTurn)
export const makeShowCar = (car, { stock = false } = {}) => {
  if (car.idea) return dressCosmetics(onShow(patchModel(carShapes(shapeEditsFor(car), () => makeIdeaModel(car)), car)), car, { stock }); // (a car idea in use: its own model, ideas.js; one with none throws below, and the card shows no picture)
  const mesh = car.tank ? makeTankMesh(car.color) : car.ufo ? makeUfo() : car.model ? carShapes(shapeEditsFor(car), () => MODELS[car.model](car)) : makeCarMesh(car.color); // (ufo: the earned Saucer)
  if (!car.tank && !car.ufo && !car.model) shapeCarMesh(mesh, car);
  if (car.super || car.superKit) addSuperKit(mesh, car); // (an earned car built as its garage car's Super version: the body kit on, as in play)
  if (car.legend) addLegend(mesh, car); // (a Legendary car: black and gold, the wreath on its flanks: render/legenddecal.js)
  return dressCosmetics(onShow(patchModel(mesh, car)), car, { stock });
};
export const paintShowCar = (mesh, car, evil) => {
  mesh.userData.body?.material.color.setHex((evil ? car.evilColor : car.color) ?? car.color); // (a level's own vehicle may have one paint, or no body to paint)
  mesh.userData.livery?.(evil);
};
