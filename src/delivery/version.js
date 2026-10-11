// ============================================================================
// VERSION - which build of the game this is (worked out by vite.config.js when it is built or served): the
// version in package.json (bumped by hand for a release), the commit, the date, and `logic`, a fingerprint of the
// game's rules that a replay records (REPLAY-NOTES.md). Outside Vite (a bare node script): 'dev'.
// ============================================================================
/* global __BUILD__ */
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : { version: 'dev', commit: '', date: '', logic: 'dev' };
// as the front screen shows it: "v1.0.0 · 6efa05e"
export const buildLabel = () => 'v' + BUILD.version + (BUILD.commit ? ' · ' + BUILD.commit : '');
