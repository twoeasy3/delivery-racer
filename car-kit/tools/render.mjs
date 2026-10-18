#!/usr/bin/env node
// RENDER a car spec to pictures: node tools/render.mjs <spec.car.json> [--out <dir>] [--browser=<chrome>] [--only=front34,chase]
// Writes one PNG per view and <id>-sheet.png (every view on one labelled contact sheet) into the out folder (default
// renders/<id>/ next to the kit). Needs a Chrome or Chromium (found by itself; else --browser= or CHROME_PATH); no network.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSpec } from './lib/load.mjs';
import { launch, serveFolder } from './lib/browser.mjs';
import { validateSpec } from '../engine/validate.mjs';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf('--' + k); if (i >= 0) return args[i + 1]; const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
if (!file) { console.log('usage: node tools/render.mjs <spec.car.json> [--out <dir>] [--browser=<path>] [--only=a,b]'); process.exit(2); }
const t0 = Date.now();
const spec = await loadSpec(file);
const { errors } = validateSpec(spec);
if (errors.length) { console.log('The spec has errors (run tools/check.mjs for all of them):\n  ' + errors.slice(0, 10).join('\n  ')); process.exit(1); }
const out = resolve(opt('out') || join(KIT, 'renders', spec.id));
mkdirSync(out, { recursive: true });
const { server, url } = await serveFolder(KIT);
const browser = await launch(opt('browser'));
let code = 0;
try {
  const page = await browser.page(url + 'engine/render.html', { width: 1600, height: 1000 });
  for (let i = 0; i < 200; i++) { if (await page.evaluate('window.kitReady === true').catch(() => false)) break; await new Promise(r => setTimeout(r, 50)); }
  const only = opt('only') ? opt('only').split(',') : null;
  const res = await page.evaluate('window.renderSpec(' + JSON.stringify(spec) + ', ' + JSON.stringify({ only }) + ')');
  const save = (name, dataUrl) => { const p = join(out, name + '.png'); writeFileSync(p, Buffer.from(dataUrl.split(',')[1], 'base64')); return p; };
  for (const name of res.order) save(spec.id + '-' + name, res.images[name]);
  const sheet = save(spec.id + '-sheet', res.sheet);
  console.log('rendered ' + res.order.length + ' views of ' + spec.id + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  console.log('  contact sheet: ' + sheet);
  console.log('  views: ' + out + '/' + spec.id + '-<view>.png  (' + res.order.join(', ') + ')');
  console.log('Now LOOK at the contact sheet and say what you see, then run: node tools/check.mjs ' + file);
} catch (e) { console.log('render failed: ' + (e.stack || e)); code = 1; }
browser.close(); server.close();
process.exit(code);
