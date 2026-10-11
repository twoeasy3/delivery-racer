// ============================================================================
// RACE WATCH - the second screensaver: a race on a circuit, watched as on TV. No player car (the
// player is out of play, following whichever car is being watched, so that what is shown is
// what is near it). The racers get a driver each, a cartoon name; their split from the leader is
// timed at every checkpoint (every CP m round the lap). A racer wrecked within CONFIG.race.killWindow
// s of another hitting it is that one's wreck: each racer's wrecks caused and times wrecked are both counted.
// Every so often the coverage cuts to another car: the closest battle, the leader, or anyone, and to
// another camera (see render/racewatch.js). Once the leader has taken the flag, and the rest have
// had a while to follow, a new race starts.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';

const CP = 25;          // m between checkpoints, for the splits
const AFTER = 18;       // s the race runs on once the leader has finished, before the next starts
const STAY = 1;         // s the coverage stays on a watched car that is wrecked, for the explosion
const MISHAP = 7;       // s a critical hit or a spin out is marked on the board
const NAMES = ['Turbo Tom Throttle', 'Skid Rowe', 'Wheelie Wilson', 'Brakey Blake', 'Max Revington', 'Lightning Lugnut',
  'Rusty Gearbox', 'Chuck Chicane', 'Penny Pitstop', 'Dusty Drifter', 'Vroom Vanderbilt', 'Sandy Slipstream', 'Hank Hairpin',
  'Polly Pole', 'Gus Guzzler', 'Ricky Redline', 'Nitro Nancy', 'Clutch Carter', 'Bumper Bob', 'Fender Fiona', 'Spinny Spencer',
  'Tyrone Tyres', 'Apex Annie', 'Dash Dashwood', 'Cam Shaft', 'Ollie Oversteer', 'Ulla Understeer', 'Piston Pete', 'Kurt Kerb',
  'Gina Grip', 'Benny Burnout', 'Flo Flagg', 'Lucky Lapps', 'Waldo Wingman', 'Sid Sidepod', 'Hugo Halo', 'Barry Barrier',
  'Diffy Diffuser', 'Doug Downforce', 'Mo Mentum'];
