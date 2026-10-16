// ============================================================================
// LESSON CUES - the Driving Lesson's prompts (NEW-PLAYER-IDEAS.md; the hidden level `tutorial`, ?hidden=tutorial): on a
// lesson level, each of its zones teaches one thing, and while the car is in the first LEAD metres of a zone its line
// (messages.json "lessons", by the zone's id) is shown LARGE in the middle of the screen, with its step ("3/8"). The
// level's ordinary zone welcome (messages.json "zones") is left out for these zones, so the line is not said twice.
// Render only: it reads the run (where the car is) and changes nothing in it, so it is no part of the replays' rules
// (vite.config.js logicFiles: render/ is not followed). Shown by where the car is, not by a timer: a still at &at=<m>
// shows the prompt of that zone.
// ============================================================================
import MESSAGES from '../messages.json';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';

export const LESSON_LEVELS = ['tutorial']; // (a level whose zones are lessons)
const LEAD = 200, FADE = 50; // m of a zone the prompt is up for, the last FADE of them fading
export const lessonLine = (zoneId) => [].concat(MESSAGES.lessons?.[zoneId] || [])[0] || '';

const css = `
#lessonCue { position: fixed; left: 50%; top: 78%; transform: translate(-50%, -50%); z-index: 6; pointer-events: none;
  max-width: min(92vw, 640px); padding: .45em .9em .5em; border-radius: 14px; background: rgba(12, 16, 24, .78);
  color: #fff; font: 800 clamp(18px, 4.8vw, 30px)/1.15 system-ui, sans-serif; text-align: center;
  box-shadow: 0 6px 24px rgba(0,0,0,.35); opacity: 0; transition: opacity .15s linear; }
#lessonCue .step { display: block; font-size: .5em; font-weight: 700; letter-spacing: .12em; color: #ffd23f; margin-bottom: .2em; }
body.photo #lessonCue, body.orbiting #lessonCue, body.cinematic #lessonCue { display: none; }`;

let el = null, shown = '';
const make = () => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  el = document.createElement('div');
  el.id = 'lessonCue';
  el.setAttribute('role', 'status');
  document.body.appendChild(el);
};

// the prompt for the car where it is now: { text, step, of, alpha } or null
export const lessonAt = (level, s) => {
  if (!level || !LESSON_LEVELS.includes(level.id)) return null;
  const zones = (level.zones || []).filter(z => lessonLine(z.id));
  const k = zones.findIndex(z => s >= z.from && s < z.to);
  if (k < 0) return null;
  const into = s - zones[k].from;
  if (into > LEAD) return null;
  return { text: lessonLine(zones[k].id), step: k + 1, of: zones.length, alpha: Math.min(1, (LEAD - into) / FADE) };
};

const frame = () => {
  requestAnimationFrame(frame);
  if (!el) return;
  const cue = Game.state === 'playing' && !Game.paused && Player.active && Track.zoneAt ? lessonAt(LEVEL, Player.s) : null;
  const key = cue ? cue.step + ':' + cue.text : '';
  if (key !== shown) {
    shown = key;
    el.replaceChildren(...(cue ? [Object.assign(document.createElement('span'), { className: 'step', textContent: cue.step + '/' + cue.of }), cue.text] : []));
  }
  el.style.opacity = cue ? String(cue.alpha) : '0';
};
if (typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof requestAnimationFrame === 'function') { make(); requestAnimationFrame(frame); } // (not headless: the checks load lessonAt alone)
