// ---- sound: the WAVs in ../sounds, with synthesised stand-ins ----------------------------------
// Game logic asks for a sound by pushing { type: 'sound', name, volume, s } onto FxQueue (see
// sfx() / sfxAt() in physics.js); effects.js passes those here, quieter the further away `s` is,
// and plays 'explode' / 'explodeBig' / 'burst' / 'gift' for its own visual effects. Each name
// plays a WAV from SAMPLES, and a name with no file there ('' or left out) is silent. Until a
// file has loaded, a name that has a synthesised version in SYNTH plays that instead (and a name
// set to null in SAMPLES only ever plays that).
// Loops fed every frame from main.js: the engine (its WAV picked by the car, pitched by speed),
// the police siren, the helicopter and the frog.
// Browsers only allow sound after the player has clicked or pressed a key, so nothing is
// set up (or loaded) until then. M mutes; the choice is saved with the player's progress.
import { CONFIG } from '../config.js';
import { Progress } from '../progress.js';

let ctx = null, master = null, noiseBuffer = null;
let echoSend = null; // the echo (a tunnel's): how much of everything is sent round the delay
let nextBeep = 0; // when the shoulder's danger meter next beeps
let engine = null; // { osc, lfo, lfoGain, filter, gain }: the synthesised engine
let siren = null;  // { gain }: a synthesised police siren, silent until Sound.siren(true)
let radarOn = false; // (a police car near enough to bust the player, last frame)
const lastPlayed = {};

