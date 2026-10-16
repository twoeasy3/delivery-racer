// THE REPLAY RULES FINGERPRINT (vite.config.js BUILD.logic; src/delivery/replay.js; REPLAY-NOTES.md "The fingerprints").
// A replay is played only under the rules it was recorded with. What decides a run is split three ways:
//   the RULES   the modules that decide what happens in a run (every src/delivery/*.js not on NOT_RULES, and what they
//               import, followed: a JSON table too), hashed HERE, at build time, into BUILD.logic
//   the CAR     the car driven: its row as the game has it, its ECU figures, its Super version (replay.js, at run time)
//   the LEVEL   the level driven: its data as loaded (replay.js levelPrint, at run time); and the garage's cars, which
//               drive as traffic and which Car Swap lends (replay.js rosterPrint)
// ADDING A CAR OR A LEVEL MUST NOT REFUSE EVERY REPLAY (the owner, 12-Oct, CHECKLIST 167). So the rules are hashed as
// CODE, not as text: each file parsed (comments and layout never count), and what is one car's or one level's own data
// left out of it, because the replay's own car and level prints (above) already hold what a run reads of them:
//   - in the car tables (CAR_FILES): a car's row (an object with an `id: '...'` in a list, bare or handed to a helper:
//     bespoke({ id, ... }), filler(1, { id, ... })), and a car's entry in a table by car id (KEY_RATING, DELIVERY,
//     COMPOSURE.bump...: an object at least half of whose keys are car ids); ecus.json's entries
//   - in levels.js: a level file's import, and the level in the menu's lists and the hidden levels (the level itself,
//     as the game loads it, is the level's print)
// A row or entry with code in it (a function) is never left out: a car's print does not see code. Anything else, in
// any rules file (CONFIG, the traffic kinds, the cargo, the code of cars.js itself) counts as ever. So adding a car
// (to any list but the garage's CARS, which traffic and Car Swap read: the roster print) or a level changes no replay,
// and changing the car or level a replay used, or any rule, still refuses it.
// `legacy` is the fingerprint as it was until v1.1.149 (each file's whole text): a replay recorded under it still plays
// while the rules files are byte for byte what they were (replay.js check), and is brought up to the new prints then.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { posix } from 'node:path'
import { parseAst } from 'vite'

export const LOGIC_DIR = 'src/delivery/'
// the modules that are not rules: the pages and their catalogues, the editor, the words and what only draws or sounds
// (a change to these keeps every replay good)
export const NOT_RULES = new Set(['cargopage.js', 'editor.js', 'modeleditor.js', 'editorForms.js', 'gimmickspage.js', 'poweruppage.js', 'sides.js',
  'gimmicks.js', 'police.js', 'powerups.js', 'words.js', 'levelText.js', 'levelinfo.js', 'nav.js', 'main.js', 'messages.js',
  'cargo.js', 'version.js', 'replay.js', 'replaystore.js', 'events.js',
  'packs.js', 'jimshop.js', 'unlockall.js']) // (Crazey Jim's blueprint stall, like the packs: a menu thing, never read in a run; card packs: given and opened on the menu and the results, never in a run; their odds, packs.json, tuned without refusing replays)
// the car tables: where a car's own rows and entries are (a file not in the rules is never read here)
export const CAR_FILES = /^(cars\.js|ecu\.js|ecus\.json|ideas[A-Za-z0-9]*\.js)$/
// the level registry: where a level file is imported and listed
export const LEVEL_FILES = /^levels\.js$/

const fromDisk = (dir) => (file) => readFileSync(dir + file, 'utf8')
// the rules files, sorted: every module of src/delivery not on NOT_RULES, and what they import (followed), not the level files
export const logicFiles = (dir = LOGIC_DIR, read = fromDisk(dir), list = () => readdirSync(dir)) => {
  const files = new Set(list().filter(f => f.endsWith('.js') && !NOT_RULES.has(f)))
  for (const file of files) { // (the set grows as it is walked: each new file's imports are followed in turn)
    for (const [, path] of read(file).matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const to = posix.normalize(posix.join(posix.dirname(file), path))
      if (!to.startsWith('..') && !to.startsWith('levels/') && !NOT_RULES.has(to) && /\.(js|json)$/.test(to)) files.add(to)
    }
  }
  return [...files].sort()
}

// the fingerprint until v1.1.149: every rules file's whole text
export const legacyHash = (files, read) => {
  const hash = createHash('sha256')
  for (const file of files) hash.update(file + '\0' + read(file))
  return hash.digest('hex').slice(0, 10)
}

// ---- the parse ----
const POSITION = new Set(['start', 'end', 'range', 'loc'])
// a node as text: its shape and values, not where it sits (so not its comments or its layout)
const write = (node, out) => {
  if (node === null || node === undefined) { out.push('~'); return }
  if (typeof node === 'bigint') { out.push(node + 'n'); return }
  if (node instanceof RegExp) { out.push(String(node)); return }
  if (typeof node !== 'object') { out.push(JSON.stringify(node)); return }
  if (Array.isArray(node)) { out.push('['); for (const item of node) { write(item, out); out.push(',') } out.push(']'); return }
  out.push('{')
  for (const key of Object.keys(node)) {
    if (POSITION.has(key) || node[key] === undefined) continue
    out.push(key, ':'); write(node[key], out); out.push(',')
  }
  out.push('}')
}
const walk = (node, visit, parent = null) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { for (const item of node) walk(item, visit, parent); return }
  if (typeof node.type !== 'string') return
  visit(node, parent)
  for (const key of Object.keys(node)) if (!POSITION.has(key)) walk(node[key], visit, node)
}
const hasCode = (node) => { let code = false; walk(node, (n) => { if (/Function/.test(n.type)) code = true }); return code }
const keyOf = (prop) => prop.type !== 'Property' || prop.computed ? null
  : prop.key.type === 'Identifier' ? prop.key.name : prop.key.type === 'Literal' ? String(prop.key.value) : null
