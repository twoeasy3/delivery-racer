// ============================================================================
// REPLAYS ON THE PAGE (replay.js plays them, replaystore.js keeps them): "Watch replay" and "Save replay" on the
// results screen; while one plays, the REPLAY badge, its speed (1x, 2x, 4x: the button beside Pause) and none of
// the player's controls; and where a playback stops short of a finish of its own (the run was left part way, or it
// drifted from its recording), the results screen saying so. Exit, the back button and Menu end a playback as they
// end a run; the save is then put back as it was before it (no tip, best, medal or tank piece carried over).
// The level card's list of replays is render/menustage.js's.
// ============================================================================
import { Game, formatTime } from '../game.js';
import { Replay } from '../replay.js';
import { ReplayStore } from '../replaystore.js';
import { LEVEL } from '../levels.js';
import { tell } from './dialog.js';

const resultScreen = document.getElementById('resultScreen');
const resultTitle = document.getElementById('resultTitle');
const resultTime = document.getElementById('resultTime');
const resultNote = document.getElementById('resultNote');
const restartBtn = document.getElementById('restartBtn');
const watchBtn = document.getElementById('watchBtn');
const saveBtn = document.getElementById('saveReplayBtn');
const speedBtn = document.getElementById('speedBtn');
const ghostBtn = document.getElementById('ghostBtn');

// the options' ghost switch (render/ghostcar.js: from the next run)
const showGhostOption = () => { ghostBtn.textContent = 'Ghost of your best run: ' + (ReplayStore.ghostOn ? 'on' : 'off'); };
ghostBtn.addEventListener('click', () => { ReplayStore.ghostOn = !ReplayStore.ghostOn; showGhostOption(); });
showGhostOption();

let shown = null; // the recording the results screen is about: the run just over, or the playback just watched

// start a recording playing, or say why it can't be (an out-of-date one: replay.js check)
export const watch = (rec) => {
  const can = Replay.watch(rec);
  if (!can.ok) tell({ title: 'Replay', lines: [can.why] });
  return can.ok;
};

// the results screen's buttons for what it is showing: a run of the player's own (Retry, Continue, Watch, Save), or a
// playback (Watch again; nothing saved, nothing restarted)
const buttons = (playback) => {
  restartBtn.style.display = playback ? 'none' : '';
  watchBtn.style.display = shown ? '' : 'none';
  watchBtn.textContent = playback ? 'Watch again' : 'Watch';
  saveBtn.style.display = shown && !playback ? '' : 'none';
  const saved = !!shown && ReplayStore.isSaved(shown);
  saveBtn.disabled = saved;
  saveBtn.textContent = saved ? 'Saved' : 'Save';
};

// a run over (or left: Exit fires this too, with no results to show)
Game.onFinish.push(() => {
  if (Game.state !== 'finished') return;
  const playback = !!Replay.playing;
  const last = Replay.last, ours = !!last && last.header.level === LEVEL.id && last.header.steps === Game.step; // (a run not recorded: a hidden level, the editor's)
  shown = playback ? Replay.playing.rec : ours ? last : null;
  buttons(playback);
});

// a playback stopped short: the results screen over the held run
Replay.onOver = (why) => {
  shown = Replay.playing.rec;
  const h = shown.header;
  resultTitle.textContent = why === 'drift' ? 'Replay stopped' : 'End of the replay';
  resultTime.textContent = why === 'drift' ? '' : 'The run was left here, ' + formatTime(Game.time) + ' in';
  resultNote.textContent = why === 'drift'
    ? 'No longer plays as driven: stopped at ' + formatTime(Game.time)
    : (h.evil ? 'Evil' : 'Good') + '  |  Wrecked: ' + Game.wrecks + '  |  Busted: ' + Game.busts + '  |  Recorded ' + new Date(h.date).toLocaleString();
  resultScreen.classList.add('failed');
  buttons(true);
  resultScreen.classList.remove('hidden');
};

watchBtn.addEventListener('click', () => { if (shown) watch(shown); });
saveBtn.addEventListener('click', () => {
  if (!shown) return;
  ReplayStore.save(shown);
  buttons(!!Replay.playing);
});
speedBtn.addEventListener('click', () => {
  Replay.speed = Replay.speed >= 4 ? 1 : Replay.speed * 2;
  speedBtn.textContent = Replay.speed + 'x';
});

// the badge, the speed button and the hidden controls follow whether a replay is playing
let was = false;
const follow = () => {
  const now = !!Replay.playing && Game.state !== 'start';
  if (now !== was) {
    was = now;
    document.body.classList.toggle('replaying', now);
    speedBtn.style.display = now ? '' : 'none';
    speedBtn.textContent = Replay.speed + 'x';
  }
  requestAnimationFrame(follow);
};
requestAnimationFrame(follow);
