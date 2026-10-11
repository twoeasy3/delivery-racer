// ---- the garage's "Car ideas" lot ---------------------------------------------------------------------
// A second parking lot, behind the garage's "Car ideas" tab: the ideas of ideas.js (IDEA_CARS), each
// parked in a bay with its name painted in front of it, to look at, judge and try. They are not garage cars
// yet (no tier, no price: free and always open, with placeholder figures), but one tapped can be driven: the
// button under the words reads "Drive it" ("Drive it as Evil" in the Evil livery), and makes it the car in
// use as the garage's own button does (the click is the garage's: render/garage.js). A gold ring marks the one
// in use. Hovering one (or tapping it) shows its name, the real vehicle it is based on, its size and a line about it; the garage's
// Livery button shows them in their Good or Evil paint. The lot scrolls side to side as the garage's does.
// The garage (render/garage.js) hands over to this while the tab is on: its drawing, its look() and hover().
//   ?garage&tab=ideas               opens the garage on this tab; &look=<id> looks at one, &hover=<id> shows its tip
//   ?garage&tab=ideas&studio=<ids>  for pictures: those ideas alone on a plain floor (ids with commas between, or
//                                   "all"), a row each: from the front and one side, and from the back and the
//                                   other. &views=3 adds a side view; ?garage=evil shows the Evil paint
import * as THREE from 'three';
import '../menus.css';
import { IDEA_CARS } from '../ideas.js';
import { tierStarsNode } from '../tiers.js';
import { renderer } from './scene.js';
import { makeIdeaModel } from './ideaModels.js';

// The lot: three rows of ten bays. The ten longest park in the back row, whose bays are deep enough for a bus;
// the ten shortest in the front; each row otherwise in the order of the list
const COLS = 10, BAY_W = 4.6;
const ROWS = [{ z: 9, depth: 6.6 }, { z: 2.4, depth: 6.6 }, { z: -6.9, depth: 12 }]; // front to back
const LOT_W = COLS * BAY_W, FRONT = ROWS[0].z + ROWS[0].depth / 2, BACK = ROWS[2].z - ROWS[2].depth / 2;
const colX = (col) => col * BAY_W;
const metres = (v) => (Math.round(v * 10) / 10).toFixed(1);
const sizeOf = (car) => metres(car.hl * 2) + ' m long, ' + metres(car.hw * 2) + ' m wide, ' + metres(car.height) + ' m high';
// (one too wide for a lane is driven, and parked here, smaller than the real thing: ideas.js `real`, `scale`)
const size = (car) => car.real ? sizeOf(car.real) + ' (driven at ' + Math.round(car.scale * 100) + '% of that, to fit a lane)' : sizeOf(car);
// its placeholder figures, as the garage's line of stats
const figures = (car) => 'Placeholder: ' + Math.round(car.maxSpeed * 3.6) + ' km/h  |  accel ' + car.accel +
  '  |  health ' + car.health + '  |  handling ' + Math.round((car.agility ?? 1) * 100) + '%  |  weight ' + Math.round((car.mass ?? 1) * 100) + '%  |  crossing ' + Math.round(car.crossing * 100) + '%';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x22304a);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f4a, 1.5));
const lamp = new THREE.DirectionalLight(0xfff1d6, 1.3);
lamp.position.set(12, 30, 18);
scene.add(lamp);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (material, w, h, d, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
};
// a canvas texture with text on it
const label = (text, w, h, px, colour, ground) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colour;
  ctx.font = 'bold ' + px + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + px * 0.06, w * 0.92);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
};
// (an idea with no model yet stands as a plain block of its size)
const block = (car) => {
  const group = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(car.hw * 2, car.height - 0.3, car.hl * 2), lambert(car.color));
  body.position.y = (car.height + 0.3) / 2;
  group.add(body);
  group.userData = { body, animate: () => {} };
  return group;
};
const model = (car) => {
  const mesh = makeIdeaModel(car) || block(car); // (as it is driven: see makeIdeaModel)
  mesh.userData.car = car;
  return mesh;
};
const paint = (mesh, evil) => {
  mesh.userData.body.material.color.setHex(evil ? mesh.userData.car.evilColor : mesh.userData.car.color);
  mesh.userData.livery?.(evil);
};