const idOf = (obj) => {
  if (obj?.type !== 'ObjectExpression') return null
  const p = obj.properties.find(q => keyOf(q) === 'id')
  return p && p.value.type === 'Literal' && typeof p.value.value === 'string' ? p.value.value : null
}
// a car's row: { id: '...', ... } in a list, or a helper's call with one among its arguments (bespoke({ id ... }))
const rowId = (el) => el?.type === 'ObjectExpression' ? idOf(el)
  : el?.type === 'CallExpression' ? el.arguments.map(idOf).find(Boolean) || null : null

// the car ids the car tables name: their rows' ids and ecus.json's keys
export const carIds = (files, read) => {
  const ids = new Set()
  for (const file of files.filter(f => CAR_FILES.test(f))) {
    if (file.endsWith('.json')) { for (const k of Object.keys(JSON.parse(read(file)))) ids.add(k); continue }
    walk(parseAst(read(file)), (n) => {
      if (n.type === 'ArrayExpression') for (const el of n.elements) { const id = rowId(el); if (id) ids.add(id) }
      if (n.type === 'ObjectExpression') for (const p of n.properties) { const id = idOf(p.value); if (id && id === keyOf(p)) ids.add(id) } // (LEVEL_CARS: ufo: { id: 'ufo', ... })
    })
  }
  return ids
}

// a rules file as hashed: { text, left: [what was left out, as 'table: id'] }
export const canonical = (file, source, cars = new Set()) => {
  const left = []
  if (file.endsWith('.json')) {
    const data = JSON.parse(source)
    if (CAR_FILES.test(file) && data && typeof data === 'object' && !Array.isArray(data)) {
      for (const key of Object.keys(data)) if (cars.has(key)) { left.push(file + ': ' + key); delete data[key] }
    }
    return { text: JSON.stringify(data), left }
  }
  const ast = parseAst(source)
  if (CAR_FILES.test(file)) {
    walk(ast, (n, parent) => {
      if (n.type === 'ArrayExpression') {
        n.elements = n.elements.filter(el => { const id = rowId(el); if (!id || hasCode(el)) return true; left.push(file + ' list: ' + id); return false })
      }
      if (n.type === 'ObjectExpression') {
        const keys = n.properties.map(keyOf), named = keys.filter(k => k !== null && cars.has(k)).length
        if (named && named * 2 >= keys.length) {
          const table = parent?.type === 'VariableDeclarator' ? parent.id.name : parent?.type === 'Property' ? keyOf(parent) : '?'
          n.properties = n.properties.filter(p => { const k = keyOf(p); if (k === null || !cars.has(k) || hasCode(p.value)) return true; left.push(file + ' ' + table + ': ' + k); return false })
        }
      }
    })
  }
  if (LEVEL_FILES.test(file)) {
    const levels = new Set()
    ast.body = ast.body.filter(s => {
      if (s.type === 'ImportDeclaration' && /^\.\/levels\/[^/]+\.json$/.test(s.source.value)) {
        for (const sp of s.specifiers) levels.add(sp.local.name)
        left.push(file + ' import: ' + s.source.value)
        return false
      }
      return true
    })
    const isLevel = (n) => n?.type === 'Identifier' && levels.has(n.name)
    // a statement that only files a level: HIDDEN_LEVELS['x'] = x; HIDDEN_LEVELS.x = x; Object.assign(HIDDEN_LEVELS, { 'x': x })
    const filesLevel = (s) => {
      const e = s.type === 'ExpressionStatement' ? s.expression : null
      if (e?.type === 'AssignmentExpression' && e.operator === '=' && e.left.type === 'MemberExpression' && isLevel(e.right)) return true
      return e?.type === 'CallExpression' && e.callee.type === 'MemberExpression' && e.callee.object.name === 'Object' && e.callee.property.name === 'assign'
        && e.arguments.length === 2 && e.arguments[1].type === 'ObjectExpression' && e.arguments[1].properties.every(p => p.type === 'Property' && isLevel(p.value))
    }
    ast.body = ast.body.filter(s => { if (!filesLevel(s)) return true; left.push(file + ' filed: a level'); return false })
    walk(ast, (n) => {
      if (n.type === 'ArrayExpression') n.elements = n.elements.filter(el => { if (!isLevel(el)) return true; left.push(file + ' list: ' + el.name); return false })
      if (n.type === 'ObjectExpression') n.properties = n.properties.filter(p => { if (p.type !== 'Property' || !isLevel(p.value)) return true; left.push(file + ' table: ' + keyOf(p)); return false })
    })
  }
  const out = []
  write(ast, out)
  return { text: out.join(''), left }
}

// the fingerprint: the rules files as code, each car's and each level's own data left out (see the top)
export const rulesHash = (files, read, { report = null } = {}) => {
  const cars = carIds(files, read)
  const hash = createHash('sha256')
  hash.update('rules/2\0')
  for (const file of files) {
    const { text, left } = canonical(file, read(file), cars)
    if (report) report.push(...left)
    hash.update(file + '\0' + text + '\0')
  }
  return hash.digest('hex').slice(0, 10)
}

// both, for the build (vite.config.js): { logic, legacy }
export const fingerprints = (dir = LOGIC_DIR) => {
  const read = fromDisk(dir), files = logicFiles(dir, read)
  return { logic: rulesHash(files, read), legacy: legacyHash(files, read) }
}
