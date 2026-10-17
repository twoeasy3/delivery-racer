# Progressive unlock: a design and a first version (16-Oct)

The owner (16-Oct): "Let's progressively unlock parts of the game for a new player." A brand-new save should meet a SIMPLE
game first (drive, deliver, earn, buy a better car), and the rest should appear in a sensible order as it is earned, each with a
short introduction. Nothing may be taken away from an existing player.

Built on branch `claude/progressive-unlock`, stacked on `claude/new-player` (the Driving Lesson, the Better ride nudge,
`NEW-PLAYER-IDEAS.md`). NOT merged, no version bump. The first version is behind a switch: **off, nothing changes for anyone**.

## 1. Audit: what a brand-new save meets today

Stills (phone 390x844, a clean browser profile, `scripts/shots.mjs`): the front screen, the Options sheet, the showroom.

**On the first launch, all at once:**

| Where | What | Of use to a new player? |
|---|---|---|
| Header | EVENTS tab **with a green dot** (Comet Hunt / Car Hunt, Christmas Eve), CAREER, RACES | Career only. The first thing that glows is Events |
| Header | Bank, **Shop chip with a green dot** (the free Daily pack), **Jim chip** (the blueprint stall), Options | Bank only |
| Tier chips | ★ to ★★★★★ and the Blue tiers (shut ones dimmed) | Yes: a goal |
| Level card | Expressway, cargo (Tower of pizzas), **GOOD and EVIL medals**, clock, tip, best, the tier car rule, "★ medals 0/10", What's on this road | Mostly; "0/10" counts Evil medals |
| Side | Car card (Commuter), **GOOD / EVIL** switch with no explanation, START | Evil not explained |
| Options | Settings; **Wheels** (Cosmetics); **Extras** (Postcards, Milestones, Hidden levels, two screensavers, two links); Guide (Power-ups, Gimmicks, Cargo, Good & Evil, Police, **Level editor, Model editor**); Save (Export, Import, Unlock everything, **Add 100,000 Crazey Cash**, Reset); How to play | Settings, How to play |
| Showroom | "1 / 109 cars"; **8 blueprint cars first** ("0/5 BLUEPRINTS", from packs or the Car Hunt) before the Junker; Shop gem; Good/Evil; Style; filters | The Junker (9th card) and Darkvan (11th) |
| Results | Restart (big), Next level, **Watch replay, Save replay, Look around**, Menu | Next level |

**Gates that already exist in the code** (kept as they are): levels open by medals inside a tier and tiers by the last level
(tiers.js; achievable on Good alone: level 3 needs 2 medals, 4 needs 3, 5 needs 4 beaten); the Events tab is hidden when no event
is on (it never is: a Car Hunt is always on, CHECKLIST 348); the Replays chip shows only with a stored replay; the Shop dot only
with a free pack waiting; tier-locked / blueprint / key / unavailable cards in the showroom (some unobtainable cars hidden,
CHECKLIST 328); a cosmetic slot a car cannot wear has no tab (render/cosmeticslots.js `supports`); amphibious and special levels
by rules of their own; hidden levels only in Options; one-star cars are ECU 1/1 (no upgrades); the first card pack at the fifth
first delivery; postcards per level; Unlock everything (Options, `?unlockall`).

## 2. The ladder

Counted on the save only: **deliveries** = career levels delivered on either side (a best time exists; never goes down). Money is
never a trigger (it goes down when spent). Each rung's thing is **not drawn** while shut; when it opens, the thing gets a pulsing
outline and a small card says what it is in one line (OK, or using the thing, and it is seen).

