// ============================================================================
// THE LEVELS' WORDS - every level's name and its description for each side, in one file to read and edit:
// levelText.json, by level id, in the menu's order:
//   { "<id>": { "name": "...", "description": { "good": "...", "evil": "..." }, "cargo": { "good": "...", "evil": "..." } } }
// Whoever shows a level's name or description asks here (levelName, levelDescription), never the level itself.
// The answer is levelText.json's where it has that level and that field; else the level's own file's ("name",
// "description": the fallback, and where a level not in the file yet keeps them); a level with neither is
// named by its id and has no description.
// The level's "cargo" (the ids of cargo.js, a good one and an evil one: what it is delivering) is kept the same
// way, side by side with the words, and read the same way, a side at a time: the file's, else the level's own.
// This file only says what ids are named (levelCargoNames); cargo.js, which knows the items, takes the first that
// is a real one (so an id that is a typo, or an item taken out, falls back to the level's own file's, and then to
// the rule that deals items to the levels that name none: cargoFor never fails or shows nothing). A level that stands by itself (one handed over by the level editor,
// ?edited: see main.js) is asked first: its words are whatever its own JSON says.
// A description is for the side being played: Evil's on Evil, Good's on Good (and Good's where a level has
// only that one: a level that is always Good, the Battlefield).
// ============================================================================
import TEXT from './levelText.json';

const alone = new WeakSet();
// this level's own words come first (the level editor's level): returns it
export const standsAlone = (level) => { if (level && typeof level === 'object') alone.add(level); return level; };

const text = (value) => typeof value === 'string' ? value : '';
const inFile = (level) => (level && TEXT[level.id]) || null;
// the two places a level's words can be, the one asked first first
const places = (level) => alone.has(level) ? [level, inFile(level)] : [inFile(level), level];

// the level's name ('' for no level at all)
export const levelName = (level) => {
  if (!level) return '';
  for (const place of places(level)) if (text(place?.name)) return place.name;
  return text(level.id);
};
// the level's description for the side played (evil: true or false); '' if it has none
export const levelDescription = (level, evil = false) => {
  if (!level) return '';
  const all = places(level).map(place => place?.description).filter(d => d && typeof d === 'object');
  for (const side of evil ? ['evil', 'good'] : ['good']) for (const d of all) if (text(d[side])) return d[side];
  return '';
};
// the ids this level names as its cargo for a side ('good' | 'evil'), the one asked first first: { id, from }, from
// being 'levelText.json' or 'its own file'. They are not checked here (cargo.js does that: cargoFor, cargoProblems)
export const levelCargoNames = (level, side) => {
  const out = [];
  if (!level) return out;
  for (const place of places(level)) {
    const id = place?.cargo?.[side];
    if (id !== undefined && id !== null) out.push({ id, from: place === level ? 'its own file' : 'levelText.json' });
  }
  return out;
};
// the level's cargo as its own file would carry it: { good, evil }, a side only if it names one (the first it
// names, unchecked); undefined if it names none at all
export const levelCargo = (level) => {
  const out = {};
  for (const side of ['good', 'evil']) {
    const named = levelCargoNames(level, side)[0];
    if (named) out[side] = named.id;
  }
  return Object.keys(out).length ? out : undefined;
};
// the level's words as its own file would carry them: { name, description: { good, evil } } (a side only if
// it has one; no description at all if it has neither)
export const levelWords = (level) => {
  const description = {};
  for (const side of ['good', 'evil']) {
    const d = places(level).map(place => text(place?.description?.[side])).find(Boolean);
    if (d) description[side] = d;
  }
  return { name: levelName(level), ...(Object.keys(description).length ? { description } : {}) };
};
// a copy of the level with its words (and cargo) in it, where its own file has them (after its id): what the level
// editor opens, checks and downloads, so that a level's file from there stands by itself
export const withWords = (level) => {
  const { name, description } = levelWords(level), cargo = levelCargo(level), out = {};
  const { name: n, description: d, ...rest } = level;
  const put = () => { out.name = name; if (description) out.description = description; if (cargo) out.cargo = cargo; };
  for (const [key, value] of Object.entries(rest)) {
    if (key === 'cargo' && cargo) continue; // (put with the words: the file's, over the level's own, a side at a time)
    out[key] = value;
    if (key === 'id') put();
  }
  if (!('name' in out)) put();
  return out;
};
// every level id the file has words for (scripts/.descriptions-check.mjs)
export const LEVEL_TEXT = TEXT;