// every WAV in ../sounds, by file name without the extension: { 'Cash': url, ... }
const URLS = Object.fromEntries(Object.entries(
  import.meta.glob('../sounds/*.wav', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));
// big files, fetched only once something asks for them
const LAZY = new Set(['Lowrider', 'Lowrider 2']);
const buffers = {}, loading = {};
const load = (file) => {
  if (!ctx || loading[file] || !URLS[file]) return;
  loading[file] = fetch(URLS[file]).then(r => r.arrayBuffer()).then(data => ctx.decodeAudioData(data))
    .then(buffer => { buffers[file] = buffer; })
    .catch(() => {}); // (a file that won't load leaves its synthesised stand-in playing)
};

// ---- which WAV each sound plays ----------------------------------------------------------------
// a file name; [names] = one of them at random; { seq: [names] } = each in turn; '' = silent
const SAMPLES = {
  throw: 'Package Throw',
  gift: '',                 // a gift lands
  burst: 'Explosion Small',             // an evil package lands
  explode: ['Crash 1', 'Head On Collision'],  // an obstacle, or a light vehicle wrecked
  explodeBig: ['Crash 1', 'Head On Collision'], // a heavy vehicle wrecked
  crash: ['Short Crash with Glass', 'Collide1'],
  crashHard: ['Short Crash Side Swipe', 'Collide1'],       // an impact of CONFIG.hardCrash or more
  sideswipe: 'Short Crash Side Swipe',
  headOn: 'Head On Collision',
  heavy: ['Crash 1', 'Head On Collision'],    // TANK RAGE flattening something
  cannon: 'Tank Fire',
  tank: 'Tank Rage',
  tankPiece: 'Tank Rage Build', // a piece of the tank found (the fifth: tank)
  radarDetector: 'Radar',       // the radar detector picked up
  turbo: 'Supercharge',         // pickups, by type
  ghost: 'Ghost',
  wrench: 'Wrench',
  passenger: 'Inflatableguy',
  badGas: 'Bad Gas',
  heavyMass: 'Heavy',
  timePlus: 'Time Plus',
  timeMinus: 'Time Minus',
  cash5: 'Cash', cash10: 'Cash', cash20: 'Cash',
  armour: null, bigSplash: null, butterfingers: null, // (the stand-in chime: no sound of their own yet)
  gunshot: null, puncture: null, // (synthesised: see SYNTH)
  siren: { seq: ['Police Siren', 'Police Siren', 'Police Siren'] }, // busted
  radar: '',               // a police car comes into sight
  tick: '',           // each second of the tip countdown
  win: '',
  fail: '',                     // the level failed
  drop: 'Collide1',              // the helicopter sets a car down
  screech: 'Tire Screech 1',      // a car near the player spins out
  brake: 'Tire Screech',      // the player's car brakes hard for a car ahead
  horn: 'Compact Car Horn 1',   // horns, by vehicle kind (see Traffic)
  hornSmall: ['Compact Car Horn 3','Big Rig Horn 1',,'Fire Truck Horn','Compact Car Horn 1'],
  hornBig: ['Compact Car Horn 3','Big Rig Horn 1',,'Fire Truck Horn','Compact Car Horn 1'],
  hornBus: ['Compact Car Horn 3','Big Rig Horn 1',,'Fire Truck Horn','Compact Car Horn 1'],
  passBy: ['Compact Car Horn 3','Big Rig Horn 1',,'Fire Truck Horn','Compact Car Horn 1', 'Horn Doppler Pass By'], // an oncoming car honks as it goes by
  mystery: 'Mystery',           // the secret bus
  trainHorn: { seq: ['Big Rig Horn 1', 'Big Rig Horn 1'] }, // the bullet train sets off up the road...
  trainPass: 'Horn Doppler Pass By', // ...and goes by the player
  wave: null,                   // a wave warned of (the tide: no file, only its stand-in)...
  waveCrash: null,              // ...and breaking over the road
  hippo: null,                  // a hippo surfacing, with a bellow, to charge
  rumble: null,                 // a concrete pipe rolling off its stack
  camera: null,                 // a speed camera catching the player (a shutter's click and whine)
  bell: null,                   // a level crossing's bell, ringing while its lights flash
  jet: null,                    // a jet screaming over (the Battlefield's airstrikes)
  drum: null,                   // a parade's bass drum
  jingle: null,                 // an ice-cream van's chimes
  cargoDrop: ['Collide1', 'Plop Up'], // a load coming off a truck
  geiger: null,                 // the radiation counter's click, in a dose (radiation.js: faster the fuller the meter)
  infected: null,               // the player infected: a falling alarm
  menuMove: 'Plop Up',          // the start screen: a step to another level, group or tab (render/menustage.js)...
  menuPick: 'Plop Up',          // ...and a choice made (the side, the garage, a sheet opened, START)
  menuClick: 'Plop Up',         // ...and every other click on a menu, garage or dialog control (render/menuclick.js): all one sound
};
// the engine WAV for each car by id ('tank' is also any car in TANK RAGE), and its playback
// rate at a standstill and at the car's top speed; fixed = always at its own pitch. With more
// than one file, each run picks one. Every engine WAV is evened out to ENGINE_LOUDNESS at full
// speed however loud it was recorded; volume (default 1) makes one car louder or quieter than that.
const ENGINE_LOUDNESS = 0.2; // average level (root mean square) at full speed; a crash is about 0.14
const ENGINE_IDLE = 0.6;     // share of that at a standstill
const ENGINES = {
  commuter: { files: ['Engine Rev 1'], idle: 0.7, top: 1.5 },
  junker: { files: ['Engine Rev 1'], idle: 0.6, top: 1.2 },
  darkvan: { files: ['Truck Engine'], idle: 0.7, top: 1.25 },
  lowrider: { files: ['Lowrider', 'Lowrider 2'], fixed: true },
  superlowrider: { files: ['Lowrider', 'Lowrider 2'], fixed: true },
  wagon: { files: ['Truck Engine'], idle: 0.8, top: 1.4 },
  sport: { files: ['Engine Sports Car 5'], idle: 0.7, top: 1.6 },
  lovebus: { files: ['Truck Engine'], idle: 0.7, top: 1.3 },
  bus: { files: ['Truck Engine'], idle: 0.6, top: 1.1 },
  tank: { files: ['Tank Engine'], idle: 0.7, top: 1.3 },
  ufo: { files: ['UFO'], idle: 0.8, top: 1.4 },
  f1: { files: ['Engine Sports Car 5'], idle: 0.9, top: 2.1 }, // (wound right up: a screamer)
  jetboat: { files: ['Jetski Engine'], idle: 0.8, top: 1.4 },
  gt: { files: ['Engine Sports Car 5'], idle: 0.7, top: 1.75 }, // (deeper than the F1's)
  lmp: { files: ['Engine Sports Car 5'], idle: 0.8, top: 1.9 },  // (between the two)
};
// each car's horn, by its id (a garage car's, a level car's, the secret bus's), played by a sound named
// 'horn:<id>' (the player's horn: see horn.js, and Sound.play): { file, rate (playback rate: the pitch) }
// or { synth } (a stand-in of its own: the UFO's warble, the racers' short beep). A car not listed gets
// `default`. Small cars: the compact horns, pitched to size; the big trucks and the tanks: the big rig's,
// low; the bus and the boat: the fire truck's. (Traffic's own honks are SAMPLES' horn...: see Traffic)
const C1 = 'Compact Car Horn 1', C3 = 'Compact Car Horn 3', RIG = 'Big Rig Horn 1', FIRE = 'Fire Truck Horn';
const HORNS = {
  default: { file: C1, rate: 1 },
  // garage cars
  commuter: { file: C1, rate: 1 }, junker: { file: C3, rate: 0.9 }, darkvan: { file: RIG, rate: 1.1 },
  postvan: { file: C3, rate: 1.05 }, keitruck: { file: C1, rate: 1.25 }, mini: { file: C1, rate: 1.3 },
  lovebus: { file: C3, rate: 0.85 }, wagon: { file: C1, rate: 0.95 }, sport: { file: C3, rate: 1.15 }, lowrider: { file: C3, rate: 0.8 },
  hothatch: { file: C1, rate: 1.1 }, ute: { file: C3, rate: 1 }, buggy: { file: C1, rate: 1.2 }, liftedtruck: { file: RIG, rate: 1 },
  hearse: { file: C3, rate: 0.75 }, minivan: { file: C1, rate: 0.9 }, pickup: { file: C3, rate: 0.95 }, hotrod: { file: C1, rate: 0.85 },
  sleeper: { file: C1, rate: 1 }, rally: { file: C3, rate: 1.2 }, towtruck: { file: RIG, rate: 1.05 }, rotary: { file: C3, rate: 1.1 },
  taxi: { file: C1, rate: 1.05 }, suv: { file: C3, rate: 0.9 }, miata: { file: C1, rate: 1.15 },
  gullwing: { file: C1, rate: 1.1 }, rearengine: { file: C3, rate: 1.05 }, snake: { file: C1, rate: 0.82 }, polytruck: { file: RIG, rate: 1.15 },
  muscle: { file: C1, rate: 0.8 }, fullsize: { file: C3, rate: 0.85 }, evsaloon: { file: C1, rate: 1.2 },
  superlowrider: { file: C3, rate: 0.75 }, classicgt: { file: C3, rate: 1 }, sixbysix: { file: RIG, rate: 1 },
  tank: { file: RIG, rate: 0.7 },
  // the 6-star cars with no base car (cars.js EARNED_CARS)
  hellrod: { file: C1, rate: 0.75 }, courier: { file: C1, rate: 1 }, showdown: { file: C1, rate: 0.78 },
  // level cars, and the secret bus
  ufo: { synth: 'warble' }, f1: { synth: 'beep' }, gt: { synth: 'beep' }, lmp: { synth: 'beep' },
  jetboat: { file: FIRE, rate: 1.2 }, apc: { file: RIG, rate: 0.7 }, bus: { file: FIRE, rate: 1 },
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];
// how loud a loaded WAV is on average (root mean square of its first channel), worked out once
const rms = {};
const loudness = (file) => {
  if (rms[file] === undefined) {
    const data = buffers[file].getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    rms[file] = Math.sqrt(sum / data.length) || 1;
  }
  return rms[file];
};

const setup = () => {
  if (ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = Progress.data.muted ? 0 : 0.5;
  master.connect(ctx.destination);
  // the echo: a slapback off the walls, fed back on itself a few times, dulled a little each time round
  // (silent until Sound.echo() opens the send: inside a tunnel)
  echoSend = ctx.createGain();
  const delay = ctx.createDelay(0.5), feedback = ctx.createGain(), dull = ctx.createBiquadFilter();
  delay.delayTime.value = 0.11;
  feedback.gain.value = 0.45;
  dull.type = 'lowpass';
  dull.frequency.value = 1600;
  echoSend.gain.value = 0;
  master.connect(echoSend).connect(delay).connect(dull).connect(ctx.destination);
  dull.connect(feedback).connect(delay);
  for (const file in URLS) if (!LAZY.has(file)) load(file);

  // a second of white noise, reused by every hiss, whoosh and bang
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  // the engine: one oscillator that runs all the time, silent until Sound.engine() opens it up
  const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain(); // a wobble, for the UFO
  osc.type = 'sawtooth';
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  gain.gain.value = 0;
  lfo.frequency.value = 9;
  lfoGain.gain.value = 0;
  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(filter).connect(gain).connect(master);
  osc.start();
  lfo.start();
  engine = { osc, lfo, lfoGain, filter, gain };

  // the siren: a tone flipped between two pitches twice a second
  const wail = ctx.createOscillator(), flip = ctx.createOscillator();
  const depth = ctx.createGain(), level = ctx.createGain();
  wail.type = 'square';
  wail.frequency.value = 720;
  flip.type = 'square';
  flip.frequency.value = 2;
  depth.gain.value = 100; // 620 Hz <-> 820 Hz
  level.gain.value = 0;
  flip.connect(depth).connect(wail.frequency);
  wail.connect(level).connect(master);
  wail.start();
  flip.start();
  siren = { gain: level };
};
const unlock = () => {
  setup();
  if (ctx && ctx.state === 'suspended') ctx.resume();
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// ---- building blocks ---------------------------------------------------------------------------
// a note that slides from `from` Hz to `to` Hz and fades out
const tone = (from, to, seconds, volume, type = 'sine', delay = 0) => {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + seconds);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + seconds + 0.02);
};
// a burst of filtered noise whose filter slides from `from` Hz to `to` Hz
const noise = (from, to, seconds, volume, kind = 'lowpass', delay = 0) => {
  const t = ctx.currentTime + delay;
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  source.buffer = noiseBuffer;
  source.loop = true;
  filter.type = kind;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + seconds);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  source.connect(filter).connect(gain).connect(master);
  source.start(t, Math.random());
  source.stop(t + seconds + 0.02);
};
// a loaded WAV, once; returns how long it plays for
const sample = (file, volume, delay = 0, rate = 1) => {
  const source = ctx.createBufferSource(), gain = ctx.createGain();
  source.buffer = buffers[file];
  source.playbackRate.value = rate;
  gain.gain.value = volume;
  source.connect(gain).connect(master);
  source.start(ctx.currentTime + delay);
  return buffers[file].duration / rate;
};
// a WAV that loops for as long as it is wanted: set() it every frame with a volume (0 = silent)
// and a playback rate. Returns false while the file has yet to load.
const loop = () => ({
  file: null, source: null, gain: null,
  set(file, volume, rate = 1) {
    if (!ctx) return false;
    const now = ctx.currentTime;
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(master);
    }
    if (file !== this.file) {
      if (volume > 0) load(file);
      if (!buffers[file]) {
        this.gain.gain.setTargetAtTime(0, now, 0.05);
        return false;
      }
      if (this.source) this.source.stop();
      this.source = ctx.createBufferSource();
      this.source.buffer = buffers[file];
      this.source.loop = true;
      this.source.playbackRate.value = rate;
      this.source.connect(this.gain);
      this.source.start();
      this.file = file;
    }
    this.source.playbackRate.setTargetAtTime(rate, now, 0.08);
    this.gain.gain.setTargetAtTime(volume, now, 0.12);
    return true;
  },
  // cut off now; the next set() starts the file from the beginning
  stop() {
    if (this.source) this.source.stop();
    this.source = null;
    this.file = null;
  },
});
const engineLoop = loop(), packLoop = loop(), sirenLoop = loop(), heliLoop = loop(), frogLoop = loop(), warnLoop = loop(), ufoLoop = loop(), lowriderLoop = loop();
let engineCar = null, engineFile = null; // the car the engine loop was picked for, and its WAV

