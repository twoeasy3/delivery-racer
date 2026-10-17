// ---- THE CARGO RULES: what must stay true of each cargo model in every state, at every moment and through every change of
// state, checked by scripts/.cargo-contain-check.mjs (render group). The vocabulary, with examples: CARGO-RULES.md. A part is a
// NAME in the model (a mesh's or a group's `.name`; a mesh belongs to its nearest named ancestor); a selector is a regular
// expression over those names, whole-name; `$1` in a container's or partner's selector is the part's own first capture.
//   keepOut:  [{ a, b, min = 0.002, states }]       no mesh of A within `min` m of a mesh of B (A = B: different instances);
//             convex parts only (a torus, a hollow shell, a ring: use `inside` against its shape instead)
//   inside:   [{ part, of, shape, margin = 0.003, exits, states }]   every vertex of the part inside `shape`, in the frame of
//             the node `of`, by `margin`; shape { sphere: r, centre } | { cone: { y0, y1, r0, r1 } } (upright) | { box: { min,
//             max } }; exits [{ at: [x, y, z], r }]: where it may be outside (a hole, a doorway), in the same frame; only:
//             a shape, just the vertices in it are held (the band of a collar a head pokes through)
//   anchors:  [{ part, to, maxGap = 0.004, states }]   every mesh of the part within maxGap of `to` (convex; nothing floats),
//             or [{ part, of, shape, maxGap }]: within maxGap of that shape's surface (feet on the floor of a ball)
//   zfight:   { allow: n, why }                      flicker-class pairs known and accepted (0 if absent)
//   static:   'why'                                  no rules needed (no part moves in or on another): z-fight only
//   runs:     the check's own runs, if the six standard ones do not suit
// New or changed cargo registers here (the owner, 17-Oct): add a new kind of rule to the vocabulary (and the check) rather than
// a one-off check. Not imported by the game: nothing here is drawn or decides a run.

export const CARGO_RULES = {
  // Cage of Tunnel Rats: the rats keep to the cage, off its door and each other; the bold one leaves by the doorway
  rats: {
    keepOut: [{ a: 'rat\\d', b: 'cage|door' }, { a: 'rat\\d', b: 'rat\\d' }],
  },
  // Pet-Shop Hamster Ball: the hamster inside the shell but for its head out of the hole (furious), off the collar, the
  // rings and the hatch; on its feet on the ball's floor when calm or agitated
  hamsterball: {
    inside: [
      { part: 'hamster|foot', of: 'ball', shape: { sphere: 0.42 }, margin: 0.004, exits: [{ at: [0, 0.42, 0], r: 0.21 }] }, // (its rings are painted on the outside)
      { part: 'hamster', of: 'ball', shape: { cone: { y0: 0, y1: 2, r0: 0.127, r1: 0.127 } }, only: { cone: { y0: 0.38, y1: 0.41, r0: 0.165, r1: 0.165 } } }, // (through the collar (inner edge 0.133), 6 mm clear of it: what is in the collar's ring is in its opening)
    ],
    keepOut: [{ a: 'hamster|foot', b: 'hatch' }],
    anchors: [{ part: 'foot', of: 'ball', shape: { sphere: 0.42 }, maxGap: 0.012, states: [0, 1] }],
  },
};

// the items not yet given rules (17-Oct): their audit is CARGO-AUDIT.md. This list may only shrink (the check holds it to
// the number it was made with): an item leaves it when it gets an entry above
export const PENDING_AUDIT = [];

// flicker-class z-fight pairs known on items still pending (CARGO-AUDIT.md); the check fails on any more than these
export const KNOWN_ZFIGHTS = {};
