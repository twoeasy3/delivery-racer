import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { applyChanges } from './scripts/placements-lib.mjs'
import { fingerprints } from './scripts/logic-hash.mjs'

// Delivery Racer only. The pages are in delivery/ (served at /delivery/ by `vite`); the code is src/delivery.
// Deployed as a static-assets Cloudflare Worker (wrangler.jsonc): no Worker script, so no Cloudflare plugin here.

// The build, for the front screen and for replays (src/delivery/version.js): the version in package.json (bumped by
// hand for a release), the commit it was built from, when, and `logic`: a fingerprint of the game's rules, the
// modules that decide what happens in a run. A replay records it, and one made under other rules is not played
// (REPLAY-NOTES.md). The pages and their catalogues, the editor, the words and what only draws or sounds are left out
// of it, so a change to those keeps every replay good; each level and each car has a fingerprint of its own besides
// (replay.js). What the rules read is in it too, followed through their imports: a model, a JSON file, whatever it
// is. HOW it is taken is scripts/logic-hash.mjs: the rules as code (comments and layout never count), each car's and
// each level's own rows left out (their own prints in the replay hold them), so adding a car or a level refuses no
// replay (CHECKLIST 167). `legacy`: the fingerprint as it was taken until v1.1.149 (the files' whole text), for the
// replays recorded then (replay.js check).
export { logicFiles } from './scripts/logic-hash.mjs'
const { logic, legacy } = fingerprints()
const git = (cmd) => { try { return execSync('git ' + cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' } }
const BUILD = {
  version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  commit: (process.env.WORKERS_CI_COMMIT_SHA || git('rev-parse HEAD')).slice(0, 7),
  date: new Date().toISOString().slice(0, 10),
  logic,
  legacy,
}

// THE MODEL EDITOR'S PLACEMENTS, WRITTEN INTO THE BUILD (the owner, 15-Oct: "I don't want them as patches but definitive build commands"):
// under `vite` (the dev server only, never the build), POST /__placements takes the editor's change file and writes the car's hand rows
// into src/delivery/render/propanchors/slice-<n>.json and its plate entries into render/plateanchors.js (scripts/placements-lib.mjs, the same
// code as `node scripts/bake-placements.mjs <file>`, the way in for a page with no dev server). GET says it is there. Same-origin only.
// The page that wrote does not reload for its own write (it updates itself); others see the files on their next load.
const placementsWriter = () => {
  const written = new Map() // file -> when this endpoint wrote it
  return {
    name: 'placements-writer',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      server.middlewares.use('/__placements', (req, res) => {
        const send = (code, body) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)) }
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) return send(403, { ok: false, error: 'not from this page' })
        if (req.method === 'GET') return send(200, { ok: true, write: true })
        if (req.method !== 'POST') return send(405, { ok: false, error: 'GET or POST' })
        let body = ''
        req.on('data', (c) => { body += c; if (body.length > 500000) req.destroy() })
        req.on('end', () => {
          try {
            const file = JSON.parse(body)
            const out = applyChanges(root, file, { dry: !!file.dry })
            for (const f of out.files) written.set(resolve(f), Date.now())
            send(200, { ok: true, dry: !!file.dry, results: out.results, diff: out.diff, files: out.files.map(f => relative(root, f).replace(/\\/g, '/')) })
          } catch (err) { send(400, { ok: false, error: err.message }) }
        })
      })
    },
    hotUpdate({ file }) { const t = written.get(resolve(file)); if (t && Date.now() - t < 5000) return [] },
  }
}

export default defineConfig({
  plugins: [placementsWriter()],
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