// ---- the synthesised stand-ins: (volume 0..1) => void --------------------------------------------
const SYNTH = {
  throw: (v) => noise(600, 2400, 0.16, 0.35 * v, 'bandpass'),                       // a whoosh
  gift: (v) => { tone(880, 880, 0.09, 0.2 * v); tone(1320, 1320, 0.16, 0.2 * v, 'sine', 0.08); }, // a two-note chime
  burst: (v) => { noise(1800, 200, 0.25, 0.4 * v); tone(160, 60, 0.2, 0.3 * v); },   // a small fiery pop
  gunshot: (v) => { noise(3200, 500, 0.06, 0.45 * v); tone(240, 70, 0.05, 0.25 * v, 'square'); }, // a sharp crack
  puncture: (v) => { tone(300, 120, 0.08, 0.4 * v, 'square'); noise(5000, 2500, 0.7, 0.3 * v, 'bandpass'); }, // a bang, and the hiss
  explode: (v) => { noise(1400, 60, 0.7, 0.7 * v); tone(110, 28, 0.6, 0.6 * v); },   // a boom
  crash: (v) => { noise(900, 300, 0.14, 0.6 * v, 'bandpass'); tone(130, 70, 0.12, 0.4 * v, 'square'); }, // a metal thud
  cannon: (v) => { tone(90, 30, 0.35, 0.8 * v); noise(2500, 300, 0.2, 0.5 * v); },
  pickup: (v) => [660, 880, 1100].forEach((f, i) => tone(f, f, 0.1, 0.2 * v, 'triangle', i * 0.06)),
  turbo: (v) => { tone(220, 1100, 0.45, 0.25 * v, 'sawtooth'); noise(400, 3000, 0.45, 0.2 * v, 'bandpass'); },
  tank: (v) => [55, 82.5, 110].forEach((f) => tone(f, f * 0.98, 1.1, 0.3 * v, 'sawtooth')), // a low power chord
  siren: (v) => { for (let i = 0; i < 4; i++) tone(i % 2 ? 620 : 820, i % 2 ? 620 : 820, 0.22, 0.16 * v, 'square', i * 0.22); },
  tick: (v) => tone(1000, 1000, 0.06, 0.25 * v, 'square'),
  win: (v) => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.28, 0.22 * v, 'triangle', i * 0.12)),
  fail: (v) => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, 0.32, 0.22 * v, 'sawtooth', i * 0.16)),
  // horns (see HORNS): a two-note car horn (until its file has loaded), a racer's short high beep, and the UFO's warble
  horn: (v) => { tone(440, 430, 0.4, 0.18 * v, 'square'); tone(554, 540, 0.4, 0.14 * v, 'square'); },
  beep: (v) => tone(1760, 1700, 0.12, 0.18 * v, 'square'),
  warble: (v) => [0, 0.09, 0.18, 0.27].forEach((d, i) => tone(i % 2 ? 1320 : 990, i % 2 ? 1500 : 880, 0.1, 0.16 * v, 'sine', d)),
};
Object.assign(SYNTH, {
  explodeBig: SYNTH.explode, crashHard: SYNTH.crash, sideswipe: SYNTH.crash, headOn: SYNTH.crash, heavy: SYNTH.crash,
  ghost: SYNTH.pickup, wrench: SYNTH.pickup, passenger: SYNTH.pickup, badGas: SYNTH.pickup, heavyMass: SYNTH.pickup,
  armour: SYNTH.pickup, bigSplash: SYNTH.pickup, butterfingers: SYNTH.pickup,
  timePlus: SYNTH.pickup, timeMinus: SYNTH.pickup,
  // the bullet train: a long two-note horn, and a rushing roar as it goes by
  trainHorn: (v) => [311, 370].forEach((f) => tone(f, f * 0.97, 1.4, 0.18 * v, 'sawtooth')),
  trainPass: (v) => { noise(300, 2600, 0.9, 0.6 * v, 'bandpass'); tone(370, 250, 0.9, 0.2 * v, 'sawtooth'); },
  // the tide: a wave's rumble building out at sea, and its roar as it breaks over the road
  wave: (v) => { noise(120, 900, 2.4, 0.45 * v); noise(400, 2000, 2.2, 0.15 * v, 'bandpass', 0.6); },
  rumble: (v) => { noise(160, 60, 1.4, 0.6 * v); tone(55, 40, 1.2, 0.3 * v, 'sine'); },
  hippo: (v) => { noise(1800, 300, 0.5, 0.5 * v); tone(110, 70, 0.9, 0.35 * v, 'sawtooth', 0.15); tone(82, 55, 0.9, 0.3 * v, 'square', 0.2); },
  waveCrash: (v) => { noise(2600, 300, 1.6, 0.6 * v); noise(700, 150, 1.4, 0.4 * v, 'lowpass', 0.1); },
  camera: (v) => { noise(6000, 3000, 0.04, 0.4 * v, 'bandpass'); tone(2400, 4200, 0.25, 0.08 * v, 'sine', 0.03); },
  bell: (v) => { tone(1350, 1350, 0.18, 0.12 * v, 'triangle'); tone(2700, 2700, 0.12, 0.05 * v, 'sine'); },
  jet: (v) => { noise(400, 3200, 1.8, 0.5 * v, 'bandpass'); noise(3000, 300, 1.4, 0.35 * v, 'bandpass', 1.2); tone(180, 90, 2.4, 0.12 * v, 'sawtooth'); },
  // a water main bursting: a thump under the road, and the hiss and rush of the water
  drum: (v) => { tone(110, 45, 0.22, 0.5 * v); noise(600, 200, 0.08, 0.2 * v); },
  gravel: (v) => { noise(3200, 1400, 0.2, 0.3 * v, 'bandpass'); noise(900, 400, 0.16, 0.22 * v, 'lowpass', 0.03); }, // (stones under the car, in a gravel trap)
  jingle: (v) => [659, 587, 523, 587, 659, 659, 659].forEach((f, i) => tone(f, f, 0.28, 0.14 * v, 'triangle', i * 0.22)), // (a nursery tune's first phrase)
  cargoDrop: (v) => { noise(900, 200, 0.2, 0.5 * v); tone(140, 60, 0.15, 0.3 * v, 'square'); },
  // radiation (radiation.js): the counter's click, a crackle of a few ms; and the infection's alarm, three notes falling
  geiger: (v) => { noise(5200, 2600, 0.018, 0.7 * v, 'bandpass'); tone(3200, 1800, 0.012, 0.25 * v, 'square'); },
  infected: (v) => [660, 523, 392].forEach((f, i) => { tone(f, f * 0.94, 0.3, 0.26 * v, 'square', i * 0.26); noise(2400, 1200, 0.08, 0.2 * v, 'bandpass', i * 0.26); }),
  menuMove: (v) => tone(520, 660, 0.05, 0.12 * v, 'triangle'),                                        // (a short tick up)
  menuPick: (v) => { tone(660, 660, 0.06, 0.12 * v, 'triangle'); tone(990, 990, 0.1, 0.1 * v, 'triangle', 0.05); }, // (two notes)
  menuClick: (v) => tone(520, 660, 0.05, 0.12 * v, 'triangle'), // (until the WAV has loaded)
});

