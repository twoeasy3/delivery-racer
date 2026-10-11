// ============================================================================
// THE WORDS FILES - every thing's name and its short line, one file per KIND, named alike and kept beside
// levelText.json (the levels' own: levelText.js reads that one), each by the thing's id:
//   carText.json      the garage's cars and the levels' own vehicles (cars.js ids): name, blurb, perk (the garage's line)
//   cargoText.json    the cargo (cargo.js ids): name (Title Case), blurb, states (an Evil item's three, sentence case)
//   trafficText.json  the vehicle kinds in traffic (CONFIG.vehicles keys, levelinfo.js): name, blurb
//   pickupText.json   the pickups (powerups.js types): name, blurb
//   gimmickText.json  the Gimmicks page's cards (gimmicks.js: the id is the card's name as the code has it, lower
//                     case, with dashes: "The giant frog" is "the-giant-frog"): name, blurb
//   obstacleText.json the plain obstacles as a theme has them (gimmicks.js DRESS kinds): name, blurb
//   { "<id>": { "name": "...", "blurb": "..." } }
// The blurb is the one short line (BLURB_MOST characters at most) on that thing's tile of the menu's "what's on this
// road" card (render/levelcard3d.js).
// THE FILE COMES FIRST: where it has an entry for a thing, and the field is a real one, the game uses it, over the
// text in the thing's own table (the table: the FALLBACK, where the thing is not in the file or the field is
// missing, blank or not text). Nothing here throws, and a bad entry never shows nothing: it is passed over.
// scripts/.words-check.mjs reads the files as the game does.
// ============================================================================
import CAR from './carText.json';
import CARGO from './cargoText.json';
import TRAFFIC from './trafficText.json';
import PICKUP from './pickupText.json';
import GIMMICK from './gimmickText.json';
import OBSTACLE from './obstacleText.json';

export const WORDS = { car: CAR, cargo: CARGO, traffic: TRAFFIC, pickup: PICKUP, gimmick: GIMMICK, obstacle: OBSTACLE };
export const BLURB_MOST = 70;

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : '';
const entry = (kind, id) => {
  const file = WORDS[kind];
  if (!file || typeof file !== 'object' || typeof id !== 'string' || !Object.hasOwn(file, id)) return null;
  const e = file[id];
  return e && typeof e === 'object' && !Array.isArray(e) ? e : null;
};
// a card's id: its name as the code has it, lower case, with dashes
export const slug = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// the file's name for a thing, else `fallback` (the table's own)
export const nameOf = (kind, id, fallback) => text(entry(kind, id)?.name) || fallback;
// the file's blurb for a thing, else `fallback`
export const blurbOf = (kind, id, fallback = '') => text(entry(kind, id)?.blurb) || fallback;
// the file's perk line for a car, else `fallback`
export const perkOf = (kind, id, fallback) => text(entry(kind, id)?.perk) || fallback;
// an Evil cargo's three states from the file: exactly three real lines, or else `fallback` (the table's own)
export const statesOf = (id, fallback) => {
  const s = entry('cargo', id)?.states;
  return Array.isArray(s) && s.length === 3 && s.every(x => text(x)) ? s.map(text) : fallback;
};
// put the file's names (and a perk) on a table's items in place, by `idOf(item)`: the items with no entry keep
// theirs. Called once, where the table is made
export const applyNames = (kind, items, idOf = (item) => item.id) => {
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const id = idOf(item);
    item.name = nameOf(kind, id, item.name);
    const perk = perkOf(kind, id, item.perk);
    if (perk !== undefined) item.perk = perk;
  }
  return items;
};