// ---- the lot, and the ideas parked in it: built the first time the tab is opened --------------------------
const parked = [];
const buildLot = () => {
  const byLength = [...IDEA_CARS].sort((a, b) => a.hl - b.hl);
  const rows = ROWS.map((row, r) => IDEA_CARS.filter(car => Math.floor(byLength.indexOf(car) / COLS) === r));
  const mid = (LOT_W - BAY_W) / 2, left = -BAY_W / 2;
  // a drawing board's blue for the ground, the bays ruled on it in white
  box(lambert(0x2f4f80), LOT_W + 120, 0.2, 90, mid, -0.1, 0);
  const line = new THREE.MeshBasicMaterial({ color: 0xdfe9f7 });
  for (const row of ROWS) {
    for (let i = 0; i <= COLS; i++) box(line, 0.14, 0.02, row.depth, left + i * BAY_W, 0.05, row.z);
    box(line, LOT_W, 0.02, 0.14, mid, 0.05, row.z - row.depth / 2);
  }
  // a hoarding along the back, and the lot's own sign standing on it (three of them, so one is always in view)
  const wallZ = BACK - 1.2, H = 3.2;
  box(lambert(0x3c5d92), LOT_W + 6, H, 0.4, mid, H / 2, wallZ);
  box(lambert(0xdfe9f7), LOT_W + 6, 0.25, 0.5, mid, H + 0.12, wallZ);
  const sign = label('CAR IDEAS', 512, 96, 64, '#ffd23f', '#16233a');
  const small = label('ideas to try: placeholder figures, no tier', 512, 56, 34, '#dfe9f7', '#16233a');
  for (const x of [mid - LOT_W / 3, mid, mid + LOT_W / 3]) {
    for (const side of [-1, 1]) box(lambert(0x16233a), 0.3, 3, 0.3, x + side * 5.4, H + 1.5, wallZ);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.25), new THREE.MeshBasicMaterial({ map: sign }));
    board.position.set(x, H + 3.6, wallZ + 0.2);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.3), new THREE.MeshBasicMaterial({ map: small }));
    under.position.set(x, H + 1.85, wallZ + 0.2);
    scene.add(board, under);
  }
  rows.forEach((cars, r) => cars.forEach((car, col) => {
    const mesh = model(car);
    mesh.position.set(colX(col), 0, ROWS[r].z - ROWS[r].depth / 2 + 0.9 + car.hl); // (its tail to the back of its bay)
    if (r < 2) mesh.position.z = ROWS[r].z;                                       // (the two front rows: in the middle of it)
    scene.add(mesh);
    parked.push(mesh);
    // its name, painted at the front of its bay
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 0.62), new THREE.MeshBasicMaterial({ map: label(car.name, 384, 60, 40, '#dfe9f7', '#27426c') }));
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(colX(col), 0.06, ROWS[r].z + ROWS[r].depth / 2 - 0.45);
    scene.add(plate);
  }));
};
const lookRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff }));
lookRing.rotation.x = Math.PI / 2;
lookRing.visible = false;
scene.add(lookRing);
// (and a gold one under the idea in use, as the garage's lot has under its car in use)
const useRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
useRing.rotation.x = Math.PI / 2;
useRing.visible = false;
scene.add(useRing);

// ---- the studio (?studio=<ids>): for pictures of the models alone ------------------------------------------
const params = new URLSearchParams(location.search);
let studio = null; // { scene, camera, width, height, meshes }
const buildStudio = (ids) => {
  const cars = (ids === 'all' ? IDEA_CARS : ids.split(',').map(id => IDEA_CARS.find(car => car.id === id))).filter(Boolean);
  const yaws = params.get('views') === '3' ? [0.65, -Math.PI / 2, Math.PI + 0.65] : params.get('views') === '1' ? [0.65] : [0.65, Math.PI + 0.65]; // (front and right; side on; back and left)
  const room = new THREE.Scene(), tilt = 0.4, sin = Math.sin(tilt), cos = Math.cos(tilt), meshes = [];
  room.background = new THREE.Color(0xdde3ea);
  room.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.6));
  const sun = new THREE.DirectionalLight(0xfff6e6, 1.4);
  sun.position.set(-8, 20, 14);
  room.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), lambert(0xc9d0d9));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const reach = (car) => Math.hypot(car.hl, car.hw) + 0.3; // (what it takes up on the floor, whichever way it is turned)
  const cell = Math.max(...cars.map(reach)) * 2;
  let v = 0; // (up the screen: the rows from the top down)
  cars.forEach((car) => {
    const r = reach(car), above = car.height * cos + r * sin + 0.25, below = r * sin + 0.1;
    v -= above;
    yaws.forEach((yaw, k) => {
      const mesh = model(car);
      mesh.position.set((k - (yaws.length - 1) / 2) * cell, 0, -v / sin);
      mesh.rotation.y = yaw;
      room.add(mesh);
      meshes.push(mesh);
    });
    v -= below;
  });
  const height = -v, width = cell * yaws.length, eye = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  const middle = new THREE.Vector3(0, 0, height / 2 / sin);
  eye.position.copy(middle).add(new THREE.Vector3(0, sin, cos).multiplyScalar(600));
  eye.lookAt(middle);
  studio = { scene: room, camera: eye, width, height, meshes };
};

