#!/usr/bin/env node
// SERVE the kit for the interactive viewer: node tools/serve.mjs [--port 8123], then open the address it prints
// (index.html: orbit with the mouse, Good / Evil, wireframe, mounts, spinning wheels, the checks; ?spec=examples/van.car.json).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveFolder } from './lib/browser.mjs';
const args = process.argv.slice(2), i = args.indexOf('--port');
const { url } = await serveFolder(resolve(dirname(fileURLToPath(import.meta.url)), '..'), i >= 0 ? +args[i + 1] : 8123);
console.log('Car kit viewer: ' + url + 'index.html  (Ctrl+C to stop)');
