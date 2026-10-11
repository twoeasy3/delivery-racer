// ============================================================================
// REPLAY STORE - the replays kept in this browser (local storage, under its own key: never the save, its cookie or
// its code). For each level and side: the last run (whatever became of it) and the best (delivered with the most
// time to spare: the ghost's, REPLAY-NOTES.md Phase C); and the runs the player chose to keep ("Save replay"), up to
// MOST_SAVED, each deletable. A recording is a few hundred bytes a minute (replay.js). A visit that saves nothing
// (Progress.noSave: a test address, a replay playing) keeps nothing here either.
// ============================================================================
import { Progress } from './progress.js';

const KEY = 'delivery_replays';
const MOST_SAVED = 40;
const SHORTEST = 600; // logic steps (5 s): a run left sooner than this is not kept as the last

let data = null;
const read = () => {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch { data = null; }
  if (!data || data.v !== 1 || typeof data.last !== 'object' || typeof data.best !== 'object' || !Array.isArray(data.saved)) {
    data = { v: 1, last: {}, best: {}, saved: [] };
  }
  return data;
};
const write = () => {
  if (Progress.noSave) return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* (full, or no storage: kept for this visit only) */ }
};
const slot = (header) => header.level + (header.evil ? ':evil' : ':good');
const same = (a, b) => !!a && !!b && a.header.date === b.header.date && a.header.seed === b.header.seed;

export const ReplayStore = {
  // a run over (replay.js end): the last of its level and side, and the best if it beats the one kept (or that one
  // can no longer be played: made under other rules)
  kept(rec) {
    const h = rec.header;
    if (h.outcome === 'left' && h.steps < SHORTEST) return;
    const d = read(), k = slot(h), best = d.best[k];
    d.last[k] = rec;
    if (h.outcome === 'delivered' && (!best || best.header.logic !== h.logic || !(best.header.spare >= h.spare))) d.best[k] = rec;
    write();
  },
  // "Save replay": kept until deleted (the oldest saved goes when there are MOST_SAVED)
  save(rec) {
    const d = read();
    if (d.saved.some(r => same(r, rec))) return;
    d.saved.push(rec);
    while (d.saved.length > MOST_SAVED) d.saved.shift();
    write();
  },
  isSaved(rec) { return read().saved.some(r => same(r, rec)); },
  remove(rec) {
    const d = read();
    d.saved = d.saved.filter(r => !same(r, rec));
    write();
  },
  // a level's replays, both sides: { kind: 'last' | 'best' | 'saved', rec }, the best first, then the last, then the
  // saved newest first (a run that is both the last and the best is listed once, as the best)
  list(levelId) {
    const d = read(), out = [];
    for (const side of [':good', ':evil']) {
      const best = d.best[levelId + side], last = d.last[levelId + side];
      if (best) out.push({ kind: 'best', rec: best });
      if (last && !same(last, best)) out.push({ kind: 'last', rec: last });
    }
    for (const rec of [...d.saved].reverse()) if (rec.header.level === levelId) out.push({ kind: 'saved', rec });
    return out;
  },
  best(levelId, evil) { return read().best[levelId + (evil ? ':evil' : ':good')] || null; },
  forget() { data = null; }, // (read again from storage next time: the checks)
};
