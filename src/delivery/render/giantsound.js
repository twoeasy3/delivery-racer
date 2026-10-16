// ---- THE GIANT IS SILENT (the owner, 16-Oct: "constant explosion sounds when the car is giant"; then: its sounds are not necessary,
// remove them; CHECKLIST 386). RENDER-ONLY: the rules queue what they always did (mysteries.js's footstep sfx('heavy', 0.4), collision.js's
// crush sfx('heavy') and the crushed car's 'explode' event), and render/effects.js, while Player.giant is on, plays no 'heavy' at all and
// draws a crushed car's explosion without its sound. Every other sound and explosion as it was.

// is this 'explode' event a wrecked body's (collision.js: { type, s, lat, vs, big, tyres }, no sound / scale / smoke of its own)
// close enough to the giant (within `reach` m of its box) to be one it crushed?
export const crushedBy = (e, P, reach = 10) => e.type === 'explode' && typeof e.tyres === 'boolean' && e.sound === undefined &&
  e.scale === undefined && e.smoke === undefined &&
  Math.abs(e.s - P.s) <= P.hl + reach && Math.abs(e.lat - P.lat) <= P.hw + reach;
// a queued sound the giant silences (its footsteps and crushes: both 'heavy')
export const giantSilences = (name) => name === 'heavy';
