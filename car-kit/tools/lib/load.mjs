// read a car spec: a .json file, or a .mjs / .js module whose default export is the spec object
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
export const loadSpec = async (file) => {
  const path = resolve(file);
  if (extname(path) === '.json') {
    const text = readFileSync(path, 'utf8');
    try { return JSON.parse(text); } catch (e) { throw new Error(file + ' is not valid JSON: ' + e.message, { cause: e }); }
  }
  const mod = await import(pathToFileURL(path).href + '?t=' + Date.now());
  const spec = mod.default ?? mod.spec;
  if (!spec || typeof spec !== 'object') throw new Error(file + ' must export the spec object as its default export');
  return JSON.parse(JSON.stringify(spec)); // (plain data only)
};
