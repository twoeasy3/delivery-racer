// ---- garage: the car shop, a 3D parking lot with a garage behind it ---------------------
// Every car in CARS is parked in a bay (the Blue Star ones once they are open: see garageCars; the amphibious ones
// from the start, in a section of their own at the end of the tiers: see buildLot). Tap any car, owned or not, to see its stats; the button under them
// uses it, or buys it (hovering shows the price). The Good / Evil toggle swaps every car to its
// other livery: buying a car buys both.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CAR, carInUse, selectCar, stars, starColour, STAR_COLOURS, blueStarsOpen, garageCars, restrictedTier, setViewSide, carAllowedOn } from '../cars.js';
import { Tiers, tierStarsNode } from '../tiers.js';
import { Progress } from '../progress.js';
import { Game } from '../game.js';
import { renderer } from './scene.js';
import { makeCarMesh, shapeCarMesh, makeTankMesh } from './cars.js';
import { MODELS } from './models.js';
import { makeIdeaModel } from './ideaModels.js';
import { makeUfo } from './carExtras.js';
import { GarageView, arrange, mountGarageView } from './garageview.js';
import { showComparison } from './compare.js';
import { IdeasLot } from './ideaslot.js';
import { ask, tell } from './dialog.js';

// The lot: three rows of bays, a long covered garage along the back, the cars parked strictly column by
// column in order of their stars and price, cheapest first (one with no stars, the Tank, last), and in
// each column the smallest at the front and the biggest at the back, under the roof. It runs off to the right as far as the cars do, and is scrolled
// side to side (a drag or swipe, the wheel, the arrow keys): the camera frames the three rows to the
// screen's height, so on a phone held upright each car is big, and a few columns show at a time
const ROWS = 3, BAY_W = 3.9, BAY_D = 6.6;
const ROW_Z = [7.6, 0.6, -6.4];      // centre lines of the rows, front to back (the back row under the roof)
// what a car idea in use shows in place of stars: it has no tier (here, and on the start screen's car card)
export const IDEA_TAG = { text: 'Idea', colour: '#9fc0ee' };
// a car's name and its stars, in their colour (gold or blue), as nodes to put in a line of text
// (a car with no tier has no stars: the Tank, the City Bus; and a car idea, ideas.js, says "Idea" where they would be)
export const withStars = (car) => {
  if (!car.tier && !car.idea) return [car.name];
  const span = document.createElement('span');
  span.textContent = car.tier ? stars(car) : IDEA_TAG.text;
  span.style.color = car.tier ? starColour(car) : IDEA_TAG.colour;
  return [car.name + ' ', span];
};
const bulk = (car) => car.hw * car.hl * car.height; // how big a car is, to park the bigger ones further back
// (and the amphibious cars after every tier, a section of their own: see buildLot)
const rank = (car) => car.amphibious ? 50 + car.tier : (car.tier || 99) + (car.blue ? 0.5 : 0); // (a tier's Blue Star cars park after its gold ones)
// (the lot is built for the cars on show: it grows when the Blue Star cars arrive. See buildLot)
let order = [], COLS = 0, LOT_W = 0, parked = [], built = null;
const onShow = () => garageCars().length; // (what the lot was built for: it only ever grows)
const colX = (col) => col * BAY_W;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b3342);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f4a, 1.5));
const lamp = new THREE.DirectionalLight(0xfff1d6, 1.3);
lamp.position.set(12, 30, 18);
scene.add(lamp);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 300);

const lot = new THREE.Group(); // everything built for the cars on show (the lot, the building, the cars)
scene.add(lot);
const box = (material, w, h, d, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  lot.add(mesh);
  return mesh;
};
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
// a canvas texture with text on it
const label = (text, w, h, size, colour = '#ffd23f', ground = '#20242c') => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colour;
  ctx.font = 'bold ' + size + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + size * 0.06, w * 0.92);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
};

