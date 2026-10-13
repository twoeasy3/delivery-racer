// A check of the KEY CARDS' pre-rendered pictures (src/delivery/keyshots/<car id>.png, made by scripts/keys-png.mjs;
// shown by render/keycard.js keyPicture), headless: every key car (cars.js: a car with `bespoke` or a `keyModel`, the
// Bespoke cars and the event's Silver Comet) has a file; each file is a real PNG (its signature, IHDR, IDAT, IEND, the
// data unpacked and unfiltered) with an alpha channel that is used (clear corners, an opaque key), the card art's shape
// (1 : 0.9) and a sane size; no file is left for a car that has no key; keycard.js finds each (keyShotOf) and its key card
// shows the file at once (no live drawing queued), while another rarity or a car with no file still draws live.
// What the pictures look like is only seen in a browser (?pack=bespoke, ?shop&inside=ten).
//   node scripts/.keyshots-check.mjs
import { boot } from './delivery-headless.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const DIR = join(resolve(import.meta.dirname, '..'), 'src/delivery/keyshots');
const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };

// a PNG read far enough to say what it is: { w, h, type, alpha: { corners, opaque } } or { error }
const readPng = (buf) => {
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return { error: 'no PNG signature' };
  let at = 8, w = 0, h = 0, depth = 0, type = -1, interlace = 0, end = false;
  const idat = [];
  while (at + 8 <= buf.length) {
    const len = buf.readUInt32BE(at), name = buf.toString('latin1', at + 4, at + 8), data = buf.subarray(at + 8, at + 8 + len);
    if (name === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; interlace = data[12]; }
    else if (name === 'IDAT') idat.push(data);
    else if (name === 'IEND') { end = true; break; }
    at += 12 + len;
  }
  if (!w || !h || !idat.length || !end) return { error: 'chunks missing (IHDR ' + !!w + ', IDAT ' + idat.length + ', IEND ' + end + ')' };
  if (type !== 6 || depth !== 8 || interlace) return { w, h, type, error: 'not 8-bit RGBA, not interlaced (colour type ' + type + ', depth ' + depth + ')' };
  const raw = inflateSync(Buffer.concat(idat)), stride = w * 4, px = Buffer.alloc(stride * h);
  if (raw.length !== (stride + 1) * h) return { w, h, type, error: 'image data the wrong length' };
  for (let y = 0; y < h; y++) { // (unfiltered: None, Sub, Up, Average, Paeth)
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[o + x - 4] : 0, b = y ? px[o - stride + x] : 0, c = x >= 4 && y ? px[o - stride + x - 4] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      if (f > 4) return { w, h, type, error: 'a bad row filter' };
      px[o + x] = (row[x] + pred) & 255;
    }
  }
  const alphaAt = (x, y) => px[(y * w + x) * 4 + 3];
  let opaque = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] === 255) opaque++;
  return { w, h, type, corners: [alphaAt(0, 0), alphaAt(w - 1, 0), alphaAt(0, h - 1), alphaAt(w - 1, h - 1)], opaque: opaque / (w * h) };
};

try {
  const Cars = g.cars;
  const keyCars = [...Cars.EVENT_CARS, ...Cars.BESPOKE_CARS].filter(car => car && (car.bespoke || car.keyModel));
  check(keyCars.length >= 9 && keyCars.some(c => c.id === 'silvercomet'), keyCars.length + ' key cars, the Silver Comet among them: ' + keyCars.map(c => c.id).join(', '));
  const files = readdirSync(DIR);
  let total = 0, bad = [];
  for (const car of keyCars) {
    const file = car.id + '.png';
    if (!files.includes(file)) { bad.push(car.id + ': no file'); continue; }
    const buf = readFileSync(join(DIR, file)), png = readPng(buf);
    total += buf.length;
    const why = png.error || (png.w < 200 || png.w > 1200 ? 'width ' + png.w : '')
      || (Math.abs(png.h / png.w - 0.9) > 0.01 ? png.w + 'x' + png.h + ' not the card art\'s 1 : 0.9' : '')
      || (buf.length < 3000 || buf.length > 80000 ? (buf.length / 1024).toFixed(1) + ' KB' : '')
      || (png.corners.some(a => a !== 0) ? 'corners not clear (alpha ' + png.corners.join(',') + ')' : '')
      || (png.opaque < 0.05 || png.opaque > 0.7 ? 'opaque share ' + (png.opaque * 100).toFixed(0) + '%' : '');
    console.log(`        ${file.padEnd(18)} ${png.w}x${png.h}  ${(buf.length / 1024).toFixed(1)} KB  ${png.opaque ? (png.opaque * 100).toFixed(0) + '% opaque' : ''}`);
    if (why) bad.push(car.id + ': ' + why);
  }
  check(!bad.length, 'every key car has a PNG: RGBA, clear corners, an opaque key, 1 : 0.9, 3 to 80 KB' + (bad.length ? ' (' + bad.join('; ') + ')' : ''));
  const orphans = files.filter(f => !keyCars.some(c => c.id + '.png' === f));
  check(!orphans.length, 'no file in keyshots/ for a car with no key' + (orphans.length ? ' (' + orphans.join(', ') + ')' : ''));
  check(total < 600 * 1024, `the folder: ${files.length} files, ${(total / 1024).toFixed(1)} KB in all (under 600 KB)`);

  // keycard.js: finds each; a key card shows it at once; the fallback (another rarity, a car with no file) draws live
  const { keyShotOf, keyPicture, keyModelInUse } = await g.load('render/keycard.js');
  const missing = keyCars.filter(car => !String(keyShotOf(car) || '').endsWith('/keyshots/' + car.id + '.png'));
  check(!missing.length, 'keycard.js keyShotOf finds each key car\'s file' + (missing.length ? ' (not: ' + missing.map(c => c.id).join(', ') + ')' : ''));
  const other = (car) => ['fob', 'classic', 'smart'].find(m => m !== keyModelInUse(car));
  const comet = Cars.carById('silvercomet');
  check(keyShotOf(comet, keyModelInUse(comet), 'epic') === null && keyShotOf(comet, other(comet)) === null && keyShotOf(Cars.carById('commuter')) === null,
    'no file for another rarity, another key model, or a car with no key file (those draw live)');
  const el = () => ({ className: '', dataset: {}, style: {}, isConnected: false, getBoundingClientRect: () => ({ width: 0, height: 0 }), querySelector: () => null });
  globalThis.document = globalThis.document || {};
  const make = document.createElement;
  document.createElement = el;
  const pic = keyPicture(comet, 'bespoke');
  const live = keyPicture(comet, 'epic');
  document.createElement = make;
  check(/keyshots\/silvercomet\.png/.test(pic.style.backgroundImage || '') && pic.dataset.keyshot === 'silvercomet' && !pic._key,
    'the Silver Comet\'s key card: its file as the picture at once, nothing queued to draw (' + (pic.style.backgroundImage || 'none') + ')');
  check(!live.style.backgroundImage && !!live._key, 'an Epic key of it: no file, queued to draw live as before');
} catch (error) {
  check(false, 'threw: ' + (error?.stack || error));
} finally {
  await g.close?.();
}
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
