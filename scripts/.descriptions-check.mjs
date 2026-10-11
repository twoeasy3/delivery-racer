// A headless check of the levels' words (their names and descriptions: src/delivery/levelText.json, and a level's
// own "name" and "description" where that file has not got them: see src/delivery/levelText.js), in seconds, as
// the game reads them (levelName, levelDescription): every level on the menu has a name, and a description for each
// side it is played on (only "good" on a level that is always Good), each a sentence or two of no more than MOST
// characters, and the two not the same. And of the file: every id in it is a real level, and no level has a word
// in both places that reads differently in the two.
//   node scripts/.descriptions-check.mjs [--list]      (--list: every level's, with their lengths)
import { boot } from './delivery-headless.mjs';

const MOST = 160, LEAST = 40;
const g = await boot();
let failed = 0;
const fail = (text) => { failed++; console.log('FAIL ' + text); };
try {
  const { LEVELS, HIDDEN_LEVELS, SCREENSAVER_LEVEL, levelLabel } = g.levels;
  const { levelName, levelDescription, levelWords, standsAlone, LEVEL_TEXT } = await g.load('levelText.js');
  // ---- the file: only real levels in it, and nothing said twice differently
  const every = [...LEVELS, ...Object.values(HIDDEN_LEVELS), SCREENSAVER_LEVEL], ids = new Set(every.map(l => l.id));
  let inFile = 0, inLevel = 0;
  for (const [id, words] of Object.entries(LEVEL_TEXT)) {
    if (!ids.has(id)) fail('levelText.json: "' + id + '" is no level');
    // (an entry may be only the level's cargo, which scripts/.cargo-check.mjs checks; a name it has must be a name)
    for (const key of Object.keys(words)) if (key !== 'name' && key !== 'description' && key !== 'cargo') fail('levelText.json: ' + id + '.' + key + '?');
    if (words.name !== undefined && (typeof words.name !== 'string' || !words.name.trim())) fail('levelText.json: ' + id + ' has no name');
  }
  for (const level of every) {
    const filed = LEVEL_TEXT[level.id];
    if (filed?.name || filed?.description) inFile++; else inLevel++;
    if (!filed?.name && (typeof level.name !== 'string' || !level.name.trim())) fail(level.id + ': no name, in levelText.json or in its own file');
    if (!filed) continue;
    if (level.name !== undefined && filed.name !== undefined && level.name !== filed.name) fail(level.id + ': its name is "' + filed.name + '" in levelText.json and "' + level.name + '" in its own file');
    for (const side of ['good', 'evil']) {
      const a = filed.description?.[side], b = level.description?.[side];
      if (a !== undefined && b !== undefined && a !== b) fail(level.id + ': its ' + side + ' description differs between levelText.json and its own file');
    }
  }
  // ---- the fallbacks: the file first, then the level's own, then its id; a level from the editor, its own first
  const some = LEVELS.find(l => LEVEL_TEXT[l.id]?.description?.evil);
  if (some) {
    const copy = standsAlone({ id: some.id, name: 'Its Own Name', description: { good: 'Its own words.' } });
    if (levelName({ id: some.id, name: 'Another' }) !== LEVEL_TEXT[some.id].name) fail('levelName: the file does not come before a name in the level itself');
    if (levelName(copy) !== 'Its Own Name' || levelDescription(copy, false) !== 'Its own words.') fail('a level that stands alone (one from the editor) is not read from its own words first');
    if (levelDescription(some, true) !== LEVEL_TEXT[some.id].description.evil || levelDescription(some, false) !== LEVEL_TEXT[some.id].description.good) fail('levelDescription: not the side asked for');
  }
  if (levelName({ id: 'no-such-level' }) !== 'no-such-level' || levelDescription({ id: 'no-such-level' }, true) !== '' || levelName(null) !== '' || levelDescription(undefined) !== '')
    fail('a level with no words anywhere: its id for a name, no description, no crash');
  if (levelName({ id: 'x', name: 'Own' }) !== 'Own' || levelDescription({ id: 'x', description: { good: 'G.', evil: 'E.' } }, true) !== 'E.' || levelDescription({ id: 'x', description: { good: 'G.' } }, true) !== 'G.')
    fail('a level not in the file: its own name and description (the Good one where it has no Evil one)');
  // ---- every level on the menu, as the game reads it
  LEVELS.forEach((level, i) => {
    const d = levelWords(level).description, oneSided = !!(level.battle || level.alwaysGood);
    if (!levelName(level) || levelName(level) === level.id) fail(level.id + ': no name');
    if (!d) return fail(level.id + ': no description');
    for (const side of oneSided ? ['good'] : ['good', 'evil']) {
      const text = d[side];
      if (text !== levelDescription(level, side === 'evil')) fail(level.id + ': levelDescription does not give its ' + side + ' description');
      if (typeof text !== 'string' || !text.trim()) { fail(level.id + ': no ' + side + ' description'); continue; }
      if (text.length > MOST) fail(level.id + ': its ' + side + ' description is ' + text.length + ' characters (' + MOST + ' at most)');
      if (text.length < LEAST) fail(level.id + ': its ' + side + ' description is only ' + text.length + ' characters');
      if (text !== text.trim() || /\s{2,}/.test(text)) fail(level.id + ': stray spaces in its ' + side + ' description');
      if (!/[.!?]$/.test(text)) fail(level.id + ': its ' + side + ' description does not end a sentence');
      if (process.argv.includes('--list')) console.log(levelLabel(i).padEnd(4) + side.padEnd(5) + String(text.length).padStart(4) + '  ' + text);
    }
    if (oneSided && d.evil) fail(level.id + ': always Good, but it has an evil description');
    if (!oneSided && d.good === d.evil) fail(level.id + ': the two descriptions are the same');
    for (const key of Object.keys(d)) if (key !== 'good' && key !== 'evil') fail(level.id + ': description.' + key + '?');
  });
  console.log(failed ? failed + ' FAILED' : LEVELS.length + ' levels, every description there and within ' + MOST + ' characters; ' + inFile + ' with their words in levelText.json, ' + inLevel + ' with them in their own files');
} finally {
  await g.close();
}
process.exit(failed ? 1 : 0);
