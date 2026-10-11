// ---- THE CARGO: what the player is delivering ---------------------------------------------------
// Every delivery level carries one thing for a Good player and another for an Evil one, the same every
// run: a level's "cargo": { good, evil } (kept with its name and description in levelText.json, and in the
// level's own file as the fallback: see levelText.js and levels.js), or else one dealt by the level's place on
// the menu, so every item turns up across the game. It is only a sight: nothing in play goes by it. It is shown
// in a corner of the HUD and set down at the kerb when the level is delivered (delivery.js); the models
// are render/cargoModels.js, by the ids here.
// An Evil item has three states, which follow the clock: calm with plenty of it left, agitated as it
// runs down, furious in the last stretch and all through the tip countdown (CONFIG.consignment).
// A cargo's name is a proper name, in Title Case: every word capitalised but the small ones (of, in, a, the, on,
// with...), unless first; hyphenated words too (Gift-Wrapped Cactus, Jack-in-the-Box). Its states are short
// phrases, in sentence case.
import { CONFIG } from './config.js';
import { LEVELS } from './levels.js';
import { levelCargoNames } from './levelText.js';
import { nameOf, statesOf } from './words.js';

export const CARGO = {
  good: [
    { id: 'pizza', name: 'Tower of Pizzas' },
    { id: 'pancakes', name: 'Stack of Pancakes' },
    { id: 'ramen', name: 'Bowl of Ramen' },
    { id: 'cactus', name: 'Gift-Wrapped Cactus' },
    { id: 'clock', name: 'Grandfather Clock' },
    { id: 'goldfish', name: 'Goldfish' },
    { id: 'bouquet', name: 'Bouquet in a Vase' },
    { id: 'present', name: 'Birthday Present' },
    { id: 'teaset', name: 'Tiered Tea Set' },
    { id: 'canary', name: 'Canary in a Cage' },
    { id: 'bonsai', name: 'Potted Bonsai' },
    { id: 'lavalamp', name: 'Lava Lamp' },
    { id: 'surfboard', name: 'Surfboard with a Ribbon' },
    { id: 'sushi', name: 'Sushi Boat' },
    { id: 'cake', name: 'Wedding Cake' },
    { id: 'globe', name: 'Globe on a Stand' },
    { id: 'toolbox', name: 'Open Tool Box' },
    { id: 'record', name: 'Record Player' },
    { id: 'balloons', name: 'Bunch of Balloons' },
    { id: 'coffee', name: 'Tray of Coffees' },
    { id: 'telescope', name: 'Telescope on a Tripod' },
    { id: 'trophy', name: 'Trophy' },
    { id: 'puppy', name: 'Puppy in a Basket' },
    { id: 'sundae', name: 'Ice-Cream Sundae' },
    { id: 'snowglobe', name: 'Snow Globe' },
    { id: 'casserole', name: 'Thank-You Casserole' },
    { id: 'kittens', name: 'Box of Kittens' },
    { id: 'jumper', name: 'Hand-Knitted Jumper' },
    { id: 'books', name: 'Returned Library Books' },
    { id: 'fruit', name: "New Neighbour's Fruit Basket" },
    { id: 'radio', name: "Grandad's Repaired Radio" },
  ],
  evil: [
    { id: 'parcel', name: 'Ticking Parcel', states: ['Ticking', 'Fuse lit', 'About to blow'] },
    { id: 'porcupine', name: 'Porcupine', states: ['Sniffing about', 'Balled up', 'Rabid'] },
    { id: 'bees', name: 'Crate of Bees', states: ['Humming', 'Rattling', 'Swarming'] },
    { id: 'doll', name: 'Cursed Doll', states: ['Asleep', 'Awake', 'Possessed'] },
    { id: 'tentacle', name: 'Specimen Jar', states: ['Coiled up', 'Lid lifting', 'Loose'] },
    { id: 'egg', name: 'Egg in a Nest', states: ['Rocking', 'Cracked', 'Hatched'] },
    { id: 'cooker', name: 'Pressure Cooker', states: ['Simmering', 'Whistling', 'Red hot'] },
    { id: 'flytrap', name: 'Venus Flytrap', states: ['Jaws shut', 'Drooling', 'Snapping'] },
    { id: 'barrel', name: 'Barrel of Toxic Waste', states: ['Sealed', 'Leaking', 'Boiling over'] },
    { id: 'mirror', name: 'Haunted Mirror', states: ['Ordinary', 'A face in it', 'Reaching out'] },
    { id: 'skunk', name: 'Skunk in a Carrier', states: ['Asleep', 'Tail up', 'Spraying'] },
    { id: 'cannonball', name: 'Cannonball', states: ['Unlit', 'Fuse lit', 'Rolling about'] },
    { id: 'mimic', name: 'Mimic Chest', states: ['Shut', 'Showing teeth', 'On the run'] },
    { id: 'fireworks', name: 'Bundle of Fireworks', states: ['Tied up', 'One fizzing', 'Going off'] },
    { id: 'alien', name: 'Baby Alien', states: ['Curled up', 'Awake', 'Breaking out'] },
    { id: 'teddy', name: 'Possessed Teddy Bear', states: ['Sitting', 'Head backwards', 'Risen'] },
    { id: 'bats', name: 'Cage of Bats', states: ['Asleep', 'Waking', 'Frenzy'] },
    { id: 'ice', name: 'Block of Ice', states: ['Frozen solid', 'Dripping', 'Thawed out'] },
    { id: 'snakes', name: 'Sack of Snakes', states: ['Tied up', 'Heads out', 'Spilling out'] },
    { id: 'genie', name: 'Genie in a Bottle', states: ['Corked', 'Cork wobbling', 'Coming out'] },
    { id: 'reactor', name: 'Reactor Core', states: ['Steady', 'Spinning up', 'Critical'] },
    { id: 'goose', name: 'Angry Goose', states: ['Quiet', 'Hissing', 'Out of the crate'] },
    { id: 'jack', name: 'Jack-in-the-Box', states: ['Winding itself', 'Lid twitching', 'Sprung'] },
    { id: 'cloud', name: 'Thundercloud in a Jar', states: ['Grey cloud', 'Rumbling', 'Lightning'] },
    { id: 'piranhas', name: 'Piranha Tank', states: ['Idling', 'Circling', 'Leaping out'] },
    // the malicious deliveries: bad news for whoever gets them, seen only in part (hands, hats, paper)
    { id: 'lawyers', name: 'Crate of Lawyers', states: ['Waving', 'Flailing', 'Paper everywhere'] },
    { id: 'chainletter', name: 'Chain Letter', states: ['One letter', 'Five letters', 'A swarm'] },
    { id: 'glitter', name: 'Glitter Bomb', states: ['Gift-wrapped', 'Shaking', 'Erupting'] },
    { id: 'recorders', name: 'Recorder Class', states: ['Tuning up', 'Sour notes', 'Shrieking'] },
    { id: 'subpoena', name: 'Subpoena', states: ['Rolled up', 'Unrolling', 'Coiled round the crate'] },
    { id: 'telemarketers', name: 'Box of Telemarketers', states: ['A murmur', 'Phones out', 'Ringing off the hook'] },
    { id: 'taxmen', name: 'Sack of Tax Inspectors', states: ['Receipts trailing', 'Clipboards out', 'Stamping AUDIT'] },
    { id: 'wardens', name: 'Parking Wardens', states: ['Cap on the box', 'Writing tickets', 'Tickets flying'] },
    { id: 'consultants', name: 'Crate of Consultants', states: ['Laser dot', 'Pages flipping', 'Pie chart spinning'] },
    { id: 'inlaws', name: "The In-Laws' Luggage", states: ['Neatly stacked', 'Bulging', 'Heaving apart'] },
    { id: 'band', name: 'Marching Band in a Box', states: ['A faint oompah', 'Trombone out', 'Full blast'] },
    // the pranks (B): joke-shop goods and set-up pranks, things not people: calm a plain object with one tell,
    // agitated the prank arming, furious the prank going off, over and over
    { id: 'piecatapult', name: 'Custard Pie Catapult', states: ['Set', 'Twitching', 'Firing'] },
    { id: 'airhorn', name: 'Air Horn under a Cushion', states: ['Primed', 'Parping', 'Blaring'] },
    { id: 'ghost', name: 'Bedsheet Ghost', states: ['Folded', 'Rising', 'BOO'] },
    // the pranks (IDEAS-prank-cargo-12-Oct.md): joke-shop goods and set-up pranks, things and not people
    { id: 'nestedboxes', name: 'Boxes within Boxes', states: ['Wrapped', 'Opening', 'Gotcha'] },
    { id: 'spider', name: 'Spider on a Fishing Line', states: ['Hanging', 'Bobbing', 'Dropped'] },
    { id: 'ink', name: 'Disappearing Ink', states: ['Corked', 'Blotting', 'Splashing'] },
  ],
};
// the names and the Evil states in cargoText.json come first, these the fallback (words.js: a bad entry is passed over)
for (const side of ['good', 'evil']) for (const item of CARGO[side]) {
  item.name = nameOf('cargo', item.id, item.name);
  if (item.states) item.states = statesOf(item.id, item.states);
}
export const CARGO_STATES = ['calm', 'agitated', 'furious'];
const find = (side, id) => CARGO[side].find(c => c.id === id);

