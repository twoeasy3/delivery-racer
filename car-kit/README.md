# Car kit

A self-contained kit for modelling cars for the game. It needs only Node 22 or newer and a Chrome or Chromium; no npm install and
no network. three.js 0.160.0 is vendored in `engine/vendor`.

**Start with `BRIEF.md`**, then `examples/junker.car.json`, then `FORMAT.md` as a reference.

## Run

```
node tools/check.mjs examples/junker.car.json     # the checks: PASS / WARN / FAIL with numbers, exit 1 on any FAIL (Node only)
node tools/render.mjs examples/junker.car.json    # 25 views + renders/junker/junker-sheet.png (needs Chrome / Chromium)
node tools/serve.mjs                              # the interactive viewer: open the address it prints
node tools/selftest.mjs                           # proves the checker catches each defect (breaks a good car 19 ways)
node tools/tojson.mjs examples/van.car.mjs        # a scripted spec (.car.mjs) -> .car.json
```

The renderer finds Chrome or Chromium by itself: Playwright's browsers folder, `/usr/bin/chromium`, `google-chrome`, or the
macOS and Windows defaults. Otherwise pass `--browser=/path/to/chrome` or set `CHROME_PATH`. It draws with software GL, so it works
without a GPU.

## What is here

| path | what |
|---|---|
| `BRIEF.md` | the job, the style, the rules, the loop, how to report |
| `FORMAT.md`, `schema/car.schema.json` | the spec format |
| `examples/*.car.json` (and `.car.mjs` sources) | four cars that pass: the junker (THE reference), a hatchback, a van, a panel van (the decal reference) |
| `examples/sheets/*-sheet.png` | their contact sheets |
| `engine/build.mjs` | spec -> three.js model (no imports; also used by the game's importer) |
| `engine/validate.mjs`, `engine/checks.mjs`, `engine/zfight.mjs`, `engine/classes.mjs` | the validator, the checks, the z-fighting detector, the size classes and budgets |
| `engine/views.mjs`, `engine/render.html` | the pictures |
| `index.html` | the viewer |
| `tools/` | the commands above |

## Zip it

From the folder that holds `car-kit/`:

```
zip -r car-kit.zip car-kit -x 'car-kit/renders/*' 'car-kit/examples-imported/*' 'car-kit/node_modules/*'
```

Unzip anywhere and run the commands from inside `car-kit/`. Nothing outside the folder is used.
`examples-imported/` is the game's side (the importer's output) and is not part of the kit.
