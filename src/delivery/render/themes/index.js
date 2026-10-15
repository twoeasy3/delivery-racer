// ---- THEMES WITH A FILE OF THEIR OWN: a theme's scenery (its `scenery` in ../../themes.js) drawn here, one file
// each, not in render/road.js. road.js calls the one named with what it has for standing things beside a road:
//   { theme, add, flat, instances, sideStrip, buildStrip, offRoads, standsClear, clearOfRoads, beside, inJunction,
//     exits, cube, tube, cone, levelGroup, elevatedRoad }
// (instances: one draw call per kind of thing, and nothing left standing on another road; sideStrip: a strip
// beside the road that stops short of any other; offRoads / standsClear / clearOfRoads: the tests themselves,
// for whatever is placed by hand. See road.js.)
//
// LOADED WHEN A LEVEL NEEDS THEM (the owner, 14-Oct: the menu was slow to come up; every theme's file, with its models, was
// in the first download and run before the menu showed: ~72 KB brotli and part of the 1.7 s of module work). Each theme is
// a dynamic import now, its own small file: the page asks for the picked level's after the menu is up (render/road.js:
// warmTheme) and for the rest when it is idle. THEME_SCENERY fills as they arrive; road.js draws a level whose theme has
// not arrived with the road and the land, and draws it again when it does. To add a theme: its file here and its name in
// THEME_FILES below, ONE LINE, above its batch's marker (the batches were built side by side on three branches: the
// markers keep their additions apart, so the branches merge).
// ============================================================================
export const THEME_SCENERY = {}; // name -> the function, once its file has arrived
const THEME_FILES = {
  toyroom: () => import('./toyroom.js'),
  seabed: () => import('./seabed.js'),
  moon: () => import('./moon.js'),
  // (batch A: toy room, underwater tunnel, moon base: new themes go above this line)
  backlot: () => import('./backlot.js'),
  venice: () => import('./venice.js'),
  iceroad: () => import('./iceroad.js'),
  // (batch B: film studio, Venice, ice road: new themes go above this line)
  themepark: () => import('./themepark.js'),
  volcano: () => import('./volcano.js'),
  port: () => import('./port.js'),
  // (batch C: theme park, volcano island, container port: new themes go above this line)
  wildwest: () => import('./wildwest.js'),
  favela: () => import('./favela.js'),
  rice: () => import('./rice.js'),
  // (batch D: Wild West, favela, rice terraces: new themes go above this line)
  fallout: () => import('./fallout.js'),
  halloween: () => import('./halloween.js'),
  autumn: () => import('./autumn.js'),
  rainforest: () => import('./rainforest.js'),
  tuscany: () => import('./tuscany.js'),
  desert: () => import('./desert.js'),
  mall: () => import('./mall.js'),
  city: () => import('./city.js'), // (the default theme: the city's streets, and every theme drawn as it, night, flooded)
  vegas: () => import('./vegas.js'),
  // (batch E: Las Vegas strip, Alpine pass, Steelworks: new themes go above this line)
};

const loading = {};
// the theme's scenery function, loaded (once); resolves to it, or to null for a name with no file of its own
export const loadTheme = (name) => {
  if (THEME_SCENERY[name]) return Promise.resolve(THEME_SCENERY[name]);
  if (!THEME_FILES[name]) return Promise.resolve(null);
  return loading[name] ||= THEME_FILES[name]().then((m) => (THEME_SCENERY[name] = m[name]), (e) => { delete loading[name]; throw e; });
};
export const hasThemeFile = (name) => !!THEME_FILES[name];
export const themeLoaded = (name) => !THEME_FILES[name] || !!THEME_SCENERY[name];
export const themeNames = () => Object.keys(THEME_FILES);
