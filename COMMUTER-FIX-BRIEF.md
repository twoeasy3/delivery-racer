# Brief: make the Commuter look less ugly (paste into a new agent that can see the owner's photo reference)

Repo `/home/user/delivery-racer` (Delivery Racer: lane-based 3D delivery racer, three.js + Vite). **Pushing `main` deploys the game: NEVER push `main`.** Work on your own branch `claude/commuter-fix` in your own worktree.

## The job
The owner (a game designer working from a phone and a Mi Pad): "Let's make the Commuter look less ugly. This is the starter car and everyone's first impression." Redo the **Commuter's** model so it is attractive, readable at card size, and still obviously the humble orange starter. He will give you **photo reference**: read the photos first (Read tool shows images) and design from them. He wants **three drafts** (genuinely different silhouettes, each its own branch `claude/commuter-fix-a|b|c`) so he can pick one, then the pick is finished and polished.

An earlier attempt produced two drafts that "look nothing like the Commuter" (the brief had been loose: it said to keep the identity and then drifted). They are now being turned into separate idea cars. So: **the result must read as the same car, improved**: keep the Commuter's identity (see "What the Commuter is") unless the photos say otherwise.

## Setup
```
git fetch origin
git worktree add .claude/worktrees/commuter-fix-a -b claude/commuter-fix-a origin/main    # likewise b, c
ln -s /home/user/delivery-racer/node_modules .claude/worktrees/commuter-fix-a/node_modules  # (a symlink to the main checkout's node_modules; the old shared worktree path does not exist)
```
Read first, in order: `CLAUDE.md`, `CLOUD-AGENT-README.md`, `src/delivery/HANDOVER-orchestrator-15-Oct.md`, `CAR-AGENT-PROMPT.md` (the modelling rules; **the Junker is the detail benchmark**, not the old Commuter), `LAMP-PLACEMENT-GUIDE.md`, `PROP-AUDIT-GUIDE.md` (plates/props), `GLASS-AGENT-BRIEF.md` (glass), and the CHECKLIST items for the Commuter, plates (v1.1.141), lamps and glass (grep).

## What the Commuter is (verified against the repo, check again)
- `cars.js` ~line 185: `{ id: 'commuter', tier: 1, name: 'Commuter', price: 0, color: 0xff7a1a (orange), evilColor: 0x151515, fixedLivery: true, model: 'commuter', maxSpeed 24, accel 10, crossing 0.6, health 85, hw 0.85, hl 1.85, height 1.45 }`. The starter, free, 1 star.
- Built by `ORIG1B_MODELS.commuter` in `src/delivery/render/modelsOrig1b.js` (~line 179; geometry cache key `'commuter' + [W, L]`), handed over by `render/models.js` (~line 707). Same file builds `miata`.
- **It is also the commonest TRAFFIC car** (`CONFIG.vehicles`, config.js) and appears in `render/storm.js` (`{ model:'commuter', hw 0.85, hl 1.85, height 1.45 }`), the ordinary-keys card (`render/keycard.js`), engine sound (`render/audio.js`), and **the Legendary Commuter reuses the same model** (`cars.js` `legendCar({ id: 'l-commuter', model: 'commuter', legend: 'commuter' })`, with decals in `render/legenddecal.js`: arch over the rear wheel, `gold: [0x232529 black bumpers/mouth/grille/sill skirt, 0xc4c8ce silver hub caps]`). A new body changes all of those: check each, and keep the Legendary's decals and gold recolour working (re-map the part colours it names).
- Hitbox and gameplay **must not change**: keep the footprint within about 5% of the current (hw 0.85 = 1.7 m wide, hl 1.85 = 3.7 m long, height 1.45 m). Do not touch stats. Traffic spawning uses these figures.
- Lamps: `render/carlights.js` `commuter:` entry; plate anchors: `render/plateanchorstable.js` `commuter: { r: [...], f: [...] }`; prop slots: `render/propanchors/slice-*.json` (grep `commuter`); glass is `cabinGlass` (panes follow the body). All of these must be re-seated for the new body with the repo's tools (below).

## First: look, then diagnose, then draft
1. Read the owner's photos. Write down what they show (the character to aim for).
2. Take stills of the CURRENT Commuter (front, 3/4 front, side, rear, top, the garage card, Evil colour) and READ them. Write two lines on what makes it ugly (proportions, flat front, wheels, glass, colour breaks).
3. Three drafts, different in silhouette (not tweaks), each plain, lovable and believable, a clear step up from the Junker's quality bar yet still a humble starter. Show them side by side with the original.

