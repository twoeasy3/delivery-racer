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
import { Replay } from '../replay.js';

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
// (P9 of the audit: a write to the page only where the value changed. Reading these back costs nothing, and a
// value the browser writes back in another form, a colour say, is simply written again as before)
const setText = (el, value) => { value = String(value); if (el.textContent !== value) el.textContent = value; };
const setStyle = (el, prop, value) => { value = String(value); if (el.style[prop] !== value) el.style[prop] = value; };
const setAttr = (el, name, value) => { value = String(value); if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
const syncRadiationMeter = () => {
  const shown = Game.state === 'playing' && Player.active && !Game.screensaver && Radiation.on;
  setStyle(hudRadiation, 'display', shown ? 'block' : 'none');
  if (!shown) return;
  setStyle(hudRadiationFill, 'width', (Radiation.meter * 100).toFixed(1) + '%');
  hudRadiation.classList.toggle('infected', Radiation.infected);
  hudRadiation.classList.toggle('dosed', !!Radiation.source && !Radiation.infected);
  hudRadiation.classList.toggle('kept', Radiation.kept);
  const label = Radiation.kept ? 'RADIATION KEPT OUT' : Radiation.infected ? 'INFECTED' : Radiation.source ? 'RADIATION: DOSING' : 'RADIATION';
  setText(hudRadiationLabel, label);
};
const hudBusts = document.getElementById('busts');
// the busts line's small icons (a phone shows these for the words): a police light, and a flag for a race's place
const ICON_BUSTS = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 20v-6a6 6 0 0 1 12 0v6zM4 20h16M12 3v2.5M4.6 6.2l1.8 1.6M19.4 6.2l-1.8 1.6"/></svg>';
const ICON_POSITION = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3M5 4h13l-2.5 4 2.5 4H5"/></svg>';
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
      setStyle(hudBehind, 'transform', `translateX(calc(-50% + ${Math.max(-B.slide, Math.min(B.slide, across * B.slidePerM))}px))`);
      setStyle(hudBehindArrow, 'transform', `rotate(${-turn}rad)`);
      setText(hudBehindLabel, (LEVEL.grid.rival ? (shown.rivalName || 'rival').toUpperCase() + '  ' : 'P' + place + '  ') + Math.round(gap) + ' m');
      hudBehind.classList.toggle('close', gap < B.close);
      // (a rival in its own colour)
      const tint = shown.markColor ?? (LEVEL.grid.rival ? 0xff2bd6 : null);
      hudBehind.style.setProperty('--tint', tint === null ? '' : '#' + tint.toString(16).padStart(6, '0'));
    }
  }
  setStyle(hudBehind, 'display', shown ? 'block' : 'none');
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
  if (hudCamDist) setText(hudCamDist, `${distM} m`);

  const limitKmh = Math.round(targetCam.limit * 3.6);
  if (hudCamLimit) setText(hudCamLimit, limitKmh);

  const playerKmh = Math.round(Player.speed * 3.6);
  const over = playerKmh - limitKmh;

  if (hudCamStatus) {
    if (Player.tank > 0) {
      setText(hudCamStatus, 'RAM IT!');
      hudCamAlert.className = 'active tank';
    } else if (Player.radar > 0) {
      setText(hudCamStatus, 'RADAR JAMMED');
      hudCamAlert.className = 'active radar';
    } else if (over > 0) {
      setText(hudCamStatus, `SLOW DOWN (+${over})`);
      hudCamAlert.className = 'active speeding';
    } else {
      setText(hudCamStatus, 'SPEED OK');
      hudCamAlert.className = 'active safe';
    }
  }

  const camLat = targetCam.obstacle ? targetCam.obstacle.lat : 0;
  const across = (camLat - Player.lat) * (Track.mirrored ? -1 : 1);
  const turn = Math.atan2(across, Math.max(gap, 4));

  const slide = Math.max(-120, Math.min(120, across * 14));
  setStyle(hudCamAlert, 'transform', `translateX(${slide.toFixed(1)}px)`); // (from the middle of the top strip, where it sits)

  if (hudCamArrow) setStyle(hudCamArrow, 'transform', `rotate(${turn.toFixed(3)}rad)`);
};
const hudDangerFill = document.getElementById('dangerFill'), hudDangerNeedle = document.getElementById('dangerNeedle');
// the sticky messages' icons, the statuses (see messages.js; the pictures are render/hudIcons.js): one for each
// condition still on, beside the gauges, the oldest first, on a desktop as on a phone. Their words are never a
// message line of their own: the icon's tooltip, and a touch or a click of it (Message.recall), give them. A new
// one comes in with a short pop (style.css, #sticky .icon.new) so it is seen; the ring round an icon drains as its
// condition runs out. Sizes and place: CONFIG.messageTimes.stickyIcons
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
    const before = new Set(stickyShown.split('|'));
    stickyShown = key;
    hudSticky.textContent = '';
    for (const h of held) {
      const icon = document.createElement('button'), name = stickyName(h);
      icon.className = before.has(String(h.id)) ? 'icon' : 'icon new';
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
// a touch or a click of an icon, or the pointer over it: its words, briefly, as an ordinary message
const recallSticky = (e) => {
  const icon = e.target.closest?.('.icon');
  if (!icon) return;
  if (e.type === 'pointerdown') e.preventDefault(); // (the button takes no focus, so the keys still drive)
  const line = Message.recall(icon.dataset.path);
  // (swapped sides: its words name the side, filled in by mysteries.js only on a message line; a status's words
  // are on none until now, so the side the car is on is put in here)
  if (line?.text.includes('${side}')) line.text = line.text.replace('${side}', Player.evil ? 'EVIL' : 'GOOD');
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
// back on the menu (main.js): the HUD is not drawn there, so what it last showed over the run is taken down (the
// PAUSED banner of a run left paused, and the run's buttons, would otherwise sit over the menu and the garage)
export const clearHud = () => { hudBanner.style.display = 'none'; runButtons.style.display = 'none'; }; // (and Pause / Exit level: the garage showed them)
export const updateHud = () => {
  // the clock counts down; below zero is the tip countdown, with the tip draining away
  const left = Game.state === 'start' ? clockFor(LEVEL, false) : Game.remaining;
  const late = left < 0;
  setText(hudTimer, formatTime(left));
  setStyle(hudTimer, 'color', late ? '#ff5a4f' : '');
  setStyle(hudTip, 'color', late ? '#ff5a4f' : '');
  setText(hudTip, (late ? 'TIP COUNTDOWN  $' : 'TIP $') + (Game.state === 'start' ? LEVEL.tip : Game.tip).toFixed(2));
  const speedText = kmh(Player.speed) + ' ';
  if (hudSpeed.firstChild.nodeValue !== speedText) hudSpeed.firstChild.nodeValue = speedText;
  // the level's ring, and the distance left in it (in km down to the last one, then in m)
  setAttr(hudProgress, 'stroke-dasharray', (Game.progress * 100).toFixed(2) + ' 100');
  const togo = Math.max(0, Game.state === 'start' ? 0 : Game.distanceLeft);
  const figure = togo >= 1000 ? (togo / 1000).toFixed(1) : String(Math.round(togo)), unit = togo >= 1000 ? 'km' : 'm';
  setText(hudProgressLeft, figure);
  setText(hudProgressUnit, unit);
  const lapLabel = LEVEL.laps ? 'LAP ' + Math.min(LEVEL.laps, Game.lap + 1) + '/' + LEVEL.laps : 'TO GO';
  setText(hudProgressLabel, lapLabel);
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
  setText(hudTurbo, effects);
  const throwOpacity = Packages.ready ? 1 : 0.4;
  const throwLabel = Player.tank > 0 ? 'FIRE' : 'THROW';
  for (const button of throwBtns) {
    setStyle(button, 'display', LEVEL.noPackages ? 'none' : '');
    setStyle(button, 'opacity', throwOpacity);
    setText(button, throwLabel);
  }
  syncSticky();
  // pause and exit: shown during a run and the screensaver
  setStyle(runButtons, 'display', Game.state === 'playing' ? 'flex' : 'none');
  const held = !!Replay.playing?.over; // (a replay held at its end, or where it drifted: its results say so, not PAUSED)
  setStyle(pauseBtn, 'display', held ? 'none' : '');
  const pauseLabel = Game.paused ? 'Resume' : 'Pause';
  setText(pauseBtn, pauseLabel);
  // the screensaver fades to black and back where one lap joins the next
  setStyle(hudFade, 'opacity', Game.screensaver && !Game.raceWatch // (not in the race: a circuit has no seam to hide)
    ? 1 - Math.min(1, Math.min(Math.abs(Player.s), Math.abs(Track.length - Player.s)) / CONFIG.screensaver.fadeDistance) : 0);
  setStyle(hudBanner, 'display', Game.paused && !held ? 'block' : 'none'); // (the only banner: paused)
  // the two message lines (see messages.js): each up for its own time, fading away at the end
  const now = performance.now();
  Message.lines.forEach((line, i) => {
    const el = hudMessages[i];
    if (line.id !== shownIds[i]) {
      shownIds[i] = line.id;
      setText(el, line.text);
      el.className = 'line ' + line.kind;
    }
    const age = (now - line.at) / 1000;
    setStyle(el, 'opacity', Game.paused || Game.state !== 'playing' || !line.text ? 0
      : Math.min(1, Math.max(0, (line.time - age) / CONFIG.messageTimes.fade)));
  });
  // (in a race, the player's place in it: one more than the racers ahead)
  // (round a lapped circuit, the laps count first)
  const raced = (laps, s) => (LEVEL.laps ? laps * Track.length : 0) + Track.along(s);
  // (a small icon in place of the words, on a desktop as on a phone: style.css, .ico and .w; the words are its tooltip)
  const bustsLine = LEVEL.grid
    ? ['POSITION ', (1 + Traffic.cars.filter(c => c.racer && raced(c.laps || 0, c.s) > raced(Game.lap, Player.s)).length) + ' / ' + (LEVEL.grid.count + 1) +
      (LEVEL.grid.rival ? rivalLine() : '')] // (the lap is under the level's ring: see above)
    : ['BUSTS ', Game.busts + ' / ' + CONFIG.maxBusts];
  if (hudBusts.dataset.line !== bustsLine.join('')) {
    hudBusts.dataset.line = bustsLine.join('');
    hudBusts.title = LEVEL.grid ? 'Position' : 'Busts';
    hudBusts.innerHTML = (LEVEL.grid ? ICON_POSITION : ICON_BUSTS) + '<span class="w">' + bustsLine[0] + '</span>' + bustsLine[1].replace('\n', '<br>');
  }
  syncBehind(raced);
  syncCamAlert();
  // a police car near enough to see what the player does (on the shoulder, a bust on the spot; not
  // on a level without the shoulder rule, nor for a tank, which nobody busts)
  const watchable = Game.state === 'playing' && Player.active && !Game.screensaver && LEVEL.shoulderTimer !== false && Player.tank <= 0;
  const watched = watchable && Traffic.policeNear();
  setStyle(hudCopWatch, 'display', watched ? 'block' : 'none');
  // (and the screen's edges flash red and blue, from a little further out: CONFIG.copGlowMargin)
  hudCopGlow.classList.toggle('on', watchable && Traffic.policeNear(CONFIG.copGlowMargin));
  // in a car's slipstream, and how deep in it (a race)
  // (or, just out of it, the slingshot, and how much of it is left)
  const flung = Player.slingTime > 0 && !(Player.tow > 0);
  const towing = Player.active && !Game.screensaver && (Player.tow > 0 || flung);
  setStyle(hudTowing, 'display', towing ? 'block' : 'none');
  hudTowing.classList.toggle('sling', flung);
  if (towing) {
    setText(hudTowLabel, flung ? 'SLINGSHOT!' : 'SLIPSTREAM');
    setStyle(hudTowFill, 'width', (flung ? Player.slingTime / Player.slingTotal : Player.tow) * 100 + '%');
  }
  // a good player's social standing (none on a level with no packages, nor in the screensaver)
  const social = Game.state === 'playing' && Player.active && !Game.screensaver && Social.on && !LEVEL.noPackages;
  setStyle(hudSocial, 'display', social ? 'block' : 'none');
  if (social) {
    setStyle(hudSocialFill, 'width', Social.level * 100 + '%');
    hudSocial.classList.toggle('protected', Social.protected);
  }
  syncRadiationMeter();
  // the shoulder's dial: 0 on the road, up to the bust on the shoulder (always there; dim where no shoulder rule applies)
  const danger = Player.active ? Math.max(0, Math.min(1, 1 - Player.danger / Social.dangerTime)) : 0;
  setAttr(hudDangerNeedle, 'transform', `rotate(${(-120 + danger * 240).toFixed(1)} 28 28)`);
  setAttr(hudDangerFill, 'stroke-dasharray', (danger * 100).toFixed(1) + ' 100');
  hudDanger.classList.toggle('hot', danger >= 0.75);
  hudDanger.classList.toggle('off', LEVEL.shoulderTimer === false);
  // a flat tyre: stop, and the bar fills as the tyre is changed (said by its sticky message, where that is one:
  // this line only if it has been taken out of CONFIG.messageTimes.sticky)
  setStyle(hudFlat, 'display', Player.active && Player.puncture && !Message.sticky.some(h => h.condition === 'puncture') ? 'block' : 'none');
  setStyle(hudFlatFill, 'width', Math.min(1, (Player.fixing || 0) / CONFIG.puncture.fixTime) * 100 + '%');
  const health = Math.max(0, Player.health / Player.maxHealth);
  setStyle(hudHealth, 'width', health * 100 + '%');
  setStyle(hudHealth, 'background', health > 0.5 ? '#4caf50' : health > 0.25 ? '#ffd23f' : '#ff3b30');
};
