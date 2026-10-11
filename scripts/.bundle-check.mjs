// A check that every import in the game's pages resolves (a name a module doesn't export is an error here,
// where the browser would only say so on loading the page): the pages bundled in memory, nothing written.
//   node scripts/.bundle-check.mjs
import { build } from 'esbuild';
const pages = ['main', 'poweruppage', 'gimmickspage', 'sides', 'police', 'editor', 'cargopage'].map(p => 'src/delivery/' + p + '.js');
const loader = { '.wav': 'empty', '.jpg': 'empty', '.png': 'empty', '.css': 'empty', '.svg': 'empty' };
const result = await build({ entryPoints: pages, bundle: true, write: false, outdir: 'out', format: 'esm', logLevel: 'silent', loader }).catch(e => e);
const errors = result.errors || [], warnings = (result.warnings || []).filter(w => w.id !== 'empty-glob');
for (const m of [...errors, ...warnings]) console.log((errors.includes(m) ? 'ERROR ' : 'warn  ') + m.text + (m.location ? '  (' + m.location.file + ':' + m.location.line + ')' : ''));
console.log(errors.length ? errors.length + ' FAILED' : 'all imports resolve');
process.exit(errors.length ? 1 : 0);