// ---- the lot and the building, and the cars parked in it: built afresh when the cars on show change ----
const buildLot = () => {
  built = onShow();
  lot.clear();
  // (sorted and filtered by the bar's Sort and Show buttons: see render/garageview.js)
  const sorted = arrange(garageCars().sort((a, b) => rank(a) - rank(b) || a.price - b.price));
  order = [];
  // (parked as usual, the amphibious cars are a section: columns of their own, the bays left over in the column
  // before them and in their last one standing empty (null in `order`), on a slipway under a sign of their own.
  // Sorted some other way they park among the rest; Show: Amphibious parks them alone)
  const sections = [];
  for (const car of sorted) {
    const last = sections[sections.length - 1];
    if (!last || (GarageView.usual && !!last[0].amphibious !== !!car.amphibious)) sections.push([car]);
    else last.push(car);
  }
  const slipways = []; // [first column, columns] of each amphibious section
  const slipX = (from, cols) => colX(from) + (cols - 1) * BAY_W / 2, slipW = (cols) => Math.max(9, cols * BAY_W - 0.6); // (its middle, and its sign's width)
  sections.forEach((cars, k) => {
    const from = order.length / ROWS;
    for (let i = 0; i < cars.length; i += ROWS) order.push(...cars.slice(i, i + ROWS).sort((a, b) => GarageView.usual ? bulk(a) - bulk(b) : 0)); // (in each column, the biggest at the back; sorted some other way, strictly in that order)
    if (k < sections.length - 1) while (order.length % ROWS) order.push(null);
    if (GarageView.usual && cars[0].amphibious) slipways.push([from, Math.ceil(cars.length / ROWS)]);
  });
  COLS = Math.ceil(order.length / ROWS);
  LOT_W = COLS * BAY_W;
  const mid = (LOT_W - BAY_W) / 2, left = -BAY_W / 2, right = LOT_W - BAY_W / 2;
  box(lambert(0x5b6068), LOT_W + 80, 0.2, 60, mid, -0.1, 2);                    // tarmac
  box(lambert(0x747a84), LOT_W + 3, 0.04, BAY_D + 1.5, mid, 0.02, ROW_Z[2]);    // garage floor
  const paint = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  for (const z of ROW_Z) {
    for (let i = 0; i <= COLS; i++) box(paint, 0.14, 0.02, BAY_D, left + i * BAY_W, 0.05, z); // lines between the bays
    box(paint, LOT_W, 0.02, 0.14, mid, 0.05, z - BAY_D / 2);                                  // and behind them
  }
  // the garage: a back wall, end walls, a roof on pillars over the back row, signs along its front
  const wall = lambert(0x596170), roof = lambert(0x3f4654), trim = lambert(0xffd23f);
  const backZ = ROW_Z[2] - BAY_D / 2 - 0.6, frontZ = ROW_Z[2] + BAY_D / 2 + 0.6, H = 5.2;
  box(wall, LOT_W + 4, H, 0.5, mid, H / 2, backZ);
  for (const x of [left - 1.8, right + 1.8]) box(wall, 0.5, H, frontZ - backZ, x, H / 2, (frontZ + backZ) / 2);
  box(roof, LOT_W + 5, 0.5, frontZ - backZ + 1.6, mid, H + 0.25, (frontZ + backZ) / 2);
  for (let i = 0; i <= COLS; i += 2) box(wall, 0.4, H, 0.4, left + i * BAY_W, H / 2, frontZ);
  box(trim, LOT_W + 5, 0.5, 0.3, mid, H + 0.25, frontZ + 0.8);
  const garageSign = label('GARAGE', 512, 96, 64);
  for (let x = mid - Math.floor(COLS / 8) * 8 * BAY_W / 2; x <= right; x += 8 * BAY_W) { // (one every eight bays)
    if (slipways.some(([from, cols]) => Math.abs(x - slipX(from, cols)) < 6.5 + slipW(cols) / 2)) continue; // (the Amphibious section's own sign is there)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.25), new THREE.MeshBasicMaterial({ map: garageSign }));
    sign.position.set(x, H + 1.9, frontZ + 0.8);
    lot.add(sign);
  }
  // the Amphibious section: its bays a slipway's wet blue, a sign for it on the roof over them
  for (const [from, cols] of slipways) {
    const x = slipX(from, cols);
    box(lambert(0x2f7f9a), cols * BAY_W - 0.14, 0.03, ROW_Z[0] - ROW_Z[2] + BAY_D - 0.14, x, 0.035, (ROW_Z[0] + ROW_Z[2]) / 2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(slipW(cols), 2.25),
      new THREE.MeshBasicMaterial({ map: label('AMPHIBIOUS', 512, 96, 60, STAR_COLOURS.amphibious, '#12323a') }));
    sign.position.set(x, H + 1.9, frontZ + 0.8);
    lot.add(sign);
  }
  parked = order.map(parkCar).filter(Boolean);
};

