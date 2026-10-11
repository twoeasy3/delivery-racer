// ============================================================================
// MILESTONES - counters kept across every run in the save (Progress.data.stats, bumped with
// Progress.count), and the milestones they reach: thresholds per counter in CONFIG.milestones, each with
// a title in messages.json (group "milestones", key "<counter>_<threshold>"). Reaching one mid-run says
// nothing and makes no sound: it is counted, and shows on the wall. Nothing but bragging rights: the wall
// on the start screen (render/milestones.js).
// The counters: packagesLanded (packages.js), hipposSurvived (hippos.js), trainsDodged (bullettrain.js),
// and here: copsOutrun, wrecks, busts (watched each step), levelsDelivered and kmDriven (on finish).
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL_INDEX } from './levels.js';
import { Track } from './track.js';
import { Progress } from './progress.js';
import { Message } from './messages.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Social } from './social.js';
import { Game } from './game.js';

export const Milestones = {
  seen: new Set(), // police cars that have been near enough to bust the player, and are not outrun yet
  wrecks: 0,       // the run's wrecks and busts as last counted
  busts: 0,

  reset() {
    this.seen.clear();
    this.wrecks = this.busts = 0;
    if (!this.hooked) { this.hooked = true; Game.onFinish.push(onFinish); } // (from Game.start: Game exists by then, which it may not when this module loads)
  },
  // each step of a run: a police car that was near (as Traffic.policeNear sees it) and then falls
  // `outrun` m behind the player without a bust is outrun, once each
  update(dt) {
    const M = CONFIG.milestones;
    if (Game.screensaver) return; // (nobody is driving)
    if (Game.wrecks > this.wrecks) Progress.count('wrecks', Game.wrecks - this.wrecks);
    if (Game.busts > this.busts) { Progress.count('busts', Game.busts - this.busts); this.seen.clear(); } // (busted: nobody was outrun)
    this.wrecks = Game.wrecks;
    this.busts = Game.busts;
    if (Player.busted) this.seen.clear();
    for (const c of Traffic.cars) {
      if (!c.active || c.kind !== 'police' || c.toad || c.junction) { this.seen.delete(c); continue; }
      const behind = Player.s - c.s; // (how far behind the player it is)
      if (behind > M.outrun) {
        if (this.seen.delete(c)) Progress.count('copsOutrun');
      } else if (Math.abs(behind) < Social.policeSight && Math.abs(c.lat - Player.lat) < 25 && c.stun <= 0) this.seen.add(c);
    }
  },
};

// a counter crossing one of its thresholds: the milestone's title (no sound: it would play over the results jingle). Never while a level is
// being driven (nothing of a milestone is an event of the run): only as the run ends (see onFinish)
Progress.onCount = (key, before, after) => {
  if (Game.state === 'playing') return;
  for (const at of CONFIG.milestones[key] || []) {
    if (before < at && after >= at) {
      Message.say('milestones', key + '_' + at);
    }
  }
};
// a run over: the level delivered (not a hidden one), the distance driven, and the save written
// (a Game.onFinish hook, registered by reset(); the hooks are called from Game.exit too, with no run finished)
const onFinish = () => {
  if (Game.state !== 'finished' || Game.screensaver) return Progress.flush(); // (a run left: what it counted is written all the same)
  if (Game.outcome === 'delivered' && LEVEL_INDEX >= 0) Progress.count('levelsDelivered');
  Progress.count('kmDriven', Math.max(0, (Game.lap || 0) * Track.length + Player.s) / 1000);
  Progress.flush();
};
