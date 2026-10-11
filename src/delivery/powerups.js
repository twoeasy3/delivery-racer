// ============================================================================
// THE POWER-UPS (delivery/powerups.html): every pickup, and what it does. The numbers come from the game's
// CONFIG and the wording it shows from messages.json, so the page stays true when either changes.
// Only the catalogue is here (CARDS): the page that shows it, each with its model spinning over its pad, is
// poweruppage.js, and the menu's "what's on this road" card shows a level's own (render/levelcard3d.js).
// ============================================================================
import { CONFIG } from './config.js';
import MESSAGES from './messages.json';
import { nameOf, blurbOf } from './words.js';

const kmh = (ms) => Math.round(ms * 3.6) + ' km/h';
export const says = (...path) => { let e = MESSAGES; for (const k of path) e = e && e[k]; return [].concat(e || [])[0] || ''; };

// ---- what each one does -------------------------------------------------------------------------
const M = CONFIG.mystery, S = CONFIG.sirenPickup;
export const CARDS = [
  { type: 'turbo', name: 'Turbo', time: CONFIG.turboTime, says: says('powerups', 'turbo'), rules: [
    `Your car pulls itself up to <strong>${kmh(CONFIG.turboBoost)}</strong> over its own top speed, even with your foot off, and your bends are taken that much faster too.`,
    'Braking still works; when it runs out you ease back down to your normal top speed.',
  ] },
  { type: 'ghost', name: 'Ghost', time: CONFIG.ghostTime, says: says('powerups', 'ghost'), rules: [
    'Your car turns see-through: you pass straight through <strong>traffic and barriers</strong>.',
    'Bullets pass straight through you too: no damage, and no punctures.',
    'The structure of a bridge and the splash of a package still get you.',
    'You only turn solid again once you are clear of every car.',
  ] },
  { type: 'wrench', name: 'Wrench', says: says('powerups', 'wrench'), rules: [
    `Repairs <strong>${Math.round(CONFIG.wrenchRepair * 100)}%</strong> of your car's health, on the spot.`,
    `Fixes a <strong>puncture</strong> too, without stopping to change the tyre.`,
    'Like the stopwatches, it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'passenger', name: 'Inflatable Passenger', time: CONFIG.passengerTime, says: says('powerups', 'passenger'), rules: [
    'Makes the <strong>shoulder legal</strong>: the police meter refills instead of running down, and nobody busts you for being there.',
  ] },
  { type: 'radarDetector', name: 'Radar Detector', time: CONFIG.radarTime, says: says('powerups', 'radarDetector'), rules: [
    'The police <strong>can\'t bust you</strong>, for anything: the shoulder, hitting a cop, or an attack in front of one.',
    'The shoulder meter <strong>still runs</strong>. If it is full when the detector stops, that is a bust.',
    'Swapping it for another power-up with the meter full is a bust too, unless it is for a passenger.',
  ] },
  { type: 'siren', name: 'Siren', time: S.time, says: says('powerups', 'siren'), rules: [
    `Cars up to <strong>${S.range} m</strong> ahead in your lane get out of the way: a lane over to their right, or onto the shoulder (the only time traffic uses one). Never into oncoming traffic.`,
    'Cars on the shoulder slow down until the siren stops.',
    '<strong>Any car that damages you</strong> while it sounds is carried off by a police helicopter.',
  ] },
  { type: 'badGas', name: 'Bad Gas', time: CONFIG.badGas.time, says: says('powerups', 'badGas'), rules: [
    `A tank of cheap fuel: your top speed drops to <strong>${Math.round(CONFIG.badGas.topSpeed * 100)}%</strong> and your acceleration to <strong>${Math.round(CONFIG.badGas.accel * 100)}%</strong>.`,
    'Like any power-up, picking up another one ends it.',
  ] },
  { type: 'heavyMass', name: '1000 lb Weight', time: CONFIG.heavyMass.time, says: says('powerups', 'heavyMass'), rules: [
    `Your car gets heavier than a bus: top speed <strong>${Math.round(CONFIG.heavyMass.topSpeed * 100)}%</strong>, acceleration <strong>${Math.round(CONFIG.heavyMass.accel * 100)}%</strong>, steering <strong>${Math.round(CONFIG.heavyMass.agility * 100)}%</strong>.`,
    'But you win every collision: traffic takes nearly all of the push and most of the damage, and you are barely knocked about, even running into the back of something.',
  ] },
  { type: 'timePlus', name: 'Time Plus', says: says('powerups', 'timePlus'), rules: [
    `Puts <strong>${CONFIG.timePickup} s</strong> back on the clock. In the tip countdown, it winds that back too, and the tip with it.`,
    'Instant: it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'timeMinus', name: 'Time Minus', says: says('powerups', 'timeMinus'), rules: [
    `Takes <strong>${CONFIG.timePickup} s</strong> off the clock, and can tip you into the tip countdown, or further along it.`,
    'Instant: it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'armour', name: 'Armour', time: CONFIG.armour.time, says: says('powerups', 'armour'), rules: [
    `Your car takes <strong>${Math.round(CONFIG.armour.damage * 100)}%</strong> of any damage, from crashes, packages and the rest.`,
    `No shot can <strong>puncture</strong> a tyre while it lasts.`,
  ] },
  { type: 'bigSplash', name: 'Big Splash', time: CONFIG.bigSplash.time, says: says('powerups', 'bigSplash'), rules: [
    `Your packages catch <strong>every car within ${CONFIG.bigSplash.radius} m</strong> of where they hit or land: gifts cheer them all up, flaming packages burn them all.`,
    `And they hit harder: a flaming package does <strong>${CONFIG.bigSplash.fireDamage}</strong> damage (not ${CONFIG.evilPackageDamage}); a gift <strong>${CONFIG.bigSplash.giftDamage}</strong> (not ${CONFIG.packageDamage}), and to an evil driver it lands as ${CONFIG.bigSplash.giftDamage} quick knocks, each a chance of a critical hit.`,
    'Careful as Evil: hit a police car in the splash, or splash anyone in front of one, and it\'s still a bust.',
  ] },
  { type: 'butterfingers', name: 'Butterfingers', time: CONFIG.butterfingers.time, says: says('powerups', 'butterfingers'), rules: [
    '<strong>You can\'t throw</strong> until it wears off.',
  ] },
  { type: 'cash5', name: '$5 Cash', says: says('powerups', 'cashBonus').replace('${dollar}', '$' + CONFIG.cashPickup.cash5), rules: [
    `Worth <strong>${'$' + CONFIG.cashPickup.cash5}</strong>, banked along with the tip when you deliver on time (lost if you don't).`,
    'Instant: it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'cash10', name: '$10 Cash', says: says('powerups', 'cashBonus').replace('${dollar}', '$' + CONFIG.cashPickup.cash10), rules: [
    `Worth <strong>${'$' + CONFIG.cashPickup.cash10}</strong>, banked along with the tip when you deliver on time (lost if you don't).`,
    'Instant: it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'cash20', name: '$20 Cash', says: says('powerups', 'cashBonus').replace('${dollar}', '$' + CONFIG.cashPickup.cash20), rules: [
    `Worth <strong>${'$' + CONFIG.cashPickup.cash20}</strong>, banked along with the tip when you deliver on time (lost if you don't).`,
    'Instant: it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'mystery', name: 'Mystery', time: M.time, says: '', wide: true, rules: [
    `One of these, at random. The lasting ones run for <strong>${M.time} s</strong>; the insurance news and the air strike are over at once.`,
    'Driving a tank? It is always the air strike.',
  ], effects: [
    ['rickety', `Your car takes <strong>${M.rickety}&times;</strong> the damage.`],
    ['toad', `Every car on the road turns into a toad: ${kmh(M.toadSpeed)}, straight on, 1 health. Touching one bursts it, and costs you like a frog in the road. They all turn back at the end.`],
    ['angel', 'Every driver adores you, and their moods stay that way afterwards.'],
    ['jerk', 'Every driver hates you: cars going your way come after you, and evil ones throw at you.'],
    ['invincible', 'No damage, and you win head-ons. Driving into the end of a bridge still gets you.'],
    ['noBrakes', `No brakes, and no braking by itself for the car in front or for a bend either: take a bend too fast and you slide wide, scrubbing off a little speed. Holding brake only lifts off, coasting down at ${M.noBrakes.coast} m/s&sup2;.`],
    ['insuranceUp', 'Just the news.'],
    ['insuranceDown', 'Just the news.'],
    ['ufo', 'A flying saucer comes down over you, and every car on the road starts to burn up while it hovers, blowing within a few seconds.'],
    ['bulletTrain', `A bullet train turns up the road in your lane and comes straight down it at ${kmh(CONFIG.bulletTrain.speed)}: you have about ${CONFIG.bulletTrain.warning} s to get out of its way. It destroys everything it touches, you included (unless you are a ghost), and steering into its side is just as deadly. While it is about, the shoulder's police meter runs down at half speed, and nobody busts you for being on the shoulder until ${CONFIG.bulletTrain.mercyAfter} s after it has gone.`],
    ['soupedUp', `Your car is swapped for its Super version for ${M.soupedUp.time} s: ${kmh(CONFIG.superCar.maxSpeed)} faster, quicker off the line and tougher, with a body kit and a livery of its own. (A car with no Super version is told so, and nothing happens.)`],
    ['earthquake', `The road ripples for ${M.earthquake.time} s, and every ${M.earthquake.every} s every car is bounced into the lane beside it.`],
    ['rewind', `Everything goes back ${M.rewind.seconds} s: you, the traffic, the obstacles and the clock, so you gain the time. Over at once. (Not in a race or on a lapped level.)`],
    ['giant', `Your car is ${M.giant.scale}&times; its size for ${M.giant.time} s: any traffic it touches is crushed, and it takes no harm from it. It no longer fits a lane.`],
    ['swapSides', 'Good turns Evil, or Evil turns Good, until it runs out: your packages and how drivers take to you go by the new side.'],
    ['magnet', `Pickups up to ${M.magnet.range} m ahead drift toward you.`],
    ['blackout', 'Every light goes out and the dark closes in: headlights only.'],
    ['trafficFreeze', `Everything but you stands still for ${M.trafficFreeze.time} s: traffic, obstacles and hazards.`],
  ] },
  { type: 'target', name: 'TANK RAGE Target', says: says('powerups', 'tankRage'), saysColor: '#ff3b30', color: 0x39ff6a, wide: true, rules: [
    `Land a package on a green target beside the road to find the next piece of the tank. The <strong>${CONFIG.tankPieces}th</strong> piece starts TANK RAGE.`,
    'Pieces carry over from level to level once you reach the finish (even late, in the tip countdown). Fail or quit and that run\'s pieces are lost.',
    `In TANK RAGE you are a tank for the rest of the level: <strong>${kmh(CONFIG.tankMaxSpeed)}</strong>, faster than any car; whatever you touch is wrecked; you fire a cannon instead of throwing; and nobody busts a tank.`,
    'Once used, the tank\'s pieces are gone: you start collecting again from nothing.',
  ] },
];
// pickupText.json comes first (words.js): a card's name, and the blurb of its tile on a level's road card (`blurb`,
// only where the file has one: the card's first rule is the fallback)
for (const card of CARDS) {
  card.name = nameOf('pickup', card.type, card.name);
  const blurb = blurbOf('pickup', card.type);
  if (blurb) card.blurb = blurb;
}