// ---- a car on show: its own model, and its paint for a side (the lot's cars, and the start screen's car card:
// render/menustage.js). Whoever makes one adds it to a scene of their own: makeCarMesh puts it in the game's
export const makeShowCar = (car) => {
  if (car.idea) return makeIdeaModel(car); // (a car idea in use: its own model, ideas.js; one with none throws below, and the card shows no picture)
  const mesh = car.tank ? makeTankMesh(car.color) : car.ufo ? makeUfo() : car.model ? MODELS[car.model](car) : makeCarMesh(car.color); // (ufo: the earned Saucer)
  if (!car.tank && !car.ufo && !car.model) shapeCarMesh(mesh, car);
  return mesh;
};
export const paintShowCar = (mesh, car, evil) => {
  mesh.userData.body?.material.color.setHex((evil ? car.evilColor : car.color) ?? car.color); // (a level's own vehicle may have one paint, or no body to paint)
  mesh.userData.livery?.(evil);
};

// ---- a car, parked in its bay: column by column --------------------------------------------------
const parkCar = (car, i) => {
  if (!car) return null; // (a bay left empty: see buildLot)
  const mesh = makeShowCar(car);
  mesh.position.set(colX(Math.floor(i / ROWS)), car.ufo ? 1 : 0, ROW_Z[i % ROWS]); // (a saucer hovers)
  mesh.userData.car = car;
  lot.add(mesh); // (moves it out of the game's scene, where makeCarMesh put it)
  // a "for sale" marker floating over cars that aren't owned yet
  const tag = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  tag.position.y = car.height + 1.5;
  mesh.add(tag);
  mesh.userData.tag = tag;
  // its stars, painted on the tarmac at the front of its bay
  if (car.tier) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), new THREE.MeshBasicMaterial({ map: label(stars(car), 256, 84, 60, starColour(car), '#3f444c') }));
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(mesh.position.x, 0.06, mesh.position.z + BAY_D / 2 - 0.55);
    lot.add(plate);
  }
  return mesh;
};
// a glowing ring under the car in use, and a white one under the car being looked at (tapped: its stats shown,
// to use or buy it from the button below them)
const ringOf = (color) => {
  const r = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 40), new THREE.MeshBasicMaterial({ color }));
  r.rotation.x = Math.PI / 2;
  r.position.y = 0.12;
  scene.add(r);
  return r;
};
const ring = ringOf(0xffd23f), lookRing = ringOf(0xffffff);
let looking = null; // the car whose stats are shown (null: the one in use)
// the garage's own lot is the one on show (not its "Car ideas" tab, which has its own: see render/ideaslot.js)
const onLot = () => Garage.isOpen && !IdeasLot.on;

