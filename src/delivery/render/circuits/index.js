// ============================================================================
// CIRCUITS - the scenery and landmarks of each real circuit with a theme of its own (a theme with
// scenery: 'circuit' and circuit: <id>: see themes.js). road.js draws what every circuit has: the
// trackside (walls, catch fences, kerbs, light pylons when lit), the level's grandstands and pits,
// and the land (terrain, if the theme has it); then calls the circuit's own drawer with a bag of
// road.js's helpers, `ctx`:
//   THREE, levelGroup (add meshes to it), Track, LEVEL, CONFIG, theme, tmp (a scratch {x, y, z})
//   add(geo, mat)                  a mesh of the two, added to the level
//   flat(color)                    a material for flat things on the ground (lit if the theme is)
//   buildStrip(s0, s1, latA, latB, y, step)   a ribbon along the road between two lat functions
//   instances(geo, color, list, glowing)      an InstancedMesh from entries [s, lat, y, sx, sy, sz] in road
//                                  space (an optional 7th, [s1, lat1], makes a run from (s, lat) to there)
//   placeEntry(entry), dummy       the same placing, for a mesh of one's own
//   cube, tube                     unit geometries for instances
//   beside(side, s, d)             lat d m off the pavement's edge on that side (-1 left, +1 right)
//   terrainAt(x, z)                the land's height at a world point (null where the theme has no terrain)
//   offRoads(x, z, margin)         whether a world point is clear of every side road
//   clearOfRoads(cx, cz, dx, dz, far, r, margin)   a spot out along a direction clear of all roads
//   inJunction(s)                  whether s is in a junction
// Everything a circuit draws must stay off the road: check Track.mainDistance(x, z) > half the road's
// width there (see the montreal and bathurst sceneries in road.js for the pattern).
// ============================================================================
import monza from './monza.js';
import spa from './spa.js';
import albertPark from './albert-park.js';

export const CIRCUITS = { monza, spa, 'albert-park': albertPark };
