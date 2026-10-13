// ---- the model editor's page (delivery/modeleditor.html) loads the game's own modules to build a car's model, and some
// of them take hold of the game page's elements as they load (game.js, the HUD's...). On this page those are not there:
// each missing one is given a stand-in element (never in the page), so they load and do nothing. Imported FIRST by
// src/delivery/modeleditor.js. The game's WebGL renderer (render/scene.js) draws on this page's <canvas id="game">:
// the editor uses that one renderer, so the page has one WebGL context.
const byId = document.getElementById.bind(document);
const standIns = new Map();
document.getElementById = (id) => byId(id) || standIns.get(id) || standIns.set(id, Object.assign(document.createElement('div'), { id })).get(id);
