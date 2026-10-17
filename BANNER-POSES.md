# Pack banner poses (CHECKLIST 447)

- Poses: `src/delivery/render/bannerposes.js` (`POSES`): showdown (the old row, default), headon, staggered, abreast, chase, solo. Each has a slot per car (1 to 4 cars), the camera's lift / lens / roll; the no-overlap step-out and the fit-every-box framing are packbanner.js's and apply to all.
- Choice: `src/delivery/render/bannerlook.js` (`PAIRINGS`, else an FNV hash of the pack id). Not in packs.json: it is a replay rules file (progress.js -> packid.js -> packs.json).
- Pairings: supercar-special showdown, classic-special abreast, record-special headon, cruiser-special staggered, car-hunt-special solo and comet-special chase (these two show no banner today: one car).
- Cost: still drawn once to a picture; one pose more is a few hundred bytes of numbers.
- Add a pose: a new entry in `POSES` with four slots; look at `?packbanner=sheet`.
- Backdrops: not yet.
- Open: should one-car packs (Comet Hunt) get a banner (solo/chase)?
