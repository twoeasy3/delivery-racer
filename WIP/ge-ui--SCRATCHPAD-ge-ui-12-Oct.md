# Scratchpad: Good/Evil cue ideas 8 to 12 (agent delivery-ge-ui), 12-Oct

Branch: delivery-ge-ui. Worktree: .claude/worktrees/delivery-ge-ui (node_modules is a junction: `cmd /c rmdir <path>\node_modules` before deleting the worktree).
Nothing merged or pushed. The owner has not yet chosen.

## Done (switch `?ge=N`, off by default, via sidecues.js geOn)
- 7f8ed78 sidecues.js (byte for byte as briefed)
- f690be0 idea 8: halo/horns on the cargo corner's rim (render/cargo.js, render/sideglyph.js, cargohud.css)
- 9626a2e idea 9: clock rim, pill for Good, cut corners for Evil (render/hud.js, style.css)
- 81d0685 idea 10: badge on menu car picture and beside the car name in menu and garage (render/menustage.js, render/garage.js, menus.css)
- 05f685c ideas 11 and 12 (one commit): engine voicing (render/audio.js Sound.engine 6th param `evil`; main.js passes Player.evil) and start-line cue (SYNTH startGood/startEvil, played from main.js when state becomes playing)
- eae39dd stills

## Not done
Nothing unstarted among 8 to 12. Not tuned: sound levels. Not done: 360x640 phone stills (390x700 at 2x only); a true light-coloured car pair (see traps).

## Seen / not seen
Seen (src/delivery/geshots/): level/{commuter,hothatch,sixbysix}-{good,evil}-{off,8,9}.png (back-roads, at=300), phone/phone-hothatch-{good,evil}-{off,8,9}.png, menu/{menu,garage}-{good,evil}-{off,10}.png, menuphone/menu-{good,evil}-10.png and menu-good-off.png.
NOT heard: ideas 11 and 12 (sound).
Checked: node --check on audio.js and main.js only. No smoke test, no levels check, no eslint.

## Traps
- `?car=hothatch` showed Commuter (blue-star car not owned/open); `ghost` makes the car translucent. Pick an owned tier-1..3 car for real car pairs.
- Menu name glyph truncates the car name on a phone ("COMMUT..."): consider dropping the name glyph on the menu card.
- Idea 8 only exists on levels that carry cargo, and overflows the tile by about 10 px at the top.
- I removed delivery-heavy.lock by rmdir after my own script had released it; it might have been another agent's.
- Shot script used: scratchpad run.sh (not in repo); shots address form `@back-roads&evil&car=X&ghost&at=300&ff=2&ge=8`; menu `index.html?car=..&side=evil&ge=10`, garage `index.html?garage=evil&ge=10`.

## Next step
Owner looks at the stills and chooses ideas; then merge the chosen commits (cherry-pick, or merge and keep switches), turn the chosen switches on by default or remove the switch, tune sounds by ear. Drop eae39dd if the stills should not ship.

## Left behind
No background jobs, no extra worktrees, no locks held.
