# Scratchpad: Hong Kong Harbour (level 27), stand-down of 12-Oct

- **Branch:** `delivery-rework-b`. **Worktree:** `.claude/worktrees/delivery-themes-c`. Tree clean at the stand-down;
  `main` merged in at `680af45` (clean). No extra worktrees, no background jobs left, no heavy lock held.
- **Plan:** `src/delivery/PLAN-hongkong-12-Oct.md` (`c7b6ded`), quoting the owner's wording.

## DONE (commits, oldest first)

- `c7b6ded` the plan.
- `07ccc6a` the theme's own plain obstacles: `hongkong: { crate: 'hawkerCart', bale: 'bagStack' }` at the foot of
  `themes.js`; models in `render/obstacleModels.js`; registered in `config.js` obstacleKinds (a crate's and a bale's
  costs), `collision.js` SIZE, `gimmicks.js` JUNK / JUNK_NAMES / DRESS, `obstacleText.json`. The level uses them: s 1012
  lane 4 and s 2902 lane 3 are crates (carts), s 3562 lane 3 a bale (bags). The level's words and cargo (canary /
  genie) moved into `levelText.json` (the file still had goldfish / tentacle, and the file comes first).
- `97faba8` the scenery: `hongkong` in `THEME_EXTRAS` (`render/themes/extras.js`), placed by the level's own data (no
  zones): a podium of lit shop fronts under awnings at the towers' feet on the city side; tall vertical neon signs on the
  tower faces; a clock tower (lit faces, hands, green roof) and a string of red lanterns at each ferry pier (s 476, 1676,
  2876: 24 m before the piers movers.js builds); bamboo scaffolding with green netting at s 160 and over each fresh-tar
  stretch; a typhoon shelter along the tide (a rubble breakwater at SEA+68 with a green lamp each end, junks and sampans
  moored inside it); the Peak (a ridge 70 m behind the second tower row, lit windows up its slopes, the Peak Tower and
  the tram's lamps). Also the menu still's place in `scripts/shots.mjs` CINE: `'hong-kong': '&at=400&ff=1&car=postvan'`.
- `6f8eb73` the menu picture pair, `levelshots/hong-kong.jpg` and `levelshots/large/hong-kong.jpg`.

## NOT done

- No "WIP" is left in any message; nothing of the plan is unbuilt. Not looked at: the Hong Kong cards on the Gimmicks
  page (the road-dressing page's still cut off above them), the level as Evil, the second tunnel's mouth, the Peak in a
  still (see below), the hawker cart at s 2902.
- The mirrored FRESH TAR board (seen again at s 1000: "FRESH TAR STICKY" reversed) is the sweep agent's, untouched.
- Q6 (the tram doing nothing) is the owner's open question, untouched.

## Seen and not seen (stills, 880x520 unless said; level id `hong-kong`, in a Post Van: `&car=postvan`, the level
## is tier 6 and starts in no other car)

Folder: `<scratchpad>\`
- `hk1\*.png`: WRONG, the garage (no tier-6 car owned): ignore.
- `hk2\s40b.png` (s 40): the start; shop-front podium, awnings and vertical neon seen. `hk2\s440.png` (s 440): the first
  clock tower and the lantern string seen; the clock face was faint, so it was enlarged with a dark surround and hands
  (in `97faba8`), and `hk3\s440.png` shows the lit face. `hk2\s780.png` (s 780): a scaffold with its netting and red
  works board seen. `hk2\s2560.png` (s 2560): the typhoon shelter's boats, lamps and breakwater seen on the water.
  `hk2\s1640.png`, `hk2\s3380.png`, `hk2\s3600.png`, `hk3\s1640.png`, `hk3\s2300.png`, `hk3\s2880.png`, `hk3\s3600.png`:
  taken, NOT looked at.
- `hk4\cart.png` (s 1000, 1100x1500): the hawker cart on the road at s 1012, striped awning, goods and wheels: reads
  well. `hk4\bags.png` (s 3550): the bag stack at 3562: reads as a striped heap, smaller than the cart. `hk4\dress.png`:
  the Gimmicks page's road dressing, the Hong Kong cards below the frame (not seen).
- The Peak: NOT seen in any still. It was first laid with summits 330 m off (the plan), then moved nearer (summits about
  240 m off, 190 to 250 m high) because the camera's far plane is 700 m and the fog ends at 520 m; even so the near
  tower wall (45 to 200 m tall, 6 to 64 m off) hides it from the road. Whoever resumes: a still with `&cineup=60`
  or so would show whether it is worth keeping; otherwise it costs little and can stay or go.
- The menu picture (`levelshots/hong-kong.jpg`) looked at: the clock tower, lanterns, neon, towers and the harbour.

## Checked / not checked (all headless, no browser)

- PASSED: `.obstacles-check`, `.words-check`, `.cargo-check`, `.schema-check`, `.descriptions-check`,
  `.shoulder-items-check`, `.tiers-check`, `delivery-levels-check --secs=5`, `.replay-check hong-kong --seconds=40`.
- `.targets-check` CRASHES (TypeError at line 42, `t.look` of undefined) on main's levels, not this one: farside, stunts,
  ponti, glow and erupt list more targets than Targets builds (5/3, 4/3, 4/3, 4/3, 4/3). Not mine; report it.
- NOT run: the smoke test (never without being asked), the balance and gimmick-kinds checks, a look as Evil.

## Next step for whoever resumes

1. `git merge main` in the worktree (keep both sides); re-run `.obstacles-check` and `.words-check`.
2. One locked shots job: `node scripts/shots.mjs <dir> "a=@hong-kong&ghost&car=postvan&at=2890&ff=1" "b=@hong-kong&ghost&car=postvan&at=3100&ff=1" "c=@hong-kong&ghost&car=postvan&at=1000&ff=1&cineup=60" "d=gimmicks.html?group=road-dressing" --size=1100x3200`
   (the second cart, the second tunnel's mouth, the Peak from above, the two cards). Correct, commit.
3. Report B2 of CHECKLIST-11-Oct done bar the FRESH TAR board (the sweep's), and merge.

## Traps

- Heavy locks: TWO now (`delivery-heavy.lock`, `delivery-heavy-2.lock` in `%LOCALAPPDATA%\Temp`); both are busy most of
  the time: queue with a polling loop in a background job rather than retrying by hand.
- A tier level's still needs `&car=<a car of its tier>` or the garage opens instead (tier 6: `postvan`, `keitruck`, `mini`).
- Never `git --help` / `git help` (opens a browser on the owner's screen); `-h` only.
