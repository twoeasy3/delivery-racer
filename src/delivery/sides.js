// ============================================================================
// THE GOOD & EVIL PAGE (delivery/sides.html): what the side you pick changes, and how the drivers
// on the road (good and evil, by their mood) take you. The numbers come from the game's CONFIG and
// the drivers' lines from messages.json, so the page stays true when either changes.
// ============================================================================
import './sides.css';
import { CONFIG } from './config.js';
import MESSAGES from './messages.json';
import { faceSvg } from './render/faces.js';

const says = (...path) => { let e = MESSAGES; for (const k of path) e = e && e[k]; return [].concat(e || [])[0] || ''; };
const pct = (share) => Math.round(share * 100) + '%';
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
const m = (metres) => Math.round(metres) + ' m';

// (the badges, as the race screensaver's board draws them; the mood faces: see render/faces.js)
const HALO = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="4.5" fill="none" stroke="#ffd23f" stroke-width="3"/></svg>';
const HORNS = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 21 Q2 9 8 3 Q7 12 11 19 Z M21 21 Q22 9 16 3 Q17 12 13 19 Z" fill="#ff5a4f"/></svg>';
const FACE = {
  happy: `<span class="face">${faceSvg('happy', 18)}Happy</span>`,
  neutral: `<span class="face">${faceSvg('neutral', 18)}Neutral</span>`,
  angry: `<span class="face">${faceSvg('angry', 18)}Angry</span>`,
};
const table = (head, rows) => `<div class="scroll"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>` +
  `<tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i > 0 && /^[−+\d]/.test(c) ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

const C = CONFIG, A = C.attitude, S = C.social, R = C.race, SM = C.startMood;

document.getElementById('page').innerHTML = `
<section>
  <h2>Your side</h2>
  <p>Picked on the menu, before a run. It sets your clock, what your packages do, and how the road treats you.</p>
  <div class="pair">
    <article class="card good">
      <h3>${HALO}Good<span class="tag">more time</span></h3>
      <p class="says">${says('reactions', 'goodOnGood')}</p>
      <ul>
        <li>Your packages are <strong>care packages</strong>: ${C.packageDamage} damage, and a good driver cheers up (${signed(C.packageMoodBoost)} mood).</li>
        <li>An evil driver takes a gift as an insult. It turns <strong>furious</strong>, and for ${C.giftOffence} s every package it throws comes at you; after that, about ${pct(C.giftSpite)} of them do. It doesn't drive any differently.</li>
        <li>Gifts build your <strong>social standing</strong> (below).</li>
      </ul>
    </article>
    <article class="card evil">
      <h3>${HORNS}Evil<span class="tag">less time</span></h3>
      <p class="says">${says('reactions', 'evilOnGood')}</p>
      <ul>
        <li>Your packages are <strong>flaming</strong>: ${C.evilPackageDamage} damage, they can spin a car out, and its driver holds a grudge.</li>
        <li>Hitting a <strong>police car</strong> with one is a bust. So is hitting anyone while a police car can see you.</li>
        <li>Wrecking a car impresses the evil drivers within ${m(A.wreckCheer.range)} (${signed(A.wreckCheer.mood)} mood each): enough of that and they become your <strong>wingmen</strong>.</li>
      </ul>
    </article>
  </div>
  <p>Either way, a throw goes at the nearest car within ${m(C.throwRange)}, one alongside you included. A car behind you counts as ${C.throwBehind}× as far off as it is, so one ahead usually wins. With nothing in range it lands on the road ${m(C.throwBlind)} ahead.</p>
</section>

