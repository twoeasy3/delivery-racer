// The PROP BOUNDS review CONTACT SHEETS (PROP-AUDIT-GUIDE.md): for the cars of a slice it writes delivery/propcars.json (the roster's
// entries, for the page delivery/propview.html, which cannot import the game's cars.js), takes one picture per car with scripts/shots.mjs
// (side + 3/4 rear, the three slots' box and cylinder as wireframes: roof blue, cargo green, wing red; the car's own tagged props magenta)
// and composes labelled sheets of at most 12 cars (id, kind, which slots are supported and at what scale, the reasons) with PIL.
//   node scripts/prop-sheet.mjs --slice <n> [--from <i> --to <j>] [--out <dir>] [--browser <path>]
//       pictures in <dir>/<car id>.png, sheets in <dir>/sheet-<n>-<k>.png; the default dir is /tmp/prop-bounds/slice-<n>/
//   node scripts/prop-sheet.mjs <car id> [...]              those cars only (sheet-cars-1.png...)
// One browser, one picture at a time (shots.mjs). --from / --to are 1-based positions in the slice (inclusive).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';
import { roster } from './prop-roster.mjs';
import { slicesOf } from './prop-slices.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const slice = flag('--slice') ? Number(flag('--slice')) : null;
const only = args.filter((a, i) => !a.startsWith('--') && !['--slice', '--from', '--to', '--out', '--browser'].includes(args[i - 1]));
const out = flag('--out', '/tmp/prop-bounds/' + (slice ? 'slice-' + slice : 'cars'));
const browser = flag('--browser', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');
const { load, close, ROOT } = await startModels();
try {
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const P = await load('render/propanchors.js');
  const cars = roster(C, IDEA_CARS);
  // the page's data: every roster entry (so any car can be looked at)
  const entries = {};
  for (const { group, car } of cars) entries[car.id] = { ...JSON.parse(JSON.stringify(car)), group };
  writeFileSync(ROOT + '/delivery/propcars.json', JSON.stringify(entries));
  let list = slice ? slicesOf(cars)[slice - 1] : cars.filter(c => only.includes(c.car.id));
  if (slice) list = list.slice(Number(flag('--from', 1)) - 1, Number(flag('--to', list.length)));
  if (!list.length) { console.log('no cars: --slice <n> or car ids'); process.exit(1); }
  mkdirSync(out, { recursive: true });
  // the pictures, one browser run
  const shots = list.map(c => c.car.id + '=propview.html?car=' + c.car.id + '&view=pair&w=1200&h=500');
  const run = spawnSync(process.execPath, [ROOT + '/scripts/shots.mjs', out, ...shots, '--browser=' + browser, '--size=1200x500', '--wait=2500'], { cwd: ROOT, encoding: 'utf8' });
  console.log((run.stdout || '').split('\n').filter(l => /shots in|FAIL|error:/.test(l)).join('\n'));
  if (run.status) console.log(run.stderr);
  // the labels, from the merged table
  const labels = {};
  for (const { car } of list) {
    const s = P.propSlots(car.id), e = P.PROP_TABLE[car.id];
    const cell = (slot) => (s[slot].supported ? slot.toUpperCase() + ' s' + s[slot].box.scale + (s[slot].existing ? '*' : '') : slot + ': no (' + (s[slot].reason || '?') + ')');
    labels[car.id] = car.id + '  [' + P.kindOf(car) + (e ? '' : ', NO ENTRY') + (P.HAND[car.id] ? ', hand' : '') + ']   ' + ['roof', 'cargo', 'wing'].map(cell).join('  |  ');
  }
  // the sheets (PIL): 12 cars a sheet, 2 columns
  const ids = list.map(c => c.car.id), name = slice ? String(slice) : 'cars';
  const py = `
import json, os
from PIL import Image, ImageDraw, ImageFont
ids = json.loads(${JSON.stringify(JSON.stringify(ids))}); labels = json.loads(${JSON.stringify(JSON.stringify(labels))}); out = ${JSON.stringify(out)}; name = ${JSON.stringify(name)}
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15); bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
except Exception: font = bold = ImageFont.load_default()
CW, CH = 900, 375
for k in range(0, len(ids), 12):
    page = ids[k:k + 12]; rows = (len(page) + 1) // 2
    im = Image.new('RGB', (CW * 2 + 15, 44 + rows * (CH + 26)), 'white'); d = ImageDraw.Draw(im)
    d.text((8, 8), 'PROP BOUNDS slice ' + name + ', sheet ' + str(k // 12 + 1) + ': roof BLUE, cargo GREEN, wing RED (box solid, cylinder dashed); magenta = the car\\'s own tagged prop; * = existing prop in that slot', fill='black', font=bold)
    for i, cid in enumerate(page):
        x = 5 + (i % 2) * (CW + 5); y = 44 + (i // 2) * (CH + 26)
        d.text((x + 4, y + 2), labels[cid], fill=(30, 30, 30), font=font)
        p = os.path.join(out, cid + '.png')
        if os.path.exists(p): im.paste(Image.open(p).resize((CW, CH)), (x, y + 22))
        else: d.text((x + 4, y + 60), 'no picture', fill=(170, 0, 0), font=font)
    f = os.path.join(out, 'sheet-' + name + '-' + str(k // 12 + 1) + '.png'); im.save(f); print(f)
`;
  const pil = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  console.log(pil.stdout + (pil.status ? pil.stderr : ''));
  console.log(existsSync(out) ? 'pictures in ' + out : '');
} finally { await close(); }