| # | Gate | Opens when | Intro (one line) | What it shows | Cost | Risk |
|---|---|---|---|---|---|---|
| 0 | (always) | brand-new save | (none) | Career tab, tiers, level card, car card (Showroom: pick and buy; the Garage is under Options since CHECKLIST 451), **Good and Evil** (the switch, both medals, E, Guide > Good & Evil; a ladder save also gets a two-word hint in each half: "gifts · more time" / "fire · less time"), START, bank, Options: settings, guide, save, how to play | | |
| 1 | Better cars | 1st delivery | Your bank buys cars. Tap your car. | (intro only: the car card) | UI | low |
| 2 | Replays | 2 deliveries | Watch and save your runs. | Results' Watch / Save replay / Look around, the stage's Replays chip | UI | low |
| 3 | Style | a car bought, or 3 deliveries | Wheels, plates and more: Showroom, Style. | Options > Wheels, the showroom's Style button | UI | low |
| 4 | Races | 4 deliveries | Lapped circuits, any time. | The Races tab | UI | low |
| 5 | Shop | 5 deliveries (the first Career pack), or any pack | Card packs. One free every day. | Shop chip and its dot, the showroom's Shop, Add Crazey Cash | UI | low |
| 6 | Blueprints | first blueprint, or 6 deliveries | Blueprints unlock cars and ECU upgrades. | Jim's stall chip, the showroom's blueprint and key cars | UI | medium: "1 / 109 cars" still counts them |
| 7 | Events | 7 deliveries, or any event stage | Car Hunts and events, on for a while. | The Events tab and its dot | UI | medium: a dated event (Christmas Eve) can be missed |
| 8 | Extras | 8 deliveries | Postcards, milestones, hidden levels. | Options > Extras (Postcards, Milestones, Hidden levels, screensavers) | UI | low |
| 9 | Editors | 10 deliveries (★★★ open) | Build your own road: Options. | Level editor, Model editor | UI | low |

Three or more gates opening at once (Unlock everything, Show all menus) are taken as seen: no wall of cards.

**Not in the ladder (proposals: they would need a rule or a level change, see 6):** cargo variety (cargo is drawn, not played:
LEVEL-ARCHETYPES.md 4.5; a ladder for it means level files), ECU upgrades inside the full view (the upgrade button is part of the
card's figures: gate it with Blueprints when the showroom's detail is reworked), the Car ideas lot in Crazey Jim's (always, see Q6).

## 3. Decisions

**Hidden, not teased, by default.** A shut thing is not drawn at all (the owner's rule for cosmetics: not rendering rather than
"Locked / Coming soon"). Exceptions kept as they are: the tiers and levels (dimmed, with what opens them: they ARE the goal) and the
showroom's tier-locked cars. A "teased" row ("Shop: after 5 deliveries") was considered and is not recommended: it is one more
thing to read on a phone, and the ladder is short (10 deliveries to the end of it).

**Existing players: everything, by rule, with no flag.** A save is LEGACY when it has no `seen` and ANY progress: a level delivered or
open, money, a second car, Evil picked, a pack held or opened, a blueprint, an event stage, a claimed reward, Crazey Cash, a bought
ECU or a Shop purchase. A legacy save sees everything and is never written. A save with no progress at all (brand new, or an old one
that only failed a run or changed a setting) is given `seen: []` the first time the gates see it, and climbs the ladder.

**`seen`** (Progress.data.seen): the gate ids whose introduction was seen, at most nine short ids (81 bytes with all). A gate is open
when its trigger holds OR it is in `seen`, so nothing ever closes again.

**Escape hatches.** Options > Save > **Show all menus** (shown while anything is shut): every gate seen, kept. `?progress=all`: everything
for a visit (testers). Unlock everything opens everything (every level delivered fires every trigger). `?progress=off` turns the
prototype off. A returning player whose save was lost would use Import save (a code from before: legacy, everything) or Show all menus.