## Modelling rules (from CAR-AGENT-PROMPT.md; read the file, it is the authority)
Shaped front end (a real grille, bonnet and wings: never a flat slab); chunky silhouette that reads at card size; character through surface treatment (soft-edged weathering, small canvas-drawn textures); **12 to 25 shapes, 1,000 to 2,200 triangles (3,000 hard cap)**; no panel lines; plain chunky wheels; no z-fighting (coplanar faces), no black faces (an open top), no floating parts, wheels not through arches; look from all sides; textures drawn in code on a canvas only, never image files, at most 256 x 256, report sizes. **No humans, no driver figure.** Lamps: its own headlight, taillight and blinker placements in the lamp table. Do not mention a colour in the car's note. Good stays orange, Evil dark; `fixedLivery` behaviour stays.

## Re-seating the dependents (do all of them, say what you ran)
- Lamps: `LAMP-PLACEMENT-GUIDE.md` (the viewer: `claude/lamp-viewer` branch if you need it is unmerged: read before using).
- Plates: `scripts/plate-search.mjs`, `scripts/plate-placement-audit.mjs`, `scripts/plate-anchors.mjs`. NOTE a separate agent is changing the plate rules on branch `claude/plate-rules` (bumper bars become valid places; a plate may stand proud of the bar). Use the plate rules on `main` today; do not edit those scripts; if the Commuter's plates are poor, say so and use the Placements tab of the model editor or a hand row.
- Props (roof prop, cargo prop, rear wing): `scripts/prop-anchors.mjs`, `scripts/prop-placement-audit.mjs`, `PROP-AUDIT-GUIDE.md`.
- Glass: the cabin's windows (`GLASS-AGENT-BRIEF.md`); the model editor (`delivery/modeleditor.html?car=commuter`) can show panes, mirror mode is on by default.
- Legendary Commuter (`legenddecal.js`) and traffic (the Commuter is everywhere: check it from the driving camera at distance and in a queue).
- The card pictures `carshots/commuter-*.jpg`: stale for the pick; re-shoot only for the chosen draft.
- Checks that record the Commuter's triangle baseline (`.proptag-check`, `.platetag-check`) will fail on any redraw: update their baselines only for the CHOSEN draft, never for the others.

## Checks and pictures
`node --check` and eslint on changed files; `node scripts/delivery-tests.mjs --group cars --no-lock` and `--changed --no-lock`; the lamp / glass / proptag / platetag checks that touch the Commuter. **Known failing on `main`, ignore:** `.pursuit-check`, `.strike-levels-check`, flaky `.keyspin-check`, `.platecosmetic-check`, `.cosmetics-own-check`. **Never run the full smoke test.** Report triangles and draw calls per draft.

Pictures ONLY via `scripts/shots.mjs` (`--browser=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`), **one at a time** (4 cores shared with other agents). No custom Vite or virtual-time render harnesses (the owner was furious when one took 4 minutes). Per draft: front, 3/4 front, side, rear, top, the garage/showroom card, Evil colour, the Legendary Commuter, and a before/after pair with the original; plus one side-by-side sheet of all three and the original. **Read every still yourself** and fix what you see before you report (do not trust a contact sheet you have not looked at). Copy the stills for the owner into the scratchpad directory (the orchestrator forwards them with SendUserFile; the owner reads on a phone).

## Owner's standing rules
No merge to `main`, no version bump (the orchestrator bumps `1.1.N`), no `git stash` (shared across worktrees), never `pkill -f`, no force-push, never delete `.wav`/sound assets, no humans or figures, keep UI/helper text short. Do not edit `CARS-CATALOGUE.md`. Top speed is the most important stat: untouched here. Be honest about what was NOT verified (not driven by hand, motion unseen, no real device, software-GL stills).

## Housekeeping
Add ONE CHECKLIST item (next free number after the highest in `CHECKLIST.md`; tell the orchestrator the number) naming the branches and saying plainly what was and was not verified. Commit each whole piece with trailers:
```
Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014trpRSggBreKZkfpJKwWKg
```
Push all branches (`git push -u origin <branch>`).

## FINAL REPORT format
1. What the photos show and what was ugly (evidence: still names).
2. Per draft: idea, branch, commit, tris and draw calls, what you saw in each still, known flaws.
3. Dependents re-seated (lamps, plates, props, glass, Legendary, traffic): what you ran and the result.
4. Check results (and which failures are the known ones).
5. Which draft you would pick and why (two lines); what you did not verify.
