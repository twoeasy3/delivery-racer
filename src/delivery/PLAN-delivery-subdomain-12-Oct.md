# Plan: the game on its own subdomain, in its own repo (12-Oct)

Owner: "I still only have the one domain, and would like it on the /delivery/ subdomain."
Read as: serve the game at a subdomain of the one domain (delivery.<domain>), built from a repo of its own with its history (option c of INVESTIGATION-drop-game-history-12-Oct.md). Plan only; nothing was changed in Cloudflare, GitHub or the real repo.

## Answer

Feasible, and simpler than the history reset: no force-push, no outage, no data loss. The game is a static build (three.js, no API, no D1/R2), so it needs a second Cloudflare Worker with static assets and nothing else. Saves do NOT carry over by themselves (new origin); one small one-time hand-over from the old path page fixes that, below.

## 1. The domain and how the site deploys (what the repo says)

- The site's Worker: `wrangler.jsonc`, name `collection-site`, `main ./src/worker.js` (the /api routes), static `assets` with `not_found_handling: single-page-application`, bindings R2 `IMAGES` (bucket <bucket>) and D1 `DB` (<d1 name>). No `routes` or `custom_domain` entry, so nothing in wrangler names a custom domain.
- The domain in the repo: `<domain>`, in `server.py` (`PUBLIC_IMAGE_BASE`, "only a custom domain in front of the R2 bucket", with Cloudflare zone ID <zone id>, so the domain's DNS is on Cloudflare). The Worker's own address is `<site>.workers.dev` (server.py, vite.config.js proxy). I cannot tell from the repo whether the site is also served on a custom domain; the owner should say which address the site is visited at.
- Deploy: Cloudflare's Git integration builds on a push to main (`npm run build` = `vite build` with `@cloudflare/vite-plugin`). `public/_redirects` is only `/ /display 301`. No `.github` folder, no workflows.
- The game is served by the same Worker: `vite.config.js` has the game's seven pages (delivery/*.html) as extra inputs; their code is in src/delivery.

Two ways to get a subdomain on the one domain (the owner picks):
- A. `delivery.<domain>`: a Worker "Custom domain" in the same zone; Cloudflare makes the DNS record and certificate itself. Needs the zone in the same Cloudflare account as the Worker (the zone ID suggests so; check).
- B. If no custom domain is wanted: a second Worker named e.g. `delivery` is automatically `delivery.<account>.workers.dev`. Free, no DNS, works the moment it is deployed. Same plan otherwise, only the address differs.

## 2. The new repo and the Cloudflare/GitHub setup

What moves to the new repo (history kept with `git filter-repo`, run on a fresh clone; filter-repo is not installed, `pip install git-filter-repo`, or the filter-branch equivalent which takes about 35 min):
- `src/delivery/` (19 MB: code, levels, sounds, pictures, the .md notes), `delivery/` (the seven HTML pages), the 56 game-only files in `scripts/` (delivery-smoke, delivery-headless, shots, level-clocks, .*-check, circuits, etc.; list: `git log --format= --name-only f4b17c6..main -- scripts` minus files present at f4b17c6), `eslint.config.js`.
- From the shared files: `public/car-icon.svg` (the pages link `/car-icon.svg`; no other public file is used by the game: bg.mp3 and select.wav and the car JSON are not referenced from src/delivery). A new `package.json` (three 0.160.0, vite, eslint, wrangler; the site's react/leaflet/papaparse/flag-icons do not go), a new `vite.config.js` (the seven page inputs; no react plugin, no cloudflare plugin needed), and a new `wrangler.jsonc`: `{ "name": "delivery", "compatibility_date": ..., "assets": { "directory": "./dist" } }` (a static-assets-only Worker, no main script).
- No D1 or R2 binding: the game uses no `/api`, `fetch` is only for its own sound files (HANDOVER: "Vite alone is enough for the game (it uses no /api)").
- Imports: the game imports nothing from the site's src (checked for imports outside src/delivery: none found).
- The game's pages are served from the root (`/index.html`, `/powerups.html`...), not `/delivery/`; the source paths in the html (`/src/delivery/main.js`) stay valid if the folder layout is kept. Moving the HTML to the repo root is a small build-config change, tested before cutover.
- Not moved: everything of the site. The site repo keeps its history untouched.

Steps the owner does in GitHub (I cannot):
1. github.com, New repository (private is fine), name e.g. `delivery-racer`, empty (no README).
2. I (or the owner) push the filtered clone to it (`git remote add origin ...; git push -u origin main`). That is a new repo, so it is a normal push, no force.

Steps the owner does in the Cloudflare dashboard (I cannot):
1. Workers & Pages, Create, "Import a repository" (Connect to Git), pick the GitHub account, give Cloudflare access to the new repo only, choose `delivery-racer`.
2. Project name `delivery`, production branch `main`, build command `npm run build`, deploy command `npx wrangler deploy` (the same pattern as the site's Worker; copy the existing project's settings), root `/`. Save and Deploy. Result: `delivery.<account>.workers.dev` serves the game (option B is done here).
3. Option A: in that Worker, Settings, Domains & Routes, Add, Custom domain, type `delivery.<domain>`, Add. Cloudflare creates the DNS record (proxied) and the certificate; wait until it shows Active (a minute or so). Nothing to type in DNS.
4. Open the address; play a level; open the editor and the other pages.

## 3. Save data: everything the game stores, and the migration

Stores (from grep of src/delivery and delivery/):
- localStorage `delivery_racer_progress_backup`: the whole save (store of record, read first). progress.js.
- Cookie `delivery_racer_progress` (path=/, one year): the short of the save, a fallback only, about 3.4 KB. It lives on the old host and is sent with every request to the site (AUDIT P8).
- localStorage `delivery_editor_level` (the level handed from the editor to the game) and `delivery_editor_autosave` (the editor's level being edited). Editor-only; lost levels there matter only if the owner has work in progress in the editor.
- No sessionStorage, IndexedDB or Cache API.

A subdomain is a different origin, so none of this is visible from the new host. A cookie set for the old host cannot be read by the subdomain (and is not shared unless set with `Domain=`, which the code does not do). Yes, a migration is needed for the owner's own save and every other player's.

Simplest safe migration (one-way copy, nothing deleted from the old origin):
1. The new game, on first load with no save of its own, accepts a save in the URL hash: `https://delivery.../#import=<encodeURIComponent(JSON of the three localStorage keys)>`. It checks the JSON parses and that `restore()` accepts it (the code already tolerates old saves), writes it to its own localStorage, strips the hash from the address bar (`history.replaceState`), and shows one line "Your save was moved here". If it already has a save, it does not overwrite; the old path page offers a "Move my save anyway" only through an explicit button.
2. The old address `/delivery/...` is a small hand-over page (served by the site's Worker, see 4): it reads the three keys, builds the hash and goes to the same path and query on the new host. The hash never reaches a server. A full save of 100 levels and 80 cars is tens of KB, well inside browser limits (checked by scripts/.save-check.mjs's full save; measure the size before shipping).
3. Fallback if a browser refuses a long URL: an Export button in the old page and an Import button in the new (a download/upload of the same JSON file). Worth building anyway as a backup for the owner's own save.
4. The old page keeps the data in place and also expires the old `path=/` cookie (the AUDIT P8 leak, fixed for free). The data stays until the owner clears it.

Before cutover the owner should still copy their own save by hand once (the Export button) as insurance.

## 4. The site side: old links still work

- The site's Worker answers `/delivery/*` (add `"run_worker_first": ["/delivery/*"]` under `assets` in wrangler.jsonc, and a branch in worker.js) with a tiny HTML page: the hand-over script above, then `location.replace('https://delivery.<domain>' + pathname.replace(/^\/delivery/, '') + search + '#import=...')`. The page has a plain link as the fallback. After a few months (when the owner's and any players' saves have moved) turn it into a plain 301 to the same address.
- Deep links (`?level=`, `?car=`, `?tiers=0`, the page names) are kept because path and query are copied.
- The game and its build config are then removed from the site repo in an ordinary commit (src/delivery, delivery/, the game scripts, vite.config.js inputs, lint scripts). No history rewrite.

## 5. Order that keeps the live game up

1. Backup: `git bundle create ... --all` + verify (as in the investigation).
2. Make the filtered game repo on a fresh clone; build it standalone; test with `vite build` + a static server; run the quick checks (the owner's rule: no smoke test unless asked).
3. Add the `#import` receiver (and the Export/Import buttons) to the game in the new repo. The old path game on the site keeps running untouched meanwhile.
4. Create the GitHub repo, push, create the Cloudflare Worker from it, add the custom domain. Verify the game on the new address end to end, including a test import from the old page.
5. Site repo: the hand-over page/redirect in worker.js + wrangler.jsonc. Push to main (deploys). /delivery/ now forwards to the subdomain with saves.
6. Owner opens the old address once on each device they play on (moves the save), checks it arrived.
7. Later, a normal commit on the site repo removes the game files and the vite inputs (smaller site build). Optional much later: turn the hand-over into a bare 301.

Does option (a), resetting the site repo to pre-game, still make sense? No. Once the game is split off it buys only repository size (30 MB of history), and costs a force-push, a Cloudflare redeploy of the old site tree, orphaned branches/worktrees, and the bundled site fix to restore. Recommendation: skip (a); delete the game in a normal commit after step 6 and let /delivery/ stay a redirect. If size ever matters, do (a) later as a separate decision.

## 6. Risks

- Saves: the biggest. Mitigated by the hash hand-over (copy, not move), the Export file and the owner's manual export before cutover. A player who never opens the old link keeps the old save on the old origin only while the site keeps serving the hand-over page (so do not remove it quickly).
- Origin change resets anything else per-origin: the browser's stored permissions (none used), service workers (none found), the muted/touch switches are in the save.
- Two copies of the game must not both be edited: after step 5 the site copy is frozen; agents/worktrees (44) work on the site repo's src/delivery. Pick a day: the game's remaining work moves to the new repo and the worktrees' branches need a rebase onto the new repo's layout (cherry-picks apply because the paths are kept).
- The Worker custom domain needs the zone in the same Cloudflare account; if `<domain>` is the R2 image domain, a new subdomain there is harmless, but check nothing (a wildcard route or Page Rule) already catches `delivery.*`.
- The new Cloudflare project: free-plan limits for static assets (20,000 files per version; the game has a few hundred assets: check the count of dist/), build minutes, the build uses the game repo's lockfile.
- The new repo's build must not need the site's `public/` files (only car-icon.svg, copy it).
- A hash URL could carry a bad or hostile save; the receiver parses and validates with the same `restore()` and caps the size.
- Search/links: the game moves; the old URL only redirects, no SEO concern for a private game.
- Unknown: whether the editor's `delivery_editor_*` keys matter to the owner (copied too); the exact size of a real full save (measure it).

## Not checked

The Cloudflare account (zone, plan, the site's real public address, existing routes or Page Rules); the GitHub account; the real size of the owner's own save; the file count of the build against the static-assets limit; that the game builds standalone after the vite.config split (planned in step 2, not run).
