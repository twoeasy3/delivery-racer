// A check of the "Where to get it" SECTION as drawn (render/carsources.js renderSources), on a small stand-in DOM, headless
// (the owner, 13-Oct): (1) a source that can never give the car is not listed ("don't name where it can't be obtained.
// That's pointless"), and a car with nothing to be had shows one neutral line; (2) a BLACKED-OUT car's section
// (showroomData.js carCard dark) draws its blueprint and key cards as black silhouettes (.silhouette) and names it
// nowhere: no name, no id, in any text or attribute; once not blacked out, everything shows. The look is seen in stills
// (a browser), not here.
//   node scripts/.carsources-dom-check.mjs
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// render/scene.js makes the game's WebGL renderer as it loads: a stand-in (as scripts/.packcar-check.mjs)
// and render/carstill.js (the cards' car pictures: drawn in a browser only) a stand-in that draws nothing, so the showroom's
// whole tree of models is not loaded here
const STILL = 'export const drawSoon = () => {}, stillsIn = () => ({ watch() {}, stop() {} }), stillCar = () => false, stillReady = () => false;';
const SCENE = `import * as THREE from 'three';
export const PIXEL_RATIO = 1, renderer = null, scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
export const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), Cinematic = {};
export const applySky = () => {}, clearGroup = () => {}, applyLight = () => {}, aim = () => {}, updateCamera = () => {};`;
// (a canvas's 2D context, for the textures drawn as modules load)
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === 'measureText' ? () => ({ width: 10 }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => ctx2d), set: (o, k, v) => { o[k] = v; return true; } });
ctx2d.addColorStop = () => {};
// the stand-in DOM: enough of an element for the section to be built and read back
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.className = ''; this.open = false; this.width = 1; this.height = 1;
    const st = {}; Object.defineProperty(st, 'setProperty', { value: (k, v) => { st[k] = v; } }); this.style = st;
  }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    return { add: (...c) => { this.className = [...new Set([...list(), ...c])].join(' '); }, contains: (c) => list().includes(c), remove() {}, toggle() {} };
  }
  append(...xs) { for (const x of xs) this.children.push(typeof x === 'string' ? { text: x } : x); }
  appendChild(x) { this.append(x); return x; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener() {}
  getContext() { return ctx2d; }
  getBoundingClientRect() { return { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 }; }
  querySelector() { return null; }
  get isConnected() { return false; }
  get textContent() { return this.children.map(c => c.text ?? c.textContent ?? '').join(' '); }
  set textContent(v) { this.children = [{ text: String(v) }]; }
  replaceChildren(...xs) { this.children = []; this.append(...xs); }
  remove() {}
  querySelectorAll() { return []; }
  insertBefore(x) { this.append(x); return x; }
  prepend(...xs) { this.append(...xs); }
  all() { return [this, ...this.children.filter(c => c instanceof El).flatMap(c => c.all())]; }
}
const element = () => ({ classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), devicePixelRatio: 2, innerWidth: 1280, innerHeight: 800 };
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: '', createElement: (t) => new El(t), head: new El('head') };
globalThis.location = { search: '', href: 'http://localhost/delivery/', pathname: '/delivery/', hash: '' };
globalThis.requestAnimationFrame = () => 0; // (no drawing here: the pictures are seen in a browser)
const stored = new Map();
globalThis.localStorage = { getItem: (k) => (stored.has(k) ? stored.get(k) : null), setItem: (k, v) => stored.set(k, String(v)), removeItem: (k) => stored.delete(k) };
const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'error',
  server: { middlewareMode: true, ws: false, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  cacheDir: join(tmpdir(), 'delivery-vite-' + process.pid + '-' + Date.now().toString(36)),
  plugins: [{ name: 'no-renderer', enforce: 'pre', load(id) { if (/render[\\/]scene\.js$/.test(id)) return SCENE; if (/render[\\/]carstill\.js$/.test(id)) return STILL; } }],
});
const load = (path) => server.ssrLoadModule('/src/delivery/' + path);
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { carById } = await load('cars.js');
  const by = (id) => carById(id);
  const { Progress } = await load('progress.js');
  const { Events, when } = await load('events.js');
  const { Ecu } = await load('ecu.js');
  const { renderSources } = await load('render/carsources.js');
  const SD = await load('showroomData.js');
  const at = (t) => { Events.now = () => t; };
  const fresh = () => { Progress.reset(); Progress.noSave = true; };
  // everything the section says or carries: its text, every attribute, data-*, class and style value
  const everything = (box) => box.all().map(e => [e.textContent, e.className, ...Object.values(e.attrs), ...Object.values(e.dataset),
    ...Object.values(e.style).filter(v => typeof v === 'string')].join(' ')).join(' ');
  const leaks = (box, car) => [car.name, car.id].filter(n => everything(box).toLowerCase().includes(n.toLowerCase()));
  const cardsOf = (box) => box.all().filter(e => e.classList.contains('bp-card'));
  const picsOf = (box) => box.all().filter(e => e.classList.contains('bp-pic'));
  const groups = (box) => box.all().filter(e => e.classList.contains('cs-group'));
  const NEVER = /Never in|Cannot hold it|Event over|Prize already won|Sold out/;
  const flat = (box) => box.textContent.replace(/\s+/g, ' ').trim();
  fresh(); at(when('2026-10-12'));
  // a fresh save: the Hot Dog Car, the Horseshoe and the Snowcat are blacked out (no key to be had, no blueprints)
  for (const id of ['hotdog', 'horseshoe', 'snocat']) {
    const car = by(id), card = SD.carCard(car, false);
    const box = renderSources(car, { open: true, dark: card.dark }), cards = cardsOf(box), pics = picsOf(box);
    check(card.dark && cards.length === 2 && cards.every(c => c.classList.contains('dark') && !c.dataset.car) && pics.length === 2 && pics.every(p => p.classList.contains('silhouette')),
      id + ' (blacked out): its blueprint card and its key card are black silhouettes (' + pics.map(p => p.className).join(' / ') + ')');
    check(!leaks(box, car).length && /Locked car/.test(everything(box)), '...the section names it nowhere, in text or attribute (leaks: ' + (leaks(box, car).join(', ') || 'none') + '; shown as "Locked car")');
    check(!NEVER.test(box.textContent) && !groups(box).length && /Not obtainable right now/.test(box.textContent),
      '...nothing can give it: no place listed, one neutral line ("' + flat(box).slice(0, 90) + '")');
  }
  // the same car with a blueprint: no longer blacked out, everything shows again
  Ecu.addBlueprints('hotdog', 1);
  const lit = SD.carCard(by('hotdog'), false), litBox = renderSources(by('hotdog'), { open: true, dark: lit.dark });
  check(!lit.dark && picsOf(litBox).every(p => !p.classList.contains('silhouette')) && cardsOf(litBox).every(c => c.dataset.car === 'hotdog') && /Hot Dog Car/.test(litBox.textContent),
    'the Hot Dog Car with one blueprint: not blacked out, its cards drawn and named as before');
  // normal cars list only the places that can give them
  fresh(); at(when('2026-10-12'));
  Progress.data.unlocked = 99; Progress.data.tierBase = 99; // (every tier open: a garage car is not a tier's silhouette)
  for (const id of ['silvercomet', 'lovebus', 'fishbowl']) {
    const car = by(id), card = SD.carCard(car, false), box = renderSources(car, { open: true, dark: card.dark });
    const listed = box.all().filter(e => e.classList.contains('cs-line') && !e.classList.contains('muted')).length;
    check(!card.dark && !NEVER.test(box.textContent) && picsOf(box).every(p => !p.classList.contains('silhouette')) && box.textContent.includes(car.name) && listed > 0,
      id + ': not blacked out, named, only the places that can give it (' + listed + ' lines, no "Never in" / "Cannot hold it")');
  }
  // the Courier Special (blacked out, its level's par off for now): its real source kept, its name nowhere
  const courier = by('courier'), cbox = renderSources(courier, { open: true, dark: SD.carCard(courier, false).dark });
  check(!leaks(cbox, courier).length && /Rival Run/.test(cbox.textContent) && !NEVER.test(cbox.textContent), 'the Courier Special (blacked out): its level kept ("' + flat(cbox).slice(0, 110) + '"), its name nowhere');
  // a concept car off its day, drawn as if blacked out: its own day's pack ("Fishbowl Strike pack") does not name it either
  at(Events.specials.find(e => e.id === 'concept-strike').from + 15 * 86400e3 + 5 * 3600e3); // (a Tuesday: not the Fishbowl's day)
  const fb = renderSources(by('fishbowl'), { open: true, dark: true });
  check(!leaks(fb, by('fishbowl')).length && !/fishbowl/i.test(everything(fb)) && /\?\?\? Strike pack/.test(fb.textContent) && /Its day: Monday/.test(fb.textContent),
    'a concept car drawn blacked out: its pack\'s name withheld ("??? Strike pack"), its day still said ("Its day: Monday")');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
}
await server.close();
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
