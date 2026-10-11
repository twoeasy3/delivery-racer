// ============================================================================
// THE POLICE PAGE (delivery/police.html): what gets the player busted, what a bust costs, what
// keeps the police off, and when the police take other drivers away instead. The numbers come
// from the game's CONFIG and the wording from messages.json, so the page stays true when either
// changes. (The good & evil page's look: sides.css)
// ============================================================================
import './sides.css';
import { CONFIG } from './config.js';
import MESSAGES from './messages.json';

const says = (...path) => { let e = MESSAGES; for (const k of path) e = e && e[k]; return [].concat(e || [])[0] || ''; };
const pct = (share) => Math.round(share * 100) + '%';
const m = (metres) => Math.round(metres) + ' m';
const kmh = (ms) => Math.round(ms * 3.6) + ' km/h';
const table = (head, rows) => `<div class="scroll"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>` +
  `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
// (the police-watching sign, as the HUD shows it)
const LIGHTS = '<span class="lights" aria-hidden="true"><i></i><i></i></span>';

const C = CONFIG, S = C.social, E = C.emergency, BT = C.bulletTrain;
const quote = (reason) => `<em>“${says('busts', reason)}”</em>`;

document.getElementById('page').innerHTML = `
<section>
  <h2>Three strikes</h2>
  <p>Every bust counts. The third one ends the run.</p>
  <div class="pair">
    ${[1, 2, 3].map(n => `<article class="card ${n === 3 ? 'evil' : 'good'}">
      <h3>${says('bustCount', String(n)).replace(/[\s-]+$/, '')}<span class="tag">bust ${n}</span></h3>
      <p>${n < C.maxBusts ? 'The police helicopter lifts your car off the road, holds it, and sets it back down in a lane.' : 'The run is over.'}</p>
    </article>`).join('')}
  </div>
  <p>A bust isn't instant: your car keeps going, slowing to ${kmh(C.policeCrawlSpeed)}, for ${C.policeApproachTime} s while the helicopter comes down on it. Then it is held for ${C.policeHoldTime} s before you're dropped back in, with the <strong>same damage</strong> you had. The clock keeps running the whole time.</p>
</section>

<section>
  <h2>What gets you busted</h2>
  ${table(['Offence', 'What the police say', 'When'], [
    ['Too long on the shoulder', quote('shoulder'), `The shoulder meter runs out: ${C.dangerTime} s of shoulder driving, refilling at ${C.dangerCooldown} s a second back in the lanes.`],
    ['Seen on the shoulder', quote('seen'), `Any time you're on the shoulder with a police car watching, meter or not.`],
    ['Hitting a police car', quote('bump'), 'Any contact that was your doing (see below). That includes a pursuit\'s interceptor: it is too busy chasing to see you on the shoulder or anything else, but ramming it is a bust.'],
    ['Attacking a police car', quote('assaultCop'), 'Evil only: a flaming package hits a police car (or a pursuit\'s interceptor).'],
    ['Attacking anyone in view', quote('assault'), 'Evil only: a flaming package hits any car while a police car is watching.'],
    ['Blocking an ambulance', quote('emergency'), `An ambulance comes up within ${m(E.reach)} behind you in its lane, and you're still in its way ${E.giveWay} s later.`],
  ])}
</section>

<section>
  <h2>When the police are watching</h2>
  <div class="pair">
    <article class="card good">
      <h3>${LIGHTS} Police watching</h3>
      <p>This sign lights up under your speed whenever a police car can see you: within ${m(C.policeSightRange)} along the road (for a Good driver, it goes by social standing) and ${m(25)} to either side. Then the shoulder is off limits, and an Evil driver's packages are evidence.</p>
    </article>
    <article class="card good">
      <h3>The shoulder meter</h3>
      <p>On a level with the shoulder rule, the red <strong>SHOULDER - POLICE</strong> bar shows while you're on the shoulder, with beeps that speed up as it runs down. Get back in a lane and it refills. Some levels (the construction site among them) switch the rule off entirely.</p>
    </article>
  </div>
</section>

<section>
  <h2>Contact with a police car</h2>
  <p>Touching a police car is a bust, unless it wasn't your fault. You're in the clear if the police car:</p>
  <div class="card good">
    <ul>
      <li>ran into the <strong>back</strong> of you,</li>
      <li><strong>turned into</strong> you (it was moving sideways towards you, faster than ${C.policeTurnIn} m/s and faster than you were moving towards it),</li>
      <li>was <strong>out of control</strong>: spinning or wobbling from a critical hit,</li>
      <li>or was coming the <strong>other way</strong> (a head-on is a crash, not an offence).</li>
    </ul>
  </div>
  <p>A good driver's care package is welcome: <em>“${says('reactions', 'goodOnPolice')}”</em></p>
</section>

<section>
  <h2>Keeping the police off</h2>
  ${table(['How', 'What it does'], [
    ['<strong>Inflatable Passenger</strong>', `For ${C.passengerTime} s the shoulder is legal: the meter refills and nobody busts you for being there.`],
    ['<strong>Radar Detector</strong>', `For ${C.radarTime} s nobody can bust you for anything. The shoulder meter still runs, and if it's empty when the detector stops, that's a bust.`],
    ['<strong>TANK RAGE</strong>', 'Nobody busts a tank.'],
    ['<strong>Bullet train</strong>', `While one is about, the shoulder meter runs down at ${pct(BT.dangerMercy)} speed, and nobody is busted for the shoulder until ${BT.mercyAfter} s after it has gone: it may be the only way out.`],
    ['<strong>Social standing</strong> (Good)', `The police see you from ${m(C.policeSightRange * S.policeSight.empty)} with an empty bar, down to ${m(C.policeSightRange * S.policeSight.full)} with a full one, and the shoulder meter grows to ${C.dangerTime * (1 + S.danger)} s. But every bust costs ${S.bust} points.`],
  ])}
  <div class="card good">
    <h3>A caution, not a bust</h3>
    <p>A Good driver whose social standing is over ${pct(S.cautionFrom)} gets off with a <strong>caution</strong>: it doesn't count as a bust, but it still costs the ${S.bust} points, so a second offence right after is a real one. A caution for the shoulder gives you <strong>${S.grace} s</strong> to get back in a lane.</p>
  </div>
</section>

<section>
  <h2>When the police take someone else</h2>
  <p>Now and then it's another driver who gets airlifted away, slowing to a stop and lifted off the road:</p>
  ${table(['Who', 'When'], [
    ['A car that hurts you under your <strong>Siren</strong>', `While your Siren pickup sounds (${C.sirenPickup.time} s), any car whose package or bumper damages you is arrested.`],
    ['An evil car that attacks you', `With your social standing over ${pct(S.protectFrom)} (Good), an evil driver whose package or bumper damages you with a police car watching is arrested.`],
    ['A car blocking an ambulance', `Traffic gets the same ${E.giveWay} s to clear an ambulance's lane as you do; ${pct(E.defiance)} of evil drivers refuse, and are taken away.`],
  ])}
</section>`;