const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export const RaceWatch = {
  racers: [],
  pinned: null,     // the racer the viewer picked to follow (on the board), if any: the coverage stays on it
  focus: null,      // the racer being watched...
  focusFor: 0,      // ...for this many s more
  shot: 'trackside', // the camera on it: 'trackside' | 'chase' | 'heli' (see render/racewatch.js)
  cut: 0,           // goes up by one at each cut, so the camera knows to set up afresh
  finished: [],     // { car, time } in the order they took the flag
  ticker: { text: '', at: -99 }, // the latest news (a wreck), and when (Game.time)

  // a new race, the level loaded and started (Game.startRaceWatch)
  begin() {
    // (one more on the grid, in the player's slot at the back: there is no player)
    Traffic.addRacer(Player.s, Track.nearestLane(Player.lat, Player.s), LEVEL.grid.count % 2 === 1);
    Traffic.sortGrid(); // (and the grid in order again, with it)
    this.racers = Traffic.cars.filter(c => c.racer);
    const names = shuffle(NAMES);
    // (and each one's three letters, as on a TV graphic: the surname's first three, or if those are
    // taken, the first name's initial and the surname's first two)
    const taken = new Set(), abbr = (name) => {
      const words = name.toUpperCase().replace(/[^A-Z ]/g, '').split(' '), last = words[words.length - 1];
      for (const a of [last.slice(0, 3), words[0][0] + last.slice(0, 2), last[0] + last.slice(-2)]) if (!taken.has(a)) return a;
      return last.slice(0, 2) + taken.size % 10;
    };
    this.racers.forEach((c, i) => {
      c.driverName = names[i % names.length];
      c.abbr = abbr(c.driverName);
      taken.add(c.abbr);
    });
    this.racers.forEach((c, i) => Object.assign(c, { driverName: names[i % names.length], wrecks: 0, kills: 0, hitBy: null, mishap: null, wasActive: true, splits: [], done: false }));
    this.finished = [];
    this.standings().forEach((c, i) => { c.grid = i + 1; }); // (where each started)
    this.ticker = { text: 'Lights out, and away we go!', at: 0 };
    this.focus = null;
    this.pinned = null;
    this.pick();
  },
  // the viewer picks a racer to follow (and the race director, back in charge, when they let it go)
  follow(c) {
    this.pinned = c;
    this.pick();
  },
  director() {
    this.pinned = null;
    this.pick();
  },
  // how far round the race a racer is (m)
  progress(c) { return (c.laps || 0) * Track.length + c.s; },
  // the running order: those that have finished, in the order they did; then the rest, furthest round first
  standings() {
    const done = this.finished.map(f => f.car);
    return [...done, ...this.racers.filter(c => !c.done).sort((a, b) => this.progress(b) - this.progress(a))];
  },
  // what befell a racer lately ('crit' | 'spin'), if anything, to mark on the board
  mishap(c) { return c.mishap && Game.time - c.mishap.at < MISHAP ? c.mishap.kind : null; },
  // a racer's gap to one ahead of it (the leader, say), in s, at the last checkpoint both have
  // passed (null: no telling yet)
  gap(c, leader) {
    if (c === leader) return 0;
    const k = c.splits.length - 1;
    if (k < 0 || leader.splits[k] === undefined) return null;
    return c.splits[k] - leader.splits[k];
  },
  // whole laps a racer is down on the leader
  lapsDown(c, leader) { return Math.floor((this.progress(leader) - this.progress(c)) / Track.length); },
  // cut to another car: the closest battle near the front, the leader, or anyone (or another
  // camera on the one the viewer is following)
  pick() {
    const order = this.standings().filter(c => c.active && !c.done);
    if (!order.length && !this.pinned) return;
    const roll = Math.random();
    let next = this.pinned || order[0]; // (the viewer's choice, if they made one)
    if (this.pinned) { /* stays on it */ } else if (roll < 0.5) { // the closest battle in the top fifteen: the one chasing
      let best = Infinity;
      for (let i = 1; i < Math.min(15, order.length); i++) {
        const d = this.progress(order[i - 1]) - this.progress(order[i]);
        if (d < best) { best = d; next = order[i]; }
      }
    } else if (roll > 0.75) next = order[Math.floor(Math.random() * order.length)];
    this.focus = next;
    this.focusFor = 7 + Math.random() * 5;
    this.shot = ['trackside', 'trackside', 'trackside', 'chase', 'heli'][Math.floor(Math.random() * 5)];
    this.cut++;
  },
  update(dt) {
    let order = null; // (the running order, worked out only if there is news to put places to)
    const P = (c) => 'P' + ((order ||= this.standings()).indexOf(c) + 1) + ' ' + c.driverName;
    for (const c of this.racers) {
      if (c.wasActive && !c.active) { // wrecked: another racer's doing, if it hit it just now
        c.wrecks++;
        const by = c.hitBy && c.hitBy.racer && c.hitBy !== c && Game.time - c.hitAt < CONFIG.race.killWindow ? c.hitBy : null;
        if (by) by.kills++;
        this.ticker = { text: by ? P(by) + ' takes out ' + P(c) + '!' : P(c) + ' crashes!', at: Game.time };
        c.hitBy = null;
        if (c === this.focus) this.focusFor = STAY; // (the watched car: the coverage stays on it for the explosion)
      }
      c.wasActive = c.active;
      // (a critical hit, or a spin out, just now: marked on the board for a while)
      if (c.wobble > 0 && !c.wasWobbling) c.mishap = { kind: 'crit', at: Game.time };
      if (c.spin > 0 && !c.wasSpinning) c.mishap = { kind: 'spin', at: Game.time };
      c.wasWobbling = c.wobble > 0;
      c.wasSpinning = c.spin > 0;
      // the splits: when it passed each checkpoint
      const k = Math.floor(this.progress(c) / CP);
      while (c.splits.length <= k) c.splits.push(Game.time);
      // the flag
      if (!c.done && (c.laps || 0) >= LEVEL.laps) {
        c.done = true;
        this.finished.push({ car: c, time: Game.time });
        if (this.finished.length === 1) this.ticker = { text: c.driverName + ' wins from P' + c.grid + '!', at: Game.time };
      }
    }
    // the coverage: another car now and then (and straight away once this one is home)
    if ((this.focusFor -= dt) <= 0 || !this.focus || (this.focus.done && !this.pinned)) this.pick();
    // the player, out of play, is wherever the watched car is
    if (this.focus) {
      Player.s = this.focus.s;
      Player.lat = this.focus.lat;
      Player.speed = Math.abs(this.focus.vs);
    }
    // the next race, a while after the winner
    if (this.finished.length && Game.time - this.finished[0].time > AFTER) Game.startRaceWatch();
  },
};
