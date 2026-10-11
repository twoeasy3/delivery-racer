# Scratchpad: garage tiers, back button, 4th level, phone stats (agent, stopped on the owner's stand-down)

Branch `delivery-garagetiers`, worktree `.claude/worktrees/delivery-garagetiers` (node_modules is a junction: `cmd /c rmdir <wt>\node_modules` before deleting). Never pushed. No background jobs, no lock held.

## Done (commits on the branch, newest last; see `git log main..delivery-garagetiers`)
1. Item 3: the 4th level of a tier needs 3 medals (was 4): tiers.js `need()` and its header, scripts/tier-money.mjs model (now 5 plays a tier), scripts/.tiers-check.mjs asserts it. No user-facing words said "4".
2. Item 1: garage hides cars of tiers beyond the next; next tier = black silhouettes (MeshBasicMaterial, no tag, card says "Locked car", stars, and what opens the tier; button "Locked", no Use, no buy, no compare). cars.js carPreview/isTeaser/garageCars, tiers.js `preview` hook, garageview.js (sale/afford exclude teasers, teasers sort last), garage.js. Owned cars always shown; tierless (earned, amphibious) always shown as before; car ideas lot untouched; tiers off = old Blue Star rule. Checks added to scripts/.tiers-check.mjs (new save, cleared tiers, owned far car, tiers off).
3. Item 2: src/delivery/nav.js (history entry per screen: run, garage, options/road sheet, album, milestones; menu is the base so a first visit's back leaves the site). Hooks in game.js start/toMenu, garage.js open/close, menustage.js openSheet/closeSheet, album.js, milestones.js.
4. Item 4: phone garage shows the selected car's figures on their own line under the name always (garage.js statsNode, menus.css); perk text only on tap.
5. WIP commit: arrange()/countOf in garageview.js keep the next tier's silhouettes when a level restricts the car (otherwise a new player, whose level 1 restricts to one star, never saw them).

## Not done / not verified
- Item 2 was NEVER tried in a browser: back from level/results/garage/sheets, ?garage and ?autostart deep links (a deep link pushes an entry, so back goes to the menu first, then leaves), forward button, dialogs (buy sheet) and the Car ideas tab are not tracked. Only syntax and import checks.
- Item 4 seen once at 390x700 (before the WIP change): stats line visible, car not blocked: scratchpad dir `...\scratchpad\a\g2.png`, `g3.png`. 360x640 shot `b\g3.png` taken, not read carefully.
- Item 1 silhouette look NOT seen: the re-shoot after the WIP change (`a\g2.png`, `a\g4.png`, `b\g2.png` in the scratchpad dir, `index.html?garage&look=lovebus`) was taken but not read. Read them first: check black silhouettes visible against the tarmac, card text, and the rule chip.
- Checks run: .tiers-check, .earned-check, .tank-check, .words-check, .bundle-check pass. .ideas-check fails "bubble delivered in 132 s" (unrelated gameplay sim; not compared against main). Smoke test not run; its Blue Star garage check (delivery-smoke.mjs ~2850) assumes the old rule and will likely need updating under tiers.

## Next step
Read the three stills above; open `index.html?garage` and `&look=lovebus` at 390x700 and 360x640 under the heavy lock; then test back button by hand (menu -> garage -> back; menu -> level -> back; options sheet -> back).

## Traps
- Pre-existing: the rule chip wraps badly at 390 wide ("Good: only / ★ cars until...").
- The tool transport mangles backslashes in CSS content strings: check `'\25BE'` in menus.css after edits.
