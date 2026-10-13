// A check that the one-stage event card's extras (the Car Hunt: the pack art and its What's inside, render/menustage.js
// eventExtras) take taps and clicks on the desktop layout (CHECKLIST 192: they did not, on a tablet or with a mouse). The
// stage draws its children at one z-index (menu2.css `.menu-stage > :not(.shot)`), and the extras come BEFORE .info in the
// stage while .info spans the card's whole width, so the extras need a z-index of their own above it; on a phone held upright
// they are in the flow and the level arrows sit over them, so there they must not rise above the arrows. Static: it reads
// the CSS and the stage's order, no browser (the hit-testing itself was seen in headless Chromium, see the CHECKLIST).
//   node scripts/.extras-hit-check.mjs
import { readFileSync } from 'node:fs';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const css = readFileSync('src/delivery/menu2.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const js = readFileSync('src/delivery/render/menustage.js', 'utf8');

// the top-level rules (outside any @media) and the phone-upright block
const top = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
const zOf = (text, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\>:]/g, '\\$&').replace(/ /g, '\\s*');
  const m = text.match(new RegExp('(?:^|[}\\s,])' + esc + '\\s*\\{([^}]*)\\}'));
  const z = m?.[1].match(/z-index:\s*(-?\d+)/);
  return z ? Number(z[1]) : null;
};
const children = zOf(top, '#startScreen .menu-stage > :not(.shot)');
const extras = zOf(top, '#startScreen .menu-stage > .card-extras');
check(children !== null, 'the stage gives its children a z-index (' + children + ')');
check(extras !== null && extras > children, 'the card extras are drawn above the rest of the stage, .info among them (' + extras + ' over ' + children + ')');

const order = js.match(/stage\.replaceChildren\(([^;]*)\);/)?.[1] || '';
check(order.indexOf('extras') >= 0 && order.indexOf('extras') < order.indexOf('info'), 'the stage puts the extras before .info (why they need their own z-index)');

const phone = css.match(/@media \(max-width: 760px\) and \(min-height: 521px\), \(max-width: 519px\) \{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)
  ?.find(block => block.includes('.card-extras'));
const phoneZ = phone ? zOf(phone, '#startScreen .menu-stage > .card-extras') : null;
check(phoneZ !== null && phoneZ <= children, 'a phone held upright: the extras, in the flow, stay at the stage\'s z-index, under the level arrows (' + phoneZ + ')');

console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
