// ---- the mood faces, drawn once for everywhere they show: painted onto the balls that pop up over
// the cars (render/emotes.js), and as small icons on the race screensaver's board and the Good & Evil
// page. Drawn on a 24 x 24 grid with the face's middle at (12, 12); the eyes sit at y 10.
// The angry one bares a row of jagged teeth hanging from a crooked lip, as Road Wage's did.
export const FACE_COLORS = { happy: '#4caf50', neutral: '#ffd23f', angry: '#e53935' };
export const INK = '#1c1c1c';
// the features, as SVG path data (Path2D takes the same)
export const FEATURES = {
  happy: { mouth: 'M7 14 Q12 19 17 14' },
  neutral: { mouth: 'M8 16 H16' },
  angry: {
    brows: 'M5 5.5 L10 8 M19 5.5 L14 8',
    // the lip, slanting up to the right, and the teeth hanging from it (the face showing between them)
    lip: 'M4.9 15.6 L19.2 12.3',
    teeth: 'M5.2 15.5 L7.17 19.79 L7.94 14.88 L9.91 19.17 L10.68 14.26 L12.65 18.55 L13.42 13.64 L15.39 17.93 L16.16 13.02 L18.13 17.31 L18.9 12.4 Z',
  },
};
// a face as a small inline SVG icon
export const faceSvg = (mood, size = 13) => {
  const f = FEATURES[mood];
  const features = mood === 'angry'
    ? `<path d="${f.brows}" fill="none"/><path d="${f.teeth}" fill="#fff" stroke-width="0.35" stroke-linejoin="round"/><path d="${f.lip}" fill="none"/>`
    : `<path d="${f.mouth}" fill="none"/>`;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="${FACE_COLORS[mood]}"/>` +
    `<g fill="${INK}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="10" r="1.7" stroke="none"/>` +
    `<circle cx="16" cy="10" r="1.7" stroke="none"/>${features}</g></svg>`;
};
