// ---- THE PACK BANNER'S BACKDROPS (render/packbanner.js; BANNER-POSES.md): CSS gradients and small inline SVGs only (no
// image files, no textures), behind the cars' one picture. Each: sky (the element's background), town (a layer, blurred
// by townBlur, at townOpacity), over (an unblurred layer over the cars: rain, flakes; optional), vignette; and a small
// palette for the picture: glow (the headlamps' glow tint), rim (the rim light), ground (the ground's stops: its colour
// and how much of the mirrored cars shows through). 'town' is the template's own (BANNER.backdrop).
const svg = (body, w = 400, h = 200, fit = 'none') => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='${fit}'>${body}</svg>`)}")`;
// a skyline: n blocks between y0 and y1 (seeded, so the same every time), with lit windows
const skyline = (fill, lit, n = 22, y0 = 60, y1 = 140, seed = 7) => {
  let r = seed, out = '', x = 0;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n && x < 400; i++) {
    const w = 10 + rnd() * 22, top = y0 + rnd() * (y1 - y0);
    out += `<rect x='${x.toFixed(0)}' y='${top.toFixed(0)}' width='${w.toFixed(0)}' height='${(200 - top).toFixed(0)}' fill='${fill}'/>`;
    if (lit) for (let k = 0; k < 4; k++) out += `<rect x='${(x + 2 + rnd() * (w - 5)).toFixed(0)}' y='${(top + 4 + rnd() * 40).toFixed(0)}' width='2' height='3' fill='${lit}'/>`;
    x += w + 1;
  }
  return out;
};
const seeded = (seed) => { let r = seed; return () => ((r = (r * 9301 + 49297) % 233280) / 233280); };
// soft flakes: n dots of radius r0..r1 above y = below, at opacity op (an SVG body)
const flakes = (n, r0, r1, op, below, seed) => { const rnd = seeded(seed); return [...Array(n)].map(() => `<circle cx='${(rnd() * 400).toFixed(0)}' cy='${(rnd() * below).toFixed(0)}' r='${(r0 + rnd() * (r1 - r0)).toFixed(1)}' fill='#fff' opacity='${(op * (0.5 + rnd() / 2)).toFixed(2)}'/>`).join(''); };
// fine rain: n thin slanted streaks above y = below (an SVG body)
const streaks = (n, below, seed) => { const rnd = seeded(seed); return [...Array(n)].map(() => { const x = rnd() * 420, y = rnd() * (below - 14); return `<line x1='${x.toFixed(0)}' y1='${y.toFixed(0)}' x2='${(x - 3).toFixed(0)}' y2='${(y + 12).toFixed(0)}' stroke='#c8dcff' stroke-width='.4' opacity='${(0.2 + rnd() * 0.25).toFixed(2)}'/>`; }).join(''); };
const ground = (r, g, b, mid = 0.94) => [[0, `rgba(${r},${g},${b},${mid + 0.03})`], [0.3, `rgba(${r},${g},${b},${mid})`], [0.7, `rgba(${r},${g},${b},0.5)`], [1, `rgba(${r},${g},${b},0)`]];
const VIGNETTE = 'radial-gradient(120% 90% at 60% 55%, transparent 55%, rgba(6, 6, 14, .6) 100%)';

