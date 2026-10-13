// A check of the CAR KEY models and the key card (src/delivery/render/keyModels.js, keycard.js, blueprintcard.js),
// headless: each of the nine keys (one a key car, the owner, 13-Oct) builds for a few cars and rarities into a group of meshes, every vertex a number,
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
  check(KEY_MODELS.length === 9 && new Set(KEY_MODELS).size === 9 && KEY_MODELS.every(m => typeof KEY_BUILDERS[m] === 'function') && KEY_MODELS.includes(KEY_MODEL),
    'nine key models (' + KEY_MODELS.join(', ') + '), the default ' + KEY_MODEL + ' among them');
  const cars = [g.cars.carById('silvercomet'), g.cars.carById('commuter'), { id: 'x', name: '9 Lives', color: 0x101010 }].filter(Boolean);
  check(cars.length === 3, 'the Silver Comet and a garage car to tint them by');
  for (const model of KEY_MODELS) {
    let ok = true, why = '';
    for (const car of cars) for (const rarity of ['bespoke', 'epic', 'common']) {
      const key = makeKey(car, { model, rarity });
      key.updateMatrixWorld(true);
      let meshes = 0, bad = 0, tris = 0;
      key.traverse((node) => {
        if (!node.isMesh) return;
        meshes++;
        tris += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
        const a = node.geometry.attributes.position.array;
        for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) { bad++; break; }
      });
      const box = new THREE.Box3().setFromObject(key), size = box.getSize(new THREE.Vector3());
      // (the six newer keys merge their parts by material: some 7 to 13 meshes; each key under 4,000 triangles)
      const fine = meshes >= 5 && tris < 4000 && !bad && size.y >= 3 && size.y <= 7 && size.x >= 1 && size.x <= 3.5 && size.z >= 0.3 && size.z <= 1.5 && key.userData.keyModel === model;
      if (!fine && ok) { ok = false; why = ` (${car.id} ${rarity}: ${meshes} meshes, ${tris} triangles, ${bad} bad, size ${size.toArray().map(n => n.toFixed(2)).join(' x ')})`; }
      // the idle sway: moves it, and keeps it near where it stands
      key.userData.animate(0); key.updateMatrixWorld(true);
      const rest = new THREE.Box3().setFromObject(key);
      key.userData.animate(2.2); key.updateMatrixWorld(true);
      const swayed = new THREE.Box3().setFromObject(key);
      if (ok && (rest.equals(swayed) || swayed.getCenter(new THREE.Vector3()).distanceTo(rest.getCenter(new THREE.Vector3())) > 0.6)) { ok = false; why = ' (the sway does not move it, or moves it off)'; }
    }
    check(ok, model + ': builds for 3 cars x 3 rarities: meshes, no NaN, an upright key-sized box, a gentle sway' + why);
  }
  // ---- ordinary keys, batch A (KEY-IDEAS.md rows 1 to 4: render/keyModelsOrdA.js): every ORDINARY model registered (none of
  // them among the nine) builds for the same cars and rarities: 5+ meshes, under 4,000 triangles, every vertex a number
  {
    await g.load('render/keyModelsOrdinary.js');
    const { ORDINARY_MODELS } = await g.load('render/keyModels.js');
    check(['roundhead', 'wing', 'flipkey', 'rugged'].every(m => ORDINARY_MODELS.includes(m)) && !ORDINARY_MODELS.some(m => KEY_MODELS.includes(m)),
      'the ordinary keys are registered apart from the nine (' + ORDINARY_MODELS.join(', ') + ')');
    for (const model of ORDINARY_MODELS) {
      let why = '';
      for (const car of cars) for (const rarity of ['bespoke', 'epic', 'common']) {
        const key = makeKey(car, { model, rarity });
        let meshes = 0, bad = 0, tris = 0;
        key.traverse((node) => {
          if (!node.isMesh) return;
          meshes++;
          tris += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
          if (Array.from(node.geometry.attributes.position.array).some(v => !Number.isFinite(v))) bad++;
        });
        if (!why && !(key.isGroup && meshes >= 5 && tris < 4000 && !bad && key.userData.keyModel === model)) why = ` (${car.id} ${rarity}: ${meshes} meshes, ${tris} triangles, ${bad} bad)`;
      }
      check(!why, 'ordinary ' + model + ': builds for 3 cars x 3 rarities: 5+ meshes, under 4,000 triangles, no NaN' + why);
    }
  }
  check(initialOf({ name: 'Silver Comet' }) === 'S' && initialOf({ name: '9 Lives' }) === 'L' && initialOf({ name: '42' }) === '*', 'the emblem: the first letter of the name, else a diamond');
  check(makeKey(cars[0], { model: 'nonsense' }).userData.keyModel === KEY_MODEL, 'an unknown model: the default');

  // ---- ordinary keys, batch C (render/keyModelsOrdC.js: crystal, carbonfob, wedgefob, leaper): registered as ORDINARY (not
  // among the nine), and each builds for the 3 cars x 3 rarities: 5 to 20 meshes, under 1,500 triangles, no NaN, an upright
  // key-sized box, a gentle sway
  {
    const { ORDINARY_MODELS } = await g.load('render/keyModels.js');
    await g.load('render/keyModelsOrdC.js');
    const batchC = ['crystal', 'carbonfob', 'wedgefob', 'leaper'];
    check(batchC.every(m => ORDINARY_MODELS.includes(m) && !KEY_MODELS.includes(m) && typeof KEY_BUILDERS[m] === 'function'), 'batch C registered as ordinary keys (' + batchC.join(', ') + ')');
    for (const model of batchC) {
      let ok = true, why = '';
      for (const car of cars) for (const rarity of ['bespoke', 'epic', 'common']) {
        const key = makeKey(car, { model, rarity });
        key.updateMatrixWorld(true);
        let meshes = 0, bad = 0, tris = 0;
        key.traverse((node) => {
          if (!node.isMesh) return;
          meshes++;
          tris += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
          if (Array.from(node.geometry.attributes.position.array).some(v => !Number.isFinite(v))) bad++;
        });
        const size = new THREE.Box3().setFromObject(key).getSize(new THREE.Vector3());
        const fine = meshes >= 5 && meshes <= 20 && tris < 1500 && !bad && size.y >= 3 && size.y <= 7 && size.x >= 1 && size.x <= 3.5 && size.z >= 0.3 && size.z <= 1.5 && key.userData.keyModel === model;
        if (!fine && ok) { ok = false; why = ` (${car.id} ${rarity}: ${meshes} meshes, ${tris} triangles, ${bad} bad, size ${size.toArray().map(n => n.toFixed(2)).join(' x ')})`; }
        key.userData.animate(0); key.updateMatrixWorld(true);
        const rest = new THREE.Box3().setFromObject(key);
        key.userData.animate(2.2); key.updateMatrixWorld(true);
        const swayed = new THREE.Box3().setFromObject(key);
        if (ok && (rest.equals(swayed) || swayed.getCenter(new THREE.Vector3()).distanceTo(rest.getCenter(new THREE.Vector3())) > 0.6)) { ok = false; why = ' (the sway does not move it, or moves it off)'; }
      }
      check(ok, model + ' (ordinary, batch C): builds for 3 cars x 3 rarities: 5 to 20 meshes, under 1,500 triangles, an upright key-sized box, a gentle sway' + why);
    }
  }

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
  // each Bespoke key car has ONE key for good (cars.js `keyModel`; the owner, 12-Oct), a key of its OWN: no two cars share
  // one, and every model is some car's (the owner, 13-Oct)
  const carsMod = await g.load('cars.js');
  const bespokeCars = [...carsMod.EVENT_CARS, ...carsMod.BESPOKE_CARS].filter(c => c.bespoke);
  const styles = bespokeCars.map(c => c.id + ':' + c.keyModel).join(' ');
  check(bespokeCars.length >= 6 && bespokeCars.every(c => KEY_MODELS.includes(c.keyModel)), 'every Bespoke key car has its own key style (' + styles + ')');
  check(new Set(bespokeCars.map(c => c.keyModel)).size === bespokeCars.length, 'no two key cars share a key model');
  check(KEY_MODELS.every(m => bespokeCars.some(c => c.keyModel === m)), 'every key model (' + KEY_MODELS.length + ') is some Bespoke car\'s');

  // ---- ordinary keys, batch B (render/keyModelsOrdB.js: KEY-IDEAS.md rows 5 to 8): registered as ORDINARY (not among
  // the nine), each builds for a light, a dark and a coloured car into a key-sized group, at most 20 meshes and about
  // 1,500 triangles, no NaN, and no car uses one yet (no home chosen)
  {
    await g.load('render/keyModelsOrdinary.js');
    const { ORDINARY_MODELS } = await g.load('render/keyModels.js');
    const batchB = ['wristband', 'carfob', 'cardkey', 'displaykey'];
    check(batchB.every(m => ORDINARY_MODELS.includes(m) && typeof KEY_BUILDERS[m] === 'function' && !KEY_MODELS.includes(m)), 'ordinary keys, batch B: ' + batchB.join(', ') + ' registered (ordinary, not among the nine)');
    const tints = [cars[1], { id: 'b', name: 'Wren', color: 0xf2f2ee }, { id: 'd', name: 'Mamba', color: 0x141414 }];
    for (const model of batchB) {
      let why = '';
      for (const car of tints) for (const rarity of ['bespoke', 'common']) {
        const key = makeKey(car, { model, rarity });
        let meshes = 0, tris = 0, bad = 0;
        key.traverse((node) => {
          if (!node.isMesh) return;
          meshes++;
          tris += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
          if (node.geometry.attributes.position.array.some(v => !Number.isFinite(v))) bad++;
        });
        const size = new THREE.Box3().setFromObject(key).getSize(new THREE.Vector3());
        if (!why && !(meshes >= 3 && meshes <= 20 && tris <= 1600 && !bad && size.y >= 3 && size.y <= 7 && size.x >= 1 && size.x <= 3.5 && size.z >= 0.3 && size.z <= 1.5 && key.userData.keyModel === model && typeof key.userData.animate === 'function'))
          why = ` (${car.id} ${rarity}: ${meshes} meshes, ${tris} triangles, ${bad} bad, size ${size.toArray().map(n => n.toFixed(2)).join(' x ')})`;
      }
      check(!why, 'ordinary keys, batch B: ' + model + ' builds for 3 tints x 2 rarities: <= 20 meshes, <= 1,600 triangles, key-sized' + why);
    }
    check(!bespokeCars.some(c => batchB.includes(c.keyModel)), 'ordinary keys, batch B: no car uses one yet');
  }

  // ---- ordinary keys, batch D (KEY-IDEAS.md 13 to 16: render/keyModelsOrdD.js): each registered as an ORDINARY model (not one
  // of the nine), builds for 3 cars x 2 rarities: meshes, no NaN, under 1,700 triangles and 20 meshes, an upright key-sized box
  {
    const { ORDINARY_MODELS } = await g.load('render/keyModels.js');
    await g.load('render/keyModelsOrdD.js');
    for (const model of ['startfob', 'artisan', 'lottag', 'keikey']) {
      let ok = ORDINARY_MODELS.includes(model) && !KEY_MODELS.includes(model), why = ok ? '' : ' (not registered as ordinary)';
      for (const car of cars) for (const rarity of ['bespoke', 'common']) {
        const key = makeKey(car, { model, rarity });
        key.updateMatrixWorld(true);
        let meshes = 0, tris = 0, bad = 0;
        key.traverse((node) => {
          if (!node.isMesh) return;
          meshes++;
          tris += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
          if (node.geometry.attributes.position.array.some(v => !Number.isFinite(v))) bad++;
        });
        const size = new THREE.Box3().setFromObject(key).getSize(new THREE.Vector3());
        if (ok && !(key.userData.keyModel === model && meshes >= 5 && meshes <= 20 && tris < 1700 && !bad && size.y >= 3 && size.y <= 7 && size.x >= 1 && size.x <= 3.5 && size.z >= 0.3 && size.z <= 1.5)) {
          ok = false; why = ` (${car.id} ${rarity}: ${meshes} meshes, ${tris} triangles, ${bad} bad, size ${size.toArray().map(n => n.toFixed(2)).join(' x ')})`;
        }
      }
      check(ok, 'ordinary key ' + model + ' (batch D): builds for 3 cars x 2 rarities, light and key-sized' + why);
    }
  }
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
} finally {
  await g.close();
}
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
