# Cargo rules

Every cargo model registers what must stay true of it in `src/delivery/render/cargoRules.js`; `scripts/.cargo-contain-check.mjs`
(render group) poses each model every 0.04 s in each state and through each change of state (calm, agitated, furious, calm >
agitated > furious, calm > furious, furious > agitated > calm; a Good item: 6 s idle) and fails on any rule broken. It also runs
the z-fight finder (render/zfight.js) on every cargo model and fails on flicker-class pairs (under 0.5 mm, not one colour) beyond
an item's known ones. An item with no entry fails, unless it is `static` (with a reason) or still on the frozen PENDING_AUDIT
list (which may only shrink). `node scripts/.cargo-contain-check.mjs [id ...] [--verbose]` (about 20 s for all).

**Parts are names.** Give the model's meshes or groups a `.name`; a mesh belongs to its nearest named ancestor. A selector is a
regular expression over whole names (`rat\\d`, `(?:tea|pearl)(\\d)`); `$1` in a container or partner selector is the part's own
first capture (`cup$1`: the part's own cup). A selector that names nothing in the model fails.

| rule | holds when | for |
|--|--|--|
| `keepOut: [{ a, b, min = 0.002, states }]` | no mesh of A within `min` m of a mesh of B (GJK on each mesh's convex hull) | parts that must not pass through each other; CONVEX parts only (a torus, a hollow shell or a U is read as its hull: split it, or use `inside`) |
| `inside: [{ part, of, shape, margin = 0.003, exits, only, states }]` | every vertex of the part inside `shape` (in node `of`'s frame) by `margin` | contents of a container; `shape`: `{ sphere: r, centre }`, `{ cone: { y0, y1, r0, r1 } }` (upright), `{ box: { min, max } }`; `exits: [{ at, r }]`: where it may go out (a hole, a doorway); `only`: a shape, just the vertices in it are held (the band of a collar a head goes through) |
| `anchors: [{ part, to, maxGap = 0.004, states }]` or `[{ part, of, shape, maxGap }]` | each instance of the part within `maxGap` of `to` (not itself), or of the shape's surface | nothing floats: it rests on something |
| `zfight: { allow, why }` | at most `allow` flicker-class pairs in any sample | known pairs, accepted for now |
| `static: 'why'` | (only the z-fight test) | an item with nothing in or on anything that moves |
| `runs` | the check's own runs instead of the six | an item whose trouble is elsewhere in time |

`states: [0, 1]`: the rule holds only once the item has settled in one of those states (0.5 s after a change).

A new KIND of problem gets a new rule kind here and in the check (with a line in this table), not a one-off check script.

## Examples

The rats in their cage: no rat through the cage, its door or another rat.

```js
rats: {
  keepOut: [{ a: 'rat\\d', b: 'cage|door' }, { a: 'rat\\d', b: 'rat\\d' }],
},
```

The hamster in its ball: inside the shell but for its head out of the hole, through the collar's opening, clear of the popped
hatch, its feet on the floor when calm or agitated.

```js
hamsterball: {
  inside: [
    { part: 'hamster|foot', of: 'ball', shape: { sphere: 0.42 }, margin: 0.004, exits: [{ at: [0, 0.42, 0], r: 0.21 }] },
    { part: 'hamster', of: 'ball', shape: { cone: { y0: 0, y1: 2, r0: 0.127, r1: 0.127 } }, only: { cone: { y0: 0.38, y1: 0.41, r0: 0.165, r1: 0.165 } } },
  ],
  keepOut: [{ a: 'hamster|foot', b: 'hatch' }],
  anchors: [{ part: 'foot', of: 'ball', shape: { sphere: 0.42 }, maxGap: 0.012, states: [0, 1] }],
},
```

The bubble teas: tea and pearls 6 mm inside each tapered cup, the cups clear of the carrier and of each other, on its floor.

```js
bubbletea: {
  inside: [{ part: '(?:tea|pearl)(\\d)', of: 'cup$1', shape: { cone: { y0: 0.002, y1: 0.5, r0: 0.11, r1: 0.15 } }, margin: 0.006 }],
  keepOut: [{ a: '(?:cup|glass)(\\d)', b: '(?:cup|glass)(?!$1)\\d' }],
  anchors: [{ part: 'glass\\d', to: 'floor', maxGap: 0.004 }],
},
```

What is still to do: `CARGO-AUDIT.md`.
