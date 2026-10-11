// A check of the shared model views (src/delivery/render/modelviews.js), headless: with no WebGL to be had
// viewRenderer gives null and drawViews draws nothing (neither throws), and with a stand-in renderer each
// view on screen is rendered and copied into a canvas of its own, sized to its element, and one off screen
// is neither drawn nor moved. No picture is made: what the models look like is only seen in a browser.
//   node scripts/.modelviews-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const THREE = await import('three');
  const { viewRenderer, drawViews, standView } = await g.load('render/modelviews.js');
  const warn = console.warn;
  console.warn = () => {};

  // ---- no renderer to be had
  let renderer = 'threw';
  try { renderer = viewRenderer(); } catch { /* (the failure) */ }
  check(renderer === null, 'no document.createElement at all: viewRenderer gives null, and does not throw');
  document.createElement = () => ({ style: {}, getContext: () => null, addEventListener() {}, removeEventListener() {} });
  renderer = 'threw';
  try { renderer = viewRenderer(); } catch { /* (the failure) */ }
  check(renderer === null, 'a canvas that gives no WebGL context: null again');
  console.warn = warn;
  let stepped = 0;
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  const view = (box) => {
    const model = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshBasicMaterial());
    const v = { el: { getBoundingClientRect: () => box, append(node) { this.child = node; } }, ...standView({ model, tick: () => {} }) };
    const step = v.step;
    v.step = (t, dt) => { stepped++; step(t, dt); };
    return v;
  };
  check(drawViews(null, [view(rect(0, 0, 100, 50))], 0, 0) === false && stepped === 0, 'drawViews with no renderer: false, nothing moved, no throw');

  // ---- a stand-in renderer: what is drawn, and where it is copied from
  window.innerWidth = 800; window.innerHeight = 600; window.devicePixelRatio = 2;
  const drawn = [];
  document.createElement = () => ({ style: {}, width: 0, height: 0, getContext: () => ({ clearRect() {}, drawImage(...args) { drawn.push(args.slice(1)); } }) });
  const size = { x: 2, y: 2 }, calls = [];
  const fake = {
    domElement: {}, lost: false,
    getContext() { return { isContextLost: () => this.lost }; },
    getSize(v) { v.x = size.x; v.y = size.y; return v; },
    setSize(w, h) { size.x = w; size.y = h; calls.push('size ' + w + 'x' + h); },
    setViewport(x, y, w, h) { calls.push('viewport ' + [x, y, w, h].join(',')); },
    setScissor() {}, clear() {}, render() { calls.push('render'); },
  };
  const a = view(rect(10, 20, 300, 200)), b = view(rect(10, 900, 300, 200)), c = view(rect(400, 20, 112, 84));
  stepped = 0;
  check(drawViews(fake, [a, b, c], 1, 0.016) === true && stepped === 2, 'three views, one below the window: two moved and drawn');
  check(a.canvas?.width === 600 && a.canvas?.height === 400 && a.el.child === a.canvas, 'a view gets a canvas of its own, in its element, in device pixels (' + a.canvas?.width + 'x' + a.canvas?.height + ')');
  check(!b.canvas, 'the one out of sight gets none');
  check(size.x === 600 && size.y === 400 && calls.filter(line => line.startsWith('size')).length === 1, 'the renderer grows to the biggest view, once (' + size.x + 'x' + size.y + ')');
  check(JSON.stringify(drawn[0]) === '[0,0,600,400,0,0,600,400]' && JSON.stringify(drawn[1]) === '[0,232,224,168,0,0,224,168]',
    'each picture is copied from the bottom left of the renderer\'s canvas: ' + JSON.stringify(drawn[1]));
  check(Math.abs(c.camera.aspect - 112 / 84) < 1e-9, 'the camera takes the view\'s shape');
  stepped = 0;
  check(drawViews(fake, [a, b, c], 1, 0.016, { getBoundingClientRect: () => rect(0, 0, 350, 600) }) === true && stepped === 1, 'within a box: only the view inside it');
  // ---- a long model in a narrow picture (the car card: 290 x 270 on a desktop, 64 x 44 on a phone, wide elsewhere)
  for (const [w, h] of [[290, 270], [64, 44], [400, 120]]) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 11), new THREE.MeshBasicMaterial()); // (as long as a bus)
    const v = { el: { getBoundingClientRect: () => rect(0, 0, w, h), append() {} }, ...standView({ model: car, spin: false, lift: 0.3, angle: Math.PI / 2, fitWidth: true }, 1.35) };
    drawViews(fake, [v], 0, 0);
    v.scene.updateMatrixWorld(true); v.camera.updateMatrixWorld(true);
    const ends = [-5.5, 5.5].map(z => Math.abs(new THREE.Vector3(0, 0.75, z).applyMatrix4(car.matrixWorld).project(v.camera).x)); // (its two ends, side on: 1 is the picture's edge)
    check(Math.max(...ends) <= 1 && v.camera.zoom <= 1, 'a bus side on in a ' + w + ' x ' + h + ' picture: its ends at ' + Math.max(...ends).toFixed(2) + ' of the way to the edge (zoom ' + v.camera.zoom.toFixed(2) + ')');
  }
  // ---- prefers-reduced-motion: nothing moves, a light bar is steady, and a picture is drawn only now and then
  {
    const { STILL } = await g.load('render/modelviews.js');
    const { MODELS, FIXED_PAINT, makeLightBar, placeLightBar, flashLightBar } = await g.load('render/models.js');
    const police = MODELS.police({ ...g.CONFIG.vehicles.police, color: FIXED_PAINT.police }), bar = makeLightBar(), ticks = [];
    placeLightBar(bar, 'police', g.CONFIG.vehicles.police);
    police.add(bar);
    const v = { el: { getBoundingClientRect: () => rect(0, 0, 112, 84), append() {} }, ...standView({ model: police, tick: (t, dt) => { ticks.push([t, dt]); flashLightBar(bar, 'police', t * 1000); } }) };
    const turn = police.parent, colours = new Set(), angles = new Set();
    for (let k = 0; k < 20; k++) { drawViews(fake, [v], k * 0.1, 0.1); colours.add(bar.material.color.getHex()); angles.add(turn.rotation.y.toFixed(3)); }
    check(colours.size === 2 && angles.size === 20, 'as usual a police car turns and its bar flashes (' + colours.size + ' colours, ' + angles.size + ' angles in 2 s)');
    window.matchMedia = () => ({ matches: true });
    ticks.length = 0; colours.clear(); angles.clear(); calls.length = 0;
    const clock = performance.now;
    let now = 1000;
    performance.now = () => now;
    for (let k = 0; k < 20; k++) { now += 100; drawViews(fake, [v], 50 + k * 0.1, 0.1); colours.add(bar.material.color.getHex()); angles.add(turn.rotation.y.toFixed(3)); }
    performance.now = clock;
    check(colours.size === 1 && angles.size === 1 && Number([...angles][0]) === STILL.angle, 'reduced motion: it stands at ' + [...angles][0] + ' rad, its bar steady in one colour');
    check(ticks.every(([t, dt]) => dt === 0 && Math.abs(t - ticks[0][0]) < 1e-9), 'the clock is held (' + ticks.length + ' frames, all at one moment, none moved on)');
    const renders = calls.filter(line => line === 'render').length;
    check(renders === Math.ceil(2 / STILL.every), 'and it is drawn every ' + STILL.every + ' s, not every frame (' + renders + ' drawings in 20 frames over 2 s)');
    window.matchMedia = () => ({ matches: false });
    drawViews(fake, [v], 60, 0.1);
    check(turn.rotation.y !== STILL.angle, 'the setting switched off again: it turns again');
    delete window.matchMedia;
  }
  fake.lost = true; stepped = 0;
  check(drawViews(fake, [a], 1, 0.016) === false && stepped === 0, 'a lost context: false, nothing drawn');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
