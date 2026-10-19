// A check of the PREVIEW SPIN RULE (CHECKLIST 466; the owner, 17-Oct: "make non-spinners stop rotating in all vehicle previews"; "threads and
// rims should not be rotating"): a car ON SHOW (render/showcar.js makeShowCar, the one builder of every vehicle preview: the garage, the
// showroom, the Cosmetics screen, the menu's car card, the stills, the inspector, the pack banners and the unlock cutscenes) has no speed to
// follow, and then
//   - every rim (render/rims.js kind 'speed'), every tread (render/treads.js: blocks, band, shoulder rings) and every tyre a model turns
//     itself (render/models.js wheelTurn, the hoop of the Monowheel) STANDS STILL;
//   - a SPINNER (kind 'spin': Blade spinner, Twin spinner) keeps turning at SPIN_RATE;
//   - in a run (userData.roll, render/items.js) nothing changed: rims and treads turn by the distance rolled, a spinner at its pace, traffic
//     wheels as before.
//   node scripts/.preview-spin-check.mjs
import { startModels } from './modelpatch-load.mjs';
import { readFileSync } from 'node:fs';

const g = await startModels();
const { load } = g;
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Progress } = await load('progress.js');
  const C = await load('cars.js');
  const Store = await load('render/loadoutstore.js');
  const RIM = await load('render/rims.js');
  const { makeShowCar } = await load('render/showcar.js');
  const { wheelTurn } = await load('render/models.js');
  Progress.noSave = true; Store.reloadStore();
  const run = (m, frames, roll = null) => { for (let i = 0; i <= frames; i++) { if (roll !== null) m.userData.roll = roll * i; m.userData.animate?.(i / 60); } };
  const angles = (m) => [...(m.userData.wheelHubs?.rims?.list || []).map(x => ['rim', x.userData.rim.a, x.quaternion.clone()]), ...(m.userData.wheelHubs?.treads?.list || []).map(x => ['tread', x.userData.tread.a, x.quaternion.clone()])];
  const turned = (a, b) => a.map((x, i) => Math.abs(x[1] - b[i][1]) + (1 - Math.abs(x[2].dot(b[i][2]))));

  // a speed rim and a tread, on show
  Store.setSlot('sprinthatch', 'wheels', { rim: { all: 'spoke5' }, tread: { all: 'chevron' } });
  const m = makeShowCar(C.carById('sprinthatch'));
  const a0 = angles(m);
  run(m, 120);
  const still = turned(a0, angles(m));
  check(m.userData.onShow && a0.filter(x => x[0] === 'rim').length >= 4 && a0.filter(x => x[0] === 'tread').length >= 4 && still.every(d => d < 1e-9), 'on show 2 s: the 5-spoke rims (' + a0.filter(x => x[0] === 'rim').length + ') and the Chevron treads (' + a0.filter(x => x[0] === 'tread').length + ') stand still (IDLE_RATE ' + RIM.IDLE_RATE + ')');
  // the same car in a run: rolling
  const r0 = angles(m);
  run(m, 30, 0.4);
  check(turned(r0, angles(m)).every(d => d > 1e-3), 'the same model in a run (userData.roll, 24 m/s): every rim and tread turns');
  // a spinner, on show
  Store.setSlot('hothatch', 'wheels', { rim: { all: 'spinblade' } });
  const s = makeShowCar(C.carById('hothatch'));
  const s0 = angles(s);
  run(s, 30);
  const spun = s.userData.wheelHubs.rims.list.map(x => x.userData.rim.a);
  check(s0.length && spun.every(a => Math.abs(a - RIM.SPIN_RATE * 0.5) < 0.05), 'on show: a Blade spinner keeps turning at ' + RIM.SPIN_RATE + ' rad/s (' + spun.map(a => a.toFixed(2)).join(', ') + ' rad after 0.5 s)');
  run(s, 30, 0);
  check(s.userData.wheelHubs.rims.list.every(x => x.userData.rim.spin), '...and in a run it is still a spinner (its own pace, whatever the car does)');
  // the tyres a model turns itself (render/models.js): still on show, by the roll in a run, traffic as before
  const grp = { userData: { onShow: true } };
  check(wheelTurn(grp, 5, 0.35) === 0 && wheelTurn({ userData: {} }, 1, 0.35) === 30 && wheelTurn({ userData: { roll: 7 } }, 1, 0.35) === 20, 'models.js wheelTurn: 0 on show, the roll over the radius in a run, traffic as before (t x 30)');
  const self = ['gt', 'lmp', 'f1'].map(id => C.carById(id) || C.LEVEL_CARS?.[id]).find(c => { try { return c && makeShowCar(c).userData.rollsWheels; } catch { return false; } }); // (the race cars: render/models.js turns their tyres)
  check(!!self, 'a car whose model turns its own tyres found (' + self?.id + ')');
  if (self) {
    const sm = makeShowCar(self), tyres = () => sm.userData.wheelHubs?.rimInfo?.map(x => x.tyre.rotation.x) || [];
    run(sm, 0); const t0 = tyres(); run(sm, 90);
    check(t0.length && tyres().every((x, i) => x === t0[i]), self.id + ' (its tyres turn themselves): still on show (' + t0.length + ' tyres)');
  }
  const mono = C.carById('monowheel');
  if (mono) {
    const mm = makeShowCar(mono), q = [];
    mm.traverse(o => { if (o.isGroup) q.push([o, o.rotation.x]); });
    run(mm, 90);
    check(q.every(([o, x]) => o.rotation.x === x), 'the Monowheel\'s hoop: still on show');
  }
  // every preview builds through makeShowCar (so every preview has the rule)
  const users = ['showroomview', 'carstill', 'menustage', 'garage', 'inspectmodel', 'packbanner', 'unlockcine', 'warmup'];
  check(users.every(f => /makeShowCar\(/.test(readFileSync(new URL('../src/delivery/render/' + f + '.js', import.meta.url), 'utf8'))), 'every vehicle preview builds its car with makeShowCar (on show): ' + users.join(', '));
  const { fingerprints } = await import('./logic-hash.mjs');
  const fp = fingerprints();
  check(fp.logic === '51eeb6e567' && fp.legacy === '7f39b6494b', 'the replay fingerprint unchanged (since CHECKLIST 494 + 496-499, the ram cap, throw spread, tank shell, rickety floor and the oil / glue / EMP / magma hazards: was c0c2c73e68 / 8c50a659a9 after 494 alone, 8dbc477d85 / bcc9df44d0; since CHECKLIST 476, the dead-end side rule, was 057a22806d; since CHECKLIST 470, no pickup in the air; was 33a0394c26 / dd565f56b3): ' + JSON.stringify(fp));
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (g.fixStack ? g.fixStack(e.stack) : e.stack));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
