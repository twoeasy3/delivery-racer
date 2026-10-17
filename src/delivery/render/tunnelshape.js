// ---- THE SHAPE OF A TUNNEL: its ceiling's height along it, and the camera it wants. Shared by render/tunnel.js (which
// builds the shell) and render/scene.js (whose chase camera must never go up through the ceiling), so it imports neither.
// A tunnel's height: the usual CONFIG.tunnel.height everywhere, unless
//   - the tunnel says `height` (one number) or `profile` ([[s, h], ...]: eased from one point to the next), or
//   - the THEME gives its tunnel `heights` by zone (themes.js `tunnel.heights`: { <zone scenery>: m }): a mall's halls, low
//     corridors and tall atriums; the profile is then worked out from the level's zones, easing over EASE m at each boundary.
// The theme's tunnel can also say `camHeight` and `camBack` for the chase camera inside (CONFIG.tunnel's if not).
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { THEMES, tunnelLit } from '../themes.js';

const EASE = 80; // m over which the ceiling goes from one zone's height to the next (centred on the boundary)
const smooth = (u) => u * u * (3 - 2 * u);
const theme = () => THEMES[LEVEL.theme] || THEMES.city;

// the profile a theme's zone heights give a tunnel: [[s, h], ...] along it, or null where the theme has none
const zoneProfile = (t) => {
  const heights = theme().tunnel?.heights;
  if (!heights) return null;
  const zones = (LEVEL.zones || []).filter(z => z.to > t.from && z.from < t.to && heights[z.scenery] !== undefined).sort((a, b) => a.from - b.from);
  if (!zones.length) return null;
  const P = [[t.from, heights[zones[0].scenery]]];
  for (let i = 1; i < zones.length; i++) {
    const b = Math.max(t.from, Math.min(t.to, zones[i].from));
    P.push([b - EASE / 2, heights[zones[i - 1].scenery]], [b + EASE / 2, heights[zones[i].scenery]]);
  }
  P.push([t.to, heights[zones[zones.length - 1].scenery]]);
  return P;
};

// the function s -> ceiling height (m over the road) for a tunnel
export const heightOf = (t) => {
  const P = t.profile || (t.height === undefined ? zoneProfile(t) : null);
  if (!P) { const h = t.height ?? CONFIG.tunnel.height; return () => h; }
  return (s) => {
    if (s <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) {
      if (s <= P[i][0]) {
        const span = P[i][0] - P[i - 1][0];
        const k = span > 0 ? smooth((s - P[i - 1][0]) / span) : 1;
        return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k;
      }
    }
    return P[P.length - 1][1];
  };
};

// the ceiling's height at s, or null where s is in no tunnel (a little beyond each portal counts, for the camera's easing)
let cache = { level: null, list: [] };
export const ceilingAt = (s, pad = 40) => {
  if (cache.level !== LEVEL) cache = { level: LEVEL, list: (LEVEL.tunnels || []).map(t => [t, heightOf(t)]) };
  let least = null;
  for (const [t, h] of cache.list) if (s >= t.from - pad && s <= t.to + pad) { const v = h(Math.max(t.from, Math.min(t.to, s))); least = least === null ? v : Math.min(least, v); }
  return least;
};

// the chase camera a tunnel wants: the theme's tunnel's camHeight / camBack, or CONFIG.tunnel's; camKeep (a theme's only, or null):
// inside, the camera is kept within that many m of the lanes' middle however far out the car is (the metro: a car on a track in
// a tight bend would otherwise look past the inside wall from beside it)
export const tunnelCamera = () => {
  const T = theme().tunnel || {}, C = CONFIG.tunnel || {};
  return { camHeight: T.camHeight ?? C.camHeight ?? 5.5, camBack: T.camBack ?? C.camBack ?? CONFIG.camBack, camKeep: T.camKeep ?? null };
};

// is this level's tunnel lit (a mall's halls: no dark, no fog closing in, no headlights, the Tunnels card and message
// left out)? The theme's tunnel says (`lit: true`), or a tunnel of the level's own
export const tunnelsLit = () => tunnelLit(LEVEL);

// may the camera leave the chase view here (the replay's orbit camera, render/orbit.js; photo mode, render/photo.js)? Not on an
// ENCLOSED level (the owner, 17-Oct: the mall and the metro, all walls and ceiling: a free camera passes through them). Drawn
// only: a table here, not a theme key (themes.js is in the replay fingerprint), so no replay is refused for it.
const ENCLOSED = new Set(['mall', 'metro']);
export const freeCameraAllowed = () => !ENCLOSED.has(LEVEL.theme);