// ---- interface ------------------------------------------------------------------------------------------
const tip = document.getElementById('garageTip');
const info = document.getElementById('garageInfo');
const action = document.getElementById('garageAction');
const tabs = { garage: document.getElementById('garageTabBtn'), ideas: document.getElementById('ideasTabBtn') };
const line = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
// what there is to say about an idea: its name, what it is based on, its size, and its line
const about = (car) => [line('strong', car.name), line('div', 'Based on: ' + car.basedOn), line('div', size(car)), line('div', car.note)];
// (under the lot, for the one looked at: its figures too)
const aboutToDrive = (car) => [...about(car), line('div', figures(car))];

let hovered = null, looking = null, host = null; // host: what the garage handed over (see mount)
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const carAt = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(parked, true)[0];
  let object = hit && hit.object;
  while (object && !object.userData.car) object = object.parent;
  return object || null;
};

// ---- scrolling side to side (as the garage's lot: a drag or swipe, the wheel, the arrow keys) -------------
let scrollX = 0, fling = 0, drag = null, dragged = false;
const view = { width: 1 }; // m of lot across the screen at the front row (see render)
const clampScroll = (x) => {
  const lo = -BAY_W / 2 - 1 + view.width / 2, hi = LOT_W - BAY_W / 2 + 1 - view.width / 2;
  return lo > hi ? (LOT_W - BAY_W) / 2 : Math.max(lo, Math.min(hi, x));
};
const perPixel = () => view.width / Math.max(1, renderer.domElement.clientWidth);
const live = () => IdeasLot.on && !studio;
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!live()) return;
  drag = { x: event.clientX, moved: 0, t: performance.now() };
  fling = 0;
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!live()) return;
  if (drag) {
    const dx = event.clientX - drag.x, now = performance.now();
    drag.moved += Math.abs(dx);
    scrollX = clampScroll(scrollX - dx * perPixel());
    fling = -dx * perPixel() / Math.max(0.008, (now - drag.t) / 1000);
    drag.x = event.clientX;
    drag.t = now;
  }
  hovered = drag && drag.moved > 8 ? null : carAt(event);
  renderer.domElement.style.cursor = hovered ? 'pointer' : drag && drag.moved > 8 ? 'grabbing' : '';
});
const letGo = () => {
  if (drag && performance.now() - drag.t > 80) fling = 0;
  dragged = !!drag && drag.moved > 8;
  drag = null;
};
renderer.domElement.addEventListener('pointerup', letGo);
renderer.domElement.addEventListener('pointercancel', letGo);
renderer.domElement.addEventListener('wheel', (event) => {
  if (!live()) return;
  scrollX = clampScroll(scrollX + (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * perPixel());
  fling = 0;
}, { passive: true });
window.addEventListener('keydown', (event) => {
  if (!live() || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
  scrollX = clampScroll(scrollX + (event.key === 'ArrowRight' ? 1 : -1) * BAY_W);
  fling = 0;
});
renderer.domElement.addEventListener('click', (event) => {
  if (!live()) return;
  if (dragged) { dragged = false; return; } // (the end of a drag is no click)
  const mesh = carAt(event);
  if (mesh) { looking = mesh.userData.car; IdeasLot.refresh(); }
});

const anchor = new THREE.Vector3();
export const IdeasLot = {
  on: false, // the "Car ideas" tab is the one showing
  get looking() { return looking; }, // the idea looked at (tapped), which the button drives; null: none

  // the garage's two tabs wired up. evil(): whether the garage's Livery button is on Evil; back(): the garage
  // writes its own words and button again; inUse(): the id of the car in use; side(): whether Evil is the side played
  mount({ evil, back, inUse, side, barred }) {
    host = { evil, back, inUse, side, barred };
    tabs.ideas.addEventListener('click', () => this.enter());
    tabs.garage.addEventListener('click', () => { if (this.on) { this.leave(); host.back(); } });
  },
  enter() {
    if (!parked.length) buildLot();
    if (params.get('studio') && !studio) buildStudio(params.get('studio'));
    this.on = true;
    looking = hovered = null;
    fling = 0;
    scrollX = clampScroll(0);
    document.body.classList.add('ideas-tab');
    document.body.classList.toggle('ideas-studio', !!studio);
    tabs.ideas.classList.add('on');
    tabs.garage.classList.remove('on');
    tip.classList.add('idea');
    this.refresh();
  },
  leave() {
    if (!this.on) return;
    this.on = false;
    hovered = null;
    document.body.classList.remove('ideas-tab', 'ideas-studio');
    tabs.garage.classList.add('on');
    tabs.ideas.classList.remove('on');
    tip.classList.remove('idea');
    tip.style.display = 'none';
    renderer.domElement.style.cursor = '';
  },
  // the words under the lot, the button that drives the idea looked at (the click is the garage's: see
  // render/garage.js), and every idea in the livery on show
  refresh() {
    const evil = host.evil(), inUse = host.inUse(), using = !!looking && looking.id === inUse;
    if (looking) info.replaceChildren(...aboutToDrive(looking));
    else info.replaceChildren(IDEA_CARS.length + ' ideas to try: free, with no tier and placeholder figures. Tap one to read about it and drive it.');
    // (as the garage's own button: the one in use, looked at in the other side's livery, takes that side)
    const otherSide = using && evil !== host.side();
    action.textContent = !looking ? 'Tap an idea to drive it' : using && !otherSide ? 'In use'
      : evil ? 'Drive it as Evil' : otherSide ? 'Drive it as Good' : 'Drive it';
    action.disabled = !looking || (using && !otherSide);
    // (a level that restricts the car, on the side on show: an idea has no tier, so it cannot be driven; said, not just greyed)
    const need = host.barred?.() ?? null, why = document.getElementById('garageWhy');
    if (need !== null && looking && !using) {
      action.disabled = true;
      action.textContent = 'Not allowed here';
      if (why) { why.classList.remove('hidden'); why.replaceChildren('Not allowed on this level: needs ', tierStarsNode(need)); }
    } else if (why) { why.classList.add('hidden'); why.replaceChildren(); }
    for (const mesh of [...parked, ...(studio ? studio.meshes : [])]) paint(mesh, evil);
    const mesh = parked.find(m => m.userData.car === looking), used = parked.find(m => m.userData.car.id === inUse);
    lookRing.visible = !!mesh && mesh !== used;
    if (mesh) lookRing.position.set(mesh.position.x, 0.12, mesh.position.z);
    useRing.visible = !!used;
    if (used) useRing.position.set(used.position.x, 0.12, used.position.z);
  },
  look(id) {
    const mesh = parked.find(m => m.userData.car.id === id);
    if (!mesh) return;
    looking = mesh.userData.car;
    scrollX = clampScroll(mesh.position.x);
    this.refresh();
  },
  hover(id) {
    hovered = parked.find(m => m.userData.car.id === id) || null;
    if (hovered) scrollX = clampScroll(hovered.position.x);
  },
  render(now) {
    const canvas = renderer.domElement, aspect = canvas.clientWidth / canvas.clientHeight;
    if (studio) { // (the whole sheet fitted to the screen, whatever its shape)
      const half = Math.max(studio.height / 2, studio.width / 2 / aspect);
      Object.assign(studio.camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
      studio.camera.updateProjectionMatrix();
      for (const mesh of studio.meshes) mesh.userData.animate?.(now / 1000);
      renderer.render(studio.scene, studio.camera);
      return;
    }
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (!drag && Math.abs(fling) > 0.05) { scrollX = clampScroll(scrollX + fling * dt); fling *= Math.pow(0.04, dt); }
    scrollX = clampScroll(scrollX);
    camera.aspect = aspect;
    camera.position.set(scrollX, 24, 32.5);
    camera.lookAt(scrollX, 0, -1.6);
    camera.updateProjectionMatrix();
    const front = new THREE.Vector3(scrollX, 0, FRONT).sub(camera.position);
    const depth = front.dot(camera.getWorldDirection(new THREE.Vector3()));
    view.width = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect;

    for (const mesh of parked) {
      mesh.userData.animate?.(now / 1000);
      mesh.position.y = mesh === hovered ? 0.25 : 0; // the hovered one lifts a little
    }
    if (hovered) {
      const car = hovered.userData.car;
      tip.replaceChildren(...about(car));
      anchor.set(hovered.position.x, car.height + 2.2, hovered.position.z).project(camera);
      const x = (anchor.x + 1) / 2 * canvas.clientWidth, halfTip = tip.offsetWidth / 2 + 6;
      tip.style.left = Math.max(halfTip, Math.min(canvas.clientWidth - halfTip, x)) + 'px'; // (kept on the screen)
      tip.style.top = Math.max(tip.offsetHeight + 6, (1 - anchor.y) / 2 * canvas.clientHeight) + 'px';
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
    renderer.render(scene, camera);
  },
};
