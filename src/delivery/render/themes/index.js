// ---- THEMES WITH A FILE OF THEIR OWN: a theme's scenery (its `scenery` in ../../themes.js) drawn here, one file
// each, not in render/road.js. road.js calls the one named with what it has for standing things beside a road:
//   { theme, add, flat, instances, sideStrip, buildStrip, offRoads, standsClear, clearOfRoads, beside, inJunction,
//     exits, cube, tube, cone, levelGroup, elevatedRoad }
// (instances: one draw call per kind of thing, and nothing left standing on another road; sideStrip: a strip
// beside the road that stops short of any other; offRoads / standsClear / clearOfRoads: the tests themselves,
// for whatever is placed by hand. See road.js.) To add a theme: its file here, its import and its name below, ONE A
// LINE, each on the line above its batch's marker (the batches were built side by side on three branches: the markers
// keep their additions apart, so the branches merge).
import { toyroom } from './toyroom.js';
import { seabed } from './seabed.js';
import { moon } from './moon.js';
// (batch A's imports go above this line)
import { backlot } from './backlot.js';
import { venice } from './venice.js';
import { iceroad } from './iceroad.js';
// (batch B's imports go above this line)
import { themepark } from './themepark.js';
import { volcano } from './volcano.js';
import { port } from './port.js';
// (batch C's imports go above this line)
import { wildwest } from './wildwest.js';
import { favela } from './favela.js';
import { rice } from './rice.js';
// (batch D's imports go above this line)
import { fallout } from './fallout.js';

export const THEME_SCENERY = {
  toyroom,
  seabed,
  moon,
  // (batch A: toy room, underwater tunnel, moon base: new themes go above this line)
  backlot,
  venice,
  iceroad,
  // (batch B: film studio, Venice, ice road: new themes go above this line)
  themepark,
  volcano,
  port,
  // (batch C: theme park, volcano island, container port: new themes go above this line)
  wildwest,
  favela,
  rice,
  // (batch D: Wild West, favela, rice terraces: new themes go above this line)
  fallout,
};
