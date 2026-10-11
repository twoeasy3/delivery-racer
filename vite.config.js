import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'

// Delivery Racer only. The pages are in delivery/ (served at /delivery/ by `vite`); the code is src/delivery.
// Deployed as a static-assets Cloudflare Worker (wrangler.jsonc): no Worker script, so no Cloudflare plugin here.

// The build, for the front screen and for replays (src/delivery/version.js): the version in package.json (bumped by
// hand for a release), the commit it was built from, when, and `logic`: a fingerprint of the game's rules, the
// modules that decide what happens in a run. A replay records it, and one made under other rules is not played
// (REPLAY-NOTES.md). The pages, the editor, the words and what only draws or sounds are left out of it, so a change
// to those keeps every replay good; each level and each car has a fingerprint of its own besides (replay.js).
const NOT_RULES = new Set(['cargopage.js', 'editor.js', 'editorForms.js', 'gimmickspage.js', 'poweruppage.js', 'sides.js',
  'words.js', 'levelText.js', 'levelinfo.js', 'nav.js', 'main.js', 'messages.js', 'cargo.js', 'horn.js', 'version.js', 'replay.js'])
const logic = (() => {
  const dir = 'src/delivery/', hash = createHash('sha256')
  for (const file of readdirSync(dir).filter(f => f.endsWith('.js') && !NOT_RULES.has(f)).sort()) hash.update(file + '\0' + readFileSync(dir + file))
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
        cargo: 'delivery/cargo.html',
      },
    },
  },
})