// ---- interface ---------------------------------------------------------------------------------
const ui = document.getElementById('garageUi');
const tip = document.getElementById('garageTip');
const info = document.getElementById('garageInfo');
const bank = document.getElementById('garageBank');
const liveryBtn = document.getElementById('liveryBtn'); // (a Good / Evil pair of buttons: see index.html)
const sideBtns = [...liveryBtn.querySelectorAll('button')];
const action = document.getElementById('garageAction');
const ruleBanner = document.getElementById('garageRule');
const whyEl = document.getElementById('garageWhy');
const useBtn = document.getElementById('garageUse');
const startScreen = document.getElementById('startScreen');
const money = (amount) => '$' + amount.toFixed(2);
const stats = (car) => 'Top speed ' + Math.round(car.maxSpeed * 3.6) + ' km/h  |  Acceleration ' +
  car.accel + '  |  Health ' + car.health + '  |  Crossing ' + Math.round((car.crossing ?? CONFIG.railCrossing.usual) * 100) + '%' +
    (car.perk ? '  |  ' + car.perk : ''); // (a perk of its own: see CARS' trait)

let hovered = null; // the parked car mesh under the pointer
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const carAt = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(parked, true)[0];
  let object = hit && hit.object;
  while (object && !object.userData.car) object = object.parent;
  return object || null;
};