**The Driving Lesson and the nudge.** The lesson is a hidden level (Options > Hidden levels, under Extras: shut for a new player in this
prototype). If the owner takes NEW-PLAYER-IDEAS idea 15 (the lesson as a brand-new save's first START), it needs no menu entry; else a
"Learn" chip beside START while deliveries is 0 (idea 15 B). The lesson's zone 7 already says "Good gives gifts. Evil throws fire":
Evil is open from the start (the owner, 16-Oct: "I want Evil to be selectable from the start"), so the lesson's line and the switch's
hints say the same thing in the same words: the lesson teaches it in play (zone 7), the hints keep it on the front screen (the phone
layout hides the menu's own side note, "More time. Care packages..." / "Less time. Flaming packages..."). Neither gates anything. The Better ride nudge (`?nudge`) needs
nothing shut: it lives on the results and in the showroom, both open from the start, and the showroom with blueprint cars hidden puts
the Junker 2nd and the Darkvan 4th (the audit's finding 3, solved by the gate).

**Hidden levels** (CHECKLIST 338, not decided): they stay in Options > Hidden levels (Extras, at 8 deliveries). When one is promoted to
the career it is in a tier and the ladder has nothing to add.

**Car Hunt timing.** A hunt is always on (CHECKLIST 348: 23 cars in turn), so a player who reaches Events at 7 deliveries meets one at
once; hunts are played on the hunted car's tier's level, and at 7 deliveries the player is in ★★, which is where the cheaper hunts are.
Recommended: keep the Events gate at 7, and **open it early while a dated event is live** (Christmas Eve) for a save with 2+ deliveries
(not built: Q4). A one-level event's reward claimed later is not lost (claims are kept by id).

**Cloud / cookie size.** The cookie (the fallback copy) holds `COOKIE_KEYS` only, and progress.js is part of the replays' rules (see
5), so `seen` is NOT in the cookie in this version: local storage (the store of record) has it. A save restored from the cookie alone,
or from a save code (neither carries `seen`), reads as legacy when it has progress: everything shown, never hidden. Proposal: add
`seen` to COOKIE_KEYS and to the save code's `tidy` with the next logic change of progress.js (a full save's cookie is 1,911 bytes;
with `seen` about 2,064; the room is 3,600).

## 4. The first version (built, behind a switch)

- `src/delivery/featuregates.js`: the table (GATES: id, label, trigger over Progress.data, intro, hides, mark), SECTIONS (every menu
  entry with its gate or 'always'), and the rules (`gatesMode`, `isLegacy`, `hasProgress`, `deliveries`, `openGates`, `visible`,
  `pendingIntros`, `adopt`, `markSeen`, `cleanSeen`). No DOM; in NOT_RULES (vite.config.js) so it is not a replay rule.
- `src/delivery/render/progressui.js`: off, it does nothing. On: one CSS rule per hidden selector under `body.pg-off-<id>`; the
  intro card and the outline; Show all menus; the switch's two-word Good / Evil hints on a ladder save; T (the menu's tab key) off while
  the Races or Events tab is shut. Good and Evil themselves are never touched (E, the switch, the medals: as today). Imported early in
  main.js (its key guard must come before the menu's).
- The switch: `?progress=new` (a visit), `?progress=new:on` (remembered in this browser), `?progress=off` (forgotten), `?progress=all`
  (everything, a visit). Local storage key `delivery.progress`. In URL-PARAMS.md.
- `scripts/.featuregates-check.mjs` (tiers group).

Try it: `/delivery/?progress=new` in a private window (a brand-new save), then play Expressway.

## 5. Logic and save data

- **Replays' rules: unchanged.** The fingerprint (vite.config.js logicFiles, 61 files) is `3d74fa2404` here and on
  `origin/claude/new-player` (6b97a47). (The brief's figure `bf356db5a8` does not reproduce from that branch with the same
  algorithm the checks use; `3d74fa2404` is what its files hash to.) featuregates.js is in NOT_RULES; render/ is not followed.
- **Save data: a new field, `seen`, written ONLY for a brand-new save with the switch on** (and then by its OKs and Show all menus).
  progress.js is NOT changed (it is a rule file): restore keeps unknown keys (`{ ...fresh(), ...saved }`) and saveText writes them,
  the way `unlockMode` (unlockall.js) already lives. Old saves load as before; `.save-check` and `.unlockall-check` pass.
- **Gates that would need a logic change (not built):** the cookie and save code carrying `seen` (progress.js); a cargo ladder
  (level files); first-START lesson (game flow).

## 6. Open questions for the owner

1. Hidden or teased? Built: hidden (not drawn). Teased rows for the Shop and Events ("after 5 deliveries")?
2. The ladder's order and numbers: Style at a car bought or 3 deliveries, Shop at 5 (the first Career pack), Events at 7: right?
3. The switch's hints ("gifts · more time" / "fire · less time"): keep them for every new player, or only until a first delivery?
4. Open Events early while a dated event (Christmas Eve) is live, for a save with 2 deliveries?
5. Races tab at 4 deliveries, or only after ★ is cleared?
6. The Car ideas lot (free idea cars) in Crazey Jim's: gate it too (with Style or Extras)?
7. "1 / 109 cars" in the showroom while blueprint cars are hidden: count only what is shown?
8. Level editor and Model editor: a gate (built: 10 deliveries) or Options > Guide always (they are tools, not progress)?
9. Turn it on for everyone (a release) once seen, or keep it behind `?progress=new` for a round of play?
10. Should Reset progress put a player back on the ladder (built: yes, a reset save has no progress) or keep `seen`?
