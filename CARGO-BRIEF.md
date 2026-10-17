# Cargo agents: brief

Applies to every agent that makes or changes a cargo model (`src/delivery/render/themes/*Cargo.js`, `cargoModels*.js`).
Read `CLOUD-AGENT-README.md` first. Keep UI text terse. Everything must be cheap to run: pooled geometry, no textures where avoidable, nothing created per frame, low-end devices in mind.

## Owner's complaints so far (each is a defect class to prevent)

1. **Z-fighting.** Coplanar or near-coplanar faces flicker.
   - Maple Syrup: gold band top level with the tin top (fixed on `claude/syrup-fix`).
   - Case of Chianti: crate z-fights.
   - `CARGO-ZFIGHT.md` (on `claude/syrup-fix`) lists 51 models with flicker-class pairs. Worst: surfboard, toolbox, reactor, goldbar, winecase. Most pairs at any distance: chainletter 72, horseshoes 30, wardens 20, jumper 16, taxmen 15, telemarketers 13.
   - Rule: no two surfaces within a few mm unless one is clearly buried or proud. Run `render/zfight.js` over every state (calm, up, rage), several times, and mid-transition. 0 flicker-class pairs.
2. **Things phasing through other things.**
   - Tunnel Rats: escaped mouse phases through the door; door opened the wrong way and the cage still looked closed; rails crossed the doorway.
   - Pet-Shop Hamster Ball: hamster phases through the ball.
   - Bubble Tea: drink phases through the cups.
   - Rule: a part is inside its container, outside its keep-out, or passing a declared exit. Never half in a wall.
3. **Floating or unanchored parts.** New Neighbour's Fruit Basket: banana floated (fixed on `claude/fruitbasket`). Every part touches or is held by something.
4. **Half-rendered, open, or void geometry.** Open tubes with no ends, flat black discs where an inside should be, shapes that show only one side. Close every shape; give insides a surface; check from all sides.
5. **Wrong shape for the object.** Must read as the real thing at game size.
   - Horseshoes are flat and U-shaped.
   - Cheese wedge is cut out of the wheel, all faces visible, not embedded.
   - Bubble tea caps are smooth domes with a straw, not jagged.
   - Pineapple must not look diseased (diamond skin, leaf crown).
6. **Wrong direction or motion in rage.** Tunnel Rats ran backwards when furious. Motion must match facing. Weights calm/up/rage are exclusive in steady state.
7. **Effects that do not convince.** Syrup furious jet needed a real arcing stream with drops. Judge by stills at several times, not just one.
8. **Bad lighting or backdrop ratio** is not cargo, but the same bar applies: look at the picture before saying done.

## Standing requirements for every new or changed cargo

- Register **containment rules** in `src/delivery/render/cargoRules.js` (being built by the cargo batch agent on `claude/rats-fix`): containers, keepOut, anchors, exits, clearances. Pass `scripts/.cargo-contain-check.mjs`. No rules entry = check fails unless listed static with a reason.
- If your model has a problem the vocabulary cannot express, add a new rule kind to the vocabulary and document it in `CARGO-RULES.md`. Do not write a one-off check.
- Z-fight detector clean on all states (above).
- Stills before and after, at calm, up and rage, from front, side and back, plus the small corner icon size. Read them yourself; say what you looked at and what you did not.
- Do not hand-wave "verified": say what was measured, what was seen, what was not.
- Replay fingerprint must not move (render-only). Add a CHECKLIST entry with the verified and unverified lists.
- Triangle and geometry budget stated in the report.

## Done list

- Fixed on branches, not merged: Maple Syrup (`claude/syrup-fix`), Fruit Basket (`claude/fruitbasket`).
- In progress (`claude/rats-fix`): Tunnel Rats, Hamster Ball, Chianti, Horseshoes, Cheese, Bubble Tea, `CARGO-AUDIT.md`, containment check, `CARGO-RULES.md`.
- Not started: the z-fight survey list above, worst first.