const refresh = () => {
  GarageView.refreshControls?.(); // (a Show choice that parks no car is not offered: money and purchases change that)
  // (a secret vehicle in use has no bay, so no ring; nor has a car idea in this lot: its ring is in the Car ideas lot's)
  const inUse = carInUse();
  // (a level that restricts the car, tiers.js: the lot shows only the cars of its tier, and the bar says so)
  bank.replaceChildren('Bank ' + money(Progress.data.money));
  // (the level's car rule on the side on show, said once above the lot: the side and the reason)
  const sideNow = Garage.evil, sideWord = sideNow ? 'Evil' : 'Good', ruleNow = restrictedTier(sideNow) ?? null, ruleOther = restrictedTier(!sideNow) ?? null;
  ruleBanner.classList.toggle('hidden', ruleNow === null && ruleOther === null);
  ruleBanner.classList.toggle('restricted', ruleNow !== null);
  const chip = document.createElement('span');
  chip.className = 'rulechip';
  chip.replaceChildren(...(ruleNow !== null
    ? [sideWord + ': only ', tierStarsNode(ruleNow), ' cars until you earn this level’s ' + sideWord + ' medal']
    : [sideWord + ': any car (medal earned)']));
  ruleBanner.replaceChildren(chip);
  for (const b of sideBtns) { const on = (b.dataset.side === 'evil') === Garage.evil; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  const shown = looking || inUse, owned = Progress.owns(shown.id);
  const needs = restrictedTier(Garage.evil) ?? null;
  const notAllowed = !IdeasLot.on && (shown.silhouette || (owned && !carAllowedOn(shown, Garage.evil)));
  const reasonNode = () => needs !== null ? ['Not allowed on this level: needs ', tierStarsNode(needs)] : ['Not allowed on this level'];
  const badge = document.createElement('span');
  badge.className = 'notallowed';
  badge.replaceChildren(...(shown.silhouette ? ['No car of this tier owned: buy one in the lot'] : reasonNode()));
  info.replaceChildren(...withStars(shown), ...(notAllowed && !shown.silhouette ? [' - ', badge] : []), '  -  ' + stats(shown));
  showComparison(inUse, shown); // (the car in use against the one looked at: see render/compare.js)
  // the button under the stats: what can be done with the car shown
  // (the car in use, looked at in the other side's livery: the button takes that side)
  const otherSide = shown === inUse && Garage.evil !== Game.evil;
  action.textContent = shown === inUse && !otherSide ? 'In use' : owned ? 'Switch'
    : Progress.data.money >= shown.price ? 'Buy for ' + money(shown.price) : 'Need ' + money(shown.price);
  action.disabled = (shown === inUse && !otherSide) || (!owned && Progress.data.money < shown.price);
  // (the level's car rule on the side on show: a car not allowed there cannot be used, and "Use" is off with it)
  const barred = shown.silhouette || (owned && !IdeasLot.on && !carAllowedOn(shown, Garage.evil));
  if (barred) { action.textContent = shown.silhouette ? 'Buy a car in the lot' : 'Not allowed here'; action.disabled = true; }
  useBtn.disabled = !!barred;
  whyEl.classList.toggle('hidden', !barred);
  whyEl.replaceChildren(...(barred ? (shown.silhouette ? ['No car of this tier owned: tap a car in the lot to buy one'] : reasonNode()) : []));
  action.title = owned ? 'Drive the ' + shown.name + ' as ' + sideName() + ', and stay in the garage' : '';
  // (Use: the same, and back to the menu with it; a car not yet bought has none, only its Buy)
  useBtn.style.display = owned ? '' : 'none';
  useBtn.title = 'Drive the ' + shown.name + ' as ' + sideName() + ', and go back to the menu';
  ring.visible = parked.some(mesh => mesh.userData.car === inUse);
  lookRing.visible = !!looking && looking !== inUse;
  for (const mesh of parked) {
    const car = mesh.userData.car;
    paintShowCar(mesh, car, Garage.evil);
    mesh.userData.tag.visible = !Progress.owns(car.id);
    if (car === inUse) ring.position.set(mesh.position.x, 0.12, mesh.position.z);
    if (car === looking) lookRing.position.set(mesh.position.x, 0.12, mesh.position.z);
  }
  if (IdeasLot.on) IdeasLot.refresh(); // (the "Car ideas" tab: its own words, and its ideas in the livery on show)
};

// the band of the screen the lot is drawn in: under the bar, over the words and buttons at the bottom. What is in
// the flow of the bottom block counts (the comparison card of a wide screen floats at its corner and does not). Measured
// again whenever either block changes size (the stats opened, the bar wrapping, a turn of the phone)
const barEl = ui.querySelector('.bar'), pickEl = ui.querySelector('.pick');
let measured = { top: 0, bottom: 0 }; // px from the top of the screen: the bar's foot, the block's head
const measure = () => {
  if (!Garage.isOpen) return;
  const H = renderer.domElement.clientHeight;
  let bottom = H;
  for (const child of pickEl.children) {
    if (child.style.display === 'none' || getComputedStyle(child).position === 'fixed') continue;
    const r = child.getBoundingClientRect();
    if (r.height > 0) bottom = Math.min(bottom, r.top);
  }
  measured = { top: Math.max(0, barEl.getBoundingClientRect().bottom + 4), bottom: Math.max(0, bottom - 4) };
};
const bandOf = (H) => {
  let { top, bottom } = measured;
  if (!bottom || bottom > H) bottom = H;
  const min = Math.max(120, H * 0.38); // (never squeezed to nothing: a very short screen keeps its lot, and the words go over its foot)
  if (bottom - top < min) bottom = Math.min(H, top + min);
  return { top, height: bottom - top };
};
if (window.ResizeObserver) { const watch = new ResizeObserver(measure); watch.observe(barEl); watch.observe(pickEl); watch.observe(document.documentElement); }
window.addEventListener('resize', measure);

// a car tapped: its stats shown, with the button to use it, or to buy it (locked or not, any car can be looked at)
const pick = (mesh) => {
  looking = mesh.userData.car;
  refresh();
};
// Buying is asked in the game's own sheet (render/dialog.js), never the browser's: the car, its price, the bank,
// and what is left after. Not enough money is said in the same sheet (the button already says "Need $..."; this is
// for a click that gets through anyway, as a bank that changed after the sheet was drawn); a purchase that
// fails (Progress.buy throws, or the car is not owned after it) is said there too.
const buy = async (car) => {
  const have = Progress.data.money;
  if (have < car.price) {
    await tell({ title: 'Not enough money', ok: 'OK', lines: [
      'The ' + car.name + ' costs ' + money(car.price) + ' and you have ' + money(have) + '.',
      'You need ' + money(car.price - have) + ' more.'] });
    return false;
  }
  const yes = await ask({ title: 'Buy the ' + car.name + '?', ok: 'Buy for ' + money(car.price), cancel: 'Cancel', lines: [
    'Price ' + money(car.price) + '. You have ' + money(have) + ', and ' + money(have - car.price) + ' is left.',
    'You get both liveries, Good and Evil.'] });
  if (!yes) return false;
  let bought = false;
  try { bought = Progress.buy(car) && Progress.owns(car.id); } catch { /* (said below) */ }
  if (!bought) {
    await tell({ title: 'Could not buy it', lines: ['The ' + car.name + ' was not bought, and no money was taken.'] });
    return false;
  }
  return true;
};
// the button under the stats: "Switch" (to the car looked at, and its side; stays in the garage) or "Buy"; and
// "Use" beside it (the same, then back to the menu)
const take = async (leave) => {
  // (on the Car ideas tab the button is that lot's "Drive it": the idea looked at there. It is free and always
  // open, so there is nothing to buy; it becomes the car in use just as a garage car does)
  const car = IdeasLot.on ? IdeasLot.looking : looking || CAR;
  if (!car) return;
  if (!carAllowedOn(car, Garage.evil)) { refresh(); return; } // (the level's car rule, on the side on show: guarded here, not only by the lot)
  const same = car.id === carInUse().id && Garage.evil === Game.evil;
  if (same && !leave) return;
  if (!same) {
    if (!Progress.owns(car.id) && !await buy(car)) { refresh(); return; }
    if (car.id !== carInUse().id) selectCar(car.id);
    takeSide();
    if (GarageView.settle()) GarageView.rebuild(); // (the choice in Show has no cars left: back to All)
  }
  refresh();
  if (leave) Garage.close(); // (to the menu: the car and its side go with it, as the garage's Back does)
};
// (on a phone the stats are one line, cut short, until the line is tapped: then all of them, below the lot, never over it)
info.addEventListener('click', () => info.classList.toggle('open'));
action.addEventListener('click', () => take(false));
useBtn.addEventListener('click', () => take(true));
// The side goes with the car: a car picked while the garage shows its Evil livery is driven as Evil, and one
// picked in its Good livery as Good (remembered, as the menu's own Good / Evil button is: see render/menu.js)
const sideName = () => Garage.evil ? 'Evil' : 'Good';
const takeSide = () => {
  if (Game.evil === Garage.evil) return;
  Game.evil = Garage.evil;
  Progress.data.evil = Garage.evil;
  Progress.save();
};

// ---- scrolling side to side ---------------------------------------------------------------------
// The camera's x: dragged (a mouse or a finger), flung on a little by the speed of a swipe, and nudged by
// the wheel and the arrow keys; never past the first column or the last
let scrollX = 0, fling = 0, drag = null, dragged = false; // drag: { x (the pointer's last x), moved (px in all), t }
const view = { width: 1 }; // m of lot across the screen at the cars (see render)
// (the view's edges kept to the lot, a little over; a lot narrower than the screen sits in the middle of it)
const clampScroll = (x) => {
  const lo = -BAY_W / 2 - 1 + view.width / 2, hi = LOT_W - BAY_W / 2 + 1 - view.width / 2;
  return lo > hi ? (LOT_W - BAY_W) / 2 : Math.max(lo, Math.min(hi, x));
};
const scrollTo = (car) => { const i = order.indexOf(car); if (i >= 0) scrollX = clampScroll(colX(Math.floor(i / ROWS))); };
const perPixel = () => view.width / Math.max(1, renderer.domElement.clientWidth);
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!onLot()) return;
  drag = { x: event.clientX, moved: 0, t: performance.now() };
  fling = 0;
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!onLot()) return;
  if (drag) {
    const dx = event.clientX - drag.x, now = performance.now();
    drag.moved += Math.abs(dx);
    scrollX = clampScroll(scrollX - dx * perPixel());
    fling = -dx * perPixel() / Math.max(0.008, (now - drag.t) / 1000); // (m/s, for the fling as it lets go)
    drag.x = event.clientX;
    drag.t = now;
  }
  hovered = drag && drag.moved > 8 ? null : carAt(event);
  renderer.domElement.style.cursor = hovered ? 'pointer' : drag && drag.moved > 8 ? 'grabbing' : '';
});
const letGo = () => {
  if (drag && performance.now() - drag.t > 80) fling = 0; // (held still before letting go: no fling)
  dragged = !!drag && drag.moved > 8;
  drag = null;
};
renderer.domElement.addEventListener('pointerup', letGo);
renderer.domElement.addEventListener('pointercancel', letGo);
renderer.domElement.addEventListener('wheel', (event) => {
  if (!onLot()) return;
  scrollX = clampScroll(scrollX + (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * perPixel());
  fling = 0;
}, { passive: true });
window.addEventListener('keydown', (event) => {
  if (!onLot() || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
  scrollX = clampScroll(scrollX + (event.key === 'ArrowRight' ? 1 : -1) * BAY_W);
  fling = 0;
});
renderer.domElement.addEventListener('click', (event) => {
  if (!onLot()) return;
  if (dragged) { dragged = false; return; } // (the end of a drag is no click)
  const mesh = carAt(event);
  if (mesh) pick(mesh); // (on touch there is no hover: the purchase prompt states the price)
});

// The side on show changes the car rule (a level's medal is a side's): the lot is filtered again for the side now picked
for (const b of sideBtns) b.addEventListener('click', () => Garage.setSide(b.dataset.side === 'evil'));
// the bar's Sort and Show buttons: the lot built again, from its first column (a car looked at that is no longer
// parked is let go)
mountGarageView(() => garageCars(), () => {
  buildLot();
  if (!order.includes(looking)) looking = null;
  scrollX = clampScroll(0);
  fling = 0;
  hovered = null;
  refresh();
});
// the "Garage" and "Car ideas" tabs: the second lot is render/ideaslot.js's
// (inUse: the id of the car in use; side: true when Evil is the side being played)
IdeasLot.mount({ barred: () => { const t = restrictedTier(Garage.evil) ?? null; return t === null ? null : t; }, evil: () => Garage.evil, back: refresh, inUse: () => Progress.data.car, side: () => Game.evil });
document.getElementById('garageBackBtn').addEventListener('click', () => Garage.close());

const anchor = new THREE.Vector3();
let carAtOpen = CAR; // the car in use when the garage was opened
let sideAtOpen = false; // (and the side being played then)
export const Garage = {
  isOpen: false,
  evil: false, // which livery is on show

  // the side on show: the livery, and the car rule of the level on that side (a medal is a side's), so the lot, the
  // car in use and the buttons are those of the side picked. Returns true when the lot was built again
  setSide(evil, fresh = false) {
    this.evil = !!evil;
    setViewSide(this.evil);
    const only = restrictedTier() ?? null;
    const retiered = GarageView.restrictTier !== only;
    GarageView.restrictTier = only;
    const emptied = GarageView.settle(); // (the Show choice may have fallen empty since: back to All)
    const rebuilt = built !== onShow() || retiered || emptied;
    if (rebuilt) buildLot(); // (the lot filtered to the tier the level allows) (first time in, or the Blue Star cars have just arrived, or a 6-star car has been earned)
    if (!fresh) {
      if (looking && !order.includes(looking)) looking = null; // (a car not in this side's lot is not looked at)
      if (rebuilt) { scrollTo(order.find(car => car && car.id === carInUse().id) || order[0]); fling = 0; hovered = null; }
      refresh();
    }
    return rebuilt;
  },
  open(evil = Game.evil) { // (evil: the livery to show the cars in; the side being played, unless told)
    this.setSide(evil, true);
    this.isOpen = true;
    carAtOpen = CAR;
    sideAtOpen = Game.evil;
    Game.inMenu = true; // Enter must not start a run from here
    ui.classList.remove('hidden');
    startScreen.classList.add('hidden');
    document.body.classList.add('in-garage');
    looking = null; // (the car in use's stats shown)
    IdeasLot.leave(); // (the garage always opens on its own lot)
    // (the car in use in view. One with no bay here, a car idea or the City Bus, is not in `order`, and the search
    // then runs on into the bays left empty, which are null: the first column)
    scrollTo(order.find(car => car && car.id === Progress.data.car) || order[0]);
    fling = 0;
    refresh();
    measure();
  },
  close() {
    setViewSide(null); // (the car rule goes by the side being played again)
    // a different car: tell the rest of the game (the player gets into it when a run starts)
    window.dispatchEvent(new Event('carchange')); // (always: the side on show may have put the car in use under another rule than the one being played; the menu draws itself again)
    this.isOpen = false;
    IdeasLot.leave();
    Game.inMenu = false;
    hovered = null;
    ui.classList.add('hidden');
    tip.style.display = 'none';
    startScreen.classList.remove('hidden');
    document.body.classList.remove('in-garage');
    renderer.domElement.style.cursor = '';
  },
  // for testing: the tab to show ('ideas': the Car ideas lot; anything else: the garage's own)
  tab(name) {
    if (name === 'ideas') IdeasLot.enter();
    else if (IdeasLot.on) { IdeasLot.leave(); refresh(); }
  },
  // for testing: look at the car with this id, as if it had been tapped (its stats, and the comparison card)
  look(carId) {
    if (IdeasLot.on) return IdeasLot.look(carId);
    const mesh = parked.find(m => m.userData.car.id === carId);
    if (mesh) { pick(mesh); scrollTo(mesh.userData.car); }
  },
  // for testing: show the tooltip of the car with this id as if the pointer were on it
  hover(carId) {
    if (IdeasLot.on) return IdeasLot.hover(carId);
    hovered = parked.find(mesh => mesh.userData.car.id === carId) || null;
  },
  render(now) {
    if (IdeasLot.on) return IdeasLot.render(now); // (the Car ideas tab draws its own lot)
    const canvas = renderer.domElement;
    // (the lot is drawn in the band between the bar and the words and buttons under it, never behind them: the
    // camera's view is offset so that the rows are framed to the band, not to the screen's whole height)
    const W = canvas.clientWidth, H = canvas.clientHeight, band = bandOf(H);
    const aspect = W / band.height;
    if (band.top || band.height < H) camera.setViewOffset(W, band.height, 0, -band.top, W, H); else camera.clearViewOffset();
    // (the three rows framed to the screen's height, whatever its shape: a wider screen just shows more columns)
    const back = 1;
    const dt = Math.min(0.05, (now - (Garage.last || now)) / 1000);
    Garage.last = now;
    if (!drag && Math.abs(fling) > 0.05) { scrollX = clampScroll(scrollX + fling * dt); fling *= Math.pow(0.04, dt); }
    scrollX = clampScroll(scrollX); // (and kept in, should the screen change shape)
    camera.aspect = aspect;
    camera.position.set(scrollX, 20 * back, 27 * back);
    camera.lookAt(scrollX, 0, 0.5);
    camera.updateProjectionMatrix();
    // (measured across the front of the front row, the nearest the camera and so the narrowest: the end cars
    // there must fit, or the lot scrolls)
    const front = new THREE.Vector3(scrollX, 0, ROW_Z[0] + BAY_D / 2).sub(camera.position);
    const depth = front.dot(camera.getWorldDirection(new THREE.Vector3()));
    view.width = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect;

    for (const mesh of parked) {
      mesh.userData.tag.rotation.y = now / 500;
      if (mesh.userData.animate) mesh.userData.animate(now / 1000); // animated models keep moving while parked
      mesh.position.y = mesh === hovered ? 0.25 : 0; // the hovered car lifts a little
    }

    if (hovered) {
      const car = hovered.userData.car, owned = Progress.owns(car.id);
      tip.replaceChildren(...withStars(car), '  -  ' + (
        car.id === Progress.data.car ? 'in use'
          : owned ? 'owned, click for its stats'
            : money(car.price) + ', click for its stats'));
      anchor.set(hovered.position.x, car.height + 2.6, hovered.position.z).project(camera);
      tip.style.left = (anchor.x + 1) / 2 * canvas.clientWidth + 'px';
      tip.style.top = (1 - anchor.y) / 2 * canvas.clientHeight + 'px';
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
    renderer.render(scene, camera);
  },
};