export const Sound = {
  menuAt: 0, // when a menu sound (menuMove, menuPick, menuClick) was last asked for: render/menuclick.js plays none of its own just after one
  play(name, volume = 1) {
    if (name.startsWith('menu')) this.menuAt = performance.now();
    if (!ctx || ctx.state !== 'running' || volume <= 0.02) return;
    // the same sound many times in an instant (a pile-up) would just be a loud click
    if (ctx.currentTime - (lastPlayed[name] || -1) < 0.05) return;
    if (name.startsWith('horn:')) { // a car's own horn (see HORNS): its file at its pitch, or its stand-in
      const horn = HORNS[name.slice(5)] || HORNS.default, v = Math.min(1, volume);
      if (horn.synth) SYNTH[horn.synth](v);
      else if (buffers[horn.file]) sample(horn.file, v, 0, horn.rate);
      else SYNTH.horn(v);
      lastPlayed[name] = ctx.currentTime;
      return;
    }
    const entry = SAMPLES[name], v = Math.min(1, volume);
    if (!entry && !(entry === null && SYNTH[name])) return; // no file for it ('' or left out): silent; null: its stand-in
    const files = !entry ? [] : typeof entry === 'string' ? [entry] : Array.isArray(entry) ? [pick(entry)] : entry.seq;
    if (files.length && files.every(f => buffers[f])) {
      let at = 0;
      for (const f of files) at += sample(f, v, at);
    } else if (SYNTH[name]) {
      SYNTH[name](v);
    } else {
      return;
    }
    lastPlayed[name] = ctx.currentTime;
  },
  // speed in m/s, or a negative number for silence. car: the car's id in ENGINES ('tank' while
  // in TANK RAGE); top: its top speed, which sets how high the engine is pitched. (The race
  // screensaver's watched car, heard from the camera: gain, how loud from there; pitch, its Doppler shift)
  engine(speed, car = 'commuter', top = 30, gain = 1, pitch = 1) {
    if (!engine) return;
    const now = ctx.currentTime, on = speed >= 0;
    const e = ENGINES[car] || ENGINES.commuter;
    if (on && car !== engineCar) { // a new car, or one that has just gone into TANK RAGE
      engineCar = car;
      engineFile = pick(e.files);
    }
    if (!on) engineCar = null; // (so the next run picks again)
    const pace = Math.min(1.5, Math.max(0, speed) / top);
    const rate = (e.fixed ? 1 : e.idle + (e.top - e.idle) * pace) * pitch;
    const even = buffers[engineFile] ? Math.min(4, ENGINE_LOUDNESS / loudness(engineFile)) : 1;
    const volume = !on ? 0 : gain * even * (e.volume || 1) * (e.fixed ? 1 : ENGINE_IDLE + (1 - ENGINE_IDLE) * Math.min(1, pace));
    if (engineFile && engineLoop.set(engineFile, volume, rate)) {
      engine.gain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }
    // (until its WAV has loaded, the synthesised engine)
    const ufo = car === 'ufo', tank = car === 'tank';
    engine.osc.type = ufo ? 'sine' : 'sawtooth';
    engine.osc.frequency.setTargetAtTime(ufo ? 170 + speed * 2.2 : (tank ? 34 : 48) + speed * (tank ? 1.6 : 2.6), now, 0.08);
    engine.filter.frequency.setTargetAtTime(ufo ? 2000 : 300 + speed * 22, now, 0.1);
    engine.lfoGain.gain.setTargetAtTime(ufo ? 14 : 0, now, 0.1);
    engine.gain.gain.setTargetAtTime(on ? gain * (ufo ? 0.12 : 0.07 + Math.min(0.07, speed * 0.0015)) : 0, now, 0.12);
  },
  // the rest of a race's field, heard from the camera: level 0 (none near) .. 1 (the pack right
  // there), in the watched car's engine note, a touch lower
  pack(level, rate = 1.6) {
    if (!engineFile) return;
    const even = buffers[engineFile] ? Math.min(4, ENGINE_LOUDNESS / loudness(engineFile)) : 1;
    packLoop.set(engineFile, 0.6 * even * level, rate);
  },
  // the police siren, louder the nearer the nearest police car: level 0 (silent) .. 1 (right
  // beside it). near: one is close enough to bust the player, which pings the radar as it starts
  siren(level, near = false) {
    if (!siren) return;
    if (near && !radarOn) this.play('radar', 0.7);
    radarOn = near;
    if (sirenLoop.set('Police Siren', 0.35 * level)) siren.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    else siren.gain.gain.setTargetAtTime(0.05 * level, ctx.currentTime, 0.15);
  },
  // on while a helicopter is coming for the car, carrying it, or setting it down
  helicopter(on) {
    heliLoop.set('Helicopter', on ? 0.45 : 0);
  },
  // on for the last CONFIG.powerUpWarning seconds of a powerup, until it runs out
  powerWarning(on) {
    if (on) warnLoop.set('PowerUp TimeOut 2', 0.5);
    else warnLoop.stop();
  },
  // on while a UFO AIR STRIKE's saucer is about (flying in, hovering, flying off)
  // the lowriders in traffic play their music too, louder the nearer the nearest one:
  // level 0 (silent) .. 1 (right beside it)
  lowriders(level) {
    lowriderLoop.set('Lowrider', 0.5 * level);
  },
  ufoStrike(on) {
    ufoLoop.set('UFO', on ? 0.5 : 0, 1.6); // (1.6x its own speed, and pitch)
  },
  // the frog's croaking, 0 (silent) .. 1 (right beside it)
  frog(volume) {
    frogLoop.set('Frog', volume * 0.8);
  },
  // the echo off a tunnel's walls: 0 (none, out in the open) .. 1 (everything comes back)
  echo(level) {
    if (!echoSend) return;
    echoSend.gain.setTargetAtTime(Math.max(0, Math.min(1, level)), ctx.currentTime, 0.2);
  },
  // the shoulder's danger meter, fed every frame: beeps while the player is on the shoulder,
  // faster the nearer the meter is to a bust. level: 0 = the full allowance is
  // left, 1 = about to be busted; a negative number = not on the shoulder (silent).
  danger(level) {
    if (!ctx || ctx.state !== 'running') return;
    if (level < 0) { nextBeep = 0; return; } // (the first beep comes as soon as the shoulder is touched)
    const now = ctx.currentTime;
    if (now < nextBeep) return;
    if (buffers['Danger Timer']) sample('Danger Timer', 0.6);
    else tone(CONFIG.dangerBeepPitch, CONFIG.dangerBeepPitch, 0.05, 0.22, 'square');
    nextBeep = now + CONFIG.dangerBeepSlow + (CONFIG.dangerBeepFast - CONFIG.dangerBeepSlow) * level;
  },
  get muted() { return !!Progress.data.muted; },
  toggleMute() {
    Progress.data.muted = !Progress.data.muted;
    Progress.save();
    if (master) master.gain.value = Progress.data.muted ? 0 : 0.5;
    return Progress.data.muted;
  },
};
