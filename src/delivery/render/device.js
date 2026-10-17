// DEVICE DEFAULTS (the owner, 17-Oct): on a FIRST VISIT ONLY, the settings set for the device the game is played on.
//   a phone or tablet: auto accelerate on, auto brake off, Verbosity Low (and the on-screen controls on)
//   a desktop: the on-screen controls off (keyboard), everything else as it always was
// Applied once, to a save that does not exist yet, and the save then holds `deviceSet: true`: it is never detected or
// applied again (a new device, a setting changed or cleared, a reset). A save from before this release (any save
// already kept, in local storage or the cookie) counts as visited: untouched, Verbosity High. A test visit (the
// address bar's test switches, Progress.noSave) is never given them. `?device=mobile|desktop` forces the detection.
// Render-only: outside the replay fingerprint (no rules file imports this). Imported first by render/menu.js and
// render/touch.js, so their buttons read the defaults.
import { Progress } from '../progress.js';
import { Verbosity, VERBOSITY_LEVELS } from './verbosity.js';

const TEST_SWITCHES = ['autostart', 'hidden', 'test', 'edited', 'pick', 'car', 'ghost', 'mystery', 'theme', 'beaten', 'owns', 'event', 'unlockall'];

// a phone or tablet: the UA says mobile, or the main pointer is a finger with no hover, or an iPad passing as a Mac
export const isMobile = () => {
  const forced = new URLSearchParams(location.search).get('device');
  if (forced === 'mobile' || forced === 'desktop') return forced === 'mobile';
  const q = (m) => !!window.matchMedia?.(m).matches;
  const ua = navigator.userAgent || '';
  return navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod|Mobi/i.test(ua)
    || (q('(pointer: coarse)') && q('(hover: none)')) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
};

// a save already kept somewhere (local storage or the cookie: progress.js's names)
const stored = () => {
  try { if (localStorage.getItem('delivery_racer_progress_backup')) return true; } catch { /* (no storage) */ }
  try { return /(?:^|; )delivery_racer_progress=/.test(document.cookie); } catch { return false; }
};

const params = new URLSearchParams(location.search);
const testVisit = TEST_SWITCHES.some(key => params.get(key) !== null);
export const DeviceDefaults = { applied: false, mobile: null };
if (!Progress.data.deviceSet && !testVisit) {
  if (!stored()) {
    const mobile = DeviceDefaults.mobile = isMobile();
    if (mobile) Object.assign(Progress.data, { autoGas: true, autoBrake: 0, verbosity: 'low', touch: true });
    else Progress.data.touch = false;
    DeviceDefaults.applied = true;
  }
  Progress.data.deviceSet = true; // (an old save: marked visited, nothing changed)
  Progress.save();
}

// the save's Verbosity into the messages' filter (render/verbosity.js); a save without one is High
export const applyVerbosity = () => {
  Verbosity.level = VERBOSITY_LEVELS.includes(Progress.data.verbosity) ? Progress.data.verbosity : 'high';
};
applyVerbosity();
