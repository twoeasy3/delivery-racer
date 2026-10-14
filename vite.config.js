import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { posix } from 'node:path'

// Delivery Racer only. The pages are in delivery/ (served at /delivery/ by `vite`); the code is src/delivery.
// Deployed as a static-assets Cloudflare Worker (wrangler.jsonc): no Worker script, so no Cloudflare plugin here.

// The build, for the front screen and for replays (src/delivery/version.js): the version in package.json (bumped by
// hand for a release), the commit it was built from, when, and `logic`: a fingerprint of the game's rules, the
// modules that decide what happens in a run. A replay records it, and one made under other rules is not played
// (REPLAY-NOTES.md). The pages and their catalogues, the editor, the words and what only draws or sounds are left out
// of it, so a change to those keeps every replay good; each level and each car has a fingerprint of its own besides
// (replay.js). What the rules read is in it too, followed through their imports: a model, a JSON file, whatever it
// is (the obstacles' models are only drawn today, their sizes in collision.js; should a rule ever measure a model,
// that model joins the fingerprint by itself). Not the level files, which the level's own fingerprint covers.
const NOT_RULES = new Set(['cargopage.js', 'editor.js', 'modeleditor.js', 'editorForms.js', 'gimmickspage.js', 'poweruppage.js', 'sides.js',
  'gimmicks.js', 'police.js', 'powerups.js', 'words.js', 'levelText.js', 'levelinfo.js', 'nav.js', 'main.js', 'messages.js',
  'cargo.js', 'version.js', 'replay.js', 'replaystore.js', 'events.js',
  'packs.js', 'jimshop.js']) // (Crazey Jim's blueprint stall, like the packs: a menu thing, never read in a run; card packs: given and opened on the menu and the results, never in a run; their odds, packs.json, tuned without refusing replays)
const LOGIC_DIR = 'src/delivery/'
export const logicFiles = () => {
  const files = new Set(readdirSync(LOGIC_DIR).filter(f => f.endsWith('.js') && !NOT_RULES.has(f)))
  for (const file of files) { // (the set grows as it is walked: each new file's imports are followed in turn)
    for (const [, path] of readFileSync(LOGIC_DIR + file, 'utf8').matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const to = posix.normalize(posix.join(posix.dirname(file), path))
      if (!to.startsWith('..') && !to.startsWith('levels/') && !NOT_RULES.has(to) && /\.(js|json)$/.test(to)) files.add(to)
    }
  }
  return [...files].sort()
}
const logic = (() => {
  const hash = createHash('sha256')
  for (const file of logicFiles()) hash.update(file + '\0' + readFileSync(LOGIC_DIR + file))
  return hash.digest('hex').slice(0, 10)
})()
const git = (cmd) => { try { return execSync('git ' + cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' } }
const BUILD = {
  version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  commit: (process.env.WORKERS_CI_COMMIT_SHA || git('rev-parse HEAD')).slice(0, 7),
  date: new Date().toISOString().slice(0, 10),
  logic,
}

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  build: {
    rollupOptions: {
      input: {
        delivery: 'delivery/index.html', powerups: 'delivery/powerups.html', sides: 'delivery/sides.html',
        police: 'delivery/police.html', editor: 'delivery/editor.html', gimmicks: 'delivery/gimmicks.html',
        cargo: 'delivery/cargo.html', modeleditor: 'delivery/modeleditor.html',
      },
    },
  },
})