<section>
  <h2>The other drivers</h2>
  <p>Every car on the road is good or evil for life. ${pct(C.evilShare)} are evil (some levels set their own share). Police cars, ambulances and other special vehicles are never evil.</p>
  <div class="pair">
    <article class="card good">
      <h3>${HALO}Good drivers</h3>
      <p>Start out ${pct(SM.good.happy)} happy, ${pct(1 - SM.good.happy - SM.good.angry)} neutral, ${pct(SM.good.angry)} angry.</p>
      <ul>
        <li>Signal before changing lanes, unless angry.</li>
        <li>Move out of the tide's water, and out of a siren's way.</li>
        <li>Never start a fight of their own, though one that is hit may fight back.</li>
      </ul>
    </article>
    <article class="card evil">
      <h3>${HORNS}Evil drivers</h3>
      <p>Start out ${pct(SM.evil.happy)} happy, ${pct(1 - SM.evil.happy - SM.evil.angry)} neutral, ${pct(SM.evil.angry)} angry.</p>
      <ul>
        <li>Never signal: every lane change is a swerve.</li>
        <li>Throw packages when you're within ${m(C.enemyThrowRange)}, every ${C.enemyThrowMin}–${C.enemyThrowMax} s.</li>
        <li>Plough on through the tide; ${pct(C.emergency.defiance)} won't give way to an ambulance.</li>
        <li>Never throw at the police.</li>
      </ul>
    </article>
  </div>
</section>

<section>
  <h2>Moods and grudges</h2>
  <p>Every driver has a mood, shown by the face that pops up over the car. A <strong>grudge</strong> is separate: a driver holding one throws at you instead of at other traffic, for ${C.grudgeTime} s after you last upset it.</p>
  ${table(['What happens', 'Mood', 'Grudge'], [
    ['Your gift lands on a good driver', signed(C.packageMoodBoost), '—'],
    ['Your gift lands on an evil driver', 'to furious', `throws at you for ${C.giftOffence} s, then now and then`],
    ['Your flaming package, or a bump with you', `−${C.moodPerDamage} per damage`, 'yes'],
    ['Stuck behind you', `−${C.moodHoldUp} a second`, 'yes, and it honks'],
    ['Any damage', `−${C.moodPerDamage} per damage`, '—'],
    ['Angel / Jerk mystery', 'everyone to happy / to angry', 'Jerk: everyone near goes after you'],
  ])}
  <p>Two cars that collide may start a <strong>feud</strong> (${pct(C.rivalryChance)} chance each way, for ${C.rivalryTime} s): the one with the grudge chases and rams the other. An angry evil driver also picks on its nearest neighbour now and then.</p>
</section>

<section>
  <h2>How the drivers treat you</h2>
  <p>A driver going your way reacts to you by its side, its mood and yours, mostly when you come up within ${m(C.attitudeRange)} behind it. The police, ambulances, trucks and tractors keep to themselves.</p>
  <div class="pair" style="grid-template-columns: 1fr">
    ${table([`${HALO}`.replace('width="22" height="22"', 'width="16" height="16"') + ' Good driver', 'You\'re good', 'You\'re evil'], [
      [FACE.happy, `<strong>Friendly.</strong> Moves aside for you, and eases off to let you in from the next lane.`, `<strong>Wary.</strong> Gets out of your lane, ahead of you or behind.`],
      [FACE.neutral, 'Drives normally.', `<strong>Distant.</strong> Hangs back when you're within ${m(A.distance)} ahead.`],
      [FACE.angry, `<strong>Sulky.</strong> Tailgates and honks, holds its lane, and keeps level so you can't cut in.`, `<strong>Vigilante.</strong> Blocks your lane ahead, tailgates, won't let you in.`],
    ])}
    ${table([`${HORNS}`.replace('width="22" height="22"', 'width="16" height="16"') + ' Evil driver', 'You\'re good', 'You\'re evil'], [
      [FACE.happy, `<strong>Smug.</strong> Gets in your lane ahead, dawdles, and brake-checks you every ${A.brakeCheckEvery.min}–${A.brakeCheckEvery.max} s.`, `<strong>Wingman.</strong> Moves aside, and only ever throws at the cars around you.`],
      [FACE.neutral, 'Ignores you; throws at traffic.', 'Ignores you; throws at traffic.'],
      [FACE.angry, `<strong>Road rage.</strong> Blocks you, rams you if stuck behind you, picks fights, throws ${A.rageThrowRate}× as often. (One angered by your gift only throws.)`, `<strong>Turf war.</strong> Hunts you (below), throwing ${A.turfThrowRate}× as often.`],
    ])}
  </div>
  <p>A good driver never rams you: an angry one sits on your bumper instead.</p>
</section>

