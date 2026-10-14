// A check of the DAMAGE STATES in the model viewer (render/inspectmodel.js damageModel, over the game's own render/dents.js; the
// model editor and the garage inspector call it), without a browser. A sample of cars is built the way the viewer builds them
// (buildInspectModel) and put through Clean, the four stages (CONFIG.dents.steps) and 100 %: no exception, finite geometry, the
// triangle count never falls as the damage grows, a clean build is byte-identical to a build never damaged, going back to
// Clean (after any stage, in any order) takes the damage away again, the paint scorches and unscorches. Prints the triangle
// multiplier of each car at each stage (the Mi Pad's cost of a damaged car).
//   node scripts/.dents-states-check.mjs            (add a car id to see only that car)
import { createHash } from 'node:crypto';
import { startModels } from './modelpatch-load.mjs';

const { load, close } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { CARS, FILLER_CARS, EVENT_CARS, BESPOKE_CARS, EARNED_CARS, SECRET_CARS, carById, superOf } = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { buildInspectModel, DAMAGE_STATES, damageModel, damageCounts, damageFromParam, damageIndex } = await load('render/inspectmodel.js');
  const { CONFIG } = await load('config.js');
  const only = process.argv[2];

  check(DAMAGE_STATES.map(s => s.label).join() === 'Clean,20%,40%,60%,80%,100%' && DAMAGE_STATES.slice(1, 5).every((s, i) => s.share === CONFIG.dents.steps[i]), 'the states are Clean and the four CONFIG.dents.steps, then 100%');
  check([undefined, '', '0', '1', '4', '5', '60', '100', '250', 'x'].map(t => damageIndex(damageFromParam(t))).join() === '0,0,0,1,4,5,3,5,5,0', '?damage reads a state 0..5 or a percentage');

  // the sample: by kind, found in the roster
  const all = [...CARS, ...FILLER_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...EARNED_CARS, ...[].concat(Array.isArray(SECRET_CARS) ? SECRET_CARS : [])];
  const want = (id) => carById(id) || all.find(c => c.id === id) || IDEA_CARS.find(c => c.id === id);
  const sample = [
    ['hatch', want('hothatch')], ['truck', want('liftedtruck')], ['van', want('darkvan')],
    ['Super car', CARS.map(superOf).filter(Boolean)[0]], ['Legendary', all.find(c => c.legend) || want('l-sport')],
    ['idea car', IDEA_CARS.find(c => c.model) || IDEA_CARS[0]], ['idea car (2)', IDEA_CARS.filter(c => c.model)[3] || IDEA_CARS[1]],
  ];
  // a car with no hub: the first whose wheels show none (render/wheelcosmetic.js notes them in userData.wheelHubs)
  let noHub = null;
  for (const car of all) { try { const m = buildInspectModel(car); if (m.userData.wheelHubs && !m.userData.wheelHubs.hubs.length && !car.legend && !car.tank && !car.ufo) { noHub = car; break; } } catch { /* next */ } }
  sample.push(['no hub', noHub || want('commuter')]);
  const picked = sample.filter(([, car]) => car && (!only || car.id === only));
  check(picked.length >= 7 || !!only, picked.length + ' cars in the sample' + (noHub ? ' (no-hub car: ' + noHub.id + ')' : ' (no hubless car found: Commuter stands in)'));

  // a model's fingerprint: every mesh's positions, normals, index, and paint colour, in order
  const sig = (model) => {
    const h = createHash('sha1');
    model.traverse((n) => {
      if (!n.isMesh) return;
      const g = n.geometry;
      for (const k of ['position', 'normal']) if (g.attributes[k]) h.update(Buffer.from(g.attributes[k].array.buffer, g.attributes[k].array.byteOffset, g.attributes[k].array.byteLength));
      if (g.index) h.update(Buffer.from(g.index.array.buffer, g.index.array.byteOffset, g.index.array.byteLength));
      for (const m of [].concat(n.material)) h.update(String(m.color?.getHex?.()));
    });
    return h.digest('hex');
  };
  const finite = (model) => { let ok = true; model.traverse((n) => { if (n.isMesh && n.geometry.attributes.position.array.some(x => !Number.isFinite(x))) ok = false; }); return ok; };
  const bodyColour = (model) => { const b = model.userData.body; return (b.userData.solidMat || b.material).color.getHex(); };

  for (const [kind, car] of picked) {
    if (!car) { check(false, kind + ': no such car in the roster'); continue; }
    const tag = kind + ' ' + car.id;
    try {
      const plain = buildInspectModel(car), twin = buildInspectModel(car), dented = buildInspectModel(car);
      for (const m of [plain, twin, dented]) m.updateMatrixWorld(true);
      if (!dented.userData.body) { check(true, tag + ': no body to dent (skipped)'); continue; }
      const clean = sig(plain);
      check(sig(twin) === clean, tag + ': two undamaged builds are byte-identical (the comparison is sound)');
      damageModel(twin, 0);
      check(sig(twin) === clean && !twin.userData.dentFrame, tag + ': Clean on a never-damaged model changes nothing, measures nothing');
      const tris = [], row = [], looks = [];
      const cleanColour = bodyColour(dented);
      let threw = null, nan = false;
      for (const state of DAMAGE_STATES) {
        try { damageModel(dented, state.share); } catch (e) { threw = e; break; }
        if (!finite(dented)) nan = true;
        looks.push(sig(dented));
        const c = damageCounts(dented);
        tris.push(c.damaged.triangles);
        row.push(state.label + ' x' + c.factor.toFixed(2));
        if (state.share === 0 && sig(dented) !== clean) check(false, tag + ': Clean differs from the undamaged build');
        if (c.clean.triangles !== tris[0] && c.clean.triangles !== undefined && state.share > 0 && c.clean.triangles !== damageCounts(plain).damaged.triangles) check(false, tag + ': the clean count at ' + state.label + ' is not the undamaged build\'s');
      }
      check(!threw, tag + ': every state builds, no exception' + (threw ? ' (' + threw.message + ')' : ''));
      check(!nan, tag + ': geometry finite (no NaN) at every state');
      check(tris.every((t, i) => i === 0 || t >= tris[i - 1]), tag + ': triangles never fall as damage grows (' + tris.join(' <= ') + ')');
      check(tris.length === 6 && tris[0] === damageCounts(plain).damaged.triangles, tag + ': Clean has the undamaged build\'s ' + tris[0] + ' triangles');
      check(tris[4] === tris[5], tag + ': 100% has stage 4\'s shapes (' + tris[4] + ')');
      check(new Set(looks.slice(0, 5)).size === 5 && looks[4] !== looks[5], tag + ': Clean and the four stages each look different (100% is stage 4 with more scorch)');
      console.log('        ' + row.join('   '));
      // the paint scorches, and unscorches
      check(bodyColour(dented) !== cleanColour || cleanColour === 0, tag + ': the body paint is scorched at 100%');
      // back and forth: 100% -> Clean is the undamaged build, again and again, and a state is the same every time
      const seen = new Map();
      let ok = true;
      for (const share of [1, 0, CONFIG.dents.steps[1], 0, CONFIG.dents.steps[3], CONFIG.dents.steps[0], 0, CONFIG.dents.steps[1], 0]) {
        damageModel(dented, share);
        const s = sig(dented);
        if (share === 0) { if (s !== clean || bodyColour(dented) !== cleanColour) ok = false; } else if (seen.has(share) && seen.get(share) !== s) ok = false; else seen.set(share, s);
      }
      check(ok, tag + ': Clean after any stage is the undamaged build again (geometry, paint), and a stage looks the same each time');
      check(dented.userData.dentLevel === 0, tag + ': the reset leaves the model at level 0');
    } catch (e) { check(false, tag + ': ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  }
} catch (e) { failures++; console.log('  FAIL  ' + (e.stack || e)); }
await close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
