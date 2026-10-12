// A check of the CAR KEY models and the key card (src/delivery/render/keyModels.js, keycard.js, blueprintcard.js),
// headless: each of the three keys builds for a few cars and rarities into a group of meshes, every vertex a number,
// its box in range (a key some 3 to 6 units long, upright, not a speck and not a building), its idle sway moves it and
// stays bounded, the emblem is the car's initial; and a KEY card shows the CAR KEY tab and the key's picture (not the
// car's: the picture handed back to the caller is kept out of the card), a blueprint card still BLUEPRINT and its own
// picture. What the keys look like is only seen in a browser (?keys, ?pack=bespoke).
//   node scripts/.keys-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const THREE = await import('three');
  const { KEY_MODELS, KEY_MODEL, KEY_BUILDERS, makeKey, initialOf } = await g.load('render/keyModels.js');
  check(KEY_MODELS.length === 3 && KEY_MODELS.every(m => typeof KEY_BUILDERS[m] === 'function') && KEY_MODELS.includes(KEY_MODEL),
    'three key models (' + KEY_MODELS.join(', ') + '), the default ' + KEY_MODEL + ' among them');
  const cars = [g.cars.carById('silvercomet'), g.cars.carById('commuter'), { id: 'x', name: '9 Lives', color: 0x101010 }].filter(Boolean);
  check(cars.length === 3, 'the Silver Comet and a garage car to tint them by');
  for (const model of KEY_MODELS) {
    let ok = true, why = '';
    for (const car of cars) for (const rarity of ['bespoke', 'epic', 'common']) {
      const key = makeKey(car, { model, rarity });
      key.updateMatrixWorld(true);
      let meshes = 0, bad = 0;
      key.traverse((node) => {
        if (!node.isMesh) return;
        meshes++;
        const a = node.geometry.attributes.position.array;
        for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) { bad++; break; }
      });
      const box = new THREE.Box3().setFromObject(key), size = box.getSize(new THREE.Vector3());
      const fine = meshes >= 10 && !bad && size.y >= 3 && size.y <= 7 && size.x >= 1 && size.x <= 3.5 && size.z >= 0.3 && size.z <= 1.5 && key.userData.keyModel === model;
      if (!fine && ok) { ok = false; why = ` (${car.id} ${rarity}: ${meshes} meshes, ${bad} bad, size ${size.toArray().map(n => n.toFixed(2)).join(' x ')})`; }
      // the idle sway: moves it, and keeps it near where it stands
      key.userData.animate(0); key.updateMatrixWorld(true);
      const rest = new THREE.Box3().setFromObject(key);
      key.userData.animate(2.2); key.updateMatrixWorld(true);
      const swayed = new THREE.Box3().setFromObject(key);
      if (ok && (rest.equals(swayed) || swayed.getCenter(new THREE.Vector3()).distanceTo(rest.getCenter(new THREE.Vector3())) > 0.6)) { ok = false; why = ' (the sway does not move it, or moves it off)'; }
    }
    check(ok, model + ': builds for 3 cars x 3 rarities: meshes, no NaN, an upright key-sized box, a gentle sway' + why);
  }
  check(initialOf({ name: 'Silver Comet' }) === 'S' && initialOf({ name: '9 Lives' }) === 'L' && initialOf({ name: '42' }) === '*', 'the emblem: the first letter of the name, else a diamond');
  check(makeKey(cars[0], { model: 'nonsense' }).userData.keyModel === KEY_MODEL, 'an unknown model: the default');

  // ---- the card: a stand-in DOM, enough for blueprintcard.js
  const el = (tag) => {
    const node = { tagName: tag.toUpperCase(), children: [], className: '', dataset: {}, style: { setProperty() {} }, attrs: {}, parentNode: null, text: '',
      append(...xs) { for (const x of xs) { if (typeof x === 'string') node.children.push({ text: x, children: [] }); else { x.parentNode = node; node.children.push(x); } } },
      setAttribute(k, v) { node.attrs[k] = v; }, get textContent() { return node.text + node.children.map(c => c.textContent ?? c.text).join(''); }, set textContent(v) { node.text = v; } };
    return node;
  };
  document.createElement = el;
  const all = (node, out = []) => { out.push(node); for (const c of node.children || []) all(c, out); return out; };
  const { blueprintCard } = await g.load('render/blueprintcard.js');
  const comet = cars[0];
  const k = blueprintCard(comet, { rarity: 'bespoke', key: true, n: 1 });
  const nodes = all(k.node);
  const tab = nodes.find(n => n.className === 'bp-tab');
  check(tab && /^CAR KEY/.test(tab.textContent), 'a key card\'s tab: CAR KEY (' + (tab?.textContent || 'none') + ')');
  const keyPic = nodes.find(n => /bp-keypic/.test(n.className));
  check(!!keyPic && keyPic.dataset.keymodel === KEY_MODEL, 'a key card\'s picture is the KEY (bp-keypic, model ' + keyPic?.dataset.keymodel + ')');
  check(!nodes.includes(k.pic) && !k.pic.parentNode, 'the car picture handed back is NOT in the key card (the car is never drawn on it)');
  const b = blueprintCard(comet, { rarity: 'legendary', key: false, n: 1 });
  const bn = all(b.node);
  check(/^BLUEPRINT/.test(bn.find(n => n.className === 'bp-tab')?.textContent || '') && bn.includes(b.pic) && !bn.some(n => /bp-keypic/.test(n.className)),
    'a blueprint card: BLUEPRINT, its own car picture, no key');
  // each Bespoke key car has ONE key style for good (cars.js `keyModel`), and all three styles are in use (the owner, 12-Oct)
  const carsMod = await g.load('cars.js');
  const bespokeCars = [...carsMod.EVENT_CARS, ...carsMod.BESPOKE_CARS].filter(c => c.bespoke);
  const styles = bespokeCars.map(c => c.id + ':' + c.keyModel).join(' ');
  check(bespokeCars.length >= 6 && bespokeCars.every(c => KEY_MODELS.includes(c.keyModel)), 'every Bespoke key car has its own key style (' + styles + ')');
  check(KEY_MODELS.every(m => bespokeCars.some(c => c.keyModel === m)), 'all three key styles (fob, classic, smart) are featured on some Bespoke car');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
} finally {
  await g.close();
}
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
