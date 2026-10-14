// ---- the NUMBER PLATE text BLOCKLIST: data only (render/platetext.js reads it). BEST EFFORT, not a guarantee: it is a short local
// list of common profanities, slurs and hate or violence strings (no network, no service), checked after leetspeak and spacing tricks
// are undone. A determined player can still get something past it, and it will refuse a few harmless words; the text is local to this
// browser and nobody else sees it. Add a word by adding it here (lower case, letters only; a digit trick like 5H1T is handled by the
// reader, not listed).
// SUBSTRING: matched anywhere in the plate once spaces and dashes are taken out ("F U C K", "SH1T-HEAD"), so only words that do not
//   sit inside ordinary words. WHOLE: short or common-inside-other-words terms ("ass" is in "class"): matched only as a whole word
//   (the text between spaces and dashes) or as the whole plate.
// DIGITS: number strings used as hate codes, matched in the plate with the spaces and dashes taken out.
export const SUBSTRING = [
  // profanity and sexual abuse
  'fuck', 'fck', 'shit', 'shyt', 'cunt', 'bitch', 'biatch', 'bastard', 'bollock', 'wanker', 'twat', 'dickhead', 'asshole', 'arsehole', 'motherf',
  'cocksuck', 'cumshot', 'slut', 'whore', 'pussy', 'blowjob', 'handjob', 'dildo', 'penis', 'vagina', 'tits', 'porn', 'orgasm', 'jizz', 'rapist',
  'rapeyou', 'molest', 'pedophile', 'paedophile', 'incest', 'bukkake',
  // slurs
  'nigger', 'nigga', 'faggot', 'fagot', 'tranny', 'retard', 'spastic', 'spazz', 'chink', 'gook', 'kike', 'wetback', 'beaner', 'towelhead', 'raghead',
  'sandnig', 'shemale', 'jewboy', 'zipperhead',
  // hate and violence
  'nazi', 'hitler', 'siegheil', 'whitepower', 'whitepride', 'kkk', 'jihad', 'genocide', 'holocaust', 'killall', 'killyou', 'dieyou', 'murder',
  'killself', 'hangself', 'bombyou', 'shootup', 'schoolshoot',
];
export const WHOLE = [
  'ass', 'anal', 'anus', 'arse', 'cock', 'cum', 'dick', 'fag', 'fags', 'fuk', 'kys', 'milf', 'nig', 'nigs', 'paki', 'piss', 'rape', 'sex', 'sexy', 'slag', 'tit',
  'wog', 'wop', 'jap', 'coon', 'dyke', 'homo', 'negro', 'mongol', 'wank', 'prick', 'boner', 'horny', 'isis', 'lynch', 'spic', 'pedo', 'paedo', 'turd',
];
export const DIGITS = ['1488'];