// The item a level names for a side, if any: the ids it names, levelText.json's first and then its own file's (the
// FAILSAFE: an id that is no item, a typo or one taken out, is passed over for the next place's, and if none is
// real there is no item named and the level is dealt one, below; never a crash, never nothing on show).
// scripts/.cargo-check.mjs fails a level that names an id there is not (cargoProblems)
const named = (level, side) => {
  for (const { id } of levelCargoNames(level, side)) { const item = typeof id === 'string' ? find(side, id) : undefined; if (item) return item; }
  return undefined;
};

// whether a level has a delivery to make at all: not a race, the Battlefield, or a level without packages
export const carriesCargo = (level) => !!level && !level.laps && !level.battle && !level.noPackages;
// what a level carries for a side: { id, name, states? }, or null on a level with nothing to deliver.
// The "cargo" it names (named), if it names a real one. The levels on the menu that name none are dealt the
// items that no level names, in the list's order, down the menu, and after those the whole list, round and
// round: so every item turns up somewhere, however many levels there are and whatever they name (a rotation by
// a level's place on the menu stopped reaching them all once enough levels named their own). A level off the
// menu: by its id
const dealt = { good: null, evil: null };
const deal = (side) => {
  const list = CARGO[side], carrying = LEVELS.filter(carriesCargo);
  const taken = new Set(carrying.map(level => named(level, side)?.id).filter(Boolean));
  const free = list.filter(item => !taken.has(item.id)), shift = side === 'evil' ? 2 : 0;
  const map = new Map();
  // (the Evil side starts two along, so a level's pair is not the same place in both lists)
  carrying.filter(level => !named(level, side)).forEach((level, i) => map.set(level, i < free.length ? free[(i + shift) % free.length] : list[(i - free.length + shift) % list.length]));
  return map;
};
export const cargoFor = (level, evil) => {
  if (!carriesCargo(level)) return null;
  const side = evil ? 'evil' : 'good', list = CARGO[side];
  const item = named(level, side);
  if (item) return item;
  dealt[side] = dealt[side] || deal(side);
  if (dealt[side].has(level)) return dealt[side].get(level);
  const n = [...String(level.id || '')].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return list[(n + (evil ? 2 + Math.floor(n / list.length) : 0)) % list.length];
};
// a level's "cargo" checked, in levelText.json and in its own file: the problems with it, as text
// (scripts/.cargo-check.mjs goes through every level's). cargoFor goes on without a bad id, by the failsafe above
export const cargoProblems = (level) => {
  const problems = [];
  for (const side of ['good', 'evil']) {
    for (const { id, from } of levelCargoNames(level, side)) {
      if (typeof id !== 'string' || !find(side, id)) problems.push('cargo: no ' + side + ' item "' + id + '", in ' + from + ' (' + CARGO[side].map(c => c.id).join(', ') + ')');
    }
  }
  return problems;
};
// an Evil item's state (0 calm, 1 agitated, 2 furious) with `remaining` s of an `allowed` s clock left
export const cargoState = (remaining, allowed) => {
  const share = allowed > 0 ? remaining / allowed : 0;
  return share <= CONFIG.consignment.furious ? 2 : share <= CONFIG.consignment.agitated ? 1 : 0;
};
