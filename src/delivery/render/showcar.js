// ---- a car on show: its own model, and its paint for a side (the lot's cars, the showroom's live car and stills, and
// the start screen's car card: render/garage.js, showroomview.js, carstill.js, menustage.js). Whoever makes one adds it
// to a scene of their own: makeCarMesh puts it in the game's scene first. Its own module (garage.js re-exports both) so
// that a check can build every car's model without the car lot's screen (scripts/.suspension-check.mjs).
import { makeCarMesh, shapeCarMesh, makeTankMesh } from './cars.js';
import { MODELS } from './models.js';
import { makeIdeaModel } from './ideaModels.js';
import { makeUfo, addSuperKit } from './carExtras.js';
import { patchModel } from './modelpatchapply.js'; // (the car's model patch, if it has one: src/delivery/modelpatches)
import { addLegend } from './legenddecal.js';
import { dressWheels } from './wheelcosmetic.js'; // (the player's global wheel colour on its hubs: render-only)
import { dressPlates } from './platecosmetic.js'; // (an equipped number plate hides the model's own plates: render-only)

export const makeShowCar = (car) => {
  if (car.idea) return dressPlates(dressWheels(patchModel(makeIdeaModel(car), car), car), car); // (a car idea in use: its own model, ideas.js; one with none throws below, and the card shows no picture)
  const mesh = car.tank ? makeTankMesh(car.color) : car.ufo ? makeUfo() : car.model ? MODELS[car.model](car) : makeCarMesh(car.color); // (ufo: the earned Saucer)
  if (!car.tank && !car.ufo && !car.model) shapeCarMesh(mesh, car);
  if (car.super || car.superKit) addSuperKit(mesh, car); // (an earned car built as its garage car's Super version: the body kit on, as in play)
  if (car.legend) addLegend(mesh, car); // (a Legendary car: black and gold, the wreath on its flanks: render/legenddecal.js)
  return dressPlates(dressWheels(patchModel(mesh, car), car), car);
};
export const paintShowCar = (mesh, car, evil) => {
  mesh.userData.body?.material.color.setHex((evil ? car.evilColor : car.color) ?? car.color); // (a level's own vehicle may have one paint, or no body to paint)
  mesh.userData.livery?.(evil);
};
