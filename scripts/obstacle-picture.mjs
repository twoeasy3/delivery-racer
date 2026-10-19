// OBSTACLE PICTURES: a top-down picture of an obstacle pattern on a 4-lane road (dark road, dashed lane lines, orange standard barrier
// boxes, you driving up from the bottom), drawn as SVG and turned into a PNG by headless Chromium (no Playwright install: the browser
// is run once per picture with --screenshot). For the owner's phone: look, do not read.
//   node scripts/obstacle-picture.mjs <out-dir> [name ...]          names: thread threadrun threadgate threadcrate gate zipper rollgate sweeper (default: the thread ones + movers)
//   --browser=<path>   (default /opt/pw-browsers/chromium-1194/chrome-linux/chrome)
// Barriers are drawn to scale (2.4 x 1.2 m), the car 1.7 x 3.8 m, lanes 3.5 m. Green = the way through (a slot the widest car, 2.1 m, fits:
// the slot's width is written on it); arrows = motion (movers). A mover is drawn at several moments, the earliest faintest.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { layRows, boxesOf, openings, centreOf, MOVERS, driftDraws, sweepLat, sizeOf } from './obstacle-patterns.mjs';
import { CONFIG } from '../src/delivery/config.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const out = resolve(args.find(a => !a.startsWith('--')) || '.');
const names = args.filter(a => !a.startsWith('--')).slice(1);
const browser = opt('browser', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');
const LW = CONFIG.laneWidth, N = 4, PX = 11, ROADW = N * LW, SH = 2; // px per m; shoulders drawn 2 m
const W = Math.round((ROADW + 2 * SH) * PX) + 120, M = 20;

// scenes: { title, from, to (s range shown), rows, notes[], movers: fn(svgParts) }
const SCENES = {
  thread: { title: 'thread: one barrier on the middle line', rows: () => layRows('thread', { lanes: N, s: 100 }), notes: ['barrier on the line: nudge off it,', 'or take lane 0 / 3 (untouched)'] },
  threadrun: { title: 'threadrun: stepping along the lines', rows: () => layRows('threadrun', { lanes: N, s: 100, lines: '0.5,1.5,2.5,1.5,0.5' }), notes: ['a nudge each row, never a lane change'] },
  threadgate: { title: 'threadgate: a split gap', rows: () => layRows('threadgate', { lanes: N, s: 100, gap: 1 }), notes: ['gap of two lanes, a barrier on the line:', 'two slots of 2.85 m, take one'] },
  threadcrate: { title: 'threadrun with crates (1.2 m)', rows: () => layRows('threadrun', { lanes: N, s: 100, lines: '0.5,1.5,2.5', linekind: 'crate' }), notes: ['the lane centres beside a crate line', 'are clear: a true thread'] },
  gate: { title: 'gate (for scale)', rows: () => layRows('gate', { lanes: N, s: 100, gap: 2 }), notes: [] },
  zipper: { title: 'zipper (for scale)', rows: () => layRows('zipper', { lanes: N, s: 100 }), notes: [] },
  rollgate: { title: 'rollgate: tractors, a moving wall', rows: () => [], mover: 'rollgate', notes: ['3 tractors abreast at 7 m/s, gap lane 1', 'you close at 33 m/s'] },
  sweeper: { title: 'sweeper: a barrier crossing on a timer', rows: () => [], mover: 'sweeper', notes: ['one barrier sweeping edge to edge,', 'a crossing every ~3.4 s'] },
};

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const panel = (key, sc, x0) => {
  const rows = sc.rows(), ss = rows.map(r => r.s);
  const s0 = sc.mover ? 40 : Math.min(...ss) - 15, s1 = sc.mover ? 190 : Math.max(...ss) + 22, H = Math.round((s1 - s0) * PX) + 150;
  const X = (lat) => x0 + 60 + (lat + ROADW / 2 + SH) * PX, Y = (s) => M + 40 + (s1 - s) * PX;
  const road = X(-ROADW / 2 - SH), roadW = (ROADW + 2 * SH) * PX, top = M + 40, bot = Y(s0);
  const p = [];
  p.push(`<text x="${x0 + 8}" y="${M + 14}" class="t">${esc(sc.title)}</text>`);
  p.push(`<rect x="${road}" y="${top}" width="${roadW}" height="${bot - top}" fill="#2a2a2e"/>`);
  p.push(`<rect x="${X(-ROADW / 2)}" y="${top}" width="${ROADW * PX}" height="${bot - top}" fill="#34343a"/>`);
  for (const e of [-ROADW / 2, ROADW / 2]) p.push(`<line x1="${X(e)}" y1="${top}" x2="${X(e)}" y2="${bot}" stroke="#e8e8e8" stroke-width="2"/>`);
  for (let k = 1; k < N; k++) p.push(`<line x1="${X(centreOf(k, N) - LW / 2)}" y1="${top}" x2="${X(centreOf(k, N) - LW / 2)}" y2="${bot}" stroke="#d8d8d8" stroke-width="1.6" stroke-dasharray="${2.5 * PX} ${3 * PX}"/>`);
  const box = (lat, s, hw, hl, fill, stroke, extra = '') => `<rect x="${X(lat - hw)}" y="${Y(s + hl)}" width="${2 * hw * PX}" height="${2 * hl * PX}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" ${extra}/>`;
  // rows: slots first (under the boxes), then boxes
  for (const r of rows) {
    const hlr = r.lineKind ? sizeOf(r.lineKind).hl : sizeOf().hl;
    for (const [a, b] of openings(r, N, 1.05 + 0.3).map(([a, b]) => [a - 1.35, b + 1.35])) if (b - a >= 2.7) {
      p.push(`<rect x="${X(a)}" y="${Y(r.s + 2.2)}" width="${(b - a) * PX}" height="${4.4 * PX}" fill="#3ecf6a" opacity="0.28"/>`);
      p.push(`<text x="${X((a + b) / 2)}" y="${Y(r.s) + 3}" class="s" text-anchor="middle" fill="#bff5cc">${(b - a).toFixed(1)}</text>`);
    }
    for (const [a, b] of boxesOf(r, N)) p.push(box((a + b) / 2, r.s, (b - a) / 2, hlr, '#f28a1d', '#8a4a08'));
    for (const [a, b] of boxesOf(r, N)) p.push(`<line x1="${X(a)}" y1="${Y(r.s)}" x2="${X(b)}" y2="${Y(r.s)}" stroke="#fff" stroke-width="1" opacity="0.8"/>`);
  }
  if (sc.mover === 'rollgate') {
    const m = MOVERS.rollgate.lay({ s: 120, lanes: N, speed: 40, gap: 1, first: 0 }), s = 120; // drawn where they meet the car
    p.push(`<rect x="${X(centreOf(1, N) - LW / 2)}" y="${Y(s + 14)}" width="${LW * PX}" height="${28 * PX}" fill="#3ecf6a" opacity="0.25"/>`);
    for (const t of m.tractors) {
      const c = centreOf(t.lane, N);
      p.push(box(c, s, 1.2, 2.0, '#4f9d3a', '#1d4a12'));
      p.push(box(c, s - 1.5, 0.9, 0.6, '#2f6b22', '#1d4a12'));
      p.push(`<line x1="${X(c)}" y1="${Y(s + 3)}" x2="${X(c)}" y2="${Y(s + 12)}" stroke="#ffe27a" stroke-width="2.5" marker-end="url(#ar)"/>`);
    }
    p.push(`<text x="${X(0)}" y="${Y(s + 17)}" class="s" text-anchor="middle" fill="#ffe27a">7 m/s</text>`);
  }
  if (sc.mover === 'sweeper') {
    const d = driftDraws([{ from: 0, to: 200, count: 1, pattern: 'sweep', kind: 'barrier' }])[0], half = ROADW / 2 + 3.5, s = 115;
    const lo = -half, hi = half;
    p.push(`<line x1="${X(-ROADW / 2 - SH + 0.3)}" y1="${Y(s)}" x2="${X(ROADW / 2 + SH - 0.3)}" y2="${Y(s)}" stroke="#ffe27a" stroke-width="1.5" stroke-dasharray="4 4"/>`);
    const ts = [0, 0.56, 1.12, 1.68, 2.24, 2.8, 3.36], hw = 1.2, hl = 0.6; // (one crossing, from where its sine is at its lowest: pace 0.85 gives 3.4 s a crossing)
    ts.forEach((t, i) => { const lat = Math.max(-ROADW / 2 - SH + hw, Math.min(ROADW / 2 + SH - hw, sweepLat(d, t + 1.37, lo, hi))); p.push(box(lat, s, hw, hl, '#f28a1d', '#8a4a08', `opacity="${(0.25 + 0.75 * (i + 1) / ts.length).toFixed(2)}"`)); });
    p.push(`<line x1="${X(-ROADW / 2 - SH + 1)}" y1="${Y(s - 3)}" x2="${X(ROADW / 2 + SH - 1)}" y2="${Y(s - 3)}" stroke="#ffe27a" stroke-width="2.5" marker-start="url(#ar)" marker-end="url(#ar)"/>`);
  }
  // your car, driving up
  const cs = s0 + 3;
  p.push(box(centreOf(1, N), cs, 0.85, 1.9, '#3b7ddd', '#143a7a'));
  p.push(`<line x1="${X(centreOf(1, N))}" y1="${Y(cs + 4)}" x2="${X(centreOf(1, N))}" y2="${Y(cs + 10)}" stroke="#9cc4ff" stroke-width="2.5" marker-end="url(#ar)"/>`);
  p.push(`<text x="${X(centreOf(1, N))}" y="${Y(cs - 2.4)}" class="s" text-anchor="middle" fill="#9cc4ff">you</text>`);
  // scale bar and notes
  p.push(`<line x1="${x0 + 14}" y1="${bot}" x2="${x0 + 14}" y2="${bot - 10 * PX}" stroke="#aaa" stroke-width="2"/><text x="${x0 + 18}" y="${bot - 4 * PX}" class="s" fill="#aaa">10 m</text>`);
  sc.notes.forEach((n, i) => p.push(`<text x="${x0 + 8}" y="${bot + 22 + i * 15}" class="n">${esc(n)}</text>`));
  return { svg: p.join('\n'), H };
};

mkdirSync(out, { recursive: true });
const keys = (names.length ? names : ['thread', 'threadrun', 'threadgate', 'threadcrate', 'rollgate', 'sweeper']).filter(k => SCENES[k]);
const defs = `<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffe27a"/></marker></defs><style>.t{font:bold 13px monospace;fill:#eee}.s{font:11px monospace}.n{font:12px monospace;fill:#ccc}</style>`;
const panels = keys.map((k, i) => panel(k, SCENES[k], i * W));
const Hmax = Math.max(...panels.map(p => p.H));
const sheet = (parts, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}<rect width="100%" height="100%" fill="#16161a"/>${parts}</svg>`;
const shoot = (svgFile, png, w, h) => {
  const html = svgFile.replace(/\.svg$/, '.html');
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#16161a">${require_svg(svgFile)}</body>`);
  const r = spawnSync(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, `--screenshot=${png}`, 'file://' + html], { stdio: 'ignore', timeout: 60000 });
  return r.status === 0 && existsSync(png);
};
import { readFileSync } from 'node:fs';
function require_svg(f) { return readFileSync(f, 'utf8'); }
if (!existsSync(browser)) { console.log('no browser at ' + browser + ' (--browser=)'); process.exit(1); }
const files = [];
panels.forEach((p, i) => {
  const w = W, h = p.H + 20, f = join(out, keys[i] + '.svg');
  // each alone, drawn at x offset 0
  const alone = panel(keys[i], SCENES[keys[i]], 0);
  writeFileSync(f, sheet(alone.svg, w, h));
  files.push([f, join(out, keys[i] + '.png'), w, h]);
});
const sheetFile = join(out, 'sheet.svg');
writeFileSync(sheetFile, sheet(panels.map(p => p.svg).join('\n'), W * keys.length, Hmax + 20));
files.push([sheetFile, join(out, 'sheet.png'), W * keys.length, Hmax + 20]);
for (const [svg, png, w, h] of files) console.log((shoot(svg, png, w, h) ? 'wrote ' : 'FAILED ') + png);