export const BACKDROPS = {
  town: null, // (filled from BANNER.backdrop by packbanner.js: the warm hazy town)
  neon: {
    sky: 'radial-gradient(10% 14% at 18% 40%, rgba(255,60,200,.7), transparent 70%), radial-gradient(8% 12% at 34% 30%, rgba(60,230,255,.6), transparent 70%), radial-gradient(12% 16% at 70% 36%, rgba(255,80,220,.55), transparent 70%), radial-gradient(7% 10% at 88% 26%, rgba(80,240,255,.6), transparent 70%), radial-gradient(9% 12% at 54% 46%, rgba(255,170,60,.45), transparent 70%), linear-gradient(180deg, #07051a 0%, #1c0a36 40%, #4a1458 58%, #1a0e24 72%, #0c0a14 100%)',
    town: svg(skyline('#120a22', '#ff5ad8', 24, 50, 120) + skyline('#1d0f33', '#5ae8ff', 18, 90, 140, 3)) + ' 0 0 / 100% 70% no-repeat',
    townBlur: 3, townOpacity: 0.9, vignette: VIGNETTE,
    glow: 0xd8f4ff, rim: 0xff4fd8, ground: ground(30, 20, 44),
  },
  tunnel: {
    sky: 'radial-gradient(18% 24% at 55% 42%, rgba(200,230,255,.9), rgba(60,120,255,.4) 40%, transparent 75%), linear-gradient(180deg, #050a1c 0%, #0c1c48 45%, #10204a 60%, #070b18 100%)',
    town: svg([...Array(18)].map((_, i) => { const a = i / 18 * Math.PI * 2, x = 220 + Math.cos(a) * 420, y = 84 + Math.sin(a) * 260; return `<line x1='220' y1='84' x2='${x.toFixed(0)}' y2='${y.toFixed(0)}' stroke='${i % 3 ? '#7ab8ff' : '#ffffff'}' stroke-width='${i % 3 ? 1.2 : 2.4}' stroke-opacity='.7'/>`; }).join('')
      + [60, 120, 190].map(r => `<ellipse cx='220' cy='84' rx='${r * 1.6}' ry='${r}' fill='none' stroke='#3c8cff' stroke-width='${r / 30}' stroke-opacity='.75'/>`).join('')) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 2.5, townOpacity: 0.85, vignette: VIGNETTE,
    glow: 0xcfe6ff, rim: 0x4aa8ff, ground: ground(14, 22, 46),
  },
  coast: {
    sky: 'radial-gradient(14% 22% at 62% 42%, #fff2b0, #ffb050 45%, transparent 72%), linear-gradient(180deg, #3a2a6a 0%, #b4507a 24%, #ff8a5a 40%, #ffb874 47%, #6a5a8a 49%, #2c3460 64%, #1a1c30 100%)',
    town: svg(`<rect y='96' width='400' height='3' fill='#ffd9a0' opacity='.5'/>` + [[40, 70], [70, 54], [330, 62], [362, 80]].map(([x, top]) => `<path d='M${x} 200 Q${x + 4} ${(top + 200) / 2} ${x + 2} ${top}' stroke='#1a1022' stroke-width='4' fill='none'/>` + [-40, -15, 10, 35, 160, 200].map(a => `<path d='M${x + 2} ${top} q${Math.cos(a / 57) * 18} ${-6 + Math.sin(a / 57) * 6} ${Math.cos(a / 57) * 30} ${8 + Math.abs(Math.sin(a / 57)) * 8}' stroke='#1a1022' stroke-width='5' fill='none' stroke-linecap='round'/>`).join('')).join('')) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 1.5, townOpacity: 0.95, vignette: VIGNETTE,
    glow: 0xffe2b0, rim: 0xff9a50, ground: ground(52, 40, 62),
  },
  desert: {
    sky: 'radial-gradient(30% 22% at 30% 46%, rgba(255,200,120,.75), transparent 72%), linear-gradient(180deg, #3e3050 0%, #a05a52 26%, #e88a4a 38%, #f4b06a 46%, #8a5a40 54%, #3e2c28 100%)',
    town: svg(`<g transform='translate(0 -18)'><path d='M0 120 Q60 80 130 112 T260 104 T400 96 V200 H0Z' fill='#b06a40' opacity='.8'/><path d='M0 136 Q90 110 180 132 T400 124 V200 H0Z' fill='#7a4630'/><path d='M300 104 l6 -30 l4 30 M320 104 l3 -18 l3 18' stroke='#3a2620' stroke-width='3'/></g>`) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 3, townOpacity: 0.9, vignette: VIGNETTE,
    glow: 0xffe0b8, rim: 0xffa060, ground: ground(70, 50, 44),
  },
  snow: { // (soft flakes in the sky behind, bigger blurred ones in the far layer, a cold haze; nothing over the cars)
    sky: `${svg(flakes(90, 0.5, 1.1, 0.55, 104, 3))} 0 0 / 100% 100% no-repeat, radial-gradient(70% 22% at 50% 48%, rgba(240,246,252,.75), transparent 75%), linear-gradient(180deg, #93a8be 0%, #c4d2e0 32%, #e6eef6 46%, #c8d4e0 54%, #8e9cae 72%, #5e6a7c 100%)`,
    town: svg(`<path d='M0 100 L60 62 L110 92 L170 46 L240 96 L300 58 L400 100 V200 H0Z' fill='#93a4b8'/><path d='M150 62 L170 46 L190 64 Z M45 72 L60 62 L75 74Z M285 69 L300 58 L316 71Z' fill='#f4f8fc'/>` + flakes(26, 1.6, 3.2, 0.5, 100, 9)) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 4, townOpacity: 0.8,
    vignette: 'radial-gradient(120% 90% at 60% 55%, transparent 55%, rgba(40, 52, 70, .45) 100%)',
    glow: 0xeaf4ff, rim: 0xdfefff, ground: ground(170, 180, 194, 0.86),
  },

  rain: { // (fine streaks in the sky behind the cars only, street-light bokeh, a wet ground that shows more reflection)
    sky: `${svg(streaks(70, 100, 21))} 0 0 / 100% 100% no-repeat, radial-gradient(5% 8% at 14% 50%, rgba(255,190,90,.65), transparent 70%), radial-gradient(4% 7% at 31% 47%, rgba(255,210,140,.5), transparent 70%), radial-gradient(5% 8% at 70% 46%, rgba(90,200,255,.45), transparent 70%), radial-gradient(4% 6% at 86% 51%, rgba(255,80,80,.45), transparent 70%), radial-gradient(4% 6% at 52% 49%, rgba(255,230,170,.4), transparent 70%), linear-gradient(180deg, #0a1020 0%, #182640 38%, #2a3a52 48%, #141e2c 62%, #0a0e16 100%)`,
    town: svg(skyline('#141c2c', '#ffcf7a', 22, 40, 96, 11)) + ' 0 0 / 100% 50% no-repeat',
    townBlur: 5, townOpacity: 0.8, vignette: VIGNETTE,
    glow: 0xfff0c8, rim: 0x8ab8ff, ground: ground(22, 30, 46, 0.66),
  },

  circuit: {
    sky: 'radial-gradient(9% 16% at 14% 11%, rgba(255,255,240,.95), transparent 70%), radial-gradient(9% 16% at 86% 9%, rgba(255,255,240,.95), transparent 70%), radial-gradient(30% 40% at 50% 10%, rgba(200,220,255,.35), transparent 70%), linear-gradient(180deg, #0a1022 0%, #1a2846 40%, #2a3448 50%, #141820 100%)',
    town: svg(`<g transform='translate(0 -14)'><path d='M0 112 L0 82 L180 96 L180 112Z M220 112 L220 96 L400 80 L400 112Z' fill='#1a2030'/>` + [...Array(30)].map((_, i) => `<rect x='${i * 13 + 4}' y='${i < 14 ? 86 + i : 96 - (i - 16)}' width='9' height='2' fill='#4a5a78'/>`).join('')
      + [56, 344].map(x => `<rect x='${x - 1.5}' y='34' width='3' height='80' fill='#0e1220'/><rect x='${x - 12}' y='28' width='24' height='9' fill='#dfe8ff'/>`).join('') + '</g>') + ' 0 0 / 100% 100% no-repeat',
    townBlur: 2, townOpacity: 0.95, vignette: VIGNETTE,
    glow: 0xf4f8ff, rim: 0xeaf0ff, ground: ground(40, 44, 54),
  },
  synthwave: { // (the horizon at about half height, so the cars stand ON the grid; a small sun and hills behind them)
    sky: 'linear-gradient(180deg, #120428 0%, #3a0a5a 24%, #a0207a 40%, #ff5a8a 46.5%, #10041e 48%, #10041e 100%)',
    town: svg(`<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffe85a'/><stop offset='1' stop-color='#ff3a8a'/></linearGradient></defs><circle cx='200' cy='76' r='24' fill='url(#s)'/>`
      + [80, 85, 89, 93].map((y, i) => `<rect x='170' y='${y}' width='60' height='${0.8 + i * 0.6}' fill='#a0207a'/>`).join('')
      + `<path d='M0 96 L40 84 L70 90 L110 78 L150 92 L250 92 L290 80 L330 89 L370 82 L400 90 V96Z' fill='#2a0848' stroke='#ff3ec8' stroke-width='.6'/>`
      + `<rect y='96' width='400' height='104' fill='#10041e'/>` + [...Array(25)].map((_, i) => `<line x1='200' y1='96' x2='${(i - 12) * 70 + 200}' y2='200' stroke='#ff3ec8' stroke-width='1'/>`).join('')
      + [98, 101, 106, 113, 124, 140, 164, 198].map(y => `<line x1='0' y1='${y}' x2='400' y2='${y}' stroke='#ff3ec8' stroke-width='1'/>`).join('')) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 0.6, townOpacity: 1, vignette: VIGNETTE,
    glow: 0xffd8f4, rim: 0xff3ec8, ground: ground(40, 8, 52, 0.3),
  },

  showroom: {
    sky: 'conic-gradient(from 168deg at 30% -10%, transparent 0deg, rgba(255,220,140,.32) 8deg, transparent 18deg), conic-gradient(from 176deg at 70% -10%, transparent 0deg, rgba(255,220,140,.3) 8deg, transparent 18deg), radial-gradient(40% 30% at 50% 58%, rgba(255,200,110,.35), transparent 72%), linear-gradient(180deg, #120c06 0%, #2a1c0c 45%, #3a2812 58%, #140e08 100%)',
    town: 'repeating-linear-gradient(90deg, transparent 0 46px, rgba(255,200,110,.18) 46px 48px) 0 18% / 100% 38% no-repeat, linear-gradient(rgba(255,210,120,.5), rgba(255,210,120,.5)) 0 56% / 100% 2px no-repeat',
    townBlur: 2, townOpacity: 0.9,
    vignette: 'radial-gradient(110% 85% at 50% 55%, transparent 50%, rgba(8, 5, 2, .75) 100%)',
    glow: 0xffe6b0, rim: 0xffd27a, ground: ground(46, 34, 20),
  },
};
export const BACKDROP_NAMES = Object.keys(BACKDROPS);
export const DEFAULT_BACKDROP = 'town';
