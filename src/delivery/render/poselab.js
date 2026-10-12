// ---- POSE LAB (a debug page, the ?poses= experiment: the owner, 12-Oct, "experiment with new poses for the blueprints") ----
// ?poselab shows real blueprint cards (render/blueprintcard.js, drawn by carstill.js as the pack reveal draws them) side
// by side: a row a car, a card a pose. The ORIGINAL three (top, low, front) come first in each row, then the poses
// asked for, so a still compares them at once. Loaded only with the address (main.js); nothing is saved.
//   ?poselab                        the original three and every candidate (carposes.js CANDIDATE_POSES)
//   ?poselab&poses=a                the original three and set a (or b, mixed, all, or a list: wide,rear)
//   &cars=bubble,limo,...           which cars (default: a short, a long, a tall one, the Rocket Fin Coupe, a truck)
//   &compact                        the compact card ("What's inside"), 4:3, instead of the reveal's
import { carById } from '../cars.js';
import { POSE_NAMES, CANDIDATE_POSES, posesFrom } from '../carposes.js';
import { blueprintCard } from './blueprintcard.js';
import { drawSoon } from './carstill.js';

const DEFAULT_CARS = ['bubble', 'limo', 'doubledecker', 'rocketfin', 'tipper', 'monster'];
const RARITIES = ['common', 'uncommon', 'epic', 'legendary', 'bespoke'];

const make = (tag, css, ...inside) => {
  const node = document.createElement(tag);
  if (css) node.style.cssText = css;
  node.append(...inside.filter(Boolean));
  return node;
};

export const openPoseLab = (params = new URLSearchParams(location.search)) => {
  const asked = posesFrom(params.get('poses')) || CANDIDATE_POSES;
  const poses = [...POSE_NAMES, ...asked.filter(p => !POSE_NAMES.includes(p))];
  const cars = (params.get('cars') || DEFAULT_CARS.join(',')).split(',').map(id => carById(id.trim())).filter(Boolean);
  const compact = params.has('compact');
  const width = Math.max(110, Math.min(190, Math.floor((window.innerWidth - 150) / poses.length) - 10));
  const lab = make('div', 'position:fixed;inset:0;z-index:100000;overflow:auto;background:#1b2330;color:#e8eef6;'
    + 'font:13px system-ui,sans-serif;padding:12px 16px;box-sizing:border-box');
  lab.className = 'pose-lab';
  const head = make('div', 'display:flex;gap:10px;margin:0 0 8px 120px');
  for (const p of poses) {
    head.append(make('div', `width:${width}px;flex:none;font-weight:700;text-align:center;`
      + (POSE_NAMES.includes(p) ? 'color:#9fb2c8' : 'color:#7ee2a8'), document.createTextNode(p + (POSE_NAMES.includes(p) ? ' (original)' : ''))));
  }
  lab.append(head);
  cars.forEach((car, row) => {
    const line = make('div', 'display:flex;gap:10px;align-items:flex-start;margin:0 0 10px');
    line.append(make('div', 'width:110px;flex:none;padding-top:30px;font-weight:700', document.createTextNode(car.name)));
    for (const pose of poses) {
      const rarity = RARITIES[row % RARITIES.length];
      const { node, pic } = blueprintCard(car, { rarity, n: 1 }, { compact, pose, chance: compact ? pose : null });
      line.append(make('div', `width:${width}px;flex:none`, node));
      drawSoon(pic, car, { side: 'good', pose });
    }
    lab.append(line);
  });
  document.body.append(lab);
  return lab;
};

if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('poselab')) setTimeout(() => openPoseLab(), 300);
