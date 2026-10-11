import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Packages } from '../packages.js';
import { Game, formatTime, clockFor } from '../game.js';
import { Message } from '../messages.js';
import { Traffic } from '../traffic.js';
import { SpeedCameras } from '../cameras.js';
import { Radiation } from '../radiation.js';
import { stickyIcon } from './hudIcons.js';

// ---- HUD -------------------------------------------------------------------
import { Social } from '../social.js';
const hudTimer = document.getElementById('timer');
const hudProblems = document.getElementById('levelProblems');
const hudCamAlert = document.getElementById('camAlert');
const hudCamLimit = document.getElementById('camLimit');
const hudCamDist = document.getElementById('camDist');
const hudCamStatus = document.getElementById('camStatus');
const hudCamArrow = document.getElementById('camArrow');
// the level's gauge (see index.html, #progress): a ring that fills, the distance left in its middle
const hudProgressLeft = document.getElementById('progressLeft'), hudProgressUnit = document.getElementById('progressUnit');
const hudProgressLabel = document.getElementById('progressLabel'), hudProgressLaps = document.getElementById('progressLaps');
Game.onLoad.push(() => {
  hudProblems.textContent = Track.problems.length ? 'Level data problems: ' + Track.problems.join(' | ') : '';
  // (a lapped level: a notch across the ring where each lap ends)
  let notches = '';
  for (let lap = 1; lap < (LEVEL.laps || 1); lap++) notches += `<path d="M28 3.5v5" transform="rotate(${(lap / LEVEL.laps * 360).toFixed(1)} 28 28)"/>`;
  hudProgressLaps.innerHTML = notches;
});
const hudTip = document.getElementById('tip');
const hudSpeed = document.getElementById('speed');
const hudProgress = document.getElementById('progressFill');
const hudHealth = document.getElementById('healthFill');
const throwBtns = [...document.querySelectorAll('.throw')]; // (one each side)
const hudBanner = document.getElementById('banner');
const hudTurbo = document.getElementById('turbo');
const hudDanger = document.getElementById('danger');
const hudFlat = document.getElementById('flat'), hudFlatFill = document.getElementById('flatFill');
const hudCopWatch = document.getElementById('copWatch');
const hudCopGlow = document.getElementById('copGlow');
const hudTowing = document.getElementById('towing'), hudTowFill = document.getElementById('towFill'), hudTowLabel = document.getElementById('towLabel');
const hudSocial = document.getElementById('social'), hudSocialFill = document.getElementById('socialFill');
// the radiation meter (radiation.js): on a level with radiation only; the word says what it is doing
const hudRadiation = document.getElementById('radiation'), hudRadiationFill = document.getElementById('radiationFill'), hudRadiationLabel = document.getElementById('radiationLabel');
const syncRadiationMeter = () => {
  const shown = Game.state === 'playing' && Player.active && !Game.screensaver && Radiation.on;
  hudRadiation.style.display = shown ? 'block' : 'none';
  if (!shown) return;
  hudRadiationFill.style.width = (Radiation.meter * 100).toFixed(1) + '%';
  hudRadiation.classList.toggle('infected', Radiation.infected);
  hudRadiation.classList.toggle('dosed', !!Radiation.source && !Radiation.infected);
  hudRadiation.classList.toggle('kept', Radiation.kept);
  const label = Radiation.kept ? 'RADIATION KEPT OUT' : Radiation.infected ? 'INFECTED' : Radiation.source ? 'RADIATION: DOSING' : 'RADIATION';
  if (hudRadiationLabel.textContent !== label) hudRadiationLabel.textContent = label;
};
const hudBusts = document.getElementById('busts');
// (racing a rival courier, the player's busts, as on any delivery level)
const rivalLine = () => '\nBUSTS ' + Game.busts + ' / ' + CONFIG.maxBusts; // (on a line of its own: see style.css, #busts)
// who is coming up behind, at the foot of the screen (see CONFIG.behind): an arrow pointing back
// towards them (tipped and moved over to the side of the road they are on), and how far back they are
const hudBehind = document.getElementById('behind'), hudBehindArrow = hudBehind.querySelector('.arrow');
const hudBehindLabel = document.getElementById('behindLabel');
const syncBehind = (raced) => {
  const B = CONFIG.behind;
  let shown = null;
  if (LEVEL.grid && Game.state === 'playing' && Player.active && !Game.screensaver && !Game.paused) {
    const me = raced(Game.lap, Player.s);
    let gap = LEVEL.grid.rival ? B.rivalRange : B.raceRange;
    for (const c of Traffic.cars) {
      if (!c.racer || !c.active) continue;
      const g = me - raced(c.laps || 0, c.s); // (how far behind the player it is)
      if (g > 0 && g < gap) { gap = g; shown = c; }
    }
    if (shown) {
      const place = 2 + Traffic.cars.filter(c => c.racer && raced(c.laps || 0, c.s) > me).length; // (its place: the one after the player's)
      const across = (shown.lat - Player.lat) * (Track.mirrored ? -1 : 1); // (m to the right of the player, as seen)
      const turn = Math.atan2(across, Math.max(gap, 4));
      hudBehind.style.transform = `translateX(calc(-50% + ${Math.max(-B.slide, Math.min(B.slide, across * B.slidePerM))}px))`;
      hudBehindArrow.style.transform = `rotate(${-turn}rad)`;
      hudBehindLabel.textContent = (LEVEL.grid.rival ? (shown.rivalName || 'rival').toUpperCase() + '  ' : 'P' + place + '  ') + Math.round(gap) + ' m';
      hudBehind.classList.toggle('close', gap < B.close);
      // (a rival in its own colour)
      const tint = shown.markColor ?? (LEVEL.grid.rival ? 0xff2bd6 : null);
      hudBehind.style.setProperty('--tint', tint === null ? '' : '#' + tint.toString(16).padStart(6, '0'));
    }
  }
  hudBehind.style.display = shown ? 'block' : 'none';
};
// upcoming speed camera proximity warning (see CONFIG.speedCamera)
const syncCamAlert = () => {
  if (!hudCamAlert) return;
  if (Game.state !== 'playing' || !Player.active || Game.screensaver || Game.paused) {
    hudCamAlert.classList.add('hidden');
    return;
  }
  const warnDist = CONFIG.speedCamera?.warn || 180;
  let targetCam = null;
  let minGap = Infinity;
  for (let i = 0; i < SpeedCameras.list.length; i++) {
    const cam = SpeedCameras.list[i];
    if (cam.passed || cam.obstacle?.gone) continue;
    const gap = cam.s - Player.s;
    if (gap > 0 && gap <= warnDist && gap < minGap) {
      minGap = gap;
      targetCam = cam;
    }
  }

  if (!targetCam) {
    hudCamAlert.classList.add('hidden');
    return;
  }

  hudCamAlert.classList.remove('hidden');

  const gap = minGap;
  const distM = Math.max(0, Math.round(gap));
  if (hudCamDist) hudCamDist.textContent = `${distM} m`;

  const limitKmh = Math.round(targetCam.limit * 3.6);
  if (hudCamLimit) hudCamLimit.textContent = limitKmh;

  const playerKmh = Math.round(Player.speed * 3.6);
  const over = playerKmh - limitKmh;

  if (hudCamStatus) {
    if (Player.tank > 0) {
      hudCamStatus.textContent = 'RAM IT!';
      hudCamAlert.className = 'active tank';
    } else if (Player.radar > 0) {
      hudCamStatus.textContent = 'RADAR JAMMED';
      hudCamAlert.className = 'active radar';
    } else if (over > 0) {
      hudCamStatus.textContent = `SLOW DOWN (+${over})`;
      hudCamAlert.className = 'active speeding';
    } else {
      hudCamStatus.textContent = 'SPEED OK';
      hudCamAlert.className = 'active safe';
    }
  }

  const camLat = targetCam.obstacle ? targetCam.obstacle.lat : 0;
  const across = (camLat - Player.lat) * (Track.mirrored ? -1 : 1);
  const turn = Math.atan2(across, Math.max(gap, 4));

  const slide = Math.max(-120, Math.min(120, across * 14));
  hudCamAlert.style.transform = `translateX(${slide.toFixed(1)}px)`; // (from the middle of the top strip, where it sits)

  if (hudCamArrow) hudCamArrow.style.transform = `rotate(${turn.toFixed(3)}rad)`;
};
const hudDangerFill = document.getElementById('dangerFill'), hudDangerNeedle = document.getElementById('dangerNeedle');
// the sticky messages' icons (see messages.js; the pictures are render/hudIcons.js): one for each condition
// still on, under the gauges, the oldest first. The words themselves were an ordinary message and have gone
// as one; the ring round an icon drains as its condition runs out. Sizes and place: CONFIG.messageTimes.stickyIcons
const hudSticky = document.getElementById('sticky');
for (const [name, byShape] of Object.entries(CONFIG.messageTimes.stickyIcons)) {
  for (const [shape, value] of Object.entries(byShape)) {
    [].concat(value).forEach((v, i, all) => hudSticky.style.setProperty(`--${name}-${shape}${all.length > 1 ? '-' + 'xy'[i] : ''}`, name === 'across' ? v : v + 'px'));
  }
}
const stickyName = (h) => Message.pick(h.condition === 'mystery' ? 'mysteryNames' : 'stickyNames', h.condition === 'mystery' ? h.key : h.condition) || h.line.text;
let stickyShown = '';
const syncSticky = () => {
  Message.settle(); // (none is drawn after its condition has ended)
  const held = Game.state === 'playing' && !Game.screensaver ? Message.sticky : [];
  const key = held.map(h => h.id).join('|');
  if (key !== stickyShown) {
    stickyShown = key;
    hudSticky.textContent = '';
    for (const h of held) {
      const icon = document.createElement('button'), name = stickyName(h);
      icon.className = 'icon';
      icon.type = 'button';
      icon.tabIndex = -1; // (never the keyboard's: the keys drive the car)
      icon.title = name;
      icon.setAttribute('aria-label', name);
      icon.dataset.path = h.path;
      icon.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle class="back" cx="16" cy="16" r="14.5"/>' +
        '<circle class="left" cx="16" cy="16" r="14.5" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 16 16)"/>' +
        '<g class="art" transform="translate(5.4 5.4) scale(.88)">' + stickyIcon(h) + '</g></svg>';
      hudSticky.append(icon);
    }
  }
  held.forEach((h, i) => {
    const ring = hudSticky.children[i].firstChild.children[1], left = ((1 - h.progress) * 100).toFixed(1);
    if (ring.dataset.left !== left) ring.setAttribute('stroke-dasharray', (ring.dataset.left = left) + ' 100');
  });
};
// a touch of an icon, or the pointer over it: its message again, briefly, as the ordinary message it was
const recallSticky = (e) => {
  const icon = e.target.closest?.('.icon');
  if (!icon) return;
  if (e.type === 'pointerdown') e.preventDefault(); // (the button takes no focus, so the keys still drive)
  Message.recall(icon.dataset.path);
};
hudSticky.addEventListener('pointerdown', recallSticky);
hudSticky.addEventListener('pointerover', recallSticky);
const hudFade = document.getElementById('fade');
const runButtons = document.getElementById('runButtons');
const pauseBtn = document.getElementById('pauseBtn');
const hudMessages = [...document.querySelectorAll('#messages .line')]; // top, bottom
const shownIds = [0, 0];
const kmh = (ms) => Math.round(ms * 3.6);
// (the HUD is not updated on the menu, so a run's buttons and fade are cleared as it ends)
Game.onFinish.push(() => {
  runButtons.style.display = 'none';
  hudFade.style.opacity = 0;
  if (hudCamAlert) hudCamAlert.classList.add('hidden');
});
export const updateHud = () => {
  // the clock counts down; below zero is the tip countdown, with the tip draining away
  const left = Game.state === 'start' ? clockFor(LEVEL, false) : Game.remaining;
  const late = left < 0;
  hudTimer.textContent = formatTime(left);
  hudTimer.style.color = hudTip.style.color = late ? '#ff5a4f' : '';
  hudTip.textContent = (late ? 'TIP COUNTDOWN  $' : 'TIP $') + (Game.state === 'start' ? LEVEL.tip : Game.tip).toFixed(2);
  hudSpeed.firstChild.nodeValue = kmh(Player.speed) + ' ';
  // the level's ring, and the distance left in it (in km down to the last one, then in m)
  hudProgress.setAttribute('stroke-dasharray', (Game.progress * 100).toFixed(2) + ' 100');
  const togo = Math.max(0, Game.state === 'start' ? 0 : Game.distanceLeft);
  const figure = togo >= 1000 ? (togo / 1000).toFixed(1) : String(Math.round(togo)), unit = togo >= 1000 ? 'km' : 'm';
  if (hudProgressLeft.textContent !== figure) hudProgressLeft.textContent = figure;
  if (hudProgressUnit.textContent !== unit) hudProgressUnit.textContent = unit;
  const lapLabel = LEVEL.laps ? 'LAP ' + Math.min(LEVEL.laps, Game.lap + 1) + '/' + LEVEL.laps : 'TO GO';
  if (hudProgressLabel.textContent !== lapLabel) hudProgressLabel.textContent = lapLabel;
  let effects = '';
  if (Player.active) {
    if (Player.turbo > 0) effects += 'TURBO ' + Player.turbo.toFixed(1) + '  ';
    if (Player.ghost > 0) effects += 'GHOST ' + Player.ghost.toFixed(1) + '  ';
    if (Player.passenger > 0) effects += 'PASSENGER ' + Player.passenger.toFixed(1) + '  ';
    if (Player.radar > 0) effects += 'RADAR ' + Player.radar.toFixed(1) + '  ';
    if (Player.siren > 0) effects += 'SIREN ' + Player.siren.toFixed(1) + '  ';
    if (Player.badGas > 0) effects += 'BAD GAS ' + Player.badGas.toFixed(1) + '  ';
    if (Player.heavy > 0) effects += 'HEAVY ' + Player.heavy.toFixed(1) + '  ';
    if (Player.mystery) effects += Player.mysteryName.toUpperCase() + ' ' + Player.mysteryTime.toFixed(1) + '  '; // (the effect by name: "EARTHQUAKE 7.2")
    if (Player.tank > 0) effects += 'TANK RAGE';
  }
  hudTurbo.textContent = effects;
  const throwOpacity = Packages.ready ? 1 : 0.4;
  const throwLabel = Player.tank > 0 ? 'FIRE' : 'THROW';
  for (const button of throwBtns) {
    button.style.display = LEVEL.noPackages ? 'none' : '';
    button.style.opacity = throwOpacity;
    if (button.textContent !== throwLabel) button.textContent = throwLabel;
  }
  syncSticky();
  // pause and exit: shown during a run and the screensaver
  runButtons.style.display = Game.state === 'playing' ? 'flex' : 'none';
  const pauseLabel = Game.paused ? 'Resume' : 'Pause';
  if (pauseBtn.textContent !== pauseLabel) pauseBtn.textContent = pauseLabel;
  // the screensaver fades to black and back where one lap joins the next
  hudFade.style.opacity = Game.screensaver && !Game.raceWatch // (not in the race: a circuit has no seam to hide)
    ? 1 - Math.min(1, Math.min(Math.abs(Player.s), Math.abs(Track.length - Player.s)) / CONFIG.screensaver.fadeDistance) : 0;
  hudBanner.style.display = Game.paused ? 'block' : 'none'; // (the only banner: paused)
  // the two message lines (see messages.js): each up for its own time, fading away at the end
  const now = performance.now();
  Message.lines.forEach((line, i) => {
    const el = hudMessages[i];
    if (line.id !== shownIds[i]) {
      shownIds[i] = line.id;
      el.textContent = line.text;
      el.className = 'line ' + line.kind;
    }
    const age = (now - line.at) / 1000;
    el.style.opacity = Game.paused || Game.state !== 'playing' || !line.text ? 0
      : Math.min(1, Math.max(0, (line.time - age) / CONFIG.messageTimes.fade));
  });
  // (in a race, the player's place in it: one more than the racers ahead)
  // (round a lapped circuit, the laps count first)
  const raced = (laps, s) => (LEVEL.laps ? laps * Track.length : 0) + Track.along(s);
  hudBusts.textContent = LEVEL.grid
    ? 'POSITION ' + (1 + Traffic.cars.filter(c => c.racer && raced(c.laps || 0, c.s) > raced(Game.lap, Player.s)).length) + ' / ' + (LEVEL.grid.count + 1) +
      (LEVEL.grid.rival ? rivalLine() : '') // (the lap is under the level's ring: see above)
    : 'BUSTS ' + Game.busts + ' / ' + CONFIG.maxBusts;
  syncBehind(raced);
  syncCamAlert();
  // a police car near enough to see what the player does (on the shoulder, a bust on the spot; not
  // on a level without the shoulder rule, nor for a tank, which nobody busts)
  const watchable = Game.state === 'playing' && Player.active && !Game.screensaver && LEVEL.shoulderTimer !== false && Player.tank <= 0;
  const watched = watchable && Traffic.policeNear();
  hudCopWatch.style.display = watched ? 'block' : 'none';
  // (and the screen's edges flash red and blue, from a little further out: CONFIG.copGlowMargin)
  hudCopGlow.classList.toggle('on', watchable && Traffic.policeNear(CONFIG.copGlowMargin));
  // in a car's slipstream, and how deep in it (a race)
  // (or, just out of it, the slingshot, and how much of it is left)
  const flung = Player.slingTime > 0 && !(Player.tow > 0);
  const towing = Player.active && !Game.screensaver && (Player.tow > 0 || flung);
  hudTowing.style.display = towing ? 'block' : 'none';
  hudTowing.classList.toggle('sling', flung);
  if (towing) {
    hudTowLabel.textContent = flung ? 'SLINGSHOT!' : 'SLIPSTREAM';
    hudTowFill.style.width = (flung ? Player.slingTime / Player.slingTotal : Player.tow) * 100 + '%';
  }
  // a good player's social standing (none on a level with no packages, nor in the screensaver)
  const social = Game.state === 'playing' && Player.active && !Game.screensaver && Social.on && !LEVEL.noPackages;
  hudSocial.style.display = social ? 'block' : 'none';
  if (social) {
    hudSocialFill.style.width = Social.level * 100 + '%';
    hudSocial.classList.toggle('protected', Social.protected);
  }
  syncRadiationMeter();
  // the shoulder's dial: 0 on the road, up to the bust on the shoulder (always there; dim where no shoulder rule applies)
  const danger = Player.active ? Math.max(0, Math.min(1, 1 - Player.danger / Social.dangerTime)) : 0;
  hudDangerNeedle.setAttribute('transform', `rotate(${(-120 + danger * 240).toFixed(1)} 28 28)`);
  hudDangerFill.setAttribute('stroke-dasharray', (danger * 100).toFixed(1) + ' 100');
  hudDanger.classList.toggle('hot', danger >= 0.75);
  hudDanger.classList.toggle('off', LEVEL.shoulderTimer === false);
  // a flat tyre: stop, and the bar fills as the tyre is changed (said by its sticky message, where that is one:
  // this line only if it has been taken out of CONFIG.messageTimes.sticky)
  hudFlat.style.display = Player.active && Player.puncture && !Message.sticky.some(h => h.condition === 'puncture') ? 'block' : 'none';
  hudFlatFill.style.width = Math.min(1, (Player.fixing || 0) / CONFIG.puncture.fixTime) * 100 + '%';
  const health = Math.max(0, Player.health / Player.maxHealth);
  hudHealth.style.width = health * 100 + '%';
  hudHealth.style.background = health > 0.5 ? '#4caf50' : health > 0.25 ? '#ffd23f' : '#ff3b30';
};
