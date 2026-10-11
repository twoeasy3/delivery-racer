// ============================================================================
// MESSAGES - the short lines that pop up during a run: a powerup picked up, a bust, a driver
// reacting to a package. The wording is all in messages.json: each entry is a list, and one
// of them is picked at random each time; an empty list (or "") shows nothing.
// Two lines show at once (see render/hud.js), each for its time in CONFIG.messageTimes. A new message goes
// on the top line if it is free, then the bottom one; with both taken it always shows anyway,
// in place of the less important of the two (or, of two as important, the older). Only one
// driver's reaction is ever up: a new one takes the place of one already showing. A message
// the same as one still showing (another car destroyed) doesn't take a line: that one stays up longer.
// A sticky message (CONFIG.messageTimes.sticky: a flat tyre, no brakes) is said the same way and for the
// same time, and is also kept in Message.sticky for as long as its condition lasts (Message.conditions,
// which player.js fills in): the HUD shows a small icon for each of those (never its words again, unless
// the icon is touched: Message.recall).
// ============================================================================
import MESSAGES from './messages.json';
import { CONFIG } from './config.js';

// each message has a kind, which sets its colour (see style.css, #messages) and how important
// it is, least first: reaction (white), pickup (yellow), rage (red: TANK RAGE, its pieces, a
// car destroyed), bust (blue)
const RANK = { reaction: 0, pickup: 1, rage: 2, bust: 3 };
const kindOf = (group, key) => group === 'reactions' ? 'reaction' : group === 'busts' ? 'bust'
  : group === 'wrecks' || group === 'tankParts' || key === 'tankRage' ? 'rage' : 'pickup';

// s a message stays up, by its path in messages.json: the first of CONFIG.messageTimes' keys, groups and
// kinds that names it, or the default
export const timeFor = (group, ...keys) => {
  const T = CONFIG.messageTimes;
  return T.keys[[group, ...keys].join('.')] ?? T.groups[group] ?? T.kinds[kindOf(group, keys[0])] ?? T.default;
};

const empty = () => ({ text: '', kind: '', at: 0, time: 0, id: 0 });
let nextId = 1;

export const Message = {
  lines: [empty(), empty()], // top, bottom: { text, kind, at (ms), time (s it stays up), id (new for every message) }
  // the sticky messages up, oldest first: { line (the message as it was said: its text may be filled in
  // after), path, condition, key, progress (0 .. 1 of the way to its end, where the condition counts one or
  // says how long it has left), total (s: the most it has had left), id }
  sticky: [],
  // what a sticky message lasts for, by name: { on(key): still true?, and one of progress(key): 0 .. 1 of the
  // way to its end, or left(key): s until it ends, if it has either }
  // (key: the last of the message's path, the effect of a mystery). `run`, if there, is asked of them all:
  // false while the car is wrecked or busted, or the run is over. Filled in by player.js
  conditions: {},
  // a line of text from messages.json, by its path (one of the entry's at random; '' if none)
  pick(group, ...keys) {
    let entry = MESSAGES[group];
    for (const key of keys) entry = entry && entry[key];
    const options = [].concat(entry || []).filter(o => typeof o === 'string' && o);
    return options.length ? options[Math.floor(Math.random() * options.length)] : '';
  },
  // shows a message, by its path in messages.json, e.g. say('powerups', 'turbo') or
  // say('powerups', 'mystery', 'toad'). Returns the line it is on (its text can still be added to)
  say(group, ...keys) {
    const text = this.pick(group, ...keys);
    if (!text) return null;
    const now = performance.now(), [top, bottom] = this.lines;
    const free = (line) => !line.text || now - line.at >= line.time * 1000;
    const outranks = (a, b) => RANK[a.kind] > RANK[b.kind] || (RANK[a.kind] === RANK[b.kind] && a.at > b.at);
    const kind = kindOf(group, keys[0]);
    const time = timeFor(group, ...keys);
    const same = this.lines.find(line => !free(line) && line.text === text);
    if (same) return this.hold(Object.assign(same, { at: now, time }), group, keys);
    const reaction = kind === 'reaction' ? this.lines.findIndex(line => !free(line) && line.kind === 'reaction') : -1;
    const slot = reaction >= 0 ? reaction : free(top) ? 0 : free(bottom) ? 1 : outranks(top, bottom) ? 1 : 0;
    this.lines[slot] = { text, kind, at: now, time, id: nextId++ };
    return this.hold(this.lines[slot], group, keys);
  },
  // a message just said is kept as a sticky one, if the table says it is (one of a kind: said again, it
  // takes the place of the one before). Returns the line, as say does
  hold(line, group, keys) {
    const path = [group, ...keys].join('.'), condition = CONFIG.messageTimes.sticky[path];
    if (!condition) return line;
    this.sticky = this.sticky.filter(held => held.path !== path);
    this.sticky.push({ line, path, condition, key: keys[keys.length - 1], progress: 0, total: 0, id: nextId++ });
    return line;
  },
  // a sticky message's words again, for a moment (CONFIG.messageTimes.recall), as the ordinary message they
  // were: the player has touched its icon. On the line it is still on, else a free one, else the older
  recall(path) {
    const held = this.sticky.find(h => h.path === path);
    if (!held) return null;
    const now = performance.now(), [top, bottom] = this.lines, line = held.line, again = CONFIG.messageTimes.recall;
    const left = (l) => l.text ? l.time - (now - l.at) / 1000 : 0;
    if (this.lines.includes(line) && left(line) >= again) return line; // (still up, and for longer than this would keep it)
    if (!this.lines.includes(line)) this.lines[left(top) <= 0 ? 0 : left(bottom) <= 0 ? 1 : top.at <= bottom.at ? 0 : 1] = line;
    return Object.assign(line, { at: now, time: again });
  },
  // drops every sticky message whose condition has ended (and all of them with the car wrecked or busted, or
  // the run over), and brings the others' progress up to date: each step of the game, and before each drawing
  settle() {
    if (!this.sticky.length) return;
    const C = this.conditions, running = !C.run || C.run();
    this.sticky = this.sticky.filter(held => running && !!C[held.condition]?.on(held.key));
    for (const held of this.sticky) {
      const c = C[held.condition];
      if (c.progress) { held.progress = c.progress(held.key) || 0; continue; }
      if (!c.left) continue;
      const left = Math.max(0, c.left(held.key) || 0);
      held.total = Math.max(held.total, left);
      held.progress = held.total > 0 ? 1 - left / held.total : 0;
    }
  },
  clear() {
    this.lines = [empty(), empty()];
    this.sticky = [];
  },
};
