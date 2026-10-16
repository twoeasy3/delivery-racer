// ---- THE GIANT'S SOUNDS (the owner, 16-Oct: "constant explosion sounds when the car is giant"; CHECKLIST 386) ----------------------
// RENDER-ONLY: the rules queue exactly what they always did (mysteries.js, collision.js: not in the replay fingerprint, which never
// walks render/). While the car is GIANT (Player.giant) render/effects.js passes the frame's FxQueue through this gate:
//   - a FOOTSTEP (mysteries.js: sfx('heavy', 0.4) every CONFIG.mystery.giant.step metres) was the crash WAV ('heavy' = Crash 1 /
//     Head On Collision), five to seven a second at speed: it is a synthesised low STOMP now (audio.js SYNTH.stomp), no closer
//     together than `stompGap`;
//   - a CRUSH (collision.js's giant branch: sfx('heavy') at full volume) and the EXPLOSION of the car it crushed (the 'explode' event
//     of a wrecked body, queued in the same step) were two crash WAVs each, one pair per car: they are counted as one crush, and the
//     frame's crushes make at most ONE 'crush' sound (a crunch: audio.js SAMPLES.crush) every `crushGap` seconds, the loudest kept,
//     with a stomp under it;
//   - the crushed cars' explosions are still drawn, the first in each `drawGap` window in full and the rest smaller (`drawScale`), at
//     most `drawMost` a frame (the rest not drawn: they would only overwrite the pools' oldest particles).
// Every other sound and explosion goes through as it was (an obstacle the giant hits, a mine, a package, anything far off), and with
// the car its own size the gate passes everything untouched.
export const GIANT_FX = {
  crushGap: 0.25,    // s: at most one crush sound in this long
  crushVolume: 0.8,  // the crunch's volume (times the loudest crush of the frame)
  stompVolume: 1.5,  // a footstep's stomp: times the footstep's own volume (0.4)
  stompGap: 0.12,    // s: footsteps no closer together than this
  footstepBelow: 1,  // a giant's 'heavy' quieter than this is a footstep (mysteries.js: 0.4); at this or louder, a crush
  reach: 10,         // m beyond the giant's half-length (along) / half-width (across) that an explosion counts as one it crushed
  drawGap: 0.25,     // s: the first crushed car's explosion in this long is drawn in full...
  drawScale: 0.6,    // ...the rest this size (smoke too)
  drawMost: 2,       // and no more than this many drawn in one frame
};

// is this 'explode' event a wrecked body's (collision.js: { type, s, lat, vs, big, tyres }, no sound / scale / smoke of its own)
// close enough to the giant to be one it crushed?
export const crushedBy = (e, P, F = GIANT_FX) => e.type === 'explode' && typeof e.tyres === 'boolean' && e.sound === undefined &&
  e.scale === undefined && e.smoke === undefined &&
  Math.abs(e.s - P.s) <= P.hl + F.reach && Math.abs(e.lat - P.lat) <= P.hw + F.reach;

// one gate a game (render/effects.js's), stepped once a drawn frame
export const createGiantGate = (F = GIANT_FX) => {
  let clock = 0, lastCrush = -Infinity, lastStomp = -Infinity, lastDraw = -Infinity;
  let giant = false, loud = 0, drawn = 0;
  return {
    get on() { return giant; },
    // a new frame: the clock moves on, the car's size as it is now
    begin(dt, isGiant) { clock += dt; giant = !!isGiant; loud = 0; drawn = 0; },
    // a queued sound: [name, volume] to play, or null (held back: a crush, played by end(); or a footstep too soon after the last)
    sound(name, volume) {
      if (!giant || name !== 'heavy') return [name, volume];
      if (volume < F.footstepBelow) {
        if (clock - lastStomp < F.stompGap) return null;
        lastStomp = clock;
        return ['stomp', volume * F.stompVolume];
      }
      loud = Math.max(loud, volume);
      return null;
    },
    // a crushed car's explosion (see crushedBy): its own sound is dropped (one crush with the rest); the event to draw (the same one,
    // a smaller copy, or null)
    crushed(e, near) {
      loud = Math.max(loud, near);
      if (drawn >= F.drawMost) return null;
      drawn++;
      if (clock - lastDraw >= F.drawGap) { lastDraw = clock; return e; }
      return { ...e, scale: F.drawScale, smoke: F.drawScale, tyres: false };
    },
    // the frame's sounds for its crushes: [[name, volume], ...] (nothing, or a crunch with a stomp under it)
    end() {
      if (!giant || loud <= 0 || clock - lastCrush < F.crushGap) return [];
      lastCrush = clock;
      lastStomp = clock;
      return [['crush', Math.min(1, loud) * F.crushVolume], ['stomp', Math.min(1, loud) * 0.6]];
    },
  };
};