<section>
  <h2>Turf war</h2>
  <p>An angry evil driver treats an evil player as a rival on its turf. Once it is within ${m(C.attitudeRange)} of you, it hunts you:</p>
  <div class="card evil">
    <ul>
      <li><strong>It doesn't drop away.</strong> From behind, it closes in ${A.hunt.catchUp} m/s faster than you're going.</li>
      <li><strong>It comes for you</strong>: into your lane, ramming you from behind, leaning on you alongside, and every throw is at you.</li>
      <li><strong>It gives up</strong> after ${A.hunt.time} s, or once ${m(A.hunt.lost)} behind, and cools off.</li>
      <li><strong>Two at once box you in</strong>: one ahead takes your lane and brake-checks you, one behind rams, any more come alongside.</li>
    </ul>
  </div>
</section>

<section>
  <h2>Social standing</h2>
  <p>Good only. A gold bar under the shoulder meter that starts empty every level. It fills only with gifts that land: ${signed(S.gift)} on a good driver, ${signed(S.copGift)} on a police car. It drains ${S.decay} a second, and every bust costs ${S.bust}. It glows once it protects you.</p>
  ${table(['The fuller the bar', 'Empty', 'Full'], [
    ['Police see you from', m(C.policeSightRange * S.policeSight.empty), m(C.policeSightRange * S.policeSight.full)],
    ['Time allowed on the shoulder', C.dangerTime + ' s', C.dangerTime * (1 + S.danger) + ' s'],
    ['Evil drivers among new traffic', 'the usual', `down to ${pct(S.evilFloor)}`],
    ['New drivers start out (good and evil)', 'as usual', `happier, ${signed(S.moodLift)} mood`],
    ['Good power-ups: turbo, ghost, siren, radar detector, passenger', 'as usual', `${signed(S.powerUpShift)} s`],
    ['Bad power-ups: bad gas, 1000 lb weight', 'as usual', `−${S.powerUpShift} s`],
    ['Good mysteries: Toad Rage, Invincible, Angel, UFO Air Strike', 'as usual', `${1 + S.luck}× as likely, ${signed(S.powerUpShift)} s`],
    ['Bad mysteries: Rickety, Jerk, No Brakes', 'as usual', `−${S.powerUpShift} s`],
    [`Your car mends itself (from ${pct(S.regen.from)} full)`, '—', `${(S.regen.max * 100).toFixed(1)}% of its health a second`],
    ['An evil car that attacks you near a police car', '—', `arrested, from ${pct(S.protectFrom)} full`],
  ])}
  <div class="card good">
    <h3>A caution, not a bust</h3>
    <p>With the bar over ${pct(S.cautionFrom)} full, the police let you off with a <strong>caution</strong>. It still costs you the ${S.bust}, so a second offence is a real bust. A caution for the shoulder gives you <strong>${S.grace} s</strong> to get back in a lane.</p>
  </div>
</section>

<section>
  <h2>In a race</h2>
  <p>In the Grand Prix levels and the race screensaver, the other cars race by race rules. Half the grid is good and half evil, marked on the screensaver's leaderboard with a halo or horns.</p>
  <div class="pair">
    <article class="card good">
      <h3>${HALO}Good racers</h3>
      <ul>
        <li>Race clean: never start a feud, whatever is done to them.</li>
        <li>With an evil racer alongside, they lift (to ${pct(R.bully.lift)}) to stay out of trouble; with one on their tail, they move over and let it by.</li>
        <li>Lose heart while they're being bullied.</li>
        <li>Always brake for you.</li>
      </ul>
    </article>
    <article class="card evil">
      <h3>${HORNS}Evil racers</h3>
      <ul>
        <li><strong>Feuds</strong>: nudge a rival ahead, lean on one alongside, block one behind.</li>
        <li><strong>Fury</strong> when angry: ${signed(Math.round((R.fury.pace - 1) * 100))}% top speed, braver in the bends.</li>
        <li><strong>Chase down</strong> the car in front once more than ${m(R.chase.from)} behind it.</li>
        <li><strong>Bully</strong> good racers and you: lean on you alongside, and cut into your lane just ahead.</li>
        <li>Cheer up (${signed(R.killMood)}) for every car they wreck.</li>
      </ul>
    </article>
  </div>
  <p>In a race, moods follow the race: the cars up front cheer up while they have clear road behind them, and fret with someone close on their tail; passing a car cheers a driver up, being passed gets it down, the more so near the front.</p>
</section>`;
